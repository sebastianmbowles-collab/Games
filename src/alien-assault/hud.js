import { G, rnd } from './state.js';
import { sfx } from './audio.js';
import { fill } from './data.js';

export const PF = '"Press Start 2P", monospace';

// ===== Text and boxes =====
export function text(s, x, y, size, col = '#fff', align = 'center', o = {}) {
  const c = G.hctx;
  c.font = `${size}px ${PF}`; c.textAlign = align; c.textBaseline = 'middle';
  const max = o.max ?? G.w - 16;
  const w = c.measureText(s).width;
  if (w > max) { size *= max / w; c.font = `${size}px ${PF}`; }
  if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = size * 0.9; }
  if (o.stroke !== false) {
    c.lineJoin = 'round'; c.lineWidth = Math.max(2, size / 4); c.strokeStyle = o.stroke || '#000';
    c.strokeText(s, x, y);
  }
  c.fillStyle = col; c.fillText(s, x, y);
  c.shadowBlur = 0;
}
export function wrap(s, maxW, size) {
  const c = G.hctx;
  c.font = `${size}px ${PF}`;
  const lines = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const t = cur ? cur + ' ' + w : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
export function panel(x, y, w, h, edge = '#2a9dff', bg = 'rgba(4,10,28,0.84)') {
  const c = G.hctx;
  c.fillStyle = bg; c.fillRect(x, y, w, h);
  c.strokeStyle = edge; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
  c.fillStyle = edge;
  for (const [cx, cy] of [[x, y], [x + w - 8, y], [x, y + h - 8], [x + w - 8, y + h - 8]]) c.fillRect(cx, cy, 8, 8);
}
export function bar(x, y, w, h, frac, col, bg = 'rgba(0,0,0,0.6)') {
  const c = G.hctx;
  c.fillStyle = bg; c.fillRect(x, y, w, h);
  c.fillStyle = col; c.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.min(1, frac)), h - 4);
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
export function fade(a, color = '0,0,0') {
  if (a <= 0) return;
  G.hctx.fillStyle = `rgba(${color},${Math.min(1, a)})`;
  G.hctx.fillRect(0, 0, G.w, G.h);
}

