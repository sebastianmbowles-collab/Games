// ---------- flow: title, prologue, starting a night, the five endings ----------
const END_NAMES = { employee: 'THE EMPLOYEE', manager: 'THE MANAGER', customer: 'THE CUSTOMER', exit: 'THE EXIT', real: 'THE FIRST NIGHT' };
const END_ORDER = ['employee', 'manager', 'customer', 'exit', 'real'];
function title() {
  closeOverlays(); G.epoch++; G.scene = 'title'; G.cine = false; G.ext = { station: 1, lit: 1, dawn: 0, car: 0 }; R = P.run;
  amb({ wind: 0.05, drone: 0.025, hum: 0, buzz: 0, static: 0 }, 2);
  const cont = R && R.night <= 7;
  const c = card(`<h1>THE NIGHT SHIFT<small>MORROW’S FUEL &amp; MART · HIGHWAY 19 · 3:00 AM – 6:00 AM</small></h1>
    <p>Some rules are there to keep you safe.<br>Others are there to keep something inside.</p>
    <div class="row">${cont ? `<button class="pri" id="tCont">CONTINUE — NIGHT ${R.night}</button>` : ''}<button class="${cont ? '' : 'pri'}" id="tNew">NEW SHIFT</button></div>
    <div class="ends">${END_ORDER.map((k, i) => `<div class="${P.endings.includes(k) ? 'got' : ''}">${i + 1}. ${P.endings.includes(k) ? END_NAMES[k] : '? ? ?'}</div>`).join('')}</div>
    <label><input type="checkbox" id="tRed" ${P.reduce ? 'checked' : ''}> Reduce flashing</label>
    <p class="dim">Headphones on. Lights off. Contains flickering light, sudden sounds, and a telephone.<br>Walk: W A S D or the on-screen stick \u00b7 Look: mouse or drag \u00b7 Use: click or tap</p>`);
  $('tNew').onclick = () => { audioInit(); sfx.click(); c.hidden = true; prologue(); };
  if (cont) $('tCont').onclick = () => { audioInit(); sfx.click(); c.hidden = true; startNight(R.night); };
  $('tRed').onchange = e => { P.reduce = e.target.checked; save(); };
}
async function prologue() {
  G.epoch++; G.scene = 'card'; G.cine = true; G.ext = { station: 0, lit: 0, dawn: 0, car: 0 };
  amb({ wind: 0.04, drone: 0.02 }, 2);
  await cardBtn('<p>You needed a job.</p>');
  await cardBtn('<p>The pay was surprisingly good. $45 an hour, free snacks and drinks, and only three hours of work each night.</p>');
  const name = await new Promise(res => {
    const c = card('<p class="dim">MORROW’S FUEL &amp; MART — NEW STARTER FORM</p><p>NAME OF EMPLOYEE</p><input type="text" id="pName" maxlength="18" autocomplete="off" spellcheck="false" aria-label="Your name"><button class="pri" id="cGo">SIGN</button><p class="dim">(Leave it empty and the form will just say YOU.)</p>');
    const go = () => { audioInit(); sfx.click(); c.hidden = true; res($('pName').value); };
    $('cGo').onclick = go; $('pName').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') go(); }; try { $('pName').focus(); } catch (e) { /* ignore */ }
  });
  newRun(name);
  await cardBtn('<p>The manager, a tired-sounding man named Mr. Hallow, interviewed you over the phone.</p><p>He asked only three questions.</p>');
  hideCard(); sfx.ring(); await wait(1.2);
  await choose(HAL, Q('Can you work alone?'), [Q('Yes.')]);
  await choose(HAL, Q('Are you afraid of the dark?'), [Q('No.')]);
  await choose(HAL, Q('Can you follow instructions?'), [Q('Yes.')]);
  await say(HAL, Q('Then you start tonight.')); hang();
  G.ext = { station: 1, lit: 1, dawn: 0, car: 1 };
  await cardBtn('<p>The petrol station was called MORROW’S FUEL &amp; MART.</p><p>It stood beside Highway 19, surrounded by miles of empty countryside. There were no houses nearby. No streetlights. No other buildings.</p><p>Just the petrol station, the road and the forest.</p>');
  G.cine = false; startNight(1);
}
async function startNight(n) {
  closeOverlays(); G.epoch++; G.scene = 'card'; G.cine = false; G.ext = { station: 1, lit: 1, dawn: 0, car: 1 };
  audioInit(); ambOff(); amb({ wind: 0.05, drone: 0.02 }, 1);
  await cardBtn(`<p class="dim">${n === 1 ? 'At exactly 2:57 AM, you arrived.' : n === 7 ? '2:57 AM. The last night of your contract.' : '2:57 AM'}</p><h2>NIGHT ${n}</h2><p>${NIGHTS[n].title}</p>`, 'CLOCK IN');
  resetNight(n); PL.x = -0.4; PL.z = 3.5; PL.yaw = 0; PL.pitch = 0; G.doorSwing = 0; G.waved = 0; G.truck = 0; G.truckT = rnd(20, 50); G.six = false; G.sawTape = false; G.hallowAtDoor = false; G.finaleDark = false;
  NIGHTS[n].setup();
  amb(n === 7 ? { hum: 0.02, buzz: 0.006, wind: 0, drone: 0.05 } : { hum: 0.05, buzz: 0.012, wind: 0.03, drone: 0.01 + 0.012 * R.strikes }, 2);
  if (n === 1) { await say('', 'The front door was unlocked. The lights were already on.'); await say('', 'And on the counter sat a folded piece of paper.'); await openRules(); cap('The paper stays on the counter. Read it again whenever you need to (RULES, or R).', 7, 'hint'); }
  else if (n === 2) { await say('', 'There is a door beside the storage cupboard. It wasn’t there yesterday.'); await say('', 'You check the rules. A new one has appeared.'); await openRules(); }
  else if (n === 3) await say('', 'Somebody is already waiting at the door when you unlock the till.');
  else if (n === 5) await say('', 'There is dust on the counter tonight. A week’s worth. A year’s worth. You were here yesterday.');
  else if (n === 7) await say('', 'There are no customers. No cars. No wind. Nothing.');
  G.started = true;
}
function menu() {
  if (G.scene !== 'play' || G.modal || G.docOpen) return; G.modal++;
  const c = card(`<h2>PAUSED</h2><p class="dim">NIGHT ${G.night} · ${fmt(G.clockStop ? G.stopT : G.t)} AM</p>
    <label>Volume <input type="range" id="mVol" min="0" max="1" step="0.05" value="${P.vol}"></label>
    <label><input type="checkbox" id="mRed" ${P.reduce ? 'checked' : ''}> Reduce flashing</label>
    <p class="dim">Walk: W A S D \u00b7 Look: mouse \u00b7 Use: click or E \u00b7 Rules: R \u00b7 Close eyes: hold SPACE \u00b7 Wave: F</p>
    <div class="row"><button class="pri" id="mGo">BACK TO WORK</button><button id="mQuit">QUIT TO TITLE</button></div>`, true);
  $('mVol').oninput = e => setVol(+e.target.value);
  $('mRed').onchange = e => { P.reduce = e.target.checked; save(); };
  $('mGo').onclick = () => { c.hidden = true; G.modal = Math.max(0, G.modal - 1); };
  $('mQuit').onclick = () => { c.hidden = true; title(); };
}

