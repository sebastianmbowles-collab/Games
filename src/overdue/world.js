// Builds the 3D library from the map letters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { C } from './core.js';
import { GRID, W, H, T, FLOOR_H, at, STAIRS, tileX, tileZ, stairAt, canStand, findTile } from './map.js';
import * as X from './tex.js';

export const WLD = { lights: [], flicker: [], windowMat: null, moon: null, hemi: null, podiumLight: null, secretScreen: null, screens: [], dust: null };

const parts = {}; // material name -> list of geometries
function put(mat, geo, x, y, z, ry = 0, rx = 0) {
  geo = geo.clone ? geo.clone() : geo;
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  (parts[mat] ||= []).push(geo.index ? geo.toNonIndexed() : geo);
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const plane = (w, h) => new THREE.PlaneGeometry(w, h);
const cyl = (r1, r2, h, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s);

const SHELF_H = 3.0, CEIL = FLOOR_H - 0.3;
const DIRS = [[0, -1, Math.PI], [1, 0, Math.PI / 2], [0, 1, 0], [-1, 0, -Math.PI / 2]]; // dc, dr, plane rotation facing that way

export function buildWorld() {
  const S = C.scene;
  const mats = {
    wall: std(X.wallTex(), 0.92), carpet: std(X.carpetTex(), 0.95, [12, 9]), wood: std(X.woodTex('#5a3620', 6), 0.7),
    floorWood: std(X.woodTex('#6a4428', 10), 0.65, [1, 1]), frame: std(X.woodTex('#2a170b', 3), 0.75),
    ceil: std(X.ceilingTex(), 1), books0: std(X.spinesTex(0), 0.85), books1: std(X.spinesTex(1), 0.85), books2: std(X.spinesTex(2), 0.85),
    dark: new THREE.MeshStandardMaterial({ color: 0x050302, roughness: 1 }),
    slats: new THREE.MeshStandardMaterial({ map: X.slatsTex(), roughness: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4, metalness: 0.7 }),
    brass: new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.35, metalness: 0.9 }),
    green: new THREE.MeshStandardMaterial({ color: 0x0f4a2a, roughness: 0.3, emissive: 0x0a3a1a, emissiveIntensity: 0.4 }),
    velvet: new THREE.MeshStandardMaterial({ color: 0x5a0d14, roughness: 1 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.6 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.9 }),
    paper: new THREE.MeshStandardMaterial({ map: X.pagesEdgeTex(), roughness: 1 }),
  };
  WLD.mats = mats;
  for (const k of ['books0', 'books1', 'books2']) { mats[k].map.wrapS = THREE.RepeatWrapping; }
  // the floor 0 floor: one big carpet
  const fl = new THREE.Mesh(plane(W * T, H * T), mats.carpet); fl.rotation.x = -Math.PI / 2; fl.position.set(W, 0, H); fl.receiveShadow = true; S.add(fl);
  // the roof
  const roof = new THREE.Mesh(plane(W * T, H * T), mats.ceil); roof.rotation.x = Math.PI / 2; roof.position.set(W, FLOOR_H * 2, H); mats.ceil.map.repeat.set(W, H); S.add(roof);
  mats.ceil.bumpMap.repeat.set(W, H);

  for (let L = 0; L < 2; L++) {
    const y0 = L * FLOOR_H;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const ch = at(L, c, r), x = tileX(c), z = tileZ(r);
      // upstairs floor slab + downstairs ceiling
      if (L === 1 && ch !== 'O' && ch !== 'u') {
        put('floorWood', plane(T, T), x, FLOOR_H, z, 0, -Math.PI / 2);
        put('ceil', plane(T, T), x, CEIL, z, 0, Math.PI / 2);
        // slab edge facing the hole
        for (const [dc, dr, ry] of DIRS) {
          const n = at(1, c + dc, r + dr);
          if (n === 'O' || n === 'u') put('wood', plane(T, 0.3), x + dc * T / 2, FLOOR_H - 0.15, z + dr * T / 2, ry);
        }
      }
      switch (ch) {
        case '#': case 'E': {
          // only draw wall faces that point into the room
          for (const [dc, dr, ry] of DIRS) {
            const n = at(L, c + dc, r + dr);
            if (n === '#' || n === 'E' || n === undefined) continue;
            if (c + dc < 0 || r + dr < 0 || c + dc >= W || r + dr >= H) continue;
            put('wall', plane(T, FLOOR_H), x + dc * T / 2, y0 + FLOOR_H / 2, z + dr * T / 2, ry);
            if (ch === '#' && (c === 0 || r === 0 || c === W - 1 || r === H - 1) && ((c * 7 + r * 13 + L * 5) % 4 === 0)) addWindow(x + dc * (T / 2 - 0.02), y0, z + dr * (T / 2 - 0.02), ry);
          }
          if (ch === 'E') addDoor(x, z - T / 2 + 0.03);
          break;
        }
        case 'S': case 'g': addShelf(L, c, r, ch === 'g'); break;
        case 'D': case 'f': addDesk(L, x, z, ch === 'f', (c + r) % 3 === 0); break;
        case 'F': put('wood', box(T, 1.1, 1.3), x, y0 + 0.55, z); put('frame', box(T + 0.05, 0.06, 1.45), x, y0 + 1.12, z); break;
        case 'C': addCabinet(L, c, r); break;
        case 'c': case 'X': addComputer(L, c, r, ch === 'X'); break;
        case 'P': addPodium(x, z); break;
        case 'B': addArmchair(x, z); break;
        case '|': if (L === 0) { for (const [dc, dr, ry] of DIRS) if (canStand(0, c + dc, r + dr) || stairAt(c + dc, r + dr)) put('wall', plane(T, CEIL), x + dc * T / 2, CEIL / 2, z + dr * T / 2, ry); }
          else addRail(L, c, r); break;
        case 'O': addRail(L, c, r); break;
      }
    }
  }
  for (const s of STAIRS) addStairs(s);
  addStorytime();
  addAtrium();
  // merge everything that shares a material into one mesh (fast!)
  for (const [m, list] of Object.entries(parts)) {
    const g = mergeGeometries(list, false);
    const mesh = new THREE.Mesh(g, mats[m]);
    mesh.castShadow = m !== 'ceil' && m !== 'wall' && m !== 'floorWood';
    mesh.receiveShadow = true;
    S.add(mesh);
  }
  addLights();
  addDust();
}

