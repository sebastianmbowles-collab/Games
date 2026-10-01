// Pomni: the only playable character. She can run away, and jump. That's it.

import { SPR, drawSprite } from './sprites'
import { GROUND_Y, clamp } from './consts'
import { sfx } from './sound'

const GRAV = 720
const JUMP_V = 268
const WALK = 72
const RUN = 106

export class Pomni {
  w = 10
  h = 26

  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.onGround = true
    this.onFloor = true
    this.coyote = 0
    this.jumpBuf = 0
    this.face = 1
    this.holdT = 0
    this.anim = 0
    this.squash = 0
    this.prevBottom = y + this.h
    this.carry = 0
    this.idleT = 0
  }

  get box() {
    return { x: this.x, y: this.y, w: this.w, h: this.h }
  }

  // world: { platforms, minX, maxX, slip, conveyor }
  update(dt, input, world) {
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    if (dir && dir === Math.sign(this.face)) this.holdT += dt
    else if (!dir) this.holdT = 0
    const slip = world.slip
    // Ice (a challenge) is slippery too, but not as wild as Bubble's goo.
    const ice = world.ice && !slip && this.onFloor
    const max = (this.holdT > 0.35 ? RUN : WALK) * (slip ? 1.35 : ice ? 1.15 : 1)
    const accel = this.onGround ? (slip ? 120 : ice ? 340 : 950) : 700
    const decel = this.onGround ? (slip ? 22 : ice ? 130 : 1200) : 380
    if (dir) {
      if (Math.sign(this.vx) !== dir) this.holdT = 0
      this.vx = clamp(this.vx + dir * accel * dt, -max, max)
      this.face = dir
    } else if (this.vx > 0) this.vx = Math.max(0, this.vx - decel * dt)
    else this.vx = Math.min(0, this.vx + decel * dt)
    if (slip && this.onGround && dir && Math.random() < dt * 4) sfx.slip()

    if (input.jumpPressed) this.jumpBuf = 0.12
    this.jumpBuf -= dt
    this.coyote = this.onGround ? 0.08 : this.coyote - dt
    if (this.jumpBuf > 0 && this.coyote > 0) {
      this.vy = -JUMP_V
      this.jumpBuf = 0
      this.coyote = 0
      this.onGround = false
      sfx.jump()
    }
    // Letting go of jump early makes a smaller hop.
    // (world.grav: less than 1 on the moon.)
    const g = (!input.jump && this.vy < 0 ? GRAV * 2.2 : GRAV) * (world.grav || 1)
    this.vy = Math.min(420, this.vy + g * dt)

    // The floor can be a treadmill, and pillows carry whoever stands on them.
    let move = this.vx
    if (this.onFloor) move += world.conveyor || 0
    move += this.carry
    this.carry = 0
    this.x = clamp(this.x + move * dt, world.minX, world.maxX - this.w)

    const wasGround = this.onGround
    const fallSpeed = this.vy
    this.prevBottom = this.y + this.h
    this.y += this.vy * dt
    this.onGround = false
    this.onFloor = false
    if (this.vy >= 0) {
      if (this.y + this.h >= GROUND_Y) {
        this.y = GROUND_Y - this.h
        this.vy = 0
        this.onGround = true
        this.onFloor = true
      } else {
        for (const p of world.platforms) {
          if (this.prevBottom <= p.y + 0.5 && this.y + this.h >= p.y && this.x + this.w > p.x && this.x < p.x + p.w) {
            this.y = p.y - this.h
            this.vy = 0
            this.onGround = true
            break
          }
        }
      }
    }
    if (this.onGround && !wasGround && fallSpeed > 120) this.land()
    this.squash = Math.max(0, this.squash - dt)
    const before = Math.floor(this.anim / 22)
    this.anim += Math.abs(this.vx) * dt
    if (this.onGround && Math.floor(this.anim / 22) !== before) sfx.step()
    this.idleT = Math.abs(this.vx) < 5 && this.onGround ? this.idleT + dt : 0
  }

  // Called when landing on the ground, a platform or a pillow.
  land() {
    this.squash = 0.1
    sfx.land()
  }

  // Stand on top of something (a pillow) this frame.
  standOn(top, vx = 0) {
    const wasGround = this.onGround
    const fall = this.vy
    this.y = top - this.h
    this.vy = 0
    this.onGround = true
    this.onFloor = false
    this.carry = vx
    if (!wasGround && fall > 120) this.land()
  }

  frame(t) {
    // Going up: looking up. Coming down fast: arms flailing!
    if (!this.onGround) return this.vy > 90 ? SPR.pomniFall : SPR.pomniJump
    if (Math.abs(this.vx) > 8) {
      // A four-step run: one leg forward, legs together, the other leg forward, together again.
      const speed = Math.abs(this.vx) > 90 ? 4.5 : 6
      return [SPR.pomniRun1, SPR.pomniPass, SPR.pomniRun2, SPR.pomniPass][Math.floor(this.anim / speed) % 4]
    }
    // Standing still: she looks around nervously now and then.
    if (this.idleT > 1.2 && t % 3 > 2.2) return SPR.pomniLook
    return SPR.pomniIdle
  }

  draw(c, t, opts = {}) {
    const spr = opts.frame || this.frame(t)
    drawPomni(c, spr, this.x + this.w / 2, this.y + this.h + 1, opts.flip ?? this.face < 0, {
      sy: this.squash > 0 ? 0.82 : 1,
      mode: opts.mode,
      rot: opts.rot,
      alpha: opts.alpha,
      look: opts.look ?? (spr === SPR.pomniLook ? [Math.sin(t * 2) > 0 ? 1 : -1, 0] : [0, 0]),
    })
  }
}

