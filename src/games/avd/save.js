// Remembers every player: name, school year, coins, shop items, best scores and settings.
// Log out, close the browser, come back, type your name again, and it's all still there.
//
// Saves always go into this browser. Inside the published game page on claude.ai they're also
// kept in your claude.ai account (private to you), so they survive cleared browsers and
// work on other devices too.

const KEY = 'avd-save-v2'
let data = { current: null, accounts: {} }
let cloudDoc = null
let cloudTimer = null
let cloudBusy = false

function writeLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Storage is blocked here; the cloud copy (if any) still works.
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

export const currentAccount = () => (data.current ? data.accounts[data.current] || null : null)
export const findAccount = (name) => data.accounts[String(name).toUpperCase()] || null

export function storeAccount(acc) {
  acc.savedAt = Date.now()
  data.accounts[acc.profile.name] = acc
  data.current = acc.profile.name
  writeLocal()
  queueCloud()
}

export function logOut() {
  data.current = null
  writeLocal()
  queueCloud()
}

// ---------- claude.ai account copy ----------

// Connects to the page's private storage. Calls onChange() if it brought back newer saves.
export async function connectCloud(onChange) {
  try {
    if (!window.claude?.use) return
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')])
    if (!db || !user) return
    const uid = await user.id()
    if (!uid) return
    cloudDoc = db.doc(`data/users/${uid}/avd-save`)
    const snap = await cloudDoc.get()
    const cloud = snap.exists ? snap.data() : null
    let changed = false
    if (cloud?.accounts) {
      for (const [name, acc] of Object.entries(cloud.accounts)) {
        const mine = data.accounts[name]
        if (!mine || (acc.savedAt || 0) > (mine.savedAt || 0)) {
          data.accounts[name] = acc
          changed = true
        }
      }
      if (!data.current && cloud.current && data.accounts[cloud.current]) {
        data.current = cloud.current
        changed = true
      }
      writeLocal()
    }
    queueCloud()
    if (changed) onChange()
  } catch {
    cloudDoc = null
  }
}

function queueCloud() {
  if (!cloudDoc) return
  clearTimeout(cloudTimer)
  cloudTimer = setTimeout(pushCloud, 1500)
}

async function pushCloud() {
  if (cloudBusy) return queueCloud()
  cloudBusy = true
  try {
    await cloudDoc.set(JSON.parse(JSON.stringify(data)))
  } catch {
    // Try again with the next save.
  }
  cloudBusy = false
}
