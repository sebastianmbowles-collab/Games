// Chapter 2: the jungle planet. Scenery, the rail cart, and the creatures that live there.
import { THREE } from './engine.js';
import { phong, lam, glow, addGlow, mesh, box, ball, cyl, cone, group, glowSprite } from './models.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

// ===== Scenery =====
export function makeTree() {
  const g = new THREE.Group(), h = rnd(14, 26), r = rnd(0.7, 1.4);
  const bark = lam(pick([0x4a2f3a, 0x3a2a40, 0x52342a]), { roughness: 0.9 });
  const trunk = cyl(r * 0.7, r, h, bark, 0, h / 2, 0, g, 8);
  trunk.rotation.z = rnd(-0.08, 0.08);
  for (let i = 0; i < 4; i++) { const root = cyl(0.15, r * 0.5, 3, bark, 0, 0.8, 0, g, 6); root.rotation.set(rnd(-0.2, 0.2), (i / 4) * Math.PI * 2, 0.9); root.position.set(Math.cos(i * 1.6) * r, 0.6, Math.sin(i * 1.6) * r); }
  const leaf = [lam(0x1d6b3a, { roughness: 0.7 }), lam(0x2a8a5a, { roughness: 0.7 }), lam(0x16503a, { roughness: 0.7 })];
  for (let i = 0; i < 6; i++) {
    const s = rnd(3, 6);
    const b = ball(s, pick(leaf), rnd(-4, 4), h + rnd(-2, 2), rnd(-4, 4), g);
    b.scale.y = rnd(0.5, 0.8);
  }
  const pod = glow(pick([0x3dfff0, 0xff4ad8, 0xb0ff3d]));
  for (let i = 0; i < 6; i++) {
    const vx = rnd(-4, 4), vz = rnd(-4, 4), vl = rnd(3, 9);
    cyl(0.05, 0.05, vl, lam(0x2f7a3a), vx, h - 1 - vl / 2, vz, g, 4);
    if (Math.random() < 0.6) ball(0.25, pod, vx, h - 1 - vl, vz, g, 0);
  }
  return g;
}
export function makeFern() {
  const g = new THREE.Group(), m = lam(pick([0x2aa04a, 0x1f8a6a, 0x3ab05a]), { roughness: 0.6, side: THREE.DoubleSide });
  const n = 7 + ((Math.random() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const l = mesh(new THREE.ConeGeometry(0.35, rnd(2.5, 4.5), 6, 1), m, 0, 1.4, 0, g);
    l.scale.z = 0.15;
    l.rotation.set(rnd(0.5, 1.1), (i / n) * Math.PI * 2, 0, 'YXZ');
  }
  return g;
}
export function makeMushroom() {
  const g = new THREE.Group(), h = rnd(1.5, 4.5), c = pick([0x3dfff0, 0xff4ad8, 0xffb03d, 0x9a5aff]);
  cyl(0.15, 0.25, h, lam(0xe0d8c8), 0, h / 2, 0, g, 8);
  const cap = mesh(new THREE.SphereGeometry(h * 0.35, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(c, { emissive: c, emissiveIntensity: 0.9 }), 0, h, 0, g);
  cap.scale.y = 0.6;
  for (let i = 0; i < 5; i++) ball(0.06, glow(0xffffff), rnd(-0.3, 0.3) * h, h + 0.05, rnd(-0.3, 0.3) * h, g, 0);
  return g;
}
export function makeRockPile() {
  const g = new THREE.Group(), m = lam(pick([0x3a3048, 0x4a3a52]), { roughness: 0.95 });
  for (let i = 0; i < 4; i++) { const b = ball(rnd(0.6, 2), m, rnd(-1.5, 1.5), 0.3, rnd(-1.5, 1.5), g); b.scale.y = rnd(0.5, 0.9); }
  return g;
}
export function makeFlower() {
  const g = new THREE.Group(), c = pick([0xff3dd0, 0x3dd0ff, 0xffe03d]);
  cyl(0.05, 0.08, 1.6, lam(0x2a8a3a), 0, 0.8, 0, g, 6);
  for (let i = 0; i < 6; i++) {
    const p = ball(0.28, lam(c, { emissive: c, emissiveIntensity: 0.6 }), Math.cos(i) * 0.3, 1.65, Math.sin(i) * 0.3, g);
    p.scale.set(1, 0.35, 0.6); p.rotation.y = i;
  }
  ball(0.15, glow(0xffffff), 0, 1.7, 0, g, 0);
  return g;
}
// glowing swamp pool that swamp monsters rise out of
export function makePool(r = 3) {
  const g = new THREE.Group();
  const w = mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ color: 0x1a4a2a, emissive: 0x2aff6a, emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.3 }), 0, 0.05, 0, g);
  w.rotation.x = -Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(r, 0.25, 6, 32), lam(0x2a3a1a), 0, 0.05, 0, g);
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) { const reed = cyl(0.04, 0.06, rnd(1.5, 3), lam(0x3a6a2a), Math.cos(i * 1.3) * r * 1.05, 1, Math.sin(i * 1.3) * r * 1.05, g, 4); reed.rotation.z = rnd(-0.3, 0.3); }
  g.userData.water = w;
  return g;
}

