// ---------- the 3D world: Morrow's Fuel & Mart, built out of boxes ----------
// Units are metres. The shop floor runs x -6..6, z -4.5 (front glass) .. 4.5 (back wall). You start behind the counter.
const T = THREE;
let renderer, scene, camera, station;
const wd = {};                                   // handles on everything that changes
const acts = [], blockers = [], cols = [];      // clickable things, things that block clicks, things that block feet
const PL = { x: -0.4, z: 3.5, yaw: 0, pitch: 0, bob: 0 };
const lam = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
const bas = (c, o) => new T.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
const HIT = new T.MeshBasicMaterial({ visible: false });
function box(w, h, d, m, x, y, z, parent, block) { const g = new T.Mesh(new T.BoxGeometry(w, h, d), (m && m.isMaterial) || Array.isArray(m) ? m : lam(m)); g.position.set(x, y, z); (parent || station).add(g); if (block) blockers.push(g); return g; }
function plane(w, h, m, x, y, z, ry, parent) { const g = new T.Mesh(new T.PlaneGeometry(w, h), m); g.position.set(x, y, z); g.rotation.y = ry || 0; (parent || station).add(g); return g; }
function ctex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); if (draw) draw(x, w, h); const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false; t.colorSpace = T.SRGBColorSpace; t.userData = { c, x }; return t; }
function sign(text, w, h, bg, fg, parent, x, y, z, ry, lit) {
  const pw = 160, ph = Math.max(12, Math.round(pw * h / w)), lines = text.split('\n');
  const t = ctex(pw, ph, c => { c.fillStyle = bg; c.fillRect(0, 0, pw, ph); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; const fs = Math.min(ph / lines.length * 0.8, pw / Math.max(...lines.map(l => l.length)) * 1.55); c.font = 'bold ' + fs + 'px "Courier New", monospace'; lines.forEach((l, i) => c.fillText(l, pw / 2, ph * (i + 0.5) / lines.length + 1)); });
  return plane(w, h, lit ? bas(0xffffff, { map: t }) : lam(0xffffff, { map: t }), x, y, z, ry, parent);
}
function act(mesh, label, fn, range) { mesh.userData.act = { label, fn, range: range || 2.6 }; acts.push(mesh); return mesh; }
function hitbox(w, h, d, x, y, z, parent) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), HIT); m.position.set(x, y, z); (parent || station).add(m); return m; }
function col(x0, x1, z0, z1, on) { cols.push({ x0, x1, z0, z1, on }); }
function panTo(x, z) { const dx = x - PL.x, dz = z - PL.z, d = Math.hypot(dx, dz) || 1; return clamp((dx * Math.cos(PL.yaw) - dz * Math.sin(PL.yaw)) / d, -1, 1) * 0.85; }

