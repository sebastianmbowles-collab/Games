// Draws Leon's bedroom (and the monsters in it) on a 960x540 canvas.
//
// We look at the room from Leon's pillow. The back wall has the computer,
// the window and the paintings. The left and right walls each have a door.
// The end of the bed (with Leon's feet under the blanket) is at the bottom.

export const W = 960
export const H = 540

// Corners of the back wall. Everything else is drawn in perspective from these.
const BX0 = 230
const BX1 = 730
const BY0 = 70
const BY1 = 330

// Height on the left wall at x, where f=0 is the ceiling line and f=1 the floor line.
function lw(x, f) {
  const c = (BY0 * x) / BX0
  const fl = H - ((H - BY1) * x) / BX0
  return c + (fl - c) * f
}
function rw(x, f) {
  const t = (W - x) / (W - BX1)
  const c = BY0 * t
  const fl = H - (H - BY1) * t
  return c + (fl - c) * f
}
const wallY = (side, x, f) => (side === 'left' ? lw(x, f) : rw(x, f))

// Doors: `outer` is the edge nearest to Leon, `inner` is next to the back wall.
const DOORS = {
  left: { outer: 55, inner: 165 },
  right: { outer: W - 55, inner: W - 165 },
}
const DOOR_TOP = 0.26

const WIN = { x: 410, y: 100, w: 140, h: 135 }
const MONITOR = { x: 270, y: 182, w: 92, h: 68 }
const SCREEN = { x: 277, y: 188, w: 78, h: 55 }
const PAINTINGS = [
  { x: 585, y: 110, w: 60, h: 75, bg: '#2f4a3a', kind: 'lady', tilt: -1 },
  { x: 660, y: 122, w: 58, h: 60, bg: '#3a2f4a', kind: 'man', tilt: 1 },
]

export const HOTSPOTS = {
  leftDoor: { x: 40, y: 120, w: 140, h: 380 },
  rightDoor: { x: W - 180, y: 120, w: 140, h: 380 },
  computer: { x: 250, y: 170, w: 145, h: 100 },
  window: { x: 395, y: 85, w: 170, h: 170 },
  paintings: { x: 570, y: 95, w: 160, h: 110 },
  underBed: { x: 300, y: 355, w: 360, h: 100 },
}

export function inHotspot(key, x, y, pad = 0) {
  const r = HOTSPOTS[key]
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad
}

export function hotspotAt(x, y) {
  for (const key of Object.keys(HOTSPOTS)) if (inHotspot(key, x, y)) return key
  return null
}

// ---------- little drawing helpers ----------

function poly(ctx, pts, fill, stroke, lineWidth = 2) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }
}

function rect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
}

function ellipse(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function glow(ctx, color, blur, fn) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  fn()
  ctx.restore()
}

// A 4-point strip of a side wall between x=a and x=b, from height f0 to f1.
function wallQuad(side, a, b, f0, f1) {
  return [
    [a, wallY(side, a, f0)],
    [b, wallY(side, b, f0)],
    [b, wallY(side, b, f1)],
    [a, wallY(side, a, f1)],
  ]
}

// Cheap repeatable "random" numbers so wallpaper stars don't jump around.
function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

// ---------- the room itself ----------

function drawShell(ctx, lit) {
  const wall = lit ? '#5f82c0' : '#3e5584'
  const side = lit ? '#52729f' : '#34496f'
  const ceil = lit ? '#7fa0d4' : '#4a5f8a'
  const floor = lit ? '#8a5a34' : '#5b3b22'

  poly(ctx, [[0, 0], [W, 0], [BX1, BY0], [BX0, BY0]], ceil)
  poly(ctx, [[0, 0], [BX0, BY0], [BX0, BY1], [0, H]], side)
  poly(ctx, [[W, 0], [BX1, BY0], [BX1, BY1], [W, H]], side)
  rect(ctx, BX0, BY0, BX1 - BX0, BY1 - BY0, wall)
  poly(ctx, [[BX0, BY1], [BX1, BY1], [W, H], [0, H]], floor)

  // Floorboards all run toward the back wall.
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 1.5
  for (let i = 1; i < 12; i++) {
    const bx = BX0 + ((BX1 - BX0) * i) / 12
    const fx = (W * i) / 12
    ctx.beginPath()
    ctx.moveTo(bx, BY1)
    ctx.lineTo(fx, H)
    ctx.stroke()
  }

  // Yellow star wallpaper on the back wall.
  ctx.fillStyle = lit ? 'rgba(255,230,120,0.55)' : 'rgba(255,230,120,0.25)'
  for (let i = 0; i < 40; i++) {
    const x = BX0 + 8 + hash(i) * (BX1 - BX0 - 16)
    const y = BY0 + 8 + hash(i + 99) * (BY1 - BY0 - 16)
    star(ctx, x, y, 3)
  }
  // Skirting board and corner lines.
  rect(ctx, BX0, BY1 - 8, BX1 - BX0, 8, lit ? '#e8e2d0' : '#8f8a7c')
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 2
  ctx.strokeRect(BX0, BY0, BX1 - BX0, BY1 - BY0)
}

function star(ctx, x, y, r) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * 0.45
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}

// ---------- window + the Tall Man ----------

function drawWindow(ctx, s) {
  const { x, y, w, h } = WIN
  rect(ctx, x - 7, y - 7, w + 14, h + 14, '#e9e4d6')

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, y, 0, y + h)
  if (s.mode === 'morning') {
    sky.addColorStop(0, '#7cc3ff')
    sky.addColorStop(1, '#ffd7a1')
  } else if (s.mode === 'bedtime') {
    sky.addColorStop(0, '#0f1a3d')
    sky.addColorStop(1, '#2d3f78')
  } else {
    sky.addColorStop(0, '#05060f')
    sky.addColorStop(1, '#1b1733')
  }
  ctx.fillStyle = sky
  ctx.fillRect(x, y, w, h)
  if (s.mode === 'morning') {
    ellipse(ctx, x + 105, y + 95, 18, 18, '#fff3b0')
  } else {
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 18; i++) ctx.fillRect(x + hash(i + 7) * w, y + hash(i + 50) * h * 0.6, 1.5, 1.5)
    ellipse(ctx, x + 110, y + 25, 14, 14, '#f4f1d6')
    ellipse(ctx, x + 116, y + 21, 12, 12, s.mode === 'bedtime' ? '#16224a' : '#070812')
  }
  // Garden hill and a spooky tree.
  ctx.fillStyle = s.mode === 'morning' ? '#4f9a4a' : '#0b1410'
  ctx.beginPath()
  ctx.moveTo(x, y + h)
  ctx.lineTo(x, y + 105)
  ctx.quadraticCurveTo(x + w / 2, y + 88, x + w, y + 108)
  ctx.lineTo(x + w, y + h)
  ctx.fill()
  ctx.strokeStyle = s.mode === 'morning' ? '#4a3320' : '#0b0b0b'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x + 30, y + 100)
  ctx.lineTo(x + 32, y + 55)
  ctx.lineTo(x + 18, y + 35)
  ctx.moveTo(x + 32, y + 62)
  ctx.lineTo(x + 50, y + 40)
  ctx.lineTo(x + 58, y + 44)
  ctx.stroke()

  if (s.mode === 'dream') drawTallMan(ctx, s.threats.window?.stage ?? 0, s.t)
  ctx.restore()

  // Window bars, then sill.
  rect(ctx, x + w / 2 - 3, y, 6, h, '#e9e4d6')
  rect(ctx, x, y + h / 2 - 3, w, 6, '#e9e4d6')
  rect(ctx, x - 12, y + h + 5, w + 24, 8, '#d8d2c1')

  if (s.mode === 'dream' && (s.threats.window?.stage ?? 0) >= 3) drawTallManHands(ctx, s.t)
  drawCurtains(ctx, s.curtain ?? 0, s.mode === 'dream')
}

