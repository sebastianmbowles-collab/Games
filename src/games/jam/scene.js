// The Jam kitchen: everything you see on the canvas, all the animations, and what happens when you tap.
// There is no winning — you just make jam, put it on the shelf, and eat it on toast.

import { FRUITS, fruitByKey, INK, rrect, fillStroke, circle, drawFace, drawFruit, hexToRgb, rgbToHex, mix } from './fruits'
import { sfx, wakeAudio } from './sound'
import { Cat } from './cat'

export const W = 960
export const H = 600
const COUNTER = 450
const FONT = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", "Trebuchet MS", sans-serif'
const TAU = Math.PI * 2

const POT_REST = { x: 590, y: 352, rot: 0 }
const POT_POUR = { x: 645, y: 235, rot: 0.8 }
const JAR_X = 775
const TOASTER_X = 885
const SUGAR_X = 425
const MAX_FRUIT = 8
const MAX_SUGAR = 3
const SHELF_Y = [150, 270]
const SHELF_SLOTS = 6
const MAX_SHELF = SHELF_Y.length * SHELF_SLOTS
const STORE_KEY = 'jam-shelf-v1'
const BOWL_COLORS = ['#ffd6e0', '#d6e4ff', '#ffe0f0', '#fff0cc', '#ecd9ff', '#ffe3d1']
const PER_PAGE = 6
const PAGES = Math.ceil(FRUITS.length / PER_PAGE)
const MORE_BTN = { x: 205, y: 562, w: 210, h: 38 }
const FUN_MIX_NAMES = ['Rainbow Jumble', 'Mega Mix', 'Fruit Salad', 'Everything', 'Mystery Muddle', 'Party']

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const lerp = (a, b, t) => a + (b - a) * t
const rand = (a, b) => a + Math.random() * (b - a)
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
function easeOutBounce(t) {
  const n = 7.5625
  const d = 2.75
  if (t < 1 / d) return n * t * t
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
  return n * (t -= 2.625 / d) * t + 0.984375
}
const phase = (t, start, dur) => clamp01((t - start) / dur)
const blinking = (time, seed) => (time + seed * 1.37) % 3.9 < 0.13

// A wobbly spring used for squishy squash-and-stretch.
class Spring {
  x = 0
  v = 0
  kick(amount) {
    this.v += amount
  }
  update(dt) {
    const a = -170 * this.x - 11 * this.v
    this.v += a * dt
    this.x += this.v * dt
  }
}

function loadShelf() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((j) => j && j.color && j.name).slice(-MAX_SHELF) : []
  } catch {
    return []
  }
}

function saveShelf(list) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.map(({ name, color, fruit }) => ({ name, color, fruit }))))
  } catch {
    // Saving is only a nicety; the game works without it.
  }
}

function slotPos(i) {
  return { x: 662 + (i % SHELF_SLOTS) * 51, y: SHELF_Y[Math.floor(i / SHELF_SLOTS)] }
}

