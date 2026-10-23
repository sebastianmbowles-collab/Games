import { THREE } from './engine.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TEX } from './textures.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ===== Building blocks =====
// Shiny, smooth materials that react to light and reflections. "shininess" from the old look still works.
function std(color, o, base) {
  const { shininess, specular: _specular, flatShading: _flat, ...rest } = o;
  const m = new THREE.MeshStandardMaterial({ color, ...base, ...rest });
  if (shininess !== undefined) m.roughness = Math.max(0.15, 0.75 - shininess / 180);
  return m;
}
export const phong = (color, o = {}) => std(color, o, { metalness: 0.7, roughness: 0.35 });
export const lam = (color, o = {}) => std(color, o, { metalness: 0.05, roughness: 0.55 });
export const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
export const addGlow = (color, opacity = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
export function mesh(geo, mat, x = 0, y = 0, z = 0, p = null) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (p) p.add(m);
  return m;
}
export const box = (w, h, d, mat, x, y, z, p) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18), mat, x, y, z, p);
export const ball = (r, mat, x, y, z, p, det = 1) => mesh(new THREE.SphereGeometry(r, det < 1 ? 16 : 32, det < 1 ? 12 : 20), mat, x, y, z, p);
export const cyl = (rt, rb, h, mat, x, y, z, p, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, Math.max(seg * 2, 24)), mat, x, y, z, p);
export const cone = (r, h, mat, x, y, z, p, seg = 6) => mesh(new THREE.ConeGeometry(r, h, Math.max(seg * 2, 16)), mat, x, y, z, p);
// a lumpy smooth space rock
export function rock(r, mat, x, y, z, p) {
  const g = new THREE.IcosahedronGeometry(r, 3), pa = g.attributes.position, v = new THREE.Vector3();
  const seed = Math.random() * 10;
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    const n = Math.sin(v.x * 1.7 / r + seed) * Math.sin(v.y * 2.1 / r + seed * 2) * Math.sin(v.z * 1.3 / r - seed);
    v.multiplyScalar(1 + n * 0.22 + (Math.random() - 0.5) * 0.04);
    pa.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return mesh(g, mat, x, y, z, p);
}
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
// tiny sharp stars on a big dome (painting them into the sky texture made blurry blobs)
export function makeStars(parent, n = 700, r = 380) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, s = Math.sqrt(1 - y * y);
    pos.set([Math.cos(a) * s * r, y * r - 30, Math.sin(a) * s * r], i * 3);
    c.set([0xffffff, 0xffffff, 0x9ff6ff, 0xffb0f0, 0xfff2a0][(Math.random() * 5) | 0]).multiplyScalar(0.5 + Math.random() * 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, fog: false }));
  parent.add(pts);
  return pts;
}
const alongZ = m => { m.rotation.x = Math.PI / 2; return m; };

// ===== Smooth shapes =====
// glossy painted armour (clear coat over metal) and soft alien skin
export const paint = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.5, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.28, ...o });
export const skin = (color, o = {}) => new THREE.MeshPhysicalMaterial({
  color, metalness: 0, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.45,
  sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35), ...o,
});
export const ring = (r, t, mat, x, y, z, p) => mesh(new THREE.TorusGeometry(r, t, 12, 48), mat, x, y, z, p);
// a rounded, tapered limb hanging down from its joint: radius r1 at y=0, radius r2 at y=-len
export function limbGeo(r1, r2, len, seg = 24) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r2), -len + Math.sin(a) * r2)); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(1e-4, Math.cos(a) * r1), Math.sin(a) * r1)); }
  return new THREE.LatheGeometry(pts, seg);
}
export const limb = (r1, r2, len, mat, x, y, z, p) => mesh(limbGeo(r1, r2, len), mat, x, y, z, p);
// a curved horn, claw or spike: base radius r at y=0, tip at y=h, bending toward +z
export function hornGeo(r, h, bend = 0.3, seg = 14) {
  const g = new THREE.ConeGeometry(r, h, seg, 8);
  g.translate(0, h / 2, 0);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const t = pa.getY(i) / h; pa.setZ(i, pa.getZ(i) + bend * h * t * t); }
  g.computeVertexNormals();
  return g;
}
export const horn = (r, h, bend, mat, x, y, z, p) => mesh(hornGeo(r, h, bend), mat, x, y, z, p);
// a soft lumpy ball for alien flesh and mud
export function blobGeo(r, amt = 0.08, seed = 1, det = 5) {
  let g = new THREE.IcosahedronGeometry(r, det);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pa = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    const n = Math.sin(v.x * 3.1 / r + seed) * Math.sin(v.y * 2.7 / r + seed * 1.7) * Math.sin(v.z * 3.3 / r - seed) + 0.5 * Math.sin(v.x * 7 / r + v.z * 5 / r + seed * 3);
    v.multiplyScalar(1 + n * amt);
    pa.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
export const blob = (r, mat, x, y, z, p, amt, seed) => mesh(blobGeo(r, amt, seed), mat, x, y, z, p);
// a bendy tube through points (cables, tentacles, vines); taper shrinks it toward the end
export function tubeGeo(pts, r, taper = 0, seg = 32, rs = 12) {
  const curve = new THREE.CatmullRomCurve3(pts.map(a => new THREE.Vector3(a[0], a[1], a[2])));
  const g = new THREE.TubeGeometry(curve, seg, r, rs, false);
  if (taper) {
    const pa = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i <= seg; i++) {
      curve.getPointAt(i / seg, c);
      const k = 1 - taper * (i / seg);
      for (let j = 0; j <= rs; j++) { const idx = i * (rs + 1) + j; v.fromBufferAttribute(pa, idx).sub(c).multiplyScalar(k).add(c); pa.setXYZ(idx, v.x, v.y, v.z); }
    }
    g.computeVertexNormals();
  }
  return g;
}
export const tube = (pts, r, mat, p, taper) => mesh(tubeGeo(pts, r, taper), mat, 0, 0, 0, p);
// part of a sphere, used for shells, pads and helmets
export const dome = (r, mat, x, y, z, p, thetaLen = Math.PI / 2, phiStart = 0, phiLen = Math.PI * 2, thetaStart = 0) =>
  mesh(new THREE.SphereGeometry(r, 40, 20, phiStart, phiLen, thetaStart, thetaLen), mat, x, y, z, p);

