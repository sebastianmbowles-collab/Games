// The whole run from waking up to an ending.
import { C, THREE, wait, tween, ease, setView, clearHots } from './core.js';
import { S, meta, saveMeta, newRun, autosave, loadRun, hasSave, clearSave, D, DIFF, lost } from './state.js';
import { dealer } from './dealer.js';
import { setAct } from './world.js';
import { A, initAudio } from './audio.js';
import { ui, say, ask, screen, hideScreen, actCard, cardText, meters, status, keys, toast, settingsHtml, bindSettings, fade, hideSay, clearChoices, timer } from './ui.js';
import { watch, hurt } from './watch.js';
import { intermission } from './intermission.js';
import { ENDINGS } from './text.js';
import { playBluff } from './games/bluff.js';
import { playLabyrinth } from './games/labyrinth.js';
import { playBalance } from './games/balance.js';
import { playChess } from './games/chess.js';
import { playBackgammon } from './games/backgammon.js';
import { runEnding } from './endings.js';
import { clearFigures } from './fx.js';

const TITLES = ['', "THE LIAR'S DECK", 'THE CARVED LABYRINTH', 'THE SOUL SCALE', 'THE CHESS OF GLASS', 'THE FINAL GAMBIT'];
const GAMES = [null, playBluff, playLabyrinth, playBalance, playChess, playBackgammon];
let runToken = 0;

export function boot() {
  setAct(1);
  setView('seat', { yaw: 0, pitch: -0.22 });
  C.input = false;
  meters(false);
  ui.canPause = () => C.input && !ui.screenOpen && !ui.modalOpen;
  ui.onPauseQuit = () => quitToMenu();
  const q = new URLSearchParams(location.search);
  if (q.get('dev')) return devStart(q);
  if (!meta.played && !hasSave()) firstWake();
  else titleMenu();
}

// ---------------------------------------------------------------- title
function firstWake() {
  C.fx.black = 1;
  let diff = 'normal';
  const s = screen(`<div class="note" style="margin:0 0 30px">This game is meant to be played with headphones, in the dark.</div>
    <div class="wake">click to wake up</div>
    <div class="row">${Object.keys(DIFF).map(k => `<button class="btn diffbtn ${k === diff ? 'on' : ''}" data-d="${k}">${DIFF[k].label}</button>`).join('')}</div>
    <div class="note">Easy: he is slower to notice and gentler when you lose. Nightmare: he notices everything.</div>`);
  s.onclick = e => {
    const b = e.target.closest('[data-d]');
    if (b) { diff = b.dataset.d; s.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === b)); return; }
    if (e.target.closest('.wake')) { initAudio(); hideScreen(); newGame(diff); }
  };
}

