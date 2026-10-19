import { THREE } from './engine.js';
import { TEX } from './textures.js';

// ===== Building blocks =====
export const phong = (color, o = {}) => new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 60, specular: 0x666677, ...o });
export const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
export const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
export const addGlow = (color, opacity = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
export function mesh(geo, mat, x = 0, y = 0, z = 0, p = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (p) p.add(m);
  return m;
}
export const box = (w, h, d, mat, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p);
export const ball = (r, mat, x, y, z, p, det = 1) => mesh(new THREE.IcosahedronGeometry(r, det), mat, x, y, z, p);
export const cyl = (rt, rb, h, mat, x, y, z, p, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, p);
export const cone = (r, h, mat, x, y, z, p, seg = 6) => mesh(new THREE.ConeGeometry(r, h, seg), mat, x, y, z, p);
export function group(x = 0, y = 0, z = 0, p = null) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  if (p) p.add(g);
  return g;
}
export function glowSprite(color, scale, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(scale);
  return s;
}
const alongZ = m => { m.rotation.x = Math.PI / 2; return m; };
const alongX = m => { m.rotation.z = Math.PI / 2; return m; };

// ===== UNIT-07 (full body, for the title screen) =====
export function makeUnit07() {
  const g = new THREE.Group(), P = {};
  const metal = phong(0x5d6878, { shininess: 80 }), dark = phong(0x2f3540), lite = phong(0x8d99ab, { shininess: 90 });
  const scr = phong(0x8c97a8, { map: TEX.scratch }), visor = glow(0x33ccff), blue = glow(0x2a8cff), red = glow(0xff3355), hz = phong(0xffa200);
  for (const s of [-1, 1]) {
    const L = group(s * 0.6, 0, 0, g);
    box(0.95, 0.35, 1.4, dark, 0, 0.18, 0.2, L);
    box(0.7, 1.1, 0.75, metal, 0, 0.95, 0, L);
    box(0.8, 0.22, 0.84, dark, 0, 0.55, 0, L);
    ball(0.34, lite, 0, 1.55, 0.05, L);
    box(0.62, 0.95, 0.68, metal, 0, 2.05, 0, L);
    cyl(0.08, 0.08, 1.1, lite, 0, 1.05, -0.45, L, 6);
    box(0.5, 0.12, 0.05, hz, 0, 1.0, 0.39, L);
  }
  box(1.6, 0.45, 0.85, dark, 0, 2.6, 0, g);
  const T = group(0, 2.8, 0, g); P.torso = T;
  box(1.9, 1.5, 1.15, metal, 0, 0.75, 0, T);
  box(1.1, 0.8, 0.12, dark, 0, 0.8, 0.6, T);
  P.core = ball(0.2, blue, 0, 0.85, 0.66, T);
  for (const s of [-1, 1]) {
    box(1.0, 0.65, 1.2, lite, s * 1.35, 1.35, 0, T);
    box(1.05, 0.15, 1.25, dark, s * 1.35, 1.02, 0, T);
    box(0.06, 0.4, 0.06, blue, s * 1.35, 1.35, 0.62, T);
  }
  const Hd = group(0, 1.55, 0, T); P.head = Hd;
  box(1.0, 0.8, 0.9, metal, 0, 0.4, 0, Hd);
  P.visor = box(0.84, 0.26, 0.08, visor, 0, 0.45, 0.46, Hd);
  box(1.05, 0.12, 0.95, dark, 0, 0.82, 0, Hd);
  cyl(0.03, 0.03, 0.6, lite, 0.3, 1.1, 0, Hd, 5);
  P.tip = ball(0.07, red, 0.3, 1.42, 0, Hd, 0);
  for (const s of [-1, 1]) {
    const A = group(s * 1.35, 1.1, 0, T), mat = s < 0 ? scr : metal;
    box(0.5, 1.0, 0.5, mat, 0, -0.55, 0, A);
    ball(0.28, lite, 0, -1.1, 0, A);
    const F = group(0, -1.1, 0, A);
    box(0.6, 0.95, 0.6, mat, 0, -0.5, 0, F);
    if (s > 0) {
      const B = group(0, -1.0, 0, F); P.blaster = B;
      cyl(0.24, 0.28, 0.9, dark, 0, -0.35, 0, B);
      P.rings = [];
      for (let k = 0; k < 3; k++) P.rings.push(cyl(0.3, 0.3, 0.07, blue, 0, -0.08 - k * 0.24, 0, B));
      P.muzzle = cyl(0.15, 0.15, 0.12, blue, 0, -0.84, 0, B);
    } else {
      box(0.5, 0.3, 0.5, dark, 0, -1.1, 0, F);
      for (const k of [-0.15, 0, 0.15]) box(0.1, 0.3, 0.1, metal, k, -1.35, 0.12, F);
      box(0.15, 0.1, 0.62, dark, 0.2, -0.3, 0, F);
      box(0.62, 0.08, 0.2, dark, 0, -0.7, 0.2, F);
    }
    P[s > 0 ? 'armR' : 'armL'] = A; P[s > 0 ? 'foreR' : 'foreL'] = F;
  }
  P.armR.rotation.set(-0.55, 0, 0.12); P.foreR.rotation.x = -0.9;
  P.armL.rotation.set(-0.25, 0, -0.15); P.foreL.rotation.x = -0.5;
  g.userData.parts = P;
  return g;
}

