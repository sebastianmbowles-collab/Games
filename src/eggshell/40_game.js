// ================= INPUT: keyboard, touch buttons, mouse/finger on the screen =================
const In = { k: {}, p: {}, q: {}, ptr: { x: 0, y: 0, down: false, pressed: false, released: false }, touch: false };
In.down = k => !!In.k[k];
In.hit = k => (!!In.k[k] && !In.p[k]) || !!In.q[k];
In.ok = () => In.hit('a') || In.hit('start');
In.end = () => { In.p = Object.assign({}, In.k); In.q = {}; In.ptr.pressed = In.ptr.released = false; };
const KMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'a', KeyJ: 'a', KeyZ: 'a', Enter: 'start', ShiftLeft: 'b', ShiftRight: 'b', KeyK: 'b', KeyX: 'b', KeyE: 'c', KeyL: 'c', KeyC: 'c',
  KeyQ: 'd', KeyF: 'd', KeyV: 'd', Escape: 'pause', KeyP: 'pause', Digit1: 'n1', Digit2: 'n2', Digit3: 'n3', Digit4: 'n4', Digit5: 'n5', Digit6: 'n6', Digit7: 'n7', Tab: 'tab' };
addEventListener('keydown', e => { Snd.init(); Voice.unlock(); const k = KMAP[e.code]; if (k) { if (!In.k[k] && !e.repeat) In.q[k] = true; In.k[k] = true; e.preventDefault(); } });
addEventListener('keyup', e => { const k = KMAP[e.code]; if (k) { In.k[k] = false; e.preventDefault(); } });
addEventListener('blur', () => { In.k = {}; });
const touchEl = document.getElementById('touch');
function showTouch() { if (!In.touch) { In.touch = true; touchEl.classList.add('on'); } }
document.querySelectorAll('.tb').forEach(el => {
  const k = el.dataset.k;
  const on = e => { e.preventDefault(); Snd.init(); Voice.unlock(); showTouch(); In.q[k] = true; In.k[k] = true; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (_) { } };
  const off = e => { e.preventDefault(); In.k[k] = false; el.classList.remove('down'); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
});
function ptrPos(e) { const r = cv.getBoundingClientRect(); In.ptr.x = (e.clientX - r.left) / r.width * W; In.ptr.y = (e.clientY - r.top) / r.height * H; }
cv.addEventListener('pointerdown', e => { Snd.init(); Voice.unlock(); if (e.pointerType === 'touch') showTouch(); ptrPos(e); In.ptr.down = true; In.ptr.pressed = true; try { cv.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
cv.addEventListener('pointermove', e => { ptrPos(e); });
cv.addEventListener('pointerup', e => { ptrPos(e); In.ptr.down = false; In.ptr.released = true; });
cv.addEventListener('pointercancel', () => { In.ptr.down = false; In.ptr.released = true; });
In.setTouch = function (cfg) {
  document.getElementById('pad').classList.toggle('off', !cfg.pad);
  for (const b of ['a', 'b', 'c', 'd']) { const el = document.getElementById('bt_' + b); el.classList.toggle('off', !cfg[b]); el.textContent = cfg[b] || ''; }
  document.getElementById('bt_pause').classList.toggle('off', !cfg.pause);
};
const tapIn = (x, y, w, h) => In.ptr.pressed && In.ptr.x >= x && In.ptr.x < x + w && In.ptr.y >= y && In.ptr.y < y + h;

// ================= SAVE =================
const SAVE_KEY = 'eggshellBombing.v1';
let save = { chapter: 0, done: [false, false, false, false, false], rank: 0, sup: { bombs: 0, parts: 0, bags: 0, meds: 0 }, finished: false, muted: false, prologue: false, voices: true };
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (_) { } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) { } }
const RANKS = ['PRIVATE', 'CORPORAL', 'SERGEANT', 'LIEUTENANT', 'CAPTAIN', 'MAJOR', 'GENERAL'];
const AGES = ['2 DAYS OLD', '3 WEEKS OLD', '4 MONTHS OLD', '1 YEAR OLD', '3 YEARS OLD', '10 YEARS OLD'];

// ================= EFFECTS shared by every mode =================
const FX = { shakeT: 0, shakeM: 0, flashA: 0, flashC: '#fff', banners: [] };
FX.shake = (m, t = 0.4) => { FX.shakeM = Math.max(FX.shakeM, m); FX.shakeT = Math.max(FX.shakeT, t); };
FX.flash = (c = '#fff', a = 0.6) => { FX.flashC = c; FX.flashA = Math.max(FX.flashA, a); };
FX.banner = (text, col = '#ffd23a', t = 2.2) => { FX.banners = [{ text, col, t, life: t }]; };
FX.update = dt => { FX.shakeT = Math.max(0, FX.shakeT - dt); if (!FX.shakeT) FX.shakeM = 0; FX.flashA = Math.max(0, FX.flashA - dt * 2.5); FX.banners.forEach(b => b.t -= dt); FX.banners = FX.banners.filter(b => b.t > 0); };
FX.drawTop = () => {
  if (FX.flashA > 0) { ctx.globalAlpha = FX.flashA; rect(0, 0, W, H, FX.flashC); ctx.globalAlpha = 1; }
  for (const b of FX.banners) { const a = Math.min(1, b.t * 3, (b.life - b.t) * 6); ctx.globalAlpha = a; const w = b.text.length * 8 + 16; rect(W / 2 - w / 2, 40, w, 16, 'rgba(0,0,0,.7)'); txt(b.text, W / 2, 44, b.col, 'center'); ctx.globalAlpha = 1; }
};
class Parts {
  constructor() { this.a = []; }
  add(p) { p.t = 0; this.a.push(p); }
  burst(x, y, n, cols, spd = 60, life = 0.8, g = 0, s = 2) { for (let i = 0; i < n; i++) { const a = R() * 7, v = R() * spd; this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: pickR(cols), life: life * (0.5 + R() * 0.7), g, s, fade: true }); } }
  update(dt) { for (const p of this.a) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; } } this.a = this.a.filter(p => p.t < p.life); }
  draw(ox = 0, oy = 0) { for (const p of this.a) { const f = p.t / p.life; ctx.globalAlpha = p.fade ? 1 - f : 1; const s = p.grow ? p.s * (1 + f * p.grow) : p.s; rect(p.x - ox - s / 2, p.y - oy - s / 2, s, s, p.c); } ctx.globalAlpha = 1; }
}

