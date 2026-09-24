import * as THREE from 'three'
import { CX, CY, H, HAMMERS, TILE, W } from './data'
import { animateMaterials, buildDuck, buildGiantDuck, buildPet, disposeScene, mat, poseDuck, setBalloons, setHammer } from './duck'
import { radiusOf } from './engine'
import { loadSave } from './save'

// Engine (x, y, z) → three.js (X, Y, Z) = (x - CX, z, y - CY)
const v3 = (x, y, z = 0) => new THREE.Vector3(x - CX, z, y - CY)

export function makeSky(night) {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  if (night) {
    grad.addColorStop(0, '#0b1033')
    grad.addColorStop(1, '#3a1d6e')
  } else {
    grad.addColorStop(0, '#48b8ff')
    grad.addColorStop(0.6, '#9fe3ff')
    grad.addColorStop(1, '#ffe0f4')
  }
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function addLights(scene, night) {
  scene.add(new THREE.HemisphereLight(night ? '#8899ff' : '#ffffff', night ? '#221144' : '#88aacc', night ? 1.1 : 1.5))
  const sun = new THREE.DirectionalLight('#ffffff', night ? 1.2 : 2.2)
  sun.position.set(-300, 800, 400)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const sc = sun.shadow.camera
  sc.left = -650
  sc.right = 650
  sc.top = 500
  sc.bottom = -500
  sc.near = 100
  sc.far = 2000
  scene.add(sun)
  return sun
}

export function makeClouds(scene, count, y, spread) {
  const clouds = []
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.9 })
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group()
    for (let j = 0; j < 5; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m)
      s.scale.setScalar(30 + Math.random() * 30)
      s.position.set(j * 35 - 70, Math.random() * 15, Math.random() * 30)
      g.add(s)
    }
    g.position.set((Math.random() - 0.5) * spread, y + Math.random() * 60, (Math.random() - 0.5) * spread * 0.7)
    g.userData.v = 8 + Math.random() * 15
    scene.add(g)
    clouds.push(g)
  }
  return clouds
}

function sync(list, map, parent, create) {
  const seen = new Set()
  for (const item of list) {
    seen.add(item)
    if (!map.has(item)) {
      const obj = create(item)
      parent.add(obj)
      map.set(item, obj)
    }
  }
  for (const [item, obj] of map) {
    if (!seen.has(item)) {
      parent.remove(obj)
      map.delete(item)
    }
  }
}

function questionTexture(text, bg, fg) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  g.fillStyle = bg
  g.fillRect(0, 0, 64, 64)
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 6
  g.strokeRect(3, 3, 58, 58)
  g.fillStyle = fg
  g.font = 'bold 44px sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 32, 36)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function comfortMode() {
  return !!loadSave().settings?.comfort
}