// ===== UNIT-07's arms in first person =====
export function makeFPArms() {
  const root = new THREE.Group(), P = {};
  const metal = phong(0x66728a, { shininess: 90 }), dark = phong(0x2b313b), lite = phong(0x9aa8bd, { shininess: 100 });
  const scr = phong(0x9aa5b6, { map: TEX.scratch }), blue = glow(0x33aaff), hz = phong(0xffa200);
  const R = group(1.25, -1.15, -0.1, root); P.R = R;
  R.rotation.set(0.1, 0.1, 0);
  box(0.85, 0.6, 0.85, lite, 0.1, 0.15, 0.35, R);
  box(0.5, 0.5, 1.4, metal, 0, 0, -0.3, R);
  alongX(cyl(0.3, 0.3, 0.62, dark, 0, 0, -1.05, R, 8));
  box(0.62, 0.62, 1.3, metal, 0, 0, -1.75, R);
  box(0.68, 0.14, 1.1, lite, 0, 0.36, -1.75, R);
  box(0.05, 0.08, 0.9, blue, 0.33, 0.05, -1.75, R);
  box(0.5, 0.06, 0.3, hz, 0, 0.44, -1.4, R);
  const B = group(0, 0.02, -2.4, R); P.blaster = B;
  alongZ(cyl(0.38, 0.38, 0.55, dark, 0, 0, -0.2, B, 10));
  alongZ(cyl(0.22, 0.27, 1.0, metal, 0, 0, -0.85, B, 10));
  P.rings = [];
  for (let k = 0; k < 3; k++) P.rings.push(alongZ(cyl(0.3, 0.3, 0.07, blue.clone(), 0, 0, -0.55 - k * 0.24, B, 10)));
  P.tip = alongZ(cyl(0.16, 0.16, 0.12, blue.clone(), 0, 0, -1.38, B, 10));
  P.muzzle = new THREE.Object3D(); P.muzzle.position.set(0, 0, -1.5); B.add(P.muzzle);

  const L = group(-1.35, -1.25, -0.1, root); P.L = L;
  L.rotation.set(0.08, -0.1, 0);
  box(0.85, 0.6, 0.85, lite, -0.1, 0.15, 0.35, L);
  box(0.5, 0.5, 1.4, scr, 0, 0, -0.3, L);
  alongX(cyl(0.3, 0.3, 0.62, dark, 0, 0, -1.05, L, 8));
  box(0.62, 0.62, 1.3, scr, 0, 0, -1.75, L);
  box(0.66, 0.12, 0.9, dark, 0, 0.36, -1.7, L);
  P.wrist = box(0.66, 0.1, 0.12, blue.clone(), 0, 0.2, -2.35, L);
  const Hn = group(0, 0, -2.6, L); P.hand = Hn;
  box(0.55, 0.3, 0.55, dark, 0, 0, 0, Hn);
  P.fingers = [];
  for (const k of [-0.18, 0, 0.18]) {
    const f = group(k, 0, -0.25, Hn); P.fingers.push(f);
    box(0.12, 0.13, 0.4, metal, 0, 0, -0.2, f);
    box(0.11, 0.12, 0.25, lite, 0, -0.05, -0.48, f).rotation.x = 0.5;
    f.rotation.x = -0.25;
  }
  const th = group(0.3, -0.05, -0.05, Hn); box(0.12, 0.12, 0.35, metal, 0.05, 0, -0.15, th); th.rotation.y = -0.6;
  root.scale.setScalar(0.5);
  root.userData.parts = P;
  return root;
}

