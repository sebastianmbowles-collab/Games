// The four endings.
import { C, THREE, wait, tween, ease, shake, rand } from './core.js';
import { S, meta, endingFound, lost, mem, MEMS } from './state.js';
import { dealer } from './dealer.js';
import { W } from './world.js';
import { A } from './audio.js';
import { say, screen, cardText, meters, status, keys } from './ui.js';
import { ENDINGS } from './text.js';
import { embers } from './fx.js';
import { cardTex, glowSprite } from './tex.js';

function camTo(pos, look) {
  C.view.mode = 'cut';
  C.camera.position.copy(pos);
  C.camera.lookAt(look);
}
async function camMove(p0, p1, l0, l1, sec, e = ease.io) {
  C.view.mode = 'cut';
  const p = new THREE.Vector3(), l = new THREE.Vector3();
  await tween(sec, k => { p.lerpVectors(p0, p1, k); l.lerpVectors(l0, l1, k); C.camera.position.copy(p); C.camera.lookAt(l); }, e);
}
async function endCard(id, lines) {
  endingFound(id);
  const mins = Math.round((Date.now() - (S.startedAt || Date.now())) / 60000);
  const n = Object.keys(meta.endings).length;
  await new Promise(res => {
    const s = screen(`<div class="actcard"><div class="n">ENDING</div><div class="t">${ENDINGS[id].title.toUpperCase()}</div>
      <div class="sub" style="max-width:640px;margin:18px auto 0">${lines}</div>
      <div class="note">${S.diff ? `${S.diff[0].toUpperCase() + S.diff.slice(1)}` : ''} &middot; about ${mins} minute${mins === 1 ? '' : 's'} in the cellar &middot; caught cheating ${S.catches || 0} time${S.catches === 1 ? '' : 's'} &middot; blacked out ${S.blackouts || 0} time${S.blackouts === 1 ? '' : 's'}<br>You have found ${n} of 4 endings.</div>
      <div class="row"><button class="btn">Return to the cellar door</button></div></div>`);
    s.querySelector('button').onclick = res;
  });
}

export async function runEnding(id) {
  meters(false); status(''); keys('');
  C.input = false;
  if (id === 'shattered') return shattered();
  if (id === 'hollow') return hollow();
  if (id === 'consumed') return consumed();
  return sacrificial();
}

// ---------------------------------------------------------------- good ending
async function shattered() {
  W.candle.out = true;
  W.hemi.intensity = 0; W.rim.intensity = 0; W.back.intensity = 0;
  dealer.lookAtPlayer();
  dealer.u.uFreeze.value = 0;
  await say('you', 'You raise the shard toward the only light left in the room: his grin.');
  await say('you', 'His own light pours into the glass and back into his eyes. He sees what you saw. Silas. Edward. All of them, in chairs, chained at the foot.');
  dealer.tell('tremor', 6);
  await say('dealer', 'No. No, that is not me. That was never... I am the HOUSE. I am the...');
  A.duck(0);
  A.sfx('implode');
  dealer.tell('flare', 2);
  await tween(2.2, k => { dealer.u.uImplode.value = k; dealer.setEyes(1 - k * 0.5); dealer.grin.scale.setScalar(1 - k); for (const e of dealer.eyes) e.scale.setScalar(1 - k); }, ease.in);
  dealer.hide(true);
  C.fx.flash = 1;
  shake(0.15, 1.5);
  A.sfx('slam');
  A.sfx('rumble', 4, 0.9);
  for (let i = 0; i < 6; i++) { A.sfx('debris'); await wait(0.25); }
  await tween(1.5, k => { C.fx.flash = Math.max(C.fx.flash, k); });
  // morning
  W.room.visible = false;
  W.dust.visible = false; W.fall.visible = false; W.chain.visible = false;
  const f = W.groups.forest;
  f.visible = true;
  const card = f.userData.card;
  card.material.map = cardTex(14, 3, false); card.material.needsUpdate = true;
  C.scene.fog.color.set(0xc89070); C.scene.fog.density = 0.018;
  C.scene.background.set(0xe0a070);
  C.fx.tintAmt = 0.05; C.fx.tint.set(0xffe8d0); C.fx.vig = 0.6; C.fx.insane = 0;
  S.sanity = 100;
  camTo(new THREE.Vector3(0.2, 0.25, 0.4), new THREE.Vector3(-3, 1, -20));
  A.music('shattered', { restart: true });
  await tween(3, k => { C.fx.flash = 1 - k; });
  A.sfx('birds');
  await camMove(new THREE.Vector3(0.2, 0.25, 0.4), new THREE.Vector3(0, 1.6, 0.4), new THREE.Vector3(-3, 1, -20), new THREE.Vector3(-8, 2, -40), 6);
  await say('you', 'You wake up in wet grass, outside a ruined house in a forest, as the sun comes up.');
  A.sfx('birds');
  if (!lost('name')) await say('you', `${S.name}. Your name is ${S.name}. You say it out loud, just to hear it.`);
  else await say('you', 'You can\'t remember your name. You gave it to a candle. But you are here, and the air is cold and real.');
  const kept = MEMS.filter(k => k !== 'name' && S.memories[k] && !lost(k));
  if (kept.length) await say('you', `You think of ${kept.map(k => (k === 'pet' ? `${mem('pet')}` : k === 'friend' ? mem('friend') : mem('home'))).join(', and ')}. You start walking.`);
  else if (S.memories.pet) await say('you', 'Someone is waiting for you somewhere. You can\'t remember who. You start walking anyway.');
  await camMove(new THREE.Vector3(0, 1.6, 0.4), new THREE.Vector3(0.1, 1.1, -0.6), new THREE.Vector3(-8, 2, -40), new THREE.Vector3(0.3, 0, -1.2), 4);
  await say('you', 'In the grass by your foot lies a single playing card. The Ace of Eyes.');
  await say('you', 'Even now, years later, an ordinary deck of cards makes your hands go cold.');
  A.sfx('tick');
  await endCard('shattered', 'You stopped playing by his rules, and the house fell down.');
}

