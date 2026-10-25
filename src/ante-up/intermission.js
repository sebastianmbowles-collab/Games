// Between matches the Dealer sinks into the floor and you get a few minutes
// on a longer chain to search the cellar.
import { C, THREE, wait, tween, ease, addHot, removeHot, setView, walkStep, on, faceTowards, shake } from './core.js';
import { S, D, has, flag, setFlag, journal, ITEMS } from './state.js';
import { dealer } from './dealer.js';
import { W, makeShard } from './world.js';
import { A } from './audio.js';
import { ui, say, toast, timer, keys, status, readDoc, cross } from './ui.js';
import { hurt } from './watch.js';
import { DOCS } from './text.js';
import { fxState, embers } from './fx.js';
import { canvasTex } from './tex.js';

const P = () => W.props;

export function giveItem(id) {
  if (S.items[id]) return;
  S.items[id] = true;
  A.sfx('pick');
  toast(`Picked up: <b>${ITEMS[id].name}</b>`, 'good', 3.5);
}
export async function readPaper(id) {
  S.docs = S.docs || {};
  S.docs[id] = DOCS[id].title;
  const was = C.paused;
  C.paused = true;
  await readDoc(DOCS[id]);
  C.paused = was;
}
ui.openDoc = id => readPaper(id);

export async function intermission(act) {
  const dif = D();
  const secs = dif.timers[act - 1];
  await dealer.sinkAway();
  A.sfx('shackle');
  await wait(0.5);
  toast('The shackle on your ankle loosens.', '', 3.5);
  A.music(act === 3 ? 'void' : 'off');
  A.duck(0);
  setTimeout(() => A.unduck(), 2500);
  // stand up
  C.walk.x = 0; C.walk.z = 1.05;
  C.walk.radius = [3.1, 4.7, 2.9, 5.7][act - 1];
  setView('walk', { yaw: C.view.yaw, pitch: -0.15 });
  cross(true);
  const hemi0 = W.hemi.intensity;
  tween(3, k => { W.eyesLight.intensity = k * (act === 3 ? 0.7 : 1.4); W.hemi.intensity = hemi0 + k * 0.4; });
  fxState.breath = act === 4;
  keys('<kbd>W A S D</kbd> walk &nbsp; <kbd>drag</kbd> look &nbsp; <kbd>click</kbd> glowing things &nbsp; <kbd>I</kbd> items &nbsp; <kbd>J</kbd> journal');
  status(act === 1 ? '<small>Find what you can. Click your chair to sit before he returns.</small>' : '');
  const hots = [];
  const ctx = { act, hots, done: false };
  setupProps(act);
  buildHots(act, ctx);
  // the chair ends it
  hots.push(addHot(W.props.playerChair, { label: 'Sit down and wait for him', reach: 2.4, onClick: () => { ctx.done = 'sit'; } }));
  let left = secs, stepT = 0, quiet = 0;
  timer(left);
  const off = on(dt => {
    if (ctx.cut) return;
    left -= dt;
    timer(left);
    const mv = walkStep(dt);
    if (mv) {
      stepT -= dt;
      if (stepT <= 0) { stepT = 0.48; A.sfx('step', 0.35); if (Math.random() < 0.5) A.sfx('chain', 0.25); }
      if (C.walk.taut > 0.98 && quiet <= 0) { quiet = 1.2; A.sfx('chain', 0.8); toast('The chain pulls tight around your ankle.', '', 1.6); }
    }
    quiet -= dt;
    if (act === 4) S.sanity = Math.max(1, S.sanity - dt * 0.05);
    if (left < 20 && left + dt >= 20) { A.sfx('rumble', 2, 0.5); toast('The floor trembles. He is coming back.', 'bad', 3); }
    if (left <= 0 && !ctx.done) ctx.done = 'time';
  });
  while (!ctx.done) await wait(0.1);
  off();
  for (const h of hots) removeHot(h);
  ctx.cleanup?.();
  timer(null);
  status('');
  keys('');
  cross(false);
  fxState.breath = false;
  if (S.carrying) returnCandle();
  if (ctx.done === 'time') {
    // he rises behind you and drags you back
    A.sfx('stinger');
    C.fx.red = 1;
    shake(0.08, 0.6);
    await say('dealer', act >= 3 ? 'TIME, {name}.' : 'Wandering, {name}?', { auto: 1.2 });
    A.sfx('drag');
    const x0 = C.walk.x, z0 = C.walk.z;
    await tween(1.2, k => { C.walk.x = x0 + (0 - x0) * k; C.walk.z = z0 + (1.05 - z0) * k; }, ease.io);
    hurt(10);
    S.suspicion = 25;
    toast('He dragged you back to your chair.', 'bad', 3);
  }
  setView('seat', { yaw: 0, pitch: -0.2 });
  W.eyesLight.intensity = 0;
  W.hemi.intensity = hemi0;
  await dealer.riseUp();
  A.sfx('shackle');
}

