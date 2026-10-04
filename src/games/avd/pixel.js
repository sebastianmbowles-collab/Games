// The 8-bit look: a hand-made pixel font, plus a tiny low-resolution screen that gets blown up
// with chunky pixels and squashed down to 64 colours like an old games console.

// Each letter is 7 rows of pixels: '#' is on, '.' is off. Letters can be different widths.
const GLYPHS = {
  A: '.###. #...# #...# ##### #...# #...# #...#',
  B: '####. #...# #...# ####. #...# #...# ####.',
  C: '.###. #...# #.... #.... #.... #...# .###.',
  D: '####. #...# #...# #...# #...# #...# ####.',
  E: '##### #.... #.... ####. #.... #.... #####',
  F: '##### #.... #.... ####. #.... #.... #....',
  G: '.###. #...# #.... #.### #...# #...# .####',
  H: '#...# #...# #...# ##### #...# #...# #...#',
  I: '### .#. .#. .#. .#. .#. ###',
  J: '..### ...#. ...#. ...#. ...#. #..#. .##..',
  K: '#...# #..#. #.#.. ##... #.#.. #..#. #...#',
  L: '#.... #.... #.... #.... #.... #.... #####',
  M: '#...# ##.## #.#.# #.#.# #...# #...# #...#',
  N: '#...# #...# ##..# #.#.# #..## #...# #...#',
  O: '.###. #...# #...# #...# #...# #...# .###.',
  P: '####. #...# #...# ####. #.... #.... #....',
  Q: '.###. #...# #...# #...# #.#.# #..#. .##.#',
  R: '####. #...# #...# ####. #.#.. #..#. #...#',
  S: '.#### #.... #.... .###. ....# ....# ####.',
  T: '##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..',
  U: '#...# #...# #...# #...# #...# #...# .###.',
  V: '#...# #...# #...# #...# #...# .#.#. ..#..',
  W: '#...# #...# #...# #.#.# #.#.# #.#.# .#.#.',
  X: '#...# #...# .#.#. ..#.. .#.#. #...# #...#',
  Y: '#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..',
  Z: '##### ....# ...#. ..#.. .#... #.... #####',
  0: '.###. #...# #..## #.#.# ##..# #...# .###.',
  1: '.#. ##. .#. .#. .#. .#. ###',
  2: '.###. #...# ....# ...#. ..#.. .#... #####',
  3: '####. ....# ....# .###. ....# ....# ####.',
  4: '...#. ..##. .#.#. #..#. ##### ...#. ...#.',
  5: '##### #.... ####. ....# ....# #...# .###.',
  6: '.###. #.... #.... ####. #...# #...# .###.',
  7: '##### ....# ...#. ..#.. .#... .#... .#...',
  8: '.###. #...# #...# .###. #...# #...# .###.',
  9: '.###. #...# #...# .#### ....# ....# .###.',
  ' ': '... ... ... ... ... ... ...',
  '.': '. . . . . . #',
  ',': '.. .. .. .. .. .# #.',
  '!': '# # # # # . #',
  '?': '.###. #...# ....# ...#. ..#.. ..... ..#..',
  "'": '# # . . . . .',
  ':': '. # . . . # .',
  '-': '... ... ... ### ... ... ...',
  '+': '..... ..#.. ..#.. ##### ..#.. ..#.. .....',
  '=': '... ... ### ... ### ... ...',
  '/': '....# ...#. ...#. ..#.. .#... .#... #....',
  '(': '.# #. #. #. #. #. .#',
  ')': '#. .# .# .# .# .# #.',
  '%': '##..# ##.#. ...#. ..#.. .#... .#.## #..##',
  '·': '. . . # . . .',
  '★': '...#... ...#... ####### .#####. ..###.. .##.##. ##...##',
  '❤': '.##.##. ####### ####### ####### .#####. ..###.. ...#...',
  '♪': '..##. ..#.# ..#.. ..#.. ###.. ###.. .#...',
  '♫': '.#### .#..# .#..# .#..# ##.## ##.## .....',
  '▶': '#.... ##... ###.. ####. ###.. ##... #....',
  '◀': '....# ...## ..### .#### ..### ...## ....#',
  '▸': '... #.. ##. ### ##. #.. ...',
  '■': '..... ##### ##### ##### ##### ##### .....',
  '⚙': '.#.#.#. ####### .##.##. ###.### .##.##. ####### .#.#.#.',
  '←': '....... ..#.... .#..... ####### .#..... ..#.... .......',
  '→': '....... ....#.. .....#. ####### .....#. ....#.. .......',
  '↑': '..#.. .###. #.#.# ..#.. ..#.. ..#.. ..#..',
  '↓': '..#.. ..#.. ..#.. ..#.. #.#.# .###. ..#..',
  '🛸': '....... ..###.. .#####. ####### .#.#.#. ..#.#.. .......',
  '👽': '.#####. ####### #..#..# #..#..# ####### .#####. ..###..',
  '🦖': '...#### ...#.## ...#### #..###. #####.. .####.. .#..#..',
  '🌋': '...#... ..#.#.. ..###.. .#####. .#####. ####### #######',
  '🌙': '..###.. .##.... ##..... ##..... ##..... .##.... ..###..',
  '🏆': '####### ####### .#####. ..###.. ...#... ..###.. .#####.',
}
const ALIASES = { '—': '-', '…': '.', '–': '-' }
const FONT = {}
for (const [ch, rows] of Object.entries(GLYPHS)) FONT[ch] = rows.split(' ')

