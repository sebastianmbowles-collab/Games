// The villains' bodies, built from smooth shapes (rounded boxes, capsules, lathes, tubes).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as X from './tex.js';

const phys = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.8, ...o });
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });
const rbox = (w, h, d, r, s = 4) => new RoundedBoxGeometry(w, h, d, s, r);
const cap = (r, len, cs = 6, rs = 14) => new THREE.CapsuleGeometry(r, len, cs, rs);
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
function shadows(root) { root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }

// soft felt / foam fabric (the mascot costume)
function feltMat(color, sheenColor) {
  const f = X.feltTex();
  return phys({ color, map: f.map, bumpMap: f.bump, bumpScale: 0.6, roughness: 0.95, sheen: 1, sheenRoughness: 0.55, sheenColor: sheenColor ?? color });
}

// a cartoon glove: puffy palm, 3 fat fingers and a thumb, rolled cuff
function makeGlove(side, mat, clawMat) {
  const g = new THREE.Group();
  const palm = mesh(new THREE.SphereGeometry(0.1, 20, 14), mat, 0, -0.06, 0, g); palm.scale.set(1.05, 1.15, 0.72);
  mesh(new THREE.TorusGeometry(0.075, 0.03, 10, 22), mat, 0, 0.04, 0, g).rotation.x = Math.PI / 2;
  const fingers = [], claws = [];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Group(); f.position.set(-0.055 + i * 0.055, -0.15, 0.01); g.add(f);
    mesh(cap(0.034, 0.07, 6, 12), mat, 0, -0.045, 0, f);
    const tip = new THREE.Group(); tip.position.y = -0.09; f.add(tip);
    mesh(cap(0.03, 0.04, 6, 12), mat, 0, -0.035, 0, tip);
    // sharp paper claws that slide out at night
    const c = mesh(new THREE.ConeGeometry(0.018, 0.12, 6), clawMat, 0, -0.1, 0, tip); c.rotation.x = Math.PI; c.scale.y = 0.01; claws.push(c);
    f.rotation.z = (i - 1) * 0.12; fingers.push({ f, tip });
  }
  const th = new THREE.Group(); th.position.set(side * 0.085, -0.04, 0.03); g.add(th);
  mesh(cap(0.032, 0.06, 6, 12), mat, 0, -0.04, 0, th); th.rotation.z = side * 0.9;
  return { g, fingers, claws, thumb: th };
}

// a big round mascot boot
function makeBoot(mat, soleMat, laceMat) {
  const g = new THREE.Group();
  mesh(rbox(0.22, 0.17, 0.34, 0.07), mat, 0, 0.08, 0.04, g);
  const toe = mesh(new THREE.SphereGeometry(0.115, 18, 12), mat, 0, 0.075, 0.17, g); toe.scale.set(1, 0.78, 1.05);
  mesh(rbox(0.25, 0.05, 0.44, 0.02), soleMat, 0, 0.01, 0.07, g);
  mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.16, 18), mat, 0, 0.2, -0.02, g); // ankle
  for (let i = 0; i < 3; i++) mesh(rbox(0.12, 0.012, 0.02, 0.005), laceMat, 0, 0.15 + i * 0.035, 0.09 - i * 0.02, g).rotation.x = -0.5;
  return g;
}

