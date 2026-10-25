// A small but complete chess engine: full rules and an alpha-beta player.
// Squares are 0..63, index = rank * 8 + file, rank 0 is White's back rank.
// White pieces are upper case (PNBRQK), Black lower case.

const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KG = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const isW = p => p && p === p.toUpperCase();
const colorOf = p => (p ? (isW(p) ? 'w' : 'b') : null);
const fileOf = i => i & 7, rankOf = i => i >> 3;
const sq = (f, r) => (f < 0 || f > 7 || r < 0 || r > 7 ? -1 : r * 8 + f);
export const sqName = i => 'abcdefgh'[fileOf(i)] + (rankOf(i) + 1);

export function newGame() {
  const b = new Array(64).fill(null);
  const back = 'RNBQKBNR';
  for (let f = 0; f < 8; f++) {
    b[f] = back[f]; b[8 + f] = 'P'; b[48 + f] = 'p'; b[56 + f] = back[f].toLowerCase();
  }
  const g = { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1, hist: [] };
  g.hist.push(key(g));
  return g;
}
export function key(g) {
  return g.b.map(p => p || '.').join('') + g.turn + (g.castle.K ? 'K' : '') + (g.castle.Q ? 'Q' : '') + (g.castle.k ? 'k' : '') + (g.castle.q ? 'q' : '') + g.ep;
}

export function attacked(g, i, by) {
  const b = g.b, f = fileOf(i), r = rankOf(i);
  const W = by === 'w';
  // pawns
  const pr = W ? r - 1 : r + 1;
  for (const df of [-1, 1]) { const s = sq(f + df, pr); if (s >= 0 && b[s] === (W ? 'P' : 'p')) return true; }
  for (const [df, dr] of KN) { const s = sq(f + df, r + dr); if (s >= 0 && b[s] === (W ? 'N' : 'n')) return true; }
  for (const [df, dr] of KG) { const s = sq(f + df, r + dr); if (s >= 0 && b[s] === (W ? 'K' : 'k')) return true; }
  for (const [df, dr] of DIAG) {
    let ff = f + df, rr = r + dr;
    while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) {
      const p = b[rr * 8 + ff];
      if (p) { if (colorOf(p) === by && (p.toUpperCase() === 'B' || p.toUpperCase() === 'Q')) return true; break; }
      ff += df; rr += dr;
    }
  }
  for (const [df, dr] of ORTH) {
    let ff = f + df, rr = r + dr;
    while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) {
      const p = b[rr * 8 + ff];
      if (p) { if (colorOf(p) === by && (p.toUpperCase() === 'R' || p.toUpperCase() === 'Q')) return true; break; }
      ff += df; rr += dr;
    }
  }
  return false;
}
export function kingSq(g, c) { const k = c === 'w' ? 'K' : 'k'; return g.b.indexOf(k); }
export function inCheck(g, c = g.turn) { const k = kingSq(g, c); return k >= 0 && attacked(g, k, c === 'w' ? 'b' : 'w'); }

