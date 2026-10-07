// Remembers every player: name, school year, money (Xenobits, Plasma Cells, Fossil Shards, DNA), shop items, best scores and settings.
// Log out, close the browser, come back, type your name again, and it's all still there.
//
// This is the game's own login: you type your name, and the game remembers you in this browser.

const KEY = 'avd-save-v2'
let data = { current: null, accounts: {} }

function writeLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage is blocked here, so this visit just won't be remembered.
  }
}

function readJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

// Saves from before there were accounts become the first account.
function migrateOld() {
  const profile = readJSON('avd-profile-v1')
  if (!profile?.name) return null
  const acc = {
    profile,
    shop: readJSON('avd-shop-v1') || { coins: 0, owned: {} },
    best: readJSON('avd-best-v1') || { aliens: 0, dinos: 0 },
    settings: readJSON('avd-settings-v1') || {},
    savedAt: Date.now(),
  }
  return { current: profile.name, accounts: { [profile.name]: acc } }
}

export function loadSave() {
  const d = readJSON(KEY)
  data = d && d.accounts ? d : migrateOld() || { current: null, accounts: {} }
  writeLocal()
  return data
}

// One device can remember this many players (plenty for a class).
export const MAX_ACCOUNTS = 50
export const accountCount = () => Object.keys(data.accounts).length

// Passwords are never saved as they are typed: they're scrambled ("hashed") first.
export async function hashPassword(name, pw) {
  const s = `avd:${name}:${pw}`
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    let h = 5381
    for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0
    return `x${h.toString(16)}`
  }
}

export const currentAccount = () => (data.current ? data.accounts[data.current] || null : null)
export const findAccount = (name) => data.accounts[String(name).toUpperCase()] || null

export function storeAccount(acc) {
  acc.savedAt = Date.now()
  data.accounts[acc.profile.name] = acc
  data.current = acc.profile.name
  writeLocal()
}

export function deleteAccount(name) {
  delete data.accounts[name]
  if (data.current === name) data.current = null
  writeLocal()
}

export function logOut() {
  data.current = null
  writeLocal()
}
