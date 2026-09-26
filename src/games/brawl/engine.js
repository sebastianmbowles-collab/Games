// Fight simulation: pure game state + a step function. No React, no drawing.

export const W = 800
export const H = 450
export const GROUND = 395
export const ROUND_TIME = 60
export const WINS_NEEDED = 2
export const SPECIAL_COST = 50

const GRAVITY = 2400
const WALK = 230
const JUMP_V = 880
const BODY_HALF = 26
const BODY_HEIGHT = 130
const MIN_GAP = 70
const INPUT_BUFFER = 0.15

// Hitbox: `reach` is how far in front it goes; `top`/`bottom` are heights above the feet.
const MOVES = {
  punch: { dur: 0.26, on: 0.06, off: 0.14, dmg: 6, reach: 80, top: 118, bottom: 72, kb: 170, stun: 0.24 },
  kick: { dur: 0.42, on: 0.14, off: 0.27, dmg: 10, reach: 100, top: 88, bottom: 10, kb: 270, stun: 0.32 },
}

export const DIFFICULTY = {
  easy: { label: 'Easy', react: 0.45, block: 0.15, aggro: 0.4, reward: 15 },
  normal: { label: 'Normal', react: 0.28, block: 0.4, aggro: 0.6, reward: 25 },
  hard: { label: 'Hard', react: 0.14, block: 0.7, aggro: 0.85, reward: 40 },
}

export function createInput() {
  return { left: false, right: false, up: false, block: false, buf: { punch: 0, kick: 0, special: 0 } }
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
    action: null,
    blocking: false,
    walkT: 0,
    flash: 0,
    ai: { t: 0, blockT: 0 },
  }
}

export function createMatch(defs) {
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
    clock: 0,
  }
}

function resetRound(m) {
  m.fighters = m.fighters.map((f) => {
    const fresh = createFighter(f.def, f.side)
    fresh.meter = f.meter
    return fresh
  })
  m.projectiles = []
  m.sparks = []
  m.timer = ROUND_TIME
  m.phase = 'intro'
  m.phaseT = 0
  m.banner = `ROUND ${m.round}`
  m.roundWinner = null
}

const grounded = (f) => f.y >= GROUND

function spark(m, x, y, text, size = 40, life = 0.45) {
  m.sparks.push({ x, y, text, size, life, max: life })
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
function applyHit(m, att, def, { dmg, kbx, kby = 0, stun, heavy = false, fromX = att.x }) {
  if (def.action?.type === 'ko') return
  const dir = Math.sign(def.x - fromX) || att.facing
  const blocked = def.blocking && grounded(def) && def.facing === -dir
  let damage = Math.round(dmg * att.def.power)
  if (blocked) {
    damage = Math.max(1, Math.ceil(damage * 0.15))
    def.vx = dir * kbx * 0.5
    def.action = { type: 'hurt', t: 0, dur: 0.14, blocked: true }
    spark(m, def.x - dir * 20, def.y - 90, '🛡️', 34, 0.3)
  } else {
    def.vx = dir * kbx
    if (kby) def.vy = kby
    def.action = { type: 'hurt', t: 0, dur: stun }
    def.flash = 0.18
    spark(m, def.x - dir * 18, def.y - 85, heavy ? '💥' : '✨', heavy ? 56 : 38)
    if (heavy) m.shake = 0.25
  }
  def.hp = Math.max(0, def.hp - damage)
  m.sparks.push({ x: def.x, y: def.y - 140, text: `-${damage}`, size: 22, life: 0.7, max: 0.7, number: true })
  att.meter = Math.min(100, att.meter + (blocked ? 4 : 10))
  def.meter = Math.min(100, def.meter + 6)
  if (def.hp <= 0) {
    def.action = { type: 'ko', t: 0 }
    def.vx = dir * 380
    def.vy = -520
    m.shake = 0.4
  }
}

function startMove(f, name) {
  f.action = { type: 'attack', move: MOVES[name], name, t: 0, hit: false }
}

function startSpecial(f, m) {
  const sp = f.def.special
  if (sp.type === 'projectile' && m.projectiles.some((p) => p.owner === f.side)) return false
  f.meter -= SPECIAL_COST
  f.action = { type: 'special', t: 0, hit: false, fired: false, landed: false }
  if (sp.type === 'uppercut') {
    f.vy = -950 * Math.min(1.1, f.def.jump)
    f.vx = f.facing * 160
  }
  if (sp.type === 'slam') {
    f.vy = -620
    f.vx = 0
  }
  return true
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
      }
      return a.t >= 0.45
    case 'dash':
      if (a.t >= 0.08 && a.t < 0.46 && !a.hit) {
        f.vx = f.facing * sp.speed
        if (hitsBox(f, hurtbox(opp), 64, 115, 5)) {
          a.hit = true
          f.vx = -f.facing * 120
          applyHit(m, f, opp, { dmg: sp.dmg, kbx: 480, kby: -300, stun: 0.55, heavy: true })
        }
      }
      return a.t >= 0.6
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
        spark(m, f.x - 90, GROUND - 20, '💨', 44, 0.5)
        spark(m, f.x + 90, GROUND - 20, '💨', 44, 0.5)
        if (grounded(opp) && Math.abs(opp.x - f.x) < sp.radius) {
          applyHit(m, f, opp, { dmg: sp.dmg, kbx: 360, kby: -420, stun: 0.6, heavy: true, fromX: f.x })
        }
      }
      return a.landed && a.t > 0.5
    default:
      return true
  }
}

