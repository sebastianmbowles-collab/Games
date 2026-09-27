// The fruits, and how to draw each one as a cartoon with a little face.

export const INK = '#3b2418'

export const FRUITS = [
  { key: 'strawberry', name: 'Strawberry', jam: '#d81f3c' },
  { key: 'blueberry', name: 'Blueberry', jam: '#3d2c8d' },
  { key: 'raspberry', name: 'Raspberry', jam: '#c2185b' },
  { key: 'orange', name: 'Orange', jam: '#f57c00' },
  { key: 'grape', name: 'Grape', jam: '#6a1b9a' },
  { key: 'peach', name: 'Peach', jam: '#f4914d' },
]

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
    ctx.beginPath()
    ctx.ellipse(0, r * 0.05, r * 0.95, r * 1.0, 0, 0, Math.PI * 2)
    fillStroke(ctx, '#d6336c')
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(120, 10, 50, 0.45)'
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
  }
  if (face) drawFace(ctx, 0, key === 'strawberry' ? -r * 0.05 : r * 0.05, r * 0.85, face)
}
