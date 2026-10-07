// Screens for typing your name, picking your school year, and setting up a 2-player game.

import { W, H, INK, rrect, text, AVATARS, drawAvatar, drawUFO, drawDino } from './art'
import { COLOURS, HATS, TITLES, UFO_PAINTS, REX_PAINTS, choice, colourOf, titleOf } from './custom'
import { sfx } from './sound'
import { isAdmin, openTest } from './testmode'
import { inside, drawButton, drawTitleWorld, updateTitleWorld, drawWallet } from './menus'
import { itemLevel, evoName } from './shop'
import { checkName, safeName, yearLabel, YEAR_LEVELS, MAX_NAME } from './names'
import { findAccount, accountCount, hashPassword, MAX_ACCOUNTS, deleteAccount } from './save'
import { startSession, cleanCode } from './net'

const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const CODE_ROWS = ['1234567890', ...LETTER_ROWS]

// ---------- on-screen keyboard (for tablets) ----------

function keyboard(rows, specials) {
  const keys = []
  const kw = 52
  const gap = 6
  rows.forEach((row, r) => {
    const total = row.length * (kw + gap) - gap
    ;[...row].forEach((ch, i) => keys.push({ ch, label: ch, x: W / 2 - total / 2 + i * (kw + gap), y: 268 + r * 50, w: kw, h: 44 }))
  })
  const y = 268 + rows.length * 50
  const total = specials.reduce((s, k) => s + k.w + gap, -gap)
  let x = W / 2 - total / 2
  for (const k of specials) {
    keys.push({ ...k, x, y, h: 44 })
    x += k.w + gap
  }
  return keys
}

function nameKeys() {
  return keyboard(LETTER_ROWS, [
    { ch: ' ', label: 'SPACE', w: 160 },
    { ch: 'DEL', label: '◀ DEL', w: 120 },
    { ch: 'OK', label: 'OK ▶', w: 120 },
  ])
}

function codeKeys() {
  return keyboard(CODE_ROWS, [
    { ch: 'DEL', label: '◀ DEL', w: 120 },
    { ch: 'OK', label: 'JOIN ▶', w: 140 },
  ])
}

function drawKeys(ctx, keys, t, game) {
  for (const k of keys) {
    const hover = inside(game.mouse, k)
    rrect(ctx, k.x, k.y + (hover ? -2 : 0), k.w, k.h, 8)
    ctx.fillStyle = k.ch === 'OK' ? '#63c74d' : hover ? '#c0cbdc' : '#8b9bb4'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = INK
    ctx.stroke()
    text(ctx, k.label, k.x + k.w / 2, k.y + 30 + (hover ? -2 : 0), k.label.length > 1 ? 15 : 20, INK, 'center', false)
  }
}

// ---------- profile: name, then year ----------

const YEARS = YEAR_LEVELS.map((y, i) => ({ year: y, x: W / 2 - 380 + (i % 4) * 192, y: 206 + Math.floor(i / 4) * 90, w: 176, h: 70 }))

// mode 'login': type your name (an old player picks up where they left off; a new one picks a year).
// mode 'year': just change your school year.
export function openProfile(game, next, mode = 'login') {
  const step = mode === 'year' ? 'year' : 'name'
  game.prof = { step, mode, name: mode === 'year' ? game.profile.name : '', year: game.profile?.year ?? 3, err: null, next }
  game.goScene('profile')
}

function typeName(game, ch) {
  const pf = game.prof
  pf.err = null
  if (ch === 'DEL') pf.name = pf.name.slice(0, -1)
  else if (ch === 'OK') {
    const err = checkName(pf.name)
    if (err) {
      pf.err = err
      sfx.hurt()
      return
    }
    pf.name = pf.name.trim().toUpperCase()
    const old = findAccount(pf.name)
    pf.acc = old
    pf.pw = ''
    if (isAdmin({ name: pf.name })) {
      // the ADMIN test player doesn't need a password
      pf.passHash = null
      if (old) {
        game.logIn(old)
        openTest(game)
      } else pf.step = 'year'
    } else if (old) {
      // played before: type your password (players from before passwords make one now)
      pf.step = old.pass ? 'pass' : 'newpass'
    } else if (accountCount() >= MAX_ACCOUNTS) {
      pf.err = `This device already has ${MAX_ACCOUNTS} players`
      sfx.hurt()
      return
    } else pf.step = 'newpass'
    sfx.select()
    return
  } else if (pf.name.length < MAX_NAME && !(ch === ' ' && (!pf.name || pf.name.endsWith(' ')))) pf.name += ch
  sfx.click()
}

