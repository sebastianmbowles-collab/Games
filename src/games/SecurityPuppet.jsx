import { useEffect, useState } from 'react'

const CAM_COUNT = 8
const TARGET_ROUNDS = 10
const TENSION_RATE = 6.5
const CORRECT_RELIEF = 22
const WRONG_PENALTY = 15
const ANIMATRONICS = ['🐻', '🐰', '🐔', '🦊', '🎭']

function buildRound() {
  const movedCam = Math.floor(Math.random() * CAM_COUNT)
  const icon = ANIMATRONICS[Math.floor(Math.random() * ANIMATRONICS.length)]
  return { movedCam, icon }
}

export default function SecurityPuppet({ game, onExit }) {
  const [round, setRound] = useState(buildRound)
  const [found, setFound] = useState(0)
  const [tension, setTension] = useState(30)
  const [wrongCam, setWrongCam] = useState(null)
  const [status, setStatus] = useState('playing')

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setTension((t) => {
        const next = t + TENSION_RATE * dt
        if (next >= 100) {
          setStatus('over')
          return 100
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  function clickCam(idx) {
    if (status !== 'playing') return
    if (idx === round.movedCam) {
      const nextFound = found + 1
      setFound(nextFound)
      setTension((t) => Math.max(0, t - CORRECT_RELIEF))
      if (nextFound >= TARGET_ROUNDS) {
        setStatus('won')
        return
      }
      setRound(buildRound())
    } else {
      setWrongCam(idx)
      setTension((t) => Math.min(100, t + WRONG_PENALTY))
      setTimeout(() => setWrongCam(null), 250)
    }
  }

  function restart() {
    setRound(buildRound())
    setFound(0)
    setTension(30)
    setWrongCam(null)
    setStatus('playing')
  }

  return (
    <div className="game-screen">
      <div className="game-topbar">
        <h2 style={{ color: game.color }}>{game.title}</h2>
        <button className="exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>
      <div className="stat-bar">
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          FOUND {found}/{TARGET_ROUNDS}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          MOVED {round.icon}
        </span>
      </div>

      <div className="music-meter-wrap" style={{ maxWidth: 460 }}>
        <span className="music-meter-label">TENSION</span>
        <div className="music-meter">
          <div
            className="music-meter-fill"
            style={{ width: `${tension}%`, background: tension > 70 ? '#e0393e' : game.color }}
          />
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div className="cam-grid" style={{ '--card-color': game.color }}>
          {Array.from({ length: CAM_COUNT }, (_, idx) => (
            <button
              key={idx}
              className={`cam-tile ${wrongCam === idx ? 'wrong' : ''}`}
              onClick={() => clickCam(idx)}
            >
              <span className="cam-label">CAM {idx + 1}</span>
              <span className="cam-icon">{idx === round.movedCam ? round.icon : '🪑'}</span>
            </button>
          ))}
        </div>
        {(status === 'over' || status === 'won') && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{status === 'won' ? 'Made it through the night!' : 'Something got you...'}</h3>
            <p>Spotted: {found}/{TARGET_ROUNDS}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Click the camera showing the animatronic that moved before tension maxes out.
      </p>
    </div>
  )
}