// ===== Pixel-art portraits =====
const portraits = {};
function circ(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
function holo(x) {
  x.fillStyle = 'rgba(80,200,255,0.16)'; x.fillRect(0, 0, 48, 48);
  for (let y = 0; y < 48; y += 2) { x.fillStyle = 'rgba(0,0,0,0.2)'; x.fillRect(0, y, 48, 1); }
}
const DRAW = {
  patch(x) {
    x.fillStyle = '#0a1a3a'; x.fillRect(0, 0, 48, 48);
    x.fillStyle = '#ff7a14'; circ(x, 24, 27, 15);
    x.save(); x.beginPath(); x.rect(0, 0, 48, 27); x.clip(); x.fillStyle = '#f4f6fa'; circ(x, 24, 27, 15); x.restore();
    x.fillStyle = '#2a2f3a'; x.fillRect(9, 26, 30, 2);
    x.fillStyle = '#1a2230'; circ(x, 24, 25, 8.5);
    x.fillStyle = '#33bbff'; circ(x, 24, 25, 7);
    x.fillStyle = '#08306a'; circ(x, 24, 25, 3);
    x.fillStyle = '#fff'; x.fillRect(26, 21, 2, 2);
    x.fillStyle = '#2a2f3a'; x.fillRect(23, 6, 2, 7);
    x.fillStyle = '#ff9a2a'; x.fillRect(22, 4, 4, 3);
    x.fillRect(6, 33, 4, 2); x.fillRect(38, 33, 4, 2);
    x.fillStyle = '#2a2f3a'; x.fillRect(4, 31, 2, 2); x.fillRect(4, 35, 2, 2); x.fillRect(42, 31, 2, 2); x.fillRect(42, 35, 2, 2);
  },
  nova(x) {
    x.fillStyle = '#06203a'; x.fillRect(0, 0, 48, 48);
    x.strokeStyle = 'rgba(80,200,255,0.25)';
    for (let i = 0; i < 48; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 48); x.moveTo(0, i); x.lineTo(48, i); x.stroke(); }
    x.fillStyle = '#f0f6ff'; x.beginPath(); x.moveTo(6, 48); x.lineTo(10, 37); x.lineTo(38, 37); x.lineTo(42, 48); x.fill();
    x.fillStyle = '#1f5fd6'; x.beginPath(); x.moveTo(14, 48); x.lineTo(17, 38); x.lineTo(31, 38); x.lineTo(34, 48); x.fill();
    x.fillStyle = '#ffd24a'; x.fillRect(31, 41, 4, 3);
    x.fillStyle = '#c98d64'; x.fillRect(20, 31, 8, 7);
    x.beginPath(); x.ellipse(24, 22, 8, 10, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a1a12'; x.beginPath(); x.ellipse(24, 15, 9, 6, 0, Math.PI, 0); x.fill();
    x.fillRect(15, 14, 3, 9); x.fillRect(30, 14, 3, 6);
    x.fillStyle = '#1a1a1a'; x.fillRect(20, 21, 2, 2); x.fillRect(27, 21, 2, 2);
    x.fillStyle = '#5a3a2a'; x.fillRect(19, 19, 4, 1); x.fillRect(26, 19, 4, 1);
    x.fillStyle = '#8a4a3a'; x.fillRect(22, 28, 5, 1);
    x.fillStyle = '#33e0ff'; x.fillRect(14, 20, 2, 6); x.fillRect(15, 26, 6, 1);
    holo(x);
  },
  unit(x) {
    x.fillStyle = '#10141c'; x.fillRect(0, 0, 48, 48);
    x.fillStyle = '#8d99ab'; x.fillRect(4, 40, 40, 8);
    x.fillStyle = '#5d6878'; x.fillRect(10, 10, 28, 28);
    x.fillStyle = '#2f3540'; x.fillRect(10, 8, 28, 4); x.fillRect(10, 34, 28, 4);
    x.fillStyle = '#33ccff'; x.fillRect(13, 18, 22, 7);
    x.fillStyle = '#bff0ff'; x.fillRect(15, 20, 18, 2);
    x.fillStyle = '#5d6878'; x.fillRect(30, 2, 2, 7);
    x.fillStyle = '#ff3355'; x.fillRect(29, 0, 4, 3);
    x.fillStyle = '#c9d2de'; x.fillRect(12, 28, 6, 1); x.fillRect(30, 31, 5, 1);
  },
  vrax(x) {
    x.fillStyle = '#2a0820'; x.fillRect(0, 0, 48, 48);
    x.fillStyle = '#7a24e0';
    x.beginPath(); x.moveTo(8, 14); x.lineTo(2, 0); x.lineTo(14, 10); x.fill();
    x.beginPath(); x.moveTo(40, 14); x.lineTo(46, 0); x.lineTo(34, 10); x.fill();
    x.fillStyle = '#17131f'; x.fillRect(9, 8, 30, 34);
    x.fillStyle = '#7a24e0'; x.fillRect(9, 8, 30, 3); x.fillRect(22, 4, 4, 7);
    x.fillStyle = '#3d0f75'; x.fillRect(13, 17, 22, 16);
    x.fillStyle = '#ff2a44'; x.fillRect(16, 19, 5, 3); x.fillRect(27, 19, 5, 3); x.fillRect(16, 25, 5, 3); x.fillRect(27, 25, 5, 3);
    x.fillStyle = '#fff'; x.fillRect(18, 35, 2, 4); x.fillRect(28, 35, 2, 4);
    x.fillStyle = '#7a24e0'; x.fillRect(0, 42, 48, 6);
  },
  emperor(x) {
    x.fillStyle = '#05030a'; x.fillRect(0, 0, 48, 48);
    x.fillStyle = '#fff'; for (let i = 0; i < 14; i++) x.fillRect((i * 17) % 48, (i * 11) % 20, 1, 1);
    x.fillStyle = '#1a1026';
    for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(8 + i * 5, 12); x.lineTo(10 + i * 5, i === 3 ? 0 : 4); x.lineTo(12 + i * 5, 12); x.fill(); }
    x.fillStyle = '#0d0d14'; x.fillRect(11, 11, 26, 30);
    x.strokeStyle = '#9d3cff'; x.lineWidth = 1; x.strokeRect(11.5, 11.5, 25, 29);
    x.fillStyle = '#99f6ff';
    for (const [ex, ey] of [[15, 18], [22, 17], [29, 18], [15, 23], [22, 22], [29, 23]]) x.fillRect(ex, ey, 4, 2);
    x.fillStyle = '#9d3cff'; x.fillRect(17, 32, 14, 2);
    const g = x.createRadialGradient(24, 48, 0, 24, 48, 10); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#d23cff'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(10, 38, 28, 10);
  },
};
export function portrait(who) {
  if (!portraits[who]) {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    DRAW[who](c.getContext('2d'));
    portraits[who] = c;
  }
  return portraits[who];
}

