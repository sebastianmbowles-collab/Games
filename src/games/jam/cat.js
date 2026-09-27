// The pet cat. It naps on the window sill, but every now and then it sneaks over to the shelf
// to steal a jar of jam. Tap it before it gets back to the sill to shoo it away!

import { INK, fillStroke, circle, drawFace, rrect } from './fruits'
import { sfx } from './sound'

const SILL = { x: 140, y: 224 }
const PLANK_X = 648
const SCALE = 1.05
const FUR = '#f5a14a'
const STRIPE = '#c96f28'
const TAU = Math.PI * 2

const rand = (a, b) => a + Math.random() * (b - a)
const lerp = (a, b, t) => a + (b - a) * t

// States where the cat is up to mischief and can still be shooed.
const SNEAKY = ['wake', 'jumpTo', 'walk', 'sniff', 'grab', 'walkBack', 'jumpBack']

export class Cat {
  constructor(kitchen) {
    this.k = kitchen
    this.x = SILL.x
    this.y = SILL.y
    this.dir = 1
    this.state = 'sleep'
    this.t = 0
    this.nap = rand(12, 18)
    this.carry = null
    this.target = null
    this.walkPhase = 0
    this.jump = null
    this.purr = 0
    this.stepT = 0
  }

  get sneaky() {
    return SNEAKY.includes(this.state)
  }

  set(state) {
    this.state = state
    this.t = 0
  }

  hit(p) {
    const w = this.state === 'sleep' ? 40 : 36
    return Math.abs(p.x - this.x) < w && p.y > this.y - 62 && p.y < this.y + 8
  }

  leap(x, y, dur, next) {
    this.jump = { x0: this.x, y0: this.y, x1: x, y1: y, dur, h: 70 + Math.abs(y - this.y) * 0.4 }
    this.dir = x > this.x ? 1 : -1
    this.set(next)
  }

  tap() {
    const k = this.k
    if (this.sneaky) {
      this.shoo()
    } else if (this.state === 'sleep' || this.state === 'settle') {
      this.purr = 1.5
      sfx.purr()
      k.float('Purrr...', this.x, this.y - 70, '#ffd0e0', 18)
      k.burst(this.x + 20, this.y - 40, 4, { speed: 70, up: 60, r: 8, color: '#ff6b8a', kind: 'heart', g: -30, life: 1.2 })
    }
  }

  shoo() {
    const k = this.k
    sfx.hiss()
    k.float('MRROW!', this.x, this.y - 80, '#fff', 24)
    if (this.carry) {
      const jar = this.carry
      this.carry = null
      jar.jiggle.kick(6)
      if (k.shelf.length < k.maxShelf) {
        k.shelf.push(jar)
        k.shelfChanged()
        const s = k.slotPos(k.shelf.length - 1)
        k.burst(s.x, s.y - 30, 14, { speed: 200, up: 60, r: 8, color: '#ffe066', kind: 'sparkle', g: 100, life: 1 })
        k.float('Saved your jam!', s.x, s.y - 80, '#ffe066', 18)
      }
    } else {
      k.float('Shoo!', k.pointer.x, k.pointer.y - 30, '#ffe066', 20)
    }
    this.jump = null
    this.set('scared')
  }

  targetX() {
    const i = this.k.shelf.indexOf(this.target)
    if (i < 0) return null
    return this.k.slotPos(i).x - 36
  }

