import {
  BASE_R,
  CHARACTERS,
  CX,
  CY,
  GROUNDS,
  H,
  HAMMERS,
  HIT_WORDS,
  RULES,
  RULE_EVERY,
  SCHEMES,
  SKIES,
  W,
  WINS_TO_WIN,
} from './data'
import { groundAt, inShape, nearestSafe, onStatic, pickMap, pickSpawns, safeAt, updateMap } from './maps'
import { sfx } from './sound'

const TAU = Math.PI * 2
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

let roundCounter = 0

// ---------------------------------------------------------------- setup

export function createMatch(humans) {
  return {
    humans,
    lastMap: -1,
    // The rule timer keeps running across rounds, so rules really do change
    // every 20 seconds of play even when rounds are short.
    rule: null,
    ruleClock: 0,
    round: 0,
    players: CHARACTERS.map((c, i) => ({
      id: i,
      ...c,
      human: i < humans,
      tag: i < humans ? `P${i + 1}` : 'CPU',
      scheme: i < humans ? (humans === 1 ? 'solo' : `p${i + 1}`) : null,
      skill: 0.55 + Math.random() * 0.35,
      wins: 0,
      coins: 0,
    })),
  }
}

export function createRound(match) {
  match.round += 1
  const map = pickMap(match.lastMap)
  match.lastMap = map.index
  const spawns = pickSpawns(map, match.players.length)
  const players = match.players.map((m, i) => ({
    m,
    x: spawns[i].x,
    y: spawns[i].y,
    vx: 0,
    vy: 0,
    z: 0,
    vz: 0,
    facing: Math.atan2(CY - spawns[i].y, CX - spawns[i].x),
    state: 'alive',
    dmg: 0,
    hammer: 'mallet',
    mega: !!match.rule && match.rule.key === 'mega',
    usingMega: false,
    swinging: false,
    swingT: 0,
    swingDur: 0.3,
    swingCd: 0,
    hitDone: false,
    dashT: 0,
    dashCd: 0,
    shieldT: 0,
    shieldCd: 0,
    stun: 0,
    spin: 0,
    spinV: 0,
    fallT: 0,
    coinT: 0,
    roundCoins: 0,
    lastHitBy: null,
    lastHitT: -99,
    bounceCd: 0,
    walk: 0,
    input: { mx: 0, my: 0, bonk: false, dash: false, shield: false, aim: null },
    ai: { t: 0, target: null, retarget: 0 },
  }))
  return {
    id: ++roundCounter,
    match,
    map,
    sky: pick(SKIES),
    ground: pick(GROUNDS),
    clouds: Array.from({ length: 9 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.6 + Math.random() * 1.2,
      v: 6 + Math.random() * 14,
    })),
    stars: Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H })),
    t: 0,
    playT: 0,
    phase: 'countdown',
    countdown: 3,
    rule: match.rule,
    R: ruleFlags(match.rule),
    ruleClock: match.ruleClock,
    banner: null,
    players,
    crates: [],
    crateT: 6,
    popups: [],
    particles: [],
    twinkles: [],
    feed: [],
    shake: 0,
    hitstop: 0,
    quakeT: 0,
    endT: 0,
    winner: null,
    matchOver: false,
  }
}

function ruleFlags(rule) {
  const k = rule ? rule.key : null
  return Object.fromEntries(RULES.map((r) => [r.key, r.key === k]))
}

const sizeOf = (w) => (w.R.tiny ? 0.55 : 1)
const hitRadius = (w) => BASE_R * sizeOf(w) * (w.R.bigheads ? 1.7 : 1)

function reachOf(w, p) {
  const k = sizeOf(w)
  if (p.usingMega || (p.mega && !p.swinging)) return 78 * k
  return HAMMERS[p.hammer].reach * k * (w.R.giant ? 1.7 : 1)
}

// ---------------------------------------------------------------- effects

function popup(w, x, y, text, color = '#fff', size = 18, life = 1) {
  w.popups.push({ x, y, text, color, size, life, t: 0, rot: (Math.random() - 0.5) * 0.3 })
}

function burst(w, x, y, color, n = 10, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU
    const s = speed * (0.3 + Math.random() * 0.7)
    w.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      t: 0,
      life: 0.4 + Math.random() * 0.4,
      r: 2 + Math.random() * 4,
      color,
    })
  }
}

function addFeed(w, text) {
  w.feed.unshift({ text, t: 0 })
  if (w.feed.length > 4) w.feed.pop()
}

function addCoins(w, p, n) {
  p.roundCoins += n
  p.m.coins += n
  popup(w, p.x, p.y - 60, `+${n} 🪙`, '#ffd23f', 14, 1.1)
  if (p.m.human) sfx.coin()
}

// ---------------------------------------------------------------- rules

function setRule(w, rule) {
  w.rule = rule
  w.match.rule = rule
  w.R = ruleFlags(rule)
  w.banner = { rule, t: 0 }
  sfx.rule()
  for (const p of w.players) p.mega = rule.key === 'mega' && p.state === 'alive'
}

// ---------------------------------------------------------------- input

export function readHumanInput(keys, scheme) {
  const s = SCHEMES[scheme]
  const held = (list) => list.some((k) => keys.down.has(k))
  const tapped = (list) => list.some((k) => keys.pressed.has(k))
  return {
    mx: (held(s.right) ? 1 : 0) - (held(s.left) ? 1 : 0),
    my: (held(s.down) ? 1 : 0) - (held(s.up) ? 1 : 0),
    bonk: held(s.bonk) || tapped(s.bonk),
    dash: tapped(s.dash),
    shield: tapped(s.shield),
    aim: null,
  }
}

function pathSafe(w, p, dx, dy, dist) {
  for (const f of [0.5, 1]) {
    if (!groundAt(w.map, p.x + dx * dist * f, p.y + dy * dist * f)) return false
  }
  return true
}

