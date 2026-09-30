// The three circus acts. Each act has the same shape so the circus can run any of them:
// update(dt), draw(c), down(x, y), up(), key(name, isDown), hud(), plus score / hearts / done / won.

import {
  W,
  H,
  FLOOR,
  TAU,
  INK,
  rand,
  clamp,
  rrect,
  circle,
  fillStroke,
  text,
  drawTent,
  drawFloor,
  drawJester,
  drawJesterHead,
} from './draw'
import { sfx } from './sound'

const BALL_COLORS = ['#e8394f', '#2b9ce0', '#2bb673', '#f2b90c', '#ff7a2b']

// ---------- Act 1: Juggle Jumble ----------

const GRAV = 470
const JUGGLE_TIME = 60
const HANDS_Y = 430
const DROP_Y = 555

export class Juggle {
  title = 'Juggle Jumble'
  help = ['Tap the balls to bounce them back up.', "Don't let any hit the floor!", 'NEVER tap the glitchy purple ones.']
  thresholds = [15, 35, 60]

  constructor(g) {
    this.g = g
    this.score = 0
    this.hearts = 3
    this.done = false
    this.won = false
    this.time = JUGGLE_TIME
    this.balls = []
    this.respawns = []
    this.addTimer = 4
    this.glitchTimer = 12
    this.combo = 0
    this.throwSide = 1
    this.throwBall(false)
  }

  throwBall(glitch) {
    this.throwSide = -this.throwSide
    const side = this.throwSide
    this.balls.push({
      x: W / 2 + side * 46,
      y: HANDS_Y,
      vx: -side * rand(40, 150),
      vy: -rand(480, 560),
      r: 24,
      color: glitch ? '#8a3ddb' : BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      glitch,
      spin: 0,
    })
  }

  normalCount() {
    return this.balls.filter((b) => !b.glitch).length + this.respawns.length
  }

  update(dt) {
    this.time -= dt
    if (this.time <= 0) {
      this.time = 0
      this.done = true
      this.won = true
      this.score += this.hearts * 5
      return
    }
    const elapsed = JUGGLE_TIME - this.time

    this.addTimer -= dt
    if (this.addTimer <= 0 && this.normalCount() < 5) {
      this.throwBall(false)
      this.addTimer = 9
    }
    if (elapsed > 12) {
      this.glitchTimer -= dt
      if (this.glitchTimer <= 0) {
        this.throwBall(true)
        this.glitchTimer = rand(5, 9)
      }
    }
    for (const r of this.respawns) r.t -= dt
    while (this.respawns.length && this.respawns[0].t <= 0) {
      this.respawns.shift()
      this.throwBall(false)
    }

    for (const b of this.balls) {
      b.vy += GRAV * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.spin += b.vx * dt * 0.03
      if (b.x < b.r) {
        b.x = b.r
        b.vx = Math.abs(b.vx)
      }
      if (b.x > W - b.r) {
        b.x = W - b.r
        b.vx = -Math.abs(b.vx)
      }
      if (b.y < 60 + b.r) {
        b.y = 60 + b.r
        b.vy = Math.abs(b.vy) * 0.5
      }
    }
    for (const b of this.balls.filter((ball) => ball.y > DROP_Y - ball.r)) {
      this.balls.splice(this.balls.indexOf(b), 1)
      if (b.glitch) {
        this.g.burst(b.x, DROP_Y - 10, ['#8a3ddb', '#2be0d0', '#ff2e9a'], 14)
        this.g.float('Dodged!', b.x, DROP_Y - 50, '#2be0d0')
        this.score += 2
      } else {
        this.hearts -= 1
        this.combo = 0
        sfx.drop()
        this.g.addGlitch(0.35)
        this.g.float('Oops!', b.x, DROP_Y - 50, '#ff5f7a')
        this.g.burst(b.x, DROP_Y - 10, [b.color, '#ffffff'], 10)
        if (this.hearts <= 0) {
          this.done = true
          return
        }
        this.respawns.push({ t: 1.2 })
      }
    }
  }

