// Draws the app icon and renders every size the browsers and home screens need
// with the installed Chromium:
//   icon.svg              favicon and logo in the app (rounded tile)
//   icon-192/512.png      Android / manifest "any" (rounded tile, transparent corners)
//   maskable-512.png      Android adaptive icon: full bleed, drawing inside the safe circle
//   apple-touch-icon.png  iOS home screen, 180 × 180: full bleed (iOS rounds it), no transparency
//   npm run icons
//
// The drawing: a graduation cap above a small supply-and-demand chart, in the
// app's colours (accent teal, demand pink, supply green).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public/icons');

const DEFS = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#17434a"/>
      <stop offset="0.55" stop-color="#0f2226"/>
      <stop offset="1" stop-color="#0a0d0f"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.3" r="0.55">
      <stop offset="0" stop-color="#2ec5d3" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#2ec5d3" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="board" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7beef6"/>
      <stop offset="1" stop-color="#25b9c9"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#14808d"/>
      <stop offset="1" stop-color="#0d5f69"/>
    </linearGradient>
  </defs>`;

// Everything inside the 512 × 512 tile except the background.
const ART = `<g stroke-linecap="round" stroke-linejoin="round">
    <!-- cap: body, board, tassel -->
    <path d="M164 205 L256 244 L348 205 L348 262 C348 300 164 300 164 262 Z" fill="url(#cap)"/>
    <path d="M256 92 L436 170 L256 248 L76 170 Z" fill="url(#board)"/>
    <path d="M256 104 L408 170 L256 236" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="4"/>
    <path d="M256 170 L390 196 L390 268" fill="none" stroke="#fbbf24" stroke-width="10"/>
    <circle cx="256" cy="170" r="13" fill="#fbbf24"/>
    <rect x="377" y="262" width="26" height="40" rx="11" fill="#fbbf24"/>
    <!-- supply and demand -->
    <path d="M150 318 V432 H376" fill="none" stroke="#e9f6f7" stroke-opacity="0.9" stroke-width="15"/>
    <path d="M184 330 L340 422" fill="none" stroke="#f472b6" stroke-width="20"/>
    <path d="M184 418 L356 342" fill="none" stroke="#34d399" stroke-width="20"/>
    <circle cx="269.3" cy="380.3" r="17" fill="#ffffff" stroke="#0a0d0f" stroke-width="5"/>
  </g>`;

/** The icon as SVG. rx: corner radius of the tile (0 = full bleed), scale: size of the drawing. */
function icon({ rx = 112, scale = 1 } = {}) {
  const art = scale === 1 ? ART : `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${ART}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${DEFS}
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${rx}" fill="url(#glow)"/>
  ${art}
</svg>
`;
}

const svg = icon();
fs.writeFileSync(path.join(DIR, 'icon.svg'), svg);
console.log('  wrote icon.svg');

const jobs = [
  { file: 'icon-192.png', size: 192, svg },
  { file: 'icon-512.png', size: 512, svg },
  // Android masks adaptive icons to a circle or squircle: keep the drawing inside the 80 % safe zone.
  { file: 'maskable-512.png', size: 512, svg: icon({ rx: 0, scale: 0.9 }) },
  // iOS rounds the corners itself and shows transparency as black.
  { file: 'apple-touch-icon.png', size: 180, svg: icon({ rx: 0, scale: 0.96 }) },
];

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${j.svg.replace('<svg ', `<svg width="${j.size}" height="${j.size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(DIR, j.file), omitBackground: j.file.startsWith('icon-') });
  console.log('  wrote', j.file);
}
await browser.close();