  update(dt) {
    const k = this.k
    this.t += dt
    this.purr = Math.max(0, this.purr - dt)
    const moveTo = (tx, speed) => {
      const d = tx - this.x
      this.dir = d >= 0 ? 1 : -1
      const step = Math.min(Math.abs(d), speed * dt)
      this.x += step * this.dir
      this.walkPhase += dt * speed * 0.12
      this.stepT -= dt
      if (this.stepT <= 0) {
        sfx.tiptoe()
        this.stepT = 0.32
      }
      return Math.abs(d) < 1
    }

    if (this.jump) {
      const j = this.jump
      const p = Math.min(1, this.t / j.dur)
      this.x = lerp(j.x0, j.x1, p)
      this.y = lerp(j.y0, j.y1, p) - Math.sin(p * Math.PI) * j.h
      if (p >= 1) {
        this.jump = null
        this.x = j.x1
        this.y = j.y1
        this.t = 0
        this.landed = true
      }
    }

    switch (this.state) {
      case 'sleep':
        this.dir = 1
        if (k.shelf.length && !k.seq) this.nap -= dt
        if (this.nap <= 0) {
          this.set('wake')
          sfx.meow()
          k.float('Meow?', this.x + 20, this.y - 70, '#fff', 20)
        }
        break
      case 'wake':
        if (this.t > 1.1) {
          if (!k.shelf.length) {
            this.nap = rand(8, 12)
            this.set('sleep')
            break
          }
          const i = Math.floor(Math.random() * k.shelf.length)
          this.target = k.shelf[i]
          this.leap(PLANK_X, k.slotPos(i).y, 0.9, 'jumpTo')
        }
        break
      case 'jumpTo':
        if (!this.jump) {
          sfx.tiptoe()
          this.set('walk')
        }
        break
      case 'walk': {
        const tx = this.targetX()
        if (tx == null) {
          this.set('walkBack')
          break
        }
        if (moveTo(tx, 55)) {
          this.dir = 1
          this.set('sniff')
        }
        break
      }
      case 'sniff':
        if (this.targetX() == null) {
          this.set('walkBack')
          break
        }
        if (k.seq) this.t = Math.min(this.t, 3)
        for (const at of [0.5, 1.6, 2.7]) {
          if (this.t - dt < at && this.t >= at) k.float('sniff', this.x + 40, this.y - 70, '#fff', 15)
        }
        if (this.t > 3.6) {
          const i = k.shelf.indexOf(this.target)
          if (i < 0) {
            this.set('walkBack')
            break
          }
          this.carry = k.shelf.splice(i, 1)[0]
          k.shelfChanged()
          sfx.pop()
          k.float('Hee hee!', this.x, this.y - 80, '#fff', 20)
          this.set('grab')
        }
        break
      case 'grab':
        if (this.t > 0.5) this.set('walkBack')
        break
      case 'walkBack':
        if (moveTo(PLANK_X, 95)) this.leap(SILL.x, SILL.y, 0.9, 'jumpBack')
        break
      case 'jumpBack':
        if (!this.jump) this.set(this.carry ? 'eat' : 'settle')
        break
      case 'eat':
        this.dir = 1
        for (const at of [0.4, 1.0, 1.6]) {
          if (this.t - dt < at && this.t >= at && this.carry) {
            sfx.chomp()
            k.burst(this.x + 40, this.y - 30, 6, { speed: 120, up: 90, r: 4, color: this.carry.color, life: 0.6 })
            k.float('Nom!', this.x + 30, this.y - 75, '#fff', 18)
          }
        }
        if (this.t > 2.2 && this.carry) {
          k.float(`The cat ate your ${this.carry.name}!`, this.x + 120, this.y - 100, '#ffe066', 17)
          this.carry = null
        }
        if (this.t > 2.8) this.set('settle')
        break
      case 'scared':
        if (this.t > 0.6) this.leap(SILL.x, SILL.y, 0.8, 'flee')
        break
      case 'flee':
        if (!this.jump) this.set('sulk')
        break
      case 'sulk':
        this.dir = 1
        if (this.t > 1.5) this.set('settle')
        break
      case 'settle':
        this.dir = 1
        if (this.t > 0.8) {
          this.nap = rand(20, 35)
          this.set('sleep')
        }
        break
    }
  }