// ===== UNIT-07 (full body, for the title screen) =====
export function makeUnit07() {
  const g = new THREE.Group(), P = {};
  const metal = paint(0x5d6878), dark = paint(0x2f3540, { metalness: 0.4, roughness: 0.5 }), lite = paint(0x8d99ab, { roughness: 0.28 });
  const scr = paint(0x8c97a8, { map: TEX.scratch, clearcoat: 0.2 }), visor = glow(0x33ccff), blue = glow(0x2a8cff), red = glow(0xff3355);
  const hz = paint(0xffa200, { metalness: 0.2 }), joint = phong(0x1c2028, { roughness: 0.4 });
  for (const s of [-1, 1]) {
    const L = group(s * 0.6, 0, 0, g);
    // boot: sole, toe cap and heel
    box(0.92, 0.22, 1.38, dark, 0, 0.11, 0.18, L);
    box(0.8, 0.3, 0.62, metal, 0, 0.34, 0.55, L);
    box(0.72, 0.34, 0.5, metal, 0, 0.36, -0.25, L);
    ball(0.24, joint, 0, 0.5, 0, L);
    // shin with an armoured guard and a piston at the back
    box(0.66, 1.0, 0.7, metal, 0, 1.0, 0, L);
    box(0.54, 0.9, 0.2, lite, 0, 1.02, 0.36, L).rotation.x = -0.06;
    box(0.4, 0.1, 0.05, hz, 0, 0.78, 0.48, L);
    cyl(0.07, 0.07, 1.1, lite, 0, 1.05, -0.42, L);
    // knee with a glowing ring
    ball(0.3, joint, 0, 1.55, 0, L);
    ball(0.26, lite, 0, 1.6, 0.16, L).scale.set(1, 1, 0.6);
    ring(0.31, 0.03, blue, 0, 1.55, 0, L).rotation.y = Math.PI / 2;
    limb(0.36, 0.31, 0.75, metal, 0, 2.4, 0, L);
  }
  box(1.6, 0.45, 0.85, dark, 0, 2.6, 0, g);
  for (let k = -2; k <= 2; k++) box(0.12, 0.06, 0.04, blue, k * 0.24, 2.6, 0.43, g);
  for (const s of [-1, 1]) ball(0.28, joint, s * 0.6, 2.45, 0, g);
  const T = group(0, 2.8, 0, g); P.torso = T;
  // ribbed waist
  cyl(0.55, 0.65, 0.5, joint, 0, 0.15, 0, T);
  for (let k = 0; k < 3; k++) ring(0.6 - k * 0.03, 0.04, dark, 0, 0.04 + k * 0.14, 0, T).rotation.x = Math.PI / 2;
  // chest, angled plates and the core
  box(1.9, 1.2, 1.15, metal, 0, 0.95, 0, T);
  for (const s of [-1, 1]) box(0.72, 0.78, 0.22, lite, s * 0.58, 1.08, 0.56, T).rotation.y = s * 0.2;
  ring(0.27, 0.07, dark, 0, 0.85, 0.6, T);
  P.core = ball(0.2, blue, 0, 0.85, 0.62, T);
  ring(0.33, 0.02, blue, 0, 0.85, 0.63, T);
  box(1.2, 0.3, 0.9, dark, 0, 1.6, 0, T);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) box(0.05, 0.5, 0.07, dark, s * 0.96, 0.9, -0.3 + k * 0.17, T);
  // backpack with two exhausts
  box(1.3, 1.1, 0.5, dark, 0, 1.0, -0.75, T);
  for (const s of [-1, 1]) { cyl(0.14, 0.18, 0.5, metal, s * 0.4, 0.4, -0.95, T); cyl(0.1, 0.1, 0.02, blue, s * 0.4, 0.14, -0.95, T); }
  // rounded shoulder pads
  for (const s of [-1, 1]) {
    dome(0.56, lite, s * 1.35, 1.22, 0, T).scale.set(1, 0.62, 1.1);
    cyl(0.57, 0.6, 0.12, dark, s * 1.35, 1.2, 0, T).scale.z = 1.1;
    box(0.06, 0.32, 0.06, blue, s * 1.35, 1.42, 0.62, T);
  }
  const Hd = group(0, 1.55, 0, T); P.head = Hd;
  cyl(0.2, 0.26, 0.3, joint, 0, 0.05, 0, Hd);
  box(1.0, 0.8, 0.9, metal, 0, 0.42, 0, Hd);
  dome(0.5, metal, 0, 0.78, 0, Hd).scale.set(1, 0.3, 0.9);
  box(0.92, 0.34, 0.1, dark, 0, 0.45, 0.43, Hd);
  P.visor = box(0.82, 0.24, 0.08, visor, 0, 0.45, 0.47, Hd);
  box(1.04, 0.1, 0.18, lite, 0, 0.66, 0.41, Hd);
  box(0.6, 0.15, 0.2, dark, 0, 0.14, 0.42, Hd);
  for (const s of [-1, 1]) {
    cyl(0.18, 0.18, 0.14, dark, s * 0.53, 0.42, 0, Hd).rotation.z = Math.PI / 2;
    cyl(0.08, 0.08, 0.02, blue, s * 0.61, 0.42, 0, Hd).rotation.z = Math.PI / 2;
  }
  cyl(0.03, 0.03, 0.6, lite, 0.3, 1.1, 0, Hd);
  P.tip = ball(0.07, red, 0.3, 1.42, 0, Hd, 0);
  for (const s of [-1, 1]) {
    const A = group(s * 1.35, 1.1, 0, T), mat = s < 0 ? scr : metal;
    limb(0.27, 0.24, 0.9, mat, 0, -0.1, 0, A);
    ball(0.28, joint, 0, -1.1, 0, A);
    ring(0.29, 0.025, blue, 0, -1.1, 0, A).rotation.y = Math.PI / 2;
    const F = group(0, -1.1, 0, A);
    box(0.6, 0.95, 0.6, mat, 0, -0.5, 0, F);
    box(0.66, 0.55, 0.22, lite, 0, -0.45, 0.24, F);
    if (s > 0) {
      const B = group(0, -1.0, 0, F); P.blaster = B;
      cyl(0.32, 0.32, 0.25, dark, 0, -0.05, 0, B);
      cyl(0.2, 0.25, 0.95, dark, 0, -0.42, 0, B);
      for (const k of [-1, 1]) box(0.06, 0.75, 0.1, metal, k * 0.27, -0.42, 0, B);
      P.rings = [];
      for (let k = 0; k < 3; k++) P.rings.push(cyl(0.3, 0.3, 0.07, blue, 0, -0.08 - k * 0.24, 0, B));
      ring(0.19, 0.045, metal, 0, -0.8, 0, B).rotation.x = Math.PI / 2;
      P.muzzle = cyl(0.15, 0.15, 0.12, blue, 0, -0.84, 0, B);
    } else {
      box(0.5, 0.3, 0.5, dark, 0, -1.1, 0, F);
      box(0.52, 0.1, 0.16, lite, 0, -1.22, 0.18, F);
      for (const k of [-0.15, 0, 0.15]) { box(0.11, 0.18, 0.11, metal, k, -1.33, 0.12, F); box(0.1, 0.16, 0.1, lite, k, -1.49, 0.16, F); }
      box(0.11, 0.22, 0.11, metal, 0.27, -1.22, 0.12, F).rotation.z = 0.4;
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
  // softer clear coat than the other robots: the arms sit right next to the camera lights
  const metal = paint(0x66728a, { clearcoat: 0.2, roughness: 0.42 }), dark = paint(0x2b313b, { metalness: 0.4, roughness: 0.5, clearcoat: 0.1 }), lite = paint(0x9aa8bd, { roughness: 0.38, clearcoat: 0.2 });
  const scr = paint(0x9aa5b6, { map: TEX.scratch, clearcoat: 0.1 }), blue = glow(0x33aaff), hz = paint(0xffa200, { metalness: 0.2, clearcoat: 0.2 });
  const joint = phong(0x1c2028, { roughness: 0.4 }), cell = glow(0x7fd8ff);
  const arm = (side, mat) => {
    const A = group(side * 1.27, side > 0 ? -1.15 : -1.08, -0.1, root);
    ball(0.5, lite, side * 0.1, 0.18, 0.35, A).scale.set(1, 0.72, 1);
    alongZ(limb(0.29, 0.26, 1.05, mat, 0, 0, 0.3, A));
    alongZ(cyl(0.05, 0.05, 0.8, lite, side * -0.3, 0.12, -0.35, A));
    ball(0.32, joint, 0, 0, -1.05, A);
    ring(0.33, 0.03, blue, 0, 0, -1.05, A).rotation.y = Math.PI / 2;
    box(0.64, 0.62, 1.3, mat, 0, 0, -1.75, A);
    for (let k = 0; k < 4; k++) box(0.04, 0.3, 0.08, dark, side * 0.33, 0.02, -1.35 - k * 0.2, A);
    tube([[side * -0.22, 0.32, -0.2], [side * -0.3, 0.4, -0.9], [side * -0.27, 0.36, -1.5]], 0.04, dark, A);
    return A;
  };
  const R = arm(1, metal); P.R = R;
  R.rotation.set(0.1, 0.1, 0);
  box(0.7, 0.14, 1.1, lite, 0, 0.36, -1.75, R);
  box(0.04, 0.06, 0.9, blue, 0.34, -0.2, -1.75, R);
  box(0.5, 0.05, 0.3, hz, 0, 0.44, -1.4, R);
  const B = group(0, 0.02, -2.4, R); P.blaster = B;
  alongZ(cyl(0.4, 0.4, 0.55, dark, 0, 0, -0.2, B));
  ring(0.4, 0.04, metal, 0, 0, 0.07, B);
  alongZ(cyl(0.22, 0.27, 1.0, metal, 0, 0, -0.85, B));
  box(0.09, 0.1, 1.0, lite, 0, 0.33, -0.75, B);
  for (const s of [-1, 1]) box(0.06, 0.2, 0.75, dark, s * 0.31, 0, -0.8, B);
  alongZ(cyl(0.08, 0.08, 0.4, cell, 0.28, 0.24, -0.25, B));
  P.rings = [];
  for (let k = 0; k < 3; k++) P.rings.push(alongZ(cyl(0.3, 0.3, 0.07, blue.clone(), 0, 0, -0.55 - k * 0.24, B)));
  alongZ(cyl(0.21, 0.25, 0.2, dark, 0, 0, -1.25, B));
  P.tip = alongZ(cyl(0.16, 0.16, 0.12, blue.clone(), 0, 0, -1.38, B));
  P.muzzle = new THREE.Object3D(); P.muzzle.position.set(0, 0, -1.5); B.add(P.muzzle);

  const L = arm(-1, scr); P.L = L;
  L.rotation.set(0.16, -0.16, 0);
  // the blocking arm wears a shield plate
  box(0.8, 0.14, 1.2, dark, 0, 0.38, -1.7, L);
  for (const z of [-1.25, -2.15]) for (const x of [-0.28, 0.28]) ball(0.05, joint, x, 0.46, z, L, 0);
  P.wrist = box(0.66, 0.1, 0.12, blue.clone(), 0, 0.2, -2.35, L);
  alongZ(cyl(0.26, 0.28, 0.2, joint, 0, 0, -2.45, L));
  const Hn = group(0, 0, -2.6, L); P.hand = Hn;
  box(0.58, 0.28, 0.55, lite, 0, 0, 0, Hn);
  box(0.5, 0.08, 0.42, metal, 0, 0.16, 0, Hn);
  P.fingers = [];
  for (const k of [-0.19, -0.065, 0.065, 0.19]) {
    const f = group(k, 0, -0.27, Hn); P.fingers.push(f);
    ball(0.07, joint, 0, 0, 0, f, 0);
    box(0.11, 0.13, 0.3, metal, 0, 0, -0.17, f);
    const j = group(0, 0, -0.33, f);
    ball(0.06, joint, 0, 0, 0, j, 0);
    box(0.1, 0.12, 0.22, lite, 0, 0, -0.12, j);
    j.rotation.x = 0.5;
    f.rotation.x = -0.25;
  }
  const th = group(0.3, -0.05, -0.05, Hn);
  ball(0.07, joint, 0, 0, 0, th, 0);
  box(0.12, 0.12, 0.32, metal, 0.05, 0, -0.16, th);
  th.rotation.y = -0.6;
  root.scale.setScalar(0.5);
  root.userData.parts = P;
  return root;
}

// ===== Patch, the repair drone =====
export function makePatch() {
  const g = new THREE.Group(), P = {};
  const white = paint(0xb4bcc8, { metalness: 0.1, roughness: 0.4, clearcoat: 0.6 }), orange = paint(0xf06a10, { metalness: 0.1, roughness: 0.32, clearcoat: 1 });
  const dark = paint(0x2a2f3a, { metalness: 0.5, roughness: 0.4 }), cyan = glow(0x55ccff);
  const top = dome(0.4, white, 0, 0, 0, g), bot = dome(0.4, orange, 0, 0, 0, g, Math.PI / 2, 0, Math.PI * 2, Math.PI / 2);
  top.userData.k = bot.userData.k = 1;
  ring(0.4, 0.045, dark, 0, 0, 0, g).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; if (Math.abs(Math.sin(a) - 1) > 0.3) ball(0.022, cyan, Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44, g, 0); }
  // big friendly eye
  ring(0.21, 0.045, dark, 0, 0.03, 0.33, g);
  P.eye = ball(0.19, glow(0x33bbff), 0, 0.03, 0.31, g, 1); P.eye.scale.z = 0.5;
  ring(0.11, 0.014, glow(0xaeeaff), 0, 0.03, 0.405, g);
  ball(0.07, glow(0x08306a), 0, 0.03, 0.4, g, 0);
  ball(0.03, glow(0xffffff), 0.06, 0.1, 0.42, g, 0);
  // hatch, antenna and side rotor pods
  cyl(0.15, 0.18, 0.06, dark, 0, 0.37, 0, g);
  cyl(0.02, 0.02, 0.3, dark, 0, 0.5, 0, g);
  P.tip = ball(0.06, glow(0xff9a2a), 0, 0.67, 0, g, 0);
  for (const s of [-1, 1]) {
    cyl(0.08, 0.08, 0.08, dark, s * 0.4, 0.08, -0.08, g).rotation.z = Math.PI / 2;
    ball(0.035, cyan, s * 0.445, 0.08, -0.08, g, 0);
  }
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 0.38, -0.12, 0.08, g); P.arms.push(a);
    limb(0.03, 0.025, 0.22, dark, 0, 0, 0, a);
    ball(0.04, dark, 0, -0.24, 0, a, 0);
    for (const k of [-1, 1]) horn(0.018, 0.1, 0.5 * k, dark, k * 0.025, -0.25, 0, a).rotation.x = Math.PI;
    a.rotation.z = s * 0.4;
  }
  cyl(0.12, 0.08, 0.08, dark, 0, -0.38, 0, g);
  P.thruster = ball(0.09, cyan, 0, -0.43, 0, g, 0);
  P.eyeMark = new THREE.Object3D(); P.eyeMark.position.set(0, 0.03, 0.42); g.add(P.eyeMark);
  g.userData.parts = P;
  return g;
}

