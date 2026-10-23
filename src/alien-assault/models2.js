// Chapter 2: the jungle planet. Scenery, the rail cart, and the creatures that live there.
import { THREE } from './engine.js';
import { lam, glow, addGlow, mesh, box, ball, cyl, cone, group, glowSprite, paint, skin, ring, limb, horn, blob, tube, dome, getWingTex } from './models.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

// a leaf or frond along +y that narrows at both ends, folds along the middle and droops at the tip
function leafGeo(w, L, droop = 0.3, jag = 0) {
  const g = new THREE.PlaneGeometry(w, L, 4, 12);
  g.translate(0, L / 2, 0);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    const t = pa.getY(i) / L;
    let x = pa.getX(i) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.03)), 0.7);
    if (jag) x *= 1 + jag * Math.abs(Math.sin(t * 38));
    pa.setX(i, x);
    pa.setZ(i, droop * L * t * t + Math.abs(x) * 0.35);
  }
  g.computeVertexNormals();
  return g;
}
// a plant stalk standing up from y=0 with little bumps along it
function stalkGeo(r1, r2, h, seg = 20) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.max(0.01, r1 + (r2 - r1) * t + 0.035 * Math.sin(t * 19)), t * h)); }
  return new THREE.LatheGeometry(pts, seg);
}

