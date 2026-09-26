import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import { addTokens, getTokens } from '../utils/tokens'
import { FIGHTERS, BOSS, bossVersion, byKey } from './brawl/fighters'
import { DIFFICULTY } from './brawl/engine'
import { ARENAS, arenaByKey, arenaBackground } from './brawl/arenas'
import { LW, LH } from './brawl/draw'
import { sfx, say, announce, stopVoices, audioContext } from './brawl/sound'
import { playMusic, stopMusic } from './brawl/music'
import { hostRoom, joinRoom } from './brawl/net'
import { loadSave, recordMatch, recordArcadeClear, recordTraining, unlockSecret, isUnlocked, ACHIEVEMENTS } from './brawl/progress'
import { cleanName, cleanText, nameProblem, randomName, savedName, saveName } from './brawl/chat'
import Fight from './brawl/Fight'
import { PixelArt, FighterCard, PickPanel, MuteButton, Controls, Toasts, AchievementsScreen, ChatBox } from './brawl/ui'

const LADDER_SIZE = 5
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
const shuffle = (list) => [...list].sort(() => Math.random() - 0.5)
const randomArena = () => ARENAS[Math.floor(Math.random() * ARENAS.length)].key

const MODE_INFO = {
  arcade: 'Arcade: beat 5 animals in a row, then the BOSS.',
  cpu: 'Quick fight against the computer.',
  versus: 'Two players, one keyboard.',
  online: 'Play a friend on another device.',
  training: 'Practice combos on a dummy that never gives up.',
}

function ArenaPicker({ value, onChange, disabled }) {
  const options = ['random', ...ARENAS.map((a) => a.key)]
  const idx = options.indexOf(value)
  const move = (d) => onChange(options[(idx + d + options.length) % options.length])
  const preview = useRef(null)
  useEffect(() => {
    const ctx = preview.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#151521'
    ctx.fillRect(0, 0, LW, LH)
    if (value !== 'random') ctx.drawImage(arenaBackground(value, LW, LH, Math.round(LH * 0.875)), 0, 0)
  }, [value])
  const a = value === 'random' ? { emoji: '🎲', name: 'Random arena' } : arenaByKey(value)
  return (
    <div className="brawl-arena-picker">
      <button className="brawl-chip" onClick={() => move(-1)} disabled={disabled} aria-label="Previous arena">
        ◀
      </button>
      <div className="brawl-arena-preview">
        <canvas ref={preview} width={LW} height={LH} />
        <span>
          {a.emoji} {a.name}
          {a.gravity ? ' · low gravity!' : a.slide ? ' · slippery ice!' : ''}
        </span>
      </div>
      <button className="brawl-chip" onClick={() => move(1)} disabled={disabled} aria-label="Next arena">
        ▶
      </button>
    </div>
  )
}