function std(t, rough, rep) {
  const m = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughness: rough });
  if (rep) { t.map.repeat.set(...rep); t.bump.repeat.set(...rep); }
  return m;
}

function addWindow(x, y0, z, ry) {
  if (!WLD.windowMat) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9ab4e0'); gr.addColorStop(1, '#2a3a60');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
    g.fillStyle = '#0a0806'; g.fillRect(60, 0, 8, 256); g.fillRect(0, 120, 128, 8); g.lineWidth = 10; g.strokeStyle = '#0a0806'; g.strokeRect(0, 0, 128, 256);
    g.beginPath(); g.arc(64, 0, 70, 0, Math.PI); g.stroke();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    WLD.windowMat = new THREE.MeshBasicMaterial({ map: t, color: 0x6070a0, fog: false });
    WLD.windowMesh = [];
  }
  const m = new THREE.Mesh(plane(1.1, 2.2), WLD.windowMat);
  m.position.set(x, y0 + 2.2, z); m.rotation.y = ry; C.scene.add(m);
  WLD.windowMesh.push(m);
}

function addDoor(x, z) { // z = the inside face of the wall; the room is towards -z
  put('frame', box(1.9, 3.0, 0.1), x, 1.5, z - 0.05);
  put('brass', box(0.08, 0.6, 0.12), x - 0.15, 1.2, z - 0.12); put('brass', box(0.08, 0.6, 0.12), x + 0.15, 1.2, z - 0.12);
  for (let i = 0; i < 9; i++) put('metal', new THREE.TorusGeometry(0.07, 0.02, 6, 10), x - 0.45 + i * 0.11, 1.15 + Math.sin(i) * 0.05, z - 0.18); // chain
  put('metal', box(0.18, 0.24, 0.08), x, 1.0, z - 0.22); // padlock
}

