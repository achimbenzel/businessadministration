// Renders the formula syntax of lib/math.js as React elements (never HTML):
// exponents and indices, Σ / Π with limits, fractions and roots.
import { useMemo } from 'react';
import { parseMath } from '../lib/math.js';

function render(nodes) {
  return (nodes || []).map((n, i) => {
    switch (n.t) {
      case 'text': return n.v;
      case 'scripts':
        if (n.sub && n.sup) {
          return <span key={i} className="m-ss"><span className="m-ss-sup">{render(n.sup)}</span><span className="m-ss-sub">{render(n.sub)}</span></span>;
        }
        return n.sup ? <sup key={i} className="m-sup">{render(n.sup)}</sup> : <sub key={i} className="m-sub">{render(n.sub)}</sub>;
      case 'op':
        return (
          <span key={i} className="m-op">
            <span className="m-lim">{render(n.sup)}</span>
            <span className="m-sym">{n.sym}</span>
            <span className="m-lim">{render(n.sub)}</span>
          </span>
        );
      case 'frac':
        return <span key={i} className="m-frac"><span className="m-num">{render(n.num)}</span><span className="m-den">{render(n.den)}</span></span>;
      case 'bar': return <span key={i} className="m-bar">{render(n.body)}</span>;
      case 'sqrt':
        return (
          <span key={i} className="m-sqrt">
            {n.index && <span className="m-idx">{render(n.index)}</span>}
            <span className="m-root">√</span><span className="m-rad">{render(n.body)}</span>
          </span>
        );
      default: return null;
    }
  });
}

export default function MathText({ text, className = '' }) {
  const nodes = useMemo(() => parseMath(text), [text]);
  return <span className={`math ${className}`}>{render(nodes)}</span>;
}
