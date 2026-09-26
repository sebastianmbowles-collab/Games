// Fight simulation: pure game state + a step function. No React, no drawing.

// World units. The screen is drawn at a smaller pixel size for chunky pixel art.
export const W = 768
export const H = 432
export const GROUND = 378
export const ROUND_TIME = 60
export const WINS_NEEDED = 2
export const SPECIAL_COST = 50
export const SUPER_COST = 100

const GRAVITY = 2400
const WALK = 230
const JUMP_V = 880
const BODY_HALF = 26
const BODY_HEIGHT = 130
const MIN_GAP = 70
const INPUT_BUFFER = 0.15
const STUN_MAX = 100

// Hitbox: `reach` is how far in front it goes; `top`/`bottom` are heights above the feet.
// punch = light attack, kick = heavy attack.
const MOVES = {
  punch: { dur: 0.26, on: 0.06, off: 0.14, dmg: 6, reach: 80, top: 118, bottom: 72, kb: 170, stun: 0.32 },
  kick: { dur: 0.42, on: 0.14, off: 0.27, dmg: 10, reach: 100, top: 88, bottom: 10, kb: 270, stun: 0.36 },
}

export const DIFFICULTY = {
  easy: { label: 'Easy', react: 0.45, block: 0.15, aggro: 0.4, reward: 15 },
  normal: { label: 'Normal', react: 0.28, block: 0.4, aggro: 0.6, reward: 25 },
  hard: { label: 'Hard', react: 0.14, block: 0.7, aggro: 0.85, reward: 40 },
}

export function createInput() {
  return { left: false, right: false, up: false, block: false, buf: { punch: 0, kick: 0, special: 0, dodge: 0, super: 0 } }
}

// Per-animal gimmicks, with defaults for everyone else.
const g = (f, key, fallback = 1) => f.def.gimmick?.[key] ?? fallback

function newStats() {
  return { hits: 0, maxCombo: 0, supers: 0, dizzies: 0, dodges: 0, blocks: 0, damageTaken: 0, perfects: 0 }
}

function createFighter(def, side) {
  return {
    def,
    side,
    x: side === 0 ? 230 : W - 230,
    y: GROUND,
    vx: 0,
    vy: 0,
    facing: side === 0 ? 1 : -1,
    hp: def.hp,
    hpShown: def.hp,
    meter: 0,
    stun: 0,
    stunCool: 0,
    combo: 0,
    comboShow: 0,
    comboT: 0,
    action: null,
    blocking: false,
    walkT: 0,
    flash: 0,
    pose: null,
    stats: newStats(),
    ai: { t: 0, blockT: 0 },
  }
}

// opts: { gravity, slide, training, names }
export function createMatch(defs, opts = {}) {
  return {
    fighters: [createFighter(defs[0], 0), createFighter(defs[1], 1)],
    projectiles: [],
    sparks: [],
    round: 1,
    wins: [0, 0],
    timer: ROUND_TIME,
    phase: 'intro',
    phaseT: 0,
    banner: 'ROUND 1',
    roundWinner: null,
    matchWinner: null,
    shake: 0,
    hype: 0,
    freeze: 0,
    superSide: null,
    clock: 0,
    gravity: opts.gravity ?? 1,
    slide: opts.slide ?? 1,
    training: !!opts.training,
    arena: opts.arena ?? 'jungle',
    names: opts.names ?? null,
    // Things that happened this frame (hits, jumps, KOs...) for sounds and voices to react to.
    events: [],
  }
}

function resetRound(m) {
  m.fighters = m.fighters.map((f) => {
    const fresh = createFighter(f.def, f.side)
    fresh.meter = f.meter
    fresh.stats = f.stats
    return fresh
  })
  m.projectiles = []
  m.sparks = []
  m.timer = ROUND_TIME
  m.phase = 'intro'
  m.phaseT = 0
  m.banner = m.wins[0] === WINS_NEEDED - 1 && m.wins[1] === WINS_NEEDED - 1 ? 'FINAL ROUND' : `ROUND ${m.round}`
  m.roundWinner = null
  m.announced = false
}

const grounded = (f) => f.y >= GROUND
const dodging = (f) => f.action?.type === 'dodge' && f.action.t > 0.02 && f.action.t < 0.3