// ---------------------------------------------------------------- cycle ending
async function hollow() {
  dealer.lookAtPlayer();
  A.duck(0);
  dealer.tell('flare', 3);
  A.hum('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', { pitch: 1.6 });
  A.sfx('stinger');
  shake(0.08, 2);
  await say('dealer', 'NO. NO. You played it PERFECTLY. Do you know what that MEANS?', { auto: 2.5 });
  A.sfx('rumble', 4, 0.6);
  await tween(3.5, k => { dealer.u.uAsh.value = k; dealer.setEyes(1 - k); dealer.grin.material.opacity = 1 - k; }, ease.in);
  dealer.hide(true);
  await say('you', 'He crumbles into grey ash that drifts across the table. You won. Every rule, kept.');
  A.music('hollow', { restart: true });
  await say('you', 'You wait for the shackle on your ankle to open.');
  A.sfx('shackle');
  await wait(1.5);
  await say('you', 'It doesn\'t.');
  // your hands go to smoke
  C.fx.tint.set(0xd8dcff); C.fx.tintAmt = 0.4;
  const smoke = [];
  const sm = new THREE.SpriteMaterial({ map: glowSprite('#ffffff', 0.4), color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false, depthTest: false });
  for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(sm); s.scale.setScalar(rand(0.05, 0.15)); s.position.set(rand(-0.3, 0.3), rand(-0.4, -0.2), rand(-0.5, -0.3)); C.camera.add(s); smoke.push(s); }
  const eyeM = new THREE.SpriteMaterial({ map: glowSprite('#ffffff', 0.3), color: new THREE.Color(3, 3, 3.3), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const eyes = [[-0.32, 0.18], [0.3, 0.2], [-0.26, -0.12], [0.34, -0.1]].map(([x, y]) => { const e = new THREE.Sprite(eyeM); e.scale.set(0.12, 0.05, 1); e.position.set(x, y, -0.4); C.camera.add(e); return e; });
  await tween(4, k => { for (const s of smoke) s.position.y += 0.002; eyeM.opacity = k * 0.6; C.fx.insane = k * 0.6; }, ease.in);
  await say('you', 'Smoke curls up from your fingers. Your sight goes white at the edges, four bright points of it.');
  A.motif('cello', 0.8);
  C.fx.black = 1;
  for (const s of [...smoke, ...eyes]) C.camera.remove(s);
  C.fx.tintAmt = 0.1; C.fx.insane = 0;
  await wait(2);
  // later: from the other side of the table
  for (let i = 0; i < 5; i++) { A.sfx('step', 0.5); await wait(0.55); }
  A.sfx('drag');
  await wait(1);
  // a new contestant in your old chair
  const guest = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x40382e, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc8a888, roughness: 0.7 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 6, 12), cloth); b.position.set(0, 0.85, 0.08); b.rotation.x = 0.25;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), skin); h.position.set(0, 1.3, -0.04); h.rotation.x = 0.4;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a1a10 })); hair.position.copy(h.position).y += 0.01;
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), cloth); a.position.set(s * 0.2, 0.86, -0.12); a.rotation.x = 1.2; guest.add(a); }
  guest.add(b, h, hair);
  guest.position.set(0, 0, 1.0);
  guest.traverse(o => { if (o.isMesh) o.castShadow = true; });
  C.scene.add(guest);
  W.candle.out = false;
  camTo(new THREE.Vector3(0, 2.15, -1.25), new THREE.Vector3(0, 1.1, 0.9));
  A.sfx('shackle');
  await tween(3, k => { C.fx.black = 1 - k; });
  await say('you', 'Someone new sits slumped in the chair across from you, a shackle on their ankle, blinking at the candle.');
  await say('dealer', `Ahh. Awake. Welcome to my table.`);
  await say('dealer', 'The last one did not finish.');
  A.sfx('chairScrape');
  await wait(1.5);
  C.fx.black = 1;
  await wait(1.5);
  await endCard('hollow', `You won every game exactly the way he wanted. The chair kept you, just as it kept Silas and Edward. Somewhere in the smoke, ${lost('name') ? 'someone' : S.name} is still sitting at the table.`);
  C.scene.remove(guest);
}

