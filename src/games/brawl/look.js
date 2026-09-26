// How every fighter looks: heads, bodies, tails, costumes and poses.
// All coordinates are in screen pixels with (0, 0) at the fighter's feet, facing right.
import { PixelBuf, FLAT } from './pixelbuf'
import { GROUND } from './engine'

const INK = 0x140c1c
const WHITE = 0xffffff
const GLOVE = 0xe0393e
const PINK = 0xf08aa8

export const SPRITE_W = 108
export const SPRITE_H = 110
export const FOOT_X = 54
export const FOOT_Y = 104

const BUILDS = {
  slim: { tw: 7, arm: 3, leg: 3.5, glove: 3.5 },
  normal: { tw: 9, arm: 3.5, leg: 4, glove: 4 },
  bulky: { tw: 11, arm: 4.5, leg: 5, glove: 5 },
}

// ---------- Eyes and mouths (drawn on top as crisp detail pixels) ----------

function eye(b, x, y, kind, e, iris = 0x2a1a0d) {
  if (e.ko) {
    b.dots([[x - 1, y - 1], [x + 1, y - 1], [x, y], [x - 1, y + 1], [x + 1, y + 1]], INK)
    return
  }
  if (e.hurt) {
    b.dots([[x - 1, y - 1], [x, y], [x - 1, y + 1], [x + 1, y]], INK)
    return
  }
  if (e.closed) {
    b.line(x - 1, y, x + 1, y, INK)
    return
  }
  switch (kind) {
    case 'dot':
      b.dots([[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]], INK)
      b.dot(x, y, WHITE)
      break
    case 'big':
      for (let j = -2; j <= 1; j++) for (let i = -1; i <= 2; i++) b.dot(x + i, y + j, WHITE)
      b.dots([[x + 1, y - 1], [x + 2, y - 1], [x + 1, y], [x + 2, y], [x + 1, y + 1], [x + 2, y + 1]], INK)
      b.dot(x + 1, y - 1, WHITE)
      b.line(x - 1, y - 3, x + 2, y - 3, INK)
      break
    case 'slit':
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) b.dot(x + i, y + j, iris)
      b.dots([[x, y - 1], [x, y], [x, y + 1]], INK)
      b.dot(x + 1, y - 1, WHITE)
      b.line(x - 1, y - 2, x + 1, y - 2, INK)
      break
    case 'goat':
      for (let i = -1; i <= 1; i++) {
        b.dot(x + i, y - 1, 0xf2d23a)
        b.dot(x + i, y + 1, 0xf2d23a)
        b.dot(x + i, y, INK)
      }
      b.line(x - 1, y - 2, x + 1, y - 2, INK)
      break
    case 'panda':
      b.dots([[x, y], [x + 1, y], [x, y - 1], [x + 1, y - 1]], WHITE)
      b.dots([[x + 1, y], [x + 1, y - 1]], INK)
      break
    default: // round
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) b.dot(x + i, y + j, WHITE)
      b.dots([[x, y - 1], [x + 1, y - 1], [x, y], [x + 1, y]], INK)
      b.dot(x, y - 1, WHITE)
      b.line(x - 1, y - 2, x + 1, y - 2, INK)
  }
}

function mouth(b, [x, y], e) {
  if (!e.shout || e.ko) return
  b.dots([[x - 1, y], [x, y], [x + 1, y], [x + 2, y], [x - 1, y + 1], [x + 2, y + 1], [x, y + 2], [x + 1, y + 2]], INK)
  b.dots([[x, y + 1], [x + 1, y + 1]], 0xc0304a)
}

// ---------- The 18 heads. (0, 0) is the middle of the head. ----------

