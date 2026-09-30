import { CX, CY, H, TILE, W } from './data'

// The floor is a grid of tiles so events can crack, sink and restore pieces.
// Moving platforms are separate shapes that glide around above the void.
const COLS = W / TILE
const ROWS = H / TILE

const circle = (x, y, r, extra = {}) => ({ k: 'c', x, y, r, ...extra })
const rect = (x, y, w, h, extra = {}) => ({ k: 'r', x, y, w, h, ...extra })
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const PALETTES = [
  ['#ff5d8f', '#ffb13b', '#ffe45e', '#5ee07a', '#4cc9f0', '#9d6bff'],
  ['#ff9ecf', '#ffd6f0', '#c8b6ff', '#b8f2e6', '#fff1a8'],
  ['#2ec4b6', '#ff9f1c', '#ffbf69', '#cbf3f0', '#ff6b6b'],
  ['#7bdff2', '#b2f7ef', '#f7d6e0', '#f2b5d4', '#eff7f6'],
  ['#8ac926', '#ffca3a', '#ff595e', '#1982c4', '#6a4c93'],
  ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'],
]

function shapeHas(s, x, y) {
  if (s.k === 'c') return (x - s.x) ** 2 + (y - s.y) ** 2 < s.r * s.r
  if (s.k === 'r') return Math.abs(x - s.x) < s.w / 2 && Math.abs(y - s.y) < s.h / 2
  // star / polygon given as a radius function
  const a = Math.atan2(y - s.y, x - s.x)
  return Math.hypot(x - s.x, y - s.y) < s.radius(a)
}

const hex = (r) => ({
  k: 'f',
  x: 0,
  y: 0,
  radius: (a) => {
    const seg = Math.PI / 3
    const t = ((a % seg) + seg) % seg
    return (r * Math.cos(seg / 2)) / Math.cos(t - seg / 2)
  },
})

const star = (r) => ({ k: 'f', x: 0, y: 0, radius: (a) => r * (0.62 + 0.38 * Math.cos(a * 5)) })

const PRESETS = [
  { key: 'donut', name: 'Big Donut', shapes: () => [circle(0, 0, 240)], holes: () => [circle(0, 0, 70)],
    movers: () => [circle(0, 0, 44, { mv: { ax: 285, ay: 270, sp: 0.45, ph: 0 } }), circle(0, 0, 44, { mv: { ax: 285, ay: 270, sp: 0.45, ph: Math.PI } })] },
  { key: 'plus', name: 'The Plus', shapes: () => [rect(0, 0, 600, 200), rect(0, 0, 200, 520)],
    movers: () => [rect(0, -200, 90, 60, { mv: { ax: 340, ay: 0, sp: 0.6, ph: 0, line: true } }), rect(0, 200, 90, 60, { mv: { ax: 340, ay: 0, sp: 0.6, ph: Math.PI, line: true } })] },
  { key: 'islands', name: 'Island Hop', shapes: () => [circle(-210, -120, 125), circle(210, -120, 125), circle(-210, 120, 125), circle(210, 120, 125)],
    movers: () => [circle(0, -120, 52, { mv: { ax: 150, ay: 0, sp: 0.7, ph: 0, line: true } }), circle(0, 120, 52, { mv: { ax: 150, ay: 0, sp: 0.7, ph: Math.PI, line: true } })] },
  { key: 'hex', name: 'Hexagon Pizza', shapes: () => [hex(265)],
    movers: () => [rect(0, 0, 80, 60, { mv: { ax: 330, ay: 270, sp: 0.4, ph: 0 } })] },
  { key: 'twins', name: 'Twin Towers', shapes: () => [circle(-215, 0, 170), circle(215, 0, 170)],
    movers: () => [rect(0, 0, 170, 80, { mv: { ax: 0, ay: 180, sp: 0.55, ph: 0, line: true } })] },
  { key: 'cheese', name: 'Swiss Cheese', shapes: () => [rect(0, 0, 600, 440)],
    holes: () => [circle(-160, -90, 50), circle(150, 80, 60), circle(10, 150, 38), circle(185, -120, 36), circle(-170, 130, 40), circle(-10, -30, 34)] },
  { key: 'tiny', name: 'Tiny Island', shapes: () => [circle(0, 0, 130)],
    movers: () => [circle(0, 0, 40, { mv: { ax: 190, ay: 170, sp: 0.5, ph: 0 } })] },
  { key: 'mega', name: 'Mega Pancake', shapes: () => [circle(0, 0, 300)] },
  { key: 'steps', name: 'Sky Steps', shapes: () => [rect(-270, 170, 170, 130), rect(-110, 80, 170, 130), rect(50, -10, 170, 130), rect(210, -100, 170, 130), rect(-110, -170, 130, 110), rect(190, 170, 150, 120)],
    movers: () => [circle(40, 180, 45, { mv: { ax: 120, ay: 0, sp: 0.7, ph: 0, line: true } })] },
  { key: 'star', name: 'Star Burst', shapes: () => [star(290)] },
  { key: 'bridges', name: 'Bridge Battle', shapes: () => [circle(-250, 0, 120), circle(250, 0, 120), circle(0, -170, 110), rect(0, 0, 420, 44), rect(-125, -85, 44, 220), rect(125, -85, 44, 220)] },
  { key: 'stones', name: 'Stepping Stones', shapes: () => {
    const out = []
    for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) if ((i + j) % 2 === 0) out.push(rect(i * 88, j * 88, 110, 110))
    return out
  } },
]

