import {
  BASE_R,
  CHALLENGES,
  CX,
  CY,
  DIFFICULTIES,
  DUCK_NAMES,
  EMOTES,
  EVENTS,
  EVENT_EVERY,
  H,
  HAMMERS,
  HIT_WORDS,
  PLAYER_COLORS,
  POWERUPS,
  RARE_EVENTS,
  START_BALLOONS,
  W,
} from './data'
import {
  buildArena,
  crumble,
  groundAt,
  moverAt,
  nearEdge,
  nearestSafe,
  neighbours,
  onTiles,
  outermostSolid,
  pickArenaDef,
  pickSpawns,
  randomSolidTile,
  restoreAll,
  safePoints,
  solidCount,
  tileUnder,
  updateArena,
} from './arena'
import { BOT_COSTUMES } from './costumes'
import { sfx } from './sound'

const TAU = Math.PI * 2
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
const noop = () => {}

// ------------------------------------------------------------------ setup

// config: { humans: [{ name, costume, pet, input }], ducks, difficulty, challenge, hooks }
export function createMatch(config) {
  let challenge = config.challenge || 'none'
  let realChallenge = challenge
  if (challenge === 'random') {
    realChallenge = pick(CHALLENGES.filter((c) => !['none', 'random', 'duckhunt', 'mirror', 'ultimate'].includes(c.key))).key
  }
  const diffKey = challenge === 'ultimate' ? 'impossible' : challenge === 'survival' ? 'extreme' : config.difficulty
  const diff = DIFFICULTIES.find((d) => d.key === diffKey) || DIFFICULTIES[1]
  const def = pickArenaDef({ challenge: realChallenge, avoid: config.lastArena })
  const arena = buildArena(def)
  const total = Math.max(config.humans.length + 1, config.ducks)
  const spawns = pickSpawns(arena, total, realChallenge === 'edge')
  const names = [...DUCK_NAMES].sort(() => Math.random() - 0.5)
  const oneLife = realChallenge === 'onelife' || challenge === 'ultimate'

  const players = []
  for (let i = 0; i < total; i++) {
    const h = config.humans[i]
    const mystery = !h && Math.random() < 0.03
    // Very rarely, a certain someone joins the match...
    const hero = !h && !mystery && i === total - 1 && Math.random() < 0.02
    players.push(
      makePlayer({
        id: i,
        human: !!h,
        input: h ? h.input : null,
        tag: h ? `P${i + 1}` : 'CPU',
        name: h ? h.name : mystery ? '???' : hero ? 'Herobrine' : names[i % names.length],
        costume: h ? h.costume : mystery ? 'questionmark' : hero ? 'herobrine' : pick(BOT_COSTUMES),
        pet: h ? h.pet : null,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        skill: diff.skill * (0.85 + Math.random() * 0.3),
        mystery,
        spawn: spawns[i],
        balloons: oneLife ? 1 : START_BALLOONS,
      }),
    )
  }

  const perm = new Set()
  if (realChallenge === 'speed') perm.add('speed')
  if (realChallenge === 'slow') perm.add('slow')
  if (realChallenge === 'air') perm.add('lowgrav')
  if (realChallenge === 'platform') perm.add('floorgone')
  if (challenge === 'duckhunt') perm.add('duck')

  const w = {
    config,
    hooks: { stat: noop, max: noop, event: noop, koStreak: noop, emote: noop, ...config.hooks },
    challenge,
    realChallenge,
    difficulty: diff.key,
    arena,
    players,
    night: arena.dark || Math.random() < 0.25,
    t: 0,
    playT: 0,
    phase: 'countdown',
    countdown: 3,
    event: null,
    eventT: 0,
    attract: !!config.attract,
    eventEvery: config.attract || challenge === 'chaos' || challenge === 'ultimate' ? 8 : EVENT_EVERY,
    // The first event arrives after 10 seconds, then one every 20.
    eventClock: challenge === 'chaos' || challenge === 'ultimate' ? 0 : EVENT_EVERY - 10,
    permFlags: perm,
    flags: new Set(perm),
    eventsInMatch: 0,
    eventsSurvived: 0,
    rareSeen: false,
    duckVisited: false,
    banner: null,
    blackout: 0,
    meteors: [],
    bombs: [],
    rain: [],
    boxes: [],
    crates: [],
    golden: null,
    giantDuck: null,
    wind: { a: 0, s: 0 },
    timers: {},
    crateT: 8,
    popups: [],
    particles: [],
    twinkles: [],
    feed: [],
    shake: 0,
    hitstop: 0,
    koCount: 0,
    endT: 0,
    winner: null,
    humanWon: false,
    results: null,
  }
  if (perm.has('duck')) spawnGiantDuck(w)
  return w
}

function makePlayer(o) {
  return {
    id: o.id,
    human: o.human,
    input: o.input,
    tag: o.tag,
    name: o.name,
    costume: o.costume,
    pet: o.pet,
    color: o.color,
    skill: o.skill,
    mystery: o.mystery,
    x: o.spawn.x,
    y: o.spawn.y,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    facing: Math.atan2(CY - o.spawn.y, CX - o.spawn.x),
    state: 'alive',
    balloons: o.balloons,
    maxBalloons: o.balloons,
    invuln: 0,
    hammer: 'mallet',
    hammerT: 0,
    king: false,
    swinging: false,
    swingT: 0,
    swingDur: 0.3,
    swingCd: 0,
    hitDone: false,
    swingTargets: [],
    dashT: 0,
    dashCd: 0,
    lastDash: -9,
    shieldT: 0,
    shieldCd: 0,
    stun: 0,
    spin: 0,
    spinV: 0,
    flipT: 0,
    emote: null,
    fallT: 0,
    respawnT: 0,
    airJumps: 0,
    flapCd: 0,
    lastJump: -9,
    launched: null,
    lastHit: null,
    powers: { speed: 0, wings: 0, tiny: 0, shield: 0 },
    walk: 0,
    ai: { t: 0, target: null, retarget: 0 },
    cmd: blankCmd(),
    // per-match stats
    ms: {
      kos: 0,
      jumps: 0,
      dodges: 0,
      falls: 0,
      hitsTaken: 0,
      swings: 0,
      air: 0,
      pops: 0,
      lost: 0,
      unique: new Set(),
      dashBumps: 0,
      score: 0,
      wasLast: false,
      survive: 0,
      lastBalloonT: 0,
      noHitT: 0,
    },
    track: { cur: 0, flight: null, moveT: 0, dirT: 0, dir: '', circle: 0, lastFacing: 0, turns: [], idleT: 0, edgeT: 0, chain: 0, lastLand: -9, hitTimes: [], dashTimes: [], koTimes: [] },
  }
}

const blankCmd = () => ({ mx: 0, my: 0, jump: false, jumpHeld: false, bonk: false, dash: false, shield: false, emote: -1, aim: null })

// ------------------------------------------------------------------ helpers

const isHuman = (p) => p.human

function stat(w, p, key, n = 1) {
  if (p && isHuman(p)) w.hooks.stat(key, n)
}
function best(w, p, key, v) {
  if (p && isHuman(p)) w.hooks.max(key, v)
}

function sizeOf(w, p) {
  let s = 1
  if (w.flags.has('tiny')) s *= 0.55
  if (w.flags.has('huge')) s *= 1.6
  if (p.king) s *= 1.8
  if (p.powers.tiny > 0) s *= 0.6
  return s
}
export const radiusOf = (w, p) => BASE_R * sizeOf(w, p)

function reachOf(w, p) {
  const h = HAMMERS[p.hammer]
  return h.reach * sizeOf(w, p) * (w.flags.has('giant') ? 1.8 : 1)
}

function popup(w, x, y, text, color = '#fff', size = 20, life = 1, z = 0) {
  w.popups.push({ x, y, z, text, color, size, life, t: 0, rot: (Math.random() - 0.5) * 0.3 })
}

function burst(w, x, y, z, color, n = 10, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU
    const s = speed * (0.3 + Math.random() * 0.7)
    w.particles.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 80 + Math.random() * 200, t: 0, life: 0.5 + Math.random() * 0.4, r: 3 + Math.random() * 4, color })
  }
}

function feed(w, text) {
  w.feed.unshift({ text, t: 0 })
  if (w.feed.length > 4) w.feed.pop()
}

const alivePlayers = (w) => w.players.filter((p) => p.state === 'alive')
const inPlay = (p) => p.state === 'alive'

