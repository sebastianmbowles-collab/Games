// Two-player Aliens VS Dinos: one player flies the UFO, the other is the T. rex.
// The host's game runs everything and shares a small snapshot about 20 times a second;
// the guest's game draws that snapshot and sends back which buttons are pressed.
//
// Aliens win by beaming up all 4 babies, or the T. rex 3 times.
// Dinos win by roaring the UFO out of the sky (5 hits), or by lasting 2 minutes.
//
// TEAM UP mode: both players fight the volcano boss together. The UFO zaps it, the T. rex
// roars at its face, and hitting it at nearly the same time is a TEAM COMBO. If one of you
// gets knocked out you come back after a few seconds, but if you're BOTH out, the volcano wins.

import { W, H, GROUND, WORLD, KIND_LIST, rrect, text, drawDino, drawUFO, drawBeam, getTheme } from './art'
import { sfx, beamOn } from './sound'
import { Dino, inBeam } from './game'
import { safeName, yearLabel } from './names'
import { VX, TOP, MAX_HP, FACE, halfWidth, phase, drawVolcano, drawBossBar } from './boss'

const ROUND_TIME = 120
const TEAM_TIME = 180
const ARENA = 880
const KO_TIME = 6
const POWERS = ['mega', 'shield', 'speed']
const POWER_NAMES = { mega: 'MEGA ROAR', shield: 'SHIELD', speed: 'SPEED' }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt))
const STATES = ['walk', 'lifted', 'fall', 'gone']

export function newRound(game) {
  const vs = game.vs
  const team = vs.mode === 'team'
  vs.t = team ? TEAM_TIME : ROUND_TIME
  vs.winner = ''
  vs.overT = 0
  vs.bannerT = 0
  vs.events = []
  vs.ufo = { x: 1100, y: 160, vx: 0, vy: 0, hp: 5, maxHp: 5, fuel: 1, ammo: 6, energy: 1, beaming: false, stun: 0, inv: 0, hurt: 0, face: -1, laserCd: 0 }
  vs.rex = { x: 1700, y: GROUND, vx: 0, vy: 0, face: -1, walk: 0, onGround: true, lives: 3, roars: 3, roarCd: 0, roarT: 0, lifted: false, stun: 0, inv: 0, power: null }
  vs.babies = ['trike', 'stego', 'raptor', 'bronto'].map((k, i) => new Dino(1300 + i * 150, k, 0.55))
  vs.bolts = []
  vs.boss = null
  if (team) {
    // everyone on the same side of the volcano's valley, no babies to fight over
    vs.ufo.x = VX - 520
    vs.ufo.hp = vs.ufo.maxHp = 6
    vs.rex.x = VX + 520
    vs.rex.lives = 4
    vs.rex.roars = 5
    vs.babies = []
    vs.boss = { hp: MAX_HP, t: 0, hurt: 0, mouth: 0, attackT: 3, waveT: 6, balls: [], waves: [], puddles: [], last: { aliens: -9, dinos: -9 }, dead: 0 }
  }
  vs.ufo.down = 0
  vs.rex.down = 0
  vs.seen = new Set()
  vs.remote = { f: 0, j: 0, a: 0, mc: 0, sc: 0 }
  game.quiz = null
  game.cam.x = clamp(vs.mySide === 'aliens' ? vs.ufo.x : vs.rex.x, W / 2, WORLD - W / 2)
  game.cam.y = H / 2
  game.cam.zoom = 1
  // every boss fight starts with a Level Quiz: math for the UFO, dino words for the T. rex
  if (team) game.levelQuiz()
}

// ---------- host: run the whole match ----------

function event(game, type, x, y, v = 0) {
  const vs = game.vs
  vs.evId = (vs.evId || 0) + 1
  vs.events.push([vs.evId, type, Math.round(x), Math.round(y), v])
  if (vs.events.length > 16) vs.events.shift()
}

// What a player is pressing: { l, r, u, d, a (action held), tapF, tapJ, tapA, frozen }
function localInput(game) {
  const k = game.keys
  const p = game.pressed
  return { l: k.left, r: k.right, u: k.up, d: k.down, a: k.action, tapF: p.has('fire'), tapJ: p.has('up') || p.has('fire'), tapA: p.has('action'), frozen: !!(game.quiz && !game.quiz.doneT) }
}

function remoteInput(game, them) {
  const vs = game.vs
  const i = them?.i || {}
  const r = vs.remote
  const out = { l: !!i.l, r: !!i.r, u: !!i.u, d: !!i.d, a: !!i.a, tapF: (i.f || 0) > r.f, tapJ: (i.j || 0) > r.j, tapA: (i.ac || 0) > r.a, frozen: !!them?.q }
  r.f = i.f || 0
  r.j = i.j || 0
  r.a = i.ac || 0
  // the guest's right answers: math refuels the UFO, spelling gives the T. rex roars
  if ((them?.mc || 0) > r.mc) {
    r.mc = them.mc
    rewardMath(game)
  }
  if ((them?.sc || 0) > r.sc) {
    r.sc = them.sc
    rewardSpell(game)
  }
  return out
}

