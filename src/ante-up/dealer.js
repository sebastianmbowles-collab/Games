// The Dealer: a seated body made of ~9000 smoke particles, four eyes and a
// grin of light. Tells: flare (sure he wins), condense (bluffing), tremor
// (cornered). He can look at you, look away, lean back, reach and slam.
import { C, THREE, tween, ease, rand, wait } from './core.js';
import { canvasTex, smokeSprite } from './tex.js';
import { A } from './audio.js';

const N = 9000;
const HEAD = new THREE.Vector3(0, 1.8, 0.1);

const vert = `
attribute vec3 aBase; attribute vec4 aSeed; attribute float aPart; attribute vec2 aArm; attribute float aEdge;
uniform float uTime,uFlare,uCondense,uSink,uImplode,uAsh,uYaw,uPitch,uLean,uChaos,uAlpha,uSize,uPix,uFreeze,uLight,uTremor;
uniform vec3 uHead,uLightPos,uLightCol,uHandL,uHandR;
varying float vA; varying vec3 vCol;
vec3 rotY(vec3 p,float a){ float c=cos(a),s=sin(a); return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z); }
vec3 rotX(vec3 p,float a){ float c=cos(a),s=sin(a); return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z); }
vec3 flow(vec3 p,float t){
  return vec3(sin(p.y*3.1+t*1.3+aSeed.x*6.28)+sin(p.z*2.3+t*0.7),
              sin(p.z*2.7+t*1.1+aSeed.y*6.28)+sin(p.x*3.3-t*0.9),
              sin(p.x*2.9+t*1.2+aSeed.z*6.28)+sin(p.y*2.1+t*0.8))*0.5;
}
void main(){
  vec3 p=aBase;
  float t=uTime;
  float life=fract(aSeed.w+t*0.11*(0.5+aSeed.x));
  if(aPart>3.5){ p.y+=life*(0.7+uChaos*0.8); p.xz+=(aSeed.xy-0.5)*life*(0.7+uChaos); }
  // a quarter of the body is always coming loose at the edges
  float loose=step(aSeed.w,0.22)*step(aPart,2.5);
  float lf=fract(aSeed.z+t*0.16*(0.6+aSeed.y));
  if(loose>0.5){ vec2 o=normalize(p.xz+vec2(0.0001)); p.xz+=o*lf*(0.18+uChaos*0.3)*(1.0-uCondense); p.y+=lf*(0.25+uChaos*0.3)*(1.0-uCondense); }
  // arms follow the hands
  if(aPart>2.5 && aPart<3.5){ vec3 off= aArm.x<0.0 ? uHandL : uHandR; p+=off*pow(aArm.y,1.4); }
  // flare: the hood opens like a cobra
  if(aPart>1.5 && aPart<2.5){
    float side=sign(p.x+0.0001);
    p.x+=side*uFlare*(0.25+0.4*aSeed.y);
    p.y+=uFlare*(0.05+0.3*aSeed.z);
    p.z-=uFlare*0.12;
  }
  // head turn
  if(aPart>0.5 && aPart<1.5 || (aPart>3.5 && p.y>1.5)){ vec3 q=p-uHead; q=rotX(q,uPitch); q=rotY(q,uYaw); p=uHead+q; }
  // lean back from the hips
  if(p.y>0.6){ vec3 q=p-vec3(0.0,0.6,-0.1); q=rotX(q,-uLean*(p.y-0.6)/1.2); p=vec3(0.0,0.6,-0.1)+q; }
  // condensation: pulled tight and solid
  p.xz=mix(p.xz,p.xz*vec2(0.55,0.6),uCondense);
  float amp=(0.03+0.055*aSeed.y+uChaos*0.1)*(1.0-uCondense*0.75)*(1.0-uFreeze);
  p+=flow(p*2.2,t*(1.0-uFreeze))*amp;
  // sinking into the floor
  p.y=mix(p.y,p.y*0.08-0.15,uSink);
  p.xz*=1.0+uSink*0.6;
  // implosion: everything to one point
  float ik=uImplode*uImplode;
  p=mix(p,uHead+(aSeed.xyz-0.5)*0.02,ik);
  // ash: drifts down and greys
  p.y-=uAsh*(0.6+aSeed.x*1.4)*uAsh*(p.y+0.3);
  p.xz+=(aSeed.zy-0.5)*uAsh*0.8;
  vec4 wp=modelMatrix*vec4(p,1.0);
  vec4 mv=viewMatrix*wp;
  gl_Position=projectionMatrix*mv;
  float sz=uSize*(0.55+aSeed.x*0.9)*(1.0+uCondense*0.25)*(aPart>3.5?(0.6+life):1.0);
  gl_PointSize=sz*uPix/max(0.1,-mv.z);
  float d=length(wp.xyz-uLightPos);
  vec3 axis=(modelMatrix*vec4(0.0,p.y,0.05,1.0)).xyz;
  float facing=max(0.0,dot(normalize(wp.xyz-axis),normalize(uLightPos-wp.xyz)));
  float li=clamp(uLight/(1.0+d*d*2.5),0.0,1.0)*(0.15+facing*facing*2.2);
  vec3 dark=vec3(0.0011,0.0009,0.0014);
  vCol=mix(dark,uLightCol*vec3(0.09,0.06,0.04),clamp(li,0.0,1.0)*(1.0-uCondense*0.7));
  // cold sheen on the outer edge of the smoke so his shape reads in the dark
  float rim=pow(clamp(aEdge,0.0,1.0),4.0)*(1.0-uCondense*0.8);
  vCol+=vec3(0.022,0.024,0.04)*rim*(1.0-uSink);
  vCol=mix(vCol,vec3(0.32,0.31,0.3),uAsh);
  float a=aPart>3.5?(1.0-life)*0.5:0.9;
  if(loose>0.5) a*=1.0-lf;
  a*=uAlpha*(0.65+uCondense*0.5)*(1.0-uSink*0.7);
  vA=a;
}`;
const frag = `
uniform sampler2D uTex; varying float vA; varying vec3 vCol;
void main(){ float m=texture2D(uTex,gl_PointCoord).a; if(m*vA<0.004) discard; gl_FragColor=vec4(vCol,m*vA); }`;

