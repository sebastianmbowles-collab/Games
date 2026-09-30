export default function GameCard({ game, onPlay }) {
  return (
    <button className="game-card is-playable" style={{ '--card-color': game.color }} onClick={() => onPlay(game)}>
      <div className="game-card-icon">{game.icon}</div>
      <h3 className="game-card-title">{game.title}</h3>
      <p className="game-card-blurb">{game.blurb}</p>
      <span className="game-card-tag">PLAY</span>
    </button>
  )
}
