// Tiny synth sound effects, so the game needs no audio files.
let ac = null
let muted = false
let noiseBuf = null

export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ac = new AC()
    }
    if (ac.state === 'suspended') ac.resume()
  } catch {
    ac = null
  }
}

export function setMuted(value) {
  muted = value
}

function tone(type, f0, f1, dur, vol, delay = 0) {
  if (!ac || muted) return
  const t = ac.currentTime + delay
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(ac.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur, vol, freq, delay = 0) {
  if (!ac || muted) return
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const t = ac.currentTime + delay
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const f = ac.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  const g = ac.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(ac.destination)
  src.start(t)
  src.stop(t + dur + 0.05)
}

export const sfx = {
  bonk() {
    tone('sine', 340, 70, 0.2, 0.4)
    noise(0.06, 0.3, 1800)
  },
  squeak() {
    tone('square', 900, 1600, 0.1, 0.1)
    tone('square', 1600, 900, 0.1, 0.1, 0.09)
  },
  bong() {
    tone('triangle', 262, 250, 0.8, 0.35)
    tone('sine', 523, 520, 0.6, 0.15)
  },
  slap() {
    noise(0.14, 0.45, 900)
    tone('sine', 220, 90, 0.12, 0.2)
  },
  mega() {
    tone('sawtooth', 160, 40, 0.45, 0.35)
    noise(0.3, 0.5, 400)
  },
  whiff() {
    noise(0.1, 0.08, 3000)
  },
  dash() {
    noise(0.2, 0.2, 2400)
  },
  shield() {
    tone('sine', 500, 1000, 0.25, 0.15)
  },
  block() {
    tone('square', 1250, 1150, 0.15, 0.1)
    tone('triangle', 1900, 1900, 0.25, 0.08)
  },
  fall() {
    tone('sine', 1100, 160, 1.0, 0.16)
  },
  yeet() {
    tone('sawtooth', 280, 1300, 0.35, 0.08)
  },
  ko() {
    tone('triangle', 1568, 1568, 0.3, 0.15)
    tone('triangle', 2093, 2093, 0.4, 0.12, 0.08)
  },
  coin() {
    tone('square', 988, 988, 0.07, 0.06)
    tone('square', 1319, 1319, 0.16, 0.06, 0.07)
  },
  pickup() {
    tone('triangle', 660, 990, 0.15, 0.15)
  },
  boing() {
    tone('sine', 180, 620, 0.22, 0.2)
  },
  rule() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.18, 0.15, i * 0.09))
  },
  count() {
    tone('square', 440, 440, 0.15, 0.08)
  },
  go() {
    tone('square', 880, 880, 0.35, 0.1)
  },
  win() {
    ;[523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.2, 0.08, i * 0.12))
  },
}
