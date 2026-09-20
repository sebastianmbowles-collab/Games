import { useEffect, useState } from 'react'

const COLORS = ['#e0393e', '#2b7de0', '#f2c40c', '#2bb673', '#8a3ddb']
const BOARD_WIDTH = 520
const BOARD_HEIGHT = 420
const GAME_TIME = 60

function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildBoard() {
  const rightOrder = shuffledIndices(COLORS.length)
  const spacing = BOARD_HEIGHT / (COLORS.length + 1)
  const left = COLORS.map((color, i) => ({
    color,
    x: 40,
    y: spacing * (i + 1),
  }))
  const right = rightOrder.map((colorIdx, i) => ({
    color: COLORS[colorIdx],
    x: BOARD_WIDTH - 40,
    y: spacing * (i + 1),
  }))
  return { left, right }
}

export default function RepairShop({ game, onExit }) {
  const [board, setBoard] = useState(buildBoard)
  const [connected, setConnected] = useState([])
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [mistake, setMistake] = useState(null)
  const [repairs, setRepairs] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
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

  useEffect(() => {
    if (status !== 'playing') return
    if (connected.length === COLORS.length) {
      setRepairs((r) => r + COLORS.length)
      setTimeout(() => {
        setBoard(buildBoard())
        setConnected([])
        setSelectedLeft(null)
      }, 400)
    }
  }, [connected, status])

  function pickLeft(idx) {
    if (status !== 'playing' || connected.includes(idx)) return
    setSelectedLeft(idx)
  }

  function pickRight(rightIdx) {
    if (status !== 'playing' || selectedLeft === null) return
    if (connected.includes(selectedLeft)) return
    const leftColor = board.left[selectedLeft].color
    const rightColor = board.right[rightIdx].color
    if (leftColor === rightColor) {
      setConnected((c) => [...c, selectedLeft])
      setSelectedLeft(null)
    } else {
      setMistake(rightIdx)
      setTimeout(() => setMistake(null), 250)
      setSelectedLeft(null)
    }
  }

  function restart() {
    setBoard(buildBoard())
    setConnected([])
    setSelectedLeft(null)
    setRepairs(0)
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
          REPAIRS {repairs}
        </span>
      </div>
      <div
        className="repair-board"
        style={{ '--card-color': game.color, width: BOARD_WIDTH, height: BOARD_HEIGHT }}
      >
        <svg width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ position: 'absolute', inset: 0 }}>
          {connected.map((leftIdx) => {
            const rightIdx = board.right.findIndex(
              (r) => r.color === board.left[leftIdx].color
            )
            const l = board.left[leftIdx]
            const r = board.right[rightIdx]
            return (
              <line
                key={leftIdx}
                x1={l.x}
                y1={l.y}
                x2={r.x}
                y2={r.y}
                stroke={l.color}
                strokeWidth={4}
              />
            )
          })}
        </svg>
        {board.left.map((node, idx) => (
          <button
            key={`l${idx}`}
            className={`repair-node ${connected.includes(idx) ? 'connected' : ''}`}
            style={{
              left: node.x,
              top: node.y,
              background: node.color,
              color: node.color,
              outline: selectedLeft === idx ? '3px solid white' : 'none',
            }}
            onClick={() => pickLeft(idx)}
            aria-label="wire start"
          />
        ))}
        {board.right.map((node, idx) => (
          <button
            key={`r${idx}`}
            className={`repair-node ${
              connected.some((li) => board.left[li].color === node.color) ? 'connected' : ''
            }`}
            style={{
              left: node.x,
              top: node.y,
              background: node.color,
              color: node.color,
              outline: mistake === idx ? '3px solid #fff' : 'none',
            }}
            onClick={() => pickRight(idx)}
            aria-label="wire end"
          />
        ))}
        {status === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>Time's up!</h3>
            <p>Wires repaired: {repairs}</p>
            <button onClick={restart}>Play Again</button>
          </div>
        )}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Click a wire on the left, then click the matching color on the right.
      </p>
    </div>
  )
}
