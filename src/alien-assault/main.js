import { initEngine, showTouch } from './engine.js';
import { G } from './state.js';
import { makeTextures } from './textures.js';
import { makeLogo } from './hud.js';
import { buildTitle, Title, titleDebug } from './title.js';
import { buildGame, Game, debug } from './game.js';

initEngine();
makeTextures();
makeLogo();
if (document.fonts) document.fonts.ready.then(() => makeLogo());
buildTitle();
buildGame();

G.goTitle = () => { G.mode = 'title'; showTouch(false); Title.enter(); };
G.goGame = (mission, o = {}) => { G.mode = 'game'; showTouch(true); Game.start(mission, o); };
G.goTitle();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * (G.timeScale ?? 1);
  last = now;
  G.time += dt;
  const c = G.hctx;
  c.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  c.clearRect(0, 0, G.w, G.h);
  try {
    if (G.mode === 'title') Title.update(dt); else Game.update(dt);
  } catch (e) {
    console.error(e);
  }
  for (const k in G.pressed) delete G.pressed[k];
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handy for testing and screenshots
window.__AA = { G, Game, Title, debug, titleDebug, god: false };
