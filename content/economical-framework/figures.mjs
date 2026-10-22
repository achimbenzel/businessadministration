// Draws the figures of the Economical Framework chapters as SVG in the app's dark look.
//   node content/economical-framework/figures.mjs
// Each figure works in a 0–10 × 0–10 "math" space that is mapped onto the plot area.
// Labels are German with the English term in brackets (the exam is in English);
// colours and area letters match the interactive demos: demand pink, supply
// green, budget line teal, indifference curves violet, deadweight loss hatched.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const W = 640;
const H = 420;
const P = { L: 64, R: 600, T: 36, B: 372 };
const C = {
  bg: '#131316', axis: '#8b8b94', guide: '#6b6b75', text: '#ececef', muted: '#a8a8b0',
  teal: '#2ec5d3', amber: '#fbbf24', pink: '#f472b6', blue: '#6b9cff', green: '#34d399', violet: '#a78bfa', orange: '#fb923c',
};
const FONT = "'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const X = (x) => +(P.L + (x / 10) * (P.R - P.L)).toFixed(1);
const Y = (y) => +(P.B - (y / 10) * (P.B - P.T)).toFixed(1);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Deadweight loss is hatched, like in the market demo.
const HATCH = `<pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${C.text}" fill-opacity="0.06"/><line x1="0" y1="0" x2="0" y2="8" stroke="${C.text}" stroke-opacity="0.55" stroke-width="2.5"/></pattern>`;

function svg(title, body) {
  const markers = Object.entries(C).map(([k, v]) => (
    `<marker id="arr-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${v}"/></marker>`
  )).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${markers}${HATCH}</defs>
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
  `<text x="${px}" y="${py}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}"${italic ? ' font-style="italic"' : ''} paint-order="stroke" stroke="${C.bg}" stroke-width="3" stroke-linejoin="round">${rich(s)}</text>`
);
const line = (x1, y1, x2, y2, { color = C.text, width = 3.5, dash = '', arrow = '' } = {}) => (
  `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}${arrow ? ` marker-end="url(#arr-${arrow})"` : ''}/>`
);
const curve = (fn, x1, x2, { color, width = 3.5, ymax = 9.6, steps = 120, dash = '' } = {}) => {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = x1 + ((x2 - x1) * i) / steps;
    const y = fn(x);
    if (y <= ymax && y >= 0) pts.push(`${X(x)},${Y(y)}`);
  }
  return `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
};
const poly = (points) => points.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ');
const area = (points, color, opacity = 0.2) => `<polygon points="${poly(points)}" fill="${color}" fill-opacity="${opacity}" stroke="${C.bg}" stroke-width="1.5"/>`;
const hatched = (points) => `<polygon points="${poly(points)}" fill="url(#hatch)" stroke="${C.bg}" stroke-width="1.5"/>`;
const dot = (x, y, color = C.text, r = 6.5) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${r}" fill="${color}" stroke="${C.bg}" stroke-width="2.5"/>`;
const ring = (x, y, color = C.text, r = 6) => `<circle cx="${X(x)}" cy="${Y(y)}" r="${r}" fill="${C.bg}" stroke="${color}" stroke-width="2.5"/>`;
const guides = (x, y, color = C.guide) => [
  line(0, y, x, y, { color, width: 2, dash: '6 6' }),
  line(x, 0, x, y, { color, width: 2, dash: '6 6' }),
];

/** Area letter at the centroid of a polygon (math coordinates), like the demo's letters. */
function letter(points, s, dx = 0, dy = 0) {
  let a2 = 0; let cx = 0; let cy = 0;
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length];
    const k = x0 * y1 - x1 * y0;
    a2 += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k;
  });
  return text(X(cx / (3 * a2)) + dx, Y(cy / (3 * a2)) + 7 + dy, s, { size: 21, weight: 700, anchor: 'middle' });
}

