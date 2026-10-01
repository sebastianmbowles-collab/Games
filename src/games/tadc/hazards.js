// Everything the bosses throw at Pomni.
// kind: 'deadly' (touch = game over), 'mine' (deadly once it has landed), 'platform' (safe on top,
// deadly from the side), 'slip' (slippery floor) or 'none'.

import { SPR, drawSprite } from './sprites'
import { VW, VH, GROUND_Y, INK, overlap } from './consts'
import { sfx } from './sound'

const G = 520

// Where does something falling land? Returns the top of the floor or a platform, or null.
function landY(g, obj, prevBottom) {
  const b = obj.y + obj.h
  const cx = obj.x + obj.w / 2
  for (const p of g.platforms) if (prevBottom <= p.y + 0.5 && b >= p.y && cx > p.x && cx < p.x + p.w) return p.y
  if (b >= GROUND_Y) return GROUND_Y
  return null
}

// Where will a thrown thing land? Runs its flight forward (same maths as the real thing).
function predictLanding(g, o) {
  const p = { x: o.x, y: o.y, w: o.w, h: o.h }
  let vy = o.vy
  for (let i = 0; i < 600; i++) {
    const prev = p.y + p.h
    vy += G / 120
    p.x += o.vx / 120
    p.y += vy / 120
    const top = vy > 0 ? landY(g, p, prev) : null
    if (top !== null) return { x: p.x, y: top }
    if (p.y > VH) return null
  }
  return null
}

// A blinking shadow where it's going to land, so you can get out of the way.
function drawLandingMark(c, t, land, w, color) {
  if (!land || Math.floor(t * 8) % 2) return
  c.fillStyle = color
  c.fillRect(Math.round(land.x + 2), Math.round(land.y - 2), w - 4, 2)
  c.fillRect(Math.round(land.x), Math.round(land.y - 1), w, 1)
}

const offscreen = (o) => o.x < -60 || o.x > VW + 60 || o.y > VH + 30

// ---------- Jax: whoopie cushions (little land mines) ----------
export class Cushion {
  kind = 'mine'
  killer = 'cushion'
  w = 14
  h = 7
  dead = false
  constructor(x, y, vx, vy, life) {
    Object.assign(this, { x, y, vx, vy, life, state: 'fly', spin: 0, t: 0, born: performance.now() })
  }
  get active() {
    return this.state === 'rest'
  }
  update(dt, g) {
    this.t += dt
    if (this.state === 'fly' && this.land === undefined) this.land = predictLanding(g, this)
    if (this.state === 'fly') {
      const prev = this.y + this.h
      this.vy += G * dt
      this.x += this.vx * dt
      this.y += this.vy * dt
      this.spin += dt * 10
      const top = this.vy > 0 ? landY(g, this, prev) : null
      if (top !== null) {
        this.y = top - this.h
        this.state = 'rest'
        this.t = 0
        sfx.plop()
        g.puff(this.x + 7, this.y + 6, ['#f890b8', '#f4f4f4'], 4)
      }
      if (offscreen(this)) this.dead = true
    } else if (this.state === 'rest') {
      this.life -= dt
      if (this.life <= 0) this.deflate()
    } else if (this.state === 'deflate' && this.t > 0.35) {
      this.dead = true
    }
  }
  deflate() {
    if (this.state === 'deflate') return
    this.state = 'deflate'
    this.t = 0
    sfx.shortPfft()
  }
  hits(b) {
    return this.active && overlap(b, { x: this.x + 2, y: this.y + 1, w: this.w - 4, h: this.h - 1 })
  }
  draw(c, t) {
    if (this.state === 'fly') {
      drawLandingMark(c, t, this.land, this.w, 'rgba(224, 60, 156, 0.7)')
      drawSprite(c, SPR.cushion, this.x - 1, this.y - 1, { rot: this.spin })
    } else if (this.state === 'rest') {
      if (this.life < 1.2 && Math.floor(t * 10) % 2) return
      const wob = this.t < 0.3 ? 1 - Math.abs(Math.sin(this.t * 20)) * 0.25 : 1
      drawSprite(c, SPR.cushion, this.x - 1, this.y - 1 + (1 - wob) * 9, { sy: wob })
    } else {
      drawSprite(c, SPR.cushionFlat, this.x - 1, this.y + 3, { alpha: 1 - this.t / 0.35 })
    }
  }
}

