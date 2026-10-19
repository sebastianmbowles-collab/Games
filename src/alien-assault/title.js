import { THREE, resize, toScreen } from './engine.js';
import { G, GFX, isTouch, rnd, clamp, lerp, smooth, pick, damp, loadSave, saveSettings } from './state.js';
import { sfx, playMusic, applyVolumes } from './audio.js';
import { TEX } from './textures.js';
import * as MD from './models.js';
import { Particles } from './fx.js';
import { CREDITS } from './data.js';
import * as H from './hud.js';

let scene, camera, unit, UP, patch, PP, fx, smoke, hemi, flashLight, scanBeam;
let brute, vrax, voidfly, zippits = [], asteroids = [], ships = [], bolts = [], booms = [], fires = [], bigShip;
let t = 0, menu = 'main', sel = 0, setSel = 0, rects = [], lastMX = -1, lastMY = -1;
let lightningT = 3, flick = 0, boltMesh = null, boltT = 0, startT = 0, creditY = 0, quitT = 0, showControls = false;
const CAM0 = new THREE.Vector3(0, 3.4, 12.5), LOOK0 = new THREE.Vector3(0, 6.4, 0);
const UPV = new THREE.Vector3(0, 1, 0), tmp = new THREE.Vector3();

const MAIN = ['PLAY', 'CONTINUE', 'SETTINGS', 'CREDITS', 'QUIT'];

function makeShip(scale, lights = 0x39ff6a) {
  const g = new THREE.Group();
  MD.cyl(30, 40, 6, MD.phong(0x2a1a3a, { shininess: 90 }), 0, 0, 0, g, 16);
  MD.cyl(40, 26, 4, MD.phong(0x1a1024), 0, -5, 0, g, 16);
  MD.mesh(new THREE.SphereGeometry(14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MD.phong(0x6a2aa0, { shininess: 120 }), 0, 3, 0, g);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    MD.ball(1.2, MD.glow(i % 2 ? lights : 0xff3df0), Math.cos(a) * 38, -2, Math.sin(a) * 38, g, 0);
  }
  const under = MD.mesh(new THREE.CircleGeometry(16, 16), MD.addGlow(lights, 0.6), 0, -7.1, 0, g);
  under.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) MD.cone(2, 14, MD.phong(0x1a1024), s * 20, 8, 0, g, 4);
  g.scale.setScalar(scale);
  return g;
}
function makeRuin(x, z) {
  const g = new THREE.Group(), h = rnd(5, 22), w = rnd(3, 8);
  const mat = MD.lam(pick([0x4a5070, 0x3c4260, 0x56506e]));
  MD.box(w, h, w, mat, 0, h / 2, 0, g);
  const top = MD.box(w * 0.7, rnd(2, 5), w * 0.8, mat, rnd(-1, 1), h + 1, 0, g);
  top.rotation.set(rnd(-0.5, 0.5), rnd(0, 1), rnd(-0.6, 0.6));
  const win = MD.glow(pick([0xffb030, 0xff7a20, 0x7fe3ff]));
  for (let i = 0; i < 6; i++) if (Math.random() < 0.6) MD.box(0.6, 0.8, 0.1, win, rnd(-w / 2 + 0.6, w / 2 - 0.6), rnd(1.5, h - 1), w / 2 + 0.05, g);
  MD.box(w * 0.5, h * 0.3, 0.2, MD.lam(0x15101e), rnd(-w / 4, w / 4), h * rnd(0.3, 0.8), w / 2 + 0.06, g);
  g.position.set(x, 0, z);
  g.rotation.y = rnd(-0.4, 0.4);
  return g;
}

