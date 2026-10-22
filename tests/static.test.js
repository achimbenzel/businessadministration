// Static files: the icons that browsers, Android and iOS use for "add to home screen".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.js';

const PUBLIC = path.join(ROOT, 'public');
// Width and height from a PNG's IHDR chunk.
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', `${file} is a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test('app icons: every icon the manifest and index.html name exists in its declared size', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.webmanifest'), 'utf8'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'), 'an adaptive (maskable) icon for Android');
  for (const icon of manifest.icons) {
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(path.join(PUBLIC, icon.src)), [w, h], icon.src);
  }
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const apple = /<link rel="apple-touch-icon" sizes="(\d+)x\1" href="([^"]+)"/.exec(html);
  assert.ok(apple, 'index.html links an apple-touch-icon');
  assert.deepEqual(pngSize(path.join(PUBLIC, apple[2])), [180, 180]);
  const svg = /<link rel="icon" type="image\/svg\+xml" href="([^"]+)"/.exec(html);
  assert.match(fs.readFileSync(path.join(PUBLIC, svg[1]), 'utf8'), /^<svg [^>]*viewBox="0 0 512 512"/);
});
