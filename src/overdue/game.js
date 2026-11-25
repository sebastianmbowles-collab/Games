// The night: title screen, intro, clock, villains waking, jump scares, mini games, the secret, the ending.
import * as THREE from 'three';
import { C } from './core.js';
import { FLOOR_H, tileX, tileZ, findTile, toC, toR } from './map.js';
import { P, I, SET, saveSettings, resetPlayer, updatePlayer, placeCamera, toggleCrouch, toggleLight, nearestHide, enterHide, exitHide, requestLock, releaseLock, noise, flash } from './player.js';
import { V, buildVillains, resetVillains, updateVillains, wake } from './villains.js';
import { say, sfx, ambience, updateAudio, setVolume, setListener, initAudio } from './audio.js';
import { WLD, sunrise } from './world.js';
import { runMinigame } from './minigames.js';
import { makeHands } from './models.js';

const NIGHT = 300; // seconds: 12 AM to 6 AM
const DIFF = {
  easy: { chase: 2.1, patrol: 1.2, sight: 0.85, hear: 0.8, bats: 2.8, marks: 2.4, battery: 240, wormDelay: 6.5, wormPasses: 2, extras: 2, allStart: false, marks_n: 2, mash: 6 },
  normal: { chase: 2.5, patrol: 1.35, sight: 1, hear: 1, bats: 3.4, marks: 3.0, battery: 150, wormDelay: 4.5, wormPasses: 3, extras: 3, allStart: false, marks_n: 2, mash: 8 },
  nightmare: { chase: 3.0, patrol: 1.6, sight: 1.15, hear: 1.25, bats: 4.2, marks: 3.6, battery: 90, wormDelay: 3.0, wormPasses: 4, extras: 3, allStart: true, marks_n: 3, mash: 11 },
};
const TIPS = {
  pages: ['Mr. Pages can\'t climb stairs.', 'If he SEES you hide, he checks that hiding spot.', 'Your flashlight lets him see you from far away.', 'Running is loud. Crouching is silent.', 'He only stays on his podium while you watch him...'],
  worm: ['Crouch in hallways! The Bookworm only hits you when you stand.', 'Don\'t stay in one hallway too long.'],
  bats: ['Turn your flashlight OFF and the Book Bats lose you.', 'Hiding makes the Book Bats give up.'],
  marks: ['Mash as fast as you can to break free from a Bookmark!', 'Bookmarks feel your footsteps. Crouch to sneak past.'],
};
const NAMES = { pages: 'MR. PAGES', worm: 'THE BOOKWORM', bats: 'THE BOOK BATS', marks: 'THE BOOKMARKS' };

export const G = {
  mode: 'title', D: DIFF.normal, time: 0, hour: 0, wakeAt: [], over: false, fear: 0, rustle: 0, introDone: false, secret: false,
  caught: (who) => caught(who), trip: (m) => trip(m), scare: (k) => { C.fx.glitch = Math.max(C.fx.glitch, k); }, blackout: (d, cb) => blackout(d, cb),
};
let hands, titleT = 0, seq = null;
const $ = id => document.getElementById(id);
const show = (id, on = true) => $(id).classList.toggle('on', on);
let hintT = 0;
function hint(text, sec = 4) { $('hint').innerHTML = text; show('hint'); hintT = sec; }
function bigText(text, sec) { $('bigText').textContent = text; show('bigText'); if (sec) setTimeout(() => show('bigText', false), sec * 1000); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function blackout(d, cb) { C.fx.fade = 1; setTimeout(() => { cb && cb(); C.fx.fade = 0; }, d * 1000); }

export function initGame() {
  buildVillains();
  hands = makeHands(); C.camera.add(hands.root);
  resetVillains(G);
  setVolume(SET.volume);
  initMenus();
  toTitle();
}

// ---------------- menus ----------------
function initMenus() {
  const paint = () => {
    document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('sel', b.dataset.diff === SET.diff));
    document.querySelectorAll('[data-scheme]').forEach(b => b.classList.toggle('sel', b.dataset.scheme === SET.scheme));
    $('vol').value = SET.volume; $('sens').value = SET.sens;
    document.body.classList.toggle('touchUI', SET.scheme === 'joystick' || C.mobile);
  };
  let back = 'title';
  document.querySelectorAll('[data-diff]').forEach(b => b.onclick = () => { initAudio(); SET.diff = b.dataset.diff; saveSettings(); paint(); sfx('click'); });
  document.querySelectorAll('[data-scheme]').forEach(b => b.onclick = () => { SET.scheme = b.dataset.scheme; saveSettings(); paint(); sfx('click'); });
  $('vol').oninput = e => { SET.volume = +e.target.value; setVolume(SET.volume); saveSettings(); };
  $('sens').oninput = e => { SET.sens = +e.target.value; saveSettings(); };
  $('btnPlay').onclick = () => { initAudio(); startNight(); };
  $('btnHow').onclick = () => { show('title', false); show('how'); back = 'title'; };
  $('btnSet').onclick = () => { show('title', false); show('settings'); back = 'title'; };
  $('btnPSet').onclick = () => { show('pause', false); show('settings'); back = 'pause'; };
  document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { b.closest('.ov').classList.remove('on'); show(back); });
  $('btnResume').onclick = resume;
  $('btnQuit').onclick = () => { show('pause', false); toTitle(); };
  $('btnRetry').onclick = () => { show('dead', false); startNight(); };
  $('btnMenu').onclick = () => { show('dead', false); toTitle(); };
  $('btnAgain').onclick = () => { show('credits', false); startNight(); };
  $('btnMenu2').onclick = () => { show('credits', false); toTitle(); };
  $('compForm').onsubmit = e => { e.preventDefault(); tryPassword($('compIn').value); };
  $('compClose').onclick = closeComputer;
  C.renderer.domElement.addEventListener('click', () => { if (G.mode === 'play') requestLock(); });
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.mode === 'play' && SET.scheme === 'wasd' && !C.mobile) pause(); });
  paint();
}