function sampleBody() {
  const base = new Float32Array(N * 3), seed = new Float32Array(N * 4), part = new Float32Array(N), arm = new Float32Array(N * 2), edge = new Float32Array(N);
  const put = (i, x, y, z, pt, side = 0, at = 0, e = 0.5) => {
    edge[i] = e;
    base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z;
    seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
    part[i] = pt; arm[i * 2] = side; arm[i * 2 + 1] = at;
  };
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // torso radius along its height: narrow waist, wide chest and shoulders
  const prof = h => (h < 0.35 ? 0.2 - h * 0.08 : h < 0.85 ? 0.172 + (h - 0.35) * 0.24 : 0.292 - (h - 0.85) * 1.2);
  let i = 0;
  const quota = { torso: 2700, neck: 300, head: 1400, hood: 1300, arms: 2000, legs: 500 };
  for (let k = 0; k < quota.torso; k++, i++) {
    const h = Math.random();
    const y = 0.55 + h * 0.88;
    const r = prof(h);
    const a = Math.random() * Math.PI * 2, rr = r * Math.pow(Math.random(), 0.35);
    put(i, Math.cos(a) * rr, y, Math.sin(a) * rr * 0.62 + h * 0.1, 0, 0, 0, rr / r);
  }
  for (let k = 0; k < quota.neck; k++, i++) {
    const a = Math.random() * Math.PI * 2, rr = 0.07 * Math.sqrt(Math.random());
    put(i, Math.cos(a) * rr, 1.42 + Math.random() * 0.18, 0.08 + Math.sin(a) * rr, 1);
  }
  for (let k = 0; k < quota.head; k++, i++) {
    const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), rr = 0.19 * Math.pow(Math.random(), 0.3);
    put(i, HEAD.x + Math.sin(b) * Math.cos(a) * rr * 0.9, HEAD.y + Math.cos(b) * rr * 1.25, HEAD.z + Math.sin(b) * Math.sin(a) * rr * 0.85, 1, 0, 0, rr / 0.19);
  }
  for (let k = 0; k < quota.hood; k++, i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const ax = Math.random();
    const x = side * (0.1 + ax * 0.34);
    const y = 1.47 - ax * 0.14 + gauss() * 0.05 + (Math.random() < 0.3 ? Math.random() * 0.35 * (1 - ax) : 0);
    put(i, x, y, -0.04 + gauss() * 0.08, 2, 0, 0, 0.5 + ax * 0.5);
  }
  for (let k = 0; k < quota.arms; k++, i++) {
    const side = k % 2 ? 1 : -1;
    const t = Math.random();
    const sh = [side * 0.36, 1.38, 0.0], el = [side * 0.46, 1.0, 0.26], hand = [side * 0.28, 0.84, 0.64];
    const p = t < 0.5 ? lerp3(sh, el, t * 2) : lerp3(el, hand, (t - 0.5) * 2);
    const r = 0.075 - t * 0.03;
    const gx = gauss(), gy = gauss(), gz = gauss();
    put(i, p[0] + gx * r, p[1] + gy * r, p[2] + gz * r, 3, side, t, Math.min(1, Math.hypot(gx, gy, gz) * 0.8));
    if (t > 0.9) { // long fingers
      const f = Math.floor(Math.random() * 4), fl = Math.random();
      base[i * 3] = hand[0] + side * (f - 1.5) * 0.028 + gauss() * 0.006;
      base[i * 3 + 1] = hand[1] - fl * 0.03;
      base[i * 3 + 2] = hand[2] + fl * 0.13;
    }
  }
  for (let k = 0; k < quota.legs; k++, i++) {
    const side = k % 2 ? 1 : -1;
    const t = Math.random();
    const p = lerp3([side * 0.12, 0.55, 0.05], [side * 0.16, 0.5, 0.45], t);
    put(i, p[0] + gauss() * 0.08, p[1] - t * 0.3 * Math.random() + gauss() * 0.06, p[2] + gauss() * 0.06, 0);
  }
  for (; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = 0.9 + Math.random() * 1.1;
    const rr = 0.2 + Math.random() * 0.25;
    put(i, Math.cos(a) * rr, y, Math.sin(a) * rr * 0.6, 4, 0, 0, 1);
  }
  return { base, seed, part, arm, edge };
}

