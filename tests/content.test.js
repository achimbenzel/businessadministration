// Content packs: imported once at start, first in the subject, files copied.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { startServer, tempDir, readJSON, exists, ROOT } from './helpers.js';

const CONTENT = path.join(ROOT, 'content');
const PACK = 'efed-01-supply-demand-indifferenz';
const PACK2 = 'efed-02-indifference-curves';
const servers = [];
after(async () => { for (const s of servers) await s.stop(); });
const start = async (opts) => { const s = await startServer(opts); servers.push(s); return s; };

test('the bundled chapters are imported first in the subject, in sections, with figures and demos', async () => {
  const srv = await start({ env: { CONTENT_DIR: CONTENT } });
  const viewer = await srv.login('user');
  const { data } = await viewer('/api/subjects/economical-framework');
  assert.deepEqual(data.chapters.map((c) => c.id), [PACK, PACK2]);
  let cards = 0;
  for (const [id, folder, demo] of [[PACK, '01-supply-demand', 'supplyDemand'], [PACK2, '02-indifference-curves', 'consumerChoice']]) {
    const { chapter } = (await viewer(`/api/chapters/${id}`)).data;
    const source = await readJSON(path.join(CONTENT, 'economical-framework', folder, 'chapter.json'));
    assert.equal(chapter.status, 'published');
    assert.equal(chapter.lang, 'de');
    assert.equal(chapter.blocks.length, source.blocks.length, `${id}: no block was dropped by the normalizer`);
    // Every block sits in a section, and every section has content.
    assert.deepEqual(chapter.blocks.map((b) => b.tab), source.blocks.map((b) => b.tab));
    assert.deepEqual([...new Set(chapter.blocks.map((b) => b.tab))].sort(),
      ['formulas', 'interactive', 'overview', 'practice', 'terms', 'theory']);
    // Terms come with the English term and definition, formulas with explanation, example and analogy.
    const terms = chapter.blocks.filter((b) => b.type === 'definition');
    assert.ok(terms.length >= 15 && terms.every((d) => d.tab === 'terms' && d.termEn && d.textEn), `${id}: terms in German and English`);
    const formulas = chapter.blocks.filter((b) => b.type === 'formula');
    assert.ok(formulas.length >= 8 && formulas.every((f) => f.tab === 'formulas' && f.title && f.variables.length && f.explanation && f.example && f.analogy),
      `${id}: every formula is explained`);
    const images = chapter.blocks.filter((b) => b.type === 'image');
    assert.ok(images.length >= 2);
    for (const img of images) {
      assert.match(img.src, new RegExp(`^chapters/${id}/[0-9a-f]{8}-[\\w.-]+\\.svg$`)); // content hash in the name
      const res = await viewer(`/data/${img.src}`);
      assert.equal(res.status, 200, img.src);
      assert.match(res.headers.get('content-type'), /image\/svg\+xml/);
      assert.ok(img.alt && img.caption, 'every figure has alt text and a caption');
    }
    const demoBlock = chapter.blocks.find((b) => b.type === demo);
    const demoSource = source.blocks.find((b) => b.type === demo);
    assert.ok(demoBlock, `${id} has its interactive demo`);
    for (const [k, v] of Object.entries(demoSource)) if (k !== 'type') assert.equal(demoBlock[k], v, `${id} demo ${k}`);
    assert.ok(chapter.blocks.filter((b) => b.type === 'quiz').every((q) => q.options.some((o) => o.correct)));
    cards += chapter.blocks.filter((b) => b.type === 'flashcard').length;
  }
  assert.equal((await viewer('/api/subjects/economical-framework/cards')).data.cards.length, cards);
});

test('Mathe-Tutorium: the subject comes with its pack, chapters with slide decks and pictures', async () => {
  const dataDir = await tempDir();
  let srv = await start({ dataDir, env: { CONTENT_DIR: CONTENT } });
  let admin = await srv.login('admin');
  const subjects = (await admin('/api/semesters')).data.semesters.find((s) => s.id === 'semester-1').subjects;
  const math = subjects[subjects.length - 1];
  assert.deepEqual([math.id, math.title, math.icon], ['mathe-tutorium', 'Mathe-Tutorium', 'sigma'], 'added at the end of semester 1');
  const { data } = await admin('/api/subjects/mathe-tutorium');
  assert.deepEqual(data.chapters.map((c) => c.id), ['mathe-01-summen-produkt', 'mathe-02-potenzgesetze', 'mathe-03-binomische-formeln']);
  for (const { id } of data.chapters) {
    const { chapter } = (await admin(`/api/chapters/${id}`)).data;
    const deck = chapter.blocks.find((b) => b.type === 'slides');
    assert.ok(deck && deck.tab === 'slides' && deck.slides.length >= 10, `${id}: a slide deck in the "Folien" section`);
    assert.ok(deck.slides.every((x) => x.title), `${id}: every slide has a title`);
    for (const img of deck.slides.filter((x) => x.image)) {
      assert.match(img.image, new RegExp(`^chapters/${id}/[0-9a-f]{8}-[\\w.-]+\\.svg$`));
      assert.equal((await admin(`/data/${img.image}`)).status, 200, img.image);
    }
    assert.ok(chapter.blocks.some((b) => b.type === 'formula' && /\^|\\sum|\\frac/.test(b.text)), `${id}: formulas in math syntax`);
  }

  // Deleted by the admin (with its chapters): not brought back at the next start.
  for (const { id } of data.chapters) {
    const { trashId } = (await admin(`/api/chapters/${id}`, { method: 'DELETE' })).data;
    await admin(`/api/trash/${trashId}`, { method: 'DELETE' });
  }
  assert.equal((await admin('/api/subjects/mathe-tutorium', { method: 'DELETE' })).status, 200);
  await srv.stop();
  srv = await start({ dataDir, env: { CONTENT_DIR: CONTENT } });
  admin = await srv.login('admin');
  assert.equal((await admin('/api/subjects/mathe-tutorium')).status, 404);
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
  assert.deepEqual(db.contentImported.map((x) => x.id).filter((x) => x.startsWith('efed-')), [PACK, PACK2]);
  assert.deepEqual((await admin('/api/subjects/economical-framework')).data.chapters.map((c) => c.id), [PACK2]);
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
  const imported = (await viewer('/api/chapters/klr-01-neu')).data.chapter;
  assert.match(imported.blocks[0].src, /^chapters\/klr-01-neu\/[0-9a-f]{8}-a\.svg$/);
  assert.ok(exists(path.join(dataDir, imported.blocks[0].src)));
  assert.equal((await viewer('/api/chapters/klr-02-evil')).status, 404);
  assert.match(srv.log(), /klr-02-evil|02-evil/);
  assert.match(srv.log(), /no-such-subject/);
});