function toTitle() {
  G.mode = 'title'; G.over = true;
  document.body.classList.remove('playing'); delete document.body.dataset.hide;
  releaseLock(); show('title'); ambience(false);
  resetVillains(G); sunrise(0); hands.root.visible = false;
  C.fx.fade = 0; C.fx.red = 0; C.fx.flash = 0;
  P.light = false; flash.intensity = 0;
  // camera in the entrance hall, looking up at Mr. Pages on his podium
  const p = findTile('P');
  C.camera.position.set(tileX(p.c) + 1.2, 1.5, tileZ(p.r) + 3.6);
  C.camera.lookAt(tileX(p.c), 1.9, tileZ(p.r));
}

function pause() {
  if (G.mode !== 'play') return;
  G.mode = 'pause'; releaseLock(); show('pause');
  if (C.mobile || SET.scheme === 'joystick') document.body.classList.remove('playing');
}
function resume() {
  show('pause', false); G.mode = 'play'; document.body.classList.add('playing'); requestLock();
}

// ---------------- the night ----------------
async function startNight() {
  show('title', false);
  const D = G.D = DIFF[SET.diff] || DIFF.normal;
  G.time = 0; G.hour = 0; G.over = false; G.introDone = false; G.fear = 0; G.secret = false;
  resetPlayer(D.battery); resetVillains(G); sunrise(0); hands.root.visible = false;
  C.fx.red = 0; C.fx.flash = 0; C.fx.glitch = 0.3;
  // who wakes up when (random order every game!)
  const order = ['worm', 'bats', 'marks'].sort(() => Math.random() - 0.5).slice(0, D.extras);
  G.wakeAt = D.allStart ? order.map(n => ({ n, h: 0 })) : order.map((n, i) => ({ n, h: D.extras === 2 ? [1, 3][i] : i + 1 }));
  document.body.classList.add('playing'); delete document.body.dataset.hide;
  G.mode = 'play'; requestLock(); ambience(true);
  placeCamera(1);
  const run = seq = {};
  C.fx.fade = 1;
  for (let i = 0; i <= 20; i++) { await wait(60); if (seq !== run) return; C.fx.fade = 1 - i / 20; }
  hint('You fell asleep reading...<br>The library is <b>closed</b>.', 4);
  await wait(3600); if (seq !== run) return;
  sfx('speaker', null, 1);
  const dur = say('pages_intro', null, 1.1);
  await wait((dur || 6) * 1000 - 1400); if (seq !== run) return;
  // the true nature of Mr. Pages...
  C.fx.glitch = 1; P.camShake = 0.6;
  V.pages.m.setCreepy(true);
  for (let i = 0; i < 4; i++) { WLD.podiumLight.intensity = i % 2 ? 30 : 0; await wait(120); }
  WLD.podiumLight.intensity = 4;
  G.introDone = true;
  for (const w of G.wakeAt) if (w.h === 0) wake(w.n, G);
  hint('Survive until <b>6 AM</b>.<br>Don\'t let him see you.', 5);
}