function launch(w, p, dx, dy, dist, vz) {
  const air = (2 * vz) / 1100
  p.vx = dx * (dist / air)
  p.vy = dy * (dist / air)
  p.vz = vz
  p.z = Math.max(p.z, 0.5)
  p.launched = { t: w.t, dist, offscreen: false, fromX: p.x, fromY: p.y, by: p.lastHit && w.t - p.lastHit.t < 0.1 ? p.lastHit.by : null }
  stat(w, p, 'launched')
}

// ------------------------------------------------------------------ events

function startEvent(w, ev) {
  endEvent(w)
  w.event = ev
  w.eventT = ev.time || w.eventEvery
  w.eventsInMatch += 1
  w.flags = new Set([...w.permFlags, ...ev.flags])
  w.banner = { ev, t: 0 }
  w.timers = {}
  sfx.rule()
  if (w.players.some((p) => p.human)) w.hooks.event(ev.key)
  for (const p of w.players) if (p.human) {
    stat(w, p, 'eventsSeen')
    stat(w, p, `ev_${ev.key}`)
    if (ev.rare) stat(w, p, 'rareEvents')
    break
  }
  if (ev.rare) w.rareSeen = true
  if (w.flags.has('spin')) w.arena.spinSpeed = (Math.random() < 0.5 ? -1 : 1) * 0.35
  if (w.flags.has('wind')) w.wind = { a: Math.random() * TAU, s: 0 }
  if (w.flags.has('bombs')) for (let i = 0; i < 6; i++) spawnBomb(w)
  if (ev.key === 'golden') {
    const s = pick(safePoints(w.arena).length ? safePoints(w.arena) : [{ x: CX, y: CY }])
    w.golden = { x: s.x, y: s.y, z: 300, vz: 0 }
  }
  if (ev.key === 'king') {
    const alive = alivePlayers(w)
    const k = pick(alive)
    k.king = true
    k.hammer = 'king'
    k.balloons += 2
    popup(w, k.x, k.y, k.name === 'You' ? '👑 YOU ARE THE BONK KING!' : `👑 ${k.name} IS THE BONK KING!`, '#ffd23f', 22, 2.5, 120)
  }
  if (ev.key === 'duck') {
    w.blackout = 3
    w.duckVisited = true
    spawnGiantDuck(w)
  }
}

function endEvent(w) {
  const ev = w.event
  if (!ev) return
  for (const p of w.players) {
    if (p.human && p.state === 'alive') stat(w, p, `survive_${ev.key === 'quake' ? 'quake' : ev.key}`)
  }
  if (alivePlayers(w).some((p) => p.human)) w.eventsSurvived += 1
  if (w.flags.has('spin')) w.arena.spinSpeed = 0
  if (['lava', 'floorgone', 'quake', 'meteors', 'storm', 'apocalypse'].some((f) => w.flags.has(f) || ev.key === f)) restoreAll(w.arena)
  w.bombs = []
  w.meteors = []
  w.rain = []
  w.wind = { a: 0, s: 0 }
  if (ev.key === 'golden') {
    w.golden = null
    for (const p of w.players) if (p.hammer === 'golden') p.hammer = 'mallet'
  }
  if (ev.key === 'king') {
    for (const p of w.players) if (p.king) {
      p.king = false
      p.hammer = 'mallet'
    }
  }
  if (ev.key === 'duck' && !w.permFlags.has('duck') && w.giantDuck) w.giantDuck.leaving = true
  w.event = null
  w.flags = new Set(w.permFlags)
  if (w.permFlags.has('floorgone')) w.timers = {}
}

function spawnBomb(w) {
  const s = pick(safePoints(w.arena).length ? safePoints(w.arena) : [{ x: CX, y: CY }])
  const a = Math.random() * TAU
  w.bombs.push({ x: s.x, y: s.y, z: 200 + Math.random() * 200, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, vz: 0, r: 22, hue: Math.floor(Math.random() * 360) })
}

function spawnGiantDuck(w) {
  const fromLeft = Math.random() < 0.5
  w.giantDuck = { x: fromLeft ? -150 : W + 150, y: CY + (Math.random() - 0.5) * 200, dir: fromLeft ? 1 : -1, r: 95, t: 0, passes: 0, leaving: false, quackT: 1 }
}

function eventTick(w, dt) {
  const f = w.flags
  const T = w.timers
  const tick = (key, every) => {
    T[key] = (T[key] ?? every * Math.random()) - dt
    if (T[key] <= 0) {
      T[key] += every
      return true
    }
    return false
  }

  if (f.has('quake')) {
    w.shake = Math.max(w.shake, 7)
    if (tick('quakeTile', 0.8)) crumble(randomSolidTile(w.arena, true), 1.0)
    if (tick('quakeJolt', 1.1)) {
      for (const p of alivePlayers(w)) {
        if (p.z > 0) continue
        const a = Math.random() * TAU
        p.vx += Math.cos(a) * 150
        p.vy += Math.sin(a) * 150
        p.vz = 120
        p.z = 0.5
      }
    }
  }
  if (f.has('lava')) {
    w.arena.lavaLevel = Math.min(-30, w.arena.lavaLevel + dt * 30)
    if (tick('lava', 0.45) && solidCount(w.arena) > w.arena.tiles.length * 0.3) crumble(outermostSolid(w.arena), 0.9)
  }
  if (f.has('floorgone') && tick('floorgone', 2.5)) {
    const t = randomSolidTile(w.arena)
    if (t) for (const n of neighbours(w.arena, t, 1)) if (Math.random() < 0.55) crumble(n, 1.3)
  }
  if (f.has('meteors') && tick('meteor', f.has('apocalypse') ? 0.45 : 0.7)) {
    const target = Math.random() < 0.5 ? pick(alivePlayers(w)) : null
    const s = target ? { x: target.x + (Math.random() - 0.5) * 80, y: target.y + (Math.random() - 0.5) * 80 } : pick(safePoints(w.arena).length ? safePoints(w.arena) : [{ x: CX, y: CY }])
    w.meteors.push({ x: s.x, y: s.y, t: 1.3, r: 70 })
  }
  if (f.has('hammerrain') && tick('rain', 0.8)) {
    const target = Math.random() < 0.6 ? pick(alivePlayers(w)) : null
    const s = target ? { x: target.x + (Math.random() - 0.5) * 60, y: target.y + (Math.random() - 0.5) * 60 } : pick(safePoints(w.arena).length ? safePoints(w.arena) : [{ x: CX, y: CY }])
    w.rain.push({ x: s.x, y: s.y, t: 1.1, r: 60, a: Math.random() * TAU })
  }
  if (f.has('boxes') && tick('box', 2.5) && w.boxes.length < 4) {
    const pts = safePoints(w.arena)
    if (pts.length) {
      const s = pick(pts)
      w.boxes.push({ x: s.x, y: s.y, z: 350, vz: 0 })
    }
  }
  if (f.has('randombonk') && tick('randombonk', 3)) {
    const p = pick(alivePlayers(w).filter((q) => q.z <= 0))
    if (p) {
      const a = Math.random() * TAU
      launch(w, p, Math.cos(a), Math.sin(a), 120 + Math.random() * 120, 650)
      p.spinV = 18
      popup(w, p.x, p.y, `🎲 ${p.name}!`, '#ff7ad9', 18, 1.2, 60)
      sfx.boing()
    }
  }
  if (f.has('wind')) {
    if (tick('gust', 3.5)) {
      w.wind.a += (Math.random() - 0.5) * 1.2
      w.wind.gust = 1.2
    }
    w.wind.gust = Math.max(0, (w.wind.gust || 0) - dt)
    w.wind.s = 140 + (w.wind.gust > 0 ? 260 : 0)
  }
}