// ===== Dialogue =====
const NAMES = {
  patch: ['PATCH', '#ff9a3c'], nova: ['COMMANDER NOVA', '#5ab8ff'], unit: ['UNIT-07', '#9fe8ff'],
  vrax: ['GENERAL VRAX', '#c45bff'], emperor: ['THE NULL EMPEROR', '#ff4af0'],
};
const D = { queue: [], cur: null, chars: 0, t: 0 };
export function say(who, s, hold = 2.2) { D.queue.push({ who, text: fill(s), hold }); }
// quick one-liners that never wait in line and never hold up the story
export function bark(who, s, hold = 1.3) {
  if ((D.cur && !D.cur.bark) || D.queue.length) return;
  D.cur = { who, text: fill(s), hold, bark: true }; D.chars = 0; D.t = 0;
}
export function sayNow(who, s, hold) { D.queue.length = 0; D.cur = null; say(who, s, hold); }
export const dialogBusy = () => !!D.cur || D.queue.length > 0;
export const speaking = () => (D.cur ? D.cur.who : null);
export function clearDialog() { D.queue.length = 0; D.cur = null; }
export function skipLine() {
  if (!D.cur) return;
  if (D.chars < D.cur.text.length) D.chars = D.cur.text.length; else D.cur = null;
}
export function updateDialog(dt) {
  if (D.cur && D.cur.bark && D.queue.length) D.cur = null;
  if (!D.cur && D.queue.length) { D.cur = D.queue.shift(); D.chars = 0; D.t = 0; }
  if (!D.cur) return;
  const before = Math.floor(D.chars);
  D.chars = Math.min(D.cur.text.length, D.chars + dt * 42);
  if (Math.floor(D.chars) > before && before % 3 === 0) sfx.blip();
  if (D.chars >= D.cur.text.length) {
    D.t += dt;
    if (D.t > D.cur.hold + D.cur.text.length * 0.025) D.cur = null;
  }
}
export function drawDialog(bottom) {
  if (!D.cur) return;
  const c = G.hctx, small = G.w < 640;
  const w = Math.min(780, G.w - 16), size = small ? 9 : 12, ps = small ? 56 : 80;
  const lines = wrap(D.cur.text, w - ps - 36, size);
  const h = Math.max(ps + 16, 40 + lines.length * (size + 9));
  const x0 = (G.w - w) / 2, y0 = bottom - h;
  const [name, col] = NAMES[D.cur.who];
  panel(x0, y0, w, h, col);
  c.imageSmoothingEnabled = false;
  c.drawImage(portrait(D.cur.who), x0 + 8, y0 + 8, ps, ps);
  c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(x0 + 8, y0 + 8, ps, ps);
  const tx = x0 + ps + 22;
  text(name, tx, y0 + 18, size, col, 'left', { stroke: false });
  let left = Math.floor(D.chars);
  lines.forEach((ln, i) => {
    if (left <= 0) return;
    const part = ln.slice(0, left); left -= ln.length + 1;
    text(part, tx, y0 + 40 + i * (size + 9), size, '#fff', 'left', { stroke: false });
  });
}

