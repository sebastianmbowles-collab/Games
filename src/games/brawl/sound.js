// 8-bit sound effects synthesized with Web Audio (no sound files needed),
// plus voice lines using the browser's built-in speech synthesis.

const MUTE_KEY = 'brawlMuted'
let ctx = null
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
  if (value) window.speechSynthesis?.cancel()
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

// A square/triangle/saw "beep" that slides from f0 to f1.
function tone({ type = 'square', f0, f1 = f0, dur, vol = 0.12, delay = 0 }) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + delay
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

let noiseBuffer = null
// A burst of static, filtered so it sounds like a thud, swoosh or crash.
function noise({ dur, vol = 0.2, f0 = 2000, f1 = f0, delay = 0, type = 'lowpass' }) {
  const ac = audio()
  if (!ac) return
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    // Chunky, stepped noise sounds more 8-bit than smooth white noise.
    let v = 0
    for (let i = 0; i < data.length; i++) {
      if (i % 4 === 0) v = Math.random() * 2 - 1
      data[i] = v
    }
  }
  const t = ac.currentTime + delay
  const src = ac.createBufferSource()
  src.buffer = noiseBuffer
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(f0, t)
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(vol, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter).connect(gain).connect(ac.destination)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function notes(list, { type = 'square', vol = 0.1, len = 0.1 } = {}) {
  list.forEach((f, i) => f && tone({ type, f0: f, dur: len * 0.95, vol, delay: i * len }))
}

export const sfx = {
  swing: () => noise({ dur: 0.08, vol: 0.08, f0: 3000, f1: 800, type: 'bandpass' }),
  punch: () => {
    noise({ dur: 0.1, vol: 0.3, f0: 1800, f1: 300 })
    tone({ f0: 220, f1: 90, dur: 0.08, vol: 0.12 })
  },
  heavy: () => {
    noise({ dur: 0.25, vol: 0.4, f0: 1200, f1: 80 })
    tone({ f0: 160, f1: 40, dur: 0.22, vol: 0.18 })
  },
  block: () => {
    tone({ f0: 1400, f1: 1100, dur: 0.07, vol: 0.08 })
    tone({ f0: 2100, f1: 1800, dur: 0.05, vol: 0.05, delay: 0.02 })
  },
  jump: () => tone({ f0: 300, f1: 700, dur: 0.12, vol: 0.06 }),
  special: () => {
    notes([392, 523, 659, 784], { len: 0.05, vol: 0.08 })
    noise({ dur: 0.3, vol: 0.12, f0: 600, f1: 4000, type: 'bandpass' })
  },
  throw: () => noise({ dur: 0.3, vol: 0.15, f0: 400, f1: 3000, type: 'bandpass' }),
  slam: () => {
    noise({ dur: 0.45, vol: 0.5, f0: 900, f1: 40 })
    tone({ type: 'triangle', f0: 120, f1: 30, dur: 0.4, vol: 0.3 })
  },
  clash: () => {
    noise({ dur: 0.35, vol: 0.35, f0: 3000, f1: 200 })
    tone({ f0: 880, f1: 110, dur: 0.3, vol: 0.08 })
  },
  ko: () => {
    noise({ dur: 0.6, vol: 0.45, f0: 1500, f1: 50 })
    tone({ type: 'sawtooth', f0: 440, f1: 55, dur: 0.9, vol: 0.12 })
  },
  round: () => notes([523, 0, 523, 784], { len: 0.09 }),
  fight: () => notes([392, 523, 659, 1047], { len: 0.07, vol: 0.12 }),
  win: () => notes([523, 659, 784, 1047, 0, 784, 1047], { len: 0.12, vol: 0.1 }),
  select: () => tone({ f0: 660, f1: 990, dur: 0.07, vol: 0.07 }),
  lose: () => notes([392, 330, 262, 196], { len: 0.18, type: 'triangle', vol: 0.15 }),
}

// ---------- Voices ----------

const ANNOUNCER = { pitch: 0.5, rate: 0.85 }
let voice = null

function pickVoice() {
  const all = window.speechSynthesis?.getVoices() ?? []
  voice = all.find((v) => /^en(-|_)US/i.test(v.lang)) || all.find((v) => /^en/i.test(v.lang)) || null
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice()
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

// `interrupt` cuts off whatever is being said (the announcer gets priority).
// Otherwise the line is skipped if someone is already talking, so voices don't pile up.
export function say(text, { pitch = 1, rate = 1, interrupt = false } = {}) {
  const synth = window.speechSynthesis
  if (muted || !synth) return
  if (interrupt) synth.cancel()
  else if (synth.speaking || synth.pending) return
  const u = new SpeechSynthesisUtterance(text)
  if (voice) u.voice = voice
  u.pitch = pitch
  u.rate = rate
  u.volume = 1
  synth.speak(u)
}

export function announce(text) {
  say(text, { ...ANNOUNCER, interrupt: true })
}

export function stopVoices() {
  window.speechSynthesis?.cancel()
}

// Turn a frame's game events into sounds and voice lines.
export function playEvents(events, match, youSide = null) {
  for (const e of events) {
    const f = e.side !== undefined && e.side !== null ? match.fighters[e.side] : null
    switch (e.type) {
      case 'swing':
        sfx.swing()
        break
      case 'hit':
        if (e.blocked) sfx.block()
        else if (e.heavy) sfx.heavy()
        else sfx.punch()
        break
      case 'jump':
        sfx.jump()
        break
      case 'special':
        sfx.special()
        say(`${f.def.special.name}!`, { ...f.def.voice, interrupt: true })
        break
      case 'throw':
        sfx.throw()
        break
      case 'slam':
        sfx.slam()
        break
      case 'clash':
        sfx.clash()
        break
      case 'round':
        sfx.round()
        announce(e.final ? 'Final round!' : `Round ${e.n}!`)
        break
      case 'fight':
        sfx.fight()
        announce('Fight!')
        break
      case 'ko':
        sfx.ko()
        announce('K. O.!')
        break
      case 'time':
        sfx.ko()
        announce('Time!')
        break
      case 'roundWin':
        announce(f ? `${f.def.say} wins!` : 'Draw!')
        break
      case 'matchWin':
        if (youSide === null || youSide === e.side) sfx.win()
        else sfx.lose()
        // Let the fanfare play, then the champion says their line.
        setTimeout(() => say(f.def.win, { ...f.def.voice, interrupt: true }), 700)
        break
      default:
    }
  }
}