function botThink(w, p, dt) {
  const inp = p.input
  inp.bonk = false
  inp.dash = false
  inp.shield = false
  p.ai.t -= dt

  // Reflex: if we're sliding towards the edge, scramble back to safety.
  const speed = Math.hypot(p.vx, p.vy)
  if (p.z <= 0 && p.stun <= 0 && speed > 20 && !pathSafe(w, p, p.vx / speed, p.vy / speed, 22 + speed * 0.15)) {
    const s = nearestSafe(w.map, p.x, p.y)
    const sd = Math.hypot(s.x - p.x, s.y - p.y) || 1
    // If even the way back is a gap (say, we're riding a moving platform),
    // just stand still and enjoy the ride.
    const ok = pathSafe(w, p, (s.x - p.x) / sd, (s.y - p.y) / sd, 30)
    inp.mx = ok ? (s.x - p.x) / sd : 0
    inp.my = ok ? (s.y - p.y) / sd : 0
    inp.aim = null
    p.ai.t = 0.12
    return
  }
  if (p.ai.t > 0) return
  const skill = p.m.skill
  p.ai.t = 0.07 + (1 - skill) * 0.16
  inp.aim = null
  if (p.z > 0) {
    // Mid-air: wiggle back towards solid ground.
    const s = nearestSafe(w.map, p.x + p.vx * 0.5, p.y + p.vy * 0.5)
    const sd = Math.hypot(s.x - p.x, s.y - p.y) || 1
    inp.mx = (s.x - p.x) / sd
    inp.my = (s.y - p.y) / sd
    return
  }
  if (p.stun > 0) {
    inp.mx = 0
    inp.my = 0
    return
  }
  const others = w.players.filter((q) => q !== p && q.state === 'alive')

  // Throw up a shield when someone is about to bonk us.
  if (p.shieldCd <= 0) {
    for (const q of others) {
      if (!q.swinging || q.swingT / q.swingDur > 0.45) continue
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      const facingUs = Math.abs(angleDiff(Math.atan2(p.y - q.y, p.x - q.x), q.facing)) < 1
      if (d < reachOf(w, q) + 30 && facingUs && Math.random() < 0.45 * skill) inp.shield = true
    }
  }

  let target = p.ai.target
  if (!target || target.state !== 'alive' || w.t > p.ai.retarget) {
    const sorted = others
      .map((q) => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) }))
      .sort((a, b) => a.d - b.d)
    target = sorted.length ? (Math.random() < 0.75 ? sorted[0].q : pick(sorted).q) : null
    p.ai.target = target
    p.ai.retarget = w.t + 1.5 + Math.random() * 2
  }

  let gx = CX
  let gy = CY
  let attacking = false
  const crate = w.crates
    .filter((c) => c.z <= 0)
    .map((c) => ({ c, d: Math.hypot(c.x - p.x, c.y - p.y) }))
    .sort((a, b) => a.d - b.d)[0]
  if (crate && (crate.d < 170 || p.hammer === 'mallet') && crate.d < 320) {
    gx = crate.c.x
    gy = crate.c.y
  } else if (target) {
    gx = target.x
    gy = target.y
    attacking = true
  }

  let dx = gx - p.x
  let dy = gy - p.y
  const d = Math.hypot(dx, dy) || 1
  dx /= d
  dy /= d

  if (attacking && d < reachOf(w, p) + hitRadius(w) - 6) {
    inp.aim = Math.atan2(dy, dx)
    inp.mx = 0
    inp.my = 0
    if (!p.swinging && p.swingCd <= 0 && Math.random() < 0.1 + skill * 0.25) inp.bonk = true
    // Try to get on the "inside" of the target so the hit sends them outwards.
    const toCenter = nearestSafe(w.map, p.x, p.y)
    const cdx = toCenter.x - p.x
    const cdy = toCenter.y - p.y
    const cd = Math.hypot(cdx, cdy)
    if (cd > 30) {
      inp.mx = (cdx / cd) * 0.4
      inp.my = (cdy / cd) * 0.4
    }
    return
  }

  if (
    attacking &&
    d > 110 &&
    d < 240 &&
    p.dashCd <= 0 &&
    Math.random() < 0.12 * skill &&
    pathSafe(w, p, dx, dy, Math.min(d, 150))
  ) {
    inp.dash = true
    inp.aim = Math.atan2(dy, dx)
  }

  if (!pathSafe(w, p, dx, dy, 40)) {
    const s = nearestSafe(w.map, p.x, p.y)
    const sx = s.x - p.x
    const sy = s.y - p.y
    const sd = Math.hypot(sx, sy) || 1
    dx = sx / sd
    dy = sy / sd
    if (!pathSafe(w, p, dx, dy, 30)) {
      dx = 0
      dy = 0
    }
  }
  inp.mx = dx
  inp.my = dy
}

// ---------------------------------------------------------------- combat

function startSwing(w, p) {
  const h = HAMMERS[p.hammer]
  p.usingMega = p.mega
  p.mega = false
  p.swinging = true
  p.swingT = 0
  p.hitDone = false
  p.swingDur = p.usingMega ? 0.42 : h.swing
  p.swingCd = p.swingDur + (p.usingMega ? 0.5 : h.cooldown)

  // Aim assist for humans: snap to a nearby enemy roughly in front.
  if (p.m.human) {
    let best = null
    let bestD = Infinity
    for (const q of w.players) {
      if (q === p || q.state !== 'alive') continue
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      const a = Math.atan2(q.y - p.y, q.x - p.x)
      if (d < reachOf(w, p) + 30 && Math.abs(angleDiff(a, p.facing)) < 1.3 && d < bestD) {
        best = a
        bestD = d
      }
    }
    if (best !== null) p.facing = best
  }
}

