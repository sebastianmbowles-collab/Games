// Sound effects for Aliens VS Dinos, made on the fly with the Web Audio API (no sound files).

let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let analyser = null
let muted = false
let beamHum = null
let sfxVol = 0.8
let musicVol = 0.6
const readyFns = []

export function isMuted() {
  return muted
}

export function setMuted(m) {
  muted = m
  if (m) beamOn(false)
  applyVolumes()
}

// Volumes go from 0 to 1. Music and sound effects each have their own volume knob.
export function setVolumes(sfx, music) {
  sfxVol = sfx
  musicVol = music
  applyVolumes()
}

function applyVolumes() {
  if (!ctx) return
  const t = ctx.currentTime
  master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.02)
  sfxBus.gain.setTargetAtTime(sfxVol, t, 0.02)
  musicBus.gain.setTargetAtTime(musicVol * 0.9, t, 0.02)
}

// Browsers only allow sound after the player touches the page, so this is called on the first key or tap.
export function wakeAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.connect(ctx.destination)
    sfxBus = ctx.createGain()
    sfxBus.connect(master)
    musicBus = ctx.createGain()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    analyser.smoothingTimeConstant = 0.7
    musicBus.connect(analyser)
    analyser.connect(master)
    applyVolumes()
    readyFns.splice(0).forEach((fn) => fn())
  }
  if (ctx.state === 'suspended') ctx.resume()
}

// Browsers only let a page make sound once it's allowed to. This quietly asks again; it starts
// the music the moment the browser says yes (straight away if you clicked to get here).
export function tryStartAudio() {
  if (!ctx) wakeAudio()
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
}

export function audioRunning() {
  return !!ctx && ctx.state === 'running'
}

// Phones and tablets only allow sound to start during a real tap (when the finger lifts) or a key
// press, so this runs on those. It also plays a tiny silent sound, which some iPads need before
// they'll make any noise, and asks iPhones/iPads to play even when the silent switch is on.
export function unlockAudio() {
  wakeAudio()
  if (!ctx) return
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
  } catch {
    // Older browsers don't have this; sound still works.
  }
  const b = ctx.createBuffer(1, 1, 22050)
  const src = ctx.createBufferSource()
  src.buffer = b
  src.connect(ctx.destination)
  src.start(0)
}

// The music player uses the same audio engine; this hands it over once it exists.
export function getAudio() {
  return ctx ? { ctx, musicBus, analyser } : null
}

export function onAudioReady(fn) {
  if (ctx) fn()
  else readyFns.push(fn)
}

function out(gain = 0.2) {
  const g = ctx.createGain()
  g.gain.value = gain
  g.connect(sfxBus)
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
function noise(dur, vol, filterType, freq, delay = 0, freqEnd = freq) {
  if (!ctx || muted) return
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t = ctx.currentTime + delay
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = filterType
  f.frequency.setValueAtTime(freq, t)
  f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur)
  const g = out(0)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// The tractor beam makes a wobbly hum for as long as it is switched on.
export function beamOn(on) {
  if (!ctx) return
  if (on && !beamHum && !muted) {
    const o = ctx.createOscillator()
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    const g = out(0)
    o.type = 'sine'
    o.frequency.value = 180
    lfo.frequency.value = 7
    lfoGain.gain.value = 40
    lfo.connect(lfoGain)
    lfoGain.connect(o.frequency)
    g.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.1)
    o.connect(g)
    o.start()
    lfo.start()
    beamHum = { o, lfo, g }
  } else if (!on && beamHum) {
    const { o, lfo, g } = beamHum
    const t = ctx.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(g.gain.value, t)
    g.gain.linearRampToValueAtTime(0, t + 0.12)
    o.stop(t + 0.15)
    lfo.stop(t + 0.15)
    beamHum = null
  }
}

export const sfx = {
  boing: () => tone('triangle', 180, 620, 0.3, 0.16),
  // night-time sounds
  cricket: () => {
    const f = 4000 + Math.random() * 800
    for (let i = 0; i < 3; i++) tone('sine', f, f * 1.03, 0.035, 0.018, i * 0.07)
  },
  owl: () => {
    tone('sine', 430, 380, 0.3, 0.05)
    tone('sine', 410, 350, 0.55, 0.05, 0.45)
  },
  step: () => {
    tone('sine', 90, 45, 0.12, 0.14)
    noise(0.08, 0.06, 'lowpass', 250)
  },
  click: () => tone('square', 900, 600, 0.05, 0.06),
  select: () => {
    tone('triangle', 520, 1040, 0.15, 0.12)
    tone('triangle', 780, 1560, 0.2, 0.1, 0.08)
  },
  capture: () => {
    tone('sine', 600, 1400, 0.25, 0.14)
    tone('sine', 900, 1800, 0.3, 0.1, 0.1)
  },
  stolen: () => tone('sawtooth', 500, 150, 0.4, 0.08),
  laser: () => tone('square', 1500, 300, 0.12, 0.07),
  plasma: () => tone('sawtooth', 300, 700, 0.2, 0.05),
  hit: () => {
    noise(0.15, 0.18, 'bandpass', 1500)
    tone('square', 300, 120, 0.12, 0.08)
  },
  hurt: () => {
    tone('sawtooth', 400, 80, 0.35, 0.12)
    noise(0.25, 0.15, 'lowpass', 800)
  },
  boom: () => {
    noise(1.1, 0.4, 'lowpass', 1200, 0, 60)
    tone('sine', 120, 30, 0.8, 0.3)
  },
  roar: (big = false) => {
    const d = big ? 1.1 : 0.7
    tone('sawtooth', 160, 70, d, 0.18)
    tone('sawtooth', 240, 90, d, 0.1, 0.02)
    noise(d, 0.25, 'bandpass', 700, 0, 250)
  },
  stun: () => {
    for (let i = 0; i < 3; i++) tone('triangle', 1400 - i * 200, 900 - i * 150, 0.1, 0.06, i * 0.07)
  },
  jump: () => tone('triangle', 200, 500, 0.15, 0.1),
  land: () => noise(0.12, 0.1, 'lowpass', 400),
  pickup: () => {
    tone('sine', 880, 880, 0.08, 0.1)
    tone('sine', 1320, 1320, 0.12, 0.1, 0.07)
  },
  hatch: () => {
    noise(0.08, 0.15, 'highpass', 3000)
    tone('triangle', 900, 1300, 0.12, 0.08, 0.1)
  },
  warn: () => tone('square', 700, 700, 0.08, 0.05),
  squeak: () => tone('sine', 900, 1500, 0.12, 0.08),
  whoosh: () => noise(0.6, 0.15, 'bandpass', 400, 0, 2500),
  wave: () => {
    ;[523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.2, 0.12, i * 0.1))
  },
  win: () => {
    ;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.25, 0.13, i * 0.13))
  },
  lose: () => {
    ;[392, 349, 311, 262].forEach((f, i) => tone('triangle', f, f * 0.97, 0.35, 0.13, i * 0.25))
  },
  firework: () => {
    tone('sine', 300, 1200, 0.3, 0.05)
    noise(0.5, 0.15, 'highpass', 2500, 0.3)
  },
}
