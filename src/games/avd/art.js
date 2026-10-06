// All the drawing for Aliens VS Dinos: dinosaurs, UFOs, tractor beams and the prehistoric world.
// The characters are pixel-art sprites (see sprites.js); the scenery is drawn in flat pixel colours.

import { PX } from './pixel'
import { sprite, PAL } from './sprites'

export const W = 960
export const H = 540
export const GROUND = 456
export const WORLD = 2880
export const TAU = Math.PI * 2
export const FONT = '"Trebuchet MS", "Comic Sans MS", "Chalkboard SE", sans-serif'
export const INK = '#1d1630'

export const DINO_KINDS = {
  rex: { body: '#5cbf4f', belly: '#d9f2a2', spots: '#3f9a38', legs: 2, lift: 1 },
  trike: { body: '#ef9440', belly: '#ffd9a1', spots: '#c96e22', legs: 4, lift: 0.85 },
  stego: { body: '#9a6ad8', belly: '#dccaf7', spots: '#7448b5', legs: 4, lift: 0.85 },
  raptor: { body: '#39a8d0', belly: '#c4ecfa', spots: '#24799a', legs: 2, lift: 1.15 },
  bronto: { body: '#79b06a', belly: '#d5ecc1', spots: '#5a8c4c', legs: 4, lift: 0.7 },
}
export const KIND_LIST = Object.keys(DINO_KINDS)

export function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// A seeded random number maker, so the scenery looks the same every time.
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Where a local point lands on the tiny pixel screen.
function loPoint(T, x, y) {
  return [T.a * x + T.c * y + T.e, T.b * x + T.d * y + T.f]
}

// Stamps a pixel sprite with its anchor at local point (x, y). Rotation is ignored on purpose so
// pixels always stay square; mirroring (a negative x scale) flips the sprite.
// o.ox / o.oy nudge it by whole pixels, o.p forces the pixel size.
export function blit(ctx, s, x = 0, y = 0, o = {}) {
  const T = ctx.getTransform()
  const k = Math.hypot(T.a, T.b) * PX * (o.scale || 1)
  const p = o.p || Math.max(1, Math.round(k))
  const flip = T.a < 0 !== !!o.flip
  const [X, Y] = loPoint(T, x, y)
  const ax = flip ? s.w - s.ax : s.ax
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(flip ? s.flipped : s.img, Math.round(X - ax * p) + (o.ox || 0) * p, Math.round(Y - s.ay * p) + (o.oy || 0) * p, s.w * p, s.h * p)
  ctx.restore()
  return p
}

// A pixel-art dino with its feet at (0, 0), facing right. Options:
// walk (leg cycle), moving, scared, blink, roar (0..1), flail (being beamed up), lookUp, angry, time.
// Small dinos (drawn at about half size) use the baby sprites.
export function drawDino(ctx, kind, o = {}) {
  const T = ctx.getTransform()
  const k = Math.hypot(T.a, T.b) * PX
  const baby = k < 0.62
  let frame = 'walk0'
  if (o.flail) frame = 'lift'
  else if (o.roar > 0.3) frame = kind === 'rex' || kind === 'raptor' ? 'roar' : 'lift'
  else if (o.moving) frame = Math.floor((o.walk || 0) / (Math.PI / 2)) % 2 ? 'walk1' : 'walk0'
  const s = sprite(baby ? 'baby' : 'dino', {
    kind,
    frame,
    blink: !!o.blink && !o.flail,
    scared: !!o.scared && frame !== 'roar',
    lookUp: !!o.lookUp,
    angry: !!o.angry,
    gold: !!o.gold,
  })
  const t = o.time || 0
  const ox = o.flail ? Math.round(Math.sin(t * 18)) : 0
  const oy = o.moving && frame === 'walk1' ? -1 : 0
  blit(ctx, s, 0, 0, { p: baby ? Math.max(1, Math.round(k / 0.55)) : undefined, ox, oy })
}

