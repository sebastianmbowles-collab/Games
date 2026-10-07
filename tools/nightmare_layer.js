const outside = () => curArea !== 'home' || P.z > 6; // outside your bedroom
const EMOTION = () => (AREAS[curArea] && AREAS[curArea].emotion) || '';
// =====================================================================
// ============ NIGHTMARELAND: the dream self's story ============
// =====================================================================
// Everything above builds the old Dreamland. This part turns it into the nightmare:
// dark colours, thick fog, ruins and rubble, scrap robots, a flashlight, fear and hallucinations.
const NM = { fear: 0, flash: true, battery: 100, figures: [], whisperT: 4, boltT: 8, bolt: 0, sparkT: 0, wordT: 6 };
{
  // --- the dark ---
  scene.fog.color.setHex(0x120818); scene.fog.near = 6; scene.fog.far = 62;
  renderer.setClearColor(0x05020a);
  sun.color.setHex(0xff8a7a); sun.intensity = .35; rim.color.setHex(0x6a4aa0); rim.intensity = .25;
  const dark = new THREE.Color(0x1a0d22), grey = new THREE.Color(0x5a5060);
  const keep = new Set();
  // the things that should keep their colours: gems, keys, gloves, pillow gun, the boss (it gets its own look)
  pickups.forEach(p => p.m.traverse(o => keep.add(o))); gloves.traverse(o => keep.add(o)); pillowPickup.traverse(o => keep.add(o));
  boss.g.traverse(o => keep.add(o)); robots.forEach(r => r.g.traverse(o => keep.add(o))); camera.traverse(o => keep.add(o)); sebastian.traverse(o => keep.add(o)); // Sebastian is still Sebastian
  const done = new Set();
  scene.traverse(o => {
    if (!o.isMesh || keep.has(o) || o.userData.isInk) return;
    const m = o.material; if (!m || done.has(m)) return; done.add(m);
    if (m.vertexColors && o.geometry.attributes.color) {
      // the sky (a giant ball) and the ground: recolour every point
      const c = o.geometry.attributes.color, col = new THREE.Color(), isSky = o.geometry.parameters && o.geometry.parameters.radius === 300;
      for (let i = 0; i < c.count; i++) {
        if (isSky) { const t = o.geometry.attributes.position.getY(i) / 300; col.setHex(t > .15 ? 0x07030f : 0x07030f).lerp(new THREE.Color(0x5a1420), t > .15 ? 0 : 1 - Math.min(1, (t + .05) / .2)); }
        else { col.setRGB(c.getX(i), c.getY(i), c.getZ(i)); col.lerp(grey, .55).multiplyScalar(.42); }
        c.setXYZ(i, col.r, col.g, col.b);
      }
      c.needsUpdate = true; return;
    }
    if (m.color) {
      if (m.isMeshBasicMaterial && m.blending === THREE.AdditiveBlending) m.color.lerp(new THREE.Color(0xff3020), .6).multiplyScalar(.6);
      else if (m.isMeshBasicMaterial) m.color.lerp(dark, .55);
      else { m.color.lerp(grey, .5).multiplyScalar(.6); if (m.emissive) m.emissive.multiplyScalar(.3); }
    }
  });
  // red moon, few stars, dark red aurora, grey storm clouds
  moon.traverse(o => { if (o.material && o.material.color) o.material.color.setHex(o.isSprite ? 0xff2a1a : 0xc84030); });
  bigStars.material.opacity = .25; bigStars.material.transparent = true;
  auroras.forEach(a => a.m.material.color.setHex(0x5a0a14));
  clouds.forEach(c => c.g.traverse(o => { if (o.material && o.material.color && !o.userData.isInk) o.material.color.setHex(0x2a2030); }));
  dust.pts.material.color.setHex(0x8a8090); dust.pts.material.blending = THREE.NormalBlending; // grey ash
  // butterflies become little grey moths, jellyfish become dim red ghosts
  butterflies.forEach(b => b.g.traverse(o => { if (o.material && o.material.color) o.material.color.setHex(o.isSprite ? 0x302838 : 0x6a6070); }));
  jellies.forEach(j => j.g.traverse(o => { if (o.material && o.material.color) o.material.color.setHex(0x8a1a2a); }));
  // most fairy lights are broken; the few left flicker
  fairy.forEach((f, i) => { f.h.visible = i % 4 === 0; f.broken = i % 4 !== 0; });
  projector.pts.material.color = new THREE.Color(0xff3030); projector.pts.material.vertexColors = false; projector.pts.material.opacity = .25;
  // the flowers wilt and the grass dies
  scene.traverse(o => { if (o.isInstancedMesh && o.instanceColor) { for (let i = 0; i < o.count; i++) { const c = new THREE.Color(); o.getColorAt(i, c); c.lerp(grey, .7).multiplyScalar(.45); o.setColorAt(i, c); } o.instanceColor.needsUpdate = true; } });
  // --- ruins ---
  // the bedroom: a big hole in the ceiling, rubble and planks on the floor, toys fallen down
  scene.traverse(o => { if (o.isMesh && o.userData.noShadow && o.geometry.parameters && o.geometry.parameters.width === 10.6 && o.position.y > 3.9) o.visible = false; });
  const rubbleM = mat(0x3a3040), plankM = mat(0x4a3438);
  [[-4.1, 4.15, 1.2, 2.6, .3, 6, .25, .1], [3.4, 4.1, -1.5, 3.4, .3, 4.2, -.2, -.15], [-1.5, 4.2, -3.9, 6, .3, 2.4, .12, 0]].forEach(([x, y, z, w, h, d, rx, rz]) => {
    const c = mesh(boxG(w, h, d), mat(0x2a1c38)); c.position.set(x, y, z); c.rotation.set(rx, 0, rz); scene.add(c); }); // what's left of the ceiling
  for (let i = 0; i < 26; i++) {
    const rb = mesh(new THREE.DodecahedronGeometry(rand(.08, .3), 0), rubbleM); rb.position.set(rand(-4.6, 4.6), .08, rand(-4.6, 4.6)); rb.rotation.set(rand(0, 3), rand(0, 3), 0); scene.add(rb);
  }
  for (let i = 0; i < 5; i++) { const pl = mesh(boxG(rand(1.4, 2.4), .08, .22), plankM); pl.position.set(rand(-3.5, 3.5), .1 + i * .02, rand(-3.5, 3.5)); pl.rotation.set(rand(-.15, .15), rand(0, 3), rand(-.1, .1)); scene.add(pl); }
  toys.forEach((t, i) => { if (i === 3) return; t.still = true; t.m.position.set(t.m.position.x * .9, .25, t.m.position.z); t.m.rotation.set(rand(0, 2), rand(0, 3), Math.PI / 2); });
  // broken pillars and fallen arches all over the old meadow and desert
  const ruinM = mat(0x4a4058), ruinM2 = mat(0x3a3048);
  [[-9, 6], [13, 4], [-15, 13], [18, 11], [-5, 17], [9, 18], [-20, 28], [16, 30], [-6, 38], [22, 44], [-24, 56], [10, 66], [-14, 74], [20, 80]].forEach(([x, z], i) => {
    const g = terrainH(x, z), h = rand(1.2, 3.6), col = mesh(new THREE.CylinderGeometry(.42, .5, h, 9), i % 2 ? ruinM : ruinM2);
    col.position.set(x, g + h / 2 - .1, z); col.rotation.set(rand(-.15, .15), 0, rand(-.2, .2)); scene.add(col);
    const top = mesh(boxG(1.2, .3, 1.2), ruinM2); top.position.set(x + rand(-1.5, 1.5), g + .15, z + rand(-1.5, 1.5)); top.rotation.set(rand(-.3, .3), rand(0, 3), rand(-.4, .4)); scene.add(top); // its fallen top
    solid(x - .45, g - .5, z - .45, x + .45, g + h - .2, z + .45);
    for (let k = 0; k < 4; k++) { const rb = mesh(new THREE.DodecahedronGeometry(rand(.15, .4), 0), rubbleM); rb.position.set(x + rand(-2, 2), g + .1, z + rand(-2, 2)); scene.add(rb); }
  });
  // warm lanterns: the only friendly light left. Standing near one calms you down
  NM.lanterns = [[0, 8.3], [-6, 14], [12, 12], [0, 17.5], [0, 25], [-14, 36], [12, 46], [-19, 53.5], [4, 58], [-4, 62]].map(([x, z]) => {
    const g = new THREE.Group(), y = terrainH(x, z);
    const post = mesh(new THREE.CylinderGeometry(.05, .07, 1.6, 6), mat(0x2a2030)); post.position.y = .8; g.add(post);
    const lamp = mesh(new THREE.SphereGeometry(.16, 10, 8), glow(0xffc070)); lamp.position.y = 1.7; g.add(lamp);
    const h = halo(0xffb060, 3.2, .75); h.position.y = 1.7; g.add(h);
    const l = new THREE.PointLight(0xffa050, 1.1, 7, 1.6); l.position.y = 1.8; g.add(l);
    g.position.set(x, y, z); scene.add(g); return { x, z, g, l, h, area: 'home' };
  });
  // --- scrap robots: rusty, dented, some missing an arm ---
  robots.forEach((r, i) => {
    r.body.color.setHex(pick([0x6a5048, 0x5a4a48, 0x705848])); r.body.shininess = 8;
    r.g.traverse(o => { if (o.material && !o.userData.isInk && o !== r.visor && o !== r.heartM && o.material !== r.body && o.material.color && !o.isSprite) { o.material = o.material.clone(); o.material.color.setHex(0x3a3034); } });
    if (r.limbs && i % 3 === 1) r.limbs[3].visible = false; // lost its arm
    r.g.rotation.z = rand(-.08, .08); r.maxHp += 1; r.hp = r.maxHp;
  });
  // --- the Rust Scorpion ---
  boss.shell.color.setHex(0x7a3a30);
  boss.g.traverse(o => { if (o.material && o.material.color && !o.userData.isInk && o.material !== boss.shell && !o.isSprite) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color(0x4a3030), .6); } });
  // --- your flashlight ---
  NM.torch = new THREE.SpotLight(0xffe2b8, 1.7, 30, .5, .55, 1.2); NM.torch.position.set(.25, -.15, 0);
  camera.add(NM.torch); camera.add(NM.torch.target); NM.torch.target.position.set(0, -.6, -6);
  // --- hallucination: dark copies of Sebastian with red eyes ---
  for (let i = 0; i < 3; i++) {
    const f = model('Sebastian') || makeSebastian();
    const shade = new THREE.MeshBasicMaterial({ color: 0x050208, transparent: true, opacity: 0 });
    f.traverse(o => { if (o.isMesh && !o.userData.isInk) o.material = shade; if (o.userData.isInk) o.visible = false; });
    const eyes = new THREE.Group(); [-.09, .09].forEach(x => { const e = mesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0, fog: false })); e.position.set(x, 1.5, .23); eyes.add(e); }); f.add(eyes);
    f.scale.setScalar(1.15); f.visible = false; f.userData.global = true; scene.add(f);
    NM.figures.push({ g: f, shade, eyes, t: 0, life: 0 });
  }
}
// --- EYES IN THE DARK: pairs of red eyes blink in the fog, and vanish when you come close or shine your light on them ---
NM.eyes = Array.from({ length: 7 }, () => {
  const g = new THREE.Group();
  [-.2, .2].forEach(x => { const e = halo(0xff1a1a, .75, 0); e.material.fog = false; e.position.x = x; g.add(e); });
  g.visible = false; g.userData.global = true; scene.add(g); return { g, t: 0, life: 0 };
});
// --- the teddy bear: it always seems to be facing you… but only moves when you're not looking ---
NM.teddy = toys[4];
if (NM.teddy) { NM.teddy.still = true; NM.teddy.m.rotation.set(0, 0, 0); NM.teddy.m.position.set(-4.1, .95, -1.7); NM.teddy.m.rotation.y = .9; // sitting on the corner of the bed
  NM.teddyEyes = [-.08, .08].map(x => { const e = halo(0xff2020, .22, 0); e.position.set(x, .44, .27); NM.teddy.m.add(e); return e; }); }
