// Chapters (Kapitel) of a subject: a title, a short summary and a list of
// blocks — Notion-style building blocks for the learning content.
import { bool, id, line, list, num, oneOf, str, subId, time } from './base.js';

export const CHAPTER_STATUS = ['draft', 'published'];
// Language of a chapter's content: the labels inside its blocks follow it ("Check answer" …).
export const CHAPTER_LANGS = ['de', 'en'];

// Every block type and how its fields are cleaned. Unknown types are dropped.
// Keep in sync with src/lib/blocks.js (labels, icons, defaults for the editor).
const TEXT_MAX = 20000;
const CALLOUT_VARIANTS = ['info', 'tip', 'warning', 'important'];
const LIST_STYLES = ['bullet', 'number'];
const DEMO_CONTROLS = ['none', 'ceiling', 'floor', 'world'];
// The section (tab) of the chapter a block belongs to. '' = decided by its type
// (definition → terms, formula → formulas …, see src/lib/chapterTabs.js).
export const BLOCK_TABS = ['overview', 'slides', 'terms', 'formulas', 'theory', 'interactive', 'practice'];

// A file of a chapter lives in its own folder: chapters/<chapterId>/<name>.
// Nothing else may be referenced (no ../, no other chapter's files).
export const chapterFile = (chapterId, v) => (
  typeof v === 'string' && v.startsWith(`chapters/${chapterId}/`) && !v.includes('..') && !v.includes('\\')
  && /^[\w./-]+$/.test(v) ? v.slice(0, 300) : ''
);

const normalizeFileRef = (f, chapterId) => ({
  id: subId(f?.id),
  src: chapterFile(chapterId, f?.src),
  name: line(f?.name, 200) || 'Datei',
  size: num(f?.size, 0, 1e12, 0),
  type: line(f?.type, 100),
});

const BLOCKS = {
  heading: (b) => ({ text: line(b.text, 200), level: b.level === 3 ? 3 : 2 }),
  text: (b) => ({ text: str(b.text, TEXT_MAX) }),
  list: (b) => ({ style: oneOf(b.style, LIST_STYLES), items: list(b.items, 200).map((t) => str(t, 2000)) }),
  quote: (b) => ({ text: str(b.text, 4000), source: line(b.source, 200) }),
  divider: () => ({}),
  callout: (b) => ({ variant: oneOf(b.variant, CALLOUT_VARIANTS), title: line(b.title, 200), text: str(b.text, TEXT_MAX) }),
  // termEn / textEn: the English term and a one-line English definition (exams in English).
  definition: (b) => ({ term: line(b.term, 200), text: str(b.text, TEXT_MAX), termEn: line(b.termEn, 200), textEn: str(b.textEn, 4000) }),
  toggle: (b) => ({ title: line(b.title, 300), text: str(b.text, TEXT_MAX) }),
  // A formula with its name, the symbols, an explanation in plain words, an
  // example and an analogy — formulas are learned by understanding them.
  formula: (b) => ({
    title: line(b.title, 200),
    text: str(b.text, 4000),
    caption: line(b.caption, 300),
    variables: list(b.variables, 20)
      .map((v) => ({ symbol: line(v?.symbol, 40), meaning: line(v?.meaning, 300) }))
      .filter((v) => v.symbol || v.meaning),
    explanation: str(b.explanation, TEXT_MAX),
    example: str(b.example, TEXT_MAX),
    analogy: str(b.analogy, TEXT_MAX),
  }),
  flashcard: (b) => ({ front: str(b.front, 4000), back: str(b.back, 8000) }),
  quiz: (b) => ({
    question: str(b.question, 4000),
    options: list(b.options, 10).map((o) => ({ id: subId(o?.id), text: str(o?.text, 1000), correct: bool(o?.correct) })),
    explanation: str(b.explanation, 8000),
  }),
  table: (b) => {
    const rows = list(b.rows, 60).map((r) => list(r, 10).map((c) => str(c, 1000)));
    const cols = Math.max(1, ...rows.map((r) => r.length));
    return { header: b.header !== false, rows: rows.map((r) => [...r, ...Array(cols - r.length).fill('')]) };
  },
  image: (b, chapterId) => ({ src: chapterFile(chapterId, b.src), alt: line(b.alt, 300), caption: line(b.caption, 500) }),
  // A slide deck: one idea per slide — title, formula (lib/math.js syntax),
  // text, example and an optional picture; viewers page through or present it.
  slides: (b, chapterId) => ({
    title: line(b.title, 200),
    slides: list(b.slides, 80).map((s) => ({
      id: subId(s?.id),
      title: line(s?.title, 200),
      formula: str(s?.formula, 2000),
      text: str(s?.text, 6000),
      example: str(s?.example, 4000),
      image: chapterFile(chapterId, s?.image),
      alt: line(s?.alt, 300),
    })),
  }),
  files: (b, chapterId) => ({ items: list(b.items, 50).map((f) => normalizeFileRef(f, chapterId)).filter((f) => f.src) }),
  links: (b) => ({
    items: list(b.items, 50).map((l) => ({ id: subId(l?.id), url: normalizeUrl(l?.url), title: line(l?.title, 200) })),
  }),
  // Interactive demos: the stored numbers are the starting point; viewers change
  // them with sliders (their changes are not saved).
  // Market: Q_D = a − b·P, Q_S = c + d·P; optional price ceiling / floor or a
  // world market (world price, tariff per unit).
  supplyDemand: (b) => ({
    title: line(b.title, 200),
    caption: line(b.caption, 500),
    a: num(b.a, 0.1, 1e6, 100),
    b: num(b.b, 0.001, 1e4, 2),
    c: num(b.c, -1e6, 1e6, -20),
    d: num(b.d, 0.001, 1e4, 4),
    control: oneOf(b.control, DEMO_CONTROLS),
    controlPrice: num(b.controlPrice, 0, 1e6, 0),
    worldPrice: num(b.worldPrice, 0, 1e6, 0),
    tariff: num(b.tariff, 0, 1e6, 0),
  }),
  // Consumer choice: U = x₁^α · x₂^(1−α), budget p₁·x₁ + p₂·x₂ = m.
  consumerChoice: (b) => ({
    title: line(b.title, 200),
    caption: line(b.caption, 500),
    m: num(b.m, 0.1, 1e9, 100),
    p1: num(b.p1, 0.001, 1e6, 2),
    p2: num(b.p2, 0.001, 1e6, 5),
    alpha: num(b.alpha, 0.05, 0.95, 0.5),
  }),
};
export const BLOCK_TYPES = Object.keys(BLOCKS);

