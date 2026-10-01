// Front-facing TADC characters drawn with simple shapes, in "output pixel" units.
// (0, 0) is between the feet; up is negative y. gen.mjs renders these big, then shrinks them to 8-bit pixels.
// Each figure returns its eyes, so the game can draw pupils that look at Pomni.

const K = '#140c1c'
const TAU = Math.PI * 2

function ell(c, x, y, rx, ry, fill, { rot = 0, ol = 0.9 } = {}) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, rot, 0, TAU)
  if (ol) {
    c.lineWidth = ol
    c.strokeStyle = K
    c.stroke()
  }
  c.fillStyle = fill
  c.fill()
}

function poly(c, pts, fill, ol = 0.9) {
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
  if (ol) {
    c.lineWidth = ol
    c.strokeStyle = K
    c.lineJoin = 'round'
    c.stroke()
  }
  c.fillStyle = fill
  c.fill()
}

// A limb: a dark line with a coloured line on top, so it has an outline.
function limb(c, pts, w, color, ol = 0.9) {
  c.lineCap = 'round'
  c.lineJoin = 'round'
  const path = () => {
    c.beginPath()
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  }
  if (ol) {
    path()
    c.lineWidth = w + ol * 2
    c.strokeStyle = K
    c.stroke()
  }
  path()
  c.lineWidth = w
  c.strokeStyle = color
  c.stroke()
}

function curve(c, x0, y0, cx, cy, x1, y1, w, color, ol = 0.9) {
  c.lineCap = 'round'
  const path = () => {
    c.beginPath()
    c.moveTo(x0, y0)
    c.quadraticCurveTo(cx, cy, x1, y1)
  }
  if (ol) {
    path()
    c.lineWidth = w + ol * 2
    c.strokeStyle = K
    c.stroke()
  }
  path()
  c.lineWidth = w
  c.strokeStyle = color
  c.stroke()
}

function line(c, x0, y0, x1, y1, w = 0.8, color = K) {
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(x0, y0)
  c.lineTo(x1, y1)
  c.lineWidth = w
  c.strokeStyle = color
  c.stroke()
}

const pol = (x, y, ang, len) => [x + Math.sin(ang) * len, y + Math.cos(ang) * len]