// Typing a password: letters and numbers, shown as stars.
async function typePass(game, ch) {
  const pf = game.prof
  if (pf.busy) return
  pf.err = null
  if (ch === 'DEL') {
    pf.pw = pf.pw.slice(0, -1)
    sfx.click()
    return
  }
  if (ch !== 'OK') {
    if (pf.pw.length < 12 && ch !== ' ') pf.pw += ch
    sfx.click()
    return
  }
  if (pf.step === 'pass') {
    pf.busy = true
    const hash = await hashPassword(pf.name, pf.pw)
    pf.busy = false
    if (hash === pf.acc.pass) {
      // welcome back! everything about you is remembered
      game.logIn(pf.acc)
      pf.next()
    } else {
      pf.err = 'Wrong password! Try again.'
      pf.pw = ''
      sfx.hurt()
    }
  } else if (pf.step === 'newpass') {
    if (pf.pw.length < 3) {
      pf.err = 'Make it at least 3 letters or numbers'
      sfx.hurt()
      return
    }
    pf.first = pf.pw
    pf.pw = ''
    pf.step = 'confirm'
    sfx.select()
  } else if (pf.step === 'confirm') {
    if (pf.pw !== pf.first) {
      pf.err = "Those didn't match. Make your password again."
      pf.pw = ''
      pf.step = 'newpass'
      sfx.hurt()
      return
    }
    pf.busy = true
    pf.passHash = await hashPassword(pf.name, pf.pw)
    pf.busy = false
    pf.pw = ''
    if (pf.acc) {
      pf.acc.pass = pf.passHash
      game.logIn(pf.acc)
      pf.next()
    } else {
      pf.step = 'year'
      sfx.select()
    }
  }
}

function passKeys() {
  return keyboard(CODE_ROWS, [
    { ch: 'DEL', label: '◀ DEL', w: 120 },
    { ch: 'OK', label: 'OK ▶', w: 120 },
  ])
}

const isPassStep = (s) => s === 'pass' || s === 'newpass' || s === 'confirm'

function pickYear(game, year) {
  const pf = game.prof
  pf.year = year
  if (pf.mode === 'year') {
    game.profile.year = year
    game.persist()
  } else game.newPlayer({ name: pf.name, year }, pf.passHash)
  sfx.capture()
  // logging in as Admin goes straight into Test mode
  if (pf.mode !== 'year' && isAdmin(game.profile)) openTest(game)
  else pf.next()
}

// ---------- 2 players ----------

const MP_BUTTONS = {
  choose: [
    { id: 'host', label: 'HOST A GAME', color: '#63c74d', x: W / 2 - 160, y: 176, w: 320, h: 56 },
    { id: 'join', label: 'JOIN A GAME', color: '#6bb8ff', x: W / 2 - 160, y: 246, w: 320, h: 56 },
    { id: 'back', label: '◀  BACK', color: '#ffe14a', x: W / 2 - 110, y: 330, w: 220, h: 48, size: 20 },
  ],
  mode: [
    { id: 'versus', label: 'VERSUS', color: '#fee761', x: W / 2 - 270, y: 200, w: 250, h: 90, size: 30 },
    { id: 'team', label: 'TEAM UP', color: '#f77622', x: W / 2 + 20, y: 200, w: 250, h: 90, size: 30 },
    { id: 'back', label: '◀  BACK', color: '#ffe14a', x: W / 2 - 110, y: 330, w: 220, h: 48, size: 20 },
  ],
  side: [
    { id: 'aliens', label: 'ALIENS', color: '#7dffb0', x: W / 2 - 270, y: 200, w: 250, h: 90, size: 30 },
    { id: 'dinos', label: 'DINOS', color: '#ffa94d', x: W / 2 + 20, y: 200, w: 250, h: 90, size: 30 },
    { id: 'back', label: '◀  BACK', color: '#ffe14a', x: W / 2 - 110, y: 330, w: 220, h: 48, size: 20 },
  ],
  wait: [{ id: 'back', label: '◀  BACK', color: '#ffe14a', x: W / 2 - 110, y: 440, w: 220, h: 48, size: 20 }],
  lobby: [
    { id: 'start', label: '▶  START!', color: '#63c74d', x: W / 2 - 140, y: 380, w: 280, h: 56 },
    { id: 'back', label: '◀  LEAVE', color: '#ffe14a', x: W / 2 - 100, y: 452, w: 200, h: 44, size: 18 },
  ],
  code: [],
}

