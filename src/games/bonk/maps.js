import { CX, CY, W, H } from './data'

// A map is a list of shapes, written relative to the arena center.
// Plain shapes are ground, `hole: true` shapes cut ground away, and shapes
// with `mv` slide around (line: back and forth, otherwise an oval orbit).
const circle = (x, y, r, extra = {}) => ({ k: 'c', bx: x, by: y, r, ...extra })
const rect = (x, y, w, h, extra = {}) => ({ k: 'r', bx: x, by: y, w, h, ...extra })
const poly = (x, y, pts, extra = {}) => ({ k: 'p', bx: x, by: y, pts, ...extra })

function hexPoints(r) {
  return Array.from({ length: 6 }, (_, i) => [
    Math.cos((i * Math.PI) / 3) * r,
    Math.sin((i * Math.PI) / 3) * r * 0.78,
  ])
}

const rand = (a, b) => a + Math.random() * (b - a)

const PRESETS = [
  () => ({
    name: 'Big Donut',
    shapes: [
      circle(0, 0, 228),
      circle(0, 0, 72, { hole: true }),
      circle(0, 0, 44, { mv: { ax: 265, ay: 245, sp: 0.45, ph: 0 } }),
      circle(0, 0, 44, { mv: { ax: 265, ay: 245, sp: 0.45, ph: Math.PI } }),
    ],
  }),
  () => ({
    name: 'The Plus',
    shapes: [
      rect(0, 0, 560, 190),
      rect(0, 0, 190, 480),
      rect(0, -185, 90, 60, { mv: { ax: 330, ay: 0, sp: 0.6, ph: 0, line: true } }),
      rect(0, 185, 90, 60, { mv: { ax: 330, ay: 0, sp: 0.6, ph: Math.PI, line: true } }),
    ],
  }),
  () => ({
    name: 'Island Hop',
    shapes: [
      circle(-200, -110, 120),
      circle(200, -110, 120),
      circle(-200, 110, 120),
      circle(200, 110, 120),
      circle(0, -110, 52, { mv: { ax: 150, ay: 0, sp: 0.7, ph: 0, line: true } }),
      circle(0, 110, 52, { mv: { ax: 150, ay: 0, sp: 0.7, ph: Math.PI, line: true } }),
    ],
  }),
  () => ({
    name: 'Hexagon Pizza',
    shapes: [
      poly(0, 0, hexPoints(255)),
      rect(0, 0, 80, 60, { mv: { ax: 285, ay: 200, sp: 0.4, ph: 0 } }),
      rect(0, 0, 80, 60, { mv: { ax: 285, ay: 200, sp: 0.4, ph: Math.PI } }),
    ],
  }),
  () => ({
    name: 'Twin Towers',
    shapes: [
      circle(-210, 0, 165),
      circle(210, 0, 165),
      rect(0, 0, 170, 80, { mv: { ax: 0, ay: 170, sp: 0.55, ph: 0, line: true } }),
    ],
  }),
  () => ({
    name: 'Swiss Cheese',
    shapes: [
      rect(0, 0, 540, 400),
      circle(-150, -80, 55, { hole: true }),
      circle(140, 70, 62, { hole: true }),
      circle(0, 125, 38, { hole: true }),
      circle(170, -110, 36, { hole: true }),
      circle(-160, 115, 40, { hole: true }),
      circle(0, 0, 46, { hole: true, mv: { ax: 210, ay: 0, sp: 0.5, ph: 0, line: true } }),
    ],
  }),
  () => {
    // A random lumpy blob: each new circle grows out of an earlier one, so
    // the whole thing is always connected.
    const shapes = [circle(0, 0, rand(110, 145))]
    const count = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const parent = shapes[Math.floor(Math.random() * shapes.length)]
      const r = rand(65, 125)
      const a = Math.random() * Math.PI * 2
      const d = parent.r * 0.8 + r * 0.4
      const x = Math.max(-(360 - r), Math.min(360 - r, parent.bx + Math.cos(a) * d))
      const y = Math.max(-(250 - r), Math.min(250 - r, parent.by + Math.sin(a) * d))
      shapes.push(circle(x, y, r))
    }
    if (Math.random() < 0.5) {
      const s = shapes[Math.floor(Math.random() * shapes.length)]
      shapes.push(circle(s.bx, s.by, s.r * 0.35, { hole: true }))
    }
    const movers = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < movers; i++) {
      shapes.push(
        circle(0, 0, 42, {
          mv: { ax: 300, ay: 235, sp: rand(0.35, 0.65), ph: (i * Math.PI * 2) / movers },
        }),
      )
    }
    const names = ['Mystery Blob', 'Cloud Pudding', 'Lumpy Island', 'The Potato', 'Wobble Rock']
    return { name: names[Math.floor(Math.random() * names.length)], shapes }
  },
]

