import * as THREE from 'three'
import { DUCK_NAMES, PLAYER_COLORS, SCHEMES } from './data'
import { animateMaterials, buildDuck, buildPet, disposeScene, mat, poseDuck, setBalloons } from './duck'
import { COSTUMES } from './costumes'
import { addLights, makeClouds, makeSky } from './matchView'
import { sfx } from './sound'

// The hub is a small 3D world (y is up). Solids are boxes or discs the duck can
// stand on; zones are trigger spheres that open menus, reward secrets, etc.

const G = 1100
const R = 13
const HEIGHT = 46

const OBBY_X = { easy: 3000, medium: 6000, hard: 9000 }
const REWARD = { easy: 100, medium: 250, hard: 600 }

function box(x, y, z, w, h, d, color, extra = {}) {
  return { t: 'box', x, y, z, w, h, d, color, ...extra }
}

function obbyCourse(level) {
  const ox = OBBY_X[level]
  const out = []
  const add = (o) => out.push(o)
  const colors = { easy: ['#5ee07a', '#8ac926'], medium: ['#ffb13b', '#ffe45e'], hard: ['#ff5d8f', '#c77dff'] }[level]
  add(box(ox, -20, 0, 220, 40, 220, '#4cc9f0', { start: level }))
  let z = -150
  let y = 0
  let x = ox
  let cp = 0
  const n = { easy: 12, medium: 18, hard: 26 }[level]
  for (let i = 0; i < n; i++) {
    const hard = level === 'hard'
    const gap = level === 'easy' ? 95 : hard ? 140 : 120
    const size = level === 'easy' ? 110 : hard ? 60 : 80
    z -= gap
    y += level === 'easy' ? (i % 3 === 2 ? 30 : 0) : Math.round((Math.random() - 0.3) * (hard ? 60 : 40))
    y = Math.max(0, Math.min(400, y))
    x = ox + Math.sin(i * 0.9) * (hard ? 140 : 90)
    const color = colors[i % 2]
    if ((i + 1) % 6 === 0) {
      cp += 1
      add(box(x, y - 15, z, 130, 30, 130, '#ffffff', { checkpoint: `${level}${cp}` }))
      z -= 40
      continue
    }
    const r = Math.random()
    if (level !== 'easy' && r < 0.2) add(box(x, y - 10, z, size, 20, size, '#ff9f1c', { moving: { ax: hard ? 110 : 70, sp: 1 + Math.random(), ph: i } }))
    else if (level !== 'easy' && r < 0.32) {
      add(box(x, y - 10, z, size + 60, 20, size, color))
      add(box(x, y + 4, z, 30, 8, size, '#ff3d00', { lava: true }))
    } else if (level !== 'easy' && r < 0.42) add(box(x, y - 10, z, size, 20, size, '#2bd96b', { bounce: 900 }))
    else if (hard && r < 0.6) add(box(x, y - 10, z, size, 20, size, '#e0e0ff', { vanish: true }))
    else add(box(x, y - 10, z, size, 20, size, color))
  }
  z -= 150
  add(box(ox, y - 15, z, 180, 30, 180, '#ffd700', { finish: level }))
  if (level === 'medium') {
    // A sneaky bounce pad next to the start launches you halfway through.
    add(box(ox - 190, -10, -60, 60, 20, 60, '#2bd96b', { bounce: 1500, secretRoute: true, aim: [0, -500] }))
  }
  if (level === 'hard') {
    add(box(ox, y - 15, z - 260, 90, 30, 90, '#8a2be2', { secret: 'ending' }))
    add(box(ox + 400, -300, -700, 120, 30, 120, '#555577', { secret: 'forgotten' }))
  }
  if (level === 'easy') add(box(ox + 200, -140, -300, 90, 20, 90, '#b8f2e6', { secret: 'hidden' }))
  return { out, finishY: y }
}

