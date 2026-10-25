import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { meta } from './state.js';
export { THREE };

// C is the shared engine object: renderer, camera, clock, input and the list
// of things in the world you can click on ("hots").
export const C = {
  t: 0, dt: 0, paused: false, updaters: new Set(), keys: {}, pressed: {},
  view: { mode: 'seat', yaw: 0, pitch: -0.32, ty: 0, tp: -0.32, yawLim: [-1.9, 1.9], pitchLim: [-1.25, 0.75] },
  seat: { x: 0, y: 1.3, z: 0.98, lean: 0, crouch: 0 },
  walk: { x: 0, z: 1.1, y: 1.6, anchor: new THREE.Vector2(0, 1.25), radius: 3, speed: 1.55, bob: 0, taut: 0 },
  colliders: [], hots: [], hover: null, holding: null, angSpeed: 0, lookLock: 0,
  fx: { insane: 0, flash: 0, black: 0, shake: 0, tint: new THREE.Color(1, 1, 1), tintAmt: 0, aberr: 0.0015, grain: 0.05, vig: 1, frost: 0, red: 0 },
  input: true,
};

const V = new THREE.Vector3();
const V2 = new THREE.Vector3();

const PostShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uInsane: { value: 0 }, uReduce: { value: 0 }, uFlash: { value: 0 },
    uBlack: { value: 0 }, uVig: { value: 1 }, uGrain: { value: 0.05 }, uAberr: { value: 0.0015 }, uTint: { value: new THREE.Color(1, 1, 1) },
    uTintAmt: { value: 0 }, uFrost: { value: 0 }, uRed: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime,uInsane,uReduce,uFlash,uBlack,uVig,uGrain,uAberr,uTintAmt,uFrost,uRed;
    uniform vec3 uTint; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv=vUv; vec2 c=uv-0.5; float r=length(c*vec2(uRes.x/uRes.y,1.0))*0.8;
      float ins=uInsane*(1.0-0.7*uReduce);
      uv += c*(r*r)*ins*0.22*sin(uTime*0.6);
      float edge=smoothstep(0.25,0.75,r);
      uv += vec2(sin(uv.y*23.0+uTime*1.7), cos(uv.x*19.0+uTime*1.3))*0.0035*ins*edge;
      float ab=uAberr+ins*0.007*edge;
      vec3 col=vec3(texture2D(tDiffuse,uv+c*ab).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-c*ab).b);
      float l=dot(col,vec3(0.299,0.587,0.114));
      col=mix(col,vec3(l),ins*0.45);
      col=mix(col,col*uTint*1.25,uTintAmt);
      col=mix(col,vec3(l)*vec3(0.75,0.9,1.15),uFrost*0.35);
      float vig=smoothstep(0.95,0.25,r*(1.0+ins*0.7));
      col*=mix(1.0,vig,uVig);
      col=mix(col,col+vec3(0.35,0.0,0.0)*(1.0-vig),uRed);
      // creeping dark shapes at the edge of vision when sanity is low
      float sh=sin(atan(c.y,c.x)*5.0+uTime*0.4)*0.5+0.5;
      col*=1.0-ins*edge*0.55*sh;
      float n=h(vUv*uRes+fract(uTime*7.0)*100.0);
      col+=(n-0.5)*(uGrain+ins*0.05);
      col=mix(col,vec3(1.0,0.97,0.92),uFlash);
      col*=1.0-uBlack;
      gl_FragColor=vec4(col,1.0);
    }`,
};

export function initCore() {
  const canvas = document.getElementById('gl');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const low = meta.settings.low || /[?&]low=1/.test(location.search);
  C.low = low;
  r.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio, 2));
  r.shadowMap.enabled = !low;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.15;
  C.renderer = r;
  C.scene = new THREE.Scene();
  C.scene.background = new THREE.Color(0x020102);
  C.scene.fog = new THREE.FogExp2(0x050304, 0.12);
  C.camera = new THREE.PerspectiveCamera(74, 1, 0.02, 120);
  C.scene.add(C.camera);
  C.composer = new EffectComposer(r);
  C.composer.addPass(new RenderPass(C.scene, C.camera));
  C.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.45, 0.82);
  C.composer.addPass(C.bloom);
  C.bloom.enabled = !low;
  C.composer.addPass(new OutputPass());
  C.post = new ShaderPass(PostShader);
  C.composer.addPass(C.post);
  C.ray = new THREE.Raycaster();
  C.mouse = { x: 0, y: 0, nx: 0, ny: 0, down: false, sx: 0, sy: 0, drag: false, moved: 0 };
  window.addEventListener('resize', resize);
  resize();
  bindInput(canvas);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  C.w = w; C.h = h;
  C.renderer.setSize(w, h, false);
  C.composer.setSize(w, h);
  C.camera.aspect = w / h;
  C.camera.updateProjectionMatrix();
  C.post.uniforms.uRes.value.set(w, h);
}

function bindInput(canvas) {
  const m = C.mouse;
  const keyName = e => (e.key === ' ' ? 'space' : e.key.toLowerCase());
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = keyName(e);
    if (!C.keys[k]) C.pressed[k] = true;
    C.keys[k] = true;
    if (e.ctrlKey) C.keys.control = true;
    if (['space', 'tab', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
    for (const f of keyHandlers) f(k, e);
  });
  window.addEventListener('keyup', e => { C.keys[keyName(e)] = false; if (!e.ctrlKey) C.keys.control = false; });
  window.addEventListener('blur', () => { for (const k in C.keys) C.keys[k] = false; m.down = false; cancelHold(); });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    m.down = true; m.drag = false; m.sx = e.clientX; m.sy = e.clientY; m.moved = 0;
    setMouse(e);
    for (const f of downHandlers) f(e);
    if (!C.input || C.paused) return;
    const h = C.hover;
    if (h && h.opts.hold && usable(h)) {
      C.holding = { hot: h, t: 0 };
      h.opts.hold.onStart?.();
    }
  });
  canvas.addEventListener('pointermove', e => {
    const dx = e.clientX - m.x, dy = e.clientY - m.y;
    setMouse(e);
    if (!m.down) return;
    m.moved += Math.abs(dx) + Math.abs(dy);
    if (C.holding && m.moved > 16) cancelHold();
    if (!C.holding && m.moved > 5) m.drag = true;
    if (m.drag && C.input && !C.paused && C.lookLock <= 0 && C.view.mode !== 'cut') {
      const s = 0.0042 * meta.settings.sens;
      C.view.ty -= dx * s;
      C.view.tp -= dy * s;
      clampView();
    }
    canvas.classList.toggle('drag', m.drag);
  });
  const up = e => {
    if (!m.down) return;
    m.down = false;
    canvas.classList.remove('drag');
    for (const f of upHandlers) f(e);
    if (C.holding) {
      const hd = C.holding;
      cancelHold();
      if (!m.drag && hd.t < 0.3 && hd.hot.opts.onClick) hd.hot.opts.onClick(hd.hot);
      return;
    }
    if (!m.drag && C.input && !C.paused) {
      const h = C.hover;
      if (h && !h.opts.hold && usable(h)) h.opts.onClick?.(h);
      else if (h && h.opts.locked) {
        const why = typeof h.opts.locked === 'function' ? h.opts.locked() : h.opts.locked;
        if (why) C.onLocked?.(why);
      }
    }
    m.drag = false;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
}
const keyHandlers = new Set(), downHandlers = new Set(), upHandlers = new Set();
export const onKey = f => (keyHandlers.add(f), () => keyHandlers.delete(f));
export const onDown = f => (downHandlers.add(f), () => downHandlers.delete(f));
export const onUp = f => (upHandlers.add(f), () => upHandlers.delete(f));

function setMouse(e) {
  const m = C.mouse;
  m.x = e.clientX; m.y = e.clientY;
  m.nx = (e.clientX / C.w) * 2 - 1;
  m.ny = 1 - (e.clientY / C.h) * 2;
}

export function clampView() {
  const v = C.view;
  v.ty = Math.max(v.yawLim[0], Math.min(v.yawLim[1], v.ty));
  v.tp = Math.max(v.pitchLim[0], Math.min(v.pitchLim[1], v.tp));
}

export function setView(mode, o = {}) {
  const v = C.view;
  v.mode = mode;
  if (mode === 'seat') { v.yawLim = o.yawLim || [-1.9, 1.9]; v.pitchLim = [-1.3, 0.8]; }
  if (mode === 'walk') { v.yawLim = [-1e9, 1e9]; v.pitchLim = [-1.35, 1.2]; }
  if (o.yaw !== undefined) { v.ty = v.yaw = o.yaw; }
  if (o.pitch !== undefined) { v.tp = v.pitch = o.pitch; }
  clampView();
}

// ---------------------------------------------------------------- hots
const outlineMat = () => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(1, 0.72, 0.38) }, uA: { value: 0 }, uT: { value: 0.006 } },
  vertexShader: `uniform float uT; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vec3 wn=normalize(mat3(modelMatrix)*normal);
    wp.xyz+=wn*uT; gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: 'uniform vec3 uColor; uniform float uA; void main(){ gl_FragColor=vec4(uColor*1.1,uA); }',
  side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
});