// ================= MR. PAGES: the library's mascot, a book-shaped costume =================
export function makePages() {
  const root = new THREE.Group();
  const red = feltMat(0x9a1e18, 0xff8a70), dark = feltMat(0x3a0c0a, 0x8a3a30), cream = feltMat(0xe8dcc0, 0xffffff);
  const gold = phys({ color: 0xc9a040, roughness: 0.35, metalness: 0.85, clearcoat: 0.6 });
  const glove = feltMat(0xf4efe4, 0xffffff), boot = phys({ color: 0x5a1410, roughness: 0.4, clearcoat: 0.8, clearcoatRoughness: 0.3 });
  const sole = std({ color: 0x1a0e0a, roughness: 0.9 }), lace = std({ color: 0xf0e8d0 });
  const tights = feltMat(0x2a1612, 0x6a4a40);
  const paper = std({ color: 0xeee6d2, roughness: 0.9 });
  const pagesMat = phys({ map: X.pagesEdgeTex(), roughness: 0.95, sheen: 0.4, sheenColor: 0xffffff });

  const BW = 1.05, BH = 1.36, BD = 0.5, HIP = 0.86;
  const body = new THREE.Group(); body.position.y = HIP; root.add(body);
  const book = new THREE.Group(); book.position.y = 0.06; body.add(book);   // tilts like a head
  // the puffy page block (cream, showing on three sides)
  mesh(rbox(BW - 0.08, BH - 0.08, BD - 0.1, 0.07), pagesMat, 0.03, BH / 2, 0, book);
  // back cover and spine
  mesh(rbox(BW, BH, 0.09, 0.04), red, 0, BH / 2, -BD / 2 + 0.03, book);
  const spine = mesh(cap(0.1, BH - 0.2, 8, 18), red, -BW / 2 + 0.02, BH / 2, 0, book); spine.scale.set(1, 1, BD / 0.22);
  for (const y of [0.18, 0.32, BH - 0.32, BH - 0.18]) { const b = mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), gold, -BW / 2 + 0.02, y, 0, book); b.rotation.x = Math.PI / 2; b.scale.set(1, BD / 0.22, 1); }
  // gold corners on the back
  for (const [sx, sy] of [[1, 0], [1, 1]]) mesh(rbox(0.14, 0.14, 0.1, 0.03), gold, sx * (BW / 2 - 0.05), sy * BH + (sy ? -0.05 : 0.05), -BD / 2 + 0.03, book);
  // a costume zipper up the back (look closely...)
  mesh(rbox(0.03, BH - 0.3, 0.02, 0.01), gold, 0.1, BH / 2, -BD / 2 - 0.02, book);
  mesh(rbox(0.06, 0.09, 0.03, 0.015), gold, 0.1, BH - 0.2, -BD / 2 - 0.035, book);
  // the front cover hangs on a hinge at the spine: it opens like a mouth
  const hinge = new THREE.Group(); hinge.position.set(-BW / 2 + 0.02, 0, BD / 2 - 0.03); book.add(hinge);
  const cover = new THREE.Group(); cover.position.set(BW / 2, 0, 0); hinge.add(cover);
  mesh(rbox(BW, BH, 0.08, 0.035), red, 0, BH / 2, 0.0, cover);
  for (const [sx, sy] of [[1, 0], [1, 1]]) mesh(rbox(0.15, 0.15, 0.1, 0.03), gold, sx * (BW / 2 - 0.06), sy * BH + (sy ? -0.06 : 0.06), 0.01, cover);
  // painted face panel
  const cuteTex = X.pagesFaceTex(false, true), creepyTex = X.pagesFaceTex(true, true);
  const faceMat = phys({ map: cuteTex, roughness: 0.85, sheen: 0.6, sheenColor: 0xffb0a0, emissive: 0xffffff, emissiveMap: cuteTex, emissiveIntensity: 0.1 });
  const face = mesh(new THREE.PlaneGeometry(BW - 0.16, BH - 0.16), faceMat, 0, BH / 2, 0.042, cover);
  // big foam eyes that bulge out of the cover
  const eyeWhite = phys({ color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const pupilMat = phys({ color: 0x080808, roughness: 0.15, clearcoat: 1 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  for (const ex of [-0.16, 0.16]) {
    const e = new THREE.Group(); e.position.set(ex, BH * 0.6, 0.05); cover.add(e);
    const ball = mesh(new THREE.SphereGeometry(0.135, 28, 20), eyeWhite, 0, 0, 0, e); ball.scale.set(0.85, 1, 0.5);
    const pup = new THREE.Group(); e.add(pup);
    const p = mesh(new THREE.SphereGeometry(0.06, 20, 14), pupilMat, 0, -0.01, 0.055, pup); p.scale.z = 0.4;
    const s = mesh(new THREE.SphereGeometry(0.018, 10, 8), shineMat, 0.022, 0.025, 0.08, pup);
    // ink tears (hidden until his true nature shows)
    const drips = [];
    for (let i = 0; i < 3; i++) { const d = mesh(cap(0.02, 0.22 + i * 0.07, 4, 8), pupilMat, -0.05 + i * 0.05, -0.17 - i * 0.03, 0.03, e); d.scale.y = 0.01; drips.push(d); }
    eyes.push({ e, ball, pup, p, s, drips });
  }
  // paper teeth inside the mouth (seen when the cover opens)
  const mouthGroup = new THREE.Group(); mouthGroup.position.set(0.03, 0, BD / 2 - 0.06); book.add(mouthGroup);
  const mouthBack = mesh(new THREE.CircleGeometry(0.34, 30), std({ color: 0x160303, roughness: 1 }), 0, BH * 0.45, 0.005, mouthGroup); mouthBack.scale.y = 1.15;
  const teeth = new THREE.Group(); mouthGroup.add(teeth);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * 2.4;
    const t = mesh(new THREE.ConeGeometry(0.03, 0.16 + (i % 2) * 0.05, 5), paper, Math.sin(a) * 0.3, BH * 0.45 + (row ? -1 : 1) * (0.32 * Math.cos(a * 0.6)), 0.03, teeth);
    t.rotation.z = row ? 0 : Math.PI;
  }
  teeth.visible = false;
  // sleeves, elbows, gloves
  const arms = [], gloves = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * (BW / 2 + 0.02), BH * 0.68, 0.02); book.add(sh);
    mesh(new THREE.SphereGeometry(0.1, 16, 12), red, 0, 0, 0, sh);
    mesh(cap(0.075, 0.3, 6, 14), red, 0, -0.2, 0, sh);
    const el = new THREE.Group(); el.position.y = -0.38; sh.add(el);
    mesh(cap(0.068, 0.26, 6, 14), red, 0, -0.16, 0, el);
    const gl = makeGlove(s, glove, paper); gl.g.position.y = -0.36; el.add(gl.g);
    sh.rotation.z = s * 0.18;
    arms.push({ sh, el }); gloves.push(gl);
  }
  // legs with knees, and big boots
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.24, HIP + 0.04, 0); root.add(hip);
    mesh(cap(0.12, 0.26, 6, 16), tights, 0, -0.2, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -0.42; hip.add(knee);
    mesh(cap(0.11, 0.24, 6, 16), tights, 0, -0.18, 0, knee);
    const ankle = new THREE.Group(); ankle.position.y = -0.4; knee.add(ankle);
    const b = makeBoot(boot, sole, lace); b.position.y = -0.1; ankle.add(b);
    legs.push({ hip, knee, ankle });
  }
  shadows(root);
  let creepy = 0, creepyTarget = 0;
  const P = {
    root, body, book, hinge, teeth, arms, legs, faceMat, eyes, walk: 0, mood: 0, look: new THREE.Vector2(),
    setCreepy(on) {
      creepyTarget = on ? 1 : 0;
      faceMat.map = faceMat.emissiveMap = on ? creepyTex : cuteTex; faceMat.needsUpdate = true;
      teeth.visible = on;
      if (!on) creepy = 0;
      for (const e of eyes) { e.ball.material = on ? pupilMat : eyeWhite; e.p.material = on ? shineMat : pupilMat; e.s.visible = !on; }
    },
    animate(dt, speed, t, mouthOpen = 0) {
      creepy += (creepyTarget - creepy) * Math.min(1, dt * 2);
      P.walk += dt * speed * 2.9;
      const w = P.walk, sw = Math.min(1, speed / 1.5);
      const s = Math.sin(w), c = Math.cos(w);
      // legs: swing from the hip, bend the knee on the way forward, heavy stomp
      legs.forEach((L, i) => {
        const ph = i ? Math.PI : 0, ss = Math.sin(w + ph);
        L.hip.rotation.x = -ss * 0.5 * sw;
        L.knee.rotation.x = Math.max(0, Math.cos(w + ph)) * 0.9 * sw;
        L.ankle.rotation.x = -L.hip.rotation.x * 0.5 - L.knee.rotation.x * 0.4;
      });
      arms.forEach((A, i) => {
        const ph = i ? 0 : Math.PI;
        A.sh.rotation.x = Math.sin(w + ph) * 0.45 * sw + Math.sin(t * 1.3 + i) * 0.04;
        A.el.rotation.x = -0.25 - Math.max(0, Math.sin(w + ph)) * 0.5 * sw - creepy * 0.3;
        A.sh.rotation.z = (i ? 1 : -1) * (0.18 + creepy * 0.12);
      });
      gloves.forEach((G, i) => {
        G.fingers.forEach((F, k) => { const curl = creepy ? 0.25 + Math.sin(t * 4 + k + i) * 0.25 : 0.3; F.f.rotation.x = curl; F.tip.rotation.x = curl * 0.8; });
        G.claws.forEach(cl => { cl.scale.y += ((creepy > 0.5 ? 1 : 0.01) - cl.scale.y) * Math.min(1, dt * 3); });
      });
      // the body bobs and sways; the book tilts like a head
      body.position.y = HIP + Math.abs(c) * 0.07 * sw + Math.sin(t * 2) * 0.008;
      body.rotation.z = s * 0.06 * sw;
      book.rotation.x = -0.05 + Math.sin(t * 0.7) * 0.02;
      book.rotation.z = creepy * Math.sin(t * 0.9) * 0.12 + (creepy && Math.sin(t * 7.3) > 0.97 ? 0.25 : 0); // creepy head tilt + twitch
      hinge.rotation.y = -(0.04 + mouthOpen * 0.85 + creepy * Math.max(0, Math.sin(t * 2.1)) * 0.14);
      // eyes look around; ink drips grow at night
      for (const e of eyes) {
        e.pup.position.x = Math.sin(t * 0.6) * 0.03 * (1 - creepy);
        e.pup.position.y = Math.cos(t * 0.45) * 0.015;
        e.drips.forEach((d, k) => { d.scale.y = 0.01 + creepy * (0.7 + Math.sin(t * 0.8 + k * 2) * 0.3); d.position.y = -0.12 - d.scale.y * (0.1 + k * 0.03); });
        e.e.scale.setScalar(1 + creepy * 0.1);
      }
    },
  };
  return P;
}

