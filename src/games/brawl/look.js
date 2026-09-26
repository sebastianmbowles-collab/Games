// How every fighter looks. Each animal has a real animal body: the snake coils and strikes with
// its head, the octopus stands on tentacles, the crab scuttles on six legs, the shark stands on its
// tail fin, the bee hovers, the duck has wings, and hoofed animals have hooves and backward ankles.
// Coordinates are screen pixels with (0, 0) at the fighter's feet, facing right.
import { PixelBuf, FLAT } from './pixelbuf'
import { GROUND } from './engine'

const INK = 0x140c1c
const WHITE = 0xffffff
const PINK = 0xf08aa8
const CLAW = 0xf4efe0

export const SPRITE_W = 128
export const SPRITE_H = 124
export const FOOT_X = 64
export const FOOT_Y = 118

// ---------- Eyes and mouths (crisp detail pixels drawn on top) ----------

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
    case 'gecko':
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.abs(i) + Math.abs(j) < 4) b.dot(x + i, y + j, 0xe8c040)
      b.dots([[x, y - 2], [x, y - 1], [x, y], [x, y + 1], [x, y + 2]], INK)
      b.dots([[x - 1, y - 1], [x + 1, y - 2]], 0xfff4b0)
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

// ---------- The animals ----------
// plan: which body blueprint to use. torso: 'barrel' (round belly), 'chest' (broad chest, slim
// waist), 'slim', 'round'. legs: 'plant' (flat-footed), 'digi' (walks on toes, backward ankle),
// 'stump', 'bird', 'frog'. hand/foot: what's at the end of each limb.