// opts: label, onClick, enabled(), glow(), hold{time,label,cheat,onStart,onTick,onDone,onCancel}, reach, locked(), cheat
export function addHot(obj, opts) {
  const h = { obj, opts, mat: outlineMat(), shells: [], glowA: 0 };
  if (opts.color) h.mat.uniforms.uColor.value.set(opts.color);
  if (opts.thick) h.mat.uniforms.uT.value = opts.thick;
  const targets = [];
  obj.traverse(o => { if (o.isMesh && o.geometry?.attributes?.normal && !o.userData.noOutline && !o.userData.shell) targets.push(o); });
  targets.forEach(o => {
    {
      const s = new THREE.Mesh(o.geometry, h.mat);
      s.raycast = () => {};
      s.renderOrder = 5;
      s.userData.shell = true;
      o.add(s);
      h.shells.push(s);
    }
  });
  obj.userData.hot = h;
  C.hots.push(h);
  return h;
}
export function removeHot(h) {
  if (!h) return;
  for (const s of h.shells) s.parent?.remove(s);
  h.mat.dispose();
  if (h.obj.userData.hot === h) delete h.obj.userData.hot;
  C.hots = C.hots.filter(x => x !== h);
  if (C.hover === h) C.hover = null;
  if (C.holding?.hot === h) cancelHold();
}
export function clearHots() { for (const h of [...C.hots]) removeHot(h); }

