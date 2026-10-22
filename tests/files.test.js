// Uploads and the protected /data file server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { startServer, exists } from './helpers.js';

let srv; let admin; let viewer; let chapter;
before(async () => {
  srv = await startServer({ env: { MAX_UPLOAD_MB: '1' } });
  admin = await srv.login('admin');
  viewer = await srv.login('user');
  chapter = (await admin('/api/chapters', { method: 'POST', json: { subjectId: 'kosten-leistungsrechnung', title: 'Dateien' } })).data.chapter;
});
after(async () => { await srv?.stop(); });

const upload = (api, id, name, content, type = 'application/pdf') => {
  const fd = new FormData();
  fd.append('file', new Blob([content], { type }), name);
  return api(`/api/chapters/${id}/files`, { method: 'POST', body: fd });
};

test('admin uploads a file into the chapter folder (name cleaned)', async () => {
  const res = await upload(admin, chapter.id, '../Übung 1 (Lösung).pdf', '%PDF-1.4 test');
  assert.equal(res.status, 201);
  const f = res.data.file;
  assert.match(f.src, new RegExp(`^chapters/${chapter.id}/[\\w-]{8}-Ubung-1-Losung-\\.pdf$`));
  assert.equal(f.size, 13);
  assert.ok(exists(path.join(srv.dataDir, f.src)));
  // Referencing it from a block sticks.
  const saved = await admin(`/api/chapters/${chapter.id}`, { method: 'PATCH', json: { blocks: [{ type: 'files', items: [f] }] } });
  assert.equal(saved.data.chapter.blocks[0].items[0].src, f.src);
});

test('files: signed-in only, and drafts only for admins', async () => {
  const f = (await upload(admin, chapter.id, 'bild.png', 'png-bytes', 'image/png')).data.file;
  const url = `/data/${f.src}`;
  assert.equal((await srv.api(url)).status, 401);
  assert.equal((await admin(url)).status, 200);
  assert.equal((await viewer(url)).status, 404); // chapter is a draft
  await admin(`/api/chapters/${chapter.id}`, { method: 'PATCH', json: { status: 'published' } });
  const ok = await viewer(url);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('x-content-type-options'), 'nosniff');
  assert.match(ok.headers.get('cache-control'), /private/);
});

test('active file types are sandboxed or downloaded', async () => {
  const svg = (await upload(admin, chapter.id, 'x.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'image/svg+xml')).data.file;
  const res = await admin(`/data/${svg.src}`);
  assert.equal(res.headers.get('content-security-policy'), 'sandbox');
  assert.equal(res.headers.get('content-disposition'), 'attachment');
});

test('nothing outside the chapter folders is served', async () => {
  for (const p of ['/data/db.json', '/data/backups/x.json', '/data/chapters/../db.json', '/data/chapters/%2e%2e/db.json', `/data/chapters/${chapter.id}`]) {
    const res = await admin(p);
    assert.ok([400, 404].includes(res.status), `${p} → ${res.status}`);
  }
});

test('viewers cannot upload; size limit applies', async () => {
  assert.equal((await upload(viewer, chapter.id, 'a.pdf', 'x')).status, 403);
  const big = await upload(admin, chapter.id, 'big.pdf', 'x'.repeat(1024 * 1024 + 10));
  assert.equal(big.status, 413);
  assert.match(big.data.message, /max\. 1 MB/);
  assert.equal((await upload(admin, 'no-such-chapter', 'a.pdf', 'x')).status, 404);
});

test('purging a chapter from the trash deletes its files', async () => {
  const c = (await admin('/api/chapters', { method: 'POST', json: { subjectId: 'kosten-leistungsrechnung', title: 'Weg' } })).data.chapter;
  const f = (await upload(admin, c.id, 'a.pdf', 'x')).data.file;
  const { trashId } = (await admin(`/api/chapters/${c.id}`, { method: 'DELETE' })).data;
  assert.ok(exists(path.join(srv.dataDir, f.src)), 'files stay while in the trash');
  await admin(`/api/trash/${trashId}`, { method: 'DELETE' });
  assert.equal(exists(path.join(srv.dataDir, 'chapters', c.id)), false);
});
