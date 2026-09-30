// Pomni's Big Escape: an 8-bit side-scroller. Title screen, level map, levels with a boss at the end.

import { drawText } from './font'
import { SPR, drawSprite } from './sprites'
import { LEVELS, buildLevel, TILE, VW, VH, GROUND_Y } from './levels'
import { makeBoss } from './bosses'
import { sfx, wakeAudio, playMusic, stopMusic } from './sound'

export { VW, VH }

const STORE_KEY = 'tadc-pomni-v1'
const STEP = 1 / 120
const GRAV = 720
const JUMP_V = 268
const RUN = 95
const BOSS_NAMES = ['JAX', 'RAGATHA', 'GANGLE', 'KINGER', 'CAINE & BUBBLE']
const KEYMAP = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ' ': 'jump', ArrowUp: 'jump', w: 'jump', W: 'jump', z: 'jump', Z: 'jump',
  Enter: 'start', Escape: 'back',
}

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

function loadData() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY))
    if (s && s.unlocked) return { unlocked: clamp(s.unlocked, 1, LEVELS.length), deaths: s.deaths || 0, beaten: s.beaten || [] }
  } catch {
    // No save yet, or storage is blocked.
  }
  return { unlocked: 1, deaths: 0, beaten: [] }
}

export class TadcGame {
  constructor(canvas) {
    this.canvas = canvas
    canvas.width = VW
    canvas.height = VH
    this.c = canvas.getContext('2d')
    this.data = loadData()
    this.state = 'title'
    this.t = 0
    this.stateT = 0
    this.sel = Math.min(this.data.unlocked - 1, LEVELS.length - 1)
    this.keyHeld = {}
    this.touchHeld = {}
    this.pressed = new Set()
    this.glitch = 0
    this.shake = 0
    this.parts = []
    this.texts = []

    this.onKey = this.onKey.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    this.onPointer = this.onPointer.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('keyup', this.onKeyUp)
    canvas.addEventListener('pointerdown', this.onPointer)
    this.acc = 0
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('pointerdown', this.onPointer)
    stopMusic()
  }

  persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.data))
    } catch {
      // Saving is optional.
    }
  }

  // ---------- Input ----------

  held(a) {
    return !!(this.keyHeld[a] || this.touchHeld[a])
  }

  wake() {
    wakeAudio()
    this.music()
  }

  setTouch(a, down) {
    this.wake()
    if (down && !this.touchHeld[a]) this.pressed.add(a)
    this.touchHeld[a] = down
  }

  onKey(e) {
    const a = KEYMAP[e.key]
    if (!a) return
    e.preventDefault()
    this.wake()
    if (!e.repeat) this.pressed.add(a)
    this.keyHeld[a] = true
  }

  onKeyUp(e) {
    const a = KEYMAP[e.key]
    if (a) this.keyHeld[a] = false
  }

  onPointer(e) {
    this.wake()
    const r = this.canvas.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * VW
    const y = ((e.clientY - r.top) / r.height) * VH
    if (this.state === 'map') {
      const i = LEVELS.findIndex((_, k) => Math.abs(x - this.nodeX(k)) < 22 && y > 50 && y < 135)
      if (i >= 0 && i < this.data.unlocked) {
        this.sel = i
        this.startLevel(i)
      }
    } else if (this.state !== 'play') {
      this.pressed.add('start')
    }
  }

  music() {
    if (this.state === 'play') playMusic(this.locked ? 'boss' : 'level')
    else playMusic('map')
  }

  // ---------- Screens ----------

  setState(s) {
    this.state = s
    this.stateT = 0
    this.music()
  }

  goMap() {
    this.parts = []
    this.texts = []
    this.setState('map')
  }

  nodeX(i) {
    return 32 + i * 64
  }

  startLevel(i) {
    this.levelIdx = i
    this.def = LEVELS[i]
    this.lv = buildLevel(this.def)
    this.ents = this.lv.entities.map((e) => ({ ...e, alive: true, on: false }))
    this.starsTotal = this.ents.filter((e) => e.type === 'star').length
    this.starsGot = 0
    this.levelDeaths = 0
    this.checkpoint = { x: 24, y: GROUND_Y - 20 }
    this.p = this.newPlayer()
    this.camX = 0
    this.locked = false
    this.boss = null
    this.haz = []
    this.door = null
    this.parts = []
    this.texts = []
    this.slip = false
    this.glitch = 0.3
    sfx.select()
    this.setState('play')
  }

  newPlayer() {
    return { x: this.checkpoint.x, y: this.checkpoint.y, w: 10, h: 20, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuf: 0, face: 1, dead: 0, prevBottom: 0, anim: 0 }
  }

  // ---------- Main loop ----------

  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    this.acc += dt
    let first = true
    while (this.acc >= STEP) {
      this.update(STEP)
      this.acc -= STEP
      if (first) {
        this.pressed.clear()
        first = false
      }
    }
    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  update(dt) {
    this.t += dt
    this.stateT += dt
    this.glitch = Math.max(0, this.glitch - dt)
    this.shake = Math.max(0, this.shake - dt)
    for (const q of this.parts) {
      q.vy += 300 * dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      q.life -= dt
    }
    this.parts = this.parts.filter((q) => q.life > 0)
    for (const f of this.texts) {
      f.y -= 14 * dt
      f.life -= dt
    }
    this.texts = this.texts.filter((f) => f.life > 0)

    const pr = (a) => this.pressed.has(a)
    const go = pr('jump') || pr('start')
    if (this.state === 'title') {
      if (go) {
        sfx.select()
        this.goMap()
      }
    } else if (this.state === 'map') {
      if (pr('left') && this.sel > 0) {
        this.sel--
        sfx.select()
      }
      if (pr('right') && this.sel < this.data.unlocked - 1) {
        this.sel++
        sfx.select()
      }
      if (go && this.stateT > 0.2) this.startLevel(this.sel)
      if (pr('back')) this.setState('title')
    } else if (this.state === 'play') {
      this.updatePlay(dt)
      if (pr('back')) this.goMap()
    } else if (this.state === 'clear') {
      if ((go && this.stateT > 1) || this.stateT > 6) {
        if (this.levelIdx === LEVELS.length - 1) this.setState('ending')
        else {
          this.sel = Math.min(this.levelIdx + 1, this.data.unlocked - 1)
          this.goMap()
        }
      }
    } else if (this.state === 'ending') {
      if (go && this.stateT > 1.5) this.goMap()
    }
  }

  solidAt(px, py) {
    const ch = this.lv.tile(Math.floor(px / TILE), Math.floor(py / TILE))
    return ch === '#' || ch === '='
  }

  solidTile(col, row) {
    const ch = this.lv.tile(col, row)
    return ch === '#' || ch === '='
  }

  updatePlay(dt) {
    const p = this.p
    if (p.dead > 0) {
      p.dead -= dt
      if (p.dead <= 0) this.respawn()
    } else {
      this.movePlayer(dt)
    }

    if (!this.locked) {
      this.camX = clamp(p.x - 130, 0, this.lv.w - VW)
      if (p.x > this.lv.arenaX + 40 && p.dead <= 0) this.lockArena()
    } else {
      this.camX += (this.lv.arenaX - this.camX) * Math.min(1, dt * 6)
    }

    for (const e of this.ents) {
      if (e.type !== 'gloink' || !e.alive) continue
      e.x += e.vx * dt
      const ahead = e.vx < 0 ? e.x - 1 : e.x + e.w + 1
      if (this.solidAt(ahead, e.y + e.h - 2) || !this.solidAt(ahead, e.y + e.h + 2)) e.vx = -e.vx
    }

    if (this.boss) this.boss.update(dt)
    for (const h of this.haz) h.update(dt, this)
    this.haz = this.haz.filter((h) => !h.dead)

    if (p.dead <= 0) this.collide()
  }

  movePlayer(dt) {
    const p = this.p
    const dir = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0)
    const slip = this.slip
    const max = slip ? 150 : RUN
    const accel = p.onGround ? (slip ? 110 : 900) : 650
    const decel = p.onGround ? (slip ? 18 : 1100) : 350
    if (dir) {
      p.vx = clamp(p.vx + dir * accel * dt, -max, max)
      p.face = dir
    } else if (p.vx > 0) p.vx = Math.max(0, p.vx - decel * dt)
    else p.vx = Math.min(0, p.vx + decel * dt)

    if (this.pressed.has('jump')) p.jumpBuf = 0.12
    p.jumpBuf -= dt
    p.coyote = p.onGround ? 0.08 : p.coyote - dt
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -JUMP_V
      p.jumpBuf = 0
      p.coyote = 0
      p.onGround = false
      sfx.jump()
    }
    // Let go of jump early for a little hop.
    const g = !this.held('jump') && p.vy < 0 ? GRAV * 2.2 : GRAV
    p.vy = Math.min(420, p.vy + g * dt)

    p.x += p.vx * dt
    this.collideX()
    if (this.locked) p.x = Math.max(p.x, this.lv.arenaX + 2)
    p.prevBottom = p.y + p.h
    p.y += p.vy * dt
    p.onGround = false
    this.collideY()
    p.anim += Math.abs(p.vx) * dt
  }

  wallTile(col, row) {
    return this.lv.tile(col, row) === '#'
  }

  collideX() {
    const p = this.p
    const top = Math.floor(p.y / TILE)
    const bot = Math.floor((p.y + p.h - 0.01) / TILE)
    if (p.vx > 0) {
      const col = Math.floor((p.x + p.w) / TILE)
      for (let r = top; r <= bot; r++) {
        if (this.wallTile(col, r)) {
          p.x = col * TILE - p.w - 0.01
          p.vx = 0
          break
        }
      }
    } else if (p.vx < 0) {
      const col = Math.floor(p.x / TILE)
      for (let r = top; r <= bot; r++) {
        if (this.wallTile(col, r)) {
          p.x = (col + 1) * TILE
          p.vx = 0
          break
        }
      }
    }
  }

  collideY() {
    const p = this.p
    const left = Math.floor(p.x / TILE)
    const right = Math.floor((p.x + p.w - 0.01) / TILE)
    if (p.vy > 0) {
      const row = Math.floor((p.y + p.h) / TILE)
      const fromAbove = p.prevBottom <= row * TILE + 0.5
      for (let c = left; c <= right; c++) {
        if (this.wallTile(c, row) || (fromAbove && this.solidTile(c, row))) {
          p.y = row * TILE - p.h
          p.vy = 0
          p.onGround = true
          break
        }
      }
    } else if (p.vy < 0) {
      const row = Math.floor(p.y / TILE)
      for (let c = left; c <= right; c++) {
        if (this.wallTile(c, row)) {
          p.y = (row + 1) * TILE
          p.vy = 0
          break
        }
      }
    }
  }

  collide() {
    const p = this.p
    const pb = { x: p.x, y: p.y, w: p.w, h: p.h }
    const landing = (top, x, w) => p.vy >= 0 && p.prevBottom <= top + 2 && p.y + p.h >= top && p.x + p.w > x && p.x < x + w

    for (const e of this.ents) {
      if (!e.alive) continue
      if (e.type === 'star' && overlap(pb, e)) {
        e.alive = false
        this.starsGot++
        sfx.star()
        this.puff(e.x + 3, e.y + 3, ['#f8c830', '#f4f4f4'], 6)
      } else if (e.type === 'flag' && !e.on && p.x > e.x) {
        e.on = true
        this.checkpoint = { x: e.x + 4, y: GROUND_Y - p.h }
        sfx.star()
        this.say('CHECKPOINT!', e.x, e.y - 10)
      } else if (e.type === 'gloink' && overlap(pb, e)) {
        if (landing(e.y, e.x, e.w)) {
          e.alive = false
          p.vy = -200
          sfx.stomp()
          this.puff(e.x + 5, e.y + 4, ['#e03c9c', '#f4f4f4'], 10)
        } else return this.die()
      }
    }

    let slip = false
    for (const h of this.haz) {
      if (h.kind === 'deadly' && h.hits(pb)) return this.die()
      if (h.kind === 'standkill' && h.active && landing(h.y, h.x, h.w)) return this.die()
      if (h.kind === 'platform') {
        if (landing(h.y, h.x, h.w)) {
          p.y = h.y - p.h
          p.vy = 0
          p.onGround = true
          p.x += (h.flying ? 0 : h.vx) * STEP
        } else if (h.hits(pb)) return this.die()
      }
      if (h.kind === 'slip' && p.onGround && Math.abs(p.y + p.h - h.y) < 3 && p.x + p.w > h.x && p.x < h.x + h.w) slip = true
    }
    this.slip = slip

    const b = this.boss
    if (b) {
      const bb = b.box()
      if (overlap(pb, bb)) {
        if (b.stompable && landing(bb.y, bb.x, bb.w)) {
          b.hit()
          p.vy = -250
          this.say(b.hp > 0 ? `${b.hp} MORE!` : 'GOT YOU!', b.x + b.w / 2, b.y - 12)
        } else if (b.harmful) return this.die()
        else if (p.x + p.w / 2 < bb.x + bb.w / 2) p.x = bb.x - p.w
        else p.x = bb.x + bb.w
      }
    }

    if (this.door && overlap(pb, this.door)) this.levelClear()
    if (p.y > VH + 20) this.die()
  }

  die() {
    const p = this.p
    if (p.dead > 0) return
    p.dead = 1.3
    this.data.deaths++
    this.levelDeaths++
    this.persist()
    sfx.die()
    this.glitch = 0.5
    this.shake = 0.2
    this.puff(p.x + 5, Math.min(p.y + 10, VH - 4), ['#d82838', '#2c5ce0', '#f8c830', '#f8dcc8', '#f4f4f4'], 30)
  }

  respawn() {
    this.p = this.newPlayer()
    this.haz = []
    this.slip = false
    if (this.boss) this.boss.playerRespawned()
    this.glitch = 0.25
  }

  lockArena() {
    this.locked = true
    this.checkpoint = { x: this.lv.arenaX + 24, y: GROUND_Y - 20 }
    this.boss = makeBoss(this.def.boss, this)
    this.music()
  }

  clearHazards() {
    for (const h of this.haz) if (h.x !== undefined) this.puff(h.x + (h.w || 0) / 2, h.y ?? 100, ['#f4f4f4', '#c8b8e0'], 3)
    this.haz = []
  }

  bossDefeated() {
    this.haz = []
    this.boss = null
    this.door = { x: this.lv.arenaX + 280, y: GROUND_Y - 32, w: 16, h: 32 }
    this.say('BOSS BEATEN!', this.lv.arenaX + 160, 60, 3)
    sfx.win()
  }

  levelClear() {
    this.door = null
    this.data.unlocked = Math.max(this.data.unlocked, Math.min(LEVELS.length, this.levelIdx + 2))
    if (!this.data.beaten.includes(this.levelIdx)) this.data.beaten.push(this.levelIdx)
    this.persist()
    sfx.win()
    this.setState('clear')
  }

  puff(x, y, colors, n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x, y, vx: rand(-80, 80), vy: rand(-140, -20), life: rand(0.4, 0.9), color: colors[i % colors.length] })
    }
  }

  say(str, x, y, life = 1.4) {
    this.texts.push({ str, x, y, life })
  }

  // ---------- Drawing ----------

  render() {
    const c = this.c
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.imageSmoothingEnabled = false
    if (this.shake > 0) c.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)))
    if (this.state === 'title') this.drawTitle(c)
    else if (this.state === 'map') this.drawMap(c)
    else if (this.state === 'ending') this.drawEnding(c)
    else {
      this.drawPlay(c)
      if (this.state === 'clear') this.drawClear(c)
    }
    if (this.glitch > 0) this.drawGlitch(c)
  }

  drawBackdrop(c, camX, pal) {
    c.fillStyle = pal.sky
    c.fillRect(0, 0, VW, VH)
    const off = Math.floor(camX * 0.3) % 32
    c.fillStyle = pal.stripe
    for (let x = -off; x < VW; x += 32) c.fillRect(x, 0, 16, VH)
    // Scalloped trim at the top of the tent.
    const s = Math.floor(camX * 0.3) % 16
    for (let x = -s - 16; x < VW + 16; x += 16) {
      c.fillStyle = pal.trim
      c.fillRect(x, 0, 16, 3)
      c.fillRect(x + 2, 3, 12, 2)
      c.fillRect(x + 5, 5, 6, 2)
    }
  }

  drawFloorBand(c, y) {
    for (let x = 0; x < VW; x += 8) {
      for (let r = 0; r < 2; r++) {
        c.fillStyle = (x / 8 + r) % 2 ? '#140c1c' : '#f4f4f4'
        c.fillRect(x, y + r * 8, 8, 8)
      }
    }
    c.fillStyle = '#2a1040'
    c.fillRect(0, y + 16, VW, VH - y - 16)
  }

  drawTiles(c) {
    const cam = Math.round(this.camX)
    const c0 = Math.floor(cam / TILE)
    for (let col = c0; col <= c0 + 21; col++) {
      for (let row = 0; row < 11; row++) {
        const ch = this.lv.tile(col, row)
        const x = col * TILE - cam
        const y = row * TILE
        if (ch === '#') {
          const top = !this.solidTile(col, row - 1)
          c.fillStyle = '#3c1c5c'
          c.fillRect(x, y, TILE, TILE)
          c.fillStyle = '#2a1040'
          c.fillRect(x + 3, y + 11, 2, 2)
          c.fillRect(x + 11, y + 5, 2, 2)
          if (top) {
            for (let k = 0; k < 4; k++) {
              for (let r = 0; r < 2; r++) {
                c.fillStyle = (k + r) % 2 ? '#140c1c' : '#f4f4f4'
                c.fillRect(x + k * 4, y + r * 4, 4, 4)
              }
            }
            c.fillStyle = '#140c1c'
            c.fillRect(x, y + 8, TILE, 1)
          }
        } else if (ch === '=') {
          c.fillStyle = '#140c1c'
          c.fillRect(x, y, TILE, 10)
          for (let k = 0; k < 4; k++) {
            c.fillStyle = k % 2 ? '#f4f4f4' : '#d82838'
            c.fillRect(x + k * 4, y + 1, 4, 7)
          }
          c.fillStyle = '#f8c830'
          c.fillRect(x, y + 8, TILE, 2)
        }
      }
    }
  }

  drawPlay(c) {
    const cam = Math.round(this.camX)
    const t = this.t
    this.drawBackdrop(c, cam, this.def)
    this.drawTiles(c)

    for (const e of this.ents) {
      if (e.type === 'flag') {
        const x = e.x - cam + 7
        c.fillStyle = '#140c1c'
        c.fillRect(x, e.y - 8, 2, 24)
        c.fillStyle = e.on ? '#38b848' : '#d82838'
        c.fillRect(x + 2, e.y - 8, 8, 3)
        c.fillRect(x + 2, e.y - 5, 5, 2)
      }
      if (!e.alive) continue
      if (e.type === 'star') drawSprite(c, SPR.star, e.x - cam, e.y + Math.round(Math.sin(t * 4 + e.x) * 1.5))
      if (e.type === 'gloink') drawSprite(c, SPR.gloink, e.x - cam, e.y - (Math.floor(t * 6) % 2), { flip: e.vx > 0 })
    }

    if (this.door) {
      const d = this.door
      const x = d.x - cam
      c.fillStyle = '#140c1c'
      c.fillRect(x - 1, d.y - 1, d.w + 2, d.h + 1)
      c.fillStyle = '#2c5ce0'
      c.fillRect(x, d.y, d.w, d.h)
      c.fillStyle = '#d82838'
      c.fillRect(x + 2, d.y + 2, d.w - 4, d.h - 2)
      c.fillStyle = '#f8c830'
      c.fillRect(x + 11, d.y + 16, 2, 2)
      drawText(c, 'EXIT', x + 8, d.y - 16 - (Math.floor(t * 3) % 2), { align: 'center', color: '#f8c830' })
    }

    for (const h of this.haz) h.draw(c, cam, t)
    if (this.boss) this.boss.draw(c, cam, t)

    const p = this.p
    if (p.dead <= 0) {
      let spr = SPR.pomniIdle
      if (!p.onGround) spr = SPR.pomniJump
      else if (Math.abs(p.vx) > 10) spr = Math.floor(p.anim / 10) % 2 ? SPR.pomniRun1 : SPR.pomniRun2
      drawSprite(c, spr, p.x - 2 - cam, p.y - 1, { flip: p.face < 0 })
      if (this.slip && Math.floor(t * 8) % 2) drawText(c, '!', p.x + 3 - cam, p.y - 10, { color: '#68d8f8' })
    }

    for (const q of this.parts) {
      c.fillStyle = q.color
      c.fillRect(Math.round(q.x - cam), Math.round(q.y), 2, 2)
    }
    for (const f of this.texts) {
      if (f.life < 0.3 && Math.floor(t * 20) % 2) continue
      drawText(c, f.str, f.x - cam, f.y, { align: 'center', color: '#f8c830' })
    }

    this.drawHud(c)
  }

  drawHud(c) {
    drawText(c, this.def.title, 4, 4)
    drawText(c, `STARS ${this.starsGot}/${this.starsTotal}  OUCH ${this.levelDeaths}`, 4, 12, { color: '#c8b8e0' })
    const b = this.boss
    if (!b) return
    drawText(c, b.name, VW - 4, 4, { align: 'right', color: '#f8c830' })
    for (let i = 0; i < 3; i++) {
      c.fillStyle = '#140c1c'
      c.fillRect(VW - 46 + i * 14, 11, 12, 6)
      c.fillStyle = i < b.hp ? '#d82838' : '#3c1c5c'
      c.fillRect(VW - 45 + i * 14, 12, 10, 4)
    }
    if (b.state === 'intro' && Math.floor(this.t * 4) % 2) {
      drawText(c, b.name, VW / 2, 50, { scale: 3, align: 'center', color: '#f8c830' })
      drawText(c, 'DODGE, THEN STOMP WHEN THEY GET TIRED!', VW / 2, 72, { align: 'center' })
    }
    if (b.state === 'tired' && Math.floor(this.t * 4) % 2) {
      drawText(c, 'TIRED! JUMP ON THEIR HEAD!', VW / 2, 30, { scale: 1, align: 'center', color: '#38b848' })
    }
  }

  drawTitle(c) {
    const t = this.t
    this.drawBackdrop(c, t * 40, LEVELS[0])
    this.drawFloorBand(c, 144)
    drawText(c, "POMNI'S", VW / 2, 16, { scale: 3, align: 'center', color: '#d82838' })
    drawText(c, 'BIG ESCAPE', VW / 2, 38, { scale: 3, align: 'center', color: '#2c5ce0' })
    drawText(c, 'AN AMAZING DIGITAL CIRCUS FAN GAME', VW / 2, 62, { align: 'center', color: '#f8c830' })
    drawSprite(c, SPR.pomniIdle, VW / 2 - 21, 144 - 63 + Math.round(Math.sin(t * 3) * 2), { scale: 3 })
    const lineup = [
      [SPR.jax, 14],
      [SPR.ragatha, 50],
      [SPR.gangle, 238],
      [SPR.kinger, 274],
    ]
    for (const [s, x] of lineup) drawSprite(c, s, x, 144 - s.length * 2, { scale: 2 })
    drawSprite(c, SPR.caine, 92, 78 + Math.round(Math.sin(t * 2) * 3))
    drawSprite(c, SPR.bubble, 214, 80 + Math.round(Math.cos(t * 2) * 3))
    if (Math.floor(t * 2) % 2) drawText(c, 'PRESS JUMP TO START', VW / 2, 166, { align: 'center', color: '#f8c830' })
  }

  drawMap(c) {
    const t = this.t
    this.drawBackdrop(c, t * 20, LEVELS[this.sel])
    drawText(c, 'PICK A SHOW', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    c.fillStyle = '#f8c830'
    for (let x = this.nodeX(0); x < this.nodeX(LEVELS.length - 1); x += 6) c.fillRect(x, 104, 3, 1)
    const icons = [SPR.jax, SPR.ragatha, SPR.gangle, SPR.kinger, SPR.caine]
    LEVELS.forEach((lv, i) => {
      const x = this.nodeX(i)
      const locked = i >= this.data.unlocked
      c.fillStyle = '#140c1c'
      c.fillRect(x - 13, 101, 26, 7)
      c.fillStyle = locked ? '#4c4c5c' : '#d82838'
      c.fillRect(x - 12, 102, 24, 5)
      const s = icons[i]
      const bob = i === this.sel ? Math.round(Math.sin(t * 5) * 2) : 0
      drawSprite(c, s, x - 8, 101 - s.length + bob, { mode: locked ? 'shadow' : 'normal' })
      if (i === 4 && !locked) drawSprite(c, SPR.bubble, x + 6, 62 + bob, { scale: 1 })
      if (locked) drawText(c, '?', x, 82, { align: 'center', color: '#8c8c9c' })
      if (this.data.beaten.includes(i)) drawSprite(c, SPR.star, x - 3, 36)
      if (i === this.sel) {
        drawSprite(c, SPR.pomniIdle, x - 7, 112)
        drawText(c, 'V', x, 44 + (Math.floor(t * 4) % 2), { align: 'center', color: '#f8c830' })
      }
    })
    const lv = LEVELS[this.sel]
    drawText(c, lv.title, VW / 2, 140, { align: 'center', scale: 1, color: '#f4f4f4' })
    drawText(c, `BOSS: ${BOSS_NAMES[this.sel]}`, VW / 2, 150, { align: 'center', color: '#f8c830' })
    if (Math.floor(t * 2) % 2) drawText(c, '< >  PICK      JUMP  PLAY', VW / 2, 164, { align: 'center', color: '#c8b8e0' })
  }

  drawClear(c) {
    c.fillStyle = 'rgba(20, 12, 28, 0.75)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'SHOW COMPLETE!', VW / 2, 40, { scale: 3, align: 'center', color: '#f8c830' })
    drawText(c, `YOU BEAT ${BOSS_NAMES[this.levelIdx]}!`, VW / 2, 70, { scale: 1, align: 'center' })
    drawText(c, `STARS ${this.starsGot} / ${this.starsTotal}`, VW / 2, 90, { align: 'center', color: '#f8c830' })
    drawText(c, `OUCHES ${this.levelDeaths}`, VW / 2, 100, { align: 'center', color: '#c8b8e0' })
    drawSprite(c, SPR.pomniJump, VW / 2 - 14, 112 + Math.round(Math.abs(Math.sin(this.t * 6)) * -6), { scale: 2 })
    if (this.stateT > 1 && Math.floor(this.t * 2) % 2) drawText(c, 'PRESS JUMP', VW / 2, 164, { align: 'center' })
  }

  drawEnding(c) {
    const t = this.t
    this.drawBackdrop(c, t * 30, LEVELS[4])
    this.drawFloorBand(c, 144)
    drawText(c, 'YOU BEAT THE', VW / 2, 14, { scale: 2, align: 'center', color: '#f8c830' })
    drawText(c, 'WHOLE CIRCUS!', VW / 2, 30, { scale: 2, align: 'center', color: '#f8c830' })
    const cast = [SPR.jax, SPR.ragatha, SPR.gangle, SPR.pomniIdle, SPR.kinger, SPR.caine]
    cast.forEach((s, i) => {
      const x = 28 + i * 48
      const hop = Math.round(Math.abs(Math.sin(t * 4 + i)) * -6)
      drawSprite(c, s, x, 144 - s.length * 2 + hop, { scale: 2 })
    })
    drawSprite(c, SPR.bubble, 282, 50 + Math.round(Math.sin(t * 3) * 3), { scale: 2 })
    drawText(c, '...BUT WHERE IS THE EXIT?', VW / 2, 50, { align: 'center', color: '#c8b8e0' })
    drawText(c, 'THANKS FOR PLAYING!', VW / 2, 64, { align: 'center' })
    drawText(c, `TOTAL OUCHES: ${this.data.deaths}`, VW / 2, 74, { align: 'center', color: '#c8b8e0' })
    if (this.stateT > 1.5 && Math.floor(t * 2) % 2) drawText(c, 'PRESS JUMP', VW / 2, 164, { align: 'center' })
  }

  drawGlitch(c) {
    c.setTransform(1, 0, 0, 1, 0, 0)
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(rand(0, VH))
      const h = Math.floor(rand(2, 10))
      c.drawImage(this.canvas, 0, y, VW, h, Math.round(rand(-12, 12)), y, VW, h)
    }
    for (let i = 0; i < 3; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(224, 60, 156, 0.35)' : 'rgba(104, 216, 248, 0.35)'
      c.fillRect(0, Math.floor(rand(0, VH)), VW, Math.floor(rand(1, 5)))
    }
    for (let i = 0; i < 25; i++) {
      c.fillStyle = Math.random() < 0.5 ? '#140c1c' : '#f4f4f4'
      c.fillRect(Math.floor(rand(0, VW)), Math.floor(rand(0, VH)), 2, 2)
    }
  }
}
