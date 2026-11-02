// ================= MODE 1 (story chapter 4): BOMBING — bird's eye view =================
function topEgg(shell, hat) {
  const [c, x] = mk(8, 9);
  x.fillStyle = shade(shell, 0.5); x.beginPath(); x.ellipse(4, 4.5, 3.5, 4, 0, 0, 7); x.fill();
  x.fillStyle = shell; x.beginPath(); x.ellipse(4, 4.5, 2.6, 3.2, 0, 0, 7); x.fill();
  if (hat) { x.fillStyle = hat; x.beginPath(); x.arc(4, 4, 2.2, 0, 7); x.fill(); x.fillStyle = shade(hat, 1.4); x.fillRect(3, 3, 1, 1); }
  return outlined(c);
}
const TOP = (() => {
  const T2 = {};
  T2.enemy = ENEMY_SHELLS.map((s, i) => topEgg(s, ['#262626', '#3a3a3a', '#2a3320'][i % 3]));
  T2.friend = FRIEND_SHELLS.map((s, i) => topEgg(s, ['#5b6b2e', '#56662c', null, '#6b5a2e'][i % 4]));
  T2.prisoner = FRIEND_SHELLS.map(s => topEgg(s, null));
  T2.tank = (() => { const [c, x] = mk(14, 18); x.fillStyle = '#1a1e14'; x.fillRect(0, 1, 4, 16); x.fillRect(10, 1, 4, 16); x.fillStyle = '#3a4628'; x.fillRect(3, 2, 8, 14); x.fillStyle = '#2a3420'; x.beginPath(); x.arc(7, 10, 4, 0, 7); x.fill(); x.fillRect(6, 0, 2, 9); x.fillStyle = '#6f8a2a'; x.fillRect(6, 10, 2, 2); return outlined(c); })();
  T2.base = (() => { const [c, x] = mk(28, 22); x.fillStyle = '#1e2218'; x.fillRect(0, 2, 28, 20); x.fillStyle = '#4a5238'; x.fillRect(1, 1, 26, 19); srand(3); for (let i = 0; i < 18; i++) { x.fillStyle = pick(['#3a4228', '#5a6244', '#2e3420']); x.fillRect(rnd() * 24, rnd() * 16, 4, 3); } x.fillStyle = '#0a0a08'; x.fillRect(4, 16, 20, 2); x.fillStyle = '#6f8a2a'; x.beginPath(); x.ellipse(14, 9, 4, 5, 0, 0, 7); x.fill(); x.fillStyle = '#111'; x.fillRect(12, 8, 1, 1); x.fillRect(15, 8, 1, 1); return outlined(c); })();
  T2.tent = (() => { const [c, x] = mk(14, 11); x.fillStyle = '#3e4a2a'; x.fillRect(0, 0, 14, 11); x.fillStyle = '#56663a'; x.fillRect(0, 0, 7, 11); x.fillStyle = '#2a321c'; x.fillRect(6, 0, 2, 11); return outlined(c); })();
  T2.plane = [0, 1].map(f => { const [c, x] = mk(28, 26);
    x.fillStyle = '#8a8470'; x.fillRect(0, 9, 28, 6); x.fillStyle = '#e4dfcc'; x.fillRect(1, 9, 26, 5);
    x.fillStyle = '#d8d2bc'; x.fillRect(12, 2, 4, 22); x.fillStyle = '#e4dfcc'; x.fillRect(8, 20, 12, 3);
    x.fillStyle = '#2a4a6a'; x.fillRect(13, 6, 2, 3);
    [[5, 11], [23, 11]].forEach(([a, b]) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(a, b, 2.5, 0, 7); x.fill(); x.fillStyle = '#f5b819'; x.beginPath(); x.arc(a, b, 1.5, 0, 7); x.fill(); });
    x.fillStyle = '#555'; x.fillRect(13, 1, 2, 2);
    x.fillStyle = 'rgba(220,220,220,.7)'; if (f) x.fillRect(8, 0, 12, 1); else x.fillRect(11, 0, 6, 1);
    return outlined(c); });
  T2.planeShadow = (() => { const [c, x] = mk(30, 28); x.drawImage(T2.plane[0], 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, 28, 26); return c; })();
  return T2;
})();
const CLOUDS = [0, 1, 2].map(k => {
  const [c, x] = mk(64, 34); srand(70 + k);
  const blobs = Array.from({ length: 9 }, () => [10 + rnd() * 44, 12 + rnd() * 10, 6 + rnd() * 9]);
  x.fillStyle = '#b4b4b4'; blobs.forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b + 3, r, 0, 7); x.fill(); });
  x.fillStyle = '#ffffff'; blobs.forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); });
  x.fillStyle = '#dedede'; blobs.forEach(([a, b, r]) => { x.fillRect(a - r * 0.6, b + r * 0.3, r * 1.2, 2); });
  return c;
});
const BOMB_TYPES = [
  { k: 'shell', name: 'EGGSHELL', r: 14, dmg: 1, cd: 0.55, col: '#e8e4d8' },
  { k: 'big', name: 'BIG BOMB', r: 30, dmg: 3, cd: 3.5, col: '#ffd23a', ammo: true },
  { k: 'cluster', name: 'CLUSTER', r: 9, dmg: 1, cd: 2.2, col: '#ff8a40' },
  { k: 'yolk', name: 'STICKY YOLK', r: 24, dmg: 0, cd: 1.8, col: '#f5b819' },
];

