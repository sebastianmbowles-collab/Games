// All the drawing for Aliens VS Dinos: dinosaurs, UFOs, tractor beams and the prehistoric world.
// Everything is drawn with canvas shapes, so there are no image files.

export const W = 960
export const H = 540
export const GROUND = 456
export const WORLD = 2880
export const TAU = Math.PI * 2
export const FONT = '"Trebuchet MS", "Comic Sans MS", "Chalkboard SE", sans-serif'
export const INK = '#1d1630'

export const DINO_KINDS = {
  rex: { body: '#5cbf4f', belly: '#d9f2a2', spots: '#3f9a38', legs: 2, lift: 1 },
  trike: { body: '#ef9440', belly: '#ffd9a1', spots: '#c96e22', legs: 4, lift: 0.85 },
  stego: { body: '#9a6ad8', belly: '#dccaf7', spots: '#7448b5', legs: 4, lift: 0.85 },
  raptor: { body: '#39a8d0', belly: '#c4ecfa', spots: '#24799a', legs: 2, lift: 1.15 },
  bronto: { body: '#79b06a', belly: '#d5ecc1', spots: '#5a8c4c', legs: 4, lift: 0.7 },
}
export const KIND_LIST = Object.keys(DINO_KINDS)

export function circle(ctx, x, y, r) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
}

function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU)
}

function fs(ctx, fill, lw = 3) {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = lw
  ctx.strokeStyle = INK
  ctx.stroke()
}

export function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// A seeded random number maker, so the scenery looks the same every time.
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function leg(ctx, x, y, len, swing, color, w = 11) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(swing)
  rrect(ctx, -w / 2, -4, w, len + 4, w / 2)
  fs(ctx, color, 2.5)
  // little toes
  ctx.fillStyle = '#fff8e6'
  for (let i = 0; i < 2; i++) {
    circle(ctx, -2 + i * 5, len, 2)
    ctx.fill()
  }
  ctx.restore()
}

function eye(ctx, x, y, r, o) {
  if (o.blink) {
    ctx.beginPath()
    ctx.moveTo(x - r, y)
    ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = INK
    ctx.stroke()
    return
  }
  const big = o.scared ? 1.25 : 1
  circle(ctx, x, y, r * big)
  fs(ctx, '#fff', 2.5)
  const look = o.lookUp ? -r * 0.45 : 0
  circle(ctx, x + r * 0.3, y + look, r * (o.scared ? 0.35 : 0.55))
  ctx.fillStyle = INK
  ctx.fill()
  circle(ctx, x + r * 0.45, y + look - r * 0.25, r * 0.18)
  ctx.fillStyle = '#fff'
  ctx.fill()
  if (o.angry) {
    ctx.beginPath()
    ctx.moveTo(x - r * 1.1, y - r * 1.5)
    ctx.lineTo(x + r * 1.1, y - r * 0.9)
    ctx.lineWidth = 3.5
    ctx.strokeStyle = INK
    ctx.stroke()
  }
}

function mouth(ctx, x, y, w, o) {
  ctx.lineWidth = 2.5
  ctx.strokeStyle = INK
  if (o.roar) {
    ellipse(ctx, x, y + 2, w * 0.6, w * 0.55 * o.roar + 2)
    fs(ctx, '#7a1430', 2.5)
    // teeth
    ctx.fillStyle = '#fff'
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(x + i * w * 0.3 - 3, y + 2 - w * 0.5 * o.roar)
      ctx.lineTo(x + i * w * 0.3 + 3, y + 2 - w * 0.5 * o.roar)
      ctx.lineTo(x + i * w * 0.3, y + 8 - w * 0.5 * o.roar)
      ctx.fill()
    }
  } else if (o.scared) {
    ellipse(ctx, x, y + 2, w * 0.3, w * 0.35)
    fs(ctx, '#7a1430', 2.5)
  } else {
    ctx.beginPath()
    ctx.arc(x, y - 2, w * 0.45, 0.2, Math.PI - 0.2)
    ctx.stroke()
  }
}