// ===== Big warnings like JUMP! and DASH! =====
let warning = null;
export function warn(s, col, dur = 1.2, force = false) {
  if (!G.settings.hints && !force) return;
  warning = { s, col, t: dur, max: dur };
}
export function drawWarn(dt) {
  if (!warning) return;
  warning.t -= dt;
  if (warning.t <= 0) { warning = null; return; }
  const on = Math.floor(warning.t * 8) % 2 === 0, k = 1 + Math.max(0, warning.t - warning.max + 0.2) * 2;
  G.hctx.globalAlpha = on ? 1 : 0.55;
  text(warning.s, G.w / 2, G.h * 0.3, Math.min(54, G.w / 9) * k, warning.col, 'center', { glow: warning.col });
  G.hctx.globalAlpha = 1;
}
export function clearWarn() { warning = null; }

// ===== Patch's scan card =====
let scan = null;
export function showScan(info) { scan = { ...info, t: 7 }; }
export function clearScan() { scan = null; }
export function drawScan(dt, top) {
  if (!scan) return;
  scan.t -= dt;
  if (scan.t <= 0) { scan = null; return; }
  const small = G.w < 640, w = Math.min(330, G.w - 16), size = small ? 8 : 9;
  const info = wrap(scan.info, w - 24, size), weak = wrap('WEAKNESS: ' + scan.weak, w - 24, size);
  const h = 74 + (info.length + weak.length) * (size + 7);
  const slide = Math.min(1, (7 - scan.t) * 4) * Math.min(1, scan.t * 3);
  const x0 = G.w - 8 - w * slide, y0 = top;
  panel(x0, y0, w, h, '#33bbff');
  text('PATCH SCAN', x0 + 12, y0 + 16, size, '#33bbff', 'left', { stroke: false });
  text(scan.name, x0 + 12, y0 + 38, small ? 12 : 15, '#fff', 'left', { stroke: false, max: w - 24 });
  text(scan.role, x0 + 12, y0 + 58, size, '#ff9a3c', 'left', { stroke: false });
  let y = y0 + 78;
  for (const l of info) { text(l, x0 + 12, y, size, '#cfe9ff', 'left', { stroke: false }); y += size + 7; }
  for (const l of weak) { text(l, x0 + 12, y, size, '#ffe14a', 'left', { stroke: false }); y += size + 7; }
}

// ===== Visor cracks: the robot's eyes break when it gets hurt =====
export function makeCrack(severity = 1) {
  const cx = rnd(0.12, 0.88), cy = rnd(0.12, 0.85), lines = [];
  const n = 4 + ((Math.random() * 4) | 0);
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rnd(-0.3, 0.3), x = cx, y = cy;
    const len = rnd(0.07, 0.2) * Math.min(2, 0.6 + severity), seg = 4 + ((Math.random() * 4) | 0);
    for (let k = 0; k < seg; k++) {
      const l = len / seg, nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l * 1.6;
      lines.push([x, y, nx, ny, 1 - k / seg]);
      if (Math.random() < 0.3) { const b = a + rnd(-1, 1); lines.push([nx, ny, nx + Math.cos(b) * l * 0.8, ny + Math.sin(b) * l * 1.3, 0.4]); }
      x = nx; y = ny; a += rnd(-0.45, 0.45);
    }
  }
  return { cx, cy, lines, r: rnd(0.008, 0.016) };
}
export function drawCracks(cracks) {
  if (!cracks.length) return;
  const c = G.hctx, W = G.w, H = G.h;
  c.lineCap = 'round';
  for (const cr of cracks) {
    c.strokeStyle = 'rgba(90,180,255,0.22)'; c.lineWidth = 5;
    c.beginPath(); for (const l of cr.lines) { c.moveTo(l[0] * W, l[1] * H); c.lineTo(l[2] * W, l[3] * H); } c.stroke();
    for (const l of cr.lines) {
      c.strokeStyle = `rgba(235,248,255,${0.5 + l[4] * 0.45})`; c.lineWidth = 0.8 + l[4] * 1.6;
      c.beginPath(); c.moveTo(l[0] * W, l[1] * H); c.lineTo(l[2] * W, l[3] * H); c.stroke();
    }
    c.fillStyle = 'rgba(220,240,255,0.55)';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = (i % 2 ? 0.4 : 1) * cr.r * Math.min(W, H) * 2.5;
      c.lineTo(cr.cx * W + Math.cos(a) * r, cr.cy * H + Math.sin(a) * r);
    }
    c.fill();
  }
}