class BombingMode {
  constructor(cb) { this.cb = cb; this.pausable = true; this.touch = { pad: true, a: 'DROP', b: '◄ BOMB', c: 'BOMB ►', pause: true }; this.reset(); }
  roadX(y) { return 160 + Math.sin(y / 300) * 70 + Math.sin(y / 90) * 14; }
  reset() {
    const L = this.L = 2600;
    const [tc, tx] = mk(W, L); this.terrain = tc; this.tx = tx;
    srand(404);
    tx.fillStyle = '#3a9a34'; tx.fillRect(0, 0, W, L);
    for (let i = 0; i < 7000; i++) { tx.fillStyle = pick(['#36903a', '#46a83e', '#2e8434', '#52b844', '#3c9a34']); tx.fillRect(rnd() * W, rnd() * L, 2 + rnd() * 5, 1 + rnd() * 3); }
    for (let i = 0; i < 26; i++) { const x = rnd() * (W - 70), y = rnd() * L, w = 40 + rnd() * 50, h = 30 + rnd() * 60; const c = pick(['#c8b040', '#b8925a', '#9ab040', '#5cc04a']); tx.fillStyle = c; tx.fillRect(x, y, w, h); tx.fillStyle = shade(c, 0.82); for (let s = 0; s < h; s += 4) tx.fillRect(x, y + s, w, 1); }
    // the river and the bridge
    const ry = 1350; tx.fillStyle = '#2f6ad0'; for (let x = 0; x < W; x++) tx.fillRect(x, ry + Math.sin(x / 30) * 6, 1, 26); tx.fillStyle = '#8ad0ff'; for (let i = 0; i < 80; i++) tx.fillRect(rnd() * W, ry + 6 + rnd() * 14, 4, 1);
    // the winding road
    for (let y = 0; y < L; y += 2) { const x = this.roadX(y); tx.fillStyle = '#965e32'; tx.fillRect(x - 8, y, 16, 2); tx.fillStyle = '#d0aa6a'; tx.fillRect(x - 6, y, 12, 2); if (y % 20 < 8) { tx.fillStyle = '#e0c080'; tx.fillRect(x - 1, y, 2, 2); } }
    tx.fillStyle = '#5a4a3a'; tx.fillRect(this.roadX(ry) - 12, ry - 6, 24, 38); tx.fillStyle = '#7a6a5a'; tx.fillRect(this.roadX(ry) - 10, ry - 6, 20, 38);
    // trenches
    for (const ty of [400, 1000, 1700, 2250]) { tx.fillStyle = '#2a2016'; let y = ty; for (let x = 0; x < W; x += 8) { tx.fillRect(x, y, 9, 3); y += (Math.floor(x / 8) % 2 ? 4 : -4); } }
    // trees and ruined houses
    for (let i = 0; i < 160; i++) { const x = rnd() * W, y = rnd() * L; if (Math.abs(x - this.roadX(y)) < 14) continue; tx.fillStyle = 'rgba(0,0,0,.3)'; tx.beginPath(); tx.arc(x + 3, y + 3, 5, 0, 7); tx.fill(); tx.fillStyle = pick(['#1e6a2a', '#2a7a32', '#1a5a22']); tx.beginPath(); tx.arc(x, y, 5, 0, 7); tx.fill(); tx.fillStyle = '#5cd04a'; tx.fillRect(x - 2, y - 3, 2, 2); }
    for (let i = 0; i < 30; i++) { const x = rnd() * W, y = rnd() * L; if (Math.abs(x - this.roadX(y)) < 22) continue; tx.fillStyle = '#2a2420'; tx.fillRect(x + 2, y + 2, 14, 12); tx.fillStyle = pick(['#c0281c', '#965e32', '#f04a28']); tx.fillRect(x, y, 14, 12); tx.fillStyle = '#1a1410'; if (rnd() < 0.6) tx.fillRect(x + 3 + rnd() * 6, y + 2 + rnd() * 5, 5, 4); }
    // ---- units ----
    this.ents = [];
    const add = e => { e.hp = e.hp || 1; e.slow = 0; e.flee = 0; e.tx = e.x; e.ty = e.y; this.ents.push(e); return e; };
    const baseYs = [L - 480, L - 860, L - 1240, L - 1660, L - 2060, L - 2420];
    baseYs.forEach((by, i) => {
      const side = i % 2 ? -1 : 1, bx = clamp(this.roadX(by) + side * 70, 30, W - 30);
      tx.fillStyle = '#3a3220'; tx.beginPath(); tx.arc(bx, by, 26, 0, 7); tx.fill(); tx.fillStyle = '#4a4230'; tx.beginPath(); tx.arc(bx, by, 22, 0, 7); tx.fill();
      for (let a = 0; a < 6.28; a += 0.3) { tx.fillStyle = '#b59a62'; tx.fillRect(bx + Math.cos(a) * 24 - 2, by + Math.sin(a) * 24 - 1, 4, 3); }
      add({ type: 'base', x: bx, y: by, hp: 3, size: 13, enemy: true });
      add({ type: 'tent', x: bx - 18, y: by + 14, size: 6, enemy: true }); add({ type: 'tent', x: bx + 18, y: by - 14, size: 6, enemy: true });
      // prisoner pen next to the base: careful!
      const px = clamp(bx - side * 48, 24, W - 24), py = by + 6;
      tx.strokeStyle = '#8a7a5a'; tx.lineWidth = 1; tx.strokeRect(px - 16.5, py - 11.5, 33, 23); tx.fillStyle = '#5a5a3a'; tx.fillRect(px - 16, py - 11, 32, 22);
      for (let k = -16; k <= 16; k += 4) { tx.fillStyle = '#6a5a3a'; tx.fillRect(px + k, py - 12, 1, 2); tx.fillRect(px + k, py + 11, 1, 2); }
      const n = 3 + (i % 2);
      for (let k = 0; k < n; k++) add({ type: 'prisoner', x: px + rr(-10, 10), y: py + rr(-6, 6), size: 3, img: pick(TOP.prisoner), pen: { x: px, y: py, w: 13, h: 8 }, spd: 6 });
      for (let k = 0; k < 5; k++) add({ type: 'soldier', x: bx + rr(-30, 30), y: by + rr(-30, 30), size: 3, enemy: true, img: pick(TOP.enemy), home: { x: bx, y: by, r: 45 }, spd: 10 });
      add({ type: 'tank', x: this.roadX(by + 60), y: by + 60, hp: 2, size: 7, enemy: true, road: true, dir: -1, spd: 9 });
    });
    // marching enemy patrols on the road
    for (let i = 0; i < 6; i++) { const y0 = rr(200, L - 300); for (let k = 0; k < 4; k++) add({ type: 'soldier', x: this.roadX(y0 + k * 9), y: y0 + k * 9, size: 3, enemy: true, img: pick(TOP.enemy), road: true, dir: i % 2 ? 1 : -1, spd: 7, off: rr(-3, 3) }); }
    // our own troops marching to the front: don't bomb them!
    for (const y0 of [L - 300, L - 1450, L - 2250]) for (let k = 0; k < 5; k++) add({ type: 'friend', x: this.roadX(y0 + k * 9), y: y0 + k * 9, size: 3, img: pick(TOP.friend), road: true, dir: -1, spd: 6, off: rr(-3, 3) });
    this.camY = L - H; this.plane = { x: 160, y: 130, bank: 0 };
    this.bombs = []; this.mini = []; this.puddles = []; this.fires = [];
    this.cd = [0, 0, 0, 0]; this.sel = 0; this.bigAmmo = 3 + save.sup.bombs;
    this.ff = 0; this.score = 0; this.kills = 0; this.t = 0; this.over = false; this.passes = 1;
    this.parts = new Parts(); this.clouds = []; for (let i = 0; i < 3; i++) this.clouds.push({ x: rr(0, W), y: rr(0, H), r: rr(14, 26) });
  }
  enter() { Snd.play('bombing'); this.engine = Snd.planeEngine(); FX.banner('DESTROY ALL 6 BASES', '#ffd23a'); }
  exit() { if (this.engine) this.engine.stop(); }
  restart() { this.exit(); this.reset(); this.enter(); }
  basesLeft() { return this.ents.filter(e => e.type === 'base' && !e.dead).length; }
  panX(x) { return (x - W / 2) / (W / 2); }
  stampCrater(x, y, r) {
    const t = this.tx; t.fillStyle = 'rgba(30,22,14,.85)'; t.beginPath(); t.ellipse(x, y, r * 0.55, r * 0.45, 0, 0, 7); t.fill();
    t.fillStyle = 'rgba(90,72,50,.6)'; t.beginPath(); t.ellipse(x, y, r * 0.55, r * 0.45, 0, 0, 7); t.ellipse(x, y, r * 0.4, r * 0.3, 0, 0, 7); t.fill('evenodd');
    for (let i = 0; i < r; i++) { t.fillStyle = 'rgba(40,30,20,.6)'; const a = R() * 7, d = r * (0.5 + R() * 0.5); t.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 2, 2); }
  }
  splatEgg(e) {
    e.dead = true; Snd.splat(0.9, this.panX(e.x));
    this.tx.drawImage(pickR(SPLATS), e.x - 7, e.y - 4, 14, 7);
    this.parts.burst(e.x, e.y, 8, ['#f5b819', '#fff', '#f2efe4'], 30, 0.6);
  }
  boom(x, y, bt) {
    const r = bt.r;
    if (bt.k === 'yolk') {
      Snd.gloop(); this.puddles.push({ x, y, r, t: 9 });
      this.tx.fillStyle = 'rgba(245,184,25,.55)'; this.tx.beginPath(); this.tx.ellipse(x, y, r, r * 0.8, 0, 0, 7); this.tx.fill();
      this.tx.fillStyle = 'rgba(255,240,200,.5)'; this.tx.beginPath(); this.tx.ellipse(x - 4, y - 3, r * 0.4, r * 0.3, 0, 0, 7); this.tx.fill();
      this.parts.burst(x, y, 20, ['#f5b819', '#ffd94a'], 50, 0.6);
      return;
    }
    Snd.explosion(bt.k === 'big' ? 1.6 : bt.k === 'cluster' ? 0.6 : 1, bt.k === 'cluster' ? 0.6 : 1, this.panX(x));
    FX.shake(bt.k === 'big' ? 6 : 3, 0.35); if (bt.k === 'big') FX.flash('#ffd080', 0.35);
    this.stampCrater(x, y, r);
    this.parts.burst(x, y, bt.k === 'big' ? 40 : 18, ['#fff4a0', '#ffd040', '#ff8a20', '#d03a10'], r * 3, 0.5);
    this.parts.burst(x, y, 10, ['#3a3430', '#4a4038', '#2a2624'], r * 1.5, 1.2, -10, 4);
    for (const e of this.ents) {
      if (e.dead) continue;
      const d = dist(e.x, e.y, x, y);
      if (d < 70 && e.enemy && e.type === 'soldier') { e.flee = 2.2; e.fx = e.x - x; e.fy = e.y - y; }
      if (d > r + e.size) continue;
      e.hp -= bt.dmg;
      if (e.hp > 0) { if (e.type === 'base') { Snd.metalHit(0.5); this.parts.burst(e.x, e.y, 10, ['#888', '#555'], 40, 0.5); } continue; }
      if (e.type === 'soldier') { this.splatEgg(e); this.score += 10; this.kills++; }
      else if (e.type === 'prisoner' || e.type === 'friend') { this.splatEgg(e); this.friendlyFire(); }
      else if (e.type === 'tank') { e.dead = true; this.score += 50; this.kills++; this.fires.push({ x: e.x, y: e.y, t: 12 }); Snd.explosion(1.2, 0.8, this.panX(e.x)); this.tx.fillStyle = '#1a1a14'; this.tx.fillRect(e.x - 7, e.y - 9, 14, 18); }
      else if (e.type === 'tent') { e.dead = true; this.score += 20; this.fires.push({ x: e.x, y: e.y, t: 6 }); this.tx.fillStyle = '#2a2016'; this.tx.fillRect(e.x - 7, e.y - 5, 14, 11); }
      else if (e.type === 'base') {
        e.dead = true; this.score += 200; Snd.explosion(2, 1, this.panX(e.x)); FX.shake(8, 0.8); FX.flash('#ffd080', 0.6);
        this.stampCrater(e.x, e.y, 34); this.fires.push({ x: e.x, y: e.y, t: 30, big: true });
        const left = this.basesLeft();
        FX.banner(left ? 'BASE DESTROYED! ' + left + ' LEFT' : 'ALL BASES DESTROYED!', '#7dff6a');
      }
    }
  }
  friendlyFire() {
    this.ff++; Snd.radio(); Voice.play('g_ff');
    FX.banner(this.ff >= 3 ? 'MISSION FAILED!' : 'THAT WAS ONE OF OURS! (' + this.ff + '/3)', '#ff5a4a', 2.5);
    if (this.ff >= 3 && !this.over) { this.over = true; setTimeout(() => this.cb.lose({ title: 'CALLED HOME!', lines: ['You hit 3 of our own eggs.', 'Remember: bombs land 2 SECONDS', 'later. White eggs are OURS.'] }), 1800); }
  }
  update(dt) {
    this.t += dt; const pl = this.plane;
    // fly
    let mx = 0, my = 0;
    if (In.down('left')) mx = -1; if (In.down('right')) mx = 1; if (In.down('up')) my = -1; if (In.down('down')) my = 1;
    pl.x = clamp(pl.x + mx * 85 * dt, 14, W - 14); pl.y = clamp(pl.y + my * 60 * dt, 30, 140);
    pl.bank = lerp(pl.bank, mx, Math.min(1, dt * 6));
    const speed = my < 0 ? 34 : my > 0 ? 14 : 22;
    this.camY -= speed * dt;
    if (this.camY <= 0) { this.camY = this.L - H; this.passes++; FX.banner('TURNING AROUND - ANOTHER PASS!', '#ffd23a'); FX.flash('#fff', 0.4); }
    if (this.engine) this.engine.set(0.75, (speed - 14) / 20, (pl.x - W / 2) / W);
    // pick and drop bombs
    for (let i = 0; i < 4; i++) if (In.hit('n' + (i + 1))) { this.sel = i; Snd.blip(); }
    if (In.hit('c')) { this.sel = (this.sel + 1) % 4; Snd.blip(); }
    if (In.hit('b') || In.hit('d')) { this.sel = (this.sel + 3) % 4; Snd.blip(); }
    for (let i = 0; i < 4; i++) { const x = 6 + i * 78; if (tapIn(x, 158, 76, 20)) { this.sel = i; Snd.blip(); } }
    this.cd = this.cd.map(c => Math.max(0, c - dt));
    if (In.down('a') && !this.over) {
      const bt = BOMB_TYPES[this.sel];
      if (this.cd[this.sel] <= 0 && (!bt.ammo || this.bigAmmo > 0)) {
        this.cd[this.sel] = bt.cd; if (bt.ammo) this.bigAmmo--;
        this.bombs.push({ x: pl.x, y: this.camY + pl.y, t: 0, bt });
        Snd.release(); Snd.whistle(2, 0.25, this.panX(pl.x));
      } else if (In.hit('a')) Snd.blip(200, 0.06);
    }
    // bombs fall for exactly 2 seconds
    for (const b of this.bombs) {
      b.t += dt;
      if (b.t >= 2 && !b.dead) {
        b.dead = true;
        if (b.bt.k === 'cluster') for (let i = 0; i < 6; i++) this.mini.push({ x: b.x + rr(-22, 22), y: b.y + rr(-18, 18), t: -i * 0.06 });
        else this.boom(b.x, b.y, b.bt);
      }
    }
    this.bombs = this.bombs.filter(b => !b.dead);
    for (const m of this.mini) { m.t += dt; if (m.t >= 0 && !m.dead) { m.dead = true; this.boom(m.x, m.y, BOMB_TYPES[2]); } }
    this.mini = this.mini.filter(m => !m.dead);
    this.puddles.forEach(p => p.t -= dt); this.puddles = this.puddles.filter(p => p.t > 0);
    // units move
    for (const e of this.ents) {
      if (e.dead || e.type === 'base' || e.type === 'tent') continue;
      const inYolk = this.puddles.some(p => dist(p.x, p.y, e.x, e.y) < p.r);
      let sp = (e.spd || 8) * (inYolk ? 0.2 : 1);
      if (e.flee > 0) { e.flee -= dt; const l = Math.hypot(e.fx, e.fy) || 1; e.x += e.fx / l * sp * 2.2 * dt; e.y += e.fy / l * sp * 2.2 * dt; continue; }
      if (e.road) {
        e.y += e.dir * sp * dt; e.x = this.roadX(e.y) + (e.off || 0);
        if (e.y < 20 || e.y > this.L - 20) e.dir *= -1;
        if (e.type === 'tank' && Math.abs(e.y - (e.y0 || (e.y0 = e.y))) > 160) e.dir *= -1;
      } else if (e.pen) {
        if (dist(e.x, e.y, e.tx, e.ty) < 1.5) { e.tx = e.pen.x + rr(-e.pen.w, e.pen.w); e.ty = e.pen.y + rr(-e.pen.h, e.pen.h); }
        const l = dist(e.x, e.y, e.tx, e.ty) || 1; e.x += (e.tx - e.x) / l * sp * dt; e.y += (e.ty - e.y) / l * sp * dt;
      } else if (e.home) {
        if (dist(e.x, e.y, e.tx, e.ty) < 2) { const a = R() * 7, r = R() * e.home.r; e.tx = e.home.x + Math.cos(a) * r; e.ty = e.home.y + Math.sin(a) * r; }
        const l = dist(e.x, e.y, e.tx, e.ty) || 1; e.x += (e.tx - e.x) / l * sp * dt; e.y += (e.ty - e.y) / l * sp * dt;
      }
      e.x = clamp(e.x, 4, W - 4);
    }
    // smoke and fire from wrecks
    for (const f of this.fires) {
      f.t -= dt;
      if (R() < dt * (f.big ? 30 : 12)) this.parts.add({ x: f.x + rr(-6, 6), y: f.y + rr(-4, 4), vx: rr(-4, 4), vy: -rr(10, 22), c: pickR(['#3a3430', '#4a4038', '#2a2624', '#5a5048']), life: 2, s: 4, grow: 2, fade: true });
      if (R() < dt * (f.big ? 20 : 8)) this.parts.add({ x: f.x + rr(-5, 5), y: f.y + rr(-3, 3), vx: 0, vy: -rr(5, 12), c: pickR(['#ffd040', '#ff7a20', '#d03a10']), life: 0.5, s: 2, fade: true });
    }
    this.fires = this.fires.filter(f => f.t > 0);
    this.parts.update(dt);
    for (const c of this.clouds) { c.y += speed * 1.8 * dt; if (c.y - c.r > H) { c.y = -c.r * 2; c.x = rr(0, W); } }
    if (!this.over && this.basesLeft() === 0) {
      this.over = true;
      setTimeout(() => this.cb.win({ lines: ['SCORE: ' + this.score, 'ENEMIES STOPPED: ' + this.kills, 'FRIENDLY HITS: ' + this.ff + ' / 3', 'PASSES: ' + this.passes] }), 2200);
    }
  }
  draw() {
    const cy = Math.round(this.camY);
    ctx.drawImage(this.terrain, 0, cy, W, H, 0, 0, W, H);
    for (const e of this.ents) {
      if (e.dead || e.y < cy - 20 || e.y > cy + H + 20) continue;
      const sx = e.x, sy = e.y - cy;
      if (e.type === 'base') { ctx.drawImage(TOP.base, sx - 14, sy - 11); rect(sx + 10, sy - 18, 1, 9, '#222'); rect(sx + 11, sy - 18, 6, 4, (this.t * 3) % 1 < 0.5 ? '#6f8a2a' : '#5a7a20'); }
      else if (e.type === 'tent') ctx.drawImage(TOP.tent, sx - 7, sy - 5);
      else if (e.type === 'tank') { ctx.save(); ctx.translate(sx, sy); if (e.dir > 0) ctx.rotate(Math.PI); ctx.drawImage(TOP.tank, -7, -9); ctx.restore(); }
      else { rect(sx - 3, sy + 4, 7, 2, 'rgba(0,0,0,.35)'); ctx.drawImage(e.img, sx - 5, sy - 6 + (Math.sin(this.t * 10 + e.x) > 0 ? 0 : 1), 10, 11); }
    }
    this.parts.draw(0, cy);
    // falling bombs: shrinking bomb + target mark on the ground + countdown
    for (const b of this.bombs) {
      const f = b.t / 2, sy = b.y - cy;
      ctx.strokeStyle = 'rgba(255,60,40,.8)'; ctx.beginPath(); ctx.arc(b.x, sy, b.bt.r * (1.1 - f * 0.6), 0, 7); ctx.stroke();
      rect(b.x - 1, sy - 1, 3, 3, 'rgba(0,0,0,.5)');
      const s = lerp(6, 2, f); ctx.fillStyle = b.bt.col; ctx.beginPath(); ctx.ellipse(b.x + (1 - f) * 10, sy - (1 - f) * 14, s * 0.7, s, 0, 0, 7); ctx.fill();
    }
    // the plane, its shadow, and where a bomb would land
    const pl = this.plane, fr = (this.t * 30 | 0) % 2;
    ctx.globalAlpha = 0.3; ctx.drawImage(TOP.planeShadow, pl.x + 12 - 14, pl.y + 18 - 13); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.strokeRect(pl.x - 3.5, pl.y - 0.5, 7, 1); ctx.strokeRect(pl.x - 0.5, pl.y - 3.5, 1, 7);
    ctx.save(); ctx.translate(pl.x, pl.y - 6); ctx.scale(1 - Math.abs(pl.bank) * 0.18, 1); ctx.drawImage(TOP.plane[fr], -14, -13); ctx.restore();
    for (const [i, c] of this.clouds.entries()) { ctx.drawImage(CLOUDS[i % 3], c.x - 32, c.y - 17, 48 * c.r / 20, 26 * c.r / 20); } ctx.globalAlpha = 1;
    // HUD
    rect(0, 0, W, 14, 'rgba(0,0,0,.6)');
    txt('BASES ' + this.basesLeft(), 4, 3, '#ffd23a'); txt('SCORE ' + this.score, W / 2 + 10, 3, '#f4ecd0', 'center');
    txt('OURS', W - 44, 3, '#c8b77a', 'right');
    for (let i = 0; i < 3; i++) { const x = W - 40 + i * 13; ctx.drawImage(TOP.prisoner[0], x, 2); if (i < this.ff) { rect(x, 2, 8, 9, 'rgba(0,0,0,.5)'); rect(x + 1, 5, 6, 2, '#f5b819'); } }
    for (let i = 0; i < 4; i++) {
      const bt = BOMB_TYPES[i], x = 6 + i * 78, sel = i === this.sel;
      box(x, 158, 76, 20, sel ? '#3a3a22' : '#14160e', sel ? '#ffd23a' : '#5a5440');
      ctx.fillStyle = bt.col; ctx.beginPath(); ctx.ellipse(x + 10, 168, 4, 5, 0, 0, 7); ctx.fill();
      txt((i + 1) + '', x + 18, 161, '#8a8a7a'); txt(bt.ammo ? 'BIG x' + this.bigAmmo : bt.name.split(' ').pop(), x + 26, 166, sel ? '#ffd23a' : '#d8d0b0', 'left', 6);
      if (this.cd[i] > 0) { ctx.globalAlpha = 0.6; rect(x + 2, 160, 72 * this.cd[i] / bt.cd, 16, '#000'); ctx.globalAlpha = 1; }
    }
  }
}
