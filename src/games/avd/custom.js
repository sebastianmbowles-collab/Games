// Everything you can customise on your profile: favourite colour, hat, title, UFO paint and T. rex paint.

export const COLOURS = [
  { id: 'yellow', name: 'YELLOW', hex: '#fee761' },
  { id: 'green', name: 'GREEN', hex: '#63c74d' },
  { id: 'blue', name: 'BLUE', hex: '#0099db' },
  { id: 'cyan', name: 'SKY BLUE', hex: '#2ce8f5' },
  { id: 'pink', name: 'PINK', hex: '#f6757a' },
  { id: 'purple', name: 'PURPLE', hex: '#b55088' },
  { id: 'orange', name: 'ORANGE', hex: '#f77622' },
  { id: 'red', name: 'RED', hex: '#e43b44' },
]

// Hats are tiny pixel pictures: each letter is one pixel of that colour, '.' is see-through.
const HAT_INK = { y: '#fee761', r: '#e43b44', w: '#ffffff', p: '#f6757a', b: '#0099db', k: '#3e2731', u: '#b55088', g: '#63c74d' }
export const HATS = [
  { id: 'none', name: 'NO HAT', rows: [] },
  { id: 'crown', name: 'CROWN', rows: ['y.y.y.y', 'yyyyyyy', 'yryyyry', 'yyyyyyy'] },
  { id: 'party', name: 'PARTY HAT', rows: ['..w..', '..p..', '.pyp.', '.ppp.', 'pypyp', 'ppppp'] },
  { id: 'cap', name: 'CAP', rows: ['.bbbb...', 'bbwbbb..', 'bbbbbbbb'] },
  { id: 'tophat', name: 'TOP HAT', rows: ['.kkkkk.', '.kkkkk.', '.kkkkk.', '.rrrrr.', 'kkkkkkk'] },
  { id: 'bow', name: 'BOW', rows: ['pp...pp', 'ppprppp', 'pp...pp'] },
  { id: 'halo', name: 'HALO', rows: ['.yyyyy.', 'y.....y', '.yyyyy.'] },
  { id: 'wizard', name: 'WIZARD HAT', rows: ['...u...', '..uuu..', '..uyu..', '.uuuuu.', 'uuuuuuu'] },
]

export const TITLES = [
  { id: 'none', name: 'NO TITLE' },
  { id: 'dinofan', name: 'DINO FAN' },
  { id: 'spaceace', name: 'SPACE ACE' },
  { id: 'mathwhiz', name: 'MATH WHIZ' },
  { id: 'spellstar', name: 'SPELLING STAR' },
  { id: 'roarboss', name: 'ROAR BOSS' },
  { id: 'ufopilot', name: 'UFO PILOT' },
  { id: 'egghunter', name: 'EGG HUNTER' },
  { id: 'nightowl', name: 'NIGHT OWL' },
  { id: 'volcano', name: 'VOLCANO HERO' },
  { id: 'fossil', name: 'FOSSIL FINDER' },
  { id: 'star', name: 'SUPERSTAR' },
]

export const UFO_PAINTS = [
  { id: 'silver', name: 'SILVER' },
  { id: 'blue', name: 'BLUE' },
  { id: 'green', name: 'GREEN' },
  { id: 'pink', name: 'PINK' },
  { id: 'purple', name: 'PURPLE' },
  { id: 'black', name: 'MIDNIGHT' },
]

export const REX_PAINTS = [
  { id: 'green', name: 'GREEN' },
  { id: 'blue', name: 'BLUE' },
  { id: 'orange', name: 'ORANGE' },
  { id: 'purple', name: 'PURPLE' },
  { id: 'pink', name: 'PINK' },
  { id: 'red', name: 'RED' },
]

// Only ever use a value that's really in the list (names from another player's game get checked too).
export const choice = (list, id) => (list.some((x) => x.id === id) ? id : list[0].id)
export const colourOf = (p) => COLOURS.find((c) => c.id === p?.color)?.hex || COLOURS[0].hex
export const titleOf = (p) => {
  const t = TITLES.find((x) => x.id === p?.title)
  return t && t.id !== 'none' ? t.name : ''
}

// Draws a hat so its brim sits at (x, bottom). u is the size of one hat pixel.
export function drawHat(ctx, hat, x, bottom, u) {
  const h = HATS.find((x2) => x2.id === hat)
  if (!h || !h.rows.length) return
  const w = Math.max(...h.rows.map((r) => r.length))
  const left = Math.round(x - (w * u) / 2)
  const top = Math.round(bottom - h.rows.length * u)
  h.rows.forEach((row, j) => {
    ;[...row].forEach((c, i) => {
      if (c === '.') return
      // a dark outline pixel behind each hat pixel keeps hats readable on any background
      ctx.fillStyle = '#181425'
      ctx.fillRect(left + i * u - 2, top + j * u - 2, u + 4, u + 4)
    })
  })
  h.rows.forEach((row, j) => {
    ;[...row].forEach((c, i) => {
      if (c === '.') return
      ctx.fillStyle = HAT_INK[c]
      ctx.fillRect(left + i * u, top + j * u, u, u)
    })
  })
}
