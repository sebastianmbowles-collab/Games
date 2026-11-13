// ---------- systems: each rule on the paper is a real mechanism here ----------
function closeOverlays() { clearInterval(typing); typing = null; dlgNext = null; docDone = null; G.modal = 0; G.docOpen = false; $('dlg').hidden = true; $('doc').hidden = true; $('flash').hidden = true; $('cap').textContent = ''; capT = 0; }
function strike(rule, msg) {
  if (G.scene !== 'play' || G.ended) return;
  R.strikes++; if (rule && !R.broken.includes(rule)) R.broken.push(rule); G.nightStrikes++; G.shock = 1; sfx.sting();
  flash(rule ? 'RULE ' + rule + ' BROKEN' : 'YOU TOLD HIM', msg); save();
  amb({ drone: Math.min(0.12, 0.02 + 0.02 * R.strikes) }, 3);
  if (R.strikes >= LIMIT) { G.ended = true; setTimeout(() => ending('customer'), 2900); }
}
function setZoom(z) { G.zoom = z; G.hover = null; }
function stepBack() { if (G.zoom === 'cam') amb({ static: 0 }, 0.3); G.zoom = null; G.hover = null; }

// ----- customers (rule 4: the bell tells you who is real) -----
// Everyone walks door -> hub (the middle aisle) -> a shelf spot -> hub -> counter, so nobody cuts through a shelf.
const SPOT = { door: [0, -4.15], hub: [0, -1.6], a: [[-3, -1.35, 0], [3, -1.35, 0], [-2.6, -1.9, Math.PI], [2.4, -1.9, Math.PI]], counter: [0.3, 1.3] };
function enter(spec) {
  const used = G.people.map(p => p.spot), free = [0, 1, 2, 3].filter(i => !used.includes(i));
  const p = Object.assign({ id: ++G.pid, x: 0, z: -5.3, yaw: 0, st: 'browse', tm: 0, real: true, browse: rnd(3.5, 6), spot: free.length ? pick(free) : 0, alpha: 1, label: 'Customer' }, spec);
  p.items = (spec.items || []).map(it => Object.assign({}, it));
  const s = SPOT.a[p.spot];
  if (p.real) { if (!p.quiet) { sfx.bell(); G.doorSwing = 1; } p.path = [SPOT.door, SPOT.hub, s]; }
  else { p.x = s[0]; p.z = s[1]; p.yaw = s[2]; p.alpha = 0; p.fadeIn = true; p.path = []; }
  G.people.push(p); return p;
}
function leave(p) { p.st = 'leave'; p.tm = 0; p.path = [SPOT.hub, SPOT.door]; if (G.counter === p) { G.counter = null; G.total = 0; } }
function removePerson(p) { const i = G.people.indexOf(p); if (i >= 0) G.people.splice(i, 1); if (G.counter === p) { G.counter = null; G.total = 0; } }
function updatePeople(dt) {
  G.doorSwing = Math.max(0, (G.doorSwing || 0) - dt * 0.45);
  for (const p of G.people.slice()) {
    if (p.fadeIn) { p.alpha = Math.min(1, p.alpha + dt * 0.5); if (p.alpha >= 1) p.fadeIn = false; }
    if (p.fadeOut) { p.alpha -= dt * 1.3; if (p.alpha <= 0) { removePerson(p); continue; } }
    p.moving = false;
    if (p.path && p.path.length && !p.gone) {
      const t = p.path[0], dx = t[0] - p.x, dz = t[1] - p.z, d = Math.hypot(dx, dz), step = dt * 1.25;
      if (d <= step) { p.x = t[0]; p.z = t[1]; p.path = p.path.slice(1); } else { p.x += dx / d * step; p.z += dz / d * step; p.yaw = Math.atan2(dx, dz); }
      p.moving = true; continue;
    }
    p.tm += dt;
    if (p.st === 'browse') { p.yaw = SPOT.a[p.spot][2]; if (p.tm > p.browse) { if (p.toCounter === false) { if (p.tm > p.browse + (p.stay || 12)) leave(p); } else if (!G.counter) { G.counter = p; p.st = 'approach'; p.tm = 0; p.path = [SPOT.hub, SPOT.counter]; } } }
    else if (p.st === 'fixed') p.yaw = SPOT.a[p.spot][2];
    else if (p.st === 'approach') { p.st = 'counter'; p.tm = 0; p.yaw = 0; if (p.onArrive) p.onArrive(p); else if (p.greet) cap('“' + p.greet + '”'); }
    else if (p.st === 'counter') { p.yaw = Math.atan2(PL.x - p.x, PL.z - p.z); if (!p.special && !p.paid && p.tm > (p.real ? 60 : 26)) { if (p.real) { G.deduct += 5; cap('They give up waiting, and leave. (−$5 from your pay)'); } leave(p); } }
    else if (p.st === 'leave') { if (p.real && !p.quiet) { sfx.bell(); G.doorSwing = 1; if (p.wave) G.wave = { who: 'out', look: p.look, t: 11 }; removePerson(p); } else p.fadeOut = true; }
  }
}
function noticed(p) {
  if (p.gone) return; p.gone = true; strike(4, 'You noticed someone who never opened the door.');
  p.smile = true; p.yaw = Math.atan2(PL.x - p.x, PL.z - p.z); G.flick = Math.max(G.flick, 1.4); setTimeout(() => { p.fadeOut = true; }, 1300);
}
function clickPerson(p) {
  if (!p.real && !p.safe) return noticed(p);
  if (p.onClick) return p.onClick(p);
  if (p.st === 'counter') cap(p.greet ? '“' + p.greet + '”' : 'They wait.'); else cap(p.far || 'They are still browsing.');
}
function scanItem(p, it) {
  if (!p.real) return noticed(p);
  it.done = true; sfx.beep(); G.total += it.p; if (it.w) cap(it.w, 5);
}
function pay() {
  const p = G.counter;
  if (!p || p.st !== 'counter') { sfx.beep(); cap('NO SALE.'); return; }
  if (!p.real && !p.safe) return noticed(p);
  if (p.special) { cap('He has not bought anything.'); return; }
  if (p.items.some(i => !i.done)) { cap('Scan everything first.'); return; }
  sfx.print(); p.paid = true; G.receipt = { items: p.items, total: G.total, name: G.night >= 3 ? 'HALLOW' : null, t: G.t };
  if (p.items.some(i => i.water)) sellWater();
  cap(p.bye ? '“' + p.bye + '”' : 'They leave without a word.', 5); leave(p);
  if (G.night === 3) setTimeout(() => { if (G.receiptsRead === 0) cap('The till prints a receipt. It always prints the name.', 5, 'hint'); }, 5200);
}
function readReceipt() {
  const rc = G.receipt; let h = 'MORROW’S FUEL &amp; MART<br>HIGHWAY 19<br>- - - - - - - - - - - -<br>';
  rc.items.forEach(i => { h += esc(i.n) + ' &nbsp; ' + i.p.toFixed(2) + '<br>'; });
  h += '- - - - - - - - - - - -<br>TOTAL &nbsp; $' + rc.total.toFixed(2) + '<br><br>CUSTOMER: ' + (rc.name || 'CASH') + '<br>' + fmt(rc.t) + ' AM<br><br>THANK YOU.<br>COME AGAIN.<br>COME AGAIN.';
  doc(h, 'receipt');
  if (rc.name && !rc.read) { rc.read = true; G.receiptsRead++; if (G.receiptsRead >= 2) remember('receipts'); }
}

