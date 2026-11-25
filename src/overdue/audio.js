// Sound: the voice lines (with subtitles) and spooky sounds made with code.
import * as THREE from 'three';
import { C } from './core.js';
const _f = new THREE.Vector3();

const FILES = import.meta.glob('./voices/*.mp3', { eager: true, query: '?url', import: 'default' });

// Who says what (shown as subtitles with the speaker's name)
export const LINES = {
  pages_intro: ['MR. PAGES', 'Storytime... starts... NOW!'],
  pages_laugh1: ['MR. PAGES', 'Heh heh heh...'], pages_laugh2: ['MR. PAGES', 'Hm-hm-hm-hm...'], pages_laugh3: ['MR. PAGES', 'Ha... ha... ha...'],
  pages_spot: ['MR. PAGES', 'HA!'], pages_lost: ['MR. PAGES', 'Hmmmm...'], pages_check: ['MR. PAGES', 'Heh.'],
  pages_end: ['MR. PAGES', 'Welcome... to the shelf.'],
  kid_breathe: ['YOU', '(heavy breathing)'], kid_gasp: ['YOU', '(gasp!)'], kid_pant: ['YOU', '(panting)'],
  kid_fall: ['YOU', 'Oof!'], kid_struggle: ['YOU', '(struggling)'], kid_hands: ['YOU', '(scared breathing)'],
  worm_rush: ['THE BOOKWORM', 'Faster faster faster!'],
  worm_taunt1: ['THE BOOKWORM', "Don't stand still. Don't stand still!"], worm_taunt2: ['THE BOOKWORM', 'I can hear you in my hallway...'], worm_taunt3: ['THE BOOKWORM', 'The halls are mine. Mine, mine, mine!'],
  mg_worm1: ['THE BOOKWORM', 'I read a hundred books in one night.'], mg_worm2: ['THE BOOKWORM', "I couldn't stop. Faster. Faster! FASTER!"], mg_worm3: ['THE BOOKWORM', 'Now I... I only run the halls.'],
  bats_whisper: ['THE BOOK BATS', 'Light... light... we see your light.'],
  bats_chatter1: ['THE BOOK BATS', 'One more page... one more page...'], bats_chatter2: ['THE BOOK BATS', 'Turn it on... turn it on...'], bats_chatter3: ['THE BOOK BATS', 'So bright... so warm...'],
  mg_bats1: ['THE BOOK BATS', 'We snuck in with flashlights.'], mg_bats2: ['THE BOOK BATS', 'Just one more chapter...'], mg_bats3: ['THE BOOK BATS', 'Then the lights went out. Forever.'],
  marks_whisper: ['THE BOOKMARKS', 'Stay... stay with us.'],
  marks_moan1: ['THE BOOKMARKS', 'Ohhhh... where... was I...?'], marks_moan2: ['THE BOOKMARKS', "Don't leave us... unfinished..."], marks_moan3: ['THE BOOKMARKS', 'Ahhhh... the end... we never read the end...'],
  mg_marks1: ['THE BOOKMARKS', 'We saved our place.'], mg_marks2: ['THE BOOKMARKS', "We said we'd come back to finish."], mg_marks3: ['THE BOOKMARKS', 'We never came back... so we stayed.'],
  mg_alive: ['ALL OF THEM', 'Everything here was alive.'],
};

export const A = { ctx: null, master: null, buffers: {}, volume: 1, heart: 0, rustle: 0, subtitle: null };
let noiseBuf, amb;

export function initAudio() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  A.ctx = ctx;
  A.master = ctx.createGain(); A.master.gain.value = A.volume; A.master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  for (const [path, url] of Object.entries(FILES)) {
    const id = path.split('/').pop().replace('.mp3', '');
    fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { A.buffers[id] = buf; }).catch(() => {});
  }
  startAmbience();
}
export function setVolume(v) { A.volume = v; if (A.master) A.master.gain.setTargetAtTime(v, A.ctx.currentTime, 0.05); }

