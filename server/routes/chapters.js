// Chapters (Kapitel) and their files.
//   GET    /api/chapters?recent=n     recently changed chapters (for the start page)
//   GET    /api/chapters/:id          chapter with blocks, its subject, semester and neighbours
//   POST   /api/chapters              admin: { subjectId, title } → new draft
//   PATCH  /api/chapters/:id          admin: { title, summary, status, blocks, subjectId, baseRev }
//   DELETE /api/chapters/:id          admin: into the trash (→ { trashId } for Undo)
//   POST   /api/chapters/:id/files    admin: upload one file (multipart field "file")
import fsp from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { createRouter, HttpError } from '../http.js';
import { mutateDB, readDB } from '../db.js';
import { isAdmin, requireAdmin } from '../auth.js';
import { DATA_DIR } from '../config.js';
import { moveFile, sanitize, assertInside } from '../files.js';
import { upload } from '../upload.js';
import { normalizeChapter } from '../schema.js';
import { chapterMeta, visibleChapters } from './catalog.js';

const FIELDS = ['title', 'summary', 'status', 'blocks', 'subjectId'];
const byOrder = (a, b) => a.order - b.order || a.createdAt - b.createdAt;

export const chapterDir = (chapterId) => assertInside(path.join(DATA_DIR, 'chapters', chapterId));

export default function chaptersRouter() {
  const r = createRouter();

  r.get('/api/chapters', async (req, res) => {
    const db = await readDB();
    const n = Math.min(50, Math.max(1, Number(req.query.recent) || 8));
    const subjects = new Map(db.subjects.map((s) => [s.id, s]));
    const chapters = visibleChapters(db, req)
      .filter((c) => subjects.has(c.subjectId))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, n)
      .map((c) => ({ ...chapterMeta(c), subject: pickSubject(subjects.get(c.subjectId)) }));
    res.json({ chapters });
  });

  r.get('/api/chapters/:id', async (req, res) => {
    const db = await readDB();
    const visible = visibleChapters(db, req);
    const chapter = visible.find((c) => c.id === req.params.id);
    if (!chapter) throw new HttpError(404, 'not_found', 'Kapitel nicht gefunden.');
    const subject = db.subjects.find((s) => s.id === chapter.subjectId) || null;
    const semester = subject ? db.semesters.find((s) => s.id === subject.semesterId) || null : null;
    const siblings = visible.filter((c) => c.subjectId === chapter.subjectId).sort(byOrder);
    const i = siblings.findIndex((c) => c.id === chapter.id);
    const nav = (c) => (c ? { id: c.id, title: c.title } : null);
    res.json({ chapter, subject, semester, prev: nav(siblings[i - 1]), next: nav(siblings[i + 1]), position: i + 1, total: siblings.length });
  });

  r.post('/api/chapters', requireAdmin, async (req, res) => {
    const chapter = await mutateDB((db) => {
      const subjectId = req.body?.subjectId;
      if (!db.subjects.some((s) => s.id === subjectId)) throw new HttpError(400, 'bad_subject', 'Fach nicht gefunden.');
      const now = Date.now();
      const order = Math.max(-1, ...db.chapters.filter((c) => c.subjectId === subjectId).map((c) => c.order)) + 1;
      const c = normalizeChapter({
        title: req.body?.title, summary: req.body?.summary, subjectId, status: 'draft', order,
        blocks: [{ type: 'text', text: '' }], rev: 1, createdAt: now, updatedAt: now,
      });
      db.chapters.push(c);
      return c;
    });
    res.status(201).json({ chapter });
  });

  r.patch('/api/chapters/:id', requireAdmin, async (req, res) => {
    const chapter = await mutateDB((db) => {
      const c = db.chapters.find((x) => x.id === req.params.id);
      if (!c) throw new HttpError(404, 'not_found', 'Kapitel nicht gefunden.');
      // Optimistic locking: an edit based on an older revision (another tab or
      // device saved in between) is refused instead of silently overwriting.
      const base = req.body?.baseRev;
      if (base !== undefined && base !== null && Number(base) !== c.rev) {
        throw new HttpError(409, 'conflict', 'Dieses Kapitel wurde inzwischen an anderer Stelle geändert.');
      }
      const patch = Object.fromEntries(FIELDS.filter((k) => req.body?.[k] !== undefined).map((k) => [k, req.body[k]]));
      if (patch.subjectId !== undefined && patch.subjectId !== c.subjectId) {
        if (!db.subjects.some((s) => s.id === patch.subjectId)) throw new HttpError(400, 'bad_subject', 'Fach nicht gefunden.');
        // Moved to another subject: it goes to the end of that subject's list.
        patch.order = Math.max(-1, ...db.chapters.filter((x) => x.subjectId === patch.subjectId).map((x) => x.order)) + 1;
      }
      Object.assign(c, normalizeChapter({ ...c, ...patch, id: c.id, rev: c.rev + 1, updatedAt: Date.now() }));
      return c;
    });
    res.json({ chapter });
  });

  r.delete('/api/chapters/:id', requireAdmin, async (req, res) => {
    const trashId = await mutateDB((db) => {
      const i = db.chapters.findIndex((x) => x.id === req.params.id);
      if (i === -1) throw new HttpError(404, 'not_found', 'Kapitel nicht gefunden.');
      const [item] = db.chapters.splice(i, 1);
      const subject = db.subjects.find((s) => s.id === item.subjectId);
      const entry = { id: nanoid(10), kind: 'chapter', item, subjectTitle: subject?.title || '', deletedAt: Date.now() };
      db.trash.push(entry);
      return entry.id;
    });
    res.json({ trashId });
  });

  r.post('/api/chapters/:id/files', requireAdmin, upload.single('file'), async (req, res) => {
    const tmp = req.file?.path;
    try {
      if (!req.file) throw new HttpError(400, 'no_file', 'Keine Datei empfangen.');
      const db = await readDB();
      if (!db.chapters.some((c) => c.id === req.params.id)) throw new HttpError(404, 'not_found', 'Kapitel nicht gefunden.');
      // Browsers send the name as latin1; multer hands it over undecoded.
      const original = Buffer.from(req.file.originalname || '', 'latin1').toString('utf8');
      const name = `${nanoid(8)}-${sanitize(original)}`;
      const dest = path.join(chapterDir(req.params.id), name);
      await moveFile(tmp, dest);
      res.status(201).json({
        file: {
          src: `chapters/${req.params.id}/${name}`,
          name: original.slice(0, 200) || name,
          size: req.file.size,
          type: String(req.file.mimetype || '').slice(0, 100),
        },
      });
    } finally {
      if (tmp) await fsp.rm(tmp, { force: true }).catch(() => {});
    }
  });

  return r;
}

const pickSubject = (s) => (s ? { id: s.id, title: s.title, short: s.short, icon: s.icon, color: s.color } : null);

/** Admins see every chapter's files, viewers only those of published chapters. */
export async function canSeeChapterFiles(req, chapterId) {
  const db = await readDB();
  const c = db.chapters.find((x) => x.id === chapterId);
  return Boolean(c && (isAdmin(req) || c.status === 'published'));
}
