// The player's saved profile: Bonk Bucks, cosmetics, stats and achievements.
// Everything lives in localStorage and survives a missing/blocked storage.
const KEY = 'bonkDuckSave.v1'

function fresh() {
  return {
    bb: 0,
    costume: 'rookie',
    owned: ['rookie'],
    pet: null,
    pets: [],
    stats: {},
    ach: {},
    maps: [],
    secrets: [],
    emotes: [],
    lists: {},
    muted: false,
  }
}

let save = null
const listeners = new Set()

export function loadSave() {
  if (save) return save
  save = fresh()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) save = { ...save, ...JSON.parse(raw) }
  } catch {
    // no storage: play without saving
  }
  return save
}

let writeTimer = null
export function persist() {
  clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(save))
    } catch {
      // ignore
    }
  }, 250)
  for (const fn of listeners) fn(save)
}

export function onSaveChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function stat(key) {
  return loadSave().stats[key] || 0
}

export function addStat(key, n = 1) {
  const s = loadSave()
  s.stats[key] = (s.stats[key] || 0) + n
  persist()
}

export function maxStat(key, value) {
  const s = loadSave()
  if ((s.stats[key] || 0) < value) {
    s.stats[key] = value
    persist()
  }
}

export function setFlag(key) {
  maxStat(key, 1)
}

export function addListItem(list, item) {
  const s = loadSave()
  if (!s[list].includes(item)) {
    s[list].push(item)
    persist()
    return true
  }
  return false
}

export function addBB(n) {
  const s = loadSave()
  s.bb += n
  if (n > 0) s.stats.bbEarned = (s.stats.bbEarned || 0) + n
  persist()
}

export function spendBB(n) {
  const s = loadSave()
  if (s.bb < n) return false
  s.bb -= n
  s.stats.bbSpent = (s.stats.bbSpent || 0) + n
  persist()
  return true
}
