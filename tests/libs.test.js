// Pure functions: Markdown subset, normalizers, file names, host check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, parseParagraphs, safeHref, stripInline } from '../src/lib/inline.js';
import { normalizeChapter, normalizeUrl, blockText } from '../server/schema.js';
import { str, num, isId } from '../server/schema/base.js';
import { sanitize } from '../server/files.js';
import { isAllowedHost } from '../server/http.js';
import { resolveSections, buildSections, sectionLabel, sectionItems } from '../src/lib/chapterTabs.js';
import { parseMath, mathToPlain } from '../src/lib/math.js';
import { fmtUpdated } from '../src/lib/format.js';

test('inline markdown → tokens', () => {
  assert.deepEqual(parseInline('a **b** c'), [{ t: 'text', v: 'a ' }, { t: 'b', children: [{ t: 'text', v: 'b' }] }, { t: 'text', v: ' c' }]);
  assert.deepEqual(parseInline('*i* und _j_').filter((t) => t.t === 'i').length, 2);
  assert.deepEqual(parseInline('==Merke=='), [{ t: 'mark', children: [{ t: 'text', v: 'Merke' }] }]);
  assert.deepEqual(parseInline('`x*y*z`'), [{ t: 'code', v: 'x*y*z' }]);
  assert.deepEqual(parseInline('2 * 3 * 4'), [{ t: 'text', v: '2 * 3 * 4' }]); // not italics
  const link = parseInline('[HS](https://hs-mainz.de)')[0];
  assert.equal(link.t, 'link');
  assert.equal(link.href, 'https://hs-mainz.de');
  assert.equal(parseInline('siehe https://example.com/a.')[1].href, 'https://example.com/a');
});

test('links are only ever http(s) or mailto', () => {
  assert.deepEqual(parseInline('[x](javascript:alert(1))').map((t) => t.t), ['text']);
  assert.equal(safeHref('data:text/html,hi'), null);
  assert.equal(safeHref('www.hs-mainz.de'), 'https://www.hs-mainz.de');
  assert.equal(normalizeUrl('javascript:alert(1)'), '');
  assert.equal(normalizeUrl('hs-mainz.de/x'), 'https://hs-mainz.de/x');
  assert.equal(normalizeUrl('HTTPS://A.de'), 'HTTPS://A.de');
});

test('paragraphs and lists', () => {
  assert.deepEqual(parseParagraphs('Eins\nzwei\n\n- a\n- b\n1. x\n2. y\nEnde'), [
    { type: 'p', text: 'Eins\nzwei' },
    { type: 'ul', items: ['a', 'b'] },
    { type: 'ol', items: ['x', 'y'] },
    { type: 'p', text: 'Ende' },
  ]);
  assert.equal(stripInline('**fett** und [Link](https://a.de)'), 'fett und Link');
});

test('normalizers fill defaults and clamp', () => {
  assert.equal(str(null), '');
  assert.equal(str('abc', 2), 'ab');
  assert.equal(num('x', 0, 10, 5), 5);
  assert.equal(num('99', 0, 10, 5), 10);
  assert.equal(isId(undefined), false);
  const c = normalizeChapter({});
  assert.ok(isId(c.id));
  assert.equal(c.title, 'Unbenanntes Kapitel');
  assert.equal(c.status, 'draft');
  assert.deepEqual(c.blocks, []);
  assert.equal(normalizeChapter({ status: 'secret' }).status, 'draft');
  assert.equal(blockText({ type: 'quiz', question: 'Q', options: [{ text: 'A' }], explanation: 'E' }), 'Q A E');
});

test('file names are made safe', () => {
  assert.equal(sanitize('../../etc/passwd'), 'passwd');
  assert.equal(sanitize('Übung Nr. 1 (Lösung).pdf'), 'Ubung-Nr.-1-Losung-.pdf');
  assert.equal(sanitize('Straße.png'), 'Strasse.png');
  assert.equal(sanitize('...'), 'datei');
  assert.equal(sanitize('a\\b\\c.txt'), 'c.txt');
});

test('host allowlist', () => {
  for (const h of ['localhost:4200', '127.0.0.1', '[::1]:4300', 'laptop', 'pc.local', 'x.tail9.ts.net']) assert.ok(isAllowedHost(h), h);
  for (const h of ['evil.com', 'lernen.example.de']) assert.equal(isAllowedHost(h), false, h);
});

