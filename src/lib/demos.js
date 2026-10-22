// The maths behind the interactive demos (pure functions, unit-tested).

/** Round a maximum up to a "nice" axis end: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ. */
export function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v - 1e-9) return m * p;
  return 10 * p;
}

/** Tick values from 0 to max with at most `count` intervals (steps of 1, 2, 2.5, 5 × 10ⁿ). */
export function ticks(max, count = 5) {
  const raw = max / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => max / s <= count + 1e-9) || 10 * p;
  const out = [];
  for (let t = 0; t <= max + step * 1e-6; t += step) out.push(+t.toFixed(10));
  return out;
}

/** A slider step that gives about `n` positions across a range (1, 2, 5 × 10ⁿ). */
export function niceStep(range, n = 100) {
  const raw = range / n;
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || 10 * p;
}

/** Snap a value to a step (and clean floating-point noise). */
export const snap = (v, step) => +(Math.round(v / step) * step).toFixed(10);

/**
 * Linear market: Q_D = a − b·P, Q_S = c + d·P.
 * Returns the equilibrium (P*, Q*), consumer and producer surplus, the choke
 * price (demand = 0) and the price where supply starts (P₀).
 */
export function market({ a, b, c, d }) {
  const pStar = (a - c) / (b + d);
  const qStar = a - b * pStar;
  const choke = a / b;
  const p0 = Math.max(0, -c / d);
  const valid = pStar > 0 && qStar > 0;
  // CS = ∫ Q_D dP from P* to the choke price; PS = ∫ Q_S dP from P₀ to P*.
  const cs = valid ? a * (choke - pStar) - (b / 2) * (choke ** 2 - pStar ** 2) : 0;
  const ps = valid && pStar > p0 ? c * (pStar - p0) + (d / 2) * (pStar ** 2 - p0 ** 2) : 0;
  return { pStar, qStar, choke, p0, valid, cs, ps };
}

/** A price ceiling / floor at `price`: quantities, whether it binds, the gap and the quantity traded. */
export function priceControl({ a, b, c, d }, kind, price) {
  const qd = Math.max(0, a - b * price);
  const qs = Math.max(0, c + d * price);
  const { pStar } = market({ a, b, c, d });
  const binding = kind === 'ceiling' ? price < pStar : kind === 'floor' ? price > pStar : false;
  return { qd, qs, binding, gap: Math.abs(qd - qs), traded: Math.min(qd, qs) };
}

/**
 * Cobb-Douglas consumer: U = x₁^α · x₂^(1−α), budget p₁·x₁ + p₂·x₂ = m.
 * The optimum spends the share α of the income on good 1.
 */
export function consumer({ m, p1, p2, alpha }) {
  const x1 = (alpha * m) / p1;
  const x2 = ((1 - alpha) * m) / p2;
  const u = x1 ** alpha * x2 ** (1 - alpha);
  return { x1, x2, u, mrs: p1 / p2, spend1: p1 * x1, spend2: p2 * x2 };
}

/** The indifference curve U = u: x₂ for a given x₁. */
export const indifferenceX2 = (u, alpha, x1) => (u / x1 ** alpha) ** (1 / (1 - alpha));
