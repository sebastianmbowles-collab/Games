// SNIPER ALIENS: dark saucers that turn up from wave 2 (in both modes) and shoot a big laser
// at EXACTLY where you are. They can't hit you if you keep moving:
//
//   1. MOVE   it flies to a spot near you
//   2. AIM    a red aiming line follows you while it charges up (about 1.3 seconds)
//   3. LOCK   the line stops following and flashes: it will fire at that spot. MOVE NOW!
//   4. FIRE   a huge laser blasts along the line
//   5. REST   it cools down, then starts again
//
// The UFO can zap them with lasers (2 hits); the T. rex can roar them out of the sky.

import { GROUND, WORLD, drawUFO, text } from './art'
import { PX } from './pixel'
import { sfx } from './sound'

const AIM = 1.3
const LOCK = 0.5
const FIRE = 0.3
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const snap = (v) => Math.round(v / PX) * PX

// where you are (the middle of your UFO, or the T. rex's body)
function you(game) {
  return game.side === 'aliens' ? { x: game.ufo.x, y: game.ufo.y } : { x: game.rex.x, y: game.rex.y - 55 }
}

function newSniper(game) {
  const p = you(game)
  const side = Math.random() < 0.5 ? -1 : 1
  return { x: clamp(p.x + side * 700, -80, WORLD + 80), y: 60, vx: 0, state: 'move', t: rand(1.2, 2), hp: 2, hurt: 0, spot: null, aim: null, seed: rand(0, 10), dead: false }
}

export function startSnipers(game) {
  game.snipers = []
  game.sniperT = 3
  game.sniperIntro = false
}

// how many snipers this wave: none on wave 1, one on waves 2-3, two after that, none at the boss
const wanted = (game) => (game.boss || game.ending ? 0 : game.wave >= 4 ? 2 : game.wave >= 2 ? 1 : 0)

export function updateSnipers(game, dt) {
  if (!game.snipers) startSnipers(game)
  const want = wanted(game)
  game.sniperT -= dt
  if (game.snipers.filter((s) => s.state !== 'leave').length < want && game.sniperT <= 0) {
    game.snipers.push(newSniper(game))
    game.sniperT = rand(6, 9)
    if (!game.sniperIntro) {
      game.sniperIntro = true
      game.toast = { text: 'SNIPER ALIEN! WHEN THE RED LINE FLASHES, MOVE!', t: 4 }
    }
  }
  const p = you(game)
  for (const s of game.snipers) {
    s.hurt = Math.max(0, s.hurt - dt)
    if (want === 0 && s.state !== 'fire' && s.state !== 'crash') s.state = 'leave'
    s.t -= dt
    if (s.state === 'move') {
      if (!s.spot || s.t <= 0.9) s.spot = s.spot || pickSpot(game, p)
      s.x += (s.spot.x - s.x) * Math.min(1, dt * 2.5)
      s.y += (s.spot.y - s.y) * Math.min(1, dt * 2.5)
      if (s.t <= 0) {
        s.state = 'aim'
        s.t = AIM
        s.aim = { ...p }
        sfx.charge()
      }
    } else if (s.state === 'aim') {
      // the aiming line follows you
      s.aim.x += (p.x - s.aim.x) * Math.min(1, dt * 12)
      s.aim.y += (p.y - s.aim.y) * Math.min(1, dt * 12)
      if (s.t <= 0) {
        s.state = 'lock'
        s.t = LOCK
        sfx.lock()
      }
    } else if (s.state === 'lock') {
      if (s.t <= 0) {
        s.state = 'fire'
        s.t = FIRE
        sfx.snipe()
        game.shake = Math.max(game.shake, 8)
        if (!game.ending && hitsYou(game, s)) {
          if (game.side === 'aliens') game.hurtUfo(0, 0, 'SNIPED!')
          else game.hurtRex('SNIPED!')
        }
        const end = beamEnd(s)
        game.fx.burst(end.x, end.y, 14, { speed: 240, life: 0.5, size: 6, color: ['#ff004d', '#ffffff', '#feae34'], type: 'spark', up: 80 })
      }
    } else if (s.state === 'fire') {
      if (s.t <= 0) {
        s.state = 'move'
        s.t = rand(2.2, 3.4)
        s.spot = null
        s.aim = null
      }
    } else if (s.state === 'leave') {
      s.y -= 260 * dt
      if (s.y < -120) s.dead = true
    } else if (s.state === 'crash') {
      s.vy = (s.vy || 0) + 900 * dt
      s.y += s.vy * dt
      s.x += s.vx * dt
      if (s.y > GROUND - 10) {
        s.dead = true
        game.fx.boom(s.x, GROUND - 10)
        game.shake = Math.max(game.shake, 10)
      }
    }
  }
  // the UFO's lasers can zap them
  if (game.side === 'aliens') {
    for (const b of game.bolts) {
      for (const s of game.snipers) {
        if (b.life > 0 && !['crash', 'leave'].includes(s.state) && Math.abs(b.x - s.x) < 50 && Math.abs(b.y - s.y) < 26) {
          b.life = 0
          hurtSniper(game, s, Math.sign(b.vx) || 1)
        }
      }
    }
  }
  game.snipers = game.snipers.filter((s) => !s.dead)
}

// somewhere near you, but not too close
function pickSpot(game, p) {
  const side = Math.random() < 0.5 ? -1 : 1
  const x = clamp(p.x + side * rand(260, 420), 80, WORLD - 80)
  const y = game.side === 'aliens' ? clamp(p.y + rand(-120, 120), 80, 320) : rand(100, 160)
  return { x, y }
}

