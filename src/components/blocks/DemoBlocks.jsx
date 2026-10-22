// Interactive demos: change the numbers, watch the curves. Viewers move sliders
// (nothing is saved); the admin sets the starting point with number fields.
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import Plot, { pts } from './demos/Plot.jsx';
import { Slider, NumberField, Readout, numberFormat } from './demos/DemoControls.jsx';
import { Inline } from '../Inline.jsx';
import { useBlockLang, useBlockText } from '../../lib/blockText.js';
import { market, priceControl, consumer, indifferenceX2, niceMax, niceStep, snap } from '../../lib/demos.js';

const SD_KEYS = ['a', 'b', 'c', 'd', 'control', 'controlPrice'];
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
function SupplyDemandDemo({ block, editing = false, onChange }) {
  const t = useBlockText();
  const lang = useBlockLang();
  const f = numberFormat(lang);
  const { v, base, set, changed, reset } = useDemoState(block, SD_KEYS, editing, onChange);
  const eq = market(v);
  const baseEq = market(base);
  // Axes come from the starting point, so a shift is visible as a shift (they don't rescale).
  const yMax = niceMax(1.4 * Math.max(baseEq.choke, baseEq.pStar > 0 ? baseEq.pStar : 0, 1));
  const xMax = niceMax(1.4 * Math.max(base.a, baseEq.qStar > 0 ? baseEq.qStar : 0, 1));
  const ctl = v.control !== 'none' ? priceControl(v, v.control, v.controlPrice) : null;
  const curvesMoved = !editing && ['a', 'b', 'c', 'd'].some((k) => v[k] !== base[k]);

  const sliders = useMemo(() => ({
    a: range(Math.max(base.a * 0.3, 0.1), base.a * 2),
    b: range(base.b * 0.25, base.b * 3),
    c: range(base.c - 0.6 * base.a, base.c + 0.6 * base.a),
    d: range(base.d * 0.25, base.d * 3),
    p: range(0, yMax),
  }), [base.a, base.b, base.c, base.d, yMax]);

  const setControl = (control) => {
    if (control === 'none' || !eq.valid) { set({ control }); return; }
    const step = sliders.p.step;
    const fits = control === 'ceiling' ? v.controlPrice > 0 && v.controlPrice < eq.pStar : v.controlPrice > eq.pStar;
    set({ control, controlPrice: fits ? v.controlPrice : snap(eq.pStar * (control === 'ceiling' ? 0.75 : 1.25), step) });
  };

  const demandLine = (p) => [[0, p.a / p.b], [p.a, 0]];
  const supplyLine = (p) => [[Math.max(0, p.c), Math.max(0, -p.c / p.d)], [p.c + p.d * yMax * 2, yMax * 2]];

  const draw = ({ X, Y }) => (
    <>
      {eq.valid && !ctl && (
        <>
          <polygon className="demo-area cs" points={pts([[0, eq.choke], [eq.qStar, eq.pStar], [0, eq.pStar]], X, Y)} />
          <polygon className="demo-area ps" points={pts([[0, eq.pStar], [eq.qStar, eq.pStar], [Math.max(0, v.c), eq.p0], [0, eq.p0]], X, Y)} />
        </>
      )}
      {curvesMoved && (
        <>
          <polyline className="demo-curve d demo-base" points={pts(demandLine(base), X, Y)} />
          <polyline className="demo-curve s demo-base" points={pts(supplyLine(base), X, Y)} />
        </>
      )}
      <polyline className="demo-curve d" points={pts(demandLine(v), X, Y)} />
      <polyline className="demo-curve s" points={pts(supplyLine(v), X, Y)} />
      {eq.valid && (
        <>
          <line className="demo-guide" x1={X(0)} y1={Y(eq.pStar)} x2={X(eq.qStar)} y2={Y(eq.pStar)} />
          <line className="demo-guide" x1={X(eq.qStar)} y1={Y(0)} x2={X(eq.qStar)} y2={Y(eq.pStar)} />
        </>
      )}
      {ctl && (
        <>
          <line className={`demo-control ${v.control}`} x1={X(0)} y1={Y(v.controlPrice)} x2={X(xMax)} y2={Y(v.controlPrice)} />
          {ctl.binding && <line className={`demo-gap ${v.control}`} x1={X(ctl.qs)} y1={Y(v.controlPrice)} x2={X(ctl.qd)} y2={Y(v.controlPrice)} />}
        </>
      )}
    </>
  );

  const overlay = ({ X, Y, inside }) => {
    const qD = Math.min(v.a, xMax) * 0.9;
    let pS = yMax * 0.85;
    let qS = v.c + v.d * pS;
    if (qS > xMax * 0.88) { qS = xMax * 0.88; pS = (qS - v.c) / v.d; }
    return (
      <>
        {inside(qD, (v.a - qD) / v.b) && <text className="demo-tag d" x={X(qD) + 6} y={Y((v.a - qD) / v.b) - 8}>D</text>}
        {inside(qS, pS) && <text className="demo-tag s" x={X(qS) - 6} y={Y(pS) - 10} textAnchor="end">S</text>}
        {eq.valid && inside(eq.qStar, eq.pStar) && (
          <>
            <circle className="demo-point" cx={X(eq.qStar)} cy={Y(eq.pStar)} r={6} />
            <text className="demo-tag" x={X(eq.qStar) + 9} y={Y(eq.pStar) - 9}>E</text>
          </>
        )}
      </>
    );
  };

  const n = (x) => f(x);
  return (
    <DemoFrame block={block} changed={changed} onReset={reset} t={t}>
      <div className="demo-eq">
        <span className="d">Q<sub>D</sub> = {n(v.a)} − {n(v.b)}·P</span>
        <span className="s">Q<sub>S</sub> = {v.c === 0 ? '' : `${n(v.c)} `}{v.c === 0 ? '' : '+ '}{n(v.d)}·P</span>
      </div>
      <Plot xMax={xMax} yMax={yMax} xLabel={t.demo.quantity} yLabel={t.demo.price} fmt={f} draw={draw} overlay={overlay}
        label={`${t.demo.equilibrium}: P* = ${n(eq.pStar)}, Q* = ${n(eq.qStar)}`} />
      {curvesMoved && <p className="demo-note">{t.demo.baseline}</p>}
      {eq.valid ? (
        <div className="demo-readouts">
          <Readout label="P*" value={n(eq.pStar)} />
          <Readout label="Q*" value={n(eq.qStar)} />
          {/* The surpluses shown are those of the free market — hidden while a price control is on. */}
          {!ctl && <Readout label={t.demo.cs} value={n(eq.cs)} tone="cs" />}
          {!ctl && <Readout label={t.demo.ps} value={n(eq.ps)} tone="ps" />}
          {ctl && (ctl.binding ? (
            <>
              <Readout label={v.control === 'ceiling' ? t.demo.shortage : t.demo.surplus} value={n(ctl.gap)} tone={v.control} />
              <Readout label={t.demo.traded} value={n(ctl.traded)} />
            </>
          ) : <Readout label={v.control === 'ceiling' ? t.demo.ceiling : t.demo.floor} value={t.demo.notBinding} />)}
        </div>
      ) : <p className="demo-warning">{t.demo.noEquilibrium}</p>}

      {editing ? (
        <div className="demo-fields">
          <NumberField name="a" label={t.demo.a} value={v.a} min={0.1} onChange={(a) => set({ a })} />
          <NumberField name="b" label={t.demo.b} value={v.b} min={0.001} onChange={(b) => set({ b })} />
          <NumberField name="c" label={t.demo.c} value={v.c} onChange={(c) => set({ c })} />
          <NumberField name="d" label={t.demo.d} value={v.d} min={0.001} onChange={(d) => set({ d })} />
        </div>
      ) : (
        <div className="demo-sliders">
          <Slider name="a" label={t.demo.a} value={v.a} {...sliders.a} fmt={f} onChange={(a) => set({ a })} />
          <Slider name="b" label={t.demo.b} value={v.b} {...sliders.b} fmt={f} onChange={(b) => set({ b })} />
          <Slider name="c" label={t.demo.c} value={v.c} {...sliders.c} fmt={f} onChange={(c) => set({ c })} />
          <Slider name="d" label={t.demo.d} value={v.d} {...sliders.d} fmt={f} onChange={(d) => set({ d })} />
        </div>
      )}

      <div className="demo-control-row">
        <span className="demo-control-label">{t.demo.control}</span>
        <div className="segmented segmented-sm" role="group" aria-label={t.demo.control}>
          {['none', 'ceiling', 'floor'].map((k) => (
            <button key={k} type="button" className={v.control === k ? 'on' : ''} aria-pressed={v.control === k} onClick={() => setControl(k)}>{t.demo[k]}</button>
          ))}
        </div>
      </div>
      {v.control !== 'none' && (editing
        ? <div className="demo-fields"><NumberField name="P" label={t.demo.controlPrice} value={v.controlPrice} min={0} onChange={(controlPrice) => set({ controlPrice })} /></div>
        : <div className="demo-sliders"><Slider name="P" label={t.demo.controlPrice} value={v.controlPrice} {...sliders.p} fmt={f} onChange={(controlPrice) => set({ controlPrice })} /></div>)}
    </DemoFrame>
  );
}