function doHit(w, a) {
  const h = HAMMERS[a.hammer]
  const mega = a.usingMega
  const reach = reachOf(w, a)
  const arc = mega ? 1.8 : h.arc
  const tr = hitRadius(w)
  let landed = false

  for (const t of w.players) {
    if (t === a || t.state !== 'alive' || t.z > 60) continue
    const dx = t.x - a.x
    const dy = t.y - a.y
    const d = Math.hypot(dx, dy)
    if (d > reach + tr) continue
    const diff = Math.abs(angleDiff(Math.atan2(dy, dx), a.facing))
    if (diff > arc / 2 + 0.35 && d > BASE_R * sizeOf(w) * 2 + 4) continue
    landed = true
    const ux = d > 1 ? dx / d : Math.cos(a.facing)
    const uy = d > 1 ? dy / d : Math.sin(a.facing)

    if (t.shieldT > 0) {
      a.vx = -ux * 320
      a.vy = -uy * 320
      a.stun = 0.35
      burst(w, (a.x + t.x) / 2, (a.y + t.y) / 2 - 20, '#8ff5ff', 12, 260)
      popup(w, t.x, t.y - 50, 'BLOCKED!', '#8ff5ff', 16)
      sfx.block()
      continue
    }

    t.dmg += h.dmg * (mega ? 2.5 : 1)
    // Every hit pops you high into the sky. How far sideways you land grows
    // quickly with damage: small at first, then ridiculous.
    const dist =
      (40 + 1.2 * t.dmg + 0.02 * t.dmg * t.dmg) *
      (h.power / 330) *
      (mega ? 2.2 : 1) *
      (w.R.tiny ? 1.3 : 1) *
      (w.R.lowgrav ? 0.6 : 1) *
      (w.R.giant && !mega ? 1.25 : 1) *
      (1 + w.playT / 90)
    t.vz = Math.min(1000, 420 + t.dmg * 3) * (mega ? 1.3 : 1)
    const kb = dist / ((2 * t.vz) / 1100)
    t.vx = ux * kb
    t.vy = uy * kb
    t.z = Math.max(t.z, 0.5)
    t.stun = 0.2 + Math.min(0.5, dist / 800)
    t.swinging = false
    t.dashT = 0
    t.spinV = (Math.random() < 0.5 ? -1 : 1) * (10 + dist / 40)
    t.lastHitBy = a
    t.lastHitT = w.t

    w.hitstop = Math.min(0.13, 0.04 + dist / 6000)
    w.shake = Math.max(w.shake, Math.min(24, 5 + dist / 30))
    const word = pick(HIT_WORDS[mega ? 'mega' : h.sound])
    popup(w, t.x, t.y - 45, word, mega ? '#ff3b3b' : '#fff', mega ? 30 : 22, 0.9)
    burst(w, t.x, t.y - 20, '#fff6a8', 14, 300)
    if (dist > 280) {
      popup(w, t.x, t.y - 80, pick(['YEEEET!', 'BYE BYE!', 'WHEEEE!', 'TO THE MOON!']), '#ff7ad9', 20, 1.3)
      sfx.yeet()
    }
  }

  if (landed) {
    if (mega) sfx.mega()
    else sfx[h.sound]()
  } else {
    sfx.whiff()
  }
}

function eliminate(w, p, how) {
  p.state = 'out'
  const killer = p.lastHitBy && w.t - p.lastHitT < 6 ? p.lastHitBy : null
  if (how === 'ko') {
    addFeed(w, killer ? `${killer.m.name} launched ${p.m.name} into space!` : `${p.m.name} flew away!`)
  } else {
    addFeed(w, killer ? `${killer.m.name} BONKED ${p.m.name} off!` : `${p.m.name} fell off!`)
  }
  for (const q of w.players) if (q.state === 'alive') addCoins(w, q, 2)
}

// ---------------------------------------------------------------- update

