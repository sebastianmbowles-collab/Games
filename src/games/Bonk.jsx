import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { addTokens } from '../utils/tokens'
import { GAME_KEYS, H, RULES, W, WINS_TO_WIN } from './bonk/data'
import { createMatch, createRound, draw, snapshot, step } from './bonk/engine'
import { setMuted, unlockAudio } from './bonk/sound'

const STEP = 1 / 120
const HAS_TOUCH =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const TOUCH_BUTTONS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  bonk: 'Space',
  dash: 'ShiftLeft',
  shield: 'KeyE',
}

function TouchButton({ keys, code, className, children }) {
  function press(e) {
    e.preventDefault()
    unlockAudio()
    if (!keys.current.down.has(code)) keys.current.pressed.add(code)
    keys.current.down.add(code)
  }
  function release(e) {
    e.preventDefault()
    keys.current.down.delete(code)
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

export default function Bonk({ game, onExit }) {
  const [screen, setScreen] = useState('menu')
  const [hud, setHud] = useState(null)
  const [muted, setMutedState] = useState(false)
  const canvasRef = useRef(null)
  const matchRef = useRef(null)
  const worldRef = useRef(null)
  const keys = useRef({ down: new Set(), pressed: new Set() })

  function start(humans) {
    unlockAudio()
    matchRef.current = createMatch(humans)
    worldRef.current = createRound(matchRef.current)
    setHud(snapshot(worldRef.current))
    setScreen('play')
  }

  function nextRound() {
    worldRef.current = createRound(matchRef.current)
    setHud(snapshot(worldRef.current))
  }

  function toggleMute() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  useEffect(() => {
    if (screen !== 'play') return
    const k = keys.current
    function down(e) {
      if (!GAME_KEYS.has(e.code)) return
      e.preventDefault()
      if (!e.repeat) k.pressed.add(e.code)
      k.down.add(e.code)
    }
    function up(e) {
      k.down.delete(e.code)
    }
    function blur() {
      k.down.clear()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)

    const ctx = canvasRef.current.getContext('2d')
    let raf
    let last = performance.now()
    let acc = 0
    let hudT = 0
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      acc += dt
      const w = worldRef.current
      while (acc >= STEP) {
        step(w, STEP, k)
        k.pressed.clear()
        acc -= STEP
      }
      if (w.phase === 'over' && !w.deposited) {
        w.deposited = true
        const earned = w.players.filter((p) => p.m.human).reduce((s, p) => s + p.roundCoins, 0)
        if (earned > 0) addTokens(earned)
      }
      draw(ctx, w)
      hudT += dt
      if (hudT > 0.1) {
        hudT = 0
        setHud(snapshot(w))
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      k.down.clear()
      k.pressed.clear()
    }
  }, [screen])

  const topbar = (
    <div className="game-topbar bonk-wide">
      <GameTitle game={game} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="exit-btn" onClick={toggleMute}>
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  )

  if (screen === 'menu') {
    return (
      <div className="game-screen">
        {topbar}
        <div className="bonk-menu" style={{ '--card-color': game.color }}>
          <h3 className="bonk-logo">💥 BONK! 💥</h3>
          <p className="bonk-tagline">
            Everyone spawns on a floating platform. You have one giant hammer.
            <br />
            Knock everyone else off. Last one standing wins!
          </p>
          <div className="bonk-mode-row">
            <button className="bonk-big-btn" onClick={() => start(1)}>
              1 PLAYER
              <small>vs 3 bots</small>
            </button>
            <button className="bonk-big-btn" onClick={() => start(2)}>
              2 PLAYERS
              <small>same keyboard + 2 bots</small>
            </button>
          </div>
          <div className="bonk-help-grid">
            <div>
              <h4>Controls</h4>
              <p>
                <b>1 player:</b> WASD / arrows move · <kbd>Space</kbd> bonk · <kbd>Shift</kbd> dash ·{' '}
                <kbd>E</kbd> shield
              </p>
              <p>
                <b>P1:</b> WASD · <kbd>Space</kbd> bonk · <kbd>L-Shift</kbd> dash · <kbd>E</kbd> shield
              </p>
              <p>
                <b>P2:</b> arrows · <kbd>Enter</kbd> bonk · <kbd>R-Shift</kbd> dash · <kbd>/</kbd> shield
              </p>
            </div>
            <div>
              <h4>Good to know</h4>
              <p>🔨 Grab crates for new hammers: sledgehammer, squeaky hammer, frying pan, wet fish.</p>
              <p>💥 The more you get hit, the farther you fly.</p>
              <p>🪙 Earn coins just for staying alive. They turn into Faz-Tokens!</p>
              <p>👑 First to {WINS_TO_WIN} round wins takes the crown.</p>
            </div>
          </div>
          <h4 className="bonk-rules-title">Every 20 seconds the rules change!</h4>
          <div className="bonk-rule-chips">
            {RULES.map((r) => (
              <span key={r.key} className="bonk-chip" title={r.desc}>
                {r.emoji} {r.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const winner = hud && hud.winner !== null ? hud.players.find((p) => p.id === hud.winner) : null
  const humansEarned = hud ? hud.players.filter((p) => p.human).reduce((s, p) => s + p.roundCoins, 0) : 0

  return (
    <div className="game-screen">
      {topbar}
      <div className="bonk-stage" style={{ '--card-color': game.color }}>
        <canvas ref={canvasRef} width={W} height={H} className="bonk-canvas" />
        {hud && hud.phase === 'over' && (
          <div className="game-overlay bonk-overlay">
            <h3 style={{ color: winner ? winner.color : '#fff' }}>
              {winner
                ? hud.matchOver
                  ? `👑 ${winner.name} WINS THE MATCH! 👑`
                  : `${winner.name} wins round ${hud.round}!`
                : 'Everybody fell off! Nobody wins!'}
            </h3>
            {humansEarned > 0 && <p>You earned {humansEarned} Faz-Tokens this round 🪙</p>}
            <div className="bonk-standings">
              {[...hud.players]
                .sort((a, b) => b.wins - a.wins)
                .map((p) => (
                  <div key={p.id} style={{ color: p.color }}>
                    {p.name} ({p.tag}) {'👑'.repeat(p.wins) || '—'}
                  </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {hud.matchOver ? (
                <button onClick={() => start(matchRef.current.humans)}>New Match</button>
              ) : (
                <button onClick={nextRound}>Next Round</button>
              )}
              <button onClick={() => setScreen('menu')}>Menu</button>
            </div>
          </div>
        )}
      </div>

      <div className={`bonk-touch ${HAS_TOUCH ? 'is-touch' : ''}`}>
        <div className="bonk-dpad">
          <TouchButton keys={keys} code={TOUCH_BUTTONS.up} className="up">▲</TouchButton>
          <TouchButton keys={keys} code={TOUCH_BUTTONS.left} className="left">◀</TouchButton>
          <TouchButton keys={keys} code={TOUCH_BUTTONS.right} className="right">▶</TouchButton>
          <TouchButton keys={keys} code={TOUCH_BUTTONS.down} className="down">▼</TouchButton>
        </div>
        <div className="bonk-actions">
          <TouchButton keys={keys} code={TOUCH_BUTTONS.shield}>🛡️</TouchButton>
          <TouchButton keys={keys} code={TOUCH_BUTTONS.dash}>💨</TouchButton>
          <TouchButton keys={keys} code={TOUCH_BUTTONS.bonk} className="bonk">🔨</TouchButton>
        </div>
      </div>

      {hud && (
        <div className="bonk-cards">
          {hud.players.map((p) => (
            <div
              key={p.id}
              className={`bonk-card ${p.out ? 'is-out' : ''}`}
              style={{ '--pc': p.color }}
            >
              <div className="bonk-card-name">
                {p.name} <span>{p.tag}</span>
              </div>
              <div
                className="bonk-card-dmg"
                style={{ color: `hsl(${Math.max(0, 50 - p.dmg / 3)}, 100%, ${p.dmg > 0 ? 60 : 95}%)` }}
              >
                {p.out ? 'OUT' : `${p.dmg}%`}
              </div>
              <div className="bonk-card-row">{p.hammer}</div>
              <div className="bonk-card-row">
                🪙 {p.coins} · 👑 {p.wins}/{WINS_TO_WIN}
              </div>
              {p.human && !p.out && (
                <div className="bonk-card-row bonk-cds">
                  <span className={p.dashReady ? 'ready' : ''}>💨 dash</span>
                  <span className={p.shieldReady ? 'ready' : ''}>🛡️ shield</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
