// EASTER EGGS: secret things hidden on the title screen. They're meant to be tricky!
// Finding one for the first time gives +25 Xenobits and +1 DNA, and the CURRENCY page
// counts how many you've found. (Spoilers below!)
//
//   PARTY TIME   press ↑ ↑ ↓ ↓ ← → ← → B A
//   BIG ROAR     type R O A R, pressing the last R while the hill T. rex is roaring
//   HELLO MOON   tap the moon 7 times in 3 seconds
//   TICKLE REX   tap the T. rex on the hill 10 times in 4 seconds
//   JOKE TIME    tap your own picture until you've heard 5 different jokes
//   DINO RESCUE  tap a UFO while it's beaming up a dino, 3 times
//   WISH UPON    tap a shooting star (one zooms across the sky every half a minute or so)

import { W, H, rrect, text } from './art'
import { PX } from './pixel'
import { sfx } from './sound'
import { REX_X, hillY } from './menus'

export const SECRETS = [
  { id: 'party', name: 'PARTY TIME' },
  { id: 'roar', name: 'BIG ROAR' },
  { id: 'moon', name: 'HELLO MOON' },
  { id: 'tickle', name: 'TICKLE REX' },
  { id: 'joke', name: 'JOKE TIME' },
  { id: 'rescue', name: 'DINO RESCUE' },
  { id: 'star', name: 'WISH UPON A STAR' },
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

// only counts secrets that still exist (old saves may have ones that were taken out)
export const secretsFound = (shop) => SECRETS.filter((x) => (shop.secrets || []).includes(x.id)).length

// You found a secret! The first time it pays out; after that it's just for fun.
export function foundSecret(game, id) {
  const s = SECRETS.find((x) => x.id === id)
  if (!s) return
  game.shop.secrets = game.shop.secrets || []
  if (game.shop.secrets.includes(id)) return
  game.shop.secrets.push(id)
  game.earn(25)
  game.gain('dna', 1)
  game.secretPopup = { name: s.name, n: secretsFound(game.shop), t: 0 }
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
    if (game.title.roar <= 0) {
      // a hint: the T. rex wants to roar WITH you
      game.fx.text(REX_X, hillY(REX_X) - 150, 'rawr...?', '#c0cbdc', 14)
      return
    }
    game.title.roar = 0.8
    game.shake = 16
    game.fx.text(REX_X, hillY(REX_X) - 160, 'ROOOOOAAAAR!', '#ffe14a', 34)
    foundSecret(game, 'roar')
  }
}

// was this tapped n times within the last `secs` seconds?
function taps(game, key, n, secs) {
  const list = (game.secretTaps = game.secretTaps || {})
  list[key] = [...(list[key] || []), game.time].filter((t) => game.time - t < secs)
  if (list[key].length < n) return false
  list[key] = []
  return true
}

// taps on the title screen; returns true if a secret used the tap
export function secretClick(game, p) {
  const st = game.star
  if (st && Math.hypot(p.x - st.x, p.y - st.y) < 45) {
    game.star = null
    game.fx.burst(p.x, p.y, 24, { speed: 260, life: 0.8, size: 6, color: ['#fee761', '#ffffff', '#2ce8f5'], type: 'star' })
    game.fx.text(p.x, p.y + 30, 'MAKE A WISH!', '#fee761', 22)
    foundSecret(game, 'star')
    return true
  }
  // a UFO beaming up a dino: tap it to save the dino!
  for (const u of game.title.ufos) {
    if (u.beam > 0 && u.target && Math.hypot(p.x - u.x, p.y - u.y) < 50) {
      u.target.held = false
      u.target = null
      u.beam = 0
      u.timer = 5
      u.vx = Math.sign(u.vx || 1) * 260
      sfx.stun()
      game.fx.burst(u.x, u.y, 14, { speed: 220, life: 0.5, size: 5, color: ['#2ce8f5', '#ffffff'], type: 'spark' })
      game.fx.text(u.x, u.y - 40, 'DINO SAVED!', '#63c74d', 20)
      game.rescues = (game.rescues || 0) + 1
      if (game.rescues >= 3) foundSecret(game, 'rescue')
      return true
    }
  }
  if (Math.hypot(p.x - MOON.x, p.y - MOON.y) < MOON.r) {
    sfx.click()
    game.fx.burst(p.x, p.y, 6, { speed: 120, life: 0.5, size: 4, color: '#fee761', type: 'star' })
    if (taps(game, 'moon', 7, 3)) {
      game.moonWink = 3
      game.fx.text(MOON.x - 80, MOON.y + 70, `THE MOON SAYS: HI ${game.profile?.name || 'FRIEND'}!`, '#fee761', 18)
      foundSecret(game, 'moon')
    }
    return true
  }
  const ry = hillY(REX_X) - 60
  if (Math.abs(p.x - REX_X) < 70 && Math.abs(p.y - ry) < 70) {
    sfx.squeak()
    const done = taps(game, 'rex', 10, 4)
    game.fx.text(REX_X, ry - 90, done ? 'HA HA HA! STOP IT!' : 'HEE HEE!', '#ffa94d', 20)
    if (done) {
      game.title.roar = 0.8
      foundSecret(game, 'tickle')
    }
    return true
  }
  if (game.profile && Math.abs(p.x - (W - 230)) < 32 && Math.abs(p.y - 31) < 32) {
    game.joke = { text: pick(JOKES.filter((j) => j !== game.joke?.text)), t: 6 }
    game.jokesHeard = game.jokesHeard || new Set()
    game.jokesHeard.add(game.joke.text)
    sfx.select()
    if (game.jokesHeard.size >= 5) foundSecret(game, 'joke')
    return true
  }
  return false
}

export function updateSecrets(game, dt) {
  // now and then a shooting star zooms across the title screen sky
  if (game.scene === 'title') {
    game.starT = (game.starT ?? 20 + Math.random() * 20) - dt
    if (game.starT <= 0) {
      game.starT = 25 + Math.random() * 20
      const dir = Math.random() < 0.5 ? 1 : -1
      game.star = { x: dir > 0 ? -20 : W + 20, y: 40 + Math.random() * 60, vx: dir * (520 + Math.random() * 200), vy: 90, t: 0 }
    }
  }
  const st = game.star
  if (st) {
    st.t += dt
    st.x += st.vx * dt
    st.y += st.vy * dt
    if (st.x < -40 || st.x > W + 40 || game.scene !== 'title') game.star = null
  }
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
  if (game.star) {
    const st = game.star
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i ? `rgba(254,231,97,${0.7 - i * 0.08})` : '#ffffff'
      ctx.fillRect(snap(st.x - st.vx * i * 0.012) - 3, snap(st.y - st.vy * i * 0.012) - 3, i ? 6 : 9, i ? 6 : 9)
    }
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
