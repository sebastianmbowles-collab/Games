import { THREE, toScreen, makeComposer, shadows } from './engine.js';
import { G, isTouch, rnd, clamp, lerp, pick, damp, smooth, angDiff, shuffle, writeSave, clearSave } from './state.js';
import { sfx, playMusic } from './audio.js';
import { TEX, updateCore } from './textures.js';
import * as MD from './models.js';
import { Particles, Debris } from './fx.js';
import { buildJungle, updateJungle } from './jungle.js';
import * as J from './models2.js';
import { MISSIONS, SCANS, UPGRADES, ENDING, CREDITS, PATCH_REPAIR, PATCH_LOW, PATCH_OD, CHATTER, CHATTER2, ENDING2, DIFFS } from './data.js';
import * as H from './hud.js';
import { PROG, saveProg, unlockBadge, unlockSkin, addScore, drawToast, tagSkin, applySkin, skinIsRainbow } from './progress.js';

const R = 15, ROOM_H = 9, DOOR_H = 7.5, DOOR_ANG = 0.36, PZ = 9, EYE = 2.6;
const UPV = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), sph = new THREE.Sphere();

let scene, camera, composer, arms, AP, patch, PP, fx, fxBig, debris, L = {};
let panels = [], covers = [], doorFrame, roof, outside, roomG;
let P, enemies = [], balls = [], shots = [], rings = [], hazards = [], boss = null;
let mi = 0, M = null, spawnList = [], spawnT = 0, phase = 'card', phaseT = 0, upgrades = [], scanned = new Set();
let scanBeam, scanTarget = null, scanT = 0, paused = false, pauseSel = 0, overSel = 0, upChoices = [], upSel = 0;
let menuRects = [], creditY = 0, wallBroken = false, kills = 0, chatT = 8, patchMsgT = 0, cam = { yaw: 0, pitch: 0 };
let aimNX = 0, aimNY = 0, flashT = 0, lightningT = 8, hitMarkT = 0;
let jungle, inJungle = false, rail = 0, props = [], scareT = 0, score = 0, nova = null;
const POINTS = { zippit: 100, voidfly: 120, bruteclaw: 400, riftstalker: 300, soldier: 120, bug: 150, plant: 120, swamp: 250, mutant: 200 };
const MISSION_SKIN = ['bronze', 'silver', 'camo', 'redblack', 'gold', 'rainbow', 'diamond'];
const MOON_COLORS = [0x5af0ff, 0x6aff7a, 0xffd84a, 0xff9a3a, 0xff6ad8, 0xb07aff, 0xffffff, 0xffffff];
const has = id => upgrades.includes(id);

// ===== Building the abandoned UFO =====
export function buildGame() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0214);
  scene.fog = new THREE.Fog(0x1c0832, 26, 150);
  camera = new THREE.PerspectiveCamera(70, 1, 0.05, 600);
  camera.userData.baseFov = 70;
  camera.rotation.order = 'YXZ';
  G.cameras.push(camera);
  scene.add(camera);
  scene.environment = G.envMap;
  scene.environmentIntensity = 0.3;
  (G.scenes ||= []).push(scene);
  composer = makeComposer(scene, camera, 0.6);
  buildRoom();
  buildOutside();
  buildLights();
  jungle = buildJungle(scene);
  jungle.cart.position.z = PZ;

  arms = MD.makeFPArms(); AP = arms.userData.parts; camera.add(arms);
  tagSkin(arms);
  patch = MD.makePatch(); PP = patch.userData.parts; camera.add(patch);
  patch.position.set(-1.7, 0.9, -3.2); patch.scale.setScalar(0.5);
  scanBeam = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), MD.addGlow(0x33bbff, 0.55), 0, 0, 0, scene);
  scanBeam.visible = false;

  fx = new Particles(scene, 1400, 0.22);
  fxBig = new Particles(scene, 500, 0.9);
  debris = new Debris(scene, 70);
}

function buildRoom() {
  roomG = MD.group(0, 0, 0, scene);
  const wall1 = MD.phong(0x4a5474, { map: TEX.panel, shininess: 80 }), wall2 = MD.phong(0x3a4262, { map: TEX.panel, shininess: 80 });
  const glyph = new THREE.MeshBasicMaterial({ map: TEX.glyph }), rib = MD.phong(0x23293a, { shininess: 90 });
  const lamp = MD.glow(0x9fe8ff), lampDead = MD.glow(0x1a2030), lampRed = MD.glow(0xff3030);
  const N = 24, pw = 2 * R * Math.sin(Math.PI / N) + 0.06;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, d = angDiff(a, -Math.PI / 2);
    const grp = MD.group(Math.cos(a) * R, 0, Math.sin(a) * R, roomG);
    grp.lookAt(0, 0, 0);
    const isDoor = Math.abs(d) < DOOR_ANG;
    if (isDoor) {
      MD.mesh(new THREE.PlaneGeometry(pw, ROOM_H - DOOR_H), wall2, 0, (ROOM_H + DOOR_H) / 2, 0, grp);
    } else {
      MD.mesh(new THREE.PlaneGeometry(pw, ROOM_H), i % 2 ? wall1 : wall2, 0, ROOM_H / 2, 0, grp);
      if (i % 3 === 0) MD.mesh(new THREE.PlaneGeometry(pw * 0.8, 0.5), glyph, 0, 3.2, 0.03, grp);
      const lk = i % 5 === 2 ? lampDead : i % 7 === 3 ? lampRed : lamp;
      MD.box(1.4, 0.3, 0.2, lk, 0, 7.6, 0.1, grp);
      if (i % 4 === 1) { MD.box(1.8, 1.2, 0.5, MD.phong(0x30384c), 0, 1.2, 0.25, grp); MD.box(1.2, 0.5, 0.05, MD.glow(pick([0x39ff6a, 0x33bbff, 0xff9a2a])), 0, 1.4, 0.52, grp); }
    }
    MD.box(0.35, ROOM_H, 0.45, rib, pw / 2, ROOM_H / 2, 0.15, grp);
    panels.push({ grp, a, near: Math.abs(d) < 1.3, isDoor, pos: grp.position.clone(), rot: grp.rotation.clone(), fly: null });
  }
  const floor = MD.mesh(new THREE.CircleGeometry(R + 0.6, 24), MD.phong(0x8a93a8, { map: TEX.floor, shininess: 30 }), 0, 0, 0, roomG);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  for (const [r, c] of [[4.5, 0x2a9dff], [9, 0x39ff6a]]) {
    const ring = MD.mesh(new THREE.RingGeometry(r, r + 0.12, 32), MD.glow(c), 0, 0.02, 0, roomG);
    ring.rotation.x = -Math.PI / 2;
  }
  // the crater UNIT-07's legs are jammed into
  const crater = MD.mesh(new THREE.RingGeometry(0.6, 1.6, 10), MD.lam(0x2a2f3a, { side: THREE.DoubleSide }), 0, 0.03, PZ, roomG);
  crater.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, s = MD.box(rnd(0.6, 1.1), 0.18, rnd(0.4, 0.8), MD.phong(0x5a6478), Math.cos(a) * 1.3, 0.12, PZ + Math.sin(a) * 1.3, roomG);
    s.rotation.set(rnd(-0.5, 0.5), a, rnd(-0.4, 0.4));
  }
  roof = MD.group(0, 0, 0, roomG);
  const dome = MD.mesh(new THREE.SphereGeometry(R + 0.3, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2), MD.phong(0x2e3448, { side: THREE.BackSide, map: TEX.panel }), 0, ROOM_H, 0, roof);
  dome.scale.y = 0.32;
  const light = MD.cyl(2.2, 2.2, 0.3, MD.glow(0xbff4ff), 0, ROOM_H + 4.3, 0, roof, 16);
  light.userData.k = 1;
  MD.mesh(new THREE.TorusGeometry(5.5, 0.15, 4, 32), MD.glow(0x7f5aff), 0, ROOM_H + 3.2, 0, roof).rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) {
    const c = MD.cyl(0.05, 0.05, rnd(2, 5), MD.phong(0x15181f), rnd(-10, 10), 0, rnd(-9, 6), roof, 4);
    c.position.y = ROOM_H + 2 - c.geometry.parameters.height / 2;
  }
  // door frame with hazard stripes
  doorFrame = MD.group(0, 0, 0, roomG);
  const hz = MD.phong(0xffffff, { map: TEX.hazard }), dz = -R * Math.cos(DOOR_ANG) + 0.2, dx = R * Math.sin(DOOR_ANG);
  for (const s of [-1, 1]) {
    MD.box(0.9, DOOR_H, 1.2, hz, s * dx, DOOR_H / 2, dz, doorFrame);
    MD.box(0.15, DOOR_H - 0.4, 0.15, MD.glow(0xff7a00), s * (dx - 0.5), DOOR_H / 2, dz + 0.62, doorFrame);
  }
  MD.box(dx * 2 + 0.9, 0.7, 1.2, hz, 0, DOOR_H, dz, doorFrame);
  L.doorStrip = MD.box(dx * 2 - 1, 0.12, 0.12, MD.glow(0xff3020), 0, DOOR_H - 0.45, dz + 0.62, doorFrame);
  // the broken hatch lying on the floor
  const hatch = MD.box(5, 0.35, 6, MD.phong(0x48506a, { map: TEX.panel }), 6.5, 0.9, -9.5, roomG);
  hatch.rotation.set(0.15, 0.6, 0.25);
  shadows(hatch, true, true);
  // alien pods: cover for Riftstalkers
  const podM = MD.phong(0x3a2a6a, { shininess: 90 }), podG = MD.glow(0x39ff6a);
  for (const [x, z] of [[-7.5, -6.5], [7.8, -4.5], [-3.5, -10.5], [3.8, -0.5], [-6.2, 2.2], [0.5, -7]]) {
    const g = MD.group(x, 0, z, roomG);
    MD.cyl(0.95, 1.1, 1.9, podM, 0, 0.95, 0, g, 8);
    MD.cyl(0.7, 0.95, 0.4, podM, 0, 2.05, 0, g, 8);
    MD.box(0.5, 0.8, 0.1, podG, 0, 1.1, 1.0, g).lookAt(0, 1.1, PZ);
    shadows(g, true, true);
    covers.push({ x, z, used: false });
  }
  // consoles off to each side of UNIT-07
  for (const s of [-1, 1]) {
    const g = MD.group(s * 7.5, 0, 6.5, roomG);
    MD.box(1.8, 1.4, 1.0, MD.phong(0x30384c), 0, 0.7, 0, g);
    const scr = MD.box(1.5, 0.7, 0.05, new THREE.MeshBasicMaterial({ map: TEX.glyph }), 0, 1.25, 0.45, g);
    scr.rotation.x = -0.5;
    g.rotation.y = s * -0.5;
  }
}

function buildOutside() {
  outside = MD.group(0, 0, 0, scene);
  MD.mesh(new THREE.SphereGeometry(450, 24, 16), new THREE.MeshBasicMaterial({ map: TEX.sky, side: THREE.BackSide, fog: false }), 0, -30, 0, outside);
  MD.makeStars(outside);
  const gg = new THREE.PlaneGeometry(500, 500, 30, 30), pa = gg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); if (Math.hypot(x, y) > R + 4) pa.setZ(i, Math.random() * 1.5 + Math.max(0, Math.hypot(x, y) - 90) * 0.12); }
  gg.computeVertexNormals();
  MD.mesh(gg, MD.lam(0xb070d8, { map: TEX.ground }), 0, -0.05, 0, outside).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 14; i++) {
    const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), d = rnd(70, 180), h = rnd(15, 50);
    MD.cone(rnd(12, 30), h, MD.lam(pick([0x2a0f3c, 0x3a1450, 0x1f0a2e])), Math.cos(a) * d, h / 2 - 1, Math.sin(a) * d, outside, 5).rotation.y = rnd(0, 3);
  }
  for (let i = 0; i < 10; i++) {
    const r = rnd(2, 8);
    MD.rock(r, MD.lam(0x3aff6a, { emissive: 0x22d84a, emissiveIntensity: 0.8 }), rnd(-120, 120), rnd(30, 110), rnd(-120, -260), outside);
  }
  for (let i = 0; i < 6; i++) MD.box(rnd(2, 4), rnd(3, 7), rnd(2, 4), MD.lam(0x4a2a5a), rnd(-25, 25), 1.5, rnd(-25, -45), outside).rotation.set(rnd(-0.3, 0.3), rnd(0, 3), rnd(-0.3, 0.3));
  for (let i = 0; i < 4; i++) {
    const s = MD.glowSprite(0xff7a20, 8, 0); s.position.set(rnd(-60, 60), rnd(2, 15), rnd(-60, -160)); outside.add(s);
    s.userData.t = rnd(-4, 0);
  }
}

