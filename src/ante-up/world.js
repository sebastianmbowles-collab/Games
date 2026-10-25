// The cellar and everything in it, plus how it changes from act to act.
import { C, THREE, rand } from './core.js';
import { stoneTex, flagstoneTex, woodTex, iceTex, canvasTex, glowSprite, paperTex, scrawlTex, plainNoiseTex } from './tex.js';
import { dealer } from './dealer.js';
import { A } from './audio.js';
import { S } from './state.js';

export const W = {
  room: null, table: null, candle: null, props: {}, act: 1, groups: {}, mats: {},
  TABLE_Y: 0.78, anchor: new THREE.Vector3(0, 0, 1.25),
};
const TY = 0.78;

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent?.add(m);
  return m;
}

export function buildWorld() {
  const scene = C.scene;
  const room = new THREE.Group();
  scene.add(room);
  W.room = room;

  // ---- materials
  const st = stoneTex(4, { rows: 7, cols: 5 });
  st.color.repeat.set(4, 1.6); st.bump.repeat.set(4, 1.6);
  const fl = flagstoneTex(9);
  fl.color.repeat.set(4, 4); fl.bump.repeat.set(4, 4);
  const oak = woodTex(3, { tint: [112, 72, 40], planks: 3 });
  const dark = woodTex(5, { tint: [70, 44, 26], planks: 1 });
  const beam = woodTex(8, { tint: [58, 40, 26], planks: 1, w: 256, h: 256 });
  const plank = woodTex(11, { tint: [92, 62, 38], planks: 5 });
  W.mats.wall = new THREE.MeshStandardMaterial({ map: st.color, bumpMap: st.bump, bumpScale: 3, roughness: 0.92, color: 0xffffff });
  W.mats.wallBase = W.mats.wall.color.clone();
  W.mats.floor = new THREE.MeshStandardMaterial({ map: fl.color, bumpMap: fl.bump, bumpScale: 2.5, roughness: 0.7, metalness: 0.0 });
  W.mats.oak = new THREE.MeshStandardMaterial({ map: oak.color, bumpMap: oak.bump, bumpScale: 1.2, roughness: 0.6 });
  W.mats.dark = new THREE.MeshStandardMaterial({ map: dark.color, bumpMap: dark.bump, bumpScale: 1, roughness: 0.75 });
  W.mats.beam = new THREE.MeshStandardMaterial({ map: beam.color, roughness: 0.9 });
  W.mats.plank = new THREE.MeshStandardMaterial({ map: plank.color, bumpMap: plank.bump, bumpScale: 1.5, roughness: 0.85 });
  W.mats.iron = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.55, metalness: 0.85 });
  W.mats.rust = new THREE.MeshStandardMaterial({ map: plainNoiseTex(31, [110, 60, 30], 24), roughness: 0.8, metalness: 0.5 });
  W.mats.brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.9 });
  W.mats.wax = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.45, emissive: 0x2a1406, emissiveIntensity: 0.6 });
  W.mats.cloth = new THREE.MeshStandardMaterial({ color: 0x2a1218, roughness: 1 });

  // ---- shell: floor, walls, ceiling
  const RX = 4, RZ0 = -4.2, RZ1 = 3.6, RH = 3.0;
  W.bounds = { x0: -RX, x1: RX, z0: RZ0, z1: RZ1 };
  const shell = new THREE.Group();
  room.add(shell);
  W.groups.shell = shell;
  const floor = mesh(new THREE.PlaneGeometry(RX * 2, RZ1 - RZ0), W.mats.floor, 0, 0, (RZ0 + RZ1) / 2, shell);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  const wallGeo = (w, h) => {
    const g = new THREE.PlaneGeometry(w, h, 24, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, (Math.random() - 0.5) * 0.05);
    g.computeVertexNormals();
    return g;
  };
  const wN = mesh(wallGeo(RX * 2, RH), W.mats.wall, 0, RH / 2, RZ0, shell);
  const wS = mesh(wallGeo(RX * 2, RH), W.mats.wall, 0, RH / 2, RZ1, shell); wS.rotation.y = Math.PI;
  const wW = mesh(wallGeo(RZ1 - RZ0, RH), W.mats.wall, -RX, RH / 2, (RZ0 + RZ1) / 2, shell); wW.rotation.y = Math.PI / 2;
  const wE = mesh(wallGeo(RZ1 - RZ0, RH), W.mats.wall, RX, RH / 2, (RZ0 + RZ1) / 2, shell); wE.rotation.y = -Math.PI / 2;
  for (const w of [wN, wS, wW, wE]) w.castShadow = false;
  const ceil = mesh(new THREE.PlaneGeometry(RX * 2, RZ1 - RZ0), W.mats.dark, 0, RH, (RZ0 + RZ1) / 2, shell);
  ceil.rotation.x = Math.PI / 2;
  for (let i = -3; i <= 3; i++) mesh(new THREE.BoxGeometry(0.22, 0.26, RZ1 - RZ0), W.mats.beam, i * 1.2, RH - 0.13, (RZ0 + RZ1) / 2, shell);
  // stone pillars in the corners
  for (const [x, z] of [[-RX + 0.3, RZ0 + 0.3], [RX - 0.3, RZ0 + 0.3], [-RX + 0.3, RZ1 - 0.3], [RX - 0.3, RZ1 - 0.3]]) {
    mesh(new THREE.BoxGeometry(0.6, RH, 0.6), W.mats.wall, x, RH / 2, z, shell);
  }

  buildTable(room);
  buildChairs(room);
  buildCandle(room);
  buildProps(room);
  buildActDressing(room);
  buildChain(room);

  // light: the candle is almost everything; a little moonless fill so black isn't flat
  const hemi = new THREE.HemisphereLight(0x302838, 0x0a0604, 0.12);
  scene.add(hemi);
  W.hemi = hemi;
  // when you stand and explore, your eyes adjust a little to the dark
  const eyes = new THREE.PointLight(0xc8b8a0, 0, 6, 1.2);
  C.camera.add(eyes);
  eyes.position.set(0, 0.1, 0.1);
  W.eyesLight = eyes;
  const rim = new THREE.SpotLight(0x5060a0, 2.5, 9, 0.6, 0.8, 1.5);
  rim.position.set(-1.5, 2.8, -3.8);
  rim.target.position.set(0, 1.3, -1.2);
  scene.add(rim, rim.target);
  W.rim = rim;
  // a faint wash on the wall behind him, so he reads as a silhouette
  const back = new THREE.SpotLight(0x6a5a78, 60, 9, 0.8, 0.9, 1.6);
  back.position.set(0.6, 2.9, -1.0);
  back.target.position.set(0, 1.6, -4.2);
  scene.add(back, back.target);
  W.back = back;

  // dust in the candlelight
  const dn = 500, dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) { dp[i * 3] = rand(-3, 3); dp[i * 3 + 1] = rand(0.2, 2.6); dp[i * 3 + 2] = rand(-3, 3); }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  W.dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowSprite('#ffffff'), size: 0.012, color: 0xffd8a8, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(W.dust);

  C.colliders = [
    { x0: -0.9, x1: 0.9, z0: -0.62, z1: 0.62 },
    { x0: -0.35, x1: 0.35, z0: -1.55, z1: -0.95 },
  ];
}

