import { EMOTE_ALT, EMOTE_KEYS, SCHEMES } from './data'

// Keyboard + gamepad input. `keys` holds codes that are down and codes pressed
// since the last step. Gamepads are polled once per frame.
export function createInput() {
  const keys = { down: new Set(), pressed: new Set() }
  const pads = {}
  return {
    keys,
    pads,
    pollPads() {
      const list = navigator.getGamepads ? navigator.getGamepads() : []
      for (const gp of list) {
        if (!gp) continue
        const prev = pads[gp.index]?.buttons || []
        const buttons = gp.buttons.map((b) => b.pressed)
        pads[gp.index] = {
          id: gp.id,
          axes: gp.axes.slice(0, 2),
          buttons,
          pressed: buttons.map((b, i) => b && !prev[i]),
        }
      }
    },
    clearPressed() {
      keys.pressed.clear()
      for (const p of Object.values(pads)) p.pressed = p.pressed.map(() => false)
    },
  }
}

export function readCommand(input, src) {
  if (src.type === 'pad') {
    const p = input.pads[src.index]
    if (!p) return blank()
    let mx = Math.abs(p.axes[0]) > 0.3 ? p.axes[0] : 0
    let my = Math.abs(p.axes[1]) > 0.3 ? p.axes[1] : 0
    if (p.buttons[14]) mx = -1
    if (p.buttons[15]) mx = 1
    if (p.buttons[12]) my = -1
    if (p.buttons[13]) my = 1
    return {
      mx,
      my,
      jump: !!p.pressed[0],
      bonk: !!(p.buttons[2] || p.buttons[1]),
      dash: !!(p.pressed[5] || p.pressed[7]),
      shield: !!(p.pressed[4] || p.pressed[3]),
      emote: p.pressed[8] ? 2 : -1,
      aim: null,
    }
  }
  const s = SCHEMES[src.scheme]
  const held = (l) => l.some((k) => input.keys.down.has(k))
  const tapped = (l) => l.some((k) => input.keys.pressed.has(k))
  let emote = -1
  if (src.scheme !== 'p2') {
    EMOTE_KEYS.forEach((k, i) => {
      if (input.keys.pressed.has(k)) emote = i
    })
    for (const [k, i] of Object.entries(EMOTE_ALT)) if (input.keys.pressed.has(k)) emote = i
  }
  return {
    mx: (held(s.right) ? 1 : 0) - (held(s.left) ? 1 : 0),
    my: (held(s.down) ? 1 : 0) - (held(s.up) ? 1 : 0),
    jump: tapped(s.jump),
    bonk: held(s.bonk) || tapped(s.bonk),
    dash: tapped(s.dash),
    shield: tapped(s.shield),
    emote,
    aim: null,
  }
}

const blank = () => ({ mx: 0, my: 0, jump: false, bonk: false, dash: false, shield: false, emote: -1, aim: null })

export function anyPadButton(input) {
  for (const [i, p] of Object.entries(input.pads)) if (p.pressed.some(Boolean)) return Number(i)
  return -1
}