async function story(lines, label) { for (const l of lines) await cardBtn('<p>' + l + '</p>', label || '…'); }
const ENDINGS = {
  async employee() {
    G.ext = { station: 1, lit: 1, dawn: 0.45, car: 1 };
    await story(['At 5:59 the door opens for you, as if it had been waiting.', 'You followed the rules. You escaped.', 'You drive home with the sun coming up behind you. You sleep until the afternoon. You do not dream.', 'The next morning, you receive a message.']);
    await cardBtn('<div class="lcd">MORROW’S FUEL &amp; MART\n\nYour next shift begins tonight.\n3:00 AM.</div>', '…', true);
  },
  async manager() {
    G.ext = { station: 1, lit: 0, dawn: 0, car: 1, fig: { look: 'hallow', x: 300, y: 200, h: 50, walk: true } };
    await story(['You sign. The pen is warm, as though someone has only just put it down.', 'On the other side of the glass, Mr. Hallow reads the line over your shoulder. For the first time, his face moves.', 'It is relief.', '“Twenty-six years,” he says, through the door he never opens. “I thought nobody would ever take it.”', 'He walks out across the forecourt towards the road. He does not look back. The bell rings for him.', 'You are now responsible for writing the rules.']);
    const rule = await new Promise(res => {
      const c = card('<p>The paper is in front of you. There is room at the bottom.</p><p>RULE 13.</p><input type="text" id="pRule" maxlength="90" autocomplete="off" style="width:30em;text-transform:none" aria-label="Rule 13"><button class="pri" id="cGo">LEAVE IT ON THE COUNTER</button><p class="dim">Whoever works here next will find it.</p>');
      const go = () => { sfx.click(); c.hidden = true; res($('pRule').value.trim()); }; $('cGo').onclick = go; $('pRule').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') go(); };
    });
    if (rule) { P.myRule = rule; save(); }
  },
  async customer(why) {
    G.ext = { station: 1, lit: 1, dawn: 0, car: 0, clerk: true, fig: { look: 'coat', x: 250, y: 204, h: 52, walk: true } };
    await story([why === 'door' ? 'It is not part of the building. Neither, now, are you.' : why === 'six' ? 'The clock reaches 6:00. You are still inside. So is everything else.' : 'You broke too many rules. The station noticed. The station always notices.',
      'The next night, someone else is working behind the counter. New. Nervous. Reading a piece of paper.', 'You enter the shop. The bell does not ring for you.', 'Your coat is yellow. It has always been yellow. It is still wet.', 'You stand in front of the counter. You cannot remember why it matters so much. Only that it does.', '“Excuse me.”', '“Do you know what time it is?”']);
  },
  async exit() {
    G.ext = { station: 1, lit: 0, dawn: 0.1, car: 1 };
    await story(['It is not part of the building. That was always the point of it.', 'Behind the door: a corridor of lockers, hundreds of them, each with a name on yellowed tape. Morrow. Pike. Alder. Voss. March. Yours, again and again.', 'You open them one at a time. There is a coat in every one. You carry them out through the far end, into air that smells of rain and diesel and morning.']);
    for (let i = 1; i <= 30; i++) { G.ext.station = 1 - i / 30; G.ext.dawn = 0.1 + i / 30 * 0.8; await wait(0.09); }
    await story(['When you turn round there is a gravel lay-by, six people blinking in the daylight, and nothing else.', 'The petrol station disappears from Highway 19.', 'Nobody ever asks you the time again.']);
  },
  async real() {
    G.ext = { station: 1, lit: 1, dawn: 0, car: 1 };
    await story(['You stay. The clocks, which had stopped, start again. 5:59. 6:00.', 'The lights come back, and for the first time you see the station the way it really is.', 'It has been repeating the same seven nights for decades.', 'Mr. Hallow isn’t the manager. He’s the previous employee. The one who failed to leave.', 'And the rules?', 'They weren’t written to protect employees from the station.', 'They were written to protect the station from whatever is trying to get out.', 'You wrote them. Every time round, in your own handwriting, for the next one of you to find. You are what is trying to get out.', 'It is 6:00, and you remember. Every door in the building is opening.']);
    const lines = ['THANK YOU FOR WORKING AT MORROW’S FUEL & MART.', '', 'WE HOPE YOU ENJOYED YOUR STAY.', '', 'EMPLOYEE STATUS: REPLACED.', '', 'NEW EMPLOYEE: HIRED.', '', 'SHIFT BEGINS: 3:00 AM.', '', 'THE END.'];
    const c = card('<div class="lcd" id="eTerm"></div>', true); let txt = '';
    for (const l of lines) { txt += l + '\n'; $('eTerm').textContent = txt; if (l) { sfx.beep(); await wait(1.1); } }
    await wait(2.5); c.hidden = true;
  }
};
async function ending(kind, why) {
  G.ended = true; G.epoch++; closeOverlays(); G.scene = 'ending'; G.cine = true; G.zoom = null; G.eyesHeld = false; muffle(false); ambOff(); amb({ drone: 0.07, wind: kind === 'exit' || kind === 'employee' ? 0.05 : 0.02 }, 2);
  const first = !P.endings.includes(kind); if (first) P.endings.push(kind); P.run = null; save();
  if (kind === 'customer' || kind === 'real') sfx.power(); else sfx.bell();
  await ENDINGS[kind](why);
  const n = END_ORDER.indexOf(kind) + 1, left = 5 - P.endings.length;
  await cardBtn(`<p class="dim">ENDING ${n} OF 5</p><h2>${END_NAMES[kind]}</h2><p class="dim">${left ? left + (left === 1 ? ' ending is' : ' endings are') + ' still out there. The back of the rules paper remembers what you find.' : 'You have seen every way this shift can end.'}</p>`, 'BACK TO HIGHWAY 19', true);
  G.cine = false; title();
}