function buildLights() {
  scene.add(new THREE.AmbientLight(0x5a4a90, 0.55));
  L.hemi = new THREE.HemisphereLight(0x9a7aff, 0x140818, 0.7); scene.add(L.hemi);
  L.sun = new THREE.DirectionalLight(0xffe6ff, 1.2); L.sun.position.set(-5, 20, -30); scene.add(L.sun);
  // overhead light that casts the shadows inside the UFO
  L.key = new THREE.DirectionalLight(0xd8e4ff, 1.4); L.key.position.set(5, 22, 10); L.key.target.position.set(0, 0, -4);
  L.key.castShadow = true; L.key.shadow.mapSize.set(2048, 2048); L.key.shadow.bias = -0.0005; L.key.shadow.normalBias = 0.03;
  Object.assign(L.key.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  scene.add(L.key); scene.add(L.key.target);
  L.ceil = new THREE.PointLight(0x8ad0ff, 2.2, 30, 0); L.ceil.position.set(0, 8, 0); scene.add(L.ceil);
  L.door = new THREE.PointLight(0xc040ff, 4, 30, 0); L.door.position.set(0, 4, -18); scene.add(L.door);
  L.emer = new THREE.PointLight(0xff2a2a, 2.5, 20, 0); L.emer.position.set(-10, 6, -1); scene.add(L.emer);
  L.green = new THREE.PointLight(0x30ff90, 2.2, 16, 0); L.green.position.set(10, 3, 1); scene.add(L.green);
  L.cyan = new THREE.PointLight(0x30c0ff, 1.8, 16, 0); L.cyan.position.set(-8, 2, 6); scene.add(L.cyan);
  L.boss = new THREE.PointLight(0xff4af0, 0, 40, 0); L.boss.position.set(0, 6, -10); scene.add(L.boss);
  L.muzzle = new THREE.PointLight(0x55b8ff, 0, 9, 0); L.muzzle.position.set(0.5, -0.3, -3.5); camera.add(L.muzzle);
  L.fill = new THREE.PointLight(0x8fb0ff, 1.4, 6, 0); L.fill.position.set(0, 1, -0.5); camera.add(L.fill);
  // UNIT-07's headlamp for the night mission
  L.head = new THREE.SpotLight(0xfff0d0, 0, 70, 0.45, 0.5, 1); L.head.position.set(0.4, 0.2, 0); L.head.target.position.set(0, -1.2, -10);
  camera.add(L.head); camera.add(L.head.target);
}

// ===== Missions =====
export const Game = {
  start(i, o = {}) {
    if (o.fresh) { upgrades = []; scanned = new Set(); }
    if (o.upgrades) upgrades = o.upgrades.slice();
    score = o.fresh ? 0 : o.score || score;
    scanned = new Set();
    applySkin(G.time);
    G.hud.style.cursor = 'none';
    paused = false;
    startMission(i, o.skipCard);
  },
  update,
};

function resetPlayer() {
  P = {
    armor: 0, max: 100 + (has('plating') ? 30 : 0), x: 0, y: 0, vy: 0, air: false,
    dashT: 0, dashDur: 1, dashDir: 0, dashCD: 0, cool: 0, od: 0, odT: 0, repairCD: 0, repairAnim: 0,
    recoil: 0, hurtT: 0, invT: 0, cracks: [], dead: false, lowWarned: false, odSaid: false,
    block: false, arm: 100, weapon: 1, heat: 0, overheat: 0,
  };
  P.armor = P.max;
}
function clearAll() {
  for (const e of enemies) { scene.remove(e.g); if (e.laser) scene.remove(e.laser); }
  for (const b of balls) { scene.remove(b.mesh); scene.remove(b.glow); }
  for (const s of shots) removeShot(s);
  for (const r of rings) { scene.remove(r.wall); scene.remove(r.flat); }
  for (const h of hazards) if (h.mesh) scene.remove(h.mesh);
  if (boss) { scene.remove(boss.g); boss.extra?.forEach(m => scene.remove(m)); }
  for (const p of props) scene.remove(p);
  if (nova) { scene.remove(nova); nova = null; }
  for (const e of enemies) if (e.pool) scene.remove(e.pool);
  enemies = []; balls = []; shots = []; rings = []; hazards = []; boss = null; props = [];
  for (const c of covers) c.used = false;
  fx.clear(); fxBig.clear(); debris.clear();
  H.clearDialog(); H.clearWarn(); H.clearScan();
  scanBeam.visible = false; scanTarget = null;
}
function restoreWall() {
  for (const p of panels) { p.grp.position.copy(p.pos); p.grp.rotation.copy(p.rot); p.grp.visible = true; p.fly = null; }
  doorFrame.visible = true; wallBroken = false;
  roof.position.set(0, 0, 0); roof.rotation.set(0, 0, 0); roof.visible = true; roof.userData.fly = 0;
}
function setWorld() {
  const jg = M.chapter === 2, night = !!M.night;
  inJungle = jg; rail = jg ? M.rail || 7 : 0;
  roomG.visible = outside.visible = !jg; jungle.root.visible = jg;
  for (const k of ['ceil', 'door', 'emer', 'green', 'cyan']) L[k].visible = !jg;
  if (jg) {
    scene.fog.color.setHex(night ? 0x020806 : 0x0e3a2a); scene.fog.near = night ? 6 : 25; scene.fog.far = night ? 60 : 150;
    scene.background.setHex(night ? 0x010302 : 0x06241a);
    L.hemi.color.setHex(night ? 0x203048 : 0x9affc0); L.hemi.groundColor.setHex(0x0a1a08); L.hemi.intensity = night ? 0.2 : 1.0;
    L.key.color.setHex(night ? 0x6a7aff : 0xfff2d0); L.key.intensity = night ? 0.25 : 2.2;
    L.sun.intensity = night ? 0 : 0.6;
    L.head.intensity = night ? 140 : 0;
    jungle.sky.material.color.setHex(night ? 0x1a2626 : 0xffffff);
  } else {
    scene.fog.color.setHex(0x1c0832); scene.fog.near = 26; scene.fog.far = 150;
    scene.background.setHex(0x0a0214);
    L.hemi.color.setHex(0x9a7aff); L.hemi.groundColor.setHex(0x140818); L.hemi.intensity = 0.7;
    L.key.color.setHex(0xd8e4ff); L.key.intensity = 1.4; L.sun.intensity = 1.2; L.head.intensity = 0;
  }
}
const missionName = () => (M.chapter === 2 ? `CHAPTER 2 - MISSION ${mi - 6}: ${M.title}` : `MISSION ${mi + 1}: ${M.title}`);
function startMission(i, skipCard) {
  mi = i; M = MISSIONS[i];
  clearAll(); restoreWall(); resetPlayer();
  setWorld();
  spawnList = [];
  for (const [t, n] of Object.entries(M.spawns || {})) for (let k = 0; k < n; k++) spawnList.push(t);
  shuffle(spawnList);
  // the first few are always Zippits so you can warm up
  const firstZ = spawnList.indexOf('zippit');
  if (firstZ > 0) { spawnList.splice(firstZ, 1); spawnList.unshift('zippit'); }
  spawnT = 1.2; kills = 0; chatT = rnd(10, 16);
  phase = skipCard ? 'introStart' : 'card'; phaseT = 0;
  writeSave({ mission: i, upgrades, score });
  playMusic(skipCard ? M.music : null);
  cam.yaw = 0; cam.pitch = 0;
}
function beginIntro() {
  phase = 'intro'; phaseT = 0;
  playMusic(M.music);
  for (const [who, s] of M.intro) H.say(who, s);
  if (M.boss === 'vrax') spawnVrax();
  if (M.boss === 'emperor') spawnEmperor();
  if (M.boss === 'patient') spawnPatient();
}
function missionClear() {
  phase = 'clear'; phaseT = 0;
  if (MISSION_SKIN[mi]) unlockSkin(MISSION_SKIN[mi]);
  if (!P.tookHit) unlockBadge('nohit');
  score = addScore(1000 * (mi + 1), score);
  for (const [who, s] of M.outro) H.say(who, s);
  H.warn('MISSION COMPLETE', '#39ff6a', 2.5, true);
  sfx.select();
}

// ===== Main update =====
function update(dt) {
  const pr = G.pressed;
  if (pr.enter && (phase === 'intro' || phase === 'clear' || phase === 'ending' || H.dialogBusy())) H.skipLine();
  if (!paused && phase !== 'card' && phase !== 'upgrade' && phase !== 'over' && phase !== 'dead' && (pr.p || pr.escape || pr.pause)) { paused = true; pauseSel = 0; sfx.ui(); G.hud.style.cursor = 'default'; }
  else if (paused && (pr.p || pr.escape || pr.pause)) { paused = false; G.hud.style.cursor = 'none'; }

  if (!paused) {
    phaseT += dt;
    if (phase === 'card' && phaseT > 3.4) { phase = 'introStart'; }
    if (phase === 'introStart') beginIntro();
    if (phase !== 'card' && phase !== 'upgrade' && phase !== 'over' && phase !== 'credits') stepWorld(dt);
    H.updateDialog(dt);
  }
  updateCamera(dt);
  if (skinIsRainbow()) applySkin(G.time);
  composer.render();
  drawHUD(paused ? 0 : dt);
}

function stepWorld(dt) {
  if (phase !== 'dead' && phase !== 'ending') updatePlayer(dt);
  else if (phase === 'dead') { P.y = Math.max(-1.2, P.y - dt * 0.8); }
  // spawning
  if (phase === 'intro' && !H.dialogBusy() && (!boss || boss.ready)) { phase = 'fight'; phaseT = 0; }
  if (phase === 'fight' && !M.boss) {
    const alive = enemies.filter(e => !e.dead).length;
    if (spawnList.length && alive < M.maxAlive) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnEnemy(spawnList.shift()); spawnT = rnd(M.gap[0], M.gap[1]); }
    }
    if (!spawnList.length && !enemies.length) missionClear();
  }
  for (const e of enemies) updateEnemy(e, dt);
  enemies = enemies.filter(e => !e.removed);
  if (boss) updateBoss(dt);
  scene.updateMatrixWorld();
  for (const e of enemies) e.ws = worldSpheres(e.g, e.hit);
  if (boss) boss.ws = worldSpheres(boss.g, boss.hit);
  updateBalls(dt);
  updateShots(dt);
  updateRings(dt);
  updateHazards(dt);
  updateScan(dt);
  updatePatch(dt);
  updateRoom(dt);
  fx.update(dt); fxBig.update(dt); debris.update(dt);
  if (phase === 'fight' && !P.dead) {
    chatT -= dt;
    if (chatT <= 0 && !H.dialogBusy() && kills > 2) { chatT = rnd(9, 16); const [who, s] = pick(inJungle && Math.random() < 0.6 ? CHATTER2 : CHATTER); H.bark(who, s, 1.4); }
  }
  if (phase === 'clear' && phaseT > 3 && !H.dialogBusy()) {
    if (mi === 6 || mi >= MISSIONS.length - 1) startEnding();
    else openUpgrades();
  }
  if (phase === 'dead' && phaseT > 2.6) { phase = 'over'; overSel = 0; G.hud.style.cursor = 'default'; playMusic(null); }
  if (phase === 'ending') updateEnding(dt);
}

function worldSpheres(g, hit) {
  const s = g.scale.x;
  return hit.map(h => ({ c: g.localToWorld(new THREE.Vector3(h.x || 0, h.y, h.z || 0)), r: h.r * s, tag: h.tag }));
}

// ===== The player =====
function headPos(v = tmp3) { return v.set(P.x, EYE + P.y, PZ); }
function updatePlayer(dt) {
  const pr = G.pressed, od = P.odT > 0;
  aimNX = G.mouse.nx; aimNY = G.mouse.ny;
  const dl = pr.a || pr.arrowleft || pr.dashl, dr = pr.d || pr.arrowright || pr.dashr;
  if ((dl || dr) && P.dashT <= 0 && P.dashCD <= 0) {
    P.dashDir = dl ? -1 : 1; P.dashT = P.dashDur = od ? 0.6 : 0.8; P.dashCD = od ? 0.65 : 0.95;
    sfx.dash();
  }
  if (P.dashT > 0) {
    P.dashT -= dt;
    const e = 1 - P.dashT / P.dashDur;
    const f = e < 0.22 ? smooth(e / 0.22) : e > 0.7 ? 1 - smooth((e - 0.7) / 0.3) : 1;
    P.x = P.dashDir * 3.3 * f;
    if (P.dashT <= 0) P.x = 0;
    if (Math.random() < 0.6) fx.spawn(P.x - P.dashDir * 0.6, 0.6, PZ + 0.5, -P.dashDir * 4, 1, 0, 0x55c8ff, 0.3);
  }
  P.dashCD -= dt;
  if ((pr.space || pr.w || pr.arrowup || pr.jump) && !P.air) { P.vy = 9.5; P.air = true; sfx.jump(); }
  if (P.air) {
    P.vy -= 21 * dt; P.y += P.vy * dt;
    for (let k = 0; k < 2; k++) fx.spawn(P.x + rnd(-0.4, 0.4), P.y + 0.2, PZ + 0.4, rnd(-1, 1), -6, rnd(-1, 1), pick([0x55c8ff, 0xffffff]), 0.25);
    if (P.y <= 0) { P.y = 0; P.air = false; sfx.land(); G.shake = Math.max(G.shake, 0.15); }
  }
  if ((pr.shift || pr.e || pr.od) && P.od >= 100 && P.odT <= 0) {
    P.odT = 8 + (has('capacitor') ? 4 : 0); P.od = 0; P.odSaid = false;
    unlockBadge('overdrive');
    sfx.overdrive(); H.warn('OVERDRIVE!', '#7fd4ff', 1.2, true); H.bark('patch', pick(PATCH_OD), 1.2);
  }
  if (P.od >= 100 && !P.odSaid && P.odT <= 0) { P.odSaid = true; H.bark('patch', 'Overdrive is charged! Press {OD}!', 1.6); }
  if (P.odT > 0) P.odT -= dt;
  if (pr.q || pr.r || pr.repair) tryRepair();
  P.repairCD -= dt; P.hurtT -= dt; P.invT -= dt; patchMsgT -= dt; P.repairAnim -= dt;
  P.cool -= dt;
  P.block = (G.keys.s || G.keys.block) && P.arm > 0;
  if (has('laser')) {
    const was = P.weapon;
    if (G.pressed['1']) P.weapon = 1;
    if (G.pressed['2']) P.weapon = 2;
    if (G.pressed.wpn) P.weapon = 3 - P.weapon;
    if (P.weapon !== was) { P.switchT = 0.45; sfx.ui(); sfx.power(); }
  } else P.weapon = 1;
  const firing = G.mouse.down || G.keys.f || G.keys.j;
  P.overheat -= dt;
  if (P.weapon === 2) laser(dt, firing && !paused && phase !== 'clear' && P.overheat <= 0);
  else { laser(dt, false); if (firing && P.cool <= 0 && !paused && phase !== 'clear') fire(); }
}
function fire() {
  const od = P.odT > 0;
  P.cool = (od ? 0.08 : 0.17) * (has('rapid') ? 0.7 : 1);
  camera.updateMatrixWorld();
  ndc.set(aimNX, aimNY); raycaster.setFromCamera(ndc, camera);
  const ray = raycaster.ray;
  let best = 120, hitPt = null;
  const test = (c, r) => { sph.set(c, r); const p = ray.intersectSphere(sph, tmp); if (p) { const d = p.distanceTo(ray.origin); if (d < best) { best = d; hitPt = p.clone(); } } };
  for (const e of enemies) if (!e.dead && e.alpha > 0.5 && e.ws) for (const w of e.ws) test(w.c, w.r);
  if (boss && boss.ws) for (const w of boss.ws) test(w.c, w.r);
  for (const s of shots) if (s.shootable) test(s.pos, s.r + 0.3);
  const target = hitPt || ray.origin.clone().addScaledVector(ray.direction, 90);
  AP.muzzle.getWorldPosition(tmp2);
  const r = (od ? 0.32 : 0.2) * (has('big') ? 1.45 : 1), dmg = (od ? 2 : 1) * (has('heavy') ? 1.5 : 1);
  spawnBall(tmp2, target, r, dmg, od);
  if (has('twin')) {
    const side = tmp.subVectors(target, tmp2).cross(UPV).normalize().multiplyScalar(0.45);
    spawnBall(tmp2.clone().add(side), target.clone().add(side), r, dmg, od);
  }
  P.recoil = 1; L.muzzle.intensity = 5; L.muzzle.color.setHex(0x55b8ff);
  sfx.shoot(od);
  for (let k = 0; k < 5; k++) fx.spawn(tmp2.x, tmp2.y, tmp2.z, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), 0x8fd4ff, 0.15);
}
// ===== The plasma laser: a beam that melts whatever it touches =====
let beamOuter = null, beamInner = null, laserHumT = 0;
function laser(dt, on) {
  if (!beamOuter) {
    beamOuter = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), MD.addGlow(0xff8a20, 0.7), 0, 0, 0, scene);
    beamInner = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), MD.glow(0xfff4d0), 0, 0, 0, scene);
  }
  if (!on) {
    beamOuter.visible = beamInner.visible = false;
    P.heat = Math.max(0, P.heat - dt * 0.45);
    return;
  }
  const od = P.odT > 0, dps = (od ? 16 : 8) * (has('heavy') ? 1.5 : 1);
  P.heat += dt * 0.32;
  if (P.heat >= 1) { P.overheat = 1.6; P.heat = 0.65; sfx.hurt(); H.bark('patch', 'Laser overheated! Give it a second!', 1); }
  camera.updateMatrixWorld();
  ndc.set(aimNX, aimNY); raycaster.setFromCamera(ndc, camera);
  const ray = raycaster.ray;
  let best = 70, hit = null, what = null;
  const test = (c, r, obj) => { sph.set(c, r); const q = ray.intersectSphere(sph, tmp); if (q) { const d = q.distanceTo(ray.origin); if (d < best) { best = d; hit = q.clone(); what = obj; } } };
  for (const e of enemies) if (!e.dead && e.alpha > 0.5 && e.ws) for (const w of e.ws) test(w.c, w.r, e);
  if (boss && boss.ws) for (const w of boss.ws) test(w.c, w.r, boss);
  for (const sh of shots) if (sh.shootable) test(sh.pos, sh.r + 0.3, sh);
  const end = hit || ray.origin.clone().addScaledVector(ray.direction, 70);
  AP.muzzle.getWorldPosition(tmp2);
  const wob = 1 + Math.sin(G.time * 60) * 0.25;
  beamBetween(beamOuter, tmp2, end, (od ? 0.16 : 0.1) * wob);
  beamBetween(beamInner, tmp2, end, (od ? 0.06 : 0.035) * wob);
  beamOuter.visible = beamInner.visible = true;
  L.muzzle.intensity = 4; L.muzzle.color.setHex(0xff9a40);
  P.recoil = Math.max(P.recoil, 0.25);
  laserHumT -= dt;
  if (laserHumT <= 0) { laserHumT = 0.12; sfx.shoot(true); }
  fx.spawn(end.x, end.y, end.z, rnd(-3, 3), rnd(0, 4), rnd(-3, 3), pick([0xffa040, 0xffffff]), 0.3, -8);
  if (!what) return;
  if (what === boss) boss.hitBall({ pos: end, r: 0.3, dmg: dps * dt });
  else if (shots.includes(what)) { what.hp -= dps * dt; if (what.hp <= 0) popShot(what, true); }
  else damageEnemy(what, dps * dt, end);
}
const ballGeo = new THREE.SphereGeometry(1, 24, 16);
let ballMat = null, ballMatOD = null;
const moonMats = [];
function spawnBall(from, target, r, dmg, od) {
  if (!ballMat) { ballMat = new THREE.MeshBasicMaterial({ map: TEX.moon }); ballMatOD = new THREE.MeshBasicMaterial({ map: TEX.moonOD }); }
  // moon blasts change colour with every upgrade you pick
  const n = upgrades.filter(u => u !== 'laser').length, col = n ? MOON_COLORS[Math.min(n, 8) - 1] : 0x4aa8ff;
  if (n && !moonMats[n]) moonMats[n] = new THREE.MeshBasicMaterial({ map: TEX.moonW, color: col });
  const mesh = new THREE.Mesh(ballGeo, od ? ballMatOD : n ? moonMats[n] : ballMat);
  mesh.scale.setScalar(r); mesh.position.copy(from); scene.add(mesh);
  const glow = MD.glowSprite(od ? 0x9a8cff : col, r * 6, 0.9); glow.position.copy(from); scene.add(glow);
  const vel = new THREE.Vector3().subVectors(target, from).normalize().multiplyScalar(58);
  balls.push({ mesh, glow, pos: from.clone(), vel, r, dmg, life: 2.2 });
}
function doorOpenAt(p) {
  const d = Math.abs(angDiff(Math.atan2(p.z, p.x), -Math.PI / 2));
  return wallBroken ? d < 1.3 : d < DOOR_ANG && p.y < DOOR_H;
}
function updateBalls(dt) {
  for (const b of balls) {
    b.pos.addScaledVector(b.vel, dt); b.life -= dt;
    b.mesh.position.copy(b.pos); b.glow.position.copy(b.pos);
    b.mesh.rotation.x += dt * 5; b.mesh.rotation.y += dt * 3;
    if (Math.random() < 0.7) fx.spawn(b.pos.x, b.pos.y, b.pos.z, rnd(-0.5, 0.5), rnd(-0.5, 0.5), rnd(-0.5, 0.5), 0x3a8cff, 0.25);
    let hit = false;
    for (const s of shots) {
      if (!s.shootable || s.dead || s.pos.distanceTo(b.pos) > s.r + b.r + 0.2) continue;
      s.hp -= b.dmg; hit = true;
      if (s.hp <= 0) popShot(s, true);
      else fx.burst(s.pos, 0xffffff, 6, 4, 0.3, 0);
      break;
    }
    if (!hit) for (const e of enemies) {
      if (e.dead || e.alpha < 0.5 || !e.ws) continue;
      for (const w of e.ws) if (w.c.distanceTo(b.pos) < w.r + b.r) { damageEnemy(e, b.dmg, b.pos); hit = true; break; }
      if (hit) break;
    }
    if (!hit && boss && boss.ws) hit = boss.hitBall(b);
    if (!hit) {
      const rr = Math.hypot(b.pos.x, b.pos.z);
      if (b.pos.y < 0 || (!inJungle && ((b.pos.y > ROOM_H && rr < R && !wallBroken) || (rr > R - 0.3 && rr < R + 0.6 && !doorOpenAt(b.pos))))) {
        hit = true;
        fx.burst(b.pos, 0x7fd4ff, 10, 5, 0.4, -4);
      }
    }
    if (hit || b.life <= 0) { b.dead = true; scene.remove(b.mesh); scene.remove(b.glow); }
  }
  balls = balls.filter(b => !b.dead);
}
function bossDown(id) {
  score = addScore({ vrax: 5000, emperor: 10000, patient: 8000 }[id], score);
  unlockBadge(id);
  if (G.settings.diff === 2) unlockBadge('commander');
}
function hurt(dmg) {
  if (P.dead || P.invT > 0 || phase === 'clear' || phase === 'ending' || window.__AA?.god) return;
  dmg *= DIFFS[G.settings.diff].hurt;
  if (P.block) {
    // the left arm takes the hit
    dmg *= 0.25; sfx.clink(); P.blockFlash = 0.25;
    PROG.blocks++; if (PROG.blocks >= 10) unlockBadge('block10');
    AP.hand.getWorldPosition(tmp); fx.burst(tmp, 0xffe0a0, 16, 6, 0.3, -4);
  } else if (P.arm > 0) {
    P.arm = Math.max(0, P.arm - dmg * 1.6);
    if (P.arm <= 0) { sfx.crack(); H.bark('patch', 'Your left arm is broken! You cannot block until I fix it! Press {FIX}!', 1.8); }
  }
  P.armor -= dmg; P.invT = 0.3; P.hurtT = 0.6; P.tookHit = true;
  G.shake = Math.max(G.shake, 0.35);
  P.cracks.push(H.makeCrack(dmg / 10));
  if (P.cracks.length > 18) P.cracks.shift();
  sfx.hurt(); sfx.crack();
  if (P.armor <= 0) {
    P.armor = 0; P.dead = true; phase = 'dead'; phaseT = 0;
    for (let i = 0; i < 8; i++) P.cracks.push(H.makeCrack(2));
    sfx.boom(); H.clearDialog(); H.clearWarn();
  } else if (P.armor < P.max * 0.35 && !P.lowWarned) {
    P.lowWarned = true;
    H.bark('patch', pick(PATCH_LOW), 1.6);
  }
}
function tryRepair() {
  if (P.repairCD > 0) {
    if (patchMsgT <= 0) { H.bark('patch', `Still recharging! ${Math.ceil(P.repairCD)} more seconds!`, 1); patchMsgT = 4; }
    return;
  }
  if (P.armor >= P.max && P.arm >= 100) {
    if (patchMsgT <= 0) { H.bark('patch', 'You are fine! Not a scratch! Well, a few scratches.', 1.2); patchMsgT = 4; }
    return;
  }
  P.armor = Math.min(P.max, P.armor + 40); P.arm = 100;
  P.cracks.splice(0, Math.ceil(P.cracks.length * 0.6));
  P.repairCD = has('turbo') ? 20 : 40; P.repairAnim = 1.8; P.lowWarned = false;
  sfx.repair(); H.bark('patch', pick(PATCH_REPAIR), 1.4);
}