function drawTallMan(ctx, stage, t) {
  const { x, y } = WIN
  if (stage === 1) {
    const fx = x + 52
    rect(ctx, fx - 2, y + 72, 4, 26, '#000')
    ellipse(ctx, fx, y + 69, 4, 5, '#000')
    rect(ctx, fx - 4, y + 60, 8, 7, '#000')
    rect(ctx, fx - 6, y + 66, 12, 2, '#000')
  } else if (stage >= 2) {
    const big = stage >= 3
    const cx = x + 70 + Math.sin(t * 0.8) * 2
    const cy = big ? y + 86 : y + 102
    const rx = big ? 50 : 38
    const ry = big ? 64 : 50
    // Top hat
    rect(ctx, cx - rx * 0.75, cy - ry - 34, rx * 1.5, 34, '#0b0b0b')
    rect(ctx, cx - rx * 1.05, cy - ry - 4, rx * 2.1, 8, '#0b0b0b')
    ellipse(ctx, cx, cy, rx, ry, '#d9d4c7')
    ellipse(ctx, cx - rx * 0.36, cy - ry * 0.18, rx * 0.2, ry * 0.2, '#050505')
    ellipse(ctx, cx + rx * 0.36, cy - ry * 0.18, rx * 0.2, ry * 0.2, '#050505')
    // A grin that is much too wide.
    ctx.fillStyle = '#1a0505'
    ctx.beginPath()
    ctx.moveTo(cx - rx * 0.75, cy + ry * 0.2)
    ctx.quadraticCurveTo(cx, cy + ry * 0.85, cx + rx * 0.75, cy + ry * 0.2)
    ctx.quadraticCurveTo(cx, cy + ry * 0.45, cx - rx * 0.75, cy + ry * 0.2)
    ctx.fill()
    ctx.fillStyle = '#f2efe0'
    for (let i = 0; i < 9; i++) {
      const tx = cx - rx * 0.6 + (i * rx * 1.2) / 8
      ctx.fillRect(tx - 1.5, cy + ry * 0.3 + Math.abs(i - 4) * -1.2 + 4, 3, 5)
    }
  }
}

function drawTallManHands(ctx, t) {
  const { x, y, w } = WIN
  ctx.strokeStyle = '#d9d4c7'
  ctx.lineCap = 'round'
  for (const [hx, dir] of [
    [x + 12, 1],
    [x + w - 12, -1],
  ]) {
    for (let f = 0; f < 4; f++) {
      const wig = Math.sin(t * 3 + f) * 3
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(hx, y + 120)
      ctx.lineTo(hx + dir * (6 + f * 6), y + 50 + f * 10 + wig)
      ctx.stroke()
    }
  }
}

function drawCurtains(ctx, closed, dream) {
  const { x, y, w, h } = WIN
  const left = x - 20
  const right = x + w + 20
  const half = (right - left) / 2
  const cw = 24 + (half - 24) * closed
  const top = y - 16
  const bottom = y + h + 26
  rect(ctx, left - 8, top - 5, right - left + 16, 6, '#6d4a2a')
  const base = dream ? '#5a1f4a' : '#b0366f'
  const fold = dream ? '#3d1332' : '#8a2553'
  for (const [cx0, dir] of [
    [left, 1],
    [right, -1],
  ]) {
    const x0 = dir === 1 ? cx0 : cx0 - cw
    rect(ctx, x0, top, cw, bottom - top, base)
    ctx.fillStyle = fold
    const folds = Math.max(2, Math.round(cw / 12))
    for (let i = 0; i < folds; i++) ctx.fillRect(x0 + (i + 0.5) * (cw / folds) - 2, top, 4, bottom - top)
  }
}

// ---------- desk + computer + the Glitch ----------

function drawDesk(ctx, s) {
  rect(ctx, 256, 272, 8, 68, '#5e3d20')
  rect(ctx, 378, 272, 8, 68, '#5e3d20')
  rect(ctx, 248, 262, 144, 12, '#7a5030')
  rect(ctx, 310, 250, 12, 12, '#2a2a30')
  rect(ctx, MONITOR.x, MONITOR.y, MONITOR.w, MONITOR.h, '#2a2a30')
  rect(ctx, SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, '#0a0c10')
  rect(ctx, 286, 255, 62, 6, '#3a3a44')
  rect(ctx, 368, 214, 20, 48, '#34343c')
  const on = s.mode === 'dream' && (s.threats.computer?.stage ?? 0) > 0
  rect(ctx, 374, 220, 4, 3, on ? '#3dff6a' : '#1a3a22')
}

// Screens glow, so this is drawn on top of the darkness.
function drawScreenGlow(ctx, stage, t, progress) {
  if (stage <= 0) return
  const { x, y, w, h } = SCREEN
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  if (stage === 1) {
    rect(ctx, x, y, w, h, '#1c1f26')
    for (let i = 0; i < 160; i++) {
      const g = 90 + Math.random() * 160
      ctx.fillStyle = `rgb(${g},${g},${g})`
      ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2)
    }
  } else {
    rect(ctx, x, y, w, h, '#03200c')
    const jx = stage >= 3 ? (Math.random() - 0.5) * 4 : 0
    drawPixelFace(ctx, x + w / 2 + jx, y + h / 2 - 4, stage >= 3 ? 3.2 : 2.6, '#3dff6a')
    rect(ctx, x + 8, y + h - 8, w - 16, 4, '#0d4a1c')
    rect(ctx, x + 8, y + h - 8, (w - 16) * progress, 4, '#3dff6a')
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  for (let sy = y; sy < y + h; sy += 3) ctx.fillRect(x, sy, w, 1)
  ctx.restore()
  if (stage >= 3) {
    // A green pixel hand has come out of the screen.
    const wave = Math.sin(t * 5) * 3
    ctx.fillStyle = '#3dff6a'
    glow(ctx, '#3dff6a', 12, () => {
      ctx.fillRect(340, 230 + wave, 36, 8)
      for (let f = 0; f < 4; f++) ctx.fillRect(372 + f * 2, 222 + f * 5 + wave, 14, 3)
    })
  }
}

