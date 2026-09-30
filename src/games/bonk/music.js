import { getAudio } from './sound'

// Tiny chiptune music player: each song is a few looping 16-step patterns
// (bass, lead melody, drums) scheduled a little ahead with Web Audio.
const N = (name) => {
  if (!name) return null
  const m = name.match(/^([A-G]#?)(\d)$/)
  const idx = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(m[1])
  return 440 * 2 ** ((idx + (Number(m[2]) + 1) * 12 - 69) / 12)
}
const seq = (s) => s.split(' ').map((x) => (x === '.' ? null : x))

const SONGS = {
  // goofy, bouncy arcade theme
  title: {
    bpm: 148,
    lead: [
      seq('C5 . E5 G5 . E5 C5 . D5 . F5 A5 . F5 D5 .'),
      seq('E5 . G5 C6 . G5 E5 . D5 F5 A5 . G5 . . .'),
      seq('C5 . E5 G5 . E5 C5 . A4 . C5 F5 . E5 D5 .'),
      seq('C5 D5 E5 G5 . C6 . G5 E5 . D5 . C5 . . .'),
    ],
    bass: [seq('C3 . C3 . G2 . G2 . F2 . F2 . G2 . G2 .'), seq('A2 . A2 . E2 . E2 . F2 . F2 . G2 . B2 .')],
    drums: 'k.h.s.h.k.khs.hh',
    wave: 'square',
  },
  // relaxed hub music
  hub: {
    bpm: 112,
    lead: [
      seq('E5 . . G5 . . A5 . G5 . E5 . D5 . . .'),
      seq('C5 . . E5 . . G5 . A5 . G5 . E5 . . .'),
      seq('F5 . . A5 . . C6 . A5 . F5 . G5 . . .'),
      seq('E5 . D5 . C5 . D5 . E5 . . . . . . .'),
    ],
    bass: [seq('C3 . . . G2 . . . A2 . . . F2 . . .'), seq('F2 . . . C3 . . . G2 . . . G2 . . .')],
    drums: 'k...s...k.k.s...',
    wave: 'triangle',
  },
  // fast battle theme
  match: {
    bpm: 168,
    lead: [
      seq('A4 . C5 E5 A5 . E5 C5 G4 . B4 D5 G5 . D5 B4'),
      seq('F4 . A4 C5 F5 . C5 A4 E4 . G#4 B4 E5 . . .'),
      seq('A4 A4 . C5 . E5 . A5 G5 . E5 . D5 . C5 .'),
      seq('F5 . E5 . D5 . C5 . B4 . C5 D5 E5 . . .'),
    ],
    bass: [seq('A2 A2 A3 A2 G2 G2 G3 G2 F2 F2 F3 F2 E2 E2 E3 E2')],
    drums: 'k.hsk.hsk.hskkhs',
    wave: 'square',
  },
}

let current = null
let timer = null
let step = 0
let nextTime = 0
let musicGain = null
let volume = 0.5
let enabled = true

export function setMusicEnabled(on) {
  enabled = on
  if (musicGain) musicGain.gain.value = on ? volume * 0.35 : 0
}
export function setMusicVolume(v) {
  volume = v
  if (musicGain && enabled) musicGain.gain.value = v * 0.35
}

function note(ac, freq, t, dur, type, vol) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(musicGain)
  o.start(t)
  o.stop(t + dur + 0.02)
}

let noiseBuf = null
function drum(ac, kind, t) {
  if (kind === 'k') {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12)
    g.gain.setValueAtTime(0.9, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
    o.connect(g).connect(musicGain)
    o.start(t)
    o.stop(t + 0.16)
    return
  }
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const f = ac.createBiquadFilter()
  f.type = kind === 'h' ? 'highpass' : 'bandpass'
  f.frequency.value = kind === 'h' ? 7000 : 1800
  const g = ac.createGain()
  const len = kind === 'h' ? 0.04 : 0.14
  g.gain.setValueAtTime(kind === 'h' ? 0.25 : 0.5, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + len)
  src.connect(f).connect(g).connect(musicGain)
  src.start(t)
  src.stop(t + len + 0.02)
}

function schedule() {
  const ac = getAudio()
  if (!ac || !current) return
  const song = SONGS[current]
  const s16 = 60 / song.bpm / 4
  while (nextTime < ac.currentTime + 0.15) {
    const bar = Math.floor(step / 16)
    const i = step % 16
    const lead = song.lead[bar % song.lead.length][i]
    if (lead) note(ac, N(lead), nextTime, s16 * 1.8, song.wave, 0.18)
    const bass = song.bass[bar % song.bass.length][i]
    if (bass) note(ac, N(bass), nextTime, s16 * 1.6, 'triangle', 0.35)
    const d = song.drums[i]
    if (d !== '.') drum(ac, d, nextTime)
    nextTime += s16
    step++
  }
}

export function playMusic(name) {
  const ac = getAudio()
  if (!ac || current === name) return
  if (!musicGain) {
    musicGain = ac.createGain()
    musicGain.connect(ac.destination)
  }
  musicGain.gain.value = enabled ? volume * 0.35 : 0
  current = name
  step = 0
  nextTime = ac.currentTime + 0.1
  clearInterval(timer)
  timer = setInterval(schedule, 40)
}

export function stopMusic() {
  current = null
  clearInterval(timer)
}
