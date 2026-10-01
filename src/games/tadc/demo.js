// The demo pilot: Pomni plays by herself, so you can watch how to survive a boss.
// Every few frames she tries a few moves in her head (running the hazards forward a couple of
// seconds) and picks the one that keeps her safe the longest. It's the same robot that tests the game.

const PLANS = [
  { l: 0, r: 0, j: 0 },
  { l: 1, r: 0, j: 0 },
  { l: 0, r: 1, j: 0 },
  { l: 0, r: 0, j: 1 },
  { l: 1, r: 0, j: 1 },
  { l: 0, r: 1, j: 1 },
  { l: 1, r: 0, j: 2 },
  { l: 0, r: 1, j: 2 },
  { l: 0, r: 0, j: 2 },
]
const DT = 1 / 120

// A copy of a hazard (or Pomni) that can be moved forward without touching the real one.
function clone(o) {
  const c = Object.create(Object.getPrototypeOf(o))
  for (const k of Object.keys(o)) {
    const v = o[k]
    c[k] = v && typeof v === 'object' && !Array.isArray(v) && k !== 'g' ? { ...v } : v
  }
  return c
}

export class Pilot {
  constructor(g) {
    this.g = g
    this.plan = PLANS[0]
    this.hold = 0
    this.steps = 0
    this.jumped = false
    this.every = 3
    // Gangle's ribbons are slow, so look further ahead for them.
    this.horizon = g.boss && g.boss.key === 'gangle' ? 3 : 2.2
  }

  // How long does Pomni stay safe if she does `plan` (then `follow`)?
  survive(plan, follow) {
    const g = this.g
    const haz = g.haz.map(clone)
    const p = clone(g.pomni)
    const fake = { platforms: g.platforms, haz, puff() {}, flash() {}, shake: 0, pomni: p }
    const world = g.pomniWorld()
    for (let t = 0; t < this.horizon; t += DT) {
      const cur = t < 0.25 || !follow ? plan : follow
      const jump = cur.j === 2 ? true : cur.j === 1 ? t < 0.12 : false
      p.update(DT, { left: !!cur.l, right: !!cur.r, jump, jumpPressed: !!cur.j && t < DT * 1.5 }, world)
      for (const h of haz) h.update(DT, fake)
      for (let i = haz.length - 1; i >= 0; i--) if (haz[i].dead) haz.splice(i, 1)
      const pb = { x: p.x - 1, y: p.y - 1, w: p.w + 2, h: p.h + 2 }
      world.slip = false
      for (const h of haz) {
        if (h.kind === 'deadly' || h.kind === 'mine') {
          if (h.hits(pb)) return { t, x: p.x }
        } else if (h.kind === 'platform') {
          const landing = p.vy >= 0 && p.prevBottom <= h.y + 3 && p.y + p.h >= h.y - 1 && p.x + p.w > h.x + 1 && p.x < h.x + h.w - 1
          if (landing) {
            if (h.bouncy) {
              p.y = h.y - p.h - 1
              p.vy = -420
              p.onGround = false
            } else p.standOn(h.y, h.dx)
          } else if (h.hits(pb)) return { t, x: p.x }
        } else if (h.kind === 'slip' && p.onGround && h.covers(pb)) world.slip = true
      }
    }
    return { t: this.horizon, x: p.x }
  }

  think() {
    const g = this.g
    const home = g.boss.key === 'caine' ? 150 : 100
    let best = PLANS[0]
    let bestScore = -1e9
    for (const pl of PLANS) {
      let r = this.survive(pl, null)
      if (r.t < this.horizon) {
        for (const f of PLANS) {
          const r2 = this.survive(pl, f)
          if (r2.t > r.t) r = r2
          if (r.t >= this.horizon) break
        }
      }
      // Stay safe first; then prefer the middle of the stage, standing still, and not jumping for no reason.
      const score = r.t * 10 - Math.abs(r.x - home) * 0.01 - (pl.j ? 0.05 : 0) - (pl === PLANS[0] ? 0 : 0.02)
      if (score > bestScore) {
        bestScore = score
        best = pl
      }
    }
    if (best.j && !(this.plan.j && g.pomni.vy < 0)) this.hold = best.j === 2 ? 0.5 : 0.12
    this.plan = best
  }

  // The buttons Pomni "presses" this frame.
  input(dt) {
    if (this.steps++ % this.every === 0) {
      // On a slow computer, think a little less often so the game stays smooth.
      const t0 = performance.now()
      this.think()
      this.every = performance.now() - t0 > 6 ? 8 : 3
    }
    const jump = this.hold > 0
    let jumpPressed = false
    if (this.plan.j && this.g.pomni.onGround && jump && !this.jumped) {
      jumpPressed = true
      this.jumped = true
    }
    if (!jump) this.jumped = false
    this.hold -= dt
    return { left: !!this.plan.l, right: !!this.plan.r, jump, jumpPressed }
  }
}
