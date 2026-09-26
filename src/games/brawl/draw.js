// Pixel-art renderer. The scene is drawn at 320x180 with whole pixels and the canvas is scaled up
// with `image-rendering: pixelated`, like a 16-bit console.
import { W, H, GROUND, SPECIAL_COST, WINS_NEEDED } from './engine'
import { drawText, textWidth } from './sprites'
import { PixelBuf } from './pixelbuf'
import { paintFighter, pose, stillCanvas, SPRITE_W, SPRITE_H, FOOT_X, FOOT_Y } from './look'

export const SCALE = 2.4 // world units per screen pixel
export const LW = Math.round(W / SCALE)
export const LH = Math.round(H / SCALE)
const LGROUND = Math.round(GROUND / SCALE)
const OUTLINE = '#140c1c'

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

function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= steps; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), 1, 1)
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
  const bands = ['#140c28', '#1c1034', '#28143e', '#3a1a48', '#55204c', '#7a2a4a', '#a33c45', '#cc5a3c', '#e8803a']
  const top = LGROUND - 40
  const bandH = Math.ceil(top / bands.length)
  bands.forEach((color, i) => {
    rect(ctx, 0, i * bandH, LW, bandH, color)
    // Checkerboard dither where two bands meet: the classic pixel-art gradient trick.
    if (i > 0) {
      ctx.fillStyle = bands[i - 1]
      for (let x = 0; x < LW; x++) {
        if (x % 2 === 0) ctx.fillRect(x, i * bandH, 1, 1)
        if (x % 4 === 0) ctx.fillRect(x + 1, i * bandH + 1, 1, 1)
      }
    }
  })
  rect(ctx, 0, bands.length * bandH, LW, LH, bands[bands.length - 1])
  // Twinkly stars
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % LW
    const y = 32 + ((i * 53) % 36)
    rect(ctx, x, y, 1, 1, i % 7 === 0 ? '#ffe27a' : '#f4f4f4')
    if (i % 11 === 0) {
      rect(ctx, x - 1, y, 3, 1, '#f4f4f488')
      rect(ctx, x, y - 1, 1, 3, '#f4f4f488')
    }
  }
  // Big striped sunset sun
  const sunY = LGROUND - 46
  for (let dy = -38; dy <= 38; dy++) {
    if (dy > 4 && dy % 7 < 2 + Math.floor(dy / 14)) continue
    const half = Math.round(Math.sqrt(38 * 38 - dy * dy))
    rect(ctx, LW / 2 - half, sunY + dy, half * 2, 1, dy < -20 ? '#fff0a0' : dy < -6 ? '#ffd84a' : dy < 10 ? '#f7a82a' : '#f07a2a')
  }
  // Two layers of mountains
  for (const [color, h, freq, off] of [['#3a1a3a', 34, 0.035, 0], ['#26122a', 22, 0.06, 2]]) {
    ctx.fillStyle = color
    for (let x = 0; x < LW; x++) {
      const y = Math.round(LGROUND - 40 - h * (0.5 + 0.35 * Math.sin(x * freq + off) + 0.15 * Math.sin(x * freq * 3.1 + off)))
      ctx.fillRect(x, y, 1, LGROUND - y)
    }
  }
  // Fence the crowd leans on
  rect(ctx, 0, LGROUND - 16, LW, 2, '#6a3a22')
  rect(ctx, 0, LGROUND - 14, LW, 1, '#3a1e12')
  for (let x = 4; x < LW; x += 24) rect(ctx, x, LGROUND - 16, 2, 16, '#4a2a18')
  // Wooden floor: planks in perspective, with a mat in the middle
  const floor = ['#8a5a32', '#7a4e2b', '#6b4426', '#5c3a20', '#4a2f1a', '#3a2515']
  const fh = Math.ceil((LH - LGROUND) / floor.length)
  floor.forEach((color, i) => rect(ctx, 0, LGROUND + i * fh, LW, fh, color))
  rect(ctx, 0, LGROUND, LW, 1, '#b07a48')
  for (let i = -12; i <= 12; i++) line(ctx, LW / 2 + i * 22, LGROUND + 1, LW / 2 + i * 44, LH, '#00000030')
  ctx.fillStyle = '#e0393e30'
  for (let y = LGROUND + 3; y < LH - 2; y++) {
    const half = 90 + (y - LGROUND) * 1.6
    ctx.fillRect(Math.round(LW / 2 - half), y, Math.round(half * 2), 1)
  }
  bgCache = c
  return c
}

