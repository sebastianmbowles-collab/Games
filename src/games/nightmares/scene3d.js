// Leon's bedroom in 3D. We look out from Leon's pillow: the computer, window
// and paintings are on the back wall, a door is on each side wall, and the end
// of the bed (with Leon's feet under the blanket) is right in front of us.

import * as THREE from 'three'
import * as T from './textures'
import { HOTSPOTS, W, H } from './hotspots'

const HALF = 2.4 // half the room's width
const TALL = 2.6 // ceiling height
const BACK = -2.6 // back wall
const FRONT = 2.6
const DOOR = { z0: -1.75, z1: -0.85, h: 2.05 }
const WIN = { x0: -0.55, x1: 0.55, y0: 1.0, y1: 2.0 }
const EYE = new THREE.Vector3(0, 1.05, 2.05)
const LOOK = new THREE.Vector3(0, 0.92, BACK)

// The 3D boxes we turn into on-screen click areas.
const HOT_BOXES = {
  leftDoor: [[-2.5, 0, DOOR.z0 - 0.05], [-2.3, DOOR.h, DOOR.z1 + 0.05]],
  rightDoor: [[2.3, 0, DOOR.z0 - 0.05], [2.5, DOOR.h, DOOR.z1 + 0.05]],
  computer: [[-1.85, 0.76, -2.55], [-1.25, 1.2, -2.05]],
  window: [[-0.7, 0.95, -2.7], [0.7, 2.05, -2.5]],
  paintings: [[0.9, 1.15, -2.6], [2.15, 1.95, -2.5]],
  underBed: [[-0.72, 0.5, 0.2], [0.72, 1.12, 0.8]],
}

function tex(canvas, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function mat(map, extra = {}) {
  return new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0, ...extra })
}

function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  if (parent) parent.add(m)
  return m
}

// A tall, thin shadow person with glowing eyes.
function makeShadowPerson(height = 2.1) {
  const g = new THREE.Group()
  const black = new THREE.MeshStandardMaterial({ color: 0x050407, roughness: 1 })
  const s = height / 2.1
  mesh(new THREE.CylinderGeometry(0.15 * s, 0.1 * s, 1.25 * s, 10), black, 0, 1.05 * s, 0, g)
  const head = mesh(new THREE.SphereGeometry(0.15 * s, 14, 12), black, 0, 1.86 * s, 0, g)
  head.scale.set(0.9, 1.35, 0.9)
  for (const side of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.035 * s, 0.03 * s, 0.9 * s, 6), black, side * 0.07 * s, 0.22 * s, 0, g)
    const arm = new THREE.Group()
    arm.position.set(side * 0.19 * s, 1.62 * s, 0)
    const a = mesh(new THREE.CylinderGeometry(0.03 * s, 0.022 * s, 1.1 * s, 6), black, 0, -0.55 * s, 0, arm)
    a.castShadow = true
    for (let f = -2; f <= 2; f++) {
      const finger = mesh(new THREE.CylinderGeometry(0.008, 0.003, 0.2 * s, 4), black, f * 0.015, -1.18 * s, 0, arm)
      finger.rotation.z = f * 0.12
    }
    arm.userData.side = side
    g.add(arm)
    g.userData[side < 0 ? 'armL' : 'armR'] = arm
  }
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0, fog: false })
  const eyes = new THREE.Group()
  for (const side of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.018 * s, 8, 6), eyeMat)
    e.position.set(side * 0.055 * s, 1.9 * s, 0.13 * s)
    e.scale.set(1.4, 0.8, 0.5)
    eyes.add(e)
  }
  g.add(eyes)
  g.userData.eyes = eyes
  return g
}