function grinTex(variant = 0) {
  return canvasTex(512, 256, (g, w) => {
    g.clearRect(0, 0, w, 256);
    const L = 30, R = 482, top = 96;
    const upper = x => top + Math.sin(((x - L) / (R - L)) * Math.PI) * 54;
    const lower = x => top + Math.sin(((x - L) / (R - L)) * Math.PI) * 140;
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    for (let x = L; x <= R; x += 4) g.lineTo(x, upper(x));
    for (let x = R; x >= L; x -= 4) g.lineTo(x, lower(x));
    g.fill();
    g.fillStyle = '#fff';
    let rnd = 17 + variant * 13;
    const r = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
    for (let x = L + 4; x < R - 10;) {
      const wdt = 14 + r() * 22;
      const len = (lower(x + wdt / 2) - upper(x + wdt / 2)) * (0.45 + r() * 0.4);
      g.beginPath(); g.moveTo(x, upper(x) - 2); g.lineTo(x + wdt, upper(x + wdt) - 2); g.lineTo(x + wdt * (0.3 + r() * 0.4), upper(x + wdt / 2) + len); g.closePath(); g.fill();
      x += wdt + 1 + r() * 3;
    }
    for (let x = L + 16; x < R - 20;) {
      const wdt = 12 + r() * 20;
      const len = (lower(x + wdt / 2) - upper(x + wdt / 2)) * (0.3 + r() * 0.35);
      g.beginPath(); g.moveTo(x, lower(x) + 2); g.lineTo(x + wdt, lower(x + wdt) + 2); g.lineTo(x + wdt * (0.3 + r() * 0.4), lower(x + wdt / 2) - len); g.closePath(); g.fill();
      x += wdt + 2 + r() * 4;
    }
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3;
    g.beginPath(); for (let x = L; x <= R; x += 4) g.lineTo(x, upper(x) - 3); g.stroke();
    g.beginPath(); for (let x = L; x <= R; x += 4) g.lineTo(x, lower(x) + 3); g.stroke();
  }, { srgb: false });
}
function eyeTex() {
  return canvasTex(128, 64, (g) => {
    const grd = g.createRadialGradient(64, 32, 0, 64, 32, 60);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.95)'); grd.addColorStop(0.5, 'rgba(220,225,255,.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.scale(1, 0.5); g.translate(0, 32); g.fillStyle = grd; g.fillRect(0, -32, 128, 128); g.restore();
  }, { srgb: false });
}