// ===== Scenery =====
export function makeTree() {
  const g = new THREE.Group(), h = rnd(14, 26), r = rnd(0.7, 1.4), lean = rnd(-1.2, 1.2);
  const bark = lam(pick([0x4a2f3a, 0x3a2a40, 0x52342a]), { roughness: 0.9 });
  const pts = [];
  for (let k = 0; k <= 5; k++) pts.push([Math.sin(k * 0.9) * 0.4 + (lean * k) / 5, (k / 5) * h, Math.cos(k * 1.3) * 0.3]);
  tube(pts, r, bark, g, 0.45);
  // buttress roots
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + rnd(-0.3, 0.3); tube([[0, 2.2, 0], [Math.cos(a) * r * 1.3, 0.7, Math.sin(a) * r * 1.3], [Math.cos(a) * r * 2.8, -0.1, Math.sin(a) * r * 2.8]], r * 0.38, bark, g, 0.8); }
  // branches reaching into the canopy
  for (let i = 0; i < 3; i++) { const a = rnd(0, 6.3), y = h * rnd(0.6, 0.8); tube([[lean * 0.7, y, 0], [lean * 0.8 + Math.cos(a) * 2, y + 2, Math.sin(a) * 2], [lean + Math.cos(a) * 3.5, h + 0.5, Math.sin(a) * 3.5]], r * 0.3, bark, g, 0.6); }
  const leaf = [lam(0x1d6b3a, { roughness: 0.7 }), lam(0x2a8a5a, { roughness: 0.7 }), lam(0x16503a, { roughness: 0.7 })];
  for (let i = 0; i < 7; i++) {
    const s = rnd(3, 5.5);
    blob(s, pick(leaf), lean + rnd(-4, 4), h + rnd(-1.5, 2), rnd(-4, 4), g, 0.14, rnd(0, 9)).scale.y = rnd(0.5, 0.75);
  }
  const vine = lam(0x2f7a3a), pod = glow(pick([0x3dfff0, 0xff4ad8, 0xb0ff3d]));
  for (let i = 0; i < 6; i++) {
    const vx = lean + rnd(-4, 4), vz = rnd(-4, 4), vl = rnd(3, 9), sw = rnd(-0.8, 0.8);
    tube([[vx, h - 1, vz], [vx + sw, h - 1 - vl * 0.5, vz + sw * 0.5], [vx, h - 1 - vl, vz]], 0.06, vine, g);
    if (Math.random() < 0.6) ball(0.25, pod, vx, h - 1 - vl, vz, g, 0);
  }
  return g;
}
export function makeFern() {
  const g = new THREE.Group(), m = lam(pick([0x2aa04a, 0x1f8a6a, 0x3ab05a]), { roughness: 0.6, side: THREE.DoubleSide });
  const n = 8 + ((Math.random() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const l = mesh(leafGeo(0.75, rnd(2.5, 4.2), 0.45, 0.35), m, 0, 0.2, 0, g);
    l.rotation.set(rnd(0.5, 1.0), (i / n) * Math.PI * 2 + rnd(-0.2, 0.2), 0, 'YXZ');
  }
  return g;
}
export function makeMushroom() {
  const g = new THREE.Group(), h = rnd(1.5, 4.5), c = pick([0x3dfff0, 0xff4ad8, 0xffb03d, 0x9a5aff]);
  mesh(stalkGeo(0.28, 0.16, h), lam(0xe0d8c8), 0, 0, 0, g);
  const R = h * 0.35, prof = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 0.55; prof.push(new THREE.Vector2(Math.max(0.01, Math.sin(a) * R * (1 + 0.15 * (i / 14))), Math.cos(a) * R * 0.6 - (i > 11 ? (i - 11) * 0.06 * R : 0))); }
  prof.reverse();
  mesh(new THREE.LatheGeometry(prof, 32), lam(c, { emissive: c, emissiveIntensity: 0.9, side: THREE.DoubleSide }), 0, h - 0.1, 0, g);
  cone(R * 1.05, R * 0.25, glow(new THREE.Color(c).multiplyScalar(0.5).getHex()), 0, h - 0.05, 0, g).rotation.x = Math.PI;
  for (let i = 0; i < 6; i++) { const a = rnd(0, 6.3), d = rnd(0.2, 0.7) * R; ball(0.07, glow(0xffffff), Math.cos(a) * d, h - 0.1 + Math.sqrt(Math.max(0, R * R - d * d)) * 0.6, Math.sin(a) * d, g, 0); }
  return g;
}
export function makeRockPile() {
  const g = new THREE.Group(), m = lam(pick([0x3a3048, 0x4a3a52]), { roughness: 0.95 }), moss = lam(0x2a6a2a, { roughness: 1 });
  for (let i = 0; i < 4; i++) {
    const s = rnd(0.6, 2), x = rnd(-1.5, 1.5), z = rnd(-1.5, 1.5), sy = rnd(0.5, 0.9);
    blob(s, m, x, 0.3, z, g, 0.18, rnd(0, 9)).scale.y = sy;
    blob(s * 0.75, moss, x, 0.3 + s * sy * 0.45, z, g, 0.2, rnd(0, 9)).scale.set(1, 0.3, 1);
  }
  return g;
}
export function makeFlower() {
  const g = new THREE.Group(), c = pick([0xff3dd0, 0x3dd0ff, 0xffe03d]);
  const stem = lam(0x2a8a3a, { side: THREE.DoubleSide }), bend = rnd(-0.3, 0.3);
  tube([[0, 0, 0], [bend, 0.8, 0], [0, 1.6, 0]], 0.05, stem, g);
  for (const s of [-1, 1]) mesh(leafGeo(0.25, 0.7, 0.4), stem, bend * 0.6, 0.5, 0, g).rotation.set(0.9, s * 1.6, 0, 'YXZ');
  const pm = lam(c, { emissive: c, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) mesh(leafGeo(0.32, 0.5, -0.4), pm, 0, 1.6, 0, g).rotation.set(1.1, (i / 6) * Math.PI * 2, 0, 'YXZ');
  ball(0.12, glow(0xffffff), 0, 1.65, 0, g, 0);
  return g;
}
// glowing swamp pool that swamp monsters rise out of
export function makePool(r = 3) {
  const g = new THREE.Group();
  const w = mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ color: 0x1a4a2a, emissive: 0x2aff6a, emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.3 }), 0, 0.05, 0, g);
  w.rotation.x = -Math.PI / 2;
  const stone = lam(0x2a3a1a, { roughness: 0.95 });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; blob(rnd(0.3, 0.55), stone, Math.cos(a) * r, 0.05, Math.sin(a) * r, g, 0.2, i).scale.y = 0.5; }
  const pad = lam(0x3a8a3a, { side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) { const p = mesh(new THREE.CircleGeometry(rnd(0.3, 0.5), 20, 0.4, Math.PI * 1.8), pad, rnd(-0.6, 0.6) * r, 0.08, rnd(-0.6, 0.6) * r, g); p.rotation.set(-Math.PI / 2, 0, rnd(0, 6)); }
  const reed = lam(0x3a6a2a);
  for (let i = 0; i < 6; i++) { const x = Math.cos(i * 1.3) * r * 1.05, z = Math.sin(i * 1.3) * r * 1.05, hh = rnd(1.5, 3); tube([[x, 0, z], [x + rnd(-0.2, 0.2), hh * 0.6, z], [x + rnd(-0.4, 0.4), hh, z + rnd(-0.3, 0.3)]], 0.04, reed, g); cyl(0.08, 0.08, 0.35, lam(0x5a3a1a), x, hh * 0.85, z, g); }
  g.userData.water = w;
  return g;
}

