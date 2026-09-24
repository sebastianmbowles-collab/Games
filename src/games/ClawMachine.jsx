import { useEffect, useRef, useState } from 'react'
import { getTokens, spendTokens } from '../utils/tokens'
import GameTitle from '../components/GameTitle'

const COST = 10
const CLAW_SPEED = 55
const CATCH_RADIUS = 7
const CATCH_CHANCE = 0.65

const PLUSHIE_POOL = ['🧸', '🐻', '🐰', '🦊', '🐱', '🐼']

function buildPlushies() {
  const positions = [10, 25, 40, 55, 70, 85]
  return positions.map((x) => ({
    x,
    icon: PLUSHIE_POOL[Math.floor(Math.random() * PLUSHIE_POOL.length)],
    id: Math.random(),
  }))
}

export default function ClawMachine({ game, onExit }) {
  const [wallet, setWallet] = useState(getTokens)
  const [plushies, setPlushies] = useState(buildPlushies)
  const [won, setWon] = useState([])
  const [clawX, setClawX] = useState(0)
  const [phase, setPhase] = useState('moving')
  const [message, setMessage] = useState('')
  const dirRef = useRef(1)
  const clawXRef = useRef(0)

  useEffect(() => {
    if (phase !== 'moving') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      let x = clawXRef.current + dirRef.current * CLAW_SPEED * dt
      if (x >= 100) {
        x = 100
        dirRef.current = -1
      } else if (x <= 0) {
        x = 0
        dirRef.current = 1
      }
      clawXRef.current = x
      setClawX(x)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  function grab() {
    if (phase !== 'moving') return
    const next = spendTokens(COST)
    if (next === null) {
      setMessage('Not enough Faz-Tokens!')
      setTimeout(() => setMessage(''), 1500)
      return
    }
    setWallet(next)
    setPhase('dropping')
    setMessage('')

    setTimeout(() => {
      const target = plushies.reduce(
        (closest, p) =>
          Math.abs(p.x - clawXRef.current) < Math.abs(closest.x - clawXRef.current) ? p : closest,
        plushies[0] || { x: -999 }
      )
      const inRange = target && Math.abs(target.x - clawXRef.current) <= CATCH_RADIUS
      const success = inRange && Math.random() < CATCH_CHANCE

      if (success) {
        setPlushies((prev) => prev.filter((p) => p.id !== target.id))
        setWon((w) => [target, ...w])
        setMessage(`Grabbed a ${target.icon}!`)
      } else {
        setMessage('Missed it...')
      }

      setTimeout(() => {
        setPhase('moving')
        setMessage('')
      }, 1000)
    }, 700)
  }

  function restock() {
    setPlushies(buildPlushies())
    setWon([])
  }

  return (
    <div className="game-screen">
      <div className="game-topbar">
        <GameTitle game={game} />
        <button className="exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>
      <div className="stat-bar">
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          WALLET {wallet}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          WON {won.length}
        </span>
      </div>

      <div className="claw-machine" style={{ '--card-color': game.color }}>
        <div className="claw-rail">
          <div
            className={`claw-arm ${phase === 'dropping' ? 'dropping' : ''}`}
            style={{ left: `${clawX}%` }}
          >
            🪝
          </div>
        </div>
        <div className="claw-glass">
          {plushies.map((p) => (
            <span key={p.id} className="claw-plushie" style={{ left: `${p.x}%` }}>
              {p.icon}
            </span>
          ))}
          {plushies.length === 0 && (
            <p style={{ color: '#9b9bb0', margin: 'auto' }}>All grabbed!</p>
          )}
        </div>
      </div>

      {message && (
        <p className="wheel-result" style={{ color: game.color }}>
          {message}
        </p>
      )}

      {plushies.length === 0 ? (
        <button className="spin-btn" style={{ background: game.color }} onClick={restock}>
          Refill Machine
        </button>
      ) : (
        <button
          className="spin-btn"
          style={{ background: game.color }}
          onClick={grab}
          disabled={phase !== 'moving'}
        >
          GRAB ({COST} tokens)
        </button>
      )}

      {won.length > 0 && (
        <div className="prize-shelf">
          {won.map((p) => (
            <div key={p.id} className="prize-shelf-item">
              {p.icon}
            </div>
          ))}
        </div>
      )}

      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Press GRAB while the claw is lined up with a plushie.
      </p>
    </div>
  )
}
