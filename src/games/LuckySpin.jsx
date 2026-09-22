import { useRef, useState } from 'react'
import { addTokens, getTokens } from '../utils/tokens'
import GameTitle from '../components/GameTitle'
import PixelSprite from '../sprites/PixelSprite'

const SEGMENTS = [
  { label: '25', tokens: 25, color: '#e0393e' },
  { label: '50', tokens: 50, color: '#2b7de0' },
  { label: '100', tokens: 100, color: '#2bb673' },
  { label: '?', tokens: 200, color: '#8a3ddb', mystery: true },
  { label: '200', tokens: 200, color: '#f2b90c' },
  { label: '🎁', tokens: 75, color: '#e0699c' },
]
const SEGMENT_ANGLE = 360 / SEGMENTS.length
const START_SPINS = 3

export default function LuckySpin({ game, onExit }) {
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spinsLeft, setSpinsLeft] = useState(START_SPINS)
  const [tokens, setTokens] = useState(0)
  const [wallet, setWallet] = useState(getTokens)
  const [lastPrize, setLastPrize] = useState(null)
  const wheelRef = useRef(null)

  const wheelBackground = `conic-gradient(${SEGMENTS.map((seg, i) => {
    const from = i * SEGMENT_ANGLE
    const to = from + SEGMENT_ANGLE
    return `${seg.color} ${from}deg ${to}deg`
  }).join(', ')})`

  function spin() {
    if (spinning || spinsLeft <= 0) return
    setSpinning(true)
    setLastPrize(null)
    const targetIndex = Math.floor(Math.random() * SEGMENTS.length)
    const segmentCenter = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    const extraSpins = 5 * 360
    const requiredMod = (360 - segmentCenter) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    const delta = (requiredMod - currentMod + 360) % 360
    const finalRotation = rotation + extraSpins + delta

    setRotation(finalRotation)
    setTimeout(() => {
      setSpinning(false)
      setSpinsLeft((s) => s - 1)
      setTokens((t) => t + SEGMENTS[targetIndex].tokens)
      setWallet(addTokens(SEGMENTS[targetIndex].tokens))
      setLastPrize(SEGMENTS[targetIndex])
    }, 3000)
  }

  function restart() {
    setSpinning(false)
    setSpinsLeft(START_SPINS)
    setTokens(0)
    setLastPrize(null)
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
          SPINS {spinsLeft}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          TOKENS {tokens}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          WALLET {wallet}
        </span>
      </div>

      <div className="wheel-wrap">
        <div className="wheel-pointer" style={{ color: game.color }}>
          ▼
        </div>
        <div
          ref={wheelRef}
          className="wheel"
          style={{
            background: wheelBackground,
            transform: `rotate(${rotation}deg)`,
          }}
        >
          {SEGMENTS.map((seg, i) => {
            const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
            return (
              <span
                key={i}
                className="wheel-label"
                style={{
                  transform: `rotate(${angle}deg) translate(0, -92px) rotate(${-angle}deg) translate(-50%, -50%)`,
                }}
              >
                {seg.label}
              </span>
            )
          })}
        </div>
        <div className="wheel-hub" style={{ borderColor: game.color }}>
          <PixelSprite name="freddy" size={40} mode="head" />
        </div>
      </div>

      {lastPrize && !spinning && (
        <p className="wheel-result" style={{ color: game.color }}>
          You won {lastPrize.tokens} Faz-Tokens!
        </p>
      )}

      {spinsLeft > 0 ? (
        <button
          className="spin-btn"
          style={{ background: game.color }}
          onClick={spin}
          disabled={spinning}
        >
          {spinning ? 'Spinning...' : 'SPIN'}
        </button>
      ) : (
        <div className="wheel-final" style={{ '--card-color': game.color }}>
          <h3>Out of spins!</h3>
          <p>Total Faz-Tokens: {tokens}</p>
          <button onClick={restart}>Play Again</button>
        </div>
      )}
    </div>
  )
}