function buildTable(room) {
  const g = new THREE.Group();
  room.add(g);
  W.table = g;
  const top = mesh(new THREE.BoxGeometry(1.76, 0.07, 1.18), W.mats.oak, 0, TY - 0.035, 0, g);
  top.receiveShadow = true;
  // carved edge
  const edge = mesh(new THREE.BoxGeometry(1.82, 0.04, 1.24), W.mats.dark, 0, TY - 0.08, 0, g);
  edge.receiveShadow = true;
  const legGeo = new THREE.CylinderGeometry(0.05, 0.04, TY - 0.1, 10);
  for (const [x, z] of [[-0.78, -0.5], [0.78, -0.5], [-0.78, 0.5], [0.78, 0.5]]) mesh(legGeo, W.mats.dark, x, (TY - 0.1) / 2, z, g);
  // wax drips and stains baked as decals
  const stains = canvasTex(512, 512, (cg, w) => {
    cg.clearRect(0, 0, w, w);
    for (let i = 0; i < 40; i++) {
      cg.fillStyle = `rgba(${20 + Math.random() * 20},${8},${4},${Math.random() * 0.22})`;
      cg.beginPath(); cg.ellipse(Math.random() * w, Math.random() * w, 6 + Math.random() * 50, 4 + Math.random() * 30, Math.random() * 3, 0, 7); cg.fill();
    }
    cg.strokeStyle = 'rgba(10,5,2,.35)';
    for (let i = 0; i < 60; i++) { cg.lineWidth = 0.5 + Math.random() * 1.5; cg.beginPath(); const x = Math.random() * w, y = Math.random() * w; cg.moveTo(x, y); cg.lineTo(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 20); cg.stroke(); }
    // tally scratches near the player's edge
    cg.strokeStyle = 'rgba(10,5,2,.6)'; cg.lineWidth = 2;
    for (let i = 0; i < 23; i++) { const x = 60 + i * 9 + Math.floor(i / 5) * 8; cg.beginPath(); cg.moveTo(x, 470); cg.lineTo(x + (i % 5 === 4 ? -36 : 2), 492); cg.stroke(); }
  });
  const dec = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.12), new THREE.MeshStandardMaterial({ map: stains, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  dec.rotation.x = -Math.PI / 2; dec.position.y = TY + 0.001; dec.receiveShadow = true;
  g.add(dec);
  for (let i = 0; i < 7; i++) {
    const d = mesh(new THREE.CylinderGeometry(0.008 + Math.random() * 0.01, 0.012 + Math.random() * 0.012, 0.004, 8), W.mats.wax, 0.5 + rand(-0.12, 0.12), TY + 0.002, rand(-0.12, 0.2), g);
    d.castShadow = false;
  }
}

function buildChairs(room) {
  // the Dealer's tall chair
  const dc = new THREE.Group();
  dc.position.set(0, 0, -1.3);
  room.add(dc);
  mesh(new THREE.BoxGeometry(0.62, 0.06, 0.56), W.mats.dark, 0, 0.48, 0, dc);
  mesh(new THREE.BoxGeometry(0.66, 0.62, 0.07), W.mats.dark, 0, 0.8, -0.27, dc);
  for (const x of [-0.3, 0.3]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), W.mats.dark, x, 0.86, -0.27, dc);
  for (const x of [-0.27, 0.27]) for (const z of [-0.24, 0.24]) mesh(new THREE.BoxGeometry(0.05, 0.48, 0.05), W.mats.dark, x, 0.24, z, dc);
  for (const x of [-0.3, 0.3]) mesh(new THREE.SphereGeometry(0.045, 10, 8), W.mats.dark, x, 1.25, -0.27, dc);
  W.props.dealerChair = dc;
  // your chair (mostly behind you)
  const pc = new THREE.Group();
  pc.position.set(0, 0, 1.05);
  room.add(pc);
  mesh(new THREE.BoxGeometry(0.5, 0.05, 0.46), W.mats.dark, 0, 0.46, 0, pc);
  mesh(new THREE.BoxGeometry(0.5, 0.6, 0.05), W.mats.dark, 0, 0.78, 0.22, pc);
  for (const x of [-0.22, 0.22]) for (const z of [-0.2, 0.2]) mesh(new THREE.BoxGeometry(0.04, 0.46, 0.04), W.mats.dark, x, 0.23, z, pc);
  W.props.playerChair = pc;
}

function buildCandle(room) {
  const g = new THREE.Group();
  g.position.set(0.56, TY, 0.06);
  room.add(g);
  const dish = mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.012, 24), W.mats.brass, 0, 0.006, 0, g);
  dish.castShadow = false;
  const ringGeo = new THREE.TorusGeometry(0.03, 0.006, 8, 16);
  const ring = mesh(ringGeo, W.mats.brass, 0.085, 0.02, 0, g); ring.rotation.y = Math.PI / 2;
  const wax = mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.13, 18), W.mats.wax, 0, 0.077, 0, g);
  wax.castShadow = false;
  const wick = mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.014, 4), new THREE.MeshBasicMaterial({ color: 0x110804 }), 0, 0.148, 0, g);
  wick.castShadow = false;
  // the flame: a teardrop that glows
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * (1 - t * 0.6) * 0.011, t * 0.05)); }
  const flameGeo = new THREE.LatheGeometry(pts, 14);
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uK: { value: 1 } },
    vertexShader: 'varying float vY; uniform float uT; void main(){ vY=position.y/0.05; vec3 p=position; p.x+=sin(uT*13.0+vY*4.0)*0.0015*vY; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
    fragmentShader: 'varying float vY; uniform float uK; void main(){ vec3 c=mix(vec3(0.3,0.5,3.0),vec3(4.0,2.2,0.7),smoothstep(0.0,0.28,vY)); c=mix(c,vec3(3.0,0.9,0.15),smoothstep(0.6,1.0,vY)); gl_FragColor=vec4(c*uK,(1.0-smoothstep(0.75,1.0,vY)*0.6)*uK); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const flameGrp = new THREE.Group();
  flameGrp.position.set(0, 0.152, 0);
  g.add(flameGrp);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.userData.noOutline = true;
  flameGrp.add(flame);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#ffb060', 0.25), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3, toneMapped: false }));
  glow.scale.set(0.12, 0.16, 1);
  glow.position.y = 0.025;
  flameGrp.add(glow);
  const light = new THREE.PointLight(0xff9c50, 2.0, 0, 1.45);
  light.position.set(0, 0.17, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.002;
  light.shadow.normalBias = 0.02;
  light.shadow.camera.near = 0.03;
  light.shadow.camera.far = 12;
  g.add(light);
  W.candle = {
    group: g, flame: flameGrp, flameMat, glow, light, wax, base: 2.0, k: 1, out: false, lean: 0, leanZ: 0, carried: false,
    lightOffset: new THREE.Vector3(0, 0.17, 0), stub: 1,
  };
}

