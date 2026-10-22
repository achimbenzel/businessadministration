// Chapters: drafts vs. published, block cleaning, conflicts, trash, search, flashcards.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';

const SUBJECT = 'kosten-leistungsrechnung';
let srv; let admin; let viewer;
before(async () => {
  srv = await startServer();
  admin = await srv.login('admin');
  viewer = await srv.login('user');
});
after(async () => { await srv?.stop(); });

const create = async (title = 'Kapitel', subjectId = SUBJECT) => (await admin('/api/chapters', { method: 'POST', json: { subjectId, title } })).data.chapter;
const patch = (id, json) => admin(`/api/chapters/${id}`, { method: 'PATCH', json });

test('a new chapter is a draft: admins see it, viewers do not', async () => {
  const c = await create('Grundbegriffe');
  assert.equal(c.status, 'draft');
  assert.equal(c.rev, 1);
  assert.equal(c.blocks.length, 1); // starts with an empty text block
  assert.equal((await viewer(`/api/chapters/${c.id}`)).status, 404);
  assert.equal((await viewer(`/api/subjects/${SUBJECT}`)).data.chapters.length, 0);
  assert.equal((await admin(`/api/subjects/${SUBJECT}`)).data.chapters.length, 1);

  await patch(c.id, { status: 'published' });
  assert.equal((await viewer(`/api/chapters/${c.id}`)).status, 200);
  const sem = (await viewer('/api/semesters')).data.semesters[0].subjects.find((s) => s.id === SUBJECT);
  assert.equal(sem.chapterCount, 1);
  assert.deepEqual(sem.chapterIds, [c.id]);
});

test('blocks are cleaned: unknown types, bad links and foreign files are dropped', async () => {
  const c = await create('Bausteine');
  const res = await patch(c.id, {
    blocks: [
      { type: 'text', text: 'Hallo' },
      { type: 'script', text: '<script>alert(1)</script>' },
      { type: 'heading', text: 'Titel\nmit Umbruch', level: 7 },
      { type: 'links', items: [{ url: 'javascript:alert(1)', title: 'böse' }, { url: 'hs-mainz.de', title: 'HS' }, { url: 'mailto:a@b.de' }] },
      { type: 'image', src: '../../db.json' },
      { type: 'image', src: `chapters/other-chapter/x.png` },
      { type: 'files', items: [{ src: `chapters/${c.id}/abc-skript.pdf`, name: 'Skript.pdf', size: 1234 }, { src: '/etc/passwd' }] },
      { type: 'quiz', question: 'Q?', options: [{ text: 'a', correct: 'yes' }, { text: 'b', correct: true }] },
      { type: 'table', rows: [['a', 'b', 'c'], ['d']] },
      { id: 'dup', type: 'divider' }, { id: 'dup', type: 'divider' },
      null, 'text',
    ],
  });
  assert.equal(res.status, 200);
  const b = res.data.chapter.blocks;
  assert.deepEqual(b.map((x) => x.type), ['text', 'heading', 'links', 'image', 'image', 'files', 'quiz', 'table', 'divider', 'divider']);
  assert.equal(b[1].text, 'Titel mit Umbruch');
  assert.equal(b[1].level, 2);
  assert.deepEqual(b[2].items.map((l) => l.url), ['', 'https://hs-mainz.de', 'mailto:a@b.de']);
  assert.equal(b[3].src, '');
  assert.equal(b[4].src, '');
  assert.deepEqual(b[5].items.map((f) => f.name), ['Skript.pdf']);
  assert.deepEqual(b[6].options.map((o) => o.correct), [false, true]);
  assert.deepEqual(b[7].rows, [['a', 'b', 'c'], ['d', '', '']]);
  assert.notEqual(b[8].id, b[9].id);
});

test('an edit based on an old revision is refused with 409', async () => {
  const c = await create('Konflikt');
  const first = await patch(c.id, { title: 'Tab A', baseRev: c.rev });
  assert.equal(first.status, 200);
  assert.equal(first.data.chapter.rev, c.rev + 1);
  const stale = await patch(c.id, { title: 'Tab B', baseRev: c.rev });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.error, 'conflict');
  assert.equal((await admin(`/api/chapters/${c.id}`)).data.chapter.title, 'Tab A');
});