// ================= VOICES =================
// Every line is spoken by the computer, and each egg gets its own voice (pitch, speed, and a
// different built-in voice when the device has several). If you record a line yourself and put
// it in a "voices" folder (voices/<id>.mp3), your recording plays instead.
const VOICE_STYLE = {
  narrator: { pitch: 0.55, rate: 0.82, slot: 0 },
  shelly: { pitch: 1.7, rate: 1.08, slot: 1 },   // gets deeper as Shelly grows up
  general: { pitch: 0.25, rate: 0.92, slot: 2, vol: 1 },
  scramble: { pitch: 0.45, rate: 0.95, slot: 3 },
  benny: { pitch: 1.25, rate: 1.25, slot: 4 },
  coddle: { pitch: 1.35, rate: 0.92, slot: 5 },
  poach: { pitch: 2, rate: 1.35, slot: 6 },
  rotten: { pitch: 0.05, rate: 0.72, slot: 7 },
};
const Voice = {
  cur: null, playing: false, enabled: null, missing: {}, tts: 'speechSynthesis' in window, on: true, voices: [],
  probe(id) { // find out once whether any recorded voice files exist
    const a = new Audio(); let i = 0; const exts = ['mp3', 'm4a', 'wav', 'ogg'];
    const next = () => { if (i >= exts.length) { Voice.enabled = false; return; } a.src = 'voices/' + id + '.' + exts[i++]; a.load(); };
    a.oncanplaythrough = () => { Voice.enabled = true; }; a.onerror = next;
    try { next(); } catch (_) { Voice.enabled = false; }
    if (this.tts) { this.loadVoices(); try { speechSynthesis.onvoiceschanged = () => this.loadVoices(); } catch (_) { } }
  },
  loadVoices() {
    try {
      const all = speechSynthesis.getVoices();
      let en = all.filter(v => /^en/i.test(v.lang));
      // prefer the nicer-sounding voices, and skip joke voices
      en = en.filter(v => !/bells|bubbles|bad news|good news|boing|cellos|jester|organ|trinoids|whisper|wobble|zarvox|superstar|deranged|hysterical|bahh|albert/i.test(v.name));
      this.voices = en.length ? en : all;
    } catch (_) { this.voices = []; }
  },
  unlock() { // phones and iPads only allow speech after a tap, so say nothing once on the first tap
    if (!this.tts || this.unlocked) return; this.unlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (_) { }
  },
  lineById(id) { for (const k in SCRIPT) { const v = SCRIPT[k]; const list = Array.isArray(v) ? v : [v]; for (const L of list) if (L.id === id) return L; } return null; },
  sayable(t) {
    return t.replace(/EGG WAR III/gi, 'egg war three').replace(/Egg War II\b/gi, 'egg war two').replace(/Egg War I\b/gi, 'egg war one')
      .replace(/-/g, ', ').replace(/\b[A-Z]{2,}\b/g, w => w.toLowerCase());
  },
  speak(L) {
    if (!this.tts || !this.on) return;
    try {
      speechSynthesis.cancel();
      const st = VOICE_STYLE[L.who] || VOICE_STYLE.narrator;
      const u = new SpeechSynthesisUtterance(this.sayable(L.text));
      let pitch = st.pitch, rate = st.rate;
      if (L.who === 'shelly') pitch = Math.max(0.6, 1.7 - Story.stage * 0.2);
      if (L.yell) { rate *= 1.15; }
      u.pitch = pitch; u.rate = rate; u.volume = st.vol || 0.95; u.lang = 'en-US';
      if (!this.voices.length) this.loadVoices();
      if (this.voices.length) u.voice = this.voices[st.slot % this.voices.length];
      u.onstart = () => { this.playing = true; };
      u.onend = u.onerror = () => { this.playing = false; };
      this.playing = true;
      speechSynthesis.speak(u);
    } catch (_) { this.playing = false; }
  },
  play(id) {
    this.stop();
    const L = this.lineById(id);
    if (!this.enabled || this.missing[id]) { if (L) this.speak(L); return; }
    const exts = ['mp3', 'm4a', 'wav', 'ogg']; let i = 0; const a = new Audio(); this.cur = a;
    const next = () => { if (i >= exts.length) { this.missing[id] = true; if (this.cur === a && L) this.speak(L); return; } a.src = 'voices/' + id + '.' + exts[i++]; a.play().then(() => { if (this.cur === a) this.playing = true; }).catch(() => { }); };
    a.onerror = () => { if (this.cur === a) next(); };
    a.onended = () => { if (this.cur === a) this.playing = false; };
    next();
  },
  stop() {
    if (this.cur) { this.cur.onerror = null; try { this.cur.pause(); } catch (_) { } this.cur = null; }
    if (this.tts) try { speechSynthesis.cancel(); } catch (_) { }
    this.playing = false;
  }
};

