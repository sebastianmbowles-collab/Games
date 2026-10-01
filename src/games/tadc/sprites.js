// Pixel-art sprites. Each letter is one pixel; '.' is see-through.
// The characters come from art.js (made from the TADC Gang Pack). Props use the PAL colors below.

import { ART } from './art'

const PAL = {
  K: '#140c1c', W: '#f4f4f4', R: '#d82838', r: '#8c1c2c', B: '#2c5ce0', b: '#1c2c78',
  Y: '#f8c830', S: '#f8dcc8', P: '#f890b8', p: '#b8507c', V: '#8848c8', G: '#8c8c9c',
  w: '#c8b8e0', C: '#68d8f8', E: '#38b848', M: '#e03c9c', O: '#f88828', D: '#5c4c78',
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

// Adds a dark outline around a hand-drawn prop so it pops like the characters do.
function outlined(rows) {
  const h = rows.length + 2
  const w = rows[0].length + 2
  const at = (x, y) => (rows[y - 1] && rows[y - 1][x - 1]) || '.'
  const out = []
  for (let y = 0; y < h; y++) {
    let line = ''
    for (let x = 0; x < w; x++) {
      const ch = at(x, y)
      if (ch !== '.') line += ch
      else if (at(x + 1, y) !== '.' || at(x - 1, y) !== '.' || at(x, y + 1) !== '.' || at(x, y - 1) !== '.') line += 'K'
      else line += '.'
    }
    out.push(line)
  }
  return out
}

const PILLOW = [
  'Y..................Y',
  '.WWWWWWWWWWWWWWWWWW.',
  'WWWWWWWWWWWWWWWWWWWW',
  'WWwwWWWWWWWWWWWWwwWW',
  'WWWWWWWWWWWWWWWWWWWW',
  'wWWWWWWWWWWWWWWWWWWw',
  'wwWWWWWWWWWWWWWWWWww',
  '.wwwwwwwwwwwwwwwwww.',
  'Y..................Y',
]

export const SPR = {
  ...ART,
  star: ['...Y...', '..YYY..', 'YYYYYYY', '.YYYYY.', '..YYY..', '.YY.YY.', 'YY...YY'],
  cushion: outlined([
    '....pppppp....',
    '..pPPPPPPPPp..',
    '.pPPWWPPPPPPp.',
    'pPPPWPPPPPPPPp',
    'pPPPPPPPPPPPPp',
    '.ppPPPPPPPPpp.',
    '...pppppppp.pp',
  ]),
  cushionFlat: outlined(['...pppppppp...', 'ppPPPPPPPPPPpp', 'pppppppppppppp']),
  button1: outlined(['..CBB..', '.CBBBB.', 'BBKBKBB', 'BBBBBBB', 'BBKBKBB', '.BBBBb.', '..Bbb..']),
  button2: outlined(['..CBB..', '.CBBBB.', 'BBBKBBB', 'BBKBKBB', 'BBBKBBB', '.BBBBb.', '..Bbb..']),
  pillow: outlined(PILLOW),
  pillowBouncy: outlined(PILLOW.map((r) => r.replace(/W/g, 'P').replace(/w/g, 'p').replace(/Y/g, 'W'))),
  sweat: ['.C.', 'CCC', 'CWC', '.C.'],
  bigCushion: outlined([
    '..pPPPp..',
    '.PPWPPPP.',
    'pPPPPPPPp',
    '.ppPPPpp.',
    '.....p...',
  ]),
}

const cache = new Map()

function build(rows, mode) {
  const cv = document.createElement('canvas')
  cv.width = rows[0].length
  cv.height = rows.length
  const c = cv.getContext('2d')
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const col = rows.pal ? rows.pal[CHARS.indexOf(ch)] : PAL[ch]
      if (mode === 'white') c.fillStyle = col === '#140c1c' ? '#140c1c' : '#ffffff'
      else if (mode === 'shadow') c.fillStyle = '#140c1c'
      else if (mode === 'glitch') c.fillStyle = (x + y) % 3 === 0 ? '#e03c9c' : (x * y) % 5 === 0 ? '#68d8f8' : col
      else c.fillStyle = col
      c.fillRect(x, y, 1, 1)
    }
  })
  return cv
}

// mode: 'normal', 'white' (flash), 'shadow' (silhouette) or 'glitch' (distorted colors).
// look: where the pupils point. Either a point on screen { x, y } (they stare at it) or [dx, dy] from -1 to 1.
export function drawSprite(c, rows, x, y, { scale = 1, sy = 1, flip = false, mode = 'normal', alpha = 1, rot = 0, look = null } = {}) {
  let entry = cache.get(rows)
  if (!entry) {
    entry = {}
    cache.set(rows, entry)
  }
  if (!entry[mode]) entry[mode] = build(rows, mode)
  const img = entry[mode]
  const w = img.width * scale
  const h = img.height * scale * sy
  c.save()
  c.globalAlpha *= alpha
  if (rot) {
    c.translate(Math.round(x + w / 2), Math.round(y + h / 2))
    c.rotate(rot)
    if (flip) c.scale(-1, 1)
    c.drawImage(img, -w / 2, -h / 2, w, h)
  } else if (flip) {
    c.translate(Math.round(x) + w, Math.round(y))
    c.scale(-1, 1)
    c.drawImage(img, 0, 0, w, h)
  } else {
    c.drawImage(img, Math.round(x), Math.round(y), w, h)
  }
  c.restore()
  if (rows.eyes && rows.eyes.length && mode !== 'shadow' && !rot) {
    c.save()
    c.globalAlpha *= alpha
    drawPupils(c, rows, Math.round(x), Math.round(y), w, scale, sy, flip, mode, look)
    c.restore()
  }
}

// The pupils are drawn on top of the sprite, nudged towards whatever the character is looking at.
function drawPupils(c, rows, x, y, w, scale, sy, flip, mode, look) {
  for (const [ex, ey, ew, eh, col, rx, ry] of rows.eyes) {
    const cx = x + (flip ? w - ex * scale : ex * scale)
    const cy = y + ey * scale * sy
    let ux = 0
    let uy = 0
    if (look && look.x !== undefined) {
      const dx = look.x - cx
      const dy = look.y - cy
      const d = Math.hypot(dx, dy) || 1
      ux = dx / d
      uy = dy / d
    } else if (Array.isArray(look)) {
      ;[ux, uy] = look
    }
    c.fillStyle = mode === 'white' || mode === 'glitch' ? '#140c1c' : col
    c.fillRect(Math.round(cx + ux * rx * scale - (ew * scale) / 2), Math.round(cy + uy * ry * scale - (eh * scale * sy) / 2), ew * scale, Math.max(1, Math.round(eh * scale * sy)))
  }
}