function titleMenu() {
  C.fx.black = 0;
  setAct(1);
  dealer.hide(false);
  dealer.cloak.visible = false;
  dealer.lookAtPlayer();
  setView('seat', { yaw: 0, pitch: -0.2 });
  meters(false);
  C.input = false;
  const save = hasSave() ? (() => { try { return JSON.parse(localStorage.getItem('anteup.save.v1')); } catch { return null; } })() : null;
  const s = screen(`<h1>ANTE &spades; UP<em>HOUSE RULES</em></h1>
    <div class="sub">You don't just play the game. You live the consequences.</div>
    <div class="menu">
      ${save ? `<button class="btn" data-a="cont">Continue<small>${save.name}, Act ${save.act}: ${TITLES[save.act]} (${DIFF[save.diff]?.label})</small></button>` : ''}
      <button class="btn" data-a="new">New Game</button>
      <button class="btn" data-a="end">Endings <small>${Object.keys(meta.endings).length} of 4 found</small></button>
      <button class="btn" data-a="set">Settings</button>
    </div>`, { clear: true });
  s.style.background = 'radial-gradient(ellipse at center, rgba(0,0,0,.25), rgba(0,0,0,.85))';
  s.onclick = e => {
    initAudio();
    A.music('title');
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cont') { hideScreen(); continueRun(); }
    if (a === 'new') newMenu();
    if (a === 'end') gallery();
    if (a === 'set') settingsScreen();
  };
}
function newMenu() {
  let diff = 'normal';
  const s = screen(`<h1 style="font-size:48px">A NEW GAME</h1>
    <div class="row">${Object.keys(DIFF).map(k => `<button class="btn diffbtn ${k === diff ? 'on' : ''}" data-d="${k}">${DIFF[k].label}</button>`).join('')}</div>
    <div class="note">Easy: he is slower to notice and gentler when you lose. Normal: as intended. Nightmare: he notices everything, and he plays well.</div>
    ${hasSave() ? '<div class="note" style="color:#b06050">Starting over replaces your saved game.</div>' : ''}
    <div class="row"><button class="btn" data-a="go">Close your eyes</button><button class="btn" data-a="back">Back</button></div>`, { clear: true });
  s.style.background = 'rgba(0,0,0,.85)';
  s.onclick = e => {
    const b = e.target.closest('[data-d]');
    if (b) { diff = b.dataset.d; s.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('on', x === b)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'go') { hideScreen(); newGame(diff); }
    if (a === 'back') titleMenu();
  };
}
function gallery() {
  const s = screen(`<h1 style="font-size:48px">ENDINGS</h1><div class="gal">${Object.entries(ENDINGS).map(([k, e]) => meta.endings[k]
    ? `<div class="got"><b>${e.title}</b><i>Found ${meta.endings[k]} time${meta.endings[k] > 1 ? 's' : ''}.</i></div>`
    : `<div><b>???</b><i>${e.hint}</i></div>`).join('')}</div>
    <div class="row"><button class="btn" data-a="back">Back</button></div>`, { clear: true });
  s.style.background = 'rgba(0,0,0,.88)';
  s.onclick = e => { if (e.target.closest('[data-a]')) titleMenu(); };
}
function settingsScreen() {
  const s = screen(`<h1 style="font-size:48px">SETTINGS</h1><div style="width:min(620px,90vw);margin-top:20px">${settingsHtml()}</div><div class="row"><button class="btn" data-a="back">Back</button></div>`, { clear: true });
  s.style.background = 'rgba(0,0,0,.88)';
  bindSettings(s);
  s.onclick = e => { if (e.target.closest('[data-a]')) titleMenu(); };
}

function quitToMenu() {
  runToken++;
  hideSay();
  clearChoices();
  clearHots();
  watch.stop();
  timer(null);
  status(''); keys('');
  location.reload();
}

// ---------------------------------------------------------------- the run
async function newGame(diff) {
  clearSave();
  meta.played = true;
  saveMeta();
  const tok = ++runToken;
  A.music('off');
  A.stopMusic();
  await opening(diff);
  if (tok !== runToken) return;
  runActs(1, true);
}
async function continueRun() {
  if (!loadRun()) return titleMenu();
  S.suspicion = 0;
  ++runToken;
  C.fx.black = 1;
  runActs(S.act, true);
}

async function opening(diff) {
  C.fx.black = 1;
  dealer.hide(true);
  ambientOff();
  await wait(0.8);
  A.ambient(1);
  A.I.breath(A.aNow() + 0.05, 2.6, 0.6);
  say('you', 'Darkness. You can hear someone breathing. Slow. Heavy.', { auto: 2.2 });
  await wait(2.6);
  say('you', 'Footsteps, dragging across wet stone. Coming closer.', { auto: 2 });
  for (let i = 0; i < 5; i++) { A.sfx('step', 0.5); await wait(0.5); if (i === 2) A.sfx('drag'); }
  A.I.breath(A.aNow() + 0.05, 2.2, 0.8);
  await wait(0.6);
  A.sfx('shackle');
  C.fx.red = 0.3;
  await say('you', 'Something cold and iron snaps shut around your ankle.', { auto: 1.8 });
  const name = await ask('Before you open your eyes, a voice inside your head asks: <i>what do they call you?</i>', { placeholder: 'your name', ok: 'Answer' });
  newRun(name, diff);
  await wait(0.6);
  A.sfx('ignite');
  await tween(4, k => { C.fx.black = 1 - k; }, ease.in);
}
function ambientOff() { A.ambient(0); }