// ===== Patch, the repair drone =====
export function makePatch() {
  const g = new THREE.Group(), P = {};
  const white = phong(0xf4f6fa, { shininess: 100 }), orange = phong(0xff7a14, { shininess: 80 }), dark = phong(0x2a2f3a);
  const top = mesh(new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), white, 0, 0, 0, g);
  const bot = mesh(new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), orange, 0, 0, 0, g);
  top.userData.k = bot.userData.k = 1;
  mesh(new THREE.TorusGeometry(0.4, 0.04, 4, 16), dark, 0, 0, 0, g).rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.2, 0.04, 4, 16), dark, 0, 0.03, 0.34, g);
  P.eye = ball(0.19, glow(0x33bbff), 0, 0.03, 0.31, g, 1); P.eye.scale.z = 0.5;
  ball(0.08, glow(0x08306a), 0, 0.03, 0.4, g, 0);
  ball(0.03, glow(0xffffff), 0.06, 0.1, 0.42, g, 0);
  cyl(0.02, 0.02, 0.3, dark, 0, 0.5, 0, g, 4);
  P.tip = ball(0.06, glow(0xff9a2a), 0, 0.67, 0, g, 0);
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 0.38, -0.12, 0.08, g); P.arms.push(a);
    cyl(0.025, 0.025, 0.26, dark, 0, -0.12, 0, a, 4);
    box(0.03, 0.08, 0.03, dark, -0.03, -0.27, 0, a); box(0.03, 0.08, 0.03, dark, 0.03, -0.27, 0, a);
    a.rotation.z = s * 0.4;
  }
  P.thruster = ball(0.09, glow(0x55ccff), 0, -0.43, 0, g, 0);
  P.eyeMark = new THREE.Object3D(); P.eyeMark.position.set(0, 0.03, 0.42); g.add(P.eyeMark);
  g.userData.parts = P;
  return g;
}

