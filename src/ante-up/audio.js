// All sound is made here with the Web Audio API: no sound files.
// Instruments are little functions that schedule oscillators and noise.
import { meta } from './state.js';

let ctx = null, master, musicBus, sfxBus, ambBus, verbIn, comp, noiseBuf, brownBuf;
export const A = { ready: false };
const M = { mode: 'off', act: 0, intensity: 0, tick: 0, layers: 4, bar: 0, next: 0, insane: 0, hopeful: false, ducked: false };
A.M = M;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
  master = ctx.createGain();
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  ambBus = ctx.createGain(); ambBus.connect(master);
  // a damp cellar: generated impulse response
  const verb = ctx.createConvolver();
  const len = ctx.sampleRate * 3.2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 800 ? i / 800 : 1);
  }
  verb.buffer = ir;
  verbIn = ctx.createGain(); verbIn.gain.value = 0.55;
  verbIn.connect(verb).connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  brownBuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const bd = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bd.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = last * 3.5; }
  A.ready = true;
  applyVolume();
  setInterval(schedule, 40);
  setInterval(ambientTick, 250);
}

export function applyVolume() {
  if (!ctx) return;
  const s = meta.settings;
  master.gain.setTargetAtTime(s.master, ctx.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(M.ducked ? 0 : s.music * 0.75, ctx.currentTime, 0.08);
}
A.applyVolume = applyVolume;
const now = () => ctx.currentTime;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function out(dest, wet = 0.3) {
  const g = ctx.createGain();
  g.connect(dest);
  if (wet > 0) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w).connect(verbIn); }
  return g;
}
function noise(t, dur, dest, { type = 'bandpass', f = 1000, q = 1, gain = 0.3, a = 0.005, r = null, f2 = null, brown = false } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = brown ? brownBuf : noiseBuf;
  s.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (r ?? dur));
  s.connect(fl).connect(g).connect(dest);
  s.start(t, Math.random() * 1.5);
  s.stop(t + (r ?? dur) + 0.05);
  return { s, fl, g };
}
function tone(t, freq, dur, dest, { type = 'sine', gain = 0.2, a = 0.005, f2 = null, detune = 0 } = {}) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}

// ---------------------------------------------------------------- instruments
const I = {
  piano(m, t, v = 0.5, dur = 2.6, dest = musicBus, det = 0) {
    const o = out(dest, 0.45);
    const f = mtof(m);
    const wob = det + (Math.random() - 0.5) * M.insane * 60;
    tone(t, f, dur, o, { gain: 0.22 * v, a: 0.004, detune: wob });
    tone(t, f * 2.003, dur * 0.6, o, { gain: 0.08 * v, a: 0.004, detune: wob });
    tone(t, f * 3.01, dur * 0.35, o, { gain: 0.035 * v, a: 0.003, detune: wob });
    tone(t, f * 0.5, dur * 0.8, o, { gain: 0.03 * v, a: 0.01 });
    noise(t, 0.04, o, { type: 'lowpass', f: 2500, gain: 0.03 * v });
  },
  revPiano(m, t, dur = 1.6, v = 0.5) {
    const o = out(musicBus, 0.7);
    const f = mtof(m);
    for (const [k, gg] of [[1, 0.2], [2.003, 0.07], [3.01, 0.03]]) {
      const os = ctx.createOscillator(); os.frequency.value = f * k;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gg * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
      os.connect(g).connect(o); os.start(t); os.stop(t + dur + 0.1);
    }
  },
  cello(m, t, dur = 2, v = 0.5, dest = musicBus) {
    const o = out(dest, 0.4);
    const f = mtof(m);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900 + v * 500; fl.Q.value = 1.2;
    const bp = ctx.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 420; bp.gain.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * v, t + 0.28);
    g.gain.setValueAtTime(0.12 * v, t + dur - 0.25); g.gain.linearRampToValueAtTime(0, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.value = f * 0.006;
    lfo.connect(lg);
    for (const d of [-6, 5]) {
      const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = d + (Math.random() - 0.5) * M.insane * 50;
      lg.connect(os.frequency); os.connect(fl); os.start(t); os.stop(t + dur + 0.1);
    }
    lfo.start(t); lfo.stop(t + dur + 0.1);
    fl.connect(bp).connect(g).connect(o);
  },
  pluck(m, t, v = 0.5, dest = musicBus) {
    const o = out(dest, 0.35);
    const f = mtof(m);
    const os = ctx.createOscillator(); os.type = 'triangle'; os.frequency.value = f;
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 8, t); fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.25);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    os.connect(fl).connect(g).connect(o); os.start(t); os.stop(t + 0.55);
  },
  tick(t, v = 0.3, hi = 1, dest = musicBus) {
    const o = out(dest, 0.2);
    noise(t, 0.025, o, { type: 'bandpass', f: 4200 * hi, q: 6, gain: 0.5 * v, a: 0.001 });
    tone(t, 2600 * hi, 0.03, o, { gain: 0.05 * v, type: 'square' });
  },
  glass(m, t, v = 0.4, dur = 3) {
    const o = out(musicBus, 0.6);
    const f = mtof(m);
    tone(t, f, dur, o, { gain: 0.08 * v, a: 0.002 });
    tone(t, f * 2.76, dur * 0.5, o, { gain: 0.04 * v, a: 0.002 });
    tone(t, f * 5.4, dur * 0.25, o, { gain: 0.02 * v, a: 0.002 });
  },
  choir(m, t, dur = 4, v = 0.4, vowel = 0) {
    const o = out(musicBus, 0.8);
    const f = mtof(m);
    const F = [[700, 1220], [450, 800], [325, 700], [400, 1700]][vowel % 4];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur);
    const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = F[0]; b1.Q.value = 6;
    const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = F[1]; b2.Q.value = 8;
    const mix = ctx.createGain();
    for (const d of [-12, 0, 9]) {
      const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = d;
      os.connect(b1); os.connect(b2); os.start(t); os.stop(t + dur + 0.1);
    }
    b1.connect(mix); b2.connect(mix); mix.gain.value = 2.2;
    mix.connect(g).connect(o);
  },
  drum(t, v = 0.6, f0 = 95) {
    const o = out(musicBus, 0.3);
    tone(t, f0, 0.5, o, { gain: 0.5 * v, a: 0.003, f2: 38 });
    noise(t, 0.12, o, { type: 'lowpass', f: 400, gain: 0.25 * v });
  },
  knock(t, v = 0.5, p = 1, dest = musicBus) {
    const o = out(dest, 0.35);
    noise(t, 0.07, o, { type: 'bandpass', f: 720 * p, q: 9, gain: 0.9 * v, a: 0.001 });
    tone(t, 330 * p, 0.08, o, { gain: 0.12 * v, a: 0.001, f2: 220 * p });
  },
  breath(t, dur = 2.4, v = 0.3, dest = musicBus) {
    if (!ctx) return;
    const o = out(dest, 0.5);
    const n = noise(t, dur, o, { type: 'bandpass', f: 700, q: 0.8, gain: 0.0001, a: 0.01, r: dur });
    n.g.gain.cancelScheduledValues(t);
    n.g.gain.setValueAtTime(0.0001, t);
    n.g.gain.linearRampToValueAtTime(0.12 * v, t + dur * 0.45);
    n.g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.fl.frequency.setValueAtTime(500, t); n.fl.frequency.linearRampToValueAtTime(1100, t + dur * 0.45); n.fl.frequency.linearRampToValueAtTime(400, t + dur);
  },
  bass(m, t, dur = 3, v = 0.6, dest = musicBus) {
    const o = out(dest, 0.3);
    tone(t, mtof(m), dur, o, { gain: 0.35 * v, a: 0.02 });
    const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = mtof(m);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(60, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.18 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    os.connect(fl).connect(g).connect(o); os.start(t); os.stop(t + dur + 0.1);
  },
  pad(m, t, dur, v = 0.3, bright = 600) {
    const o = out(musicBus, 0.7);
    const f = mtof(m);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = bright;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + dur * 0.35); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const d of [-8, 0, 7]) {
      const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = d;
      os.connect(fl); os.start(t); os.stop(t + dur + 0.1);
    }
    fl.connect(g).connect(o);
  },
  metal(m, t, v = 0.4) {
    const o = out(musicBus, 0.6);
    const f = mtof(m);
    for (const k of [1, 2.41, 3.77, 5.93]) tone(t, f * k, 1.8 / k + 0.4, o, { gain: 0.05 * v / Math.sqrt(k), a: 0.001 });
  },
};
A.I = I;