export function buildTitle() {
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x3a0d5c, 40, 260);
  scene.background = new THREE.Color(0x12021e);
  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 700);
  camera.userData.baseFov = 55;
  G.cameras.push(camera);

  const sky = MD.mesh(new THREE.SphereGeometry(450, 24, 16), new THREE.MeshBasicMaterial({ map: TEX.sky, side: THREE.BackSide, fog: false }), 0, -40, 0, scene);
  sky.rotation.y = 1.2;
  MD.makeStars(scene);
  const gg = new THREE.PlaneGeometry(700, 700, 40, 40);
  const pa = gg.attributes.position;
  for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i); if (Math.hypot(x, y + 20) > 30) pa.setZ(i, Math.random() * 2.5 + Math.max(0, -y - 150) * 0.08); }
  gg.computeVertexNormals();
  MD.mesh(gg, MD.lam(0xb070d8, { map: TEX.ground }), 0, 0, 0, scene).rotation.x = -Math.PI / 2;

  scene.add(new THREE.AmbientLight(0x6a4a9a, 0.7));
  hemi = new THREE.HemisphereLight(0xc08aff, 0x200a28, 1.0); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xd6ecff, 1.5); key.position.set(6, 12, 16); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3dd0, 2.2); rim.position.set(-10, 8, -12); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x39ff6a, 1.2); rim2.position.set(12, 4, -8); scene.add(rim2);
  const vis = new THREE.PointLight(0x33aaff, 2.5, 5, 0); vis.position.set(0, 5.6, 2.2); scene.add(vis);
  flashLight = new THREE.PointLight(0xc8b0ff, 0, 400, 0); flashLight.position.set(0, 120, -80); scene.add(flashLight);

  // ruined human colony
  for (let i = 0; i < 34; i++) {
    const x = rnd(-90, 90), z = rnd(-30, -140);
    if (Math.abs(x) < 9 && z > -45) continue;
    scene.add(makeRuin(x, z));
  }
  const dome = MD.mesh(new THREE.SphereGeometry(12, 14, 8, 0, Math.PI * 1.4, 0, Math.PI / 2), MD.lam(0xa8c8ff, { side: THREE.DoubleSide }), -34, 0, -70, scene);
  dome.rotation.y = 0.8;
  // fires among the ruins
  for (let i = 0; i < 12; i++) {
    const s = MD.glowSprite(pick([0xff6a00, 0xff9a20, 0xff3a10]), rnd(4, 9), 0.9);
    s.position.set(rnd(-70, 70), rnd(1, 10), rnd(-35, -120)); scene.add(s);
    fires.push({ s, base: s.scale.x, ph: rnd(0, 9) });
  }
  // glowing green asteroids
  for (let i = 0; i < 16; i++) {
    const r = rnd(2, 11);
    const a = MD.ball(r, new THREE.MeshLambertMaterial({ color: 0x3aff6a, emissive: 0x18a83a, flatShading: true }), rnd(-200, 200), rnd(50, 170), rnd(-160, -320), scene, 0);
    a.scale.set(1, rnd(0.6, 1), rnd(0.7, 1.2));
    const gl = MD.glowSprite(0x39ff6a, r * 3.5, 0.45); gl.position.copy(a.position); scene.add(gl);
    asteroids.push({ m: a, spin: new THREE.Vector3(rnd(-0.3, 0.3), rnd(-0.3, 0.3), 0) });
  }
  // enormous alien spaceships over the colony
  for (const [x, y, z, s, l] of [[-70, 75, -210, 1, 0x39ff6a], [100, 95, -270, 0.8, 0xff3df0], [15, 62, -160, 0.55, 0x39ff6a]]) {
    const sh = makeShip(s, l); sh.position.set(x, y, z); sh.rotation.z = rnd(-0.08, 0.08); scene.add(sh);
    MD.mesh(new THREE.ConeGeometry(12, 70, 12, 1, true), MD.addGlow(l, 0.12), 0, -40, 0, sh);
    ships.push({ g: sh, base: sh.position.clone(), ph: rnd(0, 9) });
  }
  // the ship the camera zooms toward when you press PLAY
  bigShip = makeShip(0.18, 0xff3df0); bigShip.visible = false; scene.add(bigShip);

  // UNIT-07, center stage
  unit = MD.makeUnit07(); UP = unit.userData.parts; scene.add(unit);
  // Patch floating beside it
  patch = MD.makePatch(); PP = patch.userData.parts; patch.scale.setScalar(1.7); patch.position.set(-3.4, 6.2, 2.2); scene.add(patch);
  scanBeam = MD.mesh(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true), MD.addGlow(0x33bbff, 0.5), 0, 0, 0, scene);
  // Bruteclaw towering over Zippits
  brute = MD.makeBruteclaw(); brute.scale.setScalar(1.6); brute.position.set(-11, 0, -22); brute.rotation.y = 0.35; scene.add(brute);
  for (let i = 0; i < 7; i++) {
    const z = MD.makeZippit(); z.scale.setScalar(1.3); z.position.set(-40 + i * 11, 0, rnd(-15, -20)); z.rotation.y = Math.PI / 2;
    scene.add(z); zippits.push({ g: z, P: z.userData.parts, ph: rnd(0, 9), sp: rnd(2.5, 3.5) });
  }
  // Voidfly hovering above the battlefield
  voidfly = MD.makeVoidfly(); voidfly.scale.setScalar(1.8); voidfly.position.set(9, 8, -14); voidfly.rotation.y = -0.4; scene.add(voidfly);
  // General Vrax on a distant cliff
  const cliff = MD.cyl(6, 14, 16, MD.lam(0x2a0f3c), 50, 8, -66, scene, 7);
  cliff.rotation.y = 0.4;
  MD.cyl(3, 6, 8, MD.lam(0x35134a), 43, 4, -60, scene, 6);
  vrax = MD.makeVrax(); vrax.scale.setScalar(2.4); vrax.position.set(50, 16, -66); vrax.rotation.y = -0.6; scene.add(vrax);
  const vp = vrax.userData.parts; vp.armR.rotation.set(-2.7, 0, 0.3); vp.foreR.rotation.x = -0.2;
  const vglow = new THREE.PointLight(0xb04dff, 30, 30, 0); vglow.position.set(48, 26, -58); scene.add(vglow);

  // laser bolts streaking across the sky
  for (let i = 0; i < 10; i++) {
    const c = pick([0x3dff6a, 0xff3d6a, 0x3d9dff]);
    const m = MD.box(0.3, 0.3, 7, MD.glow(c, { fog: false }), 0, 0, 0, scene);
    bolts.push({ m, v: new THREE.Vector3() }); resetBolt(bolts[i], true);
  }
  for (let i = 0; i < 8; i++) {
    const m = MD.ball(1, MD.addGlow(0xff8a20, 0.9), 0, -50, 0, scene, 1);
    const s = MD.glowSprite(0xffa040, 1, 0.9); scene.add(s);
    booms.push({ m, s, t: rnd(-3, 0), x: rnd(-80, 80), y: rnd(0, 18), z: rnd(-40, -150) });
  }
  fx = new Particles(scene, 500, 0.35);
  smoke = new Particles(scene, 200, 3.5);
}
function resetBolt(b, anywhere) {
  const dir = Math.random() < 0.5 ? 1 : -1;
  b.m.position.set(anywhere ? rnd(-150, 150) : -dir * 180, rnd(15, 80), rnd(-50, -200));
  b.v.set(dir * rnd(80, 150), rnd(-15, 15), rnd(-20, 20));
  b.m.lookAt(tmp.copy(b.m.position).add(b.v));
}