const LOOKS = {
  hitopotamus: {
    plan: 'biped', torso: 'barrel', tw: 12, legs: 'stump', hand: 'paw', foot: 'stump', arm: 5, tail: 'thin',
    fur: 0x8d7aa8, light: 0xd9aec8, mouth: [12, 6], faceY: -56,
    head(b, L, e) {
      const ears = b.part()
      b.ellipse(-8, -9, 2.5, 3, L.fur, ears)
      const h = b.part()
      b.ellipse(-3, -3, 8.5, 8, L.fur, h)
      b.ellipse(-1, -9, 3.5, 3, L.fur, h)
      b.ellipse(8, 3, 10, 7.5, L.fur, h)
      b.ellipse(13, -2, 3, 2.5, L.fur, h)
      b.ellipse(8, 8, 9, 2.5, L.light, h)
      b.dots([[-8, -9], [-8, -8]], PINK)
      eye(b, 0, -9, 'round', e)
      b.dots([[12, -3], [13, -3], [15, -2], [16, -2]], 0x4a3a60)
      b.dots([[3, 3], [4, 4], [5, 3]], 0xb07aa8)
      if (!e.shout) {
        b.line(2, 6, 17, 4, 0x5e4d78)
        b.dots([[15, 5], [15, 6], [7, 6], [7, 7]], WHITE)
      }
    },
  },
  geckow: {
    plan: 'biped', torso: 'slim', tw: 6, legs: 'digi', hand: 'toepad', foot: 'toepad', arm: 3, leg: 3, tail: 'lizard',
    fur: 0x5cc24a, light: 0xc8e880, spots: 0x3a8a30, mouth: [11, 3], faceY: -58,
    head(b, L, e) {
      const bump = b.part()
      b.ellipse(1, -6, 5.5, 5.5, L.fur, bump)
      const h = b.part()
      b.ellipse(0, 1, 9.5, 6.5, L.fur, h)
      b.ellipse(9, 1, 7, 5, L.fur, h)
      b.ellipse(6, 4, 9, 2.5, L.light, h)
      eye(b, 1, -6, 'gecko', e)
      if (!e.shout) b.line(4, 3, 16, 2, 0x2a6a20)
      b.dots([[-5, -1], [-3, 2], [-6, 3], [-8, 0], [16, 0], [2, 0]], L.spots)
    },
  },
  pandamonium: {
    plan: 'biped', torso: 'barrel', tw: 11, legs: 'plant', hand: 'paw', foot: 'paw', arm: 4.5, tail: 'nub',
    fur: 0xf2f2f2, light: 0xffffff, limbs: 0x2a2a34, band: 0x2a2a34, mouth: [4, 5], faceY: -57,
    head(b, L, e) {
      const ears = b.part()
      b.ellipse(-8, -9, 4, 4, 0x2a2a34, ears)
      b.ellipse(6, -10, 4, 4, 0x2a2a34, ears)
      const h = b.part()
      b.ellipse(0, -1, 11, 9.5, L.fur, h)
      b.ellipse(5, 4, 5.5, 3.5, L.light, h)
      b.poly([[-7, -5], [-2, -6], [-1, 1], [-4, 2], [-7, -1]], 0x2a2a34, h)
      b.poly([[3, -6], [8, -5], [8, -1], [6, 2], [3, 1]], 0x2a2a34, h)
      eye(b, -4, -2, 'panda', e)
      eye(b, 5, -2, 'panda', e)
      b.dots([[4, 2], [5, 2], [6, 2], [5, 3]], INK)
      if (!e.shout) b.dots([[3, 5], [4, 6], [5, 5], [6, 6], [7, 5]], INK)
    },
  },
  crocadial: {
    plan: 'biped', torso: 'chest', tw: 10, legs: 'plant', hand: 'claw', foot: 'claw', arm: 4.5, leg: 5, tail: 'croc',
    fur: 0x3f8a4a, light: 0xd0dc98, scutes: true, mouth: [10, 2], faceY: -56,
    head(b, L, e) {
      const bump = b.part()
      b.ellipse(-3, -7, 4, 3.5, L.fur, bump)
      const h = b.part()
      b.ellipse(-4, -1, 8, 7, L.fur, h)
      b.poly([[-5, -6], [17, -3], [18, 1], [-5, 1]], L.fur, h)
      b.poly([[-7, 1], [17, 1], [15, 5], [-5, 7]], L.light, h)
      b.ellipse(16, -3, 2, 1.8, L.fur, h)
      for (let x = 0; x <= 15; x += 3) b.dots([[x, 1], [x + 1, 2], [x + 2, 0]], WHITE)
      eye(b, -3, -7, 'slit', e, 0xf2d23a)
      b.dots([[16, -4], [2, -4], [5, -3], [8, -3], [11, -3]], 0x2a5e32)
    },
  },
  lionheart: {
    plan: 'biped', torso: 'chest', tw: 9, legs: 'digi', hand: 'paw', foot: 'paw', arm: 4, tail: 'lion',
    fur: 0xe8a838, light: 0xfbe4a8, mane: 0xa84a20, mouth: [6, 6], faceY: -57,
    head(b, L, e) {
      const mane = b.part()
      b.ellipse(-3, 0, 12.5, 13, L.mane, mane)
      for (const [x, y] of [[-12, -8], [-14, 2], [-6, -12], [-8, 11], [3, -12], [-13, 8], [2, 12]]) b.ellipse(x, y, 4, 4, L.mane, mane)
      const ears = b.part()
      b.ellipse(-3, -9, 2.5, 2.5, L.fur, ears)
      b.ellipse(6, -9, 2.5, 2.5, L.fur, ears)
      const h = b.part()
      b.ellipse(2, 1, 8.5, 8.5, L.fur, h)
      b.ellipse(7, 5, 6, 4, L.light, h)
      eye(b, 0, -2, 'round', e, 0xc08020)
      eye(b, 6, -2, 'round', e, 0xc08020)
      b.dots([[6, 3], [7, 3], [8, 3], [7, 4]], 0x7a3a1a)
      b.dots([[4, 5], [3, 6], [10, 5]], 0xc08040)
      if (!e.shout) b.dots([[6, 6], [8, 6], [7, 5]], 0x7a3a1a)
    },
  },
  bearknuckle: {
    plan: 'biped', torso: 'barrel', tw: 11, legs: 'plant', hand: 'paw', foot: 'paw', arm: 5, leg: 5, tail: 'nub',
    fur: 0x8a5a32, light: 0xd8b080, clawHands: true, mouth: [8, 5], faceY: -57,
    head(b, L, e) {
      const ears = b.part()
      b.ellipse(-7, -8, 3.5, 3.5, L.fur, ears)
      b.ellipse(4, -10, 3.5, 3.5, L.fur, ears)
      const h = b.part()
      b.ellipse(-1, -1, 10, 9, L.fur, h)
      b.ellipse(7, 3, 6.5, 4.5, L.fur, h)
      b.ellipse(8, 4, 5, 3, L.light, h)
      b.dots([[-7, -8], [4, -10]], L.light)
      eye(b, 0, -3, 'dot', e)
      eye(b, 5, -3, 'dot', e)
      b.dots([[11, 1], [12, 1], [13, 1], [12, 2]], INK)
      if (!e.shout) b.dots([[9, 6], [10, 6], [11, 5]], INK)
      b.dots([[-5, 2], [-4, 3], [-3, 4], [-5, 4], [-3, 2]], WHITE)
    },
  },
  beestmode: {
    plan: 'bee', fur: 0xf2c40c, light: 0xffe27a, fuzz: 0xd89a10, mouth: [7, 5], faceY: -60,
    head(b, L, e) {
      const h = b.part()
      b.ellipse(0, 0, 9, 9, 0x2a2a34, h)
      b.ellipse(3, 2, 6, 6, L.fur, h)
      const eyes = b.part()
      b.ellipse(5, -2, 3.5, 5, 0x3a2a44, eyes)
      b.ellipse(-4, -2, 3, 4.5, 0x3a2a44, eyes)
      if (e.ko) b.dots([[4, -3], [6, -3], [5, -2], [4, -1], [6, -1]], WHITE)
      else if (e.hurt) b.dots([[4, -3], [5, -2], [4, -1]], WHITE)
      else if (!e.closed) b.dots([[5, -5], [6, -5], [5, -4], [-4, -4], [-3, -4]], WHITE)
      b.line(-1, -8, -4, -15, INK)
      b.line(3, -8, 6, -15, INK)
      b.dots([[-5, -16], [-4, -16], [-5, -15], [6, -16], [7, -16], [7, -15]], INK)
      if (!e.shout) b.dots([[5, 6], [6, 7], [7, 7], [8, 6]], INK)
    },
  },
  kickahorse: {
    plan: 'biped', torso: 'chest', tw: 9, legs: 'digi', hand: 'hoof', foot: 'hoof', arm: 4, tail: 'horse', longNeck: true,
    fur: 0xa86a3d, light: 0xdcae80, mane: 0x3a2010, mouth: [13, 7], faceY: -60,
    head(b, L, e) {
      const ear = b.part()
      b.poly([[-4, -8], [-2, -16], [1, -8]], L.fur, ear)
      const h = b.part()
      b.ellipse(-2, -3, 7, 7, L.fur, h)
      b.poly([[-4, -8], [4, -6], [16, 3], [15, 9], [8, 9], [-4, 3]], L.fur, h)
      b.ellipse(13, 6, 4.5, 4, L.light, h)
      const tuft = b.part()
      b.poly([[-5, -9], [3, -8], [0, -3]], L.mane, tuft)
      eye(b, 1, -3, 'round', e)
      b.dots([[15, 4], [15, 5], [2, 1], [5, 3]], 0x5a3418)
      if (!e.shout) b.line(11, 9, 15, 9, 0x5a3418)
    },
  },
  sharkitecture: {
    plan: 'fish', fur: 0x5a8ab8, light: 0xeef2f6, mouth: [10, 4], faceY: -58,
    head(b, L, e) {
      const h = b.part()
      b.poly([[-10, -7], [2, -9], [12, -4], [17, 1], [14, 5], [-10, 8]], L.fur, h)
      b.poly([[-10, 3], [15, 3], [13, 6], [-10, 8]], L.light, h)
      const hat = b.part()
      b.ellipse(-1, -9, 8, 4.5, 0xf2c40c, hat)
      b.rect(-10, -7, 20, 2, 0xf2c40c, hat)
      b.dots([[-1, -13], [-1, -12], [-1, -11]], 0xc98a0c)
      if (!e.shout) {
        b.line(3, 3, 14, 3, INK)
        for (let x = 4; x <= 13; x += 2) b.dot(x, 4, WHITE)
        for (let x = 5; x <= 13; x += 2) b.dot(x, 2, WHITE)
      }
      eye(b, 6, -2, 'dot', e)
    },
  },
  duckandcover: {
    plan: 'biped', torso: 'round', tw: 10, legs: 'bird', hand: 'wing', foot: 'webbed', arm: 4, tail: 'duck', neck: 0x2a8a4a,
    fur: 0x9a9aa0, light: 0x8a5a32, chestColor: 0x8a5a32, wingColor: 0x6a6a74, mouth: [11, 2], faceY: -57,
    head(b, L, e) {
      const h = b.part()
      b.ellipse(0, 0, 8.5, 8, 0x2a8a4a, h)
      const beak = b.part()
      b.poly([[5, -1], [15, 0], [17, 3], [15, 4], [5, 4]], 0xf29a1a, beak)
      if (!e.shout) b.line(6, 2, 16, 2, 0xb8600a)
      b.dots([[13, 0]], 0xb8600a)
      const helmet = b.part()
      b.ellipse(-1, -5, 9.5, 5.5, 0x5a6a2a, helmet)
      b.rect(-12, -3, 22, 2, 0x5a6a2a, helmet)
      b.dots([[-5, -8], [0, -7], [3, -9], [-3, -5]], 0x3a4a1a)
      b.line(-5, 7, 4, 7, WHITE)
      eye(b, 3, -1, 'round', e)
    },
  },
  hissterical: {
    plan: 'snake', fur: 0x4aa84a, light: 0xe8d870, pattern: 0x2e7a2e, mouth: [10, 2], faceY: -56,
    head(b, L, e) {
      const h = b.part()
      b.ellipse(1, 0, 9, 5.5, L.fur, h)
      b.ellipse(8, 1, 6, 4, L.fur, h)
      b.ellipse(5, 3, 8, 2, L.light, h)
      eye(b, 4, -2, 'slit', e, 0xf2d23a)
      b.dots([[-2, -3], [0, -4], [2, -4], [-4, -2], [-6, 0]], L.pattern)
      b.dots([[13, 0]], INK)
      if (e.tongue && !e.ko && !e.shout) b.dots([[14, 2], [15, 2], [16, 2], [17, 1], [17, 3]], 0xe0393e)
    },
  },
  crabbat: {
    plan: 'crab', fur: 0xe0503a, light: 0xf5a888, mouth: [11, 2], faceY: -46,
    head(b, L, e) {
      // Only the eyes on stalks — the crab's "head" is the front of its shell.
      const stalks = b.part()
      b.capsule(-2, 6, -3, -3, 1.2, 1.2, L.fur, stalks)
      b.capsule(5, 6, 6, -4, 1.2, 1.2, L.fur, stalks)
      b.ellipse(-3, -4, 2.8, 2.8, L.fur, stalks)
      b.ellipse(6, -5, 2.8, 2.8, L.fur, stalks)
      eye(b, -3, -4, 'round', e)
      eye(b, 6, -5, 'round', e)
    },
  },
  octopunch: {
    plan: 'octopus', fur: 0xd0508a, light: 0xf5a0c8, mouth: [3, 8], faceY: -52,
    head(b, L, e) {
      const h = b.part()
      b.ellipse(-1, -6, 11, 13, L.fur, h)
      b.ellipse(2, 4, 9, 6, L.fur, h)
      b.dots([[-6, -12], [-3, -15], [-8, -6], [1, -13], [-5, -9], [-9, -1]], L.light)
      eye(b, -1, 3, 'round', e)
      eye(b, 6, 3, 'round', e)
      if (!e.shout) b.dots([[3, 8], [4, 8], [3, 9], [4, 9]], 0x7a1a4a)
      b.dots([[-4, 6], [9, 6]], PINK)
    },
  },
  gorillawarfare: {
    plan: 'biped', torso: 'chest', tw: 12, legs: 'plant', hand: 'knuckle', foot: 'paw', arm: 5.5, leg: 5, longArms: true,
    hunch: 3, tail: null, fur: 0x3a3a44, light: 0x6a6a74, silver: 0xa8a8b4, mouth: [5, 5], faceY: -54,
    head(b, L, e) {
      const tails = b.part()
      b.poly([[-8, -8], [-16, -5], [-15, -3], [-8, -5]], 0xe0393e, tails)
      b.poly([[-8, -7], [-14, -1], [-12, 0], [-7, -5]], 0xe0393e, tails)
      const h = b.part()
      b.ellipse(-1, -2, 9.5, 9.5, L.fur, h)
      b.poly([[-6, -9], [-1, -14], [4, -9]], L.fur, h)
      b.ellipse(4, 2, 7.5, 6.5, 0x8a7a70, h)
      b.ellipse(4, -3, 7.5, 2, 0x2a2a30, h)
      const band = b.part()
      b.rect(-10, -9, 19, 3, 0xe0393e, band)
      eye(b, 2, -1, 'dot', e)
      eye(b, 7, -1, 'dot', e)
      b.dots([[6, 2], [8, 2], [5, 1], [9, 1]], 0x3a2a24)
      if (!e.shout) b.line(2, 5, 9, 5, 0x3a2a24)
    },
  },
  goatnglory: {
    plan: 'biped', torso: 'chest', tw: 8, legs: 'digi', hand: 'hoof', foot: 'hoof', arm: 3.5, tail: 'goat', longNeck: true,
    fur: 0xefe6d0, light: 0xffffff, medal: true, mouth: [9, 5], faceY: -60,
    head(b, L, e) {
      const horns = b.part()
      b.capsule(-2, -6, -8, -13, 2.2, 1.7, 0x8a6a48, horns)
      b.capsule(-8, -13, -14, -10, 1.7, 0.8, 0x8a6a48, horns)
      b.capsule(1, -7, -3, -15, 2.2, 1.5, 0x9a7a58, horns)
      b.capsule(-3, -15, -8, -15, 1.5, 0.8, 0x9a7a58, horns)
      b.dots([[-5, -10], [-7, -12], [-1, -11]], 0x5a4228)
      const ear = b.part()
      b.ellipse(-7, -2, 4, 1.8, L.fur, ear)
      const h = b.part()
      b.ellipse(-1, -2, 7, 7, L.fur, h)
      b.poly([[1, -6], [13, 1], [12, 6], [2, 5]], L.fur, h)
      const beard = b.part()
      b.poly([[4, 5], [10, 5], [6, 13]], 0xcfc0a0, beard)
      eye(b, 2, -2, 'goat', e)
      b.dots([[12, 1], [12, 2]], PINK)
      b.dots([[-7, -2], [-6, -2]], PINK)
    },
  },
  wolfpack: {
    plan: 'biped', torso: 'chest', tw: 8, legs: 'digi', hand: 'paw', foot: 'paw', arm: 3.5, tail: 'bushy',
    fur: 0x7a8494, light: 0xd4d8e0, mouth: [11, 5], faceY: -58,
    head(b, L, e) {
      const ears = b.part()
      b.poly([[-8, -5], [-6, -16], [-1, -7]], L.fur, ears)
      b.poly([[-1, -7], [2, -16], [5, -5]], L.fur, ears)
      b.dots([[-6, -12], [-5, -10], [2, -12], [2, -10]], 0x4a5260)
      const h = b.part()
      b.ellipse(-1, -1, 8, 8, L.fur, h)
      b.poly([[3, -3], [16, 1], [16, 4], [4, 6]], L.fur, h)
      b.ellipse(7, 4, 7, 2.5, L.light, h)
      b.ellipse(-4, 4, 4.5, 3.5, L.light, h)
      eye(b, 3, -3, 'slit', e, 0xf2d23a)
      b.dots([[15, 0], [16, 0], [15, 1], [16, 1]], INK)
      if (!e.shout) b.line(9, 6, 15, 4, 0x4a5260)
    },
  },
  rhinomite: {
    plan: 'biped', torso: 'barrel', tw: 12, legs: 'stump', hand: 'stump', foot: 'stump', arm: 5, tail: 'thin', folds: true,
    fur: 0x8f8f9c, light: 0xa8a8b4, dynamite: true, mouth: [11, 6], faceY: -56,
    head(b, L, e) {
      const ear = b.part()
      b.ellipse(-6, -9, 2, 4, L.fur, ear)
      const h = b.part()
      b.ellipse(-3, -1, 8, 8, L.fur, h)
      b.ellipse(7, 2, 8, 6.5, L.fur, h)
      const horn = b.part()
      b.poly([[9, -3], [17, -15], [14, -1]], 0xe8e0c8, horn)
      b.poly([[3, -5], [7, -11], [8, -4]], 0xe8e0c8, horn)
      eye(b, 0, -3, 'dot', e)
      b.dots([[13, 2], [-5, 2], [-4, 3], [-3, 2], [2, 4], [3, 5]], 0x62626e)
      if (!e.shout) b.line(8, 7, 14, 6, 0x62626e)
    },
  },
  frogment: {
    plan: 'biped', torso: 'round', tw: 9, legs: 'frog', hand: 'toepad', foot: 'webbed', arm: 3, tail: null,
    fur: 0x6cc24a, light: 0xd8f4b0, spots: 0x3a8a30, mouth: [3, 4], faceY: -54,
    head(b, L, e) {
      const bumps = b.part()
      b.ellipse(-4, -5, 4.5, 4.5, L.fur, bumps)
      b.ellipse(6, -6, 4.5, 4.5, L.fur, bumps)
      const h = b.part()
      b.ellipse(1, 2, 12, 7, L.fur, h)
      b.ellipse(2, 6, 9, 2.5, L.light, h)
      eye(b, -4, -5, 'big', e)
      eye(b, 6, -6, 'big', e)
      if (!e.shout) b.dots([[-8, 2], [-7, 3], [-6, 4], [-5, 4], [-4, 4], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 3], [11, 2]], 0x2a6a20)
      b.dots([[-7, 5], [10, 5]], PINK)
      b.dots([[-2, -1], [3, 0], [-7, 0]], L.spots)
    },
  },
}

