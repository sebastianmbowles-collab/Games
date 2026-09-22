import PixelSprite from '../sprites/PixelSprite'

const CAST = [
  { name: 'freddy', line: "Hiya, pal!", color: '#a06835' },
  { name: 'bonnie', line: "Ready to rock?", color: '#8a3ddb' },
  { name: 'chica', line: "Let's eat pizza!", color: '#f2c40c' },
  { name: 'foxy', line: 'Arrr, welcome!', color: '#c9502a' },
]

const LIGHT_COUNT = 14

export default function Intro({ onEnter }) {
  return (
    <div className="intro-screen">
      <div className="intro-curtain intro-curtain-left" aria-hidden="true" />
      <div className="intro-curtain intro-curtain-right" aria-hidden="true" />
      <div className="intro-glow" />

      <div className="intro-content">
        <div className="intro-lights" aria-hidden="true">
          {Array.from({ length: LIGHT_COUNT }, (_, i) => (
            <span key={i} className="intro-light" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>

        <h1 className="intro-title">Freddy Fazbear's Pizza</h1>
        <p className="intro-subtitle">Welcome to the show!</p>

        <div className="intro-cast">
          {CAST.map((c, i) => (
            <div
              className="intro-character"
              key={c.name}
              style={{ animationDelay: `${1.1 + i * 0.18}s, ${1.7 + i * 0.18}s` }}
            >
              <div
                className="intro-bubble"
                style={{ '--card-color': c.color, animationDelay: `${1.35 + i * 0.18}s` }}
              >
                {c.line}
              </div>
              <PixelSprite name={c.name} size={84} />
            </div>
          ))}
        </div>

        <button className="intro-enter-btn" onClick={onEnter}>
          Step Inside
        </button>
        <p className="intro-hint">A family arcade full of games and surprises...</p>
      </div>
    </div>
  )
}