const LOOKS = {
  hitopotamus: {
    fur: 0x8d7aa8, light: 0xc9a8cc, trunks: 0x2b7de0, build: 'bulky', feet: 'paw', tail: 'nub', mouth: [9, 6],
    head(b, L, e) {
      const ears = b.part()
      b.ellipse(-6, -9, 2.5, 2.5, L.fur, ears)
      b.ellipse(1, -10, 2.5, 2.5, L.fur, ears)
      const h = b.part()
      b.ellipse(-1, -2, 9, 8, L.fur, h)
      b.ellipse(6, 4, 8.5, 6, L.light, h)
      b.dots([[-6, -9], [1, -10]], PINK)
      eye(b, -2, -4, 'round', e)
      eye(b, 4, -5, 'round', e)
      b.dots([[9, 1], [10, 1], [12, 2], [13, 2]], 0x5e4d78)
      if (!e.shout) b.dots([[7, 9], [11, 9]], WHITE)
    },
  },
  geckow: {
    fur: 0x5cc24a, light: 0xc8e880, trunks: 0xe0393e, build: 'slim', feet: 'claw', tail: 'lizard', mouth: [9, 3],
    head(b, L, e) {
      const bump = b.part()
      b.ellipse(0, -5, 4.5, 4.5, L.fur, bump)
      const h = b.part()
      b.ellipse(0, 1, 9, 6, L.fur, h)
      b.ellipse(7, 1, 6.5, 4.5, L.fur, h)
      b.ellipse(4, 4, 8, 2.5, L.light, h)
      eye(b, 0, -5, 'big', e)
      if (!e.shout) b.line(3, 3, 12, 2, 0x2a6a20)
      b.dots([[-5, -1], [-3, 2], [-6, 3], [-7, 0], [13, 0]], 0x3a8a30)
    },
  },
  pandamonium: {
    fur: 0xf2f2f2, light: 0xffffff, limbs: 0x2a2a34, trunks: 0x2bb673, build: 'bulky', feet: 'paw', tail: 'nub', mouth: [3, 5],
    head(b, L, e) {
      const ears = b.part()
      b.ellipse(-7, -8, 3.5, 3.5, 0x2a2a34, ears)
      b.ellipse(5, -9, 3.5, 3.5, 0x2a2a34, ears)
      const h = b.part()
      b.ellipse(0, 0, 10, 9, L.fur, h)
      b.ellipse(-3, -1, 3, 3.5, 0x2a2a34, h)
      b.ellipse(6, -1, 3, 3.5, 0x2a2a34, h)
      eye(b, -3, -1, 'panda', e)
      eye(b, 5, -1, 'panda', e)
      b.dots([[2, 3], [3, 3], [4, 3], [3, 4]], INK)
      if (!e.shout) b.dots([[2, 6], [4, 6], [3, 5]], INK)
    },
  },
  crocadial: {
    fur: 0x3f8a4a, light: 0xd0dc98, trunks: 0x8a3ddb, build: 'bulky', feet: 'claw', tail: 'croc', mouth: [8, 2],
    head(b, L, e) {
      const bump = b.part()
      b.ellipse(-2, -6, 3.5, 3.5, L.fur, bump)
      const h = b.part()
      b.ellipse(-3, -1, 7, 6.5, L.fur, h)
      b.poly([[-4, -6], [13, -3], [15, 1], [-4, 1]], L.fur, h)
      b.poly([[-6, 1], [14, 1], [12, 4], [-4, 6]], L.light, h)
      for (let x = 0; x <= 12; x += 3) b.dots([[x, 1], [x + 1, 2]], WHITE)
      eye(b, -2, -6, 'slit', e, 0xf2d23a)
      b.dots([[13, -3], [2, -4], [5, -3], [8, -3]], 0x2a5e32)
    },
  },
  lionheart: {
    fur: 0xf2b43a, light: 0xfbe4a8, mane: 0xb8582a, trunks: 0xe0393e, build: 'normal', feet: 'paw', tail: 'lion', mouth: [5, 6],
    chest: 'fluff',
    head(b, L, e) {
      const mane = b.part()
      b.ellipse(-2, 0, 12, 12, L.mane, mane)
      for (const [x, y] of [[-11, -7], [-12, 3], [-5, -11], [-4, 11], [5, -11], [4, 11], [-12, -2]]) b.ellipse(x, y, 3.5, 3.5, L.mane, mane)
      const ears = b.part()
      b.ellipse(-3, -8, 2.5, 2.5, L.fur, ears)
      b.ellipse(6, -8, 2.5, 2.5, L.fur, ears)
      const h = b.part()
      b.ellipse(2, 1, 8, 8, L.fur, h)
      b.ellipse(5, 5, 5, 3.5, L.light, h)
      eye(b, 0, -1, 'round', e)
      eye(b, 6, -1, 'round', e)
      b.dots([[4, 3], [5, 3], [6, 3], [5, 4]], 0x7a3a1a)
      if (!e.shout) b.dots([[4, 6], [6, 6], [5, 5]], 0x7a3a1a)
    },
  },
  bearknuckle: {
    fur: 0x8a5a32, light: 0xd8b080, trunks: 0x2b7de0, build: 'bulky', feet: 'paw', tail: 'nub', mouth: [7, 5],
    head(b, L, e) {
      const ears = b.part()
      b.ellipse(-6, -8, 3.5, 3.5, L.fur, ears)
      b.ellipse(4, -9, 3.5, 3.5, L.fur, ears)
      const h = b.part()
      b.ellipse(0, 0, 10, 9, L.fur, h)
      b.ellipse(5, 4, 5.5, 3.5, L.light, h)
      b.dots([[-6, -8], [4, -9]], L.light)
      eye(b, -1, -2, 'dot', e)
      eye(b, 5, -3, 'dot', e)
      b.dots([[7, 2], [8, 2], [9, 2], [8, 3]], INK)
      if (!e.shout) b.dots([[6, 6], [7, 6], [8, 5]], INK)
      // Brawler's bandage
      b.dots([[-5, 2], [-4, 3], [-3, 4], [-5, 4], [-3, 2]], WHITE)
    },
  },
  beestmode: {
    fur: 0xf2c40c, light: 0xffe27a, limbs: 0x2a2a34, trunks: 0x2a2a34, build: 'slim', feet: 'claw', tail: 'bee', mouth: [6, 5],
    chest: 'stripes',
    head(b, L, e) {
      const h = b.part()
      b.ellipse(0, 0, 8.5, 8.5, L.fur, h)
      const eyeP = b.part()
      b.ellipse(4.5, -1, 3.5, 4.5, 0x2a2a34, eyeP)
      b.ellipse(-2, -2, 2, 2.5, 0x2a2a34, eyeP)
      if (e.ko) b.dots([[3, -2], [5, -2], [4, -1], [3, 0], [5, 0]], WHITE)
      else if (e.hurt) b.dots([[3, -2], [4, -1], [3, 0]], WHITE)
      else if (!e.closed) b.dots([[4, -4], [5, -4], [4, -3], [-2, -3]], WHITE)
      b.line(-2, -8, -5, -14, INK)
      b.line(2, -8, 4, -15, INK)
      b.dots([[-6, -15], [-5, -15], [-6, -14], [4, -16], [5, -16], [5, -15]], INK)
      if (!e.shout) b.dots([[4, 5], [5, 6], [6, 6], [7, 5]], INK)
    },
  },
  kickahorse: {
    fur: 0xa86a3d, light: 0xdcae80, mane: 0x3a2010, trunks: 0xf2b90c, build: 'normal', feet: 'hoof', tail: 'horse', mouth: [10, 6],
    head(b, L, e) {
      const mane = b.part()
      b.poly([[-9, -10], [-1, -12], [-5, 4], [-11, 8], [-11, -2]], L.mane, mane)
      const ear = b.part()
      b.poly([[-3, -8], [-1, -16], [2, -8]], L.fur, ear)
      const h = b.part()
      b.ellipse(-1, -2, 7, 7, L.fur, h)
      b.ellipse(7, 2, 7.5, 5, L.fur, h)
      b.ellipse(11, 3, 4, 4, L.light, h)
      const tuft = b.part()
      b.poly([[-3, -9], [4, -8], [1, -4]], L.mane, tuft)
      eye(b, 1, -3, 'round', e)
      b.dots([[13, 1], [13, 2]], INK)
      if (!e.shout) b.line(9, 6, 13, 6, 0x5a3418)
    },
  },
  sharkitecture: {
    fur: 0x5a8ab8, light: 0xe8eef4, trunks: 0xe0393e, build: 'normal', feet: 'claw', tail: 'shark', mouth: [8, 3],
    head(b, L, e) {
      const h = b.part()
      b.ellipse(0, 1, 10, 8, L.fur, h)
      b.ellipse(6, 0, 7, 6, L.fur, h)
      b.ellipse(4, 5, 8, 3.5, L.light, h)
      // Hard hat — it's an architect!
      const hat = b.part()
      b.ellipse(-1, -6, 8, 4.5, 0xf2c40c, hat)
      b.rect(-10, -4, 20, 2, 0xf2c40c, hat)
      b.dots([[-1, -10], [-1, -9], [-1, -8]], 0xc98a0c)
      if (!e.shout) {
        b.line(3, 4, 12, 4, INK)
        for (let x = 4; x <= 11; x += 2) b.dot(x, 5, WHITE)
        for (let x = 5; x <= 12; x += 2) b.dot(x, 3, WHITE)
      }
      b.dots([[-6, 0], [-6, 1], [-4, 0], [-4, 1], [-2, 1], [-2, 2]], 0x3a5e88)
      eye(b, 5, -2, 'dot', e)
    },
  },
  duckandcover: {
    fur: 0x8a5a32, light: 0xe8dcc8, neck: 0x2a8a4a, trunks: 0x2b7de0, build: 'normal', feet: 'webbed', tail: 'duck', mouth: [10, 2],
    head(b, L, e) {
      const h = b.part()
      b.ellipse(0, 0, 8, 8, 0x2a8a4a, h)
      const beak = b.part()
      b.ellipse(9, 2, 6, 2.5, 0xf29a1a, beak)
      if (!e.shout) b.line(5, 2, 14, 2, 0xb8600a)
      // Army helmet: take cover!
      const helmet = b.part()
      b.ellipse(-1, -5, 9, 5.5, 0x5a6a2a, helmet)
      b.rect(-11, -3, 21, 2, 0x5a6a2a, helmet)
      b.dots([[-5, -8], [0, -7], [3, -9], [-3, -5]], 0x3a4a1a)
      b.line(-4, 7, 4, 7, WHITE)
      eye(b, 3, -1, 'round', e)
    },
  },
  hissterical: {
    fur: 0x4aa84a, light: 0xe0d070, trunks: 0x8a3ddb, build: 'slim', feet: 'claw', tail: 'snake', mouth: [9, 2],
    head(b, L, e) {
      const hood = b.part()
      b.ellipse(-4, 3, 7, 10, 0x3a8a3a, hood)
      b.dots([[-6, 0], [-5, 1], [-6, 2], [-7, 1], [-6, 6], [-5, 7], [-6, 8], [-7, 7]], L.light)
      const h = b.part()
      b.ellipse(1, 0, 9, 5.5, L.fur, h)
      b.ellipse(7, 1, 5, 4, L.fur, h)
      b.ellipse(4, 3, 7, 2, L.light, h)
      eye(b, 4, -2, 'slit', e, 0xf2d23a)
      b.dots([[-2, -3], [0, -4], [2, -4], [-4, -2]], 0x2e7a2e)
      if (e.tongue && !e.ko && !e.shout) b.dots([[12, 2], [13, 2], [14, 2], [15, 1], [15, 3]], 0xe0393e)
    },
  },
  crabbat: {
    fur: 0xe0503a, light: 0xf5a888, trunks: 0x2a2a34, build: 'normal', feet: 'claw', tail: 'crablegs', glove: 'pincer', mouth: [3, 4],
    head(b, L, e) {
      const stalks = b.part()
      b.capsule(-3, -3, -4, -9, 1, 1, L.fur, stalks)
      b.capsule(4, -3, 5, -10, 1, 1, L.fur, stalks)
      const h = b.part()
      b.ellipse(0, 1, 11, 7, L.fur, h)
      b.dots([[-6, 0], [-3, -2], [7, 2], [-7, 4]], L.light)
      eye(b, -4, -10, 'round', e)
      eye(b, 5, -11, 'round', e)
      if (!e.shout) b.dots([[2, 4], [3, 5], [4, 5], [5, 4]], INK)
    },
  },
  octopunch: {
    fur: 0xd0508a, light: 0xf5a0c8, trunks: 0xf2b90c, build: 'normal', feet: 'tentacle', tail: 'tentacles', mouth: [2, 6],
    head(b, L, e) {
      const h = b.part()
      b.ellipse(0, -3, 10, 11, L.fur, h)
      b.dots([[-5, -9], [-3, -11], [-7, -4], [2, -10], [-6, -8]], L.light)
      eye(b, -1, 1, 'round', e)
      eye(b, 5, 1, 'round', e)
      if (!e.shout) b.dots([[2, 5], [3, 5], [2, 6], [3, 6]], 0x7a1a4a)
      b.dots([[-3, 4], [8, 4]], PINK)
    },
  },
  gorillawarfare: {
    fur: 0x4a4a55, light: 0x9a8a80, trunks: 0x4a6a2a, build: 'bulky', feet: 'paw', tail: null, mouth: [4, 5],
    chest: 'strap',
    head(b, L, e) {
      const tails = b.part()
      b.poly([[-8, -7], [-16, -4], [-15, -2], [-8, -4]], 0xe0393e, tails)
      b.poly([[-8, -6], [-14, 0], [-12, 1], [-7, -4]], 0xe0393e, tails)
      const h = b.part()
      b.ellipse(0, -1, 9, 9, L.fur, h)
      b.ellipse(3, 2, 7, 6, L.light, h)
      b.ellipse(3, -3, 7, 1.8, 0x3a3a44, h)
      const band = b.part()
      b.rect(-9, -8, 18, 3, 0xe0393e, band)
      eye(b, 1, -1, 'dot', e)
      eye(b, 6, -1, 'dot', e)
      b.dots([[4, 2], [6, 2]], INK)
      if (!e.shout) b.line(1, 5, 7, 5, 0x3a3a44)
    },
  },
  goatnglory: {
    fur: 0xefe6d0, light: 0xffffff, trunks: 0x8a3ddb, build: 'normal', feet: 'hoof', tail: 'nub', mouth: [7, 5],
    chest: 'medal',
    head(b, L, e) {
      const horns = b.part()
      b.capsule(-2, -6, -7, -12, 2, 1.6, 0x8a6a48, horns)
      b.capsule(-7, -12, -12, -10, 1.6, 0.8, 0x8a6a48, horns)
      b.capsule(1, -7, -3, -14, 2, 1.4, 0x9a7a58, horns)
      b.capsule(-3, -14, -7, -14, 1.4, 0.8, 0x9a7a58, horns)
      const ear = b.part()
      b.ellipse(-6, -2, 3.5, 1.6, L.fur, ear)
      const h = b.part()
      b.ellipse(-1, -1, 7, 7, L.fur, h)
      b.ellipse(6, 2, 5.5, 4, L.fur, h)
      const beard = b.part()
      b.poly([[3, 5], [8, 5], [5, 12]], 0xcfc0a0, beard)
      eye(b, 2, -2, 'goat', e)
      b.dots([[10, 1], [10, 2]], PINK)
      b.dots([[-6, -2], [-5, -2]], PINK)
    },
  },
  wolfpack: {
    fur: 0x7a8494, light: 0xd4d8e0, trunks: 0x2a2a34, build: 'normal', feet: 'paw', tail: 'bushy', mouth: [9, 5],
    head(b, L, e) {
      const ears = b.part()
      b.poly([[-7, -5], [-5, -15], [-1, -7]], L.fur, ears)
      b.poly([[0, -7], [3, -15], [5, -5]], L.fur, ears)
      b.dots([[-5, -11], [-4, -9], [3, -11], [3, -9]], 0x4a5260)
      const h = b.part()
      b.ellipse(-1, -1, 8, 8, L.fur, h)
      b.ellipse(7, 3, 6.5, 3.5, L.fur, h)
      b.ellipse(5, 4, 6, 3, L.light, h)
      b.ellipse(-4, 4, 4, 3, L.light, h)
      eye(b, 3, -3, 'slit', e, 0xf2d23a)
      b.dots([[12, 1], [13, 1], [12, 2], [13, 2]], INK)
      if (!e.shout) b.line(8, 6, 12, 5, 0x4a5260)
    },
  },
  rhinomite: {
    fur: 0x8f8f9c, light: 0xb8b8c4, trunks: 0xe0393e, build: 'bulky', feet: 'hoof', tail: 'nub', mouth: [9, 6],
    chest: 'dynamite',
    head(b, L, e) {
      const ear = b.part()
      b.ellipse(-5, -8, 2, 3.5, L.fur, ear)
      const h = b.part()
      b.ellipse(-2, -1, 8, 8, L.fur, h)
      b.ellipse(6, 3, 7, 6, L.fur, h)
      const horn = b.part()
      b.poly([[7, -2], [15, -13], [12, -1]], 0xefe6d0, horn)
      b.poly([[3, -5], [6, -10], [7, -4]], 0xefe6d0, horn)
      eye(b, 1, -3, 'dot', e)
      b.dots([[12, 3], [-4, 2], [-3, 3], [-2, 2]], 0x62626e)
      if (!e.shout) b.line(7, 7, 12, 6, 0x62626e)
    },
  },
  frogment: {
    fur: 0x6cc24a, light: 0xd0f4a8, trunks: 0xe0393e, build: 'slim', feet: 'webbed', tail: null, mouth: [2, 4],
    head(b, L, e) {
      const bumps = b.part()
      b.ellipse(-4, -5, 4, 4, L.fur, bumps)
      b.ellipse(5, -6, 4, 4, L.fur, bumps)
      const h = b.part()
      b.ellipse(1, 2, 11, 6.5, L.fur, h)
      b.ellipse(2, 6, 8, 2.5, L.light, h)
      eye(b, -4, -5, 'big', e)
      eye(b, 5, -6, 'big', e)
      if (!e.shout) b.dots([[-7, 2], [-6, 3], [-5, 4], [-4, 4], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 3], [10, 2]], 0x2a6a20)
      b.dots([[-6, 5], [9, 5]], PINK)
    },
  },
}

