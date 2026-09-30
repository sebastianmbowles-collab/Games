// Drawing helpers for the Digital Circus: the big top, the checkered floor, Jingle the jester and the Ringmaster.

export const W = 960
export const H = 600
export const FLOOR = 430
export const TAU = Math.PI * 2
export const INK = '#1d1233'
export const FONT = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", "Trebuchet MS", sans-serif'

export const rand = (a, b) => a + Math.random() * (b - a)
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

export function circle(c, x, y, r) {
  c.beginPath()
  c.arc(x, y, r, 0, TAU)
}

export function fillStroke(c, fill, stroke = INK, lw = 3) {
  c.fillStyle = fill
  c.fill()
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = lw
    c.stroke()
  }
}

export function text(c, str, x, y, { size = 24, color = '#fff', align = 'center', outline = INK, weight = 'bold' } = {}) {
  c.font = `${weight} ${size}px ${FONT}`
  c.textAlign = align
  c.textBaseline = 'middle'
  if (outline) {
    c.lineJoin = 'round'
    c.lineWidth = Math.max(3, size / 6)
    c.strokeStyle = outline
    c.strokeText(str, x, y)
  }
  c.fillStyle = color
  c.fillText(str, x, y)
}

export function wrapLines(c, str, maxW) {
  const words = str.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (c.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export function star(c, x, y, r, fill, stroke = INK) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  c.closePath()
  fillStroke(c, fill, stroke, 3)
}

export function heart(c, x, y, s, full) {
  // A chunky pixel heart, because this circus is digital.
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
  const p = s / 7
  c.fillStyle = INK
  c.fillRect(x - p, y - p, p * 9, p * 8)
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== 'X') continue
      c.fillStyle = full ? (j === 1 && i === 1 ? '#ffb3c1' : '#ff2e5b') : '#4a3a66'
      c.fillRect(x + i * p, y + j * p, p + 0.5, p + 0.5)
    }
  })
}

// ---------- The big top ----------

export function drawTent(c, t, camX = 0) {
  const g = c.createLinearGradient(0, 0, 0, FLOOR)
  g.addColorStop(0, '#1b0836')
  g.addColorStop(1, '#3d1463')
  c.fillStyle = g
  c.fillRect(0, 0, W, FLOOR)

  // Stripes fanning out from the top of the tent.
  const cx = W / 2
  const cy = -300
  const shift = (camX * 0.00025) % (Math.PI / 24)
  c.save()
  for (let i = -24; i < 24; i++) {
    const a0 = Math.PI / 2 + i * (Math.PI / 48) - shift
    const a1 = a0 + Math.PI / 48
    c.beginPath()
    c.moveTo(cx, cy)
    c.lineTo(cx + Math.cos(a0) * 1400, cy + Math.sin(a0) * 1400)
    c.lineTo(cx + Math.cos(a1) * 1400, cy + Math.sin(a1) * 1400)
    c.closePath()
    c.fillStyle = (i & 1) === 0 ? 'rgba(232, 57, 79, 0.55)' : 'rgba(250, 236, 214, 0.18)'
    c.fill()
  }
  c.restore()

  // Darken toward the floor so the ring stands out.
  const d = c.createLinearGradient(0, 120, 0, FLOOR)
  d.addColorStop(0, 'rgba(20, 5, 40, 0)')
  d.addColorStop(1, 'rgba(20, 5, 40, 0.85)')
  c.fillStyle = d
  c.fillRect(0, 0, W, FLOOR)

  // Scalloped bunting along the top.
  const off = -((camX * 0.3) % 60)
  for (let x = off - 60; x < W + 60; x += 60) {
    c.beginPath()
    c.moveTo(x, 0)
    c.lineTo(x + 60, 0)
    c.quadraticCurveTo(x + 30, 50, x, 0)
    const k = Math.round((x - off) / 60 + camX / 20) & 1
    fillStroke(c, k ? '#f2b90c' : '#2b9ce0', INK, 2)
  }

  // Swaying spotlights.
  c.save()
  c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 2; i++) {
    const sx = i ? W - 120 : 120
    const tx = W / 2 + Math.sin(t * 0.6 + i * 2) * 300
    const sg = c.createLinearGradient(sx, 0, tx, FLOOR + 80)
    sg.addColorStop(0, 'rgba(255, 250, 200, 0.22)')
    sg.addColorStop(1, 'rgba(255, 250, 200, 0.02)')
    c.fillStyle = sg
    c.beginPath()
    c.moveTo(sx - 12, 0)
    c.lineTo(sx + 12, 0)
    c.lineTo(tx + 110, FLOOR + 80)
    c.lineTo(tx - 110, FLOOR + 80)
    c.closePath()
    c.fill()
  }
  c.restore()
}

