/**
 * The shape of db.json: one normalizer per collection (server/schema/*.js),
 * the empty database, the first-run content and the schema version.
 *
 * Schema changes are additive only: a new field gets a default in its
 * normalizer, so records written by an older version stay valid without a
 * migration.
 */
import { list, time, str, line, isId } from './schema/base.js';
import { normalizeSemester } from './schema/semesters.js';
import { normalizeSubject } from './schema/subjects.js';
import { normalizeChapter } from './schema/chapters.js';

export * from './schema/semesters.js';
export * from './schema/subjects.js';
export * from './schema/chapters.js';

export const SCHEMA_VERSION = 1;

export const emptyDB = () => ({ schemaVersion: SCHEMA_VERSION, semesters: [], subjects: [], chapters: [], trash: [], contentImported: [] });

// Content packs (content/…/chapter.json) that were imported once — see server/content.js.
const normalizeImport = (x) => ({ id: isId(x?.id) ? x.id : '', at: time(x?.at) });

// A deleted chapter, kept until it's restored or purged (see routes/trash.js).
export function normalizeTrashEntry(t) {
  if (!t || typeof t !== 'object' || t.kind !== 'chapter' || !t.item) return null;
  return {
    id: typeof t.id === 'string' && /^[\w-]{6,40}$/.test(t.id) ? t.id : null,
    kind: 'chapter',
    item: normalizeChapter(t.item),
    subjectTitle: line(t.subjectTitle, 160),
    deletedAt: time(t.deletedAt),
  };
}

export function normalizeDB(d) {
  const db = d && typeof d === 'object' ? d : {};
  return {
    ...emptyDB(),
    schemaVersion: SCHEMA_VERSION,
    semesters: list(db.semesters, 50).map(normalizeSemester),
    subjects: list(db.subjects, 500).map(normalizeSubject),
    chapters: list(db.chapters, 10000).map(normalizeChapter),
    trash: list(db.trash, 10000).map(normalizeTrashEntry).filter((t) => t && t.id),
    contentImported: list(db.contentImported, 10000).map(normalizeImport).filter((x) => x.id),
  };
}

/**
 * First start: semester 1 of the M.Sc. Business Administration (Hochschule
 * Mainz) with its subjects. The content is added later in the app; this only
 * runs when there is no database at all — never over an existing one.
 */
export function seedDB(now = Date.now()) {
  const semesterId = 'semester-1';
  const subjects = [
    { id: 'personalmanagement-organisation', title: 'Personalmanagement & Organisation', short: 'PO', icon: 'users', color: 'violet' },
    { id: 'economical-framework', title: 'Economical Framework for Entrepreneurial Decisions', short: 'EFED', icon: 'globe', color: 'blue' },
    { id: 'grundlagen-bwl', title: 'Grundlagen der BWL (mit Accounting und Planspiel)', short: 'BWL', icon: 'briefcase', color: 'teal' },
    { id: 'rechtliche-rahmenbedingungen', title: 'Rechtliche Rahmenbedingungen unternehmerischer Entscheidungen', short: 'RECHT', icon: 'scale', color: 'amber' },
    { id: 'kosten-leistungsrechnung', title: 'Kosten- & Leistungsrechnung', short: 'KLR', icon: 'calculator', color: 'green' },
  ];
  return normalizeDB({
    semesters: [{ id: semesterId, number: 1, title: '1. Semester', description: str(''), createdAt: now, updatedAt: now }],
    subjects: subjects.map((s, i) => ({ ...s, semesterId, description: '', order: i, createdAt: now, updatedAt: now })),
    chapters: [],
    trash: [],
  });
}