// Draws a cartoon dino with its feet at (0, 0), facing right. Options:
// walk (leg cycle), scared, blink, roar (0..1 mouth open), flail, lookUp, angry, time.
export function drawDino(ctx, kind, o = {}) {
  const k = DINO_KINDS[kind]
  const t = o.time || 0
  const walk = o.walk || 0
  const flail = o.flail ? Math.sin(t * 22) * 0.7 : 0
  const sw = (i) => (o.flail ? flail * (i % 2 ? 1 : -1) : Math.sin(walk + i * Math.PI) * 0.5 * (o.moving ? 1 : 0))
  const bob = o.moving ? Math.abs(Math.sin(walk)) * 3 : Math.sin(t * 2.5) * 1
  ctx.save()
  ctx.translate(0, -bob)
  const tailWag = Math.sin(t * 3 + walk * 0.5) * 0.15 + (o.flail ? Math.sin(t * 15) * 0.3 : 0)

  if (kind === 'rex' || kind === 'raptor') {
    const slim = kind === 'raptor' ? 0.8 : 1
    const legY = -24 * slim
    leg(ctx, -10, legY, 24 * slim + bob, sw(1), k.spots, 12 * slim)
    // tail
    ctx.save()
    ctx.translate(-22, -42 * slim)
    ctx.rotate(tailWag)
    ctx.beginPath()
    ctx.moveTo(0, -12 * slim)
    ctx.quadraticCurveTo(-34, -10, -58 * slim, 8)
    ctx.quadraticCurveTo(-30, 8, 0, 14 * slim)
    ctx.closePath()
    fs(ctx, k.body)
    ctx.restore()
    // body
    ellipse(ctx, 0, -44 * slim, 30 * slim, 22 * slim, -0.35)
    fs(ctx, k.body)
    ellipse(ctx, 8, -38 * slim, 16 * slim, 14 * slim, -0.35)
    ctx.fillStyle = k.belly
    ctx.fill()
    for (let i = 0; i < 3; i++) {
      circle(ctx, -12 + i * 9, -56 * slim + i * 2, 3)
      ctx.fillStyle = k.spots
      ctx.fill()
    }
    if (kind === 'raptor') {
      // little feathers
      ctx.fillStyle = '#ffcf3f'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.ellipse(-14 + i * 8, -62, 3, 7, -0.5, 0, TAU)
        ctx.fill()
      }
    }
    leg(ctx, 4, legY, 24 * slim + bob, sw(0), k.body, 13 * slim)
    // tiny arms
    ctx.save()
    ctx.translate(20 * slim, -42 * slim)
    ctx.rotate(o.flail ? flail : 0.6 + Math.sin(t * 4) * 0.1)
    rrect(ctx, -3, 0, 6, 12, 3)
    fs(ctx, k.body, 2)
    ctx.restore()
    // head
    const hx = 30 * slim
    const hy = -70 * slim
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(o.roar ? -0.25 * o.roar : o.lookUp ? -0.3 : 0)
    const jaw = o.roar ? o.roar * 12 : 0
    rrect(ctx, -12, -2 + jaw * 0.3, 40 * slim, 14 + jaw * 0.4, 7)
    fs(ctx, k.body)
    rrect(ctx, -14, -18, 44 * slim, 22, 10)
    fs(ctx, k.body)
    if (jaw > 2) {
      ctx.fillStyle = '#7a1430'
      ctx.fillRect(-4, 4, 30 * slim, jaw * 0.6)
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(i * 7 * slim, 4)
        ctx.lineTo(i * 7 * slim + 3, 9)
        ctx.lineTo(i * 7 * slim + 6, 4)
        ctx.fill()
      }
    }
    circle(ctx, 24 * slim, -10, 1.5)
    ctx.fillStyle = INK
    ctx.fill()
    eye(ctx, 6, -8, 6, o)
    if (!jaw && !o.scared) {
      ctx.beginPath()
      ctx.arc(14, -1, 8, 0.1, 1.2)
      ctx.lineWidth = 2
      ctx.strokeStyle = INK
      ctx.stroke()
    } else if (o.scared && !jaw) {
      ellipse(ctx, 18, 0, 5, 4)
      fs(ctx, '#7a1430', 2)
    }
    ctx.restore()
  } else {
    // four-legged dinos
    const big = kind === 'bronto' ? 1.15 : 1
    leg(ctx, -18 * big, -24, 24 + bob, sw(1), k.spots, 12)
    leg(ctx, 18 * big, -24, 24 + bob, sw(0), k.spots, 12)
    // tail
    ctx.save()
    ctx.translate(-30 * big, -36)
    ctx.rotate(tailWag)
    ctx.beginPath()
    ctx.moveTo(0, -12)
    ctx.quadraticCurveTo(-30, -6, -52 * big, 10)
    ctx.quadraticCurveTo(-26, 6, 0, 12)
    ctx.closePath()
    fs(ctx, k.body)
    if (kind === 'stego') {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath()
        ctx.moveTo(-36 - i * 9, 2 + i * 3)
        ctx.lineTo(-44 - i * 9, -12 + i * 3)
        ctx.lineTo(-40 - i * 9, 4 + i * 3)
        fs(ctx, '#f2e2b8', 2)
      }
    }
    ctx.restore()
    if (kind === 'stego') {
      for (let i = 0; i < 5; i++) {
        const px = -26 + i * 12
        const ph = 16 - Math.abs(i - 2) * 3
        ctx.beginPath()
        ctx.moveTo(px - 7, -48 + Math.abs(i - 2) * 2)
        ctx.lineTo(px, -50 - ph + Math.abs(i - 2) * 2)
        ctx.lineTo(px + 7, -48 + Math.abs(i - 2) * 2)
        ctx.closePath()
        fs(ctx, '#ff8f6b', 2.5)
      }
    }
    // body
    ellipse(ctx, 0, -40, 38 * big, 20 * big)
    fs(ctx, k.body)
    ellipse(ctx, 2, -32, 26 * big, 10)
    ctx.fillStyle = k.belly
    ctx.fill()
    for (let i = 0; i < 4; i++) {
      circle(ctx, -20 + i * 13, -50 + (i % 2) * 4, 3.5)
      ctx.fillStyle = k.spots
      ctx.fill()
    }
    leg(ctx, -24 * big, -26, 26 + bob, sw(0), k.body, 13)
    leg(ctx, 22 * big, -26, 26 + bob, sw(1), k.body, 13)
    if (kind === 'bronto') {
      // long neck
      const nod = Math.sin(t * 1.6) * 0.06 + (o.lookUp ? -0.2 : 0)
      ctx.save()
      ctx.translate(30, -50)
      ctx.rotate(nod)
      ctx.beginPath()
      ctx.moveTo(-8, 8)
      ctx.quadraticCurveTo(10, -30, 22, -62)
      ctx.lineTo(38, -58)
      ctx.quadraticCurveTo(22, -20, 14, 14)
      ctx.closePath()
      fs(ctx, k.body)
      ctx.translate(34, -66)
      ellipse(ctx, 0, 0, 17, 11)
      fs(ctx, k.body)
      eye(ctx, 2, -3, 4.5, o)
      mouth(ctx, 11, 3, 8, o)
      ctx.restore()
    } else {
      // head (trike or stego)
      ctx.save()
      ctx.translate(40, -42)
      ctx.rotate(o.lookUp ? -0.35 : Math.sin(t * 2) * 0.04)
      if (kind === 'trike') {
        ellipse(ctx, -6, -10, 15, 20, -0.4)
        fs(ctx, '#ffc174')
        for (let i = 0; i < 4; i++) {
          circle(ctx, -16 + i * 4, -26 + i * 6, 2.5)
          ctx.fillStyle = '#c96e22'
          ctx.fill()
        }
      }
      ellipse(ctx, 6, 0, 16, 12)
      fs(ctx, k.body)
      if (kind === 'trike') {
        for (const [hx, hy, len] of [
          [6, -10, 16],
          [16, -6, 12],
        ]) {
          ctx.beginPath()
          ctx.moveTo(hx - 3, hy)
          ctx.lineTo(hx + len * 0.6, hy - len)
          ctx.lineTo(hx + 4, hy)
          fs(ctx, '#fff8e6', 2)
        }
        ctx.beginPath()
        ctx.moveTo(18, 2)
        ctx.lineTo(28, 4)
        ctx.lineTo(19, 8)
        fs(ctx, '#fff8e6', 2)
      }
      eye(ctx, 4, -3, 4.5, o)
      mouth(ctx, 13, 4, 8, o)
      ctx.restore()
    }
  }
  if (o.scared) {
    // sweat drops
    ctx.fillStyle = '#9fe3ff'
    const d = (t * 3) % 1
    ctx.globalAlpha = 1 - d
    ctx.beginPath()
    ctx.ellipse(-6, -80 - d * 10, 3, 5, 0, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

// A flying saucer centred on (0, 0). Options: time, enemy, tilt, hurt (flash), stun, beam (glow), mood.
export function drawUFO(ctx, o = {}) {
  const t = o.time || 0
  const enemy = !!o.enemy
  const s = o.scale || 1
  ctx.save()
  ctx.scale(s, s)
  ctx.rotate(o.tilt || 0)
  if (o.stun) ctx.rotate(Math.sin(t * 30) * 0.12)
  // underside glow
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const glow = ctx.createRadialGradient(0, 12, 2, 0, 12, 60)
  const gc = enemy ? '255,80,90' : '120,255,170'
  glow.addColorStop(0, `rgba(${gc},${o.beam ? 0.7 : 0.35})`)
  glow.addColorStop(1, `rgba(${gc},0)`)
  ctx.fillStyle = glow
  ctx.fillRect(-70, -40, 140, 110)
  ctx.restore()
  // dome + alien
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, -8, 26, 26, 0, Math.PI, TAU)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = enemy ? 'rgba(255,190,210,0.35)' : 'rgba(180,240,255,0.4)'
  ctx.fillRect(-30, -40, 60, 40)
  drawAlien(ctx, 0, -6, { time: t, enemy, mood: o.stun ? 'dizzy' : o.mood })
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(0, -8, 26, 26, 0, Math.PI, TAU)
  ctx.closePath()
  ctx.lineWidth = 3
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(-9, -22, 5, 9, 0.6, 0, TAU)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
  // saucer
  const body = ctx.createLinearGradient(0, -14, 0, 14)
  if (o.hurt) {
    body.addColorStop(0, '#fff')
    body.addColorStop(1, '#ffd0d0')
  } else if (enemy) {
    body.addColorStop(0, '#ff7a8a')
    body.addColorStop(0.5, '#c3324a')
    body.addColorStop(1, '#6e1430')
  } else {
    body.addColorStop(0, '#e9f1ff')
    body.addColorStop(0.5, '#9fb2d6')
    body.addColorStop(1, '#5a6890')
  }
  ellipse(ctx, 0, 0, 58, 15)
  ctx.fillStyle = body
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = INK
  ctx.stroke()
  ellipse(ctx, 0, 6, 30, 7)
  fs(ctx, enemy ? '#55102a' : '#3e4a6e', 2.5)
  // blinking rim lights
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI
    const lx = -Math.cos(a) * 46
    const ly = Math.sin(a) * 6 - 1
    const on = Math.floor(t * 8 + i) % 3 === 0
    circle(ctx, lx, ly, 4)
    ctx.fillStyle = on ? (enemy ? '#ffe14a' : '#7dffb0') : enemy ? '#8a3a20' : '#2d6a55'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = INK
    ctx.stroke()
  }
  if (o.stun) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * TAU) / 3
      drawStar(ctx, Math.cos(a) * 34, -40 + Math.sin(a) * 7, 6, '#ffe14a')
    }
  }
  ctx.restore()
}

