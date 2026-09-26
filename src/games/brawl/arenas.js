// The ten arenas. Each paints a still background once (cached), then animates a few
// details every frame. `gravity` and `slide` change how the fight feels there.
// All drawing is whole-pixel rectangles at the game's small pixel resolution.
import { drawText, textWidth } from './sprites'

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color
  cx = Math.round(cx)
  cy = Math.round(cy)
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy + r * 0.8)))
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1)
  }
}

function line(ctx, x0, y0, x1, y1, color) {
  ctx.fillStyle = color
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= steps; i++) ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), 1, 1)
}

// Dithered gradient bands: the classic pixel-art sky.
function sky(ctx, W, bottom, colors) {
  const h = Math.ceil(bottom / colors.length)
  colors.forEach((c, i) => {
    rect(ctx, 0, i * h, W, h + 1, c)
    if (i > 0) {
      ctx.fillStyle = colors[i - 1]
      for (let x = 0; x < W; x += 2) ctx.fillRect(x, i * h, 1, 1)
      for (let x = 1; x < W; x += 4) ctx.fillRect(x, i * h + 1, 1, 1)
    }
  })
}

function stars(ctx, W, top, bottom, n, color = '#f4f4f4') {
  for (let i = 0; i < n; i++) rect(ctx, (i * 97) % W, top + ((i * 53) % (bottom - top)), 1, 1, i % 7 ? color : '#ffe27a')
}

function floorBands(ctx, W, H, G, colors, edge) {
  const fh = Math.ceil((H - G) / colors.length)
  colors.forEach((c, i) => rect(ctx, 0, G + i * fh, W, fh + 1, c))
  if (edge) rect(ctx, 0, G, W, 1, edge)
}

function perspective(ctx, W, H, G, color, spread = 22) {
  for (let i = -14; i <= 14; i++) line(ctx, W / 2 + i * spread, G + 1, W / 2 + i * spread * 2, H, color)
}

function mountains(ctx, W, G, color, h, freq, off) {
  ctx.fillStyle = color
  for (let x = 0; x < W; x++) {
    const y = Math.round(G - h * (0.55 + 0.3 * Math.sin(x * freq + off) + 0.15 * Math.sin(x * freq * 3.1 + off)))
    ctx.fillRect(x, y, 1, G - y)
  }
}

function tree(ctx, x, G, trunk, leaves, size = 1) {
  rect(ctx, x - 2 * size, G - 34 * size, 4 * size, 34 * size, trunk)
  disc(ctx, x, G - 40 * size, Math.round(12 * size), leaves)
  disc(ctx, x - 9 * size, G - 34 * size, Math.round(8 * size), leaves)
  disc(ctx, x + 9 * size, G - 34 * size, Math.round(8 * size), leaves)
}

function crowdPeople(ctx, W, G, clock, hype, colors, rows = 3, signs = true) {
  for (let row = 0; row < rows; row++) {
    for (let i = 0; i < 28; i++) {
      const x = i * 12 + (row % 2 ? 6 : 0) + 3
      const seed = i * 7 + row * 13
      const color = colors[seed % colors.length]
      const hop = Math.sin(clock * (6 + hype * 6) + seed) > 0.4 - hype * 0.5 ? 1 + Math.round(hype) : 0
      const y = G - 30 + row * 6 - hop
      disc(ctx, x, y, 3, color)
      rect(ctx, x - 4, y + 3, 9, 14, color)
      if ((seed % 4 === 0 && hop) || (hype > 0.5 && seed % 3 === 0)) {
        rect(ctx, x - 5, y - 5, 1, 7, color)
        rect(ctx, x + 5, y - 6, 1, 8, color)
      }
      if (signs && row === rows - 1 && seed % 9 === 0) {
        rect(ctx, x - 5, y - 10 - hop, 11, 6, '#f4f0e0')
        rect(ctx, x - 4, y - 8 - hop, 9, 1, seed % 2 ? '#e0393e' : '#2b7de0')
        rect(ctx, x, y - 4 - hop, 1, 4, '#6a4a2a')
      }
    }
  }
}