// A creepy smiley made of big square pixels.
function drawPixelFace(ctx, cx, cy, p, color) {
  const face = [
    '..XXXXXXX..',
    '.X.......X.',
    'X..XX.XX..X',
    'X..XX.XX..X',
    'X.........X',
    'X.X.X.X.X.X',
    'X..X.X.X..X',
    '.X.......X.',
    '..XXXXXXX..',
  ]
  ctx.fillStyle = color
  face.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'X') ctx.fillRect(cx + (c - 5.5) * p, cy + (r - 4.5) * p, p, p)
    }
  })
}

// ---------- paintings + the Painted People ----------

function paintingTransform(ctx, p, stage) {
  const tilt = stage >= 2 ? p.tilt * 0.09 : 0
  ctx.translate(p.x + p.w / 2, p.y)
  ctx.rotate(tilt)
  ctx.translate(-(p.x + p.w / 2), -p.y)
}

function drawPaintings(ctx, s) {
  const stage = s.mode === 'dream' ? (s.threats.paintings?.stage ?? 0) : 0
  for (const p of PAINTINGS) {
    ctx.save()
    paintingTransform(ctx, p, stage)
    rect(ctx, p.x - 6, p.y - 6, p.w + 12, p.h + 12, '#b8892f')
    rect(ctx, p.x - 3, p.y - 3, p.w + 6, p.h + 6, '#8a6420')
    rect(ctx, p.x, p.y, p.w, p.h, p.bg)
    ctx.save()
    ctx.beginPath()
    ctx.rect(p.x, p.y, p.w, p.h)
    ctx.clip()
    const cx = p.x + p.w / 2
    const cy = p.y + p.h * 0.42
    if (p.kind === 'lady') {
      ellipse(ctx, cx, p.y + p.h, 24, 20, '#7a1f2a')
      ellipse(ctx, cx, cy - 16, 11, 8, '#5a3418')
      ellipse(ctx, cx, cy, 12, 15, '#e8c39e')
      ellipse(ctx, cx - 12, cy - 2, 4, 12, '#5a3418')
      ellipse(ctx, cx + 12, cy - 2, 4, 12, '#5a3418')
    } else {
      ellipse(ctx, cx, p.y + p.h + 2, 22, 16, '#1f2a4a')
      ellipse(ctx, cx, cy, 11, 13, '#e0b894')
      ellipse(ctx, cx - 11, cy, 3, 6, '#aaaaaa')
      ellipse(ctx, cx + 11, cy, 3, 6, '#aaaaaa')
      ellipse(ctx, cx, cy + 5, 7, 2.5, '#9a9a9a')
    }
    // Eyes: shut when asleep, open (and following you) when awake.
    ctx.strokeStyle = '#2a1a10'
    ctx.lineWidth = 1.5
    for (const ex of [-4.5, 4.5]) {
      if (stage === 0) {
        ctx.beginPath()
        ctx.arc(cx + ex, cy - 3, 2.5, 0.1 * Math.PI, 0.9 * Math.PI)
        ctx.stroke()
      } else {
        ellipse(ctx, cx + ex, cy - 3, 3, 2.6, '#f5f0e0')
      }
    }
    if (stage >= 2) {
      ellipse(ctx, cx, cy + 8, 6, 3.5, '#300')
      rect(ctx, cx - 4, cy + 6, 8, 1.5, '#eee')
    } else {
      ctx.beginPath()
      ctx.arc(cx, cy + 5, 4, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
    }
    ctx.restore()
    ctx.restore()
    if (stage >= 3) {
      // Pale arms reaching out over the bottom of the frame.
      ctx.strokeStyle = '#e8d8c4'
      ctx.lineCap = 'round'
      ctx.lineWidth = 4
      for (const side of [-1, 1]) {
        const wig = Math.sin(s.t * 4 + side) * 4
        ctx.beginPath()
        ctx.moveTo(cx + side * 10, p.y + p.h)
        ctx.quadraticCurveTo(cx + side * 22, p.y + p.h + 30, cx + side * 16 + wig, p.y + p.h + 55)
        ctx.stroke()
        ctx.lineWidth = 2
        for (let f = -1; f <= 1; f++) {
          ctx.beginPath()
          ctx.moveTo(cx + side * 16 + wig, p.y + p.h + 55)
          ctx.lineTo(cx + side * 16 + wig + f * 4, p.y + p.h + 64)
          ctx.stroke()
        }
        ctx.lineWidth = 4
      }
    }
  }
}

function drawPaintingGlow(ctx, stage, aim) {
  if (stage <= 0) return
  for (const p of PAINTINGS) {
    ctx.save()
    paintingTransform(ctx, p, stage)
    const cx = p.x + p.w / 2
    const cy = p.y + p.h * 0.42
    const dx = Math.max(-1.3, Math.min(1.3, (aim.x - cx) / 120))
    const dy = Math.max(-0.8, Math.min(0.8, (aim.y - cy) / 120))
    glow(ctx, '#ff2020', 8, () => {
      for (const ex of [-4.5, 4.5]) ellipse(ctx, cx + ex + dx, cy - 3 + dy, 1.4, 1.4, '#ff3030')
    })
    ctx.restore()
  }
}

// ---------- doors + the Shadow Twins ----------

function doorOpenAmount(stage) {
  return [0, 0.3, 0.65, 1][Math.min(3, stage)]
}

function drawDoor(ctx, side, stage, t, lit) {
  const d = DOORS[side]
  const frame = wallQuad(side, d.outer - (side === 'left' ? 8 : -8), d.inner + (side === 'left' ? 8 : -8), DOOR_TOP - 0.03, 1)
  poly(ctx, frame, lit ? '#e9e4d6' : '#a8a396')
  const hole = wallQuad(side, d.outer, d.inner, DOOR_TOP, 1)
  poly(ctx, hole, '#050507')

  const open = doorOpenAmount(stage)
  // The door swings on its hinge next to the back wall, so a gap opens on Leon's side.
  const free = d.outer + (d.inner - d.outer) * open * 0.82
  const gapMid = (d.outer + free) / 2

  if (stage >= 2) {
    ctx.save()
    poly(ctx, hole)
    ctx.clip()
    const top = wallY(side, gapMid, DOOR_TOP)
    const bottom = wallY(side, gapMid, 1)
    const hgt = bottom - top
    const sway = Math.sin(t * 1.3) * 3
    const hx = gapMid + sway
    const hy = top + hgt * (stage >= 3 ? 0.2 : 0.28)
    const hr = stage >= 3 ? 30 : 22
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(hx, hy + hr * 2.8, hr * 1.4, hr * 2.4, 0, 0, Math.PI * 2)
    ctx.fill()
    ellipse(ctx, hx, hy, hr, hr * 1.15, '#000')
    ctx.strokeStyle = 'rgba(120,60,160,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(hx, hy, hr, hr * 1.15, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  if (open < 1) {
    const panel = wallQuad(side, free, d.inner, DOOR_TOP, 1)
    poly(ctx, panel, lit ? '#a8743f' : '#6a4726', 'rgba(0,0,0,0.35)')
    const kx = free + (d.inner - free) * 0.15
    ellipse(ctx, kx, wallY(side, kx, 0.66), 3.5, 4, '#d9b24a')
  }

  if (stage >= 3) {
    // A long shadowy arm reaches out of the doorway toward Leon.
    const sx = gapMid
    const sy = wallY(side, gapMid, 0.55)
    const dir = side === 'left' ? 1 : -1
    const reach = 90 + Math.sin(t * 2) * 12
    ctx.strokeStyle = '#000'
    ctx.lineCap = 'round'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(sx + dir * reach * 0.6, sy - 30, sx + dir * reach, sy + 20)
    ctx.stroke()
    ctx.lineWidth = 3
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath()
      ctx.moveTo(sx + dir * reach, sy + 20)
      ctx.lineTo(sx + dir * (reach + 22), sy + 20 + f * 8)
      ctx.stroke()
    }
  }
}