export function rewardMath(game) {
  const u = game.vs.ufo
  u.fuel = Math.min(1, u.fuel + 0.7)
  u.ammo = Math.min(15, u.ammo + 5)
  u.energy = 1
  event(game, 'refuel', u.x, u.y)
}

export function rewardSpell(game) {
  const r = game.vs.rex
  r.roars += 3
  r.power = { kind: POWERS[Math.floor(Math.random() * POWERS.length)], t: 12 }
  event(game, 'power', r.x, r.y - 90)
}

export function hostUpdate(game, dt, them) {
  const vs = game.vs
  const mine = localInput(game)
  const other = remoteInput(game, them)
  const inA = vs.mySide === 'aliens' ? mine : other
  const inD = vs.mySide === 'dinos' ? mine : other
  if (vs.winner) {
    vs.overT += dt
    beamOn(false)
    return
  }
  vs.t -= dt
  if (vs.mode === 'team') return teamUpdate(game, inA, inD, dt)
  updateUfo(game, inA, dt)
  updateRex(game, inD, dt)
  for (const b of vs.babies) {
    if (b.state === 'gone') continue
    if (b.state === 'walk') wander(b, vs.ufo, dt)
    if (b.state === 'lifted' && !vs.ufo.beaming) {
      b.state = 'fall'
      b.vy = 0
    }
    b.physics(dt, game.fx)
  }
  // lasers
  for (const bo of vs.bolts) {
    bo.x += bo.vx * dt
    bo.y += bo.vy * dt
    bo.life -= dt
    const r = vs.rex
    if (r.inv <= 0 && Math.abs(bo.x - r.x) < 42 && bo.y > r.y - 85 && bo.y < r.y) {
      bo.life = 0
      r.stun = 1.2
      r.inv = 1
      event(game, 'zap', r.x, r.y - 50)
    }
    if (bo.y > GROUND) {
      bo.life = 0
      event(game, 'spark', bo.x, GROUND)
    }
  }
  vs.bolts = vs.bolts.filter((b) => b.life > 0)
  // who won?
  const babiesLeft = vs.babies.filter((b) => b.state !== 'gone').length
  if (vs.rex.lives <= 0 || babiesLeft === 0) vs.winner = 'aliens'
  else if (vs.ufo.hp <= 0 || vs.t <= 0) vs.winner = 'dinos'
  if (vs.winner) event(game, 'win', 0, 0)
}

// ---------- TEAM UP: the volcano boss ----------

