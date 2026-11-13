// ---------- the seven nights ----------
const HAL = 'MR. HALLOW (PHONE)', HALP = 'MR. HALLOW', MAN = 'MAN IN THE YELLOW COAT', Q = s => '“' + s + '”';
const IT = {
  coffee: { k: 'cup', n: 'Coffee', p: 1.5 }, jerky: { k: 'bag', n: 'Beef jerky', p: 4.99, c: '#7a2f2a' }, water: { k: 'bottle', n: 'Water', p: 1.25, water: true },
  gum: { k: 'box', n: 'Gum', p: 0.99, c: '#4f8f5a' }, ticket: { k: 'paper', n: 'Lottery ticket', p: 2 }, news: { k: 'paper', n: 'Newspaper', p: 1.2 },
  energy: { k: 'can', n: 'Energy drink', p: 2.75, c: '#2c5fa8' }, chips: { k: 'bag', n: 'Crisps', p: 1.8 }, aspirin: { k: 'box', n: 'Aspirin', p: 3.4, c: '#d8d3c2' }, smokes: { k: 'box', n: 'Cigarettes', p: 9.2, c: '#8a2a2a' },
  teeth: { k: 'jar', n: 'JAR (TEETH)', p: 0, w: 'The scanner accepts it. JAR (TEETH) $0.00.' }, nohands: { k: 'clock', n: 'CLOCK, NO HANDS', p: 0, w: 'It has no hands. It is ticking.' },
  key: { k: 'key', n: 'KEY', p: 0, w: 'There is a paper tag on the key. It has your name on it.' }, wet: { k: 'photo', n: 'PHOTOGRAPH (WET)', p: 0, w: 'A photograph of the back of your head. Taken from where they are standing now.' }
};
const C = (t, spec) => at(t, () => enter(spec));
const call = (t, rings, fn) => at(t, () => startCall(rings, fn));
const hang = () => sfx.hang();
const KN = {
  1: [Q('Hello? Is somebody out there?'), Q('The handle is stuck. Could you just—'), Q('…I know you can hear me.')],
  2: [Q('I work here. Let me out. I WORK here.'), Q('You’re the new one. They said there’d be a new one.'), Q('What time is it? At least tell me that.')],
  3: [Q('It’s cold in here. It’s so cold.'), Q('He locked it. Hallow locked it.'), '…'],
  4: [Q('Don’t check the cameras.'), Q('Don’t check the cameras. Don’t check the—'), '(something heavy slides down the inside of the door)'],
  5: ['(your own voice)  ' + Q('It’s me. It’s YOU. Open the door.'), '(your own voice)  ' + Q('I opened it, the first time. That’s how I got in here.'), '(your own voice)  ' + Q('Please.')],
  6: [Q('He’s coming tonight.'), Q('Whatever he asks you. No. The answer is no.'), '…']
};
// The man in the yellow coat (rule 2). Every wording is a trap except "the shop is closed".
async function coatAsk(q, trapYes) {
  let silent = 0;
  for (; ;) {
    const opts = trapYes ? [Q('Yes.'), Q('No.'), Q('The shop is closed.'), 'Say nothing.'] : ['Tell him the time.', Q('The shop is closed.'), 'Say nothing.'];
    const c = await choose(MAN, q, opts, true), closed = trapYes ? 2 : 1, quiet = trapYes ? 3 : 2;
    if (c === closed) { await say(MAN, '…', true); return true; }
    if (c === quiet) { silent++; if (silent >= 3) { strike(2, 'You did not tell him the shop is closed.'); return false; } q = silent === 1 ? Q('I asked you a question.') + ' He has not moved. ' + Q('The time.') : Q('Please. It matters to me more than anything. What time is it?'); continue; }
    strike(2, 'You gave him the time.');
    await say(MAN, Q(fmt(G.t) + '. Thank you.'), true);
    await say('', 'He writes it on the palm of his hand. There are other times there already. Hundreds of them. They are all between three and six.');
    return false;
  }
}
async function coat1(p) {
  await say('', 'He doesn’t buy anything. He simply stands in front of the counter. His face is hidden beneath his hood.');
  await say(MAN, Q('Excuse me.'), true);
  await coatAsk(Q('Do you know what time it is?'));
  await say('', 'He turns to go. At the door, he turns around.'); p.smile = true;
  await say(MAN, Q('You’re new, aren’t you?'), true);
  await say('', 'He smiles.');
  await say(MAN, Q('That’s unfortunate.'), true);
  leave(p);
}
async function coat3(p) {
  await say('', 'The yellow coat again. He nods at the wall behind you.');
  await coatAsk(Q('Is that clock right?'), true);
  await say(MAN, Q('They all say closed. Every one of you. It was open when I worked here.'), true);
  leave(p);
}
async function coat4(p) {
  await say('', 'He comes straight to the counter this time. Rain is running off the coat. It is not raining.');
  await say(MAN, Q('He told you to look, didn’t he. At the screens.'), true);
  await say(MAN, Q('He asked me to look, too.'), true);
  await coatAsk(Q('How long was I standing out there? Roughly. To the nearest hour.'));
  leave(p);
}
async function coat5(p) {
  await say('', 'He puts both hands flat on the counter. The palms are covered in numbers.');
  await coatAsk(Q('How long until six? You can tell me that. That isn’t the time. That’s just a number.'));
  p.smile = true;
  await say(MAN, Q('I had a locker. Third from the left. Is my coat still in it?'), true);
  leave(p);
}
async function hallowTalk(p) {
  await say('', 'He did not open the door. You are almost sure he did not open the door.');
  await say('', 'Grey suit. Clipboard. He looks perfectly ordinary.');
  await say(HALP, Q('Good evening.'));
  await choose(HALP, Q('How are you finding the job?'), [Q('Fine.'), Q('Quiet.'), Q('Strange.')]);
  await say('', 'He looks at the rules. Then at you.');
  await say(HALP, Q('Interesting.'));
  await say('', 'He picks up the paper.');
  const a = await choose(HALP, Q('Who gave you these?'), [Q('They were here when I arrived.'), Q('You did.'), 'Say nothing.']);
  await say(HALP, a === 1 ? Q('No. I did not.') : Q('Were they.'));
  const b = await choose(HALP, Q('And have you read them?'), [Q('No.'), Q('Yes.')]);
  if (b === 1) {
    R.told = true; G.paperGone = true; strike(0, 'Don’t tell him you read the rules.');
    await say(HALP, Q('Then you won’t be needing them.'));
    await say('', 'He folds the paper into his jacket. The handwriting at the bottom is facing out. He reads it. He does not blink.');
  } else {
    await say(HALP, Q('Good. Don’t. They are not for you.'));
    await say('', 'He puts the paper down, upside down. The handwritten lines are facing him. He pretends not to read them.');
  }
  await say(HALP, Q('I have left the employee record on the counter. Everyone signs it. Before the end of the week.'));
  G.binder = true;
  await say('', 'He leaves through the front door. This time you watch. He does not open it.');
  p.fadeOut = true; G.counter = null;
}
async function finaleCall() {
  const V = 'YOUR OWN VOICE (PHONE)';
  await say(V, Q('Listen carefully. You have to leave before six.'), true);
  await say(V, '…', true); await say(V, Q('Actually…'), true); await say(V, '…', true);
  await say(V, Q('Have you checked the rules?'), true);
  G.rule12 = true; G.paperGone = false;
  await say('', 'You look down. There is a new rule.');
  G.modal++; await openRules(); G.modal = Math.max(0, G.modal - 1);
  if (R.mem.length >= 5) {
    const c = await choose(V, Q('…You wrote things down. On the back. Didn’t you.'), [Q('I remember.'), 'Say nothing.'], true);
    if (c === 0) { G.remember = true; await talk(V, [Q('Then you know what the rules are for.'), Q('They were never keeping anything out.'), Q('Don’t go at 5:59. Stay where you are. Let the clock reach six.'), Q('It cannot hold all of us.')], true); }
    else await say(V, Q('Good. Don’t. When the ticking stops, walk out of the front door.'), true);
  } else await talk(V, [Q('Never mind. You don’t know enough. That is safer.'), Q('When the ticking stops, walk out of the front door. Don’t touch what he left on the counter. Don’t go near the door that shouldn’t be there.')], true);
  hang();
  await say('', 'The line goes dead. Somewhere in the dark, something begins to tick.');
  G.ticking = true; G.speed = 0.25; G.hallowAtDoor = true;
}