// ===== The rail cart UNIT-07 rides on =====
export function makeCart() {
  const g = new THREE.Group(), P = {};
  const metal = paint(0x5a6478, { roughness: 0.45, clearcoat: 0.3 }), dark = paint(0x2a2f3a, { metalness: 0.5, roughness: 0.5 }), hz = lam(0x8a5a10, { roughness: 0.8 });
  const blk = lam(0x15171c, { roughness: 0.7 }), red = glow(0xff3020), pipe = paint(0x7a8498, { roughness: 0.3 });
  box(7.4, 0.4, 4.4, metal, 0, 0.75, 0, g);
  // deck plates
  for (let i = -3; i <= 3; i++) box(0.9, 0.04, 4.0, dark, i * 1.02, 0.97, 0, g);
  // hazard stripes on the front bumper
  box(7.6, 0.25, 0.3, blk, 0, 1.0, -2.2, g);
  for (let i = 0; i < 12; i++) box(0.22, 0.3, 0.03, hz, -3.4 + i * 0.62, 1.0, -2.36, g).rotation.z = 0.6;
  box(7.4, 0.25, 0.3, dark, 0, 0.75, 2.2, g);
  for (const s of [-1, 1]) {
    for (const z of [-2.1, 0, 2.1]) cyl(0.12, 0.14, 0.9, dark, s * 3.6, 1.35, z, g);
    const rail = tube([[s * 3.6, 1.65, -2.1], [s * 3.6, 1.65, 2.1]], 0.1, pipe, g); rail.userData.rail = true;
    for (const z of [-1.5, 1.5]) {
      const w = cyl(0.45, 0.45, 0.3, dark, s * 2.6, 0.45, z, g); w.rotation.z = Math.PI / 2;
      const hub = ring(0.32, 0.05, pipe, s * 2.77, 0.45, z, g); hub.rotation.y = Math.PI / 2;
      for (let k = 0; k < 4; k++) { const sp = box(0.04, 0.6, 0.06, pipe, s * 2.77, 0.45, z, g); sp.rotation.x = (k / 4) * Math.PI; }
    }
    cyl(0.12, 0.12, 0.08, dark, s * 3.6, 1.82, -2.1, g);
    P['light' + (s > 0 ? 'R' : 'L')] = ball(0.1, red, s * 3.6, 1.9, -2.1, g, 0);
  }
  tube([[-3.6, 1.65, -2.1], [3.6, 1.65, -2.1]], 0.08, pipe, g);
  g.userData.parts = P;
  return g;
}

// ===== ALIEN PLANT: a giant snapping flytrap that spits acid =====
export function makePlant() {
  const g = new THREE.Group(), P = {};
  const stem = skin(0x2a8a3a, { roughness: 0.5 }), sk = skin(0xc0208a, { roughness: 0.4 }), inside = lam(0xd8ff3d, { emissive: 0xa8ff20, emissiveIntensity: 0.8, side: THREE.DoubleSide }), tooth = lam(0xd8d0b4, { roughness: 0.4 });
  const leaf = lam(0x1f7a3a, { side: THREE.DoubleSide, roughness: 0.6 });
  for (let i = 0; i < 7; i++) mesh(leafGeo(1.1, rnd(2.6, 3.4), 0.35, 0.1), leaf, 0, 0.1, 0, g).rotation.set(1.15, (i / 7) * Math.PI * 2, 0, 'YXZ');
  const s1 = group(0, 0, 0, g); P.stem = s1;
  mesh(stalkGeo(0.42, 0.26, 2.3), stem, 0, 0, 0, s1);
  const s2 = group(0, 2.2, 0, s1); P.neck = s2;
  mesh(stalkGeo(0.28, 0.2, 1.75), stem, 0, 0, 0, s2);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; tube([[0, 0.3, 0], [Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6], [Math.cos(a) * 0.9, 0.4, Math.sin(a) * 0.9]], 0.05, stem, s2, 0.8); }
  const head = group(0, 1.7, 0, s2); P.head = head;
  const top = group(0, 0, 0, head), bot = group(0, 0, 0, head); P.top = top; P.bot = bot;
  const shell = new THREE.SphereGeometry(0.9, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  mesh(shell, sk, 0, 0, 0.5, top).scale.set(1, 0.7, 1.3);
  const lower = mesh(shell, sk, 0, 0, 0.5, bot); lower.scale.set(1, 0.7, 1.3); lower.rotation.x = Math.PI;
  mesh(new THREE.CircleGeometry(0.86, 32), inside, 0, 0.01, 0.5, top).rotation.x = Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.86, 32), inside, 0, -0.01, 0.5, bot).rotation.x = -Math.PI / 2;
  // lip rims and curved teeth
  for (const grp of [top, bot]) { const rm = ring(0.9, 0.06, sk, 0, 0, 0.5, grp); rm.rotation.x = Math.PI / 2; rm.scale.set(1, 1.3, 1); }
  for (let i = 0; i < 11; i++) {
    const a = (i / 10) * Math.PI - Math.PI / 2, x = Math.sin(a) * 0.85, z = 0.5 + Math.cos(a) * 1.08;
    horn(0.06, 0.38, 0.12, tooth, x, 0, z, top).rotation.set(Math.PI, 0, 0);
    horn(0.06, 0.38, -0.12, tooth, x, 0, z, bot);
  }
  for (let i = 0; i < 7; i++) ball(0.09, lam(0xff7ad8, { roughness: 0.4 }), Math.cos(i * 0.9) * 0.55, 0.5, 0.2 + Math.sin(i * 0.9) * 0.6, top, 0);
  P.glow = glowSprite(0xb0ff3d, 2, 0.5); P.glow.position.set(0, 0, 1.2); head.add(P.glow);
  P.mouth = new THREE.Object3D(); P.mouth.position.set(0, 0, 1.5); head.add(P.mouth);
  g.userData = { parts: P, hit: [{ y: 3.9, z: 0.5, r: 1.0 }, { y: 1.8, r: 0.6 }] };
  return g;
}