function spark(m, x, y, kind, life = 0.45) {
  m.sparks.push({ x, y, kind, life, max: life })
}

function hurtbox(f) {
  return { l: f.x - BODY_HALF, r: f.x + BODY_HALF, top: f.y - BODY_HEIGHT, bottom: f.y }
}

function hitsBox(att, box, reach, top, bottom) {
  const tip = att.x + att.facing * reach
  const base = att.x + att.facing * 10
  const l = Math.min(tip, base)
  const r = Math.max(tip, base)
  const t = att.y - top
  const b = att.y - bottom
  return l < box.r && r > box.l && t < box.bottom && b > box.top
}

// Deal a hit from `att` to `def`. `fromX` decides which way the defender must face to block.
// Returns 'hit', 'blocked' or 'miss'.
function applyHit(m, att, def, { dmg, kbx, kby = 0, stun, heavy = false, fromX = att.x, unblockable = false }) {
  if (def.action?.type === 'ko') return 'miss'
  if (dodging(def)) {
    if (!def.action.dodged) {
      def.action.dodged = true
      m.sparks.push({ x: def.x, y: def.y - 150, kind: 'word', text: 'MISS!', life: 0.6, max: 0.6 })
    }
    return 'miss'
  }
  const dir = Math.sign(def.x - fromX) || att.facing
  // Shell-Shock's shell blocks from both sides.
  const facingOk = def.facing === -dir || g(def, 'shell', false)
  const blocked = !unblockable && def.blocking && grounded(def) && facingOk
  const dizzy = def.action?.type === 'dizzy'
  let damage = dmg * att.def.power
  if (!grounded(att)) damage *= g(att, 'airMult')

  if (blocked) {
    damage = Math.max(g(def, 'shell', false) ? 0 : 1, Math.ceil(damage * g(def, 'chip', 0.15)))
    def.vx = dir * kbx * 0.5
    def.action = { type: 'hurt', t: 0, dur: 0.14, blocked: true }
    def.stats.blocks += 1
    spark(m, def.x - dir * 20, def.y - 90, 'block', 0.3)
    att.combo = 0
  } else {
    // Combo: this hit landed while they were still reeling from the last one.
    const reeling = (def.action?.type === 'hurt' && !def.action.blocked) || dizzy || (def.action?.type === 'hurt' && !grounded(def))
    att.combo = reeling ? att.combo + 1 : 1
    if (att.combo >= 2) {
      att.comboShow = att.combo
      att.comboT = 1.3
      att.stats.maxCombo = Math.max(att.stats.maxCombo, att.combo)
      m.events.push({ type: 'combo', side: att.side, n: att.combo })
    }
    // Each extra hit in a combo does a little less, so combos can't go on forever.
    damage *= Math.max(0.5, 1 - 0.1 * (att.combo - 1))
    damage = Math.max(1, Math.round(damage))
    if (!dizzy) {
      def.vx = dir * kbx
      if (kby) def.vy = kby * Math.sqrt(m.gravity)
      // Long combos wear off: after 6 hits the flinch gets shorter, so you can escape.
      const escape = att.combo > 6 ? Math.max(0.35, 1 - (att.combo - 6) * 0.2) : 1
      def.action = { type: 'hurt', t: 0, dur: stun * escape }
    } else {
      def.action.dur -= 0.25
    }
    def.flash = 0.18
    spark(m, def.x - dir * 18, def.y - 85, heavy ? 'heavy' : 'hit', heavy ? 0.4 : 0.3)
    if (heavy) m.shake = Math.max(m.shake, 0.25)
    m.hype = Math.min(1, m.hype + (heavy ? 0.3 : 0.12))
    att.stats.hits += 1
    // Stun meter: too many hits and you get dizzy.
    if (!dizzy) {
      def.stun += damage * (heavy ? 1.9 : 1.5)
      def.stunCool = 1.2
      if (def.stun >= STUN_MAX && def.hp - damage > 0) {
        def.stun = 0
        def.action = { type: 'dizzy', t: 0, dur: 1.8 }
        def.vx = 0
        att.stats.dizzies += 1
        m.events.push({ type: 'dizzy', side: def.side })
        m.hype = 1
      }
    }
  }
  damage = Math.round(damage)
  if (m.training && def.side === 1) def.hp = Math.max(1, def.hp - damage)
  else def.hp = Math.max(0, def.hp - damage)
  def.stats.damageTaken += damage
  def.lastHitT = 0
  m.sparks.push({ x: def.x, y: def.y - 160, kind: 'number', text: `-${damage}`, life: 0.7, max: 0.7 })
  m.events.push({ type: 'hit', side: def.side, heavy, blocked })
  att.meter = Math.min(100, att.meter + (blocked ? 4 : 8))
  def.meter = Math.min(100, def.meter + 5)
  if (def.hp <= 0) {
    m.events.push({ type: 'ko', side: def.side })
    def.action = { type: 'ko', t: 0 }
    def.vx = dir * 380
    def.vy = -520
    m.shake = 0.4
    m.hype = 1
  }
  return blocked ? 'blocked' : 'hit'
}

