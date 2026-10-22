// Counts the licences of all installed packages and lists everything that is
// not clearly permissive (MIT, ISC, Apache, BSD, OFL …).   npm run licenses
// "?" only means the package.json has no licence field — check its LICENSE file.
import fs from 'node:fs';
import path from 'node:path';

const OK = /^(MIT|ISC|Apache-2\.0|BSD-[23]-Clause|0BSD|OFL-1\.1|CC0-1\.0|CC-BY-4\.0|BlueOak-1\.0\.0|Python-2\.0|\(MIT OR CC0-1\.0\)|MIT-0)$/;
const count = {};
const check = [];
const seen = new Set();

(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith('.')) continue;
    const p = path.join(dir, n);
    if (n.startsWith('@')) { walk(p); continue; }
    const pj = path.join(p, 'package.json');
    if (fs.existsSync(pj)) {
      const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
      const id = `${j.name}@${j.version}`;
      if (!seen.has(id)) {
        seen.add(id);
        const l = (typeof j.license === 'object' ? j.license?.type : j.license) || '?';
        count[l] = (count[l] || 0) + 1;
        if (!OK.test(l)) check.push(`${id}: ${l}`);
      }
    }
    if (fs.existsSync(path.join(p, 'node_modules'))) walk(path.join(p, 'node_modules'));
  }
})('node_modules');

console.log(`${seen.size} packages`, count);
console.log(check.length ? `\nCheck by hand:\n  ${check.join('\n  ')}` : '\nAll licences are permissive.');
