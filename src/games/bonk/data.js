export const W = 960
export const H = 640
export const CX = W / 2
export const CY = H / 2 + 10

export const BASE_R = 17
export const RULE_EVERY = 20
export const WINS_TO_WIN = 3

// Every hammer trades speed for power. `sound` picks the hit noise and the
// comic-book word that pops up.
export const HAMMERS = {
  mallet: {
    name: 'Mallet',
    emoji: '🔨',
    reach: 56,
    arc: 1.7,
    swing: 0.3,
    cooldown: 0.4,
    power: 330,
    dmg: 14,
    sound: 'bonk',
  },
  sledge: {
    name: 'Sledgehammer',
    emoji: '⚒️',
    reach: 70,
    arc: 1.4,
    swing: 0.55,
    cooldown: 0.75,
    power: 500,
    dmg: 24,
    sound: 'bonk',
  },
  squeaky: {
    name: 'Squeaky Hammer',
    emoji: '🎈',
    reach: 50,
    arc: 2.0,
    swing: 0.17,
    cooldown: 0.18,
    power: 230,
    dmg: 9,
    sound: 'squeak',
  },
  pan: {
    name: 'Frying Pan',
    emoji: '🍳',
    reach: 54,
    arc: 2.5,
    swing: 0.32,
    cooldown: 0.45,
    power: 360,
    dmg: 15,
    sound: 'bong',
  },
  fish: {
    name: 'Wet Fish',
    emoji: '🐟',
    reach: 66,
    arc: 1.9,
    swing: 0.26,
    cooldown: 0.35,
    power: 300,
    dmg: 12,
    sound: 'slap',
  },
}

export const HIT_WORDS = {
  bonk: ['BONK!', 'BONK!', 'BOINK!', 'WHAM!', 'POW!'],
  squeak: ['SQUEAK!', 'EEK!', 'SQUONK!'],
  bong: ['BONG!', 'CLANG!', 'DOINNG!'],
  slap: ['SLAP!', 'FWAP!', 'SPLOOSH!'],
  mega: ['MEGA PUNCH!!', 'KA-POW!!', 'SUPER BONK!!'],
}

export const RULES = [
  { key: 'bigheads', name: 'BIG HEADS', emoji: '🗿', desc: 'Everyone gets huge heads.' },
  { key: 'lowgrav', name: 'LOW GRAVITY', emoji: '🌙', desc: 'Players fly everywhere.' },
  { key: 'tiny', name: 'TINY PLAYERS', emoji: '🐜', desc: 'Everyone becomes tiny.' },
  { key: 'quake', name: 'EARTHQUAKE', emoji: '🌎', desc: 'The whole arena shakes.' },
  { key: 'mega', name: 'MEGA PUNCH', emoji: '👊', desc: 'Everyone gets one enormous punch.' },
  { key: 'ice', name: 'ICE RINK', emoji: '🧊', desc: 'The floor is super slippery.' },
  { key: 'speed', name: 'SUPER SPEED', emoji: '⚡', desc: 'Everyone zooms around.' },
  { key: 'giant', name: 'GIANT HAMMERS', emoji: '🔨', desc: 'Hammers are ENORMOUS.' },
  { key: 'bouncy', name: 'BOUNCY CASTLE', emoji: '🏀', desc: 'Bumping into someone launches you both.' },
]

export const CHARACTERS = [
  { key: 'freddy', name: 'Freddy', color: '#a0662e', dark: '#5e3a18', light: '#e8c08a', ears: 'bear' },
  { key: 'bonnie', name: 'Bonnie', color: '#7b5cd6', dark: '#45308a', light: '#cdbcf7', ears: 'bunny' },
  { key: 'chica', name: 'Chica', color: '#f2c40c', dark: '#9c7c00', light: '#fff3b8', ears: 'chick' },
  { key: 'foxy', name: 'Foxy', color: '#d9542b', dark: '#80280f', light: '#f7cfae', ears: 'fox' },
]

// Keyboard layouts. Solo mode accepts both halves of the keyboard.
export const SCHEMES = {
  solo: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    bonk: ['Space', 'KeyJ', 'Enter'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
    shield: ['KeyE', 'KeyL'],
  },
  p1: {
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    bonk: ['Space'],
    dash: ['ShiftLeft'],
    shield: ['KeyE'],
  },
  p2: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    bonk: ['Enter', 'Period'],
    dash: ['ShiftRight', 'Comma'],
    shield: ['Slash', 'KeyM'],
  },
}

export const GAME_KEYS = new Set(
  Object.values(SCHEMES).flatMap((s) => Object.values(s).flat()),
)

export const SKIES = [
  { top: '#6ec3f4', bottom: '#d6f0ff', cloud: 'rgba(255,255,255,0.8)', stars: false },
  { top: '#ff8a5c', bottom: '#ffd98e', cloud: 'rgba(255,236,220,0.75)', stars: false },
  { top: '#141a3d', bottom: '#3d2a6b', cloud: 'rgba(160,150,220,0.35)', stars: true },
]

export const GROUNDS = [
  { a: '#7ccf4f', b: '#6cbd42', side: '#8b5a2b', edge: '#5d3b19' },
  { a: '#ff9ecf', b: '#ff87c0', side: '#b3588a', edge: '#7a3560' },
  { a: '#eef6ff', b: '#dcebfb', side: '#7d8fa8', edge: '#56657a' },
  { a: '#f1d58a', b: '#e7c86f', side: '#b07d3b', edge: '#7a5220' },
]
