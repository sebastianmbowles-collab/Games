// BOSS LEVEL: after wave 5 the volcano wakes up, and the aliens and dinos team up to beat it.
// You play your usual side; the other side joins as a computer-controlled teammate.
//
// The T. rex roars at the volcano's face, the UFO zaps it with lasers. Hitting it at nearly the
// same time as your teammate is a TEAM COMBO for extra damage. The volcano gets angrier as it
// weakens: phase 1 throws lava balls, phase 2 adds a meteor shower, phase 3 adds lava waves.

import { W, GROUND, WORLD, rrect, text, drawUFO, drawDino } from './art'
import { PX } from './pixel'
import { sfx } from './sound'
import { playSong } from './music'
import { buildLevel } from './level'

export const VX = WORLD / 2 // the volcano stands in the middle of the valley
export const TOP = GROUND - 330 // crater height
export const MAX_HP = 120
const ARENA = 880
const snap = (v) => Math.round(v / PX) * PX
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const INK = '#181425'

// half the volcano's width at height y (it's wide at the bottom, narrow at the top)
export const halfWidth = (y) => 70 + ((clamp(y, TOP, GROUND) - TOP) * 150) / 330
export const FACE = { x: VX - 90, y: GROUND - 250, w: 180, h: 150 }

export function startBoss(game) {
  const side = game.side
  game.boss = {
    hp: MAX_HP,
    t: 0,
    hurt: 0,
    mouth: 0,
    attackT: 2.5,
    waveT: 6,
    balls: [],
    waves: [],
    puddles: [],
    lastHit: { me: -9, ally: -9 },
    dead: 0,
    ally: side === 'dinos' ? { kind: 'ufo', x: VX - 400, y: 150, vx: 0, t: 2, bolts: [] } : { kind: 'rex', x: VX + 420, y: GROUND, vy: 0, face: -1, walk: 0, t: 3, roarT: 0 },
  }
  // a calm arena: platforms (dinos) or fuel orbs (aliens), no other hazards
  const L = buildLevel(side, 1, VX)
  L.plats = L.plats.filter((p) => Math.abs(p.x + p.w / 2 - VX) > 330 && Math.abs(p.x - VX) < ARENA)
  L.kills = []
  L.pools = []
  L.rocks = []
  L.mines = []
  L.gates = []
  L.dna = null
  L.meteors = []
  L.gems = []
  L.pads = L.pads.filter((p) => Math.abs(p.x - VX) > 300 && Math.abs(p.x - VX) < ARENA)
  L.orbs.forEach((o, i) => (o.x = VX + (i % 2 ? 1 : -1) * rand(300, ARENA - 60)))
  L.event = null
  game.level = L
  // clear out the normal enemies; everyone is on the same team now
  if (side === 'aliens') {
    game.enemies = []
    game.enemyRespawn = []
    game.plasma = []
    game.dinos = []
    game.eggs = []
    game.ufo.x = clamp(game.ufo.x, VX - ARENA, VX + ARENA)
    if (Math.abs(game.ufo.x - VX) < 300) game.ufo.x = VX - 500
  } else {
    for (const u of game.ufos) game.ufoLeave(u)
    game.releaseRex()
    if (Math.abs(game.rex.x - VX) < 300) game.rex.x = VX - 500
    game.rex.roars = Math.max(game.rex.roars, 5)
    for (const b of game.babies) if (b.state !== 'gone') b.x = VX + (b.x < VX ? -1 : 1) * rand(600, 800)
  }
  game.banner = { text: 'BOSS LEVEL!', sub: side === 'dinos' ? 'THE VOLCANO IS ANGRY! A UFO FRIEND IS HERE TO HELP!' : 'THE VOLCANO IS ANGRY! A T. REX FRIEND IS HERE TO HELP!', t: 0 }
  game.shake = 20
  sfx.boom()
  sfx.roar(true)
  game.userSong = false
  playSong('boogie')
  game.levelQuiz()
}

export const phase = (b) => (b.hp > MAX_HP * 0.66 ? 1 : b.hp > MAX_HP * 0.33 ? 2 : 3)