// ---------- Limb helpers ----------

// Two-bone "inverse kinematics": where the elbow/knee goes so the hand/foot reaches the target.
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

// A bendy limb (tentacle, snake body) through a middle point, as a chain of tapering capsules.
function curve(b, pts, r0, r1, color, part) {
  const n = 8
  let [px, py] = pts[0]
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    const x = u * u * pts[0][0] + 2 * u * t * pts[1][0] + t * t * pts[2][0]
    const y = u * u * pts[0][1] + 2 * u * t * pts[1][1] + t * t * pts[2][1]
    b.capsule(px, py, x, y, r0 + (r1 - r0) * ((i - 1) / n), r0 + (r1 - r0) * t, color, part)
    px = x
    py = y
  }
}

function foot(b, L, type, fx, fy, color) {
  const f = b.part()
  switch (type) {
    case 'hoof':
      b.rect(fx - 2, fy - 4, 6, 4, 0x2e1c12, f)
      b.dots([[fx + 1, fy - 1]], 0x4a2e1e)
      break
    case 'stump':
      b.ellipse(fx + 1, fy - 2.5, 5.5, 2.8, color, f)
      b.dots([[fx + 3, fy - 1], [fx + 5, fy - 2], [fx + 1, fy - 1]], CLAW)
      break
    case 'webbed':
      b.poly([[fx - 3, fy - 3], [fx + 7, fy - 1], [fx + 7, fy], [fx - 4, fy]], L.plan === 'biped' && L.legs === 'frog' ? L.fur : 0xf29a1a, f)
      b.dots([[fx + 2, fy - 1], [fx + 5, fy - 1]], 0x3a2a3a)
      break
    case 'claw':
      b.ellipse(fx + 1, fy - 1.5, 4.5, 2, color, f)
      b.dots([[fx + 5, fy - 1], [fx + 6, fy], [fx + 3, fy]], CLAW)
      break
    case 'toepad':
      b.ellipse(fx + 1, fy - 1.5, 3.5, 1.8, color, f)
      b.dots([[fx + 5, fy - 2], [fx + 5, fy], [fx + 3, fy]], L.light)
      break
    default: // paw
      b.ellipse(fx + 1.5, fy - 2, 4.5, 2.4, color, f)
      b.dots([[fx + 4, fy - 1], [fx + 2, fy - 1]], 0x3a2a3a)
  }
}