// ---------- Body parts ----------

// Two-bone "inverse kinematics": where does the elbow/knee go so the hand/foot reaches the target?
function ik(ax, ay, bx, by, l1, l2, bend) {
  let dx = bx - ax
  let dy = by - ay
  let d = Math.hypot(dx, dy) || 0.01
  const max = l1 + l2 - 0.01
  if (d > max) {
    bx = ax + (dx / d) * max
    by = ay + (dy / d) * max
    dx = bx - ax
    dy = by - ay
    d = max
  }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
  const ang = Math.atan2(dy, dx) + bend * a
  return [ax + Math.cos(ang) * l1, ay + Math.sin(ang) * l1, bx, by]
}

function leg(b, L, B, hip, foot, color) {
  const [kx, ky, fx, fy] = ik(hip[0], hip[1], foot[0], foot[1], 10, 10, -1)
  const r = b.part()
  b.capsule(hip[0], hip[1], kx, ky, B.leg, B.leg - 0.5, color, r)
  b.capsule(kx, ky, fx, fy - 1, B.leg - 0.5, B.leg - 1, color, r)
  const f = b.part()
  switch (L.feet) {
    case 'hoof':
      b.rect(fx - 3, fy - 3, 6, 3, 0x3a2418, f)
      break
    case 'webbed':
      b.poly([[fx - 2, fy - 3], [fx + 6, fy - 1], [fx + 6, fy], [fx - 3, fy]], L.key === 'frogment' ? L.fur : 0xf29a1a, f)
      break
    case 'claw':
      b.ellipse(fx + 1, fy - 1.5, 4, 2, color, f)
      b.dots([[fx + 4, fy - 1], [fx + 5, fy], [fx + 2, fy]], 0xf4f0e0)
      break
    case 'tentacle':
      b.capsule(fx, fy - 2, fx + 5, fy - 1, 2.5, 1.2, color, f)
      b.dots([[fx + 1, fy - 1], [fx + 3, fy - 1]], L.light)
      break
    default:
      b.ellipse(fx + 1.5, fy - 1.5, 4.5, 2.2, color, f)
  }
}

