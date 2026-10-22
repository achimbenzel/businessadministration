// Learning blocks: definition, callout (Info / Tipp / Merke / Achtung),
// toggle and formula.
import { useState } from 'react';
import { BookMarked, Info, Lightbulb, Pin, TriangleAlert, ChevronRight } from 'lucide-react';
import AutoTextarea from '../AutoTextarea.jsx';
import { Inline, RichText } from '../Inline.jsx';
import { CALLOUT_VARIANTS } from '../../lib/blocks.js';
import { useBlockText } from '../../lib/blockText.js';

export function DefinitionView({ block }) {
  const t = useBlockText();
  return (
    <div className="blk-def">
      <div className="blk-def-label"><BookMarked size={14} /> {t.definition}</div>
      {block.term && <div className="blk-def-term"><Inline text={block.term} /></div>}
      <RichText text={block.text} />
    </div>
  );
}
export function DefinitionEdit({ block, onChange, autoFocus }) {
  return (
    <div className="blk-def ed-stack">
      <input className="ed-term" value={block.term} autoFocus={autoFocus} placeholder="Begriff, z. B. Deckungsbeitrag" maxLength={200}
        onChange={(e) => onChange({ term: e.target.value })} />
      <AutoTextarea className="ed-text" value={block.text} minRows={2} placeholder="Erklärung des Begriffs"
        onChange={(e) => onChange({ text: e.target.value })} />
    </div>
  );
}

const CALLOUT_ICON = { info: Info, tip: Lightbulb, important: Pin, warning: TriangleAlert };
const calloutLabel = (v) => CALLOUT_VARIANTS.find((x) => x.key === v)?.label || 'Info';

export function CalloutView({ block }) {
  const t = useBlockText();
  const Icon = CALLOUT_ICON[block.variant] || Info;
  return (
    <aside className={`blk-callout ${block.variant}`}>
      <Icon size={18} className="blk-callout-icon" />
      <div className="blk-callout-body">
        <div className="blk-callout-title">{block.title ? <Inline text={block.title} /> : t.callout[block.variant] || t.callout.info}</div>
        {block.text && <RichText text={block.text} />}
      </div>
    </aside>
  );
}
export function CalloutEdit({ block, onChange, autoFocus }) {
  const Icon = CALLOUT_ICON[block.variant] || Info;
  return (
    <aside className={`blk-callout ${block.variant}`}>
      <Icon size={18} className="blk-callout-icon" />
      <div className="blk-callout-body ed-stack">
        <div className="segmented segmented-sm" role="group" aria-label="Art">
          {CALLOUT_VARIANTS.map((v) => (
            <button key={v.key} type="button" className={block.variant === v.key ? 'on' : ''} aria-pressed={block.variant === v.key}
              onClick={() => onChange({ variant: v.key })}>{v.label}</button>
          ))}
        </div>
        <input className="ed-callout-title" value={block.title} autoFocus={autoFocus} placeholder={`Titel (leer = „${calloutLabel(block.variant)}“)`} maxLength={200}
          onChange={(e) => onChange({ title: e.target.value })} />
        <AutoTextarea className="ed-text" value={block.text} minRows={2} placeholder="Inhalt" onChange={(e) => onChange({ text: e.target.value })} />
      </div>
    </aside>
  );
}

export function ToggleView({ block }) {
  const t = useBlockText();
  const [open, setOpen] = useState(false);
  return (
    <div className={`blk-toggle ${open ? 'open' : ''}`}>
      <button type="button" className="blk-toggle-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={17} className="blk-toggle-chev" />
        <span>{block.title ? <Inline text={block.title} /> : t.showMore}</span>
      </button>
      {open && <div className="blk-toggle-body"><RichText text={block.text} /></div>}
    </div>
  );
}
export function ToggleEdit({ block, onChange, autoFocus }) {
  return (
    <div className="blk-toggle open ed-stack">
      <div className="blk-toggle-head is-static">
        <ChevronRight size={17} className="blk-toggle-chev" />
        <input className="ed-toggle-title" value={block.title} autoFocus={autoFocus} placeholder="Titel, z. B. Lösung anzeigen" maxLength={300}
          onChange={(e) => onChange({ title: e.target.value })} />
      </div>
      <div className="blk-toggle-body">
        <AutoTextarea className="ed-text" value={block.text} minRows={2} placeholder="Inhalt, der erst beim Aufklappen erscheint"
          onChange={(e) => onChange({ text: e.target.value })} />
      </div>
    </div>
  );
}

export function FormulaView({ block }) {
  return (
    <figure className="blk-formula">
      <pre>{block.text}</pre>
      {block.caption && <figcaption><Inline text={block.caption} /></figcaption>}
    </figure>
  );
}
export function FormulaEdit({ block, onChange, autoFocus }) {
  return (
    <figure className="blk-formula ed-stack">
      <AutoTextarea className="ed-formula" value={block.text} minRows={2} autoFocus={autoFocus} spellCheck="false"
        placeholder={'Deckungsbeitrag = Umsatzerlöse − variable Kosten\nBetriebsergebnis = Σ DB − Fixkosten'}
        onChange={(e) => onChange({ text: e.target.value })} />
      <input className="input input-sm" value={block.caption} placeholder="Beschriftung (optional)" maxLength={300}
        onChange={(e) => onChange({ caption: e.target.value })} />
    </figure>
  );
}
