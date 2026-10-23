// The jungle planet that rushes past the rail cart in chapter 2.
// The cart never really moves: the ground, rails and plants slide toward you instead.
import { THREE } from './engine.js';
import * as MD from './models.js';
import * as J from './models2.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Glue a whole plant or tree into two meshes (lit parts + glowing parts) so the jungle draws fast.
const bakedLit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
const bakedGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
function bake(g) {
  g.updateMatrixWorld(true);
  const lit = [], glw = [], col = new THREE.Color();
  g.traverse(o => {
    if (!o.isMesh) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    geo.applyMatrix4(o.matrixWorld);
    const m = o.material, isGlow = m.type === 'MeshBasicMaterial' || (m.emissive && m.emissiveIntensity > 0.3 && m.emissive.getHex() !== 0);
    col.copy(isGlow && m.emissive ? m.emissive : m.color);
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([col.r, col.g, col.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    (isGlow ? glw : lit).push(geo);
  });
  const out = new THREE.Group();
  if (lit.length) { const m = new THREE.Mesh(mergeGeometries(lit), bakedLit); m.castShadow = true; m.receiveShadow = true; out.add(m); }
  if (glw.length) out.add(new THREE.Mesh(mergeGeometries(glw), bakedGlow));
  return out;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const FAR = -170, NEAR = 30;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

export function buildJungle(scene) {
  const root = MD.group(0, 0, 0, scene);
  root.visible = false;
  const J0 = { root, items: [], sleepers: null, pools: [], flies: null, sky: null, groundTex: null, night: false };

  // sky: teal and green with two moons
  const skyTex = canvasTex(512, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#02121a'); g.addColorStop(0.3, '#06303a'); g.addColorStop(0.46, '#1a7a5a'); g.addColorStop(0.5, '#9aff7a'); g.addColorStop(0.54, '#0a3a2a'); g.addColorStop(1, '#020a08');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (const [cx, cy, r, c] of [[150, 104, 7, '#e8fff0'], [330, 112, 4, '#ffd0f0']]) {
      const m = x.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
      m.addColorStop(0, c); m.addColorStop(0.3, c); m.addColorStop(0.34, 'rgba(255,255,255,0.25)'); m.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = m; x.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    }
  });
  J0.sky = MD.mesh(new THREE.SphereGeometry(440, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }), 0, -30, 0, root);
  J0.stars = MD.makeStars(root, 500);

  // mossy jungle floor that scrolls under the cart
  J0.groundTex = canvasTex(256, 256, x => {
    x.fillStyle = '#1e3a1a'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 400; i++) { x.fillStyle = ['#2a4a1e', '#16301a', '#34522a', '#3a3a20'][(Math.random() * 4) | 0]; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, rnd(2, 10), 0, 7); x.fill(); }
    x.strokeStyle = 'rgba(80,255,140,0.35)'; x.lineWidth = 1;
    for (let i = 0; i < 6; i++) { x.beginPath(); let px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += rnd(-20, 20); py += rnd(-20, 20); x.lineTo(px, py); } x.stroke(); }
  }, [40, 60]);
  const ground = MD.mesh(new THREE.PlaneGeometry(300, 400), MD.lam(0x9ab88a, { map: J0.groundTex, roughness: 0.95 }), 0, 0, -120, root);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  // gravel bed and the two rails
  const bed = MD.mesh(new THREE.PlaneGeometry(9, 400), MD.lam(0x3a3430, { roughness: 1 }), 0, 0.02, -120, root);
  bed.rotation.x = -Math.PI / 2; bed.receiveShadow = true;
  const railM = MD.phong(0xb8c0d0, { roughness: 0.2 });
  for (const s of [-1, 1]) { const r = MD.mesh(new THREE.BoxGeometry(0.25, 0.25, 400), railM, s * 2.6, 0.35, -120, root); r.receiveShadow = true; }
  // railway sleepers: one instanced mesh, moved every frame
  const zs = [];
  for (let z = FAR; z < NEAR; z += 2.5) zs.push(z);
  J0.sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 0.22, 0.6), MD.lam(0x4a3020, { roughness: 0.9 }), zs.length);
  J0.sleepers.receiveShadow = true; J0.sleeperZ = zs; root.add(J0.sleepers);

  // trees, ferns, mushrooms, rocks and flowers on both sides of the track
  const add = (m, x, z, s = 1) => { m.position.set(x, 0, z); m.rotation.y = rnd(0, 6.3); m.scale.setScalar(s); root.add(m); J0.items.push({ m, side: Math.sign(x) }); };
  const side = () => (Math.random() < 0.5 ? -1 : 1);
  for (let i = 0; i < 46; i++) add(bake(J.makeTree()), side() * rnd(9, 45), rnd(FAR, NEAR), rnd(0.8, 1.3));
  for (let i = 0; i < 50; i++) add(bake(J.makeFern()), side() * rnd(5.5, 30), rnd(FAR, NEAR), rnd(0.8, 1.6));
  for (let i = 0; i < 26; i++) add(bake(J.makeMushroom()), side() * rnd(6, 28), rnd(FAR, NEAR), rnd(0.8, 1.8));
  for (let i = 0; i < 14; i++) add(bake(J.makeRockPile()), side() * rnd(6, 30), rnd(FAR, NEAR));
  for (let i = 0; i < 30; i++) add(bake(J.makeFlower()), side() * rnd(5, 20), rnd(FAR, NEAR), rnd(0.8, 1.5));

  // fireflies drifting in the air
  const n = 260, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.set([rnd(-40, 40), rnd(0.5, 10), rnd(FAR, NEAR)], i * 3);
    c.set([0xb0ff3d, 0x3dfff0, 0xffe03d][i % 3]); col.set([c.r, c.g, c.b], i * 3);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  fg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  J0.flies = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  J0.flies.frustumCulled = false;
  root.add(J0.flies);

  // the rail cart
  J0.cart = MD.group(0, 0, 0, root);
  J0.cart.add(J.makeCart());
  return J0;
}

// slide everything toward the player by "speed" units per second
export function updateJungle(J0, dt, speed, t) {
  const d = speed * dt;
  J0.groundTex.offset.y += d / (400 / 60);
  const mtx = new THREE.Matrix4();
  J0.sleeperZ.forEach((z, i) => { z += d; if (z > NEAR) z -= NEAR - FAR; J0.sleeperZ[i] = z; J0.sleepers.setMatrixAt(i, mtx.makeTranslation(0, 0.12, z)); });
  J0.sleepers.instanceMatrix.needsUpdate = true;
  for (const it of J0.items) {
    it.m.position.z += d;
    if (it.m.position.z > NEAR) { it.m.position.z -= NEAR - FAR; it.m.position.x = it.side * Math.abs(it.m.position.x) * rnd(0.85, 1.15); }
  }
  const pa = J0.flies.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    let z = pa.getZ(i) + d;
    if (z > NEAR) z -= NEAR - FAR;
    pa.setXYZ(i, pa.getX(i) + Math.sin(t * 2 + i) * 0.01, pa.getY(i) + Math.cos(t * 1.7 + i) * 0.01, z);
  }
  pa.needsUpdate = true;
  // the cart rocks gently on the rails
  J0.cart.position.y = Math.abs(Math.sin(t * 9)) * 0.03;
  J0.cart.rotation.z = Math.sin(t * 1.3) * 0.01;
}
