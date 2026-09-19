import { useEffect, useRef, useState } from 'react'

const COLORS = ['#e0393e', '#2b7de0', '#2bb673', '#f2c40c', '#8a3ddb']
const TARGET = '#e0393e'
const GAME_TIME = 45
let nextId = 0

export default function BalloonPop({ game, onExit }) {
  const [balloons, setBalloons] = useState([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [status, setStatus] = useState('playing')
  const fieldRef = useRef(null)

  useEffect(() => {
    if (status !== 'playing') return
    const spawn = setInterval(() => {
      const fieldWidth = fieldRef.current?.clientWidth ?? 600
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      setBalloons((prev) => [
        ...prev,
        {
          id: nextId++,
          x: 30 + Math.random() * (fieldWidth - 60),
          y: 480,
          color,
          speed: 60 + Math.random() * 50,
        },
      ])
    }, 650)
    return () => clearInterval(spawn)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setBalloons((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - b.speed * dt }))
          .filter((b) => b.y > -80)
      )
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

  function popBalloon(id, color) {
    setBalloons((prev) => prev.filter((b) => b.id !== id))
    setScore((s) => (color === TARGET ? s + 10 : Math.max(0, s - 5)))
  }

  function restart() {
    setBalloons([])
    setScore(0)
    setTimeLeft(GAME_TIME)
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
          TIME {timeLeft}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          SCORE {score}
        </span>
      </div>
      <div
        className="balloon-field"
        ref={fieldRef}
        style={{ '--card-color': game.color, position: 'relative' }}
      >
        {balloons.map((b) => (
          <button
            key={b.id}
            className="balloon"
            style={{ left: b.x, bottom: b.y, background: b.color }}
            onClick={() => popBalloon(b.id, b.color)}
            aria-label="balloon"
          />
        ))}
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>Time's up!</h3>
            <p>Final score: {score}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Pop the red balloons. Other colors cost you points.
      </p>
    </div>
  )
}
