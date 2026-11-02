// ================= WALL TEXTURES (32x32 pixel art, made by code) =================
const TS = 32;
function tex(sd, fn) { const [c, x] = mk(TS, TS); srand(sd); fn(x); return c; }
const T = {};
T.brick = tex(1, x => {
  x.fillStyle = '#4a3c32'; x.fillRect(0, 0, 32, 32);
  for (let r = 0; r < 8; r++) { const off = (r % 2) * 4; for (let b = -1; b < 4; b++) { const bx = b * 8 + off, by = r * 4; x.fillStyle = pick(['#8a3b2a', '#9a4632', '#7d3424', '#a0503a', '#86402c']); x.fillRect(bx + 1, by + 1, 7, 3); x.fillStyle = 'rgba(255,255,255,.13)'; x.fillRect(bx + 1, by + 1, 7, 1); } }
});
T.concrete = tex(2, x => {
  x.fillStyle = '#7c7b74'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 160; i++) { x.fillStyle = pick(['#6e6d66', '#8a8982', '#75746c', '#908f88']); x.fillRect((rnd() * 32) | 0, (rnd() * 32) | 0, 1 + (rnd() * 2 | 0), 1); }
  x.fillStyle = '#4a4944'; let px = 20, py = 2; for (let i = 0; i < 14; i++) { x.fillRect(px, py, 1, 2); py += 2; px += rnd() < 0.5 ? -1 : 1; }
  x.fillStyle = 'rgba(40,30,20,.25)'; x.fillRect(0, 26, 32, 6);
});
T.ruin = tex(3, x => {
  x.drawImage(T.brick, 0, 0);
  x.fillStyle = 'rgba(20,15,10,.3)'; x.fillRect(0, 0, 32, 9);
  x.fillStyle = '#120e0c';
  for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(rnd() * 32, 6 + rnd() * 20, 2 + rnd() * 4, 2 + rnd() * 3, 0, 0, 7); x.fill(); }
  x.fillStyle = '#2a2420'; for (let i = 0; i < 30; i++) x.fillRect((rnd() * 32) | 0, (rnd() * 12) | 0, 1, 1);
});
T.sandbag = tex(4, x => {
  x.fillStyle = '#3e3424'; x.fillRect(0, 0, 32, 32);
  for (let r = 0; r < 5; r++) { const off = (r % 2) * 5; for (let b = -1; b < 4; b++) { const bx = b * 10 + off, by = r * 6 + 1; const c = pick(['#b59a62', '#a88d58', '#bea46c']); x.fillStyle = c; x.beginPath(); x.ellipse(bx + 5, by + 3, 5, 3, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(bx + 2, by + 1, 5, 1); x.fillStyle = '#6a5636'; x.fillRect(bx + 9, by + 2, 1, 2); } }
});
T.wood = tex(5, x => {
  for (let p = 0; p < 4; p++) { const c = pick(['#8a5a2e', '#7a4e26', '#946436', '#82552a']); x.fillStyle = c; x.fillRect(p * 8, 0, 8, 32); x.fillStyle = '#3e2410'; x.fillRect(p * 8, 0, 1, 32); x.fillStyle = 'rgba(0,0,0,.18)'; for (let g = 0; g < 4; g++) x.fillRect(p * 8 + 2 + (rnd() * 5 | 0), (rnd() * 28) | 0, 1, 4 + (rnd() * 6 | 0)); x.fillStyle = '#c8c8c8'; x.fillRect(p * 8 + 4, 3, 1, 1); x.fillRect(p * 8 + 4, 28, 1, 1); }
});
T.metal = tex(6, x => {
  x.fillStyle = '#5e6a70'; x.fillRect(0, 0, 32, 32);
  x.fillStyle = '#3a4246'; x.fillRect(15, 0, 2, 32); x.fillRect(0, 15, 32, 2);
  x.fillStyle = '#7c8a90'; x.fillRect(0, 0, 32, 1); x.fillRect(0, 17, 32, 1);
  x.fillStyle = '#9aa8ae'; for (const [a, b] of [[3, 3], [12, 3], [20, 3], [28, 3], [3, 12], [28, 12], [3, 20], [12, 20], [20, 20], [28, 20], [3, 28], [28, 28]]) x.fillRect(a, b, 2, 2);
  x.fillStyle = 'rgba(120,60,20,.3)'; x.fillRect(5, 24, 6, 3);
});
T.cement = tex(7, x => {
  x.fillStyle = '#a9a8a0'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 90; i++) { x.fillStyle = pick(['#9c9b93', '#b4b3ab']); x.fillRect((rnd() * 32) | 0, (rnd() * 32) | 0, 1, 1); }
  x.fillStyle = '#8a8981'; x.fillRect(0, 10, 32, 1); x.fillRect(0, 21, 32, 1);
});
T.carton = tex(8, x => {
  x.fillStyle = '#b8b2a4'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = '#d4cfc2'; x.beginPath(); x.arc(i * 8 + 4, j * 8 + 4, 3, 0, 7); x.fill(); x.fillStyle = '#9a9486'; x.fillRect(i * 8 + 5, j * 8 + 5, 2, 2); }
});
T.door = tex(9, x => {
  x.drawImage(T.concrete, 0, 0);
  x.fillStyle = '#2f3a24'; x.fillRect(8, 6, 16, 26); x.fillStyle = '#4a5a3a'; x.fillRect(9, 7, 14, 25);
  for (let i = 0; i < 16; i += 4) { x.fillStyle = '#e8c020'; x.fillRect(8 + i, 2, 2, 3); x.fillStyle = '#111'; x.fillRect(10 + i, 2, 2, 3); }
  x.fillStyle = '#c8c8c8'; x.fillRect(20, 18, 2, 2);
  x.fillStyle = '#7dff6a'; x.fillRect(13, 12, 6, 2); x.fillRect(17, 10, 2, 6); x.fillRect(19, 12, 1, 2);
});
T.fort = tex(10, x => {
  x.fillStyle = '#3c4430'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 140; i++) { x.fillStyle = pick(['#343c2a', '#46503a', '#2c3424']); x.fillRect((rnd() * 32) | 0, (rnd() * 32) | 0, 2, 1); }
  x.fillStyle = '#6f8a2a'; x.beginPath(); x.ellipse(16, 15, 5, 6, 0, 0, 7); x.fill();
  x.fillStyle = '#111'; x.fillRect(13, 13, 2, 2); x.fillRect(17, 13, 2, 2); x.fillRect(14, 18, 4, 1);
  x.fillStyle = '#222'; x.fillRect(0, 0, 32, 2);
});
T.hedge = tex(11, x => {
  x.fillStyle = '#26361c'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 60; i++) { x.fillStyle = pick(['#34501f', '#2e4a1c', '#3e5c26', '#1c2a14']); x.beginPath(); x.arc(rnd() * 32, rnd() * 32, 1 + rnd() * 3, 0, 7); x.fill(); }
});
T.crack = tex(12, x => {
  x.strokeStyle = '#120c08'; x.lineWidth = 1;
  for (let k = 0; k < 4; k++) { x.beginPath(); let px = 4 + rnd() * 24, py = 0; x.moveTo(px, py); for (let i = 0; i < 6; i++) { px += (rnd() - 0.5) * 9; py += 3 + rnd() * 4; x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(rnd() * 32, rnd() * 32, 1 + rnd() * 2.5, 0, 7); x.fill(); }
});
// ---- ground textures for the floor caster ----
const floorData = c => new Uint32Array(c.getContext('2d').getImageData(0, 0, TS, TS).data.buffer);
const FLOOR = {};
FLOOR.cobble = floorData(tex(21, x => {
  x.fillStyle = '#8a8a8a'; x.fillRect(0, 0, 32, 32);
  for (let r = 0; r < 4; r++) for (let c = -1; c < 4; c++) { const ox = (r % 2) * 4; x.fillStyle = pick(['#a8a8a0', '#b0b0a8', '#a0a098']); x.fillRect(c * 8 + ox + 1, r * 8 + 1, 6, 6); x.fillStyle = '#b8b8b0'; x.fillRect(c * 8 + ox + 1, r * 8 + 1, 6, 1); x.fillStyle = '#929288'; x.fillRect(c * 8 + ox + 1, r * 8 + 6, 6, 1); }
  for (let i = 0; i < 6; i++) { x.fillStyle = pick(['#5cd04a', '#2fa03a']); x.fillRect(rnd() * 30, rnd() * 30, 1, 2); }
}));
FLOOR.dirt = floorData(tex(22, x => {
  x.fillStyle = '#4aa83a'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 160; i++) { x.fillStyle = pick(['#3a9a34', '#5cc04a', '#2f8a30', '#68cc50']); x.fillRect(rnd() * 32, rnd() * 32, 1, 2); }
  x.fillStyle = '#b8925a'; x.fillRect(4, 20, 10, 6); x.fillStyle = '#d0aa6a'; x.fillRect(5, 21, 7, 2);
  for (let i = 0; i < 3; i++) { const px = rnd() * 28, py = rnd() * 28; x.fillStyle = pick(['#fff07a', '#ffffff', '#f8a0a0']); x.fillRect(px, py, 2, 2); }
}));
FLOOR.mud = floorData(tex(23, x => {
  x.fillStyle = '#3a9a34'; x.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 160; i++) { x.fillStyle = pick(['#2f8a30', '#4aa83a', '#2a7a2a', '#5cc04a']); x.fillRect(rnd() * 32, rnd() * 32, 1, 2); }
  x.fillStyle = '#8a6a3a'; x.beginPath(); x.ellipse(21, 21, 8, 5, 0, 0, 7); x.fill(); x.fillStyle = '#5a4a2a'; x.beginPath(); x.ellipse(22, 22, 5, 3, 0, 0, 7); x.fill(); x.fillStyle = '#4aa0f0'; x.fillRect(19, 21, 4, 1);
}));
// ---- 360-degree sky panoramas ----
function makeSky(sd, o) {
  const PW = 1024, span = Math.round(PW * 1.1 / (Math.PI * 2)), PH = 96;
  const [c, x] = mk(PW + span + 2, PH);
  const g = x.createLinearGradient(0, 0, 0, PH); o.grad.forEach((col, i) => g.addColorStop(i / (o.grad.length - 1), col));
  x.fillStyle = g; x.fillRect(0, 0, PW, PH);
  srand(sd);
  const both = (fn) => { fn(0); fn(PW); fn(-PW); };
  if (o.stars) for (let i = 0; i < 120; i++) { const sx = rnd() * PW, sy = rnd() * PH * 0.55; x.fillStyle = `rgba(255,250,220,${0.25 + rnd() * 0.6})`; x.fillRect(sx, sy, 1, 1); }
  if (o.moon) { x.fillStyle = 'rgba(255,240,210,.9)'; x.beginPath(); x.arc(700, 22, 7, 0, 7); x.fill(); x.fillStyle = o.grad[0]; x.beginPath(); x.arc(703, 20, 6, 0, 7); x.fill(); }
  if (o.puffy) for (let i = 0; i < (o.clouds || 0); i++) {
    const cx = rnd() * PW, cy = 10 + rnd() * PH * 0.5, w = 24 + rnd() * 40, bl = Array.from({ length: 6 }, () => [rnd() * w - w / 2, rnd() * 6 - 3, 5 + rnd() * 7]);
    both(ox => { for (const [col, dy] of [[o.cloudShade || '#c8ecff', 3], [o.cloudCol || '#ffffff', 0]]) { x.fillStyle = col; for (const [bx, by, r] of bl) { x.beginPath(); x.arc(ox + cx + bx, cy + by + dy, r, 0, 7); x.fill(); } } x.fillStyle = o.cloudShade || '#c8ecff'; x.fillRect(ox + cx - w / 2, cy + 6, w, 3); });
  }
  if (!o.puffy) for (let i = 0; i < (o.clouds || 0); i++) {
    const cx = rnd() * PW, cy = 8 + rnd() * PH * 0.55, w = 30 + rnd() * 80;
    both(ox => { for (let k = 0; k < 7; k++) { x.fillStyle = o.cloud[(k + i) % o.cloud.length]; x.beginPath(); x.ellipse(ox + cx + (k - 3) * w / 8, cy + Math.sin(k * 1.7) * 3, w / 5, 4 + (k % 3) * 2, 0, 0, 7); x.fill(); } });
  }
  if (o.glow) { const gg = x.createLinearGradient(0, PH * 0.55, 0, PH); gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, o.glow); x.fillStyle = gg; x.fillRect(0, 0, PW, PH); }
  // far skyline / hills
  if (o.far) { x.fillStyle = o.far; for (let sx = 0; sx < PW; sx += 2) { const h = o.hills ? 8 + Math.sin(sx / 60) * 5 + Math.sin(sx / 23) * 3 : (Math.floor(sx / 10) * 7919 % 13) + 4; x.fillRect(sx, PH - h - 8, 2, h + 8); } }
  // smoke columns rising from the battle
  for (let i = 0; i < (o.smoke || 0); i++) {
    const sx = rnd() * PW, tall = 30 + rnd() * 50;
    both(ox => { for (let k = 0; k < tall; k += 2) { x.fillStyle = `rgba(${o.smokeCol || '30,26,24'},${0.5 - k / tall * 0.45})`; x.beginPath(); x.ellipse(ox + sx + Math.sin(k * 0.12) * k * 0.25 + k * 0.3, PH - 10 - k, 3 + k * 0.18, 2 + k * 0.1, 0, 0, 7); x.fill(); } if (o.fires) { x.fillStyle = 'rgba(255,140,40,.8)'; x.fillRect(ox + sx - 2, PH - 12, 4, 3); } });
  }
  if (o.fort) { const fx = 300; x.fillStyle = o.near; x.fillRect(fx, PH - 30, 70, 30); for (let i = 0; i < 70; i += 10) x.fillRect(fx + i, PH - 34, 6, 4); x.fillRect(fx + 28, PH - 46, 14, 16); x.fillStyle = '#6f8a2a'; x.fillRect(fx + 41, PH - 56, 10, 6); x.fillStyle = o.near; x.fillRect(fx + 40, PH - 56, 1, 10); }
  // near ruins silhouette
  if (o.near) { x.fillStyle = o.near; let sx = 0; while (sx < PW) { const w = 6 + rnd() * 18, h = (o.hills ? 2 : 6) + rnd() * (o.hills ? 6 : 16); x.fillRect(sx, PH - h, w, h); if (!o.hills && rnd() < 0.4) x.fillRect(sx + 2, PH - h - 4, 3, 4); sx += w; } }
  x.drawImage(c, 0, 0, span + 2, PH, PW, 0, span + 2, PH); // wrap around seamlessly
  c.pw = PW; c.span = span; c.topCol = o.grad[0];
  return c;
}
const SKY = {
  town: makeSky(31, { grad: ['#2f6ad0', '#4aa0f0', '#8ad0ff', '#c8ecff'], puffy: true, clouds: 10, smoke: 7, smokeCol: '60,60,60', fires: true, far: '#8a9ab0', near: '#5a6a8a' }),
  dusk: makeSky(32, { grad: ['#2f6ad0', '#6aa8e8', '#ffb848', '#ffd8a0'], puffy: true, cloudShade: '#f8a0a0', clouds: 9, smoke: 5, smokeCol: '70,60,60', far: '#8a7aa0', near: '#5a4a6a' }),
  storm: makeSky(33, { grad: ['#3c4a6a', '#5a6a8a', '#8a9ab0', '#c8d0d8'], puffy: true, cloudCol: '#c8c8c8', cloudShade: '#8a9ab0', clouds: 16, smoke: 4, smokeCol: '50,50,50', far: '#4a6a22', near: '#1e6a2a', hills: true, fort: true }),
  night: makeSky(34, { grad: ['#0e1a3a', '#1c3a8a', '#3a4a8a', '#7a3a9a'], stars: true, moon: true, puffy: true, cloudCol: '#3c4a6a', cloudShade: '#1c3a8a', clouds: 5, smoke: 5, smokeCol: '20,20,40', fires: true, far: '#3a1a4a', near: '#0e1a3a' }),
  day: makeSky(35, { grad: ['#2f6ad0', '#4aa0f0', '#8ad0ff', '#e0f4ff'], puffy: true, clouds: 12, far: '#3ab0a0', near: '#1e6a2a', hills: true }),
};
const VIGNETTE = (() => { const [c, x] = mk(W, H); const g = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)'); x.fillStyle = g; x.fillRect(0, 0, W, H); return c; })();
// tile id -> texture
const TILE_TEX = [null, T.brick, T.concrete, T.ruin, T.sandbag, T.wood, T.metal, T.cement, T.carton, T.door, T.fort, T.hedge];

// ================= RAYCASTER (the retro fake-3D engine) =================
const Ray = { zbuf: new Float32Array(W) };
// cam: {x,y,a,z(eye height 0..1),pitch}; map: {w,h,t:Uint8Array, dmg?:Float32Array}
Ray.render = function (cam, map, sprites, opt = {}) {
  const fov = 1.1, plen = Math.tan(fov / 2), proj = (W / 2) / plen;
  const hor = Math.round(H / 2 + (cam.pitch || 0));
  const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a), plX = -dirY * plen, plY = dirX * plen;
  const fog = opt.fog || '20,18,16', fogD = opt.fogDist || 14;
  // sky: a 360-degree painted panorama that turns as you look around
  if (opt.skyImg) {
    const P = opt.skyImg, span = P.span, sc = W / span;
    const off = ((cam.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * P.pw;
    const dh = P.height * sc;
    rect(0, 0, W, hor, P.topCol);
    ctx.drawImage(P, off, 0, span, P.height, 0, hor - dh + 2, W, dh);
  } else {
    const sky = opt.sky || ['#2a2622', '#5a4a3a', '#8a6a4a'];
    for (let i = 0; i < hor; i += 3) { const t = i / Math.max(1, hor); rect(0, i, W, 3, t < 0.5 ? sky[0] : t < 0.85 ? sky[1] : sky[2]); }
  }
  // ground: real textured floor, fading into the smoke far away
  if (opt.floor) Ray.floor(cam, hor, proj, dirX, dirY, plX, plY, opt.floor, fog, fogD);
  else { const gnd = opt.ground || ['#4a3e2c', '#2e271c']; for (let i = hor; i < H; i += 2) { const t = (i - hor) / (H - hor); rect(0, i, W, 2, t < 0.25 ? gnd[1] : t < 0.6 ? gnd[0] : shade(gnd[0], 1.08)); } }
  // floor decals (yolk, craters, red bomb markers) before walls: walls cover what is behind them
  const invDet = 1 / (plX * dirY - dirX * plY);
  const toCam = (x, y) => { const dx = x - cam.x, dy = y - cam.y; return [invDet * (dirY * dx - dirX * dy), invDet * (-plY * dx + plX * dy)]; };
  if (opt.decals) for (const d of opt.decals) {
    const [tx, ty] = toCam(d.x, d.y); if (ty < 0.3) continue;
    const dn = Math.max(0.2, ty - d.r), df = ty + d.r;
    const yN = hor + cam.z * proj / dn, yF = hor + cam.z * proj / df;
    const sx = (W / 2) * (1 + tx / ty), rx = d.r * proj / ty;
    if (sx + rx < 0 || sx - rx > W) continue;
    ctx.globalAlpha = d.alpha === undefined ? 1 : d.alpha;
    if (d.img) ctx.drawImage(d.img, sx - rx, yF, rx * 2, Math.max(1, yN - yF));
    else {
      ctx.beginPath(); ctx.ellipse(sx, (yN + yF) / 2, rx, Math.max(0.5, (yN - yF) / 2), 0, 0, 7);
      if (d.fill) { ctx.fillStyle = d.fill; ctx.fill(); }
      if (d.stroke) { ctx.strokeStyle = d.stroke; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  // walls
  const zb = Ray.zbuf;
  const near = cam.d ? cam.d - 0.3 : 0; // cutaway: skip walls between the chase camera and the player
  for (let x = 0; x < W; x++) {
    const cx = 2 * x / W - 1, rdx = dirX + plX * cx, rdy = dirY + plY * cx;
    let mx = Math.floor(cam.x), my = Math.floor(cam.y);
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let sx, sy, sdx, sdy;
    if (rdx < 0) { sx = -1; sdx = (cam.x - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - cam.x) * ddx; }
    if (rdy < 0) { sy = -1; sdy = (cam.y - my) * ddy; } else { sy = 1; sdy = (my + 1 - cam.y) * ddy; }
    let side = 0, tile = 0, n = 0;
    while (n++ < 80) {
      if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; }
      if (mx < 0 || my < 0 || mx >= map.w || my >= map.h) { tile = -1; break; }
      tile = map.t[my * map.w + mx];
      if (tile > 0) { if ((side === 0 ? sdx - ddx : sdy - ddy) < near) { tile = 0; continue; } break; }
    }
    if (tile <= 0) { zb[x] = 1e9; continue; }
    const perp = side === 0 ? (mx - cam.x + (1 - sx) / 2) / rdx : (my - cam.y + (1 - sy) / 2) / rdy;
    let wx = side === 0 ? cam.y + perp * rdy : cam.x + perp * rdx; wx -= Math.floor(wx);
    let tx = Math.floor(wx * TS); if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TS - 1 - tx;
    const top = hor - (1 - cam.z) * proj / perp, bot = hor + cam.z * proj / perp;
    const tex = TILE_TEX[tile] || T.concrete;
    ctx.drawImage(tex, tx, 0, 1, TS, x, top, 1, bot - top);
    if (map.dmg) { const dm = map.dmg[my * map.w + mx]; if (dm > 0) { ctx.globalAlpha = Math.min(1, dm * 1.3); ctx.drawImage(T.crack, tx, 0, 1, TS, x, top, 1, bot - top); ctx.globalAlpha = 1; } }
    if (side) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x, top, 1, bot - top); }
    const f = Math.min(0.5, perp / fogD);
    ctx.fillStyle = `rgba(${fog},${f})`; ctx.fillRect(x, top, 1, bot - top);
    zb[x] = perp;
  }
  // sprites, far to near
  const list = [];
  for (const s of sprites) { const [tx, ty] = toCam(s.x, s.y); if (ty > 0.15) list.push([ty, tx, s]); }
  list.sort((a, b) => b[0] - a[0]);
  for (const [ty, tx, s] of list) {
    const img = s.img; if (!img) continue;
    const sw = (s.w || 0.7) * proj / ty, sh = (s.h || 0.9) * proj / ty;
    const scx = (W / 2) * (1 + tx / ty);
    const z0 = s.z || 0;
    const yb = hor - (z0 - cam.z) * proj / ty, yt = yb - sh;
    let x0 = Math.floor(scx - sw / 2), x1 = Math.floor(scx + sw / 2);
    if (x1 < 0 || x0 >= W) continue;
    const iw = img.width, ih = img.height;
    let run = -1;
    const flush = (end) => { if (run < 0) return; const u0 = (run - (scx - sw / 2)) / sw * iw, u1 = (end - (scx - sw / 2)) / sw * iw; ctx.drawImage(img, u0, 0, Math.max(0.01, u1 - u0), ih, run, yt, end - run, sh); run = -1; };
    if (s.alpha !== undefined) ctx.globalAlpha = s.alpha;
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      if (s.noZ || ty < zb[x]) { if (run < 0) run = x; } else flush(x);
    }
    flush(Math.min(W, x1 + 1));
    ctx.globalAlpha = 1;
    if (s.fogged !== false && ty > 4) { /* distant sprites get a light haze */ }
  }
  if (opt.vignette) ctx.drawImage(VIGNETTE, 0, 0);
  chunkify();
  return { proj, hor, toCam };
};
// Floor casting: work out which bit of the ground texture each screen pixel shows.
const FLOORBUF = (() => { const [c, x] = mk(W, H); return { c, x, img: x.createImageData(W, H) }; })();
Ray.floor = function (cam, hor, proj, dirX, dirY, plX, plY, tex, fog, fogD) {
  const img = FLOORBUF.img, buf = new Uint32Array(img.data.buffer);
  const [fr, fg, fb] = fog.split(',').map(Number);
  const y0 = Math.max(hor + 1, 0);
  for (let y = y0; y < H; y++) {
    const d = cam.z * proj / (y - hor);
    const f = Math.min(0.35, d / fogD), k = 1 - f, fR = fr * f, fG = fg * f, fB = fb * f;
    let fx = cam.x + d * (dirX - plX), fy = cam.y + d * (dirY - plY);
    const sx = d * 2 * plX / W, sy = d * 2 * plY / W;
    let o = y * W;
    for (let x = 0; x < W; x++, o++) {
      const tx = ((fx * TS) | 0) & (TS - 1), ty = ((fy * TS) | 0) & (TS - 1);
      const c = tex[ty * TS + tx];
      buf[o] = 0xff000000 | (((((c >>> 16) & 255) * k + fB) | 0) << 16) | (((((c >>> 8) & 255) * k + fG) | 0) << 8) | ((((c & 255) * k + fR) | 0));
      fx += sx; fy += sy;
    }
  }
  FLOORBUF.x.putImageData(img, 0, 0, 0, y0, W, H - y0);
  ctx.drawImage(FLOORBUF.c, 0, y0, W, H - y0, 0, y0, W, H - y0);
};
// Third-person chase camera: always sits behind the player. It may float inside a wall
// (the engine never draws the wall the camera is in), so the player never gets lost.
Ray.chase = function (map, p, back, z, pitch) {
  const x = clamp(p.x - Math.cos(p.a) * back, 0.05, map.w - 0.05), y = clamp(p.y - Math.sin(p.a) * back, 0.05, map.h - 0.05);
  return { x, y, a: p.a, z, pitch, d: back };
};
// Weather drawn on top of the 3D view: embers + ash, dust, or rain with lightning.
class Weather {
  constructor(kind) {
    this.kind = kind; this.lastA = null; this.bolt = 6 + R() * 6; this.flash = 0;
    const n = kind === 'rain' ? 90 : 55;
    this.p = Array.from({ length: n }, () => ({ x: R() * W, y: R() * H, v: 0.5 + R(), k: R() }));
  }
  draw(a) {
    const dt = 1 / 60, turn = this.lastA === null ? 0 : angDiff(this.lastA, a) * W / 1.1; this.lastA = a;
    for (const q of this.p) {
      q.x -= turn * (0.6 + q.v * 0.4);
      if (this.kind === 'embers') {
        if (q.k < 0.35) { q.y -= 14 * q.v * dt; q.x += Math.sin(q.y / 9 + q.k * 20) * 0.3; rect(q.x, q.y, 1, 1, q.k < 0.15 ? '#ffd23a' : '#f8962e'); }
        else { q.y += 9 * q.v * dt; q.x += 4 * dt; rect(q.x, q.y, q.v > 1 ? 2 : 1, 1, q.k < 0.7 ? '#5e5e5e' : '#8a8a8a'); }
      } else if (this.kind === 'dust') {
        q.x += 22 * q.v * dt; q.y += Math.sin(q.x / 20 + q.k * 9) * 0.15; rect(q.x, q.y, q.v > 1.2 ? 2 : 1, 1, q.k < 0.5 ? '#c08a4e' : '#e0b878');
      } else {
        q.y += 260 * q.v * dt; q.x -= 40 * dt; ctx.fillStyle = 'rgba(180,200,220,.55)'; ctx.fillRect(q.x | 0, q.y | 0, 1, 4 + q.v * 3);
      }
      if (q.y < -4) q.y += H + 4; if (q.y > H) q.y -= H + 4; if (q.x < -4) q.x += W + 4; if (q.x > W + 4) q.x -= W + 4;
    }
    if (this.kind === 'rain') {
      this.bolt -= dt;
      if (this.bolt <= 0) { this.bolt = 7 + R() * 9; this.flash = 0.35; setTimeout(() => Snd.explosion(2.2, 0.22, rr(-0.6, 0.6)), 300 + R() * 900); }
      if (this.flash > 0) { this.flash -= dt; if (this.flash > 0.2 || (this.flash > 0.05 && this.flash < 0.12)) { ctx.globalAlpha = 0.28; rect(0, 0, W, H, '#dedede'); ctx.globalAlpha = 1; } }
    }
  }
}
Ray.solid = (map, x, y) => { const mx = Math.floor(x), my = Math.floor(y); if (mx < 0 || my < 0 || mx >= map.w || my >= map.h) return true; return map.t[my * map.w + mx] > 0; };
Ray.move = function (map, e, dx, dy, r) {
  const nx = e.x + dx; if (!Ray.solid(map, nx + Math.sign(dx) * r, e.y - r * 0.7) && !Ray.solid(map, nx + Math.sign(dx) * r, e.y + r * 0.7)) e.x = nx;
  const ny = e.y + dy; if (!Ray.solid(map, e.x - r * 0.7, ny + Math.sign(dy) * r) && !Ray.solid(map, e.x + r * 0.7, ny + Math.sign(dy) * r)) e.y = ny;
};
Ray.los = function (map, x0, y0, x1, y1) {
  const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 0.12);
  for (let i = 1; i < n; i++) { const t = i / n; if (Ray.solid(map, lerp(x0, x1, t), lerp(y0, y1, t))) return false; }
  return true;
};
// first wall tile along a ray (for repairs / shells)
Ray.cast = function (map, x, y, a, maxD) {
  const dx = Math.cos(a) * 0.05, dy = Math.sin(a) * 0.05;
  for (let d = 0; d < maxD; d += 0.05) { x += dx; y += dy; if (Ray.solid(map, x, y)) return { x: Math.floor(x), y: Math.floor(y), d }; }
  return null;
};