/** Double-headed arrow between two quantities at height y, labelled below (or above). */
function bracket(x1, x2, y, label, { color = 'text', below = true } = {}) {
  return [
    `<line x1="${X(x1) + 3}" y1="${Y(y)}" x2="${X(x2) - 3}" y2="${Y(y)}" stroke="${C[color]}" stroke-width="2.2" marker-start="url(#arr-${color})" marker-end="url(#arr-${color})"/>`,
    text((X(x1) + X(x2)) / 2, Y(y) + (below ? 21 : -9), label, { size: 15.5, color: C[color], anchor: 'middle', weight: 700 }),
  ];
}

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
const MARKET_AXES = () => axes('Menge Q (quantity)', 'Preis P (price)');
const GOODS_AXES = () => axes('Gut 1 (x₁)', 'Gut 2 (x₂)');

/** Legend box at the top right; rows: { kind: 'line'|'area'|'hatch'|'dot'|'ring'|'note', color, dash, label }. */
function legend(rows, { width = 262 } = {}) {
  const x = W - 22 - width;
  const y = 16;
  const h = 18 + rows.length * 27;
  const out = [`<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="10" fill="${C.bg}" fill-opacity="0.92" stroke="#2c2c32"/>`];
  rows.forEach((r, i) => {
    const cy = y + 22 + i * 27;
    if (r.kind === 'area') out.push(`<rect x="${x + 14}" y="${cy - 8}" width="26" height="16" rx="3" fill="${r.color}" fill-opacity="0.3" stroke="${r.color}" stroke-opacity="0.6"/>`);
    else if (r.kind === 'hatch') out.push(`<rect x="${x + 14}" y="${cy - 8}" width="26" height="16" rx="3" fill="url(#hatch)" stroke="${C.muted}" stroke-opacity="0.6"/>`);
    else if (r.kind === 'dot') out.push(`<circle cx="${x + 27}" cy="${cy}" r="6" fill="${r.color}"/>`);
    else if (r.kind === 'ring') out.push(`<circle cx="${x + 27}" cy="${cy}" r="5.5" fill="${C.bg}" stroke="${r.color}" stroke-width="2.5"/>`);
    else if (r.kind === 'line') out.push(`<line x1="${x + 14}" y1="${cy}" x2="${x + 40}" y2="${cy}" stroke="${r.color}" stroke-width="3.5" stroke-linecap="round"${r.dash ? ` stroke-dasharray="${r.dash}"` : ''}/>`);
    out.push(text(x + (r.kind === 'note' ? 14 : 50), cy + 6, r.label, { size: 15.5, color: r.kind === 'note' ? C.muted : C.text }));
  });
  return out;
}

// The example market of chapter 1, scaled: x = Q/10, y = P/5.
//   Q_D = 100 − 2P  →  y = 10 − x        Q_S = −20 + 4P  →  y = 1 + 0.5·x
//   E = (6, 4) ↔ Q∗ = 60, P∗ = 20;  P_max = 50 (y = 10), P_min = 5 (y = 1)
const demand = () => line(0, 10, 10, 0, { color: C.pink });
const supply = () => line(0, 1, 10, 6, { color: C.green });
const curveLabels = () => [
  text(X(8.75) + 12, Y(1.25) + 2, 'D', { size: 21, color: C.pink, weight: 700 }),
  text(X(10) + 6, Y(6) + 7, 'S', { size: 21, color: C.green, weight: 700 }),
];

