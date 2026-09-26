import { W, H, GROUND, SPECIAL_COST, WINS_NEEDED } from './engine'

const GLOVE = '#e0393e'
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
const HUD_FONT = '"Press Start 2P", monospace'

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt)))
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`
}

function drawBackground(ctx, clock) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND)
  sky.addColorStop(0, '#1a1030')
  sky.addColorStop(0.6, '#4a1f45')
  sky.addColorStop(1, '#c2553a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, GROUND)

  // Sun + crowd silhouettes, bobbing a little like they're cheering.
  ctx.fillStyle = '#f2b90c55'
  ctx.beginPath()
  ctx.arc(W / 2, GROUND - 40, 120, 0, Math.PI * 2)
  ctx.fill()
  for (let row = 0; row < 2; row++) {
    ctx.fillStyle = row ? '#2a1428' : '#1c0f1f'
    for (let i = 0; i < 26; i++) {
      const x = i * 32 + (row ? 16 : 0)
      const bob = Math.sin(clock * 6 + i * 1.7 + row) * 3
      const y = GROUND - 70 + row * 26 + bob
      ctx.beginPath()
      ctx.arc(x, y, 11, 0, Math.PI * 2)
      ctx.fillRect(x - 13, y + 8, 26, 40)
      ctx.fill()
    }
  }

  const floor = ctx.createLinearGradient(0, GROUND, 0, H)
  floor.addColorStop(0, '#6b4a2e')
  floor.addColorStop(1, '#2e1f14')
  ctx.fillStyle = floor
  ctx.fillRect(0, GROUND, W, H - GROUND)
  ctx.strokeStyle = '#00000033'
  ctx.lineWidth = 2
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + i * 60, GROUND)
    ctx.lineTo(W / 2 + i * 140, H)
    ctx.stroke()
  }
}

function limb(ctx, x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function fist(ctx, x, y) {
  ctx.fillStyle = GLOVE
  ctx.beginPath()
  ctx.arc(x, y, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff55'
  ctx.beginPath()
  ctx.arc(x - 3, y - 3, 3.5, 0, Math.PI * 2)
  ctx.fill()
}

// Works out where hands and feet go for the current action, in "facing right" space.
function pose(f) {
  const a = f.action
  const air = f.y < GROUND
  const swing = Math.sin(f.walkT) * 0.9
  const p = {
    back: [-6 + swing * -10, 0],
    front: [10 + swing * 10, 0],
    handBack: [20, -80],
    handFront: [32, -92],
    lean: 0,
  }
  if (air) {
    p.back = [-14, -14]
    p.front = [18, -18]
  }
  if (f.blocking || a?.blocked) {
    p.handBack = [30, -104]
    p.handFront = [34, -80]
  }
  if (a?.type === 'attack') {
    const mv = a.move
    const out = a.t >= mv.on * 0.6 && a.t <= mv.off + 0.05
    if (a.name === 'punch' && out) p.handFront = [70, -96]
    if (a.name === 'kick' && out) {
      p.front = [80, air ? -30 : -52]
      p.lean = -0.18
    }
  }
  if (a?.type === 'hurt' && !a.blocked) {
    p.handBack = [-26, -104]
    p.handFront = [-14, -112]
    p.lean = -0.25
  }
  if (a?.type === 'special') {
    const t = f.def.special.type
    if (t === 'projectile') {
      p.handBack = [52, -90]
      p.handFront = [58, -78]
    } else if (t === 'dash') {
      p.handFront = [66, -86]
      p.lean = 0.3
    } else if (t === 'uppercut') {
      p.handFront = [22, -160]
      p.lean = -0.1
    } else if (t === 'slam') {
      p.handBack = [-10, -150]
      p.handFront = [16, -152]
    }
  }
  return p
}

function drawFighter(ctx, f) {
  const c = f.def.color
  const dark = shade(c, -60)
  const ko = f.action?.type === 'ko'

  // Shadow stays on the ground and shrinks as you jump.
  const h = GROUND - f.y
  ctx.fillStyle = `rgba(0,0,0,${0.35 - Math.min(0.25, h / 800)})`
  ctx.beginPath()
  ctx.ellipse(f.x, GROUND + 4, 38 - Math.min(18, h / 12), 8, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(f.x, f.y)
  ctx.scale(f.facing, 1)
  if (ko) ctx.rotate(-Math.min(Math.PI / 2, f.action.t * 4))
  const p = ko ? pose({ ...f, action: null, blocking: false }) : pose(f)
  ctx.rotate(p.lean)
  if (f.flash > 0 && Math.floor(f.flash * 40) % 2) ctx.globalAlpha = 0.55

  // Legs
  limb(ctx, -8, -46, p.back[0], p.back[1], dark, 13)
  limb(ctx, 8, -46, p.front[0], p.front[1], dark, 13)
  // Back arm, torso, front arm
  limb(ctx, -2, -88, p.handBack[0], p.handBack[1], dark, 11)
  fist(ctx, p.handBack[0], p.handBack[1])
  ctx.fillStyle = c
  ctx.beginPath()
  ctx.roundRect(-24, -104, 48, 62, 18)
  ctx.fill()
  ctx.fillStyle = shade(c, 35)
  ctx.beginPath()
  ctx.ellipse(4, -70, 14, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  // Champion belt
  ctx.fillStyle = '#f2b90c'
  ctx.fillRect(-24, -52, 48, 7)
  limb(ctx, 10, -90, p.handFront[0], p.handFront[1], dark, 11)
  fist(ctx, p.handFront[0], p.handFront[1])

  // Emoji head. Emoji animals mostly face left, so flip it to face forward.
  ctx.save()
  ctx.translate(4, -126)
  ctx.scale(-1, 1)
  ctx.font = `52px ${EMOJI_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(f.def.emoji, 0, 0)
  ctx.restore()

  if (f.blocking) {
    ctx.strokeStyle = '#7fd4ff'
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(10, -70, 62, -1.1, 1.1)
    ctx.stroke()
  }
  ctx.restore()
}