// --- the dark twin flickers in for a moment on the title screen ---
NM.twin = model('Sebastian');
if (NM.twin) { const sh = new THREE.MeshBasicMaterial({ color: 0x050208 }); NM.twin.traverse(o => { if (o.isMesh && !o.userData.isInk) o.material = sh; });
  [-.09, .09].forEach(x => { const e = mesh(new THREE.SphereGeometry(.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff1a1a, fog: false })); e.position.set(x, 1.5, -.23); NM.twin.add(e); });
  NM.twin.position.copy(sebastian.position); NM.twin.rotation.y = 0; NM.twin.visible = false; scene.add(NM.twin); NM.twinT = 3; }
// --- red writing scrawled on the walls ---
function scrawl(text, w, h, x, y, z, ry, size = 64) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const k = c.getContext('2d');
  k.font = `400 ${size}px "Caveat Brush","Comic Sans MS",cursive`; k.textAlign = 'center'; k.fillStyle = '#b0101c';
  k.save(); k.translate(256, 140); k.rotate(rand(-.08, .08)); k.fillText(text, 0, 0); k.restore();
  for (let i = 0; i < 9; i++) { const dx = rand(60, 450); k.fillRect(dx, rand(130, 160), rand(2, 4), rand(20, 90)); } // drips
  const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, color: 0xaa8888 }));
  m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m;
}
scrawl('WHY DID YOU LEAVE', 3.4, 1.7, 0, 2.6, -4.98, 0);
scrawl('SEBASTIAN', 2.4, 1.2, 4.98, 1.7, 1.4, -Math.PI / 2, 80);
scrawl('he is still here', 2.4, 1.2, -4.98, 1.4, -2.6, Math.PI / 2, 56);
scrawl('turn back', 2.6, 1.3, -2.8, 3.2, 20.95, Math.PI, 72);   // on the gate
scrawl("don't look", 2.2, 1.1, PILLAR.x + 1.32, PILLAR.base + 2.4, PILLAR.z, Math.PI / 2, 72);
// --- THE STALKER: when your light dies, your dark twin comes for you ---
NM.stalker = { g: null, on: false, t: 0 };
{ const st = model('Sebastian') || makeSebastian(), sh = new THREE.MeshBasicMaterial({ color: 0x020104 });
  st.traverse(o => { if (o.isMesh && !o.userData.isInk) o.material = sh; if (o.userData.isInk) o.visible = false; });
  [-.09, .09].forEach(x => { const e = halo(0xff1010, .2, 1); e.material.fog = false; e.position.set(x, 1.5, .25); st.add(e); });
  st.scale.setScalar(1.25); st.visible = false; st.userData.global = true; scene.add(st); NM.stalker.g = st; }
{ const lab = document.createElement('label'); lab.htmlFor = 'setScare'; lab.textContent = 'Scariness'; const sel = document.createElement('select'); sel.id = 'setScare';
  sel.innerHTML = '<option value="full">Full nightmare</option><option value="less">Less scary (no stalker or jump scares)</option>'; const box = $('setLook').parentNode; box.insertBefore(sel, $('setLook').nextSibling); box.insertBefore(lab, sel); }
