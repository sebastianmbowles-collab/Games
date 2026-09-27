// Grimy, hand-made textures (all drawn with code, no image files):
// old wallpaper, scratched floorboards, stained plaster, oil paintings,
// and the painted faces of the monsters.

export function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  return c
}

// Repeatable random numbers, so the room looks the same every night.
export function rng(seed) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function specks(g, w, h, r, n, rgb, maxA, size = 2) {
  for (let k = 0; k < n; k++) {
    g.fillStyle = `rgba(${rgb},${r() * maxA})`
    g.fillRect(r() * w, r() * h, size * r() + 0.5, size * r() + 0.5)
  }
}

export function blotches(g, w, h, r, n, rgb, maxA, maxR) {
  for (let k = 0; k < n; k++) {
    const x = r() * w
    const y = r() * h
    const rad = maxR * (0.3 + r() * 0.7)
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, `rgba(${rgb},${maxA * r()})`)
    grad.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
}

// Grain over everything, so nothing looks clean and flat.
export function grit(g, w, h, amount = 0.12) {
  const img = g.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  g.putImageData(img, 0, 0)
}

function star(g, x, y, r) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.45
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()
}

// Faded blue kid's wallpaper with little stars, water stains and dirt.
export const wallpaper = () =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(3)
    g.fillStyle = '#56657a'
    g.fillRect(0, 0, w, h)
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = 'rgba(30,40,60,0.18)'
      g.fillRect(x, 0, 26, h)
    }
    g.fillStyle = 'rgba(210,190,120,0.35)'
    for (let y = 32, row = 0; y < h; y += 64, row++) for (let x = (row % 2) * 32 + 16; x < w; x += 64) star(g, x, y, 7)
    blotches(g, w, h, r, 14, '60,45,20', 0.35, 120)
    blotches(g, w, h, r, 10, '10,10,15', 0.4, 90)
    specks(g, w, h, r, 5000, '0,0,0', 0.25)
    specks(g, w, h, r, 1500, '220,210,190', 0.08)
    // Drips running down from old leaks.
    for (let k = 0; k < 7; k++) {
      const x = r() * w
      const len = 60 + r() * 220
      const grad = g.createLinearGradient(0, 0, 0, len)
      grad.addColorStop(0, 'rgba(50,35,15,0.35)')
      grad.addColorStop(1, 'rgba(50,35,15,0)')
      g.fillStyle = grad
      g.fillRect(x, 0, 2 + r() * 4, len)
    }
    grit(g, w, h, 0.1)
  })

export const floorboards = () =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(7)
    const plank = 64
    for (let x = 0; x < w; x += plank) {
      const shade = 50 + r() * 22
      g.fillStyle = `rgb(${shade + 18},${shade},${shade - 22})`
      g.fillRect(x, 0, plank, h)
      g.strokeStyle = 'rgba(20,10,5,0.4)'
      g.lineWidth = 1
      for (let k = 0; k < 14; k++) {
        g.beginPath()
        const gx = x + r() * plank
        g.moveTo(gx, 0)
        g.bezierCurveTo(gx + 6, h * 0.3, gx - 6, h * 0.6, gx + (r() - 0.5) * 8, h)
        g.stroke()
      }
      g.fillStyle = 'rgba(0,0,0,0.75)'
      g.fillRect(x, 0, 3, h)
      const seam = r() * h
      g.fillRect(x, seam, plank, 3)
    }
    blotches(g, w, h, r, 12, '0,0,0', 0.45, 100)
    specks(g, w, h, r, 4000, '0,0,0', 0.3)
    grit(g, w, h, 0.12)
  })

export const plaster = () =>
  makeCanvas(256, 256, (g, w, h) => {
    const r = rng(11)
    g.fillStyle = '#8c887c'
    g.fillRect(0, 0, w, h)
    blotches(g, w, h, r, 8, '90,70,30', 0.45, 90)
    specks(g, w, h, r, 3000, '0,0,0', 0.2)
    grit(g, w, h, 0.1)
  })

