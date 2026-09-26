import { useEffect, useRef, useState } from 'react'
import GameTitle from '../components/GameTitle'
import PixelSprite from '../sprites/PixelSprite'
import { addTokens, getTokens } from '../utils/tokens'

const WIN_REWARD = 15
const SPECIAL_COOLDOWN = 3

// Every fighter shares Scratch / Pounce / Guard, plus one signature special.
const FIGHTERS = [
  {
    key: 'freddy',
    name: 'Freddy',
    animal: 'Bear',
    hp: 120,
    power: 1,
    special: { name: 'Bear Hug', kind: 'hit', min: 18, max: 24, accuracy: 1, text: 'A hug that never misses.' },
  },
  {
    key: 'bonnie',
    name: 'Bonnie',
    animal: 'Bunny',
    hp: 100,
    power: 1,
    special: { name: 'Guitar Riff', kind: 'stun', min: 10, max: 14, accuracy: 0.9, text: 'So loud the foe loses a turn.' },
  },
  {
    key: 'chica',
    name: 'Chica',
    animal: 'Chicken',
    hp: 105,
    power: 0.95,
    special: { name: 'Cupcake Snack', kind: 'heal', amount: 28, text: 'Eat a cupcake, heal up.' },
  },
  {
    key: 'foxy',
    name: 'Foxy',
    animal: 'Fox',
    hp: 90,
    power: 1.15,
    special: { name: 'Hook Flurry', kind: 'double', min: 8, max: 12, accuracy: 0.9, text: 'Two quick hook swipes.' },
  },
  {
    key: 'roxy',
    name: 'Roxy',
    animal: 'Wolf',
    hp: 95,
    power: 1.1,
    special: { name: 'Howl', kind: 'power', text: 'Next hit does double damage.' },
  },
  {
    key: 'monty',
    name: 'Monty',
    animal: 'Gator',
    hp: 110,
    power: 1,
    special: { name: 'Death Roll', kind: 'drain', min: 12, max: 16, accuracy: 0.85, text: 'Bite, then heal what you took.' },
  },
]

const BASIC_MOVES = {
  quick: { name: 'Scratch', kind: 'hit', min: 8, max: 12, accuracy: 0.95, text: 'Small but almost always lands.' },
  big: { name: 'Pounce', kind: 'hit', min: 16, max: 24, accuracy: 0.65, text: 'Big hit, but might miss.' },
  guard: { name: 'Guard', kind: 'guard', text: 'Halve the next hit and heal 5.' },
}

