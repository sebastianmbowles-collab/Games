// ---------- the 3D world: Morrow's Fuel & Mart ----------
// Units are metres. The shop floor runs x -6..6, z -4.5 (front glass) .. 4.5 (back wall). You start behind the counter.
const T = THREE;
let renderer, composer, bloom, scene, camera, station;
const wd = { q: (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) < 820) ? 1 : 0, slow: 0 };                    // handles on everything that changes
const acts = [], blockers = [], cols = [];      // clickable things, things that block clicks, things that block feet
const PL = { x: -0.4, z: 3.5, yaw: 0, pitch: 0, bob: 0 };
const HQ = /hq/.test(location.hash);
const lam = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
const std = (c, rough, metal, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: rough == null ? 0.8 : rough, metalness: metal || 0 }, o || {}));
const bas = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
const HIT = new T.MeshBasicMaterial({ visible: false });
function put(g, x, y, z, parent, block) {
  g.position.set(x, y, z); (parent || station).add(g); if (block) blockers.push(g);
  const m = Array.isArray(g.material) ? g.material[0] : g.material, solid = m && !m.isMeshBasicMaterial && !m.transparent && m !== HIT;
  g.castShadow = !!solid; g.receiveShadow = !!solid; return g;
}
const mt = m => (m && m.isMaterial) || Array.isArray(m) ? m : lam(m);
function box(w, h, d, m, x, y, z, parent, block) { return put(new T.Mesh(new T.BoxGeometry(w, h, d), mt(m)), x, y, z, parent, block); }
function cyl(rt, rb, h, m, x, y, z, parent, seg) { return put(new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 14), mt(m)), x, y, z, parent); }
function sph(r, m, x, y, z, parent) { return put(new T.Mesh(new T.SphereGeometry(r, 16, 12), mt(m)), x, y, z, parent); }
function plane(w, h, m, x, y, z, ry, parent) { const g = new T.Mesh(new T.PlaneGeometry(w, h), m); g.rotation.y = ry || 0; put(g, x, y, z, parent); g.castShadow = false; return g; }
function flat(w, d, m, x, y, z, parent) { const g = new T.Mesh(new T.PlaneGeometry(w, d), m); g.rotation.x = -Math.PI / 2; put(g, x, y, z, parent); g.castShadow = false; return g; }
function ctex(w, h, draw, smooth) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); if (draw) draw(x, w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.userData = { c, x };
  if (smooth) { t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; } else { t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; }
  return t;
}
function speck(c, w, h, n, a) { for (let i = 0; i < n; i++) { c.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
function sign(text, w, h, bg, fg, parent, x, y, z, ry, lit, border) {
  const pw = 320, ph = Math.max(20, Math.round(pw * h / w)), lines = text.split('\n');
  const t = ctex(pw, ph, c => { c.fillStyle = bg; c.fillRect(0, 0, pw, ph); if (border) { c.strokeStyle = fg; c.lineWidth = 5; c.strokeRect(8, 8, pw - 16, ph - 16); } c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; const fs = Math.min(ph / lines.length * 0.74, pw / Math.max(...lines.map(l => l.length)) * 1.5); c.font = 'bold ' + fs + 'px "Courier New", monospace'; lines.forEach((l, i) => c.fillText(l, pw / 2, ph * (i + 0.5) / lines.length + 1)); }, true);
  return plane(w, h, lit ? bas(0xffffff, { map: t }) : lam(0xffffff, { map: t }), x, y, z, ry, parent);
}
function act(mesh, label, fn, range) { mesh.userData.act = { label, fn, range: range || 2.6 }; acts.push(mesh); return mesh; }
function hitbox(w, h, d, x, y, z, parent) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), HIT); m.position.set(x, y, z); (parent || station).add(m); return m; }
function col(x0, x1, z0, z1, on) { cols.push({ x0, x1, z0, z1, on }); }
function panTo(x, z) { const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz) || 1; return clamp((dx * Math.cos(PL.yaw) - dz * Math.sin(PL.yaw)) / d, -1, 1) * 0.85; }