// ================= THE STORY SCRIPT =================
// Every line has an id. Record yourself saying it, save it as voices/<id>.mp3 and the game plays it.
const WHO = {
  narrator: { sprite: () => eggSprite('narrator'), name: 'NARRATOR', pitch: 300 },
  shelly: { sprite: () => eggSprite('shelly', Story.stage), name: 'SHELLY', pitch: 560 },
  general: { sprite: () => eggSprite('general'), name: 'GEN. YOLKINGTON', pitch: 150 },
  scramble: { sprite: () => eggSprite('scramble'), name: 'SGT. SCRAMBLE', pitch: 240 },
  benny: { sprite: () => eggSprite('benny'), name: 'CPL. BENNY', pitch: 400 },
  coddle: { sprite: () => eggSprite('coddle'), name: 'MEDIC CODDLE', pitch: 480 },
  poach: { sprite: () => eggSprite('poach'), name: 'PVT. POACH', pitch: 720 },
  rotten: { sprite: () => eggSprite('rotten'), name: 'THE ROTTEN EGG', pitch: 110 },
};
const SCRIPT = {
  prologue: [
    { id: 'p1', who: 'narrator', text: 'Egg War I... we lost. Egg War II... we lost again.' },
    { id: 'p2', who: 'narrator', text: 'Last night, the Rotten Egg stole the GOLDEN EGG, the heart of our homeland.' },
    { id: 'p3', who: 'narrator', text: 'Without it, our nest will go cold forever. This is EGG WAR III.' },
  ],
  c1: [
    { id: 'c1_1', who: 'shelly', text: 'My first day in the army! I just got my helmet. It\'s a little big.' },
    { id: 'c1_2', who: 'scramble', text: 'Kid, you hear that buzzing? Don\'t look up. Just listen.' },
    { id: 'c1_3', who: 'general', radio: true, sfx: 'siren', text: 'AIR RAID! Rotten bomber over Eggsburg! Every egg to the bunker, NOW!' },
    { id: 'c1_4', who: 'scramble', text: 'Watch for the red marks on the ground. That\'s where the bombs land. RUN, Private!' },
    { id: 'c1_5', who: 'shelly', text: 'Jump, dive, roll, hide... I can do this. I can do this!' },
  ],
  c1w: [
    { id: 'c1_w1', who: 'general', text: 'Hmph. You made it, Private. Not cracked. Not bad.' },
    { id: 'c1_w2', who: 'general', text: 'Report to the egg factory. We need supplies, and we need them YESTERDAY!' },
  ],
  c2: [
    { id: 'c2_1', who: 'benny', text: 'Welcome to the factory! I\'m Corporal Benny Benedict. Mind the conveyor belt.' },
    { id: 'c2_2', who: 'benny', text: 'We build bombs, tank treads, sandbags, and food and medicine kits. You put every part on yourself.' },
    { id: 'c2_3', who: 'general', text: 'Everything you build goes to the front line. If you\'re too slow, I\'ll know about it!' },
    { id: 'c2_4', who: 'poach', text: 'Psst... he yells a LOT. Just build fast.' },
  ],
  c2w: [{ id: 'c2_w1', who: 'general', text: 'All orders done?! ...Fine. Good work. Don\'t let it go to your yolk.' }],
  c2y: [{ id: 'c2_y1', who: 'general', yell: true, text: 'TIME IS UP?! Our soldiers are WAITING! You\'re DEMOTED, soldier!' },
    { id: 'c2_y2', who: 'poach', text: 'Ouch. Told you he yells a lot. Come on, the front line needs us anyway.' }],
  c3: [
    { id: 'c3_1', who: 'coddle', text: 'Shelly? I\'m Medic Coddle. The front line is getting bombed day and night.' },
    { id: 'c3_2', who: 'scramble', text: 'Bombers come in ONE minute. Build a shelter. Sandbags, bricks, cement, metal, anything!' },
    { id: 'c3_3', who: 'scramble', text: 'Metal is strongest. Wood breaks fast. You can dig a foxhole to stay low.' },
    { id: 'c3_4', who: 'coddle', text: 'When the bombs fall, fix your walls. A wall with holes is just a fence.' },
  ],
  c3w: [
    { id: 'c3_w1', who: 'coddle', text: 'You held the line! I\'ve never seen walls take that much.' },
    { id: 'c3_w2', who: 'general', text: 'The air force needs a pilot. Can you fly?' },
    { id: 'c3_w3', who: 'shelly', text: '...I can learn.' },
  ],
  c4: [
    { id: 'c4_1', who: 'benny', text: 'Your plane is loaded with eggshell bombs. Regular, big, cluster, and sticky yolk.' },
    { id: 'c4_2', who: 'benny', text: 'The bombs take TWO seconds to land. Aim where the enemy WILL be, not where they are.' },
    { id: 'c4_3', who: 'general', text: 'The Rotten Egg keeps OUR eggs as prisoners next to his bases. Hit three of ours and I\'m calling you home!' },
    { id: 'c4_4', who: 'rotten', radio: true, text: 'Heh heh heh... come and try, little white egg. The Golden Egg is MINE.' },
  ],
  c4w: [{ id: 'c4_w1', who: 'general', text: 'Every base destroyed. The road to the Rotten Fortress is open.' }],
  c5: [
    { id: 'c5_1', who: 'shelly', text: 'Three years in this war. My shell has more cracks than I can count.' },
    { id: 'c5_2', who: 'general', text: 'This tank is our last one. Bring back the Golden Egg.' },
    { id: 'c5_3', who: 'scramble', text: 'Enemy tanks shoot back. Every hit knocks a piece off. Treads first, then the cannon.' },
    { id: 'c5_4', who: 'rotten', radio: true, text: 'You\'ll never reach my fortress. My tank, the STINKER, will scramble you!' },
  ],
  ending: [
    { id: 'e1', who: 'rotten', text: 'No... NO! My Golden Egg!' },
    { id: 'e2', who: 'shelly', text: 'It\'s not yours. It never was. It belongs to every egg.' },
    { id: 'e3', who: 'general', text: '...Shelly. I\'ve yelled at a LOT of eggs. You\'re the first one who made me proud.' },
    { id: 'e4', who: 'general', text: 'From today, you\'re GENERAL Shelly.' },
    { id: 'e5', who: 'narrator', text: 'Egg War III was over. The Golden Egg came home, and the nest was warm again.' },
    { id: 'e6', who: 'narrator', text: 'THE END... for now.' },
  ],
  // shouted during missions
  ff: { id: 'g_ff', who: 'general', text: 'THAT WAS ONE OF OURS!' },
  medic: { id: 'm_patch', who: 'coddle', text: 'Hold still! I\'m taping your shell back together!' },
};

