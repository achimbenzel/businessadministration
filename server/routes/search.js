// Full-text search over subjects and chapters (title, summary, every block).
//   GET /api/search?q=…   → { results: [{ kind, id, title, subject, snippet, blockId }] }
import { createRouter } from '../http.js';
import { readDB } from '../db.js';
import { blockText } from '../schema.js';
import { visibleChapters } from './catalog.js';

const MAX_RESULTS = 30;

// Case- and accent-insensitive: "uberblick" finds "Überblick".
export const fold = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

/** ~120 characters around the first hit. Folding keeps the string length for
 *  almost all text, so indexes into the folded text fit the original. */
function snippet(text, q) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  const i = fold(clean).indexOf(q);
  if (i === -1) return clean.slice(0, 120);
  const start = Math.max(0, i - 50);
  return `${start > 0 ? '…' : ''}${clean.slice(start, start + 120)}${start + 120 < clean.length ? '…' : ''}`;
}

export default function searchRouter() {
  const r = createRouter();
  r.get('/api/search', async (req, res) => {
    const q = fold(String(req.query.q || '').trim()).slice(0, 100);
    if (q.length < 2) return res.json({ results: [] });
    const db = await readDB();
    const subjects = new Map(db.subjects.map((s) => [s.id, s]));
    const brief = (s) => (s ? { id: s.id, title: s.title, short: s.short, icon: s.icon, color: s.color } : null);
    const results = [];

    for (const s of db.subjects) {
      if (fold(`${s.title} ${s.short}`).includes(q) || fold(s.description).includes(q)) {
        results.push({ kind: 'subject', id: s.id, title: s.title, subject: brief(s), snippet: snippet(s.description, q), score: fold(s.title).includes(q) ? 3 : 1 });
      }
    }
    for (const c of visibleChapters(db, req)) {
      const subject = subjects.get(c.subjectId);
      if (!subject) continue;
      if (fold(c.title).includes(q)) {
        results.push({ kind: 'chapter', id: c.id, title: c.title, subject: brief(subject), snippet: snippet(c.summary, q), score: 2 });
        continue;
      }
      if (fold(c.summary).includes(q)) {
        results.push({ kind: 'chapter', id: c.id, title: c.title, subject: brief(subject), snippet: snippet(c.summary, q), score: 1 });
        continue;
      }
      const hit = c.blocks.find((b) => fold(blockText(b)).includes(q));
      if (hit) results.push({ kind: 'chapter', id: c.id, title: c.title, subject: brief(subject), snippet: snippet(blockText(hit), q), blockId: hit.id, score: 0 });
    }
    results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'de'));
    res.json({ results: results.slice(0, MAX_RESULTS).map(({ score: _s, ...x }) => x) });
  });
  return r;
}
