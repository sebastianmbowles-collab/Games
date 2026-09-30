// The bosses and the things they throw.
// Hazard kinds: 'deadly' (touch = out), 'standkill' (landing on top = out),
// 'platform' (landing on top is safe, bumping the side = out), 'slip' (slippery floor), 'none'.

import { SPR, drawSprite } from './sprites'
import { GROUND_Y, TILE, VH } from './levels'
import { sfx } from './sound'

const G = 520
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const inBox = (px, py, b) => px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h

function aim(x0, y0, tx, ty, T) {
  return { vx: (tx - x0) / T, vy: (ty - y0 - 0.5 * G * T * T) / T }
}

// Snap something falling onto the top of the tile it just hit. Returns true when it landed.
function land(obj, g) {
  if (obj.vy <= 0 || !g.solidAt(obj.x + obj.w / 2, obj.y + obj.h)) return false
  obj.y = Math.floor((obj.y + obj.h) / TILE) * TILE - obj.h
  return true
}

class Hazard {
  dead = false
  hits(b) {
    return this.x < b.x + b.w && this.x + this.w > b.x && this.y < b.y + b.h && this.y + this.h > b.y
  }
}

// ---------- Jax: whoopie cushions ----------
class Cushion extends Hazard {
  kind = 'standkill'
  w = 12
  h = 6
  constructor(x, y, vx, vy) {
    super()
    Object.assign(this, { x, y, vx, vy, life: 5.5, active: false })
  }
  update(dt, g) {
    if (!this.active) {
      this.vy += G * dt
      this.x += this.vx * dt
      this.y += this.vy * dt
      if (land(this, g)) this.active = true
      if (this.y > VH) this.dead = true
      return
    }
    this.life -= dt
    if (this.life <= 0) {
      this.dead = true
      sfx.pfft()
      g.puff(this.x + 6, this.y + 3, ['#f890b8', '#f4f4f4'], 8)
    }
  }
  draw(c, cam) {
    const x = Math.round(this.x - cam)
    const y = Math.round(this.y)
    const squish = this.active && this.life < 0.6 ? 2 : 0
    c.fillStyle = '#140c1c'
    c.fillRect(x + 1, y + squish, 10, 6 - squish)
    c.fillRect(x, y + 1 + squish, 12, 4 - squish)
    c.fillStyle = '#f890b8'
    c.fillRect(x + 2, y + 1 + squish, 8, 4 - squish)
    c.fillRect(x + 1, y + 2 + squish, 10, 2 - squish / 2)
    c.fillStyle = '#f4f4f4'
    c.fillRect(x + 3, y + 2 + squish, 2, 1)
    c.fillStyle = '#b8507c'
    c.fillRect(x + 11, y + 4, 2, 2)
  }
}

// ---------- Ragatha: buttons ----------
class Button extends Hazard {
  kind = 'deadly'
  w = 6
  h = 6
  constructor(x, y, vx, vy) {
    super()
    Object.assign(this, { x, y, vx, vy, bounces: 0, life: 4, spin: 0 })
  }
  update(dt, g) {
    this.life -= dt
    this.spin += dt * 12
    if (this.bounces < 3) this.vy += G * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (land(this, g)) {
      this.bounces++
      this.vy = this.bounces < 3 ? -this.vy * 0.5 : 0
      this.vx *= 0.8
    }
    if (this.life <= 0 || this.y > VH || this.x < g.lv.arenaX - 10) this.dead = true
  }
  draw(c, cam) {
    const x = Math.round(this.x - cam)
    const y = Math.round(this.y)
    c.fillStyle = '#140c1c'
    c.fillRect(x + 1, y, 4, 6)
    c.fillRect(x, y + 1, 6, 4)
    c.fillStyle = '#68d8f8'
    c.fillRect(x + 1, y + 1, 4, 4)
    c.fillStyle = '#140c1c'
    const o = Math.floor(this.spin) % 2
    c.fillRect(x + 2, y + 2 + o, 1, 1)
    c.fillRect(x + 3, y + 3 - o, 1, 1)
  }
}