// A small pack in a temp folder; write(version, text, svg) rewrites it.
async function tempPack() {
  const content = await tempDir();
  const dir = path.join(content, 'klr', '01-pack');
  await fsp.mkdir(path.join(dir, 'img'), { recursive: true });
  const write = async (version, text, svg) => {
    await fsp.writeFile(path.join(dir, 'img', 'fig.svg'), `<svg xmlns="http://www.w3.org/2000/svg"><title>${svg}</title></svg>`);
    await fsp.writeFile(path.join(dir, 'chapter.json'), JSON.stringify({
      id: 'klr-01-pack', version, subjectId: 'kosten-leistungsrechnung', lang: 'en', title: `Pack v${version}`,
      blocks: [{ type: 'text', text }, { type: 'image', file: 'img/fig.svg', caption: 'Fig' }],
    }));
  };
  return { content, write };
}

test('a new pack version updates a chapter nobody has edited', async () => {
  const dataDir = await tempDir();
  const { content, write } = await tempPack();
  await write(1, 'first', 'one');
  let srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  let admin = await srv.login('admin');
  // Reordering is not an edit.
  await admin('/api/subjects/kosten-leistungsrechnung/order', { method: 'POST', json: { ids: ['klr-01-pack'] } });
  const v1 = (await admin('/api/chapters/klr-01-pack')).data.chapter;
  await srv.stop();

  await write(2, 'second', 'two');
  srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  admin = await srv.login('admin');
  const v2 = (await admin('/api/chapters/klr-01-pack')).data.chapter;
  assert.equal(v2.title, 'Pack v2');
  assert.equal(v2.blocks[0].text, 'second');
  assert.equal(v2.lang, 'en');
  assert.equal(v2.rev, v1.rev + 1);
  assert.notEqual(v2.blocks[1].src, v1.blocks[1].src, 'changed figure gets a new URL (long browser cache)');
  assert.ok(exists(path.join(dataDir, v2.blocks[1].src)));
  assert.equal(exists(path.join(dataDir, v1.blocks[1].src)), false, 'old figure removed');
  assert.match(srv.log(), /aktualisiert: klr-01-pack/);

  // Same version again: nothing happens.
  await srv.stop();
  srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  admin = await srv.login('admin');
  assert.equal((await admin('/api/chapters/klr-01-pack')).data.chapter.rev, v2.rev);
});

test('a chapter edited in the app is never overwritten: the new version arrives as a draft', async () => {
  const dataDir = await tempDir();
  const { content, write } = await tempPack();
  await write(1, 'first', 'one');
  let srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  let admin = await srv.login('admin');
  const other = (await admin('/api/chapters', { method: 'POST', json: { subjectId: 'kosten-leistungsrechnung', title: 'Later' } })).data.chapter;
  await admin('/api/chapters/klr-01-pack', { method: 'PATCH', json: { blocks: [{ type: 'text', text: 'my own edit' }] } });
  await srv.stop();

  await write(3, 'third', 'three');
  srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  admin = await srv.login('admin');
  assert.equal((await admin('/api/chapters/klr-01-pack')).data.chapter.blocks[0].text, 'my own edit');
  const draft = (await admin('/api/chapters/klr-01-pack-v3')).data.chapter;
  assert.equal(draft.status, 'draft');
  assert.equal(draft.blocks[0].text, 'third');
  assert.match(draft.blocks[1].src, /^chapters\/klr-01-pack-v3\//);
  const order = (await admin('/api/subjects/kosten-leistungsrechnung')).data.chapters.map((c) => c.id);
  assert.deepEqual(order, ['klr-01-pack', 'klr-01-pack-v3', other.id]);
});

test('a new version of a deleted chapter does not bring it back', async () => {
  const dataDir = await tempDir();
  const { content, write } = await tempPack();
  await write(1, 'first', 'one');
  let srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  let admin = await srv.login('admin');
  await admin('/api/chapters/klr-01-pack', { method: 'DELETE' });
  await srv.stop();

  await write(2, 'second', 'two');
  srv = await start({ dataDir, env: { CONTENT_DIR: content } });
  admin = await srv.login('admin');
  assert.equal((await admin('/api/chapters/klr-01-pack')).status, 404);
  assert.equal((await admin('/api/subjects/kosten-leistungsrechnung')).data.chapters.length, 0);
  const db = await readJSON(path.join(dataDir, 'db.json'));
  assert.equal(db.contentImported[0].version, 2);
});