export function SupplyDemandView({ block }) {
  return <SupplyDemandDemo block={block} />;
}

// --------------------------------------------------------------- Consumer choice
function ConsumerChoiceDemo({ block, editing = false, onChange }) {
  const t = useBlockText();
  const lang = useBlockLang();
  const f = numberFormat(lang);
  const { v, base, set, changed, reset } = useDemoState(block, CC_KEYS, editing, onChange);
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
      <polyline className="demo-curve u faint" points={pts(curve(opt.u * 0.65), X, Y)} />
      <polyline className="demo-curve u faint" points={pts(curve(opt.u * 1.45), X, Y)} />
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
        {inside(xl, yl) && <text className="demo-tag u" x={X(xl)} y={Y(yl) - 9} textAnchor="middle">U</text>}
        {inside(opt.x1, opt.x2) && (
          <>
            <circle className="demo-point" cx={X(opt.x1)} cy={Y(opt.x2)} r={6} />
            <text className="demo-tag" x={X(opt.x1) + 9} y={Y(opt.x2) - 9}>O</text>
          </>
        )}
      </>
    );
  };

  const a = f(v.alpha);
  const b = f(+(1 - v.alpha).toFixed(4));
  return (
    <DemoFrame block={block} changed={changed} onReset={reset} t={t}>
      <div className="demo-eq">
        <span className="u">U = x₁<sup>{a}</sup> · x₂<sup>{b}</sup></span>
        <span className="budget">{f(v.p1)}·x₁ + {f(v.p2)}·x₂ = {f(v.m)}</span>
      </div>
      <Plot xMax={xMax} yMax={yMax} xLabel={`${t.demo.good1} (x₁)`} yLabel={`${t.demo.good2} (x₂)`} fmt={f} draw={draw} overlay={overlay}
        label={`${t.demo.optimum}: x₁* = ${f(opt.x1)}, x₂* = ${f(opt.x2)}`} />
      {budgetMoved && <p className="demo-note">{t.demo.baseline}</p>}
      <div className="demo-readouts">
        <Readout label="x₁*" value={f(opt.x1)} />
        <Readout label="x₂*" value={f(opt.x2)} />
        <Readout label={`${t.demo.mrs} = p₁/p₂`} value={f(opt.mrs)} tone="u" />
        <Readout label={t.demo.utility} value={f(opt.u)} />
        <Readout label={`${t.demo.spending} p₁·x₁*`} value={f(opt.spend1)} tone="budget" />
        <Readout label={`${t.demo.spending} p₂·x₂*`} value={f(opt.spend2)} tone="budget" />
      </div>
      {editing ? (
        <div className="demo-fields">
          <NumberField name="m" label={t.demo.m} value={v.m} min={0.1} onChange={(m) => set({ m })} />
          <NumberField name="p₁" label={t.demo.p1} value={v.p1} min={0.001} onChange={(p1) => set({ p1 })} />
          <NumberField name="p₂" label={t.demo.p2} value={v.p2} min={0.001} onChange={(p2) => set({ p2 })} />
          <NumberField name="α" label={t.demo.alpha} value={v.alpha} min={0.05} max={0.95} onChange={(alpha) => set({ alpha })} />
        </div>
      ) : (
        <div className="demo-sliders">
          <Slider name="m" label={t.demo.m} value={v.m} {...sliders.m} fmt={f} onChange={(m) => set({ m })} />
          <Slider name="p₁" label={t.demo.p1} value={v.p1} {...sliders.p1} fmt={f} onChange={(p1) => set({ p1 })} />
          <Slider name="p₂" label={t.demo.p2} value={v.p2} {...sliders.p2} fmt={f} onChange={(p2) => set({ p2 })} />
          <Slider name="α" label={t.demo.alpha} value={v.alpha} min={0.1} max={0.9} step={0.05} fmt={f} onChange={(alpha) => set({ alpha })} />
        </div>
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
      <SupplyDemandDemo block={{ ...block, title: '', caption: '' }} editing onChange={onChange} />
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
