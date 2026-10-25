/**
 * Content packs: chapters that ship with the code, so content can be prepared
 * in the repository and arrives with a `git pull`:
 *
 *   content/<subject>/subject.json             { id, semesterId, title, short, icon, color, description } (optional)
 *   content/<subject>/<chapter>/chapter.json   { id, version, subjectId, lang, title, summary, status, position | after, blocks }
 *   content/<subject>/<chapter>/img/…          pictures, referenced as { type: 'image', file: 'img/x.svg' }
 *                                              (on slides: { slides: [{ …, file: 'img/x.svg' }] })
 *
 * At start, every new pack is added to the database once (its files copied to
 * data/chapters/<id>/). From then on the chapter is the admin's like any other.
 * When a pack's `version` goes up, the chapter is updated — but only if nobody
 * has edited it in the app since (its revision is still the one the import
 * produced). An edited chapter is never overwritten: the new version arrives
 * as a separate draft right after it. A chapter the admin deleted stays deleted.
 *
 * A subject.json adds its subject once — to existing databases too — at the
 * end of its semester. Deleted or edited in the app, it stays that way.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { CONTENT_DIR, DATA_DIR } from './config.js';
import { mutateDB, readDB } from './db.js';
import { normalizeChapter, normalizeSubject, chapterFiles } from './schema.js';
import { isId } from './schema/base.js';
import { assertInside, sanitize, safeRm } from './files.js';

/** Every chapter.json up to three folders deep, sorted by path (01-…, 02-…). */
export async function findPacks(dir = CONTENT_DIR) {
  const found = [];
  async function walk(d, depth) {
    for (const e of await fsp.readdir(d, { withFileTypes: true }).catch(() => [])) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory() && depth < 3) await walk(p, depth + 1);
      else if (e.isFile() && e.name === 'chapter.json') found.push({ file: p, dir: d });
    }
  }
  if (dir && fs.existsSync(dir)) await walk(dir, 0);
  return found.sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Copies the pack's files into data/chapters/<chapterId>/ and points the blocks
 * at them. Names carry a hash of the content: files are served with a long
 * "immutable" cache, so a changed figure must get a new URL.
 */
async function withFiles(pack, dir, chapterId) {
  const target = path.join(DATA_DIR, 'chapters', chapterId);
  const copied = new Map();
  const copy = async (rel) => {
    if (copied.has(rel)) return copied.get(rel);
    const src = assertInside(path.join(dir, String(rel)), dir); // nothing outside the pack
    const data = await fsp.readFile(src);
    const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 8);
    const name = `${hash}-${sanitize(path.basename(src))}`;
    await fsp.mkdir(target, { recursive: true });
    await fsp.writeFile(path.join(target, name), data);
    const ref = { src: `chapters/${chapterId}/${name}`, size: data.length };
    copied.set(rel, ref);
    return ref;
  };
  const blocks = [];
  for (const b of Array.isArray(pack.blocks) ? pack.blocks : []) {
    if (b?.type === 'image' && b.file) {
      blocks.push({ ...b, src: (await copy(b.file)).src });
    } else if (b?.type === 'slides' && Array.isArray(b.slides)) {
      const slides = [];
      for (const s of b.slides) slides.push(s?.file ? { ...s, image: (await copy(s.file)).src } : s);
      blocks.push({ ...b, slides });
    } else if (b?.type === 'files' && Array.isArray(b.items)) {
      const items = [];
      for (const f of b.items) items.push(f?.file ? { ...f, ...(await copy(f.file)), name: f.name || path.basename(f.file) } : f);
      blocks.push({ ...b, items });
    } else {
      blocks.push(b);
    }
  }
  return blocks;
}

// The chapter fields a pack sets.
const fromPack = (pack, blocks) => ({
  title: pack.title,
  summary: pack.summary,
  status: pack.status === 'draft' ? 'draft' : 'published',
  lang: pack.lang,
  blocks,
});

// After an update: files of the old version that the new one no longer uses.
async function removeUnusedFiles(chapter) {
  const dir = path.join(DATA_DIR, 'chapters', chapter.id);
  const used = new Set([...chapterFiles(chapter)].map((src) => path.basename(src)));
  for (const f of await fsp.readdir(dir).catch(() => [])) {
    if (!used.has(f)) await safeRm(path.join(dir, f)).catch(() => {});
  }
}

/** Subjects that ship with the content (content/<subject>/subject.json), each added once. */
export async function importContentSubjects(dir = CONTENT_DIR) {
  const report = [];
  if (!dir || !fs.existsSync(dir)) return report;
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries.filter((x) => x.isDirectory() && !x.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, e.name, 'subject.json');
    if (!fs.existsSync(file)) continue;
    try {
      const def = JSON.parse(await fsp.readFile(file, 'utf8'));
      if (!isId(def.id)) throw new Error('"id" fehlt oder ist ungültig (6–40 Zeichen: a–z, 0–9, _ und -)');
      const db = await readDB();
      if (db.subjectsImported.some((x) => x.id === def.id)) continue;
      const exists = db.subjects.some((s) => s.id === def.id);
      if (!exists && !db.semesters.some((s) => s.id === def.semesterId)) {
        console.warn(`  Fach ${def.id}: Semester "${def.semesterId}" gibt es nicht – übersprungen.`);
        continue; // tried again at the next start
      }
      await mutateDB((d) => {
        const now = Date.now();
        if (!exists) {
          const order = Math.max(-1, ...d.subjects.filter((s) => s.semesterId === def.semesterId).map((s) => s.order)) + 1;
          d.subjects.push(normalizeSubject({ ...def, order, createdAt: now, updatedAt: now }));
        }
        d.subjectsImported.push({ id: def.id, at: now });
      });
      if (!exists) report.push({ id: def.id, action: 'subject' });
    } catch (err) {
      console.warn(`  ${path.relative(process.cwd(), file)} konnte nicht importiert werden: ${err.message}`);
    }
  }
  return report;
}

