// Semesters and subjects — the catalogue the navigation is built from.
//   GET    /api/semesters                 all semesters with their subjects (+ counts)
//   POST   /api/semesters                 admin: new semester
//   PATCH  /api/semesters/:id             admin: edit
//   DELETE /api/semesters/:id             admin: only when it has no subjects
//   POST   /api/semesters/:id/order       admin: { ids } — order of its subjects
//   GET    /api/subjects/:id              subject, its semester and chapter list
//   GET    /api/subjects/:id/cards        all flashcards of the subject
//   POST   /api/subjects                  admin: new subject
//   PATCH  /api/subjects/:id              admin: edit
//   DELETE /api/subjects/:id              admin: only when it has no chapters
//   POST   /api/subjects/:id/order        admin: { ids } — order of its chapters
import { createRouter, HttpError } from '../http.js';
import { mutateDB, readDB } from '../db.js';
import { isAdmin, requireAdmin } from '../auth.js';
import { normalizeSemester, normalizeSubject, chapterStats } from '../schema.js';

/** What the signed-in user may see: viewers only get published chapters. */
export const visibleChapters = (db, req) => (isAdmin(req) ? db.chapters : db.chapters.filter((c) => c.status === 'published'));

const byOrder = (a, b) => a.order - b.order || a.createdAt - b.createdAt;

export function chapterMeta(c) {
  return {
    id: c.id, subjectId: c.subjectId, title: c.title, summary: c.summary, status: c.status, lang: c.lang,
    order: c.order, updatedAt: c.updatedAt, ...chapterStats(c),
  };
}

function subjectWithCounts(s, chapters) {
  const own = chapters.filter((c) => c.subjectId === s.id);
  return {
    ...s,
    chapterCount: own.length,
    cardCount: own.reduce((n, c) => n + chapterStats(c).cards, 0),
    chapterIds: own.sort(byOrder).map((c) => c.id), // for progress on the tiles
  };
}

const pick = (body, keys) => Object.fromEntries(keys.filter((k) => body?.[k] !== undefined).map((k) => [k, body[k]]));
const SEMESTER_FIELDS = ['number', 'title', 'description'];
const SUBJECT_FIELDS = ['title', 'short', 'description', 'icon', 'color', 'ects', 'semesterId'];

/** Set `order` from a list of ids; ids that aren't in `items` are ignored. */
function applyOrder(items, ids) {
  if (!Array.isArray(ids)) throw new HttpError(400, 'bad_request', 'ids fehlt.');
  const pos = new Map(ids.map((x, i) => [x, i]));
  const rest = items.filter((it) => !pos.has(it.id)).sort(byOrder);
  for (const it of items) it.order = pos.has(it.id) ? pos.get(it.id) : ids.length + rest.indexOf(it);
}

