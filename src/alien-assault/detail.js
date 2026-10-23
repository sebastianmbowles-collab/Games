// Little parts that make places look busy and real: pipes, vents, bolts, cables, debris, crystals, wrecks.
// Most of it is glued together with bake() so it costs only a couple of draw calls.
import { THREE } from './engine.js';
import { rnd, pick } from './state.js';
import { box, cyl, ball, ring, tube, horn, blob, mesh, group, glow, phong, lam, bake } from './models.js';

const dark = phong(0x23293a, { roughness: 0.45 }), steel = phong(0x5a6478, { roughness: 0.35 }), lite = phong(0x8a96aa, { roughness: 0.3 });
const rust = lam(0x6a4a3a, { roughness: 0.8 }), hz = lam(0xffa200), black = lam(0x101218, { roughness: 0.9 });
export const METAL = { metalness: 0.6, roughness: 0.4 };

// a round valve wheel facing +z
function valve(x, y, z, p) {
  ring(0.28, 0.04, lite, x, y, z, p);
  for (let k = 0; k < 4; k++) box(0.04, 0.5, 0.04, lite, x, y, z, p).rotation.z = (k / 4) * Math.PI;
  cyl(0.06, 0.06, 0.2, dark, x, y, z - 0.08, p).rotation.x = Math.PI / 2;
}
// a sagging cable between two points
export function cable(a, b, sag, r, mat, p) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2];
  return tube([a, [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2 - sag * 0.4, (a[2] + m[2]) / 2], m, [(b[0] + m[0]) / 2, (b[1] + m[1]) / 2 - sag * 0.4, (b[2] + m[2]) / 2], b], r, mat, p);
}