export const ARENAS = [
  {
    key: 'jungle',
    name: 'Jungle',
    emoji: '🌴',
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#1a3a2a', '#1f4a30', '#2a5e36', '#3a7a3e', '#5a9a48'])
      for (let i = 0; i < 9; i++) tree(ctx, i * 40 + 10, G - 10, '#2a1a10', i % 2 ? '#1c4a24' : '#245a2a', 1.3)
      // Hanging vines
      for (let i = 0; i < 16; i++) line(ctx, i * 21 + 5, 0, i * 21 + 5 + ((i * 7) % 5) - 2, 20 + ((i * 13) % 30), '#3a8a3a')
      for (let x = 0; x < W; x += 16) disc(ctx, x, 0, 10, '#123a1c')
      floorBands(ctx, W, H, G, ['#5a3a1e', '#4e321a', '#422a16', '#362212', '#2a1a0e'], '#6a9a3a')
      for (let x = 2; x < W; x += 7) rect(ctx, x, G - 2, 1, 3, '#6aaa3a')
      perspective(ctx, W, H, G, '#00000028')
    },
    animate(ctx, W, H, G, clock, hype) {
      crowdPeople(ctx, W, G, clock, hype, ['#1a2a18', '#223a20', '#2a1a14'], 2, false)
      // Fireflies
      for (let i = 0; i < 12; i++) {
        const x = (i * 53 + Math.sin(clock + i) * 10) % W
        const y = 40 + ((i * 37) % 60) + Math.cos(clock * 1.3 + i) * 5
        if (Math.sin(clock * 3 + i * 2) > 0) rect(ctx, x, y, 1, 1, '#e8ff7a')
      }
    },
  },
  {
    key: 'zoo',
    name: 'Zoo',
    emoji: '🦒',
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#4a8ae0', '#5a9ae8', '#6aaaf0', '#8ac0f4', '#a8d4f8'])
      disc(ctx, 40, 30, 10, '#fff4b0')
      for (const [x, y] of [[90, 30], [200, 20], [270, 40]]) {
        disc(ctx, x, y, 6, '#ffffff')
        disc(ctx, x + 8, y + 1, 5, '#ffffff')
        disc(ctx, x - 7, y + 2, 4, '#ffffff')
      }
      tree(ctx, 30, G - 16, '#5a3a1e', '#3a8a3a', 1.2)
      tree(ctx, 290, G - 16, '#5a3a1e', '#4a9a3a', 1.1)
      // Zoo sign on an arch
      rect(ctx, W / 2 - 40, G - 70, 3, 54, '#6a4a2a')
      rect(ctx, W / 2 + 37, G - 70, 3, 54, '#6a4a2a')
      rect(ctx, W / 2 - 32, G - 78, 64, 14, '#2bb673')
      rect(ctx, W / 2 - 30, G - 76, 60, 10, '#1a8a53')
      drawText(ctx, 'ZOO', Math.round(W / 2 - textWidth('ZOO', 2) / 2), G - 76, '#f4f0e0', 2)
      // Cage bars behind the crowd
      rect(ctx, 0, G - 40, W, 2, '#6a6a74')
      for (let x = 0; x < W; x += 6) rect(ctx, x, G - 40, 1, 24, '#6a6a74')
      floorBands(ctx, W, H, G, ['#a8a8b0', '#9a9aa4', '#8c8c96', '#7e7e88', '#70707a'], '#c8c8d0')
      for (let x = 0; x < W; x += 24) line(ctx, x, G, x, H, '#00000022')
      for (let y = G + 6; y < H; y += 7) rect(ctx, 0, y, W, 1, '#00000018')
    },
    animate(ctx, W, H, G, clock, hype) {
      crowdPeople(ctx, W, G, clock, hype, ['#e0393e', '#2b7de0', '#f2b90c', '#2bb673', '#8a3ddb', '#e8e8e8'])
    },
  },
  {
    key: 'beach',
    name: 'Beach',
    emoji: '🏖️',
    paint(ctx, W, H, G) {
      sky(ctx, W, G - 30, ['#3a9ae8', '#5aaaf0', '#7abaf4', '#9acaf8', '#bcdcfa'])
      disc(ctx, 260, 28, 12, '#fff4b0')
      disc(ctx, 260, 28, 9, '#ffe27a')
      // Ocean
      rect(ctx, 0, G - 34, W, 20, '#1a7ac8')
      rect(ctx, 0, G - 34, W, 2, '#8ad0ff')
      // Palm trees
      for (const px of [22, 300]) {
        for (let i = 0; i < 40; i++) rect(ctx, px + Math.round(Math.sin(i / 10) * 4), G - 10 - i, 3, 1, '#8a5a32')
        for (let k = 0; k < 5; k++) {
          const a = -2.6 + k * 0.55
          for (let r = 0; r < 16; r++) rect(ctx, px + 1 + Math.cos(a) * r, G - 50 + Math.sin(a) * r + r * r * 0.03, 2, 2, '#2a8a3a')
        }
      }
      floorBands(ctx, W, H, G - 14, ['#f2d88a', '#ecd07e', '#e4c472', '#dcb866', '#d0aa5a', '#c49c50'], '#fff0c0')
      for (let i = 0; i < 40; i++) rect(ctx, (i * 71) % W, G + ((i * 29) % (H - G)), 1, 1, '#c09848')
    },
    animate(ctx, W, H, G, clock) {
      // Waves roll in
      for (let x = 0; x < W; x += 2) {
        const y = G - 16 + Math.round(Math.sin(x * 0.08 + clock * 2) * 1.5)
        rect(ctx, x, y, 2, 1, '#ffffff')
      }
      for (let i = 0; i < 8; i++) {
        const x = (i * 43 + clock * 8) % W
        rect(ctx, x, G - 28 + (i % 3) * 4, 3, 1, '#8ad0ff')
      }
      // Beach umbrellas instead of a crowd
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * 52
        const c = ['#e0393e', '#2b7de0', '#f2b90c'][i % 3]
        rect(ctx, x, G - 26, 1, 12, '#f4f0e0')
        for (let r = 0; r < 9; r++) rect(ctx, x - 9 + r, G - 26 - Math.round(Math.sqrt(81 - (r - 9) * (r - 9)) / 2), 1, 2, c)
        for (let r = 0; r < 9; r++) rect(ctx, x + r, G - 26 - Math.round(Math.sqrt(81 - r * r) / 2), 1, 2, c)
      }
    },
  },
  {
    key: 'savanna',
    name: 'Savanna',
    emoji: '🦁',
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#140c28', '#28143e', '#3a1a48', '#55204c', '#7a2a4a', '#a33c45', '#cc5a3c', '#e8803a'])
      stars(ctx, W, 26, 60, 50)
      const sunY = G - 46
      for (let dy = -38; dy <= 38; dy++) {
        if (dy > 4 && dy % 7 < 2 + Math.floor(dy / 14)) continue
        const half = Math.round(Math.sqrt(38 * 38 - dy * dy))
        rect(ctx, W / 2 - half, sunY + dy, half * 2, 1, dy < -20 ? '#fff0a0' : dy < -6 ? '#ffd84a' : dy < 10 ? '#f7a82a' : '#f07a2a')
      }
      mountains(ctx, W, G - 20, '#3a1a3a', 28, 0.035, 0)
      // Acacia trees: flat tops
      for (const x of [40, 250]) {
        line(ctx, x, G - 16, x + 3, G - 44, '#1c0f1f')
        line(ctx, x + 1, G - 16, x + 4, G - 44, '#1c0f1f')
        rect(ctx, x - 16, G - 50, 38, 5, '#1c0f1f')
        rect(ctx, x - 12, G - 53, 30, 3, '#1c0f1f')
      }
      rect(ctx, 0, G - 16, W, 2, '#6a3a22')
      for (let x = 4; x < W; x += 24) rect(ctx, x, G - 16, 2, 16, '#4a2a18')
      floorBands(ctx, W, H, G, ['#b07a3a', '#9a6a32', '#86582a', '#724a22', '#5e3c1c'], '#d8a050')
      for (let x = 1; x < W; x += 5) rect(ctx, x, G - 1 - (x % 3), 1, 2 + (x % 3), '#d8b060')
      perspective(ctx, W, H, G, '#00000028')
    },
    animate(ctx, W, H, G, clock, hype) {
      crowdPeople(ctx, W, G, clock, hype, ['#2a1428', '#3a1a3a', '#1c0f1f', '#44203a'])
    },
  },
  {
    key: 'arctic',
    name: 'Arctic',
    emoji: '🧊',
    slide: 0.3,
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#0a1a3a', '#12244a', '#1a3060', '#2a4a7a', '#4a6a9a', '#7a9ac0'])
      stars(ctx, W, 4, 40, 40)
      // Icebergs
      for (const [x, w, h] of [[20, 70, 40], [120, 50, 30], [210, 90, 50]]) {
        const base = G - 18
        for (let i = 0; i < w; i++) {
          const top = base - Math.round(h * Math.sin((i / w) * Math.PI) * (0.8 + 0.2 * Math.sin(i)))
          rect(ctx, x + i, top, 1, base - top, i < w / 3 ? '#e8f4ff' : '#b8d4ec')
        }
      }
      floorBands(ctx, W, H, G, ['#e8f4ff', '#d8ecfa', '#c8e2f4', '#b8d8ee', '#a8cce6'], '#ffffff')
      // Ice shine
      for (let i = 0; i < 12; i++) line(ctx, (i * 37) % W, G + 4 + (i % 4) * 5, ((i * 37) % W) + 8, G + 2 + (i % 4) * 5, '#ffffff')
    },
    animate(ctx, W, H, G, clock, hype) {
      // Aurora ribbons
      for (let x = 0; x < W; x += 2) {
        const y = 22 + Math.round(Math.sin(x * 0.03 + clock * 0.8) * 6)
        rect(ctx, x, y, 2, 3, x % 6 ? '#2be07d55' : '#7a3de055')
      }
      crowdPeople(ctx, W, G, clock, hype, ['#1a1a2a', '#2a2a3a', '#f4f4f4'], 2, false)
      // Snow
      for (let i = 0; i < 50; i++) {
        const x = (i * 47 + Math.sin(clock + i) * 6 + clock * 6) % W
        const y = (i * 29 + clock * 22) % H
        rect(ctx, x, y, 1, 1, '#ffffff')
      }
    },
  },
  {
    key: 'city',
    name: 'City',
    emoji: '🏙️',
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#0a0a1a', '#10102a', '#1a1a3a', '#2a1a4a', '#3a1a4a'])
      stars(ctx, W, 4, 40, 25)
      disc(ctx, 50, 26, 8, '#f4f0d0')
      disc(ctx, 53, 24, 7, '#10102a')
      const buildings = [[0, 30, 90], [32, 26, 70], [60, 36, 110], [98, 24, 80], [124, 40, 120], [166, 28, 90], [196, 34, 105], [232, 26, 75], [260, 30, 100], [292, 28, 85]]
      for (const [x, w, h] of buildings) {
        rect(ctx, x, G - 16 - h, w, h, '#1c1c30')
        rect(ctx, x, G - 16 - h, 1, h, '#2a2a44')
      }
      // Billboard
      rect(ctx, 130, G - 128, 60, 20, '#e0393e')
      rect(ctx, 132, G - 126, 56, 16, '#1a0a1a')
      rect(ctx, 0, G - 16, W, 2, '#3a3a52')
      floorBands(ctx, W, H, G, ['#3a3a44', '#34343e', '#2e2e38', '#282832', '#22222c'], '#5a5a66')
      for (let x = 0; x < W; x += 20) rect(ctx, x, G + 10, 10, 1, '#f2c40c')
    },
    animate(ctx, W, H, G, clock, hype) {
      // Lit windows twinkle on and off
      const buildings = [[0, 30, 90], [32, 26, 70], [60, 36, 110], [98, 24, 80], [124, 40, 120], [166, 28, 90], [196, 34, 105], [232, 26, 75], [260, 30, 100], [292, 28, 85]]
      buildings.forEach(([x, w, h], b) => {
        for (let yy = G - 12 - h; yy < G - 22; yy += 6) {
          for (let xx = x + 3; xx < x + w - 3; xx += 5) {
            const on = Math.sin(xx * 12.9 + yy * 7.3 + Math.floor(clock * 0.5 + b)) > 0.1
            if (on) rect(ctx, xx, yy, 2, 3, '#ffd84a')
          }
        }
      })
      // Billboard text scrolls
      const t = Math.floor(clock * 20) % 80
      for (let i = 0; i < 6; i++) rect(ctx, 134 + ((t + i * 14) % 52), G - 120, 6, 4, '#2bd673')
      crowdPeople(ctx, W, G, clock, hype, ['#e0339c', '#2b9ce0', '#f2b90c', '#2bd673', '#1c1c30'])
    },
  },
  {
    key: 'farm',
    name: 'Farm',
    emoji: '🚜',
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#5aa0e8', '#6aaef0', '#7abcf4', '#9accf6', '#bcdcf8'])
      // Rolling hills
      mountains(ctx, W, G - 16, '#5aaa4a', 24, 0.02, 1)
      mountains(ctx, W, G - 16, '#4a9a3a', 14, 0.03, 3)
      // Red barn
      const bx = 220
      rect(ctx, bx, G - 70, 60, 54, '#c0302a')
      for (let i = 0; i < 18; i++) rect(ctx, bx - 4 + i * 2, G - 70 - i, 68 - i * 4, 1, '#a02820')
      rect(ctx, bx + 22, G - 44, 16, 28, '#f4f0e0')
      line(ctx, bx + 22, G - 44, bx + 38, G - 16, '#c0302a')
      line(ctx, bx + 38, G - 44, bx + 22, G - 16, '#c0302a')
      // Silo
      rect(ctx, 290, G - 84, 18, 68, '#b8b8c0')
      disc(ctx, 299, G - 84, 9, '#9a9aa4')
      // Hay bales + fence
      for (const x of [40, 70]) {
        rect(ctx, x, G - 30, 22, 14, '#e8c060')
        rect(ctx, x, G - 26, 22, 1, '#c09840')
      }
      rect(ctx, 0, G - 26, W, 2, '#f4f0e0')
      rect(ctx, 0, G - 20, W, 2, '#f4f0e0')
      for (let x = 2; x < W; x += 16) rect(ctx, x, G - 30, 3, 14, '#e8e0d0')
      floorBands(ctx, W, H, G, ['#6ab04a', '#5ea442', '#52983a', '#468c32', '#3a802a'], '#8ac85a')
      for (let x = 1; x < W; x += 4) rect(ctx, x, G - 1 - (x % 2), 1, 2, '#9ad86a')
    },
    animate(ctx, W, H, G, clock, hype) {
      for (let i = 0; i < 4; i++) {
        const x = ((i * 90 + clock * 6) % (W + 40)) - 20
        const y = 18 + i * 9
        disc(ctx, x, y, 5, '#ffffff')
        disc(ctx, x + 7, y + 1, 4, '#ffffff')
        disc(ctx, x - 6, y + 2, 3, '#ffffff')
      }
      crowdPeople(ctx, W, G, clock, hype, ['#8a5a32', '#f4f0e0', '#e8c060', '#c0302a'], 1, true)
    },
  },
  {
    key: 'volcano',
    name: 'Volcano',
    emoji: '🌋',
    paint(ctx, W, H, G) {
      sky(ctx, W, G, ['#1a0808', '#2a0c0c', '#3a1010', '#5a1a10', '#7a2a10'])
      // The volcano
      for (let i = 0; i < 180; i++) {
        const x = 70 + i
        const top = G - 16 - Math.round(90 - Math.abs(i - 90) * 0.95)
        rect(ctx, x, Math.max(top, G - 100), 1, G - 16 - Math.max(top, G - 100), '#2a1414')
      }
      rect(ctx, 150, G - 102, 20, 4, '#ff6a1a')
      for (let i = 0; i < 30; i++) rect(ctx, 152 + (i % 16), G - 100 + i * 2, 2, 2, i % 2 ? '#ff6a1a' : '#f7a82a')
      floorBands(ctx, W, H, G, ['#3a2a2a', '#342424', '#2e1e1e', '#281818', '#221212'], '#5a3a2a')
    },
    animate(ctx, W, H, G, clock, hype) {
      // Glowing cracks in the rock floor
      for (let i = 0; i < 9; i++) {
        const x = i * 37 + 10
        const glow = Math.sin(clock * 2 + i) > 0 ? '#ff6a1a' : '#c0401a'
        line(ctx, x, G + 3, x + 7, G + 10, glow)
        line(ctx, x + 7, G + 10, x + 3, G + 18, glow)
      }
      // Embers rising
      for (let i = 0; i < 30; i++) {
        const x = (i * 41 + Math.sin(clock + i) * 5) % W
        const y = H - ((i * 23 + clock * 30) % H)
        rect(ctx, x, y, 1, 1, i % 3 ? '#ff8a2a' : '#ffe27a')
      }
      crowdPeople(ctx, W, G, clock, hype, ['#1a0a0a', '#2a1010', '#3a1414'], 2, false)
    },
  },
  {
    key: 'moon',
    name: 'Moon',
    emoji: '🌙',
    gravity: 0.55,
    paint(ctx, W, H, G) {
      rect(ctx, 0, 0, W, G, '#05050c')
      stars(ctx, W, 2, G - 20, 120)
      // Earth in the sky
      disc(ctx, 250, 38, 16, '#2b7de0')
      disc(ctx, 245, 33, 6, '#2bb673')
      disc(ctx, 256, 44, 5, '#2bb673')
      disc(ctx, 250, 30, 3, '#ffffff')
      mountains(ctx, W, G, '#5a5a66', 18, 0.05, 2)
      floorBands(ctx, W, H, G, ['#9a9aa4', '#8e8e98', '#82828c', '#767680', '#6a6a74'], '#c8c8d0')
      for (const [x, y, r] of [[40, G + 8, 6], [120, G + 14, 4], [200, G + 6, 7], [280, G + 16, 5], [160, G + 4, 3]]) {
        disc(ctx, x, y, r, '#6a6a74')
        disc(ctx, x + 1, y + 1, r - 1, '#86868f')
      }
      // A little flag
      rect(ctx, 30, G - 26, 1, 26, '#e8e8e8')
      rect(ctx, 31, G - 26, 10, 6, '#e0393e')
    },
    animate(ctx, W, H, G, clock, hype) {
      // A few little green aliens came to watch
      for (let i = 0; i < 5; i++) {
        const x = 70 + i * 50
        const hop = Math.sin(clock * (4 + hype * 6) + i) > 0.5 - hype ? 2 : 0
        const y = G - 12 - hop
        rect(ctx, x - 3, y, 6, 8, '#5ae05a')
        disc(ctx, x, y - 3, 4, '#5ae05a')
        rect(ctx, x - 2, y - 4, 1, 2, '#05050c')
        rect(ctx, x + 1, y - 4, 1, 2, '#05050c')
        rect(ctx, x - 3, y - 10, 1, 4, '#5ae05a')
        rect(ctx, x + 2, y - 10, 1, 4, '#5ae05a')
      }
    },
  },
  {
    key: 'kitchen',
    name: 'The Giant Kitchen',
    emoji: '🍳',
    paint(ctx, W, H, G) {
      // Checkered wall tiles
      for (let y = 0; y < G; y += 10) for (let x = 0; x < W; x += 10) rect(ctx, x, y, 10, 10, (x + y) % 20 ? '#f4f0e8' : '#dce8f0')
      // Giant cupboards
      rect(ctx, 0, 0, W, 34, '#c08a52')
      for (let x = 4; x < W; x += 64) {
        rect(ctx, x, 3, 58, 28, '#a8743e')
        rect(ctx, x + 26, 16, 6, 2, '#e8c060')
      }
      // A giant toaster, salt shaker and cereal box in the back
      rect(ctx, 30, G - 60, 50, 44, '#b8b8c4')
      rect(ctx, 34, G - 64, 16, 4, '#6a6a74')
      rect(ctx, 58, G - 64, 16, 4, '#6a6a74')
      rect(ctx, 30, G - 60, 50, 3, '#e8e8f0')
      rect(ctx, 240, G - 90, 44, 74, '#e0393e')
      rect(ctx, 246, G - 80, 32, 20, '#f2c40c')
      rect(ctx, 250, G - 50, 24, 24, '#f4f0e0')
      disc(ctx, 262, G - 38, 8, '#8a5a32')
      rect(ctx, 300, G - 54, 14, 38, '#f4f4f4')
      disc(ctx, 307, G - 56, 7, '#b8b8c4')
      // Stove pot
      rect(ctx, 130, G - 40, 60, 24, '#4a4a55')
      rect(ctx, 126, G - 42, 68, 4, '#6a6a74')
      // Countertop floor (a giant cutting board)
      floorBands(ctx, W, H, G, ['#d8a870', '#cc9c64', '#c09058', '#b4844c', '#a87840'], '#e8c090')
      for (let y = G + 4; y < H; y += 5) rect(ctx, 0, y, W, 1, '#00000014')
    },
    animate(ctx, W, H, G, clock) {
      // Steam from the pot
      for (let i = 0; i < 10; i++) {
        const y = G - 44 - ((clock * 18 + i * 9) % 60)
        const x = 140 + (i % 5) * 10 + Math.sin(clock * 2 + i) * 3
        rect(ctx, x, y, 2, 2, '#ffffffaa')
      }
      // A tiny mouse audience peeks out from behind the toaster
      for (let i = 0; i < 3; i++) {
        const x = 90 + i * 12
        const up = Math.sin(clock * 3 + i) > 0.3 ? 2 : 0
        disc(ctx, x, G - 20 - up, 3, '#9a9aa4')
        disc(ctx, x - 3, G - 24 - up, 2, '#9a9aa4')
        disc(ctx, x + 3, G - 24 - up, 2, '#9a9aa4')
        rect(ctx, x - 1, G - 21 - up, 1, 1, '#140c1c')
        rect(ctx, x + 1, G - 21 - up, 1, 1, '#140c1c')
      }
    },
  },
]

export const arenaByKey = (key) => ARENAS.find((a) => a.key === key) ?? ARENAS[0]

const cache = new Map()
export function arenaBackground(key, W, H, G) {
  if (cache.has(key)) return cache.get(key)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  arenaByKey(key).paint(ctx, W, H, G)
  cache.set(key, c)
  return c
}