function updateHazards(w, dt) {
  // meteors
  for (const m of w.meteors) {
    m.t -= dt
    if (m.t <= 0 && !m.done) {
      m.done = true
      w.shake = Math.max(w.shake, 14)
      burst(w, m.x, m.y, 0, '#ff9f1c', 20, 320)
      sfx.mega()
      if (Math.random() < 0.4) crumble(tileUnder(w.arena, m.x, m.y), 0.2)
      for (const p of alivePlayers(w)) {
        const d = Math.hypot(p.x - m.x, p.y - m.y)
        if (d > m.r + radiusOf(w, p) || p.z > 80) continue
        const ux = d > 1 ? (p.x - m.x) / d : 1
        const uy = d > 1 ? (p.y - m.y) / d : 0
        if (d < 40) popBalloon(w, p, null, 1, 'meteor')
        if (p.state === 'alive') launch(w, p, ux, uy, 150, 600)
        p.stun = 0.4
      }
    }
  }
  w.meteors = w.meteors.filter((m) => m.t > -0.6)
  // hammer rain
  for (const r of w.rain) {
    r.t -= dt
    if (r.t <= 0 && !r.done) {
      r.done = true
      w.shake = Math.max(w.shake, 10)
      burst(w, r.x, r.y, 0, '#fff6a8', 14, 260)
      sfx.bonk()
      popup(w, r.x, r.y, 'BONK!', '#fff', 26, 0.8, 30)
      for (const p of alivePlayers(w)) {
        const d = Math.hypot(p.x - r.x, p.y - r.y)
        if (d > r.r + radiusOf(w, p) || p.z > 60) continue
        const ux = d > 1 ? (p.x - r.x) / d : 1
        const uy = d > 1 ? (p.y - r.y) / d : 0
        if (d < 35) popBalloon(w, p, null, 1, 'rain')
        if (p.state === 'alive') launch(w, p, ux, uy, 130, 520)
      }
    }
  }
  w.rain = w.rain.filter((r) => r.t > -0.8)
  // bomb balls
  for (const b of w.bombs) {
    b.vz -= 900 * dt
    b.z += b.vz * dt
    if (b.z <= 0) {
      b.z = 0
      b.vz = 420 + Math.random() * 180
    }
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.x < 120 || b.x > W - 120) b.vx *= -1
    if (b.y < 90 || b.y > H - 90) b.vy *= -1
    for (const p of alivePlayers(w)) {
      if (Math.abs(p.z - b.z) > 40) continue
      const d = Math.hypot(p.x - b.x, p.y - b.y)
      if (d < b.r + radiusOf(w, p) && !(p.bombCd > 0)) {
        p.bombCd = 0.8
        const ux = d > 1 ? (p.x - b.x) / d : 1
        const uy = d > 1 ? (p.y - b.y) / d : 0
        launch(w, p, ux, uy, 170, 700)
        p.spinV = 15
        burst(w, b.x, b.y, b.z, `hsl(${b.hue},90%,60%)`, 12, 250)
        popup(w, p.x, p.y, 'KABOING!', `hsl(${b.hue},90%,70%)`, 20, 0.9, 50)
        sfx.boing()
        stat(w, p, 'bounces')
      }
    }
  }
  // falling pickups
  for (const b of [...w.boxes, ...w.crates, ...(w.golden ? [w.golden] : [])]) {
    if (b.z > 0) {
      b.vz -= 900 * dt
      b.z = Math.max(0, b.z + b.vz * dt)
    }
  }
  w.boxes = w.boxes.filter((b) => groundAt(w.arena, b.x, b.y) || b.z > 0)
  w.crates = w.crates.filter((b) => groundAt(w.arena, b.x, b.y) || b.z > 0)
  if (w.golden && !groundAt(w.arena, w.golden.x, w.golden.y) && w.golden.z <= 0) {
    const s = pick(safePoints(w.arena).length ? safePoints(w.arena) : [{ x: CX, y: CY }])
    w.golden = { x: s.x, y: s.y, z: 300, vz: 0 }
  }
  for (const p of alivePlayers(w)) {
    if (p.z > 20) continue
    const r = radiusOf(w, p) + 16
    for (const b of w.boxes) {
      if (b.z < 10 && !b.taken && Math.hypot(p.x - b.x, p.y - b.y) < r) {
        b.taken = true
        givePowerup(w, p, pick(POWERUPS))
        stat(w, p, 'mysteryBoxes')
      }
    }
    for (const c of w.crates) {
      if (c.z < 10 && !c.taken && Math.hypot(p.x - c.x, p.y - c.y) < r && !p.king && p.hammer !== 'golden') {
        c.taken = true
        p.hammer = c.type
        popup(w, p.x, p.y, `${HAMMERS[c.type].emoji} ${HAMMERS[c.type].name}!`, '#ffd23f', 15, 1.4, 70)
        sfx.pickup()
      }
    }
    if (w.golden && w.golden.z < 10 && Math.hypot(p.x - w.golden.x, p.y - w.golden.y) < r) {
      p.hammer = 'golden'
      w.golden = null
      popup(w, p.x, p.y, '✨ GOLDEN HAMMER! ✨', '#ffd700', 22, 2, 80)
      sfx.win()
      stat(w, p, 'goldenGrabs')
    }
  }
  w.boxes = w.boxes.filter((b) => !b.taken)
  w.crates = w.crates.filter((b) => !b.taken)
  // the giant rubber duck
  const g = w.giantDuck
  if (g && w.blackout <= 0) {
    g.t += dt
    g.x += g.dir * 120 * dt
    g.y += Math.sin(g.t * 1.3) * 40 * dt
    g.quackT -= dt
    if (g.quackT <= 0) {
      g.quackT = 1.6 + Math.random()
      sfx.bigQuack()
      popup(w, g.x, g.y, 'QUACK', '#ffeb3b', 34, 1, 260)
      w.shake = Math.max(w.shake, 6)
    }
    for (const p of alivePlayers(w)) {
      const d = Math.hypot(p.x - g.x, p.y - g.y)
      if (d < g.r + radiusOf(w, p) && p.z < 150 && !(p.duckCd > 0)) {
        p.duckCd = 1.2
        const ux = d > 1 ? (p.x - g.x) / d : 1
        const uy = d > 1 ? (p.y - g.y) / d : 0
        popBalloon(w, p, null, 1, 'duck')
        if (p.state === 'alive') launch(w, p, ux, uy, 220, 750)
        p.spinV = 20
        stat(w, p, 'duckHits')
        popup(w, p.x, p.y, 'SQUASHED!', '#ffeb3b', 20, 1, 60)
      }
    }
    if ((g.dir > 0 && g.x > W + 200) || (g.dir < 0 && g.x < -200)) {
      g.passes += 1
      if (g.leaving || (g.passes >= 2 && !w.permFlags.has('duck'))) w.giantDuck = null
      else {
        g.dir *= -1
        g.y = CY + (Math.random() - 0.5) * 240
      }
    }
  }
}

function givePowerup(w, p, pu) {
  popup(w, p.x, p.y, `${pu.emoji} ${pu.name}!`, '#7cf', 16, 1.4, 70)
  sfx.pickup()
  if (pu.key === 'speed') {
    p.powers.speed = 8
    stat(w, p, 'pu_speed')
  } else if (pu.key === 'balloon') p.balloons = Math.min(p.balloons + 1, 6)
  else if (pu.key === 'shield') p.powers.shield = 6
  else if (pu.key === 'mega') {
    p.hammer = 'sledge'
    p.powers.mega = 10
  } else if (pu.key === 'wings') p.powers.wings = 10
  else if (pu.key === 'tiny') p.powers.tiny = 8
}

// ------------------------------------------------------------------ combat

function popBalloon(w, p, by, n, cause) {
  if (p.state !== 'alive' || p.invuln > 0) return false
  if (p.powers.shield > 0 || p.shieldT > 0) return false
  const before = p.balloons
  p.balloons = Math.max(0, p.balloons - n)
  p.invuln = 1.5
  p.ms.lost += before - p.balloons
  for (let i = 0; i < before - p.balloons; i++) burst(w, p.x, p.y, 70, p.color, 8, 200)
  popup(w, p.x, p.y, 'POP!', '#ff4d6d', 18, 0.8, 90)
  sfx.pop()
  if (by) {
    by.ms.pops += before - p.balloons
    by.ms.score += 100 * (before - p.balloons)
    stat(w, by, 'balloonsPopped', before - p.balloons)
    if (before - p.balloons >= 2) stat(w, by, 'doublePops')
  }
  if (p.balloons === 1 && before > 1) {
    stat(w, p, 'lastBalloons')
    p.ms.wasLast = true
  }
  if (p.balloons === 0) knockOut(w, p, cause)
  return true
}

function knockOut(w, p, cause) {
  const info = p.lastHit && w.t - p.lastHit.t < 6 ? p.lastHit : null
  const killer = info ? info.by : null
  p.state = 'out'
  p.swinging = false
  stat(w, p, 'outs')
  // Last balloon gone: fly off into the sky!
  if (cause !== 'fall') {
    p.flyAway = { t: 0, x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 300, vy: -200, vz: 900 }
    stat(w, p, 'spaced')
  }
  sfx.ko()
  w.twinkles.push({ x: p.x, y: p.y, t: 0, color: p.color, z: 200 })
  if (killer && killer !== p) {
    feed(w, `${killer.name} knocked out ${p.name}!`)
    creditKo(w, killer, p, info, cause)
  } else {
    feed(w, `${p.name} is out!`)
  }
}

