// Textures painted with canvas at startup, so the whole game stays one file.
import { THREE } from './core.js';

let maxAniso = 4;
export const setAniso = a => { maxAniso = a; };

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function valueNoise(w, h, cell, rnd) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh).map(() => rnd());
  return (x, y) => {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g[(iy % gh) * gw + (ix % gw)], b = g[(iy % gh) * gw + ((ix + 1) % gw)];
    const c = g[((iy + 1) % gh) * gw + (ix % gw)], d = g[((iy + 1) % gh) * gw + ((ix + 1) % gw)];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}
function fbm(w, h, rnd, base = 64, oct = 4) {
  const ns = [];
  for (let i = 0; i < oct; i++) ns.push(valueNoise(w, h, base / Math.pow(2, i), rnd));
  return (x, y) => { let v = 0, a = 0.5, t = 0; for (const n of ns) { v += n(x, y) * a; t += a; a *= 0.5; } return v / t; };
}

export function canvasTex(w, h, draw, { srgb = true, repeat = null } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = cv;
  return t;
}
function pixels(w, h, f, opts) {
  return canvasTex(w, h, (g) => {
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const [r, gg, b] = f(x, y);
      const i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, opts);
}

// Stone blocks: returns color + bump from the same pattern.
export function stoneTex(seed = 1, { rows = 6, cols = 4, tint = [92, 84, 76], wet = 0.5 } = {}) {
  const W = 512, H = 512, rnd = seeded(seed);
  const n = fbm(W, H, rnd, 96, 5), fine = valueNoise(W, H, 3, rnd);
  const bh = H / rows;
  const off = [];
  for (let r = 0; r < rows; r++) off.push((r % 2) * 0.5 + (rnd() - 0.5) * 0.2);
  const shade = [];
  for (let i = 0; i < rows * (cols + 1); i++) shade.push(0.75 + rnd() * 0.4);
  const height = (x, y) => {
    const r = Math.floor(y / bh), fy = (y % bh) / bh;
    const bw = W / cols;
    const xx = (x / bw + off[r] + cols) % cols;
    const c = Math.floor(xx), fx = xx - c;
    const edge = Math.min(fx, 1 - fx, fy, 1 - fy) * bw / 18;
    const m = Math.min(1, edge * 2.2);
    return { m, s: shade[r * (cols + 1) + c] };
  };
  const color = pixels(W, H, (x, y) => {
    const { m, s } = height(x, y);
    const v = n(x, y), f = fine(x, y);
    let k = (0.55 + v * 0.6 + f * 0.12) * s;
    if (m < 1) k *= 0.35 + m * 0.65;
    const streak = Math.max(0, n(x * 0.2, y * 2.5) - 0.55) * wet * 1.5;
    return [tint[0] * k - streak * 30, tint[1] * k - streak * 26, tint[2] * k - streak * 20];
  }, { repeat: [1, 1] });
  const bump = pixels(W, H, (x, y) => {
    const { m } = height(x, y);
    const v = (m * 0.75 + n(x, y) * 0.25 + fine(x, y) * 0.08) * 255;
    return [v, v, v];
  }, { srgb: false, repeat: [1, 1] });
  return { color, bump };
}

export function flagstoneTex(seed = 7, tint = [70, 64, 58]) {
  const W = 512, H = 512, rnd = seeded(seed);
  const n = fbm(W, H, rnd, 80, 5), fine = valueNoise(W, H, 2.5, rnd);
  // irregular cells (Voronoi)
  const pts = [];
  for (let i = 0; i < 14; i++) pts.push([rnd() * W, rnd() * H, 0.7 + rnd() * 0.45]);
  const cell = (x, y) => {
    let a = 1e9, b = 1e9, ia = 0;
    for (let i = 0; i < pts.length; i++) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const dx = x - (pts[i][0] + ox * W), dy = y - (pts[i][1] + oy * H);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < a) { b = a; a = d; ia = i; } else if (d < b) b = d;
    }
    return { e: b - a, s: pts[ia][2] };
  };
  const cache = new Float32Array(W * H * 2);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = cell(x, y); cache[(y * W + x) * 2] = c.e; cache[(y * W + x) * 2 + 1] = c.s; }
  const color = pixels(W, H, (x, y) => {
    const e = cache[(y * W + x) * 2], s = cache[(y * W + x) * 2 + 1];
    let k = (0.5 + n(x, y) * 0.6 + fine(x, y) * 0.15) * s;
    if (e < 7) k *= 0.3 + (e / 7) * 0.7;
    return [tint[0] * k, tint[1] * k, tint[2] * k];
  }, { repeat: [1, 1] });
  const bump = pixels(W, H, (x, y) => {
    const e = cache[(y * W + x) * 2];
    const v = (Math.min(1, e / 7) * 0.7 + n(x, y) * 0.3 + fine(x, y) * 0.1) * 255;
    return [v, v, v];
  }, { srgb: false, repeat: [1, 1] });
  return { color, bump };
}