// ---------- Gangle: long red ribbons ----------
class Ribbon extends Hazard {
  kind = 'deadly'
  constructor(x0, x1, y, h) {
    super()
    Object.assign(this, { x0, x1, y, h, t: 0 })
  }
  get phase() {
    if (this.t < 1) return 'warn'
    if (this.t < 1.35) return 'grow'
    if (this.t < 3) return 'stay'
    if (this.t < 3.3) return 'shrink'
    return 'done'
  }
  get left() {
    const len = this.x1 - this.x0
    if (this.phase === 'grow') return this.x1 - len * ((this.t - 1) / 0.35)
    if (this.phase === 'shrink') return this.x0 + len * ((this.t - 3) / 0.3)
    return this.x0
  }
  update(dt) {
    this.t += dt
    if (this.phase === 'done') this.dead = true
  }
  hits(b) {
    if (this.phase === 'warn') return false
    const l = this.left
    return l < b.x + b.w && this.x1 > b.x && this.y < b.y + b.h && this.y + this.h > b.y
  }
  draw(c, cam, t) {
    if (this.phase === 'warn') {
      if (Math.floor(t * 10) % 2) return
      c.fillStyle = '#d82838'
      for (let x = this.x0; x < this.x1; x += 6) {
        c.fillRect(Math.round(x - cam), this.y, 3, 1)
        c.fillRect(Math.round(x - cam), this.y + this.h - 1, 3, 1)
      }
      return
    }
    const l = Math.round(this.left - cam)
    const r = Math.round(this.x1 - cam)
    c.fillStyle = '#140c1c'
    c.fillRect(l, this.y - 1, r - l, this.h + 2)
    c.fillStyle = '#d82838'
    c.fillRect(l, this.y, r - l, this.h)
    c.fillStyle = '#f4f4f4'
    for (let x = l; x < r - 2; x += 5) {
      const up = Math.sin(x * 0.4 + t * 12) > 0
      c.fillRect(x, up ? this.y + 1 : this.y + this.h - 3, 2, 2)
    }
  }
}

// ---------- Kinger: pillows ----------
class Pillow extends Hazard {
  kind = 'platform'
  w = 20
  h = 10
  constructor(x, y, vx, vy, slide) {
    super()
    Object.assign(this, { x, y, vx, vy, slide, flying: vy !== 0 })
  }
  update(dt, g) {
    if (this.flying) {
      this.vy += G * dt
      this.y += this.vy * dt
      this.x += this.vx * dt
      if (land(this, g)) {
        this.flying = false
        this.vy = 0
        this.vx = this.slide
      }
    } else {
      this.x += this.vx * dt
      if (!g.solidAt(this.x + this.w / 2, this.y + this.h + 2)) this.flying = true
    }
    if (this.x + this.w < g.lv.arenaX - 4 || this.y > VH) this.dead = true
  }
  draw(c, cam) {
    const x = Math.round(this.x - cam)
    const y = Math.round(this.y)
    c.fillStyle = '#140c1c'
    c.fillRect(x, y + 1, 20, 8)
    c.fillRect(x + 1, y, 18, 10)
    c.fillStyle = '#f4f4f4'
    c.fillRect(x + 1, y + 1, 18, 8)
    c.fillStyle = '#c8b8e0'
    c.fillRect(x + 1, y + 6, 18, 3)
    c.fillRect(x + 5, y + 1, 2, 5)
    c.fillRect(x + 13, y + 1, 2, 5)
    c.fillStyle = '#f8c830'
    c.fillRect(x - 1, y, 2, 2)
    c.fillRect(x + 19, y, 2, 2)
    c.fillRect(x - 1, y + 8, 2, 2)
    c.fillRect(x + 19, y + 8, 2, 2)
  }
}

