// Boss arenas: the backgrounds, the checkered floor and the floating platforms for each boss.

import { VW, VH, GROUND_Y, INK } from './consts'

export const ARENAS = {
  jax: { platforms: [{ x: 36, y: 108, w: 64 }, { x: 150, y: 108, w: 64 }] },
  ragatha: { platforms: [{ x: 28, y: 110, w: 52 }, { x: 132, y: 98, w: 60 }] },
  gangle: { platforms: [{ x: 20, y: 112, w: 56 }, { x: 108, y: 92, w: 56 }, { x: 192, y: 112, w: 52 }] },
  kinger: { platforms: [{ x: 48, y: 104, w: 56 }, { x: 150, y: 94, w: 40 }] },
  caine: { platforms: [{ x: 36, y: 110, w: 56 }, { x: 164, y: 110, w: 56 }] },
  menu: { platforms: [] },
}

function curtain(c, x, w, flip, t) {
  for (let i = 0; i < w; i += 6) {
    const sway = Math.round(Math.sin(t * 1.2 + i * 0.3) * 1)
    c.fillStyle = (i / 6) % 2 ? '#8c1c2c' : '#b82838'
    const px = flip ? x + w - i - 6 : x + i
    c.fillRect(px + sway, 0, 6, GROUND_Y)
    c.fillStyle = '#5c1020'
    c.fillRect(px + sway + ((i / 6) % 2 ? 0 : 5), 0, 1, GROUND_Y)
  }
  c.fillStyle = '#f8c830'
  c.fillRect(flip ? x : x + w - 3, 40, 3, 6)
}

function valance(c, color, trim) {
  for (let x = 0; x < VW; x += 16) {
    c.fillStyle = color
    c.fillRect(x, 0, 16, 6)
    c.fillRect(x + 2, 6, 12, 2)
    c.fillRect(x + 5, 8, 6, 2)
    c.fillStyle = trim
    c.fillRect(x + 7, 10, 2, 2)
  }
}

function bulbs(c, y, t, speed = 4, colors = ['#f8c830', '#f4f4f4']) {
  for (let x = 6; x < VW; x += 12) {
    const on = Math.floor(t * speed + x / 12) % 2 === 0
    c.fillStyle = on ? colors[0] : '#4c3c2c'
    c.fillRect(x, y, 3, 3)
    if (on) {
      c.fillStyle = colors[1]
      c.fillRect(x + 1, y + 1, 1, 1)
    }
  }
}

