/**
 * Paths, ports and limits — every value can be overridden through the
 * environment (or .env, see env.js and .env.example).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIST_DIR = path.join(ROOT, 'dist');

// All content lives in data/ (gitignored): the database and uploaded files.
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
export const DB_PATH = path.join(DATA_DIR, 'db.json');
export const DB_BAK = path.join(DATA_DIR, 'db.json.bak');
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
export const TMP_DIR = path.join(DATA_DIR, 'tmp');
export const MAX_SNAPSHOTS = 10;
export const SNAPSHOT_INTERVAL_MS = 3 * 60 * 1000;

// Only these folders under data/ are ever served (under /data/<root>/…), and
// only to signed-in users. db.json, backups/ and tmp/ never are.
export const ENTITY_ROOTS = ['chapters'];

export const PORT = Number(process.env.API_PORT) || 4300;
// Loopback by default: put a reverse proxy (HTTPS!) in front for real hosting.
export const HOST = process.env.HOST || '127.0.0.1';
export const IS_PROD = process.env.NODE_ENV === 'production';

export const ALLOWED_HOSTS = String(process.env.ALLOWED_HOSTS || '')
  .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
// Which proxies may tell us the client's IP and protocol (X-Forwarded-*).
// "loopback" = a proxy on the same machine (nginx, Caddy …).
export const TRUST_PROXY = process.env.TRUST_PROXY || 'loopback';

export const MAX_UPLOAD_MB = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 50);
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// Content packs that ship with the code (content/<subject>/<chapter>/chapter.json),
// imported once at start. CONTENT_DIR=off switches the import off.
export const CONTENT_DIR = process.env.CONTENT_DIR === 'off' ? null
  : process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(ROOT, 'content');

// Deleted chapters stay in the trash this long before they're purged.
export const TRASH_DAYS = 30;