function creditKo(w, a, t, info, cause) {
  w.koCount += 1
  a.ms.kos += 1
  a.ms.unique.add(t.id)
  a.ms.score += 500
  if (!a.human) return
  const S = (k, n = 1) => stat(w, a, k, n)
  S('kos')
  S('sessionKos')
  if (w.koCount === 1) S('firstBlood')
  if (w.realChallenge !== 'none') S('chKos')
  if (info.air) S('airKos')
  else S('groundKos')
  if (w.t - a.lastJump < 1) S('jumpKos')
  if (a.lastHit && a.lastHit.by === t && w.t - a.lastHit.t < 15) S('revengeKos')
  if (info.behind) S('behindKos')
  if (info.dist > 70) S('longKos')
  if (info.dist < 30) S('closeKos')
  if (info.edge) S('edgeKos')
  if (info.standEdge) S('edgeStandKos')
  if (a.balloons === 1) S('lastBalloonKos')
  if (info.steal) S('stealKos')
  if (info.mega) S('megaKos')
  if (info.air && info.targetAir) S('skyKos')
  if (w.flags.has('tiny')) S('tinyKos')
  if (w.flags.has('huge')) S('giantKos')
  if (w.flags.has('lowgrav')) S('lowgravKos')
  if (t.costume === 'chair') S('chairKos')
  if (t.king) S('kingKos')
  if (t.name === 'Herobrine') S('egg_herobrine')
  if (w.playT < 10) S('earlyKos')
  if (cause !== 'fall') S('spaceKos')
  const kt = a.track.koTimes
  kt.push(w.t)
  let chain = 1
  for (let i = kt.length - 1; i > 0 && kt[i] - kt[i - 1] < 4; i--) chain++
  if (chain >= 2) S('multi2')
  if (chain >= 3) S('multi3')
  if (chain >= 4) S('multi4')
  w.hooks.koStreak(true)
}

function startSwing(w, p) {
  p.swinging = true
  p.swingT = 0
  p.hitDone = false
  const h = HAMMERS[p.hammer]
  p.swingDur = h.swing
  p.swingCd = h.swing + h.cooldown
  p.ms.swings += 1
  stat(w, p, 'swings')
  // aim assist for humans
  let bestA = null
  let bestD = Infinity
  for (const q of w.players) {
    if (q === p || !inPlay(q)) continue
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    const a = Math.atan2(q.y - p.y, q.x - p.x)
    if (d < reachOf(w, p) + 30 && Math.abs(angleDiff(a, p.facing)) < 1.3 && d < bestD) {
      bestA = a
      bestD = d
    }
  }
  if (p.human && bestA !== null) p.facing = bestA
  p.swingTargets = w.players.filter((q) => q !== p && inPlay(q) && Math.hypot(q.x - p.x, q.y - p.y) < reachOf(w, p) + radiusOf(w, q) + 10)
  if (!p.swingTargets.length) stat(w, p, 'airSwings')
}

function doHit(w, a) {
  const h = HAMMERS[a.hammer]
  const reach = reachOf(w, a)
  const hitList = []
  for (const t of w.players) {
    if (t === a || !inPlay(t)) continue
    const dx = t.x - a.x
    const dy = t.y - a.y
    const d = Math.hypot(dx, dy)
    const tr = radiusOf(w, t) * (t.king ? 1 : 1.1)
    if (d > reach + tr) continue
    const diff = Math.abs(angleDiff(Math.atan2(dy, dx), a.facing))
    if (diff > h.arc / 2 + 0.35 && d > radiusOf(w, a) + tr + 4) continue
    if (Math.abs(t.z - a.z) > 45) continue
    hitList.push({ t, d, ux: d > 1 ? dx / d : Math.cos(a.facing), uy: d > 1 ? dy / d : Math.sin(a.facing) })
  }

  // Anyone who was in range when the swing started but got away dodged it.
  for (const q of a.swingTargets) {
    if (!inPlay(q) || hitList.some((x) => x.t === q)) continue
    q.ms.dodges += 1
    stat(w, q, 'dodges')
    if (q.z > 20) stat(w, q, 'jumpDodges')
    else if (w.t - q.lastDash < 0.6) stat(w, q, 'dashDodges')
    popup(w, q.x, q.y, 'DODGE!', '#9fffb0', 14, 0.8, 70)
  }

  let hits = 0
  for (const { t, d, ux, uy } of hitList) {
    if (t.shieldT > 0 || t.powers.shield > 0) {
      a.vx = -ux * 320
      a.vy = -uy * 320
      a.stun = 0.35
      burst(w, (a.x + t.x) / 2, (a.y + t.y) / 2, 30, '#8ff5ff', 12, 260)
      popup(w, t.x, t.y, 'BLOCKED!', '#8ff5ff', 16, 0.9, 70)
      sfx.block()
      stat(w, t, 'blocks')
      if (t.z > 5) stat(w, t, 'airBlocks')
      continue
    }
    if (t.invuln > 0) continue
    hits += 1
    const behind = Math.abs(angleDiff(Math.atan2(a.y - t.y, a.x - t.x), t.facing)) > 2.1
    const prev = t.lastHit
    t.lastHit = {
      by: a,
      t: w.t,
      air: a.z > 5,
      targetAir: t.z > 5,
      behind,
      dist: d,
      edge: nearEdge(w.arena, t.x, t.y, 45),
      standEdge: nearEdge(w.arena, a.x, a.y, 30),
      mega: ['golden', 'king'].includes(a.hammer) || w.flags.has('giant'),
      steal: prev && prev.by !== a && w.t - prev.t < 3,
    }
    t.ms.hitsTaken += 1
    t.ms.noHitT = 0
    stat(w, t, 'hitsTaken')
    stat(w, a, 'hitsLanded')
    if (a.z > 5) stat(w, a, 'airSwingHits')
    if (a.z > 5 && t.z > 5) stat(w, a, 'skyHits')
    if (t.z > 5) stat(w, a, 'airHits')
    if (behind) stat(w, a, 'behindHits')
    if (t.emote) stat(w, a, 'emoteHits')
    if (a.costume === 'potato') stat(w, a, 'potatoHits')
    if (t.costume === 'potato') stat(w, t, 'potatoYeets')
    if (a.human) {
      const ht = a.track.hitTimes
      ht.push(w.t)
      if (ht.filter((x) => w.t - x < 4).length >= 4) stat(w, a, 'fastHits')
      if (ht.filter((x) => w.t - x < 5).length >= 5) stat(w, a, 'fastHits5')
    }
    t.emote = null
    t.swinging = false
    t.dashT = 0
    t.stun = 0.35

    const before = t.balloons
    popBalloon(w, t, a, h.pops || 1, 'hit')
    if (t.state !== 'alive') {
      stat(w, a, 'yeets')
      w.hitstop = 0.12
      w.shake = 20
      popup(w, t.x, t.y, pick(['YEEEET!', 'BYE BYE!', 'TO THE MOON!', 'WHEEEE!', 'BLASTING OFF AGAIN!', 'FALCON BONK!']), '#ff7ad9', 24, 1.4, 110)
      sfx.yeet()
      continue
    }
    // Fewer balloons = heavier = harder to knock around.
    const b = t.balloons
    const float = 0.45 + 0.35 * b
    let dist =
      110 *
      h.power *
      float *
      (w.flags.has('giant') ? 1.3 : 1) *
      (w.flags.has('tiny') ? 1.3 : 1) *
      (w.flags.has('huge') ? 0.8 : 1) *
      (w.flags.has('lowgrav') ? 0.6 : 1) *
      (w.flags.has('apocalypse') ? 1.5 : 1) *
      (t.king ? 0.6 : 1) *
      (1 + w.playT / 120)
    const vz = 440 + b * 40
    launch(w, t, ux, uy, dist, vz)
    t.launched.by = a
    t.spinV = (Math.random() < 0.5 ? -1 : 1) * (12 + dist / 30)
    if (dist > 180) stat(w, a, 'bigHits')
    w.hitstop = Math.min(0.12, 0.05 + dist / 5000)
    w.shake = Math.max(w.shake, Math.min(22, 6 + dist / 25))
    const word = pick(HIT_WORDS[t.lastHit.mega ? 'mega' : h.sound])
    popup(w, t.x, t.y, word, t.lastHit.mega ? '#ff3b3b' : '#fff', t.lastHit.mega ? 30 : 24, 0.9, 60)
    burst(w, t.x, t.y, 30, '#fff6a8', 14, 300)
    if (before > b) sfx[h.sound]()
  }
  if (hits >= 2) stat(w, a, 'multiHit2')
  if (hits >= 3) stat(w, a, 'multiHit3')
  if (!hits && !hitList.length) sfx.whiff()
}

