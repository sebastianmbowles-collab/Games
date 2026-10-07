// Real pixel-art sprites for Aliens VS Dinos. Each sprite is painted pixel by pixel onto a tiny grid
// (shapes, then shading, then a 1-pixel dark outline), using colours from the Endesga 32 palette.
// Sprites are built the first time they're needed and then reused.

export const PAL = {
  ink: '#181425',
  white: '#ffffff',
  cream: '#ead4aa',
  tan: '#e4a672',
  peach: '#e8b796',
  brown: '#b86f50',
  dkbrown: '#733e39',
  plum: '#3e2731',
  red: '#e43b44',
  dkred: '#a22633',
  rust: '#be4a2f',
  orange: '#f77622',
  amber: '#feae34',
  yellow: '#fee761',
  green: '#63c74d',
  dkgreen: '#3e8948',
  forest: '#265c42',
  pine: '#193c3e',
  navy: '#124e89',
  blue: '#0099db',
  cyan: '#2ce8f5',
  silver: '#c0cbdc',
  steel: '#8b9bb4',
  slate: '#5a6988',
  dkslate: '#3a4466',
  night: '#262b44',
  purple: '#68386c',
  magenta: '#b55088',
  pink: '#f6757a',
}

const DINO_COLORS = {
  rex: { body: PAL.green, shade: PAL.dkgreen, belly: PAL.cream, extra: PAL.dkgreen },
  trike: { body: PAL.orange, shade: PAL.rust, belly: PAL.peach, extra: PAL.amber },
  stego: { body: PAL.magenta, shade: PAL.purple, belly: PAL.pink, extra: PAL.red },
  raptor: { body: PAL.blue, shade: PAL.navy, belly: PAL.silver, extra: PAL.yellow },
  bronto: { body: PAL.tan, shade: PAL.brown, belly: PAL.cream, extra: PAL.brown },
}

// Paint jobs you can pick on your profile (the gold shop skins win if you own them).
const REX_SKINS = {
  blue: { body: PAL.blue, shade: PAL.navy, belly: PAL.silver, extra: PAL.navy },
  orange: { body: PAL.orange, shade: PAL.rust, belly: PAL.peach, extra: PAL.rust },
  purple: { body: PAL.magenta, shade: PAL.purple, belly: PAL.pink, extra: PAL.purple },
  pink: { body: PAL.pink, shade: PAL.magenta, belly: PAL.cream, extra: PAL.magenta },
  red: { body: PAL.red, shade: PAL.dkred, belly: PAL.peach, extra: PAL.dkred },
}
const UFO_TINTS = {
  blue: [PAL.blue, PAL.cyan, PAL.navy],
  green: [PAL.green, PAL.cream, PAL.dkgreen],
  pink: [PAL.pink, PAL.peach, PAL.magenta],
  purple: [PAL.magenta, PAL.pink, PAL.purple],
  black: [PAL.dkslate, PAL.slate, PAL.night],
}

function dinoColors(kind, o) {
  if (o.gold) return { body: PAL.yellow, shade: PAL.amber, belly: PAL.cream, extra: PAL.amber }
  if (kind === 'rex' && REX_SKINS[o.skin]) return REX_SKINS[o.skin]
  return DINO_COLORS[kind]
}

