// Tiny cartoon sound effects, made on the fly with the Web Audio API (no sound files).

let ctx = null
let muted = false

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

function out(gain = 0.2) {
  const g = ctx.createGain()
  g.gain.value = gain
  g.connect(ctx.destination)
  return g
}

function tone(type, f0, f1, dur, vol = 0.2, delay = 0) {
  if (!ctx || muted) return
  const t = ctx.currentTime + delay
  const o = ctx.createOscillator()
  const g = out(0)
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  o.start(t)
  o.stop(t + dur + 0.02)
}

let noiseBuf = null
function noise(dur, vol, filterType, freq, delay = 0) {
  if (!ctx || muted) return
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = filterType
  f.frequency.value = freq
  const g = out(0)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  src.start(t)
  src.stop(t + dur + 0.02)
}

export const sfx = {
  toss: () => tone('sine', 300, 700, 0.18, 0.12),
  plop: () => {
    tone('sine', 520, 120, 0.22, 0.3)
    noise(0.15, 0.12, 'lowpass', 900)
  },
  sugar: () => noise(0.9, 0.08, 'highpass', 5000),
  slosh: () => noise(0.25, 0.06, 'bandpass', 500),
  bubble: () => tone('sine', 250 + Math.random() * 250, 700 + Math.random() * 400, 0.08, 0.06),
  click: () => tone('square', 900, 600, 0.05, 0.06),
  whoosh: () => noise(0.4, 0.1, 'bandpass', 1200),
  pour: () => noise(1.6, 0.07, 'lowpass', 700),
  clink: () => {
    tone('triangle', 1800, 1700, 0.25, 0.1)
    tone('triangle', 2400, 2300, 0.2, 0.06, 0.05)
  },
  twist: () => {
    for (let i = 0; i < 3; i++) tone('square', 1200, 900, 0.03, 0.04, i * 0.08)
  },
  ding: () => {
    tone('sine', 1047, 1040, 0.6, 0.15)
    tone('sine', 1319, 1310, 0.6, 0.12, 0.08)
    tone('sine', 1568, 1560, 0.8, 0.12, 0.16)
  },
  boing: () => tone('triangle', 180, 520, 0.3, 0.18),
  pop: () => {
    tone('square', 200, 900, 0.12, 0.12)
    noise(0.1, 0.1, 'highpass', 2000)
  },
  scrape: () => noise(0.3, 0.06, 'bandpass', 2500),
  chomp: () => {
    noise(0.12, 0.2, 'lowpass', 1500)
    tone('square', 160, 80, 0.1, 0.08)
  },
  bzz: () => tone('sawtooth', 220, 180, 0.4, 0.05),
  nope: () => tone('triangle', 300, 200, 0.2, 0.12),
  tick: () => tone('triangle', 2000, 1900, 0.03, 0.04),
}