const CROWD_COLORS = ['#2a1428', '#3a1a3a', '#1c0f1f', '#44203a', '#301830']
function drawCrowd(ctx, clock, excitement) {
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 28; i++) {
      const x = i * 12 + (row % 2 ? 6 : 0) + 3
      const seed = i * 7 + row * 13
      const color = CROWD_COLORS[seed % CROWD_COLORS.length]
      const hop = Math.sin(clock * (6 + excitement * 6) + seed) > 0.4 - excitement * 0.5 ? 1 + Math.round(excitement) : 0
      const y = LGROUND - 30 + row * 6 - hop
      disc(ctx, x, y, 3, color)
      rect(ctx, x - 4, y + 3, 9, 14, color)
      if ((seed % 4 === 0 && hop) || (excitement > 0.5 && seed % 3 === 0)) {
        rect(ctx, x - 5, y - 5, 1, 7, color)
        rect(ctx, x + 5, y - 6, 1, 8, color)
      }
      // A few fans hold up signs
      if (row === 2 && seed % 9 === 0) {
        rect(ctx, x - 5, y - 10 - hop, 11, 6, '#f4f0e0')
        rect(ctx, x - 4, y - 8 - hop, 9, 1, seed % 2 ? '#e0393e' : '#2b7de0')
        rect(ctx, x, y - 4 - hop, 1, 4, '#6a4a2a')
      }
    }
  }
}

// ---------- Fighters ----------

const bufs = [new PixelBuf(SPRITE_W, SPRITE_H), new PixelBuf(SPRITE_W, SPRITE_H)]
const tint = document.createElement('canvas')
tint.width = SPRITE_W
tint.height = SPRITE_H
function whiteFlash(src) {
  const t = tint.getContext('2d')
  t.globalCompositeOperation = 'source-over'
  t.clearRect(0, 0, SPRITE_W, SPRITE_H)
  t.drawImage(src, 0, 0)
  t.globalCompositeOperation = 'source-in'
  t.fillStyle = '#ffffff'
  t.fillRect(0, 0, SPRITE_W, SPRITE_H)
  t.globalCompositeOperation = 'source-over'
  return tint
}

function drawFighter(ctx, f, clock) {
  const ko = f.action?.type === 'ko'
  const fx = Math.round(f.x / SCALE)
  const fy = Math.round(f.y / SCALE)

  // Shadow shrinks as you jump
  const lift = LGROUND - fy
  const sw = Math.max(8, 16 - Math.floor(lift / 6))
  rect(ctx, fx - sw, LGROUND - 1, sw * 2, 2, '#00000066')
  rect(ctx, fx - sw + 3, LGROUND + 1, sw * 2 - 6, 1, '#00000044')

  const p = pose(f, clock)
  if (ko) {
    p.feet = [[-7, 0], [8, 0]]
    p.hands = [[-4, -52], [4, -56]]
    p.lean = 0
  }
  const sprite = paintFighter(bufs[f.side], f.def, p, clock)
  const flashing = f.flash > 0 && Math.floor(f.flash * 30) % 2 === 0

  ctx.save()
  ctx.translate(fx, fy)
  ctx.scale(f.facing, 1)
  if (ko) ctx.rotate(-Math.min(Math.PI / 2, Math.floor(f.action.t * 8) * (Math.PI / 8)))
  ctx.drawImage(flashing ? whiteFlash(sprite) : sprite, -FOOT_X, -FOOT_Y)
  if (f.blocking && Math.floor(clock * 12) % 2 === 0) {
    for (let y = -62; y <= -14; y += 2) rect(ctx, 24 - Math.round(Math.abs(y + 38) / 5), y, 1, 1, '#9fe0ff')
  }
  // Speed lines behind a dash or a punch
  const a = f.action
  if (a?.type === 'special' && f.def.special.type === 'dash' && a.t < 0.46) {
    for (let i = 0; i < 5; i++) rect(ctx, -30 - ((i * 7 + Math.floor(clock * 60)) % 14), -50 + i * 9, 12, 1, '#ffffffaa')
  }
  if (a?.type === 'attack' && a.t >= a.move.on && a.t <= a.move.off) {
    const kick = a.name === 'kick'
    for (let i = 0; i < 3; i++) rect(ctx, (kick ? 14 : 18) + i * 2, (kick ? -34 : -50) + i * 3, 8 - i * 2, 1, '#ffffffcc')
  }
  ctx.restore()
}