// ===== The rail cart UNIT-07 rides on =====
export function makeCart() {
  const g = new THREE.Group(), P = {};
  const metal = phong(0x5a6478), dark = phong(0x2a2f3a), hz = lam(0x8a5a10, { roughness: 0.8 }), red = glow(0xff3020);
  box(7.4, 0.4, 4.4, metal, 0, 0.75, 0, g);
  box(7.6, 0.25, 0.3, hz, 0, 1.0, -2.2, g);
  for (const s of [-1, 1]) {
    box(0.25, 0.8, 0.25, dark, s * 3.6, 1.3, -2.1, g);
    box(0.25, 0.8, 0.25, dark, s * 3.6, 1.3, 2.1, g);
    box(0.2, 0.2, 4.4, metal, s * 3.6, 1.65, 0, g);
    for (const z of [-1.5, 1.5]) { const w = cyl(0.45, 0.45, 0.3, dark, s * 2.6, 0.45, z, g, 12); w.rotation.z = Math.PI / 2; }
    P['light' + (s > 0 ? 'R' : 'L')] = ball(0.1, red, s * 3.6, 1.8, -2.1, g, 0);
  }
  box(7.4, 0.15, 0.15, metal, 0, 1.65, -2.1, g);
  g.userData.parts = P;
  return g;
}

// ===== ALIEN PLANT: a giant snapping flytrap that spits acid =====
export function makePlant() {
  const g = new THREE.Group(), P = {};
  const stem = lam(0x2a8a3a), skin = lam(0xc0208a, { roughness: 0.4 }), inside = lam(0xd8ff3d, { emissive: 0xa8ff20, emissiveIntensity: 0.8 }), tooth = lam(0xf8f4e0);
  for (let i = 0; i < 6; i++) {
    const l = mesh(new THREE.ConeGeometry(0.6, 3.2, 8), lam(0x1f7a3a, { side: THREE.DoubleSide }), 0, 0.6, 0, g);
    l.scale.z = 0.2; l.rotation.set(1.2, (i / 6) * Math.PI * 2, 0, 'YXZ');
  }
  const s1 = group(0, 0, 0, g); P.stem = s1;
  cyl(0.28, 0.4, 2.2, stem, 0, 1.1, 0, s1, 8);
  const s2 = group(0, 2.2, 0, s1); P.neck = s2;
  cyl(0.22, 0.28, 1.6, stem, 0, 0.8, 0, s2, 8);
  const head = group(0, 1.7, 0, s2); P.head = head;
  const top = group(0, 0, 0, head), bot = group(0, 0, 0, head); P.top = top; P.bot = bot;
  const shell = new THREE.SphereGeometry(0.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  mesh(shell, skin, 0, 0, 0.5, top).scale.set(1, 0.7, 1.3);
  const lower = mesh(shell, skin, 0, 0, 0.5, bot); lower.scale.set(1, 0.7, 1.3); lower.rotation.x = Math.PI;
  mesh(new THREE.CircleGeometry(0.85, 20), inside, 0, 0.01, 0.5, top).rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI - Math.PI / 2, x = Math.sin(a) * 0.85, z = 0.5 + Math.cos(a) * 1.05;
    const t1 = cone(0.07, 0.4, tooth, x, -0.15, z, top, 4); t1.rotation.x = Math.PI;
    cone(0.07, 0.4, tooth, x, 0.15, z, bot, 4);
  }
  for (let i = 0; i < 6; i++) ball(0.1, lam(0xff7ad8), Math.cos(i) * 0.6, 0.45, 0.2 + Math.sin(i) * 0.5, top, 0);
  P.glow = glowSprite(0xb0ff3d, 2, 0.5); P.glow.position.set(0, 0, 1.2); head.add(P.glow);
  P.mouth = new THREE.Object3D(); P.mouth.position.set(0, 0, 1.5); head.add(P.mouth);
  g.userData = { parts: P, hit: [{ y: 3.9, z: 0.5, r: 1.0 }, { y: 1.8, r: 0.6 }] };
  return g;
}

