// The title screen (PLAY / SETTINGS / JUKEBOX), the settings page and the jukebox.

import { W, H, TAU, INK, circle, rrect, text, drawDino, drawUFO, drawAlien, drawBeam, drawSky, drawBackdrop, mixTheme, getTheme } from './art'
import { sfx, audioRunning } from './sound'
import { SONGS, playSong, stopMusic, currentSong, songById, songBeat, musicLevels } from './music'
import { SHOP_ITEMS, itemLevel, buy } from './shop'
import { yearLabel } from './names'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const easeOut = (t) => 1 - (1 - t) ** 3
export const inside = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h

const DUSK = mixTheme('aliens', 'dinos', 0.5)

// ---------- the title screen: a big hill with dinos walking about and UFOs trying to grab them ----------

const HILL = { cx: 480, cy: 610, rx: 760, ry: 220 }
const hillY = (x) => HILL.cy - HILL.ry * Math.sqrt(Math.max(0, 1 - ((x - HILL.cx) / HILL.rx) ** 2))
const hillSlope = (x) => Math.atan2(hillY(x + 2) - hillY(x - 2), 4)

export function initTitle(game) {
  game.title = {
    t: 0,
    sel: 0,
    walkers: [
      { kind: 'trike', x: 160, dir: 1, speed: 40, scale: 0.75 },
      { kind: 'stego', x: 360, dir: -1, speed: 30, scale: 0.75 },
      { kind: 'raptor', x: 560, dir: 1, speed: 70, scale: 0.65 },
      { kind: 'bronto', x: 860, dir: -1, speed: 25, scale: 0.7 },
    ].map((w) => ({ ...w, lift: 0, vy: 0, held: false, seed: rand(0, 10), walk: 0 })),
    ufos: [
      { x: 100, y: 230, vx: 60, enemy: false, seed: 1, timer: 3, beam: 0, target: null },
      { x: 700, y: 200, vx: -45, enemy: true, seed: 4, timer: 6, beam: 0, target: null },
    ],
    roar: 0,
    roarTimer: 5,
  }
}

function titleButtons() {
  return [
    { label: '▶  PLAY', color: '#ffe14a', x: W / 2 - 150, y: 156, w: 300, h: 44 },
    { label: '2 PLAYERS', color: '#f77622', x: W / 2 - 150, y: 208, w: 300, h: 44 },
    { label: '$  SHOP', color: '#63c74d', x: W / 2 - 150, y: 260, w: 300, h: 44 },
    { label: '⚙  SETTINGS', color: '#6bb8ff', x: W / 2 - 150, y: 312, w: 300, h: 44 },
    { label: '♫  JUKEBOX', color: '#ff8fb0', x: W / 2 - 150, y: 364, w: 300, h: 44 },
  ]
}

export function updateTitleWorld(game, dt) {
  const s = game.title
  s.t += dt
  for (const w of s.walkers) {
    if (w.held) {
      w.lift = Math.min(90, w.lift + 40 * dt)
    } else if (w.lift > 0) {
      w.vy += 900 * dt
      w.lift -= w.vy * dt
      if (w.lift <= 0) {
        w.lift = 0
        w.vy = 0
        game.fx.dust(w.x, hillY(w.x), 6)
      }
    } else {
      w.x += w.dir * w.speed * dt
      w.walk += w.speed * dt * 0.09
      if (w.x < 70 || w.x > 890) w.dir *= -1
    }
  }
  // the T. rex on the hill top roars every few seconds and scares the UFOs off
  s.roarTimer -= dt
  s.roar = Math.max(0, s.roar - dt)
  if (s.roarTimer <= 0) {
    s.roarTimer = rand(6, 9)
    s.roar = 0.8
    game.fx.ring(REX_X, hillY(REX_X) - 80, 260, 'rgba(255,255,255,0.8)', 0.6, 8)
    for (const u of s.ufos) {
      if (Math.abs(u.x - REX_X) < 330) {
        u.vx = Math.sign(u.x - REX_X || 1) * 260
        u.beam = 0
        u.timer = 3
        if (u.target) u.target.held = false
        u.target = null
      }
    }
  }
  for (const u of s.ufos) {
    u.timer -= dt
    if (u.beam > 0) {
      u.beam -= dt
      if (u.beam <= 0) {
        if (u.target) u.target.held = false
        u.target = null
        u.timer = rand(4, 7)
      }
    } else {
      u.x += u.vx * dt
      u.vx += (Math.sign(u.vx) * 55 - u.vx) * dt * 0.8
      if (u.x < -120) u.x = W + 110
      if (u.x > W + 120) u.x = -110
      if (u.timer <= 0) {
        const w = s.walkers.find((d) => !d.held && d.lift === 0 && Math.abs(d.x - u.x) < 60)
        if (w) {
          u.target = w
          u.beam = 2.4
          w.held = true
        }
      }
    }
    if (u.target) u.x += (u.target.x - u.x) * Math.min(1, dt * 3)
  }
  if (Math.random() < dt * 6) {
    game.fx.add({ x: rand(0, W), y: rand(380, H), vy: rand(-30, -10), vx: rand(-10, 10), life: 3, size: rand(2, 3.5), color: '#fff6a0', type: 'glow', drag: 0 })
  }
}

