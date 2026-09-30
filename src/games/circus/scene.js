// The Digital Circus: the big-top menu, running an act, the results card, particles and the glitch effect.

import {
  W,
  H,
  INK,
  rand,
  rrect,
  fillStroke,
  text,
  star,
  heart,
  drawTent,
  drawFloor,
  drawJester,
  drawRingmaster,
  drawBubble,
  drawButton,
  inside,
} from './draw'
import { ACTS } from './acts'
import { sfx, wakeAudio, startMusic, stopMusic } from './sound'

export { W, H }

const STORE_KEY = 'digital-circus-v1'
const POSTERS = ACTS.map((a, i) => ({ ...a, x: 90 + i * 280, y: 238, w: 220, h: 176 }))
const BTN_AGAIN = { x: 290, y: 400, w: 180, h: 58 }
const BTN_MENU = { x: 490, y: 400, w: 180, h: 58 }
const LINES = [
  'Welcome, welcome to THE DIGITAL CIRCUS!',
  'Pick an act, any act! Tap a poster to begin.',
  'Every show earns you shiny tickets!',
  "Don't mind the glitches. They're... mostly harmless!",
  'Jingle is our star performer. Be nice to Jingle.',
  'Nobody has EVER wanted to leave. Isn\'t that wonderful?',
  'Try to earn three stars in every act!',
]

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY))
    if (raw && typeof raw.tickets === 'number') return { tickets: raw.tickets, best: raw.best || {} }
  } catch {
    // Storage can be missing or blocked; start fresh.
  }
  return { tickets: 0, best: {} }
}

