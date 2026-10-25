// Slides: a deck with one idea per slide (title, formula, picture, text,
// example). Viewers page through it — buttons, dots, swipe, arrow keys — or
// present it full screen. The admin edits the slides as a list.
import { useEffect, useRef, useState } from 'react';
import {
  Presentation, Maximize2, Minimize2, ChevronLeft, ChevronRight, Calculator, ArrowUp, ArrowDown, Copy, Trash2, Plus, ImagePlus, X,
} from 'lucide-react';
import AutoTextarea from '../AutoTextarea.jsx';
import MathText from '../MathText.jsx';
import { Inline, RichText } from '../Inline.jsx';
import { Dropzone } from './MediaBlocks.jsx';
import { MathPreview } from './LearnBlocks.jsx';
import { fileUrl } from '../../lib/api.js';
import { rid } from '../../lib/blocks.js';
import { useBlockText } from '../../lib/blockText.js';

export const newSlide = () => ({ id: rid(), title: '', formula: '', text: '', example: '', image: '', alt: '' });
const hasContent = (s) => Boolean(s.title?.trim() || s.formula?.trim() || s.text?.trim() || s.example?.trim() || s.image);
const NEXT_KEYS = new Set(['ArrowRight', 'PageDown', ' ']);
const PREV_KEYS = new Set(['ArrowLeft', 'PageUp']);

export function SlidesView({ block }) {
  const t = useBlockText().slides;
  const slides = (block.slides || []).filter(hasContent);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0);
  const [present, setPresent] = useState(false);
  const root = useRef(null);
  const touch = useRef(null);
  const i = Math.min(index, Math.max(0, slides.length - 1));

  const go = (n) => {
    const k = Math.max(0, Math.min(slides.length - 1, n));
    if (k === i) return;
    setDir(k > i ? 1 : -1);
    setIndex(k);
  };
  const onKey = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.key === ' ' && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName))) return;
    if (NEXT_KEYS.has(e.key)) { e.preventDefault(); go(i + 1); } else if (PREV_KEYS.has(e.key)) { e.preventDefault(); go(i - 1); } else if (e.key === 'Home') { e.preventDefault(); go(0); } else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); } else if (e.key === 'Escape' && present) { e.preventDefault(); setPresent(false); }
  };

  // Presenting: real full screen where the browser allows it (not on the
  // iPhone), otherwise the deck covers the window. Keys work anywhere then.
  useEffect(() => {
    if (!present) return undefined;
    const el = root.current;
    document.body.classList.add('modal-open');
    if (el?.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {});
    const onChange = () => { if (!document.fullscreenElement) setPresent(false); };
    document.addEventListener('fullscreenchange', onChange);
    el?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.body.classList.remove('modal-open');
      if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
    };
  }, [present]);

  if (!slides.length) return null;
  const s = slides[i];
  const label = (k) => `${t.slide} ${k + 1} ${t.of} ${slides.length}`;
  return (
    <section ref={root} className={`blk-slides ${present ? 'is-present' : ''}`} aria-roledescription={t.label}
      aria-label={block.title || t.label} tabIndex={-1} onKeyDown={onKey}>
      <header className="sl-head">
        <span className="sl-badge"><Presentation size={13} /> {t.label}</span>
        <span className="sl-count" aria-live="polite">{i + 1} / {slides.length}</span>
        <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm sl-present" onClick={() => setPresent((p) => !p)}
          aria-label={present ? t.close : t.present} title={present ? t.close : t.present}>
          {present ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </header>
      {block.title && <h3 className="sl-deck"><Inline text={block.title} /></h3>}

      <div className="sl-stage"
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') touch.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const st = touch.current; touch.current = null;
          if (!st) return;
          const dx = e.clientX - st.x; const dy = e.clientY - st.y;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(i + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => { touch.current = null; }}>
        <article key={s.id || i} className={`sl-slide ${dir > 0 ? 'from-right' : dir < 0 ? 'from-left' : ''}`}
          aria-roledescription={t.slide} aria-label={label(i)}>
          {s.title && <h4 className="sl-title"><Inline text={s.title} /></h4>}
          {s.formula && <div className="sl-formula"><MathText text={s.formula} /></div>}
          {s.image && <img className="sl-img" src={fileUrl(s.image)} alt={s.alt || ''} />}
          {s.text && <RichText text={s.text} className="sl-text" />}
          {s.example && (
            <div className="sl-example">
              <div className="sl-example-label"><Calculator size={14} /> {t.example}</div>
              <RichText text={s.example} />
            </div>
          )}
        </article>
      </div>

      <footer className="sl-nav">
        <button type="button" className="icon-btn sl-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label={t.prev}><ChevronLeft size={20} /></button>
        {slides.length <= 16 ? (
          <div className="sl-dots">
            {slides.map((x, k) => (
              <button key={x.id || k} type="button" className={k === i ? 'on' : ''} aria-label={label(k)} aria-current={k === i ? 'true' : undefined} onClick={() => go(k)} />
            ))}
          </div>
        ) : (
          <div className="sl-bar" aria-hidden="true"><span style={{ width: `${((i + 1) / slides.length) * 100}%` }} /></div>
        )}
        <button type="button" className="icon-btn sl-arrow" onClick={() => go(i + 1)} disabled={i === slides.length - 1} aria-label={t.next}><ChevronRight size={20} /></button>
      </footer>
    </section>
  );
}

