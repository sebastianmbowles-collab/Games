import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { AliensVsDinos as Engine, W, H } from './avd/game'
import { isMuted, setMuted } from './avd/sound'

// On-screen buttons for phones and tablets. They press the same "keys" as the keyboard.
const PAD = [
  { key: 'left', label: '◀' },
  { key: 'up', label: '▲' },
  { key: 'down', label: '▼' },
  { key: 'right', label: '▶' },
]

export default function AliensVsDinos({ game, onExit }) {
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const [muted, setMutedState] = useState(isMuted())

  useEffect(() => {
    const canvas = canvasRef.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = W * dpr
    canvas.height = H * dpr
    const engine = new Engine(canvas)
    engineRef.current = engine
    if (import.meta.env.DEV) window.__avd = engine
    return () => engine.destroy()
  }, [])

  function toggleSound() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  function hold(key) {
    return {
      onPointerDown: (e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture?.(e.pointerId)
        engineRef.current?.setKey(key, true)
      },
      onPointerUp: () => engineRef.current?.setKey(key, false),
      onPointerCancel: () => engineRef.current?.setKey(key, false),
      onContextMenu: (e) => e.preventDefault(),
    }
  }

  return (
    <div className="game-screen" style={{ '--card-color': game.color }}>
      <div className="game-topbar avd-topbar">
        <GameTitle game={game} />
        <div className="avd-top-buttons">
          <button className="exit-btn" onClick={toggleSound}>
            {muted ? 'Sound: off' : 'Sound: on'}
          </button>
          {onExit && (
            <button className="exit-btn" onClick={onExit}>
              Back to arcade
            </button>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="avd-canvas" />
      <div className="avd-pad">
        <div className="avd-pad-arrows">
          {PAD.map((b) => (
            <button key={b.key} className="avd-pad-btn" {...hold(b.key)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="avd-pad-actions">
          <button className="avd-pad-btn avd-pad-big" {...hold('action')}>
            Beam / Roar
          </button>
          <button className="avd-pad-btn avd-pad-big avd-pad-alt" {...hold('fire')}>
            Zap / Jump
          </button>
          <button className="avd-pad-btn" {...hold('pause')}>
            ⏸
          </button>
        </div>
      </div>
      <p className="avd-help">
        <b>Aliens:</b> arrow keys fly the UFO, hold <b>Space</b> to beam up dinos, <b>Z</b> zaps rival UFOs. Your UFO
        burns fuel: solve the math problem (press <b>1</b>-<b>4</b> or tap the answer) to refuel. <b>Dinos:</b> arrows to
        run, <b>↑</b> to jump, <b>Space</b> to ROAR. Each roar uses one up: spell the dino word (type the letters or tap
        them) to get more. Press <b>Enter</b> for a quiz any time. Spend your coins in the <b>Shop</b>!
      </p>
    </div>
  )
}
