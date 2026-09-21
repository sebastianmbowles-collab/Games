import { useEffect, useState } from 'react'
import GameTitle from '../components/GameTitle'

const ICONS = ['🔦', '🗝️', '📦', '🪞', '🕯️', '🧸', '🎭', '⚙️', '🪑', '🧵', '🖼️', '🧰']
const GRID_SIZE = 24
const TOTAL_ROUNDS = 8
const GAME_TIME = 90
const WRONG_PENALTY = 4

function buildBoard() {
  const target = ICONS[Math.floor(Math.random() * ICONS.length)]
  const targetSpot = Math.floor(Math.random() * GRID_SIZE)
  const decoys = ICONS.filter((i) => i !== target)
  const tiles = Array.from({ length: GRID_SIZE }, (_, i) =>
    i === targetSpot ? target : decoys[Math.floor(Math.random() * decoys.length)]
  )
  return { target, tiles }
}

export default function HideAndSeek({ game, onExit }) {
  const [board, setBoard] = useState(buildBoard)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [wrongTile, setWrongTile] = useState(null)
  const [status, setStatus] = useState('playing')

  useEffect(() => {
    if (status !== 'playing') return
    if (timeLeft <= 0) {
      setStatus('over')
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, status])

  function clickTile(idx) {
    if (status !== 'playing') return
    if (board.tiles[idx] === board.target) {
      if (round >= TOTAL_ROUNDS) {
        setStatus('won')
        return
      }
      setRound((r) => r + 1)
      setBoard(buildBoard())
    } else {
      setWrongTile(idx)
      setTimeLeft((t) => Math.max(0, t - WRONG_PENALTY))
      setTimeout(() => setWrongTile(null), 250)
    }
  }

  function restart() {
    setBoard(buildBoard())
    setRound(1)
    setTimeLeft(GAME_TIME)
    setWrongTile(null)
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
          ROUND {round}/{TOTAL_ROUNDS}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          FIND {board.target}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="seek-grid" style={{ '--card-color': game.color }}>
          {board.tiles.map((icon, idx) => (
            <button
              key={idx}
              className={`seek-tile ${wrongTile === idx ? 'wrong' : ''}`}
              onClick={() => clickTile(idx)}
            >
              {icon}
            </button>
          ))}
        </div>
        {(status === 'over' || status === 'won') && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{status === 'won' ? 'Found everything!' : "Time's up!"}</h3>
            <p>Rounds found: {status === 'won' ? TOTAL_ROUNDS : round - 1}/{TOTAL_ROUNDS}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Click the tile matching the icon shown in FIND. Wrong guesses cost time.
      </p>
    </div>
  )
}