// ---------------------------------------------------------------- the score
// "THE HOUSE ALWAYS WINS": a waltz in D minor, eight bars.
const THEME = [[74, 2], [73, 1], [74, 1], [69, 1], [65, 1], [70, 2], [69, 1], [65, 3], [67, 1], [65, 1], [64, 1], [65, 2], [62, 1], [64, 1], [61, 1], [57, 1], [62, 3]];
const THEME_BASS = [38, 38, 43, 38, 36, 34, 33, 38];
const CHORDS = [[50, 57, 65], [50, 57, 65], [43, 58, 62], [50, 57, 65], [48, 55, 64], [46, 53, 62], [45, 52, 61], [50, 57, 62]];
const toMajor = m => { const pc = ((m % 12) + 12) % 12; return pc === 5 || pc === 0 ? m + 1 : pc === 10 ? m - 1 : m; };
const MOTIF = [52, 51, 49, 46];

function themeBar(bar, t, beat, inst = 'piano', v = 0.6, major = false) {
  // walk the melody in 3-beat bars
  let acc = 0;
  const startBeat = (bar % 8) * 3;
  for (const [m, d] of THEME) {
    if (acc >= startBeat && acc < startBeat + 3) {
      const note = major ? toMajor(m) : m;
      const wrong = Math.random() < M.insane * 0.12 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      const tt = t + (acc - startBeat) * beat, len = d * beat * 1.4;
      if (inst === 'cello') I.cello(note + wrong, tt, len, v);
      else I.piano(note + wrong, tt, v, len);
    }
    acc += d;
  }
}