async function runActs(from, fresh) {
  const tok = runToken;
  for (let act = from; act <= 5; act++) {
    if (tok !== runToken) return;
    S.act = act;
    S.cheatedThisAct = false;
    autosave();
    const r = await actFlow(act, fresh, tok);
    fresh = true;
    if (tok !== runToken) return;
    if (r && r.ending) return finish(r.ending);
    if (r === 'restart') { act--; fresh = false; continue; }
  }
}

async function actFlow(act, fresh, tok) {
  hideScreen();
  clearFigures();
  setAct(act);
  dealer.hide(false);
  dealer.cloak.visible = false;
  dealer.u.uSink.value = 0;
  dealer.points.visible = dealer.headGrp.visible = true;
  dealer.setEyes(1);
  dealer.grin.material.opacity = 1;
  setView('seat', { yaw: 0, pitch: [0, -0.14, -0.2, -0.06, 0.02, -0.12][act] });
  C.fx.black = 1;
  C.input = false;
  meters(false);
  await actCard(act, TITLES[act]);
  A.music('act' + act, { restart: true });
  A.M.intensity = 0; A.M.tick = 0; A.M.layers = 4 - ['pet', 'friend', 'home', 'name'].filter(lost).length; A.M.hopeful = false;
  await tween(2.2, k => { C.fx.black = 1 - k; }, ease.io);
  meters(true);
  C.input = true;
  if (fresh) await intro(act);
  else await say('dealer', act <= 2 ? 'Awake again? Good. We start over.' : 'Again.');
  for (;;) {
    if (tok !== runToken) return null;
    const r = await GAMES[act]();
    if (tok !== runToken) return null;
    if (r && r.ending) return r;
    if (r === 'win') break;
    if (r === 'lose') {
      A.sfx('lose');
      if (act < 5) hurt(20);
      if (act === 5) return { ending: 'consumed' };
    }
    if (S.sanity <= 0 || r === 'blackout') {
      const z = await sanityZero(act);
      if (z) return z;
      continue;
    }
    if (r === 'lose') await say('dealer', 'Again. From the beginning.');
  }
  if (act < 5) {
    A.sfx('win');
    await say('dealer', ['', 'Enough cards. Go. Stretch your little chain. I will be back.', 'Rest. Wander. I have... other business.', 'Look around, if you can find a floor to stand on.', 'Go on. Get warm, if you can.'][act]);
    meters(true);
    await intermission(act);
    if (tok !== runToken) return null;
    await fade(1, 1.2);
    C.fx.black = 1;
    await fade(0, 0.01);
  }
  return null;
}

async function sanityZero(act) {
  if (act === 3 || act === 4) return { ending: 'consumed' };
  if (act === 5) {
    if (!S.lastChance) {
      S.lastChance = true;
      S.sanity = 1;
      A.sfx('heartbeat', 1);
      await say('you', 'Everything goes grey. Then, from very far away, a flame. You are still here. Barely.');
      await say('dealer', 'Still awake? Stubborn. One more chance, {name}. There will not be another.');
      return null;
    }
    return { ending: 'consumed' };
  }
  // acts 1-2: you black out and wake at the start of the act
  S.blackouts++;
  C.input = false;
  A.sfx('heartbeat', 1);
  await tween(2, k => { C.fx.black = k; }, ease.in);
  await cardText('You black out.', 2.5);
  const keep = { blackouts: S.blackouts, endingsSeen: 0 };
  loadRun();
  S.blackouts = keep.blackouts;
  S.sanity = Math.max(S.sanity, 55);
  autosave();
  return 'restart';
}