// ===== GIANT BUG: a huge mantis-beetle that leaps at the cart =====
export function makeBug() {
  const g = new THREE.Group(), P = {};
  const shell = phong(0x1a8a7a, { roughness: 0.2, metalness: 0.8 }), shell2 = phong(0x6a2ab0, { roughness: 0.25, metalness: 0.8 });
  const leg = phong(0x1a1a24), eye = glow(0xff3020), claw = lam(0xe8e0c8);
  const body = group(0, 1.3, 0, g); P.body = body;
  ball(0.9, shell, 0, 0, -0.6, body).scale.set(1, 0.65, 1.5);
  ball(0.6, shell2, 0, 0.1, 0.6, body).scale.set(1, 0.8, 1);
  const head = group(0, 0.25, 1.2, body); P.head = head;
  ball(0.45, shell, 0, 0, 0, head).scale.set(1.1, 0.8, 1);
  ball(0.16, eye, -0.28, 0.12, 0.25, head, 0); ball(0.16, eye, 0.28, 0.12, 0.25, head, 0);
  for (const s of [-1, 1]) { const m = cone(0.08, 0.6, claw, s * 0.18, -0.2, 0.45, head, 4); m.rotation.set(1.6, 0, s * -0.4); }
  for (const s of [-1, 1]) { const a = cyl(0.03, 0.02, 1.2, leg, s * 0.15, 0.5, 0.2, head, 4); a.rotation.set(-0.8, 0, s * 0.4); }
  P.legs = [];
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const L = group(s * 0.6, -0.1, 0.4 - i * 0.6, body); P.legs.push({ g: L, s, i });
    cyl(0.07, 0.06, 1.2, leg, s * 0.5, 0.2, 0, L, 6).rotation.z = s * -1.1;
    cyl(0.06, 0.03, 1.4, leg, s * 1.05, -0.45, 0, L, 6).rotation.z = s * 0.35;
  }
  P.scythes = [];
  for (const s of [-1, 1]) {
    const S = group(s * 0.45, 0.2, 1.0, body); P.scythes.push(S);
    cyl(0.08, 0.07, 1.0, shell2, 0, 0.4, 0.2, S, 6).rotation.x = -0.6;
    const blade = cone(0.12, 1.3, claw, 0, 0.8, 0.9, S, 4); blade.rotation.x = 1.9;
    S.rotation.x = 0.3;
  }
  P.wings = [];
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.PlaneGeometry(0.9, 2.2), new THREE.MeshBasicMaterial({ color: 0x9affea, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }), s * 0.4, 0.55, -0.6, body);
    w.rotation.set(-Math.PI / 2, 0, s * 0.15); P.wings.push(w);
  }
  g.userData = { parts: P, hit: [{ y: 1.3, z: -0.4, r: 1.1 }, { y: 1.55, z: 1.2, r: 0.55 }] };
  return g;
}

// ===== JUNGLE SOLDIER: a Zippit in camouflage with a blaster =====
export function makeSoldier(makeZippit) {
  const g = makeZippit(), P = g.userData.parts;
  const recolor = { 0x2ef03c: 0x6a9a2a, 0x17b02a: 0x4a6a1a, 0x8a2be2: 0x3a4a22, 0x4b1080: 0x2a3218 };
  g.traverse(o => {
    if (!o.material || !o.material.color) return;
    const to = recolor[o.material.color.getHex()];
    if (to !== undefined) { o.material = o.material.clone(); o.material.color.setHex(to); }
  });
  const camo = lam(0x2a5a1a);
  const helm = group(0, 0.22, 0, P.head);
  mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x3a4a22), 0, 0, 0, helm);
  box(0.6, 0.1, 0.12, glow(0xffa020), 0, -0.02, 0.36, helm);
  for (let i = 0; i < 5; i++) { const t = cone(0.06, 0.4, camo, Math.cos(i * 1.3) * 0.3, 0.3, Math.sin(i * 1.3) * 0.3, helm, 4); t.rotation.z = Math.cos(i) * 0.6; }
  const gun = group(0.15, 0.0, 0.45, P.body); P.gun = gun;
  box(0.16, 0.2, 0.9, phong(0x2a2f3a), 0, 0, 0.2, gun);
  box(0.06, 0.06, 0.4, glow(0xffa020), 0, 0.12, 0.25, gun);
  const m = new THREE.Object3D(); m.position.set(0, 0, 0.7); gun.add(m); P.muzzle = m;
  for (const a of P.arms) a.rotation.x = -1.3;
  g.userData.hit = [{ y: 0.95, r: 0.55 }, { y: 1.6, z: 0.05, r: 0.45 }];
  return g;
}

