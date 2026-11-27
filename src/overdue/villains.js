// The villains' brains.
import * as THREE from 'three';
import { C } from './core.js';
import { T, FLOOR_H, W, H, at, toC, toR, tileX, tileZ, los, findPath, nodeOf, nodeWorld, OPEN, STAIRS, stairAt, hallAt, findTile, levelOfY, ATRIUM, canStand } from './map.js';
import { makePages, makeWorm, makeBats, animBats, makeBookmark } from './models.js';
import { P, noise } from './player.js';
import { say, sfx } from './audio.js';

export const V = { pages: null, worm: null, bats: null, marks: [] };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const playerLevel = () => (P.pos.y > FLOOR_H / 2 ? 1 : 0);
const plTile = () => nodeOf(P.pos.x, P.pos.z, P.pos.y);

export function buildVillains() {
  const pg = makePages(); C.scene.add(pg.root);
  V.pages = { m: pg, pos: new THREE.Vector3(), yaw: 0, state: 'statue', path: null, pathT: 0, stepD: 0, timer: 0, laughT: 10, lastSeen: null, seenAgo: 99, hide: null, unseenT: 0, mouth: 0 };
  const w = makeWorm(); C.scene.add(w.root); V.worm = { m: w, awake: false, hallT: 0, cool: 0, attack: null, tauntT: 30 };
  const b = makeBats(); C.scene.add(b.root); V.bats = { m: b, awake: false, state: 'sleep', pos: new THREE.Vector3(), lightT: 0, lostT: 0, flapT: 0, talkT: 0, said: false };
  const cols = [0x8a1020, 0x3a1a6a, 0x1a5a3a];
  for (let i = 0; i < 3; i++) { const m = makeBookmark(cols[i]); C.scene.add(m.root); V.marks.push({ m, pos: new THREE.Vector3(), yaw: 0, state: 'off', path: null, pathT: 0, senseT: 0, stun: 0, moanT: rand(8, 20), t: Math.random() * 10 }); }
}

export function resetVillains(G) {
  const pg = V.pages, p = findTile('P');
  pg.pos.set(tileX(p.c), 0.58, tileZ(p.r));
  pg.yaw = -Math.PI / 2; // facing the storytime corner, where you wake up
  pg.state = 'statue'; pg.path = null; pg.unseenT = 0; pg.timer = 0; pg.seenAgo = 99; pg.hide = null; pg.laughT = rand(10, 18);
  pg.mouth = 0; pg.stepD = 0; pg.saidCheck = false; pg.leaving = false;
  pg.m.setCreepy(false); pg.m.root.visible = true; place(pg);
  const w = V.worm; w.awake = false; w.hallT = 0; w.cool = 0; w.attack = null; w.m.root.visible = false;
  const b = V.bats; b.awake = false; b.state = 'sleep'; b.m.root.visible = false; b.lightT = 0; b.said = false;
  b.roost = new THREE.Vector3(tileX(pick([6, 10, 14, 17])), FLOOR_H * 2 - 0.6, tileZ(pick([9, 10, 11]))); b.pos.copy(b.roost);
  V.marks.forEach(m => { m.state = 'off'; m.m.root.visible = false; });
}

function place(v) { v.m.root.position.copy(v.pos); v.m.root.rotation.y = v.yaw; }

// walk along a path of tiles
function follow(v, dt, speed, noStairs) {
  if (!v.path || !v.path.length) return true;
  const n = v.path[0], w = nodeWorld(n);
  const dx = w.x - v.pos.x, dz = w.z - v.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.25) { v.path.shift(); return !v.path.length; }
  const s = Math.min(d, speed * dt);
  v.pos.x += dx / d * s; v.pos.z += dz / d * s;
  // height: stairs ramp, otherwise the floor of the level
  const st = stairAt(toC(v.pos.x), toR(v.pos.z));
  if (st) { const zTop = st.top * T, zBot = (st.bot + 1) * T; v.pos.y = Math.min(1, Math.max(0, (zBot - v.pos.z) / (zBot - zTop))) * FLOOR_H; }
  else if (n.L !== 2) v.pos.y += (n.L * FLOOR_H - v.pos.y) * Math.min(1, dt * 10);
  const want = Math.atan2(dx, dz);
  v.yaw += angDiff(want, v.yaw) * Math.min(1, dt * 6);
  return false;
}
function pathTo(v, target, noStairs) {
  const from = nodeOf(v.pos.x, v.pos.z, v.pos.y);
  v.path = findPath(from, target, noStairs);
  return !!v.path;
}
// the bottom of the nearest staircase (for Mr. Pages when you are upstairs)
function stairBase(x, z) {
  let best = null, bd = 1e9;
  for (const s of STAIRS) { const d = Math.hypot(tileX(s.c) - x, tileZ(s.bot + 1) - z); if (d < bd) { bd = d; best = { L: 0, c: s.c, r: s.bot + 1 }; } }
  return best;
}