// One wall panel of the UFO: wall at z=0 facing +z, w wide, h tall.
// Returns the baked detail and the spots where broken wires spark.
export function wallDetail(i, w, h, isDoor, doorH) {
  const g = new THREE.Group(), sparks = [];
  const lo = isDoor ? doorH + 0.4 : 0;
  // trim ledges and bolts down both edges
  for (const y of isDoor ? [doorH + 0.3] : [0.15, 1.0, 6.7]) box(w, 0.18, 0.22, y < 0.5 ? black : dark, 0, y, 0.11, g);
  for (let y = lo + 0.4; y < h - 0.2; y += 0.7) for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) ball(0.05, lite, x, y, 0.06, g, 0);
  // cage around the ceiling lamp
  for (const y of [7.38, 7.82]) box(1.7, 0.05, 0.05, dark, 0, y, 0.3, g);
  for (const x of [-0.8, 0, 0.8]) box(0.05, 0.5, 0.05, dark, x, 7.6, 0.3, g);
  if (isDoor) {
    for (const y of [doorH + 0.7, doorH + 1.0]) tube([[-w / 2, y, 0.25], [w / 2, y, 0.25]], 0.08, steel, g);
    return { g: bake(g, METAL), sparks };
  }
  const kind = i % 4;
  if (kind === 0) {
    // twin pipes with brackets and a valve
    for (const x of [-1.05, -0.78]) tube([[x, 0, 0.22], [x, h, 0.22]], 0.1, x < -1 ? steel : rust, g);
    for (let y = 1.5; y < h; y += 2) box(0.55, 0.12, 0.3, dark, -0.92, y, 0.15, g);
    valve(-0.78, 3.0, 0.42, g);
    box(0.7, 0.9, 0.18, dark, 0.9, 4.6, 0.09, g);
    for (let k = 0; k < 3; k++) box(0.12, 0.08, 0.04, glow(pick([0x39ff6a, 0xff3030, 0xffc030])), 0.7 + k * 0.2, 4.9, 0.2, g);
  } else if (kind === 1) {
    // big vent grille glowing behind its slats
    box(1.9, 1.5, 0.12, dark, 0, 4.6, 0.06, g);
    mesh(new THREE.PlaneGeometry(1.6, 1.2), glow(i % 3 ? 0x0a3a4a : 0x4a0a14), 0, 4.6, 0.13, g);
    for (let k = 0; k < 8; k++) box(1.7, 0.06, 0.12, steel, 0, 4.1 + k * 0.145, 0.2, g).rotation.x = -0.5;
    for (const s of [-1, 1]) box(0.08, 1.5, 0.2, lite, s * 0.95, 4.6, 0.16, g);
  } else if (kind === 2) {
    // locker doors with handles and status lights
    for (const x of [-0.6, 0.6]) {
      box(1.05, 2.6, 0.12, steel, x, 2.7, 0.06, g);
      box(0.9, 0.06, 0.13, dark, x, 3.6, 0.08, g); box(0.9, 0.06, 0.13, dark, x, 3.5, 0.08, g);
      box(0.06, 0.4, 0.1, lite, x + 0.38, 2.5, 0.16, g);
      box(0.1, 0.06, 0.04, glow(pick([0x39ff6a, 0x39ff6a, 0xff3030])), x - 0.3, 3.8, 0.14, g);
    }
  } else {
    // bundle of cables running down to a junction box
    for (let k = 0; k < 3; k++) { const x = -1.2 + k * 0.18; tube([[x, h, 0.15], [x + 0.3, 5.5, 0.2 + k * 0.03], [0.6 + k * 0.12, 3.4, 0.25], [0.6 + k * 0.12, 2.2, 0.25]], 0.05, pick([black, dark, rust]), g); }
    box(1.0, 0.8, 0.35, dark, 0.75, 1.9, 0.18, g);
    box(0.5, 0.18, 0.02, hz, 0.75, 2.05, 0.36, g);
    box(0.08, 0.08, 0.04, glow(0x33bbff), 1.1, 1.7, 0.36, g);
  }
  // some panels are smashed: a bent plate and a torn wire that sparks
  if (i % 5 === 2) {
    const pl = box(1.2, 0.9, 0.06, steel, 0.4, 5.6, 0.35, g); pl.rotation.set(0.6, 0.3, 0.4);
    blob(0.5, black, 0.2, 5.4, -0.15, g, 0.3, i).scale.set(1.4, 1, 0.3);
    tube([[0.1, 6.2, 0.2], [0.3, 5.4, 0.5], [0.1, 4.8, 0.7]], 0.03, black, g);
    sparks.push(new THREE.Vector3(0.1, 4.8, 0.7));
  }
  return { g: bake(g, METAL), sparks };
}

// floor of the UFO: seams, grates, debris, cables, goo puddles and scorch marks
export function floorDetail(R, keepClear) {
  const g = new THREE.Group();
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + 0.13, s = box(0.06, 0.03, R - 2.5, black, Math.cos(a) * (R / 2 + 1), 0.015, Math.sin(a) * (R / 2 + 1), g); s.rotation.y = -a + Math.PI / 2; }
  for (const r of [6.6, 12]) ring(r, 0.04, black, 0, 0.01, 0, g).rotation.x = Math.PI / 2;
  // floor grates near the walls
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.4, x = Math.cos(a) * 12.8, z = Math.sin(a) * 12.8;
    if (keepClear(x, z)) continue;
    const gr = group(x, 0.02, z, g); gr.rotation.y = -a;
    box(1.6, 0.04, 1.6, dark, 0, 0, 0, gr);
    for (let j = 0; j < 7; j++) box(0.06, 0.06, 1.5, steel, -0.6 + j * 0.2, 0.02, 0, gr);
  }
  // rubble piled against the walls
  for (let k = 0; k < 40; k++) {
    const a = rnd(0, Math.PI * 2), r = rnd(R - 2.2, R - 0.4), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (keepClear(x, z)) continue;
    const s = rnd(0.15, 0.55);
    if (k % 3) box(s * 2, s * 0.4, s * 1.4, pick([steel, dark, lite, rust]), x, s * 0.2, z, g).rotation.set(rnd(-0.6, 0.6), rnd(0, 6), rnd(-0.6, 0.6));
    else blob(s, pick([dark, black]), x, s * 0.3, z, g, 0.3, k).scale.y = 0.6;
  }
  // cables snaking across the floor
  for (let k = 0; k < 6; k++) {
    const a = rnd(0, Math.PI * 2), b = a + rnd(-0.8, 0.8), r1 = R - 0.3, r2 = rnd(5, 9);
    const p1 = [Math.cos(a) * r1, 0.05, Math.sin(a) * r1], p2 = [Math.cos(b) * r2, 0.05, Math.sin(b) * r2];
    if (keepClear(p2[0], p2[2])) continue;
    tube([p1, [(p1[0] + p2[0]) / 2 + rnd(-1, 1), 0.06, (p1[2] + p2[2]) / 2 + rnd(-1, 1)], p2], 0.07, pick([black, dark]), g);
  }
  // scorch marks and glowing alien goo
  for (let k = 0; k < 10; k++) {
    const x = rnd(-11, 11), z = rnd(-11, 11);
    if (Math.hypot(x, z) > R - 2 || keepClear(x, z)) continue;
    const c = mesh(new THREE.CircleGeometry(rnd(0.6, 1.4), 12), k % 3 ? black : glow(0x1a7a2a), x, 0.012 + k * 0.0005, z, g);
    c.rotation.x = -Math.PI / 2; c.scale.set(1, rnd(0.6, 1), 1);
  }
  return bake(g, METAL);
}

