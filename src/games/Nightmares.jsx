import { useCallback, useEffect, useRef, useState } from 'react'
import './nightmares/nightmares.css'
import { DREAMS, MONSTERS, ITEMS, BEDTIME_TALK, WAKE_LINES } from './nightmares/dreams'
import { W, H, drawScene, drawHud, drawScare, drawLeon } from './nightmares/room'
import { createDream, step, HOUR_LENGTH, BATTERY_SECONDS } from './nightmares/engine'
import { sfx, startDrone, stopDrone, setDanger, stopVoices, isMuted, setMuted } from './nightmares/sound'

const PROGRESS_KEY = 'nightmaresProgress'
const SCARE_TIME = 2.2
const FALL_ASLEEP_TIME = 2.6

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

// A still picture of Leon's face for the talking scenes.
function LeonFace({ fear = 0.3, mode = 'awake', size = 96 }) {
  const ref = useRef(null)
  useEffect(() => {
    const ctx = ref.current.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    drawLeon(ctx, size / 2, size * 0.42, size * 0.32, fear, 0, mode)
  }, [fear, mode, size])
  return <canvas ref={ref} width={size} height={size} className="nm-face" />
}

// Works on its own, or inside an arcade that passes onExit to leave the game.
export default function Nightmares({ onExit }) {
  const canvasRef = useRef(null)
  const [phase, setPhaseState] = useState('title')
  const phaseRef = useRef('title')
  const [dreamIndex, setDreamIndex] = useState(0)
  const [unlocked, setUnlocked] = useState(loadProgress)
  const [talkLine, setTalkLine] = useState(0)
  const [scarer, setScarer] = useState(null)
  const [muted, setMutedState] = useState(isMuted)
  const [held, setHeld] = useState({ hide: false, left: false, right: false })

  const dreamRef = useRef(null)
  const phaseStart = useRef(0)
  const input = useRef({ down: false, aim: { x: 480, y: 300 }, keys: {}, btns: {}, clicks: [] })

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

  // The animation loop: runs the dream and draws whatever scene we're on.
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let raf
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const since = (now - phaseStart.current) / 1000
      const p = phaseRef.current
      const inp = input.current
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
        drawScene(ctx, { ...s, mode: 'dream', tint: s.dream.tint })
        if (!s.hiding) drawHud(ctx, { ...s, title: s.dream.title, hourLength: HOUR_LENGTH, batterySeconds: BATTERY_SECONDS })
        if (s.over) finishDream(s)
      } else if (p === 'scare') {
        drawScare(ctx, dreamRef.current?.scarer ?? 'fear', since / SCARE_TIME, t)
        if (since >= SCARE_TIME) setPhase('woke')
      } else if (p === 'title' || p === 'dreamIntro') {
        const tint = DREAMS[p === 'title' ? 0 : dreamIndexRef.current].tint
        const peek = p === 'title' ? { leftDoor: { stage: 1 }, rightDoor: { stage: 1 } } : {}
        drawScene(ctx, { mode: 'dream', t, threats: peek, curtain: 0, aim: { x: -500, y: -500 }, lightOn: false, battery: 100, flash: 0, tint })
      } else if (p === 'falling') {
        drawScene(ctx, { mode: 'bedtime', t, curtain: 0, aim: inp.aim })
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, since / FALL_ASLEEP_TIME)})`
        ctx.fillRect(0, 0, W, H)
        drawLeon(ctx, W / 2, H / 2, 70, 0, t, 'sleep')
        if (since >= FALL_ASLEEP_TIME + 0.6) setPhase('dreamIntro')
      } else {
        drawScene(ctx, { mode: p === 'morning' || p === 'ending' ? 'morning' : 'bedtime', t, curtain: 0, aim: inp.aim })
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

  function toCanvas(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  function onPointerDown(e) {
    const pt = toCanvas(e)
    input.current.aim = pt
    input.current.down = true
    input.current.clicks.push(pt)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e) {
    input.current.aim = toCanvas(e)
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
    <div className="game-screen nm-screen">
      <div className="game-topbar nm-topbar">
        <h2 className="nm-title">🌙 Nightmares</h2>
        <div className="nm-top-buttons">
          <button className="exit-btn" onClick={toggleMute}>
            {muted ? '🔇 Sound off' : '🔊 Sound on'}
          </button>
          <button className="exit-btn" onClick={quit}>
            {onExit ? 'Exit' : 'Menu'}
          </button>
        </div>
      </div>

      <div className="nm-stage">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="nm-canvas"
          style={{ cursor: phase === 'playing' ? 'crosshair' : 'default' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />

        {phase === 'title' && (
          <div className="nm-overlay">
            <h1 className="nm-logo">NIGHTMARES</h1>
            <LeonFace fear={0.75} />
            <p className="nm-text">
              You are <b>Leon</b>. You are 7 years old, and you are scared of the dark.
              <br />
              Every night you fall asleep... and wake up inside a bad dream.
              <br />
              Keep the monsters away until the clock says <b>6 AM</b>!
            </p>
            <div className="nm-items">
              <div className="nm-kicker">Your items</div>
              {ITEMS.map((it) => (
                <div key={it.name} className="nm-item">
                  <span className="nm-item-icon">{it.icon}</span>
                  <b>{it.name}</b>
                  <span>{it.how}</span>
                </div>
              ))}
            </div>
            <div className="nm-row">
              <button className="nm-btn" onClick={() => startBedtime(unlocked)}>
                {unlocked > 0 ? `Continue: Dream ${unlocked + 1}` : 'Go to bed'}
              </button>
            </div>
            {unlocked > 0 && (
              <div className="nm-row">
                {DREAMS.slice(0, unlocked + 1).map((d, i) => (
                  <button key={d.title} className="nm-chip" onClick={() => startBedtime(i)}>
                    Dream {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'bedtime' && (
          <div className="nm-overlay nm-overlay-bottom">
            <div className="nm-talk">
              {talk[talkLine][0] === 'Leon' ? <LeonFace fear={0.45} size={80} /> : <div className="nm-mom">👩</div>}
              <div>
                <div className="nm-speaker">{talk[talkLine][0]}</div>
                <div className="nm-line">{talk[talkLine][1]}</div>
              </div>
            </div>
            <div className="nm-row">
              {talkLine < talk.length - 1 ? (
                <button className="nm-btn" onClick={() => setTalkLine((n) => n + 1)}>
                  Next ▶
                </button>
              ) : (
                <button className="nm-btn" onClick={goToSleep}>
                  Go to sleep 😴
                </button>
              )}
            </div>
          </div>
        )}

        {phase === 'dreamIntro' && (
          <div className="nm-overlay">
            <div className="nm-kicker">Dream {dreamIndex + 1} of {DREAMS.length}</div>
            <h2 className="nm-dream-title">{dream.title}</h2>
            <p className="nm-text">{dream.intro}</p>
            <div className="nm-tips">
              {dream.newThreats.map((k) => (
                <div key={k} className="nm-tip">
                  <b>NEW: {MONSTERS[k].name}</b>
                  <span>{MONSTERS[k].how}</span>
                </div>
              ))}
            </div>
            <button className="nm-btn" onClick={beginDream}>
              Wake up in the dream...
            </button>
          </div>
        )}

        {phase === 'woke' && (
          <div className="nm-overlay">
            <h2 className="nm-dream-title">AAAAH!</h2>
            <LeonFace fear={1} />
            <p className="nm-text">
              {WAKE_LINES[scarer] ?? WAKE_LINES.fear}
              <br />
              Leon woke up screaming. Mom came running: "It was just a bad dream, Leon."
            </p>
            <div className="nm-row">
              <button className="nm-btn" onClick={() => startBedtime(dreamIndex)}>
                Try again
              </button>
              <button className="nm-chip" onClick={() => setPhase('title')}>
                Menu
              </button>
            </div>
          </div>
        )}

        {phase === 'morning' && (
          <div className="nm-overlay nm-overlay-light">
            <h2 className="nm-dream-title">6 AM — Good morning!</h2>
            <LeonFace fear={0} mode="happy" />
            <p className="nm-text">
              Leon made it through <b>{dream.title}</b>!
            </p>
            <button className="nm-btn" onClick={() => startBedtime(dreamIndex + 1)}>
              Next night ▶
            </button>
          </div>
        )}

        {phase === 'ending' && (
          <div className="nm-overlay nm-overlay-light">
            <h2 className="nm-dream-title">Leon beat every nightmare!</h2>
            <LeonFace fear={0} mode="happy" />
            <p className="nm-text">
              The sun is up and the monsters are gone.
              <br />
              Leon isn't scared of the dark anymore. (Well... only a little bit.)
            </p>
            <div className="nm-row">
              <button className="nm-btn" onClick={() => setPhase('title')}>
                Back to menu
              </button>
            </div>
          </div>
        )}
      </div>

      {phase === 'playing' && (
        <div className="nm-controls">
          <div className="nm-hold-row">
            <button {...holdProps('left')}>⬅ 🚪 Hold left door (A)</button>
            <button {...holdProps('hide')}>🛏️ Hide (SPACE)</button>
            <button {...holdProps('right')}>Hold right door (D) 🚪 ➡</button>
          </div>
          <p className="nm-help">
            <b>Hold the mouse</b> to shine your flashlight (only 1 minute of battery!) · <b>Hold A / D</b> to hold a
            door shut (no flashlight while your hands are busy) · <b>Click the window</b> to close the curtains ·{' '}
            <b>Click the computer</b> to switch it off · <b>Hold SPACE</b> to hide under the blanket
          </p>
        </div>
      )}
    </div>
  )
}
