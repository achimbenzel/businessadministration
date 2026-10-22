// The supply & demand demo: scenarios, sliders, a chart with lettered surplus
// areas (A, B, C …), what each area means, who wins and who loses, and the
// results compared with the starting point. The block's numbers are the
// starting market; nothing the viewer changes is saved.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { analyze, curves, scenarios as makeScenarios, centroid } from '../../lib/market.js';
import { MARKET_TEXT, SCENARIO_GROUPS } from '../../lib/marketText.js';
import { niceMax, niceStep, snap, ticks } from '../../lib/demos.js';
import { useBlockLang } from '../../lib/blockText.js';
import { numberFormat, NumberField } from './demos/DemoControls.jsx';
import { useElementWidth } from './demos/useElementWidth.js';
import { Inline } from '../Inline.jsx';

const NUM_KEYS = ['ds', 'ss', 'b', 'd', 'pc', 'pw', 'tariff'];
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The viewer's starting state from the block's numbers. */
function startOf(block) {
  const { Pe } = curves(block);
  const mode = block.control === 'none' ? 'closed' : block.control;
  return {
    ds: 0, ss: 0, b: block.b, d: block.d, mode,
    pc: block.controlPrice > 0 ? block.controlPrice : +(Pe * (block.control === 'floor' ? 1.25 : 0.75)).toFixed(2),
    pw: block.worldPrice > 0 ? block.worldPrice : +(Pe * 0.6).toFixed(2),
    tariff: block.tariff || 0,
  };
}

function range(lo, hi) {
  const step = niceStep(hi - lo);
  return { min: snap(lo, step), max: snap(hi, step), step };
}

