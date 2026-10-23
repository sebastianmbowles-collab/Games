import { THREE } from './engine.js';
import { rnd } from './state.js';

export const TEX = {};

function make(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.userData.ctx = x;
  return t;
}
function speckle(x, w, h, n, a) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`;
    x.fillRect(rnd(0, w) | 0, rnd(0, h) | 0, 1, 1);
  }
}
function vgrad(x, w, h, stops) {
  const g = x.createLinearGradient(0, 0, 0, h);
  for (const [p, c] of stops) g.addColorStop(p, c);
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}

export function makeTextures() {
  // the blue moon that UNIT-07 shoots
  TEX.moon = make(64, 32, (x, w, h) => {
    vgrad(x, w, h, [[0, '#e4f6ff'], [0.5, '#86c8ff'], [1, '#3f86ff']]);
    speckle(x, w, h, 500, 0.25);
    x.fillStyle = 'rgba(30,70,170,0.35)';
    x.beginPath(); x.ellipse(20, 14, 12, 7, 0.3, 0, 7); x.fill();
    x.beginPath(); x.ellipse(46, 20, 9, 5, -0.2, 0, 7); x.fill();
    for (let i = 0; i < 18; i++) {
      const cx = rnd(0, w), cy = rnd(3, h - 3), r = rnd(1.5, 4.5);
      x.fillStyle = 'rgba(20,60,160,0.55)'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      x.strokeStyle = 'rgba(235,250,255,0.75)'; x.lineWidth = 1;
      x.beginPath(); x.arc(cx + 0.5, cy + 0.5, r, Math.PI * 0.9, Math.PI * 1.9); x.stroke();
    }
  });
  // a white moon that can be tinted any colour (moon blasts change colour with upgrades)
  TEX.moonW = make(64, 32, (x, w, h) => {
    x.drawImage(TEX.moon.image, 0, 0);
    const d = x.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = Math.min(255, (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 1.25); p[i] = p[i + 1] = p[i + 2] = l; }
    x.putImageData(d, 0, 0);
  });
  TEX.moonOD = make(64, 32, (x, w, h) => {
    x.drawImage(TEX.moon.image, 0, 0);
    x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(120,90,255,0.35)'; x.fillRect(0, 0, w, h);
  });
  TEX.glow = make(64, 64, x => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  }, { smooth: true });
  TEX.dot = make(16, 16, x => {
    const g = x.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 16, 16);
  }, { smooth: true });
  // metal wall plates inside the UFO
  TEX.panel = make(64, 64, x => {
    x.fillStyle = '#98a2ba'; x.fillRect(0, 0, 64, 64);
    speckle(x, 64, 64, 900, 0.2);
    x.fillStyle = '#4a5268'; x.fillRect(0, 0, 64, 2); x.fillRect(0, 0, 2, 64); x.fillRect(0, 31, 64, 2);
    x.fillStyle = '#d4dbe8'; x.fillRect(2, 2, 62, 1); x.fillRect(2, 33, 62, 1);
    for (const [rx, ry] of [[5, 5], [58, 5], [5, 27], [58, 27], [5, 37], [58, 37], [5, 59], [58, 59]]) {
      x.fillStyle = '#3a4152'; x.fillRect(rx, ry, 3, 3); x.fillStyle = '#e8eef8'; x.fillRect(rx, ry, 1, 1);
    }
    x.fillStyle = '#2c3242';
    for (let i = 0; i < 5; i++) x.fillRect(16, 42 + i * 4, 32, 2);
  });
  TEX.floor = make(64, 64, x => {
    x.fillStyle = '#5c6478'; x.fillRect(0, 0, 64, 64);
    speckle(x, 64, 64, 700, 0.2);
    x.fillStyle = '#262b38';
    for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 2, 64); x.fillRect(0, i, 64, 2); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillRect(i * 16 + 6, j * 16 + 6, 6, 6); }
    x.fillStyle = '#4dfcff';
    x.fillRect(8, 8, 2, 2); x.fillRect(40, 24, 2, 2); x.fillRect(24, 56, 2, 2);
  }, { repeat: [9, 9] });
  // UNIT-07's battle-scarred arm
  TEX.scratch = make(64, 64, x => {
    x.fillStyle = '#8c97a8'; x.fillRect(0, 0, 64, 64);
    speckle(x, 64, 64, 700, 0.25);
    x.strokeStyle = '#eef3f8'; x.lineWidth = 1;
    for (let i = 0; i < 28; i++) {
      const sx = rnd(0, 64), sy = rnd(0, 64), l = rnd(4, 16), a = rnd(-0.6, 0.6) + (Math.random() < 0.5 ? 0 : Math.PI / 2);
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke();
    }
    x.strokeStyle = '#353b46'; x.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const sx = rnd(0, 64), sy = rnd(0, 64); x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + rnd(-10, 10), sy + rnd(4, 14)); x.stroke(); }
    x.fillStyle = 'rgba(30,30,40,0.45)';
    for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(rnd(8, 56), rnd(8, 56), rnd(2, 5), 0, 7); x.fill(); }
  });
  // alien planet sky: dark purple with a hot pink horizon and stars
  TEX.sky = make(256, 256, (x, w, h) => {
    vgrad(x, w, h, [[0, '#05000f'], [0.25, '#170434'], [0.4, '#3b0a6c'], [0.47, '#7a1aa0'], [0.5, '#ff3d8b'], [0.53, '#6a127a'], [0.62, '#2a0640'], [1, '#100118']]);
    for (let i = 0; i < 4; i++) {
      const g = x.createRadialGradient(rnd(0, w), rnd(30, 100), 0, rnd(0, w), rnd(30, 100), rnd(30, 70));
      g.addColorStop(0, i % 2 ? 'rgba(60,255,140,0.18)' : 'rgba(200,60,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, 128);
    }
  }, { smooth: true });
  TEX.ground = make(64, 64, x => {
    x.fillStyle = '#4a1a66'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 30; i++) { x.fillStyle = Math.random() < 0.5 ? '#3a1052' : '#5e2680'; x.fillRect(rnd(0, 64) | 0, rnd(0, 64) | 0, rnd(4, 12) | 0, rnd(3, 8) | 0); }
    speckle(x, 64, 64, 600, 0.25);
    x.strokeStyle = '#3dff7a'; x.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      let px = rnd(0, 64), py = rnd(0, 64); x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += rnd(-8, 8); py += rnd(-8, 8); x.lineTo(px, py); }
      x.stroke();
    }
  }, { repeat: [30, 30] });
  TEX.hazard = make(64, 16, x => {
    x.fillStyle = '#16181f'; x.fillRect(0, 0, 64, 16);
    x.fillStyle = '#ffa200';
    for (let i = -16; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 16); x.lineTo(i + 8, 16); x.lineTo(i + 16, 0); x.lineTo(i + 8, 0); x.fill(); }
  });
  TEX.glyph = make(128, 16, x => {
    x.fillStyle = '#041a12'; x.fillRect(0, 0, 128, 16);
    x.fillStyle = '#3dffb0';
    for (let i = 4; i < 124; i += 8) {
      const k = (Math.random() * 5) | 0;
      if (k === 0) { x.fillRect(i, 4, 4, 1); x.fillRect(i + 1, 4, 1, 8); }
      if (k === 1) { x.fillRect(i, 4, 1, 8); x.fillRect(i, 8, 4, 1); x.fillRect(i + 3, 4, 1, 4); }
      if (k === 2) { x.fillRect(i, 11, 4, 1); x.fillRect(i + 2, 4, 1, 7); x.fillRect(i, 4, 2, 1); }
      if (k === 3) { x.fillRect(i, 6, 4, 1); x.fillRect(i, 9, 4, 1); x.fillRect(i + 1, 4, 1, 8); }
      if (k === 4) { x.beginPath(); x.arc(i + 2, 8, 2.5, 0, 7); x.fill(); x.fillStyle = '#041a12'; x.fillRect(i + 1, 7, 2, 2); x.fillStyle = '#3dffb0'; }
    }
  });
  TEX.portal = make(64, 64, x => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, '#ff5af0'); g.addColorStop(0.6, '#6a14d8'); g.addColorStop(1, 'rgba(20,0,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      x.beginPath();
      for (let a = 0; a < 9; a += 0.2) { const r = a * 3.2, ang = a + k * 2.1; x.lineTo(32 + Math.cos(ang) * r, 32 + Math.sin(ang) * r); }
      x.stroke();
    }
  }, { smooth: true });
  // soft light beam: bright at the top, fading out at the bottom
  TEX.beam = make(8, 128, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }, { smooth: true });
  // drifting fog: soft lumpy blobs
  TEX.fog = make(128, 128, x => {
    for (let i = 0; i < 26; i++) {
      const cx = rnd(20, 108), cy = rnd(20, 108), r = rnd(14, 34);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
  }, { smooth: true });
  TEX.core = make(128, 128, () => {}, { smooth: true });
  updateCore(0);
}

// the swirling cosmic core in the Null Emperor's chest
export function updateCore(t) {
  const x = TEX.core.userData.ctx;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, '#9ff6ff'); g.addColorStop(0.45, '#d23cff'); g.addColorStop(0.8, '#2a0a7a'); g.addColorStop(1, '#0a0020');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    x.strokeStyle = k % 2 ? 'rgba(80,255,255,0.7)' : 'rgba(255,120,255,0.7)';
    x.beginPath();
    for (let a = 0; a < 6; a += 0.15) { const r = a * 10, ang = a * 1.1 + t * 2 + (k * Math.PI) / 2; x.lineTo(64 + Math.cos(ang) * r, 64 + Math.sin(ang) * r); }
    x.stroke();
  }
  x.fillStyle = '#fff';
  for (let i = 0; i < 20; i++) { const a = i * 2.4 + t * 0.8, r = (i * 7 + t * 20) % 60; x.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2, 2); }
  TEX.core.needsUpdate = true;
}