function leg(b, L, hip, target, color) {
  const w = L.leg ?? (L.tw >= 11 ? 5 : L.tw <= 6 ? 3 : 4)
  const r = b.part()
  const [tx, ty] = target
  if (L.legs === 'digi' || L.legs === 'bird') {
    // Walks on its toes: the "backward knee" is really the ankle.
    const thin = L.legs === 'bird'
    const ankle = [tx - 3, ty - 6]
    const [kx, ky, ax, ay] = ik(hip[0], hip[1], ankle[0], ankle[1], 9, 8, -1)
    const lw = thin ? 1.3 : w
    const legColor = thin ? 0xf29a1a : color
    if (!thin) b.capsule(hip[0], hip[1], kx, ky, w + 0.5, w - 0.5, color, r)
    else b.capsule(hip[0], hip[1], kx, ky, 3.5, 2, L.fur, r)
    b.capsule(kx, ky, ax, ay, thin ? 1.3 : w - 0.5, lw - 0.5, legColor, r)
    b.capsule(ax, ay, tx, ty - 1, thin ? 1.2 : w - 1, thin ? 1.2 : w - 1.5, legColor, r)
  } else if (L.legs === 'frog') {
    // Big folded frog legs: fat thigh, knee sticks out forward.
    const [kx, ky, fx, fy] = ik(hip[0], hip[1] + 3, tx, ty, 11, 11, -1)
    b.capsule(hip[0], hip[1] + 3, kx, ky, 5.5, 4, color, r)
    b.capsule(kx, ky, fx, fy - 1, 3.5, 2, color, r)
    b.dots([[kx - 2, ky - 1], [hip[0] + 1, hip[1] + 4]], L.spots)
  } else {
    const stump = L.legs === 'stump'
    const len = stump ? 8.5 : 10
    const [kx, ky, fx, fy] = ik(hip[0], hip[1], tx, ty, len, len, -1)
    b.capsule(hip[0], hip[1], kx, ky, w + (stump ? 1.5 : 0.5), w + (stump ? 1 : 0), color, r)
    b.capsule(kx, ky, fx, fy - 1, w + (stump ? 1 : 0), w - (stump ? 0 : 1), color, r)
  }
  foot(b, L, L.foot, tx, ty, color)
}