export function drawAlien(ctx, x, y, o = {}) {
  const t = o.time || 0
  const enemy = o.enemy
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 3) * 1.5)
  // antennae
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * 6, -12)
    ctx.quadraticCurveTo(side * 12, -22, side * 10 + Math.sin(t * 4 + side) * 2, -26)
    ctx.stroke()
    circle(ctx, side * 10 + Math.sin(t * 4 + side) * 2, -26, 3)
    ctx.fillStyle = enemy ? '#ff5470' : '#ffe14a'
    ctx.fill()
  }
  ellipse(ctx, 0, 0, 14, 15)
  fs(ctx, enemy ? '#b06ad8' : '#7be06b', 2.5)
  const mood = o.mood
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(side * 5.5, -2)
    ctx.rotate(side * 0.35)
    if (mood === 'dizzy') {
      ctx.strokeStyle = INK
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-3, -3)
      ctx.lineTo(3, 3)
      ctx.moveTo(3, -3)
      ctx.lineTo(-3, 3)
      ctx.stroke()
    } else {
      ellipse(ctx, 0, 0, 4, 6)
      ctx.fillStyle = INK
      ctx.fill()
      circle(ctx, 1, -2, 1.4)
      ctx.fillStyle = '#fff'
      ctx.fill()
    }
    ctx.restore()
  }
  if (enemy && mood !== 'dizzy') {
    ctx.strokeStyle = INK
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-10, -10)
    ctx.lineTo(-2, -6)
    ctx.moveTo(10, -10)
    ctx.lineTo(2, -6)
    ctx.stroke()
  }
  ctx.beginPath()
  if (mood === 'happy' || (!enemy && mood !== 'dizzy' && mood !== 'sad')) ctx.arc(0, 6, 4, 0.2, Math.PI - 0.2)
  else if (mood === 'sad' || enemy) ctx.arc(0, 11, 4, Math.PI + 0.3, TAU - 0.3)
  else ctx.arc(0, 8, 3, 0, TAU)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