// ---------- Ragatha: buttons ----------
// mode: 'arc' (thrown, bounces), 'straight' (flies flat), 'drop' (falls from the sky after a warning),
// 'spread' (fans out), 'roll' (rolls along the floor).
export class Button {
  kind = 'deadly'
  killer = 'button'
  w = 7
  h = 7
  dead = false
  constructor(o) {
    Object.assign(this, { vx: 0, vy: 0, grav: 0, bounces: 0, warn: 0, life: 6, spin: 0, resting: false }, o)
    if (this.mode === 'drop') {
      this.y = -10
      this.grav = 600
    }
  }
  get active() {
    return this.warn <= 0
  }
  update(dt, g) {
    this.spin += dt * (8 + Math.abs(this.vx) * 0.05)
    if (this.warn > 0) {
      this.warn -= dt
      if (this.warn <= 0) sfx.ping()
      return
    }
    this.life -= dt
    const prev = this.y + this.h
    this.vy += this.grav * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (this.grav && this.vy > 0) {
      const top = landY(g, this, prev)
      if (top !== null) {
        this.y = top - this.h
        if (this.bounces > 0) {
          this.bounces--
          this.vy = -this.vy * 0.45
          this.vx *= 0.85
          sfx.ping()
        } else {
          this.vy = 0
          this.grav = 0
          this.resting = this.mode === 'drop'
          if (this.resting) this.vx = 0
        }
      }
    }
    // Buttons resting on a platform roll off its edge.
    if (!this.grav && this.mode !== 'straight' && this.y + this.h < GROUND_Y - 1 && !g.platforms.some((p) => this.x + 3 > p.x && this.x + 3 < p.x + p.w && Math.abs(p.y - this.y - this.h) < 2)) this.grav = 600
    if (this.life <= 0 || offscreen(this)) {
      this.dead = true
      if (this.life <= 0) g.puff(this.x + 3, this.y + 3, ['#68d8f8', '#2c5ce0'], 4)
    }
  }
  hits(b) {
    return this.active && overlap(b, { x: this.x + 1, y: this.y + 1, w: 5, h: 5 })
  }
  draw(c, t) {
    if (this.warn > 0) {
      // A blinking marker at the top of the screen and a shadow on the floor.
      if (Math.floor(t * 12) % 2) {
        c.fillStyle = '#68d8f8'
        c.fillRect(Math.round(this.x + 1), 2, 5, 2)
        c.fillRect(Math.round(this.x + 2), 4, 3, 2)
        c.fillRect(Math.round(this.x + 3), 6, 1, 2)
      }
      c.fillStyle = 'rgba(20, 12, 28, 0.5)'
      c.fillRect(Math.round(this.x), GROUND_Y - 1, 7, 2)
      return
    }
    if (this.resting && this.life < 1 && Math.floor(t * 10) % 2) return
    drawSprite(c, Math.floor(this.spin) % 2 ? SPR.button1 : SPR.button2, this.x - 1, this.y - 1)
  }
}