// ---------- Pomni ----------
// pose: { legL, legR (radians from straight down), armL, armR (hand positions), look: [dx, dy], face: 'worry'|'scared' }
export function pomni(c, p = {}) {
  const pink = '#f2407e'
  const blue = '#3f8ff0'
  const yel = '#f8c830'
  const legL = p.legL ?? 0
  const legR = p.legR ?? 0
  const hipL = [-2.6, -11.2]
  const hipR = [2.6, -11.2]
  const footL = pol(...hipL, legL, 7.4)
  const footR = pol(...hipR, legR, 7.4)

  // Thin white legs and pointy two-tone shoes with yellow pompoms.
  limb(c, [hipL, footL], 1.1, '#f4f4f4', 0.5)
  limb(c, [hipR, footR], 1.1, '#f4f4f4', 0.5)
  const shoe = (f, dir, col) => {
    poly(c, [[f[0] - dir * 1.2, f[1] - 0.6], [f[0] + dir * 6, f[1] + 0.2], [f[0] + dir * 5, f[1] + 2.2], [f[0] - dir * 1.6, f[1] + 2.2]], col, 0.6)
    ell(c, f[0] + dir * 6.2, f[1] - 0.4, 1.4, 1.4, yel, { ol: 0.6 })
    ell(c, f[0], f[1] - 0.4, 1.3, 0.9, yel, { ol: 0.5 })
  }
  shoe(footL, -1, blue)
  shoe(footR, 1, pink)

  // Puffy two-tone shorts.
  for (const [x, a, b2] of [[-2.9, blue, pink], [2.9, pink, blue]]) {
    ell(c, x, -14.2, 3.4, 3.1, a, { ol: 0.6 })
    c.save()
    c.beginPath()
    c.ellipse(x, -14.2, 3.4, 3.1, 0, 0, TAU)
    c.clip()
    c.fillStyle = b2
    c.fillRect(x - 0.9, -18, 1.8, 7.6)
    c.restore()
    ell(c, x, -11.3, 1.6, 0.6, yel, { ol: 0.4 })
  }

  // Arms (skinny white), gloves, body with buttons and puffy shoulders.
  const sh = [[-3.2, -21], [3.2, -21]]
  const hands = [p.armL ?? [-6.8, -14.4], p.armR ?? [6.8, -14.4]]
  ;[0, 1].forEach((i) => {
    limb(c, [sh[i], hands[i]], 0.9, '#f4f4f4', 0.5)
    ell(c, hands[i][0], hands[i][1], 1.5, 1.8, i === 0 ? pink : blue, { ol: 0.6 })
  })
  poly(c, [[-2.8, -23], [2.8, -23], [2.5, -16.8], [-2.5, -16.8]], pink, 0.6)
  c.fillStyle = blue
  c.fillRect(0, -22.9, 2.7, 6)
  ell(c, 0, -20.8, 0.9, 0.9, yel, { ol: 0 })
  ell(c, 0, -18.4, 0.9, 0.9, yel, { ol: 0 })
  ell(c, -3.4, -22, 1.4, 1.3, pink, { ol: 0.5 })
  ell(c, 3.4, -22, 1.4, 1.3, blue, { ol: 0.5 })
  // Gold ruff collar.
  poly(c, [[-4.6, -25], [4.6, -25], [4.2, -23.2], [-4.2, -23.2]], yel, 0.6)

  // Black bob hair framing a big round face.
  ell(c, 0, -29.2, 5.5, 4.4, K, { ol: 0 })
  ell(c, 0, -29.4, 4.5, 4.2, '#f6f6f6', { ol: 0 })
  poly(c, [[-4.4, -32.6], [4.4, -32.6], [3.6, -31.2], [1, -31.8], [-1, -31.2], [-3.6, -31.8]], K, 0)
  // Huge worried eyes.
  // (The pupils are drawn by the game, so Pomni can watch whatever is most dangerous.)
  for (const ex of [-1.7, 1.7]) ell(c, ex, -29.3, 1.5, 2, '#ffffff', { ol: 0.6 })
  if (p.face === 'scared') ell(c, 0, -26.2, 0.8, 0.9, K, { ol: 0 })
  else line(c, -0.7, -26.1, 0.7, -26.1, 0.55)

  // Jester hat: gold band, two-tone top, floppy horns with bells.
  poly(c, [[-4.6, -33.6], [4.6, -33.6], [4.2, -32.4], [-4.2, -32.4]], yel, 0.5)
  ell(c, -2.2, -35.6, 2.7, 2.1, blue, { ol: 0.6 })
  ell(c, 2.2, -35.6, 2.7, 2.1, pink, { ol: 0.6 })
  const horn = (dir) => {
    curve(c, dir * 3.6, -35.6, dir * 9.6, -37, dir * 9.8, -30.2, 2.2, dir < 0 ? pink : blue, 0.6)
    ell(c, dir * 9.8, -29.4, 1.35, 1.35, yel, { ol: 0.6 })
  }
  horn(-1)
  horn(1)
  const small = p.face === 'scared'
  return [-1.7, 1.7].map((ex) => ({ x: ex, y: -29.2, w: small ? 0.8 : 1.2, h: small ? 0.8 : 1.6, color: pink, rx: 0.7, ry: 0.7 }))
}