const REX_X = 700

export function drawTitleWorld(game, ctx) {
  const s = game.title
  const t = game.time
  drawSky(ctx, DUSK, t)
  ctx.save()
  ctx.translate(0, 10)
  drawBackdrop(ctx, DUSK, W / 2 + Math.sin(t * 0.05) * 250, t)
  ctx.restore()
  // UFO beams go behind the hill's dinos
  for (const u of s.ufos) {
    if (u.beam > 0 && u.target) drawBeam(ctx, u.x, u.y + 10, hillY(u.x), t, { enemy: u.enemy, width: 55 })
  }
  // far hill then the big hill
  ctx.fillStyle = '#1f4a34'
  ctx.beginPath()
  ctx.ellipse(120, 560, 420, 170, 0, 0, TAU)
  ctx.ellipse(900, 570, 380, 160, 0, 0, TAU)
  ctx.fill()
  const g = ctx.createLinearGradient(0, HILL.cy - HILL.ry, 0, H)
  g.addColorStop(0, '#3a8a3a')
  g.addColorStop(1, '#123a20')
  ctx.beginPath()
  ctx.ellipse(HILL.cx, HILL.cy, HILL.rx, HILL.ry, 0, 0, TAU)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = INK
  ctx.stroke()
  // flowers on the hill
  for (let i = 0; i < 16; i++) {
    const x = 40 + i * 58 + (i % 3) * 9
    const y = hillY(x) + 24 + (i % 4) * 14
    circle(ctx, x, y + Math.sin(t * 2 + i) * 1.5, 4)
    ctx.fillStyle = ['#ffe14a', '#ff8fb0', '#fff'][i % 3]
    ctx.fill()
  }
  for (const w of s.walkers) {
    ctx.save()
    ctx.translate(w.x, hillY(w.x) - w.lift)
    ctx.rotate(w.lift > 0 ? Math.sin(t * 5 + w.seed) * 0.25 : hillSlope(w.x))
    ctx.scale(w.dir * w.scale, w.scale)
    drawDino(ctx, w.kind, {
      time: t + w.seed,
      walk: w.walk,
      moving: w.lift === 0,
      flail: w.held,
      scared: w.held || w.lift > 0,
      lookUp: s.ufos.some((u) => Math.abs(u.x - w.x) < 120),
      blink: (t + w.seed) % 4 < 0.12,
    })
    ctx.restore()
  }
  ctx.save()
  ctx.translate(REX_X, hillY(REX_X) + 2)
  ctx.rotate(hillSlope(REX_X))
  ctx.scale(-1.15, 1.15)
  const roar = s.roar > 0 ? Math.sin((s.roar / 0.8) * Math.PI) : 0
  drawDino(ctx, 'rex', { time: t, roar, angry: roar > 0.2, blink: t % 3.5 < 0.12 })
  ctx.restore()
  for (const u of s.ufos) {
    ctx.save()
    ctx.translate(u.x, u.y + Math.sin(t * 2 + u.seed) * 8)
    ctx.scale(0.8, 0.8)
    drawUFO(ctx, { time: t + u.seed, enemy: u.enemy, beam: u.beam > 0, tilt: (u.vx / 300) * 0.3, mood: 'happy', stun: s.roar > 0 && Math.abs(u.x - REX_X) < 400 })
    ctx.restore()
  }
  game.fx.draw(ctx)
}