// A checkered floor that shrinks away into the distance.
export function drawFloor(c, camX = 0) {
  const vx = W / 2
  const vy = 300
  const colW = 120
  c.save()
  c.beginPath()
  c.rect(0, FLOOR, W, H - FLOOR)
  c.clip()
  c.fillStyle = '#1a0b30'
  c.fillRect(0, FLOOR, W, H - FLOOR)
  const rows = []
  for (let k = 0; k < 30; k++) {
    const f = 1 / (1 + k * 0.45)
    const y = vy + (H + 90 - vy) * f
    rows.push({ y, f })
    if (y < FLOOR) break
  }
  const j0 = Math.floor((camX - 2200) / colW)
  const j1 = Math.ceil((camX + 2200) / colW)
  for (let k = 0; k < rows.length - 1; k++) {
    const a = rows[k]
    const b = rows[k + 1]
    for (let j = j0; j < j1; j++) {
      if (((j + k) & 1) !== 0) continue
      const xa0 = vx + (j * colW - camX) * a.f
      const xa1 = vx + ((j + 1) * colW - camX) * a.f
      const xb0 = vx + (j * colW - camX) * b.f
      const xb1 = vx + ((j + 1) * colW - camX) * b.f
      if (Math.max(xa1, xb1) < 0 || Math.min(xa0, xb0) > W) continue
      c.beginPath()
      c.moveTo(xa0, a.y)
      c.lineTo(xa1, a.y)
      c.lineTo(xb1, b.y)
      c.lineTo(xb0, b.y)
      c.closePath()
      c.fillStyle = '#eadcff'
      c.fill()
    }
  }
  const shade = c.createLinearGradient(0, FLOOR, 0, FLOOR + 70)
  shade.addColorStop(0, 'rgba(20, 5, 40, 0.8)')
  shade.addColorStop(1, 'rgba(20, 5, 40, 0)')
  c.fillStyle = shade
  c.fillRect(0, FLOOR, W, 70)
  c.restore()
  c.fillStyle = '#ff5fa2'
  c.fillRect(0, FLOOR - 2, W, 4)
}

// ---------- Jingle the jester ----------

