// ================= MODE 4 (story chapter 3): SURVIVAL — build (third person) then survive (first person) =================
const MATS = [
  { k: 'sandbag', name: 'SANDBAGS', tile: 4, hp: 6, n: 10 },
  { k: 'brick', name: 'BRICKS', tile: 1, hp: 8, n: 6 },
  { k: 'cement', name: 'CEMENT', tile: 7, hp: 12, n: 4 },
  { k: 'wood', name: 'WOOD', tile: 5, hp: 3, n: 6 },
  { k: 'metal', name: 'METAL', tile: 6, hp: 16, n: 3 },
  { k: 'carton', name: 'EGG CARTON', tile: 8, hp: 5, n: 4, soft: true },
  { k: 'dig', name: 'FOXHOLE', tile: 0, n: 3, hole: true },
];
class SurvivalMode {
  constructor(cb) { this.cb = cb; this.pausable = true; this.reset(); }
  reset() {
    this.GW = 12; this.GH = 9;
    this.g = new Int8Array(this.GW * this.GH).fill(-1);
    this.hp = new Float32Array(this.GW * this.GH);
    this.hole = new Uint8Array(this.GW * this.GH);
    this.count = MATS.map(m => m.n);
    this.count[0] += 2 * save.sup.bags; this.count[1] += save.sup.bags;
    this.mat = 0; this.sx = 5; this.sy = 4; this.fx = 0; this.fy = -1; this.moveT = 0;
    this.phase = 'build'; this.buildT = 60; this.t = 0;
    this.touch = { pad: true, a: 'PLACE', b: 'REMOVE', c: 'ITEM+', d: 'ITEM-', pause: true };
    this.parts = new Parts();
  }
  enter() { Snd.play('survival'); FX.banner('BUILD YOUR SHELTER!', '#ffd23a'); }
  exit() { }
  restart() { this.reset(); In.setTouch(this.touch); this.enter(); }
  idx(x, y) { return y * this.GW + x; }
  inB(x, y) { return x >= 0 && y >= 0 && x < this.GW && y < this.GH; }
  placeAt(x, y) {
    if (!this.inB(x, y) || (x === this.sx && y === this.sy)) return;
    const i = this.idx(x, y), m = MATS[this.mat];
    if (this.g[i] >= 0 || this.hole[i]) { Snd.buzz(); return; }
    if (this.count[this.mat] <= 0) { Snd.buzz(); FX.banner('OUT OF ' + m.name + '!', '#ff5a4a', 1.2); return; }
    this.count[this.mat]--;
    if (m.hole) { this.hole[i] = 1; Snd.dig(); }
    else { this.g[i] = this.mat; this.hp[i] = m.hp; Snd.thud(0.6); }
    const [X, Y] = this.tileXY(x, y); this.parts.burst(X + 8, Y + 6, 8, m.hole ? ['#4a3a22', '#6a5a3a'] : ['#c8b77a', '#888'], 40, 0.4, 80);
  }
  removeAt(x, y) {
    if (!this.inB(x, y)) return; const i = this.idx(x, y);
    if (this.g[i] >= 0) { this.count[this.g[i]]++; this.g[i] = -1; Snd.blip(300); }
    else if (this.hole[i]) { this.count[6]++; this.hole[i] = 0; Snd.dig(); }
  }
  tileXY(x, y) { return [64 + x * 16, 34 + y * 12]; }
  startSurvive() {
    this.phase = 'survive'; this.t = 0; this.surviveT = 45;
    this.touch = { pad: true, a: 'REPAIR', pause: true }; In.setTouch(this.touch);
    const N = this.GW + 2, M = this.GH + 2, t = new Uint8Array(N * M), dmg = new Float32Array(N * M);
    for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
      if (x === 0 || y === 0 || x === N - 1 || y === M - 1) t[y * N + x] = (x + y) % 3 ? 3 : 11;
      else { const gi = this.idx(x - 1, y - 1); if (this.g[gi] >= 0) t[y * N + x] = MATS[this.g[gi]].tile; }
    }
    this.map = { w: N, h: M, t, dmg };
    this.p = { x: this.sx + 1.5, y: this.sy + 1.5, a: Math.atan2(this.fy, this.fx), z: 0.5, stepT: 0, inv: 0 };
    this.decals = [];
    for (let i = 0; i < this.hole.length; i++) if (this.hole[i]) this.decals.push({ x: (i % this.GW) + 1.5, y: Math.floor(i / this.GW) + 1.5, r: 0.45, fill: '#120c06', hole: true });
    this.bombs = []; this.booms = []; this.bombT = 2.5; this.kits = 7; this.dead = 0; this.done = false;
    Snd.siren(3.5, 0.25); FX.banner('HERE THEY COME!', '#ff5a4a');
  }
  update(dt) { this.parts.update(dt); if (this.phase === 'build') this.updBuild(dt); else this.updSurvive(dt); }
  updBuild(dt) {
    this.t += dt; this.buildT -= dt;
    if (this.buildT <= 0 || In.hit('start') || tapIn(256, 2, 62, 14)) { this.startSurvive(); return; }
    for (let k = 1; k <= 7; k++) if (In.hit('n' + k)) { this.mat = k - 1; Snd.blip(); }
    if (In.hit('c') || In.hit('tab')) { this.mat = (this.mat + 1) % MATS.length; Snd.blip(); }
    if (In.hit('d')) { this.mat = (this.mat + MATS.length - 1) % MATS.length; Snd.blip(); }
    // walk on the grid
    this.moveT -= dt;
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [k, dx, dy] of dirs) {
      if (In.hit(k) || (In.down(k) && this.moveT <= 0)) {
        this.fx = dx; this.fy = dy; this.moveT = 0.16;
        const nx = this.sx + dx, ny = this.sy + dy;
        if (this.inB(nx, ny) && this.g[this.idx(nx, ny)] < 0) { this.sx = nx; this.sy = ny; Snd.step(0.2); }
      }
    }
    if (In.hit('a')) this.placeAt(this.sx + this.fx, this.sy + this.fy);
    if (In.hit('b')) this.removeAt(this.sx + this.fx, this.sy + this.fy);
    // tapping: squares and the item bar
    if (In.ptr.pressed) {
      const P = In.ptr;
      for (let i = 0; i < MATS.length; i++) if (P.x >= 4 + i * 45 && P.x < 4 + i * 45 + 43 && P.y >= 146) { this.mat = i; Snd.blip(); }
      const gx = Math.floor((P.x - 64) / 16), gy = Math.floor((P.y - 34) / 12);
      if (this.inB(gx, gy) && P.y < 146) { const i = this.idx(gx, gy); if (this.g[i] >= 0 || this.hole[i]) this.removeAt(gx, gy); else this.placeAt(gx, gy); }
    }
  }
  explode(b) {
    const p = this.p, sp = spatial(p, b.x, b.y, 20), m = this.map;
    Snd.explosion(1, sp.vol, sp.pan);
    this.booms.push({ x: b.x, y: b.y, t: 0 });
    const d = dist(p.x, p.y, b.x, b.y);
    FX.shake(clamp(7 - d * 1.5, 1, 7), 0.5); if (d < 3) FX.flash('#ffb060', 0.4);
    // walls take damage; soft egg cartons soak up half of it
    for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
      const gi = this.idx(x - 1, y - 1); if (this.g[gi] < 0) continue;
      const dd = dist(x + 0.5, y + 0.5, b.x, b.y); if (dd > 2) continue;
      const mat = MATS[this.g[gi]];
      let dmg = Math.ceil(7 * (1 - dd / 2.2)); if (mat.soft) dmg = Math.ceil(dmg / 2);
      this.hp[gi] -= dmg;
      if (this.hp[gi] <= 0) { this.g[gi] = -1; m.t[y * m.w + x] = 0; m.dmg[y * m.w + x] = 0; this.decals.push({ x: x + 0.5, y: y + 0.5, r: 0.5, fill: 'rgba(70,60,45,.9)' }); Snd.thud(0.8); }
      else m.dmg[y * m.w + x] = 1 - this.hp[gi] / mat.hp;
    }
    this.decals.push({ x: b.x, y: b.y, r: 0.7, fill: 'rgba(12,8,4,.7)' });
    if (this.dead || p.inv > 0) return;
    const gx = Math.floor(p.x) - 1, gy = Math.floor(p.y) - 1;
    const inHole = this.inB(gx, gy) && this.hole[this.idx(gx, gy)];
    if (d < (inHole ? 0.85 : 1.6) && Ray.los(m, b.x, b.y, p.x, p.y)) {
      Snd.splat(1, 0);
      if (save.sup.meds > 0) { save.sup.meds--; writeSave(); p.inv = 2.5; FX.flash('#fff', 0.8); FX.banner('MEDIC! SHELL TAPED UP!', '#7dff6a'); Voice.play('m_patch'); }
      else { this.dead = 0.001; FX.flash('#f5b819', 0.9); }
    }
  }
  updSurvive(dt) {
    const p = this.p, m = this.map;
    this.t += dt;
    for (const b of this.bombs) { b.t += dt; if (b.t >= b.fuse) { b.dead = true; this.explode(b); } }
    this.bombs = this.bombs.filter(b => !b.dead);
    this.booms.forEach(e => e.t += dt); this.booms = this.booms.filter(e => e.t < 0.8);
    if (this.dead) { this.dead += dt; if (this.dead > 2.2 && !this.done) { this.done = true; this.cb.lose({ title: 'SPLAT!', lines: ['Your shelter was not enough.', 'Put strong walls between you', 'and the red marks. Fix them!'] }); } return; }
    p.inv = Math.max(0, p.inv - dt);
    this.surviveT -= dt;
    if (this.surviveT <= 0 && !this.done) {
      this.done = true; let walls = 0; for (let i = 0; i < this.g.length; i++) if (this.g[i] >= 0) walls++;
      this.cb.win({ lines: ['You survived the bombing!', 'WALLS STILL STANDING: ' + walls, 'REPAIR KITS LEFT: ' + this.kits] }); return;
    }
    if (In.down('left')) p.a -= 2.6 * dt; if (In.down('right')) p.a += 2.6 * dt;
    let sp = 0; if (In.down('up')) sp = 2.4; if (In.down('down')) sp = -1.6;
    Ray.move(m, p, Math.cos(p.a) * sp * dt, Math.sin(p.a) * sp * dt, 0.2);
    p.x = clamp(p.x, 1.25, m.w - 1.25); p.y = clamp(p.y, 1.25, m.h - 1.25);
    if (sp) { p.stepT -= dt; if (p.stepT <= 0) { p.stepT = 0.33; Snd.step(); } }
    const gx = Math.floor(p.x) - 1, gy = Math.floor(p.y) - 1;
    const inHole = this.inB(gx, gy) && this.hole[this.idx(gx, gy)];
    p.z = lerp(p.z, inHole ? 0.22 : 0.5, Math.min(1, dt * 10));
    // aim at a wall
    const hit = Ray.cast(m, p.x, p.y, p.a, 1.7);
    this.aim = null;
    if (hit && hit.x > 0 && hit.y > 0 && hit.x < m.w - 1 && hit.y < m.h - 1) { const gi = this.idx(hit.x - 1, hit.y - 1); if (this.g[gi] >= 0) this.aim = { gi, x: hit.x, y: hit.y }; }
    if (In.hit('a')) {
      const a = this.aim;
      if (a && this.kits > 0 && this.hp[a.gi] < MATS[this.g[a.gi]].hp) {
        const mat = MATS[this.g[a.gi]]; this.hp[a.gi] = Math.min(mat.hp, this.hp[a.gi] + 5); this.kits--;
        m.dmg[a.y * m.w + a.x] = 1 - this.hp[a.gi] / mat.hp; Snd.repair(); FX.shake(1, 0.1);
      } else Snd.buzz();
    }
    // bombs
    const diff = clamp(this.t / 45, 0, 1);
    this.bombT -= dt;
    if (this.bombT <= 0) {
      this.bombT = lerp(1.3, 0.5, diff);
      let x, y;
      if (R() < 0.45) { x = p.x + rr(-2.2, 2.2); y = p.y + rr(-2.2, 2.2); } else { x = rr(1.3, m.w - 1.3); y = rr(1.3, m.h - 1.3); }
      x = clamp(x, 1.2, m.w - 1.2); y = clamp(y, 1.2, m.h - 1.2);
      const fuse = 1.7; this.bombs.push({ x, y, t: 0, fuse });
      const s = spatial(p, x, y, 16); Snd.whistle(fuse, s.vol * 0.7, s.pan);
    }
  }
  draw() { if (this.phase === 'build') this.drawBuild(); else this.drawSurvive(); }
  drawBuild() {
    rect(0, 0, W, H, '#2e2a1e');
    srand(3); for (let i = 0; i < 300; i++) rect(rnd() * W, rnd() * H, 2, 1, pick(['#3a3424', '#24201a', '#34301e']));
    rect(0, 0, W, 18, '#14160e');
    txt('BUILD: ' + Math.ceil(this.buildT) + 's', 6, 5, this.buildT < 10 ? '#ff5a4a' : '#ffd23a');
    box(256, 2, 62, 14, '#3a2a1a', '#ffd23a'); txt('READY!', 287, 5, '#ffd23a', 'center');
    // the ground grid (dirt), drawn back to front so walls overlap nicely
    for (let y = 0; y < this.GH; y++) for (let x = 0; x < this.GW; x++) { const [X, Y] = this.tileXY(x, y); rect(X, Y, 16, 12, (x + y) % 2 ? '#5a4a32' : '#54452e'); }
    for (let y = 0; y < this.GH; y++) {
      for (let x = 0; x < this.GW; x++) {
        const [X, Y] = this.tileXY(x, y), i = this.idx(x, y);
        if (this.hole[i]) { ctx.fillStyle = '#1a120a'; ctx.beginPath(); ctx.ellipse(X + 8, Y + 6, 7, 4.5, 0, 0, 7); ctx.fill(); rect(X + 2, Y + 2, 12, 1, '#7a6a4a'); }
        if (this.g[i] >= 0) { const tx = TILE_TEX[MATS[this.g[i]].tile]; ctx.drawImage(tx, 0, 0, 32, 22, X, Y - 7, 16, 11); ctx.drawImage(tx, 0, 22, 32, 10, X, Y + 4, 16, 8); rect(X, Y + 4, 16, 8, 'rgba(0,0,0,.35)'); rect(X, Y - 7, 16, 1, 'rgba(255,255,255,.25)'); }
      }
      if (y === this.sy) {
        const [X, Y] = this.tileXY(this.sx, this.sy);
        const s = this.fy < 0 ? (makeEgg.shellyBack2 || (makeEgg.shellyBack2 = makeEgg(Object.assign(CAST.shelly(2), { back: true })))) : eggSprite('shelly', 2);
        ctx.drawImage(s, X - 2, Y - 18 + Math.abs(Math.sin(this.t * 8)) * (this.moveT > 0 ? 1 : 0));
      }
    }
    // target square
    const tx = this.sx + this.fx, ty = this.sy + this.fy;
    if (this.inB(tx, ty) && !In.touch) { const [X, Y] = this.tileXY(tx, ty); ctx.strokeStyle = (this.t * 3) % 1 < 0.5 ? '#ffd23a' : '#fff'; ctx.strokeRect(X + 0.5, Y - 6.5, 15, 18); }
    // item bar
    MATS.forEach((m, i) => {
      const x = 4 + i * 45; box(x, 146, 43, 32, i === this.mat ? '#4a3a1a' : '#1c1e14', i === this.mat ? '#ffd23a' : '#6a6450');
      if (m.hole) { ctx.fillStyle = '#1a120a'; ctx.beginPath(); ctx.ellipse(x + 21, 157, 8, 4, 0, 0, 7); ctx.fill(); }
      else ctx.drawImage(TILE_TEX[m.tile], x + 13, 149, 16, 14);
      txt(String(this.count[i]), x + 21, 166, this.count[i] ? '#f4ecd0' : '#ff5a4a', 'center');
    });
    const cm = MATS[this.mat]; txt(cm.name, 6, 22, '#c8b77a', 'left', 6);
    if (cm.hp) { txt('STRENGTH', 6, 30, '#8a8a7a', 'left', 6); for (let i = 0; i < Math.ceil(cm.hp / 4); i++) rect(6 + i * 7, 38, 5, 5, '#7dff6a'); } else txt('STAY LOW!', 6, 30, '#7dff6a', 'left', 6);
    this.parts.draw();
  }
  drawSurvive() {
    const p = this.p;
    const sprites = this.booms.map(e => ({ x: e.x, y: e.y, img: BOOM[Math.min(9, (e.t / 0.8 * 10) | 0)], w: 2.4, h: 2.4, z: -0.2 }));
    const decals = this.decals.slice();
    for (const b of this.bombs) {
      const f = b.t / b.fuse, blink = (b.t * (4 + f * 10)) % 1 < 0.5;
      decals.push({ x: b.x, y: b.y, r: 1.6, fill: `rgba(230,30,20,${0.12 + f * 0.25})`, stroke: blink ? '#ff3a2a' : '#901a10' });
      decals.push({ x: b.x, y: b.y, r: Math.max(0.1, 1.6 * (1 - f)), stroke: '#ffd0c0' });
    }
    Ray.render({ x: p.x, y: p.y, a: p.a, z: p.z }, this.map, sprites, { decals, skyImg: SKY.dusk, floor: FLOOR.dirt, fog: '52,42,34', fogDist: 12 });
    ctx.fillStyle = '#2e3818'; ctx.beginPath(); ctx.ellipse(W / 2, -26, W * 0.7, 34, 0, 0, 7); ctx.fill();
    // crosshair + wall health
    const a = this.aim; const cc = a ? '#7dff6a' : '#f4ecd0';
    rect(W / 2 - 5, H / 2, 4, 1, cc); rect(W / 2 + 2, H / 2, 4, 1, cc); rect(W / 2, H / 2 - 5, 1, 4, cc); rect(W / 2, H / 2 + 2, 1, 4, cc);
    if (a) { const mat = MATS[this.g[a.gi]]; bar(W / 2 - 30, H / 2 + 10, 60, 6, this.hp[a.gi] / mat.hp, '#7dff6a'); txt(mat.name, W / 2, H / 2 + 18, '#f4ecd0', 'center'); if (this.hp[a.gi] < mat.hp) txt(In.touch ? 'A: REPAIR' : 'SPACE: REPAIR', W / 2, H / 2 + 28, '#ffd23a', 'center'); }
    txt('SURVIVE ' + Math.ceil(Math.max(0, this.surviveT)) + 's', 6, 6, '#ffd23a');
    txt('REPAIR KITS ' + this.kits, W - 40, 6, '#f4ecd0', 'right');
    const gx = Math.floor(p.x) - 1, gy = Math.floor(p.y) - 1;
    if (this.inB(gx, gy) && this.hole[this.idx(gx, gy)]) txt('IN FOXHOLE - STAYING LOW', W / 2, H - 14, '#7dff6a', 'center');
    const near = this.bombs.some(b => dist(b.x, b.y, p.x, p.y) < 2);
    if (near && (this.t * 6) % 1 < 0.5) { ctx.strokeStyle = '#ff2a1a'; ctx.lineWidth = 3; ctx.strokeRect(2, 2, W - 4, H - 4); }
    if (p.inv > 0 && (p.inv * 8) % 1 < 0.5) { ctx.globalAlpha = 0.25; rect(0, 0, W, H, '#fff'); ctx.globalAlpha = 1; }
    if (this.dead) drawSplatOverlay(this.dead);
  }
}