test('demo maths: axes, steps, market and consumer', async () => {
  const { niceMax, ticks, niceStep, snap, market, priceControl, consumer, indifferenceX2 } = await import('../src/lib/demos.js');
  assert.equal(niceMax(75), 80);
  assert.equal(niceMax(150), 150);
  assert.equal(niceMax(31), 40);
  assert.deepEqual(ticks(80), [0, 20, 40, 60, 80]);
  assert.deepEqual(ticks(150), [0, 50, 100, 150]);
  assert.equal(niceStep(170), 2);
  assert.equal(snap(0.30000000004, 0.1), 0.3);

  // The worked example of the Supply & Demand chapter.
  const m = market({ a: 100, b: 2, c: -20, d: 4 });
  assert.deepEqual([m.pStar, m.qStar, m.cs, m.ps], [20, 60, 900, 450]);
  assert.equal(m.valid, true);
  // Supply already positive at P = 0: PS is the trapezoid under the supply curve.
  const m2 = market({ a: 100, b: 2, c: 10, d: 2 }); // P* = 22.5, Q* = 55
  assert.equal(m2.ps, 10 * 22.5 + 22.5 ** 2);
  assert.equal(market({ a: 10, b: 1, c: 20, d: 1 }).valid, false);

  assert.deepEqual(priceControl({ a: 100, b: 2, c: -20, d: 4 }, 'ceiling', 15), { qd: 70, qs: 40, binding: true, gap: 30, traded: 40 });
  assert.equal(priceControl({ a: 100, b: 2, c: -20, d: 4 }, 'ceiling', 25).binding, false);
  assert.equal(priceControl({ a: 100, b: 2, c: -20, d: 4 }, 'floor', 25).gap, 30);

  // The worked example of the Indifference Curves chapter.
  const c = consumer({ m: 100, p1: 2, p2: 5, alpha: 0.5 });
  assert.deepEqual([c.x1, c.x2, c.mrs], [25, 10, 0.4]);
  assert.ok(Math.abs(indifferenceX2(c.u, 0.5, 25) - 10) < 1e-9);
});

test('market: surplus areas A, B, C … add up in every situation', async () => {
  const { analyze, scenarios, centroid } = await import('../src/lib/market.js');
  const base = { a: 100, b: 2, c: -20, d: 4 };
  const val = (r, id) => r.regions.list.find((x) => x.id === id)?.val ?? 0;
  const sum = (r, who) => r.regions.sums.find((s) => s[0] === who)[2];
  const near = (x, y) => assert.ok(Math.abs(x - y) < 1e-6, `${x} ≠ ${y}`);

  const closed = analyze({ ...base, mode: 'closed' });
  assert.deepEqual([closed.P, closed.Q, closed.CS, closed.PS, closed.W], [20, 60, 900, 450, 1350]);
  assert.deepEqual(closed.regions.list.map((x) => x.id), ['A', 'B']);

  // Price ceiling 15: 40 units traded, shortage 30, deadweight loss C + D = 150.
  const ceil = analyze({ ...base, mode: 'ceiling', pc: 15 });
  assert.deepEqual([ceil.Q, ceil.gap, ceil.CS, ceil.PS, ceil.dwl], [40, 30, 1000, 200, 150]);
  near(val(ceil, 'A') + val(ceil, 'B'), ceil.CS);
  near(val(ceil, 'C') + val(ceil, 'D'), ceil.dwl);
  near(sum(ceil, 'consumers'), ceil.CS - closed.CS);
  near(sum(ceil, 'producers'), ceil.PS - closed.PS);

  // Price floor 25: 50 units sold, surplus 30.
  const floor = analyze({ ...base, mode: 'floor', pc: 25 });
  assert.deepEqual([floor.Q, floor.gap, floor.CS, floor.PS, floor.dwl], [50, 30, 625, 687.5, 37.5]);
  near(val(floor, 'B') + val(floor, 'E'), floor.PS);
  near(sum(floor, 'producers'), floor.PS - closed.PS);

  // World price 12: imports 48, gain from trade C = 192.
  const imp = analyze({ ...base, mode: 'world', pw: 12, tariff: 0 });
  assert.deepEqual([imp.qd, imp.qs, imp.trade, imp.CS, imp.PS], [76, 28, 48, 1444, 98]);
  near(val(imp, 'C'), imp.W - closed.W);
  near(sum(imp, 'consumers'), imp.CS - closed.CS);

  // Tariff 4 on top: price 16, imports 24, revenue 96, deadweight loss D + F = 48.
  const tar = analyze({ ...base, mode: 'world', pw: 12, tariff: 4 });
  assert.deepEqual([tar.P, tar.trade, tar.rev, tar.dwl], [16, 24, 96, 48]);
  near(val(tar, 'D') + val(tar, 'F'), tar.dwl);
  near(val(tar, 'E'), tar.rev);
  near(sum(tar, 'consumers'), tar.CS - imp.CS);

  // World price 28: exports 48.
  const exp = analyze({ ...base, mode: 'world', pw: 28, tariff: 0 });
  assert.equal(exp.trade, -48);
  near(val(exp, 'C'), exp.W - closed.W);

  // Not binding / prohibitive / supply positive at P = 0 / no equilibrium.
  assert.equal(analyze({ ...base, mode: 'ceiling', pc: 25 }).nb, true);
  assert.deepEqual(analyze({ ...base, mode: 'world', pw: 12, tariff: 30 }).notes, ['prohibitive']);
  const posC = analyze({ a: 100, b: 2, c: 10, d: 2, mode: 'closed' }); // P* = 22.5, Q* = 55
  near(posC.PS, 10 * 22.5 + 22.5 ** 2);
  assert.equal(analyze({ a: 10, b: 1, c: 20, d: 1, mode: 'closed' }).invalid, true);

  const sc = scenarios(base);
  assert.equal(sc.ceiling.pc, 15);
  assert.equal(sc.supplyUp.ss, 15);
  assert.deepEqual(centroid([[0, 0], [3, 0], [0, 3]]), [1, 1]);
});