export function openMultiplayer(game) {
  game.mp = { step: 'choose', sel: 0, code: '', session: null, err: null, t: 0 }
  game.goScene('mp')
}

function mpButtons(game) {
  const list = MP_BUTTONS[game.mp.step]
  return game.mp.step === 'lobby' && game.mp.session?.role !== 'host' ? list.filter((b) => b.id !== 'start') : list
}

function mpBack(game) {
  const mp = game.mp
  if (mp.session) {
    mp.session.close()
    mp.session = null
  }
  mp.err = null
  if (mp.step === 'choose') game.goTitle()
  else {
    mp.step = 'choose'
    mp.sel = 0
  }
}

function mpPress(game, id) {
  const mp = game.mp
  sfx.click()
  if (id === 'back') return mpBack(game)
  if (id === 'host') {
    mp.step = 'mode'
    mp.sel = 0
  } else if (id === 'versus' || id === 'team') {
    mp.mode = id
    mp.step = 'side'
    mp.sel = 0
  } else if (id === 'join') {
    mp.step = 'code'
    mp.code = ''
    mp.err = null
  } else if (id === 'aliens' || id === 'dinos') {
    mp.side = id
    mp.session = startSession('host')
    mp.step = 'wait'
    mp.t = 0
  } else if (id === 'start') {
    game.startVersus('host', mp.side, mp.session, null, mp.mode)
  }
}

function typeCode(game, ch) {
  const mp = game.mp
  mp.err = null
  if (ch === 'DEL') mp.code = mp.code.slice(0, -1)
  else if (ch === 'OK') {
    if (mp.code.length < 4) {
      mp.err = 'Room codes have 4 letters or numbers'
      sfx.hurt()
      return
    }
    mp.session = startSession('guest', mp.code)
    mp.step = 'wait'
    mp.t = 0
  } else if (ch !== ' ') mp.code = cleanCode(mp.code + ch)
  sfx.click()
}

// What this player tells the other while setting up.
function lobbyState(game) {
  const mp = game.mp
  return { role: mp.session.role, name: game.profile.name, year: game.profile.year, pic: game.profile.pic || 'rex', color: game.profile.color || '', hat: game.profile.hat || '', title: game.profile.title || '', ufo: game.profile.ufo || '', rex: game.profile.rex || '', evo: mp.side ? itemLevel(game.shop, mp.side, 'evo') : 0, side: mp.side || '', mode: mp.mode || 'versus', ph: 'lobby' }
}

// ---------- shared hooks the game calls ----------

// Typing on a real keyboard. Returns true when the key was used here.
export function lobbyKey(game, e) {
  const typing = game.scene === 'profile' ? game.prof.step : game.scene === 'mp' && game.mp.step === 'code' ? 'code' : null
  if (!typing) return false
  const c = e.code
  if (typing === 'year') {
    const m = c.match(/^(?:Digit|Numpad)([0-7])$/)
    if (m) {
      pickYear(game, Number(m[1]))
      return true
    }
    return false
  }
  const fn = typing === 'name' ? typeName : isPassStep(typing) ? typePass : typeCode
  if (c === 'Backspace') fn(game, 'DEL')
  else if (c === 'Enter' || c === 'NumpadEnter') fn(game, 'OK')
  else if (c === 'Space' && typing === 'name') fn(game, ' ')
  else if (/^Key[A-Z]$/.test(c)) fn(game, c.slice(3))
  else if (/^(?:Digit|Numpad)[0-9]$/.test(c) && typing !== 'name') fn(game, c.slice(-1))
  else return false
  return true
}