class Grid {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.c = new Array(w * h).fill(null)
  }
  px(x, y, col) {
    x = Math.round(x)
    y = Math.round(y)
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col
  }
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.c[y * this.w + x] : null
  }
  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col)
  }
  ellipse(cx, cy, rx, ry, col, onlyTop = false) {
    for (let y = 0; y < this.h; y++) {
      if (onlyTop && y + 0.5 > cy) continue
      for (let x = 0; x < this.w; x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) this.px(x, y, col)
      }
    }
  }
  poly(pts, col) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let inside = false
        const px = x + 0.5
        const py = y + 0.5
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i]
          const [xj, yj] = pts[j]
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
        }
        if (inside) this.px(x, y, col)
      }
    }
  }
  line(x0, y0, x1, y1, col, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = y0 + ((y1 - y0) * i) / n
      this.rect(Math.round(x), Math.round(y), thick, thick, col)
    }
  }
  // Darken the bottom edge and brighten the top edge of each colour, like a pixel artist's shading.
  shade(map, light = {}) {
    const old = this.c.slice()
    const at = (x, y) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? old[y * this.w + x] : null)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const v = old[y * this.w + x]
        if (!v) continue
        if (map[v] && at(x, y + 1) !== v) this.c[y * this.w + x] = map[v]
        else if (light[v] && at(x, y - 1) !== v && !at(x, y - 1)) this.c[y * this.w + x] = light[v]
      }
    }
  }
  // A 1-pixel dark outline all the way around.
  outline(col = PAL.ink) {
    const old = this.c.slice()
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (old[y * this.w + x]) continue
        const near = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const xx = x + dx
          const yy = y + dy
          return xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && old[yy * this.w + xx] && old[yy * this.w + xx] !== col
        })
        if (near) this.c[y * this.w + x] = col
      }
    }
  }
  recolor(fn) {
    this.c = this.c.map((v) => (v ? fn(v) : v))
  }
  toCanvas(flip = false) {
    const cv = document.createElement('canvas')
    cv.width = this.w
    cv.height = this.h
    const ctx = cv.getContext('2d')
    const img = ctx.createImageData(this.w, this.h)
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const v = this.c[y * this.w + (flip ? this.w - 1 - x : x)]
        if (!v) continue
        const i = (y * this.w + x) * 4
        img.data[i] = parseInt(v.slice(1, 3), 16)
        img.data[i + 1] = parseInt(v.slice(3, 5), 16)
        img.data[i + 2] = parseInt(v.slice(5, 7), 16)
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    return cv
  }
}

// An eye: a 2x2 white square with a pupil (bigger when scared, a line when blinking).
function eye(g, x, y, o, skin) {
  if (o.blink) {
    g.rect(x, y, 2, 2, skin)
    g.rect(x, y + 1, 2, 1, PAL.ink)
    return
  }
  if (o.scared) {
    g.rect(x - 1, y - 1, 3, 3, PAL.white)
    g.px(x, y, PAL.ink)
    return
  }
  g.rect(x, y, 2, 2, PAL.white)
  g.px(x + 1, o.lookUp ? y : y + 1, PAL.ink)
  if (o.angry) g.line(x - 1, y - 2, x + 2, y - 1, PAL.ink)
}

function legs(g, list, frame, colBack, colFront) {
  // list: [x, y, w, h, back?]; frame 1 lifts every other leg by one pixel
  list.forEach(([x, y, w, h, back], i) => {
    const up = frame === 'walk1' && i % 2 === 0 ? 1 : 0
    const dangle = frame === 'lift' ? (i % 2 ? 1 : -1) : 0
    g.rect(x + dangle, y, w, h - up, back ? colBack : colFront)
    g.rect(x + dangle + (back ? 0 : 1), y + h - up - 1, w, 1, back ? colBack : colFront)
  })
}