export function usable(h) {
  return (!h.opts.enabled || h.opts.enabled()) && h.inReach !== false;
}

function cancelHold() {
  const hd = C.holding;
  if (!hd) return;
  C.holding = null;
  hd.hot.opts.hold.onCancel?.(hd.t);
}

const ndc = new THREE.Vector2();
function updateHover() {
  C.hover = null;
  if (!C.input || C.paused || C.view.mode === 'cut') return;
  const list = C.hots.filter(h => h.obj.visible !== false && isVisible(h.obj));
  if (!list.length) return;
  ndc.set(C.mouse.nx, C.mouse.ny);
  C.ray.setFromCamera(ndc, C.camera);
  const hits = C.ray.intersectObjects(list.map(h => h.obj), true);
  for (const hit of hits) {
    let o = hit.object;
    if (o.userData.shell) continue;
    while (o && !o.userData.hot) o = o.parent;
    if (!o) continue;
    const h = o.userData.hot;
    const reach = h.opts.reach ?? (C.view.mode === 'walk' ? 2.1 : 3);
    h.inReach = hit.distance <= reach;
    // something switched off only blocks the view if it has something to say
    const lk = h.opts.locked ? (typeof h.opts.locked === 'function' ? h.opts.locked() : h.opts.locked) : '';
    if (h.opts.enabled && !h.opts.enabled() && !lk) continue;
    if (!h.inReach && !lk) continue;
    C.hover = h;
    break;
  }
}
function isVisible(o) {
  while (o) { if (!o.visible) return false; o = o.parent; }
  return true;
}

