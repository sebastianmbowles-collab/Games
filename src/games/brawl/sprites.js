// Hand-drawn 16x16 pixel-art heads, projectiles and a tiny pixel font.
// Each sprite is rows of characters; each character is a palette color and '.' is see-through.
// Front-facing heads are drawn as the left half only and mirrored, so they stay symmetric.

const OUTLINE = '#140c1c'
const EYE = '#140c1c'
const WHITE = '#f4f4f4'

function mirror(rows) {
  return rows.map((r) => r + [...r].reverse().join(''))
}

export const HEADS = {
  hitopotamus: {
    pal: { o: OUTLINE, a: '#8d7aa8', c: '#5e4d78', p: '#e08aa8', b: '#c4a6c9', w: WHITE, e: EYE },
    rows: mirror([
      '..oo....',
      '.opco...',
      '.occaooo',
      '..oaaaaa',
      '.oaaaaaa',
      '.oawwaaa',
      '.oaweaaa',
      '.oaaaaaa',
      'oabbbbbb',
      'obbbbbbb',
      'obbcbbbb',
      'obbbbbbb',
      'obbwbbbb',
      '.obbbbbb',
      '..oobbbb',
      '....oooo',
    ]),
  },
  geckow: {
    pal: { o: OUTLINE, a: '#5cc24a', c: '#3a8a30', b: '#b8e070', w: WHITE, e: EYE },
    rows: mirror([
      '........',
      '........',
      '..ooo...',
      '.owwwo..',
      '.oweeooo',
      '.owwwaaa',
      '..oaaaca',
      '.oaacaaa',
      '.oaaaaaa',
      '.oaaaaac',
      '.oaaaaaa',
      '.ooooooo',
      '.obbbbbb',
      '..obbbbb',
      '...ooooo',
      '........',
    ]),
  },
  pandamonium: {
    pal: { o: OUTLINE, k: '#222230', w: WHITE, g: '#c9c9d4' },
    rows: mirror([
      '.ooo....',
      'okkko...',
      'okkkoooo',
      '.okowwww',
      '..owwwww',
      '.owwwwww',
      '.owkkkww',
      '.owkwkww',
      '.owkkkww',
      '.owwwwww',
      '.owwwwkk',
      '.owwwwwk',
      '..owgwww',
      '...owwww',
      '....oooo',
      '........',
    ]),
  },
  crocadial: {
    pal: { o: OUTLINE, a: '#3f8a4a', c: '#2a5e32', b: '#c8d890', w: WHITE, y: '#f2d23a', e: EYE },
    rows: [
      '................',
      '..ooo...........',
      '.oyeo...........',
      '.oaaooooooooo...',
      'oaaaacaacaacaoo.',
      'oaaaaaaaaaaaaaao',
      'oaaaaaaaaaaaaaco',
      'oaaaaowowowowowo',
      'oaaaaobbbbbbbbbo',
      'oaaaaowowowowoo.',
      'oaaaaooooooooo..',
      '.oaaaao.........',
      '.ocaaao.........',
      '.oaaaco.........',
      '..oaao..........',
      '..oooo..........',
    ],
  },
  lionheart: {
    pal: { o: OUTLINE, m: '#b8582a', a: '#f2b43a', b: '#fbe0a0', p: '#7a3a1a', e: EYE },
    rows: mirror([
      '...mmmmm',
      '..mmmmmm',
      '.mmmoooo',
      'mmmoaaaa',
      'mmoaaaaa',
      'mmoaeaaa',
      'mmoaeaaa',
      'mmoaaaaa',
      'mmoaaabb',
      'mmoaabbp',
      '.mmoabbb',
      '.mmmobbo',
      '..mmmobb',
      '...mmmoo',
      '....mmmm',
      '........',
    ]),
  },
  bearknuckle: {
    pal: { o: OUTLINE, a: '#8a5a32', c: '#5a3818', b: '#d8b080', k: '#2a1a0d', e: EYE },
    rows: mirror([
      '........',
      '.ooo....',
      'oacao...',
      'oaaaoooo',
      '.oaaaaaa',
      '.oaaaaaa',
      'oaaeaaaa',
      'oaaeaaaa',
      'oaaaaaaa',
      'oaaaabbb',
      'oaaabbbk',
      'oaaabbbb',
      '.oaabbbo',
      '.oaaabbb',
      '..ooaaaa',
      '....oooo',
    ]),
  },
  beestmode: {
    pal: { o: OUTLINE, y: '#f2c40c', k: '#222230', w: '#bfe4ff', e: EYE },
    rows: mirror([
      '...o....',
      '....o...',
      'ww...o..',
      'wwwooooo',
      'wwoyyyyy',
      '.oyyyyyy',
      '.oyeeyyy',
      '.oeeeyyy',
      '.oeeeyyy',
      '.oyeyyyy',
      '.okkkkkk',
      '.oyyyyyy',
      '..oyyyyk',
      '..okkkkk',
      '...ooooo',
      '........',
    ]),
  },
  kickahorse: {
    pal: { o: OUTLINE, a: '#a86a3d', m: '#3a2010', b: '#d8a878', e: EYE, n: '#4a2a14' },
    rows: [
      '....oo..........',
      '...oaao.........',
      '..mmaaooooo.....',
      '.mmmaaaaaaao....',
      '.mmaaaaaeaaoo...',
      'mmmaaaaaaaaaaoo.',
      'mmaaaaaaaaaaaaao',
      'mmaaaaaaaaaabbbo',
      'mmaaaaaaoobbbnbo',
      'mmaaaaao..obbbbo',
      'mmaaaao....oooo.',
      '.maaaao.........',
      '.mmaaao.........',
      '..maaao.........',
      '..oaaao.........',
      '..ooooo.........',
    ],
  },
  sharkitecture: {
    pal: { o: OUTLINE, a: '#5a8ab8', c: '#3a5e88', b: '#e8eef4', w: WHITE, e: EYE },
    rows: [
      '.....oo.........',
      '.....oao........',
      '....oaaco.......',
      '...oaaaaaoooo...',
      '..oaaaaaaaaaaoo.',
      '.oaaaaaaaaaeaaao',
      '.oaaaaaaaaaaaaao',
      'oaaaaaaaaaaaaooo',
      'oaaaaaaabbowwwo.',
      'oaaaaaabbbbbbbbo',
      'oaaaaabbbbwwwwbo',
      '.oaaaabbbbbbbbo.',
      '.oaaaabbbboooo..',
      '..oaaabbbo......',
      '..oaaaaao.......',
      '..ooooooo.......',
    ],
  },
  duckandcover: {
    pal: { o: OUTLINE, g: '#2a8a4a', w: WHITE, y: '#f29a1a', a: '#8a5a32', e: EYE },
    rows: [
      '................',
      '.....oooo.......',
      '....oggggo......',
      '...oggggggo.....',
      '...ogggggeo.....',
      '...oggggggooooo.',
      '...ogggggoyyyyyo',
      '...oggggggoyyyo.',
      '....ogggggoooo..',
      '....ogggggo.....',
      '....owwwwwo.....',
      '....oaaaaao.....',
      '...oaaaaaaao....',
      '...oaaaaaaao....',
      '....oaaaaao.....',
      '.....ooooo......',
    ],
  },
  hissterical: {
    pal: { o: OUTLINE, a: '#4aa84a', c: '#2e7a2e', b: '#e0d070', r: '#e0393e', e: EYE, w: WHITE },
    rows: [
      '................',
      '................',
      '.....oooooooo...',
      '....oaaaaaaaaoo.',
      '...oacaaaaweaaao',
      '...oaaaaaaaaaaao',
      '...oaacaaaaaaaao',
      '...oaaaaaooooooo',
      '...oaabbbbbbbo.r',
      '...oaaabbbbbbrr.',
      '...oaaaoooooo..r',
      '....oaaao.......',
      '....ocaao.......',
      '....oaaco.......',
      '....oaaao.......',
      '....ooooo.......',
    ],
  },
  crabbat: {
    pal: { o: OUTLINE, r: '#e0503a', d: '#a02a1a', w: WHITE, e: EYE },
    rows: mirror([
      '.oo..oo.',
      'orro.oeo',
      'or.ro.o.',
      'orrro.o.',
      '.oro..o.',
      '..oro.o.',
      '...orooo',
      '...orrrr',
      '..orrrrr',
      '.orrrdrr',
      '.orrrrrr',
      '.orrrroo',
      '.orrrrrr',
      '..orrrrr',
      '...ooooo',
      '........',
    ]),
  },
  octopunch: {
    pal: { o: OUTLINE, p: '#d0508a', d: '#9a2a60', w: WHITE, e: EYE },
    rows: mirror([
      '....oooo',
      '..oopppp',
      '.opppppp',
      '.opdpppp',
      'oppppppp',
      'oppwwppp',
      'oppweppp',
      'oppppppp',
      'opppppoo',
      '.opppppp',
      'opopopdp',
      'opopopop',
      'opopopop',
      'o.opo.op',
      '..o.o.o.',
      '........',
    ]),
  },
  gorillawarfare: {
    pal: { o: OUTLINE, a: '#4a4a55', b: '#8a8078', c: '#2a2a30', e: EYE },
    rows: mirror([
      '........',
      '...ooooo',
      '..oaaaaa',
      '.oaaaaaa',
      '.oaaaaaa',
      'oaoooooo',
      'oaobbbbb',
      'oaobebbb',
      'oaobbbbb',
      '.oabbbbb',
      '.obbbbbc',
      '.obbbbbb',
      '.obbcccc',
      '..obbbbb',
      '...ooooo',
      '........',
    ]),
  },
  goatnglory: {
    pal: { o: OUTLINE, h: '#8a6a48', w: '#efe6d0', p: '#e8a0a0', b: '#cfc0a0', e: EYE },
    rows: mirror([
      '.hh.....',
      'h..h....',
      'h...hooo',
      '.oppowww',
      '..oowwww',
      '...owwww',
      '...oewww',
      '...owwww',
      '...owwww',
      '....owww',
      '....owwp',
      '....owww',
      '.....obb',
      '.....obb',
      '......ob',
      '.......o',
    ]),
  },
  wolfpack: {
    pal: { o: OUTLINE, a: '#7a8494', c: '#4a5260', b: '#d4d8e0', y: '#f2d23a', k: '#1a1a22' },
    rows: mirror([
      '.o......',
      '.oo.....',
      '.oco....',
      '.occoooo',
      '.oaaaaaa',
      'oaaaaaaa',
      'oaayyaaa',
      'oaaaaaab',
      'oaaaaabb',
      '.oaaabbb',
      '.oaabbbk',
      '..oabbbb',
      '...obbbo',
      '....obbb',
      '.....ooo',
      '........',
    ]),
  },
  rhinomite: {
    pal: { o: OUTLINE, a: '#8f8f9c', c: '#62626e', h: '#efe6d0', p: '#c9a0a8', e: EYE },
    rows: [
      '...oo...........',
      '..opo...........',
      '..oao.......o...',
      '.oaaooooo..oho..',
      '.oaaaaaaaoohho..',
      'oaaaaaaeaaohhho.',
      'oaaaaaaaaaaohhho',
      'oaacaaaaaaaaaoo.',
      'oaaaaaaaaaaaaao.',
      'oaaaaaaaaaacaao.',
      'oaacaaaaaooooo..',
      '.oaaaaaao.......',
      '.oaaaaaao.......',
      '..oaacaao.......',
      '..oaaaaao.......',
      '..ooooooo.......',
    ],
  },
  frogment: {
    pal: { o: OUTLINE, a: '#6cc24a', b: '#c8f0a0', w: WHITE, e: EYE, r: '#e0393e' },
    rows: mirror([
      '........',
      '.oooo...',
      'owwwwo..',
      'owweewoo',
      'owweewaa',
      '.owwwoaa',
      '.oaaaaaa',
      'oaaaaaaa',
      'oaaaaaaa',
      'oaaaaaaa',
      'ooaaaaaa',
      'oboooooo',
      '.obbbbbb',
      '..obbbbb',
      '...ooooo',
      '........',
    ]),
  },
}