// ---------- Gangle: giant red ribbons ----------
// A rectangle of ribbon. It warns first (flashing outline), then unrolls, stays, and fades away.
// A ribbon can have a gap (for ribbon walls), can move, and can run a little script each frame.
export class Ribbon {
  kind = 'deadly'
  killer = 'ribbon'
  dead = false
  constructor(o) {
    Object.assign(this, { vx: 0, vy: 0, warn: 1, life: 2.2, t: 0, gap: null, vertical: false, script: null }, o)
  }
  get phase() {
    if (this.t < this.warn) return 'warn'
    if (this.t < this.warn + 0.25) return 'grow'
    if (this.t < this.warn + 0.25 + this.life) return 'on'
    if (this.t < this.warn + 0.25 + this.life + 0.3) return 'fade'
    return 'done'
  }
  update(dt, g) {
    this.t += dt
    if (this.phase === 'warn' && Math.floor((this.t - dt) * 4) !== Math.floor(this.t * 4)) sfx.warn()
    if (this.phase !== 'warn') {
      this.x += this.vx * dt
      this.y += this.vy * dt
    }
    if (this.script) this.script(this, dt, g)
    if (this.phase === 'done' || this.x > VW + 40 || this.x + this.w < -40) this.dead = true
  }
  parts() {
    if (!this.gap) return [{ x: this.x, y: this.y, w: this.w, h: this.h }]
    const g = this.gap
    return [
      { x: this.x, y: this.y, w: this.w, h: Math.max(0, g.y - this.y) },
      { x: this.x, y: g.y + g.h, w: this.w, h: Math.max(0, this.y + this.h - g.y - g.h) },
    ]
  }
  hits(b) {
    const ph = this.phase
    if (ph !== 'on' && !(ph === 'grow' && this.t > this.warn + 0.12)) return false
    const shrink = { x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 }
    return this.parts().some((p) => p.h > 0 && overlap(shrink, p))
  }
  draw(c, t) {
    const ph = this.phase
    if (ph === 'warn') {
      if (Math.floor(t * 10) % 2) return
      c.fillStyle = 'rgba(216, 40, 56, 0.25)'
      for (const p of this.parts()) {
        c.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h))
        c.fillStyle = '#d82838'
        for (let x = p.x; x < p.x + p.w; x += 6) {
          c.fillRect(Math.round(x), Math.round(p.y), 3, 1)
          c.fillRect(Math.round(x), Math.round(p.y + p.h - 1), 3, 1)
        }
        for (let y = p.y; y < p.y + p.h; y += 6) {
          c.fillRect(Math.round(p.x), Math.round(y), 1, 3)
          c.fillRect(Math.round(p.x + p.w - 1), Math.round(y), 1, 3)
        }
        c.fillStyle = 'rgba(216, 40, 56, 0.25)'
      }
      return
    }
    let k = 1
    if (ph === 'grow') k = (this.t - this.warn) / 0.25
    const alpha = ph === 'fade' ? 1 - (this.t - this.warn - 0.25 - this.life) / 0.3 : 1
    c.save()
    c.globalAlpha = alpha
    for (const p of this.parts()) {
      if (p.h <= 0) continue
      const w = this.vertical ? p.w : p.w * k
      const h = this.vertical ? p.h * k : p.h
      const x = Math.round(this.vertical ? p.x : p.x + p.w - w)
      const y = Math.round(p.y)
      c.fillStyle = INK
      c.fillRect(x - 1, y - 1, Math.round(w) + 2, Math.round(h) + 2)
      c.fillStyle = '#d82838'
      c.fillRect(x, y, Math.round(w), Math.round(h))
      c.fillStyle = '#a01828'
      // Folds and a wavy white stripe so it reads as ribbon, not a wall.
      if (this.vertical) {
        for (let yy = 0; yy < h; yy += 6) c.fillRect(x, y + yy, Math.round(w), 1)
        c.fillStyle = '#f4f4f4'
        for (let yy = 0; yy < h - 2; yy += 4) c.fillRect(x + Math.round(w / 2 + Math.sin((y + yy) * 0.3 + t * 8) * (w / 3)), y + yy, 2, 2)
      } else {
        for (let xx = 0; xx < w; xx += 6) c.fillRect(x + xx, y, 1, Math.round(h))
        c.fillStyle = '#f4f4f4'
        for (let xx = 0; xx < w - 2; xx += 4) c.fillRect(x + xx, y + Math.round(h / 2 + Math.sin((x + xx) * 0.3 + t * 8) * (h / 3)) - 1, 2, 2)
      }
    }
    c.restore()
  }
}

