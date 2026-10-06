// Player names and school year, plus a filter that keeps rude or mean names out.

export const MAX_NAME = 12

// School years: 0 is "below Year 1" (Prep), 7 is "above Year 6".
export const YEAR_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7]
export const yearLabel = (y) => (y === 0 ? 'PREP' : y >= 7 ? 'YEAR 7+' : `YEAR ${y}`)

// Swear words and rude words are blocked anywhere inside a name, even with tricks like
// "5H1T" or spaces between the letters.
const BLOCK_ANYWHERE = [
  'fuck', 'fuk', 'fck', 'phuck', 'shit', 'bitch', 'biatch', 'cunt', 'dick', 'cock', 'piss', 'slut', 'whore',
  'wank', 'porn', 'nazi', 'hitler', 'retard', 'bastard', 'bollock', 'twat', 'prick', 'pussy', 'penis', 'vagina',
  'boob', 'tits', 'nigg', 'fag', 'rape', 'sexy', 'dumbass', 'jackass', 'asshole', 'arsehole', 'damn', 'crap',
  'loser', 'dork', 'idiot', 'stupid', 'moron', 'dumb', 'noob', 'dweeb', 'nerd', 'weirdo', 'freak', 'hate',
  'suck', 'poop', 'butt', 'fart', 'ugly', 'imbecile', 'doofus', 'dummy',
]
// Short words that are only rude on their own (so names like "Cassie" or "Fatima" are fine).
const BLOCK_WHOLE = ['kill', 'bum', 'lame', 'goon', 'twit', 'ass', 'arse', 'sex', 'fat', 'git', 'pig', 'cow', 'hell', 'wtf', 'stfu', 'omfg', 'gay', 'die']

function squash(s) {
  return s
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
}

// Returns null if the name is fine, or a short reason if it isn't.
export function checkName(raw) {
  const name = raw.trim()
  if (name.length < 2) return 'Your name needs at least 2 letters'
  if (!/[a-z]/i.test(name)) return 'Your name needs some letters'
  const s = squash(name)
  const joined = s.replace(/[^a-z]/g, '')
  // also catch doubled-up letters like "fuuuck"
  const single = joined.replace(/(.)\1+/g, '$1')
  if (BLOCK_ANYWHERE.some((w) => joined.includes(w) || single.includes(w))) return "That name isn't allowed. Try another!"
  const words = s.split(/[^a-z]+/).filter(Boolean)
  if (words.some((w) => BLOCK_WHOLE.includes(w) || BLOCK_WHOLE.includes(w.replace(/(.)\1+/g, '$1')))) return "That name isn't allowed. Try another!"
  if (BLOCK_WHOLE.includes(joined)) return "That name isn't allowed. Try another!"
  return null
}

// Names from the other player get checked again, in case their game is old or changed.
export function safeName(raw) {
  const n = String(raw || '').slice(0, MAX_NAME)
  return checkName(n) ? 'PLAYER' : n
}

// e.g. "DINOS SAM YEAR 4"
export function tagLine(side, profile) {
  return `${side === 'aliens' ? 'ALIENS' : 'DINOS'} ${profile.name} ${yearLabel(profile.year)}`.toUpperCase()
}
