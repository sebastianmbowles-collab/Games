// ---------- main: the loop and the controls ----------
const keys = {}, joy = { x: 0, y: 0 };
let locked = false, wantLock = false, hoverT = 0;
function busy() { return G.scene !== 'play' || G.modal > 0 || G.docOpen || G.ended || !$('card').hidden; }
function updatePlay(dt) {
  const pe = G.eyes; G.eyes = clamp(G.eyes + clamp((G.eyesHeld ? 1 : 0) - G.eyes, -dt * 6, dt * 6), 0, 1);
  if ((pe < 0.5) !== (G.eyes < 0.5)) muffle(G.eyes >= 0.5);
  G.shock = Math.max(0, G.shock - dt * 0.55); G.glimpse = Math.max(0, G.glimpse - dt); G.knockAnim = Math.max(0, G.knockAnim - dt); G.waved = Math.max(0, G.waved - dt);
  // walking
  if (!busy() && !G.zoom && G.started) {
    let f = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y, s = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x;
    const turn = (keys.arrowright || keys.e2 ? 1 : 0) - (keys.arrowleft || keys.q ? 1 : 0); PL.yaw -= turn * dt * 2.2;
    const m = Math.hypot(f, s); if (m > 1) { f /= m; s /= m; }
    if (m > 0.05) { const sp = 2.3 * dt, sn = Math.sin(PL.yaw), cs = Math.cos(PL.yaw); movePlayer((-sn * f + cs * s) * sp, (-cs * f - sn * s) * sp); PL.bob += dt * 9 * Math.min(1, m); if (Math.sin(PL.bob) < -0.98 && !G.stepped) { G.stepped = true; sfx.step(0); } else if (Math.sin(PL.bob) > 0) G.stepped = false; }
  }
  if (locked && (busy())) { wantLock = true; try { document.exitPointerLock(); } catch (e) { /* ignore */ } }
  if (G.modal || !G.started || G.ended) return;
  if (G.t >= 179 && G.speed !== 0.1) { G.speed = 0.1; if (G.ticking) { G.ticking = false; G.hallowAtDoor = false; cap('The ticking has stopped.', 6); } }
  const dmin = dt / MIN * G.speed; G.t += dmin;
  runSched(); updatePeople(dt); updatePhone(dt); updateFridge(dmin); updateBehind(dt); updateKnock(dt);
  if (G.wave) { G.wave.t -= dt; if (G.wave.t <= 0) G.wave = null; }
  if (G.flick > 0) { G.flick -= dt; if (!P.reduce && Math.random() < dt * 9) sfx.flick(); }
  else if (G.lights && G.power && G.night < 7 && Math.random() < dt * (0.012 + 0.006 * R.strikes + 0.003 * G.night)) G.flick = rnd(0.15, 0.5);
  if (!G.lights && G.power) { G.lightsOffT -= dt; if (G.lightsOffT <= 0) { G.lights = true; sfx.click(); amb({ buzz: 0.012, hum: 0.05 }, 0.3); cap('The switch clicks back on. You did not touch it.', 5); } }
  if (G.zoom === 'cam' && G.feed === 98) { G.cam98 += dt; if (G.cam98 > 11.5) { remember('cam4'); G.feed = 0; stepBack(); cap('The screen goes to snow. The label underneath says CAM 2 again.', 6); } }
  if (G.night < 7) { G.truckT -= dt; if (G.truckT <= 0 && !G.truck) { G.truck = 0.001; sfx.truck(); G.truckT = rnd(45, 110); } }
  if (G.truck > 0) { G.truck += dt / 7; if (G.truck >= 1) G.truck = 0; }
  G.tickT += dt;
  if (G.ticking) { if (G.tickT >= 0.5) { G.tickT = 0; sfx.tock(); } }
  else if (G.tickT >= 1) { G.tickT = 0; if (!G.clockStop) sfx.tick(G.t > 170 ? 0.05 : 0.014); }
  if (G.t >= 180 && !G.six) { G.six = true; if (G.night === 7) ending(G.remember ? 'real' : 'customer', 'six'); else sixOClock(); }
}
let lastT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000 || 0); lastT = now; G.time += dt;
  if (capT > 0) { capT -= dt; if (capT <= 0) $('cap').textContent = ''; }
  if (flashT > 0) { flashT -= dt; if (flashT <= 0) $('flash').hidden = true; }
  try {
    if (G.scene === 'play') updatePlay(dt);
    worldSync(dt);
    if (locked) { hoverT -= dt; if (hoverT <= 0) { hoverT = 0.08; G.hover = usable() ? pickAt(0, 0) : null; } }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; drawOverlay();
  } catch (e) { console.error(e); }
  hudSync();
  requestAnimationFrame(frame);
}