// ---------- backgrounds for story scenes ----------
function drawBackdrop(kind, t) {
  if (kind === 'factory') {
    rect(0, 0, W, H, '#2a2620'); for (let i = 0; i < 6; i++) rect(i * 60 + 10, 20, 30, 70, '#3a3428');
    for (let i = 0; i < W; i += 16) { rect((i + t * 30) % W, 100, 10, 4, '#555'); } rect(0, 104, W, 6, '#222');
    for (let i = 0; i < 4; i++) rect(i * 90 + 20, 10, 4, 90, '#4a4234');
    return;
  }
  const sky = kind === 'night' ? ['#0a0c14', '#14182a'] : kind === 'fortress' ? ['#1e2410', '#3a3a1a'] : ['#2a2018', '#6a4428'];
  rect(0, 0, W, H, sky[0]); rect(0, 50, W, 60, sky[1]);
  // searchlights
  ctx.globalAlpha = 0.12; ctx.fillStyle = '#ffffd0';
  for (let i = 0; i < 2; i++) { const a = Math.sin(t * 0.4 + i * 2) * 0.5 - Math.PI / 2; const bx = 80 + i * 160; ctx.beginPath(); ctx.moveTo(bx, 130); ctx.lineTo(bx + Math.cos(a - 0.08) * 220, 130 + Math.sin(a - 0.08) * 220); ctx.lineTo(bx + Math.cos(a + 0.08) * 220, 130 + Math.sin(a + 0.08) * 220); ctx.fill(); }
  ctx.globalAlpha = 1;
  // distant flashes
  if ((t * 1.3) % 3 < 0.12) { ctx.globalAlpha = 0.3; rect(0, 90, W, 40, '#ff9a40'); ctx.globalAlpha = 1; }
  // ruined skyline
  srand(kind === 'fortress' ? 77 : 44);
  for (let x = 0; x < W; x += 14) { const h = 20 + rnd() * 40; rect(x, 130 - h, 14, h, '#0e0c0a'); if (rnd() < 0.4) rect(x + 3, 130 - h - 6, 4, 6, '#0e0c0a'); }
  rect(0, 128, W, 52, '#16120e');
}

