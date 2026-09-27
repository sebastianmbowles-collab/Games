// The fruits, and how to draw each one as a cartoon with a little face.

export const INK = '#3b2418'

export const FRUITS = [
  { key: 'strawberry', name: 'Strawberry', jam: '#d81f3c' },
  { key: 'blueberry', name: 'Blueberry', jam: '#3d2c8d' },
  { key: 'raspberry', name: 'Raspberry', jam: '#c2185b' },
  { key: 'orange', name: 'Orange', jam: '#f57c00' },
  { key: 'grape', name: 'Grape', jam: '#6a1b9a' },
  { key: 'peach', name: 'Peach', jam: '#f4914d' },
  { key: 'cherry', name: 'Cherry', jam: '#9b0d2a' },
  { key: 'lemon', name: 'Lemon', jam: '#f5d020' },
  { key: 'kiwi', name: 'Kiwi', jam: '#7cb342' },
  { key: 'pineapple', name: 'Pineapple', jam: '#f7b52c' },
  { key: 'watermelon', name: 'Watermelon', jam: '#ff4f6a' },
  { key: 'blackberry', name: 'Blackberry', jam: '#3a1340' },
  { key: 'mango', name: 'Mango', jam: '#ff9a14' },
  { key: 'banana', name: 'Banana', jam: '#f0d35c' },
  { key: 'pear', name: 'Pear', jam: '#c9c455' },
  { key: 'plum', name: 'Plum', jam: '#6b1d4f' },
  { key: 'apple', name: 'Apple', jam: '#d9b44a' },
  { key: 'dragonfruit', name: 'Dragon Fruit', jam: '#e6197a' },
]

// Where each fruit's face goes: [x, y, size] as fractions of the radius.
const FACE_SPOT = {
  strawberry: [0, -0.05, 0.85],
  cherry: [0.18, 0.3, 0.6],
  banana: [-0.28, 0.12, 0.55],
  watermelon: [0, 0.2, 0.62],
  pear: [0, 0.32, 0.68],
  pineapple: [0, 0.22, 0.72],
  lemon: [0, 0.05, 0.75],
  dragonfruit: [0, 0.08, 0.72],
}

export const fruitByKey = Object.fromEntries(FRUITS.map((f) => [f.key, f]))

// ---- small drawing helpers shared by the whole kitchen ----

export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function fillStroke(ctx, fill, lw = 3) {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = lw
  ctx.strokeStyle = INK
  ctx.stroke()
}

export function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex([r, g, b]) {
  const c = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function mix(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t))
}

// A cartoon face: two shiny eyes, rosy cheeks and a mouth.
// mood: 'smile' | 'open' | 'o' | 'happy' (eyes squeezed shut in joy)
export function drawFace(ctx, x, y, s, { blink = false, mood = 'smile', lookX = 0, lookY = 0 } = {}) {
  ctx.save()
  ctx.translate(x, y)
  const ex = s * 0.3
  const ey = -s * 0.08
  const er = s * 0.17
  ctx.fillStyle = 'rgba(255, 110, 130, 0.45)'
  circle(ctx, -s * 0.5, s * 0.12, s * 0.13)
  ctx.fill()
  circle(ctx, s * 0.5, s * 0.12, s * 0.13)
  ctx.fill()
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    const cx = side * ex
    if (blink || mood === 'happy') {
      ctx.beginPath()
      if (mood === 'happy') ctx.arc(cx, ey + er * 0.3, er * 0.8, Math.PI * 1.1, Math.PI * 1.9)
      else ctx.arc(cx, ey, er * 0.8, Math.PI * 0.1, Math.PI * 0.9)
      ctx.lineWidth = Math.max(1.5, s * 0.07)
      ctx.strokeStyle = INK
      ctx.stroke()
    } else {
      circle(ctx, cx, ey, er)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.lineWidth = Math.max(1.2, s * 0.05)
      ctx.strokeStyle = INK
      ctx.stroke()
      const px = cx + lookX * er * 0.4
      const py = ey + lookY * er * 0.4
      circle(ctx, px, py, er * 0.6)
      ctx.fillStyle = INK
      ctx.fill()
      circle(ctx, px + er * 0.22, py - er * 0.25, er * 0.22)
      ctx.fillStyle = '#fff'
      ctx.fill()
    }
  }
  ctx.lineWidth = Math.max(1.5, s * 0.07)
  ctx.strokeStyle = INK
  ctx.beginPath()
  if (mood === 'open' || mood === 'happy') {
    ctx.moveTo(-s * 0.2, s * 0.14)
    ctx.quadraticCurveTo(0, s * 0.55, s * 0.2, s * 0.14)
    ctx.closePath()
    ctx.fillStyle = '#8a1c2b'
    ctx.fill()
    ctx.stroke()
  } else if (mood === 'o') {
    ctx.ellipse(0, s * 0.25, s * 0.09, s * 0.12, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#8a1c2b'
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.arc(0, s * 0.1, s * 0.17, Math.PI * 0.15, Math.PI * 0.85)
    ctx.stroke()
  }
  ctx.restore()
}