function hand(b, L, type, hx, hy, ang, color) {
  const g = b.part()
  const cx = Math.cos(ang)
  const cy = Math.sin(ang)
  switch (type) {
    case 'hoof':
      b.capsule(hx - cx, hy - cy, hx + cx * 2, hy + cy * 2, 3, 3, 0x2e1c12, g)
      break
    case 'stump':
      b.ellipse(hx + cx, hy + cy, 4.5, 4.5, color, g)
      b.dots([[hx + cx * 4, hy + cy * 4 - 1], [hx + cx * 4, hy + cy * 4 + 1]], CLAW)
      break
    case 'claw':
      b.ellipse(hx + cx, hy + cy, 3.5, 3.2, color, g)
      b.dots([[hx + cx * 5, hy + cy * 5 - 1], [hx + cx * 5, hy + cy * 5 + 1], [hx + cx * 4 + 1, hy + cy * 4 + 2]], CLAW)
      break
    case 'toepad':
      b.ellipse(hx + cx, hy + cy, 2.8, 2.8, color, g)
      b.dots([[hx + cx * 4 - cy * 2, hy + cy * 4 + cx * 2], [hx + cx * 4 + cy * 2, hy + cy * 4 - cx * 2], [hx + cx * 5, hy + cy * 5]], L.light)
      break
    case 'knuckle':
      b.ellipse(hx + cx, hy + cy, 5, 4.5, 0x2a2a30, g)
      b.dots([[hx + cx * 4, hy + cy * 4 - 2], [hx + cx * 4, hy + cy * 4], [hx + cx * 4, hy + cy * 4 + 2]], 0x6a6a74)
      break
    case 'fin':
      b.poly([[hx - cx * 6 - cy * 3, hy - cy * 6 + cx * 3], [hx + cx * 4, hy + cy * 4], [hx - cx * 6 + cy * 3, hy - cy * 6 - cx * 3], [hx - cx * 3 + cy * 7, hy - cy * 3 - cx * 7]], color, g)
      break
    case 'wing':
      // Feather tips fanned out at the end of the wing
      for (let i = -1; i <= 1; i++) b.capsule(hx - cx * 2, hy - cy * 2, hx + cx * 5 - cy * i * 3, hy + cy * 5 + cx * i * 3, 2, 1, i === 0 ? L.wingColor : 0x4a4a54, g)
      b.dots([[hx - cx * 3, hy - cy * 3 + 1]], 0x3a8ae0)
      break
    default: // paw
      b.ellipse(hx + cx, hy + cy, 4, 3.8, color, g)
      b.dots([[hx + cx * 3 - cy, hy + cy * 3 + cx], [hx + cx * 3 + cy, hy + cy * 3 - cx]], 0x3a2a3a)
      if (L.clawHands) b.dots([[hx + cx * 5, hy + cy * 5 - 1], [hx + cx * 5, hy + cy * 5 + 1]], CLAW)
  }
}

function arm(b, L, shoulder, target, color) {
  const w = L.arm ?? 4
  const len = L.longArms ? 12.5 : 10
  const [ex, ey, hx, hy] = ik(shoulder[0], shoulder[1], target[0], target[1], len, len, 1)
  const r = b.part()
  const armColor = L.hand === 'wing' ? L.wingColor : color
  b.capsule(shoulder[0], shoulder[1], ex, ey, w + 0.5, w, armColor, r)
  b.capsule(ex, ey, hx, hy, w, w - 0.8, armColor, r)
  if (L.silver) b.dots([[shoulder[0] - 1, shoulder[1] - 1]], L.silver)
  hand(b, L, L.hand, hx, hy, Math.atan2(hy - ey, hx - ex), color)
}

function tail(b, L, clock, base) {
  const [tx, ty] = base
  const wag = Math.sin(clock * 5) * 2
  const r = b.part()
  switch (L.tail) {
    case 'nub':
      b.ellipse(tx - 1, ty, 2.5, 2.5, L.fur, r)
      break
    case 'thin':
      b.capsule(tx, ty, tx - 5, ty + 6 + wag * 0.5, 1.4, 1, L.fur, r)
      b.ellipse(tx - 5, ty + 7 + wag * 0.5, 1.8, 2.2, 0x4a3a50, b.part())
      break
    case 'goat':
      b.poly([[tx + 1, ty - 1], [tx - 4, ty - 7 + wag * 0.3], [tx - 1, ty + 2]], L.fur, r)
      break
    case 'lion':
      curve(b, [[tx, ty], [tx - 10, ty + 8], [tx - 13, ty - 5 + wag]], 1.6, 1.2, L.fur, r)
      b.ellipse(tx - 13, ty - 6 + wag, 3, 3.5, L.mane, b.part())
      break
    case 'lizard':
    case 'croc': {
      const big = L.tail === 'croc' ? 1.8 : 0
      curve(b, [[tx + 2, ty + 1], [tx - 12, ty + 14], [tx - 22, ty + 20 + wag * 0.3]], 4 + big, 0.8, L.fur, r)
      if (big) b.dots([[tx - 3, ty], [tx - 7, ty + 5], [tx - 11, ty + 9], [tx - 15, ty + 13], [tx - 19, ty + 16]], 0x2a5e32)
      else b.dots([[tx - 6, ty + 6], [tx - 13, ty + 12]], L.spots)
      break
    }
    case 'bushy':
      curve(b, [[tx, ty], [tx - 9, ty + 1], [tx - 13, ty + 6 + wag]], 2.5, 4.5, L.fur, r)
      b.ellipse(tx - 14, ty + 8 + wag, 3.5, 3, L.light, r)
      break
    case 'horse':
      curve(b, [[tx, ty - 2], [tx - 9, ty + 4], [tx - 7 + wag * 0.5, ty + 18]], 2.5, 3.5, L.mane, r)
      break
    case 'duck':
      b.poly([[tx + 2, ty - 3], [tx - 7, ty - 8], [tx - 6, ty + 1]], L.fur, r)
      b.dots([[tx - 5, ty - 6], [tx - 4, ty - 3]], 0x2a2a34)
      break
    default:
  }
}

