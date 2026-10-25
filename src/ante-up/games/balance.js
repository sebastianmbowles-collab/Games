// ACT III: THE SOUL SCALE. Match his weight exactly. Memories become tokens.
import { C, THREE, wait, addHot, removeHot, rand, pick, on } from '../core.js';
import { S, D, journal, mem, lost, MEMS } from '../state.js';
import { dealer } from '../dealer.js';
import { A } from '../audio.js';
import { ui, say, line, choose, clearChoices, status, toast, keys, ask } from '../ui.js';
import { watch, hurt, heal, caughtLine } from '../watch.js';
import { EMO, emoTex, glowSprite } from '../tex.js';
import { W } from '../world.js';
import { MEMQ } from '../text.js';
import { TY, fly, cleanup } from './common.js';

export const RULES3 = `<h2>The Balance</h2>
<p>Each round he places <b>three</b> tokens on his pan and you place <b>up to three</b> from your hand of four, taking turns. You always place last.</p>
<p>Then the pin is pulled. If the scale hangs <b>perfectly level</b>, you win the round. If <b>his side sinks</b>, he wins the round and a weight fuses to his pan for good. If <b>your side sinks</b>, nobody wins and it hurts.</p>
<p><b>First to 3 rounds wins.</b></p>
<h3>Weights</h3>
<p>Fear, Regret, Guilt and Anger each weigh a different amount (1, 2, 3 or 4). Watch the needle as tokens go down; it moves by the token's weight. What you learn is written in your status line.</p>
<p>His third token each round is <b>veiled</b> in smoke, and he holds the needle still. Read his body: confident or lying?</p>
<h3>Memories</h3>
<p><b>Click the candle</b> on your turn to give it a memory. You get a glowing Memory token: when you place it, <b>you choose its weight, 1 to 5.</b> The memory is gone for good.</p>
<h3>Cheating</h3>
<p>When he looks away: <b>hold the veiled token</b> to peek under the smoke, or <b>hold your pan</b> to press it down by one. Crouch (C) and you'll find a place under the table where the candle never reaches. He cannot see what you put there.</p>`;

const MEM_LABEL = { name: 'your name', pet: 'your animal', friend: 'the one you\'d run to', home: 'home' };