export function pickMap(avoidIndex) {
  let i = Math.floor(Math.random() * PRESETS.length)
  if (i === avoidIndex) i = (i + 1) % PRESETS.length
  const map = PRESETS[i]()
  map.index = i
  for (const s of map.shapes) {
    s.bx += CX
    s.by += CY
    s.x = s.bx
    s.y = s.by
    s.dx = 0
    s.dy = 0
  }
  map.movers = map.shapes.filter((s) => s.mv && !s.hole)
  map.statics = map.shapes.filter((s) => !s.mv && !s.hole)
  map.holes = map.shapes.filter((s) => s.hole)
  map.safe = findSafePoints(map)
  return map
}

export function updateMap(map, t) {
  for (const s of map.shapes) {
    if (!s.mv) continue
    const a = t * s.mv.sp + s.mv.ph
    const nx = s.bx + s.mv.ax * (s.mv.line ? Math.sin(a) : Math.cos(a))
    const ny = s.by + s.mv.ay * Math.sin(a)
    s.dx = nx - s.x
    s.dy = ny - s.y
    s.x = nx
    s.y = ny
  }
}

export function inShape(s, x, y) {
  if (s.k === 'c') {
    const dx = x - s.x
    const dy = y - s.y
    return dx * dx + dy * dy < s.r * s.r
  }
  if (s.k === 'r') {
    return Math.abs(x - s.x) < s.w / 2 && Math.abs(y - s.y) < s.h / 2
  }
  let inside = false
  const pts = s.pts
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0] + s.x
    const yi = pts[i][1] + s.y
    const xj = pts[j][0] + s.x
    const yj = pts[j][1] + s.y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function onStatic(map, x, y) {
  return map.statics.some((s) => inShape(s, x, y)) && !map.holes.some((s) => inShape(s, x, y))
}

export function groundAt(map, x, y) {
  for (const s of map.movers) if (inShape(s, x, y)) return true
  if (!map.statics.some((s) => inShape(s, x, y))) return false
  return !map.holes.some((s) => inShape(s, x, y))
}

// "Safe" means solid ground with a comfy margin all around.
export function safeAt(map, x, y, margin = 40) {
  if (!groundAt(map, x, y)) return false
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    if (!groundAt(map, x + Math.cos(a) * margin, y + Math.sin(a) * margin)) return false
  }
  return true
}

function findSafePoints(map) {
  const pts = []
  for (let x = 20; x < W; x += 30) {
    for (let y = 20; y < H; y += 30) {
      if (map.statics.some((s) => inShape(s, x, y)) && safeAt(map, x, y)) pts.push({ x, y })
    }
  }
  return pts
}

export function pickSpawns(map, n) {
  const pts = map.safe.length ? map.safe : [{ x: CX, y: CY }]
  const chosen = [pts[Math.floor(Math.random() * pts.length)]]
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

export function nearestSafe(map, x, y) {
  let best = null
  let bestD = Infinity
  for (const p of map.safe) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2
    if (d < bestD && safeAt(map, p.x, p.y, 30)) {
      bestD = d
      best = p
    }
  }
  return best || { x: CX, y: CY }
}
