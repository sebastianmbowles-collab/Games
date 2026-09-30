// 8-bit sounds and chiptune music, made on the fly with the Web Audio API (no sound files).

let ctx = null
let muted = false
let timer = null
let song = null
let step = 0
let nextTime = 0

export function isMuted() {
  return muted
}

export function setMuted(m) {
  muted = m
}

// Browsers only allow sound after the player presses something, so this runs on the first press.
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
  g.gain.setValueAtTime(vol, time)
  g.gain.setValueAtTime(vol, time + dur * 0.7)
  g.gain.linearRampToValueAtTime(0, time + dur)
  o.connect(g)
  g.connect(ctx.destination)
  o.start(time)
  o.stop(time + dur + 0.02)
}

function tone(type, f0, f1, dur, vol = 0.08, delay = 0) {
  if (!ctx) return
  note(type, f0, f1, ctx.currentTime + delay, dur, vol)
}

function noise(dur, vol = 0.15, freq = 1500, delay = 0) {
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
  g.gain.linearRampToValueAtTime(0, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(ctx.destination)
  src.start(t)
}

export const sfx = {
  jump() {
    tone('square', 280, 620, 0.12, 0.06)
  },
  stomp() {
    tone('square', 520, 140, 0.12, 0.08)
    noise(0.06, 0.1, 3000)
  },
  star() {
    tone('square', 988, 988, 0.06, 0.05)
    tone('square', 1319, 1319, 0.12, 0.05, 0.06)
  },
  die() {
    for (let i = 0; i < 8; i++) {
      const f = 150 + Math.random() * 1400
      tone('square', f, f * (0.4 + Math.random()), 0.05, 0.06, i * 0.04)
    }
    tone('sawtooth', 400, 40, 0.6, 0.07, 0.32)
  },
  throw() {
    noise(0.12, 0.08, 2600)
  },
  pfft() {
    noise(0.4, 0.2, 500)
    tone('sawtooth', 110, 70, 0.4, 0.05)
  },
  warn() {
    tone('square', 880, 880, 0.05, 0.04)
    tone('square', 880, 880, 0.05, 0.04, 0.1)
  },
  bossHit() {
    tone('square', 220, 60, 0.3, 0.1)
    noise(0.2, 0.15, 1500)
  },
  vomit() {
    noise(0.45, 0.18, 300)
    tone('sawtooth', 130, 55, 0.45, 0.06)
  },
  cane() {
    noise(0.3, 0.08, 4500)
  },
  select() {
    tone('square', 660, 880, 0.06, 0.05)
  },
  win() {
    ;[72, 76, 79, 84, 79, 84, 88].forEach((n, i) => tone('square', midi(n), midi(n), 0.14, 0.06, i * 0.1))
  },
}

// An original spooky-but-bouncy circus tune in D minor. 64 eighth notes, then it loops.
const MELODY = [
  69, null, 74, null, 77, 76, 74, 73, 74, null, 69, null, 65, null, 69, null,
  70, null, 74, null, 77, 76, 74, 72, 69, null, null, null, 73, null, null, null,
  69, null, 74, null, 77, 76, 74, 73, 74, null, 77, null, 81, null, 79, 77,
  76, null, 74, null, 73, null, 76, null, 74, null, null, null, null, null, null, null,
]
const BASS = [38, 38, 34, 33, 38, 38, 33, 38]
const SONGS = {
  map: { step: 0.16, lead: 'triangle', leadVol: 0.07 },
  level: { step: 0.13, lead: 'square', leadVol: 0.035 },
  boss: { step: 0.105, lead: 'square', leadVol: 0.04 },
}

function playStep(s, time) {
  if (muted) return
  const sg = SONGS[song]
  const m = MELODY[s]
  if (m) note(sg.lead, midi(m), midi(m), time, sg.step * 0.9, sg.leadVol)
  const root = BASS[Math.floor(s / 8)]
  if (s % 4 === 0) note('triangle', midi(root), midi(root), time, sg.step * 1.6, 0.12)
  else if (s % 4 === 2) note('triangle', midi(root + 7), midi(root + 7), time, sg.step * 0.9, 0.08)
  if (song === 'boss' && s % 2 === 1) noiseAt(time, 0.03)
}

function noiseAt(time, vol) {
  if (!ctx || muted) return
  const len = Math.floor(ctx.sampleRate * 0.04)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, time)
  g.gain.linearRampToValueAtTime(0, time + 0.04)
  src.connect(g)
  g.connect(ctx.destination)
  src.start(time)
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.3) {
    playStep(step, nextTime)
    nextTime += SONGS[song].step
    step = (step + 1) % MELODY.length
  }
}

export function playMusic(kind) {
  if (!ctx || song === kind) return
  song = kind
  step = 0
  nextTime = ctx.currentTime + 0.1
  if (!timer) timer = setInterval(schedule, 50)
}

export function stopMusic() {
  clearInterval(timer)
  timer = null
  song = null
}