export const Title = {
  enter() {
    menu = 'main'; sel = 0; t = 0; startT = 0;
    camera.position.copy(CAM0); camera.fov = 55; camera.userData.baseFov = 55; resize();
    bigShip.visible = false;
    UP.armR.rotation.set(-0.55, 0, 0.12); UP.foreR.rotation.x = -0.9;
    playMusic('title');
    G.hud.style.cursor = 'default';
    if (!loadSave() && sel === 1) sel = 0;
  },
  update(dt) {
    t += dt;
    animate(dt);
    input();
    G.renderer.render(scene, camera);
    draw(dt);
  },
};

function animate(dt) {
  // camera: slow drift, or the PLAY zoom
  if (menu !== 'start') {
    camera.position.set(CAM0.x + Math.sin(t * 0.25) * 0.8, CAM0.y + Math.sin(t * 0.4) * 0.2, CAM0.z);
    camera.lookAt(LOOK0);
  }
  // UNIT-07 idle: breathing, visor pulse, sparks
  UP.torso.rotation.y = Math.sin(t * 0.7) * 0.04;
  UP.head.rotation.y = Math.sin(t * 0.5) * 0.12;
  UP.visor.material.color.setHSL(0.55, 1, 0.55 + Math.sin(t * 3) * 0.1);
  UP.tip.visible = Math.sin(t * 5) > -0.3;
  if (Math.random() < 0.5) {
    const s = pick([[-1.4, 3.9, 0.2], [1.4, 3.9, 0.2], [0, 4.8, 0.5], [-1.4, 2.6, 0.2], [0.6, 1.5, 0.4], [1.6, 2.2, 0.6]]);
    tmp.set(s[0] + rnd(-0.3, 0.3), s[1] + rnd(-0.3, 0.3), s[2]);
    for (let k = 0; k < 3; k++) fx.spawn(tmp.x, tmp.y, tmp.z, rnd(-3, 3), rnd(-1, 3), rnd(-1, 3), pick([0x55c8ff, 0xb8ecff, 0x2a7cff]), rnd(0.15, 0.35), -6);
  }
  // Patch bobs and scans the battlefield with a blue laser
  patch.position.y = 6.2 + Math.sin(t * 2.2) * 0.25;
  PP.tip.visible = Math.sin(t * 7) > 0;
  const scanOn = Math.sin(t * 0.9) > 0.35;
  scanBeam.visible = scanOn;
  if (!scanOn) { patch.rotation.set(0, damp(patch.rotation.y, 0.5, 4, 1 / 60), 0); }
  else {
    const eye = PP.eyeMark.getWorldPosition(new THREE.Vector3());
    const target = new THREE.Vector3(Math.sin(t * 1.3) * 18 - 4, 0.2, -16 + Math.cos(t * 0.9) * 6);
    beamBetween(scanBeam, eye, target, 0.04);
    patch.lookAt(target);
  }
  // Bruteclaw breathes and flexes all four arms
  const bp = brute.userData.parts;
  bp.body.position.y = 2.6 + Math.sin(t * 1.5) * 0.08;
  for (const a of bp.arms) a.g.rotation.x = (a.upper ? -0.6 : -0.4) + Math.sin(t * 1.5 + a.s) * 0.25;
  bp.chestGlow.material.opacity = 0.6 + Math.sin(t * 4) * 0.3;
  // Zippits march across the wreckage
  for (const z of zippits) {
    z.g.position.x += z.sp * dt;
    if (z.g.position.x > 45) z.g.position.x = -45;
    const s = Math.sin(t * 12 + z.ph);
    z.P.legs[0].rotation.x = s * 0.7; z.P.legs[1].rotation.x = -s * 0.7;
    z.P.body.position.y = 0.95 + Math.abs(s) * 0.07;
  }
  // Voidfly hovers
  voidfly.position.y = 8 + Math.sin(t * 1.7) * 0.6;
  for (const w of voidfly.userData.parts.wings) w.g.rotation.z = w.s * Math.sin(t * 40 + w.k) * 0.5;
  // Vrax's blade pulses on the cliff
  const vp = vrax.userData.parts;
  vp.bladeGlow.material.opacity = 0.35 + Math.sin(t * 5) * 0.15;
  vp.torso.rotation.y = Math.sin(t * 0.4) * 0.1;
  // sky stuff
  for (const a of asteroids) { a.m.rotation.x += a.spin.x * dt; a.m.rotation.y += a.spin.y * dt; }
  for (const s of ships) { s.g.position.y = s.base.y + Math.sin(t * 0.3 + s.ph) * 2; s.g.rotation.y += dt * 0.03; }
  for (const b of bolts) { b.m.position.addScaledVector(b.v, dt); if (Math.abs(b.m.position.x) > 200) resetBolt(b, false); }
  for (const f of fires) f.s.scale.setScalar(f.base * (0.8 + Math.sin(t * 9 + f.ph) * 0.15 + Math.random() * 0.1));
  if (Math.random() < 0.3) { const f = pick(fires); smoke.spawn(f.s.position.x, f.s.position.y + 2, f.s.position.z, rnd(-1, 1), rnd(3, 5), 0, 0x2a1830, rnd(2, 4), 0); }
  // distant explosions
  for (const b of booms) {
    b.t += dt;
    if (b.t > 1.2) { b.t = rnd(-2.5, 0); b.x = rnd(-80, 80); b.y = rnd(0, 18); b.z = rnd(-40, -150); }
    const on = b.t > 0;
    b.m.visible = b.s.visible = on;
    if (on) {
      const k = b.t / 1.2;
      b.m.position.set(b.x, b.y, b.z); b.m.scale.setScalar(1 + k * 7); b.m.material.opacity = 1 - k;
      b.s.position.set(b.x, b.y, b.z); b.s.scale.setScalar(6 + k * 22); b.s.material.opacity = (1 - k) * 0.9;
      if (b.t - dt <= 0) for (let k2 = 0; k2 < 12; k2++) fx.spawn(b.x, b.y, b.z, rnd(-12, 12), rnd(0, 16), rnd(-12, 12), 0xffa040, 0.8, -12);
    }
  }
  // lightning: flash the sky and make the logo flicker
  lightningT -= dt;
  if (lightningT <= 0) {
    lightningT = rnd(3, 7);
    flick = 1;
    if (boltMesh) scene.remove(boltMesh);
    const pts = [];
    let x = rnd(-120, 120), y = 160;
    const z = rnd(-150, -250);
    while (y > 0) { pts.push(new THREE.Vector3(x, y, z)); x += rnd(-12, 12); y -= rnd(10, 22); }
    pts.push(new THREE.Vector3(x, 0, z));
    boltMesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xe8d8ff, fog: false }));
    scene.add(boltMesh); boltT = 0.25;
    setTimeout(() => sfx.thunder(), 300);
  }
  if (boltT > 0) { boltT -= dt; if (boltT <= 0 && boltMesh) boltMesh.visible = false; }
  flick = Math.max(0, flick - dt * 3);
  flashLight.intensity = flick * 3;
  hemi.intensity = 1.0 + flick * 2;
  fx.update(dt); smoke.update(dt);
  if (menu === 'start') startAnim(dt);
}

