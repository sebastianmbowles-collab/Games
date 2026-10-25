// ACT II: THE CARVED LABYRINTH. Bring the Child, Mother and Father home
// before the obsidian wolf eats them. Hidden paths show in the candle's shadow.
import { C, THREE, wait, addHot, removeHot, rand, pick, lookingAt, on } from '../core.js';
import { S, D, journal } from '../state.js';
import { dealer } from '../dealer.js';
import { A } from '../audio.js';
import { ui, say, line, choose, clearChoices, status, toast, keys } from '../ui.js';
import { watch, hurt, heal, caughtLine } from '../watch.js';
import { labyrinthTex } from '../tex.js';
import { W } from '../world.js';
import { TY, dieMesh, rollDie, setDieFace, fly, cleanup } from './common.js';

export const RULES2 = `<h2>The Carved Labyrinth</h2>
<p>Bring all three of your figures (<b>Child, Mother, Father</b>) from START around the ring and up the lane to <b>HOME</b> in the middle.</p>
<p>On your turn, <b>roll</b> your bone die, then <b>click a figure</b> to move it that many spaces. You don't need an exact roll to get home.</p>
<p>Then his <b>obsidian wolf</b> rolls and moves the same number of spaces, either way round the ring. If it lands exactly on one of your figures, that figure goes back to START and you lose Sanity. <b>Seven bites</b> and you lose the match.</p>
<p><b>Hearths</b> (the little carved houses) are safe. <b>Thorns</b> hurt when you land on them. The lane and HOME are safe.</p>
<h3>Hidden paths</h3>
<p>Some paths are carved so faintly you can only see them in the tower's shadow. <b>Hold B</b> and move the mouse left and right to blow on the candle and swing the shadow. When a path glows, a figure that lands exactly on its start will take it. Blow too long and the flame goes out.</p>
<h3>Cheating</h3>
<p>When he looks away you can <b>hold your die</b> to turn it up by one, or <b>hold a figure</b> to nudge it one space. If you watch his die while he rolls, he can't fix his roll.</p>`;

const CENTER = new THREE.Vector3(-0.06, TY, 0.0);
const RING_R = 0.3;
const SAFE = new Set([0, 6, 12, 18]);
const THORN = new Set([3, 14, 20]);
const LANE_FROM = 22;
const HOME = 26;
const ang = i => Math.PI / 2 + (i * Math.PI * 2) / 24; // angle in the x/z plane
const ringPos = i => new THREE.Vector3(CENTER.x + Math.cos(ang(i)) * RING_R, TY + 0.006, CENTER.z + Math.sin(ang(i)) * RING_R);
const LANE = [0.225, 0.16, 0.1];
function pathPos(p) {
  if (p <= LANE_FROM) return ringPos(p);
  if (p >= HOME) return new THREE.Vector3(CENTER.x, TY + 0.006, CENTER.z);
  const r = LANE[p - LANE_FROM - 1];
  return new THREE.Vector3(CENTER.x + Math.cos(ang(LANE_FROM)) * r, TY + 0.006, CENTER.z + Math.sin(ang(LANE_FROM)) * r);
}
// hidden paths: start space -> destination progress
const BRIDGES = [
  { from: 2, to: 7, name: 'the short way round' },
  { from: 5, to: 10, name: 'the root path' },
  { from: 9, to: 25, name: 'the straight path home' },
];
for (const b of BRIDGES) {
  const a = ringPos(b.from), z = pathPos(b.to);
  const mid = a.clone().add(z).multiplyScalar(0.5).sub(CENTER);
  b.angle = Math.atan2(mid.z, mid.x);
}
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };

function figureMesh(kind) {
  const wood = new THREE.MeshStandardMaterial({ color: kind === 0 ? 0xc89a60 : kind === 1 ? 0xa87040 : 0x8a5630, roughness: 0.55 });
  const g = new THREE.Group();
  const prof = [
    [[0.012, 0], [0.012, 0.004], [0.008, 0.008], [0.006, 0.02], [0.008, 0.026], [0.0085, 0.031], [0.006, 0.037], [0, 0.039]],
    [[0.016, 0], [0.016, 0.004], [0.011, 0.012], [0.006, 0.032], [0.007, 0.037], [0.0085, 0.043], [0.007, 0.05], [0.004, 0.054], [0.005, 0.057], [0, 0.059]],
    [[0.015, 0], [0.015, 0.004], [0.008, 0.01], [0.007, 0.04], [0.009, 0.046], [0.0095, 0.052], [0.008, 0.058], [0.013, 0.059], [0.013, 0.061], [0.007, 0.062], [0.007, 0.072], [0, 0.072]],
  ][kind].map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), wood);
  m.castShadow = true;
  g.add(m);
  // a generous invisible hit box
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 0.035;
  hit.userData.noOutline = true;
  g.add(hit);
  return g;
}
function wolfMesh() {
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.12, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
  const g = new THREE.Group();
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m;
  };
  add(new THREE.SphereGeometry(0.03, 14, 10), 0, 0.055, 0, 0, 0, 0, 1, 0.85, 1.7);
  add(new THREE.SphereGeometry(0.024, 12, 10), 0, 0.065, 0.035, 0, 0, 0, 1.2, 1.1, 1);
  add(new THREE.SphereGeometry(0.019, 12, 10), 0, 0.083, 0.062);
  add(new THREE.ConeGeometry(0.011, 0.04, 10), 0, 0.077, 0.09, Math.PI / 2);
  for (const s of [-1, 1]) {
    add(new THREE.ConeGeometry(0.007, 0.022, 6), s * 0.01, 0.103, 0.058, -0.2, 0, s * 0.3);
    for (const z of [-0.03, 0.03]) add(new THREE.CylinderGeometry(0.0055, 0.004, 0.05, 6), s * 0.014, 0.025, z);
  }
  add(new THREE.ConeGeometry(0.008, 0.06, 8), 0, 0.06, -0.06, -1.9);
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.2), toneMapped: false });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), eyeM); e.position.set(s * 0.008, 0.088, 0.077); g.add(e); }
  g.scale.setScalar(1.25);
  return g;
}

