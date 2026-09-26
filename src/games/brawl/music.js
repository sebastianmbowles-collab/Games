// Original chiptune soundtrack, played live with Web Audio (no sound files).
// Songs are written like sheet music: each bar has a chord, and the melody is a list of
// [startStep, note, lengthInSteps] with 16 steps (sixteenth notes) per bar.
import { audioContext, isMuted, onMuteChange } from './sound'

const SONGS = {
  // Fast and heroic, A minor. Plays during fights.
  fight: {
    bpm: 150,
    chords: ['Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'E'],
    drums: 'full',
    melody: [
      [[0, 'E5', 3], [3, 'A5', 3], [6, 'B5', 2], [8, 'C6', 4], [12, 'B5', 2], [14, 'A5', 2]],
      [[0, 'C6', 3], [3, 'A5', 3], [6, 'F5', 2], [8, 'A5', 6], [14, 'G5', 2]],
      [[0, 'B5', 3], [3, 'G5', 3], [6, 'D5', 2], [8, 'G5', 4], [12, 'A5', 2], [14, 'B5', 2]],
      [[0, 'G5', 6], [6, 'E5', 2], [8, 'B4', 8]],
      [[0, 'E5', 2], [2, 'E5', 2], [4, 'A5', 2], [6, 'C6', 2], [8, 'E6', 4], [12, 'D6', 2], [14, 'C6', 2]],
      [[0, 'D6', 3], [3, 'C6', 3], [6, 'A5', 2], [8, 'F5', 4], [12, 'A5', 2], [14, 'C6', 2]],
      [[0, 'B5', 2], [2, 'D6', 2], [4, 'B5', 2], [6, 'G5', 2], [8, 'D6', 4], [12, 'B5', 2], [14, 'D6', 2]],
      [[0, 'E6', 4], [4, 'D6', 2], [6, 'B5', 2], [8, 'G#5', 4], [12, 'E5', 4]],
    ],
  },
  // Calmer, for the title screen and character select.
  menu: {
    bpm: 112,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'],
    drums: 'light',
    melody: [
      [[0, 'A4', 4], [4, 'C5', 4], [8, 'E5', 6], [14, 'D5', 2]],
      [[0, 'C5', 4], [4, 'A4', 4], [8, 'F4', 8]],
      [[0, 'G4', 4], [4, 'C5', 4], [8, 'E5', 4], [12, 'G5', 4]],
      [[0, 'D5', 8], [8, 'B4', 4], [12, 'G4', 4]],
      [[0, 'A4', 4], [4, 'C5', 4], [8, 'E5', 4], [12, 'A5', 4]],
      [[0, 'G5', 4], [4, 'F5', 4], [8, 'C5', 8]],
      [[0, 'B4', 4], [4, 'D5', 4], [8, 'G5', 6], [14, 'F5', 2]],
      [[0, 'E5', 8], [8, 'G#4', 4], [12, 'B4', 4]],
    ],
  },
}

const CHORDS = {
  Am: ['A', 'C', 'E'],
  F: ['F', 'A', 'C'],
  G: ['G', 'B', 'D'],
  C: ['C', 'E', 'G'],
  Em: ['E', 'G', 'B'],
  E: ['E', 'G#', 'B'],
}
const SEMITONE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }

function freq(note) {
  const [, name, octave] = note.match(/^([A-G]#?)(\d)$/)
  const midi = 12 * (Number(octave) + 1) + SEMITONE[name]
  return 440 * 2 ** ((midi - 69) / 12)
}

// ---------- Instruments ----------

let out = null
let pulse = null
let noise = null

function setup(ac) {
  if (out) return
  out = ac.createGain()
  out.gain.value = isMuted() ? 0 : 0.55
  out.connect(ac.destination)
  // A 25% "pulse" wave: the thin, buzzy sound of old game consoles.
  const n = 32
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let i = 1; i < n; i++) imag[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * 0.25)
  pulse = ac.createPeriodicWave(real, imag)
  noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
}

function note(ac, { f, t, dur, vol, type = 'square', wave = null }) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  if (wave) osc.setPeriodicWave(wave)
  else osc.type = type
  osc.frequency.setValueAtTime(f, t)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.setValueAtTime(vol * 0.75, t + Math.min(0.06, dur * 0.5))
  g.gain.linearRampToValueAtTime(0, t + dur)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function hit(ac, { t, dur, vol, filter, freqHz }) {
  const src = ac.createBufferSource()
  src.buffer = noise
  const f = ac.createBiquadFilter()
  f.type = filter
  f.frequency.value = freqHz
  const g = ac.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(out)
  src.start(t)
  src.stop(t + dur + 0.02)
}

function kick(ac, t) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
  g.gain.setValueAtTime(0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  osc.connect(g).connect(out)
  osc.start(t)
  osc.stop(t + 0.17)
}

// ---------- One step of the song ----------

function playStep(ac, song, bar, step, t, stepDur) {
  const chord = CHORDS[song.chords[bar]]
  const root = chord[0]
  // Bass: bouncing octaves on eighth notes
  if (step % 2 === 0) {
    const octave = step % 4 === 0 ? 2 : 3
    note(ac, { f: freq(`${root}${octave}`), t, dur: stepDur * 1.8, vol: 0.22, type: 'triangle' })
  }
  // Arpeggio: the chord's notes, one after another, very fast
  const arp = chord[step % 3]
  const arpOct = song.drums === 'full' ? 4 : 4 + (step % 6 < 3 ? 0 : 1)
  note(ac, { f: freq(`${arp}${arpOct}`), t, dur: stepDur * 0.9, vol: song.drums === 'full' ? 0.035 : 0.045, wave: pulse })
  // Melody
  for (const [start, n, len] of song.melody[bar]) {
    if (start === step) note(ac, { f: freq(n), t, dur: stepDur * len * 0.95, vol: 0.075, type: 'square' })
  }
  // Drums
  if (song.drums === 'full') {
    if (step === 0 || step === 8 || step === 10) kick(ac, t)
    if (step === 4 || step === 12) hit(ac, { t, dur: 0.12, vol: 0.28, filter: 'bandpass', freqHz: 1800 })
    if (step % 2 === 0) hit(ac, { t, dur: 0.035, vol: 0.12, filter: 'highpass', freqHz: 7000 })
    // Little snare roll into the next section
    if (bar === 7 && step >= 12) hit(ac, { t, dur: 0.07, vol: 0.18, filter: 'bandpass', freqHz: 2000 })
  } else {
    if (step === 0) kick(ac, t)
    if (step % 4 === 2) hit(ac, { t, dur: 0.03, vol: 0.07, filter: 'highpass', freqHz: 8000 })
  }
}

// ---------- The conductor: schedules notes a little ahead so the beat never wobbles ----------

let current = null
let timer = null
let pos = { bar: 0, step: 0, time: 0 }

function tick() {
  const ac = audioContext()
  if (!ac || !current) return
  const song = SONGS[current]
  const stepDur = 60 / song.bpm / 4
  if (pos.time < ac.currentTime) pos.time = ac.currentTime + 0.05
  while (pos.time < ac.currentTime + 0.15) {
    playStep(ac, song, pos.bar, pos.step, pos.time, stepDur)
    pos.time += stepDur
    pos.step += 1
    if (pos.step === 16) {
      pos.step = 0
      pos.bar = (pos.bar + 1) % song.chords.length
    }
  }
}

export function playMusic(name) {
  if (current === name && timer) return
  const ac = audioContext()
  if (!ac) return
  setup(ac)
  current = name
  pos = { bar: 0, step: 0, time: 0 }
  if (!timer) timer = setInterval(tick, 25)
}

export function stopMusic() {
  current = null
  clearInterval(timer)
  timer = null
}

onMuteChange((muted) => {
  if (!out) return
  const ac = audioContext()
  out.gain.setTargetAtTime(muted ? 0 : 0.55, ac.currentTime, 0.05)
})