function drawProjectile(ctx, p) {
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(p.vx > 0 ? -1 : 1, 1)
  ctx.rotate(Math.sin(p.spin * 12) * 0.15)
  ctx.font = `${p.size}px ${EMOJI_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(p.emoji, 0, 0)
  ctx.restore()
}

function drawSparks(ctx, sparks) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const s of sparks) {
    const k = s.life / s.max
    ctx.globalAlpha = Math.min(1, k * 2)
    if (s.number) {
      ctx.font = `${s.size}px ${HUD_FONT}`
      ctx.lineWidth = 4
      ctx.strokeStyle = '#000'
      ctx.strokeText(s.text, s.x, s.y)
      ctx.fillStyle = '#ffd84a'
      ctx.fillText(s.text, s.x, s.y)
    } else {
      ctx.font = `${s.size * (1.4 - k * 0.4)}px ${EMOJI_FONT}`
      ctx.fillText(s.text, s.x, s.y)
    }
  }
  ctx.globalAlpha = 1
}

function drawHud(ctx, m) {
  const barW = 320
  m.fighters.forEach((f, i) => {
    const x = i === 0 ? 20 : W - 20 - barW
    const y = 18
    ctx.fillStyle = '#0d0d16'
    ctx.fillRect(x - 3, y - 3, barW + 6, 24)
    const trail = (f.hpShown / f.def.hp) * barW
    const now = (f.hp / f.def.hp) * barW
    const pct = f.hp / f.def.hp
    // Bars drain toward the outside edge, so full bars meet at the timer.
    const from = (w) => (i === 0 ? x + barW - w : x)
    ctx.fillStyle = '#ffffffaa'
    ctx.fillRect(from(trail), y, trail, 18)
    ctx.fillStyle = pct > 0.5 ? '#2bd673' : pct > 0.25 ? '#f2c40c' : '#e0393e'
    ctx.fillRect(from(now), y, now, 18)

    ctx.font = `11px ${HUD_FONT}`
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'top'
    ctx.textAlign = i === 0 ? 'left' : 'right'
    ctx.fillText(f.def.name.toUpperCase(), i === 0 ? x : x + barW, y + 28)

    // Round-win stars
    ctx.font = `16px ${EMOJI_FONT}`
    for (let s = 0; s < WINS_NEEDED; s++) {
      const sx = i === 0 ? x + barW - 12 - s * 22 : x + 12 + s * 22
      ctx.globalAlpha = s < m.wins[i] ? 1 : 0.2
      ctx.textAlign = 'center'
      ctx.fillText('⭐', sx, y + 26)
    }
    ctx.globalAlpha = 1

    // Special meter along the bottom
    const mw = 200
    const mx = i === 0 ? 20 : W - 20 - mw
    const my = H - 26
    ctx.fillStyle = '#0d0d16cc'
    ctx.fillRect(mx - 2, my - 2, mw + 4, 14)
    const ready = f.meter >= SPECIAL_COST
    ctx.fillStyle = ready ? (Math.floor(m.clock * 6) % 2 ? '#f2b90c' : '#ffe27a') : '#2b9ce0'
    const mfill = (f.meter / 100) * mw
    ctx.fillRect(i === 0 ? mx : mx + mw - mfill, my, mfill, 10)
    ctx.fillStyle = '#ffffff88'
    ctx.fillRect(mx + mw * (SPECIAL_COST / 100) - 1, my - 2, 2, 14)
    ctx.font = `8px ${HUD_FONT}`
    ctx.fillStyle = '#fff'
    ctx.textAlign = i === 0 ? 'left' : 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(ready ? `★ ${f.def.special.name.toUpperCase()} READY` : 'SPECIAL', i === 0 ? mx : mx + mw, my - 4)
  })

  ctx.fillStyle = '#0d0d16'
  ctx.fillRect(W / 2 - 30, 10, 60, 40)
  ctx.font = `20px ${HUD_FONT}`
  ctx.fillStyle = m.timer <= 10 ? '#e0393e' : '#f2b90c'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(Math.ceil(m.timer)).padStart(2, '0'), W / 2, 31)
}

function drawBanner(ctx, text, t) {
  const scale = Math.min(1, 0.4 + t * 3)
  ctx.save()
  ctx.translate(W / 2, H / 2 - 30)
  ctx.scale(scale, scale)
  ctx.font = `${text.length > 10 ? 26 : 44}px ${HUD_FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 10
  ctx.strokeStyle = '#1a0a0a'
  ctx.strokeText(text, 0, 0)
  ctx.fillStyle = '#f2b90c'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

export function drawMatch(ctx, m) {
  ctx.save()
  if (m.shake > 0) ctx.translate((Math.random() - 0.5) * 14 * m.shake * 4, (Math.random() - 0.5) * 10 * m.shake * 4)
  drawBackground(ctx, m.clock)
  // Draw the one who's attacking on top.
  const order = [...m.fighters].sort((a, b) => (a.action ? 1 : 0) - (b.action ? 1 : 0))
  order.forEach((f) => drawFighter(ctx, f))
  m.projectiles.forEach((p) => drawProjectile(ctx, p))
  drawSparks(ctx, m.sparks)
  ctx.restore()
  drawHud(ctx, m)
  if (m.banner) drawBanner(ctx, m.banner, m.phaseT % 1.4)
}
