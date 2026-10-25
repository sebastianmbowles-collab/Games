// ACT IV: THE CHESS OF GLASS. Real chess against the Dealer, with a move
// clock. Run out of time and he slams the table and scrambles your pieces.
import { C, THREE, wait, addHot, removeHot, pick, on, tween, shake } from '../core.js';
import { S, D, journal, has } from '../state.js';
import { dealer } from '../dealer.js';
import { A } from '../audio.js';
import { ui, say, line, choose, clearChoices, status, toast, keys } from '../ui.js';
import { watch, hurt, caughtLine } from '../watch.js';
import { shatter } from '../fx.js';
import { chessTex } from '../tex.js';
import * as E from './chessEngine.js';
import ChessWorker from './chessWorker.js?worker&inline';
import { TY, fly, cleanup } from './common.js';

export const RULES4 = `<h2>The Chess of Glass</h2>
<p>Real chess. You play the clear pieces, nearest you, and you move first. Castling, en passant and promotion all work. <b>Checkmate him to win.</b> If you are checkmated, you lose. A draw means you play again.</p>
<p><b>Click one of your pieces</b>, then click a glowing square to move it.</p>
<h3>The clock</h3>
<p>You have only a few seconds for each move (shown at the top). If time runs out, <b>he slams the table</b> and two or three of your pieces jump to random squares. He never knocks you straight into checkmate.</p>
<p>If you found the <b>lead weight</b>, click it and then one of your pieces: that piece can't be moved by a slam. Click the weight again to move it to another piece.</p>
<h3>Reading him</h3>
<p>Flare: he has a strong plan. Tight smoke: his last move looks dangerous but isn't. Twitching teeth: <b>you have a winning move on the board right now.</b></p>
<h3>Cheating</h3>
<p>When he looks away, <b>hold one of your pieces</b> and you can slide it one legal, non-capturing move for free.</p>`;

const SQ = 0.068;
const BC = new THREE.Vector3(-0.04, TY, -0.04);
const sqPos = (i, y = 0) => new THREE.Vector3(BC.x + ((i & 7) - 3.5) * SQ, TY + 0.012 + y, BC.z + (3.5 - (i >> 3)) * SQ);
const NAME = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

function pieceGeo(t) {
  const P = (arr) => new THREE.LatheGeometry(arr.map(([x, y]) => new THREE.Vector2(x, y)), 24);
  const base = [[0.02, 0], [0.021, 0.004], [0.017, 0.008], [0.013, 0.01]];
  if (t === 'P') return P([...base, [0.008, 0.022], [0.01, 0.025], [0.006, 0.027], [0.009, 0.033], [0.008, 0.039], [0.004, 0.042], [0, 0.043]]);
  if (t === 'R') return P([...base, [0.012, 0.035], [0.015, 0.037], [0.015, 0.048], [0.011, 0.048], [0.011, 0.044], [0, 0.044]]);
  if (t === 'B') return P([...base, [0.008, 0.03], [0.011, 0.033], [0.007, 0.036], [0.01, 0.045], [0.007, 0.054], [0.003, 0.058], [0.004, 0.061], [0, 0.062]]);
  if (t === 'Q') return P([...base, [0.009, 0.038], [0.013, 0.041], [0.008, 0.045], [0.012, 0.058], [0.014, 0.064], [0.009, 0.066], [0.005, 0.07], [0, 0.071]]);
  if (t === 'K') return P([...base, [0.01, 0.04], [0.014, 0.043], [0.009, 0.047], [0.012, 0.062], [0.006, 0.066], [0.002, 0.07], [0.002, 0.08], [0, 0.08]]);
  // knight: a lathe base and an extruded horse head
  const g = P([...base, [0.011, 0.016], [0.013, 0.019], [0, 0.019]]);
  return g;
}
function knightHead() {
  const s = new THREE.Shape();
  s.moveTo(-0.01, 0); s.lineTo(0.012, 0); s.lineTo(0.01, 0.018); s.lineTo(0.016, 0.026); s.lineTo(0.014, 0.034);
  s.lineTo(0.004, 0.04); s.lineTo(-0.004, 0.044); s.lineTo(-0.006, 0.038); s.lineTo(-0.012, 0.028); s.lineTo(-0.012, 0.012); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 2 });
  geo.translate(0, 0.017, -0.006);
  return geo;
}