// ------------------------------------------------------------------ bots

function pathSafe(w, p, dx, dy, dist) {
  for (const f of [0.5, 1]) if (!groundAt(w.arena, p.x + dx * dist * f, p.y + dy * dist * f)) return false
  return true
}

function inDanger(w, x, y) {
  for (const m of w.meteors) if (!m.done && Math.hypot(x - m.x, y - m.y) < m.r + 25) return m
  for (const r of w.rain) if (!r.done && Math.hypot(x - r.x, y - r.y) < r.r + 25) return r
  const g = w.giantDuck
  if (g && Math.abs(y - g.y) < g.r + 40 && (x - g.x) * g.dir > -30 && (x - g.x) * g.dir < 260) return { x: g.x, y: g.y }
  return null
}

function botThink(w, p, dt) {
  const c = p.cmd
  c.bonk = false
  c.dash = false
  c.shield = false
  c.jump = false
  c.emote = -1
  p.ai.t -= dt
  const skill = p.skill

  if (p.z > 0) {
    const s = nearestSafe(w.arena, p.x + p.vx * 0.4, p.y + p.vy * 0.4)
    const sd = Math.hypot(s.x - p.x, s.y - p.y) || 1
    c.mx = (s.x - p.x) / sd
    c.my = (s.y - p.y) / sd
    if (w.flags.has('wings') && !groundAt(w.arena, p.x, p.y) && p.vz < 0) c.jump = true
    return
  }
  if (p.stun > 0) {
    c.mx = 0
    c.my = 0
    return
  }
  // On the title screen the bots show off: lots of random jumping.
  if (w.attract && Math.random() < 0.012) c.jump = true
  const speed = Math.hypot(p.vx, p.vy)
  if (speed > 20 && !pathSafe(w, p, p.vx / speed, p.vy / speed, 22 + speed * 0.15)) {
    const s = nearestSafe(w.arena, p.x, p.y)
    const sd = Math.hypot(s.x - p.x, s.y - p.y) || 1
    const ok = pathSafe(w, p, (s.x - p.x) / sd, (s.y - p.y) / sd, 30)
    c.mx = ok ? (s.x - p.x) / sd : 0
    c.my = ok ? (s.y - p.y) / sd : 0
    c.aim = null
    p.ai.t = 0.1
    return
  }
  if (p.ai.t > 0) return
  p.ai.t = 0.06 + Math.max(0, 1 - skill) * 0.2
  c.aim = null

  const danger = inDanger(w, p.x, p.y)
  if (danger && Math.random() < 0.3 + skill * 0.6) {
    const dx = p.x - danger.x
    const dy = p.y - danger.y
    const d = Math.hypot(dx, dy) || 1
    c.mx = dx / d
    c.my = dy / d
    if (!pathSafe(w, p, c.mx, c.my, 40)) {
      c.mx = -c.my
      c.my = dx / d
    }
    return
  }

  const others = w.players.filter((q) => q !== p && inPlay(q))
  for (const q of others) {
    if (!q.swinging || q.swingT / q.swingDur > 0.45) continue
    const d = Math.hypot(p.x - q.x, p.y - q.y)
    const facingUs = Math.abs(angleDiff(Math.atan2(p.y - q.y, p.x - q.x), q.facing)) < 1
    if (d < reachOf(w, q) + 30 && facingUs && Math.random() < 0.5 * skill) {
      if (p.shieldCd <= 0 && Math.random() < 0.5) c.shield = true
      else if (!w.flags.has('nojump')) c.jump = true
    }
  }

  // Bots take breaks from fighting to wander around.
  p.ai.moodT = (p.ai.moodT ?? Math.random() * 3) - (0.06 + Math.max(0, 1 - skill) * 0.2)
  if (p.ai.moodT <= 0) {
    p.ai.roam = !p.ai.roam && Math.random() < 0.75 - skill * 0.4
    p.ai.moodT = p.ai.roam ? 1 + Math.random() * 2 : 2 + Math.random() * 3
    if (p.ai.roam) p.ai.spot = pick(safePoints(w.arena).length ? safePoints(w.arena) : [{ x: CX, y: CY }])
  }
  if (p.ai.roam && p.ai.spot && !others.some((q) => q.king)) {
    const dx = p.ai.spot.x - p.x
    const dy = p.ai.spot.y - p.y
    const d = Math.hypot(dx, dy)
    c.mx = d > 20 ? dx / d : 0
    c.my = d > 20 ? dy / d : 0
    if (!pathSafe(w, p, c.mx, c.my, 40)) {
      c.mx = 0
      c.my = 0
    }
    return
  }

  let target = p.ai.target
  const king = others.find((q) => q.king)
  if (king && !p.king) target = king
  else if (!target || !inPlay(target) || w.t > p.ai.retarget) {
    const sorted = others.map((q) => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, b) => a.d - b.d)
    target = sorted.length ? (Math.random() < 0.75 ? sorted[0].q : pick(sorted).q) : null
    p.ai.retarget = w.t + 1.5 + Math.random() * 2
  }
  p.ai.target = target

  let gx = CX
  let gy = CY
  let attacking = false
  const pickups = [...w.boxes, ...(p.hammer === 'mallet' ? w.crates : []), ...(w.golden ? [w.golden] : [])]
    .filter((b) => b.z <= 0)
    .map((b) => ({ b, d: Math.hypot(b.x - p.x, b.y - p.y) }))
    .sort((a, b) => a.d - b.d)[0]
  if (pickups && pickups.d < (w.golden === pickups.b ? 500 : 200)) {
    gx = pickups.b.x
    gy = pickups.b.y
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

  if (attacking && d < reachOf(w, p) + radiusOf(w, target) - 6) {
    c.aim = Math.atan2(dy, dx)
    c.mx = 0
    c.my = 0
    if (!p.swinging && p.swingCd <= 0 && Math.random() < 0.04 + skill * 0.14) c.bonk = true
    const home = nearestSafe(w.arena, p.x, p.y)
    const hx = home.x - p.x
    const hy = home.y - p.y
    const hd = Math.hypot(hx, hy)
    if (hd > 30) {
      c.mx = (hx / hd) * 0.4
      c.my = (hy / hd) * 0.4
    }
    return
  }
  if (attacking && d > 110 && d < 240 && p.dashCd <= 0 && Math.random() < 0.1 * skill && pathSafe(w, p, dx, dy, Math.min(d, 150))) {
    c.dash = true
    c.aim = Math.atan2(dy, dx)
  }
  if (!pathSafe(w, p, dx, dy, 40)) {
    const s = nearestSafe(w.arena, p.x, p.y)
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
  if (w.flags.has('wind')) {
    dx -= Math.cos(w.wind.a) * 0.4
    dy -= Math.sin(w.wind.a) * 0.4
  }
  c.mx = dx
  c.my = dy
}

// ------------------------------------------------------------------ update

export function step(w, dt, readInput) {
  updateFx(w, dt)
  if (w.phase === 'over') return
  if (w.blackout > 0) {
    w.blackout -= dt
    return
  }
  if (w.hitstop > 0) {
    w.hitstop -= dt
    return
  }
  w.t += dt
  updateArena(w.arena, w.t, dt)

  if (w.phase === 'countdown') {
    const before = Math.ceil(w.countdown)
    w.countdown -= dt
    if (w.countdown <= 0) {
      w.phase = 'playing'
      sfx.go()
      popup(w, CX, CY, 'BONK!', '#ffd23f', 70, 1.2, 100)
    } else if (Math.ceil(w.countdown) !== before) sfx.count()
  }
  const playing = w.phase === 'playing'

  if (playing) {
    w.playT += dt
    w.eventClock += dt
    if (w.event) {
      w.eventT -= dt
      if (w.eventT <= 0) endEvent(w)
    }
    if (w.eventClock >= w.eventEvery) {
      w.eventClock = 0
      const rare = Math.random() < 0.08
      const pool = rare ? RARE_EVENTS : EVENTS.filter((e) => !w.event || e.key !== w.event.key)
      startEvent(w, pick(pool))
    }
    eventTick(w, dt)
    w.crateT -= dt
    if (w.crateT <= 0 && w.crates.length < 2) {
      w.crateT = 8 + Math.random() * 5
      const pts = safePoints(w.arena)
      if (pts.length) {
        const s = pick(pts)
        w.crates.push({ x: s.x, y: s.y, z: 320, vz: 0, type: pick(['sledge', 'squeaky', 'pan', 'fish']) })
      }
    }
    // challenge time limits
    if (['dodge', 'survival'].includes(w.realChallenge)) {
      const limit = w.realChallenge === 'dodge' ? 60 : 90
      if (w.playT >= limit && alivePlayers(w).some((p) => p.human)) return finishMatch(w, alivePlayers(w).find((p) => p.human))
    }
  }
  updateHazards(w, dt)

  for (const p of w.players) {
    if (p.state !== 'alive') continue
    if (!playing) p.cmd = blankCmd()
    else if (p.scripted) {
      // the title screen steers this duck itself
    } else if (p.human) {
      p.cmd = readInput(p.input)
      if (w.realChallenge === 'mirror') {
        p.cmd.mx = -p.cmd.mx
        p.cmd.my = -p.cmd.my
      }
      const ch = w.realChallenge
      if (ch === 'nojump') p.cmd.jump = false
      if (ch === 'jumponly') p.cmd.bonk = p.cmd.dash = false
      if (ch === 'noattack' || ch === 'dodge') p.cmd.bonk = false
    } else botThink(w, p, dt)
  }

  const g = w.flags.has('lowgrav') ? 300 : 1100
  let airborne = 0
  for (const p of w.players) {
    if (p.flyAway) {
      const f = p.flyAway
      f.t += dt
      f.vz -= 200 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.z += f.vz * dt
      if (f.t > 3) p.flyAway = null
    }
    if (p.state === 'falling') {
      p.fallT += dt
      if (p.fallT > 1) afterFall(w, p)
      continue
    }
    if (p.state === 'respawning') {
      p.respawnT -= dt
      if (p.respawnT <= 0) {
        const s = nearestSafe(w.arena, CX + (Math.random() - 0.5) * 200, CY + (Math.random() - 0.5) * 150)
        Object.assign(p, { x: s.x, y: s.y, z: 450, vx: 0, vy: 0, vz: -150, state: 'alive', invuln: 2.5, stun: 0, spin: 0, spinV: 0, parachute: true })
        p.launched = null
      }
      continue
    }
    if (p.state !== 'alive') continue
    updatePlayer(w, p, dt, g, playing)
    if (p.z > 5) airborne++
  }
  if (airborne && !w.attract) w.hooks.max('best_airborneCount', airborne)

  collide(w)

  if (playing) {
    const alive = alivePlayers(w)
    const pending = w.players.some((p) => p.state === 'falling' || p.state === 'respawning')
    if (alive.length <= 1 && !pending) {
      w.endT += dt
      if (w.endT > 1.2) finishMatch(w, alive[0] || null)
    }
  }
}

function updatePlayer(w, p, dt, g, playing) {
  const c = p.cmd
  const k = sizeOf(w, p)
  p.swingCd = Math.max(0, p.swingCd - dt)
  p.dashCd = Math.max(0, p.dashCd - dt)
  p.shieldCd = Math.max(0, p.shieldCd - dt)
  p.shieldT = Math.max(0, p.shieldT - dt)
  p.stun = Math.max(0, p.stun - dt)
  p.invuln = Math.max(0, p.invuln - dt)
  p.flapCd = Math.max(0, p.flapCd - dt)
  p.bombCd = Math.max(0, (p.bombCd || 0) - dt)
  p.duckCd = Math.max(0, (p.duckCd || 0) - dt)
  p.flipT = Math.max(0, p.flipT - dt)
  p.dashT -= dt
  for (const key of Object.keys(p.powers)) p.powers[key] = Math.max(0, p.powers[key] - dt)
  if (p.powers.mega === 0 && p.hammer === 'sledge' && p.powers.megaWas) p.hammer = 'mallet'
  p.powers.megaWas = p.powers.mega > 0
  if (p.emote) {
    p.emote.t -= dt
    if (p.emote.t <= 0) p.emote = null
  }
  if (playing) {
    p.ms.survive += dt
    p.ms.noHitT += dt
    p.ms.noHitBest = Math.max(p.ms.noHitBest || 0, p.ms.noHitT)
    if (p.balloons === 1) p.ms.lastBalloonT += dt
  }

  const grounded = p.z <= 0
  const mover = grounded ? moverAt(w.arena, p.x, p.y) : null
  if (grounded) {
    if (mover && !onTiles(w.arena, p.x, p.y)) {
      p.x += mover.dx
      p.y += mover.dy
      if (!p.riding) {
        p.riding = true
        stat(w, p, 'rides')
      }
    } else {
      p.riding = false
      if (w.arena.dAngle && onTiles(w.arena, p.x, p.y)) {
        const ca = Math.cos(w.arena.dAngle)
        const sa = Math.sin(w.arena.dAngle)
        const dx = p.x - CX
        const dy = p.y - CY
        p.x = CX + dx * ca - dy * sa
        p.y = CY + dx * sa + dy * ca
        p.facing += w.arena.dAngle
      }
    }
  }

  const canJump = !w.flags.has('nojump')
  const wings = w.flags.has('wings') || p.powers.wings > 0
  const active = p.stun <= 0 && playing

  if (active) {
    if (c.aim !== null && c.aim !== undefined && !p.swinging) p.facing = c.aim
    if (c.emote >= 0) doEmote(w, p, c.emote)
    if (c.shield && p.shieldCd <= 0) {
      p.shieldT = 1.4
      p.shieldCd = 6
      sfx.shield()
      stat(w, p, 'shields')
    }
    if (c.jump && canJump) {
      if (grounded) {
        p.vz = 430 * (sizeOf(w, p) > 1.3 ? 1.1 : 1)
        p.z = 0.5
        p.airJumps = 1
        p.lastJump = w.t
        p.ms.jumps += 1
        sfx.jump()
        stat(w, p, 'jumps')
        if (w.flags.has('tiny')) stat(w, p, 'tinyJumps')
        if (w.flags.has('huge')) stat(w, p, 'giantJumps')
        if (w.t - p.track.lastLand < 0.35) p.track.chain += 1
        else p.track.chain = 1
        best(w, p, 'best_chainJumps', p.track.chain)
        p.emote = null
      } else if (wings && p.flapCd <= 0) {
        p.vz = Math.max(p.vz, 0) + 330
        p.flapCd = 0.25
        p.airJumps += 1
        sfx.flap()
        stat(w, p, 'flaps')
        burst(w, p.x, p.y, p.z, '#ffffff', 5, 80)
      }
    }
    if (c.dash && p.dashCd <= 0 && !p.flop) {
      const a = c.mx || c.my ? Math.atan2(c.my, c.mx) : p.facing
      const sp = 580 * (w.flags.has('speed') ? 1.35 : 1)
      p.facing = a
      p.vx = Math.cos(a) * sp
      p.vy = Math.sin(a) * sp
      p.dashT = 0.2
      p.dashCd = 1.5
      p.lastDash = w.t
      sfx.dash()
      stat(w, p, 'dashes')
      if (!grounded) {
        stat(w, p, 'airDashes')
        p.flipT = 0.5
        if (p.track.flight) p.track.flight.trick = true
      }
      burst(w, p.x, p.y, p.z, 'rgba(255,255,255,0.9)', 8, 120)
      if (p.human) {
        const dt2 = p.track.dashTimes
        dt2.push(w.t)
        if (dt2.filter((x) => w.t - x < 5).length >= 3) stat(w, p, 'dashBurst')
      }
    }
    if (c.bonk && !p.swinging && p.swingCd <= 0) {
      startSwing(w, p)
      p.emote = null
    }
    if (p.dashT <= 0 && (!p.emote || p.emote.key !== 'flop')) {
      const len = Math.hypot(c.mx, c.my)
      let maxS = 200
      if (w.flags.has('speed')) maxS *= 1.9
      if (w.flags.has('slow')) maxS *= 0.55
      if (p.powers.speed > 0) maxS *= 1.5
      if (p.king) maxS *= 0.85
      const ice = w.flags.has('ice')
      const control = grounded ? (ice ? 1.5 : 11) : 2.2
      const tx = len ? (c.mx / Math.max(1, len)) * maxS : 0
      const ty = len ? (c.my / Math.max(1, len)) * maxS : 0
      const f = 1 - Math.exp(-control * dt)
      if (grounded || len) {
        p.vx += (tx - p.vx) * f
        p.vy += (ty - p.vy) * f
      }
      if (len > 0.3) {
        if (!p.swinging && (c.aim === null || c.aim === undefined)) p.facing = Math.atan2(c.my, c.mx)
        p.walk += dt * 14
        if (p.emote && p.emote.key !== 'quack') p.emote = null
      }
    }
  } else if (grounded) {
    const f = Math.exp(-(w.flags.has('ice') ? 0.5 : 6) * dt)
    p.vx *= f
    p.vy *= f
  }

  if (w.flags.has('wind')) {
    p.vx += Math.cos(w.wind.a) * w.wind.s * dt * (grounded ? 1 : 1.6)
    p.vy += Math.sin(w.wind.a) * w.wind.s * dt * (grounded ? 1 : 1.6)
  }

  if (p.swinging) {
    p.swingT += dt
    if (!p.hitDone && p.swingT >= p.swingDur * 0.5) {
      p.hitDone = true
      doHit(w, p)
    }
    if (p.swingT >= p.swingDur) p.swinging = false
  }

  // in the air
  const tr = p.track
  if (p.z > 0 || p.vz > 0) {
    if (!tr.flight) tr.flight = { t: 0, x: p.x, y: p.y, peak: 0, trick: false, gap: false, offscreen: false, overs: new Set() }
    const fl = tr.flight
    p.vz -= g * dt
    // Respawning ducks float down gently under their balloons.
    if (p.parachute && p.vz < -160) p.vz = -160
    p.z += p.vz * dt
    p.spin += p.spinV * dt
    fl.t += dt
    fl.peak = Math.max(fl.peak, p.z)
    if (!groundAt(w.arena, p.x, p.y)) fl.gap = true
    const sx = p.x
    const sy = p.y - p.z * 0.4
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) {
      if (!fl.offscreen) stat(w, p, 'offscreen')
      fl.offscreen = true
    }
    if (p.human) {
      for (const q of w.players) if (q !== p && inPlay(q) && q.z < 5 && Math.hypot(q.x - p.x, q.y - p.y) < 20 && p.z > 30) fl.overs.add(q.id)
    }
    const drag = Math.exp(-0.15 * dt)
    p.vx *= drag
    p.vy *= drag
    if (p.z > 60 && Math.random() < 0.3) w.particles.push({ x: p.x, y: p.y, z: p.z + 10, vx: 0, vy: 0, vz: 0, t: 0, life: 0.35, r: 5 * k, color: p.color })
    if (p.z <= 0) {
      p.z = 0
      if (groundAt(w.arena, p.x, p.y)) land(w, p, fl)
      else p.vz = 0
      tr.flight = null
    }
  }

  const ox = p.x
  const oy = p.y
  p.x += p.vx * dt
  p.y += p.vy * dt
  if (p.human && playing) trackMovement(w, p, dt, Math.hypot(p.x - ox, p.y - oy))

  if (p.z <= 0 && !groundAt(w.arena, p.x, p.y)) startFall(w, p)
  else if (p.x < -400 || p.x > W + 400 || p.y < -400 || p.y > H + 400) startFall(w, p)
}