// Leon is holding this door shut. If something is behind it, the door shakes.
function drawHeldDoor(ctx, side, stage, t, lit) {
  ctx.save()
  if (stage > 0) ctx.translate(Math.sin(t * 50) * 2, 0)
  drawDoor(ctx, side, 0, t, lit)
  const d = DOORS[side]
  const mx = (d.outer + d.inner) / 2
  ctx.strokeStyle = '#ffd24a'
  ctx.lineWidth = 3
  poly(ctx, wallQuad(side, d.outer, d.inner, DOOR_TOP, 1), null, '#ffd24a', 3)
  // Leon's two hands pushing on the door.
  for (const f of [0.5, 0.62]) {
    const hx = mx + (side === 'left' ? -8 : 8)
    ellipse(ctx, hx, wallY(side, hx, f), 10, 13, '#f1c9a0')
  }
  ctx.restore()
}

function drawDoorGlow(ctx, side, stage, t) {
  if (stage <= 0) return
  const d = DOORS[side]
  const open = doorOpenAmount(stage)
  const free = d.outer + (d.inner - d.outer) * open * 0.82
  const gapMid = (d.outer + free) / 2
  const top = wallY(side, gapMid, DOOR_TOP)
  const bottom = wallY(side, gapMid, 1)
  const hgt = bottom - top
  const blink = Math.sin(t * 0.7 + (side === 'left' ? 0 : 2)) > 0.97
  const sway = Math.sin(t * 1.3) * 3
  const hx = gapMid + sway
  const hy = top + hgt * (stage === 1 ? 0.3 : stage >= 3 ? 0.2 : 0.28)
  const spread = stage === 1 ? 5 : stage === 2 ? 8 : 11
  const size = stage === 1 ? 2.2 : stage === 2 ? 3.2 : 4.5
  if (!blink) {
    glow(ctx, '#fff6a0', 12, () => {
      ellipse(ctx, hx - spread, hy, size, size * 0.7, '#fff8c0')
      ellipse(ctx, hx + spread, hy, size, size * 0.7, '#fff8c0')
    })
  }
  if (stage >= 3) {
    glow(ctx, '#fff6a0', 8, () => {
      ctx.strokeStyle = '#fff8c0'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i <= 6; i++) ctx.lineTo(hx - 14 + i * 4.7, hy + 14 + (i % 2) * 5)
      ctx.stroke()
    })
  }
}

// ---------- the bed + the Grabber ----------

function drawBed(ctx, s) {
  const stage = s.mode === 'dream' ? (s.threats.underBed?.stage ?? 0) : 0
  ellipse(ctx, 480, 440, 230, 30, 'rgba(0,0,0,0.35)')
  // Footboard at the far end of the bed.
  rect(ctx, 312, 366, 16, 78, '#6a4424')
  rect(ctx, 632, 366, 16, 78, '#6a4424')
  ellipse(ctx, 320, 366, 10, 6, '#7d522c')
  ellipse(ctx, 640, 366, 10, 6, '#7d522c')
  rect(ctx, 326, 384, 308, 48, '#8a5a30')
  rect(ctx, 326, 384, 308, 5, '#9e6c3c')

  if (stage >= 1) drawGrabber(ctx, stage, s.t)

  // Blanket, seen from Leon's pillow.
  const blanket = s.mode === 'dream' ? '#2b3f8a' : '#3f64c8'
  poly(ctx, [[150, H], [810, H], [650, 424], [310, 424]], blanket)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  for (let i = 0; i < 16; i++) {
    const fy = hash(i + 3)
    const y = 430 + fy * 100
    const halfW = 170 + fy * 150
    star(ctx, 480 - halfW + hash(i + 40) * halfW * 2, y, 4 + fy * 4)
  }
  // Leon's feet make two bumps.
  ellipse(ctx, 445, 432, 26, 16, blanket)
  ellipse(ctx, 515, 432, 26, 16, blanket)
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(480, 440)
  ctx.lineTo(480, H)
  ctx.stroke()

  if (stage >= 3) drawGrabberHands(ctx, s.t, 452)
  drawTeddy(ctx, 690, 486)
}

function drawGrabber(ctx, stage, t) {
  const rise = stage === 1 ? 0 : stage === 2 ? 16 : 34
  const cx = 480 + Math.sin(t * 0.9) * 6
  const cy = 392 - rise
  ctx.fillStyle = '#0c0a08'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 20, 58, 38, 0, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = '#0c0a08'
  ctx.lineWidth = 3
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (Math.PI * i) / 13
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * 52, cy + 20 + Math.sin(a) * 34)
    ctx.lineTo(cx + Math.cos(a) * 64, cy + 20 + Math.sin(a) * 44)
    ctx.stroke()
  }
  if (stage >= 2) drawGrabberHands(ctx, t, 386)
}

function drawGrabberHands(ctx, t, y) {
  for (const hx of [372, 588]) {
    const wig = Math.sin(t * 3 + hx) * 2
    ellipse(ctx, hx, y + 4, 20, 9, '#1a1410')
    ctx.strokeStyle = '#d8d0b0'
    ctx.lineWidth = 2
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath()
      ctx.moveTo(hx + f * 7, y + 4)
      ctx.quadraticCurveTo(hx + f * 8, y + 14 + wig, hx + f * 6, y + 20 + wig)
      ctx.stroke()
    }
  }
}

function drawGrabberGlow(ctx, stage, t) {
  if (stage <= 0) return
  const rise = stage === 1 ? 0 : stage === 2 ? 16 : 34
  const cx = 480 + Math.sin(t * 0.9) * 6
  const cy = 380 - rise
  glow(ctx, '#ffd21a', 14, () => {
    ellipse(ctx, cx - 16, cy, 6, 4, '#ffe45a')
    ellipse(ctx, cx + 16, cy, 6, 4, '#ffe45a')
    ellipse(ctx, cx - 16, cy, 1.5, 3.5, '#000')
    ellipse(ctx, cx + 16, cy, 1.5, 3.5, '#000')
  })
}