function updateHots(dt) {
  const pulse = 0.5 + 0.5 * Math.sin(C.t * 4);
  for (const h of C.hots) {
    const can = (!h.opts.enabled || h.opts.enabled());
    const g = h.opts.glow ? (can && h.opts.glow()) : false;
    let target = 0;
    if (C.hover === h && can && h.inReach !== false) target = 0.65;
    else if (g) target = 0.1 + 0.22 * pulse;
    h.glowA += (target - h.glowA) * Math.min(1, dt * 10);
    h.mat.uniforms.uA.value = h.glowA;
    for (const s of h.shells) s.visible = h.glowA > 0.01;
  }
  const hd = C.holding;
  if (hd) {
    if (!C.mouse.down || !usable(hd.hot)) { cancelHold(); return; }
    hd.t += dt;
    const ho = hd.hot.opts.hold;
    ho.onTick?.(hd.t, dt);
    if (hd.t >= ho.time) { C.holding = null; ho.onDone?.(); }
  }
}

// ---------------------------------------------------------------- time
const waits = [];
export function wait(sec) {
  return new Promise(res => waits.push({ t: C.t + sec, res }));
}
// Tween over sec of game time, f(k) gets 0..1 (eased if ease given).
export function tween(sec, f, ease = x => x) {
  return new Promise(res => {
    const t0 = C.t;
    const u = () => {
      const k = Math.min(1, (C.t - t0) / sec);
      f(ease(k));
      if (k >= 1) { C.updaters.delete(u); res(); }
    };
    C.updaters.add(u);
    f(ease(0));
  });
}
export const ease = {
  io: k => k * k * (3 - 2 * k),
  out: k => 1 - (1 - k) * (1 - k),
  in: k => k * k,
  back: k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2),
};
export const on = f => (C.updaters.add(f), () => C.updaters.delete(f));

export function shake(a, d = 0.4) { C.fx.shake = Math.max(C.fx.shake, a); C.fx.shakeD = d; }

export function lookingAt(p, deg = 22) {
  C.camera.getWorldDirection(V);
  V2.copy(p).sub(C.camera.position).normalize();
  return V.dot(V2) > Math.cos((deg * Math.PI) / 180);
}

// Turns the camera smoothly to face a world point (used by cutscenes and the
// "dragged back" moments).
export function faceTowards(p, sec = 0.8) {
  const pos = C.camera.position;
  const dx = p.x - pos.x, dy = p.y - pos.y, dz = p.z - pos.z;
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz));
  const v = C.view;
  let y0 = v.ty;
  let target = yaw;
  while (target - y0 > Math.PI) target -= Math.PI * 2;
  while (target - y0 < -Math.PI) target += Math.PI * 2;
  const p0 = v.tp;
  return tween(sec, k => { v.ty = v.yaw = y0 + (target - y0) * k; v.tp = v.pitch = p0 + (pitch - p0) * k; }, ease.io);
}

// ---------------------------------------------------------------- frame
let lastYaw = 0, lastPitch = 0;
function updateCamera(dt) {
  const v = C.view, cam = C.camera;
  if (v.mode === 'cut') return;
  const k = Math.min(1, dt * 14);
  v.yaw += (v.ty - v.yaw) * k;
  v.pitch += (v.tp - v.pitch) * k;
  const sp = Math.hypot(v.yaw - lastYaw, v.pitch - lastPitch) / Math.max(dt, 1e-4);
  C.angSpeed += (sp - C.angSpeed) * Math.min(1, dt * 8);
  lastYaw = v.yaw; lastPitch = v.pitch;
  let px, py, pz, roll = 0;
  if (v.mode === 'seat') {
    const s = C.seat;
    const wantLean = C.input && !C.paused ? (C.keys.q ? -1 : 0) + (C.keys.e ? 1 : 0) : 0;
    const wantCrouch = C.input && !C.paused && (C.keys.c || C.keys.control) ? 1 : 0;
    s.lean += (wantLean - s.lean) * Math.min(1, dt * 6);
    s.crouch += (wantCrouch - s.crouch) * Math.min(1, dt * 6);
    const br = Math.sin(C.t * 1.3) * 0.004;
    px = s.x + s.lean * 0.3;
    py = s.y + br - s.crouch * 0.52;
    pz = s.z + s.crouch * 0.12;
    roll = -s.lean * 0.09;
  } else {
    const w = C.walk;
    px = w.x; py = w.y + Math.sin(w.bob) * 0.025; pz = w.z;
  }
  let sx = 0, sy = 0;
  if (C.fx.shake > 0) {
    const a = C.fx.shake * (meta.settings.reduce ? 0.3 : 1);
    sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a;
    C.fx.shake = Math.max(0, C.fx.shake - dt * (C.fx.shake / (C.fx.shakeD || 0.4)) - dt * 0.02);
  }
  cam.position.set(px + sx * 0.4, py + sy * 0.4, pz);
  cam.rotation.set(0, 0, 0);
  cam.rotation.order = 'YXZ';
  cam.rotation.y = v.yaw + sx * 0.3;
  cam.rotation.x = v.pitch + sy * 0.3;
  cam.rotation.z = roll;
}

