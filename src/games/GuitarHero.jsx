import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'

const LANES = [
  { key: 'D', color: '#e0393e' },
  { key: 'F', color: '#f2c40c' },
  { key: 'J', color: '#2bb673' },
  { key: 'K', color: '#2b7de0' },
]
const FIELD_HEIGHT = 480
const HIT_Y = 400
const HIT_WINDOW = 32
const SONG_TIME = 60
let nextId = 0

export default function GuitarHero({ game, onExit }) {
  const [notes, setNotes] = useState([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SONG_TIME)
  const [status, setStatus] = useState('playing')
  const [activeLane, setActiveLane] = useState(null)
  const notesRef = useRef(notes)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    if (status !== 'playing') return
    const spawn = setInterval(() => {
      const lane = Math.floor(Math.random() * LANES.length)
      setNotes((prev) => [...prev, { id: nextId++, lane, y: -30 }])
    }, 550)
    return () => clearInterval(spawn)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setNotes((prev) => {
        const next = []
        let missed = false
        for (const n of prev) {
          const y = n.y + 180 * dt
          if (y > FIELD_HEIGHT + 40) {
            missed = true
          } else {
            next.push({ ...n, y })
          }
        }
        if (missed) setCombo(0)
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
      setStatus('over')
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, status])

  useEffect(() => {
    function handleKey(e) {
      if (status !== 'playing') return
      const laneIdx = LANES.findIndex((l) => l.key === e.key.toUpperCase())
      if (laneIdx === -1) return
      setActiveLane(laneIdx)
      setTimeout(() => setActiveLane((l) => (l === laneIdx ? null : l)), 120)

      const candidates = notesRef.current.filter(
        (n) => n.lane === laneIdx && Math.abs(n.y - HIT_Y) <= HIT_WINDOW
      )
      if (candidates.length > 0) {
        const hit = candidates.reduce((a, b) =>
          Math.abs(a.y - HIT_Y) < Math.abs(b.y - HIT_Y) ? a : b
        )
        setNotes((prev) => prev.filter((n) => n.id !== hit.id))
        setScore((s) => s + 10)
        setCombo((c) => c + 1)
      } else {
        setCombo(0)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [status])

  function restart() {
    setNotes([])
    setScore(0)
    setCombo(0)
    setTimeLeft(SONG_TIME)
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
      <div className="guitar-track" style={{ position: 'relative' }}>
        {LANES.map((lane, laneIdx) => (
          <div className="guitar-lane" key={lane.key}>
            {notes
              .filter((n) => n.lane === laneIdx)
              .map((n) => (
                <div
                  key={n.id}
                  className="note"
                  style={{ top: n.y, background: lane.color }}
                />
              ))}
            <div
              className={`hit-zone ${activeLane === laneIdx ? 'active' : ''}`}
              style={{ color: lane.color, top: HIT_Y - 8 }}
            />
          </div>
        ))}
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>Song over!</h3>
            <p>Final score: {score}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <div className="guitar-keys-row">
        {LANES.map((lane) => (
          <span key={lane.key} style={{ color: lane.color }}>
            {lane.key}
          </span>
        ))}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Press D, F, J, K when the notes reach the hit zone.
      </p>
    </div>
  )
}
