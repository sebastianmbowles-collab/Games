// ---------- ui: captions, dialogue, the paper, title cards ----------
let capT = 0;
function cap(text, sec, cls) { const c = $('cap'); c.textContent = text; c.className = cls || ''; capT = sec || Math.max(3.5, text.length * 0.065); }
function hint(text) { if (G.night === 1) cap(text, 7, 'hint'); }
let flashT = 0;
function flash(big, small) { $('flB').textContent = big; $('flS').textContent = small || ''; $('flash').hidden = false; flashT = 2.4; }

// Dialogue is promise-based so night scripts can be written top to bottom with await.
const dead = () => new Promise(() => { });
let dlgNext = null, typing = null;
function showDlg(who, text, opts, low) {
  if (G.scene !== 'play' && !G.cine) return dead();
  const ep = G.epoch;
  return new Promise(res => {
    G.modal++; const box = $('dlg'), T = $('dTxt'), O = $('dOpt'); box.hidden = false; $('dWho').textContent = who || ''; T.textContent = ''; O.innerHTML = ''; $('dMore').hidden = true;
    let i = 0; const done = v => { if (ep !== G.epoch) return; box.hidden = true; dlgNext = null; G.modal = Math.max(0, G.modal - 1); res(v); };
    const finish = () => {
      clearInterval(typing); typing = null; T.textContent = text;
      if (opts) { opts.forEach((o, k) => { const b = document.createElement('button'); b.textContent = (k + 1) + '. ' + o; b.onclick = e => { e.stopPropagation(); audioInit(); sfx.click(); done(k); }; O.appendChild(b); }); dlgNext = k => { if (typeof k === 'number' && k < opts.length) done(k); }; }
      else { $('dMore').hidden = false; dlgNext = () => done(); }
    };
    dlgNext = () => finish();
    clearInterval(typing);
    typing = setInterval(() => { if (ep !== G.epoch) { clearInterval(typing); return; } i += 2; T.textContent = text.slice(0, i); if (who && i % 6 === 0) sfx.mumble(low); if (i >= text.length) finish(); }, 28);
  });
}
const say = (who, text, low) => showDlg(who, text, null, low);
const choose = (who, text, opts, low) => showDlg(who, text, opts, low);
async function talk(who, lines, low) { for (const l of lines) await say(who, l, low); }
$('dlg').addEventListener('click', () => { audioInit(); if (dlgNext) dlgNext(); });

// Documents: the rules, receipts, the back of the photograph, the binder.
let docDone = null, docBack = null;
function doc(html, cls, back) {
  return new Promise(res => {
    $('docIn').className = cls || ''; $('docIn').innerHTML = html; $('docIn').scrollTop = 0; $('doc').hidden = false; G.docOpen = true; docBack = back || null; $('docT').hidden = !back;
    docDone = () => { $('doc').hidden = true; G.docOpen = false; docDone = null; res(); };
  });
}
$('docX').onclick = () => { if (docDone) docDone(); };
$('docT').onclick = () => { if (docBack) { const b = docBack; docBack = b.back; $('docIn').className = b.cls || ''; $('docIn').innerHTML = b.html; } };

