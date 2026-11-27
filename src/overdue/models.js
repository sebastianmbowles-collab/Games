// The characters, in the cartoon style of the OVERDUE character sheet:
// flat "toon" shading in a few steps, and thick black outlines.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as X from './tex.js';

// ---------- the cartoon look ----------
const STEPS = (() => { // 3 tones of light: shadow, mid, lit
  const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: STEPS, ...o });
// outlines: a black copy of each shape, puffed out along its normals and seen from inside
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x0d0709, side: THREE.BackSide });
OUTLINE.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.012;'); };
function ink(root) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.noInk && o.material !== OUTLINE) list.push(o); });
  for (const m of list) { const o = new THREE.Mesh(m.geometry, OUTLINE); o.userData.noInk = true; o.castShadow = false; m.add(o); }
}
const rbox = (w, h, d, r, s = 4) => new RoundedBoxGeometry(w, h, d, s, r);
const cap = (r, len, cs = 6, rs = 14) => new THREE.CapsuleGeometry(r, len, cs, rs);
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
function shadows(root) { root.traverse(o => { if (o.isMesh && o.material !== OUTLINE) { o.castShadow = true; o.receiveShadow = true; } }); }

// a cartoon glove: puffy palm, 3 fat fingers and a thumb, rolled cuff
function makeGlove(side, mat) {
  const g = new THREE.Group();
  const palm = mesh(new THREE.SphereGeometry(0.085, 18, 12), mat, 0, -0.05, 0, g); palm.scale.set(1.1, 1.15, 0.75);
  mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.07, 18), mat, 0, 0.03, 0, g);
  const fingers = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Group(); f.position.set(-0.05 + i * 0.05, -0.12, 0.005); g.add(f);
    mesh(cap(0.026, 0.06, 6, 12), mat, 0, -0.04, 0, f);
    const tip = new THREE.Group(); tip.position.y = -0.08; f.add(tip);
    mesh(cap(0.024, 0.035, 6, 12), mat, 0, -0.03, 0, tip);
    f.rotation.z = (i - 1) * 0.14; fingers.push({ f, tip });
  }
  const th = new THREE.Group(); th.position.set(side * 0.075, -0.03, 0.02); g.add(th);
  mesh(cap(0.025, 0.05, 6, 12), mat, 0, -0.035, 0, th); th.rotation.z = side * 0.95;
  return { g, fingers };
}

