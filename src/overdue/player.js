// You: moving, looking, crouching, running, the flashlight, hiding.
import * as THREE from 'three';
import { C } from './core.js';
import { T, at, toC, toR, groundY, levelOfY, canStand, stairAt, HIDES, tileX, tileZ, findTile, FLOOR_H } from './map.js';
import { sfx, say } from './audio.js';

// ---------------- settings (saved in the browser when allowed) ----------------
export const SET = { scheme: C.mobile ? 'joystick' : 'wasd', volume: 0.9, sens: 1, diff: 'normal' };
try { Object.assign(SET, JSON.parse(localStorage.getItem('overdue_settings') || '{}')); } catch (e) { /* storage blocked */ }
export function saveSettings() { try { localStorage.setItem('overdue_settings', JSON.stringify(SET)); } catch (e) { /* ignore */ } }

// ---------------- input ----------------
export const I = { mx: 0, mz: 0, turn: 0, lookX: 0, lookY: 0, run: false, keys: {}, events: [], locked: false, touchRun: false };
const ev = e => I.events.push(e);
addEventListener('keydown', e => {
  if (e.repeat) return;
  I.keys[e.code] = true;
  if (e.code === 'KeyR') I.runToggle = !I.runToggle;
  const map = { KeyC: 'crouch', ControlLeft: 'crouch', KeyF: 'light', KeyE: 'use', Space: 'mash', Escape: 'pause', KeyP: 'pause', Enter: 'enter' };
  if (map[e.code]) ev(map[e.code]);
  if (e.code === 'KeyE' || e.code === 'Space') ev('mashAny');
});
addEventListener('keyup', e => { I.keys[e.code] = false; });
addEventListener('mousemove', e => {
  if (I.locked) { I.lookX += e.movementX; I.lookY += e.movementY; }
});
document.addEventListener('pointerlockchange', () => { I.locked = !!document.pointerLockElement; });
export function requestLock() {
  if (SET.scheme === 'joystick' || C.mobile) return;
  const el = C.renderer.domElement;
  try { const p = el.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* ignore */ }
}
export function releaseLock() { if (document.pointerLockElement) document.exitPointerLock(); }

// touch / on-screen joystick
export function initTouch() {
  const stick = document.getElementById('stick'), nub = document.getElementById('nub');
  let sid = null, sx = 0, sy = 0, lid = null, lx = 0, ly = 0;
  const R = 55;
  stick.addEventListener('pointerdown', e => { sid = e.pointerId; const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; try { stick.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } moveStick(e); e.preventDefault(); });
  const moveStick = e => {
    let dx = e.clientX - sx, dy = e.clientY - sy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    nub.style.transform = `translate(${dx}px,${dy}px)`;
    I.mx = dx / R; I.mz = dy / R;
    I.touchRun = d > R * 1.25 && false;
  };
  stick.addEventListener('pointermove', e => { if (e.pointerId === sid) moveStick(e); });
  const endStick = e => { if (e.pointerId !== sid) return; sid = null; I.mx = I.mz = 0; nub.style.transform = ''; };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
  const pad = document.getElementById('lookpad');
  pad.addEventListener('pointerdown', e => { lid = e.pointerId; lx = e.clientX; ly = e.clientY; try { pad.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } ev('mashAny'); });
  pad.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; I.lookX += (e.clientX - lx) * 2.2; I.lookY += (e.clientY - ly) * 2.2; lx = e.clientX; ly = e.clientY; });
  const endLook = e => { if (e.pointerId === lid) lid = null; };
  pad.addEventListener('pointerup', endLook); pad.addEventListener('pointercancel', endLook);
  const btn = (id, down, up) => { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); down(); b.classList.add('down'); }); const u = () => { b.classList.remove('down'); up && up(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('pointerleave', u); };
  btn('bRun', () => { I.runToggle = !I.runToggle; });
  btn('bCrouch', () => ev('crouch'));
  btn('bLight', () => ev('light'));
  btn('bUse', () => { ev('use'); ev('mashAny'); });
  btn('bPause', () => ev('pause'));
}