// ===== ZIPPIT: small, green, three eyes, claws, purple armour =====
export function makeZippit() {
  const g = new THREE.Group(), P = {};
  const sk = skin(0x2ef03c, { roughness: 0.62, sheen: 0.3 }), skD = skin(0x17b02a, { roughness: 0.6, sheen: 0.3 }), arm = paint(0x8a2be2, { metalness: 0.35 }), armD = paint(0x4b1080, { metalness: 0.35 });
  const claw = lam(0x9a917c, { roughness: 0.45 }), eye = glow(0xffff4a), black = glow(0x0a1a08);
  const body = group(0, 0.95, 0, g); P.body = body;
  blob(0.42, sk, 0, 0, 0, body, 0.03, 2).scale.set(1, 1.15, 0.85);
  dome(0.45, arm, 0, 0, 0, body, 1.1, Math.PI / 2 - 0.85, 1.7, 0.55).scale.set(1, 1.15, 0.9);
  cyl(0.4, 0.42, 0.16, armD, 0, -0.32, 0, body).scale.z = 0.85;
  box(0.14, 0.1, 0.06, glow(0xffff4a), 0, -0.32, 0.36, body);
  for (const s of [-1, 1]) dome(0.21, arm, s * 0.38, 0.26, 0, body).rotation.z = s * -0.5;
  const head = group(0, 0.62, 0.05, body); P.head = head;
  blob(0.36, sk, 0, 0, 0, head, 0.025, 5).scale.set(1.15, 0.9, 1);
  dome(0.38, armD, 0, 0.03, -0.03, head, Math.PI * 0.32).scale.set(1.15, 0.9, 1);
  box(0.5, 0.08, 0.18, skD, 0, 0.12, 0.27, head).rotation.x = -0.3;
  P.eyes = [ball(0.075, eye, -0.13, 0.03, 0.3, head, 0), ball(0.075, eye, 0.13, 0.03, 0.3, head, 0), ball(0.085, eye, 0, 0.18, 0.28, head, 0)];
  for (const e of P.eyes) { ball(e.geometry.parameters.radius * 1.2, black, e.position.x, e.position.y, e.position.z - 0.035, head, 0).scale.z = 0.6; ball(0.032, black, e.position.x, e.position.y, e.position.z + 0.06, head, 0).scale.y = 1.6; }
  mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 24, Math.PI), black, 0, -0.1, 0.31, head).rotation.z = Math.PI;
  for (let i = 0; i < 4; i++) cone(0.018, 0.06, claw, -0.075 + i * 0.05, -0.135, 0.33, head, 3).rotation.x = Math.PI;
  for (const s of [-1, 1]) {
    tube([[s * 0.1, 0.25, 0], [s * 0.2, 0.45, -0.05], [s * 0.3, 0.55, -0.16]], 0.018, skD, head);
    ball(0.045, eye, s * 0.3, 0.55, -0.16, head, 0);
    horn(0.08, 0.28, 0.25, skD, s * 0.38, 0, -0.02, head).rotation.z = s * -1.3;
  }
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 0.42, 0.18, 0.05, body); P.arms.push(a);
    limb(0.08, 0.06, 0.52, skD, 0, 0, 0, a);
    const h = group(0, -0.6, 0, a);
    ball(0.085, sk, 0, 0.02, 0, h);
    for (const k of [-1, 0, 1]) horn(0.035, 0.32, 0.35, claw, k * 0.065, -0.02, 0.03, h).rotation.x = Math.PI + 0.2;
    a.rotation.x = -0.9;
  }
  P.legs = [];
  for (const s of [-1, 1]) {
    const l = group(s * 0.18, 0.62, 0, g); P.legs.push(l);
    limb(0.09, 0.065, 0.48, skD, 0, 0, 0, l);
    box(0.18, 0.09, 0.3, armD, 0, -0.58, 0.06, l);
    for (const k of [-1, 1]) horn(0.03, 0.12, 0.3, claw, k * 0.05, -0.6, 0.2, l).rotation.x = Math.PI / 2;
  }
  g.userData = { parts: P, hit: [{ y: 0.95, r: 0.55 }, { y: 1.6, z: 0.05, r: 0.4 }] };
  return g;
}

