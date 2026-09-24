import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Bonk from './games/Bonk'
import GameErrorBoundary from './components/GameErrorBoundary'

// BONK! on its own, without the arcade around it.
const restart = () => location.reload()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameErrorBoundary onExit={restart}>
      <Bonk standalone onExit={restart} />
    </GameErrorBoundary>
  </StrictMode>,
)