// ===== ZIPPIT: small, green, three eyes, claws, purple armour =====
export function makeZippit() {
  const g = new THREE.Group(), P = {};
  const skin = lam(0x2ef03c), skinD = lam(0x17b02a), arm = phong(0x8a2be2, { shininess: 70 }), armD = phong(0x4b1080);
  const claw = phong(0xf4f4e0, { shininess: 100 }), eye = glow(0xffff4a);
  const body = group(0, 0.95, 0, g); P.body = body;
  ball(0.42, skin, 0, 0, 0, body).scale.set(1, 1.15, 0.85);
  box(0.62, 0.42, 0.22, arm, 0, 0.05, 0.3, body);
  box(0.6, 0.18, 0.5, armD, 0, -0.32, 0, body);
  for (const s of [-1, 1]) ball(0.2, arm, s * 0.4, 0.28, 0, body).scale.set(1, 0.7, 1);
  const head = group(0, 0.62, 0.05, body); P.head = head;
  ball(0.36, skin, 0, 0, 0, head).scale.set(1.15, 0.9, 1);
  box(0.5, 0.12, 0.3, armD, 0, 0.27, -0.02, head);
  P.eyes = [ball(0.075, eye, -0.13, 0.03, 0.3, head, 0), ball(0.075, eye, 0.13, 0.03, 0.3, head, 0), ball(0.085, eye, 0, 0.18, 0.28, head, 0)];
  box(0.26, 0.05, 0.05, glow(0x0a2a0a), 0, -0.15, 0.32, head);
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 0.42, 0.18, 0.05, body); P.arms.push(a);
    cyl(0.07, 0.06, 0.6, skinD, 0, -0.3, 0, a, 5);
    const h = group(0, -0.6, 0, a);
    for (const k of [-1, 0, 1]) { const c = cone(0.05, 0.34, claw, k * 0.07, -0.14, 0.05, h, 4); c.rotation.x = Math.PI + 0.3; }
    a.rotation.x = -0.9;
  }
  P.legs = [];
  for (const s of [-1, 1]) {
    const l = group(s * 0.18, 0.62, 0, g); P.legs.push(l);
    cyl(0.08, 0.06, 0.55, skinD, 0, -0.28, 0, l, 5);
    box(0.16, 0.08, 0.28, armD, 0, -0.58, 0.06, l);
  }
  g.userData = { parts: P, hit: [{ y: 0.95, r: 0.55 }, { y: 1.6, z: 0.05, r: 0.4 }] };
  return g;
}

// ===== BRUTECLAW: massive, purple, four arms, glowing orange chest =====
export function makeBruteclaw() {
  const g = new THREE.Group(), P = {};
  const skin = lam(0x7d22d8), skinD = lam(0x4a1290), armr = phong(0x2a0b4f, { shininess: 80, specular: 0x8866aa });
  const claw = phong(0xe8e2d0), eye = glow(0xffdd00);
  P.legs = [];
  for (const s of [-1, 1]) {
    const l = group(s * 0.7, 1.4, 0, g); P.legs.push(l);
    cyl(0.38, 0.32, 1.4, skinD, 0, -0.7, 0, l, 7);
    box(0.8, 0.35, 1.0, armr, 0, -1.25, 0.15, l);
  }
  const body = group(0, 2.6, 0, g); P.body = body;
  box(2.3, 1.9, 1.5, skin, 0, 0, 0, body);
  box(1.8, 0.6, 1.3, skinD, 0, -1.0, 0.05, body);
  box(2.5, 1.7, 0.4, armr, 0, 0.1, -0.85, body);
  for (const s of [-1, 1]) {
    box(1.0, 0.5, 1.4, armr, s * 1.35, 0.95, 0, body).rotation.z = s * -0.25;
    cone(0.16, 0.6, armr, s * 1.5, 1.4, -0.2, body, 4);
    cone(0.13, 0.45, armr, s * 1.2, 1.35, 0.3, body, 4);
  }
  P.chest = ball(0.46, glow(0xff7a00), 0, 0.1, 0.72, body);
  P.chestGlow = glowSprite(0xff7a00, 2.2, 0.8); P.chestGlow.position.set(0, 0.1, 1.0); body.add(P.chestGlow);
  for (const [w, h, x, y] of [[1.2, 0.18, 0, 0.62], [1.2, 0.18, 0, -0.42], [0.18, 1.1, 0.6, 0.1], [0.18, 1.1, -0.6, 0.1]]) box(w, h, 0.2, armr, x, y, 0.78, body);
  const head = group(0, 1.25, 0.35, body); P.head = head;
  box(0.85, 0.7, 0.8, skin, 0, 0, 0, head);
  box(0.7, 0.25, 0.6, skinD, 0, -0.4, 0.1, head);
  box(0.95, 0.2, 0.85, armr, 0, 0.32, 0, head);
  ball(0.08, eye, -0.2, 0.08, 0.41, head, 0); ball(0.08, eye, 0.2, 0.08, 0.41, head, 0);
  for (const s of [-1, 1]) cone(0.06, 0.25, claw, s * 0.25, -0.45, 0.42, head, 4);
  P.arms = [];
  for (const [y, z, upper] of [[0.75, 0, true], [-0.25, 0.2, false]]) for (const s of [-1, 1]) {
    const a = group(s * 1.3, y, z, body); P.arms.push({ g: a, s, upper });
    cyl(0.28, 0.24, 1.1, skin, 0, -0.55, 0, a, 6);
    box(0.55, 0.5, 0.55, armr, 0, -1.25, 0, a);
    for (const k of [-0.15, 0, 0.15]) { const c = cone(0.07, 0.4, claw, k, -1.6, 0.1, a, 4); c.rotation.x = Math.PI; }
    a.rotation.z = s * (upper ? 0.35 : 0.2);
    a.rotation.x = upper ? -0.3 : -0.6;
  }
  g.userData = { parts: P, hit: [{ y: 2.6, r: 1.45 }, { y: 3.95, z: 0.35, r: 0.55 }, { y: 1.0, r: 0.8 }] };
  return g;
}