// ---- 1. Market equilibrium with consumer and producer surplus -------------------------
const equilibrium = svg('Marktgleichgewicht: Nachfrage und Angebot schneiden sich in E; A ist die Konsumentenrente, B die Produzentenrente', [
  ...MARKET_AXES(),
  area([[0, 10], [0, 4], [6, 4]], C.pink, 0.24),
  area([[0, 4], [6, 4], [0, 1]], C.green, 0.24),
  ...guides(6, 4),
  demand(), supply(),
  letter([[0, 10], [0, 4], [6, 4]], 'A'),
  letter([[0, 4], [6, 4], [0, 1]], 'B'),
  dot(6, 4),
  text(X(6) + 12, Y(4) - 12, 'E', { size: 20, weight: 700 }),
  ...curveLabels(),
  yTick(10, 'P_max'), yTick(4, 'P∗'), yTick(1, 'P_min'), xTick(6, 'Q∗'),
  ...legend([
    { kind: 'line', color: C.pink, label: 'Nachfrage D (demand)' },
    { kind: 'line', color: C.green, label: 'Angebot S (supply)' },
    { kind: 'area', color: C.pink, label: 'A: Konsumentenrente (CS)' },
    { kind: 'area', color: C.green, label: 'B: Produzentenrente (PS)' },
  ], { width: 262 }),
]);

// ---- 2. Movement along the demand curve vs. shift of the curve -----------------------
const D0 = (x) => 8.5 - x;
const along = (t) => [2 + 2.5 * t - 0.32, D0(2 + 2.5 * t) - 0.32]; // A → B, slightly below the curve
const [ax1, ay1] = along(0.12);
const [ax2, ay2] = along(0.88);
const demandShift = svg('Bewegung entlang der Nachfragekurve und Verschiebung der Nachfragekurve', [
  ...MARKET_AXES(),
  ...guides(2, 6.5), ...guides(4.5, 4),
  line(0.5, 8, 8, 0.5, { color: C.pink }),
  line(2.5, 8, 10, 0.5, { color: C.pink, dash: '10 8' }),
  line(ax1, ay1, ax2, ay2, { color: C.text, width: 2.5, arrow: 'text' }),
  line(0.85, 7.8, 2.5, 7.8, { color: C.amber, width: 2.5, arrow: 'amber' }),
  line(5.7, 2.8, 7.25, 2.8, { color: C.amber, width: 2.5, arrow: 'amber' }),
  dot(2, 6.5), dot(4.5, 4),
  text(X(2) + 12, Y(6.5) - 10, 'A', { size: 19, weight: 700 }),
  text(X(4.5) + 12, Y(4) - 10, 'B', { size: 19, weight: 700 }),
  text(X(8) + 8, Y(0.5) - 6, 'D₀', { size: 20, color: C.pink, weight: 700 }),
  text(X(10) - 6, Y(0.5) - 26, 'D₁', { size: 20, color: C.pink, weight: 700, anchor: 'end' }),
  yTick(6.5, 'P₁'), yTick(4, 'P₂'), xTick(2, 'Q₁'), xTick(4.5, 'Q₂'),
  ...legend([
    { kind: 'line', color: C.text, label: 'A → B: Bewegung entlang D₀' },
    { kind: 'note', label: '(movement along) – Preis sinkt' },
    { kind: 'line', color: C.amber, label: 'D₀ → D₁: Verschiebung (shift)' },
    { kind: 'note', label: 'z. B. das Einkommen steigt' },
  ], { width: 282 }),
]);

// ---- 3. Price floor and price ceiling ----------------------------------------------------
// Floor at P = 25 (y = 5): Q_D = 50, Q_S = 80. Ceiling at P = 15 (y = 3): Q_S = 40, Q_D = 70.
const priceControls = svg('Mindestpreis über P∗ erzeugt einen Überschuss, Höchstpreis unter P∗ eine Knappheit', [
  ...MARKET_AXES(),
  ...guides(6, 4),
  demand(), supply(),
  line(0, 5, 10, 5, { color: C.amber, width: 2.5, dash: '8 6' }),
  line(0, 3, 10, 3, { color: C.blue, width: 2.5, dash: '8 6' }),
  line(5, 5, 8, 5, { color: C.amber, width: 6 }),
  line(4, 3, 7, 3, { color: C.blue, width: 6 }),
  text(X(6.5), Y(5) - 14, 'Überschuss (surplus)', { size: 16.5, color: C.amber, anchor: 'middle', weight: 700 }),
  text(X(5.5), Y(3) + 27, 'Knappheit (shortage)', { size: 16.5, color: C.blue, anchor: 'middle', weight: 700 }),
  dot(6, 4),
  text(X(6) + 12, Y(4) - 12, 'E', { size: 20, weight: 700 }),
  ...curveLabels(),
  yTick(5, 'P_F'), yTick(4, 'P∗'), yTick(3, 'P_C'),
  ...legend([
    { kind: 'line', color: C.amber, dash: '8 6', label: 'P_F: Mindestpreis (price floor)' },
    { kind: 'line', color: C.blue, dash: '8 6', label: 'P_C: Höchstpreis (price ceiling)' },
  ], { width: 288 }),
]);

