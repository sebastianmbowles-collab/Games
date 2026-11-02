// ================= MODE 5 (story chapter 2): BUILDING — third person =================
const PART = (() => {
  const P = {};
  const icon = (name, fn) => { const [c, x] = mk(28, 22); srand(name.length * 31); fn(x); P[name] = c; };
  icon('casing', x => { x.fillStyle = '#5a5648'; x.beginPath(); x.ellipse(14, 11, 12, 8, 0, 0, 7); x.fill(); x.fillStyle = '#e8e4d8'; x.beginPath(); x.ellipse(14, 11, 11, 7, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(8, 6, 8, 2); x.fillStyle = '#a8322c'; x.fillRect(12, 4, 3, 14); });
  icon('fin', x => { x.fillStyle = '#7c8a90'; x.beginPath(); x.moveTo(26, 11); x.lineTo(4, 1); x.lineTo(8, 11); x.lineTo(4, 21); x.closePath(); x.fill(); x.fillStyle = '#4a5458'; x.fillRect(8, 10, 18, 2); });
  icon('fuse', x => { x.fillStyle = '#c8a040'; x.fillRect(4, 6, 14, 10); x.fillStyle = '#e8c860'; x.fillRect(4, 6, 14, 2); x.fillStyle = '#d22'; x.beginPath(); x.arc(21, 11, 4, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(20, 9, 1, 1); });
  icon('powder', x => { x.fillStyle = '#d8b030'; x.beginPath(); x.ellipse(14, 13, 11, 8, 0, 0, 7); x.fill(); x.fillStyle = '#a8801a'; x.fillRect(11, 3, 6, 4); x.fillStyle = '#7a4a10'; x.font = '6px monospace'; x.fillText('YOLK', 6, 15); });
  icon('track', x => { x.fillStyle = '#2a2a2a'; x.fillRect(1, 6, 26, 10); x.fillStyle = '#555'; for (let i = 2; i < 26; i += 4) x.fillRect(i, 7, 2, 8); });
  icon('wheel', x => { x.fillStyle = '#222'; x.beginPath(); x.arc(14, 11, 10, 0, 7); x.fill(); x.fillStyle = '#6a6a6a'; x.beginPath(); x.arc(14, 11, 5, 0, 7); x.fill(); x.fillStyle = '#aaa'; x.fillRect(13, 10, 2, 2); });
  icon('gear', x => { x.fillStyle = '#8a7a50'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.fillRect(14 + Math.cos(a) * 9 - 2, 11 + Math.sin(a) * 9 - 2, 4, 4); } x.beginPath(); x.arc(14, 11, 8, 0, 7); x.fill(); x.fillStyle = '#3a3220'; x.beginPath(); x.arc(14, 11, 3, 0, 7); x.fill(); });
  icon('bolt', x => { x.fillStyle = '#9aa8ae'; x.fillRect(10, 2, 8, 6); x.fillStyle = '#6a7880'; x.fillRect(12, 8, 4, 12); x.fillStyle = '#4a5458'; for (let y = 9; y < 20; y += 2) x.fillRect(12, y, 4, 1); });
  icon('sack', x => { x.fillStyle = '#b59a62'; x.beginPath(); x.ellipse(14, 13, 12, 8, 0, 0, 7); x.fill(); x.fillStyle = '#8a7444'; x.fillRect(4, 12, 20, 1); x.fillStyle = '#a88d58'; x.fillRect(11, 2, 6, 5); });
  icon('sand', x => { x.fillStyle = '#7a6a4a'; x.fillRect(2, 14, 24, 6); x.fillStyle = '#e0c890'; x.beginPath(); x.moveTo(3, 15); x.lineTo(14, 3); x.lineTo(25, 15); x.fill(); x.fillStyle = '#c8b070'; for (let i = 0; i < 10; i++) x.fillRect(6 + rnd() * 16, 8 + rnd() * 6, 1, 1); });
  icon('rope', x => { x.strokeStyle = '#c8a870'; x.lineWidth = 2; for (let r = 3; r < 10; r += 3) { x.beginPath(); x.arc(14, 11, r, 0, 7); x.stroke(); } x.beginPath(); x.moveTo(23, 11); x.lineTo(27, 18); x.stroke(); });
  icon('box', x => { x.fillStyle = '#8a5a2e'; x.fillRect(2, 4, 24, 16); x.fillStyle = '#6a4220'; x.fillRect(2, 4, 24, 2); x.fillRect(2, 11, 24, 1); x.fillRect(13, 4, 2, 16); });
  icon('bandage', x => { x.fillStyle = '#f4f4ec'; x.beginPath(); x.ellipse(11, 11, 8, 8, 0, 0, 7); x.fill(); x.fillStyle = '#ccc'; x.beginPath(); x.arc(11, 11, 3, 0, 7); x.fill(); x.fillStyle = '#f4f4ec'; x.fillRect(16, 12, 10, 6); });
  icon('bread', x => { x.fillStyle = '#c88a3a'; x.beginPath(); x.ellipse(14, 12, 12, 7, 0, 0, 7); x.fill(); x.fillStyle = '#a86a20'; [8, 13, 18].forEach(i => x.fillRect(i, 7, 2, 6)); });
  icon('cross', x => { x.fillStyle = '#fff'; x.fillRect(4, 1, 20, 20); x.fillStyle = '#c22'; x.fillRect(11, 4, 6, 14); x.fillRect(7, 8, 14, 6); });
  return P;
})();
const RECIPES = {
  bomb: { name: 'EGGSHELL BOMB', slots: [['fin', -36, 0], ['casing', 0, 0], ['fuse', 36, 0], ['powder', 0, -30]] },
  tread: { name: 'TANK TREAD', slots: [['track', 0, -26], ['wheel', -32, 6], ['gear', 32, 6], ['bolt', 0, 6]] },
  sandbag: { name: 'SANDBAG', slots: [['sack', 0, 6], ['sand', 0, -24], ['rope', 36, 6]] },
  kit: { name: 'FOOD & MEDICINE', slots: [['box', 0, 10], ['bandage', -36, -16], ['bread', 36, -16], ['cross', 0, -20]] },
};
const ALL_PARTS = Object.keys(PART);

class BuildingMode {
  constructor(cb) { this.cb = cb; this.pausable = true; this.touch = { pause: true }; this.reset(); }
  reset() {
    this.queue = ['bomb', 'tread', 'sandbag', 'kit', 'bomb', 'sandbag', 'tread', 'kit', 'bomb', 'sandbag'];
    this.made = { bomb: 0, tread: 0, sandbag: 0, kit: 0 };
    this.time = 80; this.t = 0; this.sel = 0; this.drag = null; this.hammer = 0; this.fly = []; this.msg = []; this.mistakes = 0; this.over = false;
    this.parts = new Parts();
    this.newItem();
  }
  enter() { Snd.play('building'); }
  exit() { }
  restart() { this.reset(); this.enter(); }
  newItem() {
    this.item = this.queue[0];
    const r = RECIPES[this.item];
    this.placed = r.slots.map(() => false);
    const need = r.slots.map(s => s[0]);
    const decoys = ALL_PARTS.filter(p => !need.includes(p)).sort(() => R() - 0.5).slice(0, 6 - need.length);
    this.bin = need.concat(decoys).sort(() => R() - 0.5).map(p => ({ p, used: false }));
    this.sel = 0;
  }
  binRect(i) { return [240 + (i % 2) * 38, 30 + Math.floor(i / 2) * 38, 36, 36]; }
  slotPos(i) { const s = RECIPES[this.item].slots[i]; return [157 + s[1], 92 + s[2]]; }
  mistake() { this.time = Math.max(0, this.time - 2); this.mistakes++; Snd.buzz(); FX.shake(2, 0.2); this.msg.push({ text: '-2s WRONG PART!', t: 1.2, col: '#ff5a4a' }); }
  place(bi, si) {
    const b = this.bin[bi]; b.used = true; this.placed[si] = true; Snd.snap();
    const [x, y] = this.slotPos(si); this.parts.burst(x, y, 10, ['#ffd23a', '#fff', '#7dff6a'], 50, 0.5);
    if (this.placed.every(v => v)) { this.hammer = 0.8; Snd.hammer(); }
  }
  autoPlace(bi) {
    const b = this.bin[bi]; if (!b || b.used || this.hammer > 0) return;
    const slots = RECIPES[this.item].slots;
    const si = slots.findIndex((s, i) => s[0] === b.p && !this.placed[i]);
    if (si < 0) this.mistake(); else this.place(bi, si);
  }
  finishItem() {
    this.made[this.item]++; this.queue.shift();
    this.fly.push({ k: this.item, t: 0 });
    Snd.confirm();
    this.msg.push({ text: RECIPES[this.item].name + ' BUILT!', t: 1.2, col: '#7dff6a' });
    if (!this.queue.length) this.end(true); else this.newItem();
  }
  end(ok) {
    if (this.over) return; this.over = true;
    const m = this.made;
    save.sup.bombs += m.bomb; save.sup.parts += m.tread; save.sup.bags += m.sandbag; save.sup.meds += m.kit; writeSave();
    const lines = ['BOMBS ' + m.bomb + '   TREADS ' + m.tread, 'SANDBAGS ' + m.sandbag + '   MED KITS ' + m.kit, 'All sent to the front line!'];
    if (ok) this.cb.win({ lines: ['Every order filled with ' + this.time.toFixed(0) + 's left!'].concat(lines) });
    else this.cb.timeUp({ lines });
  }
  update(dt) {
    this.t += dt; this.parts.update(dt);
    this.msg.forEach(m => m.t -= dt); this.msg = this.msg.filter(m => m.t > 0);
    this.fly.forEach(f => f.t += dt); this.fly = this.fly.filter(f => f.t < 0.8);
    if (this.over) return;
    if (this.hammer > 0) { this.hammer -= dt; if (this.hammer <= 0) this.finishItem(); return; }
    this.time -= dt;
    if (this.time <= 0) { this.time = 0; this.end(false); return; }
    // keyboard: move selection in the parts bin
    if (In.hit('left') || In.hit('right')) { this.sel ^= 1; Snd.blip(600, 0.06); }
    if (In.hit('up')) { this.sel = (this.sel + 4) % 6; Snd.blip(600, 0.06); }
    if (In.hit('down')) { this.sel = (this.sel + 2) % 6; Snd.blip(600, 0.06); }
    if (In.ok()) this.autoPlace(this.sel);
    // mouse / finger dragging
    const P = In.ptr;
    if (P.pressed && !this.drag) {
      for (let i = 0; i < 6; i++) { const [x, y, w, h] = this.binRect(i); if (P.x >= x && P.x < x + w && P.y >= y && P.y < y + h && !this.bin[i].used) { this.drag = { i, sx: P.x, sy: P.y, moved: false }; this.sel = i; Snd.blip(800, 0.05); } }
    }
    if (this.drag) {
      if (Math.hypot(P.x - this.drag.sx, P.y - this.drag.sy) > 5) this.drag.moved = true;
      if (!P.down) {
        const d = this.drag; this.drag = null;
        if (!d.moved) this.autoPlace(d.i);
        else {
          const part = this.bin[d.i].p, slots = RECIPES[this.item].slots;
          let best = -1, bd = 24;
          slots.forEach((s, si) => { const [x, y] = this.slotPos(si); const dd = Math.hypot(P.x - x, P.y - y); if (dd < bd && !this.placed[si]) { bd = dd; best = si; } });
          if (best >= 0 && slots[best][0] === part) this.place(d.i, best);
          else if (P.x > 84 && P.x < 232 && P.y > 26 && P.y < 158) this.mistake();
        }
      }
    }
  }
  draw() {
    // factory background
    rect(0, 0, W, H, '#2a2620');
    for (let i = 0; i < 5; i++) rect(i * 70 + 6, 24, 4, 130, '#3a3428');
    // conveyor belt
    rect(0, 160, W, 20, '#1a1a1a'); for (let i = -1; i < 22; i++) rect(((i * 16 + this.t * 40) % 352) - 16, 164, 10, 3, '#4a4a4a'); rect(0, 158, W, 2, '#666');
    // top bar: orders + clock
    rect(0, 0, W, 20, '#14160e');
    txt('ORDERS', 4, 6, '#c8b77a');
    this.queue.slice(0, 10).forEach((k, i) => { const s = RECIPES[k].slots[1] || RECIPES[k].slots[0]; ctx.drawImage(PART[RECIPES[k].slots[k === 'bomb' ? 1 : 0][0]], 58 + i * 17, 3, 15, 12); if (i === 0) { ctx.strokeStyle = '#ffd23a'; ctx.strokeRect(57.5 + i * 17, 2.5, 16, 14); } });
    const tc = this.time < 15 ? ((this.t * 4) % 1 < 0.5 ? '#ff4a3a' : '#ffd23a') : '#f4ecd0';
    txt(Math.ceil(this.time) + 's', W - 4, 6, tc, 'right');
    // left: Shelly from behind at the workbench (third person) + finished crate
    rect(0, 120, 82, 40, '#4a3220'); rect(0, 120, 82, 3, '#6a4a2e');
    const back = makeEgg.shellyBack || (makeEgg.shellyBack = makeEgg(Object.assign(CAST.shelly(1), { back: true })));
    const hb = this.hammer > 0 ? Math.abs(Math.sin(this.hammer * 18)) * 4 : 0;
    ctx.drawImage(back, 18, 66, back.width * 3, back.height * 3);
    rect(60, 76 + hb * 2, 3, 18, '#6a4a2e'); rect(55, 74 + hb * 2, 13, 6, '#888');
    // crate of finished supplies
    rect(4, 132, 40, 24, '#8a5a2e'); rect(4, 132, 40, 3, '#6a4220');
    let ci = 0; for (const k in this.made) for (let n = 0; n < this.made[k]; n++) { const sl = RECIPES[k].slots; ctx.drawImage(PART[sl[k === 'bomb' ? 1 : 0][0]], 6 + (ci % 3) * 12, 124 - Math.floor(ci / 3) * 8, 12, 9); ci++; }
    // Pvt. Poach hauling boxes in the background
    const px = 40 + Math.sin(this.t * 0.6) * 30; const pp = eggSprite('poach'); ctx.drawImage(pp, px, 30 + Math.abs(Math.sin(this.t * 6)) * 2, pp.width * 1.5, pp.height * 1.5); rect(px + 2, 26, 12, 8, '#8a5a2e');
    // blueprint board
    const r = RECIPES[this.item];
    box(84, 24, 148, 134, '#183454', '#c8d8f0');
    for (let x = 90; x < 230; x += 10) rect(x, 27, 1, 128, 'rgba(160,200,255,.12)'); for (let y = 30; y < 156; y += 10) rect(87, y, 142, 1, 'rgba(160,200,255,.12)');
    txt(r.name, 158, 30, '#c8d8f0', 'center');
    txt((10 - this.queue.length + 1) + '/10', 158, 144, '#8aa8d0', 'center');
    r.slots.forEach((s, i) => {
      const [x, y] = this.slotPos(i), img = PART[s[0]];
      if (this.placed[i]) { ctx.drawImage(img, x - 14, y - 11); }
      else { ctx.globalAlpha = 0.3; ctx.drawImage(img, x - 14, y - 11); ctx.globalAlpha = 1; ctx.strokeStyle = (this.t * 2 % 1) < 0.5 ? '#c8d8f0' : '#6a88b0'; ctx.setLineDash([2, 2]); ctx.strokeRect(x - 15.5, y - 12.5, 31, 25); ctx.setLineDash([]); }
    });
    if (this.hammer > 0) { ctx.globalAlpha = Math.sin(this.hammer * 20) > 0 ? 0.5 : 0; rect(86, 26, 144, 130, '#fff'); ctx.globalAlpha = 1; txt('BANG! BANG!', 158, 120, '#ffd23a', 'center'); }
    // parts bin
    box(236, 24, 82, 134, '#2a2218', '#8a7a50');
    for (let i = 0; i < 6; i++) {
      const [x, y, w, h] = this.binRect(i), b = this.bin[i];
      rect(x, y, w, h, i === this.sel && !In.touch ? '#5a4a28' : '#3a3020');
      if (!b.used && !(this.drag && this.drag.i === i && this.drag.moved)) ctx.drawImage(PART[b.p], x + 4, y + 7);
      if (i === this.sel && !In.touch) { ctx.strokeStyle = '#ffd23a'; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
    }
    txt('PARTS', 277, 148, '#c8b77a', 'center');
    if (this.drag && this.drag.moved) ctx.drawImage(PART[this.bin[this.drag.i].p], In.ptr.x - 14, In.ptr.y - 11);
    this.fly.forEach(f => { const k = f.k, sl = RECIPES[k].slots, tt = f.t / 0.8; ctx.drawImage(PART[sl[k === 'bomb' ? 1 : 0][0]], lerp(158, 20, tt) - 14, lerp(92, 128, tt) - 11 - Math.sin(tt * Math.PI) * 40); });
    this.parts.draw();
    this.msg.forEach((m, i) => txt(m.text, 158, 54 + i * 10, m.col, 'center'));
  }
}
