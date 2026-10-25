import { initCore, startLoop, C } from './core.js';
import { initAudio, A } from './audio.js';
import { setAniso } from './tex.js';
import { buildWorld, updateWorld, W } from './world.js';
import { faceTowards } from './core.js';
import { dealer } from './dealer.js';
import { initUI, drawMeters, updatePrompt } from './ui.js';
import { watch } from './watch.js';
import { updateFx } from './fx.js';
import { boot } from './story.js';
import { S } from './state.js';

initCore();
C.timeScale = +(new URLSearchParams(location.search).get('fast') || 1);
setAniso(C.renderer.capabilities.getMaxAnisotropy());
buildWorld();
dealer.build(C.scene);
initUI();
window.addEventListener('pointerdown', initAudio);
window.addEventListener('keydown', initAudio);

startLoop(dt => {
  updateWorld(dt);
  dealer.update(dt);
  if (!C.paused) watch.update(dt);
  updateFx(dt);
  if (A.M) A.M.insane = C.fx.insane;
  drawMeters();
  updatePrompt();
});

boot();

// handy for testing and screenshots
window.__AU = {
  C, S, dealer, watch, A, W, faceTowards,
  // screen position of a world object, for automated tests
  proj(o) { const v = o.getWorldPosition(o.position.clone()); v.project(C.camera); return [(v.x + 1) / 2 * C.w, (1 - v.y) / 2 * C.h, v.z]; },
};
