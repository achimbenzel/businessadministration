/**
 * HTTP plumbing: async-safe routers, the JSON error handler and the request
 * guards (host allowlist, CSRF header, security headers, /data access).
 */
import net from 'node:net';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { ALLOWED_HOSTS, ENTITY_ROOTS, MAX_UPLOAD_MB, IS_PROD } from './config.js';

// ---- Async routes ------------------------------------------------------------
// Express 4 doesn't catch a rejected promise from an async handler: the request
// would hang and Node treats it as an unhandled rejection. Forward those errors
// to the error handler instead.
export function asyncRoute(fn) {
  if (typeof fn !== 'function' || fn.length >= 4) return fn; // error middleware as-is
  return function wrapped(req, res, next) {
    try {
      const out = fn(req, res, next);
      if (out && typeof out.catch === 'function') out.catch(next);
    } catch (err) { next(err); }
  };
}

// An express.Router whose route handlers are all wrapped with asyncRoute.
export function createRouter() {
  const router = express.Router();
  for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
    const orig = router[m].bind(router);
    router[m] = (p, ...handlers) => orig(p, ...handlers.map(asyncRoute));
  }
  return router;
}

// Throw from a handler to answer with a specific status + error code.
export class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

// Last middleware: every error becomes a JSON answer the frontend can show —
// never a stack trace.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = Number(err.status || err.statusCode) || 500;
  let code = typeof err.code === 'string' ? err.code : 'server_error';
  let message = String(err.message || err);

  if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code.toLowerCase();
    if (err.code === 'LIMIT_FILE_SIZE') message = `Die Datei ist zu groß (max. ${MAX_UPLOAD_MB} MB).`;
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'payload_too_large'; message = 'Diese Änderung ist zu groß, um sie auf einmal zu speichern.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'invalid_json'; message = 'Ungültige Anfrage.';
  } else if (err.code === 'ENOSPC') {
    status = 507; code = 'disk_full'; message = 'Der Speicher ist voll.';
  }
  if (status >= 500) {
    console.error(`  ${req.method} ${req.originalUrl} failed:`, err);
    if (code === 'server_error' || /^E[A-Z]+$/.test(code)) { code = 'server_error'; message = 'Etwas ist schiefgelaufen.'; }
  } else if (/^E[A-Z]+$/.test(code)) {
    // e.g. a missing file from express.static: don't surface raw errno codes.
    code = status === 404 ? 'not_found' : 'bad_request';
    message = status === 404 ? 'Nicht gefunden.' : 'Ungültige Anfrage.';
  }
  if (res.headersSent) { res.destroy(err); return; }
  res.status(status).json({ error: code, message });
}

// ---- Guards ------------------------------------------------------------------
// Host allowlist — defeats DNS rebinding (a web page that re-points its own
// domain at your machine to talk to the API as "same origin"). IP addresses,
// localhost, single-label names (Tailscale short names), *.ts.net and typical
// LAN suffixes are allowed; your own domain comes in through ALLOWED_HOSTS.
const LAN_SUFFIXES = ['.localhost', '.ts.net', '.local', '.lan', '.home.arpa', '.fritz.box', '.internal'];
export function isAllowedHost(hostHeader) {
  if (ALLOWED_HOSTS.includes('*') || !hostHeader) return true;
  let host = String(hostHeader).trim().toLowerCase();
  if (host.startsWith('[')) host = host.slice(1, host.indexOf(']') === -1 ? undefined : host.indexOf(']'));
  else host = host.replace(/:\d+$/, '');
  host = host.replace(/\.$/, '');
  if (host === 'localhost' || net.isIP(host)) return true;
  if (!host.includes('.')) return true;
  if (LAN_SUFFIXES.some((s) => host.endsWith(s))) return true;
  return ALLOWED_HOSTS.some((a) => host === a || (a.startsWith('.') && host.endsWith(a)));
}
export function hostGuard(req, res, next) {
  if (isAllowedHost(req.headers.host)) return next();
  res.status(403).type('text/plain').send(
    `Host "${req.headers.host}" is not allowed.\n`
    + 'If you reach the app through your own domain, set ALLOWED_HOSTS=<that domain> in .env.\n',
  );
}

// CSRF guard — every state-changing API call must carry a custom header. A
// browser only lets another site send custom headers after a CORS preflight,
// which this server never approves. Together with the SameSite cookie this
// keeps other web pages from acting with a signed-in user's session.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-requested-with';
export function csrfGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method) || req.get(CSRF_HEADER)) return next();
  res.status(403).json({ error: 'csrf', message: `Missing ${CSRF_HEADER} header.` });
}

// Headers for every response. The CSP only applies to the built app: in dev,
// Vite serves the page (with its inline HMR scripts) and this server only
// answers /api and /data.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'", // React style={…} attributes
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');
export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (IS_PROD) res.setHeader('Content-Security-Policy', CSP);
  next();
}

// Only entity folders are served from /data — never db.json, backups/ or tmp/.
const DATA_PUBLIC = new Set(ENTITY_ROOTS);
export function dataGuard(req, res, next) {
  let p;
  try { p = decodeURIComponent(req.path); } catch { return res.status(400).end(); }
  if (p.includes('\\') || p.includes('\0')) return res.status(400).end();
  const parts = path.posix.normalize(p).split('/').filter(Boolean);
  if (parts.length < 3 || !DATA_PUBLIC.has(parts[0]) || parts.includes('..')) return res.status(404).end();
  req.dataParts = parts; // [root, entityId, file …] — for the per-entity access check
  next();
}

// Uploaded SVG/HTML/XML files are same-origin documents; if one is opened
// directly, `sandbox` stops any script inside it. Anything that isn't an
// image, PDF or plain text is downloaded rather than shown.
const ACTIVE_EXT = /\.(svgz?|html?|xhtml|xml)$/i;
const INLINE_EXT = /\.(png|jpe?g|gif|webp|avif|pdf|txt)$/i;
export function dataHeaders(res, filePath) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (ACTIVE_EXT.test(filePath)) res.setHeader('Content-Security-Policy', 'sandbox');
  if (!INLINE_EXT.test(filePath)) res.setHeader('Content-Disposition', 'attachment');
  // Files carry unique names and never change under a URL; private because
  // they're only for signed-in users.
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
}
