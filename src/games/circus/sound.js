// Circus sounds and a bouncy oom-pah tune, all made on the fly with the Web Audio API (no sound files).

let ctx = null
let muted = false
let musicTimer = null
let step = 0
let nextTime = 0

export function isMuted() {
  return muted
}

export function setMuted(m) {
  muted = m
}

// Browsers only allow sound after the player touches the page, so this is called on the first tap.
export function wakeAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12)

function note(type, f0, f1, time, dur, vol) {
  if (!ctx || muted) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, time)
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), time + dur)
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(vol, time + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur)
  o.connect(g)
  g.connect(ctx.destination)
  o.start(time)
  o.stop(time + dur + 0.02)
}

function tone(type, f0, f1, dur, vol = 0.15, delay = 0) {
  if (!ctx) return
  note(type, f0, f1, ctx.currentTime + delay, dur, vol)
}

function noise(dur, vol = 0.2, freq = 800, delay = 0) {
  if (!ctx || muted) return
  const t = ctx.currentTime + delay
  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(ctx.destination)
  src.start(t)
}

export const sfx = {
  click() {
    tone('square', 660, 990, 0.07, 0.07)
  },
  boing(pitch = 1) {
    tone('sine', 260 * pitch, 720 * pitch, 0.16, 0.22)
  },
  drop() {
    tone('sawtooth', 330, 55, 0.45, 0.12)
  },
  glitch() {
    for (let i = 0; i < 6; i++) {
      const f = 200 + Math.random() * 1600
      tone('square', f, f * (0.5 + Math.random()), 0.05, 0.07, i * 0.045)
    }
  },
  boom() {
    noise(0.6, 0.45, 500)
    tone('sine', 140, 40, 0.45, 0.3)
  },
  whoosh() {
    noise(0.35, 0.12, 2200)
  },
  cheer() {
    ;[72, 76, 79, 84].forEach((n, i) => tone('triangle', midi(n), midi(n), 0.16, 0.16, i * 0.08))
  },
  fanfare() {
    ;[67, 72, 76, 79, 76, 79, 84].forEach((n, i) => tone('square', midi(n), midi(n), 0.2, 0.08, i * 0.11))
  },
  sad() {
    ;[67, 66, 65, 64].forEach((n, i) => tone('triangle', midi(n), midi(n - 0.5), 0.3, 0.14, i * 0.28))
  },
}

// An original, slightly silly chromatic circus tune. 32 eighth notes, then it loops.
const STEP = 0.17
const MELODY = [
  79, 78, 79, 76, 72, 74, 76, 79,
  81, 80, 81, 77, 74, 76, 77, 81,
  83, 82, 83, 79, 76, 78, 79, 83,
  84, 83, 81, 79, 77, 76, 74, null,
]
const BASS = [48, 41, 43, 48]

function playStep(s, time) {
  if (muted) return
  const m = MELODY[s]
  if (m) note('square', midi(m), midi(m), time, STEP * 0.8, 0.03)
  if (s % 2 === 0) {
    const root = BASS[Math.floor(s / 8)]
    if (s % 4 === 0) {
      note('triangle', midi(root), midi(root), time, STEP * 0.9, 0.14)
    } else {
      note('square', midi(root + 16), midi(root + 16), time, STEP * 0.5, 0.025)
      note('square', midi(root + 19), midi(root + 19), time, STEP * 0.5, 0.025)
    }
  }
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.3) {
    playStep(step, nextTime)
    nextTime += STEP
    step = (step + 1) % MELODY.length
  }
}

export function startMusic() {
  if (!ctx || musicTimer) return
  nextTime = ctx.currentTime + 0.1
  step = 0
  musicTimer = setInterval(schedule, 60)
}

export function stopMusic() {
  clearInterval(musicTimer)
  musicTimer = null
}