function updateCamera(dt) {
  const em = boss && boss.type === 'emperor';
  const yawT = -aimNX * 0.55, pitchT = aimNY * 0.38 + (em ? 0.32 : 0.02);
  cam.yaw = damp(cam.yaw, yawT, 6, dt); cam.pitch = damp(cam.pitch, pitchT, 6, dt);
  G.shake = Math.max(0, G.shake - dt * 1.4);
  const sh = G.shake * 0.35;
  const dashTilt = P.dashT > 0 ? -P.dashDir * 0.06 : 0;
  camera.rotation.set(cam.pitch + rnd(-sh, sh) * 0.1, cam.yaw + rnd(-sh, sh) * 0.1, damp(camera.rotation.z, P.dead ? 0.5 : dashTilt, 6, dt));
  camera.position.set(P.x + rnd(-sh, sh), EYE + P.y + rnd(-sh, sh), PZ);
  const fov = (P.odT > 0 ? 76 : 70) * (camera.aspect < 1 ? 1.25 : 1);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = damp(camera.fov, fov, 5, dt); camera.updateProjectionMatrix(); }
  // arms: recoil, sway, overdrive glow
  P.recoil = Math.max(0, P.recoil - dt * 8);
  AP.R.position.set(1.25 + Math.sin(G.time * 2) * 0.02, -1.15 + Math.sin(G.time * 1.6) * 0.025 - P.vy * 0.008, -0.1 + P.recoil * 0.4);
  P.switchT = Math.max(0, (P.switchT || 0) - dt);
  const sw = Math.sin((P.switchT / 0.45) * Math.PI);
  AP.R.position.y -= sw * 0.9; AP.R.rotation.x = 0.1 + P.recoil * 0.06 - sw * 0.6;
  AP.R.rotation.z = sw * 0.5;
  // left arm: raised to block, drooping when broken
  const blk = P.block ? 1 : 0;
  P.blockK = damp(P.blockK || 0, blk, 14, dt);
  const bk = P.blockK, broken = P.arm <= 0;
  AP.L.position.set(-1.3 + bk * 0.75, -1.08 + bk * 0.7 + Math.sin(G.time * 1.6 + 1) * 0.025 - P.vy * 0.008 - (broken ? 0.25 : 0), -0.1 + bk * 0.3);
  AP.L.rotation.set(0.16 + bk * 0.75 - (broken ? 0.5 : 0), -0.16 - bk * 0.75, bk * 0.5 + (broken ? 0.3 : 0));
  if (broken && Math.random() < 0.3) { AP.hand.getWorldPosition(tmp); fx.spawn(tmp.x, tmp.y, tmp.z, rnd(-1, 1), rnd(0, 2), rnd(-1, 1), pick([0xffe080, 0x55c8ff]), 0.3, -8); }
  const odOn = P.odT > 0, ringCol = odOn ? (Math.floor(G.time * 12) % 2 ? 0xffffff : 0x9a8cff) : 0x33aaff;
  for (const r of AP.rings) r.material.color.setHex(ringCol);
  AP.tip.material.color.setHex(P.cool > 0.05 ? 0xbfe8ff : ringCol);
  AP.wrist.material.color.setHex(P.arm <= 0 ? 0xff2020 : P.repairCD <= 0 ? 0x39ff6a : 0xff7a00);
  for (const f of AP.fingers) f.rotation.x = -0.25 - (P.hurtT > 0 ? 0.5 : 0) - Math.sin(G.time * 1.2) * 0.05;
  L.muzzle.intensity = Math.max(0, L.muzzle.intensity - dt * 30);
}

// ===== Patch, floating at the top-left of your view =====
function updatePatch(dt) {
  const t = G.time;
  let tx = -1.7, ty = 0.9 + Math.sin(t * 2.3) * 0.06, tz = -3.2;
  if (P.repairAnim > 0) { const k = Math.sin((1 - P.repairAnim / 1.8) * Math.PI); tx = lerp(-1.7, 0, k); ty = lerp(0.9, 0.05, k); tz = lerp(-3.2, -1.2, k); }
  patch.position.set(damp(patch.position.x, tx, 8, dt), damp(patch.position.y, ty, 8, dt), damp(patch.position.z, tz, 8, dt));
  const talking = H.speaking() === 'patch';
  const ry = talking || P.repairAnim > 0 ? 0.35 : scanTarget ? Math.PI - 0.3 : Math.PI - 0.7 + Math.sin(t * 0.7) * 0.3;
  patch.rotation.y = damp(patch.rotation.y, ry, 6, dt);
  patch.rotation.z = Math.sin(t * 1.7) * 0.1 + (P.hurtT > 0 ? Math.sin(t * 40) * 0.2 : 0);
  PP.tip.visible = Math.sin(t * 6) > 0;
  PP.eye.scale.y = talking ? 0.8 + Math.abs(Math.sin(t * 14)) * 0.2 : 1;
  for (const a of PP.arms) a.rotation.x = P.repairAnim > 0 ? Math.sin(t * 30) * 0.8 : Math.sin(t * 2) * 0.2;
  if (P.repairAnim > 0 && Math.random() < 0.5) {
    PP.eyeMark.getWorldPosition(tmp);
    fx.spawn(tmp.x, tmp.y, tmp.z, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), pick([0x39ff6a, 0xffffff, 0xff9a2a]), 0.3);
  }
}
function updateScan(dt) {
  if (scanT <= 0) {
    scanBeam.visible = false; scanTarget = null;
    const cands = enemies.filter(e => !e.dead && !scanned.has(e.type) && e.z > -13 && e.alpha > 0.5);
    if (boss && !scanned.has(boss.type) && boss.ready) cands.push(boss);
    const e = cands[0];
    if (e) {
      scanned.add(e.type); scanTarget = e; scanT = 1.6;
      sfx.scan();
      const s = SCANS[e.type];
      H.showScan(s); H.bark('patch', s.line, 1.4);
    }
    return;
  }
  scanT -= dt;
  if (!scanTarget || scanTarget.removed || !scanTarget.ws) { scanT = 0; return; }
  PP.eyeMark.getWorldPosition(tmp);
  const c = scanTarget.ws[0].c;
  scanBeam.visible = Math.floor(scanT * 20) % 3 !== 0;
  beamBetween(scanBeam, tmp, c, 0.03);
  if (Math.random() < 0.5) fx.spawn(c.x + rnd(-0.5, 0.5), c.y + rnd(-0.8, 0.8), c.z + rnd(-0.5, 0.5), 0, rnd(0, 1), 0, 0x33bbff, 0.4);
}
function beamBetween(m, a, b, r) {
  tmp2.subVectors(b, a);
  const len = tmp2.length();
  m.position.copy(a).addScaledVector(tmp2, 0.5);
  m.quaternion.setFromUnitVectors(UPV, tmp2.normalize());
  m.scale.set(r, len, r);
}

function updateRoom(dt) {
  const t = G.time;
  if (inJungle) {
    flashT -= dt;
    updateJungle(jungle, dt, rail, t);
    for (const p of props) p.position.z += rail * dt;
    props = props.filter(p => { if (p.position.z > PZ + 25) { scene.remove(p); return false; } return true; });
    scareT -= dt;
    return;
  }
  L.emer.intensity = Math.sin(t * 4) > 0 ? 2.8 : 0.4;
  L.ceil.intensity = 2.2 * (Math.random() < 0.02 ? 0.3 : 1);
  L.doorStrip.material.color.setHex(Math.sin(t * 6) > 0 ? 0xff3020 : 0x601008);
  lightningT -= dt;
  if (lightningT <= 0) { lightningT = rnd(6, 12); flashT = 0.25; setTimeout(() => sfx.thunder(), 250); }
  flashT -= dt;
  L.hemi.intensity = 0.7 + (flashT > 0 ? 2.5 : 0);
  L.door.intensity = 4 + (flashT > 0 ? 6 : 0);
  for (const s of outside.children) {
    if (!s.isSprite) continue;
    s.userData.t += dt;
    if (s.userData.t > 1) { s.userData.t = rnd(-4, 0); s.position.set(rnd(-60, 60), rnd(2, 15), rnd(-60, -160)); }
    const k = s.userData.t;
    s.material.opacity = k > 0 ? 1 - k : 0;
    s.scale.setScalar(6 + Math.max(0, k) * 20);
  }
  if (roof.userData.fly > 0) {
    const f = (roof.userData.fly += dt);
    roof.position.set(f * 4, f * f * 9, -f * 6); roof.rotation.set(-f * 0.4, 0, f * 0.3);
    if (f > 4) roof.visible = false;
  }
  for (const p of panels) {
    if (!p.fly) continue;
    p.fly.v.y -= 9 * dt;
    p.grp.position.addScaledVector(p.fly.v, dt);
    p.grp.rotation.x += p.fly.s.x * dt; p.grp.rotation.z += p.fly.s.z * dt;
    p.fly.t += dt;
    if (p.fly.t > 4) p.grp.visible = false;
  }
}

