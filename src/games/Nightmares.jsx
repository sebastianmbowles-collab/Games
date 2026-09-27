import { useCallback, useEffect, useRef, useState } from 'react'
import './nightmares/nightmares.css'
import { DREAMS, MONSTERS, ITEMS, BEDTIME_TALK, WAKE_LINES } from './nightmares/dreams'
import { W, H } from './nightmares/hotspots'
import { createRoom } from './nightmares/scene3d'
import { drawHud, drawScare, drawBlanketView, drawFearVignette, drawHallucination } from './nightmares/hud'
import { makeCanvas } from './nightmares/textures'
import { createDream, step, HOUR_LENGTH, BATTERY_SECONDS } from './nightmares/engine'
import { sfx, startDrone, stopDrone, setDanger, stopVoices, isMuted, setMuted } from './nightmares/sound'

const PROGRESS_KEY = 'nightmaresProgress'
const SCARE_TIME = 2.2
const FALL_ASLEEP_TIME = 3

function loadProgress() {
  try {
    const n = Number(localStorage.getItem(PROGRESS_KEY))
    return Number.isFinite(n) ? Math.max(0, Math.min(DREAMS.length - 1, n)) : 0
  } catch {
    return 0
  }
}

function saveProgress(n) {
  try {
    localStorage.setItem(PROGRESS_KEY, String(n))
  } catch {
    // not saved, that's fine
  }
}

// Film grain, made once and slid around by CSS (like The Wicked Side).
let grainUrl = null
function getGrain() {
  if (!grainUrl) {
    grainUrl = makeCanvas(256, 256, (g, w, h) => {
      const img = g.createImageData(w, h)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v
        img.data[i + 3] = 255
      }
      g.putImageData(img, 0, 0)
    }).toDataURL()
  }
  return grainUrl
}

