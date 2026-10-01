// The five boss fights. Pomni can't hurt anyone: she wins by SURVIVING each boss's show.
// Every boss runs a script (a list of timed attacks). The script uses a seeded random number maker,
// so the same attempt always plays the same way unless Pomni moves differently. Learn it, beat it.

import { SPR, drawSprite } from './sprites'
import { VW, GROUND_Y, clamp, seeded } from './consts'
import { Cushion, Button, Ribbon, Pillow, Cane, Glob } from './hazards'
import { sfx, setTempo } from './sound'

const G = 520
const arc = (x0, y0, tx, ty, T) => ({ vx: (tx - x0) / T, vy: (ty - y0 - 0.5 * G * T * T) / T })

export const BOSSES = [
  {
    key: 'jax',
    name: 'JAX',
    title: 'THE WHOOPIE CUSHION MENACE',
    rules: ['THROWS WHOOPIE CUSHIONS.', 'THEY LAND AND STAY ON THE FLOOR.', 'TOUCH ONE OR STAND ON ONE: OUT!'],
    intro: [
      [0.4, 'boss', 'HEH.'],
      [1.6, 'boss', '*PULLS OUT A WHOOPIE CUSHION*'],
      [3.0, 'boss', 'PFFFFFT.'],
    ],
    defeat: '*SHRUG*',
    win: 'HEH. GOTCHA.',
  },
  {
    key: 'ragatha',
    name: 'RAGATHA',
    title: 'BUTTON BARRAGE',
    rules: ['THROWS BUTTONS EVERY WHICH WAY.', 'RUN INTO ONE, JUMP INTO ONE,', 'TOUCH ONE AT ALL: OUT!'],
    intro: [
      [0.4, 'boss', 'HI POMNI!'],
      [1.8, 'boss', 'I MADE YOU SOME BUTTONS!'],
      [3.1, 'pomni', 'OH NO.'],
    ],
    defeat: 'PHEW! YOU DID IT!',
    win: 'OOPS! SORRY!',
  },
  {
    key: 'gangle',
    name: 'GANGLE',
    title: 'RIBBON RAMPAGE',
    rules: ['GIANT RED RIBBONS FILL THE SCREEN.', 'WATCH THE FLASHING OUTLINES', 'AND FIND THE GAP!'],
    intro: [
      [0.4, 'boss', 'SORRY POMNI...'],
      [1.8, 'boss', 'THE RIBBONS HAVE A MIND OF THEIR OWN!'],
    ],
    defeat: 'IS... IS IT OVER?',
    win: 'OH NO... SORRY!',
  },
  {
    key: 'kinger',
    name: 'KINGER',
    title: 'PILLOW PANIC',
    rules: ['RUN INTO A PILLOW: OUT!', 'STAND ON A PILLOW: SAFE!', 'PINK PILLOWS GO BOING.'],
    intro: [
      [0.4, 'boss', 'PILLOW FIGHT!!'],
      [1.7, 'boss', 'WAIT. WHO ARE YOU AGAIN?'],
      [3.0, 'boss', 'PILLOW FIGHT!!!'],
    ],
    defeat: 'I REGRET NOTHING!',
    win: 'GOT YOU! ...WHO WAS THAT?',
  },
  {
    key: 'caine',
    name: 'CAINE + BUBBLE',
    title: 'THE FINAL SHOW',
    rules: ['ONE ABSURDLY HUGE CANE.', 'BUBBLE MAKES THE FLOOR SLIPPERY.', 'WATCH EVERYTHING.'],
    intro: [
      [0.4, 'boss', 'LADIES AND GENTLEMEN!'],
      [1.7, 'boss', 'THE FINAL SHOW!'],
      [3.0, 'bubble', 'HIIIII!'],
    ],
    defeat: '...',
    win: 'AND THE CROWD GOES WILD!',
  },
]