// a sound at a place in the world (pans left/right and gets quieter far away)
function spot(pos, vol = 1) {
  const ctx = A.ctx;
  const g = ctx.createGain(); g.gain.value = vol;
  if (!pos) { g.connect(A.master); return g; }
  const p = ctx.createPanner();
  p.panningModel = C.mobile ? 'equalpower' : 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1.5; p.rolloffFactor = 1.3; p.maxDistance = 60;
  if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  g.connect(p); p.connect(A.master); return g;
}
export function setListener(cam) {
  if (!A.ctx) return;
  const l = A.ctx.listener, p = cam.position;
  const f = cam.getWorldDirection(_f);
  if (l.positionX) { l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z; l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
  else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
}

// ---------------- voice lines ----------------
let subTimer = 0;
export function say(id, pos = null, vol = 1, { sub = true } = {}) {
  if (!A.ctx) return 0;
  const buf = A.buffers[id];
  if (sub && LINES[id]) showSub(LINES[id][0], LINES[id][1], buf ? buf.duration + 0.6 : 2.5);
  if (!buf) return 0;
  const s = A.ctx.createBufferSource(); s.buffer = buf;
  s.connect(spot(pos, vol)); s.start();
  return buf.duration;
}
function showSub(name, text, dur) {
  const el = document.getElementById('sub');
  if (!el) return;
  el.innerHTML = `<b>${name}:</b> ${text}`;
  el.classList.add('on');
  clearTimeout(subTimer);
  subTimer = setTimeout(() => el.classList.remove('on'), dur * 1000);
}

// ---------------- made-with-code sounds ----------------
function noiseSrc() { const s = A.ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = 0.8 + Math.random() * 0.4; return s; }
function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }

export function sfx(name, pos = null, vol = 1) {
  if (!A.ctx) return;
  const ctx = A.ctx, t = ctx.currentTime, out = spot(pos, vol);
  const filt = (type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const burst = (f, type, a, peak, dec, q = 1) => { const n = noiseSrc(), b = filt(type, f, q), g = ctx.createGain(); env(g, t, a, peak, dec); n.connect(b); b.connect(g); g.connect(out); n.start(t); n.stop(t + a + dec + 0.05); };
  const tone = (type, f0, f1, a, peak, dec) => { const o = osc(type, f0), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + a + dec); env(g, t, a, peak, dec); o.connect(g); g.connect(out); o.start(t); o.stop(t + a + dec + 0.05); };
  switch (name) {
    case 'step': burst(600 + Math.random() * 300, 'lowpass', 0.005, 0.25, 0.09); break;
    case 'stepWood': burst(1400, 'bandpass', 0.003, 0.35, 0.07, 2); tone('sine', 140, 90, 0.003, 0.15, 0.06); break;
    case 'run': burst(900, 'lowpass', 0.004, 0.5, 0.1); break;
    case 'stomp': tone('sine', 70, 38, 0.005, 1.0, 0.35); burst(300, 'lowpass', 0.005, 0.7, 0.2); burst(2500, 'bandpass', 0.002, 0.25, 0.08, 1.5); break;
    case 'click': burst(3000, 'highpass', 0.001, 0.4, 0.02); tone('square', 1800, 1500, 0.001, 0.08, 0.015); break;
    case 'creak': { const o = osc('sawtooth', 120 + Math.random() * 80), b = filt('bandpass', 900, 8), g = ctx.createGain(); o.frequency.linearRampToValueAtTime(70 + Math.random() * 60, t + 1.2); env(g, t, 0.2, 0.12, 1.1); o.connect(b); b.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5); break; }
    case 'flip': for (let i = 0; i < 4; i++) { const n = noiseSrc(), b = filt('bandpass', 3000 + Math.random() * 2000, 0.8), g = ctx.createGain(); const tt = t + i * 0.05; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.3, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06); n.connect(b); b.connect(g); g.connect(out); n.start(tt); n.stop(tt + 0.1); } break;
    case 'heart': tone('sine', 62, 45, 0.01, 0.9, 0.16); setTimeout(() => sfx('heart2', null, vol), 180); break;
    case 'heart2': tone('sine', 55, 40, 0.01, 0.6, 0.18); break;
    case 'flap': for (let i = 0; i < 6; i++) { const n = noiseSrc(), b = filt('bandpass', 1500 + Math.random() * 1500, 1.5), g = ctx.createGain(); const tt = t + i * 0.045 + Math.random() * 0.02; g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.25, tt + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04); n.connect(b); b.connect(g); g.connect(out); n.start(tt); n.stop(tt + 0.06); } break;
    case 'slither': burst(2200, 'bandpass', 0.15, 0.18, 0.5, 2); break;
    case 'chime': for (const [f, k] of [[392, 1], [784, 0.5], [1176, 0.25], [523, 0.6]]) tone('sine', f, f * 0.995, 0.01, 0.25 * k, 3.5); break;
    case 'screech': {
      const g = ctx.createGain(); env(g, t, 0.01, 1.6, 1.3);
      const sh = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 6); } sh.curve = curve;
      for (const f of [880, 1240, 1660, 2310]) { const o = osc('sawtooth', f); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 1.3); o.connect(sh); o.start(t); o.stop(t + 1.4); }
      const n = noiseSrc(); const b = filt('highpass', 1200); n.connect(b); b.connect(sh); n.start(t); n.stop(t + 1.4);
      sh.connect(g); g.connect(out);
      tone('sine', 90, 30, 0.01, 1.2, 0.9);
      break;
    }
    case 'tear': burst(1800, 'bandpass', 0.02, 0.9, 0.6, 0.6); burst(500, 'lowpass', 0.01, 0.6, 0.3); break;
    case 'thud': tone('sine', 90, 40, 0.005, 1, 0.4); burst(400, 'lowpass', 0.005, 0.8, 0.25); break;
    case 'whoosh': { const n = noiseSrc(), b = filt('bandpass', 400, 1.2), g = ctx.createGain(); b.frequency.exponentialRampToValueAtTime(3000, t + 0.5); env(g, t, 0.15, 1.0, 0.6); n.connect(b); b.connect(g); g.connect(out); n.start(t); n.stop(t + 0.9); break; }
    case 'beep': tone('square', 660, 660, 0.005, 0.15, 0.12); break;
    case 'buzz': tone('square', 110, 100, 0.005, 0.25, 0.35); break;
    case 'blip': tone('square', 880, 1320, 0.002, 0.12, 0.06); break;
    case 'lose': tone('square', 330, 80, 0.01, 0.2, 0.7); break;
    case 'rattle': for (let i = 0; i < 5; i++) setTimeout(() => sfx('stepWood', pos, vol * 1.5), i * 70); break;
    case 'static': burst(4000, 'highpass', 0.01, 0.35, 0.6); break;
    case 'speaker': burst(2000, 'bandpass', 0.01, 0.3, 0.25, 0.5); tone('sine', 1000, 1000, 0.01, 0.05, 0.2); break;
  }
}