const SONGS = {
  title: { bpm: 66, beats: 3, bar(n, t, b) {
    if (n === 0) { I.piano(69, t, 0.6, 4); I.piano(65, t + b * 2, 0.55, 4); I.piano(74, t + b * 4, 0.6, 5); return; }
    if (n === 1) return;
    if (n >= 2) I.cello(THEME_BASS[n % 8], t, b * 3, 0.45);
    if (n >= 4) themeBar(n - 4, t, b, 'piano', 0.42);
    if (n >= 3) for (let i = 0; i < 3; i++) I.tick(t + i * b, 0.12);
    if (n >= 6 && n % 2 === 0) I.choir(50, t, b * 6, 0.35, 1);
  } },
  act1: { bpm: 72, beats: 3, bar(n, t, b) {
    const ch = CHORDS[n % 8];
    I.piano(ch[0] - 12, t, 0.32, b * 3);
    I.piano(ch[1], t + b, 0.2, b * 2);
    I.piano(ch[2], t + b * 2, 0.2, b * 2);
    I.pluck(ch[0], t, 0.35);
    for (let i = 0; i < 3; i++) if (Math.random() < 0.6) I.tick(t + i * b + b * 0.5, 0.08, 1.2);
    if (n % 16 >= 8 && M.layers > 0) themeBar(n, t, b, 'piano', 0.3 + M.intensity * 0.2);
    if (M.intensity > 0.4) I.cello(THEME_BASS[n % 8], t, b * 3, 0.25 + M.intensity * 0.3);
    if (n % 8 === 7) I.breath(t, b * 3, 0.15);
  } },
  act2: { bpm: 84, beats: 4, bar(n, t, b) {
    const sp = 1 / (1 + M.intensity * 0.5);
    I.drum(t, 0.55); I.drum(t + b * 0.5 * sp, 0.35);
    I.drum(t + b * 2, 0.5);
    for (let i = 0; i < 4; i++) I.knock(t + i * b + b * 0.75, 0.25, i % 2 ? 1 : 1.3);
    if (M.intensity > 0.35) for (let i = 0; i < 8; i++) I.knock(t + i * b * 0.5 + b * 0.25, 0.12 + M.intensity * 0.15, 1.8);
    if (n % 2 === 0) { I.cello(38, t, b * 8, 0.45); I.cello(45, t, b * 8, 0.3); }
    if (n % 4 === 1) I.breath(t + b, b * 3, 0.35);
    if (n % 8 === 4) [62, 65, 64, 61].forEach((m, i) => I.pluck(m, t + b * i, 0.25));
  } },
  act3: { bpm: 58, beats: 4, bar(n, t, b) {
    const pads = [[50, 57, 64], [46, 53, 57], [43, 50, 58], [45, 52, 61]];
    const p = pads[Math.floor(n / 2) % 4];
    if (n % 2 === 0 && M.layers > 0) for (const m of p) I.pad(m, t, b * 8, 0.55, 500);
    if (n % 2 === 0 && M.layers > 1) I.choir(p[0] + 12, t + b, b * 7, 0.45, n % 4);
    if (M.layers > 2) for (let i = 0; i < 2; i++) if (Math.random() < 0.7) I.revPiano(p[Math.floor(Math.random() * 3)] + 24, t + b * (i * 2 + Math.random()), b * 1.5, 0.5);
    if (M.layers > 3 && n % 4 === 3) I.glass(81, t + b * 2, 0.5, 4);
    I.bass(26, t, b * 4, 0.25);
  } },
  mirror: { bpm: 60, beats: 4, bar(n, t, b) {
    // the one human thing in the game: a plain lullaby in F
    const mel = [[69, 72, 77, 76], [74, 72, 69, 67], [65, 69, 72, 74], [72, 0, 0, 0], [69, 72, 77, 79], [77, 76, 74, 72], [70, 69, 67, 65], [65, 0, 0, 0]];
    const bass = [53, 50, 46, 48, 53, 50, 46, 41];
    const bar = mel[n % 8];
    I.piano(bass[n % 8] - 12, t, 0.3, b * 4, musicBus);
    I.piano(bass[n % 8], t + b * 2, 0.18, b * 2);
    bar.forEach((m, i) => { if (m) I.piano(m, t + i * b, 0.42, b * 2.4); });
  } },
  act4: { bpm: 100, beats: 4, bar(n, t, b) {
    const ch = [[62, 69, 74], [58, 65, 70], [60, 67, 72], [57, 64, 69]][Math.floor(n / 2) % 4];
    if (n % 2 === 0) for (const m of ch) I.pad(m, t, b * 8, 0.35, 1400);
    for (let i = 0; i < 4; i++) I.glass(ch[i % 3] + 12, t + i * b + b * 0.5, 0.25, 2);
    const tk = 1 + Math.floor(M.tick * 3);
    for (let i = 0; i < 4 * tk; i++) I.tick(t + (i * b) / tk, 0.12 + M.tick * 0.35, 1.4);
    if (M.tick > 0.5) { I.drum(t, 0.3 + M.tick * 0.4, 70); I.drum(t + b * 2, 0.3 + M.tick * 0.4, 70); }
    if (M.tick > 0.75) for (let i = 0; i < 4; i++) I.knock(t + i * b + b * 0.5, 0.35, 0.8);
    I.bass(26, t, b * 4, 0.2);
  } },
  act5: { bpm: 80, beats: 3, bar(n, t, b) {
    if (M.hopeful) {
      const ch = CHORDS[n % 8].map(toMajor);
      I.piano(ch[0] - 12, t, 0.4, b * 3); I.piano(ch[1], t + b, 0.25, b * 2); I.piano(ch[2], t + b * 2, 0.25, b * 2);
      themeBar(n, t, b, 'piano', 0.55, true);
      I.cello(toMajor(THEME_BASS[n % 8]), t, b * 3, 0.45);
      if (n % 2 === 0) I.pad(toMajor(CHORDS[n % 8][1]) + 12, t, b * 6, 0.4, 1600);
      return;
    }
    themeBar(n, t, b, 'piano', 0.42);
    I.cello(THEME_BASS[n % 8], t, b * 3, 0.4);
    for (let i = 0; i < 3; i++) I.knock(t + i * b, 0.25 + M.intensity * 0.2, 1);
    if (n % 2 === 0) I.choir(THEME_BASS[n % 8] + 12, t, b * 6, 0.35, n % 4);
    const tk = 1 + Math.floor(M.intensity * 4);
    for (let i = 0; i < 3 * tk; i++) I.tick(t + (i * b) / tk, 0.12 + M.intensity * 0.25, 1.3);
    if (M.intensity > 0.6) I.drum(t, 0.5);
  } },
  hollow: { bpm: 52, beats: 3, bar(n, t, b) {
    if (n > 9) return;
    themeBar(n, t, b, 'cello', 0.5);
    I.piano(THEME_BASS[n % 8] - 12, t, 0.5, b * 3, musicBus, -40);
    I.bass(26, t, b * 3, 0.35);
  } },
  shattered: { bpm: 64, beats: 3, bar(n, t, b) {
    const ch = CHORDS[n % 8].map(toMajor);
    I.piano(ch[0] - 12, t, 0.32, b * 3); I.piano(ch[1], t + b, 0.2, b * 2); I.piano(ch[2], t + b * 2, 0.2, b * 2);
    if (n >= 2) themeBar(n, t, b, 'piano', 0.38, true);
    if (n >= 4 && n % 2 === 0) I.pad(ch[0] + 12, t, b * 6, 0.35, 1800);
    if (n >= 4) I.cello(toMajor(THEME_BASS[n % 8]), t, b * 3, 0.3);
    I.tick(t + b * 1.5, 0.04);
  } },
  consumed: { bpm: 40, beats: 4, bar(n, t, b) {
    I.bass(25, t, b * 4, 0.5); I.bass(26, t + b * 0.1, b * 4, 0.4);
    I.pad(49, t, b * 4, 0.4, 300); I.pad(50, t, b * 4, 0.4, 300);
    for (let i = 0; i < 6; i++) if (Math.random() < 0.5) I.metal(84 + Math.floor(Math.random() * 10), t + Math.random() * b * 4, 0.15);
  } },
  sacrificial: { bpm: 76, beats: 3, bar(n, t, b) {
    if (n < 8) {
      const v = 0.3 + n * 0.08;
      themeBar(n, t, b, 'cello', v);
      I.pad(CHORDS[n % 8][1], t, b * 3, 0.5 + n * 0.1, 900 + n * 200);
      I.drum(t, 0.3 + n * 0.06); I.choir(CHORDS[n % 8][0] + 12, t, b * 3, 0.3 + n * 0.05, n % 4);
      return;
    }
    if (n < 15) themeBar(n, t, b, 'piano', 0.4);
    if (n === 15) I.piano(61, t, 0.4, 8);
  } },
  void: { bpm: 50, beats: 4, bar(n, t, b) {
    I.bass(26, t, b * 4, 0.3);
    if (n % 2 === 0) I.pad(50, t, b * 8, 0.4, 350);
    if (Math.random() < 0.5) I.revPiano(74 + Math.floor(Math.random() * 7), t + Math.random() * b * 2, b * 1.4, 0.3);
  } },
};

