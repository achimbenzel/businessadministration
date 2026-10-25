// A small piece of LaTeX for formulas — enough for a maths tutorial without a
// math library (and without HTML: components/MathText.jsx renders the nodes as
// React elements):
//
//   x^2  a^{x+y}  e^(−rt)        exponent (one digit run or one letter, or a group)
//   a_i  x_{n+1}  P_max  Q_D     index (a run of letters/digits, or a group)
//   \sum_{i=1}^{n}  \prod_{i=1}^{n}   Σ / Π with limits above and below
//   \frac{a}{b}  \sqrt{x}  \sqrt[3]{x}  \bar{x} (mean)
//   \cdot \times \neq \leq \geq \pm \infty \to \Rightarrow \Leftrightarrow \dots \approx
//   {…} groups,  \{ \} \_ \^ \$ \% \\ for the characters themselves
//
// Used for formula blocks and slide formulas, and inside $…$ in any text.

const SYMBOLS = {
  cdot: '·', times: '×', div: '÷', neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥', pm: '±', mp: '∓',
  infty: '∞', to: '→', rightarrow: '→', Rightarrow: '⇒', Leftrightarrow: '⇔', iff: '⇔', approx: '≈',
  dots: '…', ldots: '…', cdots: '⋯', quad: '  ', in: '∈', notin: '∉', sum: 'Σ', prod: 'Π',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', lambda: 'λ', mu: 'μ', pi: 'π',
  rho: 'ρ', sigma: 'σ', Sigma: 'Σ', tau: 'τ', phi: 'φ', omega: 'ω', partial: '∂',
};
const BIG_OPS = { sum: 'Σ', prod: 'Π' };

/** Parse a formula into nodes: text | scripts { sub, sup } | op { sym, sub, sup } | frac | sqrt | bar. */
export function parseMath(input) {
  const s = String(input ?? '');
  let i = 0;

  const pushText = (out, v) => {
    const last = out[out.length - 1];
    if (last?.t === 'text') last.v += v; else out.push({ t: 'text', v });
  };

  // One argument of \frac, \sqrt, ^ or _: a {group}, a (group) for scripts, or a single character.
  const arg = (script = null) => {
    if (s[i] === '{') { i += 1; return seq('}'); }
    if (script && s[i] === '(') {
      let depth = 0; const start = i;
      for (; i < s.length; i += 1) {
        if (s[i] === '(') depth += 1;
        else if (s[i] === ')') { depth -= 1; if (depth === 0) break; }
      }
      if (depth !== 0) { i = start; return null; } // unbalanced: not a group
      const inner = s.slice(start + 1, i);
      i += 1;
      return parseMath(inner);
    }
    if (s[i] === '\\') {
      const nodes = [];
      command(nodes);
      return nodes;
    }
    if (i >= s.length || /\s/.test(s[i])) return null;
    const m = script === '_' ? /^[\p{L}\p{N}]+/u.exec(s.slice(i)) : script === '^' ? /^(\d+|.)/su.exec(s.slice(i)) : /^./su.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return [{ t: 'text', v: m[0] }];
  };

  // \name — a symbol, a big operator, \frac, \sqrt, or an escaped character.
  const command = (out) => {
    i += 1; // the backslash
    const m = /^[A-Za-z]+/.exec(s.slice(i));
    if (!m) {
      const ch = s[i];
      if (ch && '{}_^$%#&\\ '.includes(ch)) { pushText(out, ch === '\\' ? '\\' : ch); i += 1; } else pushText(out, '\\');
      return;
    }
    const name = m[0];
    i += name.length;
    if (BIG_OPS[name]) {
      const op = { t: 'op', sym: BIG_OPS[name], sub: null, sup: null };
      while (s[i] === '_' || s[i] === '^') {
        const kind = s[i];
        i += 1;
        const a = arg(kind);
        if (kind === '_') op.sub = a; else op.sup = a;
      }
      out.push(op);
    } else if (name === 'frac') {
      out.push({ t: 'frac', num: arg() || [], den: arg() || [] });
    } else if (name === 'bar' || name === 'overline') {
      out.push({ t: 'bar', body: arg() || [] });
    } else if (name === 'sqrt') {
      let index = null;
      if (s[i] === '[') {
        const end = s.indexOf(']', i);
        if (end > i) { index = parseMath(s.slice(i + 1, end)); i = end + 1; }
      }
      out.push({ t: 'sqrt', index, body: arg() || [] });
    } else if (SYMBOLS[name]) {
      pushText(out, SYMBOLS[name]); // spaces around it stay as typed (no TeX spacing rules)
    } else {
      pushText(out, `\\${name}`);
    }
  };

  const seq = (stop) => {
    const out = [];
    while (i < s.length) {
      const ch = s[i];
      if (stop && ch === stop) { i += 1; return out; }
      if (ch === '\\') { command(out); continue; }
      if (ch === '^' || ch === '_') {
        const save = i;
        i += 1;
        const a = arg(ch);
        if (!a) { i = save + 1; pushText(out, ch); continue; }
        const last = out[out.length - 1];
        const slot = ch === '^' ? 'sup' : 'sub';
        if (last?.t === 'scripts' && !last[slot]) last[slot] = a;
        else out.push({ t: 'scripts', sub: slot === 'sub' ? a : null, sup: slot === 'sup' ? a : null });
        continue;
      }
      if (ch === '{') { i += 1; out.push(...seq('}')); continue; }
      pushText(out, ch);
      i += 1;
    }
    return out;
  };

  return seq(null);
}

/** Plain text of a formula (search, previews): a^{x+y} → a^(x+y), \sum → Σ. */
export function mathToPlain(input) {
  const walk = (nodes) => (nodes || []).map((n) => {
    switch (n.t) {
      case 'text': return n.v;
      case 'scripts': return `${n.sub ? `_${wrap(n.sub)}` : ''}${n.sup ? `^${wrap(n.sup)}` : ''}`;
      case 'op': return `${n.sym}${n.sub ? `_${wrap(n.sub)}` : ''}${n.sup ? `^${wrap(n.sup)}` : ''}`;
      case 'frac': return `${wrap(n.num)}/${wrap(n.den)}`;
      case 'sqrt': return `${n.index ? walk(n.index) : ''}√${wrap(n.body)}`;
      case 'bar': return `${walk(n.body)}\u0304`;
      default: return '';
    }
  }).join('');
  const wrap = (nodes) => { const t = walk(nodes); return t.length > 1 ? `(${t})` : t; };
  return walk(parseMath(input));
}

/** Does the text use any of the syntax above (worth a rendered preview in the editor)? */
export const hasMath = (text) => /[\\^_]/.test(String(text ?? ''));