// ================= THE BOOKWORM =================
// a long soft caterpillar made of pages, with big round glasses and a ring of paper teeth
export function makeWorm() {
  const root = new THREE.Group();
  const skinTex = X.wormSkinTex();
  const skin = phys({ color: 0x9a6a5c, map: skinTex.map, bumpMap: skinTex.bump, bumpScale: 2.5, roughness: 0.5, sheen: 0.25, sheenColor: 0x7a4a40, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  const pageMat = std({ map: X.paperTex(1, 128, 128), color: 0xb0a088, side: THREE.DoubleSide, roughness: 1 });
  const segs = [];
  const N = 22;
  for (let i = 0; i < N; i++) {
    const r = 0.44 * (1 - Math.pow(i / N, 1.6) * 0.65);
    const sg = new THREE.Group(); root.add(sg);
    const m = mesh(new THREE.SphereGeometry(r, 24, 16), skin, 0, 0, 0, sg); m.scale.z = 0.9;
    if (i > 0 && i % 2 === 0) { // pages sticking out of the body like fins
      for (let k = 0; k < 3; k++) { const pg = mesh(new THREE.PlaneGeometry(r * 0.9, r * 0.7), pageMat, 0, 0, 0, sg); pg.rotation.set(0, 0, k * 2.1 + i); pg.position.set(Math.cos(k * 2.1 + i) * r * 0.9, Math.sin(k * 2.1 + i) * r * 0.9, 0); pg.rotation.y = Math.PI / 2; pg.userData.fin = true; }
    }
    segs.push(sg);
  }
  const head = segs[0];
  head.children[0].scale.set(1.1, 1.05, 1.0);
  const frame = phys({ color: 0x15110e, roughness: 0.3, metalness: 0.6, clearcoat: 1 });
  const glass = phys({ color: 0xffffff, roughness: 0.05, transmission: 0.6, thickness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 });
  const eyeW = phys({ map: X.bloodshotTex(), roughness: 0.25, clearcoat: 1, emissive: 0x221008, emissiveIntensity: 0.3 });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const pupils = [];
  for (const s of [-1, 1]) {
    mesh(new THREE.TorusGeometry(0.17, 0.025, 12, 32), frame, s * 0.19, 0.12, 0.42, head);
    mesh(new THREE.CircleGeometry(0.16, 28), glass, s * 0.19, 0.12, 0.43, head);
    const eb = mesh(new THREE.SphereGeometry(0.12, 20, 14), eyeW, s * 0.19, 0.12, 0.34, head); eb.scale.z = 0.6; // magnified, staring eyes
    const pu = mesh(new THREE.SphereGeometry(0.014, 10, 8), black, s * 0.19, 0.12, 0.41, head); pupils.push(pu);
    const lid = mesh(new THREE.SphereGeometry(0.125, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), skin, s * 0.19, 0.125, 0.34, head); lid.rotation.x = 0.5; lid.scale.z = 0.62; // heavy, tired eyelids
    const arm = mesh(cap(0.012, 0.3, 4, 6), frame, s * 0.38, 0.14, 0.25, head); arm.rotation.x = Math.PI / 2;
  }
  mesh(rbox(0.1, 0.03, 0.03, 0.01), frame, 0, 0.13, 0.44, head);
  // a gaping round mouth: wet lips and rings of sharp paper teeth
  const lip = mesh(new THREE.TorusGeometry(0.2, 0.028, 12, 32), phys({ color: 0x5a1a18, roughness: 0.3, clearcoat: 1 }), 0, -0.2, 0.37, head); lip.scale.y = 0.9;
  const throat = mesh(new THREE.SphereGeometry(0.19, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0x2a0404, roughness: 0.9, side: THREE.BackSide }), 0, -0.2, 0.36, head); throat.rotation.x = -Math.PI / 2;
  const toothM = phys({ color: 0xf0e8d4, roughness: 0.4, clearcoat: 0.6 });
  for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + ring * 0.22, rr = 0.18 - ring * 0.045;
    const t = mesh(new THREE.ConeGeometry(0.026 - ring * 0.005, 0.12 - ring * 0.025, 5), toothM, Math.cos(a) * rr * 0.92, -0.2 + Math.sin(a) * rr * 0.85, 0.365 - ring * 0.05, head);
    t.rotation.set(0, 0, a + Math.PI / 2); t.rotateX(-0.25); // point into the mouth
  }
  shadows(root);
  root.visible = false;
  return {
    root, segs, head, spacing: 0.3,
    wiggle(t) { segs.forEach((s, i) => { s.rotation.z = Math.sin(t * 20 - i * 0.6) * 0.15; s.children.forEach(c => { if (c.userData.fin) c.rotation.x = Math.sin(t * 25 + i) * 0.5; }); }); pupils.forEach((p, i) => { p.position.x = (i ? 0.19 : -0.19) + Math.sin(t * 37) * 0.02; p.position.y = 0.12 + Math.cos(t * 29) * 0.015; }); },
  };
}

