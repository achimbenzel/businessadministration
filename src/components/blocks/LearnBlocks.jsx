// Learning blocks: definition (with the English term), callout (Info / Tipp /
// Merke / Achtung), toggle and formula (with symbols, a plain-language
// explanation, an example and an everyday analogy).
import { useState } from 'react';
import { BookMarked, Info, Lightbulb, Pin, TriangleAlert, ChevronRight, Sigma, MessageCircle, Calculator, Plus, X } from 'lucide-react';
import AutoTextarea from '../AutoTextarea.jsx';
import { Inline, RichText } from '../Inline.jsx';
import { CALLOUT_VARIANTS } from '../../lib/blocks.js';
import { useBlockText } from '../../lib/blockText.js';

export function DefinitionView({ block }) {
  const t = useBlockText();
  return (
    <div className="blk-def">
      <div className="blk-def-label"><BookMarked size={14} /> {t.definition}</div>
      {(block.term || block.termEn) && (
        <div className="blk-def-term">
          {block.term && <Inline text={block.term} />}
          {block.termEn && <span className="blk-def-en" lang="en"><b>EN</b> <Inline text={block.termEn} /></span>}
        </div>
      )}
      <RichText text={block.text} />
      {block.textEn && (
        <div className="blk-def-entext" lang="en">
          <span className="blk-def-enlabel">{t.inEnglish}</span>
          <RichText text={block.textEn} />
        </div>
      )}
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
      <input className="input input-sm" lang="en" value={block.termEn || ''} placeholder="Englischer Begriff (optional), z. B. contribution margin" maxLength={200}
        onChange={(e) => onChange({ termEn: e.target.value })} />
      <AutoTextarea className="input input-sm ed-entext" lang="en" value={block.textEn || ''} minRows={1} placeholder="Definition auf Englisch (optional) – so, wie sie in der Klausur stehen könnte"
        onChange={(e) => onChange({ textEn: e.target.value })} />
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

const FORMULA_PARTS = [
  ['explanation', MessageCircle, 'plain'],
  ['example', Calculator, 'example'],
  ['analogy', Lightbulb, 'analogy'],
];

export function FormulaView({ block }) {
  const t = useBlockText();
  const vars = block.variables || [];
  const rich = block.title || vars.length || FORMULA_PARTS.some(([k]) => block[k]);
  return (
    <figure className={`blk-formula ${rich ? 'is-rich' : ''}`}>
      {block.title && <div className="blk-formula-title"><Sigma size={15} /> <Inline text={block.title} /></div>}
      <pre>{block.text}</pre>
      {block.caption && <figcaption><Inline text={block.caption} /></figcaption>}
      {vars.length > 0 && (
        <dl className="blk-formula-vars" aria-label={t.formula.variables}>
          {vars.map((v, i) => (
            <div key={i}><dt>{v.symbol}</dt><dd><Inline text={v.meaning} /></dd></div>
          ))}
        </dl>
      )}
      {FORMULA_PARTS.map(([k, Icon, label]) => block[k] && (
        <div key={k} className={`blk-formula-part ${k}`}>
          <div className="blk-formula-part-label"><Icon size={14} /> {t.formula[label]}</div>
          <RichText text={block[k]} />
        </div>
      ))}
    </figure>
  );
}
export function FormulaEdit({ block, onChange, autoFocus }) {
  const vars = block.variables || [];
  const setVar = (i, p) => onChange({ variables: vars.map((v, j) => (j === i ? { ...v, ...p } : v)) });
  return (
    <figure className="blk-formula ed-stack">
      <input className="input input-sm ed-formula-title" value={block.title || ''} autoFocus={autoFocus} placeholder="Name der Formel (optional), z. B. Konsumentenrente (CS)" maxLength={200}
        onChange={(e) => onChange({ title: e.target.value })} />
      <AutoTextarea className="ed-formula" value={block.text} minRows={2} spellCheck="false"
        placeholder={'Deckungsbeitrag = Umsatzerlöse − variable Kosten\nBetriebsergebnis = Σ DB − Fixkosten'}
        onChange={(e) => onChange({ text: e.target.value })} />
      <input className="input input-sm" value={block.caption} placeholder="Beschriftung (optional)" maxLength={300}
        onChange={(e) => onChange({ caption: e.target.value })} />
      <div className="ed-vars">
        {vars.map((v, i) => (
          <div className="ed-var" key={i}>
            <input className="input input-sm ed-var-sym" value={v.symbol} placeholder="Symbol" maxLength={40} aria-label="Symbol"
              onChange={(e) => setVar(i, { symbol: e.target.value })} />
            <input className="input input-sm" value={v.meaning} placeholder="Bedeutung" maxLength={300} aria-label="Bedeutung"
              onChange={(e) => setVar(i, { meaning: e.target.value })} />
            <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Symbol entfernen"
              onClick={() => onChange({ variables: vars.filter((_, j) => j !== i) })}><X size={15} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({ variables: [...vars, { symbol: '', meaning: '' }] })}>
          <Plus size={14} /> Symbol erklären
        </button>
      </div>
      <AutoTextarea className="input input-sm" value={block.explanation || ''} minRows={2} placeholder="In einfachen Worten: was sagt die Formel? (optional)"
        onChange={(e) => onChange({ explanation: e.target.value })} />
      <AutoTextarea className="input input-sm" value={block.example || ''} minRows={2} placeholder="Beispiel mit Zahlen (optional)"
        onChange={(e) => onChange({ example: e.target.value })} />
      <AutoTextarea className="input input-sm" value={block.analogy || ''} minRows={1} placeholder="Vergleich aus dem Alltag / Eselsbrücke (optional)"
        onChange={(e) => onChange({ analogy: e.target.value })} />
    </figure>
  );
}