  down(x, y) {
    let best = null
    let bestD = Infinity
    for (const b of this.balls) {
      const d = Math.hypot(b.x - x, b.y - y)
      if (d < b.r + 28 && d < bestD) {
        best = b
        bestD = d
      }
    }
    if (!best) return
    if (best.glitch) {
      this.balls.splice(this.balls.indexOf(best), 1)
      this.hearts -= 1
      this.combo = 0
      sfx.glitch()
      this.g.addGlitch(0.8)
      this.g.float('GLITCH!', best.x, best.y - 40, '#c77dff')
      if (this.hearts <= 0) this.done = true
      return
    }
    this.combo += 1
    const pts = 1 + Math.floor(this.combo / 10)
    this.score += pts
    best.vy = -rand(470, 540)
    best.vx = clamp((W / 2 - best.x) * 0.5 + rand(-130, 130), -260, 260)
    sfx.boing(1 + Math.min(this.combo, 20) * 0.03)
    this.g.burst(best.x, best.y, [best.color, '#ffffff', '#f2c40c'], 8)
    this.g.float(`+${pts}`, best.x, best.y - 36, '#fff3a0')
  }

  hud() {
    return `Time: ${Math.ceil(this.time)}`
  }

  draw(c) {
    const t = this.g.t
    drawTent(c, t)
    drawFloor(c)

    // Shadows first, then Jingle, then the balls on top.
    for (const b of this.balls) {
      const k = clamp(1 - (DROP_Y - b.y) / 500, 0.2, 1)
      c.fillStyle = `rgba(0, 0, 0, ${0.3 * k})`
      c.beginPath()
      c.ellipse(b.x, DROP_Y + 8, b.r * k, b.r * 0.3 * k, 0, 0, TAU)
      c.fill()
    }
    const near = this.balls.reduce((m, b) => (b.y > (m?.y ?? -1) ? b : m), null)
    drawJester(c, W / 2, 565, 1, {
      t,
      pose: 'up',
      face: this.balls.some((b) => b.y > 470 && !b.glitch) ? 'shock' : 'happy',
      lookX: near ? clamp((near.x - W / 2) / 200, -1, 1) : 0,
      lookY: -1,
    })

    for (const b of this.balls) {
      if (b.glitch) {
        const j = () => rand(-3, 3)
        c.globalAlpha = 0.6
        circle(c, b.x - 4 + j(), b.y + j(), b.r)
        c.fillStyle = '#ff2e9a'
        c.fill()
        circle(c, b.x + 4 + j(), b.y + j(), b.r)
        c.fillStyle = '#2be0d0'
        c.fill()
        c.globalAlpha = 1
      }
      circle(c, b.x, b.y, b.r)
      fillStroke(c, b.color)
      c.save()
      circle(c, b.x, b.y, b.r)
      c.clip()
      c.translate(b.x, b.y)
      c.rotate(b.spin)
      if (b.glitch) {
        for (let i = 0; i < 6; i++) {
          c.fillStyle = Math.random() < 0.5 ? '#1d0b33' : '#d9b3ff'
          c.fillRect(rand(-b.r, b.r - 8), rand(-b.r, b.r - 8), 8, 8)
        }
      } else {
        c.fillStyle = 'rgba(255, 255, 255, 0.85)'
        c.fillRect(-b.r, -5, b.r * 2, 10)
      }
      c.restore()
      circle(c, b.x - 8, b.y - 9, 5)
      c.fillStyle = 'rgba(255, 255, 255, 0.7)'
      c.fill()
    }

    if (this.combo >= 5) text(c, `Combo x${this.combo}!`, W / 2, 110, { size: 26, color: '#fff3a0' })
  }
}

// ---------- Act 2: Wobbly Wire ----------

const ROPE_Y = 330
const ROPE_LEN = 4200
const ROPE_START = 40
const NET_Y2 = 520
const TILT_LIMIT = 1.0

export class Tightrope {
  title = 'Wobbly Wire'
  help = [
    'Walk the wire all the way across!',
    'Hold LEFT or RIGHT (or press the sides of the screen)',
    'to lean. Keep Jingle standing up straight!',
  ]
  thresholds = [60, 120, 175]