function scaledMove(f, name) {
  const base = MOVES[name]
  const speed = g(f, 'attackSpeed')
  return {
    ...base,
    dur: base.dur / speed,
    on: base.on / speed,
    off: base.off / speed,
    reach: base.reach * g(f, 'reach'),
    dmg: base.dmg * (name === 'punch' ? g(f, 'lightMult') : g(f, 'heavyMult')),
  }
}

function startMove(f, name, m) {
  f.action = { type: 'attack', move: scaledMove(f, name), name, t: 0, hit: false }
  m.events.push({ type: 'swing', side: f.side, name })
}

function startSpecial(f, m) {
  const sp = f.def.special
  if (sp.type === 'projectile' && m.projectiles.some((p) => p.owner === f.side)) return false
  f.meter -= SPECIAL_COST
  m.events.push({ type: 'special', side: f.side })
  f.action = { type: 'special', t: 0, hit: false, fired: false, landed: false }
  if (sp.type === 'uppercut') {
    f.vy = -950 * Math.min(1.1, f.def.jump) * Math.sqrt(m.gravity)
    f.vx = f.facing * 160
  }
  if (sp.type === 'slam') {
    f.vy = -620 * Math.sqrt(m.gravity)
    f.vx = 0
  }
  return true
}

function startSuper(f, m) {
  f.meter = 0
  f.stats.supers += 1
  f.action = { type: 'super', t: 0, hits: 0, connected: false, stage: 'rush' }
  f.vx = 0
  // Freeze everything for a dramatic moment, like the real thing.
  m.freeze = 0.8
  m.superSide = f.side
  m.hype = 1
  m.events.push({ type: 'super', side: f.side })
}

function startDodge(f, inp, m) {
  const held = (inp.right ? 1 : 0) - (inp.left ? 1 : 0)
  const dir = held || -f.facing
  f.action = { type: 'dodge', t: 0, dir }
  f.stats.dodges += 1
  m.events.push({ type: 'dodge', side: f.side })
}

function runSpecial(f, opp, m) {
  const a = f.action
  const sp = f.def.special
  switch (sp.type) {
    case 'projectile':
      if (!a.fired && a.t >= 0.18) {
        a.fired = true
        m.projectiles.push({
          owner: f.side,
          x: f.x + f.facing * 50,
          y: f.y - 85,
          vx: f.facing * sp.speed,
          dmg: sp.dmg,
          emoji: sp.emoji,
          size: sp.size,
          spin: 0,
        })
        m.events.push({ type: 'throw', side: f.side })
      }
      return a.t >= 0.45
    case 'dash': {
      // Rhino-Mite's charge lasts long enough to cross the whole arena.
      const end = sp.dur ?? 0.46
      if (a.t >= 0.08 && a.t < end && !a.hit) {
        f.vx = f.facing * sp.speed
        if (hitsBox(f, hurtbox(opp), 64, 115, 5)) {
          a.hit = true
          f.vx = -f.facing * 120
          applyHit(m, f, opp, { dmg: sp.dmg, kbx: 480, kby: -300, stun: 0.55, heavy: true })
        }
      }
      return a.t >= end + 0.14
    }
    case 'uppercut':
      if (a.t < 0.38 && !a.hit && hitsBox(f, hurtbox(opp), 62, 175, 0)) {
        a.hit = true
        applyHit(m, f, opp, { dmg: sp.dmg, kbx: 260, kby: -720, stun: 0.6, heavy: true })
      }
      // Landing leaves you open for a moment, so a missed uppercut can be punished.
      if (a.t > 0.2 && grounded(f) && a.landT === undefined) a.landT = a.t
      return a.landT !== undefined && a.t > a.landT + 0.3
    case 'slam':
      if (!a.landed && a.t > 0.12 && grounded(f)) {
        a.landed = true
        m.shake = 0.3
        spark(m, f.x - 90, GROUND - 20, 'dust', 0.5)
        spark(m, f.x + 90, GROUND - 20, 'dust', 0.5)
        m.events.push({ type: 'slam', side: f.side })
        if (grounded(opp) && Math.abs(opp.x - f.x) < sp.radius) {
          applyHit(m, f, opp, { dmg: sp.dmg, kbx: 360, kby: -420, stun: 0.6, heavy: true, fromX: f.x })
        }
      }
      return a.landed && a.t > 0.5
    default:
      return true
  }
}