// ---- 4. Who wins and loses with a price ceiling (letters as in the demo) -----------------
// P_C = 15 (y = 3): traded Q₁ = 40 (x = 4); willingness to pay there 30 (y = 6).
const ceilA = [[0, 10], [0, 4], [4, 4], [4, 6]];
const ceilB = [[0, 3], [0, 4], [4, 4], [4, 3]];
const ceilC = [[4, 6], [4, 4], [6, 4]];
const ceilD = [[4, 4], [4, 3], [6, 4]];
const ceilE = [[0, 3], [4, 3], [0, 1]];
const ceilingWelfare = svg('Höchstpreis: Flächen A bis E – Konsumentenrente, Umverteilung, Wohlfahrtsverlust, Produzentenrente', [
  ...MARKET_AXES(),
  area(ceilA, C.pink, 0.24), area(ceilB, C.pink, 0.24), hatched(ceilC), hatched(ceilD), area(ceilE, C.green, 0.24),
  line(0, 4, 6, 4, { color: C.guide, width: 2, dash: '6 6' }),
  line(4, 0, 4, 6, { color: C.guide, width: 2, dash: '6 6' }),
  line(6, 0, 6, 4, { color: C.guide, width: 2, dash: '6 6' }),
  demand(), supply(),
  line(0, 3, 10, 3, { color: C.blue, width: 2.5, dash: '8 6' }),
  letter(ceilA, 'A'), letter(ceilB, 'B'), letter(ceilC, 'C', 4), letter(ceilD, 'D', 4), letter(ceilE, 'E'),
  ring(6, 4),
  text(X(6) + 12, Y(4) - 8, 'E∗', { size: 17, color: C.muted, weight: 700 }),
  ...bracket(4, 7, 2.35, 'Knappheit (shortage)', { color: 'blue' }),
  ...curveLabels(),
  yTick(4, 'P∗'), yTick(3, 'P_C'), xTick(4, 'Q₁'), xTick(6, 'Q∗'),
  ...legend([
    { kind: 'area', color: C.pink, label: 'A + B: Konsumentenrente (CS)' },
    { kind: 'area', color: C.green, label: 'E: Produzentenrente (PS)' },
    { kind: 'hatch', label: 'C + D: Wohlfahrtsverlust (DWL)' },
    { kind: 'line', color: C.blue, dash: '8 6', label: 'P_C: Höchstpreis' },
  ], { width: 286 }),
]);

