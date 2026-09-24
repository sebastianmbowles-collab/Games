import * as THREE from 'three'
import { COSTUMES, PET_MAP } from './costumes'

// Rubber ducks built from simple shapes. The duck faces +X, stands on y = 0,
// and is about 50 units tall. Costume accessories hang off `head` or `body`.

const matCache = new Map()
export const animatedMats = new Set()

export function mat(color, kind = 'normal') {
  const key = `${color}|${kind}`
  if (matCache.has(key)) return matCache.get(key)
  let m
  switch (kind) {
    case 'gold':
      m = new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.3, emissive: '#7a5600', emissiveIntensity: 0.35 })
      break
    case 'platinum':
    case 'metal':
      m = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.35 })
      break
    case 'diamond':
    case 'crystal':
      m = new THREE.MeshPhysicalMaterial({ color, metalness: 0.1, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8, emissive: color, emissiveIntensity: 0.25 })
      break
    case 'glow':
    case 'neon':
      m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.4 })
      break
    case 'ghost':
      m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.55, emissive: '#aaccff', emissiveIntensity: 0.3 })
      break
    case 'invisible':
      m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.12 })
      break
    case 'shadow':
      m = new THREE.MeshStandardMaterial({ color: '#0b0b12', roughness: 1, emissive: '#1a0033', emissiveIntensity: 0.5 })
      break
    case 'slime':
      m = new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.8, roughness: 0.1, clearcoat: 1 })
      break
    case 'galaxy':
      m = new THREE.MeshStandardMaterial({ color, emissive: '#7c4dff', emissiveIntensity: 0.4, roughness: 0.2 })
      break
    case 'pixel':
      m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 })
      break
    case 'rainbow':
    case 'glitch':
    case 'goldglitch':
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.25 })
      m.userData.anim = kind
      animatedMats.add(m)
      break
    case 'basic':
      m = new THREE.MeshBasicMaterial({ color })
      break
    case 'glass':
      m = new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.35, roughness: 0, clearcoat: 1 })
      break
    default:
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  }
  m.userData.cached = true
  matCache.set(key, m)
  return m
}

// Free GPU memory for a scene, keeping the shared cached geometries/materials.
export function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry && !o.geometry.userData.cached) o.geometry.dispose()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of mats) {
      if (m.userData.cached) continue
      if (m.map) m.map.dispose()
      m.dispose()
    }
  })
  if (scene.background && scene.background.dispose) scene.background.dispose()
}

export function animateMaterials(t) {
  for (const m of animatedMats) {
    if (m.userData.anim === 'rainbow') {
      m.color.setHSL((t * 0.3) % 1, 0.9, 0.55)
      m.emissive.copy(m.color)
    } else if (m.userData.anim === 'glitch') {
      if (Math.random() < 0.2) m.color.setHSL(Math.random(), 1, 0.5)
      m.emissive.copy(m.color)
    } else if (m.userData.anim === 'goldglitch') {
      m.color.set(Math.random() < 0.85 ? '#ffd700' : '#ff00ff')
      m.emissive.copy(m.color).multiplyScalar(0.4)
    }
  }
}

const geoCache = new Map()
function geo(key, make) {
  if (!geoCache.has(key)) {
    const g = make()
    g.userData.cached = true
    geoCache.set(key, g)
  }
  return geoCache.get(key)
}
const SPH = (seg = 20) => geo(`s${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(8, seg * 0.7)))
const BOX = () => geo('b', () => new THREE.BoxGeometry(1, 1, 1))
const CYL = (seg = 20) => geo(`c${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg))
const CONE = (seg = 18) => geo(`k${seg}`, () => new THREE.ConeGeometry(1, 1, seg))
const TOR = () => geo('t', () => new THREE.TorusGeometry(1, 0.15, 10, 28))

function add(parent, g, m, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(g, m)
  mesh.position.set(x, y, z)
  mesh.scale.set(sx, sy ?? sx, sz ?? sx)
  mesh.castShadow = true
  parent.add(mesh)
  return mesh
}
const sph = (p, m, x, y, z, r, sy, sz) => add(p, SPH(), m, x, y, z, r, sy ?? r, sz ?? r)
const box = (p, m, x, y, z, w, h, d) => add(p, BOX(), m, x, y, z, w, h, d)
const cyl = (p, m, x, y, z, r, h, seg) => add(p, CYL(seg), m, x, y, z, r, h, r)
const cone = (p, m, x, y, z, r, h, seg) => add(p, CONE(seg), m, x, y, z, r, h, r)
// Torus ring of radius r (the tube is 15% of r).
function tor(p, m, x, y, z, r, _tube, rx = Math.PI / 2) {
  const t = add(p, TOR(), m, x, y, z, r)
  t.rotation.x = rx
  return t
}

const BLACK = () => mat('#1b1b1b')
const WHITE = () => mat('#ffffff')

