import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'

const TOTAL_ROUNDS = 5
const START_LIVES = 3
const GROW_RATE = 55

function randomTarget() {
  const width = 12 + Math.random() * 6
  const start = 40 + Math.random() * (85 - width - 40)
  return { start, end: start + width }
}

export default function BalloonFactory({ game, onExit }) {
  const [size, setSize] = useState(0)
  const [holding, setHolding] = useState(false)
  const [target, setTarget] = useState(randomTarget)
  const [round, setRound] = useState(1)
  const [perfectCount, setPerfectCount] = useState(0)
  const [lives, setLives] = useState(START_LIVES)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('playing')
  const holdingRef = useRef(false)
  const roundLockedRef = useRef(false)

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      if (holdingRef.current && !roundLockedRef.current) {
        setSize((s) => Math.min(100, s + GROW_RATE * dt))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  useEffect(() => {
    if (status === 'playing' && size >= 100 && !roundLockedRef.current) {
      finishRound('pop')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, status])

  function finishRound(kind) {
    roundLockedRef.current = true
    holdingRef.current = false
    setHolding(false)

    let livesAfter = lives
    if (kind === 'perfect') {
      setMessage('PERFECT!')
      setPerfectCount((c) => c + 1)
    } else if (kind === 'pop') {
      setMessage('POPPED!')
      livesAfter = lives - 1
      setLives(livesAfter)
    } else {
      setMessage('TOO SMALL')
      livesAfter = lives - 1
      setLives(livesAfter)
    }

    setTimeout(() => {
      if (livesAfter <= 0) {
        setStatus('over')
        return
      }
      if (round >= TOTAL_ROUNDS) {
        setStatus('won')
        return
      }
      setRound((r) => r + 1)
      setSize(0)
      setTarget(randomTarget())
      setMessage('')
      roundLockedRef.current = false
    }, 900)
  }

  function release() {
    if (status !== 'playing' || roundLockedRef.current || !holdingRef.current) return
    if (size >= target.start && size <= target.end) {
      finishRound('perfect')
    } else {
      finishRound('short')
    }
  }

  function press() {
    if (status !== 'playing' || roundLockedRef.current) return
    holdingRef.current = true
    setHolding(true)
  }

  function restart() {
    setSize(0)
    setHolding(false)
    setTarget(randomTarget())
    setRound(1)
    setPerfectCount(0)
    setLives(START_LIVES)
    setMessage('')
    setStatus('playing')
    holdingRef.current = false
    roundLockedRef.current = false
  }

  const finished = status === 'over' || status === 'won'

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
          ROUND {Math.min(round, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          LIVES {'❤️'.repeat(Math.max(lives, 0)) || '—'}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          PERFECT {perfectCount}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="factory-wrap" style={{ '--card-color': game.color }}>
          <div
            className="factory-balloon"
            style={{
              width: 40 + size * 1.6,
              height: 48 + size * 1.9,
              background: game.color,
            }}
          />
          <div className="factory-meter">
            <div
              className="factory-meter-target"
              style={{ bottom: `${target.start}%`, height: `${target.end - target.start}%` }}
            />
            <div className="factory-meter-fill" style={{ height: `${size}%` }} />
          </div>
        </div>
        {message && (
          <p className="factory-message" style={{ color: game.color }}>
            {message}
          </p>
        )}
        <button
          className="inflate-btn"
          style={{ background: game.color }}
          onMouseDown={press}
          onMouseUp={release}
          onMouseLeave={() => holdingRef.current && release()}
          onTouchStart={(e) => {
            e.preventDefault()
            press()
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            release()
          }}
          disabled={status !== 'playing'}
        >
          {holding ? 'HOLDING...' : 'HOLD TO INFLATE'}
        </button>
        {finished && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{status === 'won' ? 'All balloons inflated!' : 'Out of balloons!'}</h3>
            <p>Perfect inflations: {perfectCount}/{TOTAL_ROUNDS}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Hold to inflate, release inside the green zone. Too big pops it!
      </p>
    </div>
  )
}