export function candlePos(out = new THREE.Vector3()) {
  return W.candle.light.getWorldPosition(out);
}

function buildProps(room) {
  const P = W.props;
  // drain grate (Act 1): screwdriver below
  const grate = new THREE.Group();
  grate.position.set(2.2, 0.012, 1.8);
  room.add(grate);
  const hole = mesh(new THREE.BoxGeometry(0.38, 0.02, 0.38), new THREE.MeshStandardMaterial({ color: 0x020101, roughness: 1 }), 0, -0.012, 0, grate);
  hole.receiveShadow = false;
  const bars = new THREE.Group();
  grate.add(bars);
  mesh(new THREE.BoxGeometry(0.42, 0.015, 0.03), W.mats.rust, 0, 0, -0.195, bars);
  mesh(new THREE.BoxGeometry(0.42, 0.015, 0.03), W.mats.rust, 0, 0, 0.195, bars);
  for (let i = 0; i < 7; i++) mesh(new THREE.BoxGeometry(0.018, 0.015, 0.4), W.mats.rust, -0.18 + i * 0.06, 0, 0, bars);
  P.grate = grate; P.grateBars = bars;
  const sd = makeScrewdriver();
  sd.position.set(0.03, -0.01, 0.02); sd.rotation.set(0, 0.6, Math.PI / 2);
  grate.add(sd);
  P.screwdriverInGrate = sd;

  // loose floorboard behind your chair
  const fb = new THREE.Group();
  fb.position.set(0.15, 0, 1.95);
  room.add(fb);
  const frame = mesh(new THREE.BoxGeometry(1.1, 0.02, 0.62), W.mats.dark, 0, 0.008, 0, fb);
  frame.castShadow = false;
  const boards = [];
  for (let i = 0; i < 4; i++) {
    const b = mesh(new THREE.BoxGeometry(1.0, 0.025, 0.13), W.mats.plank, 0, 0.018, -0.21 + i * 0.14, fb);
    b.castShadow = false;
    boards.push(b);
  }
  boards[2].position.y = 0.024; boards[2].rotation.z = 0.02;
  P.floorboard = boards[2]; P.floorboardGrp = fb;
  for (const x of [-0.45, 0.45]) mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6), W.mats.iron, x, 0.032, 0.07, fb);
  const diary = makeBook(0x3a1c10);
  diary.position.set(0.05, 0.0, 0.07);
  diary.visible = false;
  fb.add(diary);
  P.diaryBook = diary;

  // the loose stone in the west wall (Act 1): Marguerite's letter and matches
  const ls = mesh(new THREE.BoxGeometry(0.1, 0.22, 0.38), W.mats.wall, -3.96, 1.05, 0.6, room);
  ls.material = W.mats.wall.clone();
  ls.material.color.multiplyScalar(0.85);
  P.looseStone = ls;
  const crackTex = canvasTex(256, 256, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 0); for (let y = 0; y < w; y += 16) g.lineTo(128 + (Math.random() - 0.5) * 40, y); g.stroke(); });
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.2), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false }));
  crack.position.set(-3.995, 1.2, 0.6); crack.rotation.y = Math.PI / 2;
  room.add(crack);
  const tin = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), W.mats.rust, -3.9, 1.0, 0.65, room);
  tin.rotation.z = Math.PI / 2; tin.visible = false;
  P.matchTin = tin;
  const letter = mesh(new THREE.PlaneGeometry(0.12, 0.16), new THREE.MeshStandardMaterial({ map: paperTex(5, 10), side: THREE.DoubleSide }), -3.88, 1.08, 0.5, room);
  letter.rotation.y = Math.PI / 2; letter.rotation.z = 0.2; letter.visible = false;
  P.letter = letter;

  // shelf on the east wall: old games, a jar of teeth, later the honest dice
  const shelf = new THREE.Group();
  shelf.position.set(3.82, 0, 1.0);
  room.add(shelf);
  for (const y of [0.6, 1.1, 1.6]) mesh(new THREE.BoxGeometry(0.34, 0.04, 1.4), W.mats.dark, 0, y, 0, shelf);
  for (const z of [-0.68, 0.68]) mesh(new THREE.BoxGeometry(0.34, 1.7, 0.04), W.mats.dark, 0, 0.85, z, shelf);
  const boxCols = [0x3a1a14, 0x1c2a20, 0x2a2214, 0x1a1a2a];
  for (let i = 0; i < 4; i++) {
    const b = mesh(new THREE.BoxGeometry(0.26, 0.06, 0.32), new THREE.MeshStandardMaterial({ color: boxCols[i], roughness: 0.9 }), -0.02, 0.65 + i * 0.062, -0.35 + (i % 2) * 0.05, shelf);
    b.rotation.y = rand(-0.1, 0.1);
  }
  const jar = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 16), new THREE.MeshPhysicalMaterial({ color: 0xccddcc, roughness: 0.1, transmission: 0.6, thickness: 0.02, transparent: true, opacity: 0.6 }), 0, 1.21, 0.3, shelf);
  jar.castShadow = false;
  for (let i = 0; i < 18; i++) mesh(new THREE.ConeGeometry(0.008, 0.02, 5), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.4 }), rand(-0.04, 0.04), 1.14 + rand(0, 0.06), 0.3 + rand(-0.04, 0.04), shelf);
  P.shelf = shelf; P.jar = jar;
  const cup = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 14), W.mats.iron, 0, 1.665, -0.25, shelf);
  P.cup = cup;
  C.colliders.push({ x0: 3.6, x1: 4, z0: 0.25, z1: 1.75 });

  // hooks with old chains and names scratched next to them (north wall)
  const names = scrawlTex(['S.C. 1887', 'E.H. 1931', 'M.D. 1962', 'T.R. 1994'], { w: 1024, h: 400, color: 'rgba(220,210,190,.35)', font: '44px "IM Fell English", serif' });
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ map: names, transparent: true, depthWrite: false }));
  nm.position.set(-1.6, 1.25, -4.18);
  room.add(nm);
  P.names = nm;
  for (let i = 0; i < 4; i++) {
    const x = -2.3 + i * 0.46;
    mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), W.mats.iron, x, 1.75, -4.16, room);
    for (let k = 0; k < 9; k++) {
      const l = mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 10), W.mats.iron, x, 1.7 - k * 0.042, -4.15, room);
      l.rotation.y = k % 2 ? Math.PI / 2 : 0;
      l.castShadow = false;
    }
  }

  // iron door to the stairs (north-east), shut for good
  const door = new THREE.Group();
  door.position.set(2.7, 0, -4.15);
  room.add(door);
  mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), W.mats.rust, 0, 1.05, 0, door);
  for (const y of [0.4, 1.05, 1.7]) mesh(new THREE.BoxGeometry(1.14, 0.08, 0.1), W.mats.iron, 0, y, 0.02, door);
  mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16), W.mats.iron, 0.38, 1.05, 0.07, door);
  P.door = door;

  // fuse box on the west wall (Act 2)
  const fbx = new THREE.Group();
  fbx.position.set(-3.95, 1.45, -2.0);
  room.add(fbx);
  const boxBody = mesh(new THREE.BoxGeometry(0.1, 0.42, 0.32), W.mats.iron, 0, 0, 0, fbx);
  boxBody.material = W.mats.rust;
  const lid = new THREE.Group();
  lid.position.set(0.055, 0, -0.16);
  fbx.add(lid);
  mesh(new THREE.BoxGeometry(0.015, 0.42, 0.32), W.mats.rust, 0, 0, 0.16, lid);
  for (const [y, z] of [[0.18, 0.02], [0.18, 0.3], [-0.18, 0.02], [-0.18, 0.3]]) mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6), W.mats.brass, 0.01, y, z, lid).rotation.z = Math.PI / 2;
  const key = makeKey();
  key.position.set(0.03, 0.08, -0.05); key.rotation.set(0, 0, -Math.PI / 2);
  fbx.add(key);
  const lead = mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.06, 10), new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.5, metalness: 0.8 }), 0.03, -0.12, 0.06, fbx);
  const lever = mesh(new THREE.BoxGeometry(0.03, 0.08, 0.02), W.mats.iron, 0.04, 0.0, 0.08, fbx);
  P.fuse = fbx; P.fuseLid = lid; P.keyInBox = key; P.leadInBox = lead; P.lever = lever;
  // a bare bulb near it and writing that only shows under electric light
  const bulb = mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: 0x221a10 }), -3.2, 2.6, -2.0, room);
  bulb.castShadow = false;
  const bulbLight = new THREE.PointLight(0xfff0d0, 0, 0, 2);
  bulbLight.position.set(-3.2, 2.5, -2.0);
  bulbLight.visible = false;
  room.add(bulbLight);
  P.bulb = bulb; P.bulbLight = bulbLight;
  const writing = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), new THREE.MeshBasicMaterial({ map: scrawlTex(['SILAS CRANE OWES THE HOUSE', 'THE HOUSE ALWAYS WINS']), transparent: true, opacity: 0, depthWrite: false }));
  writing.position.set(-3.98, 1.6, -0.6); writing.rotation.y = Math.PI / 2;
  room.add(writing);
  P.writing = writing;

  // padlocked chest (Act 2)
  const chest = new THREE.Group();
  chest.position.set(-3.1, 0, 2.7);
  chest.rotation.y = 0.5;
  room.add(chest);
  mesh(new THREE.BoxGeometry(0.8, 0.42, 0.48), W.mats.plank, 0, 0.21, 0, chest);
  const clid = new THREE.Group();
  clid.position.set(0, 0.42, -0.24);
  chest.add(clid);
  mesh(new THREE.BoxGeometry(0.82, 0.08, 0.5), W.mats.plank, 0, 0.04, 0.24, clid);
  for (const x of [-0.3, 0.3]) mesh(new THREE.BoxGeometry(0.05, 0.5, 0.5), W.mats.iron, x, 0.22, 0, chest);
  const lock = mesh(new THREE.BoxGeometry(0.07, 0.08, 0.03), W.mats.brass, 0, 0.36, 0.26, chest);
  const shackle = mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 12, Math.PI), W.mats.iron, 0, 0.4, 0.26, chest);
  const shard = makeShard();
  shard.position.set(0.1, 0.3, 0.05); shard.rotation.set(-Math.PI / 2, 0, 0.4);
  chest.add(shard);
  const drawing = mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ map: drawingTex(), side: THREE.DoubleSide }), -0.15, 0.3, 0, chest);
  drawing.rotation.x = -Math.PI / 2;
  P.chest = chest; P.chestLid = clid; P.lock = lock; P.lockShackle = shackle; P.shardInChest = shard; P.drawing = drawing;
  C.colliders.push({ x0: -3.55, x1: -2.65, z0: 2.3, z1: 3.1 });

  // barrels with lamp oil hidden behind (Act 2)
  const barrels = new THREE.Group();
  barrels.position.set(3.2, 0, 2.7);
  room.add(barrels);
  for (const [x, z] of [[0, 0], [-0.55, 0.15], [-0.2, -0.5]]) {
    const b = mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.75, 16), W.mats.plank, x, 0.375, z, barrels);
    for (const y of [0.12, 0.62]) mesh(new THREE.TorusGeometry(0.26, 0.012, 6, 24), W.mats.iron, x, y, z, barrels).rotation.x = Math.PI / 2;
    b.userData.barrel = true;
  }
  const oil = makeOilCan();
  oil.position.set(0.35, 0, 0.35);
  barrels.add(oil);
  P.barrels = barrels; P.oilCan = oil;
  C.colliders.push({ x0: 2.4, x1: 3.6, z0: 2.0, z1: 3.1 });

  // Tomás's notebook in a hollow where roots split the north wall (Act 2)
  const nb = makeBook(0x1c2a44, 0.12, 0.17);
  nb.position.set(1.0, 1.0, -4.12); nb.rotation.set(Math.PI / 2, 0, 0.1);
  room.add(nb);
  P.notebook = nb;
  const hollow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 18), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hollow.position.set(1.0, 1.0, -4.17);
  room.add(hollow);
  P.hollow = hollow;

  // the gas valve behind the third stone of the east wall
  const valve = new THREE.Group();
  valve.position.set(3.94, 0.9, -1.5);
  room.add(valve);
  const vstone = mesh(new THREE.BoxGeometry(0.08, 0.24, 0.42), W.mats.wall.clone(), 0, 0, 0, valve);
  vstone.material.color.multiplyScalar(0.92);
  const pipe = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 10), W.mats.rust, -0.02, 0, 0, valve);
  pipe.rotation.x = Math.PI / 2; pipe.visible = false;
  const wheel = mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 18), new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.5, metalness: 0.6 }), -0.06, 0, 0, valve);
  wheel.rotation.y = Math.PI / 2; wheel.visible = false;
  P.valve = valve; P.valveStone = vstone; P.valvePipe = pipe; P.valveWheel = wheel;

  // a puddle that reflects nothing where you stand
  const pud = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.02, metalness: 0.9 }));
  pud.rotation.x = -Math.PI / 2; pud.position.set(-1.6, 0.004, -1.9); pud.scale.set(1.3, 0.8, 1);
  room.add(pud);
  P.puddle = pud;

  // the velvet pouch hangs inside the Dealer's cloak
  const pouch = mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3a0a18, roughness: 1 }), 0.25, 0.62, -1.08, room);
  pouch.scale.y = 1.3; pouch.visible = false;
  P.pouch = pouch;
}