export function music(mode, o = {}) {
  if (!ctx) return;
  if (M.mode === mode && !o.restart) return;
  M.mode = mode; M.bar = 0; M.next = now() + (o.delay ?? 0.15);
  if (o.hopeful !== undefined) M.hopeful = o.hopeful;
  unduck();
}
A.music = music;
function schedule() {
  if (!ctx || M.mode === 'off') return;
  const s = SONGS[M.mode];
  if (!s) return;
  const b = 60 / (s.bpm * (M.mode === 'act2' ? 1 + M.intensity * 0.45 : 1));
  while (M.next < now() + 0.3) {
    try { s.bar(M.bar, M.next, b); } catch (e) { console.warn(e); }
    M.next += b * s.beats;
    M.bar++;
  }
}
export function duck(sec = 0) {
  if (!ctx) return;
  M.ducked = true;
  musicBus.gain.cancelScheduledValues(now());
  musicBus.gain.setTargetAtTime(0, now(), 0.05);
  if (sec) setTimeout(unduck, sec * 1000);
}
export function unduck() {
  if (!ctx) return;
  M.ducked = false;
  musicBus.gain.cancelScheduledValues(now());
  musicBus.gain.setTargetAtTime(meta.settings.music * 0.75, now(), 0.4);
}
A.duck = duck; A.unduck = unduck;
A.stopMusic = () => { M.mode = 'off'; };

// The Dealer's four falling notes.
export function motif(inst = 'cello', v = 0.7) {
  if (!ctx) return;
  const t = now() + 0.05;
  MOTIF.forEach((m, i) => {
    const tt = t + i * 0.42;
    if (inst === 'cello') I.cello(m, tt, 0.55, v);
    else if (inst === 'piano') I.piano(m + 12, tt, v, 1.6);
    else if (inst === 'metal') I.metal(m + 24, tt, v);
    else I.choir(m + 12, tt, 0.9, v, i);
  });
}
A.motif = motif;