// Super: rush forward; if it connects, a flurry of hits and a big launch at the end.
function runSuper(f, opp, m) {
  const a = f.action
  if (a.stage === 'rush') {
    f.vx = f.facing * 900
    if (hitsBox(f, hurtbox(opp), 70, 130, 0)) {
      const res = applyHit(m, f, opp, { dmg: 6, kbx: 60, stun: 1.2, heavy: true })
      if (res === 'hit') {
        a.stage = 'flurry'
        a.t = 0
        a.hits = 1
        f.vx = 0
        opp.vx = 0
        m.events.push({ type: 'superHit', side: f.side })
      } else {
        a.stage = 'recover'
        a.t = 0
        f.vx = -f.facing * 150
      }
    } else if (a.t > 0.5) {
      a.stage = 'recover'
      a.t = 0
    }
    return false
  }
  if (a.stage === 'flurry') {
    f.vx = 0
    // Keep the opponent right in front while the hits land.
    opp.x += (f.x + f.facing * 60 - opp.x) * 0.3
    if (a.t > a.hits * 0.1 && a.hits < 6) {
      a.hits += 1
      const last = a.hits === 6
      applyHit(m, f, opp, {
        dmg: last ? 10 : 4,
        kbx: last ? 520 : 40,
        kby: last ? -700 : 0,
        stun: last ? 0.8 : 0.5,
        heavy: true,
        unblockable: true,
      })
      if (opp.action?.type === 'ko') return true
      if (last) {
        a.stage = 'recover'
        a.t = 0
      }
    }
    return false
  }
  return a.t > 0.35
}