export class Circus {
  constructor(canvas, { onTickets } = {}) {
    this.canvas = canvas
    this.c = canvas.getContext('2d')
    this.onTickets = onTickets
    this.state = 'menu'
    this.act = null
    this.actInfo = null
    this.result = null
    this.t = 0
    this.glitch = 0
    this.shake = 0
    this.parts = []
    this.floats = []
    this.hover = -1
    this.mouse = { x: -1, y: -1 }
    this.store = loadStore()
    this.line = 0
    this.lineT = 0
    this.nextAmbientGlitch = rand(6, 12)

    this.onDown = this.onDown.bind(this)
    this.onMove = this.onMove.bind(this)
    this.onUp = this.onUp.bind(this)
    this.onKey = this.onKey.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    this.loop = this.loop.bind(this)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onUp)
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('keyup', this.onKeyUp)
    this.onTickets?.(this.store.tickets)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener('pointerdown', this.onDown)
    this.canvas.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onUp)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('keyup', this.onKeyUp)
    stopMusic()
  }

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.store))
    } catch {
      // Not being able to save is fine; the game still works.
    }
    this.onTickets?.(this.store.tickets)
  }

  // ---------- Helpers the acts use ----------

  burst(x, y, colors, n = 10, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2)
      const v = rand(speed * 0.3, speed)
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - speed * 0.3,
        life: rand(0.5, 1),
        max: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: rand(4, 9),
      })
    }
  }

  float(str, x, y, color = '#fff') {
    this.floats.push({ str, x, y, color, life: 1.2 })
  }

  addGlitch(amount) {
    this.glitch = Math.max(this.glitch, amount)
  }

  shakeScreen(amount) {
    this.shake = Math.max(this.shake, amount)
  }

  // ---------- Moving between screens ----------

  startAct(info) {
    this.actInfo = info
    this.act = info.make(this)
    this.state = 'intro'
    this.parts = []
    this.floats = []
    this.addGlitch(0.25)
    sfx.glitch()
  }

  toMenu() {
    this.state = 'menu'
    this.act = null
    this.parts = []
    this.floats = []
    this.addGlitch(0.2)
  }

  finishAct() {
    const act = this.act
    const key = this.actInfo.key
    const stars = act.thresholds.filter((th) => act.score >= th).length
    const prev = this.store.best[key] || { score: 0, stars: 0 }
    const newBest = act.score > prev.score
    this.store.best[key] = { score: Math.max(prev.score, act.score), stars: Math.max(prev.stars, stars) }
    this.store.tickets += act.score
    this.save()
    this.result = { stars, score: act.score, newBest, won: act.won }
    this.state = 'result'
    if (stars >= 2) sfx.fanfare()
    else if (stars === 1) sfx.cheer()
    else sfx.sad()
    if (stars > 0) this.burst(W / 2, 250, ['#f2c40c', '#e8394f', '#2b9ce0', '#2bb673'], 20 * stars, 380)
  }

  // ---------- Input ----------

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  onDown(e) {
    e.preventDefault()
    wakeAudio()
    startMusic()
    const { x, y } = this.toCanvas(e)
    if (this.state === 'menu') {
      const i = POSTERS.findIndex((p) => inside(p, x, y))
      if (i >= 0) this.startAct(POSTERS[i])
      else {
        this.line = (this.line + 1) % LINES.length
        this.lineT = 0
        sfx.click()
      }
    } else if (this.state === 'intro') {
      this.state = 'play'
      sfx.click()
    } else if (this.state === 'play') {
      this.act.down?.(x, y)
    } else if (this.state === 'result') {
      if (inside(BTN_AGAIN, x, y)) this.startAct(this.actInfo)
      else if (inside(BTN_MENU, x, y)) this.toMenu()
    }
  }

  onMove(e) {
    const { x, y } = this.toCanvas(e)
    this.mouse = { x, y }
    let pointer = false
    if (this.state === 'menu') {
      this.hover = POSTERS.findIndex((p) => inside(p, x, y))
      pointer = this.hover >= 0
    } else if (this.state === 'result') {
      pointer = inside(BTN_AGAIN, x, y) || inside(BTN_MENU, x, y)
    }
    this.canvas.style.cursor = pointer ? 'pointer' : 'default'
  }

  onUp() {
    if (this.state === 'play') this.act.up?.()
  }

  onKey(e) {
    const k = e.key
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault()
    wakeAudio()
    startMusic()
    if (e.repeat) return
    if (k === 'Escape') {
      if (this.state !== 'menu') this.toMenu()
      return
    }
    if (this.state === 'menu' && ['1', '2', '3'].includes(k)) this.startAct(POSTERS[Number(k) - 1])
    else if (this.state === 'intro' && (k === ' ' || k === 'Enter')) this.state = 'play'
    else if (this.state === 'play') this.act.key?.(k, true)
    else if (this.state === 'result' && (k === ' ' || k === 'Enter')) this.startAct(this.actInfo)
  }

  onKeyUp(e) {
    if (this.state === 'play') this.act.key?.(e.key, false)
  }

  // ---------- Main loop ----------

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.update(dt)
    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  update(dt) {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt)
    this.shake = Math.max(0, this.shake - dt)
    this.lineT += dt

    if (this.state === 'menu') {
      if (this.lineT > 5) {
        this.lineT = 0
        this.line = (this.line + 1) % LINES.length
      }
      this.nextAmbientGlitch -= dt
      if (this.nextAmbientGlitch <= 0) {
        this.addGlitch(0.15)
        this.nextAmbientGlitch = rand(6, 12)
      }
    }
    if (this.state === 'play') {
      this.act.update(dt)
      if (this.act.done) this.finishAct()
    }

    for (const p of this.parts) {
      p.vy += 500 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.parts = this.parts.filter((p) => p.life > 0)
    for (const f of this.floats) {
      f.y -= 50 * dt
      f.life -= dt
    }
    this.floats = this.floats.filter((f) => f.life > 0)
  }

  render() {
    const c = this.c
    const dpr = this.canvas.width / W
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (this.shake > 0) c.translate(rand(-8, 8), rand(-8, 8))

    if (this.state === 'menu') this.drawMenu(c)
    else this.act.draw(c)

    for (const p of this.parts) {
      c.globalAlpha = Math.max(0, p.life / p.max)
      c.fillStyle = p.color
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
    }
    c.globalAlpha = 1
    for (const f of this.floats) {
      c.globalAlpha = Math.min(1, f.life * 2)
      text(c, f.str, f.x, f.y, { size: 26, color: f.color })
    }
    c.globalAlpha = 1

    if (this.state !== 'menu') this.drawHud(c)
    if (this.state === 'intro') this.drawIntro(c)
    if (this.state === 'result') this.drawResult(c)

    if (this.glitch > 0) this.drawGlitch(c, dpr)
  }

  drawGlitch(c, dpr) {
    // Slice the picture into strips and slide them sideways, then add some colored static.
    const k = Math.min(1, this.glitch * 2.5)
    const cw = this.canvas.width
    const ch = this.canvas.height
    c.save()
    c.setTransform(1, 0, 0, 1, 0, 0)
    for (let i = 0; i < 8; i++) {
      const y = rand(0, ch)
      const h = rand(4, 40) * dpr
      const dx = rand(-40, 40) * dpr * k
      c.drawImage(this.canvas, 0, y, cw, h, dx, y, cw, h)
    }
    c.globalCompositeOperation = 'screen'
    for (let i = 0; i < 5; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(255, 46, 154, 0.25)' : 'rgba(43, 224, 208, 0.25)'
      c.fillRect(0, rand(0, ch), cw, rand(2, 16) * dpr)
    }
    c.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 20 * k; i++) {
      c.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'
      const s = rand(4, 14) * dpr
      c.fillRect(rand(0, cw), rand(0, ch), s, s)
    }
    c.restore()
  }

  drawMenu(c) {
    const t = this.t
    drawTent(c, t)
    drawFloor(c)

    // Title with bouncing, color-cycling letters.
    const title = 'THE DIGITAL CIRCUS'
    const colors = ['#e8394f', '#f2c40c', '#2b9ce0', '#2bb673', '#ff7a2b', '#c77dff']
    c.font = `bold 44px "Comic Sans MS", "Chalkboard SE", "Comic Neue", "Trebuchet MS", sans-serif`
    const total = c.measureText(title).width
    let x = W / 2 - total / 2
    for (let i = 0; i < title.length; i++) {
      const ch = title[i]
      const w = c.measureText(ch).width
      text(c, ch, x + w / 2, 52 + Math.sin(t * 4 + i * 0.5) * 6, {
        size: 44,
        color: colors[(i + Math.floor(t * 3)) % colors.length],
      })
      x += w
    }

    drawRingmaster(c, 140, 150, 0.8, t, this.lineT < 2.2)
    drawBubble(c, 250, 96, 380, LINES[this.line], t)

    // Ticket counter.
    rrect(c, 700, 100, 220, 50, 14)
    fillStroke(c, '#f2c40c')
    text(c, `🎟 Tickets: ${this.store.tickets}`, 810, 125, { size: 22, color: '#fff' })

    // Act posters.
    POSTERS.forEach((p, i) => {
      const hover = this.hover === i
      const wob = hover ? Math.sin(t * 10) * 0.03 : 0
      c.save()
      c.translate(p.x + p.w / 2, p.y + p.h / 2)
      c.rotate(wob)
      c.scale(hover ? 1.06 : 1, hover ? 1.06 : 1)
      c.translate(-p.w / 2, -p.h / 2)
      c.fillStyle = '#6b3a1d'
      c.fillRect(30, p.h - 6, 10, 40)
      c.fillRect(p.w - 40, p.h - 6, 10, 40)
      rrect(c, 0, 0, p.w, p.h, 16)
      fillStroke(c, p.color, INK, 4)
      rrect(c, 8, 8, p.w - 16, p.h - 16, 10)
      c.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      c.lineWidth = 2
      c.setLineDash([6, 6])
      c.stroke()
      c.setLineDash([])
      text(c, `${i + 1}. ${p.title}`, p.w / 2, 30, { size: 22 })
      this.drawPosterIcon(c, p.key, p.w / 2, 86, t)
      text(c, p.blurb, p.w / 2, 128, { size: 15, color: '#fff' })
      const best = this.store.best[p.key]
      for (let s = 0; s < 3; s++) star(c, p.w / 2 - 44 + s * 22, 152, 9, best && best.stars > s ? '#f2c40c' : 'rgba(255,255,255,0.3)', INK)
      text(c, best ? `Best ${best.score}` : 'New!', p.w / 2 + 50, 152, { size: 14 })
      c.restore()
    })

    drawJester(c, 480, 590, 0.95, { t, pose: 'wave', lookX: (this.mouse.x - 480) / 400, lookY: -0.5 })
    text(c, 'Tap a poster to start an act!', 790, 560, { size: 18, color: '#fff3a0' })
  }

  drawPosterIcon(c, key, x, y, t) {
    if (key === 'juggle') {
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + (i * Math.PI * 2) / 3
        c.beginPath()
        c.arc(x + Math.cos(a) * 26, y + Math.sin(a) * 18, 11, 0, Math.PI * 2)
        fillStroke(c, ['#f2c40c', '#2bb673', '#2b9ce0'][i], INK, 3)
      }
    } else if (key === 'rope') {
      c.strokeStyle = INK
      c.lineWidth = 4
      c.beginPath()
      c.moveTo(x - 80, y + 20)
      c.quadraticCurveTo(x, y + 30, x + 80, y + 20)
      c.stroke()
      drawJester(c, x, y + 25, 0.35, { t, pose: 'out', pole: true, tilt: Math.sin(t * 2) * 0.3, walk: true })
    } else {
      c.save()
      c.translate(x - 20, y + 20)
      c.rotate(-0.6)
      rrect(c, -10, -16, 70, 32, 8)
      fillStroke(c, '#8a3ddb', INK, 3)
      c.restore()
      star(c, x + 40, y - 20 + Math.sin(t * 5) * 5, 12, '#fff', INK)
    }
  }

  drawHud(c) {
    const act = this.act
    rrect(c, 14, 12, 190, 40, 12)
    fillStroke(c, 'rgba(29, 18, 51, 0.8)', '#fff', 2)
    text(c, `Score: ${act.score}`, 109, 32, { size: 20 })
    const center = act.hud()
    rrect(c, W / 2 - 100, 12, 200, 40, 12)
    fillStroke(c, 'rgba(29, 18, 51, 0.8)', '#fff', 2)
    text(c, center, W / 2, 32, { size: 20 })
    if (act.hearts !== null) {
      for (let i = 0; i < 3; i++) heart(c, W - 150 + i * 44, 17, 30, i < act.hearts)
    }
  }

  drawPanel(c, x, y, w, h, color) {
    c.fillStyle = 'rgba(10, 3, 25, 0.55)'
    c.fillRect(0, 0, W, H)
    rrect(c, x, y + 8, w, h, 24)
    c.fillStyle = INK
    c.fill()
    rrect(c, x, y, w, h, 24)
    fillStroke(c, '#2a1150', INK, 4)
    rrect(c, x + 10, y + 10, w - 20, h - 20, 16)
    c.strokeStyle = color
    c.lineWidth = 4
    c.stroke()
  }

  drawIntro(c) {
    const info = this.actInfo
    this.drawPanel(c, 200, 120, 560, 330, info.color)
    text(c, info.title, W / 2, 175, { size: 42, color: info.color })
    this.act.help.forEach((ln, i) => text(c, ln, W / 2, 240 + i * 36, { size: 21, color: '#fff', outline: null }))
    const pulse = 1 + Math.sin(this.t * 6) * 0.06
    c.save()
    c.translate(W / 2, 395)
    c.scale(pulse, pulse)
    text(c, 'Tap to start!', 0, 0, { size: 30, color: '#fff3a0' })
    c.restore()
  }

  drawResult(c) {
    const r = this.result
    this.drawPanel(c, 230, 90, 500, 400, this.actInfo.color)
    const titles = ['The show must go on!', 'Nice show!', 'Great show!', 'SPECTACULAR!']
    text(c, titles[r.stars], W / 2, 145, { size: 38, color: '#fff3a0' })
    for (let s = 0; s < 3; s++) {
      const pop = r.stars > s ? 1 + Math.sin(this.t * 5 + s) * 0.08 : 1
      star(c, W / 2 - 80 + s * 80, 225, 30 * pop, r.stars > s ? '#f2c40c' : '#4a3a66', INK)
    }
    text(c, `Score: ${r.score}`, W / 2, 292, { size: 28 })
    text(c, `+${r.score} tickets`, W / 2, 330, { size: 22, color: '#f2c40c' })
    if (r.newBest) text(c, 'New best!', W / 2, 364, { size: 20, color: '#2be0d0' })
    const hA = inside(BTN_AGAIN, this.mouse.x, this.mouse.y)
    const hM = inside(BTN_MENU, this.mouse.x, this.mouse.y)
    drawButton(c, BTN_AGAIN, 'Again!', hA, '#2bb673')
    drawButton(c, BTN_MENU, 'Big top', hM, '#e8394f')
  }
}