const RARE = [
  { key: 'void', name: 'The Void', shapes: () => [circle(0, 0, 150)], dark: true,
    movers: () => [circle(0, 0, 50, { mv: { ax: 250, ay: 200, sp: 0.6, ph: 0 } }), circle(0, 0, 50, { mv: { ax: 250, ay: 200, sp: 0.6, ph: Math.PI } })] },
  { key: 'candy', name: 'Candy Kingdom', shapes: () => [circle(-150, 0, 150), circle(150, 0, 150), circle(0, -120, 120), circle(0, 120, 120)], palette: ['#ff9ecf', '#fff', '#ff5d8f', '#b8f2e6', '#ffe45e'] },
  { key: 'pond', name: 'Duck Pond', shapes: () => [circle(0, 0, 270)], holes: () => [circle(-60, -30, 90), circle(90, 60, 60)], palette: ['#5ee07a', '#8ac926', '#b8f2e6'] },
]

const ADJ = ['Wobbly', 'Lumpy', 'Squishy', 'Sparkly', 'Bumpy', 'Fluffy', 'Crunchy', 'Jiggly']
const NOUN = ['Blob', 'Pudding', 'Potato', 'Cloud', 'Pancake', 'Jellybean']

function blob() {
  const shapes = [circle(0, 0, rand(120, 150))]
  const n = 3 + Math.floor(Math.random() * 4)
  for (let i = 0; i < n; i++) {
    const parent = pick(shapes)
    const r = rand(70, 125)
    const a = Math.random() * Math.PI * 2
    const d = parent.r * 0.8 + r * 0.4
    shapes.push(
      circle(
        Math.max(-(400 - r), Math.min(400 - r, parent.x + Math.cos(a) * d)),
        Math.max(-(270 - r), Math.min(270 - r, parent.y + Math.sin(a) * d)),
        r,
      ),
    )
  }
  const movers = []
  const m = 1 + Math.floor(Math.random() * 2)
  for (let i = 0; i < m; i++) {
    movers.push(circle(0, 0, 44, { mv: { ax: 330, ay: 260, sp: rand(0.35, 0.6), ph: (i * Math.PI * 2) / m } }))
  }
  return { key: 'blob', name: `${pick(ADJ)} ${pick(NOUN)}`, blob: true, shapes: () => shapes, movers: () => movers }
}

export function pickArenaDef(opts = {}) {
  if (opts.challenge === 'tiny') return PRESETS.find((p) => p.key === 'tiny')
  if (opts.challenge === 'giant') return PRESETS.find((p) => p.key === 'mega')
  const r = Math.random()
  if (r < 0.06) return pick(RARE)
  if (r < 0.3) return blob()
  let def = pick(PRESETS)
  if (def.key === opts.avoid) def = pick(PRESETS)
  return def
}