// ---------- hitting the volcano ----------

function damage(game, amount, who, x, y) {
  const b = game.boss
  if (!b || b.dead) return
  b.lastHit[who] = b.t
  const other = who === 'me' ? 'ally' : 'me'
  let dmg = amount
  if (b.t - b.lastHit[other] < 1.5) {
    // you and your teammate hit it together!
    dmg *= 2
    b.lastHit[other] = -9
    game.fx.text(VX, GROUND - 360, 'TEAM COMBO!', '#fee761', 30)
    game.fx.burst(VX, GROUND - 200, 24, { speed: 320, life: 0.7, size: 7, color: ['#fee761', '#63c74d', '#2ce8f5'], type: 'star' })
    game.score += 100
    sfx.win()
  }
  b.hp = Math.max(0, b.hp - dmg)
  b.hurt = 0.15
  game.fx.text(x, y - 20, `-${dmg}`, '#ffffff', 20)
  if (who === 'me') game.score += dmg * 10
  if (b.hp <= 0) {
    b.dead = 0.01
    game.shake = 24
    game.slowmo = 0.6
    game.fx.boom(VX, GROUND - 260)
    game.fx.boom(VX - 80, GROUND - 160)
    game.fx.boom(VX + 80, GROUND - 160)
    game.fx.text(VX, GROUND - 380, 'THE VOLCANO IS BEATEN!', '#fee761', 34)
    game.score += 2000
    game.earn(25)
    game.gain('dna', 3, VX, GROUND - 420)
    sfx.boom()
  }
}

// a roar from the T. rex at (hx, hy)
export function bossRoar(game, hx, hy, reach, mega) {
  const b = game.boss
  if (!b || b.dead) return
  const cx = VX
  const cy = FACE.y + FACE.h / 2
  if (Math.hypot(cx - hx, cy - hy) < reach + 90) {
    damage(game, mega ? 12 : 6, 'me', cx, cy)
    sfx.stun()
  }
}

// a laser bolt; returns true if it hit the volcano
export function bossBolt(game, bolt) {
  const b = game.boss
  if (!b || b.dead) return false
  if (bolt.y > TOP && Math.abs(bolt.x - VX) < halfWidth(bolt.y)) {
    const onFace = bolt.x > FACE.x && bolt.x < FACE.x + FACE.w && bolt.y > FACE.y && bolt.y < FACE.y + FACE.h
    damage(game, onFace ? 3 : 1, 'me', bolt.x, bolt.y)
    game.fx.burst(bolt.x, bolt.y, 8, { speed: 160, life: 0.3, size: 4, color: ['#2ce8f5', '#fff'], type: 'spark' })
    return true
  }
  return false
}

// ---------- each frame ----------

