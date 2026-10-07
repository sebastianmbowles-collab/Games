// Aliens VS Dinos: pick a side, then either beam up dinos in your UFO or roar the alien UFOs away.
// This file runs the whole game: menus, both game modes, cutscenes, particles and the HUD.

import {
  W,
  H,
  GROUND,
  WORLD,
  TAU,
  INK,
  DINO_KINDS,
  KIND_LIST,
  circle,
  rrect,
  drawDino,
  drawUFO,
  drawAlien,
  drawStar,
  drawBeam,
  drawMothership,
  drawEgg,
  drawLeaf,
  drawSky,
  drawBackdrop,
  drawGround,
  drawForeground,
  getTheme,
  mixTheme,
  drawMoon,
  text,
} from './art'
import { sfx, wakeAudio, beamOn, setVolumes, unlockAudio } from './sound'
import { playSong, stopMusic, currentSong, songBeat, playlistSteps, nextSongId } from './music'
import { PX, retroColors, flushText } from './pixel'

// Snap a position to the chunky pixel grid.
const snap = (v) => Math.round(v / PX) * PX
import { makeMath, makeSpell, quizKey, quizClick, drawQuiz } from './quiz'
import { itemLevel } from './shop'
import { loadSave, currentAccount, storeAccount, logOut } from './save'
import { tagLine } from './names'
import { openProfile, openAccount, openMultiplayer, lobbyKey, updateLobby, drawLobby, clickLobby } from './lobby'
import { newRound, hostUpdate, snapshot, applySnapshot, playEvent, drawVersus, rewardMath, rewardSpell } from './versus'
import { initTitle, updateScreen, drawScreen, clickScreen, drawBackButton, MENU_BACK } from './menus'

export { W, H }


const WAVES = 5
// After this long without playing, the game asks if you're still there.
const AFK_SECONDS = 120
const POWER_NAMES = { mega: 'MEGA ROAR', shield: 'SHIELD', speed: 'SPEED BOOST' }
// How fast the action runs: 1 is normal speed, bigger is faster.
const GAME_SPEED = 1.3
const WAVE_SECONDS = 40
const AFK_OK = { x: W / 2 - 90, y: 360, w: 180, h: 52 }
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown']
const DIFF = {
  easy: { mul: 0.75, hp: 7, lives: 5 },
  normal: { mul: 1, hp: 5, lives: 3 },
  hard: { mul: 1.3, hp: 3, lives: 2 },
}
const DEFAULT_SETTINGS = { music: 6, sound: 8, difficulty: 'normal', shake: true, cutscenes: true, autoNext: true }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, t) => a + (b - a) * t
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const easeOut = (t) => 1 - (1 - t) ** 3
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1)
const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt))

const KEYMAP = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'action',
  KeyZ: 'fire',
  KeyX: 'fire',
  KeyF: 'fire',
  KeyJ: 'fire',
  Enter: 'enter',
  KeyP: 'pause',
  Escape: 'pause',
}

// ---------- particles ----------

class FX {
  list = []
  add(p) {
    const q = { vx: 0, vy: 0, g: 0, drag: 0, life: 1, size: 4, color: '#fff', type: 'dot', rot: 0, vr: 0, age: 0, ...p }
    this.list.push(q)
    return q
  }
  burst(x, y, n, o) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU)
      const s = rand(o.speed * 0.3, o.speed)
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - (o.up || 0),
        life: rand(o.life * 0.6, o.life),
        size: rand(o.size * 0.5, o.size),
        color: Array.isArray(o.color) ? pick(o.color) : o.color,
        type: o.type || 'dot',
        g: o.g || 0,
        drag: o.drag ?? 2,
        vr: rand(-8, 8),
      })
    }
  }
  ring(x, y, r, color, life = 0.5, width = 6) {
    this.add({ x, y, size: r, color, type: 'ring', life, width })
  }
  text(x, y, text, color = '#fff', size = 26) {
    this.add({ x, y, vy: -60, drag: 1.5, text, color, size, type: 'text', life: 1.1 })
  }
  dust(x, y, n = 8) {
    this.burst(x, y, n, { speed: 140, life: 0.6, size: 9, color: ['#c9a477', '#e0c49a'], type: 'smoke', up: 40, drag: 4 })
  }
  boom(x, y) {
    this.burst(x, y, 30, { speed: 420, life: 0.7, size: 5, color: ['#fff3a0', '#ffb43a', '#ff6a2a'], type: 'spark', drag: 2.5 })
    this.burst(x, y, 16, { speed: 160, life: 1.3, size: 26, color: ['#555', '#777', '#3d3d3d'], type: 'smoke', up: 60, drag: 2 })
    this.burst(x, y, 12, { speed: 380, life: 1.6, size: 9, color: ['#9fb2d6', '#c3324a', '#5a6890'], type: 'debris', g: 1100, drag: 0.4, up: 250 })
    this.add({ x, y, size: 90, color: '#ffd36a', type: 'flash', life: 0.3 })
    this.ring(x, y, 150, '#ffd36a', 0.5, 10)
  }
  update(dt) {
    for (const p of this.list) {
      p.age += dt
      const d = Math.exp(-p.drag * dt)
      p.vx *= d
      p.vy = p.vy * d + p.g * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      if (p.type === 'debris' && p.y > GROUND && p.vy > 0) {
        p.y = GROUND
        p.vy *= -0.4
        p.vx *= 0.6
      }
    }
    this.list = this.list.filter((p) => p.age < p.life)
  }
  draw(ctx) {
    for (const p of this.list) {
      const f = p.age / p.life
      const a = 1 - f
      ctx.save()
      switch (p.type) {
        case 'dot': {
          ctx.globalAlpha = a
          ctx.fillStyle = p.color
          const s = Math.max(PX, snap(p.size * (1 - f * 0.5)))
          ctx.fillRect(snap(p.x - s / 2), snap(p.y - s / 2), s, s)
          break
        }
        case 'glow':
          ctx.globalAlpha = a
          ctx.fillStyle = p.color
          ctx.fillRect(snap(p.x), snap(p.y), p.size > 9 ? PX * 2 : PX, p.size > 9 ? PX * 2 : PX)
          break
        case 'spark':
          ctx.globalAlpha = a
          ctx.fillStyle = p.color
          ctx.fillRect(snap(p.x), snap(p.y), PX, PX)
          if (f < 0.6) ctx.fillRect(snap(p.x - p.vx * 0.025), snap(p.y - p.vy * 0.025), PX, PX)
          break
        case 'smoke':
          ctx.globalAlpha = a * 0.7
          ctx.fillStyle = p.color
          circle(ctx, p.x, p.y, p.size * (0.5 + f))
          ctx.fill()
          break
        case 'ring':
          ctx.globalAlpha = a
          ctx.strokeStyle = p.color
          ctx.lineWidth = (p.width || 6) * a + 1
          circle(ctx, p.x, p.y, p.size * easeOut(f))
          ctx.stroke()
          break
        case 'flash': {
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = a
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * (0.6 + f))
          g.addColorStop(0, '#fff')
          g.addColorStop(0.4, p.color)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          circle(ctx, p.x, p.y, p.size * (0.6 + f))
          ctx.fill()
          break
        }
        case 'debris': {
          ctx.globalAlpha = Math.min(1, a * 3)
          const s = Math.max(PX, snap(p.size * 0.7))
          ctx.fillStyle = INK
          ctx.fillRect(snap(p.x) - PX, snap(p.y) - PX, s + PX * 2, s + PX * 2)
          ctx.fillStyle = p.color
          ctx.fillRect(snap(p.x), snap(p.y), s, s)
          break
        }
        case 'star':
          ctx.globalAlpha = a
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          drawStar(ctx, 0, 0, p.size, p.color)
          break
        case 'heart':
          ctx.globalAlpha = a
          text(ctx, '❤', p.x, p.y, p.size, p.color)
          break
        case 'text': {
          ctx.globalAlpha = Math.min(1, a * 2)
          const s = p.size * (f < 0.15 ? 0.6 + (f / 0.15) * 0.6 : 1.2 - Math.min(0.2, f))
          text(ctx, p.text, p.x, p.y, s, p.color)
          break
        }
      }
      ctx.restore()
    }
  }
}

// ---------- characters ----------

export class Dino {
  constructor(x, kind, scale = 1) {
    this.x = x
    this.y = GROUND
    this.vx = 0
    this.vy = 0
    this.kind = kind
    this.scale = scale
    this.face = Math.random() < 0.5 ? -1 : 1
    this.state = 'walk' // walk | lifted | fall | gone
    this.walk = rand(0, TAU)
    this.target = x
    this.think = 0
    this.seed = rand(0, 10)
    this.liftedBy = null
    this.scared = 0
    this.offset = rand(-140, 140)
    this.squash = 0
  }
  get lift() {
    return DINO_KINDS[this.kind].lift
  }
  // Ground physics shared by everyone: falling back down after a beam lets go.
  physics(dt, fx) {
    if (this.state === 'fall') {
      this.vy += 1500 * dt
      this.y += this.vy * dt
      this.x += this.vx * dt
      if (this.y >= GROUND) {
        this.y = GROUND
        this.vy = 0
        this.state = 'walk'
        this.squash = 1
        this.scared = 2
        fx.dust(this.x, GROUND, 8)
        sfx.land()
      }
    }
    this.squash = Math.max(0, this.squash - dt * 4)
    this.scared = Math.max(0, this.scared - dt)
    this.x = clamp(this.x, 30, WORLD - 30)
  }
  draw(ctx, time, extra = {}) {
    ctx.save()
    ctx.translate(this.x, this.y)
    if (this.state === 'lifted') ctx.rotate(Math.sin(time * 4 + this.seed) * 0.25)
    const sq = Math.sin(this.squash * Math.PI) * 0.25
    ctx.scale(this.face * this.scale * (1 + sq), this.scale * (1 - sq))
    drawDino(ctx, this.kind, {
      time: time + this.seed,
      walk: this.walk,
      moving: this.state === 'walk' && Math.abs(this.vx) > 15,
      scared: this.scared > 0 || this.state !== 'walk',
      flail: this.state === 'lifted',
      blink: (time + this.seed) % 4 < 0.12,
      ...extra,
    })
    ctx.restore()
  }
}

class Saucer {
  constructor(x, y, enemy = true) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.enemy = enemy
    this.hp = 3
    this.tilt = 0
    this.hurt = 0
    this.stun = 0
    this.state = 'hunt'
    this.timer = 0
    this.target = null
    this.beaming = false
    this.shootCd = rand(1.5, 3)
    this.seed = rand(0, 10)
    this.hoverY = rand(150, 200)
  }
  draw(ctx, time) {
    ctx.save()
    ctx.translate(this.x, this.y + Math.sin(time * 2.5 + this.seed) * 4)
    drawUFO(ctx, { time: time + this.seed, enemy: this.enemy, tilt: this.tilt, hurt: this.hurt > 0, stun: this.stun > 0, beam: this.beaming })
    ctx.restore()
  }
}

// Is the point (x, y) inside a tractor beam shining down from (bx, by)?
export function inBeam(bx, by, x, y, wide = 70) {
  if (y < by + 10) return false
  const f = clamp((y - by) / (GROUND - by), 0, 1)
  return Math.abs(x - bx) < 16 + (wide - 16) * f + 12
}

// ---------- the game ----------

export class AliensVsDinos {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    // everything is drawn on this tiny screen first, then blown up into chunky 8-bit pixels
    this.lo = document.createElement('canvas')
    this.lo.width = W / PX
    this.lo.height = H / PX
    this.lctx = this.lo.getContext('2d', { willReadFrequently: true })
    this.time = 0
    this.fx = new FX()
    this.keys = {}
    this.pressed = new Set()
    this.mouse = { x: -1, y: -1 }
    this.shake = 0
    this.slowmo = 0
    this.flash = 0
    this.scene = 'title'
    this.sceneT = 0
    // everything about the player who's logged in (see save.js)
    loadSave()
    this.useAccount(currentAccount())
    initTitle(this)
    this.side = null
    this.menuPick = 0
    this.menuT = 0
    this.cam = { x: W / 2, y: H / 2, zoom: 1 }