// ---------- Outfits ----------
// New colours for Pomni's costume. Each one is earned with a badge (see game.js).
const BLUE = '#3c8cf4'
const RED = '#f4447c'
const GOLD = '#fccc34'
const WHITE = '#f4f4f4'
const PUPIL = '#f2407e'
export const OUTFITS = {
  CLASSIC: {},
  'SWAPPED': { [BLUE]: RED, [RED]: BLUE },
  'PILLOW': { [BLUE]: '#c8b8e0', [RED]: '#8848c8', [GOLD]: '#f4f4f4' },
  'SPARE PARTS': { [BLUE]: '#68d8f8', [RED]: '#f2348a', [GOLD]: '#38b848', [PUPIL]: '#8848c8' },
  'GOLDEN': { [BLUE]: '#f8c830', [RED]: '#d88820', [GOLD]: '#fcfcfc', [PUPIL]: '#d88820' },
  'ABSTRACTED': { [BLUE]: '#2c1c3c', [RED]: '#5c2c8c', [GOLD]: '#e03c9c', [WHITE]: '#c8b8e0', [PUPIL]: '#68d8f8' },
  'DAREDEVIL': { [BLUE]: '#2c2c3c', [RED]: '#d82838', [GOLD]: '#f88828' },
  'SPEEDY': { [BLUE]: '#38b848', [RED]: '#f8c830', [GOLD]: '#68d8f8' },
  'STAR': { [BLUE]: '#cc243c', [RED]: '#f4d474', [GOLD]: '#f4f4f4', [PUPIL]: '#2a4ad8' },
  'SHOWSTOPPER': { [BLUE]: '#8848c8', [RED]: '#38b848', [GOLD]: '#f88828', [PUPIL]: '#2c5ce0' },
}
let outfit = 'CLASSIC'
export function setOutfit(name) {
  outfit = OUTFITS[name] ? name : 'CLASSIC'
}
const dressed = new Map()
function dress(spr, name = outfit) {
  const swap = OUTFITS[name]
  if (!swap || !Object.keys(swap).length) return spr
  let byOutfit = dressed.get(spr)
  if (!byOutfit) dressed.set(spr, (byOutfit = {}))
  if (!byOutfit[name]) {
    const copy = Object.assign([...spr], {
      pal: spr.pal.map((col) => swap[col] || col),
      ax: spr.ax,
      eyes: spr.eyes && spr.eyes.map((e) => e.map((v) => swap[v] || v)),
    })
    byOutfit[name] = copy
  }
  return byOutfit[name]
}

// Draw a Pomni frame with her feet at (cx, bottom). Her body stays centred whatever the pose.
export function drawPomni(c, spr, cx, bottom, flip = false, { scale = 1, sy = 1, mode, rot = 0, alpha = 1, look = [0, 0], wear, blink } = {}) {
  // Pomni blinks too (but not when she's scared: then her eyes are wide open).
  if (blink === undefined) blink = spr !== SPR.pomniScared && spr !== SPR.pomniFall && performance.now() % 3300 < 110
  spr = dress(spr, wear)
  const w = spr[0].length * scale
  const ax = spr.ax * scale
  const h = spr.length * scale * sy
  const x = Math.round(flip ? cx - (w - ax) : cx - ax)
  drawSprite(c, spr, x, Math.round(bottom - h), { flip, scale, sy, mode, rot, alpha, look, blink })
}