function setupProps(act) {
  const p = P();
  // reflect what you've already done this run
  p.grateBars.position.set(flag('grate') ? 0.42 : 0, flag('grate') ? 0.0 : 0, 0);
  p.screwdriverInGrate.visible = !has('screwdriver');
  p.floorboard.position.y = flag('board') ? 0.05 : 0.024;
  p.floorboard.position.x = flag('board') ? 0.35 : 0;
  p.diaryBook.visible = flag('board') && !has('diary');
  p.looseStone.position.x = flag('stone') ? -3.75 : -3.96;
  p.letter.visible = flag('stone') && !flag('letter');
  p.matchTin.visible = flag('stone') && !has('matches');
  p.fuseLid.rotation.y = flag('fuse') ? -1.9 : 0;
  p.keyInBox.visible = !has('key');
  p.leadInBox.visible = !has('weight');
  p.chestLid.rotation.x = flag('chest') ? -1.6 : 0;
  p.lock.visible = p.lockShackle.visible = !flag('chest');
  p.shardInChest.visible = !has('shard');
  p.drawing.visible = !flag('drawing');
  p.oilCan.visible = !has('oil');
  p.barrels.children.forEach(o => { if (o.userData.barrel && flag('barrel') && o.position.x === 0) o.position.x = -0.1; });
  p.notebook.visible = act === 2 && !flag('tomas');
  p.valveStone.position.x = flag('valve') ? -0.25 : 0;
  p.valveWheel.visible = p.valvePipe.visible = flag('valve');
  p.pouch.visible = true;
  if (W.props.icePage) W.props.icePage.visible = !has('lastpage');
}