// ================= STORY FLOW =================
const Story = { stage: 0, replay: false };
const CHAPTERS = [
  { key: 'running', title: 'THE RAID', mode: 'RUNNING', view: 'THIRD PERSON', bg: 'night', make: c => new RunningMode(c),
    goal: ['Run through the ruined town', 'and reach the BUNKER.', 'Red marks = bombs landing!'],
    keys: ['ARROWS/WASD  run & turn', 'SPACE jump   SHIFT dive', 'E roll (hold)   Q hide (hold)'],
    tkeys: ['PAD run & turn', 'A jump  B dive', 'C roll (hold)  D hide (hold)'] },
  { key: 'building', title: 'THE EGG FACTORY', mode: 'BUILDING', view: 'THIRD PERSON', bg: 'factory', make: c => new BuildingMode(c),
    goal: ['Build 10 supplies before', 'the clock runs out.', 'They go to the front line!'],
    keys: ['DRAG parts onto the blueprint', 'or ARROWS pick + SPACE place', 'Wrong part = lose 2 seconds'],
    tkeys: ['DRAG parts onto the blueprint', 'or tap a part to place it', 'Wrong part = lose 2 seconds'] },
  { key: 'survival', title: 'HOLD THE LINE', mode: 'SURVIVAL', view: 'THIRD PERSON', bg: 'dusk', make: c => new SurvivalMode(c),
    goal: ['1 minute to build a shelter,', 'then survive the bombing', 'and repair your walls.'],
    keys: ['BUILD: ARROWS move SPACE place', 'SHIFT remove  Q/E item  ENTER ready', 'SURVIVE: SPACE repairs a wall'],
    tkeys: ['BUILD: tap a square to place', 'tap items below, READY on top', 'SURVIVE: A repairs a wall'] },
  { key: 'bombing', title: 'WINGS OF SHELL', mode: 'BOMBING', view: "BIRD'S EYE VIEW", bg: 'dusk', make: c => new BombingMode(c),
    goal: ['Destroy every enemy base.', 'Bombs land 2 SECONDS later.', 'Do NOT hit our prisoners!'],
    keys: ['ARROWS fly   SPACE drop bomb', 'Q / E or 1-4 change bomb', 'White eggs are OURS'],
    tkeys: ['PAD fly   A drop bomb', 'B / C change bomb', 'White eggs are OURS'] },
  { key: 'tanking', title: 'IRON SHELL', mode: 'TANKING', view: 'THIRD PERSON', bg: 'fortress', make: c => new TankingMode(c),
    goal: ['Destroy 5 enemy bases,', 'beat the STINKER tank,', 'then grab the GOLDEN EGG!'],
    keys: ['UP/DOWN drive  LEFT/RIGHT turn', 'SPACE fire', 'Watch the radar (top right)'],
    tkeys: ['PAD drive & turn', 'A fire', 'Watch the radar (top right)'] },
];

function startStory() {
  if (save.chapter >= 5) { go(new Cutscene(SCRIPT.ending, () => go(new Ending()), 'fortress', 5)); return; }
  if (!save.prologue) { go(new Cutscene(SCRIPT.prologue, () => { save.prologue = true; writeSave(); playChapter(save.chapter, false); }, 'night', 0)); return; }
  playChapter(save.chapter, false);
}
function playChapter(i, replay) {
  Story.replay = replay; Story.stage = i;
  const after = () => go(new MissionCard(i));
  if (replay) after(); else go(new Cutscene(SCRIPT['c' + (i + 1)], after, CHAPTERS[i].bg, i));
}
function startMission(i) {
  const ch = CHAPTERS[i];
  go(ch.make({
    index: i,
    win: (stats) => missionWon(i, stats),
    lose: (stats) => go(new ResultScreen(i, false, stats)),
    timeUp: (stats) => buildingTimeUp(i, stats),
  }));
}
function missionWon(i, stats) {
  const first = !save.done[i];
  let promoted = false;
  if (first) { save.done[i] = true; if (save.rank < 5) { save.rank++; promoted = true; } save.chapter = Math.max(save.chapter, i + 1); }
  writeSave();
  go(new ResultScreen(i, true, stats, promoted));
}
function buildingTimeUp(i, stats) {
  const first = !save.done[i];
  if (first) { save.done[i] = true; save.chapter = Math.max(save.chapter, i + 1); }
  const demoted = save.rank > 0; if (demoted) save.rank--;
  writeSave();
  go(new Cutscene(SCRIPT.c2y, () => go(new ResultScreen(i, true, Object.assign({ demoted }, stats), false)), 'factory', 1));
}
function afterResult(i, won) {
  if (!won) { go(new TitleScreen()); return; }
  if (Story.replay) { go(new ChapterSelect()); return; }
  const winLines = SCRIPT['c' + (i + 1) + 'w'];
  const next = () => {
    if (i >= 4) { save.finished = true; writeSave(); go(new Cutscene(SCRIPT.ending, () => go(new Ending()), 'fortress', 5)); }
    else playChapter(i + 1, false);
  };
  if (winLines && !(i === 1 && Story.lastDemoted)) go(new Cutscene(winLines, next, CHAPTERS[i].bg, i)); else next();
}

