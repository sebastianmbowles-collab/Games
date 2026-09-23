import * as THREE from 'three'
import { animateMaterials, buildDuck, disposeScene, mat, poseDuck } from './duck'
import { addLights, makeClouds, makeSky } from './matchView'

// Title/loading screen: a rubber duck runs in circles, chased by a duck with a hammer.
export function createLoadingScene() {
  const scene = new THREE.Scene()
  scene.background = makeSky(false)
  addLights(scene, false)
  const clouds = makeClouds(scene, 10, -200, 1600)
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 10, 5000)
  camera.position.set(0, 330, 420)
  camera.lookAt(0, 20, 0)

  const island = new THREE.Mesh(new THREE.CylinderGeometry(260, 200, 60, 48), mat('#7ed957'))
  island.position.y = -30
  island.receiveShadow = true
  scene.add(island)
  const dirt = new THREE.Mesh(new THREE.ConeGeometry(200, 220, 32), mat('#8b5a2b'))
  dirt.rotation.x = Math.PI
  dirt.position.y = -170
  scene.add(dirt)
  const colors = ['#ff5d8f', '#ffe45e', '#4cc9f0', '#c77dff', '#ffffff']
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 60 + Math.random() * 180
    const f = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 5), mat(colors[i % 5]))
    f.position.set(Math.cos(a) * r, 3, Math.sin(a) * r)
    scene.add(f)
  }

  const runner = buildDuck('rookie', { hammer: false })
  const chaser = buildDuck('ninja', { hammer: 'sledge' })
  scene.add(runner.root, chaser.root)

  let t = 0
  return {
    resize(w, h) {
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    },
    frame(renderer, dt) {
      t += dt
      animateMaterials(t)
      for (const c of clouds) {
        c.position.x += c.userData.v * dt
        if (c.position.x > 900) c.position.x = -900
      }
      const R = 150
      const a = t * 1.6
      const rx = Math.cos(a) * R
      const rz = Math.sin(a) * R
      runner.root.position.set(rx, Math.abs(Math.sin(t * 12)) * 8, rz)
      runner.root.rotation.y = -(a + Math.PI / 2)
      poseDuck(runner, { walk: t * 22, swing: 0, spin: 0, flip: 0, emote: Math.sin(t * 2) > 0.7 ? 'quack' : null, t, air: true })
      const b = a - 0.9
      chaser.root.position.set(Math.cos(b) * R, Math.abs(Math.sin(t * 11)) * 6, Math.sin(b) * R)
      chaser.root.rotation.y = -(b + Math.PI / 2)
      const swing = Math.sin(t * 7) > 0 ? 1.8 : -0.6
      poseDuck(chaser, { walk: t * 20, swing, spin: 0, flip: 0, emote: null, t, air: false })
      renderer.render(scene, camera)
    },
    dispose: () => disposeScene(scene),
  }
}