// Projectiles, drawn facing right.
export const PROJECTILES = {
  fire: {
    pal: { o: '#7a1a0a', r: '#e0393e', y: '#f2c40c', w: '#fff4b0' },
    rows: ['....oooo....', '..oorrrroo..', '.orryyyyrro.', 'orryywwyyrro', 'orryywwwyyro', 'orryywwyyrro', '.orryyyyrro.', '..oorrrroo..', '....oooo....'],
  },
  bolt: {
    pal: { o: '#3a2a00', y: '#f2e60c', w: '#ffffff' },
    rows: ['.....oo', '....oyo', '...oyo.', '..oywooo', '.oyyyyyo', 'ooowyo..', '..oyo...', '.oyo....', '.oo.....'],
  },
  wave: {
    pal: { o: '#0a2a5a', b: '#2b7de0', l: '#8fd0ff', w: '#ffffff' },
    rows: ['......oooo..', '....oowwllo.', '...olllooblo', '..olbbo..obo', '.olbbbo...o.', 'olbbbbbo....', 'obbbbbbbooo.', 'obbbbbbbbbbo', 'oooooooooooo'],
  },
  egg: {
    pal: { o: OUTLINE, w: '#f4f0e0', s: '#c9c0a8' },
    rows: ['..oooo..', '.owwwwo.', 'owwwwwwo', 'owwwwwwo', 'owwwwwso', 'owwwwsso', '.owssso.', '..oooo..'],
  },
  venom: {
    pal: { o: '#0a3a0a', g: '#4ae04a', l: '#b0ffb0' },
    rows: ['..ooo...', '.ogggoo.', 'oglgggoo', 'ogggggggo', 'oggggggo', '.ogggoo.', '..ooo...'],
  },
  ink: {
    pal: { o: '#000000', k: '#2a1a3a', l: '#6a5a8a' },
    rows: ['..oooo..', '.okkkko.', 'oklkkkko', 'okkkkkko', 'okkkkkko', 'okkkkkko', '.okkkko.', '..oooo..'],
  },
}

