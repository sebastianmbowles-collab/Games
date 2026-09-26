// Saved progress: wins, unlocks, achievements. Stored in this browser only.
const KEY = 'animalBrawlSave'

const EMPTY = {
  wins: 0,
  matches: 0,
  fightersWon: [],
  arenasPlayed: [],
  arcadeCleared: {},
  bossBeaten: false,
  secret: false,
  onlineWins: 0,
  dodges: 0,
  blocks: 0,
  trainingHits: 0,
  maxCombo: 0,
  supers: 0,
  dizzies: 0,
  perfects: 0,
  moonWins: 0,
  kitchenWins: 0,
  achievements: {},
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

function store(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save))
  } catch {
    // progress just won't be remembered
  }
}

export const ACHIEVEMENTS = [
  { id: 'first_win', icon: '🏆', name: 'First Fur Flies', desc: 'Win your first match.', test: (s) => s.wins >= 1 },
  { id: 'ten_wins', icon: '🐶', name: 'Top Dog', desc: 'Win 10 matches.', test: (s) => s.wins >= 10 },
  { id: 'perfect', icon: '✨', name: 'Not a Scratch', desc: 'Win a round without taking any damage.', test: (s) => s.perfects >= 1 },
  { id: 'combo5', icon: '👊', name: 'Combo King', desc: 'Land a 5-hit combo.', test: (s) => s.maxCombo >= 5 },
  { id: 'combo8', icon: '👑', name: 'Combo EMPEROR', desc: 'Land an 8-hit combo.', test: (s) => s.maxCombo >= 8 },
  { id: 'super', icon: '💥', name: 'Super Star', desc: 'Use a super move.', test: (s) => s.supers >= 1 },
  { id: 'dizzy', icon: '💫', name: 'Seeing Stars', desc: 'Make an opponent dizzy.', test: (s) => s.dizzies >= 1 },
  { id: 'dodge20', icon: '🌀', name: 'Rolling Stone', desc: 'Dodge-roll 20 times.', test: (s) => s.dodges >= 20 },
  { id: 'block50', icon: '🧱', name: 'Brick Wall', desc: 'Block 50 hits.', test: (s) => s.blocks >= 50 },
  { id: 'arenas', icon: '🗺️', name: 'Globetrotter', desc: 'Fight in all 10 arenas.', test: (s) => s.arenasPlayed.length >= 10 },
  { id: 'zoo10', icon: '🐾', name: 'Zookeeper', desc: 'Win with 10 different animals.', test: (s) => s.fightersWon.length >= 10 },
  { id: 'moon', icon: '🌙', name: 'Moonwalker', desc: 'Win a match on the Moon.', test: (s) => s.moonWins >= 1 },
  { id: 'kitchen', icon: '🍳', name: 'Too Many Cooks', desc: 'Win a match in the Giant Kitchen.', test: (s) => s.kitchenWins >= 1 },
  { id: 'arcade', icon: '🕹️', name: 'Arcade Champion', desc: 'Beat Arcade mode.', test: (s) => Object.keys(s.arcadeCleared).length >= 1 },
  { id: 'arcade_hard', icon: '🔥', name: 'Legend of the Jungle', desc: 'Beat Arcade mode on Hard.', test: (s) => !!s.arcadeCleared.hard },
  { id: 'boss', icon: '🐄', name: 'Boss Buster', desc: 'Defeat the Moo-scle Beast.', test: (s) => s.bossBeaten },
  { id: 'secret', icon: '🦥', name: 'Secret Sloth', desc: 'Find the secret character.', test: (s) => s.secret },
  { id: 'online', icon: '🌐', name: 'Online Warrior', desc: 'Win an online match.', test: (s) => s.onlineWins >= 1 },
  { id: 'training', icon: '🥋', name: 'Training Day', desc: 'Land 50 hits in Training.', test: (s) => s.trainingHits >= 50 },
  { id: 'turtle', icon: '🐢', name: 'Shell Yeah', desc: 'Unlock Shell-Shock.', test: (s) => s.wins >= 6 },
]

// Check achievements, save, and return any that were just earned.
function award(save) {
  const fresh = []
  for (const a of ACHIEVEMENTS) {
    if (!save.achievements[a.id] && a.test(save)) {
      save.achievements[a.id] = Date.now()
      fresh.push(a)
    }
  }
  store(save)
  return fresh
}

// Everything that happened in a finished match, from this player's point of view.
// `stats` is the player's fighter stats from the engine.
export function recordMatch({ won, fighterKey, arena, stats, online = false }) {
  const save = loadSave()
  const before = unlockedKeys(save)
  save.matches += 1
  if (!save.arenasPlayed.includes(arena)) save.arenasPlayed.push(arena)
  if (stats) {
    save.dodges += stats.dodges
    save.blocks += stats.blocks
    save.supers += stats.supers
    save.dizzies += stats.dizzies
    save.perfects += stats.perfects ?? 0
    save.maxCombo = Math.max(save.maxCombo, stats.maxCombo)
  }
  if (won) {
    save.wins += 1
    if (!save.fightersWon.includes(fighterKey)) save.fightersWon.push(fighterKey)
    if (online) save.onlineWins += 1
    if (arena === 'moon') save.moonWins += 1
    if (arena === 'kitchen') save.kitchenWins += 1
  }
  const achievements = award(save)
  const unlocks = unlockedKeys(save).filter((k) => !before.includes(k))
  return { achievements, unlocks }
}

export function recordArcadeClear(difficulty) {
  const save = loadSave()
  const before = unlockedKeys(save)
  save.arcadeCleared[difficulty] = true
  save.bossBeaten = true
  const achievements = award(save)
  return { achievements, unlocks: unlockedKeys(save).filter((k) => !before.includes(k)) }
}

export function recordTraining(hits) {
  const save = loadSave()
  save.trainingHits += hits
  return { achievements: award(save), unlocks: [] }
}

export function unlockSecret() {
  const save = loadSave()
  const was = save.secret
  save.secret = true
  return { achievements: award(save), unlocks: was ? [] : ['slothmo'] }
}

export function isUnlocked(def, save = loadSave()) {
  if (!def.unlock) return true
  if (def.unlock.startsWith('wins:')) return save.wins >= Number(def.unlock.slice(5))
  if (def.unlock === 'secret') return save.secret
  if (def.unlock === 'boss') return save.bossBeaten
  return false
}

export function unlockHint(def) {
  if (def.unlock?.startsWith('wins:')) return `Win ${def.unlock.slice(5)} matches to unlock`
  if (def.unlock === 'secret') return 'A secret... try an old cheat code on the title screen'
  if (def.unlock === 'boss') return 'Beat Arcade mode to unlock'
  return ''
}

function unlockedKeys(save) {
  return ['kangaroo', 'shellshock', 'slothmo', 'moosclebeast'].filter((k) => {
    const unlock = { kangaroo: 'wins:3', shellshock: 'wins:6', slothmo: 'secret', moosclebeast: 'boss' }[k]
    return isUnlocked({ unlock }, save)
  })
}

export const COSTUMES = [
  { id: 'classic', name: 'Classic', hint: '' },
  { id: 'retro', name: 'Retro', hint: '' },
  { id: 'golden', name: 'Golden', hint: 'Win 10 matches' },
  { id: 'shadow', name: 'Shadow', hint: 'Beat Arcade mode' },
]

export function costumeUnlocked(id, save = loadSave()) {
  if (id === 'golden') return save.wins >= 10
  if (id === 'shadow') return save.bossBeaten
  return true
}