// can Mr. Pages see you?
function pagesSees(pg, G) {
  if (P.hidden) return false;
  if (playerLevel() !== 0) return false;
  const dx = P.pos.x - pg.pos.x, dz = P.pos.z - pg.pos.z, d = Math.hypot(dx, dz);
  const eyeLevel = P.crouch ? 0.9 : 1.5;
  if (!los(0, pg.pos.x, pg.pos.z, P.pos.x, P.pos.z)) return false;
  if (P.light && d < 20) return true;                       // he sees your flashlight from anywhere
  const range = (P.crouch ? 7 : 12) * G.D.sight;
  if (d > range) return false;
  if (d < 1.6) return true;
  return Math.abs(angDiff(Math.atan2(dx, dz), pg.yaw)) < 1.05 && eyeLevel > 0;
}
// can YOU see Mr. Pages? (used to keep him frozen on his podium)
const _v = new THREE.Vector3(), _f = new THREE.Vector3();
export function playerSees(pos, h = 1.4) {
  if (playerLevel() !== 0 && !stairAt(toC(P.pos.x), toR(P.pos.z))) return false;
  _v.set(pos.x, pos.y + h, pos.z).sub(C.camera.position);
  const d = _v.length(); _v.normalize();
  C.camera.getWorldDirection(_f);
  if (_v.dot(_f) < Math.cos(THREE.MathUtils.degToRad(C.camera.fov * 0.62))) return false;
  return los(0, P.pos.x, P.pos.z, pos.x, pos.z) && d < 40;
}