function updateFighter(f, opp, inp, dt, m) {
  f.flash = Math.max(0, f.flash - dt)
  f.hpShown += (f.hp - f.hpShown) * Math.min(1, dt * 3)
  f.comboT = Math.max(0, f.comboT - dt)
  f.stunCool -= dt
  if (f.stunCool <= 0) f.stun = Math.max(0, f.stun - 22 * dt)
  f.lastHitT = (f.lastHitT ?? 9) + dt
  const a = f.action
  if (a) a.t += dt

  if ((a?.type === 'hurt' || a?.type === 'dizzy') && a.t >= a.dur) f.action = null
  if (a?.type === 'dodge') {
    f.vx = a.t < 0.3 ? a.dir * 560 : f.vx
    if (a.t >= 0.42) f.action = null
  }
  let canCancel = false
  if (a?.type === 'attack') {
    const mv = a.move
    if (!a.hit && a.t >= mv.on && a.t <= mv.off && hitsBox(f, hurtbox(opp), mv.reach, mv.top, mv.bottom)) {
      a.hit = true
      a.landed = applyHit(m, f, opp, { dmg: mv.dmg, kbx: mv.kb, stun: mv.stun, heavy: a.name === 'kick' }) === 'hit'
    }
    // Chain: once a hit lands you can cancel the rest of the move into another attack.
    canCancel = a.landed && a.t > mv.off
    if (a.t >= mv.dur) f.action = null
  }
  if (a?.type === 'special' && runSpecial(f, opp, m)) f.action = null
  if (a?.type === 'super' && runSuper(f, opp, m)) f.action = null

  const free = !f.action
  f.blocking = free && grounded(f) && !!inp?.block
  if (inp && (free || canCancel)) {
    if (free && grounded(f)) {
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0)
      f.vx = f.blocking ? 0 : dir * WALK * f.def.speed
      if (inp.up && !f.blocking) {
        f.vy = -JUMP_V * f.def.jump * Math.sqrt(m.gravity)
        m.events.push({ type: 'jump', side: f.side })
      }
    }
    if (inp.buf.super > 0 && f.meter >= SUPER_COST) {
      inp.buf.super = 0
      startSuper(f, m)
    } else if (inp.buf.special > 0 && f.meter >= SPECIAL_COST) {
      inp.buf.special = 0
      startSpecial(f, m)
    } else if (inp.buf.dodge > 0 && grounded(f) && free) {
      inp.buf.dodge = 0
      startDodge(f, inp, m)
    } else if (inp.buf.punch > 0) {
      inp.buf.punch = 0
      startMove(f, 'punch', m)
    } else if (inp.buf.kick > 0) {
      inp.buf.kick = 0
      startMove(f, 'kick', m)
    }
  }
  if (!f.action && grounded(f)) f.facing = Math.sign(opp.x - f.x) || f.facing

  const sliding = f.action?.type === 'dodge' || (f.action?.type === 'special' && f.def.special.type === 'dash') || f.action?.type === 'super'
  f.vy += GRAVITY * m.gravity * dt
  f.x += f.vx * dt
  f.y += f.vy * dt
  if (f.y >= GROUND) {
    f.y = GROUND
    f.vy = 0
    // Ice (the Arctic) keeps you sliding after hits.
    if (f.action && !sliding) f.vx *= Math.exp(-9 * m.slide * dt)
  }
  f.x = Math.max(BODY_HALF + 4, Math.min(W - BODY_HALF - 4, f.x))
  if (grounded(f)) f.walkT += (dt * Math.abs(f.vx)) / 40
  if (m.phase === 'fight') f.meter = Math.min(100, f.meter + 3 * dt)
}

function separate(a, b) {
  // No pushing while someone rolls (you can roll through), or when one is in the air.
  if (a.action?.type === 'dodge' || b.action?.type === 'dodge') return
  if (Math.abs(a.y - b.y) > 90) return
  const gap = b.x - a.x
  if (Math.abs(gap) >= MIN_GAP) return
  const push = (MIN_GAP - Math.abs(gap)) / 2
  const dir = gap >= 0 ? 1 : -1
  a.x -= dir * push
  b.x += dir * push
  const lo = BODY_HALF + 4
  const hi = W - BODY_HALF - 4
  // If one got pinned to a wall, shove the other the rest of the way.
  if (a.x < lo || a.x > hi) {
    a.x = Math.max(lo, Math.min(hi, a.x))
    b.x = a.x + dir * MIN_GAP
  }
  if (b.x < lo || b.x > hi) {
    b.x = Math.max(lo, Math.min(hi, b.x))
    a.x = b.x - dir * MIN_GAP
  }
}

function updateProjectiles(m, dt) {
  for (const p of m.projectiles) {
    p.x += p.vx * dt
    p.spin += dt
    const target = m.fighters[1 - p.owner]
    const box = hurtbox(target)
    if (!p.dead && !dodging(target) && p.x > box.l - p.size / 3 && p.x < box.r + p.size / 3 && p.y > box.top && p.y < box.bottom) {
      p.dead = true
      applyHit(m, m.fighters[p.owner], target, { dmg: p.dmg, kbx: 300, stun: 0.45, heavy: true, fromX: p.x })
    }
  }
  const [a, b] = [m.projectiles.find((p) => p.owner === 0 && !p.dead), m.projectiles.find((p) => p.owner === 1 && !p.dead)]
  if (a && b && Math.abs(a.x - b.x) < (a.size + b.size) / 2) {
    a.dead = b.dead = true
    spark(m, (a.x + b.x) / 2, a.y, 'heavy', 0.5)
    m.events.push({ type: 'clash' })
  }
  m.projectiles = m.projectiles.filter((p) => !p.dead && p.x > -60 && p.x < W + 60)
}

