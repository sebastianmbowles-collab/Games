import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { COSTUME_CATEGORIES, COSTUMES, PETS, PET_MAP } from './costumes'
import { derivedStat } from './achievements'
import { animateMaterials, buildDuck, buildPet, poseDuck } from './duck'
import { loadSave } from './save'
import { shopBuy, shopEquip } from './profile'

function Preview({ costume, pet }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(220, 220, false)
    const scene = new THREE.Scene()
    scene.add(new THREE.HemisphereLight('#ffffff', '#8899aa', 2))
    const sun = new THREE.DirectionalLight('#ffffff', 2)
    sun.position.set(100, 200, 150)
    scene.add(sun)
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000)
    camera.position.set(0, 80, 170)
    camera.lookAt(0, 40, 0)
    const d = buildDuck(costume, { hammer: 'mallet' })
    scene.add(d.root)
    const p = pet ? buildPet(pet) : null
    if (p) {
      p.position.set(-45, 0, 30)
      scene.add(p)
    }
    let raf
    const t0 = performance.now()
    const loop = () => {
      const t = (performance.now() - t0) / 1000
      animateMaterials(t)
      d.root.rotation.y = t * 0.8
      poseDuck(d, { walk: 0, swing: 1.2, spin: 0, flip: 0, emote: Math.sin(t) > 0.8 ? 'wave' : null, t, air: false })
      if (p) p.rotation.y = -t
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
    }
  }, [costume, pet])
  return <canvas ref={ref} className="bonk-preview" width={220} height={220} />
}

export default function Shop({ onClose, onEquip, initialTab = 'classic' }) {
  const save = loadSave()
  const [tab, setTab] = useState(initialTab)
  const [sel, setSel] = useState(save.costume)
  const [, force] = useState(0)
  const refresh = () => force((n) => n + 1)

  const isPets = tab === 'pets'
  const cat = COSTUME_CATEGORIES.find((c) => c.key === tab)
  const items = isPets ? PETS : tab === 'mine' ? save.owned.map((k) => COSTUMES[k]).filter(Boolean) : cat.items
  const selItem = isPets ? PET_MAP[sel] : COSTUMES[sel]

  function needMet(item) {
    if (!item.need) return true
    const [key, n] = item.need
    return derivedStat(save, key) >= n
  }

  function buy(item) {
    if (!needMet(item)) return
    if (shopBuy(item, isPets)) {
      onEquip()
      refresh()
    }
  }

  function equip(item) {
    shopEquip(item, isPets)
    onEquip()
    refresh()
  }

  const owns = (item) => (isPets ? save.pets.includes(item.key) : save.owned.includes(item.key))
  const equipped = (item) => (isPets ? save.pet === item.key : save.costume === item.key)

  return (
    <div className="bonk-modal" onClick={onClose}>
      <div className="bonk-panel bonk-shop" onClick={(e) => e.stopPropagation()}>
        <button className="bonk-close" onClick={onClose}>✕</button>
        <h3>
          {tab === 'mine' ? '👕 COSTUMES' : '🛒 SHOP'} <span className="bonk-bb">🪙 {save.bb.toLocaleString()} BB</span>
        </h3>
        <div className="bonk-tabs">
          <button className={tab === 'mine' ? 'is-on' : ''} onClick={() => setTab('mine')}>
            👕 My Costumes
          </button>
          {COSTUME_CATEGORIES.map((c) => (
            <button key={c.key} className={tab === c.key ? 'is-on' : ''} onClick={() => setTab(c.key)}>
              {c.name}
            </button>
          ))}
          <button className={isPets ? 'is-on' : ''} onClick={() => setTab('pets')}>
            🐾 Pets
          </button>
        </div>
        <div className="bonk-shop-body">
          <div className="bonk-shop-preview">
            <Preview costume={isPets ? save.costume : selItem ? (selItem.unlock && !owns(selItem) ? 'questionmark' : sel) : save.costume} pet={isPets ? (selItem ? sel : save.pet) : save.pet} />
            {selItem && (
              <div className="bonk-shop-info">
                <b>{selItem.unlock && !owns(selItem) ? '???' : selItem.name}</b>
                <span>{selItem.price === null ? '???' : selItem.price === 0 ? 'FREE' : `🪙 ${selItem.price.toLocaleString()} BB`}</span>
                {selItem.unlock && !owns(selItem) && <small>💎 Secret: {selItem.unlock[2]}</small>}
                {selItem.need && <small>🔒 {selItem.need[2]} ({Math.min(derivedStat(save, selItem.need[0]), selItem.need[1])}/{selItem.need[1]})</small>}
                {owns(selItem) ? (
                  <button onClick={() => equip(selItem)}>{equipped(selItem) ? (isPets ? 'Unequip' : 'Equipped ✓') : 'Equip'}</button>
                ) : (
                  <button onClick={() => buy(selItem)} disabled={!!selItem.unlock || !needMet(selItem) || save.bb < (selItem.price || 0)}>
                    {selItem.unlock ? 'Find the secret!' : !needMet(selItem) ? 'Locked' : save.bb < (selItem.price || 0) ? 'Not enough BB' : 'Buy'}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="bonk-grid">
            {items.map((item) => (
              <button
                key={item.key}
                className={`bonk-item ${sel === item.key ? 'is-sel' : ''} ${owns(item) ? 'is-owned' : ''}`}
                onClick={() => setSel(item.key)}
              >
                <span className="bonk-swatch" style={{ background: item.unlock && !owns(item) ? '#555' : item.body || item.color }} />
                <b>{item.unlock && !owns(item) ? '???' : item.name}</b>
                <small>
                  {equipped(item) ? '✓ Equipped' : owns(item) ? 'Owned' : item.unlock ? '🔒 Secret' : item.price === null ? '???' : item.price === 0 ? 'FREE' : `🪙 ${item.price.toLocaleString()}`}
                </small>
              </button>
            ))}
          </div>
        </div>
        <p className="bonk-muted">Earn Bonk Bucks by surviving, popping balloons, winning, finishing obbys and unlocking achievements.</p>
      </div>
    </div>
  )
}