// ================= MR. PAGES =================
function updatePages(dt, G) {
  const pg = V.pages, D = G.D;
  pg.seenAgo += dt;
  pg.mouth = Math.max(0, pg.mouth - dt * 1.5);
  if (pg.state === 'statue') {
    pg.m.animate(dt, 0, C.t, 0); place(pg);
    if (!G.introDone) return;
    // he only moves when you look away...
    if (playerSees(pg.pos)) { pg.unseenT = 0; pg.timer += dt; if (pg.timer > 25 && !pg.leaving) { pg.leaving = true; G.blackout(0.4, () => leavePodium(pg)); } }
    else { pg.unseenT += dt; if (pg.unseenT > 0.25) leavePodium(pg); }
    return;
  }
  // listening
  for (const n of P.noises) {
    const d = Math.hypot(n.x - pg.pos.x, n.z - pg.pos.z) + Math.abs(n.y - pg.pos.y) * 0.5;
    if (d < n.r * D.hear && pg.state !== 'chase' && pg.state !== 'check') {
      const L = levelOfY(n.y);
      const target = L === 0 && !stairAt(toC(n.x), toR(n.z)) ? { L: 0, c: toC(n.x), r: toR(n.z) } : stairBase(n.x, n.z);
      if (pathTo(pg, target, true)) { pg.state = 'investigate'; pg.timer = 0; }
    }
  }
  const sees = pagesSees(pg, G);
  if (sees) {
    if (pg.state !== 'chase' && pg.state !== 'check') { say('pages_spot', pg.pos.clone().setY(2), 1.2); setTimeout(() => say('kid_gasp', null, 0.8, { sub: false }), 250); pg.mouth = 1; G.scare(0.5); }
    pg.state = pg.state === 'check' ? 'check' : 'chase';
    pg.lastSeen = P.pos.clone(); pg.seenAgo = 0;
  }
  // you hid while he was watching? He saw where you went.
  if (P.hidden && pg.seenAgo < 0.6 && pg.state === 'chase') {
    pg.state = 'check'; pg.hide = P.hidden;
    pathTo(pg, { L: 0, c: P.hidden.c + P.hidden.exit[0], r: P.hidden.r + P.hidden.exit[1] }, true);
  }
  let speed = D.patrol;
  switch (pg.state) {
    case 'patrol':
      if (!pg.path || !pg.path.length) pathTo(pg, pick(OPEN[0].filter(t => !stairAt(t.c, t.r))), true);
      follow(pg, dt, speed, true);
      pg.laughT -= dt; if (pg.laughT <= 0) { say(pick(['pages_laugh1', 'pages_laugh2', 'pages_laugh3']), pg.pos.clone().setY(2), 1.1); pg.laughT = rand(14, 26); }
      break;
    case 'investigate':
      speed = D.patrol * 1.3;
      if (follow(pg, dt, speed, true)) { pg.timer += dt; pg.yaw += dt * 1.2; if (pg.timer > 3) { pg.state = 'patrol'; pg.path = null; } }
      break;
    case 'chase': {
      speed = D.chase;
      pg.pathT -= dt;
      const pl = plTile();
      const reachable = pl.L === 0;
      if (pg.pathT <= 0) { pg.pathT = 0.35; pathTo(pg, reachable ? pl : stairBase(P.pos.x, P.pos.z), true); }
      const done = follow(pg, dt, speed, true);
      if (!reachable && done) { pg.state = 'wait'; pg.timer = 0; say('pages_laugh3', pg.pos.clone().setY(2), 1.2); }
      if (reachable && done && pg.seenAgo < 0.5) { const dx = P.pos.x - pg.pos.x, dz = P.pos.z - pg.pos.z, d = Math.hypot(dx, dz); if (d > 0.01) { const s = Math.min(d, speed * dt); pg.pos.x += dx / d * s; pg.pos.z += dz / d * s; pg.yaw = Math.atan2(dx, dz); } }
      if (pg.seenAgo > 3.2) { pg.state = 'search'; pathTo(pg, nodeOf(pg.lastSeen.x, pg.lastSeen.z, 0), true); pg.timer = 0; }
      break;
    }
    case 'search':
      speed = D.patrol * 1.4;
      if (follow(pg, dt, speed, true)) { pg.timer += dt; pg.yaw += dt * 1.6; if (pg.timer > 3.5) { say('pages_lost', pg.pos.clone().setY(2), 1); pg.state = 'patrol'; pg.path = null; } }
      break;
    case 'wait': // you went upstairs, he can't follow
      pg.timer += dt; pg.yaw = Math.atan2(P.pos.x - pg.pos.x, P.pos.z - pg.pos.z);
      if (pg.timer > 5) { pg.state = 'patrol'; pg.path = null; }
      break;
    case 'check': {
      speed = D.chase;
      const done = follow(pg, dt, speed, true);
      if (done && pg.hide) {
        pg.yaw += angDiff(Math.atan2(tileX(pg.hide.c) - pg.pos.x, tileZ(pg.hide.r) - pg.pos.z), pg.yaw) * Math.min(1, dt * 8);
        pg.timer += dt;
        if (pg.timer > 0.3 && !pg.saidCheck) { pg.saidCheck = true; say('pages_check', pg.pos.clone().setY(2), 1.2); }
        if (pg.timer > 1.3) { pg.saidCheck = false; if (P.hidden && P.hidden.c === pg.hide.c && P.hidden.r === pg.hide.r) G.caught('pages'); else { pg.state = 'search'; pg.timer = 0; pg.path = null; } }
      } else pg.timer = 0;
      break;
    }
  }
  // stomp stomp
  const moved = speed * dt;
  pg.stepD += moved;
  if (pg.stepD > 1.0 && pg.path && pg.path.length) {
    pg.stepD = 0; sfx('stomp', pg.pos.clone().setY(0.3), 1.6);
    const d = pg.pos.distanceTo(P.pos); if (d < 10) P.camShake = Math.max(P.camShake, (10 - d) / 25);
  }
  pg.m.animate(dt, pg.path && pg.path.length ? speed : 0, C.t, pg.mouth + (pg.state === 'chase' ? 0.3 : 0));
  place(pg);
  // caught!
  if (!P.hidden && playerLevel() === 0 && Math.hypot(P.pos.x - pg.pos.x, P.pos.z - pg.pos.z) < 1.05 && pg.state !== 'wait') G.caught('pages');
}
function leavePodium(pg) {
  if (pg.state !== 'statue') return;
  // vanish to a spot you can't see, not too close
  const spots = OPEN[0].filter(t => { const x = tileX(t.c), z = tileZ(t.r); const d = Math.hypot(x - P.pos.x, z - P.pos.z); return d > 9 && d < 22 && !los(0, P.pos.x, P.pos.z, x, z) && !stairAt(t.c, t.r); });
  const s = pick(spots.length ? spots : OPEN[0]);
  pg.pos.set(tileX(s.c), 0, tileZ(s.r)); pg.state = 'patrol'; pg.path = null;
  pg.m.setCreepy(true);
  sfx('stomp', pg.pos.clone(), 1.3);
}