  draw(ctx, time) {
    const s = this.state
    const curled = s === 'sleep' || (s === 'settle' && this.t > 0.4)
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.scale(this.dir * SCALE, SCALE)
    if (curled) this.drawCurled(ctx, time)
    else this.drawStanding(ctx, time)
    ctx.restore()
    if (curled) {
      ctx.save()
      ctx.font = 'bold 16px "Comic Sans MS", "Chalkboard SE", sans-serif'
      ctx.textAlign = 'center'
      for (let i = 0; i < 3; i++) {
        const p = (time * 0.4 + i / 3) % 1
        ctx.globalAlpha = Math.sin(p * Math.PI)
        ctx.fillStyle = '#6a8caf'
        ctx.fillText('z', this.x + 30 + p * 22, this.y - 38 - p * 40)
      }
      ctx.restore()
    }
  }

  drawCurled(ctx, time) {
    const breathe = 1 + Math.sin(time * 2) * 0.04
    ctx.save()
    ctx.scale(1, breathe)
    // tail wrapped round the front
    ctx.beginPath()
    ctx.moveTo(-30, -8)
    ctx.quadraticCurveTo(-30, 6, 0, 4)
    ctx.quadraticCurveTo(18, 3, 20, -2)
    ctx.lineWidth = 13
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 8
    ctx.strokeStyle = FUR
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(-2, -14, 34, 15, 0, 0, TAU)
    fillStroke(ctx, FUR)
    ctx.strokeStyle = STRIPE
    ctx.lineWidth = 3
    for (const sx of [-20, -8, 4]) {
      ctx.beginPath()
      ctx.moveTo(sx, -28)
      ctx.quadraticCurveTo(sx + 4, -22, sx + 2, -16)
      ctx.stroke()
    }
    ctx.restore()
    this.drawHead(ctx, 24, -14 * breathe, 15, { blink: true, mood: this.purr > 0 ? 'happy' : 'smile' }, time)
  }