// ---------- Body blueprints ----------

function biped(b, L, p, clock) {
  const { lean, bob } = p
  const tw = L.tw
  const limb = L.limbs ?? L.fur
  const hunch = L.hunch ?? 0
  const hipY = L.legs === 'stump' ? -16 : L.legs === 'frog' ? -14 : -19
  const hipB = [-3, hipY]
  const hipF = [4, hipY]
  const chestX = 1 + lean * 0.8 + hunch
  const chestY = -36 + bob + (L.legs === 'frog' ? 3 : 0) + (L.torso === 'barrel' ? 1 : 0)
  const shB = [chestX - 5, chestY - 4]
  const shF = [chestX + 4, chestY - 4]

  tail(b, L, clock, [-tw + 2, hipY - 3])
  leg(b, L, hipB, p.feet[0], limb)
  arm(b, L, shB, p.hands[0], limb)

  // Torso shape depends on the animal's build
  const t = b.part()
  const [r0, r1] = { barrel: [tw + 2, tw - 1], chest: [tw - 2, tw + 2], round: [tw + 1, tw], slim: [tw, tw] }[L.torso]
  b.capsule(0, hipY - 4, chestX, chestY, r0, r1, L.fur, t)
  if (L.torso === 'round') b.ellipse(1 + lean * 0.4, (hipY + chestY) / 2, tw + 2, tw + 3, L.fur, t)
  // Belly / chest colors
  if (L.chestColor) b.ellipse(chestX + 3, chestY + 3, tw - 2, tw - 3, L.chestColor, t)
  else b.capsule(3, hipY - 4, chestX + 2, chestY + 2, r0 - 4, r1 - 4, L.light, t)
  if (L.band) b.capsule(chestX - tw, chestY - 3, chestX + tw, chestY - 3, 3.5, 3.5, L.band, t)
  if (L.silver) b.capsule(chestX - tw + 1, chestY - 2, -tw + 3, hipY - 2, 3, 2.5, L.silver, t)
  if (L.scutes) for (let y = hipY - 2; y > chestY; y -= 3) b.line(chestX - 1, y, chestX + 5, y, 0xa8b870)
  if (L.folds) {
    b.line(chestX - 4, chestY - 2, chestX - 6, chestY + 6, 0x62626e)
    b.line(-3, hipY - 1, -6, hipY - 7, 0x62626e)
  }
  if (L.spots) b.dots([[chestX - 4, chestY + 2], [chestX - 2, chestY + 8], [-3, hipY - 4]], L.spots)

  leg(b, L, hipF, p.feet[1], limb)

  // Neck (and mane)
  const headX = 2 + lean * 1.2 + hunch + (L.longNeck ? 3 : 0)
  const headY = -56 + bob + (L.legs === 'frog' ? 3 : 0) + (hunch ? 2 : 0) - (L.longNeck ? 3 : 0)
  if (L.mane && L.tail === 'lion') b.ellipse(chestX - 1, chestY - 6, tw + 3, 8, L.mane, b.part())
  const neck = b.part()
  b.capsule(chestX + 1, chestY - 6, headX - 1, headY + 5, tw * 0.5, tw * 0.4, L.neck ?? L.fur, neck)
  if (L.tail === 'horse') b.capsule(chestX - 3, chestY - 4, headX - 5, headY - 3, 2.5, 3, L.mane, neck)

  b.origin(FOOT_X + headX, FOOT_Y + headY)
  L.head(b, L, p.expr)
  mouth(b, L.mouth, p.expr)
  b.origin(FOOT_X, FOOT_Y)

  arm(b, L, shF, p.hands[1], limb)

  if (L.medal) {
    b.line(chestX - 3, chestY - 5, chestX + 1, chestY + 1, 0x2b7de0)
    b.line(chestX + 5, chestY - 5, chestX + 2, chestY + 1, 0xe0393e)
    b.dots([[chestX + 1, chestY + 2], [chestX + 2, chestY + 2], [chestX + 1, chestY + 3], [chestX + 2, chestY + 3], [chestX, chestY + 3], [chestX + 3, chestY + 3], [chestX + 1, chestY + 4], [chestX + 2, chestY + 4]], 0xf2c40c)
    b.dot(chestX + 1, chestY + 2, 0xfff4b0)
  }
  if (L.dynamite) {
    const dx = tw - 3
    for (let y = hipY - 6; y <= hipY - 2; y++) b.dots([[dx, y], [dx + 1, y]], 0xe0393e)
    b.dots([[dx + 1, hipY - 7], [dx + 2, hipY - 8]], 0x6a4a2a)
    if (Math.sin(clock * 20) > 0) b.dot(dx + 3, hipY - 9, 0xffe27a)
  }
  if (L.silver) b.line(-tw + 2, hipY - 6, -tw + 4, chestY + 2, 0xc8c8d0)
}

