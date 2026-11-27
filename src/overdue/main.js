// OVERDUE: start everything up.
import { initCore, startLoop, C } from './core.js';
import { setAniso } from './tex.js';
import { buildWorld, updateWorld } from './world.js';
import { initPlayer, initTouch } from './player.js';
import { initGame, updateGame, G } from './game.js';
import { initAudio, A } from './audio.js';
import { V } from './villains.js';
import { P } from './player.js';

initCore(document.getElementById('gl'));
setAniso(C.renderer.capabilities.getMaxAnisotropy());
buildWorld();
initPlayer();
initTouch();
initGame();
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, initAudio, { passive: true });
startLoop(dt => {
  updateGame(dt);
  updateWorld(dt, C.camera);
});
// handy for testing
window.__OD = { C, G, V, P, A };