// Links must be http(s) (or mailto) — never javascript: or data: URLs. A bare
// "example.com" gets https:// in front.
export function normalizeUrl(v) {
  const s = line(v, 2000);
  if (!s) return '';
  if (/^(https?:\/\/|mailto:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ''; // another scheme
  return `https://${s.replace(/^\/+/, '')}`;
}

export function normalizeBlock(b, chapterId) {
  if (!b || typeof b !== 'object' || !BLOCKS[b.type]) return null;
  return { id: subId(b.id), type: b.type, tab: BLOCK_TABS.includes(b.tab) ? b.tab : '', ...BLOCKS[b.type](b, chapterId) };
}

export function normalizeChapter(c) {
  const chapterId = id(c?.id);
  const seen = new Set();
  const blocks = list(c?.blocks, 500)
    .map((b) => normalizeBlock(b, chapterId))
    .filter(Boolean)
    .map((b) => { // block ids must be unique within a chapter (React keys, editor)
      while (seen.has(b.id)) b.id = subId();
      seen.add(b.id);
      return b;
    });
  return {
    id: chapterId,
    subjectId: typeof c?.subjectId === 'string' ? c.subjectId.slice(0, 40) : '',
    title: line(c?.title, 200) || 'Unbenanntes Kapitel',
    summary: str(c?.summary, 1000),
    status: oneOf(c?.status, CHAPTER_STATUS),
    lang: oneOf(c?.lang, CHAPTER_LANGS),
    blocks,
    order: num(c?.order, 0, 1e6, 0),
    rev: num(c?.rev, 0, Number.MAX_SAFE_INTEGER, 0),
    createdAt: time(c?.createdAt),
    updatedAt: time(c?.updatedAt),
  };
}

/** The readable text of a block — for search and previews. */
export function blockText(b) {
  switch (b?.type) {
    case 'heading': case 'text': return b.text;
    case 'list': return b.items.join('\n');
    case 'quote': return `${b.text} ${b.source}`;
    case 'callout': case 'toggle': return `${b.title} ${b.text}`;
    case 'definition': return `${b.term} ${b.termEn} ${b.text} ${b.textEn}`;
    case 'formula': return [b.title, b.text, b.caption, ...b.variables.map((v) => `${v.symbol} ${v.meaning}`), b.explanation, b.example, b.analogy].join(' ');
    case 'flashcard': return `${b.front} ${b.back}`;
    case 'quiz': return [b.question, ...b.options.map((o) => o.text), b.explanation].join(' ');
    case 'table': return b.rows.map((r) => r.join(' ')).join('\n');
    case 'image': return `${b.alt} ${b.caption}`;
    case 'slides': return [b.title, ...b.slides.map((s) => `${s.title} ${s.formula} ${s.text} ${s.example} ${s.alt}`)].join(' ');
    case 'files': return b.items.map((f) => f.name).join(' ');
    case 'links': return b.items.map((l) => `${l.title} ${l.url}`).join(' ');
    case 'supplyDemand': case 'consumerChoice': return `${b.title} ${b.caption}`;
    default: return '';
  }
}

/** Counts shown on chapter lists. */
export function chapterStats(c) {
  let cards = 0; let quizzes = 0;
  for (const b of c.blocks) {
    if (b.type === 'flashcard') cards += 1;
    else if (b.type === 'quiz') quizzes += 1;
  }
  return { blocks: c.blocks.length, cards, quizzes };
}

/** Every file a chapter's blocks point at. */
export function chapterFiles(c) {
  const out = new Set();
  for (const b of c.blocks) {
    if (b.type === 'image' && b.src) out.add(b.src);
    if (b.type === 'files') for (const f of b.items) out.add(f.src);
    if (b.type === 'slides') for (const s of b.slides) if (s.image) out.add(s.image);
  }
  return out;
}
