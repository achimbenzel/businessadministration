// Subjects (Fächer) of a semester.
import { id, key, line, num, str, time } from './base.js';

export function normalizeSubject(s) {
  return {
    id: id(s?.id),
    semesterId: typeof s?.semesterId === 'string' ? s.semesterId.slice(0, 40) : '',
    title: line(s?.title, 160) || 'Neues Fach',
    short: line(s?.short, 12),         // abbreviation shown on the tile, e.g. "KLR"
    description: str(s?.description, 4000),
    // Icon and colour are names the frontend maps to a lucide icon / colour
    // token; an unknown name falls back to the default there.
    icon: key(s?.icon) || 'book',
    color: key(s?.color) || 'teal',
    ects: s?.ects == null || s?.ects === '' ? null : num(s.ects, 0, 60, null),
    order: num(s?.order, 0, 1e6, 0),
    createdAt: time(s?.createdAt),
    updatedAt: time(s?.updatedAt),
  };
}
