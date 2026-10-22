// Chapters (Kapitel) of a subject: a title, a short summary and a list of
// blocks — Notion-style building blocks for the learning content.
import { bool, id, line, list, num, oneOf, str, subId, time } from './base.js';

export const CHAPTER_STATUS = ['draft', 'published'];

// Every block type and how its fields are cleaned. Unknown types are dropped.
// Keep in sync with src/lib/blocks.js (labels, icons, defaults for the editor).
const TEXT_MAX = 20000;
const CALLOUT_VARIANTS = ['info', 'tip', 'warning', 'important'];
const LIST_STYLES = ['bullet', 'number'];

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
  definition: (b) => ({ term: line(b.term, 200), text: str(b.text, TEXT_MAX) }),
  toggle: (b) => ({ title: line(b.title, 300), text: str(b.text, TEXT_MAX) }),
  formula: (b) => ({ text: str(b.text, 4000), caption: line(b.caption, 300) }),
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
  files: (b, chapterId) => ({ items: list(b.items, 50).map((f) => normalizeFileRef(f, chapterId)).filter((f) => f.src) }),
  links: (b) => ({
    items: list(b.items, 50).map((l) => ({ id: subId(l?.id), url: normalizeUrl(l?.url), title: line(l?.title, 200) })),
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
  return { id: subId(b.id), type: b.type, ...BLOCKS[b.type](b, chapterId) };
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
    case 'definition': return `${b.term} ${b.text}`;
    case 'formula': return `${b.text} ${b.caption}`;
    case 'flashcard': return `${b.front} ${b.back}`;
    case 'quiz': return [b.question, ...b.options.map((o) => o.text), b.explanation].join(' ');
    case 'table': return b.rows.map((r) => r.join(' ')).join('\n');
    case 'image': return `${b.alt} ${b.caption}`;
    case 'files': return b.items.map((f) => f.name).join(' ');
    case 'links': return b.items.map((l) => `${l.title} ${l.url}`).join(' ');
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
  }
  return out;
}
