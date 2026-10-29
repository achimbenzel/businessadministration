// Draws the figures of the Mathe-Tutorium chapters as SVG in the app's dark look.
//   node content/mathe-tutorium/figures.mjs
// Same colours as everywhere in the app: teal, violet, amber, pink on #131316.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const C = {
  bg: '#131316', text: '#ececef', muted: '#a8a8b0', faint: '#6b6b75',
  teal: '#2ec5d3', violet: '#a78bfa', amber: '#fbbf24', pink: '#f472b6', green: '#34d399',
};
const FONT = "'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', Menlo, Consolas, monospace";
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(w, h, title, body) {
  const markers = Object.entries(C).map(([k, v]) => (
    `<marker id="arr-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${v}"/></marker>`
  )).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${markers}<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="${C.muted}" stroke-opacity="0.5" stroke-width="2"/></pattern></defs>
<rect width="${w}" height="${h}" fill="${C.bg}"/>
${body.join('\n')}
</svg>
`;
}
// "a^2" / "a_i" / "a^{x+y}" → raised / lowered parts. Offsets in px so the
// baseline comes back exactly (em would be relative to the smaller script size).
function rich(s, size) {
  const parts = [];
  const re = /([\^_])(\{[^}]*\}|.)/g;
  let last = 0; let m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ v: s.slice(last, m.index), level: 0 });
    parts.push({ v: m[2].startsWith('{') ? m[2].slice(1, -1) : m[2], level: m[1] === '^' ? 1 : -1 });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ v: s.slice(last), level: 0 });
  let cur = 0;
  return parts.map((p) => {
    const target = p.level === 1 ? -0.4 * size : p.level === -1 ? 0.22 * size : 0;
    const dy = target - cur;
    cur = target;
    return `<tspan${dy ? ` dy="${dy.toFixed(1)}"` : ''}${p.level ? ' font-size="68%"' : ''}>${esc(p.v)}</tspan>`;
  }).join('');
}
const text = (x, y, s, { size = 18, color = C.text, anchor = 'start', weight = 500, font = FONT, italic = false } = {}) => (
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}" font-family="${font}"${italic ? ' font-style="italic"' : ''}>${rich(s, size)}</text>`
);
const arrow = (x1, y1, x2, y2, color) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2.2" marker-end="url(#arr-${Object.keys(C).find((k) => C[k] === color)})"/>`;
const rect = (x, y, w, h, color, opacity = 0.22, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="2"${extra}/>`;

// ---- Σ and Π: what each part means ---------------------------------------------------------
function anatomy(sym, { title, name, part, expand }) {
  return svg(640, 372, title, [
    text(24, 34, name, { size: 17, weight: 700 }),
    text(160, 236, sym, { size: 150, weight: 400, anchor: 'middle', font: MONO }),
    text(160, 86, 'n', { size: 40, color: C.amber, anchor: 'middle', weight: 700, font: MONO }),
    text(160, 306, 'i=1', { size: 36, color: C.teal, anchor: 'middle', weight: 700, font: MONO }),
    text(238, 216, 'a_i', { size: 62, color: C.pink, weight: 700, font: MONO }),
    text(370, 66, 'obere Grenze: bis wohin?', { size: 17, color: C.amber, weight: 700 }),
    text(370, 88, '(Endwert)', { size: 15, color: C.muted }),
    arrow(362, 72, 190, 74, C.amber),
    text(370, 178, part, { size: 17, color: C.pink, weight: 700 }),
    text(370, 200, '(hängt meist von i ab)', { size: 15, color: C.muted }),
    arrow(362, 186, 322, 194, C.pink),
    text(370, 290, 'Laufindex i und Startwert:', { size: 17, color: C.teal, weight: 700 }),
    text(370, 312, 'ab wo? (untere Grenze)', { size: 15, color: C.muted }),
    arrow(362, 296, 214, 296, C.teal),
    text(24, 354, expand, { size: 18, color: C.muted, font: MONO }),
  ]);
}
const sumAnatomy = anatomy('Σ', {
  title: 'Aufbau des Summenzeichens: obere Grenze n, Laufindex i mit Startwert 1, Summand a_i',
  name: 'Summenzeichen (Sigma)', part: 'Summand: was addiert wird', expand: 'Σ a_i = a_1 + a_2 + … + a_n',
});
const prodAnatomy = anatomy('Π', {
  title: 'Aufbau des Produktzeichens: obere Grenze n, Laufindex i mit Startwert 1, Faktor a_i',
  name: 'Produktzeichen (Pi)', part: 'Faktor: was multipliziert wird', expand: 'Π a_i = a_1 · a_2 · … · a_n',
});

// ---- (a + b)² as a square --------------------------------------------------------------------
const A = 180; const B = 120; const X0 = 70; const Y0 = 60;
const binom1 = svg(640, 420, 'Erste binomische Formel als Fläche: Das Quadrat mit Seite a + b besteht aus a², zweimal a·b und b²', [
  rect(X0, Y0, A, A, C.teal), rect(X0 + A, Y0, B, A, C.violet), rect(X0, Y0 + A, A, B, C.violet), rect(X0 + A, Y0 + A, B, B, C.amber),
  text(X0 + A / 2, Y0 + A / 2 + 12, 'a^2', { size: 34, anchor: 'middle', weight: 700, font: MONO, color: C.teal }),
  text(X0 + A + B / 2, Y0 + A / 2 + 10, 'a·b', { size: 26, anchor: 'middle', weight: 700, font: MONO, color: C.violet }),
  text(X0 + A / 2, Y0 + A + B / 2 + 10, 'a·b', { size: 26, anchor: 'middle', weight: 700, font: MONO, color: C.violet }),
  text(X0 + A + B / 2, Y0 + A + B / 2 + 11, 'b^2', { size: 30, anchor: 'middle', weight: 700, font: MONO, color: C.amber }),
  text(X0 + A / 2, Y0 - 14, 'a', { size: 22, anchor: 'middle', italic: true }),
  text(X0 + A + B / 2, Y0 - 14, 'b', { size: 22, anchor: 'middle', italic: true }),
  text(X0 - 16, Y0 + A / 2 + 8, 'a', { size: 22, anchor: 'end', italic: true }),
  text(X0 - 16, Y0 + A + B / 2 + 8, 'b', { size: 22, anchor: 'end', italic: true }),
  text(400, 150, 'Seite: a + b', { size: 18, color: C.muted }),
  text(400, 196, '(a + b)^2', { size: 30, weight: 700, font: MONO }),
  text(400, 240, '= a^2 + 2ab + b^2', { size: 26, weight: 700, font: MONO }),
  text(400, 290, 'Die zwei violetten', { size: 16, color: C.muted }),
  text(400, 312, 'Rechtecke sind das 2ab –', { size: 16, color: C.muted }),
  text(400, 334, 'genau das, was man bei', { size: 16, color: C.muted }),
  text(400, 356, 'a^2 + b^2 vergisst.', { size: 16, color: C.muted }),
]);

// ---- a² − b² = (a + b)(a − b): cut and re-lay -----------------------------------------------
const u = 36; const a = 5 * u; const b = 2 * u; const lx = 50; const ly = 70; const rx = 400; const ry = 106;
const binom3 = svg(740, 320, 'Dritte binomische Formel: Vom Quadrat a² wird b² weggenommen; die beiden Reststücke ergeben ein Rechteck (a + b) mal (a − b)', [
  rect(lx, ly, a, a - b, C.teal),
  rect(lx, ly + a - b, a - b, b, C.violet),
  `<rect x="${lx + a - b}" y="${ly + a - b}" width="${b}" height="${b}" fill="url(#hatch)" stroke="${C.muted}" stroke-width="2" stroke-dasharray="6 5"/>`,
  text(lx + a - b / 2, ly + a - b / 2 + 8, 'b^2', { size: 22, anchor: 'middle', weight: 700, font: MONO, color: C.muted }),
  text(lx + a / 2, ly + (a - b) / 2 + 8, '1', { size: 24, anchor: 'middle', weight: 700, color: C.teal }),
  text(lx + (a - b) / 2, ly + a - b / 2 + 8, '2', { size: 24, anchor: 'middle', weight: 700, color: C.violet }),
  text(lx + a / 2, ly - 14, 'a', { size: 22, anchor: 'middle', italic: true }),
  text(lx - 14, ly + a / 2 + 8, 'a', { size: 22, anchor: 'end', italic: true }),
  text(lx + a / 2, ly + a + 34, 'a^2 − b^2', { size: 24, anchor: 'middle', weight: 700, font: MONO }),
  arrow(lx + a + 30, ly + a / 2 - 10, rx - 30, ry + (a - b) / 2 - 10, C.text),
  text((lx + a + rx) / 2, ly + a / 2 - 28, 'Stück 2 umlegen', { size: 15, color: C.muted, anchor: 'middle' }),
  rect(rx, ry, a, a - b, C.teal),
  rect(rx + a, ry, b, a - b, C.violet),
  text(rx + a / 2, ry + (a - b) / 2 + 8, '1', { size: 24, anchor: 'middle', weight: 700, color: C.teal }),
  text(rx + a + b / 2, ry + (a - b) / 2 + 8, '2', { size: 24, anchor: 'middle', weight: 700, color: C.violet }),
  text(rx + (a + b) / 2, ry - 14, 'a + b', { size: 22, anchor: 'middle', italic: true }),
  text(rx + a + b + 12, ry + (a - b) / 2 + 8, 'a − b', { size: 20, italic: true }),
  text(rx + (a + b) / 2, ry + a - b + 46, '= (a + b)(a − b)', { size: 24, anchor: 'middle', weight: 700, font: MONO }),
]);

// ---- Exponent rules as tiles --------------------------------------------------------------
const tile = (x, y, color, label = 'a') => [
  `<rect x="${x}" y="${y}" width="44" height="44" rx="9" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2"/>`,
  text(x + 22, y + 30, label, { size: 22, anchor: 'middle', weight: 700, font: MONO, color }),
];
const tiles = (x, y, n, color, gap = 8) => Array.from({ length: n }, (_, k) => tile(x + k * (44 + gap), y, color)).flat();
const powerTiles = svg(680, 330, 'Potenzgesetze als Kacheln: a³ · a² = a⁵ und (a²)³ = a⁶', [
  text(24, 40, 'Regel 1: gleiche Basis multiplizieren → Exponenten addieren', { size: 16, color: C.muted }),
  ...tiles(24, 58, 3, C.teal),
  text(184, 89, '·', { size: 30, anchor: 'middle', weight: 700 }),
  ...tiles(204, 58, 2, C.violet),
  text(330, 90, '=', { size: 28, anchor: 'middle', weight: 700 }),
  ...tiles(356, 58, 3, C.teal), ...tiles(512, 58, 2, C.violet),
  text(24, 136, 'a^3 · a^2 = a^{3+2} = a^5', { size: 22, weight: 700, font: MONO }),
  text(24, 196, 'Regel 3: Potenz einer Potenz → Exponenten multiplizieren', { size: 16, color: C.muted }),
  ...tiles(24, 214, 2, C.amber), ...tiles(152, 214, 2, C.amber), ...tiles(280, 214, 2, C.amber),
  `<rect x="18" y="208" width="108" height="56" rx="12" fill="none" stroke="${C.faint}" stroke-dasharray="5 4"/>`,
  `<rect x="146" y="208" width="108" height="56" rx="12" fill="none" stroke="${C.faint}" stroke-dasharray="5 4"/>`,
  `<rect x="274" y="208" width="108" height="56" rx="12" fill="none" stroke="${C.faint}" stroke-dasharray="5 4"/>`,
  text(420, 246, '3-mal a^2', { size: 18, color: C.muted }),
  text(24, 300, '(a^2)^3 = a^2 · a^2 · a^2 = a^{2·3} = a^6', { size: 22, weight: 700, font: MONO }),
]);

// Coloured pieces in one line: [['log', C.text], ['_2', C.teal], …] — '_x' / '^x' lowered / raised.
function pieces(x, y, parts, { size = 44, anchor = 'start', font = MONO, weight = 700 } = {}) {
  let cur = 0;
  const spans = parts.map(([v, color]) => {
    const level = v[0] === '^' ? 1 : v[0] === '_' ? -1 : 0;
    const target = level === 1 ? -0.4 * size : level === -1 ? 0.22 * size : 0;
    const dy = target - cur;
    cur = target;
    return `<tspan fill="${color}"${dy ? ` dy="${dy.toFixed(1)}"` : ''}${level ? ' font-size="68%"' : ''}>${esc(level ? v.slice(1) : v)}</tspan>`;
  }).join('');
  return `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}" font-family="${font}">${spans}</text>`;
}

// ---- Logarithm = the exponent you are looking for --------------------------------------------
const logInverse = svg(640, 330, 'Potenz und Logarithmus: 2 hoch 3 gleich 8, also Logarithmus zur Basis 2 von 8 gleich 3', [
  text(24, 38, 'Der Logarithmus sucht die Hochzahl', { size: 20, weight: 700 }),
  text(24, 104, 'Potenz', { size: 19, color: C.muted, weight: 700 }),
  pieces(200, 110, [['2', C.teal], ['^3', C.amber], [' = ', C.text], ['8', C.pink]]),
  text(200, 146, 'Hochzahl bekannt → Ergebnis gesucht', { size: 18, color: C.muted }),
  text(24, 214, 'Logarithmus', { size: 19, color: C.muted, weight: 700 }),
  pieces(200, 220, [['log', C.text], ['_2', C.teal], ['(', C.text], ['8', C.pink], [') = ', C.text], ['3', C.amber]]),
  text(200, 256, 'Ergebnis bekannt → Hochzahl gesucht', { size: 18, color: C.muted }),
  text(24, 310, 'Basis', { size: 18, color: C.teal, weight: 700 }),
  text(94, 310, 'Hochzahl', { size: 18, color: C.amber, weight: 700 }),
  text(194, 310, 'Ergebnis', { size: 18, color: C.pink, weight: 700 }),
  text(290, 310, '– gleiche Farbe, gleiche Zahl', { size: 18, color: C.muted }),
]);

// ---- Square root = side of a square ----------------------------------------------------------
const cell = 56; const sx = 60; const sy = 70;
const rootSquare = svg(640, 330, 'Quadratwurzel als Seitenlänge: Ein Quadrat aus 3 mal 3 Kästchen hat die Fläche 9 und die Seite 3', [
  ...Array.from({ length: 9 }, (_, k) => `<rect x="${sx + (k % 3) * cell}" y="${sy + Math.floor(k / 3) * cell}" width="${cell}" height="${cell}" fill="${C.teal}" fill-opacity="0.22" stroke="${C.teal}" stroke-width="2"/>`),
  text(sx + 1.5 * cell, sy + 3 * cell + 36, 'Fläche 9 (9 Kästchen)', { size: 18, anchor: 'middle', weight: 700, color: C.teal }),
  text(sx + 1.5 * cell, sy - 16, 'Seite 3', { size: 18, anchor: 'middle', color: C.amber, weight: 700 }),
  text(sx - 14, sy + 1.5 * cell + 7, '3', { size: 20, anchor: 'end', color: C.amber, weight: 700 }),
  text(330, 130, '3^2 = 9', { size: 34, weight: 700, font: MONO }),
  text(330, 186, '√9 = 3', { size: 34, weight: 700, font: MONO }),
  text(330, 240, 'Die Wurzel aus der Fläche', { size: 19, color: C.muted }),
  text(330, 266, 'ist die Seitenlänge.', { size: 19, color: C.muted }),
]);

// ---- An equation as a balance: the same step on both sides ----------------------------------
const pan = (cx, label, color) => [
  `<line x1="${cx}" y1="96" x2="${cx - 70}" y2="200" stroke="${C.faint}" stroke-width="2"/>`,
  `<line x1="${cx}" y1="96" x2="${cx + 70}" y2="200" stroke="${C.faint}" stroke-width="2"/>`,
  `<path d="M${cx - 84} 200 H${cx + 84} Q${cx} 236 ${cx - 84} 200 Z" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2"/>`,
  `<rect x="${cx - 66}" y="152" width="132" height="46" rx="10" fill="${C.bg}" stroke="${color}" stroke-width="2"/>`,
  `<rect x="${cx - 66}" y="152" width="132" height="46" rx="10" fill="${color}" fill-opacity="0.22"/>`,
  text(cx, 184, label, { size: 28, anchor: 'middle', weight: 700, font: MONO, color }),
  text(cx, 268, '− 3', { size: 26, anchor: 'middle', weight: 700, font: MONO, color: C.amber }),
];
const balance = svg(540, 350, 'Gleichung als Waage: links 2x + 3, rechts 11; auf beiden Seiten minus 3 ergibt 2x = 8', [
  `<path d="M245 300 L270 252 L295 300 Z" fill="${C.faint}" fill-opacity="0.4" stroke="${C.faint}" stroke-width="2"/>`,
  `<line x1="270" y1="252" x2="270" y2="88" stroke="${C.muted}" stroke-width="4"/>`,
  `<line x1="110" y1="96" x2="430" y2="96" stroke="${C.muted}" stroke-width="5" stroke-linecap="round"/>`,
  `<circle cx="270" cy="92" r="7" fill="${C.text}"/>`,
  ...pan(110, '2x + 3', C.teal), ...pan(430, '11', C.violet),
  text(270, 42, 'Gleichgewicht: links = rechts', { size: 21, color: C.muted, anchor: 'middle' }),
  text(270, 336, 'auf beiden Seiten − 3  →  2x = 8', { size: 22, anchor: 'middle', weight: 700, color: C.text }),
]);

for (const [name, content] of Object.entries({
  '01-summen-produktzeichen/img/summenzeichen-aufbau.svg': sumAnatomy,
  '01-summen-produktzeichen/img/produktzeichen-aufbau.svg': prodAnatomy,
  '02-potenzgesetze/img/potenzgesetze-kacheln.svg': powerTiles,
  '03-binomische-formeln/img/binom-quadrat.svg': binom1,
  '03-binomische-formeln/img/binom-dritte.svg': binom3,
  '04-logarithmen/img/logarithmus-umkehrung.svg': logInverse,
  '05-wurzeln/img/wurzel-quadrat.svg': rootSquare,
  '06-gleichungen-ungleichungen/img/gleichung-waage.svg': balance,
})) {
  fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true });
  fs.writeFileSync(path.join(OUT, name), content);
  console.log('  wrote ' + name);
}