  constructor(g) {
    this.g = g
    this.score = 0
    this.hearts = 3
    this.done = false
    this.won = false
    this.x = ROPE_START + 60
    this.theta = 0.04
    this.omega = 0
    this.wind = 0
    this.windTarget = 0
    this.windTimer = 2
    this.falling = 0
    this.fallY = 0
    this.fallV = 0
    this.finishT = -1
    this.hold = 0
    this.keys = { l: false, r: false }
    this.confetti = Array.from({ length: 40 }, () => ({
      x: rand(0, W),
      y: rand(60, FLOOR),
      c: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      s: rand(0, TAU),
    }))
  }

  get progress() {
    return clamp((this.x - ROPE_START) / (ROPE_LEN - ROPE_START), 0, 1)
  }

  update(dt) {
    const t = this.g.t
    for (const p of this.confetti) {
      p.x += (this.wind * 220 + Math.sin(t + p.s) * 20) * dt
      p.y += 30 * dt
      p.s += dt * 4
      if (p.x < -10) p.x += W + 20
      if (p.x > W + 10) p.x -= W + 20
      if (p.y > FLOOR) p.y = 60
    }

    if (this.finishT >= 0) {
      this.finishT += dt
      this.x += 60 * dt
      if (this.finishT > 2) this.done = true
      return
    }

    if (this.falling > 0) {
      this.falling -= dt
      this.fallV += 1400 * dt
      this.fallY += this.fallV * dt
      if (ROPE_Y + this.fallY > NET_Y2) {
        this.fallY = NET_Y2 - ROPE_Y
        this.fallV = -this.fallV * 0.45
      }
      if (this.falling <= 0) {
        if (this.hearts <= 0) {
          this.done = true
          return
        }
        this.theta = 0
        this.omega = 0
        this.fallY = 0
        this.g.addGlitch(0.35)
        sfx.glitch()
        this.g.float('Respawned!', W * 0.33, ROPE_Y - 190, '#2be0d0')
      }
      return
    }

    this.windTimer -= dt
    if (this.windTimer <= 0) {
      this.windTarget = rand(-1, 1) * (0.35 + this.progress * 1.1)
      this.windTimer = rand(2, 4)
    }
    this.wind += (this.windTarget - this.wind) * dt * 1.5

    const right = this.keys.r || this.hold > 0
    const left = this.keys.l || this.hold < 0
    const input = (right ? 1 : 0) - (left ? 1 : 0)
    const alpha = 1.8 * Math.sin(this.theta) + this.wind * 1.1 + input * 3.6 - 1.8 * this.omega
    this.omega += alpha * dt
    this.theta += this.omega * dt
    this.x += 100 * dt * (1 - Math.min(0.6, Math.abs(this.theta)))
    this.score = Math.floor(this.progress * 150)

    if (Math.abs(this.theta) > TILT_LIMIT) {
      this.hearts -= 1
      this.falling = 1.6
      this.fallV = -150
      this.fallY = 0
      sfx.drop()
      this.g.addGlitch(0.3)
      this.g.float('Whoooa!', W * 0.33, ROPE_Y - 170, '#ff5f7a')
    }
    if (this.x >= ROPE_LEN) {
      this.x = ROPE_LEN
      this.won = true
      this.score = 150 + this.hearts * 10
      this.finishT = 0
      this.theta = 0
      sfx.fanfare()
      this.g.float('You made it!', W * 0.33, ROPE_Y - 190, '#fff3a0')
      this.g.burst(W * 0.33, ROPE_Y - 100, BALL_COLORS, 40)
    }
  }

  down(x) {
    this.hold = x < W / 2 ? -1 : 1
  }

  up() {
    this.hold = 0
  }

  key(k, isDown) {
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.keys.l = isDown
    if (k === 'ArrowRight' || k === 'd' || k === 'D') this.keys.r = isDown
  }

  hud() {
    return `${Math.floor(this.progress * 100)}% across`
  }

