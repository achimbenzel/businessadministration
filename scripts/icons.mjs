// Renders public/icons/icon.svg into the PNG icons the manifest and iOS need
// (192, 512, maskable 512, apple-touch 180) with the installed Chromium.
//   npm run icons
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'public/icons');
const svg = fs.readFileSync(path.join(DIR, 'icon.svg'), 'utf8');

// Full-bleed tile for iOS / maskable (the OS rounds or masks it itself): same
// drawing without the rounded corners, cap scaled into the safe zone.
const square = svg.replace('rx="128"', 'rx="0"');
const maskable = square.replace('translate(96 96) scale(13.333)', 'translate(128 128) scale(10.667)');

const jobs = [
  { file: 'icon-192.png', size: 192, svg },
  { file: 'icon-512.png', size: 512, svg },
  { file: 'maskable-512.png', size: 512, svg: maskable },
  { file: 'apple-touch-icon.png', size: 180, svg: square },
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