// ---------- Kinger: pillows ----------
// Landing on top is safe (bouncy ones launch you up). Running into the side is not.
export class Pillow {
  kind = 'platform'
  killer = 'pillow'
  w = 20
  h = 9
  dead = false
  constructor(o) {
    Object.assign(this, { vx: -60, vy: 0, mode: 'slide', bouncy: false, slide: -50, t: 0, squish: 0 }, o)
    this.baseY = this.y
  }
  update(dt, g) {
    this.t += dt
    this.squish = Math.max(0, this.squish - dt)
    const prev = this.y + this.h
    if (this.mode === 'arc' && this.land === undefined) this.land = predictLanding(g, this)
    if (this.mode === 'arc' || this.mode === 'fall') {
      this.vy += G * dt
      this.x += this.vx * dt
      this.y += this.vy * dt
      const top = this.vy > 0 ? landY(g, this, prev) : null
      if (top !== null) {
        this.y = top - this.h
        this.vy = 0
        this.vx = this.slide
        this.mode = 'slide'
        sfx.thump()
      }
    } else if (this.mode === 'float') {
      this.x += this.vx * dt
      this.y = this.baseY + Math.sin(this.t * 2.2) * 3
    } else {
      this.x += this.vx * dt
      const onSomething = this.y + this.h >= GROUND_Y - 0.5 || g.platforms.some((p) => this.x + 10 > p.x && this.x + 10 < p.x + p.w && Math.abs(p.y - this.y - this.h) < 1)
      if (!onSomething) this.mode = 'fall'
    }
    if (offscreen(this)) this.dead = true
  }
  get dx() {
    return this.mode === 'arc' || this.mode === 'fall' ? 0 : this.vx
  }
  hits(b) {
    return overlap({ x: b.x + 1, y: b.y + 2, w: b.w - 2, h: b.h - 2 }, { x: this.x + 1, y: this.y + 1, w: this.w - 2, h: this.h - 1 })
  }
  draw(c, t) {
    if (this.mode === 'arc') drawLandingMark(c, t, this.land, this.w, 'rgba(200, 184, 224, 0.8)')
    const sq = this.squish > 0 ? 0.7 : 1
    drawSprite(c, this.bouncy ? SPR.pillowBouncy : SPR.pillow, this.x - 1, this.y - 1 + (1 - sq) * 11, { sy: sq })
    if (this.bouncy) {
      c.fillStyle = '#f4f4f4'
      c.fillRect(Math.round(this.x + 8), Math.round(this.y + 3 + (1 - sq) * 11), 4, 1)
      c.fillRect(Math.round(this.x + 9), Math.round(this.y + 2 + (1 - sq) * 11), 2, 1)
    }
  }
}

