// Renderer, camera, VHS-tape filter and the main loop.
import * as THREE from 'three';

export const C = {
  renderer: null, scene: null, camera: null, w: 1, h: 1, t: 0,
  fx: { fear: 0, glitch: 0, flash: 0, fade: 0, red: 0 },
  mobile: matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent),
};

let rt, postScene, postCam, postMat;

const VHS_FRAG = `
precision highp float;
uniform sampler2D tDiffuse; uniform vec2 res; uniform float time, fear, glitch, flash, fade, red;
varying vec2 vUv;
float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
vec3 samp(vec2 uv){ return texture2D(tDiffuse, uv).rgb; }
void main(){
  vec2 uv = vUv;
  float g = glitch + fear*0.35;
  // tape wobble + tracking band
  float band = smoothstep(0.0,0.04, abs(fract(uv.y*0.7 - time*0.11) - 0.5) - 0.44);
  float wob = sin(uv.y*220.0 + time*9.0)*0.0006 + sin(uv.y*13.0 + time*1.7)*0.0009;
  wob += (1.0-band)*0.004*(0.4+g);
  float jitterLine = step(0.985 - g*0.06, h1(floor(uv.y*90.0) + floor(time*24.0)));
  wob += jitterLine * (h1(floor(time*30.0)+uv.y)-0.5) * 0.03 * (0.2 + g);
  uv.x += wob;
  // colour bleed / chromatic split
  float ca = (1.4 + g*6.0) / res.x;
  vec3 col;
  col.r = samp(uv + vec2(ca,0.0)).r;
  col.g = samp(uv).g;
  col.b = samp(uv - vec2(ca*1.4,0.0)).b;
  col = aces(col*1.75);
  col = pow(col, vec3(1.0/2.2));
  // VHS colour: a little washed out, slightly blue-green
  float lum = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(lum), col, 0.78) * vec3(0.95,1.0,1.04);
  col = mix(col, vec3(lum*1.3,lum*0.25,lum*0.2), red);
  // grain + snow in the tracking band
  float n = h2(vUv*res + fract(time*7.0)*100.0);
  col += (n-0.5)*(0.07 + g*0.12);
  col += (1.0-band)*n*0.12;
  // scanlines
  col *= 0.88 + 0.12*sin(vUv.y*res.y*3.14159);
  // vignette
  vec2 q = vUv-0.5; col *= 1.0 - dot(q,q)*(1.1 + fear*0.9);
  col += vec3(flash);
  col *= 1.0 - fade;
  gl_FragColor = vec4(col,1.0);
}`;

export function initCore(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  r.toneMapping = THREE.NoToneMapping;
  C.renderer = r;
  C.scene = new THREE.Scene();
  C.scene.background = new THREE.Color(0x020304);
  C.scene.fog = new THREE.FogExp2(0x030405, 0.045);
  C.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 48); // things further away are lost in the fog anyway
  C.scene.add(C.camera);
  rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
  postMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, fear: { value: 0 }, glitch: { value: 0 }, flash: { value: 0 }, fade: { value: 0 }, red: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
    fragmentShader: VHS_FRAG, depthTest: false, depthWrite: false,
  });
  postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  addEventListener('resize', resize);
  resize();
}

export function resize() {
  const w = innerWidth, h = innerHeight;
  C.w = w; C.h = h;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  C.renderer.setPixelRatio(1);
  C.renderer.setSize(w, h, false);
  C.renderer.domElement.style.width = w + 'px'; C.renderer.domElement.style.height = h + 'px';
  // render the 3D world a bit smaller than the screen: faster on phones, and it looks more like old tape
  const scale = (C.mobile ? 0.62 : 0.8) * Math.min(dpr, 1.5);
  const rw = Math.max(2, Math.round(w * scale)), rh = Math.max(2, Math.round(h * scale));
  rt.setSize(rw, rh);
  postMat.uniforms.res.value.set(rw, rh);
  C.renderer.setSize(w, h, false);
  C.camera.aspect = w / h;
  C.camera.fov = w < h ? 82 : 72;
  C.camera.updateProjectionMatrix();
}

export function render() {
  const u = postMat.uniforms;
  u.time.value = C.t; u.fear.value = C.fx.fear; u.glitch.value = C.fx.glitch;
  u.flash.value = C.fx.flash; u.fade.value = C.fx.fade; u.red.value = C.fx.red;
  C.renderer.setRenderTarget(rt);
  C.renderer.render(C.scene, C.camera);
  C.renderer.setRenderTarget(null);
  C.renderer.render(postScene, postCam);
}

export function startLoop(update) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    C.t += dt;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
