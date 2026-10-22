/**
 * Server start: load .env, check the passwords, open the database and listen.
 * `env.js` must stay the first import — the modules after it read
 * process.env when they load.
 */
import './env.js';
import fsp from 'node:fs/promises';
import { DATA_DIR, HOST, PORT, IS_PROD } from './config.js';
import { checkAuthConfig } from './auth.js';
import { loadDB, drainWrites } from './db.js';
import { createApp } from './app.js';
import { cleanTmp } from './upload.js';
import { purgeOldTrash } from './routes/trash.js';
import { importContentPacks } from './content.js';

const { errors, warnings } = checkAuthConfig();
if (errors.length) {
  console.error('\n  Cannot start — the login is not configured:');
  for (const e of errors) console.error(`   • ${e}`);
  console.error('\n  Copy .env.example to .env and set USER_PASSWORD and ADMIN_PASSWORD.\n');
  process.exit(1);
}
for (const w of warnings) console.warn(`  ⚠ ${w}`);

await fsp.mkdir(DATA_DIR, { recursive: true });
await loadDB();
const LABEL = { imported: 'neu importiert', updated: 'aktualisiert', draft: 'neue Version als Entwurf' };
for (const { id, action } of await importContentPacks()) console.log(`  Kapitel aus content/ ${LABEL[action]}: ${id}`);
await cleanTmp().catch(() => {});
await purgeOldTrash().catch((err) => console.warn('  trash purge failed:', err.message));

const server = createApp().listen(PORT, HOST, () => {
  console.log(`  BA Lernplattform ${IS_PROD ? '' : 'API '}läuft auf http://${HOST}:${PORT}`);
  if (!IS_PROD) console.log('  Frontend (Dev): http://127.0.0.1:4200');
});

// Finish queued writes before exiting, so Ctrl+C never cuts a save in half.
async function shutdown() {
  server.close();
  await drainWrites();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