// ================= SCENES: cutscene, title, menus, results =================
class Cutscene {
  constructor(lines, done, bg, stage) { this.lines = lines; this.done = done; this.bg = bg || 'night'; this.stage = stage || 0; this.i = -1; this.t = 0; this.touch = { a: 'NEXT', b: 'SKIP' }; }
  enter() { Story.stage = this.stage; Snd.play('story'); this.next(); }
  exit() { Voice.stop(); }
  next() {
    this.i++; if (this.i >= this.lines.length) { Voice.stop(); this.done(); this.i = this.lines.length - 1; this.finished = true; return; }
    const L = this.lines[this.i]; this.chars = 0; this.beepT = 0;
    if (L.radio) Snd.radio();
    if (L.sfx === 'siren') Snd.siren(4);
    if (L.yell) { Snd.yell(); FX.shake(3, 0.6); }
    Voice.play(L.id);
  }
  update(dt) {
    if (this.finished) return;
    this.t += dt; const L = this.lines[this.i];
    if (this.chars < L.text.length) {
      this.chars += dt * 38;
      this.beepT -= dt;
      if (this.beepT <= 0 && !Voice.playing) { Snd.talk(WHO[L.who].pitch); this.beepT = 0.075; }
    }
    if (In.hit('b')) { Voice.stop(); this.finished = true; this.done(); return; }
    if (In.ok() || In.ptr.pressed) { Snd.blip(700, 0.06); if (this.chars < L.text.length) this.chars = L.text.length; else this.next(); }
  }
  draw() {
    drawBackdrop(this.bg, this.t);
    const L = this.lines[Math.max(0, this.i)], who = WHO[L.who];
    const spr = who.sprite(), sc = 4;
    const bob = Math.sin(this.t * 3) * 1.5;
    const px = L.who === 'rotten' ? W - 30 - spr.width * sc : 24;
    ctx.drawImage(spr, px, 112 - spr.height * sc + bob + 8, spr.width * sc, spr.height * sc);
    if (L.radio) { ctx.globalAlpha = 0.25; for (let y = 0; y < 120; y += 2) rect(px, y, spr.width * sc, 1, R() < 0.5 ? '#000' : '#7f7'); ctx.globalAlpha = 1; }
    box(6, 116, W - 12, 58);
    rect(12, 110, who.name.length * 8 + 10, 12, '#c8b77a'); txt(who.name, 17, 112, '#16180f', 'left', 8, null);
    const lines = wrapText(L.text.slice(0, Math.floor(this.chars)), W - 30);
    lines.slice(0, 4).forEach((s, j) => txt(s, 14, 127 + j * 11, '#f4ecd0'));
    if (this.chars >= L.text.length && (this.t * 2 % 1) < 0.6) txt('▼', W - 20, 164, '#ffd23a');
    txt('B/SHIFT: SKIP', W - 8, 4, '#8a8a7a', 'right');
  }
}

class TitleScreen {
  constructor() { this.t = 0; this.sel = 0; this.confirmNew = false; this.touch = { pad: true, a: 'OK' }; }
  enter() { Snd.play('title'); }
  items() {
    const a = [{ k: 'story', l: save.chapter > 0 || save.prologue ? (save.finished ? 'WATCH ENDING' : 'CONTINUE STORY') : 'START STORY' }, { k: 'chapters', l: 'CHAPTERS' }, { k: 'sound', l: 'SOUND: ' + (Snd.isMuted() ? 'OFF' : 'ON') }, { k: 'voices', l: 'VOICES: ' + (Voice.on ? 'ON' : 'OFF') }];
    if (save.chapter > 0 || save.prologue) a.push({ k: 'new', l: this.confirmNew ? 'SURE? PRESS AGAIN' : 'NEW GAME' });
    return a;
  }
  update(dt) {
    this.t += dt; const it = this.items();
    if (In.hit('up')) { this.sel = (this.sel + it.length - 1) % it.length; Snd.blip(); this.confirmNew = false; }
    if (In.hit('down')) { this.sel = (this.sel + 1) % it.length; Snd.blip(); this.confirmNew = false; }
    let choose = In.ok();
    it.forEach((m, i) => { if (tapIn(90, 102 + i * 13 - 3, 140, 13)) { this.sel = i; choose = true; } });
    if (choose) this.choose(it[this.sel].k);
  }
  choose(k) {
    Snd.select();
    if (k === 'story') startStory();
    else if (k === 'chapters') go(new ChapterSelect());
    else if (k === 'voices') { Voice.on = !Voice.on; save.voices = Voice.on; writeSave(); if (Voice.on) Voice.speak({ who: 'general', text: 'Voices on, soldier!' }); else Voice.stop(); }
    else if (k === 'sound') { Snd.setMuted(!Snd.isMuted()); save.muted = Snd.isMuted(); writeSave(); }
    else if (k === 'new') { if (!this.confirmNew) { this.confirmNew = true; return; } try { localStorage.removeItem(SAVE_KEY); } catch (_) { } save = { chapter: 0, done: [false, false, false, false, false], rank: 0, sup: { bombs: 0, parts: 0, bags: 0, meds: 0 }, finished: false, muted: Snd.isMuted(), prologue: false }; this.confirmNew = false; this.sel = 0; Snd.confirm(); }
  }
  draw() {
    drawBackdrop('night', this.t);
    // bomber silhouettes crossing the sky
    for (let i = 0; i < 3; i++) { const x = ((this.t * 22 + i * 120) % 420) - 50, y = 18 + i * 9; rect(x, y, 18, 2, '#000'); rect(x + 6, y - 3, 3, 8, '#000'); rect(x + 15, y - 2, 2, 5, '#000'); }
    const s = eggSprite('shelly', 1);
    ctx.drawImage(s, 24, 64 + Math.sin(this.t * 2) * 2, s.width * 3, s.height * 3);
    const r = eggSprite('rotten');
    ctx.drawImage(r, W - 24 - r.width * 3, 58, r.width * 3, r.height * 3);
    txt('EGGSHELL:', W / 2, 20, '#f4f1e6', 'center', 16, '#3a2a10');
    txt('BOMBING', W / 2, 42, '#ffd23a', 'center', 16, '#7a2a10');
    txt('~ EGG WAR III ~', W / 2, 68, '#e04a3a', 'center');
    const it = this.items();
    it.forEach((m, i) => { const y = 102 + i * 13; if (i === this.sel) { rect(86, y - 3, 148, 12, 'rgba(200,183,122,.25)'); txt('►', 90, y, '#ffd23a'); } txt(m.l, W / 2 + 6, y, i === this.sel ? '#ffd23a' : '#d8d0b0', 'center'); });
    txt(RANKS[save.rank] + ' SHELLY', W / 2, 168, '#8a8a7a', 'center');
  }
}