export default function MarketDemo({ block, editing = false, onChange }) {
  const lang = useBlockLang();
  const T = MARKET_TEXT[lang] || MARKET_TEXT.de;
  const f = numberFormat(lang);
  const base = useMemo(() => ({ a: block.a, b: block.b, c: block.c, d: block.d }), [block.a, block.b, block.c, block.d]);
  // Keyed on the numbers, not the object: the editor passes a fresh object on every render.
  const startKey = [block.a, block.b, block.c, block.d, block.control, block.controlPrice, block.worldPrice, block.tariff].join('|');
  const start = useMemo(() => startOf(block), [startKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = useMemo(() => makeScenarios(base), [base]);

  const [state, setState] = useState(start);   // what the controls show
  const [view, setView] = useState(start);     // what the chart shows (animates towards state)
  const [scen, setScen] = useState('base');
  const [opts, setOpts] = useState({ areas: true, ghost: true, letters: true });
  const [hl, setHl] = useState(null);
  const anim = useRef(0);

  // A new starting point (admin edits, reload) resets the demo.
  useEffect(() => { setState(start); setView(start); setScen('base'); }, [start]);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const animateTo = (target) => {
    cancelAnimationFrame(anim.current);
    setState(target);
    if (reduceMotion()) { setView(target); return; }
    const from = { ...view, mode: target.mode };
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 480);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const next = { ...target };
      for (const k of NUM_KEYS) next[k] = from[k] + (target[k] - from[k]) * e;
      setView(next);
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  const pick = (id) => {
    setScen(id);
    const s = sc[id];
    animateTo({ ...start, b: base.b, d: base.d, ...s, pc: s.pc ?? start.pc, pw: s.pw ?? start.pw, tariff: s.tariff ?? 0 });
  };
  const set = (patch) => {
    if (editing) {
      onChange(patch);
      return;
    }
    cancelAnimationFrame(anim.current);
    const next = { ...state, ...patch };
    // A ceiling / floor that wouldn't bind is moved to the binding side when the mode is switched on.
    if (patch.mode === 'ceiling' || patch.mode === 'floor') {
      const { Pe } = curves({ a: base.a + next.ds, b: next.b, c: base.c + next.ss, d: next.d });
      const step = niceStep(yMax);
      if (patch.mode === 'ceiling' && !(next.pc < Pe)) next.pc = snap(Pe * 0.75, step);
      if (patch.mode === 'floor' && !(next.pc > Pe)) next.pc = snap(Pe * 1.25, step);
    }
    setState(next);
    setView(next);
    setScen('custom');
  };

  const params = (s) => ({ a: base.a + s.ds, b: s.b, c: base.c + s.ss, d: s.d, mode: s.mode, pc: s.pc, pw: s.pw, tariff: s.tariff });
  const r = analyze(params(view));
  const r0 = analyze({ ...base, mode: 'closed' });
  const xMax = niceMax(1.25 * Math.max(base.a, r0.Qe > 0 ? r0.Qe : 0, 1));
  const yMax = niceMax(1.2 * Math.max(r0.choke, r0.Pe > 0 ? r0.Pe : 0, 1));
  const sl = {
    shift: range(-0.6 * Math.max(r0.Qe, 1), 0.6 * Math.max(r0.Qe, 1)),
    b: range(base.b * 0.25, base.b * 3),
    d: range(base.d * 0.25, base.d * 3),
    price: range(0, yMax),
    tariff: range(0, yMax / 2),
  };
  const shifted = ['ds', 'ss'].some((k) => Math.abs(view[k]) > 1e-6) || Math.abs(view.b - base.b) > 1e-9 || Math.abs(view.d - base.d) > 1e-9;
  const changed = !editing && (scen !== 'base' || NUM_KEYS.some((k) => Math.abs(state[k] - start[k]) > 1e-9) || state.mode !== start.mode);
  const story = T.sc[scen] || T.sc.custom;

  return (
    <div className="demo market">
      <div className="demo-head">
        <span className="demo-badge"><SlidersHorizontal size={13} /> {lang === 'en' ? 'Interactive' : 'Interaktiv'}</span>
        {changed && <button type="button" className="btn btn-ghost btn-sm demo-reset" onClick={() => pick('base')}><RotateCcw size={14} /> {T.reset}</button>}
      </div>
      {block.title && <h3 className="demo-title"><Inline text={block.title} /></h3>}
      {editing && <p className="ed-help">{T.startHint}</p>}

      {!editing && (
        <div className="mk-scen" aria-label={T.scenarios}>
          {SCENARIO_GROUPS.map((g) => (
            <div className="mk-group" key={g.key}>
              <h4><span className="mk-swatch" style={{ background: g.color }} />{T.groups[g.key]}</h4>
              <div className="mk-chips">
                {g.items.map((id) => (
                  <button key={id} type="button" className={`mk-chip ${scen === id ? 'on' : ''}`} aria-pressed={scen === id} onClick={() => pick(id)}>
                    {T.sc[id].name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="demo-eq">
        <span className="d">Q<sub>D</sub> = {f(base.a + view.ds)} − {f(view.b)}·P</span>
        <span className="s">Q<sub>S</sub> = {base.c + view.ss === 0 ? '' : `${f(base.c + view.ss)} + `}{f(view.d)}·P</span>
      </div>

      {r.invalid ? <p className="demo-warning">{T.invalid}</p> : (
        <MarketChart r={r} r0={r0} base={base} view={view} xMax={xMax} yMax={yMax} T={T} f={f}
          opts={opts} shifted={shifted} hl={hl} setHl={setHl} />
      )}
      {!r.invalid && opts.areas && <Legend r={r} T={T} ghost={opts.ghost && shifted} />}

      {editing ? (
        <div className="demo-fields">
          <NumberField name="a" label="Q_D = a − b·P" value={block.a} min={0.1} onChange={(a) => set({ a })} />
          <NumberField name="b" label="Q_D = a − b·P" value={block.b} min={0.001} onChange={(b) => set({ b })} />
          <NumberField name="c" label="Q_S = c + d·P" value={block.c} onChange={(c) => set({ c })} />
          <NumberField name="d" label="Q_S = c + d·P" value={block.d} min={0.001} onChange={(d) => set({ d })} />
          <label className="demo-num">
            <span><b>{T.market}</b></span>
            <select className="input input-sm" value={block.control} onChange={(e) => set({ control: e.target.value })}>
              <option value="none">{T.modes.closed}</option>
              <option value="world">{T.modes.world}</option>
              <option value="ceiling">{T.modes.ceiling}</option>
              <option value="floor">{T.modes.floor}</option>
            </select>
          </label>
          {(block.control === 'ceiling' || block.control === 'floor') && (
            <NumberField name="P" label={block.control === 'ceiling' ? T.ceilingPrice : T.floorPrice} value={block.controlPrice} min={0} onChange={(controlPrice) => set({ controlPrice })} />
          )}
          {block.control === 'world' && (
            <>
              <NumberField name="P_W" label={T.worldPrice} value={block.worldPrice} min={0} onChange={(worldPrice) => set({ worldPrice })} />
              <NumberField name="t" label={T.tariff} value={block.tariff} min={0} onChange={(tariff) => set({ tariff })} />
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mk-controls">
            <fieldset>
              <legend>{T.curves}</legend>
              <Range label={T.demand} value={state.ds} {...sl.shift} f={(n) => signed(n, f)} ends={[T.less, T.more]} cls="d" onChange={(ds) => set({ ds })} />
              <Range label={T.supply} value={state.ss} {...sl.shift} f={(n) => signed(n, f)} ends={[T.less, T.more]} cls="s" onChange={(ss) => set({ ss })} />
              <details className="mk-details">
                <summary>{T.steepness}</summary>
                <p className="mk-hint">{T.steepHint}</p>
                <Range label={T.steepD} value={state.b} {...sl.b} f={f} ends={[T.steep, T.flat]} cls="d" onChange={(b) => set({ b })} />
                <Range label={T.steepS} value={state.d} {...sl.d} f={f} ends={[T.steep, T.flat]} cls="s" onChange={(d) => set({ d })} />
              </details>
            </fieldset>
            <fieldset>
              <legend>{T.market}</legend>
              <div className="mk-modes" role="group" aria-label={T.market}>
                {['closed', 'world', 'ceiling', 'floor'].map((m) => (
                  <button key={m} type="button" className={state.mode === m ? 'on' : ''} aria-pressed={state.mode === m} onClick={() => set({ mode: m })}>{T.modes[m]}</button>
                ))}
              </div>
              {state.mode === 'world' && (
                <>
                  <Range label={T.worldPrice} value={state.pw} {...sl.price} f={f} cls="w" onChange={(pw) => set({ pw })} />
                  <Range label={T.tariff} value={state.tariff} {...sl.tariff} f={f} cls="w" onChange={(tariff) => set({ tariff })} />
                </>
              )}
              {(state.mode === 'ceiling' || state.mode === 'floor') && (
                <Range label={state.mode === 'ceiling' ? T.ceilingPrice : T.floorPrice} value={state.pc} {...sl.price} f={f} cls="g" onChange={(pc) => set({ pc })} />
              )}
            </fieldset>
            <fieldset>
              <legend>{T.display}</legend>
              {[['areas', T.showAreas], ['ghost', T.showGhost], ['letters', T.showLetters]].map(([k, label]) => (
                <label className="mk-check" key={k}>
                  <input type="checkbox" checked={opts[k]} onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))} /> {label}
                </label>
              ))}
            </fieldset>
          </div>

          <div className="mk-story" aria-live="polite">
            <h4>{story.name}</h4>
            <dl>
              <dt>{T.why}</dt><dd>{story.why}</dd>
              <dt>{T.what}</dt><dd>{story.what}</dd>
            </dl>
            {r.notes.map((n) => <p className="mk-note" key={n}>{T.notes[n]}</p>)}
            {!r.invalid && (
              <p className="mk-delta">{T.delta(T.verb(r0.Pe, r.P, f), T.verb(r0.Qe, r.Q, f), r.mode === 'world')}</p>
            )}
          </div>

          {!r.invalid && (
            <div className="mk-panels">
              <Results r={r} r0={r0} T={T} f={f} />
              <Areas r={r} T={T} f={f} hl={hl} setHl={setHl} />
            </div>
          )}
        </>
      )}
      {block.caption && <p className="demo-caption"><Inline text={block.caption} /></p>}
    </div>
  );
}

const signed = (n, f) => (Math.abs(n) < 1e-9 ? '±0' : `${n > 0 ? '+' : '−'}${f(Math.abs(n))}`);

function Range({ label, value, min, max, step, f, ends, cls = '', onChange }) {
  const v = Math.min(max, Math.max(min, value));
  const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
  return (
    <label className={`mk-range ${cls}`}>
      <span className="mk-range-head"><span>{label}</span><output>{f(value)}</output></span>
      <input type="range" min={min} max={max} step={step} value={v} style={{ '--p': `${pct}%` }} aria-valuetext={f(value)}
        onChange={(e) => onChange(Number(e.target.value))} />
      {ends && <span className="mk-ends"><span>{ends[0]}</span><span>{ends[1]}</span></span>}
    </label>
  );
}

function Legend({ r, T, ghost }) {
  const items = [['cs', T.legend.cs], ['ps', T.legend.ps]];
  if (r.rev > 0.05) items.push(['rev', T.legend.rev]);
  if (r.dwl > 0.05) items.push(['dwl', T.legend.dwl]);
  if (ghost) items.push(['ghost', T.legend.ghost]);
  return (
    <div className="mk-legend">
      {items.map(([k, label]) => <span key={k}><i className={`mk-sw ${k}`} />{label}</span>)}
    </div>
  );
}

function Results({ r, r0, T, f }) {
  const rows = [];
  const row = (label, now, start, total = false) => rows.push({ label, now, start, total });
  row(T.rows.price, r.P, r0.Pe);
  if (r.mode === 'world') {
    row(T.rows.qd, r.qd, r0.Qe);
    row(T.rows.qs, r.qs, r0.Qe);
    if (r.trade > 0.05) row(T.rows.imports, r.trade, 0);
    else if (r.trade < -0.05) row(T.rows.exports, -r.trade, 0);
  } else {
    row(T.rows.qty, r.Q, r0.Qe);
  }
  if (r.mode === 'ceiling' && !r.nb) row(T.rows.shortage, r.gap, null);
  if (r.mode === 'floor' && !r.nb) row(T.rows.surplus, r.gap, null);
  row(T.rows.cs, r.CS, r0.CS);
  row(T.rows.ps, r.PS, r0.PS);
  if (r.rev > 0.05) row(T.rows.rev, r.rev, 0);
  if (r.dwl > 0.05) row(T.rows.dwl, r.dwl, null);
  row(T.rows.w, r.W, r0.W, true);
  return (
    <section className="mk-card">
      <h4>{T.results}</h4>
      <table className="mk-table">
        <thead><tr><th /><th>{T.now}</th><th>{T.vsStart}</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.label} className={x.total ? 'total' : ''}>
              <th scope="row">{x.label}</th>
              <td className="now">{f(x.now)}</td>
              <td className="chg">{x.start == null ? '' : signed(x.now - x.start, f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Areas({ r, T, f, hl, setHl }) {
  const reg = r.regions;
  const meaning = T.areas[reg.kind] || T.areas.closed;
  return (
    <section className="mk-card">
      <h4>{T.areasTitle}</h4>
      <p className="mk-ref">{T.refs[reg.ref]}</p>
      <ul className="mk-areas" onMouseLeave={() => setHl(null)}>
        {reg.list.map((x) => (
          <li key={x.id} tabIndex={0} className={hl === x.id ? 'on' : ''} onMouseEnter={() => setHl(x.id)} onFocus={() => setHl(x.id)} onBlur={() => setHl(null)}>
            <span className={`mk-badge ${x.cls}`}>{x.id}</span>
            <span className="mk-meaning">{meaning[x.id]}</span>
            <span className="mk-val">{f(x.val)}</span>
          </li>
        ))}
      </ul>
      <h4 className="mk-sub">{T.winners}</h4>
      <table className="mk-table mk-wl">
        <tbody>
          {reg.sums.map(([who, formula, val]) => (
            <tr key={who} className={who === 'society' ? 'total' : ''}>
              <th scope="row">{T.who[who]}</th>
              <td className="formula">{formula}</td>
              <td className="now">{reg.ref === 'none' ? f(val) : signed(val, f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ------------------------------------------------------------------- Chart
function MarketChart({ r, r0, base, view, xMax, yMax, T, f, opts, shifted, hl, setHl }) {
  const [box, w] = useElementWidth();
  const uid = useId().replace(/[^\w-]/g, '');
  const small = w < 520;
  // Phones get a near-square plot, wider screens a flatter one.
  const h = Math.round(small ? Math.max(330, w * 0.98) : Math.min(500, Math.max(320, w * 0.62)));
  const M = { L: small ? 50 : 58, R: 14, T: 28, B: small ? 46 : 52 };
  const iw = Math.max(10, w - M.L - M.R);
  const ih = h - M.T - M.B;
  const X = (q) => M.L + (q / xMax) * iw;
  const Y = (p) => M.T + ih - (p / yMax) * ih;
  const P = (pts) => pts.map(([q, p]) => `${X(q).toFixed(1)},${Y(Math.min(p, yMax * 1.6)).toFixed(1)}`).join(' ');
  const L = (q1, p1, q2, p2, cls, extra = {}) => <line className={cls} x1={X(q1)} y1={Y(p1)} x2={X(q2)} y2={Y(p2)} {...extra} />;

  const { a, b, c, d } = { a: base.a + view.ds, b: view.b, c: base.c + view.ss, d: view.d };
  const demandPts = [[0, a / b], [a, 0]];
  const supplyPts = [[Math.max(0, c), Math.max(0, -c / d)], [c + d * yMax * 1.6, yMax * 1.6]];
  const xVals = [];
  const yVals = [];
  const marks = [];
  const labels = [];

  // Price lines of the market mode, dots and drop lines.
  if (r.mode === 'world') {
    marks.push(L(0, r.pw, xMax, r.pw, 'mk-wline', { key: 'pw' }));
    labels.push(<text key="pwl" className="mk-lbl w" x={X(xMax) - 4} y={Y(r.pw) + 16} textAnchor="end">{small ? <>P<tspan className="sub" dy="3">W</tspan></> : T.lines.world}</text>);
    if (r.teff > 0.05) {
      marks.push(L(0, r.P, xMax, r.P, 'mk-wtline', { key: 'pt' }));
      labels.push(<text key="ptl" className="mk-lbl w" x={X(xMax) - 4} y={Y(r.P) - 7} textAnchor="end">{small ? <>P<tspan className="sub" dy="3">W</tspan><tspan dy="-3"> + t</tspan></> : T.lines.worldTariff}</text>);
    }
    marks.push(L(r.qs, r.P, r.qs, 0, 'mk-drop', { key: 'd1' }), L(r.qd, r.P, r.qd, 0, 'mk-drop', { key: 'd2' }));
    yVals.push(r.P); if (r.teff > 0.05 && Math.abs(Y(r.P) - Y(r.pw)) > 18) yVals.push(r.pw);
    if (r.qs > 0.3) xVals.push(r.qs);
    xVals.push(r.qd);
  } else if ((r.mode === 'ceiling' || r.mode === 'floor') && !r.nb) {
    marks.push(L(0, r.P, xMax, r.P, 'mk-gline', { key: 'pc' }));
    labels.push(<text key="pcl" className="mk-lbl g" x={X(xMax) - 4} y={Y(r.P) - 7} textAnchor="end">{T.lines[r.mode]}</text>);
    marks.push(L(r.qs, r.P, r.qs, 0, 'mk-drop', { key: 'd1' }), L(r.qd, r.P, r.qd, 0, 'mk-drop', { key: 'd2' }));
    yVals.push(r.P);
    xVals.push(r.qs, r.qd);
  } else {
    if (r.mode === 'ceiling' || r.mode === 'floor') {
      marks.push(L(0, r.pc, xMax, r.pc, 'mk-gline', { key: 'pc' }));
      labels.push(<text key="pcl" className="mk-lbl g" x={X(xMax) - 4} y={Y(r.pc) - 7} textAnchor="end">{T.lines[r.mode]}</text>);
    }
    marks.push(L(0, r.Pe, r.Qe, r.Pe, 'mk-drop', { key: 'e1' }), L(r.Qe, r.Pe, r.Qe, 0, 'mk-drop', { key: 'e2' }));
    yVals.push(r.Pe);
    xVals.push(r.Qe);
  }

  // Lettered areas. Letters of slivers, or ones that would sit on a point or
  // another letter, are left out; the list below the chart still names them.
  const areas = [];
  const letters = [];
  const taken = [[X(r.Qe), Y(r.Pe)]];
  if (r.mode !== 'closed' && !r.nb) taken.push([X(r.qs), Y(r.P)], [X(r.qd), Y(r.P)]);
  const free = ([x, y]) => taken.every(([tx, ty]) => Math.abs(tx - x) > 20 || Math.abs(ty - y) > 20);
  for (const x of r.regions.list) {
    if (x.val < 0.5) continue;
    areas.push(
      <polygon key={x.id} className={`mk-area ${opts.areas ? x.cls : 'none'} ${hl === x.id ? 'hl' : ''}`} points={P(x.pts)}
        onMouseEnter={() => setHl(x.id)} onMouseLeave={() => setHl(null)} />,
    );
    if (!opts.letters) continue;
    const px = x.pts.map(([q, p]) => [X(q), Y(Math.min(p, yMax))]);
    const cpt = centroid(px, small ? 320 : 280);
    if (!cpt || !free(cpt)) continue;
    taken.push(cpt);
    letters.push(<text key={`l${x.id}`} className="mk-letter" x={cpt[0]} y={cpt[1] + 7} textAnchor="middle">{x.id}</text>);
  }

  // Starting curves and the move of the equilibrium.
  const ghost = opts.ghost && shifted;
  const pointsE = [];
  if (ghost) {
    pointsE.push(<polyline key="gD" className="mk-curve d ghost" points={P([[0, base.a / base.b], [base.a, 0]])} />);
    pointsE.push(<polyline key="gS" className="mk-curve s ghost" points={P([[Math.max(0, base.c), Math.max(0, -base.c / base.d)], [base.c + base.d * yMax * 1.6, yMax * 1.6]])} />);
  }
  const eLabel = shifted ? 'E₁' : 'E';
  if (r.mode === 'closed' || r.nb) {
    if (ghost && (Math.abs(r.Qe - r0.Qe) > 0.5 || Math.abs(r.Pe - r0.Pe) > 0.5)) {
      const dx = X(r.Qe) - X(r0.Qe); const dy = Y(r.Pe) - Y(r0.Pe); const len = Math.hypot(dx, dy);
      marks.push(<circle key="e0" className="mk-pt hollow" cx={X(r0.Qe)} cy={Y(r0.Pe)} r={5} />);
      labels.push(<text key="e0l" className="mk-lbl muted" x={X(r0.Qe) + 10} y={Y(r0.Pe) + 5}>E₀</text>);
      if (len > 22) {
        const ux = dx / len; const uy = dy / len;
        marks.push(<line key="mv" className="mk-move" x1={X(r0.Qe) + ux * 9} y1={Y(r0.Pe) + uy * 9} x2={X(r.Qe) - ux * 11} y2={Y(r.Pe) - uy * 11} markerEnd={`url(#ah${uid})`} />);
      }
    }
    marks.push(<circle key="e" className="mk-pt" cx={X(r.Qe)} cy={Y(r.Pe)} r={6.5} />);
    labels.push(<text key="el" className="mk-lbl" x={X(r.Qe) + 11} y={Y(r.Pe) + 5}>{eLabel}</text>);
  } else {
    marks.push(<circle key="eh" className="mk-pt hollow" cx={X(r.Qe)} cy={Y(r.Pe)} r={5} />);
    labels.push(<text key="ehl" className="mk-lbl" x={X(r.Qe) + 10} y={Y(r.Pe) + 5}>E</text>);
    marks.push(<circle key="qs" className="mk-pt s" cx={X(r.qs)} cy={Y(r.P)} r={5.5} />, <circle key="qd" className="mk-pt d" cx={X(r.qd)} cy={Y(r.P)} r={5.5} />);
  }

  // Bracket: shortage / surplus / imports / exports.
  let gap = null;
  if ((r.mode === 'ceiling' || r.mode === 'floor') && !r.nb && r.gap > 0.5) gap = { lo: r.qs, hi: r.qd, p: r.P, kind: r.mode === 'ceiling' ? 'shortage' : 'surplus', below: r.mode === 'ceiling' };
  if (r.mode === 'world' && Math.abs(r.trade) > 0.5) gap = { lo: r.qs, hi: r.qd, p: r.teff > 0.05 ? r.pw : r.P, kind: r.trade > 0 ? 'imports' : 'exports', below: r.trade > 0 };
  if (gap) {
    const lo = Math.min(gap.lo, gap.hi); const hi = Math.max(gap.lo, gap.hi);
    const y = Y(gap.p) + (gap.below ? 18 : -16);
    labels.push(
      <g key="br">
        <line className="mk-br" x1={X(lo) + 2} y1={y} x2={X(hi) - 2} y2={y} markerStart={`url(#ah${uid})`} markerEnd={`url(#ah${uid})`} />
        <text className="mk-lbl" x={(X(lo) + X(hi)) / 2} y={gap.below ? y + 17 : y - 7} textAnchor="middle">{T.gaps[gap.kind]}: {f(hi - lo)}</text>
      </g>,
    );
  }

  // Curve labels inside the plot.
  const qdL = Math.min((a - 0.14 * yMax * b), xMax * 0.86);
  const pdL = (a - qdL) / b;
  if (qdL > 0 && pdL > 0 && pdL < yMax) labels.push(<text key="dl" className="mk-lbl d" x={X(qdL) + 8} y={Y(pdL) - 8}>D</text>);
  let psL = yMax * 0.9; let qsL = c + d * psL;
  if (qsL > xMax * 0.88) { qsL = xMax * 0.88; psL = (qsL - c) / d; }
  if (qsL > 0 && psL > 0 && psL < yMax) labels.push(<text key="sl" className="mk-lbl s" x={X(qsL) - 8} y={Y(psL) - 6} textAnchor="end">S</text>);

  // Axis values with a background; ticks next to them are left out.
  const near = (arr, v, gapPx, map) => arr.some((x) => Math.abs(map(x) - map(v)) < gapPx);
  const valBox = (x, y, s, anchor, key) => {
    const tw = s.length * (small ? 7 : 7.6) + 10;
    const bx = anchor === 'end' ? x - tw + 4 : x - tw / 2;
    return (
      <g key={key}>
        <rect className="mk-valbg" x={bx} y={y - 13} width={tw} height={18} rx={4} />
        <text className="mk-val" x={x} y={y} textAnchor={anchor}>{s}</text>
      </g>
    );
  };

  return (
    <div className="mk-chart" ref={box} style={{ height: h }}>
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`P = ${f(r.P)}, Q = ${f(r.Q)}`}>
          <defs>
            <clipPath id={`c${uid}`}><rect x={M.L} y={M.T - 6} width={iw} height={ih + 6} /></clipPath>
            <marker id={`ah${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="mk-arrow" /></marker>
            <marker id={`ax${uid}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" className="mk-arrow" /></marker>
            <pattern id={`hatch${uid}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" className="mk-hatch" />
            </pattern>
          </defs>
          <style>{`#mk${uid} .mk-area.dwl { fill: url(#hatch${uid}); }`}</style>
          <g id={`mk${uid}`}>
            {ticks(xMax, small ? 4 : 5).map((t) => (
              <g key={`x${t}`}>
                {t > 0 && <line className="demo-grid" x1={X(t)} x2={X(t)} y1={M.T} y2={M.T + ih} />}
                {!near(xVals, t, 26, X) && <text className="demo-tick" x={X(t)} y={M.T + ih + 18} textAnchor="middle">{f(t)}</text>}
              </g>
            ))}
            {ticks(yMax, 4).map((t) => (
              <g key={`y${t}`}>
                {t > 0 && <line className="demo-grid" x1={M.L} x2={M.L + iw} y1={Y(t)} y2={Y(t)} />}
                {!near(yVals, t, 16, Y) && <text className="demo-tick" x={M.L - 8} y={Y(t) + 4} textAnchor="end">{f(t)}</text>}
              </g>
            ))}
            <g clipPath={`url(#c${uid})`}>
              {areas}
              {pointsE}
              <polyline className="mk-curve d" points={P(demandPts)} />
              <polyline className="mk-curve s" points={P(supplyPts)} />
              {marks}
              {letters}
            </g>
            <line className="mk-axis" x1={M.L} y1={M.T + ih} x2={M.L} y2={M.T - 10} markerEnd={`url(#ax${uid})`} />
            <line className="mk-axis" x1={M.L} y1={M.T + ih} x2={M.L + iw + 6} y2={M.T + ih} markerEnd={`url(#ax${uid})`} />
            <text className="mk-axl" x={M.L + 10} y={M.T - 12}>{T.axisP}</text>
            <text className="mk-axl" x={M.L + iw} y={h - 6} textAnchor="end">{T.axisQ}</text>
            {labels}
            {yVals.map((p, i) => valBox(M.L - 6, Y(p) + 4.5, f(p), 'end', `yv${i}`))}
            {xVals.map((q, i) => valBox(X(q), M.T + ih + 18, f(q), 'middle', `xv${i}`))}
          </g>
        </svg>
      )}
    </div>
  );
}
