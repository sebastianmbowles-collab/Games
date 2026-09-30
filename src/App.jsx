import { useState } from 'react'
import { GAMES } from './data/games'
import GameCard from './components/GameCard'
import GameErrorBoundary from './components/GameErrorBoundary'
import ResetArcade from './components/ResetArcade'
import AnimalBrawl from './games/AnimalBrawl'
import Jam from './games/Jam'
import Bonk from './games/Bonk'
import TADC from './games/TADC'

const GAME_COMPONENTS = {
  bonk: Bonk,
  'animal-brawl': AnimalBrawl,
  jam: Jam,
  tadc: TADC,
}

export default function App() {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame) {
    const GameComponent = GAME_COMPONENTS[activeGame.key]
    return (
      <GameErrorBoundary onExit={() => setActiveGame(null)}>
        <GameComponent game={activeGame} onExit={() => setActiveGame(null)} />
      </GameErrorBoundary>
    )
  }

  return (
    <div className="hub">
      <header className="hub-header">
        <h1>Seb's Arcade</h1>
        <p>Pick a game to play</p>
      </header>
      <div className="hub-grid">
        {GAMES.map((game) => (
          <GameCard key={game.key} game={game} onPlay={setActiveGame} />
        ))}
      </div>
      <footer className="arcade-footer">
        <ResetArcade />
      </footer>
    </div>
  )
}
