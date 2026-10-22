/**
 * File helpers: clean file names, make sure a path really is inside data/,
 * move uploads into place and delete safely.
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from './config.js';

/** A safe file name: no path parts, only [A-Za-z0-9._-], at most 80 characters. */
export function sanitize(name, fallback = 'datei') {
  const base = String(name || '').split(/[\\/]/).pop()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // ä → a, é → e
    .replace(/ß/g, 'ss')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[.-]+/, '')
    .slice(-80);
  return base || fallback;
}

/** Throws unless `p` lies inside `root` (default data/) — no path traversal. */
export function assertInside(p, root = DATA_DIR) {
  const rel = path.relative(path.resolve(root), path.resolve(p));
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    const err = new Error('Path outside the data folder');
    err.status = 400; err.code = 'bad_path';
    throw err;
  }
  return path.resolve(p);
}

/** Move a file (rename, or copy + delete across file systems). */
export async function moveFile(from, to) {
  await fsp.mkdir(path.dirname(to), { recursive: true });
  try {
    await fsp.rename(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fsp.copyFile(from, to);
    await fsp.rm(from, { force: true });
  }
}

/** rm -rf, but only inside data/. */
export async function safeRm(p) {
  await fsp.rm(assertInside(p), { recursive: true, force: true });
}