// ----- controls -----
const usable = () => !busy() && !G.zoom && G.eyes < 0.3 && G.started;
function ndcOf(e) { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height * 2 - 1)]; }
function relock() { if (!wantLock || busy()) return; wantLock = false; lock(); }
function lock() { try { const p = cv.requestPointerLock && cv.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { /* no pointer lock here: dragging still works */ } }
document.addEventListener('pointerlockchange', () => { const was = locked; locked = document.pointerLockElement === cv; if (was && !locked && !wantLock && !busy() && !G.zoom) menu(); });
function zoomClick() { if (G.zoom === 'photo') readPhoto(); else stepBack(); }
let drag = null;
cv.addEventListener('pointerdown', e => {
  audioInit(); if (e.pointerType !== 'mouse') G.touch = true;
  if (busy()) return;
  if (G.zoom) { zoomClick(); return; }
  if (locked) { if (usable()) { const h = pickAt(0, 0); if (h) h.fn(); } return; }
  drag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId, mouse: e.pointerType === 'mouse' }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
cv.addEventListener('pointermove', e => {
  if (locked) { if (!busy() && !G.zoom) { PL.yaw -= e.movementX * 0.0024; PL.pitch = clamp(PL.pitch - e.movementY * 0.0024, -1.2, 1.2); } return; }
  if (drag && drag.id === e.pointerId) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy); if (!busy() && !G.zoom) { PL.yaw += dx * 0.005; PL.pitch = clamp(PL.pitch + dy * 0.005, -1.2, 1.2); } }
  else if (e.pointerType === 'mouse') { const n = ndcOf(e); G.hover = usable() ? pickAt(n[0], n[1]) : null; cv.style.cursor = G.hover ? 'pointer' : 'default'; }
});
const dragEnd = e => {
  if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null;
  if (d.moved > 8 || e.type !== 'pointerup' || !usable()) return;
  const n = ndcOf(e), h = pickAt(n[0], n[1]);
  if (h) h.fn(); else if (d.mouse) lock();
};
cv.addEventListener('pointerup', dragEnd); cv.addEventListener('pointercancel', dragEnd);
// touch joystick
const jEl = $('joy'), nub = $('nub'); let jId = null;
const jMove = e => { const b = jEl.getBoundingClientRect(), r0 = b.width / 2; let x = (e.clientX - b.left - r0) / r0, y = (e.clientY - b.top - r0) / r0; const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; } joy.x = x; joy.y = y; nub.style.transform = `translate(${x * r0 * 0.6}px,${y * r0 * 0.6}px)`; };
jEl.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); jId = e.pointerId; try { jEl.setPointerCapture(jId); } catch (err) { /* ignore */ } jMove(e); });
jEl.addEventListener('pointermove', e => { if (e.pointerId === jId) jMove(e); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => jEl.addEventListener(ev, e => { if (e.pointerId === jId) { jId = null; joy.x = joy.y = 0; nub.style.transform = ''; } }));
// eyes
const eyes = on => { if (G.scene !== 'play' || G.modal || G.docOpen) on = false; G.eyesHeld = on; };
const be = $('bEyes');
be.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); try { be.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } eyes(true); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => be.addEventListener(ev, () => eyes(false)));
be.addEventListener('contextmenu', e => e.preventDefault()); cv.addEventListener('contextmenu', e => e.preventDefault());
$('bBack').onclick = stepBack; $('bWave').onclick = waveBack;
$('bRules').onclick = () => { audioInit(); if (!busy()) openRules(); }; $('bMenu').onclick = menu;
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (!$('dlg').hidden) { if (k === 'enter' || k === ' ') { e.preventDefault(); if (dlgNext) dlgNext(); } else if (k >= '1' && k <= '9' && dlgNext) dlgNext(+k - 1); return; }
  if (G.docOpen) { if (k === 'escape' || k === 'r' || k === 'enter' || k === ' ') { e.preventDefault(); if (docDone) docDone(); } else if (k === 't' && docBack) $('docT').click(); return; }
  if (!$('card').hidden) { if (k === 'enter') { const b = $('cGo') || $('mGo'); if (b) b.click(); } return; }
  if (G.scene !== 'play') return;
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  keys[k] = true;
  if (k === ' ') { if (!e.repeat) { audioInit(); eyes(true); } }
  else if (k === 'r') { if (!busy()) openRules(); }
  else if (k === 'f') { if (!$('bWave').hidden) waveBack(); }
  else if (k === 'e' || k === 'enter') { if (G.zoom) zoomClick(); else if (usable()) { const h = pickAt(0, 0); if (h) h.fn(); } }
  else if (k === 'escape') { if (G.zoom) stepBack(); else if (!locked) menu(); }
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys[k] = false; if (k === ' ') eyes(false); });
addEventListener('blur', () => { eyes(false); for (const k in keys) keys[k] = false; });
function fit() { const b = document.body, cs = getComputedStyle(b), w = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom); $('stage').style.width = Math.max(200, Math.floor(Math.min(w, h * 16 / 9))) + 'px'; }
addEventListener('resize', fit); fit();

buildWorld();
window.NS = { G, P, PL, get R() { return R; }, acts, startNight, ending, strike, newRun, title, pickAt, setZoom, camera, wd, dlg: k => { if (dlgNext) dlgNext(k); }, docClose: () => { if (docDone) docDone(); },
  fn: { updatePlay, pay, scanItem, answerPhone, togglePlug, restock, takeBottle, frontDoor, waveBack, lightSwitch, toiletDoor, newDoorMenu, watchCam, readPhoto, readBinder, readReceipt, clipboardMenu, stepBack, openRules, startBehind, remember } };
title();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
requestAnimationFrame(frame);
