// Basic blocks: text, heading, list, quote, divider — each as View (read)
// and Edit (admin).
import { List, ListOrdered } from 'lucide-react';
import AutoTextarea from '../AutoTextarea.jsx';
import { Inline, RichText } from '../Inline.jsx';

export function TextView({ block }) {
  return <RichText text={block.text} className="blk-text" />;
}
export function TextEdit({ block, onChange, onSlash, autoFocus }) {
  return (
    <AutoTextarea className="ed-text" value={block.text} minRows={2} autoFocus={autoFocus}
      placeholder="Text schreiben … „/“ für Bausteine, **fett**, *kursiv*, ==markiert==, „- “ für Listen"
      onChange={(e) => {
        // Notion-style: a lone "/" opens the block menu and turns this block into the chosen one.
        if (e.target.value === '/' && onSlash) { onSlash(); return; }
        onChange({ text: e.target.value });
      }} />
  );
}

export function HeadingView({ block }) {
  const H = block.level === 3 ? 'h3' : 'h2';
  return <H className={`blk-heading blk-h${block.level}`}><Inline text={block.text} /></H>;
}
export function HeadingEdit({ block, onChange, autoFocus }) {
  return (
    <div className="ed-row">
      <input className={`ed-heading ed-h${block.level}`} value={block.text} autoFocus={autoFocus} placeholder="Überschrift"
        onChange={(e) => onChange({ text: e.target.value })} maxLength={200} />
      <div className="segmented segmented-sm" role="group" aria-label="Ebene">
        <button type="button" className={block.level === 2 ? 'on' : ''} aria-pressed={block.level === 2} onClick={() => onChange({ level: 2 })}>H2</button>
        <button type="button" className={block.level === 3 ? 'on' : ''} aria-pressed={block.level === 3} onClick={() => onChange({ level: 3 })}>H3</button>
      </div>
    </div>
  );
}

export function ListView({ block }) {
  const items = block.items.filter((t) => t.trim());
  const L = block.style === 'number' ? 'ol' : 'ul';
  return <L className="blk-list">{items.map((t, i) => <li key={i}><Inline text={t} /></li>)}</L>;
}
export function ListEdit({ block, onChange, autoFocus }) {
  return (
    <div className="ed-stack">
      <div className="segmented segmented-sm" role="group" aria-label="Listenart">
        <button type="button" className={block.style === 'bullet' ? 'on' : ''} aria-pressed={block.style === 'bullet'} onClick={() => onChange({ style: 'bullet' })}><List size={14} /> Punkte</button>
        <button type="button" className={block.style === 'number' ? 'on' : ''} aria-pressed={block.style === 'number'} onClick={() => onChange({ style: 'number' })}><ListOrdered size={14} /> Nummeriert</button>
      </div>
      <AutoTextarea className={`ed-list ${block.style}`} value={block.items.join('\n')} minRows={3} autoFocus={autoFocus}
        placeholder={'Ein Punkt pro Zeile\nZweiter Punkt\nDritter Punkt'}
        onChange={(e) => onChange({ items: e.target.value.split('\n') })} />
    </div>
  );
}

export function QuoteView({ block }) {
  return (
    <blockquote className="blk-quote">
      <RichText text={block.text} />
      {block.source && <cite>— {block.source}</cite>}
    </blockquote>
  );
}
export function QuoteEdit({ block, onChange, autoFocus }) {
  return (
    <div className="ed-stack ed-quote">
      <AutoTextarea className="ed-text" value={block.text} minRows={2} autoFocus={autoFocus} placeholder="Zitat" onChange={(e) => onChange({ text: e.target.value })} />
      <input className="input input-sm" value={block.source} placeholder="Quelle (optional), z. B. Wöhe, Einführung in die BWL, S. 34"
        onChange={(e) => onChange({ source: e.target.value })} maxLength={200} />
    </div>
  );
}

export function DividerView() {
  return <hr className="blk-divider" />;
}
export function DividerEdit() {
  return <hr className="blk-divider" />;
}