// ===== SWAMP MONSTER: rises out of the water and throws mud =====
export function makeSwamp() {
  const g = new THREE.Group(), P = {};
  const mud = lam(0x3a5a22, { roughness: 0.95 }), mud2 = lam(0x2a3a14, { roughness: 0.95 }), algae = lam(0x5aa03a);
  const body = group(0, 0, 0, g); P.body = body;
  ball(1.4, mud, 0, 1.6, 0, body).scale.set(1, 1.2, 0.9);
  ball(0.9, mud2, 0, 3.1, 0.3, body).scale.set(1.2, 0.9, 1);
  P.eye = ball(0.32, glow(0xffe020), 0, 3.3, 0.95, body);
  ball(0.12, glow(0x201000), 0, 3.3, 1.22, body, 0);
  for (const [x, y] of [[-0.55, 3.55], [0.55, 3.5], [-0.35, 3.75]]) ball(0.11, glow(0xffe020), x, y, 0.85, body, 0);
  const mouth = mesh(new THREE.SphereGeometry(0.55, 16, 8), glow(0x1a2a08), 0, 2.6, 0.95, body); mouth.scale.set(1.3, 0.5, 0.4);
  for (let i = 0; i < 6; i++) { const t = cone(0.07, 0.3, lam(0xe8e0b0), -0.5 + i * 0.2, 2.82, 1.08, body, 4); t.rotation.x = Math.PI; }
  for (let i = 0; i < 12; i++) { const d = cone(0.12, rnd(0.4, 1), mud, rnd(-1.2, 1.2), rnd(0.6, 2.4), rnd(-0.4, 0.9), body, 5); d.rotation.x = Math.PI; }
  for (let i = 0; i < 8; i++) cyl(0.03, 0.03, rnd(0.8, 1.8), algae, rnd(-1, 1), rnd(2.4, 3.3), rnd(0.3, 0.9), body, 3);
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 1.3, 2.4, 0.2, body); P.arms.push(a);
    cyl(0.28, 0.2, 1.8, mud, 0, -0.9, 0, a, 8);
    ball(0.4, mud2, 0, -1.9, 0.1, a);
    a.rotation.z = s * 0.4;
  }
  P.hand = new THREE.Object3D(); P.hand.position.set(0, -1.9, 0); P.arms[1].add(P.hand);
  g.userData = { parts: P, hit: [{ y: 1.8, r: 1.4 }, { y: 3.2, z: 0.3, r: 0.9 }] };
  return g;
}