export function updateLobby(game, dt) {
  updateTitleWorld(game, dt)
  const k = game.pressed
  if (game.scene === 'account') return updateAccount(game)
  if (game.scene === 'profile') {
    const pf = game.prof
    if (k.has('pause')) {
      if ((pf.step === 'year' || isPassStep(pf.step)) && pf.mode === 'login') {
        pf.step = 'name'
        pf.pw = ''
      }
      else if (pf.mode === 'year') pf.next()
      else game.goTitle()
    }
    if (pf.step === 'year') {
      if (k.has('left')) pf.year = Math.max(0, pf.year - 1)
      if (k.has('right')) pf.year = Math.min(7, pf.year + 1)
      if (k.has('up')) pf.year = Math.max(0, pf.year - 4)
      if (k.has('down')) pf.year = Math.min(7, pf.year + 4)
      if (k.has('enter') || k.has('action')) pickYear(game, pf.year)
    }
    return
  }
  const mp = game.mp
  mp.t += dt
  if (k.has('pause')) return mpBack(game)
  const btns = mpButtons(game)
  if (btns.length) {
    if (k.has('up') || k.has('left')) mp.sel = (mp.sel + btns.length - 1) % btns.length
    if (k.has('down') || k.has('right')) mp.sel = (mp.sel + 1) % btns.length
    if (game.mouseMoved) {
      const h = btns.findIndex((b) => inside(game.mouse, b))
      if (h >= 0) mp.sel = h
    }
    mp.sel = Math.min(mp.sel, btns.length - 1)
    if (k.has('enter') || k.has('action')) mpPress(game, btns[mp.sel].id)
  }
  const s = mp.session
  if (!s || game.mp.step === 'choose') return
  if (s.error) {
    mp.err = s.error
    s.close()
    mp.session = null
    mp.step = 'choose'
    return
  }
  if (s.ready) s.mine(lobbyState(game))
  const them = s.theirs()
  if (mp.step === 'wait' && them) {
    if (s.role === 'guest' && !them.side) return
    if (s.role === 'guest') mp.side = them.side === 'aliens' ? 'dinos' : 'aliens'
    if (s.role === 'guest') mp.mode = them.mode === 'team' ? 'team' : 'versus'
    mp.step = 'lobby'
    mp.sel = 0
    sfx.select()
  }
  if (mp.step === 'wait' && s.role === 'guest' && mp.t > 20) {
    mp.err = "Couldn't find that room. Check the code and try again."
    s.close()
    mp.session = null
    mp.step = 'code'
  }
  if (mp.step === 'lobby') {
    mp.them = them || mp.them
    if (!them) {
      mp.lost = (mp.lost || 0) + dt
      if (mp.lost > 5) {
        mp.err = 'Your friend left.'
        s.close()
        mp.session = null
        mp.step = 'choose'
      }
    } else mp.lost = 0
    if (s.role === 'guest' && them?.ph === 'play') game.startVersus('guest', mp.side, s, them, them.mode === 'team' ? 'team' : 'versus')
  }
}

export function clickLobby(game, p) {
  if (game.scene === 'account') {
    const b = accountButtons(game).find((x) => inside(p, x))
    if (b) accountPress(game, b.id)
    return
  }
  if (game.scene === 'profile') {
    const pf = game.prof
    if (pf.step === 'name') {
      const key = nameKeys().find((k) => inside(p, k))
      if (key) typeName(game, key.ch)
    } else if (isPassStep(pf.step)) {
      const key = passKeys().find((k) => inside(p, k))
      if (key) typePass(game, key.ch)
    } else {
      const y = YEARS.find((b) => inside(p, b))
      if (y) pickYear(game, y.year)
    }
    return
  }
  const mp = game.mp
  if (mp.step === 'code') {
    const key = codeKeys().find((k) => inside(p, k))
    if (key) typeCode(game, key.ch)
    if (inside(p, { x: 20, y: 20, w: 120, h: 44 })) mpBack(game)
    return
  }
  const b = mpButtons(game).find((x) => inside(p, x))
  if (b) mpPress(game, b.id)
}