// ---------------------------------------------------------------- voices
// The Dealer's voice: a deep, vibrating hum shaped into syllables.
export function hum(text, { pitch = 1, voice = 'dealer' } = {}) {
  if (!ctx) return 1;
  const clean = text.replace(/[^a-zA-Z ]/g, '');
  const dur = Math.max(0.6, Math.min(6.5, clean.length * 0.052));
  const t = now() + 0.02;
  if (voice === 'candle') return whisper(t, dur), dur;
  const f = 46 * pitch * (1 - M.insane * 0.12);
  const o = out(sfxBus, 0.5);
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  const drive = 1.5 + M.insane * 6;
  for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * drive) / Math.tanh(drive); }
  shaper.curve = curve;
  const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.Q.value = 5;
  const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.Q.value = 7;
  const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 260;
  const env = ctx.createGain(); env.gain.value = 0;
  const trem = ctx.createGain(); trem.gain.value = 0.6;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 23; const lfoG = ctx.createGain(); lfoG.gain.value = 0.4;
  lfo.connect(lfoG).connect(trem.gain);
  const srcs = [];
  for (const [type, k, d] of [['sawtooth', 1, 0], ['sawtooth', 1.004, 7], ['sine', 0.5, 0], ['square', 2, -5]]) {
    const os = ctx.createOscillator(); os.type = type; os.frequency.value = f * k; os.detune.value = d;
    const g = ctx.createGain(); g.gain.value = type === 'square' ? 0.08 : type === 'sine' ? 0.9 : 0.5;
    os.connect(g); g.connect(b1); g.connect(b2); g.connect(low);
    srcs.push(os);
  }
  const mix = ctx.createGain(); mix.gain.value = 1;
  b1.connect(mix); b2.connect(mix); low.connect(mix);
  mix.connect(shaper).connect(trem).connect(env).connect(o);
  const VOW = [[700, 1100], [450, 800], [330, 700], [400, 1600], [600, 1000]];
  const syl = Math.max(2, Math.round(clean.length / 4.2));
  const sd = dur / syl;
  for (let i = 0; i < syl; i++) {
    const tt = t + i * sd;
    const v = VOW[Math.floor(Math.random() * VOW.length)];
    b1.frequency.setTargetAtTime(v[0] * 0.7, tt, 0.03);
    b2.frequency.setTargetAtTime(v[1] * 0.7, tt, 0.03);
    env.gain.setTargetAtTime(0.32 + Math.random() * 0.12, tt, 0.025);
    env.gain.setTargetAtTime(0.08, tt + sd * 0.7, 0.03);
    for (const s of srcs) s.detune.setTargetAtTime((Math.random() - 0.5) * 120, tt, 0.05);
  }
  env.gain.setTargetAtTime(0, t + dur, 0.06);
  for (const s of srcs) { s.start(t); s.stop(t + dur + 0.4); }
  lfo.start(t); lfo.stop(t + dur + 0.4);
  // a sub rumble you feel more than hear
  tone(t, f * 0.5, dur + 0.2, o, { gain: 0.18, a: 0.15 });
  return dur;
}
A.hum = hum;
function whisper(t, dur) {
  const o = out(sfxBus, 0.8);
  const syl = Math.max(2, Math.round(dur * 4));
  for (let i = 0; i < syl; i++) {
    const tt = t + (i * dur) / syl;
    noise(tt, dur / syl, o, { type: 'bandpass', f: 1200 + Math.random() * 1800, q: 4, gain: 0.12, a: 0.03 });
  }
}

