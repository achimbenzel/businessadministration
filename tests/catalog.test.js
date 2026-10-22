// Semesters and subjects: the first-run content and the admin's changes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { startServer, readJSON } from './helpers.js';

let srv; let admin; let viewer;
before(async () => {
  srv = await startServer();
  admin = await srv.login('admin');
  viewer = await srv.login('user');
});
after(async () => { await srv?.stop(); });

test('first start: semester 1 with its five subjects', async () => {
  const { data } = await viewer('/api/semesters');
  assert.equal(data.semesters.length, 1);
  const [sem] = data.semesters;
  assert.equal(sem.title, '1. Semester');
  assert.deepEqual(sem.subjects.map((s) => s.title), [
    'Personalmanagement & Organisation',
    'Economical Framework for Entrepreneurial Decisions',
    'Grundlagen der BWL (mit Accounting und Planspiel)',
    'Rechtliche Rahmenbedingungen unternehmerischer Entscheidungen',
    'Kosten- & Leistungsrechnung',
  ]);
  for (const s of sem.subjects) {
    assert.equal(s.chapterCount, 0);
    assert.ok(s.short && s.icon && s.color);
  }
  const db = await readJSON(path.join(srv.dataDir, 'db.json'));
  assert.equal(db.schemaVersion, 1);
});

test('the seed never runs over an existing database', async () => {
  await admin('/api/subjects/personalmanagement-organisation', { method: 'PATCH', json: { description: 'Eigene Beschreibung' } });
  await srv.stop();
  srv = await startServer({ dataDir: srv.dataDir });
  admin = await srv.login('admin');
  viewer = await srv.login('user');
  const { data } = await viewer('/api/subjects/personalmanagement-organisation');
  assert.equal(data.subject.description, 'Eigene Beschreibung');
});

test('admin edits a subject; input is cleaned', async () => {
  const res = await admin('/api/subjects/kosten-leistungsrechnung', {
    method: 'PATCH',
    json: { title: '  KLR\nneu  ', ects: '7.5', icon: 'NOT AN ICON!', color: 'violet', short: 'KLR-LONGER-THAN-TWELVE', id: 'hijack' },
  });
  assert.equal(res.status, 200);
  const s = res.data.subject;
  assert.equal(s.id, 'kosten-leistungsrechnung');
  assert.equal(s.title, 'KLR neu');
  assert.equal(s.ects, 7.5);
  assert.equal(s.icon, 'book');      // unknown → default
  assert.equal(s.color, 'violet');
  assert.equal(s.short.length, 12);
});

test('semesters and subjects: create, reorder, delete only when empty', async () => {
  const sem = (await admin('/api/semesters', { method: 'POST', json: { title: '' } })).data.semester;
  assert.equal(sem.number, 2);
  assert.equal(sem.title, '2. Semester');

  const a = (await admin('/api/subjects', { method: 'POST', json: { semesterId: sem.id, title: 'Controlling', short: 'CTRL' } })).data.subject;
  const b = (await admin('/api/subjects', { method: 'POST', json: { semesterId: sem.id, title: 'Marketing' } })).data.subject;
  assert.deepEqual([a.order, b.order], [0, 1]);
  assert.equal((await admin('/api/subjects', { method: 'POST', json: { semesterId: 'nope', title: 'X' } })).status, 400);

  assert.equal((await admin(`/api/semesters/${sem.id}/order`, { method: 'POST', json: { ids: [b.id, a.id] } })).status, 200);
  const list = (await viewer('/api/semesters')).data.semesters.find((s) => s.id === sem.id);
  assert.deepEqual(list.subjects.map((s) => s.title), ['Marketing', 'Controlling']);

  assert.equal((await admin(`/api/semesters/${sem.id}`, { method: 'DELETE' })).status, 409);
  const ch = (await admin('/api/chapters', { method: 'POST', json: { subjectId: a.id, title: 'K1' } })).data.chapter;
  assert.equal((await admin(`/api/subjects/${a.id}`, { method: 'DELETE' })).status, 409);
  await admin(`/api/chapters/${ch.id}`, { method: 'DELETE' });
  assert.equal((await admin(`/api/subjects/${a.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await admin(`/api/subjects/${b.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await admin(`/api/semesters/${sem.id}`, { method: 'DELETE' })).status, 200);
});

test('unknown ids → 404 as JSON', async () => {
  const res = await viewer('/api/subjects/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.data.error, 'not_found');
  assert.equal((await viewer('/api/nope')).status, 404);
});