function teamUpdate(game, inA, inD, dt) {
  const vs = game.vs
  const b = vs.boss
  const u = vs.ufo
  const r = vs.rex
  b.t += dt
  b.hurt = Math.max(0, b.hurt - dt)
  // knocked-out players come back after a few seconds
  for (const [p, side] of [[u, 'aliens'], [r, 'dinos']]) {
    if (p.down <= 0) continue
    p.down -= dt
    if (p.down <= 0) {
      p.down = 0
      p.inv = 2
      if (side === 'aliens') {
        p.hp = 3
        p.fuel = Math.max(p.fuel, 0.6)
        p.x = VX - 520
        p.y = 160
      } else {
        p.lives = 2
        p.x = VX + 520
        p.y = GROUND
      }
      event(game, 'back', p.x, side === 'aliens' ? p.y : p.y - 100)
    }
  }
  if (u.down <= 0) updateUfo(game, inA, dt)
  else u.beaming = false
  if (r.down <= 0) updateRex(game, inD, dt)
  // stay in the arena, and the volcano is solid
  u.x = clamp(u.x, VX - ARENA, VX + ARENA)
  r.x = clamp(r.x, VX - ARENA, VX + ARENA)
  if (r.y > TOP && Math.abs(r.x - VX) < halfWidth(r.y) + 26) r.x = VX + Math.sign(r.x - VX || 1) * (halfWidth(r.y) + 26)
  if (u.y > TOP - 16 && Math.abs(u.x - VX) < halfWidth(u.y + 16) + 52) {
    u.x = VX + Math.sign(u.x - VX || 1) * (halfWidth(u.y + 16) + 52)
    u.vx *= -0.3
  }
  // lasers hit the volcano
  for (const bo of vs.bolts) {
    bo.x += bo.vx * dt
    bo.y += bo.vy * dt
    bo.life -= dt
    if (bo.y > TOP && Math.abs(bo.x - VX) < halfWidth(bo.y)) {
      bo.life = 0
      const onFace = bo.x > FACE.x && bo.x < FACE.x + FACE.w && bo.y > FACE.y && bo.y < FACE.y + FACE.h
      hitBoss(game, onFace ? 3 : 1, 'aliens', bo.x, bo.y)
    } else if (bo.y > GROUND) {
      bo.life = 0
      event(game, 'spark', bo.x, GROUND)
    }
  }
  vs.bolts = vs.bolts.filter((x) => x.life > 0)
  if (b.dead) {
    b.dead += dt
    b.balls = []
    b.waves = []
    if (b.dead > 2.5) {
      vs.winner = 'team'
      event(game, 'win', 0, 0)
    }
    return
  }
  // the volcano attacks: lava balls at one of you, then lava waves when it's really angry
  const ph = phase(b)
  // the volcano waits while you're both still doing the Level Quiz at the start
  if (b.t < 20 && (inA.frozen || inD.frozen)) b.attackT = Math.max(b.attackT, 1.5)
  b.attackT -= dt
  b.mouth = clamp(1 - b.attackT / 0.8, 0, 1)
  if (b.attackT <= 0) {
    b.attackT = rand(1.3, 2.2) / (0.8 + ph * 0.25)
    const targets = [u.down <= 0 && u, r.down <= 0 && r].filter(Boolean)
    for (let i = 0; i < ph && targets.length; i++) {
      const tgt = targets[Math.floor(Math.random() * targets.length)]
      const tx = tgt.x + rand(-160, 160)
      const time = rand(1.1, 1.6)
      const x0 = VX + rand(-30, 30)
      b.balls.push({ x: x0, y: TOP, vx: (tx - x0) / time, vy: -(tgt === u ? rand(380, 560) : rand(560, 720)), life: 6 })
    }
    event(game, 'spit', VX, TOP)
  }
  if (ph >= 3) {
    b.waveT -= dt
    if (b.waveT <= 0) {
      b.waveT = rand(4, 6)
      b.waves.push({ x: VX - 220, dir: -1 }, { x: VX + 220, dir: 1 })
      event(game, 'lavawave', VX, GROUND)
    }
  }
  for (const w of b.waves) w.x += w.dir * 260 * dt
  b.waves = b.waves.filter((w) => Math.abs(w.x - VX) < ARENA + 100)
  for (const ball of b.balls) {
    ball.vy += 900 * dt
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    ball.life -= dt
    if (ball.y >= GROUND - 8) {
      ball.life = 0
      b.puddles.push({ x: ball.x, t: 2.2 })
      event(game, 'splash', ball.x, GROUND - 8)
    }
  }
  for (const p of b.puddles) p.t -= dt
  b.puddles = b.puddles.filter((p) => p.t > 0)
  // does the lava hit anyone?
  if (u.down <= 0 && u.inv <= 0) {
    for (const ball of b.balls) {
      if (ball.life > 0 && Math.hypot(ball.x - u.x, ball.y - u.y) < 40) {
        ball.life = 0
        hurtTeam(game, 'aliens')
        break
      }
    }
  }
  if (r.down <= 0 && r.inv <= 0 && r.power?.kind !== 'shield') {
    let hit = false
    for (const ball of b.balls) {
      if (ball.life > 0 && Math.abs(ball.x - r.x) < 36 && ball.y > r.y - 80 && ball.y < r.y) {
        ball.life = 0
        hit = true
      }
    }
    if (r.y >= GROUND - 2) {
      for (const p of b.puddles) if (Math.abs(p.x - r.x) < 34) hit = true
      for (const w of b.waves) if (Math.abs(w.x - r.x) < 30) hit = true
    }
    if (hit) hurtTeam(game, 'dinos')
  }
  b.balls = b.balls.filter((x) => x.life > 0)
  // both knocked out at once, or out of time: the volcano wins
  if ((u.down > 0 && r.down > 0) || vs.t <= 0) {
    vs.winner = 'volcano'
    event(game, 'win', 0, 0)
  }
}

function hurtTeam(game, side) {
  const vs = game.vs
  if (side === 'aliens') {
    const u = vs.ufo
    u.hp--
    u.hurt = 0.2
    u.inv = 1.2
    u.vy = -200
    if (u.hp <= 0) u.down = KO_TIME
    event(game, u.hp <= 0 ? 'ko' : 'hot', u.x, u.y - 40)
  } else {
    const r = vs.rex
    r.lives--
    r.inv = 1.8
    r.vy = -450
    r.onGround = false
    if (r.lives <= 0) r.down = KO_TIME
    event(game, r.lives <= 0 ? 'ko' : 'hot', r.x, r.y - 100)
  }
}

function hitBoss(game, amount, side, x, y) {
  const b = game.vs.boss
  if (!b || b.dead) return
  b.last[side] = b.t
  const other = side === 'aliens' ? 'dinos' : 'aliens'
  let dmg = amount
  const combo = b.t - b.last[other] < 1.5
  if (combo) {
    dmg *= 2
    b.last[other] = -9
  }
  b.hp = Math.max(0, b.hp - dmg)
  b.hurt = 0.15
  event(game, combo ? 'combo' : 'bhit', x, y, dmg)
  if (b.hp <= 0) {
    b.dead = 0.01
    event(game, 'bossdown', VX, GROUND - 260)
  }
}

function wander(b, u, dt) {
  b.think -= dt
  const danger = u.beaming && Math.abs(u.x - b.x) < 170
  if (danger) {
    b.target = clamp(b.x + Math.sign(b.x - u.x || 1) * 260, 80, WORLD - 80)
    b.scared = 0.5
  } else if (b.think <= 0) {
    b.think = rand(1.5, 4)
    b.target = Math.random() < 0.3 ? b.x : clamp(b.x + rand(-320, 320), 200, WORLD - 200)
  }
  const speed = danger ? 210 : 70
  const want = Math.abs(b.target - b.x) > 10 ? Math.sign(b.target - b.x) * speed : 0
  b.vx = approach(b.vx, want, 5, dt)
  b.x += b.vx * dt
  if (Math.abs(b.vx) > 5) b.face = Math.sign(b.vx)
  b.walk += Math.abs(b.vx) * dt * 0.12
}