function arm(b, L, B, shoulder, hand, color) {
  const [ex, ey, hx, hy] = ik(shoulder[0], shoulder[1], hand[0], hand[1], 10, 10, 1)
  const r = b.part()
  b.capsule(shoulder[0], shoulder[1], ex, ey, B.arm + 0.5, B.arm, color, r)
  b.capsule(ex, ey, hx, hy, B.arm, B.arm - 0.5, color, r)
  const g = b.part()
  if (L.glove === 'pincer') {
    const ang = Math.atan2(hy - ey, hx - ex)
    const cx = hx + Math.cos(ang) * 2
    const cy = hy + Math.sin(ang) * 2
    b.ellipse(cx, cy, B.glove + 1, B.glove, L.fur, g)
    const g2 = b.part()
    b.ellipse(cx + Math.cos(ang) * 4 - 1, cy + Math.sin(ang) * 4 - 2, 3, 2, L.fur, g2)
    b.ellipse(cx + Math.cos(ang) * 4, cy + Math.sin(ang) * 4 + 2, 3, 1.6, L.fur, g2)
  } else {
    b.ellipse(hx, hy, B.glove + 0.5, B.glove, L.glove || GLOVE, g)
    b.capsule(hx - Math.cos(Math.atan2(hy - ey, hx - ex)) * B.glove, hy - Math.sin(Math.atan2(hy - ey, hx - ex)) * B.glove, hx - Math.cos(Math.atan2(hy - ey, hx - ex)) * (B.glove - 1), hy - Math.sin(Math.atan2(hy - ey, hx - ex)) * (B.glove - 1), 2, 2, 0xf4f0e0, g)
    b.dot(hx - 1, hy - B.glove + 1, 0xffb0b0)
  }
}

