// The market behind the supply & demand demo (pure functions, unit-tested).
//
// Linear curves with the quantity as a function of the price, as in exam
// questions:  Q_D = a − b·P,  Q_S = c + d·P.
// For the diagram (P up, Q right) and the surplus areas we also need the
// inverse curves and their integrals:
//   inverse demand  P_D(Q) = (a − Q)/b      → value(q) = ∫₀^q P_D  (total willingness to pay)
//   inverse supply  P_S(Q) = (Q − c)/d ≥ 0  → cost(q)  = ∫₀^q P_S  (total cost of the cheapest producers)
// Consumer surplus = value(q) − P·q, producer surplus = P·q − cost(q).
//
// Markets: closed, world market (world price, tariff per unit), price
// ceiling, price floor. Every situation also comes with its areas — polygons
// in (Q, P) coordinates labelled A, B, C … and what each one is worth — and
// with who wins and loses compared with a reference (the closed market, or
// free trade for a tariff). The area logic follows the classic textbook
// diagrams (Mankiw, ch. 6–9).

const EPS = 0.05;

export function curves({ a, b, c, d }) {
  const Qd = (p) => Math.max(0, a - b * p);
  const Qs = (p) => Math.max(0, c + d * p);
  const invD = (q) => (a - q) / b;
  const invS = (q) => Math.max(0, (q - c) / d);
  const value = (q) => (a * q - (q * q) / 2) / b;
  const cost = (q) => (c >= 0 ? (q <= c ? 0 : (q - c) ** 2 / (2 * d)) : ((q * q) / 2 - c * q) / d);
  const Pe = (a - c) / (b + d);
  const Qe = a - b * Pe;
  return {
    Qd, Qs, invD, invS, value, cost, Pe, Qe,
    choke: a / b,                          // demand is zero from here on (prohibitive price)
    foot: c >= 0 ? [c, 0] : [0, -c / d],   // where the supply curve meets an axis
    valid: Pe > 0 && Qe > 0,
  };
}

/**
 * Analyse a market situation.
 * v = { a, b, c, d, mode: 'closed'|'world'|'ceiling'|'floor', pc (ceiling/floor price), pw (world price), tariff }
 */
export function analyze(v) {
  const m = curves(v);
  const { Qd, Qs, value, cost, Pe, Qe } = m;
  const CSat = (p, q = Qd(p)) => value(q) - p * q;
  const PSat = (p, q = Qs(p)) => p * q - cost(q);
  const r = { ...m, mode: v.mode || 'closed', notes: [], trade: 0, gap: 0, rev: 0, dwl: 0, nb: false };
  if (!m.valid) return { ...r, invalid: true, P: 0, Q: 0, qd: 0, qs: 0, CS: 0, PS: 0, W: 0, regions: { kind: 'invalid', ref: 'none', list: [], sums: [] } };
  const We = CSat(Pe) + PSat(Pe);
  const closed = () => Object.assign(r, { P: Pe, Q: Qe, qd: Qe, qs: Qe, CS: CSat(Pe), PS: PSat(Pe) });

  if (r.mode === 'world') {
    const pw = Math.max(0, v.pw);
    let P = pw;
    if (pw < Pe) {
      P = Math.min(pw + v.tariff, Pe);
      if (v.tariff > 0 && pw + v.tariff >= Pe) r.notes.push('prohibitive');
    } else if (v.tariff > 0) r.notes.push('noTariff');
    Object.assign(r, { pw, P, teff: P - pw, qd: Qd(P), qs: Qs(P), qdF: Qd(pw), qsF: Qs(pw) });
    r.trade = r.qd - r.qs;   // > 0 imports, < 0 exports
    r.Q = r.qd;
    r.CS = CSat(P);
    r.PS = PSat(P);
    r.rev = r.teff * Math.max(0, r.trade);
    r.dwl = Math.max(0, CSat(pw) + PSat(pw) - (r.CS + r.PS + r.rev));
  } else if (r.mode === 'ceiling' || r.mode === 'floor') {
    const p = Math.max(0, v.pc);
    r.pc = p;
    const binding = r.mode === 'ceiling' ? p < Pe : p > Pe;
    if (!binding) {
      closed();
      r.nb = true;
      r.notes.push(r.mode === 'ceiling' ? 'ceilingNotBinding' : 'floorNotBinding');
    } else {
      // Only the smaller side is traded: what sellers offer (ceiling) or what buyers want (floor).
      const q = r.mode === 'ceiling' ? Qs(p) : Qd(p);
      Object.assign(r, { P: p, Q: q, qd: Qd(p), qs: Qs(p) });
      r.gap = Math.abs(r.qd - r.qs);
      r.CS = CSat(p, q);
      r.PS = PSat(p, q);
      r.dwl = Math.max(0, We - r.CS - r.PS);
      if (r.mode === 'floor') r.notes.push('floorAssumption');
    }
  } else {
    closed();
  }
  r.W = r.CS + r.PS + r.rev;
  r.regions = regions(r, CSat, PSat);
  return r;
}

