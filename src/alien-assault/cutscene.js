// The secret lab: an Unknown Scientist wakes UNIT-07 up. Plays when you press PLAY.
import { THREE, makeComposer, shadows } from './engine.js';
import { G, rnd, lerp, smooth, damp, pick } from './state.js';
import { sfx, playMusic } from './audio.js';
import { TEX } from './textures.js';
import * as MD from './models.js';
import * as D from './detail.js';
import { Particles } from './fx.js';
import * as H from './hud.js';

let scene, camera, composer, unit, UP, sci, SP, fx, alarm, alarmL, keyL, arcs = [], monitors = [], t = 0, done = null, fired = {};

function makeScientist() {
  const g = new THREE.Group(), P = {};
  const coat = MD.skin(0xc8ccd4, { roughness: 0.8, clearcoat: 0, sheen: 0.6 }), dark = MD.lam(0x15141a, { roughness: 0.9 }), glove = MD.paint(0x2a2a30, { metalness: 0, roughness: 0.4 });
  // long lab coat with a split at the front, collar, pockets and an ID badge
  const cg = new THREE.CylinderGeometry(0.34, 0.58, 1.5, 28, 6, true, 0.25, Math.PI * 2 - 0.5), cp = cg.attributes.position;
  for (let k = 0; k < cp.count; k++) { const y = cp.getY(k); if (y < -0.6) cp.setY(k, y + Math.sin(Math.atan2(cp.getZ(k), cp.getX(k)) * 6) * 0.04); }
  cg.computeVertexNormals();
  const skirt = MD.mesh(cg, coat, 0, 0.8, 0, g); skirt.material = coat.clone(); skirt.material.side = THREE.DoubleSide;
  MD.limb(0.36, 0.3, 0.75, coat, 0, 2.1, 0, g).scale.z = 0.8;
  for (const s of [-1, 1]) {
    MD.limb(0.1, 0.08, 0.8, dark, s * 0.15, 0.95, 0, g);
    MD.box(0.15, 0.08, 0.3, dark, s * 0.15, 0.04, 0.06, g);
    MD.box(0.18, 0.2, 0.03, coat, s * 0.2, 1.05, 0.5, g).rotation.x = 0.25;
    MD.box(0.16, 0.25, 0.04, coat, s * 0.13, 2.0, 0.24, g).rotation.set(-0.2, s * 0.4, 0);
  }
  MD.box(0.12, 0.16, 0.02, MD.glow(0xbfe8ff), -0.16, 1.75, 0.28, g);
  for (let k = 0; k < 2; k++) MD.cyl(0.012, 0.012, 0.16, MD.lam(k ? 0xc02020 : 0x2040c0), 0.14 + k * 0.03, 1.8, 0.27, g);
  const head = MD.group(0, 2.3, 0, g); P.head = head;
  MD.cyl(0.08, 0.1, 0.18, dark, 0, -0.12, 0, head);
  MD.mesh(new THREE.SphereGeometry(0.28, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), dark, 0, 0.02, -0.02, head).scale.set(1, 1.1, 1.1);
  MD.ball(0.2, MD.glow(0x000000), 0, -0.02, 0.06, head);
  MD.box(0.32, 0.06, 0.06, glove, 0, 0.02, 0.2, head);
  for (const s of [-1, 1]) { MD.ring(0.07, 0.018, glove, s * 0.08, 0.02, 0.24, head); MD.ball(0.055, MD.glow(0x7affd8), s * 0.08, 0.02, 0.24, head, 0); }
  P.goggles = MD.glowSprite(0x7affd8, 0.6, 0.8); P.goggles.position.set(0, 0.02, 0.3); head.add(P.goggles);
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = MD.group(s * 0.36, 2.0, 0, g); P.arms.push(a);
    MD.limb(0.09, 0.075, 0.72, coat, 0, 0, 0, a);
    MD.ball(0.07, glove, 0, -0.82, 0, a);
    for (const k of [-1, 0, 1]) MD.limb(0.018, 0.014, 0.08, glove, k * 0.03, -0.86, 0.03, a);
    a.rotation.x = -0.3;
  }
  g.userData.parts = P;
  return g;
}

