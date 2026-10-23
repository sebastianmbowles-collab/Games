import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { G, GFX, isTouch } from './state.js';
import { initAudio } from './audio.js';
export { THREE };

export function initEngine() {
  const canvas = document.getElementById('gl');
  G.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  G.renderer.toneMapping = THREE.NeutralToneMapping;
  G.renderer.toneMappingExposure = 1.1;
  G.renderer.shadowMap.enabled = GFX[G.settings.gfx].shadows;
  G.renderer.shadowMap.type = THREE.PCFShadowMap;
  const pm = new THREE.PMREMGenerator(G.renderer);
  G.envMap = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  G.hud = document.getElementById('hud');
  G.hctx = G.hud.getContext('2d');
  window.addEventListener('resize', resize);
  resize();

  const key = e => (e.key === ' ' ? 'space' : e.key.toLowerCase());
  window.addEventListener('keydown', e => {
    const k = key(e);
    if (!G.keys[k]) G.pressed[k] = true;
    G.keys[k] = true;
    if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k)) e.preventDefault();
    initAudio();
  });
  window.addEventListener('keyup', e => { G.keys[key(e)] = false; });
  window.addEventListener('blur', () => { for (const k in G.keys) G.keys[k] = false; G.mouse.down = false; });

  const m = G.mouse;
  const setM = e => { m.x = e.clientX; m.y = e.clientY; m.nx = (e.clientX / G.w) * 2 - 1; m.ny = 1 - (e.clientY / G.h) * 2; m.moved = true; };
  G.hud.addEventListener('pointermove', e => { if (m.pid === null || e.pointerId === m.pid) setM(e); });
  G.hud.addEventListener('pointerdown', e => {
    setM(e); m.down = true; m.pid = e.pointerId; m.type = e.pointerType;
    G.pressed.click = true; initAudio();
  });
  const up = e => { if (e.pointerId === m.pid) { m.down = false; m.pid = null; } };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  G.hud.addEventListener('contextmenu', e => e.preventDefault());

  for (const b of document.querySelectorAll('#touch .tb')) {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); initAudio();
      G.keys[k] = true; G.pressed[k] = true; b.classList.add('on');
    });
    const off = () => { G.keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  }
}

export function resize() {
  G.w = window.innerWidth; G.h = window.innerHeight;
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  const q = GFX[G.settings.gfx];
  const pr = q.retro ? q.pr : Math.min(G.dpr, q.pr);
  G.renderer.setPixelRatio(pr);
  G.renderer.setSize(G.w, G.h, false);
  G.renderer.domElement.style.imageRendering = q.retro ? 'pixelated' : 'auto';
  for (const c of composers) { c.c.setPixelRatio(pr); c.c.setSize(G.w, G.h); }
  G.hud.width = Math.round(G.w * G.dpr); G.hud.height = Math.round(G.h * G.dpr);
  for (const c of G.cameras) {
    c.aspect = G.w / G.h;
    if (c.userData.baseFov) c.fov = c.userData.baseFov * (c.aspect < 1 ? 1.25 : 1);
    c.updateProjectionMatrix();
  }
}

// One renderer per scene that adds the glow (bloom) on top. Falls back to a plain render when glow is off.
const composers = [];
export function makeComposer(scene, camera, strength = 0.85) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const c = new EffectComposer(G.renderer, rt);
  c.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), strength, 0.4, 0.93);
  c.addPass(bloom);
  c.addPass(new OutputPass());
  const o = { c, bloom, render() { if (GFX[G.settings.gfx].bloom) c.render(); else G.renderer.render(scene, camera); } };
  composers.push(o);
  resize();
  return o;
}
// shadows on/off needs every material rebuilt
export function applyQuality(scenes) {
  G.renderer.shadowMap.enabled = GFX[G.settings.gfx].shadows;
  for (const sc of scenes) sc.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => (m.needsUpdate = true)); });
  resize();
}
// make a whole model cast (and optionally catch) shadows
export function shadows(obj, cast = true, receive = false) {
  obj.traverse(o => { if (o.isMesh && !o.material.transparent && o.material.type !== 'MeshBasicMaterial') { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}

export function showTouch(on) {
  document.getElementById('touch').style.display = on && isTouch ? 'block' : 'none';
}

// Where a 3D point lands on the screen, in CSS pixels. z > 1 means it is behind the camera.
const pv = new THREE.Vector3();
export function toScreen(v, camera) {
  pv.copy(v).project(camera);
  return { x: (pv.x + 1) * 0.5 * G.w, y: (1 - pv.y) * 0.5 * G.h, z: pv.z };
}