// ===== GIANT BUG: a huge mantis-beetle that leaps at the cart =====
export function makeBug() {
  const g = new THREE.Group(), P = {};
  const shell = paint(0x1a8a7a, { roughness: 0.2, metalness: 0.7, iridescence: 1, iridescenceIOR: 1.6 }), shell2 = paint(0x6a2ab0, { roughness: 0.25, metalness: 0.7, iridescence: 0.8 });
  const leg = paint(0x1a1a24, { metalness: 0.4 }), eye = glow(0xff3020), claw = lam(0xb8ae96, { roughness: 0.4 });
  const body = group(0, 1.3, 0, g); P.body = body;
  ball(0.9, shell, 0, 0, -0.6, body).scale.set(1, 0.65, 1.5);
  for (let k = 0; k < 4; k++) ring(0.82 - k * 0.12, 0.04, shell2, 0, 0, -0.4 - k * 0.42, body).scale.set(1, 0.65, 1);
  box(0.06, 0.08, 2.4, shell2, 0, 0.58, -0.6, body);
  ball(0.6, shell2, 0, 0.1, 0.6, body).scale.set(1, 0.8, 1);
  const head = group(0, 0.25, 1.2, body); P.head = head;
  ball(0.45, shell, 0, 0, 0, head).scale.set(1.1, 0.8, 1);
  for (const s of [-1, 1]) {
    ball(0.17, eye, s * 0.28, 0.12, 0.25, head);
    ball(0.06, glow(0xffd0a0), s * 0.3, 0.17, 0.39, head, 0);
    horn(0.07, 0.55, 0.45, claw, s * 0.2, -0.22, 0.42, head).rotation.set(1.5, 0, s * 0.5);
    tube([[s * 0.12, 0.3, 0.25], [s * 0.4, 0.9, 0.5], [s * 0.6, 1.2, 0.2]], 0.025, leg, head, 0.6);
  }
  P.legs = [];
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
    const L = group(s * 0.6, -0.1, 0.4 - i * 0.6, body); P.legs.push({ g: L, s, i });
    ball(0.11, shell2, 0, 0, 0, L, 0);
    const up = group(0, 0, 0, L); up.rotation.z = s * -1.1 + Math.PI;
    limb(0.08, 0.06, 1.1, leg, 0, 0, 0, up);
    const lo = group(s * 1.0, 0.45, 0, L); lo.rotation.z = s * 0.35;
    ball(0.07, shell2, 0, 0, 0, lo, 0);
    limb(0.06, 0.02, 1.35, leg, 0, 0, 0, lo);
  }
  P.scythes = [];
  for (const s of [-1, 1]) {
    const S = group(s * 0.45, 0.2, 1.0, body); P.scythes.push(S);
    alongPitch(limb(0.09, 0.07, 0.9, shell2, 0, 0, 0, S), Math.PI - 0.6);
    const blade = horn(0.13, 1.4, 0.55, claw, 0, 0.75, 0.55, S); blade.rotation.x = 0.4;
    S.rotation.x = 0.3;
  }
  P.wings = [];
  const wm = new THREE.MeshBasicMaterial({ map: getWingTex(), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) {
    const w = mesh(new THREE.PlaneGeometry(2.2, 0.9).rotateZ(Math.PI / 2), wm, s * 0.4, 0.55, -0.6, body);
    w.rotation.set(-Math.PI / 2, 0, s * 0.15); P.wings.push(w);
  }
  g.userData = { parts: P, hit: [{ y: 1.3, z: -0.4, r: 1.1 }, { y: 1.55, z: 1.2, r: 0.55 }] };
  return g;
}
function alongPitch(m, a) { m.rotation.x = a; return m; }