// ================= THE BOOKWORM =================
function updateWorm(dt, G) {
  const w = V.worm, D = G.D;
  if (!w.awake) return;
  w.cool -= dt;
  const L = playerLevel();
  const hall = P.hidden ? null : hallAt(L, toC(P.pos.x), toR(P.pos.z));
  if (hall && !w.attack) w.hallT += dt; else w.hallT = Math.max(0, w.hallT - dt * 0.5);
  // stay in a hallway too long... no warning!
  if (!w.attack && hall && w.hallT > D.wormDelay && w.cool <= 0) startWormAttack(hall, D.wormPasses);
  // taunts from far away, sometimes
  w.tauntT -= dt;
  if (w.tauntT <= 0 && !hall && !w.attack) { w.tauntT = rand(25, 45); const s = pick(OPEN[L]); say(pick(['worm_taunt1', 'worm_taunt2', 'worm_taunt3']), { x: tileX(s.c), y: L * FLOOR_H + 1.5, z: tileZ(s.r) }, 0.9); }
  const a = w.attack;
  if (!a) return;
  a.t += dt;
  if (a.t < 0) { w.m.root.visible = false; return; }
  const hl = a.hall, y = hl.L * FLOOR_H + 1.5;
  const axisLen = a.to - a.from;
  const headS = a.from + Math.sign(axisLen) * a.t * 21;
  const done = Math.sign(axisLen) > 0 ? headS > a.to + 6 : headS < a.to - 6;
  w.m.root.visible = true;
  w.m.segs.forEach((sg, i) => {
    const s = headS - Math.sign(axisLen) * i * w.m.spacing;
    const wob = Math.sin(C.t * 30 + i) * 0.06;
    if (hl.axis === 'x') sg.position.set(s, y + wob, tileZ(hl.fixed)); else sg.position.set(tileX(hl.fixed), y + wob, s);
  });
  w.m.wiggle(C.t);
  w.m.head.rotation.y = hl.axis === 'x' ? (axisLen > 0 ? Math.PI / 2 : -Math.PI / 2) : (axisLen > 0 ? 0 : Math.PI);
  if (!a.sounded) { a.sounded = true; say('worm_rush', w.m.head.position.clone(), 1.4, { sub: true }); sfx('whoosh', w.m.head.position.clone(), 1.2); }
  // did it hit you? only if you're standing up in its hallway
  if (!P.hidden && playerLevel() === hl.L && !P.crouch && !P.tripped) {
    const along = hl.axis === 'x' ? P.pos.x : P.pos.z, across = hl.axis === 'x' ? P.pos.z - tileZ(hl.fixed) : P.pos.x - tileX(hl.fixed);
    if (Math.abs(across) < 0.95 && Math.abs(along - headS) < 0.6) { G.caught('worm'); return; }
  }
  if (done) {
    a.passes--;
    if (a.passes <= 0) { w.attack = null; w.m.root.visible = false; w.hallT = 0; w.cool = 6; }
    else { const f = a.from; a.from = a.to; a.to = f; a.t = -0.9; a.sounded = false; }
  }
}
function startWormAttack(hall, passes) {
  const ax = hall.axis === 'x';
  const lo = (ax ? tileX(hall.a) : tileZ(hall.a)) - T / 2 - 2, hi = (ax ? tileX(hall.b) : tileZ(hall.b)) + T / 2 + 2;
  const along = ax ? P.pos.x : P.pos.z;
  // come from the end that's further away
  const fromLo = Math.abs(along - lo) > Math.abs(along - hi);
  V.worm.attack = { hall, from: fromLo ? lo : hi, to: fromLo ? hi : lo, t: 0, passes, sounded: false };
}

