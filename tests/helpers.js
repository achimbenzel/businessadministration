// Test helpers: spawn the real server against a throwaway data folder so the
// tests exercise exactly what `npm start` runs, without touching data/ or .env.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PASSWORDS = { user: 'viewer-pass-123', admin: 'admin-pass-456' };

// Throwaway folders are removed when the test process exits.
const created = [];
process.on('exit', () => { for (const d of created) fs.rmSync(d, { recursive: true, force: true }); });
export async function tempDir(prefix = 'ba-test-') {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  created.push(dir);
  return dir;
}

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}

/** Spawn server/index.js; resolves with { child, exited, log } once it listens (or exits). */
export async function spawnServer({ dataDir, env = {}, port }) {
  const child = spawn(process.execPath, [path.join(ROOT, 'server/index.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      DATA_DIR: dataDir,
      NODE_ENV: 'test',
      ENV_FILE: path.join(dataDir, 'no-such.env'), // never read the developer's .env
      CONTENT_DIR: 'off',                           // tests start without content packs
      USER_PASSWORD: PASSWORDS.user,
      ADMIN_PASSWORD: PASSWORDS.admin,
      SESSION_SECRET: 'test-secret',
      COOKIE_SECURE: 'false',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  return { child, exited, log: () => log };
}

/**
 * Start the server on a free port. Returns { base, dataDir, api, login, stop, log }.
 * `api(path, { method, json, body, headers, cookie })` sends the CSRF header the
 * frontend sends and parses JSON. `login(role)` returns an api bound to a session.
 */
export async function startServer({ dataDir, env = {} } = {}) {
  const dir = dataDir || await tempDir();
  const port = await freePort();
  const srv = await spawnServer({ dataDir: dir, env, port });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; ; i += 1) {
    try { const r = await fetch(`${base}/api/health`); if (r.ok) break; } catch { /* not up yet */ }
    if (srv.child.exitCode != null) throw new Error(`server exited early:\n${srv.log()}`);
    if (i > 100) throw new Error(`server did not start:\n${srv.log()}`);
    await new Promise((r) => setTimeout(r, 100));
  }

  const api = async (p, { method = 'GET', json, body, headers = {}, cookie, csrf = true } = {}) => {
    const h = { ...headers };
    if (csrf) h['X-Requested-With'] = 'test';
    if (cookie) h.Cookie = cookie;
    let payload = body;
    if (json !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(json); }
    const res = await fetch(`${base}${p}`, { method, headers: h, body: payload, redirect: 'manual' });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data, headers: res.headers, text };
  };

  const login = async (role = 'admin') => {
    const username = role === 'admin' ? 'Admin' : 'User';
    const res = await api('/api/auth/login', { method: 'POST', json: { username, password: PASSWORDS[role === 'admin' ? 'admin' : 'user'] } });
    if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.data)}`);
    const cookie = res.headers.get('set-cookie').split(';')[0];
    const bound = (p, opts = {}) => api(p, { ...opts, cookie });
    bound.cookie = cookie;
    return bound;
  };

  const stop = async () => {
    if (srv.child.exitCode == null) { srv.child.kill('SIGTERM'); await srv.exited; }
  };
  return { base, port, dataDir: dir, api, login, stop, log: srv.log };
}

export const readJSON = async (p) => JSON.parse(await fsp.readFile(p, 'utf8'));
export const exists = (p) => fs.existsSync(p);
