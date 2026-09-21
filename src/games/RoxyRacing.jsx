import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'

const LANES = 3
const FIELD_HEIGHT = 480
const PLAYER_Y = 400
const PLAYER_HEIGHT = 50
const OBSTACLE_HEIGHT = 46
const TOTAL_LAPS = 3
const LAP_DISTANCE = 900
let nextId = 0

export default function RoxyRacing({ game, onExit }) {
  const [playerLane, setPlayerLane] = useState(1)
  const [obstacles, setObstacles] = useState([])
  const [distance, setDistance] = useState(0)
  const [speed, setSpeed] = useState(200)
  const [status, setStatus] = useState('playing')
  const speedRef = useRef(200)
  const distanceRef = useRef(0)
  const playerLaneRef = useRef(1)

  useEffect(() => {
    playerLaneRef.current = playerLane
  }, [playerLane])

  useEffect(() => {
    if (status !== 'playing') return
    function handleKey(e) {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        setPlayerLane((l) => Math.max(0, l - 1))
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        setPlayerLane((l) => Math.min(LANES - 1, l + 1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    const spawn = setInterval(() => {
      const lane = Math.floor(Math.random() * LANES)
      setObstacles((prev) => [...prev, { id: nextId++, lane, y: -OBSTACLE_HEIGHT }])
    }, 850)
    return () => clearInterval(spawn)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      speedRef.current = Math.min(420, speedRef.current + dt * 6)
      distanceRef.current += speedRef.current * dt
      setDistance(distanceRef.current)
      setSpeed(speedRef.current)

      if (distanceRef.current >= LAP_DISTANCE * TOTAL_LAPS) {
        setStatus('won')
        return
      }

      let crashed = false
      setObstacles((prev) => {
        const next = []
        for (const o of prev) {
          const y = o.y + speedRef.current * dt
          if (
            o.lane === playerLaneRef.current &&
            y + OBSTACLE_HEIGHT > PLAYER_Y &&
            y < PLAYER_Y + PLAYER_HEIGHT
          ) {
            crashed = true
          }
          if (y < FIELD_HEIGHT + 60) next.push({ ...o, y })
        }
        return next
      })
      if (crashed) {
        setStatus('over')
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  function restart() {
    setPlayerLane(1)
    setObstacles([])
    setDistance(0)
    distanceRef.current = 0
    speedRef.current = 200
    setSpeed(200)
    setStatus('playing')
  }

  const lap = Math.min(TOTAL_LAPS, Math.floor(distance / LAP_DISTANCE) + 1)
  const laneWidth = 420 / LANES

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
          LAP {lap}/{TOTAL_LAPS}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          SPEED {Math.round(speed)}
        </span>
      </div>
      <div className="race-track" style={{ '--card-color': game.color }}>
        {Array.from({ length: LANES - 1 }, (_, i) => (
          <div key={i} className="race-lane-line" style={{ left: laneWidth * (i + 1) }} />
        ))}
        {obstacles.map((o) => (
          <div
            key={o.id}
            className="race-obstacle"
            style={{ left: o.lane * laneWidth, width: laneWidth, top: o.y }}
          >
            🚧
          </div>
        ))}
        <div
          className="race-player"
          style={{ left: playerLane * laneWidth, width: laneWidth, top: PLAYER_Y }}
        >
          🏎️
        </div>
        {(status === 'over' || status === 'won') && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{status === 'won' ? 'Race complete!' : 'Crashed!'}</h3>
            <p>Laps: {status === 'won' ? TOTAL_LAPS : lap - 1}/{TOTAL_LAPS}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Use ← and → (or A/D) to switch lanes and dodge the obstacles.
      </p>
    </div>
  )
}
