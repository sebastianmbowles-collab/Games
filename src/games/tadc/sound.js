// 8-bit sound for the Boss Rush: a tiny chiptune "tracker" for music and a box of sound effects.
// Everything is made live with the Web Audio API, no sound files.
//
// Music channels, like an old game console:
//   pulse waves (12.5%, 25% and 50% wide) for melodies, a triangle for bass, and noise for drums.

import { SONGS } from './music'

let ctx = null
let master = null
let musicBus = null
let sfxBus = null
let noiseBuf = null
const waves = {}
let musicOn = true
let sfxOn = true

export const audioState = () => ({ musicOn, sfxOn })

export function setMusicOn(on) {
  musicOn = on
  if (musicBus) musicBus.gain.value = on ? 0.5 : 0
}

export function setSfxOn(on) {
  sfxOn = on
  if (sfxBus) sfxBus.gain.value = on ? 0.75 : 0
}

// Browsers only allow sound after the player presses something, so the game calls this on every press.
export function wakeAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
    musicBus = ctx.createGain()
    musicBus.gain.value = musicOn ? 0.5 : 0
    musicBus.connect(master)
    sfxBus = ctx.createGain()
    sfxBus.gain.value = sfxOn ? 0.75 : 0
    sfxBus.connect(master)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    for (const duty of [0.125, 0.25, 0.5]) waves[duty] = pulseWave(duty)
    if (pendingSong) playMusic(pendingSong)
  }
  if (ctx.state === 'suspended') ctx.resume()
}

function pulseWave(duty) {
  const n = 48
  const re = new Float32Array(n)
  const im = new Float32Array(n)
  for (let k = 1; k < n; k++) {
    re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI)
    im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI)
  }
  return ctx.createPeriodicWave(re, im)
}

export const midi = (n) => 440 * 2 ** ((n - 69) / 12)

// One note. wave: 'p12' | 'p25' | 'p50' | 'tri' | 'saw' | 'sine'.
function voice(wave, f0, f1, time, dur, vol, bus, vib = 0) {
  if (!ctx) return
  const o = ctx.createOscillator()
  if (wave === 'p12') o.setPeriodicWave(waves[0.125])
  else if (wave === 'p25') o.setPeriodicWave(waves[0.25])
  else if (wave === 'p50') o.setPeriodicWave(waves[0.5])
  else o.type = wave === 'tri' ? 'triangle' : wave === 'saw' ? 'sawtooth' : 'sine'
  o.frequency.setValueAtTime(f0, time)
  if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), time + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(vol, time + 0.004)
  g.gain.setValueAtTime(vol, time + Math.max(0.005, dur - 0.03))
  g.gain.linearRampToValueAtTime(0, time + dur)
  o.connect(g)
  g.connect(bus)
  if (vib) {
    const lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = 6
    lg.gain.value = f0 * vib
    lfo.connect(lg)
    lg.connect(o.frequency)
    lfo.start(time)
    lfo.stop(time + dur + 0.05)
  }
  o.start(time)
  o.stop(time + dur + 0.05)
}

function noise(time, dur, vol, bus, { type = 'lowpass', freq = 2000, q = 0.7, sweepTo = 0 } = {}) {
  if (!ctx) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.setValueAtTime(freq, time)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, time + dur)
  f.Q.value = q
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, time)
  g.gain.exponentialRampToValueAtTime(0.0008, time + dur)
  src.connect(f)
  f.connect(g)
  g.connect(bus)
  src.start(time, Math.random() * 0.5)
  src.stop(time + dur + 0.02)
}

function drum(kind, time, vol, bus) {
  if (kind === 'k') {
    voice('sine', 160, 38, time, 0.14, vol * 1.6, bus)
    noise(time, 0.02, vol * 0.5, bus, { freq: 1200 })
  } else if (kind === 's') {
    noise(time, 0.13, vol * 0.9, bus, { type: 'bandpass', freq: 1900, q: 0.6 })
    voice('tri', 190, 140, time, 0.07, vol * 0.8, bus)
  } else if (kind === 'h') {
    noise(time, 0.035, vol * 0.45, bus, { type: 'highpass', freq: 7000 })
  } else if (kind === 'o') {
    noise(time, 0.16, vol * 0.4, bus, { type: 'highpass', freq: 6000 })
  } else if (kind === 'c') {
    noise(time, 0.7, vol * 0.5, bus, { type: 'highpass', freq: 4000 })
  } else if (kind === 't') {
    voice('tri', 220, 90, time, 0.12, vol * 1.2, bus)
  }
}

// ---------- Music ----------

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
function noteNum(s) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s)
  if (!m) return null
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}