// ---------------------------------------------------------------- per act
function buildHots(act, ctx) {
  const p = P();
  const H = (obj, o) => ctx.hots.push(addHot(obj, Object.assign({ glow: () => true }, o)));
  const shellVisible = act !== 3;

  if (shellVisible) {
    // names by the hooks
    H(p.names, {
      label: 'Read the names scratched by the chains', glow: () => !flag('names'),
      onClick: () => {
        setFlag('names');
        journal('names', 'Names by the chains', 'Scratched into the wall beside four old chains: S.C. 1887, E.H. 1931, M.D. 1962, T.R. 1994. There is room for one more.');
        toast('There is room for one more name.', '', 4);
      },
    });
    H(p.door, {
      label: 'Try the iron door', glow: () => false,
      onClick: () => { A.sfx('chain', 1); A.sfx('thunk'); toast('Locked. Something heavy leans against the other side.', '', 3); journal('door', 'The iron door', 'There is an iron door in the north-east corner. It will not open. Stairs, maybe.'); },
    });
    H(p.puddle, {
      label: 'Look into the puddle', glow: () => false,
      onClick: () => {
        if (!flag('puddle')) { setFlag('puddle'); hurt(3); }
        A.sfx('whispers', 0.4, 1.5);
        toast('The water shows the ceiling, the beams, the dark. It does not show you.', 'bad', 4);
      },
    });
    H(p.jar, {
      label: 'Look at the jar on the shelf', glow: () => false,
      onClick: () => toast('A jar of teeth, like the ones on the table. Some have fillings.', '', 3.5),
    });
  }
  // the empty cloak on his chair
  H(dealer.cloak, {
    label: 'Search the empty cloak', glow: () => !flag('pouch'),
    onClick: async () => {
      if (!flag('pouch')) {
        setFlag('pouch');
        hurt(4);
        A.sfx('chime');
        journal('pouch', 'The velvet pouch', 'Inside his cloak hangs a velvet pouch, full of glowing white marbles. Dozens. Some of them are warm, and some of them hum.');
      }
      toast('A velvet pouch, heavy with glowing white marbles. Some are warm. One of them is humming.', 'bad', 5);
    },
  });

  if (act === 1) {
    H(p.grate, {
      label: () => (flag('grate') ? '' : 'Lift the drain grate'),
      enabled: () => !flag('grate'), glow: () => !flag('grate'),
      onClick: async () => {
        setFlag('grate');
        A.sfx('grate');
        await tween(0.8, k => { p.grateBars.position.x = 0.42 * k; p.grateBars.position.y = Math.sin(k * Math.PI) * 0.04; }, ease.io);
        toast('Something glints down in the drain.', '', 3);
      },
    });
    H(p.screwdriverInGrate, {
      label: 'Take the rusty screwdriver', enabled: () => flag('grate') && !has('screwdriver'),
      onClick: () => {
        giveItem('screwdriver');
        p.screwdriverInGrate.visible = false;
        journal('screw', 'A screwdriver', 'A rusty screwdriver hidden in the drain. Someone put it there on purpose.');
      },
    });
  }
  if (act <= 2) {
    H(p.floorboard, {
      label: 'Pry up the loose floorboard', reach: 2.3,
      enabled: () => has('screwdriver') && !flag('board'),
      glow: () => has('screwdriver') && !flag('board'),
      locked: () => (flag('board') ? '' : 'A loose board behind your chair. It is nailed down. You need something to pry it.'),
      hold: {
        time: 1.6,
        onStart: () => A.sfx('creak', 0.8),
        onDone: async () => {
          setFlag('board');
          A.sfx('pry');
          await tween(0.6, k => { p.floorboard.position.y = 0.024 + k * 0.03; p.floorboard.position.x = k * 0.35; p.floorboard.rotation.z = k * 0.2; });
          p.diaryBook.visible = true;
        },
      },
    });
    H(p.diaryBook, {
      label: "Take the diary", enabled: () => flag('board') && !has('diary'),
      onClick: async () => {
        giveItem('diary');
        p.diaryBook.visible = false;
        await readPaper('edward');
        journal('shadow', 'Absolute shadow', "Edward's diary: <b>the Dealer cannot see what lies wholly in absolute shadow.</b> Not partly. Wholly.");
        journal('edward', 'Edward Hale', 'A clockmaker, 1931. He kept a diary under the board behind my chair. He knew the Dealer\'s tells. He did not finish either.');
        toast('Journal updated', 'good');
      },
    });
    H(p.looseStone, {
      label: 'Pull out the loose stone', enabled: () => !flag('stone'), glow: () => !flag('stone'),
      hold: {
        time: 1.3,
        onStart: () => A.sfx('drag'),
        onDone: async () => {
          setFlag('stone');
          await tween(0.6, k => { p.looseStone.position.x = -3.96 + k * 0.21; });
          p.letter.visible = true; p.matchTin.visible = true;
        },
      },
    });
    H(p.letter, {
      label: 'Read the folded letter', enabled: () => flag('stone') && !flag('letter'),
      onClick: async () => {
        setFlag('letter');
        p.letter.visible = false;
        await readPaper('marguerite');
        journal('margie', 'Marguerite, 1962', 'Margie hid eleven matches behind a loose stone. She couldn\'t think of anything worth burning.');
      },
    });
    H(p.matchTin, {
      label: 'Take the tin of matches', enabled: () => flag('stone') && !has('matches'),
      onClick: () => { giveItem('matches'); p.matchTin.visible = false; },
    });
  }
  if (act === 2) {
    H(p.fuse, {
      label: () => (flag('fuse') ? '' : 'Unscrew the fuse box'),
      enabled: () => has('screwdriver') && !flag('fuse'),
      glow: () => has('screwdriver') && !flag('fuse'),
      locked: () => (flag('fuse') ? '' : 'A rusted fuse box, screwed shut.'),
      hold: {
        time: 1.8,
        onStart: () => A.sfx('creak', 0.5),
        onDone: async () => {
          setFlag('fuse');
          A.sfx('spark');
          await tween(0.6, k => { p.fuseLid.rotation.y = -1.9 * k; }, ease.out);
        },
      },
    });
    H(p.keyInBox, { label: 'Take the iron key', enabled: () => flag('fuse') && !has('key'), onClick: () => { giveItem('key'); p.keyInBox.visible = false; } });
    H(p.leadInBox, {
      label: 'Take the lead weight', enabled: () => flag('fuse') && !has('weight'),
      onClick: () => {
        giveItem('weight'); p.leadInBox.visible = false;
        journal('weight', 'A lead weight', 'Heavy enough to pin anything in place. Whatever he shakes, this won\'t move.');
      },
    });
    H(p.lever, {
      label: 'Throw the breaker', enabled: () => flag('fuse'), glow: () => flag('fuse') && !flag('bulb'),
      onClick: async () => {
        A.sfx('breaker');
        A.sfx('hum60');
        setFlag('bulb');
        p.bulbLight.visible = true;
        for (let i = 0; i < 6; i++) { p.bulbLight.intensity = i % 2 ? 0 : 5; p.writing.material.opacity = i % 2 ? 0 : 0.9; p.bulb.material.color.set(i % 2 ? 0x221a10 : 0xfff2c0); await wait(0.07 + Math.random() * 0.1); }
        p.bulbLight.intensity = 5; p.writing.material.opacity = 0.9; p.bulb.material.color.set(0xfff2c0);
        journal('writing', 'Writing in the electric light', 'Under the bulb, painted on the west wall: SILAS CRANE OWES THE HOUSE. THE HOUSE ALWAYS WINS. It vanishes in candlelight.');
        await wait(4);
        A.sfx('spark');
        p.bulbLight.intensity = 0; p.bulbLight.visible = false; p.writing.material.opacity = 0; p.bulb.material.color.set(0x221a10);
        toast('The bulb burns out.', '', 2.5);
      },
    });
    H(p.chest, {
      label: () => (flag('chest') ? '' : 'Unlock the chest'),
      enabled: () => has('key') && !flag('chest'),
      glow: () => has('key') && !flag('chest'),
      locked: () => (flag('chest') ? '' : 'A heavy chest with a padlock.'),
      onClick: async () => {
        setFlag('chest');
        A.sfx('unlock');
        p.lock.visible = p.lockShackle.visible = false;
        await wait(0.3);
        A.sfx('chest');
        await tween(0.9, k => { p.chestLid.rotation.x = -1.6 * k; }, ease.out);
      },
    });
    H(p.shardInChest, {
      label: 'Take the mirror shard', enabled: () => flag('chest') && !has('shard'),
      onClick: () => {
        giveItem('shard'); p.shardInChest.visible = false;
        journal('shard', 'A mirror shard', 'A triangle of old silvered glass from the chest. My reflection in it looks a little wrong, as if it shows things that are really there.');
      },
    });
    H(p.drawing, {
      label: "Look at the child's drawing", enabled: () => flag('chest') && !flag('drawing'),
      onClick: async () => { setFlag('drawing'); p.drawing.visible = false; await readPaper('drawing'); },
    });
    const barrel = p.barrels.children.find(o => o.userData.barrel);
    H(barrel, {
      label: 'Roll the barrel aside', enabled: () => !flag('barrel'), glow: () => !flag('barrel'),
      hold: {
        time: 1.4, onStart: () => A.sfx('drag'),
        onDone: async () => {
          setFlag('barrel');
          const x0 = barrel.position.x;
          await tween(0.8, k => { barrel.position.x = x0 + 0.3 * k; barrel.rotation.y = k; });
        },
      },
    });
    H(p.oilCan, {
      label: 'Take the can of lamp oil', enabled: () => flag('barrel') && !has('oil'),
      onClick: () => { giveItem('oil'); p.oilCan.visible = false; journal('oil', 'Lamp oil', 'Half a can of lamp oil, hidden behind the barrels.'); },
    });
    H(p.notebook, {
      label: 'Pull the notebook out of the roots', enabled: () => !flag('tomas'),
      onClick: async () => {
        setFlag('tomas');
        p.notebook.visible = false;
        A.sfx('paper');
        await readPaper('tomas');
        journal('tomas', 'Tomás, 1994', 'Tomás wrote about a gas line behind the east wall. With oil, a light and the valve you could burn the whole cellar down, but it might take your memories with it. He also hid a pair of honest dice "somewhere cold".');
        if (!has('matches') || !has('oil')) toast('Oil. A light. A valve on the east wall.', '', 4);
      },
    });
    H(p.valveStone, {
      label: 'Tap the stones of the east wall', glow: () => false,
      onClick: () => { A.sfx('thunk'); toast('One stone, low on the wall, sounds hollow. Behind it, a faint hiss.', '', 4); setFlag('hollow'); },
    });
  }
  if (act === 3) {
    // the void: an island of floor, two ledges, the table
    const shardSpot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), new THREE.MeshBasicMaterial({ visible: false }));
    shardSpot.position.set(0.45, W.TABLE_Y + 0.03, -0.05);
    C.scene.add(shardSpot);
    ctx.cleanup = () => C.scene.remove(shardSpot);
    H(shardSpot, {
      label: 'Prop the mirror shard against the candle, facing his chair', reach: 2.4,
      enabled: () => has('shard') && !flag('mirror'), glow: () => has('shard') && !flag('mirror'),
      locked: () => (flag('mirror') ? '' : has('shard') ? '' : 'The candle burns on the table. His empty cloak sits across from it.'),
      onClick: async () => { ctx.cut = true; await mirrorScene(); ctx.cut = false; },
    });
    const ledger = paperProp(0x3a2a18);
    ledger.position.set(-2.2, 0.33, -1.1);
    C.scene.add(ledger);
    const plan = paperProp(0x22304a);
    plan.position.set(2.15, 0.43, 1.45);
    C.scene.add(plan);
    const marble = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3.2), toneMapped: false }));
    marble.position.set(-1.0, 0.02, 1.9);
    C.scene.add(marble);
    const prev = ctx.cleanup;
    ctx.cleanup = () => { prev(); C.scene.remove(ledger, plan, marble); };
    H(ledger, {
      label: 'Read the ledger page on the ledge', enabled: () => !flag('silas'),
      onClick: async () => {
        setFlag('silas'); ledger.visible = false;
        await readPaper('silas');
        journal('silas', 'Silas Crane, 1887', 'Silas Crane played the Dealer perfectly and broke no rule. When he won, the chair kept him. "I am the house now."');
      },
    });
    H(plan, {
      label: 'Take the folded house plan', enabled: () => !has('map'),
      onClick: async () => {
        giveItem('map'); plan.visible = false;
        await readPaper('map');
        journal('map', 'The gas valve', 'The house plan: the gas valve is behind the third stone of the east wall, knee height. Do not open near a flame.');
      },
    });
    H(marble, {
      label: 'Pick up the glowing marble', enabled: () => !flag('marble'),
      onClick: () => {
        setFlag('marble'); marble.visible = false;
        hurt(3);
        A.sfx('chime');
        toast('It hums with a voice you almost recognise. Then it slips out of your fingers and falls into the mist.', 'bad', 5);
      },
    });
  }
  if (act === 4) {
    H(W.candle.group, {
      label: () => (S.carrying ? '' : 'Take the candle'), reach: 2.4,
      enabled: () => !S.carrying, glow: () => !S.carrying && (!has('lastpage') || !has('dice')),
      onClick: () => carryCandle(),
    });
    H(W.props.iceBlock, {
      label: 'Melt the ice with the candle',
      enabled: () => S.carrying && !has('lastpage'), glow: () => !has('lastpage'),
      locked: () => (has('lastpage') ? '' : 'A block of black ice. There is a page frozen inside. You need heat.'),
      hold: {
        time: 3.2,
        onStart: () => A.sfx('melt'),
        onTick: (t, dt) => { W.props.iceBlock.scale.y = Math.max(0.2, 1 - t / 4); if (Math.random() < dt * 4) embers(W.props.iceBlock.position.clone().add(new THREE.Vector3(0, 0.2, 0)), 2, 0.1); },
        onDone: async () => {
          W.props.iceBlock.visible = false;
          giveItem('lastpage');
          W.props.icePage.visible = false;
          await readPaper('lastpage');
          journal('lastpage', "Edward's last page", 'Edward IS the Dealer now, or part of him. "He only exists where you look. In the last game, stop looking at the board. Put out the light. Then hold up the glass and show him his face."');
          toast('Journal updated', 'good');
        },
      },
    });
    H(p.cup, {
      label: 'Melt what is frozen in the cup',
      enabled: () => S.carrying && !has('dice'), glow: () => !has('dice'),
      locked: () => (has('dice') ? '' : 'An iron cup on the shelf, frozen solid. Something rattles inside the ice.'),
      hold: {
        time: 2.2, onStart: () => A.sfx('melt'),
        onDone: async () => {
          giveItem('dice');
          await readPaper('dicenote');
          journal('dice', 'Honest dice', 'Tomás\'s dice, thawed from the cup. "His are not honest." If he looks away during the last game, I could swap them in.');
        },
      },
    });
    H(p.valveStone, {
      label: () => (flag('valve') ? '' : has('map') ? 'Pull out the third stone' : 'Tap the stones of the east wall'),
      enabled: () => !flag('valve'),
      glow: () => has('map') && !flag('valve'),
      hold: {
        time: 1.5, onStart: () => A.sfx('drag'),
        onDone: async () => {
          if (!has('map')) { A.sfx('thunk'); toast('One stone sounds hollow, but you don\'t know which to pull. You need a plan of the house.', '', 4); return; }
          setFlag('valve');
          await tween(0.6, k => { p.valveStone.position.x = -0.25 * k; });
          p.valveWheel.visible = p.valvePipe.visible = true;
          A.sfx('hum60');
          toast('A red valve wheel on an old gas pipe. It hisses faintly.', '', 4);
          journal('valve', 'The valve is real', 'Behind the third stone: a red valve on a gas pipe. Oil, a match, the valve. It could all burn. I would need him distracted, in the last game.');
        },
      },
    });
  }
}