// ---------------------------------------------------------------- accessories
// h = head group (origin at head centre, radius 11), b = body group (origin at body centre)
const ACC = {
  crown: (h, b, c, k) => {
    const g = mat('#ffd700', 'gold')
    cyl(h, g, 0, 11, 0, 7.5, 5)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      cone(h, g, Math.cos(a) * 6.5, 16, Math.sin(a) * 6.5, 1.8, 5)
    }
    sph(h, mat(c || '#ff3355', 'glow'), 7.3, 11, 0, 1.4)
    if (k === 'big') h.children.slice(-7).forEach((m) => m.scale.multiplyScalar(1.3))
  },
  smallCrown: (h) => {
    const g = mat('#ffd700', 'gold')
    cyl(h, g, 0, 11, 0, 5, 3)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      cone(h, g, Math.cos(a) * 4.3, 14, Math.sin(a) * 4.3, 1.2, 3)
    }
  },
  bigCrown: (h, b, c) => {
    const g = mat('#ffd700', 'gold')
    cyl(h, g, 0, 13, 0, 10, 8)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      cone(h, g, Math.cos(a) * 9, 20, Math.sin(a) * 9, 2.2, 7)
      sph(h, mat(['#ff3355', '#33c3ff', '#44ff88'][i % 3], 'glow'), Math.cos(a) * 10, 13, Math.sin(a) * 10, 1.4)
    }
    cyl(h, mat(c || '#b71c1c'), 0, 16, 0, 8, 6)
  },
  tiara: (h) => {
    const g = mat('#ffd700', 'gold')
    tor(h, g, 0, 9, 0, 9, 0.1, Math.PI / 2 + 0.3)
    cone(h, g, 5, 14, 0, 2, 5)
    sph(h, mat('#ff66cc', 'glow'), 6, 12, 0, 1.6)
  },
  ninjaBand: (h, b, c) => {
    const m = mat(c)
    tor(h, m, 0, 3, 0, 11.3, 0.12)
    box(h, m, -13, 2, 2, 8, 1.5, 3).rotation.z = 0.5
    box(h, m, -13, 2, -2, 8, 1.5, 3).rotation.z = 0.8
  },
  pirateHat: (h) => {
    cyl(h, BLACK(), 0, 11, 0, 12, 2)
    const t = cone(h, BLACK(), 0, 16, 0, 11, 10, 3)
    t.rotation.y = Math.PI / 6
    sph(h, WHITE(), 6, 15, 0, 1.8)
  },
  eyepatch: (h) => {
    const e = cyl(h, BLACK(), 8.8, 2, 4.5, 3, 1)
    e.rotation.z = Math.PI / 2
    tor(h, BLACK(), 0, 3, 0, 11.2, 0.05, Math.PI / 2 - 0.3)
  },
  knightHelmet: (h, b, c, k, m) => {
    const hm = m || mat(c || '#b0bec5', 'metal')
    sph(h, hm, 0, 1, 0, 12.5)
    box(h, BLACK(), 11.5, 2, 0, 2, 2, 12)
    cone(h, mat('#e53935'), -1, 16, 0, 2.5, 8)
  },
  wizardHat: (h, b, c, k, m) => {
    const hm = m || mat(c)
    cyl(h, hm, 0, 10, 0, 15, 1.5)
    const t = cone(h, hm, -1, 22, 0, 9, 24)
    t.rotation.z = 0.2
    sph(h, mat('#ffe45e', 'glow'), 2, 20, 6, 1.5)
    sph(h, mat('#ffe45e', 'glow'), 0, 25, -5, 1.2)
  },
  antenna: (h) => {
    for (const s of [-1, 1]) {
      const a = cyl(h, BLACK(), 0, 16, s * 4, 0.5, 10)
      a.rotation.x = s * 0.35
      sph(h, mat('#ff4081', 'glow'), 0, 21, s * 6, 2)
    }
  },
  robotFace: (h) => {
    box(h, mat('#263238'), 9, 2, 0, 3, 8, 15)
    for (const s of [-1, 1]) sph(h, mat('#00e5ff', 'glow'), 10.7, 3, s * 4, 1.8)
  },
  spaceDome: (h, b) => {
    sph(h, mat('#bdf', 'glass'), 0, 0, 0, 15)
    box(b, mat('#eceff1'), -16, 4, 0, 8, 16, 14)
  },
  cowboyHat: (h, b, c) => {
    const m = mat(c)
    cyl(h, m, 0, 10, 0, 17, 1.2)
    cyl(h, m, 0, 14, 0, 8, 8)
    tor(h, mat('#3e2723'), 0, 12, 0, 8.2, 0.1)
  },
  cape: (h, b, c) => {
    const cp = box(b, mat(c), -15, 0, 0, 2, 26, 26)
    cp.rotation.z = -0.25
    cp.userData.cape = true
  },
  mask: (h, b, c) => {
    box(h, mat(c), 9.5, 3, 0, 2, 3.5, 16)
  },
  deerstalker: (h, b, c) => {
    const m = mat(c)
    sph(h, m, 0, 6, 0, 11.6, 7, 11.6)
    box(h, m, 11, 5, 0, 7, 1.2, 9)
    box(h, m, -11, 5, 0, 7, 1.2, 9)
  },
  monocle: (h) => {
    const t = tor(h, mat('#ffd700', 'gold'), 10.2, 2, -4.5, 3, 0.1, 0)
    t.rotation.y = Math.PI / 2
  },
  goggles: (h, b, c) => {
    for (const s of [-1, 1]) {
      const t = tor(h, mat('#455a64'), 9, 7, s * 4, 3, 0.2, 0)
      t.rotation.y = Math.PI / 2
      sph(h, mat(c || '#4dd0e1', 'glass'), 9.2, 7, s * 4, 2.7)
    }
    tor(h, mat('#37474f'), 0, 7, 0, 11.2, 0.08, Math.PI / 2)
  },
  hairTuft: (h) => {
    for (let i = 0; i < 5; i++) sph(h, WHITE(), -6 + Math.random() * 4, 8 + Math.random() * 4, -8 + i * 4, 3.5)
  },
  chefHat: (h) => {
    cyl(h, WHITE(), 0, 13, 0, 9, 8)
    for (let i = 0; i < 5; i++) sph(h, WHITE(), Math.cos(i) * 5, 20, Math.sin(i * 1.3) * 5, 5.5)
  },
  hardHat: (h, b, c) => {
    const m = mat(c)
    sph(h, m, 0, 5, 0, 12.3, 8, 12.3)
    cyl(h, m, 3, 5, 0, 14, 1)
  },
  policeCap: (h, b, c) => {
    const m = mat(c)
    cyl(h, m, 0, 11, 0, 10, 5)
    cyl(h, m, 0, 14.5, 0, 12, 2)
    box(h, BLACK(), 11, 9.5, 0, 6, 1, 12)
    sph(h, mat('#ffd700', 'gold'), 10, 12, 0, 1.8)
  },
  captainHat: (h, b, c) => {
    cyl(h, WHITE(), 0, 11, 0, 10, 5)
    cyl(h, WHITE(), 0, 14.5, 0, 12, 2)
    box(h, mat(c || '#1a237e'), 11, 9.5, 0, 6, 1, 12)
    tor(h, mat('#ffd700', 'gold'), 0, 12, 0, 10.2, 0.1)
  },
  explorerHat: (h, b, c) => {
    const m = mat(c)
    sph(h, m, 0, 7, 0, 11.8, 8, 11.8)
    cyl(h, m, 0, 7, 0, 18, 1)
  },
  backpack: (h, b, c) => {
    box(b, mat(c || '#42a5f5'), -16, 3, 0, 8, 18, 16)
    box(b, mat('#1565c0'), -20, -1, 0, 2, 8, 12)
  },
  racingHelmet: (h, b, c) => {
    sph(h, mat(c), 0, 1, 0, 13)
    sph(h, mat('#111', 'glass'), 7, 2, 0, 9, 5, 10)
    box(h, WHITE(), 0, 13, 0, 16, 1, 3)
  },
  pilotCap: (h, b, c) => {
    const m = mat(c)
    sph(h, m, 0, 4, 0, 11.8, 9, 11.8)
    for (const s of [-1, 1]) sph(h, m, 0, -4, s * 10, 4, 6, 2)
  },
  stem: (h, b, c) => {
    const s = cyl(h, mat(c), 0, 14, 0, 1.5, 8)
    s.rotation.z = -0.4
  },
  spots: (h, b, c) => {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 18
      sph(b, mat(c), Math.cos(a) * 15, y, Math.sin(a) * 15, 2.2)
    }
  },
  bun: (h, b) => {
    for (const s of [-1, 1]) sph(b, mat('#e0a458'), 0, 0, s * 16, 22, 10, 7)
  },
  mustard: (h, b) => {
    for (let i = 0; i < 5; i++) sph(b, mat('#ffd600'), -10 + i * 5, 14 + (i % 2) * 2, 0, 2.2)
  },
  burgerTop: (h) => {
    sph(h, mat('#d8913c'), 0, 9, 0, 13, 7, 13)
    for (let i = 0; i < 6; i++) sph(h, mat('#fff8e1'), Math.cos(i) * 7, 15, Math.sin(i * 2) * 7, 1)
  },
  lettuce: (h, b) => {
    tor(b, mat('#7cb342'), 0, 8, 0, 17, 0.25)
  },
  pizzaHat: (h) => {
    const t = cyl(h, mat('#ffca28'), 2, 13, 0, 14, 2, 3)
    t.rotation.y = Math.PI
    for (let i = 0; i < 3; i++) cyl(h, mat('#d32f2f'), -2 + i * 3, 14.2, -3 + i * 3, 2.2, 1)
  },
  pepperoni: (h, b) => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const p = cyl(b, mat('#c62828'), Math.cos(a) * 14, 4 + (i % 2) * 6, Math.sin(a) * 14, 3, 1)
      p.rotation.x = Math.PI / 2
      p.rotation.z = a
    }
  },
  tacoShell: (h, b) => {
    const t = add(b, geo('taco', () => new THREE.TorusGeometry(1, 0.25, 8, 20, Math.PI)), mat('#ffca28'), 0, -4, 0, 18, 18, 18)
    t.rotation.y = Math.PI / 2
  },
  scoop: (h, b, c) => {
    sph(h, mat(c || '#fff59d'), 0, 11, 0, 10, 8, 10)
    const cn = cone(b, mat('#d7a86e'), 0, -14, 0, 12, 14)
    cn.rotation.x = Math.PI
  },
  cherry: (h) => {
    sph(h, mat('#e53935'), 0, 21, 0, 3.5)
    cyl(h, mat('#33691e'), 1, 26, 0, 0.4, 5)
  },
  donutRing: (h, b, c) => {
    tor(b, mat('#d7a86e'), 0, 0, 0, 18, 0.35)
    tor(b, mat(c || '#f06292'), 0, 3, 0, 18, 0.3)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      box(b, mat(['#ffeb3b', '#4fc3f7', '#fff'][i % 3]), Math.cos(a) * 18, 7, Math.sin(a) * 18, 1, 1, 3)
    }
  },
  popcornBucket: (h, b) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      box(b, mat(i % 2 ? '#e53935' : '#fff'), Math.cos(a) * 16, -6, Math.sin(a) * 16, 8.5, 20, 1.5).rotation.y = -a
    }
    for (let i = 0; i < 8; i++) sph(h, mat('#fff8e1'), Math.cos(i) * 6, 11 + (i % 3) * 2, Math.sin(i * 1.7) * 6, 3)
  },
  rind: (h, b) => {
    tor(b, mat('#2e7d32'), 0, -8, 0, 17, 0.3)
    tor(b, mat('#c5e1a5'), 0, -5, 0, 16.5, 0.15)
  },
  seeds: (h, b) => {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      sph(b, BLACK(), Math.cos(a) * 16.5, (Math.random() - 0.3) * 14, Math.sin(a) * 16.5, 1.2, 2, 1.2)
    }
  },
  eggShell: (h) => {
    const s = add(h, geo('half', () => new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat('#fffde7'), 0, 5, 0, 12.5, 10, 12.5)
    s.material.side = THREE.DoubleSide
  },
  toastSlice: (h, b) => {
    box(b, mat('#8d5a2b'), -12, 6, 0, 4, 42, 34)
    box(b, mat('#f3c98b'), -10, 6, 0, 4, 38, 30)
  },
  holes: (h, b) => {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2
      sph(b, mat('#f9a825'), Math.cos(a) * 15.5, (Math.random() - 0.4) * 16, Math.sin(a) * 15.5, 3, 3, 3)
    }
  },
  bumps: (h, b) => {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2
      sph(b, mat('#558b2f'), Math.cos(a) * 16, (Math.random() - 0.4) * 18, Math.sin(a) * 16, 1.6)
    }
  },
  cupWrapper: (h, b) => {
    const w = add(b, geo('cup', () => new THREE.CylinderGeometry(1, 0.8, 1, 14, 1, true)), mat('#ffffff'), 0, -9, 0, 18, 14, 18)
    w.material.side = THREE.DoubleSide
    for (let i = 0; i < 6; i++) sph(h, mat('#fff'), Math.cos(i) * 5, 10, Math.sin(i) * 5, 5)
  },
  comb: (h) => {
    for (let i = 0; i < 4; i++) sph(h, mat('#e53935'), -4 + i * 3, 12 + (i % 2) * 2, 0, 3, 4, 1.8)
  },
  wattle: (h) => {
    sph(h, mat('#e53935'), 11, -6, 0, 2.5, 4, 2)
  },
  shine: (h, b) => {
    sph(b, mat('#ffffff', 'glow'), 8, 8, 8, 3, 3, 3)
    sph(h, mat('#ffffff', 'glow'), 5, 6, 6, 1.6)
  },
  trafficCone: (h) => {
    cone(h, mat('#ff6d00'), 0, 20, 0, 9, 22)
    tor(h, WHITE(), 0, 18, 0, 5.2, 0.2)
    box(h, mat('#ff6d00'), 0, 9.5, 0, 18, 2, 18)
  },
  trashCan: (h, b) => {
    const c = add(b, geo('can', () => new THREE.CylinderGeometry(1, 0.9, 1, 16, 1, true)), mat('#90a4ae', 'metal'), 0, -4, 0, 19, 26, 19)
    c.material.side = THREE.DoubleSide
    cyl(h, mat('#90a4ae', 'metal'), 0, 12, 0, 12, 2)
    cyl(h, mat('#78909c', 'metal'), 0, 14, 0, 2, 3)
  },
  toilet: (h, b) => {
    cyl(b, WHITE(), 0, -14, 0, 16, 10)
    tor(b, WHITE(), 0, -8, 0, 15, 0.2)
    box(b, WHITE(), -18, 6, 0, 8, 26, 22)
  },
  cart: (h, b) => {
    const m = mat('#b0bec5', 'metal')
    for (const x of [-16, 16]) for (const z of [-16, 16]) cyl(b, m, x, -4, z, 0.8, 22)
    for (const y of [-14, 6]) {
      box(b, m, 0, y, 16, 32, 1, 1)
      box(b, m, 0, y, -16, 32, 1, 1)
      box(b, m, 16, y, 0, 1, 1, 32)
      box(b, m, -16, y, 0, 1, 1, 32)
    }
    for (const x of [-12, 12]) for (const z of [-12, 12]) sph(b, BLACK(), x, -18, z, 3)
  },
  cardboardBox: (h, b) => {
    box(b, mat('#b98a4e'), 0, -3, 0, 34, 26, 34)
    box(b, mat('#8d6e3f'), 0, 10.5, 0, 35, 1, 6)
  },
  pencil: (h) => {
    cyl(h, mat('#ffca28'), 0, 20, 0, 5, 22, 6)
    cone(h, mat('#f5deb3'), 0, 34, 0, 5, 7, 6)
    cone(h, BLACK(), 0, 37, 0, 1.5, 2, 6)
    cyl(h, mat('#f48fb1'), 0, 8.5, 0, 5, 3, 6)
  },
  bananaPeel: (h) => {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      const p = cone(h, mat('#ffe135'), Math.cos(a) * 6, 10, Math.sin(a) * 6, 3.5, 14, 6)
      p.rotation.z = Math.cos(a) * 1.4
      p.rotation.x = -Math.sin(a) * 1.4
    }
  },
  sockStripes: (h, b, c) => {
    for (const y of [-8, 0, 8]) tor(b, mat(c), 0, y, 0, 16.5, 0.18)
  },
  trafficLight: (h) => {
    box(h, BLACK(), 0, 22, 0, 8, 22, 8)
    ;['#ff1744', '#ffea00', '#00e676'].forEach((c, i) => sph(h, mat(c, 'glow'), 4.5, 29 - i * 7, 0, 2.6))
  },
  lampShade: (h) => {
    const l = add(h, geo('shade', () => new THREE.CylinderGeometry(0.5, 1, 1, 16, 1, true)), mat('#fff3c4', 'glow'), 0, 16, 0, 16, 14, 16)
    l.material.side = THREE.DoubleSide
  },
  chair: (h, b) => {
    const m = mat('#8d5a2b')
    box(b, m, 0, -16, 0, 34, 3, 34)
    box(b, m, -16, 4, 0, 3, 38, 34)
    for (const x of [-14, 14]) for (const z of [-14, 14]) box(b, m, x, -26, z, 3, 18, 3)
  },
  ballStripe: (h, b, c) => {
    tor(b, mat(c), 0, 0, 0, 17, 0.2, 0)
    tor(b, mat(c), 0, 0, 0, 17, 0.2, Math.PI / 2)
  },
  bigEyes: (h) => {
    for (const s of [-1, 1]) {
      sph(h, WHITE(), 7, 5, s * 5, 5)
      sph(h, BLACK(), 11, 5, s * 5, 2.5)
    }
  },
  drips: (h, b) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      sph(b, b.userData.bodyMat, Math.cos(a) * 14, -14, Math.sin(a) * 14, 3, 5, 3)
    }
  },
  wings: (h, b, c) => {
    for (const s of [-1, 1]) {
      const wgt = cone(b, mat(c || '#c0ca33'), -8, 14, s * 16, 5, 24, 3)
      wgt.rotation.x = s * 1.1
      wgt.rotation.z = 0.5
      wgt.scale.x = 12
      wgt.userData.flap = s
    }
  },
  butterflyWings: (h, b, c) => {
    for (const s of [-1, 1]) {
      const w1 = sph(b, mat(c, 'glow'), -8, 16, s * 18, 10, 14, 2)
      w1.rotation.x = s * 0.5
      w1.userData.flap = s
      sph(b, mat('#ff80ab'), -8, 2, s * 15, 6, 8, 2).rotation.x = s * 0.5
    }
  },
  spikes: (h, b, c) => {
    for (let i = 0; i < 5; i++) cone(b, mat(c), -14 + i * 2, 14 - i * 5, 0, 3, 7).rotation.z = 0.8
  },
  horns: (h) => {
    for (const s of [-1, 1]) {
      const hn = cone(h, mat('#fff8e1'), -2, 12, s * 6, 2.5, 10)
      hn.rotation.x = -s * 0.5
    }
  },
  ribs: (h, b, c) => {
    for (const y of [-6, 0, 6]) tor(b, mat(c), 3, y, 0, 16.8, 0.08)
    sph(h, BLACK(), 8, 3, 4, 3)
    sph(h, BLACK(), 8, 3, -4, 3)
  },
  sheet: (h, b) => {
    const s = add(b, geo('sheet', () => new THREE.ConeGeometry(1, 1, 18, 1, true)), mat('#ffffff', 'ghost'), 0, 12, 0, 22, 56, 22)
    s.material.side = THREE.DoubleSide
    for (const z of [-4, 4]) sph(h, BLACK(), 10, 3, z, 2.2)
  },
  fangs: (h) => {
    for (const s of [-1, 1]) cone(h, WHITE(), 14, -3, s * 2, 0.9, 3).rotation.z = Math.PI
  },
  wolfEars: (h, b, c) => {
    for (const s of [-1, 1]) cone(h, mat(c), -2, 13, s * 6, 3.5, 9, 4)
  },
  fur: (h, b, c) => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      cone(b, mat(c), Math.cos(a) * 15, 8, Math.sin(a) * 15, 2.5, 7, 5).rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8)
    }
  },
  bandages: (h, b, c) => {
    for (const y of [-10, -4, 2, 8]) tor(b, mat(c), 0, y, 0, 16.5, 0.14, Math.PI / 2 + y * 0.02)
    for (const y of [-3, 4]) tor(h, mat(c), 0, y, 0, 11.3, 0.12, Math.PI / 2 + 0.2)
  },
  flatTop: (h, b, c) => {
    box(h, mat(c), 0, 10, 0, 16, 5, 18)
  },
  bolts: (h) => {
    for (const s of [-1, 1]) cyl(h, mat('#9e9e9e', 'metal'), -2, -6, s * 12, 1.5, 6).rotation.x = Math.PI / 2
  },
  mushroomCap: (h, b, c) => {
    sph(h, mat(c), 0, 8, 0, 17, 9, 17)
    for (let i = 0; i < 6; i++) sph(h, WHITE(), Math.cos(i) * 10, 14, Math.sin(i * 1.6) * 10, 2.5, 1, 2.5)
  },
  frogEyes: (h) => {
    for (const s of [-1, 1]) {
      sph(h, mat('#66bb6a'), 3, 10, s * 6, 5)
      sph(h, WHITE(), 6, 11, s * 6, 3.5)
      sph(h, BLACK(), 8.5, 11, s * 6, 1.8)
    }
  },
  catEars: (h, b) => {
    for (const s of [-1, 1]) {
      cone(h, b.userData.bodyMat, -1, 12, s * 6, 4, 8, 4)
      cone(h, mat('#ff80ab'), 0, 12, s * 6, 2.2, 5, 4)
    }
  },
  whiskers: (h) => {
    for (const s of [-1, 1]) for (const y of [-1, 1]) box(h, BLACK(), 15, y, s * 5, 0.5, 0.5, 8).rotation.x = s * y * 0.2
  },
  dogEars: (h, b, c) => {
    for (const s of [-1, 1]) sph(h, mat(c), -2, 1, s * 11, 3.5, 8, 2).rotation.x = s * 0.3
  },
  belly: (h, b) => {
    sph(b, WHITE(), 7, -2, 0, 11, 14, 12)
    sph(h, WHITE(), 5, -2, 0, 8)
  },
  fin: (h, b) => {
    const f = cone(b, b.userData.bodyMat, -5, 20, 0, 7, 16, 4)
    f.scale.z = 2
    f.rotation.z = 0.35
  },
  teeth: (h) => {
    for (let i = 0; i < 4; i++) cone(h, WHITE(), 13 + i, -3.5, -3 + i * 2, 0.8, 2.5).rotation.z = Math.PI
  },
  ridges: (h, b) => {
    for (let i = 0; i < 6; i++) sph(b, mat('#33691e'), -12 + i * 4, 15, 0, 2.5, 3, 2.5)
  },
  shell: (h, b, c) => {
    const s = sph(b, mat(c), -6, 5, 0, 15, 13, 17)
    s.rotation.z = 0.5
    for (let i = 0; i < 5; i++) sph(b, mat('#4e342e'), -14 + i * 2, 10 + (i % 2) * 4, -8 + i * 4, 3, 1, 3)
  },
  stripes: (h, b, c) => {
    for (const x of [-8, 0, 8]) {
      const t = tor(b, mat(c), x, 0, 0, 16 - Math.abs(x) * 0.4, 0.22, 0)
      t.rotation.y = Math.PI / 2
    }
  },
  legs: (h, b, c) => {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const l = cyl(b, mat(c), -6 + i * 4, -8, s * 20, 0.9, 20)
      l.rotation.x = s * 1.1
    }
  },
  claws: (h, b) => {
    for (const s of [-1, 1]) {
      sph(b, mat('#d32f2f'), 14, 2, s * 20, 6, 4, 5)
      cone(b, mat('#d32f2f'), 20, 4, s * 20, 2.5, 8).rotation.z = -1.2
    }
  },
  tentacles: (h, b) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const t = cyl(b, b.userData.bodyMat, Math.cos(a) * 12, -16, Math.sin(a) * 12, 2.5, 16)
      t.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7)
      t.userData.wiggle = i
    }
  },
  suit: (h, b, c) => {
    const s = add(b, geo('suit', () => new THREE.CylinderGeometry(1, 1.05, 1, 20, 1, true)), mat(c), 0, -2, 0, 17, 22, 17)
    s.material.side = THREE.DoubleSide
    box(b, WHITE(), 14, 2, 0, 5, 16, 8)
  },
  bowtie: (h, b) => {
    for (const s of [-1, 1]) cone(b, mat('#e53935'), 16.5, 12, s * 3, 2.5, 5, 4).rotation.x = (s * Math.PI) / 2
    sph(b, mat('#b71c1c'), 16.8, 12, 0, 1.5)
  },
  tophat: (h) => {
    cyl(h, BLACK(), 0, 10, 0, 14, 1.2)
    cyl(h, BLACK(), 0, 18, 0, 8.5, 15)
    tor(h, mat('#b71c1c'), 0, 12, 0, 8.6, 0.12)
  },
  pixelHair: (h) => {
    const m = mat('#6d4c41', 'pixel')
    for (let i = 0; i < 6; i++) box(h, m, -6 + (i % 3) * 5, 10 + Math.floor(i / 3) * 3, -5 + (i % 2) * 8, 5, 5, 5)
  },
  pixelSword: (h, b) => {
    const m = mat('#b0bec5', 'pixel')
    box(b, m, -2, 14, 18, 3, 28, 3)
    box(b, mat('#8d6e63', 'pixel'), -2, 0, 18, 9, 3, 3)
  },
  errorSign: (h) => {
    const s = cyl(h, mat('#e53935', 'glow'), 0, 26, 0, 10, 2, 8)
    s.rotation.z = Math.PI / 2
    box(h, WHITE(), 1.2, 26, 0, 1, 12, 2.5).rotation.x = 0.785
    box(h, WHITE(), 1.2, 26, 0, 1, 12, 2.5).rotation.x = -0.785
    cyl(h, mat('#9e9e9e'), 0, 17, 0, 0.8, 8)
  },
  spinner: (h) => {
    const r = add(h, geo('spin', () => new THREE.TorusGeometry(1, 0.2, 8, 20, Math.PI * 1.5)), mat('#4cc9f0', 'glow'), 0, 22, 0, 8, 8, 8)
    r.userData.spin = true
  },
  controllerHat: (h) => {
    box(h, mat('#37474f'), 0, 14, 0, 12, 5, 22)
    for (const s of [-1, 1]) sph(h, mat('#455a64'), 0, 12, s * 12, 5)
    ;['#e53935', '#43a047', '#1e88e5', '#fdd835'].forEach((c, i) => sph(h, mat(c, 'glow'), 3 + (i % 2) * 2, 17, 6 + Math.floor(i / 2) * 2, 1.2))
  },
  arcadeCabinet: (h, b) => {
    box(b, mat('#512da8'), -18, 10, 0, 6, 60, 30)
    box(b, mat('#00e5ff', 'glow'), -14.5, 22, 0, 1, 14, 22)
    box(b, mat('#7e57c2'), -10, -4, 0, 14, 4, 30)
  },
  backwardsCap: (h, b, c) => {
    sph(h, mat(c), 0, 6, 0, 11.8, 7, 11.8)
    box(h, mat(c), -12, 6, 0, 9, 1.2, 10)
  },
  headset: (h) => {
    tor(h, BLACK(), 0, 2, 0, 12, 0.1, 0)
    for (const s of [-1, 1]) cyl(h, BLACK(), 0, 0, s * 12, 4, 3).rotation.x = Math.PI / 2
    cyl(h, BLACK(), 6, -5, 12, 0.5, 12).rotation.z = 1.2
  },
  stopwatch: (h, b) => {
    const s = cyl(b, mat('#eceff1', 'metal'), 12, 6, 12, 4, 2)
    s.rotation.x = Math.PI / 2
  },
  goblinEars: (h, b) => {
    for (const s of [-1, 1]) {
      const e = cone(h, b.userData.bodyMat, 0, 4, s * 15, 3.5, 14, 6)
      e.rotation.x = (s * Math.PI) / 2
    }
  },
  trophy: (h, b) => {
    const g = mat('#ffd700', 'gold')
    cyl(b, g, 10, -4, 20, 3, 4)
    add(b, geo('cupT', () => new THREE.CylinderGeometry(1, 0.5, 1, 14)), g, 10, 4, 20, 6, 10, 6)
  },
  questionMark: (h) => {
    const m = mat('#b388ff', 'glow')
    const arc = add(h, geo('qarc', () => new THREE.TorusGeometry(1, 0.28, 8, 16, Math.PI * 1.4)), m, 0, 32, 0, 6, 6, 6)
    arc.rotation.z = -0.6
    arc.rotation.y = Math.PI / 2
    cyl(h, m, 0, 23, 0, 1.6, 6)
    sph(h, m, 0, 16, 0, 2)
  },
  mysteryBox: (h) => {
    box(h, mat('#ffd23f', 'glow'), 0, 16, 0, 16, 16, 16)
    box(h, mat('#ff6f00'), 0, 16, 0, 16.5, 2, 16.5)
  },
  hoodie: (h, b, c) => {
    sph(h, mat(c), -3, 2, 0, 12.5, 13, 12.5)
    const s = add(b, geo('suit', () => new THREE.CylinderGeometry(1, 1.05, 1, 20, 1, true)), mat(c), 0, 0, 0, 17.5, 26, 17.5)
    s.material.side = THREE.DoubleSide
  },
  cap: (h, b, c) => {
    sph(h, mat(c), 0, 6, 0, 11.8, 7, 11.8)
    box(h, mat(c), 12, 6, 0, 9, 1.2, 10)
    sph(h, WHITE(), 8, 9, 0, 2.5, 2.5, 1)
  },
  mustache: (h) => {
    for (const s of [-1, 1]) sph(h, mat('#2b1b0e'), 14, -0.5, s * 3, 3.2, 1.6, 2.6)
  },
  visor: (h) => {
    sph(h, mat('#9fe6ff', 'glass'), 9, 3, 0, 5, 4, 8)
    sph(h, mat('#ffffff', 'glow'), 12, 5, 3, 1.2)
  },
  glowEyes: (h) => {
    for (const s of [-1, 1]) sph(h, mat('#ffffff', 'glow'), 9.8, 4.3, s * 4.6, 2.4)
  },
  jesterHat: (h, b, c) => {
    // two floppy points, one red and one blue, with golden bells
    for (const [s, col] of [[-1, '#e53935'], [1, c || '#1e63d6']]) {
      const pt = cone(h, mat(col), -2, 16, s * 9, 5, 18)
      pt.rotation.x = s * 1.1
      sph(h, mat('#ffd23f', 'gold'), -2, 21, s * 19, 2.6)
    }
    sph(h, mat('#e53935'), 0, 8, 0, 11.6, 6, 11.6)
  },
  bigGrin: (h) => {
    box(h, WHITE(), 11.5, -5, 0, 2, 4, 14)
    for (let i = -2; i <= 2; i++) box(h, BLACK(), 12.6, -5, i * 2.8, 0.4, 4.2, 0.5)
  },
  bunnyEars: (h, b, c) => {
    for (const s of [-1, 1]) {
      const e = sph(h, mat(c), -2, 20, s * 5, 3, 12, 2.5)
      e.rotation.x = s * 0.2
    }
  },
  buttonEye: (h) => {
    const bt = cyl(h, BLACK(), 9.8, 4.3, 4.6, 3.3, 1)
    bt.rotation.z = Math.PI / 2
    for (const [y, z] of [[5, 5.4], [3.6, 3.8]]) sph(h, WHITE(), 10.4, y, z, 0.6)
  },
  comedyMask: (h, b, c) => {
    const m = sph(h, mat(c || '#ffffff'), 8, 1, 0, 5, 9, 10)
    m.scale.x = 4
    for (const s of [-1, 1]) sph(h, BLACK(), 12, 4, s * 4, 1.6, 1, 1.8)
    box(h, BLACK(), 12.4, -3, 0, 0.5, 1.2, 7)
  },
  glasses: (h) => {
    for (const s of [-1, 1]) {
      const t = tor(h, BLACK(), 10.5, 3, s * 4.5, 3, 0.12, 0)
      t.rotation.y = Math.PI / 2
    }
  },
}

