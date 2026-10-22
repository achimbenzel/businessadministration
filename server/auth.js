/**
 * Login for two fixed accounts — "User" (viewer, read-only) and "Admin"
 * (may edit content). Their passwords come from .env (USER_PASSWORD,
 * ADMIN_PASSWORD); there is no user table.
 *
 * A session is a signed, HttpOnly cookie (no server-side session store):
 *   v1.<base64url payload>.<base64url HMAC-SHA256>
 * The signing key is derived from SESSION_SECRET *and* both passwords, so
 * changing a password in .env signs everybody out.
 */
import crypto from 'node:crypto';
import { createRouter, HttpError } from './http.js';

export const COOKIE = 'ba_session';
const MAX_FAILS = 10;                   // failed logins per IP …
const FAIL_WINDOW_MS = 15 * 60 * 1000;  // … within this window, then 429

export const ROLES = ['viewer', 'admin'];

/** The two accounts, read from the environment each time (tests change it). */
export function accounts() {
  return [
    { username: 'User', role: 'viewer', password: process.env.USER_PASSWORD || '' },
    { username: 'Admin', role: 'admin', password: process.env.ADMIN_PASSWORD || '' },
  ];
}

/** Problems with the configured passwords — index.js refuses to start on errors. */
export function checkAuthConfig() {
  const errors = [];
  const warnings = [];
  for (const a of accounts()) {
    const name = a.role === 'admin' ? 'ADMIN_PASSWORD' : 'USER_PASSWORD';
    if (!a.password) errors.push(`${name} is not set.`);
    else if (a.password.length < 8) warnings.push(`${name} is shorter than 8 characters.`);
  }
  const [u, ad] = accounts();
  if (u.password && u.password === ad.password) warnings.push('USER_PASSWORD and ADMIN_PASSWORD are the same.');
  if (!process.env.SESSION_SECRET) warnings.push('SESSION_SECRET is empty — every restart signs everybody out.');
  return { errors, warnings };
}

// Without SESSION_SECRET a random one per process: safe, but sessions end on restart.
const processSecret = crypto.randomBytes(32).toString('hex');
function signingKey() {
  const [u, a] = accounts();
  return crypto.createHash('sha256')
    .update(`${process.env.SESSION_SECRET || processSecret}\0${u.password}\0${a.password}`)
    .digest();
}
const b64 = (buf) => Buffer.from(buf).toString('base64url');
const hmac = (data) => crypto.createHmac('sha256', signingKey()).update(data).digest();

export function sessionDays() {
  const d = Number(process.env.SESSION_DAYS);
  return Number.isFinite(d) && d > 0 ? Math.min(d, 365) : 30;
}

export function createToken({ username, role }, now = Date.now()) {
  const payload = b64(JSON.stringify({ u: username, r: role, iat: now, exp: now + sessionDays() * 86400000 }));
  return `v1.${payload}.${b64(hmac(`v1.${payload}`))}`;
}

/** The session in a token, or null if it's forged, tampered with or expired. */
export function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1000) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const expected = hmac(`v1.${parts[1]}`);
  let given;
  try { given = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
  if (!data || !ROLES.includes(data.r) || typeof data.exp !== 'number' || data.exp <= now) return null;
  const account = accounts().find((a) => a.role === data.r);
  if (!account?.password) return null; // account switched off since
  return { username: account.username, role: data.r, exp: data.exp };
}

// Constant-time comparison (hashing first makes the lengths equal).
function samePassword(given, expected) {
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function findAccount(username, password) {
  const name = String(username || '').trim().toLowerCase();
  const account = accounts().find((a) => a.username.toLowerCase() === name);
  // Compare even for unknown names so timing doesn't reveal which names exist.
  const ok = samePassword(password, account?.password || '\0never');
  return ok && account ? { username: account.username, role: account.role } : null;
}

// ---- Cookies -----------------------------------------------------------------
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
}

// COOKIE_SECURE: "true" / "false" / "auto" (default — Secure whenever the
// request came over HTTPS, also behind a trusted reverse proxy).
function secureFor(req) {
  const v = String(process.env.COOKIE_SECURE || 'auto').toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return Boolean(req.secure);
}

function setSessionCookie(req, res, token, maxAgeSec) {
  const attrs = [`${COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (secureFor(req)) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

// ---- Middleware ----------------------------------------------------------------
/** Attaches req.user (or null) from the session cookie. */
export function sessionMiddleware(req, _res, next) {
  req.user = verifyToken(readCookie(req, COOKIE));
  next();
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: 'unauthorized', message: 'Bitte melde dich an.' });
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized', message: 'Bitte melde dich an.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden', message: 'Nur für Admins.' });
  next();
}

export const isAdmin = (req) => req.user?.role === 'admin';

// ---- Brute-force brake ---------------------------------------------------------
const fails = new Map(); // ip → { count, first }
function failState(ip, now = Date.now()) {
  const s = fails.get(ip);
  if (s && now - s.first > FAIL_WINDOW_MS) { fails.delete(ip); return null; }
  return s || null;
}
function noteFail(ip, now = Date.now()) {
  if (fails.size > 5000) { // don't let a flood of IPs grow the map forever
    for (const [k, s] of fails) if (now - s.first > FAIL_WINDOW_MS) fails.delete(k);
  }
  const s = failState(ip, now);
  if (s) s.count += 1; else fails.set(ip, { count: 1, first: now });
}

// ---- Routes ----------------------------------------------------------------------
const publicUser = (u) => (u ? { username: u.username, role: u.role } : null);

export function authRouter() {
  const r = createRouter();

  r.post('/api/auth/login', (req, res) => {
    const ip = req.ip || 'unknown';
    const state = failState(ip);
    if (state && state.count >= MAX_FAILS) {
      const wait = Math.ceil((state.first + FAIL_WINDOW_MS - Date.now()) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, wait)));
      throw new HttpError(429, 'too_many_attempts', 'Zu viele Fehlversuche. Bitte warte ein paar Minuten.');
    }
    const { username, password } = req.body || {};
    const user = typeof password === 'string' && password.length <= 500 ? findAccount(username, password) : null;
    if (!user) {
      noteFail(ip);
      throw new HttpError(401, 'invalid_credentials', 'Benutzername oder Passwort ist falsch.');
    }
    fails.delete(ip);
    setSessionCookie(req, res, createToken(user), sessionDays() * 86400);
    res.json({ user: publicUser(user) });
  });

  r.post('/api/auth/logout', (req, res) => {
    setSessionCookie(req, res, '', 0);
    res.json({ ok: true });
  });

  // 200 with user: null when signed out — the app asks this on every start,
  // and that's an expected answer, not an error.
  r.get('/api/auth/me', (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  return r;
}
