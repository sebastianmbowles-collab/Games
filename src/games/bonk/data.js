// Arena coordinates: x/y is the floor, z is height. 1 unit ≈ 1 pixel of the old 2D game.
export const W = 960
export const H = 640
export const CX = W / 2
export const CY = H / 2
export const TILE = 40
export const BASE_R = 17
export const START_BALLOONS = 3
export const EVENT_EVERY = 20

export const HAMMERS = {
  mallet: { name: 'Mallet', emoji: '🔨', reach: 56, arc: 1.7, swing: 0.3, cooldown: 0.4, power: 1, color: '#9aa1ad', sound: 'bonk' },
  sledge: { name: 'Sledgehammer', emoji: '⚒️', reach: 70, arc: 1.4, swing: 0.55, cooldown: 0.75, power: 1.5, color: '#4b515e', sound: 'bonk' },
  squeaky: { name: 'Squeaky Hammer', emoji: '🎈', reach: 50, arc: 2.0, swing: 0.17, cooldown: 0.18, power: 0.7, color: '#ff4d6d', sound: 'squeak' },
  pan: { name: 'Frying Pan', emoji: '🍳', reach: 54, arc: 2.5, swing: 0.32, cooldown: 0.45, power: 1.1, color: '#2a2a33', sound: 'bong' },
  fish: { name: 'Wet Fish', emoji: '🐟', reach: 66, arc: 1.9, swing: 0.26, cooldown: 0.35, power: 0.9, color: '#6fa8dc', sound: 'slap' },
  golden: { name: 'GOLDEN HAMMER', emoji: '✨', reach: 80, arc: 2.2, swing: 0.3, cooldown: 0.4, power: 2.6, color: '#ffd700', sound: 'bong', pops: 2 },
  king: { name: 'King Hammer', emoji: '👑', reach: 95, arc: 2.0, swing: 0.45, cooldown: 0.5, power: 2.2, color: '#ffb300', sound: 'bonk', pops: 2 },
}

export const HIT_WORDS = {
  bonk: ['BONK!', 'BONK!', 'BOINK!', 'WHAM!', 'POW!'],
  squeak: ['SQUEAK!', 'EEK!', 'SQUONK!'],
  bong: ['BONG!', 'CLANG!', 'DOINNG!'],
  slap: ['SLAP!', 'FWAP!', 'SPLOOSH!'],
  mega: ['MEGA BONK!!', 'KA-POW!!', 'SUPER BONK!!'],
}