// lab clutter: benches with glassware, shelves, server racks, cables and papers
function labClutter() {
  const g = new THREE.Group(), metal = MD.phong(0x4a5068, { roughness: 0.4 }), dark = MD.phong(0x1e2433, { roughness: 0.5 }), paper = MD.lam(0xe8e8e0);
  // back wall pipes, vents and lockers
  for (let i = 0; i < 9; i++) { const w = D.wallDetail(i + 1, 4, 9, false, 0); w.g.position.set(-16 + i * 4, 0, -7.95); g.add(w.g); }
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const w = D.wallDetail(i + 3, 4, 9, false, 0); w.g.position.set(s * 11.95, 0, -6 + i * 4); w.g.rotation.y = -s * Math.PI / 2; g.add(w.g); }
  // bench with beakers and flasks
  const bench = MD.group(6, 0, -6.6, g);
  MD.box(4, 0.15, 1.2, metal, 0, 1.1, 0, bench);
  for (const x of [-1.8, 1.8]) for (const z of [-0.5, 0.5]) MD.box(0.1, 1.1, 0.1, dark, x, 0.55, z, bench);
  for (let k = 0; k < 7; k++) {
    const x = -1.6 + k * 0.5, c = pick([0x3aff9a, 0xff4ad8, 0x33bbff, 0xffd84a]);
    MD.cyl(0.12, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.05 }), x, 1.38, 0.1, bench);
    MD.cyl(0.11, 0.13, 0.2 + (k % 3) * 0.06, MD.glow(c), x, 1.28 + (k % 3) * 0.03, 0.1, bench);
  }
  MD.box(0.6, 0.02, 0.4, paper, -1.2, 1.19, -0.3, bench).rotation.y = 0.3;
  // shelves of boxes
  const sh = MD.group(-10.5, 0, 3, g); sh.rotation.y = Math.PI / 2;
  for (let y = 0; y < 4; y++) { MD.box(3, 0.08, 0.8, metal, 0, 0.6 + y * 1.2, 0, sh); for (let k = 0; k < 4; k++) MD.box(rnd(0.4, 0.6), rnd(0.4, 0.8), 0.5, MD.lam(pick([0x8a6a3a, 0x5a6a7a, 0x3a4a5a])), -1.1 + k * 0.7, 0.85 + y * 1.2, 0, sh); }
  for (const x of [-1.5, 1.5]) MD.box(0.08, 5, 0.8, dark, x, 2.5, 0, sh);
  // server racks with blinking lights
  for (let r = 0; r < 3; r++) {
    const rk = MD.group(9 + r * 0.95, 0, -3 + r * 0.2, g); rk.rotation.y = -Math.PI / 2 + 0.2;
    MD.box(0.9, 3.4, 1, dark, 0, 1.7, 0, rk);
    for (let k = 0; k < 14; k++) MD.box(0.05, 0.05, 0.02, MD.glow(pick([0x39ff6a, 0x39ff6a, 0x33bbff, 0xff3030])), rnd(-0.35, 0.35), 0.3 + k * 0.21, 0.51, rk);
  }
  // thick cables from the cradle into the floor and the console
  for (let k = 0; k < 4; k++) D.cable([-2.2 + k * 1.4, 7.9, -2.9], [-3.4 + k * 2.2, 0.05, -5.6 - k * 0.3], 0, 0.07, MD.lam(0x15141a), g);
  for (let k = 0; k < 3; k++) D.cable([-2.4, 0.3 + k * 0.1, -2.4 + k * 0.2], [-4.4, 0.05, -2.4], 0.2, 0.06, MD.lam(0x15141a), g);
  // papers scattered on the floor
  for (let k = 0; k < 14; k++) { const p = MD.box(0.4, 0.01, 0.55, paper, rnd(-8, 8), 0.01, rnd(-6, 4), g); p.rotation.y = rnd(0, 6); }
  return MD.bake(g, D.METAL);
}

