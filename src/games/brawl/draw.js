// Pixel-art renderer. Everything is drawn at 256x144 with whole-pixel rectangles
// and the canvas is scaled up with `image-rendering: pixelated`, like an 8-bit console.
import { W, GROUND, SPECIAL_COST, WINS_NEEDED } from './engine'
import { HEADS, PROJECTILES, spriteCanvas, drawText, textWidth } from './sprites'

export const SCALE = 3
export const LW = W / SCALE
export const LH = 144
const LGROUND = GROUND / SCALE
const OUTLINE = '#140c1c'
const GLOVE = '#e0393e'
const GLOVE_LIGHT = '#ff8a8a'

const PROJECTILE_ART = {
  '🔥': 'fire',
  '⚡': 'bolt',
  '🌊': 'wave',
  '🥚': 'egg',
  '🟢': 'venom',
  '⚫': 'ink',
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)))
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`
}

// ---------- Pixel primitives (integer coordinates only, so nothing gets blurry) ----------

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color
  cx = Math.round(cx)
  cy = Math.round(cy)
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy + r * 0.8))
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1)
  }
}

// Thick line made of square stamps.
function line(ctx, x0, y0, x1, y1, size, color) {
  ctx.fillStyle = color
  x0 = Math.round(x0)
  y0 = Math.round(y0)
  x1 = Math.round(x1)
  y1 = Math.round(y1)
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  const off = Math.floor(size / 2)
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps)
    const y = Math.round(y0 + ((y1 - y0) * i) / steps)
    ctx.fillRect(x - off, y - off, size, size)
  }
}

// ---------- Background (static part drawn once and cached) ----------

let bgCache = null
function background() {
  if (bgCache) return bgCache
  const c = document.createElement('canvas')
  c.width = LW
  c.height = LH
  const ctx = c.getContext('2d')
  const bands = ['#1a1030', '#26143d', '#3a1a48', '#55204c', '#7a2a4a', '#a33c45', '#cc5a3c', '#e8803a']
  const bandH = Math.ceil(LGROUND / bands.length)
  bands.forEach((color, i) => {
    rect(ctx, 0, i * bandH, LW, bandH, color)
    // Checkerboard dither where two bands meet, the classic 8-bit gradient trick.
    if (i > 0) {
      ctx.fillStyle = bands[i - 1]
      for (let x = 0; x < LW; x++) if (x % 2 === 0) ctx.fillRect(x, i * bandH, 1, 1)
    }
  })
  // Stars
  ctx.fillStyle = '#f4f4f4'
  for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % LW, 26 + ((i * 53) % 34), 1, 1)
  // Striped sunset sun
  const sunY = LGROUND - 26
  for (let dy = -30; dy <= 30; dy++) {
    const y = sunY + dy
    if (dy > 4 && dy % 5 < 2) continue
    const half = Math.round(Math.sqrt(30 * 30 - dy * dy))
    rect(ctx, LW / 2 - half, y, half * 2, 1, dy < -10 ? '#ffe27a' : dy < 5 ? '#f2b90c' : '#f28a2a')
  }
  // Floor
  const floor = ['#6b4a2e', '#5a3d25', '#4a321e', '#3a2717', '#2e1f14']
  const fh = Math.ceil((LH - LGROUND) / floor.length)
  floor.forEach((color, i) => rect(ctx, 0, LGROUND + i * fh, LW, fh, color))
  rect(ctx, 0, LGROUND, LW, 1, '#8a6a48')
  for (let i = -8; i <= 8; i++) line(ctx, LW / 2 + i * 20, LGROUND + 1, LW / 2 + i * 46, LH, 1, '#00000040')
  bgCache = c
  return c
}

function drawCrowd(ctx, clock) {
  for (let row = 0; row < 2; row++) {
    const color = row ? '#2a1428' : '#1c0f1f'
    for (let i = 0; i < 24; i++) {
      const x = i * 11 + (row ? 5 : 0)
      const bob = Math.sin(clock * 6 + i * 1.7 + row) > 0.3 ? 1 : 0
      const y = LGROUND - 24 + row * 9 - bob
      disc(ctx, x, y, 3, color)
      rect(ctx, x - 4, y + 3, 9, 16, color)
      // Some fans wave their arms
      if ((i + row) % 5 === 0 && bob) rect(ctx, x + 4, y - 4, 1, 6, color)
    }
  }
}

// ---------- Fighters ----------

// Where hands and feet go for the current action (world units, facing right).
function pose(f) {
  const a = f.action
  const air = f.y < GROUND
  const swing = Math.sin(f.walkT) * 0.9
  const p = {
    back: [-6 + swing * -10, 0],
    front: [10 + swing * 10, 0],
    handBack: [20, -80],
    handFront: [32, -92],
    lean: 0,
  }
  if (air) {
    p.back = [-14, -14]
    p.front = [18, -18]
  }
  if (f.blocking || a?.blocked) {
    p.handBack = [30, -104]
    p.handFront = [34, -80]
  }
  if (a?.type === 'attack') {
    const mv = a.move
    const out = a.t >= mv.on * 0.6 && a.t <= mv.off + 0.05
    if (a.name === 'punch' && out) p.handFront = [72, -96]
    if (a.name === 'kick' && out) {
      p.front = [82, air ? -30 : -52]
      p.lean = -1
    }
  }
  if (a?.type === 'hurt' && !a.blocked) {
    p.handBack = [-26, -104]
    p.handFront = [-14, -112]
    p.lean = -2
  }
  if (a?.type === 'special') {
    const t = f.def.special.type
    if (t === 'projectile') {
      p.handBack = [52, -90]
      p.handFront = [58, -78]
    } else if (t === 'dash') {
      p.handFront = [70, -86]
      p.lean = 2
    } else if (t === 'uppercut') {
      p.handFront = [22, -160]
    } else if (t === 'slam') {
      p.handBack = [-10, -150]
      p.handFront = [16, -152]
    }
  }
  return p
}

// Each fighter is drawn into its own small canvas, then outlined and stamped onto the screen.
const SPR_W = 64
const SPR_H = 72
const FOOT_X = 32
const FOOT_Y = 68
const work = {}
function scratch(name) {
  if (!work[name]) {
    work[name] = document.createElement('canvas')
    work[name].width = SPR_W
    work[name].height = SPR_H
  }
  return work[name]
}

function renderBody(f, p) {
  const c = scratch('body')
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, SPR_W, SPR_H)
  const col = f.def.color
  const dark = shade(col, -55)
  const light = shade(col, 40)
  const X = (wx) => FOOT_X + wx / SCALE
  const Y = (wy) => FOOT_Y + wy / SCALE
  const up = p.lean // shifts the upper body forward/back by a pixel or two

  // Legs + feet
  line(ctx, X(-8), Y(-46), X(p.back[0]), Y(p.back[1]) - 1, 4, dark)
  line(ctx, X(8), Y(-46), X(p.front[0]), Y(p.front[1]) - 1, 4, dark)
  rect(ctx, X(p.back[0]) - 2, Y(p.back[1]) - 2, 5, 2, OUTLINE)
  rect(ctx, X(p.front[0]) - 1, Y(p.front[1]) - 2, 5, 2, OUTLINE)
  // Back arm
  line(ctx, X(-2) + up, Y(-88), X(p.handBack[0]) + up, Y(p.handBack[1]), 3, dark)
  disc(ctx, X(p.handBack[0]) + up, Y(p.handBack[1]), 2, GLOVE)
  // Torso with rounded corners, belly and belt
  const tx = Math.round(X(-24)) + up
  const ty = Math.round(Y(-104))
  rect(ctx, tx + 1, ty, 14, 21, col)
  rect(ctx, tx, ty + 1, 16, 19, col)
  rect(ctx, tx, ty + 2, 2, 14, shade(col, -30))
  rect(ctx, tx + 6, ty + 5, 6, 9, light)
  rect(ctx, tx, ty + 16, 16, 3, '#f2b90c')
  rect(ctx, tx + 7, ty + 16, 2, 3, '#fff4b0')
  // Front arm + glove
  line(ctx, X(18) + up, Y(-92), X(p.handFront[0]) + up, Y(p.handFront[1]), 3, dark)
  const gx = X(p.handFront[0]) + up
  const gy = Y(p.handFront[1])
  disc(ctx, gx, gy, 3, GLOVE)
  rect(ctx, gx - 1, gy - 2, 1, 1, GLOVE_LIGHT)
  // Head
  const head = HEADS[f.def.key]
  if (head) ctx.drawImage(spriteCanvas(head), Math.round(X(4)) - 8 + up, Math.round(Y(-126)) - 8)
  return c
}

function silhouette(src, color) {
  const c = scratch('sil' + color)
  const ctx = c.getContext('2d')
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, SPR_W, SPR_H)
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, SPR_W, SPR_H)
  ctx.globalCompositeOperation = 'source-over'
  return c
}

function drawFighter(ctx, f, clock) {
  const ko = f.action?.type === 'ko'
  const fx = Math.round(f.x / SCALE)
  const fy = Math.round(f.y / SCALE)

  // Shadow shrinks as you jump
  const lift = LGROUND - fy
  const sw = Math.max(6, 12 - Math.floor(lift / 6))
  rect(ctx, fx - sw, LGROUND, sw * 2, 2, '#00000066')
  rect(ctx, fx - sw + 2, LGROUND + 2, sw * 2 - 4, 1, '#00000044')

  const p = ko ? pose({ ...f, action: null, blocking: false }) : pose(f)
  const body = renderBody(f, p)
  const outline = silhouette(body, OUTLINE)
  const flashing = f.flash > 0 && Math.floor(f.flash * 30) % 2 === 0

  ctx.save()
  ctx.translate(fx, fy)
  ctx.scale(f.facing, 1)
  if (ko) {
    // Topple over backwards in 90° steps' worth of chunky rotation
    const angle = -Math.min(Math.PI / 2, Math.floor(f.action.t * 8) * (Math.PI / 8))
    ctx.rotate(angle)
  }
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(outline, -FOOT_X + ox, -FOOT_Y + oy)
  ctx.drawImage(flashing ? silhouette(body, '#ffffff') : body, -FOOT_X, -FOOT_Y)
  if (f.blocking && Math.floor(clock * 12) % 2 === 0) {
    for (let y = -34; y <= -10; y += 2) rect(ctx, 16 - Math.round(Math.abs(y + 22) / 6), y, 1, 1, '#9fe0ff')
  }
  ctx.restore()
}

function drawProjectile(ctx, p) {
  const art = PROJECTILE_ART[p.emoji] ? PROJECTILES[PROJECTILE_ART[p.emoji]] : HEADS.wolfpack
  const img = spriteCanvas(art)
  const x = Math.round(p.x / SCALE)
  const y = Math.round(p.y / SCALE) + (Math.floor(p.spin * 10) % 2)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(p.vx > 0 ? 1 : -1, 1)
  ctx.drawImage(img, -Math.floor(img.width / 2), -Math.floor(img.height / 2))
  ctx.restore()
  // Little speed-line trail
  const dir = Math.sign(p.vx)
  for (let i = 1; i <= 3; i++) rect(ctx, x - dir * (img.width / 2 + i * 3), y - 1 + (i % 2) * 2, 2, 1, '#ffffff88')
}

function drawSparks(ctx, sparks) {
  for (const s of sparks) {
    const k = 1 - s.life / s.max // 0 → 1 over the spark's life
    const x = Math.round(s.x / SCALE)
    const y = Math.round(s.y / SCALE)
    if (s.kind === 'number') {
      drawText(ctx, s.text, x - Math.floor(textWidth(s.text) / 2), y, '#ffd84a', 1, OUTLINE)
    } else if (s.kind === 'hit' || s.kind === 'heavy') {
      const big = s.kind === 'heavy'
      const r = Math.round((big ? 4 : 2) + k * (big ? 10 : 6))
      const color = k < 0.3 ? '#ffffff' : k < 0.6 ? '#ffe27a' : '#f28a2a'
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2
        rect(ctx, x + Math.round(Math.cos(ang) * r), y + Math.round(Math.sin(ang) * r), 2, 2, color)
      }
      if (k < 0.4) disc(ctx, x, y, big ? 3 : 2, '#ffffff')
    } else if (s.kind === 'block') {
      const r = Math.round(3 + k * 5)
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2
        rect(ctx, x + Math.round(Math.cos(ang) * r), y + Math.round(Math.sin(ang) * r), 1, 1, '#9fe0ff')
      }
    } else if (s.kind === 'dust') {
      const r = Math.round(2 + k * 5)
      disc(ctx, x - 3, y - Math.round(k * 4), r, '#c8b8a0aa')
      disc(ctx, x + 4, y - Math.round(k * 6), r - 1, '#c8b8a088')
    }
  }
}

// ---------- HUD ----------

function drawHud(ctx, m) {
  const barW = 100
  m.fighters.forEach((f, i) => {
    const x = i === 0 ? 6 : LW - 6 - barW
    const y = 5
    rect(ctx, x - 1, y - 1, barW + 2, 7, OUTLINE)
    rect(ctx, x, y, barW, 5, '#3a1a1a')
    const trail = Math.round((f.hpShown / f.def.hp) * barW)
    const now = Math.round((f.hp / f.def.hp) * barW)
    const pct = f.hp / f.def.hp
    // Bars drain toward the outer edge so full bars meet at the timer.
    const from = (w) => (i === 0 ? x + barW - w : x)
    rect(ctx, from(trail), y, trail, 5, '#f4f4f4')
    const col = pct > 0.5 ? '#2bd673' : pct > 0.25 ? '#f2c40c' : '#e0393e'
    rect(ctx, from(now), y, now, 5, col)
    rect(ctx, from(now), y, now, 1, '#ffffff66')

    const name = f.def.name
    const nx = i === 0 ? x : x + barW - textWidth(name)
    drawText(ctx, name, nx, y + 8, '#f4f4f4', 1, OUTLINE)

    // Round-win markers
    for (let s = 0; s < WINS_NEEDED; s++) {
      const sx = i === 0 ? x + barW - 5 - s * 7 : x + s * 7
      rect(ctx, sx, y + 8, 5, 5, OUTLINE)
      rect(ctx, sx + 1, y + 9, 3, 3, s < m.wins[i] ? '#f2b90c' : '#3a3a52')
    }

    // Special meter
    const mw = 60
    const mx = i === 0 ? 6 : LW - 6 - mw
    const my = LH - 6
    const ready = f.meter >= SPECIAL_COST
    rect(ctx, mx - 1, my - 1, mw + 2, 4, OUTLINE)
    const mfill = Math.round((f.meter / 100) * mw)
    const mcol = ready ? (Math.floor(m.clock * 8) % 2 ? '#f2b90c' : '#fff4b0') : '#2b9ce0'
    rect(ctx, i === 0 ? mx : mx + mw - mfill, my, mfill, 2, mcol)
    rect(ctx, mx + mw * (SPECIAL_COST / 100), my - 1, 1, 4, '#f4f4f4')
    const label = ready ? `* ${f.def.special.name}!` : 'SPECIAL'
    const lx = i === 0 ? mx : mx + mw - textWidth(label)
    drawText(ctx, label, lx, my - 8, ready ? '#f2b90c' : '#9b9bb0', 1, OUTLINE)
  })

  // Timer
  rect(ctx, LW / 2 - 11, 2, 22, 15, OUTLINE)
  rect(ctx, LW / 2 - 10, 3, 20, 13, '#26143d')
  const t = String(Math.ceil(m.timer)).padStart(2, '0')
  drawText(ctx, t, Math.round(LW / 2 - textWidth(t, 2) / 2), 5, m.timer <= 10 ? '#e0393e' : '#f2b90c', 2)
}

function drawBanner(ctx, text, t) {
  const scale = textWidth(text, 3) <= LW - 20 ? 3 : 2
  // Pop in: start one size smaller for a moment
  const s = t < 0.08 ? Math.max(1, scale - 1) : scale
  const w = textWidth(text, s)
  drawText(ctx, text, Math.round(LW / 2 - w / 2), Math.round(LH / 2 - 16), '#f2b90c', s, '#3a0a0a')
}

export function drawMatch(ctx, m) {
  ctx.imageSmoothingEnabled = false
  ctx.save()
  if (m.shake > 0) {
    const amt = Math.ceil(m.shake * 8)
    ctx.translate(Math.round((Math.random() - 0.5) * amt), Math.round((Math.random() - 0.5) * amt))
  }
  ctx.drawImage(background(), 0, 0)
  drawCrowd(ctx, m.clock)
  // Whoever is attacking is drawn on top.
  const order = [...m.fighters].sort((a, b) => (a.action ? 1 : 0) - (b.action ? 1 : 0))
  order.forEach((f) => drawFighter(ctx, f, m.clock))
  m.projectiles.forEach((p) => drawProjectile(ctx, p))
  drawSparks(ctx, m.sparks)
  ctx.restore()
  drawHud(ctx, m)
  if (m.banner) drawBanner(ctx, m.banner, m.phaseT % 1.4)
}