function buildDino(kind, o) {
  const C = dinoColors(kind, o)
  const { frame } = o
  let g
  let anchor
  if (kind === 'rex') {
    g = new Grid(32, 25)
    legs(
      g,
      [
        [10, 17, 3, 6, true],
        [16, 17, 3, 6, false],
      ],
      frame,
      C.shade,
      C.body,
    )
    g.poly(
      [
        [11, 9],
        [1, 15],
        [2, 16],
        [12, 16],
      ],
      C.body,
    )
    g.ellipse(14.5, 13, 7.5, 6, C.body)
    g.rect(18, 5, 5, 7, C.body)
    g.rect(18, 1, 11, 6, C.body)
    g.px(18, 1, null)
    g.px(28, 1, null)
    const open = frame === 'roar' || frame === 'lift'
    if (open) {
      g.rect(20, 7, 9, 2, PAL.dkred)
      g.rect(20, 9, 9, 2, C.body)
      for (const x of [21, 24, 27]) g.px(x, 7, PAL.white)
      for (const x of [22, 25]) g.px(x, 8, PAL.white)
    } else {
      g.rect(20, 7, 9, 2, C.body)
    }
    g.ellipse(17, 15, 3.5, 3.5, C.belly)
    for (const [x, y] of [
      [11, 10],
      [13, 9],
      [9, 13],
      [12, 12],
    ])
      g.px(x, y, C.shade)
    if (frame === 'lift') {
      g.px(22, 11, C.body)
      g.px(23, 10, C.body)
    } else {
      g.rect(22, 12, 2, 1, C.body)
      g.px(23, 13, C.body)
    }
    g.shade({ [C.body]: C.shade })
    if (!open) {
      g.line(23, 6, 27, 6, PAL.ink)
      g.px(25, 7, PAL.white)
    }
    eye(g, 21, 2, { ...o, scared: o.scared || frame === 'lift' }, C.body)
    g.px(27, 2, PAL.ink)
    anchor = [15, 25]
  } else if (kind === 'raptor') {
    g = new Grid(30, 21)
    legs(
      g,
      [
        [11, 12, 2, 6, true],
        [14, 12, 2, 6, false],
      ],
      frame,
      C.shade,
      C.body,
    )
    g.poly(
      [
        [10, 7],
        [0, 8],
        [0, 10],
        [10, 11],
      ],
      C.body,
    )
    g.ellipse(13, 9.5, 6, 3.5, C.body)
    g.rect(16, 4, 3, 5, C.body)
    g.ellipse(21, 4.5, 4, 2.5, C.body)
    g.rect(21, 4, 5, 2, C.body)
    const open = frame === 'lift' || frame === 'roar'
    if (open) g.rect(22, 6, 4, 1, PAL.dkred)
    g.ellipse(14, 11, 3.5, 1.5, C.belly)
    for (const x of [9, 11, 13]) g.px(x, 7, C.shade)
    g.px(18, 9, C.body)
    g.px(19, 10, C.body)
    g.shade({ [C.body]: C.shade })
    for (const [x, y] of [
      [17, 1],
      [18, 1],
      [19, 2],
      [16, 2],
    ])
      g.px(x, y, C.extra)
    eye(g, 20, 3, { ...o, scared: o.scared || frame === 'lift' }, C.body)
    anchor = [13, 20]
  } else if (kind === 'bronto') {
    g = new Grid(40, 32)
    legs(
      g,
      [
        [9, 25, 4, 5, true],
        [19, 25, 4, 5, true],
        [12, 25, 4, 5, false],
        [22, 25, 4, 5, false],
      ],
      frame,
      C.shade,
      C.body,
    )
    g.poly(
      [
        [9, 19],
        [0, 25],
        [1, 26],
        [10, 25],
      ],
      C.body,
    )
    g.ellipse(16, 21, 10, 6.5, C.body)
    g.poly(
      [
        [21, 19],
        [27, 5],
        [31, 6],
        [26, 21],
      ],
      C.body,
    )
    g.ellipse(31, 4.5, 4.5, 2.6, C.body)
    if (frame === 'lift') g.rect(33, 5, 2, 1, PAL.dkred)
    g.ellipse(18, 24, 6, 2, C.belly)
    for (const [x, y] of [
      [12, 17],
      [16, 16],
      [20, 17],
      [14, 19],
    ])
      g.px(x, y, C.shade)
    g.shade({ [C.body]: C.shade })
    eye(g, 31, 3, { ...o, scared: o.scared || frame === 'lift' }, C.body)
    anchor = [16, 31]
  } else {
    // trike and stego share a four-legged body
    g = new Grid(34, 24)
    legs(
      g,
      [
        [8, 17, 3, 5, true],
        [18, 17, 3, 5, true],
        [11, 17, 3, 5, false],
        [21, 17, 3, 5, false],
      ],
      frame,
      C.shade,
      C.body,
    )
    g.poly(
      [
        [8, 12],
        [0, 15],
        [1, 16],
        [8, 16],
      ],
      C.body,
    )
    if (kind === 'stego') {
      ;[
        [9, 5],
        [13, 7],
        [17, 7],
        [21, 5],
      ].forEach(([x, h]) =>
        g.poly(
          [
            [x - 2.5, 11],
            [x, 10 - h],
            [x + 2.5, 11],
          ],
          C.extra,
        ),
      )
      for (const x of [2, 5]) {
        g.px(x, 13, PAL.cream)
        g.px(x, 12, PAL.cream)
      }
    }
    g.ellipse(15, 13, 9, 5.5, C.body)
    if (kind === 'trike') {
      g.ellipse(24, 9, 3.5, 5.5, C.extra)
      g.px(23, 6, C.shade)
      g.px(24, 9, C.shade)
      g.px(23, 12, C.shade)
      g.ellipse(27.5, 13, 4.5, 3.5, C.body)
      g.line(27, 10, 30, 5, PAL.cream)
      g.line(29, 10, 32, 7, PAL.cream)
      g.px(32, 12, PAL.cream)
      g.px(31, 15, PAL.dkbrown)
      g.px(32, 14, PAL.dkbrown)
    } else {
      g.rect(22, 13, 4, 3, C.body)
      g.ellipse(27.5, 15, 3.5, 2.5, C.body)
    }
    if (frame === 'lift') g.rect(29, kind === 'trike' ? 15 : 16, 2, 1, PAL.dkred)
    g.ellipse(16, 16, 6, 2, C.belly)
    for (const [x, y] of [
      [10, 10],
      [14, 9],
      [18, 10],
      [12, 12],
    ])
      g.px(x, y, C.shade)
    g.shade({ [C.body]: C.shade })
    eye(g, kind === 'trike' ? 27 : 27, kind === 'trike' ? 11 : 14, { ...o, scared: o.scared || frame === 'lift' }, C.body)
    anchor = [15, 23]
  }
  g.outline()
  return { g, anchor }
}