// ---------- Ragatha ----------
export function ragatha(c, p = {}) {
  const blue = '#4a74f0'
  const skin = '#f8cfc4'
  const red = '#f23d4f'
  // Shoes and stitched legs.
  ell(c, -3.8, -1.2, 3, 1.4, K)
  ell(c, 3.8, -1.2, 3, 1.4, K)
  limb(c, [[-3.4, -9], [-3.6, -2.4]], 2.4, skin)
  limb(c, [[3.4, -9], [3.6, -2.4]], 2.4, skin)
  // Skirt with a lace hem and patches.
  poly(c, [[-5.5, -30], [5.5, -30], [12.5, -10], [12, -8.5], [-12, -8.5], [-12.5, -10]], blue)
  for (let x = -11; x <= 11; x += 2.2) ell(c, x, -8.2, 1.2, 0.9, '#f4f4f4', { ol: 0.5 })
  poly(c, [[-9.5, -23], [-6.6, -23.6], [-6, -17.5], [-8.9, -17]], '#3048c8', 0.6)
  poly(c, [[4.8, -16], [9, -16.4], [9.3, -12.6], [5, -12.3]], '#7aa2f8', 0.6)
  // Arms: chunky, with big round hands.
  const handL = p.armL ?? [-10.5, -19]
  const handR = p.armR ?? [10.5, -19]
  limb(c, [[-6.5, -33], handL], 2.6, skin)
  limb(c, [[6.5, -33], handR], 2.6, skin)
  ell(c, handL[0], handL[1], 2, 2.6, skin)
  ell(c, handR[0], handR[1], 2, 2.6, skin)
  // Bodice, belt, heart, puffy sleeves, collar.
  poly(c, [[-5, -38.5], [5, -38.5], [5.3, -30.5], [-5.3, -30.5]], blue)
  poly(c, [[-5.6, -31.2], [5.6, -31.2], [5.6, -29.6], [-5.6, -29.6]], '#3a5ad8', 0.6)
  ell(c, 1.6, -35.4, 0.8, 0.8, red, { ol: 0.4 })
  ell(c, 2.8, -35.4, 0.8, 0.8, red, { ol: 0.4 })
  poly(c, [[1, -35.2], [3.4, -35.2], [2.2, -33.4]], red, 0.4)
  ell(c, -6.2, -36.7, 2.4, 2.1, blue)
  ell(c, 6.2, -36.7, 2.4, 2.1, blue)
  ell(c, -6.8, -34.6, 1.6, 0.7, '#f4f4f4', { ol: 0.5 })
  ell(c, 6.8, -34.6, 1.6, 0.7, '#f4f4f4', { ol: 0.5 })
  poly(c, [[-1.4, -39.6], [1.4, -39.6], [0, -38.2]], '#f4f4f4', 0.5)
  // Big curly red hair behind the head.
  const curls = [[-9, -42], [9, -42], [-10, -46.5], [10, -46.5], [-8, -51], [8, -51], [-4, -54], [4, -54], [0, -55], [-7, -39], [7, -39]]
  for (const [x, y] of curls) ell(c, x, y, 3.6, 3.3, red)
  ell(c, 0, -48, 9, 6.5, red, { ol: 0 })
  for (const [x, y] of curls) line(c, x * 0.75, y + 1.5, x, y - 1.2, 0.5, '#a8202c')
  // Face.
  ell(c, 0, -44.8, 5.4, 4.8, skin)
  poly(c, [[-5.2, -48.4], [5.2, -48.4], [4.8, -46.8], [3, -47.6], [1.2, -46.6], [-1, -47.6], [-3, -46.6], [-4.8, -47.4]], red, 0.6)
  // Button eye with an X, a normal eye, nose, smile and blush.
  ell(c, -2.3, -45, 1.8, 1.8, '#3a5ae0')
  line(c, -3.2, -45.9, -1.4, -44.1, 0.5)
  line(c, -3.2, -44.1, -1.4, -45.9, 0.5)
  ell(c, 2.4, -45, 1.3, 1.6, '#ffffff', { ol: 0.6 })
  line(c, 3.5, -46.3, 4.2, -46.8, 0.5)
  poly(c, [[-0.5, -43.6], [0.5, -43.6], [0, -42.8]], '#e85060', 0)
  c.beginPath()
  c.arc(0, -43.6, 2.4, 0.3, Math.PI - 0.3)
  c.lineWidth = 0.6
  c.strokeStyle = K
  c.stroke()
  ell(c, 4, -43.3, 0.8, 0.5, '#f890a8', { ol: 0 })
  // Blue bow.
  ell(c, -3.4, -57.2, 2.8, 2.4, '#4a74f0', { rot: -0.4 })
  ell(c, 3.4, -57.2, 2.8, 2.4, '#4a74f0', { rot: 0.4 })
  ell(c, 0, -56.4, 1.2, 1.1, '#3a5ad8')
  return [{ x: 2.4, y: -44.8, w: 1, h: 1.5, color: K, rx: 1, ry: 0.6 }]
}

