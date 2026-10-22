/**
 * createApp(): the Express app — guards, login, API routes, the protected
 * /data file server, the built frontend with SPA fallback and the JSON error
 * handler. Kept separate from index.js so the order of middleware is in one
 * place.
 */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { DATA_DIR, DIST_DIR, ENTITY_ROOTS, TRUST_PROXY } from './config.js';
import { csrfGuard, dataGuard, dataHeaders, errorHandler, hostGuard, securityHeaders, asyncRoute } from './http.js';
import { authRouter, requireAuth, sessionMiddleware } from './auth.js';
import catalogRouter from './routes/catalog.js';
import chaptersRouter, { canSeeChapterFiles } from './routes/chapters.js';
import trashRouter from './routes/trash.js';
import searchRouter from './routes/search.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', TRUST_PROXY);
  app.use(securityHeaders);
  app.use(hostGuard);
  app.use(sessionMiddleware);

  // ---- API ----------------------------------------------------------------------
  app.use('/api', csrfGuard);
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '5mb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use(authRouter());
  // Everything below needs a signed-in user; writes additionally check for
  // the admin role in their routes (requireAdmin).
  app.use('/api', requireAuth);
  app.use(catalogRouter());
  app.use(chaptersRouter());
  app.use(trashRouter());
  app.use(searchRouter());
  app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'Unbekannte API-Adresse.' }));

  // ---- Uploaded files: signed-in users only, and only files of chapters they may see.
  app.use('/data', requireAuth, dataGuard, asyncRoute(async (req, res, next) => {
    const [root, entityId] = req.dataParts;
    if (root === 'chapters' && !(await canSeeChapterFiles(req, entityId))) return res.status(404).end();
    next();
  }));
  for (const root of ENTITY_ROOTS) {
    app.use(`/data/${root}`, express.static(path.join(DATA_DIR, root), { dotfiles: 'deny', index: false, fallthrough: false, setHeaders: dataHeaders }));
  }

  // ---- The built frontend (production). The page itself is public — it only
  // shows the login until /api/auth/me says who you are.
  if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
    app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/(api|data)\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