// ================= THE BOOK BATS: a swarm of torn pages =================
export function makeBats(n = 16) {
  const root = new THREE.Group();
  const paperT = X.paperTex(0, 256, 128);
  const wingMat = phys({ map: paperT, side: THREE.DoubleSide, roughness: 1, sheen: 0.3, sheenColor: 0xffffff, transparent: false });
  // a scalloped bat wing cut from a page
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.02); sh.quadraticCurveTo(0.08, 0.09, 0.2, 0.07); sh.quadraticCurveTo(0.24, 0.05, 0.26, 0.0);
  sh.quadraticCurveTo(0.22, -0.01, 0.2, -0.05); sh.quadraticCurveTo(0.17, -0.02, 0.14, -0.06); sh.quadraticCurveTo(0.11, -0.02, 0.07, -0.06); sh.quadraticCurveTo(0.04, -0.02, 0, -0.03);
  const inner = new THREE.ShapeGeometry(sh, 6);
  const uv = inner.attributes.uv, pos = inner.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 0.26, pos.getY(i) / 0.18 + 0.5);
  const bodyM = phys({ color: 0x2a2018, roughness: 0.7, sheen: 1, sheenColor: 0x6a5a4a });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xff3010 });
  const bats = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const wl = new THREE.Group(), wr = new THREE.Group();
    const l = new THREE.Mesh(inner, wingMat); l.scale.x = -1; wl.add(l);
    const r = new THREE.Mesh(inner, wingMat); wr.add(r);
    wl.position.x = -0.02; wr.position.x = 0.02;
    b.add(wl, wr);
    const bd = mesh(cap(0.028, 0.06, 4, 10), bodyM, 0, 0, 0, b); bd.rotation.x = Math.PI / 2;
    mesh(new THREE.SphereGeometry(0.03, 12, 10), bodyM, 0, 0.01, 0.05, b);
    for (const s of [-1, 1]) { mesh(new THREE.ConeGeometry(0.012, 0.035, 5), bodyM, s * 0.016, 0.04, 0.05, b); mesh(new THREE.SphereGeometry(0.008, 6, 4), eyeM, s * 0.013, 0.015, 0.078, b); }
    b.rotation.order = 'YXZ';
    b.userData = { wl, wr, ph: Math.random() * 6, off: new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6), sp: 0.7 + Math.random() * 0.8 };
    b.scale.setScalar(0.9 + Math.random() * 0.5);
    root.add(b); bats.push(b);
  }
  root.visible = false;
  return { root, bats };
}
export function animBats(B, dt, t, center, spread = 1) {
  for (const b of B.bats) {
    const u = b.userData;
    const flap = Math.sin(t * 18 * u.sp + u.ph);
    u.wl.rotation.z = -flap * 0.9; u.wr.rotation.z = flap * 0.9;
    u.wl.rotation.y = u.wr.rotation.y = 0;
    const a = t * u.sp * 2 + u.ph;
    const nx = center.x + (u.off.x + Math.cos(a) * 0.5) * spread, nz = center.z + (u.off.z + Math.sin(a) * 0.5) * spread;
    b.rotation.y = Math.atan2(nx - b.position.x, nz - b.position.z) || b.rotation.y;
    b.rotation.x = -flap * 0.15;
    b.position.set(nx, center.y + (u.off.y + Math.sin(a * 1.3) * 0.25) * spread + flap * 0.03, nz);
  }
}