// ---------- Jax ----------
export function jax(c, p = {}) {
  const lav = '#a48cf4'
  const pink = '#f6a6d6'
  const glove = '#f8f2b8'
  // Big floppy shoes.
  ell(c, -6.4, -2.2, 6, 2.5, '#8a6cf0')
  ell(c, 6.4, -2.2, 6, 2.5, '#8a6cf0')
  // Long overall legs with cuffs.
  poly(c, [[-5, -38], [-0.4, -38], [-0.8, -5], [-5.2, -5]], pink)
  poly(c, [[0.4, -38], [5, -38], [5.2, -5], [0.8, -5]], pink)
  poly(c, [[-5.6, -8.4], [-0.4, -8.4], [-0.4, -4.4], [-5.6, -4.4]], '#f8c8e4', 0.7)
  poly(c, [[0.4, -8.4], [5.6, -8.4], [5.6, -4.4], [0.4, -4.4]], '#f8c8e4', 0.7)
  // Skinny lavender body, then the overall bib and straps.
  poly(c, [[-3.4, -51], [3.4, -51], [3, -38], [-3, -38]], lav)
  poly(c, [[-4.6, -46], [4.6, -46], [5, -37.5], [-5, -37.5]], pink)
  limb(c, [[-3.8, -46], [-3.2, -51]], 0.9, pink, 0.6)
  limb(c, [[3.8, -46], [3.2, -51]], 0.9, pink, 0.6)
  ell(c, -3, -45.4, 0.9, 0.9, '#f0f0c0', { ol: 0.5 })
  ell(c, 3, -45.4, 0.9, 0.9, '#f0f0c0', { ol: 0.5 })
  // Long thin arms and big cartoon gloves.
  const handL = p.armL ?? [-9.6, -26]
  const handR = p.armR ?? [9.6, -26]
  limb(c, [[-3.6, -50], handL], 1.4, lav)
  limb(c, [[3.6, -50], handR], 1.4, lav)
  for (const h of [handL, handR]) {
    ell(c, h[0], h[1] + 0.5, 2.7, 3.2, glove)
    line(c, h[0] - 1, h[1] + 1.4, h[0] - 1, h[1] + 3.3, 0.5)
    line(c, h[0] + 0.6, h[1] + 1.4, h[0] + 0.6, h[1] + 3.4, 0.5)
  }
  // Neck, head and very long ears.
  limb(c, [[0, -51], [0, -55]], 1.2, lav)
  limb(c, [[-2.6, -63], [-3.6, -73.5]], 3, lav)
  limb(c, [[2.6, -63], [3.8, -73.5]], 3, lav)
  ell(c, 0, -60, 7.4, 6.4, lav)
  // The huge yellow grin.
  poly(c, [[-4.6, -59.8], [4.6, -59.8], [4, -56], [2.6, -55], [-2.6, -55], [-4, -56]], '#f6ec88', 0.7)
  line(c, -4.2, -57.4, 4.2, -57.4, 0.45)
  for (const x of [-2.2, 0, 2.2]) line(c, x, -59.6, x, -55.2, 0.45)
  // Half-closed, smug eyes.
  for (const ex of [-2.8, 2.8]) {
    ell(c, ex, -62.4, 1.9, 1.3, '#ffffff', { ol: 0.6 })
    line(c, ex - 2, -63.3, ex + 2, -63.3, 0.8)
  }
  return [
    { x: -2.8, y: -62.1, w: 1, h: 1, color: K, rx: 1.3, ry: 0 },
    { x: 2.8, y: -62.1, w: 1, h: 1, color: K, rx: 1.3, ry: 0 },
  ]
}