// ===== JUNGLE SOLDIER: a Zippit in camouflage with a blaster =====
export function makeSoldier(makeZippit) {
  const g = makeZippit(), P = g.userData.parts;
  const recolor = { 0x2ef03c: 0x6a9a2a, 0x17b02a: 0x4a6a1a, 0x8a2be2: 0x3a4a22, 0x4b1080: 0x2a3218 };
  g.traverse(o => {
    if (!o.material || !o.material.color) return;
    const to = recolor[o.material.color.getHex()];
    if (to !== undefined) { o.material = o.material.clone(); o.material.color.setHex(to); o.material.metalness = Math.min(o.material.metalness, 0.1); o.material.roughness = Math.max(o.material.roughness, 0.6); o.material.clearcoat = 0.1; if (o.material.sheenColor) o.material.sheenColor.setHex(0x9ab86a); }
  });
  const camo = lam(0x2a5a1a), helmM = paint(0x3a4a22, { metalness: 0.2, roughness: 0.6, clearcoat: 0.2 });
  const helm = group(0, 0.22, 0, P.head);
  dome(0.43, helmM, 0, 0, 0, helm).scale.set(1.1, 0.9, 1.05);
  ring(0.45, 0.04, helmM, 0, 0, 0, helm).rotation.x = Math.PI / 2;
  box(0.6, 0.1, 0.12, glow(0xffa020), 0, -0.02, 0.37, helm);
  for (let i = 0; i < 6; i++) mesh(leafGeo(0.14, 0.45, 0.3), camo, Math.cos(i * 1.3) * 0.28, 0.28, Math.sin(i * 1.3) * 0.28, helm).rotation.set(0.5, i * 1.3, 0, 'YXZ');
  const gun = group(0.15, 0.0, 0.45, P.body); P.gun = gun;
  const gm = paint(0x2a2f3a, { metalness: 0.6 });
  box(0.16, 0.2, 0.7, gm, 0, 0, 0.15, gun);
  box(0.12, 0.16, 0.3, gm, 0, -0.02, -0.25, gun);
  cyl(0.05, 0.05, 0.4, gm, 0, 0.02, 0.6, gun).rotation.x = Math.PI / 2;
  box(0.06, 0.06, 0.4, glow(0xffa020), 0, 0.12, 0.2, gun);
  box(0.08, 0.2, 0.1, gm, 0, -0.18, 0.15, gun);
  const m = new THREE.Object3D(); m.position.set(0, 0, 0.8); gun.add(m); P.muzzle = m;
  for (const a of P.arms) a.rotation.x = -1.3;
  g.userData.hit = [{ y: 0.95, r: 0.55 }, { y: 1.6, z: 0.05, r: 0.45 }];
  return g;
}

// ===== SWAMP MONSTER: rises out of the water and throws mud =====
export function makeSwamp() {
  const g = new THREE.Group(), P = {};
  const mud = skin(0x3a5a22, { roughness: 0.7, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0 }), mud2 = skin(0x2a3a14, { roughness: 0.75, clearcoat: 0.5, sheen: 0 }), algae = lam(0x5aa03a);
  const body = group(0, 0, 0, g); P.body = body;
  blob(1.4, mud, 0, 1.6, 0, body, 0.12, 4).scale.set(1, 1.2, 0.9);
  blob(0.9, mud2, 0, 3.1, 0.3, body, 0.12, 8).scale.set(1.2, 0.9, 1);
  P.eye = ball(0.32, glow(0xffe020), 0, 3.3, 0.95, body);
  ball(0.1, glow(0x201000), 0, 3.3, 1.24, body, 0).scale.set(0.5, 1.4, 0.6);
  ring(0.33, 0.07, mud2, 0, 3.3, 0.98, body);
  for (const [x, y] of [[-0.55, 3.55], [0.55, 3.5], [-0.35, 3.75]]) { ball(0.11, glow(0xffe020), x, y, 0.85, body, 0); ball(0.04, glow(0x201000), x, y, 0.95, body, 0); }
  const mouth = mesh(new THREE.SphereGeometry(0.55, 24, 12), glow(0x1a2a08), 0, 2.6, 0.95, body); mouth.scale.set(1.3, 0.5, 0.4);
  for (let i = 0; i < 7; i++) horn(0.06, 0.28, rnd(-0.1, 0.1), lam(0xc8c09a), -0.54 + i * 0.18, 2.84, 1.06, body).rotation.x = Math.PI;
  for (let i = 0; i < 5; i++) horn(0.05, 0.2, 0, lam(0xc8c09a), -0.4 + i * 0.2, 2.38, 1.06, body);
  // dripping mud and hanging moss
  for (let i = 0; i < 14; i++) { const a = rnd(-1.4, 1.4), y = rnd(0.8, 2.6); horn(0.12, rnd(0.4, 1), rnd(-0.2, 0.2), mud, Math.sin(a) * 1.25, y, Math.cos(a) * 1.0, body).rotation.x = Math.PI; }
  for (let i = 0; i < 9; i++) { const x = rnd(-1, 1), z = rnd(0.3, 0.9), y = rnd(2.6, 3.4), l = rnd(0.8, 1.6); tube([[x, y, z], [x + rnd(-0.15, 0.15), y - l * 0.5, z + 0.15], [x, y - l, z + 0.1]], 0.035, algae, body, 0.7); }
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 1.3, 2.4, 0.2, body); P.arms.push(a);
    limb(0.32, 0.22, 1.7, mud, 0, 0, 0, a);
    blob(0.42, mud2, 0, -1.9, 0.1, a, 0.15, s + 3);
    for (const k of [-1, 0, 1]) horn(0.06, 0.3, 0.3, mud2, k * 0.18, -2.2, 0.25, a).rotation.x = Math.PI;
    a.rotation.z = s * 0.4;
  }
  P.hand = new THREE.Object3D(); P.hand.position.set(0, -1.9, 0); P.arms[1].add(P.hand);
  g.userData = { parts: P, hit: [{ y: 1.8, r: 1.4 }, { y: 3.2, z: 0.3, r: 0.9 }] };
  return g;
}

