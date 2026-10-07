// Levels: every wave builds a new layout so no two waves play the same.
//
// Dinos: platforms to jump on (some move), kill bricks and lava pools that hurt, bounce pads,
//        gems on the platforms, plus a special event: meteor showers or lava geysers.
// Aliens: floating rocks to fly around, space mines and blinking laser gates that hurt,
//         fuel orbs to grab, plus meteor showers.

import { GROUND, WORLD, TAU, seeded, circle } from './art'
import { PX } from './pixel'
import { sfx } from './sound'

const snap = (v) => Math.round(v / PX) * PX
const INK = '#181425'

// The special event for each wave (wave 1 is calm).
const EVENTS = {
  dinos: [null, 'meteors', 'geysers', 'meteors', 'everything'],
  aliens: [null, 'meteors', 'gates', 'meteors', 'everything'],
}
export const EVENT_NAMES = { meteors: 'METEOR SHOWER!', geysers: 'LAVA GEYSERS!', gates: 'LASER GATES!', everything: 'EVERYTHING AT ONCE!' }

const has = (L, e) => L.event === e || L.event === 'everything'

export function buildLevel(side, wave, startX) {
  const rnd = seeded(1000 + wave * 77 + (side === 'aliens' ? 5 : 0) + Math.floor(Math.random() * 1000))
  const r = (a, b) => a + rnd() * (b - a)
  const L = {
    side,
    wave,
    event: EVENTS[side][wave - 1] ?? 'everything',
    t: 0,
    plats: [],
    kills: [],
    pads: [],
    pools: [],
    gems: [],
    rocks: [],
    mines: [],
    gates: [],
    orbs: [],
    meteors: [],
    meteorT: 3,
  }
  const clear = (x, room = 260) => Math.abs(x - startX) < room
  if (side === 'dinos') {
    let x = 120
    while (x < WORLD - 260) {
      x += r(170, 340)
      if (clear(x)) continue
      const tier = Math.floor(r(0, 3))
      const w = snap(r(96, 210))
      const moving = wave >= 2 && rnd() < 0.25 + wave * 0.05
      const p = { x: snap(x), x0: snap(x), y: snap(GROUND - 96 - tier * 72), w, h: 18, moving, range: r(70, 150), speed: r(0.5, 1.1), phase: r(0, TAU), dx: 0 }
      L.plats.push(p)
      if (!moving && w >= 150 && rnd() < 0.3 + wave * 0.06) {
        const half = snap(w / 2)
        L.kills.push({ x: rnd() < 0.5 ? p.x : p.x + w - half, y: p.y - 18, w: half, h: 18 })
      }
      if (rnd() < 0.65) L.gems.push({ plat: p, ox: w / 2, got: false })
      x += w
    }
    for (let i = 0; i < 2 + wave; i++) {
      const px = snap(r(220, WORLD - 220))
      if (!clear(px, 200)) L.pools.push({ x: px, w: snap(r(60, 110)), g: r(0, 4) })
    }
    for (let i = 0; i < 3; i++) {
      const px = snap(r(200, WORLD - 200))
      if (!clear(px, 120) && !L.pools.some((pl) => px > pl.x - 40 && px < pl.x + pl.w + 40)) L.pads.push({ x: px, squish: 0 })
    }
    if (wave >= 2) {
      for (let i = 0; i < wave + 1; i++) {
        const px = snap(r(200, WORLD - 200))
        if (!clear(px)) L.kills.push({ x: px, y: snap(r(GROUND - 260, GROUND - 150)), w: 36, h: 36, float: true, phase: r(0, TAU) })
      }
    }
  } else {
    for (let i = 0; i < 6 + wave; i++) {
      const px = snap(r(150, WORLD - 150))
      if (!clear(px, 300)) L.rocks.push({ x: px, y: snap(r(90, 290)), w: snap(r(60, 140)), h: snap(r(30, 54)) })
    }
    for (let i = 0; i < 3 + wave * 2; i++) {
      const px = r(150, WORLD - 150)
      if (!clear(px, 260)) L.mines.push({ x: px, y: r(90, 320), phase: r(0, TAU), dead: 0 })
    }
    for (let i = 0; i < 5; i++) L.orbs.push({ x: r(150, WORLD - 150), y: r(100, 320), phase: r(0, TAU), wait: 0 })
    if (has(L, 'gates')) {
      for (let i = 0; i < 4; i++) {
        const px = snap(r(250, WORLD - 250))
        if (!clear(px, 300)) L.gates.push({ x: px, period: r(3, 5), phase: r(0, 5) })
      }
    }
  }
  return L
}