// `flags` are the rule switches the engine reads; a combo event just lists several.
export const EVENTS = [
  { key: 'megabonk', name: 'MEGA BONK', emoji: '🔨', desc: 'Everyone gets a giant hammer for 15 seconds.', flags: ['giant'], time: 15 },
  { key: 'lowgrav', name: 'LOW GRAVITY', emoji: '🌙', desc: 'Jump super high and fly much farther when hit.', flags: ['lowgrav'] },
  { key: 'quake', name: 'EARTHQUAKE', emoji: '🌎', desc: 'The arena shakes and small pieces fall away.', flags: ['quake'] },
  { key: 'tiny', name: 'TINY BONK', emoji: '🐜', desc: 'Everyone becomes tiny, including their weapons.', flags: ['tiny'] },
  { key: 'huge', name: 'GIANT BONK', emoji: '🗿', desc: 'Everyone becomes enormous.', flags: ['huge'] },
  { key: 'ice', name: 'SLIPPERY FLOOR', emoji: '🧊', desc: 'The entire arena becomes ice.', flags: ['ice'] },
  { key: 'meteors', name: 'METEOR SHOWER', emoji: '☄️', desc: 'Meteors crash into random parts of the arena.', flags: ['meteors'] },
  { key: 'bombs', name: 'BOMB BALLS', emoji: '💣', desc: 'Bouncy balls everywhere. Touching one launches you.', flags: ['bombs'] },
  { key: 'lava', name: 'RISING LAVA', emoji: '🌋', desc: 'The arena slowly shrinks as the lava rises.', flags: ['lava'] },
  { key: 'wind', name: 'WIND BLAST', emoji: '🌪️', desc: 'Powerful gusts push everyone toward one side.', flags: ['wind'] },
  { key: 'wings', name: 'EVERYONE HAS WINGS', emoji: '🪽', desc: 'Press jump in the air to flap!', flags: ['wings'] },
  { key: 'randombonk', name: 'RANDOM BONK', emoji: '🎲', desc: 'Every few seconds, one random duck gets launched.', flags: ['randombonk'] },
  { key: 'boxes', name: 'MYSTERY BOXES', emoji: '📦', desc: 'Boxes fall from the sky with random power-ups.', flags: ['boxes'] },
  { key: 'spin', name: 'SPINNING ARENA', emoji: '🌀', desc: 'The whole platform starts rotating.', flags: ['spin'] },
  { key: 'nojump', name: 'NO JUMPING', emoji: '🚫', desc: 'Jumping is disabled. Walk and bonk!', flags: ['nojump'] },
  { key: 'speed', name: 'SUPER SPEED', emoji: '⚡', desc: 'Everyone moves ridiculously fast.', flags: ['speed'] },
  { key: 'bouncy', name: 'BOUNCY FLOOR', emoji: '🟢', desc: 'The floor launches you upward whenever you land.', flags: ['bouncy'] },
  { key: 'hammerrain', name: 'HAMMER RAIN', emoji: '🔨', desc: 'Giant hammers fall from the sky!', flags: ['hammerrain'] },
  { key: 'floorgone', name: 'THE FLOOR IS GONE', emoji: '😨', desc: 'Parts of the arena disappear every few seconds.', flags: ['floorgone'] },
  { key: 'storm', name: 'MEGA BONK STORM', emoji: '🌩️', desc: 'EVERYTHING AT ONCE!', flags: ['lowgrav', 'meteors', 'ice', 'spin', 'giant'] },
]

export const RARE_EVENTS = [
  { key: 'golden', name: 'GOLDEN BONK', emoji: '✨', desc: 'A golden hammer appeared! Grab it!', flags: ['golden'], rare: true },
  { key: 'king', name: 'THE BONK KING', emoji: '👑', desc: 'One duck became the BONK KING. Knock them off!', flags: ['king'], rare: true },
  { key: 'apocalypse', name: 'BONK APOCALYPSE', emoji: '💀', desc: 'Shrinking, meteors, spinning, extra knockback!', flags: ['lava', 'meteors', 'spin', 'apocalypse'], rare: true },
  { key: 'duck', name: '???', emoji: '❓', desc: 'Something has entered the arena.', flags: ['duck'], rare: true },
]

export const POWERUPS = [
  { key: 'speed', name: 'Speed Boots', emoji: '👟' },
  { key: 'balloon', name: 'Extra Balloon', emoji: '🎈' },
  { key: 'shield', name: 'Super Shield', emoji: '🛡️' },
  { key: 'mega', name: 'Mega Hammer', emoji: '🔨' },
  { key: 'wings', name: 'Wings', emoji: '🪽' },
  { key: 'tiny', name: 'Shrink Ray', emoji: '🐜' },
]

export const DIFFICULTIES = [
  { key: 'easy', name: 'Easy', skill: 0.3 },
  { key: 'medium', name: 'Medium', skill: 0.55 },
  { key: 'hard', name: 'Hard', skill: 0.75 },
  { key: 'extreme', name: 'Extreme', skill: 0.9 },
  { key: 'impossible', name: 'Impossible', skill: 1.05 },
]

