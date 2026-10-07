// EGG UFO (Dinos mode): one comes every wave (not at the boss). It drops an alien egg that
// hatches after 5 seconds. The baby alien runs at your baby dinos, and if it gets one it
// THROWS it up to the Egg UFO. Roar at the alien to scare it away... but it always comes back!
// If you roar at a baby while it's flying up, it drops back down safely.

import { GROUND, WORLD, text, drawUFO, drawAlien } from './art'
import { PX } from './pixel'
import { sfx } from './sound'

const HATCH = 5
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const snap = (v) => Math.round(v / PX) * PX

export function startEggUfo(game) {
  game.eggUfo = null
  game.eggWave = 0
}

function spawn(game) {
  const r = game.rex
  const side = Math.random() < 0.5 ? -1 : 1
  game.eggWave = game.wave
  game.eggUfo = {
    x: clamp(r.x + side * 700, -100, WORLD + 100),
    y: 140,
    state: 'arrive',
    dropX: clamp(r.x + side * rand(350, 550), 150, WORLD - 150),
    egg: null,
    alien: null,
    carry: null,
    t: 0,
  }
  game.toast = { text: 'EGG UFO! DON\'T LET ITS ALIEN GET THE BABIES!', t: 3 }
  sfx.warn()
}

export function updateEggUfo(game, dt) {
  if (game.side !== 'dinos') return
  const fx = game.fx
  const r = game.rex
  // one per wave, a few seconds in, never at the boss
  if (!game.eggUfo && !game.boss && !game.ending && game.eggWave !== game.wave && game.waveTime < 34) spawn(game)
  const u = game.eggUfo
  if (!u) return
  u.t += dt
  const over = game.boss || game.ending || game.wave !== game.eggWave
  if (over && u.state !== 'leave') {
    // the wave is over: the alien hops back into its UFO and they fly away
    u.state = 'leave'
    if (u.alien) fx.text(u.alien.x, GROUND - 60, 'BYE BYE!', '#7dffb0', 16)
    if (u.carry) drop(game, u)
    u.alien = null
    u.egg = null
  }
  if (u.state === 'arrive') {
    u.x += (u.dropX - u.x) * Math.min(1, dt * 1.5)
    if (Math.abs(u.x - u.dropX) < 12) {
      u.state = 'hover'
      u.egg = { x: u.x, y: u.y + 20, vy: 0, t: HATCH, landed: false }
      fx.text(u.x, u.y + 50, 'PLOP!', '#7dffb0', 18)
      sfx.plasma()
    }
  } else if (u.state === 'hover') {
    // float above its alien, ready to catch a baby
    const tx = u.alien ? u.alien.x : u.egg ? u.egg.x : u.x
    u.x += (tx - u.x) * Math.min(1, dt * 1.2)
    u.y = 140 + Math.sin(u.t * 1.5) * 10
  } else if (u.state === 'leave') {
    u.y -= 220 * dt
    if (u.y < -150) game.eggUfo = null
    return
  }
  // the egg falls, lands, wobbles, then hatches
  const e = u.egg
  if (e) {
    if (!e.landed) {
      e.vy += 1200 * dt
      e.y += e.vy * dt
      if (e.y >= GROUND) {
        e.y = GROUND
        e.landed = true
        fx.dust(e.x, GROUND, 6)
      }
    } else {
      e.t -= dt
      if (e.t <= 0) {
        u.egg = null
        u.alien = { x: e.x, face: 1, walk: 0, flee: 0, grab: 0 }
        fx.burst(e.x, GROUND - 20, 16, { speed: 200, life: 0.5, size: 6, color: ['#ffffff', '#7dffb0', '#c0cbdc'], type: 'spark', up: 100 })
        fx.text(e.x, GROUND - 80, 'IT HATCHED!', '#7dffb0', 22)
        sfx.hatch()
      }
    }
  }
  // the baby alien chases the dino babies
  const a = u.alien
  if (a) {
    a.flee = Math.max(0, a.flee - dt)
    a.grab = Math.max(0, a.grab - dt)
    let vx = 0
    if (a.flee > 0) {
      vx = Math.sign(a.x - r.x || 1) * 280
    } else if (!u.carry) {
      const babies = game.babies.filter((b) => b.state === 'walk')
      const target = babies.sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0]
      if (target) {
        vx = Math.sign(target.x - a.x) * 190
        if (Math.abs(target.x - a.x) < 28 && a.grab <= 0) throwBaby(game, u, target)
      }
    }
    a.x = clamp(a.x + vx * dt, 40, WORLD - 40)
    a.walk += Math.abs(vx) * dt * 0.1
    if (vx) a.face = Math.sign(vx)
  }
  // a baby flying up to the Egg UFO
  const b = u.carry
  if (b) {
    b.y -= 220 * dt
    b.x += (u.x - b.x) * Math.min(1, dt * 3)
    if (b.y - 20 < u.y + 12) {
      b.state = 'gone'
      b.liftedBy = null
      u.carry = null
      fx.burst(u.x, u.y, 16, { speed: 200, life: 0.6, size: 6, color: ['#ff6b8a', '#ffe14a'], type: 'star' })
      fx.text(u.x, u.y - 50, 'Baby taken!', '#ff8fa0', 24)
      game.shake = 8
      sfx.stolen()
      if (game.babies.every((x) => x.state === 'gone')) game.finish(false)
    }
  }
}