// A pixel-art flying saucer centred on (0, 0). Options: time, enemy, hurt (flash), stun, mood, scale.
export function drawUFO(ctx, o = {}) {
  const t = o.time || 0
  const s = sprite('ufo', {
    enemy: !!o.enemy,
    light: Math.floor(t * 8) % 3,
    mood: o.stun || o.mood === 'dizzy' ? 'dizzy' : '',
    hurt: !!o.hurt,
    gold: !!o.gold,
  })
  const p = blit(ctx, s, 0, 0, { scale: o.scale || 1, ox: o.stun ? Math.round(Math.sin(t * 30)) : 0 })
  if (o.stun) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * TAU) / 3
      blit(ctx, sprite('star', { color: PAL.yellow }), Math.cos(a) * 34 * (o.scale || 1), (-36 + Math.sin(a) * 6) * (o.scale || 1), { p })
    }
  }
}

export function drawAlien(ctx, x, y, o = {}) {
  const bob = Math.sin((o.time || 0) * 3) > 0 ? -1 : 0
  blit(ctx, sprite('alien', { enemy: !!o.enemy, mood: o.mood || 'happy' }), x, y, { oy: bob })
}

export function drawStar(ctx, x, y, r, color) {
  blit(ctx, sprite('star', { color }), x, y)
}

// A pixel tractor beam shining down from (x, top) to the ground, with bright bands sliding upward.
export function drawBeam(ctx, x, top, bottom, time, o = {}) {
  const T = ctx.getTransform()
  const kk = Math.hypot(T.a, T.b)
  const [X, Y0] = loPoint(T, x, top)
  const Y1 = loPoint(T, x, bottom)[1]
  const wt = 16 * kk
  const wb = (o.width || 70) * kk
  const power = o.power ?? 1
  const c = o.rgb || (o.enemy ? '255,0,68' : '44,232,245')
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const y0 = Math.round(Y0)
  const y1 = Math.round(Y1)
  const shift = Math.floor(time * 24)
  for (let y = y0; y <= y1; y++) {
    const f = (y - y0) / Math.max(1, y1 - y0)
    const hw = Math.round(wt + (wb - wt) * f)
    const band = (y - y0 + shift) % 7 === 0
    ctx.fillStyle = `rgba(${c},${(band ? 0.5 : 0.2) * power})`
    ctx.fillRect(Math.round(X) - hw, y, hw * 2, 1)
    ctx.fillStyle = `rgba(${c},${0.65 * power})`
    ctx.fillRect(Math.round(X) - hw, y, 1, 1)
    ctx.fillRect(Math.round(X) + hw - 1, y, 1, 1)
  }
  ctx.fillStyle = `rgba(${c},${0.4 * power})`
  ctx.fillRect(Math.round(X - wb * 1.2), y1 - 1, Math.round(wb * 2.4), 2)
  ctx.restore()
}

export function drawMothership(ctx, x, y, s, time, hatch = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (hatch > 0) drawBeam(ctx, 0, 40, 340, time, { rgb: '254,231,97', width: 120 * hatch, power: hatch })
  const p = blit(ctx, sprite('mothership', { light: Math.floor(time * 4) % 4 }))
  if (hatch > 0) {
    const T = ctx.getTransform()
    const [X, Y] = loPoint(T, 0, 40)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = PAL.yellow
    const hw = Math.round(14 * hatch) * p
    ctx.fillRect(Math.round(X) - hw, Math.round(Y) - p, hw * 2, 2 * p)
  }
  ctx.restore()
}

export function drawEgg(ctx, x, y, crack, time) {
  const ox = crack > 0.2 ? Math.round(Math.sin(time * 30) * crack) : 0
  blit(ctx, sprite('egg', { crack: crack > 0.5 }), x, y, { ox })
}

export function drawLeaf(ctx, x, y, time) {
  const oy = Math.round(Math.sin(time * 3 + x) * 1.5)
  blit(ctx, sprite('leaf'), x, y - 14, { oy })
}

// ---------- the prehistoric world ----------

const THEMES = {
  // a purple alien night
  aliens: {
    sky: ['#181425', '#262b44', '#68386c'],
    far: '#262b44',
    mid: '#193c3e',
    near: '#265c42',
    ground: '#3e2731',
    grass: '#3e8948',
    stars: 1,
  },
  // a blue moonlit dino night
  dinos: {
    sky: ['#181425', '#262b44', '#124e89'],
    far: '#262b44',
    mid: '#193c3e',
    near: '#265c42',
    ground: '#3e2731',
    grass: '#3e8948',
    stars: 1,
  },
  night: {
    sky: ['#181425', '#181425', '#262b44'],
    far: '#262b44',
    mid: '#193c3e',
    near: '#265c42',
    ground: '#3e2731',
    grass: '#265c42',
    stars: 1,
  },
  // the brightest night: a full moon after the aliens have gone
  moonlit: {
    sky: ['#262b44', '#3a4466', '#5a6988'],
    far: '#3a4466',
    mid: '#265c42',
    near: '#3e8948',
    ground: '#733e39',
    grass: '#63c74d',
    stars: 1,
  },
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t)
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t)
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t)
  return `rgb(${r},${g},${bl})`
}