const bgs = {
  menu(c, t) {
    c.fillStyle = '#1b0c30'
    c.fillRect(0, 0, VW, VH)
    for (let x = -32 + ((t * 8) % 32); x < VW; x += 32) {
      c.fillStyle = '#2a1044'
      c.fillRect(Math.round(x), 0, 16, GROUND_Y)
    }
    valance(c, '#8848c8', '#f8c830')
  },
  jax(c, t) {
    c.fillStyle = '#2a1040'
    c.fillRect(0, 0, VW, VH)
    for (let x = 0; x < VW; x += 32) {
      c.fillStyle = '#3c1858'
      c.fillRect(x, 0, 16, GROUND_Y)
    }
    // A little stage with a spotlight in the middle.
    c.fillStyle = 'rgba(255, 240, 180, 0.07)'
    c.beginPath()
    c.moveTo(150, 0)
    c.lineTo(170, 0)
    c.lineTo(230, GROUND_Y)
    c.lineTo(90, GROUND_Y)
    c.fill()
    curtain(c, 0, 30, false, t)
    curtain(c, VW - 30, 30, true, t)
    valance(c, '#b82838', '#f8c830')
    bulbs(c, 14, t, 3)
  },
  ragatha(c, t, scroll = 0) {
    // A patchwork quilt room, with dashed stitches between the squares. It slides on the treadmill.
    const cols = ['#5c7cc8', '#c85c7c', '#7cb87c', '#d8a860', '#8c6cc8', '#c8c85c', '#5cb8c0']
    const s = Math.round(scroll * 0.5)
    const start = -(((s % 24) + 24) % 24)
    for (let y = 0; y < GROUND_Y; y += 24) {
      for (let x = start; x < VW; x += 24) {
        const col = Math.round((x + s) / 24)
        const k = (((col + (y / 24) * 3) % cols.length) + cols.length) % cols.length
        c.fillStyle = cols[k]
        c.fillRect(x, y, 24, 24)
        c.fillStyle = 'rgba(20, 12, 28, 0.35)'
        c.fillRect(x, y, 24, 24)
        c.fillStyle = '#f4e8d0'
        for (let i = 2; i < 24; i += 4) {
          c.fillRect(x + i, y + 1, 2, 1)
          c.fillRect(x + 1, y + i, 1, 2)
        }
        if ((((col + y / 24) % 5) + 5) % 5 === 0) {
          c.fillStyle = '#68d8f8'
          c.fillRect(x + 9, y + 9, 6, 6)
          c.fillStyle = INK
          c.fillRect(x + 10, y + 10, 1, 1)
          c.fillRect(x + 13, y + 10, 1, 1)
          c.fillRect(x + 10, y + 13, 1, 1)
          c.fillRect(x + 13, y + 13, 1, 1)
        }
      }
    }
    valance(c, '#d82838', '#f4f4f4')
  },
  gangle(c, t) {
    c.fillStyle = '#0c0818'
    c.fillRect(0, 0, VW, VH)
    // Two dramatic spotlights.
    for (const [x, k] of [
      [70, 0],
      [250, 1.5],
    ]) {
      const sway = Math.sin(t * 0.8 + k) * 30
      c.fillStyle = 'rgba(200, 180, 255, 0.07)'
      c.beginPath()
      c.moveTo(x - 6, 0)
      c.lineTo(x + 6, 0)
      c.lineTo(x + sway + 50, GROUND_Y)
      c.lineTo(x + sway - 50, GROUND_Y)
      c.fill()
    }
    // Faint comedy and tragedy masks in the dark.
    c.fillStyle = 'rgba(244, 244, 244, 0.08)'
    c.fillRect(140, 40, 18, 20)
    c.fillRect(166, 44, 18, 20)
    // Ribbons hanging from the ceiling, swaying.
    for (let x = 12; x < VW; x += 28) {
      const len = 20 + ((x * 7) % 30)
      for (let y = 0; y < len; y += 2) {
        const off = Math.round(Math.sin(t * 2 + x + y * 0.2) * 2)
        c.fillStyle = y % 6 < 3 ? '#d82838' : '#f4f4f4'
        c.fillRect(x + off, y, 3, 2)
      }
    }
  },
  kinger(c, t) {
    // A pillow fort built on a giant chess board.
    for (let y = 0; y < GROUND_Y; y += 16) {
      for (let x = 0; x < VW; x += 16) {
        c.fillStyle = (x / 16 + y / 16) % 2 ? '#3c2c5c' : '#54407c'
        c.fillRect(x, y, 16, 16)
      }
    }
    // Stacks of pillows at the back.
    const piles = [20, 90, 230, 290]
    for (const px of piles) {
      for (let k = 0; k < 4; k++) {
        const y = GROUND_Y - 10 - k * 9
        c.fillStyle = INK
        c.fillRect(px - 1 + (k % 2) * 3, y - 1, 26, 10)
        c.fillStyle = k % 2 ? '#c8b8e0' : '#e8e0f4'
        c.fillRect(px + (k % 2) * 3, y, 24, 8)
      }
    }
    // Hanging crown banners.
    for (let x = 40; x < VW; x += 80) {
      c.fillStyle = '#8848c8'
      c.fillRect(x, 0, 14, 22)
      c.fillRect(x + 2, 22, 10, 3)
      c.fillStyle = '#f8c830'
      c.fillRect(x + 3, 8, 8, 4)
      c.fillRect(x + 3, 5, 2, 3)
      c.fillRect(x + 6, 4, 2, 4)
      c.fillRect(x + 9, 5, 2, 3)
    }
    bulbs(c, 30 + Math.round(Math.sin(t) * 1), t, 2, ['#c8b8e0', '#f4f4f4'])
  },
  caine(c, t) {
    // The Grand Finale: a huge tent, flashing bulbs and sweeping search lights.
    c.fillStyle = '#12081c'
    c.fillRect(0, 0, VW, VH)
    for (let i = -8; i < 8; i++) {
      const a0 = Math.PI / 2 + i * 0.13
      c.fillStyle = i % 2 ? '#3c1020' : '#1c0c24'
      c.beginPath()
      c.moveTo(VW / 2, -80)
      c.lineTo(VW / 2 + Math.cos(a0) * 400, -80 + Math.sin(a0) * 400)
      c.lineTo(VW / 2 + Math.cos(a0 + 0.13) * 400, -80 + Math.sin(a0 + 0.13) * 400)
      c.fill()
    }
    const beams = ['rgba(248, 200, 48, 0.1)', 'rgba(224, 60, 156, 0.1)', 'rgba(104, 216, 248, 0.1)']
    beams.forEach((col, i) => {
      const sx = 40 + i * 120
      const tx = VW / 2 + Math.sin(t * (0.9 + i * 0.3) + i * 2) * 180
      c.fillStyle = col
      c.beginPath()
      c.moveTo(sx - 4, 0)
      c.lineTo(sx + 4, 0)
      c.lineTo(tx + 30, GROUND_Y)
      c.lineTo(tx - 30, GROUND_Y)
      c.fill()
    })
    bulbs(c, 4, t, 6, ['#f8c830', '#f4f4f4'])
    bulbs(c, 12, t + 0.5, 6, ['#e03c9c', '#f4f4f4'])
    // Grandstands.
    for (let x = 0; x < VW; x += 8) {
      c.fillStyle = (x / 8) % 2 ? '#2c1c3c' : '#3c2450'
      c.fillRect(x, GROUND_Y - 22, 8, 22)
    }
    for (let x = 4; x < VW; x += 10) {
      const bob = Math.floor(t * 3 + x) % 2
      c.fillStyle = ['#d82838', '#2c5ce0', '#f8c830', '#38b848'][(x / 10) % 4 | 0]
      c.fillRect(x, GROUND_Y - 20 - bob, 4, 4)
    }
  },
}