// ---- 5. Imports at the world price (letters as in the demo) -------------------------------
// P_W = 12 (y = 2.4): Q_S = 28 (x = 2.8), Q_D = 76 (x = 7.6).
const impA = [[0, 10], [0, 4], [6, 4]];
const impB = [[0, 2.4], [0, 4], [6, 4], [2.8, 2.4]];
const impC = [[2.8, 2.4], [6, 4], [7.6, 2.4]];
const impD = [[0, 2.4], [2.8, 2.4], [0, 1]];
const worldImports = svg('Weltmarktpreis unter dem Gleichgewichtspreis: Das Land importiert; Fläche C ist der Handelsgewinn', [
  ...MARKET_AXES(),
  area(impA, C.pink, 0.2), area(impB, C.pink, 0.3), area(impC, C.pink, 0.42), area(impD, C.green, 0.24),
  line(2.8, 0, 2.8, 2.4, { color: C.guide, width: 2, dash: '6 6' }),
  line(7.6, 0, 7.6, 2.4, { color: C.guide, width: 2, dash: '6 6' }),
  line(0, 4, 6, 4, { color: C.guide, width: 2, dash: '6 6' }),
  demand(), supply(),
  line(0, 2.4, 10, 2.4, { color: C.orange, width: 3 }),
  letter(impA, 'A'), letter(impB, 'B'), letter(impC, 'C'), letter(impD, 'D'),
  ring(6, 4),
  text(X(6) + 12, Y(4) - 8, 'E', { size: 17, color: C.muted, weight: 700 }),
  dot(2.8, 2.4, C.green, 6), dot(7.6, 2.4, C.pink, 6),
  ...bracket(2.8, 7.6, 1.55, 'Importe (imports)', { color: 'orange' }),
  text(X(10) - 4, Y(2.4) - 9, 'P_W', { size: 18, color: C.orange, weight: 700, anchor: 'end' }),
  ...curveLabels(),
  yTick(4, 'P∗'), yTick(2.4, 'P_W'), xTick(2.8, 'Q_S'),
  text(X(7.6) + 9, Y(2.4) - 10, 'Q_D', { size: 17, italic: true }),
  ...legend([
    { kind: 'area', color: C.pink, label: 'A + B + C: Konsumentenrente' },
    { kind: 'area', color: C.green, label: 'D: Produzentenrente (Inland)' },
    { kind: 'note', label: 'C = Handelsgewinn (gains from trade)' },
    { kind: 'line', color: C.orange, label: 'P_W: Weltmarktpreis (world price)' },
  ], { width: 300 }),
]);

// ---- 6. Budget line: m = 100, p₁ = 2, p₂ = 5; scale x = x₁/6, y = x₂/2.5 ------------------
const bx = (x1) => x1 / 6;
const by = (x2) => x2 / 2.5;
const budgetLine = svg('Budgetgerade: alle Bündel, die genau das Einkommen kosten; darunter die bezahlbaren Bündel', [
  ...GOODS_AXES(),
  area([[0, 0], [0, by(20)], [bx(50), 0]], C.teal, 0.12),
  line(0, by(20), bx(50), 0, { color: C.teal }),
  // slope triangle between x₁ = 10 and x₁ = 20
  `<polyline points="${poly([[bx(10), by(16)], [bx(20), by(16)], [bx(20), by(12)]])}" fill="none" stroke="${C.amber}" stroke-width="2.5" stroke-dasharray="6 5"/>`,
  text((X(bx(10)) + X(bx(20))) / 2, Y(by(16)) - 9, 'Δx₁ = 10', { size: 15.5, color: C.amber, anchor: 'middle', weight: 700 }),
  text(X(bx(20)) + 8, (Y(by(16)) + Y(by(12))) / 2 + 6, 'Δx₂ = −4', { size: 15.5, color: C.amber, weight: 700 }),
  dot(bx(25), by(10)), dot(bx(15), by(6), C.muted), dot(bx(35), by(12), C.pink),
  text(X(bx(25)) + 12, Y(by(10)) + 18, 'A', { size: 19, weight: 700 }),
  text(X(bx(15)) + 12, Y(by(6)) + 6, 'B', { size: 19, weight: 700, color: C.muted }),
  text(X(bx(35)) + 12, Y(by(12)) + 6, 'C', { size: 19, weight: 700, color: C.pink }),
  text(X(0) + 12, Y(by(20)) - 10, 'm/p₂ = 20', { size: 16, color: C.teal, weight: 700 }),
  text(X(bx(50)) + 8, Y(0) - 12, 'm/p₁ = 50', { size: 16, color: C.teal, weight: 700 }),
  yTick(by(20), '20'), yTick(by(10), '10'), xTick(bx(25), '25'), xTick(bx(50), '50'),
  ...guides(bx(25), by(10)),
  ...legend([
    { kind: 'line', color: C.teal, label: 'Budgetgerade: 2x₁ + 5x₂ = 100' },
    { kind: 'area', color: C.teal, label: 'bezahlbar (budget set)' },
    { kind: 'line', color: C.amber, dash: '6 5', label: 'Steigung −4/10 = −p₁/p₂' },
    { kind: 'dot', color: C.text, label: 'A: gibt alles aus' },
    { kind: 'dot', color: C.muted, label: 'B: Geld bleibt übrig' },
    { kind: 'dot', color: C.pink, label: 'C: zu teuer' },
  ], { width: 284 }),
]);