// low drone + tape hiss that plays all night; heartbeat + page rustle get stronger near villains
function startAmbience() {
  const ctx = A.ctx;
  const g = ctx.createGain(); g.gain.value = 0.0; g.connect(A.master);
  for (const f of [43, 43.6, 64.5]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = 0.12; o.connect(og); og.connect(g); o.start(); }
  const n = noiseSrc(); const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = 5000; b.Q.value = 0.3;
  const ng = ctx.createGain(); ng.gain.value = 0.025; n.connect(b); b.connect(ng); ng.connect(g); n.start();
  amb = g;
}
export function ambience(on) { if (amb) amb.gain.setTargetAtTime(on ? 0.6 : 0, A.ctx.currentTime, 0.8); }

let hbT = 0, rsT = 0, crT = 4;
export function updateAudio(dt, fear, rustle) {
  if (!A.ctx) return;
  // heartbeat: faster and louder when scared
  if (fear > 0.08) { hbT -= dt; if (hbT <= 0) { sfx('heart', null, 0.25 + fear * 0.9); hbT = 1.1 - fear * 0.65; } }
  // flipping pages when a villain is close
  if (rustle > 0.1) { rsT -= dt; if (rsT <= 0) { sfx('flip', null, rustle * 0.8); rsT = 0.6 - rustle * 0.4 + Math.random() * 0.4; } }
  crT -= dt; if (crT <= 0) { sfx('creak', { x: Math.random() * 48, y: 2, z: Math.random() * 36 }, 0.6); crT = 6 + Math.random() * 10; }
}
