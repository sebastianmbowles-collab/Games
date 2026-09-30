// Pixel-art sprites. Each letter is one pixel; '.' is see-through. PAL says what color each letter is.

const PAL = {
  K: '#140c1c', W: '#f4f4f4', R: '#d82838', r: '#8c1c2c', B: '#2c5ce0', b: '#1c2c78',
  Y: '#f8c830', S: '#f8dcc8', P: '#f890b8', p: '#b8507c', V: '#8848c8', G: '#8c8c9c',
  w: '#c8b8e0', C: '#68d8f8', E: '#38b848', M: '#e03c9c', O: '#f88828',
}

const POMNI_HEAD = [
  'Y............Y',
  'RR..........BB',
  '.RR........BB.',
  '.KRRR....BBBK.',
  '..KRRRRBBBBK..',
  '..KSSSSSSSSK..',
  '.KSSSSSSSSSSK.',
  '.KSWWSSSSWWSK.',
  '.KSWKSSSSWKSK.',
  '.KSWKSSSSWKSK.',
  '.KSSSSKKSSSSK.',
  '..KSSSSSSSSK..',
  '...KKKKKKKK...',
]
const POMNI_TOP = ['..WWWWWWWWWW..', '.WKBBBBRRRRKW.', '..KBBYBRYRRK..', '..KBBBBRRRRK..']