// ---- 7. Budget changes: income ↑ (parallel), p₁ ↑ (rotation); scale x = x₁/8, y = x₂/3.2 -----
const sx = (x1) => x1 / 8;
const sy = (x2) => x2 / 3.2;
const budgetShifts = svg('Einkommen steigt: Parallelverschiebung. Preis von Gut 1 steigt: Drehung um den x₂-Achsenabschnitt', [
  ...GOODS_AXES(),
  line(0, sy(20), sx(50), 0, { color: C.teal }),
  line(0, sy(30), sx(75), 0, { color: C.teal, dash: '10 8' }),
  line(0, sy(20), sx(25), 0, { color: C.amber }),
  line(sx(22), sy(11.2), sx(32.5), sy(15.7), { color: C.teal, width: 2.5, arrow: 'teal' }),
  `<path d="M ${X(sx(47))} ${Y(0) - 14} Q ${X(sx(38))} ${Y(sy(4))} ${X(sx(28))} ${Y(0) - 14}" fill="none" stroke="${C.amber}" stroke-width="2.5" marker-end="url(#arr-amber)"/>`,
  text(X(sx(75)), Y(0) - 12, '75', { size: 18, italic: true, anchor: 'middle' }),
  yTick(sy(20), '20'), yTick(sy(30), '30'), xTick(sx(25), '25'), xTick(sx(50), '50'),
  ...legend([
    { kind: 'line', color: C.teal, label: 'Ausgang: m = 100, p₁ = 2, p₂ = 5' },
    { kind: 'line', color: C.teal, dash: '10 8', label: 'm = 150: parallel nach außen' },
    { kind: 'note', label: '(parallel shift) – Steigung bleibt' },
    { kind: 'line', color: C.amber, label: 'p₁ = 4: Drehung nach innen' },
    { kind: 'note', label: '(rotation) – steiler, 25 statt 50' },
  ], { width: 300 }),
]);

// ---- 8. Indifference curves and the marginal rate of substitution ------------------------
const U = (c) => (x) => c / x;
const indifference = svg('Drei Indifferenzkurven; Kurven weiter vom Ursprung entfernt bedeuten höheren Nutzen', [
  ...GOODS_AXES(),
  curve(U(6), 0.6, 9.6, { color: C.violet }),
  curve(U(12), 1.2, 9.6, { color: C.violet }),
  curve(U(21), 2.1, 9.6, { color: C.violet }),
  line(1.6, 1.6, 5.25, 5.25, { color: C.green, width: 2.5, arrow: 'green' }),
  text(X(5.4), Y(5.55), 'höherer Nutzen', { size: 17, color: C.green, weight: 700 }),
  text(X(5.4), Y(5.55) + 20, '(higher utility)', { size: 15, color: C.muted }),
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
    { kind: 'line', color: C.violet, label: 'Indifferenzkurven U₁ < U₂ < U₃' },
    { kind: 'line', color: C.amber, dash: '6 5', label: 'GRS (MRS) ≈ Δx₂ / Δx₁ (A → B)' },
  ], { width: 300 }),
]);