function beamBetween(m, a, b, r) {
  tmp.subVectors(b, a);
  const len = tmp.length();
  m.position.copy(a).addScaledVector(tmp, 0.5);
  m.quaternion.setFromUnitVectors(UPV, tmp.normalize());
  m.scale.set(r, len, r);
}

// ===== PLAY: raise blaster, blue flash, zoom at the alien ship, fade, mission title =====
function startAnim(dt) {
  const prev = startT;
  startT += dt;
  const k = smooth(startT / 0.9);
  UP.armR.rotation.x = lerp(-0.55, -2.9, k); UP.armR.rotation.z = lerp(0.12, 0.05, k);
  UP.foreR.rotation.x = lerp(-0.9, -0.05, k);
  UP.visor.material.color.setHSL(0.55, 1, 0.6 + k * 0.3);
  if (prev < 0.9 && startT >= 0.9) {
    sfx.overdrive(); sfx.whoosh();
    bigShip.visible = true;
    PP.tip.visible = true;
  }
  if (startT > 0.9) {
    const z = smooth((startT - 0.9) / 2.5);
    bigShip.position.set(lerp(-30, 0, z), lerp(60, 16, z), lerp(-220, -24, z));
    bigShip.rotation.set(0.25 * (1 - z), startT * 0.6, 0.1);
    camera.position.lerpVectors(CAM0, new THREE.Vector3(0, 13, -6), smooth((startT - 0.9) / 2.6));
    camera.lookAt(bigShip.position);
    camera.fov = lerp(55, 38, z); camera.updateProjectionMatrix();
  }
  if (prev < 4.0 && startT >= 4.0) { sfx.robot(); playMusic(null); }
  if (startT > 7.3 || (startT > 4.2 && (G.pressed.enter || G.pressed.click || G.pressed.space))) {
    camera.fov = 55; camera.updateProjectionMatrix();
    G.goGame(0, { fresh: true, skipCard: true });
  }
}