// ---------------------------------------------------------------- duck

export function buildDuck(costumeKey = 'rookie', opts = {}) {
  const cos = COSTUMES[costumeKey] || COSTUMES.rookie
  const kind = cos.mat || 'normal'
  const bodyMat = mat(cos.body, kind === 'normal' ? 'normal' : kind)
  const beakMat = kind === 'invisible' ? bodyMat : mat(cos.beak || '#ff8f1f', kind === 'gold' ? 'gold' : 'normal')
  const root = new THREE.Group()
  const rig = new THREE.Group()
  root.add(rig)
  const body = new THREE.Group()
  body.position.set(0, 18, 0)
  body.userData.bodyMat = bodyMat
  rig.add(body)
  const head = new THREE.Group()
  head.position.set(8, 37, 0)
  rig.add(head)

  sph(body, bodyMat, 0, 0, 0, 17, 14, 15)
  const tail = cone(body, bodyMat, -16, 7, 0, 5, 10)
  tail.rotation.z = 1.1
  const wingL = sph(body, bodyMat, -2, 1, 14, 9, 6, 3)
  const wingR = sph(body, bodyMat, -2, 1, -14, 9, 6, 3)
  wingL.rotation.x = -0.2
  wingR.rotation.x = 0.2
  sph(head, bodyMat, 0, 0, 0, 11)
  const beak = sph(head, beakMat, 11, -2, 0, 7, 2.6, 5.5)
  sph(head, beakMat, 10, -4.4, 0, 6, 1.6, 4.6)
  const eyes = new THREE.Group()
  head.add(eyes)
  if (!['robot', 'neonrobot', 'sheet'].includes(costumeKey) && kind !== 'invisible') {
    for (const s of [-1, 1]) {
      sph(eyes, WHITE(), 7, 4, s * 4.5, 3.2)
      sph(eyes, BLACK(), 9.3, 4.3, s * 4.6, 1.7)
      sph(eyes, WHITE(), 10.2, 5.1, s * 4.2, 0.6)
    }
  }
  const feet = []
  for (const s of [-1, 1]) {
    const f = sph(rig, beakMat, 4, 1.5, s * 7, 7, 1.8, 4)
    feet.push(f)
  }

  for (const a of cos.acc) {
    const fn = ACC[a]
    if (fn) fn(head, body, cos.accColor, undefined, kind !== 'normal' && a === 'knightHelmet' ? bodyMat : undefined)
  }

  // hammer
  const hammerPivot = new THREE.Group()
  hammerPivot.position.set(6, 22, -12)
  rig.add(hammerPivot)

  // balloons
  const balloons = new THREE.Group()
  root.add(balloons)

  const scale = cos.scale || 1
  root.scale.setScalar(scale)

  const duck = { root, rig, body, head, beak, eyes, wingL, wingR, feet, tail, hammerPivot, balloons, costume: costumeKey, baseScale: scale, hammerType: null, balloonCount: -1, color: opts.color }
  if (opts.hammer !== false) setHammer(duck, opts.hammer || 'mallet')
  return duck
}