function buildBaby(kind, o) {
  const C = dinoColors(kind, o)
  const g = new Grid(19, 15)
  legs(
    g,
    [
      [5, 11, 2, 3, true],
      [8, 11, 2, 3, false],
    ],
    o.frame,
    C.shade,
    C.body,
  )
  g.poly(
    [
      [4, 8],
      [0, 10],
      [1, 11],
      [4, 11],
    ],
    C.body,
  )
  g.ellipse(7, 9.5, 4.5, 3, C.body)
  const neckUp = kind === 'bronto'
  if (neckUp) g.rect(10, 4, 2, 5, C.body)
  const hy = neckUp ? 3.5 : 6.5
  if (kind === 'trike') {
    g.ellipse(10, 5, 2, 3, C.extra)
  }
  if (kind === 'stego') for (const [x, y] of [
    [4, 6],
    [6, 5],
    [8, 6],
  ]) {
    g.px(x, y, C.extra)
    g.px(x, y + 1, C.extra)
  }
  g.ellipse(13, hy, 3.5, 3, C.body)
  if (kind === 'raptor') {
    g.px(12, hy - 3, C.extra)
    g.px(13, hy - 3, C.extra)
  }
  if (kind === 'trike') g.px(15, hy - 3, PAL.cream)
  g.ellipse(7, 11, 2.5, 1, C.belly)
  g.shade({ [C.body]: C.shade })
  if (o.frame === 'lift') g.px(15, hy + 1, PAL.dkred)
  eye(g, 13, Math.round(hy) - 2, { ...o, scared: o.scared || o.frame === 'lift' }, C.body)
  g.outline()
  return { g, anchor: [8, 15] }
}

function buildUFO(o) {
  const enemy = o.enemy
  const tint = !enemy && !o.gold && UFO_TINTS[o.tint]
  const metal = enemy ? PAL.red : o.gold ? PAL.amber : tint ? tint[0] : PAL.steel
  const hi = enemy ? PAL.pink : o.gold ? PAL.yellow : tint ? tint[1] : PAL.silver
  const lo = enemy ? PAL.dkred : o.gold ? PAL.orange : tint ? tint[2] : PAL.slate
  const glass = enemy ? PAL.purple : PAL.navy
  const skin = enemy ? PAL.magenta : PAL.green
  const g = new Grid(41, 19)
  g.ellipse(20.5, 9, 7, 7.5, glass, true)
  // the little alien pilot
  g.ellipse(20.5, 7, 3.5, 3.2, skin)
  g.px(18, 3, PAL.yellow)
  g.px(23, 3, PAL.yellow)
  if (o.mood === 'dizzy') {
    g.px(19, 6, PAL.ink)
    g.px(22, 7, PAL.ink)
    g.px(19, 7, PAL.white)
    g.px(22, 6, PAL.white)
  } else {
    g.rect(18, 6, 2, 2, PAL.ink)
    g.rect(22, 6, 2, 2, PAL.ink)
    g.px(18, 6, PAL.white)
    g.px(22, 6, PAL.white)
    if (enemy) {
      g.px(18, 5, PAL.ink)
      g.px(23, 5, PAL.ink)
    }
  }
  g.px(15, 4, PAL.silver)
  g.px(16, 3, PAL.silver)
  g.ellipse(20.5, 11.5, 19, 3.6, metal)
  g.ellipse(20.5, 14.2, 8, 1.6, PAL.dkslate)
  g.shade({ [metal]: lo }, { [metal]: hi })
  const lights = [5, 10, 15, 20, 25, 30, 35]
  lights.forEach((x, i) => {
    const on = (i + o.light) % 3 === 0
    g.px(x, 12, on ? (enemy ? PAL.yellow : PAL.cyan) : enemy ? PAL.dkred : PAL.dkslate)
  })
  if (o.hurt) g.recolor((v) => (v === PAL.ink ? v : PAL.white))
  g.outline()
  return { g, anchor: [20.5, 11] }
}