// ===== Menus =====
function settingsItems() {
  const s = G.settings;
  return [
    { label: `MUSIC  < ${s.music} >` },
    { label: `SOUND FX  < ${s.sfx} >` },
    { label: `GRAPHICS  < ${GFX[s.gfx].name} >` },
    { label: `HINTS  < ${s.hints ? 'ON' : 'OFF'} >` },
    { label: 'CONTROLS' },
    { label: 'BACK' },
  ];
}
function adjust(i, d) {
  const s = G.settings;
  if (i === 0) s.music = clamp(s.music + d, 0, 10);
  if (i === 1) s.sfx = clamp(s.sfx + d, 0, 10);
  if (i === 2) { s.gfx = (s.gfx + d + GFX.length) % GFX.length; resize(); }
  if (i === 3) s.hints = !s.hints;
  applyVolumes(); saveSettings(); sfx.ui();
}
function activate(i) {
  const save = loadSave();
  if (i === 1 && !save) return;
  sfx.select();
  if (i === 0) { menu = 'start'; startT = 0; }
  if (i === 1) G.goGame(save.mission, { upgrades: save.upgrades || [] });
  if (i === 2) { menu = 'settings'; setSel = 0; showControls = false; }
  if (i === 3) { menu = 'credits'; creditY = 0; playMusic('calm'); }
  if (i === 4) { menu = 'quit'; quitT = 0; playMusic(null); try { window.close(); } catch (e) { /* browsers may refuse */ } }
}
function input() {
  const pr = G.pressed, m = G.mouse;
  const moved = m.x !== lastMX || m.y !== lastMY;
  lastMX = m.x; lastMY = m.y;
  const up = pr.arrowup || pr.w, down = pr.arrowdown || pr.s, ok = pr.enter || pr.space;
  const left = pr.arrowleft || pr.a, right = pr.arrowright || pr.d;
  const hit = H.hitRect(rects, m.x, m.y);
  if (menu === 'main') {
    const can = i => i !== 1 || !!loadSave();
    if (down) { do sel = (sel + 1) % MAIN.length; while (!can(sel)); sfx.ui(); }
    if (up) { do sel = (sel + MAIN.length - 1) % MAIN.length; while (!can(sel)); sfx.ui(); }
    if (hit && !hit.off && moved && hit.i !== sel) { sel = hit.i; sfx.ui(); }
    if (ok) activate(sel);
    if (pr.click && hit && !hit.off) activate(hit.i);
  } else if (menu === 'settings') {
    if (showControls) { if (ok || pr.click || pr.escape) { showControls = false; sfx.ui(); } return; }
    const n = 6;
    if (down) { setSel = (setSel + 1) % n; sfx.ui(); }
    if (up) { setSel = (setSel + n - 1) % n; sfx.ui(); }
    if (hit && moved && hit.i !== setSel) { setSel = hit.i; sfx.ui(); }
    if (left && setSel < 4) adjust(setSel, -1);
    if (right && setSel < 4) adjust(setSel, 1);
    const pickIt = i => {
      if (i === 4) { showControls = true; sfx.select(); } else if (i === 5) { menu = 'main'; sfx.select(); } else adjust(i, m.x < G.w / 2 ? -1 : 1);
    };
    if (ok) pickIt(setSel);
    if (pr.click && hit) { setSel = hit.i; pickIt(hit.i); }
    if (pr.escape) menu = 'main';
  } else if (menu === 'credits') {
    if (ok || pr.click || pr.escape) { menu = 'main'; playMusic('title'); }
  } else if (menu === 'quit') {
    if (quitT > 2.5 && (ok || pr.click)) { menu = 'main'; sfx.power(); playMusic('title'); }
  }
}

