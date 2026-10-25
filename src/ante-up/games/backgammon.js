// ACT V: THE FINAL GAMBIT. Russian Roulette Backgammon.
// The game is rigged. The way out is to stop looking at the board.
import { C, THREE, wait, addHot, removeHot, pick, on, tween, shake, lookingAt, setView, walkStep } from '../core.js';
import { S, D, journal, has, flag, setFlag } from '../state.js';
import { dealer } from '../dealer.js';
import { A } from '../audio.js';
import { ui, say, line, choose, clearChoices, status, toast, keys, cross } from '../ui.js';
import { watch, hurt, caughtLine } from '../watch.js';
import { bgTex, textTex } from '../tex.js';
import { W } from '../world.js';
import * as B from './bgEngine.js';
import { TY, dieMesh, rollDie, fly, cleanup } from './common.js';

export const RULES5 = `<h2>Russian Roulette Backgammon</h2>
<p>Real backgammon. You play the pale checkers and move them from your <b>24-point</b> (far right) round to your <b>home board</b> (points 1 to 6, near right), then bear them off. He moves the other way. <b>First to bear off all 15 wins.</b></p>
<p><b>Roll</b>, then click one of your checkers and click where it should go. You must use both dice if you can (doubles count four times). If only one can be used, it must be the larger. A single checker alone on a point is a <b>blot</b>: land on it to hit it to the bar. A checker on the bar must come back in before anything else moves.</p>
<p>You may offer the <b>doubling cube</b> before you roll. If he refuses, you win. If he offers it to you, refusing means you lose.</p>
<h3>The revolver</h3>
<p>It holds six chambers. When he hits one of your checkers, he spins it and pulls the trigger at you. An empty click means he loads one more. When you hit one of his, he takes a round out. It doesn't fire lead. It fires the dark.</p>
<h3>Cheating</h3>
<p>Watch his hand when he rolls and he can't fix his dice. When he looks away you can <b>hold the revolver</b> to thumb a round out, or, if you found honest dice, <b>hold his dice</b> to swap them.</p>`;

const BW = 0.62, BD = 0.436;
const BC = new THREE.Vector3(-0.05, TY, -0.04);
const MX = (36 / 1024) * BW, BAR = (64 / 1024) * BW, HALF = (BW - 2 * MX - BAR) / 2, PW = HALF / 6, MZ = (36 / 720) * BD;
const R = PW * 0.45, H = 0.0075;
function pointCol(p) {
  if (p <= 6) return { side: 1, col: 6 - p, near: true };
  if (p <= 12) return { side: 0, col: 12 - p, near: true };
  if (p <= 18) return { side: 0, col: p - 13, near: false };
  return { side: 1, col: p - 19, near: false };
}
function checkerPos(p, k) {
  const { side, col, near } = pointCol(p);
  const x = BC.x - BW / 2 + MX + side * (HALF + BAR) + (col + 0.5) * PW;
  const kk = k % 5, layer = Math.floor(k / 5);
  const z = near ? BC.z + BD / 2 - MZ - R - kk * 2 * R : BC.z - BD / 2 + MZ + R + kk * 2 * R;
  return new THREE.Vector3(x, TY + 0.012 + H / 2 + layer * H, z + (layer ? (near ? -R : R) : 0));
}
const barX = BC.x - BW / 2 + MX + HALF + BAR / 2;
const barPos = (side, k) => new THREE.Vector3(barX, TY + 0.012 + H / 2 + Math.floor(k / 4) * H, BC.z + (side === 'p' ? 0.04 + (k % 4) * 2 * R : -0.04 - (k % 4) * 2 * R));
const offPos = (side, k) => new THREE.Vector3(BC.x + BW / 2 + 0.04, TY + 0.002 + H * 0.4 + Math.floor(k / 5) * 0.004, BC.z + (side === 'p' ? 0.04 + (k % 5) * 0.022 : -0.04 - (k % 5) * 0.022));