function drawingTex() {
  return canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = '#e0d4b0'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a2a6a'; g.lineWidth = 3; g.lineCap = 'round';
    const fig = (x, s) => { g.beginPath(); g.arc(x, 70 - s * 10, 10 + s * 2, 0, 7); g.moveTo(x, 80 - s * 8); g.lineTo(x, 130); g.moveTo(x - 14, 100); g.lineTo(x + 14, 100); g.moveTo(x, 130); g.lineTo(x - 10, 160); g.moveTo(x, 130); g.lineTo(x + 10, 160); g.stroke(); };
    fig(60, 1); fig(110, 0.6); fig(150, 0);
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(210, 130, 30, 18, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(232, 120); g.lineTo(250, 110); g.lineTo(240, 132); g.fill();
    g.fillStyle = '#c00'; g.fillRect(214, 122, 4, 4);
    g.fillStyle = '#2a2a6a'; g.font = '18px "Special Elite", monospace'; g.fillText('mama  papa  me', 40, 185);
    g.fillText('NELL 1908', 150, 22);
  });
}

export function makeScrewdriver() {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.09, 10), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.8 }), 0, 0.045, 0, g);
  mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 6), W.mats.rust, 0, 0.14, 0, g);
  return g;
}
export function makeBook(color = 0x3a1c10, w = 0.14, h = 0.2) {
  const g = new THREE.Group();
  mesh(new THREE.BoxGeometry(w, 0.025, h), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), 0, 0.0125, 0, g);
  mesh(new THREE.BoxGeometry(w * 0.95, 0.02, h * 0.95), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 1 }), 0.004, 0.0125, 0, g);
  return g;
}
export function makeKey() {
  const g = new THREE.Group();
  const m = W.mats.iron;
  mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 14), m, 0, 0, 0, g);
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6), m, 0, -0.053, 0, g);
  mesh(new THREE.BoxGeometry(0.018, 0.012, 0.005), m, 0.009, -0.08, 0, g);
  return g;
}
export function makeShard() {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(0.09, 0.02); sh.lineTo(0.03, 0.14); sh.lineTo(-0.01, 0.07); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: false });
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xcfd8e8, roughness: 0.02, metalness: 1 }));
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}
function makeOilCan() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0x5a1a10, roughness: 0.5, metalness: 0.7 });
  mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.22, 16), m, 0, 0.11, 0, g);
  mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.12, 8), m, 0.05, 0.25, 0, g).rotation.z = -0.6;
  mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), m, -0.02, 0.22, 0, g);
  return g;
}