  draw(c) {
    const t = this.g.t
    const camX = this.x - W * 0.33
    drawTent(c, t, camX)
    drawFloor(c, camX)
    const sx = (wx) => wx - camX

    // Towers at each end.
    for (const tx of [ROPE_START - 90, ROPE_LEN]) {
      const x0 = sx(tx)
      if (x0 > W + 10 || x0 < -130) continue
      c.fillStyle = '#6b3a1d'
      c.fillRect(x0 + 20, ROPE_Y, 12, 250)
      c.fillRect(x0 + 90, ROPE_Y, 12, 250)
      rrect(c, x0, ROPE_Y - 4, 125, 18, 5)
      fillStroke(c, '#f2b90c')
      c.strokeStyle = INK
      c.lineWidth = 2
      for (let y = ROPE_Y + 30; y < ROPE_Y + 240; y += 40) {
        c.beginPath()
        c.moveTo(x0 + 26, y)
        c.lineTo(x0 + 96, y + 40)
        c.moveTo(x0 + 96, y)
        c.lineTo(x0 + 26, y + 40)
        c.stroke()
      }
      if (tx === ROPE_LEN) {
        c.fillStyle = INK
        c.fillRect(x0 + 60, ROPE_Y - 90, 4, 86)
        c.beginPath()
        c.moveTo(x0 + 64, ROPE_Y - 90)
        c.lineTo(x0 + 110, ROPE_Y - 75 + Math.sin(t * 5) * 4)
        c.lineTo(x0 + 64, ROPE_Y - 60)
        c.closePath()
        fillStroke(c, '#2bb673', INK, 2)
      }
    }

    // Safety net.
    const n0 = Math.max(-20, sx(ROPE_START))
    const n1 = Math.min(W + 20, sx(ROPE_LEN))
    if (n1 > n0) {
      c.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      c.lineWidth = 1.5
      c.beginPath()
      const step = 24
      for (let wx = Math.floor((camX - 40) / step) * step; wx < camX + W + 40; wx += step) {
        const px = sx(wx)
        if (px < n0 || px > n1) continue
        c.moveTo(px, NET_Y2)
        c.lineTo(px + 12, NET_Y2 + 22)
        c.moveTo(px + 12, NET_Y2)
        c.lineTo(px, NET_Y2 + 22)
      }
      c.stroke()
      c.strokeStyle = '#ff5fa2'
      c.lineWidth = 4
      c.beginPath()
      c.moveTo(n0, NET_Y2)
      c.lineTo(n1, NET_Y2)
      c.stroke()
    }

    // Distance flags along the wire.
    for (let k = 1; k < 4; k++) {
      const px = sx(ROPE_START + ((ROPE_LEN - ROPE_START) * k) / 4)
      if (px < -40 || px > W + 40) continue
      c.fillStyle = INK
      c.fillRect(px - 2, ROPE_Y - 60, 4, 60)
      rrect(c, px + 2, ROPE_Y - 60, 50, 24, 4)
      fillStroke(c, '#2b9ce0', INK, 2)
      text(c, `${k * 25}%`, px + 27, ROPE_Y - 48, { size: 14 })
    }

    // The wire dips a little under Jingle's feet.
    const px = sx(this.x)
    const onWire = this.falling <= 0
    const dip = onWire ? 10 : 0
    c.strokeStyle = INK
    c.lineWidth = 5
    c.beginPath()
    c.moveTo(sx(ROPE_START), ROPE_Y)
    c.quadraticCurveTo(px, ROPE_Y + dip * 2, sx(ROPE_LEN + 60), ROPE_Y)
    c.stroke()
    c.strokeStyle = '#f5e6c8'
    c.lineWidth = 2
    c.stroke()

    for (const p of this.confetti) {
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.s)
      c.fillStyle = p.c
      c.fillRect(-4, -2, 8, 4)
      c.restore()
    }

    const walking = onWire && this.finishT < 0
    drawJester(c, px, ROPE_Y + dip + this.fallY, 0.9, {
      t,
      tilt: this.falling > 0 ? this.theta + (1.6 - this.falling) * 5 : this.theta,
      pose: 'out',
      pole: onWire,
      walk: walking || this.finishT >= 0,
      face: this.falling > 0 ? 'dizzy' : Math.abs(this.theta) > 0.55 ? 'shock' : 'happy',
      lookX: clamp(-this.theta * 2, -1, 1),
    })