function buildAlien(o) {
  const g = new Grid(17, 19)
  const skin = o.enemy ? PAL.magenta : PAL.green
  const dark = o.enemy ? PAL.purple : PAL.dkgreen
  g.line(5, 1, 6, 4, dark)
  g.line(11, 1, 10, 4, dark)
  g.rect(6, 12, 5, 5, PAL.slate)
  g.px(5, 13, skin)
  g.px(11, 13, skin)
  g.rect(6, 17, 2, 1, PAL.dkslate)
  g.rect(9, 17, 2, 1, PAL.dkslate)
  g.ellipse(8.5, 7.5, 5.8, 5, skin)
  g.shade({ [skin]: dark })
  g.px(5, 0, PAL.yellow)
  g.px(11, 0, PAL.yellow)
  if (o.mood === 'dizzy') {
    for (const cx of [5.5, 11]) {
      g.px(cx - 1, 6, PAL.ink)
      g.px(cx + 1, 6, PAL.ink)
      g.px(cx, 7, PAL.ink)
      g.px(cx - 1, 8, PAL.ink)
      g.px(cx + 1, 8, PAL.ink)
    }
  } else {
    for (const [x, d] of [
      [4, 1],
      [12, -1],
    ]) {
      g.rect(x, 6, 2, 3, PAL.ink)
      g.px(x + (d > 0 ? 2 : -1), 7, PAL.ink)
      g.px(x + (d > 0 ? 0 : 1), 6, PAL.white)
    }
  }
  if (o.mood === 'sad') {
    g.rect(7, 11, 3, 1, PAL.ink)
    g.px(6, 12, null)
  } else {
    g.px(6, 10, PAL.ink)
    g.rect(7, 11, 3, 1, PAL.ink)
    g.px(10, 10, PAL.ink)
  }
  g.outline()
  return { g, anchor: [8.5, 7.5] }
}

function buildEgg(o) {
  const g = new Grid(11, 14)
  g.ellipse(5.5, 7.5, 4.3, 5.8, PAL.cream)
  g.shade({ [PAL.cream]: PAL.peach }, { [PAL.cream]: PAL.white })
  for (const [x, y] of [
    [4, 4],
    [7, 7],
    [4, 9],
    [6, 11],
  ])
    g.px(x, y, PAL.green)
  if (o.crack) {
    g.px(2, 6, PAL.ink)
    g.px(3, 7, PAL.ink)
    g.px(4, 6, PAL.ink)
    g.px(5, 7, PAL.ink)
    g.px(6, 6, PAL.ink)
    g.px(7, 7, PAL.ink)
    g.px(8, 6, PAL.ink)
  }
  g.outline()
  return { g, anchor: [5.5, 14] }
}

function buildLeaf() {
  const g = new Grid(12, 9)
  g.poly(
    [
      [1, 4.5],
      [6, 0.5],
      [11, 4.5],
      [6, 8.5],
    ],
    PAL.green,
  )
  g.shade({ [PAL.green]: PAL.dkgreen })
  g.line(2, 4, 9, 4, PAL.dkgreen)
  g.outline()
  return { g, anchor: [6, 4.5] }
}

function buildMoon() {
  const g = new Grid(26, 26)
  g.ellipse(13, 13, 12, 12, PAL.cream)
  g.ellipse(9, 9, 3, 3, PAL.peach)
  g.ellipse(17, 16, 2.5, 2.5, PAL.peach)
  g.ellipse(16, 7, 1.5, 1.5, PAL.peach)
  g.ellipse(8, 18, 1.5, 1.5, PAL.peach)
  g.shade({}, { [PAL.cream]: PAL.white })
  return { g, anchor: [13, 13] }
}

function buildStar(o) {
  const g = new Grid(7, 7)
  g.rect(3, 0, 1, 7, o.color)
  g.rect(0, 3, 7, 1, o.color)
  g.rect(2, 2, 3, 3, o.color)
  g.px(3, 3, PAL.white)
  return { g, anchor: [3.5, 3.5] }
}

