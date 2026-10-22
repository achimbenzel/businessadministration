// Vite: dev server on 4200 that proxies /api and /data to the Express server,
// so the browser only ever talks to one origin (cookies and CSRF header work
// the same in dev and production).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = `http://127.0.0.1:${process.env.API_PORT || 4300}`;

export default defineConfig({
  plugins: [react()],
  // Only VITE_* variables would reach the browser bundle; the passwords in .env
  // have no prefix and therefore never leave the server.
  envPrefix: 'VITE_',
  server: {
    port: 4200,
    strictPort: true,
    host: process.env.DEV_HOST || '127.0.0.1', // for the phone: your Tailscale IP
    allowedHosts: ['.ts.net'],
    proxy: { '/api': API, '/data': API },
  },
  preview: { port: 4200, strictPort: true },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 700,
    // Fonts always as files: small subsets would otherwise be inlined as
    // data: URLs, which the server's Content-Security-Policy (font-src 'self') blocks.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/i.test(file) ? false : undefined),
  },
});