// ---------------------------------------------------------------- sound effects
const FX = {
  card(v = 1) { const t = now(); noise(t, 0.06, out(sfxBus, 0.2), { type: 'highpass', f: 2500, gain: 0.35 * v, a: 0.001 }); },
  cardSlide() { const t = now(); noise(t, 0.25, out(sfxBus, 0.2), { type: 'bandpass', f: 1800, q: 0.7, gain: 0.12, a: 0.05, f2: 900 }); },
  tooth(n = 1) { const t = now(); for (let i = 0; i < n; i++) { const tt = t + i * 0.07 + Math.random() * 0.03; tone(tt, 1900 + Math.random() * 900, 0.05, out(sfxBus, 0.2), { gain: 0.15, type: 'triangle' }); noise(tt, 0.02, out(sfxBus, 0.1), { type: 'highpass', f: 5000, gain: 0.2 }); } },
  shackle() { const t = now(); const o = out(sfxBus, 0.6); for (let i = 0; i < 3; i++) { tone(t + i * 0.05, 820 + i * 140, 0.6, o, { gain: 0.12, type: 'triangle' }); tone(t + i * 0.05, 2240 + i * 300, 0.4, o, { gain: 0.05 }); } noise(t, 0.08, o, { type: 'bandpass', f: 3000, q: 2, gain: 0.5 }); tone(t + 0.25, 140, 0.4, o, { gain: 0.4, f2: 60 }); },
  chain(v = 0.5) { const t = now(); const o = out(sfxBus, 0.4); for (let i = 0; i < 5; i++) { const tt = t + i * 0.06 + Math.random() * 0.04; tone(tt, 1400 + Math.random() * 1600, 0.12, o, { gain: 0.06 * v, type: 'triangle' }); } },
  step(v = 0.4) { const t = now(); noise(t, 0.09, out(sfxBus, 0.35), { type: 'lowpass', f: 380 + Math.random() * 120, gain: 0.5 * v }); noise(t, 0.03, out(sfxBus, 0.2), { type: 'highpass', f: 3500, gain: 0.03 * v }); },
  drag() { const t = now(); noise(t, 0.9, out(sfxBus, 0.5), { type: 'lowpass', f: 600, gain: 0.25, a: 0.1, f2: 300 }); },
  grate() { const t = now(); const o = out(sfxBus, 0.5); noise(t, 0.8, o, { type: 'bandpass', f: 900, q: 3, gain: 0.35, a: 0.05, f2: 600 }); tone(t + 0.7, 150, 0.4, o, { gain: 0.4, f2: 70 }); tone(t + 0.7, 1300, 0.6, o, { gain: 0.06, type: 'triangle' }); },
  creak(v = 0.5) { const t = now(); const o = out(sfxBus, 0.6); const os = ctx.createOscillator(); os.type = 'sawtooth'; const f0 = 90 + Math.random() * 60; os.frequency.setValueAtTime(f0, t); os.frequency.linearRampToValueAtTime(f0 * 1.6, t + 0.7); const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 900; fl.Q.value = 9; const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12 * v, t + 0.15); g.gain.linearRampToValueAtTime(0, t + 0.8); const am = ctx.createOscillator(); am.frequency.value = 31; const ag = ctx.createGain(); ag.gain.value = 0.08 * v; am.connect(ag).connect(g.gain); os.connect(fl).connect(g).connect(o); os.start(t); am.start(t); os.stop(t + 0.85); am.stop(t + 0.85); },
  pry() { FX.creak(1); const t = now(); tone(t + 0.6, 220, 0.2, out(sfxBus, 0.4), { gain: 0.3, f2: 90 }); noise(t + 0.6, 0.12, out(sfxBus, 0.4), { type: 'bandpass', f: 1500, gain: 0.4 }); },
  paper() { const t = now(); for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.06, out(sfxBus, 0.2), { type: 'highpass', f: 3000 + Math.random() * 3000, gain: 0.08 }); },
  pick() { const t = now(); tone(t, 600, 0.12, out(sfxBus, 0.3), { gain: 0.12, f2: 900, type: 'triangle' }); noise(t, 0.05, out(sfxBus, 0.2), { type: 'bandpass', f: 2000, gain: 0.15 }); },
  unlock() { const t = now(); const o = out(sfxBus, 0.4); for (const [d, f] of [[0, 1800], [0.18, 1300], [0.32, 600]]) { noise(t + d, 0.04, o, { type: 'bandpass', f, q: 5, gain: 0.5 }); tone(t + d, f / 2, 0.08, o, { gain: 0.1 }); } },
  chest() { FX.creak(0.9); const t = now(); tone(t + 0.7, 110, 0.6, out(sfxBus, 0.5), { gain: 0.35, f2: 55 }); },
  spark() { const t = now(); const o = out(sfxBus, 0.3); for (let i = 0; i < 12; i++) noise(t + Math.random() * 0.4, 0.015, o, { type: 'highpass', f: 4000, gain: 0.35 }); tone(t, 120, 0.5, o, { gain: 0.05, type: 'square' }); },
  breaker() { const t = now(); noise(t, 0.05, out(sfxBus, 0.4), { type: 'bandpass', f: 1200, q: 3, gain: 0.7 }); tone(t, 90, 0.25, out(sfxBus, 0.4), { gain: 0.4 }); },
  hum60() { const t = now(); tone(t, 60, 2.5, out(sfxBus, 0.1), { gain: 0.05, type: 'sawtooth', a: 0.1 }); },
  shatter(v = 1) { const t = now(); const o = out(sfxBus, 0.6); noise(t, 0.35, o, { type: 'highpass', f: 2500, gain: 0.6 * v, a: 0.001 }); for (let i = 0; i < 14; i++) { const tt = t + Math.random() * 0.5; tone(tt, 2500 + Math.random() * 5000, 0.15 + Math.random() * 0.3, o, { gain: 0.05 * v }); } tone(t, 180, 0.2, o, { gain: 0.2 * v, f2: 80 }); },
  slam() { const t = now(); const o = out(sfxBus, 0.7); tone(t, 75, 1.2, o, { gain: 1.0, f2: 30, a: 0.002 }); noise(t, 0.4, o, { type: 'lowpass', f: 900, gain: 0.9, a: 0.001 }); for (let i = 0; i < 18; i++) { const tt = t + 0.04 + Math.random() * 0.5; tone(tt, 1200 + Math.random() * 3000, 0.08, o, { gain: 0.05, type: 'triangle' }); } },
  dice(n = 2) { const t = now(); const o = out(sfxBus, 0.35); for (let i = 0; i < 9 * n; i++) { const tt = t + i * 0.035 + Math.random() * 0.02; noise(tt, 0.02, o, { type: 'bandpass', f: 1400 + Math.random() * 1500, q: 4, gain: 0.35 * (1 - i / (9 * n)) + 0.05 }); } },
  checker() { const t = now(); noise(t, 0.04, out(sfxBus, 0.3), { type: 'bandpass', f: 1100, q: 4, gain: 0.5 }); tone(t, 420, 0.06, out(sfxBus, 0.2), { gain: 0.1 }); },
  wood() { I.knock(now(), 0.6, 1, sfxBus); },
  spin() { const t = now(); for (let i = 0; i < 16; i++) { const tt = t + i * (0.04 + i * 0.006); noise(tt, 0.015, out(sfxBus, 0.2), { type: 'bandpass', f: 3500, q: 8, gain: 0.35 }); } },
  cock() { const t = now(); const o = out(sfxBus, 0.3); noise(t, 0.03, o, { type: 'bandpass', f: 2500, q: 6, gain: 0.7 }); noise(t + 0.09, 0.04, o, { type: 'bandpass', f: 1600, q: 6, gain: 0.8 }); },
  click() { const t = now(); noise(t, 0.02, out(sfxBus, 0.5), { type: 'bandpass', f: 3000, q: 8, gain: 0.9 }); },
  darkshot() { const t = now(); const o = out(sfxBus, 0.9); noise(t, 1.6, o, { type: 'lowpass', f: 2200, gain: 1.0, a: 0.001, f2: 80 }); tone(t, 60, 2.2, o, { gain: 0.9, f2: 25 }); tone(t + 0.02, 3800, 3, out(sfxBus, 0), { gain: 0.02 }); },
  growl() { const t = now(); const o = out(sfxBus, 0.5); const n = noise(t, 1.1, o, { type: 'bandpass', f: 220, q: 3, gain: 0.5, a: 0.15 }); const am = ctx.createOscillator(); am.frequency.value = 28; const ag = ctx.createGain(); ag.gain.value = 0.3; am.connect(ag).connect(n.g.gain); am.start(t); am.stop(t + 1.2); tone(t, 55, 1.1, o, { gain: 0.3, a: 0.2, type: 'sawtooth' }); },
  crunch() { const t = now(); const o = out(sfxBus, 0.5); for (let i = 0; i < 10; i++) noise(t + i * 0.025 + Math.random() * 0.02, 0.05, o, { type: 'bandpass', f: 500 + Math.random() * 1500, q: 2, gain: 0.7 }); tone(t, 90, 0.4, o, { gain: 0.6, f2: 40 }); FX.growl(); },
  clink(w = 1) { const t = now(); const o = out(sfxBus, 0.4); const f = 900 / Math.sqrt(w); tone(t, f, 0.9, o, { gain: 0.15, type: 'triangle' }); tone(t, f * 2.7, 0.5, o, { gain: 0.05 }); },
  scaleSwing() { const t = now(); FX.chain(0.8); tone(t, 120, 0.8, out(sfxBus, 0.4), { gain: 0.2, f2: 80 }); },
  heartbeat(v = 0.6) { const t = now(); const o = out(sfxBus, 0.2); tone(t, 60, 0.18, o, { gain: 0.7 * v, f2: 40 }); tone(t + 0.22, 55, 0.2, o, { gain: 0.5 * v, f2: 38 }); },
  whispers(v = 0.5, dur = 3) { const t = now(); const o = out(sfxBus, 0.9); for (let i = 0; i < dur * 6; i++) { const tt = t + Math.random() * dur; noise(tt, 0.18, o, { type: 'bandpass', f: 1500 + Math.random() * 2500, q: 7, gain: 0.1 * v, a: 0.05 }); } },
  stinger() { const t = now(); const o = out(sfxBus, 0.6); for (const m of [37, 38, 44, 49, 50, 56]) { const os = ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(mtof(m + 12), t); os.frequency.exponentialRampToValueAtTime(mtof(m), t + 1.2); const g = ctx.createGain(); g.gain.setValueAtTime(0.13, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); os.connect(g).connect(o); os.start(t); os.stop(t + 1.9); } noise(t, 1.2, o, { type: 'highpass', f: 1500, gain: 0.55, a: 0.001 }); tone(t, 50, 1.5, o, { gain: 0.9, f2: 30 }); },
  snap() { const t = now(); const o = out(sfxBus, 0.6); tone(t, 4800, 0.4, o, { gain: 0.06, f2: 1800 }); noise(t, 0.05, o, { type: 'highpass', f: 6000, gain: 0.3 }); tone(t, 110, 0.4, o, { gain: 0.3, f2: 60 }); },
  susTick() { const t = now(); tone(t, 1650, 0.08, out(sfxBus, 0.3), { gain: 0.05 }); },
  exhale() { const t = now(); noise(t, 1.4, out(sfxBus, 0.7), { type: 'bandpass', f: 380, q: 1.2, gain: 0.25, a: 0.3, f2: 200 }); },
  lookBack() { const t = now(); tone(t, 140, 0.3, out(sfxBus, 0.5), { gain: 0.25, f2: 90 }); noise(t, 0.08, out(sfxBus, 0.4), { type: 'bandpass', f: 600, gain: 0.3 }); },
  warn() { const t = now(); FX.creak(0.35); tone(t, 230, 0.3, out(sfxBus, 0.3), { gain: 0.05 }); },
  blow(v = 0.5) { const t = now(); noise(t, 0.5, out(sfxBus, 0.2), { type: 'bandpass', f: 900, q: 0.6, gain: 0.25 * v, a: 0.05 }); },
  gutter() { const t = now(); noise(t, 0.6, out(sfxBus, 0.3), { type: 'lowpass', f: 1500, gain: 0.4, a: 0.01, f2: 200 }); },
  ignite() { const t = now(); const o = out(sfxBus, 0.3); noise(t, 0.08, o, { type: 'highpass', f: 2500, gain: 0.5 }); noise(t + 0.05, 0.8, o, { type: 'bandpass', f: 700, gain: 0.25, a: 0.05 }); },
  ice() { const t = now(); const o = out(sfxBus, 0.7); for (let i = 0; i < 6; i++) { const tt = t + i * 0.05 + Math.random() * 0.05; tone(tt, 3000 + Math.random() * 3000, 0.25, o, { gain: 0.04 }); noise(tt, 0.02, o, { type: 'highpass', f: 4000, gain: 0.3 }); } tone(t, 200, 0.6, o, { gain: 0.2, f2: 50 }); },
  melt() { const t = now(); noise(t, 1.5, out(sfxBus, 0.4), { type: 'bandpass', f: 2500, q: 1, gain: 0.08, a: 0.3 }); },
  fire(dur = 6) { const t = now(); const o = out(sfxBus, 0.4); noise(t, dur, o, { type: 'lowpass', f: 700, gain: 0.5, a: 0.8, brown: true }); for (let i = 0; i < dur * 12; i++) noise(t + Math.random() * dur, 0.02, o, { type: 'highpass', f: 2000, gain: 0.25 }); },
  whoosh() { const t = now(); noise(t, 0.6, out(sfxBus, 0.4), { type: 'bandpass', f: 400, q: 1, gain: 0.45, a: 0.15, f2: 1600 }); },
  implode() { const t = now(); const o = out(sfxBus, 0.9); noise(t, 1.8, o, { type: 'bandpass', f: 200, q: 0.8, gain: 0.8, a: 1.2, f2: 3000 }); tone(t, 40, 2.4, o, { gain: 0.6, a: 1.3, f2: 300 }); tone(t + 1.6, 1200, 3, o, { gain: 0.15 }); },
  chime() { const t = now(); I.glass(93, t, 0.9, 5); },
  chairScrape() { const t = now(); const o = out(sfxBus, 0.6); const n = noise(t, 1.1, o, { type: 'bandpass', f: 700, q: 5, gain: 0.4, a: 0.05 }); n.fl.frequency.linearRampToValueAtTime(1100, t + 0.5); n.fl.frequency.linearRampToValueAtTime(600, t + 1.1); const am = ctx.createOscillator(); am.frequency.value = 40; const ag = ctx.createGain(); ag.gain.value = 0.25; am.connect(ag).connect(n.g.gain); am.start(t); am.stop(t + 1.2); },
  rumble(d = 3, v = 0.6) { const t = now(); noise(t, d, out(sfxBus, 0.6), { type: 'lowpass', f: 140, gain: v, a: 0.4, brown: true }); },
  debris() { const t = now(); const o = out(sfxBus, 0.6); for (let i = 0; i < 8; i++) { const tt = t + Math.random() * 0.6; noise(tt, 0.08, o, { type: 'bandpass', f: 300 + Math.random() * 700, q: 2, gain: 0.5 }); } },
  birds() { const t = now(); const o = out(sfxBus, 0.3); for (let i = 0; i < 6; i++) { const tt = t + i * 0.9 + Math.random() * 0.5; const f = 2800 + Math.random() * 1200; for (let k = 0; k < 3; k++) tone(tt + k * 0.09, f, 0.07, o, { gain: 0.04, f2: f * 1.3 }); } },
  sink() { const t = now(); const o = out(sfxBus, 0.8); noise(t, 2.2, o, { type: 'lowpass', f: 1200, gain: 0.35, a: 0.4, f2: 120 }); tone(t, 90, 2.4, o, { gain: 0.35, f2: 35, a: 0.4 }); },
  rise() { const t = now(); const o = out(sfxBus, 0.8); noise(t, 2, o, { type: 'lowpass', f: 150, gain: 0.35, a: 0.6, f2: 1400 }); tone(t, 35, 2.2, o, { gain: 0.35, f2: 90, a: 0.6 }); },
  thunk() { const t = now(); tone(t, 130, 0.25, out(sfxBus, 0.4), { gain: 0.5, f2: 70 }); noise(t, 0.05, out(sfxBus, 0.3), { type: 'lowpass', f: 800, gain: 0.5 }); },
  ring() { const t = now(); tone(t, 3600, 4, out(sfxBus, 0), { gain: 0.04, a: 0.01 }); },
  ui() { const t = now(); tone(t, 520, 0.08, out(sfxBus, 0.2), { gain: 0.05, type: 'triangle' }); },
  page() { FX.paper(); },
  win() { const t = now(); [62, 66, 69, 74].forEach((m, i) => I.piano(m, t + i * 0.12, 0.45, 2.5, sfxBus)); },
  lose() { const t = now(); [62, 61, 58, 50].forEach((m, i) => I.cello(m, t + i * 0.35, 0.6, 0.6, sfxBus)); },
  bassHit() { I.bass(26, now(), 2.2, 0.8, sfxBus); },
  playful() { const t = now(); [62, 66, 69, 74, 78].forEach((m, i) => I.pluck(m, t + i * 0.07, 0.35, sfxBus)); },
  discovery() { const t = now(); [86, 90, 93].forEach((m, i) => I.glass(m, t + i * 0.13, 0.6, 2.5)); },
};