export function step(w, dt, keys) {
  updateFx(w, dt)
  if (w.phase === 'over') return
  if (w.hitstop > 0) {
    w.hitstop -= dt
    return
  }

  w.t += dt
  updateMap(w.map, w.t)

  if (w.phase === 'countdown') {
    const before = Math.ceil(w.countdown)
    w.countdown -= dt
    if (w.countdown <= 0) {
      w.phase = 'playing'
      sfx.go()
      popup(w, CX, CY - 40, 'BONK!', '#ffd23f', 64, 1.2)
    } else if (Math.ceil(w.countdown) !== before) {
      sfx.count()
    }
  }
  const playing = w.phase === 'playing'

  if (playing) {
    w.playT += dt
    w.ruleClock += dt
    if (w.ruleClock >= RULE_EVERY) {
      w.ruleClock = 0
      setRule(w, pick(RULES.filter((r) => r !== w.rule)))
    }
    w.match.ruleClock = w.ruleClock
    if (w.R.quake) {
      w.shake = Math.max(w.shake, 6)
      w.quakeT -= dt
      if (w.quakeT <= 0) {
        w.quakeT = 0.8
        for (const p of w.players) {
          if (p.state !== 'alive' || p.z > 0) continue
          const a = Math.random() * TAU
          p.vx += Math.cos(a) * 180
          p.vy += Math.sin(a) * 180
          p.vz = 110
          p.z = 0.5
          p.stun = Math.max(p.stun, 0.15)
        }
      }
    }
    w.crateT -= dt
    if (w.crateT <= 0 && w.crates.length < 2) {
      w.crateT = 7 + Math.random() * 5
      const spots = w.map.safe.filter((s) => safeAt(w.map, s.x, s.y, 30))
      if (spots.length) {
        const s = pick(spots)
        const type = pick(Object.keys(HAMMERS).filter((k) => k !== 'mallet'))
        w.crates.push({ x: s.x, y: s.y, z: 320, vz: 0, type })
      }
    }
  }

  for (const p of w.players) {
    if (p.state !== 'alive') continue
    if (!playing) {
      p.input = { mx: 0, my: 0, bonk: false, dash: false, shield: false, aim: null }
    } else if (p.m.human) {
      p.input = readHumanInput(keys, p.m.scheme)
    } else {
      botThink(w, p, dt)
    }
  }

  const k = sizeOf(w)
  const g = w.R.lowgrav ? 300 : 1100
  for (const p of w.players) {
    if (p.state === 'falling') {
      p.fallT += dt
      p.x += p.vx * dt * 0.4
      p.y += p.vy * dt * 0.4
      if (p.fallT > 1) eliminate(w, p, 'fall')
      continue
    }
    if (p.state !== 'alive') continue

    p.swingCd = Math.max(0, p.swingCd - dt)
    p.dashCd = Math.max(0, p.dashCd - dt)
    p.shieldCd = Math.max(0, p.shieldCd - dt)
    p.shieldT = Math.max(0, p.shieldT - dt)
    p.stun = Math.max(0, p.stun - dt)
    p.bounceCd = Math.max(0, p.bounceCd - dt)
    p.dashT -= dt

    const inp = p.input
    const grounded = p.z <= 0

    // Ride moving platforms (only when there's no solid ground underneath).
    if (grounded && !onStatic(w.map, p.x, p.y)) {
      for (const s of w.map.movers) {
        if (inShape(s, p.x + s.dx, p.y + s.dy)) {
          p.x += s.dx
          p.y += s.dy
          break
        }
      }
    }

    if (grounded && p.stun <= 0 && playing) {
      if (inp.aim !== null && inp.aim !== undefined && !p.swinging) p.facing = inp.aim
      if (inp.shield && p.shieldCd <= 0) {
        p.shieldT = 1.4
        p.shieldCd = 6
        sfx.shield()
      }
      if (inp.dash && p.dashCd <= 0) {
        const a = inp.mx || inp.my ? Math.atan2(inp.my, inp.mx) : p.facing
        const sp = 580 * (w.R.speed ? 1.35 : 1)
        p.facing = a
        p.vx = Math.cos(a) * sp
        p.vy = Math.sin(a) * sp
        p.dashT = 0.2
        p.dashCd = 1.5
        sfx.dash()
        burst(w, p.x, p.y, 'rgba(255,255,255,0.8)', 8, 120)
      }
      if (inp.bonk && !p.swinging && p.swingCd <= 0) startSwing(w, p)
      if (p.dashT <= 0) {
        const len = Math.hypot(inp.mx, inp.my)
        const maxS = 200 * (w.R.speed ? 1.75 : 1)
        const tx = len ? (inp.mx / len) * maxS * Math.min(1, len) : 0
        const ty = len ? (inp.my / len) * maxS * Math.min(1, len) : 0
        const f = 1 - Math.exp(-(w.R.ice ? 1.5 : 11) * dt)
        p.vx += (tx - p.vx) * f
        p.vy += (ty - p.vy) * f
        if (len > 0.5) {
          if (!p.swinging && (inp.aim === null || inp.aim === undefined)) {
            p.facing = Math.atan2(inp.my, inp.mx)
          }
          p.walk += dt * 14
        }
      }
    } else if (grounded) {
      const f = Math.exp(-(w.R.ice ? 0.5 : 6) * dt)
      p.vx *= f
      p.vy *= f
    }

    if (p.swinging) {
      p.swingT += dt
      if (!p.hitDone && p.swingT >= p.swingDur * 0.5) {
        p.hitDone = true
        doHit(w, p)
      }
      if (p.swingT >= p.swingDur) {
        p.swinging = false
        p.usingMega = false
      }
    }

    // Flying through the air.
    if (p.z > 0 || p.vz > 0) {
      p.vz -= g * dt
      p.z += p.vz * dt
      p.spin += p.spinV * dt
      const drag = Math.exp(-0.15 * dt)
      p.vx *= drag
      p.vy *= drag
      // A little air steering, so good players can save themselves.
      const len = Math.hypot(inp.mx, inp.my)
      if (len > 0 && playing) {
        p.vx += (inp.mx / len) * 280 * dt
        p.vy += (inp.my / len) * 280 * dt
      }
      if (p.z > 40 && Math.random() < 0.6) {
        w.particles.push({
          x: p.x,
          y: p.y - p.z * 0.8 - BASE_R * k,
          vx: 0,
          vy: 0,
          t: 0,
          life: 0.35,
          r: 6 * k,
          color: p.m.color,
        })
      }
      if (p.z <= 0) {
        p.z = 0
        if (groundAt(w.map, p.x, p.y)) {
          if (p.vz < -380) {
            p.vz = -p.vz * 0.3
            p.z = 0.01
            if (w.R.lowgrav || w.R.bouncy) sfx.boing()
          } else {
            p.vz = 0
            p.spin = 0
            p.spinV = 0
          }
          p.vx *= 0.4
          p.vy *= 0.4
          burst(w, p.x, p.y, 'rgba(120,90,60,0.6)', 6, 90)
        } else {
          p.vz = 0
        }
      }
    }

    p.x += p.vx * dt
    p.y += p.vy * dt

    if (p.z <= 0 && !groundAt(w.map, p.x, p.y)) {
      p.state = 'falling'
      p.fallT = 0
      p.swinging = false
      sfx.fall()
      popup(w, p.x, p.y - 40, pick(['AAAAH!', 'NOOOO!', 'BYEEE!', 'WAAAH!']), '#fff', 16)
    } else if (p.x < -160 || p.x > W + 160 || p.y < -220 || p.y > H + 160 || p.z > 900) {
      p.state = 'out'
      w.twinkles.push({ x: clamp(p.x, 30, W - 30), y: clamp(p.y - p.z * 0.8, 30, H - 30), t: 0, color: p.m.color })
      sfx.ko()
      eliminate(w, p, 'ko')
    }

    if (playing) {
      p.coinT += dt
      if (p.coinT >= 4) {
        p.coinT -= 4
        addCoins(w, p, 1)
      }
    }
  }

  // Bumping into each other.
  const alive = w.players.filter((p) => p.state === 'alive')
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]
      const b = alive[j]
      if (Math.abs(a.z - b.z) > 25) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 0.01
      const min = BASE_R * k * 2
      if (d >= min) continue
      const ux = dx / d
      const uy = dy / d
      const push = (min - d) / 2
      a.x -= ux * push
      a.y -= uy * push
      b.x += ux * push
      b.y += uy * push
      const dasher = a.dashT > 0 ? a : b.dashT > 0 ? b : null
      if (w.R.bouncy && a.bounceCd <= 0 && b.bounceCd <= 0) {
        for (const [p, s, other] of [
          [a, -1, b],
          [b, 1, a],
        ]) {
          p.vx = ux * s * 420
          p.vy = uy * s * 420
          p.lastHitBy = other
          p.lastHitT = w.t
          p.vz = 260
          p.z = 0.5
          p.stun = 0.3
          p.bounceCd = 0.4
          p.spinV = 10
        }
        sfx.boing()
        popup(w, (a.x + b.x) / 2, (a.y + b.y) / 2 - 40, 'BOING!', '#ff9f1c', 18)
      } else if (dasher) {
        const other = dasher === a ? b : a
        const s = dasher === a ? 1 : -1
        if (other.shieldT <= 0) {
          other.vx = ux * s * 380
          other.vy = uy * s * 380
          other.vz = 150
          other.z = 0.5
          other.stun = 0.25
          other.dmg += 4
          other.lastHitBy = dasher
          other.lastHitT = w.t
          popup(w, other.x, other.y - 40, 'BUMP!', '#fff', 16)
          sfx.bonk()
        }
        dasher.dashT = 0
        dasher.vx *= 0.2
        dasher.vy *= 0.2
      }
    }
  }

  // Hammer crates falling from the sky.
  for (const c of w.crates) {
    if (c.z > 0) {
      c.vz -= 900 * dt
      c.z = Math.max(0, c.z + c.vz * dt)
    }
  }
  w.crates = w.crates.filter((c) => {
    if (!groundAt(w.map, c.x, c.y)) return false
    if (c.z > 10) return true
    for (const p of alive) {
      if (p.z < 12 && Math.hypot(p.x - c.x, p.y - c.y) < BASE_R * k + 16) {
        p.hammer = c.type
        popup(w, p.x, p.y - 55, `${HAMMERS[c.type].emoji} ${HAMMERS[c.type].name}!`, '#ffd23f', 14, 1.4)
        sfx.pickup()
        return false
      }
    }
    return true
  })

  if (playing) {
    const stillIn = w.players.filter((p) => p.state === 'alive')
    const falling = w.players.some((p) => p.state === 'falling')
    if (stillIn.length <= 1 && !falling) {
      w.endT += dt
      if (w.endT > 1.2) finishRound(w)
    }
  }
}

