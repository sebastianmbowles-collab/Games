// ================= SOUND: every sound is made live with Web Audio (no files) =================
const Snd = (() => {
  let ac = null, master, musicBus, sfxBus, noiseBuf, pulse25, pulse12;
  let muted = false;
  const engines = new Set();
  const S = {};

  S.init = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.25;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp);
    musicBus = ac.createGain(); musicBus.gain.value = 0.3; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    pulse25 = mkPulse(0.25); pulse12 = mkPulse(0.125);
    if (pendingSong) { const p = pendingSong; pendingSong = null; S.play(p); }
  };
  S.ready = () => !!ac;
  S.setMuted = function (m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.05); };
  S.isMuted = () => muted;

  function mkPulse(duty) {
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }
  const now = () => ac.currentTime;
  function bus(vol, pan) {
    const g = ac.createGain(); g.gain.value = vol;
    if (pan && ac.createStereoPanner) {
      const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); p.connect(sfxBus);
    } else g.connect(sfxBus);
    return g;
  }
  function setWave(o, type) {
    if (type === 'p25') o.setPeriodicWave(pulse25);
    else if (type === 'p12') o.setPeriodicWave(pulse12);
    else o.type = type;
  }
  function tone(type, f, t, dur, vol, f2, dest, attack) {
    const o = ac.createOscillator(); setWave(o, type);
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noise(t, dur, vol, ftype, f1, f2, q, dest, attack) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(f1, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    f.Q.value = q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  // ---------- one-shot sound effects ----------
  // A war explosion in 4 layers: thump, roar, crack, then falling debris and a long rumble.
  S.explosion = function (size = 1, vol = 1, pan = 0) {
    if (!ac || vol < 0.02) return;
    const t = now(), b = bus(vol, pan), far = vol < 0.4;
    tone('sine', 120, t, 0.7 * size, 0.95, 26, b);
    tone('triangle', 70, t, 0.5 * size, 0.5, 30, b);
    noise(t, 1.3 * size, 0.85, 'lowpass', far ? 900 : 3200, 110, 0.7, b);
    if (!far) noise(t, 0.12, 0.6, 'highpass', 1800, null, 0.6, b);
    const bits = Math.round(12 * size);
    for (let i = 0; i < bits; i++) {
      const tt = t + 0.18 + Math.random() * 1.1 * size;
      noise(tt, 0.02 + Math.random() * 0.05, 0.08 + Math.random() * 0.22, 'bandpass', 700 + Math.random() * 3500, null, 4, b);
    }
    noise(t + 0.25, 2.2 * size, 0.35, 'lowpass', 220, 50, 1, b, 0.35);
  };
  // The falling-bomb whistle (starts high, drops low).
  S.whistle = function (dur = 2, vol = 0.5, pan = 0) {
    if (!ac) return;
    const t = now(), b = bus(vol, pan);
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(2300, t); o.frequency.exponentialRampToValueAtTime(380, t + dur);
    const lfo = ac.createOscillator(); lfo.frequency.value = 6.5;
    const lg = ac.createGain(); lg.gain.value = 22; lfo.connect(lg); lg.connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + Math.min(0.4, dur * 0.3));
    g.gain.setValueAtTime(0.22, t + dur - 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(b); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  };
  // Egg hit: CRUNCH (shell) then SQUISH (yolk), then a little drip.
  S.splat = function (vol = 1, pan = 0) {
    if (!ac || vol < 0.02) return;
    const t = now(), b = bus(vol, pan);
    for (let i = 0; i < 5; i++) noise(t + i * 0.011 + Math.random() * 0.006, 0.022, 0.55, 'bandpass', 2400 + Math.random() * 3000, null, 2.5, b);
    tone('square', 1900, t, 0.03, 0.07, 600, b);
    noise(t + 0.055, 0.34, 0.6, 'lowpass', 1500, 170, 10, b, 0.02);
    tone('sine', 440, t + 0.055, 0.26, 0.28, 85, b);
    tone('sine', 880, t + 0.38, 0.06, 0.07, 1500, b);
  };
  S.crunch = function (vol = 0.8) {
    if (!ac) return; const t = now(), b = bus(vol, 0);
    for (let i = 0; i < 4; i++) noise(t + i * 0.02, 0.025, 0.5, 'bandpass', 3000 + Math.random() * 2000, null, 2.5, b);
  };
  S.cannon = function (vol = 1, pan = 0) {
    if (!ac || vol < 0.02) return;
    const t = now(), b = bus(vol, pan);
    noise(t, 0.09, 1, 'highpass', 900, null, 0.5, b);
    tone('sine', 150, t, 0.5, 0.9, 32, b);
    noise(t, 0.7, 0.6, 'lowpass', 1800, 90, 0.8, b);
    tone('square', 330, t, 0.35, 0.05, 300, b); tone('square', 497, t, 0.3, 0.04, 470, b);
  };
  S.clank = function (vol = 0.5, pan = 0) {
    if (!ac) return; const t = now(), b = bus(vol, pan);
    tone('square', 520 + Math.random() * 60, t, 0.07, 0.09, null, b);
    tone('square', 787 + Math.random() * 80, t, 0.05, 0.07, null, b);
    noise(t, 0.04, 0.2, 'highpass', 3000, null, 1, b);
  };
  S.metalHit = function (vol = 1) {
    if (!ac) return; const t = now(), b = bus(vol, 0);
    noise(t, 0.3, 0.9, 'bandpass', 1200, 400, 2, b);
    tone('square', 180, t, 0.4, 0.2, 60, b);
    tone('triangle', 1250, t, 0.6, 0.12, 1180, b); tone('triangle', 1870, t, 0.5, 0.08, 1800, b);
  };
  S.release = function () { // bomb latch letting go
    if (!ac) return; const t = now();
    noise(t, 0.03, 0.4, 'bandpass', 1500, null, 2); tone('square', 220, t, 0.09, 0.12, 70);
  };
  S.blip = function (f = 880, vol = 0.12) { if (!ac) return; tone('p25', f, now(), 0.07, vol); };
  S.select = function () { if (!ac) return; const t = now(); tone('p25', 660, t, 0.05, 0.1); tone('p25', 990, t + 0.05, 0.07, 0.1); };
  S.confirm = function () { if (!ac) return; const t = now(); [523, 659, 784, 1046].forEach((f, i) => tone('p25', f, t + i * 0.05, 0.09, 0.1)); };
  S.buzz = function () { if (!ac) return; const t = now(); tone('square', 110, t, 0.25, 0.14); tone('square', 117, t, 0.25, 0.12); };
  S.snap = function () { if (!ac) return; const t = now(); noise(t, 0.025, 0.5, 'bandpass', 3200, null, 3); tone('p25', 1150, t, 0.06, 0.12, 1700); };
  S.thud = function (vol = 0.7) { if (!ac) return; const t = now(), b = bus(vol, 0); tone('sine', 170, t, 0.18, 0.7, 55, b); noise(t, 0.12, 0.4, 'lowpass', 500, null, 1, b); };
  S.dig = function () { if (!ac) return; const t = now(); noise(t, 0.16, 0.5, 'bandpass', 900, 350, 1.5); noise(t + 0.18, 0.14, 0.4, 'bandpass', 800, 300, 1.5); };
  S.step = function (vol = 0.25) { if (!ac) return; const t = now(); noise(t, 0.06, vol, 'lowpass', 450 + Math.random() * 200, null, 1); };
  S.jump = function () { if (!ac) return; tone('p25', 280, now(), 0.12, 0.09, 560); };
  S.whoosh = function (vol = 0.4) { if (!ac) return; const t = now(); noise(t, 0.3, vol, 'bandpass', 500, 2400, 1.5, null, 0.06); };
  S.rattle = function () { if (!ac) return; const t = now(); for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.04, 0.2, 'bandpass', 1800 + Math.random() * 800, null, 4); };
  S.repair = function () { if (!ac) return; [0, 0.13, 0.26].forEach(d => setTimeout(() => S.clank(0.6), d * 1000)); };
  S.hammer = S.repair;
  S.radio = function () { if (!ac) return; const t = now(); noise(t, 0.25, 0.25, 'bandpass', 1800, 900, 3); tone('square', 1200, t, 0.04, 0.05); };
  S.talk = function (pitch = 400) { if (!ac) return; tone('p25', pitch * (0.85 + Math.random() * 0.35), now(), 0.05, 0.05); };
  S.yell = function () {
    if (!ac) return; const t = now(), b = bus(0.9, 0);
    for (let i = 0; i < 12; i++) {
      const tt = t + i * 0.07, f = 140 + Math.random() * 120;
      tone('sawtooth', f, tt, 0.07, 0.25, f * 0.8, b);
      noise(tt, 0.05, 0.08, 'bandpass', 900, null, 3, b);
    }
  };
  S.siren = function (dur = 4, vol = 0.18) {
    if (!ac) return; const t = now(), b = bus(vol, 0);
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    for (let i = 0; i <= dur; i += 1.5) { o.frequency.linearRampToValueAtTime(420, t + i); o.frequency.linearRampToValueAtTime(880, t + i + 0.75); }
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
    g.gain.setValueAtTime(0.5, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(b); o.start(t); o.stop(t + dur + 0.1);
  };
  S.beep = function (vol = 0.1) { if (!ac) return; tone('square', 1320, now(), 0.06, vol); };
  S.gloop = function () { if (!ac) return; const t = now(); noise(t, 0.4, 0.5, 'lowpass', 600, 150, 12, null, 0.03); tone('sine', 200, t, 0.35, 0.3, 90); };
  S.fanfare = function () { // short bugle call for promotions
    if (!ac) return; const t = now();
    [[392, 0, .14], [523, .15, .14], [659, .3, .14], [784, .45, .4], [659, .9, .14], [784, 1.05, .6]]
      .forEach(([f, d, l]) => tone('p25', f, t + d, l, 0.16, null, null, 0.02));
  };

  // ---------- engines (loop until stopped) ----------
  // Propeller plane: two buzzy saws + a low growl, chopped by a fast "propeller" wobble, with wind noise.
  S.planeEngine = function () {
    if (!ac) return null;
    const out = ac.createGain(); out.gain.value = 0;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { out.connect(pan); pan.connect(sfxBus); } else out.connect(sfxBus);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2;
    const am = ac.createGain(); am.gain.value = 0.6; lp.connect(am); am.connect(out);
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), o3 = ac.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'square';
    o1.frequency.value = 70; o2.frequency.value = 70.9; o3.frequency.value = 35;
    const g3 = ac.createGain(); g3.gain.value = 0.45;
    o1.connect(lp); o2.connect(lp); o3.connect(g3); g3.connect(lp);
    const lfo = ac.createOscillator(); lfo.frequency.value = 17;
    const lfoG = ac.createGain(); lfoG.gain.value = 0.35; lfo.connect(lfoG); lfoG.connect(am.gain);
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 520; nf.Q.value = 0.7;
    const ng = ac.createGain(); ng.gain.value = 0.28; n.connect(nf); nf.connect(ng); ng.connect(out);
    const srcs = [o1, o2, o3, lfo, n]; srcs.forEach(x => x.start());
    const e = {
      set(vol, throttle = 0.5, panv) {
        const t = now(), f = 55 + throttle * 45;
        out.gain.setTargetAtTime(vol * 0.32, t, 0.08);
        o1.frequency.setTargetAtTime(f, t, 0.2); o2.frequency.setTargetAtTime(f * 1.013, t, 0.2); o3.frequency.setTargetAtTime(f / 2, t, 0.2);
        lfo.frequency.setTargetAtTime(11 + throttle * 15, t, 0.2);
        lp.frequency.setTargetAtTime(450 + throttle * 1000, t, 0.2);
        if (pan && panv !== undefined) pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, panv)), t, 0.05);
      },
      stop() {
        engines.delete(e);
        out.gain.setTargetAtTime(0, now(), 0.08);
        setTimeout(() => { srcs.forEach(x => { try { x.stop(); } catch (_) { } }); out.disconnect(); }, 500);
      }
    };
    engines.add(e); return e;
  };
  // Tank: a chugging diesel (low square chopped by a piston beat), ground rumble, and tread clanks.
  S.tankEngine = function () {
    if (!ac) return null;
    const out = ac.createGain(); out.gain.value = 0; out.connect(sfxBus);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 4;
    const am = ac.createGain(); am.gain.value = 0.6; lp.connect(am); am.connect(out);
    const o1 = ac.createOscillator(); o1.type = 'square'; o1.frequency.value = 38;
    const o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 76.7;
    const g2 = ac.createGain(); g2.gain.value = 0.4; o1.connect(lp); o2.connect(g2); g2.connect(lp);
    const lfo = ac.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 6;
    const lg = ac.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(am.gain);
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 170;
    const ng = ac.createGain(); ng.gain.value = 0.7; n.connect(nf); nf.connect(ng); ng.connect(out);
    const srcs = [o1, o2, lfo, n]; srcs.forEach(x => x.start());
    let phase = 0, vol = 0;
    const e = {
      set(v, speed, broken) {
        vol = v; const t = now();
        out.gain.setTargetAtTime(v * (0.42 + speed * 0.2), t, 0.1);
        o1.frequency.setTargetAtTime(34 + speed * 24, t, 0.25); o2.frequency.setTargetAtTime((34 + speed * 24) * 2.02, t, 0.25);
        lfo.frequency.setTargetAtTime(5 + speed * 9 + (broken ? 2 : 0), t, 0.2);
        lp.frequency.setTargetAtTime(200 + speed * 420, t, 0.2);
      },
      tick(dt, speed, broken) { // tread clanks, faster when driving fast; broken treads clatter
        phase += dt * speed * (broken ? 5 : 9);
        while (phase > 1) { phase -= 1; S.clank(vol * (broken ? 0.4 : 0.14)); if (broken && Math.random() < 0.3) S.rattle(); }
      },
      stop() {
        engines.delete(e);
        out.gain.setTargetAtTime(0, now(), 0.08);
        setTimeout(() => { srcs.forEach(x => { try { x.stop(); } catch (_) { } }); out.disconnect(); }, 500);
      }
    };
    engines.add(e); return e;
  };
  S.stopEngines = function () { [...engines].forEach(e => e.stop()); };

  // ---------- music: a tiny 4-channel chip-tune player ----------
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11] };
  const tok = s => s.trim().split(/\s+/);
  const SONGS = {
    // Main theme: a slow, proud, sad march.
    title: { bpm: 92, root: 50, scale: 'minor', leadOct: 12, wave: 'p25', siren: true,
      prog: [0, 0, 0, 4, 5, 3, 4, 0],
      lead: ['0 - - . 0 . 2 . 4 - - - 4 . 3 .', '2 - - . 1 . 0 . 1 - - - - - . .', '0 - - . 0 . 2 . 4 - - - 7 - 6 .', '5 - - - 4 - - - 4 - - - - - . .',
        '7 - - . 7 . 6 . 5 - - - 4 . 3 .', '4 - - . 3 . 2 . 1 - - - - - . .', '2 - - . 3 . 4 . 2 - 1 - 0 - -1 .', '0 - - - - - - - . . . . . . . .'],
      bass: '0 . . . 0 . 0 . 4 . . . 4 . 0 .', drums: 'r.s.s.s.r.s.s.ss' },
    // Bombing: fast and intense.
    bombing: { bpm: 148, root: 52, scale: 'minor', leadOct: 12, wave: 'p25', harm: true,
      prog: [0, 0, 5, 4],
      lead: ['0 . 0 . 3 . 0 . 4 . 0 . 5 . 4 .', '3 . 3 . 2 . 3 . 0 - - . -1 - - .', '0 . 0 . 3 . 0 . 4 . 0 . 6 . 7 .', '5 - - . 4 - - . 3 . 2 . 1 . 2 .'],
      bass: '0 0 7 0 0 7 0 0 0 0 7 0 3 . 4 .', drums: 'k.h.s.h.k.k.s.hh' },
    // Running: frantic, with the air-raid siren howling underneath.
    running: { bpm: 166, root: 45, scale: 'harm', leadOct: 12, wave: 'p12', siren: true,
      prog: [0, 5, 3, 4],
      lead: ['4 . 4 . 4 . 3 . 4 . 7 . 4 . 3 .', '2 . 2 . 2 . 1 . 2 . 4 . 2 . 1 .', '0 . 1 . 2 . 3 . 4 . 5 . 6 . 7 .', '7 - 6 - 5 - 4 - 3 - 2 - 1 - -1 -'],
      bass: '0 . 0 . 0 . 0 . 0 . 0 . 4 . 4 .', drums: 'k.hhs.hhk.hhs.hs' },
    // Tanking: heavy and slow, low brass.
    tanking: { bpm: 104, root: 48, scale: 'minor', leadOct: 0, wave: 'p25', harm: true,
      prog: [0, 0, 5, 4],
      lead: ['0 - - - . . 0 . 2 - - - 3 - - .', '2 - - - . . 0 . -1 - - - - - . .', '0 - - - . . 0 . 4 - - - 5 - - .', '4 - - - 3 - - - 2 - - - - - . .'],
      bass: '0 . 0 0 . . 0 . 0 . 0 0 . . 4 .', drums: 'k..kk.s.k..kk.s.' },
    // Survival: sad trumpets over a muffled snare roll.
    survival: { bpm: 76, root: 43, scale: 'minor', leadOct: 12, wave: 'p25', vib: true,
      prog: [0, 3, 5, 4],
      lead: ['4 - - - - - 3 - 2 - - - 0 - - -', '1 - - - 2 - - - -1 - - - - - - -', '4 - - - - - 5 - 6 - - - 4 - - -', '3 - - - 2 - 1 - 0 - - - - - - -'],
      bass: '0 - - - - - - - 4 - - - - - - -', drums: 'r...s...r...s.s.' },
    // Building: marching drums, busy factory.
    building: { bpm: 122, root: 53, scale: 'major', leadOct: 12, wave: 'p25',
      prog: [0, 4, 4, 0],
      lead: ['0 . 2 . 4 . 4 . 4 . 2 . 4 - - .', '5 . 4 . 3 . 2 . 1 - - . . . . .', '1 . 3 . 5 . 5 . 5 . 3 . 5 - - .', '6 . 5 . 4 . 3 . 0 - - . . . . .'],
      bass: '0 . 4 . 0 . 4 . 0 . 4 . 0 . 4 .', drums: 'k.s.k.s.k.srk.s.' },
    // Story scenes: a slow lonely bugle.
    story: { bpm: 70, root: 50, scale: 'minor', leadOct: 12, wave: 'p25', vib: true,
      prog: [0, 5, 3, 4],
      lead: ['0 - - - 2 - - - 4 - - - 3 - 2 -', '1 - - - - - - - . . . . . . . .', '0 - - - 2 - - - 4 - - - 7 - 6 -', '5 - - - 4 - - - 4 - - - - - - -'],
      bass: '0 - - - - - - - 0 - - - - - - -', drums: '................' },
    victory: { bpm: 140, root: 55, scale: 'major', leadOct: 12, wave: 'p25', once: true, harm: true,
      prog: [0, 4, 0],
      lead: ['0 . 0 . 0 . 4 - - - 2 . 4 . 7 -', '- - - . 6 . 5 . 4 . 6 . 7 - - -', '- - - - - - - - . . . . . . . .'],
      bass: '0 . 0 . 4 . 4 . 0 . 0 . 4 . 4 .', drums: 'k.s.k.s.k.s.rrrr' },
    defeat: { bpm: 80, root: 45, scale: 'minor', leadOct: 12, wave: 'p25', once: true, vib: true,
      prog: [0, 4],
      lead: ['4 - - - 3 - - - 2 - - - 1 - - -', '0 - - - - - - - - - - - . . . .'],
      bass: '0 - - - - - - - 0 - - - - - - -', drums: 'r...............' },
  };
  for (const k in SONGS) {
    const s = SONGS[k];
    s.leadT = s.lead.map(tok); s.bassT = tok(s.bass); s.sc = SCALES[s.scale];
  }
  let song = null, cur = null, step = 0, nextT = 0, timer = null, sirenO = null, pendingSong = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function degToMidi(s, deg) {
    const oct = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return s.root + s.sc[i] + 12 * oct;
  }
  function holdLen(arr, i) { let n = 1; while (arr[i + n] === '-') n++; return n; }
  function note(type, f, t, dur, vol, vib) {
    const o = ac.createOscillator(); setWave(o, type); o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(vol * 0.7, t + 0.12);
    g.gain.setValueAtTime(vol * 0.7, t + Math.max(0.13, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vib && dur > 0.3) {
      const l = ac.createOscillator(); l.frequency.value = 5.5; const lg = ac.createGain(); lg.gain.value = f * 0.008;
      l.connect(lg); lg.connect(o.frequency); l.start(t + 0.15); l.stop(t + dur + 0.05);
    }
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(c, t) {
    if (c === 'k') { tone('sine', 150, t, 0.16, 0.9, 40, musicBus); }
    else if (c === 's') { noise(t, 0.13, 0.5, 'highpass', 1000, null, 0.7, musicBus); tone('triangle', 190, t, 0.07, 0.3, 140, musicBus); }
    else if (c === 'r') { for (let i = 0; i < 3; i++) noise(t + i * 0.035, 0.05, 0.25, 'highpass', 1400, null, 0.7, musicBus); }
    else if (c === 'h') { noise(t, 0.03, 0.18, 'highpass', 7000, null, 1, musicBus); }
  }
  function playStep(st, t, spb) {
    const bar = Math.floor(st / 16), s = st % 16;
    const L = song.leadT[bar % song.leadT.length];
    const lt = L[s];
    if (lt !== '.' && lt !== '-' && lt !== undefined) {
      const deg = parseInt(lt, 10), dur = holdLen(L, s) * spb;
      const m = degToMidi(song, deg) + song.leadOct;
      note(song.wave, mtof(m), t, dur * 0.95, 0.16, song.vib || dur > spb * 3);
      if (song.harm) note('p12', mtof(degToMidi(song, deg - 2) + song.leadOct), t, dur * 0.9, 0.06, false);
    }
    const chord = song.prog[bar % song.prog.length];
    const bt = song.bassT[s];
    if (bt !== '.' && bt !== '-' && bt !== undefined) {
      const deg = chord + parseInt(bt, 10), dur = holdLen(song.bassT, s) * spb;
      note('triangle', mtof(degToMidi(song, deg) - 12), t, dur * 0.9, 0.34, false);
    }
    drum(song.drums[s], t);
  }
  function sched() {
    if (!song) return;
    const spb = 60 / song.bpm / 4;
    while (nextT < now() + 0.12) {
      if (song.once && step >= song.leadT.length * 16) { S.stopMusic(); return; }
      playStep(step, nextT, spb); step++; nextT += spb;
    }
  }
  S.play = function (name) {
    if (!ac) { pendingSong = name; return; }
    if (cur === name) return;
    S.stopMusic(); cur = name; song = SONGS[name]; if (!song) return;
    step = 0; nextT = now() + 0.08; timer = setInterval(sched, 25);
    if (song.siren) {
      sirenO = ac.createOscillator(); sirenO.type = 'sine'; sirenO.frequency.value = 640;
      const l = ac.createOscillator(); l.frequency.value = 0.22; const lg = ac.createGain(); lg.gain.value = 240;
      l.connect(lg); lg.connect(sirenO.frequency);
      const g = ac.createGain(); g.gain.value = 0.05; sirenO.connect(g); g.connect(musicBus);
      sirenO.start(); l.start(); sirenO._l = l; sirenO._g = g;
    }
  };
  S.stopMusic = function () {
    if (timer) clearInterval(timer); timer = null; song = null; cur = null;
    if (sirenO) { try { sirenO.stop(); sirenO._l.stop(); sirenO._g.disconnect(); } catch (_) { } sirenO = null; }
  };
  S.current = () => cur;
  return S;
})();