function mkDoor(x, z, ry, color, label, solid) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; station.add(g);
  const fr = std('#23282a', 0.6, 0.2); box(1.1, 0.09, 0.14, fr, 0, 2.13, 0, g); box(0.09, 2.18, 0.14, fr, -0.5, 1.09, 0, g); box(0.09, 2.18, 0.14, fr, 0.5, 1.09, 0, g);
  if (!solid) plane(0.92, 2.08, bas(0x010101), 0, 1.04, -0.02, 0, g);
  const piv = new T.Group(); piv.position.set(-0.455, 0, 0.02); g.add(piv);
  const dm = std(color, 0.75), dk = std(new T.Color(color).multiplyScalar(0.8), 0.8);
  box(0.91, 2.08, 0.05, dm, 0.455, 1.04, 0, piv); box(0.66, 0.72, 0.015, dk, 0.455, 0.62, 0.03, piv); box(0.66, 0.5, 0.015, dk, 0.455, 1.36, 0.03, piv);
  box(0.91, 0.22, 0.012, std('#8a8f88', 0.35, 0.8), 0.455, 0.11, 0.03, piv);
  cyl(0.035, 0.035, 0.03, std('#b9ae8f', 0.3, 0.9), 0.82, 1.02, 0.045, piv).rotation.x = Math.PI / 2; sph(0.04, std('#c9be9f', 0.25, 0.9), 0.82, 1.02, 0.085, piv);
  if (label) sign(label, 0.56, label.includes('\n') ? 0.22 : 0.14, '#d8d3c2', '#262320', piv, 0.455, 1.78, 0.03, 0);
  const glow = [[0, 2.1, 0.98, 0.035], [0, 0.018, 0.98, 0.035], [-0.47, 1.05, 0.035, 2.1], [0.47, 1.05, 0.035, 2.1]].map(([gx, gy, gw, gh]) => { const b = box(gw, gh, 0.02, bas('#ffc21a'), gx, gy, 0.075, g); b.visible = false; return b; });
  return { g, piv, glow, hit: hitbox(0.95, 2.1, 0.3, 0, 1.05, 0.12, g) };
}
// ----- people: built from capsules and spheres so they read as people, not crates -----
function mkFig(look, o) {
  o = o || {}; const L = LOOKS[look] || LOOKS.shade, sil = L.sil, g = new T.Group(), mats = [];
  const M = (c, basic) => { const m = sil || basic ? bas(sil || c) : lam(c || '#333'); mats.push(m); return m; };
  const P3 = (geo, m, x, y, z, par, sx, sy, sz) => { const b = new T.Mesh(geo, m); b.position.set(x, y, z); if (sx) b.scale.set(sx, sy, sz); b.castShadow = !sil && !o.ghost; (par || g).add(b); return b; };
  const coat = M(L.coat), legs = M(L.legs || '#1b1d22'), skin = M(L.skin || '#ccc'), shoe = M('#14110f');
  const piv = (x, y) => { const p = new T.Group(); p.position.set(x, y, 0); g.add(p); return p; };
  const legL = piv(-0.095, 0.86), legR = piv(0.095, 0.86), armL = piv(-0.275, 1.4), armR = piv(0.275, 1.4);
  [legL, legR].forEach(l => { P3(new T.CylinderGeometry(0.082, 0.062, 0.8, 10), legs, 0, -0.4, 0, l); P3(new T.BoxGeometry(0.12, 0.075, 0.25), shoe, 0, -0.825, 0.045, l); });
  P3(new T.CapsuleGeometry(0.17, 0.3, 4, 14), coat, 0, 1.15, 0, g, 1.18, 1, 0.74);
  P3(new T.CylinderGeometry(0.17, 0.185, 0.2, 14), coat, 0, 0.9, 0, g, 1.1, 1, 0.74);
  if (L.long) P3(new T.CylinderGeometry(0.2, 0.27, 0.56, 14), coat, 0, 0.6, 0, g, 1, 1, 0.74);
  [armL, armR].forEach(a => { P3(new T.CapsuleGeometry(0.055, 0.44, 4, 10), coat, 0, -0.27, 0, a); P3(new T.SphereGeometry(0.052, 10, 8), skin, 0, -0.58, 0, a); });
  P3(new T.CylinderGeometry(0.05, 0.06, 0.1, 10), skin, 0, 1.46, 0);
  const pale = o.pale ? (() => { const m = bas('#b9b3a4'); mats.push(m); return m; })() : null, headM = pale || (L.face === 'void' && !sil ? M('#020202', true) : skin);
  const hy = 1.6; P3(new T.SphereGeometry(0.115, 18, 14), headM, 0, hy, 0, g, 1, 1.15, 1.05);
  if (L.hood) { const hm = sil ? coat : (() => { const m = lam(L.coat, { side: T.DoubleSide }); mats.push(m); return m; })(); P3(new T.SphereGeometry(0.158, 18, 14, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6), hm, 0, hy + 0.012, -0.01, g, 1, 1.16, 1.12); }
  if (L.hair && !sil) { const h = P3(new T.SphereGeometry(0.121, 16, 10, 0, 6.3, 0, 1.75), M(L.hair), 0, hy + 0.004, -0.004, g, 1, 1.15, 1.06); h.rotation.x = -0.32; }
  if (L.hat && !sil) { const hm = M(L.hat); P3(new T.SphereGeometry(0.124, 16, 8, 0, 6.3, 0, 1.4), hm, 0, hy + 0.012, 0, g, 1, 1.12, 1.06); P3(new T.CylinderGeometry(0.085, 0.085, 0.012, 14), hm, 0, hy + 0.05, 0.13, g, 1, 1, 0.9); }
  let smileMesh = null;
  if (!sil && !o.pale) {
    const ink = M('#14100e', true);
    if (L.face === 'normal' || L.face === 'hallow') {
      const er = L.face === 'hallow' ? 0.014 : 0.011; P3(new T.SphereGeometry(er, 8, 6), ink, -0.04, hy + 0.018, 0.108); P3(new T.SphereGeometry(er, 8, 6), ink, 0.04, hy + 0.018, 0.108);
      P3(new T.BoxGeometry(0.034, 0.006, 0.01), ink, -0.04, hy + 0.043, 0.108); P3(new T.BoxGeometry(0.034, 0.006, 0.01), ink, 0.04, hy + 0.043, 0.108);
      P3(new T.BoxGeometry(0.018, 0.04, 0.024), skin, 0, hy - 0.008, 0.118);
      P3(new T.BoxGeometry(L.face === 'hallow' ? 0.076 : 0.042, 0.007, 0.01), M('#6a3028', true), 0, hy - 0.052, 0.107);
    }
    smileMesh = P3(new T.TorusGeometry(L.face === 'void' ? 0.052 : 0.044, 0.0055, 5, 14, Math.PI), M('#eeeadb', true), 0, hy - (L.face === 'void' ? 0.005 : 0.03), L.face === 'void' ? 0.1 : 0.106); smileMesh.rotation.z = Math.PI; smileMesh.visible = false;
  }
  if (L.tie && !sil) { P3(new T.BoxGeometry(0.14, 0.11, 0.012), M('#d8d8d2'), 0, 1.36, 0.125); P3(new T.BoxGeometry(0.045, 0.34, 0.014), M(L.tie), 0, 1.22, 0.13); }
  if (L.clip && !sil) { P3(new T.BoxGeometry(0.2, 0.27, 0.02), M('#b9b08f'), 0, -0.5, 0.09, armL); P3(new T.BoxGeometry(0.16, 0.2, 0.004), M('#efece2'), 0, -0.51, 0.103, armL); }
  if (sil && o.eyes) { const e = bas('#f1f1dd'); mats.push(e); P3(new T.SphereGeometry(0.012, 8, 6), e, -0.04, hy + 0.018, 0.108); P3(new T.SphereGeometry(0.012, 8, 6), e, 0.04, hy + 0.018, 0.108); }
  if (o.pale) { const d = bas('#020202'); P3(new T.SphereGeometry(0.03, 10, 8), d, -0.043, hy + 0.02, 0.092, g, 1, 1.3, 0.5); P3(new T.SphereGeometry(0.03, 10, 8), d, 0.043, hy + 0.02, 0.092, g, 1, 1.3, 0.5); P3(new T.BoxGeometry(0.075, 0.009, 0.01), bas('#2a0f0d'), 0, hy - 0.06, 0.105); }
  if (o.scale) g.scale.setScalar(o.scale);
  if (o.ghost) mats.forEach(m => { m.transparent = true; m.depthWrite = false; });
  g.userData = { legL, legR, armL, armR, mats, smileMesh, L, look, ghost: !!o.ghost };
  station.add(g); return g;
}
function figAlpha(g, a) { const tr = g.userData.ghost || a < 0.999; for (const m of g.userData.mats) { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = a; } }
function figPose(g, walk, wave) { const u = g.userData, s = walk ? Math.sin(walk) * 0.5 : 0; u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.6; u.armR.rotation.x = wave != null ? 0 : s * 0.6; u.armR.rotation.z = wave != null ? 2.6 + Math.sin(wave) * 0.35 : 0; }
function mkItem(it, parent, x, y, z) {
  const g = new T.Group(); g.position.set(x, y, z); parent.add(g); const k = it.k, c = it.c;
  if (k === 'bottle') { cyl(0.034, 0.036, 0.19, std('#a9d8ec', 0.15, 0, { transparent: true, opacity: 0.8 }), 0, 0.095, 0, g); cyl(0.036, 0.036, 0.07, lam('#2c5fa8'), 0, 0.1, 0, g); cyl(0.016, 0.03, 0.04, lam('#a9d8ec'), 0, 0.21, 0, g); cyl(0.017, 0.017, 0.022, lam('#f1f5f6'), 0, 0.24, 0, g); }
  else if (k === 'can') { cyl(0.033, 0.033, 0.125, std(c || '#8a2a2a', 0.3, 0.6), 0, 0.0625, 0, g); cyl(0.03, 0.033, 0.01, std('#c9c9c9', 0.3, 0.9), 0, 0.13, 0, g); }
  else if (k === 'bag') { box(0.17, 0.2, 0.06, std(c || '#c98a1e', 0.4), 0, 0.1, 0, g); box(0.17, 0.035, 0.062, lam('#efe9d6'), 0, 0.17, 0, g); }
  else if (k === 'cup') { cyl(0.045, 0.034, 0.12, lam('#efe9d6'), 0, 0.06, 0, g); cyl(0.048, 0.048, 0.014, lam('#3a2a1e'), 0, 0.125, 0, g); cyl(0.046, 0.04, 0.045, lam('#7d2b24'), 0, 0.06, 0, g); }
  else if (k === 'paper') { box(0.22, 0.012, 0.15, lam('#e6dfca'), 0, 0.006, 0, g); box(0.18, 0.002, 0.02, lam('#55504a'), 0, 0.013, -0.04, g); }
  else if (k === 'jar') { cyl(0.055, 0.055, 0.14, std('#cfe0d6', 0.1, 0, { transparent: true, opacity: 0.45 }), 0, 0.07, 0, g); cyl(0.057, 0.057, 0.025, std('#7d6a2a', 0.4, 0.7), 0, 0.15, 0, g); for (let i = 0; i < 9; i++) box(0.016, 0.02, 0.014, lam('#f3eedd'), -0.025 + (i % 3) * 0.025, 0.015 + (i / 3 | 0) * 0.024, hsh(i) * 0.03 - 0.015, g); }
  else if (k === 'photo') { box(0.17, 0.006, 0.13, lam('#d8cdb0'), 0, 0.003, 0, g); box(0.14, 0.002, 0.1, std('#2a2f34', 0.2), 0, 0.007, 0, g); }
  else if (k === 'clock') { const f = cyl(0.09, 0.09, 0.04, lam('#f1eee4'), 0, 0.095, 0, g, 20); f.rotation.x = Math.PI / 2; const r0 = cyl(0.097, 0.097, 0.035, std('#2a2a26', 0.4, 0.5), 0, 0.095, -0.004, g, 20); r0.rotation.x = Math.PI / 2; }
  else if (k === 'key') { box(0.09, 0.008, 0.014, std('#c9a63a', 0.3, 0.9), 0.02, 0.004, 0, g); cyl(0.022, 0.022, 0.008, std('#c9a63a', 0.3, 0.9), -0.04, 0.004, 0, g); box(0.07, 0.003, 0.045, lam('#efe9d6'), -0.09, 0.002, 0.03, g); }
  else { box(0.1, 0.12, 0.06, std(c || '#55606a', 0.5), 0, 0.06, 0, g); box(0.1, 0.03, 0.062, lam('#efe9d6'), 0, 0.09, 0, g); }
  return g;
}