function drawLogo(ctx, t, y, intro = 1, size = 1) {
  ctx.save()
  ctx.translate(W / 2, y - (1 - intro) * 160)
  ctx.rotate(Math.sin(t * 1.5) * 0.02)
  ctx.scale(size, size)
  const words = [
    ['ALIENS', '#7dffb0', -195],
    ['VS', '#ffe14a', 0],
    ['DINOS', '#ffa94d', 185],
  ]
  for (const [i, [w, c, x]] of words.entries()) {
    ctx.save()
    ctx.translate(x, Math.sin(t * 3 + i) * 4)
    text(ctx, w, 0, 26, i === 1 ? 44 : 66, c)
    ctx.restore()
  }
  ctx.restore()
}

export function drawButton(ctx, b, selected, t) {
  ctx.save()
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2)
  const s = selected ? 1.07 + Math.sin(t * 6) * 0.015 : 1
  ctx.scale(s, s)
  if (selected) ctx.rotate(Math.sin(t * 4) * 0.015)
  rrect(ctx, -b.w / 2, -b.h / 2 + 6, b.w, b.h, b.h / 2)
  ctx.fillStyle = INK
  ctx.fill()
  if (selected) {
    ctx.shadowColor = b.color
    ctx.shadowBlur = 24
  }
  rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2)
  ctx.fillStyle = b.color
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.lineWidth = 4
  ctx.strokeStyle = INK
  ctx.stroke()
  rrect(ctx, -b.w / 2 + 14, -b.h / 2 + 6, b.w - 28, b.h * 0.3, b.h * 0.15)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fill()
  text(ctx, b.label, 0, (b.size || 26) * 0.36, b.size || 26, INK, 'center', false)
  ctx.restore()
}

function updateTitle(game, dt) {
  const s = game.title
  updateTitleWorld(game, dt)
  const btns = titleButtons()
  const k = game.pressed
  if (k.has('up')) {
    s.sel = (s.sel + 4) % 5
    sfx.click()
  }
  if (k.has('down')) {
    s.sel = (s.sel + 1) % 5
    sfx.click()
  }
  const hover = btns.findIndex((b) => inside(game.mouse, b))
  if (game.mouseMoved && hover >= 0 && hover !== s.sel) {
    s.sel = hover
    sfx.click()
  }
  if ((k.has('enter') || k.has('action')) && game.sceneT > 0.3) pressTitle(game, s.sel)
}

function pressTitle(game, i) {
  sfx.select()
  if (i === 0) game.playPressed()
  else if (i === 1) game.twoPlayerPressed()
  else if (i === 2) game.goShop()
  else if (i === 3) game.goScene('settings')
  else game.goScene('jukebox')
}

function drawTitle(game, ctx) {
  const t = game.time
  drawTitleWorld(game, ctx)
  const intro = easeOut(clamp(game.sceneT / 0.8, 0, 1))
  drawLogo(ctx, t, 92, intro)
  for (const [i, b] of titleButtons().entries()) {
    const pop = easeOut(clamp((game.sceneT - 0.2 - i * 0.12) / 0.4, 0, 1))
    ctx.save()
    ctx.globalAlpha = pop
    ctx.translate(0, (1 - pop) * 40)
    drawButton(ctx, b, game.title.sel === i, t)
    if (game.title.sel === i) {
      // a tiny UFO points at the chosen button
      ctx.save()
      ctx.translate(b.x - 50, b.y + b.h / 2 + Math.sin(t * 5) * 4)
      ctx.scale(0.45, 0.45)
      drawUFO(ctx, { time: t, mood: 'happy' })
      ctx.restore()
    }
    ctx.restore()
  }
  if (!audioRunning() && Math.floor(t * 2) % 2 === 0) {
    text(ctx, '♪ TAP OR PRESS A KEY FOR MUSIC ♪', W / 2, 470, 18, '#fee761')
  }
  const best = game.best
  text(ctx, game.profile ? `PLAYER: ${game.profile.name} · ${yearLabel(game.profile.year)}` : 'PRESS PLAY TO LOG IN', W / 2, 140, 14, '#fee761')
  text(ctx, `Best: Aliens ${best.aliens || 0}  ·  Dinos ${best.dinos || 0}`, W / 2, 512, 15, '#fff')
  text(ctx, '↑ ↓ to choose · Enter or tap to pick', W / 2, 532, 12, 'rgba(255,255,255,0.8)')
}

// ---------- settings ----------