// ===== Enemies =====
function freeCover(not) {
  const free = covers.filter(c => !c.used && c !== not);
  const c = free.length ? pick(free) : pick(covers);
  c.used = true;
  return c;
}
function coverStand(c) {
  const dx = c.x, dz = c.z - PZ, d = Math.hypot(dx, dz);
  return { x: c.x + (dx / d) * 1.6, z: c.z + (dz / d) * 1.6 };
}
function spawnEnemy(type, o = {}) {
  const make = { zippit: MD.makeZippit, bruteclaw: MD.makeBruteclaw, voidfly: MD.makeVoidfly, riftstalker: MD.makeRiftstalker, soldier: () => J.makeSoldier(MD.makeZippit), bug: J.makeBug, plant: J.makePlant, swamp: J.makeSwamp, mutant: J.makeMutant }[type];
  const g = make();
  scene.add(g);
  const e = { type, g, P: g.userData.parts, hit: g.userData.hit, t: rnd(0, 5), st: 'enter', stT: 0, flash: 0, dead: false, alpha: 1, ws: null };
  e.hp = e.max = { zippit: 3, bruteclaw: 26, voidfly: 2, riftstalker: 6, soldier: 4, bug: 5, plant: 4, swamp: 6, mutant: 6 }[type] * DIFFS[G.settings.diff].hp;
  e.x = o.x ?? (inJungle ? rnd(-7, 7) : rnd(-3.5, 3.5)); e.z = o.z ?? (inJungle ? rnd(-62, -50) : rnd(-26, -22)); e.y = type === 'voidfly' ? rnd(3, 4.5) : 0;
  const side = Math.random() < 0.5 ? -1 : 1;
  if (type === 'soldier') { e.tx = rnd(-7, 7); e.tz = rnd(-24, -14); e.fireT = rnd(1, 2); }
  if (type === 'bug') { e.speed = rnd(7, 9); e.slot = rnd(-2, 2); e.leapCD = rnd(0, 1.5); }
  if (type === 'plant') { e.anchored = true; e.x = o.x ?? side * rnd(3.8, 6.5); e.z = o.z ?? -85; e.fireT = rnd(0.3, 1.2); }
  if (type === 'swamp') {
    e.anchored = true; e.x = o.x ?? side * rnd(5, 8); e.z = o.z ?? -90; e.y = -4.2; e.fireT = 0.8;
    e.pool = J.makePool(2.8); e.pool.position.set(e.x, 0, e.z); scene.add(e.pool);
  }
  if (type === 'mutant') { e.speed = rnd(7, 9.5); e.slot = rnd(-2.2, 2.2); e.twitchT = 0; if (o.x === undefined && Math.random() < 0.4) { e.x = side * rnd(10, 13); e.z = rnd(-40, -28); } }
  e.mats = [];
  g.traverse(m => { if (m.material && m.material.emissive) { e.mats.push(m.material); m.material.userData.e0 = m.material.emissive.getHex(); } });
  if (type === 'zippit') { e.speed = rnd(5, 6.5); e.slot = rnd(-2.2, 2.2); e.dashT = rnd(1, 3); }
  if (type === 'bruteclaw') { e.tx = rnd(-4, 4); e.tz = rnd(-5, -2); }
  if (type === 'voidfly') { pickWaypoint(e); e.fireT = rnd(1.5, 3); }
  if (type === 'riftstalker') {
    e.cover = freeCover();
    e.laser = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), MD.addGlow(0xff2020, 0.8), 0, 0, 0, scene);
    e.laser.visible = false;
    e.lock = new THREE.Vector3();
  }
  g.position.set(e.x, e.y, e.z);
  shadows(g);
  enemies.push(e);
  return e;
}
function steer(e, tx, tz, sp, dt) {
  if (!inJungle && e.z < -13.2 && tz > -13) { tx = clamp(e.x, -3, 3); tz = -11.5; }
  const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
  if (d > 0.001) { const s = Math.min(d, sp * dt); e.x += (dx / d) * s; e.z += (dz / d) * s; }
  if (inJungle) e.x = clamp(e.x, -14, 14);
  else if (e.z > -13) { const r = Math.hypot(e.x, e.z); if (r > R - 1) { e.x *= (R - 1) / r; e.z *= (R - 1) / r; } }
  return Math.hypot(tx - e.x, tz - e.z);
}
function face(e, tx, tz, k, dt) {
  const want = Math.atan2(tx - e.x, tz - e.z);
  e.g.rotation.y += angDiff(want, e.g.rotation.y) * Math.min(1, k * dt);
}
function updateEnemy(e, dt) {
  e.t += dt;
  if (e.dead) return;
  if (e.anchored) {
    e.z += rail * dt;
    if (e.pool) e.pool.position.z = e.z;
    if (e.z > PZ + 8) { e.dead = e.removed = true; scene.remove(e.g); if (e.pool) props.push(e.pool); return; }
  }
  if (e.type === 'zippit') upZippit(e, dt);
  else if (e.type === 'bruteclaw') upBrute(e, dt);
  else if (e.type === 'voidfly') upVoidfly(e, dt);
  else if (e.type === 'riftstalker') upStalker(e, dt);
  else if (e.type === 'soldier') upSoldier(e, dt);
  else if (e.type === 'bug') upBug(e, dt);
  else if (e.type === 'plant') upPlant(e, dt);
  else if (e.type === 'swamp') upSwamp(e, dt);
  else upMutant(e, dt);
  // keep Zippits from piling inside each other
  if (e.type === 'zippit' || e.type === 'mutant' || e.type === 'bug') for (const o of enemies) {
    if (o === e || o.dead || o.type === 'voidfly') continue;
    const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = o.type === 'bruteclaw' ? 2 : 0.9;
    if (d < min && d > 0.001) { e.x += (dx / d) * (min - d) * 0.5; e.z += (dz / d) * (min - d) * 0.5; }
  }
  e.g.position.set(e.x, e.y + (e.crouch ? -e.crouch * 1.1 : 0), e.z);
  if (e.flash > 0) e.flash -= dt;
  if (e.stagger > 0) e.stagger -= dt;
  const f = e.flash > 0 ? 0xffffff : null;
  for (const m of e.mats) m.emissive.setHex(f ?? m.userData.e0);
}
function upZippit(e, dt) {
  const close = enemies.filter(o => o !== e && o.type === 'zippit' && !o.dead && o.z > PZ - 4.2).length;
  const wait = close >= 3 && e.z <= PZ - 4.2;
  const tx = clamp(P.x + e.slot * (wait ? 1.8 : 1), -6, 6), tz = wait ? PZ - 6.8 : PZ - 2.8, dist = Math.hypot(P.x - e.x, PZ - e.z);
  const A = e.P.arms;
  if (e.st === 'enter' || e.st === 'run') {
    e.st = 'run';
    let sp = e.speed;
    e.dashT -= dt;
    if (e.dashT <= 0 && dist > 6 && e.z > -13) { e.dashT = rnd(1.8, 3.2); e.dashing = 0.28; e.dashSide = pick([-1, 1]); }
    if (e.dashing > 0) { e.dashing -= dt; sp = 15; e.x += e.dashSide * 7 * dt; if (Math.random() < 0.5) fx.spawn(e.x, 0.5, e.z, 0, 1, 0, 0x39ff6a, 0.3); }
    const d = steer(e, tx, tz, sp, dt);
    face(e, P.x, PZ, 10, dt);
    const s = Math.sin(e.t * 16);
    e.P.legs[0].rotation.x = s * 0.8; e.P.legs[1].rotation.x = -s * 0.8;
    e.P.body.position.y = 0.95 + Math.abs(s) * 0.08;
    e.P.body.rotation.x = 0.22 + (e.stagger > 0 ? -0.5 : 0); e.P.head.rotation.x = Math.sin(e.t * 16) * 0.12 - 0.15;
    A[0].rotation.x = -0.9 - s * 0.4; A[1].rotation.x = -0.9 + s * 0.4;
    if (!wait && (d < 0.4 || dist < 3.1)) { e.st = 'wind'; e.stT = 0.5; }
  } else if (e.st === 'wind') {
    e.stT -= dt;
    face(e, P.x, PZ, 10, dt);
    for (const a of A) a.rotation.x = damp(a.rotation.x, -2.6, 12, dt);
    for (const ey of e.P.eyes) ey.material.color.setHex(Math.floor(e.t * 16) % 2 ? 0xff3030 : 0xffff4a);
    if (e.stT <= 0) {
      e.st = 'strike'; e.stT = 0.18; sfx.blade();
      if (Math.abs(P.x - e.x) < 1.7 && P.y < 1.5) hurt(8);
    }
  } else if (e.st === 'strike') {
    e.stT -= dt;
    for (const a of A) a.rotation.x = damp(a.rotation.x, 0.4, 20, dt);
    if (e.stT <= 0) { e.st = 'recover'; e.stT = 0.8; for (const ey of e.P.eyes) ey.material.color.setHex(0xffff4a); }
  } else if (e.st === 'recover') {
    e.stT -= dt;
    for (const a of A) a.rotation.x = damp(a.rotation.x, -0.9, 6, dt);
    if (e.stT <= 0) e.st = Math.hypot(P.x - e.x, PZ - e.z) < 3.3 && Math.abs(P.x - e.x) < 2 ? 'wind' : 'run';
    if (e.st === 'wind') e.stT = 0.5;
  }
}
function upBrute(e, dt) {
  const s = Math.sin(e.t * 4), A = e.P.arms;
  if (e.st === 'enter' || e.st === 'walk') {
    e.st = 'walk';
    const d = steer(e, e.tx, e.tz, 1.8, dt);
    face(e, P.x, PZ, 3, dt);
    e.P.legs[0].rotation.x = s * 0.4; e.P.legs[1].rotation.x = -s * 0.4;
    e.P.body.position.y = 2.6 + Math.abs(s) * 0.1;
    e.P.body.rotation.z = s * 0.06; e.P.head.rotation.y = Math.sin(e.t * 0.9) * 0.4;
    if (Math.abs(s) > 0.98 && e.z > -14) sfx.step();
    if (d < 0.3) { e.st = 'idle'; e.stT = rnd(0.8, 1.6); }
  } else if (e.st === 'idle') {
    e.stT -= dt; face(e, P.x, PZ, 3, dt);
    for (const a of A) a.g.rotation.x = damp(a.g.rotation.x, (a.upper ? -0.3 : -0.6) + Math.sin(e.t * 2 + a.s) * 0.1, 4, dt);
    if (e.stT <= 0) { e.st = 'wind'; e.stT = 1.1; H.warn('JUMP!', '#ffb02e', 1.4); sfx.roar(); }
  } else if (e.st === 'wind') {
    e.stT -= dt;
    for (const a of A) a.g.rotation.x = damp(a.g.rotation.x, a.upper ? -2.8 : -2.3, 6, dt);
    e.P.chest.scale.setScalar(1 + Math.sin(e.t * 30) * 0.15 + 0.2);
    e.P.chestGlow.material.opacity = 1;
    if (e.stT <= 0) { e.st = 'slam'; e.stT = 0.15; }
  } else if (e.st === 'slam') {
    e.stT -= dt;
    for (const a of A) a.g.rotation.x = damp(a.g.rotation.x, 0.3, 25, dt);
    if (e.stT <= 0) {
      spawnRing(e.x, e.z, 11, 15, 0xff8a1a);
      sfx.slam(); G.shake = Math.max(G.shake, 0.5);
      fxBig.burst(tmp.set(e.x, 0.3, e.z + 1), 0xff8a1a, 20, 8, 0.6, -5);
      e.st = 'recover'; e.stT = 1.4; e.P.chest.scale.setScalar(1); e.P.chestGlow.material.opacity = 0.8;
    }
  } else if (e.st === 'recover') {
    e.stT -= dt;
    for (const a of A) a.g.rotation.x = damp(a.g.rotation.x, a.upper ? -0.3 : -0.6, 4, dt);
    if (e.stT <= 0) { e.tz = Math.min(e.tz + 1.5, 3); e.tx = clamp(e.tx + rnd(-2, 2), -5, 5); e.st = 'walk'; }
  }
}
function pickWaypoint(e) {
  for (let i = 0; i < 30; i++) {
    const x = rnd(-9, 9), z = rnd(-11, 2.5);
    if (Math.hypot(x, z) < R - 3) { e.wx = x; e.wz = z; e.wy = rnd(3.5, 7); return; }
  }
  e.wx = 0; e.wz = -5; e.wy = 5;
}
function upVoidfly(e, dt) {
  for (const w of e.P.wings) w.g.rotation.z = w.s * Math.sin(e.t * 45 + w.k) * 0.55;
  e.P.body.position.y = Math.sin(e.t * 3) * 0.15;
  let tx = e.wx, ty = e.wy, tz = e.wz;
  if (e.z < -13.2) { tx = clamp(e.x, -3, 3); ty = 4; tz = -11; }
  if (e.st === 'enter' || e.st === 'fly') {
    e.st = 'fly';
    const dx = tx - e.x, dy = ty - e.y, dz = tz - e.z, d = Math.hypot(dx, dy, dz);
    if (d > 0.01) { const s = Math.min(d, 6 * dt); e.x += (dx / d) * s; e.y += (dy / d) * s; e.z += (dz / d) * s; }
    face(e, P.x, PZ, 5, dt);
    e.fireT -= dt;
    if (d < 0.5) pickWaypoint(e);
    if (e.fireT <= 0 && e.z > -13) { e.st = 'charge'; e.stT = 0.7; }
  } else if (e.st === 'charge') {
    e.stT -= dt; face(e, P.x, PZ, 8, dt);
    e.P.eye.scale.setScalar(1 + (0.7 - e.stT) * 0.8);
    e.P.eyeGlow.scale.setScalar(1.2 + (0.7 - e.stT) * 3);
    if (e.stT <= 0) {
      e.P.eye.scale.setScalar(1); e.P.eyeGlow.scale.setScalar(1.2);
      e.P.eye.getWorldPosition(tmp);
      const dir = headPos(tmp2).sub(tmp).normalize();
      for (const a of [-0.13, 0, 0.13]) makeShot('bolt', tmp, dir.clone().applyAxisAngle(UPV, a).multiplyScalar(13), { r: 0.25, dmg: 6 });
      sfx.bolt();
      e.st = 'fly'; e.fireT = rnd(2.5, 4); pickWaypoint(e);
    }
  }
}
function upStalker(e, dt) {
  e.near = Math.hypot(e.x - P.x, e.z - PZ) < 11;
  e.crouch = e.crouch || 0;
  const run = () => { const s = Math.sin(e.t * 12); e.P.legs[0].rotation.x = s * 0.6; e.P.legs[1].rotation.x = -s * 0.6; };
  if (e.st === 'enter') {
    const sp = coverStand(e.cover), d = steer(e, sp.x, sp.z, 6, dt);
    face(e, P.x, PZ, 6, dt); run();
    if (d < 0.3) { e.st = 'hide'; e.stT = rnd(1.0, 2.0); }
  } else if (e.st === 'hide') {
    e.crouch = damp(e.crouch, 1, 6, dt); e.stT -= dt; face(e, P.x, PZ, 6, dt);
    e.P.legs[0].rotation.x = e.P.legs[1].rotation.x = 0;
    if (e.stT <= 0) { e.st = 'aim'; e.stT = 1.5; sfx.charge(); H.warn('DODGE!', '#ff4040', 1.3); }
  } else if (e.st === 'aim') {
    e.crouch = damp(e.crouch, 0, 10, dt); e.stT -= dt; face(e, P.x, PZ, 10, dt);
    if (e.stT > 0.45) headPos(e.lock);
    e.P.muzzle.getWorldPosition(tmp);
    tmp2.subVectors(e.lock, tmp).normalize().multiplyScalar(40).add(tmp);
    beamBetween(e.laser, tmp, tmp2, e.stT < 0.45 ? 0.05 : 0.02);
    e.laser.visible = Math.floor(e.stT * 20) % 4 !== 0 || e.stT < 0.45;
    if (e.stT <= 0) {
      e.laser.visible = false;
      const miss = headPos().distanceTo(e.lock) > 1.0;
      if (!miss) hurt(15);
      e.P.muzzle.getWorldPosition(tmp);
      makeHazardStreak(tmp, e.lock);
      sfx.snipe();
      e.cover.used = false; e.cover = freeCover(e.cover);
      e.st = 'cloak'; e.stT = 2.6; sfx.cloak();
    }
  } else if (e.st === 'cloak') {
    e.crouch = damp(e.crouch, 0, 6, dt);
    const sp = coverStand(e.cover), d = steer(e, sp.x, sp.z, 5, dt);
    face(e, P.x, PZ, 6, dt); run();
    e.stT -= dt;
    if (e.stT <= 0 && d < 0.3) { e.st = 'hide'; e.stT = rnd(0.8, 1.6); sfx.cloak(); }
  }
  const want = e.st === 'cloak' ? 0.05 : 1;
  e.alpha = damp(e.alpha, want, 5, dt);
  const shimmer = e.st === 'cloak' ? 0.05 + Math.max(0, Math.sin(e.t * 25)) * 0.06 : 0;
  e.g.traverse(m => { if (m.material) m.material.opacity = e.alpha + shimmer; });
}
function damageEnemy(e, dmg, at) {
  const mult = e.type === 'riftstalker' && e.near ? 3 : 1;
  e.hp -= dmg * mult; e.flash = 0.1; hitMarkT = 0.15;
  if (!e.anchored && e.type !== 'bruteclaw' && dmg >= 0.5) { e.z -= 0.22; e.stagger = 0.15; }
  sfx.hit();
  fx.burst(at, e.type === 'riftstalker' ? 0xff3030 : 0x7dff6a, mult > 1 ? 14 : 6, 5, 0.5, -6);
  P.od = Math.min(100, P.od + 1.5);
  if (e.hp <= 0) killEnemy(e);
}
const ENEMY_COLORS = { soldier: [0x6a9a2a, 0x3a4a22], bug: [0x1a8a7a, 0x6a2ab0], plant: [0xc0208a, 0x2a8a3a], swamp: [0x3a5a22, 0x2a3a14], mutant: [0x8a9a7a, 0x8a1a8a], zippit: [0x2ef03c, 0x8a2be2], bruteclaw: [0x7d22d8, 0x2a0b4f, 0xff7a00], voidfly: [0x9b30ff, 0x66ff22], riftstalker: [0x1c2030, 0x3d3366] };
function killEnemy(e, quiet) {
  e.dead = true; e.removed = true;
  scene.remove(e.g);
  if (e.laser) scene.remove(e.laser);
  if (e.cover) e.cover.used = false;
  if (e.pool) props.push(e.pool);
  const c = e.ws ? e.ws[0].c : tmp.set(e.x, 1, e.z);
  const big = e.type === 'bruteclaw';
  fxBig.burst(c, e.type === 'voidfly' ? 0x9b30ff : 0x39ff6a, big ? 40 : 18, big ? 10 : 7, 0.7, -8);
  fx.burst(c, 0xffffff, 12, 9, 0.4, 0);
  debris.burst(c, ENEMY_COLORS[e.type], big ? 12 : 6, big ? 8 : 6, big ? 0.45 : 0.25);
  if (quiet) return;
  kills++;
  score = addScore(POINTS[e.type] || 100, score);
  PROG.kills++; if (PROG.kills % 10 === 0) saveProg();
  unlockBadge('first'); if (PROG.kills >= 100) unlockBadge('goo100');
  P.od = Math.min(100, P.od + ({ zippit: 6, voidfly: 8, bruteclaw: 25, riftstalker: 18, soldier: 8, bug: 10, plant: 8, swamp: 15, mutant: 12 }[e.type] || 8));
  if (big) sfx.bigkill(); else sfx.kill();
  if (big) G.shake = Math.max(G.shake, 0.4);
}