function updateUfo(game, inp, dt) {
  const vs = game.vs
  const u = vs.ufo
  const r = vs.rex
  u.stun = Math.max(0, u.stun - dt)
  u.inv = Math.max(0, u.inv - dt)
  u.hurt = Math.max(0, u.hurt - dt)
  u.laserCd -= dt
  const can = !inp.frozen && u.stun <= 0 && u.fuel > 0
  u.fuel = Math.max(0, u.fuel - dt * (0.03 + (u.beaming ? 0.02 : 0)))
  const ix = can ? (inp.r ? 1 : 0) - (inp.l ? 1 : 0) : 0
  const iy = can ? (inp.d ? 1 : 0) - (inp.u ? 1 : 0) : 0
  u.vx += ix * 1700 * dt
  u.vy += iy * 1500 * dt + (u.fuel <= 0 ? 80 * dt : 0)
  u.vx *= Math.exp(-3 * dt)
  u.vy *= Math.exp(-3.5 * dt)
  const sp = Math.hypot(u.vx, u.vy)
  if (sp > 430 && u.stun <= 0) {
    u.vx *= 430 / sp
    u.vy *= 430 / sp
  }
  u.x = clamp(u.x + u.vx * dt, 60, WORLD - 60)
  u.y = clamp(u.y + u.vy * dt, 70, 330)
  if (ix) u.face = ix
  // beam
  u.beaming = can && inp.a && u.energy > 0
  u.energy = u.beaming ? Math.max(0, u.energy - 0.22 * dt) : Math.min(1, u.energy + 0.25 * dt)
  if (u.beaming) {
    for (const b of vs.babies) {
      if ((b.state === 'walk' || b.state === 'fall') && inBeam(u.x, u.y, b.x, b.y - 20)) b.state = 'lifted'
      if (b.state === 'lifted') {
        b.y -= 70 * b.lift * dt
        b.x = approach(b.x, u.x, 3, dt)
        if (b.y - 20 < u.y + 12) {
          b.state = 'gone'
          event(game, 'taken', u.x, u.y)
        }
      }
    }
    if (vs.mode !== 'team' && !r.lifted && r.inv <= 0 && r.power?.kind !== 'shield' && inBeam(u.x, u.y, r.x, r.y - 40)) {
      r.lifted = true
      event(game, 'grab', r.x, r.y - 100)
    }
  }
  if (inp.tapF && can && u.laserCd <= 0 && u.ammo > 0) {
    u.ammo--
    u.laserCd = 0.3
    vs.bolts.push({ x: u.x + u.face * 40, y: u.y + 14, vx: u.face * 650, vy: 420, life: 1.2 })
    event(game, 'laser', u.x, u.y)
  }
}

function updateRex(game, inp, dt) {
  const vs = game.vs
  const r = vs.rex
  const u = vs.ufo
  r.inv = Math.max(0, r.inv - dt)
  r.stun = Math.max(0, r.stun - dt)
  r.roarCd = Math.max(0, r.roarCd - dt)
  r.roarT = Math.max(0, r.roarT - dt)
  if (r.power) {
    r.power.t -= dt
    if (r.power.t <= 0) r.power = null
  }
  if (r.power?.kind === 'shield') r.lifted = false
  const can = !inp.frozen && r.stun <= 0
  if (r.lifted) {
    if (!u.beaming) {
      r.lifted = false
      r.onGround = false
    } else {
      r.y -= 55 * dt
      r.x = approach(r.x, u.x, 3, dt)
      if (r.y - 80 < u.y + 10) {
        r.lifted = false
        r.lives--
        r.inv = 2.5
        r.vy = 200
        r.onGround = false
        u.stun = 1
        u.vy = -300
        event(game, 'caught', r.x, r.y - 60)
      }
    }
  } else {
    const fast = r.power?.kind === 'speed' ? 1.5 : 1
    const ix = can ? (inp.r ? 1 : 0) - (inp.l ? 1 : 0) : 0
    r.vx = approach(r.vx, ix * 300 * fast, r.onGround ? 8 : 3, dt)
    if (ix) r.face = ix
    if (can && inp.tapJ && r.onGround) {
      r.vy = r.power?.kind === 'speed' ? -820 : -640
      r.onGround = false
      event(game, 'jump', r.x, GROUND)
    }
    r.vy += 1700 * dt
    r.x = clamp(r.x + r.vx * dt, 50, WORLD - 50)
    r.y += r.vy * dt
    if (r.y >= GROUND) {
      if (!r.onGround) event(game, 'land', r.x, GROUND)
      r.y = GROUND
      r.vy = 0
      r.onGround = true
    }
    r.walk += Math.abs(r.vx) * dt * 0.07
  }
  if (can && inp.tapA && r.roarCd <= 0 && (r.roars > 0 || r.power?.kind === 'mega')) {
    if (r.power?.kind !== 'mega') r.roars--
    r.roarCd = 0.85
    r.roarT = 0.6
    const reach = 340 * (r.power?.kind === 'mega' ? 1.6 : 1)
    const hx = r.x + r.face * 36
    const hy = r.y - 70
    if (vs.mode === 'team') {
      // in TEAM UP the roar hits the volcano's face, never your friend
      event(game, 'roar', hx, hy)
      if (vs.boss && Math.hypot(VX - hx, FACE.y + FACE.h / 2 - hy) < reach + 90) hitBoss(game, r.power?.kind === 'mega' ? 12 : 6, 'dinos', VX, FACE.y + FACE.h / 2)
      return
    }
    const hit = Math.hypot(u.x - hx, u.y - hy) < reach && u.inv <= 0
    event(game, hit ? 'roarhit' : 'roar', hx, hy)
    if (hit) {
      u.hp--
      u.hurt = 0.2
      u.inv = 0.8
      u.stun = 1.5
      u.vx = Math.sign(u.x - r.x || 1) * 520
      u.vy = -280
      u.beaming = false
      r.lifted = false
      for (const b of vs.babies) if (b.state === 'lifted') b.state = 'fall'
    }
  }
}