// ----- rule 7: the telephone -----
function startCall(rings, script) {
  const ph = G.phone; if (ph.call) return;
  if (!ph.plugged) { if (rings === 3) strike(7, 'The phone was unplugged when it should have rung three times.'); return; }
  ph.call = { rings, script, n: 0, t: 0 };
  hint('The phone. Count the rings. Three and then quiet: answer it. A fourth ring: pull the cord.');
}
function updatePhone(dt) {
  const ph = G.phone, c = ph.call; ph.shake = Math.max(0, ph.shake - dt); if (!c) return;
  c.t += dt; const total = c.rings === 3 ? 3 : 8;
  if (c.n < total && c.t >= c.n * 2.3) { c.n++; sfx.ring(); ph.shake = 1; }
  if (c.rings === 3 && c.t > 3 * 2.3 + 5.5) { ph.call = null; strike(7, 'It rang three times. You did not answer.'); }
  else if (c.rings !== 3 && c.t > 8 * 2.3 + 0.5) { ph.call = null; strike(7, 'It rang four times. You let it keep ringing.'); }
}
function answerPhone() {
  const ph = G.phone, c = ph.call;
  if (!ph.plugged) { cap('The line is dead. The cord is out of the wall.'); return; }
  if (!c) { sfx.hang(); cap('Dial tone.'); return; }
  ph.call = null; sfx.click();
  if (c.rings === 3) { if (c.script) c.script(); }
  else { strike(7, 'It rang four times. You answered.'); say('PHONE', 'You can hear the shop. The hum of the fridges. Your own breathing, half a second late.', true); }
}
function togglePlug() {
  const ph = G.phone; sfx.click();
  if (!ph.plugged) { ph.plugged = true; cap('Plugged back in.'); return; }
  ph.plugged = false; const c = ph.call; ph.call = null;
  if (c) { if (c.rings === 3) strike(7, 'It only rang three times. You pulled the cord.'); else cap('The ringing stops. Plug it back in before the next call.', 5); }
  else cap('You pull the cord out of the wall.');
}