export function drawStar(ctx, x, y, r, color) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

// A tractor beam shining down from (x, top) to the ground.
export function drawBeam(ctx, x, top, bottom, time, o = {}) {
  const enemy = o.enemy
  const power = o.power ?? 1
  const wTop = 16
  const wBot = o.width || 70
  const c = enemy ? '255,90,120' : '120,255,190'
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, top, 0, bottom)
  g.addColorStop(0, `rgba(${c},${0.55 * power})`)
  g.addColorStop(1, `rgba(${c},${0.12 * power})`)
  ctx.beginPath()
  ctx.moveTo(x - wTop, top)
  ctx.lineTo(x + wTop, top)
  ctx.lineTo(x + wBot, bottom)
  ctx.lineTo(x - wBot, bottom)
  ctx.closePath()
  ctx.fillStyle = g
  ctx.fill()
  // rings sliding up the beam
  ctx.strokeStyle = `rgba(${c},${0.6 * power})`
  ctx.lineWidth = 2.5
  for (let i = 0; i < 5; i++) {
    const f = 1 - ((time * 0.9 + i / 5) % 1)
    const y = top + (bottom - top) * f
    const w = wTop + (wBot - wTop) * f
    ctx.globalAlpha = Math.sin(f * Math.PI)
    ctx.beginPath()
    ctx.ellipse(x, y, w, w * 0.18, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // glowing spot on the ground
  const spot = ctx.createRadialGradient(x, bottom, 4, x, bottom, wBot * 1.2)
  spot.addColorStop(0, `rgba(${c},${0.5 * power})`)
  spot.addColorStop(1, `rgba(${c},0)`)
  ctx.fillStyle = spot
  ctx.beginPath()
  ctx.ellipse(x, bottom, wBot * 1.2, 16, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

export function drawMothership(ctx, x, y, s, time, hatch = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const g = ctx.createLinearGradient(0, -60, 0, 60)
  g.addColorStop(0, '#d9e4ff')
  g.addColorStop(0.5, '#7d8bb5')
  g.addColorStop(1, '#3a4166')
  ellipse(ctx, 0, 0, 260, 50)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = INK
  ctx.stroke()
  ellipse(ctx, 0, -30, 120, 40)
  fs(ctx, '#aab8e0', 4)
  for (let i = 0; i < 9; i++) {
    const wx = -200 + i * 50
    rrect(ctx, wx - 10, -8, 20, 12, 5)
    ctx.fillStyle = Math.floor(time * 3 + i) % 4 === 0 ? '#fff6a8' : '#7dffd0'
    ctx.fill()
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 13) * Math.PI
    circle(ctx, -Math.cos(a) * 235, Math.sin(a) * 18 + 16, 6)
    ctx.fillStyle = Math.floor(time * 6 + i) % 3 === 0 ? '#ff6b9a' : '#4a3a70'
    ctx.fill()
  }
  if (hatch > 0) {
    ellipse(ctx, 0, 44, 50 * hatch, 12 * hatch)
    ctx.fillStyle = '#fff8c4'
    ctx.fill()
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const b = ctx.createLinearGradient(0, 44, 0, 300)
    b.addColorStop(0, `rgba(255,250,190,${0.5 * hatch})`)
    b.addColorStop(1, 'rgba(255,250,190,0)')
    ctx.fillStyle = b
    ctx.beginPath()
    ctx.moveTo(-50 * hatch, 44)
    ctx.lineTo(50 * hatch, 44)
    ctx.lineTo(110 * hatch, 300)
    ctx.lineTo(-110 * hatch, 300)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

export function drawEgg(ctx, x, y, crack, time) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(crack > 0 ? Math.sin(time * 30) * 0.15 * crack : 0)
  ellipse(ctx, 0, -14, 11, 15)
  fs(ctx, '#fff3d6')
  ctx.fillStyle = '#7ccf73'
  for (const [sx, sy] of [
    [-4, -20],
    [4, -10],
    [-2, -6],
  ]) {
    circle(ctx, sx, sy, 2.5)
    ctx.fill()
  }
  if (crack > 0.3) {
    ctx.beginPath()
    ctx.moveTo(-10, -16)
    ctx.lineTo(-4, -12)
    ctx.lineTo(0, -18)
    ctx.lineTo(5, -12)
    ctx.lineTo(10, -16)
    ctx.lineWidth = 2
    ctx.strokeStyle = INK
    ctx.stroke()
  }
  ctx.restore()
}

export function drawLeaf(ctx, x, y, time) {
  ctx.save()
  ctx.translate(x, y - 14 + Math.sin(time * 3 + x) * 4)
  ctx.rotate(Math.sin(time * 2 + x) * 0.3)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 24)
  g.addColorStop(0, 'rgba(200,255,140,0.5)')
  g.addColorStop(1, 'rgba(200,255,140,0)')
  ctx.fillStyle = g
  ctx.fillRect(-24, -24, 48, 48)
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(-12, 0)
  ctx.quadraticCurveTo(0, -14, 12, 0)
  ctx.quadraticCurveTo(0, 14, -12, 0)
  fs(ctx, '#6fdc4f', 2.5)
  ctx.beginPath()
  ctx.moveTo(-10, 0)
  ctx.lineTo(10, 0)
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.restore()
}

// ---------- the prehistoric world ----------

const THEMES = {
  // a purple alien night
  aliens: {
    sky: ['#0a0620', '#24124a', '#4a2266'],
    far: '#2e1d4e',
    mid: '#22403a',
    near: '#1f5a36',
    ground: '#4a3220',
    grass: '#2f7a30',
    stars: 1,
  },
  // a blue moonlit dino night
  dinos: {
    sky: ['#050a1e', '#10224a', '#24407a'],
    far: '#1e2c56',
    mid: '#1d4440',
    near: '#1b5a38',
    ground: '#45301e',
    grass: '#2f7a30',
    stars: 1,
  },
  night: {
    sky: ['#06040f', '#1a1236', '#3a2050'],
    far: '#2a2040',
    mid: '#24382f',
    near: '#1f4a2e',
    ground: '#4a3220',
    grass: '#356e2a',
    stars: 1,
  },
  // the brightest night: a full moon after the aliens have gone
  moonlit: {
    sky: ['#0a1430', '#1d3a70', '#3a64a0'],
    far: '#2a3c6e',
    mid: '#24584a',
    near: '#22703e',
    ground: '#55402a',
    grass: '#3a8a36',
    stars: 1,
  },
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t)
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t)
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t)
  return `rgb(${r},${g},${bl})`
}