export function drawLobby(game, ctx) {
  const t = game.time
  drawTitleWorld(game, ctx)
  ctx.fillStyle = 'rgba(15,10,40,0.72)'
  ctx.fillRect(0, 0, W, H)
  if (game.scene === 'account') return drawAccount(game, ctx)
  if (game.scene === 'profile') {
    const pf = game.prof
    if (pf.step === 'name') {
      text(ctx, "WHAT'S YOUR NAME?", W / 2, 90, 34, '#fee761')
      text(ctx, 'Played before? Type the same name, then your password', W / 2, 118, 13, '#c0cbdc')
      rrect(ctx, W / 2 - 220, 130, 440, 64, 12)
      ctx.fillStyle = '#181425'
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#fee761'
      ctx.stroke()
      const cursor = Math.floor(t * 2) % 2 ? '_' : ' '
      text(ctx, pf.name + cursor, W / 2, 176, 34, '#ffffff')
      text(ctx, pf.err || 'Type your name, then press OK', W / 2, 232, 15, pf.err ? '#ff8fa0' : '#c0cbdc')
      drawKeys(ctx, nameKeys(), t, game)
    } else if (isPassStep(pf.step)) {
      const title = { pass: `HI ${pf.name}! TYPE YOUR PASSWORD`, newpass: `MAKE A PASSWORD, ${pf.name}`, confirm: 'TYPE YOUR PASSWORD AGAIN' }[pf.step]
      text(ctx, title, W / 2, 90, 28, '#fee761')
      text(ctx, pf.step === 'pass' ? 'Press Esc to go back' : "3 to 12 letters or numbers. Don't tell anyone!", W / 2, 118, 13, '#c0cbdc')
      rrect(ctx, W / 2 - 220, 130, 440, 64, 12)
      ctx.fillStyle = '#181425'
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = '#fee761'
      ctx.stroke()
      const cursor = Math.floor(t * 2) % 2 ? '_' : ' '
      text(ctx, '★'.repeat(pf.pw.length) + cursor, W / 2, 176, 30, '#ffffff')
      text(ctx, pf.err || (pf.step === 'pass' ? 'Forgot it? Make a new player with a different name.' : 'Type it, then press OK'), W / 2, 232, 15, pf.err ? '#ff8fa0' : '#c0cbdc')
      drawKeys(ctx, passKeys(), t, game)
    } else {
      text(ctx, pf.mode === 'year' ? pf.name : `HI ${pf.name}!`, W / 2, 96, 34, '#fee761')
      text(ctx, 'WHAT YEAR ARE YOU IN AT SCHOOL?', W / 2, 150, 22, '#ffffff')
      text(ctx, 'Your math and spelling will match your year', W / 2, 182, 14, '#c0cbdc')
      for (const b of YEARS) {
        const sel = pf.year === b.year
        drawButton(ctx, { ...b, label: yearLabel(b.year), color: sel ? '#fee761' : '#8b9bb4', size: 22 }, sel || inside(game.mouse, b), t)
      }
      text(ctx, 'PREP = below Year 1    ·    YEAR 7+ = above Year 6', W / 2, 410, 14, '#c0cbdc')
      text(ctx, 'Tap your year, or press 0-7', W / 2, 440, 15, '#c0cbdc')
    }
    return
  }
  const mp = game.mp
  text(ctx, '2 PLAYERS', W / 2, 80, 40, '#63c74d')
  if (mp.step === 'choose') {
    text(ctx, 'Play with a friend! One of you is the UFO, one is the T. rex.', W / 2, 128, 15, '#c0cbdc')
    text(ctx, 'Both players need this game open on their own screen.', W / 2, 420, 14, '#c0cbdc')
  } else if (mp.step === 'mode') {
    text(ctx, 'WHAT DO YOU WANT TO PLAY?', W / 2, 150, 22, '#ffffff')
    text(ctx, 'VERSUS: fight each other.   TEAM UP: beat the volcano boss together!', W / 2, 180, 14, '#c0cbdc')
  } else if (mp.step === 'side') {
    text(ctx, 'WHICH SIDE DO YOU WANT TO BE?', W / 2, 150, 22, '#ffffff')
    text(ctx, 'Your friend gets the other side', W / 2, 180, 14, '#c0cbdc')
  } else if (mp.step === 'code') {
    text(ctx, "TYPE YOUR FRIEND'S ROOM CODE", W / 2, 128, 22, '#ffffff')
    for (let i = 0; i < 4; i++) {
      rrect(ctx, W / 2 - 130 + i * 66, 150, 56, 64, 10)
      ctx.fillStyle = '#181425'
      ctx.fill()
      ctx.lineWidth = 4
      ctx.strokeStyle = i === mp.code.length ? '#fee761' : '#5a6988'
      ctx.stroke()
      text(ctx, mp.code[i] || '', W / 2 - 102 + i * 66, 196, 34, '#ffffff')
    }
    drawKeys(ctx, codeKeys(), t, game)
    drawButton(ctx, { label: '◀ BACK', color: '#ffe14a', x: 20, y: 20, w: 120, h: 44, size: 16 }, inside(game.mouse, { x: 20, y: 20, w: 120, h: 44 }), t)
  } else if (mp.step === 'wait') {
    if (mp.session?.role === 'host') {
      text(ctx, 'YOUR ROOM CODE IS', W / 2, 150, 22, '#ffffff')
      text(ctx, mp.session.ready ? mp.session.code : '....', W / 2, 250, 90, '#fee761')
      text(ctx, 'Tell your friend to press 2 PLAYERS, then JOIN A GAME, and type this code.', W / 2, 310, 15, '#c0cbdc')
      text(ctx, `Waiting for a friend${'.'.repeat(1 + (Math.floor(t * 2) % 3))}`, W / 2, 370, 20, '#ffffff')
    } else {
      text(ctx, `Joining room ${mp.code}${'.'.repeat(1 + (Math.floor(t * 2) % 3))}`, W / 2, 250, 26, '#ffffff')
    }
  } else if (mp.step === 'lobby') {
    const them = mp.them || {}
    const me = { name: game.profile.name, year: game.profile.year }
    const other = mp.side === 'aliens' ? 'dinos' : 'aliens'
    const line = (side, who) => `${side === 'aliens' ? 'ALIENS' : 'DINOS'} ${safeName(who.name)} ${yearLabel(Number(who.year) || 0)}`.toUpperCase()
    const aliens = mp.side === 'aliens' ? me : them
    const dinos = mp.side === 'dinos' ? me : them
    const pics = AVATARS.map((x) => x.id)
    const picOf = (who) => (pics.includes(who.pic) ? who.pic : 'rex')
    const alienP = mp.side === 'aliens' ? game.profile : them
    const dinoP = mp.side === 'dinos' ? game.profile : them
    drawAvatar(ctx, picOf(alienP), 110, 178, false, lookOf(alienP))
    drawAvatar(ctx, picOf(dinoP), 110, 280, false, lookOf(dinoP))
    if (titleOf(alienP)) text(ctx, titleOf(alienP), W / 2, 212, 12, '#c0cbdc')
    if (titleOf(dinoP)) text(ctx, titleOf(dinoP), W / 2, 314, 12, '#c0cbdc')
    text(ctx, line('aliens', aliens), W / 2, 190, 32, '#7dffb0')
    text(ctx, mp.mode === 'team' ? '+' : 'VS', W / 2, 240, 28, '#fee761')
    text(ctx, line('dinos', dinos), W / 2, 292, 32, '#ffa94d')
    text(ctx, mp.mode === 'team' ? 'TEAM UP: BEAT THE VOLCANO BOSS TOGETHER!' : 'VERSUS: WHO WILL WIN?', W / 2, 138, 18, mp.mode === 'team' ? '#f77622' : '#fee761')
    text(ctx, `You are the ${mp.side === 'aliens' ? 'UFO' : 'T. REX'}!  Your friend is the ${other === 'aliens' ? 'UFO' : 'T. REX'}.`, W / 2, 336, 15, '#c0cbdc')
    if (mp.session?.role !== 'host') text(ctx, `Waiting for ${safeName(them.name)} to start${'.'.repeat(1 + (Math.floor(t * 2) % 3))}`, W / 2, 404, 18, '#ffffff')
  }
  for (const [i, b] of mpButtons(game).entries()) drawButton(ctx, b, mp.sel === i, t)
  if (mp.err) text(ctx, mp.err, W / 2, mp.step === 'code' ? 244 : 516, 16, '#ff8fa0')
}