// ===== BRUTECLAW: massive, purple, four arms, glowing orange chest =====
export function makeBruteclaw() {
  const g = new THREE.Group(), P = {};
  const sk = skin(0x7d22d8), skD = skin(0x4a1290), armr = paint(0x2a0b4f, { metalness: 0.35, roughness: 0.5, clearcoat: 0.25 });
  const claw = lam(0x9a917c, { roughness: 0.45 }), eye = glow(0xffdd00);
  P.legs = [];
  for (const s of [-1, 1]) {
    const l = group(s * 0.7, 1.4, 0, g); P.legs.push(l);
    limb(0.42, 0.34, 0.7, skD, 0, 0, 0, l);
    ball(0.3, armr, 0, -0.72, 0.14, l).scale.set(1, 0.9, 0.8);
    limb(0.34, 0.3, 0.45, skD, 0, -0.75, 0, l);
    box(0.8, 0.32, 1.0, armr, 0, -1.25, 0.15, l);
    for (const k of [-0.25, 0, 0.25]) horn(0.07, 0.3, 0.4, claw, k, -1.3, 0.62, l).rotation.x = Math.PI / 2;
  }
  const body = group(0, 2.6, 0, g); P.body = body;
  blob(1.15, sk, 0, 0, 0, body, 0.05, 3).scale.set(1, 0.85, 0.68);
  ball(0.9, skD, 0, -0.85, 0.1, body).scale.set(1, 0.5, 0.75);
  dome(1.22, armr, 0, 0.15, -0.05, body, Math.PI * 0.75, Math.PI, Math.PI).scale.set(1, 0.85, 0.75);
  for (let i = 0; i < 5; i++) horn(0.13 - i * 0.012, 0.65 - i * 0.06, -0.25, armr, 0, 0.9 - i * 0.38, -0.82, body).rotation.x = -0.9;
  for (const s of [-1, 1]) {
    dome(0.62, armr, s * 1.3, 0.85, 0, body).scale.set(1.1, 0.55, 1.15);
    cyl(0.66, 0.7, 0.14, armr, s * 1.3, 0.83, 0, body).scale.set(1.1, 1, 1.15);
    horn(0.15, 0.62, 0.12, armr, s * 1.5, 1.2, -0.2, body).rotation.z = s * -0.45;
    horn(0.11, 0.45, 0.1, armr, s * 1.15, 1.25, 0.28, body).rotation.z = s * -0.2;
  }
  P.chest = ball(0.46, glow(0xff7a00), 0, 0.1, 0.72, body);
  P.chestGlow = glowSprite(0xff7a00, 2.2, 0.8); P.chestGlow.position.set(0, 0.1, 1.0); body.add(P.chestGlow);
  ring(0.52, 0.08, armr, 0, 0.1, 0.8, body);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; horn(0.06, 0.28, 0, armr, Math.cos(a) * 0.56, 0.1 + Math.sin(a) * 0.56, 0.84, body).rotation.z = a + Math.PI / 2; }
  const head = group(0, 1.25, 0.45, body); P.head = head;
  blob(0.5, sk, 0, 0, 0, head, 0.04, 7).scale.set(1, 0.8, 0.95);
  ball(0.38, skD, 0, -0.28, 0.12, head).scale.set(1.15, 0.6, 1);
  dome(0.48, armr, 0, 0.05, 0, head, Math.PI * 0.42).scale.set(1, 0.8, 1);
  box(0.8, 0.13, 0.2, armr, 0, 0.12, 0.36, head);
  for (const s of [-1, 1]) { ball(0.1, glow(0x1a1000), s * 0.2, 0.0, 0.38, head, 0); ball(0.075, eye, s * 0.2, 0.0, 0.42, head, 0); }
  for (const s of [-1, 1]) horn(0.06, 0.32, 0.3, claw, s * 0.24, -0.32, 0.45, head).rotation.z = s * -0.25;
  for (let i = 0; i < 5; i++) cone(0.025, 0.08, claw, -0.16 + i * 0.08, -0.2, 0.52, head, 3).rotation.x = Math.PI;
  P.arms = [];
  for (const [y, z, upper] of [[0.75, 0, true], [-0.25, 0.2, false]]) for (const s of [-1, 1]) {
    const a = group(s * 1.3, y, z, body); P.arms.push({ g: a, s, upper });
    limb(0.3, 0.26, 0.5, sk, 0, 0, 0, a);
    ball(0.26, skD, 0, -0.58, 0, a);
    limb(0.27, 0.24, 0.45, sk, 0, -0.6, 0, a);
    box(0.56, 0.48, 0.56, armr, 0, -1.25, 0, a);
    horn(0.06, 0.2, 0, armr, 0, -1.05, 0.28, a).rotation.x = Math.PI / 2;
    for (const k of [-0.16, 0, 0.16]) horn(0.07, 0.42, 0.4, claw, k, -1.45, 0.1, a).rotation.x = Math.PI;
    a.rotation.z = s * (upper ? 0.35 : 0.2);
    a.rotation.x = upper ? -0.3 : -0.6;
  }
  g.userData = { parts: P, hit: [{ y: 2.6, r: 1.45 }, { y: 3.95, z: 0.35, r: 0.55 }, { y: 1.0, r: 0.8 }] };
  return g;
}

