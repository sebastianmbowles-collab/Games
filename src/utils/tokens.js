import { loadSave, persist } from '../games/bonk/save'

// The whole arcade shares one wallet: Bonk Bucks (BB), the same money BONK!
// uses for costumes and pets.
const OLD_KEY = 'fazTokens'

function wallet() {
  const s = loadSave()
  // Move any old Faz-Tokens into Bonk Bucks (only happens once).
  try {
    const old = localStorage.getItem(OLD_KEY)
    if (old !== null) {
      const n = Number(old)
      if (Number.isFinite(n) && n > 0) s.bb += n
      localStorage.removeItem(OLD_KEY)
      persist()
    }
  } catch {
    // storage unavailable: nothing to move
  }
  return s
}

export function getTokens() {
  return wallet().bb
}

export function addTokens(amount) {
  const s = wallet()
  s.bb += amount
  if (amount > 0) s.stats.bbEarned = (s.stats.bbEarned || 0) + amount
  persist()
  return s.bb
}

export function spendTokens(amount) {
  const s = wallet()
  if (s.bb < amount) return null
  s.bb -= amount
  s.stats.bbSpent = (s.stats.bbSpent || 0) + amount
  persist()
  return s.bb
}
