// ================= MODE 2 (story chapter 1): RUNNING — first person =================
const SPR = {};
SPR.bomber = (() => { // the Rotten bomber, seen from below
  const [c, x] = mk(56, 22);
  x.fillStyle = '#1c1f16'; x.fillRect(2, 8, 52, 5); x.fillRect(22, 2, 12, 18); x.fillRect(24, 0, 8, 22);
  x.fillStyle = '#2a2e22'; x.fillRect(4, 9, 48, 3);
  x.fillStyle = '#121410'; [8, 18, 36, 46].forEach(e => x.fillRect(e, 6, 3, 9));
  x.fillStyle = '#6f8a2a'; x.beginPath(); x.arc(12, 10.5, 2, 0, 7); x.fill(); x.beginPath(); x.arc(44, 10.5, 2, 0, 7); x.fill();
  x.fillStyle = 'rgba(200,200,200,.35)'; [9, 19, 37, 47].forEach(e => x.fillRect(e - 3, 5, 9, 1));
  return outlined(c);
})();
SPR.cover = outlined((() => { const [c, x] = mk(30, 14); srand(5); for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { x.fillStyle = pick(['#b59a62', '#a88d58', '#c0a46a']); x.beginPath(); x.ellipse(5 + i * 7 + r * 3.5, 11 - r * 4, 4, 2.6, 0, 0, 7); x.fill(); x.fillStyle = '#6a5636'; x.fillRect(8 + i * 7 + r * 3.5, 10 - r * 4, 1, 2); } return c; })());
SPR.rubble = (() => { const [c, x] = mk(28, 12); srand(6); for (let i = 0; i < 22; i++) { x.fillStyle = pick(['#6a6058', '#8a3b2a', '#5a524a', '#7c7b74', '#3a3430']); const w = 3 + rnd() * 6; x.fillRect(14 + (rnd() - 0.5) * (24 - w) - w / 2 + 2, 12 - rnd() * 9 * (1 - Math.abs(rnd() - 0.5)) - 3, w, 3); } return c; })();
SPR.sign = (() => { const [c, x] = mk(24, 20); x.fillStyle = '#4a3a22'; x.fillRect(11, 8, 2, 12); x.fillStyle = '#e8c020'; x.fillRect(0, 0, 24, 9); x.fillStyle = '#111'; x.fillRect(1, 1, 22, 7); x.fillStyle = '#e8c020'; x.font = '6px monospace'; x.fillText('BUNKER', 1, 7); return c; })();
SPR.fire = (() => { const fr = []; for (let f = 0; f < 4; f++) { const [c, x] = mk(16, 20); srand(30 + f); for (let i = 0; i < 30; i++) { const y = rnd() * 18; x.fillStyle = y < 6 ? '#ffd040' : y < 12 ? '#ff7a20' : '#c02a10'; x.fillRect(8 + (rnd() - 0.5) * (20 - y) * 0.6, 20 - y - 2, 2, 2); } fr.push(c); } return fr; })();