function addShelf(L, c, r, gap) {
  const x = tileX(c), z = tileZ(r), y0 = L * FLOOR_H;
  put('frame', box(T - 0.04, SHELF_H, T - 0.04), x, y0 + SHELF_H / 2, z);
  put('frame', box(T + 0.06, 0.1, T + 0.06), x, y0 + SHELF_H + 0.05, z);
  let i = 0;
  for (const [dc, dr, ry] of DIRS) {
    const n = at(L, c + dc, r + dr);
    if (['#', 'S', 'g', 'E'].includes(n)) continue;
    const m = 'books' + ((c * 3 + r * 5 + i++ + L) % 3);
    const g = plane(T - 0.12, SHELF_H - 0.1);
    const off = ((c * 7 + r * 3 + i) % 4) * 0.25; const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * 0.9 + off);
    put(m, g, x + dc * (T / 2 - 0.0), y0 + SHELF_H / 2 - 0.02, z + dr * (T / 2 - 0.0), ry);
    if (gap && i === 1) put('dark', plane(0.55, 2.2), x + dc * (T / 2 + 0.01), y0 + 1.15, z + dr * (T / 2 + 0.01), ry);
  }
}

function addDesk(L, x, z, front, lamp) {
  const y0 = L * FLOOR_H;
  if (front) {
    put('wood', box(T, 0.08, 1.4), x, y0 + 1.1, z); put('wood', box(0.08, 1.1, 1.4), x - T / 2 + 0.04, y0 + 0.55, z);
    put('wood', box(0.08, 1.1, 1.4), x + T / 2 - 0.04, y0 + 0.55, z); put('wood', box(T, 1.1, 0.06), x, y0 + 0.55, z - 0.67);
    put('plastic', box(0.4, 0.32, 0.35), x + 0.3, y0 + 1.3, z); put('brass', cyl(0.06, 0.08, 0.06), x - 0.5, y0 + 1.17, z + 0.3);
    return;
  }
  put('wood', box(T - 0.1, 0.07, 1.6), x, y0 + 0.78, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('frame', box(0.08, 0.75, 0.08), x + sx * 0.85, y0 + 0.375, z + sz * 0.7);
  for (const sz of [-1, 1]) { // chairs
    put('wood', box(0.45, 0.05, 0.45), x + 0.3 * sz, y0 + 0.47, z + sz * 1.05);
    put('wood', box(0.45, 0.55, 0.05), x + 0.3 * sz, y0 + 0.75, z + sz * 1.27);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('frame', box(0.04, 0.47, 0.04), x + 0.3 * sz + a * 0.2, y0 + 0.235, z + sz * 1.05 + b * 0.2);
  }
  // open books on the table
  put('paper', box(0.42, 0.03, 0.3), x - 0.4, y0 + 0.83, z + 0.2, 0.3);
  if (lamp) {
    put('brass', cyl(0.08, 0.1, 0.03), x + 0.5, y0 + 0.83, z - 0.3); put('brass', cyl(0.015, 0.015, 0.35), x + 0.5, y0 + 1.0, z - 0.3);
    const shade = new THREE.CylinderGeometry(0.11, 0.11, 0.4, 12, 1, true, 0, Math.PI); shade.rotateZ(Math.PI / 2);
    put('green', shade, x + 0.5, y0 + 1.2, z - 0.3);
    WLD.lampSpots = (WLD.lampSpots || []); WLD.lampSpots.push([x + 0.5, y0 + 1.1, z - 0.3]);
  }
}

function addCabinet(L, c, r) {
  const x = tileX(c), z = tileZ(r), y0 = L * FLOOR_H;
  put('slats', box(1.5, 2.3, 1.2), x, y0 + 1.15, z);
  put('frame', box(1.6, 0.08, 1.3), x, y0 + 2.34, z);
  put('brass', box(0.04, 0.2, 0.04), x - 0.08, y0 + 1.2, z + 0.62); put('brass', box(0.04, 0.2, 0.04), x + 0.08, y0 + 1.2, z + 0.62);
}

function addComputer(L, c, r, secret) {
  const x = tileX(c), z = tileZ(r), y0 = L * FLOOR_H;
  put('wood', box(T - 0.15, 0.06, 1.2), x, y0 + 0.76, z); put('frame', box(T - 0.2, 0.74, 0.05), x, y0 + 0.37, z - 0.55);
  put('plastic', box(0.55, 0.45, 0.5), x, y0 + 1.03, z - 0.15); put('plastic', box(0.6, 0.04, 0.2), x, y0 + 0.8, z + 0.3);
  const lines = secret ? ['MIDNIGHT LIBRARY', 'SYSTEM v1.0', '', 'PASSWORD: _'] : [['CARD CATALOG', 'SEARCH: _'], ['DUE DATES', '...OVERDUE', '...OVERDUE'], ['ZZZ', ''], ['ERROR 451']][(c + r) % 4];
  const t = X.screenTex(lines, secret ? '#ff7a6a' : '#7dff9a');
  const m = new THREE.Mesh(plane(0.44, 0.33), new THREE.MeshBasicMaterial({ map: t, color: 0xaaaaaa }));
  m.position.set(x, y0 + 1.05, z + 0.105); C.scene.add(m);
  WLD.screens.push(m);
  if (secret) WLD.secretScreen = m;
}

function addPodium(x, z) {
  put('stone', cyl(0.85, 0.95, 0.55, 20), x, 0.275, z);
  put('brass', cyl(0.88, 0.88, 0.05, 20), x, 0.56, z);
  const lbl = new THREE.Mesh(plane(0.8, 0.2), new THREE.MeshStandardMaterial({ map: X.labelTex('MR. PAGES\nOUR STORYTIME HERO', { font: 'bold 40px Georgia,serif', bg: '#a8884a', fg: '#2a1a08', border: null }), roughness: 0.4, metalness: 0.6 }));
  lbl.position.set(x, 0.3, z + 0.93); C.scene.add(lbl);
}

function addArmchair(x, z) {
  put('velvet', box(1.1, 0.5, 0.9), x, 0.25, z); put('velvet', box(1.1, 1.1, 0.25), x + 0, 0.8, z - 0.45);
  put('velvet', box(0.2, 0.75, 0.9), x - 0.55, 0.45, z); put('velvet', box(0.2, 0.75, 0.9), x + 0.55, 0.45, z);
}

function addRail(L, c, r) {
  // a wooden balustrade on every edge between a walkable tile and this hole
  const x = tileX(c), z = tileZ(r), y0 = L * FLOOR_H;
  for (const [dc, dr, ry] of DIRS) {
    const n = at(L, c + dc, r + dr);
    if (!(n === '.' || n === 'r' || n === 'k')) continue;
    const ex = x + dc * T / 2, ez = z + dr * T / 2;
    put('frame', box(T, 0.08, 0.12), ex, y0 + 1.05, ez, ry);
    put('frame', box(T, 0.06, 0.08), ex, y0 + 0.08, ez, ry);
    for (let i = 0; i < 8; i++) {
      const o = -T / 2 + 0.125 + i * 0.25;
      put('wood', cyl(0.03, 0.035, 0.95, 6), ex + (dr ? o : 0), y0 + 0.55, ez + (dc ? o : 0));
    }
  }
}

function addStairs(s) {
  const x = tileX(s.c), zTop = s.top * T, zBot = (s.bot + 1) * T;
  const n = 18, len = zBot - zTop;
  for (let i = 0; i < n; i++) {
    const h = (i + 1) / n * FLOOR_H, d = len / n;
    put('wood', box(T - 0.1, 0.06, d + 0.02), x, h - 0.03, zBot - (i + 0.5) * d);
    put('frame', box(T - 0.1, h - 0.06, 0.03), x, (h - 0.06) / 2, zBot - i * d - 0.015);
  }
  // a banister along the open side, upstairs
  for (let i = 0; i <= 8; i++) {
    const zz = zBot - i * len / 8, hh = i / 8 * FLOOR_H;
    if (i % 2 === 0) put('frame', cyl(0.035, 0.035, 0.95, 6), x + (s.c < W / 2 ? 0.95 : -0.95), hh + 0.48, zz);
  }
  const rail = box(0.08, 0.08, Math.hypot(len, FLOOR_H)); rail.rotateX(Math.atan2(FLOOR_H, len));
  put('frame', rail, x + (s.c < W / 2 ? 0.95 : -0.95), FLOOR_H / 2 + 0.95, (zTop + zBot) / 2);
}

function addStorytime() {
  const k = findTile('k');
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40), new THREE.MeshStandardMaterial({ map: X.rugTex(), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(tileX(k.c) + 1, 0.015, tileZ(k.r)); rug.receiveShadow = true; C.scene.add(rug);
  const cols = [0xd04030, 0x3080d0, 0xe0b030, 0x40a060, 0xa050c0];
  for (let i = 0; i < 6; i++) { // little stools in a circle around the chair
    const a = Math.PI * 0.55 + i * 0.32, rr = 2.2;
    const st = new THREE.Mesh(cyl(0.22, 0.25, 0.32, 12), new THREE.MeshStandardMaterial({ color: cols[i % 5], roughness: 0.6 }));
    st.position.set(tileX(k.c) + 2 + Math.cos(a) * rr, 0.16, tileZ(k.r) + Math.sin(a) * rr); st.castShadow = true; C.scene.add(st);
  }
  // poster on the west wall
  const p = new THREE.Mesh(plane(1.2, 1.65), new THREE.MeshStandardMaterial({ map: X.posterTex(), roughness: 0.9 }));
  p.position.set(0.02 + T, 2.0, tileZ(k.r) - 0.2); p.rotation.y = Math.PI / 2; C.scene.add(p);
  // scattered picture books
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(box(0.3, 0.04, 0.24), new THREE.MeshStandardMaterial({ color: cols[i % 5], roughness: 0.7 }));
    b.position.set(tileX(k.c) + (i * 0.73) % 3 - 0.5, 0.03, tileZ(k.r) + 1.2 + (i * 0.37) % 1.2 - 0.8); b.rotation.y = i * 1.3; C.scene.add(b);
  }
  // sign over the front doors
  const e = findTile('E');
  const sign = new THREE.Mesh(plane(1.0, 0.32), new THREE.MeshBasicMaterial({ map: X.labelTex('EXIT', { bg: '#200404', fg: '#ff3a2a', border: '#ff3a2a', font: 'bold 80px Arial' }) }));
  sign.position.set(tileX(e.c) + 1, 3.4, tileZ(e.r) - T / 2 - 0.05); sign.rotation.y = Math.PI; C.scene.add(sign);
  const hours = new THREE.Mesh(plane(1.4, 0.7), new THREE.MeshStandardMaterial({ map: X.labelTex('LIBRARY CLOSES\nAT 9 PM\nNO EXCEPTIONS', { h: 256, font: 'bold 48px Georgia,serif' }), roughness: 0.8 }));
  hours.position.set(tileX(e.c) - 2.2, 1.8, tileZ(e.r) - T / 2 - 0.04); hours.rotation.y = Math.PI; C.scene.add(hours);
  WLD.exitLightPos = [tileX(e.c) + 1, 3.2, tileZ(e.r) - 1.4];
  const lab = new THREE.Mesh(plane(1.6, 0.4), new THREE.MeshStandardMaterial({ map: X.labelTex('COMPUTER LAB'), roughness: 0.8 }));
  lab.position.set(tileX(18), 3.0, 7 * T + T + 0.01); C.scene.add(lab);
}

function addAtrium() {
  // chandelier hanging in the middle of the big hole
  const cx = 12 * T, cz = 10 * T + 1, cy = FLOOR_H * 2 - 2.6;
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 8, 32), WLD.mats.brass); ring.rotation.x = Math.PI / 2; g.add(ring);
  const chain = new THREE.Mesh(cyl(0.02, 0.02, 2.6, 6), WLD.mats.metal); chain.position.y = 1.3; g.add(chain);
  const candle = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0x332211, roughness: 0.8 });
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const cd = new THREE.Mesh(cyl(0.03, 0.03, 0.2, 6), candle); cd.position.set(Math.cos(a) * 1.1, 0.12, Math.sin(a) * 1.1); g.add(cd);
  }
  g.position.set(cx, cy, cz); C.scene.add(g); WLD.chandelier = g;
  // moonlight pouring through a skylight
  const sky = new THREE.Mesh(plane(6, 3), new THREE.MeshBasicMaterial({ color: 0x2a3450, fog: false }));
  sky.rotation.x = Math.PI / 2; sky.position.set(cx, FLOOR_H * 2 - 0.02, cz); C.scene.add(sky); WLD.skylight = sky;

}