// ribs and hanging lamps under the dome roof
export function roofDetail(R, H, domeH) {
  const g = new THREE.Group();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2, pts = [];
    for (let j = 0; j <= 6; j++) { const t = (j / 6) * (Math.PI / 2) * 0.86; pts.push([Math.cos(a) * Math.cos(t) * (R - 0.2), H + Math.sin(t) * domeH * 0.97, Math.sin(a) * Math.cos(t) * (R - 0.2)]); }
    tube(pts, 0.18, dark, g);
  }
  ring(R - 0.3, 0.25, dark, 0, H + 0.1, 0, g).rotation.x = Math.PI / 2;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + 0.5, x = Math.cos(a) * 7, z = Math.sin(a) * 7, y = H + 2.4 - k * 0.2;
    tube([[x, H + 4, z], [x, y, z]], 0.03, black, g);
    cyl(0.12, 0.45, 0.35, dark, x, y - 0.15, z, g);
    mesh(new THREE.CircleGeometry(0.38, 16), glow(k === 3 ? 0x301010 : 0xbff4ff), x, y - 0.33, z, g).rotation.x = Math.PI / 2;
  }
  return bake(g, METAL);
}

// hydraulic pistons and spinning beacons around the door
export function doorDetail(dx, doorH, dz) {
  const g = new THREE.Group(), beacons = [];
  for (const s of [-1, 1]) {
    const x = s * (dx + 0.6);
    cyl(0.16, 0.16, doorH * 0.6, steel, x, doorH * 0.3, dz + 0.3, g);
    cyl(0.1, 0.1, doorH * 0.45, lite, x, doorH * 0.75, dz + 0.3, g);
    for (let y = 0.6; y < doorH; y += 1.2) box(0.6, 0.12, 0.3, dark, s * dx, y, dz + 0.62, g);
  }
  const out = bake(g, METAL);
  for (const s of [-1, 1]) {
    const b = group(s * (dx - 0.2), doorH + 0.6, dz + 0.65, out);
    cyl(0.2, 0.24, 0.12, dark, 0, -0.12, 0, b);
    const dome = ball(0.18, glow(0xff7a00), 0, 0.02, 0, b); dome.scale.y = 0.8;
    beacons.push(b);
  }
  return { g: out, beacons };
}