export function drawJesterHead(c, x, y, s = 1, o = {}) {
  const t = o.t || 0
  const face = o.face || 'happy'
  c.save()
  c.translate(x, y)
  c.scale(s, s)

  // Floppy two-pointed hat.
  const sway = Math.sin(t * 5) * 6
  c.beginPath()
  c.moveTo(-24, -12)
  c.quadraticCurveTo(-30, -48, -58 + sway, -34)
  c.quadraticCurveTo(-34, -30, -4, -24)
  c.closePath()
  fillStroke(c, '#e8394f')
  c.beginPath()
  c.moveTo(24, -12)
  c.quadraticCurveTo(30, -48, 58 + sway, -34)
  c.quadraticCurveTo(34, -30, 4, -24)
  c.closePath()
  fillStroke(c, '#2b6fe0')
  circle(c, -58 + sway, -34, 7)
  fillStroke(c, '#f2c40c')
  circle(c, 58 + sway, -34, 7)
  fillStroke(c, '#f2c40c')

  // Face.
  circle(c, 0, 0, 28)
  fillStroke(c, '#fff4e8')
  c.beginPath()
  c.moveTo(-26, -10)
  c.quadraticCurveTo(0, -30, 26, -10)
  c.lineTo(22, -20)
  c.quadraticCurveTo(0, -36, -22, -20)
  c.closePath()
  fillStroke(c, '#8a3ddb', INK, 2)

  // Eyes.
  const blink = (t + (o.seed || 0)) % 3.7 < 0.12
  for (const ex of [-10, 10]) {
    if (face === 'dizzy') {
      c.strokeStyle = INK
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(ex - 5, -6)
      c.lineTo(ex + 5, 4)
      c.moveTo(ex + 5, -6)
      c.lineTo(ex - 5, 4)
      c.stroke()
    } else if (blink && face !== 'shock') {
      c.strokeStyle = INK
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(ex - 6, -1)
      c.lineTo(ex + 6, -1)
      c.stroke()
    } else {
      c.beginPath()
      c.ellipse(ex, -2, 7, face === 'shock' ? 10 : 9, 0, 0, TAU)
      fillStroke(c, '#fff', INK, 2)
      const px = o.lookX || 0
      const py = o.lookY || 0
      circle(c, ex + px * 2, -1 + py * 2, face === 'shock' ? 2.5 : 4)
      c.fillStyle = INK
      c.fill()
    }
  }
  // Cheeks and mouth.
  c.fillStyle = 'rgba(255, 110, 150, 0.55)'
  circle(c, -18, 10, 5)
  c.fill()
  circle(c, 18, 10, 5)
  c.fill()
  c.strokeStyle = INK
  c.lineWidth = 3
  c.beginPath()
  if (face === 'shock') {
    c.ellipse(0, 14, 5, 7, 0, 0, TAU)
    c.fillStyle = '#7a1030'
    c.fill()
  } else if (face === 'dizzy') {
    c.moveTo(-8, 16)
    c.quadraticCurveTo(-4, 11, 0, 16)
    c.quadraticCurveTo(4, 21, 8, 16)
  } else {
    c.arc(0, 8, 9, 0.15 * Math.PI, 0.85 * Math.PI)
  }
  c.stroke()
  c.restore()
}

// Draws Jingle standing with feet at (x, y). About 150px tall at s = 1.
export function drawJester(c, x, y, s = 1, o = {}) {
  const t = o.t || 0
  const pose = o.pose || 'down'
  c.save()
  c.translate(x, y)
  c.rotate(o.tilt || 0)
  c.scale(s, s * (o.squash || 1))
  c.lineCap = 'round'
  c.lineJoin = 'round'

  // Legs.
  const walk = o.walk ? Math.sin(t * 9) * 7 : 0
  for (const [lx, col, k] of [
    [-11, '#e8394f', 1],
    [11, '#2b6fe0', -1],
  ]) {
    c.strokeStyle = INK
    c.lineWidth = 15
    c.beginPath()
    c.moveTo(lx * 0.8, -48)
    c.lineTo(lx + walk * k, -6)
    c.stroke()
    c.strokeStyle = col
    c.lineWidth = 9
    c.stroke()
    c.beginPath()
    c.moveTo(lx + walk * k - 9, -2)
    c.quadraticCurveTo(lx + walk * k + 8 * Math.sign(lx), 2, lx + walk * k + 18 * Math.sign(lx), -10)
    c.lineTo(lx + walk * k + 8 * Math.sign(lx), -9)
    c.closePath()
    fillStroke(c, '#3b2458', INK, 2)
    circle(c, lx + walk * k + 18 * Math.sign(lx), -11, 3.5)
    fillStroke(c, '#f2c40c', INK, 2)
  }

  // Arms (drawn behind the body).
  const shoulders = [
    [-22, -92, -1],
    [22, -92, 1],
  ]
  for (const [sx, sy, side] of shoulders) {
    let ang
    if (pose === 'up') ang = -Math.PI / 2 + side * (0.45 + Math.sin(t * 8 + side) * 0.2)
    else if (pose === 'out') ang = side > 0 ? 0 : Math.PI
    else if (pose === 'wave' && side > 0) ang = -0.9 + Math.sin(t * 7) * 0.45
    else ang = Math.PI / 2 - side * 0.35
    const hx = sx + Math.cos(ang) * 42
    const hy = sy + Math.sin(ang) * 42
    c.strokeStyle = INK
    c.lineWidth = 14
    c.beginPath()
    c.moveTo(sx, sy)
    c.lineTo(hx, hy)
    c.stroke()
    c.strokeStyle = side < 0 ? '#2b6fe0' : '#e8394f'
    c.lineWidth = 8
    c.stroke()
    circle(c, hx, hy, 8)
    fillStroke(c, '#ffffff', INK, 2.5)
  }

  // Body: half red, half blue, with diamond buttons.
  rrect(c, -26, -102, 52, 58, 16)
  c.save()
  c.clip()
  c.fillStyle = '#e8394f'
  c.fillRect(-26, -102, 26, 58)
  c.fillStyle = '#2b6fe0'
  c.fillRect(0, -102, 26, 58)
  c.restore()
  rrect(c, -26, -102, 52, 58, 16)
  c.strokeStyle = INK
  c.lineWidth = 3
  c.stroke()
  for (const by of [-86, -70, -56]) {
    c.beginPath()
    c.moveTo(0, by - 5)
    c.lineTo(5, by)
    c.lineTo(0, by + 5)
    c.lineTo(-5, by)
    c.closePath()
    fillStroke(c, '#f2c40c', INK, 2)
  }
  // Ruffled collar.
  for (let i = -3; i <= 3; i++) {
    circle(c, i * 8, -102, 7)
    fillStroke(c, '#ffffff', INK, 2)
  }

  if (o.pole) {
    c.strokeStyle = INK
    c.lineWidth = 7
    c.beginPath()
    c.moveTo(-120, -92)
    c.lineTo(120, -92)
    c.stroke()
    c.strokeStyle = '#f2c40c'
    c.lineWidth = 3
    c.stroke()
    circle(c, -120, -92, 9)
    fillStroke(c, '#e8394f', INK, 2.5)
    circle(c, 120, -92, 9)
    fillStroke(c, '#2b6fe0', INK, 2.5)
  }

  drawJesterHead(c, 0, -128, 1, o)
  c.restore()
}