export function updateBoss(game, dt) {
  const b = game.boss
  if (!b) return
  b.t += dt
  b.hurt = Math.max(0, b.hurt - dt)
  const me = game.side === 'aliens' ? game.ufo : game.rex
  // stay in the arena
  me.x = clamp(me.x, VX - ARENA, VX + ARENA)
  // the volcano is solid
  if (game.side === 'dinos') {
    if (me.y > TOP && Math.abs(me.x - VX) < halfWidth(me.y) + 26) me.x = VX + Math.sign(me.x - VX || 1) * (halfWidth(me.y) + 26)
  } else if (me.y > TOP - 16 && Math.abs(me.x - VX) < halfWidth(me.y + 16) + 52) {
    me.x = VX + Math.sign(me.x - VX || 1) * (halfWidth(me.y + 16) + 52)
    me.vx *= -0.3
  }
  if (b.dead) {
    b.dead += dt
    if (game.level) game.level.event = null
    if (b.dead > 2.5 && !game.ending) game.finish(true)
    b.balls = []
    b.waves = []
    return
  }
  const ph = phase(b)
  if (game.level) game.level.event = ph >= 2 ? 'meteors' : null
  // the mouth opens before each attack
  b.attackT -= dt
  b.mouth = clamp(1 - b.attackT / 0.8, 0, 1)
  if (b.attackT <= 0) {
    b.attackT = rand(1.4, 2.4) / (0.8 + ph * 0.25)
    const n = ph
    for (let i = 0; i < n; i++) {
      const tx = me.x + rand(-160, 160)
      const time = rand(1.1, 1.6)
      const x0 = VX + rand(-30, 30)
      b.balls.push({ x: x0, y: TOP, vx: (tx - x0) / time, vy: -(game.side === 'aliens' ? rand(380, 560) : rand(560, 720)), life: 6 })
    }
    sfx.plasma()
    game.shake = Math.max(game.shake, 4)
  }
  // phase 3: lava waves roll out along the ground
  if (ph >= 3) {
    b.waveT -= dt
    if (b.waveT <= 0) {
      b.waveT = rand(4, 6)
      b.waves.push({ x: VX - 220, dir: -1 }, { x: VX + 220, dir: 1 })
      sfx.whoosh()
    }
  }
  for (const w of b.waves) w.x += w.dir * 260 * dt
  b.waves = b.waves.filter((w) => Math.abs(w.x - VX) < ARENA + 100)
  for (const ball of b.balls) {
    ball.vy += 900 * dt
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    ball.life -= dt
    if (Math.random() < 0.5) game.fx.add({ x: ball.x, y: ball.y, vx: rand(-20, 20), vy: -40, life: 0.4, size: 6, color: '#feae34', type: 'dot', drag: 1 })
    if (ball.y >= GROUND - 8) {
      ball.life = 0
      b.puddles.push({ x: ball.x, t: 2.2 })
      game.fx.burst(ball.x, GROUND - 8, 12, { speed: 200, life: 0.4, size: 5, color: ['#feae34', '#e43b44'], type: 'spark', up: 100 })
    }
  }
  b.balls = b.balls.filter((x) => x.life > 0)
  for (const p of b.puddles) p.t -= dt
  b.puddles = b.puddles.filter((p) => p.t > 0)
  // does anything hit you?
  let hit = false
  if (game.side === 'aliens') {
    for (const ball of b.balls) {
      if (Math.hypot(ball.x - me.x, ball.y - me.y) < 40) {
        ball.life = 0
        hit = true
      }
    }
  } else {
    const r = game.rex
    for (const ball of b.balls) {
      if (Math.abs(ball.x - r.x) < 36 && ball.y > r.y - 80 && ball.y < r.y) {
        ball.life = 0
        hit = true
      }
    }
    if (r.y >= GROUND - 2 && !r.plat) {
      for (const p of b.puddles) if (Math.abs(p.x - r.x) < 34) hit = true
      for (const w of b.waves) if (Math.abs(w.x - r.x) < 30) hit = true
    }
  }
  if (hit) {
    if (game.side === 'aliens') game.hurtUfo(0, -200, 'HOT!')
    else game.hurtRex()
  }
  updateAlly(game, dt)
}

