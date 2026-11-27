// Every picture in the game is painted with code here (no downloaded art).
import * as THREE from 'three';

let seed = 1337;
export const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = a => a[Math.floor(rnd() * a.length)];

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
let ANISO = 4;
export const setAniso = a => { ANISO = Math.min(8, a); };
function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = ANISO;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noise(g, w, h, amt, alpha = 0.08) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
}
// grey copy of a canvas used as a bump map (bumps make surfaces look real under the flashlight)
function bumpOf(src) {
  const [c, g] = canvas(src.width, src.height);
  g.filter = 'grayscale(1) contrast(1.4)'; g.drawImage(src, 0, 0);
  return tex(c, [1, 1], false);
}

export function woodTex(base = '#4a2c18', planks = 8) {
  const [c, g] = canvas(512, 512);
  const ph = 512 / planks;
  for (let i = 0; i < planks; i++) {
    const shade = 0.75 + rnd() * 0.4;
    const col = new THREE.Color(base).multiplyScalar(shade);
    g.fillStyle = '#' + col.getHexString(); g.fillRect(0, i * ph, 512, ph);
    for (let k = 0; k < 26; k++) { // grain
      g.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.12})`; g.lineWidth = 1 + rnd() * 2;
      g.beginPath(); const y = i * ph + rnd() * ph; g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 2.5);
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, i * ph, 512, 2);
    const off = rnd() * 512; g.fillRect(off, i * ph, 2, ph);
  }
  noise(g, 512, 512, 18);
  return { map: tex(c), bump: bumpOf(c) };
}

export function carpetTex() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#3b1416'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { // old library pattern
    g.strokeStyle = 'rgba(190,140,60,.28)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x + 32, y + 6); g.lineTo(x + 58, y + 32); g.lineTo(x + 32, y + 58); g.lineTo(x + 6, y + 32); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(20,60,50,.5)'; g.beginPath(); g.arc(x + 32, y + 32, 7, 0, 7); g.fill();
  }
  noise(g, 512, 512, 40);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.15})`; g.beginPath(); g.arc(rnd() * 512, rnd() * 512, 10 + rnd() * 40, 0, 7); g.fill(); }
  return { map: tex(c, [1, 1]), bump: bumpOf(c) };
}

export function wallTex() {
  const [c, g] = canvas(512, 1024);
  // wallpaper top
  g.fillStyle = '#2d3428'; g.fillRect(0, 0, 512, 1024);
  for (let y = 0; y < 640; y += 80) for (let x = (y / 80) % 2 ? 0 : 40; x < 512; x += 80) {
    g.fillStyle = 'rgba(160,150,100,.13)';
    g.beginPath(); g.ellipse(x, y + 40, 14, 26, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(x, y + 40, 26, 8, 0, 0, 7); g.fill();
  }
  // wood panelling bottom
  const w = new THREE.Color('#3a2212');
  g.fillStyle = '#' + w.getHexString(); g.fillRect(0, 640, 512, 384);
  for (let x = 0; x < 512; x += 128) {
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4; g.strokeRect(x + 14, 680, 100, 300);
    g.strokeStyle = 'rgba(255,200,150,.08)'; g.lineWidth = 2; g.strokeRect(x + 18, 684, 92, 292);
  }
  g.fillStyle = '#1d1008'; g.fillRect(0, 630, 512, 18); g.fillRect(0, 1000, 512, 24);
  noise(g, 512, 1024, 22);
  // water stains
  for (let i = 0; i < 6; i++) { const gr = g.createRadialGradient(rnd() * 512, rnd() * 500, 0, rnd() * 512, rnd() * 500, 120); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 640); }
  return { map: tex(c), bump: bumpOf(c) };
}

export function ceilingTex() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#5b574c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.25})`; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
  g.strokeStyle = '#2b2924'; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
  return { map: tex(c), bump: bumpOf(c) };
}