export const SPR = {
  pomniIdle: [...POMNI_HEAD, ...POMNI_TOP, '...RRR..BBB...', '...RRR..BBB...', '...RRR..BBB...', '..KKKK..KKKK..'],
  pomniRun1: [...POMNI_HEAD, ...POMNI_TOP, '...RRR..BBB...', '..RRR....BBB..', '.RRR......BBB.', 'KKKK......KKKK'],
  pomniRun2: [...POMNI_HEAD, ...POMNI_TOP, '....RRRBBB....', '....RRRBBB....', '.....RRBB.....', '....KKKKKK....'],
  pomniJump: [
    ...POMNI_HEAD,
    'W.WWWWWWWWWW.W',
    'WKKBBBBRRRRKKW',
    '..KBBYBRYRRK..',
    '..KBBBBRRRRK..',
    '...RRR..BBB...',
    '..RRR....BBB..',
    '..KKK....KKK..',
    '..............',
  ],
  jax: [
    '...VV......VV...',
    '...VPV....VPV...',
    '...VPV....VPV...',
    '...VPV....VPV...',
    '...VPV....VPV...',
    '...VVV....VVV...',
    '..VVVVVVVVVVVV..',
    '.VVVVVVVVVVVVVV.',
    '.VVKKKVVVVKKKVV.',
    '.VVWKWVVVVWKWVV.',
    '.VVVVVVVVVVVVVV.',
    '.VVVVVVPPVVVVVV.',
    '.VVKKKKKKKKKKVV.',
    '.VVKYYYYYYYYKVV.',
    '..VVKKKKKKKKVV..',
    '...VVVVVVVVVV...',
    '..VVVVVVVVVVVV..',
    '.VVbbbbbbbbbbVV.',
    '.VVbYbbbbbbYbVV.',
    'VV.bbbbbbbbbb.VV',
    'VV.bbbbbbbbbb.VV',
    'VV.bbbbbbbbbb.VV',
    '...bbbbbbbbbb...',
    '...bbbb..bbbb...',
    '...bbbb..bbbb...',
    '...VVVV..VVVV...',
    '..VVVVV..VVVVV..',
  ],
  ragatha: [
    '...RRRRRRRRRR...',
    '..RRrRRRRRrRRR..',
    '.RRRSSSSSSSSRRR.',
    '.RRSSSSSSSSSSRR.',
    '.RRSKKSSSSCCSRR.',
    '.RRSKKSSSSCCSRR.',
    'RRRSSSSSSSSSSRRR',
    'RR.SSPSSSSPSS.RR',
    'RR.SSSKKKKSSS.RR',
    'RR..SSSSSSSS..RR',
    'R....SSSSSS....R',
    '....BBBBBBBB....',
    '...BBWWWWWWBB...',
    '..SBBWWWWWWBBS..',
    '..SBBWWWWWWBBS..',
    '..SBBBWWWWBBBS..',
    '...BBBBBBBBBB...',
    '..BBBBBBBBBBBB..',
    '..BBBBBBBBBBBB..',
    '.BBBBBBBBBBBBBB.',
    '....SS....SS....',
    '....SS....SS....',
    '...KKK....KKK...',
  ],
  gangle: [
    '....KKKKKKKK....',
    '...KWWWWWWWWK...',
    '..KWWWWWWWWWWK..',
    '..KWWKWWWWKWWK..',
    '..KWKWKWWKWKWK..',
    '..KWWWWWWWWWWK..',
    '..KWPWWWWWWPWK..',
    '..KWWKWWWWKWWK..',
    '..KWWWKKKKWWWK..',
    '...KWWWWWWWWK...',
    '....KKKKKKKK....',
    '......RRRR......',
    '.....RWWWR......',
    '......RRRRR.....',
    '.RR....RWWR...RR',
    '..RRR.RRRRR.RRR.',
    '....RRRWWWRRR...',
    '......RRRR......',
    '.....RWWR.......',
    '......RRRR......',
    '.......RWWR.....',
    '......RRRR......',
    '.....RR..RR.....',
    '....RR....RR....',
    '...RR......RR...',
  ],
  kinger: [
    '.......YY.......',
    '......YYYY......',
    '.......YY.......',
    '....Y.YYYY.Y....',
    '....YYYYYYYY....',
    '....KKKKKKKK....',
    '...KwwwwwwwwK...',
    '..KwwwwwwwwwwK..',
    '..KwWWWwwWWWwK..',
    '..KwWKWwwWKWwK..',
    '..KwWWWwwWWWwK..',
    '..KwwwwwwwwwwK..',
    '...KwwKKKKwwK...',
    '....KwwwwwwK....',
    '.....KKKKKK.....',
    '....KwwwwwwK....',
    '.....KwwwwK.....',
    '.....KwwwwK.....',
    '....KwwwwwwK....',
    '...KwwwwwwwwK...',
    '..KwwwwwwwwwwK..',
    '.KKKKKKKKKKKKKK.',
    '.KwwwwwwwwwwwwK.',
    '.KKKKKKKKKKKKKK.',
  ],
  caine: [
    '....KKKKKKKK....',
    '....KggggggK....',
    '....KggggggK....',
    '....RRRRRRRR....',
    '..KggggggggggK..',
    '...WWWW..WWWW...',
    '...WKCW..WKCW...',
    '...WWWW..WWWW...',
    '..rrrrrrrrrrrr..',
    '.rWWWWWWWWWWWWr.',
    '.rWKWKWKWKWKWWr.',
    '.rKKKKKKKKKKKKr.',
    '.rWKWKWKWKWKWWr.',
    '.rWWWWWWWWWWWWr.',
    '..rrrrrrrrrrrr..',
    '.....RRRRRR.....',
    '...RRRWYYWRRR...',
    '..RRRRWWWWRRRR..',
    '.WRRRRWWWWRRRRW.',
    '.WRRRRRYRRRRRRW.',
    '..RRRRRRRRRRRR..',
    '..RRRR.gg.RRRR..',
    '..RRR.gggg.RRR..',
    '......gg.gg.....',
    '......gg.gg.....',
    '.....KKK.KKK....',
  ],
  bubble: [
    '....CCCCCC....',
    '..CCWWWWWWCC..',
    '.CWWWWWWWWWWC.',
    '.CWWKWWWWKWWC.',
    'CWWWKWWWWKWWWC',
    'CWWWWWWWWWWWWC',
    'CWKKKKKKKKKKWC',
    'CWKWKWKWKWKKWC',
    'CWKKKKKKKKKKWC',
    'CWWKWKWKWKWKWC',
    '.CWKKKKKKKKWC.',
    '.CWWWWWWWWWWC.',
    '..CCWWWWWWCC..',
    '....CCCCCC....',
  ],
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
      c.fillStyle = mode === 'white' ? '#ffffff' : mode === 'shadow' ? '#140c1c' : PAL[ch]
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