class Boss {
  constructor(g, info, d, seed) {
    this.g = g
    Object.assign(this, info)
    this.spr = SPR[info.key]
    this.d = d
    this.time = 0
    this.ei = 0
    this.throwT = 0
    this.bubbleText = null
    this.mood = 'normal'
    this.x = VW - this.w - 6
    this.y = GROUND_Y - this.h
    this.rng = seeded(seed)
    const s = this.script(this.rng, d)
    this.events = s.events.sort((a, b) => a[0] - b[0])
    this.duration = s.duration
    this.tempos = s.tempos || []
  }
  get w() {
    return this.spr[0].length
  }
  get h() {
    return this.spr.length
  }
  get progress() {
    return clamp(this.time / this.duration, 0, 1)
  }
  get done() {
    return this.time >= this.duration
  }
  hand() {
    return { x: this.x + this.spr.ax - 12, y: this.y + this.h * 0.35 }
  }
  get px() {
    const p = this.g.pomni
    return p.x + p.w / 2
  }
  say(text, dur = 1.8) {
    this.bubbleText = { text, until: this.g.t + dur }
  }
  updateFight(dt) {
    this.time += dt
    this.throwT = Math.max(0, this.throwT - dt)
    while (this.ei < this.events.length && this.events[this.ei][0] <= this.time) {
      this.events[this.ei][1]()
      this.ei++
    }
    for (const [at, mul] of this.tempos) if (this.time >= at && this.time - dt < at) setTempo(mul)
  }
  idle(dt) {
    this.throwT = Math.max(0, this.throwT - dt)
  }
  throwing() {
    this.throwT = 0.18
  }
  draw(c, t) {
    const lean = this.throwT > 0 ? -2 : 0
    const bob = this.mood === 'defeated' ? 0 : Math.round(Math.sin(t * 2.4) * 1)
    drawSprite(c, this.spr, this.x + lean, this.y + bob + (this.throwT > 0 ? 1 : 0))
    if (this.mood === 'pleased') {
      c.fillStyle = '#f8c830'
      for (let i = 0; i < 3; i++) c.fillRect(Math.round(this.x + this.spr.ax - 10 + i * 8), Math.round(this.y - 6 - Math.abs(Math.sin(t * 6 + i)) * 4), 2, 2)
    }
  }
}

// ---------- JAX ----------
class Jax extends Boss {
  script(r, d) {
    const ev = []
    const at = (t, fn) => ev.push([t, fn])
    const cap = 5 + d.extra * 2 + (d.dens > 0.9 ? 1 : 0)
    const life = 9 * d.life
    let t = 1
    // 1: single throws that land next to Pomni, slowly using up the floor.
    while (t < 14) {
      const side = r.pick([-1, 1])
      const off = r.range(14, 26)
      at(t, () => this.toss(this.px + side * off, life, cap))
      t += 2.1 / d.dens
    }
    at(14, () => this.say('HEH HEH.'))
    // 2: straight at her, and sometimes a second one to the other side.
    while (t < 30) {
      const two = r() < 0.5
      const side = r.pick([-1, 1])
      at(t, () => {
        this.toss(this.px, life, cap)
        if (two) this.toss(this.px + side * 64, life, cap)
      })
      t += 1.7 / d.dens
    }
    // 3: carpet bombing. Taking away the safe places one by one.
    at(30, () => this.say('WHERE YOU GONNA STAND NOW?'))
    const spots = [20, 50, 80, 110, 140, 170, 200, 230, 68, 182]
    while (t < 42) {
      const s = r.pick(spots)
      at(t, () => this.toss(s, life, cap + 2))
      t += 1.15 / d.dens
    }
    // FINAL: THROW THROW THROW THROW.
    at(42, () => this.say('THROW THROW THROW THROW!', 2.5))
    t = 42.6
    while (t < 51) {
      const off = r.range(-30, 30)
      at(t, () => this.toss(this.px + off, 3.2 * d.life, cap + 4))
      t += 0.34 / d.dens
    }
    return { events: ev, duration: 53, tempos: [[30, 1.06], [42, 1.15]] }
  }
  toss(tx, life, cap) {
    const g = this.g
    const h = this.hand()
    tx = clamp(tx, 10, this.x - 16)
    const plat = g.platforms.find((p) => tx > p.x + 4 && tx < p.x + p.w - 4)
    const ty = plat && this.rng() < 0.5 ? plat.y : GROUND_Y
    const T = 0.95 / this.d.speed
    const v = arc(h.x, h.y, tx - 7, ty - 7, T)
    g.haz.push(new Cushion(h.x - 7, h.y - 4, v.vx, v.vy, life))
    const resting = g.haz.filter((c) => c instanceof Cushion && c.state === 'rest')
    for (let i = 0; i < resting.length - cap; i++) resting[i].deflate()
    this.throwing()
    sfx.throw()
  }
}