function drawTeddy(ctx, x, y) {
  ellipse(ctx, x, y + 26, 22, 24, '#9a6a3a')
  ellipse(ctx, x, y, 17, 16, '#a8743f')
  ellipse(ctx, x - 13, y - 12, 6, 6, '#a8743f')
  ellipse(ctx, x + 13, y - 12, 6, 6, '#a8743f')
  ellipse(ctx, x, y + 5, 7, 5, '#d8b88a')
  ellipse(ctx, x - 6, y - 3, 2, 2, '#111')
  ellipse(ctx, x + 6, y - 3, 2, 2, '#111')
  ellipse(ctx, x, y + 3, 2.5, 1.8, '#111')
}

// ---------- light & darkness ----------

let darkCanvas = null
function getDark() {
  if (!darkCanvas) {
    darkCanvas = document.createElement('canvas')
    darkCanvas.width = W
    darkCanvas.height = H
  }
  return darkCanvas
}

function punchLight(d, x, y, r, strength) {
  const g = d.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(0,0,0,${strength})`)
  g.addColorStop(0.6, `rgba(0,0,0,${strength * 0.6})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  d.fillStyle = g
  d.beginPath()
  d.arc(x, y, r, 0, Math.PI * 2)
  d.fill()
}

function drawDarkness(ctx, s) {
  const dark = getDark()
  const d = dark.getContext('2d')
  const [tr, tg, tb] = s.tint
  d.globalCompositeOperation = 'source-over'
  d.clearRect(0, 0, W, H)
  const flash = s.flash > 0 ? Math.min(1, s.flash * 3) : 0
  d.fillStyle = `rgba(${Math.round(tr * 0.12)},${Math.round(tg * 0.12)},${Math.round(tb * 0.12)},${0.95 - flash * 0.8})`
  d.fillRect(0, 0, W, H)
  d.globalCompositeOperation = 'destination-out'
  const curtainOpen = 1 - (s.curtain ?? 0)
  if (curtainOpen > 0.05) {
    punchLight(d, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, 150, 0.45 * curtainOpen)
    punchLight(d, 480, 470, 260, 0.12 * curtainOpen)
  }
  if ((s.threats.computer?.stage ?? 0) > 0) punchLight(d, 316, 220, 90, 0.5)
  if (s.lightOn) {
    // The flashlight flickers when the battery is low, or when something is very close.
    const scared = s.danger >= 3 && Math.random() < 0.12
    const flicker = scared ? 0.15 + Math.random() * 0.4 : s.battery < 15 ? 0.7 + Math.random() * 0.3 : 1
    // A soft cone from Leon's hands to the spot the flashlight is pointing at.
    const steps = 8
    for (let i = 1; i <= steps; i++) {
      const k = i / steps
      punchLight(d, 480 + (s.aim.x - 480) * k, 540 + (s.aim.y - 540) * k, 30 + 70 * k, 0.35 * flicker)
    }
    punchLight(d, s.aim.x, s.aim.y, 100, 1 * flicker)
  }
  ctx.drawImage(dark, 0, 0)

  if (s.lightOn) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(s.aim.x, s.aim.y, 0, s.aim.x, s.aim.y, 110)
    g.addColorStop(0, 'rgba(255,230,160,0.22)')
    g.addColorStop(1, 'rgba(255,230,160,0)')
    ctx.fillStyle = g
    ctx.fillRect(s.aim.x - 110, s.aim.y - 110, 220, 220)
    ctx.restore()
  }
}

function drawFlashlight(ctx, s) {
  const ang = Math.atan2(s.aim.y - 560, s.aim.x - 480)
  ctx.save()
  ctx.translate(480, 560)
  ctx.rotate(ang)
  rect(ctx, 0, -9, 70, 18, '#c23a3a')
  rect(ctx, 62, -13, 18, 26, '#9a2c2c')
  rect(ctx, 79, -11, 3, 22, s.lightOn ? '#fff6c0' : '#555')
  ctx.restore()
  // Leon's little hands.
  ellipse(ctx, 480 + Math.cos(ang) * 22, 560 + Math.sin(ang) * 22, 14, 12, '#f1c9a0')
}

// ---------- the whole scene ----------

// s = { mode: 'bedtime' | 'dream' | 'morning', t, threats, curtain, aim, lightOn,
//       battery, flash, tint, hiding, computerProgress }
export function drawScene(ctx, s) {
  const lit = s.mode !== 'dream'
  const threats = s.threats || {}
  const st = (k) => (s.mode === 'dream' ? (threats[k]?.stage ?? 0) : 0)
  const scene = { ...s, threats }

  ctx.save()
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake)
  drawShell(ctx, lit)
  drawDesk(ctx, scene)
  drawWindow(ctx, scene)
  drawPaintings(ctx, scene)
  for (const side of ['left', 'right']) {
    const key = `${side}Door`
    if (s.holding?.[key]) drawHeldDoor(ctx, side, st(key), s.t, lit)
    else drawDoor(ctx, side, st(key), s.t, lit)
  }
  drawBed(ctx, scene)
  if (s.mode === 'dream' && s.walker) drawWalker(ctx, s.walker.p)

  if (s.mode === 'dream') {
    // Dream colors: every nightmare has its own creepy tint.
    const [tr, tg, tb] = s.tint
    ctx.fillStyle = `rgba(${tr},${tg},${tb},0.18)`
    ctx.fillRect(0, 0, W, H)
    drawFlashlight(ctx, s)
    drawDarkness(ctx, scene)
    if (!s.holding?.leftDoor) drawDoorGlow(ctx, 'left', st('leftDoor'), s.t)
    if (!s.holding?.rightDoor) drawDoorGlow(ctx, 'right', st('rightDoor'), s.t + 1.7)
    drawScreenGlow(ctx, st('computer'), s.t, s.computerProgress ?? 0)
    drawPaintingGlow(ctx, st('paintings'), s.aim)
    drawGrabberGlow(ctx, st('underBed'), s.t)
    if (s.walker) drawWalkerGlow(ctx, s.walker.p)
    // When Leon is very scared, his teddy bear stares back with red eyes.
    if (s.fear > 50) {
      glow(ctx, '#ff0000', 10, () => {
        ellipse(ctx, 684, 483, 2.2, 2.2, '#ff2020')
        ellipse(ctx, 696, 483, 2.2, 2.2, '#ff2020')
      })
    }
    drawFearVignette(ctx, s.fear ?? 0, s.t)
    if (st('window') >= 1) {
      glow(ctx, '#fff', 6, () => {
        if (st('window') === 1) {
          ellipse(ctx, WIN.x + 50.5, WIN.y + 68.5, 0.9, 0.9, '#fff')
          ellipse(ctx, WIN.x + 53.5, WIN.y + 68.5, 0.9, 0.9, '#fff')
        }
      })
    }
  } else if (s.mode === 'morning') {
    const g = ctx.createRadialGradient(WIN.x + 70, WIN.y + 70, 10, WIN.x + 70, WIN.y + 70, 600)
    g.addColorStop(0, 'rgba(255,220,140,0.35)')
    g.addColorStop(1, 'rgba(255,220,140,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  ctx.restore()

  if (s.hiding) drawBlanketView(ctx, s.t, s.danger ?? 0)
  // A monster face flashes up for a split second. Was it real?
  if (s.mode === 'dream' && s.hallu) {
    ctx.save()
    ctx.globalAlpha = 0.55
    drawScare(ctx, s.hallu.kind, 0.9, s.t)
    ctx.restore()
  }
}

// A tall, thin shadow that walks past the back wall and is gone.
function walkerPos(p) {
  return { x: 250 + p * 470, y: 150 }
}

function drawWalker(ctx, p) {
  const { x, y } = walkerPos(p)
  const step = Math.sin(p * 40) * 6
  ctx.fillStyle = 'rgba(0,0,0,0.92)'
  ellipse(ctx, x, y, 16, 20, 'rgba(0,0,0,0.92)')
  ctx.beginPath()
  ctx.moveTo(x - 22, y + 18)
  ctx.lineTo(x + 22, y + 18)
  ctx.lineTo(x + 16, y + 120)
  ctx.lineTo(x - 16, y + 120)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.92)'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 8, y + 115)
  ctx.lineTo(x - 10 + step, y + 180)
  ctx.moveTo(x + 8, y + 115)
  ctx.lineTo(x + 10 - step, y + 180)
  ctx.moveTo(x - 20, y + 25)
  ctx.lineTo(x - 30 - step, y + 140)
  ctx.moveTo(x + 20, y + 25)
  ctx.lineTo(x + 30 + step, y + 140)
  ctx.stroke()
}

