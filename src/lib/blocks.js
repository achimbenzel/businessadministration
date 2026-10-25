// Every block type of the editor: name, icon, group in the "add block" menu,
// what a new one starts with, and when it counts as empty.
// The server cleans the same fields (server/schema/chapters.js) — keep in sync.
import {
  Type, Heading2, List, Quote, Minus, Lightbulb, BookMarked, ChevronRight, Sigma, Layers, CircleHelp,
  Table, Image, Paperclip, Link2, ChartLine, ChartSpline, Presentation,
} from 'lucide-react';

export const rid = () => Math.random().toString(36).slice(2, 10);

export const BLOCK_META = {
  text: { label: 'Text', icon: Type, hint: 'Absatz – **fett**, *kursiv*, ==markiert==, Listen mit „- “', create: () => ({ text: '' }) },
  heading: { label: 'Überschrift', icon: Heading2, hint: 'Abschnitt gliedern', create: () => ({ text: '', level: 2 }) },
  list: { label: 'Liste', icon: List, hint: 'Aufzählung oder nummeriert', create: () => ({ style: 'bullet', items: [''] }) },
  quote: { label: 'Zitat', icon: Quote, hint: 'Zitat mit Quelle', create: () => ({ text: '', source: '' }) },
  divider: { label: 'Trennlinie', icon: Minus, hint: 'Optische Trennung', create: () => ({}) },
  definition: { label: 'Definition', icon: BookMarked, hint: 'Begriff und Erklärung', create: () => ({ term: '', text: '' }) },
  callout: { label: 'Hinweis', icon: Lightbulb, hint: 'Merke, Tipp, Achtung', create: () => ({ variant: 'info', title: '', text: '' }) },
  toggle: { label: 'Aufklappbar', icon: ChevronRight, hint: 'Inhalt zum Aufklappen', create: () => ({ title: '', text: '' }) },
  formula: { label: 'Formel', icon: Sigma, hint: 'Formel oder Rechenweg – x^{2}, a_{i}, \\sum, \\frac{a}{b}', create: () => ({ text: '', caption: '' }) },
  slides: {
    label: 'Folien', icon: Presentation, hint: 'Foliensatz: Schritt für Schritt blättern oder präsentieren',
    create: () => ({ title: '', slides: [{ id: rid(), title: '', formula: '', text: '', example: '', image: '', alt: '' }] }),
  },
  flashcard: { label: 'Karteikarte', icon: Layers, hint: 'Frage vorne, Antwort hinten', create: () => ({ front: '', back: '' }) },
  quiz: {
    label: 'Quizfrage', icon: CircleHelp, hint: 'Multiple Choice mit Auflösung',
    create: () => ({ question: '', options: [{ id: rid(), text: '', correct: true }, { id: rid(), text: '', correct: false }], explanation: '' }),
  },
  table: { label: 'Tabelle', icon: Table, hint: 'Zeilen und Spalten', create: () => ({ header: true, rows: [['', ''], ['', '']] }) },
  image: { label: 'Bild', icon: Image, hint: 'Grafik oder Foto hochladen', create: () => ({ src: '', alt: '', caption: '' }) },
  files: { label: 'Dateien', icon: Paperclip, hint: 'Folien, PDFs, Skripte', create: () => ({ items: [] }) },
  links: { label: 'Links', icon: Link2, hint: 'Weiterführende Links', create: () => ({ items: [{ id: rid(), url: '', title: '' }] }) },
  supplyDemand: {
    label: 'Angebot & Nachfrage', icon: ChartLine, hint: 'Interaktive Demo: Kurven, Gleichgewicht, Preiseingriffe',
    create: () => ({ title: '', caption: '', a: 100, b: 2, c: -20, d: 4, control: 'none', controlPrice: 0 }),
  },
  consumerChoice: {
    label: 'Haushaltsoptimum', icon: ChartSpline, hint: 'Interaktive Demo: Budgetgerade und Indifferenzkurven',
    create: () => ({ title: '', caption: '', m: 100, p1: 2, p2: 5, alpha: 0.5 }),
  },
};

export const BLOCK_GROUPS = [
  { key: 'basic', label: 'Grundlagen', types: ['text', 'heading', 'list', 'quote', 'divider'] },
  { key: 'learn', label: 'Lernen', types: ['definition', 'callout', 'toggle', 'formula', 'slides', 'flashcard', 'quiz'] },
  { key: 'media', label: 'Medien & Daten', types: ['table', 'image', 'files', 'links'] },
  { key: 'interactive', label: 'Interaktiv', types: ['supplyDemand', 'consumerChoice'] },
];

export const blockMeta = (type) => BLOCK_META[type] || BLOCK_META.text;

export const newBlock = (type) => ({ id: rid(), type, ...blockMeta(type).create() });

const blank = (s) => !String(s ?? '').trim();

/** A block without content — hidden from viewers. */
export function isEmptyBlock(b) {
  switch (b.type) {
    case 'divider': case 'supplyDemand': case 'consumerChoice': return false;
    case 'heading': case 'text': return blank(b.text);
    case 'list': return (b.items || []).every(blank);
    case 'quote': case 'formula': return blank(b.text);
    case 'definition': return blank(b.term) && blank(b.text);
    case 'callout': case 'toggle': return blank(b.title) && blank(b.text);
    case 'flashcard': return blank(b.front) && blank(b.back);
    case 'quiz': return blank(b.question);
    case 'table': return (b.rows || []).every((r) => r.every(blank));
    case 'image': return !b.src;
    case 'slides': return !(b.slides || []).some((s) => [s.title, s.formula, s.text, s.example].some((x) => !blank(x)) || s.image);
    case 'files': return !(b.items || []).length;
    case 'links': return !(b.items || []).some((l) => !blank(l.url));
    default: return true;
  }
}

export const CALLOUT_VARIANTS = [
  { key: 'info', label: 'Info' },
  { key: 'tip', label: 'Tipp' },
  { key: 'important', label: 'Merke' },
  { key: 'warning', label: 'Achtung' },
];
