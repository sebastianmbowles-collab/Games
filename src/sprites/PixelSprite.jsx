import { useMemo } from 'react'
import { buildSpriteGrid, spriteCellColor, GRID_SIZE } from './buildSprite'
import { CHARACTERS } from './characters'

export default function PixelSprite({ name, size = 48, className }) {
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

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects}
    </svg>
  )
}
