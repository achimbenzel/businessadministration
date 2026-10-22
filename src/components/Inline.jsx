// Renders block text with the small Markdown subset of lib/inline.js —
// always as React elements, never as HTML.
import { Fragment } from 'react';
import { parseInline, parseParagraphs } from '../lib/inline.js';

function renderTokens(tokens) {
  return tokens.map((t, i) => {
    switch (t.t) {
      case 'text': {
        const lines = t.v.split('\n');
        return <Fragment key={i}>{lines.map((ln, j) => (j ? <Fragment key={j}><br />{ln}</Fragment> : ln))}</Fragment>;
      }
      case 'code': return <code key={i}>{t.v}</code>;
      case 'b': return <strong key={i}>{renderTokens(t.children)}</strong>;
      case 'i': return <em key={i}>{renderTokens(t.children)}</em>;
      case 'mark': return <mark key={i}>{renderTokens(t.children)}</mark>;
      case 'link': return <a key={i} href={t.href} target="_blank" rel="noopener noreferrer">{renderTokens(t.children)}</a>;
      default: return null;
    }
  });
}

/** One line / paragraph of inline text. */
export function Inline({ text }) {
  return <>{renderTokens(parseInline(text))}</>;
}

/** Text with paragraphs and "- " / "1. " lists. */
export function RichText({ text, className = '' }) {
  const blocks = parseParagraphs(text);
  return (
    <div className={`rich ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ul>;
        if (b.type === 'ol') return <ol key={i}>{b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}</ol>;
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