NM.less = saved.settings.scare === 'less';
$('setScare').value = NM.less ? 'less' : 'full';
$('setScare').addEventListener('change', e => { NM.less = e.target.value === 'less'; saved.settings.scare = e.target.value; store.set(saved); });
function updateStalker(dt, lightOn, nearLight, fx, fz) {
  if (NM.less && !NM.endTwin) { NM.stalker.g.visible = NM.stalker.on = false; return; }
  const S = NM.stalker, g = S.g; if (NM.endTwin) return;
  const hunting = !lightOn && nearLight > 3.2 && outside() && !boss.active && !(aBoss && aBoss.active);
  if (!S.on) {
    if (hunting && (S.wait = (S.wait || 4) - dt) <= 0) { // it waits a few seconds in the dark first
      const a = Math.atan2(fx, fz) + Math.PI + rand(-.6, .6), x = P.x + Math.sin(a) * 16, z = P.z + Math.cos(a) * 16; // behind you
      g.position.set(x, terrainH(x, z), z); g.visible = true; S.on = true; S.t = 0;
      if (ac) hiss(ac.currentTime, 2, .1, 200, 60, 'lowpass');
    }
    if (!hunting) S.wait = 4;
    return;
  }
  S.t += dt;
  const dx = P.x - g.position.x, dz = P.z - g.position.z, d = Math.hypot(dx, dz);
  g.rotation.y = Math.atan2(dx, dz);
  const lit = NM.flash && NM.battery > 0 && ((-dx) * fx + (-dz) * fz) / d > .9;
  if (lit || nearLight < 3.2 || !outside() || state.mode !== 'play') { // the light (or a lantern) makes it go away
    g.visible = false; S.on = false; S.wait = 6; burst(g.position.x, g.position.y + 1, g.position.z, [0x150a1a, 0x000000], 10); return;
  }
  // it walks slowly… and stops dead whenever you look at it
  const seen = ((-dx) * fx + (-dz) * fz) / d > .6;
  if (!seen) { const sp = 2.6 + S.t * .08; g.position.x += dx / d * sp * dt; g.position.z += dz / d * sp * dt; g.position.y = terrainH(g.position.x, g.position.z); }
  NM.fear = Math.min(100, NM.fear + (seen ? 10 : 4) * dt);
  if (d < 1.4) { // GOT YOU
    g.visible = false; S.on = false; S.wait = 8;
    const fl = document.createElement('div'); fl.style.cssText = 'position:fixed;inset:0;z-index:20;background:#000;pointer-events:none;transition:opacity .9s';
    fl.innerHTML = '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:400 clamp(40px,9vw,90px) \'Caveat Brush\',\'Comic Sans MS\',cursive;color:#c0101c">FOUND YOU</div>';
    document.body.appendChild(fl); setTimeout(() => fl.style.opacity = 0, 500); setTimeout(() => fl.remove(), 1500);
    if (ac) { const t = ac.currentTime; hiss(t, .8, .4, 3000, 200, 'bandpass'); tone('sawtooth', 70, t, .7, .25, master); }
    state.shake = .5; P.hurtT = 0; hurt(2, g.position.x, g.position.z); NM.fear = 70;
  }
}
// --- the crowd: dark figures on the hills that you only see when lightning flashes ---
NM.crowd = new THREE.Group(); NM.crowd.userData.global = true; scene.add(NM.crowd); NM.crowd.visible = false;
{ const sh = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
  for (let i = 0; i < 40; i++) {
    const a = rand(0, Math.PI * 2), R = rand(150, 210), x = Math.cos(a) * R, z = Math.sin(a) * R + 40, f = new THREE.Group();
    const b = mesh(new THREE.CylinderGeometry(1.2, 1.6, 8, 6), sh); b.position.y = 4; f.add(b);
    const h = mesh(new THREE.SphereGeometry(1.5, 8, 6), sh); h.position.y = 9.2; f.add(h);
    f.position.set(x, rand(0, 6), z); f.lookAt(0, f.position.y, 40); NM.crowd.add(f);
  } }
