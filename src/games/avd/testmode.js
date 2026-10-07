// TEST MODE: log in to the game with the name "Admin" to get the test menu and test keys.
// Handy for trying things out quickly without playing all the way through.
//
// While playing in test mode:  N = skip to the next wave,  B = jump to the volcano boss,
//                              K = volcano down to 1 health,  G = god mode on/off

import { W, H, text } from './art'
import { sfx } from './sound'
import { SHOP_ITEMS, CURRENCY_ORDER } from './shop'
import { SECRETS } from './secrets'
import { inside, drawButton, drawTitleWorld, updateTitleWorld } from './menus'

export const isAdmin = (profile) => (profile?.name || '').trim().toUpperCase() === 'ADMIN'

const ROWS = [
  { id: 'god', label: (g) => `GOD MODE (NO DAMAGE): ${g.test.god ? 'ON' : 'OFF'}` },
  { id: 'auto', label: (g) => `AUTO-ANSWER QUIZZES: ${g.test.auto ? 'ON' : 'OFF'}` },
  { id: 'rich', label: () => '+1000 OF EVERY CURRENCY' },
  { id: 'maxall', label: () => 'UNLOCK ALL UPGRADES + EVOLUTIONS' },
  { id: 'reset', label: () => 'RESET MONEY + UPGRADES TO ZERO' },
  { id: 'eggs', label: () => 'FIND ALL EASTER EGGS' },
  { id: 'noeggs', label: () => 'HIDE ALL EASTER EGGS AGAIN' },
  { id: 'afk', label: () => 'SHOW THE AFK WARNING' },
  { id: 'back', label: () => '◀  BACK TO THE GAME' },
]
const row = (i) => ({ x: W / 2 - 250, y: 104 + i * 44, w: 500, h: 38, size: 15 })

export function openTest(game) {
  game.test = game.test || { god: false, auto: false }
  game.testSel = 0
  game.goScene('test')
  game.toast = { text: 'HI ADMIN! TEST MODE IS ON', t: 2.5 }
}

function press(game, id) {
  const shop = game.shop
  const say = (msg) => (game.toast = { text: msg, t: 2 })
  sfx.select()
  if (id === 'back') return game.goTitle()
  if (id === 'god') game.test.god = !game.test.god
  else if (id === 'auto') game.test.auto = !game.test.auto
  else if (id === 'rich') {
    for (const k of CURRENCY_ORDER) shop[k] = (shop[k] || 0) + 1000
    say('+1000 OF EVERYTHING!')
  } else if (id === 'maxall') {
    for (const list of Object.values(SHOP_ITEMS)) for (const it of list) shop.owned[`${it.side}.${it.key}`] = it.costs.length
    say('EVERYTHING UNLOCKED!')
  } else if (id === 'reset') {
    for (const k of CURRENCY_ORDER) shop[k] = 0
    shop.owned = {}
    say('BACK TO ZERO')
  } else if (id === 'eggs') {
    shop.secrets = SECRETS.map((s) => s.id)
    say(`ALL ${SECRETS.length} EASTER EGGS FOUND`)
  } else if (id === 'noeggs') {
    shop.secrets = []
    say('EASTER EGGS HIDDEN AGAIN')
  } else if (id === 'afk') {
    game.afk = { t: 0 }
  }
  game.persist()
}

export function updateTest(game, dt) {
  updateTitleWorld(game, dt)
  const k = game.pressed
  if (k.has('up')) game.testSel = (game.testSel + ROWS.length - 1) % ROWS.length
  if (k.has('down')) game.testSel = (game.testSel + 1) % ROWS.length
  if (k.has('up') || k.has('down')) sfx.click()
  if (game.mouseMoved) {
    const h = ROWS.findIndex((_, i) => inside(game.mouse, row(i)))
    if (h >= 0) game.testSel = h
  }
  if (k.has('enter') || k.has('action')) press(game, ROWS[game.testSel].id)
  if (k.has('pause')) game.goTitle()
}

export function clickTest(game, p) {
  const i = ROWS.findIndex((_, k) => inside(p, row(k)))
  if (i >= 0) press(game, ROWS[i].id)
}

export function drawTest(game, ctx) {
  drawTitleWorld(game, ctx)
  ctx.fillStyle = 'rgba(15,10,40,0.78)'
  ctx.fillRect(0, 0, W, H)
  text(ctx, '★ TEST MODE ★', W / 2, 50, 32, '#f77622')
  text(ctx, 'Only the ADMIN player sees this.  In a game: N = next wave · B = boss · K = boss to 1 HP · G = god mode', W / 2, 80, 12, '#c0cbdc')
  ROWS.forEach((r, i) => {
    const on = (r.id === 'god' && game.test.god) || (r.id === 'auto' && game.test.auto)
    drawButton(ctx, { ...row(i), label: r.label(game), color: r.id === 'back' ? '#ffe14a' : on ? '#63c74d' : '#8b9bb4' }, game.testSel === i, game.time)
  })
}

// test keys while playing; returns true if the key was used
export function testKey(game, code) {
  if (!isAdmin(game.profile) || game.scene !== 'play' || game.ending || (game.quiz && !game.quiz.doneT)) return false
  game.test = game.test || { god: false, auto: false }
  if (code === 'KeyG') {
    game.test.god = !game.test.god
    game.toast = { text: `GOD MODE ${game.test.god ? 'ON' : 'OFF'}`, t: 1.5 }
  } else if (code === 'KeyN' || code === 'KeyB') {
    if (game.boss) return true
    if (code === 'KeyB') game.wave = Math.max(game.wave, 5)
    game.quiz = null
    if (game.side === 'aliens') game.captured = game.goal
    else game.waveTime = 0.001
    game.toast = { text: code === 'KeyB' ? 'TEST: TO THE BOSS!' : 'TEST: NEXT WAVE', t: 1.5 }
  } else if (code === 'KeyK') {
    if (game.boss && !game.boss.dead) game.boss.hp = 1
  } else return false
  sfx.click()
  return true
}
