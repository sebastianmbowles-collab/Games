// Pixel-art sprites. Each letter is one pixel; '.' is see-through.
// The characters come from art.js (made from the TADC Gang Pack); small props use the PAL colors below.

const PAL = {
  K: '#140c1c', W: '#f4f4f4', R: '#d82838', r: '#8c1c2c', B: '#2c5ce0', b: '#1c2c78',
  Y: '#f8c830', S: '#f8dcc8', P: '#f890b8', p: '#b8507c', V: '#8848c8', G: '#8c8c9c',
  w: '#c8b8e0', C: '#68d8f8', E: '#38b848', M: '#e03c9c', O: '#f88828',
}

import { ART } from './art'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export const SPR = {
  ...ART,
  star: ['...Y...', '..YYY..', 'YYYYYYY', '.YYYYY.', '..YYY..', '.YY.YY.', 'YY...YY'],
  gloink: [
    '...KKKK...',
    '..KMMMMK..',
    '.KMMMMMMK.',
    'KMWKMMWKMK',
    'KMWKMMWKMK',
    'KMMMMMMMMK',
    'KMMKKKKMMK',
    '.KMMMMMMK.',
    '..KK..KK..',
  ],
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
      c.fillStyle = mode === 'white' ? (col === '#140c1c' ? '#140c1c' : '#ffffff') : mode === 'shadow' ? '#140c1c' : col
      c.fillRect(x, y, 1, 1)
    }
  })
  return cv
}

// mode: 'normal', 'white' (hurt flash) or 'shadow' (locked levels).
export function drawSprite(c, rows, x, y, { scale = 1, flip = false, mode = 'normal', alpha = 1 } = {}) {
  let entry = cache.get(rows)
  if (!entry) {
    entry = {}
    cache.set(rows, entry)
  }
  if (!entry[mode]) entry[mode] = build(rows, mode)
  const img = entry[mode]
  const w = img.width * scale
  const h = img.height * scale
  c.save()
  c.globalAlpha = alpha
  if (flip) {
    c.translate(Math.round(x) + w, Math.round(y))
    c.scale(-1, 1)
    c.drawImage(img, 0, 0, w, h)
  } else {
    c.drawImage(img, Math.round(x), Math.round(y), w, h)
  }
  c.restore()
}
