import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AliensVsDinos from './games/AliensVsDinos.jsx'
import { GAMES } from './data/games'

// Aliens VS Dinos on its own page, without the rest of the arcade around it.
const game = GAMES.find((g) => g.key === 'aliens-vs-dinos')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AliensVsDinos game={game} />
  </StrictMode>,
)
