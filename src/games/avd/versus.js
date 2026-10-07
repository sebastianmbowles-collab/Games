// Two-player Aliens VS Dinos: one player flies the UFO, the other is the T. rex.
// The host's game runs everything and shares a small snapshot about 20 times a second;
// the guest's game draws that snapshot and sends back which buttons are pressed.
//
// Aliens win by beaming up all 4 babies, or the T. rex 3 times.
// Dinos win by roaring the UFO out of the sky (5 hits), or by lasting 2 minutes.

import { W, H, GROUND, WORLD, KIND_LIST, rrect, text, drawDino, drawUFO, drawBeam, getTheme } from './art'
import { sfx, beamOn } from './sound'
import { Dino, inBeam } from './game'
import { safeName, yearLabel } from './names'

const ROUND_TIME = 120
const POWERS = ['mega', 'shield', 'speed']
const POWER_NAMES = { mega: 'MEGA ROAR', shield: 'SHIELD', speed: 'SPEED' }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt))
const STATES = ['walk', 'lifted', 'fall', 'gone']

export function newRound(game) {
  const vs = game.vs
  vs.t = ROUND_TIME
  vs.winner = ''
  vs.overT = 0
  vs.bannerT = 0
  vs.events = []
  vs.ufo = { x: 1100, y: 160, vx: 0, vy: 0, hp: 5, maxHp: 5, fuel: 1, ammo: 6, energy: 1, beaming: false, stun: 0, inv: 0, hurt: 0, face: -1, laserCd: 0 }
  vs.rex = { x: 1700, y: GROUND, vx: 0, vy: 0, face: -1, walk: 0, onGround: true, lives: 3, roars: 3, roarCd: 0, roarT: 0, lifted: false, stun: 0, inv: 0, power: null }
  vs.babies = ['trike', 'stego', 'raptor', 'bronto'].map((k, i) => new Dino(1300 + i * 150, k, 0.55))
  vs.bolts = []
  vs.seen = new Set()
  vs.remote = { f: 0, j: 0, a: 0, mc: 0, sc: 0 }
  game.quiz = null
  game.cam.x = clamp(vs.mySide === 'aliens' ? vs.ufo.x : vs.rex.x, W / 2, WORLD - W / 2)
  game.cam.y = H / 2
  game.cam.zoom = 1
}

// ---------- host: run the whole match ----------

function event(game, type, x, y) {
  const vs = game.vs
  vs.evId = (vs.evId || 0) + 1
  vs.events.push([vs.evId, type, Math.round(x), Math.round(y)])
  if (vs.events.length > 12) vs.events.shift()
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
    if (!r.lifted && r.inv <= 0 && r.power?.kind !== 'shield' && inBeam(u.x, u.y, r.x, r.y - 40)) {
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
  }
}

// The guest copies the host's snapshot into its own game so it can draw it.
export function applySnapshot(game, s) {
  const vs = game.vs
  if (!s?.u) return
  if (s.rd !== vs.round) {
    vs.round = s.rd
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
  for (const ev of s.e || []) playEvent(game, ev)
}

// Sounds and sparkles for things that happened, played once on each screen.
export function playEvent(game, ev) {
  const vs = game.vs
  const [id, type, x, y] = ev
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
    case 'win':
      beamOn(false)
      if (vs.winner === vs.mySide) sfx.win()
      else sfx.lose()
      game.earn(vs.winner === vs.mySide ? 15 : 5)
      if (vs.winner === vs.mySide) game.gain('dna', 1)
      break
  }
}

// ---------- drawing ----------

export function drawVersus(game, ctx) {
  const vs = game.vs
  const t = game.time
  const u = vs.ufo
  const r = vs.rex
  game.drawWorld(ctx, getTheme('dinos'), game.cam, () => {
    if (u.beaming) drawBeam(ctx, u.x, u.y + 12, GROUND, t, { power: 0.6 + u.energy * 0.4 })
    for (const b of vs.babies) {
      if (b.state === 'gone') continue
      b.draw(ctx, t, { lookUp: Math.abs(u.x - b.x) < 150 })
    }
    if (!(r.inv > 0 && Math.floor(t * 12) % 2 === 0)) {
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
    ctx.save()
    ctx.translate(u.x, u.y + Math.sin(t * 3) * 3)
    drawUFO(ctx, { time: t, tint: vs.names.aliens.ufo, evo: vs.names.aliens.evo || 0, hurt: u.hurt > 0, stun: u.stun > 0 && u.hp > 0, mood: 'happy' })
    ctx.restore()
    for (const b of vs.bolts) {
      ctx.fillStyle = '#2ce8f5'
      ctx.fillRect(Math.round(b.x / 3) * 3 - 6, Math.round(b.y / 3) * 3 - 6, 12, 12)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(Math.round(b.x / 3) * 3 - 3, Math.round(b.y / 3) * 3 - 3, 6, 6)
    }
    // name tags over each player
    text(ctx, vs.names.aliens.name, u.x, u.y - 46, 13, '#7dffb0')
    text(ctx, vs.names.dinos.name, r.x, r.y - 112, 13, '#ffa94d')
  })
  // HUD: your stats on the left, the match in the middle
  const mine = vs.mySide
  hud(ctx, 14, 12, 250, mine === 'aliens' ? 126 : 100)
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
    for (let i = 0; i < 3; i++) text(ctx, '❤', 104 + i * 30, 37, 22, i < r.lives ? '#ff5a7a' : 'rgba(255,255,255,0.2)')
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
  text(ctx, `UFO ${'■'.repeat(u.hp)}  BABIES ${babies}  REX ${'❤'.repeat(Math.max(0, r.lives))}`, W / 2, 70, 12, '#c0cbdc')
  hud(ctx, W - 254, 12, 240, 74)
  text(ctx, 'VS', W - 134, 34, 13, '#c0cbdc')
  text(ctx, tag(vs, 'aliens'), W - 134, 54, 13, '#7dffb0')
  text(ctx, tag(vs, 'dinos'), W - 134, 74, 13, '#ffa94d')
  if (vs.bannerT < 3.5) {
    vs.bannerT += 1 / 60
    text(ctx, tag(vs, 'aliens'), W / 2, 190, 34, '#7dffb0')
    text(ctx, 'VS', W / 2, 230, 26, '#fee761')
    text(ctx, tag(vs, 'dinos'), W / 2, 272, 34, '#ffa94d')
  }
  if (vs.winner) {
    ctx.fillStyle = 'rgba(15,10,40,0.6)'
    ctx.fillRect(0, 0, W, H)
    const won = vs.winner === mine
    text(ctx, vs.winner === 'aliens' ? 'ALIENS WIN!' : 'DINOS WIN!', W / 2, 200, 60, vs.winner === 'aliens' ? '#7dffb0' : '#ffa94d')
    text(ctx, won ? 'YOU WON! +15 $' : 'GOOD TRY! +5 $', W / 2, 250, 26, '#fee761')
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