export function buildCutscene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020408);
  scene.fog = new THREE.Fog(0x020408, 8, 40);
  scene.environment = G.envMap; scene.environmentIntensity = 0.25;
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.userData.baseFov = 45;
  G.cameras.push(camera);
  (G.scenes ||= []).push(scene);
  composer = makeComposer(scene, camera, 0.8);

  const floor = MD.mesh(new THREE.PlaneGeometry(40, 40), MD.phong(0x3a4256, { map: TEX.floor, roughness: 0.5 }), 0, 0, 0, scene);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const wallM = MD.phong(0x2a3044, { map: TEX.panel, roughness: 0.6 });
  MD.mesh(new THREE.PlaneGeometry(40, 12), wallM, 0, 6, -8, scene);
  for (const s of [-1, 1]) { const w = MD.mesh(new THREE.PlaneGeometry(30, 12), wallM, s * 12, 6, 0, scene); w.rotation.y = -s * Math.PI / 2; }
  // the charging cradle UNIT-07 sleeps in
  const frame = MD.phong(0x4a5068, { roughness: 0.3 });
  for (const s of [-1, 1]) MD.box(0.35, 8, 0.6, frame, s * 2.4, 4, -2.6, scene);
  MD.box(5.2, 0.4, 0.8, frame, 0, 8, -2.6, scene);
  MD.box(5.2, 0.3, 2.4, frame, 0, 0.15, -2, scene);
  for (let i = 0; i < 4; i++) MD.box(0.12, 0.12, 2, MD.glow(0x2a9dff), -1.6 + i * 1.07, 7.6, -2.0, scene);
  scene.add(labClutter());
  unit = shadows(MD.makeUnit07()); UP = unit.userData.parts; unit.position.set(0, 0.3, -2.2); scene.add(unit);
  // glass tubes with things floating in green liquid
  for (const [x, z] of [[-7, -5], [-9, -1], [7.5, -5], [9.5, -1.5]]) {
    MD.cyl(1, 1, 5, new THREE.MeshStandardMaterial({ color: 0x3aff9a, emissive: 0x1aff6a, emissiveIntensity: 0.35, transparent: true, opacity: 0.35, roughness: 0.05 }), x, 2.8, z, scene, 16);
    MD.cyl(1.1, 1.1, 0.4, frame, x, 0.2, z, scene, 16); MD.cyl(1.1, 1.1, 0.4, frame, x, 5.4, z, scene, 16);
    const blob = MD.blob(0.5, MD.skin(0x3a5a3a), x, 2.8, z, scene, 0.15, x); blob.scale.set(0.8, 1.4, 0.8);
    for (let k = 0; k < 4; k++) { const a = k * 1.6; MD.tube([[x, 2.4, z], [x + Math.cos(a) * 0.4, 1.8, z + Math.sin(a) * 0.4], [x + Math.cos(a + 0.5) * 0.6, 1.2, z + Math.sin(a + 0.5) * 0.6]], 0.06, MD.skin(0x3a5a3a), scene, 0.8); }
    for (let k = 0; k < 2; k++) MD.ball(0.08, MD.glow(0xffe020), x + (k - 0.5) * 0.25, 3.3, z + 0.35, scene, 0);
    MD.cyl(0.08, 0.08, 3, MD.phong(0x1e2433), x, 7.0, z, scene);
  }
  // monitors and the console with the big lever
  for (let i = 0; i < 5; i++) {
    const m = MD.box(1.6, 1.0, 0.1, new THREE.MeshBasicMaterial({ map: TEX.glyph, color: pick([0x7affd8, 0xffffff, 0xff9aa0]) }), -6 + i * 0.4, 2.6 + (i % 2) * 1.1, -7.2 + i * 0.6, scene);
    m.rotation.y = 0.5; monitors.push(m);
  }
  MD.box(3, 1.1, 1.2, MD.phong(0x30384c), -4.6, 0.55, -2.4, scene).rotation.y = 0.5;
  const lever = MD.group(-4.2, 1.1, -2.3, scene); lever.rotation.y = 0.5;
  MD.cyl(0.05, 0.05, 1.0, MD.phong(0x9aa8bd), 0, 0.5, 0, lever, 8);
  MD.ball(0.14, MD.glow(0xff3020), 0, 1.0, 0, lever);
  // the Unknown Scientist
  sci = shadows(makeScientist()); SP = sci.userData.parts;
  sci.position.set(-4.4, 0, -1.2); sci.rotation.y = 0.9; scene.add(sci);
  sci.userData.lever = lever;
  // lights
  scene.add(new THREE.AmbientLight(0x3a4a6a, 0.4));
  keyL = new THREE.SpotLight(0xbfe0ff, 40, 30, 0.5, 0.7, 1.4); keyL.position.set(2, 10, 6); keyL.target.position.set(0, 3, -2);
  keyL.castShadow = true; keyL.shadow.mapSize.set(1024, 1024);
  scene.add(keyL); scene.add(keyL.target);
  const mon = new THREE.PointLight(0x7affd8, 4, 10, 1.2); mon.position.set(-5, 3, -4); scene.add(mon);
  const tube = new THREE.PointLight(0x3aff9a, 3, 12, 1.2); tube.position.set(8, 3, -3); scene.add(tube);
  alarmL = new THREE.SpotLight(0xff2020, 0, 30, 0.6, 0.5, 1); alarmL.position.set(0, 9.5, 2); scene.add(alarmL); scene.add(alarmL.target);
  alarm = MD.ball(0.3, MD.glow(0x400000), 0, 9.6, 2, scene);
  // electric arcs
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 8 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: 0x9adcff }));
    l.visible = false; scene.add(l); arcs.push(l);
  }
  fx = new Particles(scene, 400, 0.12);
}

