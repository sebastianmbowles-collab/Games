import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { JamKitchen, W, H } from './jam/scene'
import { isMuted, setMuted } from './jam/sound'

export default function Jam({ game, onExit }) {
  const canvasRef = useRef(null)
  const kitchenRef = useRef(null)
  const [jars, setJars] = useState(0)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    const kitchen = new JamKitchen(canvas, { onShelfChange: setJars })
    kitchenRef.current = kitchen
    setJars(kitchen.shelf.length)
    return () => kitchen.destroy()
  }, [])

  function toggleSound() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <div className="game-screen" style={{ '--card-color': game.color }}>
      <div className="game-topbar jam-topbar">
        <GameTitle game={game} />
        <button className="exit-btn" onClick={onExit}>
          Back to arcade
        </button>
      </div>
      <div className="stat-bar">
        <span className="stat-pill">Jars on shelf: {jars}</span>
      </div>
      <canvas ref={canvasRef} className="jam-canvas" />
      <div className="jam-controls">
        <button onClick={() => kitchenRef.current?.emptyPot()}>Empty pot</button>
        <button onClick={toggleSound}>{muted ? 'Sound: off' : 'Sound: on'}</button>
        <button onClick={() => kitchenRef.current?.clearShelf()}>Clear shelf</button>
      </div>
      <p className="jam-help">
        Tap fruit bowls to throw fruit in the pot. Turn on the stove, stir with the spoon, add sugar if you like, then tap the
        jar. Tap a jar on the shelf to eat it on toast! Watch out for the cat: tap it to shoo it away before it steals your jam.
      </p>
    </div>
  )
}