// see-through insect wing with veins, drawn once
let wingTex = null;
export function getWingTex() {
  if (wingTex) return wingTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.beginPath(); x.moveTo(4, 48); x.bezierCurveTo(60, -10, 220, 0, 252, 40); x.bezierCurveTo(230, 80, 80, 104, 4, 48); x.closePath();
  const gr = x.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(140,255,210,0.75)'); gr.addColorStop(1, 'rgba(140,255,210,0.25)');
  x.fillStyle = gr; x.fill();
  x.save(); x.clip();
  x.strokeStyle = 'rgba(30,120,90,0.9)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(4, 48); x.quadraticCurveTo(120, 30, 250, 40); x.stroke();
  x.lineWidth = 1.5;
  for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * 30, 40 - i); x.lineTo(i * 30 + 20, 5); x.moveTo(i * 30, 42 - i); x.lineTo(i * 30 + 14, 95); x.stroke(); }
  x.restore();
  x.strokeStyle = 'rgba(200,255,235,0.9)'; x.lineWidth = 2; x.stroke();
  wingTex = new THREE.CanvasTexture(c); wingTex.colorSpace = THREE.SRGBColorSpace;
  return wingTex;
}

// ===== VOIDFLY: hovering drone, four wings, purple body, one green eye =====
export function makeVoidfly() {
  const g = new THREE.Group(), P = {};
  const body = paint(0x9b30ff, { metalness: 0.35 }), bodyD = paint(0x5a1499, { metalness: 0.35 });
  const wing = new THREE.MeshBasicMaterial({ map: getWingTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const b = group(0, 0, 0, g); P.body = b;
  ball(0.5, body, 0, 0, 0, b).scale.set(1, 0.75, 1.25);
  for (let i = 0; i < 3; i++) ball(0.32 - i * 0.06, i % 2 ? body : bodyD, 0, -0.05 - i * 0.05, -0.55 - i * 0.27, b).scale.set(1, 0.85, 0.8);
  horn(0.07, 0.5, -0.25, bodyD, 0, -0.18, -1.2, b).rotation.x = -Math.PI / 2;
  horn(0.12, 0.5, -0.5, bodyD, 0, 0.3, 0.3, b).rotation.x = -1.2;
  ring(0.28, 0.05, bodyD, 0, 0.02, 0.52, b);
  P.eye = ball(0.27, glow(0x66ff22), 0, 0.02, 0.55, b);
  ball(0.1, glow(0x0b2a00), 0, 0.02, 0.8, b, 0).scale.set(0.4, 1.3, 0.5);
  P.eyeGlow = glowSprite(0x66ff22, 1.2, 0.7); P.eyeGlow.position.set(0, 0.02, 0.8); b.add(P.eyeGlow);
  for (const s of [-1, 1]) horn(0.04, 0.28, 0.35, bodyD, s * 0.17, -0.28, 0.62, b).rotation.x = Math.PI * 0.8;
  for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]]) {
    const l = group(x, -0.3, z, b);
    limb(0.03, 0.025, 0.28, bodyD, 0, 0, 0, l);
    const k = group(0, -0.3, 0, l); k.rotation.x = 0.5 * Math.sign(z);
    limb(0.025, 0.012, 0.3, bodyD, 0, 0, 0, k);
    l.rotation.z = Math.sign(x) * 0.3;
  }
  P.wings = [];
  for (const s of [-1, 1]) for (const k of [0, 1]) {
    const wg = group(s * 0.35, 0.3, k ? -0.3 : 0.15, b);
    const pl = mesh(new THREE.PlaneGeometry(1.4, 0.52), wing, s * 0.68, 0, 0, wg);
    pl.rotation.x = -Math.PI / 2; if (s < 0) pl.rotation.z = Math.PI;
    if (k) pl.scale.set(0.85, 0.85, 1);
    P.wings.push({ g: wg, s, k });
  }
  g.userData = { parts: P, hit: [{ y: 0, r: 0.72 }] };
  return g;
}