// Your computer teammate: a UFO that zaps, or a T. rex that roars.
function updateAlly(game, dt) {
  const b = game.boss
  const a = b.ally
  a.t -= dt
  if (a.kind === 'ufo') {
    const side = a.x < VX ? -1 : 1
    const tx = VX + side * 330 + Math.sin(b.t * 0.7) * 80
    a.vx = (tx - a.x) * 1.5
    a.x += a.vx * dt
    a.y = 150 + Math.sin(b.t * 1.3) * 30
    if (a.t <= 0) {
      a.t = rand(1.8, 2.8)
      const dir = side < 0 ? 1 : -1
      a.bolts.push({ x: a.x + dir * 40, y: a.y + 10, vx: dir * 700, vy: 260, life: 1.5 })
      sfx.laser()
    }
    for (const bo of a.bolts) {
      bo.x += bo.vx * dt
      bo.y += bo.vy * dt
      bo.life -= dt
      if (bo.y > TOP && Math.abs(bo.x - VX) < halfWidth(bo.y)) {
        bo.life = 0
        damage(game, 3, 'ally', bo.x, bo.y)
        game.fx.burst(bo.x, bo.y, 8, { speed: 160, life: 0.3, size: 4, color: ['#2ce8f5', '#fff'], type: 'spark' })
      }
    }
    a.bolts = a.bolts.filter((bo) => bo.life > 0)
  } else {
    // the teammate T. rex runs up to the volcano, jumps over lava waves, and roars
    a.roarT = Math.max(0, a.roarT - dt)
    const tx = VX + 300 + Math.sin(b.t * 0.5) * 60
    const vx = clamp((tx - a.x) * 2, -260, 260)
    a.x += vx * dt
    a.walk += Math.abs(vx) * dt * 0.07
    if (Math.abs(vx) > 10) a.face = Math.sign(vx)
    a.vy += 1700 * dt
    a.y = Math.min(GROUND, a.y + a.vy * dt)
    if (a.y >= GROUND) a.vy = 0
    if (a.y >= GROUND && b.waves.some((w) => Math.abs(w.x - a.x) < 120 && Math.sign(a.x - w.x) === w.dir)) a.vy = -700
    if (a.t <= 0 && Math.abs(a.x - VX) < 420) {
      a.t = rand(2.5, 3.5)
      a.face = -1
      a.roarT = 0.6
      for (let i = 0; i < 2; i++) game.fx.add({ x: a.x - 40, y: a.y - 80, size: 280, color: i ? 'rgba(255,240,180,0.8)' : '#fff', type: 'ring', life: 0.5 + i * 0.1, width: 8 })
      sfx.roar()
      damage(game, 4, 'ally', VX + 60, FACE.y + 60)
    }
  }
}

// ---------- drawing ----------

export function drawBoss(ctx, game) {
  const b = game.boss
  if (!b) return
  drawVolcano(ctx, b)
  drawAlly(ctx, game, b)
}

// The volcano itself plus its lava balls, waves and puddles. b: { t, hp, hurt, dead, mouth, balls, waves, puddles }
export function drawVolcano(ctx, b) {
  const t = b.t
  const cooled = b.dead > 0.8
  const rock = b.hurt > 0 ? '#ffffff' : cooled ? '#5a6988' : '#3e2731'
  const light = cooled ? '#8b9bb4' : '#733e39'
  // the mountain, drawn in rows so its sides are pixel steps
  for (let y = TOP; y < GROUND; y += PX * 2) {
    const hw = snap(halfWidth(y))
    ctx.fillStyle = INK
    ctx.fillRect(VX - hw - PX, y, hw * 2 + PX * 2, PX * 2)
    ctx.fillStyle = rock
    ctx.fillRect(VX - hw, y, hw * 2, PX * 2)
    ctx.fillStyle = light
    ctx.fillRect(VX - hw, y, PX * 2, PX * 2)
  }
  if (!cooled) {
    // lava dribbling down the sides
    ctx.fillStyle = '#f77622'
    for (const s of [-1, 1]) {
      for (let y = TOP; y < TOP + 140; y += PX * 2) ctx.fillRect(snap(VX + s * (halfWidth(y) - 30) + Math.sin(y * 0.1 + t * 2) * 6), y, PX * 2, PX * 2)
    }
    // the glowing crater
    ctx.fillStyle = '#feae34'
    ctx.fillRect(VX - 66, TOP - PX, 132, PX * 3)
    ctx.fillStyle = '#fee761'
    for (let i = 0; i < 6; i++) ctx.fillRect(snap(VX - 60 + ((i * 23 + t * 40) % 120)), TOP - PX * 3, PX * 2, PX * 2)
  }
  // the face
  const ey = FACE.y + 30
  for (const s of [-1, 1]) {
    const ex = VX + s * 45
    if (cooled) {
      ctx.fillStyle = INK
      ctx.fillRect(ex - 18, ey + 6, 36, PX * 2)
    } else {
      ctx.fillStyle = INK
      ctx.fillRect(ex - 21, ey - 15, 42, 30)
      ctx.fillStyle = b.hurt > 0 ? '#ffffff' : '#fee761'
      ctx.fillRect(ex - 18, ey - 12, 36, 24)
      ctx.fillStyle = '#e43b44'
      ctx.fillRect(ex - 6 + s * -3, ey - 6, 12, 12)
      // angry eyebrows
      ctx.fillStyle = INK
      for (let i = 0; i < 5; i++) ctx.fillRect(ex - s * 21 + s * i * 9, ey - 27 + i * 3, 9, 6)
    }
  }
  const my = FACE.y + 90
  if (cooled) {
    ctx.fillStyle = INK
    ctx.fillRect(VX - 21, my, 42, PX * 2)
    text(ctx, 'Zzz', VX + 90, TOP - 20 - ((t * 20) % 30), 22, '#c0cbdc')
  } else {
    const open = snap(12 + b.mouth * 42)
    ctx.fillStyle = INK
    ctx.fillRect(VX - 48, my - 3, 96, open + 6)
    ctx.fillStyle = b.mouth > 0.3 ? '#f77622' : '#a22633'
    ctx.fillRect(VX - 45, my, 90, open)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 5; i++) ctx.fillRect(VX - 42 + i * 18, my, 9, 9)
  }
  // lava waves, puddles and balls
  for (const w of b.waves) {
    ctx.fillStyle = INK
    ctx.fillRect(snap(w.x) - 33, GROUND - 33, 66, 36)
    ctx.fillStyle = '#e43b44'
    ctx.fillRect(snap(w.x) - 30, GROUND - 30, 60, 30)
    ctx.fillStyle = '#feae34'
    ctx.fillRect(snap(w.x) - 24 + w.dir * 9, GROUND - 30, 30, PX * 3)
  }
  for (const p of b.puddles) {
    ctx.fillStyle = '#e43b44'
    ctx.fillRect(snap(p.x) - 30, GROUND - PX * 2, 60, PX * 3)
    ctx.fillStyle = '#feae34'
    ctx.fillRect(snap(p.x) - 18, GROUND - PX * 2, 36, PX)
  }
  for (const ball of b.balls) {
    ctx.fillStyle = INK
    ctx.fillRect(snap(ball.x) - 15, snap(ball.y) - 15, 30, 30)
    ctx.fillStyle = '#f77622'
    ctx.fillRect(snap(ball.x) - 12, snap(ball.y) - 12, 24, 24)
    ctx.fillStyle = '#fee761'
    ctx.fillRect(snap(ball.x) - 6, snap(ball.y) - 6, 9, 9)
  }
}

