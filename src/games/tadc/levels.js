// Level maps. Every level is built from 20-tile-wide chunks and ends with a boss arena.
// '#' ground, '=' circus platform, '*' star, 'g' gloink, 'F' checkpoint flag.

export const TILE = 16
export const VW = 320
export const VH = 176
export const ROWS = 11
export const GROUND_Y = 144
export const ARENA_W = 20 * TILE

const EMPTY = '....................'

function chunk(ground, rows = {}) {
  const out = []
  for (let r = 0; r < 9; r++) out.push(rows[r] || EMPTY)
  out.push(ground, ground)
  return out
}

const FULL = '####################'
const CHUNKS = {
  start: chunk(FULL, { 6: '..........***.......' }),
  pit: chunk('#######...##########', { 6: '.......***..........' }),
  plat: chunk(FULL, {
    4: '...........***......',
    5: '...........===......',
    7: '......===...........',
    8: '.................g..',
  }),
  gap: chunk('#####.........######', { 6: '........***.........', 7: '........===.........' }),
  enemy: chunk(FULL, { 5: '..............**....', 7: '..............##....', 8: '.....g........##..g.' }),
  stairs: chunk('###############..###', {
    3: '.......**...........',
    5: '.......##...........',
    6: '......####......*...',
    7: '.....######.........',
    8: '....########........',
  }),
  hop: chunk('###....###....######', {
    5: '....*.....*.........',
    7: '....=.....=.........',
    8: '................g...',
  }),
  flag: chunk(FULL, { 8: '..F.................' }),
  arena: chunk(FULL, { 7: '...====....====.....' }),
}

export const LEVELS = [
  {
    boss: 'jax',
    title: "Jax's Prank Parlor",
    chunks: ['start', 'plat', 'pit', 'enemy', 'pit', 'flag', 'arena'],
    sky: '#2a1040',
    stripe: '#46184c',
    trim: '#8848c8',
  },
  {
    boss: 'ragatha',
    title: "Ragatha's Sewing Room",
    chunks: ['start', 'enemy', 'gap', 'plat', 'stairs', 'flag', 'arena'],
    sky: '#3c1020',
    stripe: '#5c1828',
    trim: '#2c5ce0',
  },
  {
    boss: 'gangle',
    title: "Gangle's Ribbon Show",
    chunks: ['start', 'pit', 'stairs', 'enemy', 'hop', 'gap', 'flag', 'arena'],
    sky: '#301028',
    stripe: '#4c1838',
    trim: '#d82838',
  },
  {
    boss: 'kinger',
    title: "Kinger's Pillow Fort",
    chunks: ['start', 'gap', 'enemy', 'plat', 'hop', 'stairs', 'enemy', 'flag', 'arena'],
    sky: '#1c1838',
    stripe: '#2c2650',
    trim: '#f8c830',
  },
  {
    boss: 'caine',
    title: 'The Grand Finale',
    chunks: ['start', 'plat', 'gap', 'enemy', 'hop', 'stairs', 'pit', 'gap', 'flag', 'arena'],
    sky: '#140c1c',
    stripe: '#3c1020',
    trim: '#f8c830',
  },
]

export function buildLevel(def) {
  const rows = Array.from({ length: ROWS }, () => '')
  for (const name of def.chunks) {
    const ch = CHUNKS[name]
    ch.forEach((r, i) => {
      if (r.length !== 20) throw new Error(`chunk ${name} row ${i} is ${r.length} wide`)
      rows[i] += r
    })
  }
  const entities = []
  const grid = rows.map((row, r) =>
    [...row]
      .map((ch, col) => {
        if (ch === 'g') entities.push({ type: 'gloink', x: col * TILE + 3, y: (r + 1) * TILE - 9, w: 10, h: 9, vx: -25 })
        else if (ch === '*') entities.push({ type: 'star', x: col * TILE + 4, y: r * TILE + 4, w: 7, h: 7 })
        else if (ch === 'F') entities.push({ type: 'flag', x: col * TILE, y: r * TILE })
        else return ch
        return '.'
      })
      .join(''),
  )
  const cols = grid[0].length
  return {
    grid,
    cols,
    w: cols * TILE,
    arenaX: (cols - 20) * TILE,
    entities,
    tile(col, row) {
      if (row < 0 || row >= ROWS) return '.'
      if (col < 0 || col >= cols) return '#'
      return grid[row][col]
    },
  }
}
