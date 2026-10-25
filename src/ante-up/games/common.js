// Pieces several games share: cards, teeth, arcs through the air.
import { THREE, tween, ease } from '../core.js';
import { cardTex, cardBack } from '../tex.js';
import { W } from '../world.js';

export const TY = 0.78;

export function cardMesh(c) {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(0.063, 0.088);
  const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: c ? cardTex(c.v, c.s, c.marked) : cardBack(), roughness: 0.75 }));
  const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: cardBack(), roughness: 0.75 }));
  back.rotation.y = Math.PI;
  front.castShadow = back.castShadow = true;
  g.add(front, back);
  g.userData.front = front;
  g.userData.card = c;
  return g;
}
export function setCardFace(g, c) {
  g.userData.card = c;
  g.userData.front.material.map = cardTex(c.v, c.s, c.marked);
  g.userData.front.material.needsUpdate = true;
}

let toothGeo = null;
export function toothMesh() {
  if (!toothGeo) {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.006 + Math.sin(t * Math.PI * 0.9) * 0.004 - t * t * 0.004, t * 0.018)); }
    toothGeo = new THREE.LatheGeometry(pts, 10);
    toothGeo.rotateZ(Math.PI / 2);
  }
  const m = new THREE.Mesh(toothGeo, new THREE.MeshStandardMaterial({ color: 0xe9dfc4, roughness: 0.35, metalness: 0.0 }));
  m.castShadow = true;
  return m;
}

// Throws an object along an arc to a world position.
export function fly(obj, to, sec = 0.45, h = 0.12, rot) {
  const from = obj.position.clone();
  const r0 = obj.rotation.clone();
  return tween(sec, k => {
    obj.position.lerpVectors(from, to, k);
    obj.position.y += Math.sin(k * Math.PI) * h;
    if (rot) {
      obj.rotation.x = r0.x + (rot.x - r0.x) * k;
      obj.rotation.y = r0.y + (rot.y - r0.y) * k;
      obj.rotation.z = r0.z + (rot.z - r0.z) * k;
    }
  }, ease.io);
}

// A pile of teeth that rearranges itself as the count changes.
export class TeethPile {
  constructor(parent, center, cols = 6) {
    this.parent = parent; this.center = center; this.cols = cols; this.teeth = [];
  }
  slot(i) {
    const c = this.center;
    const row = Math.floor(i / this.cols), col = i % this.cols;
    return new THREE.Vector3(c.x + (col - (this.cols - 1) / 2) * 0.026 + ((row % 2) * 0.012), c.y + 0.006 + Math.floor(i / (this.cols * 3)) * 0.012, c.z + ((row % 3) - 1) * 0.026);
  }
  add(t, animate = true) {
    const i = this.teeth.length;
    this.teeth.push(t);
    if (!t.parent) this.parent.add(t);
    const to = this.slot(i);
    if (animate) return fly(t, to, 0.35, 0.06);
    t.position.copy(to);
    t.rotation.set(0, Math.random() * 6, 0);
    return Promise.resolve();
  }
  take() { return this.teeth.pop(); }
  get count() { return this.teeth.length; }
  fill(n) { for (let i = 0; i < n; i++) this.add(toothMesh(), false); }
  clear() { for (const t of this.teeth) t.parent?.remove(t); this.teeth = []; }
}
// Moves n teeth from one pile to another, one by one.
export async function moveTeeth(from, to, n, gap = 0.06) {
  const ps = [];
  for (let i = 0; i < n && from.count; i++) {
    const t = from.take();
    ps.push(to.add(t));
    await new Promise(r => setTimeout(r, gap * 1000));
  }
  await Promise.all(ps);
}

export function tablePoint(x, z, y = 0) { return new THREE.Vector3(x, TY + y, z); }

export function spoonMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xc8c4bc, roughness: 0.15, metalness: 1 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.12), mat);
  handle.position.z = 0.06;
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat);
  bowl.scale.set(1, 0.35, 1.4);
  bowl.position.set(0, 0.008, -0.02);
  bowl.rotation.x = Math.PI;
  g.add(handle, bowl);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function cleanup(group) {
  group.parent?.remove(group);
  group.traverse(o => {
    if (o.geometry && o.geometry !== toothGeo) o.geometry.dispose?.();
  });
}

export { W };

// ---- dice
import { pipTex } from '../tex.js';
// faces in BoxGeometry order: +x,-x,+y,-y,+z,-z
const FACE_VAL = [1, 6, 2, 5, 3, 4];
const FACE_ROT = { 2: [0, 0, 0], 5: [Math.PI, 0, 0], 1: [0, 0, Math.PI / 2], 6: [0, 0, -Math.PI / 2], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };
export function dieMesh(dark = false, size = 0.03) {
  const mats = FACE_VAL.map(v => new THREE.MeshStandardMaterial({ map: pipTex(v, dark), roughness: dark ? 0.3 : 0.5, metalness: dark ? 0.3 : 0 }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mats);
  cube.castShadow = true;
  const g = new THREE.Group();
  g.add(cube);
  g.userData.cube = cube;
  g.userData.size = size;
  g.userData.value = 1;
  return g;
}
export function setDieFace(die, v) {
  const r = FACE_ROT[v];
  die.userData.cube.rotation.set(r[0], r[1], r[2]);
  die.userData.value = v;
}
// tumble across the table and land showing v
export async function rollDie(die, v, to) {
  const from = die.position.clone();
  const target = to ? to.clone() : from.clone();
  const cube = die.userData.cube;
  const spin = new THREE.Vector3(Math.random() * 30 - 15, Math.random() * 30 - 15, Math.random() * 30 - 15);
  await tween(0.75, k => {
    die.position.lerpVectors(from, target, k);
    die.position.y = target.y + Math.abs(Math.sin(k * Math.PI * 2.5)) * 0.05 * (1 - k);
    cube.rotation.set(spin.x * (1 - k), spin.y * (1 - k), spin.z * (1 - k));
  });
  setDieFace(die, v);
  die.rotation.y = Math.random() * Math.PI * 2;
  die.position.y = target.y;
}