const HAMMER_LOOK = {
  mallet: ['#8a5a2b', '#9aa1ad', 1],
  sledge: ['#5d4037', '#4b515e', 1.45],
  squeaky: ['#ffd23f', '#ff4d6d', 1],
  pan: ['#3e2723', '#2a2a33', 1],
  fish: ['#6fa8dc', '#6fa8dc', 1],
  golden: ['#ffd700', '#ffd700', 1.4],
  king: ['#ffb300', '#ffd700', 1.8],
}

export function setHammer(duck, type) {
  if (duck.hammerType === type) return
  duck.hammerType = type
  const p = duck.hammerPivot
  while (p.children.length) p.remove(p.children[0])
  const [handle, headColor, k] = HAMMER_LOOK[type] || HAMMER_LOOK.mallet
  const gold = type === 'golden' || type === 'king'
  const L = 34 * k
  const hm = cyl(p, mat(handle, gold ? 'gold' : 'normal'), L / 2, 0, 0, 1.6 * k, L)
  hm.rotation.z = Math.PI / 2
  if (type === 'pan') {
    const pan = cyl(p, mat(headColor, 'metal'), L + 10, 0, 0, 12, 2)
    pan.rotation.x = Math.PI / 2
  } else if (type === 'fish') {
    sph(p, mat('#6fa8dc'), L + 6, 0, 0, 13, 6, 4)
    cone(p, mat('#6fa8dc'), L - 8, 0, 0, 6, 8, 4).rotation.z = Math.PI / 2
    sph(p, WHITE(), L + 14, 2, 3, 1.8)
  } else {
    const head = cyl(p, mat(headColor, gold ? 'gold' : type === 'squeaky' ? 'normal' : 'metal'), L, 0, 0, 7 * k, 20 * k)
    head.rotation.x = Math.PI / 2
    if (type === 'squeaky') {
      tor(p, mat('#ffd23f'), L, 0, 7 * k, 7 * k, 0.15, 0)
      tor(p, mat('#ffd23f'), L, 0, -7 * k, 7 * k, 0.15, 0)
    }
    if (gold) sph(p, mat('#ffffff', 'glow'), L, 0, 0, 3)
  }
}

