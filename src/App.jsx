import { useState } from 'react'
import { GAMES } from './data/games'
import GameCard from './components/GameCard'
import ComingSoonModal from './components/ComingSoonModal'
import CornerMascot from './components/CornerMascot'
import GuitarHero from './games/GuitarHero'
import BalloonPop from './games/BalloonPop'
import MemoryGame from './games/MemoryGame'
import PizzaCatch from './games/PizzaCatch'
import LuckySpin from './games/LuckySpin'
import RepairShop from './games/RepairShop'
import TreasureHunt from './games/TreasureHunt'
import BalloonFactory from './games/BalloonFactory'
import MontyGolf from './games/MontyGolf'
import RoxyRacing from './games/RoxyRacing'
import MusicBox from './games/MusicBox'
import HideAndSeek from './games/HideAndSeek'
import GameRoom from './games/GameRoom'
import PrizeCorner from './games/PrizeCorner'
import ClawMachine from './games/ClawMachine'
import SecurityPuppet from './games/SecurityPuppet'
import FazbearDelivery from './games/FazbearDelivery'

const PLAYABLE_COMPONENTS = {
  'guitar-hero': GuitarHero,
  'balloon-pop': BalloonPop,
  'memory-game': MemoryGame,
  'pizza-catch': PizzaCatch,
  'lucky-spin': LuckySpin,
  'repair-shop': RepairShop,
  'treasure-hunt': TreasureHunt,
  'balloon-factory': BalloonFactory,
  golf: MontyGolf,
  racing: RoxyRacing,
  'music-box': MusicBox,
  'hide-and-seek': HideAndSeek,
  'game-room': GameRoom,
  'prize-corner': PrizeCorner,
  'claw-machine': ClawMachine,
  'security-puppet': SecurityPuppet,
  delivery: FazbearDelivery,
}

export default function App() {
  const [activeGame, setActiveGame] = useState(null)
  const [soonGame, setSoonGame] = useState(null)

  function handlePlay(game) {
    if (game.playable) {
      setActiveGame(game)
    } else {
      setSoonGame(game)
    }
  }

  if (activeGame) {
    const GameComponent = PLAYABLE_COMPONENTS[activeGame.key]
    return (
      <GameComponent game={activeGame} onExit={() => setActiveGame(null)} />
    )
  }

  return (
    <div className="hub">
      <header className="hub-header">
        <h1>Freddy Fazbear's Arcade</h1>
        <p>Pick a game to play</p>
      </header>
      <div className="hub-grid">
        {GAMES.map((game) => (
          <GameCard key={game.key} game={game} onPlay={handlePlay} />
        ))}
      </div>
      <ComingSoonModal game={soonGame} onClose={() => setSoonGame(null)} />
      <CornerMascot />
    </div>
  )
}