    // Wind sign.
    const wx = W / 2
    rrect(c, wx - 90, 64, 180, 40, 12)
    fillStroke(c, 'rgba(29, 18, 51, 0.8)', '#fff', 2)
    text(c, 'Wind', wx - 52, 84, { size: 16 })
    const len = this.wind * 55
    c.strokeStyle = Math.abs(this.wind) > 0.8 ? '#ff5f7a' : '#2be0d0'
    c.lineWidth = 6
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(wx + 30 - len / 2, 84)
    c.lineTo(wx + 30 + len / 2, 84)
    if (Math.abs(len) > 4) {
      const d = Math.sign(len)
      c.moveTo(wx + 30 + len / 2 - d * 10, 76)
      c.lineTo(wx + 30 + len / 2, 84)
      c.lineTo(wx + 30 + len / 2 - d * 10, 92)
    }
    c.stroke()

    // Balance meter along the bottom.
    const bx = W / 2
    const by = 572
    rrect(c, bx - 180, by - 12, 360, 24, 12)
    const g = c.createLinearGradient(bx - 180, 0, bx + 180, 0)
    g.addColorStop(0, '#ff2e5b')
    g.addColorStop(0.3, '#f2c40c')
    g.addColorStop(0.5, '#2bb673')
    g.addColorStop(0.7, '#f2c40c')
    g.addColorStop(1, '#ff2e5b')
    fillStroke(c, g, INK, 3)
    const mx = bx + clamp(this.theta / TILT_LIMIT, -1, 1) * 172
    c.beginPath()
    c.moveTo(mx, by - 2)
    c.lineTo(mx - 10, by - 22)
    c.lineTo(mx + 10, by - 22)
    c.closePath()
    fillStroke(c, '#ffffff', INK, 2)
    text(c, '◀ LEFT', bx - 240, by, { size: 16, color: this.keys.l || this.hold < 0 ? '#fff3a0' : '#b9a6d9' })
    text(c, 'RIGHT ▶', bx + 240, by, { size: 16, color: this.keys.r || this.hold > 0 ? '#fff3a0' : '#b9a6d9' })
  }
}

// ---------- Act 3: Cannon Blast ----------

const PIVOT = { x: 120, y: 500 }
const NET_Y = 470
const CANNON_G = 600
const SHOTS = 5

export class Cannon {
  title = 'Cannon Blast'
  help = [
    'Tap once to pick the angle, then tap again for the power.',
    'Land Jingle in the net! The middle scores the most.',
    'You get 5 shots.',
  ]
  thresholds = [15, 30, 42]

  constructor(g) {
    this.g = g
    this.score = 0
    this.hearts = null
    this.done = false
    this.won = false
    this.shots = SHOTS
    this.taken = 0
    this.phase = 'aim'
    this.tt = 0
    this.angle = 0.8
    this.power = 0
    this.j = null
    this.wait = 0
    this.recoil = 0
    this.netSag = 0
    this.net = this.makeNet()
  }

  makeNet() {
    const moving = this.taken >= 2
    return {
      x: rand(440, 820),
      w: 160 - this.taken * 12,
      v: moving ? rand(55, 100) * (Math.random() < 0.5 ? -1 : 1) : 0,
    }
  }