function updateClock(dt) {
  G.time += dt;
  const h = Math.floor(G.time / (NIGHT / 6));
  const mins = Math.floor((G.time % (NIGHT / 6)) / (NIGHT / 6) * 60);
  $('clock').innerHTML = `${h === 0 ? 12 : h}:${String(mins).padStart(2, '0')} AM<small>${SET.diff.toUpperCase()}</small>`;
  if (h !== G.hour) {
    G.hour = h; sfx('chime');
    if (h < 6) hint(`<b>${h} AM</b>`, 2.5);
    for (const w of G.wakeAt) if (w.h === h) { wake(w.n, G); setTimeout(() => hint(['Something woke up...', 'You hear something stir...', 'The library feels... awake.'][Math.floor(Math.random() * 3)], 3), 2600); }
  }
  if (G.time >= NIGHT) ending();
}

export function updateGame(dt) {
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) show('hint', false); }
  C.fx.glitch = Math.max(0, C.fx.glitch - dt * 0.6);
  if (G.mode === 'title') { titleUpdate(dt); return; }
  const events = I.events.splice(0);
  if (G.mode === 'pause' || G.mode === 'dead') return;
  if (G.mode === 'computer') { updateVillains(dt, G); updateClock(dt); updateAudio(dt, G.fear, G.rustle); setListener(C.camera); C.fx.fear = G.fear; return; }
  if (G.mode === 'end') { if (seq && seq.tick) seq.tick(dt); setListener(C.camera); return; }
  if (G.mode !== 'play') return;
  for (const e of events) {
    if (e === 'pause') pause();
    else if (P.tripped) { if (e === 'mashAny' || e === 'mash') P.tripped.got++; }
    else if (e === 'crouch') toggleCrouch();
    else if (e === 'light') toggleLight();
    else if (e === 'use') use();
  }
  if (G.mode !== 'play') return;
  updatePlayer(dt, G);
  if (G.introDone) updateClock(dt);
  if (G.mode !== 'play') return;
  updateVillains(dt, G);
  updateTrip(dt);
  updateAudio(dt, G.fear, G.rustle);
  setListener(C.camera);
  C.fx.fear = G.fear;
  drawHud();
}

function titleUpdate(dt) {
  titleT += dt;
  const pg = V.pages;
  pg.yaw = Math.atan2(1.2, 3.6); pg.m.root.rotation.y = pg.yaw;
  pg.m.animate(dt, 0, C.t, 0);
  // sometimes his face twitches...
  const tw = (titleT % 6.3) > 6.15;
  pg.m.setCreepy(tw);
  C.fx.glitch = tw ? 0.8 : C.fx.glitch;
  const p = findTile('P');
  C.camera.position.set(tileX(p.c) + 1.2 + Math.sin(titleT * 0.2) * 0.3, 1.5, tileZ(p.r) + 3.6);
  const wide = C.w / C.h > 1.25;
  C.camera.lookAt(tileX(p.c) - (wide ? 1.5 : 0), wide ? 1.85 : 1.4, tileZ(p.r));
}

// ---------------- using things ----------------
const SECRET = findTile('X');
function nearComputer() { return P.L === 0 && Math.hypot(tileX(SECRET.c) - P.pos.x, tileZ(SECRET.r) - P.pos.z) < 2.0; }
function use() {
  if (P.hidden) { exitHide(); return; }
  if (nearComputer()) { openComputer(); return; }
  const h = nearestHide(); if (h) enterHide(h);
}
function drawHud() {
  const b = P.battery / P.batteryMax;
  $('battBar').firstElementChild.style.width = (b * 100) + '%';
  $('battBar').classList.toggle('low', b < 0.15);
  $('stamBar').firstElementChild.style.width = (P.stamina * 100) + '%';
  $('stamW').style.opacity = P.stamina < 0.999 ? 1 : 0.25;
  let pr = '';
  const key = C.mobile || SET.scheme === 'joystick' ? '' : '[E] ';
  if (P.hidden) pr = key + 'LEAVE';
  else if (nearComputer()) pr = key + 'USE COMPUTER';
  else if (nearestHide()) pr = key + 'HIDE';
  $('prompt').textContent = P.tripped ? '' : pr;
  $('bUse').textContent = P.hidden ? 'LEAVE' : nearComputer() ? 'USE' : 'HIDE';
  $('bUse').classList.toggle('hot', !!pr);
  $('bLight').classList.toggle('on', P.light);
  $('bCrouch').classList.toggle('on', P.crouch);
  $('hideT').textContent = P.hidden ? (P.hideT > 20 ? 'YOU CAN\'T HOLD YOUR BREATH!' : 'HOLD YOUR BREATH... ' + Math.ceil(20 - P.hideT)) : '';
}