// ---------- Projectiles (painted and shaded like the fighters) ----------

const projBuf = new PixelBuf(48, 36)
const PROJ_KIND = { '🔥': 'fire', '⚡': 'bolt', '🌊': 'wave', '🥚': 'egg', '🟢': 'venom', '⚫': 'ink', '🐺': 'wolf' }

function paintProjectile(kind, t) {
  const b = projBuf
  b.clear()
  b.origin(24, 18)
  const flick = Math.floor(t * 20) % 2
  switch (kind) {
    case 'fire': {
      const r = b.part()
      b.poly([[-4, -6], [-18 - flick * 3, -3], [-12, 0], [-20 + flick * 2, 3], [-4, 6]], 0xe0393e, r)
      b.ellipse(0, 0, 8, 7, 0xe0393e, r)
      const m = b.part()
      b.poly([[-2, -4], [-12 + flick * 2, -1], [-2, 4]], 0xf7a82a, m)
      b.ellipse(1, 0, 5.5, 5, 0xf7a82a, m)
      b.ellipse(2, -1, 3, 2.5, 0xfff0a0, b.part())
      break
    }
    case 'bolt': {
      const r = b.part()
      b.poly([[6, -12], [-3, 1], [2, 1], [-6, 13], [8, -2], [2, -2], [8, -12]], 0xf2e60c, r)
      b.line(5, -10, 0, -1, 0xffffff)
      b.line(4, 0, -3, 9, 0xffffff)
      break
    }
    case 'wave': {
      const r = b.part()
      b.ellipse(0, 2, 12, 10, 0x2b7de0, r)
      b.ellipse(-4, 6, 12, 6, 0x1a5ab0, r)
      const foam = b.part()
      b.capsule(-8, -6, 4, -9, 2.5, 3, 0x8fd0ff, foam)
      b.capsule(4, -9, 10, -3 + flick, 3, 1.5, 0xeaf6ff, foam)
      b.dots([[-12, -2], [-14, 1], [13, 4]], 0xffffff)
      break
    }
    case 'egg':
      b.ellipse(0, 0, 5, 6.5, 0xf4f0e0, b.part())
      b.dots([[-2, -2], [1, 2], [2, -3]], 0xc9c0a8)
      break
    case 'venom': {
      const r = b.part()
      b.ellipse(2, 0, 6, 5, 0x4ae04a, r)
      b.poly([[-2, -4], [-12, 0 + flick], [-2, 4]], 0x4ae04a, r)
      b.dots([[-6, 5], [-9, 6 - flick]], 0x4ae04a)
      break
    }
    case 'ink': {
      const r = b.part()
      b.ellipse(1, 0, 7, 6, 0x3a2a5a, r)
      b.ellipse(-6, 3, 4, 3, 0x3a2a5a, r)
      b.dots([[-10, 5], [-12, 2 + flick], [-4, 8]], 0x3a2a5a)
      break
    }
    case 'wolf': {
      // A little running wolf from the pack
      const body = b.part()
      b.capsule(-12, 2, 0, 1, 5, 5, 0x7a8494, body)
      const legs = b.part()
      const s = flick ? 3 : -3
      b.capsule(-9, 5, -11 + s, 12, 1.8, 1.5, 0x6a7484, legs)
      b.capsule(-2, 5, s, 12, 1.8, 1.5, 0x6a7484, legs)
      b.capsule(-16, 0, -22, -4 - flick, 2.5, 3.5, 0x7a8494, b.part())
      b.origin(30, 12)
      const L = { fur: 0x7a8494, light: 0xd4d8e0 }
      // A pup-sized version of Wolf Pack's head
      const ears = b.part()
      b.poly([[-5, -3], [-4, -10], [-1, -5]], L.fur, ears)
      b.poly([[0, -5], [2, -10], [4, -3]], L.fur, ears)
      const h = b.part()
      b.ellipse(-1, 0, 6, 5.5, L.fur, h)
      b.ellipse(5, 2, 5, 2.5, L.fur, h)
      b.ellipse(4, 3, 4, 2, L.light, h)
      b.dots([[2, -2], [3, -2]], 0xf2d23a)
      b.dots([[9, 1], [9, 2]], 0x140c1c)
      break
    }
    default:
  }
  return b.finish()
}