// ===== The inside edge of UNIT-07's helmet =====
export function drawVisor(od, low, t) {
  const c = G.hctx, W = G.w, H = G.h, e = Math.min(W, H) * 0.09;
  c.fillStyle = 'rgba(6,10,20,0.85)';
  for (const [ax, ay, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) {
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + sx * e * 1.8, ay); c.lineTo(ax, ay + sy * e * 1.4); c.fill();
  }
  c.strokeStyle = od ? `rgba(160,220,255,${0.6 + Math.sin(t * 20) * 0.3})` : 'rgba(42,157,255,0.55)';
  c.lineWidth = od ? 4 : 2;
  for (const [ax, ay, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) {
    c.beginPath(); c.moveTo(ax + sx * e * 1.8, ay); c.lineTo(ax, ay + sy * e * 1.4); c.stroke();
  }
  if (od) {
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(60,160,255,0)'); g.addColorStop(1, `rgba(90,190,255,${0.35 + Math.sin(t * 10) * 0.1})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  c.fillStyle = 'rgba(0,0,0,0.07)';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  if (low) {
    c.fillStyle = `rgba(255,30,30,${0.08 + Math.max(0, Math.sin(t * 6)) * 0.12})`; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(255,255,255,${rnd(0.03, 0.12)})`; c.fillRect(0, rnd(0, H), W, rnd(1, 4)); }
  }
}

// ===== The ALIEN ASSAULT logo: metal letters, green cracks, blue energy, ASSAULT battle-damaged =====
let logo = null;
export function makeLogo() {
  const W = 1400, Hh = 560;
  const out = document.createElement('canvas'); out.width = W; out.height = Hh;
  const o = out.getContext('2d');
  let seed = 7;
  const rr = (a, b) => { seed = (seed * 9301 + 49297) % 233280; return a + (seed / 233280) * (b - a); };
  const word = (s, y, size, damaged) => {
    const L = document.createElement('canvas'); L.width = W; L.height = Hh;
    const x = L.getContext('2d');
    x.font = `${size}px ${PF}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    const g = x.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#c9d3e0'); g.addColorStop(0.48, '#6a7890'); g.addColorStop(0.52, '#eef3fa'); g.addColorStop(1, '#808a9c');
    x.fillStyle = g; x.fillText(s, W / 2, y);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, y - size / 2, W, size * 0.08);
    x.shadowColor = '#39ff6a'; x.shadowBlur = 12; x.strokeStyle = '#8dffb0'; x.lineWidth = 4;
    for (let i = 0; i < (damaged ? 16 : 10); i++) {
      let px = rr(W / 2 - size * s.length * 0.5, W / 2 + size * s.length * 0.5), py = y + rr(-size / 2, size / 2);
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 5; k++) { px += rr(-size * 0.25, size * 0.25); py += rr(-size * 0.2, size * 0.2); x.lineTo(px, py); }
      x.stroke();
    }
    x.shadowBlur = 0;
    if (damaged) {
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = 'rgba(20,10,10,0.55)';
      for (let i = 0; i < 10; i++) { x.beginPath(); x.arc(rr(300, 1100), y + rr(-size / 2, size / 2), rr(10, 30), 0, 7); x.fill(); }
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i++) {
        const cx = rr(320, 1080), cy = y + (Math.random() < 0.5 ? -1 : 1) * size * 0.45;
        x.beginPath(); x.moveTo(cx, cy);
        for (let k = 0; k < 5; k++) x.lineTo(cx + rr(-26, 26), cy + rr(-22, 22));
        x.fill();
      }
      for (let i = 0; i < 7; i++) { x.beginPath(); x.arc(rr(320, 1080), y + rr(-size / 3, size / 3), rr(4, 9), 0, 7); x.fill(); }
    }
    o.save();
    if (damaged) { o.translate(W / 2, y); o.rotate(-0.035); o.translate(-W / 2, -y); }
    o.shadowColor = '#2a9dff'; o.shadowBlur = 40;
    o.font = `${size}px ${PF}`; o.textAlign = 'center'; o.textBaseline = 'middle';
    o.lineJoin = 'round'; o.lineWidth = 16; o.strokeStyle = '#1a6dff'; o.strokeText(s, W / 2, y);
    o.shadowBlur = 0; o.lineWidth = 8; o.strokeStyle = '#05080f'; o.strokeText(s, W / 2, y);
    o.drawImage(L, 0, 0);
    o.restore();
  };
  word('ALIEN', 160, 150, false);
  word('ASSAULT', 390, 124, true);
  logo = out;
}
let shineC = null;
export function drawLogo(cx, top, width, flick, o = {}) {
  if (!logo) return;
  const c = G.hctx, h = (width * logo.height) / logo.width;
  const a = o.alpha ?? 1;
  c.globalAlpha = a * (flick > 0 && Math.random() < 0.5 ? 0.35 : 1);
  c.drawImage(logo, cx - width / 2, top, width, h);
  // a bright shine sweeping across the metal letters
  if (o.shine !== undefined && o.shine > -0.2 && o.shine < 1.2) {
    if (!shineC) { shineC = document.createElement('canvas'); shineC.width = logo.width; shineC.height = logo.height; }
    const s = shineC.getContext('2d'), W = logo.width, Hh = logo.height, x = o.shine * W * 1.3 - W * 0.15;
    s.globalCompositeOperation = 'source-over'; s.clearRect(0, 0, W, Hh);
    s.drawImage(logo, 0, 0);
    s.globalCompositeOperation = 'source-in';
    const g = s.createLinearGradient(x - 160, 0, x + 160, Hh * 0.4);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    s.fillStyle = g; s.fillRect(0, 0, W, Hh);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(shineC, cx - width / 2, top, width, h);
    c.globalCompositeOperation = 'source-over';
  }
  if (flick > 0) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, flick);
    c.drawImage(logo, cx - width / 2, top, width, h);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = 1;
  return h;
}