function buildPalm(o) {
  const g = new Grid(30, 44)
  const trunk = [PAL.dkbrown, PAL.plum]
  for (let y = 43; y > 9; y--) {
    const x = Math.round(14 + Math.sin((43 - y) / 14) * 3 * o.lean)
    g.rect(x, y, 3, 1, trunk[Math.floor(y / 3) % 2])
  }
  const tx = Math.round(14 + Math.sin(34 / 14) * 3 * o.lean) + 1
  const fronds = [
    [-13, 6],
    [-10, -3],
    [-4, -7],
    [5, -7],
    [11, -3],
    [13, 6],
  ]
  for (const [dx, dy] of fronds) {
    g.line(tx, 9, tx + dx * 0.6, 9 + dy * 0.6 - 2, PAL.forest, 2)
    g.line(tx + dx * 0.6, 9 + dy * 0.6 - 2, tx + dx, 9 + dy + 2, PAL.forest, 2)
  }
  g.shade({ [PAL.forest]: PAL.pine }, { [PAL.forest]: PAL.dkgreen })
  g.rect(tx - 1, 9, 3, 2, PAL.dkbrown)
  g.outline()
  return { g, anchor: [15, 44] }
}

function buildBush() {
  const g = new Grid(34, 40)
  for (let y = 39; y > 18; y--) g.rect(15, y, 4, 1, y % 4 < 2 ? PAL.dkbrown : PAL.plum)
  g.ellipse(17, 13, 10, 8, PAL.forest)
  g.ellipse(9, 19, 7, 6, PAL.forest)
  g.ellipse(25, 19, 7, 6, PAL.forest)
  g.shade({ [PAL.forest]: PAL.pine }, { [PAL.forest]: PAL.dkgreen })
  g.px(12, 10, PAL.dkgreen)
  g.px(20, 8, PAL.dkgreen)
  g.px(26, 16, PAL.dkgreen)
  g.outline()
  return { g, anchor: [17, 40] }
}

function buildCloud() {
  const g = new Grid(36, 13)
  g.ellipse(10, 8, 8, 4.5, PAL.dkslate)
  g.ellipse(19, 6, 9, 5.5, PAL.dkslate)
  g.ellipse(28, 8, 7, 4, PAL.dkslate)
  g.rect(4, 9, 28, 3, PAL.dkslate)
  g.shade({ [PAL.dkslate]: PAL.night }, { [PAL.dkslate]: PAL.slate })
  return { g, anchor: [18, 6.5] }
}

function buildMothership(o) {
  const g = new Grid(142, 46)
  g.ellipse(71, 16, 32, 13, PAL.silver, true)
  g.ellipse(71, 25, 69, 11, PAL.steel)
  g.ellipse(71, 33, 30, 3, PAL.dkslate)
  g.shade({ [PAL.steel]: PAL.slate }, { [PAL.steel]: PAL.silver, [PAL.silver]: PAL.white })
  for (let i = 0; i < 9; i++) {
    const on = (i + o.light) % 4 === 0
    g.rect(15 + i * 14, 21, 6, 3, on ? PAL.yellow : PAL.cyan)
  }
  for (let i = 0; i < 14; i++) g.px(10 + i * 9.4, 29, (i + o.light) % 3 === 0 ? PAL.pink : PAL.purple)
  g.outline()
  return { g, anchor: [71, 25] }
}

const BUILDERS = {
  dino: (o) => buildDino(o.kind, o),
  baby: (o) => buildBaby(o.kind, o),
  ufo: buildUFO,
  alien: buildAlien,
  egg: buildEgg,
  leaf: buildLeaf,
  moon: buildMoon,
  star: buildStar,
  palm: buildPalm,
  bush: buildBush,
  cloud: buildCloud,
  mothership: buildMothership,
}

const cache = new Map()

// Returns { img, flipped, ax, ay, w, h } for a sprite, building it the first time.
export function sprite(type, o = {}) {
  const key = type + JSON.stringify(o)
  let s = cache.get(key)
  if (!s) {
    const { g, anchor } = BUILDERS[type](o)
    s = { img: g.toCanvas(false), flipped: g.toCanvas(true), ax: anchor[0], ay: anchor[1], w: g.w, h: g.h }
    cache.set(key, s)
  }
  return s
}