// ---------- RAGATHA ----------
class Ragatha extends Boss {
  script(r, d) {
    const ev = []
    const at = (t, fn) => ev.push([t, fn])
    const sp = d.speed
    let t = 1
    // 1: horizontal buttons. Low ones: jump. High ones: stay on the floor.
    while (t < 13) {
      const high = r() < 0.4
      at(t, () => this.straight(high ? GROUND_Y - 30 : GROUND_Y - 8, 110 * sp))
      t += 1.7 / d.dens
    }
    // 2: buttons dropping from above. Move sideways!
    at(13, () => this.say('LOOK UP!'))
    while (t < 26) {
      const n = 2 + d.extra
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 26
        at(t + i * 0.22, () => this.drop(this.px + off))
      }
      at(t + 1.1, () => this.straight(GROUND_Y - 8, 105 * sp))
      t += 2.3 / d.dens
    }
    // 3: spreads and rollers.
    at(26, () => this.say('CATCH!'))
    while (t < 38) {
      const k = r()
      at(t, () => (k < 0.55 ? this.spread(4 + d.extra) : this.roll(95 * sp)))
      t += 1.6 / d.dens
    }
    // 4: the button storm.
    at(38, () => this.say('BUTTON STORM!'))
    while (t < 46) {
      const k = r()
      const high = r() < 0.5
      const off = r.range(-30, 30)
      at(t, () => {
        if (k < 0.35) this.straight(high ? GROUND_Y - 30 : GROUND_Y - 8, 130 * sp)
        else if (k < 0.7) this.drop(this.px + off)
        else this.spread(3)
      })
      t += 0.62 / d.dens
    }
    // FINAL: the floor becomes a treadmill and buttons come from both sides.
    at(46, () => {
      this.say('KEEP RUNNING!', 2.5)
      this.g.setConveyor(-50 * sp)
    })
    t = 47
    while (t < 58) {
      const k = r()
      const off = r.range(-20, 40)
      const left = r() < 0.5
      at(t, () => {
        if (k < 0.3) this.straight(GROUND_Y - 8, 120 * sp, true)
        else if (k < 0.55) this.straight(GROUND_Y - 8, 120 * sp)
        else if (k < 0.8) this.drop(this.px + off)
        else this.straight(GROUND_Y - 30, 130 * sp, left)
      })
      t += 0.75 / d.dens
    }
    at(58.5, () => this.g.setConveyor(0))
    return { events: ev, duration: 60, tempos: [[13, 1.07], [26, 1.14], [38, 1.22], [46, 1.32]] }
  }
  straight(y, speed, fromLeft = false) {
    const x = fromLeft ? -8 : this.hand().x
    this.g.haz.push(new Button({ mode: 'straight', x, y, vx: fromLeft ? speed : -speed, life: 8 }))
    if (!fromLeft) this.throwing()
    sfx.throw()
  }
  drop(x) {
    x = clamp(x, 4, this.x - 10)
    this.g.haz.push(new Button({ mode: 'drop', x, warn: 0.85 * this.d.warn, life: 2.6 * this.d.life }))
  }
  spread(n) {
    const h = this.hand()
    for (let i = 0; i < n; i++) {
      const a = 0.2 + (i / Math.max(1, n - 1)) * 0.95
      const s = 150 * this.d.speed
      this.g.haz.push(new Button({ mode: 'spread', x: h.x, y: h.y, vx: -Math.cos(a) * s, vy: -Math.sin(a) * s, grav: 320, bounces: 1, life: 4 }))
    }
    this.throwing()
    sfx.throw()
  }
  roll(speed) {
    this.g.haz.push(new Button({ mode: 'roll', x: this.hand().x, y: GROUND_Y - 7, vx: -speed, life: 8 }))
    this.throwing()
    sfx.throw()
  }
}