export function mixTheme(a, b, t) {
  const A = THEMES[a]
  const B = THEMES[b]
  const out = { stars: A.stars + (B.stars - A.stars) * t }
  for (const key of ['far', 'mid', 'near', 'ground', 'grass']) out[key] = mixHex(A[key], B[key], t)
  out.sky = A.sky.map((c, i) => mixHex(c, B.sky[i], t))
  return out
}

export function getTheme(name) {
  return mixTheme(name, name, 0)
}

const rnd = seeded(66)
const STARS = Array.from({ length: 120 }, () => ({ x: rnd() * W, y: rnd() * 300, r: rnd() * 1.6 + 0.4, p: rnd() * TAU }))
const MOUNTAINS = Array.from({ length: 14 }, (_, i) => ({ x: i * 260 + rnd() * 80, h: 110 + rnd() * 90, w: 200 + rnd() * 120 }))
const VOLCANOES = [
  { x: 520, h: 190 },
  { x: 1900, h: 220 },
]
const HILLS = Array.from({ length: 22 }, (_, i) => ({ x: i * 190 + rnd() * 60, r: 90 + rnd() * 70 }))
const TREES = Array.from({ length: 30 }, () => ({ x: rnd() * (WORLD + 400) - 200, h: 70 + rnd() * 60, kind: rnd() < 0.5 ? 0 : 1, p: rnd() * TAU }))
const ROCKS = Array.from({ length: 26 }, () => ({ x: rnd() * WORLD, r: 6 + rnd() * 12 }))
const GRASS = Array.from({ length: 160 }, () => ({ x: rnd() * (WORLD + 400) - 200, h: 8 + rnd() * 14, p: rnd() * TAU }))
const CLOUDS = Array.from({ length: 9 }, () => ({ x: rnd() * 3000, y: 50 + rnd() * 140, s: 0.6 + rnd() * 0.8, v: 6 + rnd() * 10 }))

