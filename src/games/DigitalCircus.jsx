import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { Circus, W, H } from './circus/scene'
import { isMuted, setMuted } from './circus/sound'

export default function DigitalCircus({ game, onExit }) {
  const canvasRef = useRef(null)
  const circusRef = useRef(null)
  const [tickets, setTickets] = useState(0)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    const circus = new Circus(canvas, { onTickets: setTickets })
    circusRef.current = circus
    return () => circus.destroy()
  }, [])

  function toggleSound() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <div className="game-screen" style={{ '--card-color': game.color }}>
      <div className="game-topbar circus-topbar">
        <GameTitle game={game} />
        <button className="exit-btn" onClick={onExit}>
          Back to arcade
        </button>
      </div>
      <div className="stat-bar">
        <span className="stat-pill">Tickets: {tickets}</span>
      </div>
      <canvas ref={canvasRef} className="circus-canvas" />
      <div className="circus-controls">
        <button onClick={() => circusRef.current?.toMenu()}>Big top</button>
        <button onClick={toggleSound}>{muted ? 'Sound: off' : 'Sound: on'}</button>
      </div>
      <p className="circus-help">
        Welcome to the Digital Circus! Pick one of three acts. Juggle Jumble: tap the balls to keep them in the air, but
        never tap the glitchy purple ones. Wobbly Wire: hold left or right (arrow keys or the sides of the screen) to
        keep Jingle balanced. Cannon Blast: tap to aim, tap to fire, land in the net. Press Esc to go back to the big top.
      </p>
    </div>
  )
}
