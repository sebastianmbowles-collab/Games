// ================= MAIN LOOP =================
let scene = null, nextScene = null, fade = 0, fadeDir = 0, paused = false, pauseSel = 0;
function setScene(s) {
  if (scene && scene.exit) scene.exit();
  scene = s; paused = false; FX.banners = [];
  In.setTouch(s.touch || {});
  if (s.enter) s.enter();
}
function go(s) { if (fadeDir === 1) { nextScene = s; return; } nextScene = s; fadeDir = 1; }
const PAUSE_ITEMS = ['RESUME', 'RESTART', 'QUIT TO MENU'];
function updatePause() {
  if (In.hit('up')) { pauseSel = (pauseSel + 2) % 3; Snd.blip(); }
  if (In.hit('down')) { pauseSel = (pauseSel + 1) % 3; Snd.blip(); }
  let ch = In.ok() ? pauseSel : -1;
  PAUSE_ITEMS.forEach((_, i) => { if (tapIn(100, 70 + i * 18, 120, 16)) ch = i; });
  if (In.hit('pause')) ch = 0;
  if (ch === 0) { paused = false; In.setTouch(scene.touch || {}); Snd.blip(); }
  else if (ch === 1) { paused = false; FX.banners = []; scene.restart(); In.setTouch(scene.touch || {}); }
  else if (ch === 2) { paused = false; go(new TitleScreen()); }
}
function drawPause() {
  ctx.globalAlpha = 0.7; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1;
  txt('PAUSED', W / 2, 44, '#ffd23a', 'center', 16);
  PAUSE_ITEMS.forEach((s, i) => { box(100, 70 + i * 18, 120, 16, i === pauseSel ? '#3a3a22' : '#14160e', i === pauseSel ? '#ffd23a' : '#5a5440'); txt(s, W / 2, 74 + i * 18, '#f4ecd0', 'center'); });
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (fadeDir === 1) { fade += dt * 4; if (fade >= 1) { fade = 1; setScene(nextScene); nextScene = null; fadeDir = -1; } }
  else if (fadeDir === -1) { fade -= dt * 4; if (fade <= 0) { fade = 0; fadeDir = 0; } }
  if (scene) {
    if (paused) updatePause();
    else {
      if (scene.pausable && In.hit('pause') && fadeDir === 0) { paused = true; pauseSel = 0; In.setTouch({ pad: true, a: 'OK', pause: true }); Snd.blip(); }
      else if (fadeDir !== 1) { FX.update(dt); scene.update(dt); }
    }
    ctx.save();
    if (FX.shakeT > 0) ctx.translate(Math.round((R() - 0.5) * FX.shakeM * 2), Math.round((R() - 0.5) * FX.shakeM * 2));
    scene.draw();
    ctx.restore();
    FX.drawTop();
    if (paused) drawPause();
    if (fade > 0) { ctx.globalAlpha = fade; rect(0, 0, W, H, '#000'); ctx.globalAlpha = 1; }
  }
  In.end();
  requestAnimationFrame(frame);
}
// boot
loadSave(); Snd.setMuted(!!save.muted);
Voice.probe('p1');
class Boot { // "tap to start" so the browser allows sound
  constructor() { this.t = 0; this.touch = {}; }
  update(dt) { this.t += dt; if (In.ok() || In.ptr.pressed || Object.keys(In.k).some(k => In.k[k])) { Snd.init(); go(new TitleScreen()); } }
  draw() {
    rect(0, 0, W, H, '#0b0d08');
    const s = eggSprite('shelly', 0); ctx.drawImage(s, W / 2 - s.width * 2, 40, s.width * 4, s.height * 4);
    txt('EGGSHELL: BOMBING', W / 2, 20, '#f4f1e6', 'center');
    if ((this.t * 2) % 1 < 0.65) txt('TAP OR PRESS ANY KEY', W / 2, 150, '#ffd23a', 'center');
    txt('headphones recommended', W / 2, 166, '#6a6450', 'center');
  }
}
setScene(new Boot());
requestAnimationFrame(frame);
// debug hook for testing: window.EGG.play(i) jumps straight into a mission
window.EGG = { play: i => { Snd.init(); startMission(i); }, scene: () => scene, save: () => save };