// ---------- Kinger ----------
export function kinger(c, p = {}) {
  const robe = '#6a34f0'
  const fur = '#f2f0f4'
  const spot = '#7c7494'
  const tan = '#dcb898'
  // The royal robe: wide at the bottom, narrow in the middle, round shoulders.
  c.beginPath()
  c.moveTo(-12.5, -2)
  c.quadraticCurveTo(-8, -10, -8.4, -20)
  c.quadraticCurveTo(-12.6, -34, -10, -43)
  c.lineTo(10, -43)
  c.quadraticCurveTo(12.6, -34, 8.4, -20)
  c.quadraticCurveTo(8, -10, 12.5, -2)
  c.closePath()
  c.lineWidth = 0.9
  c.strokeStyle = K
  c.stroke()
  c.fillStyle = robe
  c.fill()
  // Spotty ermine trim: down the middle, round the hem and the big collar.
  poly(c, [[-1.7, -36], [1.7, -36], [2, -2], [-2, -2]], fur, 0.7)
  ell(c, -7, -2.4, 6, 2.3, fur)
  ell(c, 7, -2.4, 6, 2.3, fur)
  ell(c, -6, -40.6, 5.6, 5, fur, { rot: 0.5 })
  ell(c, 6, -40.6, 5.6, 5, fur, { rot: -0.5 })
  const spots = [[-8, -42], [-5, -39.5], [-6, -44], [7.6, -42], [5, -39.4], [6.6, -44.4], [0, -30], [0.4, -24], [-0.3, -17], [0.3, -10], [-0.2, -5], [-9, -2.6], [-5, -1.8], [8.6, -2.4], [5.2, -2]]
  for (const [x, y] of spots) ell(c, x, y, 0.8, 0.6, spot, { ol: 0 })
  // Toggles.
  for (const y of [-31, -28.4]) {
    line(c, -2, y, 2, y, 0.6, '#f0e0a0')
    ell(c, -2.1, y, 0.8, 0.6, '#f0d070', { ol: 0.4 })
    ell(c, 2.1, y, 0.8, 0.6, '#f0d070', { ol: 0.4 })
  }
  // Big white gloves.
  const handL = p.armL ?? [-9.6, -31]
  const handR = p.armR ?? [9.6, -31]
  for (const [h, d] of [[handL, -1], [handR, 1]]) {
    ell(c, h[0], h[1], 3.4, 2.8, '#ffffff')
    ell(c, h[0] - d * 2.4, h[1] - 1.8, 1.6, 1, '#ffffff', { ol: 0.6 })
  }
  // The chess-piece head with its little crown and cross.
  poly(c, [[-3, -44], [3, -44], [3, -49], [-3, -49]], tan, 0.7)
  for (const y of [-45.5, -47]) line(c, -3, y, 3, y, 0.5, '#9c7c60')
  poly(c, [[-3.2, -49], [3.2, -49], [4.4, -59.5], [-4.4, -59.5]], tan)
  poly(c, [[-4.4, -59.5], [4.4, -59.5], [4.4, -62], [3, -60.6], [1.5, -62.4], [0, -60.6], [-1.5, -62.4], [-3, -60.6], [-4.4, -62]], tan, 0.7)
  poly(c, [[-1, -62], [1, -62], [1, -64.2], [2.4, -64.2], [2.4, -65.8], [1, -65.8], [1, -67.4], [-1, -67.4], [-1, -65.8], [-2.4, -65.8], [-2.4, -64.2], [-1, -64.2]], tan, 0.7)
  // Two big googly eyes, not quite level.
  ell(c, -4.6, -56.6, 3.1, 3, '#ffffff')
  ell(c, 4.2, -51.4, 3, 2.9, '#ffffff')
  return [
    { x: -4.6, y: -56.6, w: 1.6, h: 1.6, color: '#4a8ee0', rx: 1.8, ry: 1.6 },
    { x: 4.2, y: -51.4, w: 1.6, h: 1.6, color: '#4a8ee0', rx: 1.8, ry: 1.6 },
  ]
}