function tail(b, L, B, clock) {
  const tx = -B.tw + 1
  const wag = Math.sin(clock * 5) * 2
  const r = b.part()
  switch (L.tail) {
    case 'nub':
      b.ellipse(tx - 1, -22, 2.5, 2.5, L.fur, r)
      break
    case 'lion':
      b.capsule(tx, -22, tx - 7, -15, 1.5, 1.3, L.fur, r)
      b.capsule(tx - 7, -15, tx - 12, -25 + wag, 1.3, 1.2, L.fur, r)
      b.ellipse(tx - 12, -26 + wag, 3, 3, L.mane, b.part())
      break
    case 'lizard':
    case 'croc': {
      const big = L.tail === 'croc' ? 1.5 : 0
      b.capsule(tx + 2, -20, tx - 9, -8, 4 + big, 3 + big, L.fur, r)
      b.capsule(tx - 9, -8, tx - 19, -2 + wag * 0.3, 3 + big, 1, L.fur, r)
      if (big) b.dots([[tx - 4, -19], [tx - 8, -14], [tx - 12, -8], [tx - 16, -5]], 0x2a5e32)
      break
    }
    case 'bushy':
      b.capsule(tx, -23, tx - 8, -19 + wag, 3, 5, L.fur, r)
      b.ellipse(tx - 12, -20 + wag, 4, 3.5, L.light, r)
      break
    case 'horse':
      b.capsule(tx, -25, tx - 6, -16, 2.5, 3.5, L.mane, r)
      b.capsule(tx - 6, -16, tx - 5 + wag * 0.5, -4, 3.5, 2, L.mane, r)
      break
    case 'shark':
      b.capsule(tx + 1, -22, tx - 7, -18, 4, 2, L.fur, r)
      b.poly([[tx - 7, -18], [tx - 13, -29], [tx - 10, -18], [tx - 13, -9]], L.fur, r)
      break
    case 'duck':
      b.poly([[tx + 1, -24], [tx - 7, -28], [tx - 5, -20]], L.fur, r)
      break
    case 'snake':
      b.capsule(tx + 2, -18, tx - 6, -4, 4, 3.5, L.fur, r)
      b.capsule(tx - 6, -4, tx - 17, -2, 3.5, 2.5, L.fur, r)
      b.capsule(tx - 17, -2, tx - 22, -7 + wag * 0.5, 2.5, 1, L.fur, r)
      b.dots([[tx - 3, -12], [tx - 8, -4], [tx - 13, -3], [tx - 18, -3]], L.light)
      break
    case 'tentacles':
      for (const [sx, dir] of [[-4, -1], [3, 1]]) {
        const w = Math.sin(clock * 4 + sx) * 2
        b.capsule(sx, -20, sx + dir * 6, -9 + w, 3, 2.2, L.fur, r)
        b.capsule(sx + dir * 6, -9 + w, sx + dir * 11, -3, 2.2, 1, L.fur, r)
      }
      break
    case 'crablegs':
      for (const s of [-1, 1]) {
        b.capsule(s * B.tw, -26, s * (B.tw + 6), -20, 1.6, 1.4, L.fur, r)
        b.capsule(s * (B.tw + 6), -20, s * (B.tw + 7), -13, 1.4, 1, L.fur, r)
      }
      break
    case 'bee':
      b.ellipse(tx - 4, -26, 6.5, 5, L.fur, r)
      b.rect(tx - 7, -31, 2, 10, 0x2a2a34, r)
      b.rect(tx - 3, -31, 2, 10, 0x2a2a34, r)
      b.poly([[tx - 10, -27], [tx - 14, -24], [tx - 9, -24]], INK, r)
      break
    default:
  }
}