export const volcanoTops = (camX) => VOLCANOES.map((v) => ({ x: v.x + camX * 0.65, y: GROUND - 40 - v.h }))

// Sky is drawn in screen space; everything else goes inside the camera transform.
export function drawSky(ctx, theme, time) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, theme.sky[0])
  g.addColorStop(0.55, theme.sky[1])
  g.addColorStop(1, theme.sky[2])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  if (theme.stars > 0) {
    // each star is exactly one chunky pixel, and some twinkle off and on
    for (const s of STARS) {
      if (Math.sin(time * 2 + s.p) < -0.6) continue
      ctx.globalAlpha = theme.stars
      ctx.fillStyle = s.r > 1.5 ? '#fff6c0' : '#ffffff'
      const size = s.r > 1.7 ? 6 : 3
      ctx.fillRect(Math.floor(s.x / 3) * 3, Math.floor(s.y / 3) * 3, size, size)
    }
    ctx.globalAlpha = 1
  }
  if (theme.stars > 0.5 && theme.moon !== false) drawMoon(ctx, 884, 156)
}

export function drawMoon(ctx, x, y) {
  ctx.save()
  const g = ctx.createRadialGradient(x, y, 30, x, y, 110)
  g.addColorStop(0, 'rgba(255,250,210,0.35)')
  g.addColorStop(1, 'rgba(255,250,210,0)')
  ctx.fillStyle = g
  ctx.fillRect(x - 110, y - 110, 220, 220)
  circle(ctx, x, y, 36)
  ctx.fillStyle = '#fff6c8'
  ctx.fill()
  ctx.fillStyle = '#e0d79a'
  for (const [dx, dy, r] of [
    [-12, -8, 8],
    [10, 10, 6],
    [14, -14, 4],
    [-6, 16, 4],
  ]) {
    circle(ctx, x + dx, y + dy, r)
    ctx.fill()
  }
  ctx.restore()
}