test('chapter sections: explicit tab, type default, headings follow the next block', () => {
  const blocks = [
    { id: 'h1', type: 'heading', text: 'Begriffe', level: 2 },
    { id: 'd1', type: 'definition', term: '**Nachfrage**', text: 'x' },
    { id: 'd2', type: 'definition', term: 'Angebot', text: 'y', tab: 'theory' },
    { id: 'h2', type: 'heading', text: 'Formeln', level: 2 },
    { id: 'f1', type: 'formula', title: '', text: 'Q_D = a − b·P\nmehr' },
    { id: 't1', type: 'text', text: 'Einleitung', tab: 'overview' },
    { id: 'x1', type: 'text', text: '' },                    // empty: not shown, no section of its own
    { id: 's1', type: 'supplyDemand', title: '' },
    { id: 'q1', type: 'quiz', question: 'a?' },
    { id: 'q2', type: 'quiz', question: 'b?' },
    { id: 'c1', type: 'flashcard', front: 'c', back: 'd' },
    { id: 'v1', type: 'divider' },
  ];
  assert.deepEqual(resolveSections(blocks),
    ['terms', 'terms', 'theory', 'formulas', 'formulas', 'overview', 'theory', 'interactive', 'practice', 'practice', 'practice', 'theory']);

  const s = buildSections(blocks, { lang: 'de' });
  assert.equal(s.tabbed, true);
  assert.deepEqual(s.list.map((x) => x.key), ['overview', 'terms', 'formulas', 'theory', 'interactive', 'practice']);
  assert.equal(s.of.get('d2'), 'theory');
  const terms = s.list.find((x) => x.key === 'terms');
  assert.deepEqual(terms.items.map((i) => i.title), ['Begriffe', 'Nachfrage']); // markup stripped
  assert.equal(terms.count, 1);
  const formulas = s.list.find((x) => x.key === 'formulas');
  assert.equal(formulas.items[1].title, 'Q_D = a − b·P'); // first line when there's no title
  const practice = s.list.find((x) => x.key === 'practice');
  assert.deepEqual(practice.items.map((i) => [i.kind, i.n, i.title]), [['quiz', 2, 'Quiz · 2 Fragen'], ['cards', 1, 'Karteikarten · 1']]);
  assert.equal(practice.count, 3);
  assert.equal(s.list.find((x) => x.key === 'interactive').items[0].title, 'Angebot & Nachfrage');
  assert.equal(sectionLabel('practice', 'en'), 'Practice');

  // One section only (plus dividers): not split into tabs, no overview added.
  const plain = buildSections([{ id: 'a', type: 'text', text: 'x' }, { id: 'b', type: 'divider' }, { id: 'c', type: 'heading', text: 'y' }]);
  assert.equal(plain.tabbed, false);
  assert.deepEqual(plain.list.map((x) => x.key), ['theory']);
  // Two content sections: tabbed, with an (empty) overview tab in front.
  const two = buildSections([{ id: 'a', type: 'text', text: 'x' }, { id: 'b', type: 'quiz', question: 'q' }], { lang: 'en' });
  assert.deepEqual(two.list.map((x) => [x.key, x.blocks.length]), [['overview', 0], ['theory', 1], ['practice', 1]]);
  assert.equal(two.list[0].label, 'Overview');
});