// ===== HUMAN MUTANT: a colonist the aliens changed. Very scary. =====
export function makeMutant() {
  const g = new THREE.Group(), P = {};
  const sk = skin(0x5e6656, { roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.3 }), skD = skin(0x3a4034, { roughness: 0.6, sheen: 0.2 });
  const rag = lam(pick([0x2a5ab0, 0xc8d0e0, 0x3a4a6a]), { roughness: 0.9, side: THREE.DoubleSide });
  const vein = glow(0xff2ad0), growth = skin(0x8a1a8a, { emissive: 0xff2ad0, emissiveIntensity: 0.5, roughness: 0.3, sheen: 0 });
  const tooth = lam(0xd8d0b8, { roughness: 0.4 }), claw = lam(0x2a2a20), bone = lam(0xc8c0a8, { roughness: 0.5 });
  P.legs = [];
  for (const s of [-1, 1]) {
    const L = group(s * 0.25, 1.35, 0, g); P.legs.push(L);
    limb(0.13, 0.09, 0.72, sk, 0, 0, 0.05, L);
    ball(0.09, skD, 0, -0.8, 0.1, L, 0);
    const shin = group(0, -0.8, 0.1, L);
    const sh = limb(0.095, 0.06, 0.62, sk, 0, 0, 0, shin); sh.rotation.x = -0.25;
    box(0.16, 0.08, 0.35, skD, 0, -0.72, 0, shin);
    for (const k of [-1, 0, 1]) horn(0.025, 0.14, 0.4, claw, k * 0.05, -0.74, 0.17, shin).rotation.x = Math.PI / 2;
  }
  const body = group(0, 1.4, 0, g); P.body = body;
  blob(0.36, sk, 0, 0.55, 0, body, 0.06, 2).scale.set(1, 1.3, 0.7);
  // torn shirt
  const sg = new THREE.CylinderGeometry(0.42, 0.37, 0.75, 20, 6, true), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i), a = Math.atan2(sp.getZ(i), sp.getX(i)); if (y < -0.2) sp.setY(i, y + Math.abs(Math.sin(a * 7)) * 0.25); sp.setX(i, sp.getX(i) * (1 + 0.05 * Math.sin(a * 5 + y * 9))); }
  sg.computeVertexNormals();
  mesh(sg, rag, 0, 0.45, 0, body);
  // ribs showing through a hole in the shirt
  for (let i = 0; i < 4; i++) { const r = mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI * 0.8), bone, 0.08, 0.45 + i * 0.11, 0.25, body); r.rotation.set(0, 0, Math.PI * 1.1); r.scale.set(1, 0.6, 1); }
  for (let i = 0; i < 6; i++) tube([[rnd(-0.25, 0.25), rnd(0.35, 0.5), 0.27], [rnd(-0.25, 0.25), rnd(0.55, 0.7), 0.29], [rnd(-0.25, 0.25), rnd(0.75, 0.9), 0.27]], 0.012, vein, body);
  for (let i = 0; i < 7; i++) horn(0.05, rnd(0.25, 0.55), -0.2, bone, 0, 0.3 + i * 0.12, -0.27, body).rotation.x = -1.2;
  const head = group(0, 1.15, 0.12, body); P.head = head;
  limb(0.07, 0.08, 0.15, sk, 0, -0.02, -0.05, head);
  blob(0.24, sk, 0, 0.1, 0, head, 0.07, 6).scale.set(0.85, 1.25, 1);
  // sunken black eye sockets with tiny red pupils
  for (const s of [-1, 1]) { ball(0.075, glow(0x000000), s * 0.09, 0.15, 0.17, head, 0).scale.set(1, 1.3, 0.6); ball(0.025, glow(0xff1010), s * 0.09, 0.15, 0.215, head, 0); }
  for (const s of [-1, 1]) tube([[s * 0.13, 0.25, 0.15], [s * 0.16, 0.1, 0.17], [s * 0.12, -0.05, 0.17]], 0.01, vein, head);
  P.eyeGlow = glowSprite(0xff1010, 0.8, 0.9); P.eyeGlow.position.set(0, 0.15, 0.28); head.add(P.eyeGlow);
  const jaw = group(0, -0.05, 0.1, head); P.jaw = jaw;
  mesh(new THREE.SphereGeometry(0.16, 20, 12), glow(0x080202), 0, -0.1, 0.08, jaw).scale.set(1, 2.0, 0.6);
  for (let i = 0; i < 7; i++) horn(0.022, rnd(0.1, 0.2), 0.1, tooth, -0.11 + i * 0.037, 0.08, 0.16, jaw).rotation.x = Math.PI + rnd(-0.3, 0.3);
  for (let i = 0; i < 6; i++) horn(0.02, rnd(0.08, 0.16), -0.1, tooth, -0.09 + i * 0.036, -0.32, 0.14, jaw);
  head.rotation.z = 0.35;
  // one normal arm, one swollen arm covered in alien growths
  P.arms = [];
  const aN = group(-0.38, 0.85, 0, body); P.arms.push(aN);
  limb(0.075, 0.05, 0.55, sk, 0, 0, 0, aN);
  ball(0.055, skD, 0, -0.6, 0, aN, 0);
  limb(0.06, 0.045, 0.55, sk, 0, -0.62, 0.02, aN);
  for (const k of [-0.05, 0, 0.05]) horn(0.025, 0.42, 0.35, claw, k, -1.22, 0.05, aN).rotation.x = Math.PI;
  const aB = group(0.45, 0.85, 0, body); P.arms.push(aB);
  blob(0.3, skD, 0, -0.25, 0, aB, 0.12, 3).scale.set(1, 1.6, 1);
  blob(0.35, sk, 0, -0.85, 0.05, aB, 0.12, 4).scale.set(1, 1.3, 1);
  for (let i = 0; i < 7; i++) blob(rnd(0.08, 0.16), growth, rnd(-0.25, 0.25), rnd(-1.1, -0.1), rnd(0.15, 0.3), aB, 0.15, i);
  for (const k of [-0.12, 0, 0.12]) horn(0.05, 0.55, 0.4, claw, k, -1.28, 0.1, aB).rotation.x = Math.PI + 0.3;
  aN.rotation.x = -0.3; aB.rotation.x = -0.2;
  g.userData = { parts: P, hit: [{ y: 1.95, r: 0.5 }, { y: 2.65, z: 0.12, r: 0.3 }, { y: 0.9, r: 0.4 }] };
  return g;
}