// ---------- Caine: one giant spinning cane ----------
class Cane extends Hazard {
  kind = 'deadly'
  len = 40
  constructor(cx, cy, speed, homeX) {
    super()
    Object.assign(this, { cx, cy, speed, homeX, angle: 0, back: false })
  }
  update(dt, g) {
    this.angle += dt * 9
    this.cx += (this.back ? 1 : -1) * this.speed * dt
    if (!this.back && this.cx < g.lv.arenaX + 20) {
      this.back = true
      sfx.cane()
    }
    if (this.back && this.cx > this.homeX) this.dead = true
  }
  hits(b) {
    const grow = { x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 }
    for (let k = -4; k <= 4; k++) {
      const d = (k / 4) * (this.len / 2)
      if (inBox(this.cx + Math.cos(this.angle) * d, this.cy + Math.sin(this.angle) * d, grow)) return true
    }
    return false
  }
  draw(c, cam) {
    c.save()
    c.translate(Math.round(this.cx - cam), Math.round(this.cy))
    c.rotate(this.angle)
    c.fillStyle = '#140c1c'
    c.fillRect(-this.len / 2 - 1, -3, this.len + 2, 6)
    for (let x = -this.len / 2; x < this.len / 2; x += 4) {
      c.fillStyle = ((x + this.len / 2) / 4) % 2 ? '#f4f4f4' : '#d82838'
      c.fillRect(x, -2, 4, 4)
    }
    c.fillStyle = '#f8c830'
    c.fillRect(this.len / 2 - 2, -6, 6, 6)
    c.restore()
  }
}

// ---------- Bubble: black slippery sick ----------
class Glob extends Hazard {
  kind = 'none'
  w = 4
  h = 4
  constructor(x, y, vx) {
    super()
    Object.assign(this, { x, y, vx, vy: 0 })
  }
  update(dt, g) {
    this.vy += G * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    if (land(this, g)) {
      this.dead = true
      g.haz.push(new Puddle(this.x - 14, this.y + this.h))
    }
    if (this.y > VH) this.dead = true
  }
  draw(c, cam) {
    const x = Math.round(this.x - cam)
    c.fillStyle = '#140c1c'
    c.fillRect(x, Math.round(this.y), 4, 4)
    c.fillStyle = '#5c4c78'
    c.fillRect(x + 1, Math.round(this.y) + 1, 1, 1)
  }
}

class Puddle extends Hazard {
  kind = 'slip'
  w = 32
  h = 3
  constructor(x, surfaceY) {
    super()
    Object.assign(this, { x, y: surfaceY, life: 7 })
  }
  update(dt) {
    this.life -= dt
    if (this.life <= 0) this.dead = true
  }
  draw(c, cam, t) {
    const x = Math.round(this.x - cam)
    const y = this.y - 2
    const shrink = this.life < 1 ? Math.round((1 - this.life) * 12) : 0
    c.fillStyle = '#140c1c'
    c.fillRect(x + 2 + shrink, y, 28 - shrink * 2, 3)
    c.fillRect(x + shrink, y + 1, 32 - shrink * 2, 2)
    c.fillStyle = '#5c4c78'
    const s = Math.floor(t * 4) % 20
    c.fillRect(x + 6 + s, y + 1, 3, 1)
  }
}

// ---------- The bosses ----------

