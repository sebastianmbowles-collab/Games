import { useEffect, useRef, useState } from 'react'
import { FIGHTERS } from './fighters'
import { DIFFICULTY, createInput, createMatch, cpuThink, pressButton, step, snapshot, hydrate } from './engine'
import { drawMatch, LW, LH } from './draw'
import { arenaByKey } from './arenas'
import { playEvents } from './sound'
import { TouchPad } from './ui'

// Keyboard layouts. When one person plays on this computer, both layouts work.
const P1_KEYS = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  block: ['KeyS'],
  punch: ['KeyF'],
  kick: ['KeyG'],
  special: ['KeyH'],
  dodge: ['KeyR'],
  super: ['KeyT'],
}
const P2_KEYS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  block: ['ArrowDown'],
  punch: ['KeyJ'],
  kick: ['KeyK'],
  special: ['KeyL'],
  dodge: ['KeyU'],
  super: ['KeyI'],
}
const ATTACKS = ['punch', 'kick', 'special', 'dodge', 'super']
const HELD = ['left', 'right', 'up', 'block']

function keyMapsFor(mode) {
  if (mode === 'versus') return [P1_KEYS, P2_KEYS]
  const both = {}
  for (const k of Object.keys(P1_KEYS)) both[k] = [...P1_KEYS[k], ...P2_KEYS[k]]
  return [both, null]
}

// Typing in the chat box shouldn't make your fighter punch.
const typing = (e) => ['INPUT', 'TEXTAREA'].includes(e.target?.tagName)

// One match on the canvas.
// mode: 'cpu' | 'versus' (same keyboard) | 'training' | 'host' | 'guest' (online)
// picks: [{ def, costume }, { def, costume }]
export default function Fight({ picks, mode, difficulty, arena, names, bossFight, dummy, link, onOver, onLeave, touch, children }) {
  const canvasRef = useRef(null)
  const onOverRef = useRef(onOver)
  const onLeaveRef = useRef(onLeave)
  const dummyRef = useRef(dummy)
  // The local player's input. The touch pad and the game loop both write to it.
  const [myInput] = useState(createInput)

  useEffect(() => {
    onOverRef.current = onOver
    onLeaveRef.current = onLeave
    dummyRef.current = dummy
  })

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    const place = arenaByKey(arena)
    let match = createMatch(
      picks.map((p) => p.def),
      { gravity: place.gravity, slide: place.slide, training: mode === 'training', arena: place.key, names },
    )
    match.costumes = picks.map((p) => p.costume)
    match.bossFight = !!bossFight
    const inputs = [myInput, createInput()]
    const maps = keyMapsFor(mode)
    const held = new Set()
    const level = bossFight ? DIFFICULTY.hard : DIFFICULTY[difficulty]
    const mySide = mode === 'guest' ? 1 : mode === 'versus' ? null : 0
    const unsubs = []
    let reported = false
    let latest = null
    let lastHeld = ''

    if (mode === 'host') {
      unsubs.push(link.on('held', (msg) => Object.assign(inputs[1], msg.h)))
      unsubs.push(link.on('press', (msg) => ATTACKS.includes(msg.n) && pressButton(inputs[1], msg.n)))
    }
    if (mode === 'guest') unsubs.push(link.on('state', (msg) => (latest = msg.s)))

    const bound = new Set(maps.filter(Boolean).flatMap((m) => Object.values(m).flat()))
    function onKeyDown(e) {
      if (!bound.has(e.code) || typing(e)) return
      e.preventDefault()
      held.add(e.code)
      if (e.repeat) return
      maps.forEach((map, i) => {
        if (!map) return
        for (const a of ATTACKS) if (map[a].includes(e.code)) pressButton(inputs[i], a)
      })
    }
    const onKeyUp = (e) => held.delete(e.code)
    const onBlur = () => held.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    let raf
    let last = performance.now()
    function frame(now) {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      maps.forEach((map, i) => {
        if (!map) return
        const inp = inputs[i]
        for (const h of HELD) inp[h] = map[h].some((code) => held.has(code)) || !!inp[`pad_${h}`]
      })

      if (mode === 'guest') {
        // Send my buttons to the host, then draw whatever the host says is happening.
        const h = { left: myInput.left, right: myInput.right, up: myInput.up, block: myInput.block }
        const key = JSON.stringify(h)
        if (key !== lastHeld) {
          lastHeld = key
          link.send({ t: 'held', h })
        }
        for (const a of ATTACKS) {
          if (myInput.buf[a] > 0) {
            link.send({ t: 'press', n: a })
            myInput.buf[a] = 0
          }
        }
        if (latest) {
          match = hydrate(latest, FIGHTERS)
          playEvents(latest.events, match, mySide)
          latest = null
        }
      } else {
        if (mode === 'cpu') cpuThink(match, 1, inputs[1], level, dt)
        if (mode === 'training') cpuThink(match, 1, inputs[1], { dummy: dummyRef.current }, dt)
        step(match, inputs, dt)
        const events = match.events.splice(0)
        playEvents(events, match, mySide)
        if (mode === 'host') link.send({ t: 'state', s: snapshot(match, events) })
      }

      drawMatch(ctx, match)
      if (match.phase === 'over' && !reported) {
        reported = true
        onOverRef.current?.(match.matchWinner, match)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      unsubs.forEach((u) => u())
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      // Training reports how many hits you landed when you leave.
      onLeaveRef.current?.(match)
    }
  }, [picks, mode, difficulty, arena, names, bossFight, link, myInput])

  return (
    <>
      <div className="brawl-arena">
        <canvas ref={canvasRef} width={LW} height={LH} className="brawl-canvas" />
        {children}
      </div>
      {touch && <TouchPad input={myInput} />}
    </>
  )
}