// --- the giant shadow on the horizon gets closer as the night goes on, with red eyes ---
shadow.traverse(o => { if (o.material && o.material.color && o.material.color.getHex() === 0xff4fc0) o.material.color.setHex(0xff1010); });
// --- an out-of-tune music box in the bedroom ---
NM.boxT = 0; NM.boxI = 0;
const BOX = [76, 74, 71, 74, 76, 79, 76, 74, 71, 69, 71, 74, 72, 71];
// --- sounds: a low hum, your heartbeat, and footsteps that aren't yours ---
NM.beatT = 1; NM.stepsT = 18;
function nmSound(dt) {
  if (!ac) return;
  if (!NM.drone) {
    NM.drone = ac.createGain(); NM.drone.gain.value = .05; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    [55, 55.6, 82.4].forEach(f => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); });
    lp.connect(NM.drone); NM.drone.connect(master);
  }
  NM.drone.gain.value = .035 + NM.fear / 100 * .05;
  // the music box: only when you're near the bedroom, slowing down and going wrong
  const nearRoom = curArea === 'home' ? Math.max(0, 1 - Math.hypot(P.x, P.z) / 14) : 0;
  if (nearRoom > 0) { NM.boxT -= dt;
    if (NM.boxT <= 0) { NM.boxT = .42 + Math.random() * .12 + (NM.boxI % 14 === 13 ? 1.6 : 0);
      const m = BOX[NM.boxI++ % BOX.length] + (Math.random() < .2 ? rand(-.6, .6) : -.3); // a little out of tune
      const t = ac.currentTime; tone('triangle', 440 * Math.pow(2, (m - 69) / 12), t, .9, .05 * nearRoom, master, .002); tone('sine', 880 * Math.pow(2, (m - 69) / 12), t, .4, .02 * nearRoom, master, .002); } }
  // heartbeat: faster and louder the more scared you are
  if (NM.fear > 20 && state.mode === 'play') {
    NM.beatT -= dt;
    if (NM.beatT <= 0) { NM.beatT = 1.15 - NM.fear / 100 * .65; const t = ac.currentTime, v = .12 + NM.fear / 100 * .25;
      tone('sine', 60, t, .14, v, master, .005); tone('sine', 48, t + .18, .16, v * .8, master, .005); }
  }
  // footsteps behind you, then nothing there
  NM.stepsT -= dt;
  if (NM.stepsT <= 0 && state.mode === 'play' && !cine && outside()) {
    NM.stepsT = rand(16, 30); const t = ac.currentTime;
    for (let i = 0; i < 4; i++) hiss(t + i * .42, .12, .05 + i * .03, 320, 120, 'lowpass');
    NM.fear = Math.min(100, NM.fear + 8);
  }
}
// FEAR: goes up in the dark, near scrap robots and when you get hurt; goes down near lanterns.
// The more scared you are, the more the nightmare plays tricks on you.
const fearEl = document.createElement('div'); fearEl.id = 'fear';
fearEl.innerHTML = '<span>FEAR</span><div class="track"><div id="fearFill"></div></div><span>LIGHT</span><div class="track"><div id="batFill"></div></div>'; document.body.appendChild(fearEl);
const wordEl = document.createElement('div'); wordEl.id = 'nmword'; document.body.appendChild(wordEl);
addEventListener('keydown', e => { if (e.code === 'KeyL' && state.mode === 'play') { NM.flash = !NM.flash; sfx('tick'); toast(NM.flash ? 'Flashlight on' : 'Flashlight off', NM.flash ? '' : 'It gets scary in the dark…'); } });
function nightmareTick(dt, time) {
  // flashlight (with a little flicker when you're scared)
  const lowBat = NM.battery < 20 || (boss.under && Math.random() < .7); // the scorpion underground makes your light fail
  NM.torch.intensity = NM.flash && NM.battery > 0 ? ((NM.fear > 70 || lowBat) && Math.random() < (lowBat ? .2 : .08) ? .25 : 1.7 * Math.min(1, .45 + NM.battery / 60)) : 0;
  // lightning now and then
  NM.boltT -= dt; if (NM.boltT <= 0) { NM.boltT = rand(9, 20); NM.bolt = .35; if (ac) setTimeout(() => sfx('thud'), 400); }
  NM.bolt = Math.max(0, NM.bolt - dt); NM.crowd.visible = NM.bolt > 0;
  // the shadow steps closer as you go further in
  { const goal = -185 + clamp(P.z, 0, 90) * .9 + state.keys * 20; shadow.position.z += (goal - shadow.position.z) * Math.min(1, dt * .2); } hemi.intensity = .42 + (NM.bolt > .2 || (NM.bolt > 0 && NM.bolt < .1) ? 1.3 : 0);
  // broken fairy lights flicker
  fairy.forEach(f => { if (!f.broken) f.h.material.opacity = Math.random() < .1 ? .1 : .8; });
  // lanterns breathe
  NM.lanterns.forEach((L, i) => { L.l.intensity = 1 + Math.sin(time * 3 + i) * .12; });
  // scrap robots flinch away when your flashlight hits them
  { const cfx = -Math.sin(P.yaw), cfz = -Math.cos(P.yaw), on = NM.flash && NM.battery > 0;
    robots.forEach(r => { if (!r.alive || !r.active) return; const rx = r.x - P.x, rz = r.z - P.z, rd = Math.hypot(rx, rz);
      r.lit = on && rd < 13 && (rx * cfx + rz * cfz) / rd > .9; }); }
  // scrap robots throw sparks
  NM.sparkT -= dt; if (NM.sparkT <= 0) { NM.sparkT = rand(.3, .9); const r = pick(robots.filter(r => r.alive && r.active)); if (r && Math.hypot(r.x - P.x, r.z - P.z) < 25) burst(r.x + rand(-.3, .3), terrainH(r.x, r.z) + rand(1, 2), r.z, [0xffa020, 0xffe080], 3, .6); }
  nmSound(dt);
  // title screen: now and then, for a blink, it isn't Sebastian standing there
  if (document.body.classList.contains('title')) $('tlogo').style.opacity = Math.random() < .03 ? .2 : 1; // the title flickers like a dying bulb
  if (NM.twin && document.body.classList.contains('title')) {
    NM.twinT -= dt; const on = NM.twinT < 0 && NM.twinT > -.14; NM.twin.visible = on; sebastian.visible = !on;
    if (NM.twinT < -.14) NM.twinT = rand(3, 7);
  } else if (NM.twin) NM.twin.visible = false;
  if (state.mode !== 'play' || cine) return;
  // --- fear ---
  let nearLight = 99; NM.lanterns.forEach(L => { if (L.area === curArea) nearLight = Math.min(nearLight, Math.hypot(L.x - P.x, L.z - P.z)); });
  // --- flashlight battery: it runs down, and lanterns charge it back up ---
  if (nearLight < 3.2) NM.battery = Math.min(100, NM.battery + 30 * dt);
  else if (NM.flash && outside()) { const was = NM.battery; NM.battery = Math.max(0, NM.battery - 1.6 * dt);
    if (was > 20 && NM.battery <= 20) toast('Flashlight running low', 'Charge it at a warm lantern');
    if (was > 0 && NM.battery <= 0) { toast('The light went out…', 'Find a lantern!'); sfx('tick'); } }
  $('batFill').style.width = NM.battery + '%';
  const lightOn = NM.flash && NM.battery > 0;
  let nearRobot = 99; robots.forEach(r => { if (r.alive && r.active) nearRobot = Math.min(nearRobot, Math.hypot(r.x - P.x, r.z - P.z)); });
  const indoors = !outside(); // your old room still feels a little safe
  let d = (lightOn ? 1.2 : 6) + (nearRobot < 8 ? 5 : 0) + (boss.active || (aBoss && aBoss.active) ? 3 : 0) - (indoors ? 4 : 0) + (EMOTION() === 'Fear' ? 3 : 0);
  if (nearLight < 3.2) d = -14;
  NM.fear = clamp(NM.fear + d * dt, 0, 100);
  if (P.hurtT > .75) NM.fear = Math.min(100, NM.fear + 30 * dt);
  if (NM.fear >= 100) { NM.fear = 55; hurt(1, P.x + rand(-1, 1), P.z + rand(-1, 1)); toast('Too scared!', 'Find a warm light to calm down'); }
  $('fearFill').style.width = NM.fear + '%';
  fearEl.classList.toggle('high', NM.fear > 65);
  // the screen shivers and goes red at the edges when you're very scared
  const f = Math.max(0, NM.fear - 45) / 55;
  $('game').style.filter = f > 0 ? `saturate(${1 - f * .4}) contrast(${1 + f * .15})` + (Math.random() < f * .05 ? ' hue-rotate(40deg) blur(1px)' : '') : '';
  document.body.style.setProperty('--fearRed', (f * .55).toFixed(2));
  // --- hallucinations ---
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const h of NM.figures) {
    if (!h.g.visible) {
      // the more scared you are, the more often one appears: at the edge of what you can see
      if (!NM.less && NM.fear > 35 && Math.random() < dt * (NM.fear - 30) / 260) {
        const side = Math.random() < .5 ? -1 : 1, a = Math.atan2(fx, fz) + side * rand(.55, .85), dist = rand(9, 16);
        const x = P.x + Math.sin(a) * dist, z = P.z + Math.cos(a) * dist;
        h.g.position.set(x, terrainH(x, z), z); h.g.rotation.y = Math.atan2(P.x - x, P.z - z); h.g.visible = true; h.t = 0; h.leaving = false;
      }
      continue;
    }
    h.t += dt;
    const dx = h.g.position.x - P.x, dz = h.g.position.z - P.z, dd = Math.hypot(dx, dz);
    const looking = (dx * fx + dz * fz) / dd > .93; // you look straight at it…
    if (!h.leaving && (looking || dd < 5 || h.t > 7)) { h.leaving = true; h.t = 0; if (looking || dd < 5) { sfx('whoosh'); NM.fear = Math.min(100, NM.fear + 6); } } // …and it's gone
    const op = h.leaving ? Math.max(0, .92 - h.t * 3) : Math.min(.92, h.t * .8);
    h.shade.opacity = op; h.eyes.children.forEach(e => e.material.opacity = op);
    h.g.rotation.y = Math.atan2(P.x - h.g.position.x, P.z - h.g.position.z); // always facing you
    if (h.leaving && op <= 0) { h.g.visible = false; burst(h.g.position.x, h.g.position.y + 1, h.g.position.z, [0x150a1a, 0x2a1030], 6); }
  }
  updateStalker(dt, lightOn, nearLight, fx, fz);
  // eyes in the fog
  for (const E of NM.eyes) {
    if (!E.g.visible) {
      if (outside() && Math.random() < dt * (.05 + NM.fear / 600)) {
        const a = rand(0, Math.PI * 2), dist = rand(18, 30), x = P.x + Math.sin(a) * dist, z = P.z + Math.cos(a) * dist;
        E.g.position.set(x, terrainH(x, z) + rand(1, 2.4), z); E.g.visible = true; E.t = 0; E.life = rand(4, 9);
      }
      continue;
    }
    E.t += dt; E.g.lookAt(camera.position);
    const ex = E.g.position.x - P.x, ez = E.g.position.z - P.z, ed = Math.hypot(ex, ez);
    const lit = NM.flash && NM.battery > 0 && (ex * fx + ez * fz) / ed > .97;
    const blink = (E.t % 2.6) < .12 ? 0 : 1, op = Math.min(1, E.t) * blink * (E.t > E.life ? 0 : 1);
    E.g.children.forEach(c => c.material.opacity = op);
    if (ed < 11 || lit || E.t > E.life) { if (lit || ed < 11) { E.g.children.forEach(c => c.material.opacity = 0); } E.g.visible = false; }
  }
  // the teddy turns to face you whenever you look away
  if (NM.teddy && curArea === 'home' && P.z < 6) {
    const tp = NM.teddy.m.position, tx = tp.x - P.x, tz = tp.z - P.z, td = Math.hypot(tx, tz);
    const seen = (tx * fx + tz * fz) / td > .5;
    if (!seen) NM.teddy.m.rotation.y = Math.atan2(P.x - tp.x, P.z - tp.z);
    NM.teddyEyes.forEach(e => e.material.opacity = NM.fear > 40 ? .9 : 0);
  }
  // whispers in the dark
  NM.whisperT -= dt * (NM.fear / 50);
  if (NM.whisperT <= 0) { NM.whisperT = rand(5, 10); if (ac) { const t = ac.currentTime; hiss(t, 1.4, .06, 600, 2200, 'bandpass'); hiss(t + .5, 1.1, .05, 1400, 500, 'bandpass'); } }
  // words flash on the screen
  NM.wordT -= dt * (NM.fear > 60 && !NM.less ? 1 : 0);
  if (NM.wordT <= 0) { NM.wordT = rand(6, 12); wordEl.textContent = pick(['he left', 'he always leaves', 'nobody stays', 'wake up', 'stay', 'look behind you', 'alone']);
    wordEl.style.left = rand(15, 70) + '%'; wordEl.style.top = rand(20, 70) + '%'; wordEl.style.opacity = .85; setTimeout(() => wordEl.style.opacity = 0, 450); }
}

