// The villains' bodies (all built from shapes).
import * as THREE from 'three';
import * as X from './tex.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, ...o });

// ---------------- MR. PAGES: a giant walking book ----------------
export function makePages() {
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 0.78; root.add(body);
  const BW = 0.95, BH = 1.3, BD = 0.34;
  const leather = std({ color: 0x7a1c16, roughness: 0.55 });
  const pagesMat = std({ map: X.pagesEdgeTex(), roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.05), leather); back.position.set(0, BH / 2, -BD / 2); body.add(back);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.07, BH, BD + 0.05), leather); spine.position.set(-BW / 2, BH / 2, 0); body.add(spine);
  const block = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.08, BH - 0.06, BD - 0.06), pagesMat); block.position.set(0.02, BH / 2, 0); body.add(block);
  // mouth inside the pages (seen when the cover opens)
  const mouthCv = document.createElement('canvas'); mouthCv.width = 256; mouthCv.height = 352;
  const mg = mouthCv.getContext('2d'); mg.fillStyle = '#e6dcc0'; mg.fillRect(0, 0, 256, 352);
  mg.fillStyle = '#1a0404'; mg.beginPath(); mg.ellipse(128, 200, 100, 120, 0, 0, 7); mg.fill();
  mg.fillStyle = '#f0e8d0';
  for (let i = 0; i < 9; i++) { const x = 40 + i * 22; mg.beginPath(); mg.moveTo(x - 9, 95); mg.lineTo(x + 9, 95); mg.lineTo(x, 150 + (i % 2) * 20); mg.fill(); mg.beginPath(); mg.moveTo(x - 9, 310); mg.lineTo(x + 9, 310); mg.lineTo(x, 255 - (i % 2) * 20); mg.fill(); }
  const mt = new THREE.CanvasTexture(mouthCv); mt.colorSpace = THREE.SRGBColorSpace;
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.12, BH - 0.1), std({ map: mt, roughness: 1 }));
  mouth.position.set(0.02, BH / 2, BD / 2 - 0.029); body.add(mouth);
  // front cover on a hinge at the spine
  const hinge = new THREE.Group(); hinge.position.set(-BW / 2, 0, BD / 2); body.add(hinge);
  const cuteTex = X.pagesFaceTex(false), creepyTex = X.pagesFaceTex(true);
  const faceMat = std({ map: cuteTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: cuteTex, emissiveIntensity: 0.12 });
  const coverMats = [leather, leather, leather, leather, faceMat, leather];
  const cover = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.05), coverMats); cover.position.set(BW / 2, BH / 2, 0.025); hinge.add(cover);
  // creepy eyes that glow a little in the dark (only at night)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe0c0, transparent: true, opacity: 0 });
  for (const ex of [0.33, 0.67]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.012, 8), eyeMat); e.position.set(BW * ex - 0.0, BH * 0.6, 0.052); cover.add(e); }
  // paper teeth sticking out of the page block
  const teeth = new THREE.Group();
  const toothMat = std({ color: 0xece2c6, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 4), toothMat);
    t.rotation.x = Math.PI / 2; t.position.set(-0.32 + i * 0.09, BH * 0.36 + (i % 2) * 0.03, BD / 2 + 0.02); teeth.add(t);
  }
  teeth.visible = false; body.add(teeth);
  // arms (thin, with mascot gloves), legs with big shoes
  const limbMat = std({ color: 0x1a1410, roughness: 0.7 }), glove = std({ color: 0xe8e4da, roughness: 0.6 });
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * (BW / 2 + 0.03), BH * 0.68, 0); body.add(sh);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), limbMat); arm.position.y = -0.37; sh.add(arm);
    const hand = new THREE.Group(); hand.position.y = -0.78; sh.add(hand);
    hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glove));
    for (let f = 0; f < 4; f++) { // long paper fingers
      const fg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.012), toothMat); fg.position.set(-0.045 + f * 0.03, -0.14, 0.02); fg.rotation.z = (f - 1.5) * 0.12; hand.add(fg);
    }
    sh.rotation.z = s * 0.15; arms.push(sh);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.22, 0.8, 0); root.add(hip);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.72, 6), limbMat); leg.position.y = -0.38; hip.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.32), std({ color: 0x2a0a08, roughness: 0.4 })); shoe.position.set(0, -0.76, 0.07); hip.add(shoe);
    legs.push(hip);
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  const P = {
    root, body, hinge, teeth, arms, legs, faceMat, eyeMat, cuteTex, creepyTex, walk: 0,
    setCreepy(on) { faceMat.map = faceMat.emissiveMap = on ? creepyTex : cuteTex; faceMat.needsUpdate = true; teeth.visible = on; eyeMat.opacity = on ? 0.9 : 0; },
    animate(dt, speed, t, mouthOpen = 0) {
      P.walk += dt * speed * 3.2;
      const s = Math.sin(P.walk), sw = Math.min(1, speed);
      legs[0].rotation.x = s * 0.55 * sw; legs[1].rotation.x = -s * 0.55 * sw;
      arms[0].rotation.x = -s * 0.4 * sw + Math.sin(t * 1.7) * 0.05; arms[1].rotation.x = s * 0.4 * sw;
      body.position.y = 0.78 + Math.abs(Math.cos(P.walk)) * 0.06 * sw;
      body.rotation.z = Math.sin(P.walk) * 0.05 * sw;
      hinge.rotation.y = -(0.08 + mouthOpen * 0.9 + Math.max(0, Math.sin(t * 2.3)) * 0.12 * (teeth.visible ? 1 : 0));
    },
  };
  return P;
}

