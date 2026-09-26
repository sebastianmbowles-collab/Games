// Chat and username safety, borrowed from BONK!'s online mode (src/games/bonk/net.js on the
// bonk-party-game branch): rude words and private info turn into ####, names must be clean,
// and swearing 3 times in a row switches your chat off for 5 minutes.

// A small word filter, Roblox style: rude words turn into ####.
const RUDE = ['fuck', 'fuk', 'shit', 'bitch', 'bastard', 'dick', 'cunt', 'piss', 'crap', 'damn', 'asshole', 'arse', 'wanker', 'slut', 'whore', 'nigg', 'fag', 'retard', 'stupid', 'idiot', 'dumb', 'kill yourself', 'kys', 'hate you', 'shut up']
// Anything that looks like a phone number, email or address gets hidden too.
const PRIVATE = [/\d[\d\s-]{5,}\d/g, /\S+@\S+/g, /https?:\/\/\S+/gi, /www\.\S+/gi]

export function cleanText(text, max = 80) {
  let t = [...String(text ?? '')].filter((c) => c.charCodeAt(0) >= 32).join('').trim().slice(0, max)
  for (const re of PRIVATE) t = t.replace(re, (m) => '#'.repeat(Math.min(m.length, 8)))
  const lower = t.toLowerCase()
  const hide = []
  for (const w of RUDE) {
    let i = lower.indexOf(w)
    while (i >= 0) {
      // only at the start of a word, so "scrap" and "parse" are fine
      if (i === 0 || !/[a-z]/.test(lower[i - 1])) hide.push([i, i + w.length])
      i = lower.indexOf(w, i + 1)
    }
  }
  if (hide.length) t = [...t].map((c, i) => (c !== ' ' && hide.some(([a, b]) => i >= a && i < b) ? '#' : c)).join('')
  return t
}

// Did this message have a rude word in it? (phone numbers etc. don't count)
export function isRude(text) {
  let t = String(text ?? '')
  for (const re of PRIVATE) t = t.replace(re, '')
  return cleanText(t, 1000) !== t.trim().slice(0, 1000)
}

// Swear 3 times in a row and chat is switched off for a while.
export const SWEAR_LIMIT = 3
export const BAN_MS = 5 * 60 * 1000

// Usernames: letters, numbers and _ only, 3-16 long, and no rude words.
export function cleanName(name) {
  const n = String(name ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16)
  if (n.length < 3 || cleanText(n) !== n) return randomName()
  return n
}

export function nameProblem(name) {
  if (/[^A-Za-z0-9_]/.test(name)) return 'Only letters, numbers and _ (no spaces).'
  if (name.length < 3) return 'At least 3 letters.'
  if (name.length > 16) return '16 letters max.'
  if (cleanText(name) !== name) return 'That name is not allowed. Try another!'
  return ''
}

const ADJ = ['Bouncy', 'Sneaky', 'Mighty', 'Fluffy', 'Speedy', 'Wobbly', 'Golden', 'Tiny', 'Giant', 'Sparkly', 'Brave', 'Silly']
const NOUN = ['Hippo', 'Gecko', 'Panda', 'Croc', 'Lion', 'Bear', 'Bee', 'Horse', 'Shark', 'Duck', 'Crab', 'Frog', 'Chimp', 'Roo']

export function randomName() {
  return `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}${Math.floor(Math.random() * 90 + 10)}`
}

// Remembered in this browser so you keep your name.
const NAME_KEY = 'animalBrawlName'
export function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) || randomName()
  } catch {
    return randomName()
  }
}
export function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // not remembered, that's fine
  }
}
