// A small SVG chart for the interactive demos. It measures its own width and
// draws at 1 unit = 1 pixel, so labels stay readable on a phone. `draw` gets
// { X, Y } (data → pixels) and is clipped to the plot area; `overlay` isn't.
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ticks } from '../../../lib/demos.js';

const PAD = { L: 48, R: 16, T: 30, B: 42 };

export default function Plot({ xMax, yMax, xLabel, yLabel, fmt, label, draw, overlay }) {
  const box = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    setW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = Math.round(Math.min(420, Math.max(250, w * 0.66)));
  const clip = `clip${useId().replace(/[^\w-]/g, '')}`;
  const iw = Math.max(10, w - PAD.L - PAD.R);
  const ih = h - PAD.T - PAD.B;
  const X = (x) => PAD.L + (x / xMax) * iw;
  const Y = (y) => PAD.T + ih - (y / yMax) * ih;

  return (
    <div className="demo-plot" ref={box} style={{ height: h }}>
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
          <defs><clipPath id={clip}><rect x={PAD.L} y={PAD.T} width={iw} height={ih} /></clipPath></defs>
          {ticks(xMax, w < 420 ? 4 : 5).map((t) => (
            <g key={`x${t}`}>
              {t > 0 && <line className="demo-grid" x1={X(t)} x2={X(t)} y1={PAD.T} y2={PAD.T + ih} />}
              <text className="demo-tick" x={X(t)} y={PAD.T + ih + 17} textAnchor="middle">{fmt(t)}</text>
            </g>
          ))}
          {ticks(yMax, 4).map((t) => (
            <g key={`y${t}`}>
              {t > 0 && <line className="demo-grid" x1={PAD.L} x2={PAD.L + iw} y1={Y(t)} y2={Y(t)} />}
              <text className="demo-tick" x={PAD.L - 7} y={Y(t) + 4} textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          <line className="demo-axis" x1={PAD.L} y1={PAD.T + ih} x2={PAD.L + iw} y2={PAD.T + ih} />
          <line className="demo-axis" x1={PAD.L} y1={PAD.T} x2={PAD.L} y2={PAD.T + ih} />
          <text className="demo-axis-label" x={PAD.L + iw} y={h - 5} textAnchor="end">{xLabel}</text>
          <text className="demo-axis-label" x={6} y={16}>{yLabel}</text>
          <g clipPath={`url(#${clip})`}>{draw({ X, Y })}</g>
          {overlay?.({ X, Y, inside: (x, y) => x >= 0 && x <= xMax && y >= 0 && y <= yMax })}
        </svg>
      )}
    </div>
  );
}

/** "x,y x,y …" for a polyline from data points. */
export const pts = (points, X, Y) => points.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