class ChapterSelect {
  constructor() { this.sel = Math.min(save.chapter, 4); this.t = 0; this.touch = { pad: true, a: 'PLAY', b: 'BACK' }; }
  enter() { Snd.play('title'); }
  update(dt) {
    this.t += dt;
    if (In.hit('up')) { this.sel = (this.sel + 5) % 6; Snd.blip(); }
    if (In.hit('down')) { this.sel = (this.sel + 1) % 6; Snd.blip(); }
    if (In.hit('b') || In.hit('pause')) { go(new TitleScreen()); return; }
    let choose = In.ok();
    for (let i = 0; i < 6; i++) if (tapIn(20, 30 + i * 22, 280, 20)) { this.sel = i; choose = true; }
    if (choose) {
      if (this.sel === 5) { go(new TitleScreen()); return; }
      if (this.sel > save.chapter) { Snd.buzz(); return; }
      Snd.select(); playChapter(this.sel, true);
    }
  }
  draw() {
    rect(0, 0, W, H, '#14160e');
    txt('CHAPTERS', W / 2, 10, '#ffd23a', 'center');
    CHAPTERS.forEach((c, i) => {
      const y = 30 + i * 22, locked = i > save.chapter;
      box(20, y, 280, 20, i === this.sel ? '#3a3a22' : '#1c1e14', i === this.sel ? '#ffd23a' : '#6a6450');
      txt((i + 1) + '. ' + (locked ? '??????' : c.title), 28, y + 6, locked ? '#5a5a4a' : '#f4ecd0');
      txt(locked ? 'LOCKED' : c.mode + (save.done[i] ? ' ✓' : ''), 292, y + 6, locked ? '#5a5a4a' : '#c8b77a', 'right');
    });
    const y = 30 + 5 * 22; box(20, y, 280, 18, this.sel === 5 ? '#3a3a22' : '#1c1e14', this.sel === 5 ? '#ffd23a' : '#6a6450');
    txt('BACK', W / 2, y + 5, '#f4ecd0', 'center');
    const s = save.sup; txt(`SUPPLIES  BOMBS ${s.bombs}  PARTS ${s.parts}  BAGS ${s.bags}  MEDS ${s.meds}`, W / 2, 172, '#8a8a7a', 'center');
  }
}

class MissionCard {
  constructor(i) { this.i = i; this.t = 0; this.touch = { a: 'GO!' }; }
  enter() { Snd.play('story'); }
  update(dt) { this.t += dt; if (this.t > 0.4 && (In.ok() || In.ptr.pressed)) { Snd.confirm(); startMission(this.i); } }
  draw() {
    const c = CHAPTERS[this.i];
    rect(0, 0, W, H, '#14160e'); for (let y = 0; y < H; y += 4) rect(0, y, W, 1, 'rgba(255,255,255,.03)');
    txt('CHAPTER ' + (this.i + 1), 10, 10, '#c8b77a'); txt(c.title, 10, 22, '#ffd23a', 'left', 16);
    txt(c.mode + ' MODE  -  ' + c.view, 10, 44, '#e04a3a');
    const s = eggSprite('shelly', this.i);
    ctx.drawImage(s, 248, 14, s.width * 3, s.height * 3);
    txt(RANKS[save.rank], 274, 96, '#f4ecd0', 'center'); txt(AGES[this.i], 274, 106, '#8a8a7a', 'center');
    txt('MISSION:', 10, 62, '#c8b77a'); c.goal.forEach((g, j) => txt(g, 10, 74 + j * 10, '#f4ecd0'));
    txt('CONTROLS:', 10, 112, '#c8b77a'); (In.touch ? c.tkeys : c.keys).forEach((g, j) => txt(g, 10, 124 + j * 10, '#d8d0b0'));
    if ((this.t * 2) % 1 < 0.6) txt(In.touch ? 'TAP TO START' : 'PRESS SPACE TO START', W / 2, 166, '#ffd23a', 'center');
  }
}