export const dealer = {
  group: null, mat: null, u: null, headGrp: null, eyes: [], grin: null, cloak: null,
  state: { flare: 0, condense: 0, tremor: 0, yaw: 0, pitch: 0, lean: 0, sink: 0 },
  target: { flare: 0, condense: 0, yaw: 0, pitch: 0, lean: 0 },
  tells: [], look: 'player', lookPt: new THREE.Vector3(), attention: 'watch', eyeGlow: 1, blink: 0, snapT: 0,
  handL: new THREE.Vector3(), handR: new THREE.Vector3(), handTL: new THREE.Vector3(), handTR: new THREE.Vector3(), handK: 6,
  scale: 1, visible: true,

  build(scene) {
    const g = new THREE.Group();
    g.position.set(0, 0, -1.2);
    this.group = g;
    const { base, seed, part, arm, edge } = sampleBody();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    geo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
    geo.setAttribute('aArm', new THREE.BufferAttribute(arm, 2));
    geo.setAttribute('aEdge', new THREE.BufferAttribute(edge, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 3);
    this.u = {
      uTime: { value: 0 }, uFlare: { value: 0 }, uCondense: { value: 0 }, uSink: { value: 0 }, uImplode: { value: 0 }, uAsh: { value: 0 },
      uYaw: { value: 0 }, uPitch: { value: 0 }, uLean: { value: 0 }, uChaos: { value: 0 }, uAlpha: { value: 1 }, uSize: { value: 0.16 },
      uPix: { value: 500 }, uFreeze: { value: 0 }, uLight: { value: 1 }, uTremor: { value: 0 }, uHead: { value: HEAD.clone() },
      uLightPos: { value: new THREE.Vector3(0.4, 0.95, 0) }, uLightCol: { value: new THREE.Color(1, 0.6, 0.3) },
      uHandL: { value: this.handL }, uHandR: { value: this.handR }, uTex: { value: smokeSprite() },
    };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, this.mat);
    pts.frustumCulled = false;
    pts.renderOrder = 2;
    g.add(pts);
    this.points = pts;
    // head group carries the eyes and grin
    const hg = new THREE.Group();
    hg.position.copy(HEAD);
    g.add(hg);
    this.headGrp = hg;
    const et = eyeTex();
    const eyeDefs = [[-0.085, 0.06, 0.05, 1], [0.072, 0.085, 0.042, 0.9], [-0.025, -0.005, 0.03, 0.75], [0.12, 0.0, 0.034, 0.8]];
    for (const [x, y, s, b] of eyeDefs) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s * 2.6, s * 1.1), new THREE.MeshBasicMaterial({ map: et, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(2.2 * b, 2.2 * b, 2.5 * b), toneMapped: false }));
      m.position.set(x, y, 0.19);
      m.rotation.z = (Math.random() - 0.5) * 0.4;
      m.renderOrder = 3;
      m.userData.b = b;
      hg.add(m);
      this.eyes.push(m);
    }
    this.grinTex = [grinTex(0), grinTex(1)];
    const gg = new THREE.CylinderGeometry(0.24, 0.24, 0.12, 24, 1, true, -0.95, 1.9);
    gg.rotateY(Math.PI);
    const grin = new THREE.Mesh(gg, new THREE.MeshBasicMaterial({ map: this.grinTex[0], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: new THREE.Color(1.8, 1.8, 1.8), toneMapped: false }));
    // the cylinder faces -z by default after rotate; flip to face the player
    grin.rotation.y = Math.PI;
    grin.position.set(0.01, -0.1, -0.04);
    grin.renderOrder = 3;
    hg.add(grin);
    this.grin = grin;
    const gl = new THREE.PointLight(0xdfe4ff, 0.25, 1.2, 2);
    gl.position.set(0, 0, 0.35);
    hg.add(gl);
    this.faceLight = gl;
    scene.add(g);
    this.buildCloak(scene);
  },

  buildCloak(scene) {
    // the empty cloak left on his chair during intermissions
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = t < 0.15 ? 0.05 + t * 1.2 : 0.24 + Math.sin(t * Math.PI * 0.9) * 0.12 + t * 0.08;
      pts.push(new THREE.Vector2(r, 1.55 - t * 1.05));
    }
    const geo = new THREE.LatheGeometry(pts, 24, 0, Math.PI * 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const fold = Math.sin(Math.atan2(z, x) * 7 + y * 3) * 0.02 * (1.55 - y);
      pos.setXYZ(i, x * (1 + fold * 3), y - (z > 0 ? 0.25 * (1.55 - y) * 0.3 : 0), z * 0.8);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0c0a0e, roughness: 0.95, side: THREE.DoubleSide }));
    m.position.set(0, 0, -1.25);
    m.rotation.x = -0.18;
    m.castShadow = true;
    m.visible = false;
    scene.add(m);
    this.cloak = m;
  },

  setAct(n) {
    const sc = [1, 1, 1.1, 1.22, 1.55, 1.38][n] || 1;
    this.scale = sc;
    this.group.scale.setScalar(sc);
    this.group.position.z = -1.2 - (sc - 1) * 0.35;
    this.u.uChaos.value = n === 5 ? 0.35 : n === 4 ? 0.12 : 0;
    this.u.uSize.value = 0.16;
  },

  // Brief tells. Duration comes from difficulty.
  tell(type, dur = 2) {
    this.tells.push({ type, t: dur, d: dur });
    if (type === 'flare') A.sfx('whoosh');
    if (type === 'condense') A.sfx('exhale');
  },
  clearTells() { this.tells = []; },

  lookAtPlayer() { this.look = 'player'; },
  lookAway(where = 'up') {
    this.look = where;
    if (where === 'up') this.lookPt.set(0.3, 3.2, -0.4);
    else if (where === 'side') this.lookPt.set(-2.4, 1.6, -0.6);
    else if (where === 'cards') this.lookPt.set(0.15, 0.6, -0.55);
    else if (where === 'candle') this.lookPt.set(0.55, 0.95, 0.1);
    else if (where === 'dark') this.lookPt.set(2.6, 1.2, -2);
    else if (where === 'board') this.lookPt.set(0, 0.8, 0.05);
  },
  lookAtPoint(v) { this.look = 'pt'; this.lookPt.copy(v); },
  // Eyes snap to you, with a sound.
  snap() {
    this.look = 'player'; this.snapT = 0.35;
    A.sfx('snap');
  },
  leanBack(v) { this.target.lean = v ? 0.35 : 0; },

  hands(l, r, k = 6) {
    if (l) this.handTL.copy(l);
    if (r) this.handTR.copy(r);
    this.handK = k;
  },
  restHands() { this.handTL.set(0, 0, 0); this.handTR.set(0, 0, 0); this.handK = 5; },

  async slam() {
    this.hands(new THREE.Vector3(0.1, 0.55, -0.15), new THREE.Vector3(-0.1, 0.55, -0.15), 5);
    this.target.flare = 1;
    await wait(0.55);
    this.hands(new THREE.Vector3(0.05, -0.05, 0.05), new THREE.Vector3(-0.05, -0.05, 0.05), 30);
    await wait(0.09);
    this.target.flare = 0;
    setTimeout(() => this.restHands(), 600);
  },

  async sinkAway() {
    A.sfx('sink');
    this.cloak.visible = true;
    this.cloak.material.opacity = 1;
    await tween(2.2, k => { this.u.uSink.value = k; this.setEyes(1 - k); this.grin.material.opacity = 1 - k; }, ease.in);
    this.points.visible = false;
    this.headGrp.visible = false;
    this.visible = false;
  },
  async riseUp() {
    A.sfx('rise');
    this.points.visible = true;
    this.headGrp.visible = true;
    this.visible = true;
    await tween(2, k => { this.u.uSink.value = 1 - k; this.setEyes(k); this.grin.material.opacity = k; }, ease.out);
    this.cloak.visible = false;
  },
  setEyes(v) {
    this.eyeGlow = v;
  },
  hide(v) { this.group.visible = !v; },

  update(dt) {
    const u = this.u, s = this.state, tg = this.target;
    u.uTime.value = C.t;
    u.uPix.value = C.h * 0.5 / Math.tan((C.camera.fov * Math.PI) / 360) * 0.5;
    // tells
    let fl = tg.flare, co = tg.condense, tr = 0;
    for (let i = this.tells.length - 1; i >= 0; i--) {
      const te = this.tells[i];
      te.t -= dt;
      const k = Math.min(1, Math.min(te.d - te.t, te.t) * 3);
      if (te.type === 'flare') fl = Math.max(fl, k);
      if (te.type === 'condense') co = Math.max(co, k);
      if (te.type === 'tremor') tr = Math.max(tr, k);
      if (te.t <= 0) this.tells.splice(i, 1);
    }
    s.flare += (fl - s.flare) * Math.min(1, dt * 6);
    s.condense += (co - s.condense) * Math.min(1, dt * 6);
    s.tremor = tr;
    u.uFlare.value = s.flare;
    u.uCondense.value = s.condense;
    // where the head points
    const wHead = new THREE.Vector3();
    this.headGrp.getWorldPosition(wHead);
    let ty = 0, tp = 0;
    const lookAt = p => {
      const loc = this.group.worldToLocal(p.clone());
      const d = loc.sub(HEAD);
      ty = Math.atan2(d.x, d.z);
      tp = -Math.atan2(d.y, Math.hypot(d.x, d.z));
    };
    if (this.look === 'player') lookAt(C.camera.position);
    else lookAt(this.lookPt);
    ty = Math.max(-1.3, Math.min(1.3, ty));
    tp = Math.max(-0.7, Math.min(0.7, tp));
    const hk = this.snapT > 0 ? 30 : 3.2;
    this.snapT -= dt;
    s.yaw += (ty - s.yaw) * Math.min(1, dt * hk);
    s.pitch += (tp - s.pitch) * Math.min(1, dt * hk);
    s.lean += (tg.lean - s.lean) * Math.min(1, dt * 3);
    u.uYaw.value = s.yaw; u.uPitch.value = s.pitch; u.uLean.value = s.lean;
    // keep eyes/grin glued to the same head transform as the shader
    const leanPivot = new THREE.Vector3(0, 0.6, -0.1);
    const hp = HEAD.clone().sub(leanPivot);
    hp.applyAxisAngle(new THREE.Vector3(1, 0, 0), -s.lean * (HEAD.y - 0.6) / 1.2);
    this.headGrp.position.copy(leanPivot).add(hp);
    this.headGrp.rotation.set(0, 0, 0);
    this.headGrp.rotation.order = 'YXZ';
    this.headGrp.rotation.y = s.yaw;
    this.headGrp.rotation.x = s.pitch - s.lean * 0.6;
    u.uHead.value.copy(HEAD);
    // hands
    this.handL.lerp(this.handTL, Math.min(1, dt * this.handK));
    this.handR.lerp(this.handTR, Math.min(1, dt * this.handK));
    // eyes and blinking
    this.blink -= dt;
    if (this.blink < -rand(2.5, 7)) this.blink = 0.14;
    const bl = this.blink > 0 ? 0.08 : 1;
    for (const e of this.eyes) {
      const b = e.userData.b * this.eyeGlow;
      e.material.color.setRGB(2.2 * b, 2.2 * b, 2.5 * b);
      e.scale.y = bl;
    }
    // grin flickers when he's cornered
    const gm = this.grin;
    if (s.tremor > 0.05) {
      gm.position.x = 0.01 + (Math.random() - 0.5) * 0.012 * s.tremor;
      gm.position.y = -0.1 + (Math.random() - 0.5) * 0.01 * s.tremor;
      gm.scale.y = 1 + (Math.random() - 0.5) * 0.25 * s.tremor;
      gm.material.map = this.grinTex[Math.random() < 0.5 ? 0 : 1];
      gm.material.color.setScalar(Math.random() < 0.25 * s.tremor ? 0.4 : 1.8);
    } else {
      gm.position.set(0.01, -0.1, -0.04);
      gm.scale.y = 1 + s.flare * 0.12;
      gm.material.map = this.grinTex[0];
      gm.material.color.setScalar(1.8 * Math.max(0.05, this.eyeGlow));
    }
    gm.scale.x = 1 + s.flare * 0.1 - s.condense * 0.1;
    this.faceLight.intensity = 0.25 * this.eyeGlow;
  },

  setLight(pos, intensity, color) {
    this.u.uLightPos.value.copy(pos);
    this.u.uLight.value = intensity;
    if (color) this.u.uLightCol.value.copy(color);
  },

  headWorld(out = new THREE.Vector3()) { return this.headGrp.getWorldPosition(out); },
  isWatching() { return this.attention === 'watch'; },
};
