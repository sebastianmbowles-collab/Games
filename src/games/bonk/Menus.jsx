import { useRef, useState } from 'react'
import { loadSave, persist } from './save'
import { applySettings } from './settings'

// The round duck head used as the "O" in the logo (and the flyby).
export function DuckHead({ className = '' }) {
  return (
    <span className={`bonk-duckhead ${className}`}>
      <span className="eye l">
        <i />
      </span>
      <span className="eye r">
        <i />
      </span>
      <span className="beak" />
    </span>
  )
}

export function Settings({ onClose, onDevice, onShadows }) {
  const save = loadSave()
  const [, force] = useState(0)
  const st = (save.settings = save.settings || {})
  const [confirm, setConfirm] = useState(0)
  const set = (k, v) => {
    st[k] = v
    persist()
    applySettings()
    force((n) => n + 1)
  }
  return (
    <div className="bonk-modal" onClick={onClose}>
      <div className="bonk-panel bonk-settings" onClick={(e) => e.stopPropagation()}>
        <button className="bonk-close" onClick={onClose}>✕</button>
        <h3>⚙ SETTINGS</h3>
        <div className="bonk-set-row">
          <span>🎵 Music</span>
          <button className={st.music !== false ? 'is-on' : ''} onClick={() => set('music', st.music === false)}>
            {st.music !== false ? 'ON' : 'OFF'}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={st.musicVol ?? 0.5} onChange={(e) => set('musicVol', Number(e.target.value))} />
        </div>
        <div className="bonk-set-row">
          <span>🔊 Sound effects</span>
          <button className={st.sfx !== false ? 'is-on' : ''} onClick={() => set('sfx', st.sfx === false)}>
            {st.sfx !== false ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="bonk-set-row">
          <span>🎮 Device</span>
          <button className={save.device !== 'mobile' ? 'is-on' : ''} onClick={() => onDevice('pc')}>🖥 PC</button>
          <button className={save.device === 'mobile' ? 'is-on' : ''} onClick={() => onDevice('mobile')}>📱 Mobile</button>
        </div>
        <div className="bonk-set-row">
          <span>🌓 Shadows</span>
          <button
            className={st.shadows !== false ? 'is-on' : ''}
            onClick={() => {
              set('shadows', st.shadows === false)
              onShadows(st.shadows !== false)
            }}
          >
            {st.shadows !== false ? 'ON' : 'OFF (faster)'}
          </button>
        </div>
        <div className="bonk-set-row">
          <span>🗑 Progress</span>
          <button
            onClick={() => {
              if (confirm < 2) return setConfirm(confirm + 1)
              try {
                localStorage.removeItem('bonkDuckSave.v1')
              } catch {
                // ignore
              }
              location.reload()
            }}
          >
            {['Reset everything', 'Are you sure?', 'REALLY sure? Click again'][confirm]}
          </button>
        </div>
      </div>
    </div>
  )
}

export function HowToPlay({ onClose }) {
  return (
    <div className="bonk-modal" onClick={onClose}>
      <div className="bonk-panel bonk-howto" onClick={(e) => e.stopPropagation()}>
        <button className="bonk-close" onClick={onClose}>✕</button>
        <h3>❓ HOW TO PLAY</h3>
        <p>
          You are a <b>rubber duck</b> holding <b>balloons</b> 🎈 and a giant hammer 🔨. Everybody spawns on a floating arena.
        </p>
        <ul>
          <li>🔨 <b>Bonk</b> someone to pop one of their balloons and send them flying.</li>
          <li>😱 <b>Fall off</b> and you lose a balloon too (you float back down).</li>
          <li>💀 Lose <b>all</b> your balloons and you are out.</li>
          <li>👑 The <b>last duck with balloons</b> wins!</li>
          <li>🪶 Fewer balloons = heavier duck = harder to knock around.</li>
          <li>🎲 Every 20 seconds a random <b>EVENT</b> changes everything.</li>
        </ul>
        <h4>Controls (PC)</h4>
        <p>
          <kbd>WASD</kbd> move · <kbd>Space</kbd> jump · <kbd>F</kbd>/<kbd>J</kbd> bonk · <kbd>Shift</kbd> dash · <kbd>E</kbd> shield
          (interact in the hub) · <kbd>1</kbd>–<kbd>5</kbd> and <kbd>Q</kbd> emotes
        </p>
        <h4>Controls (Mobile)</h4>
        <p>Drag the joystick to move. Tap the big buttons to jump, bonk, dash and shield. In the hub, 🤚 opens things near you.</p>
        <h4>The hub</h4>
        <p>
          Walk into the <b>pink portal</b> to play, the <b>shop</b> to buy costumes and pets with Bonk Bucks 🪙, and the{' '}
          <b>trophy hall</b> for your 1,001 achievements. Try the <b>obbys</b> and look for <b>22 secrets</b>…
        </p>
      </div>
    </div>
  )
}

export function Joystick({ input }) {
  const base = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const update = (e) => {
    const r = base.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const max = r.width / 2
    const d = Math.hypot(dx, dy)
    if (d > max) {
      dx = (dx / d) * max
      dy = (dy / d) * max
    }
    setKnob({ x: dx, y: dy })
    input.setStick(Math.abs(dx) > 6 ? dx / max : 0, Math.abs(dy) > 6 ? dy / max : 0)
  }
  const end = () => {
    setKnob({ x: 0, y: 0 })
    input.setStick(0, 0)
  }
  return (
    <div
      ref={base}
      className="bonk-joystick"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => e.buttons && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="bonk-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}