// ---------- each frame ----------

export function updateLevel(L, dt, camX) {
  L.t += dt
  for (const p of L.plats) {
    if (!p.moving) continue
    const nx = snap(p.x0 + Math.sin(L.t * p.speed + p.phase) * p.range)
    p.dx = nx - p.x
    p.x = nx
  }
  for (const pad of L.pads) pad.squish = Math.max(0, pad.squish - dt * 4)
  for (const pl of L.pools) pl.g += dt
  for (const m of L.mines) m.dead = Math.max(0, m.dead - dt)
  for (const o of L.orbs) o.wait = Math.max(0, o.wait - dt)
  // meteors fall from the sky, with a red X showing where each will land
  if (has(L, 'meteors')) {
    L.meteorT -= dt
    if (L.meteorT <= 0) {
      L.meteorT = 1 + Math.random() * 1.6
      const tx = camX + (Math.random() - 0.5) * 820
      const time = 1.4
      const vx = 220 * (Math.random() < 0.5 ? -1 : 1)
      L.meteors.push({ tx, x: tx - vx * time, y: -40, vx, vy: (GROUND + 40) / time, life: time })
    }
  }
  for (const m of L.meteors) {
    m.x += m.vx * dt
    m.y += m.vy * dt
    m.life -= dt
  }
}

// Is this spot over a lava pool?
export const poolAt = (L, x) => L.pools.some((pl) => x > pl.x - 10 && x < pl.x + pl.w + 10)

// A geyser shoots up out of a pool every few seconds (after bubbling as a warning).
function geyser(L, pl) {
  if (!has(L, 'geysers')) return 'off'
  const c = pl.g % 4
  return c < 1.2 ? 'warn' : c < 2.4 ? 'on' : 'off'
}

const overlap = (ax, ay, aw, ah, b) => ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y

function killRect(L, k) {
  return k.float ? { ...k, y: k.y + Math.round(Math.sin(L.t * 2 + k.phase) * 3) * PX } : k
}

// The T. rex meets the level: land on platforms, bounce on pads, get hurt by lava, grab gems.
// Returns 'hurt' if something hurt it this frame.
export function rexInLevel(game, r, oldY, dt) {
  const L = game.level
  if (!L) return null
  const k = game.keys
  r.dropT = Math.max(0, (r.dropT || 0) - dt)
  if (r.plat) {
    r.x += r.plat.dx
    const p = r.plat
    if (r.x < p.x - 18 || r.x > p.x + p.w + 18) {
      r.plat = null
      r.onGround = false
    } else if (k.down) {
      // drop down through the platform
      r.plat = null
      r.onGround = false
      r.dropT = 0.3
    }
  }
  if (r.vy >= 0 && r.dropT <= 0) {
    for (const p of L.plats) {
      if (r.x < p.x - 18 || r.x > p.x + p.w + 18) continue
      if (oldY <= p.y + 2 && r.y >= p.y) {
        if (!r.onGround || r.plat !== p) {
          r.squash = 1
          game.fx.dust(r.x, p.y, 8)
          sfx.land()
        }
        r.y = p.y
        r.vy = 0
        r.onGround = true
        r.plat = p
        break
      }
    }
  }
  // bounce pads
  if (r.vy > 150 && r.y >= GROUND - 4) {
    const pad = L.pads.find((pd) => Math.abs(pd.x - r.x) < 34)
    if (pad) {
      r.y = GROUND - 4
      r.vy = -1080
      r.onGround = false
      r.plat = null
      pad.squish = 1
      sfx.boing()
      game.fx.text(r.x, r.y - 120, 'BOING!', '#f6757a', 22)
    }
  }
  // gems
  for (const gm of L.gems) {
    if (gm.got) continue
    const gx = gm.plat.x + gm.ox
    const gy = gm.plat.y - 30
    if (Math.abs(gx - r.x) < 40 && Math.abs(gy - (r.y - 40)) < 50) {
      gm.got = true
      game.score += 30
      game.earn(2, gx, gy - 20)
      sfx.pickup()
      game.fx.burst(gx, gy, 12, { speed: 180, life: 0.5, size: 6, color: ['#2ce8f5', '#ffffff'], type: 'star' })
    }
  }
  if (r.inv > 0) return null
  const bx = r.x - 22
  const by = r.y - 64
  for (const kb of L.kills) if (overlap(bx, by, 44, 60, killRect(L, kb))) return 'hurt'
  for (const pl of L.pools) {
    if (r.x > pl.x && r.x < pl.x + pl.w) {
      if (r.y >= GROUND - 2 && !r.plat) return 'hurt'
      if (geyser(L, pl) === 'on' && r.y > GROUND - 230) return 'hurt'
    }
  }
  for (const m of L.meteors) {
    if (Math.hypot(m.x - r.x, m.y - (r.y - 40)) < 46) {
      m.life = 0
      return 'hurt'
    }
  }
  return null
}