// ---------- Gangle ----------
export function gangle(c, p = {}) {
  const rib = '#f2346a'
  // Long ribbon legs with forked ends.
  curve(c, -2, -33, -4, -16, -5.5, -1, 1.5, rib)
  curve(c, 2, -33, 4, -16, 5.5, -1, 1.5, rib)
  for (const d of [-1, 1]) {
    limb(c, [[d * 5.5, -1], [d * 7.5, 0]], 0.7, rib, 0.5)
    limb(c, [[d * 5.5, -1], [d * 4, 0.2]], 0.7, rib, 0.5)
  }
  // Long ribbon arms.
  const handL = p.armL ?? [-11.5, -17]
  const handR = p.armR ?? [11.5, -17]
  curve(c, -4.6, -46, -9, -40, handL[0], handL[1], 1.3, rib)
  curve(c, 4.6, -46, 9, -40, handR[0], handR[1], 1.3, rib)
  // A little ribbon tail.
  curve(c, -2, -34, -6, -33, -7, -37, 0.9, rib)
  // The coiled ribbon body.
  const bands = [[-46.4, 5], [-43.4, 5.2], [-40.4, 5], [-37.5, 4.6], [-34.8, 4]]
  for (const [y, rx] of bands) ell(c, 0, y, rx, 1.55, rib)
  limb(c, [[0, -48], [0, -51.5]], 0.8, rib, 0.5)
  // The tragedy mask.
  c.beginPath()
  c.moveTo(-6, -64)
  c.lineTo(6, -64)
  c.lineTo(6, -56)
  c.quadraticCurveTo(6, -51, 0, -51)
  c.quadraticCurveTo(-6, -51, -6, -56)
  c.closePath()
  c.lineWidth = 0.9
  c.strokeStyle = K
  c.stroke()
  c.fillStyle = '#f8f8f8'
  c.fill()
  if (p.happy) {
    // The comedy mask: happy closed eyes and a big smile.
    for (const ex of [-2.5, 2.5]) {
      c.beginPath()
      c.arc(ex, -57.4, 1.5, Math.PI + 0.3, -0.3)
      c.lineWidth = 0.9
      c.strokeStyle = K
      c.stroke()
    }
    c.beginPath()
    c.arc(0, -55, 2.8, 0.25, Math.PI - 0.25)
    c.lineWidth = 0.8
    c.strokeStyle = K
    c.stroke()
    ell(c, -4, -55, 0.9, 0.6, '#f8a0b8', { ol: 0 })
    ell(c, 4, -55, 0.9, 0.6, '#f8a0b8', { ol: 0 })
    return []
  }
  c.beginPath()
  c.arc(0, -52.4, 2.4, Math.PI + 0.4, -0.4)
  c.lineWidth = 0.6
  c.strokeStyle = K
  c.stroke()
  ell(c, -3.4, -55.2, 0.7, 1, '#9ee8f0', { ol: 0.4 })
  ell(c, 3.4, -55.2, 0.7, 1, '#9ee8f0', { ol: 0.4 })
  return [
    { x: -2.5, y: -58.2, w: 2, h: 3, color: K, rx: 1.2, ry: 0.8 },
    { x: 2.5, y: -58.2, w: 2, h: 3, color: K, rx: 1.2, ry: 0.8 },
  ]
}