// ---- 9. Budget line and household optimum ----------------------------------------------------
// Budget: x₂ = 6 − 0.75·x₁ (m/p₂ = 6, m/p₁ = 8), tangent to U₂ (x₁·x₂ = 12) in O = (4, 3).
const optimum = svg('Haushaltsoptimum: Die Budgetgerade berührt die höchste erreichbare Indifferenzkurve', [
  ...GOODS_AXES(),
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
  yTick(6, 'm/p₂'), yTick(3, 'x₂∗'), xTick(4, 'x₁∗'), xTick(8, 'm/p₁'),
  ...legend([
    { kind: 'line', color: C.teal, label: 'Budgetgerade p₁x₁ + p₂x₂ = m' },
    { kind: 'area', color: C.teal, label: 'bezahlbare Bündel (budget set)' },
    { kind: 'dot', color: C.text, label: 'O: Optimum, GRS = GRT' },
    { kind: 'dot', color: C.muted, label: 'auf U₁: bezahlbar, nicht optimal' },
  ], { width: 296 }),
]);

// ---- 10. MRS vs. MRT: same budget line; A and C lie on a lower indifference curve -----------
// U_A: x₁·x₂ = 7.3125 through A = (1.5, 4.875) and C = (6.5, 1.125); tangents show the MRS there.
const uA = 1.5 * 4.875;
const mrsVsMrt = svg('GRS gegen GRT: In A ist die Indifferenzkurve steiler als die Budgetgerade, in C flacher; das Optimum O liegt dazwischen', [
  ...GOODS_AXES(),
  curve(U(uA), 0.76, 9.6, { color: C.violet, width: 2.5 }),
  curve(U(12), 1.2, 9.6, { color: C.violet, width: 3 }),
  line(0, 6, 8, 0, { color: C.teal }),
  line(1.05, 4.875 + 3.25 * 0.45, 1.95, 4.875 - 3.25 * 0.45, { color: C.amber, width: 2.5, dash: '6 5' }),
  line(5.3, 1.125 + 0.173 * 1.2, 7.7, 1.125 - 0.173 * 1.2, { color: C.amber, width: 2.5, dash: '6 5' }),
  line(2.0, 4.85, 3.35, 3.84, { color: C.text, width: 2.5, arrow: 'text' }),
  line(6.0, 1.85, 4.65, 2.86, { color: C.text, width: 2.5, arrow: 'text' }),
  dot(1.5, 4.875), dot(6.5, 1.125), dot(4, 3, C.text, 7),
  text(X(1.5) - 12, Y(4.875) + 6, 'A', { size: 19, weight: 700, anchor: 'end' }),
  text(X(6.5) + 10, Y(1.125) + 24, 'C', { size: 19, weight: 700 }),
  text(X(4) + 12, Y(3) - 12, 'O', { size: 20, weight: 700 }),
  text(X(1.5) + 18, Y(4.875) - 30, 'A: GRS > GRT → mehr x₁', { size: 15.5, color: C.text, weight: 700 }),
  text(X(6.2), Y(0.5), 'C: GRS < GRT → weniger x₁', { size: 15.5, color: C.text, weight: 700, anchor: 'end' }),
  text(X(9.6) + 6, Y(uA / 9.6) + 2, 'U_A', { size: 17, color: C.violet, weight: 700 }),
  text(X(9.6) + 6, Y(1.25) - 6, 'U₂', { size: 18, color: C.violet, weight: 700 }),
  ...legend([
    { kind: 'line', color: C.teal, label: 'Budgetgerade: Steigung = GRT' },
    { kind: 'line', color: C.violet, label: 'Indifferenzkurve: Steigung = GRS' },
    { kind: 'line', color: C.amber, dash: '6 5', label: 'Tangente: GRS im Punkt' },
    { kind: 'dot', color: C.text, label: 'O: GRS = GRT (Optimum)' },
  ], { width: 300 }),
]);