function wings(b, lean, bob, clock) {
  const flap = Math.sin(clock * 30) > 0 ? 1 : 0
  const w = b.part()
  b.ellipse(-8 + lean, -48 + bob - flap * 2, 7, 3.5 + flap, 0xd8ecff, w, FLAT)
  b.ellipse(-4 + lean, -52 + bob - flap * 2, 5, 3 + flap, 0xeef6ff, w, FLAT)
}

// ---------- Poses ----------

export function pose(f, clock) {
  const a = f.action
  const air = f.y < GROUND
  const bob = !a && !air && Math.sin(clock * 4 + f.side * 2) > 0 ? 1 : 0
  const walking = !a && !air && Math.abs(f.vx) > 20
  const p = {
    feet: [[-7, 0], [8, 0]],
    hands: [[9, -37], [16, -43]],
    lean: 0,
    bob,
    expr: {},
  }
  if (walking) {
    const s = Math.sin(f.walkT)
    const c = Math.cos(f.walkT)
    p.feet = [[-7 + s * 6, -Math.max(0, -c) * 3], [8 - s * 6, -Math.max(0, c) * 3]]
    p.bob = Math.abs(s) > 0.7 ? 1 : 0
  }
  if (air) {
    p.feet = [[-5, -9], [10, -7]]
    p.hands = [[8, -44], [14, -49]]
  }
  if (f.blocking || a?.blocked) {
    p.hands = [[12, -50], [15, -42]]
    p.lean = -1
  }
  if (a?.type === 'attack') {
    const mv = a.move
    const out = a.t >= mv.on * 0.6 && a.t <= mv.off + 0.05
    if (a.name === 'punch') {
      if (out) {
        p.hands = [[5, -38], [32, -45]]
        p.lean = 3
      } else {
        p.hands = [[9, -38], [7, -41]]
        p.lean = -1
      }
    } else if (out) {
      p.feet = [[-7, air ? -8 : 0], [27, air ? -14 : -30]]
      p.lean = -4
      p.hands = [[2, -46], [12, -50]]
    } else {
      p.feet = [[-7, 0], [10, -10]]
      p.lean = -2
    }
    p.expr.shout = out && a.name === 'kick'
  }
  if (a?.type === 'hurt' && !a.blocked) {
    p.lean = -4
    p.hands = [[-6, -50], [1, -55]]
    p.expr.hurt = true
  }
  if (a?.type === 'special') {
    p.expr.shout = true
    const t = f.def.special.type
    if (t === 'projectile') {
      p.hands = [[25, -42], [28, -38]]
      p.lean = 3
    } else if (t === 'dash') {
      p.lean = 6
      p.hands = [[-8, -36], [32, -41]]
      p.feet = [[-15, 0], [12, 0]]
    } else if (t === 'uppercut') {
      p.hands = [[6, -38], [10, -76]]
      p.lean = 1
      if (air) p.feet = [[-3, -4], [6, -11]]
    } else if (t === 'slam') {
      p.hands = a.landed ? [[16, -28], [21, -25]] : [[-6, -70], [9, -72]]
      if (a.landed) p.lean = 3
    }
  }
  if (a?.type === 'ko') {
    p.expr = { ko: true }
    p.bob = 0
  }
  if (!p.expr.hurt && !p.expr.ko && !p.expr.shout && (clock + f.side * 1.7) % 3.3 < 0.12) p.expr.closed = true
  p.expr.tongue = Math.sin(clock * 3 + f.side) > 0.4
  return p
}

