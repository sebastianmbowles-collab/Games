import { useEffect, useRef, useState } from 'react'
import { byKey } from './fighters'
import { pressButton } from './engine'
import { stillCanvas } from './look'
import { sfx, isMuted, setMuted } from './sound'
import { ACHIEVEMENTS, COSTUMES, costumeUnlocked, unlockHint } from './progress'
import { cleanText, isRude, SWEAR_LIMIT, BAN_MS } from './chat'

// A still pixel-art picture of a fighter: 'head' close-up or full 'body', scaled up crisply.
// `hidden` draws a mystery silhouette for locked fighters.
export function PixelArt({ fighterKey, kind = 'head', zoom = 2, costume = 'classic', hidden = false }) {
  const ref = useRef(null)
  const src = stillCanvas(byKey(fighterKey), kind, {}, costume)
  useEffect(() => {
    const ctx = ref.current.getContext('2d')
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, src.width, src.height)
    ctx.drawImage(src, 0, 0)
    if (hidden) {
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = '#2a2a3d'
      ctx.fillRect(0, 0, src.width, src.height)
    }
  }, [src, hidden])
  return (
    <canvas
      ref={ref}
      width={src.width}
      height={src.height}
      className="pixel-head"
      style={{ width: src.width * zoom, height: src.height * zoom }}
    />
  )
}

function statPips(value, lo, hi) {
  const n = Math.max(1, Math.min(5, Math.round(1 + ((value - lo) / (hi - lo)) * 4)))
  return '■'.repeat(n) + '□'.repeat(5 - n)
}

export function FighterCard({ f, onPick, mark, locked, selected, costume }) {
  return (
    <button
      className={`brawl-pick-card ${mark ? 'is-taken' : ''} ${selected ? 'is-selected' : ''} ${locked ? 'is-locked' : ''}`}
      onClick={() => onPick(f)}
      style={{ '--fighter': f.color }}
    >
      {mark && <span className="brawl-pick-mark">{mark}</span>}
      <PixelArt fighterKey={f.key} kind="body" zoom={2} hidden={locked} costume={costume} />
      <strong>{locked ? '???' : f.name}</strong>
      {locked ? (
        <span className="brawl-pick-lock">🔒 {unlockHint(f)}</span>
      ) : (
        <>
          <span className="brawl-pick-pun">{f.pun}</span>
          <span className="brawl-pick-stats">
            <span>HP {statPips(f.hp, 100, 120)}</span>
            <span>SPD {statPips(f.speed, 0.7, 1.3)}</span>
            <span>POW {statPips(f.power, 1, 1.1)}</span>
          </span>
          <span className="brawl-pick-special">★ {f.special.name}</span>
        </>
      )}
    </button>
  )
}

// The panel under the fighter grid: who you picked, their gimmick, and a costume choice.
export function PickPanel({ f, costume, setCostume, save, label, onConfirm, confirmText }) {
  if (!f) return null
  return (
    <div className="brawl-pick-panel" style={{ '--fighter': f.color }}>
      <PixelArt fighterKey={f.key} kind="body" zoom={2} costume={costume} />
      <div className="brawl-pick-panel-info">
        <span className="brawl-pick-panel-label">{label}</span>
        <strong>{f.name}</strong>
        <span className="brawl-gimmick">🐾 {f.gimmick?.text}</span>
        <span>
          ★ Special: {f.special.name} · 💥 Super: {f.superName}
        </span>
        <div className="brawl-menu-row is-left" role="radiogroup" aria-label="Costume">
          {COSTUMES.map((c) => {
            const open = costumeUnlocked(c.id, save)
            return (
              <button
                key={c.id}
                className={`brawl-chip ${costume === c.id ? 'is-on' : ''}`}
                disabled={!open}
                title={open ? c.name : `Locked: ${c.hint}`}
                onClick={() => setCostume(c.id)}
              >
                {open ? c.name : `🔒 ${c.name}`}
              </button>
            )
          })}
        </div>
      </div>
      <button className="brawl-big-btn brawl-confirm" onClick={onConfirm}>
        {confirmText}
      </button>
    </div>
  )
}