function pseudo(g, capsOnly = false) {
  const out = [], b = g.b, c = g.turn, W = c === 'w';
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || colorOf(p) !== c) continue;
    const t = p.toUpperCase(), f = fileOf(i), r = rankOf(i);
    const add = (to, extra) => {
      const cap = b[to];
      if (capsOnly && !cap && !(extra && extra.ep) && !(extra && extra.promo)) return;
      if (t === 'P' && (rankOf(to) === 7 || rankOf(to) === 0)) {
        for (const pr of ['Q', 'N', 'R', 'B']) out.push({ from: i, to, promo: W ? pr : pr.toLowerCase(), cap });
      } else out.push(Object.assign({ from: i, to, cap }, extra || {}));
    };
    if (t === 'P') {
      const dir = W ? 1 : -1, start = W ? 1 : 6;
      const one = sq(f, r + dir);
      if (one >= 0 && !b[one]) {
        add(one);
        const two = sq(f, r + dir * 2);
        if (r === start && !b[two] && !capsOnly) out.push({ from: i, to: two, double: true });
      }
      for (const df of [-1, 1]) {
        const s = sq(f + df, r + dir);
        if (s < 0) continue;
        if (b[s] && colorOf(b[s]) !== c) add(s);
        else if (s === g.ep) add(s, { ep: true, cap: W ? 'p' : 'P' });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [df, dr] of t === 'N' ? KN : KG) {
        const s = sq(f + df, r + dr);
        if (s >= 0 && (!b[s] || colorOf(b[s]) !== c)) add(s);
      }
      if (t === 'K' && !capsOnly) {
        const opp = W ? 'b' : 'w', home = W ? 4 : 60;
        if (i === home && !attacked(g, i, opp)) {
          if ((W ? g.castle.K : g.castle.k) && !b[i + 1] && !b[i + 2] && b[i + 3] === (W ? 'R' : 'r') && !attacked(g, i + 1, opp) && !attacked(g, i + 2, opp)) out.push({ from: i, to: i + 2, castle: 'K' });
          if ((W ? g.castle.Q : g.castle.q) && !b[i - 1] && !b[i - 2] && !b[i - 3] && b[i - 4] === (W ? 'R' : 'r') && !attacked(g, i - 1, opp) && !attacked(g, i - 2, opp)) out.push({ from: i, to: i - 2, castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
      for (const [df, dr] of dirs) {
        let ff = f + df, rr = r + dr;
        while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) {
          const s = rr * 8 + ff;
          if (b[s]) { if (colorOf(b[s]) !== c) add(s); break; }
          add(s);
          ff += df; rr += dr;
        }
      }
    }
  }
  return out;
}

export function make(g, m) {
  const b = g.b;
  const u = { m, castle: { ...g.castle }, ep: g.ep, half: g.half, moved: b[m.from], captured: b[m.to] };
  const p = b[m.from];
  b[m.to] = m.promo || p;
  b[m.from] = null;
  if (m.ep) { const cs = m.to + (isW(p) ? -8 : 8); u.epSq = cs; u.captured = b[cs]; b[cs] = null; }
  if (m.castle) {
    const W = isW(p);
    if (m.castle === 'K') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; } else { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    if (W) g.castle.K = g.castle.Q = false; else g.castle.k = g.castle.q = false;
  }
  if (p === 'K') g.castle.K = g.castle.Q = false;
  if (p === 'k') g.castle.k = g.castle.q = false;
  for (const s of [m.from, m.to]) {
    if (s === 0) g.castle.Q = false; if (s === 7) g.castle.K = false;
    if (s === 56) g.castle.q = false; if (s === 63) g.castle.k = false;
  }
  g.ep = m.double ? (m.from + m.to) / 2 : -1;
  g.half = p.toUpperCase() === 'P' || u.captured ? 0 : g.half + 1;
  if (g.turn === 'b') g.full++;
  g.turn = g.turn === 'w' ? 'b' : 'w';
  return u;
}
export function unmake(g, u) {
  const b = g.b, m = u.m;
  g.turn = g.turn === 'w' ? 'b' : 'w';
  if (g.turn === 'b') g.full--;
  b[m.from] = u.moved;
  b[m.to] = m.ep ? null : u.captured;
  if (m.ep) b[u.epSq] = u.captured;
  if (m.castle) {
    if (m.castle === 'K') { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = null; } else { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = null; }
  }
  g.castle = u.castle; g.ep = u.ep; g.half = u.half;
}

export function legal(g, capsOnly = false) {
  const out = [];
  const c = g.turn;
  for (const m of pseudo(g, capsOnly)) {
    const u = make(g, m);
    if (!inCheck(g, c)) out.push(m);
    unmake(g, u);
  }
  return out;
}
export function play(g, m) {
  const u = make(g, m);
  g.hist.push(key(g));
  return u;
}

function insufficient(g) {
  const ps = g.b.filter(p => p && p.toUpperCase() !== 'K');
  if (!ps.length) return true;
  if (ps.length === 1 && 'NBnb'.includes(ps[0])) return true;
  return false;
}
// 'checkmate' | 'stalemate' | 'fifty' | 'repetition' | 'material' | null
export function status(g) {
  const moves = legal(g);
  if (!moves.length) return inCheck(g) ? 'checkmate' : 'stalemate';
  if (g.half >= 100) return 'fifty';
  if (insufficient(g)) return 'material';
  const k = g.hist[g.hist.length - 1];
  if (g.hist.filter(x => x === k).length >= 3) return 'repetition';
  return null;
}

// ---------------------------------------------------------------- evaluation
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const PST = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5, -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30],
  KE: [-50, -30, -30, -30, -30, -30, -30, -50, -30, -30, 0, 0, 0, 0, -30, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -20, -10, 0, 0, -10, -20, -30, -50, -40, -30, -20, -20, -30, -40, -50],
};
// score from White's point of view
export function evaluate(g) {
  let s = 0, mat = 0;
  for (const p of g.b) if (p && p.toUpperCase() !== 'K' && p.toUpperCase() !== 'P') mat += VAL[p.toUpperCase()];
  const end = mat < 2600;
  for (let i = 0; i < 64; i++) {
    const p = g.b[i];
    if (!p) continue;
    const t = p.toUpperCase();
    const W = isW(p);
    const idx = W ? i : (7 - rankOf(i)) * 8 + fileOf(i);
    const v = VAL[t] + (t === 'K' ? (end ? PST.KE : PST.K)[idx] : PST[t][idx]);
    s += W ? v : -v;
  }
  return s;
}