// ---------- My Profile: picture, colour, hat, title, paint jobs, school year, delete account ----------

const FIELDS = {
  pic: { title: 'PICK YOUR PICTURE', hint: 'Tap a dino or an alien', list: AVATARS },
  color: { title: 'FAVOURITE COLOUR', hint: 'For your name and your picture frame', list: COLOURS },
  hat: { title: 'PICK A HAT', hint: 'It sits on your profile picture', list: HATS },
  title: { title: 'PICK A TITLE', hint: 'It shows under your name', list: TITLES },
  ufo: { title: 'UFO PAINT', hint: 'Your UFO when you play as the aliens', list: UFO_PAINTS },
  rex: { title: 'T. REX PAINT', hint: 'Your T. rex when you play as the dinos', list: REX_PAINTS },
}

const MAIN_ITEMS = [
  ['pic', 'PICTURE', '#63c74d'],
  ['color', 'COLOUR', '#fee761'],
  ['hat', 'HAT', '#f6757a'],
  ['title', 'TITLE', '#2ce8f5'],
  ['ufo', 'UFO PAINT', '#8b9bb4'],
  ['rex', 'T. REX PAINT', '#63c74d'],
  ['year', 'SCHOOL YEAR', '#6bb8ff'],
  ['del', 'DELETE ACCOUNT', '#e43b44'],
]