// ----- rule 3: exactly twelve -----
function takeBottle(i) {
  if (!G.fridge[i]) return; sfx.tock();
  if (G.thirteen > 0) { strike(3, 'There were 13. You did not leave them alone.'); G.thirteen = 0; G.fridge = G.fridge.filter(b => !b.odd); G.fridge.splice(0, Math.max(0, G.fridge.length - 12)); while (G.fridge.length < 12) addBottle(false); return; }
  G.fridge.splice(i, 1); cap('You take one out.', 2);
}
function restock() { if (G.night === 7) { cap('The crate is empty.'); return; } if (G.fridge.length >= 17) { cap('There is no more room.'); return; } sfx.tock(); addBottle(false); }
function sellWater() {
  const oi = G.fridge.findIndex(b => b.odd);
  if (oi >= 0) { G.fridge.splice(oi, 1); G.thirteen = 0; } else if (G.fridge.length) G.fridge.splice(Math.random() * G.fridge.length | 0, 1);
  setTimeout(() => hint('They took a water from the fridge. It must hold exactly 12. Restock it from the crate.'), 4500);
}
function startThirteen() { if (G.fridge.length !== 12 || G.thirteen > 0) { G.sched.push({ t: G.t + 6, fn: startThirteen }); return; } addBottle(true); G.thirteen = 26; }
function updateFridge(dmin) {
  if (G.night === 7) return;
  if (G.thirteen > 0) { G.thirteen -= dmin; if (G.thirteen <= 0) { if (G.zoom === 'fridge') G.thirteen = 0.01; else { G.fridge = G.fridge.filter(b => !b.odd); G.thirteen = 0; } } }
  else if (G.fridge.length !== 12) { G.wrong += dmin; if (G.wrong > 22) { G.wrong = 0; strike(3, 'The refrigerators did not contain exactly 12.'); mkFridge(12); } }
  else G.wrong = 0;
}

// ----- rule 1: the lights -----
const FIGS = [1, 2, 3, 4, 5, 6, 7];
function flicker(sec, strong) { G.flick = sec; G.flickFigs = strong ? FIGS.slice(0, Math.min(FIGS.length, 1 + G.night)) : []; }
function lightSwitch() {
  sfx.click();
  if (!G.power) { cap('Nothing. The power is gone.'); return; }
  if (G.lights) { G.lights = false; G.lightsOffT = 5; G.flickFigs = FIGS.slice(0, 2 + G.night); amb({ buzz: 0, hum: 0.02 }, 0.2); strike(1, 'You turned off the lights.'); }
  else { G.lights = true; G.lightsOffT = 0; amb({ buzz: 0.012, hum: 0.05 }, 0.3); }
}
// ----- rule 8: behind the counter -----
function startBehind() { if (G.behind || G.modal) { G.sched.push({ t: G.t + 3, fn: startBehind }); return; } const bx = Math.sin(PL.yaw), bz = Math.cos(PL.yaw), tries = [[bx * 1.3, bz * 1.3], [bz * 1.2, -bx * 1.2], [-bz * 1.2, bx * 1.2], [bx * 0.7, bz * 0.7]], ok = tries.find(t => isFree(PL.x + t[0], PL.z + t[1])) || tries[3];
  G.behind = { st: 'appear', t: 0, count: 20, ct: 0, x: PL.x + ok[0], z: PL.z + ok[1] }; sfx.breath(panTo(G.behind.x, G.behind.z)); sfx.step(panTo(G.behind.x, G.behind.z)); }