function land(w, p, fl) {
  const hard = p.vz < -380
  if (w.flags.has('bouncy')) {
    p.vz = 650
    p.z = 0.5
    stat(w, p, 'bounces')
    stat(w, p, 'rockets')
    sfx.boing()
  } else if (hard) {
    p.vz = -p.vz * 0.3
    p.z = 0.01
  } else {
    p.vz = 0
    p.spin = 0
    p.spinV = 0
  }
  p.vx *= 0.4
  p.vy *= 0.4
  burst(w, p.x, p.y, 0, 'rgba(255,255,255,0.7)', 5, 90)
  p.track.lastLand = w.t
  if (p.parachute) {
    p.parachute = false
    p.launched = null
    return
  }
  if (!p.human || !fl) return
  stat(w, p, 'landings')
  best(w, p, 'best_air', fl.t)
  best(w, p, 'best_height', fl.peak)
  best(w, p, 'best_airJumps', p.airJumps)
  best(w, p, 'best_airDist', Math.hypot(p.x - fl.x, p.y - fl.y))
  p.ms.air += fl.t
  stat(w, p, 'airtime', fl.t)
  if (fl.peak > 150) stat(w, p, 'bigLandings')
  if (p.launched && p.launched.dist > 150) stat(w, p, 'luckyLandings')
  if (fl.offscreen) stat(w, p, 'impossibleLandings')
  if (fl.trick) stat(w, p, 'styleLandings')
  if (moverAt(w.arena, p.x, p.y) && !onTiles(w.arena, p.x, p.y)) stat(w, p, 'moverLandings')
  if (nearEdge(w.arena, p.x, p.y, 16)) stat(w, p, 'edgeLandings')
  if (fl.gap && !p.launched) stat(w, p, 'gapJumps')
  if (fl.overs.size) stat(w, p, 'jumpOvers', fl.overs.size)
  // Launched victims that land safely count as a Boomerang for the hitter.
  if (p.launched && p.launched.by && p.launched.dist > 150) stat(w, p.launched.by, 'boomerangs')
  p.launched = null
  p.airJumps = 0
}