function drawWalkerGlow(ctx, p) {
  const { x, y } = walkerPos(p)
  glow(ctx, '#ffffff', 8, () => {
    ellipse(ctx, x - 6, y - 3, 2, 1.5, '#fff')
    ellipse(ctx, x + 6, y - 3, 2, 1.5, '#fff')
  })
}

// The edges of the screen go red and throb like a heartbeat when Leon is scared.
function drawFearVignette(ctx, fear, t) {
  if (fear < 45) return
  const k = (fear - 45) / 55
  const beat = 0.6 + 0.4 * Math.max(0, Math.sin(t * (4 + k * 6)))
  const g = ctx.createRadialGradient(W / 2, H / 2, 180, W / 2, H / 2, 560)
  g.addColorStop(0, 'rgba(120,0,0,0)')
  g.addColorStop(1, `rgba(120,0,0,${0.55 * k * beat})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// When Leon hides, the whole screen is the inside of his blanket.
function drawBlanketView(ctx, t, danger) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 600)
  g.addColorStop(0, '#1d2a5c')
  g.addColorStop(1, '#070a18')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let i = 0; i < 30; i++) star(ctx, hash(i + 11) * W, hash(i + 77) * H, 10 + hash(i) * 10)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 18
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(0, 80 + i * 110 + Math.sin(t + i) * 6)
    ctx.quadraticCurveTo(W / 2, 40 + i * 110, W, 90 + i * 110 + Math.sin(t * 1.3 + i) * 6)
    ctx.stroke()
  }
  if (danger >= 2) {
    // Something outside is pressing its fingers into the blanket...
    const px = W / 2 + Math.sin(t * 0.7) * 220
    const py = H / 2 + Math.cos(t * 0.5) * 120
    for (let f = -2; f <= 2; f++) {
      ellipse(ctx, px + f * 26, py - Math.abs(f) * 10 + Math.sin(t * 3 + f) * 4, 11, 30, 'rgba(0,0,0,0.55)', f * 0.12)
    }
    ellipse(ctx, px, py + 55, 60, 40, 'rgba(0,0,0,0.45)')
  }
  ctx.fillStyle = 'rgba(200,210,255,0.8)'
  ctx.font = '14px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.fillText(danger >= 2 ? 'Something is touching the blanket...' : 'Hiding under the blanket...', W / 2, H / 2 - 10)
  ctx.font = '10px "Press Start 2P", monospace'
  ctx.fillStyle = 'rgba(200,210,255,0.55)'
  ctx.fillText('let go of SPACE to peek out', W / 2, H / 2 + 20)
  ctx.textAlign = 'left'
}

// ---------- Leon ----------

// fear goes from 0 (happy) to 1 (terrified). mode: 'awake' | 'sleep' | 'happy'
export function drawLeon(ctx, cx, cy, r, fear, t, mode = 'awake') {
  ctx.save()
  if (fear > 0.8 && mode === 'awake') ctx.translate(Math.sin(t * 40) * 1.5, 0)
  // Pajamas with a star.
  ellipse(ctx, cx, cy + r * 1.25, r * 0.95, r * 0.55, '#3f64c8')
  ctx.fillStyle = '#ffe066'
  star(ctx, cx + r * 0.35, cy + r * 1.15, r * 0.14)
  // Ears + head.
  ellipse(ctx, cx - r * 0.92, cy + r * 0.05, r * 0.18, r * 0.24, '#e8b98c')
  ellipse(ctx, cx + r * 0.92, cy + r * 0.05, r * 0.18, r * 0.24, '#e8b98c')
  ellipse(ctx, cx, cy, r * 0.9, r * 0.95, '#f1c9a0')
  // Messy brown hair.
  ctx.fillStyle = '#5a3a1e'
  ctx.beginPath()
  ctx.ellipse(cx, cy - r * 0.35, r * 0.95, r * 0.6, 0, Math.PI, 0)
  ctx.fill()
  for (let i = 0; i < 7; i++) {
    const hx = cx - r * 0.8 + (i * r * 1.6) / 6
    ctx.beginPath()
    ctx.moveTo(hx - r * 0.14, cy - r * 0.45)
    ctx.lineTo(hx + r * 0.05, cy - r * (0.2 + (i % 2) * 0.1))
    ctx.lineTo(hx + r * 0.16, cy - r * 0.45)
    ctx.fill()
  }
  ellipse(ctx, cx - r * 0.2, cy - r * 1.02, r * 0.12, r * 0.22, '#5a3a1e', -0.4)
  // Rosy cheeks.
  ellipse(ctx, cx - r * 0.55, cy + r * 0.3, r * 0.14, r * 0.09, 'rgba(230,110,110,0.45)')
  ellipse(ctx, cx + r * 0.55, cy + r * 0.3, r * 0.14, r * 0.09, 'rgba(230,110,110,0.45)')

  const ey = cy + r * 0.05
  ctx.strokeStyle = '#3a2410'
  ctx.lineWidth = Math.max(1.5, r * 0.07)
  ctx.lineCap = 'round'
  if (mode === 'sleep') {
    for (const ex of [-0.33, 0.33]) {
      ctx.beginPath()
      ctx.arc(cx + ex * r, ey, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
    }
  } else {
    const blink = Math.sin(t * 1.7) > 0.985
    const size = 0.14 + fear * 0.07
    for (const ex of [-0.33, 0.33]) {
      if (blink) {
        ctx.beginPath()
        ctx.moveTo(cx + ex * r - r * 0.12, ey)
        ctx.lineTo(cx + ex * r + r * 0.12, ey)
        ctx.stroke()
        continue
      }
      ellipse(ctx, cx + ex * r, ey, r * size, r * (size + 0.03), '#fff')
      const look = Math.sin(t * 0.9) * r * 0.04 * (fear > 0.5 ? 2 : 1)
      ellipse(ctx, cx + ex * r + look, ey + r * 0.02, r * 0.08, r * 0.09, '#3b2a1a')
      ellipse(ctx, cx + ex * r + look + r * 0.03, ey - r * 0.02, r * 0.025, r * 0.025, '#fff')
    }
    // Eyebrows go up in the middle when he's scared.
    const lift = mode === 'happy' ? 0 : fear * 0.14
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx + side * r * 0.48, ey - r * 0.25)
      ctx.lineTo(cx + side * r * 0.16, ey - r * (0.27 + lift))
      ctx.stroke()
    }
  }

  // Mouth.
  const my = cy + r * 0.5
  if (mode === 'happy' || (mode === 'awake' && fear < 0.35)) {
    ctx.beginPath()
    ctx.arc(cx, my - r * 0.12, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
  } else if (mode === 'sleep') {
    ellipse(ctx, cx, my, r * 0.06, r * 0.05, '#8a3a2a')
  } else if (fear < 0.7) {
    ctx.beginPath()
    for (let i = 0; i <= 6; i++) ctx.lineTo(cx - r * 0.2 + (i * r * 0.4) / 6, my + (i % 2 ? r * 0.03 : -r * 0.03))
    ctx.stroke()
  } else {
    ellipse(ctx, cx, my + r * 0.02, r * 0.12, r * (0.12 + Math.sin(t * 20) * 0.02), '#5a1a14')
  }
  if (mode === 'awake' && fear > 0.6) {
    // A worried sweat drop.
    ctx.fillStyle = '#9fd8ff'
    ctx.beginPath()
    ctx.moveTo(cx + r * 0.72, cy - r * 0.35)
    ctx.quadraticCurveTo(cx + r * 0.85, cy - r * 0.1, cx + r * 0.72, cy - r * 0.05)
    ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 0.1, cx + r * 0.72, cy - r * 0.35)
    ctx.fill()
  }
  if (mode === 'sleep') {
    ctx.fillStyle = '#cfe0ff'
    ctx.font = `${Math.round(r * 0.4)}px "Press Start 2P", monospace`
    const z = (t * 0.8) % 1
    ctx.globalAlpha = 1 - z
    ctx.fillText('z', cx + r * 0.9, cy - r * 0.8 - z * r * 0.6)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// ---------- HUD ----------

export function drawHud(ctx, s) {
  const hour = Math.min(6, Math.floor(s.t / s.hourLength))
  const label = hour === 0 ? '12 AM' : `${hour} AM`
  ctx.save()
  ctx.font = '22px "Press Start 2P", monospace'
  ctx.fillStyle = '#fff'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 6
  ctx.fillText(label, 18, 40)
  ctx.font = '9px "Press Start 2P", monospace'
  ctx.fillStyle = 'rgba(220,220,255,0.75)'
  ctx.fillText(`Dream ${s.dreamIndex + 1}: ${s.title}`, 18, 60)

  // Flashlight battery.
  const bx = W - 128
  const by = 18
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(bx - 4, by - 4, 118, 36)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.strokeRect(bx, by, 94, 26)
  ctx.fillStyle = '#fff'
  ctx.fillRect(bx + 94, by + 8, 6, 10)
  const pct = Math.max(0, s.battery) / 100
  ctx.fillStyle = pct > 0.5 ? '#6dff7a' : pct > 0.2 ? '#ffd24a' : '#ff4a4a'
  ctx.fillRect(bx + 3, by + 3, 88 * pct, 20)
  ctx.font = '8px "Press Start 2P", monospace'
  ctx.fillStyle = '#fff'
  const secs = Math.ceil((Math.max(0, s.battery) / 100) * s.batterySeconds)
  ctx.fillText(s.batteryDead ? 'EMPTY!' : `FLASHLIGHT ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, bx - 20, by + 44)

  // Leon and how scared he is.
  const fx = 18
  const fy = H - 34
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(fx - 6, fy - 58, 220, 82)
  ctx.shadowBlur = 0
  drawLeon(ctx, fx + 30, fy - 22, 22, s.fear / 100, s.t)
  ctx.fillStyle = '#fff'
  ctx.fillText('SCARED', fx + 70, fy - 30)
  ctx.strokeStyle = '#fff'
  ctx.strokeRect(fx + 70, fy - 22, 130, 14)
  const fp = s.fear / 100
  ctx.fillStyle = fp < 0.5 ? '#8ac6ff' : fp < 0.8 ? '#c78aff' : '#ff4a6a'
  ctx.fillRect(fx + 72, fy - 20, 126 * fp, 10)
  ctx.restore()
}

