// Synthesised sound effects. To use real sound files instead (for example ones
// downloaded from Mixkit or Pixabay), put them in a `sounds` folder next to the
// game and list their file names, one per line, in sounds/list.txt. Supported
// names: jump, bonk, punch, whoosh, win, lose, achievement, coin, click,
// countdown, cheer, quack, pop (e.g. "jump.mp3").
let ac = null
let muted = false
let noiseBuf = null
const files = {}
const FILE_NAMES = ['jump', 'bonk', 'punch', 'whoosh', 'win', 'lose', 'achievement', 'coin', 'click', 'countdown', 'cheer', 'quack', 'pop']

function loadSoundFiles() {
  if (location.protocol === 'file:') return
  fetch('sounds/list.txt')
    .then((r) => (r.ok ? r.text() : ''))
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        const m = line.trim().match(/^([a-z]+)\.(mp3|wav|ogg)$/)
        if (!m || !FILE_NAMES.includes(m[1])) continue
        const a = new Audio(`sounds/${line.trim()}`)
        a.preload = 'auto'
        a.addEventListener('canplaythrough', () => (files[m[1]] = a), { once: true })
      }
    })
    .catch(() => {})
}

export function unlockAudio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return
      ac = new AC()
      loadSoundFiles()
    }
    if (ac.state === 'suspended') ac.resume()
  } catch {
    ac = null
  }
}

export function setMuted(value) {
  muted = value
}

export const isMuted = () => muted

function file(name) {
  if (muted || !files[name]) return false
  try {
    const a = files[name].cloneNode()
    a.volume = 0.6
    a.play().catch(() => {})
    return true
  } catch {
    return false
  }
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

function noise(dur, vol, freq, delay = 0, type = 'bandpass') {
  if (!ac || muted) return
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const t = ac.currentTime + delay
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const f = ac.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = ac.createGain()
  g.gain.setValueAtTime(0.001, t)
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur / 3))
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(ac.destination)
  src.start(t)
  src.stop(t + dur + 0.05)
}

function quackSynth(pitch = 1, vol = 0.22) {
  // A quack is a nasal, buzzy "waak" with a quick pitch drop.
  tone('sawtooth', 700 * pitch, 420 * pitch, 0.16, vol)
  tone('square', 1050 * pitch, 600 * pitch, 0.12, vol * 0.4)
  noise(0.1, vol * 0.5, 1500 * pitch)
}

export const sfx = {
  bonk() {
    if (file('bonk')) return
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
    if (file('punch')) return
    tone('sawtooth', 160, 40, 0.45, 0.35)
    noise(0.3, 0.5, 400)
  },
  pop() {
    if (file('pop')) return
    noise(0.05, 0.5, 3000, 0, 'highpass')
    tone('sine', 900, 200, 0.08, 0.2)
  },
  whiff() {
    if (file('whoosh')) return
    noise(0.12, 0.08, 3000)
  },
  dash() {
    if (file('whoosh')) return
    noise(0.2, 0.22, 2400)
  },
  jump() {
    if (file('jump')) return
    tone('square', 300, 700, 0.12, 0.08)
  },
  flap() {
    noise(0.1, 0.15, 900)
    tone('triangle', 500, 800, 0.08, 0.06)
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
    if (file('coin')) return
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
    if (file('countdown')) return
    tone('square', 440, 440, 0.15, 0.08)
  },
  go() {
    tone('square', 880, 880, 0.35, 0.1)
  },
  win() {
    if (file('win')) return
    ;[523, 659, 784, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.2, 0.08, i * 0.12))
  },
  lose() {
    if (file('lose')) return
    ;[392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.97, 0.3, 0.15, i * 0.22))
  },
  cheer() {
    if (file('cheer')) return
    noise(1.6, 0.18, 1200)
    noise(1.2, 0.12, 2500, 0.2)
  },
  achievement() {
    if (file('achievement')) return
    ;[784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.22, 0.12, i * 0.07))
  },
  click() {
    if (file('click')) return
    tone('square', 1200, 900, 0.04, 0.05)
  },
  quack() {
    if (file('quack')) return
    quackSynth(0.9 + Math.random() * 0.25)
  },
  bigQuack() {
    quackSynth(0.35, 0.4)
    quackSynth(0.36, 0.2)
  },
  spooky() {
    tone('sine', 110, 55, 2.5, 0.25)
    tone('sine', 165, 80, 2.5, 0.12)
  },
}