function trackMovement(w, p, dt, moved) {
  const t = p.track
  const c = p.cmd
  stat(w, p, 'distance', moved)
  const moving = Math.hypot(c.mx, c.my) > 0.3
  t.moveT = moving ? t.moveT + dt : 0
  best(w, p, 'best_moveStreak', t.moveT)
  if (w.flags.has('speed') && moving) stat(w, p, 'speedTime', dt)
  // direction streaks
  const dir = !moving ? '' : c.mx < 0 && !c.my ? 'L' : c.mx > 0 && !c.my ? 'R' : c.my > 0 && !c.mx ? 'D' : c.my < 0 && !c.mx ? 'U' : 'X'
  const horiz = dir === 'L' || dir === 'R'
  if (dir === t.dir) t.dirT += dt
  else {
    if (horiz && (t.dir === 'L' || t.dir === 'R')) t.sideT = (t.sideT || 0)
    else t.sideT = 0
    t.dirT = 0
    t.dir = dir
  }
  if (horiz) t.sideT = (t.sideT || 0) + dt
  else t.sideT = 0
  if (t.dirT >= 5 && !t.dirDone) {
    t.dirDone = true
    stat(w, p, { L: 'lefty', R: 'righty', D: 'downward', U: 'upward' }[dir] || 'nothing')
  }
  if (t.dirT < 5) t.dirDone = false
  if (t.sideT >= 5 && !t.sideDone) {
    t.sideDone = true
    stat(w, p, 'sideways')
  }
  if (t.sideT < 5) t.sideDone = false
  // circles and zigzags
  if (moving) {
    const d = angleDiff(p.facing, t.lastFacing)
    t.circle += d
    if (Math.abs(t.circle) >= TAU) {
      t.circle = 0
      stat(w, p, 'circles')
    }
    if (Math.abs(d) > 2.5) {
      t.turns.push(w.t)
      t.turns = t.turns.filter((x) => w.t - x < 5)
      if (t.turns.length >= 10) {
        t.turns = []
        stat(w, p, 'zigzags')
      }
    }
  }
  t.lastFacing = p.facing
  // standing still
  const idle = !moving && !c.bonk && !c.jump
  t.idleT = idle ? t.idleT + dt : 0
  if (t.idleT >= 10 && !t.idleDone) {
    t.idleDone = true
    stat(w, p, 'matchIdle')
  }
  if (!idle) t.idleDone = false
  const edge = p.z <= 0 && nearEdge(w.arena, p.x, p.y, 22)
  if (edge) stat(w, p, 'edgeTime', dt)
  t.edgeT = edge && !moving ? t.edgeT + dt : 0
  if (t.edgeT >= 3 && !t.edgeDone) {
    t.edgeDone = true
    stat(w, p, 'edgeStand')
  }
  if (t.edgeT < 3) t.edgeDone = false
  if (p.riding && !moving) {
    t.rideIdle = (t.rideIdle || 0) + dt
    if (t.rideIdle >= 10 && !t.rideDone) {
      t.rideDone = true
      stat(w, p, 'platformIdle')
    }
  } else {
    t.rideIdle = 0
    t.rideDone = false
  }
}

function startFall(w, p) {
  p.state = 'falling'
  p.fallT = 0
  p.swinging = false
  p.ms.falls += 1
  sfx.fall()
  popup(w, p.x, p.y, pick(['AAAAH!', 'NOOOO!', 'BYEEE!', 'WAAAH!', 'QUAAACK!', 'OOF!', 'OOF!']), '#fff', 16, 1, 40)
  stat(w, p, 'falls')
  const t = tileUnder(w.arena, p.x, p.y)
  if (t && t.state === 'falling') stat(w, p, 'tileFalls')
  if (w.flags.has('lowgrav')) stat(w, p, 'lowgravFalls')
  if (p.shieldT > 0) stat(w, p, 'shieldFalls')
  if (w.playT < 5) stat(w, p, 'earlyFalls')
  if (w.t - p.lastJump < 1.2 && !p.launched) stat(w, p, 'jumpFalls')
  if (w.t - p.lastDash < 1 && !p.launched) stat(w, p, 'dashFalls')
  if (!p.lastHit || w.t - p.lastHit.t > 6) stat(w, p, 'selfFalls')
}