function buildWorld() {
  renderer = new T.WebGLRenderer({ canvas: $('gl'), antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  scene = new T.Scene(); scene.background = new T.Color(0x020306); scene.fog = new T.FogExp2(0x03050a, 0.014);
  camera = new T.PerspectiveCamera(66, 16 / 9, 0.06, 400); camera.rotation.order = 'YXZ';
  const rt = new T.WebGLRenderTarget(960, 540, { samples: 4, type: T.HalfFloatType });
  composer = new EffectComposer(renderer, rt); composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new T.Vector2(480, 270), 0.3, 0.6, 0.9); composer.addPass(bloom); composer.addPass(new OutputPass());
  station = new T.Group(); scene.add(station);
  wd.hemi = new T.HemisphereLight(0x93a48f, 0x2c2c24, 0.4); scene.add(wd.hemi);
  wd.moon = new T.DirectionalLight(0x6f86b4, 0.5); wd.moon.position.set(-30, 40, -40); scene.add(wd.moon);
  // --- sky ---
  const skyT = ctex(1024, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#01020a'); g.addColorStop(0.42, '#060b18'); g.addColorStop(0.5, '#0c1422'); g.addColorStop(1, '#020305'); c.fillStyle = g; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { const y = Math.random() * h * 0.48, a = 0.2 + Math.random() * 0.8; c.fillStyle = `rgba(${210 + Math.random() * 45 | 0},${215 + Math.random() * 40 | 0},255,${a * (1 - y / h * 1.6)})`; const s = Math.random() < 0.06 ? 2 : 1; c.fillRect(Math.random() * w, y, s, s); } }, true);
  wd.sky = new T.Mesh(new T.SphereGeometry(300, 32, 16), bas(0xffffff, { map: skyT, side: T.BackSide, fog: false, depthWrite: false })); scene.add(wd.sky);
  const dawnT = ctex(8, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1f2f55'); g.addColorStop(0.36, '#6d7fa6'); g.addColorStop(0.47, '#f0a06a'); g.addColorStop(0.52, '#ffd9a0'); g.addColorStop(0.56, '#5a4a48'); g.addColorStop(1, '#2a2628'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, true);
  wd.dawn = new T.Mesh(new T.SphereGeometry(295, 24, 12), bas(0xffffff, { map: dawnT, side: T.BackSide, fog: false, transparent: true, opacity: 0, depthWrite: false })); scene.add(wd.dawn);
  const moonT = ctex(64, 64, c => { const g = c.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(240,244,255,1)'); g.addColorStop(0.32, 'rgba(225,232,250,.95)'); g.addColorStop(0.4, 'rgba(160,180,230,.25)'); g.addColorStop(1, 'rgba(120,150,220,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, true);
  wd.moonS = new T.Sprite(new T.SpriteMaterial({ map: moonT, fog: false, transparent: true, depthWrite: false })); wd.moonS.scale.set(34, 34, 1); wd.moonS.position.set(70, 95, -210); scene.add(wd.moonS);
  // --- ground, road, forest (these stay even if the station does not) ---
  const gt = ctex(256, 256, (c, w, h) => { c.fillStyle = '#151a16'; c.fillRect(0, 0, w, h); speck(c, w, h, 5000, 0.07); }, true); gt.repeat.set(60, 60);
  const gnd = new T.Mesh(new T.PlaneGeometry(500, 500), lam(0xffffff, { map: gt })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.03; gnd.receiveShadow = true; scene.add(gnd);
  const rdT = ctex(256, 256, (c, w, h) => { c.fillStyle = '#26282b'; c.fillRect(0, 0, w, h); speck(c, w, h, 7000, 0.06); c.fillStyle = '#b9a94a'; c.fillRect(40, 122, 110, 8); c.fillStyle = '#9a9a92'; c.fillRect(0, 8, w, 5); c.fillRect(0, 243, w, 5); }, true); rdT.repeat.set(50, 1);
  const road = new T.Mesh(new T.PlaneGeometry(500, 8), std(0xffffff, 0.55, 0, { map: rdT })); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.01, -22); scene.add(road);
  const treeM = lam('#060b0a'), trunkM = lam('#0a0806');
  const tree = (x, z, h) => { const g = new T.Group(); g.position.set(x, 0, z); const t0 = new T.Mesh(new T.CylinderGeometry(0.25, 0.35, h * 0.3, 6), trunkM); t0.position.y = h * 0.15; g.add(t0); for (let k = 0; k < 3; k++) { const c = new T.Mesh(new T.ConeGeometry((2.6 - k * 0.6) * (h / 10), h * 0.42, 7), treeM); c.position.y = h * (0.36 + k * 0.22); c.rotation.y = hsh(x + k) * 6; g.add(c); } scene.add(g); };
  for (let i = 0; i < 90; i++) { const a = i / 90 * 6.283, rr = 34 + hsh(i) * 22, x = Math.cos(a) * rr * 1.6, z = Math.sin(a) * rr - 6; if (z > -29 && z < 13 && Math.abs(x) < 32) continue; tree(x, z, 8 + hsh(i + 9) * 9); }
  for (let i = 0; i < 70; i++) tree(-140 + i * 4 + hsh(i) * 2.5, -31 - hsh(i + 40) * 12, 9 + hsh(i + 200) * 9);
  // your car
  wd.car = new T.Group(); wd.car.position.set(9.5, 0, -8); scene.add(wd.car);
  const carM = std('#1b2a33', 0.35, 0.5); box(3.9, 0.55, 1.7, carM, 0, 0.62, 0, wd.car); box(2.1, 0.55, 1.55, carM, -0.15, 1.17, 0, wd.car); box(2.0, 0.42, 1.57, std('#0b1014', 0.1, 0.6), -0.15, 1.19, 0, wd.car);
  [[-1.25, 0.86], [1.25, 0.86], [-1.25, -0.86], [1.25, -0.86]].forEach(([x, z]) => { const w0 = cyl(0.33, 0.33, 0.22, std('#0b0b0b', 0.9), x, 0.33, z, wd.car, 16); w0.rotation.x = Math.PI / 2; });
  box(0.05, 0.14, 0.3, bas('#3a1010'), 1.96, 0.72, 0.6, wd.car); box(0.05, 0.14, 0.3, bas('#3a1010'), 1.96, 0.72, -0.6, wd.car);
  wd.truck = new T.Group(); box(7, 2.8, 2.5, bas('#050607'), 1.2, 1.9, 0, wd.truck); box(2, 2.2, 2.4, bas('#07090a'), -3.4, 1.5, 0, wd.truck); [0.85, -0.85].forEach(z => box(0.12, 0.26, 0.4, bas('#fff3c2'), -4.42, 1.0, z, wd.truck)); wd.truckL = new T.PointLight(0xfff0c0, 0, 40, 1.4); wd.truckL.position.set(-7, 1.4, 0); wd.truck.add(wd.truckL); wd.truck.position.z = -22; wd.truck.visible = false; scene.add(wd.truck);

  // --- textures for the shop ---
  const floorT = ctex(512, 512, (c, w, h) => { for (let i = 0; i < 4; i++) { c.fillStyle = (i % 3 === 0) ? '#a7a593' : '#97957f'; c.fillRect((i % 2) * 256, (i / 2 | 0) * 256, 256, 256); } speck(c, w, h, 16000, 0.05); for (let i = 0; i < 46; i++) { c.strokeStyle = `rgba(30,28,22,${0.04 + Math.random() * 0.07})`; c.lineWidth = 1 + Math.random() * 3; c.beginPath(); const x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 120, y + (Math.random() - 0.5) * 120); c.stroke(); } c.fillStyle = '#55544a'; [0, 256].forEach(v => { c.fillRect(v - 1, 0, 3, h); c.fillRect(0, v - 1, w, 3); }); }, true); floorT.repeat.set(6.2, 4.7);
  const wallT = ctex(256, 512, (c, w, h) => { c.fillStyle = '#7b8870'; c.fillRect(0, 0, w, h); c.fillStyle = '#58634f'; c.fillRect(0, 340, w, 172); c.fillStyle = '#3d4638'; c.fillRect(0, 336, w, 7); c.fillStyle = '#23271f'; c.fillRect(0, 492, w, 20); speck(c, w, h, 5000, 0.035); for (let i = 0; i < 26; i++) { const x = Math.random() * w, l = 40 + Math.random() * 220; const g = c.createLinearGradient(0, 0, 0, l); g.addColorStop(0, 'rgba(40,40,25,.10)'); g.addColorStop(1, 'rgba(40,40,25,0)'); c.fillStyle = g; c.fillRect(x, Math.random() * 120, 2 + Math.random() * 7, l); } const g2 = c.createLinearGradient(0, 400, 0, h); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.28)'); c.fillStyle = g2; c.fillRect(0, 400, w, 112); }, true);
  const ceilT = ctex(256, 256, (c, w, h) => { c.fillStyle = '#8e9488'; c.fillRect(0, 0, w, h); speck(c, w, h, 5000, 0.07); c.fillStyle = '#5c6058'; [0, 128].forEach(v => { c.fillRect(v, 0, 3, h); c.fillRect(0, v, w, 3); }); c.fillStyle = 'rgba(60,50,20,.16)'; c.beginPath(); c.ellipse(190, 60, 34, 22, 0.4, 0, 6.3); c.fill(); }, true); ceilT.repeat.set(5.2, 3.9);
  const wallM = len => { const t = wallT.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(len / 2.2)), 1); return lam(0xffffff, { map: t }); };
  const WALL = lam('#7b8870'), LOW = lam('#58634f'), DARK = std('#22272a', 0.55, 0.3), OUTW = lam('#2a302e');
  const wall = (x0, x1, z0, z1, y0, y1, m) => box(x1 - x0, y1 - y0, z1 - z0, m || (y0 === 0 && y1 === 3 ? wallM(Math.max(x1 - x0, z1 - z0)) : (y1 <= 1 ? LOW : WALL)), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, station, true);
  flat(12.4, 9.4, std(0xffffff, 0.46, 0.0, { map: floorT }), 0, 0, 0);
  const ce = new T.Mesh(new T.PlaneGeometry(12.4, 9.4), lam(0xffffff, { map: ceilT })); ce.rotation.x = Math.PI / 2; put(ce, 0, 3, 0); ce.castShadow = false;
  box(13, 0.5, 10, OUTW, 0, 3.27, 0);
  wall(-6.2, 6.2, 4.5, 4.7, 0, 3); wall(-6.2, -6, -4.5, 4.5, 0, 3);
  wall(6, 6.2, -4.5, 3.0, 0, 3); wall(6, 6.2, 3.9, 5.2, 0, 3); wall(6, 6.2, 3.0, 3.9, 2.1, 3);
  [[-6.2, -5.5], [-0.9, -0.6], [0.6, 0.9], [5.5, 6.2]].forEach(([a, b]) => wall(a, b, -4.7, -4.5, 0, 3, WALL));
  const glassT = ctex(256, 128, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 5; i++) { const g = c.createLinearGradient(i * 60, 0, i * 60 + 70, h); g.addColorStop(0, 'rgba(210,235,215,0)'); g.addColorStop(0.5, 'rgba(210,235,215,.035)'); g.addColorStop(1, 'rgba(210,235,215,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(i * 60, h); c.lineTo(i * 60 + 40, 0); c.lineTo(i * 60 + 62, 0); c.lineTo(i * 60 + 22, h); c.fill(); } }, true);
  [[-5.5, -0.9], [0.9, 5.5]].forEach(([a, b]) => { wall(a, b, -4.7, -4.5, 0, 0.8); wall(a, b, -4.7, -4.5, 2.5, 3); box(b - a, 0.05, 0.3, std('#c9cbc4', 0.4, 0.4), (a + b) / 2, 0.82, -4.58); [a + 0.03, (a + b) / 2, b - 0.03].forEach(x => box(0.07, 1.7, 0.1, DARK, x, 1.65, -4.6)); box(b - a, 0.06, 0.1, DARK, (a + b) / 2, 2.47, -4.6); plane(b - a, 1.7, bas(0xffffff, { map: glassT, transparent: true, depthWrite: false }), (a + b) / 2, 1.65, -4.57, 0); });
  wall(-0.6, 0.6, -4.7, -4.5, 2.2, 3, WALL);
  [[-6.2, 6.2, 4.5, 4.7], [-6.2, -6, -4.7, 4.7], [-6.2, 6.2, -4.7, -4.5], [6, 6.2, -4.7, 3.0], [6, 6.2, 3.9, 5.2]].forEach(c => col(...c));
  col(6, 6.2, 3.0, 3.9, () => !G.staffOpen);
  // front door
  wd.fdoor = new T.Group(); wd.fdoor.position.set(-0.6, 0, -4.6); station.add(wd.fdoor);
  [[0.6, 2.15, 1.2, 0.1], [0.6, 0.06, 1.2, 0.12], [0.04, 1.1, 0.08, 2.2], [1.16, 1.1, 0.08, 2.2]].forEach(([x, y, w, h]) => box(w, h, 0.06, DARK, x, y, 0, wd.fdoor));
  box(1.06, 0.045, 0.045, lam('#9a9d96'), 0.6, 1.05, 0.07, wd.fdoor); box(0.04, 0.045, 0.08, lam('#9a9d96'), 0.12, 1.05, 0.04, wd.fdoor); box(0.04, 0.045, 0.08, lam('#9a9d96'), 1.08, 1.05, 0.04, wd.fdoor);
  plane(1.1, 2.1, bas(0xffffff, { map: glassT, transparent: true, depthWrite: false }), 0.6, 1.1, 0, 0, wd.fdoor);
  sign('OPEN', 0.3, 0.12, '#7d2b24', '#f1ecd8', wd.fdoor, 0.6, 1.98, 0.035, 0); sign('OPEN', 0.3, 0.12, '#7d2b24', '#f1ecd8', wd.fdoor, 0.6, 1.98, -0.035, Math.PI);
  act(hitbox(1.2, 2.2, 0.3, 0, 1.1, -4.5), 'Front door', () => frontDoor(), 2.4);
  flat(1.6, 1.0, lam('#1d1f1e'), 0, 0.006, -3.9); box(0.24, 0.3, 0.04, bas('#b8ffb0'), 0, 2.36, -4.47); sign('EXIT', 0.22, 0.1, '#0c2a10', '#b8ffb0', station, 0, 2.36, -4.445, 0, true);
  // wall clock above the door
  const ck = cyl(0.25, 0.25, 0.05, std('#22272a', 0.4, 0.4), 0, 2.68, -4.47, station, 24); ck.rotation.x = Math.PI / 2; const cf = cyl(0.22, 0.22, 0.052, lam('#efe9d6'), 0, 2.68, -4.468, station, 24); cf.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; box(0.012, 0.035, 0.004, bas('#1a1714'), Math.sin(a) * 0.19, 2.68 + Math.cos(a) * 0.19, -4.44).rotation.z = -a; }
  wd.hMin = new T.Group(); wd.hHr = new T.Group(); [wd.hMin, wd.hHr].forEach((g, i) => { g.position.set(0, 2.68, -4.435 + i * 0.002); station.add(g); box(i ? 0.022 : 0.014, i ? 0.12 : 0.18, 0.004, bas('#1a1714'), 0, i ? 0.06 : 0.09, 0, g); });
  // --- ceiling lights: tube fittings, fill lights, and three lamps that cast real shadows ---
  wd.tubes = []; wd.lights = []; wd.spots = [];
  [[-3, -2.4], [3, -2.4], [-3, 1.2], [3, 1.2], [0, 3.3], [0, -0.6]].forEach(([x, z], i) => { const m = bas('#f2ffe2'); box(1.9, 0.07, 0.34, std('#c9cbc4', 0.5, 0.3), x, 2.965, z); box(1.7, 0.035, 0.07, m, x, 2.915, z - 0.08); box(1.7, 0.035, 0.07, m, x, 2.915, z + 0.08); wd.tubes.push(m); const l = new T.PointLight(0xe9f8da, 1, 13, 1.5); l.position.set(x, 2.55, z); station.add(l); wd.lights.push(l); });
  [[-3, -1.2], [3, -1.2], [0, 2.4]].forEach(([x, z]) => { const s = new T.SpotLight(0xe9f8da, 1, 12, 1.15, 0.7, 1.2); s.position.set(x, 2.95, z); s.target.position.set(x, 0, z); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0015; s.shadow.camera.near = 0.3; s.shadow.camera.far = 6; station.add(s); station.add(s.target); wd.spots.push(s); });
  // --- the counter ---
  const woodT = ctex(256, 128, (c, w, h) => { c.fillStyle = '#4a372a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '20,12,8' : '120,90,60'},${0.05 + Math.random() * 0.08})`; c.fillRect(0, Math.random() * h, w, 1 + Math.random() * 2); } c.fillStyle = '#2a1d15'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 3, h); c.fillRect(0, 0, w, 4); c.fillRect(0, h - 10, w, 10); }, true); woodT.repeat.set(4, 1);
  const topT = ctex(128, 128, (c, w, h) => { c.fillStyle = '#6d6558'; c.fillRect(0, 0, w, h); speck(c, w, h, 2600, 0.1); }, true); topT.repeat.set(8, 1.2);
  box(5.2, 1.0, 0.7, lam(0xffffff, { map: woodT }), 0, 0.5, 2.25, station, true); box(5.44, 0.06, 0.86, std(0xffffff, 0.3, 0.05, { map: topT }), 0, 1.03, 2.25, station, true); box(5.44, 0.025, 0.02, std('#c9cbc4', 0.3, 0.8), 0, 1.03, 1.815); col(-2.72, 2.72, 1.82, 2.68);
  box(5.0, 0.1, 0.06, std('#191512', 0.9), 0, 0.05, 1.9);
  flat(4.6, 1.1, lam('#1c1d1b'), 0, 0.006, 3.35);
  // register
  const reg = new T.Group(); reg.position.set(-1.7, 1.06, 2.25); station.add(reg);
  box(0.5, 0.14, 0.44, std('#3b4042', 0.5, 0.2), 0, 0.07, 0, reg); const kb = box(0.44, 0.03, 0.2, std('#55595b', 0.6), 0, 0.165, 0.1, reg); kb.rotation.x = 0.25; for (let i = 0; i < 15; i++) { const k0 = box(0.05, 0.02, 0.036, lam(i % 5 === 4 ? '#7d2b24' : '#d8d3c2'), -0.16 + (i % 5) * 0.08, 0.19 - (i / 5 | 0) * 0.011, 0.045 + (i / 5 | 0) * 0.048, reg); k0.rotation.x = 0.25; }
  box(0.34, 0.22, 0.05, std('#2a2e30', 0.5, 0.2), 0, 0.3, -0.12, reg).rotation.x = -0.2; box(0.06, 0.12, 0.06, std('#2a2e30', 0.5), 0, 0.17, -0.14, reg);
  wd.regT = ctex(128, 64); wd.regShown = null; const rs = plane(0.3, 0.17, bas(0xffffff, { map: wd.regT }), 0, 0.305, -0.09, 0, reg); rs.rotation.x = -0.2;
  box(0.12, 0.05, 0.2, std('#22272a', 0.5), 0.36, 0.025, 0.06, reg);
  act(hitbox(0.56, 0.5, 0.5, -1.7, 1.3, 2.27), 'Cash register', () => pay());
  wd.receipt = box(0.085, 0.2, 0.004, bas('#f6f3ea'), -1.34, 1.16, 2.38); wd.receipt.rotation.x = -0.35; act(wd.receipt, 'Receipt', () => readReceipt());
  const pt = ctex(160, 224, (c, w, h) => { c.fillStyle = '#ece5d0'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a3630'; c.fillRect(34, 14, 92, 5); c.fillStyle = '#6a6455'; for (let i = 0; i < 22; i++) c.fillRect(16, 34 + i * 7, 128 - (i * 37 % 46), 2); c.fillStyle = '#1d2a52'; for (let i = 0; i < 3; i++) c.fillRect(20, 196 + i * 8, 90 - i * 22, 3); }, true);
  wd.paper = new T.Mesh(new T.PlaneGeometry(0.3, 0.42), lam(0xffffff, { map: pt })); wd.paper.rotation.x = -Math.PI / 2; wd.paper.rotation.z = 0.12; put(wd.paper, -0.75, 1.066, 2.36); wd.paper.castShadow = false; act(wd.paper, 'The rules', () => openRules());
  wd.binder = box(0.36, 0.05, 0.28, std('#4a3428', 0.6), -2.3, 1.085, 2.3); box(0.2, 0.004, 0.08, lam('#efe9d6'), 0, 0.028, 0, wd.binder); act(wd.binder, 'Employee records', () => readBinder());
  wd.clip = box(0.26, 0.02, 0.36, lam('#b9b08f'), -1.12, 1.07, 2.34); box(0.22, 0.004, 0.3, bas('#dfe8d2'), 0, 0.013, 0.01, wd.clip); box(0.1, 0.02, 0.03, std('#8a8f88', 0.3, 0.9), 0, 0.02, -0.16, wd.clip); act(wd.clip, 'A clipboard and a pen', () => clipboardMenu());
  // telephone
  wd.phone = new T.Group(); wd.phone.position.set(1.9, 1.06, 2.3); station.add(wd.phone); const phM = std('#c4b896', 0.45);
  box(0.3, 0.07, 0.24, phM, 0, 0.035, 0, wd.phone); const pf = box(0.3, 0.02, 0.2, phM, 0, 0.085, 0.01, wd.phone); pf.rotation.x = 0.18; cyl(0.062, 0.062, 0.012, lam('#efe9d6'), 0, 0.1, 0.035, wd.phone, 16).rotation.x = 0.18;
  box(0.34, 0.045, 0.07, std('#b3a784', 0.4), 0, 0.15, -0.07, wd.phone); cyl(0.045, 0.04, 0.06, std('#b3a784', 0.4), -0.15, 0.12, -0.07, wd.phone); cyl(0.045, 0.04, 0.06, std('#b3a784', 0.4), 0.15, 0.12, -0.07, wd.phone);
  act(hitbox(0.42, 0.28, 0.32, 1.9, 1.18, 2.3), 'Telephone', () => answerPhone());
  box(0.16, 0.2, 0.02, lam('#d8d1bc'), 2.0, 1.0, 4.49); box(0.06, 0.06, 0.03, std('#3a3a34', 0.6), 2.0, 1.0, 4.47); act(hitbox(0.36, 0.4, 0.2, 2.0, 1.0, 4.42), () => G.phone.plugged ? 'Phone cord (pull it out)' : 'Phone cord (plug it back in)', () => togglePlug());
  wd.cord = null; wd.cordState = null; wd.cordM = std('#1a1714', 0.7);
  wd.items = new T.Group(); station.add(wd.items); wd.itemSig = '';
  // small things on the counter
  const rack = new T.Group(); rack.position.set(2.35, 1.06, 2.05); station.add(rack); box(0.34, 0.03, 0.2, std('#22272a', 0.5), 0, 0.015, 0, rack); for (let i = 0; i < 10; i++) box(0.05, 0.085, 0.022, lam(['#c9a63a', '#7d2b24', '#2c5fa8', '#4f8f5a'][i % 4]), -0.13 + (i % 5) * 0.065, 0.075, -0.04 + (i / 5 | 0) * 0.08, rack).rotation.x = -0.2;
  cyl(0.045, 0.045, 0.1, std('#7d2b24', 0.4, 0.4), -2.45, 1.11, 2.05, station, 14);
  // --- back wall: monitors, cigarette shelf, light switch ---
  const crt = std('#1b1e1d', 0.55, 0.1); box(2.5, 0.07, 0.5, std('#3a3f3c', 0.6), -0.9, 1.02, 4.25, station, true); blockers.push(hitbox(2.4, 1.5, 0.4, -0.9, 1.8, 4.3)); box(0.07, 1.02, 0.07, crt, -2.05, 0.51, 4.3); box(0.07, 1.02, 0.07, crt, 0.25, 0.51, 4.3);
  wd.mon = [];
  for (let i = 0; i < 4; i++) { const sx = -0.9 + (i % 2 ? -0.58 : 0.58), sy = i < 2 ? 2.14 : 1.44, t = ctex(240, 135), lt = ctex(64, 16); box(1.12, 0.66, 0.42, crt, sx, sy, 4.28); box(1.16, 0.7, 0.05, std('#2b302d', 0.5), sx, sy, 4.06); const scr = plane(1.0, 0.54, bas(0xb8c8bc, { map: t }), sx, sy + 0.02, 4.03, Math.PI); plane(0.3, 0.075, bas(0xffffff, { map: lt }), sx, sy - 0.305, 4.03, Math.PI); box(0.02, 0.02, 0.01, bas(i === 3 ? '#501010' : '#30ff50'), sx + 0.5, sy - 0.305, 4.03); act(scr, 'Look closer at this monitor', () => watchCam(i), 3.2); wd.mon.push({ t, lt, shown: null }); }
  wd.monT = 0; wd.monL = new T.PointLight(0x9fd8b0, 0.5, 4.5, 1.5); wd.monL.position.set(-0.9, 1.7, 3.5); station.add(wd.monL);
  box(0.16, 0.24, 0.02, lam('#e4decb'), -2.9, 1.3, 4.49); wd.sw = box(0.045, 0.08, 0.03, lam('#9a927f'), -2.9, 1.34, 4.475); sign('LIGHTS', 0.3, 0.09, '#e4decb', '#262320', station, -2.9, 1.1, 4.495, Math.PI);
  act(hitbox(0.36, 0.5, 0.2, -2.9, 1.28, 4.42), 'Light switch', () => lightSwitch());
  box(2.4, 1.3, 0.22, std('#2a2e2c', 0.7), 4.0, 1.85, 4.39); for (let r0 = 0; r0 < 4; r0++) { box(2.3, 0.02, 0.2, std('#c9cbc4', 0.5, 0.4), 4.0, 1.3 + r0 * 0.3, 4.36); for (let i = 0; i < 17; i++) if (hsh(r0 * 40 + i) > 0.14) box(0.1, 0.17, 0.05, lam(['#7d2b24', '#efe9d6', '#2c5fa8', '#c9a63a', '#1d1f1e', '#4f8f5a'][(hsh(r0 * 9 + (i / 3 | 0)) * 6) | 0]), 2.93 + i * 0.134, 1.4 + r0 * 0.3, 4.3); }
  sign('NO ID\nNO SALE', 0.5, 0.26, '#efe9d6', '#7d2b24', station, 4.0, 2.72, 4.49, Math.PI, false, true);
  // --- shelving units, stocked ---
  const metal = std('#c5c8c0', 0.45, 0.35), plinth = std('#2a2e2c', 0.7), labelT = ctex(64, 64, c => { c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#9a9a9a'; c.fillRect(0, 20, 64, 22); c.fillStyle = '#444'; c.fillRect(8, 26, 48, 3); c.fillRect(14, 33, 36, 2); }, true);
  const pal = ['#a83232', '#d19a22', '#2f66b3', '#4f9a5c', '#e2ddc9', '#8a4f8a', '#c9612e', '#2a8a8a', '#d4c23a', '#5a3a2a'].map(c => new T.Color(c));
  const dummy = new T.Object3D(), unit = new T.BoxGeometry(1, 1, 1);
  wd.gond = [[-3, -0.6], [3, -0.6], [-3, -2.6], [3, -2.6]].map(([x, z], gi) => {
    const g = new T.Group(); g.position.set(x, 0, z); station.add(g);
    box(2.8, 0.12, 0.8, plinth, 0, 0.06, 0, g); box(2.76, 1.42, 0.03, std('#aeb1a8', 0.8), 0, 0.83, 0, g); box(0.035, 1.5, 0.8, metal, -1.4, 0.87, 0, g); box(0.035, 1.5, 0.8, metal, 1.4, 0.87, 0, g); box(2.84, 0.03, 0.84, plinth, 0, 1.63, 0, g);
    const ys = [0.13, 0.5, 0.87, 1.24]; ys.forEach(y => { box(2.76, 0.022, 0.8, metal, 0, y, 0, g); [0.405, -0.405].forEach(zz => box(2.76, 0.04, 0.008, lam('#efe9d6'), 0, y - 0.005, zz, g)); });
    const inst = []; let seed = gi * 1000;
    [1, -1].forEach(side => ys.forEach((y, li) => { let px = -1.33; while (px < 1.3) { const w = 0.07 + hsh(seed++) * 0.1, h = 0.12 + hsh(seed++) * (li === 3 ? 0.22 : 0.2), n = 2 + (hsh(seed++) * 4 | 0), c = pal[(hsh(seed++) * pal.length) | 0], gap = hsh(seed++) < 0.1; for (let k = 0; k < n && px + w < 1.34; k++) { if (!gap) for (let row = 0; row < 2; row++) inst.push([px + w / 2, y + 0.011 + h / 2, side * (0.33 - row * 0.15), w * 0.92, h, 0.13, c]); px += w + 0.006; } px += 0.02; } }));
    const im = new T.InstancedMesh(unit, lam(0xffffff, { map: labelT }), inst.length); inst.forEach((v, i) => { dummy.position.set(v[0], v[1], v[2]); dummy.scale.set(v[3], v[4], v[5]); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, v[6]); }); im.receiveShadow = true; im.castShadow = false; g.add(im);
    blockers.push(hitbox(2.8, 1.65, 0.8, x, 0.82, z)); col(x - 1.42, x + 1.42, z - 0.4, z + 0.4);
    sign('AISLE ' + (gi + 1), 0.7, 0.2, '#22272a', '#efe9d6', station, x, 2.55, z, 0, false, true); sign('AISLE ' + (gi + 1), 0.7, 0.2, '#22272a', '#efe9d6', station, x, 2.55, z - 0.01, Math.PI, false, true); box(0.01, 0.35, 0.01, DARK, x - 0.3, 2.82, z); box(0.01, 0.35, 0.01, DARK, x + 0.3, 2.82, z);
    return im;
  });
  // --- left wall: the refrigerators, and three doors (one of which should not be there) ---
  wd.fridgeBack = bas('#cfeee6'); plane(2.4, 1.92, wd.fridgeBack, -5.97, 1.12, -2.4, Math.PI / 2);
  const fm = std('#2b3033', 0.4, 0.5); box(0.64, 0.16, 2.56, fm, -5.7, 0.08, -2.4); box(0.66, 0.32, 2.56, fm, -5.7, 2.24, -2.4); [-3.66, -1.14].forEach(z => box(0.64, 2.0, 0.06, fm, -5.7, 1.1, z)); [-3.62, -2.4, -1.18].forEach(z => box(0.06, 1.92, 0.07, fm, -5.4, 1.12, z)); [0.19, 2.06].forEach(y => box(0.06, 0.06, 2.5, fm, -5.4, y, -2.4));
  [-2.52, -2.28].forEach(z => box(0.03, 0.5, 0.03, std('#c9cbc4', 0.25, 0.9), -5.36, 1.15, z));
  for (let s = 0; s < 3; s++) { box(0.5, 0.015, 2.4, std('#dfe7e4', 0.4, 0.5), -5.72, 1.455 - s * 0.5, -2.4); box(0.012, 0.03, 2.4, lam('#efe9d6'), -5.47, 1.445 - s * 0.5, -2.4); }
  plane(2.4, 1.92, bas(0xffffff, { map: glassT, transparent: true, depthWrite: false }), -5.385, 1.12, -2.4, Math.PI / 2);
  sign('COLD DRINKS', 2.2, 0.22, '#12343a', '#cfeee6', station, -5.36, 2.24, -2.4, Math.PI / 2, true);
  wd.fridgeL = new T.PointLight(0xbfece2, 0.7, 5.5, 1.5); wd.fridgeL.position.set(-5.0, 1.3, -2.4); station.add(wd.fridgeL);
  col(-6, -5.38, -3.7, -1.1);
  wd.bottles = new T.Group(); station.add(wd.bottles); wd.bottleSig = null;
  const crate = box(0.52, 0.3, 0.4, std('#2c5fa8', 0.6), -5.6, 0.15, -0.7); box(0.46, 0.02, 0.34, std('#1d3f70', 0.7), 0, 0.14, 0, crate); for (let i = 0; i < 8; i++) { cyl(0.034, 0.034, 0.16, std('#a9d8ec', 0.15, 0, { transparent: true, opacity: 0.8 }), -0.17 + (i % 4) * 0.113, 0.2, -0.08 + (i / 4 | 0) * 0.16, crate, 10); cyl(0.017, 0.017, 0.03, lam('#f1f5f6'), -0.17 + (i % 4) * 0.113, 0.3, -0.08 + (i / 4 | 0) * 0.16, crate, 8); }
  act(hitbox(0.6, 0.6, 0.5, -5.6, 0.3, -0.7), 'Restock crate (put one bottle in the fridge)', () => restock(), 3); col(-5.9, -5.33, -0.92, -0.48);
  const wf = new T.Group(); wf.position.set(-4.5, 0, -3.6); wf.rotation.y = 0.5; station.add(wf); [0.16, -0.16].forEach(s => { const b = box(0.3, 0.62, 0.012, lam('#e3b616'), 0, 0.3, s * 0.6, wf); b.rotation.x = s * 1.1; });
  wd.dStore = mkDoor(-5.98, 0.35, Math.PI / 2, '#5a5648', 'STORAGE'); act(wd.dStore.hit, 'Storage cupboard', () => cap('Mops. Bleach. A box of bulbs for lights that never get changed.'));
  wd.dNew = mkDoor(-5.98, 1.7, Math.PI / 2, '#47423f', 'EMPLOYEES\nONLY'); act(wd.dNew.hit, 'A door that was not here yesterday', () => newDoorMenu());
  wd.dWC = mkDoor(-5.98, 3.45, Math.PI / 2, '#525749', 'STAFF WC'); act(wd.dWC.hit, 'Staff toilet', () => toiletDoor());
  wd.doorL = new T.PointLight(0xffc21a, 0, 5, 1.6); wd.doorL.position.set(-5.4, 1.2, 1.7); station.add(wd.doorL);
  // --- right wall: coffee corner, noticeboard, posters, staff room ---
  box(0.7, 0.9, 2.2, lam(0xffffff, { map: woodT }), 5.62, 0.45, -2.6, station, true); box(0.74, 0.05, 2.26, std(0xffffff, 0.3, 0.05, { map: topT }), 5.62, 0.925, -2.6); col(5.25, 6, -3.72, -1.48);
  box(0.4, 0.55, 0.42, std('#22272a', 0.4, 0.4), 5.7, 1.225, -3.1); box(0.3, 0.14, 0.02, bas('#30120e'), 5.49, 1.38, -3.1).rotation.y = Math.PI / 2; box(0.02, 0.03, 0.03, bas('#ff4a2a'), 5.49, 1.2, -2.96); cyl(0.07, 0.06, 0.16, std('#1a1a1a', 0.2, 0.2, { transparent: true, opacity: 0.7 }), 5.52, 1.03, -3.1, station, 12);
  for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) cyl(0.042, 0.032, 0.03, lam('#efe9d6'), 5.6, 0.965 + k * 0.022, -2.4 + i * 0.13, station, 10);
  box(0.3, 0.2, 0.4, std('#8a8f88', 0.4, 0.6), 5.7, 1.05, -1.85);
  sign('HOT COFFEE\n99c', 0.9, 0.5, '#7d2b24', '#f6e7b0', station, 5.985, 2.0, -2.6, -Math.PI / 2, false, true);
  box(0.05, 0.96, 1.36, std('#5a4630', 0.8), 5.975, 1.6, 0.6); plane(1.24, 0.84, lam('#8a6a44'), 5.945, 1.6, 0.6, -Math.PI / 2);
  sign('EMPLOYEE\nOF THE MONTH', 0.6, 0.2, '#e9dfc4', '#33291c', station, 5.94, 1.3, 0.75, -Math.PI / 2); plane(0.4, 0.42, lam('#3a3d3b'), 5.94, 1.72, 0.75, -Math.PI / 2); plane(0.3, 0.4, lam('#efe9d6'), 5.94, 1.7, 0.22, -Math.PI / 2); plane(0.26, 0.2, lam('#e3b616'), 5.94, 1.36, 0.2, -Math.PI / 2);
  act(hitbox(0.2, 0.96, 1.36, 5.9, 1.6, 0.6), 'Noticeboard', () => cap('EMPLOYEE OF THE MONTH. The photograph is a grey square. It has been a grey square for a long time.'));
  sign('SMILE!\nYOU ARE ON\nCAMERA', 0.7, 0.6, '#e3b616', '#1d1f1e', station, 5.985, 1.8, 2.0, -Math.PI / 2, false, true);
  sign('LOTTO\nIT COULD BE YOU', 0.8, 0.42, '#2c5fa8', '#f6e7b0', station, -5.985, 2.0, -0.64, Math.PI / 2, false, true);
  [[-5.4, -4.0], [5.4, 4.0], [5.4, -4.0]].forEach(([x, z]) => { cyl(0.05, 0.07, 0.08, crt, x, 2.95, z, station, 10); const d = sph(0.1, std('#111', 0.15, 0.4), x, 2.88, z); d.scale.y = 0.8; box(0.012, 0.012, 0.012, bas('#ff2a1a'), x, 2.8, z); });
  cyl(0.2, 0.17, 0.62, std('#3a3f3c', 0.5, 0.3), 1.5, 0.31, -4.1, station, 14); col(1.3, 1.7, -4.3, -3.9);
  wd.dStaff = mkDoor(6.02, 3.45, -Math.PI / 2, '#575c50', 'STAFF', true); act(wd.dStaff.hit, 'Staff room', () => { if (!G.staffOpen) cap('Locked. You were never given a key to the staff room.'); });
  // staff room (x 6.2..9, z 2..5)
  const sfT = ctex(128, 128, (c, w, h) => { c.fillStyle = '#5a5c4e'; c.fillRect(0, 0, w, h); speck(c, w, h, 2400, 0.08); }, true); sfT.repeat.set(4, 4);
  flat(3, 3.4, lam(0xffffff, { map: sfT }), 7.6, 0.001, 3.5); const sc = new T.Mesh(new T.PlaneGeometry(3, 3.4), lam('#3a3f38')); sc.rotation.x = Math.PI / 2; put(sc, 7.6, 2.7, 3.5); sc.castShadow = false;
  const SW = () => wallM(3); wall(9, 9.2, 1.8, 5.2, 0, 3, SW()); wall(6, 9.2, 1.8, 2, 0, 3, SW()); wall(6.2, 9.2, 5, 5.2, 0, 3, SW());
  col(9, 9.2, 1.8, 5.2); col(6, 9.2, 1.8, 2); col(6.2, 9.2, 5, 5.2);
  wd.staffL = new T.PointLight(0xffe6a8, 0.9, 6, 1.5); wd.staffL.position.set(7.6, 2.1, 3.5); station.add(wd.staffL); wd.bulb = bas('#fff0c0'); sph(0.05, wd.bulb, 7.6, 2.3, 3.5); box(0.008, 0.4, 0.008, DARK, 7.6, 2.52, 3.5);
  wd.lockN = [];
  ['J. PIKE', 'R. ALDER', '', 'T. VOSS'].forEach((n, i) => { const lx = 6.75 + i * 0.56, lm = std(i === 2 ? '#5f7074' : '#56656a', 0.5, 0.4); box(0.53, 1.9, 0.5, lm, lx, 0.95, 4.74, station, true); box(0.5, 1.84, 0.012, std('#617378', 0.45, 0.4), lx, 0.95, 4.487); for (let k = 0; k < 5; k++) box(0.3, 0.012, 0.01, std('#39474a', 0.6), lx, 1.62 - k * 0.035, 4.478); box(0.03, 0.1, 0.03, std('#c9cbc4', 0.3, 0.9), lx + 0.18, 1.0, 4.47); const t = ctex(128, 32, null, true); plane(0.34, 0.085, lam(0xffffff, { map: t }), lx, 1.32, 4.478, Math.PI); wd.lockN.push({ t, n }); act(hitbox(0.52, 1.9, 0.2, lx, 0.95, 4.5), i === 2 ? 'A locker with your name on it' : 'Locker', i === 2 ? () => readLocker() : () => cap('Padlocked. The name is embossed on old tape.')); });
  col(6.45, 8.75, 4.45, 5);
  box(0.05, 1.04, 1.84, std('#5a4630', 0.8), 8.975, 1.6, 3.2); plane(1.74, 0.94, lam('#8a6a44'), 8.945, 1.6, 3.2, -Math.PI / 2); plane(0.42, 0.32, lam('#efe9d6'), 8.94, 1.78, 2.6, -Math.PI / 2); plane(0.3, 0.3, lam('#e3b616'), 8.94, 1.38, 3.78, -Math.PI / 2); sign('ROTA\n- - - -\n- - - -', 0.4, 0.4, '#efe9d6', '#55504a', station, 8.94, 1.75, 3.82, -Math.PI / 2);
  const phT = ctex(240, 176, (c, w, h) => { c.fillStyle = '#efe8d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#8f8262'; c.fillRect(12, 12, 216, 136); c.fillStyle = '#5d5239'; c.fillRect(120, 40, 100, 60); c.fillStyle = '#4c432f'; c.fillRect(24, 32, 196, 8); c.fillStyle = '#3a3324'; for (let i = 0; i < 6; i++) { c.fillRect(32 + i * 32, 84, 14, 52); c.beginPath(); c.arc(39 + i * 32, 76, 8, 0, 6.3); c.fill(); } c.fillStyle = '#a52d24'; c.beginPath(); c.arc(120, 6, 6, 0, 6.3); c.fill(); }, true);
  act(plane(0.6, 0.44, lam(0xffffff, { map: phT }), 8.94, 1.6, 3.2, -Math.PI / 2), 'A dusty photograph', () => { setZoom('photo'); cap('Six people standing outside the petrol station. You recognise one of them.', 6); }, 3);
  box(0.8, 0.05, 1.4, lam(0xffffff, { map: woodT }), 7.4, 0.75, 2.6); [[7.1, 2.1], [7.7, 2.1], [7.1, 3.1], [7.7, 3.1]].forEach(([x, z]) => box(0.05, 0.75, 0.05, std('#8a8f88', 0.4, 0.8), x, 0.375, z)); col(7.0, 7.8, 2.0, 3.25);
  mkItem({ k: 'cup' }, station, 7.3, 0.775, 2.5); mkItem({ k: 'paper' }, station, 7.5, 0.775, 2.85);
  // --- forecourt ---
  const conT = ctex(256, 256, (c, w, h) => { c.fillStyle = '#4a4e4c'; c.fillRect(0, 0, w, h); speck(c, w, h, 9000, 0.06); for (let i = 0; i < 9; i++) { const g = c.createRadialGradient(0, 0, 2, 0, 0, 30); g.addColorStop(0, 'rgba(10,10,12,.5)'); g.addColorStop(1, 'rgba(10,10,12,0)'); c.save(); c.translate(Math.random() * w, Math.random() * h); c.scale(1 + Math.random(), 0.6 + Math.random()); c.fillStyle = g; c.fillRect(-30, -30, 60, 60); c.restore(); } c.fillStyle = '#343735'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h); }, true); conT.repeat.set(5, 4);
  flat(18, 13, std(0xffffff, 0.5, 0, { map: conT }), 0, 0.003, -10.6);
  wd.canopyM = bas('#e4f4d4'); box(11.4, 0.5, 6.4, std('#e9e6da', 0.6), 0, 4.3, -10); box(11.5, 0.24, 6.5, std('#7d2b24', 0.5), 0, 4.3, -10);
  [[-2.6, -8.6], [2.6, -8.6], [-2.6, -11.4], [2.6, -11.4]].forEach(([x, z]) => box(1.4, 0.03, 0.4, wd.canopyM, x, 4.04, z));
  [[-5, -7.5], [5, -7.5], [-5, -12.5], [5, -12.5]].forEach(([x, z]) => { box(0.32, 4.1, 0.32, std('#d8d5c8', 0.6), x, 2.05, z); box(0.5, 0.8, 0.5, std('#7d2b24', 0.6), x, 0.4, z); });
  [-2.2, 2.2].forEach((x, i) => { const g = new T.Group(); g.position.set(x, 0, -10); station.add(g); box(1.9, 0.16, 1.0, std('#8a8d86', 0.8), 0, 0.08, 0, g); box(0.62, 1.55, 0.46, std('#7d2b24', 0.45, 0.2), 0, 0.93, 0, g); box(0.64, 0.3, 0.48, std('#e9e6da', 0.5), 0, 1.72, 0, g); [0.235, -0.235].forEach(z => { box(0.44, 0.26, 0.01, bas('#0e1a12'), 0, 1.32, z, g); box(0.36, 0.06, 0.012, bas('#7dff9a'), 0, 1.36, z * 1.01, g); box(0.36, 0.06, 0.012, bas('#7dff9a'), 0, 1.27, z * 1.01, g); }); box(0.06, 0.34, 0.1, std('#111', 0.5), 0.34, 0.95, 0.1, g); sign(String(i + 1), 0.3, 0.2, '#e9e6da', '#7d2b24', g, 0, 1.72, 0.245, 0); sign(String(i + 1), 0.3, 0.2, '#e9e6da', '#7d2b24', g, 0, 1.72, -0.245, Math.PI); [-0.8, 0.8].forEach(bx => cyl(0.06, 0.06, 0.8, std('#e3b616', 0.5), bx, 0.5, 0, g, 10)); });
  wd.canL = [-2.6, 2.6].map(x => { const l = new T.PointLight(0xe4f4d4, 1, 34, 1.3); l.position.set(x, 3.6, -9.8); station.add(l); return l; });
  const poolT = ctex(128, 128, c => { const g = c.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(225,245,210,.5)'); g.addColorStop(1, 'rgba(225,245,210,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }, true);
  wd.pools = [[-2.6, -8.6], [2.6, -8.6], [-2.6, -11.4], [2.6, -11.4]].map(([x, z]) => flat(5.5, 5.5, bas(0xffffff, { map: poolT, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.35 }), x, 0.012, z));
  box(12.9, 0.7, 0.3, std('#7d2b24', 0.5), 0, 3.35, -4.78); wd.fascia = sign("MORROW'S FUEL & MART", 8.4, 0.5, '#7d2b24', '#f6eed6', station, 0, 3.35, -4.94, Math.PI, true);
  box(12.9, 3.0, 0.1, OUTW, 0, 1.5, 5.3); box(0.2, 3.0, 9.9, OUTW, -6.32, 1.5, 0.3); box(0.2, 3.0, 7.6, OUTW, 6.32, 1.5, -0.9); box(3.4, 0.3, 3.8, OUTW, 7.7, 2.86, 3.5); box(3.3, 3.0, 0.1, OUTW, 7.7, 1.5, 5.28); box(0.1, 3.0, 3.6, OUTW, 9.27, 1.5, 3.5); box(3.3, 3.0, 0.1, OUTW, 7.7, 1.5, 1.72);
  [[-6.3, -4.82], [6.3, -4.82]].forEach(([x, z]) => box(0.35, 3.3, 0.35, std('#d8d5c8', 0.6), x, 1.65, z));
  box(0.34, 8, 0.34, std('#d8d5c8', 0.6), -10, 4, -15.5); box(3.6, 1.5, 0.36, std('#7d2b24', 0.5), -10, 7.2, -15.5); [[-15.69, Math.PI], [-15.31, 0]].forEach(([z, ry]) => { sign("MORROW'S", 3.3, 0.9, '#7d2b24', '#f6eed6', station, -10, 7.3, z, ry, true); sign('UNLEADED  1.19\nDIESEL    1.24', 3.0, 1.2, '#0c0f0e', '#ffb02a', station, -10, 5.5, z, ry, true); }); box(3.2, 1.4, 0.3, std('#16191a', 0.5), -10, 5.5, -15.5);
  // --- figures that are not customers ---
  wd.figs = {}; wd.out = []; wd.flick = [];
  wd.refl = mkFig('you', { ghost: true });
  wd.behind = mkFig('shade', { pale: true, scale: 1.28 }); wd.behind.visible = false;
  wd.extFig = null; wd.extLook = null;
  wd.clerk = mkFig('teen'); wd.clerk.position.set(-0.4, 0, 3.3); wd.clerk.rotation.y = Math.PI; wd.clerk.visible = false;
  wd.doorShade = mkFig('shade', { eyes: true }); wd.doorShade.position.set(0, 0, -5.3); wd.doorShade.visible = false;
  wd.resize = h => { const lim = [720, 540, 400][wd.q], hh = Math.max(240, Math.min(lim, Math.round(h))), ww = Math.round(hh * 16 / 9); if (wd.rh === hh) return; wd.rh = hh; renderer.setSize(ww, hh, false); composer.setSize(ww, hh); };
  wd.resize(540);
}
const OUT_AT = { pump: [2.2, -8.7], window: [3, -5.25], door: [0, -5.4] };
const FIG3 = [[-1.2, -1.6], [1.3, -3.4], [0.2, 0.6], [-4.8, -1.6], [4.7, 0.4], [2.2, 1.3], [-3.6, 2.9]];
const cTmp = new T.Color(), cA = new T.Color(), cB = new T.Color();
function setCord(plugged) {
  if (wd.cord) { station.remove(wd.cord); wd.cord.geometry.dispose(); }
  const pts = plugged ? [[1.9, 1.09, 2.42], [1.93, 0.95, 2.72], [1.96, 0.45, 3.3], [2.0, 0.5, 4.2], [2.0, 1.0, 4.46]] : [[1.9, 1.09, 2.42], [1.93, 0.9, 2.7], [1.9, 0.05, 3.2], [1.7, 0.03, 3.7], [1.45, 0.03, 3.95]];
  wd.cord = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p))), 24, 0.008, 5), wd.cordM); station.add(wd.cord);
}
function worldSync(dt) {
  const play = G.scene === 'play', e = G.ext || {};
  // ---- adapt to slow machines: fewer pixels first, then no glow, then no shadows ----
  if (!HQ && play && G.started && !G.modal && document.visibilityState === 'visible') { wd.slow = wd.slow * 0.8 + dt * 0.2; wd.n = (wd.n || 0) + 1; if (wd.n >= 12) { wd.n = 0; if (wd.slow > 0.042 && wd.q < 2) { wd.q++; wd.slow = 0.02; wd.rh = 0; fit(); if (wd.q === 2) wd.spots.forEach(sp => { sp.castShadow = false; }); } } }
  // ---- light ----
  let on = 1;
  if (play) {
    let dark = 0.1;
    if (!G.lights || !G.power) dark = 0.97;
    else if (G.flick > 0) { if (P.reduce) dark = 0.5 + 0.3 * Math.sin(G.time * 3); else { const k = hsh(Math.floor(G.time * 13)); dark = k < 0.42 ? 0.96 : (k < 0.58 ? 0.55 : 0.1); } }
    G.dark = dark; on = 1 - dark;
  } else on = e.lit === 0 ? 0.02 : 1;
  const strikes = play && R ? Math.min(R.strikes, 5) : 0, sick = 1 - strikes * 0.07, dawn = play ? 0 : (e.dawn || 0);
  wd.lights.forEach((l, i) => { l.intensity = 1.5 * on * sick * (i === 4 ? 0.8 : 1); });
  wd.spots.forEach(s => { s.intensity = on < 0.1 ? 0 : 9 * on * sick; });
  cTmp.setRGB(0.05 + 1.1 * on, 0.06 + 1.2 * on, 0.05 + 1.0 * on); wd.tubes.forEach(m => m.color.copy(cTmp));
  wd.hemi.intensity = 0.06 + 0.3 * on + dawn * 1.4; wd.moon.intensity = 0.35 + dawn * 1.6;
  const power = play ? (G.power && !G.finaleDark) : e.lit !== 0;
  wd.canL.forEach(l => { l.intensity = power ? 18 : 0; }); wd.canopyM.color.setScalar(power ? 1.25 : 0.03); wd.pools.forEach(p => { p.visible = power; });
  const fpow = play ? G.power : e.lit !== 0; wd.fridgeBack.color.set(fpow ? '#cfeee6' : '#070a0a'); wd.fridgeL.intensity = fpow ? 1.6 : 0; wd.staffL.intensity = fpow ? 3 : 0; wd.bulb.color.set(fpow ? '#fff0c0' : '#1a1814'); wd.monL.intensity = 1.2 + Math.sin(G.time * 9) * 0.15;
  wd.doorL.intensity = play && G.doorGlow ? 1.2 + Math.sin(G.time * 2) * 0.3 : 0;
  wd.dawn.material.opacity = dawn; wd.sky.material.color.setScalar(1 - dawn * 0.8); wd.moonS.material.opacity = 1 - dawn;
  cA.set(0x03050a); cB.setRGB(0.62, 0.5, 0.45); scene.fog.color.copy(cA).lerp(cB, dawn); scene.fog.density = 0.014 - dawn * 0.007;
  renderer.toneMappingExposure = 0.92 + dawn * 0.2;
  station.visible = play || (e.station == null ? true : (e.station >= 1 ? true : e.station > 0 && Math.random() < e.station)); wd.car.visible = play || e.car !== 0;
  // ---- camera ----
  if (play) { const sh = G.shock > 0.4 && !P.reduce ? G.shock * 0.03 : 0; camera.position.set(PL.x + rnd(-sh, sh), 1.62 + Math.sin(PL.bob) * 0.022 + rnd(-sh, sh), PL.z); camera.rotation.set(PL.pitch, PL.yaw, Math.sin(PL.bob * 0.5) * 0.004); }
  else { const a = G.time * 0.03; camera.position.set(-9.5 + Math.sin(a) * 2.5, 1.6 + Math.sin(a * 0.7) * 0.2, -19 + Math.cos(a) * 1.2); camera.lookAt(0.5, 2.5, -6); }
  // ---- extras for title cards ----
  wd.clerk.visible = !play && !!e.clerk;
  if (!play && e.fig) { if (wd.extLook !== e.fig.look) { if (wd.extFig) station.remove(wd.extFig); wd.extFig = mkFig(e.fig.look); wd.extLook = e.fig.look; wd.extZ = -13; } wd.extZ = Math.min(-5.4, wd.extZ + dt * 0.45); const away = e.fig.look === 'hallow'; wd.extFig.visible = true; wd.extFig.position.set(away ? -2 - (wd.extZ + 13) * 0.6 : -1.2, 0, away ? -6 - (wd.extZ + 13) * 1.2 : wd.extZ); wd.extFig.rotation.y = away ? Math.PI * 1.15 : 0; figPose(wd.extFig, wd.extZ < -5.5 ? G.time * 7 : 0); }
  else if (wd.extFig) { wd.extFig.visible = false; wd.extLook = null; station.remove(wd.extFig); wd.extFig = null; }
  // ---- per-night furniture ----
  wd.dNew.g.visible = !play || !!G.newDoor; wd.dNew.piv.rotation.y = play && G.doorAjar > 0 ? 0.28 : 0; wd.dNew.glow.forEach(b => { b.visible = play && !!G.doorGlow; });
  wd.dWC.piv.rotation.y = play && G.toiletOpen ? 1.25 : 0; wd.dWC.g.position.x = -5.98 + (play && G.knockAnim > 0 ? Math.sin(G.time * 70) * 0.012 : 0);
  wd.dStaff.piv.rotation.y = play && G.staffOpen ? 1.45 : 0;
  if (play) {
    const sw = G.doorSwing > 0 ? Math.sin(Math.min(1, G.doorSwing) * Math.PI) : 0; wd.fdoor.rotation.y = sw * 1.2;
    wd.paper.visible = !G.paperGone; wd.receipt.visible = !!G.receipt; wd.binder.visible = !!G.binder; wd.clip.visible = !!G.clipboard; wd.sw.position.y = G.lights ? 1.34 : 1.26;
    wd.phone.position.x = 1.9 + (G.phone.shake > 0 ? Math.sin(G.time * 70) * 0.008 : 0);
    if (wd.cordState !== G.phone.plugged) { wd.cordState = G.phone.plugged; setCord(G.phone.plugged); }
    if (wd.regShown !== G.total) { wd.regShown = G.total; const c = wd.regT.userData.x; c.fillStyle = '#0b170e'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#7dff9a'; c.font = 'bold 30px "Courier New", monospace'; c.textAlign = 'right'; c.fillText('$' + G.total.toFixed(2), 120, 42); wd.regT.needsUpdate = true; }
    const ct = (G.clockStop ? G.stopT : G.t) + 180; wd.hMin.rotation.z = -(ct % 60) / 60 * 6.283; wd.hHr.rotation.z = -(ct / 60 % 12) / 12 * 6.283;
    wd.gond[0].visible = !G.emptyShelf;
    // bottles in the fridge
    const sig = G.fridge.map(b => b.s + ':' + b.x.toFixed(3) + (b.odd ? 'o' : '')).join('|');
    if (sig !== wd.bottleSig) {
      wd.bottleSig = sig; for (const m of wd.bottles.children.slice()) { wd.bottles.remove(m); const k = acts.indexOf(m.userData.hb); if (k >= 0) acts.splice(k, 1); }
      G.fridge.forEach(b => { const g = mkItem({ k: 'bottle' }, wd.bottles, -5.66, 1.463 - b.s * 0.5, -3.5 + b.x * 2.2); if (b.odd) { g.children[1].position.y = 0.075; g.rotation.y = Math.PI; } const hb = hitbox(0.11, 0.3, 0.11, 0, 0.13, 0, g); g.userData.hb = hb; act(hb, 'Take this bottle out', () => { const k = G.fridge.indexOf(b); if (k >= 0) takeBottle(k); }, 2.2); });
    }
    // what the customer has put on the counter
    const cp = G.counter && G.counter.st === 'counter' ? G.counter : null, isig = cp ? cp.id + ':' + cp.items.map(i => i.done ? 1 : 0).join('') : '';
    if (isig !== wd.itemSig) {
      wd.itemSig = isig; for (const m of wd.items.children.slice()) { wd.items.remove(m); const k = acts.indexOf(m.userData.hb); if (k >= 0) acts.splice(k, 1); }
      if (cp) cp.items.forEach((it, i) => { if (it.done) return; const g = mkItem(it, wd.items, -0.1 + i * 0.4, 1.062, 2.06), hb = hitbox(0.3, 0.34, 0.3, 0, 0.14, 0, g); g.userData.hb = hb; act(hb, it.n + ' (scan it)', () => scanItem(cp, it), 2.4); });
    }
    // monitors refresh a few times a second
    wd.monT -= dt; if (wd.monT <= 0) {
      wd.monT = 0.16; const keep = cx;
      wd.mon.forEach((m, i) => { cx = m.t.userData.x; feed(screenFeed(i), 0, 0, 240, 135, false); m.t.needsUpdate = true; if (m.shown !== G.camLabels[i]) { m.shown = G.camLabels[i]; const c = m.lt.userData.x; c.fillStyle = '#d8d3c2'; c.fillRect(0, 0, 64, 16); c.fillStyle = '#262320'; c.font = 'bold 13px "Courier New", monospace'; c.textAlign = 'center'; c.fillText('CAM ' + m.shown, 32, 12); m.lt.needsUpdate = true; } });
      cx = keep;
    }
    wd.lockN.forEach((l, i) => { const n = i === 2 ? R.name : l.n; if (l.drawn !== n) { l.drawn = n; const c = l.t.userData.x; c.fillStyle = i === 2 ? '#e2d48a' : '#d8d3c2'; c.fillRect(0, 0, 128, 32); c.fillStyle = '#262320'; c.font = 'bold ' + (n.length > 9 ? 15 : 21) + 'px "Courier New", monospace'; c.textAlign = 'center'; c.fillText(n, 64, 23); l.t.needsUpdate = true; } });
  }
  // ---- people ----
  const live = {};
  if (play) for (const p of G.people) {
    live[p.id] = 1; let f = wd.figs[p.id];
    if (!f) { f = wd.figs[p.id] = mkFig(p.look); const hb = hitbox(0.6, 1.8, 0.5, 0, 0.9, 0, f); act(hb, () => p.label || 'Customer', () => clickPerson(p), 9); f.userData.hb = hb; f.rotation.y = p.yaw || 0; }
    f.position.set(p.x, 0, p.z); let dy = (p.yaw || 0) - f.rotation.y; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; f.rotation.y += dy * Math.min(1, dt * 6);
    figAlpha(f, clamp(p.alpha, 0, 1)); f.visible = p.alpha > 0.01; figPose(f, p.moving ? G.time * 8 + p.id : 0);
    if (p.smile && f.userData.smileMesh) f.userData.smileMesh.visible = true;
  }
  for (const id in wd.figs) if (!live[id]) { const f = wd.figs[id], k = acts.indexOf(f.userData.hb); if (k >= 0) acts.splice(k, 1); station.remove(f); delete wd.figs[id]; }
  // people on the forecourt
  const outs = play ? G.outside.slice() : []; if (play && G.wave && G.wave.who === 'out') outs.push({ look: G.wave.look, wave: true, xz: [2.8, -7.0] });
  while (wd.out.length > outs.length) station.remove(wd.out.pop().f);
  outs.forEach((o, i) => { let s = wd.out[i]; if (!s || s.look !== o.look) { if (s) station.remove(s.f); s = wd.out[i] = { look: o.look, f: mkFig(o.look) }; } const xz = o.xz || OUT_AT[o.at] || OUT_AT.pump; s.f.position.set(xz[0], 0, xz[1]); s.f.lookAt(PL.x, 0, PL.z); figPose(s.f, 0, o.wave ? G.time * 9 : null); });
  // your reflection in the front glass: it stands exactly where a reflection would
  const wv = play && ((G.wave && G.wave.who === 'me') || G.waved > 0);
  wd.refl.visible = play && G.lights && G.power && G.dark < 0.5;
  if (wd.refl.visible) { wd.refl.position.set(PL.x, 0, -9 - PL.z); wd.refl.rotation.y = -PL.yaw; figAlpha(wd.refl, wv ? 0.55 : 0.2); figPose(wd.refl, 0, wv ? G.time * 5 : null); }
  // rule 8
  const b = play ? G.behind : null; wd.behind.visible = !!(b && b.st !== 'done');
  if (wd.behind.visible) { wd.behind.position.set(b.x, 0, b.z); wd.behind.lookAt(PL.x, 0, PL.z); }
  // things you only see when the lights stutter
  const showF = play && G.dark > 0.5 && (G.flick > 0 || G.lightsOffT > 0) ? G.flickFigs.length : 0;
  while (wd.flick.length < showF) { const f = mkFig('shade', { eyes: true }), xz = FIG3[wd.flick.length % FIG3.length]; f.position.set(xz[0], 0, xz[1]); wd.flick.push(f); }
  wd.flick.forEach((f, i) => { f.visible = i < showF; if (f.visible) f.lookAt(PL.x, 0, PL.z); });
  wd.doorShade.visible = play && !!G.hallowAtDoor;
  if (play && G.truck > 0) { wd.truck.visible = true; wd.truck.position.x = 90 - G.truck * 180; wd.truckL.intensity = 40; } else wd.truck.visible = false;
  bloom.enabled = wd.q < 1 || HQ;
  composer.render();
}
// ----- walking and clicking -----
function isFree(x, z) { const R0 = 0.3; return !cols.some(c => (!c.on || c.on()) && x > c.x0 - R0 && x < c.x1 + R0 && z > c.z0 - R0 && z < c.z1 + R0); }
function movePlayer(dx, dz) { if (isFree(PL.x + dx, PL.z)) PL.x += dx; if (isFree(PL.x, PL.z + dz)) PL.z += dz; }
const ray = new T.Raycaster(), ndc = new T.Vector2();
function shown(o) { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; }
function pickAt(nx, ny) {
  ndc.set(nx, ny); ray.setFromCamera(ndc, camera); ray.far = 12;
  const h = ray.intersectObjects(acts.filter(shown).concat(blockers), false)[0];
  if (!h) return null; const a = h.object.userData.act; if (!a || h.distance > a.range) return null;
  return { label: typeof a.label === 'function' ? a.label() : a.label, fn: a.fn };
}