// how your picture looks: frame colour and hat
export const lookOf = (p) => ({ color: colourOf(p), hat: choice(HATS, p?.hat) })

function pickerTiles(field) {
  const list = FIELDS[field].list
  const rows = Math.ceil(list.length / 4)
  const h = rows > 2 ? 96 : 136
  const gap = rows > 2 ? 10 : 14
  return list.map((opt, i) => ({ id: `set:${field}:${opt.id}`, opt, field, x: W / 2 - 330 + (i % 4) * 170, y: 128 + Math.floor(i / 4) * (h + gap), w: 150, h }))
}

export function openAccount(game) {
  game.acct = { step: 'main', sel: 0 }
  game.goScene('account')
}

function accountButtons(game) {
  const step = game.acct.step
  if (step === 'main')
    return [
      ...MAIN_ITEMS.map(([id, label, color], i) => ({ id, label, color, x: i % 2 ? W / 2 + 185 : W / 2 - 25, y: 116 + Math.floor(i / 2) * 58, w: 200, h: 48, size: 15 })),
      { id: 'back', label: '◀  BACK', color: '#ffe14a', x: W / 2 - 110, y: 440, w: 220, h: 48, size: 20 },
    ]
  if (step === 'pick') return [...pickerTiles(game.acct.field), { id: 'main', label: '◀  DONE', color: '#ffe14a', x: W / 2 - 110, y: 470, w: 220, h: 46, size: 20 }]
  if (step === 'del1')
    return [
      { id: 'main', label: 'NO, KEEP IT', color: '#63c74d', x: W / 2 - 300, y: 330, w: 280, h: 60, size: 22 },
      { id: 'del2', label: 'YES, DELETE', color: '#e43b44', x: W / 2 + 20, y: 330, w: 280, h: 60, size: 22 },
    ]
  return [
    { id: 'main', label: 'NO! KEEP IT', color: '#63c74d', x: W / 2 - 300, y: 330, w: 280, h: 60, size: 22 },
    { id: 'gone', label: 'DELETE FOREVER', color: '#e43b44', x: W / 2 + 20, y: 330, w: 280, h: 60, size: 20 },
  ]
}

function accountPress(game, id) {
  const a = game.acct
  if (id.startsWith('set:')) {
    const [, field, value] = id.split(':')
    game.profile[field] = value
    game.persist()
    sfx.capture()
    return
  }
  sfx.click()
  if (id === 'back') game.goScene('settings')
  else if (id === 'year') openProfile(game, () => openAccount(game), 'year')
  else if (FIELDS[id]) {
    a.step = 'pick'
    a.field = id
    a.sel = 0
  } else if (id === 'main' || id === 'del2') {
    a.step = id
    a.sel = 0
    if (id === 'del2') sfx.warn()
  } else if (id === 'del') {
    a.step = 'del1'
    a.sel = 0
    sfx.warn()
  } else if (id === 'gone') {
    const name = game.profile.name
    deleteAccount(name)
    game.useAccount(null)
    game.goTitle()
    game.toast = { text: `${name}'S ACCOUNT WAS DELETED`, t: 3 }
    sfx.boom()
  }
}

function updateAccount(game) {
  const a = game.acct
  const k = game.pressed
  if (!game.profile) return game.goTitle()
  if (k.has('pause')) {
    if (a.step === 'main') game.goScene('settings')
    else a.step = 'main'
    return
  }
  const btns = accountButtons(game)
  if (k.has('up') || k.has('left')) a.sel = (a.sel + btns.length - 1) % btns.length
  if (k.has('down') || k.has('right')) a.sel = (a.sel + 1) % btns.length
  if (game.mouseMoved) {
    const h = btns.findIndex((b) => inside(game.mouse, b))
    if (h >= 0) a.sel = h
  }
  a.sel = Math.min(a.sel, btns.length - 1)
  if (k.has('enter') || k.has('action')) accountPress(game, btns[a.sel].id)
}