export const CHALLENGES = [
  { key: 'none', name: 'Normal match', desc: 'Just BONK!' },
  { key: 'nojump', name: 'No-Jump', desc: 'You can never jump.' },
  { key: 'jumponly', name: 'Jump-Only', desc: 'No bonking or dashing. Only jumps!' },
  { key: 'noattack', name: 'No-Attack', desc: 'No bonking. Dash into ducks instead.' },
  { key: 'nodamage', name: 'No-Damage', desc: 'Win without losing a balloon.' },
  { key: 'onelife', name: 'One-Life', desc: 'Everybody has just one balloon.' },
  { key: 'speed', name: 'Speed', desc: 'SUPER SPEED all match long.' },
  { key: 'slow', name: 'Slow', desc: 'Everyone moves in slow motion.' },
  { key: 'dodge', name: 'Dodge', desc: 'No bonking. Survive 60 seconds.' },
  { key: 'ko', name: 'Knockout', desc: 'Win with at least 3 knockouts.' },
  { key: 'survival', name: 'Survival', desc: 'Survive 90 seconds against angry bots.' },
  { key: 'air', name: 'Air', desc: 'LOW GRAVITY all match long.' },
  { key: 'platform', name: 'Platform', desc: 'The floor keeps disappearing.' },
  { key: 'edge', name: 'Edge', desc: 'Everyone starts at the very edge.' },
  { key: 'tiny', name: 'Tiny Arena', desc: 'A teeny tiny arena.' },
  { key: 'giant', name: 'Giant Arena', desc: 'A gigantic arena.' },
  { key: 'random', name: 'Mystery', desc: 'A random surprise challenge.' },
  { key: 'chaos', name: 'Chaos', desc: 'A new event every 8 seconds.' },
  { key: 'ultimate', name: 'Ultimate', desc: 'Impossible bots, one balloon, total chaos.' },
  { key: 'duckhunt', name: 'Duck Hunt', desc: 'The giant rubber duck is always here.', secret: 5 },
  { key: 'mirror', name: 'Mirror', desc: 'Your controls are backwards!', secret: 10 },
]

export const EMOTES = [
  { key: 'wave', name: 'Wave', emoji: '👋' },
  { key: 'spin', name: 'Spin', emoji: '🌀' },
  { key: 'quack', name: 'Quack', emoji: '🦆' },
  { key: 'flip', name: 'Flip', emoji: '🤸' },
  { key: 'flop', name: 'Flop', emoji: '🛌' },
]

export const DUCK_NAMES = [
  'xX_QuackAttack_Xx', 'noob_duck123', 'BonkMaster2014', 'SirWaddles', 'duckyboi_77', 'EpicBonker',
  'Puddles_YT', 'QuackQuackGo', 'xXBalloonKingXx', 'lil_quacker', 'TheRealDuck', 'Bonk_Legend99',
  'feathers4life', 'PRO_DUCK_GAMER', 'waddle_waddle', 'MrQuackington', 'CoolDuck_2016', 'bread_lover',
  'HammerTime_42', 'duckdash_pro', 'Nugget_Nation', 'SqueakyBoi', 'pond_patrol', 'BeakBreaker',
]

export const PLAYER_COLORS = ['#ff4d6d', '#3aa0ff', '#2bd96b', '#ffb000', '#b36bff', '#00d1c1', '#ff7a1a', '#ff5fd2', '#8bd14a', '#e8e8e8']

export const SCHEMES = {
  solo: {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    jump: ['Space'],
    bonk: ['KeyJ', 'KeyF', 'Enter'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyK'],
    shield: ['KeyE', 'KeyL'],
  },
  p1: {
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['Space'],
    bonk: ['KeyF'],
    dash: ['ShiftLeft'],
    shield: ['KeyE'],
  },
  p2: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['Numpad0', 'Period'],
    bonk: ['Enter'],
    dash: ['ShiftRight'],
    shield: ['Slash'],
  },
}

export const EMOTE_KEYS = ['Digit1', 'Digit2', 'KeyQ', 'Digit4', 'Digit5']
export const EMOTE_ALT = { Digit3: 2 }

export const GAME_KEYS = new Set([
  ...Object.values(SCHEMES).flatMap((s) => Object.values(s).flat()),
  ...EMOTE_KEYS,
  'Digit3',
])
