// EASTER EGGS: secret things hidden around the game. Finding one for the first time gives
// +25 Xenobits and +1 DNA, and the CURRENCY page counts how many you've found.
//
//   PARTY TIME    on the title screen, press ↑ ↑ ↓ ↓ ← → ← → B A
//   BIG ROAR      on the title screen, type R O A R
//   HELLO MOON    tap the moon on the title screen 5 times
//   TICKLE REX    tap the T. rex on the hill 5 times
//   JOKE TIME     tap your own picture on the title screen
//   SPACE COW     as the UFO, fly all the way right and beam up the cow
//   GRANDPA DINO  as the T. rex, go all the way left and roar at the sleeping old dino

import { W, H, GROUND, WORLD, rrect, text, drawDino } from './art'
import { PX } from './pixel'
import { sfx } from './sound'
import { inBeam } from './game'
import { REX_X, hillY } from './menus'

export const SECRETS = [
  { id: 'party', name: 'PARTY TIME' },
  { id: 'roar', name: 'BIG ROAR' },
  { id: 'moon', name: 'HELLO MOON' },
  { id: 'tickle', name: 'TICKLE REX' },
  { id: 'joke', name: 'JOKE TIME' },
  { id: 'cow', name: 'SPACE COW' },
  { id: 'grandpa', name: 'GRANDPA DINO' },
]

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
const ROAR = ['KeyR', 'KeyO', 'KeyA', 'KeyR']
const MOON = { x: 884, y: 156, r: 55 }

const JOKES = [
  'What do you call a sleeping dinosaur? A DINO-SNORE!',
  'Why did the UFO go to school? To get a little SPACE!',
  'What do aliens put in their tea? UFO-RANGE juice!',
  "Why can't a T. rex clap? Its arms are too short!",
  'What do you call a dino that never gives up? A TRY-ceratops!',
  'How do aliens keep their pants up? With an ASTEROID belt!',
  "What's a dinosaur's least favourite reindeer? COMET!",
  'Why did the alien eat the moon? It was a full-moon snack!',
]

const snap = (v) => Math.round(v / PX) * PX
const pick = (a) => a[Math.floor(Math.random() * a.length)]

export const secretsFound = (shop) => (shop.secrets || []).length

// You found a secret! The first time it pays out; after that it's just for fun.
export function foundSecret(game, id) {
  const s = SECRETS.find((x) => x.id === id)
  if (!s) return
  game.shop.secrets = game.shop.secrets || []
  if (game.shop.secrets.includes(id)) return
  game.shop.secrets.push(id)
  game.earn(25)
  game.gain('dna', 1)
  game.secretPopup = { name: s.name, n: game.shop.secrets.length, t: 0 }
  sfx.win()
}

// ---------- title screen secrets ----------

// every key you press on the title screen (for the secret codes)
export function secretKey(game, code) {
  if (game.scene !== 'title') return
  const log = (game.keyLog = [...(game.keyLog || []), code].slice(-10))
  const ends = (seq) => seq.every((c, i) => log[log.length - seq.length + i] === c)
  if (ends(KONAMI)) {
    game.keyLog = []
    game.party = 10
    game.fx.text(W / 2, 200, 'PARTY TIME!', '#fee761', 40)
    foundSecret(game, 'party')
  } else if (ends(ROAR)) {
    game.keyLog = []
    game.title.roarTimer = 0
    game.shake = 16
    game.fx.text(REX_X, hillY(REX_X) - 160, 'ROOOOOAAAAR!', '#ffe14a', 34)
    foundSecret(game, 'roar')
  }
}