export async function playBalance() {
  const dif = D();
  if (!S.weights) {
    const w = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    S.weights = w;
    S.known = {};
  }
  const WT = S.weights;
  await askMemories();
  const g = new THREE.Group();
  C.scene.add(g);
  // ---- the scale
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2826, roughness: 0.45, metalness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0x8a7038, roughness: 0.35, metalness: 0.95 });
  const SC = new THREE.Vector3(-0.04, TY, -0.05);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.025, 24), iron); base.position.copy(SC).y += 0.0125;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.3, 12), iron); post.position.copy(SC).y += 0.17;
  const pivot = new THREE.Group(); pivot.position.copy(SC).y += 0.32;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.012, 0.014), iron);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), gold); finial.position.y = 0.02;
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.12, 6), gold); needle.position.y = -0.065; needle.rotation.x = Math.PI;
  pivot.add(beam, finial, needle);
  // gauge plate behind the needle
  const gaugeTex = (() => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = '#1a140c'; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = '#c9a050'; x.fillStyle = '#c9a050'; x.font = '14px serif'; x.textAlign = 'center';
    for (let i = -6; i <= 6; i++) { const a = i * 0.035 * 2.2; const cx = 128 + Math.sin(a) * 110, cy = 10 + (1 - Math.cos(a)) * 110; x.lineWidth = i === 0 ? 3 : 1.5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(128 + Math.sin(a) * 95, 10 + (1 - Math.cos(a)) * 95 + 15); x.stroke(); if (i % 2 === 0) x.fillText(Math.abs(i), 128 + Math.sin(a) * 80, 45 + (1 - Math.cos(a)) * 80); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), new THREE.MeshStandardMaterial({ map: gaugeTex, roughness: 0.6, metalness: 0.4 }));
  plate.position.copy(SC); plate.position.y += 0.235; plate.position.z += 0.012;
  plate.rotation.x = Math.PI;
  plate.rotation.z = Math.PI;
  g.add(base, post, pivot, plate);
  const pans = [-1, 1].map(side => {
    const pg = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.012, 24, 1, true), gold);
    dish.material = gold.clone(); dish.material.side = THREE.DoubleSide;
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.003, 24), gold);
    bottom.position.y = -0.006;
    pg.add(dish, bottom);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.2, 4), iron);
      ch.position.set(Math.cos(a) * 0.028, 0.1, Math.sin(a) * 0.028);
      ch.rotation.z = -Math.cos(a) * 0.27; ch.rotation.x = Math.sin(a) * 0.27;
      pg.add(ch);
    }
    pg.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(pg);
    pg.userData.side = side;
    return pg;
  });
  // left pan (x-) is yours, right pan (x+) is his
  const [myPan, hisPan] = pans;
  let tilt = 0, tiltTarget = 0;
  const offAnim = on(dt => {
    tilt += (tiltTarget - tilt) * Math.min(1, dt * 3);
    pivot.rotation.z = tilt;
    for (const p of pans) {
      const s = p.userData.side;
      const x = Math.cos(tilt) * 0.2 * s, y = Math.sin(tilt) * 0.2 * s;
      p.position.set(SC.x + x, SC.y + 0.32 + y - 0.2, SC.z);
    }
    if (W.groups.void.visible) S.sanity = Math.max(1, S.sanity - dt * 0.02);
  });

  // ---- tokens
  const tokenGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.008, 20);
  const metal = [0xb8bcc4, 0x6a7a90, 0xa07a40, 0x7a2a1e];
  const texs = [0, 1, 2, 3].map(emoTex);
  const memTex = emoTex(-1);
  const makeToken = (t) => {
    const top = new THREE.MeshStandardMaterial({ map: t.mem ? memTex : texs[t.e], roughness: 0.4, metalness: 0.7, emissive: t.mem ? 0x806030 : 0x000000, emissiveIntensity: t.mem ? 0.8 : 0 });
    const side = new THREE.MeshStandardMaterial({ color: t.mem ? 0xf0d890 : metal[t.e], roughness: 0.35, metalness: 0.9 });
    const m = new THREE.Mesh(tokenGeo, [side, top, side]);
    m.castShadow = true;
    m.userData.t = t;
    t.mesh = m;
    return m;
  };
  const tname = t => (t.mem ? `Memory: ${MEM_LABEL[t.mem]}` : EMO[t.e]);
  const tw = t => (t.mem ? t.w : WT[t.e]);
  const knownStr = () => EMO.map((e, i) => `${e} ${S.known[i] ? WT[i] : '?'}`).join(' &middot; ');

  const wins = [0, 0];
  let fused = 0;
  let hand = [], stash = S.stash || null, round = 0;
  let mine = [], his = [], veil = null, thumb = 0, peeked = false;
  let phase = 'idle', picked = null;
  const hots = [];
  const fuseMeshes = [];
  const showFused = () => {
    for (const m of fuseMeshes) hisPan.remove(m);
    fuseMeshes.length = 0;
    for (let i = 0; i < fused; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 16), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.3, metalness: 0.8 }));
      m.position.y = -0.003 + i * 0.0045;
      hisPan.add(m);
      fuseMeshes.push(m);
    }
  };
  showFused();
  const upd = () => {
    const vis = sum(mine) + thumb - (sum(his.filter(t => t !== veil)) + fused);
    status(`ROUNDS &nbsp; You ${wins[0]} &middot; ${wins[1]} Him<br><small>WEIGHTS: ${knownStr()}${fused ? ` &nbsp;|&nbsp; FUSED TO HIS PAN: ${fused}` : ''}</small>${phase === 'mine' ? `<br><small>needle (not counting the veil): ${vis === 0 ? 'level' : vis > 0 ? `your side by ${vis}` : `his side by ${-vis}`}</small>` : ''}`);
  };
  const sum = arr => arr.reduce((a, t) => a + tw(t), 0);
  ui.rules = RULES3;
  keys('<kbd>click</kbd> a token in your hand to place it &nbsp; <kbd>click</kbd> the candle to give a memory &nbsp; <kbd>C</kbd> crouch &nbsp; <kbd>R</kbd> rules');

  const layHand = () => {
    hand.forEach((t, i) => {
      if (!t.mesh) { makeToken(t); g.add(t.mesh); t.mesh.position.set(-0.1, TY + 0.2, 0.6); }
      fly(t.mesh, new THREE.Vector3(-0.32 + i * 0.07, TY + 0.004, 0.36), 0.3, 0.05);
      if (!t.hot) {
        t.hot = addHot(t.mesh, {
          label: () => `Place ${tname(t)}${!t.mem && S.known[t.e] ? ` (weighs ${WT[t.e]})` : ''}`,
          enabled: () => phase === 'mine' && hand.includes(t), glow: () => phase === 'mine' && hand.includes(t),
          onClick: () => { picked = t; ui.cancelChoice?.('picked'); },
        });
        hots.push(t.hot);
      }
    });
  };
  const putOn = async (pan, list, t) => {
    if (!t.mesh) { makeToken(t); g.add(t.mesh); t.mesh.position.set(0.35, TY + 0.3, -0.5); }
    list.push(t);
    const idx = list.length - 1;
    const wp = new THREE.Vector3(((idx % 2) - 0.5) * 0.024, 0.004 + idx * 0.0085, ((idx % 3) - 1) * 0.01);
    const world = pan.localToWorld(wp.clone());
    await fly(t.mesh, world, 0.4, 0.08);
    pan.add(t.mesh);
    t.mesh.position.copy(wp);
    t.mesh.rotation.set(0, Math.random() * 6, 0);
    A.sfx('clink', tw(t));
  };
  const needleTo = d => { tiltTarget = Math.max(-0.32, Math.min(0.32, -d * 0.035 * 2.2)); };

  // ---- hots that last the whole match
  hots.push(addHot(W.candle.group, {
    label: 'Give the candle a memory', reach: 3,
    enabled: () => phase === 'mine' && MEMS.some(k => S.memories[k] && !lost(k)),
    glow: () => phase === 'mine' && round >= 2 && MEMS.some(k => S.memories[k] && !lost(k)),
    onClick: () => { ui.cancelChoice?.('memory'); },
  }));
  hots.push(addHot(myPan, {
    label: 'Press your pan down with your thumb', cheat: true,
    enabled: () => phase === 'mine' && thumb === 0,
    glow: () => phase === 'mine' && watch.away() && thumb === 0,
    hold: watch.cheat(1.6, () => { thumb = 1; A.sfx('clink', 2); toast('Your thumb rests on the rim. Your side weighs <b>one more</b> this round.', 'good'); upd(); }),
  }));
  const veilHotTarget = new THREE.Group();
  g.add(veilHotTarget);
  // absolute shadow under the table
  const shadowSpot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.2), new THREE.MeshBasicMaterial({ visible: false }));
  shadowSpot.position.set(-0.15, TY - 0.1, 0.45);
  shadowSpot.userData.noOutline = true;
  g.add(shadowSpot);
  hots.push(addHot(shadowSpot, {
    label: () => (stash ? `Take back the hidden ${tname(stash)}` : 'Hide a token here, in absolute shadow'),
    enabled: () => phase === 'mine' && C.seat.crouch > 0.6 && (stash || hand.length > 0),
    onClick: async () => {
      if (stash) { hand.push(stash); stash = null; S.stash = null; layHand(); A.sfx('pick'); toast('You take the token back from the dark.', 'good'); return; }
      ui.cancelChoice?.('stash');
    },
  }));

  watch.start({
    onCaught: async () => {
      await caughtLine();
      fused = Math.min(4, fused + 1); showFused();
      toast('He presses a black token into his pan. It fuses there. <b>His side is one heavier, for good.</b>', 'bad', 5);
      upd();
    },
  });

  const cleanupAll = () => {
    offAnim();
    watch.stop();
    for (const h of hots) removeHot(h);
    cleanup(g);
    clearChoices(); status(''); keys('');
  };

  try {
    while (wins[0] < 3 && wins[1] < 3) {
      round++;
      await playRound();
      if (S.sanity <= 0) return 'blackout';
    }
    if (wins[0] >= 3) { await say('dealer', 'Level. Level. Level. You have a steady hand, {name}. For now.'); return 'win'; }
    await say('dealer', 'My side sinks. It always does. Again.');
    return 'lose';
  } finally {
    cleanupAll();
  }

  async function playRound() {
    // clear pans
    for (const t of [...mine, ...his]) { t.mesh?.parent?.remove(t.mesh); }
    mine = []; his = []; veil = null; thumb = 0; peeked = false;
    needleTo(0);
    // draw hand
    for (const t of hand) { if (t.hot) { removeHot(t.hot); t.hot = null; } t.mesh?.parent?.remove(t.mesh); t.mesh = null; }
    hand = hand.filter(t => t.mem);
    while (hand.filter(t => !t.mem).length < 4) hand.push({ e: Math.floor(Math.random() * 4) });
    layHand();
    // his tokens: heavier picks on harder difficulty
    const pool = Array.from({ length: 6 }, () => ({ e: Math.floor(Math.random() * 4) }));
    pool.sort((a, b) => WT[b.e] - WT[a.e]);
    const pickN = S.diff === 'easy' ? pool.sort(() => Math.random() - 0.5).slice(0, 3) : S.diff === 'normal' ? [pool[0], pool[2 + Math.floor(Math.random() * 2)], pool[Math.floor(Math.random() * 6)]] : pool.slice(0, 3);
    const order = pickN.sort(() => Math.random() - 0.5);
    upd();
    for (let turn = 0; turn < 3; turn++) {
      // his placement
      phase = 'his';
      watch.freeze(true);
      dealer.lookAway('board');
      await wait(rand(0.7, 1.3));
      const t = order[turn];
      const veiled = turn === 2;
      await putOn(hisPan, his, t);
      if (veiled) {
        veil = t;
        const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#000000', 0.7), color: 0x000000, transparent: true, opacity: 0.95, depthWrite: false }));
        smoke.scale.setScalar(0.07);
        smoke.position.y = 0.015;
        t.mesh.add(smoke);
        t.smoke = smoke;
        const tp = S.diff === 'easy' ? 1 : S.diff === 'normal' ? 0.9 : 0.75;
        if (Math.random() < tp) dealer.tell(WT[t.e] >= 3 ? 'flare' : 'condense', dif.tell);
        line('dealer', pick(['And this one... you don\'t get to see.', 'Under the smoke. Guess.', 'Veiled. Like everything worth having.']), 1.8);
        // the veiled token can be peeked at
        const vh = addHot(t.mesh, {
          label: 'Peek under the smoke', cheat: true,
          enabled: () => phase === 'mine' && !peeked, glow: () => phase === 'mine' && watch.away() && !peeked,
          hold: watch.cheat(1.4, () => { peeked = true; t.smoke.material.opacity = 0.3; toast(`Under the smoke: <b>${EMO[t.e]}</b>${S.known[t.e] ? ` (weighs ${WT[t.e]})` : ''}.`, 'good', 5); }),
        });
        hots.push(vh);
        t.vhot = vh;
      } else {
        learn(t.e);
        needleTo(sum(mine) + thumb - (sum(his.filter(x => x !== veil)) + fused));
      }
      dealer.lookAtPlayer();
      watch.freeze(false);
      upd();
      // your placement
      phase = 'mine';
      upd();
      if (turn === 2) {
        const need = sum(his) + fused - sum(mine) - thumb;
        if (need >= 0 && (need === 0 || hand.some(h => h.mem || WT[h.e] === need))) dealer.tell('tremor', dif.tell);
      }
      for (;;) {
        picked = null;
        const v = await choose([{ label: turn < 2 ? 'Place nothing this turn' : 'Place nothing and pull the pin', value: 'pass' }], { bottom: 230 });
        if (v === 'memory') { await giveMemory(); continue; }
        if (v === 'stash') { await stashToken(); continue; }
        if (v === 'picked' && picked) {
          const t2 = picked;
          hand = hand.filter(h => h !== t2);
          if (t2.hot) { removeHot(t2.hot); hots.splice(hots.indexOf(t2.hot), 1); t2.hot = null; }
          if (t2.mem) {
            const wv = await choose([1, 2, 3, 4, 5].map(n => ({ label: `Weight ${n}`, value: n })), { bottom: 230 });
            t2.w = wv;
            A.sfx('chime');
          }
          await putOn(myPan, mine, t2);
          if (!t2.mem) learn(t2.e);
          needleTo(sum(mine) + thumb - (sum(his.filter(x => x !== veil)) + fused));
          layHand();
        }
        break;
      }
      upd();
    }
    // pull the pin
    phase = 'reveal';
    clearChoices();
    watch.freeze(true);
    await say('dealer', pick(['Let us see.', 'Pull the pin.', 'And now we weigh you.']), { auto: 1 });
    if (veil?.smoke) { veil.mesh.remove(veil.smoke); }
    learn(veil.e);
    const diff = sum(his) + fused - sum(mine) - thumb;
    A.sfx('scaleSwing');
    needleTo(-diff);
    await wait(1.4);
    if (diff === 0) {
      wins[0]++;
      A.sfx('win');
      dealer.tell('tremor', 1.5);
      heal(4);
      toast('Perfectly level.', 'good', 3);
      line('dealer', pick(['Level. Hm.', 'Balanced. How irritating.']), 1.6);
    } else if (diff > 0) {
      wins[1]++;
      fused = Math.min(4, fused + 1);
      A.sfx('lose');
      dealer.tell('flare', 1.8);
      hurt(8);
      toast(`His side sinks by ${diff}. A weight fuses to his pan.`, 'bad', 4);
      showFused();
      line('dealer', pick(['Heavier. Always heavier.', 'Mine. And I keep a little.']), 1.6);
    } else {
      A.sfx('slam');
      hurt(8);
      C.fx.red = 0.5;
      toast(`Your side drops by ${-diff}. The beam cracks across your knuckles.`, 'bad', 4);
      line('dealer', 'Too much of yourself, {name}.', 1.6);
    }
    watch.freeze(false);
    upd();
    await choose([{ label: wins[0] >= 3 || wins[1] >= 3 ? 'Continue' : 'Next round' }], { bottom: 230 });
  }

  function learn(e) {
    if (e === undefined || S.known[e]) return;
    S.known[e] = true;
    toast(`<b>${EMO[e]}</b> weighs <b>${WT[e]}</b>.`, '', 3);
    if (Object.keys(S.known).length === 4) journal('weights', 'The weights', EMO.map((x, i) => `${x}: ${WT[i]}`).join(', ') + '.');
  }

  async function stashToken() {
    const opts = hand.map(t => ({ label: tname(t), value: t }));
    opts.push({ label: 'Never mind', value: null });
    const t = await choose(opts);
    if (!t) return;
    hand = hand.filter(h => h !== t);
    if (t.hot) { removeHot(t.hot); hots.splice(hots.indexOf(t.hot), 1); t.hot = null; }
    t.mesh?.parent?.remove(t.mesh); t.mesh = null;
    stash = t; S.stash = { e: t.e, mem: t.mem };
    A.sfx('pick');
    toast('You slide it into the black under the table. He cannot see it there. It will keep.', 'good', 4);
    journal('stash', 'The absolute shadow', 'Under the table, where the candle never reaches, I can hide a token from my hand and keep it for a later round. He never sees.');
    layHand();
  }

  async function giveMemory() {
    const avail = MEMS.filter(k => S.memories[k] && !lost(k));
    const opts = avail.map(k => ({ label: k === 'name' ? `Your name: "${S.name}"` : k === 'pet' ? `${mem('pet')} the ${mem('pet', 'kind')}` : k === 'friend' ? `${mem('friend')}` : `${mem('home')}`, sub: MEM_LABEL[k], value: k }));
    opts.push({ label: 'Keep them', value: null });
    await say('candle', 'Give me something you love. I will make it heavy.', { auto: 1.5 });
    const k = await choose(opts);
    if (!k) return;
    const conf = await choose([{ label: 'Give it', value: true, danger: true, sub: 'You will not get it back.' }, { label: 'No', value: false }]);
    if (!conf) return;
    S.memories[k].lost = true;
    A.M.layers = Math.max(0, A.M.layers - 1);
    A.sfx('ignite');
    A.sfx('whispers', 0.6, 2);
    W.candle.k = 1.6; setTimeout(() => { W.candle.k = 1; }, 900);
    hurt(5, 'quiet');
    const lines = {
      name: 'You try to remember what he calls you. There is a word. It\'s gone.',
      pet: 'There was an animal. Warm. It slept at the end of your bed. You can\'t see its face any more.',
      friend: 'Someone used to wait for you. You can\'t remember who.',
      home: 'Home. There was a street. A door. A smell of something cooking. Then nothing.',
    };
    await say('you', lines[k]);
    journal('mem_' + k, 'Given to the candle', `I gave the candle ${MEM_LABEL[k]}. It is gone now.`);
    hand.push({ mem: k });
    layHand();
  }
}