const INK = [29, 22, 48]
const cache = new Map()

function glyphsOf(str) {
  return Array.from(str.toUpperCase()).map((c) => FONT[ALIASES[c] || c] || FONT[' '])
}

// Draws a word once into a tiny canvas (1 canvas pixel per font pixel), with a dark outline.
function stamp(str, color, outline) {
  const key = `${str}|${color}|${outline}`
  let c = cache.get(key)
  if (c) return c
  const gl = glyphsOf(str)
  const w = gl.reduce((s, g) => s + g[0].length + 1, 0) - 1
  const pad = 1
  c = document.createElement('canvas')
  c.width = Math.max(1, w + pad * 2)
  c.height = 7 + pad * 2
  const x = c.getContext('2d')
  const img = x.createImageData(c.width, c.height)
  const on = new Uint8Array(c.width * c.height)
  let cx = pad
  for (const g of gl) {
    for (let r = 0; r < 7; r++) for (let k = 0; k < g[r].length; k++) if (g[r][k] === '#') on[(r + pad) * c.width + cx + k] = 1
    cx += g[0].length + 1
  }
  const rgb = parseColor(color)
  for (let i = 0; i < on.length; i++) {
    const px = i % c.width
    const py = Math.floor(i / c.width)
    let paint = null
    if (on[i]) paint = rgb
    else if (outline) {
      for (let dy = -1; dy <= 1 && !paint; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx
          const ny = py + dy
          if (nx >= 0 && ny >= 0 && nx < c.width && ny < c.height && on[ny * c.width + nx]) {
            paint = INK
            break
          }
        }
    }
    if (paint) {
      img.data.set([paint[0], paint[1], paint[2], paint[3] ?? 255], i * 4)
    }
  }
  x.putImageData(img, 0, 0)
  if (cache.size > 400) cache.clear()
  cache.set(key, c)
  return c
}

const colorCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
function parseColor(color) {
  colorCtx.fillStyle = '#000'
  colorCtx.fillStyle = color
  const v = colorCtx.fillStyle
  if (v.startsWith('#')) return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 255]
  const m = v.match(/[\d.]+/g).map(Number)
  return [m[0], m[1], m[2], Math.round((m[3] ?? 1) * 255)]
}

// Text is collected while the frame is drawn, then painted crisp on top of the chunky pixels,
// so even small words stay readable.
const queue = []

export function text(ctx, str, x, y, size, color, align = 'center', outline = true) {
  if (!str) return
  queue.push({ T: ctx.getTransform(), a: ctx.globalAlpha, str: String(str), x, y, size, color, align, outline })
}

export function flushText(ctx, k) {
  ctx.imageSmoothingEnabled = false
  for (const q of queue) {
    const c = stamp(q.str, q.color, q.outline)
    const p = Math.max(1, Math.round((q.size / 10) * 2) / 2)
    const w = (c.width - 2) * p
    const x0 = q.align === 'center' ? q.x - w / 2 : q.align === 'right' ? q.x - w : q.x
    const T = q.T
    ctx.setTransform(T.a * k, T.b * k, T.c * k, T.d * k, T.e * k, T.f * k)
    ctx.globalAlpha = q.a
    ctx.drawImage(c, x0 - p, q.y - 8 * p, c.width * p, c.height * p)
  }
  ctx.globalAlpha = 1
  queue.length = 0
}

// ---------- the low-resolution screen ----------

export const PX = 3 // every chunky pixel is 3x3 normal pixels
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47)

// Squash every colour into real "8-bit colour": 3 bits of red, 3 of green and 2 of blue, which makes
// 256 colours in total. A checkerboard "dither" turns smooth skies into retro dotty patterns.
const LEVELS = [7, 7, 3]

export function retroColors(lctx, w, h) {
  const img = lctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const t = BAYER[(y & 3) * 4 + (x & 3)] * 0.55
      for (let c = 0; c < 3; c++) {
        const n = LEVELS[c]
        const v = Math.round((d[i + c] / 255) * n + t)
        d[i + c] = Math.round(((v < 0 ? 0 : v > n ? n : v) * 255) / n)
      }
    }
  }
  lctx.putImageData(img, 0, 0)
}