const ROWS = [
  { key: 'music', label: 'Music volume', type: 'volume' },
  { key: 'sound', label: 'Sound effects', type: 'volume' },
  { key: 'difficulty', label: 'Difficulty', type: 'choice', options: ['easy', 'normal', 'hard'], names: ['Easy', 'Normal', 'Hard'] },
  { key: 'shake', label: 'Screen shake', type: 'toggle' },
  { key: 'cutscenes', label: 'Cutscenes', type: 'toggle' },
  { key: 'player', label: 'School year', type: 'player' },
  { key: 'logout', label: 'Log out', type: 'logout' },
  { key: 'back', label: 'Back', type: 'back' },
]

function rowRect(i) {
  return { x: 170, y: 100 + i * 51, w: 620, h: 45 }
}

function changeSetting(game, row, dir) {
  const st = game.settings
  if (row.type === 'volume') st[row.key] = clamp(st[row.key] + dir, 0, 10)
  else if (row.type === 'toggle') st[row.key] = !st[row.key]
  else if (row.type === 'choice') {
    const i = row.options.indexOf(st[row.key])
    st[row.key] = row.options[(i + dir + row.options.length) % row.options.length]
  } else if (row.type === 'back') {
    game.goTitle()
    return
  } else if (row.type === 'player') {
    sfx.click()
    if (game.profile) game.editProfile()
    else game.playPressed()
    return
  } else if (row.type === 'logout') {
    sfx.click()
    if (game.profile) game.logOutPlayer()
    else game.playPressed()
    return
  }
  game.saveSettings()
  if (row.key === 'sound') sfx.pickup()
  else sfx.click()
}

function updateSettings(game, dt) {
  updateTitleWorld(game, dt)
  const k = game.pressed
  const s = game.title
  s.setSel = s.setSel || 0
  if (k.has('up')) s.setSel = (s.setSel + ROWS.length - 1) % ROWS.length
  if (k.has('down')) s.setSel = (s.setSel + 1) % ROWS.length
  if (k.has('up') || k.has('down')) sfx.click()
  const hover = ROWS.findIndex((_, i) => inside(game.mouse, rowRect(i)))
  if (game.mouseMoved && hover >= 0) s.setSel = hover
  const row = ROWS[s.setSel]
  if (k.has('left') && (row.type === 'volume' || row.type === 'choice' || row.type === 'toggle')) changeSetting(game, row, -1)
  if (k.has('right') && (row.type === 'volume' || row.type === 'choice' || row.type === 'toggle')) changeSetting(game, row, 1)
  if (k.has('enter') || k.has('action')) changeSetting(game, row, 1)
  if (k.has('pause')) game.goTitle()
}

function clickSettings(game, p) {
  for (const [i, row] of ROWS.entries()) {
    const r = rowRect(i)
    if (!inside(p, r)) continue
    if (row.type === 'volume' || row.type === 'choice') {
      if (p.x < 540) changeSetting(game, row, -1)
      else if (p.x > 730) changeSetting(game, row, 1)
      else if (row.type === 'choice') changeSetting(game, row, 1)
      else {
        // tap right on the volume bar to set it
        game.settings[row.key] = clamp(Math.round((p.x - 548) / 17.5), 0, 10)
        game.saveSettings()
        sfx.click()
      }
    } else changeSetting(game, row, 1)
  }
}

