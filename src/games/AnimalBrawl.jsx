import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { addTokens, getTokens } from '../utils/tokens'
import { FIGHTERS } from './brawl/fighters'
import { DIFFICULTY, createInput, createMatch, cpuThink, pressButton, step, snapshot, hydrate } from './brawl/engine'
import { drawMatch, LW, LH } from './brawl/draw'
import { stillCanvas } from './brawl/look'
import { playEvents, sfx, say, isMuted, setMuted, stopVoices } from './brawl/sound'
import { hostRoom, joinRoom } from './brawl/net'

// Keyboard layouts. When one person plays on this computer, both layouts work.
const P1_KEYS = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  block: ['KeyS'],
  punch: ['KeyF'],
  kick: ['KeyG'],
  special: ['KeyH'],
}
const P2_KEYS = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  block: ['ArrowDown'],
  punch: ['KeyJ'],
  kick: ['KeyK'],
  special: ['KeyL'],
}
const ATTACKS = ['punch', 'kick', 'special']
const HELD = ['left', 'right', 'up', 'block']
const byKey = (key) => FIGHTERS.find((f) => f.key === key)

function keyMapsFor(mode) {
  if (mode === 'versus') return [P1_KEYS, P2_KEYS]
  const both = {}
  for (const k of Object.keys(P1_KEYS)) both[k] = [...P1_KEYS[k], ...P2_KEYS[k]]
  return [both, null]
}