class Boss {
  maxAttacks = 5
  interval = 1.2
  flying = false
  constructor(g, key, name) {
    this.g = g
    this.spr = SPR[key]
    this.name = name
    this.hp = 3
    this.state = 'intro'
    this.t = 0
    this.count = 0
    this.cool = 1
    this.throwT = 0
    this.x = g.lv.arenaX + 266
    this.y = GROUND_Y - this.h
  }
  get w() {
    return this.spr[0].length * 2
  }
  get h() {
    return this.spr.length * 2
  }
  get speed() {
    return 1 + (3 - this.hp) * 0.3
  }
  get stompable() {
    return this.state === 'tired'
  }
  get harmful() {
    return this.state === 'attack' || this.state === 'winddown'
  }
  box() {
    return { x: this.x + 4, y: this.y + 2, w: this.w - 8, h: this.h - 2 }
  }
  hand() {
    return { x: this.x + 2, y: this.y + this.h * 0.4 }
  }
  set(state) {
    this.state = state
    this.t = 0
  }
  target() {
    const p = this.g.p
    return p.x + p.w / 2
  }
  update(dt) {
    this.t += dt
    this.throwT = Math.max(0, this.throwT - dt)
    if (this.state === 'intro' && this.t > 2) this.set('attack')
    else if (this.state === 'attack') {
      this.cool -= dt
      if (this.cool <= 0) {
        this.attack()
        this.throwT = 0.25
        this.count++
        this.cool = this.interval / this.speed
        if (this.count >= this.maxAttacks) this.set('winddown')
      }
    } else if (this.state === 'winddown' && this.t > 2.2) {
      this.g.clearHazards()
      this.set('tired')
    } else if (this.state === 'tired' && this.t > 4.5) {
      this.count = 0
      this.cool = 0.8
      this.set('attack')
    } else if (this.state === 'hurt' && this.t > 1.2) {
      if (this.hp <= 0) this.set('dead')
      else {
        this.count = 0
        this.cool = 1
        this.set('attack')
      }
    } else if (this.state === 'dead' && this.t > 2) {
      this.g.bossDefeated()
    }
  }
  hit() {
    this.hp--
    this.set('hurt')
    sfx.bossHit()
    this.g.shake = 0.3
    this.g.puff(this.x + this.w / 2, this.y + 8, ['#f8c830', '#f4f4f4'], 14)
  }
  playerRespawned() {
    if (this.state === 'attack' || this.state === 'winddown' || this.state === 'tired') {
      this.count = 0
      this.cool = 1.5
      this.set('attack')
    }
  }
  draw(c, cam, t) {
    const x = this.x - cam
    let y = this.y + (this.throwT > 0 ? 2 : 0)
    let alpha = 1
    if (this.state === 'dead') {
      y += this.t * 20
      alpha = Math.max(0, 1 - this.t / 2)
    }
    const flash = (this.state === 'hurt' || this.state === 'dead') && Math.floor(t * 20) % 2 === 0
    drawSprite(c, this.spr, x, y, { scale: 2, mode: flash ? 'white' : 'normal', alpha })
    if (this.state === 'tired') {
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + k * 2.1
        c.fillStyle = '#f8c830'
        c.fillRect(Math.round(x + this.w / 2 + Math.cos(a) * 12), Math.round(this.y - 5 + Math.sin(a) * 3), 2, 2)
      }
    }
  }
}

class Jax extends Boss {
  maxAttacks = 7
  interval = 1.0
  constructor(g) {
    super(g, 'jax', 'JAX')
  }
  attack() {
    const a = this.g.lv.arenaX
    const h = this.hand()
    const tx = clamp(this.target() + rand(-28, 28), a + 8, a + 250)
    const v = aim(h.x, h.y, tx, GROUND_Y, rand(0.85, 1.15))
    this.g.haz.push(new Cushion(h.x, h.y, v.vx, v.vy))
    sfx.throw()
  }
}

class Ragatha extends Boss {
  maxAttacks = 5
  interval = 1.6
  constructor(g) {
    super(g, 'ragatha', 'RAGATHA')
  }
  attack() {
    const a = this.g.lv.arenaX
    const h = this.hand()
    for (let i = -1; i <= 1; i++) {
      const tx = clamp(this.target() + i * 30 + rand(-10, 10), a + 6, a + 250)
      const v = aim(h.x, h.y, tx, GROUND_Y, rand(0.75, 1.25))
      this.g.haz.push(new Button(h.x, h.y, v.vx, v.vy))
    }
    sfx.throw()
  }
}