// ---------- GANGLE ----------
class Gangle extends Boss {
  script(r, d) {
    const ev = []
    const at = (t, fn) => ev.push([t, fn])
    const span = () => this.x - 4
    const warn = 1.15 * d.warn
    const life = 2 * d.life
    let t = 1
    // 1: one big band at a time. Floor ribbon: get up on a platform. Top ribbon: get down low.
    while (t < 16) {
      const top = r() < 0.5
      at(t, () =>
        this.g.haz.push(
          top ? new Ribbon({ x: 0, y: 0, w: span(), h: 100, warn, life }) : new Ribbon({ x: 0, y: GROUND_Y - 20, w: span(), h: 20, warn, life }),
        ),
      )
      at(t, () => sfx.swish())
      t += 3.3 / d.dens
    }
    // 2: trapped between two ribbons, and ribbons that slowly move.
    at(16, () => this.say("I CAN'T STOP THEM!"))
    while (t < 31) {
      const k = r()
      at(t, () => {
        sfx.swish()
        if (k < 0.55) {
          this.g.haz.push(new Ribbon({ x: 0, y: GROUND_Y - 20, w: span(), h: 20, warn, life: life + 0.4 }))
          this.g.haz.push(new Ribbon({ x: 0, y: 0, w: span(), h: 86, warn, life: life + 0.4 }))
        } else {
          this.g.haz.push(
            new Ribbon({
              x: 0,
              y: -2,
              w: span(),
              h: 14,
              warn: warn * 0.8,
              life: 5,
              vy: 34 * d.speed,
              script: (rb) => {
                if (rb.vy > 0 && rb.y > 100) rb.vy = -40 * d.speed
              },
            }),
          )
        }
      })
      t += 3.6 / d.dens
    }
    // 3: ribbon walls. Wait for the gap... then GO!
    at(31, () => this.say('A WALL OF RIBBON!'))
    while (t < 46) {
      const low = r() < 0.5
      at(t, () => this.wall(low))
      t += 4.6 / d.dens
    }
    // FINAL: the screen fills with ribbon. A moving maze.
    at(46, () => this.say('EVERYTHING IS RED!', 2.4))
    t = 46.5
    while (t < 58) {
      const k = r()
      const low = r() < 0.5
      at(t, () => {
        sfx.swish()
        if (k < 0.4) this.wall(low, 1.25)
        else if (k < 0.7) {
          this.g.haz.push(new Ribbon({ x: 0, y: GROUND_Y - 20, w: span(), h: 20, warn: warn * 0.85, life: 1.6 }))
          this.g.haz.push(new Ribbon({ x: 0, y: 0, w: span(), h: 86, warn: warn * 0.85, life: 1.6 }))
        } else this.g.haz.push(new Ribbon({ x: 0, y: 0, w: span(), h: 100, warn: warn * 0.85, life: 1.6 }))
      })
      t += 2.2 / d.dens
    }
    return { events: ev, duration: 60, tempos: [[31, 1.05], [46, 1.12]] }
  }
  wall(low, speedMul = 1) {
    const d = this.d
    // Low gap: stay on the floor. High gap: be up on a low platform (or jumping) when it passes.
    const gap = low ? { y: GROUND_Y - 30, h: 40 } : { y: 82, h: 38 }
    const stopX = 200
    this.g.haz.push(
      new Ribbon({
        x: this.x - 22,
        y: -4,
        w: 18,
        h: GROUND_Y + 8,
        vertical: true,
        warn: 0.5 * d.warn,
        life: 14,
        vx: -45 * d.speed * speedMul,
        script: (rb, dt, g) => {
          if (rb.phase !== 'on') return
          if (!rb.stopped && rb.x <= stopX) {
            rb.stopped = true
            rb.vx = 0
            rb.hold = 1.1 * d.warn
          } else if (rb.stopped && !rb.gap) {
            rb.hold -= dt
            if (rb.hold <= 0) {
              rb.gap = gap
              rb.vx = -62 * d.speed * speedMul
              g.flash('GO!', rb.x + 9, gap.y + gap.h / 2)
              sfx.blip()
            }
          }
        },
      }),
    )
    sfx.swish()
  }
}

