import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ACHIEVEMENTS } from './bonk/achievements'
import Achievements from './bonk/Achievements'
import { EMOTE_ALT, EMOTE_KEYS, EMOTES, GAME_KEYS } from './bonk/data'
import { createMatch, forceEvent, quitMatch, snapshot, step } from './bonk/engine'
import { createHub } from './bonk/hub'
import { createInput, readCommand } from './bonk/input'
import { createLoadingScene } from './bonk/loadingScene'
import Lobby from './bonk/Lobby'
import { createMatchView, drawOverlay } from './bonk/matchView'
import {
  findSecret,
  flush,
  hooks,
  lookAway,
  matchFinished,
  matchStarted,
  max,
  obbyFinished,
  onToast,
  startSession,
  stat,
  tickPlaytime,
  toast,
} from './bonk/profile'
import { loadSave, onSaveChange, persist } from './bonk/save'
import Shop from './bonk/Shop'
import { isMuted, setMuted, sfx, unlockAudio } from './bonk/sound'

const STEP = 1 / 120
const HAS_TOUCH = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

function TouchButton({ input, code, className, children }) {
  const press = (e) => {
    e.preventDefault()
    unlockAudio()
    if (!input.keys.down.has(code)) input.keys.pressed.add(code)
    input.keys.down.add(code)
  }
  const release = (e) => {
    e.preventDefault()
    input.keys.down.delete(code)
  }
  return (
    <button
      className={`bonk-touch-btn ${className || ''}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

function doHubEmote(hub, i) {
  const e = EMOTES[i]
  stat('emotes')
  hooks.emote(e.key)
  if (e.key === 'quack') {
    stat('quacks')
    sfx.quack()
    return
  }
  if (e.key === 'spin') stat('spins')
  if (e.key === 'flop') stat('flops')
  if (e.key === 'flip') stat('emote_flip')
  hub.emote(e.key)
}

export default function Bonk({ onExit }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const rendererRef = useRef(null)
  const ctrlRef = useRef(null)
  const [input] = useState(createInput)

  const [screen, setScreen] = useState('loading')
  const [progress, setProgress] = useState(0)
  const [overlay, setOverlay] = useState(null)
  const overlayOpen = useRef(null)
  const [hud, setHud] = useState(null)
  const [results, setResults] = useState(null)
  const [toasts, setToasts] = useState([])
  const [inObby, setInObby] = useState(false)
  const [, setTick] = useState(0)
  const [muted, setMutedState] = useState(() => !!loadSave().muted)
  const lastConfig = useRef(null)
  const save = loadSave()

  useEffect(() => {
    overlayOpen.current = overlay
  }, [overlay])
  useEffect(() => onSaveChange(() => setTick((n) => n + 1)), [])
  useEffect(
    () =>
      onToast((t) => {
        setToasts((list) => [...list.slice(-3), t])
        setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 3500)
      }),
    [],
  )
  useEffect(() => {
    setMuted(!!loadSave().muted)
  }, [])

  // ---------------------------------------------------------------- controllers

  const goHub = useCallback(() => {
    const renderer = rendererRef.current
    const hub = createHub(renderer, loadSave(), {
      stat,
      max,
      toast,
      secret: findSecret,
      open: (key) => {
        stat('menus')
        setOverlay(key)
      },
      obbyDone: (level, reward, time, falls) => obbyFinished(level, reward, time, falls),
      devpc: () => setOverlay('devpc'),
    })
    if (import.meta.env.DEV) window.__hub = hub
    let obbyShown = false
    const ctrl = {
      type: 'hub',
      hub,
      resize: (w, h) => hub.resize(w, h),
      frame(dt, ctx, width, height) {
        if (!overlayOpen.current) {
          for (let i = 0; i < EMOTE_KEYS.length; i++) if (input.keys.pressed.has(EMOTE_KEYS[i])) doHubEmote(hub, i)
          for (const [k, i] of Object.entries(EMOTE_ALT)) if (input.keys.pressed.has(k)) doHubEmote(hub, i)
          hub.step(dt, input.keys)
        }
        input.clearPressed()
        hub.render(renderer, dt)
        if (!!hub.P.obby !== obbyShown) {
          obbyShown = !!hub.P.obby
          setInObby(obbyShown)
        }
        ctx.clearRect(0, 0, width, height)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'
        ctx.font = '12px "Press Start 2P", monospace'
        for (const l of hub.labels(width, height)) {
          ctx.lineWidth = 5
          ctx.strokeStyle = 'rgba(20,10,30,0.85)'
          ctx.strokeText(l.text, l.x, l.y)
          ctx.fillStyle = l.color || '#fff'
          ctx.fillText(l.text, l.x, l.y)
        }
        if (hub.P.obby) {
          const text = `⏱ ${hub.P.obbyT.toFixed(1)}s`
          ctx.strokeText(text, width / 2, 70)
          ctx.fillStyle = '#fff'
          ctx.fillText(text, width / 2, 70)
        }
      },
    }
    ctrl.resize(stageRef.current.clientWidth, stageRef.current.clientHeight)
    ctrlRef.current = ctrl
    stat('welcome')
    setScreen('hub')
    setOverlay(null)
    setResults(null)
    setHud(null)
    flush(true)
  }, [input])

  const startMatch = useCallback(
    (config) => {
      unlockAudio()
      lastConfig.current = config
      setOverlay(null)
      setResults(null)
      const w = createMatch({ ...config, hooks })
      if (import.meta.env.DEV) window.__bonk = { w, forceEvent: (key) => forceEvent(w, key) }
      matchStarted(config)
      const renderer = rendererRef.current
      const view = createMatchView(renderer, w)
      let acc = 0
      let hudT = 0
      let done = false
      const ctrl = {
        type: 'match',
        w,
        resize: (width, height) => view.resize(width, height),
        frame(dt, ctx, width, height) {
          input.pollPads()
          acc += dt
          let first = true
          while (acc >= STEP) {
            step(w, STEP, (src) => readCommand(input, src))
            if (first) input.clearPressed()
            first = false
            acc -= STEP
          }
          view.update(dt)
          view.render()
          drawOverlay(ctx, view, width, height)
          hudT += dt
          if (hudT > 0.1) {
            hudT = 0
            setHud(snapshot(w))
          }
          if (w.phase === 'over' && !done) {
            done = true
            const earned = matchFinished(w.results, isMuted())
            setTimeout(() => setResults({ ...w.results, earned }), 1800)
          }
        },
      }
      ctrl.resize(stageRef.current.clientWidth, stageRef.current.clientHeight)
      ctrlRef.current = ctrl
      setScreen('match')
      setHud(snapshot(w))
    },
    [input],
  )

  // ---------------------------------------------------------------- renderer + loop

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    startSession()
    stat('loadings')

    const loading = createLoadingScene()
    ctrlRef.current = {
      type: 'loading',
      resize: (w, h) => loading.resize(w, h),
      frame(dt, ctx, width, height) {
        ctx.clearRect(0, 0, width, height)
        loading.frame(renderer, dt)
      },
    }

    const resize = () => {
      const el = stageRef.current
      if (!el) return
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h, false)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const ov = overlayRef.current
      ov.width = w * dpr
      ov.height = h * dpr
      ov.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
      ctrlRef.current?.resize(w, h)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(stageRef.current)
    resize()

    let raf
    let last = performance.now()
    let flushT = 0
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const el = stageRef.current
      const ctx = overlayRef.current.getContext('2d')
      try {
        ctrlRef.current?.frame(dt, ctx, el.clientWidth, el.clientHeight)
      } catch (err) {
        console.error(err)
      }
      tickPlaytime(dt)
      flushT += dt
      if (flushT > 0.5) {
        flushT = 0
        flush()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // A pretend loading bar while the duck chase plays.
    let p = 0
    const load = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 8)
      setProgress(p)
      if (p >= 100) clearInterval(load)
    }, 120)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(load)
      ro.disconnect()
      renderer.dispose()
      flush(true)
    }
  }, [])

  // Waiting on the title screen counts as "Buffering…"
  useEffect(() => {
    if (screen !== 'loading' || progress < 100) return
    const id = setTimeout(() => stat('buffering'), 10000)
    return () => clearTimeout(id)
  }, [screen, progress])

  // keyboard, focus
  useEffect(() => {
    const k = input.keys
    const down = (e) => {
      if (screen === 'loading') {
        if (progress >= 100) {
          unlockAudio()
          goHub()
        }
        return
      }
      if (overlayOpen.current) {
        if (e.code === 'Escape') setOverlay(null)
        return
      }
      if (GAME_KEYS.has(e.code)) e.preventDefault()
      if (!e.repeat) k.pressed.add(e.code)
      k.down.add(e.code)
      if (screen === 'hub' && ctrlRef.current?.hub) ctrlRef.current.hub.typeKey(e.code)
    }
    const up = (e) => k.down.delete(e.code)
    const blur = () => k.down.clear()
    const vis = () => {
      if (document.hidden) lookAway(screen === 'match')
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', vis)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [screen, progress, goHub, input])

  function onClickAnything(e) {
    if (e.target.closest('button')) {
      stat('buttons')
      sfx.click()
    }
  }

  function toggleMute() {
    const m = !muted
    setMuted(m)
    setMutedState(m)
    loadSave().muted = m
    persist()
    stat('settings')
  }

  function exitMatch() {
    const c = ctrlRef.current
    if (c?.type === 'match') quitMatch(c.w)
    goHub()
  }

  function devReward() {
    const s = loadSave()
    if (!s.stats.devBonus) {
      s.stats.devBonus = 1
      s.bb += 500
      persist()
      toast('💾 +500 BB from the developer!', 'ach')
    }
  }

  const unlocked = Object.keys(save.ach).length
  const me = hud?.players.find((p) => p.human)

  return (
    <div className="bonk-root" onClick={onClickAnything}>
      <div className="bonk-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="bonk-canvas" />
        <canvas ref={overlayRef} className="bonk-overlay-canvas" />

        {screen === 'loading' && (
          <div
            className="bonk-title"
            onClick={() => {
              if (progress >= 100) {
                unlockAudio()
                goHub()
              }
            }}
          >
            <h1 className="bonk-logo">BONK!</h1>
            <p>a rubber duck party brawl</p>
            {progress < 100 ? (
              <div className="bonk-loadbar">
                <div style={{ width: `${progress}%` }} />
                <span>Loading… {Math.floor(progress)}%</span>
              </div>
            ) : (
              <button className="bonk-go pulse">TAP OR PRESS ANY KEY</button>
            )}
          </div>
        )}

        {screen !== 'loading' && (
          <div className="bonk-topbar">
            <span className="bonk-pill">🪙 {save.bb.toLocaleString()} BB</span>
            <span className="bonk-pill">🏆 {unlocked}/{ACHIEVEMENTS.length}</span>
            {screen === 'match' && hud && (
              <span className="bonk-pill bonk-event">
                {hud.event ? `${hud.event.emoji} ${hud.event.name}` : `Next event in ${hud.nextEventIn}s`}
              </span>
            )}
            <span className="bonk-spacer" />
            {screen === 'hub' && (
              <>
                <button className="bonk-pill" onClick={() => setOverlay('play')}>▶ Play</button>
                <button className="bonk-pill" onClick={() => setOverlay('shop')}>🛒 Shop</button>
                <button className="bonk-pill" onClick={() => setOverlay('trophy')}>🏆</button>
                {inObby && (
                  <button className="bonk-pill" onClick={() => ctrlRef.current.hub.leaveObby()}>
                    Leave obby
                  </button>
                )}
              </>
            )}
            {screen === 'match' && (
              <button className="bonk-pill" onClick={exitMatch}>
                Quit
              </button>
            )}
            <button className="bonk-pill" onClick={toggleMute}>{muted ? '🔇' : '🔊'}</button>
            <button className="bonk-pill" onClick={onExit}>Exit</button>
          </div>
        )}

        {screen === 'match' && hud && (
          <div className="bonk-players">
            {hud.players.map((p) => (
              <div key={p.id} className={`bonk-pcard ${p.out ? 'is-out' : ''} ${p.human ? 'is-human' : ''}`} style={{ '--pc': p.color }}>
                <b>
                  {p.king ? '👑 ' : ''}
                  {p.human ? p.tag : p.name}
                </b>
                <span>{p.out ? 'OUT' : '🎈'.repeat(Math.min(6, p.balloons))}</span>
              </div>
            ))}
          </div>
        )}

        {screen === 'match' && me && !me.out && (
          <div className="bonk-cds">
            <span className={me.dashReady ? 'ready' : ''}>💨 Dash</span>
            <span className={me.shieldReady ? 'ready' : ''}>🛡️ Shield</span>
            <span className="ready">{me.hammer}</span>
          </div>
        )}

        {screen === 'hub' && !overlay && (
          <div className="bonk-hint">WASD move · Space jump (twice!) · Shift dash · 1 wave · 2 spin · Q quack · 4 flip · 5 flop</div>
        )}

        <div className="bonk-toasts">
          {toasts.map((t) => (
            <div key={t.id} className={`bonk-toast ${t.kind}`}>
              {t.text}
            </div>
          ))}
        </div>

        {results && (
          <div className="bonk-modal">
            <div className="bonk-panel bonk-results">
              <h3 style={{ color: results.winner?.color || '#fff' }}>
                {!results.winner
                  ? 'Nobody has any balloons left!'
                  : results.humanWon
                    ? results.winner.name === 'You'
                      ? '👑 YOU WIN! 👑'
                      : `👑 ${results.winner.name} WINS! 👑`
                    : `${results.winner.name} wins!`}
              </h3>
              <p className="bonk-muted">
                {results.arena.name} · {Math.floor(results.duration)}s · {results.events} events
              </p>
              <div className="bonk-standings">
                {results.standings.map((s, i) => (
                  <div key={i} style={{ color: s.color }}>
                    {i + 1}. {s.won ? '👑 ' : ''}
                    {s.name} {s.human ? `(${s.tag})` : ''} · {s.kos} KO · {s.pops} 🎈
                  </div>
                ))}
              </div>
              <p className="bonk-earned">+{results.earned.bb} Bonk Bucks 🪙</p>
              <div className="bonk-chip-row center">
                <button className="bonk-go" onClick={() => startMatch(lastConfig.current)}>
                  Play Again
                </button>
                <button onClick={goHub}>Back to Hub</button>
              </div>
            </div>
          </div>
        )}

        {overlay === 'play' && <Lobby input={input} onStart={startMatch} onClose={() => setOverlay(null)} />}
        {overlay === 'shop' && (
          <Shop
            onClose={() => setOverlay(null)}
            onEquip={() => {
              const s = loadSave()
              ctrlRef.current?.hub?.setCostume(s.costume, s.pet)
            }}
          />
        )}
        {overlay === 'trophy' && <Achievements onClose={() => setOverlay(null)} />}
        {overlay === 'devpc' && (
          <div className="bonk-modal" onClick={() => setOverlay(null)}>
            <div className="bonk-panel bonk-terminal" onClick={(e) => e.stopPropagation()}>
              <pre>
                {`> DEVELOPER TERMINAL v1.0
> hello there :)
> you found the secret developer room.
> fun fact: there are ${ACHIEVEMENTS.length} achievements.
> another fun fact: the giant rubber duck is friendly.
>   (mostly)
> here, have some Bonk Bucks.`}
              </pre>
              <button
                onClick={() => {
                  devReward()
                  setOverlay(null)
                }}
              >
                Take 500 BB
              </button>
            </div>
          </div>
        )}
      </div>

      {(screen === 'hub' || screen === 'match') && (
        <div className={`bonk-touch ${HAS_TOUCH ? 'is-touch' : ''}`}>
          <div className="bonk-dpad">
            <TouchButton input={input} code="KeyW" className="up">▲</TouchButton>
            <TouchButton input={input} code="KeyA" className="left">◀</TouchButton>
            <TouchButton input={input} code="KeyD" className="right">▶</TouchButton>
            <TouchButton input={input} code="KeyS" className="down">▼</TouchButton>
          </div>
          <div className="bonk-actions">
            <TouchButton input={input} code="KeyQ">🦆</TouchButton>
            <TouchButton input={input} code="KeyE">🛡️</TouchButton>
            <TouchButton input={input} code="ShiftLeft">💨</TouchButton>
            <TouchButton input={input} code="Space" className="jump">⤴</TouchButton>
            <TouchButton input={input} code="KeyF" className="bonk">🔨</TouchButton>
          </div>
        </div>
      )}
    </div>
  )
}