// ---------- the snapshot both players share ----------

const n = (v) => Math.round(v)

export function snapshot(game) {
  const vs = game.vs
  const u = vs.ufo
  const r = vs.rex
  return {
    rd: vs.round,
    t: Math.max(0, Math.ceil(vs.t)),
    w: vs.winner,
    u: [n(u.x), n(u.y), n(u.vx), u.hp, n(u.fuel * 100), u.ammo, u.beaming ? 1 : 0, u.stun > 0 ? 1 : 0, u.hurt > 0 ? 1 : 0, u.face, n(u.energy * 100)],
    x: [n(r.x), n(r.y), r.face, n(r.walk * 10), r.lives, r.roars, n(r.roarT * 100), r.lifted ? 1 : 0, r.onGround ? 1 : 0, r.stun > 0 ? 1 : 0, r.inv > 0 ? 1 : 0, r.power ? POWERS.indexOf(r.power.kind) : -1, r.power ? n(r.power.t) : 0, n(r.vx)],
    b: vs.babies.map((b) => [n(b.x), n(b.y), KIND_LIST.indexOf(b.kind), STATES.indexOf(b.state), b.face, n(b.walk * 10)]),
    o: vs.bolts.map((b) => [n(b.x), n(b.y)]),
    e: vs.events,
    md: vs.mode === 'team' ? 1 : 0,
    dn: [u.down > 0 ? Math.ceil(u.down) : 0, r.down > 0 ? Math.ceil(r.down) : 0],
    ...(vs.boss && {
      bs: [vs.boss.hp, vs.boss.hurt > 0 ? 1 : 0, n(vs.boss.mouth * 100), n(vs.boss.dead * 100), n(vs.boss.t * 10)],
      bb: vs.boss.balls.map((b) => [n(b.x), n(b.y)]),
      bw: vs.boss.waves.map((w) => [n(w.x), w.dir]),
      bp: vs.boss.puddles.map((p) => n(p.x)),
    }),
  }
}

// The guest copies the host's snapshot into its own game so it can draw it.
export function applySnapshot(game, s) {
  const vs = game.vs
  if (!s?.u) return
  const mode = s.md ? 'team' : 'versus'
  if (s.rd !== vs.round || mode !== vs.mode) {
    vs.round = s.rd
    vs.mode = mode
    newRound(game)
  }
  vs.t = s.t
  vs.winner = s.w || ''
  const u = vs.ufo
  ;[u.x, u.y, u.vx, u.hp] = s.u
  u.fuel = s.u[4] / 100
  u.ammo = s.u[5]
  u.beaming = !!s.u[6]
  u.stun = s.u[7] ? 1 : 0
  u.hurt = s.u[8] ? 1 : 0
  u.face = s.u[9]
  u.energy = s.u[10] / 100
  const r = vs.rex
  ;[r.x, r.y, r.face] = s.x
  r.walk = s.x[3] / 10
  r.lives = s.x[4]
  r.roars = s.x[5]
  r.roarT = s.x[6] / 100
  r.lifted = !!s.x[7]
  r.onGround = !!s.x[8]
  r.stun = s.x[9] ? 1 : 0
  r.inv = s.x[10] ? 1 : 0
  r.power = s.x[11] >= 0 ? { kind: POWERS[s.x[11]], t: s.x[12] } : null
  r.vx = s.x[13]
  s.b.forEach((a, i) => {
    let b = vs.babies[i]
    if (!b) b = vs.babies[i] = new Dino(a[0], KIND_LIST[a[2]] || 'trike', 0.55)
    ;[b.x, b.y] = a
    b.kind = KIND_LIST[a[2]] || b.kind
    b.state = STATES[a[3]] || 'walk'
    b.face = a[4]
    b.vx = a[5] / 10 !== b.walk ? b.face * 50 : 0
    b.walk = a[5] / 10
  })
  vs.bolts = (s.o || []).map(([x, y]) => ({ x, y }))
  u.down = s.dn?.[0] || 0
  r.down = s.dn?.[1] || 0
  if (vs.boss && s.bs) {
    const b = vs.boss
    b.hp = s.bs[0]
    b.hurt = s.bs[1] ? 1 : 0
    b.mouth = s.bs[2] / 100
    b.dead = s.bs[3] / 100
    b.t = s.bs[4] / 10
    b.balls = (s.bb || []).map(([x, y]) => ({ x, y }))
    b.waves = (s.bw || []).map(([x, dir]) => ({ x, dir }))
    b.puddles = (s.bp || []).map((x) => ({ x, t: 1 }))
  }
  for (const ev of s.e || []) playEvent(game, ev)
}