test('formula syntax: exponents, indices, Σ / Π with limits, fractions, roots', () => {
  assert.deepEqual(parseMath('a^{x+y}'), [{ t: 'text', v: 'a' }, { t: 'scripts', sub: null, sup: [{ t: 'text', v: 'x+y' }] }]);
  assert.deepEqual(parseMath('x^10')[1].sup, [{ t: 'text', v: '10' }]);           // a digit run
  assert.deepEqual(parseMath('a^xy').slice(1), [{ t: 'scripts', sub: null, sup: [{ t: 'text', v: 'x' }] }, { t: 'text', v: 'y' }]);
  assert.deepEqual(parseMath('P_max')[1].sub, [{ t: 'text', v: 'max' }]);         // an index is a word
  assert.deepEqual(parseMath('x^(1−α)')[1].sup, [{ t: 'text', v: '1−α' }]);       // (group) without the brackets
  const both = parseMath('x_i^2')[1];
  assert.deepEqual([both.sub[0].v, both.sup[0].v], ['i', '2']);
  const sum = parseMath('\\sum_{i=1}^{n} a_i')[0];
  assert.deepEqual([sum.t, sum.sym, sum.sub[0].v, sum.sup[0].v], ['op', 'Σ', 'i=1', 'n']);
  assert.equal(parseMath('\\prod_{t=1}^{n} x')[0].sym, 'Π');
  assert.equal(mathToPlain('\\frac{a^x}{a^y} = a^{x−y}'), '(a^x)/(a^y) = a^(x−y)');
  assert.equal(mathToPlain('\\sqrt[3]{8} \\cdot 2 \\neq 5 \\%'), '3√8 · 2 ≠ 5 %');
  assert.equal(mathToPlain('\\bar{x}'), 'x\u0304');
  // Stray or unfinished syntax stays text.
  assert.equal(mathToPlain('2 ^ 3 and a^ and 5_'), '2 ^ 3 and a^ and 5_');
  assert.equal(mathToPlain('\\unknown{x}'), '\\unknownx');
  // $…$ in text is a formula — but not "5 $ und 10 $".
  assert.deepEqual(parseInline('Regel: $a^2$!').map((t) => t.t), ['text', 'math', 'text']);
  assert.equal(parseInline('kostet 5 $ und 10 $').length, 1);
  assert.equal(stripInline('Summe $\\sum_{i=1}^{n} i$'), 'Summe Σ_(i=1)^n i');
});

test('chapter sections: slide decks get their own "Folien" section, counted by slides', () => {
  const blocks = [
    { id: 'o', type: 'text', text: 'Intro', tab: 'overview' },
    { id: 's', type: 'slides', title: 'Potenzgesetze', slides: [{ title: 'a' }, { title: 'b' }, { title: 'c' }] },
    { id: 'q', type: 'quiz', question: 'q' },
  ];
  const s = buildSections(blocks, { lang: 'de' });
  assert.deepEqual(s.list.map((x) => x.key), ['overview', 'slides', 'practice']);
  const slides = s.list.find((x) => x.key === 'slides');
  assert.equal(slides.count, 3);
  assert.deepEqual(slides.items.map((i) => [i.kind, i.title]), [['slides', 'Potenzgesetze · 3 Folien']]);
});

test('"zuletzt aktualisiert": date and time, within a week with the relative time', () => {
  const now = Date.UTC(2026, 9, 29, 12, 0);
  assert.match(fmtUpdated(now - 3 * 86400000, now), /^vor 3 Tagen · \d{2}\.\d{2}\.2026, \d{2}:\d{2} Uhr$/);
  assert.match(fmtUpdated(now - 20 * 86400000, now), /^\d{2}\.\d{2}\.2026, \d{2}:\d{2} Uhr$/);
  assert.equal(fmtUpdated(0, now), '');
});

test('contents: a heading right above quiz questions or flashcards merges into one entry', () => {
  const items = sectionItems([
    { id: 'h1', type: 'heading', text: 'Aufgaben' }, { id: 't', type: 'text', text: 'x' },
    { id: 'h2', type: 'heading', text: 'Karteikarten' }, { id: 'c1', type: 'flashcard' }, { id: 'c2', type: 'flashcard' },
    { id: 'h3', type: 'heading', text: 'Quiz' }, { id: 'q1', type: 'quiz' },
  ]);
  assert.deepEqual(items.map((i) => [i.id, i.kind, i.title]), [
    ['h1', 'heading', 'Aufgaben'], ['h2', 'cards', 'Karteikarten · 2'], ['h3', 'quiz', 'Quiz · 1 Frage'],
  ]);
});