function drawSettings(game, ctx) {
  const t = game.time
  drawTitleWorld(game, ctx)
  ctx.fillStyle = 'rgba(15,10,40,0.55)'
  ctx.fillRect(0, 0, W, H)
  text(ctx, '⚙ SETTINGS', W / 2, 78, 46, '#6bb8ff')
  const st = game.settings
  const sel = game.title.setSel || 0
  for (const [i, row] of ROWS.entries()) {
    const r = rowRect(i)
    const on = sel === i
    if (row.type === 'back') {
      drawButton(ctx, { label: '◀  BACK', color: '#ffe14a', x: W / 2 - 110, y: r.y + 2, w: 220, h: 42, size: 20 }, on, t)
      continue
    }
    rrect(ctx, r.x, r.y, r.w, r.h, 16)
    ctx.fillStyle = on ? 'rgba(107,184,255,0.35)' : 'rgba(15,10,40,0.7)'
    ctx.fill()
    ctx.lineWidth = on ? 4 : 2
    ctx.strokeStyle = on ? '#6bb8ff' : 'rgba(255,255,255,0.25)'
    ctx.stroke()
    text(ctx, row.label, r.x + 24, r.y + 34, 22, '#fff', 'left')
    const cy = r.y + r.h / 2
    if (row.type === 'player' || row.type === 'logout') {
      const p = game.profile
      const label = !p ? 'TAP TO LOG IN' : row.type === 'player' ? `${yearLabel(p.year)} · TAP TO CHANGE` : `${p.name} · TAP TO LOG OUT`
      text(ctx, label, 640, cy + 7, 16, '#fee761')
      continue
    }
    if (row.type !== 'toggle') {
      for (const [x, s] of [
        [500, '−'],
        [750, '+'],
      ]) {
        circle(ctx, x + 10, cy, 18)
        ctx.fillStyle = '#e9f1ff'
        ctx.fill()
        ctx.lineWidth = 3
        ctx.strokeStyle = INK
        ctx.stroke()
        text(ctx, s, x + 10, cy + 9, 26, INK, 'center', false)
      }
    }
    if (row.type === 'volume') {
      for (let k = 0; k < 10; k++) {
        rrect(ctx, 552 + k * 17.5, cy - 12 + (9 - k) * 1.2, 13, 24 - (9 - k) * 2.4, 4)
        ctx.fillStyle = k < st[row.key] ? (row.key === 'music' ? '#ff8fb0' : '#7dffb0') : 'rgba(255,255,255,0.15)'
        ctx.fill()
      }
    } else if (row.type === 'choice') {
      const i2 = row.options.indexOf(st[row.key])
      text(ctx, row.names[i2], 640, cy + 9, 24, ['#7dffb0', '#ffe14a', '#ff8fa0'][i2])
    } else {
      const v = st[row.key]
      rrect(ctx, 600, cy - 18, 100, 36, 18)
      ctx.fillStyle = v ? '#7dffb0' : 'rgba(255,255,255,0.2)'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = INK
      ctx.stroke()
      circle(ctx, v ? 682 : 618, cy, 14)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.stroke()
      text(ctx, v ? 'ON' : 'OFF', v ? 632 : 668, cy + 6, 15, INK, 'center', false)
    }
  }
  const hint = { easy: 'Easy: more shields and lives, slower aliens', normal: 'Normal: just right', hard: 'Hard: fast aliens, only a few lives!' }
  text(ctx, hint[st.difficulty], W / 2, 520, 15, '#c9c2ff')
}

// ---------- jukebox ----------

function songRect(i) {
  return { x: 40, y: 104 + i * 58, w: 390, h: 50 }
}
const STOP_BTN = { label: '■  STOP', color: '#ff8fb0', x: 700, y: 470, w: 200, h: 50, size: 20 }
const BACK_BTN = { label: '◀  BACK', color: '#ffe14a', x: 40, y: 470, w: 200, h: 50, size: 20 }