// ===== RIFTSTALKER: tall, slender, dark armour, red eye, sniper rifle =====
export function makeRiftstalker() {
  const g = new THREE.Group(), P = {};
  const T = { transparent: true };
  const armr = paint(0x2c3350, { metalness: 0.6, roughness: 0.28, ...T }), trim = paint(0x3d3366, T), gun = paint(0x15171f, { metalness: 0.7, roughness: 0.25, ...T });
  const red = glow(0xff2a2a, T), cloth = lam(0x161a28, { roughness: 0.9, side: THREE.DoubleSide, ...T });
  P.legs = [];
  for (const s of [-1, 1]) {
    const l = group(s * 0.22, 1.6, 0, g); P.legs.push(l);
    limb(0.11, 0.09, 0.72, armr, 0, 0, 0, l);
    ball(0.11, trim, 0, -0.82, 0.02, l, 0);
    limb(0.09, 0.065, 0.66, armr, 0, -0.86, -0.04, l);
    box(0.12, 0.5, 0.06, trim, 0, -1.12, 0.07, l);
    box(0.17, 0.08, 0.4, trim, 0, -1.58, 0.08, l);
  }
  const body = group(0, 1.6, 0, g); P.body = body;
  box(0.4, 0.3, 0.3, trim, 0, 0, 0, body);
  mesh(limbGeo(0.32, 0.2, 0.75), armr, 0, 1.0, 0, body).scale.z = 0.6;
  box(0.05, 0.6, 0.02, red, 0, 0.6, 0.2, body);
  for (const s of [-1, 1]) dome(0.17, trim, s * 0.38, 1.02, 0, body).scale.set(1.3, 0.9, 1.3);
  // tattered cloak
  const cg = new THREE.PlaneGeometry(0.75, 1.5, 6, 12), cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setZ(i, Math.sin(x * 9) * 0.04 - (0.75 - y) * 0.12); if (y < -0.6) cp.setY(i, y + Math.abs(Math.sin(x * 23)) * 0.25); }
  cg.computeVertexNormals();
  mesh(cg, cloth, 0, 0.3, -0.24, body);
  const head = group(0, 1.2, 0, body); P.head = head;
  cyl(0.06, 0.08, 0.2, trim, 0, 0.0, 0, head);
  ball(0.18, armr, 0, 0.24, 0, head).scale.set(0.85, 1.5, 1.1);
  horn(0.05, 0.45, -0.5, trim, 0, 0.42, -0.05, head).rotation.x = -0.7;
  P.eye = box(0.2, 0.06, 0.05, glow(0xff1a1a, T), 0, 0.27, 0.18, head);
  const eg = glowSprite(0xff2020, 0.9, 0.9); eg.position.set(0, 0.27, 0.25); head.add(eg);
  for (const s of [-1, 1]) {
    const a = group(s * 0.38, 0.95, 0, body);
    limb(0.07, 0.06, 0.52, armr, 0, 0, 0, a);
    const f = group(0, -0.6, 0, a); f.rotation.x = -Math.PI / 2 + 0.2;
    ball(0.065, trim, 0, 0, 0, f, 0);
    limb(0.06, 0.05, 0.48, armr, 0, 0, 0, f);
    a.rotation.x = -0.2;
  }
  const rf = group(0.1, 0.4, 0.5, body); P.rifle = rf;
  box(0.1, 0.16, 1.1, gun, 0, 0, 0.45, rf);
  box(0.08, 0.2, 0.45, gun, 0, -0.03, -0.3, rf);
  alongZ(cyl(0.035, 0.035, 0.95, gun, 0, 0.02, 1.45, rf));
  alongZ(cyl(0.055, 0.055, 0.14, gun, 0, 0.02, 1.9, rf));
  alongZ(cyl(0.05, 0.05, 0.45, gun, 0, 0.15, 0.25, rf));
  alongZ(cyl(0.065, 0.05, 0.08, gun, 0, 0.15, 0.48, rf));
  box(0.04, 0.04, 0.05, glow(0xff3030, T), 0, 0.15, 0.53, rf);
  box(0.02, 0.03, 1.0, red, 0.06, 0, 0.45, rf);
  box(0.07, 0.24, 0.12, gun, 0, -0.18, 0.4, rf);
  box(0.08, 0.3, 0.12, gun, 0, -0.18, 0.05, rf);
  P.muzzle = new THREE.Object3D(); P.muzzle.position.set(0, 0.02, 1.98); rf.add(P.muzzle);
  g.userData = { parts: P, hit: [{ y: 2.2, r: 0.5 }, { y: 3.0, r: 0.32 }, { y: 1.0, r: 0.45 }] };
  return g;
}

// an energy blade that tapers to a point (pointing along +z)
function bladeGeo(w, h, len) {
  const g = new THREE.BoxGeometry(w, h, len, 1, 4, 16), pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const t = (pa.getZ(i) + len / 2) / len, y = pa.getY(i);
    pa.setY(i, y * (1 - 0.85 * t ** 3));
    pa.setX(i, pa.getX(i) * (1 - 0.6 * t));
  }
  g.computeVertexNormals();
  return g;
}