// ================= A BOOKMARK: a satin ribbon with a tassel, a notched head and eyes =================
export function makeBookmark(color = 0x8a1020) {
  const root = new THREE.Group();
  const seg = 40, len = 1.9, wid = 0.16;
  const geo = new THREE.BoxGeometry(wid, 0.012, len, 1, 1, seg);
  const satin = phys({ color, roughness: 0.32, sheen: 1, sheenRoughness: 0.25, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.15), clearcoat: 0.4 });
  const ribbon = new THREE.Mesh(geo, satin); ribbon.castShadow = true; root.add(ribbon);
  const base = geo.attributes.position.array.slice();
  // the head: a flat satin hood (it flares out when it rears up), glowing eyes and two fangs
  const head = new THREE.Group(); root.add(head);
  const hood = mesh(new THREE.SphereGeometry(0.1, 20, 12), satin, 0, 0, 0.02, head); hood.scale.set(1.1, 0.08, 1.3);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffd040 }), pupM = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.02, 12, 10), eyeM, s * 0.045, 0.016, 0.07, head); e.scale.set(1.3, 0.7, 1);
    const sl = mesh(new THREE.BoxGeometry(0.006, 0.006, 0.03), pupM, s * 0.045, 0.03, 0.085, head); sl.rotation.x = 0.4;
    const f = mesh(new THREE.ConeGeometry(0.008, 0.045, 5), phys({ color: 0xf4eee0, roughness: 0.3 }), s * 0.02, -0.012, 0.12, head); f.rotation.x = Math.PI / 2 + 0.6;
  }
  const glow = new THREE.PointLight(0xffb030, 0, 1.2, 2); glow.position.set(0, 0.08, 0.12); head.add(glow);
  // a gold-capped tassel with lots of threads
  const tassel = new THREE.Group(); root.add(tassel);
  const goldM = phys({ color: 0xc9a040, roughness: 0.3, metalness: 0.9 });
  mesh(new THREE.SphereGeometry(0.035, 12, 10), goldM, 0, 0, 0, tassel);
  const threadM = phys({ color: 0xd8b050, roughness: 0.6, sheen: 1, sheenColor: 0xffe8a0 });
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const th = mesh(cap(0.006, 0.16, 2, 4), threadM, Math.cos(a) * 0.022, 0, 0.1, tassel); th.rotation.x = Math.PI / 2; th.position.y = Math.sin(a) * 0.022; }
  shadows(root);
  const B = {
    root, ribbon,
    // slither: the ribbon waves sideways; the head is at -z (forward); rear = rise up like a snake
    animate(t, speed, rear = 0) {
      const p = geo.attributes.position;
      const k0 = 0.3; // front part that can rear up
      let hx = 0, hy = 0, hz = 0;
      for (let i = 0; i < p.count; i++) {
        const z = base[i * 3 + 2]; const k = (z + len / 2) / len; // 0 at head, 1 at tail
        const wave = Math.sin(t * 6 * (0.4 + speed) + k * 10) * 0.16 * (0.3 + k);
        const lift = k < k0 ? rear * Math.pow((k0 - k) / k0, 1.6) * 0.75 : 0;
        p.setX(i, base[i * 3] + wave);
        p.setY(i, base[i * 3 + 1] + 0.012 + lift);
        p.setZ(i, z + lift * 0.4);
      }
      p.needsUpdate = true; geo.computeVertexNormals();
      hx = Math.sin(t * 6 * (0.4 + speed)) * 0.16 * 0.3; hy = 0.02 + rear * 0.75; hz = -len / 2 + rear * 0.3;
      head.position.set(hx, hy, hz - 0.02); head.rotation.x = -rear * 1.1; head.rotation.y = Math.PI;
      hood.scale.set(1.1 + rear * 0.6, 0.08, 1.3 + rear * 0.25); glow.intensity = rear * 0.1;
      tassel.position.set(Math.sin(t * 6 * (0.4 + speed) + 10) * 0.21, 0.04, len / 2 + 0.03);
      tassel.rotation.y = Math.sin(t * 3) * 0.3;
    },
  };
  return B;
}