class Gangle extends Boss {
  maxAttacks = 5
  interval = 2.7
  constructor(g) {
    super(g, 'gangle', 'GANGLE')
  }
  attack() {
    const a = this.g.lv.arenaX
    const p = this.g.p
    const onPlatform = p.y + p.h < GROUND_Y - 10
    if (onPlatform || Math.random() < 0.35) {
      // High ribbon across the whole room: stay on the floor and don't jump!
      this.g.haz.push(new Ribbon(a, this.x - 2, 98, 8))
    } else {
      // Floor ribbon under Pomni: hop up onto a platform!
      const x0 = clamp(this.target() - rand(60, 90), a, a + 110)
      this.g.haz.push(new Ribbon(x0, Math.min(x0 + rand(140, 170), this.x - 2), GROUND_Y - 7, 7))
    }
    sfx.warn()
  }
}

class Kinger extends Boss {
  maxAttacks = 7
  interval = 1.4
  constructor(g) {
    super(g, 'kinger', 'KINGER')
  }
  attack() {
    const h = this.hand()
    const slide = -rand(55, 85) * this.speed
    if (Math.random() < 0.7) {
      this.g.haz.push(new Pillow(this.x - 22, GROUND_Y - 10, slide, 0, slide))
    } else {
      const v = aim(h.x - 10, h.y, clamp(this.target(), this.g.lv.arenaX + 20, this.x - 40), GROUND_Y, 1)
      this.g.haz.push(new Pillow(h.x - 10, h.y, v.vx, v.vy, -40))
    }
    sfx.throw()
  }
}

class Caine extends Boss {
  maxAttacks = 4
  interval = 2.6
  flying = true
  constructor(g) {
    super(g, 'caine', 'CAINE & BUBBLE')
    this.y = 30
    this.pending = null
    this.bub = { x: g.lv.arenaX + 150, y: 18, t: 0, cool: 2 }
  }
  update(dt) {
    super.update(dt)
    const ground = GROUND_Y - this.h
    const want = this.state === 'tired' || this.state === 'hurt' || this.state === 'dead' ? ground : 30 + Math.sin(this.g.t * 2) * 6
    if (this.state !== 'dead') this.y += (want - this.y) * Math.min(1, dt * 4)

    if (this.pending) {
      this.pending.t -= dt
      if (this.pending.t <= 0) {
        this.g.haz.push(new Cane(this.x, this.pending.y, 150 * this.speed, this.x + 10))
        sfx.cane()
        this.pending = null
      }
    }

    // Bubble floats around the top of the tent and is sick everywhere.
    const b = this.bub
    b.t += dt
    b.x = this.g.lv.arenaX + 130 + Math.sin(b.t * 0.7) * 105
    b.y = 16 + Math.sin(b.t * 2.3) * 4
    if (this.state !== 'dead' && this.state !== 'intro') {
      b.cool -= dt
      if (b.cool <= 0) {
        b.cool = rand(2.2, 3.2)
        sfx.vomit()
        for (let i = 0; i < 3; i++) this.g.haz.push(new Glob(b.x + 12, b.y + 26, rand(-40, 40)))
      }
    }
  }
  attack() {
    // Low cane: get up on a platform (or jump it). High cane: stay on the floor.
    const low = Math.random() < 0.5
    this.pending = { y: low ? GROUND_Y - 12 : 96, t: 0.8 }
    sfx.warn()
  }
  playerRespawned() {
    this.pending = null
    super.playerRespawned()
  }
  draw(c, cam, t) {
    if (this.pending && Math.floor(t * 10) % 2) {
      c.fillStyle = '#f8c830'
      for (let x = this.g.lv.arenaX; x < this.x; x += 8) c.fillRect(Math.round(x - cam), this.pending.y, 4, 1)
    }
    super.draw(c, cam, t)
    if (this.state !== 'dead') drawSprite(c, SPR.bubble, this.bub.x - cam, this.bub.y, { scale: 2 })
  }
}

export function makeBoss(key, g) {
  const B = { jax: Jax, ragatha: Ragatha, gangle: Gangle, kinger: Kinger, caine: Caine }[key]
  return new B(g)
}
