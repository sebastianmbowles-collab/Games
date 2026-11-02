// ================= CORE: screen, text, random numbers, pixel art =================
const W = 320, H = 180;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const FONT = '"Press Start 2P", monospace';

function resize() {
  const ww = innerWidth, wh = innerHeight, s = Math.min(ww / W, wh / H);
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  cv.style.left = (ww - W * s) / 2 + 'px'; cv.style.top = (wh - H * s) / 2 + 'px';
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const R = Math.random;
const rr = (a, b) => a + R() * (b - a);
const pickR = a => a[(R() * a.length) | 0];
let seed = 1;
function srand(s) { seed = (s >>> 0) || 1; }
function rnd() { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; }
const pick = a => a[(rnd() * a.length) | 0];
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
function rgb(r, g, b) { return `rgb(${clamp(r | 0, 0, 255)},${clamp(g | 0, 0, 255)},${clamp(b | 0, 0, 255)})`; }
function shade(h, f) {
  const [r, g, b] = hexRgb(h);
  return f < 1 ? rgb(r * f, g * f, b * f) : rgb(r + (255 - r) * (f - 1), g + (255 - g) * (f - 1), b + (255 - b) * (f - 1));
}

// ---- text ----
function txt(s, x, y, col = '#f4ecd0', align = 'left', size = 8, sh = '#000') {
  ctx.font = size + 'px ' + FONT; ctx.textAlign = align; ctx.textBaseline = 'top';
  if (sh) { ctx.fillStyle = sh; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function wrapText(s, maxW, size = 8) {
  ctx.font = size + 'px ' + FONT;
  const words = s.split(' '), lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function box(x, y, w, h, bg = '#16180f', border = '#c8b77a') {
  rect(x, y, w, h, border); rect(x + 1, y + 1, w - 2, h - 2, '#000'); rect(x + 2, y + 2, w - 4, h - 4, bg);
}
function bar(x, y, w, h, f, col, bg = '#300') { rect(x, y, w, h, '#000'); rect(x + 1, y + 1, w - 2, h - 2, bg); rect(x + 1, y + 1, (w - 2) * clamp(f, 0, 1), h - 2, col); }

// ================= EGG ARTIST =================
// Every egg is drawn from a recipe: shell colour, hat, eyes, mouth, mustache, scars, cracks...
function makeEgg(o) {
  const w = o.w || 14, h = o.h || 18, padT = 8, padS = 3;
  const [c, x] = mk(w + padS * 2, h + padT + 1);
  const ox = padS, oy = padT, cy = h * 0.58;
  const inside = (px, py) => {
    if (px < 0 || px >= w || py < 0 || py >= h) return false;
    const nx = (px + 0.5 - w / 2) / (w / 2), py2 = py + 0.5;
    const ny = py2 < cy ? (py2 - cy) / cy : (py2 - cy) / (h - cy);
    const k = ny < 0 ? 1 - 0.22 * ny * ny : 1;
    return (nx / k) * (nx / k) + ny * ny <= 1;
  };
  const span = py => { let a = -1, b = -1; for (let px = 0; px < w; px++) if (inside(px, py)) { if (a < 0) a = px; b = px; } return [a, b]; };
  const P = (px, py, col) => { x.fillStyle = col; x.fillRect(ox + px, oy + py, 1, 1); };
  srand(o.seed || 7);
  const base = o.shell, dark = shade(base, 0.5), mid = shade(base, 0.8), hi = shade(base, 1.4);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    if (!inside(px, py)) continue;
    const nx = (px + 0.5 - w / 2) / (w / 2), ny = (py + 0.5 - cy) / cy;
    let col = base;
    if (!inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1)) col = dark;
    else if (nx > 0.45 || (py > h * 0.85)) col = mid;
    else if (nx < -0.15 && nx > -0.6 && ny < -0.2 && ny > -0.75) col = hi;
    if (o.spots && col === base && rnd() < 0.1) col = shade(base, 0.72);
    P(px, py, col);
  }
  // cracks: zig-zags creeping down from the top
  for (let i = 0; i < (o.cracks || 0); i++) {
    let px = Math.round(w * (0.3 + rnd() * 0.45)), py = Math.round(h * 0.12 + rnd() * 3);
    for (let s = 0; s < 4 + (rnd() * 3 | 0); s++) { if (inside(px, py)) P(px, py, dark); py++; px += rnd() < 0.5 ? -1 : 1; }
  }
  const cx = Math.floor(w / 2), ey = Math.round(h * 0.47), my = ey + 4;
  const lx = cx - 3 - (w >= 16 ? 1 : 0), rx = cx + 2 + (w >= 16 ? 1 : 0);
  if (!o.back) {
    const eyeC = o.eyeCol || '#141414';
    if (o.eyes === 'big') { [lx, rx].forEach(ex => { P(ex, ey, eyeC); P(ex + 1, ey, eyeC); P(ex, ey + 1, eyeC); P(ex + 1, ey + 1, eyeC); P(ex, ey, '#fff'); }); }
    else if (o.eyes === 'sleepy') { [lx, rx].forEach(ex => { P(ex, ey + 1, eyeC); P(ex + 1, ey + 1, eyeC); }); }
    else if (o.eyes === 'wide') { [lx, rx].forEach(ex => { P(ex, ey - 1, '#fff'); P(ex, ey, eyeC); P(ex, ey + 1, eyeC); P(ex - 1, ey, '#fff'); }); }
    else { [lx, rx].forEach(ex => { P(ex, ey, eyeC); P(ex, ey + 1, eyeC); }); }
    if (o.brow === 'angry') { P(lx - 1, ey - 2, '#222'); P(lx, ey - 2, '#222'); P(lx + 1, ey - 1, '#222'); P(rx + 1, ey - 2, '#222'); P(rx, ey - 2, '#222'); P(rx - 1, ey - 1, '#222'); }
    else if (o.brow === 'worried') { P(lx - 1, ey - 1, '#333'); P(lx, ey - 2, '#333'); P(rx + 1, ey - 1, '#333'); P(rx, ey - 2, '#333'); }
    else if (o.brow === 'bushy') { for (let i = -1; i <= 1; i++) { P(lx + i, ey - 2, o.mcol || '#ddd'); P(rx + i, ey - 2, o.mcol || '#ddd'); } }
    if (o.patch) { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) P(rx + i, ey + j + 1, '#111'); for (let i = 0; i < w; i++) { const yy = ey - 2 - Math.round((i - rx) * 0.4); if (inside(i, yy) && Math.abs(i - rx) > 1) P(i, yy, '#111'); } }
    if (o.glasses) { [lx, rx].forEach(ex => { for (let i = -1; i <= 1; i++) { P(ex + i, ey - 1, '#333'); P(ex + i, ey + 2, '#333'); } P(ex - 1, ey, '#333'); P(ex - 1, ey + 1, '#333'); P(ex + 1, ey, '#333'); P(ex + 1, ey + 1, '#333'); }); for (let i = lx + 2; i < rx - 1; i++) P(i, ey, '#333'); }
    if (o.scar) { P(lx - 1, ey - 2, '#7a2a22'); P(lx, ey - 1 + 0, '#7a2a22'); P(lx + 1, ey + 2, '#7a2a22'); P(lx + 2, ey + 3, '#7a2a22'); }
    const mc = o.mcol || '#3a2814';
    if (o.mustache === 'small') { for (let i = -2; i <= 1; i++) P(cx + i, my - 1, mc); }
    else if (o.mustache === 'big') { for (let i = -3; i <= 2; i++) P(cx + i, my - 1, mc); for (let i = -2; i <= 1; i++) P(cx + i, my - 2, mc); P(cx - 4, my, mc); P(cx + 3, my, mc); }
    else if (o.mustache === 'huge') { for (let i = -4; i <= 3; i++) { P(cx + i, my - 1, mc); P(cx + i, my - 2, mc); } P(cx - 5, my, mc); P(cx + 4, my, mc); P(cx - 5, my + 1, mc); P(cx + 4, my + 1, mc); }
    if (o.mouth === 'smile') { P(cx - 2, my + 1, '#3a1d12'); P(cx - 1, my + 2, '#3a1d12'); P(cx, my + 2, '#3a1d12'); P(cx + 1, my + 1, '#3a1d12'); }
    else if (o.mouth === 'frown') { P(cx - 2, my + 2, '#3a1d12'); P(cx - 1, my + 1, '#3a1d12'); P(cx, my + 1, '#3a1d12'); P(cx + 1, my + 2, '#3a1d12'); }
    else if (o.mouth === 'grin') { for (let i = -2; i <= 1; i++) { P(cx + i, my + 1, '#fff'); P(cx + i, my + 2, '#3a1d12'); } }
    else if (o.mouth === 'open') { P(cx - 1, my + 1, '#3a1d12'); P(cx, my + 1, '#3a1d12'); P(cx - 1, my + 2, '#8a2a2a'); P(cx, my + 2, '#8a2a2a'); }
    else if (o.mouth !== 'none') { P(cx - 1, my + 1, '#3a1d12'); P(cx, my + 1, '#3a1d12'); }
  }
  // ---- hats ----
  const hc = o.hatCol || '#5b6b2e', hd = shade(hc, 0.6), hl = shade(hc, 1.3);
  const hat = o.hat || 'none';
  if (hat === 'helmet' || hat === 'medic' || hat === 'spike') {
    const hb = Math.round(h * 0.3);
    for (let py = -1; py <= hb; py++) {
      const [a, b] = span(Math.max(0, py)); if (a < 0) continue;
      const ext = py === hb ? 2 : 1;
      for (let px = a - ext; px <= b + ext; px++) P(px, py, py === hb ? hd : (py <= 0 ? hl : hc));
    }
    for (let px = 1; px < w - 1; px++) if (inside(px, 0) || inside(px, 1)) P(px, -2, hd);
    if (hat === 'medic') { P(cx, hb - 4, '#c22'); P(cx - 1, hb - 3, '#c22'); P(cx, hb - 3, '#c22'); P(cx + 1, hb - 3, '#c22'); P(cx, hb - 2, '#c22'); }
    if (hat === 'spike') { P(cx, -3, '#888'); P(cx, -4, '#bbb'); P(cx - 1, -2, '#666'); P(cx + 1, -2, '#666'); }
    if (o.star) { P(cx, hb - 3, '#ffd23a'); P(cx - 1, hb - 2, '#ffd23a'); P(cx + 1, hb - 2, '#ffd23a'); P(cx, hb - 2, '#ffd23a'); }
    for (let i = 0; i < (o.chev || 0); i++) { P(lx - 1 + i * 2, hb - 1, '#ffd23a'); }
    if (o.net) { for (let px = 0; px < w; px += 3) P(px, Math.round(hb / 2), hd); }
  } else if (hat === 'peaked') {
    const band = o.band || '#a8322c';
    for (let py = -5; py <= 1; py++) { const ex = py < -3 ? 2 : 1; for (let px = 1 - ex; px <= w - 2 + ex; px++) P(px, py, py <= -4 ? hl : hc); }
    for (let px = 0; px <= w - 1; px++) { P(px, 0, band); P(px, 1, band); }
    for (let px = 1; px <= w - 2; px++) P(px, 2, '#111');
    P(cx, -2, '#ffd23a'); P(cx - 1, -2, '#e0b020');
    if (o.skull) { P(cx - 1, -3, '#9c6'); P(cx, -3, '#9c6'); P(cx - 1, -2, '#9c6'); P(cx, -2, '#9c6'); }
  } else if (hat === 'beret') {
    for (let py = -3; py <= 1; py++) for (let px = 0; px < w - 2; px++) { const dx = (px - w * 0.4) / (w * 0.55), dy = (py + 1) / 2.6; if (dx * dx + dy * dy <= 1) P(px, py, py < -1 ? hl : hc); }
    P(Math.round(w * 0.4), -4, hd);
  } else if (hat === 'bandana') {
    const by = Math.round(h * 0.2);
    for (let py = by; py <= by + 2; py++) { const [a, b] = span(py); for (let px = a; px <= b; px++) P(px, py, py === by + 2 ? hd : hc); }
    const [, b] = span(by + 1); P(b + 1, by + 1, hc); P(b + 2, by + 2, hc); P(b + 2, by + 3, hd);
  } else if (hat === 'cap') {
    for (let py = -2; py <= Math.round(h * 0.18); py++) { const [a, b] = span(Math.max(0, py)); for (let px = a; px <= b; px++) P(px, py, py < 0 ? hl : hc); }
    const by = Math.round(h * 0.18) + 1; for (let px = cx - 4; px <= cx + 5; px++) P(px, by, hd);
  } else if (hat === 'crown') {
    for (let px = 2; px < w - 2; px++) { P(px, 0, '#e8b820'); P(px, -1, '#ffd23a'); if (px % 3 === 0) { P(px, -2, '#ffd23a'); P(px, -3, '#fff07a'); } }
  }
  if (o.stink) { for (let i = 0; i < 3; i++) { const sx = 2 + i * Math.round(w / 3); for (let s = 0; s < 5; s++) P(sx + ((s % 2) ? 1 : 0), -3 - s, 'rgba(120,200,60,0.7)'); } }
  if (o.glow) { x.globalCompositeOperation = 'destination-over'; x.fillStyle = 'rgba(255,220,80,0.35)'; x.beginPath(); x.ellipse(ox + w / 2, oy + h / 2, w / 2 + 3, h / 2 + 3, 0, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; }
  return c;
}

// The cast. Every one is different.
const CAST = {
  shelly: st => ({ name: 'SHELLY', shell: st >= 5 ? '#ebe8dc' : '#f4f1e6', w: st === 0 ? 12 : 14, h: st === 0 ? 16 : 18, hat: 'helmet', hatCol: st >= 4 ? '#5f6648' : '#5b6b2e', star: st >= 4,
    eyes: st === 0 ? 'big' : 'normal', brow: st >= 3 ? 'angry' : 'none', cracks: Math.min(st, 4), scar: st >= 2, mustache: st >= 5 ? 'big' : st >= 3 ? 'small' : null,
    mcol: st >= 5 ? '#dcdcdc' : '#6a5038', mouth: st === 0 ? 'smile' : 'flat', chev: Math.min(st, 4), net: st >= 1, seed: 11 }),
  general: () => ({ name: 'GENERAL YOLKINGTON', shell: '#b07a45', w: 16, h: 20, hat: 'peaked', hatCol: '#3f4a25', band: '#a8322c', mustache: 'huge', mcol: '#e4e4e4', brow: 'bushy', eyes: 'normal', mouth: 'frown', cracks: 2, seed: 3 }),
  scramble: () => ({ name: 'SGT. SCRAMBLE', shell: '#c99a66', spots: true, w: 15, h: 19, hat: 'bandana', hatCol: '#a03028', scar: true, eyes: 'normal', brow: 'angry', mouth: 'grin', cracks: 1, seed: 21 }),
  benny: () => ({ name: 'CPL. BENNY BENEDICT', shell: '#efe2c4', w: 14, h: 18, hat: 'cap', hatCol: '#56662c', glasses: true, eyes: 'normal', mouth: 'smile', seed: 5 }),
  coddle: () => ({ name: 'MEDIC CODDLE', shell: '#e8eef2', w: 14, h: 18, hat: 'medic', hatCol: '#e8e8e0', eyes: 'big', mouth: 'smile', seed: 8 }),
  poach: () => ({ name: 'PVT. POACH', shell: '#b9d3e0', w: 11, h: 15, hat: 'helmet', hatCol: '#5b6b2e', eyes: 'wide', brow: 'worried', mouth: 'open', seed: 9 }),
  rotten: () => ({ name: 'THE ROTTEN EGG', shell: '#7d8f3a', spots: true, w: 18, h: 22, hat: 'peaked', hatCol: '#1e1e1e', band: '#4a6a1a', skull: true, patch: true, eyes: 'normal', eyeCol: '#e22', brow: 'angry', mouth: 'grin', stink: true, cracks: 3, seed: 13 }),
  narrator: () => ({ name: 'NARRATOR', shell: '#d8c890', w: 14, h: 18, hat: 'crown', glow: true, eyes: 'sleepy', mouth: 'none', seed: 1 }),
};
const FRIEND_SHELLS = ['#f4f1e6', '#efe2c4', '#d9b48a', '#c99a66', '#e9e4f0', '#b9d3e0', '#f0d8c0'];
const FRIEND_HATS = ['helmet', 'helmet', 'cap', 'beret', 'bandana', 'none', 'medic'];
const ENEMY_SHELLS = ['#8a9a4a', '#9aa070', '#7f8b55', '#a0a878', '#6f7f3a', '#8f9460'];
function randomEgg(enemy, s) {
  srand(s * 7919 + 17);
  const o = enemy ? {
    shell: pick(ENEMY_SHELLS), spots: rnd() < 0.6, hat: pick(['helmet', 'spike', 'helmet', 'cap', 'bandana']), hatCol: pick(['#262626', '#3a3a3a', '#2a3320', '#4a2a2a']),
    eyes: 'normal', eyeCol: pick(['#d22', '#e33', '#111']), brow: 'angry', mouth: pick(['grin', 'frown', 'flat']), mustache: pick([null, null, 'small', 'big']), mcol: '#222',
    scar: rnd() < 0.3, patch: rnd() < 0.15, stink: rnd() < 0.5, cracks: (rnd() * 3) | 0, w: pick([13, 14, 15]), h: pick([17, 18, 19])
  } : {
    shell: pick(FRIEND_SHELLS), spots: rnd() < 0.25, hat: pick(FRIEND_HATS), hatCol: pick(['#5b6b2e', '#56662c', '#6b5a2e', '#2e4a6b', '#7a2a2a', '#4b5320']),
    eyes: pick(['normal', 'normal', 'big', 'wide', 'sleepy']), brow: pick(['none', 'worried', 'angry', 'none']), mouth: pick(['smile', 'flat', 'open', 'grin']),
    mustache: pick([null, null, null, 'small', 'big']), mcol: pick(['#3a2814', '#6a5038', '#bbb']), glasses: rnd() < 0.15, scar: rnd() < 0.15, cracks: (rnd() * 2) | 0,
    w: pick([12, 13, 14, 15]), h: pick([16, 17, 18, 19])
  };
  o.seed = s + 3;
  return makeEgg(o);
}
const eggCache = {};
function eggSprite(key, st) { const k = key + (st || 0); return eggCache[k] || (eggCache[k] = makeEgg(CAST[key](st || 0))); }
const friendSprites = [], enemySprites = [];
for (let i = 0; i < 16; i++) { friendSprites.push(randomEgg(false, i + 1)); enemySprites.push(randomEgg(true, i + 101)); }

// Big yolky splat sprite (for 3D floors and walls)
function makeSplat(sd) {
  const [c, x] = mk(24, 12); srand(sd);
  x.fillStyle = '#f2efe4';
  for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(12 + (rnd() - 0.5) * 14, 6 + (rnd() - 0.5) * 5, 2 + rnd() * 4, 1 + rnd() * 2, 0, 0, 7); x.fill(); }
  x.fillStyle = '#f5b819'; x.beginPath(); x.ellipse(12, 6, 4, 2.5, 0, 0, 7); x.fill();
  x.fillStyle = '#ffd94a'; x.fillRect(10, 5, 2, 1);
  x.fillStyle = '#ddd8c8'; for (let i = 0; i < 5; i++) x.fillRect((rnd() * 22) | 0, (rnd() * 10) | 0, 2, 1);
  return c;
}
const SPLATS = [makeSplat(1), makeSplat(2), makeSplat(3)];

// ---- explosion animation frames (fire ball -> smoke) ----
const BOOM = (() => {
  const fr = [];
  for (let f = 0; f < 10; f++) {
    const [c, x] = mk(40, 40); srand(99 + f);
    const t = f / 9, r = 6 + t * 14;
    const cols = t < 0.2 ? ['#fff', '#fff4a0', '#ffd040'] : t < 0.5 ? ['#ffd040', '#ff8a20', '#d03a10'] : t < 0.75 ? ['#d05a20', '#7a2a10', '#3a2a22'] : ['#4a4038', '#3a3430', '#2a2624'];
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 7, d = rnd() * r * 0.7, rad = r * (0.25 + rnd() * 0.35);
      x.fillStyle = cols[(rnd() * 3) | 0]; x.globalAlpha = t > 0.75 ? 0.75 - (t - 0.75) * 2 : 1;
      x.beginPath(); x.arc(20 + Math.cos(a) * d, 22 + Math.sin(a) * d * 0.8 - t * 6, rad, 0, 7); x.fill();
    }
    fr.push(c);
  }
  return fr;
})();
