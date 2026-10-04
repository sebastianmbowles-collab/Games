// Chiptune music for Aliens VS Dinos. Every song is written as notes in this file and played live
// with the Web Audio API: a bass line, a tune, sparkly arpeggios and drums.

import { getAudio, onAudioReady } from './sound'

const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }

function midi(name) {
  const m = name.match(/^([A-G][#b]?)(\d)$/)
  return 12 * (Number(m[2]) + 1) + NOTE[m[1]]
}

const hz = (m) => 440 * 2 ** ((m - 69) / 12)

// "Am" -> the notes of an A minor chord (as numbers above C).
function chordNotes(sym) {
  const m = sym.match(/^([A-G][#b]?)(m?)$/)
  const root = NOTE[m[1]]
  return [root, root + (m[2] ? 3 : 4), root + 7, root + 12]
}

// A tune is written like "A4:2 C5:2 E5:4 .:4" = note:length (in 16th notes), "." is a rest.
function parseTune(str) {
  const steps = []
  for (const tok of str.trim().split(/\s+/)) {
    const [n, len] = tok.split(':')
    const l = Number(len) || 1
    steps.push(n === '.' ? null : { m: midi(n), len: l })
    for (let i = 1; i < l; i++) steps.push(null)
  }
  return steps
}

export const SONGS = [
  {
    id: 'title',
    name: 'Aliens VS Dinos!',
    emoji: '🛸',
    bpm: 128,
    chords: ['Am', 'F', 'C', 'G'],
    bass: { wave: 'triangle', pattern: 'R..RR.5.R..RO.5.' },
    arp: { wave: 'square', pattern: '0.1.2.1.0.1.2.3.' },
    lead: {
      wave: 'square',
      tune: `A4:2 C5:2 E5:4 D5:2 C5:2 E5:4  F5:4 E5:2 D5:2 C5:4 A4:4  G4:2 C5:2 E5:2 G5:2 A5:4 G5:4  G5:2 F5:2 E5:2 D5:2 B4:4 .:4
             A5:4 G5:2 E5:2 A5:4 C6:4  A5:2 G5:2 F5:4 C5:4 F5:4  E5:2 G5:2 C6:4 B5:2 G5:2 E5:4  D5:2 E5:2 G5:4 B5:4 .:4`,
    },
    drums: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  {
    id: 'ufo',
    name: 'UFO Patrol',
    emoji: '👽',
    bpm: 116,
    chords: ['Dm', 'Bb', 'C', 'Am'],
    bass: { wave: 'sawtooth', pattern: 'R.......R...5...' },
    arp: { wave: 'sawtooth', pattern: '0123432101234321' },
    lead: { wave: 'sine', tune: 'D5:6 F5:2 A5:8  Bb5:6 A5:2 F5:8  G5:4 E5:4 C5:4 E5:4  A5:12 .:4' },
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '..x...x...x...x.' },
  },
  {
    id: 'stomp',
    name: 'Dino Stomp',
    emoji: '🦖',
    bpm: 140,
    chords: ['Em', 'Em', 'C', 'D'],
    bass: { wave: 'sawtooth', pattern: 'RR..R.RR..R.O.5.' },
    arp: null,
    lead: {
      wave: 'square',
      tune: 'E5:2 E5:2 G5:2 E5:2 B5:4 A5:2 G5:2  E5:2 D5:2 E5:4 .:4 B4:4  C5:2 E5:2 G5:2 C6:2 B5:4 G5:4  A5:2 F#5:2 D5:4 F#5:2 A5:2 D6:4',
    },
    drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: '..x...x...x...x.' },
  },
  {
    id: 'boogie',
    name: 'Volcano Boogie',
    emoji: '🌋',
    bpm: 150,
    chords: ['F', 'F', 'Bb', 'F', 'C', 'Bb', 'F', 'C'],
    bass: { wave: 'triangle', pattern: 'R.3.5.6.O.6.5.3.' },
    arp: null,
    lead: {
      wave: 'square',
      tune: `F5:2 Ab5:1 A5:1 C6:4 A5:2 F5:2 .:4  C6:2 A5:2 F5:2 A5:2 C6:8  Bb5:2 D6:2 F6:4 D6:2 Bb5:2 .:4  A5:2 C6:2 A5:2 F5:2 C5:8
             G5:2 C6:2 E6:4 C6:2 G5:2 .:4  F5:2 Bb5:2 D6:4 Bb5:2 F5:2 .:4  A5:4 C6:4 F6:8  E6:2 C6:2 G5:2 E5:2 C5:8`,
    },
    drums: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  {
    id: 'lullaby',
    name: 'Mothership Lullaby',
    emoji: '🌙',
    bpm: 76,
    chords: ['C', 'Am', 'F', 'G'],
    pad: true,
    bass: { wave: 'sine', pattern: 'R.......5.......' },
    arp: { wave: 'sine', pattern: '0.2.4.2.1.2.4.2.' },
    lead: { wave: 'sine', tune: 'E5:4 G5:4 C6:8  B5:4 A5:4 E5:8  F5:4 A5:4 C6:4 A5:4  G5:12 .:4' },
    drums: { k: 'x...............', s: '................', h: '................' },
  },
  {
    id: 'victory',
    name: 'Victory Parade',
    emoji: '🏆',
    bpm: 160,
    chords: ['C', 'F', 'G', 'C'],
    bass: { wave: 'triangle', pattern: 'R...5...R...5...' },
    arp: { wave: 'square', pattern: '0.1.2.3.0.1.2.3.' },
    lead: {
      wave: 'square',
      tune: 'C5:2 E5:2 G5:2 C6:4 G5:2 C6:4  A5:2 C6:2 A5:2 F5:2 A5:4 C6:4  B5:2 D6:2 B5:2 G5:2 D6:4 B5:4  C6:4 G5:2 E5:2 C5:4 .:4',
    },
    drums: { k: 'x...x...x...x...', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x.x.' },
  },
]

for (const s of SONGS) s.steps = parseTune(s.lead.tune)

export const songById = (id) => SONGS.find((s) => s.id === id)

let song = null
let pending = null
let step = 0
let nextTime = 0
let startTime = 0
let timer = null
let noiseBuf = null

export function currentSong() {
  return song ? song.id : pending
}

export function playSong(id) {
  if (currentSong() === id) return
  stopMusic()
  pending = id
  onAudioReady(() => {
    if (pending !== id) return
    const a = getAudio()
    pending = null
    song = songById(id)
    step = 0
    startTime = nextTime = a.ctx.currentTime + 0.08
    timer = setInterval(tick, 25)
  })
}

export function stopMusic() {
  pending = null
  song = null
  clearInterval(timer)
  timer = null
}

// How far through the song we are, counted in 16th notes (used to make things dance on the beat).
export function songBeat() {
  const a = getAudio()
  if (!a || !song) return 0
  return Math.max(0, (a.ctx.currentTime - startTime) / stepLen())
}

const levels = new Uint8Array(32)
export function musicLevels() {
  const a = getAudio()
  if (a && song) a.analyser.getByteFrequencyData(levels)
  else levels.fill(0)
  return levels
}

const stepLen = () => 60 / song.bpm / 4

// Schedules notes a little ahead of time so the music never stutters.
function tick() {
  const a = getAudio()
  if (!a || !song) return
  while (nextTime < a.ctx.currentTime + 0.15) {
    playStep(a, step, nextTime)
    nextTime += stepLen()
    step++
  }
}

function voice(a, wave, f, t, dur, vol, detune = 0) {
  const o = a.ctx.createOscillator()
  const g = a.ctx.createGain()
  o.type = wave
  o.frequency.value = f
  o.detune.value = detune
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.6))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(a.musicBus)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function drum(a, kind, t) {
  const c = a.ctx
  if (kind === 'k') {
    const o = c.createOscillator()
    const g = c.createGain()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.15)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    o.connect(g)
    g.connect(a.musicBus)
    o.start(t)
    o.stop(t + 0.22)
    return
  }
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = kind === 's' ? 'bandpass' : 'highpass'
  f.frequency.value = kind === 's' ? 1800 : 7000
  const g = c.createGain()
  const dur = kind === 's' ? 0.16 : 0.04
  g.gain.setValueAtTime(kind === 's' ? 0.3 : 0.08, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f)
  f.connect(g)
  g.connect(a.musicBus)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.02)
}

function playStep(a, i, t) {
  const s = i % 16
  const chord = chordNotes(song.chords[Math.floor(i / 16) % song.chords.length])
  const len = stepLen()

  const b = song.bass.pattern[s]
  if (b && b !== '.') {
    const off = { R: 0, '3': chord[1] - chord[0], '5': 7, '6': 9, O: 12 }[b]
    voice(a, song.bass.wave, hz(36 + chord[0] + off), t, len * 1.8, 0.16)
  }
  if (song.arp) {
    const d = song.arp.pattern[s]
    if (d && d !== '.') {
      const n = Number(d)
      voice(a, song.arp.wave, hz(60 + chord[n % 4] + 12 * Math.floor(n / 4)), t, len * 0.9, song.arp.wave === 'sine' ? 0.05 : 0.03)
    }
  }
  if (song.pad && s === 0) {
    for (const n of chord.slice(0, 3)) voice(a, 'triangle', hz(60 + n), t, len * 16, 0.035)
  }
  const note = song.steps[i % song.steps.length]
  if (note) {
    const vol = song.lead.wave === 'sine' ? 0.12 : 0.06
    voice(a, song.lead.wave, hz(note.m), t, len * note.len * 0.95, vol)
    voice(a, song.lead.wave, hz(note.m), t, len * note.len * 0.95, vol * 0.5, 8)
  }
  for (const k of ['k', 's', 'h']) if (song.drums[k][s] === 'x') drum(a, k, t)
}