function regions(r, CSat, PSat) {
  const { choke, foot, Pe, Qe, invD, invS } = r;
  const footP = foot[1];
  // Producer surplus between price p and the supply curve, for the q units sold at p.
  const psPoly = (p, q) => [[0, p], [q, p], foot, [0, footP]];
  const list = [];
  const add = (id, pts, cls, val) => list.push({ id, pts, cls, val: Math.max(0, val) });
  let kind = 'closed'; let ref = 'none'; let sums;

  if (r.mode === 'world' && r.teff > EPS && r.trade > EPS) {
    kind = 'tariff'; ref = 'free';
    const { pw, P: Pd, qs, qd, qsF, qdF } = r;
    const t = Pd - pw;
    const Bv = 0.5 * Math.max(0, qd - qs) * (Pe - Pd);
    const Cv = PSat(Pd) - PSat(pw);
    const Dv = t * qs - Cv;
    const Ev = t * Math.max(0, qd - qs);
    const Fv = 0.5 * (qdF - qd) * t;
    add('A', [[0, choke], [0, Pd], [qs, Pd], [Qe, Pe]], 'cs', CSat(Pd) - Bv);
    add('B', [[qs, Pd], [Qe, Pe], [qd, Pd]], 'cs', Bv);
    add('C', pw >= footP ? [[0, pw], [0, Pd], [qs, Pd], [qsF, pw]] : [[0, footP], [0, Pd], [qs, Pd]], 'ps', Cv);
    add('D', pw >= footP ? [[qsF, pw], [qs, Pd], [qs, pw]] : [[0, pw], [0, footP], [qs, Pd], [qs, pw]], 'dwl', Dv);
    add('E', [[qs, pw], [qs, Pd], [qd, Pd], [qd, pw]], 'rev', Ev);
    add('F', [[qd, Pd], [qdF, pw], [qd, pw]], 'dwl', Fv);
    if (pw > footP) add('G', psPoly(pw, qsF), 'ps', PSat(pw));
    sums = [['consumers', '−(C + D + E + F)', -(Cv + Dv + Ev + Fv)], ['producers', '+C', Cv], ['government', '+E', Ev], ['society', '−(D + F)', -(Dv + Fv)]];
  } else if (r.mode === 'world' && r.trade > EPS) {
    kind = 'imports'; ref = 'closed';
    const { pw, qs, qd } = r;
    const Bv = PSat(Pe) - PSat(pw);
    const Cv = 0.5 * (qd - qs) * (Pe - pw);
    add('A', [[0, choke], [0, Pe], [Qe, Pe]], 'cs', CSat(Pe));
    add('B', pw >= footP ? [[0, pw], [0, Pe], [Qe, Pe], [qs, pw]] : [[0, footP], [0, Pe], [Qe, Pe]], 'cs', Bv);
    add('C', [[qs, pw], [Qe, Pe], [qd, pw]], 'cs', Cv);
    if (pw > footP) add('D', psPoly(pw, qs), 'ps', PSat(pw));
    sums = [['consumers', '+(B + C)', Bv + Cv], ['producers', '−B', -Bv], ['society', '+C', Cv]];
  } else if (r.mode === 'world' && r.trade < -EPS) {
    kind = 'exports'; ref = 'closed';
    const { pw, qs, qd } = r;
    const Bv = CSat(Pe) - CSat(pw);
    const Cv = 0.5 * (qs - qd) * (pw - Pe);
    add('A', [[0, choke], [0, pw], [qd, pw]], 'cs', CSat(pw));
    add('B', [[0, Pe], [0, pw], [qd, pw], [Qe, Pe]], 'ps', Bv);
    add('C', [[qd, pw], [Qe, Pe], [qs, pw]], 'ps', Cv);
    add('D', psPoly(Pe, Qe), 'ps', PSat(Pe));
    sums = [['consumers', '−B', -Bv], ['producers', '+(B + C)', Bv + Cv], ['society', '+C', Cv]];
  } else if (r.mode === 'ceiling' && !r.nb) {
    kind = 'ceiling'; ref = 'closed';
    const { Q: q, P: Pc } = r;
    const dq = invD(q);
    const sq = invS(q);
    const Av = r.value(q) - Pe * q;
    const Bv = (Pe - Pc) * q;
    const Cv = 0.5 * (Qe - q) * (dq - Pe);
    const Dv = 0.5 * (Qe - q) * (Pe - sq);
    add('A', [[0, choke], [0, Pe], [q, Pe], [q, dq]], 'cs', Av);
    add('B', [[0, Pc], [0, Pe], [q, Pe], [q, Pc]], 'cs', Bv);
    add('C', [[q, dq], [q, Pe], [Qe, Pe]], 'dwl', Cv);
    add('D', [[q, Pe], [q, sq], [Qe, Pe]], 'dwl', Dv);
    if (Pc > footP) add('E', psPoly(Pc, q), 'ps', r.PS);
    sums = [['consumers', '+B − C', Bv - Cv], ['producers', '−(B + D)', -(Bv + Dv)], ['society', '−(C + D)', -(Cv + Dv)]];
  } else if (r.mode === 'floor' && !r.nb) {
    kind = 'floor'; ref = 'closed';
    const { Q: q, P: Pf } = r;
    const sq = invS(q);
    const Bv = (Pf - Pe) * q;
    const Cv = 0.5 * (Qe - q) * (Pf - Pe);
    const Dv = 0.5 * (Qe - q) * (Pe - sq);
    add('A', [[0, choke], [0, Pf], [q, Pf]], 'cs', r.CS);
    add('B', [[0, Pe], [0, Pf], [q, Pf], [q, Pe]], 'ps', Bv);
    add('C', [[q, Pf], [q, Pe], [Qe, Pe]], 'dwl', Cv);
    add('D', [[q, Pe], [q, sq], [Qe, Pe]], 'dwl', Dv);
    add('E', [[0, Pe], [q, Pe], [q, sq], foot, [0, footP]], 'ps', Pe * q - r.cost(q));
    sums = [['consumers', '−(B + C)', -(Bv + Cv)], ['producers', '+B − D', Bv - Dv], ['society', '−(C + D)', -(Cv + Dv)]];
  } else {
    add('A', [[0, choke], [0, r.P], [r.Q, r.P]], 'cs', r.CS);
    add('B', psPoly(r.P, r.Q), 'ps', r.PS);
    sums = [['consumers', 'A', r.CS], ['producers', 'B', r.PS], ['society', 'A + B', r.CS + r.PS]];
  }
  return { kind, ref, list: list.filter((x) => x.val > 0.01), sums };
}

