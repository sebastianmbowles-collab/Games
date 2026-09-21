import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'

const GAME_TIME = 45
const INDICATOR_SPEED = 70
const DECAY_RATE = 6
const HIT_GAIN = 16

function randomZone() {
  const width = 14 + Math.random() * 8
  const start = Math.random() * (100 - width)
  return { start, end: start + width }
}

export default function MusicBox({ game, onExit }) {
  const [indicatorPos, setIndicatorPos] = useState(0)
  const [zone, setZone] = useState(randomZone)
  const [meter, setMeter] = useState(70)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [flash, setFlash] = useState(null)
  const [status, setStatus] = useState('playing')
  const dirRef = useRef(1)
  const posRef = useRef(0)
  const zoneRef = useRef(zone)

  useEffect(() => {
    zoneRef.current = zone
  }, [zone])

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now

      let pos = posRef.current + dirRef.current * INDICATOR_SPEED * dt
      if (pos >= 100) {
        pos = 100
        dirRef.current = -1
      } else if (pos <= 0) {
        pos = 0
        dirRef.current = 1
      }
      posRef.current = pos
      setIndicatorPos(pos)

      setMeter((m) => {
        const next = m - DECAY_RATE * dt
        if (next <= 0) {
          setStatus('over')
          return 0
        }
        return next
      })

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    if (timeLeft <= 0) {
      setStatus('won')
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, status])

  useEffect(() => {
    function handleKey(e) {
      if (e.code !== 'Space' || status !== 'playing') return
      e.preventDefault()
      const pos = posRef.current
      const z = zoneRef.current
      if (pos >= z.start && pos <= z.end) {
        setScore((s) => s + 10)
        setCombo((c) => c + 1)
        setMeter((m) => Math.min(100, m + HIT_GAIN))
        setZone(randomZone())
        setFlash('hit')
      } else {
        setCombo(0)
        setFlash('miss')
      }
      setTimeout(() => setFlash(null), 150)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [status])

  function restart() {
    posRef.current = 0
    dirRef.current = 1
    setIndicatorPos(0)
    setZone(randomZone())
    setMeter(70)
    setScore(0)
    setCombo(0)
    setTimeLeft(GAME_TIME)
    setFlash(null)
    setStatus('playing')
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
          TIME {timeLeft}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          SCORE {score}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          COMBO {combo}
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', maxWidth: 500 }}>
        <div className="music-meter-wrap">
          <span className="music-meter-label">WIND</span>
          <div className="music-meter">
            <div
              className="music-meter-fill"
              style={{ width: `${meter}%`, background: game.color }}
            />
          </div>
        </div>
        <div
          className={`music-bar ${flash === 'hit' ? 'flash-hit' : flash === 'miss' ? 'flash-miss' : ''}`}
          style={{ '--card-color': game.color }}
        >
          <div
            className="music-bar-zone"
            style={{ left: `${zone.start}%`, width: `${zone.end - zone.start}%` }}
          />
          <div className="music-bar-indicator" style={{ left: `${indicatorPos}%` }} />
        </div>
        {(status === 'over' || status === 'won') && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{status === 'won' ? 'Music box wound down safely!' : 'The music stopped...'}</h3>
            <p>Final score: {score}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Press SPACE when the marker is inside the glowing zone to keep it wound.
      </p>
    </div>
  )
}