// what happens, and when (seconds)
const LINES = [
  [1.2, 'scientist', 'Power at ninety percent... come on... come on...'],
  [7.2, 'unit', 'Who woke me up?'],
  [9.6, 'scientist', 'Someone who needs you, UNIT-07. The aliens are attacking the colony.'],
  [13.6, 'unit', 'And who are you?'],
  [15.8, 'scientist', 'No time. They are coming. GO!'],
  [20.4, 'unit', '...They are gone. Great. A mystery. I love mysteries.'],
];
const END = 24;

export const cutTime = () => t;
export const Cut = {
  start(onDone) {
    t = 0; done = onDone; fired = {};
    H.clearDialog();
    sci.visible = true;
    sci.userData.lever.rotation.x = 0;
    playMusic(null);
    G.hud.style.cursor = 'default';
  },
  update(dt) {
    t += dt;
    const pr = G.pressed;
    if ((pr.enter || pr.escape || pr.click || pr.space) && t > 0.6) { finish(); return; }
    animate(dt);
    composer.render();
    draw(dt);
    if (t > END) finish();
  },
};
function finish() { H.clearDialog(); const d = done; done = null; if (d) d(); }

function animate(dt) {
  const k = smooth(t / 20);
  camera.position.set(lerp(5, 2.2, k) + Math.sin(t * 0.3) * 0.2, lerp(4.2, 4.6, k), lerp(11, 6.2, k));
  camera.lookAt(0, 4.4, -2.2);
  for (const [at, who, s] of LINES) if (t >= at && !fired[at]) { fired[at] = 1; H.sayNow(who, s, 1.2); }
  // the scientist works the console, then pulls the lever
  SP.arms[1].rotation.x = t < 4.2 ? -0.9 + Math.sin(t * 9) * 0.15 : -0.3;
  SP.arms[0].rotation.x = t > 3.6 && t < 4.6 ? -1.6 : -0.9 + Math.sin(t * 7) * 0.1;
  if (t > 4.0) sci.userData.lever.rotation.x = damp(sci.userData.lever.rotation.x, 1.2, 8, dt);
  SP.head.rotation.y = t > 5 ? Math.sin(t * 0.7) * 0.2 - 0.3 : 0.4;
  SP.goggles.material.opacity = 0.6 + Math.sin(t * 5) * 0.2;
  // UNIT-07 powers up
  const pow = t < 4.6 ? 0 : t < 6.2 ? (Math.random() < 0.5 ? 1 : 0.1) * smooth((t - 4.6) / 1.6) : 1;
  UP.visor.material.color.setHSL(0.55, 1, 0.04 + pow * 0.55);
  UP.core.material.color.setHSL(0.6, 1, 0.05 + pow * 0.5);
  UP.tip.visible = pow > 0.5 && Math.sin(t * 6) > 0;
  UP.head.rotation.x = lerp(0.45, 0, smooth((t - 6) / 1.2));
  UP.armR.rotation.x = lerp(0, -0.55, smooth((t - 6.5) / 1.5)); UP.foreR.rotation.x = lerp(0, -0.9, smooth((t - 6.5) / 1.5));
  if (t > 4.4 && t < 4.6 && !fired.zap) { fired.zap = 1; sfx.power(); sfx.thunder(); }
  if (t > 6.2 && !fired.on) { fired.on = 1; sfx.overdrive(); sfx.robot(); for (let i = 0; i < 60; i++) fx.spawn(0, 4.6, -1.7, rnd(-4, 4), rnd(-2, 4), rnd(-1, 4), pick([0x55c8ff, 0xffffff]), rnd(0.4, 0.9), -4); }
  // electricity arcs while charging
  const arcing = t > 4.3 && t < 6.6;
  for (const l of arcs) {
    l.visible = arcing && Math.random() < 0.7;
    if (!l.visible) continue;
    const pa = l.geometry.attributes.position, sx = rnd(-1.6, 1.6);
    for (let i = 0; i < 8; i++) { const f = i / 7; pa.setXYZ(i, lerp(sx, rnd(-1, 1), f) + rnd(-0.25, 0.25), lerp(7.6, rnd(3, 5.5), f), -2 + rnd(-0.3, 0.3)); }
    pa.needsUpdate = true;
  }
  if (arcing && Math.random() < 0.5) fx.spawn(rnd(-1.2, 1.2), rnd(3, 6), -1.8, rnd(-2, 2), rnd(-1, 2), rnd(0, 2), 0x9adcff, 0.3, -6);
  // alarm, blackout, and the scientist vanishes
  const alarmOn = t > 15.6;
  alarmL.intensity = alarmOn ? 60 * (Math.sin(t * 8) > 0 ? 1 : 0.1) : 0;
  alarmL.target.position.set(Math.sin(t * 3) * 6, 0, Math.cos(t * 3) * 6 - 2);
  alarm.material.color.setHex(alarmOn && Math.sin(t * 8) > 0 ? 0xff2020 : 0x400000);
  const black = t > 18 && t < 19.4;
  keyL.intensity = black ? (Math.random() < 0.15 ? 20 : 0) : 40;
  if (t > 18.7) sci.visible = false;
  if (t > 16.5 && t < 18 && Math.random() < 0.02) { G.shake = 0.3; sfx.boom(); }
  for (const m of monitors) m.visible = !black || Math.random() < 0.3;
  fx.update(dt);
}

function draw(dt) {
  const W = G.w, Hh = G.h;
  // movie bars
  G.hctx.fillStyle = '#000'; G.hctx.fillRect(0, 0, W, Hh * 0.09); G.hctx.fillRect(0, Hh * 0.91, W, Hh * 0.09);
  if (t < 4) { G.hctx.globalAlpha = Math.min(1, t, 4 - t); H.text('SOMEWHERE BENEATH THE COLONY...', W / 2, Hh * 0.045, Math.min(14, W / 40), '#9fdcff', 'center', { stroke: false }); G.hctx.globalAlpha = 1; }
  if (t > 18 && t < 19.4) H.fade(0.6);
  H.updateDialog(dt);
  H.drawDialog(Hh * 0.89);
  H.text('ENTER / CLICK: SKIP', W - 14, Hh * 0.955, 8, '#6a7a90', 'right', { stroke: false });
  if (t < 1) H.fade(1 - t);
  if (t > END - 1.2) H.fade((t - (END - 1.2)) / 1.2);
}