// ---------- KINGER ----------
class Kinger extends Boss {
  script(r, d) {
    const ev = []
    const at = (t, fn) => ev.push([t, fn])
    const sp = d.speed
    let t = 1
    // 1: pillows sliding along the floor. Hop on (safe) or over.
    while (t < 14) {
      const s = r.range(55, 75) * sp
      at(t, () => this.slide(s))
      t += 2.3 / d.dens
    }
    // 2: floating pillows drift by, like stepping stones.
    at(14, () => this.say('FLOATING PILLOWS! ...WHY?'))
    while (t < 28) {
      const y = r.pick([118, 100, 84])
      const two = r() < 0.5
      const s1 = r.range(38, 52) * sp
      const s2 = r.range(60, 80) * sp
      at(t, () => {
        this.float(y, s1)
        if (two) this.slide(s2)
      })
      t += 1.9 / d.dens
    }
    // 3: bouncy pillows. BOING!
    at(28, () => this.say('BOING! BOING!'))
    while (t < 42) {
      const k = r()
      const y = r.pick([110, 92, 76])
      const s = r.range(40, 55) * sp
      at(t, () => {
        if (k < 0.45) this.lob(true)
        else if (k < 0.75) this.float(y, s)
        else this.slide(s + 25)
      })
      t += 1.5 / d.dens
    }
    // FINAL: pillows everywhere. Don't trust the pillows. (Or do. Carefully.)
    at(42, () => this.say('ALL THE PILLOWS!!!', 2.4))
    t = 42.6
    while (t < 56) {
      const k = r()
      const y = r.pick([120, 104, 88, 72])
      const s = r.range(45, 70) * sp
      const bouncy = r() < 0.6
      at(t, () => {
        if (k < 0.35) this.slide(s + 25)
        else if (k < 0.75) this.float(y, s)
        else this.lob(bouncy)
      })
      t += 0.62 / d.dens
    }
    return { events: ev, duration: 58, tempos: [[28, 1.08], [42, 1.18]] }
  }
  slide(speed) {
    this.g.haz.push(new Pillow({ x: this.x - 22, y: GROUND_Y - 9, vx: -speed, mode: 'slide' }))
    this.throwing()
    sfx.thump()
  }
  float(y, speed) {
    this.g.haz.push(new Pillow({ x: VW + 2, y, vx: -speed, mode: 'float' }))
  }
  lob(bouncy) {
    const h = this.hand()
    const tx = clamp(this.px + this.rng.range(-40, 40), 20, this.x - 40)
    const v = arc(h.x - 20, h.y, tx - 10, GROUND_Y - 9, 1.0 / this.d.speed)
    this.g.haz.push(new Pillow({ x: h.x - 20, y: h.y, vx: v.vx, vy: v.vy, mode: 'arc', bouncy, slide: -35 * this.d.speed }))
    this.throwing()
    sfx.throw()
  }
}

