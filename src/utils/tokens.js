const KEY = 'fazTokens'
const START_BALANCE = 100

function safeGet() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return START_BALANCE
    const n = Number(raw)
    return Number.isFinite(n) ? n : START_BALANCE
  } catch {
    return START_BALANCE
  }
}

function safeSet(value) {
  try {
    localStorage.setItem(KEY, String(value))
  } catch {
    // localStorage unavailable, balance just won't persist
  }
}

export function getTokens() {
  return safeGet()
}

export function addTokens(amount) {
  const next = safeGet() + amount
  safeSet(next)
  return next
}

export function spendTokens(amount) {
  const current = safeGet()
  if (current < amount) return null
  const next = current - amount
  safeSet(next)
  return next
}