// the far end of the laser: it stops just past the locked spot (or at the ground)
function beamEnd(s) {
  const dx = s.aim.x - s.x
  const dy = s.aim.y - s.y
  const d = Math.hypot(dx, dy) || 1
  let len = d + 30
  if (dy > 0) len = Math.min(len, ((GROUND - s.y) / dy) * d)
  return { x: s.x + (dx / d) * len, y: s.y + (dy / d) * len }
}

function distToBeam(s, x, y) {
  const e = beamEnd(s)
  const vx = e.x - s.x
  const vy = e.y - s.y
  const k = clamp(((x - s.x) * vx + (y - s.y) * vy) / (vx * vx + vy * vy || 1), 0, 1)
  return Math.hypot(x - (s.x + vx * k), y - (s.y + vy * k))
}

function hitsYou(game, s) {
  if (game.side === 'aliens') return distToBeam(s, game.ufo.x, game.ufo.y) < 34
  const r = game.rex
  return [25, 60, 95].some((h) => distToBeam(s, r.x, r.y - h) < 26)
}

function hurtSniper(game, s, dir) {
  s.hp--
  s.hurt = 0.15
  sfx.hit()
  game.fx.burst(s.x, s.y, 12, { speed: 240, life: 0.4, size: 5, color: ['#ffe14a', '#fff'], type: 'spark' })
  if (s.hp <= 0) {
    s.state = 'crash'
    s.vx = dir * 200
    s.vy = -200
    s.aim = null
    game.fx.text(s.x, s.y - 50, 'SNIPER DOWN! +300', '#ffe14a', 24)
    game.score += 300
    game.earn(4)
    game.gain(game.side === 'aliens' ? 'cells' : 'shards', 2)
  } else if (s.state === 'aim' || s.state === 'lock') {
    // a hit spoils its aim
    s.state = 'move'
    s.t = rand(1.5, 2.5)
    s.spot = null
    s.aim = null
    game.fx.text(s.x, s.y - 50, 'MISSED ME!', '#ffffff', 20)
  }
}

// a T. rex roar knocks them out of the sky
export function roarSnipers(game, hx, hy, reach) {
  for (const s of game.snipers || []) {
    if (['crash', 'leave'].includes(s.state) || Math.hypot(s.x - hx, s.y - hy) > reach) continue
    s.hp = 1
    hurtSniper(game, s, Math.sign(s.x - hx) || 1)
  }
}

// ---------- drawing (world coordinates) ----------

function dots(ctx, x0, y0, x1, y1, step, size) {
  const d = Math.hypot(x1 - x0, y1 - y0)
  const n = Math.floor(d / step)
  for (let i = 0; i <= n; i++) {
    const k = i / Math.max(1, n)
    ctx.fillRect(snap(x0 + (x1 - x0) * k) - size / 2, snap(y0 + (y1 - y0) * k) - size / 2, size, size)
  }
}

export function drawSnipers(ctx, game) {
  const t = game.time
  for (const s of game.snipers || []) {
    if (s.aim && (s.state === 'aim' || s.state === 'lock' || s.state === 'fire')) {
      const e = beamEnd(s)
      if (s.state === 'aim') {
        // a thin aiming line that blinks faster as it charges
        const f = 1 - s.t / AIM
        if (Math.floor(t * (6 + f * 18)) % 2 === 0) {
          ctx.fillStyle = '#ff004d'
          dots(ctx, s.x, s.y + 12, e.x, e.y, 15, PX)
        }
      } else if (s.state === 'lock') {
        ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffffff' : '#ff004d'
        dots(ctx, s.x, s.y + 12, e.x, e.y, PX, PX)
        // a target on the locked spot
        const ax = snap(s.aim.x)
        const ay = snap(s.aim.y)
        ctx.fillRect(ax - 21, ay - PX / 2, 12, PX)
        ctx.fillRect(ax + 9, ay - PX / 2, 12, PX)
        ctx.fillRect(ax - PX / 2, ay - 21, PX, 12)
        ctx.fillRect(ax - PX / 2, ay + 9, PX, 12)
      } else {
        // FIRE! a fat beam that fades out
        const w = snap(6 + 18 * (s.t / FIRE))
        ctx.fillStyle = '#ff004d'
        dots(ctx, s.x, s.y + 12, e.x, e.y, PX, w + 6)
        ctx.fillStyle = '#ffffff'
        dots(ctx, s.x, s.y + 12, e.x, e.y, PX, Math.max(PX, w - 6))
      }
    }
    ctx.save()
    ctx.translate(s.x, s.y + Math.sin(t * 3 + s.seed) * 3)
    ctx.scale(0.9, 0.9)
    drawUFO(ctx, { time: t + s.seed, tint: 'black', mood: 'angry', hurt: s.hurt > 0, stun: s.state === 'crash' })
    ctx.restore()
    // the charging eye under the saucer
    if (s.state === 'aim' || s.state === 'lock') {
      const g = s.state === 'lock' ? 1 : 1 - s.t / AIM
      const r = snap(3 + g * 9)
      ctx.fillStyle = '#ff004d'
      ctx.fillRect(snap(s.x) - r, snap(s.y + 14) - r, r * 2, r * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(snap(s.x) - PX, snap(s.y + 14) - PX, PX * 2, PX * 2)
    }
    if (s.state !== 'crash' && s.state !== 'leave') text(ctx, 'SNIPER', s.x, s.y - 42, 11, '#ff6a8a')
  }
}