function updateBehind(dt) {
  const b = G.behind; if (!b) return; b.t += dt;
  if (b.st === 'appear') { if (G.eyes > 0.9) { b.st = 'count'; b.ct = 0; } else if (b.t > 10) { G.behind = null; strike(8, 'It stood behind the counter and you did not close your eyes.'); G.glimpse = 0.45; sfx.scare(); } }
  else if (b.st === 'count') {
    if (!G.eyesHeld && G.eyes < 0.6) { G.behind = null; strike(8, 'You opened your eyes at ' + b.count + '.'); G.glimpse = 0.45; sfx.scare(); return; }
    b.ct += dt; if (b.ct > 0.9) {
      b.ct = 0; b.count--; sfx.tick(0.05);
      if (b.count === 14) { sfx.breath(0); cap('(very close)  “You can look now.”', 4, 'far'); }
      if (b.count === 7) { sfx.step(0.2); cap('Something is pressing the keys on the register. One at a time.', 4, 'far'); }
      if (b.count === 3 && G.night >= 4) cap('(your own voice)  “It’s gone. Open them.”', 3, 'far');
      if (b.count <= 0) { b.st = 'done'; cap('…zero. You can open your eyes.', 5); }
    }
  } else if (G.eyes < 0.2) G.behind = null;
}
// ----- rule 6: 3:33 -----
function startKnock(lines) { G.knock = { t: 0, k: 0, lines: lines || [], li: 0 }; }
function updateKnock(dt) {
  const k = G.knock; if (!k) return; k.t += dt;
  if (k.t > k.k * 5.2) { k.k++; sfx.knock(panTo(-6, 3.45)); G.knockAnim = 0.9; if (k.k % 2 === 0 && k.lines[k.li]) cap('(from the staff toilet)  ' + k.lines[k.li++], 5, 'far'); else if (k.k === 1) cap('(from the staff toilet)  knock. knock. knock.', 4, 'far'); }
  if (k.t > 32) G.knock = null;
}
function toiletDoor() {
  if (G.knock) { G.knock = null; strike(6, 'Nobody was supposed to be inside. You opened it.'); G.glimpse = 0.5; sfx.scare(); }
  else if (G.toiletOpen) cap('The door stands open. The light inside does not work. You do not go in.');
  else cap('Locked. You were never given a key.');
}
// ----- rule 11: the door that is not part of the building -----
const LISTEN = ['', '', 'Something shifts its weight on the other side. Then, close to the wood, a whisper: “You’re late.”', 'A till drawer opening and closing. Opening and closing.', 'A telephone ringing. Four times. Five. Nobody unplugs it.', 'Somebody reading the rules aloud. They stop when you stop breathing.', 'Counting. Backwards from twenty, slowly. You know that voice. It is yours.', 'Counting. Backwards from twenty. It is your voice. It has reached three.'];
async function newDoorMenu() {
  if (G.finale) return finaleDoor();
  const c = await choose('', 'EMPLOYEES ONLY. The paint matches the wall, but it is newer than the wall.', ['Put your ear to it.', 'Open it.', 'Leave it alone.']);
  if (c === 0) { sfx.whisper(panTo(-6, 1.7), 1.8); await say('', LISTEN[G.night]); if (G.night >= 6) remember('door'); }
  else if (c === 1) {
    strike(11, 'It is not part of the building.'); sfx.creak(panTo(-6, 1.7)); G.glimpse = 0.35; sfx.scare();
    await say('', 'A shop. This shop. The counter, the fridges, the light. Someone behind the counter looks up from a piece of paper.');
    await say('', 'Then the door is shut, and your hand is nowhere near it.');
  }
}
// ----- rule 5: CAM 4 -----
function watchCam(i) {
  const l = G.camLabels[i];
  if (G.cam4Trap) { G.cam4Trap = false; G.sawTape = true; G.feed = 98; G.cam98 = 0; setZoom('cam'); amb({ static: 0.03 }, 0.3); return; }
  if (l === 4) { if (!G.cam4On) { cap('No signal. Good.'); return; } G.feed = 4; setZoom('cam'); amb({ static: 0.05 }, 0.2); strike(5, 'You looked at CAM 4.'); return; }
  G.feed = l; setZoom('cam'); amb({ static: 0.012 }, 0.3);
}
function shuffleCams() { const a = G.camLabels; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } }
function cam4(min) { G.cam4On = true; G.sched.push({ t: G.t + min, fn: () => { G.cam4On = false; } }); }
// ----- rule 9 -----
function waveBack() {
  const w = G.wave; if (!w) return; G.wave = null;
  if (w.who === 'me') { G.waved = 7; strike(9, 'You waved back.'); cap('It keeps waving after you have stopped.', 5); }
  else { G.tips += 2; cap('Two short honks from the forecourt. (+$2 tip)'); }
}
// ----- rule 10 -----
function frontDoor() {
  if (G.finale) { if (G.t >= 179) ending('employee'); else cap('It will not open. Not yet. Wait for the ticking to stop.'); return; }
  if (G.t >= 179) endNight(); else cap(pick(['It will not open for you. Not until 5:59.', 'Your shift is not over.', 'Locked, from this side. The customers manage it somehow.']));
}
// ----- things to read -----
async function readLocker() { await say('', 'The tape with your name on it is yellowed and curling at the corners. It has been here for years.'); await say('', 'Inside, on a hook: a yellow raincoat. It is still wet.'); }
function readPhoto() {
  doc('<p>EMPLOYEE RECORDS.</p><p>ALL PREVIOUS NIGHT-SHIFT WORKERS.</p><p>NONE COMPLETED THEIR CONTRACT.</p><p style="margin-top:1em;font-size:.8em">(the one circled in red, in the cap. that is not someone who looks like me. that is me.)</p>', 'photo');
  remember('photo');
}
function readBinder() {
  const n = esc(R.name), row = (y, who, s) => `<tr><td>${y}</td><td>${who}</td><td>${s}</td></tr>`;
  doc('<h2>EMPLOYEE RECORD — NIGHT SHIFT</h2><table>' + row('1971', 'E. MORROW', 'contract not completed') + row('1979', 'J. PIKE', 'contract not completed') + row('1986', 'R. ALDER', 'contract not completed') + row('1998', n, 'contract not completed') + row('2004', 'T. VOSS', 'contract not completed') + row('2011', 'C. MARCH', 'contract not completed') + row('now', n, 'night 6 of 7') +
    '</table><p style="margin-top:1em">MANAGER: ______________ <i>(position vacant since 1971)</i></p><p>SIGN HERE: ______________</p><p class="hand">there is no Hallow on this list. there is no manager at all.</p>', '');
  remember('binder');
}
async function clipboardMenu() {
  if (!has('binder')) { await say('', 'A form with one empty line: MANAGER. You do not know enough about this place to put your name there.'); return; }
  const c = await choose('', 'APPOINTMENT OF MANAGER. One empty line. The pen is already uncapped. The position has been vacant since 1971, whatever Mr. Hallow calls himself.', ['Sign your name.', 'Leave it.']);
  if (c === 0) ending('manager');
}
async function finaleDoor() {
  const c = await choose('', 'Light is leaking around the frame. It is not part of the building.', ['Open it and walk through.', 'Step back.']);
  if (c !== 0) return; if (has('photo') && has('door')) ending('exit'); else ending('customer', 'door');
}

