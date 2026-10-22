/**
 * Loads `.env` into process.env before any other server module reads it.
 * server/index.js imports this file first; ES modules run their imports in
 * order, so config.js and auth.js already see the values.
 *
 * Variables that are already set (by the shell, a process manager or the
 * tests) win over the file — process.loadEnvFile never overrides them.
 * ENV_FILE points at a different file (the tests use a missing one so a
 * developer's .env can't leak into them).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.env.ENV_FILE ? path.resolve(process.env.ENV_FILE) : path.join(ROOT, '.env');

try {
  process.loadEnvFile(file);
} catch (err) {
  // No .env is fine when the variables come from the environment instead;
  // index.js stops with a clear message if the passwords are missing.
  if (err.code !== 'ENOENT') throw err;
}
