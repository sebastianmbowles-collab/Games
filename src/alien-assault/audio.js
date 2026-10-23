import { G } from './state.js';

let AC = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;

export function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.8;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(AC.destination);
    musicBus = AC.createGain(); sfxBus = AC.createGain();
    musicBus.connect(master); sfxBus.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
    nextT = AC.currentTime + 0.1;
  } catch (e) { AC = null; }
}
export function applyVolumes() {
  if (!AC) return;
  musicBus.gain.value = Math.pow(G.settings.music / 10, 1.5) * 0.5;
  sfxBus.gain.value = Math.pow(G.settings.sfx / 10, 1.5) * 0.9;
}

const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function osc(type, f, t, dur, vol, bus, o = {}) {
  const os = AC.createOscillator(), g = AC.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.slideT || dur));
  if (o.detune) os.detune.value = o.detune;
  const a = o.attack || 0.004;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let n = os;
  if (o.lp) {
    const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t);
    if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
    fl.Q.value = o.q || 1; n.connect(fl); n = fl;
  }
  n.connect(g); g.connect(bus || sfxBus);
  if (o.vib) {
    const l = AC.createOscillator(), lg = AC.createGain();
    l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 20;
    l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + dur + 0.05);
  }
  os.start(t); os.stop(t + dur + 0.05);
}
function nz(t, dur, vol, bus, o = {}) {
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = o.type || 'lowpass';
  f.frequency.setValueAtTime(o.f || 1000, t);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  f.Q.value = o.q || 1;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || sfxBus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
const last = {};
const ok = (name, gap) => { const t = AC.currentTime; if (last[name] && t - last[name] < gap) return false; last[name] = t; return true; };

const S = {
  shoot(t, od) {
    if (!ok('shoot', 0.04)) return;
    osc('sine', od ? 700 : 950, t, 0.18, 0.22, null, { to: od ? 120 : 220 });
    osc('square', 1900, t, 0.05, 0.05, null, { to: 500 });
    if (od) nz(t, 0.15, 0.15, null, { type: 'bandpass', f: 2500, to: 500 });
  },
  hit(t) { if (!ok('hit', 0.03)) return; osc('square', 340, t, 0.07, 0.1, null, { to: 110 }); nz(t, 0.06, 0.12, null, { type: 'highpass', f: 2500 }); },
  clink(t) { if (!ok('clink', 0.06)) return; osc('triangle', 2600, t, 0.12, 0.09); osc('triangle', 3700, t, 0.08, 0.05); },
  kill(t) { nz(t, 0.35, 0.35, null, { type: 'bandpass', f: 1400, to: 180, q: 4 }); osc('sawtooth', 320, t, 0.3, 0.12, null, { to: 50, lp: 1500 }); },
  bigkill(t) { nz(t, 0.9, 0.5, null, { f: 1200, to: 80 }); osc('sine', 90, t, 0.8, 0.5, null, { to: 30 }); },
  hurt(t) { nz(t, 0.35, 0.45, null, { f: 2500, to: 200 }); osc('sawtooth', 140, t, 0.3, 0.2, null, { to: 45 }); },
  crack(t) {
    for (let i = 0; i < 5; i++) osc('triangle', 2000 + Math.random() * 4000, t + i * 0.02, 0.06, 0.05);
    nz(t, 0.25, 0.2, null, { type: 'highpass', f: 5000 });
  },
  dash(t) { nz(t, 0.28, 0.35, null, { type: 'bandpass', f: 500, to: 3500, q: 1.5 }); },
  jump(t) { nz(t, 0.5, 0.3, null, { type: 'bandpass', f: 300, to: 1800 }); osc('sine', 110, t, 0.4, 0.2, null, { to: 330 }); },
  land(t) { osc('sine', 100, t, 0.2, 0.35, null, { to: 40 }); nz(t, 0.15, 0.2, null, { f: 500 }); },
  overdrive(t) {
    osc('sawtooth', 150, t, 0.9, 0.18, null, { to: 1400, lp: 3000 });
    [523, 659, 784, 1047].forEach((f, i) => osc('square', f, t + 0.1 + i * 0.07, 0.25, 0.08));
  },
  repair(t) { [660, 880, 1100, 1320, 1760].forEach((f, i) => osc('sine', f, t + i * 0.08, 0.2, 0.12)); },
  scan(t) { osc('sine', 1400, t, 0.7, 0.07, null, { vib: 12, vibAmt: 200 }); osc('square', 2200, t, 0.05, 0.05); osc('square', 2200, t + 0.12, 0.05, 0.05); },
  bolt(t) { if (!ok('bolt', 0.05)) return; osc('square', 800, t, 0.18, 0.06, null, { to: 250 }); },
  charge(t) { osc('sine', 300, t, 1.3, 0.08, null, { to: 1800, slideT: 1.2 }); },
  snipe(t) { nz(t, 0.3, 0.45, null, { type: 'highpass', f: 1500 }); osc('sawtooth', 1500, t, 0.25, 0.15, null, { to: 80 }); },
  slam(t) { osc('sine', 75, t, 0.7, 0.7, null, { to: 28 }); nz(t, 0.6, 0.5, null, { f: 600, to: 60 }); },
  step(t) { if (!ok('step', 0.12)) return; osc('sine', 60, t, 0.25, 0.35, null, { to: 30 }); },
  blade(t) { nz(t, 0.35, 0.35, null, { type: 'bandpass', f: 3500, to: 400, q: 2 }); osc('sawtooth', 600, t, 0.3, 0.08, null, { to: 150 }); },
  spin(t) { for (let i = 0; i < 4; i++) nz(t + i * 0.25, 0.22, 0.25, null, { type: 'bandpass', f: 800, to: 2500, q: 2 }); },
  beam(t, dur = 1.2) {
    osc('sawtooth', 110, t, dur, 0.18, null, { lp: 900, vib: 30, vibAmt: 15 });
    osc('square', 220, t, dur, 0.06, null, { lp: 1600 });
    nz(t, dur, 0.15, null, { type: 'bandpass', f: 1200 });
  },
  boom(t) { nz(t, 1.0, 0.6, null, { f: 1100, to: 60 }); osc('sine', 70, t, 0.9, 0.45, null, { to: 28 }); },
  roar(t) { osc('sawtooth', 120, t, 1.3, 0.25, null, { to: 60, lp: 700, vib: 9, vibAmt: 12 }); nz(t, 1.2, 0.3, null, { type: 'bandpass', f: 500, q: 2 }); },
  ui(t) { osc('square', 660, t, 0.05, 0.06); },
  select(t) { osc('square', 880, t, 0.07, 0.07); osc('square', 1320, t + 0.06, 0.1, 0.07); },
  blip(t) { if (!ok('blip', 0.05)) return; osc('square', 900 + Math.random() * 500, t, 0.03, 0.025); },
  thunder(t) { nz(t, 2.0, 0.5, null, { f: 500, to: 40, attack: 0.02 }); },
  portal(t) { osc('sine', 200, t, 1.0, 0.15, null, { to: 900, vib: 8, vibAmt: 60 }); },
  alarm(t) { for (let i = 0; i < 4; i++) osc('sawtooth', i % 2 ? 600 : 800, t + i * 0.25, 0.22, 0.08, null, { lp: 2000 }); },
  robot(t) { for (let i = 0; i < 6; i++) osc('square', 300 + Math.random() * 900, t + i * 0.06, 0.05, 0.04); },
  power(t) { osc('sawtooth', 100, t, 0.8, 0.2, null, { to: 900, lp: 2500 }); },
  whoosh(t) { nz(t, 1.5, 0.4, null, { type: 'bandpass', f: 200, to: 2000, q: 1.2, attack: 0.6 }); },
  scream(t) {
    nz(t, 0.9, 0.45, null, { type: 'bandpass', f: 2200, to: 700, q: 3 });
    osc('sawtooth', 900, t, 0.9, 0.18, null, { to: 300, vib: 30, vibAmt: 80, lp: 3000 });
    osc('square', 1300, t, 0.6, 0.06, null, { to: 500, vib: 22, vibAmt: 120 });
  },
  cloak(t) { osc('sine', 1200, t, 0.5, 0.06, null, { to: 200, vib: 20, vibAmt: 80 }); },
};
export const sfx = new Proxy({}, {
  get: (_, name) => (...a) => {
    if (!AC || !S[name]) return;
    try { S[name](AC.currentTime, ...a); } catch (e) { /* ignore audio hiccups */ }
  },
});

// ===== Music: a little step sequencer =====
const SONGS = {
  title: {
    bpm: 108, chords: [[38, [62, 65, 69]], [34, [58, 62, 65]], [41, [60, 65, 69]], [36, [60, 64, 67]]],
    kick: 'x.....x...x.....', snare: '........x.......', hat: '..x...x...x...x.',
    bass: [0, null, null, 0, null, null, 0, null, 0, null, null, 0, null, 12, null, null], lead: 'slow', robot: true,
  },
  battle: {
    bpm: 136, chords: [[38, [62, 65, 69]], [36, [60, 64, 67]], [34, [58, 62, 65]], [33, [57, 61, 64]]],
    kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    bass: [0, null, 0, 12, null, 0, null, 0, 0, null, 0, 12, null, 0, 7, null], lead: 'arp', fill: true,
  },
  boss: {
    bpm: 150, chords: [[38, [62, 65, 69]], [39, [63, 67, 70]], [38, [62, 65, 69]], [37, [61, 64, 67]]],
    kick: 'x..xx...x..xx...', snare: '....x..x....x...', hat: 'xxxxxxxxxxxxxxxx',
    bass: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 7, 0, 12, 0], lead: 'arp16', fill: true,
  },
  final: {
    bpm: 160, chords: [[36, [60, 63, 67]], [32, [56, 60, 63]], [39, [63, 67, 70]], [34, [58, 62, 65]]],
    kick: 'x.x.x..xx.x.x..x', snare: '....x.......x.x.', hat: 'x.xxx.xxx.xxx.xx',
    bass: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 10], lead: 'arp16', fill: true,
  },
  jungle: {
    bpm: 126, chords: [[40, [64, 67, 71]], [36, [60, 64, 67]], [38, [62, 65, 69]], [35, [59, 62, 66]]],
    kick: 'x..x..x...x..x..', snare: '....x.......x..x', hat: 'x.xxx.x.x.xxx.x.',
    bass: [0, null, 7, 0, null, 12, 0, null, 0, null, 7, 0, 10, null, 12, null], lead: 'arp', fill: true,
  },
  mutant: {
    bpm: 98, chords: [[37, [61, 64, 68]], [38, [62, 65, 68]], [37, [61, 64, 67]], [36, [60, 63, 66]]],
    kick: 'x.......x..x....', snare: '....x.......x...', hat: '....x.x.....x.x.',
    bass: [0, null, null, 1, null, null, 0, null, null, null, 6, null, 0, null, null, null], lead: 'slow',
  },
  patient: {
    bpm: 164, chords: [[37, [61, 64, 68]], [36, [60, 63, 67]], [33, [57, 61, 64]], [34, [58, 61, 65]]],
    kick: 'x.xxx.x.x.xxx.xx', snare: '....x..x....x.xx', hat: 'xxxxxxxxxxxxxxxx',
    bass: [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, 12, 0, 6, 0, 13, 12], lead: 'arp16', fill: true,
  },
  calm: {
    bpm: 84, chords: [[41, [65, 69, 72]], [38, [62, 65, 69]], [34, [58, 62, 65]], [36, [60, 64, 67]]],
    kick: 'x.......x.......', snare: '................', hat: '....x.......x...',
    bass: [0, null, null, null, null, null, null, null, 7, null, null, null, null, null, null, null], lead: 'slow',
  },
};
let song = null, step = 0, nextT = 0;
export function playMusic(name) {
  const s = SONGS[name] || null;
  if (s === song) return;
  song = s; step = 0;
  if (AC) nextT = AC.currentTime + 0.08;
}
setInterval(() => {
  if (!AC || !song) return;
  if (nextT < AC.currentTime) nextT = AC.currentTime + 0.02;
  while (nextT < AC.currentTime + 0.15) { sched(step, nextT); nextT += 15 / song.bpm; step++; }
}, 25);
function sched(st, t) {
  const s = song, i = st % 16, bar = Math.floor(st / 16) % 4, [root, ch] = s.chords[bar], sl = 15 / s.bpm, B = musicBus;
  if (s.kick[i] === 'x') { osc('sine', 160, t, 0.35, 0.9, B, { to: 40, slideT: 0.12 }); nz(t, 0.02, 0.3, B, { type: 'highpass', f: 3000 }); }
  if (s.snare[i] === 'x' || (s.fill && bar === 3 && i >= 12)) { nz(t, 0.2, 0.4, B, { type: 'highpass', f: 1200 }); osc('triangle', 200, t, 0.12, 0.25, B, { to: 120 }); }
  if (s.hat[i] === 'x') nz(t, 0.04, 0.1, B, { type: 'highpass', f: 8000 });
  const b = s.bass[i];
  if (b !== null && b !== undefined) {
    osc('sawtooth', mf(root + b), t, sl * 1.9, 0.2, B, { lp: 700, q: 5 });
    osc('square', mf(root + b - 12), t, sl * 1.9, 0.12, B, { lp: 400 });
  }
  if (i === 0) for (const n of ch) {
    osc('sawtooth', mf(n), t, sl * 16, 0.035, B, { attack: 0.4, lp: 1100, detune: -8 });
    osc('sawtooth', mf(n), t, sl * 16, 0.035, B, { attack: 0.4, lp: 1100, detune: 8 });
  }
  if (s.lead === 'arp' && i % 2 === 0) osc('square', mf(ch[(i / 2) % 3] + 12), t, sl * 1.5, 0.045, B, { lp: 3000 });
  if (s.lead === 'arp16') osc('square', mf(ch[i % 3] + (i % 6 < 3 ? 12 : 24)), t, sl * 0.9, 0.035, B, { lp: 3500 });
  if (s.lead === 'slow' && i % 4 === 0) osc('sawtooth', mf(ch[[0, 1, 2, 1][i / 4]] + 12), t, sl * 4, 0.05, B, { attack: 0.03, lp: 2200, vib: 5, vibAmt: 6 });
  if (s.robot && bar === 3 && i === 13) for (let k = 0; k < 5; k++) osc('square', 400 + Math.random() * 800, t + k * 0.05, 0.04, 0.03, B);
}