export async function playLabyrinth() {
  const dif = D();
  const g = new THREE.Group();
  C.scene.add(g);
  // the board
  const spaces = [];
  for (let i = 0; i < 24; i++) { const p = ringPos(i).sub(CENTER); const o = [p.x, p.z]; o.safe = SAFE.has(i); o.thorn = THORN.has(i); spaces.push(o); }
  const lane = [1, 2, 3].map(k => { const p = pathPos(LANE_FROM + k).sub(CENTER); return [p.x, p.z]; });
  const tex = labyrinthTex(spaces, lane, [0, 0]);
  const board = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.41, 0.025, 64), [
    new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ color: 0x2a160c }),
  ]);
  // map the texture square onto the round top
  const uv = board.geometry.attributes.uv, pos = board.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    if (Math.abs(pos.getY(i) - 0.0125) < 1e-4) uv.setXY(i, 0.5 + pos.getX(i) / 1.0, 0.5 - pos.getZ(i) / 1.0);
  }
  board.position.set(CENTER.x, TY + 0.0125 - 0.019, CENTER.z);
  board.receiveShadow = true;
  g.add(board);
  // the carved tower in the middle casts the shadow
  const tower = new THREE.Group();
  const tw = new THREE.MeshStandardMaterial({ color: 0x4a2c16, roughness: 0.7 });
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.19, 10), tw); t1.position.y = 0.095;
  const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 10), tw); t2.position.y = 0.215;
  t1.castShadow = t2.castShadow = true;
  tower.add(t1, t2);
  tower.position.set(CENTER.x, TY + 0.006, CENTER.z);
  g.add(tower);
  // hidden carvings that only show in the shadow
  const bridgeMeshes = BRIDGES.map(b => {
    const a = ringPos(b.from), z = pathPos(b.to);
    const len = a.distanceTo(z);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.018, len), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(z.z - a.z, z.x - a.x) - Math.PI / 2;
    m.position.copy(a).add(z).multiplyScalar(0.5);
    m.position.y = TY + 0.0075;
    g.add(m);
    return m;
  });
  // pieces
  const NAMES = ['Child', 'Mother', 'Father'];
  const figs = [0, 1, 2].map(k => ({ k, name: NAMES[k], p: 0, mesh: figureMesh(k), chained: 0 }));
  figs.forEach(f => g.add(f.mesh));
  const wolf = { s: 12, mesh: wolfMesh(), bites: 0 };
  g.add(wolf.mesh);
  const myDie = dieMesh(false, 0.028);
  myDie.position.set(-0.52, TY + 0.014, 0.36);
  g.add(myDie);
  const hisDie = dieMesh(true, 0.028);
  hisDie.position.set(0.32, TY + 0.014, -0.4);
  g.add(hisDie);

  const place = (f, animate) => {
    const same = figs.filter(o => o.p === f.p);
    const idx = same.indexOf(f);
    const base = pathPos(f.p);
    const off = same.length > 1 ? new THREE.Vector3(Math.cos(idx * 2.1) * 0.016, 0, Math.sin(idx * 2.1) * 0.016) : new THREE.Vector3();
    const to = base.add(off);
    if (animate) return fly(f.mesh, to, 0.25, 0.03);
    f.mesh.position.copy(to);
    return Promise.resolve();
  };
  const placeWolf = (animate) => {
    const to = ringPos(wolf.s);
    wolf.mesh.rotation.y = -ang(wolf.s) + Math.PI;
    if (animate) return fly(wolf.mesh, to, 0.22, 0.04);
    wolf.mesh.position.copy(to);
    return Promise.resolve();
  };
  figs.forEach(f => place(f));
  placeWolf();

  // candle: the light swings around the board as you blow
  const c = W.candle;
  const lightHome = c.light.position.clone();
  const candleAng = Math.atan2(c.group.position.z - CENTER.z, c.group.position.x - CENTER.x);
  let aim = 0, aimHold = 0, breath = 0, guttered = false;
  const shadowAng = () => candleAng + aim + Math.PI;
  const revealed = b => !c.out && angDiff(shadowAng(), b.angle) < 0.24;

  let phase = 'idle', roll = 0, turned = false, nudged = false;
  const hots = [];
  ui.rules = RULES2;
  keys('<kbd>roll</kbd>, then click a figure &nbsp; <kbd>hold B</kbd> + move mouse: blow on the candle &nbsp; <kbd>R</kbd> rules');
  const home = () => figs.filter(f => f.p >= HOME).length;
  const upd = () => {
    status(`HOME &nbsp; ${home()} / 3 &nbsp;&middot;&nbsp; BITES &nbsp; ${wolf.bites} / 7${roll ? `<br><small>YOU ROLLED ${roll}</small>` : ''}${aim !== 0 && !c.out ? '<br><small>the flame leans</small>' : ''}`);
  };

  const off = on(dt => {
    // blowing on the candle
    const blowing = phase !== 'idle' && phase !== 'his' && C.keys.b && !c.out;
    if (blowing) {
      aimHold += dt;
      breath += dt;
      const target = Math.max(-1, Math.min(1, C.mouse.nx * 1.3)) * 1.05;
      aim += (target - aim) * Math.min(1, dt * 5);
      if (Math.random() < dt * 4) A.sfx('blow', 0.4);
      if (breath > 4.2) { guttered = true; c.out = true; A.sfx('gutter'); toast('You blew too hard. The flame goes out.', 'bad', 3); }
    } else breath = Math.max(0, breath - dt * 0.5);
    c.lean = -aim * 0.5 * (blowing ? 1.4 : 0.7);
    // move the light around the board
    const r = 0.62;
    const wpos = new THREE.Vector3(CENTER.x + Math.cos(candleAng + aim) * r, TY + 0.17, CENTER.z + Math.sin(candleAng + aim) * r);
    c.light.position.copy(c.group.worldToLocal(wpos));
    BRIDGES.forEach((b, i) => {
      const want = revealed(b) ? 0.85 : 0;
      const m = bridgeMeshes[i].material;
      m.opacity += (want - m.opacity) * Math.min(1, dt * 4);
    });
    // music follows how close the wolf is
    let near = 99;
    for (const f of figs) if (f.p < LANE_FROM && !SAFE.has(f.p)) near = Math.min(near, ringDist(wolf.s, f.p));
    A.M.intensity += ((near <= 6 ? 1 - near / 8 : 0) - A.M.intensity) * Math.min(1, dt);
    wolf.mesh.position.y = TY + 0.006 + Math.abs(Math.sin(C.t * 2)) * 0.002;
  });

  // ---- hots
  const turnHot = addHot(myDie.userData.cube, {
    label: 'Turn the die up by one', cheat: true,
    enabled: () => phase === 'move' && !turned && roll < 6,
    glow: () => phase === 'move' && watch.away() && !turned && roll < 6,
    hold: watch.cheat(1.3, () => { turned = true; roll++; setDieFace(myDie, roll); A.sfx('wood'); toast(`The die now shows <b>${roll}</b>.`, 'good'); upd(); }),
  });
  hots.push(turnHot);
  for (const f of figs) {
    hots.push(addHot(f.mesh, {
      label: () => (f.p >= HOME ? `${f.name} is home` : phase === 'move' ? (f.chained ? `${f.name} is chained (${f.chained})` : `Move the ${f.name} ${roll}`) : f.name),
      enabled: () => phase === 'move' && f.p < HOME && !f.chained,
      glow: () => phase === 'move' && f.p < HOME && !f.chained,
      onClick: () => { if (phase === 'move') { phase = 'chosen'; chosen = f; } },
    }));
  }
  let chosen = null;
  // nudge cheat: a second hot on each figure's base would clash; use keyboard-free hold on the board space below
  const nudgeHot = addHot(board, {
    label: () => 'Nudge a figure one space (hold on the board)', cheat: true,
    enabled: () => (phase === 'roll' || phase === 'move') && !nudged && watch.away(),
    hold: watch.cheat(1.5, async () => {
      // the figure nearest the cursor point gets nudged
      const ray = C.ray;
      const hit = ray.intersectObject(board)[0];
      let best = null, bd = 1;
      for (const f of figs) if (f.p < HOME) { const d = hit ? hit.point.distanceTo(f.mesh.position) : 0.5; if (d < bd) { bd = d; best = f; } }
      if (!best) return;
      nudged = true;
      best.p++;
      await place(best, true);
      A.sfx('wood');
      toast(`You slid the <b>${best.name}</b> one space.`, 'good');
      upd();
    }),
  });
  hots.push(nudgeHot);

  watch.start({
    onCaught: async () => {
      await caughtLine();
      const free = figs.filter(f => f.p < HOME && f.p > 0);
      const f = free.length ? pick(free) : figs.find(x => x.p < HOME);
      if (f) { f.chained = 3; toast(`He wraps a black root around the <b>${f.name}</b>. It cannot move for 3 turns.`, 'bad', 4.5); }
      wolf.extra = true;
    },
  });

  const cleanupAll = () => {
    off();
    watch.stop();
    for (const h of hots) removeHot(h);
    c.light.position.copy(lightHome);
    c.lean = 0; c.out = false;
    cleanup(g);
    clearChoices(); status(''); keys('');
    A.M.intensity = 0;
  };

  try {
    let turn = 0;
    for (;;) {
      turn++;
      turned = false; nudged = false; roll = 0; chosen = null;
      if (c.out) { c.out = false; A.sfx('ignite'); }
      // he reads the board
      tellsForTurn();
      upd();
      phase = 'roll';
      await choose([{ label: 'Roll the bone die' }]);
      roll = 1 + Math.floor(Math.random() * 6);
      A.sfx('dice', 1);
      await rollDie(myDie, roll, new THREE.Vector3(-0.5 + rand(-0.03, 0.03), TY + 0.014, 0.34 + rand(-0.03, 0.03)));
      upd();
      const movable = figs.filter(f => f.p < HOME && !f.chained);
      if (!movable.length) {
        toast('None of your figures can move.', '', 2.5);
        await wait(1);
      } else {
        phase = 'move';
        if (turn === 1) toast('Now click a figure to move it.', '', 4);
        while (phase === 'move') await wait(0.05);
        await moveFigure(chosen, roll);
      }
      phase = 'idle';
      for (const f of figs) if (f.chained) f.chained--;
      if (home() === 3) return await end('win');
      if (S.sanity <= 0) return 'blackout';
      // a guttered candle gives the wolf a free move
      await wolfTurn();
      if (guttered) { guttered = false; hurt(6); toast('In the dark, the wolf moves again.', 'bad'); await wolfTurn(); }
      if (wolf.extra) { wolf.extra = false; await wolfTurn(); }
      if (wolf.bites >= 7) return await end('lose');
      if (S.sanity <= 0) return 'blackout';
      aim *= 0.0;
    }
  } finally {
    cleanupAll();
  }

  async function end(r) {
    if (r === 'win') await say('dealer', 'All three. Home. How sweet. How rare.');
    else await say('dealer', 'Seven bites. My wolf is full. We play again.');
    return r;
  }

  function ringDist(a, b) { const d = Math.abs(a - b) % 24; return Math.min(d, 24 - d); }
  function threatened() {
    return figs.filter(f => f.p > 0 && f.p <= LANE_FROM && !SAFE.has(f.p)).filter(f => { const d = ringDist(wolf.s, f.p); return d >= 1 && d <= 6; });
  }
  function tellsForTurn() {
    const th = threatened();
    if (th.length && Math.random() < 0.9) { dealer.tell('flare', dif.tell); if (Math.random() < 0.5) line('dealer', pick(['I can smell the ' + th[0].name + '.', 'Run, little ' + th[0].name + '.']), 1.6); }
    else if (!th.length && figs.every(f => f.p === 0 || f.p >= LANE_FROM || SAFE.has(f.p) || ringDist(wolf.s, f.p) > 6)) {
      if (Math.random() < 0.5) dealer.tell('tremor', dif.tell);
      else if (Math.random() < 0.6) {
        dealer.tell('condense', dif.tell);
        const vis = figs.filter(f => f.p < HOME);
        if (vis.length) line('dealer', pick(['I can smell the ' + pick(vis).name + '.', 'My wolf is so hungry tonight.']), 1.6);
        journal('tell2', 'Empty threats', 'When he threatens a figure while his smoke pulls tight, the wolf can\'t actually reach it.');
      }
    }
  }

  async function moveFigure(f, n) {
    const start = f.p;
    for (let i = 0; i < n && f.p < HOME; i++) {
      f.p = f.p + 1;
      await place(f, true);
      A.sfx('wood');
    }
    upd();
    // a hidden path?
    const b = BRIDGES.find(x => x.from === f.p);
    if (b && f.p <= LANE_FROM) {
      if (revealed(b)) {
        A.sfx('discovery');
        toast(`In the shadow, a hidden carving: <b>${b.name}</b>. The ${f.name} follows it.`, 'good', 4);
        f.p = b.to;
        await place(f, true);
        journal('bridges', 'Paths in the shadow', 'Some paths on the labyrinth board only appear in the tower\'s shadow. Blowing on the candle (hold B) swings the shadow. Land exactly on the start of a path while it shows.');
        heal(3, true);
      } else if (!S.flags.bridgeHint) {
        S.flags.bridgeHint = true;
        toast('The wood under this space feels carved, as if a path starts here. You can\'t see it in this light.', '', 5);
      }
    }
    if (f.p <= LANE_FROM && THORN.has(f.p)) { A.sfx('crunch'); hurt(4); toast(`The thorns bite the ${f.name}.`, 'bad'); }
    if (f.p >= HOME && start < HOME) { A.sfx('win'); toast(`The <b>${f.name}</b> is home.`, 'good', 3); }
    // landing on the wolf? you walk past him; nothing happens
    figs.forEach(o => place(o));
  }

  async function wolfTurn() {
    phase = 'his';
    watch.freeze(true);
    dealer.lookAway('board');
    await wait(0.6);
    // rigging: if you aren't watching his die, he picks the better of two rolls
    const watching = lookingAt(hisDie.position, 24);
    const r1 = 1 + Math.floor(Math.random() * 6), r2 = 1 + Math.floor(Math.random() * 6);
    let r = r1;
    if (!watching && Math.random() < dif.rig) r = score(r2) > score(r1) ? r2 : r1;
    else if (watching && !S.flags.watchedDie) { S.flags.watchedDie = true; toast('You watch his hand closely as he rolls. The die looks honest this time.', '', 4); journal('wolfdie', 'Watch his die', 'If I stare at his die while he rolls, he can\'t fix the roll.'); }
    A.sfx('dice', 1);
    await rollDie(hisDie, r, new THREE.Vector3(0.3 + rand(-0.03, 0.03), TY + 0.014, -0.4 + rand(-0.03, 0.03)));
    const best = bestDir(r);
    const steps = Math.abs(best);
    const dir = Math.sign(best) || 1;
    A.sfx('growl');
    for (let i = 0; i < steps; i++) { wolf.s = (wolf.s + dir + 24) % 24; await placeWolf(true); A.sfx('wood'); }
    const victims = figs.filter(f => f.p === wolf.s && f.p <= LANE_FROM && !SAFE.has(f.p) && f.p > 0);
    for (const v of victims) {
      wolf.bites++;
      A.sfx('crunch');
      C.fx.red = 0.6;
      dealer.tell('flare', 1.5);
      hurt(10);
      toast(`The wolf takes the <b>${v.name}</b>. Back to the start.`, 'bad', 3.5);
      line('dealer', pick(['Crunch.', 'Delicious.', 'Back you go, little ' + v.name + '.']), 1.5);
      v.p = 0;
      await place(v, true);
    }
    upd();
    dealer.lookAtPlayer();
    watch.freeze(false);
    await wait(0.3);
  }
  function score(r) { const b = bestDir(r); const s = (wolf.s + b + 24) % 24; return figs.some(f => f.p === s && f.p > 0 && f.p <= LANE_FROM && !SAFE.has(f.p)) ? 10 : -Math.min(...figs.filter(f => f.p < LANE_FROM).map(f => ringDist(s, f.p)).concat([12])); }
  function bestDir(r) {
    let best = r, bs = -1e9;
    for (const d of [r, -r]) {
      const s = (wolf.s + d + 24) % 24;
      let sc = 0;
      for (const f of figs) {
        if (f.p >= LANE_FROM || f.p >= HOME) continue;
        if (f.p === s && f.p > 0 && !SAFE.has(f.p)) sc += 100;
        sc -= ringDist(s, f.p) * (f.p > 0 ? 1 : 0.2);
        const behind = (f.p - s + 24) % 24;
        if (behind >= 1 && behind <= 6) sc += 4;
      }
      if (sc > bs) { bs = sc; best = d; }
    }
    return best;
  }
}