// ================= MR. PAGES: a book for a head, tailcoat, bow tie, cane =================
export function makePages() {
  const root = new THREE.Group();
  const coat = toon(0x4e1220), vest = toon(0x2a1612), pants = toon(0x1e1216), shoe = toon(0x141012);
  const glove = toon(0xf6f2e8), bow = toon(0xa0181e), gold = toon(0xd0a040), cover = toon(0x7a4a2a), page = toon(0xe8dcc0);
  const pagesSide = toon(0xffffff, { map: X.pagesEdgeTex() });
  const HIP = 0.86;
  const body = new THREE.Group(); body.position.y = HIP; root.add(body);
  // torso: vest, tailcoat, buttons, collar
  const torso = mesh(cap(0.2, 0.32, 8, 18), vest, 0, 0.32, 0, body); torso.scale.set(1.15, 1, 0.8);
  for (let i = 0; i < 3; i++) mesh(new THREE.SphereGeometry(0.022, 10, 8), gold, 0, 0.42 - i * 0.1, 0.155, body);
  const coatBack = mesh(cap(0.215, 0.34, 8, 18), coat, 0, 0.33, -0.03, body); coatBack.scale.set(1.2, 1.02, 0.8);
  for (const s of [-1, 1]) { // lapels + coat tails
    const lap = mesh(rbox(0.09, 0.42, 0.05, 0.02), coat, s * 0.15, 0.36, 0.13, body); lap.rotation.z = s * 0.15; lap.rotation.y = -s * 0.35;
    const tail = mesh(rbox(0.16, 0.6, 0.04, 0.02), coat, s * 0.1, -0.12, -0.16, body); tail.rotation.x = 0.12; tail.rotation.z = s * 0.06;
  }
  mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 18), page, 0, 0.66, 0, body); // shirt collar
  // big red bow tie
  const bt = new THREE.Group(); bt.position.set(0, 0.64, 0.12); body.add(bt);
  for (const s of [-1, 1]) { const w = mesh(new THREE.ConeGeometry(0.075, 0.14, 4), bow, s * 0.075, 0, 0, bt); w.rotation.z = s * Math.PI / 2; w.scale.z = 0.5; }
  mesh(new THREE.SphereGeometry(0.035, 12, 10), bow, 0, 0, 0.01, bt);
  // the head: a thick book standing up, brown cover on the side and back, the face on its front page
  const head = new THREE.Group(); head.position.set(0, 0.7, 0); head.scale.setScalar(1.35); body.add(head);
  const book = new THREE.Group(); book.position.y = 0.38; head.add(book);
  const W = 0.66, Hh = 0.74, D = 0.34;
  mesh(rbox(W, Hh, D, 0.04), [pagesSide, page, pagesSide, pagesSide, page, page], 0.02, 0, 0, book);
  mesh(rbox(0.07, Hh + 0.06, D + 0.07, 0.03), cover, -W / 2 - 0.01, 0, 0, book);            // spine
  mesh(rbox(W + 0.06, Hh + 0.06, 0.05, 0.02), cover, 0.01, 0, -D / 2 - 0.01, book);         // back cover
  for (const y of [-0.26, -0.2, 0.2, 0.26]) mesh(rbox(0.08, 0.025, D + 0.08, 0.01), gold, -W / 2 - 0.01, y, 0, book); // spine bands
  const faces = { happy: X.pagesToonFace('happy'), angry: X.pagesToonFace('angry'), scream: X.pagesToonFace('scream') };
  const faceMat = toon(0xffffff, { map: faces.happy });
  const facePlane = mesh(new THREE.PlaneGeometry(W - 0.04, Hh - 0.04), faceMat, 0.02, 0, D / 2 + 0.002, book); facePlane.userData.noInk = true;
  // arms (rubber-hose sleeves) and gloves
  const arms = [], gloves = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.26, 0.52, 0); body.add(sh);
    mesh(new THREE.SphereGeometry(0.075, 14, 10), coat, 0, 0, 0, sh);
    mesh(cap(0.06, 0.26, 6, 14), coat, 0, -0.17, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.33; sh.add(el);
    mesh(cap(0.058, 0.24, 6, 14), coat, 0, -0.15, 0, el);
    mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.05, 14), page, 0, -0.3, 0, el); // shirt cuff
    const gl = makeGlove(s, glove); gl.g.position.y = -0.37; el.add(gl.g);
    arms.push({ sh, el }); gloves.push(gl);
  }
  // the golden cane in his right hand
  const cane = new THREE.Group(); gloves[1].g.add(cane); cane.position.set(0, -0.08, 0.06);
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 10), gold, 0, -0.47, 0, cane);
  mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 16, Math.PI), gold, 0.06, 0.0, 0, cane);
  // legs (rubber hose) and big shiny shoes
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.12, HIP + 0.04, 0); root.add(hip);
    mesh(cap(0.075, 0.3, 6, 14), pants, 0, -0.2, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    mesh(cap(0.07, 0.28, 6, 14), pants, 0, -0.18, 0, knee);
    const ankle = new THREE.Group(); ankle.position.y = -0.4; knee.add(ankle);
    const sh = mesh(new THREE.SphereGeometry(0.12, 18, 12), shoe, 0, -0.04, 0.07, ankle); sh.scale.set(0.95, 0.62, 1.55);
    mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.04, 0.0, 0.17, ankle).userData.noInk = true; // shine
    legs.push({ hip, knee, ankle });
  }
  shadows(root); ink(root);
  let creepy = 0, creepyTarget = 0, faceNow = 'happy';
  const setFace = f => { if (f !== faceNow) { faceNow = f; faceMat.map = faces[f]; faceMat.needsUpdate = true; } };
  const P = {
    root, body, head, book, arms, legs, faceMat, walk: 0, eyeH: 2.12,
    setCreepy(on) { creepyTarget = on ? 1 : 0; if (!on) creepy = 0; setFace(on ? 'angry' : 'happy'); },
    animate(dt, speed, t, mouthOpen = 0) {
      creepy += (creepyTarget - creepy) * Math.min(1, dt * 2);
      setFace(mouthOpen > 0.4 ? 'scream' : creepyTarget ? 'angry' : 'happy');
      P.walk += dt * speed * 2.9;
      const w = P.walk, sw = Math.min(1, speed / 1.5);
      // a bouncy cartoon walk: knees bend, the body bobs, the arms swing
      legs.forEach((L, i) => {
        const ph = i ? Math.PI : 0, ss = Math.sin(w + ph);
        L.hip.rotation.x = -ss * 0.55 * sw;
        L.knee.rotation.x = Math.max(0, Math.cos(w + ph)) * 0.95 * sw;
        L.ankle.rotation.x = -L.hip.rotation.x * 0.5 - L.knee.rotation.x * 0.4;
      });
      arms.forEach((A, i) => {
        const ph = i ? 0 : Math.PI;
        const idle = speed < 0.05 ? (i ? 0.35 : -0.1) : 0; // stands with the cane forward
        A.sh.rotation.x = Math.sin(w + ph) * 0.5 * sw - idle + Math.sin(t * 1.3 + i) * 0.04;
        A.el.rotation.x = -0.3 - Math.max(0, Math.sin(w + ph)) * 0.5 * sw - creepy * 0.4;
        A.sh.rotation.z = (i ? 1 : -1) * (0.22 + creepy * 0.25);
      });
      gloves.forEach((G, i) => G.fingers.forEach((F, k) => { const curl = i === 1 ? 1.2 : 0.3 + creepy * Math.sin(t * 4 + k) * 0.3; F.f.rotation.x = curl; F.tip.rotation.x = curl * 0.7; }));
      body.position.y = HIP + Math.abs(Math.cos(w)) * 0.08 * sw + Math.sin(t * 2) * 0.008;
      body.rotation.z = Math.sin(w) * 0.07 * sw;
      // the book head bobs and tilts; at night it tilts creepily and twitches
      head.rotation.z = Math.sin(t * 1.1) * 0.05 + creepy * (Math.sin(t * 0.9) * 0.18 + (Math.sin(t * 7.3) > 0.97 ? 0.3 : 0));
      head.rotation.x = -0.05 - mouthOpen * 0.25;
      book.scale.set(1 + mouthOpen * 0.15, 1 + mouthOpen * 0.15 + Math.abs(Math.cos(w)) * 0.03 * sw, 1);
    },
  };
  return P;
}

