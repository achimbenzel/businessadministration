// A tiny Markdown subset for the text in blocks — parsed into tokens, then
// rendered as React elements (components/Inline.jsx). Never as HTML: nothing
// typed into a block can inject markup or scripts.
//
// Inline:  **fett**  *kursiv* / _kursiv_  ==markiert==  `code`  [Text](https://…)  bare URLs
//          $a^{x+y}$  formula (lib/math.js) — no space right inside the dollars, so "5 $ und 10 $" stays text
// Blocks:  blank line = new paragraph · "- " / "• " = bullet list · "1. " = numbered list

import { mathToPlain } from './math.js';

const RULES = [
  { t: 'code', re: /`([^`\n]+)`/ },
  { t: 'math', re: /\$(?=\S)([^$\n]*?\S)\$(?!\d)/ },
  { t: 'link', re: /\[([^\]\n]+)\]\(([^)\s]+)\)/ },
  { t: 'b', re: /\*\*(?=\S)([\s\S]*?\S)\*\*/ },
  { t: 'mark', re: /==(?=\S)([\s\S]*?\S)==/ },
  { t: 'i', re: /(?<![\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])|(?<!\w)_(?=\S)([^_\n]*?\S)_(?!\w)/ },
  { t: 'url', re: /https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"]/ },
];

/** Only web and mail links are ever made clickable. */
export function safeHref(href) {
  const h = String(href || '').trim();
  if (/^(https?:\/\/|mailto:)/i.test(h)) return h;
  if (/^www\./i.test(h)) return `https://${h}`;
  return null;
}

function pushText(out, v) {
  if (!v) return;
  const last = out[out.length - 1];
  if (last?.t === 'text') last.v += v; else out.push({ t: 'text', v });
}

/** Inline tokens: { t: 'text', v } | { t: 'code', v } | { t: 'b'|'i'|'mark', children } | { t: 'link', href, children }. */
export function parseInline(text, depth = 0) {
  const out = [];
  let rest = String(text ?? '');
  while (rest) {
    let best = null;
    if (depth < 6) {
      for (const rule of RULES) {
        const m = rule.re.exec(rest);
        if (m && (!best || m.index < best.m.index)) best = { rule, m };
      }
    }
    if (!best) { pushText(out, rest); break; }
    const { rule, m } = best;
    pushText(out, rest.slice(0, m.index));
    if (rule.t === 'code') out.push({ t: 'code', v: m[1] });
    else if (rule.t === 'math') out.push({ t: 'math', v: m[1] });
    else if (rule.t === 'link') {
      const href = safeHref(m[2]);
      if (href) out.push({ t: 'link', href, children: parseInline(m[1], depth + 1) });
      else pushText(out, m[0]);
    } else if (rule.t === 'url') out.push({ t: 'link', href: m[0], children: [{ t: 'text', v: m[0] }] });
    else out.push({ t: rule.t, children: parseInline(m[1] ?? m[2], depth + 1) });
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const BULLET = /^\s*[-•*]\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;

/** Paragraphs and lists: [{ type: 'p', text } | { type: 'ul'|'ol', items: [text] }]. */
export function parseParagraphs(text) {
  const out = [];
  let para = [];
  const endPara = () => { if (para.length) { out.push({ type: 'p', text: para.join('\n') }); para = []; } };
  for (const ln of String(text ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const bullet = BULLET.exec(ln);
    const number = !bullet && NUMBER.exec(ln);
    if (bullet || number) {
      endPara();
      const type = bullet ? 'ul' : 'ol';
      const last = out[out.length - 1];
      const item = (bullet || number)[1];
      if (last?.type === type) last.items.push(item); else out.push({ type, items: [item] });
    } else if (!ln.trim()) {
      endPara();
      out.push({ type: 'gap' });
    } else {
      para.push(ln);
    }
  }
  endPara();
  return out.filter((b) => b.type !== 'gap');
}

/** Plain text without the markup — for previews and summaries. */
export function stripInline(text) {
  const walk = (tokens) => tokens.map((t) => (t.children ? walk(t.children) : t.t === 'math' ? mathToPlain(t.v) : t.v)).join('');
  return walk(parseInline(text));
}
