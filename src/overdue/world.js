// Builds the 3D library from the map letters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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
const rbox = (w, h, d, r = 0.02, s = 2) => new RoundedBoxGeometry(w, h, d, s, r);
// a turned wooden leg (like a chess piece), made by spinning a curve
function turned(h, r) {
  const pts = [[0, 0], [r * 0.8, 0], [r * 0.9, 0.04], [r * 0.6, 0.12], [r * 0.55, 0.3], [r, 0.42], [r * 0.6, 0.5], [r * 0.5, 0.85], [r * 0.75, 0.93], [r * 0.85, 1], [0, 1]];
  return new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b * h)), 10);
}
// local geometry (x along the face, z outwards) placed on one side of a tile
const local = (g, ax, ay, az) => g.translate(ax, ay, az);
const BOOKS = []; // instanced 3D books: [x,y,z, ry, lean, w,h,d, colorIndex]

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
  buildBooks();
  addLights();
  addDust();
}

function std(t, rough, rep) {
  const m = new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: 1.2, roughness: rough });
  if (rep) { t.map.repeat.set(...rep); t.bump.repeat.set(...rep); }
  return m;
}

function buildBooks() {
  // one book shape (with a spine texture), copied thousands of times with its own size, angle and colour.
  // The books are split into neighbourhoods so the ones behind you are skipped.
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: X.bookTex(), roughness: 0.75 });
  const COLS = ['#6a1c18', '#1d4030', '#1e2e58', '#5a3a1a', '#3a2248', '#7a6a32', '#3e3e3c', '#8a3420', '#1e4040', '#5e4630', '#9a8a68', '#2c1c10', '#4a1030', '#2a3a1a'].map(c => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const CH = 12; // neighbourhood size in metres
  const groups = new Map();
  for (const b of BOOKS) { const k = Math.floor(b[0] / CH) + ',' + Math.floor(b[2] / CH) + ',' + (b[1] > FLOOR_H ? 1 : 0); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(b); }
  for (const list of groups.values()) {
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((b, i) => {
      const [x, y, z, ry, lean, w, h, d, ci] = b;
      e.set(0, ry, lean); q.setFromEuler(e); p.set(x, y, z); sc.set(w, h, d);
      m4.compose(p, q, sc); mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, COLS[Math.floor(ci * COLS.length)].clone().multiplyScalar(0.8 + (ci * 7 % 1) * 0.4));
    });
    mesh.computeBoundingSphere();
    mesh.receiveShadow = true; mesh.castShadow = false;
    C.scene.add(mesh);
  }
  WLD.bookCount = BOOKS.length;
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
  const open = DIRS.map(([dc, dr]) => !['#', 'S', 'g', 'E'].includes(at(L, c + dc, r + dr)));
  // the solid middle of the stack, pulled back on the open sides so the shelves have depth
  const e = open.map(o => o ? 0.66 : 0.98); // N, E, S, W extents
  const cx = (e[1] - e[3]) / 2, cz = (e[2] - e[0]) / 2;
  put('frame', box(e[1] + e[3], SHELF_H, e[0] + e[2]), x + cx, y0 + SHELF_H / 2, z + cz);
  put('frame', rbox(T + 0.08, 0.12, T + 0.08, 0.03), x, y0 + SHELF_H + 0.06, z);          // crown
  put('frame', box(T - 0.02, 0.12, T - 0.02), x, y0 + 0.06, z);                         // kick board
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('frame', box(0.1, SHELF_H, 0.1), x + sx * 0.95, y0 + SHELF_H / 2, z + sz * 0.95); // corner posts
  const ROWS = 5, rowH = (SHELF_H - 0.2) / ROWS;
  DIRS.forEach(([dc, dr, ry], fi) => {
    if (!open[fi]) return;
    const m = 'books' + ((c * 3 + r * 5 + fi + L) % 3);
    // a dim painted backboard of books (seen through the gaps between the real books)
    const bg = plane(T - 0.14, SHELF_H - 0.2); local(bg, 0, 0, 0.665);
    put(m, bg, x, y0 + SHELF_H / 2, z, ry);
    for (let k = 0; k <= ROWS; k++) { // shelf boards
      const g = box(T - 0.12, 0.04, 0.34); local(g, 0, 0, 0.83);
      put('wood', g, x, y0 + 0.12 + k * rowH, z, ry);
    }
    const isGap = gap && fi === open.indexOf(true);
    if (isGap) { const d = plane(0.6, SHELF_H - 0.3); local(d, 0, 0, 0.67); put('dark', d, x, y0 + SHELF_H / 2, z, ry); }
    // real 3D books
    const nx = dc, nz = dr, tx = -dr, tz = dc;
    const mob = C.mobile ? 1.6 : 1;
    for (let k = 0; k < ROWS; k++) {
      let u = -0.9;
      const by = y0 + 0.14 + k * rowH;
      while (u < 0.88) {
        const w = (0.042 + Math.random() * 0.05) * mob, h = rowH * (0.62 + Math.random() * 0.3), d = 0.2 + Math.random() * 0.08;
        if (isGap && Math.abs(u) < 0.32) { u += w; continue; }
        if (Math.random() < 0.045) { u += 0.08 + Math.random() * 0.12; continue; } // a gap where books are missing
        let lean = 0;
        if (Math.random() < 0.04 && u < 0.7) lean = 0.25 + Math.random() * 0.2;
        if (Math.random() < 0.025) { // a book lying flat
          const fw = 0.25 + Math.random() * 0.06;
          BOOKS.push([x + nx * (0.97 - d / 2) + tx * (u + fw / 2), by + 0.02, z + nz * (0.97 - d / 2) + tz * (u + fw / 2), ry, Math.PI / 2, 0.04, fw, d, Math.random()]);
          u += fw + 0.01; continue;
        }
        const out = 0.97 - d / 2 - Math.random() * 0.03;
        const uu = u + w / 2 + (lean ? Math.sin(lean) * h * 0.5 : 0);
        BOOKS.push([x + nx * out + tx * uu, by + h / 2 * Math.cos(lean), z + nz * out + tz * uu, ry, -lean, w, h, d, Math.random()]);
        u += w + (lean ? Math.sin(lean) * h + 0.02 : 0.003);
      }
    }
  });
}