// ===== HUMAN MUTANT: a colonist the aliens changed. Very scary. =====
export function makeMutant() {
  const g = new THREE.Group(), P = {};
  const skin = lam(0x5e6656, { roughness: 0.45 }), skinD = lam(0x3a4034, { roughness: 0.6 });
  const rag = lam(pick([0x2a5ab0, 0xc8d0e0, 0x3a4a6a]), { roughness: 0.9, side: THREE.DoubleSide });
  const vein = glow(0xff2ad0), growth = lam(0x8a1a8a, { emissive: 0xff2ad0, emissiveIntensity: 0.5, roughness: 0.3 });
  const tooth = lam(0xf0e8d0), claw = lam(0x2a2a20);
  P.legs = [];
  for (const s of [-1, 1]) {
    const L = group(s * 0.25, 1.35, 0, g); P.legs.push(L);
    cyl(0.12, 0.1, 0.8, skin, 0, -0.4, 0.05, L, 8);
    const shin = group(0, -0.8, 0.1, L);
    cyl(0.1, 0.07, 0.7, skin, 0, -0.35, -0.1, shin, 8).rotation.x = -0.25;
    box(0.16, 0.08, 0.35, skinD, 0, -0.72, 0, shin);
  }
  const body = group(0, 1.4, 0, g); P.body = body;
  ball(0.36, skin, 0, 0.55, 0, body).scale.set(1, 1.3, 0.7);
  mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.7, 10, 1, true), rag, 0, 0.45, 0, body);
  for (let i = 0; i < 6; i++) box(0.03, rnd(0.3, 0.6), 0.03, vein, rnd(-0.25, 0.25), rnd(0.35, 0.85), 0.27, body).rotation.z = rnd(-0.6, 0.6);
  for (let i = 0; i < 7; i++) cone(0.05, rnd(0.25, 0.55), lam(0xd8d0b8), 0, 0.3 + i * 0.12, -0.27, body, 5).rotation.x = -1.2;
  for (let i = 0; i < 4; i++) box(0.5, 0.03, 0.05, skinD, 0, 0.4 + i * 0.12, 0.25, body);
  const head = group(0, 1.15, 0.12, body); P.head = head;
  ball(0.24, skin, 0, 0.1, 0, head).scale.set(0.85, 1.25, 1);
  // sunken black eye sockets with tiny red pupils
  for (const s of [-1, 1]) { ball(0.075, glow(0x000000), s * 0.09, 0.15, 0.17, head, 0).scale.set(1, 1.3, 0.6); ball(0.025, glow(0xff1010), s * 0.09, 0.15, 0.215, head, 0); }
  for (const s of [-1, 1]) box(0.02, 0.18, 0.02, glow(0xff2ad0), s * 0.15, 0.05, 0.16, head).rotation.z = s * 0.4;
  P.eyeGlow = glowSprite(0xff1010, 0.8, 0.9); P.eyeGlow.position.set(0, 0.15, 0.28); head.add(P.eyeGlow);
  const jaw = group(0, -0.05, 0.1, head); P.jaw = jaw;
  mesh(new THREE.SphereGeometry(0.16, 12, 8), glow(0x080202), 0, -0.1, 0.08, jaw).scale.set(1, 2.0, 0.6);
  for (let i = 0; i < 7; i++) { const t = cone(0.022, rnd(0.1, 0.2), tooth, -0.11 + i * 0.037, 0.08, 0.16, jaw, 3); t.rotation.x = Math.PI + rnd(-0.3, 0.3); }
  for (let i = 0; i < 6; i++) cone(0.02, rnd(0.08, 0.16), tooth, -0.09 + i * 0.036, -0.32, 0.14, jaw, 3);
  head.rotation.z = 0.35;
  // one normal arm, one swollen arm covered in alien growths
  P.arms = [];
  const aN = group(-0.38, 0.85, 0, body); P.arms.push(aN);
  cyl(0.07, 0.05, 1.2, skin, 0, -0.6, 0, aN, 8);
  for (const k of [-0.05, 0, 0.05]) cone(0.025, 0.45, claw, k, -1.38, 0.05, aN, 4).rotation.x = Math.PI;
  const aB = group(0.45, 0.85, 0, body); P.arms.push(aB);
  ball(0.3, skinD, 0, -0.25, 0, aB).scale.set(1, 1.6, 1);
  ball(0.35, skin, 0, -0.85, 0.05, aB).scale.set(1, 1.3, 1);
  for (let i = 0; i < 6; i++) ball(rnd(0.08, 0.16), growth, rnd(-0.25, 0.25), rnd(-1.1, -0.1), rnd(0.15, 0.3), aB);
  for (const k of [-0.12, 0, 0.12]) cone(0.05, 0.55, claw, k, -1.35, 0.1, aB, 4).rotation.x = Math.PI + 0.3;
  aN.rotation.x = -0.3; aB.rotation.x = -0.2;
  g.userData = { parts: P, hit: [{ y: 1.95, r: 0.5 }, { y: 2.65, z: 0.12, r: 0.3 }, { y: 0.9, r: 0.4 }] };
  return g;
}