// Each layer moves at its own speed (parallax): far things slide slower than near things.
export function drawBackdrop(ctx, theme, camX, time) {
  const par = (f) => camX * (1 - f)
  // clouds
  ctx.save()
  ctx.globalAlpha = 0.85 - theme.stars * 0.5
  for (const c of CLOUDS) {
    const x = ((c.x + time * c.v) % 3400) - 300 + par(0.15)
    ctx.fillStyle = theme.stars > 0.5 ? '#5a6496' : '#ffffff'
    for (const [dx, dy, r] of [
      [0, 0, 26],
      [24, -10, 30],
      [52, 0, 24],
      [26, 6, 22],
    ]) {
      circle(ctx, x + dx * c.s, c.y + dy * c.s, r * c.s)
      ctx.fill()
    }
  }
  ctx.restore()
  // far mountains
  ctx.fillStyle = theme.far
  for (const m of MOUNTAINS) {
    const x = m.x + par(0.25) - 200
    ctx.beginPath()
    ctx.moveTo(x - m.w / 2, GROUND)
    ctx.lineTo(x, GROUND - 60 - m.h)
    ctx.lineTo(x + m.w / 2, GROUND)
    ctx.fill()
  }
  // volcanoes with glowing lava tops
  for (const v of VOLCANOES) {
    const x = v.x + par(0.35)
    const top = GROUND - 40 - v.h
    ctx.fillStyle = theme.far
    ctx.beginPath()
    ctx.moveTo(x - 190, GROUND)
    ctx.lineTo(x - 28, top)
    ctx.lineTo(x + 28, top)
    ctx.lineTo(x + 190, GROUND)
    ctx.fill()
    ctx.fillStyle = 'rgba(60,25,30,0.35)'
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x + 28, top)
    ctx.lineTo(x + 190, GROUND)
    ctx.lineTo(x + 40, GROUND)
    ctx.fill()
    ctx.fillStyle = '#ff7a2a'
    ctx.beginPath()
    ctx.moveTo(x - 28, top)
    ctx.lineTo(x + 28, top)
    ctx.lineTo(x + 12, top + 26)
    ctx.lineTo(x + 4, top + 12)
    ctx.lineTo(x - 8, top + 34)
    ctx.lineTo(x - 14, top + 14)
    ctx.closePath()
    ctx.fill()
    // smoke puffs drifting up out of the crater
    for (let i = 0; i < 6; i++) {
      const f = (time * 0.18 + i / 6 + v.x) % 1
      ctx.globalAlpha = 0.45 * (1 - f) * Math.min(1, f * 6)
      ctx.fillStyle = '#8a8296'
      circle(ctx, x + Math.sin(f * 5 + i) * 14 + f * 50, top - 10 - f * 150, 14 + f * 30)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, top, 4, x, top, 70)
    g.addColorStop(0, `rgba(255,140,40,${0.45 + 0.1 * Math.sin(time * 3)})`)
    g.addColorStop(1, 'rgba(255,140,40,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - 70, top - 70, 140, 140)
    ctx.restore()
  }
  // mid hills
  ctx.fillStyle = theme.mid
  for (const h of HILLS) {
    circle(ctx, h.x + par(0.55) - 300, GROUND + 30, h.r)
    ctx.fill()
  }
  // trees: palms and fern-trees
  for (const tr of TREES) {
    const x = tr.x + par(0.8)
    const sway = Math.sin(time * 1.2 + tr.p) * 0.06
    ctx.save()
    ctx.translate(x, GROUND)
    ctx.fillStyle = '#5a3b22'
    ctx.beginPath()
    ctx.moveTo(-6, 0)
    ctx.quadraticCurveTo(-2 + tr.h * sway, -tr.h / 2, tr.h * sway * 2, -tr.h)
    ctx.lineTo(tr.h * sway * 2 + 6, -tr.h)
    ctx.quadraticCurveTo(6 + tr.h * sway, -tr.h / 2, 6, 0)
    ctx.fill()
    ctx.translate(tr.h * sway * 2 + 3, -tr.h)
    ctx.fillStyle = theme.near
    if (tr.kind === 0) {
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.rotate((i / 6) * TAU + sway * 3)
        ctx.beginPath()
        ctx.ellipse(26, 0, 30, 8, 0.35, 0, TAU)
        ctx.fill()
        ctx.restore()
      }
    } else {
      for (const [dx, dy, r] of [
        [0, -10, 26],
        [-22, 4, 20],
        [22, 4, 20],
      ]) {
        circle(ctx, dx, dy, r)
        ctx.fill()
      }
    }
    ctx.restore()
  }
}