function draw(dt) {
  const c = G.hctx, W = G.w, Hh = G.h, small = W < 700;
  if (menu === 'start') {
    if (startT < 0.9) H.drawLogo(W / 2, 4, Math.min(W * 0.92, 760), flick);
    const f = Math.max(0, 1 - (startT - 0.9) * 1.1);
    if (startT > 0.9) H.fade(f, '120,200,255');
    if (startT > 3.3) H.fade((startT - 3.3) / 0.7);
    if (startT > 4.0) {
      const s = 'MISSION 1: THE INVASION BEGINS.', n = Math.floor((startT - 4.2) * 22);
      if (n > 0) H.text(s.slice(0, n), W / 2, Hh / 2, Math.min(26, W / 22), '#fff', 'center', { glow: '#2a9dff' });
      if (startT > 5.6) H.text('Hold the door. Zippits incoming.', W / 2, Hh / 2 + 44, Math.min(12, W / 50), '#9fdcff');
    }
    return;
  }
  if (menu === 'quit') {
    quitT += dt;
    H.fade(Math.min(1, quitT / 1.5));
    if (quitT < 2.5) H.text('SHUTTING DOWN UNIT-07...', W / 2, Hh / 2, Math.min(20, W / 26), '#7fe3ff');
    else {
      H.text('UNIT-07 IS SLEEPING.', W / 2, Hh / 2 - 20, Math.min(20, W / 26), '#7fe3ff');
      if (Math.floor(quitT * 2) % 2) H.text(isTouch ? 'TAP TO WAKE IT UP' : 'CLICK OR PRESS ENTER TO WAKE IT UP', W / 2, Hh / 2 + 24, Math.min(11, W / 50), '#fff');
    }
    rects = [];
    return;
  }
  // vignette so the text pops
  const g = c.createLinearGradient(0, 0, 0, Hh);
  g.addColorStop(0, 'rgba(0,0,0,0.35)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = g; c.fillRect(0, 0, W, Hh);
  if (menu === 'main') H.drawLogo(W / 2, 4, Math.min(W * 0.92, 760), flick);

  if (menu === 'main') {
    const save = loadSave();
    const items = MAIN.map((s, i) => ({ label: s, disabled: i === 1 && !save }));
    const size = small ? 13 : 18, gap = small ? 34 : 44;
    if (small) rects = H.menu(items, sel, W / 2, Hh - gap * 5 - 24, size, gap);
    else rects = H.menu(items, sel, Math.max(150, W * 0.16), Hh * 0.52, size, gap, 'left');
    if (save && sel === 1) H.text(`MISSION ${save.mission + 1}`, small ? W / 2 : Math.max(150, W * 0.16), small ? Hh - 14 : Hh * 0.52 + gap * 5, 9, '#9fdcff', small ? 'center' : 'left');
    if (!small) H.text('ARROWS + ENTER, OR CLICK', W - 20, Hh - 18, 9, '#8a96b0', 'right');
  } else if (menu === 'settings') {
    H.fade(0.35);
    const pw = Math.min(560, W - 24), ph = 360, px = (W - pw) / 2, py = (Hh - ph) / 2;
    H.panel(px, py, pw, ph);
    H.text('SETTINGS', W / 2, py + 30, small ? 14 : 18, '#7fe3ff');
    if (showControls) {
      rects = [];
      const L = isTouch
        ? ['TOUCH + HOLD: AIM AND FIRE', 'DASH BUTTONS: DODGE SIDEWAYS', 'JUMP: JUMP OVER SHOCKWAVES', 'OVERDRIVE: POWER UP (WHEN FULL)', 'FIX: PATCH REPAIRS YOU', 'II: PAUSE']
        : ['MOUSE: AIM     HOLD CLICK: FIRE', 'A / D: DASH LEFT / RIGHT', 'SPACE or W: JUMP', 'SHIFT or E: OVERDRIVE', 'Q: PATCH EMERGENCY REPAIR', 'P or ESC: PAUSE     ENTER: SKIP TALKING'];
      L.forEach((s, i) => H.text(s, W / 2, py + 80 + i * 36, small ? 8 : 11, '#fff', 'center', { max: pw - 30 }));
      H.text('PRESS ENTER OR CLICK', W / 2, py + ph - 28, 9, '#7fe3ff');
    } else {
      rects = H.menu(settingsItems(), setSel, W / 2, py + 86, small ? 11 : 14, 44);
      H.text(isTouch ? 'TAP LEFT OR RIGHT SIDE TO CHANGE' : 'LEFT / RIGHT TO CHANGE', W / 2, py + ph - 24, 8, '#8a96b0');
    }
  } else if (menu === 'credits') {
    H.fade(0.55);
    rects = [];
    if (H.drawCredits(CREDITS, (creditY += dt * 45))) creditY = 0;
  }
}

export function titleCamera() { return camera; }
// for tests and screenshots
export const titleDebug = {
  menu(m, s = 0) { menu = m; sel = s; setSel = s; startT = 0; quitT = 0; creditY = 0; showControls = false; },
  controls() { menu = 'settings'; showControls = true; },
  lightning() { lightningT = 0; },
  set credit(v) { creditY = v; },
  set quit(v) { quitT = v; },
  get startT() { return startT; },
  scene: () => scene,
};
export function screenOf(v) { return toScreen(v, camera); }
