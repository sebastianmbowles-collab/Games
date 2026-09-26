import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { addTokens, getTokens } from '../utils/tokens'
import { FIGHTERS } from './brawl/fighters'
import { DIFFICULTY, W, H, createInput, createMatch, cpuThink, pressButton, step } from './brawl/engine'
import { drawMatch } from './brawl/draw'

// Keyboard layouts. In 1-player mode both layouts control player 1.
const P1_KEYS = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  block: ['KeyS'],
  punch: ['KeyF'],
  kick: ['KeyG'],
  special: ['KeyH'],
}
const P2_KEYS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  block: ['ArrowDown'],
  punch: ['KeyJ'],
  kick: ['KeyK'],
  special: ['KeyL'],
}
const ATTACKS = ['punch', 'kick', 'special']
const HELD = ['left', 'right', 'up', 'block']

function keyMapsFor(mode) {
  if (mode === 'versus') return [P1_KEYS, P2_KEYS]
  const both = {}
  for (const k of Object.keys(P1_KEYS)) both[k] = [...P1_KEYS[k], ...P2_KEYS[k]]
  return [both, null]
}

function statPips(value, lo, hi) {
  const n = Math.round(1 + ((value - lo) / (hi - lo)) * 4)
  return '■'.repeat(n) + '□'.repeat(5 - n)
}

function FighterCard({ f, onPick, taken }) {
  return (
    <button className={`brawl-pick-card ${taken ? 'is-taken' : ''}`} onClick={() => onPick(f)} style={{ '--fighter': f.color }}>
      <span className="brawl-pick-emoji">{f.emoji}</span>
      <strong>{f.name}</strong>
      <span className="brawl-pick-pun">{f.pun}</span>
      <span className="brawl-pick-stats">
        <span>HP {statPips(f.hp, 85, 130)}</span>
        <span>SPD {statPips(f.speed, 0.8, 1.35)}</span>
        <span>POW {statPips(f.power, 0.9, 1.2)}</span>
      </span>
      <span className="brawl-pick-special">★ {f.special.name}</span>
    </button>
  )
}