const balloonGeo = () => geo('balloon', () => {
  const g = new THREE.SphereGeometry(1, 16, 12)
  g.scale(1, 1.2, 1)
  return g
})

export function setBalloons(duck, n, color) {
  if (duck.balloonCount === n) return
  duck.balloonCount = n
  const g = duck.balloons
  while (g.children.length) g.remove(g.children[0])
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.4
    const spread = n > 1 ? 9 : 0
    const bx = Math.cos(a) * spread - 4
    const bz = Math.sin(a) * spread
    const by = 82 + (i % 2) * 6
    const b = add(g, balloonGeo(), mat(color, 'normal'), bx, by, bz, 8)
    b.userData.base = [bx, by, bz]
    b.userData.i = i
    const s = new THREE.Mesh(geo('string', () => new THREE.CylinderGeometry(0.3, 0.3, 1, 4)), mat('#ffffff', 'basic'))
    const from = new THREE.Vector3(0, 48, 0)
    const to = new THREE.Vector3(bx, by - 8, bz)
    const dir = to.clone().sub(from)
    s.scale.set(1, dir.length(), 1)
    s.position.copy(from).add(to).multiplyScalar(0.5)
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    g.add(s)
  }
}

// Animate the duck for this frame. `s` = { walk, swing (radians), spin, flip, emote, t, air }
export function poseDuck(duck, s) {
  const bob = Math.sin(s.walk) * 1.5
  duck.rig.position.y = Math.abs(bob)
  duck.feet[0].position.x = 4 + Math.sin(s.walk) * 4
  duck.feet[1].position.x = 4 - Math.sin(s.walk) * 4
  duck.hammerPivot.rotation.set(0, 0, 0)
  duck.hammerPivot.rotation.y = s.swing
  duck.hammerPivot.rotation.z = 0.5
  duck.rig.rotation.set(0, 0, 0)
  duck.head.rotation.set(0, 0, 0)
  duck.wingL.rotation.x = -0.2
  duck.wingR.rotation.x = 0.2
  const e = s.emote
  if (e === 'wave') {
    duck.wingL.rotation.x = -1.2 - Math.sin(s.t * 18) * 0.5
  } else if (e === 'spin') {
    duck.rig.rotation.y = s.t * 14
  } else if (e === 'quack') {
    duck.head.rotation.z = Math.sin(s.t * 30) * 0.2
  } else if (e === 'flop') {
    duck.rig.rotation.z = -Math.PI / 2
    duck.rig.position.y = 14
  }
  if (s.flip) duck.rig.rotation.z = -s.flip * Math.PI * 2
  if (s.spin) {
    duck.rig.rotation.x = s.spin
    duck.rig.rotation.z += s.spin * 0.6
  }
  if (s.air) {
    duck.wingL.rotation.x = -0.6 - Math.sin(s.t * 25) * 0.6
    duck.wingR.rotation.x = 0.6 + Math.sin(s.t * 25) * 0.6
  }
  duck.root.traverse((o) => {
    if (o.userData.flap) o.rotation.y = Math.sin(s.t * 12) * 0.3 * o.userData.flap
    if (o.userData.spin) o.rotation.z = s.t * 6
    if (o.userData.cape) o.rotation.x = Math.sin(s.t * 8) * 0.15
    if (o.userData.wiggle !== undefined) o.rotation.y = Math.sin(s.t * 6 + o.userData.wiggle) * 0.4
  })
  duck.balloons.children.forEach((b) => {
    if (!b.userData.base) return
    const [x, y, z] = b.userData.base
    b.position.set(x + Math.sin(s.t * 2 + b.userData.i) * 1.5, y + Math.sin(s.t * 3 + b.userData.i) * 1.5, z)
  })
}

