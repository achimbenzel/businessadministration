// A chapter's sections: Übersicht, Folien, Begriffe, Formeln, Theorie,
// Interaktiv, Übungen. Each block may name its section (`tab`); blocks without one are
// placed by their type, and headings / dividers go with the block after them.
// Pure functions — the chapter page and the tests use them alike.
import { stripInline } from './inline.js';
import { isEmptyBlock } from './blocks.js';

export const SECTIONS = [
  { key: 'overview', color: 'blue', label: { de: 'Übersicht', en: 'Overview' } },
  { key: 'slides', color: 'amber', label: { de: 'Folien', en: 'Slides' } },
  { key: 'terms', color: 'violet', label: { de: 'Begriffe', en: 'Key terms' } },
  { key: 'formulas', color: 'teal', label: { de: 'Formeln', en: 'Formulas' } },
  { key: 'theory', color: 'green', label: { de: 'Theorie', en: 'Theory' } },
  { key: 'interactive', color: 'orange', label: { de: 'Interaktiv', en: 'Interactive' } },
  { key: 'practice', color: 'pink', label: { de: 'Übungen', en: 'Practice' } },
];
export const SECTION_KEYS = SECTIONS.map((s) => s.key);
export const sectionOf = (key) => SECTIONS.find((s) => s.key === key) || SECTIONS.find((s) => s.key === 'theory');
export const sectionLabel = (key, lang = 'de') => sectionOf(key).label[lang] || sectionOf(key).label.de;

const BY_TYPE = {
  slides: 'slides',
  definition: 'terms',
  formula: 'formulas',
  supplyDemand: 'interactive',
  consumerChoice: 'interactive',
  quiz: 'practice',
  flashcard: 'practice',
};
const FOLLOWS_NEXT = new Set(['heading', 'divider']);

/** The section of every block (same order as `blocks`). */
export function resolveSections(blocks) {
  const out = new Array(blocks.length);
  let next = 'theory';
  for (let i = blocks.length - 1; i >= 0; i -= 1) {
    const b = blocks[i];
    if (SECTION_KEYS.includes(b.tab)) out[i] = b.tab;
    else if (FOLLOWS_NEXT.has(b.type)) out[i] = next;
    else out[i] = BY_TYPE[b.type] || 'theory';
    next = out[i];
  }
  return out;
}

const firstLine = (s) => String(s || '').split('\n').find((l) => l.trim()) || '';
const plain = (s, max = 90) => {
  const t = stripInline(String(s || '')).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/**
 * Contents entries of a section's blocks: headings, terms, formulas, demos;
 * runs of quiz questions / flashcards become one entry with a count (n) — a
 * heading right above such a run ("Quiz", "Karteikarten") merges into it.
 */
export function sectionItems(blocks, lang = 'de') {
  const items = [];
  let heading = null; // the entry of the block just before, if it was a heading
  for (const b of blocks) {
    let it = null;
    const above = heading;
    heading = null;
    switch (b.type) {
      case 'heading': it = { kind: 'heading', level: b.level === 3 ? 3 : 2, title: plain(b.text) }; break;
      case 'definition': it = { kind: 'term', title: plain(b.term) }; break;
      case 'formula': it = { kind: 'formula', title: plain(b.title || firstLine(b.text)) }; break;
      case 'supplyDemand': it = { kind: 'demo', title: plain(b.title) || (lang === 'en' ? 'Supply & demand' : 'Angebot & Nachfrage') }; break;
      case 'consumerChoice': it = { kind: 'demo', title: plain(b.title) || (lang === 'en' ? 'Consumer optimum' : 'Haushaltsoptimum') }; break;
      case 'slides': {
        const n = (b.slides || []).length;
        const what = lang === 'en' ? `${n} ${n === 1 ? 'slide' : 'slides'}` : `${n} ${n === 1 ? 'Folie' : 'Folien'}`;
        it = { kind: 'slides', title: plain(b.title) ? `${plain(b.title)} · ${what}` : what };
        break;
      }
      case 'quiz': case 'flashcard': {
        const kind = b.type === 'quiz' ? 'quiz' : 'cards';
        const last = items[items.length - 1];
        if (last && last.kind === kind && last.run) { last.n += 1; continue; }
        if (above) { Object.assign(above, { kind, n: 1, run: true }); delete above.level; continue; }
        it = { kind, n: 1, run: true };
        break;
      }
      default: break;
    }
    if (it && (it.title || it.run)) {
      const entry = { id: b.id, n: 1, ...it };
      items.push(entry);
      if (it.kind === 'heading') heading = entry;
    }
  }
  for (const it of items) {
    if (it.kind === 'quiz') it.title = lang === 'en' ? `Quiz · ${it.n} ${it.n === 1 ? 'question' : 'questions'}` : `Quiz · ${it.n} ${it.n === 1 ? 'Frage' : 'Fragen'}`;
    if (it.kind === 'cards') it.title = lang === 'en' ? `Flashcards · ${it.n}` : `Karteikarten · ${it.n}`;
    delete it.run;
  }
  return items;
}

/** What a section's count in the tab bar counts. */
function countOf(key, blocks, items) {
  const n = (types) => blocks.filter((b) => types.includes(b.type)).length;
  if (key === 'terms') return n(['definition']);
  if (key === 'formulas') return n(['formula']);
  if (key === 'slides') return blocks.reduce((sum, b) => sum + (b.type === 'slides' ? (b.slides || []).length : 0), 0);
  if (key === 'interactive') return n(['supplyDemand', 'consumerChoice']);
  if (key === 'practice') return n(['quiz', 'flashcard']) || items.filter((i) => i.kind === 'heading').length;
  return items.filter((i) => i.kind === 'heading' && i.level === 2).length;
}

/**
 * Sections of a chapter that have visible content, in tab order:
 * [{ key, label, color, blocks, items, count }]. `of` maps block id → section.
 * `tabbed` is false when there's nothing to split (fewer than two sections).
 */
export function buildSections(blocks, { lang = 'de', includeEmpty = false } = {}) {
  const keys = resolveSections(blocks);
  const of = new Map();
  const groups = new Map(SECTION_KEYS.map((k) => [k, []]));
  blocks.forEach((b, i) => {
    of.set(b.id, keys[i]);
    if (includeEmpty || !isEmptyBlock(b)) groups.get(keys[i]).push(b);
  });
  const list = SECTIONS
    .map((s) => {
      const bs = groups.get(s.key);
      const items = sectionItems(bs, lang);
      return { key: s.key, color: s.color, label: s.label[lang] || s.label.de, blocks: bs, items, count: countOf(s.key, bs, items) };
    })
    .filter((s) => s.blocks.some((b) => b.type !== 'divider'));
  const content = list.filter((s) => s.key !== 'overview');
  const tabbed = content.length >= 2;
  // The overview tab is always there once a chapter is split up — it's the map.
  if (tabbed && !list.some((s) => s.key === 'overview')) {
    list.unshift({ key: 'overview', color: 'blue', label: sectionLabel('overview', lang), blocks: [], items: [], count: 0 });
  }
  return { list, of, tabbed };
}
