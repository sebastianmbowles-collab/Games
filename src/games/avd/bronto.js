// BRONTO BUDDY (Dinos mode): a big friendly brontosaurus walks along behind your T. rex.
// When something is about to hurt you or grab you (a sniper laser, a lava ball, a meteor, a
// UFO beam...) it swings its long neck over you as a SHIELD and blocks it. Then it needs
// 10 seconds to get its neck ready again.

import { GROUND, WORLD, text, drawDino } from './art'
import { PX } from './pixel'
import { sfx } from './sound'

const COOLDOWN = 10
const TAN = '#e4a672' // the same colours as the bronto sprite
const BROWN = '#b86f50'
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const snap = (v) => Math.round(v / PX) * PX

export function startBronto(game) {
  game.bronto = game.side === 'dinos' ? { x: game.rex.x - 160, face: 1, walk: 0, cd: 0, block: 0, vx: 0 } : null
}

export function updateBronto(game, dt) {
  const b = game.bronto
  if (!b) return
  const r = game.rex
  b.cd = Math.max(0, b.cd - dt)
  b.block = Math.max(0, b.block - dt)
  // stay a little behind you (or right next to you while blocking)
  const tx = clamp(b.block > 0 ? r.x - r.face * 60 : r.x - r.face * 150, 60, WORLD - 60)
  const want = clamp((tx - b.x) * 3, -330, 330)
  b.vx += (want - b.vx) * Math.min(1, dt * 6)
  b.x += b.vx * dt
  b.walk += Math.abs(b.vx) * dt * 0.06
  if (b.block > 0) b.face = Math.sign(r.x - b.x) || b.face
  else if (Math.abs(b.vx) > 20) b.face = Math.sign(b.vx)
}

export const brontoReady = (game) => !!game.bronto && game.bronto.cd <= 0

// Something is about to hurt the T. rex: the bronto blocks it if its neck is ready.
// Returns true if it was blocked.
export function brontoBlock(game, what = 'BLOCKED!') {
  const b = game.bronto
  if (!b || b.cd > 0 || game.ending) return false
  const r = game.rex
  b.cd = COOLDOWN
  b.block = 1.2
  b.x = clamp(r.x - r.face * 70, 60, WORLD - 60)
  r.inv = Math.max(r.inv, 1)
  sfx.boing()
  sfx.capture()
  game.shake = Math.max(game.shake, 6)
  game.fx.text(r.x, r.y - 175, `NECK SHIELD! ${what}`, '#63c74d', 22)
  game.fx.burst(r.x, r.y - 120, 18, { speed: 240, life: 0.5, size: 6, color: ['#63c74d', '#c8ff9a', '#ffffff'], type: 'star' })
  return true
}

export function drawBronto(ctx, game) {
  const b = game.bronto
  if (!b) return
  const t = game.time
  ctx.save()
  ctx.translate(b.x, GROUND)
  ctx.scale(b.face * 1.35, 1.35)
  drawDino(ctx, 'bronto', { time: t, walk: b.walk, moving: Math.abs(b.vx) > 20, blink: t % 4.3 < 0.12, roar: b.block > 0 ? 1 : 0 })
  ctx.restore()
  if (b.block > 0) {
    // the long neck arches right over the T. rex like an umbrella
    const r = game.rex
    const x0 = b.x
    const x1 = r.x + r.face * 50
    const top = r.y - 150
    for (let i = 0; i <= 24; i++) {
      const k = i / 24
      const x = x0 + (x1 - x0) * k
      const y = GROUND - 120 + (top - (GROUND - 120)) * Math.sin(k * Math.PI * 0.9)
      ctx.fillStyle = '#181425'
      ctx.fillRect(snap(x) - 15, snap(y) - 15, 30, 30)
      ctx.fillStyle = i % 5 === 0 ? BROWN : TAN
      ctx.fillRect(snap(x) - 12, snap(y) - 12, 24, 24)
    }
    // the head, with a big determined eye
    const hx = snap(x1)
    const hy = snap(GROUND - 120 + (top - (GROUND - 120)) * Math.sin(Math.PI * 0.9))
    ctx.fillStyle = '#181425'
    ctx.fillRect(hx - 21, hy - 18, 42, 33)
    ctx.fillStyle = TAN
    ctx.fillRect(hx - 18, hy - 15, 36, 27)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(hx - 3, hy - 12, 9, 9)
    ctx.fillStyle = '#181425'
    ctx.fillRect(hx, hy - 9, 6, 6)
  }
  text(ctx, b.cd > 0 ? '' : 'BRONTO', b.x, GROUND - 175, 11, '#c8ff9a')
}

// a little line on the HUD: is the neck shield ready?
export function drawBrontoHUD(ctx, game, y) {
  const b = game.bronto
  if (!b) return
  text(ctx, b.cd > 0 ? `NECK SHIELD ${Math.ceil(b.cd)}S` : 'NECK SHIELD READY', 28, y, 13, b.cd > 0 ? '#8b9bb4' : '#63c74d', 'left')
}
