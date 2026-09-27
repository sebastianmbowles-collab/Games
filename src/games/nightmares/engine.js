// The rules of a Nightmares dream: monsters creep closer, Leon fights back
// with his flashlight, the curtains, the computer switch and his blanket.

import { DREAMS } from './dreams'
import { inHotspot } from './hotspots'

export const HOUR_LENGTH = 14 // seconds for each hour on the clock
export const NIGHT_LENGTH = HOUR_LENGTH * 6 // 12 AM until 6 AM

export const BATTERY_SECONDS = 60 // the flashlight only has 1 minute of battery all night
const DRAIN = 100 / BATTERY_SECONDS
const HOLD_TO_SCARE = 2 // seconds holding a door shut until the shadow gives up
const LIGHT_TO_SCARE = 0.9 // seconds of light that make a monster run away
const HIDE_TO_CALM = 2.5 // seconds under the blanket that put the paintings to sleep
const CURTAIN_TIME = 8 // seconds the curtains stay closed
const LIGHT_BEATS = ['leftDoor', 'rightDoor', 'underBed']

const rand = (a, b) => a + Math.random() * (b - a)

export function createDream(index) {
  const dream = DREAMS[index]
  const threats = {}
  dream.threats.forEach((key, i) => {
    const timer = 4 + i * 1.3 + Math.random() * 4
    threats[key] = { stage: 0, timer, timerMax: timer, light: 0, hide: 0, held: 0, cooldown: 0 }
  })
  return {
    dreamIndex: index,
    dream,
    t: 0,
    battery: 100,
    batteryDead: false,
    fear: 0,
    lightOn: false,
    hiding: false,
    holding: { leftDoor: false, rightDoor: false },
    aim: { x: 480, y: 300 },
    curtainTime: 0,
    curtain: 0,
    threats,
    events: [],
    over: null,
    scarer: null,
    flash: 0,
    shake: 0,
    nextThunder: rand(8, 20),
    nextWhisper: rand(8, 16),
    nextBeat: 0,
    danger: 0,
    walker: null,
    nextWalker: rand(10, 22),
    hallu: null,
    nextHallu: rand(6, 12),
    nextVoice: rand(9, 18),
    nextBreath: 0,
  }
}

function resetTimer(s, th, extra = 0) {
  const [lo, hi] = s.dream.interval
  th.timer = rand(lo, hi) + extra
  th.timerMax = th.timer
}