function addDesk(L, x, z, front, lamp) {
  const y0 = L * FLOOR_H;
  if (front) {
    put('wood', rbox(T, 0.08, 1.45, 0.03), x, y0 + 1.1, z); put('wood', rbox(0.08, 1.1, 1.4, 0.02), x - T / 2 + 0.04, y0 + 0.55, z);
    put('wood', rbox(0.08, 1.1, 1.4, 0.02), x + T / 2 - 0.04, y0 + 0.55, z); put('wood', box(T, 1.1, 0.06), x, y0 + 0.55, z - 0.67);
    for (let i = 0; i < 3; i++) put('frame', rbox(0.55, 0.85, 0.02, 0.01), x - 0.62 + i * 0.62, y0 + 0.55, z - 0.7); // panels
    put('plastic', rbox(0.42, 0.34, 0.36, 0.04), x + 0.3, y0 + 1.31, z); put('brass', cyl(0.06, 0.08, 0.06, 16), x - 0.5, y0 + 1.17, z + 0.3);
    put('paper', rbox(0.3, 0.12, 0.22, 0.01), x - 0.1, y0 + 1.2, z + 0.25, 0.2);
    return;
  }
  put('wood', rbox(T - 0.08, 0.07, 1.62, 0.03), x, y0 + 0.78, z);
  put('frame', box(T - 0.3, 0.1, 1.4), x, y0 + 0.69, z); // apron under the top
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('frame', turned(0.74, 0.055), x + sx * 0.82, y0, z + sz * 0.66);
  for (const sz of [-1, 1]) { // spindle-back chairs
    const cxx = x + 0.3 * sz, czz = z + sz * 1.05;
    put('wood', rbox(0.46, 0.05, 0.44, 0.02), cxx, y0 + 0.47, czz);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('frame', turned(0.46, 0.028), cxx + a * 0.19, y0, czz + b * 0.18);
    for (const a of [-1, 1]) put('frame', cyl(0.022, 0.022, 0.6, 8), cxx + a * 0.19, y0 + 0.78, czz + sz * 0.2);
    put('wood', rbox(0.46, 0.08, 0.05, 0.02), cxx, y0 + 1.07, czz + sz * 0.2);
    for (let i = -1; i <= 1; i++) put('frame', cyl(0.012, 0.012, 0.52, 6), cxx + i * 0.1, y0 + 0.78, czz + sz * 0.2);
  }
  // open books and loose pages on the table
  const ob = rbox(0.44, 0.035, 0.3, 0.01); put('paper', ob, x - 0.4, y0 + 0.83, z + 0.2, 0.3);
  put('velvet', rbox(0.2, 0.06, 0.28, 0.008), x + 0.1, y0 + 0.845, z + 0.4, -0.4);
  if (lamp) { // a banker's lamp
    put('brass', cyl(0.06, 0.11, 0.04, 20), x + 0.5, y0 + 0.835, z - 0.3);
    put('brass', cyl(0.012, 0.012, 0.32, 8), x + 0.5, y0 + 1.0, z - 0.3);
    const shade = new THREE.LatheGeometry([[0.02, 0], [0.09, 0.02], [0.13, 0.07], [0.14, 0.09]].map(([a, b]) => new THREE.Vector2(a, b)), 20, 0, Math.PI);
    shade.rotateX(Math.PI / 2); shade.rotateY(Math.PI / 2); shade.scale(1.6, 1, 1);
    put('green', shade, x + 0.5, y0 + 1.2, z - 0.3);
    put('brass', rbox(0.34, 0.02, 0.03, 0.008), x + 0.5, y0 + 1.15, z - 0.3);
    WLD.lampSpots = (WLD.lampSpots || []); WLD.lampSpots.push([x + 0.5, y0 + 1.1, z - 0.3]);
  }
}