// ---------- Caine: one absurdly huge cane ----------
// A long striped stick with a hook. It warns first, then a script moves it around.
export class Cane {
  kind = 'deadly'
  killer = 'cane'
  dead = false
  constructor(o) {
    Object.assign(this, { thick: 8, angle: 0, warn: 0.8, t: 0, spin: 0, vx: 0, vy: 0, script: null, warnBox: null, whooshed: false, hook: true }, o)
  }
  get active() {
    return this.t >= this.warn
  }
  update(dt, g) {
    this.t += dt
    if (!this.active) return
    if (!this.whooshed) {
      this.whooshed = true
      sfx.whoosh()
      g.shake = Math.max(g.shake, 0.25)
    }
    this.cx += this.vx * dt
    this.cy += this.vy * dt
    this.angle += this.spin * dt
    if (this.script) this.script(this, dt, g)
    if (this.cx < -this.len - 40 || this.cx > VW + this.len + 40 || this.cy > VH + this.len || this.cy < -this.len - 60) this.dead = true
  }
  hits(b) {
    if (!this.active) return false
    const r = this.thick / 2 - 1
    const n = Math.ceil(this.len / 4)
    for (let i = 0; i <= n; i++) {
      const d = -this.len / 2 + (i / n) * this.len
      const px = this.cx + Math.cos(this.angle) * d
      const py = this.cy + Math.sin(this.angle) * d
      const nx = Math.max(b.x, Math.min(px, b.x + b.w))
      const ny = Math.max(b.y, Math.min(py, b.y + b.h))
      if ((px - nx) ** 2 + (py - ny) ** 2 < r * r) return true
    }
    return false
  }
  draw(c, t) {
    if (!this.active) {
      if (Math.floor(t * 10) % 2) return
      c.save()
      c.translate(Math.round(this.cx), Math.round(this.cy))
      c.rotate(this.angle)
      c.fillStyle = 'rgba(248, 200, 48, 0.35)'
      c.fillRect(-this.len / 2, -this.thick / 2, this.len, this.thick)
      c.restore()
      if (this.warnBox) {
        const w = this.warnBox
        c.fillStyle = 'rgba(248, 200, 48, 0.2)'
        c.fillRect(w.x, w.y, w.w, w.h)
      }
      return
    }
    c.save()
    c.translate(Math.round(this.cx), Math.round(this.cy))
    c.rotate(this.angle)
    const L = this.len
    const T = this.thick
    c.fillStyle = INK
    c.fillRect(-L / 2 - 1, -T / 2 - 1, L + 2, T + 2)
    for (let x = -L / 2; x < L / 2; x += 6) {
      c.fillStyle = Math.floor((x + L / 2) / 6) % 2 ? '#f4f4f4' : '#d82838'
      c.fillRect(x, -T / 2, Math.min(6, L / 2 - x), T)
    }
    c.fillStyle = 'rgba(255, 255, 255, 0.35)'
    c.fillRect(-L / 2, -T / 2, L, 2)
    // The hook at one end.
    if (!this.hook) {
      c.restore()
      return
    }
    c.fillStyle = INK
    c.fillRect(L / 2 - 2, -T / 2 - 9, T + 3, T + 10)
    c.fillStyle = '#d82838'
    c.fillRect(L / 2 - 1, -T / 2 - 8, T + 1, 4)
    c.fillStyle = '#f4f4f4'
    c.fillRect(L / 2 + T - 4, -T / 2 - 8, 3, 9)
    c.fillStyle = '#f8c830'
    c.fillRect(-L / 2 - 2, -T / 2, 3, T)
    c.restore()
  }
}

// ---------- Bubble: black slippery sick ----------
export class Glob {
  kind = 'none'
  w = 5
  h = 5
  dead = false
  constructor(x, y, vx, maxW, life) {
    Object.assign(this, { x, y, vx, vy: -40, maxW, life })
  }
  update(dt, g) {
    const prev = this.y + this.h
    this.vy += G * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    const top = this.vy > 0 ? landY(g, this, prev) : null
    if (top !== null) {
      this.dead = true
      sfx.splat()
      g.haz.push(new Puddle(this.x + 2, top, this.maxW, this.life))
      g.puff(this.x + 2, top - 2, ['#140c1c', '#5c4c78'], 4)
    }
    if (offscreen(this)) this.dead = true
  }
  draw(c) {
    c.fillStyle = INK
    c.fillRect(Math.round(this.x), Math.round(this.y), 5, 5)
    c.fillStyle = '#5c4c78'
    c.fillRect(Math.round(this.x) + 1, Math.round(this.y) + 1, 1, 1)
  }
}

