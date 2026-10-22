// Inputs of the interactive demos: sliders for viewers (changes aren't saved),
// number fields for the admin (they set the starting point), and readouts.
import { useEffect, useState } from 'react';

export function Slider({ name, label, value, min, max, step, onChange, fmt }) {
  const v = Math.min(max, Math.max(min, value));
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  return (
    <label className="demo-slider">
      <span className="demo-slider-head">
        <span className="demo-slider-name">{name}</span>
        <span className="demo-slider-label">{label}</span>
        <output className="demo-slider-value">{fmt(value)}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={v} style={{ '--p': `${pct}%` }}
        aria-valuetext={fmt(value)} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function NumberField({ name, label, value, onChange, min = -Infinity, max = Infinity }) {
  const [text, setText] = useState(String(value));
  // Follow changes from outside, but don't fight the field while it's being typed in ("1," → 1).
  useEffect(() => {
    if (Number(text.replace(',', '.')) !== value) setText(String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="demo-num">
      <span><b>{name}</b> {label}</span>
      <input className="input input-sm" inputMode="decimal" value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value.replace(',', '.'));
          if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
        }} />
    </label>
  );
}

export function Readout({ label, value, tone = '' }) {
  return (
    <div className={`demo-readout ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/** Number formatting for the chapter's language: 1.234,5 (de) / 1,234.5 (en). */
export const numberFormat = (lang) => {
  const nf = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'de-DE', { maximumFractionDigits: 2 });
  // A real minus sign (−20), not a hyphen.
  return (n) => (Number.isFinite(n) ? nf.format(Math.abs(n) < 1e-9 ? 0 : n).replace(/^-/, '−') : '–');
};
