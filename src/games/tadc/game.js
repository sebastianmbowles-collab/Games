// THE AMAZING DIGITAL CIRCUS: BOSS RUSH
// A 2D, 8-bit boss-rush platformer. Pomni can only run and jump. Everyone else is a boss.
// This file runs the whole show: title, menus, boss intros, fights, game over, the ending and records.

import { drawText, textWidth } from './font'
import { SPR, drawSprite } from './sprites'
import { VW, VH, GROUND_Y, INK, DIFFS, clamp, rand, fmtTime, seeded } from './consts'
import { ARENAS, drawBackground, drawFloor, drawPlatforms } from './arena'
import { Pomni, drawPomni, setOutfit } from './player'
import { BOSSES, makeBoss } from './bosses'
import { sfx, wakeAudio, playMusic, stopMusic, setMusicOn, setSfxOn, setTempo, duckMusic } from './sound'

export { VW, VH }

const STORE_KEY = 'tadc-bossrush-v1'
const STEP = 1 / 120
const KEYMAP = {
  ArrowLeft: ['left'], a: ['left'], A: ['left'],
  ArrowRight: ['right'], d: ['right'], D: ['right'],
  ArrowUp: ['up', 'jump'], w: ['up', 'jump'], W: ['up', 'jump'],
  ArrowDown: ['down'], s: ['down'], S: ['down'],
  ' ': ['jump', 'confirm'], z: ['jump', 'confirm'], Z: ['jump', 'confirm'], k: ['jump', 'confirm'], K: ['jump', 'confirm'],
  Enter: ['start', 'confirm'], p: ['start'], P: ['start'],
  Escape: ['back', 'start'], x: ['back'], X: ['back'], Backspace: ['back'],
}
const MENU = ['START', 'HOW TO PLAY', 'BOSSES', 'OPTIONS']
const JUKEBOX = [
  ['menu', 'BIG TOP MARCH (MENU)'],
  ['jax', 'PFFFT POLKA (JAX)'],
  ['ragatha', 'BUTTON BARRAGE (RAGATHA)'],
  ['gangle', 'RIBBON BALLAD (GANGLE)'],
  ['kinger', 'PILLOW PANIC (KINGER)'],
  ['caine', 'THE FINAL SHOW (CAINE)'],
  ['zooble', 'SPARE PARTS (ZOOBLE)'],
  ['ending', 'OR IS IT? (ENDING)'],
]

// Challenges: a boss you know, with a twist. (Unlocked after beating the game.)
// mods: dark (only a little light around Pomni), grav (gravity), speed (game speed),
// conveyor (the floor pushes you), ice (the whole floor is slippery). diff forces a difficulty.
const CHALLENGES = [
  { name: 'LIGHTS OUT', boss: 0, mods: { dark: true }, about: 'JAX, BUT SOMEONE TURNED OFF THE LIGHTS.' },
  { name: 'MOON BOUNCE', boss: 3, mods: { grav: 0.55 }, about: 'KINGER ON THE MOON. FLOATY JUMPS!' },
  { name: 'DOUBLE TIME', boss: 1, mods: { speed: 1.3 }, about: 'RAGATHA, BUT EVERYTHING IS FASTER.' },
  { name: 'TREADMILL', boss: 2, mods: { conveyor: -30 }, about: 'GANGLE, AND THE FLOOR KEEPS MOVING.' },
  { name: 'ICE RINK', boss: 5, mods: { ice: true }, about: 'ZOOBLE ON A FROZEN FLOOR. SLIDE!' },
  { name: 'POGO', boss: 0, mods: { pogo: true }, about: "JAX, BUT POMNI CAN'T STOP BOUNCING!" },
  { name: 'NO MERCY', boss: 4, diff: 2, mods: {}, about: 'THE FINAL SHOW ON HARD MODE. GOOD LUCK.' },
]
const TIMED_STATES = new Set(['intro', 'countdown', 'fight', 'dying', 'gameover', 'defeat'])
const WIPE_STATES = new Set(['title', 'howto', 'bosses', 'options', 'records', 'jukebox', 'challenges', 'map', 'intro', 'gameover', 'results', 'credits'])

function loadSave() {
  const base = { diff: 1, music: true, sfx: true, timer: true, reached: 0, beaten: [-1, -1, -1, -1, -1, -1], records: {}, badges: {}, encore: {}, bossDeaths: {}, challenges: {}, close: 0, outfit: 'CLASSIC', deaths: 0, runs: 0 }
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY))
    if (s && typeof s === 'object') {
      // Older saves only know about five bosses: give Zooble a slot too.
      const beaten = base.beaten.map((b, i) => (s.beaten && s.beaten[i] !== undefined ? s.beaten[i] : b))
      return { ...base, ...s, beaten, records: s.records || {}, badges: s.badges || {}, encore: s.encore || {}, bossDeaths: s.bossDeaths || {}, challenges: s.challenges || {} }
    }
  } catch {
    // No save yet, or storage is blocked.
  }
  return base
}

// +1.23 or -0.45: how far ahead (green) or behind (red) your best run you are.
function fmtDelta(d) {
  const a = Math.abs(d)
  const m = Math.floor(a / 60)
  const sec = (a % 60).toFixed(2)
  return (d <= 0 ? '-' : '+') + (m ? `${m}:${sec.padStart(5, '0')}` : sec)
}