// ================= THE BOOK BATS =================
function updateBats(dt, G) {
  const b = V.bats, D = G.D;
  if (!b.awake) return;
  b.m.root.visible = true;
  const L = playerLevel();
  const head = new THREE.Vector3(P.pos.x, P.pos.y + P.eye, P.pos.z);
  if (P.light && !P.hidden) { b.lightT += dt; b.lostT = 0; } else { b.lightT = Math.max(0, b.lightT - dt * 0.5); b.lostT += dt; }
  if (b.state === 'roost' && b.lightT > 1.6) {
    b.state = 'hunt'; say(b.said ? pick(['bats_chatter1', 'bats_chatter2', 'bats_chatter3']) : 'bats_whisper', b.pos.clone(), 1.2); b.said = true;
  }
  if (b.state === 'hunt' && (b.lostT > 2.2 || P.hidden)) { b.state = 'return'; }
  let target = b.roost, speed = D.bats;
  if (b.state === 'hunt') {
    const bl = b.pos.y > FLOOR_H - 0.2 ? 1 : 0;
    if (bl !== L) { // fly through the big hole in the floor to change level
      const a = ATRIUM.reduce((best, t) => { const d = Math.hypot(tileX(t.c) - b.pos.x, tileZ(t.r) - b.pos.z); return d < best.d ? { t, d } : best; }, { t: ATRIUM[0], d: 1e9 }).t;
      const ax = tileX(a.c), az = tileZ(a.r);
      target = Math.hypot(ax - b.pos.x, az - b.pos.z) > 0.8 ? new THREE.Vector3(ax, b.pos.y, az) : new THREE.Vector3(ax, L * FLOOR_H + 3.6, az);
    } else {
      const flat = Math.hypot(head.x - b.pos.x, head.z - b.pos.z);
      target = flat > 3.5 ? new THREE.Vector3(head.x, L * FLOOR_H + 3.6, head.z) : head;
    }
    b.talkT -= dt; if (b.talkT <= 0) { b.talkT = rand(6, 10); say(pick(['bats_chatter1', 'bats_chatter2', 'bats_chatter3']), b.pos.clone(), 1); }
  } else if (b.state === 'return') {
    speed = D.bats * 0.6;
    const bl = b.pos.y > FLOOR_H - 0.2 ? 1 : 0;
    if (bl === 0 && Math.hypot(b.roost.x - b.pos.x, b.roost.z - b.pos.z) > 1) target = new THREE.Vector3(b.roost.x, Math.min(b.pos.y + 1, 3.6), b.roost.z);
    if (b.pos.distanceTo(b.roost) < 0.5) b.state = 'roost';
    if (P.light && b.lightT > 1.6) b.state = 'hunt';
  }
  if (b.state !== 'roost') {
    const d = target.clone().sub(b.pos); const len = d.length();
    // don't fly through walls
    const step = d.multiplyScalar(Math.min(1, speed * dt / Math.max(len, 0.001)));
    const nx = b.pos.x + step.x, nz = b.pos.z + step.z;
    const lvl = b.pos.y > FLOOR_H ? 1 : 0;
    if (at(lvl, toC(nx), toR(b.pos.z)) !== '#') b.pos.x = nx;
    if (at(lvl, toC(b.pos.x), toR(nz)) !== '#') b.pos.z = nz;
    b.pos.y += step.y;
    b.flapT -= dt; if (b.flapT <= 0) { b.flapT = 0.25; sfx('flap', b.pos.clone(), 0.9); }
  }
  animBats(b.m, dt, C.t, b.pos, b.state === 'roost' ? 0.6 : 1);
  if (b.state === 'hunt' && !P.hidden && b.pos.distanceTo(head) < 0.85) G.caught('bats');
}

