export default function ComingSoonModal({ game, onClose }) {
  if (!game) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ '--card-color': game.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-icon">{game.icon}</div>
        <h2>{game.title}</h2>
        <p>This game isn't built yet — check back soon!</p>
        <button className="modal-close" onClick={onClose}>
          Back to Hub
        </button>
      </div>
    </div>
  )
}
