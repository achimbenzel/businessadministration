// Building blocks for the normalizers: every value from a request or from
// db.json goes through one of these before it's stored, so a record always
// has the shape the code expects — whatever came in.
import { nanoid } from 'nanoid';

/** A string of at most `max` characters ('' for null/undefined). */
export const str = (v, max = 2000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
/** A one-line string: trimmed, line breaks become spaces. */
export const line = (v, max = 200) => str(v, max * 2).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
/** A number clamped to [min, max]; `fallback` if it isn't one. */
export const num = (v, min, max, fallback) => {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
export const bool = (v) => v === true;
/** `v` if it's one of `allowed`, else the first allowed value. */
export const oneOf = (v, allowed) => (allowed.includes(v) ? v : allowed[0]);
/** A short key such as an icon or colour name ('' if it doesn't look like one). */
export const key = (v, max = 24) => (typeof v === 'string' && new RegExp(`^[a-z][a-z0-9-]{0,${max - 1}}$`).test(v) ? v : '');

export const ID = /^[\w-]{6,40}$/;
// typeof first: ID.test(undefined) would be true ("undefined" has 9 characters)!
export const isId = (v) => typeof v === 'string' && ID.test(v);
export const id = (v, size = 10) => (isId(v) ? v : nanoid(size));
// Short ids for things inside a record (blocks, list items).
export const subId = (v) => (typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : nanoid(8));
export const time = (v, fallback = Date.now()) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback);
/** An array of at most `max` entries ([] if it isn't an array). */
export const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