export function mixTheme(a, b, t) {
  const A = THEMES[a]
  const B = THEMES[b]
  const out = { stars: A.stars + (B.stars - A.stars) * t }
  for (const key of ['far', 'mid', 'near', 'ground', 'grass']) out[key] = mixHex(A[key], B[key], t)
  out.sky = A.sky.map((c, i) => mixHex(c, B.sky[i], t))
  return out
}

export function getTheme(name) {
  return mixTheme(name, name, 0)
}

const rnd = seeded(66)
const STARS = Array.from({ length: 120 }, () => ({ x: rnd() * W, y: rnd() * 300, r: rnd() * 1.6 + 0.4, p: rnd() * TAU }))
const MOUNTAINS = Array.from({ length: 14 }, (_, i) => ({ x: i * 260 + rnd() * 80, h: 110 + rnd() * 90, w: 200 + rnd() * 120 }))
const VOLCANOES = [
  { x: 520, h: 190 },
  { x: 1900, h: 220 },
]
const HILLS = Array.from({ length: 22 }, (_, i) => ({ x: i * 190 + rnd() * 60, r: 90 + rnd() * 70 }))
const TREES = Array.from({ length: 30 }, () => ({ x: rnd() * (WORLD + 400) - 200, h: 70 + rnd() * 60, kind: rnd() < 0.5 ? 0 : 1, p: rnd() * TAU }))
const ROCKS = Array.from({ length: 26 }, () => ({ x: rnd() * WORLD, r: 6 + rnd() * 12 }))
const GRASS = Array.from({ length: 160 }, () => ({ x: rnd() * (WORLD + 400) - 200, h: 8 + rnd() * 14, p: rnd() * TAU }))
const CLOUDS = Array.from({ length: 9 }, () => ({ x: rnd() * 3000, y: 50 + rnd() * 140, s: 0.6 + rnd() * 0.8, v: 6 + rnd() * 10 }))

export const volcanoTops = (camX) => VOLCANOES.map((v) => ({ x: v.x + camX * 0.65, y: GROUND - 40 - v.h }))