function advance(s, key, th) {
  th.stage += 1
  if (th.stage > 3) {
    s.over = 'scare'
    s.scarer = key
    return
  }
  // Give Leon a fair chance once a monster is right next to him.
  if (th.stage === 3) {
    th.timer = Math.max(th.timer, 3.5)
    th.timerMax = th.timer
    s.shake = 6
  }
  const say = (name) => s.events.push({ name, key })
  if (key === 'leftDoor' || key === 'rightDoor') say(['steps', 'creak', 'warn'][th.stage - 1])
  else if (key === 'window') {
    if (th.stage === 2) say('tap')
    if (th.stage === 3) say('scratch')
  } else if (key === 'computer') say(['static', 'glitch', 'glitch'][th.stage - 1])
  else if (key === 'paintings') say(th.stage === 3 ? 'angry' : 'paintings')
  else if (key === 'underBed') say('growl')
  if (th.stage === 3 && key !== 'leftDoor' && key !== 'rightDoor') say('warn')
  if (th.stage === 3) {
    say('screech')
    if (Math.random() < 0.5) s.events.push({ name: 'voice', key: pick(CLOSE_LINES) })
  }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const WHISPERS = ['Leeeeon...', 'Leon... I can see you.', 'Why are you still awake, Leon?', 'Come and play with us, Leon.', "Don't look behind you.", 'The dark is where we live.']
const CLOSE_LINES = ["I'm right here, Leon.", 'Found you.', "You can't hide from me."]

// input = { down, aim: {x, y}, hide, holdLeft, holdRight, clicks: [{x, y}] }
export function step(s, dt, input) {
  if (s.over) return
  s.events = []
  s.t += dt
  if (s.t >= NIGHT_LENGTH) {
    s.over = 'won'
    return
  }
  const hour = Math.floor(s.t / HOUR_LENGTH)
  s.hiding = input.hide
  s.aim = input.aim
  // Leon can't hold a door shut from under the blanket.
  s.holding = { leftDoor: input.holdLeft && !s.hiding, rightDoor: input.holdRight && !s.hiding }
  const busyHands = s.holding.leftDoor || s.holding.rightDoor

  // Flashlight. Its battery never comes back, so don't waste it!
  const wasOn = s.lightOn
  s.lightOn = input.down && !s.hiding && !busyHands && !s.batteryDead
  if (s.lightOn) {
    s.battery -= DRAIN * dt
    if (s.battery <= 0) {
      s.battery = 0
      s.batteryDead = true
      s.lightOn = false
    }
  }
  if (wasOn !== s.lightOn) s.events.push({ name: 'click' })

  // Clicking things in the room.
  if (!s.hiding) {
    for (const c of input.clicks) {
      if (inHotspot('window', c.x, c.y) && s.curtainTime <= 0) {
        s.curtainTime = CURTAIN_TIME
        s.events.push({ name: 'curtain' })
        const w = s.threats.window
        if (w && w.stage > 0) {
          w.stage = 0
          resetTimer(s, w, 1)
        }
      }
      const pc = s.threats.computer
      if (pc && pc.stage > 0 && inHotspot('computer', c.x, c.y)) {
        pc.stage = 0
        resetTimer(s, pc, 1)
        s.events.push({ name: 'powerOff' })
      }
    }
  }
  if (s.curtainTime > 0) {
    s.curtainTime -= dt
    if (s.curtainTime <= 0) s.events.push({ name: 'curtain' })
  }
  const target = s.curtainTime > 0 ? 1 : 0
  s.curtain += Math.sign(target - s.curtain) * Math.min(Math.abs(target - s.curtain), dt * 3)

  // Monsters.
  const chance = s.dream.chance + hour * 0.03
  for (const [key, th] of Object.entries(s.threats)) {
    th.cooldown -= dt
    const lit = s.lightOn && inHotspot(key, s.aim.x, s.aim.y, 12)
    let speed = 1

    if (LIGHT_BEATS.includes(key)) {
      if (lit && th.stage > 0) {
        speed = 0
        th.light += dt
        if (th.light >= LIGHT_TO_SCARE) {
          th.stage = 0
          th.light = 0
          resetTimer(s, th, 2)
          s.events.push({ name: 'flee', key })
        }
      } else {
        th.light = Math.max(0, th.light - dt * 0.5)
      }
      if (key === 'underBed' && s.hiding) speed = 2
    }

    if (s.holding[key]) {
      // The door is held shut: the shadow can't get in, and soon gives up.
      speed = 0
      if (th.stage > 0) {
        const before = th.held
        th.held += dt
        if (Math.floor(before / 0.7) !== Math.floor(th.held / 0.7)) s.events.push({ name: 'bang', key })
        if (th.held >= HOLD_TO_SCARE) {
          th.stage = 0
          th.held = 0
          resetTimer(s, th, 2)
          s.events.push({ name: 'flee', key })
        }
      }
    } else if (th.held) {
      th.held = 0
    }

    if (key === 'window' && s.curtainTime > 0) speed = 0

    if (key === 'paintings') {
      if (lit && th.stage > 0 && th.cooldown <= 0) {
        th.cooldown = 1.2
        s.events.push({ name: 'angry', key })
        advance(s, key, th)
        if (s.over) return
      }
      if (s.hiding) {
        speed = 0
        if (th.stage > 0) {
          th.hide += dt
          if (th.hide >= HIDE_TO_CALM) {
            th.stage = 0
            th.hide = 0
            resetTimer(s, th, 1)
            s.events.push({ name: 'retreat', key })
          }
        }
      } else {
        th.hide = 0
      }
    }

    th.timer -= dt * speed
    if (th.timer <= 0) {
      resetTimer(s, th)
      if (Math.random() < chance) {
        advance(s, key, th)
        if (s.over) return
      }
    }
  }
  s.danger = Math.max(0, ...Object.values(s.threats).map((th) => th.stage))
  const pc = s.threats.computer
  s.computerProgress = pc && pc.stage >= 2 ? 1 - Math.max(0, pc.timer) / pc.timerMax : 0

  // How scared Leon is. The dark makes it go up, light and hiding bring it down.
  let rise = 0.75
  if (s.curtain > 0.5) rise += 0.6
  if (s.batteryDead) rise += 0.5
  for (const th of Object.values(s.threats)) if (th.stage >= 2) rise += (th.stage - 1) * 0.35
  if (s.lightOn) rise -= 3.2
  if (s.hiding) rise -= 2.2
  s.fear = Math.max(0, Math.min(100, s.fear + rise * dt))
  if (s.fear >= 100) {
    s.over = 'scare'
    s.scarer = 'fear'
    return
  }

  // Spooky extras.
  if (s.fear > 65) {
    s.nextBeat -= dt
    if (s.nextBeat <= 0) {
      s.nextBeat = 1.3 - (s.fear - 65) / 60
      s.events.push({ name: 'heartbeat' })
    }
  }
  s.nextWhisper -= dt
  if (s.nextWhisper <= 0) {
    s.nextWhisper = rand(10, 20)
    s.events.push({ name: 'whisper' })
  }
  // A creepy voice calls Leon's name.
  s.nextVoice -= dt
  if (s.nextVoice <= 0) {
    s.nextVoice = rand(14, 26)
    s.events.push({ name: 'voice', key: pick(WHISPERS) })
  }
  // Something tall walks past the back wall...
  if (s.walker) {
    s.walker.p += dt / 2.2
    if (s.walker.p >= 1) s.walker = null
  } else {
    s.nextWalker -= dt
    if (s.nextWalker <= 0) {
      s.nextWalker = rand(18, 32)
      s.walker = { p: 0 }
      s.events.push({ name: 'steps', key: 'window' })
    }
  }
  // When Leon is really scared, he starts seeing things.
  if (s.hallu) {
    s.hallu.left -= dt
    if (s.hallu.left <= 0) s.hallu = null
  } else if (s.fear > 55) {
    s.nextHallu -= dt
    if (s.nextHallu <= 0) {
      s.nextHallu = rand(6, 13)
      s.hallu = { kind: pick([...Object.keys(s.threats), 'fear']), left: 0.13 }
      s.events.push({ name: 'sting' })
    }
  }
  // Heavy breathing right outside the blanket.
  if (s.hiding && s.danger >= 2) {
    s.nextBreath -= dt
    if (s.nextBreath <= 0) {
      s.nextBreath = 2.4
      s.events.push({ name: 'breath' })
    }
  }
  if (s.dream.thunder) {
    s.nextThunder -= dt
    if (s.nextThunder <= 0) {
      s.nextThunder = rand(14, 26)
      s.flash = 0.35
      s.events.push({ name: 'thunder' })
    }
  }
  s.flash = Math.max(0, s.flash - dt)
  s.shake = Math.max(0, s.shake - dt * 12)
}