function drawProjectile(ctx, p) {
  const img = paintProjectile(PROJ_KIND[p.emoji] || 'fire', p.spin)
  const x = Math.round(p.x / SCALE)
  const y = Math.round(p.y / SCALE) + (Math.floor(p.spin * 10) % 2)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(p.vx > 0 ? 1 : -1, 1)
  ctx.drawImage(img, -24, -18)
  ctx.restore()
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
      const r = Math.round((big ? 6 : 3) + k * (big ? 16 : 9))
      const color = k < 0.3 ? '#ffffff' : k < 0.6 ? '#ffe27a' : '#f28a2a'
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + (big ? 0.3 : 0)
        const len = i % 2 ? r : Math.round(r * 0.6)
        line(ctx, x + Math.round(Math.cos(ang) * len * 0.4), y + Math.round(Math.sin(ang) * len * 0.4), x + Math.round(Math.cos(ang) * len), y + Math.round(Math.sin(ang) * len), color)
      }
      if (k < 0.45) disc(ctx, x, y, big ? 5 : 3, '#ffffff')
      if (big && k < 0.25) disc(ctx, x, y, 9, '#ffffff66')
    } else if (s.kind === 'block') {
      const r = Math.round(4 + k * 7)
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2
        rect(ctx, x + Math.round(Math.cos(ang) * r), y + Math.round(Math.sin(ang) * r), 1, 1, '#9fe0ff')
      }
    } else if (s.kind === 'dust') {
      const r = Math.round(3 + k * 7)
      disc(ctx, x - 5, y - Math.round(k * 6), r, '#d8c8b0aa')
      disc(ctx, x + 6, y - Math.round(k * 8), r - 1, '#d8c8b088')
      disc(ctx, x, y - Math.round(k * 10), r - 2, '#e8dcc888')
    }
  }
}

// ---------- HUD ----------