// Sounds and sparkles for things that happened, played once on each screen.
export function playEvent(game, ev) {
  const vs = game.vs
  const [id, type, x, y, v] = ev
  if (vs.seen.has(id)) return
  vs.seen.add(id)
  const fx = game.fx
  switch (type) {
    case 'laser':
      sfx.laser()
      break
    case 'zap':
      sfx.hit()
      fx.burst(x, y, 14, { speed: 240, life: 0.4, size: 5, color: ['#2ce8f5', '#fff'], type: 'spark' })
      fx.text(x, y - 40, 'ZAPPED!', '#2ce8f5', 22)
      break
    case 'spark':
      fx.burst(x, y, 6, { speed: 120, life: 0.3, size: 4, color: '#2ce8f5', type: 'spark', up: 80 })
      break
    case 'taken':
      sfx.stolen()
      fx.burst(x, y, 16, { speed: 200, life: 0.6, size: 6, color: ['#ff6b8a', '#ffe14a'], type: 'star' })
      fx.text(x, y - 50, 'Baby taken!', '#ff8fa0', 22)
      break
    case 'grab':
      sfx.squeak()
      fx.text(x, y, 'ROAR to escape!', '#ffe14a', 20)
      break
    case 'caught':
      sfx.hurt()
      game.shake = 12
      fx.text(x, y - 60, 'Spat back out!', '#ffe14a', 22)
      break
    case 'roar':
    case 'roarhit':
      sfx.roar()
      game.shake = Math.max(game.shake, 9)
      for (let i = 0; i < 3; i++) fx.add({ x, y, size: 340, color: i ? 'rgba(255,240,180,0.8)' : '#fff', type: 'ring', life: 0.5 + i * 0.12, width: 10 - i * 3 })
      fx.text(x, y - 30, 'ROAR!', '#ffe14a', 30)
      if (type === 'roarhit') {
        sfx.stun()
        fx.text(vs.ufo.x, vs.ufo.y - 50, 'POW!', '#fff', 26)
        fx.burst(vs.ufo.x, vs.ufo.y, 14, { speed: 260, life: 0.5, size: 6, color: '#ffe14a', type: 'star' })
      }
      break
    case 'refuel':
      sfx.capture()
      fx.text(x, y - 60, 'REFUELED!', '#2ce8f5', 22)
      break
    case 'power':
      sfx.win()
      fx.text(x, y - 30, `${POWER_NAMES[vs.rex.power?.kind] || 'POWER UP'}!`, '#63c74d', 24)
      fx.burst(x, y, 20, { speed: 220, life: 0.7, size: 6, color: ['#63c74d', '#fee761', '#fff'], type: 'star' })
      break
    case 'jump':
      sfx.jump()
      break
    case 'land':
      sfx.land()
      fx.dust(x, y, 8)
      break
    case 'win': {
      beamOn(false)
      const won = vs.winner === vs.mySide || vs.winner === 'team'
      if (won) sfx.win()
      else sfx.lose()
      game.earn(won ? (vs.winner === 'team' ? 20 : 15) : 5)
      if (won) game.gain('dna', vs.winner === 'team' ? 2 : 1)
      break
    }
    // TEAM UP events
    case 'bhit':
    case 'combo':
      sfx.stun()
      game.shake = Math.max(game.shake, 4)
      fx.text(x, y - 20, `-${v}`, '#ffffff', 20)
      fx.burst(x, y, 8, { speed: 160, life: 0.3, size: 4, color: ['#2ce8f5', '#fff', '#feae34'], type: 'spark' })
      if (type === 'combo') {
        sfx.win()
        fx.text(VX, GROUND - 360, 'TEAM COMBO!', '#fee761', 30)
        fx.burst(VX, GROUND - 200, 24, { speed: 320, life: 0.7, size: 7, color: ['#fee761', '#63c74d', '#2ce8f5'], type: 'star' })
      }
      break
    case 'bossdown':
      sfx.boom()
      game.shake = 24
      fx.boom(VX, GROUND - 260)
      fx.boom(VX - 80, GROUND - 160)
      fx.boom(VX + 80, GROUND - 160)
      fx.text(VX, GROUND - 380, 'THE VOLCANO IS BEATEN!', '#fee761', 34)
      break
    case 'spit':
      sfx.plasma()
      game.shake = Math.max(game.shake, 4)
      break
    case 'lavawave':
      sfx.whoosh()
      break
    case 'splash':
      fx.burst(x, y, 12, { speed: 200, life: 0.4, size: 5, color: ['#feae34', '#e43b44'], type: 'spark', up: 100 })
      break
    case 'hot':
      sfx.hurt()
      game.shake = Math.max(game.shake, 8)
      fx.text(x, y, 'HOT!', '#f77622', 24)
      break
    case 'ko':
      sfx.hurt()
      game.shake = 12
      fx.boom(x, y)
      fx.text(x, y - 20, 'KNOCKED OUT!', '#e43b44', 24)
      break
    case 'back':
      sfx.capture()
      fx.text(x, y - 40, 'BACK IN THE FIGHT!', '#63c74d', 22)
      fx.burst(x, y, 16, { speed: 200, life: 0.6, size: 6, color: ['#63c74d', '#fff'], type: 'star' })
      break
  }
}