// ---------------------------------------------------------------- bad ending
async function consumed() {
  A.duck(0);
  A.music('consumed', { restart: true });
  W.candle.k = 0.25;
  C.fx.insane = 1;
  await say('you', 'The candle shrinks to a blue bead. You can\'t remember why you were fighting. You can\'t remember the rules. Or your name.');
  dealer.tell('flare', 6);
  dealer.lookAtPlayer();
  await say('dealer', 'There you are. Hold still.');
  // the marble
  const marble = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.2, 3.4), toneMapped: false }));
  const glow = new THREE.PointLight(0xdde4ff, 0.8, 1.5, 2);
  marble.add(glow);
  const start = C.camera.position.clone().add(new THREE.Vector3(0, -0.1, -0.25));
  marble.position.copy(start);
  C.scene.add(marble);
  A.sfx('whoosh');
  C.fx.black = 0.3;
  const mid = new THREE.Vector3(0.1, 1.2, -0.3);
  await tween(2.2, k => { marble.position.lerpVectors(start, mid, k); C.fx.black = 0.3 + k * 0.2; }, ease.io);
  await say('you', 'Something small and bright leaves you. It floats across the table into a long hand of smoke. It looks like a marble. It looks like you.');
  // the pouch, full of others
  const pouch = new THREE.Group();
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14, 0, Math.PI * 2, 0.6, Math.PI - 0.6), new THREE.MeshStandardMaterial({ color: 0x3a0a18, roughness: 1, side: THREE.DoubleSide }));
  pouch.add(bag);
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2.2).multiplyScalar(rand(0.4, 1.2)), toneMapped: false }));
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.075;
    m.position.set(Math.cos(a) * r, 0.04 + Math.random() * 0.03, Math.sin(a) * r);
    pouch.add(m);
  }
  pouch.position.set(0.15, 0.95, -0.45);
  C.scene.add(pouch);
  await say('dealer', 'Into the pouch with the others. Edward. Margie. That noisy boy. Dozens and dozens.');
  A.stopMusic();
  A.duck(0);
  await tween(1.4, k => { marble.position.lerpVectors(mid, pouch.position.clone().add(new THREE.Vector3(0, 0.05, 0)), k); }, ease.in);
  A.sfx('chime');
  marble.visible = false;
  await wait(1.2);
  C.fx.black = 1;
  await wait(2);
  C.scene.remove(marble, pouch);
  await cardText('You are a small white light in a velvet dark, among dozens of others.\n\nSome of them are humming.\n\nNow you know why.', 7);
  await endCard('consumed', 'The cellar kept your mind and let the rest of you go dark. He has one more marble for the collection.');
}