  update(dt) {
    this.tt += dt
    this.recoil = Math.max(0, this.recoil - dt * 3)
    this.netSag *= 1 - dt * 3
    const n = this.net
    if (this.phase !== 'land') {
      n.x += n.v * dt
      if (n.x < 400 || n.x > 860) {
        n.v = -n.v
        n.x = clamp(n.x, 400, 860)
      }
    }

    if (this.phase === 'aim') {
      this.angle = 0.35 + (Math.sin(this.tt * 1.8) * 0.5 + 0.5) * 0.95
    } else if (this.phase === 'power') {
      const k = (this.tt * 0.9) % 2
      this.power = k < 1 ? k : 2 - k
    } else if (this.phase === 'fly') {
      const j = this.j
      const prevY = j.y
      j.vy += CANNON_G * dt
      j.x += j.vx * dt
      j.y += j.vy * dt
      j.spin += dt * 9
      if (Math.random() < 0.6) this.g.burst(j.x, j.y, ['#ffffff', '#f2c40c'], 1, 40)
      if (j.vy > 0 && prevY < NET_Y - 12 && j.y >= NET_Y - 12 && Math.abs(j.x - n.x) <= n.w / 2) {
        const d = Math.abs(j.x - n.x)
        const pts = d < 14 ? 10 : d < n.w * 0.3 ? 6 : 3
        this.score += pts
        this.phase = 'land'
        this.wait = 1.6
        this.netSag = 1
        j.offset = j.x - n.x
        sfx.cheer()
        this.g.burst(j.x, NET_Y, BALL_COLORS, pts * 3)
        this.g.float(pts === 10 ? `BULLSEYE! +${pts}` : `+${pts}`, j.x, NET_Y - 120, '#fff3a0')
      } else if (j.y > 565 || j.x > W + 60) {
        j.y = Math.min(j.y, 565)
        this.phase = 'miss'
        this.wait = 1.6
        sfx.drop()
        this.g.addGlitch(0.35)
        this.g.float(j.x > W ? 'Whoops, too far!' : 'Splat!', clamp(j.x, 120, W - 120), 400, '#ff5f7a')
      }
    } else if (this.phase === 'land' || this.phase === 'miss') {
      this.wait -= dt
      if (this.wait <= 0) {
        this.shots -= 1
        this.taken += 1
        if (this.shots <= 0) {
          this.done = true
          this.won = this.score >= this.thresholds[0]
          return
        }
        this.net = this.makeNet()
        this.phase = 'aim'
        this.tt = Math.random() * 3
        this.j = null
      }
    }
  }

  down() {
    if (this.phase === 'aim') {
      this.phase = 'power'
      this.tt = 0
      sfx.click()
    } else if (this.phase === 'power') {
      const speed = 360 + this.power * 480
      const ca = Math.cos(this.angle)
      const sa = Math.sin(this.angle)
      this.j = { x: PIVOT.x + ca * 80, y: PIVOT.y - sa * 80, vx: ca * speed, vy: -sa * speed, spin: 0 }
      this.phase = 'fly'
      this.recoil = 1
      sfx.boom()
      this.g.shakeScreen(0.25)
      this.g.burst(this.j.x, this.j.y, ['#dddddd', '#999999', '#f2c40c'], 18, 160)
    }
  }

  key(k, isDown) {
    if (isDown && (k === ' ' || k === 'Enter')) this.down()
  }

  hud() {
    return `Shots: ${this.shots}`
  }