// ===== VOIDFLY: hovering drone, four wings, purple body, one green eye =====
export function makeVoidfly() {
  const g = new THREE.Group(), P = {};
  const body = phong(0x9b30ff, { shininess: 90 }), bodyD = phong(0x5a1499);
  const wing = new THREE.MeshBasicMaterial({ color: 0x8cffd2, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const b = group(0, 0, 0, g); P.body = b;
  ball(0.5, body, 0, 0, 0, b).scale.set(1, 0.75, 1.25);
  box(0.3, 0.15, 1.0, bodyD, 0, 0.35, 0, b);
  P.eye = ball(0.27, glow(0x66ff22), 0, 0.02, 0.55, b);
  ball(0.1, glow(0x0b2a00), 0, 0.02, 0.8, b, 0);
  P.eyeGlow = glowSprite(0x66ff22, 1.2, 0.7); P.eyeGlow.position.set(0, 0.02, 0.8); b.add(P.eyeGlow);
  const st = cone(0.12, 0.6, bodyD, 0, -0.1, -0.75, b, 5); st.rotation.x = -Math.PI / 2;
  for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]]) cyl(0.02, 0.02, 0.5, bodyD, x, -0.55, z, b, 3);
  P.wings = [];
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    const wg = group(s * 0.35, 0.3, k ? -0.3 : 0.15, b);
    const pl = mesh(new THREE.PlaneGeometry(1.3, 0.45), wing, s * 0.65, 0, 0, wg);
    pl.rotation.x = -Math.PI / 2;
    P.wings.push({ g: wg, s, k });
  }
  g.userData = { parts: P, hit: [{ y: 0, r: 0.72 }] };
  return g;
}