// ===== PATIENT ZERO: the first colonist the aliens mutated. Giant. =====
export function makePatientZero() {
  const g = makeMutant(), P = g.userData.parts;
  const growth = lam(0x8a1a8a, { emissive: 0xff2ad0, emissiveIntensity: 0.6, roughness: 0.3 }), crystal = lam(0x6a2aff, { emissive: 0x6a2aff, emissiveIntensity: 0.7, roughness: 0.15 });
  // alien crystals along the spine
  for (let i = 0; i < 7; i++) { const c = cone(0.08, rnd(0.4, 0.8), crystal, rnd(-0.1, 0.1), 0.2 + i * 0.16, -0.32, P.body, 6); c.rotation.x = -1.0; }
  // the parasite in its chest: the weak spot
  const pod = group(0, 0.55, 0.3, P.body); P.pod = pod;
  P.core = ball(0.22, glow(0xff4af0), 0, 0, 0, pod);
  P.coreGlow = glowSprite(0xff4af0, 1.6, 0.2); pod.add(P.coreGlow);
  P.ribs = [];
  for (let i = 0; i < 6; i++) {
    const rb = group(0, 0, 0, pod); rb.rotation.z = (i / 6) * Math.PI * 2; P.ribs.push(rb);
    const c = cone(0.05, 0.35, growth, 0, 0.2, 0.05, rb, 5); c.rotation.x = 0.6;
  }
  // a third arm: an alien tentacle
  const t = group(0.1, 0.95, -0.1, P.body); P.tentacle = t;
  for (let i = 0; i < 6; i++) ball(0.12 - i * 0.012, growth, 0, 0.15 + i * 0.2, -0.1 - i * 0.05, t);
  // a cracked colonist helmet
  const helm = mesh(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 1.4, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdfe8ff, roughness: 0.2, metalness: 0.4, side: THREE.DoubleSide }), 0, 0.12, 0, P.head);
  helm.rotation.y = 0.8;
  P.hand = new THREE.Object3D(); P.hand.position.set(0, -1.3, 0); P.arms[1].add(P.hand);
  g.userData.hit = [{ y: 1.95, z: 0.3, r: 0.3, tag: 'core' }, { y: 1.95, r: 0.55, tag: 'body' }, { y: 2.65, z: 0.12, r: 0.32, tag: 'body' }, { y: 0.9, r: 0.45, tag: 'body' }];
  return g;
}

// thrown by Patient Zero
export function makeLog() {
  const g = new THREE.Group();
  const l = cyl(0.5, 0.6, 5, lam(0x4a2f3a, { roughness: 0.9 }), 0, 0, 0, g, 8);
  l.rotation.z = Math.PI / 2;
  ball(1.2, lam(0x1d6b3a), 2.6, 0.3, 0, g).scale.set(0.8, 0.7, 1);
  return g;
}
export { addGlow };

// ===== COMMANDER NOVA, in person (arrives at the end of chapter 1) =====
export function makeNova() {
  const g = new THREE.Group(), P = {};
  const blue = lam(0x1f5fd6, { roughness: 0.5 }), white = lam(0xf0f6ff, { roughness: 0.4 }), skin = lam(0xc98d64, { roughness: 0.6 });
  const hair = lam(0x2a1a12, { roughness: 0.8 }), boot = phong(0x1a1e2a);
  P.legs = [];
  for (const s of [-1, 1]) {
    const L = group(s * 0.16, 0.95, 0, g); P.legs.push(L);
    cyl(0.1, 0.09, 0.9, blue, 0, -0.45, 0, L, 10);
    box(0.16, 0.12, 0.3, boot, 0, -0.9, 0.05, L);
  }
  const body = group(0, 0.95, 0, g); P.body = body;
  box(0.48, 0.65, 0.28, blue, 0, 0.4, 0, body);
  box(0.12, 0.6, 0.29, white, 0, 0.42, 0.005, body);
  for (const s of [-1, 1]) box(0.14, 0.1, 0.3, white, s * 0.22, 0.72, 0, body);
  ball(0.04, glow(0xffd24a), 0.14, 0.6, 0.15, body, 0);
  cyl(0.06, 0.07, 0.12, skin, 0, 0.79, 0, body, 8);
  const head = group(0, 1.0, 0, body); P.head = head;
  ball(0.15, skin, 0, 0, 0, head).scale.set(0.9, 1.1, 0.95);
  mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.02, -0.01, head);
  for (const s of [-1, 1]) ball(0.02, glow(0x101010), s * 0.05, 0.02, 0.13, head, 0);
  box(0.02, 0.12, 0.02, glow(0x33e0ff), 0.15, -0.02, 0.05, head);
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 0.29, 0.68, 0, body); P.arms.push(a);
    cyl(0.06, 0.05, 0.62, blue, 0, -0.31, 0, a, 8);
    ball(0.05, skin, 0, -0.65, 0, a);
    if (s < 0) {
      box(0.1, 0.06, 0.14, white, 0, -0.5, 0.03, a);
      const holo = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x33e0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), 0, -0.48, 0.2, a);
      holo.rotation.x = -0.6; P.holo = holo;
    }
  }
  g.userData.parts = P;
  return g;
}