export function woodTex(seed = 3, { tint = [118, 78, 46], planks = 1, w = 512, h = 512, dark = 0 } = {}) {
  const rnd = seeded(seed);
  const n = fbm(w, h, rnd, 120, 4), fine = valueNoise(w, h, 1.6, rnd), knot = valueNoise(w, h, 60, rnd);
  const ph = h / planks;
  const pshade = Array.from({ length: planks }, () => 0.8 + rnd() * 0.35);
  const f = (x, y) => {
    const p = Math.floor(y / ph), py = (y % ph) / ph;
    const warp = n(x * 0.6, y) * 18 + knot(x, y + p * 37) * 10;
    const ring = Math.sin((y + p * 61 + warp) * 0.45 + n(x, y * 3) * 6) * 0.5 + 0.5;
    let k = (0.6 + ring * 0.25 + fine(x * 0.25, y * 3) * 0.2) * pshade[p];
    if (planks > 1 && (py < 0.025 || py > 0.975)) k *= 0.35;
    k *= 1 - dark;
    return k;
  };
  const color = pixels(w, h, (x, y) => { const k = f(x, y); return [tint[0] * k, tint[1] * k, tint[2] * k]; }, { repeat: [1, 1] });
  const bump = pixels(w, h, (x, y) => { const v = f(x, y) * 255; return [v, v, v]; }, { srgb: false, repeat: [1, 1] });
  return { color, bump };
}

export function plainNoiseTex(seed, tint, base = 64, w = 256) {
  const rnd = seeded(seed), n = fbm(w, w, rnd, base, 4);
  return pixels(w, w, (x, y) => { const k = 0.6 + n(x, y) * 0.7; return [tint[0] * k, tint[1] * k, tint[2] * k]; }, { repeat: [1, 1] });
}

export function iceTex(seed = 9) {
  const W = 512, rnd = seeded(seed), n = fbm(W, W, rnd, 90, 5);
  return canvasTex(W, W, (g) => {
    const img = g.createImageData(W, W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const v = n(x, y), i = (y * W + x) * 4;
      img.data[i] = 20 + v * 50; img.data[i + 1] = 40 + v * 70; img.data[i + 2] = 70 + v * 90; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = 'rgba(200,230,255,0.35)';
    for (let i = 0; i < 40; i++) {
      g.lineWidth = 0.5 + rnd() * 1.5;
      g.beginPath();
      let x = rnd() * W, y = rnd() * W;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 90; y += (rnd() - 0.5) * 90; g.lineTo(x, y); }
      g.stroke();
    }
  }, { repeat: [1, 1] });
}

// ---------------------------------------------------------------- cards
export const SUITS = ['Teeth', 'Keys', 'Candles', 'Eyes'];
export const VALNAME = { 11: 'Knave', 12: 'Queen', 13: 'King', 14: 'Ace' };
export const VALSHORT = { 11: 'Kn', 12: 'Q', 13: 'K', 14: 'A' };
export const cardName = c => `${VALNAME[c.v] || c.v} of ${SUITS[c.s]}`;