export function sfx(name, ...args) {
  if (!ctx || !FX[name]) return;
  try { FX[name](...args); } catch (e) { console.warn(e); }
}
A.sfx = sfx;

// ---------------------------------------------------------------- ambience
const AMB = { act: 0, on: false, beds: [], drip: 0, creak: 0, foot: 0, whisper: 0, extra: 0 };
export function ambient(act) {
  if (!ctx) return;
  for (const b of AMB.beds) { try { b.g.gain.setTargetAtTime(0, now(), 0.6); b.s.stop(now() + 2); } catch { /* done */ } }
  AMB.beds = [];
  AMB.act = act; AMB.on = act > 0;
  if (!AMB.on) return;
  const bed = (opts, gain) => {
    const s = ctx.createBufferSource(); s.buffer = opts.brown ? brownBuf : noiseBuf; s.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = opts.type || 'lowpass'; fl.frequency.value = opts.f; fl.Q.value = opts.q || 0.7;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(gain, now(), 1.2);
    s.connect(fl).connect(g).connect(ambBus); s.start();
    AMB.beds.push({ s, g, fl });
    return { s, g, fl };
  };
  bed({ brown: true, f: 140 }, 0.22);
  AMB.hiss = bed({ type: 'bandpass', f: 3200, q: 0.8 }, 0.012);
  if (act === 3) bed({ brown: true, f: 380, type: 'bandpass', q: 0.5 }, 0.18);
  if (act === 4) bed({ type: 'bandpass', f: 600, q: 2 }, 0.04);
  if (act === 5) bed({ brown: true, f: 90 }, 0.35);
}
A.ambient = ambient;
A.candleHiss = v => { if (AMB.hiss) AMB.hiss.g.gain.setTargetAtTime(0.008 + v * 0.03, now(), 0.1); };