// ---------------- the secret computer ----------------
function openComputer() {
  G.mode = 'computer'; releaseLock();
  $('compIn').value = ''; $('compOut').textContent = ''; $('compOut').className = '';
  show('comp'); setTimeout(() => $('compIn').focus(), 50);
  sfx('beep');
}
function closeComputer() {
  show('comp', false); $('compIn').blur();
  if (G.mode === 'computer') { G.mode = 'play'; requestLock(); }
}
function tryPassword(v) {
  const out = $('compOut');
  if (v.trim().toUpperCase() === 'STORYTIME') {
    out.className = 'secret'; out.textContent = 'I USED TO BE LIKE YOU';
    sfx('static'); C.fx.glitch = 1; G.secret = true;
    WLD.secretScreen.material.color.setRGB(1, 0.2, 0.2);
  } else {
    out.className = ''; out.textContent = 'ACCESS DENIED';
    sfx('buzz', { x: tileX(SECRET.c), y: 1, z: tileZ(SECRET.r) }, 1.5);
    noise(9, { x: tileX(SECRET.c), y: 0, z: tileZ(SECRET.r) });
    $('compIn').value = '';
  }
}

// ---------------- bookmarks trip you ----------------
function trip(m) {
  if (P.tripped || G.over) return;
  P.tripped = { m, need: G.D.mash, got: 0, t: 3.2 };
  P.crouch = false;
  sfx('thud'); say('kid_fall', null, 1, { sub: false }); setTimeout(() => say('kid_struggle', null, 0.8, { sub: false }), 500);
  $('mashKey').textContent = C.mobile || SET.scheme === 'joystick' ? 'TAP FAST!' : 'MASH SPACE / E';
  show('mash');
  C.fx.glitch = 0.8;
}
function updateTrip(dt) {
  const t = P.tripped; if (!t) return;
  t.t -= dt;
  $('mash').querySelector('i').style.width = Math.min(100, t.got / t.need * 100) + '%';
  if (t.got >= t.need) {
    show('mash', false);
    t.m.stun = 6; t.m.state = 'wander'; t.m.path = null;
    P.tripped = null; noise(18); sfx('tear', null, 0.6);
    hint('You broke free!', 1.5);
  } else if (t.t <= 0) { show('mash', false); caught('marks'); }
}

// ---------------- caught: jump scare, mini game, try again ----------------
async function caught(who) {
  if (G.over) return;
  G.over = true; G.mode = 'dead';
  const run = seq = {};
  releaseLock(); show('mash', false); show('comp', false);
  if (P.tripped) P.tripped = null;
  if (P.hidden) { exitHide(); }
  document.body.classList.remove('playing'); delete document.body.dataset.hide;
  show('hint', false);
  // JUMP SCARE: the villain's face rushes at you
  const cam = C.camera, fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
  sfx('screech', null, 1.4);
  const t0 = performance.now();
  const pg = V.pages;
  await new Promise(res => {
    const anim = () => {
      const k = Math.min(1, (performance.now() - t0) / 1300);
      const dist = 1.9 - Math.min(1, k * 2.2) * 1.35;
      const sh = (Math.random() - 0.5) * 0.08;
      const at = cam.position.clone().add(fwd.clone().multiplyScalar(dist));
      if (who === 'pages') {
        pg.m.setCreepy(true);
        pg.m.root.position.set(at.x + sh, at.y - 1.95 + sh, at.z);
        pg.m.root.rotation.y = Math.atan2(cam.position.x - at.x, cam.position.z - at.z);
        pg.m.animate(0.016, 0, C.t, 1);
      } else if (who === 'worm') {
        const w = V.worm.m; w.root.visible = true;
        w.segs.forEach((s, i) => s.position.copy(cam.position).add(fwd.clone().multiplyScalar(dist + i * 0.45)).add(new THREE.Vector3(sh, sh - 0.15, 0)));
        w.head.lookAt(cam.position);
      } else if (who === 'bats') {
        const b = V.bats.m; b.root.visible = true;
        for (const bt of b.bats) { const u = bt.userData; bt.position.copy(at).add(u.off.clone().multiplyScalar(0.35 * dist)); bt.lookAt(cam.position); u.wl.rotation.z = Math.sin(C.t * 40) * 1.2; u.wr.rotation.z = -u.wl.rotation.z; }
      } else {
        const m = V.marks[0]; m.m.root.visible = true;
        m.m.root.position.copy(at).add(new THREE.Vector3(0, -0.6, 0));
        m.m.root.rotation.y = Math.atan2(cam.position.x - at.x, cam.position.z - at.z) + Math.PI;
        m.m.animate(C.t, 2, 1.2);
      }
      cam.position.x += sh * 0.3;
      C.fx.red = 0.25 + Math.random() * 0.2; C.fx.glitch = 1; C.fx.flash = k < 0.08 ? 0.5 : 0;
      if (k < 1) requestAnimationFrame(anim); else res();
    };
    anim();
  });
  C.fx.fade = 1; C.fx.red = 0; C.fx.flash = 0; ambience(false);
  await wait(500); if (seq !== run) return;
  if (who !== 'pages') await runMinigame(who);
  if (seq !== run) return;
  $('deadTitle').textContent = 'CAUGHT BY ' + NAMES[who];
  const tips = TIPS[who]; $('deadTip').textContent = 'TIP: ' + tips[Math.floor(Math.random() * tips.length)];
  show('dead');
}