const RULES = [
  '', 'Never turn off the lights inside the shop. Even if they begin flickering.',
  'If a man wearing a yellow coat asks you for the time, tell him the shop is closed. Do not give him the time.',
  'The refrigerators must always contain exactly 12 bottles of water. If you count 13, leave them alone.',
  'If someone enters without opening the door, pretend you haven’t noticed.',
  'Never look at the security monitor labelled CAM 4. There is no CAM 4.',
  'At 3:33 AM, you may hear someone knocking from inside the staff toilet. Nobody is supposed to be inside. Do not open it.',
  'If the phone rings three times, answer it. If it rings four times, unplug it.',
  'Customers are not allowed behind the counter. If one appears there, close your eyes and count backwards from 20.',
  'If you see your own reflection waving at you, do not wave back.',
  'At 5:59 AM, leave the building. Do not wait for the clock to reach 6:00.',
  'If you discover a new door, do not enter. It is not part of the building.',
  'IF YOU HAVE REACHED NIGHT SEVEN, YOU HAVE ALREADY BEEN HERE BEFORE. DO NOT LET YOURSELF REMEMBER.'
];
const MARGIN = ['', '', 'i did not write rule 11. did you?', 'look at what the till prints.', 'when he asks you to look, look.', 'the staff room is open tonight.', 'he is coming. he is not on the list.', 'you know the way out. you have always known.'];
const MEMS = { receipts: 'Every receipt has the same name on it. HALLOW.', cam4: 'CAM 4 showed me. Nov 14, 1998. “Don’t trust the manager.”', photo: 'Staff photo. Six night workers. One of them is me. None completed their contract.', binder: 'Mr. Hallow is not in the employee records. There has been no manager since 1971.', door: 'The voice behind the new door is mine.' };
function rulesHTML() {
  let h = '<h2>WELCOME TO MORROW’S.</h2><p style="text-align:center">YOUR SHIFT BEGINS AT 3:00 AM.<br>PLEASE READ THE FOLLOWING RULES CAREFULLY.<br>YOUR LIFE MAY DEPEND ON THEM.</p>';
  const max = G.rule12 ? 12 : (G.night >= 2 ? 11 : 10);
  for (let i = 1; i <= max; i++) h += `<p class="rule ${R.broken.includes(i) ? 'broken' : ''} ${(i === 11 && G.night === 2) || i === 12 ? 'new' : ''}"><b>RULE ${i}.</b> ${RULES[i]}</p>`;
  if (P.myRule) h += `<p class="hand red">RULE 13. ${esc(P.myRule)}</p>`;
  h += '<p class="hand">ONE MORE THING.<br>IF YOU SEE MR. HALLOW TONIGHT…<br>DON’T TELL HIM YOU READ THE RULES.</p>';
  if (MARGIN[G.night]) h += `<p class="hand" style="text-align:right">${MARGIN[G.night]}</p>`;
  return h;
}
function notesHTML() {
  let h = '<p class="hand" style="font-size:2.1em">THINGS THAT DON’T ADD UP</p>';
  const ks = Object.keys(MEMS); let n = 0;
  ks.forEach(k => { if (has(k)) { n++; h += `<p class="hand">– ${MEMS[k]}</p>`; } });
  for (let i = n; i < 5; i++) h += '<p class="hand" style="opacity:.3">– . . .</p>';
  if (R.strikes) h += `<p class="hand red" style="margin-top:1em">rules broken: ${'| '.repeat(R.strikes)}</p>`;
  return h;
}
function openRules() {
  if (G.paperGone) { cap('The counter is bare where the paper was. He took it.'); return Promise.resolve(); }
  const front = { html: rulesHTML() }, back = { html: notesHTML() }; front.back = back; back.back = front;
  return doc(front.html, '', back);
}
function remember(k) { if (!has(k)) { R.mem.push(k); save(); setTimeout(() => cap('You turn the rules over and write it down. (' + R.mem.length + ' of 5)', 5, 'hint'), 900); } }

// Full-screen cards.
function card(html, solid) { const c = $('card'); c.className = (solid ? 'solid ' : '') + 'fade'; c.innerHTML = html; c.hidden = false; void c.offsetWidth; return c; }
function cardBtn(html, label, solid) { return new Promise(res => { const c = card(html + `<button class="pri" id="cGo">${label || 'CONTINUE'}</button>`, solid); $('cGo').onclick = () => { audioInit(); sfx.click(); c.hidden = true; res(); }; }); }
function hideCard() { $('card').hidden = true; }
async function cardTimed(html, sec, solid) { card(html, solid); await wait(sec); }

function hudSync() {
  const play = G.scene === 'play'; $('hud').hidden = !play; if (!play) return;
  $('ck').textContent = fmt(G.clockStop ? G.stopT : G.t) + ' AM'; $('nt').textContent = 'NIGHT ' + G.night;
  const free = !G.modal && !G.docOpen;
  $('bBack').hidden = !G.zoom || !free;
  $('bWave').hidden = !(G.wave && free && !G.zoom && G.eyes < 0.3);
  $('bRules').hidden = $('bMenu').hidden = $('bEyes').hidden = !free;
  $('bEyes').classList.toggle('on', G.eyesHeld);
  $('joy').hidden = !(G.touch && free && !G.zoom);
  $('xh').hidden = !free || !!G.zoom || G.eyes > 0.3; $('xh').classList.toggle('on', !!G.hover);
  $('tip').textContent = free && G.hover && G.eyes < 0.3 && !G.zoom ? G.hover.label : '';
}