// Turns "C5:2 E5 .:2 C4+E4:2 C5~G5:4" into events. ':n' is length in steps (default 1),
// '.' is a rest, '+' plays notes together, '~' slides from one note to another. '|' is ignored.
export function parseTrack(str) {
  const events = []
  let step = 0
  for (const tok of str.split(/\s+/)) {
    if (!tok || tok === '|') continue
    const [body, lenS] = tok.split(':')
    const len = lenS ? Number(lenS) : 1
    if (body !== '.') {
      if (/^[kshoct]+$/.test(body)) events.push({ step, len, drums: body })
      else
        for (const part of body.split('+')) {
          const [a, b] = part.split('~')
          events.push({ step, len, n: noteNum(a), to: b ? noteNum(b) : null })
        }
    }
    step += len
  }
  return { events, length: step }
}

const parsedCache = new Map()
function parsedSong(name) {
  if (!parsedCache.has(name)) {
    const s = SONGS[name]
    parsedCache.set(name, { ...s, tracks: s.tracks.map((t) => ({ ...t, ...parseTrack(t.notes) })) })
  }
  return parsedCache.get(name)
}

let song = null
let songName = null
let pendingSong = null
let songStep = 0
let nextTime = 0
let timer = null
let tempoMul = 1

export function currentSong() {
  return songName
}

export function setTempo(mul) {
  tempoMul = mul
}

function stepDur() {
  return 60 / (song.bpm * tempoMul) / 4
}

function schedule() {
  if (!song) return
  while (nextTime < ctx.currentTime + 0.25) {
    const sd = stepDur()
    for (const tr of song.tracks) {
      const local = song.loop === false && songStep >= tr.length ? -1 : songStep % tr.length
      for (const ev of tr.events) {
        if (ev.step !== local) continue
        if (ev.drums) {
          for (const d of ev.drums) drum(d, nextTime, tr.vol, musicBus)
        } else if (ev.n !== null) {
          const f0 = midi(ev.n + (tr.shift || 0))
          const f1 = ev.to !== null ? midi(ev.to + (tr.shift || 0)) : f0
          voice(tr.wave, f0, f1, nextTime, sd * ev.len * (tr.gate || 0.9), tr.vol, musicBus, tr.vib || 0)
        }
      }
    }
    nextTime += sd
    songStep++
    const longest = Math.max(...song.tracks.map((t) => t.length))
    if (song.loop === false && songStep >= longest) {
      stopMusic()
      return
    }
  }
}

export function playMusic(name, restart = false) {
  if (!ctx) {
    pendingSong = name
    return
  }
  if (songName === name && !restart) return
  songName = name
  song = parsedSong(name)
  songStep = 0
  tempoMul = 1
  nextTime = ctx.currentTime + 0.08
  if (!timer) timer = setInterval(schedule, 40)
}

export function stopMusic() {
  song = null
  songName = null
  pendingSong = null
}

// ---------- Sound effects ----------

function at(delay = 0) {
  return ctx.currentTime + delay
}

function sv(wave, f0, f1, dur, vol, delay = 0) {
  if (ctx) voice(wave, f0, f1, at(delay), dur, vol, sfxBus)
}

function sn(dur, vol, opts, delay = 0) {
  if (ctx) noise(at(delay), dur, vol, sfxBus, opts)
}

function notes(list, wave, stepS, vol, delay = 0) {
  list.forEach((n, i) => {
    if (n !== null) sv(wave, midi(n), midi(n), stepS * 0.9, vol, delay + i * stepS)
  })
}