function buildWorld() {
  const solids = []
  const zones = []
  const deco = []
  // main island (a disc) with a well in the middle-south
  solids.push({ t: 'disc', x: 0, z: 0, r: 720, top: 0, h: 80, color: '#7ed957' })
  // grass meadow (just deco + zone)
  zones.push({ key: 'grass', x: 420, y: 0, z: 330, r: 170, repeat: true })
  // the well: a ring you can fall into
  zones.push({ key: 'well', x: -120, y: -20, z: 120, r: 30, repeat: true })
  // play portal
  zones.push({ key: 'play', x: 0, y: 30, z: -380, r: 70, label: '▶ PLAY', color: '#ff4d6d' })
  // shop
  solids.push(box(-420, 50, -80, 200, 100, 120, '#ff9ecf'))
  zones.push({ key: 'shop', x: -420, y: 20, z: 20, r: 70, label: '🛒 SHOP', color: '#ffb000' })
  // trophy hall
  solids.push(box(420, 60, -90, 200, 120, 120, '#9d6bff'))
  zones.push({ key: 'trophy', x: 420, y: 20, z: 10, r: 70, label: '🏆 ACHIEVEMENTS', color: '#ffd23f' })
  // obby pads
  zones.push({ key: 'obby_easy', x: -220, y: 5, z: 420, r: 55, label: 'OBBY: EASY', color: '#2bd96b' })
  zones.push({ key: 'obby_medium', x: 0, y: 5, z: 520, r: 55, label: 'OBBY: MEDIUM', color: '#ffb000' })
  zones.push({ key: 'obby_hard', x: 220, y: 5, z: 420, r: 55, label: 'OBBY: HARD', color: '#ff4d6d' })
  // big red button
  solids.push(box(-200, 10, -260, 50, 20, 50, '#555'))
  zones.push({ key: 'redbutton', x: -200, y: 25, z: -260, r: 26, label: "DON'T PRESS", color: '#ff2d2d', repeat: true })
  // bounce pads
  for (const [x, z] of [[200, 150], [-300, 300], [560, -250]]) {
    solids.push(box(x, 5, z, 70, 10, 70, '#2bd96b', { bounce: 1150 }))
  }
  // tower with a spiral of steps
  // hollow tower: four walls, with a low doorway on the south side
  solids.push(box(560, 200, -472, 110, 400, 8, '#4cc9f0'))
  solids.push(box(508, 200, -420, 8, 400, 110, '#4cc9f0'))
  solids.push(box(612, 200, -420, 8, 400, 110, '#4cc9f0'))
  solids.push(box(520, 200, -368, 30, 400, 8, '#4cc9f0'))
  solids.push(box(600, 200, -368, 30, 400, 8, '#4cc9f0'))
  solids.push(box(560, 250, -368, 50, 300, 8, '#4cc9f0'))
  solids.push(box(560, 405, -420, 140, 10, 140, '#ffe45e', { roof: true }))
  for (let i = 0; i < 16; i++) {
    const a = i * 0.75
    solids.push(box(560 + Math.cos(a) * 110, 20 + i * 25, -420 + Math.sin(a) * 110, 60, 12, 60, ['#ff5d8f', '#ffb13b', '#5ee07a', '#9d6bff'][i % 4]))
  }
  zones.push({ key: 'secret_button', x: 590, y: 425, z: -445, r: 18 })
  // a hollow room inside the tower you can reach through a low gap
  zones.push({ key: 'secret_room2', x: 560, y: 20, z: -420, r: 50 })
  // tall tree near the meadow
  solids.push({ t: 'disc', x: 560, z: 420, r: 20, top: 260, h: 260, color: '#8b5a2b' })
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1
    solids.push(box(560 + Math.cos(a) * 60, 50 + i * 40, 420 + Math.sin(a) * 60, 50, 10, 50, '#43aa8b'))
  }
  solids.push({ t: 'disc', x: 560, z: 420, r: 110, top: 290, h: 40, color: '#2e9e4a' })
  zones.push({ key: 'secret_tree', x: 560, y: 300, z: 420, r: 60 })
  zones.push({ key: 'secret_button2', x: 600, y: 300, z: 470, r: 20 })
  // floating things above/around
  solids.push(box(0, 620, 150, 100, 20, 100, '#ffffff', { cloud: true }))
  zones.push({ key: 'secret_above', x: 0, y: 640, z: 150, r: 60 })
  solids.push(box(-560, 360, 520, 160, 30, 110, '#ffffff', { cloud: true }))
  zones.push({ key: 'secret_cloud', x: -560, y: 380, z: 520, r: 80 })
  zones.push({ key: 'secret_npc2', x: -600, y: 380, z: 520, r: 30, npc: 'tiny' })
  solids.push(box(-300, 5, 300, 70, 10, 70, '#2bd96b', { bounce: 1300 }))
  // under the island: a hidden ledge
  solids.push(box(620, -170, 380, 120, 20, 120, '#8b5a2b'))
  zones.push({ key: 'secret_under', x: 620, y: -150, z: 380, r: 60 })
  zones.push({ key: 'lowPlatform', x: 620, y: -150, z: 380, r: 60 })
  solids.push(box(680, -170, 480, 60, 20, 60, '#2bd96b', { bounce: 1500, bottom: true }))
  // behind the shop: a gap in the wall and Old Quackers
  solids.push(box(-420, 40, -210, 240, 80, 20, '#e0a96d'))
  zones.push({ key: 'secret_wall', x: -420, y: 10, z: -180, r: 40 })
  zones.push({ key: 'secret_npc', x: 420, y: 10, z: -190, r: 40, npc: 'old' })
  // secret platform off the north edge, hidden path west, mystery place east
  solids.push(box(0, -10, -800, 80, 20, 80, '#ffd23f'))
  zones.push({ key: 'secret_platform', x: 0, y: 10, z: -800, r: 45 })
  for (let i = 0; i < 6; i++) solids.push(box(-760 - i * 90, -10, -100, 60, 20, 60, '#ffffff', { invisible: true }))
  zones.push({ key: 'secret_path', x: -1030, y: 10, z: -100, r: 45 })
  solids.push(box(-1130, -10, -100, 140, 20, 140, '#b8f2e6'))
  zones.push({ key: 'secret_oob', x: -1130, y: 10, z: -100, r: 60 })
  solids.push(box(980, -10, 60, 160, 20, 160, '#c8b6ff'))
  for (let i = 0; i < 3; i++) solids.push(box(780 + i * 70, -10 - i * 10, 60, 50, 20, 50, '#c8b6ff'))
  zones.push({ key: 'secret_place', x: 980, y: 10, z: 60, r: 70 })
  // mystery door, switch, message, corner
  solids.push(box(-700, 50, 0, 10, 100, 60, '#6a4c93'))
  zones.push({ key: 'secret_door2', x: -690, y: 20, z: 0, r: 35 })
  zones.push({ key: 'secret_switch', x: 0, y: 20, z: -470, r: 30 })
  zones.push({ key: 'secret_message', x: 470, y: 20, z: 560, r: 40, sign: 'The duck is watching. 🦆' })
  zones.push({ key: 'hubCorner', x: -480, y: 20, z: 520, r: 45 })
  zones.push({ key: 'secret_door', x: 300, y: 20, z: -300, r: 30, repeat: true })
  zones.push({ key: 'circus', x: -440, y: 10, z: 360, r: 60, label: '🎪 CIRCUS', color: '#ff4d6d' })
  // a pizzeria security office (open to the west)
  solids.push(box(682, 36, 100, 8, 72, 118, '#3b3b4f'))
  solids.push(box(642, 36, 44, 88, 72, 8, '#3b3b4f'))
  solids.push(box(642, 36, 156, 88, 72, 8, '#3b3b4f'))
  solids.push(box(640, 76, 100, 96, 8, 124, '#2a2a38'))
  solids.push(box(660, 12, 100, 30, 24, 60, '#6d4c41'))
  zones.push({ key: 'office', x: 628, y: 10, z: 100, r: 36, label: '🔦 OFFICE', color: '#ffd23f' })
  zones.push({ key: 'honk', x: 640, y: 10, z: 22, r: 22 })
  solids.push(box(560, 8, 230, 26, 16, 26, '#8e24aa'))
  zones.push({ key: 'musicbox', x: 560, y: 16, z: 230, r: 40, label: '🎁', color: '#ff80ab' })
  // a little hut whose only entrance is at the back
  solids.push(box(-600, 40, -330, 120, 80, 8, '#f9c74f'))
  solids.push(box(-660, 40, -280, 8, 80, 100, '#f9c74f'))
  solids.push(box(-540, 40, -280, 8, 80, 100, '#f9c74f'))
  solids.push(box(-630, 40, -230, 60, 80, 8, '#f9c74f'))
  solids.push(box(-600, 84, -280, 128, 8, 108, '#f3722c'))
  zones.push({ key: 'secret_room', x: -600, y: 10, z: -280, r: 35 })
  // easter eggs
  solids.push({ t: 'disc', x: -380, z: 190, r: 34, top: 55, h: 55, color: '#2bbf3a', pipe: true })
  solids.push(box(-60, 150, -140, 40, 40, 40, '#ffb300', { qblock: true }))
  zones.push({ key: 'vent', x: 320, y: 5, z: 420, r: 26 })
  solids.push(box(470, 25, 530, 40, 50, 40, '#4caf50', { creeper: true }))
  zones.push({ key: 'creeper', x: 470, y: 10, z: 530, r: 55, repeat: true })
  zones.push({ key: 'cake', x: -140, y: -1990, z: -120, r: 50, sign: '🎂 The cake is a lie.' })
  // more easter eggs: golden duck in the tower, wishing fountain, sword in the stone, diamonds
  zones.push({ key: 'goldduck', x: 560, y: 10, z: -440, r: 30 })
  zones.push({ key: 'wish', x: 180, y: 30, z: -120, r: 70, label: '🪙 WISH (5 BB)', color: '#4cc9f0', repeat: true })
  solids.push(box(250, 12, 540, 56, 24, 56, '#9e9e9e'))
  zones.push({ key: 'sword', x: 250, y: 24, z: 540, r: 45, label: '🗡 ???', color: '#e0e0e0', repeat: true })
  solids.push(box(0, -160, -900, 110, 20, 110, '#607d8b'))
  zones.push({ key: 'diamond', x: 0, y: -150, z: -900, r: 60 })
  // dev room far below (reached through the well)
  solids.push(box(0, -2020, 0, 400, 40, 400, '#222233'))
  solids.push(box(0, -1960, -150, 80, 60, 30, '#111111'))
  zones.push({ key: 'secret_dev', x: 0, y: -1990, z: 0, r: 150 })
  zones.push({ key: 'devpc', x: 0, y: -1980, z: -120, r: 50 })
  zones.push({ key: 'devexit', x: 150, y: -1990, z: 150, r: 40, label: '⬆ EXIT', color: '#4cc9f0' })
  // obby courses
  for (const level of ['easy', 'medium', 'hard']) {
    const { out } = obbyCourse(level)
    for (const o of out) solids.push(o)
  }
  deco.push('fountain')
  return { solids, zones }
}