// Touch buttons set pad_* flags on player 1's input, so they don't clash with keyboard state.
function TouchPad({ input }) {
  const hold = (name, on) => (e) => {
    e.preventDefault()
    input[`pad_${name}`] = on
  }
  const tap = (name) => (e) => {
    e.preventDefault()
    pressButton(input, name)
  }
  const holdBtn = (name, label) => (
    <button
      className="brawl-pad-btn"
      onPointerDown={hold(name, true)}
      onPointerUp={hold(name, false)}
      onPointerLeave={hold(name, false)}
      onPointerCancel={hold(name, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div className="brawl-pad">
      <div className="brawl-pad-group">
        {holdBtn('left', '◀')}
        {holdBtn('up', '▲')}
        {holdBtn('right', '▶')}
        {holdBtn('block', '🛡️')}
      </div>
      <div className="brawl-pad-group">
        <button className="brawl-pad-btn is-attack" onPointerDown={tap('punch')}>
          👊
        </button>
        <button className="brawl-pad-btn is-attack" onPointerDown={tap('kick')}>
          🦶
        </button>
        <button className="brawl-pad-btn is-special" onPointerDown={tap('special')}>
          ★
        </button>
      </div>
    </div>
  )
}

function Fight({ picks, mode, difficulty, onOver, touch, children }) {
  const canvasRef = useRef(null)
  // One mutable input object per fight; the touch pad and the game loop both write to it.
  const [touchInput] = useState(createInput)
  const onOverRef = useRef(onOver)

  useEffect(() => {
    onOverRef.current = onOver
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const match = createMatch(picks)
    const inputs = [touchInput, createInput()]
    const maps = keyMapsFor(mode)
    const held = new Set()
    const level = DIFFICULTY[difficulty]
    let reported = false

    const bound = new Set(maps.filter(Boolean).flatMap((m) => Object.values(m).flat()))
    function onKeyDown(e) {
      if (!bound.has(e.code)) return
      e.preventDefault()
      held.add(e.code)
      if (e.repeat) return
      maps.forEach((map, i) => {
        if (!map) return
        for (const a of ATTACKS) if (map[a].includes(e.code)) pressButton(inputs[i], a)
      })
    }
    function onKeyUp(e) {
      held.delete(e.code)
    }
    function onBlur() {
      held.clear()
    }
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
      if (mode === 'cpu') cpuThink(match, 1, inputs[1], level, dt)
      step(match, inputs, dt)
      drawMatch(ctx, match)
      if (match.phase === 'over' && !reported) {
        reported = true
        onOverRef.current(match.matchWinner)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [picks, mode, difficulty, touchInput])

  return (
    <>
      <div className="brawl-arena">
        <canvas ref={canvasRef} className="brawl-canvas" style={{ aspectRatio: `${W} / ${H}` }} />
        {children}
      </div>
      {touch && <TouchPad input={touchInput} />}
    </>
  )
}

export default function AnimalBrawl({ game, onExit }) {
  const [screen, setScreen] = useState('menu')
  const [mode, setMode] = useState('cpu')
  const [difficulty, setDifficulty] = useState('normal')
  const [picks, setPicks] = useState([])
  const [fightId, setFightId] = useState(0)
  const [result, setResult] = useState(null)
  const [wallet, setWallet] = useState(getTokens)
  const [touch] = useState(() => !!window.matchMedia?.('(pointer: coarse)').matches)

  function choose(f) {
    if (mode === 'cpu') {
      const others = FIGHTERS.filter((o) => o.key !== f.key)
      startFight([f, others[Math.floor(Math.random() * others.length)]])
    } else if (picks.length === 0) {
      setPicks([f])
    } else {
      startFight([picks[0], f])
    }
  }

  function startFight(pair) {
    setPicks(pair)
    setResult(null)
    setFightId((n) => n + 1)
    setScreen('fight')
  }

  function handleOver(winner) {
    let reward = 0
    if (mode === 'cpu' && winner === 0) {
      reward = DIFFICULTY[difficulty].reward
      setWallet(addTokens(reward))
    }
    setResult({ winner, reward })
  }

  function toSelect(nextMode = mode) {
    setMode(nextMode)
    setPicks([])
    setResult(null)
    setScreen('select')
  }

  const topbar = (
    <div className="game-topbar">
      <GameTitle game={game} />
      <button className="exit-btn" onClick={onExit}>
        Exit
      </button>
    </div>
  )

  if (screen === 'menu') {
    return (
      <div className="game-screen">
        {topbar}
        <div className="brawl-menu" style={{ '--card-color': game.color }}>
          <div className="brawl-logo">
            ANIMAL
            <br />
            BRAWL
          </div>
          <p className="brawl-tagline">18 fighters. 1 champion. Zero chill.</p>
          <div className="brawl-menu-row">
            {Object.entries(DIFFICULTY).map(([key, d]) => (
              <button
                key={key}
                className={`brawl-chip ${difficulty === key ? 'is-on' : ''}`}
                onClick={() => setDifficulty(key)}
              >
                {d.label} · +{d.reward}
              </button>
            ))}
          </div>
          <button className="brawl-big-btn" onClick={() => toSelect('cpu')}>
            1 PLAYER vs CPU
          </button>
          <button className="brawl-big-btn is-alt" onClick={() => toSelect('versus')}>
            2 PLAYERS (same keyboard)
          </button>
          <span className="stat-pill" style={{ '--card-color': game.color }}>
            TOKENS {wallet}
          </span>
          {touch ? <p className="brawl-tagline">Tip: 2 players needs a keyboard.</p> : <Controls mode="versus" />}
        </div>
      </div>
    )
  }

  if (screen === 'select') {
    const who = mode === 'cpu' ? 'Choose your fighter' : picks.length === 0 ? 'Player 1: choose' : 'Player 2: choose'
    return (
      <div className="game-screen">
        {topbar}
        <h3 className="brawl-heading">{who}</h3>
        {picks[0] && mode === 'versus' && (
          <p className="brawl-subheading">
            P1 is {picks[0].emoji} {picks[0].name}
          </p>
        )}
        <div className="brawl-pick-grid">
          {FIGHTERS.map((f) => (
            <FighterCard key={f.key} f={f} onPick={choose} taken={picks[0]?.key === f.key} />
          ))}
        </div>
        <button className="exit-btn" style={{ marginTop: 16 }} onClick={() => setScreen('menu')}>
          ← Back
        </button>
      </div>
    )
  }

  const [p1, p2] = picks
  return (
    <div className="game-screen">
      {topbar}
      <Fight key={fightId} picks={picks} mode={mode} difficulty={difficulty} onOver={handleOver} touch={touch}>
        {result && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <div className="brawl-winner-emoji">{picks[result.winner].emoji}</div>
            <h3>
              {mode === 'cpu'
                ? result.winner === 0
                  ? 'YOU WIN!'
                  : 'YOU LOSE!'
                : `PLAYER ${result.winner + 1} WINS!`}
            </h3>
            <p>
              {picks[result.winner].name} is the champion!
              {result.reward > 0 && ` +${result.reward} Faz-Tokens (you have ${wallet}).`}
            </p>
            <div className="brawl-menu-row">
              <button onClick={() => startFight([p1, p2])}>Rematch</button>
              <button onClick={() => toSelect()}>Change Fighters</button>
              <button onClick={() => setScreen('menu')}>Menu</button>
            </div>
          </div>
        )}
      </Fight>
      {!touch && <Controls mode={mode} />}
    </div>
  )
}

function Controls({ mode }) {
  const row = (label, keys) => (
    <div className="brawl-controls-col">
      <strong>{label}</strong>
      <span>
        Move <kbd>{keys[0]}</kbd> · Jump <kbd>{keys[1]}</kbd> · Block <kbd>{keys[2]}</kbd>
      </span>
      <span>
        Punch <kbd>{keys[3]}</kbd> · Kick <kbd>{keys[4]}</kbd> · Special <kbd>{keys[5]}</kbd>
      </span>
    </div>
  )
  return (
    <div className="brawl-controls">
      {mode === 'versus' ? (
        <>
          {row('Player 1', ['A D', 'W', 'S', 'F', 'G', 'H'])}
          {row('Player 2', ['← →', '↑', '↓', 'J', 'K', 'L'])}
        </>
      ) : (
        row('Controls', ['A D / ← →', 'W / ↑', 'S / ↓', 'F / J', 'G / K', 'H / L'])
      )}
      <span className="brawl-controls-tip">
        Hits fill your special bar. When it flashes gold, press Special!
      </span>
    </div>
  )
}