// ---------------------------------------------------------------- pets

export function buildPet(key) {
  const pet = PET_MAP[key]
  if (!pet) return null
  const g = new THREE.Group()
  const kind = pet.mat || 'normal'
  const m = mat(pet.color, kind)
  const s = 0.5
  const inner = new THREE.Group()
  inner.scale.setScalar(s)
  g.add(inner)
  switch (pet.kind) {
    case 'duckling':
    case 'chick': {
      sph(inner, m, 0, 14, 0, 14, 12, 12)
      sph(inner, m, 8, 30, 0, 9)
      sph(inner, mat('#ff8f1f'), 17, 29, 0, 5, 2, 4)
      for (const z of [-3.5, 3.5]) sph(inner, BLACK(), 14, 33, z, 1.6)
      break
    }
    case 'puppy':
    case 'kitten':
    case 'bunny': {
      sph(inner, m, 0, 14, 0, 14, 11, 11)
      sph(inner, m, 12, 26, 0, 10)
      for (const z of [-4, 4]) sph(inner, BLACK(), 21, 28, z, 1.6)
      sph(inner, mat('#333'), 22, 25, 0, 1.8)
      if (pet.kind === 'puppy') for (const z of [-9, 9]) sph(inner, mat('#6d4c41'), 10, 26, z, 3, 7, 2)
      if (pet.kind === 'kitten') for (const z of [-5, 5]) cone(inner, m, 10, 37, z, 3, 7, 4)
      if (pet.kind === 'bunny') for (const z of [-4, 4]) sph(inner, m, 8, 42, z, 2.5, 10, 2.5)
      cone(inner, m, -14, 20, 0, 2, 10).rotation.z = 1
      break
    }
    case 'frog':
      sph(inner, m, 0, 12, 0, 16, 10, 14)
      for (const z of [-6, 6]) {
        sph(inner, m, 8, 22, z, 5)
        sph(inner, BLACK(), 12, 23, z, 2)
      }
      break
    case 'bee':
      sph(inner, m, 0, 30, 0, 12, 10, 10)
      for (const x of [-4, 4]) tor(inner, BLACK(), x, 30, 0, 10, 0.2, 0).rotation.y = Math.PI / 2
      for (const z of [-10, 10]) sph(inner, mat('#ffffff', 'ghost'), -2, 40, z, 8, 3, 5)
      break
    case 'penguin':
      sph(inner, m, 0, 16, 0, 12, 16, 12)
      sph(inner, WHITE(), 6, 14, 0, 8, 12, 9)
      sph(inner, mat('#ff8f1f'), 13, 24, 0, 4, 2, 3)
      break
    case 'slime':
      sph(inner, mat(pet.color, 'slime'), 0, 10, 0, 16, 10, 16)
      for (const z of [-5, 5]) sph(inner, BLACK(), 12, 14, z, 2)
      break
    case 'ghost': {
      const gh = sph(inner, mat('#ffffff', 'ghost'), 0, 30, 0, 14, 18, 14)
      gh.userData.float = true
      for (const z of [-4, 4]) sph(inner, BLACK(), 12, 34, z, 2.2)
      break
    }
    case 'drone':
      box(inner, mat('#90a4ae', 'metal'), 0, 34, 0, 20, 8, 20)
      sph(inner, mat('#00e5ff', 'glow'), 10, 34, 0, 3)
      for (const x of [-12, 12]) for (const z of [-12, 12]) cyl(inner, BLACK(), x, 40, z, 6, 1)
      break
    case 'dragon':
      sph(inner, m, 0, 16, 0, 13, 11, 11)
      sph(inner, m, 13, 28, 0, 9)
      for (const z of [-1, 1]) {
        const wg = cone(inner, mat('#ffb300'), -4, 30, z * 12, 4, 18, 3)
        wg.rotation.x = z * 1
        wg.userData.flap = z
      }
      for (const z of [-3.5, 3.5]) sph(inner, mat('#ffeb3b', 'glow'), 20, 31, z, 1.6)
      break
    case 'unicorn':
      sph(inner, m, 0, 18, 0, 15, 11, 10)
      sph(inner, m, 16, 30, 0, 8)
      cone(inner, mat('#ffd700', 'gold'), 18, 42, 0, 2, 10)
      for (const x of [-8, 8]) for (const z of [-5, 5]) cyl(inner, m, x, 6, z, 2.5, 12)
      sph(inner, mat('#b388ff'), 8, 36, 0, 5, 3, 3)
      break
    default:
      sph(inner, m, 0, 12, 0, 12)
  }
  g.userData.pet = pet
  return g
}

// A big friendly rubber duck for the ??? event (no hammer, no costume).
export function buildGiantDuck() {
  const d = buildDuck('rubberduck', { hammer: false })
  d.root.scale.setScalar(5.5)
  return d
}