// ===== Chapter 2 creatures =====
function legSwing(legs, t, amt) { legs.forEach((l, i) => { l.rotation.x = Math.sin(t + (i % 2) * Math.PI) * amt; }); }
function upSoldier(e, dt) {
  const A = e.P.arms;
  if (e.st === 'enter' || e.st === 'move') {
    e.st = 'move';
    const d = steer(e, e.tx, e.tz, 7, dt);
    face(e, P.x, PZ, 8, dt);
    legSwing(e.P.legs, e.t * 14, 0.7);
    if (d < 0.3) { e.st = 'aim'; e.stT = rnd(0.6, 1.2); }
  } else {
    face(e, P.x, PZ, 8, dt);
    e.x = clamp(e.x + Math.sin(e.t * 1.4) * 1.5 * dt, -9, 9);
    legSwing(e.P.legs, e.t * 6, 0.15);
    e.stT -= dt;
    for (const a of A) a.rotation.x = damp(a.rotation.x, e.stT < 0.3 ? -1.55 : -1.3, 10, dt);
    if (e.stT <= 0) {
      e.P.muzzle.getWorldPosition(tmp);
      const dir = headPos(tmp2).sub(tmp).normalize();
      dir.x += rnd(-0.03, 0.03);
      makeShot('bolt', tmp, dir.multiplyScalar(16), { r: 0.22, dmg: 6 });
      sfx.bolt();
      fx.burst(tmp, 0xffa020, 5, 3, 0.2, 0);
      e.shots = (e.shots || 0) + 1;
      if (e.shots % 3 === 0) { e.tx = rnd(-7, 7); e.tz = clamp(e.tz + rnd(-2, 5), -24, -8); e.st = 'move'; } else e.stT = rnd(1.2, 2.2);
    }
  }
}
function upBug(e, dt) {
  const B = e.P;
  B.legs.forEach(l => { l.g.rotation.x = Math.sin(e.t * 22 + l.i * 1.6 + (l.s > 0 ? Math.PI : 0)) * 0.45; });
  for (const w of B.wings) w.rotation.z = e.st === 'leap' ? Math.sin(e.t * 60) * 0.6 : w.rotation.z * 0.9;
  e.leapCD -= dt;
  const dist = Math.hypot(P.x - e.x, PZ - e.z);
  if (e.st === 'enter' || e.st === 'run') {
    e.st = 'run';
    const tx = clamp(P.x + e.slot, -6, 6);
    steer(e, tx, PZ - 7, e.speed, dt);
    e.x += Math.sin(e.t * 5) * 4 * dt;
    face(e, P.x, PZ, 8, dt);
    B.body.position.y = 1.3 + Math.abs(Math.sin(e.t * 22)) * 0.06;
    for (const s of B.scythes) s.rotation.x = 0.3 + Math.sin(e.t * 6) * 0.1;
    if (dist < 9 && e.leapCD <= 0) { e.st = 'crouch'; e.stT = 0.45; H.warn('DASH!', '#5ad8ff', 0.9); }
  } else if (e.st === 'crouch') {
    e.stT -= dt; face(e, P.x, PZ, 10, dt);
    B.body.position.y = damp(B.body.position.y, 0.8, 10, dt);
    for (const s of B.scythes) s.rotation.x = damp(s.rotation.x, -1.0, 10, dt);
    if (e.stT <= 0) { e.st = 'leap'; e.stT = 0.55; e.l0x = e.x; e.l0z = e.z; e.lx = P.x; sfx.dash(); }
  } else if (e.st === 'leap') {
    e.stT -= dt;
    const k = 1 - Math.max(0, e.stT) / 0.55;
    e.x = lerp(e.l0x, e.lx, k); e.z = lerp(e.l0z, PZ - 1.6, k); e.y = Math.sin(k * Math.PI) * 3;
    B.body.position.y = 1.3;
    if (e.stT <= 0) {
      e.y = 0;
      for (const s of B.scythes) s.rotation.x = 0.8;
      sfx.blade();
      if (Math.abs(P.x - e.lx) < 1.8 && P.y < 2) hurt(10);
      e.st = 'recover'; e.stT = 0.9; e.leapCD = rnd(2.5, 3.5);
    }
  } else if (e.st === 'recover') {
    e.stT -= dt;
    e.z = damp(e.z, PZ - 6, 3, dt);
    for (const s of B.scythes) s.rotation.x = damp(s.rotation.x, 0.3, 4, dt);
    if (e.stT <= 0) e.st = 'run';
  }
}
function upPlant(e, dt) {
  const Pt = e.P;
  face(e, P.x, PZ, 4, dt);
  Pt.neck.rotation.x = Math.sin(e.t * 1.7) * 0.15;
  Pt.stem.rotation.z = Math.sin(e.t * 1.1) * 0.06;
  const near = e.z > PZ - 12 && Math.abs(e.x - P.x) < 4.6;
  if (e.st === 'spit') {
    e.stT -= dt;
    Pt.top.rotation.x = damp(Pt.top.rotation.x, -1.0, 12, dt); Pt.bot.rotation.x = damp(Pt.bot.rotation.x, 0.8, 12, dt);
    Pt.neck.rotation.x = -0.4;
    if (e.stT <= 0) {
      Pt.mouth.getWorldPosition(tmp);
      makeShot('acid', tmp, headPos(tmp2).sub(tmp).normalize().multiplyScalar(14), { r: 0.3, dmg: 7 });
      sfx.bolt();
      e.st = 'idle'; e.fireT = rnd(1.8, 2.8);
    }
    return;
  }
  Pt.top.rotation.x = -0.25 - Math.abs(Math.sin(e.t * 3)) * 0.25;
  Pt.bot.rotation.x = 0.2 + Math.abs(Math.sin(e.t * 3)) * 0.2;
  if (!e.bit && near && e.z > PZ - 9 && !e.warned) { e.warned = true; H.warn('DASH!', '#5ad8ff', 0.9); }
  if (!e.bit && e.z > PZ - 3.2) {
    e.bit = true;
    Pt.top.rotation.x = 0; Pt.bot.rotation.x = 0;
    sfx.blade();
    if (Math.abs(e.x - P.x) < 4.6) hurt(10);
  }
  if (e.z > -40 && e.z < PZ - 4) { e.fireT -= dt; if (e.fireT <= 0) { e.st = 'spit'; e.stT = 0.5; } }
}
function upSwamp(e, dt) {
  const S = e.P;
  if (!e.risen) {
    if (e.z > -48) { e.risen = true; e.st = 'rise'; e.stT = 1; sfx.slam(); }
    return;
  }
  for (const a of S.arms) a.rotation.x = damp(a.rotation.x, e.st === 'wind' ? -2.6 : Math.sin(e.t * 2) * 0.2, 8, dt);
  S.eye.scale.setScalar(1 + Math.sin(e.t * 6) * 0.08);
  face(e, P.x, PZ, 4, dt);
  if (e.st === 'rise') {
    e.stT -= dt;
    e.y = lerp(-4.2, 0, smooth(1 - e.stT));
    if (Math.random() < 0.8) fx.spawn(e.x + rnd(-2, 2), 0.3, e.z + rnd(-2, 2), rnd(-2, 2), rnd(3, 7), rnd(-2, 2), 0x6aff8a, 0.6, -12);
    if (e.stT <= 0) { e.st = 'idle'; e.y = 0; }
  } else if (e.st === 'idle') {
    e.fireT -= dt;
    if (e.fireT <= 0 && e.z < PZ - 6) { e.st = 'wind'; e.stT = 0.6; }
    if (e.z > PZ - 5) { e.st = 'sink'; }
  } else if (e.st === 'wind') {
    e.stT -= dt;
    if (e.stT <= 0) {
      S.hand.getWorldPosition(tmp);
      const T = 1.5, tx = clamp(P.x + rnd(-1.5, 1.5), -4, 4), tz = PZ - rnd(0, 1.5);
      const vel = new THREE.Vector3((tx - tmp.x) / T, (0 - tmp.y) / T + 0.5 * 9 * T, (tz - tmp.z) / T);
      makeShot('mud', tmp, vel, { r: 0.5, hp: 1, dmg: 10, grav: -9 });
      sfx.bolt();
      e.st = 'idle'; e.fireT = rnd(2.2, 3.2);
    }
  } else if (e.st === 'sink') {
    e.y = Math.max(-4.2, e.y - dt * 3);
  }
}
function upMutant(e, dt) {
  const Mt = e.P;
  // jerky, twitchy movement
  e.twitchT -= dt;
  if (e.twitchT <= 0) { e.twitchT = rnd(0.15, 0.6); e.tw = { hz: rnd(-0.6, 0.6), hx: rnd(-0.4, 0.3), lean: rnd(0.1, 0.5) }; }
  const tw = e.tw || { hz: 0.3, hx: 0, lean: 0.3 };
  Mt.head.rotation.z = damp(Mt.head.rotation.z, tw.hz, 20, dt); Mt.head.rotation.x = damp(Mt.head.rotation.x, tw.hx, 20, dt);
  Mt.body.rotation.x = damp(Mt.body.rotation.x, tw.lean, 10, dt);
  Mt.eyeGlow.material.opacity = 0.6 + Math.random() * 0.4;
  const dist = Math.hypot(P.x - e.x, PZ - e.z);
  if (e.st === 'enter' || e.st === 'run') {
    e.st = 'run';
    const sp = e.speed * (0.6 + Math.abs(Math.sin(e.t * 4.5)) * 0.7);
    steer(e, clamp(P.x + e.slot, -5, 5), PZ - 3, sp, dt);
    face(e, P.x, PZ, 10, dt);
    legSwing(Mt.legs, e.t * 16, 0.8);
    Mt.arms[0].rotation.x = Math.sin(e.t * 16) * 0.8 - 0.5; Mt.arms[1].rotation.x = -Math.sin(e.t * 16) * 0.5 - 0.3;
    Mt.jaw.rotation.x = 0.2 + Math.abs(Math.sin(e.t * 9)) * 0.3;
    if (!e.pounced && dist < 8 && dist > 4.5 && Math.random() < dt * 1.5) { e.st = 'crouch'; e.stT = 0.45; sfx.scream(); H.warn('DASH!', '#ff3030', 0.9); }
    else if (dist < 3.4) { e.st = 'wind'; e.stT = 0.45; }
  } else if (e.st === 'crouch') {
    e.stT -= dt; face(e, P.x, PZ, 12, dt);
    Mt.body.position.y = damp(Mt.body.position.y, 1.0, 12, dt);
    Mt.jaw.rotation.x = 0.9;
    if (e.stT <= 0) { e.st = 'pounce'; e.stT = 0.4; e.l0x = e.x; e.l0z = e.z; e.lx = P.x; }
  } else if (e.st === 'pounce') {
    // leaps straight at the visor
    e.stT -= dt;
    const k = 1 - Math.max(0, e.stT) / 0.4;
    e.x = lerp(e.l0x, e.lx, k); e.z = lerp(e.l0z, PZ - 1.1, k); e.y = Math.sin(k * Math.PI * 0.8) * 1.4;
    Mt.arms[0].rotation.x = Mt.arms[1].rotation.x = -2.6;
    if (e.stT <= 0) {
      e.pounced = true;
      if (Math.abs(P.x - e.lx) < 1.6) { hurt(14); scareT = 0.7; G.shake = 1; sfx.scream(); }
      e.st = 'recover'; e.stT = 0.8;
    }
  } else if (e.st === 'wind') {
    e.stT -= dt; face(e, P.x, PZ, 12, dt);
    Mt.arms[1].rotation.x = damp(Mt.arms[1].rotation.x, -2.4, 12, dt);
    if (e.stT <= 0) { e.st = 'recover'; e.stT = 0.8; sfx.blade(); if (Math.abs(P.x - e.x) < 1.8 && P.y < 1.5) hurt(9); }
  } else if (e.st === 'recover') {
    e.stT -= dt;
    e.y = Math.max(0, e.y - dt * 6);
    e.z = damp(e.z, PZ - 5, 3, dt);
    Mt.body.position.y = damp(Mt.body.position.y, 1.4, 6, dt);
    if (e.stT <= 0) e.st = 'run';
  }
}

// ===== PATIENT ZERO =====
const PZ_SEQ = ['leap', 'throw', 'grab', 'throw', 'scream'];
function spawnPatient() {
  const g = shadows(J.makePatientZero());
  g.scale.setScalar(4);
  g.position.set(0, 0, -70);
  scene.add(g);
  const mats = [];
  g.traverse(m => { if (m.material && m.material.emissive) { mats.push(m.material); m.material.userData.e0 = m.material.emissive.getHex(); } });
  boss = {
    type: 'patient', name: 'PATIENT ZERO', g, Pt: g.userData.parts, hit: g.userData.hit, hp: 300 * DIFFS[G.settings.diff].hp, max: 300 * DIFFS[G.settings.diff].hp,
    x: 0, z: -70, y: 0, st: 'enter', stT: 0, seq: 0, tx: 0, flash: 0, mats, ready: false, said: {}, t: 0, podOpen: 0, extra: [], hitBall: patientHit,
  };
  sfx.roar();
  L.boss.color.setHex(0xff2ad0);
}
function patientHit(b) {
  const e = boss;
  for (const w of e.ws) {
    if (w.c.distanceTo(b.pos) > w.r + b.r) continue;
    if (e.st === 'enter' || e.st === 'dying') { sfx.clink(); return true; }
    const core = w.tag === 'core' && e.podOpen > 0;
    e.hp -= b.dmg * (core ? 1.5 : 0.12); e.flash = 0.06; hitMarkT = 0.15;
    fx.burst(b.pos, core ? 0xff4af0 : 0x9aff7a, core ? 14 : 5, 6, 0.5, -5);
    if (core) sfx.hit(); else sfx.clink();
    P.od = Math.min(100, P.od + (core ? 0.8 : 0.1));
    if (!core && !e.said.armor && e.ready) { e.said.armor = 1; H.bark('patch', 'It barely felt that! Wait for it to scream, then hit the parasite!', 1.4); }
    if (e.hp <= e.max * 0.5 && !e.said.half) { e.said.half = 1; H.say('nova', 'It is weakening! Keep hitting the parasite!', 1.2); }
    if (e.hp <= 0) {
      e.hp = 0; e.st = 'dying'; e.stT = 4; sfx.roar(); sfx.scream(); playMusic(null); bossDown('patient');
      hazards.forEach(h => (h.t = 0)); for (const s of shots) removeShot(s); shots = [];
      for (const en of enemies) killEnemy(en, true);
    }
    return true;
  }
  return false;
}
function upPatient(dt) {
  const e = boss, Pt = e.Pt, fast = e.hp < e.max * 0.5 ? 0.8 : 1;
  e.podOpen -= dt;
  const open = e.podOpen > 0;
  for (const r of Pt.ribs) r.children[0].rotation.x = damp(r.children[0].rotation.x, open ? 1.9 : 0.6, 6, dt);
  Pt.coreGlow.material.opacity = damp(Pt.coreGlow.material.opacity, open ? 1 : 0.2, 6, dt);
  Pt.core.scale.setScalar(open ? 1.2 + Math.sin(e.t * 12) * 0.15 : 0.8);
  Pt.tentacle.rotation.x = Math.sin(e.t * 2.3) * 0.5 - 0.6; Pt.tentacle.rotation.z = Math.cos(e.t * 1.7) * 0.4;
  Pt.eyeGlow.material.opacity = 0.7 + Math.random() * 0.3;
  L.boss.position.set(e.x, 10, e.z + 10); L.boss.intensity = open ? 8 : 3;
  const run = (k = 1) => { legSwing(Pt.legs, e.t * 9, 0.5 * k); Pt.body.position.y = 1.4 + Math.abs(Math.sin(e.t * 9)) * 0.08 * k; };
  if (e.st !== 'dying') e.g.rotation.y = damp(e.g.rotation.y, Math.atan2(P.x - e.x, PZ - e.z), 5, dt);
  switch (e.st) {
    case 'enter':
      e.z = Math.min(-26, e.z + 9 * dt); run();
      if (e.z >= -26) { e.st = 'idle'; e.stT = 1.2; e.ready = true; sfx.roar(); sfx.scream(); G.shake = 0.6; }
      break;
    case 'idle':
      e.stT -= dt; run(0.6);
      e.x = damp(e.x, e.tx, 1.5, dt);
      if (e.stT <= 0) {
        const p = PZ_SEQ[e.seq++ % PZ_SEQ.length];
        e.tx = rnd(-5, 5);
        if (p === 'leap') { e.st = 'leapWind'; e.stT = 0.7 * fast; H.warn('JUMP!', '#ffb02e', 1.4); }
        if (p === 'throw') { e.st = 'throwWind'; e.stT = 0.9 * fast; e.log = J.makeLog(); e.log.scale.setScalar(0.25); Pt.hand.add(e.log); H.warn('SHOOT IT OR DASH!', '#ff9a2a', 1.2); }
        if (p === 'grab') { e.st = 'grabWind'; e.stT = 0.9 * fast; e.lockX = P.x; e.marker = MD.mesh(new THREE.RingGeometry(1.0, 1.5, 24), MD.addGlow(0xff2050, 0.9), e.lockX, 0.06, PZ - 0.3, scene); e.marker.rotation.x = -Math.PI / 2; e.extra.push(e.marker); H.warn('DASH!', '#5ad8ff', 1); sfx.charge(); }
        if (p === 'scream') { e.st = 'scream'; e.stT = 1.4; sfx.roar(); sfx.scream(); H.warn('IT IS SCREAMING!', '#ff4af0', 1.4, true); }
      }
      break;
    case 'leapWind':
      e.stT -= dt;
      Pt.body.position.y = damp(Pt.body.position.y, 0.9, 8, dt);
      if (e.stT <= 0) { e.st = 'leapAir'; e.stT = 0.9; e.l0 = e.z; }
      break;
    case 'leapAir': {
      e.stT -= dt;
      const k = 1 - Math.max(0, e.stT) / 0.9;
      e.z = lerp(e.l0, -12, k); e.y = Math.sin(k * Math.PI) * 9;
      Pt.arms[0].rotation.x = Pt.arms[1].rotation.x = -2.8;
      if (e.stT <= 0) {
        e.y = 0;
        spawnRing(e.x, e.z + 2, 13, 15, 0xff2ad0);
        sfx.slam(); G.shake = 0.9;
        fxBig.burst(tmp.set(e.x, 0.5, e.z + 2), 0x6a4a20, 40, 12, 0.8, -8);
        e.st = 'leapBack'; e.stT = 1.3;
      }
      break;
    }
    case 'leapBack':
      e.stT -= dt; run();
      Pt.arms[0].rotation.x = damp(Pt.arms[0].rotation.x, -0.3, 4, dt); Pt.arms[1].rotation.x = damp(Pt.arms[1].rotation.x, -0.2, 4, dt);
      e.z = damp(e.z, -26, 2, dt);
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 0.8 * fast; }
      break;
    case 'throwWind':
      e.stT -= dt; run(0.4);
      Pt.arms[1].rotation.x = damp(Pt.arms[1].rotation.x, -2.9, 6, dt);
      if (e.stT <= 0) {
        Pt.hand.getWorldPosition(tmp);
        Pt.hand.remove(e.log); e.log = null;
        const target = tmp2.set(P.x, 1.8, PZ);
        const s = makeShot('log', tmp, target.clone().sub(tmp).normalize().multiplyScalar(17), { r: 1.2, hp: 4, dmg: 14, grav: 0 });
        s.mesh.scale.setScalar(0.9);
        sfx.whoosh();
        Pt.arms[1].rotation.x = 0.6;
        e.st = 'idle'; e.stT = 1.1 * fast;
      }
      break;
    case 'grabWind':
      e.stT -= dt;
      e.marker.scale.setScalar(1 + Math.sin(e.t * 20) * 0.1);
      Pt.tentacle.rotation.x = -2.2;
      if (e.stT <= 0) {
        e.st = 'grabHit'; e.stT = 0.35;
        Pt.tentacle.getWorldPosition(tmp);
        e.whip = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), MD.addGlow(0xff2ad0, 0.9), 0, 0, 0, scene);
        e.extra.push(e.whip);
        beamBetween(e.whip, tmp, tmp2.set(e.lockX, 0.2, PZ - 0.4), 0.5);
        sfx.slam(); G.shake = 0.5;
        if (Math.abs(P.x - e.lockX) < 1.5) hurt(16);
        fxBig.burst(tmp2, 0xff2ad0, 20, 8, 0.6, -6);
      }
      break;
    case 'grabHit':
      e.stT -= dt;
      if (e.stT <= 0) { scene.remove(e.whip); scene.remove(e.marker); e.st = 'idle'; e.stT = 1.0 * fast; }
      break;
    case 'scream':
      e.stT -= dt;
      Pt.head.rotation.x = -0.6; Pt.jaw.rotation.x = 1.0;
      G.shake = Math.max(G.shake, 0.3);
      if (e.stT <= 0) {
        const n = e.hp < e.max * 0.5 ? 3 : 2;
        for (let i = 0; i < n; i++) spawnEnemy('mutant', { x: (i % 2 ? 1 : -1) * rnd(7, 11), z: e.z + rnd(-2, 4) });
        e.podOpen = 5.5; e.st = 'open'; e.stT = 5.5;
        H.warn('PARASITE EXPOSED!', '#ff4af0', 1.8, true);
        if (!e.said.pod) { e.said.pod = 1; H.bark('nova', 'Its chest is open! Shoot the parasite now!', 1.2); }
      }
      break;
    case 'open':
      e.stT -= dt; run(0.3);
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 1.0 * fast; }
      break;
    case 'dying':
      e.stT -= dt;
      G.shake = Math.max(G.shake, 0.4);
      e.g.rotation.x = damp(e.g.rotation.x, 0.5, 1.2, dt);
      Pt.core.scale.setScalar(1 + Math.sin(e.t * 30) * 0.4 + (4 - e.stT) * 0.3);
      if (Math.random() < 0.5) {
        const w = pick(e.ws);
        tmp.copy(w.c).add(tmp2.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(w.r));
        fxBig.burst(tmp, pick([0xff4af0, 0x9aff7a, 0xffffff]), 12, 9, 0.6, -3);
        if (Math.random() < 0.3) sfx.kill();
      }
      if (e.stT <= 0) {
        tmp.set(e.x, 7, e.z);
        fxBig.burst(tmp, 0xff4af0, 120, 26, 1.3, -3); fx.burst(tmp, 0xffffff, 60, 20, 0.6, 0);
        debris.burst(tmp, [0x8a9a7a, 0x8a1a8a, 0x6a2aff], 24, 12, 0.7);
        sfx.boom(); sfx.bigkill(); flashT = 0.6; G.shake = 1.4;
        scene.remove(e.g); e.extra.forEach(m => scene.remove(m));
        boss = null;
        missionClear();
        return;
      }
      break;
  }
  e.g.position.set(e.x, e.y, e.z);
}

