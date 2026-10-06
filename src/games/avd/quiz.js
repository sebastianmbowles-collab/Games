// The brain-power part of the game: math problems refuel the UFO, and spelling dino words
// gives the T. rex more roars. Each quiz pops up in a panel at the top of the screen.

import { W, INK, rrect, text } from './art'

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const shuffle = (arr) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- math ----------

// Problems follow the Australian school years:
// Prep: tiny adding and taking away. Year 1: adding and subtracting. Year 2: adding, subtracting and a
// little bit of times. Year 3: adding, subtracting, times and some dividing. Year 4: all four.
// Year 5: times and dividing. Year 6: all of them, with bigger numbers. Year 7+: all of them, even bigger.
const YEAR_MATH = {
  0: { ops: ['+', '-'], max: 5 },
  1: { ops: ['+', '-'], max: 10 },
  2: { ops: ['+', '+', '-', '-', '×'], max: 25, tables: [2, 5, 10], upTo: 5 },
  3: { ops: ['+', '-', '×', '×', '÷'], max: 50, tables: [2, 3, 4, 5, 10], upTo: 10 },
  4: { ops: ['+', '-', '×', '×', '÷', '÷'], max: 100, tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], upTo: 10 },
  5: { ops: ['×', '÷'], tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], upTo: 12 },
  6: { ops: ['+', '-', '×', '÷', 'big×'], max: 500, tables: [3, 4, 6, 7, 8, 9, 11, 12], upTo: 12 },
  7: { ops: ['+', '-', '×', '÷', 'big×', 'big×'], max: 2000, tables: [6, 7, 8, 9, 11, 12], upTo: 12, big: 99 },
}

function mathProblem(year) {
  const m = YEAR_MATH[year] ?? YEAR_MATH[3]
  const op = pick(m.ops)
  let a
  let b
  let answer
  if (op === '+') {
    a = randInt(1, m.max)
    b = randInt(1, m.max)
    answer = a + b
  } else if (op === '-') {
    a = randInt(2, m.max * 2)
    b = randInt(1, a)
    answer = a - b
  } else if (op === '×') {
    a = pick(m.tables)
    b = randInt(1, m.upTo)
    answer = a * b
  } else if (op === 'big×') {
    a = randInt(12, m.big || 49)
    b = randInt(3, 9)
    answer = a * b
    return { q: `${a} × ${b} = ?`, answer }
  } else {
    b = pick(m.tables)
    answer = randInt(1, m.upTo)
    a = b * answer
  }
  return { q: `${a} ${op} ${b} = ?`, answer }
}

export function makeMath(year) {
  const { q, answer } = mathProblem(year)
  const wrong = new Set()
  while (wrong.size < 3) {
    const w = answer + pick([-10, -2, -1, 1, 2, 10, randInt(-5, 5)])
    if (w !== answer && w >= 0) wrong.add(w)
  }
  return { type: 'math', q, answer, choices: shuffle([answer, ...wrong]), shake: 0, flash: -1, t: 0 }
}

// ---------- spelling ----------