function addLights() {
  const S = C.scene;
  WLD.hemi = new THREE.HemisphereLight(0x3a4a70, 0x100806, 0.9); S.add(WLD.hemi);
  WLD.moon = new THREE.DirectionalLight(0x6a80c0, 0.25); WLD.moon.position.set(10, 30, -20); S.add(WLD.moon);
  const moonSpot = new THREE.PointLight(0x7a90d0, 6, 14, 2); moonSpot.position.set(12 * T, 7, 10 * T + 1); S.add(moonSpot); WLD.moonSpot = moonSpot;
  const exit = new THREE.PointLight(0xff2010, 3, 9, 2); exit.position.set(...WLD.exitLightPos); S.add(exit); WLD.flicker.push(exit);
  const p = findTile('P');
  const spot = new THREE.SpotLight(0xffd8a0, 45, 12, 0.5, 0.6, 2);
  spot.position.set(tileX(p.c) - 1.6, 4.1, tileZ(p.r) + 0.6); spot.target.position.set(tileX(p.c), 1.8, tileZ(p.r)); S.add(spot, spot.target);
  WLD.podiumLight = spot;
  for (const [x, y, z] of (WLD.lampSpots || []).slice(0, 3)) { const l = new THREE.PointLight(0x9aff8a, 1.2, 4, 2); l.position.set(x, y, z); S.add(l); WLD.flicker.push(l); }
  const lab = new THREE.PointLight(0x50ff80, 2.5, 7, 2); lab.position.set(tileX(20), 1.6, tileZ(3)); S.add(lab); WLD.labLight = lab;
}