function updateFighter(f, opp, inp, dt, m) {
  f.flash = Math.max(0, f.flash - dt)
  f.hpShown += (f.hp - f.hpShown) * Math.min(1, dt * 3)
  const a = f.action
  if (a) a.t += dt

  if (a?.type === 'hurt' && a.t >= a.dur) f.action = null
  if (a?.type === 'attack') {
    const mv = a.move
    if (!a.hit && a.t >= mv.on && a.t <= mv.off && hitsBox(f, hurtbox(opp), mv.reach, mv.top, mv.bottom)) {
      a.hit = true
      applyHit(m, f, opp, { dmg: mv.dmg, kbx: mv.kb, stun: mv.stun, heavy: a.name === 'kick' })
    }
    if (a.t >= mv.dur) f.action = null
  }
  if (a?.type === 'special' && runSpecial(f, opp, m)) f.action = null

  const free = !f.action
  f.blocking = free && grounded(f) && !!inp?.block
  if (free && inp) {
    if (grounded(f)) {
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0)
      f.vx = f.blocking ? 0 : dir * WALK * f.def.speed
      if (inp.up && !f.blocking) f.vy = -JUMP_V * f.def.jump
    }
    if (inp.buf.special > 0 && f.meter >= SPECIAL_COST) {
      inp.buf.special = 0
      startSpecial(f, m)
    } else if (inp.buf.punch > 0) {
      inp.buf.punch = 0
      startMove(f, 'punch')
    } else if (inp.buf.kick > 0) {
      inp.buf.kick = 0
      startMove(f, 'kick')
    }
  }
  if (!f.action && grounded(f)) f.facing = Math.sign(opp.x - f.x) || f.facing

  const dashing = f.action?.type === 'special' && f.def.special.type === 'dash'
  f.vy += GRAVITY * dt
  f.x += f.vx * dt
  f.y += f.vy * dt
  if (f.y >= GROUND) {
    f.y = GROUND
    f.vy = 0
    if (f.action && !dashing) f.vx *= Math.exp(-9 * dt)
  }
  f.x = Math.max(BODY_HALF + 4, Math.min(W - BODY_HALF - 4, f.x))
  if (grounded(f)) f.walkT += (dt * Math.abs(f.vx)) / 40
  if (m.phase === 'fight') f.meter = Math.min(100, f.meter + 3 * dt)
}

function separate(a, b) {
  // Only push apart when their bodies overlap vertically (you can jump over someone).
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
    if (!p.dead && p.x > box.l - p.size / 3 && p.x < box.r + p.size / 3 && p.y > box.top && p.y < box.bottom) {
      p.dead = true
      applyHit(m, m.fighters[p.owner], target, { dmg: p.dmg, kbx: 300, stun: 0.45, heavy: true, fromX: p.x })
    }
  }
  const [a, b] = [m.projectiles.find((p) => p.owner === 0 && !p.dead), m.projectiles.find((p) => p.owner === 1 && !p.dead)]
  if (a && b && Math.abs(a.x - b.x) < (a.size + b.size) / 2) {
    a.dead = b.dead = true
    spark(m, (a.x + b.x) / 2, a.y, '💥', 60)
  }
  m.projectiles = m.projectiles.filter((p) => !p.dead && p.x > -60 && p.x < W + 60)
}

// Computer opponent: re-decides every so often, like a player with slower reactions.
export function cpuThink(m, side, inp, level, dt) {
  const cpu = m.fighters[side]
  const opp = m.fighters[1 - side]
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
  const oppAttacking = (opp.action?.type === 'attack' || opp.action?.type === 'special') && dist < 170
  if (incoming && Math.random() < 0.35) {
    inp.up = true
    inp[toward > 0 ? 'right' : 'left'] = true
    return
  }
  if ((incoming || oppAttacking) && Math.random() < level.block) {
    ai.blockT = 0.45
    inp.block = true
    return
  }

  const sp = cpu.def.special
  if (cpu.meter >= SPECIAL_COST && Math.random() < level.aggro * 0.6) {
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
    inp.buf[Math.random() < 0.55 ? 'punch' : 'kick'] = INPUT_BUFFER
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
  m.phaseT += dt
  m.shake = Math.max(0, m.shake - dt)
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
    s.y -= (s.number ? 50 : 15) * dt
  }
  m.sparks = m.sparks.filter((s) => s.life > 0)
  for (const inp of inputs) {
    for (const k of Object.keys(inp.buf)) inp.buf[k] = Math.max(0, inp.buf[k] - dt)
  }

  if (m.phase === 'intro') {
    if (m.phaseT > 1.2) m.banner = 'FIGHT!'
    if (m.phaseT > 1.8) {
      m.phase = 'fight'
      m.phaseT = 0
      m.banner = null
    }
  } else if (m.phase === 'fight') {
    m.timer = Math.max(0, m.timer - dt)
    const koed = p0.hp <= 0 || p1.hp <= 0
    if (koed || m.timer <= 0) {
      m.phase = 'ko'
      m.phaseT = 0
      m.banner = koed ? 'K.O.!' : 'TIME!'
      m.roundWinner = p0.hp === p1.hp ? null : p0.hp > p1.hp ? 0 : 1
      m.projectiles = []
    }
  } else if (m.phase === 'ko') {
    if (m.phaseT > 1.4 && m.banner !== null) {
      const w = m.roundWinner
      m.banner = w === null ? 'DRAW' : `${m.fighters[w].def.name.toUpperCase()} WINS`
    }
    if (m.phaseT > 3) {
      if (m.roundWinner !== null) m.wins[m.roundWinner] += 1
      const champ = m.wins.findIndex((w) => w >= WINS_NEEDED)
      if (champ !== -1) {
        m.phase = 'over'
        m.matchWinner = champ
        m.banner = null
      } else {
        m.round += 1
        resetRound(m)
      }
    }
  }
}