export function buildArena(def) {
  const palette = def.palette || pick(PALETTES)
  const shapes = def.shapes()
  const holes = def.holes ? def.holes() : []
  const tiles = []
  const grid = new Array(COLS * ROWS).fill(null)
  const pattern = Math.floor(Math.random() * 3)
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const x = (i + 0.5) * TILE - CX
      const y = (j + 0.5) * TILE - CY
      if (!shapes.some((s) => shapeHas(s, x, y))) continue
      if (holes.some((s) => shapeHas(s, x, y))) continue
      const d = Math.hypot(x, y)
      const band = pattern === 0 ? Math.floor(d / 60) : pattern === 1 ? i + j : Math.floor((Math.atan2(y, x) + Math.PI) * 1.6)
      const t = {
        i,
        j,
        x: x + CX,
        y: y + CY,
        dist: d,
        state: 'solid',
        t: 0,
        drop: 0,
        color: palette[((band % palette.length) + palette.length) % palette.length],
        alt: (i + j) % 2 === 0,
      }
      grid[j * COLS + i] = t
      tiles.push(t)
    }
  }
  const movers = (def.movers ? def.movers() : []).map((s) => ({
    ...s,
    bx: s.x + CX,
    by: s.y + CY,
    x: s.x + CX,
    y: s.y + CY,
    dx: 0,
    dy: 0,
  }))
  const arena = {
    key: def.key,
    name: def.name,
    blob: !!def.blob,
    preset: PRESETS.includes(def),
    dark: !!def.dark,
    tiles,
    grid,
    movers,
    angle: 0,
    spinSpeed: 0,
    lavaLevel: -400,
    dirty: true,
  }
  arena.safe = tiles.filter((t) => isInterior(arena, t, 2)).map((t) => ({ x: t.x, y: t.y }))
  if (!arena.safe.length) arena.safe = tiles.map((t) => ({ x: t.x, y: t.y }))
  return arena
}

function tileAt(arena, i, j) {
  if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return null
  return arena.grid[j * COLS + i]
}

const standable = (t) => t && (t.state === 'solid' || t.state === 'warn' || (t.state === 'rising' && t.drop > -12))

function isInterior(arena, t, r) {
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (!tileAt(arena, t.i + di, t.j + dj)) return false
  return true
}

// World point → arena frame (undo the arena's spin).
export function toArena(arena, x, y) {
  if (!arena.angle) return [x, y]
  const c = Math.cos(-arena.angle)
  const s = Math.sin(-arena.angle)
  const dx = x - CX
  const dy = y - CY
  return [CX + dx * c - dy * s, CY + dx * s + dy * c]
}

export function toWorld(arena, x, y) {
  if (!arena.angle) return [x, y]
  const c = Math.cos(arena.angle)
  const s = Math.sin(arena.angle)
  const dx = x - CX
  const dy = y - CY
  return [CX + dx * c - dy * s, CY + dx * s + dy * c]
}

export function moverAt(arena, x, y) {
  for (const s of arena.movers) if (shapeHas(s, x, y)) return s
  return null
}

export function tileUnder(arena, x, y) {
  const [ax, ay] = toArena(arena, x, y)
  return tileAt(arena, Math.floor(ax / TILE), Math.floor(ay / TILE))
}

export function onTiles(arena, x, y) {
  return standable(tileUnder(arena, x, y))
}

export function groundAt(arena, x, y) {
  return !!moverAt(arena, x, y) || onTiles(arena, x, y)
}

export function safeAt(arena, x, y, margin = 36) {
  if (!groundAt(arena, x, y)) return false
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    if (!groundAt(arena, x + Math.cos(a) * margin, y + Math.sin(a) * margin)) return false
  }
  return true
}