  draw(c) {
    const t = this.g.t
    drawTent(c, t)
    drawFloor(c)
    const n = this.net

    // Net on two posts, with colored scoring zones along the top.
    const left = n.x - n.w / 2
    const right = n.x + n.w / 2
    c.fillStyle = '#6b3a1d'
    c.fillRect(left - 6, NET_Y - 6, 8, 575 - NET_Y)
    c.fillRect(right - 2, NET_Y - 6, 8, 575 - NET_Y)
    const sag = 18 + this.netSag * 30 * Math.abs(Math.cos(t * 12))
    c.beginPath()
    c.moveTo(left, NET_Y)
    c.quadraticCurveTo(n.x, NET_Y + sag * 2, right, NET_Y)
    c.closePath()
    c.fillStyle = 'rgba(255, 255, 255, 0.25)'
    c.fill()
    c.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    c.lineWidth = 1.5
    for (let x = left + 12; x < right; x += 14) {
      c.beginPath()
      c.moveTo(x, NET_Y)
      c.lineTo(x, NET_Y + sag * (1 - ((x - n.x) / (n.w / 2)) ** 2))
      c.stroke()
    }
    const zones = [
      [n.w / 2, '#2b9ce0'],
      [n.w * 0.3, '#f2c40c'],
      [14, '#e8394f'],
    ]
    for (const [hw, col] of zones) {
      c.fillStyle = INK
      c.fillRect(n.x - hw - 2, NET_Y - 5, hw * 2 + 4, 10)
      c.fillStyle = col
      c.fillRect(n.x - hw, NET_Y - 3, hw * 2, 6)
    }

    // Jingle.
    const j = this.j
    if (this.phase === 'fly') {
      c.save()
      c.translate(j.x, j.y)
      c.rotate(j.spin)
      drawJester(c, 0, 52, 0.7, { t, pose: 'out', face: 'shock' })
      c.restore()
    } else if (this.phase === 'land') {
      const bounce = Math.abs(Math.sin(this.wait * 9)) * 30 * this.wait
      drawJester(c, n.x + j.offset, NET_Y + 18 - bounce, 0.7, { t, pose: 'up', face: 'happy' })
    } else if (this.phase === 'miss') {
      drawJester(c, clamp(j.x, 40, W - 40), 575, 0.7, { t, squash: 0.45, pose: 'out', face: 'dizzy' })
    }

    // The cannon.
    c.save()
    c.translate(PIVOT.x, PIVOT.y)
    c.rotate(-this.angle)
    c.translate(-this.recoil * 14, 0)
    if (this.phase === 'aim' || this.phase === 'power') {
      drawJesterHead(c, 92, 0, 0.55, { t, face: 'happy' })
    }
    rrect(c, -30, -30, 125, 60, 14)
    fillStroke(c, '#8a3ddb')
    c.fillStyle = '#f2c40c'
    c.fillRect(20, -30, 14, 60)
    c.fillRect(60, -30, 14, 60)
    c.strokeStyle = INK
    c.lineWidth = 2
    c.strokeRect(20, -30, 14, 60)
    c.strokeRect(60, -30, 14, 60)
    rrect(c, 90, -36, 18, 72, 6)
    fillStroke(c, '#e8394f')
    c.restore()
    c.fillStyle = INK
    c.beginPath()
    c.moveTo(PIVOT.x - 50, PIVOT.y + 55)
    c.lineTo(PIVOT.x, PIVOT.y - 5)
    c.lineTo(PIVOT.x + 50, PIVOT.y + 55)
    c.closePath()
    fillStroke(c, '#6b3a1d')
    circle(c, PIVOT.x, PIVOT.y + 45, 26)
    fillStroke(c, '#f2b90c')
    c.save()
    c.translate(PIVOT.x, PIVOT.y + 45)
    c.rotate(t)
    c.strokeStyle = INK
    c.lineWidth = 3
    for (let k = 0; k < 4; k++) {
      c.rotate(Math.PI / 4)
      c.beginPath()
      c.moveTo(-24, 0)
      c.lineTo(24, 0)
      c.stroke()
    }
    c.restore()

    // Aim guide and power meter.
    if (this.phase === 'aim' || this.phase === 'power') {
      c.setLineDash([8, 10])
      c.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(PIVOT.x + Math.cos(this.angle) * 120, PIVOT.y - Math.sin(this.angle) * 120)
      c.lineTo(PIVOT.x + Math.cos(this.angle) * 230, PIVOT.y - Math.sin(this.angle) * 230)
      c.stroke()
      c.setLineDash([])
      text(c, this.phase === 'aim' ? 'Tap to lock the ANGLE!' : 'Tap to FIRE!', W / 2, 150, {
        size: 28,
        color: '#fff3a0',
      })
    }
    if (this.phase === 'power') {
      rrect(c, 30, 230, 34, 200, 10)
      fillStroke(c, '#1d1233', '#fff', 3)
      const h = 192 * this.power
      const g = c.createLinearGradient(0, 426, 0, 234)
      g.addColorStop(0, '#2bb673')
      g.addColorStop(0.6, '#f2c40c')
      g.addColorStop(1, '#ff2e5b')
      c.fillStyle = g
      c.fillRect(34, 426 - h, 26, h)
      text(c, 'POWER', 47, 215, { size: 14 })
    }
    text(c, `Shot ${Math.min(SHOTS, this.taken + 1)} of ${SHOTS}`, W - 90, H - 24, { size: 16, color: '#d9c7ff' })
  }
}

export const ACTS = [
  { key: 'juggle', make: (g) => new Juggle(g), title: 'Juggle Jumble', color: '#e8394f', blurb: 'Keep the balls flying!' },
  { key: 'rope', make: (g) => new Tightrope(g), title: 'Wobbly Wire', color: '#2b9ce0', blurb: "Don't fall off!" },
  { key: 'cannon', make: (g) => new Cannon(g), title: 'Cannon Blast', color: '#f2b90c', blurb: 'Aim for the net!' },
]