// ===== RIFTSTALKER: tall, slender, dark armour, red eye, sniper rifle =====
export function makeRiftstalker() {
  const g = new THREE.Group(), P = {};
  const T = { transparent: true };
  const armr = phong(0x1c2030, { shininess: 120, specular: 0x6677aa, ...T }), trim = phong(0x3d3366, T), gun = phong(0x15171f, { shininess: 120, ...T });
  const red = glow(0xff2a2a, T);
  P.legs = [];
  for (const s of [-1, 1]) {
    const l = group(s * 0.22, 1.6, 0, g); P.legs.push(l);
    box(0.18, 0.8, 0.22, armr, 0, -0.4, 0, l);
    ball(0.11, trim, 0, -0.82, 0.02, l, 0);
    box(0.15, 0.8, 0.18, armr, 0, -1.2, -0.05, l);
    box(0.18, 0.08, 0.4, trim, 0, -1.58, 0.08, l);
  }
  const body = group(0, 1.6, 0, g); P.body = body;
  box(0.4, 0.3, 0.3, trim, 0, 0, 0, body);
  box(0.6, 1.0, 0.35, armr, 0, 0.6, 0, body);
  box(0.05, 0.6, 0.02, red, 0, 0.6, 0.18, body);
  for (const s of [-1, 1]) box(0.28, 0.18, 0.35, trim, s * 0.38, 1.05, 0, body);
  const head = group(0, 1.2, 0, body); P.head = head;
  box(0.28, 0.5, 0.32, armr, 0, 0.22, 0, head).rotation.x = -0.15;
  box(0.06, 0.3, 0.42, trim, 0, 0.5, -0.05, head);
  P.eye = box(0.2, 0.06, 0.05, glow(0xff1a1a, T), 0, 0.27, 0.18, head);
  for (const s of [-1, 1]) {
    const a = group(s * 0.38, 0.95, 0, body);
    box(0.12, 0.6, 0.12, armr, 0, -0.3, 0, a);
    box(0.11, 0.12, 0.55, armr, 0, -0.6, 0.25, a);
    a.rotation.x = -0.2;
  }
  const rf = group(0.1, 0.4, 0.5, body); P.rifle = rf;
  box(0.1, 0.16, 1.6, gun, 0, 0, 0.3, rf);
  alongZ(cyl(0.035, 0.035, 0.9, gun, 0, 0.02, 1.5, rf, 5));
  alongZ(cyl(0.06, 0.06, 0.4, gun, 0, 0.14, 0.2, rf, 6));
  box(0.04, 0.04, 0.05, glow(0xff3030, T), 0, 0.14, 0.42, rf);
  box(0.02, 0.03, 1.4, red, 0.06, 0, 0.3, rf);
  box(0.08, 0.3, 0.12, gun, 0, -0.18, 0.05, rf);
  P.muzzle = new THREE.Object3D(); P.muzzle.position.set(0, 0.02, 1.98); rf.add(P.muzzle);
  g.userData = { parts: P, hit: [{ y: 2.2, r: 0.5 }, { y: 3.0, r: 0.32 }, { y: 1.0, r: 0.45 }] };
  return g;
}

