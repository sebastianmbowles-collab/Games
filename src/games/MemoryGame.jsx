import { useEffect, useState } from 'react'

const TILES = [
  { symbol: '⭐', color: '#f2c40c' },
  { symbol: '🌙', color: '#2b7de0' },
  { symbol: '❤️', color: '#e0393e' },
  { symbol: '💀', color: '#9b9bb0' },
  { symbol: '⬛', color: '#8a3ddb' },
  { symbol: '▲', color: '#2bb673' },
]

function nextStep(sequence) {
  return [...sequence, Math.floor(Math.random() * TILES.length)]
}

export default function MemoryGame({ game, onExit }) {
  const [sequence, setSequence] = useState(() => nextStep([]))
  const [round, setRound] = useState(1)
  const [playerStep, setPlayerStep] = useState(0)
  const [litTile, setLitTile] = useState(null)
  const [phase, setPhase] = useState('showing')
  const [status, setStatus] = useState('playing')

  useEffect(() => {
    if (status !== 'playing' || phase !== 'showing') return
    let cancelled = false
    async function playback() {
      await new Promise((r) => setTimeout(r, 500))
      for (const tileIdx of sequence) {
        if (cancelled) return
        setLitTile(tileIdx)
        await new Promise((r) => setTimeout(r, 450))
        setLitTile(null)
        await new Promise((r) => setTimeout(r, 200))
      }
      if (!cancelled) {
        setPlayerStep(0)
        setPhase('input')
      }
    }
    playback()
    return () => {
      cancelled = true
    }
  }, [sequence, phase, status])

  function handleTileClick(tileIdx) {
    if (phase !== 'input' || status !== 'playing') return
    setLitTile(tileIdx)
    setTimeout(() => setLitTile(null), 150)

    if (tileIdx === sequence[playerStep]) {
      if (playerStep + 1 === sequence.length) {
        setTimeout(() => {
          setSequence((seq) => nextStep(seq))
          setRound((r) => r + 1)
          setPhase('showing')
        }, 500)
      } else {
        setPlayerStep((s) => s + 1)
      }
    } else {
      setStatus('over')
    }
  }

  function restart() {
    setSequence(nextStep([]))
    setRound(1)
    setPlayerStep(0)
    setPhase('showing')
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
          ROUND {round}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          {phase === 'showing' ? 'WATCH...' : 'YOUR TURN'}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="memory-grid">
          {TILES.map((tile, idx) => (
            <button
              key={idx}
              className={`memory-tile ${litTile === idx ? 'lit' : ''}`}
              style={{ background: tile.color, color: tile.color }}
              onClick={() => handleTileClick(idx)}
            >
              {tile.symbol}
            </button>
          ))}
        </div>
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>Wrong tile!</h3>
            <p>You made it to round {round}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 16, fontSize: 13 }}>
        Watch the sequence, then click the tiles in the same order.
      </p>
    </div>
  )
}
