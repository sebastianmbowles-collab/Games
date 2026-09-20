import { useEffect, useRef, useState } from 'react'

const GOOD = { symbol: '🍕', points: 10 }
const BAD_ITEMS = ['🥦', '🐛', '🧅']
const FIELD_HEIGHT = 480
const BASKET_WIDTH = 90
const CATCH_Y = 46
const GAME_TIME = 45
let nextId = 0

export default function PizzaCatch({ game, onExit }) {
  const [items, setItems] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [status, setStatus] = useState('playing')
  const [basketX, setBasketX] = useState(300)
  const fieldRef = useRef(null)
  const basketXRef = useRef(basketX)

  useEffect(() => {
    basketXRef.current = basketX
  }, [basketX])

  useEffect(() => {
    if (status !== 'playing') return
    const spawn = setInterval(() => {
      const fieldWidth = fieldRef.current?.clientWidth ?? 600
      const isGood = Math.random() > 0.35
      const symbol = isGood
        ? GOOD.symbol
        : BAD_ITEMS[Math.floor(Math.random() * BAD_ITEMS.length)]
      setItems((prev) => [
        ...prev,
        {
          id: nextId++,
          x: 30 + Math.random() * (fieldWidth - 60),
          y: FIELD_HEIGHT,
          symbol,
          good: isGood,
          speed: 90 + Math.random() * 60,
        },
      ])
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
      setItems((prev) => {
        const remaining = []
        let lostLife = false
        for (const item of prev) {
          const y = item.y - item.speed * dt
          if (y <= CATCH_Y && Math.abs(item.x - basketXRef.current) < BASKET_WIDTH / 2) {
            if (item.good) {
              setScore((s) => s + GOOD.points)
            } else {
              lostLife = true
            }
            continue
          }
          if (y < -30) continue
          remaining.push({ ...item, y })
        }
        if (lostLife) setLives((l) => Math.max(0, l - 1))
        return remaining
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [status])

  useEffect(() => {
    if (status !== 'playing') return
    if (lives <= 0) {
      setStatus('over')
    }
  }, [lives, status])

  useEffect(() => {
    if (status !== 'playing') return
    if (timeLeft <= 0) {
      setStatus('over')
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, status])

  function handlePointerMove(e) {
    const rect = fieldRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setBasketX(Math.min(rect.width - 20, Math.max(20, x)))
  }

  function restart() {
    setItems([])
    setScore(0)
    setLives(3)
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
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          LIVES {'❤️'.repeat(lives) || '—'}
        </span>
      </div>
      <div
        className="balloon-field"
        ref={fieldRef}
        style={{ '--card-color': game.color, position: 'relative', cursor: 'none' }}
        onPointerMove={handlePointerMove}
      >
        {items.map((item) => (
          <span
            key={item.id}
            style={{
              position: 'absolute',
              left: item.x,
              bottom: item.y,
              fontSize: 30,
              transform: 'translate(-50%, 0)',
            }}
          >
            {item.symbol}
          </span>
        ))}
        <div
          style={{
            position: 'absolute',
            left: basketX,
            bottom: 8,
            width: BASKET_WIDTH,
            height: 26,
            transform: 'translateX(-50%)',
            background: game.color,
            borderRadius: '0 0 12px 12px',
            boxShadow: `0 0 12px ${game.color}`,
          }}
        />
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{lives <= 0 ? 'Basket\'s full of yuck!' : "Time's up!"}</h3>
            <p>Final score: {score}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Move your mouse to slide the basket. Catch pizza, dodge the gross stuff.
      </p>
    </div>
  )
}