// taps on the title screen; returns true if a secret used the tap
export function secretClick(game, p) {
  const sc = (game.secretClicks = game.secretClicks || { moon: 0, rex: 0 })
  if (Math.hypot(p.x - MOON.x, p.y - MOON.y) < MOON.r) {
    sc.moon++
    sfx.click()
    game.fx.burst(p.x, p.y, 6, { speed: 120, life: 0.5, size: 4, color: '#fee761', type: 'star' })
    if (sc.moon >= 5) {
      sc.moon = 0
      game.moonWink = 3
      game.fx.text(MOON.x - 80, MOON.y + 70, `THE MOON SAYS: HI ${game.profile?.name || 'FRIEND'}!`, '#fee761', 18)
      foundSecret(game, 'moon')
    }
    return true
  }
  const ry = hillY(REX_X) - 60
  if (Math.abs(p.x - REX_X) < 70 && Math.abs(p.y - ry) < 70) {
    sc.rex++
    sfx.squeak()
    game.fx.text(REX_X, ry - 90, sc.rex >= 5 ? 'HA HA HA! STOP IT!' : 'HEE HEE!', '#ffa94d', 20)
    if (sc.rex >= 5) {
      sc.rex = 0
      game.title.roar = 0.8
      foundSecret(game, 'tickle')
    }
    return true
  }
  if (game.profile && Math.abs(p.x - (W - 230)) < 32 && Math.abs(p.y - 31) < 32) {
    game.joke = { text: pick(JOKES.filter((j) => j !== game.joke?.text)), t: 6 }
    sfx.select()
    foundSecret(game, 'joke')
    return true
  }
  return false
}

export function updateSecrets(game, dt) {
  if (game.party > 0) {
    game.party -= dt
    if (game.scene === 'title' && Math.random() < dt * 12) {
      game.fx.burst(Math.random() * W, -10, 4, { speed: 120, life: 2.5, size: 6, color: ['#e43b44', '#feae34', '#fee761', '#63c74d', '#2ce8f5', '#f6757a'], type: 'dot', g: 200, drag: 1 })
    }
  }
  if (game.moonWink > 0) game.moonWink -= dt
  if (game.joke) {
    game.joke.t -= dt
    if (game.joke.t <= 0) game.joke = null
  }
  if (game.secretPopup) {
    game.secretPopup.t += dt
    if (game.secretPopup.t > 4) game.secretPopup = null
  }
}

