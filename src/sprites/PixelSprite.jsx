import { useMemo } from 'react'
import { buildSpriteGrid, spriteCellColor, GRID_SIZE, EYE_RADIUS, EYE_POSITIONS } from './buildSprite'
import { CHARACTERS } from './characters'

function hashDelay(name, spread) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997
  return (h / 997) * spread
}

export default function PixelSprite({ name, size = 48, className, bob = true, blink = true }) {
  const def = CHARACTERS[name]
  const grid = useMemo(() => (def ? buildSpriteGrid(def.shape) : null), [def])

  if (!def || !grid) return null

  const rects = []
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const kind = grid[y][x]
      if (!kind) continue
      const color = spriteCellColor(kind, def.palette)
      if (!color) continue
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} />)
    }
  }

  const bobDelay = -hashDelay(name, 2.6)
  const blinkDelay = hashDelay(name + 'b', 3.2)

  const eyelids = blink
    ? EYE_POSITIONS.filter((eye) => def.shape.eyePatchSide !== eye.side).map((eye) => (
        <rect
          key={`lid-${eye.side}`}
          className="sprite-eyelid"
          x={eye.x - EYE_RADIUS}
          y={eye.y - EYE_RADIUS}
          width={EYE_RADIUS * 2}
          height={EYE_RADIUS * 2}
          fill={def.palette.face}
          style={{ animationDelay: `${blinkDelay}s` }}
        />
      ))
    : null

  return (
    <svg
      className={[className, bob ? 'sprite-bob' : ''].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      style={bob ? { animationDelay: `${bobDelay}s` } : undefined}
      aria-hidden="true"
    >
      {rects}
      {eyelids}
    </svg>
  )
}