// ---------------- THE BOOKWORM ----------------
export function makeWorm() {
  const root = new THREE.Group();
  const skin = std({ map: X.paperTex(1), color: 0xb89a88, roughness: 0.85 });
  const segs = [];
  for (let i = 0; i < 11; i++) {
    const r = 0.42 - i * 0.025;
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), skin);
    root.add(m); segs.push(m);
  }
  const head = segs[0];
  const glassMat = std({ color: 0x202020, metalness: 0.8, roughness: 0.3 });
  const lens = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0c0, emissiveIntensity: 0.6, transparent: true, opacity: 0.55 });
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 16), glassMat); rim.position.set(s * 0.15, 0.1, 0.38); head.add(rim);
    const l = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), lens); l.position.set(s * 0.15, 0.1, 0.385); head.add(l);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), new THREE.MeshBasicMaterial({ color: 0x000000 })); pupil.position.set(s * 0.15, 0.08, 0.39); head.add(pupil);
  }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.17, 18), new THREE.MeshBasicMaterial({ color: 0x120202 })); mouth.position.set(0, -0.14, 0.39); mouth.scale.y = 0.7; head.add(mouth);
  const tm = std({ color: 0xeee6d0 });
  for (let i = 0; i < 7; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), tm); const a = i / 7 * Math.PI * 2; t.position.set(Math.cos(a) * 0.13, -0.14 + Math.sin(a) * 0.09, 0.4); t.rotation.x = Math.PI / 2; head.add(t); }
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.visible = false;
  return { root, segs, head };
}

// ---------------- THE BOOK BATS: a swarm of torn pages ----------------
export function makeBats(n = 16) {
  const root = new THREE.Group();
  const paper = std({ map: X.paperTex(0, 128, 128), side: THREE.DoubleSide, roughness: 1 });
  const eye = new THREE.MeshBasicMaterial({ color: 0xff4020 });
  const bats = [];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    const wl = new THREE.Group(), wr = new THREE.Group();
    const wg = new THREE.PlaneGeometry(0.22, 0.16); wg.translate(0.11, 0, 0);
    const l = new THREE.Mesh(wg, paper); wl.add(l); wl.rotation.y = Math.PI;
    const r = new THREE.Mesh(wg, paper); wr.add(r);
    b.add(wl, wr);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.12), std({ color: 0x2a2018 })); b.add(body);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), eye); e.position.set(s * 0.015, 0.02, 0.06); b.add(e); }
    b.userData = { wl, wr, ph: Math.random() * 6, off: new THREE.Vector3((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.6), sp: 0.7 + Math.random() * 0.8 };
    root.add(b); bats.push(b);
  }
  root.visible = false;
  return { root, bats };
}
export function animBats(B, dt, t, center, spread = 1) {
  for (const b of B.bats) {
    const u = b.userData;
    const flap = Math.sin(t * 22 * u.sp + u.ph);
    u.wl.rotation.z = flap * 0.9; u.wr.rotation.z = -flap * 0.9;
    const a = t * u.sp * 2 + u.ph;
    b.position.set(center.x + (u.off.x + Math.cos(a) * 0.5) * spread, center.y + (u.off.y + Math.sin(a * 1.3) * 0.25) * spread, center.z + (u.off.z + Math.sin(a) * 0.5) * spread);
    b.rotation.y = -a + Math.PI / 2;
  }
}

