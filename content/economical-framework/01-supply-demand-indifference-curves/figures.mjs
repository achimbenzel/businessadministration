// Draws this chapter's figures as SVG in the app's dark look.
//   node content/economical-framework/01-supply-demand-indifference-curves/figures.mjs
// Each figure works in a 0–10 × 0–10 "math" space that is mapped onto the plot area.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'img');
const W = 640;
const H = 420;
const P = { L: 64, R: 600, T: 36, B: 372 };
const C = {
  bg: '#131316', axis: '#8b8b94', guide: '#6b6b75', text: '#ececef', muted: '#a8a8b0',
  teal: '#2ec5d3', amber: '#fbbf24', pink: '#f472b6', blue: '#6b9cff', green: '#34d399', violet: '#a78bfa',
};
const FONT = "'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const X = (x) => +(P.L + (x / 10) * (P.R - P.L)).toFixed(1);
const Y = (y) => +(P.B - (y / 10) * (P.B - P.T)).toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(title, body) {
  const markers = Object.entries(C).map(([k, v]) => (
    `<marker id="arr-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${v}"/></marker>`
  )).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${markers}</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${body.join('\n')}
</svg>
`;
}

// "P_F" → P with a subscript F (Unicode has no subscript capitals).
function rich(s) {
  const parts = String(s).split(/_([A-Za-z]+)/);
  let out = esc(parts[0]);
  for (let i = 1; i < parts.length; i += 2) {
    out += `<tspan dy="4" font-size="72%">${esc(parts[i])}</tspan><tspan dy="-4">${esc(parts[i + 1] || '')}</tspan>`;
  }
  return out;
}
const text = (px, py, s, { size = 18, color = C.text, anchor = 'start', weight = 500, italic = false } = {}) => (
  `<text x="${px}" y="${py}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''}>${rich(s)}</text>`
);
const line = (x1, y1, x2, y2, { color = C.text, width = 3.5, dash = '', arrow = '' } = {}) => (
  `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}${arrow ? ` marker-end="url(#arr-${arrow})"` : ''}/>`
);
const curve = (fn, x1, x2, { color, width = 3.5, ymax = 9.6, steps = 120 } = {}) => {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const y = fn(x);
    if (y <= ymax && y >= 0) pts.push(`${X(x)},${Y(y)}`);
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const area = (points, color, opacity = 0.2) => `<polygon points="${points.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="${color}" fill-opacity="${opacity}"/>`;
const dot = (x, y, color = C.text, r = 6.5) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${r}" fill="${color}" stroke="${C.bg}" stroke-width="2.5"/>`;
const guides = (x, y, color = C.guide) => [
  line(0, y, x, y, { color, width: 2, dash: '6 6' }),
  line(x, 0, x, y, { color, width: 2, dash: '6 6' }),
];

function axes(xLabel, yLabel) {
  return [
    `<line x1="${P.L}" y1="${P.B}" x2="${P.R + 18}" y2="${P.B}" stroke="${C.axis}" stroke-width="2.5" marker-end="url(#arr-axis)"/>`,
    `<line x1="${P.L}" y1="${P.B}" x2="${P.L}" y2="${P.T - 18}" stroke="${C.axis}" stroke-width="2.5" marker-end="url(#arr-axis)"/>`,
    text(P.L + 14, P.T - 8, yLabel, { size: 17, color: C.muted }),
    text(P.R + 18, P.B + 38, xLabel, { size: 17, color: C.muted, anchor: 'end' }),
    text(P.L - 10, P.B + 22, '0', { size: 16, color: C.muted, anchor: 'end' }),
  ];
}
const yTick = (y, s) => text(P.L - 10, Y(y) + 6, s, { size: 18, color: C.text, anchor: 'end', italic: true });
const xTick = (x, s) => text(X(x), P.B + 26, s, { size: 18, color: C.text, anchor: 'middle', italic: true });

/** Legend box at the top right; rows: { kind: 'line'|'area'|'dot'|'note', color, dash, label }. */
function legend(rows, { width = 262 } = {}) {
  const x = W - 22 - width;
  const y = 16;
  const h = 18 + rows.length * 27;
  const out = [`<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="10" fill="${C.bg}" fill-opacity="0.92" stroke="#2c2c32"/>`];
  rows.forEach((r, i) => {
    const cy = y + 22 + i * 27;
    if (r.kind === 'area') out.push(`<rect x="${x + 14}" y="${cy - 8}" width="26" height="16" rx="3" fill="${r.color}" fill-opacity="0.3" stroke="${r.color}" stroke-opacity="0.6"/>`);
    else if (r.kind === 'dot') out.push(`<circle cx="${x + 27}" cy="${cy}" r="6" fill="${r.color}"/>`);
    else if (r.kind === 'line') out.push(`<line x1="${x + 14}" y1="${cy}" x2="${x + 40}" y2="${cy}" stroke="${r.color}" stroke-width="3.5" stroke-linecap="round"${r.dash ? ` stroke-dasharray="${r.dash}"` : ''}/>`);
    out.push(text(x + (r.kind === 'note' ? 14 : 50), cy + 6, r.label, { size: 15.5, color: r.kind === 'note' ? C.muted : C.text }));
  });
  return out;
}

// ---- 1. Market equilibrium with consumer and producer surplus -------------------------
// D: p = 9 − x   S: p = 1.5 + 0.5x   →  E = (5, 4)
const equilibrium = svg('Market equilibrium: the supply and demand curves intersect at point E', [
  ...axes('Quantity Q', 'Price P'),
  area([[0, 9], [5, 4], [0, 4]], C.teal, 0.2),
  area([[0, 4], [5, 4], [0, 1.5]], C.amber, 0.2),
  ...guides(5, 4),
  line(0, 9, 8.5, 0.5, { color: C.teal }),
  line(0, 1.5, 10, 6.5, { color: C.amber }),
  text(X(1.1), Y(5.15), 'CS', { size: 18, color: C.teal, weight: 700 }),
  text(X(1.1), Y(2.85), 'PS', { size: 18, color: C.amber, weight: 700 }),
  dot(5, 4),
  text(X(5) + 12, Y(4) - 12, 'E', { size: 20, weight: 700 }),
  text(X(8.5) + 10, Y(0.5) - 4, 'D', { size: 21, color: C.teal, weight: 700 }),
  text(X(10) + 6, Y(6.5) + 7, 'S', { size: 21, color: C.amber, weight: 700 }),
  yTick(4, 'P*'), xTick(5, 'Q*'),
  ...legend([
    { kind: 'line', color: C.teal, label: 'Demand' },
    { kind: 'line', color: C.amber, label: 'Supply' },
    { kind: 'area', color: C.teal, label: 'Consumer surplus (CS)' },
    { kind: 'area', color: C.amber, label: 'Producer surplus (PS)' },
  ], { width: 240 }),
]);

// ---- 2. Movement along the demand curve vs. shift of the curve -----------------------
const D0 = (x) => 8.5 - x;
const along = (t) => [2 + 2.5 * t - 0.32, D0(2 + 2.5 * t) - 0.32]; // A → B, slightly below the curve
const [ax1, ay1] = along(0.12);
const [ax2, ay2] = along(0.88);
const demandShift = svg('Movement along the demand curve and shift of the demand curve', [
  ...axes('Quantity Q', 'Price P'),
  ...guides(2, 6.5), ...guides(4.5, 4),
  line(0.5, 8, 8, 0.5, { color: C.teal }),
  line(2.5, 8, 10, 0.5, { color: C.teal, dash: '10 8' }),
  line(ax1, ay1, ax2, ay2, { color: C.text, width: 2.5, arrow: 'text' }),
  line(0.85, 7.8, 2.5, 7.8, { color: C.pink, width: 2.5, arrow: 'pink' }),
  line(5.7, 2.8, 7.25, 2.8, { color: C.pink, width: 2.5, arrow: 'pink' }),
  dot(2, 6.5), dot(4.5, 4),
  text(X(2) + 12, Y(6.5) - 10, 'A', { size: 19, weight: 700 }),
  text(X(4.5) + 12, Y(4) - 10, 'B', { size: 19, weight: 700 }),
  text(X(8) + 8, Y(0.5) - 6, 'D₀', { size: 20, color: C.teal, weight: 700 }),
  text(X(10) - 6, Y(0.5) - 26, 'D₁', { size: 20, color: C.teal, weight: 700, anchor: 'end' }),
  yTick(6.5, 'P₁'), yTick(4, 'P₂'), xTick(2, 'Q₁'), xTick(4.5, 'Q₂'),
  ...legend([
    { kind: 'line', color: C.text, label: 'A → B: movement along D₀' },
    { kind: 'note', label: 'the good’s own price falls' },
    { kind: 'line', color: C.pink, label: 'D₀ → D₁: shift in demand' },
    { kind: 'note', label: 'e.g. income rises' },
  ], { width: 262 }),
]);

// ---- 3. Price floor and price ceiling ----------------------------------------------------
const priceControls = svg('Price floor above and price ceiling below the equilibrium price', [
  ...axes('Quantity Q', 'Price P'),
  ...guides(5, 4),
  line(0, 9, 8.5, 0.5, { color: C.teal }),
  line(0, 1.5, 10, 6.5, { color: C.amber }),
  line(0, 5.5, 10, 5.5, { color: C.pink, width: 2.5, dash: '8 6' }),
  line(0, 2.5, 10, 2.5, { color: C.blue, width: 2.5, dash: '8 6' }),
  line(3.5, 5.5, 8, 5.5, { color: C.pink, width: 6 }),
  line(2, 2.5, 6.5, 2.5, { color: C.blue, width: 6 }),
  text(X(5.75), Y(5.5) - 14, 'Surplus (excess supply)', { size: 17, color: C.pink, anchor: 'middle', weight: 700 }),
  text(X(3.8), Y(2.5) + 27, 'Shortage (excess demand)', { size: 16.5, color: C.blue, anchor: 'middle', weight: 700 }),
  dot(5, 4),
  text(X(5) + 12, Y(4) - 12, 'E', { size: 20, weight: 700 }),
  text(X(8.5) + 10, Y(0.5) - 4, 'D', { size: 21, color: C.teal, weight: 700 }),
  text(X(10) + 6, Y(6.5) + 7, 'S', { size: 21, color: C.amber, weight: 700 }),
  yTick(5.5, 'P_F'), yTick(4, 'P*'), yTick(2.5, 'P_C'),
  ...legend([
    { kind: 'line', color: C.pink, dash: '8 6', label: 'P_F: price floor above P*' },
    { kind: 'line', color: C.blue, dash: '8 6', label: 'P_C: price ceiling below P*' },
  ], { width: 262 }),
]);

// ---- 4. Indifference curves and the marginal rate of substitution ------------------------
const U = (c) => (x) => c / x;
const indifference = svg('Three indifference curves; curves further from the origin mean higher utility', [
  ...axes('Good 1 (x₁)', 'Good 2 (x₂)'),
  curve(U(6), 0.6, 9.6, { color: C.violet }),
  curve(U(12), 1.2, 9.6, { color: C.violet }),
  curve(U(21), 2.1, 9.6, { color: C.violet }),
  line(1.6, 1.6, 5.25, 5.25, { color: C.green, width: 2.5, arrow: 'green' }),
  text(X(5.4), Y(5.55), 'higher utility', { size: 17, color: C.green, weight: 700 }),
  // MRS as a staircase on U₂: A → down Δx₂ → right Δx₁ → B
  `<polyline points="${X(1.6)},${Y(7.5)} ${X(1.6)},${Y(4)} ${X(3)},${Y(4)}" fill="none" stroke="${C.amber}" stroke-width="2.5" stroke-dasharray="6 5"/>`,
  text(X(1.6) - 10, Y(5.75) + 6, 'Δx₂', { size: 17, color: C.amber, anchor: 'end', weight: 700 }),
  text(X(2.3), Y(4) - 9, 'Δx₁', { size: 17, color: C.amber, anchor: 'middle', weight: 700 }),
  dot(1.6, 7.5), dot(3, 4),
  text(X(1.6) + 12, Y(7.5) - 4, 'A', { size: 19, weight: 700 }),
  text(X(3) + 10, Y(4) - 12, 'B', { size: 19, weight: 700 }),
  text(X(9.6) + 6, Y(0.625) + 6, 'U₁', { size: 18, color: C.violet, weight: 700 }),
  text(X(9.6) + 6, Y(1.25) + 2, 'U₂', { size: 18, color: C.violet, weight: 700 }),
  text(X(9.6) + 6, Y(2.19) + 2, 'U₃', { size: 18, color: C.violet, weight: 700 }),
  ...legend([
    { kind: 'line', color: C.violet, label: 'Indifference curves U₁ < U₂ < U₃' },
    { kind: 'line', color: C.amber, dash: '6 5', label: 'MRS ≈ Δx₂ / Δx₁ (A → B)' },
  ], { width: 292 }),
]);

// ---- 5. Budget line and household optimum ----------------------------------------------------
// Budget: x₂ = 6 − 0.75·x₁ (m/p₂ = 6, m/p₁ = 8), tangent to U₂ (x₁·x₂ = 12) in O = (4, 3).
const optimum = svg('Consumer optimum: the budget line touches the highest attainable indifference curve', [
  ...axes('Good 1 (x₁)', 'Good 2 (x₂)'),
  area([[0, 0], [0, 6], [8, 0]], C.teal, 0.1),
  curve(U(6), 0.6, 9.6, { color: C.violet, width: 3 }),
  curve(U(12), 1.2, 9.6, { color: C.violet, width: 3 }),
  curve(U(21), 2.1, 9.6, { color: C.violet, width: 3 }),
  line(0, 6, 8, 0, { color: C.teal }),
  ...guides(4, 3),
  dot(1.17, 5.12, C.muted, 5.5), dot(6.83, 0.88, C.muted, 5.5),
  dot(4, 3, C.text, 7),
  text(X(4) + 10, Y(3) - 13, 'O', { size: 20, weight: 700 }),
  text(X(9.6) + 6, Y(0.625) + 6, 'U₁', { size: 18, color: C.violet, weight: 700 }),
  text(X(9.6) + 6, Y(1.25) + 2, 'U₂', { size: 18, color: C.violet, weight: 700 }),
  text(X(9.6) + 6, Y(2.19) + 2, 'U₃', { size: 18, color: C.violet, weight: 700 }),
  yTick(6, 'm/p₂'), yTick(3, 'x₂*'), xTick(4, 'x₁*'), xTick(8, 'm/p₁'),
  ...legend([
    { kind: 'line', color: C.teal, label: 'Budget line: p₁x₁ + p₂x₂ = m' },
    { kind: 'area', color: C.teal, label: 'affordable bundles' },
    { kind: 'dot', color: C.text, label: 'O: optimum, MRS = p₁/p₂' },
    { kind: 'dot', color: C.muted, label: 'on U₁: affordable, not optimal' },
  ], { width: 284 }),
]);

fs.mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries({
  'market-equilibrium.svg': equilibrium,
  'demand-movement-vs-shift.svg': demandShift,
  'price-floor-ceiling.svg': priceControls,
  'indifference-curves.svg': indifference,
  'consumer-optimum.svg': optimum,
})) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log('  wrote img/' + name);
}