// ---------- The Ringmaster ----------

export function drawRingmaster(c, x, y, s = 1, t = 0, talking = false) {
  c.save()
  c.translate(x, y + Math.sin(t * 2) * 6)
  c.scale(s, s)
  c.lineCap = 'round'
  c.lineJoin = 'round'

  // Floating gloves and a candy-striped cane.
  const gy = 50 + Math.sin(t * 2.6) * 5
  c.save()
  c.translate(78, gy)
  c.rotate(0.15)
  c.strokeStyle = INK
  c.lineWidth = 9
  c.beginPath()
  c.moveTo(0, -30)
  c.lineTo(0, 80)
  c.stroke()
  c.lineWidth = 5
  c.strokeStyle = '#fff'
  c.stroke()
  c.strokeStyle = '#e8394f'
  for (let k = -24; k < 80; k += 14) {
    c.beginPath()
    c.moveTo(0, k)
    c.lineTo(0, k + 6)
    c.stroke()
  }
  circle(c, 0, -34, 10)
  fillStroke(c, '#f2c40c', INK, 3)
  c.restore()
  for (const [gx, gyy] of [
    [-76, gy - 6 + Math.sin(t * 3) * 6],
    [78, gy],
  ]) {
    circle(c, gx, gyy, 15)
    fillStroke(c, '#ffffff')
    for (let f = 0; f < 3; f++) {
      circle(c, gx - 8 + f * 8, gyy - 14, 5)
      fillStroke(c, '#ffffff', INK, 2)
    }
  }

  // Bow tie.
  c.beginPath()
  c.moveTo(0, 48)
  c.lineTo(-24, 36)
  c.lineTo(-24, 60)
  c.closePath()
  fillStroke(c, '#e8394f')
  c.beginPath()
  c.moveTo(0, 48)
  c.lineTo(24, 36)
  c.lineTo(24, 60)
  c.closePath()
  fillStroke(c, '#e8394f')
  circle(c, 0, 48, 6)
  fillStroke(c, '#f2c40c', INK, 2)

  // Face.
  circle(c, 0, 0, 46)
  fillStroke(c, '#fdf6ec')
  // Eyes: one normal, one behind a gold monocle.
  const blink = t % 4.2 < 0.12
  for (const ex of [-17, 17]) {
    if (blink) {
      c.strokeStyle = INK
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(ex - 7, -8)
      c.lineTo(ex + 7, -8)
      c.stroke()
    } else {
      c.beginPath()
      c.ellipse(ex, -8, 8, 11, 0, 0, TAU)
      fillStroke(c, '#fff', INK, 2)
      circle(c, ex + Math.sin(t) * 2, -7, 4.5)
      c.fillStyle = INK
      c.fill()
    }
  }
  circle(c, 17, -8, 14)
  c.strokeStyle = '#f2b90c'
  c.lineWidth = 4
  c.stroke()
  c.beginPath()
  c.moveTo(29, -2)
  c.quadraticCurveTo(36, 20, 30, 40)
  c.strokeStyle = '#f2b90c'
  c.lineWidth = 2
  c.stroke()

  // Mouth (opens and shuts while talking) and a very curly moustache.
  const open = talking ? Math.abs(Math.sin(t * 14)) * 10 : 2
  c.beginPath()
  c.ellipse(0, 24, 14, 3 + open, 0, 0, TAU)
  fillStroke(c, '#7a1030', INK, 2.5)
  c.beginPath()
  c.moveTo(0, 12)
  c.bezierCurveTo(-14, 2, -30, 6, -38, 14)
  c.bezierCurveTo(-44, 20, -40, 4, -32, 4)
  c.bezierCurveTo(-18, -2, -6, 4, 0, 8)
  c.bezierCurveTo(6, 4, 18, -2, 32, 4)
  c.bezierCurveTo(40, 4, 44, 20, 38, 14)
  c.bezierCurveTo(30, 6, 14, 2, 0, 12)
  c.closePath()
  fillStroke(c, '#4a2412', INK, 2)

  // Tall top hat, tipped to one side.
  c.save()
  c.translate(0, -40)
  c.rotate(-0.12 + Math.sin(t * 1.3) * 0.04)
  c.beginPath()
  c.ellipse(0, 0, 62, 12, 0, 0, TAU)
  fillStroke(c, '#2b1640')
  rrect(c, -38, -72, 76, 72, 6)
  fillStroke(c, '#2b1640')
  c.fillStyle = '#e8394f'
  c.fillRect(-37, -22, 74, 14)
  c.strokeStyle = INK
  c.lineWidth = 2
  c.strokeRect(-37, -22, 74, 14)
  star(c, 18, -15, 9, '#f2c40c', INK)
  c.restore()
  c.restore()
}