const SPINE_COLS = ['#5a1a1a', '#1d3b2a', '#1c2a4a', '#4a3418', '#2d1d3a', '#6a5a2a', '#3a3a3a', '#7a2e1a', '#203838', '#55402a', '#8a7a5a', '#2a1a10'];
// A wall of books: 4 shelves. Used on every bookshelf face.
export function spinesTex(variant) {
  seed = 99 + variant * 777;
  const [c, g] = canvas(512, 768);
  g.fillStyle = '#120a05'; g.fillRect(0, 0, 512, 768);
  const rows = 5, rh = 768 / rows;
  for (let r = 0; r < rows; r++) {
    let x = 4;
    const by = (r + 1) * rh - 14;
    while (x < 508) {
      const bw = 10 + rnd() * 22, bh = rh * (0.62 + rnd() * 0.3);
      if (rnd() < 0.05) { x += bw * 2; continue; } // missing books
      const col = pick(SPINE_COLS);
      const lean = rnd() < 0.06;
      g.save(); g.translate(x, by); if (lean) g.rotate(-0.18);
      const grd = g.createLinearGradient(0, 0, bw, 0);
      grd.addColorStop(0, 'rgba(0,0,0,.6)'); grd.addColorStop(0.3, col); grd.addColorStop(0.7, col); grd.addColorStop(1, 'rgba(0,0,0,.7)');
      g.fillStyle = grd; g.fillRect(0, -bh, bw, bh);
      g.fillStyle = 'rgba(210,170,80,.55)';
      if (rnd() < 0.7) { g.fillRect(2, -bh + 10, bw - 4, 2); g.fillRect(2, -bh + 15, bw - 4, 1); }
      if (rnd() < 0.6) g.fillRect(3, -bh * 0.55, bw - 6, bh * 0.12);
      if (rnd() < 0.5) { g.fillRect(2, -14, bw - 4, 2); }
      g.restore();
      x += bw + (lean ? 8 : 0.5);
    }
    // shelf board
    g.fillStyle = '#2e1a0c'; g.fillRect(0, by, 512, 14);
    g.fillStyle = 'rgba(255,220,170,.08)'; g.fillRect(0, by, 512, 2);
  }
  noise(g, 512, 768, 26);
  return { map: tex(c), bump: bumpOf(c) };
}

export function pagesEdgeTex() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#d9cfb4'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(90,70,40,${0.1 + rnd() * 0.25})`; g.fillRect(0, y, 256, 1); }
  noise(g, 256, 256, 30);
  return tex(c);
}

// paper with writing on it, for bats, the hands and the Bookworm
export function paperTex(dark = 0, w = 256, h = 256, lines = true) {
  const [c, g] = canvas(w, h);
  g.fillStyle = dark ? '#8a7f68' : '#e8dfc6'; g.fillRect(0, 0, w, h);
  if (lines) {
    g.fillStyle = 'rgba(30,20,10,.75)';
    for (let y = 14; y < h - 8; y += 11) {
      let x = 10;
      while (x < w - 16) { const ww = 6 + rnd() * 26; g.fillRect(x, y, ww, 3); x += ww + 5; }
    }
  }
  noise(g, w, h, 30);
  return tex(c);
}

