// The library layout. Each letter is one 2x2 metre tile.
//   #  wall            S  bookshelf stack     g  shelf gap (hide)
//   D  reading desk (hide under)   C  cabinet (hide inside)
//   f  front desk (hide under)     F  front desk counter
//   c  computer desk   X  the secret computer
//   P  Mr. Pages' podium           B  storytime armchair
//   r  storytime rug   k  where you wake up
//   u  staircase       |  stair railing
//   O  open balcony (upstairs only: the hole over the main hall)
//   E  front doors (locked)
export const T = 2;          // tile size (metres)
export const FLOOR_H = 4.5;  // height of one floor

const F0 = [
  '########################',
  '#...S.S.S...S.S.S#X..cc#',
  '#.S.S.S.S.S.S.S..#.....#',
  '#.S.S.S.S.S.S.S..#cc.cc#',
  '#.S.....S...S.S.......C#',
  '#.SSSS.SSS.SS.SSS#cc.cc#',
  '#................#.....#',
  '#S.SS.SSS..SSS.S.###.###',
  '#u|................g.|u#',
  '#u|..DD..DD..DD..DD..|u#',
  '#u|..................|u#',
  '#u|..DD..DD..DD..DD..|u#',
  '#....................C.#',
  '#rrrr.......S....FFF...#',
  '#Brkr......P.....Ff....#',
  '#rrrr.S..........S.....#',
  '#CgS..S..........S...C.#',
  '###########EE###########',
];
const F1 = [
  '########################',
  '#..S.S.S.S..C..S.S.S...#',
  '#D.S.S.S.S.....S.S.S.D.#',
  '#..S.S.S.S..g..S.S.S...#',
  '#..........SSS.........#',
  '#SS.SSSS.S.....S.SSSS.S#',
  '#......................#',
  '#......................#',
  '#u|.OOOOOOOOOOOOOOOO.|u#',
  '#u|.OOOOOOOOOOOOOOOO.|u#',
  '#u|.OOOOOOOOOOOOOOOO.|u#',
  '#u|.OOOOOOOOOOOOOOOO.|u#',
  '##..OOOOOOOOOOOOOOOO..##',
  '#......................#',
  '#.S.SS.SSS.SS.SSS.SS.S.#',
  '#.S....D.......D....gS.#',
  '#CS.SS.SSS.SS.SSS.SSSSC#',
  '########################',
];
export const GRID = [F0, F1];
export const W = F0[0].length, H = F0.length;

// staircases: column, top row, bottom row (they go UP towards the north)
export const STAIRS = [{ c: 1, top: 8, bot: 11 }, { c: 22, top: 8, bot: 11 }];

export const at = (L, c, r) => (c < 0 || r < 0 || c >= W || r >= H) ? '#' : GRID[L][r][c];
const WALK = new Set(['.', 'r', 'k', 'u']);
export const walkTile = ch => WALK.has(ch);
const SIGHT_BLOCK = new Set(['#', 'S', 'g', 'C', 'E']);
export const blocksSight = ch => SIGHT_BLOCK.has(ch);
const SHELFY = new Set(['#', 'S', 'g', 'C', 'c', 'X', 'E', '|']);
export const HIDE_TYPES = { D: 'desk', C: 'cabinet', g: 'gap', f: 'desk' };

export const tileX = c => c * T + T / 2;
export const tileZ = r => r * T + T / 2;
export const toC = x => Math.floor(x / T);
export const toR = z => Math.floor(z / T);

export function stairAt(c, r) {
  for (const s of STAIRS) if (s.c === c && r >= s.top && r <= s.bot) return s;
  return null;
}
// height of the floor under a point (x,z) for someone standing on level L
export function groundY(x, z, L) {
  const s = stairAt(toC(x), toR(z));
  if (s) {
    const zTop = s.top * T, zBot = (s.bot + 1) * T;
    const t = Math.min(1, Math.max(0, (zBot - z) / (zBot - zTop)));
    return t * FLOOR_H;
  }
  return L * FLOOR_H;
}
export const levelOfY = y => (y > FLOOR_H / 2 ? 1 : 0);

// can a body on level L stand in tile (c,r)?
export function canStand(L, c, r) { return walkTile(at(L, c, r)); }

// line of sight on one level (grid DDA)
export function los(L, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz);
  const n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) {
    const x = x0 + dx * i / n, z = z0 + dz * i / n;
    if (blocksSight(at(L, toC(x), toR(z)))) return false;
  }
  return true;
}