export const wood = (seed = 5, base = [70, 45, 28]) =>
  makeCanvas(256, 256, (g, w, h) => {
    const r = rng(seed)
    g.fillStyle = `rgb(${base.join(',')})`
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(15,8,4,0.35)'
    for (let k = 0; k < 60; k++) {
      g.beginPath()
      const y = r() * h
      g.moveTo(0, y)
      g.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + (r() - 0.5) * 10)
      g.stroke()
    }
    blotches(g, w, h, r, 6, '0,0,0', 0.4, 60)
    specks(g, w, h, r, 1500, '0,0,0', 0.3)
    grit(g, w, h, 0.1)
  })

export const blanket = () =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(19)
    g.fillStyle = '#26345a'
    g.fillRect(0, 0, w, h)
    const s = 64
    for (let y = 0; y < h; y += s)
      for (let x = 0; x < w; x += s) {
        g.fillStyle = (x / s + y / s) % 2 ? 'rgba(80,90,130,0.25)' : 'rgba(0,0,20,0.2)'
        g.fillRect(x, y, s, s)
      }
    g.strokeStyle = 'rgba(200,190,160,0.18)'
    g.setLineDash([4, 4])
    for (let x = 0; x <= w; x += s) {
      g.beginPath()
      g.moveTo(x + 2, 0)
      g.lineTo(x + 2, h)
      g.stroke()
    }
    for (let y = 0; y <= h; y += s) {
      g.beginPath()
      g.moveTo(0, y + 2)
      g.lineTo(w, y + 2)
      g.stroke()
    }
    g.setLineDash([])
    blotches(g, w, h, r, 10, '0,0,0', 0.35, 90)
    specks(g, w, h, r, 6000, '255,255,255', 0.06, 1.5)
    grit(g, w, h, 0.12)
  })

export const velvet = () =>
  makeCanvas(256, 512, (g, w, h) => {
    const r = rng(23)
    for (let x = 0; x < w; x++) {
      const fold = 0.5 + 0.5 * Math.sin((x / w) * Math.PI * 9)
      g.fillStyle = `rgb(${40 + fold * 45},${8 + fold * 10},${16 + fold * 14})`
      g.fillRect(x, 0, 1, h)
    }
    blotches(g, w, h, r, 6, '0,0,0', 0.5, 80)
    specks(g, w, h, r, 2000, '0,0,0', 0.3)
    grit(g, w, h, 0.1)
  })