// Touch buttons set pad_* flags on the local player's input, so they don't clash with keyboard state.
export function TouchPad({ input }) {
  const hold = (name, on) => (e) => {
    e.preventDefault()
    input[`pad_${name}`] = on
  }
  const tap = (name) => (e) => {
    e.preventDefault()
    pressButton(input, name)
  }
  const holdBtn = (name, label, cls = '') => (
    <button
      className={`brawl-pad-btn ${cls}`}
      onPointerDown={hold(name, true)}
      onPointerUp={hold(name, false)}
      onPointerLeave={hold(name, false)}
      onPointerCancel={hold(name, false)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={name}
    >
      {label}
    </button>
  )
  const tapBtn = (name, label, cls) => (
    <button className={`brawl-pad-btn ${cls}`} onPointerDown={tap(name)} aria-label={name}>
      {label}
    </button>
  )
  return (
    <div className="brawl-pad">
      <div className="brawl-pad-grid">
        <span />
        {holdBtn('up', '▲')}
        <span />
        {holdBtn('left', '◀')}
        {holdBtn('block', 'B')}
        {holdBtn('right', '▶')}
      </div>
      <div className="brawl-pad-grid">
        {tapBtn('punch', 'L', 'is-attack')}
        {tapBtn('kick', 'H', 'is-attack')}
        {tapBtn('special', '★', 'is-special')}
        {tapBtn('dodge', '↺', '')}
        {tapBtn('super', 'SUP', 'is-super')}
      </div>
    </div>
  )
}

export function MuteButton() {
  const [muted, setM] = useState(isMuted)
  return (
    <button
      className="exit-btn"
      title={muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => {
        setMuted(!muted)
        setM(!muted)
        if (muted) sfx.select()
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

export function Controls({ mode }) {
  const row = (label, keys) => (
    <div className="brawl-controls-col">
      <strong>{label}</strong>
      <span>
        Move <kbd>{keys[0]}</kbd> · Jump <kbd>{keys[1]}</kbd> · Block <kbd>{keys[2]}</kbd> · Dodge <kbd>{keys[6]}</kbd>
      </span>
      <span>
        Light <kbd>{keys[3]}</kbd> · Heavy <kbd>{keys[4]}</kbd> · Special <kbd>{keys[5]}</kbd> · Super <kbd>{keys[7]}</kbd>
      </span>
    </div>
  )
  return (
    <div className="brawl-controls">
      {mode === 'versus' ? (
        <>
          {row('Player 1', ['A D', 'W', 'S', 'F', 'G', 'H', 'R', 'T'])}
          {row('Player 2', ['← →', '↑', '↓', 'J', 'K', 'L', 'U', 'I'])}
        </>
      ) : (
        row('Controls', ['A D / ← →', 'W / ↑', 'S / ↓', 'F / J', 'G / K', 'H / L', 'R / U', 'T / I'])
      )}
      <span className="brawl-controls-tip">
        Chain Light → Light → Heavy for combos. Special costs half your bar; a FULL bar unleashes your Super!
      </span>
    </div>
  )
}

// Little pop-ups for achievements and unlocks.
export function Toasts({ toasts }) {
  return (
    <div className="brawl-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`brawl-toast ${t.kind}`}>
          <span className="brawl-toast-icon">{t.icon}</span>
          <div>
            <strong>{t.title}</strong>
            <span>{t.text}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AchievementsScreen({ save, onBack }) {
  const done = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length
  return (
    <div className="brawl-achievements">
      <h3 className="brawl-heading">
        Achievements · {done}/{ACHIEVEMENTS.length}
      </h3>
      <p className="brawl-subheading">
        {save.wins} wins · {save.matches} matches · best combo {save.maxCombo} hits
      </p>
      <div className="brawl-ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const got = !!save.achievements[a.id]
          return (
            <div key={a.id} className={`brawl-ach ${got ? 'is-done' : ''}`}>
              <span className="brawl-ach-icon">{got ? a.icon : '🔒'}</span>
              <div>
                <strong>{a.name}</strong>
                <span>{a.desc}</span>
              </div>
            </div>
          )
        })}
      </div>
      <button className="exit-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

// Online chat. Rude words and private info turn into ####; swear 3 times in a row and
// your chat switches off for 5 minutes (the same rules as BONK!).
export function ChatBox({ messages, onSend }) {
  const [text, setText] = useState('')
  const [strikes, setStrikes] = useState(0)
  const [bannedUntil, setBannedUntil] = useState(0)
  const [lastSent, setLastSent] = useState(0)
  const [note, setNote] = useState('')
  const list = useRef(null)

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight
  }, [messages])

  function send(e) {
    e.preventDefault()
    const now = Date.now()
    if (bannedUntil > now) {
      setNote(`Chat is off for ${Math.ceil((bannedUntil - now) / 60000)} more minute(s).`)
      return
    }
    if (bannedUntil) setBannedUntil(0)
    if (now - lastSent < 1000 || !text.trim()) return
    if (isRude(text)) {
      const s = strikes + 1
      if (s >= SWEAR_LIMIT) {
        setBannedUntil(now + BAN_MS)
        setStrikes(0)
        setNote('Too many rude words. Chat is off for 5 minutes.')
      } else {
        setStrikes(s)
        setNote(`Rude words turn into ####. Strike ${s} of ${SWEAR_LIMIT}.`)
      }
    } else {
      setStrikes(0)
      setNote('')
    }
    const clean = cleanText(text)
    if (clean) onSend(clean)
    setLastSent(now)
    setText('')
  }

  return (
    <div className="brawl-chat">
      <div className="brawl-chat-list" ref={list}>
        {messages.length === 0 && <span className="brawl-chat-empty">Say hi! Be nice. Rude words turn into ####.</span>}
        {messages.map((m) => (
          <div key={m.id} className={m.me ? 'is-me' : ''}>
            <strong>{m.name}:</strong> {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="brawl-chat-form">
        <input
          id="brawl-chat-input"
          value={text}
          maxLength={80}
          onChange={(e) => setText(e.target.value)}
          placeholder={bannedUntil ? 'Chat is off for now' : 'Type a message…'}
          aria-label="Chat message"
          autoComplete="off"
        />
        <button className="brawl-chip" type="submit">
          Send
        </button>
      </form>
      {note && <span className="brawl-chat-note">{note}</span>}
    </div>
  )
}