// Works on its own, or inside an arcade that passes onExit to leave the game.
export default function Nightmares({ onExit }) {
  const glRef = useRef(null)
  const hudRef = useRef(null)
  const stageRef = useRef(null)
  const [phase, setPhaseState] = useState('title')
  const phaseRef = useRef('title')
  const [dreamIndex, setDreamIndex] = useState(0)
  const [unlocked, setUnlocked] = useState(loadProgress)
  const [talkLine, setTalkLine] = useState(0)
  const [scarer, setScarer] = useState(null)
  const [muted, setMutedState] = useState(isMuted)
  const [held, setHeld] = useState({ hide: false, left: false, right: false })
  const [noGL, setNoGL] = useState(false)

  const dreamRef = useRef(null)
  const phaseStart = useRef(0)
  const input = useRef({ down: false, aim: { x: W / 2, y: H / 2 }, keys: {}, btns: {}, clicks: [] })

  const setPhase = useCallback((p) => {
    phaseRef.current = p
    phaseStart.current = performance.now()
    setPhaseState(p)
  }, [])

  // Bring the chosen dream to life and start playing.
  const beginDream = useCallback(() => {
    dreamRef.current = createDream(dreamIndex)
    input.current.clicks = []
    startDrone()
    setPhase('playing')
  }, [dreamIndex, setPhase])

  const finishDream = useCallback(
    (s) => {
      stopDrone()
      stopVoices()
      if (s.over === 'won') {
        sfx.alarm()
        sfx.win()
        const next = Math.min(DREAMS.length - 1, s.dreamIndex + 1)
        if (next > unlocked) {
          setUnlocked(next)
          saveProgress(next)
        }
        setPhase(s.dreamIndex === DREAMS.length - 1 ? 'ending' : 'morning')
      } else {
        sfx.scream()
        setScarer(s.scarer)
        setPhase('scare')
      }
    },
    [setPhase, unlocked],
  )

  // The loop reads the current dream number through a ref so it doesn't restart.
  const dreamIndexRef = useRef(dreamIndex)
  useEffect(() => {
    dreamIndexRef.current = dreamIndex
  }, [dreamIndex])

  // The 3D room (made once).
  const roomRef = useRef(null)
  useEffect(() => {
    try {
      roomRef.current = createRoom(glRef.current)
    } catch {
      setNoGL(true)
      return
    }
    const onResize = () => roomRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      roomRef.current?.dispose()
      roomRef.current = null
    }
  }, [])

  // The animation loop: runs the dream and draws whatever scene we're on.
  useEffect(() => {
    const ctx = hudRef.current.getContext('2d')
    let raf
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const since = (now - phaseStart.current) / 1000
      const p = phaseRef.current
      const inp = input.current
      const room = roomRef.current
      ctx.clearRect(0, 0, W, H)

      if (p === 'playing' && dreamRef.current) {
        const s = dreamRef.current
        step(s, dt, {
          down: inp.down,
          aim: inp.aim,
          hide: !!(inp.keys.hide || inp.btns.hide),
          holdLeft: !!(inp.keys.left || inp.btns.left),
          holdRight: !!(inp.keys.right || inp.btns.right),
          clicks: inp.clicks,
        })
        inp.clicks = []
        for (const e of s.events) sfx[e.name]?.(e.key)
        setDanger(s.danger)
        room?.update({ ...s, mode: 'dream', tint: s.dream.tint })
        if (s.hiding) {
          drawBlanketView(ctx, s.t, s.danger)
        } else {
          drawFearVignette(ctx, s.fear, s.t)
          drawHud(ctx, { ...s, title: s.dream.title, hourLength: HOUR_LENGTH, batterySeconds: BATTERY_SECONDS })
        }
        if (s.hallu) drawHallucination(ctx, s.hallu.kind, s.t)
        if (s.over) finishDream(s)
      } else if (p === 'scare') {
        drawScare(ctx, dreamRef.current?.scarer ?? 'fear', since / SCARE_TIME, t)
        if (since >= SCARE_TIME) setPhase('woke')
      } else if (p === 'title' || p === 'dreamIntro') {
        const tint = DREAMS[p === 'title' ? 0 : dreamIndexRef.current].tint
        const peek = p === 'title' ? { leftDoor: { stage: 1 }, rightDoor: { stage: 2 } } : {}
        room?.update({ mode: 'dream', t, threats: peek, curtain: 0, aim: inp.aim, lightOn: false, battery: 100, flash: 0, tint, fear: 0, danger: 0 })
      } else if (p === 'falling') {
        room?.update({ mode: 'bedtime', t, curtain: 0, aim: inp.aim })
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, since / FALL_ASLEEP_TIME)})`
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = 'center'
        ctx.font = 'italic 26px "IM Fell English", Georgia, serif'
        ctx.fillStyle = `rgba(228,220,203,${Math.min(1, since / 1.5) * (1 - Math.max(0, since - FALL_ASLEEP_TIME))})`
        ctx.fillText('Leon closes his eyes...', W / 2, H / 2)
        ctx.textAlign = 'left'
        if (since >= FALL_ASLEEP_TIME + 0.8) setPhase('dreamIntro')
      } else {
        room?.update({ mode: p === 'morning' || p === 'ending' ? 'morning' : 'bedtime', t, curtain: 0, aim: inp.aim })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [finishDream, setPhase])

  // SPACE = hide under the blanket, A = hold the left door, D = hold the right door.
  useEffect(() => {
    const KEYS = { Space: 'hide', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' }
    const down = (e) => {
      const k = KEYS[e.code]
      if (!k) return
      if (phaseRef.current === 'playing') e.preventDefault()
      input.current.keys[k] = true
    }
    const up = (e) => {
      const k = KEYS[e.code]
      if (k) input.current.keys[k] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      stopDrone()
      stopVoices()
    }
  }, [])

  function toStage(e) {
    const r = stageRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  function onPointerDown(e) {
    // Clicks on menu buttons shouldn't turn on the flashlight.
    if (e.target.closest('button')) return
    const pt = toStage(e)
    input.current.aim = pt
    input.current.down = true
    input.current.clicks.push(pt)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e) {
    input.current.aim = toStage(e)
  }
  function onPointerUp() {
    input.current.down = false
  }

  // On-screen buttons you hold down (for touch screens, or if you like clicking).
  function holdProps(which) {
    const set = (v) => {
      input.current.btns[which] = v
      setHeld((h) => ({ ...h, [which]: v }))
    }
    return {
      className: `nm-hold-btn ${held[which] ? 'is-on' : ''}`,
      onPointerDown: () => set(true),
      onPointerUp: () => set(false),
      onPointerLeave: () => set(false),
      onPointerCancel: () => set(false),
    }
  }

  function startBedtime(index) {
    setDreamIndex(index)
    setTalkLine(0)
    setPhase('bedtime')
  }

  function goToSleep() {
    sfx.sleep()
    setPhase('falling')
  }

  function toggleMute() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  function quit() {
    stopDrone()
    stopVoices()
    if (onExit) onExit()
    else setPhase('title')
  }

  const talk = BEDTIME_TALK[dreamIndex]
  const dream = DREAMS[dreamIndex]

  return (
    <div className="nm-screen">
      <div className="nm-topbar">
        <div className="nm-title">Nightmares</div>
        <div className="nm-top-buttons">
          <button className="nm-ghost" onClick={toggleMute}>
            {muted ? 'Sound: off' : 'Sound: on'}
          </button>
          <button className="nm-ghost" onClick={quit}>
            {onExit ? 'Exit' : 'Menu'}
          </button>
        </div>
      </div>

      <div
        className="nm-stage"
        ref={stageRef}
        style={{ cursor: phase === 'playing' ? 'crosshair' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={glRef} className="nm-gl" />
        <canvas ref={hudRef} width={W} height={H} className="nm-hud" />
        <div className="nm-fx nm-grain" style={{ backgroundImage: `url(${getGrain()})` }} />
        <div className="nm-fx nm-vignette" />

        {noGL && (
          <div className="nm-overlay">
            <p className="nm-text">This computer can't draw 3D graphics (WebGL is turned off), so Nightmares can't run here.</p>
          </div>
        )}

        {phase === 'title' && (
          <div className="nm-overlay nm-overlay-left">
            <div className="nm-kicker">Leon's bedroom · 12:00 A.M.</div>
            <h1 className="nm-logo">Nightmares</h1>
            <p className="nm-text">
              You are Leon. You are seven years old, and you are scared of the dark.
              <br />
              Every night you fall asleep... and wake up inside a bad dream.
              <br />
              Keep them away until the clock says <b>6:00</b>.
            </p>
            <div className="nm-items">
              {ITEMS.map((it) => (
                <div key={it.name} className="nm-item">
                  <b>{it.name}</b>
                  <span>{it.how}</span>
                </div>
              ))}
            </div>
            <div className="nm-row">
              <button className="nm-btn" onClick={() => startBedtime(unlocked)}>
                {unlocked > 0 ? `Continue: dream ${unlocked + 1}` : 'Go to bed'}
              </button>
              {unlocked > 0 &&
                DREAMS.slice(0, unlocked + 1).map((d, i) => (
                  <button key={d.title} className="nm-ghost" onClick={() => startBedtime(i)}>
                    Dream {i + 1}
                  </button>
                ))}
            </div>
            <p className="nm-small">Best with headphones and the lights off.</p>
          </div>
        )}

        {phase === 'bedtime' && (
          <div className="nm-overlay nm-overlay-bottom">
            <div className="nm-talk">
              <div className="nm-speaker">{talk[talkLine][0]}</div>
              <div className="nm-line">“{talk[talkLine][1]}”</div>
            </div>
            <div className="nm-row">
              {talkLine < talk.length - 1 ? (
                <button className="nm-btn" onClick={() => setTalkLine((n) => n + 1)}>
                  Next
                </button>
              ) : (
                <button className="nm-btn" onClick={goToSleep}>
                  Go to sleep
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'dreamIntro' && (
          <div className="nm-overlay">
            <div className="nm-kicker">
              Dream {dreamIndex + 1} of {DREAMS.length}
            </div>
            <h2 className="nm-dream-title">{dream.title}</h2>
            <p className="nm-text">{dream.intro}</p>
            <div className="nm-tips">
              {dream.newThreats.map((k) => (
                <div key={k} className="nm-tip">
                  <b>{MONSTERS[k].name}</b>
                  <span>{MONSTERS[k].how}</span>
                </div>
              ))}
            </div>
            <button className="nm-btn" onClick={beginDream}>
              Open your eyes
            </button>
          </div>
        )}

        {phase === 'woke' && (
          <div className="nm-overlay">
            <h2 className="nm-dream-title nm-blood">You woke up screaming.</h2>
            <p className="nm-text">
              {WAKE_LINES[scarer] ?? WAKE_LINES.fear}
              <br />
              Mom came running. “It was just a bad dream, Leon.”
            </p>
            <div className="nm-row">
              <button className="nm-btn" onClick={() => startBedtime(dreamIndex)}>
                Try again
              </button>
              <button className="nm-ghost" onClick={() => setPhase('title')}>
                Title
              </button>
            </div>
          </div>
        )}

        {phase === 'morning' && (
          <div className="nm-overlay nm-overlay-light">
            <div className="nm-kicker">6:00 A.M.</div>
            <h2 className="nm-dream-title">Morning.</h2>
            <p className="nm-text">
              Leon made it through <i>{dream.title}</i>.
            </p>
            <button className="nm-btn" onClick={() => startBedtime(dreamIndex + 1)}>
              Next night
            </button>
          </div>
        )}

        {phase === 'ending' && (
          <div className="nm-overlay nm-overlay-light">
            <div className="nm-kicker">6:00 A.M.</div>
            <h2 className="nm-dream-title">The last nightmare is over.</h2>
            <p className="nm-text">
              The sun is up and the monsters are gone.
              <br />
              Leon isn't scared of the dark anymore. Well... only a little bit.
            </p>
            <button className="nm-btn" onClick={() => setPhase('title')}>
              Title
            </button>
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <div className="nm-controls">
          <div className="nm-hold-row">
            <button {...holdProps('left')}>Hold left door (A)</button>
            <button {...holdProps('hide')}>Hide (Space)</button>
            <button {...holdProps('right')}>Hold right door (D)</button>
          </div>
          <p className="nm-help">
            Hold the mouse: flashlight (1 minute of battery) · A / D: hold a door shut (no flashlight while you do) ·
            click the window: curtains · click the computer: switch it off · Space: hide under the blanket
          </p>
        </div>
      )}
    </div>
  )
}
