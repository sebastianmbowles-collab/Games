// Backgammon rules. pts[1..24]: positive = your checkers (you move 24 -> 1),
// negative = his checkers (he moves 1 -> 24). Bars and borne-off counts kept apart.

export function newBoard() {
  const pts = new Array(26).fill(0);
  pts[24] = 2; pts[13] = 5; pts[8] = 3; pts[6] = 5;
  pts[1] = -2; pts[12] = -5; pts[17] = -3; pts[19] = -5;
  return { pts, barP: 0, barD: 0, offP: 0, offD: 0 };
}
export const clone = s => ({ pts: s.pts.slice(), barP: s.barP, barD: s.barD, offP: s.offP, offD: s.offD });

function allHomeP(s) { if (s.barP) return false; for (let i = 7; i <= 24; i++) if (s.pts[i] > 0) return false; return true; }
function allHomeD(s) { if (s.barD) return false; for (let i = 1; i <= 18; i++) if (s.pts[i] < 0) return false; return true; }

// single checker moves for one die. side 'p' or 'd'. from: 'bar' or point. to: point or 'off'.
export function singleMoves(s, side, d) {
  const out = [];
  if (side === 'p') {
    if (s.barP) { const to = 25 - d; if (s.pts[to] >= -1) out.push({ from: 'bar', to, die: d, hit: s.pts[to] === -1 }); return out; }
    const home = allHomeP(s);
    for (let p = 1; p <= 24; p++) {
      if (s.pts[p] <= 0) continue;
      const to = p - d;
      if (to >= 1) { if (s.pts[to] >= -1) out.push({ from: p, to, die: d, hit: s.pts[to] === -1 }); }
      else if (home) {
        if (to === 0) out.push({ from: p, to: 'off', die: d });
        else { let higher = false; for (let q = p + 1; q <= 6; q++) if (s.pts[q] > 0) higher = true; if (!higher) out.push({ from: p, to: 'off', die: d }); }
      }
    }
  } else {
    if (s.barD) { const to = d; if (s.pts[to] <= 1) out.push({ from: 'bar', to, die: d, hit: s.pts[to] === 1 }); return out; }
    const home = allHomeD(s);
    for (let p = 1; p <= 24; p++) {
      if (s.pts[p] >= 0) continue;
      const to = p + d;
      if (to <= 24) { if (s.pts[to] <= 1) out.push({ from: p, to, die: d, hit: s.pts[to] === 1 }); }
      else if (home) {
        if (to === 25) out.push({ from: p, to: 'off', die: d });
        else { let lower = false; for (let q = 19; q < p; q++) if (s.pts[q] < 0) lower = true; if (!lower) out.push({ from: p, to: 'off', die: d }); }
      }
    }
  }
  return out;
}
export function apply(s, side, m) {
  const n = clone(s);
  const sg = side === 'p' ? 1 : -1;
  if (m.from === 'bar') { if (side === 'p') n.barP--; else n.barD--; } else n.pts[m.from] -= sg;
  if (m.to === 'off') { if (side === 'p') n.offP++; else n.offD++; return n; }
  if (n.pts[m.to] === -sg) { n.pts[m.to] = 0; if (side === 'p') n.barD++; else n.barP++; }
  n.pts[m.to] += sg;
  return n;
}
const posKey = s => s.pts.join(',') + '|' + s.barP + s.barD + s.offP + s.offD;

// All legal full plays for a roll, honouring "use as many dice as you can"
// and "if only one die can be used, use the larger".
export function plays(s, side, d1, d2) {
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  const results = [];
  const rec = (st, left, seq) => {
    let any = false;
    const tried = new Set();
    for (let i = 0; i < left.length; i++) {
      const d = left[i];
      if (tried.has(d)) continue;
      tried.add(d);
      for (const m of singleMoves(st, side, d)) {
        any = true;
        const rest = left.slice(0, i).concat(left.slice(i + 1));
        rec(apply(st, side, m), rest, seq.concat([m]));
      }
    }
    if (!any) results.push({ seq, end: st });
  };
  rec(s, dice, []);
  let max = 0;
  for (const r of results) max = Math.max(max, r.seq.length);
  let good = results.filter(r => r.seq.length === max);
  if (max === 1 && d1 !== d2) {
    const big = Math.max(d1, d2);
    if (good.some(r => r.seq[0].die === big)) good = good.filter(r => r.seq[0].die === big);
  }
  // dedupe identical end positions (keep all orders for prefix matching though)
  return good;
}

export function pips(s) {
  let p = s.barP * 25, d = s.barD * 25;
  for (let i = 1; i <= 24; i++) { if (s.pts[i] > 0) p += s.pts[i] * i; if (s.pts[i] < 0) d += -s.pts[i] * (25 - i); }
  return { p, d };
}
export function winner(s) { return s.offP >= 15 ? 'p' : s.offD >= 15 ? 'd' : null; }
// 1 normal, 2 gammon, 3 backgammon (for the loser's position)
export function winKind(s, w) {
  if (w === 'p') { if (s.offD > 0) return 1; if (s.barD) return 3; for (let i = 1; i <= 6; i++) if (s.pts[i] < 0) return 3; return 2; }
  if (s.offP > 0) return 1; if (s.barP) return 3; for (let i = 19; i <= 24; i++) if (s.pts[i] > 0) return 3; return 2;
}

// how good a position is for the Dealer (higher = better for him)
export function evalD(s) {
  const { p, d } = pips(s);
  let sc = (p - d) * 1.0;
  sc += s.offD * 4 - s.offP * 4;
  sc += s.barP * 14 - s.barD * 14;
  // blots: exposure to the other side's checkers
  for (let i = 1; i <= 24; i++) {
    const v = s.pts[i];
    if (v === -1) {
      let shooters = 0;
      for (let j = i + 1; j <= Math.min(24, i + 12); j++) if (s.pts[j] > 0) shooters += Math.min(2, s.pts[j]);
      if (s.barP && 25 - i <= 12) shooters += 2;
      sc -= shooters * (2 + (25 - i) / 6);
    }
    if (v === 1) {
      let shooters = 0;
      for (let j = Math.max(1, i - 12); j < i; j++) if (s.pts[j] < 0) shooters += Math.min(2, -s.pts[j]);
      sc += shooters * (2 + i / 6) * 0.8;
    }
    if (v <= -2) sc += i >= 19 ? 7 : i >= 13 ? 3 : 1.5;
    if (v >= 2) sc -= i <= 6 ? 7 : i <= 12 ? 3 : 1.5;
  }
  // primes (runs of made points)
  let run = 0;
  for (let i = 1; i <= 24; i++) { if (s.pts[i] <= -2) { run++; if (run >= 3) sc += run * 2; } else run = 0; }
  run = 0;
  for (let i = 24; i >= 1; i--) { if (s.pts[i] >= 2) { run++; if (run >= 3) sc -= run * 2; } else run = 0; }
  return sc;
}
export function winProbD(s) {
  return 1 / (1 + Math.exp(-evalD(s) / 28));
}
export function bestPlay(s, d1, d2, noise = 0) {
  const ps = plays(s, 'd', d1, d2);
  if (!ps.length || !ps[0].seq.length) return { seq: [], end: s };
  const seen = new Map();
  for (const p of ps) { const k = posKey(p.end); if (!seen.has(k)) seen.set(k, p); }
  let best = null, bs = -Infinity;
  for (const p of seen.values()) {
    const v = evalD(p.end) + (Math.random() - 0.5) * noise;
    if (v > bs) { bs = v; best = p; }
  }
  return best;
}
export { posKey };