export class TadcGame {
  constructor(canvas) {
    this.canvas = canvas
    canvas.width = VW
    canvas.height = VH
    this.c = canvas.getContext('2d')
    this.save = loadSave()
    setOutfit(this.save.outfit)
    setMusicOn(this.save.music)
    setSfxOn(this.save.sfx)
    this.t = 0
    this.st = 0
    this.state = 'title'
    this.keyHeld = {}
    this.touchHeld = {}
    this.pressed = new Set()
    this.parts = []
    this.floats = []
    this.haz = []
    this.platforms = []
    this.shake = 0
    this.flashT = 0
    this.glitch = 0
    this.msel = 0
    this.osel = 0
    this.gsel = 0
    this.csel = 0
    this.psel = 0
    this.gameoverSel = 0
    this.paused = false
    this.idleT = 0
    this.helpT = 0
    this.hits = []
    this.conveyor = 0
    this.floorScroll = 0
    this.slip = false
    this.resetArm = 0

    this.onKey = this.onKey.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    this.onPointer = this.onPointer.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.loop = this.loop.bind(this)
    window.addEventListener('keydown', this.onKey)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('visibilitychange', this.onBlur)
    canvas.addEventListener('pointerdown', this.onPointer)
    this.acc = 0
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKey)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('visibilitychange', this.onBlur)
    this.canvas.removeEventListener('pointerdown', this.onPointer)
    stopMusic()
  }

  persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.save))
    } catch {
      // Saving is optional.
    }
  }

  // ---------- Input ----------

  held(a) {
    return !!(this.keyHeld[a] || this.touchHeld[a] || (this.padHeld && this.padHeld[a]))
  }

  // A little shake for phones and controllers (not in calm mode).
  buzz(ms) {
    if (this.save.calm) return
    try {
      if (navigator.vibrate) navigator.vibrate(ms)
      const pad = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find((p) => p && p.vibrationActuator)
      if (pad) pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: 0.6, weakMagnitude: 0.4 })?.catch?.(() => {})
    } catch {
      // No rumble here. That's fine.
    }
  }

  // Game controllers: d-pad or left stick to move, A to jump, B to go back, START to pause.
  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    let pad = null
    for (const p of pads) if (p && p.connected) pad = pad || p
    if (!pad && !this.padHeld) return
    this.padHeld = this.padHeld || {}
    const now = {}
    if (pad) {
      const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed)
      const ax = pad.axes[0] || 0
      const ay = pad.axes[1] || 0
      now.left = b(14) || ax < -0.5
      now.right = b(15) || ax > 0.5
      now.up = b(12) || ay < -0.5
      now.down = b(13) || ay > 0.5
      now.jump = b(0) || b(12)
      now.confirm = b(0)
      now.back = b(1)
      now.start = b(9)
    }
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'confirm', 'back', 'start']) {
      const v = !!now[a]
      if (v && !this.padHeld[a]) {
        this.pressed.add(a)
        this.wake()
      }
      this.padHeld[a] = v
    }
  }

  wake() {
    wakeAudio()
    this.idleT = 0
  }

  onKey(e) {
    const acts = KEYMAP[e.key]
    if (!acts) return
    e.preventDefault()
    this.wake()
    for (const a of acts) {
      if (!e.repeat) this.pressed.add(a)
      this.keyHeld[a] = true
    }
  }

  onKeyUp(e) {
    const acts = KEYMAP[e.key]
    if (acts) for (const a of acts) this.keyHeld[a] = false
  }

  // Switched to another tab or window? Let go of every key, and pause the fight.
  onBlur(e) {
    if (e && e.type === 'visibilitychange' && document.visibilityState === 'visible') return
    this.keyHeld = {}
    this.touchHeld = {}
    if (!this.paused && (this.state === 'fight' || this.state === 'countdown')) this.pause()
  }

  // Touch buttons from the page: 'left', 'right', 'jump' (the A button) and 'start'.
  setTouch(a, down) {
    this.wake()
    this.usedTouch = true
    const acts = a === 'jump' ? ['jump', 'confirm'] : a === 'start' ? ['start'] : [a]
    for (const x of acts) {
      if (down && !this.touchHeld[x]) this.pressed.add(x)
      this.touchHeld[x] = down
    }
  }

  onPointer(e) {
    this.wake()
    const r = this.canvas.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * VW
    const y = ((e.clientY - r.top) / r.height) * VH
    for (const h of this.hits) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        h.fn()
        return
      }
    }
    if (this.state !== 'fight' && this.state !== 'countdown') this.pressed.add('confirm')
  }

  // ---------- Flow ----------

  setState(s) {
    // Screens that change completely get an old-school pixel wipe.
    if (WIPE_STATES.has(s) && s !== this.state) this.wipeT = 0.4
    this.state = s
    this.st = 0
  }

  get d() {
    return DIFFS[this.run ? this.run.diff : this.save.diff]
  }

  toMenu() {
    this.paused = false
    this.run = null
    this.haz = []
    this.parts = []
    this.floats = []
    this.floats = []
    setTempo(1)
    playMusic('menu')
    this.setState('title')
    this.st = 9
  }

  startRun(practiceIdx = null, part = 0) {
    this.run = { mode: practiceIdx === null ? 'run' : 'practice', diff: this.save.diff, time: 0, deaths: 0, splits: [], part }
    if (this.run.mode === 'run') {
      this.save.runs++
      this.persist()
      return this.showMap(0)
    }
    this.beginBoss(practiceIdx ?? 0, false)
  }

  startChallenge(k) {
    const ch = CHALLENGES[k]
    this.run = { mode: 'challenge', diff: ch.diff ?? this.save.diff, time: 0, deaths: 0, splits: [], ch, mods: ch.mods }
    this.beginBoss(ch.boss, false)
  }

  update_challenges(dt, pr) {
    const k = this.st > 0.2 ? this.menuNav(pr, 'csel', CHALLENGES.length) : -1
    if (k >= 0) this.startChallenge(k)
    else if (pr('back')) {
      sfx.back()
      this.toMenu()
    }
  }

  draw_challenges(c) {
    drawBackground(c, 'menu', this.t)
    c.fillStyle = 'rgba(12, 6, 20, 0.7)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'CHALLENGES', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    const done = this.save.challenges
    CHALLENGES.forEach((ch, i) => {
      const y = 32 + i * 12
      this.menuLine(c, ch.name, 120, y, this.csel === i, () => ((this.csel = i), sfx.blip(), this.startChallenge(i)), {
        value: done[ch.name] ? 'DONE!' : '',
      })
    })
    const ch = CHALLENGES[this.csel || 0]
    // The boss for the selected challenge, standing on the left.
    const spr = SPR[BOSSES[ch.boss].key]
    drawSprite(c, spr, 56 - spr.ax, 112 - spr.length + Math.round(Math.sin(this.t * 2)), { look: [Math.sin(this.t * 0.8), 0.3] })
    c.fillStyle = '#f4f4f4'
    c.fillRect(20, 112, 72, 1)
    drawText(c, ch.about, VW / 2, 120, { align: 'center', color: '#68d8f8' })
    if (ch.diff !== undefined) drawText(c, `(ALWAYS ON ${DIFFS[ch.diff].name})`, VW / 2, 130, { align: 'center', color: DIFFS[ch.diff].color })
    const n = CHALLENGES.filter((x) => done[x.name]).length
    drawText(c, `DONE: ${n}/${CHALLENGES.length}   ALL ${CHALLENGES.length} = A BADGE AND AN OUTFIT!`, VW / 2, 148, { align: 'center', color: '#c8b8e0' })
    drawText(c, 'B: BACK', VW - 4, 167, { align: 'right', color: '#8c8c9c' })
    this.hits.push({ x: VW - 44, y: 158, w: 44, h: 18, fn: () => this.pressed.add('back') })
  }

  startEncore() {
    this.run = { mode: 'encore', diff: this.save.diff, time: 0, deaths: 0, splits: [] }
    this.beginBoss(BOSSES.findIndex((b) => b.encore), false)
  }

  beginBoss(idx, retry) {
    this.paused = false
    this.bossIdx = idx
    const info = BOSSES[idx]
    this.arenaKey = info.key
    this.platforms = ARENAS[info.key].platforms
    this.haz = []
    this.parts = []
    this.floats = []
    this.conveyor = (this.run.mods && this.run.mods.conveyor) || 0
    this.floorScroll = 0
    this.slip = false
    this.pomniSay = null
    this.finalBanner = null
    this.partBanner = null
    this.boss = makeBoss(this, idx, this.d, 1000 + idx * 97 + this.run.diff * 13)
    // Practising one part: start just before it.
    if (this.run.part && info.parts) this.boss.skipTo(info.parts[this.run.part] - 0.8)
    const kinger = info.key === 'kinger'
    const spawn = kinger ? { x: this.platforms[0].x + 18, y: this.platforms[0].y - 26 } : { x: 40, y: GROUND_Y - 26 }
    this.pomni = new Pomni(spawn.x, spawn.y)
    this.pomni.onFloor = !kinger
    this.touchedFloor = false
    if (!info.bonus) this.save.reached = Math.max(this.save.reached, idx)
    this.persist()
    setTempo(1)
    playMusic(info.encore ? this.boss.key : info.key, true)
    if (retry) {
      this.boss.entranceY = 0
      this.setState('countdown')
    }
    else {
      this.setState('intro')
      sfx.dunDunDun()
    }
  }

  newPart(n, of) {
    this.partBanner = { text: `PART ${n} OF ${of}`, at: this.t }
    sfx.blip()
  }

  finalAttack() {
    this.finalBanner = this.t
    // Of course.
    this.pomniSay = { text: 'OH NO.', until: this.t + 1.3 }
    sfx.talk('pomni', 'OH NO')
    this.shake = 0.5
    sfx.warn()
    sfx.shake()
  }

  setConveyor(v) {
    this.conveyor = v
  }

  die(killer, haz = null) {
    if (this.state !== 'fight') return
    this.killer = killer
    this.killerHaz = haz
    this.run.deaths++
    this.run.tries = this.run.tries || {}
    this.run.tries[this.bossIdx] = (this.run.tries[this.bossIdx] || 1) + 1
    this.save.deaths++
    const who = this.boss.key
    this.save.bossDeaths[who] = (this.save.bossDeaths[who] || 0) + 1
    this.persist()
    this.setState('dying')
    stopMusic()
    setTempo(1)
    sfx.hurt()
    if (killer === 'cushion') sfx.pfft()
    this.buzz(150)
    this.flashT = 0.12
    this.shake = 0.3
    this.glitch = 0.5
    this.boss.mood = 'pleased'
    // (In Encore it's whoever is on stage who gets to gloat.)
    const gloat = this.boss.sub || this.boss
    gloat.say(gloat.win, 3)
    if (this.run.mode === 'encore') {
      // Endless mode: how long did you last?
      const name = DIFFS[this.run.diff].name
      const best = this.save.encore[name]
      const b = this.boss
      this.encoreResult = { time: b.time, wave: b.wave, best: best ? best.time : 0, isNew: !this.run.slow && (!best || b.time > best.time) }
      if (this.encoreResult.isNew) this.save.encore[name] = { time: b.time, wave: b.wave }
      this.persist()
    }
  }

  startDefeat() {
    this.setState('defeat')
    for (const h of this.haz) {
      const x = h.x ?? h.cx
      const y = h.y ?? h.cy
      if (x !== undefined) this.puff(x + (h.w || 0) / 2, y, ['#f4f4f4', '#c8b8e0'], 3)
    }
    this.haz = []
    this.conveyor = 0
    this.boss.mood = 'defeated'
    this.boss.bubbleText = null
    this.defeatFanfare = false
    // The music cuts out. For the final boss: total silence.
    stopMusic()
    setTempo(1)
    if (this.bossIdx === 4) {
      setTimeout(() => this.state === 'defeat' && this.boss.say('...', 2.5), 1000)
      setTimeout(() => {
        if (this.state !== 'defeat' || !this.boss.bub) return
        this.boss.bub.text = { text: 'CAN I EAT THE CANE NOW?', until: this.t + 2.5 }
        sfx.talk('bubble', 'CAN I EAT THE CANE NOW')
      }, 3600)
    }
    else this.boss.say(this.boss.defeat, 3)
    const i = this.bossIdx
    // Speedrun split: the total time when each boss went down, compared with your best run.
    this.splitDelta = null
    if (this.run.mode === 'run') {
      this.run.splits[i] = this.run.time
      const pb = (this.save.records[DIFFS[this.run.diff].name] || {}).pbSplits
      if (pb && pb[i] !== undefined) this.splitDelta = this.run.time - pb[i]
    }
    this.newBadge = null
    this.newCostume = null
    if (this.run.mode === 'challenge' && !this.run.slow) {
      const done = this.save.challenges
      if (!done[this.run.ch.name]) this.newBadge = `${this.run.ch.name} DONE`
      done[this.run.ch.name] = true
      if (CHALLENGES.every((x) => done[x.name]) && !this.save.badges.showstopper) {
        this.save.badges.showstopper = true
        this.newBadge = 'SHOWSTOPPER'
      }
      this.persist()
      return
    }
    // Practising just one part is great training, but only a whole fight (at full speed) counts.
    if (this.run.part || this.run.slow || this.run.mode === 'challenge') return
    // First time beating this boss on Hard or harder: you can dress up as them now!
    this.newCostume = this.save.beaten[i] < 2 && this.run.diff >= 2 && i <= 5 ? BOSSES[i].name.split(' ')[0] : null
    this.save.beaten[i] = Math.max(this.save.beaten[i], this.run.diff)
    this.save.reached = Math.max(this.save.reached, Math.min(4, i + 1))
    if (this.boss.key === 'zooble' && !this.save.badges.zooble) {
      this.newBadge = 'SPARE PARTS'
      this.save.badges.zooble = true
    }
    if (this.boss.key === 'kinger' && !this.touchedFloor) {
      this.newBadge = 'PILLOW MASTER'
      this.save.badges.pillowMaster = true
    }
    this.persist()
  }

  finishRun() {
    const r = this.run
    const name = DIFFS[r.diff].name
    const rec = (this.save.records[name] ||= {})
    const segs = r.splits.map((t, i) => t - (i ? r.splits[i - 1] : 0))
    this.results = { time: r.time, deaths: r.deaths, close: r.close || 0, diff: name, news: [], badges: [], segs, gold: [] }
    if (r.slow) this.results.badges.push('SLOW-MO RUN: NOT RECORDED')
    if (r.mode === 'run' && !r.slow) {
      // Gold splits: the fastest you've ever beaten each boss, one boss at a time.
      rec.gold = rec.gold || []
      segs.forEach((s, i) => {
        if (rec.gold[i] === undefined || s < rec.gold[i]) {
          this.results.gold[i] = rec.gold[i] !== undefined
          rec.gold[i] = s
        }
      })
      if (!rec.any || r.time < rec.any) {
        rec.any = r.time
        rec.pbSplits = r.splits.slice()
        this.results.news.push('ANY%')
      }
      if (r.deaths === 0 && (!rec.nodeath || r.time < rec.nodeath)) {
        rec.nodeath = r.time
        this.results.news.push('NO DEATH')
      }
      if (r.deaths === 0 && r.diff >= 2 && !this.save.badges.perfect) {
        this.save.badges.perfect = true
        this.results.badges.push('PERFECT RUN')
      }
      if (r.diff >= 1 && r.time < 390 && !this.save.badges.speedy) {
        this.save.badges.speedy = true
        this.results.badges.push('SPEEDY')
      }
      if (r.diff === 3 && !this.save.badges.insane) {
        this.save.badges.insane = true
        this.results.badges.push('INSANE CLEAR')
      }
      if (!this.save.badges.cleared) {
        this.save.badges.cleared = true
        this.results.badges.push('ESCAPED THE CIRCUS?')
        this.results.badges.push('NEW: ENCORE, CHALLENGES, BONUS BOSS!')
      }
      // Every badge here also unlocks an outfit.
      if (this.results.badges.length) this.results.badges.push('NEW OUTFIT IN OPTIONS!')
    }
    this.persist()
  }

  // Little dust clouds at Pomni's feet.
  dust(x, y, n = 3) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rand(-4, 4), y, vx: rand(-30, 30), vy: rand(-40, -10), life: rand(0.2, 0.35), color: '#c8b8e0' })
  }

  puff(x, y, colors, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: rand(-70, 70), vy: rand(-120, -20), life: rand(0.35, 0.8), color: colors[i % colors.length] })
  }

  closeCall() {
    if (this.t - (this.lastClose ?? -9) < 1.6) return
    this.lastClose = this.t
    this.save.close = (this.save.close || 0) + 1
    if (this.run) this.run.close = (this.run.close || 0) + 1
    if (this.save.close >= 100) this.award('daredevil', 'DAREDEVIL')
    const p = this.pomni
    this.flash(Math.random() < 0.5 ? 'CLOSE!' : 'PHEW!', p.x + p.w / 2, p.y - 8, '#68d8f8')
    sfx.blip()
    this.buzz(25)
    const b = this.boss.sub || this.boss
    b.nearMiss()
  }

  flash(text, x, y, color = '#f8c830') {
    this.floats.push({ text, x, y, life: 1.2, color })
  }

  // ---------- Main loop ----------

  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    this.pollPad()
    // Slow motion (an assist option) slows down the fights, but not the menus.
    const playing = this.state === 'fight' || this.state === 'countdown'
    const speed = playing ? (this.save.slow ? 0.75 : 1) * ((this.run && this.run.mods && this.run.mods.speed) || 1) : 1
    this.acc += dt * speed
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
    const pr = (a) => this.pressed.has(a)
    // Quieter music while paused.
    if (!!this.paused !== !!this.ducked) {
      this.ducked = !!this.paused
      duckMusic(this.ducked)
    }
    if (this.paused) {
      this.updatePause(pr)
      return
    }
    this.st += dt
    this.shake = Math.max(0, this.shake - dt)
    this.flashT = Math.max(0, this.flashT - dt)
    this.wipeT = Math.max(0, (this.wipeT || 0) - dt)
    this.glitch = Math.max(0, this.glitch - dt)
    for (const q of this.parts) {
      q.vy += 300 * dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      q.life -= dt
    }
    this.parts = this.parts.filter((q) => q.life > 0)
    for (const f of this.floats) {
      f.y -= 12 * dt
      f.life -= dt
    }
    this.floats = this.floats.filter((f) => f.life > 0)
    if (this.run && this.run.mode === 'run' && TIMED_STATES.has(this.state)) this.run.time += dt

    const fn = this['update_' + this.state]
    if (fn) fn.call(this, dt, pr)
  }

  // A tiny vertical menu helper: returns the chosen index when confirmed, or -1.
  menuNav(pr, key, count) {
    // Left/right also move through menus (handy on touch screens), except in Options where they change values.
    const sideways = key !== 'osel'
    if (pr('up') || (sideways && pr('left'))) {
      this[key] = (this[key] + count - 1) % count
      sfx.beep()
    }
    if (pr('down') || (sideways && pr('right'))) {
      this[key] = (this[key] + 1) % count
      sfx.beep()
    }
    if (pr('confirm')) {
      sfx.blip()
      return this[key]
    }
    return -1
  }

  // ---------- Title + main menu ----------

  update_title(dt, pr) {
    const menuAt = 8.8
    if (this.st < menuAt) {
      if (pr('confirm') || pr('start')) {
        this.st = menuAt
        playMusic('menu')
      }
      if (this.st >= 6.4 && this.st - dt < 6.4) sfx.text()
      if (this.st >= 7.3 && this.st - dt < 7.3) for (let i = 0; i < 6; i++) setTimeout(() => sfx.text(), i * 60)
      return
    }
    if (this.st - dt < menuAt) playMusic('menu')
    // Secret: leave the title alone long enough and Pomni slowly looks at you...
    this.idleT += dt
    if (this.helpT > 0) {
      this.helpT -= dt
      if (this.helpT <= 0) playMusic('menu', true)
      return
    }
    if (this.idleT > 25) {
      this.idleT = 0
      this.helpT = 4.5
      stopMusic()
      sfx.static()
    }
    // Secret code: UP UP DOWN DOWN LEFT RIGHT LEFT RIGHT = GLOINK PARTY!
    for (const dir of ['up', 'down', 'left', 'right']) if (pr(dir)) this.code = [...(this.code || []), dir].slice(-8)
    if (this.code && this.code.join() === 'up,up,down,down,left,right,left,right') {
      this.code = []
      this.gloinkParty()
    }
    this.updateGloinks(dt)
    const k = this.menuNav(pr, 'msel', this.menuItems().length)
    if (k >= 0) this.menuPick(k)
  }

  // ---------- Gloink party (a secret) ----------

  gloinkParty() {
    sfx.secret()
    const cols = ['#f88828', '#8848c8', '#38b848', '#e03c9c', '#68d8f8', '#f8c830']
    this.gloinks = []
    for (let i = 0; i < 36; i++) {
      this.gloinks.push({ x: rand(4, VW - 10), y: rand(-160, -8), vx: rand(-30, 30), vy: 0, r: Math.floor(rand(3, 6)), col: cols[i % cols.length], life: rand(8, 11) })
    }
    this.floats.push({ text: 'GLOINK PARTY!', x: VW / 2, y: 156, life: 2.5, color: '#f8c830' })
  }

  updateGloinks(dt) {
    if (!this.gloinks) return
    for (const q of this.gloinks) {
      q.life -= dt
      q.vy += 400 * dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      if (q.y + q.r > 146) {
        q.y = 146 - q.r
        q.vy = -Math.abs(q.vy) * 0.75 - rand(20, 60)
        if (Math.random() < 0.15) sfx.blip()
      }
      if (q.x < q.r || q.x > VW - q.r) q.vx = -q.vx
    }
    this.gloinks = this.gloinks.filter((q) => q.life > 0)
    if (!this.gloinks.length) this.gloinks = null
  }

  drawGloinks(c) {
    if (!this.gloinks) return
    for (const q of this.gloinks) {
      if (q.life < 1 && Math.floor(this.t * 10) % 2) continue
      const x = Math.round(q.x)
      const y = Math.round(q.y)
      c.fillStyle = INK
      c.beginPath()
      c.arc(x, y, q.r + 1, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = q.col
      c.beginPath()
      c.arc(x, y, q.r, 0, Math.PI * 2)
      c.fill()
      // Two little eyes, looking wherever they're going.
      const lx = q.vx > 0 ? 1 : 0
      c.fillStyle = '#f4f4f4'
      c.fillRect(x - 2 + lx, y - 1, 2, 2)
      c.fillRect(x + 1 + lx, y - 1, 2, 2)
      c.fillStyle = INK
      c.fillRect(x - 1 + lx, y - 1, 1, 1)
      c.fillRect(x + 2 + lx, y - 1, 1, 1)
    }
  }

  // ENCORE appears on the menu once you've beaten the game.
  menuItems() {
    return this.save.badges.cleared ? [...MENU, 'ENCORE', 'CHALLENGES'] : MENU
  }

  menuPick(k) {
    if (k === 4) this.startEncore()
    else if (k === 5) this.setState('challenges')
    else if (k === 0) this.startRun()
    else if (k === 1) this.setState('howto')
    else if (k === 2) this.setState('bosses')
    else this.setState('options')
  }

  update_howto(dt, pr) {
    if (this.st < 0.2) return
    // Page 1: the basics. Page 2: all the extras.
    if (pr('confirm') && !this.howPage) {
      this.howPage = 1
      sfx.blip()
    } else if (pr('confirm') || pr('back') || pr('start')) {
      this.howPage = 0
      sfx.back()
      this.toMenu()
    }
  }

  // Zooble, the secret sixth boss, only shows up once you've beaten the game.
  galleryCount() {
    return this.save.badges.cleared ? 6 : 5
  }

  bossMet(i) {
    return BOSSES[i].bonus ? !!this.save.badges.cleared : i <= this.save.reached
  }

  update_bosses(dt, pr) {
    const n = this.galleryCount()
    if (pr('left')) {
      this.gsel = (this.gsel + n - 1) % n
      this.gpart = 0
      sfx.beep()
    }
    if (pr('right')) {
      this.gsel = (this.gsel + 1) % n
      this.gpart = 0
      sfx.beep()
    }
    // Up and down pick which part of the show to practise.
    const parts = BOSSES[this.gsel].parts.length
    if (this.bossMet(this.gsel) && (pr('up') || pr('down'))) {
      this.gpart = ((this.gpart || 0) + (pr('up') ? parts - 1 : 1)) % parts
      sfx.beep()
    }
    if (this.st > 0.2 && pr('confirm') && this.bossMet(this.gsel)) {
      sfx.blip()
      this.startRun(this.gsel, this.gpart || 0)
      return
    }
    if (pr('back')) {
      sfx.back()
      this.toMenu()
    }
  }

  optionItems() {
    const s = this.save
    return [
      ['DIFFICULTY', DIFFS[s.diff].name, (dir) => (s.diff = (s.diff + (dir || 1) + 4) % 4)],
      ['OUTFIT', s.outfit, (dir) => this.nextOutfit(dir || 1)],
      ['MUSIC', s.music ? 'ON' : 'OFF', () => setMusicOn((s.music = !s.music))],
      ['SOUND FX', s.sfx ? 'ON' : 'OFF', () => setSfxOn((s.sfx = !s.sfx))],
      ['SPEEDRUN TIMER', s.timer ? 'ON' : 'OFF', () => (s.timer = !s.timer)],
      ['CALM MODE', s.calm ? 'ON' : 'OFF', () => (s.calm = !s.calm)],
      ['SLOW MOTION', s.slow ? 'ON' : 'OFF', () => (s.slow = !s.slow)],
      ['JUKEBOX', '', () => this.openJukebox()],
      ['RECORDS', '', () => this.setState('records')],
      ['RESET SAVE', this.resetArm ? 'SURE? PRESS AGAIN' : '', () => this.resetSave()],
      ['BACK', '', () => this.toMenu()],
    ]
  }

  // ---------- Jukebox: listen to every song ----------

  openJukebox() {
    this.jsel = this.jsel || 0
    this.setState('jukebox')
    playMusic(JUKEBOX[this.jsel][0], true)
  }

  update_jukebox(dt, pr) {
    const n = JUKEBOX.length
    if (pr('left') || pr('up') || pr('right') || pr('down')) {
      this.jsel = (this.jsel + (pr('left') || pr('up') ? n - 1 : 1)) % n
      sfx.beep()
      playMusic(JUKEBOX[this.jsel][0], true)
    }
    if (pr('confirm')) playMusic(JUKEBOX[this.jsel][0], true)
    if (pr('back') || pr('start')) {
      sfx.back()
      playMusic('menu', true)
      this.setState('options')
    }
  }

  draw_jukebox(c) {
    drawBackground(c, 'menu', this.t)
    c.fillStyle = 'rgba(12, 6, 20, 0.7)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'JUKEBOX', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    JUKEBOX.forEach(([key, name], i) => {
      // (The bonus boss's song stays a secret until you've beaten the game.)
      if (key === 'zooble' && !this.save.badges.cleared) name = '??? (SECRET)'
      this.menuLine(c, name, 150, 34 + i * 12, this.jsel === i, () => {
        this.jsel = i
        playMusic(key, true)
      })
    })
    // Pomni dances along (and even Pomni has to admit it's a bop).
    const beat = Math.floor(this.t * 4)
    const frames = [SPR.pomniWave, SPR.pomniRun1, SPR.pomniJump, SPR.pomniRun2]
    drawPomni(c, frames[beat % 4], 70, 140 - (beat % 2) * 3, beat % 8 >= 4, { scale: 2, look: [Math.sin(this.t * 2), 0] })
    for (let i = 0; i < 3; i++) {
      const k = (this.t * 0.7 + i / 3) % 1
      drawText(c, i % 2 ? '+' : '*', 40 + i * 30, 120 - k * 80, { color: ['#f8c830', '#e03c9c', '#68d8f8'][i] })
    }
    drawText(c, 'B: BACK', VW - 4, 167, { align: 'right', color: '#8c8c9c' })
    this.hits.push({ x: VW - 44, y: 158, w: 44, h: 18, fn: () => this.pressed.add('back') })
  }

  // Every badge, whether you have it, and how to get it.
  badgeList() {
    const b = this.save.badges
    return [
      ['ESCAPED THE CIRCUS?', b.cleared, 'BEAT ALL FIVE BOSSES.'],
      ['PILLOW MASTER', b.pillowMaster, 'BEAT KINGER WITHOUT TOUCHING THE FLOOR.'],
      ['SPARE PARTS', b.zooble, b.cleared ? 'BEAT THE BONUS BOSS.' : '???'],
      ['DAREDEVIL', b.daredevil, `100 CLOSE CALLS. (${Math.min(100, this.save.close)}/100)`],
      ['SPEEDY', b.speedy, 'A FULL RUN UNDER 6:30 ON NORMAL OR HARDER.'],
      ['ENCORE STAR', b.encoreStar, 'REACH WAVE 10 IN ENCORE.'],
      ['PERFECT RUN', b.perfect, 'NO DEATHS ON HARD OR INSANE.'],
      ['INSANE CLEAR', b.insane, 'BEAT INSANE MODE.'],
      ['SHOWSTOPPER', b.showstopper, b.cleared ? 'FINISH ALL THE CHALLENGES.' : '???'],
    ]
  }

  // A badge earned in the middle of the action pops up at the top of the screen.
  award(key, name) {
    if (this.save.badges[key] || (this.run && this.run.slow)) return
    this.save.badges[key] = true
    this.persist()
    this.toast = { text: `BADGE: ${name}! (NEW OUTFIT)`, until: this.t + 3 }
    sfx.secret()
  }

  // Which outfits you've earned, and what earns the rest.
  outfitList() {
    const b = this.save.badges
    return [
      ['CLASSIC', true, ''],
      ['SWAPPED', b.cleared, 'BEAT ALL FIVE BOSSES'],
      ['PILLOW', b.pillowMaster, 'FIND THE PILLOW SECRET'],
      ['SPARE PARTS', b.zooble, 'BEAT THE BONUS BOSS'],
      ['GOLDEN', b.perfect, 'PERFECT RUN ON HARD OR INSANE'],
      ['ABSTRACTED', b.insane, 'BEAT INSANE MODE'],
      ['DAREDEVIL', b.daredevil, 'GET 100 CLOSE CALLS'],
      ['SPEEDY', b.speedy, 'A FULL RUN UNDER 6:30'],
      ['STAR', b.encoreStar, 'REACH WAVE 10 IN ENCORE'],
      ['SHOWSTOPPER', b.showstopper, 'FINISH ALL THE CHALLENGES'],
      // Costumes: beat a boss on HARD (or harder) to dress up as them.
      ...[['JAX', 0], ['RAGATHA', 1], ['GANGLE', 2], ['KINGER', 3], ['CAINE', 4], ['ZOOBLE', 5]].map(([n, i]) => [
        n,
        this.save.beaten[i] >= 2,
        i === 5 && !b.cleared ? '???' : `BEAT ${BOSSES[i].name} ON HARD`,
      ]),
    ]
  }

  nextOutfit(dir) {
    const got = this.outfitList().filter(([, ok]) => ok).map(([n]) => n)
    const i = got.indexOf(this.save.outfit)
    this.save.outfit = got[(i + dir + got.length) % got.length]
    setOutfit(this.save.outfit)
  }

  resetSave() {
    if (!this.resetArm) {
      this.resetArm = 1
      return
    }
    this.resetArm = 0
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      // Nothing saved.
    }
    this.save = loadSave()
    setOutfit(this.save.outfit)
    setMusicOn(true)
    setSfxOn(true)
    this.flash('SAVE ERASED', VW / 2, 140, '#e03c9c')
  }

  update_options(dt, pr) {
    const items = this.optionItems()
    if (pr('up') || pr('down')) this.resetArm = 0
    const k = this.st > 0.2 ? this.menuNav(pr, 'osel', items.length) : -1
    if (k >= 0) {
      items[k][2](1)
      this.persist()
    }
    if (this.osel <= 1 && (pr('left') || pr('right'))) {
      items[this.osel][2](pr('left') ? -1 : 1)
      sfx.beep()
      this.persist()
    }
    if (pr('back')) {
      sfx.back()
      this.toMenu()
    }
  }

  update_records(dt, pr) {
    if (this.st > 0.2 && (pr('confirm') || pr('back') || pr('start'))) {
      sfx.back()
      this.setState('options')
    }
  }

  // ---------- A boss fight ----------

  // ---------- The circus map (between bosses in a full run) ----------

  showMap(next) {
    this.mapTo = next
    this.setState('map')
    playMusic('menu', true)
  }

  update_map(dt, pr) {
    if (this.st >= 0.3 && this.st - dt < 0.3) sfx.talk('caine', 'WELCOME TO THE BOSS RUSH')
    if (this.st >= 1.0 && this.st - dt < 1.0) sfx.step()
    if (this.st >= 2.6 && this.st - dt < 2.6) sfx.dunDunDun()
    if (this.st > 3.6 || (this.st > 0.4 && (pr('confirm') || pr('start')))) this.beginBoss(this.mapTo, false)
  }

  draw_map(c) {
    const t = this.t
    // Night sky over the digital circus.
    c.fillStyle = '#0c0818'
    c.fillRect(0, 0, VW, VH)
    for (let i = 0; i < 40; i++) {
      const x = (i * 73) % VW
      const y = (i * 37) % 90
      c.fillStyle = Math.floor(t * 2 + i) % 5 ? '#4c3c6c' : '#f4f4f4'
      c.fillRect(x, y, 1, 1)
    }
    // The big top in the distance.
    c.fillStyle = '#2a1040'
    c.beginPath()
    c.moveTo(110, 96)
    c.lineTo(160, 40)
    c.lineTo(210, 96)
    c.fill()
    c.fillStyle = '#1b0c30'
    c.fillRect(0, 96, VW, VH - 96)
    drawText(c, 'THE DIGITAL CIRCUS', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    // The path and the five tents.
    const tx = (i) => 36 + i * 62
    const ty = (i) => 134 + (i % 2 ? -8 : 4)
    c.fillStyle = '#5c4c78'
    for (let x = 4; x < tx(4); x += 4) {
      const i = Math.min(4, Math.max(0, (x - 36) / 62))
      const a = Math.floor(i)
      const k = i - a
      const y = ty(a) + (ty(Math.min(4, a + 1)) - ty(a)) * k
      c.fillRect(x, Math.round(y + 2), 2, 1)
    }
    const colors = ['#8848c8', '#d82838', '#e03c9c', '#6c34f4', '#cc243c']
    for (let i = 0; i < 5; i++) {
      const x = tx(i)
      const y = ty(i)
      const done = i < this.mapTo
      const next = i === this.mapTo
      // A striped tent.
      for (let s = 0; s < 6; s++) {
        c.fillStyle = s % 2 ? '#f4f4f4' : colors[i]
        c.beginPath()
        c.moveTo(x, y - 40)
        c.lineTo(x - 21 + s * 7, y)
        c.lineTo(x - 21 + (s + 1) * 7, y)
        c.fill()
      }
      c.fillStyle = INK
      c.fillRect(x - 4, y - 12, 8, 12)
      c.fillStyle = '#f8c830'
      c.fillRect(x, y - 47, 1, 7)
      c.fillRect(x + 1, y - 47, 5, 3)
      if (done) {
        c.fillStyle = 'rgba(12, 6, 20, 0.55)'
        c.fillRect(x - 22, y - 48, 45, 49)
        drawSprite(c, SPR.star, x - 3, y - 58)
      }
      const key = BOSSES[i].key
      const icon = SPR['icon' + key[0].toUpperCase() + key.slice(1)]
      if (next && icon) {
        const bob = Math.round(Math.sin(t * 4) * 2)
        drawSprite(c, icon, x - icon.ax, y - 49 - icon.length + bob, { look: [-1, 0] })
      }
      drawText(c, String(i + 1), x, y + 5, { align: 'center', color: next ? '#f8c830' : '#8c8c9c' })
    }
    // Pomni walks to the next tent.
    const from = this.mapTo === 0 ? 10 : tx(this.mapTo - 1) + 6
    const to = tx(this.mapTo) - 24
    const k = clamp((this.st - 0.4) / 1.8, 0, 1)
    const e = k * k * (3 - 2 * k)
    const px = from + (to - from) * e
    const a = this.mapTo === 0 ? 0 : this.mapTo - 1
    const py = this.mapTo === 0 ? ty(0) : ty(a) + (ty(this.mapTo) - ty(a)) * e
    const walking = k > 0 && k < 1
    const frame = walking ? (Math.floor(t * 8) % 2 ? SPR.pomniRun1 : SPR.pomniRun2) : SPR.pomniIdle
    drawPomni(c, frame, px, py + 3, false, { look: [1, 0] })
    // Caine pops in to set the scene.
    if (this.st > 0.3) {
      const lines = ['WELCOME TO THE BOSS RUSH!', 'ONE DOWN! FOUR TO GO!', 'HALFWAY THERE, SUPERSTAR!', 'ALMOST AT THE BIG TOP!', 'NOW... THE FINAL SHOW!']
      const ci = SPR.iconCaine
      const bob = Math.round(Math.sin(this.t * 3) * 2)
      drawSprite(c, ci, 8, 30 + bob, { look: [1, 0.3] })
      this.bubble(c, lines[this.mapTo], 8 + ci[0].length + 50, 44)
    }
    const info = BOSSES[this.mapTo]
    drawText(c, `NEXT: ${info.name}`, VW / 2, 154, { align: 'center', color: '#f4f4f4' })
    if (this.run && this.save.timer) drawText(c, fmtTime(this.run.time), VW / 2, 164, { align: 'center', color: '#8c8c9c' })
    if (this.st > 0.4 && Math.floor(t * 2) % 2) drawText(c, 'A: GO', VW - 4, 167, { align: 'right', color: '#8c8c9c' })
  }

  update_intro(dt, pr) {
    const info = BOSSES[this.bossIdx]
    // The boss drops onto the stage. THUMP.
    const b = this.boss
    if (!info.encore && b) {
      const k = clamp(this.st / 0.7, 0, 1)
      b.entranceY = -(1 - k) * (1 - k) * 150
      if (this.st >= 0.7 && this.st - dt < 0.7) {
        sfx.thump()
        this.shake = 0.15
        this.puff(b.x + b.spr.ax, b.y + b.h, ['#c8b8e0', '#f4f4f4'], 6)
      }
    }
    for (const [at0, who, text] of info.intro) {
      const at = at0 + 1.6
      if (this.st >= at && this.st - dt < at) {
        if (who === 'boss') this.boss.say(text, 1.6)
        else if (who === 'bubble') this.boss.bub.text = { text, until: this.t + 1.6 }
        else this.pomniSay = { text, until: this.t + 1.4 }
        if (who !== 'boss') sfx.talk(who, text)
        sfx.text()
        if (text === 'PFFFFFT.') sfx.pfft()
      }
    }
    this.boss.idle(dt)
    if (this.st > 6.2 || (this.st > 1 && pr('confirm'))) this.setState('countdown')
    if (pr('start') && !pr('confirm')) this.pause()
  }

  update_countdown(dt, pr) {
    this.boss.idle(dt)
    for (const at of [0, 0.6, 1.2]) if (this.st >= at && this.st - dt < at) sfx.countdown()
    if (this.st >= 1.8) {
      sfx.go()
      this.flash('GO!', VW / 2, 66, '#38b848')
      this.setState('fight')
    }
    if (pr('start')) this.pause()
  }

  pause() {
    this.paused = true
    this.psel = 0
    sfx.pause()
  }

  update_fight(dt, pr) {
    this.save.playTime = (this.save.playTime || 0) + dt
    if (this.save.slow) this.run.slow = true
    if (this.run.mode === 'encore' && this.boss.wave >= 10) this.award('encoreStar', 'ENCORE STAR')
    if (pr('start')) {
      this.pause()
      return
    }
    const p = this.pomni
    const b = this.boss
    const wasGround = p.onGround
    const wasVx = p.vx
    this.floorScroll += this.conveyor * dt
    p.update(dt, { left: this.held('left'), right: this.held('right'), jump: this.held('jump'), jumpPressed: pr('jump') }, {
      platforms: this.platforms,
      minX: 2,
      maxX: b.key === 'caine' ? VW - 2 : b.key === 'gangle' || b.key === 'kinger' ? b.x - 28 : b.x - 4,
      slip: this.slip,
      ice: !!(this.run.mods && this.run.mods.ice),
      conveyor: this.conveyor,
      grav: this.run.mods && this.run.mods.grav,
      pogo: !!(this.run.mods && this.run.mods.pogo),
    })
    // Dust when she lands, jumps, or sets off running.
    if (p.onGround !== wasGround || (p.onGround && Math.abs(wasVx) < 5 && Math.abs(p.vx) >= 5)) this.dust(p.x + p.w / 2, p.y + p.h, p.onGround && !wasGround ? 4 : 2)
    b.updateFight(dt)
    for (const h of this.haz) h.update(dt, this)
    this.haz = this.haz.filter((h) => !h.dead)
    this.collide()
    if (this.state !== 'fight') return
    if (p.onFloor) this.touchedFloor = true
    if (b.done) this.startDefeat()
  }

  collide() {
    const p = this.pomni
    const pb = p.box
    const near = { x: pb.x - 4, y: pb.y - 4, w: pb.w + 8, h: pb.h + 8 }
    let slip = false
    for (const h of this.haz) {
      if (h.kind === 'deadly' || h.kind === 'mine') {
        if (h.hits(pb)) return this.die(h.killer, h)
        // A near miss: it came really close, then went away without touching her.
        if (h.kind === 'deadly' && h.hits(near)) h.close = true
        else if (h.close && !h.closeDone) {
          h.closeDone = true
          this.closeCall()
        }
      } else if (h.kind === 'platform') {
        const landing = p.vy >= 0 && p.prevBottom <= h.y + 3 && p.y + p.h >= h.y - 1 && p.x + p.w > h.x + 1 && p.x < h.x + h.w - 1
        if (landing) {
          if (h.bouncy) {
            p.y = h.y - p.h - 1
            p.vy = -420
            p.onGround = false
            p.onFloor = false
            h.squish = 0.15
            sfx.boing()
          } else p.standOn(h.y, h.dx)
        } else if (h.hits(pb)) return this.die(h.killer, h)
      } else if (h.kind === 'slip' && p.onGround && h.covers(pb)) slip = true
    }
    this.slip = slip
  }

  update_dying(dt) {
    this.boss.idle(dt)
    if (this.st >= 0.7 && this.st - dt < 0.7) sfx.death()
    if (this.st >= 1.65 && this.st - dt < 1.65) {
      const p = this.pomni
      this.puff(p.x + 5, p.y + 6, ['#d82838', '#2c5ce0', '#f8c830', '#f4f4f4', '#f8dcc8'], 26)
    }
    if (this.st > 2.4) {
      this.gameoverSel = 0
      this.setState('gameover')
      sfx.gameOver()
    }
  }

  update_gameover(dt, pr) {
    if (this.st < 0.6) return
    if (pr('up') || pr('down') || pr('left') || pr('right')) {
      this.gameoverSel = 1 - this.gameoverSel
      sfx.beep()
    }
    if (pr('confirm') || pr('start')) {
      sfx.blip()
      if (this.gameoverSel === 0) this.beginBoss(this.bossIdx, true)
      else this.toMenu()
    }
  }

  update_defeat(dt, pr) {
    const caine = this.bossIdx === 4
    const p = this.pomni
    p.update(dt, { left: false, right: false, jump: false, jumpPressed: false }, { platforms: this.platforms, minX: 2, maxX: VW - 2, slip: false, conveyor: 0 })
    this.boss.idle(dt)
    const fanAt = caine ? 3.2 : 0.8
    // Pomni gets a word in too.
    const sayAt = caine ? 4.8 : 3.2
    if (this.st >= sayAt && this.st - dt < sayAt) {
      const lines = caine ? ['...IS IT REALLY OVER?'] : ['PHEW.', "I'M... STILL HERE?", 'OKAY. I CAN DO THIS.', 'NOT TODAY!', 'WHO IS NEXT?!']
      const text = lines[(this.bossIdx + this.run.deaths) % lines.length]
      this.pomniSay = { text, until: this.t + 2 }
      sfx.talk('pomni', text)
    }
    if (!this.defeatFanfare && this.st >= fanAt) {
      this.defeatFanfare = true
      sfx.fanfare()
      if (this.newBadge) setTimeout(() => sfx.secret(), 1300)
    }
    if (this.st > fanAt + 1.6 && (pr('confirm') || pr('start') || this.st > 16)) {
      sfx.blip()
      if (this.run.mode === 'practice') {
        this.toMenu()
        this.setState('bosses')
      } else if (this.run.mode === 'challenge') {
        this.toMenu()
        this.setState('challenges')
      } else if (this.bossIdx < 4) this.showMap(this.bossIdx + 1)
      else {
        this.finishRun()
        this.typed = null
        this.typed2 = null
        this.setState('ending')
      }
    }
  }

  updatePause(pr) {
    if (pr('start') && !pr('confirm')) {
      this.paused = false
      sfx.pause()
      return
    }
    const k = this.menuNav(pr, 'psel', 3)
    if (pr('back')) this.paused = false
    if (k === 0) this.paused = false
    else if (k === 1) {
      this.paused = false
      this.beginBoss(this.bossIdx, true)
    } else if (k === 2) this.toMenu()
  }

  update_ending(dt, pr) {
    const s = this.st
    const cross = (a) => s >= a && s - dt < a
    if (cross(1.5)) this.typed = { text: 'YOU SURVIVED.', at: this.t }
    if (cross(4.2)) this.typed2 = { text: '...SOMEHOW.', at: this.t }
    if (cross(5.0)) sfx.secret()
    if (cross(6.75)) sfx.thump()
    if (cross(10.2)) {
      playMusic('ending', true)
      sfx.glitch()
      this.glitch = 0.3
    }
    if (cross(11.6)) sfx.static()
    if (s > 16 || (s > 10.6 && pr('confirm'))) this.setState('results')
  }

  update_results(dt, pr) {
    if (this.st > 1 && (pr('confirm') || pr('start'))) {
      sfx.blip()
      this.setState('credits')
      playMusic('ending', true)
    }
  }

  // ---------- Credits ----------

  creditItems() {
    const icon = (k) => SPR['icon' + k[0].toUpperCase() + k.slice(1)]
    return [
      { text: 'THE AMAZING DIGITAL CIRCUS', scale: 2, color: '#f8c830' },
      { text: 'BOSS RUSH', scale: 2, color: '#d82838', gap: 24 },
      { text: 'STARRING', color: '#8c8c9c' },
      { text: 'POMNI', spr: SPR.pomniWave, color: '#f4f4f4', gap: 16 },
      { text: 'AND THE BOSSES', color: '#8c8c9c' },
      { text: 'JAX', spr: icon('jax'), color: '#a48cf4' },
      { text: 'RAGATHA', spr: icon('ragatha'), color: '#f43c4c' },
      { text: 'GANGLE', spr: icon('gangle'), color: '#f4346c' },
      { text: 'KINGER', spr: icon('kinger'), color: '#c8b8e0' },
      { text: 'CAINE + BUBBLE', spr: icon('caine'), color: '#f8c830' },
      { text: this.save.badges.zooble ? 'ZOOBLE' : '???', spr: icon('zooble'), shadow: !this.save.badges.zooble, color: '#68d8f8', gap: 24 },
      { text: 'GAME DESIGN', color: '#8c8c9c' },
      { text: 'SEB', scale: 2, color: '#f4f4f4', gap: 16 },
      { text: "MADE FOR SEB'S ARCADE", color: '#c8b8e0', gap: 16 },
      { text: 'TESTED BY', color: '#8c8c9c' },
      { text: 'A VERY DETERMINED ROBOT', color: '#68d8f8', gap: 16 },
      { text: 'BASED ON THE AMAZING DIGITAL CIRCUS', color: '#8c8c9c' },
      { text: 'BY GLITCH PRODUCTIONS', color: '#8c8c9c', gap: 40 },
      { text: 'THANKS FOR PLAYING!', scale: 2, color: '#f8c830' },
    ]
  }

  creditsLayout() {
    let y = 0
    return this.creditItems().map((it) => {
      const h = (it.spr ? it.spr.length + 4 : 0) + 6 * (it.scale || 1) + 6 + (it.gap || 0)
      const at = y
      y += h
      return { ...it, at, h }
    })
  }

  update_credits(dt, pr) {
    const items = this.creditsLayout()
    const total = items[items.length - 1].at + 60
    // The last line stops in the middle of the screen.
    if (this.st > 0.5 && (pr('confirm') || pr('start') || this.st > (total + VH / 2) / 30 + 2.5)) {
      sfx.blip()
      this.toMenu()
    }
  }

  draw_credits(c) {
    c.fillStyle = '#0c0818'
    c.fillRect(0, 0, VW, VH)
    for (let i = 0; i < 40; i++) {
      c.fillStyle = Math.floor(this.t * 2 + i) % 5 ? '#4c3c6c' : '#f4f4f4'
      c.fillRect((i * 73) % VW, (i * 41 + Math.floor(this.st * 6)) % VH, 1, 1)
    }
    const items = this.creditsLayout()
    const last = items[items.length - 1]
    const scroll = Math.min(this.st * 30, last.at + VH / 2 - 8)
    for (const it of items) {
      let y = Math.round(VH + it.at - scroll)
      if (y > VH || y + it.h < 0) continue
      if (it.spr) {
        const bob = Math.round(Math.abs(Math.sin(this.t * 4 + it.at)) * -2)
        const draw = it.spr === SPR.pomniWave ? drawPomni : null
        if (draw) draw(c, it.spr, VW / 2, y + it.spr.length + bob, false, { look: [0, 0.5] })
        else drawSprite(c, it.spr, VW / 2 - it.spr.ax, y + bob, { mode: it.shadow ? 'shadow' : 'normal', look: [Math.sin(this.t + it.at), 0.4] })
        y += it.spr.length + 4
      }
      drawText(c, it.text, VW / 2, y, { scale: it.scale || 1, align: 'center', color: it.color })
    }
    if (this.st > 1 && Math.floor(this.t * 2) % 2) drawText(c, 'A: SKIP', VW - 4, 167, { align: 'right', color: '#4c4c5c' })
  }

  // ---------- Drawing ----------

  render() {
    const c = this.c
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.imageSmoothingEnabled = false
    this.hits = []
    const calm = this.save.calm
    if (this.shake > 0 && !this.paused && !calm) c.translate(Math.round(rand(-2, 2)), Math.round(rand(-2, 2)))
    const fn = this['draw_' + this.state]
    if (fn) fn.call(this, c)
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (this.paused) {
      this.hits = []
      this.drawPause(c)
    }
    // Calm mode swaps the big white flash for a soft one, and skips the glitchy stripes.
    if (this.flashT > 0) {
      c.fillStyle = calm ? 'rgba(255, 255, 255, 0.25)' : '#ffffff'
      c.fillRect(0, 0, VW, VH)
    }
    if (this.wipeT > 0) this.drawWipe(c, this.wipeT / 0.4)
    if (this.glitch > 0 && !calm) this.drawGlitch(c)
  }

  // A menu line that also works with a mouse click or a finger tap.
  menuLine(c, label, x, y, selected, fn, { scale = 1, align = 'left', value = '' } = {}) {
    const full = label + (value ? '  ' + value : '')
    const w = textWidth(full, scale)
    const blink = selected && Math.floor(this.t * 6) % 2
    const color = selected ? (blink ? '#f4f4f4' : '#f8c830') : '#c8b8e0'
    const left = align === 'center' ? Math.round(x - w / 2) : x
    if (selected) drawText(c, '>', left - 8 * scale, y, { scale, color: '#f8c830' })
    drawText(c, label, left, y, { scale, color })
    if (value) drawText(c, value, left + textWidth(label + '  ', scale) + scale, y, { scale, color: selected ? '#f4f4f4' : '#8c8c9c' })
    this.hits.push({ x: left - 10, y: y - 3, w: w + 20, h: 6 * scale + 5, fn })
  }

  bubble(c, text, ax, ay, color = '#f4f4f4') {
    const w = textWidth(text) + 8
    const h = 11
    const x = clamp(Math.round(ax - w / 2), 2, VW - w - 2)
    const y = Math.max(2, Math.round(ay - h - 5))
    c.fillStyle = INK
    c.fillRect(x - 1, y - 1, w + 2, h + 2)
    c.fillStyle = color
    c.fillRect(x, y, w, h)
    const tx = clamp(Math.round(ax), x + 3, x + w - 3)
    c.fillStyle = INK
    c.fillRect(tx - 2, y + h + 1, 4, 2)
    c.fillStyle = color
    c.fillRect(tx - 1, y + h, 2, 3)
    drawText(c, text, x + 4, y + 3, { color: INK, shadow: null })
  }

  // ---------- Title screen ----------

  titlePixels() {
    if (this._titlePix) return this._titlePix
    const cv = document.createElement('canvas')
    cv.width = VW
    cv.height = VH
    const tc = cv.getContext('2d')
    const colors = ['#d82838', '#f8c830', '#2c5ce0', '#38b848', '#e03c9c', '#f88828', '#c8b8e0']
    const line = (str, y, scale) => {
      let x = VW / 2 - textWidth(str, scale) / 2
      for (let i = 0; i < str.length; i++) {
        drawText(tc, str[i], x, y, { scale, color: colors[(i + y) % colors.length] })
        x += 4 * scale
      }
    }
    line('THE AMAZING', 8, 2)
    line('DIGITAL CIRCUS', 22, 3)
    const data = tc.getImageData(0, 0, VW, VH).data
    const pix = []
    for (let y = 0; y < 45; y++)
      for (let x = 0; x < VW; x++) {
        const i = (y * VW + x) * 4
        if (data[i + 3] > 0) pix.push({ x, y, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` })
      }
    const r = seeded(7)
    for (let i = pix.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[pix[i], pix[j]] = [pix[j], pix[i]]
    }
    this._titlePix = { pix, img: cv }
    return this._titlePix
  }

  draw_title(c) {
    const s = this.st
    c.fillStyle = '#000000'
    c.fillRect(0, 0, VW, VH)
    const menuOn = s >= 8.8
    if (menuOn) {
      c.save()
      c.globalAlpha = Math.min(1, (s - 8.8) * 1.5) * 0.9
      drawBackground(c, 'menu', this.t)
      drawFloor(c, this.t * 10)
      c.restore()
    }
    // The title builds itself out of pixels, one at a time.
    const tp = this.titlePixels()
    const k = clamp((s - 0.5) / 3, 0, 1)
    if (k >= 1) c.drawImage(tp.img, 0, 0)
    else {
      const n = Math.floor(tp.pix.length * k * k)
      for (let i = 0; i < n; i++) {
        const p = tp.pix[i]
        c.fillStyle = p.c
        c.fillRect(p.x, p.y, 1, 1)
      }
      if (s > 0.25 && s < 0.6) {
        c.fillStyle = '#f4f4f4'
        c.fillRect(VW / 2, 30, 1, 1)
      }
    }
    if (s > 3.6) {
      const on = s > 4.2 || Math.floor(s * 12) % 2
      if (on) drawText(c, 'BOSS RUSH', VW / 2, 50, { scale: 2, align: 'center', color: '#f4f4f4', shadow: '#d82838' })
    }

    // Pomni, nervous, under the title.
    if (s > 4) {
      const px = menuOn ? 92 : VW / 2
      let spr = SPR.pomniIdle
      let flip = false
      if (s < 4.6) spr = SPR.pomniIdle
      else if (s < 5.2) flip = true
      else if (s < 5.8) flip = false
      else if (s < 6.4) flip = true
      else if (s < 6.9) spr = SPR.pomniLook
      else if (s < 8.2) spr = Math.floor(s * 4) % 2 ? SPR.pomniWave : SPR.pomniIdle
      if (menuOn) {
        spr = SPR.pomniIdle
        flip = Math.floor(this.t / 2.5) % 3 === 2
        // She reacts to what you point at: scary stuff makes her nervous, the rest gets a wave.
        const pick = this.menuItems()[this.msel]
        if (pick === 'START' || pick === 'ENCORE' || pick === 'CHALLENGES') spr = SPR.pomniScared
        else if ((pick === 'OPTIONS' || pick === 'HOW TO PLAY') && Math.floor(this.t * 3) % 2) spr = SPR.pomniWave
      }
      const alpha = clamp((s - 4) * 3, 0, 1)
      const shake = Math.round(Math.sin(this.t * 30) * 0.4)
      let look = [0, 0.15]
      if (s >= 4.6 && s < 6.4 && !menuOn) look = [flip ? 1 : -1, 0]
      if (menuOn) look = [Math.sin(this.t * 0.9) > 0.6 ? 1 : Math.sin(this.t * 0.9) < -0.6 ? -1 : 0, 0.1]
      if (this.helpT <= 0) drawPomni(c, spr, px + shake, 145, flip, { scale: 2, alpha, look })
      if (s > 6.4 && s < 6.9) drawText(c, '!', px + 8, 70, { scale: 2, color: '#f8c830' })
      if (s > 7.3 && s < 8.6) this.bubble(c, 'OH NO.', px + 14, 82)
      if (menuOn && this.helpT <= 0 && Math.floor(this.t * 1.3) % 5 === 0) drawSprite(c, SPR.sweat, px + 14, 88 + ((this.t * 20) % 6))
      if (this.helpT > 0) {
        c.fillStyle = 'rgba(0, 0, 0, 0.6)'
        c.fillRect(0, 0, VW, VH)
        // She slowly turns her eyes towards you...
        const k = clamp((4.5 - this.helpT) / 1.5, 0, 1)
        drawPomni(c, SPR.pomniIdle, px, 145, false, { scale: 2, look: [-1 + k, k * 0.4] })
        if (this.helpT < 3.4 && this.helpT > 0.6) this.bubble(c, '...HELP.', px + 14, 82)
      }
    }

    this.drawGloinks(c)
    for (const f of this.floats) drawText(c, f.text, f.x, f.y, { scale: 2, align: 'center', color: f.color })
    if (menuOn && this.helpT <= 0) {
      // Your badge collection, in the corner.
      const badges = this.badgeList()
      const got = badges.filter(([, ok]) => ok).length
      if (got === badges.length) {
        // Everything! A rainbow 100% for the true circus master.
        const rainbow = ['#d82838', '#f88828', '#f8c830', '#38b848', '#2c5ce0', '#8848c8']
        drawSprite(c, SPR.star, VW - 44, 158)
        drawText(c, '100%!', VW - 34, 159, { color: rainbow[Math.floor(this.t * 8) % rainbow.length] })
      } else if (got) {
        drawSprite(c, SPR.star, VW - 38, 158)
        drawText(c, `${got}/${badges.length}`, VW - 28, 159, { color: '#f8c830' })
      }
      const items = this.menuItems()
      const gap = items.length > 4 ? 10 : 13
      items.forEach((m, i) => this.menuLine(c, m, 178, 72 + i * gap, this.msel === i, () => ((this.msel = i), sfx.blip(), this.menuPick(i))))
      const d = DIFFS[this.save.diff]
      const my = items.length > 4 ? 134 : 128
      drawText(c, `MODE: ${d.name}`, 178, my, { color: d.color })
      const rec = this.save.records[d.name]
      const enc = this.save.encore[d.name]
      if (items[this.msel] === 'ENCORE' && enc) drawText(c, `BEST ${fmtTime(enc.time)} (WAVE ${enc.wave})`, 178, my + 8, { color: '#e03c9c' })
      else if (rec && rec.any) drawText(c, `BEST ${fmtTime(rec.any)}`, 178, my + 8, { color: '#c8b8e0' })
      const hint = this.usedTouch ? 'A BUTTON = JUMP    START = PAUSE' : 'A = Z / SPACE    START = ENTER'
      drawText(c, hint, VW / 2, 167, { align: 'center', color: '#8c8c9c' })
    } else if (!menuOn && s > 1) {
      drawText(c, 'PRESS A', VW / 2, 167, { align: 'center', color: Math.floor(this.t * 2) % 2 ? '#8c8c9c' : '#4c4c5c' })
    }
  }

  // ---------- How to play (an old game manual) ----------

  draw_howto(c) {
    if (this.howPage) return this.drawExtras(c)
    this.drawHowto(c)
  }

  drawExtras(c) {
    c.fillStyle = '#2a1040'
    c.fillRect(0, 0, VW, VH)
    c.fillStyle = INK
    c.fillRect(6, 6, VW - 12, VH - 12)
    c.fillStyle = '#f4e8d0'
    c.fillRect(8, 8, VW - 16, VH - 16)
    c.fillStyle = '#e4d4b4'
    for (let y = 28; y < VH - 10; y += 8) c.fillRect(10, y, VW - 20, 1)
    drawText(c, 'EXTRAS', VW / 2, 12, { scale: 2, align: 'center', color: '#d82838', shadow: INK })
    const lines = [
      ['PRACTICE', 'IN BOSSES, UP/DOWN PICKS WHICH PART TO PLAY.'],
      ['OUTFITS', 'EARN BADGES, THEN DRESS UP POMNI IN OPTIONS.'],
      ['HELPERS', 'CALM MODE AND SLOW MOTION ARE IN OPTIONS.'],
      ['RECORDS', 'BEST TIMES, SPLITS, BADGES AND YOUR NEMESIS.'],
      ['', ''],
      ['UNLOCK', 'BEAT ALL FIVE BOSSES TO UNLOCK...'],
      ['', 'ENCORE: EVERY BOSS, AGAIN AND AGAIN.'],
      ['', 'CHALLENGES: BOSSES WITH A TWIST.'],
      ['', 'AND A SECRET BONUS BOSS!'],
    ]
    lines.forEach(([a, b], i) => {
      const y = 32 + i * 11
      drawText(c, a, 20, y, { color: '#d82838', shadow: null })
      drawText(c, b, 76, y, { color: INK, shadow: null })
    })
    drawText(c, 'PSST... TRY A SECRET CODE ON THE TITLE SCREEN.', VW / 2, 138, { align: 'center', color: '#8848c8', shadow: null })
    if (Math.floor(this.t * 2) % 2) drawText(c, 'PRESS A TO GO BACK', VW / 2, 154, { align: 'center', color: '#8c6c4c', shadow: null })
    this.hits.push({ x: 0, y: 0, w: VW, h: VH, fn: () => this.pressed.add('back') })
  }

  drawHowto(c) {
    c.fillStyle = '#2a1040'
    c.fillRect(0, 0, VW, VH)
    c.fillStyle = INK
    c.fillRect(6, 6, VW - 12, VH - 12)
    c.fillStyle = '#f4e8d0'
    c.fillRect(8, 8, VW - 16, VH - 16)
    c.fillStyle = '#e4d4b4'
    for (let y = 28; y < VH - 10; y += 8) c.fillRect(10, y, VW - 20, 1)
    drawText(c, 'HOW TO PLAY', VW / 2, 12, { scale: 2, align: 'center', color: '#d82838', shadow: INK })
    const shake = Math.round(Math.sin(this.t * 40) * 0.6)
    drawPomni(c, SPR.pomniScared, 46 + shake, 100, false, { scale: 2 })
    drawSprite(c, SPR.sweat, 62, 40 + ((this.t * 14) % 8))
    const row = (y, a, b, cc) => {
      drawText(c, a, 92, y, { color: '#d82838', shadow: null })
      drawText(c, b, 120, y, { color: '#2c5ce0', shadow: null })
      drawText(c, cc, 146, y, { color: INK, shadow: null })
    }
    row(32, 'MOVE', '< >', 'MOVE POMNI LEFT AND RIGHT.')
    row(42, 'JUMP', 'A', 'JUMP OVER THE ATTACKS.')
    row(52, 'PAUSE', 'START', 'PAUSE THE GAME.')
    drawText(c, 'KEYS: ARROWS.  A = Z OR SPACE.  START = ENTER.', 92, 62, { color: '#8c6c4c', shadow: null })
    drawText(c, 'ONE HIT AND YOU ARE OUT.', 92, 72, { color: INK, shadow: null })
    drawText(c, 'SURVIVE THE WHOLE SHOW!', 92, 80, { color: INK, shadow: null })

    // A little diagram: Pomni jumping over a button.
    const bx = 236
    const by = 112
    c.fillStyle = '#8c6c4c'
    c.fillRect(bx - 34, by, 96, 1)
    for (let i = 0; i <= 12; i++) {
      const k = i / 12
      c.fillRect(Math.round(bx - 26 + k * 70), Math.round(by - 12 - Math.sin(k * Math.PI) * 26), 1, 1)
    }
    drawSprite(c, SPR.button1, bx + 5, by - 9)
    const k = (this.t * 0.5) % 1
    const air = k > 0.15 && k < 0.85
    const jk = air ? (k - 0.15) / 0.7 : 0
    drawPomni(c, air ? SPR.pomniJump : SPR.pomniIdle, bx - 26 + (air ? jk * 70 : k < 0.15 ? 0 : 70), by + 1 - Math.sin(jk * Math.PI) * 26, false)

    const lines = ['WATCH THE BOSS.', 'WATCH THE FLOOR.', 'WATCH THE AIR.', 'WATCH EVERYTHING.']
    lines.forEach((l, i) => drawText(c, l, 92, 92 + i * 9, { color: i === 3 ? '#d82838' : INK, shadow: null }))
    drawText(c, 'GOOD LUCK, POMNI.', VW / 2, 134, { scale: 2, align: 'center', color: '#2c5ce0', shadow: INK })
    if (Math.floor(this.t * 2) % 2) drawText(c, 'A: NEXT PAGE   B: BACK', VW / 2, 154, { align: 'center', color: '#8c6c4c', shadow: null })
    this.hits.push({ x: 0, y: 0, w: VW, h: VH, fn: () => this.pressed.add('confirm') })
  }

  // ---------- Boss gallery ----------

  draw_bosses(c) {
    drawBackground(c, 'menu', this.t)
    c.fillStyle = 'rgba(12, 6, 20, 0.6)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'BOSSES', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    const i = this.gsel
    const info = BOSSES[i]
    const met = this.bossMet(i)
    const spr = SPR[info.key]
    drawSprite(c, spr, 64 - spr.ax, 150 - spr.length + Math.round(Math.sin(this.t * 2)), { mode: met ? 'normal' : 'shadow', look: [Math.sin(this.t * 0.8) * 0.8, 0.3] })
    if (info.key === 'caine') drawSprite(c, SPR.bubble, 84, 34, { mode: met ? 'normal' : 'shadow' })
    c.fillStyle = '#f4f4f4'
    c.fillRect(20, 150, 90, 1)
    const x = 124
    drawText(c, info.bonus ? 'SECRET BONUS BOSS' : `BOSS ${i + 1}`, x, 30, { color: info.bonus ? '#e03c9c' : '#8c8c9c' })
    drawText(c, met ? info.name : '???', x, 40, { scale: 2, color: '#f8c830' })
    drawText(c, met ? info.title : '???', x, 56, { color: '#e03c9c' })
    if (met) info.rules.forEach((r, k) => drawText(c, r, x, 72 + k * 10, { color: '#f4f4f4' }))
    else drawText(c, 'REACH THIS BOSS TO LEARN MORE.', x, 72, { color: '#8c8c9c' })
    const best = this.save.beaten[i]
    drawText(c, best >= 0 ? `BEATEN ON ${DIFFS[best].name}` : 'NOT BEATEN YET', x, 110, { color: best >= 0 ? '#38b848' : '#8c8c9c' })
    // Your fastest time on this boss (from full runs) on the current difficulty.
    const gold = (this.save.records[DIFFS[this.save.diff].name] || {}).gold
    if (gold && gold[i] !== undefined) drawText(c, `FASTEST: ${fmtTime(gold[i])}`, VW - 4, 110, { align: 'right', color: '#f8c830' })
    if (met) {
      drawText(c, 'A: PRACTICE THIS BOSS', x, 122, { color: Math.floor(this.t * 2) % 2 ? '#f8c830' : '#f88828' })
      this.hits.push({ x: x - 4, y: 116, w: 120, h: 12, fn: () => this.pressed.add('confirm') })
      const np = info.parts.length
      const part = this.gpart || 0
      const label = part === np - 1 ? 'THE FINALE' : part === 0 ? 'FROM THE START' : `PART ${part + 1}`
      drawText(c, `START: ${label}`, x, 132, { color: part ? '#68d8f8' : '#c8b8e0' })
      drawText(c, '(UP/DOWN)', x + textWidth(`START: ${label}`) + 4, 132, { color: '#4c4c5c' })
      this.hits.push({ x: x - 4, y: 128, w: 120, h: 10, fn: () => this.pressed.add('down') })
    }
    if (i === 3 && this.save.badges.pillowMaster) drawText(c, '* PILLOW MASTER *', x, 143, { color: '#c8b8e0' })
    const n = this.galleryCount()
    for (let k = 0; k < n; k++) {
      c.fillStyle = k === i ? '#f8c830' : BOSSES[k].bonus ? '#8c2c6c' : '#4c3c5c'
      c.fillRect(VW / 2 - 24 + k * 10, 160, 6, 6)
      this.hits.push({ x: VW / 2 - 26 + k * 10, y: 156, w: 10, h: 14, fn: () => ((this.gsel = k), (this.gpart = 0), sfx.beep()) })
    }
    drawText(c, '<', 120, 161, { color: '#f8c830' })
    drawText(c, '>', 197, 161, { color: '#f8c830' })
    this.hits.push({ x: 108, y: 154, w: 22, h: 18, fn: () => this.pressed.add('left') })
    this.hits.push({ x: 190, y: 154, w: 22, h: 18, fn: () => this.pressed.add('right') })
    drawText(c, 'B: BACK', VW - 4, 167, { align: 'right', color: '#8c8c9c' })
    this.hits.push({ x: VW - 44, y: 158, w: 44, h: 18, fn: () => this.pressed.add('back') })
  }

  // ---------- Options + records ----------

  draw_options(c) {
    drawBackground(c, 'menu', this.t)
    c.fillStyle = 'rgba(12, 6, 20, 0.65)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'OPTIONS', VW / 2, 10, { scale: 2, align: 'center', color: '#f8c830' })
    this.optionItems().forEach(([label, value], i) =>
      this.menuLine(
        c,
        label,
        80,
        33 + i * 11,
        this.osel === i,
        () => {
          this.osel = i
          sfx.blip()
          this.optionItems()[i][2](1)
          this.persist()
        },
        { value },
      ),
    )
    const d = DIFFS[this.save.diff]
    const blurbs = ['SLOWER ATTACKS. BIG SAFE SPACES.', 'THE WAY THE SHOW IS MEANT TO BE.', 'MORE HAZARDS. LESS TIME TO REACT.', 'WHY DID YOU DO THIS TO YOURSELF?']
    const calmRow = this.optionItems().findIndex(([label]) => label === 'CALM MODE')
    if (this.osel === calmRow) drawText(c, 'NO SCREEN SHAKE, NO BIG FLASHES.', VW / 2, 154, { align: 'center', color: '#68d8f8' })
    else if (this.osel === calmRow + 1) drawText(c, 'FIGHTS AT 3/4 SPEED. (NO RECORDS OR BADGES.)', VW / 2, 154, { align: 'center', color: '#68d8f8' })
    else drawText(c, blurbs[this.save.diff], VW / 2, 154, { align: 'center', color: d.color })
    if (this.osel <= 1) drawText(c, '< > OR A TO CHANGE', VW / 2, 165, { align: 'center', color: '#8c8c9c' })
    // A little Pomni shows off the outfit, with the ones still to earn as shadows.
    drawPomni(c, SPR.pomniWave, 272, 132, true, { scale: 2, look: [-0.6, 0] })
    const list = this.outfitList()
    drawText(c, `OUTFITS ${list.filter(([, got]) => got).length}/${list.length}`, 272, 138, { align: 'center', color: '#c8b8e0' })
    if (this.osel === 1) {
      const lock = list.find(([, got]) => !got)
      if (lock) drawText(c, `NEXT: ${lock[2]}`, VW - 4, 28, { align: 'right', color: '#8c8c9c' })
    }
    for (const f of this.floats) drawText(c, f.text, f.x, f.y, { align: 'center', color: f.color })
  }

  draw_records(c) {
    drawBackground(c, 'menu', this.t)
    c.fillStyle = 'rgba(12, 6, 20, 0.75)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'RECORDS', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    drawText(c, 'MODE', 24, 30, { color: '#8c8c9c' })
    drawText(c, 'ANY%', 100, 30, { color: '#8c8c9c' })
    drawText(c, 'NO DEATH', 168, 30, { color: '#8c8c9c' })
    drawText(c, 'BEST SUM', 236, 30, { color: '#8c8c9c' })
    DIFFS.forEach((d, i) => {
      const r = this.save.records[d.name] || {}
      const y = 44 + i * 12
      // Best sum: add up your fastest time on each boss. That's how fast a perfect run could be!
      const gold = r.gold && r.gold.length === 5 ? r.gold.reduce((a, b) => a + b, 0) : 0
      drawText(c, d.name, 24, y, { color: d.color })
      drawText(c, r.any ? fmtTime(r.any) : '--:--:--', 100, y)
      drawText(c, r.nodeath ? fmtTime(r.nodeath) : '--:--:--', 168, y)
      drawText(c, gold ? fmtTime(gold) : '--:--:--', 236, y, { color: gold ? '#f8c830' : '#f4f4f4' })
    })
    const badges = this.badgeList()
    drawText(c, `BADGES ${badges.filter(([, got]) => got).length}/${badges.length}`, 24, 98, { color: '#8c8c9c' })
    badges.forEach(([name, got], i) => {
      const x = i < 5 ? 24 : 168
      const y = 107 + (i % 5) * 8
      drawSprite(c, SPR.star, x, y - 1, { mode: got ? 'normal' : 'shadow' })
      drawText(c, name, x + 12, y, { color: got ? '#f8c830' : '#4c4c5c' })
    })
    // A hint for the next badge you could get.
    const next = badges.find(([, got]) => !got)
    if (next) drawText(c, `NEXT BADGE: ${next[2]}`, 24, 148, { color: '#68d8f8' })
    const pt = Math.floor(this.save.playTime || 0)
    const played = pt >= 3600 ? `${Math.floor(pt / 3600)}H ${Math.floor((pt % 3600) / 60)}M` : `${Math.floor(pt / 60)}M ${pt % 60}S`
    drawText(c, `TOTAL DEATHS: ${this.save.deaths}   RUNS: ${this.save.runs}   TIME IN FIGHTS: ${played}`, VW / 2, 158, { align: 'center', color: '#c8b8e0' })
    // Your nemesis: the boss that got you the most times.
    const bd = this.save.bossDeaths
    const nem = Object.keys(bd).sort((x, y) => bd[y] - bd[x])[0]
    const enc = this.save.encore[DIFFS[this.save.diff].name]
    const bits = []
    if (nem) bits.push(`NEMESIS: ${BOSSES.find((x) => x.key === nem).name} (${bd[nem]})`)
    if (enc) bits.push(`ENCORE BEST: ${fmtTime(enc.time)}`)
    if (bits.length) drawText(c, bits.join('   '), VW / 2, 167, { align: 'center', color: '#8c8c9c' })
    this.hits.push({ x: 0, y: 0, w: VW, h: VH, fn: () => this.pressed.add('back') })
  }

  // ---------- The arena ----------

  drawArena(c) {
    const t = this.t
    drawBackground(c, this.arenaKey, t, this.floorScroll)
    // The finale: red warning lights pulse across the stage, in time with the beat.
    const b = this.boss
    if (b && b.finalAt && b.time >= b.finalAt && !b.done && this.state === 'fight') {
      const pulse = this.save.calm ? 0.3 : 0.5 + 0.5 * Math.sin(t * 7.5)
      // (Purple on Gangle's stage, so the red ribbons stay easy to see.)
      const rgb = this.arenaKey === 'gangle' ? '136, 72, 200' : '216, 40, 56'
      c.fillStyle = `rgba(${rgb}, ${(0.06 + pulse * 0.08).toFixed(3)})`
      c.fillRect(0, 0, VW, GROUND_Y)
      c.fillStyle = `rgba(${rgb}, ${(0.15 + pulse * 0.2).toFixed(3)})`
      c.fillRect(0, 0, 4, GROUND_Y)
      c.fillRect(VW - 4, 0, 4, GROUND_Y)
    }
    drawFloor(c, -this.floorScroll)
    drawPlatforms(c, this.platforms)
    for (const h of this.haz) if (h.kind === 'slip') h.draw(c, t)
    if (this.boss) this.boss.draw(c, t)
    for (const h of this.haz) if (h.kind !== 'slip') h.draw(c, t)
    if (this.conveyor) {
      const k = Math.floor(t * 6) % 2
      drawText(c, '<<<', 8 + k * 2, GROUND_Y + 6, { color: '#f8c830' })
    }
  }

  // Pomni keeps an eye on the nearest danger (or the boss, if nothing is flying at her).
  threatPoint() {
    const p = this.pomni
    const px = p.x + p.w / 2
    const py = p.y + 6
    let best = null
    let bd = Infinity
    for (const h of this.haz) {
      if (h.kind === 'slip' || h.kind === 'none') continue
      if (h.active === false) continue
      const hx = h.cx ?? h.x + (h.w || 0) / 2
      const hy = h.cy ?? h.y + (h.h || 0) / 2
      const d = Math.hypot(hx - px, hy - py)
      if (d < bd) {
        bd = d
        best = { x: hx, y: hy }
      }
    }
    this.threatDist = bd
    if (best && bd < 160) return best
    const b = this.boss
    return b ? { x: b.x + b.spr.ax, y: b.y + 12 } : [0, 0]
  }

  drawPomniNormal(c) {
    const p = this.pomni
    const look = this.threatPoint()
    // Standing still with something deadly right next to her? Eek!
    const eek = p.onGround && Math.abs(p.vx) < 8 && this.threatDist < 30 && this.state === 'fight'
    p.draw(c, this.t, { look, frame: eek ? SPR.pomniScared : undefined })
    if (this.slip && p.onGround && Math.floor(this.t * 8) % 2) drawText(c, '!', p.x + 3, p.y - 16, { color: '#68d8f8' })
  }

  drawFx(c) {
    for (const q of this.parts) {
      c.fillStyle = q.color
      c.fillRect(Math.round(q.x), Math.round(q.y), 2, 2)
    }
    for (const f of this.floats) {
      if (f.life < 0.3 && Math.floor(this.t * 20) % 2) continue
      drawText(c, f.text, f.x, f.y, { align: 'center', color: f.color, scale: f.text === 'GO!' ? 2 : 1 })
    }
    const b = this.boss
    if (b && b.bubbleText && b.bubbleText.until > this.t) this.bubble(c, b.bubbleText.text, b.x + b.spr.ax, b.y + 2)
    if (b && b.bub && b.bub.text && b.bub.text.until > this.t) this.bubble(c, b.bub.text.text, b.bub.x + 16, b.bub.y + 2)
    if (this.pomniSay && this.pomniSay.until > this.t) this.bubble(c, this.pomniSay.text, this.pomni.x + 5, this.pomni.y - 10)
  }

  drawHud(c) {
    const b = this.boss
    if (this.toast && this.toast.until > this.t) {
      drawText(c, this.toast.text, VW / 2, 22, { align: 'center', color: Math.floor(this.t * 6) % 2 ? '#e03c9c' : '#f8c830' })
    }
    if (this.run.mode === 'encore') return this.drawEncoreHud(c)
    drawText(c, b.name, 4, 3, { color: '#f8c830' })
    c.fillStyle = INK
    c.fillRect(4, 11, 104, 6)
    c.fillStyle = '#4c3c5c'
    c.fillRect(5, 12, 102, 4)
    const left = 1 - b.progress
    c.fillStyle = left < 0.2 && Math.floor(this.t * 8) % 2 ? '#f8c830' : '#d82838'
    c.fillRect(5, 12, Math.round(102 * left), 4)
    c.fillStyle = 'rgba(255,255,255,0.4)'
    c.fillRect(5, 12, Math.round(102 * left), 1)
    c.fillStyle = INK
    for (const m of b.marks) c.fillRect(5 + Math.round(102 * (1 - m)), 11, 1, 6)
    if (this.run.mode === 'run' && this.save.timer) drawText(c, fmtTime(this.run.time), VW / 2, 3, { align: 'center', color: '#f4f4f4' })
    if (this.run.mode === 'practice') drawText(c, 'PRACTICE', VW / 2, 3, { align: 'center', color: '#68d8f8' })
    if (this.run.mode === 'challenge') drawText(c, this.run.ch.name, VW / 2, 3, { align: 'center', color: '#e03c9c' })
    if (this.save.slow) drawText(c, 'SLOW-MO', VW / 2, 11, { align: 'center', color: '#68d8f8' })
    const d = DIFFS[this.run.diff]
    drawText(c, d.name, VW - 4, 3, { align: 'right', color: d.color })
    if (this.run.mode === 'run') drawText(c, `DEATHS ${this.run.deaths}`, VW - 4, 11, { align: 'right', color: '#c8b8e0' })
  }

  drawEncoreHud(c) {
    const b = this.boss
    drawText(c, `ENCORE  WAVE ${b.wave}`, 4, 3, { color: '#f8c830' })
    c.fillStyle = INK
    c.fillRect(4, 11, 104, 6)
    c.fillStyle = '#4c3c5c'
    c.fillRect(5, 12, 102, 4)
    c.fillStyle = '#e03c9c'
    c.fillRect(5, 12, Math.round(102 * b.waveProgress), 4)
    drawText(c, fmtTime(b.time), VW / 2, 3, { align: 'center', color: '#f4f4f4' })
    if (this.save.slow) drawText(c, 'SLOW-MO', VW / 2, 11, { align: 'center', color: '#68d8f8' })
    const d = DIFFS[this.run.diff]
    drawText(c, d.name, VW - 4, 3, { align: 'right', color: d.color })
    const best = this.save.encore[d.name]
    if (best) drawText(c, `BEST ${fmtTime(best.time)}`, VW - 4, 11, { align: 'right', color: b.time > best.time ? '#38b848' : '#c8b8e0' })
    if (b.breakT > 0) {
      const k = clamp(Math.min((2.4 - b.breakT) * 4, b.breakT * 4), 0, 1)
      c.fillStyle = 'rgba(12, 6, 20, 0.8)'
      c.fillRect(0, 52, VW * k, 30)
      if (k >= 1) {
        drawText(c, `WAVE ${b.wave}`, VW / 2, 56, { scale: 2, align: 'center', color: '#f8c830', shadow: '#d82838' })
        drawText(c, b.sub.name, VW / 2, 72, { align: 'center', color: '#f4f4f4' })
      }
    }
  }

  draw_intro(c) {
    this.drawArena(c)
    const p = this.pomni
    // Pomni is nervous: she looks left and right, and sweats.
    const spr = Math.floor(this.t * 1.5) % 3 === 1 ? SPR.pomniLook : SPR.pomniIdle
    drawPomni(c, spr, p.x + p.w / 2 + Math.round(Math.sin(this.t * 30) * 0.5), p.y + p.h + 1, false)
    drawSprite(c, SPR.sweat, p.x + 12, p.y - 10 + ((this.t * 12) % 6))
    if (this.boss.key === 'jax' && this.st > 3.2 && this.st < 4.8) {
      const h = this.boss.hand()
      drawSprite(c, SPR.bigCushion, h.x - 6, h.y - 4)
    }
    this.drawFx(c)
    // The boss title card slides in, holds, then slides out so everyone can talk.
    const k = clamp(Math.min(this.st * 3, (1.9 - this.st) * 3), 0, 1)
    const info = BOSSES[this.bossIdx]
    c.fillStyle = 'rgba(12, 6, 20, 0.85)'
    c.fillRect(0, 58, VW * k, 44)
    c.fillStyle = '#f8c830'
    c.fillRect(0, 58, VW * k, 1)
    c.fillRect(0, 101, VW * k, 1)
    if (k > 0 && this.st < 1.9) {
      c.save()
      c.globalAlpha = k
      drawText(c, this.run.mode === 'challenge' ? `CHALLENGE: ${this.run.ch.name}` : info.bonus ? 'SECRET BONUS BOSS' : `BOSS ${this.bossIdx + 1} / 5`, VW / 2, 62, { align: 'center', color: info.bonus ? '#e03c9c' : '#8c8c9c' })
      drawText(c, info.name, VW / 2, 71, { scale: 3, align: 'center', color: '#f4f4f4', shadow: '#d82838' })
      drawText(c, info.title, VW / 2, 91, { align: 'center', color: '#f8c830' })
      c.restore()
    }
    if (this.st > 1 && Math.floor(this.t * 2) % 2) drawText(c, 'A: SKIP', VW - 4, 167, { align: 'right', color: '#8c8c9c' })
  }

  draw_countdown(c) {
    this.drawArena(c)
    this.drawPomniNormal(c)
    this.drawFx(c)
    this.drawDark(c)
    this.drawHud(c)
    const n = 3 - Math.floor(this.st / 0.6)
    if (n >= 1) {
      const pop = 1 + (1 - (this.st % 0.6) / 0.6) * 0.5
      drawText(c, String(n), VW / 2, 50, { scale: Math.round(4 * pop), align: 'center', color: '#f8c830' })
    }
  }

  // LIGHTS OUT: everything is dark except a little circle of light around Pomni.
  drawDark(c) {
    if (!(this.run.mods && this.run.mods.dark)) return
    const p = this.pomni
    const x = p.x + p.w / 2
    const y = p.y + p.h / 2
    c.save()
    for (const [r, a] of [[78, 0.55], [62, 0.92]]) {
      c.beginPath()
      c.rect(0, 0, VW, VH)
      c.arc(x, y, r, 0, Math.PI * 2, true)
      c.fillStyle = `rgba(4, 2, 10, ${a})`
      c.fill('evenodd')
    }
    c.restore()
    // The boss's eyes still glint in the dark...
    const b = this.boss
    c.fillStyle = '#f4f4f4'
    if (Math.floor(this.t * 1.5) % 4) for (const e of b.spr.eyes || []) c.fillRect(Math.round(b.x + e[0]), Math.round(b.y + e[1]), 1, 1)
  }

  draw_fight(c) {
    this.drawArena(c)
    this.drawPomniNormal(c)
    this.drawFx(c)
    this.drawDark(c)
    this.drawHud(c)
    if (this.boss.time < 4 && Math.floor(this.t * 3) % 4) drawText(c, this.boss.tip, VW / 2, 164, { align: 'center', color: '#f8c830' })
    const pb = this.partBanner
    if (pb && this.t - pb.at < 1.4 && this.state === 'fight') drawText(c, pb.text, VW / 2, 24, { align: 'center', color: '#f4f4f4' })
    if (this.finalBanner && this.t - this.finalBanner < 2 && Math.floor(this.t * 8) % 2) {
      drawText(c, 'FINAL ATTACK!', VW / 2, 28, { scale: 2, align: 'center', color: '#e03c9c', shadow: INK })
    }
  }

  // A blinking red outline around whatever hit Pomni, so you can see what got you.
  drawCulprit(c) {
    const h = this.killerHaz
    if (!h || Math.floor(this.t * 6) % 2) return
    let box
    if (h.cx !== undefined) {
      // A cane: outline the area it sweeps through.
      const half = (h.len || 20) / 2
      const ax = Math.abs(Math.cos(h.angle || 0)) * half + 6
      const ay = Math.abs(Math.sin(h.angle || 0)) * half + 6
      box = { x: h.cx - ax, y: h.cy - ay, w: ax * 2, h: ay * 2 }
    } else if (h.parts) {
      const ps = h.parts().filter((q) => q.h > 0)
      if (!ps.length) return
      const x0 = Math.min(...ps.map((q) => q.x))
      const y0 = Math.min(...ps.map((q) => q.y))
      box = { x: x0, y: y0, w: Math.max(...ps.map((q) => q.x + q.w)) - x0, h: Math.max(...ps.map((q) => q.y + q.h)) - y0 }
    } else box = { x: h.x, y: h.y, w: h.w || 8, h: h.h || 8 }
    const x = Math.round(box.x) - 2
    const y = Math.round(box.y) - 2
    const w = Math.round(box.w) + 4
    const hh = Math.round(box.h) + 4
    c.fillStyle = '#ff2040'
    c.fillRect(x, y, w, 1)
    c.fillRect(x, y + hh - 1, w, 1)
    c.fillRect(x, y, 1, hh)
    c.fillRect(x + w - 1, y, 1, hh)
  }

  draw_dying(c) {
    this.drawArena(c)
    const p = this.pomni
    const s = this.st
    if (s < 0.7) {
      // Frozen: Pomni becomes a distorted, glitchy sprite.
      const jx = Math.round(rand(-2, 2))
      drawPomni(c, p.frame(this.t), p.x + p.w / 2 + jx, p.y + p.h + 1, p.face < 0, { mode: this.save.calm || Math.floor(this.t * 20) % 2 ? 'white' : 'glitch' })
    } else if (s < 1.65) {
      // ...then she falls over backwards.
      const k = clamp((s - 0.7) / 0.6, 0, 1)
      drawPomni(c, SPR.pomniScared, p.x + p.w / 2 - p.face * k * 6, p.y + p.h + 1 + k * 4, p.face < 0, { rot: -p.face * k * (Math.PI / 2) })
    }
    this.drawFx(c)
    this.drawCulprit(c)
    this.drawHud(c)
  }

  draw_gameover(c) {
    c.fillStyle = '#000000'
    c.fillRect(0, 0, VW, VH)
    const pop = this.st < 0.4 ? this.st / 0.4 : 1
    drawText(c, 'GAME OVER', VW / 2, 30, { scale: Math.max(1, Math.round(4 * pop)), align: 'center', color: '#d82838', shadow: '#5c1020' })
    // In Encore mode, it's whoever was on stage that got you.
    const info = this.boss.sub ? BOSSES.find((b) => b.key === this.boss.key) : BOSSES[this.bossIdx]
    const icon = SPR['icon' + info.key[0].toUpperCase() + info.key.slice(1)]
    if (icon) drawSprite(c, icon, VW / 2 - icon.ax, 62 + Math.round(Math.sin(this.t * 6)))
    const lines = { cushion: 'PFFFFFT.', button: 'BUTTONED.', ribbon: 'ALL TIED UP.', pillow: 'SMOTHERED IN PILLOWS.', cane: 'CANED.', part: 'HIT BY A SPARE PART.' }
    drawText(c, lines[this.killer] || 'OUCH.', VW / 2, 102, { align: 'center', color: '#c8b8e0' })
    drawText(c, `${info.name}: ${info.win}`, VW / 2, 112, { align: 'center', color: '#8c8c9c' })
    const tries = (this.run && this.run.tries && this.run.tries[this.bossIdx]) || 2
    const er = this.run.mode === 'encore' && this.encoreResult
    if (er) {
      drawText(c, `YOU LASTED ${fmtTime(er.time)}  (WAVE ${er.wave})`, VW / 2, 122, { align: 'center', color: '#f8c830' })
      if (er.isNew) drawText(c, 'NEW BEST!', VW / 2 + 30, 76, { scale: 2, color: Math.floor(this.t * 6) % 2 ? '#38b848' : '#f8c830' })
      else drawText(c, `BEST ${fmtTime(er.best)}`, VW / 2 + 30, 80, { color: '#c8b8e0' })
    } else drawText(c, `NEXT TRY: ATTEMPT ${tries}`, VW / 2, 122, { align: 'center', color: '#f8c830' })
    // Stuck? After a couple of tries the game gives a hint about whatever got you.
    if (this.st > 0.6 && tries >= 3) {
      const hints = {
        cushion: 'CUSHIONS STAY ON THE FLOOR. WATCH WHERE YOU LAND!',
        button: 'LOW BUTTONS: JUMP. HIGH BUTTONS: STAY ON THE FLOOR.',
        ribbon: 'THE FLASHING OUTLINE SHOWS WHERE THE RIBBON GOES.',
        pillow: 'JUMP ON TOP OF PILLOWS. UP THERE YOU ARE SAFE!',
        cane: 'WATCH FOR THE GAP IN THE CANE, THEN GO THROUGH IT.',
        part: 'LOW PARTS: JUMP. HIGH PARTS: STAY ON THE FLOOR.',
      }
      let hint = hints[this.killer] || info.tip
      if (tries >= 6 && Math.floor(this.st / 3) % 2) {
        hint = this.run.diff > 0 ? 'TOO HARD? TRY EASY MODE IN OPTIONS.' : 'TIP: PRACTISE ONE PART IN THE BOSSES MENU.'
      }
      drawText(c, hint, VW / 2, 164, { align: 'center', color: '#68d8f8' })
    }
    if (this.st > 0.6) {
      this.menuLine(c, 'TRY AGAIN', VW / 2, 134, this.gameoverSel === 0, () => ((this.gameoverSel = 0), this.pressed.add('confirm')), { align: 'center' })
      this.menuLine(c, 'MAIN MENU', VW / 2, 148, this.gameoverSel === 1, () => ((this.gameoverSel = 1), this.pressed.add('confirm')), { align: 'center' })
    }
  }

  draw_defeat(c) {
    this.drawArena(c)
    const p = this.pomni
    // Pomni is exhausted: panting and sweating.
    const pant = Math.round(Math.abs(Math.sin(this.t * 5)))
    // Panting at first... then a happy little wave once the fanfare plays.
    const fanAt0 = this.bossIdx === 4 ? 3.2 : 0.8
    const waving = this.st > fanAt0 + 0.6 && Math.floor(this.t * 3) % 2
    drawPomni(c, waving ? SPR.pomniWave : SPR.pomniIdle, p.x + p.w / 2, p.y + p.h + 1, p.face < 0, { sy: waving ? 1 : 1 - pant * 0.05 })
    drawSprite(c, SPR.sweat, p.x - 3, p.y - 6 + ((this.t * 14) % 8))
    drawSprite(c, SPR.sweat, p.x + 12, p.y - 2 + ((this.t * 11) % 8))
    this.drawFx(c)
    const fanAt = this.bossIdx === 4 ? 3.2 : 0.8
    if (this.defeatFanfare) {
      const k = clamp((this.st - fanAt) * 4, 0, 1)
      c.fillStyle = 'rgba(12, 6, 20, 0.8)'
      c.fillRect(0, 20, VW, 30 * k)
      if (k >= 1) {
        drawText(c, 'BOSS DEFEATED!', VW / 2, 24, { scale: 3, align: 'center', color: '#f8c830', shadow: '#d82838' })
        if (this.run.mode === 'run' && this.save.timer) {
          const d = this.splitDelta
          if (d === null) drawText(c, fmtTime(this.run.time), VW / 2, 43, { align: 'center' })
          else {
            drawText(c, fmtTime(this.run.time), VW / 2 - 4, 43, { align: 'right' })
            drawText(c, fmtDelta(d), VW / 2 + 4, 43, { color: d <= 0 ? '#38b848' : '#d82838' })
          }
        }
        if (this.newCostume && !this.newBadge) {
          drawText(c, `NEW COSTUME: ${this.newCostume}!`, VW / 2, 56, { align: 'center', color: Math.floor(this.t * 6) % 2 ? '#e03c9c' : '#f8c830' })
          drawText(c, 'DRESS UP IN OPTIONS > OUTFIT', VW / 2, 66, { align: 'center', color: '#68d8f8' })
        }
        if (this.newBadge) {
          drawText(c, `SECRET: ${this.newBadge}!`, VW / 2, 56, { align: 'center', color: Math.floor(this.t * 6) % 2 ? '#e03c9c' : '#f8c830' })
          drawText(c, 'NEW OUTFIT UNLOCKED IN OPTIONS!', VW / 2, 66, { align: 'center', color: '#68d8f8' })
        }
      }
    }
    if (this.st > fanAt + 1.6 && Math.floor(this.t * 2) % 2) {
      const next = this.run.mode === 'practice' ? 'BACK TO BOSSES' : this.run.mode === 'challenge' ? 'BACK TO CHALLENGES' : this.bossIdx < 4 ? 'NEXT BOSS' : 'CONTINUE'
      drawText(c, `A: ${next}`, VW / 2, 162, { align: 'center' })
    }
  }

  draw_ending(c) {
    const s = this.st
    if (s < 8) {
      drawBackground(c, 'caine', this.t * 0.2)
      drawFloor(c)
      drawPlatforms(c, this.platforms)
      let spr = SPR.pomniIdle
      let flip = false
      let px = VW / 2
      if (s > 4.6 && s < 5.6) {
        spr = SPR.pomniLook
        flip = Math.floor(s * 1.5) % 2 === 0
      }
      // An EXIT door! The one she's been looking for this whole time!
      if (s > 5.0) {
        const dx = 262
        const k = clamp((s - 5.0) / 0.4, 0, 1)
        c.globalAlpha = k
        c.fillStyle = INK
        c.fillRect(dx - 1, GROUND_Y - 41, 26, 41)
        c.fillStyle = '#8c5c3c'
        c.fillRect(dx + 1, GROUND_Y - 39, 22, 39)
        c.fillStyle = '#6c4428'
        c.fillRect(dx + 4, GROUND_Y - 35, 16, 13)
        c.fillRect(dx + 4, GROUND_Y - 19, 16, 15)
        c.fillStyle = '#f8c830'
        c.fillRect(dx + 18, GROUND_Y - 21, 2, 2)
        // It opens... onto nothing at all.
        if (s > 6.75) {
          c.fillStyle = '#000000'
          c.fillRect(dx + 1, GROUND_Y - 39, 22, 39)
          c.fillStyle = '#8c5c3c'
          c.fillRect(dx + 1, GROUND_Y - 39, 3, 39)
        }
        // A glowing green sign.
        c.fillStyle = Math.floor(this.t * 3) % 2 ? '#38b848' : '#2c8c38'
        c.fillRect(dx - 1, GROUND_Y - 52, 26, 9)
        drawText(c, 'EXIT', dx + 12, GROUND_Y - 50, { align: 'center', color: '#f4f4f4', shadow: null })
        c.globalAlpha = 1
      }
      if (s > 5.6) {
        const k = clamp((s - 5.8) / 1.0, 0, 1)
        px = VW / 2 + (250 - VW / 2) * k
        if (k > 0 && k < 1) spr = Math.floor(this.t * 10) % 2 ? SPR.pomniRun1 : SPR.pomniRun2
      }
      if (s < 7.0) drawPomni(c, spr, px, GROUND_Y + 1, flip)
      if (s > 5.1 && s < 5.8) drawText(c, '!', VW / 2 + 6, GROUND_Y - 44, { scale: 2, color: '#f8c830' })
      const type = (o, y) => {
        if (!o) return
        const n = Math.min(o.text.length, Math.floor((this.t - o.at) * 14))
        if (n > (o.n || 0)) {
          o.n = n
          sfx.text()
        }
        drawText(c, o.text.slice(0, n), VW / 2, y, { scale: 2, align: 'center' })
      }
      type(this.typed, 46)
      type(this.typed2, 66)
      if (s > 6.5) {
        c.fillStyle = `rgba(0,0,0,${clamp((s - 6.5) / 1.5, 0, 1)})`
        c.fillRect(0, 0, VW, VH)
      }
      return
    }
    c.fillStyle = '#000000'
    c.fillRect(0, 0, VW, VH)
    if (s > 8.5) drawText(c, 'THE END', VW / 2, 66, { scale: 3, align: 'center', color: '#f4f4f4', shadow: null })
    if (s > 10.2) {
      const jx = Math.random() < 0.15 ? Math.round(rand(-3, 3)) : 0
      drawText(c, 'OR IS IT?', VW / 2 + jx, 96, { align: 'center', color: Math.random() < 0.1 ? '#e03c9c' : '#8c8c9c', shadow: null })
    }
    // ...someone is peeking in from the side. There's more to the show.
    if (s > 11.4) {
      const k = clamp((s - 11.4) / 0.8, 0, 1)
      const z = SPR.zooble
      drawSprite(c, z, VW - Math.round(k * 22), VH - z.length - 4, { mode: 'shadow', look: [-1, 0] })
      c.fillStyle = '#f4f4f4'
      // One glowing eye, blinking now and then.
      const [ex, ey] = z.eyes[0]
      if (k >= 1 && Math.floor(this.t * 3) % 4) c.fillRect(VW - 22 + Math.round(ex) - 1, VH - z.length - 4 + Math.round(ey), 2, 1)
    }
    if (s > 12.4) {
      drawText(c, 'NEW IN THE MENU: ENCORE + CHALLENGES', VW / 2, 138, { align: 'center', color: '#f8c830', shadow: null })
      drawText(c, 'AND A SECRET BONUS BOSS...', VW / 2, 148, { align: 'center', color: '#e03c9c', shadow: null })
    }
  }

  draw_results(c) {
    drawBackground(c, 'menu', this.t)
    c.fillStyle = 'rgba(12, 6, 20, 0.7)'
    c.fillRect(0, 0, VW, VH)
    const r = this.results || { time: 0, deaths: 0, diff: '', news: [], badges: [] }
    drawText(c, 'THE SHOW IS OVER', VW / 2, 8, { scale: 2, align: 'center', color: '#f8c830' })
    // A rank, like a real arcade: S for a fast run with no deaths.
    const rank = r.deaths === 0 && r.time < 390 ? 'S' : r.deaths === 0 ? 'A' : r.deaths <= 3 ? 'B' : r.deaths <= 8 ? 'C' : 'D'
    const rc = { S: '#f8c830', A: '#38b848', B: '#68d8f8', C: '#c8b8e0', D: '#8c8c9c' }[rank]
    c.fillStyle = INK
    c.fillRect(6, 28, 26, 30)
    c.fillStyle = rc
    c.fillRect(7, 29, 24, 1)
    c.fillRect(7, 56, 24, 1)
    drawText(c, 'RANK', 19, 31, { align: 'center', color: '#8c8c9c', shadow: null })
    drawText(c, rank, 19, 39, { scale: 3, align: 'center', color: rank === 'S' && Math.floor(this.t * 6) % 2 ? '#f4f4f4' : rc })
    const L = 86
    drawText(c, `MODE: ${r.diff}`, L, 30, { align: 'center' })
    drawText(c, `TIME ${fmtTime(r.time)}`, L, 42, { scale: 2, align: 'center' })
    drawText(c, `DEATHS: ${r.deaths}   CLOSE CALLS: ${r.close || 0}`, L, 58, { align: 'center', color: '#c8b8e0' })
    let y = 72
    for (const n of r.news) {
      drawText(c, `NEW RECORD! (${n})`, L, y, { align: 'center', color: Math.floor(this.t * 6) % 2 ? '#38b848' : '#f8c830' })
      y += 10
    }
    for (const b of r.badges) {
      drawText(c, b, L, y, { align: 'center', color: '#e03c9c' })
      y += 10
    }
    // The splits: how long each boss took. Gold means your fastest ever.
    const segs = r.segs || []
    if (segs.length) {
      drawText(c, 'SPLITS', 236, 30, { align: 'center', color: '#8c8c9c' })
      BOSSES.slice(0, 5).forEach((b, i) => {
        if (segs[i] === undefined) return
        const sy = 42 + i * 11
        const gold = r.gold && r.gold[i]
        drawText(c, b.name, 176, sy, { color: gold ? '#f8c830' : '#c8b8e0' })
        drawText(c, fmtTime(segs[i]), 300, sy, { align: 'right', color: gold ? '#f8c830' : '#f4f4f4' })
        if (gold && Math.floor(this.t * 4) % 2) drawSprite(c, SPR.star, 304, sy - 1)
      })
    }
    const cast = [SPR.jax, SPR.ragatha, SPR.gangle, SPR.pomniWave, SPR.kinger, SPR.zooble, SPR.caine]
    let x = 4
    cast.forEach((s, i) => {
      const hop = Math.round(Math.abs(Math.sin(this.t * 4 + i)) * -4)
      drawSprite(c, s, x, 176 - s.length + hop, { alpha: 0.35 })
      x += s[0].length + 2
    })
    if (this.st > 1 && Math.floor(this.t * 2) % 2) drawText(c, 'PRESS A', VW / 2, 160, { align: 'center' })
  }

  drawPause(c) {
    c.fillStyle = 'rgba(12, 6, 20, 0.75)'
    c.fillRect(0, 0, VW, VH)
    drawText(c, 'PAUSED', VW / 2, 40, { scale: 3, align: 'center', color: '#f8c830' })
    // A reminder of how this boss works, and how far into the show you are.
    const b = this.boss
    const info = b && b.sub ? BOSSES.find((x) => x.key === b.key) : BOSSES[this.bossIdx]
    if (info && this.state !== 'title') {
      drawText(c, `TIP: ${info.tip}`, VW / 2, 136, { align: 'center', color: '#68d8f8' })
      if (info.parts && !b.sub) {
        const part = info.parts.filter((p) => b.time >= p - 0.5).length
        const label = part >= info.parts.length ? 'THE FINALE' : `PART ${Math.max(1, part)} OF ${info.parts.length - 1}`
        drawText(c, `${info.name}: ${label}`, VW / 2, 148, { align: 'center', color: '#c8b8e0' })
      }
    }
    ;['RESUME', 'RETRY BOSS', 'MAIN MENU'].forEach((m, i) =>
      this.menuLine(c, m, VW / 2, 82 + i * 14, this.psel === i, () => ((this.psel = i), this.pressed.add('confirm')), { align: 'center' }),
    )
  }

  // A dithered wipe: 8x8 black blocks that vanish in a checkerboard-ish order.
  drawWipe(c, k) {
    const order = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    c.fillStyle = '#000000'
    for (let y = 0; y < VH; y += 8) {
      for (let x = 0; x < VW; x += 8) {
        const o = order[((y / 8) % 4) * 4 + ((x / 8) % 4)] / 16
        const sweep = (x / VW) * 0.35
        if (k > o * 0.65 + sweep) c.fillRect(x, y, 8, 8)
      }
    }
  }

  drawGlitch(c) {
    for (let i = 0; i < 5; i++) {
      const y = Math.floor(rand(0, VH))
      const h = Math.floor(rand(2, 9))
      c.drawImage(this.canvas, 0, y, VW, h, Math.round(rand(-10, 10)), y, VW, h)
    }
    for (let i = 0; i < 3; i++) {
      c.fillStyle = Math.random() < 0.5 ? 'rgba(224, 60, 156, 0.35)' : 'rgba(104, 216, 248, 0.35)'
      c.fillRect(0, Math.floor(rand(0, VH)), VW, Math.floor(rand(1, 4)))
    }
  }
}