// ===== Menus =====
export function menu(items, sel, x, y, size, gap, align = 'center') {
  const rects = [];
  items.forEach((it, i) => {
    const label = typeof it === 'string' ? it : it.label, off = typeof it === 'object' && it.disabled;
    const yy = y + i * gap, on = i === sel;
    const col = off ? '#555b6a' : on ? '#7fe3ff' : '#e8eef8';
    const s = on ? `> ${label} <` : label;
    text(s, x, yy, size, col, align, on ? { glow: '#2a9dff' } : {});
    G.hctx.font = `${size}px ${PF}`;
    const w = G.hctx.measureText(s).width + 30;
    const rx = align === 'center' ? x - w / 2 : align === 'left' ? x - 15 : x - w + 15;
    rects.push({ x: rx, y: yy - gap / 2, w, h: gap, i, off });
  });
  return rects;
}
export function hitRect(rects, mx, my) {
  for (const r of rects) if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r;
  return null;
}

// ===== Credits roll, shared by the title menu and the ending =====
export function drawCredits(lines, scroll) {
  const small = G.w < 640;
  let y = G.h - scroll;
  for (const [s, kind] of lines) {
    const size = kind === 'big' ? (small ? 22 : 40) : kind === 'head' ? (small ? 9 : 12) : small ? 9 : 13;
    const col = kind === 'big' ? '#c9d3e0' : kind === 'head' ? '#39ff6a' : '#fff';
    if (s && y > -40 && y < G.h + 40) text(s, G.w / 2, y, size, col, 'center', kind === 'big' ? { glow: '#2a9dff' } : {});
    y += kind === 'big' ? 70 : 34;
  }
  return y < -20;
}
