// Shared sizes and settings for the Boss Rush.

export const VW = 320
export const VH = 176
export const GROUND_Y = 144
export const INK = '#140c1c'

export const DIFFS = [
  { name: 'EASY', speed: 0.8, dens: 0.7, warn: 1.35, life: 0.75, extra: 0, color: '#38b848' },
  { name: 'NORMAL', speed: 1, dens: 1, warn: 1, life: 1, extra: 0, color: '#f8c830' },
  { name: 'HARD', speed: 1.18, dens: 1.3, warn: 0.85, life: 1.2, extra: 1, color: '#f88828' },
  { name: 'INSANE', speed: 1.4, dens: 1.7, warn: 0.7, life: 1.4, extra: 2, color: '#e03c9c' },
]

export const rand = (a, b) => a + Math.random() * (b - a)
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// A tiny seeded random number maker, so every attempt at a boss plays out the same way
// (as long as Pomni moves the same way). That makes patterns learnable.
export function seeded(seed) {
  let s = seed >>> 0
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (a, b) => a + next() * (b - a)
  next.pick = (arr) => arr[Math.floor(next() * arr.length)]
  return next
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  const cs = Math.floor((sec * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(cs).padStart(2, '0')}`
}