// ---------- CAINE & BUBBLE ----------
class Caine extends Boss {
  constructor(g, info, d, seed) {
    super(g, info, d, seed)
    this.baseY = 26
    this.y = this.baseY
    this.bub = { x: 120, y: 18, t: 0, text: null }
  }
  script(r, d) {
    const ev = []
    const at = (t, fn) => ev.push([t, fn])
    let t = 1
    // 1: the cane hangs down and sweeps across (stay low!), or spins past (jump, or stay low).
    while (t < 16) {
      const k = r()
      const low = r() < 0.5
      at(t, () => (k < 0.5 ? this.hang() : this.spin(low)))
      t += 2.6 / d.dens
    }
    // 2: the cane comes down on one half of the arena. Bubble starts being sick.
    at(16, () => {
      this.say('AND NOW... BUBBLE!')
      this.bub.text = { text: 'BLEHHH!', until: this.g.t + 1.5 }
    })
    while (t < 32) {
      const side = r() < 0.5 ? 0 : 1
      at(t, () => this.descend(side))
      at(t + 1.4, () => this.vomit())
      t += 3.2 / d.dens
    }
    // 3: everything mixed, plus a diagonal sweep.
    at(32, () => this.say('MORE! MORE! MORE!'))
    while (t < 50) {
      const k = r()
      const low = r() < 0.5
      const side = r() < 0.5 ? 0 : 1
      at(t, () => {
        if (k < 0.25) this.hang()
        else if (k < 0.5) this.spin(low)
        else if (k < 0.75) this.descend(side)
        else this.diagonal()
      })
      if (r() < 0.6) at(t + 0.9, () => this.vomit())
      t += 2.2 / d.dens
    }
    // FINAL: the cane covers almost the whole screen. One tiny opening. Jump through it!
    at(50, () => {
      this.say('THE GRAND FINALE!', 2.5)
      this.vomit()
    })
    t = 51
    const pattern = ['high', 'low', 'high', 'low', 'high']
    for (let i = 0; i < pattern.length + d.extra; i++) {
      const kind = pattern[i % pattern.length]
      const fromLeft = i % 2 === 1
      at(t, () => this.wall(kind, fromLeft))
      if (i === 1 || i === 3) at(t + 0.6, () => this.vomit())
      t += 2.6 / Math.max(1, d.dens * 0.85)
    }
    return { events: ev, duration: Math.max(66, t + 2.5), tempos: [[16, 1.05], [32, 1.1], [50, 1.2]] }
  }
  hang() {
    const bottom = GROUND_Y - 30
    this.g.haz.push(
      new Cane({ cx: VW + 30, cy: (bottom - 12) / 2, len: bottom + 12, thick: 10, angle: Math.PI / 2, vx: -115 * this.d.speed, warn: 0.9 * this.d.warn, warnBox: { x: VW - 20, y: 0, w: 20, h: bottom } }),
    )
    this.throwing()
  }
  spin(low) {
    const home = this.x + 20
    this.g.haz.push(
      new Cane({
        cx: this.x + 10,
        cy: low ? GROUND_Y - 12 : 96,
        len: 40,
        spin: 9,
        vx: -150 * this.d.speed,
        warn: 0.7 * this.d.warn,
        warnBox: { x: 0, y: (low ? GROUND_Y - 12 : 96) - 1, w: this.x, h: 2 },
        script: (cn) => {
          if (cn.vx < 0 && cn.cx < 20) {
            cn.vx = -cn.vx
            sfx.whoosh()
          }
          if (cn.vx > 0 && cn.cx > home) cn.dead = true
        },
      }),
    )
    this.throwing()
  }
  descend(side) {
    const x0 = side === 0 ? 6 : 150
    const len = 148
    const d = this.d
    this.g.haz.push(
      new Cane({
        cx: x0 + len / 2,
        cy: -14,
        len,
        thick: 10,
        warn: 1.05 * d.warn,
        vy: 60 * d.speed,
        warnBox: { x: x0, y: GROUND_Y - 3, w: len, h: 3 },
        script: (cn, dt) => {
          if (cn.vy > 0 && cn.cy >= GROUND_Y - 6) {
            cn.cy = GROUND_Y - 6
            cn.vy = 0
            cn.hold = 0.4
            sfx.shake()
          } else if (cn.vy === 0 && cn.hold !== undefined) {
            cn.hold -= dt
            if (cn.hold <= 0) cn.vy = -110 * d.speed
          }
        },
      }),
    )
  }
  diagonal() {
    this.g.haz.push(new Cane({ cx: VW + 50, cy: 92, len: 96, thick: 9, angle: 0.42, vx: -105 * this.d.speed, warn: 0.8 * this.d.warn, warnBox: { x: VW - 16, y: 70, w: 16, h: 46 } }))
  }
  // A wall of cane with one gap. 'high' gap: jump through it. 'low' gap: stay on the floor.
  wall(kind, fromLeft) {
    const gap = kind === 'high' ? { y: 66, h: 40 } : { y: GROUND_Y - 32, h: 40 }
    const vx = (fromLeft ? 1 : -1) * 100 * this.d.speed
    const x = fromLeft ? -30 : VW + 30
    const warnBox = fromLeft ? { x: 0, y: 0, w: 14, h: GROUND_Y } : { x: VW - 14, y: 0, w: 14, h: GROUND_Y }
    const topLen = gap.y + 12
    const botTop = gap.y + gap.h
    const botLen = GROUND_Y + 8 - botTop
    const opts = { thick: 12, angle: Math.PI / 2, vx, warn: 1.0 * this.d.warn }
    this.g.haz.push(new Cane({ ...opts, warnBox, cx: x, cy: gap.y - topLen / 2, len: topLen }))
    this.g.haz.push(new Cane({ ...opts, cx: x, cy: botTop + botLen / 2, len: botLen }))
    this.throwing()
  }
  vomit() {
    const b = this.bub
    sfx.vomit()
    b.text = { text: 'BLEH!', until: this.g.t + 0.8 }
    const n = 2 + (this.d.extra > 1 ? 1 : 0)
    for (let i = 0; i < n; i++) this.g.haz.push(new Glob(b.x + 14, b.y + 26, (i - (n - 1) / 2) * 50 + this.rng.range(-15, 15), 44, 16 * this.d.life))
  }
  updateFight(dt) {
    super.updateFight(dt)
    this.float(dt)
  }
  idle(dt) {
    super.idle(dt)
    this.float(dt)
  }
  float(dt) {
    const want = this.mood === 'defeated' ? GROUND_Y - this.h : this.baseY + Math.sin(this.g.t * 1.8) * 5
    this.y += (want - this.y) * Math.min(1, dt * 3)
    const b = this.bub
    b.t += dt
    b.x = 110 + Math.sin(b.t * 0.6) * 90
    b.y = 14 + Math.sin(b.t * 2.1) * 4
  }
  draw(c, t) {
    super.draw(c, t)
    drawSprite(c, SPR.bubble, this.bub.x, this.bub.y + Math.round(Math.sin(t * 3)))
  }
}

const CLASSES = { jax: Jax, ragatha: Ragatha, gangle: Gangle, kinger: Kinger, caine: Caine }

export function makeBoss(g, index, d, seed) {
  const info = BOSSES[index]
  return new CLASSES[info.key](g, info, d, seed)
}
