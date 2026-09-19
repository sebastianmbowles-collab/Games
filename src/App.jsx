import { useState } from 'react'
import { GAMES } from './data/games'
import GameCard from './components/GameCard'
import ComingSoonModal from './components/ComingSoonModal'
import GuitarHero from './games/GuitarHero'
import BalloonPop from './games/BalloonPop'
import MemoryGame from './games/MemoryGame'

const PLAYABLE_COMPONENTS = {
  'guitar-hero': GuitarHero,
  'balloon-pop': BalloonPop,
  'memory-game': MemoryGame,
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
    </div>
  )
}