test('delete → trash → restore (Undo) and purge', async () => {
  const c = await create('Wegwerfen');
  const del = await admin(`/api/chapters/${c.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  assert.equal((await admin(`/api/chapters/${c.id}`)).status, 404);
  const trash = (await admin('/api/trash')).data.items;
  const entry = trash.find((t) => t.id === del.data.trashId);
  assert.equal(entry.title, 'Wegwerfen');
  assert.ok(entry.purgeAt > entry.deletedAt);

  assert.equal((await admin(`/api/trash/${entry.id}/restore`, { method: 'POST' })).status, 200);
  assert.equal((await admin(`/api/chapters/${c.id}`)).status, 200);
  assert.equal((await admin(`/api/trash/${entry.id}/restore`, { method: 'POST' })).status, 404);

  const del2 = await admin(`/api/chapters/${c.id}`, { method: 'DELETE' });
  assert.equal((await admin(`/api/trash/${del2.data.trashId}`, { method: 'DELETE' })).status, 200);
  assert.equal((await admin('/api/trash')).data.items.some((t) => t.id === del2.data.trashId), false);
});

test('chapter order and neighbours', async () => {
  const subjectId = 'rechtliche-rahmenbedingungen';
  const a = await create('A', subjectId);
  const b = await create('B', subjectId);
  const c = await create('C', subjectId);
  await admin(`/api/subjects/${subjectId}/order`, { method: 'POST', json: { ids: [c.id, a.id, b.id] } });
  const list = (await admin(`/api/subjects/${subjectId}`)).data.chapters.map((x) => x.title);
  assert.deepEqual(list, ['C', 'A', 'B']);
  const mid = (await admin(`/api/chapters/${a.id}`)).data;
  assert.equal(mid.prev.title, 'C');
  assert.equal(mid.next.title, 'B');
  assert.equal(mid.position, 2);
  assert.equal(mid.total, 3);
});

test('search: titles and block text, accent-insensitive, drafts only for admins', async () => {
  const c = await create('Abgrenzungsrechnung');
  await patch(c.id, { blocks: [{ type: 'definition', term: 'Neutraler Aufwand', text: 'Betriebsfremder, außerordentlicher oder periodenfremder Aufwand.' }] });
  const hit = (await admin('/api/search?q=AUSSERORDENTLICH')).data.results.find((r) => r.id === c.id);
  assert.ok(hit, 'found through the block text (ß = ss, case-insensitive)');
  assert.match(hit.snippet, /außerordentlicher/);
  assert.equal(hit.blockId, (await admin(`/api/chapters/${c.id}`)).data.chapter.blocks[0].id);
  assert.equal((await viewer('/api/search?q=Abgrenzungsrechnung')).data.results.length, 0); // still a draft
  await patch(c.id, { status: 'published' });
  assert.equal((await viewer('/api/search?q=abgrenzung')).data.results[0].id, c.id);
  assert.ok((await viewer('/api/search?q=uberblick')).status === 200);
  assert.deepEqual((await viewer('/api/search?q=a')).data.results, []);
  // Subjects are found too.
  assert.ok((await viewer('/api/search?q=Leistungsrechnung')).data.results.some((r) => r.kind === 'subject'));
});

test('flashcards of a subject (published chapters, non-empty cards)', async () => {
  const subjectId = 'grundlagen-bwl';
  const c = await create('Karten', subjectId);
  await patch(c.id, {
    status: 'published',
    blocks: [
      { type: 'flashcard', front: 'Was ist BWL?', back: 'Betriebswirtschaftslehre' },
      { type: 'flashcard', front: '', back: '' },
      { type: 'text', text: 'x' },
    ],
  });
  const { data } = await viewer(`/api/subjects/${subjectId}/cards`);
  assert.equal(data.cards.length, 1);
  assert.equal(data.cards[0].chapterTitle, 'Karten');
  assert.equal((await viewer(`/api/subjects/${subjectId}`)).data.chapters[0].cards, 2);
});

test('moving a chapter to another subject', async () => {
  const c = await create('Umzug');
  assert.equal((await patch(c.id, { subjectId: 'nope' })).status, 400);
  const res = await patch(c.id, { subjectId: 'grundlagen-bwl' });
  assert.equal(res.data.chapter.subjectId, 'grundlagen-bwl');
});

test('recent chapters for the start page', async () => {
  const { data } = await viewer('/api/chapters?recent=3');
  assert.ok(data.chapters.length <= 3);
  assert.ok(data.chapters.every((c) => c.status === 'published' && c.subject));
});