// ===== PATIENT ZERO: the first colonist the aliens mutated. Giant. =====
export function makePatientZero() {
  const g = makeMutant(), P = g.userData.parts;
  const growth = skin(0x8a1a8a, { emissive: 0xff2ad0, emissiveIntensity: 0.6, roughness: 0.3, sheen: 0 }), crystal = paint(0x6a2aff, { emissive: 0x6a2aff, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.1, clearcoat: 1 });
  // alien crystals along the spine
  for (let i = 0; i < 7; i++) { const c = cone(0.08, rnd(0.4, 0.8), crystal, rnd(-0.1, 0.1), 0.2 + i * 0.16, -0.32, P.body, 3); c.rotation.x = -1.0; }
  // the parasite in its chest: the weak spot
  const pod = group(0, 0.55, 0.3, P.body); P.pod = pod;
  P.core = ball(0.22, glow(0xff4af0), 0, 0, 0, pod);
  P.coreGlow = glowSprite(0xff4af0, 1.6, 0.2); pod.add(P.coreGlow);
  P.ribs = [];
  for (let i = 0; i < 6; i++) {
    const rb = group(0, 0, 0, pod); rb.rotation.z = (i / 6) * Math.PI * 2; P.ribs.push(rb);
    horn(0.05, 0.38, 0.25, growth, 0, 0.18, 0.02, rb).rotation.x = 0.5;
  }
  // a third arm: an alien tentacle
  const t = group(0.1, 0.95, -0.1, P.body); P.tentacle = t;
  tube([[0, 0, 0], [0, 0.4, -0.2], [0.1, 0.8, -0.25], [0, 1.15, -0.4], [-0.1, 1.35, -0.6]], 0.12, growth, t, 0.85);
  for (let i = 0; i < 5; i++) ball(0.035, glow(0xffb0f8), 0.08, 0.2 + i * 0.25, -0.12 - i * 0.08, t, 0);
  // a cracked colonist helmet
  const helm = mesh(new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 1.4, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xdfe8ff, roughness: 0.15, metalness: 0.3, clearcoat: 1, side: THREE.DoubleSide }), 0, 0.12, 0, P.head);
  helm.rotation.y = 0.8;
  P.hand = new THREE.Object3D(); P.hand.position.set(0, -1.3, 0); P.arms[1].add(P.hand);
  g.userData.hit = [{ y: 1.95, z: 0.3, r: 0.3, tag: 'core' }, { y: 1.95, r: 0.55, tag: 'body' }, { y: 2.65, z: 0.12, r: 0.32, tag: 'body' }, { y: 0.9, r: 0.45, tag: 'body' }];
  return g;
}

