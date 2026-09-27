// Spooky sounds made with Web Audio (no sound files needed).

const MUTE_KEY = 'nightmaresMuted'
let ctx = null
let noiseBuffer = null
let drone = null
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
})()

export function isMuted() {
  return muted
}

export function setMuted(value) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // not saved, that's fine
  }
  if (value) stopDrone()
}

function audio() {
  if (muted) return null
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function out(ac, pan) {
  if (!pan || !ac.createStereoPanner) return ac.destination
  const p = ac.createStereoPanner()
  p.pan.value = pan
  p.connect(ac.destination)
  return p
}

function tone({ type = 'sine', f0, f1 = f0, dur, vol = 0.1, delay = 0, pan = 0, attack = 0.005 }) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(out(ac, pan))
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise({ dur, vol = 0.2, f0 = 2000, f1 = f0, delay = 0, type = 'lowpass', pan = 0, q = 1 }) {
  const ac = audio()
  if (!ac) return
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const t = ac.currentTime + delay
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(f0, t)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter).connect(gain).connect(out(ac, pan))
  src.start(t, Math.random())
  src.stop(t + dur + 0.05)
}

// A low, uneasy hum that plays during a dream.
export function startDrone() {
  const ac = audio()
  if (!ac || drone) return
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 2)
  gain.connect(ac.destination)
  const oscs = [55, 58.3, 82.4].map((f) => {
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    o.connect(gain)
    o.start()
    return o
  })
  drone = { gain, oscs }
}

export function stopDrone() {
  if (!drone || !ctx) {
    drone = null
    return
  }
  const { gain, oscs } = drone
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(gain.gain.value, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
  oscs.forEach((o) => o.stop(t + 0.7))
  drone = null
}

// Which way a sound should come from (left speaker, middle, right speaker).
const PAN = { leftDoor: -0.9, rightDoor: 0.9, computer: -0.4, window: 0, paintings: 0.5, underBed: 0 }

export const sfx = {
  click: () => tone({ type: 'square', f0: 1800, f1: 1200, dur: 0.03, vol: 0.04 }),
  steps: (key) => {
    for (let i = 0; i < 3; i++) {
      noise({ dur: 0.12, vol: 0.35, f0: 300, f1: 120, delay: i * 0.45, pan: PAN[key] })
      tone({ f0: 70, f1: 50, dur: 0.12, vol: 0.12, delay: i * 0.45, pan: PAN[key] })
    }
  },
  creak: (key) => {
    tone({ type: 'sawtooth', f0: 180, f1: 320, dur: 0.9, vol: 0.03, pan: PAN[key], attack: 0.2 })
    tone({ type: 'sawtooth', f0: 190, f1: 260, dur: 0.7, vol: 0.02, delay: 0.3, pan: PAN[key], attack: 0.2 })
  },
  tap: () => {
    for (let i = 0; i < 3; i++) noise({ dur: 0.05, vol: 0.4, f0: 2500, f1: 1500, type: 'bandpass', q: 4, delay: i * 0.22 })
  },
  scratch: () => noise({ dur: 1.1, vol: 0.2, f0: 5000, f1: 2500, type: 'bandpass', q: 6 }),
  curtain: () => noise({ dur: 0.5, vol: 0.18, f0: 1200, f1: 3500, type: 'bandpass' }),
  static: () => noise({ dur: 0.8, vol: 0.12, f0: 6000, f1: 5000, type: 'highpass', pan: PAN.computer }),
  glitch: () => {
    for (let i = 0; i < 6; i++) tone({ type: 'square', f0: 200 + Math.random() * 900, dur: 0.06, vol: 0.05, delay: i * 0.07, pan: PAN.computer })
  },
  powerOff: () => tone({ type: 'sine', f0: 900, f1: 60, dur: 0.35, vol: 0.12, pan: PAN.computer }),
  paintings: () => {
    tone({ type: 'triangle', f0: 660, f1: 640, dur: 0.6, vol: 0.05, pan: PAN.paintings, attack: 0.1 })
    tone({ type: 'triangle', f0: 698, f1: 690, dur: 0.6, vol: 0.05, delay: 0.1, pan: PAN.paintings, attack: 0.1 })
  },
  angry: () => {
    tone({ type: 'sawtooth', f0: 300, f1: 900, dur: 0.4, vol: 0.06, pan: PAN.paintings })
    noise({ dur: 0.4, vol: 0.15, f0: 3000, f1: 800, type: 'bandpass', pan: PAN.paintings })
  },
  growl: () => {
    tone({ type: 'sawtooth', f0: 60, f1: 45, dur: 1.2, vol: 0.12, attack: 0.2 })
    noise({ dur: 1.2, vol: 0.2, f0: 300, f1: 150 })
  },
  flee: (key) => {
    noise({ dur: 0.6, vol: 0.3, f0: 600, f1: 3000, type: 'bandpass', pan: PAN[key] })
    tone({ type: 'sine', f0: 500, f1: 120, dur: 0.5, vol: 0.06, pan: PAN[key] })
  },
  retreat: () => {
    tone({ type: 'triangle', f0: 700, f1: 300, dur: 0.6, vol: 0.05, pan: PAN.paintings })
  },
  warn: (key) => {
    tone({ type: 'sine', f0: 110, f1: 104, dur: 0.9, vol: 0.12, pan: PAN[key], attack: 0.3 })
  },
  whisper: () => noise({ dur: 1.4, vol: 0.08, f0: 1800, f1: 2600, type: 'bandpass', q: 8, pan: Math.random() * 2 - 1 }),
  thunder: () => {
    noise({ dur: 2.2, vol: 0.5, f0: 800, f1: 60 })
    noise({ dur: 1.5, vol: 0.3, f0: 300, f1: 50, delay: 0.3 })
  },
  heartbeat: () => {
    tone({ f0: 60, f1: 40, dur: 0.15, vol: 0.3 })
    tone({ f0: 60, f1: 40, dur: 0.15, vol: 0.22, delay: 0.22 })
  },
  scream: () => {
    noise({ dur: 1.4, vol: 0.55, f0: 4000, f1: 900, type: 'bandpass', q: 0.6 })
    tone({ type: 'sawtooth', f0: 900, f1: 300, dur: 1.4, vol: 0.18 })
    tone({ type: 'square', f0: 1200, f1: 500, dur: 1.2, vol: 0.08 })
  },
  sleep: () => {
    ;[392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.08, delay: i * 0.35, attack: 0.05 }))
  },
  alarm: () => {
    for (let i = 0; i < 8; i++) tone({ type: 'square', f0: 1600, dur: 0.08, vol: 0.06, delay: i * 0.16 + (i >= 4 ? 0.3 : 0) })
  },
  win: () => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.35, vol: 0.1, delay: 0.8 + i * 0.15 }))
  },
}
