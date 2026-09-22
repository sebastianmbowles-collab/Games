const WIDTH = 16
const HEIGHT = 24
const HEAD_CY = 7

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

// config: { earType, eyePatchSide, beak, mask, accent, wide, prop }
export function buildSpriteGrid(config) {
  const cx = WIDTH / 2 - 0.5
  const cy = HEAD_CY
  const headRx = config.wide ? 6.6 : 6
  const headRy = 5.7
  const cells = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(null))

  const set = (x, y, kind) => {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return
    cells[Math.round(y)][Math.round(x)] = kind
  }

  // ears
  if (config.earType === 'round') {
    const earR = 2.5
    const earInnerR = 1.3
    const positions = [
      [cx - 4.6, cy - 5],
      [cx + 4.6, cy - 5],
    ]
    for (const [ex, ey] of positions) {
      for (let y = ey - earR; y <= ey + earR; y++) {
        for (let x = ex - earR; x <= ex + earR; x++) {
          if (inEllipse(x, y, ex, ey, earR, earR)) set(x, y, 'earOuter')
        }
      }
    }
    for (const [ex, ey] of positions) {
      for (let y = ey - earInnerR; y <= ey + earInnerR; y++) {
        for (let x = ex - earInnerR; x <= ex + earInnerR; x++) {
          if (inEllipse(x, y, ex, ey, earInnerR, earInnerR)) set(x, y, 'earInner')
        }
      }
    }
  } else if (config.earType === 'pointy') {
    const tris = [
      [cx - 6.4, cy - 1.5, cx - 3.6, cy - 1.5, cx - 5, cy - 6.5],
      [cx + 6.4, cy - 1.5, cx + 3.6, cy - 1.5, cx + 5, cy - 6.5],
    ]
    for (const [ax, ay, bx, by, tx, ty] of tris) {
      for (let y = ty; y <= ay; y++) {
        for (let x = ax - 1; x <= bx + 1; x++) {
          if (inTriangle(x, y, ax, ay, bx, by, tx, ty)) set(x, y, 'earOuter')
        }
      }
    }
  } else if (config.earType === 'tall') {
    const rects = [
      [cx - 4.5, cy - 9, 1.8, 4.2],
      [cx + 4.5, cy - 9, 1.8, 4.2],
    ]
    for (const [ex, ey, hw, hh] of rects) {
      for (let y = ey - hh; y <= ey + hh; y++) {
        for (let x = ex - hw; x <= ex + hw; x++) {
          set(x, y, 'earOuter')
        }
      }
    }
  } else if (config.earType === 'cap') {
    for (let y = cy - 9.5; y <= cy - 4.8; y++) {
      const t = (y - (cy - 9.5)) / (cy - 4.8 - (cy - 9.5))
      const halfW = t * 3.2
      for (let x = cx - halfW; x <= cx + halfW; x++) set(x, y, 'earOuter')
    }
    set(cx, cy - 9.8, 'earInner')
  }

  // head
  for (let y = cy - headRy; y <= cy + headRy; y++) {
    for (let x = cx - headRx; x <= cx + headRx; x++) {
      if (inEllipse(x, y, cx, cy, headRx, headRy)) set(x, y, 'face')
    }
  }

  // mask tear streaks (puppet)
  if (config.mask) {
    for (let i = 0; i < 5; i++) {
      const y = cy - 1.4 + i * 0.9
      set(cx - 3.4 + i * 0.25, y, 'streak')
      set(cx - 3.4 + i * 0.25 - 1, y, 'streak')
      set(cx + 3.4 - i * 0.25, y, 'streak')
      set(cx + 3.4 - i * 0.25 + 1, y, 'streak')
    }
  }

  // eyes
  const eyeR = 1.7
  const eyePositions = [
    [cx - 2.6, cy - 0.4],
    [cx + 2.6, cy - 0.4],
  ]
  eyePositions.forEach(([ex, ey], idx) => {
    const side = idx === 0 ? 'left' : 'right'
    if (config.eyePatchSide === side) {
      for (let y = ey - eyeR - 0.4; y <= ey + eyeR + 0.4; y++) {
        for (let x = ex - eyeR - 0.4; x <= ex + eyeR + 0.4; x++) {
          if (inEllipse(x, y, ex, ey, eyeR + 0.4, eyeR + 0.4)) set(x, y, 'patch')
        }
      }
      set(ex - eyeR, ey - eyeR - 1, 'strap')
      set(ex + eyeR, ey + eyeR + 1, 'strap')
      return
    }
    for (let y = ey - eyeR; y <= ey + eyeR; y++) {
      for (let x = ex - eyeR; x <= ex + eyeR; x++) {
        if (inEllipse(x, y, ex, ey, eyeR, eyeR)) set(x, y, 'eyeWhite')
      }
    }
    const pr = eyeR * 0.5
    for (let y = ey - pr; y <= ey + pr; y++) {
      for (let x = ex - pr; x <= ex + pr; x++) {
        if (inEllipse(x, y, ex, ey, pr, pr)) set(x, y, 'pupil')
      }
    }
  })

  // beak (chicken)
  if (config.beak) {
    const bx = cx
    const by = cy + 2.6
    for (let y = by - 1.2; y <= by + 1.2; y++) {
      const t = Math.abs(y - by) / 1.2
      const halfW = (1 - t) * 2.2
      for (let x = bx - halfW; x <= bx + halfW; x++) set(x, y, 'beak')
    }
  } else if (config.snout) {
    for (let y = cy + 2.2; y <= cy + 3.6; y++) {
      for (let x = cx - 2.6; x <= cx + 2.6; x++) set(x, y, 'mouth')
    }
    for (let x = cx - 2; x <= cx + 2; x += 1.3) set(x, cy + 3.6, 'tooth')
    // brow ridge bumps for texture
    for (const dx of [-3.2, 0, 3.2]) {
      set(cx + dx, cy - headRy + 1.2, 'ridge')
    }
  } else {
    for (let x = cx - 1.6; x <= cx + 1.6; x++) set(x, cy + 3, 'mouth')
  }

  // accent (worn right at the neckline, like a bowtie/bib collar)
  if (config.accent === 'bowtie') {
    for (let y = cy + 4.6; y <= cy + 6; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        const t = Math.abs(x - cx) / 2
        if (Math.abs(y - (cy + 5.3)) <= (1 - t) * 0.9 + 0.15) set(x, y, 'accent')
      }
    }
    set(cx, cy + 5.3, 'accentCenter')
  } else if (config.accent === 'bib') {
    for (let y = cy + 4.4; y <= cy + 6.2; y++) {
      for (let x = cx - 2.6; x <= cx + 2.6; x++) {
        if (inEllipse(x, y, cx, cy + 4.8, 2.6, 1.6)) set(x, y, 'accent')
      }
    }
  }

  // body: torso, arms, legs, feet
  const bodyTop = cy + headRy + 0.8
  const torsoBottom = bodyTop + 5
  for (let y = bodyTop; y <= torsoBottom; y++) {
    const t = (y - bodyTop) / (torsoBottom - bodyTop)
    const halfW = 3.6 - t * 0.4
    for (let x = cx - halfW; x <= cx + halfW; x++) set(x, y, 'body')
  }

  const heldSide = config.prop ? 'right' : null

  // left arm (always plain)
  for (let y = bodyTop + 0.6; y <= torsoBottom - 0.4; y++) {
    for (let x = cx - 6; x <= cx - 4.1; x++) set(x, y, 'arm')
  }
  // right arm (plain, unless holding a prop)
  if (heldSide !== 'right') {
    for (let y = bodyTop + 0.6; y <= torsoBottom - 0.4; y++) {
      for (let x = cx + 4.1; x <= cx + 6; x++) set(x, y, 'arm')
    }
  } else {
    for (let y = bodyTop + 0.6; y <= bodyTop + 2.6; y++) {
      for (let x = cx + 4.1; x <= cx + 6; x++) set(x, y, 'arm')
    }
  }

  const legTop = torsoBottom + 0.4
  const legBottom = legTop + 2.6
  for (let y = legTop; y <= legBottom; y++) {
    for (let x = cx - 2.6; x <= cx - 0.6; x++) set(x, y, 'leg')
    for (let x = cx + 0.6; x <= cx + 2.6; x++) set(x, y, 'leg')
  }
  for (let y = legBottom + 0.1; y <= legBottom + 1.4; y++) {
    for (let x = cx - 3; x <= cx - 0.2; x++) set(x, y, 'foot')
    for (let x = cx + 0.2; x <= cx + 3; x++) set(x, y, 'foot')
  }

  // held prop, resting beside the right hand
  const handX = cx + 5
  const handY = bodyTop + 3.4
  if (config.prop === 'guitar') {
    for (let y = handY - 1; y <= handY + 1.6; y++) {
      for (let x = handX - 1.4; x <= handX + 1.4; x++) set(x, y, 'guitarBody')
    }
    const neck = [
      [handX - 0.8, handY - 1.2],
      [handX - 0.1, handY - 2.4],
      [handX + 0.6, handY - 3.6],
      [handX + 1.3, handY - 4.8],
      [handX + 2, handY - 6],
    ]
    for (const [nx, ny] of neck) set(nx, ny, 'guitarNeck')
    set(handX + 2, handY - 6.8, 'guitarPeg')
  } else if (config.prop === 'mic') {
    const mx = handX + 0.2
    const my = handY - 1
    for (let y = my - 1; y <= my + 1; y++) {
      for (let x = mx - 1; x <= mx + 1; x++) {
        if (inEllipse(x, y, mx, my, 1, 1)) set(x, y, 'micHead')
      }
    }
    for (let y = my - 0.6; y <= my + 0.6; y++) {
      for (let x = mx - 0.6; x <= mx + 0.6; x++) {
        if (inEllipse(x, y, mx, my, 0.6, 0.6)) set(x, y, 'micGrille')
      }
    }
    for (let y = my + 1.2; y <= my + 4.4; y++) {
      set(mx - 0.4, y, 'micHandle')
      set(mx + 0.4, y, 'micHandle')
    }
  } else if (config.prop === 'cupcake') {
    const bx = handX + 0.3
    const by = handY
    for (let y = by; y <= by + 1.5; y++) {
      const t = (y - by) / 1.5
      const halfW = 0.8 + t * 0.5
      for (let x = bx - halfW; x <= bx + halfW; x++) set(x, y, 'cupBase')
    }
    for (let y = by - 1.8; y <= by; y++) {
      for (let x = bx - 1.4; x <= bx + 1.4; x++) {
        if (inEllipse(x, y, bx, by - 0.8, 1.4, 1)) set(x, y, 'cupFrosting')
      }
    }
    set(bx, by - 2.6, 'cupCandle')
  }

  return cells
}