// ===== GENERAL VRAX: giant warlord, black and purple armour, four eyes, energy blade =====
export function makeVrax() {
  const g = new THREE.Group(), P = {};
  const blk = phong(0x17131f, { shininess: 90, specular: 0x554466 }), pur = phong(0x7a24e0, { shininess: 80 }), purD = phong(0x3d0f75);
  const eye = glow(0xff2a44);
  P.legs = [];
  for (const s of [-1, 1]) {
    const L = group(s * 0.75, 2.6, 0, g); P.legs.push(L);
    box(0.75, 1.3, 0.85, blk, 0, -0.6, 0, L);
    ball(0.38, pur, 0, -1.25, 0.1, L);
    box(0.7, 1.3, 0.8, blk, 0, -1.85, 0.05, L);
    box(0.72, 0.9, 0.15, pur, 0, -1.8, 0.45, L);
    box(0.85, 0.35, 1.3, blk, 0, -2.45, 0.2, L);
  }
  const body = group(0, 2.6, 0, g); P.body = body;
  box(1.7, 0.6, 1.0, blk, 0, 0.2, 0, body);
  for (const s of [-1, 1]) box(0.6, 0.8, 0.12, pur, s * 0.5, -0.3, 0.5, body);
  const T = group(0, 0.5, 0, body); P.torso = T;
  box(2.4, 1.9, 1.3, blk, 0, 1.0, 0, T);
  box(0.9, 0.9, 0.1, pur, 0, 1.1, 0.66, T).rotation.z = Math.PI / 4;
  P.gem = ball(0.2, glow(0xd070ff), 0, 1.1, 0.74, T, 0);
  box(1.6, 0.6, 1.0, blk, 0, 0.0, 0, T);
  for (const s of [-1, 1]) {
    const pd = group(s * 1.45, 1.8, 0, T);
    box(1.1, 0.7, 1.4, pur, 0, 0, 0, pd).rotation.z = s * -0.3;
    for (const k of [-0.4, 0, 0.4]) cone(0.16, 0.8, blk, s * 0.15, 0.6, k, pd, 4);
  }
  const head = group(0, 2.35, 0.05, T); P.head = head;
  box(0.95, 0.95, 0.95, blk, 0, 0.35, 0, head);
  box(0.8, 0.6, 0.1, purD, 0, 0.3, 0.5, head);
  P.eyes = [];
  for (const [x, y] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, 0.22], [0.2, 0.22]]) P.eyes.push(box(0.15, 0.08, 0.05, eye, x, y, 0.56, head));
  for (const s of [-1, 1]) { const h = cone(0.13, 1.0, pur, s * 0.5, 0.95, 0, head, 5); h.rotation.z = s * -0.55; }
  box(0.1, 0.3, 0.9, pur, 0, 0.9, 0, head);
  const cape = mesh(new THREE.PlaneGeometry(2.4, 4.4), lam(0x2a0a45, { side: THREE.DoubleSide }), 0, 0.0, -0.75, T);
  cape.rotation.x = 0.12;
  for (const s of [-1, 1]) {
    const A = group(s * 1.45, 1.5, 0, T);
    box(0.6, 1.2, 0.6, blk, 0, -0.6, 0, A);
    ball(0.33, pur, 0, -1.2, 0, A);
    const F = group(0, -1.2, 0, A);
    box(0.65, 1.1, 0.65, pur, 0, -0.55, 0, F);
    box(0.5, 0.4, 0.5, blk, 0, -1.2, 0, F);
    P[s > 0 ? 'armR' : 'armL'] = A; P[s > 0 ? 'foreR' : 'foreL'] = F;
  }
  const BL = group(0, -1.25, 0, P.foreR); P.blade = BL;
  alongZ(cyl(0.1, 0.1, 0.7, blk, 0, 0, 0.1, BL, 6));
  box(0.7, 0.15, 0.15, pur, 0, 0, 0.45, BL);
  P.bladeCore = box(0.16, 0.6, 5.0, glow(0xe0a0ff), 0, 0, 3.0, BL);
  P.bladeGlow = box(0.45, 1.0, 5.4, addGlow(0xa040ff, 0.45), 0, 0, 3.0, BL);
  P.armR.rotation.set(-0.3, 0, 0.25); P.foreR.rotation.x = -0.6;
  P.armL.rotation.set(-0.2, 0, -0.2); P.foreL.rotation.x = -0.4;
  g.userData = { parts: P, hit: [{ y: 4.4, r: 1.6 }, { y: 6.2, z: 0.1, r: 0.75 }, { y: 1.8, r: 1.1 }] };
  return g;
}