// =====================================================================
// ============ THE DREAM SELF'S STORY: five emotions, five memories ============
// =====================================================================
// You play as the dream self. Each level is a place in Dreamland, remembered through
// one of his five emotions. At the end of each one you find a MEMORY.
{
  // your hands: pale and see-through, like his
  const paleSkin = new THREE.MeshPhongMaterial({ color: 0xaab4f0, emissive: 0x2a2a6a, transparent: true, opacity: .85 }), darkSleeve = new THREE.MeshPhongMaterial({ color: 0x3a3060 });
  fists.forEach(f => f.traverse(o => { if (o.isMesh && !o.userData.isInk) o.material = o.material.color && o.material.color.getHex() === skin.color.getHex() ? paleSkin : darkSleeve; }));
  // on the title screen, the one standing in the room is the dream self (pale, a little see-through)
  { const pm = new THREE.MeshPhongMaterial({ color: 0x6a78b8, emissive: 0x0c0c28, shininess: 10, transparent: true, opacity: .82 }); sebastian.traverse(o => { if (o.isMesh && !o.userData.isInk) o.material = pm; }); }
  const L = (area, pts) => pts.forEach(([x, z]) => { const a = AREAS[area], g = new THREE.Group(), y = a.h(x, z);
    const post = mesh(new THREE.CylinderGeometry(.05, .07, 1.6, 6), mat(0x2a2030)); post.position.y = .8; g.add(post);
    const lamp = mesh(new THREE.SphereGeometry(.16, 10, 8), glow(0xffc070)); lamp.position.y = 1.7; g.add(lamp);
    const h = halo(0xffb060, 3.2, .75); h.position.y = 1.7; g.add(h); const l = new THREE.PointLight(0xffa050, 1.1, 7, 1.6); l.position.y = 1.8; g.add(l);
    g.position.set(x, y < -20 ? 0 : y, z); a.group.add(g); NM.lanterns.push({ x, z, g, l, h, area }); });
  // the five levels, in order
  const LEVELS = [
    ['ocean', 'Sadness', 'The Ocean of Tears', 'Cross the ocean and find the memory', [
      'The very first night Sebastian dreamed, you were born. He played with you until morning.',
      'Then the sun came up. He woke up… and you were alone in the dark.',
      'You cried so much that your tears became an ocean.']],
    ['mirror', 'Fear', 'The Maze of Mirrors', 'Find the memory in the maze', [
      'You were scared he would never come back.',
      'You looked into every mirror, hoping to see him. You only ever saw yourself.']],
    ['school', 'Anger', 'The Upside-Down School', 'Sneak to the gym', [
      'In the real world, Sebastian had school and friends. You weren\'t invited.',
      'You were so angry, you built a school of your own. Upside down. Nobody sat next to you.']],
    ['forest', 'Chaos', 'The Glitching Forest', 'Climb the Great Pixel Tree', [
      'You tried to make Dreamland fun again, so he would stay.',
      'But everything you touched started to glitch. Even the animals ran away from you.']],
    ['cloud', 'Pride', 'The City in the Sky', 'Reach the top of the sky', [
      'So you told yourself you didn\'t need anyone.',
      'You built a city in the clouds, all alone. "I\'m FINE," you said. "I\'m BETTER alone."']],
  ];
  LEVELS.forEach(([name, emo, title, goal, memory], i) => {
    const a = AREAS[name];
    a.emotion = emo; a.title = emo.toUpperCase() + ' · ' + title; a.sub = 'Level ' + (i + 1) + ' of 5'; a.goal = goal;
    a.next = i < 4 ? LEVELS[i + 1][0] : 'nm-end';
    a.keyText = 'A memory comes back to you…';
    const oldEnter = a.enter;
    a.enter = () => { if (oldEnter) oldEnter(); setTimeout(() => playCine(memory.map((t, k) => ({ text: t, d: 3.6, snap: k === 0, pos: [P.x + 2, P.y + 3, P.z - 4], look: [P.x, P.y + 1, P.z + 6], speed: .3 })), () => toast(emo, goal)), 1200); };
  });
  L('ocean', [[0, 4], [-6, 16], [5, 26], [-4, 36], [8, 44], [0, 54], [-8, 60], [6, 72]]);
  L('mirror', [[-24, 6], [-14, 18], [-2, 26], [8, 14], [12, 34], [-10, 44], [6, 48], [22, 58]]);
  L('school', [[0, 3], [0, 20], [0, 36], [-12, 9], [12, 9], [0, 54], [8, 62]]);
  L('forest', [[0, 4], [-4, 20], [4, 34], [-6, 48], [3, 62], [5, 75]]);
  L('cloud', [[0, 3], [0, 24.5], [8, 43], [-5.5, 59.5], [4, 72]]);
  // ---------- SADNESS: happy-memory bubbles in the Ocean of Tears ----------
  // Warm bubbles float along the sandbar. Each holds a happy memory of playing with Sebastian.
  // Touch one to remember it: it calms you down and charges your flashlight.
  {
    const a = AREAS.ocean, happy = [
      'He built you a pillow fort so tall it touched the moon.',
      'You raced paper boats across the sky together.',
      'He taught you his secret handshake. Nobody else knows it.',
      'You both laughed so hard you floated off the ground.',
      'He said: "You\'re my best dream friend. Forever."',
      'He named a star after you. It\'s still up there.',
    ];
    const pic = paint(128, 128, k => { // two little kids holding hands, drawn in crayon
      k.clearRect(0, 0, 128, 128); k.strokeStyle = '#fff2c8'; k.lineWidth = 5; k.lineCap = 'round';
      [[44, '#ffe27f'], [84, '#aab4f0']].forEach(([x, c]) => { k.strokeStyle = c; k.beginPath(); k.arc(x, 40, 11, 0, 7); k.stroke();
        k.beginPath(); k.moveTo(x, 51); k.lineTo(x, 84); k.moveTo(x, 84); k.lineTo(x - 10, 106); k.moveTo(x, 84); k.lineTo(x + 10, 106); k.stroke(); });
      k.strokeStyle = '#ff9ab8'; k.beginPath(); k.moveTo(44, 64); k.quadraticCurveTo(64, 78, 84, 64); k.stroke(); // holding hands
      k.beginPath(); k.moveTo(28, 64); k.lineTo(44, 64); k.moveTo(84, 64); k.lineTo(100, 64); k.stroke(); });
    a.happy = [11, 21, 31, 41, 49, 62].map((z, i) => {
      const x = Math.sin(z * .14) * 6, y = a.h(x, z) + 1.5, g = new THREE.Group();
      g.add(mesh(new THREE.SphereGeometry(.75, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd890, transparent: true, opacity: .28, depthWrite: false })));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pic, transparent: true, depthWrite: false })); sp.scale.setScalar(1.1); g.add(sp);
      const h = halo(0xffc060, 2.2, .45); g.add(h); const l = new THREE.PointLight(0xffb050, 1, 6, 1.6); g.add(l);
      g.position.set(x, y, z); a.group.add(g);
      return { g, x, y, z, text: happy[i], found: false, ph: i };
    });
    a.happyN = 0;
    a.nmTick = (dt, time) => {
      // the ocean of tears rises when you're very sad and scared, and sinks when you remember happy things
      if (a.water) a.water.position.y = -.25 + Math.max(0, NM.fear - 40) / 60 * .45;
      a.happy.forEach(b => { if (b.found) return;
        b.g.position.y = b.y + Math.sin(time * 1.6 + b.ph) * .2; b.g.rotation.y += dt * .6;
        if (Math.hypot(P.x - b.x, P.z - b.z) < 1.4 && Math.abs(P.y + 1 - b.g.position.y) < 2) {
          b.found = true; a.happyN++; a.group.remove(b.g); NM.fear = Math.max(0, NM.fear - 55); NM.battery = Math.min(100, NM.battery + 50);
          burst(b.x, b.y, b.z, [0xffd890, 0xffffff, 0xff9ab8], 22); sfx('kid');
          toast(`Happy memory ${a.happyN} of 6`, b.text);
          if (a.happyN === 6) setTimeout(() => { achieve('Happy Memories', 'Find every happy memory in the Ocean of Tears'); toast('The rain gets softer…', 'You remember: it wasn\'t ALWAYS sad.'); }, 3000);
        } });
    };
  }
  // renamed bosses
  // the prologue: the portal waits just outside the bedroom window
  homePortal.position.set(0, terrainH(0, 10.5), 10.5);
}
const _introCine = introCine;
// after the intro, open the way to the first memory
introCine = function () { _introCine(); setTimeout(() => openPortal(homePortal, 'ocean'), 500); };
// emotion effects, every frame
NM.rain = (() => { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) pos.set([rand(-20, 20), rand(0, 20), rand(-20, 20)], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const r = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8ab0ff, size: .08, transparent: true, opacity: .7 })); r.userData.global = true; r.visible = false; r.frustumCulled = false; scene.add(r); return r; })();
function emotionTick(dt, time) {
  const emo = EMOTION();
  if (state.mode === 'play' && !cine && AREAS[curArea] && AREAS[curArea].nmTick) AREAS[curArea].nmTick(dt, time);
  NM.rain.visible = emo === 'Sadness';
  if (NM.rain.visible) { NM.rain.material.opacity = .7 - (AREAS.ocean.happyN || 0) * .09; NM.rain.position.set(P.x, P.y - 4, P.z); const q = NM.rain.geometry.attributes.position; for (let i = 0; i < q.count; i++) { let y = q.getY(i) - dt * 14; if (y < 0) y = 20; q.setY(i, y); } q.needsUpdate = true; }
  if (state.mode !== 'play' || cine) return;
  if (emo === 'Anger') { document.body.style.setProperty('--fearRed', Math.max(+getComputedStyle(document.body).getPropertyValue('--fearRed') || 0, .25 + Math.sin(time * 4) * .08).toFixed(2)); if (Math.random() < .004) state.shake = .25; }
  if (emo === 'Chaos' && Math.random() < .015) { $('game').style.filter = 'hue-rotate(' + rand(60, 300) + 'deg) contrast(1.3)'; setTimeout(() => $('game').style.filter = '', 90); }
  if (emo === 'Pride' && Math.random() < .002) toast('', pick(['"I don\'t need him."', '"I\'m better alone."', '"I\'m FINE."']));
}
// THE ENDING: why he made the robots, and the second bed
function nmEnding() {
  enterAreaHome(); state.mode = 'play';
  const bed2 = secondBed; bed2.visible = true;
  Object.assign(P, { x: 0, z: 0, y: 0, yaw: 0 });
  playCine([
    { text: 'You came home with five memories. And you understood.', d: 4, snap: true, pos: [2, 2.4, 2], look: [-3.4, 1, -3] },
    { text: 'You weren\'t fine. You were LONELY.', d: 3.4, pos: [1, 2, 1], look: [-3.4, 1, -3], on: () => sfx('roar') },
    { text: 'So you touched the kids in Dreamland and turned them into robots… so they could never leave.', d: 4.6, pos: [0, 3, 3], look: [0, 2, 12] },
    { text: 'You put a second bed beside his. And you waited.', d: 3.8, pos: [3, 2, 0], look: [3.4, .6, 1.2] },
    { text: 'Then one night, a boy named Sebastian came back to Dreamland…', d: 4.4, pos: [0, 2.3, 3.7], look: [0, 1.3, -2], speed: .4 },
  ], () => {
    state.mode = 'end'; document.exitPointerLock?.();
    document.querySelector('#endScreen .logo').innerHTML = 'Now play<br>Dreamland';
    $('eMsg').textContent = 'You were the dream self. You found all 5 memories. Play Dreamland to see what happens when Sebastian finds you.';
    $('endScreen').hidden = false; achieve('Know Yourself', 'Finish the dream self\'s story');
  });
}
