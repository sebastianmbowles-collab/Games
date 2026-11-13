// ---------- 2D art: the film-grain overlay, camera feeds, the photograph, the face ----------
// The shop itself is 3D (35_world.js). This canvas sits on top of it.
let cx = cv.getContext('2d');
const r = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(x, y, w, h); };
function tx(s, x, y, size, c, align, font) { cx.font = size + 'px ' + (font || 'VT323, "Courier New", monospace'); cx.fillStyle = c; cx.textAlign = align || 'left'; cx.textBaseline = 'alphabetic'; cx.fillText(s, x, y); }
function ell(x, y, rx, ry, c) { cx.fillStyle = c; cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, 0, 6.3); cx.fill(); }
function poly(p, c) { cx.fillStyle = c; cx.beginPath(); cx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) cx.lineTo(p[i][0], p[i][1]); cx.closePath(); cx.fill(); }

const NOISE = document.createElement('canvas'); NOISE.width = NOISE.height = 256;
(() => { const n = NOISE.getContext('2d'), d = n.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } n.putImageData(d, 0, 0); })();
const VIG = document.createElement('canvas'); VIG.width = W; VIG.height = H;
(() => { const v = VIG.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, 90, W / 2, H / 2, 300); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.62)'); v.fillStyle = g; v.fillRect(0, 0, W, H); })();
function grain(a) { cx.save(); cx.globalAlpha = a; const ox = Math.random() * 256 | 0, oy = Math.random() * 256 | 0; for (let x = -ox; x < W; x += 256) for (let y = -oy; y < H; y += 256) cx.drawImage(NOISE, x, y); cx.restore(); }