function revolverMesh() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.3, metalness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2014, roughness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.006, 0.006, 0.13, 12), steel, 0, 0.03, -0.075, Math.PI / 2);
  add(new THREE.BoxGeometry(0.016, 0.012, 0.13), steel, 0, 0.038, -0.07);
  const drum = add(new THREE.CylinderGeometry(0.017, 0.017, 0.036, 6), steel, 0, 0.022, 0.0, Math.PI / 2);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const h = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.037, 8), new THREE.MeshBasicMaterial({ color: 0x000000 })); h.position.set(Math.cos(a) * 0.01, Math.sin(a) * 0.01, 0); h.rotation.x = Math.PI / 2; h.position.z = 0; drum.add(h); h.rotation.set(0, 0, 0); h.position.set(Math.cos(a) * 0.01, 0, Math.sin(a) * 0.01); }
  add(new THREE.BoxGeometry(0.016, 0.03, 0.04), steel, 0, 0.022, 0.03);
  add(new THREE.BoxGeometry(0.015, 0.06, 0.026), wood, 0, -0.012, 0.06, 0.45);
  add(new THREE.TorusGeometry(0.012, 0.0025, 6, 12, Math.PI), steel, 0, 0.004, 0.025, 0, Math.PI / 2, Math.PI);
  add(new THREE.BoxGeometry(0.004, 0.012, 0.006), steel, 0, 0.05, 0.045, -0.4);
  g.userData.drum = drum;
  return g;
}