// a glowing alien crystal cluster
export function crystals(color, n = 6, size = 1) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, flatShading: true });
  for (let k = 0; k < n; k++) {
    const h = rnd(0.6, 1.6) * size * (k ? 1 : 1.5), c = mesh(new THREE.ConeGeometry(h * 0.18, h, 5), m, rnd(-0.3, 0.3) * size, h * 0.4, rnd(-0.3, 0.3) * size, g);
    c.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.5, 0.5));
  }
  blob(0.4 * size, lam(0x2a1a3a, { roughness: 1 }), 0, 0, 0, g, 0.3, n).scale.y = 0.4;
  return g;
}
// a crashed spaceship chunk
export function wreck(size = 1) {
  const g = new THREE.Group(), hull = phong(pick([0x4a5068, 0x5a4a6a, 0x3a4058]), { roughness: 0.5 });
  const shell = mesh(new THREE.CylinderGeometry(2 * size, 2.2 * size, 5 * size, 20, 1, true, 0, Math.PI * 1.2), hull, 0, 0.6 * size, 0, g);
  shell.material = hull.clone(); shell.material.side = THREE.DoubleSide;
  shell.rotation.set(Math.PI / 2, 0, rnd(-0.4, 0.4));
  for (let k = -2; k <= 2; k++) { const r = mesh(new THREE.TorusGeometry(2.05 * size, 0.12 * size, 8, 24, Math.PI * 1.2), dark, 0, 0.6 * size, k * size, g); r.rotation.z = shell.rotation.z - Math.PI / 2 + Math.PI * 0.1; }
  for (let k = 0; k < 6; k++) box(rnd(0.5, 1.5) * size, 0.1 * size, rnd(0.5, 1.2) * size, hull, rnd(-3, 3) * size, 0.05, rnd(-3, 3) * size, g).rotation.set(rnd(-0.3, 0.3), rnd(0, 6), rnd(-0.3, 0.3));
  horn(0.3 * size, 3 * size, 0.6, dark, 1.5 * size, 0, 1.5 * size, g).rotation.set(0.4, 0, -0.9);
  blob(1.2 * size, black, 0, -0.3 * size, 0, g, 0.3, 3).scale.set(2, 0.3, 2.5);
  return g;
}
// a tall twisted rock spire
export function spire(h, color) {
  const g = new THREE.Group(), m = lam(color, { roughness: 0.95 });
  horn(h * 0.12, h, rnd(-0.2, 0.2), m, 0, 0, 0, g).rotation.y = rnd(0, 6);
  for (let k = 0; k < 3; k++) blob(h * rnd(0.06, 0.12), m, rnd(-1, 1) * h * 0.1, h * 0.05, rnd(-1, 1) * h * 0.1, g, 0.3, k).scale.y = 0.6;
  return g;
}

// wrecked ships, crystals, rock spires and boulders scattered over a battlefield
export function battlefield(area, avoid, count = 1) {
  const g = new THREE.Group(), [x0, x1, z0, z1] = area;
  const spot = () => { for (let k = 0; k < 30; k++) { const x = rnd(x0, x1), z = rnd(z0, z1); if (!avoid(x, z)) return [x, z]; } return [x0, z0]; };
  const put = (m, s = 1) => { const [x, z] = spot(); m.position.set(x, 0, z); m.rotation.y = rnd(0, 6.3); m.scale.setScalar(s); g.add(m); };
  for (let i = 0; i < 6 * count; i++) put(wreck(rnd(1, 2.2)));
  for (let i = 0; i < 14 * count; i++) put(crystals(pick([0x39ff6a, 0xd23cff, 0x33e0ff]), 5, rnd(1, 2.5)));
  for (let i = 0; i < 10 * count; i++) put(spire(rnd(8, 26), pick([0x2a0f3c, 0x3a1450, 0x1f0a2e])));
  for (let i = 0; i < 24 * count; i++) { const b = blob(rnd(0.6, 2.5), lam(pick([0x3a1a4a, 0x2a1238, 0x4a2a5a]), { roughness: 0.95 }), 0, 0, 0, null, 0.25, i); b.scale.y = rnd(0.4, 0.8); put(b); }
  return bake(g, { roughness: 0.8, metalness: 0.2 });
}