class ResultScreen {
  constructor(i, won, stats = {}, promoted) { this.i = i; this.won = won; this.stats = stats; this.promoted = promoted; this.t = 0; this.sel = 0; this.touch = won ? { a: 'NEXT' } : { a: 'RETRY', b: 'QUIT' }; Story.lastDemoted = !!stats.demoted; }
  enter() { Snd.stopEngines(); Snd.play(this.won ? 'victory' : 'defeat'); if (this.promoted) setTimeout(() => Snd.fanfare(), 1600); }
  update(dt) {
    this.t += dt; if (this.t < 0.8) return;
    if (this.won) { if (In.ok() || In.ptr.pressed) afterResult(this.i, true); }
    else {
      if (In.ok() || tapIn(40, 140, 110, 20)) startMission(this.i);
      else if (In.hit('b') || In.hit('pause') || tapIn(170, 140, 110, 20)) afterResult(this.i, false);
    }
  }
  draw() {
    rect(0, 0, W, H, this.won ? '#14200e' : '#200e0e');
    const st = this.stats;
    if (this.won) {
      txt(st.demoted ? 'TIME IS UP!' : 'MISSION COMPLETE!', W / 2, 14, st.demoted ? '#e04a3a' : '#ffd23a', 'center', 16);
      (st.lines || []).forEach((l, j) => txt(l, W / 2, 46 + j * 12, '#f4ecd0', 'center'));
      const s = eggSprite('shelly', this.i);
      ctx.drawImage(s, W / 2 - s.width * 1.5, 92, s.width * 3, s.height * 3);
      if (this.promoted && this.t > 1.6) { txt('PROMOTED!', W / 2, 152, '#ffd23a', 'center'); txt(RANKS[save.rank] + ' SHELLY', W / 2, 164, '#f4ecd0', 'center'); }
      else if (st.demoted) { txt('DEMOTED...', W / 2, 152, '#e04a3a', 'center'); txt(RANKS[save.rank] + ' SHELLY', W / 2, 164, '#f4ecd0', 'center'); }
      else if (this.t > 1) txt(In.touch ? 'TAP TO CONTINUE' : 'PRESS SPACE', W / 2, 164, '#c8b77a', 'center');
    } else {
      txt(st.title || 'SPLAT!', W / 2, 20, '#e04a3a', 'center', 16);
      (st.lines || []).forEach((l, j) => txt(l, W / 2, 52 + j * 12, '#f4ecd0', 'center'));
      ctx.drawImage(SPLATS[0], W / 2 - 36, 96, 72, 36);
      box(40, 140, 110, 20, '#2a1a1a'); txt('A: RETRY', 95, 146, '#ffd23a', 'center');
      box(170, 140, 110, 20, '#2a1a1a'); txt('B: QUIT', 225, 146, '#d8d0b0', 'center');
    }
  }
}

class Ending {
  constructor() { this.t = 0; this.touch = { a: 'MENU' }; }
  enter() { Snd.play('title'); }
  update(dt) { this.t += dt; if (this.t > 3 && (In.ok() || In.ptr.pressed)) go(new TitleScreen()); }
  draw() {
    rect(0, 0, W, H, '#1a1608');
    const g = makeEgg.golden || (makeEgg.golden = makeEgg({ shell: '#f0c030', w: 16, h: 20, glow: true, eyes: 'none', mouth: 'none', seed: 4 }));
    ctx.globalAlpha = 0.2 + Math.sin(this.t * 3) * 0.1; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(W / 2, 60, 40 + Math.sin(this.t * 2) * 4, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.drawImage(g, W / 2 - g.width * 2, 60 - g.height * 2, g.width * 4, g.height * 4);
    const s = eggSprite('shelly', 5); ctx.drawImage(s, 40, 70, s.width * 3, s.height * 3);
    const gn = eggSprite('general'); ctx.drawImage(gn, W - 40 - gn.width * 3, 64, gn.width * 3, gn.height * 3);
    txt('GENERAL SHELLY', W / 2, 120, '#ffd23a', 'center'); txt(AGES[5], W / 2, 132, '#c8b77a', 'center');
    const roll = ['EGGSHELL: BOMBING', 'GAME IDEA & DESIGN: YOU, THE COMMANDER', 'VOICES: YOU!', 'THANKS FOR PLAYING'];
    txt(roll[Math.floor(this.t / 3) % roll.length], W / 2, 152, '#f4ecd0', 'center');
  }
}