// thrown by Patient Zero
export function makeLog() {
  const g = new THREE.Group(), bark = lam(0x4a2f3a, { roughness: 0.9 });
  tube([[-2.5, 0, 0], [-0.8, 0.1, 0.1], [0.8, -0.05, -0.1], [2.5, 0, 0]], 0.6, bark, g, 0.2);
  for (const x of [-2.5, 2.5]) cyl(0.55, 0.55, 0.05, lam(0xb08a5a), x, 0, 0, g).rotation.z = Math.PI / 2;
  blob(1.2, lam(0x1d6b3a), 2.6, 0.3, 0, g, 0.15, 2).scale.set(0.8, 0.7, 1);
  tube([[-1, 0.5, 0], [-1.3, 1.2, 0.2], [-1.0, 1.6, 0.4]], 0.15, bark, g, 0.7);
  return g;
}
export { addGlow };

// ===== COMMANDER NOVA, in person (arrives at the end of chapter 1) =====
export function makeNova() {
  const g = new THREE.Group(), P = {};
  const blue = paint(0x1f5fd6, { metalness: 0.1, roughness: 0.5, clearcoat: 0.3 }), white = paint(0xaab4c4, { metalness: 0.1, roughness: 0.5, clearcoat: 0.3 });
  const sk = skin(0xc98d64, { roughness: 0.6, clearcoat: 0, sheen: 0.4 }), hair = skin(0x2a1a12, { roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0x6a4a3a) });
  const boot = paint(0x1a1e2a, { metalness: 0.2 }), gold = paint(0xffc84a, { metalness: 1, roughness: 0.25 });
  P.legs = [];
  for (const s of [-1, 1]) {
    const L = group(s * 0.16, 0.95, 0, g); P.legs.push(L);
    limb(0.105, 0.085, 0.82, blue, 0, 0, 0, L);
    limb(0.095, 0.085, 0.25, boot, 0, -0.6, 0, L);
    box(0.16, 0.1, 0.3, boot, 0, -0.9, 0.05, L);
  }
  const body = group(0, 0.95, 0, g); P.body = body;
  limb(0.25, 0.19, 0.55, blue, 0, 0.62, 0, body).scale.z = 0.62;
  box(0.4, 0.1, 0.25, boot, 0, 0.05, 0, body);
  box(0.08, 0.07, 0.03, gold, 0, 0.05, 0.13, body);
  box(0.1, 0.55, 0.03, white, 0, 0.42, 0.155, body);
  for (const s of [-1, 1]) dome(0.1, white, s * 0.22, 0.68, 0, body).scale.set(1.2, 0.6, 1.3);
  ball(0.035, gold, 0.13, 0.6, 0.15, body, 0);
  box(0.12, 0.02, 0.02, gold, -0.12, 0.6, 0.155, body);
  cyl(0.055, 0.065, 0.12, sk, 0, 0.79, 0, body);
  ring(0.07, 0.025, blue, 0, 0.75, 0, body).rotation.x = Math.PI / 2;
  const head = group(0, 1.0, 0, body); P.head = head;
  ball(0.15, sk, 0, 0, 0, head).scale.set(0.88, 1.1, 0.95);
  ball(0.03, sk, 0, -0.01, 0.145, head, 0);
  for (const s of [-1, 1]) {
    ball(0.022, glow(0xffffff), s * 0.05, 0.025, 0.125, head, 0);
    ball(0.013, glow(0x2a1a10), s * 0.05, 0.025, 0.142, head, 0);
    box(0.045, 0.008, 0.01, hair, s * 0.05, 0.06, 0.135, head);
    ball(0.025, sk, s * 0.13, 0.0, 0, head, 0);
  }
  box(0.05, 0.008, 0.01, lam(0x8a4a3a), 0, -0.07, 0.135, head);
  dome(0.16, hair, 0, 0.02, -0.01, head, Math.PI * 0.55).scale.set(0.95, 1.05, 1);
  tube([[0, 0.08, -0.13], [0, -0.05, -0.2], [0.02, -0.22, -0.18]], 0.035, hair, head, 0.6);
  box(0.02, 0.12, 0.02, glow(0x33e0ff), 0.15, -0.02, 0.05, head);
  P.arms = [];
  for (const s of [-1, 1]) {
    const a = group(s * 0.29, 0.68, 0, body); P.arms.push(a);
    limb(0.065, 0.05, 0.56, blue, 0, 0, 0, a);
    ball(0.05, sk, 0, -0.64, 0, a).scale.set(0.8, 1.2, 0.6);
    if (s < 0) {
      box(0.1, 0.06, 0.14, white, 0, -0.5, 0.03, a);
      const holo = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x33e0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }), 0, -0.48, 0.2, a);
      holo.rotation.x = -0.6; P.holo = holo;
    }
  }
  g.userData.parts = P;
  return g;
}
