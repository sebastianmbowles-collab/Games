// ================= MODE 3 (story chapter 5): TANKING — first person =================
function makeTankFront(body, big) {
  const w = big ? 52 : 40, h = big ? 34 : 26;
  const [c, x] = mk(w, h);
  const d = shade(body, 0.6), l = shade(body, 1.25);
  x.fillStyle = '#141410'; x.fillRect(0, h * 0.45, w * 0.22, h * 0.55); x.fillRect(w * 0.78, h * 0.45, w * 0.22, h * 0.55);
  x.fillStyle = '#3a3a34'; for (let y = h * 0.5; y < h; y += 3) { x.fillRect(1, y, w * 0.2, 1); x.fillRect(w * 0.79, y, w * 0.2, 1); }
  x.fillStyle = body; x.fillRect(w * 0.18, h * 0.4, w * 0.64, h * 0.5); x.fillStyle = l; x.fillRect(w * 0.18, h * 0.4, w * 0.64, 2);
  x.fillStyle = d; x.fillRect(w * 0.3, h * 0.12, w * 0.4, h * 0.32); x.fillStyle = body; x.fillRect(w * 0.32, h * 0.1, w * 0.36, h * 0.3);
  x.fillStyle = '#0a0a08'; x.beginPath(); x.arc(w / 2, h * 0.3, h * 0.1, 0, 7); x.fill();
  x.fillStyle = '#6f8a2a'; x.beginPath(); x.ellipse(w / 2, h * 0.65, 4, 5, 0, 0, 7); x.fill(); x.fillStyle = '#111'; x.fillRect(w / 2 - 2, h * 0.62, 1, 1); x.fillRect(w / 2 + 1, h * 0.62, 1, 1);
  if (big) { x.fillStyle = '#222'; x.fillRect(w * 0.72, 0, 1, h * 0.2); x.fillStyle = '#6f8a2a'; x.fillRect(w * 0.73, 0, 9, 6); x.fillStyle = 'rgba(120,200,60,.7)'; for (let i = 0; i < 4; i++) x.fillRect(w * 0.25 + i * 7, h * 0.02 + (i % 2) * 2, 1, 4); }
  return c;
}
SPR.etank = makeTankFront('#4a5238');
SPR.stinker = makeTankFront('#5f7a24', true);
SPR.wreck = (() => { const [c, x] = mk(40, 20); x.fillStyle = '#1a1814'; x.fillRect(2, 8, 36, 12); x.fillRect(12, 2, 16, 8); x.fillStyle = '#2a2420'; for (let i = 0; i < 20; i++) x.fillRect(R() * 38, 6 + R() * 13, 2, 1); return c; })();
SPR.bunker = (() => { const [c, x] = mk(48, 30); x.fillStyle = '#3a4030'; x.beginPath(); x.ellipse(24, 30, 24, 24, 0, Math.PI, 0); x.fill(); x.fillStyle = '#4e5640'; x.beginPath(); x.ellipse(24, 30, 21, 21, 0, Math.PI, 0); x.fill(); x.fillStyle = '#0a0a08'; x.fillRect(10, 18, 28, 4); x.fillStyle = '#6f8a2a'; x.beginPath(); x.ellipse(24, 11, 4, 5, 0, 0, 7); x.fill(); x.fillStyle = '#111'; x.fillRect(22, 10, 1, 1); x.fillRect(25, 10, 1, 1); x.fillStyle = '#b59a62'; for (let i = 0; i < 48; i += 6) x.fillRect(i, 26, 5, 4); return c; })();
SPR.tree = (() => { const [c, x] = mk(20, 34); x.fillStyle = '#2a2018'; x.fillRect(9, 6, 3, 28); x.fillRect(4, 10, 6, 2); x.fillRect(11, 14, 6, 2); x.fillRect(3, 8, 2, 3); x.fillRect(16, 11, 2, 4); x.fillRect(7, 3, 2, 5); return c; })();
SPR.wire = (() => { const [c, x] = mk(32, 10); x.strokeStyle = '#6a6a60'; x.lineWidth = 1; for (let i = 0; i < 32; i += 4) { x.beginPath(); x.arc(i + 2, 5, 3, 0, 7); x.stroke(); } x.fillStyle = '#3a2a1a'; x.fillRect(0, 2, 1, 8); x.fillRect(31, 2, 1, 8); return c; })();
SPR.shot = (() => { const [c, x] = mk(8, 8); x.fillStyle = '#ffd040'; x.beginPath(); x.arc(4, 4, 3, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(3, 3, 2, 2); return c; })();
SPR.eshot = (() => { const [c, x] = mk(8, 8); x.fillStyle = '#ff4a2a'; x.beginPath(); x.arc(4, 4, 3, 0, 7); x.fill(); x.fillStyle = '#ffd0a0'; x.fillRect(3, 3, 2, 2); return c; })();
SPR.golden = makeEgg({ shell: '#f0c030', w: 16, h: 20, glow: true, eyes: 'none', mouth: 'none', seed: 4 });

class TankingMode {
  constructor(cb) { this.cb = cb; this.pausable = true; this.touch = { pad: true, a: 'FIRE', pause: true }; this.reset(); }
  reset() {
    const N = 40, t = new Uint8Array(N * N);
    srand(77);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x === 0 || y === 0 || x === N - 1 || y === N - 1) t[y * N + x] = 11;
    // ruins scattered across the battlefield
    for (let i = 0; i < 34; i++) { const cx = 3 + (rnd() * (N - 6)) | 0, cy = 3 + (rnd() * (N - 6)) | 0, len = 1 + (rnd() * 4 | 0), hz = rnd() < 0.5; for (let k = 0; k < len; k++) { const x = hz ? cx + k : cx, y = hz ? cy : cy + k; if (x < N - 1 && y < N - 1) t[y * N + x] = pick([3, 3, 2, 1]); } }
    // the Rotten Fortress (bottom-right corner), door on the west side
    for (let y = 31; y <= 38; y++) for (let x = 31; x <= 38; x++) { t[y * N + x] = 0; if (x === 31 || y === 31) t[y * N + x] = 10; }
    t[35 * N + 31] = 0; t[34 * N + 31] = 0;
    const clear = (cx, cy, r) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x > 0 && y > 0 && x < N - 1 && y < N - 1 && !(x >= 31 && y >= 31)) t[y * N + x] = 0; };
    clear(3, 3, 3); clear(29, 35, 2);
    this.map = { w: N, h: N, t };
    this.ents = [];
    const add = e => { e.cool = rr(1, 3); this.ents.push(e); return e; };
    const bases = [[10, 30], [20, 8], [32, 14], [14, 18], [24, 25]];
    bases.forEach(([bx, by], i) => {
      clear(bx, by, 2);
      const home = { x: bx + 0.5, y: by + 0.5 };
      add({ type: 'base', x: bx + 0.5, y: by + 0.5, hp: 5, r: 0.9, img: SPR.bunker, w: 1.8, h: 1.1, spawn: rr(5, 10), home });
      for (let k = 0; k < 4; k++) add({ type: 'soldier', x: bx + rr(-2, 2) + 0.5, y: by + rr(-2, 2) + 0.5, hp: 1, r: 0.3, img: enemySprites[(i * 4 + k) % 16], home, a: rr(0, 7), bob: rr(0, 6), throwT: rr(2, 5) });
    });
    const tanks = [[16, 12], [8, 22], [28, 6], [22, 32], [34, 24], [27, 18]];
    tanks.forEach(([x, y]) => { clear(x, y, 1); add({ type: 'tank', x: x + 0.5, y: y + 0.5, hp: 3, r: 0.55, img: SPR.etank, w: 1.2, h: 0.8, a: rr(0, 7) }); });
    this.deco = [];
    for (let i = 0; i < 40; i++) { const x = rr(2, N - 2), y = rr(2, N - 2); if (!Ray.solid(this.map, x, y) && !(x > 30 && y > 30) && dist(x, y, 3, 3) > 3) this.deco.push({ x, y, img: R() < 0.6 ? SPR.tree : SPR.wire, w: R() < 0.6 ? 0.7 : 1.2, h: 0.9 }); }
    this.deco.forEach(d => { if (d.img === SPR.wire) { d.w = 1.2; d.h = 0.35; } else { d.w = 0.6; d.h = 1.1; } });
    this.decals = []; for (let i = 0; i < 40; i++) this.decals.push({ x: rr(2, N - 2), y: rr(2, N - 2), r: rr(0.4, 1), fill: 'rgba(20,14,8,.5)' });
    this.p = { x: 3.5, y: 3.5, a: 0.75, z: 0.55 };
    this.dmg = { treads: false, cannon: false, hull: false };
    this.plates = Math.min(5, save.sup.parts);
    this.shots = []; this.eshots = []; this.booms = []; this.goo = []; this.fires = [];
    this.cool = 0; this.recoil = 0; this.t = 0; this.dead = 0; this.done = false; this.stinker = null; this.golden = null; this.speed = 0;
  }
  enter() { Snd.play('tanking'); this.engine = Snd.tankEngine(); FX.banner('DESTROY 5 ENEMY BASES', '#ffd23a'); }
  exit() { if (this.engine) this.engine.stop(); }
  restart() { this.exit(); this.reset(); this.enter(); }
  basesLeft() { return this.ents.filter(e => e.type === 'base' && !e.dead).length; }
  blockedAt(x, y, self, r) {
    if (Ray.solid(this.map, x - r * 0.7, y - r * 0.7) || Ray.solid(this.map, x + r * 0.7, y - r * 0.7) || Ray.solid(this.map, x - r * 0.7, y + r * 0.7) || Ray.solid(this.map, x + r * 0.7, y + r * 0.7)) return true;
    for (const e of this.ents) if (!e.dead && e !== self && e.type !== 'soldier' && dist(e.x, e.y, x, y) < e.r + r) return true;
    if (self && dist(this.p.x, this.p.y, x, y) < 0.45 + r) return true;
    return false;
  }
  explode(x, y, big, direct) {
    const s = spatial(this.p, x, y, 24);
    Snd.explosion(big ? 1.4 : 0.9, s.vol, s.pan);
    this.booms.push({ x, y, t: 0, s: big ? 2.6 : 1.8 });
    this.decals.push({ x, y, r: 0.6, fill: 'rgba(12,8,4,.75)' });
    FX.shake(clamp(5 - s.d * 0.5, 0.5, 5), 0.3);
    for (const e of this.ents) {
      if (e.dead) continue;
      const d = dist(e.x, e.y, x, y);
      if (d > 0.9 + e.r) continue;
      if (e.type === 'golden') continue;
      e.hp -= e === direct ? 2 : 1;
      if (e.hp > 0) { if (e.type !== 'soldier') { const s2 = spatial(this.p, e.x, e.y, 20); Snd.metalHit(s2.vol * 0.6); } continue; }
      e.dead = true;
      const s2 = spatial(this.p, e.x, e.y, 20);
      if (e.type === 'soldier') { Snd.splat(s2.vol, s2.pan); this.decals.push({ x: e.x, y: e.y, r: 0.4, img: pickR(SPLATS) }); }
      else if (e.type === 'tank' || e.type === 'stinker') {
        Snd.explosion(1.5, s2.vol, s2.pan); FX.flash('#ffb060', 0.3); this.fires.push({ x: e.x, y: e.y, wreck: true });
        if (e.type === 'stinker') { FX.banner('THE STINKER IS DONE FOR!', '#7dff6a', 3); this.golden = { type: 'golden', x: 35.5, y: 35.5, r: 0.4 }; Snd.fanfare(); }
      } else if (e.type === 'base') {
        Snd.explosion(2, s2.vol, s2.pan); FX.shake(7, 0.6); this.fires.push({ x: e.x, y: e.y });
        const left = this.basesLeft();
        FX.banner(left ? 'BASE DESTROYED! ' + left + ' LEFT' : 'ALL BASES DOWN!', '#7dff6a');
        if (!left) this.spawnStinker();
      }
    }
  }
  spawnStinker() {
    this.stinker = { type: 'stinker', x: 32.5, y: 34.5, hp: 12, r: 0.75, img: SPR.stinker, w: 1.7, h: 1.1, a: Math.PI, cool: 3 };
    this.ents.push(this.stinker);
    setTimeout(() => { Snd.radio(); FX.banner('THE STINKER IS COMING OUT!', '#ff5a4a', 3); Voice.play('c5_4'); }, 1500);
  }
  hitPlayer() {
    Snd.metalHit(1); FX.shake(7, 0.5); FX.flash('#ff6040', 0.5);
    if (this.plates > 0) { this.plates--; save.sup.parts = Math.max(0, save.sup.parts - 1); writeSave(); FX.banner('ARMOR PLATE LOST!', '#ffd23a'); return; }
    if (!this.dmg.treads) { this.dmg.treads = true; FX.banner('TREADS BROKEN! SLOWER!', '#ff5a4a'); Snd.rattle(); }
    else if (!this.dmg.cannon) { this.dmg.cannon = true; FX.banner('CANNON DAMAGED!', '#ff5a4a'); }
    else if (!this.dmg.hull) { this.dmg.hull = true; FX.banner('HULL CRACKED! ONE MORE HIT...', '#ff2a1a', 3); }
    else { this.dead = 0.001; Snd.explosion(2, 1, 0); FX.flash('#ffd080', 1); }
  }
  update(dt) {
    const p = this.p, m = this.map;
    this.t += dt; this.recoil = Math.max(0, this.recoil - dt * 3);
    this.updProjectiles(dt);
    this.booms.forEach(b => b.t += dt); this.booms = this.booms.filter(b => b.t < 0.8);
    this.goo.forEach(g => g.t -= dt); this.goo = this.goo.filter(g => g.t > 0);
    if (this.dead) {
      this.dead += dt; if (this.engine) this.engine.set(0, 0);
      if (this.dead > 2.5 && !this.done) { this.done = true; this.cb.lose({ title: 'TANK DESTROYED!', lines: ['Your tank fell to pieces.', 'Keep moving so shells miss you.', 'Build TREADS for armor plates!'] }); }
      return;
    }
    // drive
    const maxSp = this.dmg.treads ? 1.1 : 2.3, turn = this.dmg.treads ? 0.95 : 1.7;
    if (In.down('left')) p.a -= turn * dt; if (In.down('right')) p.a += turn * dt;
    let target = 0; if (In.down('up')) target = maxSp; if (In.down('down')) target = -maxSp * 0.6;
    this.speed = lerp(this.speed, target, Math.min(1, dt * 3));
    const nx = p.x + Math.cos(p.a) * this.speed * dt, ny = p.y + Math.sin(p.a) * this.speed * dt;
    if (!this.blockedAt(nx, p.y, null, 0.4)) p.x = nx; else this.speed *= 0.5;
    if (!this.blockedAt(p.x, ny, null, 0.4)) p.y = ny; else this.speed *= 0.5;
    if (this.engine) { const s = Math.abs(this.speed) / 2.3 + (In.down('left') || In.down('right') ? 0.25 : 0); this.engine.set(0.9, Math.min(1, s), this.dmg.treads); this.engine.tick(dt, Math.min(1, s), this.dmg.treads); }
    // fire!
    this.cool -= dt;
    if (In.down('a') && this.cool <= 0) {
      this.cool = this.dmg.cannon ? 2.6 : 1.1; this.recoil = 1;
      const spread = this.dmg.cannon ? rr(-0.07, 0.07) : 0, a = p.a + spread;
      this.shots.push({ x: p.x + Math.cos(a) * 0.6, y: p.y + Math.sin(a) * 0.6, a, t: 0 });
      Snd.cannon(1, 0); FX.shake(3, 0.2);
    }
    // golden egg
    if (this.golden && dist(p.x, p.y, this.golden.x, this.golden.y) < 0.9 && !this.done) {
      this.done = true; Snd.fanfare();
      const k = this.ents.filter(e => e.dead && e.type !== 'base').length;
      this.cb.win({ lines: ['YOU GOT THE GOLDEN EGG!', 'ENEMIES STOPPED: ' + k, 'TANK DAMAGE: ' + ['treads', 'cannon', 'hull'].filter(q => this.dmg[q]).length + ' / 3 PARTS'] });
      return;
    }
    // enemies think
    for (const e of this.ents) {
      if (e.dead) continue;
      const d = dist(e.x, e.y, p.x, p.y);
      if (e.type === 'soldier') {
        e.bob += dt * 10;
        let goal;
        if (d < 2.5) goal = Math.atan2(e.y - p.y, e.x - p.x); // run away from the tank!
        else { if (!e.wt || e.wt < 0) { e.wt = rr(1, 3); e.ga = rr(0, 7); } e.wt -= dt; goal = dist(e.x, e.y, e.home.x, e.home.y) > 3 ? Math.atan2(e.home.y - e.y, e.home.x - e.x) : e.ga; }
        const sp = d < 2.5 ? 2.2 : 0.8, ex = e.x + Math.cos(goal) * sp * dt, ey = e.y + Math.sin(goal) * sp * dt;
        if (!Ray.solid(m, ex, ey)) { e.x = ex; e.y = ey; }
        e.throwT -= dt;
        if (d < 5 && d > 1.5 && e.throwT <= 0 && Ray.los(m, e.x, e.y, p.x, p.y)) { e.throwT = rr(3, 6); const sp2 = spatial(p, e.x, e.y); Snd.whoosh(sp2.vol * 0.4); setTimeout(() => { if (!this.dead) { this.goo.push({ x: rr(40, W - 40), y: rr(20, 110), r: rr(14, 26), t: 2.5 }); Snd.splat(0.5, 0); } }, 450); }
      } else if (e.type === 'tank' || e.type === 'stinker') {
        const big = e.type === 'stinker';
        const sees = d < (big ? 20 : 11) && Ray.los(m, e.x, e.y, p.x, p.y);
        if (sees) {
          const want = Math.atan2(p.y - e.y, p.x - e.x), diff = angDiff(e.a, want);
          e.a += clamp(diff, -1.2 * dt, 1.2 * dt);
          const sp = d > (big ? 3 : 5) ? (big ? 1.2 : 1.3) : d < 3 ? -0.8 : 0;
          const ex = e.x + Math.cos(e.a) * sp * dt, ey = e.y + Math.sin(e.a) * sp * dt;
          if (!this.blockedAt(ex, ey, e, e.r)) { e.x = ex; e.y = ey; }
          e.cool -= dt;
          if (e.cool <= 0 && Math.abs(diff) < 0.3) {
            e.cool = big ? rr(1.3, 2) : rr(2.8, 4.2);
            const fa = e.a + rr(-0.05, 0.05);
            this.eshots.push({ x: e.x + Math.cos(fa) * 0.7, y: e.y + Math.sin(fa) * 0.7, a: fa, t: 0 });
            if (big) setTimeout(() => this.eshots.push({ x: e.x + Math.cos(fa + 0.08) * 0.7, y: e.y + Math.sin(fa + 0.08) * 0.7, a: fa + 0.06, t: 0 }), 200);
            const s = spatial(p, e.x, e.y, 24); Snd.cannon(s.vol * 0.7, s.pan);
          }
        }
      } else if (e.type === 'base') {
        e.spawn -= dt;
        if (e.spawn <= 0) { e.spawn = rr(10, 14); if (d < 14 && this.ents.filter(s => s.type === 'soldier' && !s.dead && s.home === e.home).length < 4) { const s = { type: 'soldier', x: e.x + rr(-1, 1), y: e.y + 1, hp: 1, r: 0.3, img: pickR(enemySprites), home: e.home, a: 0, bob: 0, throwT: rr(2, 5), cool: 0 }; this.ents.push(s); } }
      }
    }
  }
  updProjectiles(dt) {
    const p = this.p, m = this.map;
    for (const s of this.shots) {
      for (let k = 0; k < 4 && !s.dead; k++) {
        const st = 11 * dt / 4; s.x += Math.cos(s.a) * st; s.y += Math.sin(s.a) * st; s.t += dt / 4;
        if (Ray.solid(m, s.x, s.y)) { s.dead = true; this.explode(s.x - Math.cos(s.a) * 0.2, s.y - Math.sin(s.a) * 0.2, false, null); break; }
        for (const e of this.ents) if (!e.dead && dist(e.x, e.y, s.x, s.y) < e.r + 0.1) { s.dead = true; this.explode(s.x, s.y, e.type === 'base', e); break; }
      }
      if (s.t > 2.5) s.dead = true;
    }
    this.shots = this.shots.filter(s => !s.dead);
    for (const s of this.eshots) {
      const st = 5.5 * dt; s.x += Math.cos(s.a) * st; s.y += Math.sin(s.a) * st; s.t += dt;
      if (Ray.solid(m, s.x, s.y)) { s.dead = true; this.explode(s.x, s.y, false, null); continue; }
      if (!this.dead && dist(s.x, s.y, p.x, p.y) < 0.45) { s.dead = true; this.explode(s.x, s.y, false, null); this.hitPlayer(); }
      if (s.t > 4) s.dead = true;
    }
    this.eshots = this.eshots.filter(s => !s.dead);
  }
  draw() {
    const p = this.p;
    const sprites = [];
    for (const d of this.deco) sprites.push(d);
    for (const e of this.ents) {
      if (e.dead) continue;
      if (e.type === 'soldier') sprites.push(eggBillboard(e.img, e.x, e.y, { z: Math.abs(Math.sin(e.bob)) * 0.05 }));
      else sprites.push({ x: e.x, y: e.y, img: e.img, w: e.w, h: e.h });
    }
    for (const f of this.fires) { if (f.wreck) sprites.push({ x: f.x, y: f.y, img: SPR.wreck, w: 1.2, h: 0.55 }); sprites.push({ x: f.x, y: f.y, img: SPR.fire[((this.t * 8) | 0) % 4], w: 0.7, h: 0.9, z: 0.2 }); }
    if (this.golden) sprites.push({ x: this.golden.x, y: this.golden.y, img: SPR.golden, w: 0.6, h: 0.75, z: 0.15 + Math.sin(this.t * 3) * 0.05 });
    for (const s of this.shots) sprites.push({ x: s.x, y: s.y, img: SPR.shot, w: 0.18, h: 0.18, z: 0.42 });
    for (const s of this.eshots) sprites.push({ x: s.x, y: s.y, img: SPR.eshot, w: 0.22, h: 0.22, z: 0.42 });
    for (const b of this.booms) sprites.push({ x: b.x, y: b.y, img: BOOM[Math.min(9, (b.t / 0.8 * 10) | 0)], w: b.s, h: b.s, z: -0.2 });
    Ray.render({ x: p.x, y: p.y, a: p.a, z: 0.55, pitch: this.recoil * -4 }, this.map, sprites, { decals: this.decals, skyImg: SKY.storm, floor: FLOOR.mud, fog: '62,60,40', fogDist: 17 });
    // rotten egg goo on the periscope
    for (const g of this.goo) { ctx.globalAlpha = Math.min(1, g.t); ctx.fillStyle = '#7d8f3a'; ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r, g.r * 0.8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#a0b048'; ctx.beginPath(); ctx.ellipse(g.x - 3, g.y - 3, g.r * 0.4, g.r * 0.3, 0, 0, 7); ctx.fill(); rect(g.x - 2, g.y + g.r * 0.6, 3, (2.5 - g.t) * 14, '#7d8f3a'); }
    ctx.globalAlpha = 1;
    // inside the tank: hull, barrel, crosshair
    const rc = this.recoil * 6;
    ctx.fillStyle = '#2a3018'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 26); ctx.lineTo(70, H - 34); ctx.lineTo(W - 70, H - 34); ctx.lineTo(W, H - 26); ctx.lineTo(W, H); ctx.fill();
    rect(70, H - 34, W - 140, 2, '#4a5428');
    ctx.fillStyle = '#1e2410'; ctx.beginPath(); ctx.moveTo(W / 2 - 14, H); ctx.lineTo(W / 2 - 6, H - 52 + rc); ctx.lineTo(W / 2 + 6, H - 52 + rc); ctx.lineTo(W / 2 + 14, H); ctx.fill();
    rect(W / 2 - 6, H - 54 + rc, 12, 4, '#3a4420');
    if (this.recoil > 0.7) { ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(W / 2, H - 60, 8 * this.recoil, 0, 7); ctx.fill(); }
    ctx.strokeStyle = this.cool <= 0 ? '#7dff6a' : '#ff5a4a'; ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 8.5, H / 2 - 8.5, 17, 17); rect(W / 2, H / 2 - 14, 1, 6, ctx.strokeStyle); rect(W / 2, H / 2 + 8, 1, 6, ctx.strokeStyle);
    // tank damage card
    box(4, H - 50, 62, 46, '#14160e', '#6a6450');
    txt('TANK', 8, H - 46, '#c8b77a', 'left', 6);
    const part = (lbl, broken, y) => { rect(8, y, 6, 6, broken ? '#e22' : '#4c4'); txt(lbl, 18, y, broken ? '#ff6a5a' : '#d8d0b0', 'left', 6); };
    part('TREADS', this.dmg.treads, H - 37); part('CANNON', this.dmg.cannon, H - 28); part('HULL', this.dmg.hull, H - 19);
    txt('PLATES ' + this.plates, 8, H - 10, '#ffd23a', 'left', 6);
    // radar
    const RX = W - 30, RY = 30, RR = 24;
    ctx.fillStyle = 'rgba(0,30,0,.75)'; ctx.beginPath(); ctx.arc(RX, RY, RR, 0, 7); ctx.fill(); ctx.strokeStyle = '#3a8a3a'; ctx.beginPath(); ctx.arc(RX, RY, RR, 0, 7); ctx.stroke();
    const sw = (this.t * 2) % (Math.PI * 2); ctx.strokeStyle = 'rgba(120,255,120,.4)'; ctx.beginPath(); ctx.moveTo(RX, RY); ctx.lineTo(RX + Math.cos(sw) * RR, RY + Math.sin(sw) * RR); ctx.stroke();
    const blip = (x, y, c, s) => { const dx = x - p.x, dy = y - p.y, a = Math.atan2(dy, dx) - p.a - Math.PI / 2, d = Math.min(RR - 2, Math.hypot(dx, dy) * 1.2); rect(RX + Math.cos(a) * d - s / 2, RY + Math.sin(a) * d - s / 2, s, s, c); };
    for (const e of this.ents) if (!e.dead) { if (e.type === 'base') blip(e.x, e.y, '#ff4a3a', 4); else if (e.type === 'tank') blip(e.x, e.y, '#ff9a3a', 3); else if (e.type === 'stinker') blip(e.x, e.y, (this.t * 4) % 1 < 0.5 ? '#ff2a1a' : '#fff', 5); }
    if (this.golden) blip(this.golden.x, this.golden.y, '#ffd23a', 5);
    rect(RX - 1, RY - 1, 3, 3, '#7dff6a');
    txt(this.golden ? 'GRAB THE GOLDEN EGG!' : this.stinker && !this.stinker.dead ? 'DESTROY THE STINKER' : 'BASES LEFT ' + this.basesLeft(), 6, 6, '#ffd23a');
    if (this.stinker && !this.stinker.dead) bar(6, 16, 100, 6, this.stinker.hp / 12, '#7d8f3a');
    if (this.dead) { ctx.globalAlpha = Math.min(0.85, this.dead); rect(0, 0, W, H, '#1a0a04'); ctx.globalAlpha = 1; txt('KA-BOOM!', W / 2, H / 2 - 8, '#ff6a3a', 'center', 16); }
  }
}