function afterFall(w, p) {
  p.state = 'alive'
  p.invuln = 0
  p.shieldT = 0
  p.powers.shield = 0
  const hadOne = p.balloons
  popBalloon(w, p, p.lastHit && w.t - p.lastHit.t < 6 ? p.lastHit.by : null, 1, 'fall')
  if (p.balloons === hadOne) p.balloons -= 1
  if (p.balloons <= 0) {
    if (p.state !== 'out') knockOut(w, p, 'fall')
    return
  }
  p.state = 'respawning'
  p.respawnT = 0.6
  p.z = 0
}

function collide(w) {
  const alive = alivePlayers(w)
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i]
      const b = alive[j]
      if (Math.abs(a.z - b.z) > 30) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 0.01
      const min = radiusOf(w, a) + radiusOf(w, b)
      if (d >= min) continue
      const ux = dx / d
      const uy = dy / d
      const wa = sizeOf(w, a)
      const wb = sizeOf(w, b)
      const push = min - d
      a.x -= ux * push * (wb / (wa + wb))
      a.y -= uy * push * (wb / (wa + wb))
      b.x += ux * push * (wa / (wa + wb))
      b.y += uy * push * (wa / (wa + wb))
      const dasher = a.dashT > 0 ? a : b.dashT > 0 ? b : null
      if (dasher) {
        const other = dasher === a ? b : a
        const s = dasher === a ? 1 : -1
        if (other.shieldT <= 0 && other.invuln <= 0) {
          other.lastHit = { by: dasher, t: w.t, dist: 0 }
          launch(w, other, ux * s, uy * s, 110, 300)
          other.stun = 0.3
          dasher.ms.dashBumps += 1
          best(w, dasher, 'best_dashBumps', dasher.ms.dashBumps)
          popup(w, other.x, other.y, 'BUMP!', '#fff', 16, 0.8, 50)
          sfx.bonk()
        }
        dasher.dashT = 0
        dasher.vx *= 0.2
        dasher.vy *= 0.2
      }
    }
  }
}

function doEmote(w, p, idx) {
  const e = EMOTES[idx]
  if (!e) return
  if (e.key === 'quack') {
    if (p.quackCd > w.t) return
    p.quackCd = w.t + 0.12
    sfx.quack()
    popup(w, p.x, p.y, 'QUACK!', '#ffeb3b', 16, 0.7, 60)
    stat(w, p, 'quacks')
  } else {
    if (p.emote && p.emote.key === e.key) return
    if (e.key === 'spin') {
      stat(w, p, 'spins')
      if (p.z > 5) stat(w, p, 'airSpins')
    }
    if (e.key === 'flip') {
      p.flipT = 0.6
      if (Math.random() < 0.2) popup(w, p.x, p.y, 'DO A BARREL ROLL!', '#7cf', 14, 1, 70)
      stat(w, p, 'emote_flip')
    }
    if (e.key === 'flop') stat(w, p, 'flops')
    if (e.key === 'wave') sfx.click()
    if (p.z > 5) {
      stat(w, p, 'airEmotes')
      if (p.track.flight) p.track.flight.trick = true
    }
  }
  p.emote = { key: e.key, t: e.key === 'flop' ? 2 : 1 }
  w.hooks.emote(e.key)
  stat(w, p, 'emotes')
}

// ------------------------------------------------------------------ end

function finishMatch(w, winner) {
  const evKey = w.event ? w.event.key : null
  endEvent(w)
  w.phase = 'over'
  w.winner = winner
  if (winner) {
    winner.ms.score += 1000
    popup(w, winner.x, winner.y, pick(['👑 WINNER!', '👑 WINNER WINNER DUCK DINNER!', '👑 VICTORY ROYALE!', '👑 FLAWLESS... ish']), '#ffd23f', 26, 3, 140)
    sfx.win()
    sfx.cheer()
  } else sfx.lose()
  const humans = w.players.filter((p) => p.human)
  w.humanWon = !!winner && winner.human
  // final blow credit
  if (winner && winner.human) {
    const last = w.players.filter((p) => p !== winner && p.state === 'out').sort((a, b) => (b.lastHit?.t || 0) - (a.lastHit?.t || 0))[0]
    if (last && last.lastHit && last.lastHit.by === winner && w.t - last.lastHit.t < 8) stat(w, winner, 'finalBlow')
    else if (last && (!last.lastHit || w.t - last.lastHit.t > 6)) stat(w, winner, 'winsSelfDestruct')
  }
  w.results = {
    winner: winner ? { name: winner.name, human: winner.human, costume: winner.costume, color: winner.color } : null,
    humanWon: w.humanWon,
    arena: w.arena,
    challenge: w.challenge,
    realChallenge: w.realChallenge,
    difficulty: w.difficulty,
    ducks: w.players.length,
    duration: w.playT,
    events: w.eventsInMatch,
    eventsSurvived: w.eventsSurvived,
    rare: w.rareSeen,
    duck: w.duckVisited,
    lastEvent: evKey,
    night: w.night,
    mysteryBot: w.players.some((p) => p.mystery),
    humans: humans.map((p) => ({
      name: p.name,
      costume: p.costume,
      won: p === winner,
      alive: p.state === 'alive',
      balloons: p.balloons,
      airborne: p.z > 5,
      ms: { ...p.ms, unique: p.ms.unique.size },
    })),
    standings: [...w.players]
      .sort((a, b) => (b.state === 'alive') - (a.state === 'alive') || b.ms.score - a.ms.score)
      .map((p) => ({ name: p.name, tag: p.tag, color: p.color, kos: p.ms.kos, pops: p.ms.pops, human: p.human, won: p === winner })),
  }
}

// Title screen: send a duck flying straight up past the camera.
export function bonkLaunch(w, p) {
  p.lastHit = null
  launch(w, p, 0, 1, 380, 1100)
  p.spinV = 25
  p.stun = 0.8
  w.shake = 22
  popup(w, p.x, p.y, 'BONK!', '#ffd23f', 44, 1.2, 80)
  burst(w, p.x, p.y, 30, '#fff6a8', 20, 320)
  sfx.bonk()
}

export function eventPopup(w, text, x = CX, y = CY) {
  popup(w, x, y, text, '#fff', 26, 1, 60)
}

// Used by the dev build to test events on demand.
export function forceEvent(w, key) {
  const ev = [...EVENTS, ...RARE_EVENTS].find((e) => e.key === key)
  if (ev) startEvent(w, ev)
}

export function quitMatch(w) {
  if (w.phase !== 'over') w.hooks.stat('quits', 1)
}

// ------------------------------------------------------------------ fx + HUD

function updateFx(w, dt) {
  for (const p of w.popups) p.t += dt
  w.popups = w.popups.filter((p) => p.t < p.life)
  for (const p of w.particles) {
    p.t += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vz -= 600 * dt
    p.z = Math.max(0, p.z + p.vz * dt)
    p.vx *= 0.92
    p.vy *= 0.92
  }
  w.particles = w.particles.filter((p) => p.t < p.life)
  if (w.particles.length > 400) w.particles.splice(0, w.particles.length - 400)
  for (const t of w.twinkles) t.t += dt
  w.twinkles = w.twinkles.filter((t) => t.t < 1.2)
  for (const f of w.feed) f.t += dt
  w.feed = w.feed.filter((f) => f.t < 5)
  if (w.banner) {
    w.banner.t += dt
    if (w.banner.t > 2.8) w.banner = null
  }
  w.shake *= Math.exp(-7 * dt)
}

export function snapshot(w) {
  return {
    phase: w.phase,
    arena: w.arena.name,
    event: w.event ? { name: w.event.name, emoji: w.event.emoji, left: Math.ceil(w.eventT) } : null,
    nextEventIn: Math.max(0, Math.ceil(w.eventEvery - w.eventClock)),
    time: Math.floor(w.playT),
    challenge: w.realChallenge,
    players: w.players.map((p) => ({
      id: p.id,
      name: p.name,
      tag: p.tag,
      color: p.color,
      human: p.human,
      balloons: p.balloons,
      out: p.state === 'out',
      king: p.king,
      kos: p.ms.kos,
      hammer: `${HAMMERS[p.hammer].emoji} ${HAMMERS[p.hammer].name}`,
      dashReady: p.dashCd <= 0,
      shieldReady: p.shieldCd <= 0,
    })),
    results: w.results,
  }
}

export { H, W }