export async function playBackgammon() {
  const dif = D();
  const g = new THREE.Group();
  C.scene.add(g);
  const top = new THREE.MeshStandardMaterial({ map: bgTex(), roughness: 0.6 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x1e0f07, roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.012, BD), [wood, wood, top, wood, wood, wood]);
  board.position.set(BC.x, TY + 0.006, BC.z);
  board.receiveShadow = true;
  g.add(board);
  const trayMat = new THREE.MeshStandardMaterial({ color: 0x140904, roughness: 0.8 });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, BD), trayMat);
  tray.position.set(BC.x + BW / 2 + 0.04, TY + 0.002, BC.z);
  g.add(tray);
  const chkGeo = new THREE.CylinderGeometry(R, R, H, 24);
  const matP = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.35 });
  const matD = new THREE.MeshPhysicalMaterial({ color: 0x080608, roughness: 0.15, metalness: 0.3, clearcoat: 1 });

  let st = B.newBoard();
  // meshes per checker; rebuilt into stacks from state
  const meshesP = [], meshesD = [];
  for (let i = 0; i < 15; i++) {
    const a = new THREE.Mesh(chkGeo, matP); a.castShadow = true; g.add(a); meshesP.push(a);
    const b = new THREE.Mesh(chkGeo, matD); b.castShadow = true; g.add(b); meshesD.push(b);
  }
  const layout = (animate = false) => {
    let ip = 0, id = 0;
    const ps = [];
    const put = (m, pos) => { if (animate && m.position.distanceTo(pos) > 0.002) ps.push(fly(m, pos, 0.3, 0.03)); else m.position.copy(pos); };
    for (let p = 1; p <= 24; p++) {
      const v = st.pts[p];
      for (let k = 0; k < Math.abs(v); k++) put(v > 0 ? meshesP[ip++] : meshesD[id++], checkerPos(p, k));
    }
    for (let k = 0; k < st.barP; k++) put(meshesP[ip++], barPos('p', k));
    for (let k = 0; k < st.barD; k++) put(meshesD[id++], barPos('d', k));
    for (let k = 0; k < st.offP; k++) { const m = meshesP[ip++]; put(m, offPos('p', k)); }
    for (let k = 0; k < st.offD; k++) { const m = meshesD[id++]; put(m, offPos('d', k)); }
    return Promise.all(ps);
  };
  layout();

  // dice, cube, revolver
  const myDice = [dieMesh(false, 0.024), dieMesh(false, 0.024)];
  const hisDice = [dieMesh(true, 0.024), dieMesh(true, 0.024)];
  myDice.forEach((d, i) => { d.position.set(-0.46 + i * 0.04, TY + 0.012, 0.3); g.add(d); });
  hisDice.forEach((d, i) => { d.position.set(0.36 + i * 0.04, TY + 0.012, -0.36); g.add(d); });
  const cupSpot = new THREE.Vector3(0.38, TY + 0.02, -0.36);
  const cubeMats = [2, 4, 8, 16, 32, 64].map(n => new THREE.MeshStandardMaterial({ map: textTex(String(n), { w: 128, h: 128, font: 'bold 72px Georgia, serif', color: '#1a0c06', bg: '#d8c8a0' }), roughness: 0.5 }));
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, 0.028), cubeMats);
  cube.castShadow = true;
  g.add(cube);
  let cubeVal = 1, cubeOwner = 'c';
  const placeCube = () => {
    const faceUp = { 1: 0, 2: 0, 4: 1, 8: 2, 16: 3, 32: 4, 64: 5 }[cubeVal];
    const rots = [[0, 0, Math.PI / 2], [0, 0, -Math.PI / 2], [0, 0, 0], [Math.PI, 0, 0], [-Math.PI / 2, 0, 0], [Math.PI / 2, 0, 0]];
    cube.rotation.set(...rots[faceUp]);
    const z = cubeOwner === 'p' ? 0.14 : cubeOwner === 'd' ? -0.22 : BC.z;
    fly(cube, new THREE.Vector3(barX, TY + 0.026, z), 0.4, 0.05);
  };
  cube.position.set(barX, TY + 0.026, BC.z);
  placeCube();
  const gun = revolverMesh();
  const gunRest = new THREE.Vector3(0.36, TY + 0.012, -0.12);
  gun.position.copy(gunRest);
  gun.rotation.set(-Math.PI / 2 + 0.02, 0, 0.9);
  gun.rotation.set(0, 0.8, Math.PI / 2);
  g.add(gun);
  let loaded = 1, honest = false, thumbed = 0;

  let phase = 'idle', roll = [0, 0], sel = null, nextMoves = [], done = [], turnPlays = [], stack = [], myTurns = 0;
  let confrontReady = false, shadowHandUsed = false, lookAway = 0;
  const hots = [];
  ui.rules = RULES5;
  keys('<kbd>roll</kbd>, then click a checker and a point &nbsp; <kbd>R</kbd> rules &nbsp; <kbd>J</kbd> journal');
  const upd = () => {
    const pp = B.pips(st);
    status(`PIPS &nbsp; you ${pp.p} &middot; him ${pp.d} &nbsp;&nbsp; BORNE OFF &nbsp; you ${st.offP} &middot; him ${st.offD}<br><small>CUBE ${cubeVal}${cubeOwner === 'p' ? ' (yours)' : cubeOwner === 'd' ? ' (his)' : ''} &nbsp;|&nbsp; ROUNDS IN THE CYLINDER: ${loaded} / 6${roll[0] ? ` &nbsp;|&nbsp; DICE ${roll[0]} &amp; ${roll[1]}` : ''}</small>`);
  };

  // markers for legal destinations
  const markGeo = new THREE.CircleGeometry(R * 0.7, 18);
  const markMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.1, 0.4), transparent: true, opacity: 0.75, toneMapped: false, depthWrite: false });
  const selMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.9, 2), transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false });
  const marks = [];
  const clearMarks = () => { for (const m of marks) g.remove(m); marks.length = 0; };
  const markAt = (pos, mat = markMat) => { const m = new THREE.Mesh(markGeo, mat); m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y = TY + 0.0135 + 0.02; g.add(m); marks.push(m); };
  const destPos = to => (to === 'off' ? offPos('p', st.offP) : checkerPos(to, Math.max(0, st.pts[to])));
  const srcPos = from => (from === 'bar' ? barPos('p', st.barP - 1) : checkerPos(from, st.pts[from] - 1));
  const sameMove = (a, b) => a.from === b.from && a.to === b.to && a.die === b.die;
  const refreshNext = () => {
    const cand = turnPlays.filter(p => done.every((m, i) => p.seq[i] && sameMove(p.seq[i], m)) && p.seq.length > done.length);
    nextMoves = [];
    for (const p of cand) { const m = p.seq[done.length]; if (!nextMoves.some(x => sameMove(x, m))) nextMoves.push(m); }
  };
  const showMarks = () => {
    clearMarks();
    if (sel !== null) {
      markAt(srcPos(sel), selMat);
      for (const m of nextMoves.filter(x => x.from === sel)) markAt(destPos(m.to));
    } else {
      const froms = [...new Set(nextMoves.map(m => m.from))];
      for (const f of froms) markAt(srcPos(f), selMat);
    }
  };
  function hoverSpot() {
    const hit = C.ray.intersectObjects([board, tray])[0];
    if (!hit) return null;
    const x = hit.point.x - BC.x, z = hit.point.z - BC.z;
    if (x > BW / 2) return 'off';
    const lx = x + BW / 2 - MX;
    if (lx > HALF && lx < HALF + BAR) return 'bar';
    let side = 0, cx = lx;
    if (lx >= HALF + BAR) { side = 1; cx = lx - HALF - BAR; }
    const col = Math.max(0, Math.min(5, Math.floor(cx / PW)));
    const near = z > 0;
    if (near) return side === 1 ? 6 - col : 12 - col;
    return side === 0 ? 13 + col : 19 + col;
  }
  hots.push(addHot(board, {
    label: () => {
      const s = hoverSpot();
      if (s === null) return '';
      if (sel !== null && nextMoves.some(m => m.from === sel && m.to === s)) return s === 'off' ? 'Bear off' : 'Move here';
      if (nextMoves.some(m => m.from === s)) return 'Pick up this checker';
      return '';
    },
    enabled: () => phase === 'move',
    onClick: () => clickSpot(hoverSpot()),
  }));
  hots.push(addHot(tray, { label: () => (sel !== null && nextMoves.some(m => m.from === sel && m.to === 'off') ? 'Bear off' : ''), enabled: () => phase === 'move', onClick: () => clickSpot('off') }));
  // cheats
  hots.push(addHot(gun, {
    label: 'Thumb a round out of the cylinder', cheat: true,
    enabled: () => (phase === 'move' || phase === 'pre') && loaded > 0,
    glow: () => (phase === 'move' || phase === 'pre') && watch.away() && loaded > 0,
    hold: watch.cheat(1.8, () => { loaded--; thumbed++; A.sfx('click'); toast(`A heavy black round drops into your palm. <b>${loaded}</b> left in the cylinder.`, 'good', 4); journal('gun', 'The revolver', 'When he isn\'t looking, I can thumb rounds out of the revolver. He checks it when he spins.'); upd(); }),
  }));
  hisDice.forEach(d => hots.push(addHot(d, {
    label: () => (honest ? 'His dice are honest now' : 'Swap in the honest dice'), cheat: true,
    enabled: () => has('dice') && !honest && (phase === 'move' || phase === 'pre'),
    glow: () => has('dice') && !honest && watch.away(),
    locked: () => (has('dice') || honest ? '' : 'His dice. Dark bone, a little too heavy.'),
    hold: watch.cheat(1.6, () => { honest = true; hisDice.forEach(x => x.userData.cube.material.forEach(m => m.color.set(0xd8c8a0))); A.sfx('dice', 1); toast('You switch his loaded dice for Tomás\'s honest ones.', 'good', 4); }),
  })));

  watch.start({
    onCaught: async () => {
      await caughtLine();
      loaded = Math.min(5, loaded + 1);
      A.sfx('cock');
      toast(`He slides another round into the cylinder. <b>${loaded}</b> of 6.`, 'bad', 4);
      upd();
    },
  });

  // looking away from the board, once the game shows itself as a trap
  const offLook = on(dt => {
    if (!confrontReady || (phase !== 'pre' && phase !== 'move')) { lookAway = 0; return; }
    if (lookingAt(BC, 55)) lookAway = Math.max(0, lookAway - dt * 2);
    else lookAway += dt;
    if (lookAway > 2.6) { lookAway = 0; phase = 'break'; ui.cancelChoice?.('break'); }
    A.M.intensity = Math.min(1, 0.4 + myTurns * 0.05);
  });

  const cleanupAll = () => {
    offLook();
    watch.stop();
    for (const h of hots) removeHot(h);
    cleanup(g);
    clearChoices(); status(''); keys('');
  };

  window.__test = { act: 5, moves: () => (phase === 'move' ? nextMoves : []), play: m => ui.cancelChoice?.({ move: m }), dbg: () => ({ phase, roll, done: done.length, next: nextMoves.length, sel, st, loaded, cubeVal, cubeOwner }) };
  try {
    // opening roll
    let first;
    for (;;) {
      const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
      A.sfx('dice', 2);
      await Promise.all([rollDie(myDice[0], a), rollDie(hisDice[0], b)]);
      if (a !== b) { first = a > b ? 'p' : 'd'; roll = [Math.max(a, b), Math.min(a, b)]; break; }
      toast('A tie. Roll again.', '', 1.5);
      await wait(0.6);
    }
    toast(first === 'p' ? 'You go first.' : 'He goes first.', '', 2.5);
    let turn = first, openingUsed = false;
    for (;;) {
      upd();
      if (turn === 'p') {
        const r = await myTurn(openingUsed ? null : roll);
        openingUsed = true;
        if (r) return r;
      } else {
        const r = await hisTurn(openingUsed ? null : roll);
        openingUsed = true;
        if (r) return r;
      }
      const w = B.winner(st);
      if (w) return await gameOver(w);
      if (S.sanity <= 0) return 'blackout';
      turn = turn === 'p' ? 'd' : 'p';
    }
  } finally {
    cleanupAll();
  }

  async function gameOver(w) {
    const kind = B.winKind(st, w);
    if (w === 'p') {
      A.sfx('win');
      await say('dealer', kind > 1 ? 'A gammon. Perfect. PERFECT.' : 'You... won.');
      return { ending: 'hollow' };
    }
    await say('dealer', 'And that is the game, {name}. That is ALL the games.');
    return { ending: 'consumed' };
  }

  // ---------------------------------------------------------------- your turn
  async function myTurn(openRoll) {
    myTurns++;
    if (myTurns === 9 || (S.flags.shot && !confrontReady) || (shadowHandUsed && !confrontReady)) await revealTrap();
    phase = 'pre';
    let dice = openRoll;
    if (!dice) {
      const opts = [{ label: 'Roll', value: 'roll' }];
      if ((cubeOwner === 'c' || cubeOwner === 'p') && cubeVal < 64) opts.push({ label: `Offer the cube (x${cubeVal * 2})`, value: 'double' });
      const v = await choose(opts);
      if (v === 'break') return await confront();
      if (v === 'double') {
        await say('you', 'You turn the cube and push it across the table.', { auto: 1.2 });
        const pw = B.winProbD(st);
        if (pw < 0.24) { await say('dealer', '...No. Take your little win.'); return { ending: 'hollow' }; }
        cubeVal *= 2; cubeOwner = 'd'; placeCube();
        await say('dealer', pick(['Taken. Higher stakes, {name}.', 'I take. Of course I take.']));
        upd();
        const v2 = await choose([{ label: 'Roll', value: 'roll' }]);
        if (v2 === 'break') return await confront();
      }
      dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      A.sfx('dice', 2);
      await Promise.all([rollDie(myDice[0], dice[0], new THREE.Vector3(-0.46, TY + 0.012, 0.3)), rollDie(myDice[1], dice[1], new THREE.Vector3(-0.42, TY + 0.012, 0.31))]);
    }
    roll = dice;
    upd();
    turnPlays = B.plays(st, 'p', dice[0], dice[1]);
    done = []; stack = []; sel = null;
    refreshNext();
    if (!nextMoves.length) {
      toast('You cannot move.', '', 2.5);
      await wait(1.5);
      roll = [0, 0];
      return null;
    }
    phase = 'move';
    for (;;) {
      if (!nextMoves.length) break;
      if (nextMoves.length && nextMoves.every(m => m.from === 'bar') && sel === null) sel = 'bar';
      showMarks();
      const opts = [];
      if (done.length) opts.push({ label: 'Undo', value: 'undo' });
      const v = await choose(opts);
      if (v === 'break') { clearMarks(); return await confront(); }
      if (v === 'undo') { st = stack.pop(); done.pop(); sel = null; refreshNext(); await layout(true); upd(); continue; }
      if (v && v.move) {
        stack.push(B.clone(st));
        const m = v.move;
        const hit = m.hit;
        st = B.apply(st, 'p', m);
        done.push(m);
        sel = null;
        A.sfx('checker');
        await layout(true);
        if (hit) { A.sfx('thunk'); toast('You hit one of his checkers.', 'good', 2); }
        refreshNext();
        upd();
      }
    }
    clearMarks();
    phase = 'idle';
    roll = [0, 0];
    // hits you made this turn: he takes rounds out
    const hits = done.filter(m => m.hit).length;
    for (let i = 0; i < hits; i++) {
      if (loaded > 1) {
        loaded--;
        A.sfx('click');
        line('dealer', pick(['Hm. One less.', 'He takes a round out, slowly.', 'Fine. Fewer bullets. Same ending.']), 1.6);
        await wait(0.6);
      }
    }
    upd();
    // the shadows cheat when you are about to win
    if (!shadowHandUsed && st.offP >= 9 && !B.winner(st)) await shadowHand();
    return null;
  }
  function clickSpot(s) {
    if (s === null || phase !== 'move') return;
    if (sel !== null) {
      const m = nextMoves.find(x => x.from === sel && x.to === s);
      if (m) { ui.cancelChoice?.({ move: m }); return; }
    }
    if (nextMoves.some(x => x.from === s)) { sel = s; showMarks(); A.sfx('checker'); }
    else { sel = null; showMarks(); }
  }

  // ---------------------------------------------------------------- his turn
  async function hisTurn(openRoll) {
    phase = 'his';
    watch.freeze(true);
    // he might double
    if (!openRoll && (cubeOwner === 'c' || cubeOwner === 'd') && cubeVal < 64 && B.winProbD(st) > 0.72) {
      dealer.tell('flare', 2);
      await say('dealer', `Double, {name}. The cube says ${cubeVal * 2}.`);
      const v = await choose([{ label: 'Take', value: 'take', sub: 'play on for higher stakes' }, { label: 'Drop', value: 'drop', danger: true, sub: 'you lose the game' }]);
      if (v === 'drop') { await say('dealer', 'You lay down. Good.'); return { ending: 'consumed' }; }
      cubeVal *= 2; cubeOwner = 'p'; placeCube(); upd();
    }
    let dice = openRoll;
    if (!dice) {
      dealer.lookAway('board');
      await wait(0.7);
      const watching = lookingAt(cupSpot, 26);
      const r1 = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      dice = r1;
      if (!watching && !honest && Math.random() < dif.rig) {
        const r2 = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
        const v1 = B.evalD(B.bestPlay(st, r1[0], r1[1]).end), v2 = B.evalD(B.bestPlay(st, r2[0], r2[1]).end);
        dice = v2 > v1 ? r2 : r1;
      } else if (watching && !S.flags.watchDice5) { S.flags.watchDice5 = true; toast('You watch his hand. The dice tumble honestly this time.', '', 3.5); }
      A.sfx('dice', 2);
      await Promise.all([rollDie(hisDice[0], dice[0], new THREE.Vector3(0.36, TY + 0.012, -0.36)), rollDie(hisDice[1], dice[1], new THREE.Vector3(0.4, TY + 0.012, -0.35))]);
    }
    roll = dice;
    upd();
    const play = B.bestPlay(st, dice[0], dice[1], S.diff === 'easy' ? 30 : 0);
    let hits = 0;
    for (const m of play.seq) {
      if (m.hit) hits++;
      st = B.apply(st, 'd', m);
      A.sfx('checker');
      await layout(true);
      await wait(0.25);
    }
    if (!play.seq.length) line('dealer', 'Blocked. Hm.', 1.2);
    roll = [0, 0];
    dealer.lookAtPlayer();
    watch.freeze(false);
    upd();
    for (let i = 0; i < hits; i++) { const r = await roulette(); if (r) return r; }
    return null;
  }

  // ---------------------------------------------------------------- the gun
  async function roulette() {
    watch.freeze(true);
    const inp = C.input;
    await say('dealer', pick(['I hit you. So now...', 'A hit. You know what that means.', 'Spin, spin, spin.']), { auto: 1 });
    const head = dealer.headWorld(new THREE.Vector3());
    const aim = head.clone().lerp(C.camera.position, 0.45);
    aim.y = C.camera.position.y - 0.05;
    const r0 = gun.rotation.clone();
    await fly(gun, aim, 0.7, 0.15);
    gun.lookAt(C.camera.position);
    gun.rotateY(Math.PI);
    if (loaded === 0) {
      A.sfx('spin');
      await wait(0.9);
      dealer.snap();
      await say('dealer', 'EMPTY? Someone has been in my pockets.');
      if (thumbed) watch.add(40);
      loaded = 2;
      A.sfx('cock');
    }
    A.sfx('spin');
    const drum = gun.userData.drum;
    await tween(1.1, k => { drum.rotation.y = k * 20; });
    A.sfx('cock');
    A.duck(2.5);
    A.sfx('heartbeat', 1);
    await wait(0.9);
    A.sfx('heartbeat', 1);
    await wait(0.8);
    const fire = Math.random() < loaded / 6;
    if (fire) {
      A.sfx('darkshot');
      C.fx.black = 1;
      shake(0.12, 1);
      hurt(24);
      S.flags.shot = true;
      loaded = Math.max(1, loaded - 1);
      await wait(1.6);
      await tween(1.8, k => { C.fx.black = 1 - k; });
      A.sfx('ring');
      await say('you', 'It didn\'t fire anything. It fired the dark. For a moment you weren\'t anywhere at all.');
    } else {
      A.sfx('click');
      await wait(0.6);
      loaded = Math.min(5, loaded + 1);
      line('dealer', pick(['Click. Lucky. One more round in, then.', 'Empty. This time.', 'Hm. Click.']), 1.8);
      A.sfx('cock');
    }
    await fly(gun, gunRest, 0.6, 0.1);
    gun.rotation.copy(r0);
    C.input = inp;
    watch.freeze(false);
    upd();
    if (S.sanity <= 0) return 'blackout';
    return null;
  }

  async function shadowHand() {
    shadowHandUsed = true;
    // highest checker in your home board is dragged to the bar
    let p = -1;
    for (let i = 6; i >= 1; i--) if (st.pts[i] > 0) { p = i; break; }
    if (p < 0) return;
    A.sfx('rumble', 2, 0.7);
    A.sfx('whispers', 0.8, 2);
    dealer.tell('flare', 2.5);
    await say('you', 'The shadows on the floor slide up the table legs. A black hand of smoke closes over one of your checkers.');
    st.pts[p]--;
    st.barP++;
    await layout(true);
    A.sfx('thunk');
    await say('dealer', 'Did you really think I would let you bear off? I make the rules, {name}. All of them.');
    journal('rigged', 'It is rigged', 'Just as I was winning, the shadows dragged one of my checkers back to the bar. He will never let the game end, not while I play it his way.');
    confrontReady = true;
    await hintLookAway();
  }
  async function revealTrap() {
    if (confrontReady) return;
    confrontReady = true;
    await say('you', 'You watch his dice. His hands. The board. And you understand: there is no last turn. The game is built so that it never ends unless he wants it to.');
    await hintLookAway();
  }
  async function hintLookAway() {
    if (has('lastpage')) await say('you', 'Edward\'s words: <i>he only exists where you look. Stop looking at the board.</i>');
    else if (has('diary')) await say('you', '"Be afraid of winning the way he wants you to." What if you just... didn\'t look at his game?');
    else await say('you', 'What happens if you simply stop looking at his board?');
    toast('Drag your view away from the board, and keep it away.', '', 6);
  }

  // ---------------------------------------------------------------- breaking the rules
  async function confront() {
    phase = 'break';
    clearChoices();
    clearMarks();
    A.music('act5', { restart: true, hopeful: true });
    A.M.intensity = 0;
    dealer.u.uFreeze.value = 0.85;
    dealer.snap();
    await say('dealer', 'WHAT ARE YOU DOING. LOOK AT THE BOARD. ROLL THE DICE.', { auto: 1.6 });
    await say('you', 'You don\'t. For the first time, the game doesn\'t pull at you. The shackle on your ankle cracks like old ice.', { auto: 3 });
    A.sfx('shackle');
    watch.stop();
    // stand up, chain or no chain
    C.walk.x = 0; C.walk.z = 1.05; C.walk.radius = 6.5;
    setView('walk', { yaw: C.view.yaw, pitch: C.view.pitch });
    cross(true);
    keys('<kbd>W A S D</kbd> walk &nbsp; <kbd>drag</kbd> look &nbsp; <kbd>click</kbd> glowing things');
    status('<small>He is frozen. Not for long.</small>');
    const knowsDark = has('diary') || has('lastpage');
    const canMirror = has('shard') && flag('mirror');
    let dark = false, poured = false, valveOpen = false, result = null;
    const bh = [];
    const H = (obj, o) => bh.push(addHot(obj, Object.assign({ reach: 2.2 }, o)));
    H(W.candle.group, {
      label: 'Pinch out the candle', enabled: () => knowsDark && !dark, glow: () => knowsDark && !dark,
      locked: () => (dark ? '' : knowsDark ? '' : 'The candle. If only you knew what he can\'t see in the dark...'),
      onClick: async () => {
        dark = true;
        A.sfx('gutter');
        W.candle.out = true;
        const save = [W.hemi.intensity, W.rim.intensity, W.back.intensity];
        W.hemi.intensity = 0; W.rim.intensity = 0; W.back.intensity = 0;
        C.fx.vig = 1.4;
        dealer.lookAway('dark');
        await say('dealer', 'Where... WHERE ARE YOU? I cannot SEE you.', { auto: 1.5 });
        await say('you', 'The whole cellar is absolute shadow now. Everything is hidden from him. Even you. Only his eyes and his grin still glow.', { auto: 3 });
        if (!canMirror) {
          await wait(4);
          await say('you', 'You have nothing to show him. Nothing to hold up to that grin.', { auto: 2.5 });
          await wait(2);
          A.sfx('ignite');
          W.candle.out = false;
          W.hemi.intensity = save[0]; W.rim.intensity = save[1]; W.back.intensity = save[2];
          C.fx.vig = 1;
          dark = false;
          await say('dealer', 'Clever. Clever. But you have nothing to show me, {name}.');
          result = 'fail';
        } else {
          toast('Hold up the mirror shard to his face.', '', 4);
          W.restoreLights = save;
        }
      },
    });
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), new THREE.MeshBasicMaterial({ visible: false }));
    face.userData.noOutline = true;
    dealer.headGrp.add(face);
    H(face, {
      label: 'Hold up the mirror shard to his grin', reach: 4,
      enabled: () => dark && canMirror, glow: () => false,
      onClick: () => { result = 'shattered'; },
    });
    // the escape by fire
    H(W.table, {
      label: () => (poured ? (valveOpen ? 'Strike a match' : '') : 'Pour the lamp oil over the table and every page you found'),
      enabled: () => has('oil') && (!poured || (valveOpen && has('matches'))),
      glow: () => has('oil') && (!poured || (valveOpen && has('matches'))),
      locked: () => (!has('oil') ? '' : ''),
      onClick: async () => {
        if (!poured) {
          poured = true;
          A.sfx('melt');
          await say('you', 'You pour the oil across the old oak. You lay every page on it: Edward\'s diary, Margie\'s letter, Tomás\'s notebook. Everything you learned. Everything that proves any of you were here.', { auto: 4 });
          W.table.traverse(o => { if (o.isMesh && o.material?.roughness !== undefined) { o.material = o.material.clone(); o.material.roughness = 0.1; } });
          if (!flag('valve') && !valveOpen) toast(has('map') ? 'The valve: behind the third stone of the east wall.' : 'Fire needs more than oil to take this whole place. There was a gas line, somewhere...', '', 5);
          return;
        }
        result = 'sacrificial';
      },
    });
    H(W.props.valve, {
      label: () => (valveOpen ? 'The gas is hissing' : flag('valve') ? 'Open the gas valve' : 'Pull the third stone and open the valve'),
      enabled: () => !valveOpen && (flag('valve') || has('map')),
      glow: () => !valveOpen && poured && (flag('valve') || has('map')),
      locked: () => (valveOpen ? '' : 'The east wall. One stone sounds hollow.'),
      hold: {
        time: 2.2, onStart: () => A.sfx('creak', 1),
        onDone: async () => {
          if (!flag('valve')) { setFlag('valve'); W.props.valveStone.position.x = -0.25; W.props.valveWheel.visible = W.props.valvePipe.visible = true; }
          valveOpen = true;
          A.sfx('hum60');
          const hiss = setInterval(() => A.sfx('blow', 0.3), 600);
          setTimeout(() => clearInterval(hiss), 30000);
          toast('Gas hisses into the cellar. You can taste it.', '', 4);
          if (!has('matches')) toast('You need a light.', 'bad', 4);
        },
      },
    });
    const recover = S.diff === 'easy' ? 80 : S.diff === 'normal' ? 60 : 40;
    let t = 0;
    const offW = on(dt => {
      walkStep(dt);
      if (!dark) t += dt;
    });
    const back = choose([{ label: 'Sit back down and roll', value: 'back' }]);
    back.then(v => { if (v === 'back' && !result) result = 'back'; });
    while (!result && t < recover) await wait(0.1);
    offW();
    clearChoices();
    for (const h of bh) removeHot(h);
    dealer.headGrp.remove(face);
    cross(false);
    if (result === 'shattered' || result === 'sacrificial') {
      status(''); keys('');
      return { ending: result };
    }
    // back to his game
    if (result !== 'back') {
      A.sfx('stinger');
      await say('dealer', 'ENOUGH. Sit. DOWN.');
      hurt(result === 'fail' ? 8 : 12);
    }
    if (W.candle.out) { W.candle.out = false; A.sfx('ignite'); }
    if (W.restoreLights) { [W.hemi.intensity, W.rim.intensity, W.back.intensity] = W.restoreLights; W.restoreLights = null; C.fx.vig = 1; }
    dealer.u.uFreeze.value = 0;
    dealer.lookAtPlayer();
    setView('seat', { yaw: 0, pitch: -0.3 });
    keys('<kbd>roll</kbd>, then click a checker and a point &nbsp; <kbd>R</kbd> rules');
    A.music('act5', { restart: true, hopeful: false });
    watch.start({ onCaught: async () => { await caughtLine(); loaded = Math.min(5, loaded + 1); upd(); } });
    layout();
    upd();
    // you lose this turn
    roll = [0, 0];
    return null;
  }
}