function addCabinet(L, c, r) {
  const x = tileX(c), z = tileZ(r), y0 = L * FLOOR_H;
  put('frame', rbox(1.56, 2.36, 1.24, 0.03), x, y0 + 1.18, z);
  put('frame', rbox(1.68, 0.1, 1.36, 0.03), x, y0 + 2.38, z);
  // slatted doors on every side you can see
  for (const [dc, dr, ry] of DIRS) {
    if (!canStand(L, c + dc, r + dr)) continue;
    const off = (dc ? 0.78 : 0.62) + 0.005;
    for (const s of [-1, 1]) { const d = plane(0.62, 1.95); local(d, s * 0.34, 0, off); put('slats', d, x, y0 + 1.15, z, ry); }
    const h1 = box(0.03, 0.18, 0.04); local(h1, -0.05, 0, off + 0.02); put('brass', h1, x, y0 + 1.2, z, ry);
    const h2 = box(0.03, 0.18, 0.04); local(h2, 0.05, 0, off + 0.02); put('brass', h2, x, y0 + 1.2, z, ry);
  }
}

function addComputer(L, c, r, secret) {
  const x = tileX(c), z = tileZ(r), y0 = L * FLOOR_H;
  put('wood', rbox(T - 0.15, 0.06, 1.2, 0.02), x, y0 + 0.76, z); put('frame', box(T - 0.2, 0.74, 0.05), x, y0 + 0.37, z - 0.55);
  put('plastic', rbox(0.56, 0.46, 0.36, 0.06, 3), x, y0 + 1.05, z - 0.07);       // CRT front
  put('plastic', rbox(0.42, 0.34, 0.3, 0.08, 3), x, y0 + 1.03, z - 0.36);        // CRT back bulge
  put('plastic', rbox(0.3, 0.05, 0.25, 0.02), x, y0 + 0.81, z - 0.12);          // stand
  put('plastic', rbox(0.62, 0.035, 0.2, 0.012), x, y0 + 0.81, z + 0.32);        // keyboard
  for (let i = 0; i < 4; i++) for (let k = 0; k < 13; k++) put('dark', box(0.035, 0.012, 0.032), x - 0.27 + k * 0.045, y0 + 0.832, z + 0.26 + i * 0.04);
  put('plastic', rbox(0.06, 0.03, 0.1, 0.015), x + 0.45, y0 + 0.81, z + 0.32);  // mouse
  const lines = secret ? ['MIDNIGHT LIBRARY', 'SYSTEM v1.0', '', 'PASSWORD: _'] : [['CARD CATALOG', 'SEARCH: _'], ['DUE DATES', '...OVERDUE', '...OVERDUE'], ['ZZZ', ''], ['ERROR 451']][(c + r) % 4];
  const t = X.screenTex(lines, secret ? '#ff7a6a' : '#7dff9a');
  const sg = new THREE.PlaneGeometry(0.46, 0.36, 8, 6); // a slightly bulging glass screen
  const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / 0.23, v = sp.getY(i) / 0.18; sp.setZ(i, 0.025 * (1 - u * u) * (1 - v * v)); }
  sg.computeVertexNormals();
  const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: t, color: 0xaaaaaa }));
  m.position.set(x, y0 + 1.06, z + 0.112); C.scene.add(m);
  WLD.screens.push(m);
  if (secret) WLD.secretScreen = m;
}

function addPodium(x, z) {
  put('stone', cyl(0.85, 0.95, 0.55, 20), x, 0.275, z);
  put('brass', cyl(0.88, 0.88, 0.05, 20), x, 0.56, z);
  const lbl = new THREE.Mesh(plane(0.8, 0.2), new THREE.MeshStandardMaterial({ map: X.labelTex('MR. PAGES\nOUR STORYTIME HERO', { font: 'bold 40px Georgia,serif', bg: '#a8884a', fg: '#2a1a08', border: null }), roughness: 0.4, metalness: 0.6 }));
  lbl.position.set(x, 0.3, z + 0.93); C.scene.add(lbl);
}

function addArmchair(x, z) { // a big puffy velvet storytime chair (faces east, towards the kids)
  put('velvet', rbox(0.9, 0.45, 1.1, 0.12, 3), x, 0.32, z);
  put('velvet', rbox(0.75, 0.16, 0.95, 0.07, 3), x + 0.05, 0.6, z);
  put('velvet', rbox(0.28, 1.25, 1.15, 0.12, 3), x - 0.42, 0.75, z);
  for (const s of [-1, 1]) put('velvet', rbox(0.95, 0.38, 0.24, 0.1, 3), x, 0.72, z + s * 0.52);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put('frame', turned(0.12, 0.05), x + a * 0.38, 0, z + b * 0.48);
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
  spot.position.set(tileX(p.c) - 1.6, 4.1, tileZ(p.r) + 0.6); spot.target.position.set(tileX(p.c), 2.2, tileZ(p.r)); S.add(spot, spot.target);
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