function updateJukebox(game) {
  const s = game.title
  s.jukeSel = s.jukeSel || 0
  const k = game.pressed
  if (k.has('up')) s.jukeSel = (s.jukeSel + SONGS.length - 1) % SONGS.length
  if (k.has('down')) s.jukeSel = (s.jukeSel + 1) % SONGS.length
  if (k.has('up') || k.has('down')) sfx.click()
  const hover = SONGS.findIndex((_, i) => inside(game.mouse, songRect(i)))
  if (game.mouseMoved && hover >= 0) s.jukeSel = hover
  if (k.has('enter') || k.has('action')) pickSong(game, s.jukeSel)
  if (k.has('fire')) stopMusic()
  if (k.has('pause')) game.goTitle()
  // music notes float up from the speakers in time with the song
  const beat = Math.floor(songBeat() / 2)
  if (currentSong() && beat !== s.lastBeat) {
    s.lastBeat = beat
    for (const x of [490, 900]) {
      game.fx.add({ x, y: 360, vx: rand(-30, 30), vy: rand(-90, -60), life: 1.6, text: pick(['♪', '♫']), color: pick(['#ff8fb0', '#7dffb0', '#ffe14a', '#6bb8ff']), size: 22, type: 'text', drag: 0.5 })
    }
  }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

function pickSong(game, i) {
  game.userSong = true
  if (currentSong() === SONGS[i].id) return
  playSong(SONGS[i].id)
}

function clickJukebox(game, p) {
  const i = SONGS.findIndex((_, k) => inside(p, songRect(k)))
  if (i >= 0) pickSong(game, i)
  if (inside(p, STOP_BTN)) {
    sfx.click()
    stopMusic()
  }
  if (inside(p, BACK_BTN)) {
    sfx.click()
    game.goTitle()
  }
}

function drawJukebox(game, ctx) {
  const t = game.time
  const beat = songBeat()
  const playing = currentSong()
  const bop = playing ? Math.abs(Math.sin((beat / 4) * Math.PI)) : 0
  drawSky(ctx, getTheme('night'), t)
  // spotlights sweeping across the stage
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const [i, c] of ['255,120,170', '120,255,190', '120,180,255'].entries()) {
    const a = Math.sin(t * 0.8 + i * 2) * 0.5
    const x0 = 520 + i * 160
    ctx.save()
    ctx.translate(x0, 0)
    ctx.rotate(a)
    const g = ctx.createLinearGradient(0, 0, 0, 460)
    g.addColorStop(0, `rgba(${c},${playing ? 0.35 : 0.12})`)
    g.addColorStop(1, `rgba(${c},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(10, 0)
    ctx.lineTo(90, 460)
    ctx.lineTo(-90, 460)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
  // stage
  ctx.fillStyle = '#3a2350'
  ctx.fillRect(450, 420, W - 450, H - 420)
  ctx.fillStyle = '#5a3a7a'
  ctx.fillRect(450, 412, W - 450, 10)
  text(ctx, '♫ JUKEBOX', W / 2, 72, 44, '#ff8fb0')

  for (const [i, song] of SONGS.entries()) {
    const r = songRect(i)
    const sel = game.title.jukeSel === i
    const on = playing === song.id
    rrect(ctx, r.x, r.y, r.w, r.h, 16)
    ctx.fillStyle = on ? 'rgba(255,143,176,0.45)' : sel ? 'rgba(255,255,255,0.18)' : 'rgba(15,10,40,0.7)'
    ctx.fill()
    ctx.lineWidth = sel ? 4 : 2
    ctx.strokeStyle = on ? '#ff8fb0' : sel ? '#fff' : 'rgba(255,255,255,0.25)'
    ctx.stroke()
    text(ctx, song.emoji, r.x + 30, r.y + 34, 24, '#fff', 'center', false)
    text(ctx, song.name, r.x + 58, r.y + 33, 21, '#fff', 'left')
    if (on) {
      for (let b = 0; b < 3; b++) {
        const h = 8 + Math.abs(Math.sin(t * 8 + b * 1.7)) * 18
        rrect(ctx, r.x + r.w - 54 + b * 12, r.y + 38 - h, 8, h, 3)
        ctx.fillStyle = '#ffe14a'
        ctx.fill()
      }
    } else {
      text(ctx, '▶', r.x + r.w - 30, r.y + 33, 20, sel ? '#fff' : 'rgba(255,255,255,0.4)', 'center', false)
    }
  }

  // now playing + equaliser
  rrect(ctx, 470, 100, 450, 170, 18)
  ctx.fillStyle = 'rgba(15,10,40,0.75)'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.stroke()
  const song = playing && songById(playing)
  text(ctx, song ? 'NOW PLAYING' : 'PICK A SONG!', 695, 130, 15, '#c9c2ff')
  text(ctx, song ? `${song.emoji} ${song.name}` : '♪ ♪ ♪', 695, 162, 26, '#fff')
  const lv = musicLevels()
  for (let i = 0; i < 24; i++) {
    const v = lv[i] / 255
    const h = 4 + v * 80
    rrect(ctx, 492 + i * 17.5, 258 - h, 12, h, 4)
    ctx.fillStyle = `hsl(${300 - i * 9}, 90%, ${60 + v * 15}%)`
    ctx.fill()
  }

  // dancers
  ctx.save()
  ctx.translate(560, 405 - bop * 16)
  ctx.rotate(Math.sin((beat / 8) * Math.PI) * 0.15 * (playing ? 1 : 0))
  ctx.scale(2.3, 2.3)
  drawAlien(ctx, 0, 0, { time: t, mood: 'happy' })
  ctx.restore()
  ctx.save()
  ctx.translate(720, 420 - bop * 18)
  const sway = playing ? Math.sin((beat / 8) * Math.PI) : 0
  ctx.rotate(sway * 0.12)
  ctx.scale(-1, 1)
  drawDino(ctx, 'rex', { time: t, walk: beat * 0.8, moving: !!playing, roar: playing && Math.floor(beat / 16) % 2 ? bop * 0.6 : 0, blink: t % 3 < 0.12 })
  ctx.restore()
  ctx.save()
  ctx.translate(850, 330 + Math.sin(t * 2) * 8)
  ctx.scale(0.6, 0.6)
  drawUFO(ctx, { time: t, enemy: true, mood: 'happy', tilt: sway * 0.2 })
  ctx.restore()
  for (const x of [470, 905]) {
    rrect(ctx, x - 22, 360, 44, 60, 6)
    ctx.fillStyle = '#20152e'
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 3
    ctx.stroke()
    circle(ctx, x, 398, 12 + bop * 3)
    ctx.fillStyle = '#4a3a70'
    ctx.fill()
    ctx.stroke()
  }
  game.fx.draw(ctx)
  drawButton(ctx, BACK_BTN, false, t)
  drawButton(ctx, STOP_BTN, false, t)
  text(ctx, 'Enter = play · Z = stop · Esc = back', 470, 545 - 12, 12, 'rgba(255,255,255,0.7)')
}

// ---------- shop ----------

const SHOP_TABS = [
  { side: 'aliens', label: 'ALIENS', color: '#7dffb0', x: 250, y: 96, w: 220, h: 40 },
  { side: 'dinos', label: 'DINOS', color: '#ffa94d', x: 490, y: 96, w: 220, h: 40 },
]
const SHOP_BACK = { label: '◀  BACK', color: '#ffe14a', x: 40, y: 476, w: 180, h: 46, size: 20 }

function shopRow(i) {
  return { x: 110, y: 150 + i * 62, w: 740, h: 54 }
}
function buyRect(i) {
  const r = shopRow(i)
  return { x: r.x + r.w - 160, y: r.y + 8, w: 146, h: r.h - 16 }
}

function shopBuy(game, i) {
  const s = game.title
  const side = s.shopTab || 'aliens'
  const item = SHOP_ITEMS[side][i]
  const lvl = itemLevel(game.shop, side, item.key)
  if (lvl >= item.prices.length) {
    s.shopMsg = { text: 'ALREADY MAXED OUT!', t: 1.5 }
    sfx.click()
  } else if (buy(game.shop, side, item)) {
    game.persist()
    s.shopMsg = { text: `YOU BOUGHT ${item.name.toUpperCase()}!`, t: 1.8 }
    sfx.capture()
    const r = buyRect(i)
    game.fx.burst(r.x + r.w / 2, r.y + r.h / 2, 20, { speed: 220, life: 0.7, size: 7, color: ['#fee761', '#7dffb0', '#ffffff'], type: 'star' })
  } else {
    s.shopMsg = { text: `YOU NEED ${item.prices[lvl] - game.shop.coins} MORE COINS`, t: 1.8 }
    sfx.warn()
  }
}

function updateShop(game, dt) {
  updateTitleWorld(game, dt)
  const s = game.title
  const k = game.pressed
  s.shopSel = s.shopSel ?? 0
  if (s.shopMsg) {
    s.shopMsg.t -= dt
    if (s.shopMsg.t <= 0) s.shopMsg = null
  }
  if (k.has('left') || k.has('right')) {
    s.shopTab = (s.shopTab || 'aliens') === 'aliens' ? 'dinos' : 'aliens'
    sfx.click()
  }
  if (k.has('up')) s.shopSel = (s.shopSel + 5) % 6
  if (k.has('down')) s.shopSel = (s.shopSel + 1) % 6
  if (k.has('up') || k.has('down')) sfx.click()
  if (game.mouseMoved) {
    const hover = [0, 1, 2, 3, 4].findIndex((i) => inside(game.mouse, shopRow(i)))
    if (hover >= 0) s.shopSel = hover
    if (inside(game.mouse, SHOP_BACK)) s.shopSel = 5
  }
  if (k.has('enter') || k.has('action')) {
    if (s.shopSel === 5) game.goBack()
    else shopBuy(game, s.shopSel)
  }
  if (k.has('pause')) game.goBack()
}

function clickShop(game, p) {
  const s = game.title
  for (const tab of SHOP_TABS) {
    if (inside(p, tab)) {
      s.shopTab = tab.side
      sfx.click()
    }
  }
  const i = [0, 1, 2, 3, 4].findIndex((k) => inside(p, shopRow(k)))
  if (i >= 0) {
    s.shopSel = i
    shopBuy(game, i)
  }
  if (inside(p, SHOP_BACK)) {
    sfx.click()
    game.goBack()
  }
}

function drawShop(game, ctx) {
  const t = game.time
  const s = game.title
  const side = s.shopTab || 'aliens'
  drawTitleWorld(game, ctx)
  ctx.fillStyle = 'rgba(15,10,40,0.7)'
  ctx.fillRect(0, 0, W, H)
  text(ctx, '$ SHOP', W / 2, 70, 40, '#7dffb0')
  text(ctx, `$ ${game.shop.coins} COINS`, W - 30, 52, 20, '#fee761', 'right')
  for (const tab of SHOP_TABS) {
    const on = tab.side === side
    rrect(ctx, tab.x, tab.y, tab.w, tab.h, 12)
    ctx.fillStyle = on ? tab.color : 'rgba(255,255,255,0.12)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    text(ctx, tab.label, tab.x + tab.w / 2, tab.y + 28, 20, on ? INK : '#c0cbdc', 'center', !on)
  }
  for (const [i, item] of SHOP_ITEMS[side].entries()) {
    const r = shopRow(i)
    const sel = s.shopSel === i
    const lvl = itemLevel(game.shop, side, item.key)
    const maxed = lvl >= item.prices.length
    const price = item.prices[lvl]
    rrect(ctx, r.x, r.y, r.w, r.h, 14)
    ctx.fillStyle = sel ? 'rgba(125,255,176,0.22)' : 'rgba(15,10,40,0.85)'
    ctx.fill()
    ctx.lineWidth = sel ? 4 : 2
    ctx.strokeStyle = sel ? '#7dffb0' : 'rgba(255,255,255,0.25)'
    ctx.stroke()
    text(ctx, item.name, r.x + 20, r.y + 26, 20, '#ffffff', 'left')
    text(ctx, item.desc, r.x + 20, r.y + 45, 13, '#c0cbdc', 'left')
    // one pip per level you can buy
    for (let k = 0; k < item.prices.length; k++) {
      rrect(ctx, r.x + 400 + k * 24, r.y + 19, 16, 16, 4)
      ctx.fillStyle = k < lvl ? '#fee761' : 'rgba(255,255,255,0.18)'
      ctx.fill()
    }
    const b = buyRect(i)
    const afford = !maxed && game.shop.coins >= price
    rrect(ctx, b.x, b.y, b.w, b.h, 10)
    ctx.fillStyle = maxed ? '#3a4466' : afford ? '#fee761' : '#5a6988'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    text(ctx, maxed ? 'MAXED' : `BUY $${price}`, b.x + b.w / 2, b.y + 27, 18, maxed ? '#c0cbdc' : INK, 'center', false)
  }
  drawButton(ctx, SHOP_BACK, s.shopSel === 5, t)
  if (s.shopMsg) text(ctx, s.shopMsg.text, W / 2 + 90, 505, 18, '#fee761')
  else text(ctx, 'Earn coins by playing, solving math and spelling words!', W / 2 + 90, 505, 14, '#c0cbdc')
  game.fx.draw(ctx)
}

// ---------- what the game calls ----------

export function updateScreen(game, dt) {
  if (game.scene === 'title') updateTitle(game, dt)
  else if (game.scene === 'settings') updateSettings(game, dt)
  else if (game.scene === 'jukebox') updateJukebox(game, dt)
  else if (game.scene === 'shop') updateShop(game, dt)
}

export function drawScreen(game, ctx) {
  if (game.scene === 'title') drawTitle(game, ctx)
  else if (game.scene === 'settings') drawSettings(game, ctx)
  else if (game.scene === 'jukebox') drawJukebox(game, ctx)
  else if (game.scene === 'shop') drawShop(game, ctx)
}

export function clickScreen(game, p) {
  if (game.scene === 'title') {
    const i = titleButtons().findIndex((b) => inside(p, b))
    if (i >= 0 && game.sceneT > 0.3) pressTitle(game, i)
  } else if (game.scene === 'settings') clickSettings(game, p)
  else if (game.scene === 'jukebox') clickJukebox(game, p)
  else if (game.scene === 'shop') clickShop(game, p)
}

export const MENU_BACK = { x: 16, y: 14, w: 110, h: 40 }

export function drawBackButton(ctx, game) {
  drawButton(ctx, { ...MENU_BACK, label: '◀ Back', color: '#e9f1ff', size: 17 }, inside(game.mouse, MENU_BACK), game.time)
}