function paperProp(color) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.24), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.014, 0.23), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 1 }));
  pg.position.y = 0.002; pg.rotation.y = 0.15;
  g.add(m, pg);
  return g;
}

function carryCandle() {
  const c = W.candle;
  S.carrying = true;
  C.scene.attach(c.group);
  C.camera.add(c.group);
  c.group.position.set(0.16, -0.32, -0.42);
  c.group.rotation.set(0, 0, 0);
  A.sfx('pick');
  toast('You lift the candle. The dark leans closer.', '', 3);
}
export function returnCandle() {
  const c = W.candle;
  S.carrying = false;
  C.camera.remove(c.group);
  W.room.add(c.group);
  c.group.position.set(0.56, W.TABLE_Y, 0.06);
  c.group.rotation.set(0, 0, 0);
}

// ---------------------------------------------------------------- the mirror
function portrait(kind) {
  return canvasTex(512, 768, (g, w, h) => {
    const bg = g.createRadialGradient(w / 2, h * 0.4, 30, w / 2, h / 2, h * 0.7);
    bg.addColorStop(0, kind === 'many' ? '#3a3226' : '#4a3e2c'); bg.addColorStop(1, '#0c0906');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const fig = (cx, s, coat, face, extra) => {
      g.save(); g.translate(cx, 0); g.scale(s, s);
      // chair
      g.fillStyle = 'rgba(20,12,8,.9)'; g.fillRect(-90, 330, 180, 30); g.fillRect(-90, 200, 22, 330);
      // legs
      g.fillStyle = coat; g.fillRect(-46, 360, 36, 260); g.fillRect(12, 360, 36, 260);
      // the chain on his foot
      g.strokeStyle = '#9a9690'; g.lineWidth = 6;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(-28 + i * 16, 640 + Math.sin(i) * 4, 9, 6, i % 2 ? 0 : 1.2, 0, 7); g.stroke(); }
      g.fillStyle = '#6a6660'; g.fillRect(-50, 610, 46, 18);
      // body
      g.fillStyle = coat;
      g.beginPath(); g.moveTo(-70, 190); g.lineTo(70, 190); g.lineTo(60, 380); g.lineTo(-60, 380); g.closePath(); g.fill();
      g.fillRect(-92, 200, 26, 160); g.fillRect(66, 200, 26, 160);
      g.fillStyle = '#d9c9a8'; g.beginPath(); g.moveTo(-14, 190); g.lineTo(14, 190); g.lineTo(0, 250); g.fill();
      // head
      g.fillStyle = face; g.beginPath(); g.ellipse(0, 140, 40, 52, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(20,10,5,.85)'; g.beginPath(); g.ellipse(-14, 132, 6, 4, 0, 0, 7); g.ellipse(14, 132, 6, 4, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(40,20,10,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, 170); g.quadraticCurveTo(0, 166, 12, 170); g.stroke();
      extra?.(g);
      g.restore();
    };
    if (kind === 'silas') {
      fig(w / 2, 1, '#1c1a1e', '#c8b090', g2 => {
        g2.fillStyle = '#141216'; g2.fillRect(-44, 50, 88, 50); g2.fillRect(-60, 96, 120, 10); // top hat
        g2.fillStyle = '#3a2a1c'; g2.beginPath(); g2.ellipse(0, 162, 26, 8, 0, 0, Math.PI); g2.fill(); // moustache
      });
    } else if (kind === 'edward') {
      fig(w / 2, 1, '#4a3a28', '#d8c0a0', g2 => {
        g2.strokeStyle = '#c0b080'; g2.lineWidth = 3; g2.beginPath(); g2.arc(-14, 132, 11, 0, 7); g2.arc(14, 132, 11, 0, 7); g2.stroke(); // spectacles
        g2.fillStyle = '#6a5034'; g2.fillRect(-40, 230, 80, 140); // apron
        g2.fillStyle = '#2a1a10'; g2.beginPath(); g2.ellipse(0, 96, 40, 18, 0, Math.PI, 0); g2.fill();
      });
    } else {
      for (let i = 0; i < 7; i++) fig(60 + i * 66, 0.45 + (i % 2) * 0.08, ['#1c1a1e', '#4a3a28', '#2a2a3a', '#3a2020', '#203028', '#1c1a1e', '#2a2420'][i], ['#c8b090', '#d8c0a0', '#b8a080', '#d0b8a0', '#c0a888', '#a89070', '#d8c8b0'][i]);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, h);
    }
    // old mirror silvering
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 20, 0, 7); g.fill(); }
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
  });
}