export function drawGround(ctx, theme, camX) {
  const x0 = camX - W
  const x1 = camX + W
  ctx.fillStyle = theme.ground
  ctx.fillRect(x0, GROUND, x1 - x0, H)
  ctx.fillStyle = theme.grass
  ctx.fillRect(x0, GROUND - 4, x1 - x0, 14)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  for (const r of ROCKS) {
    if (r.x < x0 || r.x > x1) continue
    ctx.beginPath()
    ctx.ellipse(r.x, GROUND + 30 + (r.r % 5) * 6, r.r, r.r * 0.6, 0, 0, TAU)
    ctx.fill()
  }
}

// Front grass blades drawn on top of everyone, so the dinos look like they stand in the grass.
export function drawForeground(ctx, theme, camX, time) {
  ctx.strokeStyle = theme.grass
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const g of GRASS) {
    if (g.x < camX - W || g.x > camX + W) continue
    const sway = Math.sin(time * 2 + g.p) * 3
    ctx.beginPath()
    ctx.moveTo(g.x, GROUND + 6)
    ctx.quadraticCurveTo(g.x + sway * 0.5, GROUND - g.h / 2, g.x + sway, GROUND + 6 - g.h)
    ctx.stroke()
  }
  ctx.lineCap = 'butt'
}

export { text } from './pixel'