/**
 * Ready-made situations, relative to the block's starting market so they work
 * for any numbers: shifts by a quarter / a third of Q*, a world price 40 %
 * below / above P*, a ceiling / floor 25 % below / above P*.
 */
export function scenarios(base) {
  const { Pe, Qe } = curves(base);
  const shiftS = Qe * 0.25;
  const shiftD = Qe / 3;
  const s = (o) => ({ ds: 0, ss: 0, mode: 'closed', ...o });
  return {
    base: s({}),
    supplyDown: s({ ss: -shiftS }),
    supplyUp: s({ ss: shiftS }),
    demandUp: s({ ds: shiftD }),
    demandDown: s({ ds: -shiftD }),
    imports: s({ mode: 'world', pw: Pe * 0.6 }),
    exports: s({ mode: 'world', pw: Pe * 1.4 }),
    tariff: s({ mode: 'world', pw: Pe * 0.6, tariff: Pe * 0.2 }),
    shockOpen: s({ ss: -shiftS, mode: 'world', pw: Pe * 0.85 }),
    ceiling: s({ mode: 'ceiling', pc: Pe * 0.75 }),
    floor: s({ mode: 'floor', pc: Pe * 1.25 }),
  };
}

/** Centroid of a polygon (for the area letters); returns null for tiny areas. */
export function centroid(points, minArea = 0) {
  let a2 = 0; let cx = 0; let cy = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const k = x0 * y1 - x1 * y0;
    a2 += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k;
  }
  if (Math.abs(a2 / 2) <= minArea || a2 === 0) return null;
  return [cx / (3 * a2), cy / (3 * a2)];
}