// ---- per-act set dressing
function buildActDressing(room) {
  const G = W.groups;
  // ACT 2: black roots across the ceiling and walls
  const roots = new THREE.Group();
  room.add(roots);
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x0a0405, roughness: 0.55, emissive: 0x3a0606, emissiveIntensity: 0.4 });
  W.mats.root = rootMat;
  for (let i = 0; i < 26; i++) {
    const pts = [];
    let x = rand(-3.6, 3.6), z = rand(-3.8, 3.2);
    const onWall = i % 3 === 0;
    let y = onWall ? 2.95 : 2.97;
    for (let k = 0; k < 8; k++) {
      pts.push(new THREE.Vector3(x, y, z));
      if (onWall) {
        const wallX = x > 0 ? 3.97 : -3.97;
        x = wallX; y -= rand(0.2, 0.45); z += rand(-0.3, 0.3);
      } else { x += rand(-0.6, 0.6); z += rand(-0.6, 0.6); y = 2.97 - Math.random() * 0.05; }
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, rand(0.015, 0.045), 6, false);
    const r = new THREE.Mesh(geo, rootMat);
    r.castShadow = false;
    roots.add(r);
  }
  G.roots = roots;

  // ACT 3: an endless sea of mist under a floating island
  const voidG = new THREE.Group();
  room.add(voidG);
  const island = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 1.2, 1.2, 28, 3), W.mats.floor);
  const ip = island.geometry.attributes.position;
  for (let i = 0; i < ip.count; i++) if (ip.getY(i) < 0.55) { ip.setX(i, ip.getX(i) * rand(0.85, 1.1)); ip.setZ(i, ip.getZ(i) * rand(0.85, 1.1)); ip.setY(i, ip.getY(i) - rand(0, 0.5)); }
  island.geometry.computeVertexNormals();
  island.position.set(0, -0.6, 0.1);
  island.receiveShadow = true;
  voidG.add(island);
  const rocks = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + rand(-0.2, 0.2), r = rand(3.4, 6.5);
    const rk = mesh(new THREE.DodecahedronGeometry(rand(0.2, 0.55), 0), W.mats.wall, Math.cos(a) * r, rand(-1.4, 1.8), Math.sin(a) * r, voidG);
    rk.userData.spin = rand(-0.2, 0.2); rk.userData.y0 = rk.position.y;
    rocks.push(rk);
  }
  W.voidRocks = rocks;
  // two ledges you can reach on the island's edge
  const ledgeA = mesh(new THREE.BoxGeometry(0.7, 0.12, 0.5), W.mats.wall, -2.25, 0.25, -1.1, voidG);
  const ledgeB = mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), W.mats.wall, 2.2, 0.35, 1.5, voidG);
  W.props.ledgeA = ledgeA; W.props.ledgeB = ledgeB;
  const mistTex = canvasTex(512, 512, (g, w) => {
    const img = g.createImageData(w, w);
    for (let i = 0; i < w * w; i++) { const v = Math.random() * 30; img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v * 1.1; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    g.filter = 'blur(12px)'; g.drawImage(g.canvas, 0, 0);
  }, { repeat: [6, 6] });
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ map: mistTex, color: 0x777788, transparent: true, opacity: 0.9, depthWrite: false }));
  mist.rotation.x = -Math.PI / 2; mist.position.y = -2.4;
  voidG.add(mist);
  W.mist = mist;
  // thousands of eyes in the mist
  const en = 2600, ep = new Float32Array(en * 3), eph = new Float32Array(en);
  for (let i = 0; i < en; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.pow(Math.random(), 0.6) * 34;
    ep[i * 3] = Math.cos(a) * r; ep[i * 3 + 1] = -2.3 - Math.random() * 3 + (Math.random() < 0.15 ? rand(2, 8) : 0); ep[i * 3 + 2] = Math.sin(a) * r;
    eph[i] = Math.random() * 100;
  }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  eg.setAttribute('aPh', new THREE.BufferAttribute(eph, 1));
  const eyeMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uPix: { value: 600 } },
    vertexShader: 'attribute float aPh; uniform float uT; uniform float uPix; varying float vB; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; float bl=step(0.06,fract(uT*0.13+aPh*0.37)); vB=bl*(0.5+0.5*sin(uT*0.7+aPh)); gl_PointSize=uPix*0.05/max(0.1,-mv.z); }',
    fragmentShader: 'varying float vB; void main(){ vec2 c=gl_PointCoord-0.5; c.y*=2.4; float d=length(c); float a=smoothstep(0.5,0.1,d)*vB; if(a<0.01) discard; gl_FragColor=vec4(vec3(2.2),a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  const eyes = new THREE.Points(eg, eyeMat);
  eyes.frustumCulled = false;
  voidG.add(eyes);
  W.voidEyes = eyes;
  G.void = voidG;

  // ACT 4: black ice and icicles
  const ice = new THREE.Group();
  room.add(ice);
  const it = iceTex(9);
  it.repeat.set(3, 3);
  W.mats.ice = new THREE.MeshPhysicalMaterial({ map: it, color: 0x9ab8e0, roughness: 0.25, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true, opacity: 0.7 });
  const iceFloor = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.4), W.mats.ice);
  iceFloor.rotation.x = -Math.PI / 2; iceFloor.position.set(0, 0.006, -0.3);
  iceFloor.receiveShadow = true;
  ice.add(iceFloor);
  const icMat = new THREE.MeshPhysicalMaterial({ color: 0xbfd8ff, roughness: 0.05, transmission: 0.5, thickness: 0.05, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 70; i++) {
    const h = rand(0.08, 0.5);
    const ic = mesh(new THREE.ConeGeometry(rand(0.01, 0.035), h, 6), icMat, rand(-3.8, 3.8), 3 - h / 2 - 0.26 * (Math.random() < 0.5 ? 1 : 0), rand(-4, 3.4), ice);
    ic.rotation.x = Math.PI;
    ic.castShadow = false;
  }
  for (const [x, z] of [[-3.9, -1], [3.9, 0.5], [-1, -4.1], [1.5, 3.5]]) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), W.mats.ice);
    sheet.position.set(x, 1.3, z);
    sheet.rotation.y = Math.abs(x) > 3 ? (x > 0 ? -Math.PI / 2 : Math.PI / 2) : z > 0 ? Math.PI : 0;
    sheet.position.x += Math.abs(x) > 3 ? (x > 0 ? -0.02 : 0.02) : 0;
    sheet.position.z += Math.abs(x) > 3 ? 0 : z > 0 ? -0.02 : 0.02;
    ice.add(sheet);
  }
  // a block of ice with a page frozen inside
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.4), new THREE.MeshPhysicalMaterial({ color: 0xaaccff, roughness: 0.15, transmission: 0.7, thickness: 0.3, transparent: true, opacity: 0.8 }));
  block.position.set(-2.6, 0.23, -3.2);
  block.castShadow = true;
  ice.add(block);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.22), new THREE.MeshStandardMaterial({ map: paperTex(77, 12), side: THREE.DoubleSide }));
  page.position.set(-2.6, 0.23, -3.2); page.rotation.set(-0.3, 0.4, 0.1);
  ice.add(page);
  W.props.iceBlock = block; W.props.icePage = page;
  C.colliders.push({ x0: -2.9, x1: -2.3, z0: -3.45, z1: -2.95 });
  G.ice = ice;

  // ACT 5: cracks, falling stone, embers
  const ruin = new THREE.Group();
  room.add(ruin);
  const crackTex = canvasTex(1024, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let k = 0; k < 9; k++) {
      g.strokeStyle = 'rgba(0,0,0,.95)'; g.lineWidth = 2 + Math.random() * 5;
      let x = Math.random() * w, y = 0;
      g.beginPath(); g.moveTo(x, y);
      while (y < h) { x += (Math.random() - 0.5) * 70; y += 20 + Math.random() * 40; g.lineTo(x, y); if (Math.random() < 0.2) { g.stroke(); g.lineWidth *= 0.6; g.beginPath(); g.moveTo(x, y); } }
      g.stroke();
    }
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,90,20,.25)'; g.fillRect(0, 0, w, h);
  });
  for (const [x, z, ry] of [[0, -4.17, 0], [-3.97, 0, Math.PI / 2], [3.97, -0.5, -Math.PI / 2], [0, 3.57, Math.PI]]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false }));
    c.position.set(x, 1.5, z); c.rotation.y = ry;
    ruin.add(c);
  }
  const rubble = [];
  for (let i = 0; i < 30; i++) {
    const r = mesh(new THREE.DodecahedronGeometry(rand(0.05, 0.2), 0), W.mats.wall, rand(-3.6, 3.6), 0.05, rand(-3.8, 3.2), ruin);
    r.position.y = r.geometry.parameters.radius * 0.6;
    if (Math.hypot(r.position.x, r.position.z) < 1.6) r.position.x += 2.2 * Math.sign(r.position.x || 1);
    rubble.push(r);
  }
  // shadows racing across the floor toward the table
  const shTex = canvasTex(256, 256, (g, w) => { const grd = g.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2); grd.addColorStop(0, 'rgba(0,0,0,.95)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, w); });
  W.shadows = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.6), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.9 }));
    s.rotation.x = -Math.PI / 2; s.position.y = 0.01;
    s.userData.a = (i / 10) * Math.PI * 2; s.userData.r = rand(2.5, 4);
    ruin.add(s);
    W.shadows.push(s);
  }
  G.ruin = ruin;
  // falling bits (shared across acts 4 and 5: snow or embers)
  const fn = 400, fp = new Float32Array(fn * 3);
  for (let i = 0; i < fn; i++) { fp[i * 3] = rand(-3.8, 3.8); fp[i * 3 + 1] = rand(0, 3); fp[i * 3 + 2] = rand(-4, 3.4); }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  W.fall = new THREE.Points(fg, new THREE.PointsMaterial({ map: glowSprite('#ffffff'), size: 0.02, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  C.scene.add(W.fall);

  // forest for the good ending (hidden until then)
  W.groups.forest = buildForest();
  W.groups.night = buildNight();
}

function buildForest() {
  const g = new THREE.Group();
  g.visible = false;
  C.scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x2a3a1c, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  g.add(ground);
  const bark = new THREE.MeshStandardMaterial({ color: 0x2a1e14, roughness: 1 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x1c3a1e, roughness: 1 });
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * Math.PI * 2, r = rand(6, 60);
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 10;
    if (Math.abs(x) < 4 && z > -20 && z < 3) continue;
    const h = rand(5, 11);
    mesh(new THREE.CylinderGeometry(0.15, 0.3, h, 6), bark, x, h / 2, z, g);
    for (let k = 0; k < 3; k++) mesh(new THREE.ConeGeometry(rand(1.4, 2.4) - k * 0.4, rand(2.5, 3.5), 7), leaf, x, h * 0.55 + k * 1.4, z, g);
  }
  // the ruined house behind you
  const stone = W.mats.wall;
  const house = new THREE.Group();
  house.position.set(0, 0, 8);
  g.add(house);
  mesh(new THREE.BoxGeometry(8, 4, 0.4), stone, 0, 2, 3, house);
  mesh(new THREE.BoxGeometry(0.4, 3.2, 6), stone, -4, 1.6, 0, house);
  mesh(new THREE.BoxGeometry(0.4, 2.2, 4), stone, 4, 1.1, 1, house);
  mesh(new THREE.BoxGeometry(3, 1.4, 0.4), stone, -2, 0.7, -3, house);
  const chimney = mesh(new THREE.BoxGeometry(0.8, 6, 0.8), stone, 2.5, 3, 2.8, house);
  chimney.rotation.z = 0.05;
  const sun = new THREE.DirectionalLight(0xffc690, 2.4);
  sun.position.set(-20, 6, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  g.add(sun);
  g.add(new THREE.HemisphereLight(0xffd8b0, 0x203018, 0.8));
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(4, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.5, 1.2), toneMapped: false }));
  sunDisc.position.set(-30, 4, -70); sunDisc.lookAt(0, 1.5, 0);
  g.add(sunDisc);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.063, 0.09), new THREE.MeshStandardMaterial({ map: null, color: 0xffffff, side: THREE.DoubleSide }));
  card.rotation.x = -Math.PI / 2; card.position.set(0.3, 0.01, -1.2);
  g.add(card);
  g.userData.card = card;
  g.userData.sky = new THREE.Color(0xe8a070);
  return g;
}
function buildNight() {
  const g = new THREE.Group();
  g.visible = false;
  C.scene.add(g);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  const bark = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 1 });
  for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2, r = rand(8, 60);
    const h = rand(5, 11);
    mesh(new THREE.CylinderGeometry(0.15, 0.3, h, 6), bark, Math.cos(a) * r, h / 2, Math.sin(a) * r - 12, g);
    mesh(new THREE.ConeGeometry(2, 4, 7), bark, Math.cos(a) * r, h * 0.7, Math.sin(a) * r - 12, g);
  }
  const sp = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.3; sp[i * 3] = Math.cos(a) * Math.cos(b) * 90; sp[i * 3 + 1] = Math.sin(b) * 90 + 3; sp[i * 3 + 2] = Math.sin(a) * Math.cos(b) * 90; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true })));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2.2), toneMapped: false }));
  moon.position.set(25, 30, -60); moon.lookAt(0, 1.6, 0);
  g.add(moon);
  const ml = new THREE.DirectionalLight(0x8090c0, 0.6); ml.position.set(25, 30, -60);
  g.add(ml);
  g.add(new THREE.HemisphereLight(0x303850, 0x080808, 0.4));
  // the burning house glow behind you
  const fire = new THREE.PointLight(0xff6020, 30, 0, 2);
  fire.position.set(0, 3, 12);
  g.add(fire);
  g.userData.fire = fire;
  return g;
}