// ---------- jumpscares ----------

function scareFace(ctx, kind, t) {
  if (kind === 'window') scareTallMan(ctx)
  else if (kind === 'computer') scareGlitch(ctx)
  else if (kind === 'paintings') scarePainted(ctx, t)
  else if (kind === 'underBed') scareGrabber(ctx)
  else scareShadow(ctx, t, kind === 'fear')
}

export function drawScare(ctx, kind, p, t) {
  ctx.save()
  // The screen strobes red and black while the monster lunges at you.
  const strobe = Math.floor(t * 16) % 2 === 0
  rect(ctx, 0, 0, W, H, p < 0.5 && strobe ? '#5a0000' : '#000')
  const shake = 34 * (1 - p * 0.6)
  const dx = (Math.random() - 0.5) * shake
  const dy = (Math.random() - 0.5) * shake
  // It rushes from far away to right in your face in a blink.
  const lunge = Math.min(1, p / 0.12)
  const s = 0.25 + lunge * 1.35 + Math.sin(t * 30) * 0.03
  ctx.save()
  ctx.translate(W / 2 + dx, H / 2 + dy)
  ctx.scale(s, s)
  scareFace(ctx, kind, t)
  ctx.restore()
  // A red ghost copy that jitters beside it.
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(W / 2 + dx + 14 + Math.random() * 10, H / 2 + dy)
  ctx.scale(s * 1.04, s * 1.04)
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)'
  scareFace(ctx, kind, t)
  ctx.restore()
  // TV static and torn lines.
  for (let i = 0; i < 260; i++) {
    const g = Math.random() * 255
    ctx.fillStyle = `rgba(${g},${g},${g},0.35)`
    ctx.fillRect(Math.random() * W, Math.random() * H, 3, 2)
  }
  for (let i = 0; i < 4; i++) {
    const y = Math.random() * H
    const slice = 6 + Math.random() * 20
    ctx.drawImage(ctx.canvas, 0, y, W, slice, (Math.random() - 0.5) * 60, y, W, slice)
  }
  ctx.restore()
}