function mkDoor(x, z, ry, color, label, solid) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; station.add(g);
  box(1.06, 2.14, 0.04, lam('#1c2020'), 0, 1.07, -0.03, g);
  if (!solid) plane(0.9, 2.05, bas(0x010101), 0, 1.025, -0.005, 0, g);
  const piv = new T.Group(); piv.position.set(-0.45, 0, 0.02); g.add(piv);
  box(0.9, 2.05, 0.05, lam(color), 0.45, 1.025, 0, piv); box(0.78, 0.8, 0.02, lam(color, { emissive: 0x000000 }), 0.45, 0.6, 0.03, piv);
  box(0.08, 0.03, 0.06, lam('#b9ae8f'), 0.8, 1.0, 0.04, piv);
  if (label) sign(label, 0.56, label.includes('\n') ? 0.22 : 0.14, '#d8d3c2', '#262320', piv, 0.45, 1.62, 0.03, 0);
  const glow = [[0, 2.08, 0.96, 0.03], [0, 0.015, 0.96, 0.03], [-0.47, 1.03, 0.03, 2.08], [0.47, 1.03, 0.03, 2.08]].map(([gx, gy, gw, gh]) => { const b = box(gw, gh, 0.02, bas('#e3b616'), gx, gy, 0.01, g); b.visible = false; return b; });
  return { g, piv, glow, hit: hitbox(0.95, 2.1, 0.3, 0, 1.05, 0.12, g) };
}
// ----- people -----
const faceCache = {};
function faceTex(L, smile) {
  const key = L.skin + L.face + (smile ? 's' : ''); if (faceCache[key]) return faceCache[key];
  return faceCache[key] = ctex(21, 25, c => {
    c.fillStyle = L.face === 'void' ? '#020202' : L.skin; c.fillRect(0, 0, 21, 25);
    if (L.face === 'normal' || L.face === 'hallow') { const w = L.face === 'hallow' ? 3 : 2; c.fillStyle = '#14100e'; c.fillRect(5, 9, w, 2); c.fillRect(16 - w, 9, w, 2); c.fillStyle = '#6a3028'; if (L.face === 'hallow') c.fillRect(5, 18, 11, 1); else c.fillRect(8, 18, 5, 1); }
    if (L.face === 'void' && smile) { c.fillStyle = '#e6e1cd'; [[5, 15], [6, 16], [7, 17], [8, 18], [9, 18], [10, 18], [11, 18], [12, 18], [13, 17], [14, 16], [15, 15]].forEach(([x, y]) => c.fillRect(x, y, 1, 1)); }
  });
}
function mkFig(look, o) {
  o = o || {}; const L = LOOKS[look] || LOOKS.shade, sil = L.sil, g = new T.Group(), mats = [];
  const M = c => { const m = sil ? bas(sil) : lam(c || '#333'); m.transparent = true; mats.push(m); return m; };
  const part = (w, h, d, m, x, y, z, par) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); (par || g).add(b); return b; };
  const coat = M(L.coat), legs = M(L.legs || '#1b1d22'), skin = M(L.skin || '#ccc');
  const piv = (x, y) => { const p = new T.Group(); p.position.set(x, y, 0); g.add(p); return p; };
  const legL = piv(-0.1, 0.82), legR = piv(0.1, 0.82), armL = piv(-0.3, 1.4), armR = piv(0.3, 1.4);
  part(0.15, 0.82, 0.17, legs, 0, -0.41, 0, legL); part(0.15, 0.82, 0.17, legs, 0, -0.41, 0, legR);
  part(0.46, 0.62, 0.25, coat, 0, 1.13, 0); if (L.long) part(0.48, 0.5, 0.27, coat, 0, 0.62, 0);
  [armL, armR].forEach(a => { part(0.12, 0.58, 0.13, coat, 0, -0.29, 0, a); part(0.1, 0.1, 0.11, skin, 0, -0.63, 0, a); });
  part(0.21, 0.25, 0.21, skin, 0, 1.58, 0);
  if (L.hood) part(0.3, 0.33, 0.25, coat, 0, 1.6, -0.035);
  if (L.hair && !sil) { const h = M(L.hair); part(0.23, 0.07, 0.23, h, 0, 1.715, 0); part(0.23, 0.2, 0.04, h, 0, 1.62, -0.105); }
  if (L.hat && !sil) { const h = M(L.hat); part(0.25, 0.07, 0.25, h, 0, 1.72, 0); part(0.25, 0.02, 0.12, h, 0, 1.69, 0.17); }
  let face = null;
  if (!sil && L.face !== 'none') { const fm = lam(0xffffff, { map: faceTex(L, false), transparent: true }); mats.push(fm); face = new T.Mesh(new T.PlaneGeometry(0.21, 0.25), fm); face.position.set(0, 1.58, 0.107); g.add(face); }
  if (L.tie && !sil) { part(0.14, 0.2, 0.01, M('#d8d8d2'), 0, 1.33, 0.127); part(0.05, 0.34, 0.012, M(L.tie), 0, 1.25, 0.13); }
  if (L.clip && !sil) part(0.2, 0.27, 0.02, M('#b9b08f'), 0, -0.5, 0.09, armL);
  if (sil && o.eyes) { const e = bas('#e1e1cd', { transparent: true }); mats.push(e); part(0.03, 0.03, 0.01, e, -0.05, 1.6, 0.108); part(0.03, 0.03, 0.01, e, 0.05, 1.6, 0.108); }
  if (o.pale) { const pm = bas('#b3ad9f', { transparent: true }); mats.push(pm); part(0.19, 0.24, 0.01, pm, 0, 1.58, 0.108); const d = bas('#020202'); part(0.04, 0.06, 0.012, d, -0.045, 1.61, 0.11); part(0.04, 0.06, 0.012, d, 0.045, 1.61, 0.11); part(0.1, 0.012, 0.012, bas('#3a1512'), 0, 1.51, 0.11); }
  if (o.scale) g.scale.setScalar(o.scale);
  g.userData = { legL, legR, armL, armR, mats, face, L, look };
  station.add(g); return g;
}
function figAlpha(g, a) { for (const m of g.userData.mats) m.opacity = a; }
function figPose(g, walk, wave) { const u = g.userData, s = walk ? Math.sin(walk) * 0.5 : 0; u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.6; u.armR.rotation.x = wave != null ? 0 : s * 0.6; u.armR.rotation.z = wave != null ? 2.6 + Math.sin(wave) * 0.35 : 0; }
const ITEM_SHAPE = { bottle: [0.07, 0.24, 0.07, '#9fd0e6'], can: [0.07, 0.13, 0.07, '#8a2a2a'], bag: [0.17, 0.2, 0.06, '#c98a1e'], cup: [0.09, 0.12, 0.09, '#e6dfca'], paper: [0.22, 0.012, 0.15, '#e6dfca'], jar: [0.11, 0.15, 0.11, '#b9c9b9'], photo: [0.17, 0.012, 0.13, '#3a3f44'], clock: [0.18, 0.18, 0.05, '#f1eee4'], key: [0.13, 0.015, 0.05, '#b99a3a'], box: [0.1, 0.12, 0.06, '#55606a'] };