const WORDS = [
  // short words (easy)
  ['EGG', 'Baby dinos hatch out of an...'],
  ['REX', 'T. ___ is the king of the dinos'],
  ['ROAR', 'The loud noise a T. rex makes'],
  ['CLAW', 'A sharp nail on a raptor foot'],
  ['TAIL', 'Stegosaurus has spikes on its...'],
  ['BONE', 'A dino skeleton is made of these'],
  ['FERN', 'A leafy plant that dinos munch'],
  ['NEST', 'Where dino eggs are kept warm'],
  ['LAVA', 'Hot runny rock from a volcano'],
  ['HORN', 'Triceratops has three of these'],
  ['DINO', 'Short for dinosaur'],
  ['BABY', 'A little dino that just hatched'],
  ['HERD', 'A big group of dinos together'],
  ['UFO', 'The flying saucer the aliens ride in'],
  // middle words (normal)
  ['TEETH', 'T. rex had big sharp...'],
  ['SPIKE', 'A pointy bit on a stegosaurus tail'],
  ['STOMP', 'The sound of big dino feet'],
  ['SWAMP', 'A wet muddy place where dinos lived'],
  ['FOSSIL', 'Dino bones that turned into stone'],
  ['RAPTOR', 'A fast clever dino with a big claw'],
  ['METEOR', 'A space rock that crashed into Earth'],
  ['SCALES', 'Dino skin is covered in these'],
  ['PLATES', 'Big flat bits on a stegosaurus back'],
  ['ALIEN', 'A creature from another planet'],
  ['VOLCANO', 'A mountain that erupts with lava'],
  ['EXTINCT', 'When an animal is gone forever'],
  // long words (hard)
  ['DINOSAUR', 'A giant reptile from long ago'],
  ['JURASSIC', 'A time when lots of dinos lived'],
  ['SKELETON', 'All the bones of an animal together'],
  ['PREDATOR', 'An animal that hunts other animals'],
  ['HERBIVORE', 'An animal that only eats plants'],
  ['CARNIVORE', 'An animal that eats meat'],
  ['TRICERATOPS', 'The dino with three horns'],
  ['STEGOSAURUS', 'The dino with plates on its back'],
  ['ZOO', 'The aliens want dinos for their space...'],
  ['DIG', 'What you do to find fossils'],
  ['CLAWS', 'Sharp nails on a dino foot'],
  ['HATCH', 'When a baby breaks out of its egg'],
  ['TRIASSIC', 'The first time of the dinosaurs'],
  ['ASTEROID', 'A big rock flying through space'],
  ['FOOTPRINT', 'A mark a dino foot leaves in mud'],
  ['SPACESHIP', 'A ship that flies to other planets'],
  ['MOTHERSHIP', 'The giant alien ship up in space'],
  ['EXTINCTION', 'When a whole kind of animal dies out'],
  ['CRETACEOUS', 'The last time of the dinosaurs'],
  ['PREHISTORIC', 'From a time before writing was invented'],
  ['PTERODACTYL', 'A flying reptile with big wings'],
  ['SPINOSAURUS', 'A huge dino with a sail on its back'],
  ['VELOCIRAPTOR', 'A small, fast, clever hunting dino'],
  ['ANKYLOSAURUS', 'An armoured dino with a club tail'],
  ['TYRANNOSAURUS', 'The full name of the T. rex'],
  ['BRACHIOSAURUS', 'A very tall dino with a long neck'],
  ['ARCHAEOPTERYX', 'An early bird with feathers and teeth'],
  ['PALAEONTOLOGIST', 'A scientist who studies fossils'],
]

export function makeSpell(year, lastWord) {
  // word lengths from the Australian year level guide
  const lengths = { 0: [1, 4], 1: [2, 5], 2: [3, 6], 3: [4, 7], 4: [5, 8], 5: [6, 10], 6: [7, 12], 7: [8, 15] }[year] || [4, 7]
  const list = WORDS.filter(([w]) => w.length >= lengths[0] && w.length <= lengths[1] && w !== lastWord)
  const [word, clue] = pick(list)
  let order = shuffle(word.split(''))
  // make sure the tiles aren't already in the right order
  if (order.join('') === word && word.length > 1) order = order.reverse()
  return { type: 'spell', word, clue, tiles: order.map((ch) => ({ ch, used: false })), typed: '', misses: 0, shake: 0, t: 0 }
}

// ---------- answering ----------

// Returns 'correct', 'wrong', 'letter' (a right letter but the word isn't finished) or null.
function chooseMath(quiz, i) {
  if (i < 0 || i >= 4) return null
  if (quiz.choices[i] === quiz.answer) {
    quiz.flash = i
    return 'correct'
  }
  quiz.shake = 0.35
  quiz.flash = -1
  return 'wrong'
}

