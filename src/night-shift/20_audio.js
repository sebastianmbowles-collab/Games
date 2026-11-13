// ---------- audio: everything is synthesised, no sound files ----------
const A = { ctx: null, amb: {} };
function audioInit() {
  if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  let c; try { c = A.ctx = new AC(); } catch (e) { return; }
  A.master = c.createGain(); A.master.gain.value = P.vol;
  A.lp = c.createBiquadFilter(); A.lp.type = 'lowpass'; A.lp.frequency.value = 18000;
  A.comp = c.createDynamicsCompressor();
  A.lp.connect(A.comp); A.comp.connect(A.master); A.master.connect(c.destination);
  const len = c.sampleRate * 2, wb = c.createBuffer(1, len, c.sampleRate), bb = c.createBuffer(1, len, c.sampleRate);
  const wd = wb.getChannelData(0), bd = bb.getChannelData(0); let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; wd[i] = w; last = (last + 0.02 * w) / 1.02; bd[i] = last * 3.5; }
  A.white = wb; A.brown = bb;
  // ambient beds: each is a looping source into its own gain, all start silent
  const bed = (name, make) => { const g = c.createGain(); g.gain.value = 0; make(g); g.connect(A.lp); A.amb[name] = g; };
  bed('hum', g => { [50, 100, 150].forEach((f, i) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f + i * 0.3; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 190; const gg = c.createGain(); gg.gain.value = [1, 0.5, 0.25][i]; o.connect(fl); fl.connect(gg); gg.connect(g); o.start(); }); });
  bed('buzz', g => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 100; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 3400; fl.Q.value = 3; o.connect(fl); fl.connect(g); o.start(); });
  bed('wind', g => { const s = c.createBufferSource(); s.buffer = bb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 420; fl.Q.value = 0.6; const l = c.createOscillator(); l.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 260; l.connect(lg); lg.connect(fl.frequency); s.connect(fl); fl.connect(g); s.start(); l.start(); });
  bed('drone', g => { [41.2, 41.9, 61.7].forEach(f => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); }); });
  bed('static', g => { const s = c.createBufferSource(); s.buffer = wb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 2500; s.connect(fl); fl.connect(g); s.start(); });
}
function amb(levels, sec) { if (!A.ctx) return; const t = A.ctx.currentTime; for (const k in levels) if (A.amb[k]) { A.amb[k].gain.cancelScheduledValues(t); A.amb[k].gain.setTargetAtTime(levels[k], t, (sec || 1.5) / 3); } }
function ambOff() { amb({ hum: 0, buzz: 0, wind: 0, drone: 0, static: 0 }, 0.6); }
function setVol(v) { P.vol = v; if (A.master) A.master.gain.value = v; save(); }
function muffle(on) { if (A.ctx) A.lp.frequency.setTargetAtTime(on ? 420 : 18000, A.ctx.currentTime, 0.08); }