// Sky is drawn in screen space; everything else goes inside the camera transform.
export function drawSky(ctx, theme, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, theme.sky[0])
  g.addColorStop(0.55, theme.sky[1])
  g.addColorStop(1, theme.sky[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  if (theme.stars > 0) {
    // each star is exactly one chunky pixel, and some twinkle off and on
    for (const s of STARS) {
      if (Math.sin(time * 2 + s.p) < -0.6) continue
      ctx.globalAlpha = theme.stars
      ctx.fillStyle = s.r > 1.5 ? '#fff6c0' : '#ffffff'
      const size = s.r > 1.7 ? 6 : 3
      ctx.fillRect(Math.floor(s.x / 3) * 3, Math.floor(s.y / 3) * 3, size, size)
    }
    ctx.globalAlpha = 1
  }
  if (theme.stars > 0.5 && theme.moon !== false) drawMoon(ctx, 884, 156)
}

export function drawMoon(ctx, x, y) {
  ctx.save()
  ctx.fillStyle = 'rgba(234,212,170,0.12)'
  for (const r of [70, 54]) {
    circle(ctx, x, y, r)
    ctx.fill()
  }
  ctx.restore()
  blit(ctx, sprite('moon'), x, y)
}

// Each layer moves at its own speed (parallax): far things slide slower than near things.
export function drawBackdrop(ctx, theme, camX, time) {
  const par = (f) => camX * (1 - f)
  // clouds
  for (const c of CLOUDS) {
    const x = ((c.x + time * c.v) % 3400) - 300 + par(0.15)
    blit(ctx, sprite('cloud'), x, c.y)
  }
  // far mountains
  ctx.fillStyle = theme.far
  for (const m of MOUNTAINS) {
    const x = m.x + par(0.25) - 200
    ctx.beginPath()
    ctx.moveTo(x - m.w / 2, GROUND)
    ctx.lineTo(x, GROUND - 60 - m.h)
    ctx.lineTo(x + m.w / 2, GROUND)
    ctx.fill()
  }
  // volcanoes with glowing lava tops
  for (const v of VOLCANOES) {
    const x = v.x + par(0.35)
    const top = GROUND - 40 - v.h
    ctx.fillStyle = theme.far
    ctx.beginPath()
    ctx.moveTo(x - 190, GROUND)
    ctx.lineTo(x - 28, top)
    ctx.lineTo(x + 28, top)
    ctx.lineTo(x + 190, GROUND)
    ctx.fill()
    ctx.fillStyle = 'rgba(60,25,30,0.35)'
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x + 28, top)
    ctx.lineTo(x + 190, GROUND)
    ctx.lineTo(x + 40, GROUND)
    ctx.fill()
    ctx.fillStyle = '#ff7a2a'
    ctx.beginPath()
    ctx.moveTo(x - 28, top)
    ctx.lineTo(x + 28, top)
    ctx.lineTo(x + 12, top + 26)
    ctx.lineTo(x + 4, top + 12)
    ctx.lineTo(x - 8, top + 34)
    ctx.lineTo(x - 14, top + 14)
    ctx.closePath()
    ctx.fill()
    // smoke puffs drifting up out of the crater
    for (let i = 0; i < 6; i++) {
      const f = (time * 0.18 + i / 6 + v.x) % 1
      ctx.globalAlpha = 0.45 * (1 - f) * Math.min(1, f * 6)
      ctx.fillStyle = '#8a8296'
      circle(ctx, x + Math.sin(f * 5 + i) * 14 + f * 50, top - 10 - f * 150, 14 + f * 30)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, top, 4, x, top, 70)
    g.addColorStop(0, `rgba(255,140,40,${0.45 + 0.1 * Math.sin(time * 3)})`)
    g.addColorStop(1, 'rgba(255,140,40,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 70, top - 70, 140, 140)
    ctx.restore()
  }
  // mid hills
  ctx.fillStyle = theme.mid
  for (const h of HILLS) {
    circle(ctx, h.x + par(0.55) - 300, GROUND + 30, h.r)
    ctx.fill()
  }
  // trees: pixel palms and bushy trees
  for (const tr of TREES) {
    const x = tr.x + par(0.8)
    blit(ctx, tr.kind === 0 ? sprite('palm', { lean: tr.p > Math.PI ? 1 : -1 }) : sprite('bush'), x, GROUND + 3)
  }
}

const snap = (v) => Math.round(v / PX) * PX

export function drawGround(ctx, theme, camX) {
  const x0 = snap(camX - W)
  const x1 = snap(camX + W)
  ctx.fillStyle = theme.ground
  ctx.fillRect(x0, GROUND, x1 - x0, H)
  ctx.fillStyle = theme.grass
  ctx.fillRect(x0, GROUND - PX * 2, x1 - x0, PX * 4)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(x0, GROUND + PX * 2, x1 - x0, PX)
  // pebbles and bits of dirt, one chunky pixel at a time
  for (const r of ROCKS) {
    if (r.x < x0 || r.x > x1) continue
    const y = GROUND + 24 + (Math.floor(r.r) % 5) * 9
    ctx.fillStyle = PAL.dkbrown
    ctx.fillRect(snap(r.x), snap(y), snap(r.r) + PX, PX * 2)
    ctx.fillStyle = PAL.plum
    ctx.fillRect(snap(r.x), snap(y) + PX * 2, snap(r.r) + PX, PX)
  }
}

// Little pixel grass tufts drawn on top of everyone, so the dinos look like they stand in the grass.
export function drawForeground(ctx, theme, camX, time) {
  for (const g of GRASS) {
    if (g.x < camX - W || g.x > camX + W) continue
    const x = snap(g.x)
    const h = (2 + (Math.floor(g.h) % 3)) * PX
    const sway = Math.sin(time * 2 + g.p) > 0.4 ? PX : 0
    ctx.fillStyle = theme.grass
    ctx.fillRect(x, GROUND + PX * 2 - h, PX, h)
    ctx.fillRect(x + sway, GROUND + PX * 2 - h - PX, PX, PX)
    ctx.fillRect(x - PX, GROUND + PX * 2 - PX, PX, PX)
  }
}

export { text } from './pixel'