// ---------- Put it all together ----------

export function paintFighter(b, def, p, clock) {
  const L = LOOKS[def.key]
  L.key = def.key
  const B = BUILDS[L.build]
  const limb = L.limbs ?? L.fur
  const { lean, bob } = p
  b.clear()
  b.origin(FOOT_X, FOOT_Y)

  tail(b, L, B, clock)
  if (L.tail === 'bee') wings(b, lean, bob, clock)
  if (L.tail === 'shark') b.poly([[-3 + lean, -40 + bob], [-12 + lean, -52 + bob], [-7 + lean, -36 + bob]], L.fur, b.part())

  const hipB = [-3, -19]
  const hipF = [4, -19]
  const shB = [-4 + lean, -40 + bob]
  const shF = [5 + lean, -40 + bob]

  leg(b, L, B, hipB, p.feet[0], limb)
  arm(b, L, B, shB, p.hands[0], limb)

  // Torso: a capsule from hips to chest, so leaning just tilts it
  const t = b.part()
  const chestX = 1 + lean * 0.8
  const chestY = -36 + bob
  b.capsule(0, -24, chestX, chestY, B.tw, B.tw + 1, L.fur, t)
  b.capsule(2, -25, chestX + 2, chestY + 1, B.tw - 4, B.tw - 3, L.light, t)
  if (L.chest === 'stripes') {
    b.rect(chestX - B.tw, chestY - 1, B.tw * 2 + 2, 2, 0x2a2a34, t)
    b.rect(chestX - B.tw, chestY + 5, B.tw * 2 + 2, 2, 0x2a2a34, t)
  }

  leg(b, L, B, hipF, p.feet[1], limb)

  // Boxing shorts with a waistband
  const tr = b.part()
  b.ellipse(0.5, -20, B.tw + 1, 5, L.trunks, tr)
  b.capsule(hipB[0], hipB[1], hipB[0] + (p.feet[0][0] - hipB[0]) * 0.25, hipB[1] + 4, B.leg + 1, B.leg + 0.5, L.trunks, tr)
  b.capsule(hipF[0], hipF[1], hipF[0] + (p.feet[1][0] - hipF[0]) * 0.25, hipF[1] + 4, B.leg + 1, B.leg + 0.5, L.trunks, tr)
  b.rect(-B.tw, -25, B.tw * 2 + 2, 2, 0xf4f0e0, tr)
  b.dots([[B.tw - 3, -20], [B.tw - 3, -19], [B.tw - 2, -19]], 0xffffff)

  // Costume bits on the chest
  if (L.chest === 'medal') {
    b.line(chestX - 3, chestY - 5, chestX + 1, chestY + 1, 0x2b7de0)
    b.line(chestX + 5, chestY - 5, chestX + 2, chestY + 1, 0xe0393e)
    b.dots([[chestX + 1, chestY + 2], [chestX + 2, chestY + 2], [chestX + 1, chestY + 3], [chestX + 2, chestY + 3], [chestX, chestY + 3], [chestX + 3, chestY + 3], [chestX + 1, chestY + 4], [chestX + 2, chestY + 4]], 0xf2c40c)
    b.dot(chestX + 1, chestY + 2, 0xfff4b0)
  }
  if (L.chest === 'strap') b.line(chestX - B.tw + 1, chestY - 5, chestX + B.tw - 1, chestY + 9, 0x6a5a2a)
  if (L.chest === 'fluff') b.dots([[chestX + 1, chestY - 4], [chestX + 3, chestY - 3], [chestX + 2, chestY - 5], [chestX + 4, chestY - 5]], L.mane)
  if (L.chest === 'dynamite') {
    b.dots([[B.tw - 2, -24], [B.tw - 1, -24], [B.tw - 2, -23], [B.tw - 1, -23], [B.tw - 2, -22], [B.tw - 1, -22], [B.tw - 2, -21], [B.tw - 1, -21]], 0xe0393e)
    b.dots([[B.tw - 1, -25], [B.tw, -26]], 0x6a4a2a)
    if (Math.sin(clock * 20) > 0) b.dot(B.tw + 1, -27, 0xffe27a)
  }

  // Neck, then head
  const headX = 2 + lean * 1.2
  const headY = -56 + bob
  b.capsule(chestX + 1, chestY - 6, headX, headY + 4, B.tw * 0.45, B.tw * 0.4, L.neck ?? L.fur, b.part())
  b.origin(FOOT_X + headX, FOOT_Y + headY)
  L.head(b, L, p.expr)
  mouth(b, L.mouth, p.expr)
  b.origin(FOOT_X, FOOT_Y)

  arm(b, L, B, shF, p.hands[1], limb)
  return b.finish()
}

// Cached still images for menus: full-body idle and head close-ups.
const stills = new Map()
export function stillCanvas(def, kind = 'body', expr = {}) {
  const key = `${def.key}:${kind}:${JSON.stringify(expr)}`
  if (stills.has(key)) return stills.get(key)
  const b = new PixelBuf(SPRITE_W, SPRITE_H)
  const p = { feet: [[-7, 0], [8, 0]], hands: [[9, -37], [16, -43]], lean: 0, bob: 0, expr }
  const src = paintFighter(b, def, p, 0.5)
  const c = document.createElement('canvas')
  const [x, y, w, h] = kind === 'head' ? [FOOT_X - 16, FOOT_Y - 74, 34, 32] : [FOOT_X - 28, FOOT_Y - 76, 56, 80]
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h)
  stills.set(key, c)
  return c
}