export default function catalogRouter() {
  const r = createRouter();

  r.get('/api/semesters', async (req, res) => {
    const db = await readDB();
    const chapters = visibleChapters(db, req);
    const semesters = db.semesters.sort((a, b) => a.number - b.number || a.createdAt - b.createdAt).map((s) => ({
      ...s,
      subjects: db.subjects.filter((x) => x.semesterId === s.id).sort(byOrder).map((x) => subjectWithCounts(x, chapters)),
    }));
    res.json({ semesters });
  });

  r.post('/api/semesters', requireAdmin, async (req, res) => {
    const semester = await mutateDB((db) => {
      const now = Date.now();
      const number = req.body?.number ?? Math.max(0, ...db.semesters.map((s) => s.number)) + 1;
      const s = normalizeSemester({ ...pick(req.body, SEMESTER_FIELDS), number, id: undefined, createdAt: now, updatedAt: now });
      db.semesters.push(s);
      return s;
    });
    res.status(201).json({ semester });
  });

  r.patch('/api/semesters/:id', requireAdmin, async (req, res) => {
    const semester = await mutateDB((db) => {
      const s = db.semesters.find((x) => x.id === req.params.id);
      if (!s) throw new HttpError(404, 'not_found', 'Semester nicht gefunden.');
      Object.assign(s, normalizeSemester({ ...s, ...pick(req.body, SEMESTER_FIELDS), updatedAt: Date.now() }));
      return s;
    });
    res.json({ semester });
  });

  r.delete('/api/semesters/:id', requireAdmin, async (req, res) => {
    await mutateDB((db) => {
      const i = db.semesters.findIndex((x) => x.id === req.params.id);
      if (i === -1) throw new HttpError(404, 'not_found', 'Semester nicht gefunden.');
      if (db.subjects.some((x) => x.semesterId === req.params.id)) {
        throw new HttpError(409, 'not_empty', 'Das Semester enthält noch Fächer. Verschiebe oder lösche sie zuerst.');
      }
      db.semesters.splice(i, 1);
    });
    res.json({ ok: true });
  });

  r.post('/api/semesters/:id/order', requireAdmin, async (req, res) => {
    await mutateDB((db) => {
      if (!db.semesters.some((x) => x.id === req.params.id)) throw new HttpError(404, 'not_found', 'Semester nicht gefunden.');
      applyOrder(db.subjects.filter((x) => x.semesterId === req.params.id), req.body?.ids);
    });
    res.json({ ok: true });
  });

  r.get('/api/subjects/:id', async (req, res) => {
    const db = await readDB();
    const subject = db.subjects.find((x) => x.id === req.params.id);
    if (!subject) throw new HttpError(404, 'not_found', 'Fach nicht gefunden.');
    const semester = db.semesters.find((x) => x.id === subject.semesterId) || null;
    const chapters = visibleChapters(db, req).filter((c) => c.subjectId === subject.id).sort(byOrder).map(chapterMeta);
    res.json({ subject, semester, chapters });
  });

  r.get('/api/subjects/:id/cards', async (req, res) => {
    const db = await readDB();
    const subject = db.subjects.find((x) => x.id === req.params.id);
    if (!subject) throw new HttpError(404, 'not_found', 'Fach nicht gefunden.');
    const cards = [];
    for (const c of visibleChapters(db, req).filter((x) => x.subjectId === subject.id).sort(byOrder)) {
      for (const b of c.blocks) {
        if (b.type === 'flashcard' && (b.front.trim() || b.back.trim())) {
          cards.push({ id: `${c.id}:${b.id}`, chapterId: c.id, chapterTitle: c.title, front: b.front, back: b.back });
        }
      }
    }
    res.json({ subject, cards });
  });

  r.post('/api/subjects', requireAdmin, async (req, res) => {
    const subject = await mutateDB((db) => {
      const semesterId = req.body?.semesterId;
      if (!db.semesters.some((s) => s.id === semesterId)) throw new HttpError(400, 'bad_semester', 'Semester nicht gefunden.');
      const now = Date.now();
      const order = Math.max(-1, ...db.subjects.filter((x) => x.semesterId === semesterId).map((x) => x.order)) + 1;
      const s = normalizeSubject({ ...pick(req.body, SUBJECT_FIELDS), id: undefined, semesterId, order, createdAt: now, updatedAt: now });
      db.subjects.push(s);
      return s;
    });
    res.status(201).json({ subject });
  });

  r.patch('/api/subjects/:id', requireAdmin, async (req, res) => {
    const subject = await mutateDB((db) => {
      const s = db.subjects.find((x) => x.id === req.params.id);
      if (!s) throw new HttpError(404, 'not_found', 'Fach nicht gefunden.');
      const patch = pick(req.body, SUBJECT_FIELDS);
      if (patch.semesterId !== undefined && !db.semesters.some((x) => x.id === patch.semesterId)) {
        throw new HttpError(400, 'bad_semester', 'Semester nicht gefunden.');
      }
      Object.assign(s, normalizeSubject({ ...s, ...patch, updatedAt: Date.now() }));
      return s;
    });
    res.json({ subject });
  });

  r.delete('/api/subjects/:id', requireAdmin, async (req, res) => {
    await mutateDB((db) => {
      const i = db.subjects.findIndex((x) => x.id === req.params.id);
      if (i === -1) throw new HttpError(404, 'not_found', 'Fach nicht gefunden.');
      if (db.chapters.some((c) => c.subjectId === req.params.id)) {
        throw new HttpError(409, 'not_empty', 'Das Fach enthält noch Kapitel. Lösche sie zuerst.');
      }
      db.subjects.splice(i, 1);
    });
    res.json({ ok: true });
  });

  r.post('/api/subjects/:id/order', requireAdmin, async (req, res) => {
    await mutateDB((db) => {
      if (!db.subjects.some((x) => x.id === req.params.id)) throw new HttpError(404, 'not_found', 'Fach nicht gefunden.');
      applyOrder(db.chapters.filter((c) => c.subjectId === req.params.id), req.body?.ids);
    });
    res.json({ ok: true });
  });

  return r;
}