// ---------- Mr. Pages' face (on his front cover) ----------
export function drawPagesFace(g, w, h, creepy, t = 0, noEyes = false) {
  // leather cover
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, creepy ? '#4a1410' : '#b8322a'); grd.addColorStop(1, creepy ? '#240806' : '#7a1c16');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d8b058'; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44);
  g.lineWidth = 3; g.strokeRect(36, 36, w - 72, h - 72);
  // title band
  g.fillStyle = creepy ? '#2a0806' : '#f4d27a'; g.fillRect(60, 52, w - 120, 58);
  g.fillStyle = creepy ? '#8a1a14' : '#6a1810'; g.font = 'bold 44px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(creepy ? 'MR. P̷AGES' : 'MR. PAGES', w / 2, 82);
  const ex = [w * 0.33, w * 0.67], ey = h * 0.4;
  if (!creepy) {
    if (!noEyes) for (const x of ex) { // big friendly eyes
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ey, 46, 56, 0, 0, 7); g.fill();
      g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(x + 6, ey + 10, 24, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 14, ey + 0, 8, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,140,140,.6)';
    g.beginPath(); g.arc(w * 0.22, h * 0.56, 26, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.78, h * 0.56, 26, 0, 7); g.fill();
    g.strokeStyle = '#2a0a06'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.arc(w / 2, h * 0.55, 90, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(w / 2 - 22, h * 0.55 + 82, 44, 18);
  } else {
    // ripped-paper grin, ink eyes, page teeth
    for (const x of ex) {
      if (noEyes) { // just dark sockets with ink running down
        g.fillStyle = 'rgba(0,0,0,.85)'; g.beginPath(); g.ellipse(x, ey, 58, 66, 0, 0, 7); g.fill();
        for (let i = 0; i < 4; i++) { const dx = x - 30 + i * 19, len = 70 + ((i * 53) % 110); g.fillStyle = '#050203'; g.fillRect(dx, ey + 40, 7, len); g.beginPath(); g.arc(dx + 3, ey + 40 + len, 6, 0, 7); g.fill(); }
        continue;
      }
      g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, ey, 42, 50, 0, 0, 7); g.fill();
      g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(x + Math.sin(t * 3) * 4, ey - 4, 5, 0, 7); g.fill();
      for (let i = 0; i < 4; i++) { // ink drips
        const dx = x - 26 + i * 17 + Math.sin(i * 9) * 4, len = 60 + ((i * 53) % 90) + Math.sin(t + i) * 10;
        g.fillStyle = '#050203'; g.fillRect(dx, ey + 30, 7 - i % 2 * 2, len);
        g.beginPath(); g.arc(dx + 3, ey + 30 + len, 6, 0, 7); g.fill();
      }
    }
    // the ripped mouth
    const my = h * 0.68, mw = w * 0.38;
    g.fillStyle = '#0a0202'; g.beginPath();
    g.moveTo(w / 2 - mw, my - 30);
    for (let i = 0; i <= 20; i++) { const x = w / 2 - mw + (2 * mw) * i / 20; g.lineTo(x, my - 20 - Math.sin(i / 20 * Math.PI) * -10 + (i % 2 ? -10 : 8)); }
    for (let i = 20; i >= 0; i--) { const x = w / 2 - mw + (2 * mw) * i / 20; g.lineTo(x, my + 40 + Math.sin(i / 20 * Math.PI) * 50 + (i % 2 ? 9 : -6)); }
    g.closePath(); g.fill();
    g.fillStyle = '#e9e1c8'; // teeth made of sharp pages
    for (let i = 0; i < 12; i++) {
      const x = w / 2 - mw + 18 + i * (2 * mw - 36) / 11;
      g.beginPath(); g.moveTo(x - 11, my - 18); g.lineTo(x + 11, my - 18); g.lineTo(x + 1, my + 22 + (i % 3) * 8); g.fill();
      g.beginPath(); g.moveTo(x - 10, my + 60 + Math.sin(i / 11 * Math.PI) * 40); g.lineTo(x + 10, my + 60 + Math.sin(i / 11 * Math.PI) * 40); g.lineTo(x, my + 24 + Math.sin(i / 11 * Math.PI) * 30); g.fill();
    }
    // torn paper edges around the mouth
    g.strokeStyle = '#d8cfb2'; g.lineWidth = 3;
    g.beginPath(); for (let i = 0; i < 26; i++) g.lineTo(w / 2 - mw - 14 + i * (2 * mw + 28) / 25, my - 34 + (i % 2 ? -8 : 6)); g.stroke();
    // scratches
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2;
    for (let i = 0; i < 8; i++) { g.beginPath(); const x = (i * 97) % w, y = (i * 61) % h; g.moveTo(x, y); g.lineTo(x + 40, y + 70); g.stroke(); }
  }
}
export function pagesFaceTex(creepy, noEyes = false) {
  const [c, g] = canvas(512, 704);
  drawPagesFace(g, 512, 704, creepy, 0, noEyes);
  noise(g, 512, 704, 16);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function labelTex(text, opts = {}) {
  const { w = 512, h = 128, bg = '#f2e6c0', fg = '#3a1a10', font = 'bold 56px Georgia,serif', border = '#7a1c16' } = opts;
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (parseInt(font.match(/(\d+)px/)[1]) * 1.15)));
  noise(g, w, h, 14);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function posterTex() {
  const [c, g] = canvas(512, 704);
  g.fillStyle = '#f6e7b6'; g.fillRect(0, 0, 512, 704);
  g.fillStyle = '#d23b2a'; g.font = 'bold 64px Georgia,serif'; g.textAlign = 'center';
  g.fillText('STORYTIME', 256, 90);
  g.fillStyle = '#2a4a8a'; g.font = 'bold 40px Georgia,serif'; g.fillText('with MR. PAGES!', 256, 145);
  // a tiny cute Mr. Pages
  g.save(); g.translate(156, 180); g.scale(0.4, 0.4); drawPagesFace(g, 512, 704, false); g.restore();
  g.fillStyle = '#333'; g.font = '30px Georgia,serif';
  g.fillText('Every Saturday at 10!', 256, 520);
  g.fillText('"Books are FRIENDS', 256, 580); g.fillText('who never leave."', 256, 620);
  noise(g, 512, 704, 30);
  // someone scribbled on it
  g.strokeStyle = 'rgba(20,10,10,.8)'; g.lineWidth = 4; g.font = 'italic 34px Georgia,serif'; g.fillStyle = 'rgba(80,10,10,.85)';
  g.save(); g.translate(256, 670); g.rotate(-0.05); g.fillText('...who never LET you leave', 0, 0); g.restore();
  return tex(c);
}

