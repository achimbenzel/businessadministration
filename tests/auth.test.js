// Login, roles and the request guards.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startServer, spawnServer, tempDir, freePort, PASSWORDS } from './helpers.js';

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv?.stop(); });

test('the API needs a session; health and /me do not', async () => {
  assert.equal((await srv.api('/api/health')).status, 200);
  assert.deepEqual((await srv.api('/api/auth/me')).data, { user: null });
  for (const p of ['/api/semesters', '/api/subjects/kosten-leistungsrechnung', '/api/search?q=kosten', '/api/trash']) {
    assert.equal((await srv.api(p)).status, 401, p);
  }
});

test('login as User and Admin with the passwords from the environment', async () => {
  const res = await srv.api('/api/auth/login', { method: 'POST', json: { username: 'User', password: PASSWORDS.user } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data.user, { username: 'User', role: 'viewer' });
  const cookie = res.headers.get('set-cookie');
  assert.match(cookie, /^ba_session=v1\./);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);

  // Username is case-insensitive.
  const admin = await srv.api('/api/auth/login', { method: 'POST', json: { username: ' admin ', password: PASSWORDS.admin } });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, 'admin');

  const me = await srv.api('/api/auth/me', { cookie: admin.headers.get('set-cookie').split(';')[0] });
  assert.deepEqual(me.data.user, { username: 'Admin', role: 'admin' });
});

test('wrong password, wrong user, swapped passwords are refused', async () => {
  const cases = [
    { username: 'User', password: 'nope' },
    { username: 'Admin', password: PASSWORDS.user },  // the viewer's password doesn't open the admin account
    { username: 'Root', password: PASSWORDS.admin },
    { username: 'User', password: '' },
    { username: 'User' },
  ];
  for (const c of cases) {
    const res = await srv.api('/api/auth/login', { method: 'POST', json: c });
    assert.equal(res.status, 401, JSON.stringify(c));
    assert.equal(res.data.error, 'invalid_credentials');
    assert.equal(res.headers.get('set-cookie'), null);
  }
});

test('a tampered or foreign session cookie is rejected', async () => {
  const api = await srv.login('user');
  const [, payload, sig] = api.cookie.split('=')[1].split('.');
  const forged = JSON.parse(Buffer.from(payload, 'base64url').toString());
  forged.r = 'admin';
  const forgedCookie = `ba_session=v1.${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${sig}`;
  assert.equal((await srv.api('/api/semesters', { cookie: forgedCookie })).status, 401);
  assert.equal((await srv.api('/api/semesters', { cookie: 'ba_session=garbage' })).status, 401);
  assert.equal((await api('/api/semesters')).status, 200);
});

test('viewers may read but not write', async () => {
  const viewer = await srv.login('user');
  const writes = [
    ['/api/semesters', 'POST', { number: 2 }],
    ['/api/subjects', 'POST', { semesterId: 'semester-1', title: 'X' }],
    ['/api/subjects/kosten-leistungsrechnung', 'PATCH', { title: 'X' }],
    ['/api/chapters', 'POST', { subjectId: 'kosten-leistungsrechnung', title: 'X' }],
    ['/api/trash', 'GET'],
  ];
  for (const [p, method, json] of writes) {
    const res = await viewer(p, { method, json });
    assert.equal(res.status, 403, `${method} ${p}`);
  }
});

test('writes need the CSRF header', async () => {
  const admin = await srv.login('admin');
  const res = await admin('/api/chapters', { method: 'POST', json: { subjectId: 'kosten-leistungsrechnung', title: 'X' }, csrf: false });
  assert.equal(res.status, 403);
  assert.equal(res.data.error, 'csrf');
  const login = await srv.api('/api/auth/login', { method: 'POST', json: { username: 'Admin', password: PASSWORDS.admin }, csrf: false });
  assert.equal(login.status, 403);
});

test('logout clears the cookie', async () => {
  const res = await srv.api('/api/auth/logout', { method: 'POST' });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('set-cookie'), /ba_session=;.*Max-Age=0/);
});

test('foreign Host headers are refused (DNS rebinding)', async () => {
  const status = (host) => new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: srv.port, path: '/api/health', headers: { Host: host } }, (res) => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
  assert.equal(await status('evil.example.com'), 403);
  assert.equal(await status('localhost:4300'), 200);
  assert.equal(await status('laptop.tail1234.ts.net'), 200);
});

test('too many failed logins from one IP → 429', async () => {
  const s = await startServer();
  try {
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await s.api('/api/auth/login', { method: 'POST', json: { username: 'Admin', password: 'x' } })).status, 401);
    }
    const blocked = await s.api('/api/auth/login', { method: 'POST', json: { username: 'Admin', password: PASSWORDS.admin } });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  } finally { await s.stop(); }
});

test('changing a password signs everybody out', async () => {
  const dataDir = await tempDir();
  const a = await startServer({ dataDir });
  const api = await a.login('user');
  await a.stop();
  const b = await startServer({ dataDir, env: { USER_PASSWORD: 'another-password' } });
  try {
    assert.equal((await b.api('/api/semesters', { cookie: api.cookie })).status, 401);
  } finally { await b.stop(); }
});

test('the server refuses to start without passwords', async () => {
  const dataDir = await tempDir();
  const srv2 = await spawnServer({ dataDir, port: await freePort(), env: { ADMIN_PASSWORD: '' } });
  const code = await srv2.exited;
  assert.equal(code, 1);
  assert.match(srv2.log(), /ADMIN_PASSWORD is not set/);
});

test('a port that is already taken gives a clear message', async () => {
  const srv = await startServer();
  const dataDir = await tempDir();
  const second = await spawnServer({ dataDir, port: srv.port });
  assert.equal(await second.exited, 1);
  assert.match(second.log(), /Port \d+ ist schon belegt/);
  await srv.stop();
});
