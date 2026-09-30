// A tiny 3x5 pixel font, so every letter looks properly 8-bit.

const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', ',': '000000000010100',
  "'": '010010000000000', '-': '000000111000000', ':': '000010000010000', '/': '001001010100100',
  '&': '010101010101011', '+': '000010111010000', '<': '001010100010001', '>': '100010001010100',
  '(': '010100100100010', ')': '010001001001010', '*': '101010111010101',
}

export function textWidth(str, scale = 1) {
  return Math.max(0, str.length * 4 * scale - scale)
}

function glyphs(c, str, x, y, scale, color) {
  c.fillStyle = color
  for (let i = 0; i < str.length; i++) {
    const g = GLYPHS[str[i]]
    if (!g) continue
    for (let k = 0; k < 15; k++) {
      if (g[k] === '1') c.fillRect(x + i * 4 * scale + (k % 3) * scale, y + Math.floor(k / 3) * scale, scale, scale)
    }
  }
}

export function drawText(c, str, x, y, { scale = 1, color = '#f4f4f4', shadow = '#140c1c', align = 'left' } = {}) {
  str = String(str).toUpperCase()
  const w = textWidth(str, scale)
  if (align === 'center') x -= Math.floor(w / 2)
  else if (align === 'right') x -= w
  x = Math.round(x)
  y = Math.round(y)
  if (shadow) glyphs(c, str, x + scale, y + scale, scale, shadow)
  glyphs(c, str, x, y, scale, color)
}