// ================= THE BOOKWORM: a big green worm with glasses =================
export function makeWorm() {
  const root = new THREE.Group();
  const light = toon(0x7cc04e), dark = toon(0x4e8a32), belly = toon(0xb8d878);
  const segs = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const r = 0.42 * (1 - Math.pow(i / N, 1.5) * 0.6);
    const sg = new THREE.Group(); root.add(sg);
    if (i === 0) { const hm = mesh(new THREE.SphereGeometry(0.46, 32, 20), toon(0xffffff, { map: X.wormToonFace() }), 0, 0, 0, sg); hm.scale.set(1, 1, 1.05); }
    else { const m = mesh(new THREE.SphereGeometry(r, 20, 14), i % 2 ? dark : light, 0, 0, 0, sg); m.scale.z = 0.85; mesh(new THREE.SphereGeometry(r * 0.75, 14, 10), belly, 0, -r * 0.35, 0, sg).scale.set(1, 0.6, 0.9); }
    segs.push(sg);
  }
  const head = segs[0];
  const frame = toon(0x141012);
  const glass = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
  for (const s of [-1, 1]) {
    mesh(new THREE.TorusGeometry(0.15, 0.028, 10, 28), frame, s * 0.15, 0.09, 0.42, head);
    const l = mesh(new THREE.CircleGeometry(0.14, 24), glass, s * 0.15, 0.09, 0.43, head); l.userData.noInk = true;
  }
  mesh(new THREE.TorusGeometry(0.04, 0.018, 6, 10, Math.PI), frame, 0, 0.11, 0.44, head);
  for (const s of [-1, 1]) { const a = mesh(cap(0.015, 0.16, 4, 6), dark, s * 0.13, 0.52, 0.05, head); a.rotation.z = -s * 0.35; mesh(new THREE.SphereGeometry(0.035, 10, 8), light, s * 0.17, 0.62, 0.05, head); } // antennae
  shadows(root); ink(root);
  root.visible = false;
  return {
    root, segs, head, spacing: 0.3,
    wiggle(t) { segs.forEach((s, i) => { if (i) { s.rotation.z = Math.sin(t * 20 - i * 0.6) * 0.15; s.scale.y = 1 + Math.sin(t * 14 - i * 0.7) * 0.06; } }); },
  };
}