// ----- end of a night -----
async function sixOClock() {
  if (G.ended) return; strike(10, 'You waited for the clock to reach 6:00.'); if (R.strikes >= LIMIT) return;
  G.power = false; sfx.power(); G.flickFigs = FIGS.slice(); G.lightsOffT = 99; ambOff();
  await wait(1.6);
  await say('', 'The clock reads 6:00. Every light in the building goes out at once.');
  await say('', 'They are all here. Everyone you served tonight, standing in the aisles, facing the counter. Waiting to be noticed.');
  await say('', 'You do not remember walking to your car.');
  endNight();
}
const SLIP = ['', 'Welcome to the team.', 'Please do not discuss fixtures and fittings with customers.', 'Receipts are the property of Morrow’s.', 'Staff are reminded that there is no CAM 4.', 'Employee since: 14 NOV 1998.', 'Your manager will see you soon.', ''];
async function endNight() {
  if (G.ended) return; G.ended = true; G.epoch++; closeOverlays(); ambOff(); sfx.bell();
  const pay = 135 + G.tips - G.deduct; R.pay += pay; R.night = G.night + 1; save();
  G.scene = 'card'; G.ext = { station: 1, lit: 1, dawn: 0.22, car: 1 };
  const tr = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  await cardBtn(`<div class="slip"><p style="text-align:center">MORROW’S FUEL &amp; MART<br>PAY ADVICE — NIGHT ${G.night}</p><table>` + tr('3 hrs @ $45.00', '$135.00') + tr('Tips', '$' + G.tips.toFixed(2)) + tr('Deductions', '−$' + G.deduct.toFixed(2)) + tr('TONIGHT', '$' + pay.toFixed(2)) + tr('TO DATE', '$' + R.pay.toFixed(2)) + tr('Rules broken tonight', G.nightStrikes) + tr('Rules broken, total', R.strikes + ' of ' + LIMIT) +
    `</table><p style="font-size:.85em;margin-top:.8em">${SLIP[G.night]}</p></div><p class="dim">${G.six ? 'You woke up in your car at 6:14. The engine was already running.' : 'You left at 5:59. The door opened as if it had been waiting.'}</p>`, 'GO HOME AND SLEEP');
  startNight(R.night);
}