function suitPath(g, s, x, y, r) {
  g.save(); g.translate(x, y); g.scale(r / 20, r / 20);
  g.beginPath();
  if (s === 0) { // tooth
    g.moveTo(-14, -16); g.bezierCurveTo(-18, -2, -10, 4, -9, 18); g.lineTo(-4, 6); g.lineTo(0, 10); g.lineTo(4, 6); g.lineTo(9, 18);
    g.bezierCurveTo(10, 4, 18, -2, 14, -16); g.bezierCurveTo(6, -22, -6, -22, -14, -16); g.fill();
  } else if (s === 1) { // key
    g.arc(0, -10, 8, 0, Math.PI * 2); g.fill();
    g.fillRect(-2.5, -4, 5, 24); g.fillRect(2, 10, 7, 4); g.fillRect(2, 16, 5, 4);
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, -10, 3.5, 0, Math.PI * 2); g.fill();
  } else if (s === 2) { // candle
    g.fillRect(-6, -2, 12, 22);
    g.moveTo(0, -20); g.bezierCurveTo(7, -10, 6, -4, 0, -3); g.bezierCurveTo(-6, -4, -7, -10, 0, -20); g.fill();
  } else { // eye
    g.moveTo(-20, 0); g.bezierCurveTo(-8, -14, 8, -14, 20, 0); g.bezierCurveTo(8, 14, -8, 14, -20, 0); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, 5.5, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over'; g.beginPath(); g.arc(0, 0, 2.8, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
export { suitPath };

function agedPaper(g, w, h, seed, base = [222, 205, 168]) {
  const rnd = seeded(seed);
  g.fillStyle = `rgb(${base})`; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(${90 + rnd() * 40},${60 + rnd() * 30},${30},${rnd() * 0.06})`;
    const r = 4 + rnd() * 40;
    g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2); g.fill();
  }
  const grd = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(70,40,10,0.55)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}

const cardCache = new Map();
export function cardTex(v, s, marked = false) {
  const key = `${v}.${s}.${marked}`;
  if (cardCache.has(key)) return cardCache.get(key);
  const t = canvasTex(256, 384, (g, w, h) => {
    agedPaper(g, w, h, v * 13 + s * 7 + 3);
    g.strokeStyle = 'rgba(60,30,10,.75)'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
    g.strokeStyle = 'rgba(60,30,10,.35)'; g.lineWidth = 1; g.strokeRect(16, 16, w - 32, h - 32);
    const red = s === 0 || s === 2;
    g.fillStyle = red ? '#6e140e' : '#1d140e';
    g.font = 'bold 54px "IM Fell English", Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lbl = VALSHORT[v] || String(v);
    g.fillText(lbl, 44, 50);
    suitPath(g, s, 44, 98, 16);
    g.save(); g.translate(w - 44, h - 50); g.rotate(Math.PI); g.fillText(lbl, 0, 0); suitPath(g, s, 0, 48, 16); g.restore();
    suitPath(g, s, w / 2, h / 2, v >= 11 ? 58 : 40);
    if (v >= 11) {
      g.font = 'italic 30px "IM Fell English", Georgia, serif';
      g.fillText(VALNAME[v], w / 2, h / 2 + 84);
    } else {
      g.font = '22px "IM Fell English", Georgia, serif';
      for (let i = 0; i < Math.min(v, 10); i++) {
        const a = (i / Math.min(v, 10)) * Math.PI * 2;
        suitPath(g, s, w / 2 + Math.cos(a) * 82, h / 2 + Math.sin(a) * 112, 9);
      }
    }
    // strange marginal marks on every card
    g.strokeStyle = 'rgba(60,20,10,.4)'; g.lineWidth = 1.2;
    const rnd = seeded(v * 31 + s);
    for (let i = 0; i < 5; i++) { g.beginPath(); const x = 20 + rnd() * (w - 40), y = 140 + rnd() * 100; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 20, y + rnd() * 16); g.stroke(); }
    if (marked) {
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(w - 30, 22); g.lineTo(w - 18, 40); g.moveTo(w - 26, 20); g.lineTo(w - 14, 38); g.stroke();
    }
  });
  cardCache.set(key, t);
  return t;
}
let backTex = null;
export function cardBack() {
  if (backTex) return backTex;
  backTex = canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = '#1a0c0a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7d5a2c'; g.lineWidth = 4; g.strokeRect(12, 12, w - 24, h - 24);
    g.strokeStyle = 'rgba(125,90,44,.55)'; g.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) { g.beginPath(); g.ellipse(w / 2, h / 2, 20 + i * 6, 34 + i * 9, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#e8e0ff';
    for (const [x, y, r] of [[-18, -10, 7], [16, -14, 5], [-6, 8, 4], [20, 6, 6]]) { g.beginPath(); g.arc(w / 2 + x, h / 2 + y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#7d5a2c'; g.font = '20px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center';
    g.fillText('HOUSE RULES', w / 2, h - 36);
  });
  return backTex;
}

// ---------------------------------------------------------------- tokens & boards
export const EMO = ['Fear', 'Regret', 'Guilt', 'Anger'];
export const EMO_COL = ['#c9ccd6', '#7e93b0', '#b08850', '#9c3a2c'];
export function emoTex(i) {
  return canvasTex(256, 256, (g, w) => {
    const c = EMO_COL[i] || '#f5e3b0';
    const grd = g.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2);
    grd.addColorStop(0, c); grd.addColorStop(1, '#1a1612');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 6;
    g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 14, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(20,12,8,.85)';
    g.font = 'bold 40px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const label = i >= 0 ? EMO[i] : 'Memory';
    g.fillText(label.toUpperCase(), w / 2, w / 2 + 50);
    g.lineWidth = 7; g.strokeStyle = 'rgba(20,12,8,.85)'; g.lineCap = 'round';
    g.beginPath();
    const cx = w / 2, cy = w / 2 - 22;
    if (i === 0) { g.arc(cx, cy, 30, Math.PI * 0.15, Math.PI * 0.85, true); g.moveTo(cx - 14, cy - 6); g.arc(cx - 14, cy - 6, 5, 0, 7); g.moveTo(cx + 19, cy - 6); g.arc(cx + 14, cy - 6, 5, 0, 7); }
    else if (i === 1) { g.moveTo(cx - 30, cy - 20); g.quadraticCurveTo(cx, cy + 40, cx + 30, cy - 20); g.moveTo(cx, cy + 10); g.lineTo(cx, cy + 34); }
    else if (i === 2) { g.moveTo(cx - 28, cy + 24); g.lineTo(cx, cy - 30); g.lineTo(cx + 28, cy + 24); g.closePath(); }
    else if (i === 3) { for (let k = 0; k < 5; k++) { g.moveTo(cx - 30 + k * 15, cy + 25); g.lineTo(cx - 22 + k * 15, cy - 25); } }
    else { g.arc(cx, cy, 24, 0, 7); g.moveTo(cx - 8, cy); g.arc(cx, cy, 8, Math.PI, 7); }
    g.stroke();
  });
}

export function paperTex(seed = 2, lines = 14, ink = 'rgba(40,25,10,.55)', base) {
  return canvasTex(256, 340, (g, w, h) => {
    agedPaper(g, w, h, seed, base);
    g.strokeStyle = ink; g.lineWidth = 1.6;
    const rnd = seeded(seed + 1);
    for (let i = 0; i < lines; i++) {
      const y = 30 + i * ((h - 50) / lines);
      g.beginPath(); let x = 22; g.moveTo(x, y);
      while (x < w - 30) { const nx = x + 6 + rnd() * 18; g.lineTo(nx, y + (rnd() - 0.5) * 3); x = nx + (rnd() < 0.2 ? 8 : 0); g.moveTo(x, y); }
      g.stroke();
    }
  });
}

export function photoTex() {
  return canvasTex(256, 200, (g, w, h) => {
    agedPaper(g, w, h, 41, [200, 190, 170]);
    g.fillStyle = '#3a332b'; g.fillRect(16, 16, w - 32, h - 32);
    g.fillStyle = '#8b8073';
    g.beginPath(); g.arc(w / 2, 80, 26, 0, 7); g.fill();
    g.fillRect(w / 2 - 34, 108, 68, 70);
    g.fillStyle = '#2a241e'; g.fillRect(w / 2 - 22, 66, 44, 8);
  });
}

export function labyrinthTex(spaces, lane, center) {
  // the carved wooden ring board
  return canvasTex(1024, 1024, (g, W) => {
    const rnd = seeded(77);
    const c = W / 2;
    const grd = g.createRadialGradient(c, c, 50, c, c, c);
    grd.addColorStop(0, '#5a3820'); grd.addColorStop(1, '#2a170c');
    g.fillStyle = grd; g.fillRect(0, 0, W, W);
    g.strokeStyle = 'rgba(0,0,0,.35)';
    for (let i = 0; i < 160; i++) { g.lineWidth = 1 + rnd() * 2; g.beginPath(); g.arc(c + (rnd() - 0.5) * 40, c + (rnd() - 0.5) * 40, 40 + rnd() * 460, 0, 7); g.stroke(); }
    // carved knotwork border
    g.strokeStyle = 'rgba(15,6,2,.85)'; g.lineWidth = 10;
    g.beginPath(); g.arc(c, c, c - 18, 0, 7); g.stroke();
    g.lineWidth = 3;
    for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * (c - 34), c + Math.sin(a) * (c - 34), 10, 0, 7); g.stroke(); }
    const S = W / 1.0;
    const P = p => [c + p[0] * S, c + p[1] * S];
    // track groove
    g.strokeStyle = 'rgba(20,8,3,.9)'; g.lineWidth = 46; g.lineCap = 'round';
    g.beginPath();
    spaces.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.closePath(); g.stroke();
    g.beginPath(); lane.forEach((p, i) => { const [x, y] = P(p); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
    // spaces
    spaces.forEach((p, i) => {
      const [x, y] = P(p);
      g.fillStyle = p.safe ? '#7a5228' : p.thorn ? '#3a0e0a' : '#4a2c16';
      g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 4; g.stroke();
      g.strokeStyle = 'rgba(255,210,150,.25)'; g.lineWidth = 2; g.beginPath(); g.arc(x - 1, y - 1, 26, Math.PI, Math.PI * 1.7); g.stroke();
      if (p.safe) { // a carved hearth
        g.strokeStyle = 'rgba(255,200,120,.55)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x - 14, y + 10); g.lineTo(x, y - 14); g.lineTo(x + 14, y + 10); g.closePath(); g.stroke();
        g.beginPath(); g.moveTo(x - 6, y + 10); g.lineTo(x - 6, y); g.lineTo(x + 6, y); g.lineTo(x + 6, y + 10); g.stroke();
      }
      if (p.thorn) {
        g.strokeStyle = 'rgba(200,60,40,.7)'; g.lineWidth = 3;
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); g.stroke(); }
      }
      if (i === 0) { g.fillStyle = 'rgba(255,220,170,.5)'; g.font = '22px "IM Fell English SC", serif'; g.textAlign = 'center'; g.fillText('START', x, y + 52); }
    });
    lane.forEach(p => {
      const [x, y] = P(p);
      g.fillStyle = '#6a4220'; g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = 4; g.stroke();
    });
    const [hx, hy] = P(center);
    g.fillStyle = '#8a6030'; g.beginPath(); g.arc(hx, hy, 62, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 6; g.stroke();
    g.fillStyle = 'rgba(30,14,4,.8)'; g.font = '26px "IM Fell English SC", serif'; g.textAlign = 'center'; g.fillText('HOME', hx, hy + 92);
  });
}

export function chessTex() {
  return canvasTex(1024, 1024, (g, W) => {
    const rnd = seeded(12);
    const s = W / 8;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 1;
      g.fillStyle = light ? '#8aa0b8' : '#0a0d14';
      g.fillRect(f * s, r * s, s, s);
      g.strokeStyle = light ? 'rgba(255,255,255,.18)' : 'rgba(120,160,220,.12)';
      for (let i = 0; i < 6; i++) { g.lineWidth = rnd() * 1.4; g.beginPath(); const x = f * s + rnd() * s, y = r * s + rnd() * s; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 70, y + (rnd() - 0.5) * 70); g.stroke(); }
    }
  });
}

export function bgTex() {
  // backgammon board, seen from the player's side: points 13-24 far, 12-1 near
  return canvasTex(1024, 720, (g, W, H) => {
    const rnd = seeded(5);
    g.fillStyle = '#26140b'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(0,0,0,${rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * H; g.moveTo(0, y); g.bezierCurveTo(W / 3, y + (rnd() - 0.5) * 20, (2 * W) / 3, y + (rnd() - 0.5) * 20, W, y); g.stroke(); }
    const m = 36, bar = 64;
    const half = (W - m * 2 - bar) / 2;
    const pw = half / 6;
    g.fillStyle = '#3a2213';
    g.fillRect(m, m, half, H - m * 2); g.fillRect(m + half + bar, m, half, H - m * 2);
    g.fillStyle = '#140904'; g.fillRect(m + half, 0, bar, H);
    const ph = (H - m * 2) * 0.42;
    for (let i = 0; i < 12; i++) {
      const side = i < 6 ? 0 : 1;
      const x = m + side * (half + bar) + (i % 6) * pw;
      for (const top of [true, false]) {
        const dark = (i + (top ? 1 : 0)) % 2 === 0;
        g.fillStyle = dark ? '#5e1a12' : '#c9b48a';
        g.beginPath();
        if (top) { g.moveTo(x, m); g.lineTo(x + pw, m); g.lineTo(x + pw / 2, m + ph); }
        else { g.moveTo(x, H - m); g.lineTo(x + pw, H - m); g.lineTo(x + pw / 2, H - m - ph); }
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.stroke();
      }
    }
    g.strokeStyle = '#7d5a2c'; g.lineWidth = 6; g.strokeRect(m - 4, m - 4, W - m * 2 + 8, H - m * 2 + 8);
  });
}

export function pipTex(n, dark = false) {
  return canvasTex(128, 128, (g, w) => {
    g.fillStyle = dark ? '#151010' : '#e9dcc0'; g.fillRect(0, 0, w, w);
    g.fillStyle = dark ? '#d8cfff' : '#2a0e08';
    const P = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [3, 1], [1, 3], [3, 3]], 5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], 6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]] }[n];
    for (const [x, y] of P) { g.beginPath(); g.arc(x * 32, y * 32, 11, 0, 7); g.fill(); }
  });
}

export function textTex(text, { w = 512, h = 128, font = '48px "IM Fell English", serif', color = '#f0e6d0', bg = null } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

export function scrawlTex(lines, { w = 1024, h = 512, color = 'rgba(180,30,20,.85)', font = '64px "IM Fell English", serif' } = {}) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 76));
  });
}

export function glowSprite(color = '#ffffff', soft = 0.5) {
  return canvasTex(128, 128, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, color); grd.addColorStop(soft, color.length === 7 ? color + '55' : color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}
export function smokeSprite() {
  return canvasTex(64, 64, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.4)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  }, { srgb: false });
}
