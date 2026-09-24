import { useState } from 'react'
import { getTokens, spendTokens } from '../utils/tokens'
import GameTitle from '../components/GameTitle'

const COST = 20
const PRIZES = [
  { name: 'Sticker', icon: '⭐', weight: 40 },
  { name: 'Keychain', icon: '🔑', weight: 25 },
  { name: 'Plush Toy', icon: '🧸', weight: 20 },
  { name: 'Party Hat', icon: '🎉', weight: 10 },
  { name: 'Golden Freddy Plush', icon: '✨', weight: 5 },
]
const TOTAL_WEIGHT = PRIZES.reduce((s, p) => s + p.weight, 0)

function rollPrize() {
  let roll = Math.random() * TOTAL_WEIGHT
  for (const prize of PRIZES) {
    if (roll < prize.weight) return prize
    roll -= prize.weight
  }
  return PRIZES[0]
}

export default function PrizeCorner({ game, onExit }) {
  const [wallet, setWallet] = useState(getTokens)
  const [won, setWon] = useState([])
  const [reveal, setReveal] = useState(null)
  const [rolling, setRolling] = useState(false)
  const [error, setError] = useState('')

  function redeem() {
    if (rolling) return
    const next = spendTokens(COST)
    if (next === null) {
      setError('Not enough Faz-Tokens!')
      setTimeout(() => setError(''), 1500)
      return
    }
    setWallet(next)
    setRolling(true)
    setReveal(null)
    setTimeout(() => {
      const prize = rollPrize()
      setWon((w) => [prize, ...w])
      setReveal(prize)
      setRolling(false)
    }, 900)
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
          WALLET {wallet}
        </span>
        <span className="stat-pill" style={{ '--card-color': game.color }}>
          PRIZES {won.length}
        </span>
      </div>

      <div className="prize-machine" style={{ '--card-color': game.color }}>
        <div className={`prize-reveal ${rolling ? 'rolling' : ''}`}>
          {rolling ? '🎁' : reveal ? reveal.icon : '❓'}
        </div>
        {reveal && !rolling && (
          <p className="wheel-result" style={{ color: game.color }}>
            You got a {reveal.name}!
          </p>
        )}
        {error && (
          <p className="wheel-result" style={{ color: '#e0393e' }}>
            {error}
          </p>
        )}
        <button
          className="spin-btn"
          style={{ background: game.color }}
          onClick={redeem}
          disabled={rolling}
        >
          {rolling ? 'Opening...' : `REDEEM (${COST} tokens)`}
        </button>
      </div>

      {won.length > 0 && (
        <div className="prize-shelf">
          {won.map((p, i) => (
            <div key={i} className="prize-shelf-item" title={p.name}>
              {p.icon}
            </div>
          ))}
        </div>
      )}

      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        Spend Faz-Tokens for a random prize. Earn more tokens at Freddy's Lucky Spin!
      </p>
    </div>
  )
}