// Computer opponent: re-decides every so often, like a player with slower reactions.
// `level.dummy` makes a training dummy: 'stand', 'block' or 'jump'.
export function cpuThink(m, side, inp, level, dt) {
  const cpu = m.fighters[side]
  const opp = m.fighters[1 - side]
  if (level.dummy) {
    Object.assign(inp, { left: false, right: false, up: level.dummy === 'jump', block: level.dummy === 'block' })
    return
  }
  const ai = cpu.ai
  ai.t -= dt
  if (ai.blockT > 0) {
    ai.blockT -= dt
    Object.assign(inp, { left: false, right: false, up: false, block: true })
    return
  }
  inp.block = false
  if (ai.t > 0) return
  ai.t = level.react * (0.6 + Math.random() * 0.8)

  const dx = opp.x - cpu.x
  const dist = Math.abs(dx)
  const toward = Math.sign(dx)
  inp.up = false
  inp.left = false
  inp.right = false

  const incoming = m.projectiles.find(
    (p) => p.owner !== side && Math.sign(p.vx) === Math.sign(cpu.x - p.x) && Math.abs(p.x - cpu.x) < 260,
  )
  const oppAttacking = (opp.action?.type === 'attack' || opp.action?.type === 'special' || opp.action?.type === 'super') && dist < 170
  if (incoming && Math.random() < 0.35) {
    inp.up = true
    inp[toward > 0 ? 'right' : 'left'] = true
    return
  }
  if ((incoming || oppAttacking) && Math.random() < level.block * 0.35) {
    inp.buf.dodge = INPUT_BUFFER
    inp[toward > 0 ? 'left' : 'right'] = true
    return
  }
  if ((incoming || oppAttacking) && Math.random() < level.block) {
    ai.blockT = 0.45
    inp.block = true
    return
  }

  if (cpu.meter >= SUPER_COST && dist < 260 && Math.random() < level.aggro * 0.7) {
    inp.buf.super = INPUT_BUFFER
    return
  }
  const sp = cpu.def.special
  if (cpu.meter >= SPECIAL_COST && cpu.meter < SUPER_COST - 15 && Math.random() < level.aggro * 0.6) {
    const fits =
      (sp.type === 'projectile' && dist > 70) ||
      (sp.type === 'dash' && dist > 120 && dist < 420) ||
      (sp.type === 'uppercut' && (dist < 110 || (!grounded(opp) && dist < 180))) ||
      (sp.type === 'slam' && dist < sp.radius - 30 && grounded(opp))
    if (fits) {
      inp.buf.special = INPUT_BUFFER
      return
    }
  }

  if (dist > 105) {
    inp[toward > 0 ? 'right' : 'left'] = true
    if (Math.random() < 0.1) inp.up = true
  } else if (Math.random() < level.aggro) {
    // Try a light-light-heavy chain sometimes.
    inp.buf[Math.random() < 0.6 ? 'punch' : 'kick'] = INPUT_BUFFER
    if (cpu.action?.type === 'attack' && cpu.action.landed) inp.buf.kick = INPUT_BUFFER
  } else if (Math.random() < 0.4) {
    inp[toward > 0 ? 'left' : 'right'] = true
  }
}

export function pressButton(inp, name) {
  inp.buf[name] = INPUT_BUFFER
}