const LOOKS = {
  dale: { coat: '#7a2f2a', legs: '#2a3140', skin: '#c99b7a', hat: '#31403a', face: 'normal' },
  nurse: { coat: '#4f8f8a', legs: '#3f7873', skin: '#b98363', hair: '#231a14', face: 'normal' },
  old: { coat: '#6b6252', legs: '#3a352c', skin: '#d0b49a', hair: '#bdbdb5', face: 'normal' },
  teen: { coat: '#39424f', legs: '#22252b', skin: '#c9a184', hood: true, face: 'normal' },
  suit: { coat: '#3c3442', legs: '#2a2630', skin: '#d3ad92', hair: '#5a3a22', face: 'normal', long: true },
  driver: { coat: '#8a5a22', legs: '#33312b', skin: '#a87957', hat: '#8a5a22', face: 'normal' },
  blank1: { coat: '#56505c', legs: '#2a2630', skin: '#cdbba6', hair: '#2b2622', face: 'none' },
  blank2: { coat: '#4a5a4a', legs: '#2b302b', skin: '#c9b8a8', hat: '#2f352f', face: 'none' },
  stand: { coat: '#2b2f2c', legs: '#1c1e1c', skin: '#b9b3a6', hair: '#1a1a18', face: 'none' },
  coat: { coat: '#d8ad12', legs: '#15161a', skin: '#b9b3a6', hood: true, face: 'void', long: true },
  hallow: { coat: '#7c7f84', legs: '#6d7075', skin: '#d9c2ad', hair: '#3b3b3b', face: 'hallow', tie: '#4a1d1d', clip: true },
  you: { coat: '#39473f', legs: '#20242a', skin: '#c9a184', hat: '#7d2b24', face: 'normal' },
  shade: { sil: '#050606' }
};
// A flat paper-doll figure, used inside camera feeds and the photograph.
function person(x, by, h, L, o) {
  o = o || {}; const s = h / 100, sil = L.sil || o.sil, C = k => sil || L[k];
  cx.save(); cx.translate(x, by); cx.scale(s, s);
  cx.fillStyle = C('legs') || '#1b1d22'; cx.fillRect(-9, -46, 8, 46); cx.fillRect(1, -46, 8, 46);
  cx.fillStyle = C('coat') || '#333'; const hem = L.long ? -18 : -40;
  cx.beginPath(); cx.moveTo(-15, -80); cx.quadraticCurveTo(0, -87, 15, -80); cx.lineTo(14, hem); cx.lineTo(-14, hem); cx.closePath(); cx.fill();
  cx.fillRect(-20, -79, 6, 36); cx.fillRect(14, -79, 6, 36);
  cx.fillStyle = C('skin') || '#ccc'; cx.fillRect(-20, -44, 6, 5); cx.fillRect(14, -44, 6, 5);
  if (L.hood) { cx.fillStyle = C('coat'); cx.beginPath(); cx.ellipse(0, -91, 10.5, 12.5, 0, 0, 6.3); cx.fill(); }
  if (o.back) { cx.fillStyle = C('hair') || C('coat'); cx.beginPath(); cx.ellipse(0, -90, 7.4, 9, 0, 0, 6.3); cx.fill(); }
  else {
    cx.fillStyle = C('skin'); cx.beginPath(); cx.ellipse(0, -90, 7.2, 8.8, 0, 0, 6.3); cx.fill();
    if (!sil) {
      if (L.hair) { cx.fillStyle = L.hair; cx.beginPath(); cx.ellipse(0, -94.5, 7.6, 5.2, 0, 3.14, 6.29); cx.fill(); }
      if (L.hat) { cx.fillStyle = L.hat; cx.beginPath(); cx.ellipse(0, -95, 8, 5.5, 0, 3.14, 6.29); cx.fill(); cx.fillRect(-9.5, -95.5, 19, 2.2); }
      if (L.face === 'normal') { cx.fillStyle = '#14100e'; cx.fillRect(-4, -92, 1.6, 1.6); cx.fillRect(2.4, -92, 1.6, 1.6); cx.fillStyle = '#6a3028'; cx.fillRect(-2, -85.6, 4, 0.9); }
    } else if (o.eyes) { cx.fillStyle = 'rgba(225,225,205,.85)'; cx.fillRect(-3.6, -92, 1.5, 1.5); cx.fillRect(2.2, -92, 1.5, 1.5); }
  }
  cx.restore();
}
// which feed does screen i show? (labels can be shuffled; label 4 should never be on)
function screenFeed(i) { const l = G.camLabels[i]; if (l === 4) return G.cam4On ? 4 : 0; return l; }
function feed(n, x, y, w, h, full) {
  cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip(); cx.translate(x, y); cx.scale(w / 480, h / 270);
  r(0, 0, 480, 270, '#070a08');
  if (n === 1) {
    r(0, 0, 480, 80, '#050706'); r(0, 80, 480, 190, '#2b302c'); ell(150, 170, 110, 46, '#474d47'); ell(330, 170, 110, 46, '#474d47');
    r(130, 120, 40, 86, '#6a6f69'); r(310, 120, 40, 86, '#6a6f69'); r(138, 130, 24, 16, '#a9b0a8'); r(318, 130, 24, 16, '#a9b0a8'); r(372, 40, 86, 38, '#161a17');
    if ((G.outside || []).some(o => o.look === 'coat') || (G.night >= 4 && !G.finale)) person(232, 200, 84, LOOKS.shade, {});
    if (G.finale) for (let i = 0; i < 6; i++) person(60 + i * 72, 230, 96, LOOKS.shade, { eyes: true });
  } else if (n === 2) {
    r(0, 0, 480, 160, '#30352f'); r(0, 160, 480, 110, '#1e221e'); r(196, 36, 78, 124, G.night >= 4 ? '#020202' : '#171a17'); r(330, 96, 116, 64, '#28322a'); r(330, 92, 116, 8, '#1a211c');
    poly([[236, 0], [150, 160], [330, 160]], 'rgba(255,255,255,.06)');
    if (G.night >= 3) person(92, 172, 96, LOOKS.shade, { back: true });
  } else if (n === 3) {
    r(0, 0, 480, 200, '#343932'); r(0, 200, 480, 70, '#23261f'); r(96, 50, 84, 150, '#4b5048'); tx('WC', 138, 80, 22, '#111', 'center');
    if (G.knock) { r(96, 50, 22, 150, '#000'); r(112, 120, 10, 26, '#bdb6a6'); }
    if (G.newDoor) { r(262, 50, 84, 150, '#262422'); if (G.doorAjar > 0 || G.night >= 6) { r(262, 50, 26, 150, '#000'); person(284, 204, 120, LOOKS.shade, { eyes: G.night >= 6 }); } }
  } else if (n === 4 || n === 98) {
    r(0, 0, 480, 270, '#1c211d'); r(0, 150, 480, 46, '#4a4138'); r(40, 96, 90, 56, '#3a3f3c'); r(0, 196, 480, 74, '#15130f');
    if (n === 4) { person(250, 262, 150, LOOKS.shade, { back: true }); person(300, 300, 250, { sil: '#020202' }, {}); }
    else { const up = G.cam98 > 3; person(250, 262, 150, { sil: '#0c0e0c' }, { back: !up, eyes: up }); }
  } else { tx('NO SIGNAL', 240, 142, 34, '#2f3a33', 'center'); }
  if (n) {
    cx.fillStyle = 'rgba(70,120,85,.16)'; cx.fillRect(0, 0, 480, 270);
    cx.globalAlpha = n === 4 ? 0.42 : 0.2; cx.drawImage(NOISE, (Math.random() * 100) | 0, (Math.random() * 100) | 0, 120, 68, 0, 0, 480, 270); cx.globalAlpha = 1;
    r(0, (G.time * 46) % 320 - 30, 480, 16, 'rgba(255,255,255,.05)');
    if (full) for (let i = 0; i < 270; i += 3) r(0, i, 480, 1, 'rgba(0,0,0,.22)');
    const lbl = n === 98 ? 4 : n, sec = Math.floor(G.time % 60);
    tx('CAM ' + lbl, 14, 34, 28, '#dfeee0'); if (Math.floor(G.time * 2) % 2) ell(108, 24, 6, 6, '#c33');
    tx(n === 98 ? 'NOV 14 1998  04:02:' + (sec < 10 ? '0' : '') + sec : '0' + fmt(G.clockStop ? G.stopT : G.t) + ':' + (sec < 10 ? '0' : '') + sec, 466, 34, 28, '#dfeee0', 'right');
  }
  cx.restore();
}
function drawPhoto() {
  r(0, 0, W, H, '#1a1712'); r(30, 12, 420, 246, '#d8cdb0'); r(44, 24, 392, 196, '#8f8262');
  r(44, 150, 392, 70, '#746848'); r(70, 58, 330, 12, '#4c432f'); r(96, 70, 6, 82, '#4c432f'); r(250, 70, 150, 82, '#5d5239'); r(262, 90, 80, 40, '#a39570'); r(250, 58, 150, 12, '#4c432f'); tx("MORROW'S FUEL & MART", 325, 68, 10, '#c9bd98', 'center');
  const names = ['E. MORROW', 'J. PIKE', R.name, 'R. ALDER', 'T. VOSS', ''];
  for (let i = 0; i < 6; i++) {
    const px = 92 + i * 60, L = { coat: i === 5 ? '#c9b877' : ['#3a3324', '#4c432f', '#2f2a1e', '#40382a', '#544a36'][i], legs: '#2a2418', skin: '#b5a47c', hat: i === 2 ? '#3a2a1e' : null, hair: i === 2 ? null : '#2a2418', face: i === 5 ? 'none' : 'normal', hood: i === 5, long: i === 5 };
    person(px, 208, 92, L, {});
    if (i === 5) { cx.strokeStyle = '#1a1712'; cx.lineWidth = 1.2; for (let k = 0; k < 9; k++) { cx.beginPath(); cx.moveTo(px - 8 + hsh(k) * 4, 118 + hsh(k + 3) * 14); cx.lineTo(px + 4 + hsh(k + 7) * 5, 116 + hsh(k + 11) * 16); cx.stroke(); } }
    tx(names[i], px, 238, 9, '#33291c', 'center');
  }
  cx.strokeStyle = '#a52d24'; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(212, 150, 22, 62, 0, 0, 6.3); cx.stroke();
  cx.globalAlpha = 0.25; cx.drawImage(NOISE, 0, 0, 240, 135, 30, 12, 420, 246); cx.globalAlpha = 1;
  tx('click to turn it over', 240, 266, 10, '#8f8262', 'center');
}
function glimpseFace() {
  const a = P.reduce ? 0.55 : 1; cx.save(); cx.globalAlpha = a; r(0, 0, W, H, '#000');
  const j = P.reduce ? 0 : rnd(-3, 3); ell(240 + j, 150, 150, 190, '#cfc8b8'); ell(175 + j, 105, 34, 44, '#050505'); ell(305 + j, 105, 34, 44, '#050505'); ell(240 + j, 235, 54, 78, '#050505');
  ell(175 + j, 112, 4, 4, '#d8d3c2'); ell(305 + j, 112, 4, 4, '#d8d3c2'); cx.restore(); grain(0.3);
}
// Everything that sits on top of the 3D picture.
function drawOverlay() {
  cx.clearRect(0, 0, W, H);
  if (G.scene === 'play') {
    if (G.zoom === 'cam') { feed(G.feed, 0, 0, W, H, true); if (G.feed === 98 && G.cam98 > 5) { const words = ["DON'T", 'TRUST', 'THE', 'MANAGER'], n = Math.min(4, Math.floor((G.cam98 - 5) / 1.3) + 1); tx('[ the lips move ]  ' + words.slice(0, n).join(' '), 240, 250, 16, '#dfeee0', 'center'); } }
    else if (G.zoom === 'photo') drawPhoto();
    if (G.shock > 0) r(0, 0, W, H, 'rgba(120,10,5,' + G.shock * 0.3 + ')');
    if (G.behind && G.behind.st === 'appear') r(0, 0, W, H, 'rgba(0,0,0,' + (0.12 + 0.08 * Math.sin(G.time * 7)) + ')');
    if (G.glimpse > 0) glimpseFace();
  }
  cx.drawImage(VIG, 0, 0); grain(0.05);
  if (G.scene === 'play') {
    if (G.eyes > 0.01) { const e = G.eyes * (H / 2 + 2); r(0, 0, W, e, '#000'); r(0, H - e, W, e, '#000'); }
    if (G.behind && G.behind.st === 'count' && G.eyes > 0.9) tx(String(G.behind.count), 240, 150, 46, 'rgba(216,211,194,.3)', 'center');
  }
}