function readInput(dt) {
  const k = I.keys;
  let mx = 0, mz = 0, turn = 0, run = false;
  if (SET.scheme === 'arrows') {
    if (k.ArrowUp) mz -= 1; if (k.ArrowDown) mz += 1;
    if (k.ArrowLeft) turn -= 1; if (k.ArrowRight) turn += 1;
    if (k.Comma) mx -= 1; if (k.Period) mx += 1;
  } else {
    if (k.KeyW || k.ArrowUp) mz -= 1; if (k.KeyS || k.ArrowDown) mz += 1;
    if (k.KeyA) mx -= 1; if (k.KeyD) mx += 1;
    if (k.ArrowLeft) turn -= 1; if (k.ArrowRight) turn += 1;
  }
  run = !!(k.ShiftLeft || k.ShiftRight) || I.touchRun || I.runToggle;
  // game controller
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null;
  if (gp) {
    const dz = v => Math.abs(v) < 0.18 ? 0 : v;
    mx += dz(gp.axes[0]); mz += dz(gp.axes[1]);
    I.lookX += dz(gp.axes[2] || 0) * 900 * dt; I.lookY += dz(gp.axes[3] || 0) * 600 * dt;
    const b = i => gp.buttons[i] && gp.buttons[i].pressed;
    I.gpPrev = I.gpPrev || [];
    const edge = i => b(i) && !I.gpPrev[i];
    if (edge(0)) { ev('use'); ev('mashAny'); } if (edge(1)) ev('crouch'); if (edge(2)) ev('light'); if (edge(9)) ev('pause');
    if (b(4) || b(6) || b(10)) run = true;
    I.gpPrev = gp.buttons.map(x => x.pressed);
  }
  mx += I.mx; mz += I.mz;
  const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
  return { mx, mz, turn, run };
}

// ---------------- the player ----------------
export const P = {
  pos: new THREE.Vector3(), yaw: 0, pitch: 0, L: 0, crouch: false, eye: 1.6, stamina: 1, tired: false,
  battery: 150, batteryMax: 150, light: false, hidden: null, hideT: 0, breathT: 0, seenHiding: false,
  frozen: false, tripped: null, stepT: 0, moving: 0, speed: 0, noises: [], camShake: 0, lookAtTarget: null,
};
export let flash;
const RADIUS = 0.32;

export function initPlayer() {
  flash = new THREE.SpotLight(0xfff1d8, 0, 26, 0.42, 0.45, 1.6);
  flash.castShadow = true; flash.shadow.mapSize.set(C.mobile ? 512 : 1024, C.mobile ? 512 : 1024); flash.shadow.bias = -0.0008; flash.shadow.camera.near = 0.2;
  flash.position.set(0.18, -0.15, 0.1);
  C.camera.add(flash); C.camera.add(flash.target); flash.target.position.set(0, -0.15, -5);
  // a faint light around you so you are never in pitch black
  const glow = new THREE.PointLight(0x9aa8d0, 0.5, 4, 2); C.camera.add(glow); P.glow = glow;
}

export function resetPlayer(batt) {
  const k = findTile('k');
  P.pos.set(tileX(k.c) + 0.4, 0, tileZ(k.r) + 0.2); P.L = 0;
  P.yaw = -Math.PI / 2 - 0.05; P.pitch = 0.02; // facing east, towards the entrance hall
  P.crouch = false; P.eye = 1.6; P.stamina = 1; P.tired = false;
  P.battery = P.batteryMax = batt; P.light = false; flash.intensity = 0;
  P.hidden = null; P.hideT = 0; P.tripped = null; P.frozen = false; P.noises.length = 0; P.camShake = 0;
}

export function noise(radius, pos = P.pos) { P.noises.push({ x: pos.x, y: pos.y, z: pos.z, L: P.L, r: radius }); }