function buildWorld() {
  renderer = new T.WebGLRenderer({ canvas: $('gl'), antialias: false });
  renderer.setPixelRatio(1); renderer.setSize(640, 360, false);
  scene = new T.Scene(); scene.background = new T.Color(0x020306); scene.fog = new T.FogExp2(0x020306, 0.03);
  camera = new T.PerspectiveCamera(68, 16 / 9, 0.06, 160); camera.rotation.order = 'YXZ';
  station = new T.Group(); scene.add(station);
  wd.hemi = new T.HemisphereLight(0x93a48f, 0x2c2c24, 0.4); scene.add(wd.hemi); wd.moon = new T.DirectionalLight(0x5a6f96, 0.5); wd.moon.position.set(-20, 30, -30); scene.add(wd.moon);
  const WALL = lam('#59634f'), DARK = lam('#1c2020');
  const wall = (x0, x1, z0, z1, y0, y1, m) => box(x1 - x0, y1 - y0, z1 - z0, m || WALL, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, station, true);
  // --- ground, road, forest (these stay even if the station does not) ---
  const gnd = new T.Mesh(new T.PlaneGeometry(240, 240), lam('#0d1011')); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.02; scene.add(gnd);
  box(240, 0.02, 7, lam('#17191b'), 0, 0, -21, scene); for (let i = -14; i <= 14; i++) box(2.2, 0.03, 0.18, lam('#6a6848'), i * 6, 0.005, -21, scene);
  const treeM = lam('#04070a'); for (let i = 0; i < 70; i++) { const a = i / 70 * 6.283, rr = 34 + hsh(i) * 14, tx0 = Math.cos(a) * rr * 1.5, tz = Math.sin(a) * rr - 6; if (tz > -27 && tz < 12 && Math.abs(tx0) < 30) continue; const h = 7 + hsh(i + 9) * 8, t = new T.Mesh(new T.ConeGeometry(2.4 + hsh(i + 3) * 1.6, h, 5), treeM); t.position.set(tx0, h / 2, tz); scene.add(t); }
  for (let i = 0; i < 46; i++) { const h = 8 + hsh(i + 200) * 8, t = new T.Mesh(new T.ConeGeometry(2.6 + hsh(i + 5) * 1.5, h, 5), treeM); t.position.set(-92 + i * 4 + hsh(i) * 2, h / 2, -30 - hsh(i + 40) * 8); scene.add(t); }
  wd.car = new T.Group(); box(3.8, 0.7, 1.7, lam('#161b1f'), 0, 0.55, 0, wd.car); box(2.0, 0.6, 1.6, lam('#12171a'), -0.2, 1.15, 0, wd.car); wd.car.position.set(9.5, 0, -8); scene.add(wd.car);
  wd.truck = new T.Group(); box(7, 2.6, 2.4, bas('#050607'), 0, 1.6, 0, wd.truck); box(0.2, 0.3, 0.3, bas('#fff3c2'), -3.6, 1, 0.8, wd.truck); box(0.2, 0.3, 0.3, bas('#fff3c2'), -3.6, 1, -0.8, wd.truck); wd.truckL = new T.PointLight(0xfff0c0, 0, 30, 1.5); wd.truckL.position.set(-6, 1.2, 0); wd.truck.add(wd.truckL); wd.truck.position.z = -21; wd.truck.visible = false; scene.add(wd.truck);
  // --- floor, ceiling, walls ---
  const ft = ctex(64, 64, c => { c.fillStyle = '#74725e'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#656352'; c.fillRect(0, 0, 32, 32); c.fillRect(32, 32, 32, 32); c.fillStyle = '#434236'; c.fillRect(0, 0, 64, 1); c.fillRect(0, 32, 64, 1); c.fillRect(0, 0, 1, 64); c.fillRect(32, 0, 1, 64); });
  ft.wrapS = ft.wrapT = T.RepeatWrapping; ft.repeat.set(6, 4.5);
  const fl = new T.Mesh(new T.PlaneGeometry(12.4, 9.4), lam(0xffffff, { map: ft })); fl.rotation.x = -Math.PI / 2; station.add(fl);
  const ce = new T.Mesh(new T.PlaneGeometry(12.4, 9.4), lam('#30362f')); ce.rotation.x = Math.PI / 2; ce.position.y = 3; station.add(ce);
  box(13, 0.5, 10, lam('#191d1c'), 0, 3.26, 0);
  wall(-6.2, 6.2, 4.5, 4.7, 0, 3); wall(-6.2, -6, -4.5, 4.5, 0, 3);
  wall(6, 6.2, -4.5, 3.0, 0, 3); wall(6, 6.2, 3.9, 5.2, 0, 3); wall(6, 6.2, 3.0, 3.9, 2.1, 3);
  [[-6.2, -5.5], [-0.9, -0.6], [0.6, 0.9], [5.5, 6.2]].forEach(([a, b]) => wall(a, b, -4.7, -4.5, 0, 3));
  [[-5.5, -0.9], [0.9, 5.5]].forEach(([a, b]) => { wall(a, b, -4.7, -4.5, 0, 0.8); wall(a, b, -4.7, -4.5, 2.5, 3); box(0.08, 1.7, 0.1, DARK, (a + b) / 2, 1.65, -4.6); plane(b - a, 1.7, bas(0x9fb8a8, { transparent: true, opacity: 0.06, depthWrite: false }), (a + b) / 2, 1.65, -4.58, 0); });
  wall(-0.6, 0.6, -4.7, -4.5, 2.2, 3);
  [[-6.2, 6.2, 4.5, 4.7], [-6.2, -6, -4.7, 4.7], [-6.2, 6.2, -4.7, -4.5], [6, 6.2, -4.7, 3.0], [6, 6.2, 3.9, 5.2]].forEach(c => col(...c));
  col(6, 6.2, 3.0, 3.9, () => !G.staffOpen);
  // front door (glass, swings outward for customers; never for you, until 5:59)
  wd.fdoor = new T.Group(); wd.fdoor.position.set(-0.6, 0, -4.6); station.add(wd.fdoor);
  [[0.6, 2.15, 1.2, 0.1], [0.6, 0.05, 1.2, 0.1], [0.04, 1.1, 0.08, 2.2], [1.16, 1.1, 0.08, 2.2]].forEach(([x, y, w, h]) => box(w, h, 0.06, DARK, x, y, 0, wd.fdoor));
  box(1.1, 0.05, 0.08, lam('#8a8f88'), 0.6, 1.05, 0.04, wd.fdoor); plane(1.1, 2.1, bas(0x9fb8a8, { transparent: true, opacity: 0.07, depthWrite: false }), 0.6, 1.1, 0, 0, wd.fdoor);
  sign('OPEN', 0.4, 0.16, '#7d2b24', '#e6dfca', wd.fdoor, 0.6, 1.75, -0.04, Math.PI);
  act(hitbox(1.2, 2.2, 0.3, 0, 1.1, -4.5), 'Front door', () => frontDoor(), 2.4);
  // wall clock above the door
  const ck = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.05, 16), lam('#e6dfca')); ck.rotation.x = Math.PI / 2; ck.position.set(0, 2.62, -4.46); station.add(ck);
  wd.hMin = new T.Group(); wd.hHr = new T.Group(); [wd.hMin, wd.hHr].forEach((g, i) => { g.position.set(0, 2.62, -4.42); station.add(g); box(0.025, i ? 0.13 : 0.2, 0.01, bas('#1a1714'), 0, i ? 0.065 : 0.1, 0, g); });
  // --- ceiling lights ---
  wd.tubes = []; wd.lights = [];
  [[-3, -2.4], [3, -2.4], [-3, 1.2], [3, 1.2], [0, 3.3]].forEach(([x, z]) => { const m = bas('#f2ffe2'); box(1.7, 0.05, 0.22, m, x, 2.96, z); wd.tubes.push(m); const l = new T.PointLight(0xe6f6d6, 1, 14, 1.3); l.position.set(x, 2.6, z); station.add(l); wd.lights.push(l); });
  // --- the counter ---
  box(5.2, 1.0, 0.7, lam('#2b2420'), 0, 0.5, 2.25, station, true); box(5.4, 0.06, 0.82, lam('#5a4b3d'), 0, 1.03, 2.25, station, true); col(-2.7, 2.7, 1.85, 2.65);
  box(0.52, 0.3, 0.42, lam('#3b4042'), -1.7, 1.21, 2.25); box(0.52, 0.06, 0.2, lam('#4a4f51'), -1.7, 1.39, 2.36);
  wd.regT = ctex(64, 20); wd.regShown = null; plane(0.3, 0.1, bas(0xffffff, { map: wd.regT }), -1.76, 1.26, 2.465, 0);
  act(hitbox(0.56, 0.42, 0.5, -1.7, 1.27, 2.27), 'Cash register', () => pay());
  wd.receipt = box(0.09, 0.2, 0.01, bas('#efece2'), -1.36, 1.17, 2.4); wd.receipt.rotation.x = -0.3; act(wd.receipt, 'Receipt', () => readReceipt());
  const pt = ctex(40, 56, c => { c.fillStyle = '#e6dfca'; c.fillRect(0, 0, 40, 56); c.fillStyle = '#6a6455'; for (let i = 0; i < 12; i++) c.fillRect(5, 6 + i * 4, 30 - (i * 7 % 9), 1); });
  wd.paper = new T.Mesh(new T.PlaneGeometry(0.3, 0.42), lam(0xffffff, { map: pt })); wd.paper.rotation.x = -Math.PI / 2; wd.paper.rotation.z = 0.12; wd.paper.position.set(-0.75, 1.065, 2.36); station.add(wd.paper); act(wd.paper, 'The rules', () => openRules());
  wd.binder = box(0.36, 0.05, 0.28, lam('#4a3428'), -2.3, 1.085, 2.3); box(0.2, 0.01, 0.08, bas('#e6dfca'), 0, 0.03, 0, wd.binder); act(wd.binder, 'Employee records', () => readBinder());
  wd.clip = box(0.26, 0.02, 0.36, lam('#b9b08f'), -1.12, 1.07, 2.34); box(0.22, 0.012, 0.3, bas('#cfd8c2'), 0, 0.012, 0.01, wd.clip); act(wd.clip, 'A clipboard and a pen', () => clipboardMenu());
  wd.phone = new T.Group(); wd.phone.position.set(1.9, 1.06, 2.3); station.add(wd.phone);
  box(0.3, 0.1, 0.22, lam('#b9ae8f'), 0, 0.05, 0, wd.phone); box(0.36, 0.06, 0.08, lam('#a39878'), 0, 0.14, 0, wd.phone); box(0.08, 0.08, 0.1, lam('#a39878'), -0.14, 0.11, 0, wd.phone); box(0.08, 0.08, 0.1, lam('#a39878'), 0.14, 0.11, 0, wd.phone);
  act(hitbox(0.42, 0.26, 0.3, 1.9, 1.17, 2.3), 'Telephone', () => answerPhone());
  box(0.16, 0.2, 0.03, lam('#cfc8b4'), 2.0, 1.0, 4.48); act(hitbox(0.36, 0.4, 0.2, 2.0, 1.0, 4.42), () => G.phone.plugged ? 'Phone cord (pull it out)' : 'Phone cord (plug it back in)', () => togglePlug());
  wd.cordG = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()]); station.add(new T.Line(wd.cordG, new T.LineBasicMaterial({ color: 0x15130f }))); wd.cordState = null;
  wd.items = new T.Group(); station.add(wd.items); wd.itemSig = '';
  // --- back wall: monitors, light switch ---
  box(2.36, 1.42, 0.3, lam('#161918'), -0.9, 1.75, 4.36, station, true); box(2.6, 0.06, 0.4, lam('#2a2e2c'), -0.9, 1.0, 4.3);
  wd.mon = [];
  for (let i = 0; i < 4; i++) { const sx = -0.9 + (i % 2 ? -0.56 : 0.56), sy = i < 2 ? 2.08 : 1.42, t = ctex(240, 135), lt = ctex(64, 16); const scr = plane(1.04, 0.56, bas(0xffffff, { map: t }), sx, sy, 4.2, Math.PI); plane(0.36, 0.09, bas(0xffffff, { map: lt }), sx, sy - 0.335, 4.2, Math.PI); act(scr, 'Look closer at this monitor', () => watchCam(i), 3.2); wd.mon.push({ t, lt, shown: null }); }
  wd.monT = 0; wd.monL = new T.PointLight(0x9fd8b0, 0.5, 4, 1.5); wd.monL.position.set(-0.9, 1.7, 3.7); station.add(wd.monL);
  box(0.16, 0.24, 0.03, lam('#d8d3c2'), -2.9, 1.3, 4.48); wd.sw = box(0.05, 0.08, 0.04, lam('#8a8372'), -2.9, 1.34, 4.46); sign('LIGHTS', 0.3, 0.09, '#59634f', '#1c2020', station, -2.9, 1.1, 4.49, Math.PI);
  act(hitbox(0.36, 0.5, 0.2, -2.9, 1.28, 4.42), 'Light switch', () => lightSwitch());
  // --- shelves ---
  const shelfT = empty => ctex(128, 64, c => { c.fillStyle = '#262a28'; c.fillRect(0, 0, 128, 64); const pal = ['#8a2a2a', '#c98a1e', '#2c5fa8', '#4f8f5a', '#d8d3c2', '#7a4a7a', '#b9552a']; for (let row = 0; row < 3; row++) { if (!empty) for (let i = 0; i < 20; i++) { const k = hsh(row * 31 + i + (empty ? 5 : 0)); if (k > 0.1) { c.fillStyle = pal[(k * 97 | 0) % pal.length]; c.fillRect(2 + i * 6.3, row * 21 + 5 + (k * 5 | 0), 5, 14 - (k * 5 | 0)); } } c.fillStyle = '#5a5f58'; c.fillRect(0, row * 21 + 19, 128, 2); } });
  const fullT = shelfT(false), emptyT = shelfT(true), side = lam('#2a2e2c');
  wd.gond = [[-3, -0.6], [3, -0.6], [-3, -2.6], [3, -2.6]].map(([x, z]) => { const f = lam(0xffffff, { map: fullT }), b = lam(0xffffff, { map: fullT }); box(2.8, 1.4, 0.5, [side, side, side, side, f, b], x, 0.7, z, station, true); col(x - 1.4, x + 1.4, z - 0.25, z + 0.25); return { f, b }; });
  wd.fullT = fullT; wd.emptyT = emptyT;
  // --- left wall: fridges and three doors (one of which should not be there) ---
  wd.fridgeBack = bas('#a9cfc6'); plane(2.4, 1.9, wd.fridgeBack, -5.97, 1.1, -2.4, Math.PI / 2);
  box(0.62, 0.15, 2.5, DARK, -5.7, 0.075, -2.4); box(0.62, 0.14, 2.5, DARK, -5.7, 2.13, -2.4); [-3.65, -1.15, -2.4].forEach((z, i) => box(i === 2 ? 0.08 : 0.62, 2.0, 0.08, DARK, i === 2 ? -5.42 : -5.7, 1.1, z));
  for (let s = 0; s < 3; s++) box(0.5, 0.03, 2.4, lam('#5c7570'), -5.72, 1.45 - s * 0.5, -2.4);
  plane(2.4, 1.9, bas(0xcfeee6, { transparent: true, opacity: 0.07, depthWrite: false }), -5.41, 1.1, -2.4, Math.PI / 2);
  wd.fridgeL = new T.PointLight(0xa9e0d6, 0.7, 5, 1.5); wd.fridgeL.position.set(-5.0, 1.3, -2.4); station.add(wd.fridgeL);
  col(-6, -5.4, -3.7, -1.1);
  wd.bottles = new T.Group(); station.add(wd.bottles); wd.bottleSig = null;
  const crate = box(0.5, 0.34, 0.4, lam('#5a4a2e'), -5.6, 0.17, -0.7); for (let i = 0; i < 4; i++) box(0.06, 0.1, 0.06, lam('#e8f1f4'), -0.16 + i * 0.11, 0.2, 0, crate);
  act(hitbox(0.6, 0.6, 0.5, -5.6, 0.3, -0.7), 'Restock crate (put one bottle in the fridge)', () => restock(), 3); col(-5.9, -5.35, -0.92, -0.48);
  wd.dStore = mkDoor(-5.98, 0.35, Math.PI / 2, '#4b483c', 'STORAGE'); act(wd.dStore.hit, 'Storage cupboard', () => cap('Mops. Bleach. A box of bulbs for lights that never get changed.'));
  wd.dNew = mkDoor(-5.98, 1.7, Math.PI / 2, '#3a3634', 'EMPLOYEES\nONLY'); act(wd.dNew.hit, 'A door that was not here yesterday', () => newDoorMenu());
  wd.dWC = mkDoor(-5.98, 3.45, Math.PI / 2, '#44483f', 'STAFF WC'); act(wd.dWC.hit, 'Staff toilet', () => toiletDoor());
  // --- right wall: noticeboard, staff room ---
  box(0.04, 0.9, 1.3, lam('#6b5335'), 5.97, 1.6, 0.6); sign('EMPLOYEE\nOF THE MONTH', 0.6, 0.2, '#d8cdb0', '#33291c', station, 5.94, 1.3, 0.6, -Math.PI / 2); plane(0.42, 0.42, lam('#2a2d2b'), 5.94, 1.72, 0.6, -Math.PI / 2);
  act(hitbox(0.2, 0.9, 1.3, 5.9, 1.6, 0.6), 'Noticeboard', () => cap('EMPLOYEE OF THE MONTH. The photograph is a grey square. It has been a grey square for a long time.'));
  wd.dStaff = mkDoor(6.02, 3.45, -Math.PI / 2, '#484d43', 'STAFF', true); act(wd.dStaff.hit, 'Staff room', () => { if (!G.staffOpen) cap('Locked. You were never given a key to the staff room.'); });
  // staff room (x 6.2..9, z 2..5)
  const sf = new T.Mesh(new T.PlaneGeometry(3, 3.4), lam('#4a4c40')); sf.rotation.x = -Math.PI / 2; sf.position.set(7.6, 0.001, 3.5); station.add(sf);
  const sc = new T.Mesh(new T.PlaneGeometry(3, 3.4), lam('#2c302b')); sc.rotation.x = Math.PI / 2; sc.position.set(7.6, 2.7, 3.5); station.add(sc);
  wall(9, 9.2, 1.8, 5.2, 0, 3, lam('#4d5548')); wall(6, 9.2, 1.8, 2, 0, 3, lam('#4d5548')); wall(6.2, 9.2, 5, 5.2, 0, 3, lam('#4d5548'));
  col(9, 9.2, 1.8, 5.2); col(6, 9.2, 1.8, 2); col(6.2, 9.2, 5, 5.2);
  wd.staffL = new T.PointLight(0xf3efc8, 0.9, 6, 1.5); wd.staffL.position.set(7.6, 2.2, 3.5); station.add(wd.staffL); box(0.08, 0.1, 0.08, bas('#f3efc8'), 7.6, 2.45, 3.5);
  wd.lockN = [];
  ['J. PIKE', 'R. ALDER', '', 'T. VOSS'].forEach((n, i) => { const lx = 6.75 + i * 0.56; box(0.52, 1.9, 0.5, lam('#56656a'), lx, 0.95, 4.74, station, true); box(0.3, 0.02, 0.01, lam('#39474a'), lx, 1.6, 4.48); box(0.3, 0.02, 0.01, lam('#39474a'), lx, 1.54, 4.48); const t = ctex(64, 16); plane(0.34, 0.085, lam(0xffffff, { map: t }), lx, 1.35, 4.485, Math.PI); wd.lockN.push({ t, n }); act(hitbox(0.52, 1.9, 0.2, lx, 0.95, 4.5), i === 2 ? 'A locker with your name on it' : 'Locker', i === 2 ? () => readLocker() : () => cap('Padlocked. The name is embossed on old tape.')); });
  col(6.45, 8.75, 4.45, 5);
  box(0.04, 1.0, 1.8, lam('#7a6040'), 8.97, 1.6, 3.2); plane(0.42, 0.32, lam('#e6dfca'), 8.94, 1.75, 2.6, -Math.PI / 2); plane(0.3, 0.3, lam('#e3b616'), 8.94, 1.38, 3.75, -Math.PI / 2);
  const ph = ctex(60, 44, c => { c.fillStyle = '#efe8d2'; c.fillRect(0, 0, 60, 44); c.fillStyle = '#8f8262'; c.fillRect(3, 3, 54, 34); c.fillStyle = '#3a3324'; for (let i = 0; i < 6; i++) c.fillRect(8 + i * 8, 18, 4, 16); c.fillStyle = '#a52d24'; c.fillRect(28, 0, 4, 5); });
  act(plane(0.6, 0.44, lam(0xffffff, { map: ph }), 8.94, 1.62, 3.2, -Math.PI / 2), 'A dusty photograph', () => { setZoom('photo'); cap('Six people standing outside the petrol station. You recognise one of them.', 6); }, 3);
  box(0.8, 0.05, 1.4, lam('#5a4a38'), 7.4, 0.75, 2.6); [[7.1, 2.1], [7.7, 2.1], [7.1, 3.1], [7.7, 3.1]].forEach(([x, z]) => box(0.06, 0.75, 0.06, lam('#3a2f24'), x, 0.375, z)); col(7.0, 7.8, 2.0, 3.25);
  // --- forecourt ---
  wd.canopyM = bas('#d9ecc9'); box(11, 0.4, 6, lam('#1d2327'), 0, 4.2, -10); box(10, 0.04, 0.5, wd.canopyM, 0, 3.98, -8.6); box(10, 0.04, 0.5, wd.canopyM, 0, 3.98, -11.4);
  [[-5, -7.5], [5, -7.5], [-5, -12.5], [5, -12.5]].forEach(([x, z]) => box(0.3, 4, 0.3, lam('#22282b'), x, 2, z));
  [-2.2, 2.2].forEach(x => { box(1.6, 0.14, 0.9, lam('#33383a'), x, 0.07, -10); box(0.6, 1.5, 0.45, lam('#6d2620'), x, 0.9, -10); box(0.4, 0.22, 0.02, bas('#bcd6b0'), x, 1.3, -9.76); });
  wd.canL = [-2.6, 2.6].map(x => { const l = new T.PointLight(0xdcefc8, 1, 34, 1.3); l.position.set(x, 3.6, -9.6); station.add(l); return l; });
  const con = new T.Mesh(new T.PlaneGeometry(16, 12), lam('#2a2f31')); con.rotation.x = -Math.PI / 2; con.position.set(0, 0.002, -10.5); station.add(con);
  box(12.8, 0.6, 0.3, lam('#7d2b24'), 0, 3.3, -4.75); sign("MORROW'S FUEL & MART", 8, 0.46, '#7d2b24', '#e6dfca', station, 0, 3.3, -4.91, Math.PI, true);
  box(0.3, 7, 0.3, lam('#22282b'), -9.5, 3.5, -15); box(3.4, 1.4, 0.3, lam('#7d2b24'), -9.5, 6.6, -15); sign("MORROW'S", 3.2, 0.9, '#7d2b24', '#e6dfca', station, -9.5, 6.6, -15.16, Math.PI, true); sign("MORROW'S", 3.2, 0.9, '#7d2b24', '#e6dfca', station, -9.5, 6.6, -14.84, 0, true);
  box(0.3, 3.6, 10, lam('#232826'), -6.35, 1.8, 0.2); box(0.3, 3.6, 6.4, lam('#232826'), 6.35, 1.8, -1.4); box(3.4, 0.3, 3.8, lam('#232826'), 7.7, 2.86, 3.5);
  // --- figures that are not customers ---
  wd.figs = {}; wd.out = []; wd.flick = [];
  wd.refl = mkFig('you'); wd.refl.userData.mats.forEach(m => { m.depthWrite = false; });
  wd.behind = mkFig('shade', { pale: true, scale: 1.28 }); wd.behind.visible = false;
  wd.waver = null; wd.extFig = null; wd.extLook = null;
  wd.clerk = mkFig('teen'); wd.clerk.position.set(-0.4, 0, 3.3); wd.clerk.rotation.y = Math.PI; wd.clerk.visible = false;
  wd.doorShade = mkFig('shade', { eyes: true }); wd.doorShade.position.set(0, 0, -5.3); wd.doorShade.visible = false;
}
const OUT_AT = { pump: [2.2, -8.9], window: [3, -5.25], door: [0, -5.4] };
const FIG3 = [[-1.2, -1.6], [1.3, -3.2], [0.2, 0.6], [-4.6, -1.6], [4.4, 0.4], [2.2, 1.3], [-3.6, 2.9]];
const cTmp = new T.Color(), cA = new T.Color(), cB = new T.Color();
function worldSync(dt) {
  const play = G.scene === 'play', e = G.ext || {};
  // ---- light ----
  let on = 1;
  if (play) {
    let dark = 0.1;
    if (!G.lights || !G.power) dark = 0.96;
    else if (G.flick > 0) { if (P.reduce) dark = 0.5 + 0.3 * Math.sin(G.time * 3); else { const k = hsh(Math.floor(G.time * 13)); dark = k < 0.42 ? 0.95 : (k < 0.58 ? 0.55 : 0.1); } }
    G.dark = dark; on = 1 - dark;
  } else on = e.lit === 0 ? 0.03 : 1;
  const strikes = play && R ? Math.min(R.strikes, 5) : 0, base = 7.5 - strikes * 0.5, dawn = play ? 0 : (e.dawn || 0);
  wd.lights.forEach((l, i) => { l.intensity = base * on * (i === 4 ? 0.8 : 1); });
  cTmp.setRGB(0.06 + 0.9 * on, 0.07 + 0.93 * on, 0.06 + 0.83 * on); wd.tubes.forEach(m => m.color.copy(cTmp));
  wd.hemi.intensity = 0.1 + 0.75 * on + dawn * 1.6; wd.moon.intensity = 0.5 + dawn * 1.5;
  const power = play ? (G.power && !G.finaleDark) : e.lit !== 0;
  wd.canL.forEach(l => { l.intensity = power ? 26 : 0; }); wd.canopyM.color.set(power ? '#d9ecc9' : '#15191a');
  const fpow = play ? G.power : e.lit !== 0; wd.fridgeBack.color.set(fpow ? '#a9cfc6' : '#0a0e0e'); wd.fridgeL.intensity = fpow ? 0.7 : 0; wd.staffL.intensity = fpow ? 0.9 : 0; wd.monL.intensity = 0.5;
  cA.set(0x020306); cB.setRGB(0.78, 0.52, 0.36); scene.background.copy(cA).lerp(cB, dawn); scene.fog.color.copy(scene.background); scene.fog.density = 0.016 - dawn * 0.008;
  station.visible = play || (e.station == null ? true : (e.station >= 1 ? true : e.station > 0 && Math.random() < e.station)); wd.car.visible = play || e.car !== 0;
  // ---- camera ----
  if (play) { const sh = G.shock > 0.4 && !P.reduce ? G.shock * 0.03 : 0; camera.position.set(PL.x + rnd(-sh, sh), 1.62 + Math.sin(PL.bob) * 0.025 + rnd(-sh, sh), PL.z); camera.rotation.set(PL.pitch, PL.yaw, 0); }
  else { camera.position.set(-7 + Math.sin(G.time * 0.05) * 1.2, 1.7, -17.5); camera.lookAt(1.5, 2.4, -5); }
  // ---- extras for title cards ----
  wd.clerk.visible = !play && !!e.clerk;
  if (!play && e.fig) { if (wd.extLook !== e.fig.look) { if (wd.extFig) station.remove(wd.extFig); wd.extFig = mkFig(e.fig.look); wd.extLook = e.fig.look; wd.extZ = -13; } wd.extZ = Math.min(-5.4, wd.extZ + dt * 0.45); const away = e.fig.look === 'hallow'; wd.extFig.visible = true; wd.extFig.position.set(away ? -2 - (wd.extZ + 13) * 0.6 : -1.2, 0, away ? -6 - (wd.extZ + 13) * 1.2 : wd.extZ); wd.extFig.rotation.y = away ? Math.PI * 1.15 : 0; figPose(wd.extFig, wd.extZ < -5.5 ? G.time * 7 : 0); }
  else if (wd.extFig) wd.extFig.visible = false;
  // ---- per-night furniture ----
  wd.dNew.g.visible = !play || !!G.newDoor; wd.dNew.piv.rotation.y = play && G.doorAjar > 0 ? 0.28 : 0; wd.dNew.glow.forEach(b => { b.visible = play && !!G.doorGlow; });
  wd.dWC.piv.rotation.y = play && G.toiletOpen ? 1.25 : 0; wd.dWC.g.position.x = -5.98 + (play && G.knockAnim > 0 ? Math.sin(G.time * 70) * 0.012 : 0);
  wd.dStaff.piv.rotation.y = play && G.staffOpen ? 1.45 : 0;
  if (play) {
    const sw = G.doorSwing > 0 ? Math.sin(Math.min(1, G.doorSwing) * Math.PI) : 0; wd.fdoor.rotation.y = sw * 1.2;
    wd.paper.visible = !G.paperGone; wd.receipt.visible = !!G.receipt; wd.binder.visible = !!G.binder; wd.clip.visible = !!G.clipboard; wd.sw.position.y = G.lights ? 1.34 : 1.26;
    wd.phone.position.x = 1.9 + (G.phone.shake > 0 ? Math.sin(G.time * 70) * 0.008 : 0);
    if (wd.cordState !== G.phone.plugged) { wd.cordState = G.phone.plugged; const p = wd.cordG.attributes.position; p.setXYZ(0, 1.9, 1.1, 2.42); p.setXYZ(1, 1.95, 0.5, 3.0); if (G.phone.plugged) { p.setXYZ(2, 2.0, 0.55, 4.2); p.setXYZ(3, 2.0, 1.0, 4.46); } else { p.setXYZ(2, 1.9, 0.02, 3.5); p.setXYZ(3, 1.7, 0.02, 3.9); } p.needsUpdate = true; }
    if (wd.regShown !== G.total) { wd.regShown = G.total; const c = wd.regT.userData.x; c.fillStyle = '#0b170e'; c.fillRect(0, 0, 64, 20); c.fillStyle = '#7dff9a'; c.font = 'bold 15px "Courier New", monospace'; c.textAlign = 'right'; c.fillText('$' + G.total.toFixed(2), 61, 15); wd.regT.needsUpdate = true; }
    const ct = (G.clockStop ? G.stopT : G.t) + 180; wd.hMin.rotation.z = -(ct % 60) / 60 * 6.283; wd.hHr.rotation.z = -(ct / 60 % 12) / 12 * 6.283;
    wd.gond[0].f.map = wd.gond[0].b.map = G.emptyShelf ? wd.emptyT : wd.fullT;
    // bottles in the fridge
    const sig = G.fridge.map(b => b.s + ':' + b.x.toFixed(3) + (b.odd ? 'o' : '')).join('|') + G.power;
    if (sig !== wd.bottleSig) {
      wd.bottleSig = sig; for (const m of wd.bottles.children.slice()) { wd.bottles.remove(m); const k = acts.indexOf(m); if (k >= 0) acts.splice(k, 1); }
      G.fridge.forEach((b, i) => { const m = box(0.085, 0.26, 0.085, lam(b.odd ? '#8dbfd2' : '#9fd0e6'), -5.66, 1.465 - b.s * 0.5 + 0.13, -3.5 + b.x * 2.2, wd.bottles); box(0.09, 0.07, 0.09, lam('#2c5fa8'), 0, b.odd ? -0.03 : 0, 0, m); box(0.045, 0.04, 0.045, lam('#e8f1f4'), 0, 0.15, 0, m); act(m, 'Take this bottle out', () => { const k = G.fridge.indexOf(b); if (k >= 0) takeBottle(k); }, 2.2); });
    }
    // what the customer has put on the counter
    const cp = G.counter && G.counter.st === 'counter' ? G.counter : null, isig = cp ? cp.id + ':' + cp.items.map(i => i.done ? 1 : 0).join('') : '';
    if (isig !== wd.itemSig) {
      wd.itemSig = isig; for (const m of wd.items.children.slice()) { wd.items.remove(m); const k = acts.indexOf(m); if (k >= 0) acts.splice(k, 1); }
      if (cp) cp.items.forEach((it, i) => { if (it.done) return; const s = ITEM_SHAPE[it.k] || ITEM_SHAPE.box, m = box(s[0], s[1], s[2], lam(it.c || s[3]), -0.1 + i * 0.4, 1.06 + s[1] / 2, 2.06, wd.items); if (it.k === 'bottle') box(0.075, 0.07, 0.075, lam('#2c5fa8'), 0, 0, 0, m); const hb = hitbox(0.3, 0.34, 0.3, -0.1 + i * 0.4, 1.2, 2.06, wd.items); act(hb, it.n + ' (scan it)', () => scanItem(cp, it), 2.4); });
    }
    // monitors refresh a few times a second
    wd.monT -= dt; if (wd.monT <= 0) {
      wd.monT = 0.16; const keep = cx;
      wd.mon.forEach((m, i) => { cx = m.t.userData.x; feed(screenFeed(i), 0, 0, 240, 135, false); m.t.needsUpdate = true; if (m.shown !== G.camLabels[i]) { m.shown = G.camLabels[i]; const c = m.lt.userData.x; c.fillStyle = '#d8d3c2'; c.fillRect(0, 0, 64, 16); c.fillStyle = '#262320'; c.font = 'bold 13px "Courier New", monospace'; c.textAlign = 'center'; c.fillText('CAM ' + m.shown, 32, 12); m.lt.needsUpdate = true; } });
      cx = keep;
    }
    wd.lockN.forEach((l, i) => { const n = i === 2 ? R.name : l.n; if (l.drawn !== n) { l.drawn = n; const c = l.t.userData.x; c.fillStyle = i === 2 ? '#e2d48a' : '#d8d3c2'; c.fillRect(0, 0, 64, 16); c.fillStyle = '#262320'; c.font = 'bold ' + (n.length > 9 ? 8 : 11) + 'px "Courier New", monospace'; c.textAlign = 'center'; c.fillText(n, 32, 12); l.t.needsUpdate = true; } });
  }
  // ---- people ----
  const live = {};
  if (play) for (const p of G.people) {
    live[p.id] = 1; let f = wd.figs[p.id];
    if (!f) { f = wd.figs[p.id] = mkFig(p.look); const hb = hitbox(0.6, 1.8, 0.5, 0, 0.9, 0, f); act(hb, () => p.label || 'Customer', () => clickPerson(p), 9); f.userData.hb = hb; f.rotation.y = p.yaw || 0; }
    f.position.set(p.x, 0, p.z); let dy = (p.yaw || 0) - f.rotation.y; while (dy > Math.PI) dy -= 6.283; while (dy < -Math.PI) dy += 6.283; f.rotation.y += dy * Math.min(1, dt * 6);
    figAlpha(f, clamp(p.alpha, 0, 1)); f.visible = p.alpha > 0.01; figPose(f, p.moving ? G.time * 8 + p.id : 0);
    if (p.smile && f.userData.face && !f.userData.smiled) { f.userData.smiled = true; f.userData.face.material.map = faceTex(f.userData.L, true); }
  }
  for (const id in wd.figs) if (!live[id]) { const f = wd.figs[id], k = acts.indexOf(f.userData.hb); if (k >= 0) acts.splice(k, 1); station.remove(f); delete wd.figs[id]; }
  // people on the forecourt
  const outs = play ? G.outside.slice() : []; if (play && G.wave && G.wave.who === 'out') outs.push({ look: G.wave.look, wave: true, xz: [2.8, -7.0] });
  while (wd.out.length > outs.length) station.remove(wd.out.pop().f);
  outs.forEach((o, i) => { let s = wd.out[i]; if (!s || s.look !== o.look) { if (s) station.remove(s.f); s = wd.out[i] = { look: o.look, f: mkFig(o.look) }; } const xz = o.xz || OUT_AT[o.at] || OUT_AT.pump; s.f.position.set(xz[0], 0, xz[1]); s.f.lookAt(PL.x, 0, PL.z); figPose(s.f, 0, o.wave ? G.time * 9 : null); });
  // your reflection in the front glass: it stands exactly where a reflection would
  const wv = play && ((G.wave && G.wave.who === 'me') || G.waved > 0);
  wd.refl.visible = play && G.lights && G.power && G.dark < 0.5;
  if (wd.refl.visible) { wd.refl.position.set(PL.x, 0, -9 - PL.z); wd.refl.rotation.y = -PL.yaw; figAlpha(wd.refl, wv ? 0.5 : 0.16); figPose(wd.refl, 0, wv ? G.time * 5 : null); }
  // rule 8
  const b = play ? G.behind : null; wd.behind.visible = !!(b && b.st !== 'done');
  if (wd.behind.visible) { wd.behind.position.set(b.x, 0, b.z); wd.behind.lookAt(PL.x, 0, PL.z); }
  // things you only see when the lights stutter
  const showF = play && G.dark > 0.5 && (G.flick > 0 || G.lightsOffT > 0) ? G.flickFigs.length : 0;
  while (wd.flick.length < showF) { const f = mkFig('shade', { eyes: true }), xz = FIG3[wd.flick.length % FIG3.length]; f.position.set(xz[0], 0, xz[1]); wd.flick.push(f); }
  wd.flick.forEach((f, i) => { f.visible = i < showF; if (f.visible) f.lookAt(PL.x, 0, PL.z); });
  wd.doorShade.visible = play && !!G.hallowAtDoor;
  if (play && G.truck > 0) { wd.truck.visible = true; wd.truck.position.x = 70 - G.truck * 140; wd.truckL.intensity = 6; } else wd.truck.visible = false;
  renderer.render(scene, camera);
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
