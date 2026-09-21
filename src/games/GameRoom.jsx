import { useEffect, useRef, useState } from 'react'

const MASH_TIME = 4
const ODD_COUNT = 8

function buildOddOneOut() {
  const iconPool = ['🍕', '🎈', '🎸', '⭐', '🍩', '🎯']
  const base = iconPool[Math.floor(Math.random() * iconPool.length)]
  const odd = iconPool.filter((i) => i !== base)[0]
  const oddIdx = Math.floor(Math.random() * ODD_COUNT)
  return { base, odd, oddIdx }
}

export default function GameRoom({ game, onExit }) {
  const [stage, setStage] = useState('intro')
  const [scores, setScores] = useState({ reaction: 0, mash: 0, match: 0 })
  const [reactionState, setReactionState] = useState('waiting')
  const [mashCount, setMashCount] = useState(0)
  const [mashTimeLeft, setMashTimeLeft] = useState(MASH_TIME)
  const [oddSet, setOddSet] = useState(buildOddOneOut)
  const waitStartRef = useRef(0)
  const reactionTimeoutRef = useRef(null)

  useEffect(() => {
    if (stage !== 'reaction' || reactionState !== 'waiting') return
    const delay = 800 + Math.random() * 1800
    reactionTimeoutRef.current = setTimeout(() => {
      waitStartRef.current = performance.now()
      setReactionState('go')
    }, delay)
    return () => clearTimeout(reactionTimeoutRef.current)
  }, [stage, reactionState])

  function handleReactionClick() {
    if (reactionState === 'waiting') {
      clearTimeout(reactionTimeoutRef.current)
      setReactionState('early')
    } else if (reactionState === 'go') {
      const ms = performance.now() - waitStartRef.current
      const points = Math.max(0, Math.round(300 - ms))
      setScores((s) => ({ ...s, reaction: points }))
      setReactionState('done')
    }
  }

  useEffect(() => {
    if (stage !== 'mash') return
    if (mashTimeLeft <= 0) {
      setScores((s) => ({ ...s, mash: mashCount * 10 }))
      setStage('match')
      return
    }
    const t = setTimeout(() => setMashTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mashTimeLeft])

  function handleMatchClick(idx) {
    if (idx === oddSet.oddIdx) {
      setScores((s) => ({ ...s, match: 200 }))
    } else {
      setScores((s) => ({ ...s, match: 50 }))
    }
    setStage('done')
  }

  function restart() {
    setStage('intro')
    setScores({ reaction: 0, mash: 0, match: 0 })
    setReactionState('waiting')
    setMashCount(0)
    setMashTimeLeft(MASH_TIME)
    setOddSet(buildOddOneOut())
  }

  const total = scores.reaction + scores.mash + scores.match

  return (
    <div className="game-screen">
      <div className="game-topbar">
        <h2 style={{ color: game.color }}>{game.title}</h2>
        <button className="exit-btn" onClick={onExit}>
          Exit
        </button>
      </div>

      {stage === 'intro' && (
        <div className="room-panel" style={{ '--card-color': game.color }}>
          <h3>Three tiny games, back to back!</h3>
          <p>Reflex click, button mash, then spot the odd one out.</p>
          <button className="spin-btn" style={{ background: game.color }} onClick={() => setStage('reaction')}>
            START
          </button>
        </div>
      )}

      {stage === 'reaction' && (
        <div className="room-panel" style={{ '--card-color': game.color }}>
          <h3>Game 1: Reaction</h3>
          {reactionState !== 'done' ? (
            <button
              className={`reaction-box ${reactionState === 'go' ? 'go' : ''} ${reactionState === 'early' ? 'early' : ''}`}
              onClick={handleReactionClick}
            >
              {reactionState === 'waiting' && 'Wait for green...'}
              {reactionState === 'go' && 'CLICK NOW!'}
              {reactionState === 'early' && 'Too soon! Click to retry.'}
            </button>
          ) : (
            <>
              <p>Reaction score: {scores.reaction}</p>
              <button className="spin-btn" style={{ background: game.color }} onClick={() => setStage('mash')}>
                NEXT
              </button>
            </>
          )}
          {reactionState === 'early' && (
            <button
              className="spin-btn"
              style={{ background: game.color, marginTop: 10 }}
              onClick={() => setReactionState('waiting')}
            >
              RETRY
            </button>
          )}
        </div>
      )}

      {stage === 'mash' && (
        <div className="room-panel" style={{ '--card-color': game.color }}>
          <h3>Game 2: Mash!</h3>
          <p>Time left: {mashTimeLeft}s</p>
          <button
            className="reaction-box mash"
            onClick={() => setMashCount((c) => c + 1)}
          >
            {mashCount}
          </button>
        </div>
      )}

      {stage === 'match' && (
        <div className="room-panel" style={{ '--card-color': game.color }}>
          <h3>Game 3: Odd One Out</h3>
          <div className="odd-grid">
            {Array.from({ length: ODD_COUNT }, (_, i) => (
              <button key={i} className="odd-tile" onClick={() => handleMatchClick(i)}>
                {i === oddSet.oddIdx ? oddSet.odd : oddSet.base}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="room-panel" style={{ '--card-color': game.color }}>
          <h3>Game room complete!</h3>
          <p>Reaction: {scores.reaction}</p>
          <p>Mash: {scores.mash}</p>
          <p>Odd one out: {scores.match}</p>
          <p style={{ color: game.color, fontWeight: 700 }}>Total: {total}</p>
          <button className="spin-btn" style={{ background: game.color }} onClick={restart}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}