// the chain from the ring in the floor to your ankle
function buildChain(room) {
  const n = 46;
  const im = new THREE.InstancedMesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12), W.mats.iron, n);
  im.castShadow = true;
  room.add(im);
  W.chain = im;
  const ring = mesh(new THREE.TorusGeometry(0.06, 0.014, 8, 16), W.mats.iron, W.anchor.x, 0.015, W.anchor.z, room);
  ring.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), W.mats.iron, W.anchor.x, 0.01, W.anchor.z, room);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
function updateChain() {
  const a = W.anchor;
  let fx, fz, fy = 0.12;
  if (C.view.mode === 'walk') { fx = C.walk.x; fz = C.walk.z + 0.1; }
  else { fx = C.seat.x + 0.12; fz = C.seat.z - 0.25; fy = 0.14; }
  const n = W.chain.count;
  const dist = Math.hypot(fx - a.x, fz - a.z);
  const slack = Math.max(0, (C.walk.radius + 0.6) - dist) * 0.25;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = a.x + (fx - a.x) * t, z = a.z + (fz - a.z) * t;
    const y = Math.max(0.012, 0.015 + (fy - 0.015) * Math.pow(t, 6));
    const bunch = (1 - Math.min(1, dist / (n * 0.05)));
    _v.set(x + Math.sin(i * 1.7) * slack * 0.6 * bunch, y, z + Math.cos(i * 1.3) * slack * 0.6 * bunch);
    _e.set(i % 2 ? Math.PI / 2 : 0, Math.atan2(fx - a.x, fz - a.z), 0);
    _q.setFromEuler(_e);
    _m.compose(_v, _q, _s);
    W.chain.setMatrixAt(i, _m);
  }
  W.chain.instanceMatrix.needsUpdate = true;
}