// ---- 11. Substitution and income effect (price of good 1 falls) ----------------------------
// m = 6, p₂ = 1; p₁ 0.75 → 0.5.  O₁ = (4, 3) on U₁ (x₁x₂ = 12), O₂ = (6, 3) on U₂ (x₁x₂ = 18).
// Compensated line (new slope −0.5, tangent to U₁): H = (√24, √6) ≈ (4.90, 2.45).
const hx = Math.sqrt(24);
const hy = Math.sqrt(6);
const slutsky = svg('Preis von Gut 1 sinkt: Substitutionseffekt von O₁ nach H, Einkommenseffekt von H nach O₂', [
  ...GOODS_AXES(),
  curve(U(12), 1.25, 9.6, { color: C.violet, width: 3 }),
  curve(U(18), 1.88, 9.6, { color: C.violet, width: 3 }),
  line(0, 6, 8, 0, { color: C.teal }),
  line(0, 6, 10, 1, { color: C.amber }),
  line(0, hy + hx / 2, hx + 2 * hy, 0, { color: C.muted, width: 2.5, dash: '8 6' }),
  line(4, 0, 4, 3, { color: C.guide, width: 2, dash: '6 6' }),
  line(hx, 0, hx, hy, { color: C.guide, width: 2, dash: '6 6' }),
  line(6, 0, 6, 3, { color: C.guide, width: 2, dash: '6 6' }),
  dot(4, 3), dot(hx, hy, C.muted), dot(6, 3),
  text(X(4) - 10, Y(3) - 12, 'O₁', { size: 18, weight: 700, anchor: 'end' }),
  text(X(hx) + 10, Y(hy) + 22, 'H', { size: 18, weight: 700, color: C.muted }),
  text(X(6) + 10, Y(3) - 12, 'O₂', { size: 18, weight: 700 }),
  ...bracket(4, hx, 0.5, 'SE', { color: 'green', below: false }),
  ...bracket(hx, 6, 0.5, 'EE', { color: 'blue', below: false }),
  text(X(1.25) - 6, Y(9.6) + 14, 'U₁', { size: 18, color: C.violet, weight: 700, anchor: 'end' }),
  text(X(1.88) + 8, Y(9.6) + 14, 'U₂', { size: 18, color: C.violet, weight: 700 }),
  xTick(4, 'x₁⁰'), xTick(6, 'x₁¹'),
  ...legend([
    { kind: 'line', color: C.teal, label: 'alte Budgetgerade (p₁ hoch)' },
    { kind: 'line', color: C.amber, label: 'neue Budgetgerade (p₁ niedrig)' },
    { kind: 'line', color: C.muted, dash: '8 6', label: 'Hilfsgerade: alter Nutzen' },
    { kind: 'line', color: C.green, label: 'O₁ → H: Substitutionseffekt' },
    { kind: 'line', color: C.blue, label: 'H → O₂: Einkommenseffekt' },
  ], { width: 296 }),
]);

for (const [name, content] of Object.entries({
  '01-supply-demand/img/market-equilibrium.svg': equilibrium,
  '01-supply-demand/img/demand-movement-vs-shift.svg': demandShift,
  '01-supply-demand/img/price-floor-ceiling.svg': priceControls,
  '01-supply-demand/img/price-ceiling-welfare.svg': ceilingWelfare,
  '01-supply-demand/img/world-market-imports.svg': worldImports,
  '02-indifference-curves/img/budget-line.svg': budgetLine,
  '02-indifference-curves/img/budget-shifts.svg': budgetShifts,
  '02-indifference-curves/img/indifference-curves.svg': indifference,
  '02-indifference-curves/img/consumer-optimum.svg': optimum,
  '02-indifference-curves/img/mrs-vs-mrt.svg': mrsVsMrt,
  '02-indifference-curves/img/substitution-income-effect.svg': slutsky,
})) {
  fs.mkdirSync(path.dirname(path.join(OUT, name)), { recursive: true });
  fs.writeFileSync(path.join(OUT, name), content);
  console.log('  wrote ' + name);
}