function outlinedText(ctx, text, x, y, size, fill, lw = 5) {
  ctx.font = `bold ${size}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = lw
  ctx.strokeStyle = INK
  ctx.strokeText(text, x, y)
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
}

export class JamKitchen {
  constructor(canvas, { onShelfChange } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.onShelfChange = onShelfChange
    this.time = 0
    this.pointer = { x: -100, y: -100 }
    this.hover = null

    // The pot and what is in it
    this.pieces = []
    this.sugar = 0
    this.cooked = 0
    this.heat = false
    this.heatAnim = 0
    this.swirl = 0
    this.swirlVel = 0
    this.stirring = false
    this.lastStir = null
    this.stirSoundT = 0
    this.bubbles = []
    this.potMood = { mood: 'smile', t: 0 }
    this.potSpring = new Spring()
    this.readyAnnounced = false

    this.flying = []
    this.particles = []
    this.floaters = []
    this.banner = null
    this.seq = null
    this.sugarAnim = null
    this.toast = null
    this.newJarT = 1

    this.bowlSprings = BOWL_COLORS.map(() => new Spring())
    this.page = 0
    this.pageSwap = null
    this.jarSpring = new Spring()
    this.moreSpring = new Spring()
    this.sugarSpring = new Spring()
    this.toasterSpring = new Spring()
    this.stoveSpring = new Spring()
    this.sunSpring = new Spring()
    this.clockSpring = new Spring()
    this.sunWink = 0
    this.clockSpin = 0

    this.bee = { x: 300, y: 150, vx: 30, vy: 0, tx: 400, ty: 200, retarget: 0, loop: 0 }
    this.clouds = [
      { x: 30, y: 70, s: 1 },
      { x: 150, y: 120, s: 0.7 },
      { x: 240, y: 60, s: 0.85 },
    ]

    this.shelf = loadShelf().map((j) => ({ ...j, jiggle: new Spring() }))
    this.hint = { text: '', t: 0 }
    this.maxShelf = MAX_SHELF
    this.slotPos = slotPos
    this.cat = new Cat(this)

    this.toastCanvas = document.createElement('canvas')
    this.toastCanvas.width = 120
    this.toastCanvas.height = 120

    this.onDown = this.onDown.bind(this)
    this.onMove = this.onMove.bind(this)
    this.onUp = this.onUp.bind(this)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
    canvas.addEventListener('pointerleave', this.onUp)

    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    const c = this.canvas
    c.removeEventListener('pointerdown', this.onDown)
    c.removeEventListener('pointermove', this.onMove)
    c.removeEventListener('pointerup', this.onUp)
    c.removeEventListener('pointercancel', this.onUp)
    c.removeEventListener('pointerleave', this.onUp)
  }

  frame = (now) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.update(dt)
    this.draw()
    this.raf = requestAnimationFrame(this.frame)
  }

  // ------------------------------------------------------------------ helpers

  get fruitCount() {
    return this.pieces.length
  }

  jamColor() {
    if (!this.pieces.length) return '#d81f3c'
    const sum = [0, 0, 0]
    for (const p of this.pieces) {
      const c = hexToRgb(fruitByKey[p.key].jam)
      for (let i = 0; i < 3; i++) sum[i] += c[i]
    }
    return rgbToHex(sum.map((v) => v / this.pieces.length))
  }

  liquidColor() {
    return mix(this.jamColor(), '#ffe6ea', 0.55 * (1 - this.cooked))
  }

  jamName() {
    const counts = {}
    for (const p of this.pieces) counts[p.key] = (counts[p.key] || 0) + 1
    const kinds = Object.keys(counts).sort((a, b) => counts[b] - counts[a])
    let base
    if (kinds.length === 1) base = fruitByKey[kinds[0]].name
    else if (kinds.length === 2) base = `${fruitByKey[kinds[0]].name}-${fruitByKey[kinds[1]].name}`
    else base = FUN_MIX_NAMES[Math.floor(Math.random() * FUN_MIX_NAMES.length)]
    const prefix = this.sugar === 0 ? 'Tangy ' : this.sugar >= MAX_SUGAR ? 'Super Sweet ' : ''
    return { name: `${prefix}${base} Jam`, fruit: kinds[0] }
  }

  potPose() {
    if (!this.seq) return POT_REST
    const t = this.seq.t
    if (t < 0.8) {
      const e = easeInOut(t / 0.8)
      return { x: lerp(POT_REST.x, POT_POUR.x, e), y: lerp(POT_REST.y, POT_POUR.y, e), rot: lerp(0, POT_POUR.rot, e) }
    }
    if (t < 2.6) return { ...POT_POUR, rot: POT_POUR.rot + Math.sin(t * 25) * 0.015 }
    const e = easeInOut(phase(t, 2.6, 0.8))
    return { x: lerp(POT_POUR.x, POT_REST.x, e), y: lerp(POT_POUR.y, POT_REST.y, e), rot: lerp(POT_POUR.rot, 0, e) }
  }

  potLevel() {
    if (!this.pieces.length) return 0
    const full = Math.min(1, 0.45 + this.pieces.length * 0.07 + this.sugar * 0.03)
    if (!this.seq) return full
    return full * (1 - phase(this.seq.t, 0.9, 1.6))
  }

  setMood(mood, dur = 0.8) {
    this.potMood = { mood, t: dur }
  }

  float(text, x, y, color = '#fff', size = 22) {
    this.floaters.push({ text, x, y, t: 0, max: 1.4, color, size })
  }

  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU)
      const sp = rand(opts.speed * 0.4, opts.speed)
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up || 0),
        g: opts.g ?? 600,
        life: 0,
        max: rand(0.5, 1) * (opts.life || 0.8),
        r: rand(opts.r * 0.6, opts.r),
        color: opts.color,
        kind: opts.kind || 'drop',
        spin: rand(-6, 6),
      })
    }
  }

  // ------------------------------------------------------------------ actions

  // Which fruit bowl j is showing right now (it switches half-way through the hop when changing pages).
  bowlFruit(j) {
    let page = this.page
    if (this.pageSwap && this.bowlHop(j) < 0.5) page = this.pageSwap.from
    return FRUITS[page * PER_PAGE + j]
  }

  bowlHop(j) {
    return this.pageSwap ? clamp01((this.pageSwap.t - j * 0.06) / 0.5) : 1
  }

  nextPage() {
    if (this.pageSwap) return
    this.pageSwap = { t: 0, from: this.page }
    this.page = (this.page + 1) % PAGES
    this.moreSpring.kick(3)
    sfx.whoosh()
    sfx.boing()
  }

  tossFruit(i) {
    const f = this.bowlFruit(i)
    if (!f) return
    const bx = 50 + i * 62
    this.bowlSprings[i].kick(3)
    if (this.seq) return
    if (this.pieces.length + this.flying.length >= MAX_FRUIT) {
      this.setMood('o')
      this.float("I'm full!", POT_REST.x, POT_REST.y - 60, '#fff')
      sfx.nope()
      return
    }
    sfx.toss()
    this.flying.push({
      key: f.key,
      x0: bx,
      y0: 396,
      x1: POT_REST.x + rand(-45, 45),
      y1: POT_REST.y - 4,
      t: 0,
      dur: 0.6,
      spin: rand(-8, 8),
    })
  }

  landFruit(fl) {
    const f = fruitByKey[fl.key]
    this.pieces.push({ key: fl.key, a: rand(0, TAU), rr: rand(0.15, 0.7), dissolve: 0, bob: rand(0, TAU) })
    if (this.cooked > 0.6) this.cooked = 0.6
    this.readyAnnounced = this.cooked >= 1
    this.potSpring.kick(2.5)
    this.setMood('open', 0.6)
    sfx.plop()
    this.burst(fl.x1, fl.y1, 12, { speed: 220, up: 180, r: 7, color: mix(f.jam, '#ffffff', 0.2), life: 0.9 })
    const yums = ['Yum!', 'Splish!', 'Ooh!', `${f.name}!`, 'Plop!']
    this.float(yums[Math.floor(Math.random() * yums.length)], fl.x1, fl.y1 - 50, '#fff')
  }

  addSugar() {
    this.sugarSpring.kick(3)
    if (this.sugarAnim || this.seq) return
    if (this.sugar >= MAX_SUGAR) {
      this.float("That's sweet enough!", SUGAR_X + 20, 330, '#fff', 18)
      sfx.nope()
      return
    }
    this.sugarAnim = { t: 0, spawn: 0 }
    sfx.whoosh()
  }

  toggleHeat() {
    this.stoveSpring.kick(2)
    this.heat = !this.heat
    sfx.click()
    if (this.heat) this.float('Whoosh!', POT_REST.x, 500, '#ffb74d', 20)
  }

  startJar() {
    this.jarSpring.kick(3)
    if (this.seq || this.newJarT < 1) return
    if (!this.pieces.length || this.cooked < 1) {
      sfx.nope()
      this.float(this.pieces.length ? 'Not ready yet!' : 'No jam yet!', JAR_X, 330, '#fff', 18)
      return
    }
    const { name, fruit } = this.jamName()
    const color = this.jamColor()
    const slot = Math.min(this.shelf.length, MAX_SHELF - 1)
    this.seq = { t: 0, name, color, fruit, slot, fired: {} }
    this.stirring = false
    sfx.whoosh()
  }

  emptyPot() {
    if (this.seq || !this.pieces.length) return
    this.burst(POT_REST.x, POT_REST.y - 10, 16, { speed: 260, up: 200, r: 8, color: this.liquidColor() })
    this.resetPot()
    this.float('All clean!', POT_REST.x, POT_REST.y - 60, '#fff')
    sfx.whoosh()
  }

  clearShelf() {
    if (this.seq) return
    this.shelf = []
    saveShelf(this.shelf)
    this.onShelfChange?.(0)
    sfx.whoosh()
  }

  shelfChanged() {
    saveShelf(this.shelf)
    this.onShelfChange?.(this.shelf.length)
  }

  resetPot() {
    this.pieces = []
    this.sugar = 0
    this.cooked = 0
    this.bubbles = []
    this.readyAnnounced = false
  }

  startToast(jar) {
    this.toasterSpring.kick(2)
    if (this.toast) return
    if (!jar) {
      this.float('Make some jam first!', TOASTER_X - 20, 330, '#fff', 17)
      sfx.nope()
      return
    }
    jar.jiggle.kick(4)
    this.toast = { t: 0, color: jar.color, name: jar.name, bites: [], fired: {} }
    sfx.click()
  }

  // ------------------------------------------------------------------ input

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }
  }

  hitTest(p) {
    if (this.cat.hit(p)) return { kind: 'cat' }
    const b = this.bee
    if (Math.hypot(p.x - b.x, p.y - b.y) < 26) return { kind: 'bee' }
    if (Math.hypot(p.x - 100, p.y - 100) < 38) return { kind: 'sun' }
    if (Math.hypot(p.x - 400, p.y - 95) < 44) return { kind: 'clock' }
    for (let i = this.shelf.length - 1; i >= 0; i--) {
      const s = slotPos(i)
      if (Math.abs(p.x - s.x) < 22 && p.y < s.y && p.y > s.y - 64) return { kind: 'shelf', i }
    }
    if (Math.abs(p.x - TOASTER_X) < 52 && p.y > 370 && p.y < 455) return { kind: 'toaster' }
    if (Math.abs(p.x - JAR_X) < 36 && p.y > 350 && p.y < 460) return { kind: 'jar' }
    if (Math.abs(p.x - SUGAR_X) < 30 && p.y > 360 && p.y < 455) return { kind: 'sugar' }
    if (Math.abs(p.x - MORE_BTN.x) < MORE_BTN.w / 2 && Math.abs(p.y - MORE_BTN.y) < MORE_BTN.h / 2 + 4) return { kind: 'more' }
    for (let i = 0; i < PER_PAGE; i++) {
      const bx = 50 + i * 62
      if (Math.abs(p.x - bx) < 31 && p.y > 378 && p.y < 492) return { kind: 'bowl', i }
    }
    if (p.x > 478 && p.x < 702 && p.y > 462) return { kind: 'stove' }
    const lx = p.x - POT_REST.x
    const ly = p.y - POT_REST.y
    if (!this.seq && Math.abs(lx) < 128 && ly > -70 && ly < 45) return { kind: 'pot' }
    if (!this.seq && lx > 40 && lx < 150 && ly > -130 && ly < 0) return { kind: 'pot' }
    return null
  }

  onDown(e) {
    wakeAudio()
    const p = this.toCanvas(e)
    this.pointer = p
    const hit = this.hitTest(p)
    if (!hit) return
    if (hit.kind === 'cat') this.cat.tap()
    else if (hit.kind === 'bee') {
      this.bee.loop = 1
      sfx.bzz()
      this.float('Bzzz!', this.bee.x, this.bee.y - 30, '#ffe066', 18)
    } else if (hit.kind === 'sun') {
      this.sunSpring.kick(4)
      this.sunWink = 0.8
      sfx.boing()
    } else if (hit.kind === 'clock') {
      this.clockSpring.kick(4)
      this.clockSpin = 1
      sfx.boing()
    } else if (hit.kind === 'shelf') this.startToast(this.shelf[hit.i])
    else if (hit.kind === 'toaster') this.startToast(this.shelf[this.shelf.length - 1])
    else if (hit.kind === 'jar') this.startJar()
    else if (hit.kind === 'sugar') this.addSugar()
    else if (hit.kind === 'bowl') this.tossFruit(hit.i)
    else if (hit.kind === 'more') this.nextPage()
    else if (hit.kind === 'stove') this.toggleHeat()
    else if (hit.kind === 'pot') {
      this.stirring = true
      this.lastStir = null
      this.canvas.setPointerCapture?.(e.pointerId)
      this.stirAt(p)
    }
  }

  onMove(e) {
    const p = this.toCanvas(e)
    this.pointer = p
    if (this.stirring) this.stirAt(p)
    const hit = this.hitTest(p)
    this.hover = hit
    this.canvas.style.cursor = this.stirring ? 'grabbing' : hit ? (hit.kind === 'pot' ? 'grab' : 'pointer') : 'default'
  }

  onUp(e) {
    if (e.type === 'pointerleave' && this.stirring) return
    this.stirring = false
    this.lastStir = null
  }

  stirAt(p) {
    if (this.seq) {
      this.stirring = false
      return
    }
    const nx = (p.x - POT_REST.x) / 90
    const ny = (p.y - POT_REST.y) / 40
    const now = performance.now()
    const ang = Math.atan2(ny, nx)
    const len = Math.hypot(nx, ny)
    if (this.lastStir && len > 0.12) {
      let dA = ang - this.lastStir.ang
      if (dA > Math.PI) dA -= TAU
      if (dA < -Math.PI) dA += TAU
      const dts = Math.max(0.008, (now - this.lastStir.time) / 1000)
      this.swirlVel = lerp(this.swirlVel, Math.max(-14, Math.min(14, dA / dts)), 0.35)
    }
    this.lastStir = { ang, time: now }
    const k = len > 0.8 ? 0.8 / len : 1
    this.spoon = { x: nx * k * 90, y: ny * k * 14 }
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    this.time += dt
    const t = this.time

    for (const s of [this.moreSpring, this.potSpring, this.jarSpring, this.sugarSpring, this.toasterSpring, this.stoveSpring, this.sunSpring, this.clockSpring, ...this.bowlSprings]) s.update(dt)
    for (const j of this.shelf) j.jiggle.update(dt)
    this.heatAnim = lerp(this.heatAnim, this.heat ? 1 : 0, 1 - Math.exp(-4 * dt))
    this.sunWink = Math.max(0, this.sunWink - dt)
    this.clockSpin = Math.max(0, this.clockSpin - dt * 0.8)
    if (this.potMood.t > 0) this.potMood.t -= dt

    // Stirring swirls the pot and slowly winds down when you let go.
    this.swirl += this.swirlVel * dt
    this.swirlVel *= Math.exp(-(this.stirring ? 1 : 2.2) * dt)
    const stirF = Math.min(1, Math.abs(this.swirlVel) / 5)
    if (stirF > 0.3 && this.pieces.length) {
      this.stirSoundT -= dt
      if (this.stirSoundT <= 0) {
        sfx.slosh()
        this.stirSoundT = 0.35
      }
    }
    if (!this.stirring) this.spoon = null

    // Cooking
    if (this.pieces.length && !this.seq) {
      const cookRate = this.heat ? 0.045 + 0.11 * stirF : 0
      this.cooked = Math.min(1, this.cooked + cookRate * dt)
      for (const p of this.pieces) {
        p.dissolve = Math.min(1, p.dissolve + dt * ((this.heat ? 0.06 : 0) + 0.3 * stirF))
      }
      if (this.cooked >= 1 && !this.readyAnnounced) {
        this.readyAnnounced = true
        this.setMood('happy', 2)
        this.potSpring.kick(3)
        sfx.ding()
        this.float('Jam is ready!', POT_REST.x, POT_REST.y - 80, '#ffe066', 28)
        this.burst(POT_REST.x, POT_REST.y - 20, 18, { speed: 260, up: 120, r: 9, color: '#ffe066', kind: 'sparkle', g: 150, life: 1.2 })
      }
    }

    // Bubbles and steam when the stove is on
    const level = this.potLevel()
    if (level > 0 && this.heatAnim > 0.3 && !this.seq) {
      if (Math.random() < dt * (4 + 10 * this.heatAnim)) {
        const a = rand(0, TAU)
        const rr = rand(0, 0.75)
        this.bubbles.push({ x: Math.cos(a) * rr * 88, y: Math.sin(a) * rr * 12, t: 0, max: rand(0.4, 0.9), r: rand(4, 9) })
      }
      if (Math.random() < dt * 5 * this.heatAnim) {
        this.particles.push({ x: POT_REST.x + rand(-70, 70), y: POT_REST.y - 10, vx: rand(-10, 10), vy: rand(-50, -30), g: -10, life: 0, max: rand(1.4, 2.2), r: rand(10, 18), color: '#fff', kind: 'steam', spin: 0 })
      }
    }
    for (const b of this.bubbles) {
      b.t += dt
      if (b.t >= b.max && !b.popped) {
        b.popped = true
        if (Math.random() < 0.35) sfx.bubble()
      }
    }
    this.bubbles = this.bubbles.filter((b) => b.t < b.max + 0.15)

    if (this.cooked >= 1 && this.pieces.length && !this.seq && Math.random() < dt * 4) {
      this.particles.push({ x: POT_REST.x + rand(-100, 100), y: POT_REST.y + rand(-40, 10), vx: 0, vy: -20, g: 0, life: 0, max: 0.9, r: rand(5, 9), color: '#ffe066', kind: 'sparkle', spin: rand(-3, 3) })
    }

    // Flying fruit
    for (const fl of this.flying) {
      fl.t += dt / fl.dur
      fl.x = lerp(fl.x0, fl.x1, fl.t)
      fl.y = lerp(fl.y0, fl.y1, fl.t) - 160 * 4 * fl.t * (1 - fl.t)
      if (fl.t >= 1 && !fl.done) {
        fl.done = true
        this.landFruit(fl)
      }
    }
    this.flying = this.flying.filter((f) => !f.done)

    // Sugar pouring
    if (this.sugarAnim) {
      const s = this.sugarAnim
      s.t += dt
      if (s.t > 0.35 && s.t < 1.0) {
        const b = this.sugarPose()
        const mx = b.x + Math.sin(b.rot) * 40
        const my = b.y - Math.cos(b.rot) * 40
        for (let i = 0; i < 3; i++) {
          this.particles.push({ x: mx + rand(-4, 4), y: my + rand(-4, 4), vx: rand(30, 90), vy: rand(0, 40), g: 700, life: 0, max: 2, r: rand(2, 3.5), color: '#ffffff', kind: 'sugar', spin: rand(-8, 8), killY: POT_REST.y + rand(-4, 10) })
        }
      }
      if (s.t > 0.35 && !s.sounded) {
        s.sounded = true
        sfx.sugar()
      }
      if (s.t > 1.0 && !s.added) {
        s.added = true
        this.sugar++
        this.setMood('happy', 1)
        this.float(this.sugar >= MAX_SUGAR ? 'Super sweet!' : 'Sweet!', POT_REST.x, POT_REST.y - 60, '#fff')
      }
      if (s.t > 1.4) this.sugarAnim = null
    }

    // Jar-filling sequence
    if (this.seq) this.updateSeq(dt)
    if (this.newJarT < 1) this.newJarT = Math.min(1, this.newJarT + dt / 0.6)

    // Toast
    if (this.toast) this.updateToast(dt)

    // Particles
    for (const p of this.particles) {
      p.life += dt
      p.vy += p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'steam') p.r += dt * 12
      if (p.killY && p.vy > 0 && p.y > p.killY) p.life = p.max
    }
    this.particles = this.particles.filter((p) => p.life < p.max && p.y < H + 40)
    for (const f of this.floaters) f.t += dt
    this.floaters = this.floaters.filter((f) => f.t < f.max)
    if (this.banner) {
      this.banner.t += dt
      if (this.banner.t > 2.8) this.banner = null
    }

    if (this.pageSwap) {
      this.pageSwap.t += dt
      if (this.pageSwap.t > 0.5 + PER_PAGE * 0.06) this.pageSwap = null
    }
    this.updateBee(dt)
    this.cat.update(dt)
    for (const c of this.clouds) {
      c.x += dt * 12 * c.s
      if (c.x > 320) c.x = -60
    }
    this.updateHint(t, dt)
  }

  sugarPose() {
    const rest = { x: SUGAR_X, y: COUNTER - 40, rot: 0 }
    const pour = { x: 505, y: 280, rot: 2.1 }
    if (!this.sugarAnim) return rest
    const t = this.sugarAnim.t
    if (t < 0.35) {
      const e = easeInOut(t / 0.35)
      return { x: lerp(rest.x, pour.x, e), y: lerp(rest.y, pour.y, e) - Math.sin(e * Math.PI) * 40, rot: lerp(0, pour.rot, e) }
    }
    if (t < 1.0) return { ...pour, rot: pour.rot + Math.sin(t * 40) * 0.08 }
    const e = easeInOut(phase(t, 1.0, 0.4))
    return { x: lerp(pour.x, rest.x, e), y: lerp(pour.y, rest.y, e) - Math.sin(e * Math.PI) * 40, rot: lerp(pour.rot, 0, e) }
  }

  potLip() {
    const p = this.potPose()
    return { x: p.x + Math.cos(p.rot) * 104, y: p.y + Math.sin(p.rot) * 104 }
  }

  jarFill() {
    if (!this.seq) return 0
    return 0.82 * phase(this.seq.t, 1.0, 1.5)
  }

  updateSeq(dt) {
    const s = this.seq
    s.t += dt
    const once = (name, at, fn) => {
      if (s.t >= at && !s.fired[name]) {
        s.fired[name] = true
        fn()
      }
    }
    once('pour', 0.9, () => sfx.pour())
    if (s.t > 1.0 && s.t < 2.5 && Math.random() < dt * 14) {
      const surf = COUNTER - 4 - this.jarFill() * 80
      this.burst(JAR_X + rand(-6, 6), surf, 1, { speed: 90, up: 120, r: 4, color: s.color, life: 0.4 })
    }
    once('clear', 2.6, () => {
      this.resetPot()
      this.setMood('happy', 1.2)
    })
    once('lidland', 3.5, () => {
      sfx.twist()
      this.jarSpring.kick(3)
    })
    once('label', 3.9, () => {
      sfx.ding()
      this.banner = { text: s.name, color: s.color, t: 0 }
      this.burst(JAR_X, COUNTER - 50, 16, { speed: 240, up: 120, r: 8, color: '#ffe066', kind: 'sparkle', g: 200, life: 1 })
    })
    once('fly', 4.8, () => sfx.toss())
    once('land', 5.7, () => {
      if (this.shelf.length >= MAX_SHELF) this.shelf.shift()
      const jar = { name: s.name, color: s.color, fruit: s.fruit, jiggle: new Spring() }
      jar.jiggle.kick(5)
      this.shelf.push(jar)
      saveShelf(this.shelf)
      this.onShelfChange?.(this.shelf.length)
      const sp = slotPos(this.shelf.length - 1)
      sfx.clink()
      this.burst(sp.x, sp.y - 30, 14, { speed: 200, up: 60, r: 8, color: '#ffe066', kind: 'sparkle', g: 100, life: 1 })
      this.burst(sp.x, sp.y - 30, 6, { speed: 120, up: 80, r: 9, color: '#ff6b8a', kind: 'heart', g: -20, life: 1.3 })
      this.newJarT = 0
      this.seq = null
    })
  }

  updateToast(dt) {
    const s = this.toast
    s.t += dt
    const once = (name, at, fn) => {
      if (s.t >= at && !s.fired[name]) {
        s.fired[name] = true
        fn()
      }
    }
    once('pop', 0.9, () => {
      sfx.pop()
      this.toasterSpring.kick(4)
      this.burst(TOASTER_X, 380, 8, { speed: 120, up: 100, r: 3, color: '#b0742f', kind: 'crumb', life: 0.8 })
    })
    for (let i = 0; i < 3; i++) once(`scrape${i}`, 1.4 + i * 0.4, () => sfx.scrape())
    once('mmm', 2.6, () => this.float(`Mmm, ${s.name}!`, TOASTER_X - 60, 250, '#fff', 17))
    const bites = [
      [34, -30],
      [-4, -34],
      [-36, -22],
      [0, 20],
    ]
    bites.forEach(([bx, by], i) =>
      once(`bite${i}`, 3.1 + i * 0.45, () => {
        s.bites.push([bx, by, i === 3 ? 60 : 26])
        sfx.chomp()
        this.burst(TOASTER_X + bx, 330 + by, 8, { speed: 160, up: 80, r: 3.5, color: '#c98a3b', kind: 'crumb', life: 0.9 })
        if (i === 3) {
          this.burst(TOASTER_X, 320, 6, { speed: 110, up: 60, r: 10, color: '#ff6b8a', kind: 'heart', g: -30, life: 1.3 })
          this.float('Yummy!', TOASTER_X, 290, '#ffe066', 24)
        }
      }),
    )
    if (s.t > 4.9) this.toast = null
  }

  updateBee(dt) {
    const b = this.bee
    b.retarget -= dt
    const ready = this.cooked >= 1 && this.pieces.length
    if (b.retarget <= 0) {
      b.retarget = rand(1.5, 3.5)
      if (ready) {
        b.tx = POT_REST.x + rand(-70, 70)
        b.ty = POT_REST.y - rand(50, 90)
      } else {
        b.tx = rand(80, 900)
        b.ty = rand(60, 330)
      }
    }
    b.vx += (b.tx - b.x) * 1.4 * dt
    b.vy += (b.ty - b.y) * 1.4 * dt
    b.vx *= Math.exp(-1.2 * dt)
    b.vy *= Math.exp(-1.2 * dt)
    b.x += b.vx * dt
    b.y += b.vy * dt + Math.sin(this.time * 5) * 0.6
    if (b.loop > 0) b.loop = Math.max(0, b.loop - dt * 1.3)
  }

  updateHint(t, dt) {
    let text = ''
    if (this.cat.sneaky && !this.seq) text = 'Uh oh! Tap the cat to shoo it away!'
    else if (this.seq || this.toast || this.sugarAnim) text = ''
    else if (!this.pieces.length && !this.flying.length) {
      const tips = ['Tap a fruit bowl to throw fruit in me!', 'Tap "More fruit!" for more flavours!']
      if (this.shelf.length) tips.push('Tap a jar on the shelf to eat it on toast!')
      text = tips[Math.floor(t / 5) % tips.length]
    } else if (this.cooked >= 1) text = 'Jam is ready! Tap the empty jar!'
    else if (!this.heat) text = 'Turn on the stove to heat me up!'
    else if (this.sugar === 0 && this.cooked > 0.35 && Math.floor(t / 4) % 2) text = 'Want it sweet? Tap the sugar!'
    else if (Math.abs(this.swirlVel) < 1.5) text = 'Stir me round and round with the spoon!'
    else text = 'Wheee! Keep stirring!'
    if (text !== this.hint.text) this.hint = { text, t: 0 }
    this.hint.t += dt
  }

  // ------------------------------------------------------------------ drawing

  draw() {
    const { ctx, canvas } = this
    const dpr = canvas.width / W
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    this.drawWall()
    this.drawWindow()
    this.drawClock()
    this.drawShelves()
    this.cat.draw(this.ctx, this.time)
    this.drawCounter()
    this.drawStove()
    this.drawBowls()
    this.drawSugar()
    this.drawToaster()
    this.drawStationJar()
    this.drawPot()
    this.drawPourStream()
    this.drawFlying()
    this.drawParticles()
    this.drawBee()
    this.drawHint()
    this.drawShelfTag()
    this.drawFloaters()
    this.drawBanner()
  }

  drawWall() {
    const { ctx } = this
    ctx.fillStyle = '#fff1cf'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#ffe6ad'
    for (let x = 0; x < W; x += 44) ctx.fillRect(x, 0, 20, 340)
    ctx.fillStyle = 'rgba(255, 180, 180, 0.35)'
    for (let y = 22; y < 330; y += 44) {
      for (let x = (y / 44) % 2 ? 32 : 10; x < W; x += 44) {
        circle(ctx, x, y, 3)
        ctx.fill()
      }
    }
    // tiles behind the counter
    ctx.fillStyle = '#e8f6ff'
    ctx.fillRect(0, 330, W, 120)
    ctx.strokeStyle = '#bcdcee'
    ctx.lineWidth = 2
    for (let y = 330; y <= 450; y += 30) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    for (let y = 330; y < 450; y += 30) {
      for (let x = ((y - 330) / 30) % 2 ? 15 : 0; x < W; x += 30) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + 30)
        ctx.stroke()
      }
    }
    ctx.fillStyle = '#f7c6c6'
    ctx.fillRect(0, 326, W, 6)
  }

  drawWindow() {
    const { ctx, time } = this
    const x = 40
    const y = 40
    const w = 240
    const h = 180
    ctx.save()
    rrect(ctx, x, y, w, h, 10)
    ctx.clip()
    const g = ctx.createLinearGradient(0, y, 0, y + h)
    g.addColorStop(0, '#7fd3ff')
    g.addColorStop(1, '#c9f0ff')
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
    // hills
    ctx.fillStyle = '#8fd46b'
    ctx.beginPath()
    ctx.ellipse(x + 60, y + h + 10, 110, 55, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#6cc04a'
    ctx.beginPath()
    ctx.ellipse(x + 200, y + h + 20, 120, 60, 0, 0, TAU)
    ctx.fill()
    // sun
    const sx = 100
    const sy = 100
    ctx.save()
    ctx.translate(sx, sy)
    const ss = 1 + this.sunSpring.x * 0.2
    ctx.scale(ss, ss)
    ctx.save()
    ctx.rotate(time * 0.4)
    ctx.fillStyle = '#ffcf3f'
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12)
      ctx.beginPath()
      ctx.moveTo(-6, -30)
      ctx.lineTo(0, -44 - Math.sin(time * 3 + i) * 3)
      ctx.lineTo(6, -30)
      ctx.fill()
    }
    ctx.restore()
    circle(ctx, 0, 0, 28)
    fillStroke(ctx, '#ffe066')
    drawFace(ctx, 0, 2, 24, { mood: this.sunWink > 0 ? 'happy' : 'smile', blink: blinking(time, 2), lookX: (this.pointer.x - sx) / 500, lookY: (this.pointer.y - sy) / 500 })
    ctx.restore()
    // clouds
    for (const c of this.clouds) {
      ctx.fillStyle = '#fff'
      ctx.save()
      ctx.translate(x + c.x, y + c.y - 40)
      ctx.scale(c.s, c.s)
      for (const [cx, cy, r] of [[0, 0, 16], [18, -8, 20], [38, 0, 15], [18, 6, 16]]) {
        circle(ctx, cx, cy, r)
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.restore()
    // frame
    rrect(ctx, x, y, w, h, 10)
    ctx.lineWidth = 10
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.fillRect(x + w / 2 - 4, y, 8, h)
    ctx.fillRect(x, y + h / 2 - 4, w, 8)
    // curtains
    for (const side of [-1, 1]) {
      const cx = side < 0 ? x - 14 : x + w + 14
      const sway = Math.sin(time * 1.3 + side) * 4
      ctx.beginPath()
      ctx.moveTo(cx - 20 * side, y - 16)
      ctx.lineTo(cx + 30 * side, y - 16)
      ctx.quadraticCurveTo(cx + 10 * side + sway, y + 80, cx + 22 * side + sway, y + h + 10)
      ctx.lineTo(cx - 16 * side + sway, y + h + 10)
      ctx.quadraticCurveTo(cx - 6 * side, y + 80, cx - 20 * side, y - 16)
      ctx.closePath()
      ctx.save()
      ctx.clip()
      ctx.fillStyle = '#ff8a80'
      ctx.fillRect(cx - 60, y - 20, 120, h + 40)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      for (let yy = y - 20; yy < y + h + 20; yy += 16) ctx.fillRect(cx - 60, yy, 120, 8)
      for (let xx = cx - 60; xx < cx + 60; xx += 16) ctx.fillRect(xx, y - 20, 8, h + 40)
      ctx.restore()
      ctx.lineWidth = 3
      ctx.strokeStyle = INK
      ctx.stroke()
    }
    ctx.fillStyle = '#b5773a'
    rrect(ctx, x - 40, y - 24, w + 80, 12, 6)
    fillStroke(ctx, '#b5773a')
    // sill with flower pot
    rrect(ctx, x - 12, y + h + 4, w + 24, 12, 4)
    fillStroke(ctx, '#fff')
    const fx = x + w - 30
    const fy = y + h + 4
    const sway = Math.sin(time * 1.7) * 0.15
    ctx.save()
    ctx.translate(fx, fy - 26)
    ctx.rotate(sway)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -34)
    ctx.lineWidth = 4
    ctx.strokeStyle = '#3f8f3a'
    ctx.stroke()
    ctx.translate(0, -40)
    ctx.rotate(time * 0.5)
    for (let i = 0; i < 8; i++) {
      ctx.rotate(TAU / 8)
      ctx.beginPath()
      ctx.ellipse(0, -11, 5, 9, 0, 0, TAU)
      fillStroke(ctx, '#fff', 2)
    }
    ctx.rotate(-time * 0.5)
    circle(ctx, 0, 0, 8)
    fillStroke(ctx, '#ffcf3f', 2)
    ctx.restore()
    ctx.beginPath()
    ctx.moveTo(fx - 16, fy - 28)
    ctx.lineTo(fx + 16, fy - 28)
    ctx.lineTo(fx + 12, fy)
    ctx.lineTo(fx - 12, fy)
    ctx.closePath()
    fillStroke(ctx, '#e0764a')
  }

  drawClock() {
    const { ctx, time } = this
    const x = 400
    const y = 95
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.clockSpring.x * 0.3)
    circle(ctx, 0, 0, 42)
    fillStroke(ctx, '#ff7a59', 3)
    circle(ctx, 0, 0, 33)
    fillStroke(ctx, '#fffdf5', 2)
    ctx.fillStyle = INK
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU
      circle(ctx, Math.cos(a) * 27, Math.sin(a) * 27, i % 3 ? 1.5 : 3)
      ctx.fill()
    }
    const d = new Date()
    const spin = easeInOut(this.clockSpin) * TAU * 3
    const mins = d.getMinutes() + d.getSeconds() / 60
    const hrs = (d.getHours() % 12) + mins / 60
    for (const [a, len, lw] of [[(hrs / 12) * TAU + spin, 15, 4], [(mins / 60) * TAU + spin * 3, 23, 3]]) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.sin(a) * len, -Math.cos(a) * len)
      ctx.lineWidth = lw
      ctx.strokeStyle = INK
      ctx.stroke()
    }
    drawFace(ctx, 0, 12, 18, { blink: blinking(time, 5), mood: this.clockSpin > 0 ? 'o' : 'smile', lookX: (this.pointer.x - x) / 400, lookY: (this.pointer.y - y) / 400 })
    // bells
    for (const side of [-1, 1]) {
      circle(ctx, side * 30, -38, 11)
      fillStroke(ctx, '#ffcf3f', 3)
    }
    ctx.restore()
  }

  drawShelves() {
    const { ctx } = this
    for (const sy of SHELF_Y) {
      rrect(ctx, 628, sy, 322, 12, 4)
      fillStroke(ctx, '#c68642')
      for (const bx of [650, 928]) {
        ctx.beginPath()
        ctx.moveTo(bx, sy + 12)
        ctx.lineTo(bx, sy + 30)
        ctx.lineTo(bx + 16, sy + 12)
        fillStroke(ctx, '#a86b30', 2)
      }
    }
    // empty spots have a faint outline
    for (let i = this.shelf.length; i < MAX_SHELF; i++) {
      const s = slotPos(i)
      ctx.save()
      ctx.setLineDash([4, 5])
      rrect(ctx, s.x - 18, s.y - 56, 36, 54, 6)
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(160, 110, 60, 0.35)'
      ctx.stroke()
      ctx.restore()
    }
    this.shelf.forEach((j, i) => {
      const s = slotPos(i)
      const hovered = this.hover?.kind === 'shelf' && this.hover.i === i
      this.drawJar(s.x, s.y + (hovered ? -3 : 0), 0.62, {
        fill: 0.82,
        color: j.color,
        lid: 0,
        label: 1,
        fruit: j.fruit,
        squash: j.jiggle.x * 0.15,
        wobble: 0.5 + Math.abs(j.jiggle.x) * 6,
      })
    })
  }

  drawShelfTag() {
    if (this.hover?.kind !== 'shelf' || this.toast) return
    const j = this.shelf[this.hover.i]
    if (!j) return
    const { ctx } = this
    const s = slotPos(this.hover.i)
    ctx.font = `bold 14px ${FONT}`
    const w = ctx.measureText(j.name).width + 20
    const x = Math.min(W - w / 2 - 6, Math.max(w / 2 + 6, s.x))
    rrect(ctx, x - w / 2, s.y - 92, w, 26, 8)
    fillStroke(ctx, '#fffdf5', 2)
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(j.name, x, s.y - 79)
  }

  drawCounter() {
    const { ctx } = this
    ctx.fillStyle = '#c68642'
    ctx.fillRect(0, COUNTER + 10, W, H - COUNTER)
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    for (const [x0, x1] of [[8, 232], [240, 470], [710, 952]]) {
      rrect(ctx, x0, COUNTER + 46, x1 - x0, H - COUNTER - 36, 8)
      fillStroke(ctx, '#d59655')
      circle(ctx, (x0 + x1) / 2, COUNTER + 70, 6)
      fillStroke(ctx, '#ffcf3f', 2)
    }
    rrect(ctx, -10, COUNTER - 4, W + 20, 18, 6)
    fillStroke(ctx, '#f0b77a')
    // name tags under the bowls
    for (let i = 0; i < PER_PAGE; i++) {
      const f = this.bowlFruit(i)
      if (!f) continue
      const bx = 50 + i * 62
      let size = 11
      ctx.font = `bold ${size}px ${FONT}`
      while (ctx.measureText(f.name).width > 50 && size > 8) ctx.font = `bold ${--size}px ${FONT}`
      const w = ctx.measureText(f.name).width + 8
      rrect(ctx, bx - w / 2, COUNTER + 20, w, 18, 5)
      fillStroke(ctx, '#fffdf5', 2)
      ctx.fillStyle = mix(f.jam, '#000000', 0.3)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(f.name, bx, COUNTER + 30)
    }
    this.drawMoreButton()
  }

  drawMoreButton() {
    const { ctx, time } = this
    const b = MORE_BTN
    const sp = this.moreSpring.x
    const hovered = this.hover?.kind === 'more'
    ctx.save()
    ctx.translate(b.x, b.y + (hovered ? -2 : 0))
    ctx.scale(1 + sp * 0.1, 1 - sp * 0.1)
    rrect(ctx, -b.w / 2, -b.h / 2 + 4, b.w, b.h, b.h / 2)
    ctx.fillStyle = INK
    ctx.fill()
    rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2)
    fillStroke(ctx, '#ff7a59')
    outlinedText(ctx, 'More fruit!', -22, 1, 17, '#fff', 4)
    const nudge = Math.sin(time * 6) * 3
    ctx.beginPath()
    ctx.moveTo(48 + nudge, -9)
    ctx.lineTo(62 + nudge, 0)
    ctx.lineTo(48 + nudge, 9)
    ctx.closePath()
    fillStroke(ctx, '#fff', 2.5)
    for (let k = 0; k < PAGES; k++) {
      circle(ctx, 76 + k * 10 - (PAGES - 3) * 5, 0, k === this.page ? 4.5 : 3.2)
      fillStroke(ctx, k === this.page ? '#ffe066' : '#b8432a', 1.5)
    }
    ctx.restore()
  }

  drawStove() {
    const { ctx, time } = this
    const s = 1 + this.stoveSpring.x * 0.03
    ctx.save()
    ctx.translate(590, 600)
    ctx.scale(s, 1 / s)
    ctx.translate(-590, -600)
    rrect(ctx, 478, COUNTER + 4, 224, 160, 8)
    fillStroke(ctx, '#f4efe6')
    // oven window
    rrect(ctx, 512, 520, 156, 64, 10)
    fillStroke(ctx, '#3d3d4a')
    if (this.heatAnim > 0.02) {
      rrect(ctx, 518, 526, 144, 52, 8)
      ctx.fillStyle = `rgba(255, 140, 40, ${0.45 * this.heatAnim * (0.85 + Math.sin(time * 9) * 0.15)})`
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.moveTo(525, 530)
    ctx.lineTo(545, 530)
    ctx.lineTo(530, 575)
    ctx.lineTo(520, 575)
    ctx.fill()
    // knobs
    for (const kx of [530, 590, 650]) {
      const main = kx === 590
      const r = main ? 17 : 11
      ctx.save()
      ctx.translate(kx, 490)
      circle(ctx, 0, 0, r)
      fillStroke(ctx, main ? (this.heat ? '#ff7043' : '#9e9e9e') : '#bdbdbd')
      ctx.rotate(main ? lerp(-0.9, 0.9, this.heatAnim) : 0)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -r + 3)
      ctx.lineWidth = 4
      ctx.strokeStyle = INK
      ctx.stroke()
      ctx.restore()
    }
    outlinedText(ctx, this.heat ? 'ON' : 'OFF', 625, 490, 12, this.heat ? '#ff7043' : '#fff', 3)
    ctx.restore()
    // burner
    ctx.fillStyle = '#4a4a55'
    ctx.fillRect(480, COUNTER - 6, 220, 8)
    // flames
    if (this.heatAnim > 0.02) {
      const glow = ctx.createRadialGradient(590, COUNTER, 10, 590, COUNTER, 150)
      glow.addColorStop(0, `rgba(255,160,40,${0.35 * this.heatAnim})`)
      glow.addColorStop(1, 'rgba(255,160,40,0)')
      ctx.fillStyle = glow
      ctx.fillRect(430, COUNTER - 150, 320, 160)
      for (let i = 0; i < 9; i++) {
        const fx = 590 + (i - 4) * 26
        const h = (22 + Math.sin(time * 14 + i * 1.7) * 7 + Math.sin(time * 23 + i) * 4) * this.heatAnim
        for (const [col, k] of [['#ff7043', 1], ['#ffd54f', 0.55]]) {
          ctx.beginPath()
          ctx.moveTo(fx - 9 * k, COUNTER - 4)
          ctx.quadraticCurveTo(fx - 10 * k, COUNTER - 4 - h * k * 0.6, fx + Math.sin(time * 10 + i) * 3, COUNTER - 4 - h * k)
          ctx.quadraticCurveTo(fx + 10 * k, COUNTER - 4 - h * k * 0.6, fx + 9 * k, COUNTER - 4)
          ctx.closePath()
          ctx.fillStyle = col
          ctx.fill()
        }
      }
    }
  }

  drawBowls() {
    const { ctx, time } = this
    BOWL_COLORS.forEach((_, i) => {
      const f = this.bowlFruit(i)
      if (!f) return
      const bx = 50 + i * 62
      const hop = this.bowlHop(i)
      const hopY = -Math.sin(hop * Math.PI) * 70
      const sp = this.bowlSprings[i].x
      const hovered = this.hover?.kind === 'bowl' && this.hover.i === i
      ctx.save()
      ctx.translate(bx, COUNTER)
      ctx.scale(1 + sp * 0.12, 1 - sp * 0.12)
      const bob = hovered ? Math.sin(time * 12) * 2.5 - 3 : 0
      const fruitSpots = [
        [-13, -32, 13],
        [13, -32, 13],
        [0, -52 + bob, 15],
      ]
      fruitSpots.forEach(([fx, fy, r], k) => {
        ctx.save()
        ctx.translate(fx * (1 + Math.sin(hop * Math.PI) * 0.6), fy + hopY * (1 + k * 0.15))
        ctx.rotate(Math.sin(time * 2 + i + k) * 0.06 + (hop < 1 ? hop * TAU * (k % 2 ? 1 : -1) : 0))
        drawFruit(ctx, f.key, r, { blink: blinking(time, i * 3 + k), mood: hop < 1 ? 'open' : hovered && k === 2 ? 'open' : 'smile', lookX: (this.pointer.x - bx) / 300, lookY: -0.3 })
        ctx.restore()
      })
      ctx.beginPath()
      ctx.moveTo(-31, -26)
      ctx.quadraticCurveTo(-29, 2, 0, 2)
      ctx.quadraticCurveTo(29, 2, 31, -26)
      ctx.closePath()
      fillStroke(ctx, BOWL_COLORS[i])
      ctx.beginPath()
      ctx.ellipse(0, -26, 31, 5, 0, 0, TAU)
      fillStroke(ctx, mix(BOWL_COLORS[i], '#ffffff', 0.4), 2.5)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      rrect(ctx, -20, -18, 8, 10, 4)
      ctx.fill()
      ctx.restore()
    })
  }

  drawSugar() {
    const { ctx, time } = this
    const p = this.sugarPose()
    const sp = this.sugarSpring.x
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.scale(1 + sp * 0.1, 1 - sp * 0.1)
    ctx.beginPath()
    ctx.moveTo(-24, 40)
    ctx.lineTo(-24, -32)
    for (let k = 0; k <= 6; k++) ctx.lineTo(-24 + k * 8, k % 2 ? -40 : -34)
    ctx.lineTo(24, 40)
    ctx.closePath()
    fillStroke(ctx, '#fbf3e0')
    ctx.fillStyle = '#5b9bd5'
    ctx.fillRect(-23, -8, 46, 18)
    ctx.fillStyle = '#fff'
    ctx.font = `bold 11px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SUGAR', 0, 1)
    drawFace(ctx, 0, 24, 14, { blink: blinking(time, 7), mood: this.sugarAnim ? 'open' : 'smile' })
    ctx.restore()
  }

  drawToaster() {
    const { ctx, time } = this
    const s = this.toast
    const sp = this.toasterSpring.x
    const x = TOASTER_X
    const toasting = s && s.t < 0.9
    // toast (behind the toaster while inside it)
    if (s) this.drawToast()
    ctx.save()
    ctx.translate(x, COUNTER)
    ctx.scale(1 + sp * 0.08, 1 - sp * 0.08)
    if (toasting) ctx.translate(Math.sin(time * 60) * 1.2, 0)
    rrect(ctx, -50, -72, 100, 72, 22)
    const g = ctx.createLinearGradient(-50, 0, 50, 0)
    g.addColorStop(0, '#b8c2cc')
    g.addColorStop(0.35, '#f1f4f7')
    g.addColorStop(1, '#9aa5b1')
    fillStroke(ctx, g)
    for (const sx of [-20, 20]) {
      rrect(ctx, sx - 14, -70, 28, 6, 3)
      fillStroke(ctx, toasting ? '#ff8a3d' : '#444', 2)
    }
    // lever
    const lever = toasting ? 22 : 0
    rrect(ctx, 48, -58 + lever, 14, 8, 3)
    fillStroke(ctx, '#ff7043', 2)
    drawFace(ctx, 0, -30, 20, { blink: blinking(time, 11), mood: toasting ? 'o' : s ? 'happy' : 'smile', lookX: (this.pointer.x - x) / 300, lookY: (this.pointer.y - 400) / 300 })
    ctx.restore()
  }

  drawToast() {
    const s = this.toast
    const { ctx } = this
    const tc = this.toastCanvas
    const c = tc.getContext('2d')
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, 120, 120)
    c.translate(60, 64)
    c.lineJoin = 'round'
    const shape = (k) => {
      c.beginPath()
      c.moveTo(-32 * k, 34 * k)
      c.lineTo(-32 * k, -14 * k)
      c.bezierCurveTo(-46 * k, -24 * k, -38 * k, -48 * k, -16 * k, -44 * k)
      c.quadraticCurveTo(0, -52 * k, 16 * k, -44 * k)
      c.bezierCurveTo(38 * k, -48 * k, 46 * k, -24 * k, 32 * k, -14 * k)
      c.lineTo(32 * k, 34 * k)
      c.closePath()
    }
    shape(1)
    fillStroke(c, '#c98a3b')
    shape(0.8)
    const toastiness = clamp01(s.t / 0.9)
    c.fillStyle = mix('#fbe3a6', '#f0bf6a', toastiness)
    c.fill()
    const cover = phase(s.t, 1.3, 1.2)
    if (cover > 0) {
      c.save()
      shape(0.84)
      c.clip()
      c.beginPath()
      const edge = -44 + 88 * cover
      c.moveTo(-44, -50)
      c.lineTo(edge, -50)
      for (let y = -50; y <= 40; y += 8) c.lineTo(edge + Math.sin(y * 0.4) * 4, y)
      c.lineTo(-44, 40)
      c.closePath()
      c.fillStyle = s.color
      c.fill()
      c.fillStyle = 'rgba(255,255,255,0.35)'
      c.beginPath()
      c.ellipse(-12, -22, 8, 4, -0.5, 0, TAU)
      c.fill()
      c.restore()
    }
    if (s.t > 0.9) drawFace(c, 0, 4, 22, { blink: blinking(this.time, 13), mood: s.t > 2.5 ? 'happy' : 'smile' })
    c.globalCompositeOperation = 'destination-out'
    for (const [bx, by, r] of s.bites) {
      c.beginPath()
      c.arc(bx, by - 4, r, 0, TAU)
      c.fill()
    }
    c.globalCompositeOperation = 'source-over'

    const pop = phase(s.t, 0.9, 0.5)
    const y = s.t < 0.9 ? 400 : lerp(400, 318, easeOutBack(pop))
    const spin = s.t < 0.9 ? 0 : Math.sin(pop * Math.PI) * 0.4
    const bob = s.t > 1.4 ? Math.sin(this.time * 3) * 3 : 0
    ctx.save()
    ctx.translate(TOASTER_X, y + bob)
    ctx.rotate(spin)
    ctx.drawImage(tc, -60, -64)
    ctx.restore()

    // knife spreading jam
    if (s.t > 1.2 && s.t < 2.6) {
      const kt = (s.t - 1.3) / 0.4
      const row = Math.min(2, Math.max(0, Math.floor(kt)))
      const kx = TOASTER_X + Math.sin(kt * Math.PI) * 26
      const ky = y + bob - 26 + row * 18
      ctx.save()
      ctx.translate(kx + 20, ky - 10)
      ctx.rotate(-0.5)
      ctx.beginPath()
      ctx.moveTo(-34, -5)
      ctx.lineTo(0, -5)
      ctx.lineTo(0, 5)
      ctx.lineTo(-30, 5)
      ctx.quadraticCurveTo(-40, 2, -34, -5)
      fillStroke(ctx, '#dfe6ec', 2.5)
      ctx.fillStyle = s.color
      ctx.fillRect(-32, -1, 18, 5)
      rrect(ctx, 0, -6, 36, 12, 5)
      fillStroke(ctx, '#8d5a2b', 2.5)
      ctx.restore()
    }
  }

  drawJar(x, by, s, o) {
    const { ctx, time } = this
    ctx.save()
    ctx.translate(x, by)
    if (o.rot) ctx.rotate(o.rot)
    const sq = o.squash || 0
    ctx.scale(s * (1 + sq), s * (1 - sq))
    const body = () => {
      ctx.beginPath()
      ctx.moveTo(-26, -88)
      ctx.lineTo(-26, -80)
      ctx.quadraticCurveTo(-32, -78, -32, -68)
      ctx.lineTo(-32, -8)
      ctx.quadraticCurveTo(-32, 0, -24, 0)
      ctx.lineTo(24, 0)
      ctx.quadraticCurveTo(32, 0, 32, -8)
      ctx.lineTo(32, -68)
      ctx.quadraticCurveTo(32, -78, 26, -80)
      ctx.lineTo(26, -88)
      ctx.closePath()
    }
    body()
    ctx.fillStyle = 'rgba(215, 240, 255, 0.55)'
    ctx.fill()
    if (o.fill > 0) {
      ctx.save()
      body()
      ctx.clip()
      const surf = -4 - o.fill * 80
      const amp = o.wobble ?? 2
      ctx.beginPath()
      ctx.moveTo(-40, surf)
      for (let wx = -40; wx <= 40; wx += 4) ctx.lineTo(wx, surf + Math.sin(wx * 0.15 + time * 6) * amp)
      ctx.lineTo(40, 5)
      ctx.lineTo(-40, 5)
      ctx.closePath()
      ctx.fillStyle = o.color
      ctx.fill()
      ctx.strokeStyle = mix(o.color, '#ffffff', 0.35)
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
    }
    body()
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    rrect(ctx, -25, -66, 6, 48, 3)
    ctx.fill()
    if (o.face) drawFace(ctx, 4, -40, 18, { blink: blinking(time, 17), mood: o.face, lookX: -0.8, lookY: -0.4 })
    if (o.label > 0) {
      ctx.save()
      ctx.translate(0, -38)
      ctx.scale(o.label, o.label)
      rrect(ctx, -22, -18, 44, 34, 6)
      fillStroke(ctx, '#fff8e1', 2)
      ctx.fillStyle = o.color
      ctx.fillRect(-20, 9, 40, 5)
      ctx.save()
      ctx.translate(0, -4)
      if (o.fruit && fruitByKey[o.fruit]) drawFruit(ctx, o.fruit, 9, null)
      ctx.restore()
      ctx.restore()
    }
    if (o.lid != null) {
      ctx.save()
      ctx.translate(0, o.lid)
      ctx.beginPath()
      ctx.moveTo(-28, -100)
      ctx.lineTo(28, -100)
      ctx.lineTo(38, -80)
      for (let k = 0; k <= 8; k++) ctx.lineTo(38 - k * 9.5, k % 2 ? -76 : -80)
      ctx.closePath()
      ctx.save()
      ctx.clip()
      ctx.fillStyle = '#e53935'
      ctx.fillRect(-40, -102, 80, 30)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      const off = ((o.lidSpin || 0) * 16) % 16
      for (let gx = -56 + off; gx < 40; gx += 16) ctx.fillRect(gx, -102, 8, 30)
      for (let gy = -100; gy < -72; gy += 8) ctx.fillRect(-40, gy, 80, 4)
      ctx.restore()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = INK
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-30, -88)
      ctx.lineTo(30, -88)
      ctx.lineWidth = 3
      ctx.strokeStyle = '#ffcf3f'
      ctx.stroke()
      circle(ctx, 22, -88, 4)
      fillStroke(ctx, '#ffcf3f', 2)
      ctx.restore()
    }
    ctx.restore()
  }

  drawStationJar() {
    const s = this.seq
    const ready = this.cooked >= 1 && this.pieces.length && !s
    if (ready) {
      const { ctx, time } = this
      const g = ctx.createRadialGradient(JAR_X, COUNTER - 45, 10, JAR_X, COUNTER - 45, 80)
      g.addColorStop(0, `rgba(255, 230, 100, ${0.45 + Math.sin(time * 5) * 0.15})`)
      g.addColorStop(1, 'rgba(255, 230, 100, 0)')
      ctx.fillStyle = g
      ctx.fillRect(JAR_X - 90, COUNTER - 130, 180, 140)
    }
    const hovered = this.hover?.kind === 'jar'
    if (!s) {
      const slide = this.newJarT < 1 ? (1 - easeOutBack(this.newJarT)) * 240 : 0
      const hop = ready ? Math.abs(Math.sin(this.time * 5)) * -8 : hovered ? -3 : 0
      this.drawJar(JAR_X + slide, COUNTER + hop, 1, { fill: 0, color: '#fff', squash: this.jarSpring.x * 0.12, face: ready ? 'open' : 'smile' })
      return
    }
    const t = s.t
    const lidP = phase(t, 2.9, 0.6)
    const lid = t < 2.9 ? null : -(1 - easeOutBounce(lidP)) * 260
    const lidSpin = t > 3.5 ? phase(t, 3.5, 0.4) * 3 : 0
    const label = t < 3.9 ? 0 : easeOutBack(phase(t, 3.9, 0.45))
    const fly = phase(t, 4.8, 0.9)
    const target = slotPos(s.slot)
    let x = JAR_X
    let y = COUNTER
    let sc = 1
    let rot = 0
    if (fly > 0) {
      const e = easeInOut(fly)
      x = lerp(JAR_X, target.x, e)
      y = lerp(COUNTER, target.y, e) - Math.sin(e * Math.PI) * 120
      sc = lerp(1, 0.62, e)
      rot = e * TAU
    }
    this.drawJar(x, y, sc, {
      fill: this.jarFill(),
      color: s.color,
      lid,
      lidSpin,
      label,
      fruit: s.fruit,
      rot,
      squash: this.jarSpring.x * 0.12,
      wobble: t < 2.6 ? 4 : 1.5,
    })
  }

  drawPourStream() {
    const s = this.seq
    if (!s || s.t < 0.9 || s.t > 2.55) return
    const { ctx, time } = this
    const lip = this.potLip()
    const surf = COUNTER - 4 - this.jarFill() * 80
    const width = 12 * Math.min(1, (s.t - 0.9) / 0.2, (2.55 - s.t) / 0.2)
    const path = () => {
      ctx.beginPath()
      ctx.moveTo(lip.x, lip.y)
      ctx.quadraticCurveTo(lip.x + 50 + Math.sin(time * 20) * 3, lip.y - 6, JAR_X + Math.sin(time * 17) * 2, surf)
    }
    path()
    ctx.lineWidth = width + 5
    ctx.strokeStyle = INK
    ctx.stroke()
    path()
    ctx.lineWidth = width
    ctx.strokeStyle = s.color
    ctx.stroke()
    path()
    ctx.lineWidth = width * 0.25
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.stroke()
  }

  drawPot() {
    const { ctx, time } = this
    const pose = this.potPose()
    const sp = this.potSpring.x
    const level = this.potLevel()
    const boil = this.heatAnim * (level > 0 ? 1 : 0)
    ctx.save()
    ctx.translate(pose.x, pose.y)
    ctx.rotate(pose.rot + Math.sin(time * 30) * 0.006 * boil)
    ctx.translate(0, 100)
    ctx.scale(1 + sp * 0.1, 1 - sp * 0.1)
    ctx.translate(0, -100)

    // handles
    for (const side of [-1, 1]) {
      rrect(ctx, side * 118 - 14, 12, 28, 14, 7)
      fillStroke(ctx, '#2a7f8b')
    }
    ctx.beginPath()
    ctx.moveTo(-104, 0)
    ctx.lineTo(-96, 80)
    ctx.quadraticCurveTo(-94, 100, -70, 100)
    ctx.lineTo(70, 100)
    ctx.quadraticCurveTo(94, 100, 96, 80)
    ctx.lineTo(104, 0)
    ctx.closePath()
    const g = ctx.createLinearGradient(-104, 0, 104, 0)
    g.addColorStop(0, '#2a95a3')
    g.addColorStop(0.3, '#5fd6e2')
    g.addColorStop(1, '#23808c')
    fillStroke(ctx, g)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    rrect(ctx, -84, 14, 12, 70, 6)
    ctx.fill()
    // spots
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    for (const [sx, sy] of [[-50, 80], [60, 22], [75, 78], [-62, 30]]) {
      circle(ctx, sx, sy, 7)
      ctx.fill()
    }
    const ready = this.cooked >= 1 && this.pieces.length
    let mood = 'smile'
    if (this.potMood.t > 0) mood = this.potMood.mood
    else if (this.stirring && Math.abs(this.swirlVel) > 2) mood = 'open'
    else if (ready) mood = 'happy'
    const lx = this.seq ? 1 : (this.pointer.x - pose.x) / 250
    const ly = this.seq ? 1 : (this.pointer.y - pose.y - 50) / 250
    drawFace(ctx, 0, 52, 46, { blink: blinking(time, 0), mood, lookX: Math.max(-1, Math.min(1, lx)), lookY: Math.max(-1, Math.min(1, ly)) })

    // rim and inside
    ctx.beginPath()
    ctx.ellipse(0, 0, 110, 22, 0, 0, TAU)
    fillStroke(ctx, '#6adbe6')
    ctx.beginPath()
    ctx.ellipse(0, 0, 98, 16, 0, 0, TAU)
    fillStroke(ctx, '#1d4a53', 2)
    if (level > 0) {
      const col = this.liquidColor()
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(0, 0, 97, 15, 0, 0, TAU)
      ctx.clip()
      const drop = (1 - level) * 10
      ctx.beginPath()
      ctx.ellipse(0, 3 + drop, 97, 15, 0, 0, TAU)
      ctx.fillStyle = col
      ctx.fill()
      // swirl lines
      ctx.strokeStyle = mix(col, '#ffffff', 0.35)
      ctx.lineWidth = 2.5
      for (let k = 0; k < 3; k++) {
        const r = 25 + k * 24
        ctx.beginPath()
        ctx.ellipse(0, 3 + drop, r, r * 0.16, 0, this.swirl + k * 2, this.swirl + k * 2 + 1.6)
        ctx.stroke()
      }
      // bubbles
      for (const b of this.bubbles) {
        const p = b.t / b.max
        if (p < 1) {
          ctx.beginPath()
          ctx.ellipse(b.x, b.y + drop, b.r * p, b.r * p * 0.7, 0, 0, TAU)
          ctx.fillStyle = mix(col, '#ffffff', 0.25)
          ctx.fill()
          ctx.lineWidth = 1.5
          ctx.strokeStyle = mix(col, '#000000', 0.3)
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.ellipse(b.x, b.y + drop, b.r * (1 + (p - 1) * 6), b.r * 0.5 * (1 + (p - 1) * 6), 0, 0, TAU)
          ctx.lineWidth = 1.5
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'
          ctx.stroke()
        }
      }
      ctx.restore()
      // floating fruit pieces
      if (!this.seq || this.seq.t < 1.2) {
        const list = this.pieces
          .filter((p) => p.dissolve < 1)
          .map((p) => {
            const a = p.a + this.swirl
            return { p, x: Math.cos(a) * p.rr * 84, y: Math.sin(a) * p.rr * 11 + 2 + drop }
          })
          .sort((a, b) => a.y - b.y)
        for (const { p, x, y } of list) {
          const r = 14 * (1 - p.dissolve * 0.75)
          const bob = Math.sin(time * 3 + p.bob) * 1.5
          ctx.save()
          ctx.translate(x, y - r * 0.35 + bob)
          ctx.rotate(Math.sin(time * 2 + p.bob) * 0.2)
          drawFruit(ctx, p.key, r, p.dissolve < 0.6 ? { blink: blinking(time, p.bob), mood: Math.abs(this.swirlVel) > 2 ? 'happy' : 'smile' } : null)
          ctx.restore()
          ctx.beginPath()
          ctx.ellipse(x, y + r * 0.3 + bob, r * 1.15, r * 0.4, 0, 0, TAU)
          ctx.fillStyle = col
          ctx.fill()
        }
      }
    }
    // spoon
    if (!this.seq) {
      const sp2 = this.spoon || { x: 58, y: -2 }
      const hx = sp2.x + 70
      const hy = sp2.y - 120
      ctx.beginPath()
      ctx.moveTo(sp2.x, sp2.y)
      ctx.lineTo(hx, hy)
      ctx.lineWidth = 14
      ctx.strokeStyle = INK
      ctx.stroke()
      ctx.lineWidth = 9
      ctx.strokeStyle = '#d9a066'
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(sp2.x, sp2.y + 2, 16, 8, -0.3, 0, TAU)
      fillStroke(ctx, '#d9a066')
      if (level > 0) {
        ctx.beginPath()
        ctx.ellipse(sp2.x, sp2.y + 6, 20, 5, 0, 0, TAU)
        ctx.fillStyle = this.liquidColor()
        ctx.fill()
      }
    }
    ctx.restore()
  }

  drawFlying() {
    const { ctx, time } = this
    for (const fl of this.flying) {
      ctx.save()
      ctx.translate(fl.x, fl.y)
      ctx.rotate(fl.t * fl.spin)
      drawFruit(ctx, fl.key, 16, { mood: 'open', blink: blinking(time, 3) })
      ctx.restore()
    }
  }

  drawParticles() {
    const { ctx } = this
    for (const p of this.particles) {
      const a = 1 - p.life / p.max
      ctx.save()
      ctx.globalAlpha = p.kind === 'steam' ? a * 0.5 : Math.min(1, a * 2)
      ctx.translate(p.x, p.y)
      if (p.kind === 'sparkle') {
        ctx.rotate(p.life * p.spin)
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? p.r * 0.35 : p.r
          const ang = (i / 8) * TAU
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
        }
        ctx.closePath()
        fillStroke(ctx, p.color, 1.5)
      } else if (p.kind === 'heart') {
        const r = p.r
        ctx.beginPath()
        ctx.moveTo(0, r * 0.9)
        ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.4)
        ctx.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.4, -r * 0.1, 0, r * 0.9)
        fillStroke(ctx, p.color, 2)
      } else if (p.kind === 'steam') {
        circle(ctx, 0, 0, p.r)
        ctx.fillStyle = '#fff'
        ctx.fill()
      } else if (p.kind === 'sugar') {
        ctx.rotate(p.life * p.spin)
        ctx.fillStyle = '#fff'
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2)
        ctx.lineWidth = 1
        ctx.strokeStyle = '#9ab'
        ctx.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2)
      } else if (p.kind === 'crumb') {
        ctx.rotate(p.life * p.spin)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4)
      } else {
        circle(ctx, 0, 0, p.r)
        fillStroke(ctx, p.color, 1.5)
      }
      ctx.restore()
    }
  }

  drawBee() {
    const { ctx, time } = this
    const b = this.bee
    ctx.save()
    ctx.translate(b.x, b.y)
    if (b.loop > 0) ctx.rotate((1 - b.loop) * TAU)
    ctx.scale(b.vx < 0 ? -1 : 1, 1)
    const flap = Math.abs(Math.sin(time * 40))
    ctx.fillStyle = 'rgba(210, 240, 255, 0.8)'
    for (const wx of [-4, 5]) {
      ctx.save()
      ctx.translate(wx, -10)
      ctx.scale(1, 0.4 + flap * 0.6)
      ctx.beginPath()
      ctx.ellipse(0, -8, 7, 11, wx * 0.08, 0, TAU)
      fillStroke(ctx, 'rgba(220, 245, 255, 0.85)', 2)
      ctx.restore()
    }
    ctx.beginPath()
    ctx.moveTo(-16, 0)
    ctx.lineTo(-24, 2)
    ctx.lineTo(-16, 5)
    fillStroke(ctx, INK, 1.5)
    ctx.beginPath()
    ctx.ellipse(0, 0, 17, 12, 0, 0, TAU)
    ctx.save()
    ctx.clip()
    ctx.fillStyle = '#ffd54f'
    ctx.fillRect(-20, -14, 40, 28)
    ctx.fillStyle = INK
    ctx.fillRect(-9, -14, 5, 28)
    ctx.fillRect(1, -14, 5, 28)
    ctx.restore()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(12, -9)
    ctx.quadraticCurveTo(16, -20, 21, -19)
    ctx.lineWidth = 2
    ctx.stroke()
    circle(ctx, 21, -19, 2.5)
    ctx.fillStyle = INK
    ctx.fill()
    drawFace(ctx, 10, 1, 9, { blink: blinking(time, 19), mood: b.loop > 0 ? 'open' : 'smile', lookX: 1 })
    ctx.restore()
  }

  drawHint() {
    const h = this.hint
    if (!h.text) return
    const { ctx, time } = this
    const pop = easeOutBack(clamp01(h.t / 0.35))
    const cx = 450
    const cy = 262 + Math.sin(time * 2) * 2
    ctx.font = `bold 17px ${FONT}`
    const w = Math.min(330, ctx.measureText(h.text).width + 32)
    const showBar = this.heat && this.pieces.length && this.cooked < 1
    const hh = showBar ? 58 : 40
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(pop, pop)
    ctx.beginPath()
    ctx.moveTo(70, hh / 2 - 4)
    ctx.lineTo(110, hh / 2 + 40)
    ctx.lineTo(96, hh / 2 - 4)
    ctx.closePath()
    fillStroke(ctx, '#fffdf5')
    rrect(ctx, -w / 2, -hh / 2, w, hh, 16)
    fillStroke(ctx, '#fffdf5')
    ctx.fillStyle = '#fffdf5'
    ctx.fillRect(72, hh / 2 - 6, 22, 5)
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(h.text, 0, showBar ? -10 : 1, w - 16)
    if (showBar) {
      const bw = w - 60
      rrect(ctx, -bw / 2, 8, bw, 14, 7)
      fillStroke(ctx, '#f1e6d2', 2)
      if (this.cooked > 0.02) {
        rrect(ctx, -bw / 2 + 2, 10, (bw - 4) * this.cooked, 10, 5)
        ctx.fillStyle = this.jamColor()
        ctx.fill()
      }
    }
    ctx.restore()
  }

  drawFloaters() {
    const { ctx } = this
    for (const f of this.floaters) {
      const p = f.t / f.max
      const s = easeOutBack(clamp01(f.t / 0.25))
      ctx.save()
      ctx.globalAlpha = 1 - clamp01((p - 0.7) / 0.3)
      ctx.font = `bold ${f.size}px ${FONT}`
      const half = ctx.measureText(f.text).width / 2 + 8
      ctx.translate(Math.max(half, Math.min(W - half, f.x)), f.y - p * 50)
      ctx.scale(s, s)
      outlinedText(ctx, f.text, 0, 0, f.size, f.color, 5)
      ctx.restore()
    }
  }

  drawBanner() {
    const b = this.banner
    if (!b) return
    const { ctx } = this
    const size = b.text.length > 26 ? 30 : 38
    ctx.font = `bold ${size}px ${FONT}`
    const chars = [...b.text]
    const widths = chars.map((c) => ctx.measureText(c).width)
    const total = widths.reduce((a, c) => a + c, 0)
    let x = W / 2 - total / 2
    const out = clamp01((b.t - 2.3) / 0.5)
    ctx.save()
    ctx.globalAlpha = 1 - out
    chars.forEach((c, i) => {
      const lt = clamp01((b.t - i * 0.03) / 0.35)
      const s = easeOutBack(lt)
      const y = 205 + Math.sin(this.time * 6 + i * 0.5) * 5 - out * 30
      if (s > 0) {
        ctx.save()
        ctx.translate(x + widths[i] / 2, y)
        ctx.scale(s, s)
        ctx.font = `bold ${size}px ${FONT}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 9
        ctx.strokeStyle = '#fff'
        ctx.strokeText(c, 0, 0)
        ctx.lineWidth = 4
        ctx.strokeStyle = INK
        ctx.strokeText(c, 0, 0)
        ctx.fillStyle = b.color
        ctx.fillText(c, 0, 0)
        ctx.restore()
      }
      x += widths[i]
    })
    ctx.restore()
  }
}