export function spriteCellColor(kind, palette) {
  switch (kind) {
    case 'earOuter':
      return palette.earOuter ?? palette.face
    case 'earInner':
      return palette.earInner ?? palette.dark
    case 'face':
    case 'body':
    case 'arm':
      return palette.face
    case 'leg':
      return palette.earOuter ?? palette.face
    case 'foot':
      return palette.dark ?? '#1a1a1a'
    case 'eyeWhite':
      return '#f5f5f5'
    case 'pupil':
      return palette.eye ?? '#101014'
    case 'patch':
      return palette.dark ?? '#1a1a1a'
    case 'strap':
      return palette.dark ?? '#1a1a1a'
    case 'streak':
      return palette.dark ?? '#1a1a1a'
    case 'beak':
      return palette.accent2 ?? '#f2a30f'
    case 'mouth':
      return palette.dark ?? '#1a1a1a'
    case 'tooth':
      return '#f5f5f5'
    case 'ridge':
      return palette.dark ?? '#1a1a1a'
    case 'accent':
      return palette.accent ?? '#111'
    case 'accentCenter':
      return palette.accent2 ?? palette.accent ?? '#111'
    case 'guitarBody':
      return palette.accent ?? '#e0393e'
    case 'guitarNeck':
      return '#6b4420'
    case 'guitarPeg':
      return '#d9d9d9'
    case 'micHead':
      return '#e8e8ee'
    case 'micGrille':
      return '#4a4a52'
    case 'micHandle':
      return '#2a2a30'
    case 'cupBase':
      return '#f2f2f2'
    case 'cupFrosting':
      return '#f2a3d0'
    case 'cupCandle':
      return '#f2b90c'
    default:
      return null
  }
}

export const GRID_WIDTH = WIDTH
export const GRID_HEIGHT = HEIGHT
export const HEAD_VIEW_HEIGHT = 14
export const GRID_SIZE = WIDTH
export const EYE_RADIUS = 1.7
export const EYE_CENTER_X = WIDTH / 2 - 0.5
export const EYE_CENTER_Y = HEAD_CY
export const EYE_POSITIONS = [
  { x: EYE_CENTER_X - 2.6, y: EYE_CENTER_Y - 0.4, side: 'left' },
  { x: EYE_CENTER_X + 2.6, y: EYE_CENTER_Y - 0.4, side: 'right' },
]