// ---------------------------------------------------------------- bitter ending
async function sacrificial() {
  A.sfx('ignite');
  await say('you', 'You strike one of Margie\'s matches. Its tiny flame looks very brave.');
  A.music('sacrificial', { restart: true });
  // fire
  const lights = [];
  for (let i = 0; i < 5; i++) { const l = new THREE.PointLight(0xff6a20, 0, 0, 2); l.position.set(rand(-0.6, 0.6), 0.95, rand(-0.4, 0.4)); C.scene.add(l); lights.push(l); }
  const flames = [];
  const fm = new THREE.SpriteMaterial({ map: glowSprite('#ffffff', 0.35), color: new THREE.Color(2.4, 1.1, 0.3), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(fm); s.scale.set(rand(0.1, 0.3), rand(0.2, 0.6), 1); s.position.set(rand(-0.8, 0.8), 0.9, rand(-0.5, 0.5)); s.userData.y = s.position.y; C.scene.add(s); flames.push(s); }
  A.sfx('fire', 14);
  A.sfx('whoosh');
  const flick = () => { for (const l of lights) l.intensity = 25 + Math.random() * 15; for (const s of flames) { s.position.y = s.userData.y + Math.random() * 0.1; s.scale.y = rand(0.3, 0.7); } if (Math.random() < 0.4) embers(new THREE.Vector3(rand(-0.6, 0.6), 0.9, rand(-0.4, 0.4)), 3, 0.2); };
  C.updaters.add(flick);
  await tween(1.5, k => { for (const l of lights) l.intensity = 30 * k; }, ease.in);
  A.sfx('darkshot');
  C.fx.flash = 0.9;
  shake(0.1, 2);
  await say('you', 'The gas catches. The oak table goes up with every page on it: Edward\'s diary, Margie\'s letter, Tomás\'s notebook.');
  dealer.tell('flare', 4);
  dealer.u.uChaos.value = 1.2;
  A.hum('AAAAAAAAAAAAAAAAAAAAAAAAAAAA', { pitch: 1.4 });
  await say('dealer', 'NOT THE HOUSE. NOT MY HOUSE.', { auto: 1.6 });
  await tween(2.5, k => { dealer.u.uAsh.value = k * 0.7; dealer.setEyes(1 - k); }, ease.in);
  dealer.hide(true);
  // the iron door gives way
  A.sfx('slam');
  const door = W.props.door;
  await tween(0.8, k => { door.rotation.x = -k * 1.5; door.position.z = -4.15 + k * 0.6; }, ease.in);
  A.sfx('debris');
  // memories burn with it
  for (const k of MEMS) if (S.memories[k]) S.memories[k].lost = true;
  if (!S.memories.name) S.memories.name = { a: S.name, lost: true };
  await say('you', 'You run. Up the stairs, through the smoke, while behind you the cellar roars.');
  const p0 = new THREE.Vector3(0, 1.6, 1.0), p1 = new THREE.Vector3(2.7, 1.6, -3.6);
  C.view.mode = 'cut';
  await camMove(p0, p1, new THREE.Vector3(0, 1.2, -1), new THREE.Vector3(2.7, 2.5, -6), 3.2, ease.in);
  C.fx.black = 1;
  C.updaters.delete(flick);
  for (const l of lights) C.scene.remove(l);
  for (const s of flames) C.scene.remove(s);
  await wait(1.5);
  // night outside
  W.room.visible = false; W.dust.visible = false; W.fall.visible = false; W.chain.visible = false;
  W.groups.night.visible = true;
  C.scene.background.set(0x05070c); C.scene.fog.color.set(0x05070c); C.scene.fog.density = 0.02;
  C.fx.tintAmt = 0.1; C.fx.tint.set(0xc0c8ff); C.fx.insane = 0;
  camTo(new THREE.Vector3(0, 1.6, 3), new THREE.Vector3(0, 1.5, -20));
  const fire = W.groups.night.userData.fire;
  const ff = () => { fire.intensity = 25 + Math.random() * 15; };
  C.updaters.add(ff);
  await tween(3, k => { C.fx.black = 1 - k; });
  await camMove(new THREE.Vector3(0, 1.6, 3), new THREE.Vector3(0, 1.6, -4), new THREE.Vector3(0, 1.5, -20), new THREE.Vector3(2, 2, -30), 7);
  await say('you', 'Outside, the night is cold and clean. Behind you, the old house burns down to its stones. Nothing follows you out.');
  await say('you', 'You should go home.');
  await say('you', 'You don\'t know where that is.');
  await say('you', 'At the edge of the trees a car slows down. The driver leans out and asks your name.');
  await say('you', 'You open your mouth. Nothing comes.');
  C.updaters.delete(ff);
  await tween(3, k => { C.fx.black = k; });
  await cardText('NAME: ____________\n\nHOME: ____________', 5);
  await endCard('sacrificial', 'You burned the cellar and everything in it, including every part of yourself he was holding. You are free. You just don\'t know who is.');
}
