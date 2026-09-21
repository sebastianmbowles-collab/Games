import { useState } from 'react'
import GameTitle from '../components/GameTitle'

const COLS = 5
const ROWS = 4
const TILE_COUNT = COLS * ROWS
const TREASURE_COUNT = 5
const MAX_DIGS = 10
const TREASURE_ITEMS = ['💰', '💎', '👑', '🗝️', '⚓']
const EMPTY_ITEMS = ['🦴', '🐚', '🪨', '🌾']

function buildTiles() {
  const treasureSpots = new Set()
  while (treasureSpots.size < TREASURE_COUNT) {
    treasureSpots.add(Math.floor(Math.random() * TILE_COUNT))
  }
  return Array.from({ length: TILE_COUNT }, (_, i) => ({
    treasure: treasureSpots.has(i),
    dug: false,
    item: treasureSpots.has(i)
      ? TREASURE_ITEMS[Math.floor(Math.random() * TREASURE_ITEMS.length)]
      : EMPTY_ITEMS[Math.floor(Math.random() * EMPTY_ITEMS.length)],
  }))
}

export default function TreasureHunt({ game, onExit }) {
  const [tiles, setTiles] = useState(buildTiles)
  const [digsLeft, setDigsLeft] = useState(MAX_DIGS)
  const [score, setScore] = useState(0)
  const [found, setFound] = useState(0)
  const [status, setStatus] = useState('playing')

  function dig(idx) {
    if (status !== 'playing' || tiles[idx].dug || digsLeft <= 0) return
    const nextTiles = tiles.map((t, i) => (i === idx ? { ...t, dug: true } : t))
    setTiles(nextTiles)
    const remainingDigs = digsLeft - 1
    setDigsLeft(remainingDigs)
    let nextFound = found
    if (tiles[idx].treasure) {
      setScore((s) => s + 20)
      nextFound = found + 1
      setFound(nextFound)
    }
    if (nextFound >= TREASURE_COUNT || remainingDigs <= 0) {
      setStatus('over')
    }
  }

  function restart() {
    setTiles(buildTiles())
    setDigsLeft(MAX_DIGS)
    setScore(0)
    setFound(0)
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
          DIGS {digsLeft}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          SCORE {score}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          FOUND {found}/{TREASURE_COUNT}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <div className="dig-grid" style={{ '--card-color': game.color }}>
          {tiles.map((tile, idx) => (
            <button
              key={idx}
              className={`dig-tile ${tile.dug ? (tile.treasure ? 'found-treasure' : 'found-empty') : ''}`}
              onClick={() => dig(idx)}
              disabled={tile.dug}
            >
              {tile.dug ? tile.item : '⛰️'}
            </button>
          ))}
        </div>
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{found >= TREASURE_COUNT ? 'Found it all!' : 'Out of digs!'}</h3>
            <p>Treasure found: {found}/{TREASURE_COUNT}</p>
            <p>Score: {score}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Dig up sand tiles to find the {TREASURE_COUNT} hidden treasures.
      </p>
    </div>
  )
}