function ambientTick() {
  if (!ctx || !AMB.on || A.paused) return;
  const t = now();
  const act = AMB.act;
  if (t > AMB.drip) {
    AMB.drip = t + 1.5 + Math.random() * (act === 3 ? 9 : 4);
    if (act !== 3) {
      const o = out(ambBus, 0.8);
      const f = 1400 + Math.random() * 1200;
      tone(t, f, 0.12, o, { gain: 0.06, f2: f * 0.45 });
      if (Math.random() < 0.5) tone(t + 0.13, f * 1.3, 0.08, o, { gain: 0.02, f2: f * 0.6 });
    }
  }
  if (t > AMB.creak) {
    AMB.creak = t + 6 + Math.random() * 14;
    if (act === 4) FX.ice(); else if (act === 5) { FX.rumble(2.5, 0.5); if (Math.random() < 0.6) FX.debris(); } else FX.creak(0.25 + Math.random() * 0.3);
  }
  if (t > AMB.foot) {
    AMB.foot = t + 25 + Math.random() * 40;
    if (act <= 2) { for (let i = 0; i < 4; i++) setTimeout(() => FX.step(0.12), i * 700); }
  }
  if (t > AMB.whisper) {
    AMB.whisper = t + 12 + Math.random() * 20;
    if (M.insane > 0.35 || act === 3) FX.whispers(0.25 + M.insane * 0.6, 2.5);
  }
}

export const aNow = () => (ctx ? ctx.currentTime : 0);
A.aNow = aNow;