function scareShadow(ctx, t, many) {
  if (many) {
    for (let i = 0; i < 26; i++) {
      const x = (hash(i + 5) - 0.5) * 900
      const y = (hash(i + 9) - 0.5) * 500
      glow(ctx, '#fff6a0', 10, () => {
        ellipse(ctx, x - 6, y, 3, 2, '#fff8c0')
        ellipse(ctx, x + 6, y, 3, 2, '#fff8c0')
      })
    }
  }
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  for (let i = 0; i < 40; i++) {
    const a = (Math.PI * 2 * i) / 40
    ctx.lineWidth = 10
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 140, Math.sin(a) * 160)
    ctx.lineTo(Math.cos(a) * (190 + Math.sin(t * 9 + i) * 20), Math.sin(a) * (210 + Math.cos(t * 7 + i) * 20))
    ctx.stroke()
  }
  ellipse(ctx, 0, 0, 170, 190, '#000')
  glow(ctx, '#fff6a0', 30, () => {
    ellipse(ctx, -65, -40, 38, 26, '#fff8c0')
    ellipse(ctx, 65, -40, 38, 26, '#fff8c0')
  })
  ellipse(ctx, -65, -40, 7, 7, '#000')
  ellipse(ctx, 65, -40, 7, 7, '#000')
  ctx.fillStyle = '#fff8c0'
  ctx.beginPath()
  ctx.moveTo(-110, 50)
  for (let i = 0; i <= 12; i++) ctx.lineTo(-110 + i * 18.3, 50 + (i % 2 ? 40 : 0))
  for (let i = 12; i >= 0; i--) ctx.lineTo(-110 + i * 18.3, 110 - (i % 2 ? 30 : 0))
  ctx.fill()
}

function scareTallMan(ctx) {
  rect(ctx, -120, -330, 240, 150, '#0b0b0b')
  rect(ctx, -190, -195, 380, 24, '#0b0b0b')
  ellipse(ctx, 0, 0, 170, 220, '#d9d4c7')
  ellipse(ctx, -65, -50, 40, 48, '#050505')
  ellipse(ctx, 65, -50, 40, 48, '#050505')
  glow(ctx, '#fff', 20, () => {
    ellipse(ctx, -65, -45, 6, 6, '#fff')
    ellipse(ctx, 65, -45, 6, 6, '#fff')
  })
  ctx.fillStyle = '#1a0505'
  ctx.beginPath()
  ctx.moveTo(-140, 50)
  ctx.quadraticCurveTo(0, 230, 140, 50)
  ctx.quadraticCurveTo(0, 110, -140, 50)
  ctx.fill()
  ctx.fillStyle = '#f2efe0'
  for (let i = 0; i < 14; i++) {
    const x = -118 + i * 18
    const y = 70 + Math.sin((i / 13) * Math.PI) * 40
    ctx.fillRect(x, y, 10, 16)
  }
}

function scareGlitch(ctx) {
  rect(ctx, -300, -220, 600, 440, '#021a0a')
  for (let i = 0; i < 40; i++) rect(ctx, -300, -220 + Math.random() * 440, 600, 2 + Math.random() * 4, 'rgba(61,255,106,0.15)')
  const off = 6 + Math.random() * 8
  ctx.globalCompositeOperation = 'lighter'
  drawPixelFace(ctx, -off, 0, 34, '#ff0040')
  drawPixelFace(ctx, off, 0, 34, '#0040ff')
  drawPixelFace(ctx, 0, 0, 34, '#3dff6a')
  ctx.globalCompositeOperation = 'source-over'
}

function scarePainted(ctx, t) {
  rect(ctx, -330, -260, 660, 520, '#b8892f')
  rect(ctx, -300, -230, 600, 460, '#2f4a3a')
  ellipse(ctx, 0, -150, 150, 90, '#5a3418')
  ellipse(ctx, 0, 0, 150, 190, '#e8c39e')
  ctx.strokeStyle = '#3a2410'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-40, -180)
  ctx.lineTo(-10, -100)
  ctx.lineTo(-50, -40)
  ctx.lineTo(-20, 30)
  ctx.moveTo(70, -150)
  ctx.lineTo(40, -60)
  ctx.lineTo(80, 10)
  ctx.stroke()
  ellipse(ctx, -60, -40, 36, 30, '#f5f0e0')
  ellipse(ctx, 60, -40, 36, 30, '#f5f0e0')
  glow(ctx, '#ff2020', 30, () => {
    ellipse(ctx, -60 + Math.sin(t * 20) * 3, -40, 14, 14, '#ff2020')
    ellipse(ctx, 60 + Math.sin(t * 20) * 3, -40, 14, 14, '#ff2020')
  })
  ellipse(ctx, 0, 90, 80, 50, '#300')
  rect(ctx, -70, 62, 140, 14, '#eee')
}

function scareGrabber(ctx) {
  ctx.strokeStyle = '#0c0a08'
  ctx.lineWidth = 12
  for (let i = 0; i < 36; i++) {
    const a = (Math.PI * 2 * i) / 36
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 150, Math.sin(a) * 150)
    ctx.lineTo(Math.cos(a) * 220, Math.sin(a) * 210)
    ctx.stroke()
  }
  ellipse(ctx, 0, 0, 190, 180, '#0c0a08')
  glow(ctx, '#ffd21a', 30, () => {
    ellipse(ctx, -70, -50, 44, 30, '#ffe45a')
    ellipse(ctx, 70, -50, 44, 30, '#ffe45a')
  })
  ellipse(ctx, -70, -50, 8, 26, '#000')
  ellipse(ctx, 70, -50, 8, 26, '#000')
  ellipse(ctx, 0, 70, 120, 60, '#3a0808')
  ctx.fillStyle = '#f2efe0'
  for (let i = 0; i < 9; i++) {
    const x = -100 + i * 25
    ctx.beginPath()
    ctx.moveTo(x, 30)
    ctx.lineTo(x + 12, 30)
    ctx.lineTo(x + 6, 62)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x, 112)
    ctx.lineTo(x + 12, 112)
    ctx.lineTo(x + 6, 82)
    ctx.fill()
  }
  ctx.strokeStyle = '#d8d0b0'
  ctx.lineWidth = 8
  for (const side of [-1, 1]) {
    for (let f = -2; f <= 2; f++) {
      ctx.beginPath()
      ctx.moveTo(side * 260, 120 + f * 30)
      ctx.quadraticCurveTo(side * 330, 80 + f * 30, side * 300, 20 + f * 34)
      ctx.stroke()
    }
  }
}