// ---------- Caine ----------
export function caine(c, p = {}) {
  const coat = '#b4102e'
  const gold = '#f0d070'
  // Curly gold-trimmed coat tails.
  curve(c, -3.5, -22, -12, -15, -8, -6, 2, coat)
  curve(c, 3.5, -22, 12, -15, 8, -6, 2, coat)
  ell(c, -9.2, -7.5, 1.6, 1.6, gold, { ol: 0.6 })
  ell(c, 9.2, -7.5, 1.6, 1.6, gold, { ol: 0.6 })
  // Black trousers and shoes.
  poly(c, [[-3, -22], [-0.3, -22], [-1, -1], [-3.4, -1]], K, 0)
  poly(c, [[0.3, -22], [3, -22], [3.4, -1], [1, -1]], K, 0)
  ell(c, -3, -0.8, 2.6, 1, K, { ol: 0 })
  ell(c, 3, -0.8, 2.6, 1, K, { ol: 0 })
  // Arms with white gloves.
  const handL = p.armL ?? [-13, -20]
  const handR = p.armR ?? [13, -20]
  limb(c, [[-7, -34], [-10.5, -27], handL], 2.6, coat)
  limb(c, [[7, -34], [10.5, -27], handR], 2.6, coat)
  for (const h of [handL, handR]) ell(c, h[0], h[1] + 0.8, 2.6, 2.2, '#ffffff')
  // The ringmaster coat, shirt front, bow tie, epaulettes.
  poly(c, [[-7.4, -36], [7.4, -36], [5.4, -24], [3.8, -20.5], [-3.8, -20.5], [-5.4, -24]], coat)
  poly(c, [[-3.4, -36], [3.4, -36], [0, -27.5]], '#f8f8f8', 0.6)
  poly(c, [[-2.2, -35], [0, -34], [-2.2, -33]], K, 0)
  poly(c, [[2.2, -35], [0, -34], [2.2, -33]], K, 0)
  ell(c, 1.6, -25.6, 0.6, 0.6, gold, { ol: 0.4 })
  for (const d of [-1, 1]) {
    poly(c, [[d * 4.6, -37.2], [d * 9.4, -37.2], [d * 9.6, -35], [d * 4.6, -35]], gold, 0.6)
    for (let k = 0; k < 4; k++) line(c, d * (5.4 + k * 1.2), -35, d * (5.4 + k * 1.2), -33.8, 0.5, gold)
  }
  // The denture head: gums, teeth, a black mouth and two big eyes inside it.
  ell(c, 0, -46.5, 8.6, 9, '#f05458')
  ell(c, 0, -46.5, 7.4, 5.2, K, { ol: 0 })
  for (let x = -6; x <= 6; x += 2) {
    ell(c, x, -52.2, 1.05, 1.3, '#ffffff', { ol: 0.4 })
    ell(c, x, -40.8, 1.05, 1.3, '#ffffff', { ol: 0.4 })
  }
  ell(c, -2.8, -46.4, 2.5, 2.6, '#ffffff', { ol: 0.6 })
  ell(c, 2.8, -45.8, 2.3, 2.4, '#ffffff', { ol: 0.6 })
  // Top hat with a red band.
  poly(c, [[-5.6, -55.6], [5.6, -55.6], [5.6, -54.4], [-5.6, -54.4]], K, 0)
  poly(c, [[-3.8, -64.5], [3.8, -64.5], [4.2, -55.6], [-4.2, -55.6]], K, 0)
  poly(c, [[-4.1, -57.6], [4.1, -57.6], [4.15, -56.2], [-4.15, -56.2]], '#c8203c', 0)
  // His cane, held up.
  if (p.cane !== false) {
    limb(c, [[handR[0] + 2, handR[1] + 1], [handR[0] + 4, handR[1] - 26]], 0.9, K, 0.4)
    ell(c, handR[0] + 4.2, handR[1] - 27.6, 1.7, 1.4, gold)
  }
  return [
    { x: -2.8, y: -46.4, w: 1.6, h: 1.6, color: '#2a4ad8', rx: 1.4, ry: 1.3 },
    { x: 2.8, y: -45.8, w: 1.6, h: 1.6, color: '#2cc070', rx: 1.3, ry: 1.2 },
  ]
}