function finishRound(w) {
  w.phase = 'over'
  const winner = w.players.find((p) => p.state === 'alive') || null
  w.winner = winner
  if (winner) {
    winner.m.wins += 1
    addCoins(w, winner, 10)
    popup(w, winner.x, winner.y - 90, '👑 WINNER!', '#ffd23f', 26, 3)
    w.matchOver = winner.m.wins >= WINS_TO_WIN
  }
  sfx.win()
}

function updateFx(w, dt) {
  for (const p of w.popups) {
    p.t += dt
    p.y -= 28 * dt
  }
  w.popups = w.popups.filter((p) => p.t < p.life)
  for (const p of w.particles) {
    p.t += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 0.9
    p.vy *= 0.9
  }
  w.particles = w.particles.filter((p) => p.t < p.life)
  for (const t of w.twinkles) t.t += dt
  w.twinkles = w.twinkles.filter((t) => t.t < 1.2)
  for (const f of w.feed) f.t += dt
  w.feed = w.feed.filter((f) => f.t < 5)
  for (const c of w.clouds) {
    c.x += c.v * dt
    if (c.x > W + 120) c.x = -120
  }
  if (w.banner) {
    w.banner.t += dt
    if (w.banner.t > 2.6) w.banner = null
  }
  w.shake *= Math.exp(-7 * dt)
}

// ---------------------------------------------------------------- HUD data

export function snapshot(w) {
  return {
    id: w.id,
    phase: w.phase,
    mapName: w.map.name,
    round: w.match.round,
    rule: w.rule,
    nextRuleIn: Math.ceil(RULE_EVERY - w.ruleClock),
    winner: w.winner ? w.winner.m.id : null,
    matchOver: w.matchOver,
    players: w.players.map((p) => ({
      id: p.m.id,
      name: p.m.name,
      tag: p.m.tag,
      color: p.m.color,
      human: p.m.human,
      dmg: Math.round(p.dmg),
      coins: p.m.coins,
      roundCoins: p.roundCoins,
      wins: p.m.wins,
      hammer: p.mega ? '👊 Mega Punch' : `${HAMMERS[p.hammer].emoji} ${HAMMERS[p.hammer].name}`,
      out: p.state !== 'alive',
      dashReady: p.dashCd <= 0,
      shieldReady: p.shieldCd <= 0,
    })),
  }
}

// ---------------------------------------------------------------- drawing

let layer = null
const patterns = new Map()

function getLayer() {
  if (!layer) {
    layer = document.createElement('canvas')
    layer.width = W
    layer.height = H
  }
  return layer
}

function groundPattern(ctx, g) {
  if (!patterns.has(g)) {
    const c = document.createElement('canvas')
    c.width = 48
    c.height = 48
    const pc = c.getContext('2d')
    pc.fillStyle = g.a
    pc.fillRect(0, 0, 48, 48)
    pc.fillStyle = g.b
    pc.fillRect(0, 0, 24, 24)
    pc.fillRect(24, 24, 24, 24)
    patterns.set(g, ctx.createPattern(c, 'repeat'))
  }
  return patterns.get(g)
}

function tracePath(ctx, s, oy = 0) {
  ctx.beginPath()
  if (s.k === 'c') {
    ctx.arc(s.x, s.y + oy, s.r, 0, TAU)
  } else if (s.k === 'r') {
    if (ctx.roundRect) ctx.roundRect(s.x - s.w / 2, s.y - s.h / 2 + oy, s.w, s.h, 14)
    else ctx.rect(s.x - s.w / 2, s.y - s.h / 2 + oy, s.w, s.h)
  } else {
    s.pts.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(s.x + px, s.y + py + oy)
      else ctx.lineTo(s.x + px, s.y + py + oy)
    })
    ctx.closePath()
  }
}

function paintStatics(w, fill) {
  const lc = getLayer().getContext('2d')
  lc.clearRect(0, 0, W, H)
  lc.globalCompositeOperation = 'source-over'
  lc.fillStyle = fill
  for (const s of w.map.statics) {
    tracePath(lc, s)
    lc.fill()
  }
  lc.globalCompositeOperation = 'destination-out'
  for (const s of w.map.holes) {
    tracePath(lc, s)
    lc.fill()
  }
  lc.globalCompositeOperation = 'source-over'
  return getLayer()
}

function drawBackground(ctx, w) {
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, w.sky.top)
  grad.addColorStop(1, w.sky.bottom)
  ctx.fillStyle = grad
  ctx.fillRect(-40, -40, W + 80, H + 80)
  if (w.sky.stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (const s of w.stars) {
      const tw = 1 + Math.sin(w.t * 3 + s.x) * 0.5
      ctx.fillRect(s.x, s.y, tw * 1.5, tw * 1.5)
    }
  }
  ctx.fillStyle = w.sky.cloud
  for (const c of w.clouds) {
    ctx.beginPath()
    ctx.ellipse(c.x, c.y, 50 * c.s, 18 * c.s, 0, 0, TAU)
    ctx.ellipse(c.x + 30 * c.s, c.y - 10 * c.s, 34 * c.s, 16 * c.s, 0, 0, TAU)
    ctx.ellipse(c.x - 28 * c.s, c.y - 6 * c.s, 28 * c.s, 13 * c.s, 0, 0, TAU)
    ctx.fill()
  }
}