function snake(b, L, p, clock) {
  const { lean, bob } = p
  const sway = Math.sin(clock * 3) * 1.5
  // Coil on the ground
  const coil = b.part()
  b.ellipse(-1, -5, 14, 5.5, L.fur, coil)
  b.dots([[-10, -6], [-4, -8], [3, -8], [9, -6]], L.pattern)
  const coil2 = b.part()
  b.ellipse(0, -11, 10, 4.5, L.fur, coil2)
  b.dots([[-6, -12], [0, -14], [5, -12]], L.pattern)
  // Tail tip: whips forward for a kick
  const kicking = p.feet[1][1] < -8
  if (kicking) curve(b, [[10, -7], [22, -6], p.feet[1]], 3, 1.2, L.fur, b.part())
  else curve(b, [[-12, -6], [-19, -5], [-20, -11 + sway]], 2.5, 0.8, L.fur, b.part())
  // Head position: strikes forward on a punch
  const striking = p.hands[1][0] > 24
  const headX = striking ? p.hands[1][0] - 8 : 4 + lean * 1.5
  const headY = striking ? p.hands[1][1] - 8 : -56 + bob + (p.expr.hurt ? 2 : 0)
  // Hood behind the head (cobra!)
  const body = b.part()
  const mid = [-3 + sway + lean * 0.5, -28 + bob]
  curve(b, [[-2, -13], mid, [headX - 4, headY + 6]], 6, 4.5, L.fur, body)
  b.ellipse(headX - 4, headY + 4, 7, 10, 0x3a8a3a, body)
  b.dots([[headX - 6, headY + 1], [headX - 5, headY + 2], [headX - 7, headY + 2], [headX - 6, headY + 7], [headX - 5, headY + 8], [headX - 7, headY + 8]], L.light)
  // Belly scales down the front
  for (let i = 0; i < 7; i++) {
    const t = i / 7
    const x = (1 - t) * (1 - t) * -2 + 2 * (1 - t) * t * mid[0] + t * t * (headX - 4)
    const y = (1 - t) * (1 - t) * -13 + 2 * (1 - t) * t * mid[1] + t * t * (headY + 6)
    b.line(x + 2, y, x + 4, y, L.light)
  }
  b.origin(FOOT_X + headX, FOOT_Y + headY)
  L.head(b, L, p.expr)
  mouth(b, L.mouth, p.expr)
  b.origin(FOOT_X, FOOT_Y)
}

function octopus(b, L, p, clock) {
  const { lean, bob } = p
  const bx = 1 + lean
  const by = -40 + bob
  const tentacle = (from, to, ph, part) => {
    const w = Math.sin(clock * 4 + ph) * 3
    curve(b, [from, [(from[0] + to[0]) / 2 + w, (from[1] + to[1]) / 2 + 2], to], 3.5, 1.2, L.fur, part)
    b.dots([[(from[0] + to[0]) / 2 + w + 1, (from[1] + to[1]) / 2 + 4], [to[0] - 2, to[1] - 1]], L.light)
  }
  // Arm tentacle ending in a curled "fist"
  const armT = (from, to, part) => {
    const [ex, ey] = ik(from[0], from[1], to[0], to[1], 11, 11, 1)
    curve(b, [from, [ex, ey], to], 3.2, 2.4, L.fur, part)
    b.ellipse(to[0], to[1], 3.5, 3.2, L.fur, b.part())
    b.dots([[to[0] - 1, to[1] + 1], [to[0] + 1, to[1] + 2]], L.light)
  }
  const back = b.part()
  tentacle([bx - 6, by + 2], [-15, -1], 0, back)
  tentacle([bx + 6, by + 2], [17, -1], 2, back)
  armT([bx - 5, by - 2], p.hands[0], b.part())
  const legs = b.part()
  tentacle([bx - 3, by + 3], p.feet[0], 1, legs)
  tentacle([bx + 3, by + 3], p.feet[1], 3, legs)
  tentacle([bx, by + 4], [2, 0], 4, legs)
  b.origin(FOOT_X + bx, FOOT_Y + by - 8)
  L.head(b, L, p.expr)
  mouth(b, L.mouth, p.expr)
  b.origin(FOOT_X, FOOT_Y)
  armT([bx + 5, by - 1], p.hands[1], b.part())
}

function crab(b, L, p, clock) {
  const { lean, bob } = p
  const sx = lean * 0.6
  const sy = -24 + bob
  // Three bent legs per side, splayed out like a real crab's
  const legSet = (side, target, rest, part) => {
    const shift = (target[0] - rest) * 0.5
    for (let i = 0; i < 3; i++) {
      const root = [sx + side * (7 + i * 3), sy + 2]
      const kick = target[1] < -4 && i === 0
      const lift = Math.sin(clock * 12 + i * 2 + side) > 0.6 && Math.abs(shift) > 1 ? -2 : 0
      const knee = [root[0] + side * (7 + i * 2), sy - 9 + i * 2]
      const foot = kick ? target : [root[0] + side * (13 + i * 3) + shift, lift]
      b.capsule(root[0], root[1], knee[0], knee[1], 2, 1.6, L.fur, part)
      b.capsule(knee[0], knee[1], foot[0], foot[1], 1.6, 0.8, L.fur, part)
      b.dot(knee[0], knee[1] - 1, L.light)
    }
  }
  legSet(-1, p.feet[0], -7, b.part())
  // Claws
  const claw = (shoulder, target) => {
    const [ex, ey, hx, hy] = ik(shoulder[0], shoulder[1], target[0], target[1], 10, 10, 1)
    const r = b.part()
    b.capsule(shoulder[0], shoulder[1], ex, ey, 2.2, 2, L.fur, r)
    b.capsule(ex, ey, hx, hy, 2, 2.2, L.fur, r)
    const ang = Math.atan2(hy - ey, hx - ex)
    const cx = hx + Math.cos(ang) * 3
    const cy = hy + Math.sin(ang) * 3
    b.ellipse(cx, cy, 5.5, 4.5, L.fur, b.part())
    const tips = b.part()
    b.capsule(cx + Math.cos(ang) * 3, cy + Math.sin(ang) * 3 - 2, cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8 - 3, 2.2, 1, L.fur, tips)
    b.capsule(cx + Math.cos(ang) * 3, cy + Math.sin(ang) * 3 + 2, cx + Math.cos(ang) * 7, cy + Math.sin(ang) * 7 + 3, 1.8, 0.8, L.fur, tips)
  }
  claw([sx - 4, sy - 2], p.hands[0])
  // Shell
  const shell = b.part()
  b.ellipse(sx, sy, 16, 9, L.fur, shell)
  b.ellipse(sx + 2, sy - 3, 11, 4, L.light, shell)
  b.dots([[sx - 8, sy - 2], [sx - 4, sy - 4], [sx + 6, sy - 5], [sx + 10, sy - 1], [sx - 11, sy + 2]], 0xfff0e0)
  b.line(sx - 12, sy + 5, sx + 12, sy + 5, 0xb03a2a)
  if (!p.expr.shout) b.dots([[sx + 12, sy + 1], [sx + 13, sy + 2], [sx + 11, sy + 2]], INK)
  else b.dots([[sx + 11, sy + 1], [sx + 12, sy + 1], [sx + 11, sy + 2], [sx + 12, sy + 2], [sx + 13, sy + 2]], INK)
  legSet(1, p.feet[1], 8, b.part())
  b.origin(FOOT_X + sx + 4, FOOT_Y + sy - 12)
  L.head(b, L, p.expr)
  b.origin(FOOT_X, FOOT_Y)
  claw([sx + 8, sy - 2], p.hands[1])
}