export async function mirrorScene() {
  setFlag('mirror');
  const shard = makeShard();
  shard.scale.setScalar(1.6);
  shard.position.set(0.47, W.TABLE_Y + 0.002, -0.06);
  shard.rotation.set(-0.25, Math.PI + 0.15, 0);
  C.scene.add(shard);
  A.sfx('pick');
  const inp = C.input;
  C.input = false;
  await faceTowards(new THREE.Vector3(0.47, W.TABLE_Y + 0.08, -0.06), 1.0);
  await wait(0.6);
  A.stopMusic();
  A.duck(0);
  await wait(1.2);
  // a view into the glass
  const tex = { silas: portrait('silas'), edward: portrait('edward'), many: portrait('many') };
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background 1.5s;pointer-events:none';
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 768;
  cv.style.cssText = 'height:min(80vh,760px);clip-path:polygon(6% 96%,72% 2%,98% 70%,30% 99%);opacity:0;transition:opacity 1.6s;filter:sepia(.35) contrast(1.05)';
  box.appendChild(cv);
  document.getElementById('ui').appendChild(box);
  const g = cv.getContext('2d');
  const draw = k => g.drawImage(tex[k].userData.canvas, 0, 0);
  draw('silas');
  await wait(0.05);
  box.style.background = 'rgba(0,0,0,.7)';
  cv.style.opacity = 1;
  A.music('mirror', { restart: true });
  await wait(1.6);
  await say('you', 'There is no smoke in the glass. There is a man, sitting in his chair. A chain around his foot.', { auto: 3.5 });
  await say('you', 'The same chain as yours.', { auto: 2.2 });
  await wait(1.2);
  for (let i = 0; i < 5; i++) { draw(i % 2 ? 'silas' : 'edward'); await wait(0.12); }
  draw('edward');
  await say('you', 'He flickers. Now it is a different man. Round spectacles. A clockmaker\'s apron.', { auto: 3.5 });
  await wait(1);
  for (let i = 0; i < 8; i++) { draw(['silas', 'edward', 'many'][i % 3]); await wait(0.09); }
  draw('many');
  A.sfx('whispers', 0.7, 3);
  await say('you', 'Then all of them. Rows of people in chairs, one inside the other, all chained at the foot.', { auto: 4 });
  await wait(1);
  cv.style.opacity = 0;
  box.style.background = 'rgba(0,0,0,0)';
  await wait(1.6);
  box.remove();
  C.scene.remove(shard);
  journal('mirror', 'What the mirror showed', 'In the shard, the Dealer is a man: Silas Crane, chained at the foot like me. Behind him, Edward. Behind Edward, many more. <b>The Dealer was human. He is all of the ones who won.</b>');
  toast('Journal updated: <b>What the mirror showed</b>', 'good', 4);
  C.input = inp;
  A.music('void');
}