export const sfx = {
  beep() {
    sv('p50', 880, 880, 0.05, 0.08)
  },
  blip() {
    sv('p25', 660, 1320, 0.08, 0.09)
  },
  back() {
    sv('p25', 660, 330, 0.08, 0.08)
  },
  jump() {
    sv('p25', 300, 700, 0.11, 0.07)
  },
  land() {
    sv('tri', 180, 90, 0.06, 0.14)
  },
  step() {
    sn(0.02, 0.05, { type: 'highpass', freq: 3000 })
  },
  plop() {
    sv('sine', 520, 160, 0.09, 0.2)
    sn(0.05, 0.06, { freq: 900 })
  },
  pfft() {
    // The whoopie cushion. A long, rude, wobbly noise.
    if (!ctx) return
    const t = at()
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(95, t)
    o.frequency.linearRampToValueAtTime(70, t + 0.9)
    const lfo = ctx.createOscillator()
    const lg = ctx.createGain()
    lfo.frequency.value = 28
    lg.gain.value = 30
    lfo.connect(lg)
    lg.connect(o.frequency)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 700
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.25, t)
    g.gain.linearRampToValueAtTime(0.2, t + 0.7)
    g.gain.linearRampToValueAtTime(0, t + 0.95)
    o.connect(f)
    f.connect(g)
    g.connect(sfxBus)
    o.start(t)
    lfo.start(t)
    o.stop(t + 1)
    lfo.stop(t + 1)
    sn(0.9, 0.12, { freq: 500 })
  },
  shortPfft() {
    sv('saw', 110, 70, 0.25, 0.12)
    sn(0.25, 0.08, { freq: 500 })
  },
  throw() {
    sn(0.12, 0.1, { type: 'bandpass', freq: 1500, sweepTo: 4000 })
  },
  ping() {
    sv('p12', 1400, 1100, 0.05, 0.05)
  },
  swish() {
    sn(0.35, 0.14, { type: 'bandpass', freq: 600, q: 1.5, sweepTo: 3500 })
  },
  whoosh() {
    sn(0.5, 0.2, { type: 'bandpass', freq: 3000, q: 0.8, sweepTo: 300 })
  },
  boing() {
    if (!ctx) return
    const t = at()
    voice('tri', 200, 700, 0.25, 0.25, t, sfxBus, 0.08)
  },
  thump() {
    sv('sine', 140, 60, 0.12, 0.2)
    sn(0.08, 0.1, { freq: 600 })
  },
  vomit() {
    sv('saw', 150, 55, 0.5, 0.1)
    sn(0.55, 0.22, { freq: 400, sweepTo: 150 })
  },
  splat() {
    sn(0.15, 0.18, { freq: 700 })
    sv('sine', 200, 80, 0.1, 0.12)
  },
  slip() {
    sv('sine', 900, 1500, 0.08, 0.05)
  },
  warn() {
    sv('p50', 988, 988, 0.05, 0.05)
    sv('p50', 988, 988, 0.05, 0.05, 0.09)
  },
  shake() {
    sn(0.4, 0.2, { freq: 200 })
    sv('sine', 70, 40, 0.4, 0.2)
  },
  countdown() {
    sv('p25', 440, 440, 0.12, 0.08)
  },
  go() {
    sv('p25', 880, 880, 0.3, 0.09)
    sv('p25', 1320, 1320, 0.3, 0.05)
  },
  pause() {
    notes([76, 72, 79], 'p25', 0.06, 0.07)
  },
  text() {
    sv('p50', 500 + Math.random() * 80, 500, 0.03, 0.03)
  },
  glitch() {
    for (let i = 0; i < 6; i++) {
      const f = 200 + Math.random() * 1600
      sv('p12', f, f * (0.4 + Math.random()), 0.05, 0.05, i * 0.04)
    }
  },
  hurt() {
    // The screen flashes and Pomni glitches.
    sn(0.25, 0.25, { type: 'highpass', freq: 1500 })
    for (let i = 0; i < 5; i++) sv('p12', 1500 - i * 200, 300, 0.05, 0.07, i * 0.03)
  },
  death() {
    // BWAAAAAAM
    sv('saw', 220, 55, 1.2, 0.14)
    sv('p50', 110, 28, 1.2, 0.12)
    sn(1.2, 0.2, { freq: 900, sweepTo: 100 })
  },
  dunDunDun() {
    ;[0, 0.32, 0.64].forEach((d, i) => {
      const n = [43, 43, 38][i]
      sv('saw', midi(n), midi(n), i === 2 ? 0.9 : 0.25, 0.13, d)
      sv('p50', midi(n + 12), midi(n + 12), i === 2 ? 0.9 : 0.25, 0.06, d)
      sn(0.3, 0.15, { freq: 400 }, d)
    })
  },
  fanfare() {
    // DADADADADADADAAAA!
    notes([72, 72, 72, 72, 76, 76, 79, 79], 'p25', 0.09, 0.08)
    sv('p25', midi(84), midi(84), 0.9, 0.09, 0.72)
    sv('p50', midi(76), midi(76), 0.9, 0.05, 0.72)
    sv('tri', midi(48), midi(48), 0.9, 0.2, 0.72)
  },
  gameOver() {
    notes([67, null, 66, null, 65, null, 64, 64, 64], 'p50', 0.16, 0.07)
    sv('tri', midi(40), midi(28), 1.3, 0.2, 0.2)
  },
  cheer() {
    notes([72, 76, 79, 84], 'p25', 0.07, 0.07)
  },
  secret() {
    notes([84, 88, 91, 96, 91, 96], 'p12', 0.07, 0.06)
  },
  static() {
    sn(0.6, 0.1, { type: 'highpass', freq: 2500 })
  },
}