function fish(b, L, p) {
  const { lean, bob } = p
  const topX = 2 + lean
  const topY = -46 + bob
  // Stands on its tail fin; the fin swings forward for a kick.
  const kicking = p.feet[1][1] < -8
  const baseX = kicking ? 2 : 0
  const tailEnd = kicking ? p.feet[1] : [0, -3]
  const t = b.part()
  b.capsule(baseX, -12, tailEnd[0], tailEnd[1], 5, 3, L.fur, t)
  const fin = b.part()
  const [fx, fy] = tailEnd
  if (kicking) b.poly([[fx - 1, fy - 2], [fx + 9, fy - 10], [fx + 5, fy], [fx + 9, fy + 9], [fx - 1, fy + 2]], L.fur, fin)
  else b.poly([[fx - 1, fy - 3], [fx - 14, fy + 3], [fx - 5, fy + 2], [fx, fy - 1], [fx + 5, fy + 2], [fx + 14, fy + 3], [fx + 1, fy - 3]], L.fur, fin)
  arm(b, { ...L, hand: 'fin', arm: 2.5 }, [topX - 5, topY + 10], p.hands[0], L.fur)
  // Dorsal fin
  b.poly([[topX - 6, topY + 2], [topX - 16, topY - 6], [topX - 10, topY + 8]], L.fur, b.part())
  // Body: dark on top, white belly (like a real shark)
  const body = b.part()
  b.capsule(baseX, -12, topX, topY, 6, 10.5, L.fur, body)
  b.capsule(baseX + 3, -13, topX + 4, topY + 2, 3, 7, L.light, body)
  b.dots([[topX - 3, topY + 4], [topX - 3, topY + 6], [topX - 1, topY + 5], [topX - 1, topY + 7], [topX + 1, topY + 6], [topX + 1, topY + 8]], 0x3a5e88)
  b.origin(FOOT_X + topX + 1, FOOT_Y + topY - 8)
  L.head(b, L, p.expr)
  mouth(b, L.mouth, p.expr)
  b.origin(FOOT_X, FOOT_Y)
  arm(b, { ...L, hand: 'fin', arm: 2.5 }, [topX + 3, topY + 10], p.hands[1], L.fur)
}

function bee(b, L, p, clock) {
  const hover = -6 + Math.round(Math.sin(clock * 6) * 1.5)
  const { lean, bob } = p
  const tx = 1 + lean
  const ty = -38 + bob + hover
  const flap = Math.sin(clock * 30) > 0 ? 1 : 0
  // Wings
  const w = b.part()
  b.ellipse(tx - 8, ty - 9 - flap * 2, 8, 3.5 + flap, 0xd8ecff, w, FLAT)
  b.ellipse(tx - 5, ty - 13 - flap * 2, 6, 3 + flap, 0xeef6ff, w, FLAT)
  b.line(tx - 14, ty - 9 - flap * 2, tx - 3, ty - 9 - flap * 2, 0xa8c8e8)
  // Striped abdomen with stinger, hanging behind
  const ab = b.part()
  b.capsule(tx - 3, ty + 2, tx - 11, ty + 12, 6.5, 4.5, L.fur, ab)
  b.capsule(tx - 6, ty + 1, tx - 3, ty + 9, 1.5, 1.5, 0x2a2a34, ab)
  b.capsule(tx - 10, ty + 4, tx - 7, ty + 13, 1.5, 1.5, 0x2a2a34, ab)
  b.poly([[tx - 13, ty + 14], [tx - 17, ty + 20], [tx - 10, ty + 16]], INK, ab)
  // Thin insect legs dangle while it hovers (and kick out for a kick)
  const legs = (target, part) => {
    const kicking = target[1] < -12
    const fx = kicking ? target[0] : tx + target[0] * 0.5
    const fy = kicking ? target[1] + hover : ty + 17 + Math.sin(clock * 6 + target[0]) * 1.5
    const [kx, ky] = ik(tx, ty + 5, fx, fy, 8, 9, -1)
    b.capsule(tx, ty + 5, kx, ky, 1.4, 1.1, 0x2a2a34, part)
    b.capsule(kx, ky, fx, fy, 1.1, 0.9, 0x2a2a34, part)
    b.capsule(fx, fy, fx + 3, fy + 1, 1, 0.8, 0x2a2a34, part)
  }
  legs(p.feet[0], b.part())
  const armP = (sh, target) => {
    const [ex, ey, hx, hy] = ik(sh[0], sh[1], target[0], target[1], 10, 10, 1)
    const r = b.part()
    b.capsule(sh[0], sh[1], ex, ey, 1.6, 1.3, 0x2a2a34, r)
    b.capsule(ex, ey, hx, hy, 1.3, 1.1, 0x2a2a34, r)
    b.ellipse(hx, hy, 2.2, 2.2, 0x2a2a34, b.part())
  }
  armP([tx - 3, ty - 3], p.hands[0])
  // Fuzzy thorax
  const th = b.part()
  b.ellipse(tx, ty, 8, 8, L.fuzz, th)
  b.ellipse(tx + 2, ty - 1, 5, 5, L.fur, th)
  for (const [x, y] of [[-8, -2], [-7, 3], [-5, -6], [6, -6], [8, 1], [3, 7], [-2, 7]]) b.dot(tx + x, ty + y, L.light)
  legs(p.feet[1], b.part())
  b.origin(FOOT_X + tx + 3 + lean * 0.3, FOOT_Y + ty - 14)
  L.head(b, L, p.expr)
  mouth(b, L.mouth, p.expr)
  b.origin(FOOT_X, FOOT_Y)
  armP([tx + 4, ty - 3], p.hands[1])
}

const PLANS = { biped, snake, octopus, crab, fish, bee }

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
  b.clear()
  b.origin(FOOT_X, FOOT_Y)
  PLANS[L.plan ?? 'biped'](b, L, p, clock)
  return b.finish()
}

export function faceY(def) {
  return LOOKS[def.key].faceY ?? -56
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
  const fy = FOOT_Y + faceY(def)
  const [x, y, w, h] = kind === 'head' ? [FOOT_X - 18, fy - 18, 40, 36] : [FOOT_X - 32, FOOT_Y - 84, 64, 88]
  c.width = w
  c.height = h
  c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h)
  stills.set(key, c)
  return c
}