// ===== Enemy shots, shockwaves and other hazards =====
const SHOT_COL = { bolt: 0x6dff3a, blade: 0xd070ff, bomb: 0xff8a20, orb: 0xff4af0, acid: 0xc8ff20, mud: 0x8a6a30, log: 0x9a6a3a, laser: 0xffa020 };
const LOBBED = { bomb: 1, mud: 1 };
function makeShot(kind, pos, vel, o = {}) {
  const r = o.r || 0.25;
  let mesh;
  if (kind === 'blade') { mesh = MD.cyl(r, r, 0.08, MD.glow(0xe8b0ff), 0, 0, 0, null, 10); }
  else if (kind === 'log') { mesh = J.makeLog(); }
  else if (kind === 'mud') { mesh = MD.ball(r, MD.lam(0x4a3a1a, { emissive: 0x6a4a10, emissiveIntensity: 0.5 }), 0, 0, 0, null, 1); }
  else mesh = MD.ball(r, MD.glow(kind === 'bomb' ? 0xffb050 : SHOT_COL[kind]), 0, 0, 0, null, 1);
  mesh.position.copy(pos); scene.add(mesh);
  const glow = MD.glowSprite(SHOT_COL[kind], r * 5, 0.9); glow.position.copy(pos); scene.add(glow);
  const s = { kind, pos: pos.clone(), vel: vel.clone(), r, hp: o.hp || 1, dmg: o.dmg || 6, life: o.life || 7, grav: o.grav || 0, shootable: o.shootable ?? true, mesh, glow, dead: false };
  shots.push(s);
  return s;
}
function removeShot(s) { scene.remove(s.mesh); scene.remove(s.glow); s.dead = true; }
function popShot(s, byPlayer) {
  removeShot(s);
  fx.burst(s.pos, SHOT_COL[s.kind], 14, 6, 0.4, -4);
  if (LOBBED[s.kind]) {
    fxBig.burst(s.pos, s.kind === 'mud' ? 0x8a6a30 : 0xff8a20, 24, 8, 0.6, -4); sfx.boom();
    if (!byPlayer && Math.hypot(s.pos.x - P.x, s.pos.z - PZ) < 2.6 && P.y < 2) hurt(s.dmg);
  } else if (byPlayer) sfx.hit();
}
function updateShots(dt) {
  const head = headPos(new THREE.Vector3()), chest = new THREE.Vector3(P.x, 1.4 + P.y, PZ);
  for (const s of shots) {
    if (s.dead) continue;
    s.vel.y += s.grav * dt;
    s.pos.addScaledVector(s.vel, dt); s.life -= dt;
    s.mesh.position.copy(s.pos); s.glow.position.copy(s.pos);
    if (s.kind === 'blade') { s.mesh.rotation.y += dt * 20; s.mesh.rotation.x = 0.3; }
    else if (s.kind === 'log') { s.mesh.rotation.y += dt * 3; s.mesh.rotation.x += dt * 5; }
    else s.mesh.rotation.y += dt * 4;
    if (LOBBED[s.kind]) {
      s.glow.scale.setScalar(s.r * 5 * (1 + Math.sin(G.time * 20) * 0.2));
      if (s.pos.y < 0.3) { popShot(s, false); continue; }
    } else if (!P.dead && (s.pos.distanceTo(head) < s.r + 0.6 || s.pos.distanceTo(chest) < s.r + 0.6)) {
      hurt(s.dmg); popShot(s, false); continue;
    }
    if (s.life <= 0 || s.pos.z > PZ + 4 || s.pos.y < -1) removeShot(s);
  }
  shots = shots.filter(s => !s.dead);
}
const ringWallGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), ringFlatGeo = new THREE.RingGeometry(0.9, 1, 40);
function spawnRing(x, z, speed, dmg, color, max = 30) {
  const wall = new THREE.Mesh(ringWallGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const flat = new THREE.Mesh(ringFlatGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flat.rotation.x = -Math.PI / 2;
  wall.position.set(x, 0.5, z); flat.position.set(x, 0.04, z);
  scene.add(wall); scene.add(flat);
  rings.push({ x, z, r: 0.5, speed, dmg, max, wall, flat, hit: false });
}
function updateRings(dt) {
  for (const r of rings) {
    r.r += r.speed * dt;
    r.wall.scale.set(r.r, 1.0, r.r); r.flat.scale.set(r.r, r.r, 1);
    const o = Math.max(0, 1 - r.r / r.max);
    r.wall.material.opacity = Math.min(1, 1.3 * o); r.flat.material.opacity = o;
    const d = Math.hypot(P.x - r.x, PZ - r.z);
    if (!r.hit && Math.abs(r.r - d) < 0.6 && P.y < 0.7) { r.hit = true; hurt(r.dmg); }
    if (Math.random() < 0.5) { const a = rnd(0, Math.PI * 2); fx.spawn(r.x + Math.cos(a) * r.r, 0.2, r.z + Math.sin(a) * r.r, 0, 2, 0, r.wall.material.color.getHex(), 0.4); }
    if (r.r > r.max) { scene.remove(r.wall); scene.remove(r.flat); r.dead = true; }
  }
  rings = rings.filter(r => !r.dead);
}
function makeHazardStreak(from, b) {
  const a = from.clone(), m = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 5, 1, true), MD.addGlow(0xffa0a0, 1), 0, 0, 0, scene);
  tmp.subVectors(b, a).normalize().multiplyScalar(40).add(a);
  beamBetween(m, a, tmp, 0.08);
  hazards.push({ kind: 'streak', mesh: m, t: 0.18 });
}
function updateHazards(dt) {
  for (const h of hazards) {
    h.t -= dt;
    if (h.kind === 'streak') { h.mesh.material.opacity = Math.max(0, h.t / 0.18); }
    else if (h.kind === 'crescent') {
      h.z += h.speed * dt; h.mesh.position.z = h.z;
      h.mesh.material.opacity = 0.7 + Math.sin(G.time * 30) * 0.2;
      if (!h.checked && h.z > PZ - 0.3) {
        h.checked = true;
        if (h.low ? P.y < 1.1 : Math.abs(P.x - h.x) < 1.4) hurt(18);
      }
      if (Math.random() < 0.6) fx.spawn(h.x + (h.low ? rnd(-4.5, 4.5) : 0), h.low ? 0.7 : rnd(0, 6), h.z, 0, 0, -3, 0xc070ff, 0.4);
      if (h.z > PZ + 6) h.t = 0;
    } else if (h.update) h.update(h, dt);
    if (h.t <= 0) { scene.remove(h.mesh); h.dead = true; }
  }
  hazards = hazards.filter(h => !h.dead);
}

// ===== GENERAL VRAX =====
function spawnVrax() {
  const g = shadows(MD.makeVrax());
  g.scale.setScalar(1.3);
  g.position.set(0, 0, -30);
  scene.add(g);
  const mats = [];
  g.traverse(m => { if (m.material && m.material.emissive) { mats.push(m.material); m.material.userData.e0 = m.material.emissive.getHex(); } });
  boss = {
    type: 'vrax', name: 'GENERAL VRAX', g, Pt: g.userData.parts, hit: g.userData.hit, hp: 220 * DIFFS[G.settings.diff].hp, max: 220 * DIFFS[G.settings.diff].hp,
    x: 0, z: -30, st: 'enter', stT: 0, seq: 0, tx: 0, flash: 0, mats, ready: false, said: {}, t: 0, count: 0,
    hitBall: vraxHit,
  };
  sfx.alarm();
  L.boss.color.setHex(0xb04dff);
}
const VRAX_SEQ = ['wave', 'slam', 'wave', 'summon', 'wave', 'storm'];
function vraxHit(b) {
  const v = boss;
  for (const w of v.ws) {
    if (w.c.distanceTo(b.pos) > w.r + b.r) continue;
    if (v.st === 'enter' || v.st === 'dying') { fx.burst(b.pos, 0xffffff, 6, 4, 0.3, 0); sfx.clink(); return true; }
    const mult = v.st === 'exhausted' ? 3 : 1;
    v.hp -= b.dmg * mult; v.flash = 0.08; hitMarkT = 0.15;
    fx.burst(b.pos, mult > 1 ? 0xffe14a : 0xc070ff, mult > 1 ? 16 : 7, 6, 0.5, -6);
    sfx.hit();
    P.od = Math.min(100, P.od + 0.8);
    if (v.hp <= v.max * 0.66 && !v.said.a) { v.said.a = 1; H.say('vrax', 'You scratched my armour! Unforgivable!', 1.4); }
    if (v.hp <= v.max * 0.33 && !v.said.b) { v.said.b = 1; H.say('vrax', 'Impossible! I am GENERAL VRAX!', 1.2); H.say('unit', 'And I am still here.', 1.2); }
    if (v.hp <= 0) { bossDown('vrax'); v.hp = 0; v.st = 'dying'; v.stT = 3; sfx.roar(); hazards.forEach(h => (h.t = 0)); for (const e of enemies) killEnemy(e, true); playMusic(null); }
    return true;
  }
  return false;
}
function updateBoss(dt) {
  boss.t += dt;
  if (boss.flash > 0) boss.flash -= dt;
  for (const m of boss.mats) m.emissive.setHex(boss.flash > 0 ? 0x664477 : m.userData.e0);
  if (boss.type === 'vrax') upVrax(dt); else if (boss.type === 'patient') upPatient(dt); else upEmperor(dt);
}
function upVrax(dt) {
  const v = boss, Pt = v.Pt, s = Math.sin(v.t * 3);
  const armR = Pt.armR.rotation, fore = Pt.foreR.rotation;
  const pose = (ax, fx2, k = 6) => { armR.x = damp(armR.x, ax, k, dt); fore.x = damp(fore.x, fx2, k, dt); };
  const walk = () => { Pt.legs[0].rotation.x = s * 0.35; Pt.legs[1].rotation.x = -s * 0.35; if (Math.abs(s) > 0.98) { sfx.step(); G.shake = Math.max(G.shake, 0.15); } };
  Pt.bladeGlow.material.opacity = v.st === 'exhausted' ? 0.12 : 0.4 + Math.sin(v.t * 8) * 0.12;
  for (const e of Pt.eyes) e.material.color.setHex(v.st === 'exhausted' ? 0x551018 : 0xff2a44);
  L.boss.position.set(v.x, 6, v.z + 5); L.boss.intensity = v.st === 'dying' ? 0 : 7;
  if (v.st !== 'storm' && v.st !== 'stormWind' && v.st !== 'dying') v.g.rotation.y = damp(v.g.rotation.y, Math.atan2(P.x - v.x, PZ - v.z), 4, dt);
  if (v.st !== 'exhausted' && v.st !== 'dying') { Pt.body.position.y = damp(Pt.body.position.y, 2.6, 4, dt); Pt.torso.rotation.x = damp(Pt.torso.rotation.x, 0, 4, dt); }
  switch (v.st) {
    case 'enter':
      v.z += 2.4 * dt; walk();
      pose(-0.3, -0.6);
      Pt.torso.rotation.x = v.z < -12 ? 0.35 : 0;
      if (v.z >= -6) { v.z = -6; v.st = 'idle'; v.stT = 1.2; v.ready = true; sfx.roar(); }
      break;
    case 'idle':
      v.stT -= dt;
      v.x = damp(v.x, v.tx, 1.2, dt);
      if (Math.abs(v.x - v.tx) > 0.3) walk();
      pose(-0.3, -0.6, 4);
      if (v.stT <= 0) {
        const p = VRAX_SEQ[v.seq++ % VRAX_SEQ.length];
        v.tx = clamp(rnd(-4, 4), -5, 5);
        if (p === 'wave') { v.st = 'waveWind'; v.stT = 1.0; v.low = Math.random() < 0.5; H.warn(v.low ? 'JUMP!' : 'DASH!', v.low ? '#ffb02e' : '#5ad8ff', 1.3); sfx.charge(); }
        if (p === 'slam') { v.st = 'slamWind'; v.stT = 0.7; v.count = 3; H.warn('JUMP!', '#ffb02e', 1.2); }
        if (p === 'summon') { v.st = 'summon'; v.stT = 1.6; v.count = 3; sfx.roar(); H.bark('vrax', pick(['ZIPPITS! ATTACK!', 'Minions! Tear it apart!', 'Get it, my little monsters!']), 1); }
        if (p === 'storm') { v.st = 'stormWind'; v.stT = 1.3; sfx.spin(); H.warn('BLADE STORM!', '#d070ff', 1.5); }
      }
      break;
    case 'waveWind':
      v.stT -= dt;
      if (v.low) pose(-1.3, -0.2, 8); else pose(-3.0, -0.1, 8);
      Pt.armR.rotation.z = damp(Pt.armR.rotation.z, v.low ? 1.2 : 0.2, 8, dt);
      if (v.stT <= 0) {
        sfx.blade();
        const low = v.low, x = low ? 0 : P.x;
        const geo = low ? new THREE.BoxGeometry(10, 0.9, 0.35) : new THREE.BoxGeometry(1.2, 7, 0.35);
        const m = MD.mesh(geo, MD.addGlow(0xc070ff, 0.8), x, low ? 0.6 : 3.5, v.z + 2, scene);
        hazards.push({ kind: 'crescent', mesh: m, low, x, z: v.z + 2, speed: 15, t: 99, checked: false });
        v.st = 'waveRec'; v.stT = 0.8;
      }
      break;
    case 'waveRec':
      v.stT -= dt; pose(0.4, -0.2, 10);
      Pt.armR.rotation.z = damp(Pt.armR.rotation.z, 0.25, 5, dt);
      if (v.stT <= 0) { v.st = 'idle'; v.stT = rnd(0.8, 1.4); }
      break;
    case 'slamWind':
      v.stT -= dt; pose(-3.1, -0.1, 10);
      if (v.stT <= 0) { v.st = 'slamHit'; v.stT = 0.15; }
      break;
    case 'slamHit':
      v.stT -= dt; pose(-0.9, -1.4, 25);
      if (v.stT <= 0) {
        spawnRing(v.x, v.z + 2.5, 13, 15, 0xb04dff);
        sfx.slam(); G.shake = Math.max(G.shake, 0.6);
        fxBig.burst(tmp.set(v.x, 0.3, v.z + 3), 0xc070ff, 24, 9, 0.6, -5);
        v.count--;
        if (v.count > 0) { v.st = 'slamWind'; v.stT = 0.6; }
        else exhaust(v, 2.8);
      }
      break;
    case 'summon':
      v.stT -= dt; pose(-2.6, -0.3, 6);
      Pt.armL.rotation.x = damp(Pt.armL.rotation.x, -2.6, 6, dt);
      if (v.count > 0 && v.stT < 1.2 - (3 - v.count) * 0.3) { v.count--; spawnEnemy('zippit', { x: rnd(-3, 3), z: -20 }); }
      if (v.stT <= 0) { v.st = 'idle'; v.stT = 1.2; Pt.armL.rotation.x = -0.2; }
      break;
    case 'stormWind':
      v.stT -= dt;
      v.g.rotation.y += dt * 14;
      pose(-1.5, -0.1, 10); Pt.armR.rotation.z = 1.4;
      if (Math.random() < 0.7) fx.spawn(v.x + rnd(-3, 3), rnd(1, 5), v.z + rnd(-3, 3), 0, 2, 0, 0xd070ff, 0.4);
      if (v.stT <= 0) { v.st = 'storm'; v.stT = 2.2; v.count = 7; v.throwT = 0; }
      break;
    case 'storm':
      v.stT -= dt; v.throwT -= dt;
      v.g.rotation.y += dt * 14;
      if (v.count > 0 && v.throwT <= 0) {
        v.count--; v.throwT = 0.28;
        Pt.bladeCore.getWorldPosition(tmp);
        const target = tmp2.set(clamp(P.x + pick([-3.3, 0, 0, 3.3]) * Math.random(), -4, 4), pick([1.2, 2.6]), PZ);
        makeShot('blade', tmp, target.clone().sub(tmp).normalize().multiplyScalar(13), { r: 0.65, hp: 2, dmg: 12 });
        sfx.blade();
      }
      if (v.stT <= 0) { Pt.armR.rotation.z = 0.25; exhaust(v, 4.5); }
      break;
    case 'exhausted':
      v.stT -= dt;
      Pt.body.position.y = damp(Pt.body.position.y, 1.4, 5, dt);
      Pt.torso.rotation.x = damp(Pt.torso.rotation.x, 0.5, 5, dt);
      pose(-0.2, -0.1, 4);
      if (Math.random() < 0.1) fx.spawn(v.x + rnd(-0.4, 0.4), 6.2, v.z + 1, 0, 1.5, 0.5, 0xffffff, 0.8);
      if (v.stT <= 0) { v.st = 'idle'; v.stT = 0.8; }
      break;
    case 'dying':
      v.stT -= dt;
      v.x += rnd(-0.05, 0.05);
      Pt.body.position.y = damp(Pt.body.position.y, 1.2, 2, dt);
      Pt.torso.rotation.x = damp(Pt.torso.rotation.x, 0.7, 2, dt);
      G.shake = Math.max(G.shake, 0.3);
      if (Math.random() < 0.4) { tmp.set(v.x + rnd(-2, 2), rnd(1, 6), v.z + rnd(-1, 1)); fxBig.burst(tmp, pick([0xc070ff, 0xff4af0, 0xffffff]), 10, 6, 0.5, -3); sfx.hit(); }
      if (v.stT <= 0) {
        tmp.set(v.x, 4, v.z);
        fxBig.burst(tmp, 0xc070ff, 80, 14, 1.0, -6); fx.burst(tmp, 0xffffff, 60, 16, 0.6, 0);
        debris.burst(tmp, [0x17131f, 0x7a24e0, 0xe0a0ff], 20, 10, 0.6);
        sfx.boom(); sfx.bigkill(); G.shake = 1; flashT = 0.3;
        scene.remove(v.g); boss = null;
        missionClear();
        return;
      }
      break;
  }
  v.g.position.set(v.x, 0, v.z);
}
function exhaust(v, time) {
  v.st = 'exhausted'; v.stT = time;
  H.warn('EXHAUSTED! HIT HIM!', '#ffe14a', 1.6, true);
  if (!v.said.ex) { v.said.ex = 1; H.bark('nova', 'He is exhausted! Hit him now, triple damage!', 1.2); }
}