export function createRoom(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  const fog = new THREE.FogExp2(0x000000, 0.0)
  scene.fog = fog
  const camera = new THREE.PerspectiveCamera(68, W / H, 0.05, 60)
  camera.position.copy(EYE)
  camera.lookAt(LOOK)

  // ---------- textures ----------
  const wallCanvas = T.wallpaper()
  const wallMat = (w, h) => mat(tex(wallCanvas, w / 1.3, h / 1.3))
  const floorMat = mat(tex(T.floorboards(), 3, 3))
  const ceilMat = mat(tex(T.plaster(), 3, 3))
  const woodMat = mat(tex(T.wood(5)))
  const darkWood = mat(tex(T.wood(9, [40, 26, 16])))
  const trimMat = mat(tex(T.plaster(), 1, 4), { color: 0xb8b0a0 })
  const blanketMat = mat(tex(T.blanket(), 1, 1.6))
  const velvetMat = mat(tex(T.velvet()), { side: THREE.DoubleSide })
  const furDark = mat(tex(T.fur([16, 12, 10], 31), 2, 2))
  const furTeddy = mat(tex(T.fur([70, 46, 28], 33), 2, 2))
  const plastic = mat(tex(T.plaster(), 1, 1), { color: 0x9a927c, roughness: 0.7 })
  const gold = mat(tex(T.wood(13, [90, 70, 30])), { metalness: 0.5, roughness: 0.6 })

  // ---------- the room ----------
  const box = (w, h, d, material, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, scene)
  const floor = mesh(new THREE.PlaneGeometry(HALF * 2, FRONT - BACK), floorMat, 0, 0, 0, scene)
  floor.rotation.x = -Math.PI / 2
  floor.castShadow = false
  const ceil = mesh(new THREE.PlaneGeometry(HALF * 2, FRONT - BACK), ceilMat, 0, TALL, 0, scene)
  ceil.rotation.x = Math.PI / 2

  // Back wall, built around the window hole.
  const t = 0.1
  const sideW = HALF - WIN.x1
  box(sideW, TALL, t, wallMat(sideW, TALL), -(WIN.x1 + sideW / 2), TALL / 2, BACK - t / 2)
  box(sideW, TALL, t, wallMat(sideW, TALL), WIN.x1 + sideW / 2, TALL / 2, BACK - t / 2)
  box(WIN.x1 * 2, WIN.y0, t, wallMat(1.1, 1), 0, WIN.y0 / 2, BACK - t / 2)
  box(WIN.x1 * 2, TALL - WIN.y1, t, wallMat(1.1, 0.6), 0, (TALL + WIN.y1) / 2, BACK - t / 2)
  box(HALF * 2, TALL, t, wallMat(4.8, TALL), 0, TALL / 2, FRONT + t / 2)

  // Side walls, each with a doorway.
  for (const side of [-1, 1]) {
    const x = side * (HALF + t / 2)
    const backLen = DOOR.z0 - BACK
    const frontLen = FRONT - DOOR.z1
    box(t, TALL, backLen, wallMat(backLen, TALL), x, TALL / 2, BACK + backLen / 2)
    box(t, TALL, frontLen, wallMat(frontLen, TALL), x, TALL / 2, DOOR.z1 + frontLen / 2)
    box(t, TALL - DOOR.h, DOOR.z1 - DOOR.z0, wallMat(0.9, 0.5), x, (TALL + DOOR.h) / 2, (DOOR.z0 + DOOR.z1) / 2)
    // Door trim.
    const tx = side * (HALF - 0.01)
    box(0.04, DOOR.h + 0.08, 0.07, trimMat, tx, DOOR.h / 2, DOOR.z0 - 0.035)
    box(0.04, DOOR.h + 0.08, 0.07, trimMat, tx, DOOR.h / 2, DOOR.z1 + 0.035)
    box(0.04, 0.07, DOOR.z1 - DOOR.z0 + 0.14, trimMat, tx, DOOR.h + 0.035, (DOOR.z0 + DOOR.z1) / 2)
    // A dark hallway beyond the door.
    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.4, 1.3),
      mat(tex(wallCanvas, 2, 1.5), { side: THREE.BackSide, color: 0x3a3a44 }),
    )
    hall.position.set(side * (HALF + t + 1.6), 1.2, (DOOR.z0 + DOOR.z1) / 2)
    hall.receiveShadow = true
    scene.add(hall)
  }
  // Skirting boards.
  box(HALF * 2, 0.12, 0.03, trimMat, 0, 0.06, BACK + 0.015)

  // Doors hang on hinges next to the back wall.
  const doors = {}
  for (const [key, side] of [
    ['leftDoor', -1],
    ['rightDoor', 1],
  ]) {
    const pivot = new THREE.Group()
    pivot.position.set(side * (HALF - 0.02), 0, DOOR.z0)
    const w = DOOR.z1 - DOOR.z0 - 0.02
    mesh(new THREE.BoxGeometry(0.045, DOOR.h - 0.02, w), darkWood, 0, DOOR.h / 2, w / 2 + 0.01, pivot)
    for (const py of [0.55, 1.45]) mesh(new THREE.BoxGeometry(0.06, 0.6, w - 0.2), woodMat, 0, py, w / 2 + 0.01, pivot)
    mesh(new THREE.SphereGeometry(0.03, 10, 8), gold, -side * 0.05, 1.0, w - 0.08, pivot)
    scene.add(pivot)
    const person = makeShadowPerson()
    scene.add(person)
    doors[key] = { pivot, side, person, angle: 0 }
  }

  // ---------- window ----------
  const outsideNight = tex(T.outside(false))
  const outsideDay = tex(T.outside(true))
  const outsideMat = new THREE.MeshBasicMaterial({ map: outsideNight, fog: false })
  const outsidePlane = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), outsideMat)
  outsidePlane.position.set(0, 1.8, -8)
  scene.add(outsidePlane)
  const frameMat = mat(tex(T.plaster(), 1, 1), { color: 0xa8a090 })
  const wz = BACK - 0.05
  box(WIN.x1 * 2 + 0.12, 0.06, 0.08, frameMat, 0, WIN.y0, wz)
  box(WIN.x1 * 2 + 0.12, 0.06, 0.08, frameMat, 0, WIN.y1, wz)
  box(0.06, WIN.y1 - WIN.y0, 0.08, frameMat, WIN.x0, (WIN.y0 + WIN.y1) / 2, wz)
  box(0.06, WIN.y1 - WIN.y0, 0.08, frameMat, WIN.x1, (WIN.y0 + WIN.y1) / 2, wz)
  box(0.04, WIN.y1 - WIN.y0, 0.05, frameMat, 0, (WIN.y0 + WIN.y1) / 2, wz)
  box(WIN.x1 * 2, 0.04, 0.05, frameMat, 0, (WIN.y0 + WIN.y1) / 2, wz)
  box(WIN.x1 * 2 + 0.3, 0.05, 0.22, frameMat, 0, WIN.y0 - 0.03, BACK + 0.06)
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WIN.x1 * 2, WIN.y1 - WIN.y0),
    new THREE.MeshStandardMaterial({ color: 0x8899aa, transparent: true, opacity: 0.12, roughness: 0.15, metalness: 0.6 }),
  )
  glass.position.set(0, (WIN.y0 + WIN.y1) / 2, BACK - 0.06)
  scene.add(glass)

  // The Tall Man stands outside.
  const tallMan = new THREE.Group()
  const faceMat = new THREE.MeshBasicMaterial({ map: tex(T.tallManFace()), transparent: true, color: 0x8a8680 })
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), faceMat)
  tallMan.add(face)
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0x030303 })
  const body = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), bodyMat)
  body.position.set(0, -1.7, -0.01)
  tallMan.add(body)
  const handCanvas = T.makeCanvas(128, 256, (g, w, h) => {
    g.filter = 'blur(1px)'
    g.strokeStyle = '#c9c2b2'
    g.lineCap = 'round'
    for (let f = 0; f < 4; f++) {
      g.lineWidth = 9
      g.beginPath()
      g.moveTo(w / 2, h * 0.95)
      g.quadraticCurveTo(w * (0.2 + f * 0.2), h * 0.5, w * (0.12 + f * 0.25), h * 0.05 + f * 8)
      g.stroke()
    }
    g.fillStyle = '#b8b0a0'
    g.beginPath()
    g.ellipse(w / 2, h * 0.9, 26, 30, 0, 0, Math.PI * 2)
    g.fill()
    T.grit(g, w, h, 0.15)
  })
  const hands = []
  for (const side of [-1, 1]) {
    const hm = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.56),
      new THREE.MeshBasicMaterial({ map: tex(handCanvas), transparent: true, color: 0x8a8680 }),
    )
    hm.position.set(side * 0.33, 1.4, BACK - 0.075)
    hm.rotation.z = -side * 0.25
    scene.add(hm)
    hands.push(hm)
  }
  scene.add(tallMan)

  // Curtains.
  const rod = mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.9, 6), gold, 0, WIN.y1 + 0.14, BACK + 0.12, scene)
  rod.rotation.z = Math.PI / 2
  const curtains = [-1, 1].map((side) => {
    const c = mesh(new THREE.PlaneGeometry(0.62, 1.5, 12, 1), velvetMat, 0, WIN.y1 + 0.13 - 0.75, BACK + 0.11, scene)
    // Wavy folds.
    const pos = c.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 30) * 0.025)
    c.geometry.computeVertexNormals()
    c.userData.side = side
    return c
  })

  // ---------- desk + haunted computer ----------
  box(1.1, 0.04, 0.6, woodMat, -1.55, 0.76, -2.28)
  for (const [lx, lz] of [
    [-2.05, -2.52],
    [-1.05, -2.52],
    [-2.05, -2.03],
    [-1.05, -2.03],
  ])
    box(0.04, 0.74, 0.04, woodMat, lx, 0.37, lz)
  box(0.46, 0.4, 0.42, plastic, -1.55, 0.98, -2.33)
  box(0.3, 0.18, 0.3, plastic, -1.55, 0.87, -2.4)
  box(0.18, 0.44, 0.42, plastic, -1.12, 0.99, -2.33)
  box(0.42, 0.02, 0.14, plastic, -1.55, 0.79, -2.02)
  const screenCanvas = T.makeCanvas(256, 192, (g, w, h) => T.drawMonitor(g, w, h, 0, 0, 0))
  const screenTex = tex(screenCanvas)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.28), new THREE.MeshBasicMaterial({ map: screenTex, fog: false }))
  screen.position.set(-1.55, 0.99, -2.115)
  scene.add(screen)
  const screenLight = new THREE.PointLight(0x55ff88, 0, 3.5, 1.6)
  screenLight.position.set(-1.55, 1.0, -1.9)
  scene.add(screenLight)
  let screenState = ''

  // ---------- paintings ----------
  const paintings = [
    { kind: 'lady', x: 1.2, y: 1.58, w: 0.48, h: 0.63, tilt: -1 },
    { kind: 'man', x: 1.84, y: 1.5, w: 0.44, h: 0.58, tilt: 1 },
  ].map((p) => {
    const g = new THREE.Group()
    g.position.set(p.x, p.y + p.h / 2, BACK + 0.03)
    mesh(new THREE.BoxGeometry(p.w + 0.1, p.h + 0.1, 0.04), gold, 0, -p.h / 2, 0, g)
    const texs = [tex(T.portrait(p.kind, false, false)), tex(T.portrait(p.kind, true, false)), tex(T.portrait(p.kind, true, true))]
    const pic = mesh(new THREE.PlaneGeometry(p.w, p.h), mat(texs[0]), 0, -p.h / 2, 0.021, g)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, fog: false })
    const eyes = new THREE.Group()
    for (const ex of [0.42, 0.58]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), eyeMat)
      e.position.set((ex - 0.5) * p.w, -p.h / 2 + (0.5 - 0.41) * p.h, 0.025)
      eyes.add(e)
    }
    g.add(eyes)
    const armMat = mat(null, { color: 0xc8baa4 })
    const arms = new THREE.Group()
    for (const side of [-1, 1]) {
      const a = mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.7, 6), armMat, side * 0.1, -p.h - 0.2, 0.2, arms)
      a.rotation.x = 1.0
      a.rotation.z = side * 0.3
    }
    g.add(arms)
    scene.add(g)
    return { ...p, group: g, pic, texs, eyes, arms, shown: 0 }
  })

  // ---------- the bed ----------
  const bed = new THREE.Group()
  scene.add(bed)
  mesh(new THREE.BoxGeometry(1.3, 0.3, 2.1), darkWood, 0, 0.28, 1.5, bed)
  mesh(new THREE.BoxGeometry(1.22, 0.18, 2.0), mat(null, { color: 0x8a8578 }), 0, 0.5, 1.5, bed)
  const blanketGeo = new THREE.PlaneGeometry(1.34, 2.05, 48, 64)
  blanketGeo.rotateX(-Math.PI / 2)
  const bp = blanketGeo.attributes.position
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i)
    const z = bp.getZ(i) // -1 (foot) .. +1 (head)
    let y = 0.62
    // Leon's legs make two long ridges, his feet make bumps at the end.
    for (const lx of [-0.14, 0.14]) {
      const leg = Math.exp(-((x - lx) ** 2) / 0.015) * 0.04 * (z > -0.8 ? 1 : 0)
      const foot = Math.exp(-((x - lx) ** 2) / 0.012 - (z + 0.78) ** 2 / 0.012) * 0.05
      y += leg + foot
    }
    y += Math.sin(x * 9 + z * 5) * 0.01
    if (Math.abs(x) > 0.6) y -= (Math.abs(x) - 0.6) * 4
    bp.setY(i, y)
  }
  blanketGeo.computeVertexNormals()
  mesh(blanketGeo, blanketMat, 0, 0, 1.5, bed)
  mesh(new THREE.BoxGeometry(1.34, 0.72, 0.06), darkWood, 0, 0.5, 0.45, bed)
  for (const px of [-0.68, 0.68]) {
    mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.98, 10), darkWood, px, 0.49, 0.45, bed)
    mesh(new THREE.SphereGeometry(0.06, 10, 8), darkWood, px, 1.0, 0.45, bed)
  }

  // Teddy bear on the blanket.
  const teddy = new THREE.Group()
  teddy.position.set(0.44, 0.66, 1.25)
  teddy.rotation.y = 0.5
  mesh(new THREE.SphereGeometry(0.1, 14, 12), furTeddy, 0, 0.08, 0, teddy).scale.set(1, 1.1, 0.9)
  mesh(new THREE.SphereGeometry(0.075, 14, 12), furTeddy, 0, 0.23, 0.02, teddy)
  for (const ex of [-0.05, 0.05]) mesh(new THREE.SphereGeometry(0.028, 8, 6), furTeddy, ex, 0.3, 0.0, teddy)
  const teddyEyeMat = new THREE.MeshBasicMaterial({ color: 0x080808 })
  for (const ex of [-0.025, 0.025]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), teddyEyeMat)
    e.position.set(ex, 0.245, 0.07)
    teddy.add(e)
  }
  scene.add(teddy)

  // The Grabber hides behind the end of the bed.
  const grabber = new THREE.Group()
  const gHead = mesh(new THREE.SphereGeometry(0.3, 18, 14), furDark, 0, 0, 0, grabber)
  gHead.scale.set(1.25, 0.9, 1)
  const gEyeMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, fog: false })
  const slitMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
  for (const ex of [-0.11, 0.11]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), gEyeMat)
    e.position.set(ex, 0.08, 0.25)
    e.scale.set(1.3, 0.8, 0.5)
    grabber.add(e)
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.055, 0.01), slitMat)
    slit.position.set(ex, 0.08, 0.275)
    grabber.add(slit)
  }
  scene.add(grabber)
  const clawMat = mat(null, { color: 0xcfc6ae, roughness: 0.6 })
  const claws = [-1, 1].map((side) => {
    const h = new THREE.Group()
    mesh(new THREE.SphereGeometry(0.07, 10, 8), furDark, 0, 0, 0, h).scale.set(1.3, 0.6, 1)
    for (let f = -2; f <= 2; f++) {
      const c = mesh(new THREE.ConeGeometry(0.012, 0.16, 5), clawMat, f * 0.035, -0.02, 0.08, h)
      c.rotation.x = Math.PI / 2
    }
    h.userData.side = side
    scene.add(h)
    return h
  })

  // A tall shadow that sometimes walks past the back wall.
  const walker = makeShadowPerson(2.35)
  scene.add(walker)

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0x8090b0, 0x050505, 0.1)
  scene.add(hemi)
  const moon = new THREE.DirectionalLight(0x8fa3d6, 1.4)
  // Low in the sky, so its light comes through the window onto the bed.
  moon.position.set(-0.4, 2.7, -6.5)
  moon.target.position.set(0.1, 0.65, 0.9)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  Object.assign(moon.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 16 })
  moon.shadow.camera.updateProjectionMatrix()
  moon.shadow.bias = -0.0015
  scene.add(moon, moon.target)
  // Soft blue glow from the window, so the room is dark but not pitch black.
  const moonFill = new THREE.PointLight(0x7f95c8, 0, 8, 1.1)
  moonFill.position.set(0, 1.5, -2.0)
  scene.add(moonFill)
  const lamp = new THREE.PointLight(0xffc98a, 0, 12, 1.4)
  lamp.position.set(0, 2.35, 0)
  lamp.castShadow = true
  lamp.shadow.mapSize.set(512, 512)
  lamp.shadow.bias = -0.003
  scene.add(lamp)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe7c2 }))
  bulb.position.copy(lamp.position)
  scene.add(bulb)
  const torch = new THREE.SpotLight(0xffeccc, 0, 14, 0.24, 0.45, 1.4)
  torch.castShadow = true
  torch.shadow.mapSize.set(512, 512)
  torch.shadow.bias = -0.002
  scene.add(torch, torch.target)

  // ---------- per-frame update ----------
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const v = new THREE.Vector3()
  const tint = new THREE.Color()

  function place(obj, visible, x, y, z) {
    obj.visible = visible
    if (visible) obj.position.set(x, y, z)
  }

  function update(s) {
    const dream = s.mode === 'dream'
    const stage = (k) => (dream ? (s.threats?.[k]?.stage ?? 0) : 0)
    const time = s.t

    // Camera: Leon breathes, and glances a little toward where you point.
    const aim = s.aim ?? { x: W / 2, y: H / 2 }
    camera.position.set(EYE.x, EYE.y + Math.sin(time * 1.6) * 0.006, EYE.z)
    if (s.shake > 0) camera.position.add(v.set((Math.random() - 0.5) * s.shake * 0.004, (Math.random() - 0.5) * s.shake * 0.004, 0))
    camera.lookAt(LOOK)
    camera.rotateY(-((aim.x / W - 0.5) * 0.1))
    camera.rotateX(-((aim.y / H - 0.5) * 0.06))
    camera.updateMatrixWorld()

    // Lights for each kind of scene.
    const flash = Math.min(1, (s.flash ?? 0) * 3)
    if (dream) {
      tint.setRGB(s.tint[0] / 255, s.tint[1] / 255, s.tint[2] / 255)
      fog.color.copy(tint).multiplyScalar(0.05)
      fog.density = 0.09
      hemi.color.copy(tint).lerp(new THREE.Color(0x8090b0), 0.5)
      hemi.intensity = 0.2 + flash * 1.5
      moonFill.intensity = 2.2 * (1 - (s.curtain ?? 0) * 0.85)
      moon.color.set(0x8fa3d6)
      moon.intensity = 2.6 * (1 - (s.curtain ?? 0) * 0.9) + flash * 6
      lamp.intensity = 0
      bulb.material.color.set(0x222222)
      outsideMat.map = outsideNight
      outsideMat.color.setScalar(0.55 + flash)
      renderer.toneMappingExposure = 1.0
    } else {
      fog.density = 0
      moonFill.intensity = 0
      const morning = s.mode === 'morning'
      hemi.color.set(morning ? 0xfff1d8 : 0xffd8a8)
      hemi.intensity = morning ? 0.9 : 0.35
      moon.color.set(morning ? 0xffd9a0 : 0x8fa3d6)
      moon.intensity = morning ? 3.5 : 0.6
      lamp.intensity = morning ? 0 : 9
      bulb.material.color.set(morning ? 0x555555 : 0xffe7c2)
      outsideMat.map = morning ? outsideDay : outsideNight
      outsideMat.color.setScalar(morning ? 1 : 0.7)
      renderer.toneMappingExposure = morning ? 1.1 : 1.0
    }

    // Flashlight follows the mouse. It stutters when something is very close.
    const scared = s.danger >= 3 && Math.random() < 0.12
    const low = s.battery < 15 ? 0.6 + Math.random() * 0.4 : 1
    torch.intensity = dream && s.lightOn ? (scared ? Math.random() * 6 : 26 * low) : 0
    ndc.set((aim.x / W) * 2 - 1, -(aim.y / H) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    torch.position.copy(camera.position).add(v.set(0.18, -0.25, -0.1))
    torch.target.position.copy(ray.ray.origin).addScaledVector(ray.ray.direction, 6)

    // Doors and the Shadow Twins.
    for (const [key, d] of Object.entries(doors)) {
      const st = stage(key)
      const held = s.holding?.[key]
      const target = held ? 0 : [0, 0.3, 0.75, 1.3][Math.min(3, st)]
      d.angle += (target - d.angle) * 0.12
      const rattle = held && st > 0 ? Math.sin(time * 60) * 0.03 : 0
      d.pivot.rotation.y = d.side * (d.angle + rattle)
      const p = d.person
      const x = d.side * [0, 4.4, 2.95, 2.2][Math.min(3, st)]
      const zc = (DOOR.z0 + DOOR.z1) / 2 + (st >= 3 ? 0.15 : 0)
      place(p, st > 0 && !(held && st < 3), held ? d.side * 2.9 : x, 0, zc)
      if (p.visible) {
        p.lookAt(EYE.x, 0, EYE.z)
        p.rotation.z = st >= 3 ? -d.side * 0.1 : 0
        p.position.x += Math.sin(time * 1.3 + d.side) * 0.02
        const reach = st >= 3 && !held
        for (const arm of [p.userData.armL, p.userData.armR]) {
          const lead = arm.userData.side === -d.side
          arm.rotation.x = reach && lead ? -1.2 + Math.sin(time * 2) * 0.1 : 0.05 * Math.sin(time + arm.userData.side)
        }
        p.userData.eyes.visible = Math.sin(time * 0.7 + d.side * 2) < 0.97
      }
    }

    // Window: the Tall Man and the curtains.
    const ws = stage('window')
    tallMan.visible = ws > 0
    if (ws === 1) {
      tallMan.position.set(-1.1, 1.5, -7.4)
      tallMan.scale.setScalar(0.5)
    } else if (ws >= 2) {
      const big = ws >= 3
      tallMan.position.set(Math.sin(time * 0.6) * 0.03, big ? 1.42 : 1.3, big ? BACK - 0.14 : BACK - 0.3)
      tallMan.scale.setScalar(big ? 1.05 : 0.85)
    }
    hands.forEach((hm) => (hm.visible = ws >= 3))
    const closed = s.curtain ?? 0
    for (const c of curtains) {
      const openX = c.userData.side * 0.86
      const closedX = c.userData.side * 0.3
      c.position.x = openX + (closedX - openX) * closed
      c.scale.x = 0.7 + closed * 0.3
    }

    // Computer screen.
    const cs = stage('computer')
    const want = `${cs}`
    if (cs > 0 || screenState !== want) {
      T.drawMonitor(screenCanvas.getContext('2d'), 256, 192, cs, s.computerProgress ?? 0, time)
      screenTex.needsUpdate = true
      screenState = want
    }
    screenLight.intensity = cs > 0 ? (cs >= 3 ? 1.5 + Math.random() * 2 : 1.2) : 0

    // Paintings wake up, tilt and reach out.
    const ps = stage('paintings')
    for (const p of paintings) {
      const show = ps === 0 ? 0 : ps === 1 ? 1 : 2
      if (p.shown !== show) {
        p.pic.material.map = p.texs[show]
        p.pic.material.needsUpdate = true
        p.shown = show
      }
      p.group.rotation.z = ps >= 2 ? p.tilt * 0.09 + Math.sin(time * 3) * 0.005 : 0
      p.eyes.visible = ps >= 1
      p.arms.visible = ps >= 3
      if (ps >= 3) p.arms.rotation.x = Math.sin(time * 2 + p.x) * 0.1
    }

    // The Grabber rises from behind the bed.
    const gs = stage('underBed')
    grabber.visible = gs > 0
    const gy = [0, 0.8, 0.95, 1.1][Math.min(3, gs)]
    grabber.position.set(Math.sin(time * 0.9) * 0.05, gy, gs >= 3 ? 0.33 : 0.22)
    for (const h of claws) {
      h.visible = gs >= 2
      const sd = h.userData.side
      if (gs === 2) {
        h.position.set(sd * 0.35, 0.88, 0.47)
        h.rotation.set(0.9, 0, 0)
      } else if (gs >= 3) {
        h.position.set(sd * 0.3, 0.72, 0.78 + Math.sin(time * 3 + sd) * 0.03)
        h.rotation.set(0.1, 0, 0)
      }
    }

    // Teddy's eyes go red when Leon is very scared.
    teddyEyeMat.color.set(dream && s.fear > 50 ? 0xff1a10 : 0x080808)

    // Something walking past.
    walker.visible = dream && !!s.walker
    if (walker.visible) {
      walker.position.set(-2.0 + s.walker.p * 4, Math.abs(Math.sin(s.walker.p * 18)) * 0.02, -2.15)
      walker.rotation.y = Math.PI / 2 - 0.4
    }

    // Work out where every hotspot is on the screen now.
    for (const [key, [a, b]] of Object.entries(HOT_BOXES)) {
      let x0 = Infinity
      let y0 = Infinity
      let x1 = -Infinity
      let y1 = -Infinity
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? b[0] : a[0], i & 2 ? b[1] : a[1], i & 4 ? b[2] : a[2]).project(camera)
        const sx = ((v.x + 1) / 2) * W
        const sy = ((1 - v.y) / 2) * H
        x0 = Math.min(x0, sx)
        x1 = Math.max(x1, sx)
        y0 = Math.min(y0, sy)
        y1 = Math.max(y1, sy)
      }
      Object.assign(HOTSPOTS[key], { x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
    }

    renderer.render(scene, camera)
  }

  function resize() {
    const w = canvas.clientWidth || W
    const h = canvas.clientHeight || H
    // Rendered a bit below full resolution: softer and grainier, like an old camera.
    renderer.setPixelRatio(Math.min(1, window.devicePixelRatio || 1) * 0.8)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resize()

  function dispose() {
    renderer.dispose()
    scene.traverse((o) => {
      o.geometry?.dispose()
      const m = o.material
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose())
    })
  }

  return { update, resize, dispose }
}