export function drawBubble(c, x, y, w, str, t) {
  c.font = `bold 20px ${FONT}`
  const lines = wrapLines(c, str, w - 36)
  const h = lines.length * 26 + 26
  c.beginPath()
  rrect(c, x, y, w, h, 18)
  fillStroke(c, '#ffffff')
  c.beginPath()
  c.moveTo(x + 4, y + h / 2 - 12)
  c.lineTo(x - 22, y + h / 2 + 6 + Math.sin(t * 3) * 2)
  c.lineTo(x + 4, y + h / 2 + 10)
  c.closePath()
  fillStroke(c, '#ffffff')
  c.fillStyle = '#ffffff'
  c.fillRect(x + 2, y + h / 2 - 10, 6, 18)
  lines.forEach((ln, i) => text(c, ln, x + w / 2, y + 26 + i * 26, { size: 20, color: INK, outline: null }))
}

export function drawButton(c, b, label, hover, color = '#f2b90c') {
  const lift = hover ? -3 : 0
  rrect(c, b.x, b.y + 5, b.w, b.h, 16)
  c.fillStyle = INK
  c.fill()
  rrect(c, b.x, b.y + lift, b.w, b.h, 16)
  fillStroke(c, color)
  text(c, label, b.x + b.w / 2, b.y + b.h / 2 + lift, { size: 24, color: '#fff' })
}

export const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
