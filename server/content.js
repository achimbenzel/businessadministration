/**
 * Content packs: chapters that ship with the code, so content can be prepared
 * in the repository and arrives with a `git pull`:
 *
 *   content/<subject>/<chapter>/chapter.json   { id, subjectId, title, summary, status, position, blocks }
 *   content/<subject>/<chapter>/img/…          pictures, referenced as { type: 'image', file: 'img/x.svg' }
 *
 * At start, every pack that hasn't been imported yet is added to the database
 * once (its files copied to data/chapters/<id>/). From then on the chapter is
 * the admin's like any other: edit it, move it, delete it — a pack is never
 * imported twice (db.contentImported remembers it).
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { CONTENT_DIR, DATA_DIR } from './config.js';
import { mutateDB, readDB } from './db.js';
import { normalizeChapter } from './schema.js';
import { isId } from './schema/base.js';
import { assertInside, sanitize } from './files.js';

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

// Copies the pack's files into the chapter's folder and points the blocks at them.
async function withFiles(pack, dir) {
  const target = path.join(DATA_DIR, 'chapters', pack.id);
  const copied = new Map();
  const copy = async (rel) => {
    if (copied.has(rel)) return copied.get(rel);
    const src = assertInside(path.join(dir, String(rel)), dir); // nothing outside the pack
    const name = sanitize(path.basename(src));
    await fsp.mkdir(target, { recursive: true });
    await fsp.copyFile(src, path.join(target, name));
    const ref = { src: `chapters/${pack.id}/${name}`, size: (await fsp.stat(src)).size };
    copied.set(rel, ref);
    return ref;
  };
  const blocks = [];
  for (const b of Array.isArray(pack.blocks) ? pack.blocks : []) {
    if (b?.type === 'image' && b.file) {
      blocks.push({ ...b, src: (await copy(b.file)).src });
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

/** Import all new packs. Returns the ids of the chapters that were added. */
export async function importContentPacks(dir = CONTENT_DIR) {
  const imported = [];
  for (const { file, dir: packDir } of await findPacks(dir)) {
    const where = path.relative(process.cwd(), file);
    try {
      const pack = JSON.parse(await fsp.readFile(file, 'utf8'));
      if (!isId(pack.id)) throw new Error('"id" fehlt oder ist ungültig (6–40 Zeichen: a–z, 0–9, _ und -)');
      const db = await readDB();
      if (db.contentImported.some((x) => x.id === pack.id)) continue;
      if (!db.subjects.some((s) => s.id === pack.subjectId)) {
        console.warn(`  Inhaltspaket ${where}: Fach "${pack.subjectId}" gibt es nicht – übersprungen.`);
        continue;
      }
      // The chapter exists already (e.g. imported before this was tracked): just remember it.
      const exists = db.chapters.some((c) => c.id === pack.id) || db.trash.some((t) => t.item.id === pack.id);
      const blocks = exists ? [] : await withFiles(pack, packDir);
      await mutateDB((d) => {
        const now = Date.now();
        if (!exists) {
          const siblings = d.chapters.filter((c) => c.subjectId === pack.subjectId);
          let order = Math.max(-1, ...siblings.map((c) => c.order)) + 1;
          if (pack.position === 'first') { for (const c of siblings) c.order += 1; order = 0; }
          d.chapters.push(normalizeChapter({
            id: pack.id, subjectId: pack.subjectId, title: pack.title, summary: pack.summary,
            status: pack.status === 'draft' ? 'draft' : 'published',
            blocks, order, rev: 1, createdAt: now, updatedAt: now,
          }));
        }
        d.contentImported.push({ id: pack.id, at: now });
      });
      if (!exists) imported.push(pack.id);
    } catch (err) {
      console.warn(`  Inhaltspaket ${where} konnte nicht importiert werden: ${err.message}`);
    }
  }
  return imported;
}
