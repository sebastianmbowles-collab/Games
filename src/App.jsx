import { useState } from 'react'
import { GAMES } from './data/games'
import GameCard from './components/GameCard'
import AnimalBrawl from './games/AnimalBrawl'
import Jam from './games/Jam'

const GAME_COMPONENTS = {
  'animal-brawl': AnimalBrawl,
  jam: Jam,
}

export default function App() {
  const [activeGame, setActiveGame] = useState(null)

  if (activeGame) {
    const GameComponent = GAME_COMPONENTS[activeGame.key]
    return <GameComponent game={activeGame} onExit={() => setActiveGame(null)} />
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
    </div>
  )
}