// ---------- path finding (BFS over tiles, with staircases) ----------
// nodes: level 0/1 normal tiles, level 2 = stair tiles
const key = (L, c, r) => (L * H + r) * W + c;
export function nodeOf(x, z, y) {
  const c = toC(x), r = toR(z);
  if (stairAt(c, r)) return { L: 2, c, r };
  return { L: levelOfY(y), c, r };
}
function neighbors(n, noStairs) {
  const out = [];
  const { L, c, r } = n;
  if (L === 2) {
    const s = stairAt(c, r);
    if (r > s.top) out.push({ L: 2, c, r: r - 1 }); else out.push({ L: 1, c, r: r - 1 });
    if (r < s.bot) out.push({ L: 2, c, r: r + 1 }); else out.push({ L: 0, c, r: r + 1 });
    return out;
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [dc, dr] of dirs) {
    const nc = c + dc, nr = r + dr;
    const s = stairAt(nc, nr);
    if (s) {
      if (noStairs || dc !== 0) continue;
      if (L === 1 && nr === s.top && dr === 1) out.push({ L: 2, c: nc, r: nr });
      if (L === 0 && nr === s.bot && dr === -1) out.push({ L: 2, c: nc, r: nr });
      continue;
    }
    if (!canStand(L, nc, nr)) continue;
    if (dc && dr && (!canStand(L, c + dc, r) || !canStand(L, c, r + dr) || stairAt(c + dc, r) || stairAt(c, r + dr))) continue;
    out.push({ L, c: nc, r: nr });
  }
  return out;
}
export function findPath(from, to, noStairs = false, maxN = 2000) {
  const start = key(from.L, from.c, from.r), goal = key(to.L, to.c, to.r);
  if (start === goal) return [to];
  const prev = new Map([[start, null]]);
  const nodes = new Map([[start, from]]);
  const q = [from];
  let qi = 0;
  while (qi < q.length && qi < maxN) {
    const n = q[qi++];
    for (const m of neighbors(n, noStairs)) {
      const k = key(m.L, m.c, m.r);
      if (prev.has(k)) continue;
      prev.set(k, key(n.L, n.c, n.r)); nodes.set(k, m);
      if (k === goal) {
        const path = [];
        let cur = k;
        while (cur !== start) { path.push(nodes.get(cur)); cur = prev.get(cur); }
        return path.reverse();
      }
      q.push(m);
    }
  }
  return null;
}
export function nodeWorld(n) {
  const x = tileX(n.c), z = tileZ(n.r);
  const y = n.L === 2 ? groundY(x, z, 0) : n.L * FLOOR_H;
  return { x, y, z };
}

// all walkable tiles per level (for random wandering)
export const OPEN = [[], []];
for (let L = 0; L < 2; L++) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++)
  if (canStand(L, c, r) && !stairAt(c, r)) OPEN[L].push({ L, c, r });

// ---------- hiding spots ----------
export const HIDES = [];
for (let L = 0; L < 2; L++) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const ch = at(L, c, r);
  if (HIDE_TYPES[ch]) {
    // the open tile you step in from
    const opts = [[0, 1], [0, -1], [1, 0], [-1, 0]].filter(([dc, dr]) => canStand(L, c + dc, r + dr) && !stairAt(c + dc, r + dr));
    if (opts.length) HIDES.push({ L, c, r, type: HIDE_TYPES[ch], ch, exits: opts });
  }
}

// ---------- hallways (where the Bookworm strikes) ----------
export const HALLS = [];
for (let L = 0; L < 2; L++) {
  const shelfy = (c, r) => SHELFY.has(at(L, c, r)) || at(L, c, r) === 'O';
  const open = (c, r) => canStand(L, c, r) && !stairAt(c, r);
  for (let r = 0; r < H; r++) { // east-west halls
    let run = [];
    for (let c = 0; c <= W; c++) {
      const q = c < W && open(c, r) && shelfy(c, r - 1) && shelfy(c, r + 1);
      const bridge = c < W && open(c, r) && run.length && c + 1 < W && open(c + 1, r) && shelfy(c + 1, r - 1) && shelfy(c + 1, r + 1);
      if (q || bridge) run.push(c);
      else { if (run.length >= 3) HALLS.push({ L, axis: 'x', fixed: r, a: run[0], b: run[run.length - 1] }); run = []; }
    }
  }
  for (let c = 0; c < W; c++) { // north-south halls
    let run = [];
    for (let r = 0; r <= H; r++) {
      const q = r < H && open(c, r) && shelfy(c - 1, r) && shelfy(c + 1, r);
      const bridge = r < H && open(c, r) && run.length && r + 1 < H && open(c, r + 1) && shelfy(c - 1, r + 1) && shelfy(c + 1, r + 1);
      if (q || bridge) run.push(r);
      else { if (run.length >= 3) HALLS.push({ L, axis: 'z', fixed: c, a: run[0], b: run[run.length - 1] }); run = []; }
    }
  }
}
export function hallAt(L, c, r) {
  for (const h of HALLS) {
    if (h.L !== L) continue;
    if (h.axis === 'x' && h.fixed === r && c >= h.a && c <= h.b) return h;
    if (h.axis === 'z' && h.fixed === c && r >= h.a && r <= h.b) return h;
  }
  return null;
}

export function findTile(ch) {
  for (let L = 0; L < 2; L++) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (at(L, c, r) === ch) return { L, c, r };
  return null;
}
export const ATRIUM = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (at(1, c, r) === 'O') ATRIUM.push({ c, r });