const mvv = m => (m.cap ? VAL[m.cap.toUpperCase()] * 10 - VAL[(m.promo || 'P').toUpperCase()] / 10 : 0) + (m.promo ? 800 : 0);

function quiesce(g, alpha, beta, ctx, depth = 0) {
  ctx.nodes++;
  const stand = (g.turn === 'w' ? 1 : -1) * evaluate(g);
  if (stand >= beta) return beta;
  if (alpha < stand) alpha = stand;
  if (depth > 6) return alpha;
  const moves = legal(g, true).sort((a, b) => mvv(b) - mvv(a));
  for (const m of moves) {
    const u = make(g, m);
    const sc = -quiesce(g, -beta, -alpha, ctx, depth + 1);
    unmake(g, u);
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}
function negamax(g, depth, alpha, beta, ctx, ply) {
  if (ctx.stop || (ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline) { ctx.stop = true; return 0; }
  ctx.nodes++;
  if (depth <= 0) return quiesce(g, alpha, beta, ctx);
  const moves = legal(g);
  if (!moves.length) return inCheck(g) ? -100000 + ply : 0;
  if (g.half >= 100) return 0;
  const pv = ctx.pv[ply];
  moves.sort((a, b) => (pv && a.from === pv.from && a.to === pv.to ? -1e6 : 0) - (pv && b.from === pv.from && b.to === pv.to ? -1e6 : 0) || mvv(b) - mvv(a));
  let best = -Infinity;
  for (const m of moves) {
    const u = make(g, m);
    const sc = -negamax(g, depth - 1, -beta, -alpha, ctx, ply + 1);
    unmake(g, u);
    if (ctx.stop) return 0;
    if (sc > best) { best = sc; if (ply === 0) ctx.bestRoot = m; ctx.pv[ply] = m; }
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) break;
  }
  return best;
}
// Best move for the side to move. noise: random centipawns added to root scores.
export function search(g, maxDepth = 4, ms = 1000, noise = 0) {
  const ctx = { nodes: 0, deadline: performance.now() + ms, stop: false, pv: [], bestRoot: null };
  let best = null, bestScore = 0;
  const root = legal(g);
  if (!root.length) return null;
  if (noise > 0) {
    // weaker play: score each root move shallowly and pick with noise
    const scored = root.map(m => {
      const u = make(g, m);
      const sc = -negamax(g, Math.max(0, maxDepth - 1), -Infinity, Infinity, { nodes: 0, deadline: performance.now() + ms / root.length, stop: false, pv: [] }, 1);
      unmake(g, u);
      return { m, sc: sc + (Math.random() - 0.5) * noise };
    });
    scored.sort((a, b) => b.sc - a.sc);
    return { move: scored[0].m, score: scored[0].sc };
  }
  for (let d = 1; d <= maxDepth; d++) {
    ctx.bestRoot = null;
    const sc = negamax(g, d, -Infinity, Infinity, ctx, 0);
    if (ctx.stop && d > 1) break;
    if (ctx.bestRoot) { best = ctx.bestRoot; bestScore = sc; }
    if (ctx.stop) break;
  }
  return { move: best || root[0], score: bestScore };
}
// value of a move for the mover: static exchange-ish via shallow search
export function moveGain(g, m, depth = 2) {
  const before = (g.turn === 'w' ? 1 : -1) * evaluate(g);
  const u = make(g, m);
  const ctx = { nodes: 0, deadline: performance.now() + 200, stop: false, pv: [] };
  const sc = -negamax(g, depth - 1, -Infinity, Infinity, ctx, 1);
  unmake(g, u);
  return sc - before;
}
export { VAL };
