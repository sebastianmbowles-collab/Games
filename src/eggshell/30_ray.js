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
  x.fillStyle = 'rgba(20,15,10,.55)'; x.fillRect(0, 0, 32, 9);
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
// tile id -> texture
const TILE_TEX = [null, T.brick, T.concrete, T.ruin, T.sandbag, T.wood, T.metal, T.cement, T.carton, T.door, T.fort, T.hedge];

// ================= RAYCASTER (the retro fake-3D engine) =================
const Ray = { zbuf: new Float32Array(W) };
// cam: {x,y,a,z(eye height 0..1),pitch}; map: {w,h,t:Uint8Array, dmg?:Float32Array}
Ray.render = function (cam, map, sprites, opt = {}) {
  const fov = 1.1, plen = Math.tan(fov / 2), proj = (W / 2) / plen;
  const hor = Math.round(H / 2 + (cam.pitch || 0));
  const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a), plX = -dirY * plen, plY = dirX * plen;
  // sky + ground in chunky bands (retro dithering)
  const sky = opt.sky || ['#2a2622', '#5a4a3a', '#8a6a4a'], gnd = opt.ground || ['#4a3e2c', '#2e271c'];
  for (let i = 0; i < hor; i += 3) { const t = i / Math.max(1, hor); rect(0, i, W, 3, t < 0.5 ? sky[0] : t < 0.85 ? sky[1] : sky[2]); }
  if (opt.skyDraw) opt.skyDraw(hor, cam);
  for (let i = hor; i < H; i += 2) { const t = (i - hor) / (H - hor); rect(0, i, W, 2, t < 0.25 ? gnd[1] : t < 0.6 ? gnd[0] : shade(gnd[0], 1.08)); }
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
  const fog = opt.fog || '20,18,16', fogD = opt.fogDist || 14;
  const zb = Ray.zbuf;
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
      tile = map.t[my * map.w + mx]; if (tile > 0) break;
    }
    if (tile <= 0) { zb[x] = 1e9; continue; }
    const perp = side === 0 ? (mx - cam.x + (1 - sx) / 2) / rdx : (my - cam.y + (1 - sy) / 2) / rdy;
    let wx = side === 0 ? cam.y + perp * rdy : cam.x + perp * rdx; wx -= Math.floor(wx);
    let tx = Math.floor(wx * TS); if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TS - 1 - tx;
    const top = hor - (1 - cam.z) * proj / perp, bot = hor + cam.z * proj / perp;
    const tex = TILE_TEX[tile] || T.concrete;
    ctx.drawImage(tex, tx, 0, 1, TS, x, top, 1, bot - top);
    if (map.dmg) { const dm = map.dmg[my * map.w + mx]; if (dm > 0) { ctx.globalAlpha = Math.min(1, dm * 1.3); ctx.drawImage(T.crack, tx, 0, 1, TS, x, top, 1, bot - top); ctx.globalAlpha = 1; } }
    const f = Math.min(0.88, perp / fogD + (side ? 0.18 : 0));
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
  return { proj, hor, toCam };
};
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