function blocked(x, z) {
  // touching a tile we can't stand on?
  for (const [ox, oz] of [[RADIUS, 0], [-RADIUS, 0], [0, RADIUS], [0, -RADIUS], [RADIUS * 0.7, RADIUS * 0.7], [-RADIUS * 0.7, RADIUS * 0.7], [RADIUS * 0.7, -RADIUS * 0.7], [-RADIUS * 0.7, -RADIUS * 0.7]]) {
    const c = toC(x + ox), r = toR(z + oz);
    if (stairAt(c, r)) {
      // you can only walk onto stairs from their ends
      const cc = toC(x), rr = toR(z);
      if (stairAt(cc, rr) && stairAt(cc, rr).c === c) continue;
      const s = stairAt(c, r);
      if (P.L === 0 && rr === s.bot + 1 && cc === c) continue;
      if (P.L === 1 && rr === s.top - 1 && cc === c) continue;
      return true;
    }
    if (!canStand(P.L, c, r)) return true;
  }
  return false;
}

export function toggleLight() {
  if (P.hidden && P.hidden.type === 'cabinet') return;
  if (P.battery <= 0) { sfx('click'); return; }
  P.light = !P.light; sfx('click');
}

export function updatePlayer(dt, G) {
  const inp = readInput(dt);
  const sens = 0.0022 * SET.sens;
  // looking around
  let lx = I.lookX, ly = I.lookY; I.lookX = I.lookY = 0;
  if (!P.frozen) {
    P.yaw -= lx * sens + inp.turn * 2.2 * dt * SET.sens;
    P.pitch -= ly * sens; P.pitch = Math.max(-1.35, Math.min(1.35, P.pitch));
  }
  // flashlight battery (never refills!)
  if (P.light) { P.battery -= dt; if (P.battery <= 0) { P.battery = 0; P.light = false; sfx('click'); } }
  const low = P.battery < 20 && P.light;
  flash.intensity = P.light ? (low && Math.random() < 0.08 ? 4 : 38) : 0;
  flash.castShadow = P.light; // shadows cost a lot: only when the flashlight is on

  if (P.hidden) { updateHidden(dt, inp); placeCamera(dt); return; }
  if (P.tripped) { placeCamera(dt); return; }
  if (P.frozen) { placeCamera(dt); return; }

  // crouch makes you short, slow and quiet. You can't run crouched.
  if (inp.run && P.crouch && (inp.mx || inp.mz)) P.crouch = false; // running stands you up
  const wantRun = inp.run && !P.tired && (inp.mx || inp.mz);
  if (wantRun) { P.stamina -= dt / 4.5; if (P.stamina <= 0) { P.stamina = 0; P.tired = true; I.runToggle = false; say('kid_pant', null, 0.7, { sub: false }); } }
  else { P.stamina = Math.min(1, P.stamina + dt / 7); if (P.tired && P.stamina > 0.35) P.tired = false; }
  const speed = P.crouch ? 1.45 : wantRun ? 4.6 : (P.tired ? 1.9 : 2.6);
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
  const vx = (inp.mx * cos + inp.mz * sin) * speed, vz = (-inp.mx * sin + inp.mz * cos) * speed;
  const nx = P.pos.x + vx * dt, nz = P.pos.z + vz * dt;
  if (!blocked(nx, P.pos.z)) P.pos.x = nx;
  if (!blocked(P.pos.x, nz)) P.pos.z = nz;
  P.pos.y = groundY(P.pos.x, P.pos.z, P.L);
  if (stairAt(toC(P.pos.x), toR(P.pos.z))) P.L = levelOfY(P.pos.y);
  const moving = Math.hypot(vx, vz);
  P.speed = moving; P.running = wantRun;
  // footsteps: running is LOUD
  if (moving > 0.2) {
    P.stepT -= dt * moving;
    if (P.stepT <= 0) {
      P.stepT = 1.25;
      const wood = P.L === 1 || stairAt(toC(P.pos.x), toR(P.pos.z));
      if (wantRun) { sfx(wood ? 'stepWood' : 'run', null, 0.7); noise(13); }
      else if (!P.crouch) { sfx(wood ? 'stepWood' : 'step', null, 0.35); noise(wood ? 5 : 3.5); }
      else sfx('step', null, 0.08);
    }
  }
  placeCamera(dt);
}

