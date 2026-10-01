import { useEffect, useRef } from 'react'
import GameTitle from '../components/GameTitle'
import { TadcGame } from './tadc/game'

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
  const screenRef = useRef(null)
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else screenRef.current?.requestFullscreen?.().catch(() => {})
  }

  useEffect(() => {
    const g = new TadcGame(canvasRef.current)
    gameRef.current = g
    if (import.meta.env.DEV) {
      window.__tadc = g
      import('./tadc/sound').then((m) => (window.__song = m.currentSong))
    }
    return () => g.destroy()
  }, [])

  return (
    <div className="game-screen tadc-screen" ref={screenRef} style={{ '--card-color': game.color }}>
      <div className="game-topbar tadc-topbar">
        <GameTitle game={game} />
        <div className="tadc-topbtns">
          {canFullscreen && (
            <button className="exit-btn" onClick={toggleFullscreen} title="Fullscreen">
              ⛶
            </button>
          )}
          <button className="exit-btn" onClick={onExit}>
            Back to arcade
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="tadc-canvas" />
      <div className="tadc-pad">
        <div className="tadc-pad-side">
          <TouchButton action="left" label="◀" gameRef={gameRef} />
          <TouchButton action="right" label="▶" gameRef={gameRef} />
        </div>
        <div className="tadc-pad-side">
          <TouchButton action="start" label="START" gameRef={gameRef} className="tadc-start" />
        </div>
        <div className="tadc-pad-side">
          <TouchButton action="jump" label="A" gameRef={gameRef} className="tadc-jump" />
        </div>
      </div>
      <p className="tadc-help">
        Arrow keys (or a game controller) to move, Z / Space / Up to jump (the A button), Enter to pause (START). One hit and you are out:
        survive each boss&apos;s whole show to beat them. Sound, difficulty, outfits and helpers (Calm mode, Slow motion)
        are in OPTIONS. Beat the game to unlock ENCORE and a secret bonus boss!
      </p>
    </div>
  )
}