/**
 * Import new subjects and packs and apply new versions.
 * Returns what happened: [{ id, action: 'subject' | 'imported' | 'updated' | 'draft' }].
 */
export async function importContentPacks(dir = CONTENT_DIR) {
  const report = await importContentSubjects(dir);
  for (const { file, dir: packDir } of await findPacks(dir)) {
    const where = path.relative(process.cwd(), file);
    try {
      const pack = JSON.parse(await fsp.readFile(file, 'utf8'));
      if (!isId(pack.id)) throw new Error('"id" fehlt oder ist ungültig (6–40 Zeichen: a–z, 0–9, _ und -)');
      const version = Number.isInteger(pack.version) && pack.version > 0 ? pack.version : 1;
      const db = await readDB();
      const record = db.contentImported.find((x) => x.id === pack.id);
      if (record && record.version >= version) continue;
      if (!db.subjects.some((s) => s.id === pack.subjectId)) {
        console.warn(`  Inhaltspaket ${where}: Fach "${pack.subjectId}" gibt es nicht – übersprungen.`);
        continue;
      }
      const chapter = db.chapters.find((c) => c.id === pack.id);
      const inTrash = db.trash.some((t) => t.item.id === pack.id);

      // 1. New pack.
      if (!record) {
        const exists = Boolean(chapter) || inTrash; // imported before this was tracked: just remember it
        const blocks = exists ? [] : await withFiles(pack, packDir, pack.id);
        await mutateDB((d) => {
          const now = Date.now();
          if (!exists) {
            const siblings = d.chapters.filter((c) => c.subjectId === pack.subjectId);
            let order = Math.max(-1, ...siblings.map((c) => c.order)) + 1;
            const ref = pack.after && siblings.find((c) => c.id === pack.after);
            if (pack.position === 'first') {
              for (const c of siblings) c.order += 1;
              order = 0;
            } else if (ref) { // right after another chapter
              for (const c of siblings) if (c.order > ref.order) c.order += 1;
              order = ref.order + 1;
            }
            d.chapters.push(normalizeChapter({ id: pack.id, subjectId: pack.subjectId, ...fromPack(pack, blocks), order, rev: 1, createdAt: now, updatedAt: now }));
          }
          d.contentImported.push({ id: pack.id, at: now, version, rev: exists ? chapter?.rev ?? 0 : 1 });
        });
        if (!exists) report.push({ id: pack.id, action: 'imported' });
        continue;
      }

      // 2. Newer version, chapter deleted in the app: respect that.
      if (!chapter) {
        await mutateDB((d) => { Object.assign(d.contentImported.find((x) => x.id === pack.id), { version, at: Date.now() }); });
        console.log(`  Inhaltspaket ${pack.id} v${version}: Kapitel wurde gelöscht – nicht wieder angelegt.`);
        continue;
      }

      // 3. Newer version, chapter untouched since the import: update it in place
      //    (subject and position stay as they are).
      if (chapter.rev === record.rev) {
        const blocks = await withFiles(pack, packDir, pack.id);
        const updated = await mutateDB((d) => {
          const c = d.chapters.find((x) => x.id === pack.id);
          const now = Date.now();
          Object.assign(c, normalizeChapter({ ...c, ...fromPack(pack, blocks), rev: c.rev + 1, updatedAt: now }));
          Object.assign(d.contentImported.find((x) => x.id === pack.id), { version, rev: c.rev, at: now });
          return c;
        });
        await removeUnusedFiles(updated);
        report.push({ id: pack.id, action: 'updated' });
        continue;
      }

      // 4. Newer version, chapter edited in the app: keep the edits, add the
      //    new version as a draft right after it.
      const copyId = isId(`${pack.id}-v${version}`) && !db.chapters.some((c) => c.id === `${pack.id}-v${version}`)
        ? `${pack.id}-v${version}` : nanoid(10);
      const blocks = await withFiles(pack, packDir, copyId);
      await mutateDB((d) => {
        const now = Date.now();
        const original = d.chapters.find((x) => x.id === pack.id);
        for (const c of d.chapters) if (c.subjectId === original.subjectId && c.order > original.order) c.order += 1;
        d.chapters.push(normalizeChapter({
          id: copyId, subjectId: original.subjectId, ...fromPack(pack, blocks), status: 'draft',
          order: original.order + 1, rev: 1, createdAt: now, updatedAt: now,
        }));
        Object.assign(d.contentImported.find((x) => x.id === pack.id), { version, at: now });
      });
      console.log(`  Inhaltspaket ${pack.id} v${version}: Kapitel wurde in der App bearbeitet – neue Version als Entwurf „${copyId}“ angelegt.`);
      report.push({ id: copyId, action: 'draft' });
    } catch (err) {
      console.warn(`  Inhaltspaket ${where} konnte nicht importiert werden: ${err.message}`);
    }
  }
  return report;
}
