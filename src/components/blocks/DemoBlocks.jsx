// Interactive demos: change the numbers, watch the curves. Viewers move sliders
// (nothing is saved); the admin sets the starting point with number fields.
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import Plot, { pts } from './demos/Plot.jsx';
import { Slider, NumberField, Readout, numberFormat } from './demos/DemoControls.jsx';
import MarketDemo from './MarketDemo.jsx';
import { Inline } from '../Inline.jsx';
import { useBlockLang, useBlockText } from '../../lib/blockText.js';
import { consumer, indifferenceX2, niceMax, niceStep, snap } from '../../lib/demos.js';

const CC_KEYS = ['m', 'p1', 'p2', 'alpha'];
const pick = (block, keys) => Object.fromEntries(keys.map((k) => [k, block[k]]));
const same = (x, y, keys) => keys.every((k) => x[k] === y[k]);

/** A slider's range around the starting value, snapped to a tidy step. */
function range(lo, hi) {
  const step = niceStep(hi - lo);
  return { min: snap(lo, step), max: snap(hi, step), step };
}

/** Viewer state: starts at the block's values, follows them when the block changes. */
function useDemoState(block, keys, editing, onChange) {
  const base = pick(block, keys);
  const [local, setLocal] = useState(base);
  const sig = keys.map((k) => block[k]).join('|');
  useEffect(() => { setLocal(pick(block, keys)); }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = editing ? base : local;
  const set = (patch) => (editing ? onChange(patch) : setLocal((cur) => ({ ...cur, ...patch })));
  return { v, base, set, changed: !editing && !same(local, base, keys), reset: () => setLocal(base) };
}

function DemoFrame({ block, changed, onReset, children, t }) {
  return (
    <div className="demo">
      <div className="demo-head">
        <span className="demo-badge"><SlidersHorizontal size={13} /> {t.demo.interactive}</span>
        {changed && <button type="button" className="btn btn-ghost btn-sm demo-reset" onClick={onReset}><RotateCcw size={14} /> {t.demo.reset}</button>}
      </div>
      {block.title && <h3 className="demo-title"><Inline text={block.title} /></h3>}
      {children}
      {block.caption && <p className="demo-caption"><Inline text={block.caption} /></p>}
    </div>
  );
}

// ---------------------------------------------------------------- Supply & demand
export function SupplyDemandView({ block }) {
  return <MarketDemo block={block} />;
}

// --------------------------------------------------------------- Consumer choice
const mrsAt = (alpha, x1, x2) => (alpha / (1 - alpha)) * (x2 / x1);

function ConsumerChoiceDemo({ block, editing = false, onChange }) {
  const t = useBlockText();
  const lang = useBlockLang();
  const f = numberFormat(lang);
  const { v, base, set, changed, reset } = useDemoState(block, CC_KEYS, editing, onChange);
  const [bundleOn, setBundleOn] = useState(false);
  const [bundle, setBundle] = useState(null); // x₁ of bundle A on the budget line
  const opt = consumer(v);
  const baseOpt = consumer(base);
  const xMax = niceMax(1.6 * (base.m / base.p1));
  const yMax = niceMax(1.6 * (base.m / base.p2));
  const budgetMoved = !editing && ['m', 'p1', 'p2'].some((k) => v[k] !== base[k]);
  const sliders = useMemo(() => ({
    m: range(base.m * 0.25, base.m * 2),
    p1: range(base.p1 * 0.25, base.p1 * 3),
    p2: range(base.p2 * 0.25, base.p2 * 3),
  }), [base.m, base.p1, base.p2]);

  // Bundle A: on the budget line, clamped to it when income or prices change.
  const x1Max = v.m / v.p1;
  const aStep = niceStep(x1Max * 0.96);
  const aX1 = bundleOn ? Math.min(x1Max * 0.98, Math.max(x1Max * 0.02, bundle ?? opt.x1 * 0.45)) : null;
  const aX2 = bundleOn ? (v.m - v.p1 * aX1) / v.p2 : null;
  const aU = bundleOn ? aX1 ** v.alpha * aX2 ** (1 - v.alpha) : null;
  const aMrs = bundleOn ? mrsAt(v.alpha, aX1, aX2) : null;

  const curve = (u) => {
    const out = [];
    for (let i = 1; i <= 160; i += 1) {
      const x1 = (xMax * 1.05 * i) / 160;
      out.push([x1, Math.min(indifferenceX2(u, v.alpha, x1), yMax * 4)]);
    }
    return out;
  };

  const draw = ({ X, Y }) => (
    <>
      <polygon className="demo-area budget" points={pts([[0, 0], [0, v.m / v.p2], [v.m / v.p1, 0]], X, Y)} />
      {budgetMoved && <polyline className="demo-curve budget demo-base" points={pts([[0, base.m / base.p2], [base.m / base.p1, 0]], X, Y)} />}
      {!bundleOn && <polyline className="demo-curve u faint" points={pts(curve(opt.u * 0.65), X, Y)} />}
      {!bundleOn && <polyline className="demo-curve u faint" points={pts(curve(opt.u * 1.45), X, Y)} />}
      {bundleOn && <polyline className="demo-curve a" points={pts(curve(aU), X, Y)} />}
      <polyline className="demo-curve u" points={pts(curve(opt.u), X, Y)} />
      <polyline className="demo-curve budget" points={pts([[0, v.m / v.p2], [v.m / v.p1, 0]], X, Y)} />
      <line className="demo-guide" x1={X(0)} y1={Y(opt.x2)} x2={X(opt.x1)} y2={Y(opt.x2)} />
      <line className="demo-guide" x1={X(opt.x1)} y1={Y(0)} x2={X(opt.x1)} y2={Y(opt.x2)} />
      {budgetMoved && <circle className="demo-point faint" cx={X(baseOpt.x1)} cy={Y(baseOpt.x2)} r={4.5} />}
    </>
  );

  const overlay = ({ X, Y, inside }) => {
    const xl = xMax * 0.9;
    const yl = indifferenceX2(opt.u, v.alpha, xl);
    return (
      <>
        {inside(xl, yl) && <text className="demo-tag u" x={X(xl)} y={Y(yl) - 9} textAnchor="middle">U*</text>}
        {inside(opt.x1, opt.x2) && (
          <>
            <circle className="demo-point" cx={X(opt.x1)} cy={Y(opt.x2)} r={6} />
            <text className="demo-tag" x={X(opt.x1) + 9} y={Y(opt.x2) - 9}>O</text>
          </>
        )}
        {bundleOn && inside(aX1, aX2) && (
          <>
            <circle className="demo-point a" cx={X(aX1)} cy={Y(aX2)} r={6} />
            <text className="demo-tag a" x={X(aX1) + 9} y={Y(aX2) - 9}>A</text>
          </>
        )}
      </>
    );
  };

  let verdict = null;
  if (bundleOn) {
    const ratio = aMrs / opt.mrs;
    verdict = Math.abs(ratio - 1) < 0.03 ? t.demo.atOptimum
      : aMrs > opt.mrs ? t.demo.buyMore(f(aMrs), f(opt.mrs)) : t.demo.buyLess(f(aMrs), f(opt.mrs));
  }

  const a = f(v.alpha);
  const b = f(+(1 - v.alpha).toFixed(4));
  return (
    <DemoFrame block={block} changed={changed || bundleOn} onReset={() => { reset(); setBundleOn(false); setBundle(null); }} t={t}>
      <div className="demo-eq">
        <span className="budget">{f(v.p1)}·x₁ + {f(v.p2)}·x₂ = {f(v.m)}</span>
        <span className="u">U = x₁<sup>{a}</sup> · x₂<sup>{b}</sup></span>
      </div>
      <Plot xMax={xMax} yMax={yMax} xLabel={`${t.demo.good1} (x₁)`} yLabel={`${t.demo.good2} (x₂)`} fmt={f} draw={draw} overlay={overlay}
        label={`${t.demo.optimum}: x₁* = ${f(opt.x1)}, x₂* = ${f(opt.x2)}`} />
      {budgetMoved && <p className="demo-note">{t.demo.baseline}</p>}
      <div className="demo-readouts">
        <Readout label="x₁*" value={f(opt.x1)} />
        <Readout label="x₂*" value={f(opt.x2)} />
        <Readout label={`${t.demo.mrt} = p₁/p₂`} value={f(opt.mrs)} tone="budget" />
        <Readout label={`${t.demo.mrs} ${t.demo.atOpt}`} value={f(opt.mrs)} tone="u" />
        {bundleOn ? (
          <>
            <Readout label={`${t.demo.mrs} ${t.demo.inA}`} value={f(aMrs)} tone="a" />
            <Readout label={`${t.demo.utility}: A → O`} value={`${f(aU)} → ${f(opt.u)}`} />
          </>
        ) : (
          <>
            <Readout label={`${t.demo.spending} p₁·x₁*`} value={f(opt.spend1)} tone="budget" />
            <Readout label={`${t.demo.spending} p₂·x₂*`} value={f(opt.spend2)} tone="budget" />
          </>
        )}
      </div>
      {verdict && <p className="demo-verdict">{verdict}</p>}
      {editing ? (
        <div className="demo-fields">
          <NumberField name="m" label={t.demo.m} value={v.m} min={0.1} onChange={(m) => set({ m })} />
          <NumberField name="p₁" label={t.demo.p1} value={v.p1} min={0.001} onChange={(p1) => set({ p1 })} />
          <NumberField name="p₂" label={t.demo.p2} value={v.p2} min={0.001} onChange={(p2) => set({ p2 })} />
          <NumberField name="α" label={t.demo.alpha} value={v.alpha} min={0.05} max={0.95} onChange={(alpha) => set({ alpha })} />
        </div>
      ) : (
        <>
          <div className="demo-sliders">
            <Slider name="m" label={t.demo.m} value={v.m} {...sliders.m} fmt={f} onChange={(m) => set({ m })} />
            <Slider name="p₁" label={t.demo.p1} value={v.p1} {...sliders.p1} fmt={f} onChange={(p1) => set({ p1 })} />
            <Slider name="p₂" label={t.demo.p2} value={v.p2} {...sliders.p2} fmt={f} onChange={(p2) => set({ p2 })} />
            <Slider name="α" label={t.demo.alpha} value={v.alpha} min={0.1} max={0.9} step={0.05} fmt={f} onChange={(alpha) => set({ alpha })} />
          </div>
          <label className="mk-check">
            <input type="checkbox" checked={bundleOn} onChange={(e) => { setBundleOn(e.target.checked); setBundle(null); }} /> {t.demo.bundleMode}
          </label>
          {bundleOn && (
            <div className="demo-sliders">
              <Slider name="A" label={t.demo.bundle} value={snap(aX1, aStep)} min={snap(x1Max * 0.02, aStep)} max={snap(x1Max * 0.98, aStep)} step={aStep} fmt={f} onChange={setBundle} />
            </div>
          )}
        </>
      )}
    </DemoFrame>
  );
}

export function ConsumerChoiceView({ block }) {
  return <ConsumerChoiceDemo block={block} />;
}

// ------------------------------------------------------------------- Editors
function DemoEditFields({ block, onChange, autoFocus, children }) {
  return (
    <div className="ed-stack">
      <input className="input input-sm" value={block.title} autoFocus={autoFocus} placeholder="Überschrift der Demo (optional)" maxLength={200}
        onChange={(e) => onChange({ title: e.target.value })} />
      <p className="ed-help">Die Zahlen sind der Startzustand. Lernende verändern sie mit Reglern – gespeichert wird dabei nichts.</p>
      {children}
      <input className="input input-sm" value={block.caption} placeholder="Bildunterschrift / Aufgabe (optional)" maxLength={500}
        onChange={(e) => onChange({ caption: e.target.value })} />
    </div>
  );
}

export function SupplyDemandEdit({ block, onChange, autoFocus }) {
  return (
    <DemoEditFields block={block} onChange={onChange} autoFocus={autoFocus}>
      <MarketDemo block={{ ...block, title: '', caption: '' }} editing onChange={onChange} />
    </DemoEditFields>
  );
}

export function ConsumerChoiceEdit({ block, onChange, autoFocus }) {
  return (
    <DemoEditFields block={block} onChange={onChange} autoFocus={autoFocus}>
      <ConsumerChoiceDemo block={{ ...block, title: '', caption: '' }} editing onChange={onChange} />
    </DemoEditFields>
  );
}
