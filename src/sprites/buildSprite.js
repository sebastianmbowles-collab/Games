const GRID = 16

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

// config: { earType, eyePatchSide, beak, mask, accent, wide }
export function buildSpriteGrid(config) {
  const cx = GRID / 2 - 0.5
  const cy = GRID / 2 - 0.5
  const headRx = config.wide ? 6.6 : 6
  const headRy = 5.7
  const cells = Array.from({ length: GRID }, () => Array(GRID).fill(null))

  const set = (x, y, kind) => {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return
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
    for (let i = 0; i < 4; i++) {
      set(cx - 3.2 + i * 0.4, cy + 1 + i * 0.6, 'streak')
      set(cx + 3.2 - i * 0.4, cy + 1 + i * 0.6, 'streak')
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
  } else {
    for (let x = cx - 1.6; x <= cx + 1.6; x++) set(x, cy + 3, 'mouth')
  }

  // accent
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

  return cells
}

export function spriteCellColor(kind, palette) {
  switch (kind) {
    case 'earOuter':
      return palette.earOuter ?? palette.face
    case 'earInner':
      return palette.earInner ?? palette.dark
    case 'face':
      return palette.face
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
    case 'accent':
      return palette.accent ?? '#111'
    case 'accentCenter':
      return palette.accent2 ?? palette.accent ?? '#111'
    default:
      return null
  }
}

export const GRID_SIZE = GRID