function leaf(ctx, x, y, rx, ry, rot, color = '#4caf50') {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  fillStroke(ctx, color, 2)
  ctx.restore()
}

function shine(ctx, x, y, rx, ry) {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, -0.6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
  ctx.restore()
}

// Draws the fruit centred at (0,0) with "radius" r. face = options for drawFace, or null for no face.
export function drawFruit(ctx, key, r, face = {}) {
  ctx.lineJoin = 'round'
  if (key === 'strawberry') {
    ctx.beginPath()
    ctx.moveTo(0, r * 1.05)
    ctx.bezierCurveTo(-r * 1.25, r * 0.35, -r * 1.15, -r * 0.9, 0, -r * 0.72)
    ctx.bezierCurveTo(r * 1.15, -r * 0.9, r * 1.25, r * 0.35, 0, r * 1.05)
    fillStroke(ctx, '#ec3445')
    ctx.fillStyle = '#ffe36b'
    for (const [sx, sy] of [[-0.55, -0.3], [0.55, -0.3], [-0.35, 0.45], [0.35, 0.45], [0, 0.75], [-0.7, 0.1], [0.7, 0.1]]) {
      ctx.beginPath()
      ctx.ellipse(sx * r, sy * r, r * 0.05, r * 0.08, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    shine(ctx, -r * 0.5, -r * 0.4, r * 0.15, r * 0.08)
    for (let i = 0; i < 5; i++) leaf(ctx, Math.cos(-Math.PI / 2 + (i - 2) * 0.55) * r * 0.35, -r * 0.8 + Math.abs(i - 2) * r * 0.08, r * 0.3, r * 0.12, (i - 2) * 0.5, '#43a047')
  } else if (key === 'blueberry') {
    circle(ctx, 0, 0, r)
    fillStroke(ctx, '#5063d8')
    shine(ctx, -r * 0.45, -r * 0.45, r * 0.25, r * 0.12)
    ctx.save()
    ctx.translate(0, -r * 0.82)
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const rr = i % 2 ? r * 0.1 : r * 0.24
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.55)
    }
    ctx.closePath()
    fillStroke(ctx, '#2c3a8c', 2)
    ctx.restore()
  } else if (key === 'raspberry') {
    berryCluster(ctx, r, '#d6336c', 'rgba(120, 10, 50, 0.45)')
  } else if (key === 'blackberry') {
    berryCluster(ctx, r, '#3d1f52', 'rgba(190, 140, 230, 0.55)')
  } else if (key === 'orange') {
    circle(ctx, 0, 0, r)
    fillStroke(ctx, '#ff9f1c')
    ctx.fillStyle = 'rgba(200, 100, 0, 0.35)'
    for (const [dx, dy] of [[-0.6, -0.2], [0.6, 0.3], [-0.3, 0.6], [0.4, -0.55], [0.1, 0.8]]) {
      circle(ctx, dx * r, dy * r, r * 0.05)
      ctx.fill()
    }
    shine(ctx, -r * 0.45, -r * 0.45, r * 0.25, r * 0.12)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.9)
    ctx.lineTo(r * 0.05, -r * 1.15)
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    leaf(ctx, r * 0.35, -r * 1.05, r * 0.35, r * 0.14, -0.4, '#43a047')
  } else if (key === 'grape') {
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.8)
    ctx.quadraticCurveTo(r * 0.1, -r * 1.2, r * 0.3, -r * 1.25)
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    leaf(ctx, -r * 0.35, -r * 1.05, r * 0.32, r * 0.14, 0.4, '#66bb6a')
    const gr = r * 0.44
    for (const [gx, gy] of [[-0.5, -0.45], [0.5, -0.45], [0, -0.5], [-0.27, 0.1], [0.27, 0.1], [0, 0.62]]) {
      circle(ctx, gx * r, gy * r, gr)
      fillStroke(ctx, '#8e44ad', 2.5)
      shine(ctx, gx * r - gr * 0.4, gy * r - gr * 0.4, gr * 0.22, gr * 0.12)
    }
  } else if (key === 'peach') {
    circle(ctx, 0, 0, r)
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#ffd3a8')
    g.addColorStop(1, '#ff8a65')
    fillStroke(ctx, g)
    ctx.beginPath()
    ctx.moveTo(r * 0.05, -r * 0.95)
    ctx.quadraticCurveTo(r * 0.45, -r * 0.1, r * 0.2, r * 0.55)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(160, 60, 40, 0.5)'
    ctx.stroke()
    leaf(ctx, r * 0.3, -r * 1.0, r * 0.35, r * 0.14, -0.3, '#43a047')
  } else if (key === 'cherry') {
    ctx.beginPath()
    ctx.moveTo(-r * 0.6, -r * 0.3)
    ctx.quadraticCurveTo(-r * 0.4, -r * 0.9, r * 0.05, -r * 1.15)
    ctx.moveTo(r * 0.2, -r * 0.4)
    ctx.quadraticCurveTo(r * 0.2, -r * 0.9, r * 0.05, -r * 1.15)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#5d4037'
    ctx.stroke()
    leaf(ctx, r * 0.4, -r * 1.1, r * 0.35, r * 0.14, -0.3, '#43a047')
    circle(ctx, -r * 0.6, r * 0.05, r * 0.5)
    fillStroke(ctx, '#b0122f')
    shine(ctx, -r * 0.8, -r * 0.15, r * 0.12, r * 0.06)
    circle(ctx, r * 0.18, r * 0.25, r * 0.75)
    fillStroke(ctx, '#d4173a')
    shine(ctx, -r * 0.15, -r * 0.1, r * 0.2, r * 0.09)
  } else if (key === 'lemon') {
    ctx.beginPath()
    ctx.moveTo(-r * 1.15, 0)
    ctx.quadraticCurveTo(-r * 1.0, -r * 0.2, -r * 0.85, -r * 0.4)
    ctx.bezierCurveTo(-r * 0.5, -r * 1.0, r * 0.5, -r * 1.0, r * 0.85, -r * 0.4)
    ctx.quadraticCurveTo(r * 1.0, -r * 0.2, r * 1.15, 0)
    ctx.quadraticCurveTo(r * 1.0, r * 0.2, r * 0.85, r * 0.4)
    ctx.bezierCurveTo(r * 0.5, r * 1.0, -r * 0.5, r * 1.0, -r * 0.85, r * 0.4)
    ctx.quadraticCurveTo(-r * 1.0, r * 0.2, -r * 1.15, 0)
    fillStroke(ctx, '#ffe135')
    shine(ctx, -r * 0.45, -r * 0.4, r * 0.25, r * 0.1)
    leaf(ctx, r * 0.2, -r * 0.85, r * 0.32, r * 0.13, -0.3, '#43a047')
  } else if (key === 'kiwi') {
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 1.05, r * 0.9, 0, 0, Math.PI * 2)
    fillStroke(ctx, '#9c7448')
    ctx.strokeStyle = 'rgba(80, 50, 20, 0.45)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4
      const d = (0.3 + ((i * 37) % 10) / 16) * r
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d * 0.85)
      ctx.lineTo(Math.cos(a) * d + r * 0.06, Math.sin(a) * d * 0.85 + r * 0.08)
      ctx.stroke()
    }
    shine(ctx, -r * 0.5, -r * 0.4, r * 0.22, r * 0.09)
  } else if (key === 'pineapple') {
    for (let i = -2; i <= 2; i++) {
      ctx.save()
      ctx.translate(i * r * 0.15, -r * 0.65)
      ctx.rotate(i * 0.35)
      ctx.beginPath()
      ctx.moveTo(-r * 0.13, 0)
      ctx.lineTo(0, -r * (0.75 - Math.abs(i) * 0.12))
      ctx.lineTo(r * 0.13, 0)
      ctx.closePath()
      fillStroke(ctx, i % 2 ? '#2e9d4a' : '#43b85c', 2)
      ctx.restore()
    }
    ctx.beginPath()
    ctx.ellipse(0, r * 0.2, r * 0.8, r * 0.95, 0, 0, Math.PI * 2)
    fillStroke(ctx, '#f9c02e')
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = 'rgba(170, 100, 10, 0.5)'
    ctx.lineWidth = 1.5
    for (let d = -2; d <= 2; d += 0.5) {
      ctx.beginPath()
      ctx.moveTo(-r + d * r, -r)
      ctx.lineTo(r + d * r, r * 1.4)
      ctx.moveTo(r - d * r, -r)
      ctx.lineTo(-r - d * r, r * 1.4)
      ctx.stroke()
    }
    ctx.restore()
  } else if (key === 'watermelon') {
    ctx.beginPath()
    ctx.arc(0, -r * 0.35, r * 1.1, 0, Math.PI)
    ctx.closePath()
    fillStroke(ctx, '#3a9d3a')
    ctx.beginPath()
    ctx.arc(0, -r * 0.35, r * 0.98, 0, Math.PI)
    ctx.closePath()
    ctx.fillStyle = '#e8f5c8'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, -r * 0.35, r * 0.88, 0, Math.PI)
    ctx.closePath()
    ctx.fillStyle = '#ff5c74'
    ctx.fill()
    ctx.fillStyle = INK
    for (const [sx, sy] of [[-0.6, -0.1], [0.6, -0.1], [-0.3, 0.3], [0.3, 0.3]]) {
      ctx.beginPath()
      ctx.ellipse(sx * r, sy * r, r * 0.05, r * 0.09, sx * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (key === 'mango') {
    ctx.save()
    ctx.rotate(-0.35)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.85)
    ctx.bezierCurveTo(r * 1.1, -r * 0.85, r * 1.1, r * 0.9, 0, r * 0.9)
    ctx.bezierCurveTo(-r * 1.0, r * 0.9, -r * 0.8, -r * 0.1, -r * 0.4, -r * 0.5)
    ctx.quadraticCurveTo(-r * 0.25, -r * 0.85, 0, -r * 0.85)
    const g = ctx.createLinearGradient(-r, r, r, -r)
    g.addColorStop(0, '#ffb300')
    g.addColorStop(0.6, '#ff7a1a')
    g.addColorStop(1, '#e53935')
    fillStroke(ctx, g)
    ctx.restore()
    shine(ctx, -r * 0.4, -r * 0.35, r * 0.2, r * 0.09)
    leaf(ctx, r * 0.1, -r * 1.0, r * 0.35, r * 0.13, -0.5, '#43a047')
  } else if (key === 'banana') {
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, -r * 0.75)
    ctx.quadraticCurveTo(-r * 0.95, r * 1.15, r * 1.1, r * 0.45)
    ctx.quadraticCurveTo(r * 0.05, -r * 0.05, -r * 0.62, -r * 0.8)
    ctx.closePath()
    fillStroke(ctx, '#ffe066')
    ctx.beginPath()
    ctx.moveTo(-r * 0.75, r * 0.1)
    ctx.quadraticCurveTo(-r * 0.45, r * 0.7, r * 0.7, r * 0.5)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(180, 130, 0, 0.5)'
    ctx.stroke()
    rrect(ctx, -r * 0.95, -r * 0.98, r * 0.3, r * 0.26, r * 0.06)
    fillStroke(ctx, '#7a5a2a', 2)
  } else if (key === 'pear') {
    ctx.lineWidth = 6
    ctx.strokeStyle = INK
    circle(ctx, 0, r * 0.3, r * 0.75)
    ctx.stroke()
    circle(ctx, 0, -r * 0.4, r * 0.45)
    ctx.stroke()
    ctx.fillStyle = '#c5d94a'
    circle(ctx, 0, r * 0.3, r * 0.75)
    ctx.fill()
    circle(ctx, 0, -r * 0.4, r * 0.45)
    ctx.fill()
    shine(ctx, -r * 0.35, -r * 0.1, r * 0.18, r * 0.08)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.8)
    ctx.lineTo(r * 0.08, -r * 1.1)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#5d4037'
    ctx.stroke()
    leaf(ctx, r * 0.35, -r * 1.0, r * 0.3, r * 0.12, -0.4, '#43a047')
  } else if (key === 'plum') {
    circle(ctx, 0, 0, r)
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#b0508f')
    g.addColorStop(1, '#6a1f5a')
    fillStroke(ctx, g)
    ctx.beginPath()
    ctx.moveTo(-r * 0.05, -r * 0.95)
    ctx.quadraticCurveTo(-r * 0.45, -r * 0.1, -r * 0.2, r * 0.55)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(60, 0, 40, 0.5)'
    ctx.stroke()
    shine(ctx, -r * 0.45, -r * 0.45, r * 0.2, r * 0.09)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.95)
    ctx.lineTo(r * 0.05, -r * 1.2)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#5d4037'
    ctx.stroke()
  } else if (key === 'apple') {
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.62)
    ctx.bezierCurveTo(-r * 0.4, -r * 1.0, -r * 1.1, -r * 0.75, -r * 1.0, r * 0.05)
    ctx.bezierCurveTo(-r * 0.95, r * 0.8, -r * 0.4, r * 1.05, 0, r * 0.85)
    ctx.bezierCurveTo(r * 0.4, r * 1.05, r * 0.95, r * 0.8, r * 1.0, r * 0.05)
    ctx.bezierCurveTo(r * 1.1, -r * 0.75, r * 0.4, -r * 1.0, 0, -r * 0.62)
    fillStroke(ctx, '#8bc34a')
    shine(ctx, -r * 0.5, -r * 0.35, r * 0.22, r * 0.1)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.6)
    ctx.quadraticCurveTo(-r * 0.05, -r * 0.95, r * 0.1, -r * 1.1)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#5d4037'
    ctx.stroke()
    leaf(ctx, r * 0.35, -r * 0.95, r * 0.3, r * 0.12, -0.4, '#43a047')
  } else if (key === 'dragonfruit') {
    const scales = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2
      scales.push([Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.95, a])
    }
    for (const [x, y, a] of scales) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a + Math.PI / 2 + 0.5)
      ctx.beginPath()
      ctx.moveTo(-r * 0.15, 0)
      ctx.quadraticCurveTo(0, -r * 0.1, r * 0.3, -r * 0.35)
      ctx.quadraticCurveTo(r * 0.1, r * 0.05, -r * 0.15, 0)
      fillStroke(ctx, '#6ccf3e', 2)
      ctx.restore()
    }
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.85, r, 0, 0, Math.PI * 2)
    fillStroke(ctx, '#ff3d8b')
    for (const [x, y] of scales.slice(0, 4)) {
      ctx.beginPath()
      ctx.moveTo(x * 0.6, y * 0.6)
      ctx.quadraticCurveTo(x * 0.75, y * 0.75 - r * 0.1, x * 0.95, y * 0.9)
      ctx.lineWidth = 3
      ctx.strokeStyle = '#6ccf3e'
      ctx.stroke()
    }
    shine(ctx, -r * 0.4, -r * 0.45, r * 0.2, r * 0.09)
  }
  if (face) {
    const [fx, fy, fs] = FACE_SPOT[key] || [0, 0.05, 0.85]
    drawFace(ctx, fx * r, fy * r, fs * r, face)
  }
}

// Bumpy berries (raspberry, blackberry) made of lots of little round bits.
function berryCluster(ctx, r, color, bumpColor) {
  ctx.beginPath()
  ctx.ellipse(0, r * 0.05, r * 0.95, r * 1.0, 0, 0, Math.PI * 2)
  fillStroke(ctx, color)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = bumpColor
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const x = (col + (row % 2 ? 0.5 : 0)) * r * 0.36
      const y = row * r * 0.34 + r * 0.05
      if ((x * x) / (r * r * 0.72) + (y * y) / (r * r * 0.8) > 1) continue
      circle(ctx, x, y, r * 0.16)
      ctx.stroke()
    }
  }
  shine(ctx, -r * 0.45, -r * 0.45, r * 0.18, r * 0.09)
  for (let i = 0; i < 3; i++) leaf(ctx, (i - 1) * r * 0.28, -r * 0.95, r * 0.25, r * 0.1, (i - 1) * 0.6, '#43a047')
}