// Meteors that reach the ground explode (and hurt anyone close by).
export function landMeteors(game, target) {
  const L = game.level
  if (!L) return null
  let hit = null
  for (const m of L.meteors) {
    if (m.y >= GROUND - 6 && m.life > -1) {
      m.life = -2
      game.fx.burst(m.x, GROUND - 10, 18, { speed: 260, life: 0.5, size: 5, color: ['#feae34', '#f77622', '#ffffff'], type: 'spark', up: 120 })
      game.fx.ring(m.x, GROUND - 10, 90, '#feae34', 0.4, 6)
      game.shake = Math.max(game.shake, 5)
      sfx.hit()
      if (target && Math.abs(target.x - m.x) < 70 && target.y > GROUND - 60) hit = 'hurt'
    }
  }
  L.meteors = L.meteors.filter((m) => m.life > -1 && m.y < GROUND + 40)
  return hit
}

// The player's UFO meets the level: bump into rocks, get hurt by mines, gates and meteors,
// and grab fuel orbs. Returns 'hurt' if something hurt it this frame.
export function ufoInLevel(game, p) {
  const L = game.level
  if (!L) return null
  for (const rk of L.rocks) {
    const ox = Math.min(p.x + 52, rk.x + rk.w) - Math.max(p.x - 52, rk.x)
    const oy = Math.min(p.y + 16, rk.y + rk.h) - Math.max(p.y - 16, rk.y)
    if (ox > 0 && oy > 0) {
      // push out the shortest way, with a little bounce
      if (ox < oy) {
        p.x += p.x < rk.x + rk.w / 2 ? -ox : ox
        p.vx *= -0.4
      } else {
        p.y += p.y < rk.y + rk.h / 2 ? -oy : oy
        p.vy *= -0.4
      }
      if (Math.abs(p.vx) + Math.abs(p.vy) > 120) sfx.land()
    }
  }
  for (const o of L.orbs) {
    if (o.wait > 0) continue
    if (Math.hypot(o.x - p.x, o.y + Math.sin(L.t * 2 + o.phase) * 8 - p.y) < 50) {
      o.wait = 10
      p.fuel = Math.min(1, p.fuel + 0.3)
      game.fx.text(o.x, o.y - 30, '+FUEL', '#feae34', 18)
      game.earn(1)
      sfx.pickup()
      o.x = 150 + Math.random() * (WORLD - 300)
    }
  }
  if (p.inv > 0) return null
  for (const m of L.mines) {
    if (m.dead > 0) continue
    if (Math.hypot(m.x - p.x, m.y + Math.sin(L.t * 2 + m.phase) * 6 - p.y) < 46) {
      m.dead = 8
      game.fx.boom(m.x, m.y)
      sfx.boom()
      return 'hurt'
    }
  }
  for (const g of L.gates) {
    if (gateOn(L, g) && Math.abs(g.x - p.x) < 52 && p.y > 70 && p.y < 345) {
      p.vx = Math.sign(p.x - g.x || 1) * 300
      return 'hurt'
    }
  }
  for (const m of L.meteors) {
    if (Math.hypot(m.x - p.x, m.y - p.y) < 48) {
      m.life = -2
      return 'hurt'
    }
  }
  return null
}

const gateOn = (L, g) => (L.t + g.phase) % g.period > g.period * 0.45
const gateWarn = (L, g) => !gateOn(L, g) && (L.t + g.phase) % g.period > g.period * 0.3