function OnlineLobby({ myName, setMyName, onConnected, onBack }) {
  const [stage, setStage] = useState('choose') // choose | hosting | joining
  const [code, setCode] = useState('')
  const [typed, setTyped] = useState('')
  const [draft, setDraft] = useState(myName)
  const [error, setError] = useState(null)
  const pending = useRef(null)

  useEffect(() => () => pending.current?.cancel(), [])

  function applyName() {
    const n = draft.trim()
    const problem = nameProblem(n)
    if (problem) {
      setError(`Name: ${problem}`)
      return false
    }
    setMyName(n)
    saveName(n)
    return true
  }

  function create() {
    if (!applyName()) return
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
    if (!applyName()) return
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
      <p className="brawl-wifi">📶 Tip: online works best when you're both on the same Wi-Fi.</p>
      {stage === 'choose' && (
        <>
          <label className="brawl-name-row" htmlFor="brawl-name">
            <span>Your name</span>
            <input
              id="brawl-name"
              value={draft}
              maxLength={16}
              onChange={(e) => setDraft(e.target.value.replace(/\s/g, ''))}
              autoComplete="off"
            />
            <button className="brawl-chip" type="button" onClick={() => setDraft(randomName())}>
              🎲
            </button>
          </label>
          <button className="brawl-big-btn" onClick={create}>
            CREATE A ROOM
          </button>
          <p className="brawl-tagline">— or join your friend's room —</p>
          <form className="brawl-join" onSubmit={join}>
            <input
              id="brawl-room-code"
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
      <p className="brawl-hint">You each need your own computer or tablet with internet. Chat is filtered: rude words turn into ####.</p>
      <button className="exit-btn" onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}

export default function AnimalBrawl({ game, onExit }) {
  const [screen, setScreen] = useState('menu') // menu | online | select | ladder | fight | achievements
  const [mode, setMode] = useState('cpu') // arcade | cpu | versus | online | training
  const [difficulty, setDifficulty] = useState('normal')
  const [save, setSave] = useState(loadSave)
  const [sel, setSel] = useState({ key: null, costume: 'classic' })
  const [locked, setLocked] = useState([]) // confirmed picks: [{ def, costume }]
  const [arenaChoice, setArenaChoice] = useState('random')
  const [fight, setFight] = useState(null) // { id, picks, arena, bossFight, names }
  const [result, setResult] = useState(null)
  const [ladder, setLadder] = useState(null) // { me, foes, stage }
  const [dummy, setDummy] = useState('stand')
  const [toasts, setToasts] = useState([])
  const [wallet, setWallet] = useState(getTokens)
  const [link, setLink] = useState(null)
  const [role, setRole] = useState(null) // host | guest
  const [friend, setFriend] = useState({ name: 'Friend', pick: null })
  const [myName, setMyName] = useState(savedName)
  const [chat, setChat] = useState([])
  const [notice, setNotice] = useState(null)
  const [touch] = useState(() => !!window.matchMedia?.('(pointer: coarse)').matches)
  const logoTaps = useRef(0)

  // Browsers only allow sound after a click or key press, so wake the audio on the first one.
  // Stop the music and voices when leaving the game.
  useEffect(() => {
    const wake = () => audioContext()
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
      stopMusic()
      stopVoices()
    }
  }, [])

  // Menu theme on the menus, fight theme during a fight, silence for the victory fanfare.
  useEffect(() => {
    if (screen !== 'fight') playMusic('menu')
    else if (result || mode === 'training') stopMusic()
    else playMusic('fight')
  }, [screen, result, mode])

  function toast(items) {
    const fresh = items.map((t) => ({ ...t, id: Math.random() }))
    if (!fresh.length) return
    setToasts((prev) => [...prev, ...fresh])
    sfx.win()
    setTimeout(() => setToasts((prev) => prev.filter((t) => !fresh.includes(t))), 4500)
  }

  function notify({ achievements, unlocks }) {
    setSave(loadSave())
    toast([
      ...achievements.map((a) => ({ kind: 'ach', icon: a.icon, title: `Achievement: ${a.name}`, text: a.desc })),
      ...unlocks.map((k) => {
        const f = byKey(k)
        return { kind: 'unlock', icon: f.emoji, title: 'NEW FIGHTER UNLOCKED!', text: `${f.name} joins the brawl!` }
      }),
    ])
  }

  // Secret: the old cheat code (or tap the logo 10 times) unlocks Sloth-Mo.
  useEffect(() => {
    if (screen !== 'menu') return
    let pos = 0
    const onKey = (e) => {
      pos = e.code === KONAMI[pos] ? pos + 1 : e.code === KONAMI[0] ? 1 : 0
      if (pos === KONAMI.length) {
        pos = 0
        revealSecret()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function revealSecret() {
    const res = unlockSecret()
    notify(res)
    announce(res.unlocks.length ? 'Secret character unlocked! Sloth-Mo!' : 'Sloth-Mo is already here. Slowly.')
  }

  const available = (f) => isUnlocked(f, save)
  const pickable = FIGHTERS.filter((f) => !f.boss || available(f))

  function openSelect(nextMode) {
    setMode(nextMode)
    setLocked([])
    setSel({ key: null, costume: 'classic' })
    setResult(null)
    setScreen('select')
  }

  function startFight({ picks, arena, bossFight = false, names = null }) {
    setFight((prev) => ({ id: (prev?.id ?? 0) + 1, picks, arena, bossFight, names }))
    setResult(null)
    setScreen('fight')
  }

  function choose(f) {
    if (!available(f)) {
      sfx.block()
      return
    }
    sfx.select()
    say(f.say, { ...f.voice, interrupt: true })
    setSel((prev) => ({ key: f.key, costume: prev.key === f.key ? prev.costume : 'classic' }))
  }

  function confirmPick() {
    const pick = { def: byKey(sel.key), costume: sel.costume }
    const arena = arenaChoice === 'random' ? randomArena() : arenaChoice
    const others = FIGHTERS.filter((f) => available(f) && !f.boss && f.key !== pick.def.key)
    if (mode === 'cpu') {
      const foe = others[Math.floor(Math.random() * others.length)]
      startFight({ picks: [pick, { def: foe, costume: 'classic' }], arena })
    } else if (mode === 'arcade') {
      setLadder({ me: pick, foes: shuffle(others).slice(0, LADDER_SIZE), stage: 0 })
      setScreen('ladder')
    } else if (mode === 'online') {
      setLocked([pick])
      link.send({ t: 'pick', key: pick.def.key, costume: pick.costume })
    } else if (locked.length === 0) {
      setLocked([pick])
      setSel({ key: null, costume: 'classic' })
    } else {
      startFight({ picks: [locked[0], pick], arena })
    }
  }

  function ladderFight() {
    const { me, foes, stage } = ladder
    const boss = stage >= foes.length
    startFight({
      picks: [me, { def: boss ? bossVersion(BOSS) : foes[stage], costume: 'classic' }],
      arena: boss ? 'volcano' : randomArena(),
      bossFight: boss,
    })
  }

  function handleOver(winner, match) {
    const mySide = mode === 'online' && role === 'guest' ? 1 : 0
    const won = mode !== 'versus' && winner === mySide
    const me = match.fighters[mySide]
    notify(
      recordMatch({ won, fighterKey: me.def.key, arena: match.arena, stats: me.stats, online: mode === 'online' }),
    )
    let reward = 0
    if (won && mode === 'cpu') reward = DIFFICULTY[difficulty].reward
    if (won && mode === 'online') reward = 10
    if (won && mode === 'arcade') reward = 10
    let arcadeClear = false
    if (mode === 'arcade' && won && ladder.stage >= ladder.foes.length) {
      arcadeClear = true
      reward += 100
      notify(recordArcadeClear(difficulty))
    }
    if (reward) setWallet(addTokens(reward))
    setResult({ winner, quote: match.quote ?? 0, reward, won, arcadeClear })
  }

  function trainingDone(match) {
    const hits = match?.fighters[0]?.stats.hits ?? 0
    if (hits) notify(recordTraining(hits))
  }

  // ---------- Online ----------
  const online = useRef({})
  useEffect(() => {
    online.current = { fight, startFight, openSelect, myName }
  })
  useEffect(() => {
    if (!link) return
    link.send({ t: 'hello', name: online.current.myName })
    const offs = [
      link.on('hello', (msg) => setFriend((f) => ({ ...f, name: cleanName(msg.name) }))),
      link.on('pick', (msg) => {
        const def = byKey(msg.key)
        if (def) setFriend((f) => ({ ...f, pick: { def, costume: msg.costume ?? 'classic' } }))
      }),
      link.on('chat', (msg) => {
        const text = cleanText(msg.text)
        if (text) setChat((c) => [...c.slice(-40), { id: Math.random(), name: msg.name ? cleanName(msg.name) : 'Friend', text }])
      }),
      link.on('start', (msg) => {
        const picks = msg.picks.map((p) => ({ def: byKey(p.key), costume: p.costume }))
        online.current.startFight({ picks, arena: msg.arena, names: msg.names })
      }),
      link.on('rematch', () => {
        const f = online.current.fight
        if (f) online.current.startFight({ picks: f.picks, arena: f.arena, names: f.names })
      }),
      link.on('reselect', () => {
        setFriend((f) => ({ ...f, pick: null }))
        online.current.openSelect('online')
      }),
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
  const ready = mode === 'online' && role === 'host' && screen === 'select' && locked[0] && friend.pick
  useEffect(() => {
    if (!ready) return
    const arena = arenaChoice === 'random' ? randomArena() : arenaChoice
    const picks = [locked[0], friend.pick]
    const names = [myName, friend.name]
    link.send({ t: 'start', picks: picks.map((p) => ({ key: p.def.key, costume: p.costume })), arena, names })
    online.current.startFight({ picks, arena, names })
  }, [ready, locked, friend, arenaChoice, myName, link])

  function sendChat(text) {
    link?.send({ t: 'chat', text, name: myName })
    setChat((c) => [...c.slice(-40), { id: Math.random(), name: myName, text, me: true }])
  }

  function leaveOnline() {
    setLink(null)
    setRole(null)
    setFriend({ name: 'Friend', pick: null })
    setChat([])
    setScreen('menu')
  }

  // ---------- Screens ----------
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
  const toastLayer = <Toasts toasts={toasts} />

  if (screen === 'menu') {
    const got = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length
    return (
      <div className="game-screen">
        {topbar}
        {toastLayer}
        <div className="brawl-menu" style={{ '--card-color': game.color }}>
          <button
            className="brawl-logo"
            onClick={() => {
              logoTaps.current += 1
              if (logoTaps.current === 10) revealSecret()
            }}
          >
            ANIMAL
            <br />
            BRAWL
          </button>
          <div className="brawl-logo-heads">
            {['lionheart', 'gorillawarfare', 'sharkitecture', 'rhinomite'].map((k) => (
              <PixelArt key={k} fighterKey={k} kind="body" zoom={2} />
            ))}
          </div>
          {notice && <p className="brawl-error">{notice}</p>}
          <div className="brawl-menu-row">
            {Object.entries(DIFFICULTY).map(([key, d]) => (
              <button key={key} className={`brawl-chip ${difficulty === key ? 'is-on' : ''}`} onClick={() => setDifficulty(key)}>
                {d.label} · +{d.reward}
              </button>
            ))}
          </div>
          <div className="brawl-mode-grid">
            <button className="brawl-big-btn is-arcade" onClick={() => openSelect('arcade')}>
              🕹️ ARCADE
              <small>5 fights + a BOSS</small>
            </button>
            <button className="brawl-big-btn" onClick={() => openSelect('cpu')}>
              🥊 VS CPU
              <small>Quick fight</small>
            </button>
            <button className="brawl-big-btn is-alt" onClick={() => openSelect('versus')}>
              👥 2 PLAYERS
              <small>Same keyboard</small>
            </button>
            <button
              className="brawl-big-btn is-online"
              onClick={() => {
                setNotice(null)
                setScreen('online')
              }}
            >
              🌐 ONLINE
              <small>Play a friend</small>
            </button>
            <button className="brawl-big-btn is-training" onClick={() => openSelect('training')}>
              🥋 TRAINING
              <small>Practice combos</small>
            </button>
            <button className="brawl-big-btn is-ach" onClick={() => setScreen('achievements')}>
              🏅 ACHIEVEMENTS
              <small>
                {got}/{ACHIEVEMENTS.length} earned
              </small>
            </button>
          </div>
          <span className="stat-pill" style={{ '--card-color': game.color }}>
            TOKENS {wallet} · WINS {save.wins}
          </span>
          {!touch && <Controls mode="versus" />}
        </div>
      </div>
    )
  }

  if (screen === 'achievements') {
    return (
      <div className="game-screen">
        {topbar}
        <AchievementsScreen save={save} onBack={() => setScreen('menu')} />
      </div>
    )
  }

  if (screen === 'online') {
    return (
      <div className="game-screen">
        {topbar}
        <OnlineLobby
          myName={myName}
          setMyName={setMyName}
          onBack={() => setScreen('menu')}
          onConnected={(newLink, newRole) => {
            setLink(newLink)
            setRole(newRole)
            setChat([])
            setFriend({ name: 'Friend', pick: null })
            openSelect('online')
          }}
        />
      </div>
    )
  }

  if (screen === 'select') {
    const isOnline = mode === 'online'
    let heading = 'Choose your fighter'
    if (mode === 'versus') heading = locked.length === 0 ? 'Player 1: choose' : 'Player 2: choose'
    if (mode === 'training') heading = locked.length === 0 ? 'Choose your fighter' : 'Choose a training dummy'
    if (isOnline && locked[0]) heading = friend.pick ? 'Get ready!' : `Waiting for ${friend.name}…`
    const f = sel.key ? byKey(sel.key) : null
    const needsArena = mode !== 'arcade' && !(isOnline && role === 'guest')
    const label = mode === 'versus' || mode === 'training' ? (locked.length === 0 ? 'PLAYER 1' : mode === 'training' ? 'DUMMY' : 'PLAYER 2') : 'YOU'
    const confirmText = mode === 'arcade' ? 'START ARCADE' : mode === 'versus' && locked.length === 0 ? 'LOCK IN' : mode === 'training' && locked.length === 0 ? 'NEXT' : isOnline ? 'READY!' : 'FIGHT!'
    return (
      <div className="game-screen">
        {topbar}
        {toastLayer}
        <h3 className="brawl-heading">{heading}</h3>
        <p className="brawl-subheading">{MODE_INFO[mode]}</p>
        {locked[0] && mode !== 'online' && <p className="brawl-subheading">P1 picked {locked[0].def.name}</p>}
        {isOnline && (
          <p className="brawl-subheading">
            Online with <strong>{friend.name}</strong> · you are {role === 'host' ? 'Player 1 (left)' : 'Player 2 (right)'}
            {friend.pick ? ` · ${friend.name} picked ${friend.pick.def.name}` : ''}
            {role === 'guest' ? ' · the host picks the arena' : ''}
          </p>
        )}
        {needsArena && <ArenaPicker value={arenaChoice} onChange={setArenaChoice} />}
        {!(isOnline && locked[0]) && (
          <PickPanel
            f={f}
            costume={sel.costume}
            setCostume={(c) => setSel((s) => ({ ...s, costume: c }))}
            save={save}
            label={label}
            confirmText={confirmText}
            onConfirm={confirmPick}
          />
        )}
        <div className="brawl-pick-grid">
          {pickable.map((ff) => (
            <FighterCard
              key={ff.key}
              f={ff}
              onPick={choose}
              locked={!available(ff)}
              selected={sel.key === ff.key}
              costume={sel.key === ff.key ? sel.costume : 'classic'}
              mark={locked[0]?.def.key === ff.key ? (isOnline ? 'YOU' : 'P1') : null}
            />
          ))}
          {FIGHTERS.filter((ff) => ff.boss && !available(ff)).map((ff) => (
            <FighterCard key={ff.key} f={ff} onPick={choose} locked />
          ))}
        </div>
        {isOnline && <ChatBox messages={chat} onSend={sendChat} />}
        <button className="exit-btn" style={{ marginTop: 16 }} onClick={() => (isOnline ? leaveOnline() : setScreen('menu'))}>
          ← {isOnline ? 'Leave online game' : 'Back'}
        </button>
      </div>
    )
  }

  if (screen === 'ladder') {
    const { me, foes, stage } = ladder
    const slots = [...foes, BOSS]
    return (
      <div className="game-screen">
        {topbar}
        {toastLayer}
        <h3 className="brawl-heading">
          {stage >= foes.length ? '⚠️ WARNING: BOSS APPROACHING ⚠️' : `ARCADE · FIGHT ${stage + 1} OF ${slots.length}`}
        </h3>
        <div className="brawl-ladder">
          {slots.map((foe, i) => (
            <div key={foe.key} className={`brawl-rung ${i < stage ? 'is-beaten' : ''} ${i === stage ? 'is-now' : ''} ${foe.boss ? 'is-boss' : ''}`}>
              <PixelArt fighterKey={foe.key} kind="head" zoom={2} hidden={foe.boss && i > stage} />
              <span>{foe.boss ? (i <= stage ? 'BOSS' : '???') : foe.name}</span>
              {i < stage && <span className="brawl-rung-x">✖</span>}
            </div>
          ))}
        </div>
        <div className="brawl-vs-row">
          <PixelArt fighterKey={me.def.key} kind="body" zoom={3} costume={me.costume} />
          <span className="brawl-vs-text">VS</span>
          <PixelArt fighterKey={slots[stage].key} kind="body" zoom={3} hidden={false} />
        </div>
        <button className="brawl-big-btn" style={{ maxWidth: 360 }} onClick={ladderFight}>
          {stage >= foes.length ? 'FACE THE BOSS!' : 'FIGHT!'}
        </button>
        <button className="exit-btn" style={{ marginTop: 16 }} onClick={() => setScreen('menu')}>
          Give up
        </button>
      </div>
    )
  }

  // ---------- The fight ----------
  const isOnline = mode === 'online'
  const picks = fight.picks
  let title = ''
  let buttons = null
  if (result) {
    if (mode === 'versus') title = `PLAYER ${result.winner + 1} WINS!`
    else title = result.won ? 'YOU WIN!' : 'YOU LOSE!'
    if (result.arcadeClear) title = '🏆 ARCADE CHAMPION! 🏆'
    if (mode === 'arcade') {
      buttons = result.arcadeClear ? (
        <button onClick={() => setScreen('menu')}>Menu</button>
      ) : result.won ? (
        <button
          onClick={() => {
            setLadder((l) => ({ ...l, stage: l.stage + 1 }))
            setScreen('ladder')
          }}
        >
          Next fight →
        </button>
      ) : (
        <>
          <button onClick={ladderFight}>Continue?</button>
          <button onClick={() => setScreen('menu')}>Give up</button>
        </>
      )
    } else {
      buttons = (
        <>
          <button
            onClick={() => {
              if (isOnline) link.send({ t: 'rematch' })
              startFight({ picks: fight.picks, arena: fight.arena, names: fight.names })
            }}
          >
            Rematch
          </button>
          <button
            onClick={() => {
              if (isOnline) {
                link.send({ t: 'reselect' })
                setFriend((f) => ({ ...f, pick: null }))
              }
              openSelect(mode)
            }}
          >
            Change Fighters
          </button>
          <button onClick={() => (isOnline ? leaveOnline() : setScreen('menu'))}>Menu</button>
        </>
      )
    }
  }
  return (
    <div className="game-screen">
      {topbar}
      {toastLayer}
      {mode === 'training' && (
        <div className="brawl-training-bar">
          <span>Dummy:</span>
          {['stand', 'block', 'jump'].map((d) => (
            <button key={d} className={`brawl-chip ${dummy === d ? 'is-on' : ''}`} onClick={() => setDummy(d)}>
              {d === 'stand' ? '🧍 Stand' : d === 'block' ? '🛡️ Block' : '🦘 Jump'}
            </button>
          ))}
          <span className="brawl-training-note">Your meter stays full · the dummy heals</span>
          <button className="brawl-chip" onClick={() => setScreen('menu')}>
            Done
          </button>
        </div>
      )}
      <Fight
        key={fight.id}
        picks={picks}
        mode={isOnline ? role : mode === 'arcade' ? 'cpu' : mode}
        difficulty={difficulty}
        arena={fight.arena}
        names={fight.names}
        bossFight={fight.bossFight}
        dummy={dummy}
        link={link}
        onOver={handleOver}
        onLeave={mode === 'training' ? trainingDone : null}
        touch={touch}
      >
        {result && (
          <div className="game-overlay brawl-result" style={{ '--card-color': game.color }}>
            <div className="brawl-result-winner">
              <PixelArt fighterKey={picks[result.winner].def.key} kind="body" zoom={3} costume={picks[result.winner].costume} />
              <div className="brawl-bubble">“{picks[result.winner].def.quotes[result.quote]}”</div>
            </div>
            <h3 className="brawl-result-title">{title}</h3>
            <p>
              {picks[result.winner].def.name} wins{fight.names ? ` (${fight.names[result.winner]})` : ''}!
              {result.reward > 0 && ` +${result.reward} Faz-Tokens (you have ${wallet}).`}
            </p>
            <div className="brawl-menu-row">{buttons}</div>
          </div>
        )}
      </Fight>
      {isOnline && <ChatBox messages={chat} onSend={sendChat} />}
      {!touch && <Controls mode={mode === 'versus' ? 'versus' : 'solo'} />}
    </div>
  )
}