// ===== GENERAL VRAX: giant warlord, black and purple armour, four eyes, energy blade =====
export function makeVrax() {
  const g = new THREE.Group(), P = {};
  const blk = paint(0x2a2238, { metalness: 0.6, roughness: 0.3 }), pur = paint(0x8a2cf0, { metalness: 0.4, roughness: 0.3 }), purD = paint(0x4d1490);
  const eye = glow(0xff2a44), seam = glow(0xb050ff), joint = phong(0x15121c, { roughness: 0.4 });
  P.legs = [];
  for (const s of [-1, 1]) {
    const L = group(s * 0.75, 2.6, 0, g); P.legs.push(L);
    limb(0.42, 0.36, 1.0, blk, 0, 0, 0, L);
    box(0.6, 0.9, 0.16, pur, 0, -0.55, 0.38, L).rotation.x = -0.08;
    ball(0.38, pur, 0, -1.25, 0.1, L);
    horn(0.1, 0.4, 0.25, blk, 0, -1.2, 0.42, L).rotation.x = Math.PI / 2;
    limb(0.38, 0.32, 0.95, blk, 0, -1.3, 0, L);
    box(0.62, 0.95, 0.16, pur, 0, -1.85, 0.38, L);
    box(0.85, 0.35, 1.3, blk, 0, -2.45, 0.2, L);
    ball(0.42, blk, 0, -2.45, 0.78, L).scale.set(1, 0.42, 0.6);
  }
  const body = group(0, 2.6, 0, g); P.body = body;
  box(1.7, 0.6, 1.0, blk, 0, 0.2, 0, body);
  box(0.4, 0.32, 0.12, pur, 0, 0.2, 0.52, body);
  for (const s of [-1, 1]) box(0.6, 0.8, 0.12, pur, s * 0.5, -0.3, 0.52, body).rotation.x = 0.12;
  const T = group(0, 0.5, 0, body); P.torso = T;
  box(2.3, 1.85, 1.25, blk, 0, 1.0, 0, T);
  for (const s of [-1, 1]) {
    box(1.0, 0.75, 0.22, purD, s * 0.55, 1.42, 0.6, T).rotation.set(-0.1, s * 0.15, 0);
    box(0.04, 1.3, 0.04, seam, s * 1.1, 0.95, 0.6, T);
  }
  for (let k = 0; k < 3; k++) box(0.95 - k * 0.1, 0.18, 0.12, blk, 0, 0.6 - k * 0.24, 0.62, T);
  box(0.9, 0.9, 0.1, pur, 0, 1.1, 0.68, T).rotation.z = Math.PI / 4;
  P.gem = ball(0.2, glow(0xd070ff), 0, 1.1, 0.76, T, 0);
  box(1.6, 0.6, 1.0, blk, 0, 0.0, 0, T);
  for (const s of [-1, 1]) {
    const pd = group(s * 1.45, 1.8, 0, T);
    pd.rotation.z = s * -0.3;
    dome(0.75, pur, 0, 0, 0, pd).scale.set(1, 0.72, 1.1);
    cyl(0.76, 0.8, 0.12, blk, 0, -0.02, 0, pd).scale.z = 1.1;
    for (const k of [-0.4, 0, 0.4]) horn(0.15, 0.85 - Math.abs(k) * 0.4, -0.25, blk, 0, 0.42, k, pd).rotation.z = s * -0.3;
  }
  const head = group(0, 2.35, 0.05, T); P.head = head;
  cyl(0.3, 0.38, 0.3, joint, 0, -0.05, 0, head);
  box(0.95, 0.95, 0.95, blk, 0, 0.35, 0, head);
  dome(0.52, blk, 0, 0.78, 0, head).scale.set(1, 0.5, 1);
  box(0.8, 0.62, 0.1, purD, 0, 0.3, 0.5, head);
  P.eyes = [];
  for (const [x, y] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, 0.24], [0.2, 0.24]]) P.eyes.push(box(0.15, 0.08, 0.05, eye, x, y, 0.56, head));
  for (let k = 0; k < 3; k++) box(0.4, 0.025, 0.04, joint, 0, 0.1 - k * 0.05, 0.56, head);
  for (const s of [-1, 1]) horn(0.14, 1.15, -0.45, pur, s * 0.45, 0.82, 0, head).rotation.z = s * -0.6;
  horn(0.06, 0.55, -0.6, pur, 0, 1.0, 0.2, head).rotation.x = -0.3;
  // flowing cape with folds
  const cg = new THREE.PlaneGeometry(2.4, 4.4, 16, 24), cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setZ(i, Math.sin(x * 6) * 0.1 * (1.4 - y / 4.4) - (2.2 - y) * 0.06); if (y < -1.9) cp.setY(i, y + Math.abs(Math.sin(x * 9)) * 0.35); }
  cg.computeVertexNormals();
  const cape = mesh(cg, skin(0x2a0a45, { side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0x9a5aff) }), 0, 0.0, -0.75, T);
  cape.rotation.x = 0.12;
  for (const s of [-1, 1]) {
    const A = group(s * 1.45, 1.5, 0, T);
    limb(0.33, 0.3, 0.95, blk, 0, 0, 0, A);
    ball(0.33, pur, 0, -1.2, 0, A);
    const F = group(0, -1.2, 0, A);
    limb(0.36, 0.3, 0.85, pur, 0, -0.05, 0, F);
    cyl(0.36, 0.36, 0.16, blk, 0, -0.95, 0, F);
    ball(0.3, blk, 0, -1.25, 0, F).scale.set(1, 0.9, 1);
    P[s > 0 ? 'armR' : 'armL'] = A; P[s > 0 ? 'foreR' : 'foreL'] = F;
  }
  const BL = group(0, -1.25, 0, P.foreR); P.blade = BL;
  alongZ(cyl(0.1, 0.1, 0.7, blk, 0, 0, 0.1, BL));
  box(0.7, 0.15, 0.15, pur, 0, 0, 0.45, BL);
  for (const s of [-1, 1]) horn(0.07, 0.35, 0.5, pur, s * 0.35, 0, 0.45, BL).rotation.z = s * -1.2;
  P.bladeCore = mesh(bladeGeo(0.16, 0.6, 5.0), glow(0xe0a0ff), 0, 0, 3.0, BL);
  P.bladeGlow = mesh(bladeGeo(0.45, 1.0, 5.4), addGlow(0xa040ff, 0.45), 0, 0, 3.0, BL);
  P.armR.rotation.set(-0.3, 0, 0.25); P.foreR.rotation.x = -0.6;
  P.armL.rotation.set(-0.2, 0, -0.2); P.foreL.rotation.x = -0.4;
  g.userData = { parts: P, hit: [{ y: 4.4, r: 1.6 }, { y: 6.2, z: 0.1, r: 0.75 }, { y: 1.8, r: 1.1 }] };
  return g;
}

