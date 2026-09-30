import { useEffect, useState } from 'react'
import { CHALLENGES, DIFFICULTIES } from './data'
import { COSTUMES } from './costumes'
import { loadSave } from './save'

// Match setup: who is playing, how many ducks, difficulty and challenge.
export default function Lobby({ input, onStart, onClose, onOnline }) {
  const save = loadSave()
  const [extra, setExtra] = useState([]) // extra local players: { kind: 'keys'|'pad', index, costume }
  const [ducks, setDucks] = useState(8)
  const [difficulty, setDifficulty] = useState('medium')
  const [challenge, setChallenge] = useState('none')
  const [pads, setPads] = useState([])

  useEffect(() => {
    const id = setInterval(() => {
      input.pollPads()
      setPads(Object.entries(input.pads).map(([i, p]) => ({ index: Number(i), id: p.id })))
    }, 400)
    return () => clearInterval(id)
  }, [input])

  const owned = save.owned.filter((k) => COSTUMES[k])
  const secrets = save.secrets.length
  const challenges = CHALLENGES.filter((c) => !c.secret || secrets >= c.secret)

  function addKeys() {
    if (!extra.some((e) => e.kind === 'keys')) setExtra([...extra, { kind: 'keys', costume: owned[1 % owned.length] || 'rookie' }])
  }
  function addPad(index) {
    if (!extra.some((e) => e.kind === 'pad' && e.index === index) && extra.length < 3) setExtra([...extra, { kind: 'pad', index, costume: 'rookie' }])
  }
  function cycle(i) {
    setExtra(extra.map((e, j) => (j === i ? { ...e, costume: owned[(owned.indexOf(e.costume) + 1) % owned.length] || 'rookie' } : e)))
  }

  function start() {
    const twoKeys = extra.some((e) => e.kind === 'keys')
    const humans = [
      { name: 'You', costume: save.costume, pet: save.pet, input: { type: 'keys', scheme: twoKeys ? 'p1' : 'solo' } },
      ...extra.map((e, i) => ({
        name: `Player ${i + 2}`,
        costume: e.costume,
        pet: null,
        input: e.kind === 'keys' ? { type: 'keys', scheme: 'p2' } : { type: 'pad', index: e.index },
      })),
    ]
    onStart({ humans, ducks: Math.max(ducks, humans.length + 1), difficulty, challenge })
  }

  return (
    <div className="bonk-modal" onClick={onClose}>
      <div className="bonk-panel bonk-lobby" onClick={(e) => e.stopPropagation()}>
        <button className="bonk-close" onClick={onClose}>✕</button>
        <h3>▶ PLAY</h3>

        <section>
          <h4>Players</h4>
          <div className="bonk-player-row">
            <div className="bonk-slot is-you">
              <b>P1 · You</b>
              <span>{COSTUMES[save.costume]?.name}</span>
              <small>{extra.some((e) => e.kind === 'keys') ? 'WASD · Space jump · F bonk · L-Shift dash · E shield' : 'WASD/arrows · Space jump · J/F bonk · Shift dash · E shield'}</small>
            </div>
            {extra.map((e, i) => (
              <div key={i} className="bonk-slot">
                <b>P{i + 2} · {e.kind === 'keys' ? 'Keyboard' : `Controller ${e.index + 1}`}</b>
                <button onClick={() => cycle(i)}>👕 {COSTUMES[e.costume]?.name}</button>
                <small>{e.kind === 'keys' ? 'Arrows · . jump · Enter bonk · R-Shift dash · / shield' : 'Stick · A jump · X bonk · RB dash · LB shield'}</small>
                <button className="bonk-link" onClick={() => setExtra(extra.filter((_, j) => j !== i))}>remove</button>
              </div>
            ))}
          </div>
          <div className="bonk-chip-row">
            <button onClick={addKeys} disabled={extra.some((e) => e.kind === 'keys')}>+ Player on same keyboard</button>
            {pads.map((p) => (
              <button key={p.index} onClick={() => addPad(p.index)} disabled={extra.some((e) => e.kind === 'pad' && e.index === p.index)}>
                🎮 + Controller {p.index + 1}
              </button>
            ))}
            {!pads.length && <span className="bonk-muted">🎮 Plug in a controller and press a button to see it here.</span>}
            <button className="is-on" onClick={onOnline}>
              🌐 Play Online
            </button>
          </div>
        </section>

        <section>
          <h4>Ducks in the arena</h4>
          <div className="bonk-chip-row">
            {[4, 6, 8, 10].map((n) => (
              <button key={n} className={ducks === n ? 'is-on' : ''} onClick={() => setDucks(n)}>
                {n} 🦆
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>Bot difficulty</h4>
          <div className="bonk-chip-row">
            {DIFFICULTIES.map((d) => (
              <button key={d.key} className={difficulty === d.key ? 'is-on' : ''} onClick={() => setDifficulty(d.key)}>
                {d.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h4>Challenge</h4>
          <div className="bonk-challenges">
            {challenges.map((c) => (
              <button key={c.key} className={challenge === c.key ? 'is-on' : ''} onClick={() => setChallenge(c.key)} title={c.desc}>
                <b>{c.name}</b>
                <small>{c.desc}</small>
              </button>
            ))}
          </div>
        </section>

        <button className="bonk-go" onClick={start}>
          BONK! 🔨
        </button>
      </div>
    </div>
  )
}