// party lights and the moon's wink, over the title screen
export function drawTitleSecrets(game, ctx) {
  const t = game.time
  if (game.party > 0) {
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle = ['#e43b44', '#feae34', '#fee761', '#63c74d', '#2ce8f5', '#b55088'][Math.floor(t * 6) % 6]
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
  if (game.moonWink > 0) {
    // a happy face on the moon, and a wink
    ctx.fillStyle = '#181425'
    ctx.fillRect(MOON.x - 18, MOON.y - 12, 9, Math.floor(t * 4) % 2 ? 3 : 9)
    ctx.fillRect(MOON.x + 9, MOON.y - 12, 9, 9)
    ctx.fillRect(MOON.x - 15, MOON.y + 9, 30, 3)
    ctx.fillRect(MOON.x - 18, MOON.y + 6, 3, 3)
    ctx.fillRect(MOON.x + 15, MOON.y + 6, 3, 3)
  }
  if (game.joke) {
    const w = Math.min(W - 40, game.joke.text.length * 9 + 40)
    const x = Math.min(W - 20 - w, Math.max(20, W - 230 - w / 2))
    rrect(ctx, x, 58, w, 36, 10)
    ctx.fillStyle = 'rgba(24,20,37,0.92)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#fee761'
    ctx.stroke()
    text(ctx, game.joke.text, x + w / 2, 81, 13, '#fee761')
  }
}

// the "you found an Easter egg" message, on top of every screen
export function drawSecretPopup(game, ctx) {
  const p = game.secretPopup
  if (!p) return
  const y = 420 + Math.max(0, 1 - p.t * 4) * 140
  rrect(ctx, W / 2 - 230, y, 460, 74, 14)
  ctx.fillStyle = 'rgba(24,20,37,0.95)'
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = ['#fee761', '#f6757a', '#63c74d', '#2ce8f5'][Math.floor(p.t * 6) % 4]
  ctx.stroke()
  text(ctx, `🥚 EASTER EGG FOUND! ${p.n} OF ${SECRETS.length}`, W / 2, y + 28, 18, '#fee761')
  text(ctx, `${p.name}   +25 ◆  +1 🧬`, W / 2, y + 56, 16, '#ffffff')
}

// ---------- in-game secrets ----------

export function startSecrets(game) {
  game.cow = game.side === 'aliens' ? { x: WORLD - 110, lift: 0, gone: false, t: 0 } : null
  game.grandpa = game.side === 'dinos' ? { x: 110, awake: 0 } : null
}

// the space cow, far over on the right side of the world
export function updateCow(game, dt) {
  const c = game.cow
  const p = game.ufo
  if (!c || c.gone) return
  c.t += dt
  if (p.beaming && inBeam(p.x, p.y, c.x, GROUND - 20 - c.lift)) {
    c.lift += 90 * dt
    c.x += (p.x - c.x) * Math.min(1, dt * 2)
    if (Math.random() < dt * 3) game.fx.text(c.x, GROUND - 60 - c.lift, 'MOO?', '#ffffff', 16)
    if (GROUND - c.lift - 20 < p.y + 20) {
      c.gone = true
      sfx.capture()
      game.fx.text(Math.min(p.x, WORLD - 230), p.y - 60, 'MOO! WRONG PLANET, COW!', '#ffffff', 22)
      game.fx.burst(p.x, p.y, 20, { speed: 220, life: 0.7, size: 6, color: ['#ffffff', '#181425', '#f6757a'], type: 'star' })
      foundSecret(game, 'cow')
    }
  } else c.lift = Math.max(0, c.lift - 160 * dt)
}

export function drawCow(ctx, game) {
  const c = game.cow
  if (!c || c.gone) return
  const x = snap(c.x)
  const y = snap(GROUND - c.lift)
  const bob = c.lift > 0 ? 0 : Math.floor(c.t * 2) % 2 ? PX : 0
  const r = (dx, dy, w, h, col) => {
    ctx.fillStyle = col
    ctx.fillRect(x + dx, y + dy, w, h)
  }
  r(-27, -45, 54, 30, '#181425')
  r(-24, -42, 48, 24, '#ffffff')
  r(-15, -42, 12, 9, '#181425')
  r(6, -33, 12, 9, '#181425')
  for (const lx of [-21, -9, 6, 15]) r(lx, -18, 6, 18, '#181425')
  // head (eating grass when it's on the ground)
  r(21, -48 + bob * 3, 18, 18, '#181425')
  r(24, -45 + bob * 3, 12, 12, '#ffffff')
  r(27, -36 + bob * 3, 12, 6, '#f6757a')
  r(27, -42 + bob * 3, 3, 3, '#181425')
  r(-33, -42, 6, 3, '#181425')
}

// Grandpa Dino sleeps at the far left. Roar near him and he wakes up!
export function roarAtGrandpa(game, x) {
  const g = game.grandpa
  if (!g || g.awake > 0 || Math.abs(x - g.x) > 380) return
  g.awake = 6
  sfx.roar(true)
  game.fx.text(g.x + 220, GROUND - 230, 'WHO WOKE ME UP?! IN MY DAY WE', '#c0cbdc', 16)
  game.fx.text(g.x + 220, GROUND - 205, 'HAD TO ROAR UPHILL BOTH WAYS!', '#c0cbdc', 16)
  foundSecret(game, 'grandpa')
}

export function updateGrandpa(game, dt) {
  const g = game.grandpa
  if (g && g.awake > 0) g.awake -= dt
}

export function drawGrandpa(ctx, game) {
  const g = game.grandpa
  if (!g) return
  const t = game.time
  ctx.save()
  ctx.translate(g.x, GROUND)
  ctx.scale(1.3, 1.3)
  drawDino(ctx, 'bronto', { time: t, blink: g.awake <= 0, roar: g.awake > 5 ? 1 : 0, angry: g.awake > 0 })
  ctx.restore()
  if (g.awake <= 0) text(ctx, 'Zzz', g.x + 40, GROUND - 150 - ((t * 15) % 25), 18, '#c0cbdc')
  else text(ctx, 'GRANDPA DINO', g.x, GROUND - 175, 12, '#c0cbdc')
}
