import PixelSprite from '../sprites/PixelSprite'

export default function GameTitle({ game }) {
  return (
    <div className="game-title-row">
      {game.spriteKey && <PixelSprite name={game.spriteKey} size={32} mode="head" />}
      <h2 style={{ color: game.color }}>{game.title}</h2>
    </div>
  )
}