// The candle asks about your past the first time you sit at the scale.
async function askMemories() {
  if (S.memories.pet) return;
  W.candle.k = 1.5;
  A.sfx('whispers', 0.5, 2);
  await say('you', 'The candle flame stretches tall and thin. It leans toward you. It speaks.');
  await say('candle', 'He wants your feelings for his scale. I want something warmer. Tell me who you were, so I can keep it safe.');
  const pet = await ask(MEMQ.pet.q, { placeholder: MEMQ.pet.ph });
  S.memories.pet = { a: pet, lost: false };
  const kind = await ask(MEMQ.pet.kq.replace('{pet}', pet), { placeholder: MEMQ.pet.kph });
  S.memories.pet.kind = kind;
  const friend = await ask(MEMQ.friend.q, { placeholder: MEMQ.friend.ph });
  S.memories.friend = { a: friend, lost: false };
  const home = await ask(MEMQ.home.q, { placeholder: MEMQ.home.ph });
  S.memories.home = { a: home, lost: false };
  await say('candle', `${pet}. ${friend}. ${home}. And you are ${S.name}. I will hold them for you.`);
  await say('candle', 'If you need weight, give one back to me. But I will not return it.');
  W.candle.k = 1;
  journal('memories', 'The candle', `The candle asked about my life. {pet} the {petkind}. {friend}. {home}. It says it will turn any of them into a token of whatever weight I need, but I won't get the memory back.`);
}