export function createMatchView(renderer, w) {
  const scene = new THREE.Scene()
  scene.background = makeSky(w.night)
  addLights(scene, w.night)
  // Sickness mode: a flat isometric camera that never shakes or zooms.
  const comfort = comfortMode()
  const camera = comfort ? new THREE.OrthographicCamera(-800, 800, 450, -450, 10, 8000) : new THREE.PerspectiveCamera(42, 16 / 9, 10, 5000)

  if (w.night) {
    const g = new THREE.BufferGeometry()
    const pts = []
    for (let i = 0; i < 400; i++) pts.push((Math.random() - 0.5) * 4000, -600 - Math.random() * 400, (Math.random() - 0.5) * 3000)
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 4 })))
  }
  const clouds = makeClouds(scene, 14, -380, 2200)

  // lava
  const lava = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: '#ff5a00', emissive: '#ff3d00', emissiveIntensity: 0.9 }),
  )
  lava.rotation.x = -Math.PI / 2
  lava.visible = false
  scene.add(lava)

  // floor tiles
  const floor = new THREE.Group()
  scene.add(floor)
  const tiles = w.arena.tiles
  const topMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE - 1.5, 16, TILE - 1.5), new THREE.MeshStandardMaterial({ roughness: 0.55 }), tiles.length)
  const baseMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, 44, TILE), new THREE.MeshStandardMaterial({ color: w.arena.dark ? '#2a1846' : '#8b5a2b', roughness: 0.9 }), tiles.length)
  topMesh.receiveShadow = true
  baseMesh.receiveShadow = true
  floor.add(topMesh, baseMesh)
  const tmp = new THREE.Object3D()
  const col = new THREE.Color()
  const white = new THREE.Color('#ffffff')
  const red = new THREE.Color('#ff2d2d')

  function updateTiles(t) {
    tiles.forEach((tile, i) => {
      const gone = tile.state === 'gone'
      const y = tile.drop
      tmp.position.set(tile.x - CX, -8 + y, tile.y - CY)
      tmp.scale.setScalar(gone ? 0.0001 : 1)
      if (tile.state === 'warn') tmp.position.y += Math.sin(t * 60) * 1.5
      tmp.updateMatrix()
      topMesh.setMatrixAt(i, tmp.matrix)
      tmp.position.y = -38 + y
      tmp.scale.set(gone ? 0.0001 : 0.96, 1, gone ? 0.0001 : 0.96)
      tmp.updateMatrix()
      baseMesh.setMatrixAt(i, tmp.matrix)
      col.set(tile.color)
      if (tile.alt) col.offsetHSL(0, 0, 0.05)
      if (tile.state === 'warn') col.lerp(Math.sin(t * 20) > 0 ? red : white, 0.6)
      if (tile.state === 'falling') col.lerp(red, 0.4)
      topMesh.setColorAt(i, col)
    })
    topMesh.instanceMatrix.needsUpdate = true
    baseMesh.instanceMatrix.needsUpdate = true
    topMesh.instanceColor.needsUpdate = true
  }

  // moving platforms
  const movers = w.arena.movers.map((s) => {
    const g = new THREE.Group()
    const woodTop = mat('#ffd166')
    const woodSide = mat('#b5651d')
    let top
    let base
    if (s.k === 'c') {
      top = new THREE.Mesh(new THREE.CylinderGeometry(s.r, s.r, 12, 32), woodTop)
      base = new THREE.Mesh(new THREE.CylinderGeometry(s.r * 0.95, s.r * 0.6, 26, 32), woodSide)
    } else {
      top = new THREE.Mesh(new THREE.BoxGeometry(s.w, 12, s.h), woodTop)
      base = new THREE.Mesh(new THREE.BoxGeometry(s.w * 0.9, 26, s.h * 0.9), woodSide)
    }
    top.position.y = -6
    base.position.y = -25
    top.receiveShadow = true
    g.add(top, base)
    scene.add(g)
    return { s, g }
  })

  // ducks
  const ducks = new Map()
  for (const p of w.players) {
    const d = buildDuck(p.costume, { hammer: p.hammer })
    scene.add(d.root)
    const shield = new THREE.Mesh(new THREE.SphereGeometry(34, 20, 14), new THREE.MeshStandardMaterial({ color: '#8ff5ff', transparent: true, opacity: 0.3, emissive: '#4ff', emissiveIntensity: 0.4 }))
    shield.position.y = 26
    shield.visible = false
    d.root.add(shield)
    d.shield = shield
    let pet = null
    if (p.pet) {
      pet = buildPet(p.pet)
      if (pet) {
        scene.add(pet)
        pet.position.copy(v3(p.x - 30, p.y))
      }
    }
    ducks.set(p, { d, pet })
  }

  // hazards & pickups
  const hazardGroup = new THREE.Group()
  scene.add(hazardGroup)
  const meteorMap = new Map()
  const rainMap = new Map()
  const bombMap = new Map()
  const boxMap = new Map()
  const crateMap = new Map()
  const goldMap = new Map()
  const boxTex = questionTexture('?', '#ffd23f', '#ff3d7f')
  const crateTex = questionTexture('🔨', '#c98b3c', '#000')
  const ring = (r, color) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.85, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide }))
    m.rotation.x = -Math.PI / 2
    return m
  }
  const bigHammer = () => {
    const g = new THREE.Group()
    const h = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 140, 12), mat('#8a5a2b'))
    h.position.y = 70
    const head = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 80, 20), mat('#ff4d6d'))
    head.rotation.z = Math.PI / 2
    head.position.y = 150
    head.castShadow = true
    g.add(h, head)
    return g
  }
  let giant = null

  // particles
  const MAXP = 400
  const partMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshBasicMaterial(), MAXP)
  scene.add(partMesh)

  const view = { scene, camera, w, shakeX: 0, shakeY: 0 }

  // Frame the arena itself (tiles plus where moving platforms travel).
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  const grow = (x, y, r) => {
    minX = Math.min(minX, x - r)
    maxX = Math.max(maxX, x + r)
    minY = Math.min(minY, y - r)
    maxY = Math.max(maxY, y + r)
  }
  for (const t of tiles) grow(t.x, t.y, TILE / 2)
  for (const m of w.arena.movers) {
    const r = m.r || Math.max(m.w, m.h) / 2
    grow(m.bx + m.mv.ax, m.by + m.mv.ay, r)
    grow(m.bx - m.mv.ax, m.by - m.mv.ay, r)
  }
  const focus = { x: (minX + maxX) / 2, y: (minY + maxY) / 2, w: Math.min(W, maxX - minX) + 140, h: Math.min(H, maxY - minY) + 160 }
  view.focus = focus

  view.resize = (width, height) => {
    if (comfort) {
      const aspect = width / height
      const half = Math.max((focus.h / 2) * 0.95, focus.w / 2 / aspect, 300)
      Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half })
      view.dist = 2500
      camera.updateProjectionMatrix()
      return
    }
    camera.aspect = width / height
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    view.dist = Math.max(focus.w / 2 / tan / camera.aspect, focus.h / 2 / tan / 0.9, 520)
    camera.updateProjectionMatrix()
  }

  view.update = (dt) => {
    const time = performance.now() / 1000
    animateMaterials(time)
    // camera with shake
    const sh = comfort ? 0 : w.shake
    const d = view.dist || 1000
    const tilt = 0.52
    const fx = focus.x - CX
    const fz = focus.y - CY
    camera.position.set(fx + (Math.random() - 0.5) * sh, d * Math.cos(tilt), fz + d * Math.sin(tilt) + (Math.random() - 0.5) * sh)
    camera.lookAt(fx, 0, fz + 25)

    for (const c of clouds) {
      c.position.x += c.userData.v * dt
      if (c.position.x > 1200) c.position.x = -1200
    }
    lava.visible = w.arena.lavaLevel > -390
    lava.position.y = w.arena.lavaLevel - 30
    lava.material.emissiveIntensity = 0.8 + Math.sin(time * 4) * 0.2

    floor.rotation.y = -w.arena.angle
    updateTiles(time)
    for (const m of movers) m.g.position.copy(v3(m.s.x, m.s.y))

    for (const p of w.players) {
      const { d: duck, pet } = ducks.get(p)
      const r = duck.root
      let visible = true
      let x = p.x
      let y = p.y
      let z = p.z
      let scale = (radiusOf(w, p) / 17) * duck.baseScale
      if (p.state === 'falling') {
        z = -p.fallT * p.fallT * 500
        scale *= Math.max(0.1, 1 - p.fallT * 0.6)
      } else if (p.state === 'respawning') visible = false
      else if (p.state === 'out') {
        if (p.flyAway) {
          x = p.flyAway.x
          y = p.flyAway.y
          z = p.flyAway.z
        } else visible = false
      }
      if (p.invuln > 0 && p.state === 'alive' && !p.parachute && Math.floor(time * 12) % 2 === 0) visible = false
      r.visible = visible
      r.position.copy(v3(x, y, z))
      r.scale.setScalar(scale)
      r.rotation.y = -p.facing
      setHammer(duck, p.hammer)
      setBalloons(duck, p.state === 'out' ? (p.flyAway ? 0 : 0) : p.balloons, p.color)
      duck.balloons.visible = p.state !== 'out'
      const h = HAMMERS[p.hammer]
      let swing = 1.2
      if (p.swinging) {
        const k = p.swingT / p.swingDur
        const back = 1.2 + h.arc / 2
        const fwd = -h.arc / 2
        swing = k < 0.4 ? back : k < 0.6 ? back + (fwd - back) * ((k - 0.4) / 0.2) : fwd + (1.2 - fwd) * ((k - 0.6) / 0.4)
      }
      poseDuck(duck, {
        walk: p.walk,
        swing,
        spin: p.state === 'out' ? time * 12 : p.spin,
        flip: p.flipT > 0 ? 1 - p.flipT / 0.6 : 0,
        emote: p.emote ? p.emote.key : null,
        t: time + p.id,
        air: p.z > 20 || p.state === 'falling',
      })
      duck.shield.visible = (p.shieldT > 0 || p.powers.shield > 0) && p.state === 'alive'
      duck.hammerPivot.visible = p.state === 'alive'
      if (pet) {
        const tx = p.x - Math.cos(p.facing) * 34 + 14
        const ty = p.y - Math.sin(p.facing) * 34
        pet.visible = p.state !== 'out' || !!p.flyAway
        const target = v3(tx, ty, Math.max(0, p.z * 0.6))
        pet.position.lerp(target, Math.min(1, dt * 5))
        pet.position.y += Math.abs(Math.sin(time * 8)) * 4
        pet.lookAt(r.position.x, pet.position.y, r.position.z)
        pet.rotateY(-Math.PI / 2)
      }
    }

    // meteors
    sync(w.meteors, meteorMap, hazardGroup, (m) => {
      const g = new THREE.Group()
      g.add(ring(m.r, '#ff3d00'))
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(26), new THREE.MeshStandardMaterial({ color: '#5d4037', emissive: '#ff6d00', emissiveIntensity: 0.9 }))
      rock.castShadow = true
      rock.name = 'rock'
      g.add(rock)
      g.position.copy(v3(m.x, m.y, 2))
      return g
    })
    for (const [m, g] of meteorMap) {
      const rock = g.getObjectByName('rock')
      const k = Math.max(0, m.t) / 1.3
      rock.visible = m.t > 0
      rock.position.set(k * 500, 20 + k * 900, -k * 300)
      rock.rotation.x += dt * 5
      g.children[0].material.opacity = m.t > 0 ? 0.4 + Math.sin(time * 20) * 0.3 : Math.max(0, 0.6 + m.t)
    }
    // hammer rain
    sync(w.rain, rainMap, hazardGroup, (r) => {
      const g = new THREE.Group()
      g.add(ring(r.r, '#ffea00'))
      const hm = bigHammer()
      hm.name = 'hm'
      hm.rotation.y = r.a
      g.add(hm)
      g.position.copy(v3(r.x, r.y, 2))
      return g
    })
    for (const [r, g] of rainMap) {
      const hm = g.getObjectByName('hm')
      const k = Math.max(0, r.t) / 1.1
      hm.position.y = k * 700
      hm.rotation.z = r.t > 0 ? 0 : Math.min(Math.PI / 2, -r.t * 12)
      g.children[0].material.opacity = r.t > 0 ? 0.5 + Math.sin(time * 18) * 0.3 : 0
    }
    // bomb balls
    sync(w.bombs, bombMap, hazardGroup, (b) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(b.r, 20, 14), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(b.hue / 360, 0.9, 0.55), emissive: new THREE.Color().setHSL(b.hue / 360, 0.9, 0.3), roughness: 0.2 }))
      m.castShadow = true
      return m
    })
    for (const [b, m] of bombMap) m.position.copy(v3(b.x, b.y, b.z + b.r))
    // mystery boxes / crates / golden hammer
    sync(w.boxes, boxMap, hazardGroup, () => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshStandardMaterial({ map: boxTex, emissive: '#ffae00', emissiveIntensity: 0.25 }))
      m.castShadow = true
      return m
    })
    for (const [b, m] of boxMap) {
      m.position.copy(v3(b.x, b.y, b.z + 18 + Math.sin(time * 3) * 3))
      m.rotation.y = time
    }
    sync(w.crates, crateMap, hazardGroup, () => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(28, 28, 28), new THREE.MeshStandardMaterial({ map: crateTex }))
      m.castShadow = true
      return m
    })
    for (const [b, m] of crateMap) m.position.copy(v3(b.x, b.y, b.z + 14))
    sync(w.golden ? [w.golden] : [], goldMap, hazardGroup, () => {
      const g = new THREE.Group()
      const hm = new THREE.Group()
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 40, 10), mat('#ffd700', 'gold'))
      const head = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 26, 16), mat('#ffd700', 'gold'))
      head.rotation.z = Math.PI / 2
      head.position.y = 20
      hm.add(handle, head)
      g.add(hm)
      const light = new THREE.PointLight('#ffd700', 3, 200)
      light.position.y = 30
      g.add(light)
      return g
    })
    for (const [b, g] of goldMap) {
      g.position.copy(v3(b.x, b.y, b.z + 30 + Math.sin(time * 3) * 6))
      g.rotation.y = time * 2
    }
    // giant duck
    if (w.giantDuck && w.blackout <= 0) {
      if (!giant) {
        giant = buildGiantDuck()
        scene.add(giant.root)
      }
      const gd = w.giantDuck
      giant.root.position.copy(v3(gd.x, gd.y, 0))
      giant.root.rotation.y = gd.dir > 0 ? 0 : Math.PI
      poseDuck(giant, { walk: gd.t * 6, swing: 1.2, spin: 0, flip: 0, emote: gd.quackT > 1.3 ? 'quack' : null, t: time, air: false })
    } else if (giant && !w.giantDuck) {
      scene.remove(giant.root)
      giant = null
    }

    // particles
    const n = Math.min(MAXP, w.particles.length)
    for (let i = 0; i < MAXP; i++) {
      const p = w.particles[i]
      if (i < n) {
        tmp.position.copy(v3(p.x, p.y, p.z))
        tmp.scale.setScalar(p.r * (1 - p.t / p.life))
        tmp.updateMatrix()
        partMesh.setMatrixAt(i, tmp.matrix)
        col.set(p.color.startsWith('rgba') ? '#ffffff' : p.color)
        partMesh.setColorAt(i, col)
      } else {
        tmp.scale.setScalar(0)
        tmp.updateMatrix()
        partMesh.setMatrixAt(i, tmp.matrix)
      }
    }
    partMesh.instanceMatrix.needsUpdate = true
    if (partMesh.instanceColor) partMesh.instanceColor.needsUpdate = true
  }

  view.render = () => renderer.render(scene, camera)

  const proj = new THREE.Vector3()
  view.project = (x, y, z, width, height) => {
    proj.copy(v3(x, y, z)).project(camera)
    return [(proj.x * 0.5 + 0.5) * width, (-proj.y * 0.5 + 0.5) * height, proj.z < 1]
  }

  view.dispose = () => {
    disposeScene(scene)
    boxTex.dispose()
    crateTex.dispose()
  }
  return view
}

