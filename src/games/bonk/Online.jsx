import { useRef, useState } from 'react'
import { COSTUMES } from './costumes'
import { DIFFICULTIES } from './data'
import { hostRoom, joinRoom, makeCode } from './net'
import { loadSave } from './save'
import { setOnlineName, stat } from './profile'

// Names are picked, not typed, so nobody can write anything mean.
const ADJ = ['Bouncy', 'Sneaky', 'Mighty', 'Fluffy', 'Speedy', 'Wobbly', 'Golden', 'Tiny', 'Giant', 'Sparkly', 'Brave', 'Silly']
const NOUN = ['Duck', 'Quacker', 'Waddler', 'Bonker', 'Duckling', 'Feather', 'Beak', 'Puddle', 'Paddle', 'Honker']
const randomName = () => `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}${Math.floor(Math.random() * 90 + 10)}`

export default function Online({ onClose, onHostStart, onGuestJoined, onGuestMessage, onGuestClosed }) {
  const save = loadSave()
  const [mode, setMode] = useState('menu')
  const [name, setName] = useState(() => save.onlineName || randomName())
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('')
  const [guests, setGuests] = useState([])
  const [ducks, setDucks] = useState(8)
  const [difficulty, setDifficulty] = useState('medium')
  const [room, setRoom] = useState(null)
  const guest = useRef(null)

  function rename() {
    const n = randomName()
    setName(n)
    setOnlineName(n)
  }

  function host() {
    stat('online')
    const c = makeCode()
    setMode('host')
    setStatus('Opening a room…')
    const handlers = {
      onOpen: () => setStatus(''),
      onError: (msg) => setStatus(`😕 ${msg}`),
      onGuests: (list) => setGuests(list),
    }
    const r = hostRoom(c, handlers)
    r.handlers = handlers
    setRoom(r)
  }

  function join() {
    stat('online')
    const c = code.trim().toUpperCase()
    if (c.length !== 4) return setStatus('Room codes have 4 letters.')
    setMode('joining')
    setStatus(`Connecting to room ${c}…`)
    guest.current = joinRoom(c, { name, costume: save.costume, pet: save.pet }, {
      onJoined: (id) => {
        setMode('waiting')
        setStatus('')
        onGuestJoined(guest.current, id)
      },
      onMessage: (msg) => {
        if (msg.t === 'full') setStatus('😕 That room is full (8 players).')
        onGuestMessage(msg)
      },
      onClose: () => onGuestClosed(),
      onError: (msg) => {
        setMode('join')
        setStatus(`😕 ${msg}`)
      },
    })
  }

  function cancel() {
    room?.close()
    guest.current?.close()
    onClose()
  }

  return (
    <div className="bonk-modal">
      <div className="bonk-panel bonk-online">
        <button className="bonk-close" onClick={cancel}>✕</button>
        <h3>🌐 ONLINE</h3>

        {(mode === 'menu' || mode === 'join') && (
          <section>
            <h4>Your name</h4>
            <div className="bonk-chip-row">
              <span className="bonk-name">🦆 {name}</span>
              <button onClick={rename}>🎲 New name</button>
            </div>
          </section>
        )}

        {mode === 'menu' && (
          <div className="bonk-online-choices">
            <button className="bonk-big" onClick={host}>
              <b>🏠 HOST</b>
              <small>Make a room and share the code with friends</small>
            </button>
            <button className="bonk-big" onClick={() => setMode('join')}>
              <b>🚪 JOIN</b>
              <small>Type a friend's 4-letter room code</small>
            </button>
          </div>
        )}

        {mode === 'join' && (
          <section>
            <h4>Room code</h4>
            <div className="bonk-chip-row">
              <input
                className="bonk-code-input"
                value={code}
                maxLength={4}
                placeholder="ABCD"
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && join()}
                autoFocus
              />
              <button className="is-on" onClick={join}>
                Join!
              </button>
            </div>
          </section>
        )}

        {mode === 'host' && room && (
          <section>
            <h4>Room code</h4>
            <div className="bonk-room-code">{room.code}</div>
            <p className="bonk-muted">Tell your friends this code. They open BONK!, press 🌐 Online → JOIN and type it in.</p>
            <h4>Players ({guests.length + 1}/8)</h4>
            <div className="bonk-player-row">
              <div className="bonk-slot is-you">
                <b>👑 {name} (host)</b>
                <span>{COSTUMES[save.costume]?.name}</span>
              </div>
              {guests.map((g) => (
                <div key={g.id} className="bonk-slot">
                  <b>🦆 {g.name}</b>
                  <span>{COSTUMES[g.costume]?.name || 'Rookie'}</span>
                </div>
              ))}
            </div>
            <h4>Ducks in the arena (bots fill empty spots)</h4>
            <div className="bonk-chip-row">
              {[4, 6, 8, 10].map((n) => (
                <button key={n} className={ducks === n ? 'is-on' : ''} onClick={() => setDucks(n)}>
                  {n} 🦆
                </button>
              ))}
            </div>
            <h4>Bot difficulty</h4>
            <div className="bonk-chip-row">
              {DIFFICULTIES.map((d) => (
                <button key={d.key} className={difficulty === d.key ? 'is-on' : ''} onClick={() => setDifficulty(d.key)}>
                  {d.name}
                </button>
              ))}
            </div>
            <button
              className="bonk-go"
              onClick={() =>
                onHostStart(room, {
                  ducks,
                  difficulty,
                  challenge: 'none',
                  humans: [
                    { name, costume: save.costume, pet: save.pet, input: { type: 'keys', scheme: 'solo' } },
                    ...[...room.guests.values()].map((g) => ({ name: g.name, costume: COSTUMES[g.costume] ? g.costume : 'rookie', pet: g.pet, input: { type: 'remote', id: g.id } })),
                  ],
                })
              }
            >
              START! 🔨
            </button>
          </section>
        )}

        {(mode === 'joining' || mode === 'waiting') && (
          <section className="bonk-center">
            <p className="bonk-waiting">{mode === 'waiting' ? '✅ You are in! Waiting for the host to start…' : '⏳ Connecting…'}</p>
          </section>
        )}

        {status && <p className="bonk-note">{status}</p>}
        <p className="bonk-muted">
          Online play needs an internet connection. Players find each other through the free PeerJS service, then play directly. No chat, just quacks!
        </p>
      </div>
    </div>
  )
}