// ================= THE BOOK BATS: little cartoon bat kids with capes =================
export function makeBats(n = 16) {
  const root = new THREE.Group();
  const fur = toon(0x3a2350), cape = toon(0x241534), earIn = toon(0xc88aa8);
  const faces = [0, 1, 2].map(v => toon(0xffffff, { map: X.batToonFace(v) }));
  const sh = new THREE.Shape(); // a bat wing with a scalloped edge
  sh.moveTo(0, 0.03); sh.quadraticCurveTo(0.1, 0.12, 0.26, 0.1); sh.quadraticCurveTo(0.3, 0.06, 0.32, 0.0);
  sh.quadraticCurveTo(0.27, -0.01, 0.25, -0.06); sh.quadraticCurveTo(0.21, -0.02, 0.17, -0.07); sh.quadraticCurveTo(0.13, -0.02, 0.09, -0.07); sh.quadraticCurveTo(0.05, -0.02, 0, -0.04);
  const wingGeo = new THREE.ShapeGeometry(sh, 8);
  const wingMat = toon(0x2a1838, { side: THREE.DoubleSide });
  const bats = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    mesh(new THREE.SphereGeometry(0.1, 20, 14), faces[i % 3], 0, 0.07, 0, b);
    for (const s of [-1, 1]) {
      const ear = mesh(new THREE.ConeGeometry(0.045, 0.12, 8), fur, s * 0.06, 0.18, -0.01, b); ear.rotation.z = -s * 0.35; ear.scale.z = 0.5;
      const ei = mesh(new THREE.ConeGeometry(0.025, 0.07, 6), earIn, s * 0.06, 0.17, 0.008, b); ei.rotation.z = -s * 0.35; ei.userData.noInk = true;
    }
    mesh(new THREE.ConeGeometry(0.08, 0.16, 12), cape, 0, -0.07, 0, b);
    const wl = new THREE.Group(), wr = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, wingMat); l.scale.x = -1; l.userData.noInk = true; wl.add(l);
    const r = new THREE.Mesh(wingGeo, wingMat); r.userData.noInk = true; wr.add(r);
    wl.position.set(-0.04, -0.02, -0.02); wr.position.set(0.04, -0.02, -0.02);
    b.add(wl, wr);
    if (i === 0) { // one of them still holds a flashlight
      mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.09, 10), toon(0x404040), 0.07, -0.08, 0.06, b).rotation.x = Math.PI / 2;
      const lens = mesh(new THREE.CircleGeometry(0.022, 12), new THREE.MeshBasicMaterial({ color: 0xffe080 }), 0.07, -0.08, 0.106, b); lens.userData.noInk = true;
    }
    b.rotation.order = 'YXZ';
    b.userData = { wl, wr, ph: Math.random() * 6, off: new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6), sp: 0.7 + Math.random() * 0.8 };
    b.scale.setScalar(1.1 + Math.random() * 0.4);
    root.add(b); bats.push(b);
  }
  shadows(root); ink(root);
  root.visible = false;
  return { root, bats };
}
export function animBats(B, dt, t, center, spread = 1) {
  for (const b of B.bats) {
    const u = b.userData;
    const flap = Math.sin(t * 16 * u.sp + u.ph);
    u.wl.rotation.y = flap * 0.9; u.wr.rotation.y = -flap * 0.9;
    const a = t * u.sp * 2 + u.ph;
    const nx = center.x + (u.off.x + Math.cos(a) * 0.5) * spread, nz = center.z + (u.off.z + Math.sin(a) * 0.5) * spread;
    const dir = Math.atan2(nx - b.position.x, nz - b.position.z);
    if (isFinite(dir)) b.rotation.y = dir;
    b.position.set(nx, center.y + (u.off.y + Math.sin(a * 1.3) * 0.25) * spread + flap * 0.03, nz);
  }
}