function drawTile(ctx, game, b, selected) {
  const p = game.profile
  const t = game.time
  const { field, opt } = b
  const on = choice(FIELDS[field].list, p[field]) === opt.id
  rrect(ctx, b.x, b.y, b.w, b.h, 16)
  ctx.fillStyle = on ? '#3a4466' : selected ? '#262b44' : '#181425'
  ctx.fill()
  ctx.lineWidth = on ? 5 : 2
  ctx.strokeStyle = on ? colourOf(p) : 'rgba(255,255,255,0.3)'
  ctx.stroke()
  const cx = b.x + b.w / 2
  const look = lookOf(p)
  if (field === 'pic') drawAvatar(ctx, opt.id, cx, b.y + 60, false, look)
  else if (field === 'color') drawAvatar(ctx, p.pic, cx, b.y + 50, false, { ...look, color: opt.hex })
  else if (field === 'hat') drawAvatar(ctx, p.pic, cx, b.y + 56, false, { ...look, hat: opt.id })
  else if (field === 'title') text(ctx, opt.name, cx, b.y + b.h / 2 + 6, 14, colourOf(p))
  else if (field === 'ufo') {
    ctx.save()
    ctx.translate(cx, b.y + 58)
    drawUFO(ctx, { time: t, tint: opt.id, mood: 'happy' })
    ctx.restore()
  } else if (field === 'rex') {
    ctx.save()
    ctx.translate(cx, b.y + 98)
    ctx.scale(-1, 1)
    drawDino(ctx, 'rex', { time: t, skin: opt.id })
    ctx.restore()
  }
  if (field !== 'title') text(ctx, opt.name, cx, b.y + b.h - 12, 12, '#ffffff')
}

function drawAccount(game, ctx) {
  const t = game.time
  const a = game.acct
  const p = game.profile
  if (!p) return
  const btns = accountButtons(game)
  if (a.step === 'main') {
    text(ctx, 'MY PROFILE', W / 2, 70, 40, '#fee761')
    drawAvatar(ctx, p.pic, W / 2 - 250, 210, true, lookOf(p))
    text(ctx, p.name, W / 2 - 250, 316, 28, colourOf(p))
    if (titleOf(p)) text(ctx, titleOf(p), W / 2 - 250, 342, 15, '#ffffff')
    text(ctx, yearLabel(p.year), W / 2 - 250, 366, 15, '#c0cbdc')
    drawWallet(ctx, game.shop, W / 2, 400, 15)
    text(ctx, `UFO: ${evoName('aliens', itemLevel(game.shop, 'aliens', 'evo'))}  ·  T. REX: ${evoName('dinos', itemLevel(game.shop, 'dinos', 'evo'))}  ·  BEST: ALIENS ${game.best.aliens || 0} · DINOS ${game.best.dinos || 0}`, W / 2, 422, 12, '#c0cbdc')
  } else if (a.step === 'pick') {
    text(ctx, FIELDS[a.field].title, W / 2, 76, 34, '#fee761')
    text(ctx, FIELDS[a.field].hint, W / 2, 106, 14, '#c0cbdc')
  } else if (a.step === 'del1') {
    text(ctx, '⚠ WARNING ⚠', W / 2, 120, 40, '#e43b44')
    text(ctx, `DELETE ${p.name}'S ACCOUNT?`, W / 2, 180, 28, '#ffffff')
    text(ctx, 'All your Xenobits, Cells, Shards, DNA, upgrades and scores will be gone.', W / 2, 230, 16, '#c0cbdc')
    text(ctx, 'Your name and password will be forgotten too.', W / 2, 258, 16, '#c0cbdc')
  } else {
    const flash = Math.floor(t * 4) % 2 ? '#e43b44' : '#fee761'
    text(ctx, '⚠ LAST WARNING! ⚠', W / 2, 120, 40, flash)
    text(ctx, 'ARE YOU REALLY, REALLY SURE?', W / 2, 180, 28, '#ffffff')
    text(ctx, 'This can NOT be undone. Your game will be gone forever!', W / 2, 230, 16, '#ff8fa0')
  }
  for (const [i, b] of btns.entries()) {
    if (b.opt) drawTile(ctx, game, b, a.sel === i || inside(game.mouse, b))
    else drawButton(ctx, b, a.sel === i, t)
  }
}