export class Puddle {
  kind = 'slip'
  dead = false
  h = 3
  constructor(cx, surface, maxW, life) {
    Object.assign(this, { cx, y: surface, maxW, life, t: 0 })
  }
  get w() {
    return Math.min(this.maxW, 8 + this.t * 26)
  }
  get x() {
    return this.cx - this.w / 2
  }
  update(dt) {
    this.t += dt
    this.life -= dt
    if (this.life <= 0) this.dead = true
  }
  covers(b) {
    return Math.abs(b.y + b.h - this.y) < 2 && b.x + b.w > this.x + 2 && b.x < this.x + this.w - 2
  }
  draw(c, t) {
    const fade = this.life < 1 ? this.life : 1
    const w = Math.round(this.w * fade)
    const x = Math.round(this.cx - w / 2)
    const y = this.y
    // A glossy black puddle with a purple rim, so it shows up on the checkered floor.
    c.fillStyle = '#5c4c78'
    c.fillRect(x + 1, y - 3, Math.max(0, w - 2), 4)
    c.fillStyle = INK
    c.fillRect(x + 2, y - 2, Math.max(0, w - 4), 3)
    c.fillRect(x, y - 1, w, 2)
    c.fillStyle = '#c8b8e0'
    const s = Math.floor(t * 6) % Math.max(1, w - 8)
    c.fillRect(x + 4 + s, y - 2, 3, 1)
    c.fillRect(x + w - 6, y - 1, 1, 1)
  }
}

// ---------- Zooble: spare parts ----------
// A body part that flies, bounces along the floor, drops from the sky or comes back like a boomerang.
// bounceV: how hard it bounces off the floor (0 = it stops). warnAt: where to show a warning first.
export class Part {
  kind = 'deadly'
  killer = 'part'
  w = 8
  h = 8
  dead = false
  constructor(o) {
    Object.assign(this, { vx: 0, vy: 0, grav: G, bounceV: 0, warn: 0, warnAt: null, life: 9, spin: 0, spinV: 8, look: 'Glove', script: null, landed: false }, o)
  }
  get active() {
    return this.warn <= 0
  }
  update(dt, g) {
    if (this.warn > 0) {
      this.warn -= dt
      if (this.warn <= 0) sfx.ping()
      return
    }
    this.spin += dt * this.spinV
    this.life -= dt
    this.vy += this.grav * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (this.grav && this.vy > 0 && this.y + this.h >= GROUND_Y) {
      this.y = GROUND_Y - this.h
      if (this.bounceV) {
        this.vy = -this.bounceV
        sfx.step()
      } else {
        this.vy = 0
        this.grav = 0
        if (!this.landed) {
          this.landed = true
          this.vx = 0
          this.life = Math.min(this.life, 0.5)
          sfx.plop()
        }
      }
    }
    if (this.script) this.script(this, dt, g)
    if (this.life <= 0 || offscreen(this)) {
      this.dead = true
      if (this.life <= 0) g.puff(this.x + 4, this.y + 4, ['#f8c830', '#e03c9c', '#68d8f8'], 4)
    }
  }
  hits(b) {
    return this.active && overlap(b, { x: this.x + 1, y: this.y + 1, w: this.w - 2, h: this.h - 2 })
  }
  draw(c, t) {
    if (this.warn > 0) {
      const w = this.warnAt
      if (!w || !(Math.floor(t * 12) % 2)) return
      c.fillStyle = '#e03c9c'
      if (w.side === 'top') {
        // An arrow pointing down at the top, and a shadow on the floor.
        c.fillRect(Math.round(this.x + 1), 2, 6, 2)
        c.fillRect(Math.round(this.x + 2), 4, 4, 2)
        c.fillRect(Math.round(this.x + 3), 6, 2, 2)
        c.fillStyle = 'rgba(20, 12, 28, 0.5)'
        c.fillRect(Math.round(this.x), GROUND_Y - 1, 8, 2)
      } else {
        // An arrow on the left edge, pointing right, at the height the part will fly.
        const y = Math.round(this.y + 4)
        c.fillRect(2, y - 3, 2, 7)
        c.fillRect(4, y - 2, 2, 5)
        c.fillRect(6, y - 1, 2, 3)
      }
      return
    }
    if (this.landed && Math.floor(t * 12) % 2) return
    drawSprite(c, SPR['part' + this.look], this.x - 1, this.y - 1, { rot: this.spin })
  }
}
