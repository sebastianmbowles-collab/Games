import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { TadcGame } from './tadc/game'
import { isMuted, setMuted } from './tadc/sound'

function TouchButton({ action, label, gameRef, className }) {
  const set = (down) => (e) => {
    e.preventDefault()
    gameRef.current?.setTouch(action, down)
  }
  return (
    <button
      className={`tadc-touch ${className || ''}`}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerLeave={set(false)}
      onPointerCancel={set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

export default function TADC({ game, onExit }) {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    const g = new TadcGame(canvasRef.current)
    gameRef.current = g
    if (import.meta.env.DEV) window.__tadc = g
    return () => g.destroy()
  }, [])

  function toggleSound() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <div className="game-screen" style={{ '--card-color': game.color }}>
      <div className="game-topbar tadc-topbar">
        <GameTitle game={game} />
        <button className="exit-btn" onClick={onExit}>
          Back to arcade
        </button>
      </div>
      <canvas ref={canvasRef} className="tadc-canvas" />
      <div className="tadc-pad">
        <div className="tadc-pad-side">
          <TouchButton action="left" label="◀" gameRef={gameRef} />
          <TouchButton action="right" label="▶" gameRef={gameRef} />
        </div>
        <div className="tadc-pad-side">
          <button className="tadc-small" onClick={() => gameRef.current?.goMap()}>
            Map
          </button>
          <button className="tadc-small" onClick={toggleSound}>
            {muted ? 'Sound: off' : 'Sound: on'}
          </button>
        </div>
        <div className="tadc-pad-side">
          <TouchButton action="jump" label="JUMP" gameRef={gameRef} className="tadc-jump" />
        </div>
      </div>
      <p className="tadc-help">
        Arrow keys or A/D to run, Space/Up/W to jump, Esc for the map. Dodge each boss's attacks until they get tired,
        then jump on their head. Three stomps wins the show!
      </p>
    </div>
  )
}