// ---- act switching
export function setAct(n) {
  W.act = n;
  const G = W.groups;
  G.roots.visible = n === 2 || n === 5;
  G.void.visible = n === 3;
  G.shell.visible = n !== 3;
  G.ice.visible = n === 4;
  G.ruin.visible = n === 5;
  W.props.door.visible = n !== 3;
  for (const k of ['grate', 'floorboardGrp', 'looseStone', 'shelf', 'fuse', 'chest', 'barrels', 'notebook', 'hollow', 'valve', 'puddle', 'names', 'writing', 'bulb', 'dealerChair']) {
    if (W.props[k]) W.props[k].visible = n !== 3 || k === 'dealerChair';
  }
  W.props.hollow.visible = W.props.notebook.visible && n >= 2 && n !== 3;
  W.props.notebook.visible = n === 2 && !S.items?.notebook;
  W.chain.visible = true;
  W.fall.visible = n === 4 || n === 5;
  W.fall.material.color.set(n === 4 ? 0xcfe4ff : 0xff8a40);
  W.fall.material.size = n === 4 ? 0.018 : 0.014;
  W.dust.visible = n !== 4;
  const fog = C.scene.fog;
  const wall = W.mats.wall;
  wall.color.copy(W.mats.wallBase);
  if (n === 1) { fog.color.set(0x050304); fog.density = 0.12; C.scene.background.set(0x020102); wall.color.setRGB(1, 0.95, 0.9); }
  if (n === 2) { fog.color.set(0x070203); fog.density = 0.14; C.scene.background.set(0x030102); wall.color.setRGB(0.75, 0.55, 0.52); }
  if (n === 3) { fog.color.set(0x050506); fog.density = 0.05; C.scene.background.set(0x030304); }
  if (n === 4) { fog.color.set(0x02050c); fog.density = 0.1; C.scene.background.set(0x01030a); wall.color.setRGB(0.55, 0.65, 0.85); }
  if (n === 5) { fog.color.set(0x060202); fog.density = 0.13; C.scene.background.set(0x030101); wall.color.setRGB(0.7, 0.55, 0.45); }
  W.rim.color.set(n === 4 ? 0x6090ff : n === 3 ? 0xa09060 : n === 2 ? 0x803030 : n === 5 ? 0xa04010 : 0x5060a0);
  W.rim.intensity = n === 4 ? 2 : n === 3 ? 3 : 2.5;
  W.back.intensity = n === 3 ? 0 : n === 4 ? 45 : 60;
  W.back.color.set(n === 4 ? 0x5070a0 : n === 2 ? 0x704048 : n === 5 ? 0x704030 : 0x6a5a78);
  W.hemi.intensity = n === 3 ? 0.25 : n === 4 ? 0.2 : 0.12;
  W.hemi.color.set(n === 4 ? 0x304060 : n === 3 ? 0x404048 : 0x302838);
  W.candle.light.color.set(n === 4 ? 0xffb080 : n === 5 ? 0xff7a30 : 0xff9c50);
  W.candle.base = n === 5 ? 1.4 : n === 3 ? 2.2 : 2.0;
  W.candle.stub = [1, 1, 0.85, 0.7, 0.55, 0.28][n];
  W.candle.wax.scale.y = W.candle.stub;
  W.candle.wax.position.y = 0.012 + 0.065 * W.candle.stub;
  W.candle.flame.position.y = 0.014 + 0.13 * W.candle.stub + 0.008;
  W.candle.light.position.y = W.candle.flame.position.y + 0.018;
  C.fx.tint.set(n === 2 ? 0xffb0a8 : n === 3 ? 0xd8d0b8 : n === 4 ? 0xa8c8ff : n === 5 ? 0xffb080 : 0xffe0c0);
  C.fx.tintAmt = n === 1 ? 0.06 : 0.16;
  C.fx.frost = n === 4 ? 1 : 0;
  dealer.setAct(n);
  A.ambient(n);
}