// ================= THE BOOKMARKS =================
function updateMarks(dt, G) {
  const D = G.D, L = playerLevel();
  for (const m of V.marks) {
    if (m.state === 'off') continue;
    m.m.root.visible = true;
    m.t += dt;
    const ml = levelOfY(m.pos.y + 0.1);
    const d = Math.hypot(P.pos.x - m.pos.x, P.pos.z - m.pos.z);
    // sensing you: see you nearby, or feel your footsteps
    let senses = !P.hidden && ml === L && d < 7 && los(L, m.pos.x, m.pos.z, P.pos.x, P.pos.z);
    for (const n of P.noises) if (Math.hypot(n.x - m.pos.x, n.z - m.pos.z) < Math.min(10, n.r * 1.2) && !P.hidden) senses = true;
    if (m.stun > 0) { m.stun -= dt; senses = false; }
    if (senses) { if (m.state !== 'chase') { say('marks_whisper', m.pos.clone(), 1); } m.state = 'chase'; m.senseT = 0; }
    else m.senseT += dt;
    if (m.state === 'chase' && (m.senseT > 4 || P.hidden)) { m.state = 'wander'; m.path = null; }
    let speed = D.marks * 0.55;
    if (m.state === 'chase') {
      speed = D.marks;
      m.pathT -= dt; if (m.pathT <= 0) { m.pathT = 0.4; pathTo(m, plTile(), false); }
      if (follow(m, dt, speed, false) && d > 0.01 && ml === L) { const s = Math.min(d, speed * dt); m.pos.x += (P.pos.x - m.pos.x) / d * s; m.pos.z += (P.pos.z - m.pos.z) / d * s; m.yaw = Math.atan2(P.pos.x - m.pos.x, P.pos.z - m.pos.z); }
      if (d < 0.75 && ml === L && !P.hidden && !P.tripped && m.stun <= 0) G.trip(m);
    } else {
      if (!m.path || !m.path.length) { const lv = Math.random() < 0.5 ? 0 : 1; pathTo(m, pick(OPEN[lv]), false); }
      follow(m, dt, speed, false);
      m.moanT -= dt; if (m.moanT <= 0) { m.moanT = rand(18, 32); if (d < 18) say(pick(['marks_moan1', 'marks_moan2', 'marks_moan3']), m.pos.clone(), 1); }
    }
    if (Math.random() < dt * 0.6 && d < 8) sfx('slither', m.pos.clone(), 0.6);
    m.m.animate(m.t, speed / 3, m.state === 'chase' ? Math.min(1, Math.max(0, (4 - d) / 3)) : 0);
    m.m.root.position.set(m.pos.x, m.pos.y + 0.01, m.pos.z);
    m.m.root.rotation.y = m.yaw + Math.PI;
  }
}

export function wake(name, G) {
  if (name === 'worm') { V.worm.awake = true; V.worm.tauntT = rand(4, 10); }
  if (name === 'bats') { const b = V.bats; b.awake = true; b.state = 'roost'; b.pos.copy(b.roost); }
  if (name === 'marks') {
    V.marks.slice(0, G.D.marks_n).forEach((m, i) => {
      const far = OPEN[i % 2].filter(t => Math.hypot(tileX(t.c) - P.pos.x, tileZ(t.r) - P.pos.z) > 14);
      const s = pick(far.length ? far : OPEN[i % 2]);
      m.pos.set(tileX(s.c), s.L * FLOOR_H, tileZ(s.r)); m.state = 'wander'; m.path = null; m.stun = 0;
    });
  }
}

export function updateVillains(dt, G) {
  updatePages(dt, G);
  if (G.over) return;
  updateWorm(dt, G);
  if (G.over) return;
  updateBats(dt, G);
  if (G.over) return;
  updateMarks(dt, G);
  P.noises.length = 0;
  // how scared should you feel?
  let fear = 0, rustle = 0;
  const pg = V.pages;
  if (pg.state !== 'statue') {
    const d = pg.pos.distanceTo(P.pos);
    fear = Math.max(fear, pg.state === 'chase' ? 1 : Math.max(0, 1 - d / 14));
    rustle = Math.max(rustle, Math.max(0, 1 - d / 9));
  }
  if (V.bats.state === 'hunt') fear = Math.max(fear, Math.max(0.35, 1 - V.bats.pos.distanceTo(P.pos) / 10));
  for (const m of V.marks) if (m.state === 'chase') fear = Math.max(fear, 0.7);
  if (V.worm.attack) fear = 1;
  G.fear += (fear - G.fear) * Math.min(1, dt * 2);
  G.rustle = rustle;
}

// put a villain right in your face (for the jump scare)
export function scareModel(who) {
  if (who === 'pages') return V.pages.m.root;
  if (who === 'worm') return V.worm.m.root;
  if (who === 'bats') return V.bats.m.root;
  return V.marks[0].m.root;
}