// ---------------------------------------------------------------- hub state

export function createHub(renderer, profile, callbacks) {
  const scene = new THREE.Scene()
  scene.background = makeSky(false)
  addLights(scene, false)
  const clouds = makeClouds(scene, 20, -300, 3000)
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 10, 12000)
  const world = buildWorld()

  // meshes
  const movingMeshes = []
  for (const s of world.solids) {
    let m
    if (s.t === 'disc') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r * (s.h > 100 ? 1 : 0.85), s.h, 48), mat(s.color))
      m.position.set(s.x, s.top - s.h / 2, s.z)
      if (s.r > 500) {
        const dirt = new THREE.Mesh(new THREE.ConeGeometry(s.r * 0.85, 400, 32), mat('#8b5a2b'))
        dirt.rotation.x = Math.PI
        dirt.position.set(s.x, s.top - s.h - 200, s.z)
        scene.add(dirt)
      }
    } else {
      const material = s.invisible
        ? new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.06 })
        : s.lava
          ? mat('#ff3d00', 'glow')
          : s.bounce
            ? mat(s.color, 'glow')
            : s.cloud
              ? mat('#ffffff')
              : mat(s.color)
      m = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), material)
      m.position.set(s.x, s.y, s.z)
      if (s.moving) {
        s.bx = s.x
        movingMeshes.push({ s, m })
      }
    }
    m.receiveShadow = true
    m.castShadow = s.t !== 'disc' || s.r < 200
    s.mesh = m
    scene.add(m)
  }

  const qTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    g.fillStyle = '#ffb300'
    g.fillRect(0, 0, 64, 64)
    g.strokeStyle = '#8a5a00'
    g.lineWidth = 5
    g.strokeRect(3, 3, 58, 58)
    g.fillStyle = '#fff'
    g.font = 'bold 44px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('?', 32, 35)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })()
  for (const sd of world.solids) if (sd.qblock) sd.mesh.material = new THREE.MeshStandardMaterial({ map: qTex, emissive: '#553300', emissiveIntensity: 0.3 })

  // decorations: flowers, fountain, portal rings, signs
  const deco = new THREE.Group()
  scene.add(deco)
  const flowerColors = ['#ff5d8f', '#ffe45e', '#4cc9f0', '#ffffff', '#c77dff']
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(4, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.5 }), 160)
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(3, 1, 4), mat('#2fbf4a'), 260)
  const tmp = new THREE.Object3D()
  const col = new THREE.Color()
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 680
    tmp.position.set(Math.cos(a) * r, 3, Math.sin(a) * r)
    tmp.scale.setScalar(Math.hypot(tmp.position.x - 420, tmp.position.z - 330) < 170 ? 0 : 1)
    tmp.updateMatrix()
    flowers.setMatrixAt(i, tmp.matrix)
    flowers.setColorAt(i, col.set(flowerColors[i % 5]))
  }
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 165
    const h = 18 + Math.random() * 10
    tmp.position.set(420 + Math.cos(a) * r, h / 2, 330 + Math.sin(a) * r)
    tmp.scale.set(1, h, 1)
    tmp.updateMatrix()
    grass.setMatrixAt(i, tmp.matrix)
  }
  deco.add(flowers, grass)
  // fountain
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(70, 80, 30, 32), mat('#e0e0ff'))
  fountain.position.set(180, 15, -120)
  deco.add(fountain)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(62, 62, 4, 32), mat('#4cc9f0', 'glow'))
  water.position.set(180, 30, -120)
  deco.add(water)
  world.solids.push({ t: 'disc', x: 180, z: -120, r: 78, top: 30, h: 30, color: '#e0e0ff', noMesh: true })
  // the well
  const well = new THREE.Mesh(new THREE.TorusGeometry(34, 8, 10, 24), mat('#9e9e9e'))
  well.rotation.x = Math.PI / 2
  well.position.set(-120, 4, 120)
  deco.add(well)
  const hole = new THREE.Mesh(new THREE.CircleGeometry(30, 24), mat('#000000', 'basic'))
  hole.rotation.x = -Math.PI / 2
  hole.position.set(-120, 1, 120)
  deco.add(hole)
  // portal + pads
  const portal = new THREE.Mesh(new THREE.TorusGeometry(80, 12, 16, 48), mat('#ff4d6d', 'glow'))
  portal.position.set(0, 90, -420)
  deco.add(portal)
  const swirl = new THREE.Mesh(new THREE.CircleGeometry(72, 40), new THREE.MeshBasicMaterial({ color: '#ffb3d9', transparent: true, opacity: 0.6, side: THREE.DoubleSide }))
  swirl.position.set(0, 90, -420)
  deco.add(swirl)
  for (const z of world.zones) {
    if (!z.key.startsWith('obby_')) continue
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(z.r, z.r, 8, 32), mat(z.color, 'glow'))
    pad.position.set(z.x, 4, z.z)
    deco.add(pad)
  }
  // easter egg decorations
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 14, 24), mat('#1f9a2d'))
  rim.position.set(-380, 50, 190)
  deco.add(rim)
  const vent = new THREE.Mesh(new THREE.BoxGeometry(50, 3, 40), mat('#607d8b', 'metal'))
  vent.position.set(320, 1, 420)
  deco.add(vent)
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(44, 4, 3), mat('#263238'))
    bar.position.set(320, 3, 406 + i * 9)
    deco.add(bar)
  }
  for (const [x, y, w, h] of [[-9, 36, 8, 8], [9, 36, 8, 8], [0, 24, 6, 10], [-6, 18, 5, 8], [6, 18, 5, 8]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), mat('#1b1b1b'))
    f.position.set(470 + x, y, 551)
    deco.add(f)
  }
  const cake = new THREE.Group()
  const sponge = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 20, 20), mat('#6d3b1f'))
  const icing = new THREE.Mesh(new THREE.CylinderGeometry(23, 23, 5, 20), mat('#ffffff'))
  icing.position.y = 12
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 14, 8), mat('#ff5d8f'))
  candle.position.y = 20
  const flame = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), mat('#ffb300', 'glow'))
  flame.position.y = 29
  cake.add(sponge, icing, candle, flame)
  cake.position.set(-140, -1990, -120)
  scene.add(cake)
  // golden duck statue, sword in the stone, diamond ore
  const golden = buildDuck('goldenrubber', { hammer: false })
  golden.root.position.set(560, 0, -445)
  golden.root.rotation.y = Math.PI / 2
  scene.add(golden.root)
  const sword = new THREE.Group()
  const blade = new THREE.Mesh(new THREE.BoxGeometry(6, 50, 2), mat('#cfd8dc', 'metal'))
  blade.position.y = 25
  const guard = new THREE.Mesh(new THREE.BoxGeometry(22, 4, 5), mat('#ffd700', 'gold'))
  guard.position.y = 50
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 14, 8), mat('#1565c0'))
  hilt.position.y = 59
  sword.add(blade, guard, hilt)
  sword.position.set(250, 20, 540)
  deco.add(sword)
  for (const [dx, dz] of [[-25, 0], [25, 10], [0, -25]]) {
    const ore = new THREE.Group()
    const stone = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), mat('#78909c', 'pixel'))
    ore.add(stone)
    for (let i = 0; i < 5; i++) {
      const gem = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 7), mat('#4dd0e1', 'glow'))
      gem.position.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, 15.5)
      ore.add(gem)
    }
    ore.position.set(dx, -135, -900 + dz)
    scene.add(ore)
  }
  // security office: glowing camera monitor, desk fan, door buttons, a poster
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(6, 18, 26), mat('#2bd96b', 'glow'))
  monitor.position.set(655, 33, 100)
  scene.add(monitor)
  const fan = new THREE.Group()
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 3), mat('#9e9e9e', 'metal'))
    blade.rotation.x = (i * Math.PI * 2) / 3
    blade.position.y = 0
    fan.add(blade)
  }
  fan.position.set(652, 32, 78)
  scene.add(fan)
  for (const z of [51, 149]) {
    for (const [y, col] of [[40, '#e53935'], [28, '#ffffff']]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), mat(col, 'glow'))
      btn.position.set(615, y, z)
      scene.add(btn)
    }
  }
  const poster = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    g.fillStyle = '#1a1a2e'
    g.fillRect(0, 0, 128, 128)
    g.fillStyle = '#8d5a2b'
    for (const x of [34, 94]) {
      g.beginPath()
      g.arc(x, 34, 16, 0, Math.PI * 2)
      g.fill()
    }
    g.beginPath()
    g.arc(64, 70, 42, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#e8c08a'
    g.beginPath()
    g.ellipse(64, 86, 22, 16, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#111'
    for (const x of [48, 80]) {
      g.beginPath()
      g.arc(x, 62, 6, 0, Math.PI * 2)
      g.fill()
    }
    g.beginPath()
    g.ellipse(64, 80, 8, 6, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#ffd23f'
    g.font = 'bold 14px sans-serif'
    g.textAlign = 'center'
    g.fillText('CELEBRATE!', 64, 122)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: t }))
    m.position.set(640, 38, 39)
    m.rotation.y = Math.PI
    return m
  })()
  scene.add(poster)
  const goldBear = buildDuck('itsme', { hammer: false })
  goldBear.root.position.set(665, 0, 128)
  goldBear.root.rotation.set(0, Math.PI, 0.5)
  goldBear.root.visible = false
  scene.add(goldBear.root)
  // music box with a crank
  const crank = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 14), mat('#ffd700', 'gold'))
  crank.position.set(560, 18, 245)
  scene.add(crank)

  // a circus tent (and the door marked EXIT that leads nowhere)
  const stripes = (() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 8
    const g = c.getContext('2d')
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? '#ffffff' : '#e53935'
      g.fillRect(i * 8, 0, 8, 8)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })()
  const tentMat = new THREE.MeshStandardMaterial({ map: stripes })
  const tentWall = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 60, 16, 1, true), tentMat)
  tentWall.material.side = THREE.DoubleSide
  tentWall.position.set(-440, 30, 360)
  const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(82, 70, 16), tentMat)
  tentRoof.position.set(-440, 95, 360)
  const flag = new THREE.Mesh(new THREE.ConeGeometry(6, 18, 4), mat('#1e63d6'))
  flag.position.set(-440, 140, 360)
  deco.add(tentWall, tentRoof, flag)
  const exitSign = (() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 48
    const g = c.getContext('2d')
    g.fillStyle = '#1b5e20'
    g.fillRect(0, 0, 128, 48)
    g.fillStyle = '#ffffff'
    g.font = 'bold 34px sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('EXIT', 64, 26)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 15), new THREE.MeshBasicMaterial({ map: t }))
    m.position.set(300, 80, -326)
    return m
  })()
  deco.add(exitSign)
  // a door that leads nowhere
  const door = new THREE.Mesh(new THREE.BoxGeometry(40, 70, 6), mat('#6a4c93'))
  door.position.set(300, 35, -330)
  deco.add(door)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 6), mat('#ffd700', 'gold'))
  knob.position.set(312, 35, -326)
  deco.add(knob)
  // red button
  const redBtn = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 10, 24), mat('#ff2d2d', 'glow'))
  redBtn.position.set(-200, 25, -260)
  deco.add(redBtn)
  // shop awning + trophy
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 60), mat(i % 2 ? '#ffffff' : '#ff4d6d'))
    s.position.set(-510 + i * 26, 110, -10)
    s.rotation.x = 0.4
    deco.add(s)
  }
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(40, 18, 70, 20), mat('#ffd700', 'gold'))
  cup.position.set(420, 165, -90)
  deco.add(cup)
  // NPC ducks
  const oldQ = buildDuck('wizard', { hammer: false })
  oldQ.root.position.set(420, 0, -190)
  oldQ.root.rotation.y = Math.PI / 2
  scene.add(oldQ.root)
  const tinyQ = buildDuck('chef', { hammer: false })
  tinyQ.root.scale.setScalar(0.5)
  tinyQ.root.position.set(-600, 345, 520)
  scene.add(tinyQ.root)
  // dev computer
  const screen = new THREE.Mesh(new THREE.BoxGeometry(70, 45, 4), mat('#00ff66', 'glow'))
  screen.position.set(0, -1920, -134)
  scene.add(screen)
  // Other "players" hanging out in the hub, Roblox style.
  const CHAT = [
    'hi', 'gg', 'anyone wanna play?', 'BONK!', 'how do u get to the secret room', 'i found a secret!!',
    'quack', 'lol', 'this game is so fun', 'who wants to race the hard obby', 'nice costume', 'brb',
    'the giant duck scared me', 'i have 3 balloons left lol', 'follow me', 'jump on the green pad!!',
    'im buying the dragon costume', 'wait for me', 'omg', 'i got bonked so far', 'lets gooo', 'ez',
    'oof', 'gg ez', 'i am speed', 'the cake is a lie', 'creeper? aw man', 'that duck is kinda sus',
    'do a barrel roll!', 'git gud', '1v1 me bro', 'its over 9000!!', 'hello there', 'press F to pay respects',
    'all your bonk are belong to us', 'its-a me, duckio', 'the ? block gives free BB', 'try the green pipe',
    'up up down down left right left right B A', 'noob', 'not the bees!', 'hmm yes the floor here is made of floor',
    'did anyone else see herobrine??', 'was that a golden bear in the office??', 'its me', 'boop the poster nose lol',
    'wind up the music box!!', 'i survived until 6 AM!', 'night 5 is so hard', 'has anyone found the exit?', 'THERE IS NO EXIT', 'the circus tent is so cool',
    'i think the ringmaster duck is watching us', 'is this place digital??', 'welcome to the amazing digital circus!', 'the fountain told me my fortune', 'theres a sword stuck in a rock lol',
    'i heard theres diamonds somewhere', 'type BOO near the well', 'the golden duck in the tower is so shiny',
  ]
  const SPOTS = [[0, 200], [-150, 300], [150, 300], [0, 380], [-220, 420], [220, 420], [0, -250], [-100, -150], [60, 60], [-250, 150], [280, 250], [200, 150]]
  const wanderers = []
  const costumeKeys = Object.keys(COSTUMES).filter((k) => COSTUMES[k].price !== null && COSTUMES[k].price < 6000)
  const names = [...DUCK_NAMES].sort(() => Math.random() - 0.5)
  function addBot(i, announce) {
    const d = buildDuck(costumeKeys[Math.floor(Math.random() * costumeKeys.length)], { hammer: false })
    const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
    setBalloons(d, 1, color)
    scene.add(d.root)
    const [x, z] = SPOTS[Math.floor(Math.random() * SPOTS.length)]
    const bot = { d, name: names[i % names.length], color, x: x + Math.random() * 60, y: 0, z: z + Math.random() * 60, vy: 0, tx: x, tz: z, t: 0, walk: 0, chat: null, chatT: 3 + Math.random() * 10, emote: null, emoteT: 0, life: 60 + Math.random() * 120 }
    wanderers.push(bot)
    if (announce) callbacks.chat({ system: true, text: `🦆 ${bot.name} joined the game` })
    return bot
  }
  for (let i = 0; i < 8; i++) addBot(i, false)
  let nextBot = 8

  // player
  let duck = buildDuck(profile.costume, { hammer: false })
  scene.add(duck.root)
  let pet = profile.pet ? buildPet(profile.pet) : null
  if (pet) scene.add(pet)
  const P = { x: 0, y: 0, z: 200, vx: 0, vy: 0, vz: 0, facing: -Math.PI / 2, grounded: true, airJumps: 0, walk: 0, emote: null, emoteT: 0, flipT: 0, standOn: null, spawn: [0, 5, 200], obby: null, obbyT: 0, obbyFalls: 0, idle: 0, grassIdle: 0, wallT: 0, flight: null, lastZone: new Set(), typed: '' }

  const hub = { scene, camera, P, world, dist: 640 }

  hub.setCostume = (key, petKey) => {
    scene.remove(duck.root)
    duck = buildDuck(key, { hammer: false })
    scene.add(duck.root)
    if (pet) scene.remove(pet)
    pet = petKey ? buildPet(petKey) : null
    if (pet) scene.add(pet)
  }

  hub.resize = (w, h) => {
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  function teleport(x, y, z) {
    P.x = x
    P.y = y
    P.z = z
    P.vx = P.vy = P.vz = 0
  }

  function respawn() {
    const [x, y, z] = P.spawn
    teleport(x, y + 20, z)
  }

  function standTop(s, x, z) {
    if (s.t === 'disc') return Math.hypot(x - s.x, z - s.z) < s.r + R * 0.5 ? s.top : null
    if (Math.abs(x - s.x) < s.w / 2 + R * 0.5 && Math.abs(z - s.z) < s.d / 2 + R * 0.5) return s.y + s.h / 2
    return null
  }

  function overlaps(s, x, y, z) {
    if (s.vanished) return false
    if (s.t === 'disc') {
      if (y >= s.top - 0.5 || y + HEIGHT <= s.top - s.h) return false
      // The well is a hole in the island.
      if (s.r > 500 && Math.hypot(x + 120, z - 120) < 28) return false
      return Math.hypot(x - s.x, z - s.z) < s.r + R
    }
    return Math.abs(x - s.x) < s.w / 2 + R && Math.abs(z - s.z) < s.d / 2 + R && y < s.y + s.h / 2 - 0.5 && y + HEIGHT > s.y - s.h / 2
  }

  function pushOut(s, axis, prev) {
    if (s.t === 'disc') {
      const dx = P.x - s.x
      const dz = P.z - s.z
      const d = Math.hypot(dx, dz) || 1
      P.x = s.x + (dx / d) * (s.r + R)
      P.z = s.z + (dz / d) * (s.r + R)
      return
    }
    if (axis === 'x') P.x = prev < s.x ? s.x - s.w / 2 - R : s.x + s.w / 2 + R
    else P.z = prev < s.z ? s.z - s.d / 2 - R : s.z + s.d / 2 + R
  }

  let bumpCd = 0
  hub.step = (dt, keys, stick) => {
    const s = SCHEMES.solo
    const held = (l) => l.some((k) => keys.down.has(k))
    const tapped = (l) => l.some((k) => keys.pressed.has(k))
    let mx = (held(s.right) ? 1 : 0) - (held(s.left) ? 1 : 0)
    let mz = (held(s.down) ? 1 : 0) - (held(s.up) ? 1 : 0)
    if (stick && (stick.x || stick.y)) {
      mx = stick.x
      mz = stick.y
    }
    if (keys.pressed.has('KeyE') || keys.pressed.has('KeyI')) interact()
    const len = Math.min(1, Math.hypot(mx, mz))
    if (len) {
      const l = Math.hypot(mx, mz)
      mx = (mx / l) * len
      mz = (mz / l) * len
    }
    const t = performance.now() / 1000

    // moving/vanishing platforms
    for (const { s: m, m: mesh } of movingMeshes) {
      const nx = m.bx + Math.sin(t * m.moving.sp + m.moving.ph) * m.moving.ax
      m.dx = nx - m.x
      m.x = nx
      mesh.position.x = nx
    }
    for (const sd of world.solids) {
      if (!sd.vanish) continue
      if (sd.vanishT !== undefined) {
        sd.vanishT -= dt
        if (sd.vanishT < -2) {
          sd.vanishT = undefined
          sd.vanished = false
        } else if (sd.vanishT < 0) sd.vanished = true
        sd.mesh.visible = !sd.vanished
        sd.mesh.material.opacity = 1
      }
    }

    const speed = 270
    const f = 1 - Math.exp(-(P.grounded ? 12 : 3) * dt)
    P.vx += (mx * speed - P.vx) * f
    P.vz += (mz * speed - P.vz) * f
    if (len) {
      P.facing = Math.atan2(mz, mx)
      P.walk += dt * 14
      P.emote = null
      callbacks.stat('hubDistance', Math.hypot(P.vx, P.vz) * dt)
      P.idle = 0
    } else P.idle += dt
    callbacks.max('best_idle', P.idle)
    if (P.idle > 0) callbacks.stat('idle', dt)

    if (tapped(s.jump)) {
      if (P.grounded) {
        P.vy = 500
        P.grounded = false
        P.airJumps = 1
        sfx.jump()
        callbacks.stat('jumps', 1)
        callbacks.stat('hubJumps', 1)
        P.emote = null
      } else if (P.airJumps < 2) {
        P.vy = 440
        P.airJumps += 1
        sfx.flap()
        callbacks.stat('flaps', 1)
      }
    }
    if (tapped(s.dash)) {
      P.vx = Math.cos(P.facing) * 600
      P.vz = Math.sin(P.facing) * 600
      sfx.dash()
      callbacks.stat('dashes', 1)
      callbacks.stat('hubDashes', 1)
      if (!P.grounded) {
        P.flipT = 0.5
        callbacks.stat('airDashes', 1)
      }
    }
    P.flipT = Math.max(0, P.flipT - dt)
    if (P.emote) {
      P.emoteT -= dt
      if (P.emoteT <= 0) P.emote = null
    }

    // gravity & integrate per axis
    P.vy -= G * dt
    if (P.standOn && P.standOn.moving && P.grounded) P.x += P.standOn.dx || 0
    const prevX = P.x
    P.x += P.vx * dt
    let bumped = false
    for (const sd of world.solids) if (overlaps(sd, P.x, P.y, P.z)) {
      pushOut(sd, 'x', prevX)
      bumped = true
    }
    const prevZ = P.z
    P.z += P.vz * dt
    for (const sd of world.solids) if (overlaps(sd, P.x, P.y, P.z)) {
      pushOut(sd, 'z', prevZ)
      bumped = true
    }
    bumpCd -= dt
    if (bumped && len && bumpCd <= 0) {
      bumpCd = 0.6
      callbacks.stat('wallBumps', 1)
    }
    P.wallT = bumped && !len ? P.wallT + dt : bumped ? P.wallT : 0
    if (P.wallT > 10) {
      P.wallT = -999
      callbacks.stat('wallIdle', 1)
    }

    const wasGrounded = P.grounded
    P.y += P.vy * dt
    P.grounded = false
    P.standOn = null
    for (const sd of world.solids) {
      if (sd.vanished || sd.invisible === 'never') continue
      const top = standTop(sd, P.x, P.z)
      if (top === null) continue
      if (sd.t === 'disc' && sd.r > 500 && Math.hypot(P.x + 120, P.z - 120) < 28) continue
      if (P.vy <= 0 && P.y <= top && P.y > top - 30) {
        P.y = top
        P.vy = 0
        P.grounded = true
        P.standOn = sd
      } else if (P.vy > 0 && sd.t !== 'disc' && P.y + HEIGHT > sd.y - sd.h / 2 && P.y < sd.y - sd.h / 2 + 10) {
        P.vy = 0
        if (sd.qblock) hitQBlock(sd)
      }
    }

    // flight tracking
    if (!P.grounded) {
      if (!P.flight) P.flight = { t: 0, peak: P.y, start: P.y }
      P.flight.t += dt
      P.flight.peak = Math.max(P.flight.peak, P.y)
    }
    if (P.grounded && !wasGrounded) {
      P.airJumps = 0
      if (P.flight) {
        callbacks.max('best_height', P.flight.peak - P.flight.start)
        callbacks.max('best_air', P.flight.t)
        callbacks.stat('landings', 1)
        if (P.flipT > 0 || P.flight.trick) callbacks.stat('styleLandings', 1)
      }
      P.flight = null
      const sd = P.standOn
      if (sd.pipe) {
        sfx.pickup()
        callbacks.toast('🍄 Warp pipe! Wheee!')
        teleport(560, 430, -420)
        return
      }
      if (sd.roof) {
        callbacks.stat('roofTop', 1)
        P.onRoof = true
      }
      if (sd.lava) {
        sfx.fall()
        respawn()
      }
      if (sd.vanish && sd.vanishT === undefined) sd.vanishT = 0.6
      if (sd.checkpoint && P.spawn.id !== sd.checkpoint) {
        P.spawn = [sd.x, sd.y + sd.h / 2, sd.z]
        P.spawn.id = sd.checkpoint
        callbacks.stat('checkpoints', 1)
        callbacks.toast('🚩 Checkpoint!')
        sfx.pickup()
      }
      if (sd.finish && P.obby === sd.finish) finishObby(sd.finish)
      if (sd.secret) callbacks.secret(sd.secret)
    }
    if (P.grounded && P.standOn && P.standOn.bounce) {
      P.vy = P.standOn.bounce
      P.grounded = false
      sfx.boing()
      callbacks.stat('bounces', 1)
      callbacks.stat('hubBounces', 1)
      callbacks.stat('rockets', 1)
      if (P.standOn.bottom) callbacks.stat('bottomBounce', 1)
      if (P.standOn.secretRoute) {
        P.vz = -520
        callbacks.secret('route')
      }
    }
    if (P.grounded && P.standOn && !P.standOn.roof) P.onRoof = false

    // fell off the world?
    const floorY = P.obby ? -700 : -2600
    if (P.y < floorY) {
      if (P.obby) {
        P.obbyFalls += 1
        respawn()
      } else {
        callbacks.stat('hubFalls', 1)
        teleport(0, 20, 200)
      }
      sfx.fall()
    }

    // zones
    const inside = new Set()
    for (const z of world.zones) {
      if (Math.hypot(P.x - z.x, P.z - z.z) < z.r && Math.abs(P.y - z.y) < 70) inside.add(z.key)
    }
    for (const key of inside) {
      if (P.lastZone.has(key)) continue
      onZone(key)
    }
    P.lastZone = inside
    if (inside.has('grass')) {
      callbacks.stat('grass', dt)
      P.grassIdle = len ? 0 : P.grassIdle + dt
      callbacks.max('best_grassIdle', P.grassIdle)
    }
    if (P.obby) P.obbyT += dt
    // Surviving the night: stay in the security office for 6 "hours".
    if (inside.has('office')) {
      const before = Math.floor(P.officeT || 0)
      P.officeT = (P.officeT || 0) + dt
      const hour = Math.floor(P.officeT)
      if (hour !== before && hour >= 1 && hour < 6) sfx.count()
      if (P.officeT >= 6 && !P.officeDone) {
        P.officeDone = true
        sfx.chime()
        callbacks.stat('egg_office', 1)
        callbacks.toast('🕕 6 AM! You survived the night! 🎉')
      }
    }

    // bot players
    for (const wd of [...wanderers]) {
      wd.t -= dt
      wd.life -= dt
      if (wd.life <= 0) {
        callbacks.chat({ system: true, text: `👋 ${wd.name} left the game` })
        scene.remove(wd.d.root)
        wanderers.splice(wanderers.indexOf(wd), 1)
        addBot(nextBot++, true)
        continue
      }
      if (wd.t <= 0) {
        wd.t = 2 + Math.random() * 4
        const r = Math.random()
        if (r < 0.2) {
          // come say hi to the real player
          wd.tx = P.x + (Math.random() - 0.5) * 80
          wd.tz = P.z + 60
        } else {
          const [x, z] = SPOTS[Math.floor(Math.random() * SPOTS.length)]
          wd.tx = x + (Math.random() - 0.5) * 60
          wd.tz = z + (Math.random() - 0.5) * 60
        }
        if (Math.random() < 0.25) {
          wd.emote = ['spin', 'wave', 'flip', 'quack'][Math.floor(Math.random() * 4)]
          wd.emoteT = 1.2
        }
      }
      const dx = wd.tx - wd.x
      const dz = wd.tz - wd.z
      const d = Math.hypot(dx, dz)
      if (d > 10 && wd.emoteT <= 0) {
        wd.x += (dx / d) * 150 * dt
        wd.z += (dz / d) * 150 * dt
        wd.walk += dt * 12
        wd.d.root.rotation.y = -Math.atan2(dz, dx)
      }
      // keep out of the fountain and the well
      for (const [ox, oz, orr] of [[180, -120, 90], [-120, 120, 45]]) {
        const ex = wd.x - ox
        const ez = wd.z - oz
        const ed = Math.hypot(ex, ez)
        if (ed < orr) {
          wd.x = ox + (ex / (ed || 1)) * orr
          wd.z = oz + (ez / (ed || 1)) * orr
        }
      }
      // hopping, and bounce pads send them flying
      if (wd.y <= 0 && Math.random() < 0.006) wd.vy = 480
      if (wd.y <= 0 && Math.hypot(wd.x - 200, wd.z - 150) < 35) wd.vy = 1150
      wd.vy -= G * dt
      wd.y = Math.max(0, wd.y + wd.vy * dt)
      if (wd.y === 0) wd.vy = Math.max(0, wd.vy)
      wd.emoteT -= dt
      if (wd.emoteT <= 0) wd.emote = null
      wd.chatT -= dt
      if (wd.chatT <= 0) {
        wd.chatT = 8 + Math.random() * 14
        wd.chat = { text: CHAT[Math.floor(Math.random() * CHAT.length)], t: 4 }
        callbacks.chat({ name: wd.name, color: wd.color, text: wd.chat.text })
      }
      if (wd.chat) {
        wd.chat.t -= dt
        if (wd.chat.t <= 0) wd.chat = null
      }
      wd.d.root.position.set(wd.x, wd.y, wd.z)
      poseDuck(wd.d, { walk: wd.walk, swing: 0, spin: 0, flip: wd.emote === 'flip' ? 1 - wd.emoteT / 1.2 : 0, emote: wd.emote, t: t + wd.x, air: wd.y > 5 })
    }
  }

  // Interact: open whatever menu you're standing near, otherwise quack.
  function interact() {
    let best = null
    let bestD = Infinity
    for (const z of world.zones) {
      if (!z.label) continue
      const d = Math.hypot(P.x - z.x, P.z - z.z)
      if (d < z.r + 90 && Math.abs(P.y - z.y) < 120 && d < bestD) {
        best = z
        bestD = d
      }
    }
    if (best) onZone(best.key)
    else {
      sfx.quack()
      callbacks.stat('quacks', 1)
      hub.emote('wave')
    }
  }

  let qCd = 0
  function hitQBlock(sd) {
    if (performance.now() < qCd) return
    qCd = performance.now() + 4000
    sfx.coin()
    sd.mesh.position.y = sd.y + 10
    setTimeout(() => (sd.mesh.position.y = sd.y), 150)
    callbacks.reward(10, '🪙 +10 BB from the ? block!')
  }

  function onZone(key) {
    const z = world.zones.find((q) => q.key === key)
    if (key === 'vent') {
      callbacks.stat('egg_vent', 1)
      const [x, zz] = [[-150, 300], [0, -250], [250, 250], [-250, 100]][Math.floor(Math.random() * 4)]
      teleport(x, 20, zz)
      callbacks.toast('🚨 You vented! Kinda sus...')
      callbacks.chat({ name: 'duckdash_pro', color: '#ff4d6d', text: 'i saw that duck vent. SUS' })
      return
    }
    if (key === 'creeper') {
      callbacks.toast('💚 sssssssss...')
      setTimeout(() => {
        if (Math.hypot(P.x - 470, P.z - 530) < 90) {
          sfx.mega()
          callbacks.stat('egg_creeper', 1)
          P.vy = 950
          P.vx = -300
          callbacks.toast('💥 Aww man!')
        }
      }, 1500)
      return
    }
    if (key === 'cake') {
      callbacks.stat('egg_cake', 1)
      return callbacks.toast(['🎂 The cake is a lie.', '🍰 Om nom nom!', '🎂 ...it was real all along?!'][Math.floor(Math.random() * 3)])
    }
    if (key === 'goldduck') {
      sfx.bigQuack()
      callbacks.stat('egg_goldduck', 1)
      return callbacks.toast('✨ The golden duck quacks back at you!')
    }
    if (key === 'wish') {
      if (!callbacks.reward(-5, null)) return callbacks.toast('🪙 You need 5 BB to make a wish.')
      callbacks.stat('egg_wish', 1)
      sfx.coin()
      if (Math.random() < 0.03) return callbacks.reward(250, '🌟 JACKPOT! The fountain gives you 250 BB!')
      const F = ['You will be bonked very soon.', 'A duck in a hat will betray you.', 'Beware the giant rubber duck.', 'Your next balloon is lucky.', 'Jump. Hit. Don’t fall.', 'Someone is watching from the cloud…', 'The pipe knows the way up.', 'Wish granted: nothing happens.', 'Try typing BOO.', 'You will find diamonds far to the north… and down.']
      return callbacks.toast(`🔮 ${F[Math.floor(Math.random() * F.length)]}`)
    }
    if (key === 'sword') {
      if (callbacks.wins() >= 5) {
        callbacks.stat('egg_sword', 1)
        sfx.win()
        sword.visible = false
        return callbacks.toast('🗡 You pulled the sword from the stone! A true hero!')
      }
      return callbacks.toast(`🗡 It won't budge... (win ${5 - callbacks.wins()} more matches)`)
    }
    if (key === 'diamond') {
      callbacks.stat('egg_diamond', 1)
      if (!callbacks.once('diamond')) callbacks.reward(50, '💎 DIAMONDS! +50 BB')
      else callbacks.toast('💎 Still diamonds.')
      return
    }
    if (key === 'play' || key === 'shop' || key === 'trophy') return callbacks.open(key)
    if (key.startsWith('obby_')) return startObby(key.slice(5))
    if (key === 'redbutton') {
      callbacks.stat('redButton', 1)
      callbacks.toast(['You pressed it.', 'Why?!', 'STOP PRESSING IT', 'Okay one more.', '...'][Math.floor(Math.random() * 5)])
      sfx.bigQuack()
      P.vy = 700
      return
    }
    if (key === 'well') {
      callbacks.stat('wellDives', 1)
      if (P.flight && P.flight.peak > 250) callbacks.stat('secret_forbidden', 1)
      teleport(0, -1980, 0)
      callbacks.toast('...where am I?')
      return
    }
    if (key === 'devexit') return teleport(0, 20, 200)
    if (key === 'devpc') {
      callbacks.stat('secret_devpc', 1)
      callbacks.devpc()
      return
    }
    if (key === 'lowPlatform' || key === 'hubCorner') return callbacks.stat(key, 1)
    if (key === 'secret_door') {
      callbacks.stat('egg_exit', 1)
      callbacks.toast(['🚪 EXIT? ...It is just a door. There is no exit.', '🚪 Still no exit.', '🎩 "Leaving so soon? The show is just getting started!"', '🚪 The door is painted on. Of course it is.'][Math.floor(Math.random() * 4)])
    }
    if (key === 'office') {
      P.officeT = 0
      P.officeDone = false
      P.night = (P.night || 0) + 1
      callbacks.toast(`🔦 Night ${P.night} has begun. It's 12 AM… stay in the office until 6 AM!`)
      if (Math.random() < 0.12) {
        goldBear.root.visible = true
        sfx.spooky()
        callbacks.stat('egg_golden', 1)
        callbacks.toast('💛 IT’S ME')
        setTimeout(() => (goldBear.root.visible = false), 1800)
      }
      return
    }
    if (key === 'honk') {
      sfx.honk()
      callbacks.stat('egg_honk', 1)
      return callbacks.toast('👃 *honk*')
    }
    if (key === 'musicbox') {
      sfx.musicBox()
      return callbacks.toast('🎵 The music box is playing… don’t let it wind down.')
    }
    if (key === 'circus') {
      sfx.win()
      return callbacks.toast('🎪 Welcome to the Amazing Digital Duck Circus! Don’t look for the exit…')
    }
    if (key.startsWith('secret_')) {
      callbacks.secret(key.slice(7))
      if (z && z.sign) callbacks.toast(`📜 "${z.sign}"`)
      if (z && z.npc === 'old') callbacks.toast('🧙 Old Quackers: "Try jumping into the well from very high up..."')
      if (z && z.npc === 'tiny') callbacks.toast('👨‍🍳 Tiny Quackers: "Psst! There’s a hidden path west of the island."')
    }
  }

  function startObby(level) {
    const start = world.solids.find((s) => s.start === level)
    P.obby = level
    P.obbyT = 0
    P.obbyFalls = 0
    P.spawn = [start.x, start.y + start.h / 2, start.z]
    respawn()
    callbacks.toast(`🏃 ${level.toUpperCase()} OBBY! Reach the golden platform.`)
  }

  function finishObby(level) {
    callbacks.obbyDone(level, REWARD[level], P.obbyT, P.obbyFalls)
    P.obby = null
    P.spawn = [0, 5, 200]
    setTimeout(() => teleport(0, 20, 200), 1200)
  }

  hub.leaveObby = () => {
    P.obby = null
    P.spawn = [0, 5, 200]
    teleport(0, 20, 200)
  }

  hub.emote = (key) => {
    P.emote = key
    P.emoteT = key === 'flop' ? 2 : 1
    if (key === 'spin') callbacks.stat('hubSpins', 1)
    if (key === 'flip') P.flipT = 0.6
    if (!P.grounded) {
      callbacks.stat('airEmotes', 1)
      if (key === 'spin') callbacks.stat('airSpins', 1)
      if (P.flight) P.flight.trick = true
    }
  }

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']
  let codes = []
  hub.typeKey = (code) => {
    const ch = code.startsWith('Key') ? code.slice(3) : ''
    P.typed = (P.typed + ch).slice(-4)
    if (P.typed === 'BONK') callbacks.stat('secret_typed', 1)
    const say = (name, color, text) => callbacks.chat({ name, color, text })
    const botName = () => (wanderers[Math.floor(Math.random() * wanderers.length)] || { name: 'noob_duck123' }).name
    if (P.typed.endsWith('BOO')) {
      callbacks.stat('egg_boo', 1)
      sfx.spooky()
      callbacks.toast('👻 Boo! Something in the well heard you…')
      P.typed = ''
    }
    if (P.typed === 'DUCK') {
      for (const wd of wanderers) wd.chat = { text: 'QUACK!', t: 2 }
      sfx.bigQuack()
      P.typed = ''
    }
    if (P.typed.endsWith('GG')) {
      say(botName(), '#2bd96b', 'gg!!')
      P.typed = ''
    }
    if (P.typed.endsWith('SUS')) {
      callbacks.toast('🚨 EMERGENCY MEETING! (just kidding)')
      say(botName(), '#ff4d6d', 'it was the duck in the hat')
      P.typed = ''
    }
    if (P.typed === 'HELO' || P.typed.endsWith('HI')) {
      say(botName(), '#3aa0ff', 'hello there!')
      setTimeout(() => say(botName(), '#ffb000', 'General Quackobi!'), 900)
      P.typed = ''
    }
    if (P.typed.endsWith('OOF')) {
      sfx.fall()
      callbacks.toast('OOF!')
      P.typed = ''
    }
    codes = [...codes, code].slice(-KONAMI.length)
    if (codes.join() === KONAMI.join()) {
      codes = []
      callbacks.konami()
      for (const wd of wanderers) {
        wd.vy = 700
        wd.emote = 'flip'
        wd.emoteT = 1.2
      }
    }
  }

  hub.render = (renderer2, dt) => {
    const t = performance.now() / 1000
    animateMaterials(t)
    for (const c of clouds) {
      c.position.x += c.userData.v * dt
      if (c.position.x > 1800) c.position.x = -1800
    }
    duck.root.position.set(P.x, P.y, P.z)
    duck.root.rotation.y = -P.facing
    poseDuck(duck, { walk: P.walk, swing: 0, spin: 0, flip: P.flipT > 0 ? 1 - P.flipT / 0.6 : 0, emote: P.emote, t, air: !P.grounded })
    if (pet) {
      const tx = P.x - Math.cos(P.facing) * 40
      const tz = P.z - Math.sin(P.facing) * 40
      pet.position.lerp(new THREE.Vector3(tx, P.y, tz), Math.min(1, dt * 5))
      pet.position.y = P.y + Math.abs(Math.sin(t * 8)) * 5
      pet.lookAt(P.x, pet.position.y, P.z)
      pet.rotateY(-Math.PI / 2)
    }
    portal.rotation.z = t
    fan.rotation.z = t * 20
    crank.rotation.z = t * 3
    swirl.rotation.z = -t * 2
    redBtn.position.y = 25 + (P.lastZone.has('redbutton') ? -4 : 0)
    screen.material.emissiveIntensity = 0.5 + Math.random() * 0.5
    // follow camera (bird's-eye, slightly behind)
    const target = new THREE.Vector3(P.x, P.y + 20, P.z)
    const want = new THREE.Vector3(P.x, P.y + hub.dist * 0.85, P.z + hub.dist * 0.62)
    camera.position.lerp(want, Math.min(1, dt * 6))
    camera.lookAt(target)
    renderer2.render(scene, camera)
  }

  const proj = new THREE.Vector3()
  hub.labels = (width, height) => {
    const out = []
    for (const wd of wanderers) {
      proj.set(wd.x, wd.y + 105, wd.z).project(camera)
      if (proj.z > 1) continue
      const x = (proj.x * 0.5 + 0.5) * width
      const y = (-proj.y * 0.5 + 0.5) * height
      out.push({ text: wd.name, color: '#ffffff', x, y, small: true })
      if (wd.chat) out.push({ text: wd.chat.text, x, y: y - 26, bubble: true })
    }
    for (const z of world.zones) {
      if (!z.label) continue
      proj.set(z.x, z.y + 90, z.z).project(camera)
      if (proj.z > 1) continue
      out.push({ text: z.label, color: z.color, x: (proj.x * 0.5 + 0.5) * width, y: (-proj.y * 0.5 + 0.5) * height })
    }
    return out
  }

  hub.dispose = () => disposeScene(scene)
  return hub
}