function throwBaby(game, u, b) {
  b.state = 'lifted'
  b.liftedBy = u
  u.carry = b
  u.alien.grab = 3
  game.fx.text(b.x, b.y - 70, 'YEET! ROAR TO SAVE IT!', '#ffe14a', 20)
  sfx.squeak()
}

function drop(game, u) {
  const b = u.carry
  u.carry = null
  b.liftedBy = null
  b.state = 'fall'
  b.vy = 0
}

// The T. rex roared at (hx, hy): scare the alien away and save a baby in the air.
export function roarEggUfo(game, hx, hy, reach) {
  const u = game.eggUfo
  if (!u || u.state === 'leave') return
  const a = u.alien
  if (a && Math.hypot(a.x - hx, GROUND - 30 - hy) < reach) {
    a.flee = 3.5
    game.fx.text(a.x, GROUND - 90, 'EEEK!', '#7dffb0', 22)
    game.score += 30
  }
  if (u.carry && Math.hypot(u.carry.x - hx, u.carry.y - hy) < reach) {
    game.fx.text(u.carry.x, u.carry.y - 60, 'SAVED!', '#63c74d', 22)
    drop(game, u)
    game.score += 100
  }
}

export function drawEggUfo(ctx, game) {
  const u = game.eggUfo
  if (!u) return
  const t = game.time
  const e = u.egg
  if (e) {
    // a speckled alien egg that wobbles more and more, then cracks
    const wob = e.landed ? Math.sin(t * (6 + (HATCH - e.t) * 4)) * (1 + (HATCH - e.t)) : 0
    const x = snap(e.x + wob)
    const y = snap(e.y)
    ctx.fillStyle = '#181425'
    ctx.fillRect(x - 18, y - 45, 36, 45)
    ctx.fillStyle = '#e8f8ff'
    ctx.fillRect(x - 15, y - 42, 30, 39)
    ctx.fillRect(x - 9, y - 48, 18, 6)
    ctx.fillStyle = '#63c74d'
    ctx.fillRect(x - 9, y - 33, 6, 6)
    ctx.fillRect(x + 6, y - 21, 6, 6)
    ctx.fillRect(x - 6, y - 12, 6, 6)
    if (e.landed && e.t < 2.5) {
      // cracks
      ctx.fillStyle = '#181425'
      ctx.fillRect(x - 12, y - 27, 6, 3)
      ctx.fillRect(x - 6, y - 30, 6, 3)
      ctx.fillRect(x, y - 27, 6, 3)
      ctx.fillRect(x + 6, y - 30, 6, 3)
    }
    if (e.landed) text(ctx, String(Math.ceil(e.t)), e.x, e.y - 60, 16, '#7dffb0')
  }
  const a = u.alien
  if (a) {
    ctx.save()
    ctx.translate(snap(a.x), GROUND - 18 - (Math.floor(a.walk) % 2 ? PX : 0))
    ctx.scale(a.face * 0.55, 0.55)
    drawAlien(ctx, 0, 0, { time: t, mood: a.flee > 0 ? 'dizzy' : 'happy' })
    ctx.restore()
    text(ctx, a.flee > 0 ? 'AAAH!' : 'GIMME BABY!', a.x, GROUND - 62, 11, '#7dffb0')
  }
  ctx.save()
  ctx.translate(u.x, u.y)
  drawUFO(ctx, { time: t, tint: 'green', mood: 'happy' })
  ctx.restore()
  text(ctx, 'EGG UFO', u.x, u.y - 46, 11, '#7dffb0')
}