// ================= your own hands (for the ending) =================
export function makeHands() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const mat = phys({ map: t, roughness: 0.6, sheen: 0.5, sheenColor: 0xffc8b0 });
  const sleeve = feltMat(0x2a3a6a, 0x6a7ab0);
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    const palm = mesh(rbox(0.085, 0.03, 0.095, 0.014), mat, 0, 0, 0, h);
    const fingerLen = [0.055, 0.065, 0.06, 0.048];
    fingerLen.forEach((L, f) => {
      const fg = new THREE.Group(); fg.position.set(-0.031 + f * 0.021, 0, -0.05); h.add(fg);
      const a = mesh(cap(0.0095, L * 0.5, 4, 8), mat, 0, 0, -L * 0.3, fg); a.rotation.x = Math.PI / 2;
      const j = new THREE.Group(); j.position.z = -L * 0.55; fg.add(j);
      const b = mesh(cap(0.0088, L * 0.4, 4, 8), mat, 0, 0, -L * 0.25, j); b.rotation.x = Math.PI / 2;
      j.rotation.x = -0.25 - f * 0.05; fg.rotation.x = -0.1;
      fg.rotation.y = (f - 1.5) * 0.06 * s;
    });
    const th = new THREE.Group(); th.position.set(-s * 0.04, -0.005, -0.01); h.add(th);
    const tm = mesh(cap(0.011, 0.04, 4, 8), mat, 0, 0, -0.025, th); tm.rotation.x = Math.PI / 2; th.rotation.y = -s * 0.7;
    const wrist = mesh(cap(0.03, 0.06, 4, 10), mat, 0, -0.004, 0.07, h); wrist.rotation.x = Math.PI / 2; wrist.scale.x = 1.25;
    const arm = mesh(cap(0.045, 0.22, 4, 12), sleeve, 0, -0.008, 0.23, h); arm.rotation.x = Math.PI / 2;
    const cuff = mesh(new THREE.TorusGeometry(0.044, 0.01, 8, 18), sleeve, 0, -0.008, 0.115, h);
    h.position.set(s * 0.13, -0.25, -0.36); h.rotation.set(0.45, -s * 0.25, s * 0.35);
    g.add(h);
  }
  g.visible = false;
  const ctx = cv.getContext('2d');
  const paper = X.paperTex(0, 256, 256).image;
  return {
    root: g,
    // k = how much of the hands has turned into paper (0..1), creeping up from the fingertips
    paint(k) {
      const gr = ctx.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#e0b090'); gr.addColorStop(1, '#c89474');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 256, 256);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, k * 290 + Math.sin(x * 0.25) * 14 + Math.sin(x * 0.9) * 6);
      ctx.lineTo(256, 0); ctx.closePath(); ctx.clip(); ctx.drawImage(paper, 0, 0); ctx.restore();
      t.needsUpdate = true;
    },
  };
}