    this.lastInput = 0
    this.afkT = 0
    this.onKeyDown = (e) => {
      this.lastInput = this.time
      if (this.afk && (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) {
        e.preventDefault()
        this.closeAfk()
        return
      }
      if (lobbyKey(this, e)) {
        e.preventDefault()
        wakeAudio()
        return
      }
      if ((this.scene === 'play' || this.scene === 'vs') && this.quiz && !this.quiz.doneT) {
        const r = quizKey(this.quiz, e.code)
        if (r !== undefined) {
          e.preventDefault()
          wakeAudio()
          if (r) this.quizResult(r)
          return
        }
      }
      const k = KEYMAP[e.code]
      if (!k) return
      wakeAudio()
      e.preventDefault()
      if (!this.keys[k]) this.pressed.add(k)
      this.keys[k] = true
    }
    this.onKeyUp = (e) => {
      const k = KEYMAP[e.code]
      if (k) this.keys[k] = false
    }
    this.onPointerDown = (e) => {
      wakeAudio()
      this.lastInput = this.time
      const p = this.toCanvas(e)
      this.mouse = p
      if (this.afk) {
        const b = AFK_OK
        if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) this.closeAfk()
        return
      }
      this.click(p.x, p.y)
    }
    this.onPointerMove = (e) => {
      this.mouse = this.toCanvas(e)
      this.mouseMoved = true
    }
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    this.onUnlock = () => unlockAudio()
    for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, this.onUnlock, true)
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)

    this.last = performance.now()
    const loop = (now) => {
      const dt = Math.min(1 / 30, (now - this.last) / 1000)
      this.last = now
      this.update(dt)
      this.draw()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
    wakeAudio()
    this.applySettings()
    playSong('title')

  }

  destroy() {
    cancelAnimationFrame(this.raf)
    stopMusic()
    beamOn(false)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, this.onUnlock, true)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
  }

  toCanvas(e) {
    const r = this.canvas.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  // Used by the on-screen touch buttons.
  setKey(k, down) {
    wakeAudio()
    this.lastInput = this.time
    if (down && !this.keys[k]) this.pressed.add(k)
    this.keys[k] = down
  }

  // ---------- flow between screens ----------

  get diff() {
    return DIFF[this.settings.difficulty] || DIFF.normal
  }

  applySettings() {
    setVolumes(this.settings.sound / 10, this.settings.music / 10)
  }

  saveSettings() {
    this.applySettings()
    this.persist()
  }

  // ---------- players: log in, log out, remember everything ----------

  useAccount(acc) {
    this.profile = acc?.profile || null
    this.pass = acc?.pass || null
    this.shop = acc?.shop || { coins: 0, owned: {} }
    this.best = acc?.best || { aliens: 0, dinos: 0 }
    this.settings = { ...DEFAULT_SETTINGS, ...(acc?.settings || this.settings || {}) }
    this.applySettings()
  }

  // Saves this player's name, year, coins, shop items, best scores and settings.
  persist() {
    if (this.profile) storeAccount({ profile: this.profile, pass: this.pass, shop: this.shop, best: this.best, settings: this.settings })
  }

  logIn(acc) {
    this.useAccount(acc)
    this.persist()
    this.toast = { text: `WELCOME BACK, ${acc.profile.name}!`, t: 3 }
    sfx.win()
  }

  newPlayer(profile, pass) {
    this.useAccount({ profile, pass, settings: this.settings })
    this.persist()
    this.toast = { text: `HI ${profile.name}! LET'S PLAY!`, t: 3 }
  }

  logOutPlayer() {
    const name = this.profile?.name
    this.persist()
    logOut()
    this.useAccount(null)
    this.goTitle()
    if (name) this.toast = { text: `BYE ${name}! YOUR GAME IS SAVED.`, t: 3 }
  }

  goScene(name) {
    beamOn(false)
    this.scene = name
    this.sceneT = 0
    this.fx.list = []
  }

  isMenuScreen() {
    return ['title', 'settings', 'jukebox', 'shop'].includes(this.scene)
  }

  goShop() {
    this.shopFrom = this.scene
    this.goScene('shop')
    this.title.shopTab = this.side || 'aliens'
    this.title.shopSel = 0
  }

  goBack() {
    if (this.shopFrom === 'over') {
      this.scene = 'over'
      this.fx.list = []
    } else this.goTitle()
  }

  lvl(key) {
    return itemLevel(this.shop, this.side, key)
  }

  // Coins go straight into the shop savings, so they're never lost.
  earn(n, x, y) {
    this.shop.coins += n
    this.coinsRun += n
    this.persist()
    if (x !== undefined) this.fx.text(x, y, `+${n} $`, '#fee761', 18)
  }

  // ---------- math and spelling quizzes ----------

  // Math and spelling follow your school year (Year 1 to 6).
  quizLevel() {
    return this.profile?.year || 3
  }

  openQuiz(hint) {
    if (this.quiz || this.ending) return
    this.quiz = this.side === 'aliens' ? makeMath(this.quizLevel()) : makeSpell(this.quizLevel(), this.lastWord)
    this.quiz.hint = hint
    sfx.warn()
  }

  quizResult(r) {
    const q = this.quiz
    if (r === 'wrong') {
      sfx.hurt()
      return
    }
    if (r === 'letter') {
      sfx.pickup()
      return
    }
    // correct!
    q.doneT = 0.7
    sfx.capture()
    if (this.scene === 'vs') {
      // in a 2-player game the host's game hands out the reward
      const vs = this.vs
      const host = vs.role === 'host'
      if (this.side === 'aliens') {
        if (host) rewardMath(this)
        else vs.mc++
      } else if (host) rewardSpell(this)
      else vs.sc++
      if (q.word) this.lastWord = q.word
      this.earn(2)
      return
    }
    if (this.side === 'aliens') {
      const p = this.ufo
      p.fuel = Math.min(1, p.fuel + 0.7)
      p.ammo = Math.min(15, p.ammo + 5)
      p.energy = 1
      p.overheat = false
      this.fx.text(p.x, p.y - 60, 'REFUELED! +5 LASERS', '#2ce8f5', 22)
      this.fx.burst(p.x, p.y, 16, { speed: 200, life: 0.6, size: 6, color: ['#2ce8f5', '#ffffff'], type: 'star' })
      this.score += 50
      this.earn(3)
    } else {
      const r2 = this.rex
      const add = 3 + this.lvl('pouch')
      r2.roars += add
      this.lastWord = q.word
      this.fx.text(r2.x, r2.y - 130, `+${add} ROARS!`, '#feae34', 24)
      // good spelling also earns a power-up
      const kind = pick(['mega', 'shield', 'speed'])
      this.power = { kind, t: 12 }
      this.fx.text(r2.x, r2.y - 165, `${POWER_NAMES[kind]}!`, '#63c74d', 26)
      if (kind === 'shield') this.releaseRex()
      this.fx.burst(r2.x, r2.y - 80, 16, { speed: 200, life: 0.6, size: 6, color: ['#feae34', '#ffffff'], type: 'star' })
      this.score += 20 * q.word.length
      this.earn(2 + Math.ceil(q.word.length / 2))
    }
  }

  updateQuiz(dt) {
    const q = this.quiz
    if (!q) return
    q.t += dt
    q.shake = Math.max(0, q.shake - dt)
    if (q.doneT) {
      q.doneT -= dt
      if (q.doneT <= 0) this.quiz = null
    }
  }

  goTitle() {
    this.goScene('title')
    if (!this.userSong) playSong('title')
  }

  // Songs picked in the jukebox play one after another, like a playlist.
  updatePlaylist() {
    if (!this.userSong || !this.settings.autoNext) return
    const id = currentSong()
    if (id && songBeat() >= playlistSteps(id)) playSong(nextSongId(id))
  }

  // ---------- "are you still there?" ----------

  checkAfk(dt) {
    if (this.afk) return
    const inGame = this.scene === 'play' || this.scene === 'vs' || this.scene === 'cutscene'
    if (this.scene === 'cutscene') this.lastInput = this.time
    // in a game, being away means not touching the controls; anywhere else, it's not playing at all
    this.afkT = inGame ? this.time - this.lastInput : this.afkT + dt
    if (inGame && this.time - this.lastInput < 1) this.afkT = 0
    if (this.afkT > AFK_SECONDS) {
      this.afk = { t: 0 }
      beamOn(false)
      sfx.warn()
    }
  }

  closeAfk() {
    sfx.click()
    this.afk = null
    this.afkT = 0
    this.lastInput = this.time
  }

  drawAfk(ctx) {
    ctx.fillStyle = 'rgba(15,10,40,0.75)'
    ctx.fillRect(0, 0, W, H)
    rrect(ctx, 150, 90, 660, 360, 18)
    ctx.fillStyle = '#181425'
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#feae34'
    ctx.stroke()
    const name = this.profile?.name || 'HEY'
    text(ctx, `${name}, why are you not playing?`, W / 2, 150, 24, '#feae34')
    text(ctx, 'Are you chatting to a friend?', W / 2, 205, 19, '#ffffff')
    text(ctx, 'Looking at the shop?', W / 2, 240, 19, '#ffffff')
    text(ctx, 'Jamming out at the jukebox?', W / 2, 275, 19, '#ffffff')
    text(ctx, 'Please play, or you are wasting time!', W / 2, 325, 21, '#fee761')
    const b = AFK_OK
    const hover = this.mouse.x > b.x && this.mouse.x < b.x + b.w && this.mouse.y > b.y && this.mouse.y < b.y + b.h
    rrect(ctx, b.x, b.y + (hover ? -2 : 0), b.w, b.h, 24)
    ctx.fillStyle = '#63c74d'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = INK
    ctx.stroke()
    text(ctx, 'OK', b.x + b.w / 2, b.y + 34 + (hover ? -2 : 0), 26, INK, 'center', false)
  }

  // PLAY: first make sure we know your name and school year.
  // the LOG IN / LOG OUT button on the title screen
  loginPressed() {
    if (this.profile) this.logOutPlayer()
    else openProfile(this, () => this.goTitle())
  }

  playPressed() {
    if (this.profile) this.goMenu()
    else openProfile(this, () => this.goMenu())
  }

  twoPlayerPressed() {
    if (this.profile) openMultiplayer(this)
    else openProfile(this, () => openMultiplayer(this))
  }

  editProfile() {
    openAccount(this)
  }

  tag() {
    return tagLine(this.side, this.profile || { name: 'PLAYER', year: 3 })
  }

  startVersus(role, mySide, session, them) {
    const me = { name: this.profile.name, year: this.profile.year }
    const other = them || session.theirs() || {}
    const otherSide = mySide === 'aliens' ? 'dinos' : 'aliens'
    this.vs = { role, mySide, session, round: role === 'host' ? 1 : 0, names: { [mySide]: me, [otherSide]: { name: other.name, year: other.year } }, cnt: { f: 0, j: 0, ac: 0 }, mc: 0, sc: 0, lostT: 0, evId: 0 }
    this.side = mySide
    this.ending = null
    this.coinsRun = 0
    newRound(this)
    this.scene = 'vs'
    this.fx.list = []
    this.userSong = false
    playSong(mySide === 'aliens' ? 'ufo' : 'stomp')
    sfx.wave()
  }

  leaveVersus() {
    beamOn(false)
    this.vs?.session.close()
    this.vs = null
    this.quiz = null
    this.goTitle()
  }

  updateVersus(dt) {
    const vs = this.vs
    const them = vs.session.theirs()
    vs.lostT = them ? 0 : vs.lostT + dt
    if (this.pressed.has('pause')) return this.leaveVersus()
    if (vs.session.error && vs.lostT > 3) return this.leaveVersus()
    this.updateQuiz(dt)
    // your own quizzes: math for the UFO, spelling for the T. rex
    const p = this.pressed
    if (!vs.winner) {
      if (this.side === 'aliens') {
        if (vs.ufo.fuel < 0.25) this.openQuiz('LOW FUEL! SOLVE IT TO REFUEL!')
        if (p.has('fire') && vs.ufo.ammo <= 0) this.openQuiz('NO LASER! SOLVE IT TO CHARGE UP!')
      } else if (vs.rex.roars <= 0 && vs.rex.power?.kind !== 'mega') this.openQuiz('OUT OF ROARS! SPELL IT TO ROAR!')
      if (p.has('enter') && !this.quiz) this.openQuiz()
    }
    if (vs.role === 'host') {
      hostUpdate(this, dt, them)
      for (const ev of vs.events) playEvent(this, ev)
      vs.session.mine({ role: 'host', name: this.profile.name, year: this.profile.year, side: vs.mySide, ph: 'play', s: snapshot(this) })
      if (vs.winner && vs.overT > 1.5 && p.has('enter')) {
        vs.round++
        newRound(this)
      }
    } else {
      if (them?.ph === 'play') applySnapshot(this, them.s)
      if (p.has('fire')) vs.cnt.f++
      if (p.has('up') || p.has('fire')) vs.cnt.j++
      if (p.has('action')) vs.cnt.ac++
      const k = this.keys
      const frozen = this.quiz && !this.quiz.doneT
      vs.session.mine({
        role: 'guest',
        name: this.profile.name,
        year: this.profile.year,
        ph: 'play',
        i: { l: !!k.left, r: !!k.right, u: !!k.up, d: !!k.down, a: !!k.action && !frozen, f: vs.cnt.f, j: vs.cnt.j, ac: vs.cnt.ac },
        q: frozen ? 1 : 0,
        mc: vs.mc,
        sc: vs.sc,
      })
    }
    beamOn(vs.ufo.beaming && !vs.winner)
    const target = this.side === 'aliens' ? vs.ufo : vs.rex
    this.cam.x = approach(this.cam.x, clamp(target.x + (target.vx || 0) * 0.3, W / 2, WORLD - W / 2), 4, dt)
  }

  goMenu() {
    this.goScene('menu')
    this.menuT = 0
  }

  choose(side) {
    sfx.select()
    this.side = side
    this.userSong = false
    playSong(side === 'aliens' ? 'ufo' : 'stomp')
    if (!this.settings.cutscenes) {
      this.startPlay()
      return
    }
    this.startCutscene(side === 'aliens' ? 'alienIntro' : 'dinoIntro', () => this.startPlay())
  }

  startPlay() {
    this.scene = 'play'
    this.fx.list = []
    this.score = 0
    this.wave = 1
    this.banner = { text: this.tag(), sub: this.side === 'aliens' ? 'WAVE 1: Beam up 6 dinos!' : `WAVE 1: Survive ${WAVE_SECONDS} seconds!`, t: 0 }
    this.power = null
    this.pickups = []
    this.eggs = []
    this.bolts = []
    this.plasma = []
    this.ending = null
    this.quiz = null
    this.coinsRun = 0
    if (this.side === 'aliens') this.setupAliens()
    else this.setupDinos()
    this.cam.x = clamp(this.playerX(), W / 2, WORLD - W / 2)
    this.cam.y = H / 2
    this.cam.zoom = 1
    this.userSong = false
    playSong(this.side === 'aliens' ? 'ufo' : 'stomp')
    sfx.wave()
  }

  playerX() {
    return this.side === 'aliens' ? this.ufo.x : this.rex.x
  }

  // End of a game: a short slow-motion moment, then the ending cutscene, then the results.
  finish(won) {
    if (this.ending) return
    beamOn(false)
    this.ending = { won, t: 0 }
    this.quiz = null
    this.banner = null
    this.slowmo = 0.8
    if (won) sfx.win()
    else sfx.lose()
    playSong(won ? 'victory' : 'lullaby')
    const best = this.best[this.side] || 0
    this.newBest = this.score > best
    if (this.newBest) {
      this.best[this.side] = this.score
      this.persist()
    }
  }

  click(x, y) {
    if (this.isMenuScreen()) {
      clickScreen(this, { x, y })
    } else if (this.scene === 'menu') {
      if (x > MENU_BACK.x && x < MENU_BACK.x + MENU_BACK.w && y > MENU_BACK.y && y < MENU_BACK.y + MENU_BACK.h) {
        sfx.click()
        this.goTitle()
        return
      }
      if (this.menuT < 0.6) return
      const card = this.menuCards().find((c) => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h)
      if (card) this.choose(card.side)
    } else if (this.scene === 'cutscene') {
      this.skipCutscene()
    } else if (this.scene === 'over') {
      for (const b of this.overButtons()) {
        if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
          sfx.click()
          b.go()
        }
      }
    } else if (this.scene === 'paused') {
      this.scene = 'play'
    } else if (this.scene === 'profile' || this.scene === 'mp' || this.scene === 'account') {
      clickLobby(this, { x, y })
    } else if ((this.scene === 'play' || this.scene === 'vs') && this.quiz && !this.quiz.doneT) {
      const r = quizClick(this.quiz, x, y)
      if (r) this.quizResult(r)
    }
  }

  // ---------- update ----------

  update(realDt) {
    this.time += realDt
    this.slowmo = Math.max(0, this.slowmo - realDt)
    const dt = realDt * (this.slowmo > 0 ? 0.3 : 1) * (this.scene === 'play' ? GAME_SPEED : 1)
    this.shake = Math.max(0, this.shake - realDt * 40)
    this.flash = Math.max(0, this.flash - realDt * 2.5)

    this.sceneT += realDt
    this.updatePlaylist()
    this.checkAfk(realDt)
    if (this.afk && this.scene !== 'vs') {
      // everything waits until you press OK
      beamOn(false)
      this.pressed.clear()
      this.mouseMoved = false
      return
    }
    // crickets chirping (and now and then an owl) all through the night
    this.ambT = (this.ambT ?? 1) - realDt
    if (this.ambT <= 0 && this.scene !== 'paused' && this.scene !== 'jukebox') {
      this.ambT = rand(0.5, 1.8)
      if (Math.random() < 0.06) sfx.owl()
      else sfx.cricket()
    }
    if (this.isMenuScreen()) updateScreen(this, realDt)
    else if (this.scene === 'menu') this.updateMenu(realDt)
    else if (this.scene === 'profile' || this.scene === 'mp' || this.scene === 'account') updateLobby(this, realDt)
    else if (this.scene === 'vs') this.updateVersus(dt)
    else if (this.scene === 'cutscene') this.updateCutscene(realDt)
    else if (this.scene === 'play') {
      if (this.pressed.has('pause')) {
        this.scene = 'paused'
        beamOn(false)
      } else {
        // the game waits while you answer a quiz
        const frozen = this.quiz && !this.quiz.doneT
        this.updateQuiz(dt)
        if (this.pressed.has('enter') && !this.quiz) this.openQuiz()
        if (frozen) beamOn(false)
        else {
          if (this.side === 'aliens') this.updateAliens(dt)
          else this.updateDinos(dt)
          this.updateCamera(dt)
          if (Math.random() < dt * 5) {
            this.fx.add({ x: this.cam.x + rand(-W / 2, W / 2), y: GROUND - rand(10, 160), vx: rand(-20, 20), vy: rand(-15, 15), life: rand(2, 4), size: 7, color: '#d8ff6a', type: 'glow', drag: 0 })
          }
          if (this.banner) {
            this.banner.t += dt
            if (this.banner.t > 3.2) this.banner = null
          }
        }
        if (this.ending) {
          this.ending.t += realDt
          if (this.ending.t > 1.4) {
            const name = (this.side === 'aliens' ? 'alien' : 'dino') + (this.ending.won ? 'Win' : 'Lose')
            const toResults = () => {
              this.scene = 'over'
              this.overT = 0
            }
            if (this.settings.cutscenes) this.startCutscene(name, toResults)
            else toResults()
          }
        }
      }
    } else if (this.scene === 'paused') {
      if (this.pressed.has('pause') || this.pressed.has('enter') || this.pressed.has('action')) this.scene = 'play'
    } else if (this.scene === 'over') {
      this.overT += realDt
      if (this.pressed.has('enter') || this.pressed.has('action')) this.overButtons()[0].go()
      if (this.pressed.has('pause')) this.goTitle()
    }
    this.fx.update(dt)
    this.pressed.clear()
    this.mouseMoved = false
  }

  updateCamera(dt) {
    const p = this.side === 'aliens' ? this.ufo : this.rex
    const lead = (p.vx || 0) * 0.35
    const tx = clamp(p.x + lead, W / 2, WORLD - W / 2)
    this.cam.x = approach(this.cam.x, tx, 4, dt)
  }

  updateMenu(dt) {
    this.menuT += dt
    const k = this.pressed
    if (k.has('left')) {
      this.menuPick = 0
      sfx.click()
    }
    if (k.has('right')) {
      this.menuPick = 1
      sfx.click()
    }
    const hover = this.menuCards().findIndex((c) => this.mouse.x > c.x && this.mouse.x < c.x + c.w && this.mouse.y > c.y && this.mouse.y < c.y + c.h)
    if (this.mouseMoved && hover >= 0 && hover !== this.menuPick) this.menuPick = hover
    if (k.has('pause')) {
      this.goTitle()
      return
    }
    if ((k.has('enter') || k.has('action')) && this.menuT > 0.6) this.choose(this.menuCards()[this.menuPick].side)
    // drifting sparkles
    if (Math.random() < dt * 12) {
      this.fx.add({ x: rand(0, W), y: H + 10, vy: rand(-60, -30), vx: rand(-10, 10), life: 6, size: rand(1.5, 3.5), color: pick(['#7dffb0', '#ffe14a', '#ff8fb0']), type: 'dot', drag: 0 })
    }
  }

  menuCards() {
    return [
      { side: 'aliens', x: 110, y: 170, w: 340, h: 280 },
      { side: 'dinos', x: 510, y: 170, w: 340, h: 280 },
    ]
  }

  overButtons() {
    return [
      { label: 'Play again', x: W / 2 - 230, y: 400, w: 210, h: 56, go: () => this.startPlay() },
      { label: 'Shop', x: W / 2 + 20, y: 400, w: 210, h: 56, go: () => this.goShop() },
      { label: 'Title screen', x: W / 2 - 105, y: 470, w: 210, h: 44, go: () => this.goTitle() },
    ]
  }

  // ---------- ALIENS mode: you fly the UFO ----------

  setupAliens() {
    this.ufo = { x: 600, y: 170, vx: 0, vy: 0, hp: this.diff.hp + this.lvl('shield'), maxHp: this.diff.hp + this.lvl('shield'), fuel: 1, ammo: 6, energy: 1, overheat: false, beaming: false, tilt: 0, inv: 0, laserCd: 0, face: 1, hurt: 0 }
    this.dinos = []
    for (let i = 0; i < 7; i++) this.dinos.push(new Dino(rand(200, WORLD - 200), pick(KIND_LIST)))
    this.enemies = [new Saucer(WORLD - 200, -80)]
    this.captured = 0
    this.goal = 6
    this.stolen = 0
    this.enemyRespawn = []
  }

  beamWidth() {
    return 70 * (1 + 0.25 * this.lvl('beam'))
  }

  updateAliens(dt) {
    const p = this.ufo
    const fx = this.fx
    const k = this.keys
    const alive = !this.ending

    // smooth flying: push with the arrows, then glide to a stop
    // fuel burns as you fly; when it runs low you solve a math problem to refuel
    const engine = p.fuel > 0
    if (alive) {
      p.fuel = Math.max(0, p.fuel - dt * (0.03 + (p.beaming ? 0.02 : 0)) * (1 - 0.2 * this.lvl('tank')))
      if (p.fuel < 0.25) this.openQuiz(p.fuel <= 0 ? 'OUT OF FUEL! SOLVE IT TO FLY!' : 'LOW FUEL! SOLVE IT TO REFUEL!')
    }
    if (!engine) {
      p.vy += 80 * dt
      if (Math.random() < dt * 6) fx.add({ x: p.x + rand(-20, 20), y: p.y + 10, vy: 30, life: 0.8, size: 12, color: '#5a6988', type: 'smoke', drag: 1 })
    }
    const ix = alive && engine ? (k.right ? 1 : 0) - (k.left ? 1 : 0) : 0
    const iy = alive && engine ? (k.down ? 1 : 0) - (k.up ? 1 : 0) : 0
    p.vx += ix * 1700 * dt
    p.vy += iy * 1500 * dt
    p.vx *= Math.exp(-3 * dt)
    p.vy *= Math.exp(-3.5 * dt)
    const sp = Math.hypot(p.vx, p.vy)
    if (sp > 430) {
      p.vx *= 430 / sp
      p.vy *= 430 / sp
    }
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.x < 60 || p.x > WORLD - 60) p.vx *= -0.3
    if (p.y < 70 || p.y > 330) p.vy *= -0.3
    p.x = clamp(p.x, 60, WORLD - 60)
    p.y = clamp(p.y, 70, 330)
    if (ix) p.face = ix
    p.tilt = approach(p.tilt, p.vx / 430 * 0.3, 8, dt)
    p.inv = Math.max(0, p.inv - dt)
    p.hurt = Math.max(0, p.hurt - dt)
    p.laserCd -= dt

    if (this.ending && !this.ending.won) {
      // crashing: spin and smoke
      p.vy += 300 * dt
      p.tilt += dt * 6
      if (Math.random() < dt * 30) fx.add({ x: p.x, y: p.y, vx: rand(-30, 30), vy: -40, life: 1.2, size: 18, color: '#444', type: 'smoke', drag: 1 })
    }

    // tractor beam
    const wantBeam = alive && engine && k.action
    if (p.overheat && p.energy > 0.35) p.overheat = false
    p.beaming = wantBeam && !p.overheat && p.energy > 0
    if (p.beaming) {
      p.energy -= 0.2 * dt
      if (p.energy <= 0) {
        p.energy = 0
        p.overheat = true
        fx.text(p.x, p.y - 50, 'Beam recharging...', '#9fffd0', 18)
      }
      if (Math.random() < dt * 30) {
        fx.add({ x: p.x + rand(-60, 60), y: GROUND - 4, vy: rand(-220, -120), life: 1, size: rand(2, 4), color: '#bfffe0', type: 'glow', drag: 0.5 })
      }
    } else {
      p.energy = Math.min(1, p.energy + 0.28 * dt)
    }
    beamOn(p.beaming)

    if (alive && this.pressed.has('fire') && p.laserCd <= 0 && p.ammo <= 0) {
      p.laserCd = 0.4
      fx.text(p.x, p.y - 50, 'NO LASER CHARGE!', '#ff8fa0', 18)
      this.openQuiz('NO LASER! SOLVE IT TO CHARGE UP!')
    } else if (alive && engine && this.pressed.has('fire') && p.laserCd <= 0) {
      p.ammo--
      p.laserCd = 0.28
      const ys = this.lvl('laser') ? [-6, 14] : [4]
      for (const dy of ys) this.bolts.push({ x: p.x + p.face * 50, y: p.y + dy, vx: p.face * 950 + p.vx * 0.3, life: 0.9 })
      fx.burst(p.x + p.face * 50, p.y + 4, 5, { speed: 120, life: 0.25, size: 4, color: '#9fffd0', type: 'spark' })
      sfx.laser()
    }

    // dinos
    for (const d of this.dinos) {
      if (d.state === 'gone') continue
      if (d.state === 'walk') this.dinoWander(d, dt, p.beaming ? 260 : 170, p)
      if (d.state === 'lifted' && d.liftedBy === p) {
        if (!p.beaming || !inBeam(p.x, p.y, d.x, d.y - 30, this.beamWidth())) {
          d.state = 'fall'
          d.liftedBy = null
          d.vy = 0
          d.vx = 0
        } else {
          d.y -= 150 * (1 + 0.25 * this.lvl('beam')) * d.lift * dt
          d.x = approach(d.x, p.x, 3, dt)
          if (Math.random() < dt * 20) fx.add({ x: d.x + rand(-20, 20), y: d.y - 20, vy: 60, life: 0.5, size: 3, color: '#bfffe0', type: 'glow' })
          if (d.y - 30 < p.y + 12) this.captureDino(d)
        }
      } else if (p.beaming && (d.state === 'walk' || d.state === 'fall') && inBeam(p.x, p.y, d.x, d.y - 30, this.beamWidth())) {
        d.state = 'lifted'
        d.liftedBy = p
        sfx.squeak()
        fx.text(d.x, d.y - 80, pick(['Eek!', 'Help!', 'Noooo!', 'Whoa!']), '#fff', 18)
      }
      d.physics(dt, fx)
    }

    // eggs hatch new dinos so there are always some to catch
    const living = this.dinos.filter((d) => d.state !== 'gone').length + this.eggs.length
    if (living < 7 && Math.random() < dt * 0.8) {
      let x = rand(150, WORLD - 150)
      if (Math.abs(x - p.x) < 300) x = clamp(x + 600, 150, WORLD - 150)
      this.eggs.push({ x, t: 0 })
    }
    for (const egg of this.eggs) {
      egg.t += dt
      if (egg.t > 2) {
        egg.done = true
        const d = new Dino(egg.x, pick(KIND_LIST))
        d.squash = 1
        this.dinos.push(d)
        fx.burst(egg.x, GROUND - 14, 14, { speed: 200, life: 0.6, size: 5, color: ['#fff3d6', '#7ccf73'], type: 'debris', g: 900, up: 150 })
        fx.text(egg.x, GROUND - 60, 'Hatch!', '#fff3a0', 18)
        sfx.hatch()
      }
    }
    this.eggs = this.eggs.filter((e) => !e.done)
    this.dinos = this.dinos.filter((d) => d.state !== 'gone')

    // enemy UFOs
    for (const e of this.enemies) this.enemyAliensAI(e, dt)
    this.updateShots(dt)
    this.enemies = this.enemies.filter((e) => !e.dead)
    for (const r of this.enemyRespawn) r.t -= dt
    for (let i = this.enemyRespawn.filter((r) => r.t <= 0).length; i > 0; i--) {
      this.enemies.push(new Saucer(Math.random() < 0.5 ? this.cam.x - W / 2 - 100 : this.cam.x + W / 2 + 100, -60))
      fx.text(clamp(p.x, 100, WORLD - 100), 90, 'Rival UFO incoming!', '#ff8fa0', 20)
    }
    this.enemyRespawn = this.enemyRespawn.filter((r) => r.t > 0)

    // wave cleared?
    if (alive && this.captured >= this.goal) {
      if (this.wave >= WAVES) this.finish(true)
      else this.nextWave()
    }
  }

  dinoWander(d, dt, fearRange, ufo) {
    d.think -= dt
    const threats = [ufo, ...(this.enemies || [])].filter((u) => u && Math.abs(u.x - d.x) < fearRange && (u.beaming || u === ufo))
    if (threats.length) {
      const u = threats[0]
      const dir = Math.sign(d.x - u.x) || 1
      d.target = d.x + dir * 300
      d.scared = 0.5
      if (Math.random() < dt * 0.6 && d.y >= GROUND) {
        d.state = 'fall'
        d.vy = -420
        d.vx = dir * 160
      }
    } else if (d.think <= 0) {
      d.think = rand(1.5, 4)
      d.target = clamp(d.x + rand(-300, 300), 60, WORLD - 60)
    }
    const fast = d.kind === 'raptor' ? 1.5 : d.kind === 'bronto' ? 0.7 : 1
    const speed = (d.scared > 0 ? 190 : 60) * fast
    const want = Math.abs(d.target - d.x) > 10 ? Math.sign(d.target - d.x) * speed : 0
    d.vx = approach(d.vx, want, 6, dt)
    if (d.state === 'walk') d.x += d.vx * dt
    if (Math.abs(d.vx) > 5) d.face = Math.sign(d.vx)
    d.walk += Math.abs(d.vx) * dt * 0.09
  }

  captureDino(d) {
    const fx = this.fx
    d.state = 'gone'
    this.captured++
    const pts = d.kind === 'bronto' ? 200 : 100
    this.score += pts
    this.earn(2)
    fx.burst(this.ufo.x, this.ufo.y, 22, { speed: 260, life: 0.7, size: 7, color: ['#7dffb0', '#fff', '#ffe14a'], type: 'star' })
    fx.ring(this.ufo.x, this.ufo.y, 90, '#7dffb0')
    fx.text(this.ufo.x, this.ufo.y - 50, `+${pts}  ${this.captured}/${this.goal}`, '#7dffb0', 24)
    sfx.capture()
  }

  enemyAliensAI(e, dt) {
    const fx = this.fx
    const p = this.ufo
    e.hurt = Math.max(0, e.hurt - dt)
    e.stun = Math.max(0, e.stun - dt)
    e.shootCd -= dt
    const valid = (d) => d && d.state !== 'gone' && !(d.state === 'lifted' && d.liftedBy !== e)
    if (!valid(e.target)) {
      e.target = null
      let best = 1e9
      for (const d of this.dinos) {
        if (!valid(d) || d.state === 'lifted') continue
        const dist = Math.abs(d.x - e.x)
        if (dist < best) {
          best = dist
          e.target = d
        }
      }
    }
    const fast = (1 + (this.wave - 1) * 0.25) * this.diff.mul
    let tx = e.target ? e.target.x : p.x + 250
    let ty = e.hoverY
    if (e.stun > 0) {
      tx = e.x
      ty = e.y
    }
    e.vx = approach(e.vx, clamp((tx - e.x) * 2.5, -200 * fast, 200 * fast), 2.5, dt)
    e.vy = approach(e.vy, clamp((ty - e.y) * 2.5, -180, 180), 2.5, dt)
    e.x += e.vx * dt
    e.y += e.vy * dt
    e.tilt = approach(e.tilt, (e.vx / 300) * 0.3, 6, dt)

    // beam the target once hovering over it
    const over = e.target && Math.abs(e.target.x - e.x) < 30 && e.stun <= 0 && Math.abs(e.y - e.hoverY) < 40
    e.timer = over ? e.timer + dt : 0
    e.beaming = e.timer > 0.6
    const d = e.target
    if (e.beaming && d) {
      if (d.state !== 'lifted' && inBeam(e.x, e.y, d.x, d.y - 30)) {
        d.state = 'lifted'
        d.liftedBy = e
        sfx.squeak()
      }
      if (d.state === 'lifted' && d.liftedBy === e) {
        d.y -= 85 * d.lift * dt
        d.x = approach(d.x, e.x, 3, dt)
        if (d.y - 30 < e.y + 12) {
          d.state = 'gone'
          this.stolen++
          e.target = null
          e.timer = 0
          fx.burst(e.x, e.y, 16, { speed: 200, life: 0.6, size: 6, color: ['#ff6b8a', '#ffe14a'], type: 'star' })
          fx.text(e.x, e.y - 50, 'Stolen!', '#ff8fa0', 22)
          sfx.stolen()
        }
      }
    } else if (d && d.state === 'lifted' && d.liftedBy === e) {
      this.dropDino(d)
    }

    // shoot plasma at the player
    const dx = p.x - e.x
    const dy = p.y - e.y
    const dist = Math.hypot(dx, dy)
    if (!this.ending && e.shootCd <= 0 && dist < 560 && e.stun <= 0) {
      e.shootCd = (rand(2, 3.2) - (this.wave - 1) * 0.4) / this.diff.mul
      const s = 230 + this.wave * 25
      this.plasma.push({ x: e.x, y: e.y + 8, vx: (dx / dist) * s, vy: (dy / dist) * s, life: 3.5 })
      fx.ring(e.x, e.y + 8, 30, '#ff6b8a', 0.3, 4)
      sfx.plasma()
    }
  }

  dropDino(d) {
    d.state = 'fall'
    d.liftedBy = null
    d.vy = 0
    d.vx = 0
  }

  updateShots(dt) {
    const fx = this.fx
    const p = this.ufo
    for (const b of this.bolts) {
      b.x += b.vx * dt
      b.life -= dt
      for (const e of this.enemies) {
        if (e.dead || b.life <= 0) continue
        if (Math.abs(b.x - e.x) < 58 && Math.abs(b.y - e.y) < 26) {
          b.life = 0
          this.damageEnemy(e, Math.sign(b.vx))
        }
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0)
    for (const s of this.plasma) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      if (Math.random() < dt * 30) fx.add({ x: s.x, y: s.y, life: 0.3, size: 12, color: 'rgba(255,90,140,0.8)', type: 'glow' })
      if (s.y > GROUND) {
        s.life = 0
        fx.burst(s.x, GROUND, 8, { speed: 150, life: 0.4, size: 4, color: '#ff8fb0', type: 'spark', up: 100 })
      }
      if (!this.ending && p.inv <= 0 && Math.hypot(s.x - p.x, s.y - p.y) < 40) {
        s.life = 0
        p.hp--
        p.inv = 1.4
        p.hurt = 0.2
        p.vx += s.vx * 0.8
        p.vy += s.vy * 0.8
        this.shake = 14
        this.flash = 0.5
        fx.burst(p.x, p.y, 18, { speed: 300, life: 0.5, size: 5, color: ['#ff8fb0', '#fff'], type: 'spark' })
        fx.text(p.x, p.y - 50, p.hp > 0 ? 'Ouch!' : 'Mayday!', '#ff8fa0', 24)
        sfx.hurt()
        if (p.hp <= 0) this.finish(false)
      }
    }
    this.plasma = this.plasma.filter((s) => s.life > 0)
  }

  damageEnemy(e, dir) {
    const fx = this.fx
    e.hp--
    e.hurt = 0.15
    e.stun = 0.7
    e.vx += dir * 260
    e.timer = 0
    if (e.target && e.target.state === 'lifted' && e.target.liftedBy === e) this.dropDino(e.target)
    fx.burst(e.x, e.y, 14, { speed: 260, life: 0.4, size: 5, color: ['#ffe14a', '#fff'], type: 'spark' })
    sfx.hit()
    this.shake = Math.max(this.shake, 5)
    if (e.hp <= 0) {
      e.dead = true
      fx.boom(e.x, e.y)
      fx.text(e.x, e.y - 40, '+250', '#ffe14a', 28)
      this.score += 250
      this.earn(5, e.x, e.y - 70)
      this.shake = 18
      this.slowmo = 0.25
      sfx.boom()
      this.enemyRespawn.push({ t: 6 })
    }
  }

  nextWave() {
    this.wave++
    this.earn(10)
    this.captured = 0
    this.goal = 4 + this.wave * 2
    this.banner = { text: `WAVE ${this.wave}`, sub: `Beam up ${this.goal} dinos! More rivals!`, t: 0 }
    this.ufo.hp = Math.min(this.ufo.maxHp, this.ufo.hp + 1)
    this.enemyRespawn.push({ t: 2 })
    sfx.wave()
  }

  // ---------- DINOS mode: you are the T. rex ----------

  setupDinos() {
    this.rex = { x: 700, y: GROUND, vx: 0, vy: 0, face: 1, walk: 0, onGround: true, lives: this.diff.lives + this.lvl('life'), maxLives: this.diff.lives + this.lvl('life'), roars: 3, roarCd: 0, roarT: 0, liftedBy: null, inv: 0, squash: 0 }
    this.babies = ['trike', 'stego', 'raptor', 'bronto'].map((kind, i) => {
      const b = new Dino(560 + i * 90, kind, 0.55)
      b.offset = [-170, -90, 90, 170][i]
      return b
    })
    this.ufos = []
    this.waveTime = WAVE_SECONDS
    this.ufoSpawn = 1
    this.ufoQuota = 2
  }

  updateDinos(dt) {
    const r = this.rex
    const fx = this.fx
    const k = this.keys
    const alive = !this.ending

    r.inv = Math.max(0, r.inv - dt)
    if (this.power) {
      this.power.t -= dt
      if (this.power.t <= 0) this.power = null
      else if (this.hasPower('speed') && r.onGround && Math.abs(r.vx) > 100 && Math.random() < dt * 20) fx.dust(r.x - r.face * 20, GROUND, 1)
    }
    r.roarCd = Math.max(0, r.roarCd - dt)
    r.roarT = Math.max(0, r.roarT - dt)
    r.squash = Math.max(0, r.squash - dt * 4)

    if (r.liftedBy) {
      const u = r.liftedBy
      // wiggle to struggle, but only a roar breaks free
      r.y -= 52 * this.diff.mul * dt
      r.x = approach(r.x, u.x + (k.left ? -10 : 0) + (k.right ? 10 : 0), 3, dt)
      r.vx = 0
      r.vy = 0
      if (!u.beaming || u.state !== 'beam') this.releaseRex()
      else if (!this.ending && r.y - 80 < u.y + 10) this.rexCaught(u)
    } else {
      const ix = alive ? (k.right ? 1 : 0) - (k.left ? 1 : 0) : 0
      r.vx = approach(r.vx, ix * (this.lvl('jump') ? 370 : 300) * (this.hasPower('speed') ? 1.5 : 1), r.onGround ? 8 : 3, dt)
      if (ix) r.face = ix
      if (alive && (this.pressed.has('up') || this.pressed.has('fire')) && r.onGround) {
        r.vy = this.lvl('jump') || this.hasPower('speed') ? -800 : -640
        r.onGround = false
        r.squash = 0.6
        fx.dust(r.x, GROUND, 6)
        sfx.jump()
      }
      r.vy += 1700 * dt
      r.x += r.vx * dt
      r.y += r.vy * dt
      if (r.y >= GROUND) {
        if (!r.onGround) {
          r.squash = 1
          fx.dust(r.x, GROUND, 10)
          sfx.land()
          if (r.vy > 400) this.shake = Math.max(this.shake, 4)
        }
        r.y = GROUND
        r.vy = 0
        r.onGround = true
      }
      r.x = clamp(r.x, 50, WORLD - 50)
      const step = Math.floor(r.walk / Math.PI)
      r.walk += Math.abs(r.vx) * dt * 0.07
      if (r.onGround && Math.abs(r.vx) > 60 && Math.floor(r.walk / Math.PI) !== step) sfx.step()
      if (r.onGround && Math.abs(r.vx) > 200 && Math.random() < dt * 8) fx.dust(r.x - r.face * 20, GROUND, 1)
    }

    if (alive && this.pressed.has('action') && r.roarCd <= 0) {
      if (r.roars > 0 || this.hasPower('mega')) this.roar()
      else {
        fx.text(r.x, r.y - 130, 'NO ROARS LEFT!', '#ff8fa0', 20)
        this.openQuiz('OUT OF ROARS! SPELL IT TO ROAR!')
      }
    }

    // babies wander around the valley on their own, and run away from UFO beams
    for (const b of this.babies) {
      if (b.state === 'gone') continue
      if (b.state === 'walk') this.babyWander(b, dt)
      b.physics(dt, fx)
    }

    // leaves to munch for points and a quick roar refill
    if (this.pickups.length < 4 && Math.random() < dt * 0.5) this.pickups.push({ x: rand(100, WORLD - 100), t: 0 })
    for (const lf of this.pickups) {
      lf.t += dt
      if (!r.liftedBy && Math.abs(lf.x - r.x) < 40 && r.y > GROUND - 120) {
        lf.done = true
        this.score += 25
        r.roarCd = 0
        r.roars++
        this.earn(1)
        fx.burst(lf.x, GROUND - 20, 12, { speed: 160, life: 0.5, size: 6, color: ['#6fdc4f', '#c8ff9a'], type: 'star' })
        fx.text(lf.x, GROUND - 70, '+25  +1 ROAR!', '#c8ff9a', 18)
        sfx.pickup()
      }
    }
    this.pickups = this.pickups.filter((lf) => !lf.done)

    // alien UFOs arrive over time
    if (alive && this.waveTime > 0) {
      this.ufoSpawn -= dt
      const active = this.ufos.filter((u) => u.state !== 'leave' && u.state !== 'crash').length
      if (this.ufoSpawn <= 0 && active < this.ufoQuota) {
        this.ufoSpawn = rand(2, 4)
        const side = Math.random() < 0.5 ? -1 : 1
        this.ufos.push(new Saucer(clamp(this.cam.x + side * (W / 2 + 120), -100, WORLD + 100), rand(-80, -40)))
      }
    }
    for (const u of this.ufos) this.ufoDinoAI(u, dt)
    this.ufos = this.ufos.filter((u) => !u.dead)

    if (alive) {
      this.waveTime -= dt / GAME_SPEED
      if (this.waveTime <= 0) {
        for (const u of this.ufos) this.ufoLeave(u)
        this.releaseRex()
        if (this.wave >= WAVES) this.finish(true)
        else {
          this.wave++
          this.waveTime = WAVE_SECONDS
          this.ufoQuota = Math.min(4, this.wave + 1)
          this.ufoSpawn = 3
          this.score += 500
          this.earn(10)
          this.banner = { text: `WAVE ${this.wave}`, sub: `You survived! +500. Now ${this.ufoQuota} UFOs at once!`, t: 0 }
          sfx.wave()
        }
      }
    }
  }

  babyWander(b, dt) {
    b.think -= dt
    const danger = this.ufos.find((u) => (u.beaming || u.state === 'charge') && Math.abs(u.x - b.x) < 170)
    if (danger) {
      b.target = clamp(b.x + Math.sign(b.x - danger.x || 1) * 260, 80, WORLD - 80)
      b.scared = 0.5
    } else if (b.think <= 0) {
      b.think = rand(1.5, 4)
      b.target = Math.random() < 0.3 ? b.x : clamp(b.x + rand(-320, 320), 200, WORLD - 200)
    }
    const speed = danger ? 210 : 70
    const want = Math.abs(b.target - b.x) > 10 ? Math.sign(b.target - b.x) * speed : 0
    b.vx = approach(b.vx, want, 5, dt)
    b.x += b.vx * dt
    if (Math.abs(b.vx) > 5) b.face = Math.sign(b.vx)
    b.walk += Math.abs(b.vx) * dt * 0.12
  }

  hasPower(kind) {
    return this.power?.kind === kind
  }

  ufoDinoAI(u, dt) {
    const fx = this.fx
    const r = this.rex
    u.hurt = Math.max(0, u.hurt - dt)
    u.timer += dt
    const fast = (1 + (this.wave - 1) * 0.3) * this.diff.mul
    const babies = this.babies.filter((b) => b.state !== 'gone')

    if (u.state === 'crash') {
      u.vy += 700 * dt
      u.x += u.vx * dt
      u.y += u.vy * dt
      u.tilt += dt * 9
      if (Math.random() < dt * 40) fx.add({ x: u.x, y: u.y, vx: rand(-30, 30), vy: -50, life: 1, size: 16, color: '#555', type: 'smoke', drag: 1 })
      if (u.y > GROUND - 10) {
        u.dead = true
        fx.boom(u.x, GROUND - 20)
        this.shake = 20
        this.slowmo = 0.3
        sfx.boom()
      }
      return
    }
    if (u.state === 'leave') {
      u.vy = approach(u.vy, -420, 2, dt)
      u.y += u.vy * dt
      u.x += u.vx * dt
      u.beaming = false
      if (u.y < -150) u.dead = true
      return
    }
    if (u.state === 'stunned') {
      u.beaming = false
      u.vx *= Math.exp(-2 * dt)
      u.vy *= Math.exp(-2 * dt)
      u.x += u.vx * dt
      u.y += u.vy * dt
      u.stun = Math.max(0, u.stun - dt)
      if (u.stun <= 0) {
        u.state = 'hunt'
        u.timer = 0
      }
      return
    }

    // pick who to chase: you or one of the babies
    if (!u.target || u.target.state === 'gone' || (u.target !== r && u.target.state === 'lifted' && u.target.liftedBy !== u)) {
      u.target = babies.length && Math.random() < 0.6 ? pick(babies) : r
      u.state = 'hunt'
      u.timer = 0
    }
    const t = u.target
    const tx = t.x
    const ty = u.state === 'beam' ? Math.min(u.hoverY, u.y) : u.hoverY
    const maxV = (u.state === 'hunt' ? 210 : 70) * fast
    u.vx = approach(u.vx, clamp((tx - u.x) * 2, -maxV, maxV), 2.5, dt)
    u.vy = approach(u.vy, clamp((ty - u.y) * 2.5, -200, 200), 2.5, dt)
    u.x += u.vx * dt
    u.y += u.vy * dt
    u.tilt = approach(u.tilt, (u.vx / 300) * 0.3, 6, dt)

    if (u.state === 'hunt') {
      u.beaming = false
      if (Math.abs(tx - u.x) < 40 && u.y > 60 && u.timer > 1) {
        u.state = 'charge'
        u.timer = 0
        sfx.warn()
      }
    } else if (u.state === 'charge') {
      if (Math.floor(u.timer * 4) !== Math.floor((u.timer - dt) * 4)) sfx.warn()
      if (u.timer > (0.9 - (this.wave - 1) * 0.15) / this.diff.mul) {
        u.state = 'beam'
        u.timer = 0
      }
    } else if (u.state === 'beam') {
      u.beaming = true
      // grab anyone standing in the beam
      if (!r.liftedBy && r.inv <= 0 && !this.hasPower('shield') && !this.ending && inBeam(u.x, u.y, r.x, r.y - 40)) {
        r.liftedBy = u
        r.onGround = false
        fx.text(r.x, r.y - 110, 'ROAR to escape!', '#ffe14a', 22)
        sfx.squeak()
      }
      for (const b of babies) {
        if (b.state !== 'lifted' && inBeam(u.x, u.y, b.x, b.y - 20)) {
          b.state = 'lifted'
          b.liftedBy = u
          fx.text(b.x, b.y - 60, 'Help!', '#fff', 18)
          sfx.squeak()
        }
        if (b.state === 'lifted' && b.liftedBy === u) {
          b.y -= 60 * b.lift * dt
          b.x = approach(b.x, u.x, 3, dt)
          if (b.y - 20 < u.y + 12) this.babyTaken(b, u)
        }
      }
      if (u.timer > 6) this.ufoCool(u)
    }
  }

  ufoCool(u) {
    u.beaming = false
    u.state = 'hunt'
    u.timer = -1
    for (const b of this.babies) if (b.liftedBy === u) this.dropDino(b)
    if (this.rex.liftedBy === u) this.releaseRex()
  }

  ufoLeave(u) {
    if (u.state === 'crash') return
    this.ufoCool(u)
    u.state = 'leave'
    u.vx = rand(-100, 100)
  }

  babyTaken(b, u) {
    const fx = this.fx
    b.state = 'gone'
    fx.burst(u.x, u.y, 16, { speed: 200, life: 0.6, size: 6, color: ['#ff6b8a', '#ffe14a'], type: 'star' })
    fx.text(u.x, u.y - 50, 'Baby taken!', '#ff8fa0', 24)
    this.shake = 8
    sfx.stolen()
    this.ufoLeave(u)
    if (this.babies.every((x) => x.state === 'gone')) this.finish(false)
  }

  releaseRex() {
    const r = this.rex
    if (!r.liftedBy) return
    r.liftedBy = null
    r.vy = 0
    r.onGround = false
  }

  rexCaught(u) {
    const r = this.rex
    const fx = this.fx
    r.lives--
    r.liftedBy = null
    this.flash = 0.8
    this.shake = 14
    sfx.hurt()
    fx.burst(r.x, r.y - 60, 20, { speed: 260, life: 0.6, size: 6, color: ['#ff8fb0', '#fff'], type: 'star' })
    if (r.lives <= 0) {
      this.finish(false)
      r.liftedBy = u
      return
    }
    // the aliens can't handle a grumpy T. rex, so they spit you back out
    fx.text(r.x, r.y - 120, 'Spat back out!', '#ffe14a', 24)
    r.inv = 2.5
    r.vy = 200
    this.ufoLeave(u)
  }

  roar() {
    const r = this.rex
    const fx = this.fx
    r.roarCd = 0.85
    r.roarT = 0.6
    if (!this.hasPower('mega')) r.roars--
    if (r.roars <= 0 && !this.hasPower('mega')) this.openQuiz('OUT OF ROARS! SPELL IT TO ROAR!')
    const reach = 340 * (1 + 0.25 * this.lvl('roar')) * (this.hasPower('mega') ? 1.6 : 1)
    const hx = r.x + r.face * 36
    const hy = r.y - 70
    for (let i = 0; i < 3; i++) fx.add({ x: hx, y: hy, size: reach, color: i ? 'rgba(255,240,180,0.8)' : '#fff', type: 'ring', life: 0.5 + i * 0.12, width: 10 - i * 3 })
    fx.burst(hx, hy, 14, { speed: 380, life: 0.4, size: 5, color: '#fff7c0', type: 'spark' })
    fx.text(hx + r.face * 40, hy - 30, 'ROAR!', '#ffe14a', 30)
    this.shake = Math.max(this.shake, 9)
    sfx.roar()
    let hits = 0
    for (const u of this.ufos) {
      if (u.state === 'leave' || u.state === 'crash') continue
      if (Math.hypot(u.x - hx, u.y - hy) > reach) continue
      hits++
      this.ufoCool(u)
      const dir = Math.sign(u.x - r.x) || 1
      u.vx = dir * 520
      u.vy = -280
      u.hp--
      u.hurt = 0.15
      this.score += 50
      fx.burst(u.x, u.y, 12, { speed: 220, life: 0.5, size: 6, color: '#ffe14a', type: 'star' })
      if (u.hp <= 0) {
        u.state = 'crash'
        u.vy = -200
        fx.text(u.x, u.y - 50, 'CRASH! +300', '#ffe14a', 26)
        this.score += 300
        this.earn(5)
      } else {
        u.state = 'stunned'
        u.stun = 1.6
        fx.text(u.x, u.y - 50, 'POW!', '#fff', 24)
      }
    }
    if (hits) {
      sfx.stun()
      this.slowmo = Math.max(this.slowmo, 0.12)
    }
  }

  // ---------- cutscenes ----------

  startCutscene(name, onDone) {
    beamOn(false)
    this.scene = 'cutscene'
    this.fx.list = []
    this.cut = { name, t: 0, onDone, events: new Set(), ...CUTSCENES[name] }
    this.cut.setup?.(this.cut, this)
  }

  skipCutscene() {
    if (this.cut.t < 0.4) return
    this.cut.t = this.cut.dur
  }

  updateCutscene(dt) {
    const c = this.cut
    if (this.pressed.has('enter') || this.pressed.has('pause') || this.pressed.has('action')) this.skipCutscene()
    const prev = c.t
    c.t += dt
    // run each scripted event once, when the clock passes its time
    for (const [at, fn] of c.script || []) {
      if (prev < at && c.t >= at) fn(c, this)
    }
    c.update?.(c, this, dt)
    if (c.t >= c.dur) {
      this.fx.list = []
      c.onDone()
    }
  }

  // ---------- drawing ----------

  draw() {
    const main = this.ctx
    main.setTransform(1, 0, 0, 1, 0, 0)
    main.clearRect(0, 0, this.canvas.width, this.canvas.height)
    const ctx = this.lctx
    ctx.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0)
    ctx.clearRect(0, 0, W, H)
    this.layer = 0
    ctx.save()
    if (this.shake > 0 && this.settings.shake) {
      // shake in whole chunky pixels so the picture stays sharp
      ctx.translate(Math.round(rand(-1, 1) * this.shake * 0.2) * PX, Math.round(rand(-1, 1) * this.shake * 0.2) * PX)
    }
    if (this.isMenuScreen()) drawScreen(this, ctx)
    else if (this.scene === 'profile' || this.scene === 'mp' || this.scene === 'account') drawLobby(this, ctx)
    else if (this.scene === 'vs') {
      drawVersus(this, ctx)
      if (this.quiz) {
        drawQuiz(ctx, this.quiz, this.time, this.quiz.hint)
        if (this.quiz.doneT) text(ctx, 'CORRECT!', W / 2, 286, 40, '#63c74d')
      }
    } else if (this.scene === 'menu') this.drawMenu(ctx)
    else if (this.scene === 'cutscene') this.drawCutscene(ctx)
    else {
      this.drawPlay(ctx)
      if (this.scene === 'paused') {
        this.flushLayer()
        this.drawPaused(ctx)
      }
      if (this.scene === 'over') {
        this.flushLayer()
        this.drawOver(ctx)
      }
    }
    ctx.restore()
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,${this.side === 'aliens' ? 80 : 255},${this.side === 'aliens' ? 90 : 255},${this.flash * 0.5})`
      ctx.fillRect(0, 0, W, H)
    }
    if (this.afk) {
      this.flushLayer()
      this.drawAfk(ctx)
    }
    if (this.toast) {
      this.toast.t -= 1 / 60
      if (this.toast.t <= 0) this.toast = null
      else {
        // on the typing screens the keyboard fills the bottom, so the message goes at the top
        const y = this.scene === 'profile' || this.scene === 'mp' || this.scene === 'account' ? 8 : 492
        rrect(ctx, W / 2 - 260, y, 520, 40, 12)
        ctx.fillStyle = 'rgba(24,20,37,0.92)'
        ctx.fill()
        text(ctx, this.toast.text, W / 2, y + 27, 18, '#fee761')
      }
    }
    this.flushLayer()
  }

  // Blows the tiny screen up onto the real canvas, then paints the queued pixel-font text on top.
  // Drawing can carry on afterwards as a new layer (used for fades and overlays that cover text).
  flushLayer() {
    const lo = this.lctx
    if (this.layer === 0) retroColors(lo, this.lo.width, this.lo.height)
    this.layer++
    const main = this.ctx
    main.setTransform(1, 0, 0, 1, 0, 0)
    main.imageSmoothingEnabled = false
    main.drawImage(this.lo, 0, 0, this.canvas.width, this.canvas.height)
    flushText(main, this.canvas.width / this.lo.width)
    lo.save()
    lo.setTransform(1, 0, 0, 1, 0, 0)
    lo.clearRect(0, 0, this.lo.width, this.lo.height)
    lo.restore()
  }

  // Draws the world through a camera: sky, parallax layers, the ground, then whatever `actors` draws.
  drawWorld(ctx, theme, cam, actors) {
    drawSky(ctx, theme, this.time)
    ctx.save()
    applyCam(ctx, cam)
    drawBackdrop(ctx, theme, cam.x, this.time)
    drawGround(ctx, theme, cam.x, this.time)
    actors()
    this.fx.draw(ctx)
    drawForeground(ctx, theme, cam.x, this.time)
    ctx.restore()
  }

  drawPlay(ctx) {
    const t = this.time
    const theme = getTheme(this.side === 'aliens' ? 'aliens' : 'dinos')
    this.drawWorld(ctx, theme, this.cam, () => {
      if (this.side === 'aliens') this.drawAliensActors(ctx, t)
      else this.drawDinosActors(ctx, t)
    })
    if (this.side === 'aliens') this.drawAliensHUD(ctx)
    else this.drawDinosHUD(ctx)
    this.drawEdgeArrows(ctx)
    if (this.banner && !this.quiz) this.drawBanner(ctx, this.banner)
    text(ctx, `$ ${this.shop.coins}`, W - 30, 106, 16, '#fee761', 'right')
    if (this.quiz) {
      drawQuiz(ctx, this.quiz, this.time, this.quiz.hint)
      if (this.quiz.doneT) text(ctx, 'CORRECT!', W / 2, 286, 40, '#63c74d')
    }
  }

  drawAliensActors(ctx, t) {
    const p = this.ufo
    for (const egg of this.eggs) drawEgg(ctx, egg.x, GROUND, egg.t / 2, t)
    for (const e of this.enemies) if (e.beaming) drawBeam(ctx, e.x, e.y + 10, GROUND, t, { enemy: true })
    if (p.beaming) drawBeam(ctx, p.x, p.y + 12, GROUND, t, { power: 0.6 + p.energy * 0.4, width: this.beamWidth() })
    for (const d of this.dinos) {
      shadow(ctx, d.x, d.y, 34 * d.scale)
      d.draw(ctx, t, { lookUp: Math.abs(p.x - d.x) < 200 })
    }
    for (const e of this.enemies) e.draw(ctx, t)
    if (!(p.inv > 0 && Math.floor(t * 14) % 2 === 0)) {
      ctx.save()
      ctx.translate(p.x, p.y + Math.sin(t * 3) * 3)
      drawUFO(ctx, { time: t, gold: this.lvl('gold') > 0, tilt: p.tilt, beam: p.beaming, hurt: p.hurt > 0, mood: this.ending && !this.ending.won ? 'dizzy' : 'happy' })
      ctx.restore()
    }
    for (const b of this.bolts) {
      // a pixel laser: a cyan bar with a white-hot middle
      const x = snap(Math.min(b.x, b.x - Math.sign(b.vx) * 36))
      ctx.fillStyle = '#2ce8f5'
      ctx.fillRect(x, snap(b.y) - PX, 36, PX * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x + PX * 2, snap(b.y) - PX, 36 - PX * 4, PX)
    }
    for (const s of this.plasma) {
      // a pixel plasma ball that pulses
      const big = Math.floor(this.time * 12) % 2 ? PX : 0
      ctx.fillStyle = '#ff0044'
      ctx.fillRect(snap(s.x) - PX * 2 - big, snap(s.y) - PX * 2 - big, PX * 4 + big * 2, PX * 4 + big * 2)
      ctx.fillStyle = '#f6757a'
      ctx.fillRect(snap(s.x) - PX, snap(s.y) - PX, PX * 2, PX * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(snap(s.x) - PX, snap(s.y) - PX, PX, PX)
    }
  }

  drawDinosActors(ctx, t) {
    const r = this.rex
    for (const lf of this.pickups) drawLeaf(ctx, lf.x, GROUND, t)
    for (const u of this.ufos) {
      if (u.state === 'charge') {
        // warning: a thin flickering beam shows where it's about to grab
        ctx.save()
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 30)
        drawBeam(ctx, u.x, u.y + 10, GROUND, t, { enemy: true, width: 70, power: 0.35 })
        ctx.restore()
      }
      if (u.beaming) drawBeam(ctx, u.x, u.y + 10, GROUND, t, { enemy: true })
    }
    for (const b of this.babies) {
      if (b.state === 'gone') continue
      shadow(ctx, b.x, GROUND, 22)
      b.draw(ctx, t, { lookUp: this.ufos.some((u) => Math.abs(u.x - b.x) < 150) })
    }
    if (this.hasPower('shield')) {
      ctx.save()
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 8)
      ctx.strokeStyle = '#63c74d'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(r.x, r.y - 45, 72, 0, TAU)
      ctx.stroke()
      ctx.restore()
    }
    shadow(ctx, r.x, GROUND, 40 * clamp(1 - (GROUND - r.y) / 300, 0.3, 1))
    if (!(r.inv > 0 && Math.floor(t * 12) % 2 === 0)) {
      ctx.save()
      ctx.translate(r.x, r.y)
      if (r.liftedBy) ctx.rotate(Math.sin(t * 5) * 0.2)
      const sq = Math.sin(r.squash * Math.PI) * 0.2
      ctx.scale(r.face * 1.25 * (1 + sq), 1.25 * (1 - sq))
      drawDino(ctx, 'rex', {
        time: t,
        walk: r.walk,
        moving: r.onGround && Math.abs(r.vx) > 20,
        roar: r.roarT > 0 ? Math.sin((r.roarT / 0.6) * Math.PI) : 0,
        scared: !!r.liftedBy,
        flail: !!r.liftedBy,
        angry: r.roarT > 0,
        blink: t % 3.7 < 0.12,
        gold: this.lvl('gold') > 0,
      })
      ctx.restore()
    }
    for (const u of this.ufos) u.draw(ctx, t)
  }

  drawEdgeArrows(ctx) {
    // little arrows at the screen edge pointing at things you can't see
    const list = this.side === 'aliens' ? this.enemies : this.ufos.filter((u) => u.state !== 'leave')
    const babies = this.side === 'dinos' ? this.babies.filter((b) => b.state !== 'gone').map((b) => ({ x: b.x, y: 420, baby: true })) : []
    for (const e of [...list, ...babies]) {
      const sx = e.x - this.cam.x + W / 2
      if (sx > -20 && sx < W + 20) continue
      const left = sx < 0
      const y = clamp(e.y, 80, H - 80)
      ctx.save()
      ctx.translate(left ? 22 : W - 22, y)
      ctx.scale(left ? -1 : 1, 1)
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(this.time * 8)
      ctx.beginPath()
      ctx.moveTo(10, 0)
      ctx.lineTo(-8, -12)
      ctx.lineTo(-8, 12)
      ctx.closePath()
      ctx.fillStyle = e.baby ? '#63c74d' : '#ff5a7a'
      ctx.fill()
      ctx.strokeStyle = INK
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.restore()
    }
  }

  drawAliensHUD(ctx) {
    const p = this.ufo
    hudPanel(ctx, 14, 12, 250, 126)
    text(ctx, 'LASER', 28, 118, 13, '#2ce8f5', 'left')
    for (let i = 0; i < 15; i++) {
      rrect(ctx, 92 + i * 10.3, 106, 7, 14, 2)
      ctx.fillStyle = i < p.ammo ? '#2ce8f5' : 'rgba(255,255,255,0.15)'
      ctx.fill()
    }
    text(ctx, 'FUEL', 28, 92, 13, '#feae34', 'left')
    const low = p.fuel < 0.25 && Math.floor(this.time * 4) % 2 === 0
    bar(ctx, 92, 82, 154, 16, p.fuel, low ? '#e43b44' : '#feae34')
    text(ctx, 'SHIELD', 28, 34, 13, '#9fd8ff', 'left')
    for (let i = 0; i < p.maxHp; i++) {
      rrect(ctx, 92 + i * (160 / p.maxHp), 22, 160 / p.maxHp - 6, 16, 5)
      ctx.fillStyle = i < p.hp ? '#5ad1ff' : 'rgba(255,255,255,0.15)'
      ctx.fill()
    }
    text(ctx, 'BEAM', 28, 66, 13, '#9fffd0', 'left')
    bar(ctx, 92, 56, 154, 16, p.energy, p.overheat ? '#ff8f6b' : '#7dffb0')
    hudPanel(ctx, W / 2 - 120, 12, 240, 74)
    text(ctx, `Dinos ${this.captured} / ${this.goal}`, W / 2, 44, 24, '#fff')
    text(ctx, `Wave ${this.wave} of ${WAVES}`, W / 2, 70, 14, '#c9c2ff')
    hudPanel(ctx, W - 214, 12, 200, 74)
    text(ctx, `${this.score}`, W - 114, 48, 28, '#ffe14a')
    text(ctx, `Best ${this.best.aliens || 0}`, W - 114, 72, 13, '#c9c2ff')
  }

  drawDinosHUD(ctx) {
    const r = this.rex
    hudPanel(ctx, 14, 12, 250, 74)
    text(ctx, 'LIVES', 28, 34, 13, '#ffb3c6', 'left')
    for (let i = 0; i < r.maxLives; i++) text(ctx, '❤', 104 + i * 30, 37, 22, i < r.lives ? '#ff5a7a' : 'rgba(255,255,255,0.2)')
    text(ctx, 'ROARS', 28, 66, 13, '#ffe14a', 'left')
    for (let i = 0; i < Math.min(r.roars, 10); i++) {
      rrect(ctx, 96 + i * 15, 54, 11, 16, 3)
      ctx.fillStyle = r.roarCd > 0 ? '#b89a3a' : '#ffe14a'
      ctx.fill()
    }
    if (r.roars > 10) text(ctx, `+${r.roars - 10}`, 248, 68, 12, '#ffe14a', 'right')
    if (r.roars <= 0) text(ctx, 'ENTER = SPELL', 96, 68, 12, '#ff8fa0', 'left')
    if (this.power) text(ctx, `★ ${POWER_NAMES[this.power.kind]} ${Math.ceil(this.power.t)}S`, 28, 104, 14, '#63c74d', 'left')
    hudPanel(ctx, W / 2 - 120, 12, 240, 74)
    text(ctx, `${Math.max(0, Math.ceil(this.waveTime))}s left`, W / 2, 44, 24, this.waveTime < 6 ? '#ffe14a' : '#fff')
    const babies = this.babies.filter((b) => b.state !== 'gone').length
    text(ctx, `Wave ${this.wave} of ${WAVES}  ·  Babies safe: ${babies}`, W / 2, 70, 14, '#d5f5c8')
    hudPanel(ctx, W - 214, 12, 200, 74)
    text(ctx, `${this.score}`, W - 114, 48, 28, '#ffe14a')
    text(ctx, `Best ${this.best.dinos || 0}`, W - 114, 72, 13, '#d5f5c8')
  }

  drawBanner(ctx, b) {
    const a = b.t < 0.3 ? b.t / 0.3 : b.t > 2.8 ? (3.2 - b.t) / 0.4 : 1
    const s = b.t < 0.3 ? 0.5 + easeOut(b.t / 0.3) * 0.5 : 1
    ctx.save()
    ctx.globalAlpha = clamp(a, 0, 1)
    ctx.translate(W / 2, 200)
    ctx.scale(s, s)
    text(ctx, b.text, 0, 0, b.text.length > 12 ? 40 : 64, '#ffe14a')
    text(ctx, b.sub, 0, 44, 22, '#fff')
    ctx.restore()
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(10,6,30,0.6)'
    ctx.fillRect(0, 0, W, H)
    text(ctx, 'PAUSED', W / 2, H / 2 - 10, 60, '#fff')
    text(ctx, 'Press P, Space or tap to keep playing', W / 2, H / 2 + 36, 20, '#c9c2ff')
  }

  drawOver(ctx) {
    const won = this.ending?.won
    const a = clamp(this.overT * 3, 0, 1)
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = 'rgba(10,6,30,0.75)'
    ctx.fillRect(0, 0, W, H)
    const bounce = 1 + Math.sin(this.time * 3) * 0.03
    ctx.save()
    ctx.translate(W / 2, 140)
    ctx.scale(bounce, bounce)
    text(ctx, won ? 'YOU WIN!' : 'GAME OVER', 0, 0, 72, won ? '#ffe14a' : '#ff8fa0')
    ctx.restore()
    text(ctx, this.tag(), W / 2, 200, 20, '#c9c2ff')
    text(ctx, `Score: ${this.score}`, W / 2, 270, 44, '#fff')
    text(ctx, this.newBest ? '★ New best score! ★' : `Best: ${this.best[this.side] || 0}`, W / 2, 316, 22, this.newBest ? '#ffe14a' : '#c9c2ff')
    text(ctx, `Coins earned: $${this.coinsRun}   ·   You have $${this.shop.coins}`, W / 2, 358, 18, '#fee761')
    for (const [i, b] of this.overButtons().entries()) {
      const hover = this.mouse.x > b.x && this.mouse.x < b.x + b.w && this.mouse.y > b.y && this.mouse.y < b.y + b.h
      rrect(ctx, b.x, b.y + (hover ? -3 : 0), b.w, b.h, 28)
      ctx.fillStyle = ['#ffe14a', '#7dffb0', '#6bb8ff'][i]
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = INK
      ctx.stroke()
      text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + 8 + (hover ? -3 : 0), 22, INK, 'center', false)
    }
    text(ctx, 'Enter = play again   ·   Esc = title screen', W / 2, 530, 13, '#a8a0d8')
    ctx.restore()
  }

  drawMenu(ctx) {
    const t = this.time
    // split background: alien night on the left, dino day on the right
    drawSky(ctx, getTheme('night'), t)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(W / 2 + 40, 0)
    ctx.lineTo(W, 0)
    ctx.lineTo(W, H)
    ctx.lineTo(W / 2 - 40, H)
    ctx.clip()
    drawSky(ctx, getTheme('dinos'), t)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.translate(0, 60)
    drawBackdrop(ctx, getTheme('aliens'), W / 2 + Math.sin(t * 0.1) * 300, t)
    ctx.restore()
    this.fx.draw(ctx)

    // bouncing title
    const intro = easeOut(clamp(this.menuT / 0.8, 0, 1))
    ctx.save()
    ctx.translate(W / 2, 80 - (1 - intro) * 150)
    ctx.rotate(Math.sin(t * 1.5) * 0.02)
    const words = [
      ['ALIENS', '#7dffb0', -190],
      ['VS', '#ffe14a', 0],
      ['DINOS', '#ffa94d', 180],
    ]
    for (const [i, [w, c, x]] of words.entries()) {
      ctx.save()
      ctx.translate(x, Math.sin(t * 3 + i) * 4)
      text(ctx, w, 0, 26, i === 1 ? 44 : 64, c)
      ctx.restore()
    }
    ctx.restore()
    text(ctx, this.profile ? `${this.profile.name}, choose your side!` : 'Choose your side!', W / 2, 148, 22, '#fff')

    for (const [i, c] of this.menuCards().entries()) {
      const sel = this.menuPick === i
      const pop = easeOut(clamp((this.menuT - 0.2 - i * 0.15) / 0.5, 0, 1))
      ctx.save()
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - pop) * 400)
      const s = sel ? 1.04 + Math.sin(t * 5) * 0.01 : 0.96
      ctx.scale(s, s)
      if (sel) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.shadowColor = i === 0 ? '#7dffb0' : '#ffa94d'
        ctx.shadowBlur = 30
        rrect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 22)
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fill()
        ctx.restore()
      }
      rrect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 22)
      const g = ctx.createLinearGradient(0, -c.h / 2, 0, c.h / 2)
      if (i === 0) {
        g.addColorStop(0, '#2a1a5e')
        g.addColorStop(1, '#5a2a7a')
      } else {
        g.addColorStop(0, '#0e1d48')
        g.addColorStop(1, '#2c4f8a')
      }
      ctx.fillStyle = g
      ctx.fill()
      ctx.lineWidth = sel ? 6 : 4
      ctx.strokeStyle = sel ? (i === 0 ? '#7dffb0' : '#ffa94d') : INK
      ctx.stroke()
      ctx.save()
      rrect(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 22)
      ctx.clip()
      ctx.fillStyle = i === 0 ? '#2a4a3a' : '#2f6e30'
      ctx.fillRect(-c.w / 2, 50, c.w, 100)
      if (i === 0) {
        // UFO beaming up a dino
        const bx = Math.sin(t * 1.3) * 50
        drawBeam(ctx, bx, -60, 50, t, { width: 50 })
        ctx.save()
        ctx.translate(bx, 30 - ((t * 25) % 60))
        ctx.rotate(Math.sin(t * 5) * 0.2)
        ctx.scale(0.6, 0.6)
        drawDino(ctx, 'trike', { time: t, flail: true, scared: true })
        ctx.restore()
        ctx.save()
        ctx.translate(bx, -70 + Math.sin(t * 3) * 4)
        drawUFO(ctx, { time: t, beam: true, mood: 'happy' })
        ctx.restore()
        ctx.save()
        ctx.translate(120, -90 + Math.sin(t * 2) * 6)
        ctx.scale(0.5, 0.5)
        drawUFO(ctx, { time: t, enemy: true })
        ctx.restore()
      } else {
        // roaring T. rex scaring a UFO
        const roar = Math.max(0, Math.sin(t * 2))
        ctx.save()
        ctx.translate(-50, 52)
        ctx.scale(1.1, 1.1)
        drawDino(ctx, 'rex', { time: t, roar, angry: roar > 0.3, walk: t * 4, moving: false })
        ctx.restore()
        if (roar > 0.3) {
          ctx.strokeStyle = `rgba(255,255,255,${roar * 0.7})`
          ctx.lineWidth = 4
          for (let k = 0; k < 3; k++) {
            ctx.beginPath()
            ctx.arc(-10, -30, 30 + k * 22 + roar * 10, -0.8, 0.4)
            ctx.stroke()
          }
        }
        ctx.save()
        ctx.translate(100 + roar * 20, -80 - roar * 10)
        ctx.scale(0.6, 0.6)
        drawUFO(ctx, { time: t, enemy: true, stun: roar > 0.5 })
        ctx.restore()
        ctx.save()
        ctx.translate(70, 52)
        ctx.scale(-0.45, 0.45)
        drawDino(ctx, 'stego', { time: t, lookUp: true })
        ctx.restore()
      }
      ctx.restore()
      text(ctx, i === 0 ? 'ALIENS' : 'DINOS', 0, -c.h / 2 + 40, 32, i === 0 ? '#7dffb0' : '#fff7d0')
      text(ctx, i === 0 ? 'Fly a UFO and beam up dinos!' : 'Roar the UFOs away!', 0, c.h / 2 - 40, 17, '#fff')
      text(ctx, i === 0 ? 'Watch out for enemy aliens!' : "Don't get picked up!", 0, c.h / 2 - 18, 15, i === 0 ? '#ffb3c6' : '#ffe14a')
      ctx.restore()
    }
    text(ctx, '← → to pick · Enter or tap to play', W / 2, 490, 16, '#fff')
    text(ctx, 'Esc = back to the title screen', W / 2, 516, 13, 'rgba(255,255,255,0.7)')
    drawBackButton(ctx, this)
  }

  drawCutscene(ctx) {
    const c = this.cut
    c.draw(ctx, c, this)
    this.flushLayer()
    // fade in and out of each shot
    for (const cut of c.cuts || []) {
      const d = Math.abs(c.t - cut)
      if (d < 0.3) {
        ctx.fillStyle = `rgba(0,0,0,${1 - d / 0.3})`
        ctx.fillRect(0, 0, W, H)
      }
    }
    if (c.t < 0.4) {
      ctx.fillStyle = `rgba(0,0,0,${1 - c.t / 0.4})`
      ctx.fillRect(0, 0, W, H)
    }
    if (c.t > c.dur - 0.4) {
      ctx.fillStyle = `rgba(0,0,0,${(c.t - (c.dur - 0.4)) / 0.4})`
      ctx.fillRect(0, 0, W, H)
    }
    // movie letterbox bars
    const bar = 56 * easeOut(clamp(c.t / 0.6, 0, 1))
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, bar)
    ctx.fillRect(0, H - bar, W, bar)
    const cap = (c.captions || []).find(([a, b]) => c.t >= a && c.t < b)
    if (cap) {
      const shown = Math.floor((c.t - cap[0]) * 40)
      const words = cap[2].slice(0, shown)
      text(ctx, words, W / 2, H - 22, 22, '#fff', 'center', false)
    }
    ctx.globalAlpha = 0.6
    text(ctx, 'Enter / tap to skip ▸▸', W - 16, 34, 13, '#fff', 'right', false)
    ctx.globalAlpha = 1
  }
}

// ---------- little drawing helpers ----------

function shadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(x, GROUND + 2, w, w * 0.22, 0, 0, TAU)
  ctx.fill()
}


function hudPanel(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 14)
  ctx.fillStyle = 'rgba(15,10,40,0.6)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.stroke()
}

function bar(ctx, x, y, w, h, f, color) {
  rrect(ctx, x, y, w, h, h / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.fill()
  if (f > 0) {
    rrect(ctx, x, y, Math.max(h, w * clamp(f, 0, 1)), h, h / 2)
    ctx.fillStyle = color
    ctx.fill()
  }
}

// ---------- cutscene scripts ----------
// Each cutscene draws itself from its clock `c.t`, so the same moment always looks the same.

// Cameras move in whole pixels and only zoom to exactly 1x or 2x, so pixel art never gets smeared.
function applyCam(ctx, cam) {
  const z = cam.zoom < 1.5 ? 1 : 2
  ctx.translate(snap(W / 2 - cam.x * z), snap(H / 2 - cam.y * z))
  ctx.scale(z, z)
}

function camAt(x, y, zoom) {
  return { x, y, zoom }
}

function spaceShot(ctx, game, t, drift = 0) {
  ctx.fillStyle = '#05030f'
  ctx.fillRect(0, 0, W, H)
  drawSky(ctx, { sky: ['#05030f', '#0b0626', '#160a3a'], stars: 1 }, game.time)
  // the dino planet
  const px = W / 2 + drift
  const py = H + 380
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const glow = ctx.createRadialGradient(px, py, 540, px, py, 640)
  glow.addColorStop(0, 'rgba(120,200,255,0.5)')
  glow.addColorStop(1, 'rgba(120,200,255,0)')
  ctx.fillStyle = glow
  circle(ctx, px, py, 640)
  ctx.fill()
  ctx.restore()
  circle(ctx, px, py, 560)
  ctx.fillStyle = '#2f6fd0'
  ctx.fill()
  ctx.save()
  circle(ctx, px, py, 560)
  ctx.clip()
  ctx.fillStyle = '#4fbf5a'
  for (const [dx, dy, r] of [
    [-260, -500, 120],
    [-120, -540, 90],
    [160, -520, 140],
    [340, -440, 110],
    [-420, -380, 100],
    [40, -470, 70],
  ]) {
    circle(ctx, px + dx + t * 6, py + dy, r)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  for (const [dx, dy, r] of [
    [-200, -540, 30],
    [100, -555, 40],
    [300, -500, 26],
  ]) {
    circle(ctx, px + dx + t * 12, py + dy, r)
    ctx.fill()
  }
  ctx.restore()
}

const CUTSCENES = {
  alienIntro: {
    dur: 11,
    cuts: [3.6, 7],
    captions: [
      [0.5, 3.4, '65 million years ago, a spaceship found a planet full of dinosaurs...'],
      [3.8, 6.9, 'Your mission: beam them up for the Galactic Zoo!'],
      [7.2, 9, 'Hold SPACE to beam. Arrow keys to fly.'],
      [9, 11, 'But beware... rival aliens want them too! Press Z to zap them!'],
    ],
    draw(ctx, c, game) {
      const t = c.t
      const now = game.time
      if (t < 3.6) {
        spaceShot(ctx, game, t)
        const mx = lerp(-300, W / 2, ease(seg(t, 0, 3.2)))
        drawMothership(ctx, mx, 170, 0.8, now)
      } else if (t < 7) {
        const s = t - 3.6
        spaceShot(ctx, game, t, -40)
        const hatch = ease(seg(s, 0.2, 0.8))
        drawMothership(ctx, W / 2, 170, 0.8 + s * 0.03, now, hatch)
        const drop = ease(seg(s, 1, 3.2))
        if (s > 0.9) {
          ctx.save()
          ctx.translate(W / 2 + Math.sin(s * 3) * 10 * drop, lerp(205, H - 40, drop))
          const sc = lerp(0.5, 1.3, drop)
          ctx.scale(sc, sc)
          drawUFO(ctx, { time: now, tilt: Math.sin(s * 4) * 0.1, mood: 'happy' })
          ctx.restore()
        }
      } else {
        const s = t - 7
        const cam = camAt(lerp(600, 680, ease(seg(s, 0, 4))), lerp(330, 300, seg(s, 0, 4)), lerp(1.4, 1.2, ease(seg(s, 0, 4))))
        game.drawWorld(ctx, getTheme('aliens'), cam, () => {
          const scared = s > 0.8
          for (const [i, d] of c.dinos.entries()) {
            shadow(ctx, d.x, GROUND, 30)
            d.scared = scared ? 1 : 0
            d.draw(ctx, now, { lookUp: scared, scared })
            if (scared && s < 2.4) text(ctx, '!', d.x, GROUND - 100 - Math.sin(s * 10 + i) * 4, 34, '#ffe14a')
          }
          const swoop = ease(seg(s, 0.2, 1.4))
          ctx.save()
          ctx.translate(lerp(300, 620, swoop), lerp(-60, 230, swoop) + Math.sin(now * 3) * 4)
          drawUFO(ctx, { time: now, tilt: (1 - swoop) * 0.5, mood: 'happy', beam: s > 1.5 })
          ctx.restore()
          if (s > 1.5 && s < 2.2) drawBeam(ctx, 620, 242, GROUND, now, { power: seg(s, 1.5, 1.7) })
          const enemyIn = ease(seg(s, 2, 3))
          if (s > 2) {
            ctx.save()
            ctx.translate(lerp(1200, 860, enemyIn), 200 + Math.sin(now * 2.5) * 5)
            drawUFO(ctx, { time: now, enemy: true, tilt: (1 - enemyIn) * -0.4 })
            ctx.restore()
          }
        })
      }
    },
    setup(c) {
      c.dinos = [new Dino(500, 'rex'), new Dino(620, 'trike'), new Dino(760, 'stego'), new Dino(880, 'raptor', 0.8)]
      c.dinos[0].face = 1
      c.dinos[2].face = -1
    },
    script: [
      [0.3, () => sfx.whoosh()],
      [4, () => sfx.select()],
      [4.6, () => sfx.whoosh()],
      [7.3, () => sfx.whoosh()],
      [7.9, () => sfx.squeak()],
      [9.2, () => sfx.plasma()],
    ],
  },

  dinoIntro: {
    dur: 11.5,
    cuts: [3.6, 7],
    captions: [
      [0.5, 3.4, 'One quiet night, long, long ago...'],
      [3.8, 6.9, '...the aliens came to steal the dinosaurs!'],
      [7.2, 9.4, 'But they forgot about one thing...'],
      [9.4, 11.5, 'You can ROAR! Press SPACE to roar, ↑ to jump.'],
    ],
    setup(c) {
      c.babies = [new Dino(740, 'trike', 0.55), new Dino(800, 'stego', 0.55), new Dino(860, 'raptor', 0.55)]
      c.babies.forEach((b) => (b.face = -1))
    },
    script: [
      [3.8, () => sfx.whoosh()],
      [5.4, () => sfx.warn()],
      [5.6, () => sfx.squeak()],
      [8.8, (c, game) => {
        sfx.roar(true)
        game.shake = 18
        for (let i = 0; i < 4; i++) game.fx.add({ x: 700, y: 300, size: 500, color: '#fff', type: 'ring', life: 0.6 + i * 0.15, width: 12 - i * 2 })
      }],
      [9.1, () => sfx.stun()],
    ],
    draw(ctx, c, game) {
      const t = c.t
      const now = game.time
      let theme = getTheme('dinos')
      let cam = camAt(lerp(660, 720, t / 3.6), 340, 1.4)
      if (t >= 3.6 && t < 7) {
        theme = mixTheme('dinos', 'night', ease(seg(t, 3.6, 5)))
        cam = camAt(720, lerp(300, 280, seg(t, 3.6, 7)), 1.05)
      } else if (t >= 7) {
        theme = getTheme('night')
        const z = ease(seg(t, 7, 8.6))
        cam = camAt(lerp(700, 660, z), lerp(290, 372, z), lerp(1, 1.9, z))
        if (t > 9) cam = camAt(700, 300, lerp(1.9, 1.1, ease(seg(t, 9, 9.8))))
      }
      game.drawWorld(ctx, theme, cam, () => {
        const night = t >= 3.6
        const roar = t > 8.8 && t < 10 ? Math.sin(seg(t, 8.8, 10) * Math.PI) : 0
        const knock = ease(seg(t, 8.8, 9.6))
        // ufos
        const ufos = [
          [560, 0],
          [840, 0.4],
        ]
        const ufoPos = ufos.map(([x, delay]) => {
          const d = ease(seg(t, 3.8 + delay, 5.4 + delay))
          const kx = x + (x < 700 ? -1 : 1) * knock * 260
          return { x: kx, y: lerp(-80, 180, d) - knock * 120 }
        })
        // the baby being beamed
        const beamOnNow = t > 5.6 && t < 8.8
        if (beamOnNow) drawBeam(ctx, ufoPos[1].x, ufoPos[1].y + 10, GROUND, now, { enemy: true })
        for (const [i, b] of c.babies.entries()) {
          let y = GROUND - (night ? 0 : Math.abs(Math.sin(now * 5 + i)) * 14)
          if (i === 1 && beamOnNow) y = GROUND - ease(seg(t, 5.6, 8.6)) * 120
          if (i === 1 && t >= 8.8) y = Math.min(GROUND, GROUND - 120 + (t - 8.8) ** 2 * 900)
          b.y = y
          b.x = i === 1 && beamOnNow ? lerp(800, ufoPos[1].x, seg(t, 5.6, 6.5)) : b.x
          b.state = i === 1 && beamOnNow ? 'lifted' : 'walk'
          shadow(ctx, b.x, GROUND, 20)
          b.draw(ctx, now, { lookUp: night, scared: night })
        }
        shadow(ctx, 640, GROUND, 44)
        ctx.save()
        ctx.translate(640, GROUND)
        ctx.scale(1.3, 1.3)
        const eating = !night ? Math.max(0, Math.sin(now * 4)) * 0.3 : 0
        drawDino(ctx, 'rex', { time: now, roar: roar || eating, angry: t > 7.5, lookUp: night && t < 8.8 && !roar, blink: !night && now % 3 < 0.15 })
        ctx.restore()
        if (!night) drawLeaf(ctx, 690, GROUND - 60, now)
        for (const [i, p] of ufoPos.entries()) {
          if (t < 3.8) continue
          ctx.save()
          ctx.translate(p.x, p.y + Math.sin(now * 2.5 + i) * 4)
          drawUFO(ctx, { time: now, enemy: true, stun: t > 8.8, tilt: knock * (i ? 0.8 : -0.8) * (1 - seg(t, 9.6, 10.5)) })
          ctx.restore()
        }
      })
    },
  },

  alienWin: {
    dur: 9,
    cuts: [4],
    captions: [
      [0.4, 3.9, 'Mission complete! What a fantastic dino collection!'],
      [4.2, 9, 'The Galactic Zoo has amazing new friends. YOU WIN!'],
    ],
    script: [
      [0.3, () => sfx.capture()],
      [4, (c, game) => (game.fx.list = [])],
      [4.6, () => sfx.whoosh()],
      [6, () => sfx.firework()],
      [6.6, () => sfx.firework()],
      [7.2, () => sfx.firework()],
    ],
    update(c, game, dt) {
      if (c.t > 4 && Math.random() < dt * 3) {
        const x = rand(150, W - 150)
        const y = rand(80, 260)
        game.fx.burst(x, y, 40, { speed: 260, life: 1.2, size: 3, color: [pick(['#ff6b9a', '#7dffb0', '#ffe14a', '#6bb8ff'])], type: 'spark', g: 120, drag: 1.2 })
      }
    },
    draw(ctx, c, game) {
      const t = c.t
      const now = game.time
      if (t < 4) {
        const rise = ease(seg(t, 0.4, 3.8))
        const cam = camAt(640, lerp(330, 200, rise), lerp(1.4, 1.1, rise))
        game.drawWorld(ctx, getTheme('aliens'), cam, () => {
          const y = lerp(260, -60, rise)
          ctx.save()
          ctx.translate(640, y + Math.sin(now * 3) * 4)
          // a glowing bubble full of happy captured dinos
          circle(ctx, 0, 62, 50)
          ctx.fillStyle = 'rgba(160,255,210,0.25)'
          ctx.fill()
          ctx.lineWidth = 3
          ctx.strokeStyle = '#bfffe0'
          ctx.stroke()
          for (const [i, kind] of ['rex', 'trike', 'stego'].entries()) {
            ctx.save()
            ctx.translate(-26 + i * 26, 96 - Math.abs(Math.sin(now * 4 + i)) * 8)
            ctx.scale(0.35, 0.35)
            drawDino(ctx, kind, { time: now })
            ctx.restore()
          }
          drawUFO(ctx, { time: now, mood: 'happy', beam: true })
          ctx.restore()
          if (Math.random() < 0.5) game.fx.add({ x: 640 + rand(-40, 40), y: y + 100, vy: 80, life: 0.8, size: 10, color: 'rgba(160,255,210,0.7)', type: 'glow' })
        })
      } else {
        spaceShot(ctx, game, t, 60)
        const s = t - 4
        drawMothership(ctx, W / 2, 170, 0.85, now, 1 - seg(s, 2.6, 3.2))
        const up = ease(seg(s, 0.2, 2.4))
        ctx.save()
        ctx.translate(W / 2 + Math.sin(s * 3) * 30 * (1 - up), lerp(H + 40, 210, up))
        const sc = lerp(1.3, 0.3, up)
        ctx.scale(sc, sc)
        if (s < 2.5) drawUFO(ctx, { time: now, mood: 'happy' })
        ctx.restore()
        game.fx.draw(ctx)
        text(ctx, '★ YOU WIN! ★', W / 2, 330 + Math.sin(now * 3) * 6, 56, '#ffe14a')
      }
    },
  },

  alienLose: {
    dur: 8,
    captions: [
      [0.3, 3.4, 'Mayday! Mayday! Your UFO is going down!'],
      [3.6, 8, 'The dinos are free... this time. GAME OVER'],
    ],
    script: [
      [0.2, () => sfx.hurt()],
      [2.4, (c, game) => {
        sfx.boom()
        game.shake = 22
        game.fx.boom(660, GROUND - 20)
      }],
      [4.4, () => sfx.squeak()],
    ],
    update(c, game, dt) {
      if (c.t < 2.4 && Math.random() < dt * 40) {
        const f = ease(seg(c.t, 0.2, 2.4))
        game.fx.add({ x: lerp(380, 660, f), y: lerp(140, GROUND - 20, f * f), vx: rand(-20, 20), vy: -30, life: 1.5, size: 20, color: '#555', type: 'smoke', drag: 1 })
      }
      if (c.t > 2.4 && Math.random() < dt * 8) game.fx.add({ x: 660 + rand(-20, 20), y: GROUND - 20, vy: -50, vx: rand(-10, 10), life: 2, size: 18, color: '#666', type: 'smoke', drag: 0.5 })
    },
    draw(ctx, c, game) {
      const t = c.t
      const now = game.time
      const cam = camAt(lerp(520, 660, ease(seg(t, 0, 2.4))), lerp(270, 360, ease(seg(t, 0, 2.6))), lerp(1.1, 1.45, ease(seg(t, 2.4, 4))))
      game.drawWorld(ctx, getTheme('aliens'), cam, () => {
        if (t < 2.4) {
          const f = ease(seg(t, 0.2, 2.4))
          ctx.save()
          ctx.translate(lerp(380, 660, f), lerp(140, GROUND - 20, f * f))
          ctx.rotate(t * 7)
          drawUFO(ctx, { time: now, mood: 'dizzy', hurt: Math.floor(now * 10) % 2 === 0 })
          ctx.restore()
        } else {
          // the wreck and a dizzy little alien
          ctx.save()
          ctx.translate(660, GROUND - 6)
          ctx.rotate(0.4)
          ctx.globalAlpha = 0.9
          drawUFO(ctx, { time: 0, mood: 'dizzy', tilt: 0 })
          ctx.restore()
          if (t > 4) drawAlien(ctx, 720, GROUND - 16 - Math.abs(Math.sin(now * 3)) * 3, { time: now, mood: 'dizzy' })
          for (const [i, kind] of ['rex', 'trike', 'stego', 'raptor'].entries()) {
            const x = [480, 560, 820, 900][i]
            ctx.save()
            ctx.translate(x, GROUND - Math.abs(Math.sin(now * 6 + i)) * 26 * seg(t, 3, 3.5))
            ctx.scale(x < 660 ? 1 : -1, 1)
            drawDino(ctx, kind, { time: now, walk: now * 6 })
            ctx.restore()
          }
        }
      })
      if (t > 4.5) text(ctx, 'GAME OVER', W / 2, 150, 60, '#ff8fa0')
    },
  },

  dinoWin: {
    dur: 9,
    captions: [
      [0.3, 4, 'The aliens zoomed away in a panic!'],
      [4.2, 9, 'The moon shines over a safe valley. YOU WIN!'],
    ],
    script: [
      [0.4, () => sfx.whoosh()],
      [3.2, (c, game) => {
        sfx.roar(true)
        game.shake = 10
      }],
      [5, () => sfx.win()],
    ],
    update(c, game, dt) {
      if (c.t > 4 && Math.random() < dt * 6) game.fx.add({ x: rand(500, 900), y: GROUND - 80, vy: -70, vx: rand(-20, 20), life: 2, size: rand(18, 28), color: pick(['#ff5a7a', '#ff8fb0']), type: 'heart', drag: 0.5 })
    },
    draw(ctx, c, game) {
      const t = c.t
      const now = game.time
      const theme = mixTheme('night', 'moonlit', ease(seg(t, 1, 6)))
      const cam = camAt(700, lerp(270, 330, ease(seg(t, 0, 4))), lerp(1, 1.35, ease(seg(t, 2, 5))))
      // the moon comes out from behind the clouds
      drawSky(ctx, { ...theme, moon: false }, now)
      drawMoon(ctx, W / 2, lerp(H + 60, 150, ease(seg(t, 1, 6))))
      ctx.save()
      applyCam(ctx, cam)
      drawBackdrop(ctx, theme, cam.x, now)
      drawGround(ctx, theme, cam.x, now)
      for (let i = 0; i < 3; i++) {
        const f = ease(seg(t, 0.2 + i * 0.3, 2.6 + i * 0.3))
        ctx.save()
        ctx.translate(lerp(560 + i * 140, 1100 + i * 120, f), lerp(170 + i * 20, -200, f))
        ctx.scale(1 - f * 0.6, 1 - f * 0.6)
        drawUFO(ctx, { time: now, enemy: true, mood: 'sad', tilt: 0.3 })
        ctx.restore()
      }
      const roar = t > 3.2 && t < 4.4 ? Math.sin(seg(t, 3.2, 4.4) * Math.PI) : 0
      shadow(ctx, 680, GROUND, 44)
      ctx.save()
      ctx.translate(680, GROUND - (t > 4.5 ? Math.abs(Math.sin(now * 4)) * 20 : 0))
      ctx.scale(1.3, 1.3)
      drawDino(ctx, 'rex', { time: now, roar, blink: now % 3 < 0.15 })
      ctx.restore()
      for (const [i, kind] of ['trike', 'stego', 'raptor', 'bronto'].entries()) {
        const x = [560, 780, 840, 500][i]
        ctx.save()
        ctx.translate(x, GROUND - (t > 4 ? Math.abs(Math.sin(now * 6 + i)) * 24 : 0))
        ctx.scale((x < 680 ? 1 : -1) * 0.55, 0.55)
        drawDino(ctx, kind, { time: now, lookUp: t < 3 })
        ctx.restore()
      }
      game.fx.draw(ctx)
      drawForeground(ctx, theme, cam.x, now)
      ctx.restore()
      if (t > 5) text(ctx, '★ YOU WIN! ★', W / 2, 140 + Math.sin(now * 3) * 6, 56, '#ffe14a')
    },
  },

  dinoLose: {
    dur: 8,
    captions: [
      [0.3, 4, 'Oh no! The aliens beamed you up!'],
      [4.2, 8, 'Off to the space zoo... GAME OVER'],
    ],
    script: [
      [0.3, () => sfx.squeak()],
      [4.3, () => sfx.whoosh()],
    ],
    draw(ctx, c, game) {
      const t = c.t
      const now = game.time
      const cam = camAt(700, lerp(330, 240, ease(seg(t, 0, 4))), lerp(1.4, 1, ease(seg(t, 0, 4))))
      game.drawWorld(ctx, getTheme('night'), cam, () => {
        const zoom = ease(seg(t, 4.2, 5.4))
        const ux = 700 + zoom * 500
        const uy = 170 - zoom * 400
        const lift = ease(seg(t, 0, 4))
        if (t < 4.2) drawBeam(ctx, ux, uy + 10, GROUND, now, { enemy: true })
        for (const [i, kind] of ['trike', 'stego'].entries()) {
          ctx.save()
          ctx.translate(560 + i * 300, GROUND)
          ctx.scale((i ? -1 : 1) * 0.55, 0.55)
          drawDino(ctx, kind, { time: now, lookUp: true, scared: true })
          ctx.restore()
        }
        if (t < 4.2) {
          ctx.save()
          ctx.translate(lerp(700, ux, lift), lerp(GROUND, uy + 110, lift))
          ctx.rotate(Math.sin(now * 5) * 0.25)
          ctx.scale(1.1, 1.1)
          drawDino(ctx, 'rex', { time: now, flail: true, scared: true })
          ctx.restore()
        }
        ctx.save()
        ctx.translate(ux, uy + Math.sin(now * 2.5) * 4)
        drawUFO(ctx, { time: now, enemy: true, beam: t < 4.2, mood: 'happy' })
        ctx.restore()
      })
      if (t > 5) text(ctx, 'GAME OVER', W / 2, 160, 60, '#ff8fa0')
    },
  },
}