// Shelly from behind, for the third-person modes (plus spinning frames for rolling)
const SHELLY3P = (() => {
  const cache = {};
  return st => {
    if (cache[st]) return cache[st];
    const back = makeEgg(Object.assign(CAST.shelly(st), { back: true }));
    const s = Math.ceil(Math.hypot(back.width, back.height)) + 2, roll = [];
    for (let i = 0; i < 8; i++) { const [c, x] = mk(s, s); x.translate(s / 2, s / 2); x.rotate(i * Math.PI / 4); x.drawImage(back, -back.width / 2, -back.height / 2); roll.push(c); }
    return (cache[st] = { back, roll, s });
  };
})();
function shellySprite(st, x, y, opt) { // opt: {h, z, rollFrame, lying, alpha}
  const S = SHELLY3P(st), h = opt.h || 0.5;
  if (opt.rollFrame !== undefined || opt.lying) {
    const img = S.roll[opt.lying ? 2 : opt.rollFrame & 7], hh = h * S.s / S.back.height;
    return { x, y, img, w: hh, h: hh, z: (opt.z || 0) - (hh - h * 0.75) / 2, alpha: opt.alpha };
  }
  return { x, y, img: S.back, w: h * S.back.width / S.back.height, h, z: opt.z || 0, alpha: opt.alpha };
}
function spatial(cam, x, y, maxD = 20) {
  const d = dist(cam.x, cam.y, x, y), v = clamp(1 - d / maxD, 0, 1);
  const a = angDiff(cam.a, Math.atan2(y - cam.y, x - cam.x));
  return { vol: 0.15 + v * v * 0.85, pan: Math.sin(a) * 0.9, d };
}
function eggBillboard(img, x, y, extra) { return Object.assign({ x, y, img, h: 0.55 * img.height / 26, w: 0.55 * img.width / 26 }, extra || {}); }
// Shelly's view of her own yolk getting everywhere
function drawSplatOverlay(t) {
  ctx.globalAlpha = Math.min(0.92, t * 2);
  srand(9);
  for (let i = 0; i < 14; i++) { const x = rnd() * W, y = rnd() * H * 0.7 + t * 18 * rnd(); ctx.fillStyle = i % 3 ? '#f2efe4' : '#f5b819'; ctx.beginPath(); ctx.ellipse(x, y, 20 + rnd() * 40, 14 + rnd() * 30 + t * 10, 0, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}

class RunningMode {
  constructor(cb) { this.cb = cb; this.pausable = true; this.touch = { pad: true, a: 'JUMP', b: 'DIVE', c: 'ROLL', d: 'HIDE', pause: true }; this.reset(); }
  reset() {
    const N = 27, t = new Uint8Array(N * N);
    srand(2026);
    const blockTex = {};
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const border = x === 0 || y === 0 || x === N - 1 || y === N - 1;
      const street = x % 6 === 1 || x % 6 === 2 || y % 6 === 1 || y % 6 === 2;
      if (border) t[y * N + x] = 2;
      else if (!street) { const k = Math.floor((x - 3) / 6) + ',' + Math.floor((y - 3) / 6); if (!(k in blockTex)) blockTex[k] = rnd() < 0.18 ? 0 : pick([1, 1, 3, 3, 2, 3]); t[y * N + x] = blockTex[k]; }
    }
    // knock random holes in the buildings (ruins make shortcuts and hidey-holes)
    const holes = [];
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (t[y * N + x] && rnd() < 0.13) { t[y * N + x] = 0; holes.push([x, y]); }
    t[24 * N + 26] = 9; // the bunker door
    this.map = { w: N, h: N, t };
    this.bunker = { x: 25.5, y: 24.5 };
    this.p = { x: 1.6, y: 1.6, a: 0.3, z: 0.5, h: 0, vz: 0, diveT: 0, diveCD: 0, roll: 0, rollA: 0, inv: 0, vx: 0, vy: 0, stepT: 0 };
    const free = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (!t[y * N + x] && (x > 4 || y > 4) && dist(x, y, 25, 24) > 3) free.push([x + 0.5, y + 0.5]);
    const take = () => free.splice((rnd() * free.length) | 0, 1)[0];
    this.covers = []; for (let i = 0; i < 16; i++) { const [x, y] = take(); this.covers.push({ x, y }); }
    holes.slice(0, 6).forEach(([x, y]) => this.covers.push({ x: x + 0.5, y: y + 0.5 }));
    this.rubble = []; for (let i = 0; i < 20; i++) { const [x, y] = take(); this.rubble.push({ x, y }); }
    this.fires = []; for (let i = 0; i < 10; i++) { const [x, y] = take(); this.fires.push({ x, y, f: rnd() * 4 }); }
    this.decals = []; for (let i = 0; i < 18; i++) { const [x, y] = free[(rnd() * free.length) | 0]; this.decals.push({ x: x + rr(-0.3, 0.3), y: y + rr(-0.3, 0.3), r: rr(0.4, 0.9), fill: 'rgba(15,10,6,.65)' }); }
    this.civs = []; for (let i = 0; i < 6; i++) { const [x, y] = take(); this.civs.push({ x, y, a: pick([0, 1, 2, 3]) * Math.PI / 2, img: friendSprites[i * 2 + 1], turnT: rr(1, 3), alive: true, bob: rnd() * 6 }); }
    this.bombs = []; this.booms = [];
    this.plane = { x: -10, y: -10, a: 0, active: false, wait: 2.5, dropT: 0 };
    this.time = 0; this.dead = 0; this.ready = 1.6; this.done = false;
  }
  enter() { Snd.play('running'); this.engine = Snd.planeEngine(); FX.banner('GET TO THE BUNKER!', '#ffd23a', 2); }
  exit() { if (this.engine) this.engine.stop(); }
  restart() { this.exit(); this.reset(); this.enter(); }
  explode(b) {
    const p = this.p, sp = spatial(p, b.x, b.y, 26);
    Snd.explosion(1, sp.vol, sp.pan);
    this.booms.push({ x: b.x, y: b.y, t: 0 });
    this.decals.push({ x: b.x, y: b.y, r: 0.8, fill: 'rgba(12,8,4,.75)' });
    const d = dist(p.x, p.y, b.x, b.y);
    FX.shake(clamp(6 - d, 0.5, 6), 0.5); if (d < 4) FX.flash('#ffb060', 0.5 - d * 0.1);
    for (const c of this.civs) if (c.alive && dist(c.x, c.y, b.x, b.y) < 1.5 && Ray.los(this.map, b.x, b.y, c.x, c.y)) {
      c.alive = false; const s2 = spatial(p, c.x, c.y, 20); Snd.splat(s2.vol, s2.pan);
      this.decals.push({ x: c.x, y: c.y, r: 0.45, img: pickR(SPLATS) });
    }
    if (this.dead || p.inv > 0) return;
    const low = In.down('d') || p.diveT > 0;
    const inCover = In.down('d') && this.covers.some(c => dist(c.x, c.y, p.x, p.y) < 0.8);
    const radius = low ? 1.0 : 1.6;
    if (d < radius && !inCover && Ray.los(this.map, b.x, b.y, p.x, p.y)) this.hitPlayer();
  }
  hitPlayer() {
    const p = this.p;
    Snd.splat(1, 0);
    if (save.sup.meds > 0) { save.sup.meds--; writeSave(); p.inv = 2.5; FX.flash('#fff', 0.8); FX.banner('MEDIC! SHELL TAPED UP!', '#7dff6a'); Voice.play('m_patch'); setTimeout(() => Snd.crunch(), 300); return; }
    this.dead = 0.001; FX.flash('#f5b819', 0.9);
  }
  update(dt) {
    const p = this.p, m = this.map;
    if (this.dead) { this.dead += dt; if (this.dead > 2.2 && !this.done) { this.done = true; this.cb.lose({ title: 'SPLAT!', lines: ['The bomb got you, Shelly.', 'Hide behind walls or in', 'sandbag piles (hold HIDE)!'] }); } this.updWorld(dt); return; }
    this.time += dt; this.ready -= dt; p.inv = Math.max(0, p.inv - dt);
    // --- moves ---
    const rolling = In.down('c') && p.h === 0, hiding = In.down('d') && p.h === 0 && p.diveT <= 0;
    const turn = rolling ? 1.7 : 2.6;
    if (In.down('left')) p.a -= turn * dt;
    if (In.down('right')) p.a += turn * dt;
    let sp = 0;
    if (In.down('up')) sp = 3.1; if (In.down('down')) sp = -1.8;
    if (rolling && sp > 0) sp = 5.2;
    if (hiding) sp = 0;
    p.diveCD -= dt;
    if (In.hit('b') && p.diveT <= 0 && p.diveCD <= 0 && p.h === 0) { p.diveT = 0.42; p.diveCD = 1.0; Snd.whoosh(0.5); }
    if (p.diveT > 0) { p.diveT -= dt; sp = 7.5 * (p.diveT / 0.42) + 1; if (p.diveT <= 0) { Snd.thud(0.5); FX.shake(1.5, 0.15); } }
    if (In.hit('a') && p.h === 0 && !hiding) { p.vz = 3.3; Snd.jump(); }
    if (p.h > 0 || p.vz > 0) { p.vz -= 9.5 * dt; p.h += p.vz * dt; if (p.h <= 0) { p.h = 0; p.vz = 0; Snd.thud(0.35); } }
    const ox = p.x, oy = p.y;
    Ray.move(m, p, Math.cos(p.a) * sp * dt, Math.sin(p.a) * sp * dt, 0.22);
    // rubble blocks you unless you jump over it
    if (p.h < 0.22) for (const r of this.rubble) if (dist(r.x, r.y, p.x, p.y) < 0.42) { p.x = ox; p.y = oy; break; }
    p.vx = (p.x - ox) / Math.max(dt, 1e-4); p.vy = (p.y - oy) / Math.max(dt, 1e-4);
    const moving = Math.hypot(p.vx, p.vy) > 0.5;
    if (moving && p.h === 0) { p.stepT -= dt * (rolling ? 2.2 : 1); if (p.stepT <= 0) { p.stepT = 0.3; Snd.step(rolling ? 0.15 : 0.25); } }
    p.rollA = rolling && moving ? p.rollA + dt * 9 : p.rollA * (1 - dt * 8);
    const targetZ = hiding ? 0.2 : p.diveT > 0 ? 0.24 : 0.5;
    p.z = lerp(p.z, targetZ, Math.min(1, dt * 12)) + 0; p.camZ = clamp(p.z + p.h * 0.55, 0.1, 0.92);
    this.hiding = hiding; this.rolling = rolling && moving;
    if (dist(p.x, p.y, this.bunker.x, this.bunker.y) < 0.9 && !this.done) {
      this.done = true; Snd.thud(1); Snd.confirm();
      const saved = this.civs.filter(c => c.alive).length;
      this.cb.win({ lines: ['You made it to the bunker!', 'TIME: ' + this.time.toFixed(1) + ' SECONDS', 'TOWNSFOLK SAFE: ' + saved + ' / 6'] });
      return;
    }
    // --- the bomber ---
    const P = this.plane, diff = Math.min(1, this.time / 60);
    if (!P.active) {
      P.wait -= dt;
      if (P.wait <= 0 && this.ready <= 0) { P.active = true; P.a = rr(0, 7); const lat = rr(-2, 2); P.x = p.x - Math.cos(P.a) * 16 + Math.cos(P.a + 1.57) * lat; P.y = p.y - Math.sin(P.a) * 16 + Math.sin(P.a + 1.57) * lat; P.left = 32; }
    } else {
      const v = 6.5 * dt; P.x += Math.cos(P.a) * v; P.y += Math.sin(P.a) * v; P.left -= v;
      P.dropT -= dt;
      const d = dist(P.x, P.y, p.x, p.y);
      if (P.dropT <= 0 && d < 7.5) {
        P.dropT = lerp(1.05, 0.45, diff);
        const lead = 1.1;
        let tx = p.x + clamp(p.vx, -6, 6) * lead + rr(-1.3, 1.3), ty = p.y + clamp(p.vy, -6, 6) * lead + rr(-1.3, 1.3);
        tx = clamp(tx, 1.2, m.w - 1.2); ty = clamp(ty, 1.2, m.h - 1.2);
        this.dropBomb(tx, ty);
      }
      if (P.left <= 0) { P.active = false; P.wait = lerp(1.6, 0.5, diff); }
    }
    // random far-away bombs (the town is under attack everywhere)
    if (R() < dt * 0.25 && this.ready <= 0) this.dropBomb(rr(2, m.w - 2), rr(2, m.h - 2), true);
    this.updWorld(dt);
    // engine sound follows the plane
    if (this.engine) { const s = spatial(p, P.x, P.y, 30); this.engine.set(P.active ? s.vol : 0.05, 0.8, s.pan); }
  }
  dropBomb(x, y, far) {
    const fuse = 1.9;
    this.bombs.push({ x, y, t: 0, fuse });
    const s = spatial(this.p, x, y, 22); if (!far || s.d < 10) Snd.whistle(fuse, s.vol * 0.8, s.pan);
  }
  updWorld(dt) {
    for (const b of this.bombs) { b.t += dt; if (b.t >= b.fuse) { b.dead = true; this.explode(b); } }
    this.bombs = this.bombs.filter(b => !b.dead);
    for (const e of this.booms) e.t += dt; this.booms = this.booms.filter(e => e.t < 0.8);
    for (const f of this.fires) f.f += dt * 8;
    for (const c of this.civs) {
      if (!c.alive) continue;
      c.turnT -= dt; c.bob += dt * 12;
      const nx = c.x + Math.cos(c.a) * 2.3 * dt, ny = c.y + Math.sin(c.a) * 2.3 * dt;
      if (Ray.solid(this.map, nx + Math.cos(c.a) * 0.3, ny + Math.sin(c.a) * 0.3) || c.turnT <= 0) { c.a = ((R() * 4) | 0) * Math.PI / 2; c.turnT = rr(1, 3); }
      else { c.x = nx; c.y = ny; }
    }
    if (this.decals.length > 120) this.decals.splice(18, 1);
  }
  draw() {
    const p = this.p;
    const cam = Ray.chase(this.map, p, 2.3, 0.72, -14);
    const sprites = [];
    for (const c of this.covers) sprites.push({ x: c.x, y: c.y, img: SPR.cover, w: 0.9, h: 0.42 });
    for (const r of this.rubble) sprites.push({ x: r.x, y: r.y, img: SPR.rubble, w: 0.9, h: 0.38 });
    for (const f of this.fires) sprites.push({ x: f.x, y: f.y, img: SPR.fire[(f.f | 0) % 4], w: 0.5, h: 0.62 });
    for (const c of this.civs) if (c.alive) sprites.push(eggBillboard(c.img, c.x, c.y, { z: Math.abs(Math.sin(c.bob)) * 0.06 }));
    for (const e of this.booms) sprites.push({ x: e.x, y: e.y, img: BOOM[Math.min(9, (e.t / 0.8 * 10) | 0)], w: 2.6, h: 2.6, z: -0.2 });
    sprites.push({ x: 25.2, y: 23.4, img: SPR.sign, w: 0.7, h: 0.6, z: 0.35 });
    const P = this.plane;
    if (P.active) sprites.push({ x: P.x, y: P.y, img: SPR.bomber, w: 4.5, h: 1.8, z: 5, noZ: true });
    if (!this.dead) {
      const blink = p.inv > 0 && (p.inv * 8) % 1 < 0.5;
      const o = { h: this.hiding ? 0.3 : 0.48, z: p.h * 0.6, alpha: blink ? 0.4 : undefined };
      if (p.diveT > 0) o.lying = true; else if (this.rolling) o.rollFrame = (p.rollA * 1.4) | 0;
      sprites.push(shellySprite(0, p.x, p.y, o));
    }
    const decals = this.decals.slice();
    decals.push({ x: p.x, y: p.y, r: 0.2 - p.h * 0.1, fill: 'rgba(0,0,0,.45)' });
    if (this.dead) decals.push({ x: p.x, y: p.y, r: 0.5, img: SPLATS[1] });
    if (P.active) decals.push({ x: P.x + 1, y: P.y + 1, r: 1.6, fill: 'rgba(0,0,0,.25)' });
    for (const b of this.bombs) {
      const f = b.t / b.fuse, blink = (b.t * (4 + f * 10)) % 1 < 0.5;
      decals.push({ x: b.x, y: b.y, r: 1.6, fill: `rgba(230,30,20,${0.12 + f * 0.25})`, stroke: blink ? '#ff3a2a' : '#901a10' });
      decals.push({ x: b.x, y: b.y, r: Math.max(0.1, 1.6 * (1 - f)), stroke: '#ffd0c0' });
      decals.push({ x: b.x, y: b.y, r: 0.12, fill: '#ff2a1a' });
    }
    ctx.save();
    const roll = 0;
    if (roll) { ctx.translate(W / 2, H / 2); ctx.rotate(roll); ctx.scale(1.3, 1.3); ctx.translate(-W / 2, -H / 2); }
    Ray.render(cam, this.map, sprites, { decals, skyImg: SKY.town, floor: FLOOR.cobble, fog: '200,226,240', fogDist: 24 });
    (this.weather || (this.weather = new Weather('embers'))).draw(p.a);
    ctx.restore();
    // helmet rim, top of screen
    // HUD: compass to bunker
    const ba = angDiff(p.a, Math.atan2(this.bunker.y - p.y, this.bunker.x - p.x));
    const bx = W / 2 + clamp(ba / 1.6, -1, 1) * 70;
    rect(W / 2 - 76, 4, 152, 12, 'rgba(0,0,0,.55)'); rect(W / 2, 4, 1, 3, '#888');
    txt(Math.abs(ba) < 1.5 ? '▼' : (ba < 0 ? '◄' : '►'), bx, 6, '#7dff6a', 'center');
    txt('BUNKER ' + Math.round(dist(p.x, p.y, this.bunker.x, this.bunker.y) * 4) + 'M', W / 2, 18, '#7dff6a', 'center');
    txt(this.time.toFixed(0) + 's', 6, 6, '#f4ecd0');
    for (let i = 0; i < save.sup.meds && i < 6; i++) { rect(W - 14 - i * 11, 5, 9, 9, '#fff'); rect(W - 11 - i * 11, 6, 3, 7, '#c22'); rect(W - 13 - i * 11, 8, 7, 3, '#c22'); }
    // danger warning
    const near = this.bombs.some(b => dist(b.x, b.y, p.x, p.y) < 2);
    if (near && (this.time * 6) % 1 < 0.5) { ctx.strokeStyle = '#ff2a1a'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, W - 4, H - 4); }
    txt(this.hiding ? (this.covers.some(c => dist(c.x, c.y, p.x, p.y) < 0.8) ? 'HIDING - SAFE IN SANDBAGS' : 'HIDING (find sandbags!)') : this.rolling ? 'ROLLING!' : '', W / 2, H - 14, '#ffd23a', 'center');
    if (this.dead) { ctx.globalAlpha = Math.min(0.5, this.dead * 0.4); rect(0, 0, W, H, '#f5b819'); ctx.globalAlpha = 1; txt('SPLAT!', W / 2, 70, '#fff', 'center', 16); }
  }
}