export function screenTex(lines, color = '#7dff9a') {
  const [c, g] = canvas(256, 192);
  g.fillStyle = '#031208'; g.fillRect(0, 0, 256, 192);
  g.fillStyle = color; g.font = 'bold 16px monospace';
  lines.forEach((l, i) => g.fillText(l, 12, 26 + i * 20));
  for (let y = 0; y < 192; y += 3) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, 256, 1); }
  const t = tex(c); return t;
}

export function rugTex() {
  const [c, g] = canvas(512, 512);
  const cols = ['#c2402e', '#e0a23a', '#3a7a5a', '#2e5a9a', '#8a3a8a'];
  for (let i = 8; i > 0; i--) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(256, 256, i * 31, 0, 7); g.fill(); }
  noise(g, 512, 512, 40);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function slatsTex() {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#3b2414'; g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 246; y += 14) { g.fillStyle = '#0d0703'; g.fillRect(12, y, 104, 6); g.fillStyle = 'rgba(255,220,180,.08)'; g.fillRect(12, y + 6, 104, 2); }
  g.strokeStyle = '#1a0e06'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 248);
  noise(g, 128, 256, 20);
  return tex(c);
}

// soft felt for the mascot costume (fuzzy noise + faint stitching)
export function feltTex() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) { const v = 200 + rnd() * 55; g.strokeStyle = `rgba(${v},${v},${v},.5)`; g.lineWidth = 1; const x = rnd() * 256, y = rnd() * 256, a = rnd() * 6.3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); g.stroke(); }
  noise(g, 256, 256, 36);
  g.strokeStyle = 'rgba(120,120,120,.5)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.strokeRect(10, 10, 236, 236); g.setLineDash([]);
  const t = tex(c, [2, 2]);
  return { map: t, bump: bumpOf(c) };
}
// the Bookworm's skin: wrinkled, with smudged lines of printed text and ring creases
export function wormSkinTex() {
  const [c, g] = canvas(512, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#d8b4a0'); gr.addColorStop(1, '#a07868');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 16) { g.fillStyle = 'rgba(70,30,20,.35)'; g.fillRect(0, y, 512, 3); g.fillStyle = 'rgba(255,230,210,.2)'; g.fillRect(0, y + 3, 512, 2); }
  g.fillStyle = 'rgba(40,20,15,.45)';
  for (let y = 8; y < 256; y += 16) { let x = rnd() * 20; while (x < 500) { const ww = 6 + rnd() * 22; g.fillRect(x, y, ww, 2); x += ww + 5; } }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(90,40,40,${rnd() * 0.25})`; g.beginPath(); g.arc(rnd() * 512, rnd() * 256, 4 + rnd() * 20, 0, 7); g.fill(); }
  noise(g, 512, 256, 30);
  return { map: tex(c), bump: bumpOf(c) };
}

// a staring eyeball with red veins (the Bookworm read too long without blinking)
export function bloodshotTex() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(190,30,30,.75)';
  for (let i = 0; i < 26; i++) {
    let x = rnd() * 256, y = rnd() < 0.5 ? 128 : 0; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 30; y += (y > 64 ? -1 : 1) * (6 + rnd() * 8); g.lineTo(x, y); }
    g.stroke();
  }
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(160,40,30,.35)'); gr.addColorStop(0.35, 'rgba(0,0,0,0)'); gr.addColorStop(0.65, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(160,40,30,.35)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  return tex(c);
}

// one book spine (white so each book can be tinted its own colour): gold bands, a title label, worn edges
export function bookTex() {
  const [c, g] = canvas(64, 256);
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 64, 256);
  const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(0.25, 'rgba(0,0,0,0)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  g.fillStyle = '#f0d890'; for (const y of [18, 26, 228, 236]) g.fillRect(4, y, 56, 4);
  g.fillStyle = 'rgba(30,20,10,.5)'; g.fillRect(10, 80, 44, 60);
  g.fillStyle = '#f0d890'; for (let i = 0; i < 4; i++) g.fillRect(16, 90 + i * 12, 32 - (i % 2) * 10, 4);
  noise(g, 64, 256, 40);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// ======================= CARTOON FACES (from the OVERDUE character sheet) =======================
const INK = '#120a0c';
// a classic "pie-cut" cartoon eye: a tall black oval with a little wedge cut out for the shine
function pieEye(g, x, y, rx, ry, look = 0, angry = 0) {
  g.save(); g.translate(x, y);
  g.fillStyle = INK; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.beginPath(); g.moveTo(rx * 0.25 + look, -ry * 0.35); g.arc(rx * 0.25 + look, -ry * 0.35, rx * 0.42, -1.1, -0.2); g.closePath(); g.fill();
  if (angry) { // heavy brow cutting the eye
    g.fillStyle = angry; g.beginPath(); g.moveTo(-rx * 1.6, -ry * 1.3); g.lineTo(rx * 1.6, -ry * 1.3); g.lineTo(rx * 1.6 * Math.sign(x || 1) * 0 + rx * 1.4, -ry * 0.35 * (x < 256 ? 1 : -0.2)); g.lineTo(-rx * 1.4, -ry * 0.35 * (x < 256 ? -0.2 : 1)); g.closePath(); g.fill();
  }
  g.restore();
}
function grin(g, cx, cy, w, h, sharp, open = 0) {
  g.save(); g.translate(cx, cy);
  g.lineWidth = 10; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
  // mouth shape: a wide crescent, or a scream when open
  g.beginPath();
  g.moveTo(-w, -h * 0.25 - open * h * 0.4);
  g.quadraticCurveTo(0, -h * 0.05 - open * h * 0.9, w, -h * 0.25 - open * h * 0.4);
  g.quadraticCurveTo(w * 0.9, h * (1 + open), 0, h * (1 + open * 1.4));
  g.quadraticCurveTo(-w * 0.9, h * (1 + open), -w, -h * 0.25 - open * h * 0.4);
  g.closePath();
  g.fillStyle = '#2a0a0c'; g.fill();
  g.save(); g.clip();
  g.fillStyle = '#f6f0e2';
  const n = sharp ? 11 : 7;
  if (sharp) {
    for (let i = 0; i < n; i++) { const x = -w + (2 * w) * (i + 0.5) / n; g.beginPath(); g.moveTo(x - w / n, -h); g.lineTo(x + w / n, -h); g.lineTo(x, h * (0.35 + open * 0.3)); g.fill(); g.beginPath(); g.moveTo(x - w / n, h * (1.2 + open * 1.4)); g.lineTo(x + w / n, h * (1.2 + open * 1.4)); g.lineTo(x, h * (0.55 + open * 1.0)); g.fill(); }
  } else {
    g.fillRect(-w, -h, 2 * w, h * 0.85);
    g.strokeStyle = INK; g.lineWidth = 4; for (let i = 1; i < n; i++) { const x = -w + 2 * w * i / n; g.beginPath(); g.moveTo(x, -h); g.lineTo(x, -h * 0.15); g.stroke(); }
    g.fillStyle = '#c84a50'; g.beginPath(); g.ellipse(0, h * 0.7, w * 0.35, h * 0.3, 0, 0, 7); g.fill(); // tongue
  }
  g.restore();
  g.stroke();
  g.restore();
}
// Mr. Pages' face on the front page of his book head: mood = 'happy' | 'angry' | 'scream'
export function pagesToonFace(mood) {
  const [c, g] = canvas(512, 576);
  const bg = mood === 'happy' ? '#efe3c6' : '#c9b78f';
  g.fillStyle = bg; g.fillRect(0, 0, 512, 576);
  g.strokeStyle = 'rgba(120,90,50,.18)'; g.lineWidth = 2; for (let y = 30; y < 576; y += 26) { g.beginPath(); g.moveTo(20, y); g.lineTo(492, y); g.stroke(); }
  if (mood !== 'happy') { const gr = g.createRadialGradient(256, 260, 60, 256, 260, 360); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(40,10,10,.55)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 576); }
  if (mood === 'happy') {
    pieEye(g, 176, 190, 46, 70, 4); pieEye(g, 336, 190, 46, 70, 4);
    g.strokeStyle = INK; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.arc(80, 330, 30, -0.4, 0.9); g.stroke(); g.beginPath(); g.arc(432, 330, 30, Math.PI - 0.9, Math.PI + 0.4); g.stroke(); // cheek lines
    grin(g, 256, 360, 170, 70, false);
  } else if (mood === 'angry') {
    pieEye(g, 176, 200, 44, 56); pieEye(g, 336, 200, 44, 56);
    g.fillStyle = bg; // narrow the eyes into a glare
    g.beginPath(); g.moveTo(100, 100); g.lineTo(252, 100); g.lineTo(252, 182); g.lineTo(100, 122); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(260, 100); g.lineTo(412, 100); g.lineTo(412, 122); g.lineTo(260, 182); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 16; g.lineCap = 'round';
    g.beginPath(); g.moveTo(110, 120); g.lineTo(230, 170); g.stroke(); g.beginPath(); g.moveTo(402, 120); g.lineTo(282, 170); g.stroke(); // angry brows
    g.fillStyle = '#ff3a2a'; g.beginPath(); g.arc(190, 205, 7, 0, 7); g.fill(); g.beginPath(); g.arc(322, 205, 7, 0, 7); g.fill(); // red glints
    grin(g, 256, 370, 200, 70, true);
  } else {
    g.fillStyle = INK; for (const x of [170, 342]) { g.beginPath(); g.ellipse(x, 170, 56, 74, 0, 0, 7); g.fill(); }
    g.fillStyle = '#fff'; for (const x of [170, 342]) { g.beginPath(); g.arc(x, 175, 9, 0, 7); g.fill(); }
    grin(g, 256, 330, 190, 60, true, 1);
  }
  g.strokeStyle = INK; g.lineWidth = 12; g.strokeRect(6, 6, 500, 564);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// a face painted on the front of a sphere (sphere UV: the front (+z) is at u = 0.25)
function sphereFace(draw, w = 1024, h = 512, bg = '#7ab84e') {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w * 0.25, h * 0.5); draw(g); g.restore();
  const t = tex(c); t.wrapS = THREE.RepeatWrapping; return t;
}
export function wormToonFace() {
  return sphereFace(g => {
    pieEye(g, -62, -40, 34, 50, 3); pieEye(g, 62, -40, 34, 50, 3);
    grin(g, 0, 70, 120, 40, true);
    g.strokeStyle = 'rgba(20,50,10,.5)'; g.lineWidth = 6; g.beginPath(); g.arc(-150, 30, 24, 0, 1.4); g.stroke(); g.beginPath(); g.arc(150, 30, 24, Math.PI - 1.4, Math.PI); g.stroke();
  }, 1024, 512, '#79b84a');
}
export function batToonFace(v) {
  return sphereFace(g => {
    g.fillStyle = '#e9d2c8'; g.beginPath(); g.ellipse(0, 30, 150, 120, 0, 0, 7); g.fill(); // pale muzzle
    pieEye(g, -55, -10, 34, 52, 2); pieEye(g, 55, -10, 34, 52, 2);
    g.lineWidth = 8; g.strokeStyle = INK; g.fillStyle = '#5a1018';
    if (v === 0) { g.beginPath(); g.arc(0, 70, 40, 0.1, Math.PI - 0.1); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-25, 72); g.lineTo(-15, 72); g.lineTo(-20, 88); g.fill(); g.beginPath(); g.moveTo(15, 72); g.lineTo(25, 72); g.lineTo(20, 88); g.fill(); }
    else if (v === 1) { g.beginPath(); g.ellipse(0, 85, 26, 32, 0, 0, 7); g.fill(); g.stroke(); }
    else { g.beginPath(); g.moveTo(-40, 80); g.quadraticCurveTo(0, 60, 40, 80); g.stroke(); }
  }, 1024, 512, '#3a2350');
}
// a sad ghost bookmark (drawn flat, with a wavy tail; the background is see-through)
export function ghostToonTex(fill, face) {
  const [c, g] = canvas(256, 640);
  g.clearRect(0, 0, 256, 640);
  g.beginPath();
  g.moveTo(40, 30); g.lineTo(216, 30);
  g.quadraticCurveTo(232, 300, 214, 520);
  for (let i = 0; i < 4; i++) { const x0 = 214 - i * 44; g.quadraticCurveTo(x0 - 22, 640 - (i % 2) * 70, x0 - 44, 560 + (i % 2) * 20); }
  g.quadraticCurveTo(22, 300, 40, 30); g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, fill); gr.addColorStop(1, 'rgba(160,150,200,.8)');
  g.fillStyle = gr; g.fill();
  g.lineWidth = 10; g.strokeStyle = INK; g.stroke();
  if (face) {
    g.fillStyle = INK; g.beginPath(); g.ellipse(92, 200, 20, 34, 0.15, 0, 7); g.fill(); g.beginPath(); g.ellipse(164, 200, 20, 34, -0.15, 0, 7); g.fill();
    g.lineWidth = 7; g.beginPath(); g.moveTo(64, 164); g.lineTo(108, 146); g.stroke(); g.beginPath(); g.moveTo(192, 164); g.lineTo(148, 146); g.stroke(); // sad brows (inner ends up)
    g.fillStyle = '#2a0a10'; g.beginPath(); g.moveTo(98, 300); g.quadraticCurveTo(128, 255, 158, 300); g.quadraticCurveTo(128, 285, 98, 300); g.fill(); g.stroke();
    g.fillStyle = 'rgba(120,180,255,.8)'; g.beginPath(); g.ellipse(80, 252, 7, 12, 0, 0, 7); g.fill(); // a tear
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
