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
    // chunks, shards, spikes and bits of pipe
    const geos = [new THREE.BoxGeometry(1, 0.6, 0.8), new THREE.TetrahedronGeometry(0.7), new THREE.ConeGeometry(0.35, 1.4, 4), new THREE.CylinderGeometry(0.25, 0.25, 1, 8), new THREE.DodecahedronGeometry(0.6)];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geos[i % geos.length], new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.4 }));
      m.castShadow = true;
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

// Soft puffs of dark smoke that fade out (each puff has its own see-through amount).
export class Smoke {
  constructor(scene, n, size) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.vel = new Float32Array(n * 3); this.col = new Float32Array(n * 3);
    this.alpha = new Float32Array(n); this.scale = new Float32Array(n); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grow = new Float32Array(n);
    for (let k = 0; k < n; k++) this.pos[k * 3 + 1] = -999;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('scale', new THREE.BufferAttribute(this.scale, 1));
    this.geo = g;
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: TEX.dot }, size: { value: size * 300 } },
      vertexShader: `attribute float alpha; attribute float scale; varying float vA; varying vec3 vC;
        uniform float size;
        void main() { vA = alpha; vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; varying vec3 vC;
        void main() { vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA); if (gl_FragColor.a < 0.01) discard; }`,
      vertexColors: true, transparent: true, depthWrite: false,
    });
    this.pts = new THREE.Points(g, m);
    this.pts.frustumCulled = false;
    scene.add(this.pts);
  }
  puff(p, count, color = 0x2a2630, spread = 1, life = 1.4) {
    col.set(color);
    for (let c = 0; c < count; c++) {
      const k = this.i, j = k * 3;
      this.i = (this.i + 1) % this.n;
      this.pos[j] = p.x + rnd(-0.4, 0.4) * spread; this.pos[j + 1] = p.y + rnd(-0.3, 0.3) * spread; this.pos[j + 2] = p.z + rnd(-0.4, 0.4) * spread;
      this.vel[j] = rnd(-1, 1) * spread; this.vel[j + 1] = rnd(0.8, 2.2); this.vel[j + 2] = rnd(-1, 1) * spread;
      const v = rnd(0.7, 1.2);
      this.col[j] = col.r * v; this.col[j + 1] = col.g * v; this.col[j + 2] = col.b * v;
      this.life[k] = this.max[k] = life * rnd(0.7, 1.3); this.scale[k] = spread * rnd(0.6, 1); this.grow[k] = spread * rnd(1, 2);
    }
  }
  update(dt) {
    for (let k = 0; k < this.n; k++) {
      if (this.life[k] <= 0) continue;
      const j = k * 3;
      this.life[k] -= dt;
      if (this.life[k] <= 0) { this.pos[j + 1] = -999; this.alpha[k] = 0; continue; }
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      this.vel[j] *= 0.97; this.vel[j + 2] *= 0.97;
      this.scale[k] += this.grow[k] * dt;
      const f = this.life[k] / this.max[k];
      this.alpha[k] = Math.min(1, (1 - f) * 6) * f * 0.75;
    }
    for (const a of ['position', 'alpha', 'scale']) this.geo.attributes[a].needsUpdate = true;
  }
  clear() { this.life.fill(0); this.alpha.fill(0); for (let k = 0; k < this.n; k++) this.pos[k * 3 + 1] = -999; }
}

// A bright flash and a ring-shaped shockwave that spreads across the ground.
export class Blasts {
  constructor(scene, n = 10) {
    this.items = [];
    const rg = new THREE.RingGeometry(0.7, 1, 48);
    rg.rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.visible = flash.visible = core.visible = false;
      scene.add(ring, flash, core);
      this.items.push({ ring, flash, core, t: 0, life: 0, s: 1 });
    }
    this.i = 0;
  }
  boom(p, color, size = 1) {
    const b = this.items[this.i]; this.i = (this.i + 1) % this.items.length;
    b.t = 0; b.life = 0.55; b.s = size;
    for (const m of [b.ring, b.flash, b.core]) { m.visible = true; m.position.copy(p); m.material.color.set(color); }
    b.ring.position.y = Math.max(0.05, p.y - 0.8 * size);
    b.core.material.color.set(0xffffff).lerp(new THREE.Color(color), 0.4);
  }
  update(dt) {
    for (const b of this.items) {
      if (b.life <= 0) continue;
      b.t += dt;
      const k = b.t / b.life;
      if (k >= 1) { b.life = 0; b.ring.visible = b.flash.visible = b.core.visible = false; continue; }
      b.ring.scale.setScalar(b.s * (0.5 + k * 5)); b.ring.material.opacity = (1 - k) * 0.9;
      b.flash.scale.setScalar(b.s * (3 + k * 4)); b.flash.material.opacity = (1 - k) ** 2;
      b.core.scale.setScalar(b.s * (0.3 + Math.sqrt(k) * 1.2)); b.core.material.opacity = Math.max(0, 1 - k * 2.2);
    }
  }
  clear() { for (const b of this.items) { b.life = 0; b.ring.visible = b.flash.visible = b.core.visible = false; } }
}