function drawPlatforms(ctx, w) {
  const g = w.ground
  const side = paintStatics(w, g.side)
  for (const oy of [26, 20, 14, 8]) ctx.drawImage(side, 0, oy)
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.drawImage(paintStatics(w, g.edge), 0, 26)
  ctx.restore()
  ctx.drawImage(paintStatics(w, groundPattern(ctx, g)), 0, 0)

  for (const s of w.map.movers) {
    ctx.fillStyle = '#7a5230'
    for (const oy of [18, 12, 6]) {
      tracePath(ctx, s, oy)
      ctx.fill()
    }
    tracePath(ctx, s)
    ctx.fillStyle = '#d9a45b'
    ctx.fill()
    ctx.strokeStyle = '#a8763a'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.save()
    tracePath(ctx, s)
    ctx.clip()
    ctx.strokeStyle = 'rgba(122,82,48,0.5)'
    ctx.lineWidth = 2
    for (let yy = s.y - 60; yy < s.y + 60; yy += 14) {
      ctx.beginPath()
      ctx.moveTo(s.x - 80, yy)
      ctx.lineTo(s.x + 80, yy)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawCrate(ctx, c, t) {
  const y = c.y - c.z
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(c.x, c.y + 4, 16, 6, 0, 0, TAU)
  ctx.fill()
  const bob = c.z > 0 ? 0 : Math.sin(t * 4) * 2
  ctx.fillStyle = '#c98b3c'
  ctx.fillRect(c.x - 15, y - 26 + bob, 30, 26)
  ctx.strokeStyle = '#7a4d1a'
  ctx.lineWidth = 3
  ctx.strokeRect(c.x - 15, y - 26 + bob, 30, 26)
  ctx.font = '16px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(HAMMERS[c.type].emoji, c.x, y - 13 + bob)
}

function swingOffset(p, h) {
  if (!p.swinging) return -1.3
  const t = p.swingT / p.swingDur
  const arc = p.usingMega ? 1.8 : h.arc
  const back = -(arc / 2 + 0.7)
  const fwd = arc / 2 + 0.2
  if (t < 0.4) return lerp(-1.3, back, t / 0.4)
  if (t < 0.6) return lerp(back, fwd, (t - 0.4) / 0.2)
  return lerp(fwd, -1.3, (t - 0.6) / 0.4)
}

function drawHammer(ctx, w, p, x, y, r) {
  const h = HAMMERS[p.hammer]
  const mega = p.usingMega || (p.mega && !p.swinging)
  const kk = sizeOf(w) * (w.R.giant && !mega ? 1.7 : 1)
  const L = (mega ? 58 : h.reach * 0.78) * kk
  const ang = p.facing + swingOffset(p, h)
  ctx.save()
  ctx.translate(x + Math.cos(p.facing) * r * 0.5, y + r * 0.1)
  ctx.rotate(ang)
  ctx.fillStyle = '#8a5a2b'
  ctx.strokeStyle = '#3d2410'
  ctx.lineWidth = 1.5
  ctx.fillRect(0, -2.5 * kk, L, 5 * kk)
  ctx.strokeRect(0, -2.5 * kk, L, 5 * kk)
  if (mega) {
    const gr = 22 * sizeOf(w)
    ctx.fillStyle = '#e8322b'
    ctx.beginPath()
    ctx.arc(L, 0, gr, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#7d0f0b'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#ff6b62'
    ctx.beginPath()
    ctx.arc(L - gr * 0.3, -gr * 0.7, gr * 0.45, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillRect(L - gr - 6, -gr * 0.6, 8, gr * 1.2)
  } else if (p.hammer === 'pan') {
    ctx.fillStyle = '#2a2a33'
    ctx.beginPath()
    ctx.arc(L + 12 * kk, 0, 15 * kk, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#4a4a58'
    ctx.beginPath()
    ctx.arc(L + 12 * kk, 0, 10 * kk, 0, TAU)
    ctx.fill()
  } else if (p.hammer === 'fish') {
    ctx.fillStyle = '#6fa8dc'
    ctx.beginPath()
    ctx.ellipse(L, 0, 20 * kk, 9 * kk, 0, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(L - 18 * kk, 0)
    ctx.lineTo(L - 30 * kk, -9 * kk)
    ctx.lineTo(L - 30 * kk, 9 * kk)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(L + 11 * kk, -2 * kk, 3 * kk, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(L + 12 * kk, -2 * kk, 1.5 * kk, 0, TAU)
    ctx.fill()
  } else {
    const big = p.hammer === 'sledge' ? 1.45 : 1
    const hw = 20 * kk * big
    const hh = 26 * kk * big
    ctx.fillStyle = p.hammer === 'sledge' ? '#4b515e' : p.hammer === 'squeaky' ? '#ff4d6d' : '#9aa1ad'
    ctx.fillRect(L - hw / 2, -hh / 2, hw, hh)
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 2
    ctx.strokeRect(L - hw / 2, -hh / 2, hw, hh)
    if (p.hammer === 'squeaky') {
      ctx.fillStyle = '#ffd23f'
      ctx.fillRect(L - hw / 2, -hh / 2, hw, hh * 0.22)
      ctx.fillRect(L - hw / 2, hh / 2 - hh * 0.22, hw, hh * 0.22)
    }
  }
  ctx.restore()
}

function drawEars(ctx, m, hr) {
  ctx.fillStyle = m.color
  ctx.strokeStyle = m.dark
  ctx.lineWidth = 2
  if (m.ears === 'bear') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(s * hr * 0.72, -hr * 0.72, hr * 0.32, 0, TAU)
      ctx.fill()
      ctx.stroke()
    }
  } else if (m.ears === 'bunny') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(s * hr * 0.38, -hr * 1.25, hr * 0.2, hr * 0.62, s * 0.15, 0, TAU)
      ctx.fill()
      ctx.stroke()
    }
  } else if (m.ears === 'fox') {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * hr * 0.25, -hr * 0.85)
      ctx.lineTo(s * hr * 0.75, -hr * 1.35)
      ctx.lineTo(s * hr * 0.9, -hr * 0.45)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else {
    for (const s of [-1, 0, 1]) {
      ctx.beginPath()
      ctx.ellipse(s * hr * 0.2, -hr * 1.05, hr * 0.1, hr * 0.28, s * 0.4, 0, TAU)
      ctx.fill()
    }
  }
}

function drawFace(ctx, p, hr) {
  const m = p.m
  const fx = Math.cos(p.facing)
  const fy = Math.sin(p.facing)
  ctx.fillStyle = m.light
  ctx.beginPath()
  ctx.ellipse(fx * hr * 0.3, hr * 0.3 + fy * hr * 0.1, hr * 0.48, hr * 0.34, 0, 0, TAU)
  ctx.fill()
  const stunned = p.stun > 0 || p.state === 'falling'
  for (const s of [-1, 1]) {
    const ex = s * hr * 0.36 + fx * hr * 0.28
    const ey = -hr * 0.12 + fy * hr * 0.15
    if (stunned) {
      ctx.strokeStyle = '#111'
      ctx.lineWidth = Math.max(1.5, hr * 0.1)
      const e = hr * 0.14
      ctx.beginPath()
      ctx.moveTo(ex - e, ey - e)
      ctx.lineTo(ex + e, ey + e)
      ctx.moveTo(ex + e, ey - e)
      ctx.lineTo(ex - e, ey + e)
      ctx.stroke()
      continue
    }
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(ex, ey, hr * 0.22, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(ex + fx * hr * 0.08, ey + fy * hr * 0.08, hr * 0.11, 0, TAU)
    ctx.fill()
  }
  if (m.ears === 'fox' && !stunned) {
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(hr * 0.36 + fx * hr * 0.28, -hr * 0.12 + fy * hr * 0.15, hr * 0.24, 0, TAU)
    ctx.fill()
  }
  if (m.ears === 'chick') {
    ctx.fillStyle = '#ff8c1a'
    ctx.beginPath()
    ctx.moveTo(fx * hr * 0.3 - hr * 0.2, hr * 0.22)
    ctx.lineTo(fx * hr * 0.3 + hr * 0.2, hr * 0.22)
    ctx.lineTo(fx * hr * 0.3, hr * 0.5)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.fillStyle = '#2a1a10'
    ctx.beginPath()
    ctx.ellipse(fx * hr * 0.3, hr * 0.18, hr * 0.12, hr * 0.08, 0, 0, TAU)
    ctx.fill()
  }
  if (m.ears === 'bear') {
    ctx.fillStyle = '#111'
    ctx.fillRect(-hr * 0.35, -hr * 1.35, hr * 0.7, hr * 0.45)
    ctx.fillRect(-hr * 0.5, -hr * 0.95, hr * 1.0, hr * 0.12)
  }
}

function drawPlayer(ctx, w, p) {
  const k = sizeOf(w)
  const falling = p.state === 'falling'
  const shrink = falling ? Math.max(0.05, 1 - p.fallT * 0.9) : 1
  const r = BASE_R * k * shrink
  const headK = w.R.bigheads ? 2.1 : 1
  const hr = r * 0.8 * headK
  const drop = falling ? p.fallT * p.fallT * 320 : 0
  const x = p.x
  const bodyY = p.y + drop - p.z * 0.8 - r * 0.9

  if (!falling) {
    const sh = 1 / (1 + p.z / 150)
    if (groundAt(w.map, p.x, p.y)) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, r * 1.1 * sh, r * 0.45 * sh, 0, 0, TAU)
      ctx.fill()
    }
  }

  ctx.save()
  if (falling) ctx.globalAlpha = Math.max(0, 1 - p.fallT)
  ctx.translate(x, bodyY)
  if (p.spin) ctx.rotate(p.spin)

  const hammerBehind = Math.sin(p.facing) < 0
  if (hammerBehind && !falling) drawHammer(ctx, w, p, 0, 0, r)

  const bob = Math.sin(p.walk) * r * 0.12
  ctx.fillStyle = p.m.dark
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(s * r * 0.45, r * 0.85 + (s > 0 ? bob : -bob), r * 0.3, r * 0.2, 0, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = p.m.color
  ctx.strokeStyle = p.m.dark
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = p.m.light
  ctx.beginPath()
  ctx.arc(0, r * 0.2, r * 0.55, 0, TAU)
  ctx.fill()

  ctx.save()
  ctx.translate(0, -r * 0.55 - hr * 0.85)
  drawEars(ctx, p.m, hr)
  ctx.fillStyle = p.m.color
  ctx.strokeStyle = p.m.dark
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, hr, 0, TAU)
  ctx.fill()
  ctx.stroke()
  drawFace(ctx, p, hr)
  ctx.restore()

  if (!hammerBehind && !falling) drawHammer(ctx, w, p, 0, 0, r)
  ctx.restore()

  if (falling) return
  const topY = bodyY - r * 0.55 - hr * 2.1

  if (p.shieldT > 0) {
    const pulse = 1 + Math.sin(w.t * 12) * 0.05
    ctx.strokeStyle = `rgba(143,245,255,${p.shieldT < 0.4 ? 0.4 : 0.9})`
    ctx.fillStyle = 'rgba(143,245,255,0.18)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(x, bodyY - hr * 0.6, (r + hr) * 1.25 * pulse, 0, TAU)
    ctx.fill()
    ctx.stroke()
  }

  if (p.stun > 0 && p.z <= 0) {
    ctx.font = `${Math.round(12 * k)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    for (let i = 0; i < 3; i++) {
      const a = w.t * 6 + (i * TAU) / 3
      ctx.fillText('⭐', x + Math.cos(a) * hr, topY + Math.sin(a) * 4)
    }
  }

  ctx.font = '9px "Press Start 2P", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillText(p.m.tag, x + 1, topY - 5)
  ctx.fillStyle = p.m.human ? '#fff' : p.m.light
  ctx.fillText(p.m.tag, x, topY - 6)
  if (p.mega) {
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText('👊', x, topY - 18)
  }
}

function drawOffscreen(ctx, w) {
  for (const p of w.players) {
    if (p.state !== 'alive') continue
    const sy = p.y - p.z * 0.8
    if (p.x >= 0 && p.x <= W && sy >= 0 && sy <= H) continue
    const ex = clamp(p.x, 22, W - 22)
    const ey = clamp(sy, 22, H - 22)
    const a = Math.atan2(sy - ey, p.x - ex)
    ctx.fillStyle = p.m.color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(ex, ey, 14, 0, TAU)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(ex + Math.cos(a) * 24, ey + Math.sin(a) * 24)
    ctx.lineTo(ex + Math.cos(a + 0.5) * 15, ey + Math.sin(a + 0.5) * 15)
    ctx.lineTo(ex + Math.cos(a - 0.5) * 15, ey + Math.sin(a - 0.5) * 15)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = '7px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(p.m.tag, ex, ey + 1)
  }
}

function outlinedText(ctx, text, x, y, size, color) {
  ctx.font = `${size}px "Press Start 2P", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(3, size / 5)
  ctx.strokeStyle = 'rgba(20,10,30,0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function drawHud(ctx, w) {
  ctx.fillStyle = 'rgba(13,13,22,0.6)'
  ctx.fillRect(10, 10, 200, 26)
  ctx.font = '9px "Press Start 2P", monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(`R${w.match.round} · ${w.map.name}`, 18, 24)

  w.feed.forEach((f, i) => {
    ctx.globalAlpha = Math.min(1, 5 - f.t)
    ctx.fillStyle = 'rgba(13,13,22,0.55)'
    ctx.font = '8px "Press Start 2P", monospace'
    const tw = ctx.measureText(f.text).width
    ctx.fillRect(10, 42 + i * 20, tw + 14, 17)
    ctx.fillStyle = '#ffe9a8'
    ctx.fillText(f.text, 17, 51 + i * 20)
    ctx.globalAlpha = 1
  })

  const bx = W - 250
  ctx.fillStyle = 'rgba(13,13,22,0.7)'
  ctx.fillRect(bx, 10, 240, 44)
  ctx.font = '10px "Press Start 2P", monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = w.rule ? '#ffd23f' : '#9b9bb0'
  const label = w.rule ? `${w.rule.emoji} ${w.rule.name}` : 'NORMAL RULES'
  ctx.fillText(label, bx + 10, 24)
  ctx.font = '7px "Press Start 2P", monospace'
  ctx.fillStyle = '#fff'
  ctx.fillText(`NEW RULE IN ${Math.ceil(RULE_EVERY - w.ruleClock)}s`, bx + 10, 41)
  ctx.fillStyle = '#333'
  ctx.fillRect(bx + 130, 37, 100, 7)
  ctx.fillStyle = '#ff6b1a'
  ctx.fillRect(bx + 130, 37, 100 * (w.ruleClock / RULE_EVERY), 7)

  if (w.phase === 'countdown') {
    const n = Math.ceil(w.countdown)
    const f = w.countdown - Math.floor(w.countdown)
    outlinedText(ctx, String(n), CX, CY - 40, 60 + f * 40, '#fff')
    outlinedText(ctx, 'KNOCK EVERYONE OFF!', CX, CY + 40, 14, '#ffd23f')
  }

  if (w.banner) {
    const t = w.banner.t
    const s = t < 0.25 ? t / 0.25 : t > 2.2 ? Math.max(0, (2.6 - t) / 0.4) : 1
    ctx.save()
    ctx.globalAlpha = s
    ctx.fillStyle = 'rgba(13,13,22,0.75)'
    ctx.fillRect(0, CY - 90, W, 150)
    ctx.translate(CX, CY - 20)
    ctx.scale(0.6 + s * 0.4, 0.6 + s * 0.4)
    outlinedText(ctx, 'NEW RULE!', 0, -48, 14, '#ff6b1a')
    ctx.font = '44px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(w.banner.rule.emoji, -200, 0)
    ctx.fillText(w.banner.rule.emoji, 200, 0)
    outlinedText(ctx, w.banner.rule.name, 0, 0, 30, '#ffd23f')
    outlinedText(ctx, w.banner.rule.desc, 0, 44, 11, '#fff')
    ctx.restore()
  }
}

export function draw(ctx, w) {
  ctx.save()
  if (w.shake > 0.3) {
    ctx.translate((Math.random() - 0.5) * w.shake, (Math.random() - 0.5) * w.shake)
  }
  drawBackground(ctx, w)

  const behind = w.players.filter((p) => p.state === 'falling' && p.y < CY)
  for (const p of behind) drawPlayer(ctx, w, p)
  drawPlatforms(ctx, w)

  const things = [
    ...w.crates.map((c) => ({ y: c.y, draw: () => drawCrate(ctx, c, w.t) })),
    ...w.players
      .filter((p) => p.state === 'alive' || (p.state === 'falling' && p.y >= CY))
      .map((p) => ({ y: p.y + (p.state === 'falling' ? 1000 : 0), draw: () => drawPlayer(ctx, w, p) })),
  ].sort((a, b) => a.y - b.y)
  for (const t of things) t.draw()

  for (const p of w.particles) {
    ctx.globalAlpha = 1 - p.t / p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  for (const t of w.twinkles) {
    const s = t.t < 0.3 ? t.t / 0.3 : 1 - (t.t - 0.3) / 0.9
    ctx.save()
    ctx.translate(t.x, t.y)
    ctx.rotate(t.t * 6)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const rr = (i % 2 ? 8 : 26) * s
      const a = (i * Math.PI) / 5
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  for (const p of w.popups) {
    const a = p.t < 0.1 ? p.t / 0.1 : Math.max(0, 1 - (p.t - p.life * 0.6) / (p.life * 0.4))
    const pop = p.t < 0.12 ? 1.4 - p.t * 3 : 1
    ctx.save()
    ctx.globalAlpha = Math.min(1, a)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.scale(pop, pop)
    outlinedText(ctx, p.text, 0, 0, p.size, p.color)
    ctx.restore()
  }

  drawOffscreen(ctx, w)
  ctx.restore()
  drawHud(ctx, w)
}