// ===== THE NULL EMPEROR: enormous alien king, six mechanical arms, cosmic core =====
export function makeEmperor() {
  const g = new THREE.Group(), P = {};
  const blk = paint(0x0d0d14, { metalness: 0.6, roughness: 0.25 }), edge = glow(0x9d3cff), metal = paint(0x2c303c, { metalness: 0.7, roughness: 0.3 });
  const joint = glow(0x33e0ff), crown = paint(0x1a1026, { metalness: 0.6, roughness: 0.25 });
  // flowing robe with folds
  const rAt = y => 1.0 + 1.5 * (1 - y / 3.4) ** 1.6;
  const prof = [];
  for (let i = 0; i <= 16; i++) { const y = (i / 16) * 3.4; prof.push(new THREE.Vector2(rAt(y), y)); }
  const robe = new THREE.LatheGeometry(prof, 72), rp = robe.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), z = rp.getZ(i), y = rp.getY(i), a = Math.atan2(z, x), k = 1 + 0.06 * Math.sin(a * 9) * (1 - y / 3.4);
    rp.setX(i, x * k); rp.setZ(i, z * k);
  }
  robe.computeVertexNormals();
  mesh(robe, paint(0x0d0d14, { metalness: 0.3, roughness: 0.5, clearcoat: 0.3 }), 0, 0, 0, g);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, pts = []; for (let k = 0; k <= 6; k++) { const y = (k / 6) * 3.3, r = rAt(y) * 1.08 + 0.02; pts.push([Math.sin(a) * r, y, Math.cos(a) * r]); } tube(pts, 0.035, edge, g); }
  const T = group(0, 3.2, 0, g); P.torso = T;
  box(2.6, 2.4, 1.6, blk, 0, 1.2, 0, T);
  for (const [x, y, w, h] of [[1.3, 1.2, 0.06, 2.4], [-1.3, 1.2, 0.06, 2.4], [0, 2.4, 2.6, 0.06], [0, 0, 2.6, 0.06]]) box(w, h, 0.06, edge, x, y, 0.81, T);
  ring(0.82, 0.08, metal, 0, 1.25, 0.8, T);
  P.core = ball(0.72, new THREE.MeshBasicMaterial({ map: TEX.core }), 0, 1.25, 0.72, T, 2);
  P.coreGlow = glowSprite(0xd23cff, 3.5, 0.0); P.coreGlow.position.set(0, 1.25, 1.2); T.add(P.coreGlow);
  P.shells = [];
  for (const s of [-1, 1]) {
    const sh = group(s * 0.86, 1.25, 0.85, T); P.shells.push({ g: sh, s });
    box(0.86, 1.7, 0.18, metal, -s * 0.43, 0, 0, sh);
    box(0.06, 1.7, 0.2, edge, -s * 0.84, 0, 0.02, sh);
    for (let k = -1; k <= 1; k++) box(0.5, 0.04, 0.05, crown, -s * 0.45, k * 0.45, 0.1, sh);
  }
  for (const s of [-1, 1]) {
    dome(0.85, crown, s * 1.75, 2.0, 0, T).scale.set(1, 0.75, 1.15);
    ring(0.84, 0.04, edge, s * 1.75, 2.0, 0, T).rotation.x = Math.PI / 2;
    for (const k of [-0.5, 0, 0.5]) horn(0.17, 1.1 - Math.abs(k) * 0.5, -0.3, crown, s * 1.9, 2.5, k, T).rotation.z = s * -0.35;
  }
  const head = group(0, 2.7, 0.1, T); P.head = head;
  cyl(0.35, 0.45, 0.3, crown, 0, 0.05, 0, head);
  ball(0.55, blk, 0, 0.55, 0, head).scale.set(0.9, 1.1, 0.85);
  box(0.6, 0.06, 0.06, edge, 0, 0.15, 0.42, head);
  P.eyes = [];
  for (const [x, y] of [[-0.24, 0.72], [0, 0.78], [0.24, 0.72], [-0.24, 0.52], [0, 0.58], [0.24, 0.52]]) {
    const z = 0.47 * Math.sqrt(Math.max(0, 1 - (x / 0.495) ** 2 - ((y - 0.55) / 0.605) ** 2));
    const e = box(0.12, 0.07, 0.05, glow(0x99f6ff), x, y, z + 0.01, head); e.rotation.y = Math.asin(x / 0.55);
    P.eyes.push(e);
  }
  for (let i = 0; i < 7; i++) {
    const a = ((i - 3) / 3) * 0.9, h = 0.6 + (i === 3 ? 0.5 : (3 - Math.abs(i - 3)) * 0.1);
    const c = horn(0.1, h, -0.15, crown, Math.sin(a) * 0.42, 1.05, Math.cos(a) * 0.1, head); c.rotation.z = -a * 0.6;
    ball(0.06, edge, Math.sin(a) * 0.42 - Math.sin(a * 0.6) * h * 0.9, 1.05 + Math.cos(a * 0.6) * h, Math.cos(a) * 0.1 - 0.1, head, 0);
  }
  ring(0.95, 0.03, edge, 0, 0.75, -0.55, head);
  P.eyeMark = new THREE.Object3D(); P.eyeMark.position.set(0, 0.7, 0.6); head.add(P.eyeMark);
  P.arms = [];
  for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
    const a = group(s * 1.45, 2.1 - k * 0.8, 0.1, T);
    ball(0.25, joint, 0, 0, 0, a, 0);
    limb(0.18, 0.15, 1.55, metal, 0, 0, 0, a);
    const f = group(0, -1.6, 0, a);
    ball(0.2, joint, 0, 0, 0, f, 0);
    limb(0.15, 0.12, 1.45, metal, 0, 0, 0, f);
    for (const c of [-0.12, 0, 0.12]) horn(0.06, 0.45, c * 2.5, metal, c, -1.5, 0, f).rotation.x = Math.PI;
    const hm = new THREE.Object3D(); hm.position.set(0, -1.6, 0); f.add(hm);
    a.rotation.z = s * (0.7 + k * 0.3); a.rotation.x = -0.4 + k * 0.1; f.rotation.x = -0.6;
    P.arms.push({ g: a, f, s, k, hand: hm });
  }
  g.userData = { parts: P, hit: [{ y: 4.45, z: 0.75, r: 0.85, tag: 'core' }, { y: 4.4, r: 1.7, tag: 'body' }, { y: 6.4, r: 0.8, tag: 'body' }, { y: 1.7, r: 2.0, tag: 'body' }] };
  return g;
}
