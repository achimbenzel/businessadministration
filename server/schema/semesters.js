// Semesters: the top level of the catalogue (Semester → Fach → Kapitel).
import { id, line, num, str, time } from './base.js';

export function normalizeSemester(s) {
  const number = num(s?.number, 1, 12, 1);
  return {
    id: id(s?.id),
    number,
    title: line(s?.title, 80) || `${number}. Semester`,
    description: str(s?.description, 2000),
    createdAt: time(s?.createdAt),
    updatedAt: time(s?.updatedAt),
  };
}