// ===== THE NULL EMPEROR: enormous alien king, six mechanical arms, cosmic core =====
export function makeEmperor() {
  const g = new THREE.Group(), P = {};
  const blk = phong(0x0d0d14, { shininess: 120, specular: 0x6a5a99 }), edge = glow(0x9d3cff), metal = phong(0x2c303c, { shininess: 100 });
  const joint = glow(0x33e0ff), crown = phong(0x1a1026, { shininess: 100 });
  cone(2.4, 3.4, blk, 0, 1.7, 0, g, 8);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(0.06, 3.3, 0.06, edge, Math.sin(a) * 1.2, 1.7, Math.cos(a) * 1.2, g).rotation.set(Math.cos(a) * -0.6, 0, Math.sin(a) * 0.6); }
  const T = group(0, 3.2, 0, g); P.torso = T;
  box(2.6, 2.4, 1.6, blk, 0, 1.2, 0, T);
  for (const [x, y, w, h] of [[1.3, 1.2, 0.06, 2.4], [-1.3, 1.2, 0.06, 2.4], [0, 2.4, 2.6, 0.06], [0, 0, 2.6, 0.06]]) box(w, h, 0.06, edge, x, y, 0.81, T);
  P.core = ball(0.72, new THREE.MeshBasicMaterial({ map: TEX.core }), 0, 1.25, 0.72, T, 2);
  P.coreGlow = glowSprite(0xd23cff, 3.5, 0.0); P.coreGlow.position.set(0, 1.25, 1.2); T.add(P.coreGlow);
  P.shells = [];
  for (const s of [-1, 1]) {
    const sh = group(s * 0.86, 1.25, 0.85, T); P.shells.push({ g: sh, s });
    box(0.86, 1.7, 0.18, metal, -s * 0.43, 0, 0, sh);
    box(0.06, 1.7, 0.2, edge, -s * 0.84, 0, 0.02, sh);
  }
  for (const s of [-1, 1]) {
    box(1.3, 0.9, 1.9, crown, s * 1.75, 2.3, 0, T);
    for (const k of [-0.6, 0, 0.6]) cone(0.18, 1.1, crown, s * 1.9, 3.1, k, T, 4);
  }
  const head = group(0, 2.7, 0.1, T); P.head = head;
  box(1.0, 1.15, 0.95, blk, 0, 0.5, 0, head);
  box(0.8, 0.1, 0.1, edge, 0, 0.1, 0.5, head);
  P.eyes = [];
  for (const [x, y] of [[-0.25, 0.75], [0, 0.8], [0.25, 0.75], [-0.25, 0.55], [0, 0.6], [0.25, 0.55]]) P.eyes.push(box(0.12, 0.08, 0.05, glow(0x99f6ff), x, y, 0.49, head));
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) / 3) * 0.9, c = cone(0.12, 0.6 + (i === 3 ? 0.5 : (3 - Math.abs(i - 3)) * 0.1), crown, Math.sin(a) * 0.5, 1.3, Math.cos(a) * 0.1, head, 4);
    c.rotation.z = -a * 0.6;
    ball(0.06, edge, Math.sin(a) * 0.5 - Math.sin(a) * 0.2, 1.65 + (i === 3 ? 0.25 : 0), Math.cos(a) * 0.1, head, 0);
  }
  P.eyeMark = new THREE.Object3D(); P.eyeMark.position.set(0, 0.7, 0.6); head.add(P.eyeMark);
  P.arms = [];
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
    const a = group(s * 1.45, 2.1 - k * 0.8, 0.1, T);
    ball(0.25, joint, 0, 0, 0, a, 0);
    cyl(0.18, 0.15, 1.6, metal, 0, -0.8, 0, a, 6);
    const f = group(0, -1.6, 0, a);
    ball(0.2, joint, 0, 0, 0, f, 0);
    cyl(0.15, 0.12, 1.5, metal, 0, -0.75, 0, f, 6);
    for (const c of [-0.12, 0.12]) { const cl = cone(0.07, 0.45, metal, c, -1.65, 0, f, 4); cl.rotation.x = Math.PI; }
    const hm = new THREE.Object3D(); hm.position.set(0, -1.6, 0); f.add(hm);
    a.rotation.z = s * (0.7 + k * 0.3); a.rotation.x = -0.4 + k * 0.1; f.rotation.x = -0.6;
    P.arms.push({ g: a, f, s, k, hand: hm });
  }
  g.userData = { parts: P, hit: [{ y: 4.45, z: 0.75, r: 0.85, tag: 'core' }, { y: 4.4, r: 1.7, tag: 'body' }, { y: 6.4, r: 0.8, tag: 'body' }, { y: 1.7, r: 2.0, tag: 'body' }] };
  return g;
}