// ---------- Bubble ----------
export function bubble(c) {
  ell(c, 0, -14, 13.4, 13, '#f2fafa')
  c.save()
  c.beginPath()
  c.ellipse(0, -14, 13.4, 13, 0, 0, TAU)
  c.clip()
  ell(c, 8, -10, 7, 11, '#d8f0f4', { ol: 0 })
  // A huge, sharp grin.
  c.beginPath()
  c.moveTo(-10.5, -15)
  c.quadraticCurveTo(0, -11, 13, -18)
  c.quadraticCurveTo(10, -3, -1, -3)
  c.quadraticCurveTo(-8, -4, -10.5, -15)
  c.closePath()
  c.fillStyle = K
  c.fill()
  for (let i = 0; i < 6; i++) {
    const x = -8 + i * 3.6
    const top = -14.4 - i * 0.6
    c.beginPath()
    c.moveTo(x - 1.6, top)
    c.lineTo(x + 1.6, top - 0.4)
    c.lineTo(x, top + 4.4)
    c.closePath()
    c.fillStyle = '#ffffff'
    c.fill()
    c.beginPath()
    c.moveTo(x - 0.2, -3.6)
    c.lineTo(x + 3, -3.8)
    c.lineTo(x + 1.4, -8)
    c.closePath()
    c.fill()
  }
  c.restore()
  return [{ x: -5.2, y: -20, w: 3, h: 3, color: K, rx: 1.6, ry: 1 }]
}

// ---------- Zooble ----------
export function zooble(c) {
  // Spring leg and long blue leg.
  for (let i = 0; i < 5; i++) ell(c, -3.6, -24 + i * 2.2, 2.2, 0.9, '#a8f0f4', { ol: 0.5 })
  curve(c, -3.6, -13, -3.8, -6, -6.5, -1, 1.1, '#f8b060')
  ell(c, -5.6, -2, 1.8, 1.6, '#f8b060')
  limb(c, [[2.6, -26], [3, -3]], 1.6, '#6240e8')
  ell(c, 5, -1.6, 4, 1.8, '#6240e8')
  // Arms: a yellow one with a glove, a zig-zag one with a red claw.
  curve(c, -5, -38, -10, -32, -9, -18, 1, '#f8b060')
  ell(c, -9, -17, 2.2, 2.4, '#f8d040')
  limb(c, [[5, -38], [8, -36], [6.4, -34], [9, -32]], 0.9, '#f2589a')
  ell(c, 9.4, -31, 1.4, 1.4, '#f8a0d0')
  limb(c, [[9.4, -31], [10.4, -22]], 1, '#f8d040')
  ell(c, 11, -19, 3, 2.6, '#f2385a')
  // Polka-dot body and a cyan shoulder ball.
  poly(c, [[-4.6, -40], [4.6, -40], [4, -26], [-4, -26]], '#f8c070')
  for (const [x, y] of [[-2, -37], [2, -33], [-1.4, -29], [2.6, -38], [-3, -31.5]]) ell(c, x, y, 0.9, 0.9, '#f2589a', { ol: 0 })
  ell(c, -5, -34, 2, 2, '#68d8f0')
  // Wing, head pieces and antennae.
  ell(c, -8, -42, 4, 2.6, '#f8b0f0', { rot: -0.3 })
  limb(c, [[0, -40], [0, -44]], 1.2, '#8a4af0')
  curve(c, -3, -50, -5, -56, -2, -60, 1, '#68e0f0')
  limb(c, [[4, -50], [5, -60]], 0.9, '#f4f4f4')
  ell(c, -3, -47, 3.6, 3, '#7a30c0')
  poly(c, [[0, -52], [9, -53], [3.6, -42.4]], '#f2348a')
  ell(c, 4.4, -49.6, 1.6, 1.4, '#ffffff', { ol: 0.5 })
  return [{ x: 4.4, y: -49.6, w: 1, h: 1, color: K, rx: 0.5, ry: 0.3 }]
}

export const FIGURES = { pomni, ragatha, jax, kinger, gangle, caine, bubble, zooble }
