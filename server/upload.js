/**
 * Uploads: multer writes to data/tmp/ first; the route then moves the file to
 * its chapter's folder. Leftovers in tmp/ (aborted uploads) are cleaned up.
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { MAX_UPLOAD_BYTES, TMP_DIR } from './config.js';

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fsp.mkdir(TMP_DIR, { recursive: true }).then(() => cb(null, TMP_DIR), cb);
    },
    filename: (_req, _file, cb) => cb(null, `${Date.now()}-${nanoid(8)}.upload`),
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 },
});

/** Remove temp uploads older than `maxAgeMs` (default 1 hour). */
export async function cleanTmp(maxAgeMs = 60 * 60 * 1000) {
  const now = Date.now();
  for (const f of await fsp.readdir(TMP_DIR).catch(() => [])) {
    const p = path.join(TMP_DIR, f);
    const st = await fsp.stat(p).catch(() => null);
    if (st && now - st.mtimeMs > maxAgeMs) await fsp.rm(p, { recursive: true, force: true }).catch(() => {});
  }
}