// 3x5 pixel font (M, N, W and a few others are 5 wide).
const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'],
  '!': ['#', '#', '#', '.', '#'],
  '.': ['.', '.', '.', '.', '#'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  "'": ['#', '#', '.', '.', '.'],
  '*': ['.#.', '###', '.#.', '#.#', '...'],
  ' ': ['..', '..', '..', '..', '..'],
}

export function textWidth(text, scale = 1) {
  let w = 0
  for (const ch of text.toUpperCase()) w += ((GLYPHS[ch] || GLYPHS[' '])[0].length + 1) * scale
  return Math.max(0, w - scale)
}

export function drawText(ctx, text, x, y, color, scale = 1, outline = null) {
  const draw = (ox, oy, c) => {
    ctx.fillStyle = c
    let cx = x + ox
    for (const ch of text.toUpperCase()) {
      const g = GLYPHS[ch] || GLYPHS[' ']
      for (let r = 0; r < 5; r++)
        for (let col = 0; col < g[r].length; col++)
          if (g[r][col] === '#') ctx.fillRect(cx + col * scale, y + oy + r * scale, scale, scale)
      cx += (g[0].length + 1) * scale
    }
  }
  if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) draw(ox * scale, oy * scale, outline)
  draw(0, 0, color)
}

// Pre-render a sprite into its own little canvas once, then reuse it.
const cache = new Map()
export function spriteCanvas(def) {
  if (cache.has(def)) return cache.get(def)
  const h = def.rows.length
  const w = Math.max(...def.rows.map((r) => r.length))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  def.rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      const color = def.pal[ch]
      if (!color) return
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    })
  })
  cache.set(def, c)
  return c
}
