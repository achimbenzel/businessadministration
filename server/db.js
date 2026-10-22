/**
 * db.json persistence: one JSON file kept in memory, crash-safe atomic writes,
 * self-healing reads, rotating snapshots and a serialized write queue.
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import { nanoid } from 'nanoid';
import { DATA_DIR, DB_PATH, DB_BAK, BACKUP_DIR, MAX_SNAPSHOTS, SNAPSHOT_INTERVAL_MS } from './config.js';
import { normalizeDB, seedDB } from './schema.js';

export class DBUnavailableError extends Error {
  constructor(cause) {
    super('Die Datenbank (data/db.json) konnte nicht gelesen werden. Es wurde nichts verändert — '
      + 'prüfe die Datei oder stelle eine aus data/backups/ wieder her.');
    this.status = 503;
    this.code = 'db_unavailable';
    this.cause = cause;
  }
}

async function parseDBFile(p) {
  const db = JSON.parse(await fsp.readFile(p, 'utf8'));
  if (!db || typeof db !== 'object' || Array.isArray(db)) throw new Error(`${path.basename(p)} is not a database`);
  return db;
}

async function newestSnapshot() {
  const snaps = (await fsp.readdir(BACKUP_DIR).catch(() => [])).filter((f) => /^db-.*\.json$/.test(f)).sort();
  return snaps.length ? path.join(BACKUP_DIR, snaps[snaps.length - 1]) : null;
}

/**
 * Read the raw database, falling back to the .bak mirror and then the newest
 * snapshot if db.json is missing or corrupt. Returns null only when there is
 * genuinely no database yet. If files exist but none can be read it throws —
 * starting from an empty database here would overwrite the real one on the
 * next save.
 */
async function loadRawDB() {
  const candidates = [DB_PATH, DB_BAK];
  const snap = await newestSnapshot();
  if (snap) candidates.push(snap);
  let unreadable = null;
  for (const p of candidates) {
    try {
      const db = await parseDBFile(p);
      if (p !== DB_PATH) console.warn(`  db.json unreadable — recovered from ${path.basename(p)}`);
      return { db, recovered: p !== DB_PATH };
    } catch (err) {
      if (err.code !== 'ENOENT') unreadable = unreadable || err;
    }
  }
  if (unreadable) throw new DBUnavailableError(unreadable);
  return null;
}

// ---- The database in memory ---------------------------------------------------
// Kept as a JSON string: every reader parses its own copy, so no request can
// change what another one sees — exactly like reading the file each time.
let current = null;

/** Load db.json at start (or create it with the first-run content). */
export async function loadDB() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const raw = await loadRawDB();
  const db = raw ? normalizeDB(raw.db) : seedDB();
  current = JSON.stringify(db);
  if (!raw || raw.recovered) await writeDBAtomic(db); // first run, or heal db.json from the fallback
  return db;
}

export async function readDB() {
  if (current == null) await loadDB();
  return JSON.parse(current);
}

// Write db.json atomically: temp file → fsync → rename over the target (atomic
// on the same filesystem), so a crash mid-write never leaves a truncated file.
// Then mirror the last good version to .bak and keep rotating snapshots.
let lastSnapshotAt = 0;
async function writeDBAtomic(db) {
  const json = JSON.stringify(db, null, 2);
  const tmp = path.join(DATA_DIR, `.db-${nanoid(8)}.tmp`);
  try {
    const fh = await fsp.open(tmp, 'w');
    try { await fh.writeFile(json); await fh.sync(); } finally { await fh.close(); }
    await fsp.rename(tmp, DB_PATH);
  } catch (err) {
    await fsp.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
  await fsp.writeFile(DB_BAK, json).catch(() => {});
  await snapshotDB(json).catch(() => {});
}

// Keep the newest MAX_SNAPSHOTS versions under data/backups/, throttled so a
// burst of autosaves doesn't churn the disk while snapshots still span time.
async function snapshotDB(json) {
  const now = Date.now();
  if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return;
  lastSnapshotAt = now;
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date(now).toISOString().replace(/[:.]/g, '-');
  await fsp.writeFile(path.join(BACKUP_DIR, `db-${stamp}.json`), json);
  const files = (await fsp.readdir(BACKUP_DIR).catch(() => [])).filter((f) => /^db-.*\.json$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - MAX_SNAPSHOTS))) {
    await fsp.rm(path.join(BACKUP_DIR, f), { force: true }).catch(() => {});
  }
}

// ---- Serialized writes ----------------------------------------------------------
let chain = Promise.resolve();

/**
 * Read → change → write, one at a time. The mutator gets its own copy; if it
 * throws (e.g. an HttpError for "not found"), nothing is written. Its return
 * value is passed on.
 */
export function mutateDB(mutator) {
  const run = chain.then(async () => {
    const draft = await readDB();
    const result = await mutator(draft);
    const db = normalizeDB(draft);
    await writeDBAtomic(db);
    current = JSON.stringify(db);
    return result;
  });
  chain = run.catch(() => {}); // one failed write must not block the next ones
  return run;
}

/** Resolves once every queued write has finished (used on shutdown). */
export async function drainWrites() {
  let prev;
  do { prev = chain; await prev.catch(() => {}); } while (chain !== prev);
}