function drawAlly(ctx, game, b) {
  // your teammate
  const a = b.ally
  if (a.kind === 'ufo') {
    ctx.save()
    ctx.translate(a.x, a.y)
    drawUFO(ctx, { time: game.time, tint: 'blue', mood: 'happy' })
    ctx.restore()
    for (const bo of a.bolts) {
      ctx.fillStyle = '#2ce8f5'
      ctx.fillRect(snap(bo.x) - 6, snap(bo.y) - 6, 12, 12)
    }
    text(ctx, 'FRIEND', a.x, a.y - 46, 12, '#7dffb0')
  } else {
    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.scale(a.face * 1.25, 1.25)
    drawDino(ctx, 'rex', { time: game.time, walk: a.walk, moving: true, roar: a.roarT > 0 ? Math.sin((a.roarT / 0.6) * Math.PI) : 0, angry: a.roarT > 0, skin: 'orange' })
    ctx.restore()
    text(ctx, 'FRIEND', a.x, a.y - 112, 12, '#ffa94d')
  }
}

export function drawBossHUD(ctx, game) {
  if (game.boss) drawBossBar(ctx, game.boss)
}

export function drawBossBar(ctx, b) {
  rrect(ctx, W / 2 - 220, 92, 440, 46, 12)
  ctx.fillStyle = 'rgba(24,20,37,0.85)'
  ctx.fill()
  text(ctx, `VOLCANO BOSS · PHASE ${phase(b)}`, W / 2, 110, 14, '#feae34')
  rrect(ctx, W / 2 - 200, 116, 400, 14, 7)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fill()
  if (b.hp > 0) {
    rrect(ctx, W / 2 - 200, 116, Math.max(14, (400 * b.hp) / MAX_HP), 14, 7)
    ctx.fillStyle = b.hurt > 0 ? '#ffffff' : '#e43b44'
    ctx.fill()
  }
}