function typeLetter(quiz, ch) {
  const need = quiz.word[quiz.typed.length]
  const tile = quiz.tiles.find((t) => !t.used && t.ch === ch)
  if (!tile) return null
  if (ch !== need) {
    quiz.shake = 0.35
    quiz.misses++
    return 'wrong'
  }
  const exact = quiz.tiles.find((t) => !t.used && t.ch === ch)
  exact.used = true
  quiz.typed += ch
  return quiz.typed === quiz.word ? 'correct' : 'letter'
}

export function quizKey(quiz, code) {
  if (quiz.type === 'math') {
    const m = code.match(/^(?:Digit|Numpad)([1-4])$/)
    return m ? chooseMath(quiz, Number(m[1]) - 1) : undefined
  }
  const m = code.match(/^Key([A-Z])$/)
  return m ? typeLetter(quiz, m[1]) : undefined
}

export function quizClick(quiz, x, y) {
  if (quiz.type === 'math') {
    const i = mathButtons().findIndex((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h)
    return i >= 0 ? chooseMath(quiz, i) : null
  }
  const i = tileRects(quiz).findIndex((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h)
  return i >= 0 && !quiz.tiles[i].used ? typeLetter(quiz, quiz.tiles[i].ch) : null
}

// ---------- drawing ----------

const PANEL = { x: 190, y: 94, w: 580, h: 158 }

function mathButtons() {
  return [0, 1, 2, 3].map((i) => ({ x: 222 + i * 132, y: 196, w: 116, h: 44 }))
}

function tileRects(quiz) {
  const n = quiz.tiles.length
  const size = n > 12 ? 32 : n > 9 ? 40 : 46
  const gap = 6
  const total = n * size + (n - 1) * gap
  return quiz.tiles.map((_, i) => ({ x: W / 2 - total / 2 + i * (size + gap), y: 200, w: size, h: 42 }))
}

export function drawQuiz(ctx, quiz, time, hint) {
  const sx = quiz.shake > 0 ? Math.round(Math.sin(time * 70) * 6) : 0
  ctx.save()
  ctx.translate(sx, 0)
  rrect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 14)
  ctx.fillStyle = quiz.shake > 0 ? '#5a1830' : '#181425'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = quiz.type === 'math' ? '#2ce8f5' : '#feae34'
  ctx.stroke()
  if (quiz.type === 'math') {
    text(ctx, hint || 'SOLVE IT TO REFUEL!', W / 2, 122, 16, '#2ce8f5')
    text(ctx, quiz.q, W / 2, 172, 38, '#ffffff')
    for (const [i, b] of mathButtons().entries()) {
      rrect(ctx, b.x, b.y, b.w, b.h, 10)
      ctx.fillStyle = quiz.flash === i ? '#63c74d' : '#3a4466'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = INK
      ctx.stroke()
      text(ctx, String(quiz.choices[i]), b.x + b.w / 2, b.y + 32, 24, '#ffffff')
      text(ctx, String(i + 1), b.x + 12, b.y + 15, 10, '#8b9bb4', 'center', false)
    }
  } else {
    text(ctx, hint || 'SPELL IT TO GET ROARS!', W / 2, 120, 16, '#feae34')
    text(ctx, quiz.clue, W / 2, 146, 15, '#c0cbdc')
    // the word so far, with blanks for the letters still to go
    const shown = quiz.word
      .split('')
      .map((c, i) => (i < quiz.typed.length ? c : quiz.misses >= 3 && i === quiz.typed.length ? c.toLowerCase() : '_'))
      .join(' ')
    text(ctx, shown, W / 2, 184, 26, '#ffffff')
    for (const [i, r] of tileRects(quiz).entries()) {
      const tile = quiz.tiles[i]
      if (tile.used) continue
      rrect(ctx, r.x, r.y, r.w, r.h, 8)
      ctx.fillStyle = '#feae34'
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = INK
      ctx.stroke()
      text(ctx, tile.ch, r.x + r.w / 2, r.y + 31, 24, INK, 'center', false)
    }
  }
  ctx.restore()
}