export function nearEdge(arena, x, y, d = 28) {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4
    if (!groundAt(arena, x + Math.cos(a) * d, y + Math.sin(a) * d)) return true
  }
  return false
}

export function safePoints(arena) {
  return arena.safe
    .map((p) => {
      const [x, y] = toWorld(arena, p.x, p.y)
      return { x, y }
    })
    .filter((p) => safeAt(arena, p.x, p.y, 30))
}

export function nearestSafe(arena, x, y) {
  let best = null
  let bestD = Infinity
  for (const p of arena.safe) {
    const [wx, wy] = toWorld(arena, p.x, p.y)
    const d = (wx - x) ** 2 + (wy - y) ** 2
    if (d < bestD && safeAt(arena, wx, wy, 30)) {
      bestD = d
      best = { x: wx, y: wy }
    }
  }
  return best || { x: CX, y: CY }
}

export function pickSpawns(arena, n, edge = false) {
  let pts = safePoints(arena)
  if (edge) {
    const far = arena.tiles.filter((t) => t.state === 'solid' && !isInterior(arena, t, 1)).map((t) => ({ x: t.x, y: t.y }))
    if (far.length >= n) pts = far
  }
  if (!pts.length) pts = arena.tiles.map((t) => ({ x: t.x, y: t.y }))
  const chosen = [pick(pts)]
  while (chosen.length < n) {
    let best = pts[0]
    let bestD = -1
    for (const p of pts) {
      const d = Math.min(...chosen.map((c) => Math.hypot(c.x - p.x, c.y - p.y)))
      if (d > bestD) {
        bestD = d
        best = p
      }
    }
    chosen.push(best)
  }
  return chosen.sort(() => Math.random() - 0.5)
}

export function updateArena(arena, t, dt) {
  for (const s of arena.movers) {
    const a = t * s.mv.sp + s.mv.ph
    const nx = s.bx + s.mv.ax * (s.mv.line ? Math.sin(a) : Math.cos(a))
    const ny = s.by + s.mv.ay * Math.sin(a)
    s.dx = nx - s.x
    s.dy = ny - s.y
    s.x = nx
    s.y = ny
  }
  arena.dAngle = arena.spinSpeed * dt
  arena.angle += arena.dAngle

  for (const tile of arena.tiles) {
    if (tile.state === 'warn') {
      tile.t -= dt
      if (tile.t <= 0) {
        tile.state = 'falling'
        tile.t = 0
      }
    } else if (tile.state === 'falling') {
      tile.t += dt
      tile.drop = -tile.t * tile.t * 900
      if (tile.t > 1.2) tile.state = 'gone'
    } else if (tile.state === 'rising') {
      tile.drop = Math.min(0, tile.drop + 500 * dt)
      if (tile.drop >= 0) {
        tile.drop = 0
        tile.state = 'solid'
      }
    }
  }
}

export function crumble(tile, delay = 1.2) {
  if (!tile || tile.state !== 'solid') return false
  tile.state = 'warn'
  tile.t = delay
  return true
}

export function restoreAll(arena) {
  for (const t of arena.tiles) {
    if (t.state === 'gone' || t.state === 'falling') {
      t.state = 'rising'
      t.drop = Math.min(t.drop, -300)
    } else if (t.state === 'warn') {
      t.state = 'solid'
    }
  }
  arena.lavaLevel = -400
}

export function randomSolidTile(arena, edgeOnly = false) {
  const pool = arena.tiles.filter((t) => t.state === 'solid' && (!edgeOnly || !isInterior(arena, t, 1)))
  return pool.length ? pick(pool) : null
}

export function outermostSolid(arena) {
  let best = null
  for (const t of arena.tiles) if (t.state === 'solid' && (!best || t.dist > best.dist)) best = t
  return best
}

export function solidCount(arena) {
  return arena.tiles.filter((t) => t.state === 'solid').length
}

export function neighbours(arena, tile, r = 1) {
  const out = []
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const t = tileAt(arena, tile.i + di, tile.j + dj)
    if (t) out.push(t)
  }
  return out
}

export const PRESET_KEYS = PRESETS.map((p) => p.key)