// ===== THE NULL EMPEROR =====
const PORTALS = [[-6, 3, -4], [6, 4, -3], [-3, 5.5, -8], [3.5, 2.5, 0], [0, 6.5, -6]];
let portalGeo = null;
function spawnEmperor() {
  const g = shadows(MD.makeEmperor());
  g.scale.setScalar(4.5);
  g.position.set(0, -40, -30);
  scene.add(g);
  const mats = [];
  g.traverse(m => { if (m.material && m.material.emissive) { mats.push(m.material); m.material.userData.e0 = m.material.emissive.getHex(); } });
  boss = {
    type: 'emperor', name: 'THE NULL EMPEROR', g, Pt: g.userData.parts, hit: g.userData.hit, hp: 260 * DIFFS[G.settings.diff].hp, max: 260 * DIFFS[G.settings.diff].hp,
    st: 'rise', stT: 6, seq: 0, flash: 0, mats, ready: false, said: {}, t: 0, coreOpen: 0, count: 0, extra: [], hitBall: emperorHit,
  };
  sfx.alarm();
  L.boss.color.setHex(0xff4af0);
  setTimeout(() => { if (boss && boss.type === 'emperor') breakWall(); }, 1500);
}
function breakWall() {
  wallBroken = true;
  for (const p of panels) {
    if (!p.near) continue;
    const out = new THREE.Vector3(Math.cos(p.a), 0, Math.sin(p.a));
    p.fly = { v: out.multiplyScalar(rnd(8, 16)).add(new THREE.Vector3(0, rnd(5, 11), 0)), s: new THREE.Vector3(rnd(-3, 3), 0, rnd(-3, 3)), t: 0 };
  }
  doorFrame.visible = false;
  roof.userData.fly = 0.001;
  sfx.boom(); sfx.slam(); G.shake = 1.2; flashT = 0.3;
  debris.burst(tmp.set(0, 3, -14), [0x6a7590, 0x525c78, 0xffa200], 30, 10, 0.6);
  fxBig.burst(tmp, 0xffffff, 40, 12, 0.8, -4);
}
const EMP_SEQ = ['sweep', 'bombs', 'strike', 'shock', 'rift'];
function emperorHit(b) {
  const e = boss;
  for (const w of e.ws) {
    if (w.c.distanceTo(b.pos) > w.r + b.r) continue;
    if (w.tag === 'core' && e.coreOpen > 0 && e.st !== 'dying') {
      e.hp -= b.dmg; e.flash = 0.06; hitMarkT = 0.15;
      fx.burst(b.pos, 0xff4af0, 12, 7, 0.5, -3); sfx.hit();
      P.od = Math.min(100, P.od + 0.8);
      if (e.hp <= e.max * 0.5 && !e.said.half) { e.said.half = 1; H.say('emperor', 'You DARE wound me? I will unmake you!', 1.4); }
      if (e.hp <= 0) {
        e.hp = 0; e.st = 'dying'; e.stT = 4.5; e.coreOpen = 99; sfx.roar(); playMusic(null); bossDown('emperor');
        hazards.forEach(h => (h.t = 0)); for (const s of shots) removeShot(s); shots = [];
        for (const en of enemies) killEnemy(en, true);
      }
    } else {
      fx.burst(b.pos, 0xc8b0ff, 6, 4, 0.3, 0); sfx.clink();
      if (!e.said.armor && e.ready) { e.said.armor = 1; H.bark('patch', 'It bounced off! Wait for the core to open!', 1.2); }
    }
    return true;
  }
  return false;
}
function upEmperor(dt) {
  const e = boss, Pt = e.Pt, fast = e.hp < e.max * 0.5 ? 0.75 : 1;
  updateCore(e.t);
  e.coreOpen -= dt;
  const open = e.coreOpen > 0;
  for (const sh of Pt.shells) sh.g.rotation.y = damp(sh.g.rotation.y, open ? sh.s * 1.5 : 0, 5, dt);
  Pt.coreGlow.material.opacity = damp(Pt.coreGlow.material.opacity, open ? 0.9 : 0.15, 5, dt);
  Pt.core.scale.setScalar(open ? 1 + Math.sin(e.t * 8) * 0.08 : 0.9);
  L.boss.position.set(0, 18, -16); L.boss.intensity = open ? 6 : 2;
  for (const a of Pt.arms) { a.g.rotation.x = -0.4 + a.k * 0.1 + Math.sin(e.t * 1.3 + a.k + a.s) * 0.15; a.f.rotation.x = -0.6 + Math.sin(e.t * 1.7 + a.k) * 0.2; }
  Pt.head.rotation.y = Math.sin(e.t * 0.5) * 0.1;
  const eyeCol = e.st.endsWith('Wind') ? (Math.floor(e.t * 16) % 2 ? 0xffffff : 0xff4af0) : 0x99f6ff;
  for (const ey of Pt.eyes) ey.material.color.setHex(eyeCol);
  const eyePos = () => Pt.eyeMark.getWorldPosition(new THREE.Vector3());
  switch (e.st) {
    case 'rise':
      e.stT -= dt;
      e.g.position.y = lerp(-40, 0, smooth(1 - (e.stT - 0.5) / 5));
      G.shake = Math.max(G.shake, 0.25);
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 1.5; e.ready = true; sfx.roar(); }
      break;
    case 'idle':
      e.stT -= dt;
      if (e.beam) { scene.remove(e.beam); scene.remove(e.beamCore); e.beam = null; }
      if (e.stT <= 0) {
        const p = EMP_SEQ[e.seq++ % EMP_SEQ.length];
        if (p === 'sweep') { e.st = 'sweepWind'; e.stT = 1.2 * fast; H.warn('JUMP!', '#ffb02e', 1.4); sfx.charge(); makeFloorLine(e.stT); }
        if (p === 'strike') { e.st = 'strikeWind'; e.count = 3; startStrike(e, fast); }
        if (p === 'bombs') { e.st = 'bombWind'; e.stT = 0.8; e.count = 5; e.throwT = 0; H.warn('SHOOT THE BOMBS!', '#ff9a2a', 1.6); }
        if (p === 'shock') { e.st = 'shockWind'; e.stT = 1.0 * fast; e.count = 3; H.warn('JUMP!', '#ffb02e', 1.3); }
        if (p === 'rift') { e.st = 'rift'; e.stT = 7; openRift(e); H.warn('RIFT COLLAPSE!', '#ff4af0', 2, true); sfx.alarm(); if (!e.said.rift) { e.said.rift = 1; H.say('emperor', 'Witness the RIFT COLLAPSE!', 1.2); } }
      }
      break;
    case 'sweepWind':
      e.stT -= dt;
      if (e.stT <= 0) {
        e.st = 'sweep'; e.stT = 1.4 * fast; e.dir = pick([-1, 1]); e.beamHit = false; sfx.beam(1.4);
        e.beam = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), MD.addGlow(0xff4af0, 0.9), 0, 0, 0, scene);
        e.beamCore = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), MD.glow(0xffffff), 0, 0, 0, scene);
        e.extra.push(e.beam, e.beamCore);
      }
      break;
    case 'sweep': {
      e.stT -= dt;
      const k = 1 - e.stT / (1.4 * fast), bx = e.dir * lerp(-14, 14, k);
      const from = eyePos(), to = tmp3.set(bx, 0.6, PZ);
      beamBetween(e.beam, from, to, 0.45); beamBetween(e.beamCore, from, to, 0.15);
      fx.spawn(bx, 0.6, PZ, rnd(-3, 3), rnd(2, 5), rnd(-3, 3), 0xff4af0, 0.5, -8);
      if (!e.beamHit && Math.abs(bx - P.x) < 0.9 && P.y < 1.1) { e.beamHit = true; hurt(18); }
      if (e.stT <= 0) { scene.remove(e.beam); scene.remove(e.beamCore); e.st = 'idle'; e.stT = 1.0 * fast; }
      break;
    }
    case 'strikeWind':
      e.stT -= dt;
      e.marker.scale.setScalar(1 + Math.sin(e.t * 20) * 0.1);
      if (e.stT <= 0) {
        e.st = 'strikeFire'; e.stT = 0.35;
        e.column = MD.mesh(new THREE.CylinderGeometry(1, 1, 60, 10, 1, true), MD.addGlow(0xff4af0, 0.9), e.lockX, 30, PZ, scene);
        e.columnCore = MD.mesh(new THREE.CylinderGeometry(0.4, 0.4, 60, 6, 1, true), MD.glow(0xffffff), e.lockX, 30, PZ, scene);
        e.extra.push(e.column, e.columnCore);
        sfx.snipe(); sfx.slam(); G.shake = Math.max(G.shake, 0.4);
        if (Math.abs(P.x - e.lockX) < 1.5) hurt(18);
        fxBig.burst(tmp.set(e.lockX, 0.3, PZ - 0.5), 0xff4af0, 20, 8, 0.6, -6);
      }
      break;
    case 'strikeFire':
      e.stT -= dt;
      e.column.scale.set(1 - (0.35 - e.stT), 1, 1 - (0.35 - e.stT));
      if (e.stT <= 0) {
        scene.remove(e.column); scene.remove(e.columnCore); scene.remove(e.marker);
        e.count--;
        if (e.count > 0) { e.st = 'strikeWind'; startStrike(e, fast); } else { e.st = 'idle'; e.stT = 1.0 * fast; }
      }
      break;
    case 'bombWind':
      e.stT -= dt;
      for (const a of Pt.arms) a.g.rotation.x = damp(a.g.rotation.x, -1.8, 6, dt);
      if (e.stT <= 0) { e.st = 'bombs'; }
      break;
    case 'bombs':
      e.throwT -= dt;
      for (const a of Pt.arms) a.g.rotation.x = -1.2 + Math.sin(e.t * 10 + a.k) * 0.5;
      if (e.count > 0 && e.throwT <= 0) {
        e.count--; e.throwT = 0.35 * fast;
        const arm = pick(Pt.arms);
        arm.hand.getWorldPosition(tmp);
        const T = 2.2, target = tmp2.set(clamp(P.x + rnd(-2.5, 2.5), -6, 6), 0, PZ - rnd(0, 2));
        const vel = new THREE.Vector3((target.x - tmp.x) / T, (target.y - tmp.y) / T + 0.5 * 9 * T, (target.z - tmp.z) / T);
        makeShot('bomb', tmp, vel, { r: 0.6, hp: 1, dmg: 12, grav: -9 });
        sfx.bolt();
      }
      if (e.count <= 0 && e.throwT <= -1.8) { openCore(e, 4); }
      break;
    case 'shockWind':
      e.stT -= dt;
      Pt.arms[4].g.rotation.x = damp(Pt.arms[4].g.rotation.x, -2.5, 8, dt); Pt.arms[5].g.rotation.x = damp(Pt.arms[5].g.rotation.x, -2.5, 8, dt);
      if (e.stT <= 0) {
        spawnRing(0, -12, 12, 15, 0xff4af0, 34);
        sfx.slam(); G.shake = Math.max(G.shake, 0.6);
        fxBig.burst(tmp.set(0, 0.5, -12), 0xff4af0, 30, 10, 0.6, -5);
        e.count--;
        if (e.count > 0) e.stT = 0.75 * fast; else { e.st = 'idle'; e.stT = 1.0 * fast; }
      }
      break;
    case 'rift':
      e.stT -= dt;
      updateRift(e, dt);
      if (e.stT <= 0) { closeRift(e); openCore(e, 6); }
      break;
    case 'open':
      e.stT -= dt;
      if (e.stT <= 0) { e.st = 'idle'; e.stT = 1.2 * fast; H.bark('patch', 'Core is closing! Hang in there!', 0.8); }
      break;
    case 'dying':
      e.stT -= dt;
      G.shake = Math.max(G.shake, 0.5);
      Pt.core.scale.setScalar(1 + Math.sin(e.t * 30) * 0.3 + (4.5 - e.stT) * 0.2);
      if (Math.random() < 0.5) {
        const w = pick(e.ws);
        tmp.copy(w.c).add(tmp2.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(w.r));
        fxBig.burst(tmp, pick([0xff4af0, 0x33e0ff, 0xffffff, 0xff8a20]), 14, 10, 0.6, -2);
        if (Math.random() < 0.3) sfx.boom();
      }
      e.g.position.y -= dt * 1.2;
      if (e.stT <= 0) {
        fxBig.burst(tmp.set(0, 18, -30), 0xffffff, 120, 30, 1.4, -2);
        sfx.boom(); sfx.bigkill(); flashT = 0.8; G.shake = 1.5;
        scene.remove(e.g); e.extra.forEach(m => scene.remove(m));
        boss = null;
        startEnding();
        return;
      }
      break;
  }
}
function openCore(e, time) {
  e.st = 'open'; e.stT = time; e.coreOpen = time;
  H.warn('CORE EXPOSED!', '#ff4af0', 1.8, true);
  sfx.portal();
  if (!e.said.core) { e.said.core = 1; H.bark('nova', 'The core is open! Fire everything at it!', 1.2); }
}
function startStrike(e, fast) {
  e.stT = 0.9 * fast; e.lockX = P.x;
  e.marker = MD.mesh(new THREE.RingGeometry(1.0, 1.5, 24), MD.addGlow(0xff2050, 0.9), e.lockX, 0.06, PZ - 0.3, scene);
  e.marker.rotation.x = -Math.PI / 2;
  e.extra.push(e.marker);
  H.warn('DASH!', '#5ad8ff', 0.9);
  sfx.charge();
}
function makeFloorLine(time) {
  const m = MD.box(30, 0.05, 0.4, MD.addGlow(0xff2050, 0.8), 0, 0.06, PZ - 0.5, scene);
  hazards.push({ kind: 'line', mesh: m, t: time, update: h => { h.mesh.visible = Math.floor(G.time * 12) % 2 === 0; } });
}
function openRift(e) {
  if (!portalGeo) portalGeo = new THREE.CircleGeometry(1.4, 20);
  e.portals = PORTALS.map(([x, y, z], i) => {
    const m = new THREE.Mesh(portalGeo, new THREE.MeshBasicMaterial({ map: TEX.portal, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, y, PZ); m.scale.setScalar(0.01);
    scene.add(m); e.extra.push(m);
    return { m, x, y, z, t: -i * 0.45, fired: 0 };
  });
  sfx.portal();
}
function updateRift(e, dt) {
  for (const p of e.portals) {
    p.t += dt;
    const s = clamp(p.t / 0.5, 0, 1) * (e.stT < 0.6 ? e.stT / 0.6 : 1);
    p.m.scale.setScalar(Math.max(0.01, s));
    p.m.rotation.z += dt * 4;
    if (p.t > 0 && Math.random() < 0.4) fx.spawn(p.x + rnd(-1, 1), p.y + rnd(-1, 1), p.z, rnd(-1, 1), rnd(-1, 1), 2, 0xff4af0, 0.5);
    if ((p.fired === 0 && p.t > 1.0) || (p.fired === 1 && p.t > 3.4)) {
      p.fired++;
      spawnRing(p.x, p.z, 9, 10, 0xd23cff, 26);
      const dir = headPos(tmp2).sub(tmp.set(p.x, p.y, p.z)).normalize().multiplyScalar(9);
      makeShot('orb', tmp, dir, { r: 0.5, hp: 2, dmg: 10 });
      sfx.portal();
      if (e.hp < e.max * 0.5 && p.fired === 1 && Math.random() < 0.5) spawnEnemy('voidfly', { x: p.x, z: p.z });
    }
  }
}
function closeRift(e) { for (const p of e.portals) scene.remove(p.m); e.portals = []; }

// ===== Between missions =====
function openUpgrades() {
  const left = UPGRADES.filter(u => !upgrades.includes(u.id));
  if (!left.length) { startMission(mi + 1); return; }
  upChoices = shuffle(left.slice()).slice(0, 3);
  upSel = 0; phase = 'upgrade'; phaseT = 0;
  G.hud.style.cursor = 'default';
  sfx.select();
}
function chooseUpgrade(i) {
  upgrades.push(upChoices[i].id);
  if (upChoices[i].id === 'laser') unlockBadge('laser');
  sfx.overdrive();
  G.hud.style.cursor = 'none';
  startMission(mi + 1);
}
function startEnding() {
  phase = 'ending'; phaseT = 0;
  // beating chapter 1 unlocks chapter 2 on CONTINUE
  if (M.chapter === 2) clearSave(); else writeSave({ mission: 7, upgrades });
  playMusic('calm');
  for (const [who, s] of M.chapter === 2 ? ENDING2 : ENDING) H.say(who, s, 2);
  // Commander Nova comes to the rescue in person
  if (M.chapter !== 2) {
    nova = shadows(J.makeNova()); nova.scale.setScalar(1.45);
    nova.position.set(0, 0, -16); scene.add(nova);
  }
}
function updateEnding(dt) {
  if (nova) {
    const N = nova.userData.parts, walk = nova.position.z < 3;
    if (walk) nova.position.z += dt * 3;
    nova.rotation.y = 0;
    N.legs[0].rotation.x = walk ? Math.sin(G.time * 8) * 0.5 : 0; N.legs[1].rotation.x = walk ? -Math.sin(G.time * 8) * 0.5 : 0;
    N.arms[1].rotation.set(walk ? Math.sin(G.time * 8) * 0.4 : -2.6 + Math.sin(G.time * 6) * 0.2, 0, walk ? 0 : 0.5);
    N.arms[0].rotation.x = walk ? -Math.sin(G.time * 8) * 0.4 : -1.2;
    N.holo.material.opacity = 0.4 + Math.sin(G.time * 9) * 0.15;
  }
  if (!H.dialogBusy() && phaseT > 3) { phase = 'credits'; phaseT = 0; creditY = 0; }
}

// ===== HUD =====
function drawHUD(dt) {
  const c = G.hctx, W = G.w, Hh = G.h, small = W < 700, t = G.time;
  if (phase === 'card') {
    H.fade(1);
    const n = Math.floor(phaseT * 24), s = missionName();
    H.text(s.slice(0, n), W / 2, Hh / 2 - 10, Math.min(26, W / 22), '#fff', 'center', { glow: '#2a9dff' });
    if (phaseT > 1.4) H.text(M.sub, W / 2, Hh / 2 + 36, Math.min(12, W / 50), '#9fdcff');
    return;
  }
  if (phase === 'credits') {
    H.fade(1);
    phaseT += dt;
    if (H.drawCredits(CREDITS, (creditY += dt * 45)) || (phaseT > 2 && (G.pressed.enter || G.pressed.click))) G.goTitle();
    return;
  }
  // hurt flash
  if (P.hurtT > 0) {
    const g = c.createRadialGradient(W / 2, Hh / 2, Math.min(W, Hh) * 0.25, W / 2, Hh / 2, Math.max(W, Hh) * 0.7);
    g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,20,20,${P.hurtT * 0.7})`);
    c.fillStyle = g; c.fillRect(0, 0, W, Hh);
  }
  if (flashT > 0) H.fade(flashT * 2, '255,255,255');
  // a mutant reached the visor: red flash and static
  if (scareT > 0) {
    H.fade(scareT * 0.9, '160,0,0');
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${rnd(0, 0.25)})`; c.fillRect(0, rnd(0, Hh), W, rnd(1, 5)); }
  }
  H.drawCracks(P.cracks);
  H.drawVisor(P.odT > 0, P.armor / P.max < 0.3 && !P.dead, t);

  // markers over enemies
  for (const e of enemies) {
    if (e.dead || !e.ws || e.alpha < 0.5) continue;
    const top = e.ws[0].c, p = toScreen(tmp.copy(top).add(tmp2.set(0, e.ws[0].r + 0.5, 0)), camera);
    if (p.z > 1) continue;
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > Hh) {
      const ax = clamp(p.x, 24, W - 24), ay = clamp(p.y, 24, Hh - 24);
      c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(ax, ay, 7, 0, 7); c.fill();
      continue;
    }
    if (e.max > 4 && e.hp < e.max) H.bar(p.x - 25, p.y - 6, 50, 7, e.hp / e.max, '#39ff6a');
    if (e.type === 'riftstalker' && e.near) H.text('WEAK SPOT!', p.x, p.y - 18, 8, '#ffe14a');
  }
  // the red laser warning dot when a sniper locks on
  for (const e of enemies) if (e.type === 'riftstalker' && e.st === 'aim' && !e.dead) {
    c.strokeStyle = `rgba(255,40,40,${0.5 + Math.sin(t * 30) * 0.5})`; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, Hh - 6);
  }

  // crosshair
  if (phase !== 'dead' && phase !== 'over' && !paused && phase !== 'upgrade') {
    const mx = (aimNX + 1) * 0.5 * W, my = (1 - aimNY) * 0.5 * Hh;
    const col = P.odT > 0 ? '#c8b0ff' : '#7fe3ff', r = 14 + (P.cool > 0.05 ? 3 : 0);
    c.strokeStyle = col; c.lineWidth = 2;
    c.beginPath(); c.arc(mx, my, r, 0, Math.PI * 2); c.stroke();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(mx + dx * (r - 5), my + dy * (r - 5)); c.lineTo(mx + dx * (r + 7), my + dy * (r + 7)); c.stroke(); }
    c.fillStyle = col; c.fillRect(mx - 1.5, my - 1.5, 3, 3);
    if (hitMarkT > 0) {
      hitMarkT -= dt;
      c.strokeStyle = '#ffffff'; c.lineWidth = 3;
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { c.beginPath(); c.moveTo(mx + dx * 7, my + dy * 7); c.lineTo(mx + dx * 15, my + dy * 15); c.stroke(); }
    }
  }

  // mission name and enemies left
  const tl = 18, fs = small ? 8 : 10;
  H.text(missionName(), tl, 22, fs, '#7fe3ff', 'left', { max: W * 0.5 });
  if (!M.boss && phase === 'fight') H.text(`ALIENS LEFT: ${spawnList.length + enemies.length}`, tl, 40, fs, '#ffffff', 'left');
  // armour, overdrive, repair
  const bw = small ? Math.min(150, W * 0.36) : 240, by = isTouch ? 76 : Hh - 46;
  const ax = isTouch ? tl : 24;
  H.text('ARMOUR', ax, by - 12, fs, '#9fdcff', 'left');
  const af = P.armor / P.max;
  H.bar(ax, by, bw, 16, af, af > 0.5 ? '#2a9dff' : af > 0.25 ? '#ffb02e' : '#ff3030');
  H.text(String(Math.ceil(P.armor)), ax + bw + 8, by + 8, fs, '#fff', 'left');
  const rx = isTouch ? W - tl - bw : W - 24 - bw;
  const odReady = P.od >= 100 && P.odT <= 0;
  H.text(P.odT > 0 ? `OVERDRIVE ${Math.ceil(P.odT)}` : odReady ? (isTouch ? 'OVERDRIVE READY!' : 'OVERDRIVE READY! [SHIFT]') : 'OVERDRIVE', rx, by - 12, fs, odReady && Math.floor(t * 4) % 2 ? '#ffffff' : '#c8b0ff', 'left');
  H.bar(rx, by, bw, 16, P.odT > 0 ? P.odT / (8 + (has('capacitor') ? 4 : 0)) : P.od / 100, P.odT > 0 ? '#ffffff' : '#9a6cff');
  const rr = P.repairCD <= 0;
  H.text(rr ? (isTouch ? 'PATCH REPAIR READY' : 'PATCH REPAIR READY [Q]') : `PATCH REPAIR ${Math.ceil(P.repairCD)}`, isTouch ? ax : ax, by + 30, fs - 1, rr ? '#39ff6a' : '#ff9a3c', 'left');
  // left arm health (for blocking)
  if (P.arm <= 0) H.text(Math.floor(t * 3) % 2 ? 'LEFT ARM BROKEN - NEED REPAIR' : '', ax, by + 48, fs - 1, '#ff4040', 'left');
  else { H.text(P.block ? 'BLOCKING!' : isTouch ? 'ARM' : 'ARM [S]', ax, by + 48, fs - 1, P.block ? '#ffe14a' : '#9fdcff', 'left'); H.bar(ax + (small ? 52 : 80), by + 42, small ? 60 : 90, 10, P.arm / 100, P.arm > 40 ? '#9fdcff' : '#ff9a3c'); }
  // weapon and laser heat
  if (has('laser')) {
    H.text(P.weapon === 2 ? (isTouch ? 'LASER' : 'LASER [2]') : (isTouch ? 'MOON BLASTER' : 'MOON BLASTER [1]'), rx, by + 30, fs - 1, P.weapon === 2 ? '#ffa040' : '#7fe3ff', 'left');
    if (P.weapon === 2) H.bar(rx, by + 42, bw, 10, P.overheat > 0 ? 1 : P.heat, P.overheat > 0 ? '#ff3030' : '#ffa040');
  }
  if (P.blockFlash > 0) { P.blockFlash -= dt; c.strokeStyle = `rgba(255,230,140,${P.blockFlash * 3})`; c.lineWidth = 8; c.strokeRect(4, 4, W - 8, Hh - 8); }
  // boss bar
  if (boss && boss.ready) {
    const w = Math.min(520, W - (isTouch ? 160 : 40)), x0 = (W - w) / 2, y0 = isTouch ? 140 : 62;
    H.text(boss.name, W / 2, y0 - 14, small ? 10 : 13, '#ff4af0', 'center', { glow: '#ff4af0' });
    H.bar(x0, y0, w, 14, boss.hp / boss.max, '#ff4af0');
    let tag = '';
    if (boss.type === 'vrax' && boss.st === 'exhausted') tag = 'EXHAUSTED - TRIPLE DAMAGE!';
    if (boss.type === 'emperor') tag = boss.coreOpen > 0 ? 'CORE EXPOSED!' : 'CORE ARMOURED';
    if (tag) H.text(tag, W / 2, y0 + 28, small ? 8 : 10, boss.coreOpen > 0 || boss.st === 'exhausted' ? '#ffe14a' : '#9a9ab0');
  }
  H.text(`SCORE ${score}`, W - 18, 22, fs + 1, '#ffe14a', 'right');
  drawToast(dt);
  H.drawScan(dt, isTouch ? 196 : 84);
  H.drawWarn(dt);
  H.drawDialog(isTouch ? Hh - 182 : Hh - 84);

  if (phase === 'dead' || phase === 'over') {
    H.fade(Math.min(0.7, phaseT * 0.4));
    for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(255,255,255,${rnd(0, 0.15)})`; c.fillRect(0, rnd(0, Hh), W, rnd(1, 3)); }
    const glitch = Math.random() < 0.15 ? rnd(-6, 6) : 0;
    H.text('UNIT-07 OFFLINE', W / 2 + glitch, Hh * 0.38, Math.min(40, W / 14), '#ff3030', 'center', { glow: '#ff0000' });
    if (phase === 'over') {
      menuRects = H.menu(['RETRY MISSION', 'QUIT TO TITLE'], overSel, W / 2, Hh * 0.55, small ? 12 : 16, 44);
      menuInput(2, i => (overSel = i), overSel, i => {
        if (i === 0) { G.hud.style.cursor = 'none'; startMission(mi); } else G.goTitle();
      });
    }
  }
  if (phase === 'upgrade') drawUpgrades();
  if (paused) {
    H.fade(0.6);
    H.text('PAUSED', W / 2, Hh * 0.32, Math.min(36, W / 14), '#7fe3ff', 'center', { glow: '#2a9dff' });
    menuRects = H.menu(['RESUME', 'RESTART MISSION', 'QUIT TO TITLE'], pauseSel, W / 2, Hh * 0.48, small ? 12 : 16, 44);
    menuInput(3, i => (pauseSel = i), pauseSel, i => {
      paused = false; G.hud.style.cursor = 'none';
      if (i === 1) startMission(mi);
      if (i === 2) G.goTitle();
    });
  }
}
function menuInput(n, setSel, sel, act) {
  const pr = G.pressed, m = G.mouse;
  if (pr.arrowdown || pr.s) { setSel((sel + 1) % n); sfx.ui(); }
  if (pr.arrowup || pr.w) { setSel((sel + n - 1) % n); sfx.ui(); }
  const hit = H.hitRect(menuRects, m.x, m.y);
  if (hit && hit.i !== sel && m.moved) { setSel(hit.i); }
  m.moved = false;
  if (pr.enter || pr.space) { sfx.select(); act(sel); }
  else if (pr.click && hit) { sfx.select(); act(hit.i); }
}
function drawUpgrades() {
  const W = G.w, Hh = G.h, small = W < 700, c = G.hctx;
  H.fade(0.75);
  c.imageSmoothingEnabled = false;
  const ps = small ? 48 : 72;
  c.drawImage(H.portrait('nova'), W / 2 - ps / 2, Hh * 0.08, ps, ps);
  H.text('COMMANDER NOVA', W / 2, Hh * 0.08 + ps + 16, small ? 9 : 11, '#5ab8ff');
  H.text('Weapon upgrades unlocked. Choose one.', W / 2, Hh * 0.08 + ps + 40, small ? 9 : 12, '#fff');
  const n = upChoices.length, cw = small ? W - 40 : Math.min(260, (W - 80) / 3), chh = small ? 74 : 150;
  const rects = [];
  upChoices.forEach((u, i) => {
    const x = small ? 20 : W / 2 - (n * cw + (n - 1) * 20) / 2 + i * (cw + 20);
    const y = small ? Hh * 0.38 + i * (chh + 12) : Hh * 0.45;
    const on = i === upSel;
    H.panel(x, y, cw, chh, on ? '#7fe3ff' : '#2a5a9f', on ? 'rgba(20,50,90,0.95)' : 'rgba(4,10,28,0.9)');
    H.text(`${i + 1}`, x + 18, y + 20, 12, '#ffe14a', 'left', { stroke: false });
    H.text(u.name, x + cw / 2, y + (small ? 26 : 50), small ? 10 : 12, on ? '#ffffff' : '#c9d3e0', 'center', { max: cw - 20, stroke: false });
    H.wrap(u.desc, cw - 24, small ? 8 : 9).forEach((l, k) => H.text(l, x + cw / 2, y + (small ? 50 : 90) + k * 16, small ? 8 : 9, '#9fdcff', 'center', { stroke: false }));
    rects.push({ x, y, w: cw, h: chh, i });
  });
  const pr = G.pressed, m = G.mouse;
  if (pr.arrowright || pr.arrowdown || pr.d || pr.s) { upSel = (upSel + 1) % n; sfx.ui(); }
  if (pr.arrowleft || pr.arrowup || pr.a || pr.w) { upSel = (upSel + n - 1) % n; sfx.ui(); }
  const hit = H.hitRect(rects, m.x, m.y);
  if (hit && m.moved) upSel = hit.i;
  m.moved = false;
  for (let k = 0; k < n; k++) if (pr[String(k + 1)]) { chooseUpgrade(k); return; }
  if (phaseT > 0.5 && (pr.enter || pr.space)) chooseUpgrade(upSel);
  else if (phaseT > 0.5 && pr.click && hit) chooseUpgrade(hit.i);
}

// for tests and screenshots
export const debug = {
  get P() { return P; }, get enemies() { return enemies; }, get boss() { return boss; }, get phase() { return phase; },
  get mission() { return mi; }, set aim(v) { aimNX = v[0]; aimNY = v[1]; G.mouse.nx = v[0]; G.mouse.ny = v[1]; },
  spawn: spawnEnemy, hurt, openUpgrades, startMission, camera: () => camera,
  skipIntro() { H.clearDialog(); },
  speaking: () => H.speaking(),
  get upgrades() { return upgrades; },
  get scanned() { return [...scanned]; },
  clearMission() { spawnList = []; for (const e of enemies) killEnemy(e, true); },
  fillOD() { P.od = 100; },
};