async function intro(act) {
  const dl = (t, o) => say('dealer', t, o);
  if (act === 1) {
    dealer.lookAtPlayer();
    await dl('Ahh. Awake. Welcome to my table, {name}.');
    A.sfx('tooth', 1);
    await dl('The last one did not finish.');
    await say('you', 'Your ankle is heavy. An iron shackle. A chain runs from it to a ring in the floor.');
    await dl('Do not pull at the chain. It does not like it. Neither do I.');
    await dl('Here, we play games. You win, or you stay. Those are the house rules.');
    await dl('First, something simple. A child\'s game. Blind Man\'s Bluff.');
    await dl('You will hold your card to your forehead. You see mine. I see yours. Neither of us sees our own.');
    await dl('High card wins. We bet with teeth. Win three hands and you win the match.');
    await dl('Lose, and we play again. Every time you lose, you lose a little of yourself.');
    toast('Press <b>R</b> at any time to read the rules. Drag the mouse to look around.', '', 7);
  } else if (act === 2) {
    await say('you', 'The candle gutters. Black roots have crept across the ceiling while you were gone. They move when he breathes.');
    await dl('Your hands are steadier, {name}. That is boring.');
    await dl('Here is a game I love. A family game.');
    await dl('Three little pieces of wood. A child, a mother, a father. Bring them all home to the middle of the board.');
    await dl('I have a wolf.');
    await dl('Roll the bone. Move one of them. Then my wolf moves. If he lands on one of yours... crunch. Back to the start.');
    await dl('The hearths are safe. The thorns are not. And the board has paths only the candle knows. Blow on it, if you like.');
    toast('Press <b>R</b> for the rules of the Labyrinth.', '', 5);
  } else if (act === 3) {
    await say('you', 'The floor is gone. The table hangs over an ocean of mist. Thousands of small white eyes blink in the dark below.');
    await dl('Do you know what weighs the most, {name}? Not lead. Not gold.');
    await dl('Regret.');
    await dl('This is The Balance. You place feelings on your side. I place mine on my side.');
    await dl('Make the scale hang perfectly level, and you win the round. Let my side sink, and I keep something. Three level rounds wins.');
    await dl('Fear, Regret, Guilt, Anger. They do not weigh the same. You will have to learn how much each one weighs.');
    toast('Press <b>R</b> for the rules of the Balance.', '', 5);
  } else if (act === 4) {
    await say('you', 'Black ice crusts the walls. Your breath smokes. He has grown: his head scrapes the beams.');
    if (S.memories.pet && !lost('pet')) await say('you', 'You think of {pet}, waiting by the door at {home}. It helps, a little.');
    else if (S.memories.pet) await say('you', 'You try to think of home. Of someone waiting by a door. There is only a blank space where they should be.');
    await dl('No more patience. I am tired of waiting for you, {name}.');
    await dl('Chess. Real chess. Every rule you know. But the pieces are glass, and so are you.');
    await dl(`You have ${D().moveLimit} seconds a move. Tick. Tock. Run out, and I shake the board.`);
    if (S.items.weight) toast('You have the <b>lead weight</b>. Use it to pin one of your pieces so his slams can\'t move it.', 'good', 7);
  } else if (act === 5) {
    await say('you', 'The cellar is coming apart. Stone cracks. The candle is a stub. Shadows run across the floor toward the table.');
    await dl('The last game, {name}.');
    await dl('Backgammon. Dice. All the old rules. And this.');
    A.sfx('cock');
    await dl('It is a very old gun. It does not fire lead. It fires the dark.');
    await dl('One round in six chambers. When I hit one of your pieces, I spin, and I pull. When you hit one of mine, I take a round out. Fair?');
    await dl('Nothing here is fair.');
  }
}

async function finish(id) {
  watch.stop();
  clearHots();
  hideSay();
  clearChoices();
  status(''); keys(''); timer(null);
  meters(false);
  C.input = false;
  await runEnding(id);
  clearSave();
  location.reload();
}

// ---------------------------------------------------------------- dev
async function devStart(q) {
  newRun(q.get('name') || 'Tester', q.get('diff') || 'normal');
  const act = +(q.get('act') || 1);
  S.act = act;
  for (const it of (q.get('items') || '').split(',').filter(Boolean)) S.items[it] = true;
  for (const f of (q.get('flags') || '').split(',').filter(Boolean)) S.flags[f] = true;
  if (q.get('san')) S.sanity = +q.get('san');
  if (q.get('mem')) Object.assign(S.memories, { pet: { a: 'Biscuit', kind: 'dog', lost: false }, friend: { a: 'Sam', lost: false }, home: { a: 'Elm Street', lost: false } });
  hideScreen();
  C.fx.black = 0;
  ++runToken;
  if (q.get('ending')) return finish(q.get('ending'));
  if (q.get('int')) { setAct(act); meters(true); C.input = true; await intermission(act); return; }
  runActs(act, !q.get('nointro'));
}
export { THREE };
