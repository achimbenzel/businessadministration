// The trash: deleted chapters wait here (with their files) for 30 days.
//   GET    /api/trash               admin: list
//   POST   /api/trash/:id/restore   admin: put the chapter back
//   DELETE /api/trash/:id           admin: delete for good (incl. files)
import { createRouter, HttpError } from '../http.js';
import { mutateDB, readDB } from '../db.js';
import { requireAdmin } from '../auth.js';
import { TRASH_DAYS } from '../config.js';
import { safeRm } from '../files.js';
import { chapterDir } from './chapters.js';

/** Purge entries older than TRASH_DAYS. Runs at start and when the trash is opened. */
export async function purgeOldTrash(now = Date.now()) {
  const limit = now - TRASH_DAYS * 86400000;
  const db = await readDB();
  if (!db.trash.some((t) => t.deletedAt < limit)) return 0;
  const removed = await mutateDB((d) => {
    const old = d.trash.filter((t) => t.deletedAt < limit);
    d.trash = d.trash.filter((t) => t.deletedAt >= limit);
    return old;
  });
  for (const t of removed) await removeFilesUnlessUsed(t.item.id);
  return removed.length;
}

// A chapter's folder goes only if no live chapter uses that id any more.
async function removeFilesUnlessUsed(chapterId) {
  const db = await readDB();
  if (db.chapters.some((c) => c.id === chapterId) || db.trash.some((t) => t.item.id === chapterId)) return;
  await safeRm(chapterDir(chapterId)).catch(() => {});
}

export default function trashRouter() {
  const r = createRouter();
  r.use('/api/trash', requireAdmin);

  r.get('/api/trash', async (_req, res) => {
    await purgeOldTrash();
    const db = await readDB();
    const items = db.trash.sort((a, b) => b.deletedAt - a.deletedAt).map((t) => ({
      id: t.id, kind: t.kind, title: t.item.title, subjectId: t.item.subjectId, subjectTitle: t.subjectTitle,
      blocks: t.item.blocks.length, deletedAt: t.deletedAt,
      purgeAt: t.deletedAt + TRASH_DAYS * 86400000,
    }));
    res.json({ items });
  });

  r.post('/api/trash/:id/restore', async (req, res) => {
    const chapter = await mutateDB((db) => {
      const i = db.trash.findIndex((t) => t.id === req.params.id);
      if (i === -1) throw new HttpError(404, 'not_found', 'Nicht mehr im Papierkorb.');
      const { item } = db.trash[i];
      if (!db.subjects.some((s) => s.id === item.subjectId)) {
        throw new HttpError(409, 'subject_missing', 'Das Fach dieses Kapitels gibt es nicht mehr.');
      }
      if (db.chapters.some((c) => c.id === item.id)) throw new HttpError(409, 'exists', 'Das Kapitel existiert bereits.');
      db.trash.splice(i, 1);
      db.chapters.push({ ...item, updatedAt: Date.now() });
      return item;
    });
    res.json({ chapter });
  });

  r.delete('/api/trash/:id', async (req, res) => {
    const entry = await mutateDB((db) => {
      const i = db.trash.findIndex((t) => t.id === req.params.id);
      if (i === -1) throw new HttpError(404, 'not_found', 'Nicht mehr im Papierkorb.');
      return db.trash.splice(i, 1)[0];
    });
    await removeFilesUnlessUsed(entry.item.id);
    res.json({ ok: true });
  });

  return r;
}