  drawStanding(ctx, time) {
    const s = this.state
    const walking = s === 'walk' || s === 'walkBack'
    const scared = s === 'scared'
    const leaping = !!this.jump
    const stretch = s === 'wake' ? Math.sin(Math.min(1, this.t / 1.1) * Math.PI) : 0
    if (scared) {
      ctx.translate(Math.sin(time * 70) * 2, -Math.sin(Math.min(1, this.t / 0.3) * Math.PI) * 14)
      ctx.scale(1.2, 1.2)
    }
    if (leaping) {
      const p = Math.min(1, this.t / this.jump.dur)
      ctx.rotate(lerp(-0.35, 0.35, p))
    }
    // tail
    const sway = Math.sin(time * (walking ? 6 : 3)) * 8
    ctx.beginPath()
    ctx.moveTo(-26, -26)
    if (scared) ctx.quadraticCurveTo(-36, -40, -32, -72)
    else ctx.quadraticCurveTo(-48, -30, -44 + sway, -60)
    ctx.lineWidth = scared ? 18 : 13
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = scared ? 13 : 8
    ctx.strokeStyle = FUR
    ctx.stroke()
    // legs
    const legs = [-20, -9, 12, 23]
    legs.forEach((lx, i) => {
      let lift = walking ? Math.max(0, Math.sin(this.walkPhase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0))) * 6 : 0
      let dx = 0
      if (leaping) {
        dx = i > 1 ? 8 : -8
        lift = 4
      }
      if (s === 'wake' && i > 1) dx = stretch * 8
      rrect(ctx, lx + dx - 5, -18 - lift, 10, 18, 5)
      fillStroke(ctx, FUR, 2.5)
    })
    // body
    ctx.beginPath()
    ctx.ellipse(0, -26 + stretch * 4, 30 + stretch * 6, 15 - stretch * 2, 0, 0, TAU)
    fillStroke(ctx, FUR)
    if (scared) {
      ctx.beginPath()
      for (let i = 0; i <= 14; i++) {
        const a = Math.PI + (i / 14) * Math.PI
        const r = i % 2 ? 1 : 1.3
        ctx.lineTo(Math.cos(a) * 30 * r, -26 + Math.sin(a) * 15 * r)
      }
      fillStroke(ctx, FUR, 2.5)
    }
    ctx.strokeStyle = STRIPE
    ctx.lineWidth = 3
    for (const sx of [-16, -4, 8]) {
      ctx.beginPath()
      ctx.moveTo(sx, -40)
      ctx.quadraticCurveTo(sx + 4, -34, sx + 2, -28)
      ctx.stroke()
    }
    // head
    let hx = 30
    let hy = -42
    if (s === 'sniff') {
      hx = 36
      hy = -34 + Math.sin(time * 14) * 2
    }
    if (s === 'eat') hy += Math.abs(Math.sin(this.t * 10)) * 5
    if (s === 'wake') hy -= stretch * 6
    let mood = 'smile'
    if (s === 'sniff') mood = 'o'
    else if (s === 'grab' || s === 'walkBack' || s === 'jumpBack') mood = 'happy'
    else if (scared) mood = 'open'
    else if (s === 'eat') mood = Math.sin(this.t * 10) > 0 ? 'open' : 'happy'
    else if (s === 'sulk') mood = 'smile'
    this.drawHead(ctx, hx, hy, 16, { mood, blink: s === 'sulk' || (s === 'wake' && this.t < 0.5), lookX: 1, lookY: s === 'sniff' ? 0.5 : 0 }, time)
    // jam jar held in mouth or paws
    if (this.carry) {
      const jx = s === 'eat' ? 48 : hx + 18
      const jy = s === 'eat' ? 0 : hy + 26
      const shrink = s === 'eat' ? Math.max(0.1, 1 - this.t / 2.2) : 1
      this.k.drawJar(jx, jy, 0.42 * shrink, { fill: 0.82 * shrink, color: this.carry.color, lid: s === 'eat' ? null : 0, label: 1, fruit: this.carry.fruit, wobble: 1 })
    }
  }

  drawHead(ctx, x, y, r, face, time) {
    ctx.save()
    ctx.translate(x, y)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * r * 0.95, -r * 0.35)
      ctx.lineTo(side * r * 0.75, -r * 1.35 + (side > 0 ? Math.sin(time * 3) * 1.5 : 0))
      ctx.lineTo(side * r * 0.15, -r * 0.8)
      ctx.closePath()
      fillStroke(ctx, FUR, 2.5)
      ctx.beginPath()
      ctx.moveTo(side * r * 0.8, -r * 0.55)
      ctx.lineTo(side * r * 0.7, -r * 1.05)
      ctx.lineTo(side * r * 0.35, -r * 0.8)
      ctx.closePath()
      ctx.fillStyle = '#ffb3c1'
      ctx.fill()
    }
    circle(ctx, 0, 0, r)
    fillStroke(ctx, FUR)
    ctx.strokeStyle = STRIPE
    ctx.lineWidth = 2.5
    for (const sx of [-5, 0, 5]) {
      ctx.beginPath()
      ctx.moveTo(sx, -r + 2)
      ctx.lineTo(sx, -r + 7)
      ctx.stroke()
    }
    drawFace(ctx, 0, 1, r * 0.95, face)
    ctx.beginPath()
    ctx.moveTo(-2.5, 2)
    ctx.lineTo(2.5, 2)
    ctx.lineTo(0, 4.5)
    ctx.closePath()
    ctx.fillStyle = '#ff7a9a'
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.2
    for (const side of [-1, 1]) {
      for (const dy of [-1, 3]) {
        ctx.beginPath()
        ctx.moveTo(side * r * 0.55, 4 + dy * 0.5)
        ctx.lineTo(side * r * 1.35, 2 + dy * 1.5)
        ctx.stroke()
      }
    }
    if (this.state === 'eat' && this.t > 0.4) {
      ctx.fillStyle = this.carry?.color || '#d81f3c'
      ctx.beginPath()
      ctx.ellipse(r * 0.2, r * 0.55, 4, 2.5, 0, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
  }
}