export async function playChess() {
  const dif = D();
  const g = new THREE.Group();
  C.scene.add(g);
  const boardMat = new THREE.MeshPhysicalMaterial({ map: chessTex(), roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(SQ * 8, 0.012, SQ * 8), [null, null, boardMat, null, null, null].map(m => m || new THREE.MeshStandardMaterial({ color: 0x080a10, roughness: 0.2 })));
  board.position.set(BC.x, TY + 0.006, BC.z);
  board.receiveShadow = true;
  g.add(board);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(SQ * 8 + 0.03, 0.01, SQ * 8 + 0.03), new THREE.MeshStandardMaterial({ color: 0x101622, roughness: 0.25, metalness: 0.6 }));
  frame.position.set(BC.x, TY + 0.004, BC.z);
  g.add(frame);
  const glassW = new THREE.MeshPhysicalMaterial({ color: 0xeaf2ff, roughness: 0.04, metalness: 0, transmission: 1, thickness: 0.02, ior: 1.5, transparent: true, opacity: 1, envMapIntensity: 1 });
  const glassB = new THREE.MeshPhysicalMaterial({ color: 0x2a2f3c, roughness: 0.08, metalness: 0.1, transmission: 0.55, thickness: 0.02, ior: 1.5, clearcoat: 1, transparent: true });
  const geos = {};
  for (const t of 'PNBRQK') geos[t] = pieceGeo(t);
  const headGeo = knightHead();
  const makePiece = p => {
    const t = p.toUpperCase();
    const W = E.isW(p);
    const grp = new THREE.Group();
    const m = new THREE.Mesh(geos[t], W ? glassW : glassB);
    m.castShadow = true;
    grp.add(m);
    if (t === 'N') { const h = new THREE.Mesh(headGeo, W ? glassW : glassB); h.castShadow = true; h.rotation.y = W ? Math.PI / 2 : -Math.PI / 2; grp.add(h); }
    if (t === 'K') { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.003, 0.003), W ? glassW : glassB); cr.position.y = 0.076; grp.add(cr); }
    grp.scale.setScalar(1.12);
    grp.userData.p = p;
    return grp;
  };

  let game = E.newGame();
  const meshes = new Array(64).fill(null);
  const graveyard = { w: [], b: [] };
  const rebuild = () => {
    for (let i = 0; i < 64; i++) { if (meshes[i]) g.remove(meshes[i]); meshes[i] = null; }
    for (let i = 0; i < 64; i++) if (game.b[i]) { const m = makePiece(game.b[i]); m.position.copy(sqPos(i)); g.add(m); meshes[i] = m; }
    placeWeight();
  };

  // move markers
  const dotGeo = new THREE.CircleGeometry(0.012, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.2, 0.5), transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false });
  const selMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.9, 2), transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false });
  const dots = [];
  const sel = new THREE.Mesh(new THREE.PlaneGeometry(SQ, SQ), selMat);
  sel.rotation.x = -Math.PI / 2; sel.visible = false;
  g.add(sel);
  const lastMat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.18, depthWrite: false });
  const lastA = new THREE.Mesh(new THREE.PlaneGeometry(SQ, SQ), lastMat), lastB = lastA.clone();
  lastA.rotation.x = lastB.rotation.x = -Math.PI / 2; lastA.visible = lastB.visible = false;
  g.add(lastA, lastB);
  const showDots = moves => {
    for (const d of dots) g.remove(d);
    dots.length = 0;
    for (const m of moves) { const d = new THREE.Mesh(dotGeo, dotMat); d.rotation.x = -Math.PI / 2; d.position.copy(sqPos(m.to, 0.001)); g.add(d); dots.push(d); }
  };

  // the lead weight
  const hasWeight = has('weight');
  let weightOn = -1, weightMode = false;
  const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.03, 12), new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.5, metalness: 0.8 }));
  weight.castShadow = true;
  const weightRest = new THREE.Vector3(-0.42, TY + 0.015, 0.3);
  weight.position.copy(weightRest);
  weight.visible = hasWeight;
  g.add(weight);
  function placeWeight() {
    if (weightOn >= 0 && game.b[weightOn] && E.isW(game.b[weightOn])) weight.position.copy(sqPos(weightOn, 0.09));
    else { weightOn = -1; weight.position.copy(weightRest); }
  }

  let phase = 'idle', selSq = -1, legalNow = [], left = dif.moveLimit, chosen = null;
  const hots = [];
  ui.rules = RULES4;
  keys('<kbd>click</kbd> a piece, then a square &nbsp; <kbd>R</kbd> rules &nbsp; <kbd>J</kbd> journal');
  const upd = () => {
    const chk = E.inCheck(game, 'w') ? ' &nbsp; <b style="color:#ff8060">CHECK</b>' : '';
    status(`${phase === 'mine' || phase === 'slide' ? `YOUR MOVE &nbsp; <b>${Math.max(0, Math.ceil(left))}</b>s` : game.turn === 'w' ? 'YOUR MOVE' : 'HE IS THINKING'}${chk}<br><small>taken: ${graveyard.b.map(p => NAME[p.toUpperCase()]).join(', ') || 'nothing'} &nbsp;|&nbsp; lost: ${graveyard.w.map(p => NAME[p.toUpperCase()]).join(', ') || 'nothing'}</small>`);
  };

  const boardHot = addHot(board, {
    label: () => {
      const i = hoverSq();
      if (i < 0) return '';
      if (phase === 'slide') return legalNow.some(m => m.to === i) ? 'Slide it here' : '';
      if (weightMode) return game.b[i] && E.isW(game.b[i]) ? `Pin the ${NAME[game.b[i].toUpperCase()]} with the weight` : '';
      if (selSq >= 0 && legalNow.some(m => m.to === i)) return 'Move here';
      if (game.b[i] && E.isW(game.b[i])) return `Your ${NAME[game.b[i].toUpperCase()]}`;
      return '';
    },
    enabled: () => phase === 'mine' || phase === 'slide',
    onClick: () => clickSq(hoverSq()),
  });
  hots.push(boardHot);
  function hoverSq() {
    const hit = C.ray.intersectObject(board)[0];
    if (!hit) return -1;
    const f = Math.floor((hit.point.x - BC.x) / SQ + 4), r = Math.floor(3.5 - (hit.point.z - BC.z) / SQ + 0.5);
    if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
    return r * 8 + f;
  }
  if (hasWeight) {
    hots.push(addHot(weight, {
      label: () => (weightMode ? 'Put the weight back' : weightOn >= 0 ? 'Move the lead weight' : 'Pick up the lead weight'),
      enabled: () => phase === 'mine', glow: () => phase === 'mine' && weightOn < 0,
      onClick: () => { weightMode = !weightMode; if (!weightMode) { weightOn = -1; placeWeight(); } else toast('Click one of your pieces to pin it with the weight.', '', 3); },
    }));
  }
  // the hold-to-slide cheat lives on an invisible box that follows the hovered own piece
  const slideBox = new THREE.Mesh(new THREE.BoxGeometry(SQ * 0.9, 0.09, SQ * 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  slideBox.userData.noOutline = true;
  slideBox.visible = false;
  g.add(slideBox);
  hots.push(addHot(slideBox, {
    label: () => `Slide this piece while he isn't looking`, cheat: true,
    enabled: () => phase === 'mine' && watch.away(),
    onClick: () => clickSq(slideBox.userData.sq),
    hold: watch.cheat(1.2, () => {
      const i = slideBox.userData.sq;
      const ms = E.legal(game).filter(m => m.from === i && !m.cap && !m.castle && !m.promo);
      if (!ms.length) { toast('That piece has nowhere quiet to go.', '', 2.5); return; }
      phase = 'slide'; legalNow = ms; showDots(ms);
      sel.visible = true; sel.position.copy(sqPos(i, 0.0005));
      toast('Quick. Click where to slide it.', 'good', 3);
    }),
  }));
  const offHover = on(dt => {
    // invisible slide box tracks your piece under the cursor, only when he looks away
    const i = phase === 'mine' && watch.away() && !weightMode ? hoverSq() : -1;
    if (i >= 0 && game.b[i] && E.isW(game.b[i])) { slideBox.visible = true; slideBox.position.copy(sqPos(i, 0.045)); slideBox.userData.sq = i; }
    else if (!C.holding) slideBox.visible = false;
    if (phase === 'mine' && !C.paused) {
      left -= dt;
      A.M.tick = Math.max(0, Math.min(1, 1 - left / dif.moveLimit));
      if (Math.ceil(left) !== Math.ceil(left + dt)) upd();
      if (left < 4 && Math.ceil(left) !== Math.ceil(left + dt)) A.sfx('tick');
      if (left <= 0) { phase = 'slam'; }
    }
  });

  function clickSq(i) {
    if (i < 0) return;
    if (weightMode) {
      if (game.b[i] && E.isW(game.b[i])) { weightOn = i; weightMode = false; placeWeight(); A.sfx('thunk'); toast(`The ${NAME[game.b[i].toUpperCase()]} is pinned. Slams can't move it.`, 'good'); journal('weight4', 'The lead weight', 'The lead weight pins one of my glass pieces. When he slams the table, it stays put.'); }
      return;
    }
    if (phase === 'slide') {
      const m = legalNow.find(x => x.to === i);
      if (!m) return;
      chosen = m; phase = 'slid';
      return;
    }
    if (selSq >= 0) {
      const ms = legalNow.filter(x => x.to === i);
      if (ms.length) { chosen = ms; phase = 'chosen'; return; }
    }
    if (game.b[i] && E.isW(game.b[i])) {
      selSq = i;
      legalNow = E.legal(game).filter(m => m.from === i);
      sel.visible = true; sel.position.copy(sqPos(i, 0.0005));
      showDots(legalNow);
      A.sfx('clink', 0.5);
    } else { selSq = -1; sel.visible = false; showDots([]); }
  }

  async function animateMove(m) {
    const mover = meshes[m.from];
    const capSq = m.ep ? m.to + (E.isW(game.b[m.from]) ? -8 : 8) : m.to;
    const victim = meshes[capSq];
    if (victim) {
      const vp = victim.position.clone();
      g.remove(victim);
      meshes[capSq] = null;
      shatter(vp.clone().add(new THREE.Vector3(0, 0.03, 0)), E.isW(victim.userData.p) ? 0xe0ecff : 0x303848);
      A.sfx('shatter');
      shake(0.012, 0.25);
      graveyard[E.isW(victim.userData.p) ? 'w' : 'b'].push(victim.userData.p);
      if (E.isW(victim.userData.p)) { hurt(victim.userData.p.toUpperCase() === 'P' ? 2 : 5, 'quiet'); if (weightOn === capSq) weightOn = -1; }
    }
    meshes[m.from] = null;
    await fly(mover, sqPos(m.to), 0.35, 0.05);
    A.sfx('clink', 1.2);
    meshes[m.to] = mover;
    if (m.castle) {
      const rf = m.castle === 'K' ? m.to + 1 : m.to - 2, rt = m.castle === 'K' ? m.to - 1 : m.to + 1;
      const rook = meshes[rf]; meshes[rf] = null;
      await fly(rook, sqPos(rt), 0.3, 0.04);
      meshes[rt] = rook;
      if (weightOn === rf) weightOn = rt;
    }
    if (m.promo) { g.remove(mover); const np = makePiece(m.promo); np.position.copy(sqPos(m.to)); g.add(np); meshes[m.to] = np; }
    if (weightOn === m.from) weightOn = m.to;
    placeWeight();
    lastA.visible = lastB.visible = true;
    lastA.position.copy(sqPos(m.from, 0.0004)); lastB.position.copy(sqPos(m.to, 0.0004));
  }

  // the AI runs in a worker so the room keeps breathing while he thinks
  let worker = null;
  try { worker = new ChessWorker(); } catch { worker = null; }
  const think = () => new Promise(res => {
    const plain = { b: game.b.slice(), turn: game.turn, castle: { ...game.castle }, ep: game.ep, half: game.half, full: game.full, hist: game.hist.slice(-12) };
    const depth = dif.chessDepth, ms = dif.chessTime, noise = S.diff === 'easy' ? 160 : 0;
    if (!worker) { setTimeout(() => { const r = E.search(plain, depth, ms, noise); res(r); }, 30); return; }
    const id = Math.random();
    worker.onmessage = e => { if (e.data.id === id) res(e.data); };
    worker.postMessage({ g: plain, depth, ms, noise, id });
  });

  watch.start({
    onCaught: async () => {
      await caughtLine();
      const pawns = [];
      for (let i = 0; i < 64; i++) if (game.b[i] === 'P' && i !== weightOn) pawns.push(i);
      const i = pawns.length ? pick(pawns) : -1;
      if (i >= 0) {
        A.sfx('shatter');
        shatter(sqPos(i, 0.03), 0xe0ecff);
        g.remove(meshes[i]); meshes[i] = null; game.b[i] = null;
        graveyard.w.push('P');
        game.hist.push(E.key(game));
        toast('He flicks one of your pawns. It bursts into glitter.', 'bad', 4);
      }
      upd();
    },
  });

  const cleanupAll = () => {
    offHover();
    watch.stop();
    worker?.terminate();
    for (const h of hots) removeHot(h);
    cleanup(g);
    clearChoices(); status(''); keys('');
    A.M.tick = 0;
  };

  let lastScore, lastWasThreat;
  window.__test = { act: 4, moves: () => (phase === 'mine' ? E.legal(game) : []), play: m => { selSq = m.from; legalNow = E.legal(game).filter(x => x.from === m.from); clickSq(m.to); } };
  try {
    rebuild();
    let plies = 0;
    for (;;) {
      const st = E.status(game);
      if (st) {
        if (st === 'checkmate') {
          if (game.turn === 'b') {
            dealer.tell('tremor', 3);
            await say('dealer', 'Checkmate. ...Checkmate? To ME?');
            return 'win';
          }
          await say('dealer', 'Checkmate, little clock. Everything breaks.');
          return 'lose';
        }
        await say('dealer', { stalemate: 'Stalemate. Nobody wins. So we play again.', fifty: 'Fifty moves of nothing. Again.', repetition: 'Round and round. Like you. Again.', material: 'Not enough left to win. Again.' }[st]);
        hurt(6);
        game = E.newGame(); graveyard.w = []; graveyard.b = []; weightOn = -1; rebuild();
        continue;
      }
      if (game.turn === 'w') {
        // your move
        selSq = -1; sel.visible = false; showDots([]); weightMode = false; chosen = null;
        left = dif.moveLimit;
        await tellsBefore();
        phase = 'mine';
        upd();
        const resign = choose([{ label: 'Resign', value: 'resign', danger: true }]);
        let resigned = false;
        resign.then(v => { if (v === 'resign') resigned = true; });
        while (phase === 'mine' || phase === 'slide') {
          await wait(0.05);
          if (resigned) break;
        }
        clearChoices();
        if (resigned) { await say('dealer', 'You lay your king down. Good. Again.'); return 'lose'; }
        if (phase === 'slam') { await slam(); continue; }
        if (phase === 'slid') {
          // a free, quiet move: the turn stays yours
          const m = chosen;
          sel.visible = false; showDots([]);
          await animateMove(m);
          E.make(game, m);
          game.turn = 'w'; game.ep = -1;
          game.hist.push(E.key(game));
          A.sfx('cardSlide');
          if (Math.random() < 0.45) { watch.add(22); line('dealer', 'Hm? Something... moved?', 1.5); }
          upd();
          continue;
        }
        let m = chosen[0];
        if (chosen.length > 1) {
          const pr = await choose(['Q', 'R', 'B', 'N'].map(p => ({ label: `Promote to ${NAME[p]}`, value: p })));
          m = chosen.find(x => x.promo === pr) || m;
        }
        phase = 'moving';
        sel.visible = false; showDots([]);
        await animateMove(m);
        E.play(game, m);
        plies++;
        A.M.tick = 0;
        upd();
      } else {
        phase = 'his';
        upd();
        watch.freeze(true);
        dealer.lookAway('board');
        const t0 = C.t;
        const r = await think();
        if (C.t - t0 < 0.8) await wait(0.8 - (C.t - t0));
        dealer.lookAtPlayer();
        watch.freeze(false);
        const m = (r && r.move && E.legal(game).find(x => x.from === r.move.from && x.to === r.move.to && (x.promo || null) === (r.move.promo || null))) || E.legal(game)[0];
        const gaveCheck = (() => { const u = E.make(game, m); const c = E.inCheck(game, 'w'); E.unmake(game, u); return c; })();
        await animateMove(m);
        E.play(game, m);
        lastScore = r ? r.score : 0;
        lastWasThreat = gaveCheck || !!m.cap;
        if (gaveCheck) line('dealer', pick(['Check.', 'Check, {name}.', 'Your king is cold.']), 1.4);
        else if (Math.random() < 0.2) line('dealer', pick(['Tick.', 'Tock.', 'Glass.', 'Careful.']), 1.2);
        upd();
      }
      if (S.sanity <= 0) return 'blackout';
    }
  } finally {
    cleanupAll();
  }

  async function tellsBefore() {
    const tp = S.diff === 'easy' ? 1 : S.diff === 'normal' ? 0.85 : 0.7;
    // do you have something big?
    const moves = E.legal(game);
    let best = 0;
    if (moves.length) {
      const r = E.search(game, 2, 250);
      const now = E.evaluate(game);
      best = r ? r.score - now : 0;
      if (r && r.score > 50000) best = 9999;
    }
    if (best >= 260 && Math.random() < tp) { dealer.tell('tremor', dif.tell * 1.3); journal('tremor4', 'He trembles at the board', 'When his teeth flicker at the chessboard, I have a winning move somewhere. Look for captures and checks.'); return; }
    if (lastScore !== undefined && lastScore > 220 && Math.random() < tp) { dealer.tell('flare', dif.tell); return; }
    if (lastWasThreat && lastScore !== undefined && lastScore <= 30 && Math.random() < tp) dealer.tell('condense', dif.tell);
  }

  async function slam() {
    clearChoices();
    A.duck(1.2);
    await wait(0.5);
    dealer.snap();
    await dealer.slam();
    A.sfx('slam');
    shake(0.08, 0.7);
    C.fx.flash = 0.15;
    // everything jumps
    const all = meshes.filter(Boolean);
    await tween(0.25, k => { for (const m of all) m.position.y = TY + 0.012 + Math.sin(k * Math.PI) * 0.03; });
    const mine = [];
    for (let i = 0; i < 64; i++) if (game.b[i] && E.isW(game.b[i]) && game.b[i] !== 'K' && i !== weightOn) mine.push(i);
    const n = Math.min(mine.length, 2 + (Math.random() < 0.5 ? 1 : 0));
    let done = false;
    for (let tries = 0; tries < 80 && !done; tries++) {
      const pickSqs = mine.slice().sort(() => Math.random() - 0.5).slice(0, n);
      const b = game.b.slice();
      const moved = [];
      let ok = true;
      for (const s of pickSqs) {
        const p = b[s];
        const empt = [];
        for (let i = 0; i < 64; i++) if (!b[i] && !(p === 'P' && (i < 8 || i >= 56))) empt.push(i);
        if (!empt.length) { ok = false; break; }
        const to = pick(empt);
        b[to] = p; b[s] = null; moved.push([s, to]);
      }
      if (!ok) continue;
      const test = { ...game, b, castle: { ...game.castle }, ep: -1 };
      for (const [s] of moved) { if (s === 0) test.castle.Q = false; if (s === 7) test.castle.K = false; }
      if (E.inCheck(test, 'w') || E.inCheck(test, 'b')) continue;
      if (!E.legal(test).length) continue;
      game.b = b; game.castle = test.castle; game.ep = -1;
      game.hist.push(E.key(game));
      const ps = moved.map(([s, to]) => { const m = meshes[s]; meshes[s] = null; meshes[to] = m; return fly(m, sqPos(to), 0.35, 0.06); });
      await Promise.all(ps);
      done = true;
    }
    for (let i = 0; i < 64; i++) if (meshes[i]) meshes[i].position.copy(sqPos(i));
    placeWeight();
    hurt(5);
    if (!S.flags.slamTip && has('weight')) { S.flags.slamTip = true; toast('The lead weight would have held a piece still.', '', 4); }
    line('dealer', pick(['TOO SLOW.', 'Tick. Tock. CRASH.', 'Think faster.']), 1.5);
    upd();
  }
}
