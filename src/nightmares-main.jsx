import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Nightmares from './games/Nightmares'

// Nightmares on its own, not inside the Freddy Fazbear arcade.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Nightmares />
  </StrictMode>,
)