const NIGHTS = {
  1: { title: 'The Yellow Coat', setup() {
    at('3:00', () => hint(G.touch ? 'Your shift has begun. Walk with the stick. Drag to look around. Tap things to use them.' : 'Your shift has begun. Walk with W A S D. Click the picture, then move the mouse to look. Click things to use them.'));
    C('3:04', { look: 'dale', items: [IT.coffee, IT.jerky], greet: 'Evening. Or morning. Never can tell out here.', bye: 'Didn’t think this place was still open.', wave: true });
    at('3:07', () => hint('The bell rang: a real customer. When they reach the counter, click each item to scan it, then the cash register.'));
    call('3:11', 3, async () => { await talk(HAL, [Q('This is Mr. Hallow. Just checking that you found the place.'), Q('It’s a quiet job. Serve whoever comes in.'), Q('Whoever comes in.'), Q('I’ll look in on you, one of these nights.')]); hang(); });
    C('3:17', { look: 'coat', label: 'Man in a yellow coat', special: true, browse: 1.2, onArrive: coat1 });
    at('3:25', () => flicker(3));
    at('3:33', () => startKnock(KN[1]));
    C('3:42', { look: 'nurse', items: [IT.water, IT.gum], greet: 'Long night. You too, I suppose.', bye: 'Drive safe. Well. You know what I mean.' });
    call('3:56', 4);
    at('4:10', () => enter({ look: 'nurse', real: false, toCounter: false, stay: 20, spot: 1 }));
    C('4:32', { look: 'old', items: [IT.ticket, IT.news], greet: 'Same numbers every week. Since ninety-eight.', bye: 'You look just like the last one.' });
    at('4:48', () => { G.wave = { who: 'me', t: 11 }; });
    call('5:02', 3, async () => { await say('PHONE', 'Static. A shop bell, a long way down the line. Then a voice you almost recognise:', true); await say('PHONE', Q('You’re doing so well.'), true); hang(); });
    at('5:14', () => flicker(5, true));
    C('5:34', { look: 'teen', items: [IT.energy], greet: '…', bye: 'There’s a guy out by pump two. Yellow coat. Just standing there.', wave: true });
    at('5:36', () => G.outside.push({ look: 'coat', at: 'pump' }));
    at('5:50', () => hint('At 5:59, click the front door. Not before. Not after.'));
  } },
  2: { title: 'The Extra Room', setup() {
    call('3:06', 3, async () => {
      const c = await choose(HAL, Q('Mr. Hallow. Anything out of place tonight?'), [Q('There is a new door.'), Q('No.')]);
      if (c === 0) await talk(HAL, [Q('…There are three doors on that wall. Storage. Toilet. The fridges.'), Q('Count them again.')]); else await say(HAL, Q('Good. Don’t go looking.'));
      hang();
    });
    C('3:14', { look: 'teen', items: [IT.energy, IT.chips], greet: 'You got a bathroom? …Never mind. Sounds like someone’s in there.', bye: 'Later.' });
    at('3:22', () => { sfx.knock(panTo(-6, 1.7)); G.doorAjar = 0; cap('(from the new door)  knock. knock. knock.   ' + Q('You’re late.'), 6, 'far'); });
    at('3:33', () => startKnock(KN[2]));
    at('3:48', startThirteen);
    C('4:02', { look: 'suit', items: [IT.water, IT.aspirin], greet: 'Is it always this bright in here?', bye: 'This one’s warm.' });
    at('4:15', startBehind);
    at('4:28', () => { G.outside.push({ look: 'coat', at: 'window' }); cam4(14); });
    at('4:40', () => { G.outside = []; });
    call('4:42', 4);
    at('4:54', () => enter({ look: 'suit', real: false, stay: 0, spot: 0, browse: 5 }));
    at('5:08', () => { G.doorAjar = 1; sfx.creak(panTo(-6, 1.7)); G.sched.push({ t: G.t + 7, fn: () => { G.doorAjar = 0; sfx.thud(); } }); });
    at('5:20', () => flicker(5, true));
    C('5:30', { look: 'driver', items: [IT.coffee], greet: 'Two sugars. Cheers.', bye: 'Who’s the fella in your back room? Through that new door. He waved at me.' });
    at('5:46', () => { G.wave = { who: 'me', t: 11 }; });
  } },
  3: { title: 'The Customers', setup() {
    at('3:01', () => { enter({ look: 'stand', st: 'fixed', spot: 0, label: 'A customer, standing', onClick: () => cap('He does not turn round. He is studying the shelf. The shelf is empty.') }); });
    C('3:08', { look: 'blank1', items: [IT.teeth, IT.water], bye: null });
    C('3:20', { look: 'old', items: [IT.nohands, IT.key], greet: 'Found these in aisle two. You do sell these.', bye: 'It’s for you, really. The key.' });
    at('3:33', () => startKnock(KN[3]));
    at('3:37', () => enter({ look: 'blank2', real: false, items: [IT.smokes], browse: 4 }));
    call('3:50', 3, async () => { await talk(HAL, [Q('Busy tonight? Good.'), Q('One thing. Don’t read what the till prints. It isn’t for you.')]); hang(); });
    C('4:00', { look: 'blank2', items: [IT.wet, IT.smokes] });
    C('4:17', { look: 'coat', label: 'Man in a yellow coat', special: true, browse: 1.2, onArrive: coat3 });
    at('4:30', startBehind);
    C('4:40', { look: 'blank1', items: [IT.gum] });
    at('4:41', () => enter({ look: 'blank1', real: false, items: [IT.gum], browse: 9 }));
    at('4:55', startThirteen);
    call('5:05', 4);
    at('5:10', () => { shuffleCams(); cam4(20); });
    C('5:15', { look: 'suit', special: true, browse: 2, onArrive: async p => {
      const c = await choose('CUSTOMER', Q('The lights. They hurt. Turn them off, would you? Just for a moment.'), [Q('I can’t do that.'), 'Turn off the lights.']);
      if (c === 1) { lightSwitch(); await say('', 'In the dark, she is much closer than she was.'); } else await say('CUSTOMER', Q('No. You never do.'));
      leave(p);
    } });
    at('5:30', () => flicker(6, true));
    at('5:42', () => { G.wave = { who: 'me', t: 11 }; });
    at('5:57', () => { const s = G.people.find(p => p.look === 'stand'); if (s) removePerson(s); G.outside.push({ look: 'stand', at: 'door' }); });
  } },
  4: { title: 'CAM 4', setup() {
    shuffleCams();
    C('3:05', { look: 'dale', items: [IT.coffee, IT.jerky], greet: 'Wasn’t I just in here? …What year d’you make it?', bye: 'Didn’t think this place was still open.', wave: true });
    call('3:15', 3, async () => { await talk(HAL, [Q('Flickering again? There’s a trick to it.'), Q('Switch them off. Count to five. Switch them on.'), Q('Go on. I’ll wait.')]); hang(); });
    at('3:18', () => flicker(14, true));
    at('3:33', () => startKnock(KN[4]));
    call('3:50', 3, async () => { await talk(HAL, [Q('Something is at the back door.'), Q('Look at CAM 2 for me. Tell me what you see.')]); hang(); G.cam4Trap = true; G.camLabels = [1, 2, 3, 4]; cap('The monitors are on the wall behind the counter.', 5, 'hint'); });
    call('4:08', 3, async () => {
      if (!G.sawTape) { G.cam4Trap = false; await say(HAL, Q('You didn’t look. …Good. That’s good. Forget I asked.')); }
      else { const c = await choose(HAL, Q('Well? What did you see?'), [Q('Nothing.'), Q('Myself.')]); await say(HAL, c ? Q('That isn’t possible. There is no CAM 4. …We’ll talk about this. In person.') : Q('Good. Keep it that way.')); }
      hang();
    });
    at('4:20', () => enter({ look: 'dale', real: false, items: [IT.coffee, IT.jerky], browse: 5 }));
    C('4:35', { look: 'blank1', items: [IT.water] });
    at('4:50', startBehind);
    at('5:00', startThirteen);
    at('5:06', () => { shuffleCams(); cam4(25); });
    call('5:12', 4);
    C('5:25', { look: 'coat', label: 'Man in a yellow coat', special: true, browse: 1.2, onArrive: coat4 });
    at('5:40', () => flicker(4, true));
    at('5:46', () => { G.wave = { who: 'me', t: 11 }; });
  } },
  5: { title: 'The Previous Employee', setup() {
    at('3:02', () => { sfx.creak(panTo(6, 3.45)); cap('Over by the right-hand wall, the staff room door has come open.', 6); });
    C('3:10', { look: 'nurse', items: [IT.water], greet: 'Long night. You too, I suppose.', bye: 'Drive safe. Well. You know what I mean.' });
    call('3:20', 3, async () => { await say('PHONE', 'Static. Then your own voice, reading aloud, flat and careful:', true); await say('YOUR OWN VOICE (PHONE)', Q('Rule six. At 3:33 AM, you may hear someone knocking from inside the staff toilet. Nobody is supposed to be inside.'), true); await say('YOUR OWN VOICE (PHONE)', Q('Nobody is supposed to be inside.'), true); hang(); });
    at('3:33', () => startKnock(KN[5]));
    at('3:46', startBehind);
    C('4:00', { look: 'coat', label: 'Man in a yellow coat', special: true, browse: 1.2, onArrive: coat5 });
    at('4:14', () => enter({ look: 'nurse', real: false, items: [IT.water], browse: 4 }));
    at('4:20', () => { shuffleCams(); cam4(20); });
    call('4:30', 4);
    C('4:40', { look: 'old', items: [IT.ticket], greet: 'Same numbers. You sold me this ticket yesterday. And in ninety-eight.', bye: 'You look just like the last one. You look exactly like the last one.' });
    at('4:55', startThirteen);
    at('5:10', () => flicker(6, true));
    at('5:20', () => { sfx.bell(); cap('The bell rings. The door has not moved. Nobody has come in.', 5); });
    at('5:24', () => enter({ look: 'old', real: false, stay: 0, browse: 6, items: [IT.news] }));
    at('5:36', () => { G.wave = { who: 'me', t: 11 }; });
    C('5:44', { look: 'driver', items: [IT.coffee], greet: 'Two sugars. Cheers.', bye: 'Your mate in the back room says hello. Spitting image of you, he is.', wave: true });
  } },
  6: { title: 'Mr. Hallow', setup() {
    C('3:08', { look: 'teen', items: [IT.energy], greet: 'Hey. Is your manager around? Some guy in a suit’s been stood by the road since midnight.', bye: 'He hasn’t moved once.' });
    call('3:20', 4);
    at('3:33', () => startKnock(KN[6]));
    at('3:45', startThirteen);
    at('3:52', () => { shuffleCams(); cam4(30); });
    at('4:00', () => enter({ look: 'hallow', quiet: true, special: true, label: 'Mr. Hallow', browse: 2.5, onArrive: hallowTalk }));
    at('4:22', () => enter({ look: 'teen', real: false, items: [IT.energy], browse: 4 }));
    at('4:36', startBehind);
    call('4:50', 3, async () => { await talk('YOUR OWN VOICE (PHONE)', [Q('Did he ask who gave you the rules?'), Q('He always asks. He never knows.'), Q('Read the record he left. Count the names. Then put your ear to the door that shouldn’t be there.')], true); hang(); });
    at('5:04', () => G.outside.push({ look: 'coat', at: 'pump' }));
    C('5:15', { look: 'old', items: [IT.ticket, IT.news], greet: 'Last one. Last ticket I’ll ever buy off you.', bye: 'One more night. Then it’s somebody else’s turn.' });
    at('5:30', () => flicker(7, true));
    at('5:42', () => { G.wave = { who: 'me', t: 11 }; });
  } },
  7: { title: '5:59 AM', setup() {
    G.speed = 3; G.camLabels = [1, 2, 3, 4];
    at('3:00', () => cap('No cars on the highway. No wind. The bell above the door is perfectly still.', 7));
    at('3:20', () => cap('The fridges are empty. Twelve gaps on the shelves.', 6));
    at('3:33', () => { G.toiletOpen = true; sfx.creak(panTo(-6, 3.45)); cap('3:33. No knocking. The staff toilet door is standing open.', 6); });
    at('4:00', () => { sfx.ring(); G.phone.shake = 1; cap('The phone rings once. Then never again.', 5); });
    at('4:30', () => { G.camLabels = [4, 4, 4, 4]; cap('Something has changed on the wall of monitors.', 5); });
    at('5:00', () => cap('You have been here before. No. Do not.', 5, 'far'));
    at('5:30', () => { G.clockStop = true; G.stopT = G.t; G.speed = 1; amb({ wind: 0 }, 1); cap('Every clock in the building has stopped.', 7); });
    at('5:45', () => { G.power = false; G.finaleDark = true; G.finale = true; G.doorGlow = true; G.clipboard = true; sfx.power(); ambOff(); amb({ drone: 0.08 }, 2); cap('The lights turn off.', 6); });
    at('5:55', () => startCall(3, finaleCall));
    at('5:57', () => { if (!G.ticking) { G.ticking = true; G.speed = 0.25; } });
  } }
};