// ------------------------------------------------------------------ 2D overlay

function outlined(ctx, text, x, y, size, color, font = '"Press Start 2P", monospace') {
  ctx.font = `${size}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(3, size / 4)
  ctx.strokeStyle = 'rgba(20,10,30,0.9)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

export function drawOverlay(ctx, view, width, height, opts = {}) {
  const w = view.w
  const s = Math.min(width / 960, height / 640) * 1.1
  ctx.clearRect(0, 0, width, height)

  // wind streaks
  if (w.flags.has('wind')) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    const t = w.t
    const dx = Math.cos(w.wind.a)
    const dy = Math.sin(w.wind.a) * 0.6
    for (let i = 0; i < 30; i++) {
      const px = ((i * 137 + t * 600 * dx) % width + width) % width
      const py = ((i * 89 + t * 600 * dy) % height + height) % height
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(px - dx * 40, py - dy * 40)
      ctx.stroke()
    }
  }

  // name tags
  for (const p of opts.title ? [] : w.players) {
    if (p.state !== 'alive') continue
    const [x, y, ok] = view.project(p.x, p.y, p.z + 105 * (radiusOf(w, p) / 17), width, height)
    if (!ok) continue
    const label = p.human ? `${p.tag} ${p.name}` : p.king ? `👑 ${p.name}` : p.name
    ctx.font = `${Math.round(9 * s)}px "Press Start 2P", monospace`
    const tw = ctx.measureText(label).width
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(x - tw / 2 - 5, y - 9 * s, tw + 10, 16 * s)
    ctx.fillStyle = p.human ? '#fff' : p.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x, y - 1)
    if (p.human) {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.moveTo(x - 6 * s, y + 9 * s)
      ctx.lineTo(x + 6 * s, y + 9 * s)
      ctx.lineTo(x, y + 15 * s)
      ctx.fill()
    }
  }

  // off-screen arrows
  for (const p of opts.title ? [] : w.players) {
    if (p.state !== 'alive') continue
    const [x, y] = view.project(p.x, p.y, p.z, width, height)
    if (x >= 0 && x <= width && y >= 0 && y <= height) continue
    const ex = Math.max(22, Math.min(width - 22, x))
    const ey = Math.max(22, Math.min(height - 22, y))
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(ex, ey, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // popups
  for (const p of w.popups) {
    const [x, y, ok] = view.project(p.x, p.y, p.z + p.t * 60, width, height)
    if (!ok) continue
    const a = p.t < 0.1 ? p.t / 0.1 : Math.max(0, 1 - (p.t - p.life * 0.6) / (p.life * 0.4))
    const pop = p.t < 0.12 ? 1.4 - p.t * 3 : 1
    ctx.save()
    ctx.globalAlpha = Math.min(1, a)
    ctx.translate(x, y)
    ctx.rotate(p.rot)
    ctx.scale(pop, pop)
    outlined(ctx, p.text, 0, 0, Math.round(p.size * s * 0.8), p.color)
    ctx.restore()
  }

  // twinkles
  for (const tw of w.twinkles) {
    const [x, y] = view.project(tw.x, tw.y, tw.z + tw.t * 300, width, height)
    const k = tw.t < 0.3 ? tw.t / 0.3 : 1 - (tw.t - 0.3) / 0.9
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tw.t * 6)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const rr = (i % 2 ? 8 : 26) * k * s
      const an = (i * Math.PI) / 5
      ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr)
    }
    ctx.fill()
    ctx.restore()
  }

  // kill feed
  ctx.textAlign = 'left'
  ;(opts.title ? [] : w.feed).forEach((f, i) => {
    ctx.globalAlpha = Math.min(1, 5 - f.t)
    ctx.font = `${Math.round(8 * s)}px "Press Start 2P", monospace`
    const tw = ctx.measureText(f.text).width
    ctx.fillStyle = 'rgba(13,13,22,0.6)'
    ctx.fillRect(10, 60 * s + i * 20 * s, tw + 14, 17 * s)
    ctx.fillStyle = '#ffe9a8'
    ctx.textBaseline = 'middle'
    ctx.fillText(f.text, 17, 60 * s + i * 20 * s + 8.5 * s)
    ctx.globalAlpha = 1
  })

  // countdown
  if (w.phase === 'countdown' && !opts.title) {
    const n = Math.ceil(w.countdown)
    const f = w.countdown - Math.floor(w.countdown)
    outlined(ctx, String(n), width / 2, height / 2 - 30 * s, Math.round((60 + f * 40) * s), '#fff')
    outlined(ctx, 'POP EVERYONE ELSE’S BALLOONS!', width / 2, height / 2 + 50 * s, Math.round(13 * s), '#ffd23f')
  }

  // event banner
  if (w.banner && !opts.title) {
    const t = w.banner.t
    const k = t < 0.25 ? t / 0.25 : t > 2.4 ? Math.max(0, (2.8 - t) / 0.4) : 1
    ctx.save()
    ctx.globalAlpha = k
    ctx.fillStyle = w.banner.ev.rare ? 'rgba(60,0,60,0.8)' : 'rgba(13,13,22,0.72)'
    ctx.fillRect(0, height / 2 - 80 * s, width, 150 * s)
    ctx.translate(width / 2, height / 2 - 10 * s)
    ctx.scale(0.6 + k * 0.4, 0.6 + k * 0.4)
    outlined(ctx, w.banner.ev.rare ? '👑 RARE EVENT! 👑' : 'NEW EVENT!', 0, -48 * s, Math.round(14 * s), w.banner.ev.rare ? '#ff7ad9' : '#ff6b1a')
    ctx.font = `${Math.round(44 * s)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(w.banner.ev.emoji, -230 * s, 0)
    ctx.fillText(w.banner.ev.emoji, 230 * s, 0)
    outlined(ctx, w.banner.ev.name, 0, 0, Math.round(26 * s), '#ffd23f')
    outlined(ctx, w.banner.ev.desc, 0, 44 * s, Math.round(10 * s), '#fff')
    ctx.restore()
  }

  // the screen goes black...
  if (w.blackout > 0) {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    if (w.blackout < 2.6) {
      ctx.globalAlpha = Math.min(1, (2.6 - w.blackout) * 2)
      outlined(ctx, 'Something has entered the arena.', width / 2, height / 2, Math.round(16 * s), '#ffffff')
      ctx.globalAlpha = 1
    }
  }
}