export function walkStep(dt) {
  const w = C.walk, v = C.view;
  if (!C.input || C.paused) return 0;
  let fx = 0, fz = 0;
  if (C.keys.w || C.keys.arrowup) fz -= 1;
  if (C.keys.s || C.keys.arrowdown) fz += 1;
  if (C.keys.a || C.keys.arrowleft) fx -= 1;
  if (C.keys.d || C.keys.arrowright) fx += 1;
  const len = Math.hypot(fx, fz);
  if (!len) return 0;
  fx /= len; fz /= len;
  const sn = Math.sin(v.yaw), cs = Math.cos(v.yaw);
  const dx = (fx * cs + fz * sn) * w.speed * dt;
  const dz = (-fx * sn + fz * cs) * w.speed * dt;
  const tryMove = (nx, nz) => {
    for (const c of C.colliders) {
      if (nx > c.x0 - 0.22 && nx < c.x1 + 0.22 && nz > c.z0 - 0.22 && nz < c.z1 + 0.22) return false;
    }
    return true;
  };
  let nx = w.x + dx, nz = w.z + dz;
  if (tryMove(nx, w.z)) w.x = nx;
  if (tryMove(w.x, nz)) w.z = nz;
  // the chain on your ankle
  const ax = w.x - w.anchor.x, az = w.z - w.anchor.y;
  const d = Math.hypot(ax, az);
  w.taut = d / w.radius;
  if (d > w.radius) { w.x = w.anchor.x + (ax / d) * w.radius; w.z = w.anchor.y + (az / d) * w.radius; }
  w.bob += dt * 9;
  return len;
}

export function startLoop(render) {
  let last = performance.now();
  const frame = now => {
    const raw = Math.min(0.05, (now - last) / 1000) * (C.timeScale || 1);
    last = now;
    C.dt = C.paused ? 0 : raw;
    C.rawDt = raw;
    if (!C.paused) {
      C.t += raw;
      for (let i = waits.length - 1; i >= 0; i--) if (waits[i].t <= C.t) { const w = waits.splice(i, 1)[0]; w.res(); }
      for (const f of [...C.updaters]) f(raw, C.t);
    }
    if (C.lookLock > 0) C.lookLock -= raw;
    updateCamera(raw);
    updateHover();
    updateHots(C.paused ? 0 : raw);
    render?.(raw);
    const u = C.post.uniforms, fx = C.fx;
    u.uTime.value = C.t; u.uInsane.value = fx.insane; u.uReduce.value = meta.settings.reduce ? 1 : 0;
    u.uFlash.value = fx.flash; u.uBlack.value = fx.black; u.uVig.value = fx.vig; u.uGrain.value = fx.grain;
    u.uAberr.value = fx.aberr; u.uTint.value.copy(fx.tint); u.uTintAmt.value = fx.tintAmt; u.uFrost.value = fx.frost; u.uRed.value = fx.red;
    fx.flash = Math.max(0, fx.flash - raw * 2.2);
    fx.red = Math.max(0, fx.red - raw * 0.9);
    C.composer.render(raw);
    for (const k in C.pressed) delete C.pressed[k];
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