export function drawBackground(c, key, t, scroll = 0) {
  ;(bgs[key] || bgs.menu)(c, t, scroll)
}

// The TADC black-and-white checkered floor. scroll moves it sideways (for treadmill moments).
export function drawFloor(c, scroll = 0) {
  const s = Math.round(scroll)
  const start = -(((s % 8) + 8) % 8)
  for (let x = start; x < VW; x += 8) {
    const k = Math.round((x + s) / 8)
    for (let r = 0; r < 2; r++) {
      c.fillStyle = (((k + r) % 2) + 2) % 2 ? INK : '#f4f4f4'
      c.fillRect(x, GROUND_Y + r * 8, 8, 8)
    }
  }
  c.fillStyle = '#2a1040'
  c.fillRect(0, GROUND_Y + 16, VW, VH - GROUND_Y - 16)
  c.fillStyle = '#3c1c5c'
  const s2 = ((s % 16) + 16) % 16
  for (let x = -s2; x < VW; x += 16) c.fillRect(x + 4, GROUND_Y + 22, 2, 2)
}

export function drawPlatforms(c, platforms) {
  for (const p of platforms) {
    c.fillStyle = INK
    c.fillRect(p.x - 1, p.y - 1, p.w + 2, 10)
    for (let x = 0; x < p.w; x += 4) {
      c.fillStyle = (x / 4) % 2 ? '#f4f4f4' : '#d82838'
      c.fillRect(p.x + x, p.y, Math.min(4, p.w - x), 6)
    }
    c.fillStyle = '#f8c830'
    c.fillRect(p.x, p.y + 6, p.w, 2)
    c.fillStyle = INK
    c.fillRect(p.x + 4, p.y + 9, 2, 4)
    c.fillRect(p.x + p.w - 6, p.y + 9, 2, 4)
  }
}