// ---------- drawing ----------

function block(ctx, x, y, w, h, fill, top, bottom) {
  ctx.fillStyle = INK
  ctx.fillRect(x - PX, y - PX, w + PX * 2, h + PX * 2)
  ctx.fillStyle = fill
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = top
  ctx.fillRect(x, y, w, PX * 2)
  ctx.fillStyle = bottom
  ctx.fillRect(x, y + h - PX * 2, w, PX * 2)
}

// Everything that sits behind the characters.
export function drawLevel(ctx, L) {
  if (!L) return
  const t = L.t
  for (const pl of L.pools) {
    block(ctx, pl.x, GROUND - PX, pl.w, PX * 5, '#e43b44', '#feae34', '#a22633')
    for (let i = 0; i < pl.w / 18; i++) {
      if ((Math.floor(t * 4) + i) % 3 === 0) {
        ctx.fillStyle = '#fee761'
        ctx.fillRect(snap(pl.x + 6 + i * 18), GROUND - PX * 2, PX, PX)
      }
    }
    const g = geyser(L, pl)
    if (g === 'warn') {
      ctx.fillStyle = Math.floor(t * 10) % 2 ? '#fee761' : '#f77622'
      for (let i = 0; i < 4; i++) ctx.fillRect(snap(pl.x + Math.random() * pl.w), snap(GROUND - 6 - Math.random() * 30), PX * 2, PX * 2)
    } else if (g === 'on') {
      const top = GROUND - 230
      block(ctx, pl.x + PX, top, pl.w - PX * 2, GROUND - top, '#f77622', '#fee761', '#e43b44')
      ctx.fillStyle = '#fee761'
      for (let y = top + 10; y < GROUND; y += 24) ctx.fillRect(snap(pl.x + pl.w / 2 + Math.sin(t * 12 + y) * (pl.w / 3)), snap(y), PX * 2, PX * 3)
    }
  }
  for (const p of L.plats) {
    if (p.moving) block(ctx, p.x, p.y, p.w, p.h, '#b86f50', '#e4a672', '#733e39')
    else {
      block(ctx, p.x, p.y, p.w, p.h, '#5a6988', '#8b9bb4', '#3a4466')
      ctx.fillStyle = '#63c74d'
      ctx.fillRect(p.x, p.y - PX, p.w, PX * 2)
    }
  }
  for (const kb of L.kills) {
    const k = killRect(L, kb)
    block(ctx, k.x, k.y, k.w, k.h, '#e43b44', '#f77622', '#a22633')
    // bubbling lava pattern so they look dangerous
    ctx.fillStyle = '#fee761'
    for (let i = 0; i < k.w / 12; i++) {
      if ((Math.floor(t * 5) + i) % 2) ctx.fillRect(snap(k.x + 3 + i * 12), snap(k.y + 6 + ((i * 7) % (k.h - 9))), PX, PX)
    }
  }
  for (const pad of L.pads) {
    const sq = pad.squish > 0 ? PX * 2 : 0
    ctx.fillStyle = INK
    ctx.fillRect(pad.x - 9, GROUND - 24 + sq, 18, 24 - sq)
    ctx.fillStyle = '#ead4aa'
    ctx.fillRect(pad.x - 6, GROUND - 21 + sq, 12, 21 - sq)
    block(ctx, pad.x - 30, GROUND - 39 + sq * 2, 60, 18 - sq, '#e43b44', '#f6757a', '#a22633')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(pad.x - 18, GROUND - 33 + sq * 2, PX * 2, PX * 2)
    ctx.fillRect(pad.x + 9, GROUND - 33 + sq * 2, PX * 2, PX * 2)
  }
  for (const gm of L.gems) {
    if (gm.got) continue
    const x = snap(gm.plat.x + gm.ox)
    const y = snap(gm.plat.y - 30 + Math.sin(t * 3 + gm.ox) * 4)
    ctx.fillStyle = INK
    ctx.fillRect(x - 9, y - 12, 18, 24)
    ctx.fillRect(x - 12, y - 6, 24, 12)
    ctx.fillStyle = '#2ce8f5'
    ctx.fillRect(x - 6, y - 9, 12, 18)
    ctx.fillRect(x - 9, y - 3, 18, 6)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 3, y - 6, PX, PX)
  }
  for (const rk of L.rocks) {
    block(ctx, rk.x, rk.y, rk.w, rk.h, '#5a6988', '#8b9bb4', '#3a4466')
    ctx.fillStyle = '#3a4466'
    ctx.fillRect(snap(rk.x + rk.w * 0.25), snap(rk.y + rk.h * 0.4), PX * 3, PX * 2)
    ctx.fillRect(snap(rk.x + rk.w * 0.65), snap(rk.y + rk.h * 0.55), PX * 2, PX * 2)
  }
  for (const o of L.orbs) {
    if (o.wait > 0) continue
    const y = o.y + Math.sin(t * 2 + o.phase) * 8
    ctx.fillStyle = 'rgba(254,174,52,0.3)'
    circle(ctx, o.x, y, 26)
    ctx.fill()
    ctx.fillStyle = INK
    ctx.fillRect(snap(o.x) - 12, snap(y) - 15, 24, 30)
    ctx.fillStyle = '#feae34'
    ctx.fillRect(snap(o.x) - 9, snap(y) - 12, 18, 24)
    ctx.fillStyle = '#fee761'
    ctx.fillRect(snap(o.x) - 6, snap(y) - 9, PX, 12)
  }
  for (const m of L.mines) {
    if (m.dead > 0) continue
    const y = snap(m.y + Math.sin(t * 2 + m.phase) * 6)
    const x = snap(m.x)
    ctx.fillStyle = INK
    for (const [dx, dy] of [[0, -24], [0, 18], [-24, 0], [18, 0]]) ctx.fillRect(x + dx - 3, y + dy - 3, 12, 12)
    ctx.fillStyle = '#5a6988'
    for (const [dx, dy] of [[0, -21], [0, 18], [-21, 0], [18, 0]]) ctx.fillRect(x + dx, y + dy, 6, 6)
    block(ctx, x - 15, y - 15, 30, 30, '#a22633', '#e43b44', '#3e2731')
    ctx.fillStyle = Math.floor(t * 4 + m.phase) % 2 ? '#fee761' : '#3e2731'
    ctx.fillRect(x - 3, y - 3, 6, 6)
  }
  for (const g of L.gates) {
    const on = gateOn(L, g)
    for (const y of [64, 340]) block(ctx, g.x - 12, y, 24, 18, '#3a4466', '#8b9bb4', '#262b44')
    if (on) {
      ctx.fillStyle = '#ff0044'
      ctx.fillRect(g.x - 6, 82, 12, 258)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(g.x - 2, 82, 4, 258)
    } else if (gateWarn(L, g) && Math.floor(t * 8) % 2) {
      ctx.fillStyle = 'rgba(255,0,68,0.5)'
      for (let y = 88; y < 336; y += 18) ctx.fillRect(g.x - 3, y, 6, 9)
    }
  }
  // where meteors are about to land
  for (const m of L.meteors) {
    if (m.y > GROUND - 60 || L.side === 'aliens') continue
    if (Math.floor(t * 8) % 2) {
      ctx.fillStyle = '#ff0044'
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(snap(m.tx + i * 6) - 3, GROUND + 6 + i * 3, 6, 6)
        ctx.fillRect(snap(m.tx - i * 6) - 3, GROUND + 6 + i * 3, 6, 6)
      }
    }
  }
}

// Meteors fly in front of everything.
export function drawLevelFront(ctx, L, fx) {
  if (!L) return
  for (const m of L.meteors) {
    if (m.life <= -1) continue
    const x = snap(m.x)
    const y = snap(m.y)
    ctx.fillStyle = INK
    ctx.fillRect(x - 18, y - 18, 36, 36)
    ctx.fillStyle = '#733e39'
    ctx.fillRect(x - 15, y - 15, 30, 30)
    ctx.fillStyle = '#b86f50'
    ctx.fillRect(x - 12, y - 12, 12, 9)
    if (Math.random() < 0.6) fx.add({ x: m.x - m.vx * 0.04 + (Math.random() - 0.5) * 20, y: m.y - 20, vx: -m.vx * 0.2, vy: -60, life: 0.4, size: 8, color: Math.random() < 0.5 ? '#f77622' : '#feae34', type: 'dot', drag: 1 })
  }
}
