// ACT I: THE LIAR'S DECK. Blind Man's Bluff with teeth.
// You see his card, he sees yours. Neither of you sees your own.
import { C, THREE, wait, addHot, removeHot, rand, pick, lookingAt, on } from '../core.js';
import { S, D, journal } from '../state.js';
import { dealer } from '../dealer.js';
import { A } from '../audio.js';
import { ui, say, line, choose, clearChoices, status, toast, keys } from '../ui.js';
import { watch, hurt, heal, caughtLine } from '../watch.js';
import { cardName, cardTex, textTex } from '../tex.js';
import { cardMesh, setCardFace, TeethPile, moveTeeth, fly, tablePoint, spoonMesh, TY, cleanup } from './common.js';

export const RULES1 = `<h2>Blind Man's Bluff</h2>
<p>You each hold one card to your forehead. <b>You can see his card. You cannot see your own.</b> He sees yours.</p>
<p>Both of you put in one tooth (the ante). Then you take turns: <b>check</b>, <b>bet</b> 1 to 3 teeth, <b>call</b>, <b>raise</b>, or <b>fold</b>. If both check, or someone calls, the cards are shown. <b>Higher card wins the pot.</b> Aces are high. A tie splits the pot.</p>
<p>Fold, and he wins that hand. <b>First to win 3 hands wins the match.</b> Run out of teeth and you lose it.</p>
<p>Every tooth you lose costs Sanity. Teeth you win steady your nerves.</p>
<h3>Reading him</h3>
<p>He can see your card, so his body tells you about it. Watch him when he looks at your forehead and when he bets.</p>
<h3>Cheating</h3>
<p>When he looks away, you can <b>hold the spoon</b> to see your card reflected, or <b>hold a shown card</b> after a hand to scratch a mark on it. Do it while he watches and his Suspicion rises fast.</p>
<p>He cheats too. If his card changes while you aren't looking, <b>click his card</b> to call him on it.</p>
<p class="sm">Drag to look. Hold Q / E to lean, C to crouch. I = inventory, J = journal, Esc = pause.</p>`;

const LINES = {
  bet: ['{n}.', '{n} teeth.', 'I bet {n}.', 'Let us make it {n}.'],
  raise: ['And {n} more.', 'Raise. {n}.', 'Higher. {n}.'],
  call: ["I'll see it.", 'Fine. Show me.', 'Called.'],
  check: ['Knock knock.', 'Check.', 'I wait.'],
  fold: ['Keep them. For now.', 'Fold. Enjoy it.', 'Take your little pot.'],
  win: ['Mine.', 'Delicious.', 'Another one for the jar.', 'You held it so proudly, too.'],
  lose: ['Hm.', 'Luck. It runs out.', 'Well played. Do it again.'],
  look: ['Oh, I like this card.', 'Interesting forehead.', 'Hmm.'],
};
const fmt = (s, n) => s.replace('{n}', n);