function rand(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function makeFighter(def) {
  return { def, hp: def.hp, guard: false, stunned: false, powered: false, cooldown: 0 }
}

function getMove(fighter, moveKey) {
  return moveKey === 'special' ? fighter.def.special : BASIC_MOVES[moveKey]
}

// Pure: returns the new attacker/defender plus what happened, for the log and animations.
function resolveMove(attacker, defender, moveKey) {
  const move = getMove(attacker, moveKey)
  const a = { ...attacker, guard: false }
  const d = { ...defender }
  const who = attacker.def.name
  let log
  let damage = 0
  let heal = 0
  let missed = false

  if (moveKey === 'special') a.cooldown = SPECIAL_COOLDOWN + 1
  if (a.cooldown > 0) a.cooldown -= 1

  function strike(min, max) {
    let dmg = Math.round(rand(min, max) * a.def.power)
    if (a.powered) {
      dmg *= 2
      a.powered = false
    }
    if (d.guard) {
      dmg = Math.ceil(dmg / 2)
      d.guard = false
    }
    return dmg
  }

  switch (move.kind) {
    case 'guard':
      a.guard = true
      heal = Math.min(5, a.def.hp - a.hp)
      a.hp += heal
      log = `${who} puts up a guard!`
      break
    case 'heal':
      heal = Math.min(move.amount, a.def.hp - a.hp)
      a.hp += heal
      log = `${who} uses ${move.name} and heals ${heal}!`
      break
    case 'power':
      a.powered = true
      log = `${who} uses ${move.name}! The next hit will be twice as strong.`
      break
    default: {
      if (Math.random() > move.accuracy) {
        missed = true
        log = `${who} tries ${move.name}... and misses!`
        break
      }
      if (move.kind === 'double') {
        damage = strike(move.min, move.max) + strike(move.min, move.max)
      } else {
        damage = strike(move.min, move.max)
      }
      log = `${who} uses ${move.name} for ${damage} damage!`
      if (move.kind === 'stun') {
        d.stunned = true
        log += ` ${d.def.name} is dizzy!`
      }
      if (move.kind === 'drain') {
        heal = Math.min(damage, a.def.hp - a.hp)
        a.hp += heal
        if (heal > 0) log += ` ${who} heals ${heal}.`
      }
    }
  }

  d.hp = Math.max(0, d.hp - damage)
  return { attacker: a, defender: d, log, damage, heal, missed }
}

function pickCpuMove(cpu, player) {
  const special = cpu.def.special
  if (cpu.cooldown === 0) {
    const hurt = cpu.hp < cpu.def.hp * 0.55
    if (special.kind === 'heal' && hurt) return 'special'
    if (special.kind !== 'heal' && Math.random() < 0.5) return 'special'
  }
  if (cpu.hp < cpu.def.hp * 0.3 && !cpu.guard && Math.random() < 0.35) return 'guard'
  // Go for the safe hit when the player is almost out.
  if (player.hp <= 12) return 'quick'
  return Math.random() < 0.55 ? 'quick' : 'big'
}

function HealthBar({ fighter, color }) {
  const pct = (fighter.hp / fighter.def.hp) * 100
  const barColor = pct > 50 ? '#2bb673' : pct > 25 ? '#f2b90c' : '#e0393e'
  return (
    <div className="brawl-hud" style={{ '--card-color': color }}>
      <div className="brawl-hud-name">
        {fighter.def.name} <span>the {fighter.def.animal}</span>
      </div>
      <div className="brawl-hp-track">
        <div className="brawl-hp-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="brawl-hud-row">
        <span>
          HP {fighter.hp}/{fighter.def.hp}
        </span>
        <span className="brawl-badges">
          {fighter.guard && <span title="Guarding">🛡️</span>}
          {fighter.powered && <span title="Powered up">🔥</span>}
          {fighter.stunned && <span title="Dizzy">💫</span>}
        </span>
      </div>
    </div>
  )
}

export default function AnimalBrawl({ game, onExit }) {
  const [phase, setPhase] = useState('pick')
  const [player, setPlayer] = useState(null)
  const [cpu, setCpu] = useState(null)
  const [turn, setTurn] = useState('player')
  const [log, setLog] = useState([])
  const [fx, setFx] = useState({})
  const [winner, setWinner] = useState(null)
  const [wallet, setWallet] = useState(getTokens)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function later(ms, fn) {
    timers.current.push(setTimeout(fn, ms))
  }

  function pushLog(line) {
    setLog((prev) => [line, ...prev].slice(0, 5))
  }

  function startFight(def) {
    const others = FIGHTERS.filter((f) => f.key !== def.key)
    const foe = others[Math.floor(Math.random() * others.length)]
    setPlayer(makeFighter(def))
    setCpu(makeFighter(foe))
    setTurn('player')
    setWinner(null)
    setFx({})
    setLog([`${def.name} the ${def.animal} vs ${foe.name} the ${foe.animal}! FIGHT!`])
    setPhase('fight')
  }

  // Plays one move with animation, then hands the turn to `next`.
  function playMove(side, attacker, defender, moveKey, next) {
    const result = resolveMove(attacker, defender, moveKey)
    const target = side === 'player' ? 'cpu' : 'player'
    const setSelf = side === 'player' ? setPlayer : setCpu
    const setFoe = side === 'player' ? setCpu : setPlayer

    setTurn('busy')
    setFx({ [side]: 'lunge' })
    later(260, () => {
      setSelf(result.attacker)
      setFoe(result.defender)
      pushLog(result.log)
      setFx({
        [side]: result.heal > 0 ? 'heal' : null,
        [target]: result.damage > 0 ? 'hit' : null,
        popup: result.missed
          ? { at: target, text: 'MISS', tone: 'miss' }
          : result.damage > 0
            ? { at: target, text: `-${result.damage}`, tone: 'dmg' }
            : result.heal > 0
              ? { at: side, text: `+${result.heal}`, tone: 'heal' }
              : null,
      })
    })
    later(900, () => {
      setFx({})
      if (result.defender.hp <= 0) {
        finish(side)
        return
      }
      next(result.attacker, result.defender)
    })
  }

  function finish(side) {
    setWinner(side)
    setPhase('over')
    if (side === 'player') setWallet(addTokens(WIN_REWARD))
  }

  function cpuTurn(p, c) {
    if (c.stunned) {
      pushLog(`${c.def.name} is too dizzy to move!`)
      setCpu({ ...c, stunned: false, cooldown: Math.max(0, c.cooldown - 1) })
      later(700, () => playerTurn(p, { ...c, stunned: false, cooldown: Math.max(0, c.cooldown - 1) }))
      return
    }
    playMove('cpu', c, p, pickCpuMove(c, p), (newCpu, newPlayer) => playerTurn(newPlayer, newCpu))
  }

  function playerTurn(p, c) {
    if (p.stunned) {
      pushLog(`${p.def.name} is too dizzy to move!`)
      const recovered = { ...p, stunned: false, cooldown: Math.max(0, p.cooldown - 1) }
      setPlayer(recovered)
      setTurn('busy')
      later(700, () => cpuTurn(recovered, c))
      return
    }
    setTurn('player')
  }

  function choose(moveKey) {
    if (turn !== 'player') return
    if (moveKey === 'special' && player.cooldown > 0) return
    playMove('player', player, cpu, moveKey, (newPlayer, newCpu) => {
      later(350, () => cpuTurn(newPlayer, newCpu))
    })
  }

  function backToPick() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('pick')
  }

  const topbar = (
    <div className="game-topbar">
      <GameTitle game={game} />
      <button className="exit-btn" onClick={onExit}>
        Exit
      </button>
    </div>
  )

  if (phase === 'pick') {
    return (
      <div className="game-screen">
        {topbar}
        <div className="stat-bar">
          <span className="stat-pill" style={{ '--card-color': game.color }}>
            TOKENS {wallet}
          </span>
          <span className="stat-pill" style={{ '--card-color': game.color }}>
            WIN = +{WIN_REWARD}
          </span>
        </div>
        <h3 className="brawl-heading">Choose your fighter</h3>
        <div className="brawl-pick-grid">
          {FIGHTERS.map((f) => (
            <button
              key={f.key}
              className="brawl-pick-card"
              style={{ '--card-color': game.color }}
              onClick={() => startFight(f)}
            >
              <PixelSprite name={f.key} size={72} />
              <strong>{f.name}</strong>
              <span className="brawl-pick-animal">the {f.animal}</span>
              <span className="brawl-pick-stats">
                HP {f.hp} · POW {Math.round(f.power * 100)}
              </span>
              <span className="brawl-pick-special">
                ★ {f.special.name}: {f.special.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const moves = ['quick', 'big', 'special', 'guard']

  return (
    <div className="game-screen">
      {topbar}
      <div className="brawl-arena" style={{ '--card-color': game.color }}>
        <div className="brawl-huds">
          <HealthBar fighter={player} color="#2b9ce0" />
          <div className="brawl-vs">VS</div>
          <HealthBar fighter={cpu} color="#e0393e" />
        </div>
        <div className="brawl-stage">
          {['player', 'cpu'].map((side) => {
            const f = side === 'player' ? player : cpu
            return (
              <div key={side} className={`brawl-fighter brawl-${side} ${fx[side] ? `fx-${fx[side]}` : ''}`}>
                {fx.popup?.at === side && (
                  <div className={`brawl-popup tone-${fx.popup.tone}`}>{fx.popup.text}</div>
                )}
                <div className={f.hp <= 0 ? 'brawl-ko' : ''}>
                  <PixelSprite name={f.def.key} size={120} bob={f.hp > 0} />
                </div>
                <div className="brawl-shadow" />
              </div>
            )
          })}
        </div>
        <ul className="brawl-log">
          {log.map((line, i) => (
            <li key={`${log.length}-${i}`} style={{ opacity: 1 - i * 0.18 }}>
              {line}
            </li>
          ))}
        </ul>
        {phase === 'over' && (
          <div className="game-overlay" style={{ '--card-color': game.color }}>
            <h3>{winner === 'player' ? '🏆 You win!' : '💥 Knocked out!'}</h3>
            <p>
              {winner === 'player'
                ? `${player.def.name} the ${player.def.animal} is the champion! +${WIN_REWARD} Faz-Tokens (you have ${wallet}).`
                : `${cpu.def.name} the ${cpu.def.animal} wins this round.`}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => startFight(player.def)}>Rematch</button>
              <button onClick={backToPick}>New Fighter</button>
            </div>
          </div>
        )}
      </div>
      <div className="brawl-moves">
        {moves.map((key) => {
          const move = getMove(player, key)
          const onCooldown = key === 'special' && player.cooldown > 0
          return (
            <button
              key={key}
              className={`brawl-move ${key === 'special' ? 'is-special' : ''}`}
              disabled={turn !== 'player' || onCooldown || phase !== 'fight'}
              onClick={() => choose(key)}
            >
              <strong>
                {key === 'special' ? '★ ' : ''}
                {move.name}
              </strong>
              <span>{onCooldown ? `Ready in ${player.cooldown} turn${player.cooldown > 1 ? 's' : ''}` : move.text}</span>
            </button>
          )
        })}
      </div>
      <p style={{ color: '#9b9bb0', marginTop: 12, fontSize: 13 }}>
        {turn === 'player' && phase === 'fight' ? 'Your turn — pick a move!' : ' '}
      </p>
    </div>
  )
}