export function toggleCrouch() { if (!P.hidden && !P.tripped) { P.crouch = !P.crouch; if (P.crouch) I.runToggle = false; } }

const _e = new THREE.Euler(0, 0, 0, 'YXZ');
export function placeCamera(dt) {
  let eyeTarget = P.crouch ? 0.95 : 1.6;
  if (P.hidden) eyeTarget = P.hidden.type === 'desk' ? 0.5 : 1.35;
  if (P.tripped) eyeTarget = 0.35;
  P.eye += (eyeTarget - P.eye) * Math.min(1, dt * 8);
  const bob = P.speed > 0.2 && !P.hidden ? Math.sin(C.t * (P.running ? 13 : 8)) * (P.running ? 0.05 : 0.025) : 0;
  C.camera.position.set(P.pos.x, P.pos.y + P.eye + bob, P.pos.z);
  let shake = P.camShake; P.camShake = Math.max(0, P.camShake - dt * 2);
  _e.set(P.pitch + (Math.random() - 0.5) * shake * 0.1, P.yaw + (Math.random() - 0.5) * shake * 0.1, (P.tripped ? 0.5 : 0) + Math.sin(C.t * 1.3) * 0.004);
  C.camera.quaternion.setFromEuler(_e);
}

// ---------------- hiding ----------------
export function nearestHide() {
  let best = null, bd = 1.9;
  for (const h of HIDES) {
    if (h.L !== P.L) continue;
    const d = Math.hypot(tileX(h.c) - P.pos.x, tileZ(h.r) - P.pos.z);
    if (d < bd) { bd = d; best = h; }
  }
  return best;
}
export function enterHide(h) {
  P.hidden = { ...h, from: P.pos.clone(), fromYaw: P.yaw };
  // which way out? face that way
  const ex = h.exits.reduce((a, e) => { const d = Math.hypot(tileX(h.c + e[0]) - P.pos.x, tileZ(h.r + e[1]) - P.pos.z); return d < a.d ? { e, d } : a; }, { e: h.exits[0], d: 1e9 }).e;
  P.hidden.exit = ex;
  P.hidden.yaw0 = Math.atan2(-ex[0], -ex[1]);
  P.yaw = P.hidden.yaw0; P.pitch = 0;
  P.pos.set(tileX(h.c) + ex[0] * (h.type === 'desk' ? 0.1 : 0.15), P.L * FLOOR_H, tileZ(h.r) + ex[1] * (h.type === 'desk' ? 0.1 : 0.15));
  P.hideT = 0; P.breathT = 0; P.crouch = false;
  if (P.light && h.type === 'cabinet') P.light = false;
  sfx(h.type === 'cabinet' ? 'creak' : 'step', null, 0.5); noise(2.5);
  document.body.dataset.hide = h.type;
}
export function exitHide() {
  const h = P.hidden; if (!h) return;
  P.pos.set(tileX(h.c + h.exit[0]), P.L * FLOOR_H, tileZ(h.r + h.exit[1]));
  P.hidden = null; delete document.body.dataset.hide;
  sfx('step', null, 0.4);
}
function updateHidden(dt) {
  const h = P.hidden;
  P.hideT += dt;
  // only look around a little while hiding
  let d = P.yaw - h.yaw0; d = Math.atan2(Math.sin(d), Math.cos(d));
  P.yaw = h.yaw0 + Math.max(-1, Math.min(1, d));
  P.pitch = Math.max(-0.5, Math.min(0.5, P.pitch));
  // after 20 seconds you start breathing loudly
  if (P.hideT > 20) {
    P.breathT -= dt;
    if (P.breathT <= 0) { P.breathT = 3.3; say('kid_breathe', null, 0.9, { sub: P.hideT < 24 }); noise(9); }
  }
}
export const tileOfPlayer = () => ({ c: toC(P.pos.x), r: toR(P.pos.z) });
export { at };
