import { THREE } from './engine.js';
import { TEX } from './textures.js';
import { rnd } from './state.js';

const col = new THREE.Color();

// Glowing dots for sparks, goo, smoke and explosions. One draw call for all of them.
export class Particles {
  constructor(scene, n, size) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grav = new Float32Array(n);
    for (let k = 0; k < n; k++) this.pos[k * 3 + 1] = -999;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g;
    const m = new THREE.PointsMaterial({ size, map: TEX.dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false });
    this.pts = new THREE.Points(g, m);
    this.pts.frustumCulled = false;
    scene.add(this.pts);
  }
  spawn(x, y, z, vx, vy, vz, color, life, grav = 0) {
    const k = this.i; this.i = (this.i + 1) % this.n;
    const j = k * 3;
    col.set(color);
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z;
    this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.base[j] = col.r; this.base[j + 1] = col.g; this.base[j + 2] = col.b;
    this.life[k] = this.max[k] = life; this.grav[k] = grav;
  }
  burst(p, color, count, speed, life = 0.6, grav = -6) {
    for (let i = 0; i < count; i++) {
      const u = rnd(-1, 1), a = rnd(0, Math.PI * 2), s = Math.sqrt(1 - u * u), sp = speed * rnd(0.3, 1);
      this.spawn(p.x, p.y, p.z, Math.cos(a) * s * sp, u * sp, Math.sin(a) * s * sp, color, life * rnd(0.6, 1.2), grav);
    }
  }
  update(dt) {
    const P = this.pos, V = this.vel, C = this.col, B = this.base;
    const drag = Math.max(0, 1 - 1.6 * dt);
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) continue;
      const j = k * 3;
      this.life[k] -= dt;
      if (this.life[k] <= 0) { P[j + 1] = -999; C[j] = C[j + 1] = C[j + 2] = 0; continue; }
      V[j + 1] += this.grav[k] * dt;
      V[j] *= drag; V[j + 1] *= drag; V[j + 2] *= drag;
      P[j] += V[j] * dt; P[j + 1] += V[j + 1] * dt; P[j + 2] += V[j + 2] * dt;
      const f = this.life[k] / this.max[k];
      C[j] = B[j] * f; C[j + 1] = B[j + 1] * f; C[j + 2] = B[j + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
  clear() {
    this.life.fill(0); this.col.fill(0);
    for (let k = 0; k < this.n; k++) this.pos[k * 3 + 1] = -999;
  }
}

// Chunks of armour and alien bits that fly off when something explodes.
export class Debris {
  constructor(scene, n) {
    this.items = [];
    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
      m.visible = false; scene.add(m);
      this.items.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, s: 1 });
    }
    this.i = 0;
  }
  burst(p, colors, count, speed, size = 0.25) {
    for (let k = 0; k < count; k++) {
      const d = this.items[this.i]; this.i = (this.i + 1) % this.items.length;
      d.m.visible = true; d.m.position.copy(p);
      d.m.material.color.set(colors[k % colors.length]);
      d.s = size * rnd(0.6, 1.4); d.m.scale.setScalar(d.s);
      d.v.set(rnd(-1, 1) * speed, rnd(0.4, 1.2) * speed, rnd(-1, 1) * speed);
      d.spin.set(rnd(-10, 10), rnd(-10, 10), rnd(-10, 10));
      d.life = rnd(1.2, 2);
    }
  }
  update(dt) {
    for (const d of this.items) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.v.y -= 18 * dt;
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < d.s / 2) { d.m.position.y = d.s / 2; d.v.y *= -0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.spin.multiplyScalar(0.6); }
      d.m.rotation.x += d.spin.x * dt; d.m.rotation.y += d.spin.y * dt; d.m.rotation.z += d.spin.z * dt;
      if (d.life < 0.4) d.m.scale.setScalar(d.s * (d.life / 0.4));
      if (d.life <= 0) d.m.visible = false;
    }
  }
  clear() { for (const d of this.items) { d.life = 0; d.m.visible = false; } }
}