// ---------------- A BOOKMARK: a ribbon with a tassel and tiny eyes ----------------
export function makeBookmark(color = 0x8a1020) {
  const root = new THREE.Group();
  const seg = 24, len = 1.8;
  const geo = new THREE.PlaneGeometry(0.14, len, 1, seg); geo.rotateX(-Math.PI / 2);
  const mat = std({ color, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });
  const ribbon = new THREE.Mesh(geo, mat); ribbon.castShadow = true; root.add(ribbon);
  const base = geo.attributes.position.array.slice();
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), std({ color: 0xc8a040, roughness: 0.6 }));
  tassel.rotation.x = -Math.PI / 2; root.add(tassel);
  const eyes = new THREE.Group();
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(s * 0.035, 0.03, 0); eyes.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), new THREE.MeshBasicMaterial({ color: 0x000000 })); p.position.set(s * 0.035, 0.035, 0.012); eyes.add(p); }
  root.add(eyes);
  const B = {
    root, ribbon,
    // slither: the ribbon waves sideways; the head is at -z (forward)
    animate(t, speed, rear = 0) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const z = base[i * 3 + 2]; const k = (z + len / 2) / len; // 0 at head, 1 at tail
        p.setX(i, base[i * 3] + Math.sin(t * 7 * (0.4 + speed) + k * 9) * 0.18 * k);
        p.setY(i, base[i * 3 + 1] + 0.02 + (k < 0.15 ? rear * (0.15 - k) * 4 : 0));
      }
      p.needsUpdate = true; geo.computeVertexNormals();
      eyes.position.set(0, 0.04 + rear * 0.55, -len / 2 + 0.02);
      tassel.position.set(Math.sin(t * 7 * (0.4 + speed) + 9) * 0.18, 0.05, len / 2 + 0.08);
    },
  };
  return B;
}

// ---------------- your own hands (for the ending) ----------------
export function makeHands() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const mat = std({ map: t, roughness: 0.8 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const h = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.1), mat); h.add(palm);
    for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.08), mat); fg.position.set(-0.033 + f * 0.022, 0, -0.085 - (f === 1 || f === 2 ? 0.01 : 0)); h.add(fg); }
    const th = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.018, 0.06), mat); th.position.set(-s * 0.055, 0, -0.02); th.rotation.y = s * 0.6; h.add(th);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.3), std({ color: 0x2a3a6a, roughness: 0.9 })); arm.position.set(0, -0.005, 0.2); h.add(arm);
    h.position.set(s * 0.12, -0.25, -0.35); h.rotation.set(0.5, -s * 0.2, s * 0.3);
    g.add(h);
  }
  g.visible = false;
  const ctx = cv.getContext('2d');
  const paper = X.paperTex(0, 256, 256).image;
  return {
    root: g,
    // k = how much of the hands has turned into paper (0..1)
    paint(k) {
      ctx.fillStyle = '#d8a888'; ctx.fillRect(0, 0, 256, 256);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= 256; x += 16) ctx.lineTo(x, k * 300 + Math.sin(x * 0.3) * 18);
      ctx.lineTo(256, 0); ctx.closePath(); ctx.clip(); ctx.drawImage(paper, 0, 0); ctx.restore();
      t.needsUpdate = true;
    },
  };
}