function drawHud(ctx, m) {
  const barW = 110
  m.fighters.forEach((f, i) => {
    const left = i === 0
    const x = left ? 34 : LW - 34 - barW
    const y = 6
    // Portrait that winces when hit
    const hurt = f.action?.type === 'hurt' || f.action?.type === 'ko'
    const face = stillCanvas(f.def, 'head', hurt ? (f.action.type === 'ko' ? { ko: true } : { hurt: true }) : {})
    const px = left ? 2 : LW - 32
    rect(ctx, px - 1, 3, 32, 26, OUTLINE)
    rect(ctx, px, 4, 30, 24, left ? '#1c3a5a' : '#5a1c2a')
    ctx.save()
    ctx.beginPath()
    ctx.rect(px, 4, 30, 24)
    ctx.clip()
    // The close-up is 40x36; center it in the 30x24 frame.
    if (left) ctx.drawImage(face, px - 5, -2)
    else {
      ctx.translate(px + 30, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(face, -5, -2)
    }
    ctx.restore()

    rect(ctx, x - 1, y - 1, barW + 2, 9, OUTLINE)
    rect(ctx, x, y, barW, 7, '#3a1a1a')
    const trail = Math.round((f.hpShown / f.def.hp) * barW)
    const now = Math.round((f.hp / f.def.hp) * barW)
    const pct = f.hp / f.def.hp
    const from = (w) => (left ? x + barW - w : x)
    rect(ctx, from(trail), y, trail, 7, '#f4f4f4')
    const col = pct > 0.5 ? '#2bd673' : pct > 0.25 ? '#f2c40c' : '#e0393e'
    rect(ctx, from(now), y, now, 7, col)
    rect(ctx, from(now), y, now, 2, '#ffffff55')
    rect(ctx, from(now), y + 6, now, 1, '#00000044')

    const name = f.def.name
    drawText(ctx, name, left ? x : x + barW - textWidth(name), y + 11, '#f4f4f4', 1, OUTLINE)

    for (let s = 0; s < WINS_NEEDED; s++) {
      const sx = left ? x + barW - 7 - s * 9 : x + s * 9
      rect(ctx, sx, y + 11, 7, 7, OUTLINE)
      rect(ctx, sx + 1, y + 12, 5, 5, s < m.wins[i] ? '#f2b90c' : '#3a3a52')
      if (s < m.wins[i]) rect(ctx, sx + 1, y + 12, 2, 2, '#fff4b0')
    }

    // Special meter
    const mw = 80
    const mx = left ? 6 : LW - 6 - mw
    const my = LH - 8
    const ready = f.meter >= SPECIAL_COST
    rect(ctx, mx - 1, my - 1, mw + 2, 5, OUTLINE)
    rect(ctx, mx, my, mw, 3, '#1c1c2e')
    const mfill = Math.round((f.meter / 100) * mw)
    const mcol = ready ? (Math.floor(m.clock * 8) % 2 ? '#f2b90c' : '#fff4b0') : '#2b9ce0'
    rect(ctx, left ? mx : mx + mw - mfill, my, mfill, 3, mcol)
    rect(ctx, mx + mw * (SPECIAL_COST / 100), my - 1, 1, 5, '#f4f4f4')
    const label = ready ? `* ${f.def.special.name}!` : 'SPECIAL'
    drawText(ctx, label, left ? mx : mx + mw - textWidth(label), my - 8, ready ? '#f2b90c' : '#9b9bb0', 1, OUTLINE)
  })

  rect(ctx, LW / 2 - 13, 2, 26, 19, OUTLINE)
  rect(ctx, LW / 2 - 12, 3, 24, 17, '#26143d')
  rect(ctx, LW / 2 - 12, 3, 24, 1, '#4a2a6a')
  const t = String(Math.ceil(m.timer)).padStart(2, '0')
  drawText(ctx, t, Math.round(LW / 2 - textWidth(t, 2) / 2), 7, m.timer <= 10 ? '#e0393e' : '#f2b90c', 2)
}

function drawBanner(ctx, text, t) {
  const scale = textWidth(text, 4) <= LW - 20 ? 4 : textWidth(text, 3) <= LW - 20 ? 3 : 2
  const s = t < 0.08 ? Math.max(1, scale - 1) : scale
  const w = textWidth(text, s)
  const x = Math.round(LW / 2 - w / 2)
  const y = Math.round(LH / 2 - 26)
  drawText(ctx, text, x + s, y + s, '#3a0a0a', s)
  drawText(ctx, text, x, y, '#f2b90c', s, '#3a0a0a')
}

export function drawMatch(ctx, m) {
  ctx.imageSmoothingEnabled = false
  ctx.save()
  if (m.shake > 0) {
    const amt = Math.ceil(m.shake * 10)
    ctx.translate(Math.round((Math.random() - 0.5) * amt), Math.round((Math.random() - 0.5) * amt))
  }
  ctx.drawImage(background(), 0, 0)
  const excitement = m.phase === 'ko' ? 1 : Math.min(1, m.shake * 3)
  drawCrowd(ctx, m.clock, excitement)
  const order = [...m.fighters].sort((a, b) => (a.action ? 1 : 0) - (b.action ? 1 : 0))
  order.forEach((f) => drawFighter(ctx, f, m.clock))
  m.projectiles.forEach((p) => drawProjectile(ctx, p))
  drawSparks(ctx, m.sparks)
  ctx.restore()
  drawHud(ctx, m)
  if (m.banner) drawBanner(ctx, m.banner, m.phaseT % 1.4)
}
