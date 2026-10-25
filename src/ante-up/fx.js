// Low-sanity visuals, shadow people, glass shards, breath and other particles.
import { C, THREE, rand, lookingAt } from './core.js';
import { S } from './state.js';
import { canvasTex, glowSprite } from './tex.js';
import { A } from './audio.js';
import { W } from './world.js';

let figTex = null, breathTex = null;
const figures = [];
const bits = [];
let nextFig = 15, nextBreath = 0;
export const fxState = { breath: false, hallucinate: true };

function figure() {
  if (!figTex) {
    figTex = canvasTex(128, 320, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,.92)';
      g.beginPath(); g.ellipse(w / 2, 46, 22, 28, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 20, 70); g.quadraticCurveTo(w / 2 - 52, 110, w / 2 - 40, 200); g.lineTo(w / 2 - 30, h); g.lineTo(w / 2 + 30, h); g.lineTo(w / 2 + 40, 200); g.quadraticCurveTo(w / 2 + 52, 110, w / 2 + 20, 70); g.fill();
      g.filter = 'blur(3px)'; g.drawImage(g.canvas, 0, 0);
    });
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: figTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  s.scale.set(0.7, 1.8, 1);
  return s;
}

export function updateFx(dt) {
  const sanity = S.sanity ?? 100;
  const target = sanity < 78 ? Math.pow((78 - sanity) / 78, 1.15) : 0;
  C.fx.insane += (target - C.fx.insane) * Math.min(1, dt * 1.2);
  if (C.paused) return;
  // shadow people at the edge of your vision
  nextFig -= dt;
  if (fxState.hallucinate && sanity < 45 && nextFig <= 0 && C.view.mode !== 'cut') {
    nextFig = 8 + (sanity / 45) * 22 + rand(0, 8);
    const f = figure();
    const side = Math.random() < 0.5 ? -1 : 1;
    const a = C.view.yaw + side * rand(0.9, 1.35);
    const d = rand(2.4, 3.4);
    f.position.set(C.camera.position.x - Math.sin(a) * d, 0.9, C.camera.position.z - Math.cos(a) * d);
    f.userData = { t: 0, life: rand(2, 4) };
    C.scene.add(f);
    figures.push(f);
  }
  for (let i = figures.length - 1; i >= 0; i--) {
    const f = figures[i], u = f.userData;
    u.t += dt;
    let op = Math.min(0.85, u.t * 1.2) * Math.min(1, (u.life - u.t) * 2);
    if (lookingAt(f.position, 18)) { u.life = Math.min(u.life, u.t + 0.08); if (!u.seen) { u.seen = true; A.sfx('whispers', 0.5, 1); } }
    f.material.opacity = Math.max(0, op);
    if (u.t >= u.life) { C.scene.remove(f); f.material.dispose(); figures.splice(i, 1); }
  }
  // cold breath in Act 4
  if (fxState.breath) {
    nextBreath -= dt;
    if (nextBreath <= 0) { nextBreath = rand(2.6, 3.6); breathPuff(); }
  }
  // flying bits
  for (let i = bits.length - 1; i >= 0; i--) {
    const b = bits[i], u = b.userData;
    u.t += dt;
    if (u.kind === 'shard') {
      u.v.y -= 9.8 * dt;
      b.position.addScaledVector(u.v, dt);
      b.rotation.x += u.r.x * dt; b.rotation.y += u.r.y * dt;
      if (b.position.y < u.floor) { b.position.y = u.floor; u.v.multiplyScalar(0.3); u.v.y = Math.abs(u.v.y) * 0.3; u.r.multiplyScalar(0.5); }
      if (u.t > 2.2) b.material.opacity = Math.max(0, 1 - (u.t - 2.2) * 1.5);
      if (u.t > 3) { C.scene.remove(b); bits.splice(i, 1); }
    } else if (u.kind === 'puff') {
      b.position.addScaledVector(u.v, dt);
      const k = u.t / u.life;
      b.scale.setScalar(0.06 + k * 0.35);
      b.material.opacity = 0.22 * Math.sin(Math.min(1, k) * Math.PI);
      if (u.t > u.life) { C.scene.remove(b); bits.splice(i, 1); }
    } else if (u.kind === 'ember') {
      u.v.y += dt * 0.3;
      b.position.addScaledVector(u.v, dt);
      b.material.opacity = Math.max(0, 1 - u.t / u.life);
      if (u.t > u.life) { C.scene.remove(b); bits.splice(i, 1); }
    }
  }
}

const shardGeo = new THREE.TetrahedronGeometry(0.012, 0);
export function shatter(pos, color = 0xd8e8ff, n = 34) {
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.9, clearcoat: 1 });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(shardGeo, mat.clone());
    m.position.copy(pos).add(new THREE.Vector3(rand(-0.02, 0.02), rand(0, 0.06), rand(-0.02, 0.02)));
    m.scale.setScalar(rand(0.4, 1.6));
    m.userData = { kind: 'shard', t: 0, v: new THREE.Vector3(rand(-0.9, 0.9), rand(0.6, 2.2), rand(-0.9, 0.9)), r: new THREE.Vector3(rand(-20, 20), rand(-20, 20), 0), floor: W.TABLE_Y + 0.004 };
    C.scene.add(m);
    bits.push(m);
  }
  const fl = new THREE.PointLight(0xc8e0ff, 1.5, 1.2, 2);
  fl.position.copy(pos).y += 0.05;
  C.scene.add(fl);
  let k = 1;
  const id = setInterval(() => { k -= 0.1; fl.intensity = Math.max(0, k * 1.5); if (k <= 0) { clearInterval(id); C.scene.remove(fl); } }, 30);
  C.fx.flash = Math.max(C.fx.flash, 0.12);
}

export function breathPuff() {
  if (!breathTex) breathTex = glowSprite('#dfe8ff', 0.4);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: breathTex, transparent: true, opacity: 0, depthWrite: false }));
  const dir = new THREE.Vector3();
  C.camera.getWorldDirection(dir);
  s.position.copy(C.camera.position).addScaledVector(dir, 0.18).add(new THREE.Vector3(0, -0.08, 0));
  s.userData = { kind: 'puff', t: 0, life: 1.8, v: dir.clone().multiplyScalar(0.25).add(new THREE.Vector3(0, 0.05, 0)) };
  C.scene.add(s);
  bits.push(s);
}

let emberTex = null;
export function embers(pos, n = 20, spread = 0.4) {
  if (!emberTex) emberTex = glowSprite('#ff8a30', 0.3);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emberTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(2, 1.2, 0.5) }));
    s.scale.setScalar(rand(0.01, 0.03));
    s.position.copy(pos).add(new THREE.Vector3(rand(-spread, spread), rand(0, spread), rand(-spread, spread)));
    s.userData = { kind: 'ember', t: 0, life: rand(1, 3), v: new THREE.Vector3(rand(-0.2, 0.2), rand(0.2, 0.9), rand(-0.2, 0.2)) };
    C.scene.add(s);
    bits.push(s);
  }
}
export function clearFigures() { for (const f of figures) C.scene.remove(f); figures.length = 0; }