// Advance the whole match by dt seconds.
export function step(m, inputs, dt) {
  m.clock += dt
  m.shake = Math.max(0, m.shake - dt)
  m.hype = Math.max(0, m.hype - dt * 0.4)
  for (const inp of inputs) {
    for (const k of Object.keys(inp.buf)) inp.buf[k] = Math.max(0, inp.buf[k] - dt)
  }
  // Super freeze: everything holds still while the super flash plays.
  if (m.freeze > 0) {
    m.freeze = Math.max(0, m.freeze - dt)
    if (m.freeze === 0) m.superSide = null
    return
  }
  m.phaseT += dt
  // Slow motion right after a knockout, like the real thing.
  const simDt = m.phase === 'ko' && m.phaseT < 1 ? dt * 0.35 : dt
  const live = m.phase === 'fight'
  const [p0, p1] = m.fighters

  updateFighter(p0, p1, live ? inputs[0] : null, simDt, m)
  updateFighter(p1, p0, live ? inputs[1] : null, simDt, m)
  if (p0.action?.type !== 'ko' && p1.action?.type !== 'ko') separate(p0, p1)
  updateProjectiles(m, simDt)
  for (const s of m.sparks) {
    s.life -= dt
    s.y -= (s.kind === 'number' || s.kind === 'word' ? 50 : 15) * dt
  }
  m.sparks = m.sparks.filter((s) => s.life > 0)

  if (m.training) {
    // Training: no timer, the dummy heals up, and your meter stays full.
    m.phase = m.phaseT > 1.8 || m.phase === 'fight' ? 'fight' : 'intro'
    if (m.phase === 'fight') m.banner = null
    else if (m.phaseT > 0.9) m.banner = 'TRAINING'
    p0.meter = 100
    if (p1.lastHitT > 1.5) p1.hp = Math.min(p1.def.hp, p1.hp + 60 * dt)
    return
  }

  if (m.phase === 'intro') {
    if (!m.announced) {
      m.announced = true
      m.events.push({ type: 'round', n: m.round, final: m.wins[0] === WINS_NEEDED - 1 && m.wins[1] === WINS_NEEDED - 1 })
    }
    if (m.phaseT > 1.2 && m.banner !== 'FIGHT!') {
      m.banner = 'FIGHT!'
      m.events.push({ type: 'fight', round: m.round })
    }
    if (m.phaseT > 1.8) {
      m.phase = 'fight'
      m.phaseT = 0
      m.banner = null
    }
  } else if (m.phase === 'fight') {
    m.timer = Math.max(0, m.timer - dt)
    const koed = p0.hp <= 0 || p1.hp <= 0
    if (koed || m.timer <= 0) {
      m.announced = false
      m.phase = 'ko'
      m.phaseT = 0
      m.banner = koed ? 'K.O.!' : 'TIME!'
      if (!koed) m.events.push({ type: 'time' })
      m.roundWinner = p0.hp === p1.hp ? null : p0.hp > p1.hp ? 0 : 1
      m.projectiles = []
    }
  } else if (m.phase === 'ko' || m.phase === 'over') {
    // Victory and defeat poses once the dust settles.
    if (m.phaseT > 1.1 && m.roundWinner !== null) {
      const w = m.fighters[m.roundWinner]
      const l = m.fighters[1 - m.roundWinner]
      if (!w.action || w.action.type === 'hurt') {
        w.action = null
        w.pose = 'victory'
      }
      if (l.action?.type !== 'ko') {
        l.action = null
        l.pose = 'defeat'
      }
    }
    if (m.phase === 'ko') {
      if (m.phaseT > 1.4 && !m.announced) {
        m.announced = true
        const w = m.roundWinner
        m.banner = w === null ? 'DRAW' : `${m.fighters[w].def.name.toUpperCase()} WINS`
        const perfect = w !== null && m.fighters[w].hp === m.fighters[w].def.hp
        if (perfect) {
          m.banner = 'PERFECT!'
          m.fighters[w].stats.perfects += 1
        }
        m.events.push({ type: 'roundWin', side: w, perfect })
      }
      if (m.phaseT > 3.2) {
        if (m.roundWinner !== null) m.wins[m.roundWinner] += 1
        const champ = m.wins.findIndex((wn) => wn >= WINS_NEEDED)
        if (champ !== -1) {
          m.phase = 'over'
          m.matchWinner = champ
          m.banner = null
          // Which ridiculous victory quote the winner says (picked here so both online players hear the same one).
          m.quote = Math.floor(Math.random() * m.fighters[champ].def.quotes.length)
          m.events.push({ type: 'matchWin', side: champ, quote: m.quote })
        } else {
          m.round += 1
          resetRound(m)
        }
      }
    }
  }
}

// Online play: the host sends snapshots, the guest turns them back into a match to draw.
export function snapshot(m, events) {
  return { ...m, fighters: m.fighters.map((f) => ({ ...f, def: f.def.key })), events }
}

export function hydrate(s, roster) {
  return { ...s, fighters: s.fighters.map((f) => ({ ...f, def: roster.find((d) => d.key === f.def) })) }
}
