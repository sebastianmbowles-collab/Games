import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ACHIEVEMENTS } from './bonk/achievements'
import Achievements from './bonk/Achievements'
import { nearestSafe } from './bonk/arena'
import { EMOTE_ALT, EMOTE_KEYS, EMOTES, GAME_KEYS } from './bonk/data'
import { bonkLaunch, createMatch, forceEvent, quitMatch, snapshot, step } from './bonk/engine'
import { createHub } from './bonk/hub'
import { createInput, readCommand } from './bonk/input'
import { createLoadingScene } from './bonk/loadingScene'
import Lobby from './bonk/Lobby'
import { createMatchView, drawOverlay } from './bonk/matchView'
import { DuckHead, HowToPlay, Joystick, Settings } from './bonk/Menus'
import { applySettings } from './bonk/settings'
import { playMusic } from './bonk/music'
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
import { isMuted, setSfxVolume, sfx, unlockAudio } from './bonk/sound'

const STEP = 1 / 120

function TouchButton({ input, code, className, children, label }) {
  const press = (e) => {
    e.preventDefault()
    e.stopPropagation()
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
      {label && <small>{label}</small>}
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

function drawLabels(ctx, labels) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  for (const l of labels) {
    if (l.bubble) {
      ctx.font = 'bold 13px system-ui, sans-serif'
      const w = ctx.measureText(l.text).width + 16
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(l.x - w / 2, l.y - 13, w, 24, 10)
      else ctx.rect(l.x - w / 2, l.y - 13, w, 24)
      ctx.fill()
      ctx.fillStyle = '#222'
      ctx.fillText(l.text, l.x, l.y)
      continue
    }
    ctx.font = l.small ? 'bold 12px system-ui, sans-serif' : '12px "Press Start 2P", monospace'
    ctx.lineWidth = l.small ? 3 : 5
    ctx.strokeStyle = 'rgba(20,10,30,0.85)'
    ctx.strokeText(l.text, l.x, l.y)
    ctx.fillStyle = l.color || '#fff'
    ctx.fillText(l.text, l.x, l.y)
  }
}

export default function Bonk({ onExit }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const rendererRef = useRef(null)
  const ctrlRef = useRef(null)
  const [input] = useState(createInput)

  const [screen, setScreen] = useState('device')
  const [device, setDevice] = useState(() => loadSave().device || (navigator.maxTouchPoints > 0 ? 'mobile' : 'pc'))
  const [progress, setProgress] = useState(0)
  const [overlay, setOverlay] = useState(null)
  const overlayOpen = useRef(null)
  const [hud, setHud] = useState(null)
  const [results, setResults] = useState(null)
  const [toasts, setToasts] = useState([])
  const [chat, setChat] = useState([])
  const [inObby, setInObby] = useState(false)
  const [introKey, setIntroKey] = useState(0)
  const [, setTick] = useState(0)
  const lastConfig = useRef(null)
  const save = loadSave()
  const mobile = device === 'mobile'

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

  const setController = useCallback((ctrl) => {
    const old = ctrlRef.current
    ctrlRef.current = ctrl
    if (stageRef.current) ctrl.resize?.(stageRef.current.clientWidth, stageRef.current.clientHeight)
    if (old && old !== ctrl) old.dispose?.()
  }, [])

  // ---------------------------------------------------------------- title screen

  const goTitle = useCallback(() => {
    const renderer = rendererRef.current
    let w = null
    let view = null
    const fresh = () => {
      view?.dispose()
      w = createMatch({ humans: [], ducks: 8, difficulty: 'hard', challenge: 'none', attract: true })
      view = createMatchView(renderer, w)
      if (stageRef.current) view.resize(stageRef.current.clientWidth, stageRef.current.clientHeight)
    }
    fresh()
    let acc = 0
    let nextScript = 5
    let script = null
    let time = 0
    setSfxVolume(0.35)
    playMusic('title')
    setController({
      type: 'title',
      resize: (width, height) => view.resize(width, height),
      dispose: () => {
        view.dispose()
        setSfxVolume(1)
      },
      frame(dt, ctx, width, height) {
        time += dt
        acc += dt
        // Every so often one duck walks to the middle, looks at you... BONK!
        if (!script && time > nextScript) {
          const pool = w.players.filter((p) => p.state === 'alive' && p.z <= 0 && p.stun <= 0)
          const p = pool[Math.floor(Math.random() * pool.length)]
          if (p) {
            const spot = nearestSafe(w.arena, view.focus.x, view.focus.y)
            script = { p, phase: 'walk', t: 0, spot }
            p.scripted = true
          }
          nextScript = time + 12
        }
        if (script) {
          const { p } = script
          script.t += dt
          if (p.state !== 'alive') {
            p.scripted = false
            script = null
          } else if (script.phase === 'walk') {
            const dx = script.spot.x - p.x
            const dy = script.spot.y - p.y
            const d = Math.hypot(dx, dy)
            p.cmd = { mx: d > 8 ? dx / d : 0, my: d > 8 ? dy / d : 0, jump: false, bonk: false, dash: false, shield: false, emote: -1, aim: null }
            if (d < 20 || script.t > 6) Object.assign(script, { phase: 'look', t: 0 })
          } else if (script.phase === 'look') {
            p.cmd = { mx: 0, my: 0, jump: false, bonk: false, dash: false, shield: false, emote: -1, aim: Math.PI / 2 }
            p.facing = Math.PI / 2
            if (script.t > 1.3) {
              sfx.ding()
              bonkLaunch(w, p)
              p.scripted = false
              script = null
            }
          }
        }
        while (acc >= STEP) {
          step(w, STEP, () => null)
          acc -= STEP
        }
        if (w.phase === 'over') fresh()
        view.update(dt)
        view.render()
        drawOverlay(ctx, view, width, height, { title: true })
      },
    })
    setOverlay(null)
    setResults(null)
    setHud(null)
    setScreen('title')
    setIntroKey((k) => k + 1)
  }, [setController])

  // ---------------------------------------------------------------- hub

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
      chat: (msg) => setChat((list) => [...list.slice(-5), { ...msg, id: Math.random() }]),
      reward: (n, text) => {
        const s = loadSave()
        if (s.bb + n < 0) return false
        s.bb += n
        persist()
        if (text) toast(text, 'ach')
        return true
      },
      wins: () => loadSave().stats.wins || 0,
      once: (key) => {
        const s = loadSave()
        const had = !!s.stats[`once_${key}`]
        s.stats[`once_${key}`] = 1
        return had
      },
      konami: () => {
        const s = loadSave()
        if (!s.stats.konami) {
          s.stats.konami = 1
          s.bb += 100
          persist()
          toast('🎮 KONAMI CODE! +30 lives! (jk, +100 BB)', 'ach')
        } else toast('🎮 Konami code! The ducks salute you.', 'secret')
        sfx.win()
      },
    })
    if (import.meta.env.DEV) window.__hub = hub
    let obbyShown = false
    playMusic('hub')
    setController({
      type: 'hub',
      hub,
      resize: (w, h) => hub.resize(w, h),
      dispose: () => hub.dispose(),
      frame(dt, ctx, width, height) {
        if (!overlayOpen.current) {
          for (let i = 0; i < EMOTE_KEYS.length; i++) if (input.keys.pressed.has(EMOTE_KEYS[i])) doHubEmote(hub, i)
          for (const [k, i] of Object.entries(EMOTE_ALT)) if (input.keys.pressed.has(k)) doHubEmote(hub, i)
          hub.step(dt, input.keys, input.stick)
        }
        input.clearPressed()
        hub.render(renderer, dt)
        if (!!hub.P.obby !== obbyShown) {
          obbyShown = !!hub.P.obby
          setInObby(obbyShown)
        }
        ctx.clearRect(0, 0, width, height)
        drawLabels(ctx, hub.labels(width, height))
        if (hub.P.obby) drawLabels(ctx, [{ text: `⏱ ${hub.P.obbyT.toFixed(1)}s`, x: width / 2, y: 70 }])
      },
    })
    stat('welcome')
    setChat([{ system: true, text: '🦆 Welcome to BONK! Walk into the pink portal to play.', id: 1 }])
    setScreen('hub')
    setOverlay(null)
    setResults(null)
    setHud(null)
    flush(true)
  }, [input, setController])

  // ---------------------------------------------------------------- match

  const startMatch = useCallback(
    (config) => {
      unlockAudio()
      lastConfig.current = config
      setOverlay(null)
      setResults(null)
      const w = createMatch({ ...config, hooks })
      if (import.meta.env.DEV) window.__bonk = { w, forceEvent: (key) => forceEvent(w, key) }
      matchStarted(config)
      const view = createMatchView(rendererRef.current, w)
      let acc = 0
      let hudT = 0
      let done = false
      playMusic('match')
      setController({
        type: 'match',
        w,
        resize: (width, height) => view.resize(width, height),
        dispose: () => view.dispose(),
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
      })
      setScreen('match')
      setHud(snapshot(w))
    },
    [input, setController],
  )

  // ---------------------------------------------------------------- renderer + loop

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.shadowMap.enabled = loadSave().settings?.shadows !== false
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    startSession()
    stat('loadings')
    applySettings()

    const loading = createLoadingScene()
    ctrlRef.current = {
      type: 'loading',
      resize: (w, h) => loading.resize(w, h),
      dispose: () => loading.dispose(),
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

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      ctrlRef.current?.dispose?.()
      renderer.dispose()
      flush(true)
    }
  }, [])

  // The loading bar (while the duck chase plays), then the title screen.
  useEffect(() => {
    if (screen !== 'loading') return
    let p = 0
    const id = setInterval(() => {
      p = Math.min(100, p + 5 + Math.random() * 9)
      setProgress(p)
      if (p >= 100) {
        clearInterval(id)
        setTimeout(goTitle, 350)
      }
    }, 110)
    return () => clearInterval(id)
  }, [screen, goTitle])

  // The logo intro: whoosh, B-O-N-K-!, slam.
  useEffect(() => {
    if (screen !== 'title') return
    const timers = [setTimeout(() => sfx.dash(), 150)]
    for (let i = 0; i < 5; i++) timers.push(setTimeout(() => sfx.letter(i), 800 + i * 130))
    timers.push(setTimeout(() => sfx.slam(), 1500))
    const buffer = setTimeout(() => stat('buffering'), 10000)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(buffer)
    }
  }, [screen, introKey])

  // keyboard, focus
  useEffect(() => {
    const k = input.keys
    const down = (e) => {
      if (overlayOpen.current) {
        if (e.code === 'Escape') setOverlay(null)
        return
      }
      if (screen === 'hub' || screen === 'match') {
        if (GAME_KEYS.has(e.code) || e.code === 'KeyI') e.preventDefault()
        if (!e.repeat) k.pressed.add(e.code)
        k.down.add(e.code)
        if (screen === 'hub' && ctrlRef.current?.hub) ctrlRef.current.hub.typeKey(e.code)
      }
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
  }, [screen, input])

  function onClickAnything(e) {
    if (e.target.closest('button')) {
      stat('buttons')
      sfx.click()
    }
  }

  function chooseDevice(d) {
    unlockAudio()
    applySettings()
    loadSave().device = d
    persist()
    setDevice(d)
    if (screen === 'device') setScreen('loading')
  }

  function setShadows(on) {
    rendererRef.current.shadowMap.enabled = on
    const scene = ctrlRef.current?.hub?.scene
    if (scene) scene.traverse((o) => o.material && (o.material.needsUpdate = true))
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
  const inGame = screen === 'hub' || screen === 'match'

  return (
    <div className={`bonk-root ${mobile ? 'is-mobile' : ''}`} onClick={onClickAnything}>
      <div className="bonk-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="bonk-canvas" />
        <canvas ref={overlayRef} className="bonk-overlay-canvas" />

        {screen === 'device' && (
          <div className="bonk-device">
            <h2>Which device?</h2>
            <div className="bonk-device-row">
              <button className={device === 'pc' ? 'is-last' : ''} onClick={() => chooseDevice('pc')}>
                <span>🖥</span>PC
              </button>
              <button className={device === 'mobile' ? 'is-last' : ''} onClick={() => chooseDevice('mobile')}>
                <span>📱</span>Mobile
              </button>
            </div>
            <p>Mobile adds a joystick, a jump button and an interact button.</p>
            <button className="bonk-link" onClick={onExit}>
              ← back to the arcade
            </button>
          </div>
        )}

        {screen === 'loading' && (
          <div className="bonk-loading">
            <div className="bonk-loadbar">
              <div style={{ width: `${progress}%` }} />
              <span>Loading… {Math.floor(progress)}%</span>
            </div>
          </div>
        )}

        {screen === 'title' && !overlay && (
          <div className="bonk-titlescreen" key={introKey}>
            <DuckHead className="bonk-flyby" />
            <h1 className="bonk-logo2" aria-label="BONK!">
              <span style={{ '--i': 0 }}>B</span>
              <span style={{ '--i': 1 }} className="o">
                <DuckHead />
              </span>
              <span style={{ '--i': 2 }}>N</span>
              <span style={{ '--i': 3 }}>K</span>
              <span style={{ '--i': 4 }}>!</span>
            </h1>
            <p className="bonk-tagline2">JUMP. HIT. DON’T FALL.</p>
            <nav className="bonk-menu">
              <button onClick={goHub}>▶ PLAY</button>
              <button onClick={() => setOverlay('costumes')}>👕 COSTUMES</button>
              <button onClick={() => setOverlay('trophy')}>🏆 ACHIEVEMENTS</button>
              <button onClick={() => setOverlay('shop')}>🪙 SHOP</button>
              <button onClick={() => setOverlay('settings')}>⚙ SETTINGS</button>
              <button onClick={() => setOverlay('howto')}>❓ HOW TO PLAY</button>
            </nav>
            <div className="bonk-corner tr">🪙 {save.bb.toLocaleString()} BB</div>
            <div className="bonk-corner br">
              🏆 {unlocked} / {ACHIEVEMENTS.length.toLocaleString()} ACHIEVEMENTS
            </div>
            <button className="bonk-corner bl bonk-exit" onClick={onExit}>
              ← Arcade
            </button>
          </div>
        )}

        {inGame && (
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
                <button className="bonk-pill" onClick={goTitle}>🏠 Menu</button>
              </>
            )}
            {screen === 'match' && (
              <button className="bonk-pill" onClick={exitMatch}>
                Quit
              </button>
            )}
            <button className="bonk-pill" onClick={() => setOverlay('settings')}>⚙</button>
          </div>
        )}

        {screen === 'match' && hud && (
          <div className="bonk-leaderboard">
            <div className="bonk-lb-head">
              <span>Players</span>
              <span>🎈</span>
              <span>KO</span>
            </div>
            {[...hud.players]
              .sort((a, b) => a.out - b.out || b.balloons - a.balloons)
              .map((p) => (
                <div key={p.id} className={`bonk-lb-row ${p.out ? 'is-out' : ''} ${p.human ? 'is-human' : ''}`}>
                  <span style={{ color: p.color }}>
                    {p.king ? '👑 ' : ''}
                    {p.human ? `${p.tag} ${p.name}` : p.name}
                  </span>
                  <span>{p.out ? '💀' : p.balloons}</span>
                  <span>{p.kos}</span>
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

        {screen === 'hub' && (
          <div className="bonk-chat">
            {chat.map((m) => (
              <div key={m.id} className={m.system ? 'sys' : ''}>
                {m.system ? (
                  m.text
                ) : (
                  <>
                    <b style={{ color: m.color }}>[{m.name}]:</b> {m.text}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {screen === 'hub' && !overlay && !mobile && (
          <div className="bonk-hint">WASD move · Space jump (twice!) · Shift dash · E interact · 1 wave · 2 spin · Q quack · 4 flip · 5 flop</div>
        )}

        {inGame && mobile && !overlay && !results && (
          <div className="bonk-mobile-controls">
            <Joystick input={input} />
            <div className="bonk-mobile-buttons">
              {screen === 'hub' ? (
                <>
                  <TouchButton input={input} code="KeyE" className="interact" label="Interact">
                    🤚
                  </TouchButton>
                  <TouchButton input={input} code="Space" className="jump" label="Jump">
                    ⤴
                  </TouchButton>
                </>
              ) : (
                <>
                  <TouchButton input={input} code="KeyE" label="Shield">
                    🛡️
                  </TouchButton>
                  <TouchButton input={input} code="ShiftLeft" label="Dash">
                    💨
                  </TouchButton>
                  <TouchButton input={input} code="Space" className="jump" label="Jump">
                    ⤴
                  </TouchButton>
                  <TouchButton input={input} code="KeyF" className="bonk" label="BONK">
                    🔨
                  </TouchButton>
                </>
              )}
            </div>
          </div>
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
                      ? ['👑 YOU WIN! 👑', '🍗 WINNER WINNER, DUCK DINNER!', '👑 GG EZ! 👑'][Math.floor(results.duration) % 3]
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
        {(overlay === 'shop' || overlay === 'costumes') && (
          <Shop
            initialTab={overlay === 'costumes' ? 'mine' : 'classic'}
            onClose={() => setOverlay(null)}
            onEquip={() => {
              const s = loadSave()
              ctrlRef.current?.hub?.setCostume(s.costume, s.pet)
            }}
          />
        )}
        {overlay === 'trophy' && <Achievements onClose={() => setOverlay(null)} />}
        {overlay === 'settings' && <Settings onClose={() => setOverlay(null)} onDevice={chooseDevice} onShadows={setShadows} />}
        {overlay === 'howto' && <HowToPlay onClose={() => setOverlay(null)} />}
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
    </div>
  )
}