function addDust() {
  const n = 220, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 8;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  WLD.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8d0b8, size: 0.018, transparent: true, opacity: 0.5, depthWrite: false }));
  C.scene.add(WLD.dust);
}

export function updateWorld(dt, cam) {
  if (WLD.dust) { WLD.dust.position.copy(cam.position); WLD.dust.rotation.y += dt * 0.03; WLD.dust.rotation.x += dt * 0.01; }
  for (const l of WLD.flicker) { if (!l.userData.base) l.userData.base = l.intensity; l.intensity = l.userData.base * (Math.random() < 0.03 ? 0.2 : 0.85 + Math.random() * 0.15); }
  if (WLD.chandelier) WLD.chandelier.rotation.y = Math.sin(C.t * 0.3) * 0.08;
}

// 6 AM: the sun comes up
export function sunrise(k) {
  WLD.windowMat.color.setRGB(0.4 + k * 2.2, 0.45 + k * 1.6, 0.6 + k * 0.6);
  WLD.hemi.color.setRGB(0.23 + k * 0.8, 0.29 + k * 0.6, 0.44 + k * 0.3); WLD.hemi.intensity = 0.9 + k * 1.6;
  WLD.moon.color.setRGB(0.4 + k * 0.6, 0.5 + k * 0.35, 0.75 - k * 0.2); WLD.moon.intensity = 0.25 + k * 2.5;
  C.scene.fog.density = 0.045 - k * 0.03;
  C.scene.fog.color.setRGB(0.01 + k * 0.25, 0.015 + k * 0.18, 0.02 + k * 0.1);
  WLD.skylight.material.color.setRGB(0.16 + k * 1.2, 0.2 + k * 0.9, 0.31 + k * 0.4);
}