// ================= A BOOKMARK: a sad ghost ribbon with a coloured knot on top =================
const GHOSTS = [['#ece6f8', 0x3a7ad8], ['#eeeaf0', 0xc0303a], ['#e2f0e2', 0x5a8a3a]];
let ghostN = 0;
export function makeBookmark() {
  const [fill, knotC] = GHOSTS[ghostN++ % GHOSTS.length];
  const root = new THREE.Group();
  const inner = new THREE.Group(); inner.rotation.y = Math.PI; root.add(inner); // face forward (-z)
  const Wd = 0.42, Ht = 1.05, seg = 24;
  const geo = new THREE.PlaneGeometry(Wd, Ht, 4, seg); geo.translate(0, Ht / 2, 0);
  const front = new THREE.Mesh(geo, toon(0xffffff, { map: X.ghostToonTex(fill, true), transparent: true, alphaTest: 0.5, side: THREE.FrontSide }));
  const back = new THREE.Mesh(geo, toon(0xffffff, { map: X.ghostToonTex(fill, false), transparent: true, alphaTest: 0.5, side: THREE.BackSide }));
  front.castShadow = true;
  const body = new THREE.Group(); body.add(front, back); inner.add(body);
  const base = geo.attributes.position.array.slice();
  // the knot and ribbon ends on top
  const knot = new THREE.Group(); body.add(knot);
  const km = toon(knotC);
  mesh(rbox(0.34, 0.075, 0.07, 0.03), km, 0, 0, 0, knot);                     // a band wrapped round the top
  for (let i = 0; i < 3; i++) { const f = mesh(cap(0.028, 0.12, 4, 8), km, (i - 1) * 0.045, 0.1, 0, knot); f.rotation.z = (1 - i) * 0.45; } // a little tuft
  ink(knot);
  const B = {
    root, ribbon: front,
    // floats upright and sways like a ghost; rear = lunges forward to grab
    animate(t, speed, rear = 0) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = base[i * 3 + 1], k = 1 - y / Ht; // 0 at the top, 1 at the tail
        p.setX(i, base[i * 3] * (1 - k * 0.1) + Math.sin(t * 4 + k * 5) * 0.08 * k);
        p.setZ(i, Math.sin(t * 3 + k * 4) * 0.06 * k - k * k * 0.15 * (1 + speed));
      }
      p.needsUpdate = true; geo.computeVertexNormals();
      body.position.y = 0.18 + Math.sin(t * 2.2) * 0.05 + rear * 0.25;
      body.rotation.x = rear * 0.45;
      body.rotation.z = Math.sin(t * 1.5) * 0.06;
      body.scale.setScalar(1 + rear * 0.25);
      knot.position.set(0, Ht - 0.1, 0.0); knot.rotation.z = Math.sin(t * 3) * 0.06;
    },
  };
  return B;
}

// ================= your own hands (the kid's gray hoodie) =================
export function makeHands() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const mat = toon(0xffffff, { map: t });
  const sleeve = toon(0x45434c), cuffM = toon(0x34323a);
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    mesh(rbox(0.085, 0.03, 0.095, 0.014), mat, 0, 0, 0, h);
    [0.055, 0.065, 0.06, 0.048].forEach((L, f) => {
      const fg = new THREE.Group(); fg.position.set(-0.031 + f * 0.021, 0, -0.05); h.add(fg);
      const a = mesh(cap(0.0095, L * 0.5, 4, 8), mat, 0, 0, -L * 0.3, fg); a.rotation.x = Math.PI / 2;
      const j = new THREE.Group(); j.position.z = -L * 0.55; fg.add(j);
      const b = mesh(cap(0.0088, L * 0.4, 4, 8), mat, 0, 0, -L * 0.25, j); b.rotation.x = Math.PI / 2;
      j.rotation.x = -0.25 - f * 0.05; fg.rotation.x = -0.1; fg.rotation.y = (f - 1.5) * 0.06 * s;
    });
    const th = new THREE.Group(); th.position.set(-s * 0.04, -0.005, -0.01); h.add(th);
    const tm = mesh(cap(0.011, 0.04, 4, 8), mat, 0, 0, -0.025, th); tm.rotation.x = Math.PI / 2; th.rotation.y = -s * 0.7;
    const wrist = mesh(cap(0.03, 0.06, 4, 10), mat, 0, -0.004, 0.07, h); wrist.rotation.x = Math.PI / 2; wrist.scale.x = 1.25;
    const arm = mesh(cap(0.052, 0.22, 4, 12), sleeve, 0, -0.008, 0.25, h); arm.rotation.x = Math.PI / 2;
    const cuff = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), cuffM, 0, -0.008, 0.12, h); cuff.rotation.x = Math.PI / 2;
    h.position.set(s * 0.13, -0.25, -0.36); h.rotation.set(0.45, -s * 0.25, s * 0.35);
    g.add(h);
  }
  ink(g);
  g.visible = false;
  const ctx = cv.getContext('2d');
  const paper = X.paperTex(0, 256, 256).image;
  return {
    root: g,
    paint(k) { // k = how much of the hands has turned into paper, creeping up from the fingertips
      ctx.fillStyle = '#f0c8a8'; ctx.fillRect(0, 0, 256, 256);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, k * 290 + Math.sin(x * 0.25) * 14 + Math.sin(x * 0.9) * 6);
      ctx.lineTo(256, 0); ctx.closePath(); ctx.clip(); ctx.drawImage(paper, 0, 0); ctx.restore();
      t.needsUpdate = true;
    },
  };
}
