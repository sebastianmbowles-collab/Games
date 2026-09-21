import { useRef, useState } from 'react'

const FIELD_WIDTH = 520
const FIELD_HEIGHT = 400
const BALL_RADIUS = 8
const HOLE_RADIUS = 16
const OBSTACLE_RADIUS = 26
const MAX_SHOTS = 5
const TOTAL_HOLES = 3
const START_POS = { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT - 30 }

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function randomPoint(margin) {
  return {
    x: margin + Math.random() * (FIELD_WIDTH - margin * 2),
    y: margin + Math.random() * (FIELD_HEIGHT * 0.6 - margin),
  }
}

function buildHole() {
  let hole = randomPoint(50)
  const obstacleCount = 1 + Math.floor(Math.random() * 3)
  const obstacles = []
  for (let i = 0; i < obstacleCount; i++) {
    let p
    let tries = 0
    do {
      p = randomPoint(40)
      tries++
    } while (
      tries < 20 &&
      (dist(p, hole) < OBSTACLE_RADIUS + HOLE_RADIUS + 20 ||
        dist(p, START_POS) < OBSTACLE_RADIUS + 60)
    )
    obstacles.push(p)
  }
  return { hole, obstacles }
}

export default function MontyGolf({ game, onExit }) {
  const [holeIndex, setHoleIndex] = useState(0)
  const [layout, setLayout] = useState(buildHole)
  const [ball, setBall] = useState(START_POS)
  const [shots, setShots] = useState(0)
  const [totalShots, setTotalShots] = useState(0)
  const [message, setMessage] = useState('')
  const [moving, setMoving] = useState(false)
  const [status, setStatus] = useState('playing')
  const fieldRef = useRef(null)

  function clampTarget(from, to) {
    for (const obs of layout.obstacles) {
      const segLen = dist(from, to)
      if (segLen === 0) continue
      const dirX = (to.x - from.x) / segLen
      const dirY = (to.y - from.y) / segLen
      const toObsX = obs.x - from.x
      const toObsY = obs.y - from.y
      const proj = toObsX * dirX + toObsY * dirY
      if (proj < 0 || proj > segLen) continue
      const closestX = from.x + dirX * proj
      const closestY = from.y + dirY * proj
      const distToObs = Math.hypot(obs.x - closestX, obs.y - closestY)
      if (distToObs < OBSTACLE_RADIUS + BALL_RADIUS) {
        const stopDist = Math.max(0, proj - OBSTACLE_RADIUS - BALL_RADIUS)
        return { x: from.x + dirX * stopDist, y: from.y + dirY * stopDist }
      }
    }
    return to
  }

  function putt(e) {
    if (status !== 'playing' || moving) return
    const rect = fieldRef.current.getBoundingClientRect()
    const rawTarget = {
      x: Math.min(FIELD_WIDTH, Math.max(0, e.clientX - rect.left)),
      y: Math.min(FIELD_HEIGHT, Math.max(0, e.clientY - rect.top)),
    }
    const target = clampTarget(ball, rawTarget)
    setMoving(true)
    setMessage('')

    const from = ball
    const duration = Math.min(1200, 300 + dist(from, target) * 1.5)
    const start = performance.now()

    function step(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 2)
      setBall({
        x: from.x + (target.x - from.x) * eased,
        y: from.y + (target.y - from.y) * eased,
      })
      if (t < 1) {
        requestAnimationFrame(step)
      } else {
        settle(target)
      }
    }
    requestAnimationFrame(step)
  }

  function settle(finalPos) {
    setMoving(false)
    const nextShots = shots + 1
    setShots(nextShots)
    setTotalShots((t) => t + 1)

    if (dist(finalPos, layout.hole) <= HOLE_RADIUS) {
      setMessage(`In the hole! (${nextShots} shot${nextShots === 1 ? '' : 's'})`)
      setTimeout(() => advanceHole(), 1100)
    } else if (nextShots >= MAX_SHOTS) {
      setMessage('Out of shots for this hole!')
      setTimeout(() => advanceHole(), 1100)
    }
  }

  function advanceHole() {
    if (holeIndex + 1 >= TOTAL_HOLES) {
      setStatus('over')
      return
    }
    setHoleIndex((h) => h + 1)
    setLayout(buildHole())
    setBall(START_POS)
    setShots(0)
    setMessage('')
  }

  function restart() {
    setHoleIndex(0)
    setLayout(buildHole())
    setBall(START_POS)
    setShots(0)
    setTotalShots(0)
    setMessage('')
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
          HOLE {holeIndex + 1}/{TOTAL_HOLES}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          SHOTS {shots}/{MAX_SHOTS}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          TOTAL {totalShots}
        </span>
      </div>
      <div
        className="golf-field"
        ref={fieldRef}
        style={{ '--card-color': game.color, width: FIELD_WIDTH, height: FIELD_HEIGHT }}
        onClick={putt}
      >
        <div className="golf-hole" style={{ left: layout.hole.x, top: layout.hole.y }} />
        {layout.obstacles.map((o, i) => (
          <div key={i} className="golf-obstacle" style={{ left: o.x, top: o.y }} />
        ))}
        <div className="golf-ball" style={{ left: ball.x, top: ball.y }} />
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>Round complete!</h3>
            <p>Total strokes: {totalShots}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      {message && (
        <p className="wheel-result" style={{ color: game.color }}>
          {message}
        </p>
      )}
      <p style={{ color: '#9b9bb0', marginTop: 8, fontSize: 13 }}>
        Click anywhere in the field to putt the ball toward that spot.
      </p>
    </div>
  )
}