export const fur = (base = [18, 14, 12], seed = 31) =>
  makeCanvas(256, 256, (g, w, h) => {
    const r = rng(seed)
    g.fillStyle = `rgb(${base.join(',')})`
    g.fillRect(0, 0, w, h)
    for (let k = 0; k < 4000; k++) {
      const x = r() * w
      const y = r() * h
      const l = 3 + r() * 8
      const v = r() < 0.5 ? 0 : 60
      g.strokeStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v},${0.3 + r() * 0.4})`
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + (r() - 0.5) * 3, y + l)
      g.stroke()
    }
    grit(g, w, h, 0.1)
  })

// The view out of the window: night sky, moon, garden and a dead tree.
export const outside = (morning = false) =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(41)
    const sky = g.createLinearGradient(0, 0, 0, h)
    if (morning) {
      sky.addColorStop(0, '#8fb0c8')
      sky.addColorStop(0.7, '#e8c79a')
    } else {
      sky.addColorStop(0, '#04050b')
      sky.addColorStop(0.7, '#141827')
    }
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    if (!morning) {
      specks(g, w, h * 0.6, r, 300, '255,255,255', 0.7, 1.5)
      const moon = g.createRadialGradient(360, 110, 0, 360, 110, 80)
      moon.addColorStop(0, 'rgba(235,235,215,1)')
      moon.addColorStop(0.3, 'rgba(235,235,215,0.9)')
      moon.addColorStop(0.35, 'rgba(160,170,190,0.25)')
      moon.addColorStop(1, 'rgba(160,170,190,0)')
      g.fillStyle = moon
      g.fillRect(260, 10, 200, 200)
    }
    blotches(g, w, h, r, 10, morning ? '255,255,255' : '40,45,60', 0.35, 120)
    g.fillStyle = morning ? '#2f3a26' : '#030504'
    g.beginPath()
    g.moveTo(0, h)
    g.lineTo(0, h * 0.72)
    g.bezierCurveTo(w * 0.3, h * 0.66, w * 0.6, h * 0.7, w, h * 0.68)
    g.lineTo(w, h)
    g.fill()
    // Dead tree with grabby branches.
    g.strokeStyle = morning ? '#2a2018' : '#020202'
    g.lineCap = 'round'
    const branch = (x, y, a, len, width) => {
      if (width < 1) return
      const x2 = x + Math.cos(a) * len
      const y2 = y + Math.sin(a) * len
      g.lineWidth = width
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x2, y2)
      g.stroke()
      branch(x2, y2, a - 0.4 - r() * 0.3, len * 0.72, width * 0.65)
      branch(x2, y2, a + 0.3 + r() * 0.3, len * 0.68, width * 0.65)
    }
    branch(120, h * 0.72, -Math.PI / 2, 90, 14)
    grit(g, w, h, 0.14)
  })

// ---------- faces ----------

function shadeEllipse(g, x, y, rx, ry, inner, outer) {
  const grad = g.createRadialGradient(x - rx * 0.2, y - ry * 0.25, 0, x, y, Math.max(rx, ry))
  grad.addColorStop(0, inner)
  grad.addColorStop(1, outer)
  g.fillStyle = grad
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  g.fill()
}

function socket(g, x, y, rx, ry) {
  const grad = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry) * 1.4)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.95)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.beginPath()
  g.ellipse(x, y, rx * 1.4, ry * 1.4, 0, 0, Math.PI * 2)
  g.fill()
}

function teethRow(g, x0, x1, y, n, len, color, down = true, r = Math.random) {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n
    const tw = ((x1 - x0) / n) * 0.8
    const l = len * (0.6 + r() * 0.6)
    g.fillStyle = color
    g.beginPath()
    g.moveTo(x - tw / 2, y)
    g.lineTo(x + tw / 2, y)
    g.lineTo(x + (r() - 0.5) * 3, y + (down ? l : -l))
    g.fill()
  }
}

// The Tall Man: long pale face, empty eye holes and a grin that's much too wide.
export const tallManFace = () =>
  makeCanvas(512, 640, (g, w, h) => {
    const r = rng(51)
    g.filter = 'blur(1.5px)'
    g.fillStyle = '#0b0b0b'
    g.fillRect(w * 0.26, 0, w * 0.48, h * 0.2)
    g.fillRect(w * 0.12, h * 0.19, w * 0.76, h * 0.035)
    shadeEllipse(g, w / 2, h * 0.58, w * 0.3, h * 0.36, '#d8d2c2', '#6d675c')
    blotches(g, w, h, r, 10, '80,70,60', 0.25, 60)
    socket(g, w * 0.38, h * 0.47, w * 0.075, h * 0.07)
    socket(g, w * 0.62, h * 0.47, w * 0.075, h * 0.07)
    g.filter = 'none'
    g.fillStyle = 'rgba(255,255,240,0.95)'
    g.beginPath()
    g.arc(w * 0.38, h * 0.47, 4, 0, Math.PI * 2)
    g.arc(w * 0.62, h * 0.47, 4, 0, Math.PI * 2)
    g.fill()
    // Sunken cheeks and wrinkles.
    blotches(g, w * 0.6, h * 0.3, r, 3, '30,25,20', 0.5, 50)
    g.save()
    g.translate(w * 0.4, h * 0.5)
    blotches(g, w * 0.6, h * 0.3, r, 3, '30,25,20', 0.5, 50)
    g.restore()
    g.strokeStyle = 'rgba(40,30,25,0.35)'
    g.lineWidth = 1.5
    for (let k = 0; k < 14; k++) {
      const x = w * (0.3 + r() * 0.4)
      g.beginPath()
      g.moveTo(x, h * (0.3 + r() * 0.1))
      g.lineTo(x + (r() - 0.5) * 10, h * (0.36 + r() * 0.12))
      g.stroke()
    }
    // A thin, crooked mouth, stretched far too wide.
    g.filter = 'blur(1px)'
    g.fillStyle = '#120303'
    g.beginPath()
    g.moveTo(w * 0.29, h * 0.64)
    g.bezierCurveTo(w * 0.4, h * 0.73, w * 0.58, h * 0.75, w * 0.72, h * 0.62)
    g.bezierCurveTo(w * 0.58, h * 0.69, w * 0.42, h * 0.68, w * 0.29, h * 0.64)
    g.fill()
    g.filter = 'none'
    teethRow(g, w * 0.34, w * 0.68, h * 0.665, 13, 11, 'rgba(190,178,140,0.9)', true, r)
    specks(g, w, h, r, 3000, '0,0,0', 0.25)
    grit(g, w, h, 0.16)
  })

export const shadowFace = () =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(61)
    g.filter = 'blur(6px)'
    for (let k = 0; k < 60; k++) {
      const a = r() * Math.PI * 2
      g.strokeStyle = 'rgba(0,0,0,0.9)'
      g.lineWidth = 8 + r() * 14
      g.beginPath()
      g.moveTo(w / 2, h / 2)
      g.lineTo(w / 2 + Math.cos(a) * w * 0.48, h / 2 + Math.sin(a) * h * 0.48)
      g.stroke()
    }
    shadeEllipse(g, w / 2, h / 2, w * 0.36, h * 0.4, '#141016', '#000')
    g.filter = 'blur(2px)'
    for (const ex of [0.36, 0.64]) {
      const grad = g.createRadialGradient(w * ex, h * 0.42, 0, w * ex, h * 0.42, 40)
      grad.addColorStop(0, 'rgba(255,250,210,1)')
      grad.addColorStop(0.35, 'rgba(255,230,140,0.9)')
      grad.addColorStop(1, 'rgba(255,200,80,0)')
      g.fillStyle = grad
      g.fillRect(w * ex - 40, h * 0.42 - 40, 80, 80)
    }
    g.filter = 'none'
    teethRow(g, w * 0.28, w * 0.72, h * 0.62, 12, 34, 'rgba(230,220,180,0.9)', true, r)
    teethRow(g, w * 0.3, w * 0.7, h * 0.72, 11, 26, 'rgba(230,220,180,0.8)', false, r)
    grit(g, w, h, 0.18)
  })

export const grabberFace = () =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(71)
    g.filter = 'blur(1px)'
    for (let k = 0; k < 5000; k++) {
      const a = r() * Math.PI * 2
      const d = w * 0.3 + r() * w * 0.18
      g.strokeStyle = `rgba(${15 + r() * 30},${10 + r() * 20},${8},0.6)`
      g.beginPath()
      g.moveTo(w / 2 + Math.cos(a) * d * 0.6, h / 2 + Math.sin(a) * d * 0.6)
      g.lineTo(w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d)
      g.stroke()
    }
    shadeEllipse(g, w / 2, h / 2, w * 0.33, h * 0.31, '#221a14', '#050302')
    for (const ex of [0.36, 0.64]) {
      const grad = g.createRadialGradient(w * ex, h * 0.4, 0, w * ex, h * 0.4, 44)
      grad.addColorStop(0, 'rgba(255,240,120,1)')
      grad.addColorStop(0.5, 'rgba(220,170,20,0.9)')
      grad.addColorStop(1, 'rgba(120,80,0,0)')
      g.fillStyle = grad
      g.beginPath()
      g.ellipse(w * ex, h * 0.4, 40, 26, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#000'
      g.beginPath()
      g.ellipse(w * ex, h * 0.4, 5, 22, 0, 0, Math.PI * 2)
      g.fill()
    }
    shadeEllipse(g, w / 2, h * 0.66, w * 0.2, h * 0.1, '#3a0a08', '#120202')
    g.filter = 'none'
    teethRow(g, w * 0.32, w * 0.68, h * 0.58, 10, 30, 'rgba(225,215,180,0.95)', true, r)
    teethRow(g, w * 0.33, w * 0.67, h * 0.75, 9, 26, 'rgba(225,215,180,0.9)', false, r)
    grit(g, w, h, 0.16)
  })

// An old oil painting. When `awake`, the eyes are open and red.
export const portrait = (kind, awake, grin) =>
  makeCanvas(160, 210, (g, w, h) => {
    const r = rng(kind === 'lady' ? 81 : 82)
    const bg = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, h * 0.7)
    bg.addColorStop(0, kind === 'lady' ? '#3d4a36' : '#3a3342')
    bg.addColorStop(1, '#0b0c0a')
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
    g.filter = 'blur(1px)'
    shadeEllipse(g, w / 2, h * 1.02, w * 0.5, h * 0.3, kind === 'lady' ? '#5a1c20' : '#1e2436', '#080808')
    if (kind === 'lady') shadeEllipse(g, w / 2, h * 0.36, w * 0.3, h * 0.28, '#3a2414', '#120a05')
    shadeEllipse(g, w / 2, h * 0.44, w * 0.2, h * 0.22, '#d6b48e', '#6a4a32')
    if (kind === 'man') {
      shadeEllipse(g, w * 0.3, h * 0.42, 8, 18, '#9a968e', '#4a4640')
      shadeEllipse(g, w * 0.7, h * 0.42, 8, 18, '#9a968e', '#4a4640')
      shadeEllipse(g, w / 2, h * 0.53, 18, 5, '#8a867e', '#3a3630')
    }
    g.filter = 'none'
    for (const ex of [0.42, 0.58]) {
      if (awake) {
        socket(g, w * ex, h * 0.41, 7, 5)
        g.fillStyle = '#ff2a1a'
        g.beginPath()
        g.arc(w * ex, h * 0.41, 2.5, 0, Math.PI * 2)
        g.fill()
      } else {
        g.strokeStyle = 'rgba(40,20,10,0.8)'
        g.lineWidth = 1.5
        g.beginPath()
        g.arc(w * ex, h * 0.4, 5, 0.15 * Math.PI, 0.85 * Math.PI)
        g.stroke()
      }
    }
    g.fillStyle = grin ? '#1a0303' : 'rgba(90,40,30,0.8)'
    g.beginPath()
    if (grin) g.ellipse(w / 2, h * 0.56, 16, 7, 0, 0, Math.PI * 2)
    else g.ellipse(w / 2, h * 0.56, 7, 1.6, 0, 0, Math.PI * 2)
    g.fill()
    if (grin) teethRow(g, w / 2 - 14, w / 2 + 14, h * 0.545, 7, 5, '#d8cfb0', true, r)
    // Old cracked varnish.
    g.strokeStyle = 'rgba(0,0,0,0.35)'
    g.lineWidth = 0.6
    for (let k = 0; k < 70; k++) {
      let x = r() * w
      let y = r() * h
      g.beginPath()
      g.moveTo(x, y)
      for (let s = 0; s < 4; s++) {
        x += (r() - 0.5) * 18
        y += (r() - 0.5) * 18
        g.lineTo(x, y)
      }
      g.stroke()
    }
    g.fillStyle = 'rgba(120,90,20,0.15)'
    g.fillRect(0, 0, w, h)
    grit(g, w, h, 0.14)
  })

// What the haunted computer shows.
export function drawMonitor(g, w, h, stage, progress, t) {
  g.fillStyle = '#050706'
  g.fillRect(0, 0, w, h)
  if (stage === 1) {
    const img = g.createImageData(w, h)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 200
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    g.putImageData(img, 0, 0)
  } else if (stage >= 2) {
    g.fillStyle = '#021a08'
    g.fillRect(0, 0, w, h)
    const jx = stage >= 3 ? (Math.random() - 0.5) * 12 : 0
    g.filter = 'blur(2px)'
    shadeEllipse(g, w / 2 + jx, h * 0.45, w * 0.2, h * 0.34, '#7dffa0', '#0a3a18')
    socket(g, w * 0.42 + jx, h * 0.4, 10, 12)
    socket(g, w * 0.58 + jx, h * 0.4, 10, 12)
    g.fillStyle = '#000'
    g.beginPath()
    g.ellipse(w / 2 + jx, h * 0.62, 22, 10 + Math.sin(t * 9) * 4, 0, 0, Math.PI * 2)
    g.fill()
    g.filter = 'none'
    g.fillStyle = '#0d4a1c'
    g.fillRect(w * 0.1, h * 0.88, w * 0.8, 6)
    g.fillStyle = '#5dff82'
    g.fillRect(w * 0.1, h * 0.88, w * 0.8 * progress, 6)
    g.font = '12px "Courier New", monospace'
    g.fillText(stage >= 3 ? 'COMING OUT' : 'DOWNLOADING...', w * 0.1, h * 0.84)
    for (let k = 0; k < 5; k++) {
      const y = Math.random() * h
      g.drawImage(g.canvas, 0, y, w, 6, (Math.random() - 0.5) * 20, y, w, 6)
    }
  }
  if (stage > 0) {
    g.fillStyle = 'rgba(0,0,0,0.3)'
    for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1)
  }
}

// The green face that jumps out of the computer.
export const glitchFace = () =>
  makeCanvas(512, 512, (g, w, h) => {
    drawMonitor(g, w, h, 2, 1, 0)
    grit(g, w, h, 0.2)
  })

export const manyEyes = () =>
  makeCanvas(512, 512, (g, w, h) => {
    const r = rng(91)
    g.fillStyle = '#000'
    g.fillRect(0, 0, w, h)
    g.filter = 'blur(1.5px)'
    for (let k = 0; k < 40; k++) {
      const x = r() * w
      const y = r() * h
      const s = 3 + r() * 6
      for (const dx of [-s * 2, s * 2]) {
        const grad = g.createRadialGradient(x + dx, y, 0, x + dx, y, s * 2)
        grad.addColorStop(0, 'rgba(255,245,200,1)')
        grad.addColorStop(1, 'rgba(255,200,80,0)')
        g.fillStyle = grad
        g.fillRect(x + dx - s * 2, y - s * 2, s * 4, s * 4)
      }
    }
    g.filter = 'none'
    grit(g, w, h, 0.2)
  })

// The inside of the blanket when Leon hides.
export const blanketInside = () =>
  makeCanvas(480, 270, (g, w, h) => {
    const r = rng(101)
    const grad = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6)
    grad.addColorStop(0, '#1b2238')
    grad.addColorStop(1, '#030408')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(0,0,0,0.5)'
    g.lineWidth = 10
    g.filter = 'blur(4px)'
    for (let k = 0; k < 6; k++) {
      g.beginPath()
      g.moveTo(0, r() * h)
      g.bezierCurveTo(w * 0.3, r() * h, w * 0.6, r() * h, w, r() * h)
      g.stroke()
    }
    g.filter = 'none'
    specks(g, w, h, r, 4000, '255,255,255', 0.05, 1)
    grit(g, w, h, 0.18)
  })