// ---- per-frame
export function updateWorld(dt) {
  const c = W.candle;
  const t = C.t;
  // candle flicker
  const fl = c.out ? 0 : (0.86 + Math.sin(t * 11.3) * 0.04 + Math.sin(t * 23.7 + 1) * 0.03 + (Math.random() - 0.5) * 0.08) * c.k;
  c.light.intensity = c.base * fl * (S.sanity !== undefined ? 0.55 + 0.45 * Math.min(1, S.sanity / 70) : 1);
  c.flameMat.uniforms.uT.value = t;
  c.flameMat.uniforms.uK.value = c.out ? 0 : Math.min(1, c.k * 1.2);
  c.glow.material.opacity = c.out ? 0 : 0.3 * fl;
  c.flame.rotation.z = c.lean + Math.sin(t * 3.1) * 0.03;
  c.flame.rotation.x = c.leanZ + Math.sin(t * 2.3) * 0.02;
  const s = c.flame.scale;
  s.set(1, 1 + Math.sin(t * 9) * 0.06 + Math.abs(c.lean) * 0.4, 1);
  A.candleHiss?.(Math.abs(c.lean));
  // dealer gets lit by the candle in his shader
  const cp = candlePos(_v);
  dealer.setLight(cp, c.out ? 0 : c.light.intensity * 0.55);
  // dust drifts
  const dp = W.dust.geometry.attributes.position;
  for (let i = 0; i < dp.count; i++) {
    let y = dp.getY(i) + Math.sin(t * 0.3 + i) * 0.0006 - 0.0004;
    if (y < 0.1) y = 2.6;
    dp.setY(i, y);
    dp.setX(i, dp.getX(i) + Math.sin(t * 0.2 + i * 1.3) * 0.0005);
  }
  dp.needsUpdate = true;
  if (W.fall.visible) {
    const fp = W.fall.geometry.attributes.position;
    const sp = W.act === 4 ? 0.12 : -0.05;
    for (let i = 0; i < fp.count; i++) {
      let y = fp.getY(i) - sp * dt * (0.6 + (i % 7) * 0.1);
      if (W.act === 5) y += dt * 0.25;
      if (y < 0) y = 3; if (y > 3) y = 0.05;
      fp.setY(i, y);
      fp.setX(i, fp.getX(i) + Math.sin(t + i) * 0.002);
    }
    fp.needsUpdate = true;
  }
  if (W.groups.void.visible) {
    W.voidEyes.material.uniforms.uT.value = t;
    W.voidEyes.material.uniforms.uPix.value = C.h;
    for (const r of W.voidRocks) { r.rotation.y += r.userData.spin * dt; r.position.y = r.userData.y0 + Math.sin(t * 0.4 + r.position.x) * 0.15; }
    W.mist.material.map.offset.x = t * 0.004;
    W.mist.material.map.offset.y = t * 0.002;
  }
  if (W.groups.roots.visible) {
    W.mats.root.emissiveIntensity = 0.25 + Math.sin(t * 1.4) * 0.2;
  }
  if (W.groups.ruin.visible) {
    for (const sh of W.shadows) {
      sh.userData.a += dt * 0.08;
      const r = sh.userData.r - (Math.sin(t * 0.5 + sh.userData.a * 3) * 0.5 + 0.5) * 1.3;
      sh.position.x = Math.cos(sh.userData.a) * r;
      sh.position.z = Math.sin(sh.userData.a) * r - 0.3;
      sh.rotation.z = -sh.userData.a + Math.PI / 2;
    }
  }
  updateChain();
}
