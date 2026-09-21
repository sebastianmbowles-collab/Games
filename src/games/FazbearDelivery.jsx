import { useEffect, useState } from 'react'

const TABLE_COUNT = 5
const TARGET_DELIVERIES = 10
const START_LIVES = 3
const ORDER_TIME = 4.5

function randomTable(prev) {
  let table
  do {
    table = Math.floor(Math.random() * TABLE_COUNT)
  } while (table === prev)
  return table
}

export default function FazbearDelivery({ game, onExit }) {
  const [activeTable, setActiveTable] = useState(() => randomTable(-1))
  const [heat, setHeat] = useState(100)
  const [delivered, setDelivered] = useState(0)
  const [lives, setLives] = useState(START_LIVES)
  const [flashTable, setFlashTable] = useState(null)
  const [status, setStatus] = useState('playing')

  useEffect(() => {
    if (status !== 'playing') return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setHeat((h) => {
        const next = h - (100 / ORDER_TIME) * dt
        if (next <= 0) {
          missOrder()
          return 100
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeTable])

  function missOrder() {
    setLives((l) => {
      const next = l - 1
      if (next <= 0) setStatus('over')
      return next
    })
    setActiveTable((prev) => randomTable(prev))
  }

  function deliver(idx) {
    if (status !== 'playing') return
    if (idx === activeTable) {
      const next = delivered + 1
      setDelivered(next)
      setHeat(100)
      if (next >= TARGET_DELIVERIES) {
        setStatus('won')
        return
      }
      setActiveTable((prev) => randomTable(prev))
    } else {
      setFlashTable(idx)
      setLives((l) => {
        const nl = l - 1
        if (nl <= 0) setStatus('over')
        return nl
      })
      setTimeout(() => setFlashTable(null), 250)
    }
  }

  function restart() {
    setActiveTable(randomTable(-1))
    setHeat(100)
    setDelivered(0)
    setLives(START_LIVES)
    setFlashTable(null)
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
          DELIVERED {delivered}/{TARGET_DELIVERIES}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          LIVES {'❤️'.repeat(Math.max(lives, 0)) || '—'}
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
        <div className="delivery-tables">
          {Array.from({ length: TABLE_COUNT }, (_, idx) => (
            <button
              key={idx}
              className={`delivery-table ${idx === activeTable ? 'active' : ''} ${flashTable === idx ? 'wrong' : ''}`}
              onClick={() => deliver(idx)}
            >
              <span className="delivery-table-label">Table {idx + 1}</span>
              {idx === activeTable && (
                <>
                  <span className="delivery-bubble">🍕</span>
                  <div className="delivery-heat">
                    <div
                      className="delivery-heat-fill"
                      style={{ width: `${heat}%`, background: game.color }}
                    />
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
        {(status === 'over' || status === 'won') && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{status === 'won' ? 'All pizzas delivered!' : 'Out of pizzas!'}</h3>
            <p>Delivered: {delivered}/{TARGET_DELIVERIES}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Click the table with the pizza bubble before it gets cold.
      </p>
    </div>
  )
}
