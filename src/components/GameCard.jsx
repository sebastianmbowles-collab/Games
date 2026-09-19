export default function GameCard({ game, onPlay }) {
  return (
    <button
      className={`game-card ${game.playable ? 'is-playable' : 'is-soon'}`}
      style={{ '--card-color': game.color }}
      onClick={() => onPlay(game)}
    >
      <div className="game-card-icon">{game.icon}</div>
      <h3 className="game-card-title">{game.title}</h3>
      <p className="game-card-blurb">{game.blurb}</p>
      <span className="game-card-tag">
        {game.playable ? 'PLAY' : 'COMING SOON'}
      </span>
    </button>
  )
}