export async function playBluff() {
  const dif = D();
  const g = new THREE.Group();
  C.scene.add(g);
  const startMe = S.diff === 'easy' ? 14 : 12, startHim = S.diff === 'easy' ? 10 : 12;
  const mine = new TeethPile(g, tablePoint(-0.34, 0.36), 6);
  const his = new TeethPile(g, tablePoint(0.3, -0.36), 6);
  const pot = new TeethPile(g, tablePoint(-0.05, -0.02), 4);
  mine.fill(startMe);
  his.fill(startHim);
  const wins = [0, 0];
  // the Liar's Deck: two suits, 26 cards. Scratches stay on cards between hands.
  const deck = [];
  for (const s of [0, 3]) for (let v = 2; v <= 14; v++) deck.push({ v, s, marked: false });
  const deckPos = tablePoint(0.2, -0.3, 0.01);
  const deckMesh = cardMesh(null);
  deckMesh.position.copy(deckPos);
  deckMesh.rotation.set(-Math.PI / 2, 0, Math.PI * 0.03);
  deckMesh.scale.z = 1;
  g.add(deckMesh);
  for (let i = 1; i < 6; i++) { const d = deckMesh.clone(); d.position.y += i * 0.0012; g.add(d); }
  // the spoon
  const spoon = spoonMesh();
  spoon.position.set(0.26, TY + 0.004, 0.4);
  spoon.rotation.y = -0.4;
  g.add(spoon);
  let spoonGone = false;
  // a carved warning in the table near your hands
  const carving = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.06), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, map: textTex('WATCH HIS SHOULDERS', { w: 512, h: 128, font: 'italic 46px "IM Fell English", serif', color: 'rgba(20,10,4,0.9)' }) }));
  carving.rotation.x = -Math.PI / 2;
  carving.position.set(-0.08, TY + 0.0015, 0.47);
  g.add(carving);

  let hand = 0, myCard = null, hisCard = null, myMesh = null, hisMesh = null, swapped = null, peeked = false, triedSwap = false;
  let phase = 'idle';
  let flareShown = false, condenseShown = false, tremorShown = false, bluffedThisHand = false;
  const hots = [];

  const updStatus = () => {
    const odds = hisCard && S.diff === 'easy' ? `<br><small>cards that beat his: ${deck.filter(c => c !== hisCard && c !== myCard && c.v > hisCard.v).length + (myCard.v > hisCard.v ? 1 : 0)} of 25</small>` : '';
    status(`HANDS &nbsp; You ${wins[0]} &middot; ${wins[1]} Him<br><small>TEETH &nbsp; you ${mine.count} &middot; pot ${pot.count} &middot; him ${his.count}${hisCard ? ` &nbsp;|&nbsp; HIS CARD: ${cardName(hisCard).toUpperCase()}` : ''}</small>${odds}`);
  };
  ui.rules = RULES1;
  keys('<kbd>drag</kbd> look &nbsp; <kbd>hold</kbd> cheat &nbsp; <kbd>R</kbd> rules &nbsp; <kbd>J</kbd> journal');

  // ---- cheats
  hots.push(addHot(spoon, {
    label: 'Tilt the spoon to see your card', cheat: true,
    enabled: () => phase === 'bet' && !peeked && !spoonGone,
    hold: watch.cheat(1.7, () => {
      peeked = true;
      showPeek(myCard);
      toast(`In the spoon, upside down: <b>${cardName(myCard)}</b>`, 'good', 4.5);
      journal('cheat_spoon', 'The spoon', 'The bowl of the spoon reflects the card on my forehead, if he isn\'t looking.');
    }),
    glow: () => watch.away() && phase === 'bet' && !peeked,
  }));

  // calling him out on a switched card
  const accuse = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.15), new THREE.MeshBasicMaterial({ visible: false }));
  accuse.position.set(0, 0.3, 0.12);
  dealer.headGrp.add(accuse);
  hots.push(addHot(accuse, {
    label: '"That card changed."',
    enabled: () => phase === 'bet',
    onClick: () => { phase = 'accuse'; ui.cancelChoice?.('accuse'); },
  }));

  watch.start({
    firstLonger: true,
    onCaught: async () => {
      await caughtLine();
      if (!spoonGone) {
        spoonGone = true;
        await fly(spoon, tablePoint(0.25, -0.5, 0.2), 0.5, 0.2);
        spoon.visible = false;
        toast('He took the spoon.', 'bad', 4);
      } else if (deck.some(c => c.marked)) {
        deck.forEach(c => { c.marked = false; });
        toast('He felt the scratches. He burned every mark you made.', 'bad', 4);
        await moveTeeth(mine, his, Math.min(2, mine.count));
      } else {
        toast('He takes three teeth as a fine.', 'bad', 4);
        await moveTeeth(mine, his, Math.min(3, mine.count));
      }
      updStatus();
    },
  });

  // the dealer's card swap trick: only when you aren't watching him
  let notLooking = 0;
  const offSwap = on(dt => {
    if (phase !== 'bet' || swapped || triedSwap || !hisCard) { notLooking = 0; return; }
    const head = dealer.headWorld(new THREE.Vector3());
    if (lookingAt(head, 28)) notLooking = 0; else notLooking += dt;
    if (notLooking < 2.6) return;
    triedSwap = true;
    if (hand >= 2 && hisCard.v <= 9 && Math.random() < dif.rig) {
      const better = deck.filter(c => c !== myCard && c !== hisCard && c.v >= 11);
      if (better.length) {
        swapped = { from: hisCard };
        hisCard = pick(better);
        setCardFace(hisMesh, hisCard);
        A.sfx('cardSlide');
        updStatus();
      }
    }
  });

  const cleanupAll = () => {
    offSwap();
    watch.stop();
    for (const h of hots) removeHot(h);
    dealer.headGrp.remove(accuse);
    if (hisMesh) dealer.headGrp.remove(hisMesh);
    if (myMesh) myMesh.parent?.remove(myMesh);
    cleanup(g);
    clearChoices();
    status('');
    keys('');
    hidePeek();
  };

  try {
    while (wins[0] < 3 && wins[1] < 3) {
      if (mine.count === 0) return await endMatch('lose');
      if (his.count === 0) return await endMatch('win');
      hand++;
      await playHand();
      updStatus();
      if (S.sanity <= 0) return await endMatch('blackout');
    }
    return await endMatch(wins[0] >= 3 ? 'win' : 'lose');
  } finally {
    cleanupAll();
  }

  async function endMatch(r) {
    phase = 'idle';
    if (r === 'win') {
      await say('dealer', pick(['Hm. Three hands. Fine.', 'You win the match. Do not get used to it.']));
    } else if (r === 'lose') {
      await say('dealer', pick(['And that is the match. Again.', 'Out of teeth, {name}. We go again.']));
    }
    return r;
  }

  // ---------------------------------------------------------------- one hand
  async function playHand() {
    swapped = null; peeked = false; triedSwap = false; flareShown = condenseShown = tremorShown = bluffedThisHand = false; notLooking = 0;
    phase = 'deal';
    // ante
    const an = [mine.take(), his.take()];
    await Promise.all([pot.add(an[0]), pot.add(an[1])]);
    A.sfx('tooth', 2);
    // deal
    const pool = deck.slice();
    myCard = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    hisCard = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    updStatus();
    myMesh = cardMesh(myCard);
    myMesh.position.copy(deckPos).y += 0.01;
    myMesh.rotation.set(-Math.PI / 2, 0, 0);
    g.add(myMesh);
    A.sfx('card');
    const camFront = new THREE.Vector3(0, 0.06, -0.2).applyMatrix4(C.camera.matrixWorld);
    await fly(myMesh, camFront, 0.45, 0.08);
    g.remove(myMesh);
    C.camera.add(myMesh);
    myMesh.position.set(0, 0.105, -0.15);
    myMesh.rotation.set(0.25, Math.PI, 0);
    myMesh.visible = false;
    hisMesh = cardMesh(hisCard);
    hisMesh.position.copy(deckPos).y += 0.01;
    hisMesh.rotation.set(-Math.PI / 2, 0, 0);
    g.add(hisMesh);
    A.sfx('card');
    const head = dealer.headWorld(new THREE.Vector3());
    await fly(hisMesh, head.clone().add(new THREE.Vector3(0, 0.3, 0.2)), 0.45, 0.1);
    g.remove(hisMesh);
    dealer.headGrp.add(hisMesh);
    hisMesh.position.set(0, 0.31, 0.15);
    hisMesh.rotation.set(-0.15, 0, 0);
    hisMesh.scale.setScalar(1.6);
    if (myCard.marked) {
      toast(`Your thumb finds your scratch. This is the <b>${cardName(myCard)}</b>.`, 'good', 5);
    } else if (deck.some(c => c.marked)) {
      toast('No scratch under your thumb. It is not one of the cards you marked.', '', 4);
    }
    // he looks at your forehead
    watch.freeze(true);
    dealer.lookAtPoint(C.camera.position.clone().add(new THREE.Vector3(0, 0.12, 0)));
    await wait(0.9);
    const e = hisOdds();
    const tp = S.diff === 'easy' ? 1 : S.diff === 'normal' ? 0.9 : 0.75;
    if (e > 0.64 && Math.random() < tp) { dealer.tell('flare', dif.tell); flareShown = true; A.sfx('bassHit'); }
    else if (e < 0.22 && Math.random() < tp) { dealer.tell('tremor', dif.tell); tremorShown = true; }
    if (Math.random() < 0.35) line('dealer', pick(LINES.look), 1.5);
    await wait(0.8);
    dealer.lookAtPlayer();
    watch.freeze(false);
    updStatus();
    // betting
    const first = hand % 2 ? 'p' : 'd';
    const res = await betting(first);
    phase = 'show';
    watch.freeze(true);
    await showdown(res);
    watch.freeze(false);
  }

  function hisOdds() {
    // what he believes: chance his unseen card beats yours
    if (swapped) return hisCard.v > myCard.v ? 1 : hisCard.v === myCard.v ? 0.5 : 0;
    const rest = deck.filter(c => c !== myCard);
    let w = 0;
    for (const c of rest) w += c.v > myCard.v ? 1 : c.v === myCard.v ? 0.5 : 0;
    return w / rest.length;
  }

  async function putIn(pile, n) {
    await moveTeeth(pile, pot, n, 0.05);
    A.sfx('tooth', n);
    updStatus();
  }

  async function betting(first) {
    let actor = first, toCall = 0, raises = 0, checks = 0;
    for (;;) {
      let act;
      if (actor === 'p') act = await playerAct(toCall, raises);
      else act = await dealerAct(toCall, raises);
      if (act.a === 'accuse') return { accuse: true };
      if (act.a === 'fold') return { fold: actor };
      if (act.a === 'check') { checks++; if (checks >= 2) return { show: true }; actor = actor === 'p' ? 'd' : 'p'; continue; }
      if (act.a === 'call') { await putIn(actor === 'p' ? mine : his, Math.min(toCall, actor === 'p' ? mine.count : his.count)); return { show: true }; }
      if (act.a === 'bet' || act.a === 'raise') {
        const n = Math.max(1, act.n);
        const pay = Math.min(toCall + n, actor === 'p' ? mine.count : his.count);
        await putIn(actor === 'p' ? mine : his, pay);
        toCall = Math.max(0, pay - toCall);
        raises++;
        if ((actor === 'p' ? his : mine).count === 0) return { show: true };
        actor = actor === 'p' ? 'd' : 'p';
      }
    }
  }

  async function playerAct(toCall, raises) {
    phase = 'bet';
    const room = Math.min(mine.count - toCall, his.count);
    const opts = [];
    if (toCall === 0) {
      opts.push({ label: 'Check', value: { a: 'check' } });
      for (const n of [1, 2, 3]) opts.push({ label: `Bet ${n}`, value: { a: 'bet', n }, disabled: n > room });
    } else {
      opts.push({ label: `Call ${Math.min(toCall, mine.count)}`, value: { a: 'call' } });
      if (raises < 3) for (const n of [1, 2]) opts.push({ label: `Raise +${n}`, sub: `pay ${toCall + n}`, value: { a: 'raise', n }, disabled: n > room });
    }
    opts.push({ label: 'Fold', value: { a: 'fold' }, danger: true });
    const v = await choose(opts);
    if (v === 'accuse') return { a: 'accuse' };
    phase = 'wait';
    if (v.a === 'bet' || v.a === 'raise') A.sfx('tooth', v.n);
    return v;
  }

  async function dealerAct(toCall, raises) {
    phase = 'his';
    watch.freeze(true);
    dealer.lookAtPoint(C.camera.position.clone().add(new THREE.Vector3(0, 0.12, 0)));
    await wait(rand(0.8, 1.6));
    dealer.lookAtPlayer();
    const e = Math.max(0, Math.min(1, hisOdds() + (Math.random() - 0.5) * dif.noise * 2));
    const potN = pot.count;
    const bluffP = S.diff === 'easy' ? 0.08 : S.diff === 'normal' ? 0.16 : 0.24;
    let act;
    if (toCall === 0) {
      if (e > 0.7) act = { a: 'bet', n: e > 0.86 ? 3 : 2 };
      else if (e > 0.56 && Math.random() < 0.5) act = { a: 'bet', n: 1 };
      else if (e < 0.36 && Math.random() < bluffP) act = { a: 'bet', n: 2, bluff: true };
      else act = { a: 'check' };
    } else {
      const need = toCall / (potN + toCall);
      if (e > 0.8 && raises < 3 && Math.random() < 0.6) act = { a: 'raise', n: e > 0.9 ? 2 : 1 };
      else if (e < 0.3 && raises < 3 && Math.random() < bluffP * 0.7) act = { a: 'raise', n: 2, bluff: true };
      else if (e < need + 0.12 && !(e > 0.45 && Math.random() < 0.5)) act = { a: 'fold' };
      else act = { a: 'call' };
    }
    if (act.n && act.n > his.count) act.n = his.count;
    if ((act.a === 'bet' || act.a === 'raise') && his.count <= toCall) act = { a: 'call' };
    if (act.bluff) { dealer.tell('condense', dif.tell); condenseShown = true; bluffedThisHand = true; A.sfx('playful'); }
    else if ((act.a === 'bet' || act.a === 'raise') && Math.random() < 0.8) { dealer.tell('flare', dif.tell * 0.8); flareShown = true; }
    if (act.a === 'fold' && e < 0.25 && !tremorShown) { dealer.tell('tremor', dif.tell * 0.7); tremorShown = true; }
    const ln = pick(LINES[act.a]);
    line('dealer', fmt(ln, act.n), 1.4);
    await wait(0.6);
    watch.freeze(false);
    return act;
  }

  async function showdown(res) {
    clearChoices();
    if (res.accuse) {
      if (swapped) {
        A.sfx('snap');
        await say('dealer', pick(['...Sharp eyes.', 'Hm. You were watching after all.']));
        hisCard = swapped.from;
        setCardFace(hisMesh, hisCard);
        journal('tell_swap', 'He switches his card', 'If I stop watching his face, he swaps the card on his forehead for a better one. Click his card to call him on it.');
        heal(6);
        res = { fold: 'd' };
      } else {
        await say('dealer', pick(['Changed? It is the same card. Your eyes are going, {name}.', 'Accusations. How rude.']));
        hurt(5);
        watch.add(15);
        res = { fold: 'p' };
      }
    }
    const before = mine.count;
    // reveal: your card down onto the table, his too
    C.camera.remove(myMesh);
    g.add(myMesh);
    myMesh.visible = true;
    const cp = new THREE.Vector3(0, 0.105, -0.15).applyMatrix4(C.camera.matrixWorld);
    myMesh.position.copy(cp);
    myMesh.rotation.set(0, 0, 0);
    await fly(myMesh, tablePoint(-0.1, 0.27, 0.002), 0.4, 0.05, new THREE.Euler(-Math.PI / 2, 0, 0.05));
    A.sfx('card');
    dealer.headGrp.remove(hisMesh);
    g.add(hisMesh);
    hisMesh.scale.setScalar(1);
    dealer.headWorld(hisMesh.position).add(new THREE.Vector3(0, 0.3, 0.2));
    await fly(hisMesh, tablePoint(0.1, -0.08, 0.002), 0.4, 0.05, new THREE.Euler(-Math.PI / 2, 0, -0.05));
    A.sfx('card');
    let winner;
    if (res.fold) winner = res.fold === 'p' ? 'd' : 'p';
    else winner = myCard.v > hisCard.v ? 'p' : myCard.v < hisCard.v ? 'd' : 'tie';
    toast(`You held the <b>${cardName(myCard)}</b>.`, '', 3);
    await wait(0.6);
    if (winner === 'tie') {
      const half = Math.floor(pot.count / 2);
      await moveTeeth(pot, mine, half);
      await moveTeeth(pot, his, pot.count);
      line('dealer', 'A tie. How dull.', 1.5);
    } else {
      await moveTeeth(pot, winner === 'p' ? mine : his, pot.count);
      wins[winner === 'p' ? 0 : 1]++;
      if (winner === 'p') { A.sfx('win'); line('dealer', pick(LINES.lose), 1.5); }
      else { A.sfx('lose'); line('dealer', pick(LINES.win), 1.6); }
    }
    A.sfx('tooth', 4);
    const delta = mine.count - before;
    if (delta < 0) hurt(-delta * 1.6);
    else if (delta > 0) heal(delta * 0.6, true);
    // learn his tells from what just happened
    if (flareShown && myCard.v <= 8 && journal('tell_flare', 'The Flare', 'When his smoky shoulders spread out like a cobra\'s hood, he is sure he will win. It happened when my card was low.')) toast('Journal updated: <b>The Flare</b>', 'good');
    if (condenseShown && bluffedThisHand && (res.fold === 'd' || winner === 'p') && journal('tell_condense', 'The Condensation', 'When his smoke pulls tight into a dense black shape as he bets, he is bluffing. His bet meant nothing.')) toast('Journal updated: <b>The Condensation</b>', 'good');
    if (tremorShown && winner !== 'd' && journal('tell_tremor', 'The Tremor', 'When his glowing teeth twitch and flicker, I have him cornered. My card was strong.')) toast('Journal updated: <b>The Tremor</b>', 'good');
    updStatus();
    // a moment with the cards face up: you may scratch one if he looks away
    phase = 'mark';
    const markHots = [myMesh, hisMesh].map(m => addHot(m, {
      label: () => (m.userData.card.marked ? 'Already scratched' : `Scratch a mark on the ${cardName(m.userData.card)}`),
      cheat: true,
      enabled: () => phase === 'mark' && !m.userData.card.marked,
      glow: () => watch.away(),
      hold: watch.cheat(1.4, () => {
        m.userData.card.marked = true;
        setCardFace(m, m.userData.card);
        A.sfx('paper');
        toast(`You scratched the <b>${cardName(m.userData.card)}</b>. You'll feel it next time.`, 'good');
        journal('cheat_mark', 'Marked cards', 'After a hand, while he looks away, I can scratch a card. When I hold a marked card, my thumb tells me what it is.');
      }),
    }));
    if (hand === 1) toast('While the cards lie face up, you could scratch one... if he looks away.', '', 5);
    await choose([{ label: wins[0] >= 3 || wins[1] >= 3 || mine.count === 0 || his.count === 0 ? 'Continue' : 'Next hand' }]);
    phase = 'idle';
    for (const h of markHots) removeHot(h);
    A.sfx('cardSlide');
    await Promise.all([fly(myMesh, deckPos.clone(), 0.35, 0.05), fly(hisMesh, deckPos.clone(), 0.35, 0.05)]);
    g.remove(myMesh); g.remove(hisMesh);
    hisCard = null; myMesh = null; hisMesh = null;
    hidePeek();
  }
}

function showPeek(card) {
  const box = document.getElementById('peek');
  const cv = box.querySelector('canvas');
  const g = cv.getContext('2d');
  const src = cardTex(card.v, card.s, card.marked).userData.canvas;
  g.clearRect(0, 0, 200, 200);
  g.fillStyle = '#2a2a30'; g.fillRect(0, 0, 200, 200);
  g.save();
  g.translate(100, 100); g.scale(1, -1); g.rotate(0.2);
  g.filter = 'blur(1.2px) contrast(0.8)';
  g.drawImage(src, -55, -82, 110, 164);
  g.restore();
  const grd = g.createRadialGradient(100, 100, 40, 100, 100, 110);
  grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(180,190,210,.6)');
  g.fillStyle = grd; g.fillRect(0, 0, 200, 200);
  box.style.display = 'block';
  clearTimeout(showPeek.t);
  showPeek.t = setTimeout(hidePeek, 3500);
}
function hidePeek() { document.getElementById('peek').style.display = 'none'; }