// ---------------- 6 AM: the twist ----------------
async function ending() {
  if (G.over) return;
  G.over = true; G.mode = 'end';
  const run = seq = {};
  releaseLock(); show('mash', false); show('comp', false); show('hint', false);
  if (P.hidden) exitHide();
  P.tripped = null; P.light = false;
  document.body.classList.remove('playing');
  $('clock').innerHTML = '6:00 AM';
  ambience(false); sfx('chime');
  bigText('6:00 AM', 3);
  // everyone disappears, the sun comes up
  V.pages.m.root.visible = false; V.worm.m.root.visible = false; V.bats.m.root.visible = false; V.marks.forEach(m => { m.m.root.visible = false; m.state = 'off'; });
  let k = 0, phase = 'sun', pk = 0;
  seq.tick = dt => {
    if (phase === 'sun') { k = Math.min(1, k + dt / 4); sunrise(k); placeCamera(dt); }
    if (phase === 'hands') {
      pk = Math.min(1, pk + dt / 6);
      P.pitch += (-0.75 - P.pitch) * Math.min(1, dt * 1.5); placeCamera(dt);
      hands.paint(pk);
      C.fx.glitch = pk * 0.7; C.fx.fear = pk;
    }
  };
  await wait(4500); if (seq !== run) return;
  hint('You made it...', 3);
  await wait(3000); if (seq !== run) return;
  // ...but look at your hands
  phase = 'hands'; hands.paint(0); hands.root.visible = true;
  say('kid_hands', null, 1);
  await wait(2500); if (seq !== run) return;
  hint('...what\'s happening to my hands?', 3);
  await wait(4000); if (seq !== run) return;
  sfx('tear', null, 1);
  for (let i = 0; i <= 15; i++) { C.fx.fade = i / 15; await wait(60); }
  hands.root.visible = false; phase = 'none';
  // Mr. Pages, smiling in the morning light
  const pg = V.pages, cam = C.camera, fwd = new THREE.Vector3();
  P.pitch = 0; placeCamera(0.016); cam.getWorldDirection(fwd);
  const at = cam.position.clone().add(fwd.setY(0).normalize().multiplyScalar(1.5));
  pg.m.setCreepy(false); pg.m.root.visible = true;
  pg.m.root.position.set(at.x, P.pos.y + (P.eye - 1.95) + 0.05, at.z);
  pg.m.root.rotation.y = Math.atan2(cam.position.x - at.x, cam.position.z - at.z);
  pg.m.animate(0.016, 0, C.t, 0);
  C.fx.glitch = 0; C.fx.fear = 0;
  await wait(800); if (seq !== run) return;
  for (let i = 0; i <= 20; i++) { C.fx.fade = 1 - i / 20; await wait(50); }
  await wait(600); if (seq !== run) return;
  const d = say('pages_end', null, 1.2);
  await wait((d || 2.5) * 1000 + 1500); if (seq !== run) return;
  pg.m.setCreepy(true); C.fx.glitch = 1; sfx('static');
  await wait(150);
  C.fx.fade = 1;
  await wait(1200); if (seq !== run) return;
  $('credSecret').textContent = G.secret ? '"I USED TO BE LIKE YOU"' : 'There is a secret in the computer lab...';
  show('credits');
}