// A still pixel-art picture of a fighter: 'head' close-up or full 'body', scaled up crisply.
function PixelArt({ fighterKey, kind = 'head', zoom = 2 }) {
  const ref = useRef(null)
  const def = byKey(fighterKey)
  const src = stillCanvas(def, kind)
  useEffect(() => {
    const ctx = ref.current.getContext('2d')
    ctx.clearRect(0, 0, src.width, src.height)
    ctx.drawImage(src, 0, 0)
  }, [src])
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

function FighterCard({ f, onPick, mark }) {
  return (
    <button className={`brawl-pick-card ${mark ? 'is-taken' : ''}`} onClick={() => onPick(f)} style={{ '--fighter': f.color }}>
      {mark && <span className="brawl-pick-mark">{mark}</span>}
      <PixelArt fighterKey={f.key} kind="body" zoom={2} />
      <strong>{f.name}</strong>
      <span className="brawl-pick-pun">{f.pun}</span>
      <span className="brawl-pick-stats">
        <span>HP {statPips(f.hp, 100, 122)}</span>
        <span>SPD {statPips(f.speed, 0.8, 1.3)}</span>
        <span>POW {statPips(f.power, 1, 1.1)}</span>
      </span>
      <span className="brawl-pick-special">★ {f.special.name}</span>
    </button>
  )
}

// Touch buttons set pad_* flags on the local player's input, so they don't clash with keyboard state.
function TouchPad({ input }) {
  const hold = (name, on) => (e) => {
    e.preventDefault()
    input[`pad_${name}`] = on
  }
  const tap = (name) => (e) => {
    e.preventDefault()
    pressButton(input, name)
  }
  const holdBtn = (name, label) => (
    <button
      className="brawl-pad-btn"
      onPointerDown={hold(name, true)}
      onPointerUp={hold(name, false)}
      onPointerLeave={hold(name, false)}
      onPointerCancel={hold(name, false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div className="brawl-pad">
      <div className="brawl-pad-group">
        {holdBtn('left', '◀')}
        {holdBtn('up', '▲')}
        {holdBtn('right', '▶')}
        {holdBtn('block', 'B')}
      </div>
      <div className="brawl-pad-group">
        <button className="brawl-pad-btn is-attack" onPointerDown={tap('punch')}>
          P
        </button>
        <button className="brawl-pad-btn is-attack" onPointerDown={tap('kick')}>
          K
        </button>
        <button className="brawl-pad-btn is-special" onPointerDown={tap('special')}>
          ★
        </button>
      </div>
    </div>
  )
}

// mode: 'cpu' | 'versus' (same keyboard) | 'host' | 'guest' (online)
function Fight({ picks, mode, difficulty, link, onOver, touch, children }) {
  const canvasRef = useRef(null)
  const onOverRef = useRef(onOver)
  // The local player's input. The touch pad and the game loop both write to it.
  const [myInput] = useState(createInput)

  useEffect(() => {
    onOverRef.current = onOver
  })

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    let match = createMatch(picks)
    const inputs = [myInput, createInput()]
    const maps = keyMapsFor(mode)
    const held = new Set()
    const level = DIFFICULTY[difficulty]
    const mySide = mode === 'guest' ? 1 : mode === 'versus' ? null : 0
    const unsubs = []
    let reported = false
    let latest = null
    let lastHeld = ''

    if (mode === 'host') {
      unsubs.push(link.on('held', (msg) => Object.assign(inputs[1], msg.h)))
      unsubs.push(link.on('press', (msg) => pressButton(inputs[1], msg.n)))
    }
    if (mode === 'guest') unsubs.push(link.on('state', (msg) => (latest = msg.s)))

    const bound = new Set(maps.filter(Boolean).flatMap((m) => Object.values(m).flat()))
    function onKeyDown(e) {
      if (!bound.has(e.code)) return
      e.preventDefault()
      held.add(e.code)
      if (e.repeat) return
      maps.forEach((map, i) => {
        if (!map) return
        for (const a of ATTACKS) if (map[a].includes(e.code)) pressButton(inputs[i], a)
      })
    }
    const onKeyUp = (e) => held.delete(e.code)
    const onBlur = () => held.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    let raf
    let last = performance.now()
    function frame(now) {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      maps.forEach((map, i) => {
        if (!map) return
        const inp = inputs[i]
        for (const h of HELD) inp[h] = map[h].some((code) => held.has(code)) || !!inp[`pad_${h}`]
      })

      if (mode === 'guest') {
        // Send my buttons to the host, then draw whatever the host says is happening.
        const h = { left: myInput.left, right: myInput.right, up: myInput.up, block: myInput.block }
        const key = JSON.stringify(h)
        if (key !== lastHeld) {
          lastHeld = key
          link.send({ t: 'held', h })
        }
        for (const a of ATTACKS) {
          if (myInput.buf[a] > 0) {
            link.send({ t: 'press', n: a })
            myInput.buf[a] = 0
          }
        }
        if (latest) {
          match = hydrate(latest, FIGHTERS)
          playEvents(latest.events, match, mySide)
          latest = null
        }
      } else {
        if (mode === 'cpu') cpuThink(match, 1, inputs[1], level, dt)
        step(match, inputs, dt)
        const events = match.events.splice(0)
        playEvents(events, match, mySide)
        if (mode === 'host') link.send({ t: 'state', s: snapshot(match, events) })
      }

      drawMatch(ctx, match)
      if (match.phase === 'over' && !reported) {
        reported = true
        onOverRef.current(match.matchWinner)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      unsubs.forEach((u) => u())
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [picks, mode, difficulty, link, myInput])

  return (
    <>
      <div className="brawl-arena">
        <canvas ref={canvasRef} width={LW} height={LH} className="brawl-canvas" />
        {children}
      </div>
      {touch && <TouchPad input={myInput} />}
    </>
  )
}

function MuteButton() {
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

function OnlineLobby({ onConnected, onBack }) {
  const [stage, setStage] = useState('choose') // choose | hosting | joining
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const [error, setError] = useState(null)
  const pending = useRef(null)

  useEffect(() => () => pending.current?.cancel(), [])

  function create() {
    setError(null)
    setStage('hosting')
    setCode('')
    const room = hostRoom({ onCode: setCode, onError: setError })
    pending.current = room
    room.promise
      .then((link) => {
        pending.current = null
        onConnected(link, 'host')
      })
      .catch(() => setStage('choose'))
  }

  function join(e) {
    e.preventDefault()
    if (typed.trim().length !== 4) {
      setError('Room codes have 4 letters.')
      return
    }
    setError(null)
    setStage('joining')
    const room = joinRoom(typed, { onError: setError })
    pending.current = room
    room.promise
      .then((link) => {
        pending.current = null
        onConnected(link, 'guest')
      })
      .catch(() => setStage('choose'))
  }

  function cancel() {
    pending.current?.cancel()
    pending.current = null
    setStage('choose')
  }

  return (
    <div className="brawl-menu">
      <h3 className="brawl-heading">Play a friend online</h3>
      {stage === 'choose' && (
        <>
          <button className="brawl-big-btn" onClick={create}>
            CREATE A ROOM
          </button>
          <p className="brawl-tagline">— or join your friend's room —</p>
          <form className="brawl-join" onSubmit={join}>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
              placeholder="CODE"
              aria-label="Room code"
              autoCapitalize="characters"
              autoComplete="off"
            />
            <button className="brawl-big-btn is-alt" type="submit">
              JOIN
            </button>
          </form>
        </>
      )}
      {stage === 'hosting' && (
        <>
          <p className="brawl-tagline">Tell your friend this code:</p>
          <div className="brawl-room-code">{code || '....'}</div>
          <p className="brawl-waiting">{code ? 'Waiting for your friend to join…' : 'Making a room…'}</p>
          <button className="exit-btn" onClick={cancel}>
            Cancel
          </button>
        </>
      )}
      {stage === 'joining' && (
        <>
          <p className="brawl-waiting">Joining room {typed}…</p>
          <button className="exit-btn" onClick={cancel}>
            Cancel
          </button>
        </>
      )}
      {error && <p className="brawl-error">{error}</p>}
      <p className="brawl-hint">You each need your own computer or tablet with internet.</p>
      <button className="exit-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

export default function AnimalBrawl({ game, onExit }) {
  const [screen, setScreen] = useState('menu') // menu | online | select | fight
  const [mode, setMode] = useState('cpu') // cpu | versus | online
  const [difficulty, setDifficulty] = useState('normal')
  const [picks, setPicks] = useState([])
  const [friendPick, setFriendPick] = useState(null)
  const [fightId, setFightId] = useState(0)
  const [result, setResult] = useState(null)
  const [wallet, setWallet] = useState(getTokens)
  const [link, setLink] = useState(null)
  const [role, setRole] = useState(null) // host | guest when online
  const [notice, setNotice] = useState(null)
  const [touch] = useState(() => !!window.matchMedia?.('(pointer: coarse)').matches)

  // Stop talking when leaving the game.
  useEffect(() => () => stopVoices(), [])

  function startFight(pair) {
    setPicks(pair)
    setResult(null)
    setFightId((n) => n + 1)
    setScreen('fight')
  }

  function toSelect(nextMode = mode) {
    setMode(nextMode)
    setPicks([])
    setFriendPick(null)
    setResult(null)
    setScreen('select')
  }

  // Online messages that change screens (the fight itself listens for its own messages).
  const online = useRef({})
  useEffect(() => {
    online.current = { picks, startFight, toSelect }
  })
  useEffect(() => {
    if (!link) return
    const offs = [
      link.on('pick', (msg) => setFriendPick(byKey(msg.key))),
      link.on('start', (msg) => online.current.startFight(msg.picks.map(byKey))),
      link.on('rematch', () => online.current.startFight(online.current.picks)),
      link.on('reselect', () => online.current.toSelect('online')),
    ]
    link.onClose(() => {
      setLink(null)
      setRole(null)
      setNotice('Your friend left the game.')
      setScreen('menu')
    })
    return () => {
      offs.forEach((off) => off())
      link.close()
    }
  }, [link])

  // The host starts the fight once both players have picked.
  const readyPair = mode === 'online' && role === 'host' && screen === 'select' && picks[0] && friendPick
  useEffect(() => {
    if (!readyPair) return
    const pair = [picks[0], friendPick]
    link.send({ t: 'start', picks: pair.map((f) => f.key) })
    online.current.startFight(pair)
  }, [readyPair, picks, friendPick, link])

  function choose(f) {
    sfx.select()
    say(f.say, { ...f.voice, interrupt: true })
    if (mode === 'cpu') {
      const others = FIGHTERS.filter((o) => o.key !== f.key)
      startFight([f, others[Math.floor(Math.random() * others.length)]])
    } else if (mode === 'online') {
      if (picks[0]) return
      setPicks([f])
      link.send({ t: 'pick', key: f.key })
    } else if (picks.length === 0) {
      setPicks([f])
    } else {
      startFight([picks[0], f])
    }
  }

  function handleOver(winner) {
    let reward = 0
    if (mode === 'cpu' && winner === 0) {
      reward = DIFFICULTY[difficulty].reward
      setWallet(addTokens(reward))
    }
    setResult({ winner, reward })
  }

  function leaveOnline() {
    setLink(null)
    setRole(null)
    setScreen('menu')
  }

  const isOnline = mode === 'online'
  const mySide = isOnline && role === 'guest' ? 1 : 0

  const topbar = (
    <div className="game-topbar">
      <GameTitle game={game} />
      <div style={{ display: 'flex', gap: 8 }}>
        <MuteButton />
        <button
          className="exit-btn"
          onClick={() => {
            link?.close()
            stopVoices()
            onExit()
          }}
        >
          Exit
        </button>
      </div>
    </div>
  )

  if (screen === 'menu') {
    return (
      <div className="game-screen">
        {topbar}
        <div className="brawl-menu" style={{ '--card-color': game.color }}>
          <div className="brawl-logo">
            ANIMAL
            <br />
            BRAWL
          </div>
          <div className="brawl-logo-heads">
            {['lionheart', 'gorillawarfare', 'sharkitecture', 'rhinomite'].map((k) => (
              <PixelArt key={k} fighterKey={k} kind="body" zoom={2} />
            ))}
          </div>
          {notice && <p className="brawl-error">{notice}</p>}
          <div className="brawl-menu-row">
            {Object.entries(DIFFICULTY).map(([key, d]) => (
              <button
                key={key}
                className={`brawl-chip ${difficulty === key ? 'is-on' : ''}`}
                onClick={() => setDifficulty(key)}
              >
                {d.label} · +{d.reward}
              </button>
            ))}
          </div>
          <button className="brawl-big-btn" onClick={() => toSelect('cpu')}>
            1 PLAYER vs CPU
          </button>
          <button className="brawl-big-btn is-alt" onClick={() => toSelect('versus')}>
            2 PLAYERS · SAME KEYBOARD
          </button>
          <button
            className="brawl-big-btn is-online"
            onClick={() => {
              setNotice(null)
              setScreen('online')
            }}
          >
            2 PLAYERS · ONLINE
          </button>
          <span className="stat-pill" style={{ '--card-color': game.color }}>
            TOKENS {wallet}
          </span>
          {!touch && <Controls mode="versus" />}
        </div>
      </div>
    )
  }

  if (screen === 'online') {
    return (
      <div className="game-screen">
        {topbar}
        <OnlineLobby
          onBack={() => setScreen('menu')}
          onConnected={(newLink, newRole) => {
            setLink(newLink)
            setRole(newRole)
            toSelect('online')
          }}
        />
      </div>
    )
  }

  if (screen === 'select') {
    let heading = 'Choose your fighter'
    if (mode === 'versus') heading = picks.length === 0 ? 'Player 1: choose' : 'Player 2: choose'
    if (isOnline && picks[0]) heading = friendPick ? 'Get ready!' : 'Waiting for your friend…'
    return (
      <div className="game-screen">
        {topbar}
        <h3 className="brawl-heading">{heading}</h3>
        {mode === 'versus' && picks[0] && <p className="brawl-subheading">P1 picked {picks[0].name}</p>}
        {isOnline && (
          <p className="brawl-subheading">
            Online · you are {role === 'host' ? 'Player 1 (left)' : 'Player 2 (right)'}
            {friendPick ? ` · your friend picked ${friendPick.name}` : ''}
          </p>
        )}
        <div className="brawl-pick-grid">
          {FIGHTERS.map((f) => (
            <FighterCard
              key={f.key}
              f={f}
              onPick={choose}
              mark={picks[0]?.key === f.key ? (isOnline ? 'YOU' : 'P1') : null}
            />
          ))}
        </div>
        <button
          className="exit-btn"
          style={{ marginTop: 16 }}
          onClick={() => (isOnline ? leaveOnline() : setScreen('menu'))}
        >
          ← {isOnline ? 'Leave online game' : 'Back'}
        </button>
      </div>
    )
  }

  let title = ''
  if (result) {
    if (mode === 'versus') title = `PLAYER ${result.winner + 1} WINS!`
    else title = result.winner === mySide ? 'YOU WIN!' : 'YOU LOSE!'
  }
  return (
    <div className="game-screen">
      {topbar}
      <Fight
        key={fightId}
        picks={picks}
        mode={isOnline ? role : mode}
        difficulty={difficulty}
        link={link}
        onOver={handleOver}
        touch={touch}
      >
        {result && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <PixelArt fighterKey={picks[result.winner].key} kind="head" zoom={3} />
            <h3 className="brawl-result-title">{title}</h3>
            <p>
              {picks[result.winner].name}: “{picks[result.winner].win}”
              {result.reward > 0 && (
                <>
                  <br />+{result.reward} Faz-Tokens (you have {wallet})
                </>
              )}
            </p>
            <div className="brawl-menu-row">
              <button
                onClick={() => {
                  if (isOnline) link.send({ t: 'rematch' })
                  startFight(picks)
                }}
              >
                Rematch
              </button>
              <button
                onClick={() => {
                  if (isOnline) link.send({ t: 'reselect' })
                  toSelect()
                }}
              >
                Change Fighters
              </button>
              <button onClick={() => (isOnline ? leaveOnline() : setScreen('menu'))}>Menu</button>
            </div>
          </div>
        )}
      </Fight>
      {!touch && <Controls mode={mode === 'versus' ? 'versus' : 'solo'} />}
    </div>
  )
}

function Controls({ mode }) {
  const row = (label, keys) => (
    <div className="brawl-controls-col">
      <strong>{label}</strong>
      <span>
        Move <kbd>{keys[0]}</kbd> · Jump <kbd>{keys[1]}</kbd> · Block <kbd>{keys[2]}</kbd>
      </span>
      <span>
        Punch <kbd>{keys[3]}</kbd> · Kick <kbd>{keys[4]}</kbd> · Special <kbd>{keys[5]}</kbd>
      </span>
    </div>
  )
  return (
    <div className="brawl-controls">
      {mode === 'versus' ? (
        <>
          {row('Player 1', ['A D', 'W', 'S', 'F', 'G', 'H'])}
          {row('Player 2', ['← →', '↑', '↓', 'J', 'K', 'L'])}
        </>
      ) : (
        row('Controls', ['A D / ← →', 'W / ↑', 'S / ↓', 'F / J', 'G / K', 'H / L'])
      )}
      <span className="brawl-controls-tip">Hits fill your special bar. When it flashes gold, press Special!</span>
    </div>
  )
}