// ---------- drawing ----------

export function drawVersus(game, ctx) {
  const vs = game.vs
  const t = game.time
  const u = vs.ufo
  const r = vs.rex
  const team = vs.mode === 'team'
  game.drawWorld(ctx, getTheme('dinos'), game.cam, () => {
    if (vs.boss) {
      drawVolcano(ctx, vs.boss)
      if (!vs.boss.dead) for (const ball of vs.boss.balls) if (Math.random() < 0.4) game.fx.add({ x: ball.x, y: ball.y, vx: rand(-20, 20), vy: -40, life: 0.4, size: 6, color: '#feae34', type: 'dot', drag: 1 })
    }
    if (u.beaming) drawBeam(ctx, u.x, u.y + 12, GROUND, t, { power: 0.6 + u.energy * 0.4 })
    for (const b of vs.babies) {
      if (b.state === 'gone') continue
      b.draw(ctx, t, { lookUp: Math.abs(u.x - b.x) < 150 })
    }
    if (!r.down && !(r.inv > 0 && Math.floor(t * 12) % 2 === 0)) {
      ctx.save()
      ctx.translate(r.x, r.y)
      ctx.scale(r.face * 1.25, 1.25)
      drawDino(ctx, 'rex', {
        skin: vs.names.dinos.rex,
        evo: vs.names.dinos.evo || 0,
        time: t,
        walk: r.walk,
        moving: r.onGround && Math.abs(r.vx) > 20,
        roar: r.roarT > 0 ? Math.sin((r.roarT / 0.6) * Math.PI) : 0,
        scared: r.lifted || r.stun > 0,
        flail: r.lifted,
        angry: r.roarT > 0,
        blink: t % 3.7 < 0.12,
      })
      ctx.restore()
    }
    if (r.power?.kind === 'shield') {
      ctx.save()
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 8)
      ctx.strokeStyle = '#63c74d'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(r.x, r.y - 45, 70, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    if (!u.down) {
      ctx.save()
      ctx.translate(u.x, u.y + Math.sin(t * 3) * 3)
      drawUFO(ctx, { time: t, tint: vs.names.aliens.ufo, evo: vs.names.aliens.evo || 0, hurt: u.hurt > 0, stun: u.stun > 0 && u.hp > 0, mood: 'happy' })
      ctx.restore()
    }
    for (const b of vs.bolts) {
      ctx.fillStyle = '#2ce8f5'
      ctx.fillRect(Math.round(b.x / 3) * 3 - 6, Math.round(b.y / 3) * 3 - 6, 12, 12)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(b.x / 3) * 3 - 3, Math.round(b.y / 3) * 3 - 3, 6, 6)
    }
    // name tags over each player
    if (!u.down) text(ctx, vs.names.aliens.name, u.x, u.y - 46, 13, '#7dffb0')
    if (!r.down) text(ctx, vs.names.dinos.name, r.x, r.y - 112, 13, '#ffa94d')
  })
  // HUD: your stats on the left, the match in the middle
  const mine = vs.mySide
  hud(ctx, 14, 12, 244, mine === 'aliens' ? 126 : 100)
  if (mine === 'aliens') {
    stat(ctx, 'SHIELD', 34, '#9fd8ff')
    pips(ctx, u.hp, u.maxHp, 22, '#5ad1ff')
    stat(ctx, 'BEAM', 60, '#9fffd0')
    bar(ctx, 92, 50, 154, 14, u.energy, '#7dffb0')
    stat(ctx, 'FUEL', 86, '#feae34')
    bar(ctx, 92, 76, 154, 14, u.fuel, u.fuel < 0.25 && Math.floor(t * 4) % 2 ? '#e43b44' : '#feae34')
    stat(ctx, 'LASER', 112, '#2ce8f5')
    pips(ctx, u.ammo, 15, 100, '#2ce8f5')
  } else {
    stat(ctx, 'LIVES', 34, '#ffb3c6')
    for (let i = 0; i < (team ? 4 : 3); i++) text(ctx, '❤', 104 + i * 30, 37, 22, i < r.lives ? '#ff5a7a' : 'rgba(255,255,255,0.2)')
    stat(ctx, 'ROARS', 66, '#ffe14a')
    pips(ctx, r.roars, Math.max(r.roars, 3), 54, '#ffe14a')
    if (r.power) text(ctx, `★ ${POWER_NAMES[r.power.kind]} ${r.power.t}S`, 28, 92, 13, '#63c74d', 'left')
  }
  hud(ctx, W / 2 - 130, 12, 260, 74)
  const secs = Math.max(0, Math.ceil(vs.t))
  const m = Math.floor(secs / 60)
  const s = String(secs % 60).padStart(2, '0')
  text(ctx, `${m}:${s}`, W / 2, 44, 26, vs.t < 15 ? '#ffe14a' : '#fff')
  const babies = vs.babies.filter((b) => b.state !== 'gone').length
  if (team) text(ctx, `TEAM UP!  UFO ${'■'.repeat(Math.max(0, u.hp))}  REX ${'❤'.repeat(Math.max(0, r.lives))}`, W / 2, 70, 12, '#c0cbdc')
  else text(ctx, `UFO ${'■'.repeat(u.hp)}  BABIES ${babies}  REX ${'❤'.repeat(Math.max(0, r.lives))}`, W / 2, 70, 12, '#c0cbdc')
  if (vs.boss) drawBossBar(ctx, vs.boss)
  hud(ctx, W - 254, 12, 240, 74)
  text(ctx, team ? 'TEAM' : 'VS', W - 134, 34, 13, '#c0cbdc')
  text(ctx, tag(vs, 'aliens'), W - 134, 54, 13, '#7dffb0')
  text(ctx, tag(vs, 'dinos'), W - 134, 74, 13, '#ffa94d')
  if (vs.bannerT < 3.5) {
    vs.bannerT += 1 / 60
    text(ctx, tag(vs, 'aliens'), W / 2, 190, 34, '#7dffb0')
    text(ctx, team ? '+' : 'VS', W / 2, 230, 26, '#fee761')
    text(ctx, tag(vs, 'dinos'), W / 2, 272, 34, '#ffa94d')
    if (team) text(ctx, 'TEAM UP! BEAT THE VOLCANO TOGETHER!', W / 2, 320, 22, '#f77622')
  }
  const meP = mine === 'aliens' ? u : r
  if (meP.down && !vs.winner) {
    text(ctx, 'KNOCKED OUT!', W / 2, 230, 40, '#e43b44')
    text(ctx, `BACK IN ${Math.ceil(meP.down)}...  YOUR FRIEND MUST HOLD ON!`, W / 2, 270, 18, '#fff')
  }
  if (vs.winner) {
    ctx.fillStyle = 'rgba(15,10,40,0.6)'
    ctx.fillRect(0, 0, W, H)
    if (team) {
      const won = vs.winner === 'team'
      text(ctx, won ? 'YOU BEAT THE VOLCANO!' : 'THE VOLCANO WON!', W / 2, 200, 52, won ? '#63c74d' : '#f77622')
      text(ctx, won ? 'GREAT TEAMWORK! +20 ◆ +2 🧬' : 'GOOD TRY! +5 ◆', W / 2, 250, 26, '#fee761')
    } else {
      const won = vs.winner === mine
      text(ctx, vs.winner === 'aliens' ? 'ALIENS WIN!' : 'DINOS WIN!', W / 2, 200, 60, vs.winner === 'aliens' ? '#7dffb0' : '#ffa94d')
      text(ctx, won ? 'YOU WON! +15 ◆ +1 🧬' : 'GOOD TRY! +5 ◆', W / 2, 250, 26, '#fee761')
    }
    text(ctx, vs.role === 'host' ? 'ENTER = PLAY AGAIN  ·  ESC = LEAVE' : 'WAITING FOR THE HOST  ·  ESC = LEAVE', W / 2, 310, 16, '#fff')
  }
  if (vs.lostT > 1) {
    ctx.fillStyle = 'rgba(15,10,40,0.7)'
    ctx.fillRect(0, 0, W, H)
    text(ctx, 'WAITING FOR YOUR FRIEND...', W / 2, 250, 26, '#fff')
    text(ctx, 'ESC = LEAVE', W / 2, 290, 16, '#c0cbdc')
  }
}

const tag = (vs, side) => `${side === 'aliens' ? 'ALIENS' : 'DINOS'} ${safeName(vs.names[side].name)} ${yearLabel(Number(vs.names[side].year) || 0)}`.toUpperCase()

function hud(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 14)
  ctx.fillStyle = 'rgba(15,10,40,0.6)'
  ctx.fill()
}
function stat(ctx, label, y, color) {
  text(ctx, label, 28, y, 13, color, 'left')
}
function bar(ctx, x, y, w, h, f, color) {
  rrect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fill()
  if (f > 0) {
    rrect(ctx, x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2)
    ctx.fillStyle = color
    ctx.fill()
  }
}
function pips(ctx, n2, max, y, color) {
  const w = Math.min(28, 154 / Math.max(1, max))
  for (let i = 0; i < max; i++) {
    rrect(ctx, 92 + i * w, y, w - 3, 14, 3)
    ctx.fillStyle = i < n2 ? color : 'rgba(255,255,255,0.15)'
    ctx.fill()
  }
}