export function SlidesEdit({ block, onChange, upload, autoFocus }) {
  const slides = block.slides || [];
  const put = (next) => onChange({ slides: next });
  const set = (k, p) => put(slides.map((s, j) => (j === k ? { ...s, ...p } : s)));
  const move = (k, d) => {
    const next = [...slides];
    const [x] = next.splice(k, 1);
    next.splice(k + d, 0, x);
    put(next);
  };
  return (
    <div className="ed-slides ed-stack">
      <input className="ed-term" value={block.title} autoFocus={autoFocus} placeholder="Titel des Foliensatzes, z. B. Potenzgesetze" maxLength={200}
        onChange={(e) => onChange({ title: e.target.value })} />
      {slides.map((s, k) => (
        <div className="ed-slide" key={s.id || k}>
          <div className="ed-slide-head">
            <span className="ed-slide-no">Folie {k + 1}</span>
            <span className="ed-bar-space" />
            <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Folie nach oben" disabled={k === 0} onClick={() => move(k, -1)}><ArrowUp size={15} /></button>
            <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Folie nach unten" disabled={k === slides.length - 1} onClick={() => move(k, 1)}><ArrowDown size={15} /></button>
            <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Folie duplizieren"
              onClick={() => put([...slides.slice(0, k + 1), { ...s, id: rid() }, ...slides.slice(k + 1)])}><Copy size={15} /></button>
            <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Folie löschen" disabled={slides.length === 1}
              onClick={() => put(slides.filter((_, j) => j !== k))}><Trash2 size={15} /></button>
          </div>
          <input className="input input-sm ed-formula-title" value={s.title} placeholder="Überschrift der Folie" maxLength={200}
            onChange={(e) => set(k, { title: e.target.value })} />
          <AutoTextarea className="ed-formula" value={s.formula} minRows={1} spellCheck="false"
            placeholder={'Formel (optional), z. B. a^{x+y} = a^x \\cdot a^y'} onChange={(e) => set(k, { formula: e.target.value })} />
          <MathPreview text={s.formula} />
          <AutoTextarea className="input input-sm" value={s.text} minRows={2}
            placeholder="Erklärung – **fett**, Listen mit „- “, Formeln im Text mit $a^2$" onChange={(e) => set(k, { text: e.target.value })} />
          <AutoTextarea className="input input-sm" value={s.example} minRows={1} placeholder="Beispiel (optional)"
            onChange={(e) => set(k, { example: e.target.value })} />
          {s.image ? (
            <div className="ed-slide-img">
              <img src={fileUrl(s.image)} alt="" />
              <input className="input input-sm" value={s.alt} placeholder="Bildbeschreibung (für Screenreader)" maxLength={300}
                onChange={(e) => set(k, { alt: e.target.value })} />
              <button type="button" className="icon-btn icon-btn-ghost icon-btn-sm" aria-label="Bild entfernen" onClick={() => set(k, { image: '', alt: '' })}><X size={15} /></button>
            </div>
          ) : (
            <Dropzone accept="image/*" upload={upload} icon={ImagePlus}
              onUploaded={(ref) => set(k, { image: ref.src, alt: s.alt || ref.name.replace(/\.[^.]+$/, '') })}>
              Bild (optional) hierher ziehen oder <u>auswählen</u>
            </Dropzone>
          )}
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm ed-slide-add" onClick={() => put([...slides, newSlide()])}>
        <Plus size={15} /> Folie hinzufügen
      </button>
    </div>
  );
}
