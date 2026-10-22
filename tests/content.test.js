// Content packs: imported once at start, first in the subject, files copied.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { startServer, tempDir, readJSON, exists, ROOT } from './helpers.js';

const CONTENT = path.join(ROOT, 'content');
const PACK = 'efed-01-supply-demand-indifferenz';
const servers = [];
after(async () => { for (const s of servers) await s.stop(); });
const start = async (opts) => { const s = await startServer(opts); servers.push(s); return s; };

test('the bundled chapter is imported as the first, published chapter with its figures', async () => {
  const srv = await start({ env: { CONTENT_DIR: CONTENT } });
  const viewer = await srv.login('user');
  const { data } = await viewer('/api/subjects/economical-framework');
  assert.equal(data.chapters[0].id, PACK);
  assert.equal(data.chapters[0].status, 'published');

  const { chapter } = (await viewer(`/api/chapters/${PACK}`)).data;
  const source = await readJSON(path.join(CONTENT, 'economical-framework/01-supply-demand-indifferenzkurven/chapter.json'));
  assert.equal(chapter.blocks.length, source.blocks.length, 'no block was dropped by the normalizer');
  const images = chapter.blocks.filter((b) => b.type === 'image');
  assert.ok(images.length >= 5);
  for (const img of images) {
    assert.match(img.src, new RegExp(`^chapters/${PACK}/[\\w.-]+\\.svg$`));
    const res = await viewer(`/data/${img.src}`);
    assert.equal(res.status, 200, img.src);
    assert.match(res.headers.get('content-type'), /image\/svg\+xml/);
    assert.ok(img.alt && img.caption, 'every figure has alt text and a caption');
  }
  assert.ok(chapter.blocks.some((b) => b.type === 'flashcard'));
  assert.ok(chapter.blocks.filter((b) => b.type === 'quiz').every((q) => q.options.some((o) => o.correct)));
  assert.equal((await viewer('/api/subjects/economical-framework/cards')).data.cards.length, chapter.blocks.filter((b) => b.type === 'flashcard').length);
});

test('a pack is imported only once — also after the admin deleted the chapter', async () => {
  const dataDir = await tempDir();
  let srv = await start({ dataDir, env: { CONTENT_DIR: CONTENT } });
  let admin = await srv.login('admin');
  const { trashId } = (await admin(`/api/chapters/${PACK}`, { method: 'DELETE' })).data;
  await admin(`/api/trash/${trashId}`, { method: 'DELETE' });
  await srv.stop();

  srv = await start({ dataDir, env: { CONTENT_DIR: CONTENT } });
  admin = await srv.login('admin');
  assert.equal((await admin(`/api/chapters/${PACK}`)).status, 404);
  const db = await readJSON(path.join(dataDir, 'db.json'));
  assert.deepEqual(db.contentImported.map((x) => x.id), [PACK]);
});

test('position "first" moves existing chapters down; bad packs are skipped', async () => {
  const dataDir = await tempDir();
  let srv = await start({ dataDir });
  const admin = await srv.login('admin');
  const old = (await admin('/api/chapters', { method: 'POST', json: { subjectId: 'kosten-leistungsrechnung', title: 'Schon da' } })).data.chapter;
  await srv.stop();

  const content = await tempDir();
  const good = path.join(content, 'klr', '01-neu');
  await fsp.mkdir(path.join(good, 'img'), { recursive: true });
  await fsp.writeFile(path.join(good, 'img', 'a.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await fsp.writeFile(path.join(good, 'chapter.json'), JSON.stringify({
    id: 'klr-01-neu', subjectId: 'kosten-leistungsrechnung', position: 'first', title: 'Neu',
    blocks: [{ type: 'image', file: 'img/a.svg' }, { type: 'text', text: 'Hallo' }],
  }));
  const evil = path.join(content, 'klr', '02-evil');
  await fsp.mkdir(evil, { recursive: true });
  await fsp.writeFile(path.join(evil, 'chapter.json'), JSON.stringify({
    id: 'klr-02-evil', subjectId: 'kosten-leistungsrechnung', blocks: [{ type: 'image', file: '../../../../etc/hostname' }],
  }));
  const orphan = path.join(content, 'x', '01-orphan');
  await fsp.mkdir(orphan, { recursive: true });
  await fsp.writeFile(path.join(orphan, 'chapter.json'), JSON.stringify({ id: 'x-01-orphan', subjectId: 'no-such-subject', blocks: [] }));

  srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  const viewer = await srv.login('admin');
  const list = (await viewer('/api/subjects/kosten-leistungsrechnung')).data.chapters;
  assert.deepEqual(list.map((c) => c.id), ['klr-01-neu', old.id]);
  assert.ok(exists(path.join(dataDir, 'chapters', 'klr-01-neu', 'a.svg')));
  assert.equal((await viewer('/api/chapters/klr-02-evil')).status, 404);
  assert.match(srv.log(), /klr-02-evil|02-evil/);
  assert.match(srv.log(), /no-such-subject/);
});