function out(pan) { if (!pan || !A.ctx.createStereoPanner) return A.lp; const p = A.ctx.createStereoPanner(); p.pan.value = pan; p.connect(A.lp); return p; }
function tone(type, f, t0, dur, vol, f2, pan) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime + (t0 || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out(pan)); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t0, dur, vol, ftype, freq, q, f2, pan, brown) {
  if (!A.ctx) return; const c = A.ctx, t = c.currentTime + (t0 || 0), s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = brown ? A.brown : A.white; s.loop = true; fl.type = ftype || 'lowpass'; fl.frequency.setValueAtTime(freq || 1000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q || 0.7;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(out(pan)); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
const sfx = {
  bell() { tone('sine', 1318, 0, 0.9, 0.14); tone('sine', 2637, 0, 0.5, 0.03); tone('sine', 1046, 0.22, 1.1, 0.13); tone('sine', 2093, 0.22, 0.6, 0.03); },
  ring() { // old bell phone: two bursts of tremolo
    if (!A.ctx) return; const c = A.ctx;
    [0, 0.5].forEach(d => { const t = c.currentTime + d, g = c.createGain(), l = c.createOscillator(), lg = c.createGain(); g.gain.value = 0; l.type = 'square'; l.frequency.value = 23; lg.gain.value = 0.09; l.connect(lg); lg.connect(g.gain);
      [1240, 1580, 2480].forEach((f, i) => { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const og = c.createGain(); og.gain.value = [1, 0.8, 0.25][i]; o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.4); });
      const e = c.createGain(); e.gain.setValueAtTime(1, t); e.gain.setValueAtTime(1, t + 0.36); e.gain.linearRampToValueAtTime(0, t + 0.4); g.connect(e); e.connect(out(0.35)); l.start(t); l.stop(t + 0.4); });
  },
  knock(pan, n) { for (let i = 0; i < (n || 3); i++) { noise(i * 0.3, 0.09, 0.5, 'lowpass', 340, 1, 0, pan, true); tone('sine', 110, i * 0.3, 0.12, 0.35, 60, pan); } },
  beep() { tone('square', 1900, 0, 0.07, 0.05); },
  print() { for (let i = 0; i < 9; i++) noise(i * 0.07, 0.05, 0.06, 'bandpass', 2600, 4); },
  click() { noise(0, 0.03, 0.2, 'highpass', 1800, 1); tone('square', 180, 0, 0.03, 0.08); },
  tick(v) { noise(0, 0.018, v || 0.02, 'highpass', 5200, 2); },
  tock() { tone('sine', 620, 0, 0.05, 0.08); noise(0, 0.02, 0.05, 'highpass', 3000, 2); },
  sting() { tone('sine', 46, 0, 2.2, 0.6, 30); noise(0, 1.4, 0.3, 'lowpass', 2400, 0.8, 90, 0, true); tone('sine', 6100, 0.1, 3.5, 0.018); tone('sawtooth', 92, 0, 0.5, 0.12, 60); },
  scare() { noise(0, 0.5, 0.55, 'bandpass', 900, 0.6, 3200); tone('sawtooth', 220, 0, 0.6, 0.2, 55); tone('sawtooth', 233, 0, 0.6, 0.2, 58); },
  thud() { tone('sine', 70, 0, 0.35, 0.5, 38); noise(0, 0.12, 0.3, 'lowpass', 260, 1, 0, 0, true); },
  creak(pan) { for (let i = 0; i < 5; i++) tone('sawtooth', rnd(160, 320), i * 0.13, 0.16, 0.035, rnd(120, 260), pan); },
  breath(pan) { for (let i = 0; i < 3; i++) { noise(i * 2.2, 1.0, 0.05, 'bandpass', 700, 1.2, 1100, pan); noise(i * 2.2 + 1.1, 1.0, 0.04, 'bandpass', 1000, 1.2, 600, pan); } },
  heart() { tone('sine', 58, 0, 0.16, 0.5, 40); tone('sine', 52, 0.22, 0.2, 0.4, 36); },
  flick() { noise(0, 0.05, 0.08, 'bandpass', 4200, 5); tone('square', 100, 0, 0.06, 0.03); },
  whisper(pan, dur) { const n = Math.floor((dur || 1.2) / 0.16); for (let i = 0; i < n; i++) noise(i * 0.16, rnd(0.07, 0.14), 0.045, 'bandpass', rnd(1600, 3200), 5, 0, pan); },
  mumble(low) { tone('sawtooth', (low ? 95 : 150) * rnd(0.85, 1.2), 0, 0.06, 0.03, (low ? 80 : 130)); },
  hang() { tone('sine', 400, 0, 0.9, 0.03); tone('sine', 450, 0, 0.9, 0.03); },
  step(pan) { noise(0, 0.07, 0.08, 'lowpass', 500, 1, 0, pan, true); },
  truck() { noise(0, 7, 0.07, 'lowpass', 120, 0.7, 300, -0.6, true); noise(3, 6, 0.06, 'lowpass', 320, 0.7, 90, 0.6, true); },
  power() { tone('sawtooth', 100, 0, 1.6, 0.12, 22); noise(0, 0.2, 0.2, 'lowpass', 900, 1, 100); }
};
