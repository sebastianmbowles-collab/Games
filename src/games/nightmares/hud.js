// Everything drawn flat on top of the 3D room: the clock, the flashlight
// battery, Leon's heartbeat, the inside of the blanket, and the jumpscares.

import * as T from './textures'
import { W, H } from './hotspots'

const TYPE = '"Special Elite", "Courier New", monospace'
const SERIF = '"IM Fell English", Georgia, serif'
const CANDLE = '#f0b35e'
const BONE = '#e4dccb'

let faces = null
function getFaces() {
  if (!faces) {
    faces = {
      shadow: T.shadowFace(),
      tallMan: T.tallManFace(),
      grabber: T.grabberFace(),
      glitch: T.glitchFace(),
      painted: T.portrait('lady', true, true),
      eyes: T.manyEyes(),
      blanket: T.blanketInside(),
    }
  }
  return faces
}

function faceFor(kind) {
  const f = getFaces()
  if (kind === 'window') return f.tallMan
  if (kind === 'computer') return f.glitch
  if (kind === 'paintings') return f.painted
  if (kind === 'underBed') return f.grabber
  return f.shadow
}

export function drawHud(ctx, s) {
  const hour = Math.min(6, Math.floor(s.t / s.hourLength))
  ctx.save()
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 8
  ctx.fillStyle = BONE
  ctx.font = `28px ${TYPE}`
  ctx.fillText(`${hour === 0 ? 12 : hour}:00 A.M.`, 24, 44)
  ctx.font = `italic 16px ${SERIF}`
  ctx.fillStyle = 'rgba(228,220,203,0.65)'
  ctx.fillText(s.title, 24, 68)

  // Flashlight battery.
  const secs = Math.ceil((Math.max(0, s.battery) / 100) * s.batterySeconds)
  const bx = W - 190
  ctx.font = `13px ${TYPE}`
  ctx.fillStyle = s.batteryDead ? '#c43a4c' : CANDLE
  ctx.fillText(s.batteryDead ? 'FLASHLIGHT — DEAD' : `FLASHLIGHT  ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, bx, 36)
  ctx.fillStyle = 'rgba(228,220,203,0.18)'
  ctx.fillRect(bx, 44, 166, 4)
  ctx.fillStyle = s.battery > 20 ? CANDLE : '#c43a4c'
  ctx.fillRect(bx, 44, 166 * (Math.max(0, s.battery) / 100), 4)

  // Leon's heartbeat: the more scared he is, the faster it beats.
  const bpm = Math.round(72 + s.fear * 1.1)
  const hx = 24
  const hy = H - 30
  ctx.font = `13px ${TYPE}`
  ctx.fillStyle = s.fear > 75 ? '#c43a4c' : BONE
  ctx.fillText(`LEON'S HEART  ${bpm}`, hx, hy - 34)
  ctx.strokeStyle = s.fear > 75 ? '#c43a4c' : 'rgba(228,220,203,0.8)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  const speed = bpm / 60
  for (let i = 0; i <= 160; i++) {
    const ph = (i / 40 - s.t * speed) % 1
    const p = ph < 0 ? ph + 1 : ph
    let y = 0
    if (p < 0.08) y = -Math.sin((p / 0.08) * Math.PI) * 4
    else if (p > 0.14 && p < 0.18) y = 6
    else if (p >= 0.18 && p < 0.23) y = -22
    else if (p >= 0.23 && p < 0.27) y = 10
    ctx.lineTo(hx + i, hy - 10 + y)
  }
  ctx.stroke()

  // Which doors Leon is holding shut.
  const held = []
  if (s.holding?.leftDoor) held.push('LEFT')
  if (s.holding?.rightDoor) held.push('RIGHT')
  if (held.length) {
    ctx.textAlign = 'center'
    ctx.font = `15px ${TYPE}`
    ctx.fillStyle = CANDLE
    ctx.fillText(`holding the ${held.join(' + ').toLowerCase()} door shut...`, W / 2, H - 24)
    ctx.textAlign = 'left'
  }
  ctx.restore()
}

// Red, throbbing edges when Leon is scared.
export function drawFearVignette(ctx, fear, t) {
  if (fear < 45) return
  const k = (fear - 45) / 55
  const beat = 0.6 + 0.4 * Math.max(0, Math.sin(t * (4 + k * 6)))
  const g = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 560)
  g.addColorStop(0, 'rgba(90,0,0,0)')
  g.addColorStop(1, `rgba(90,0,0,${0.6 * k * beat})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// The inside of the blanket. Sometimes, fingers press in from outside.
export function drawBlanketView(ctx, t, danger) {
  const f = getFaces()
  ctx.drawImage(f.blanket, 0, 0, W, H)
  if (danger >= 2) {
    const px = W / 2 + Math.sin(t * 0.7) * 220
    const py = H / 2 + Math.cos(t * 0.5) * 110
    ctx.save()
    ctx.filter = 'blur(10px)'
    for (let k = -2; k <= 2; k++) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.ellipse(px + k * 28, py - Math.abs(k) * 12 + Math.sin(t * 3 + k) * 4, 12, 34, k * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.ellipse(px, py + 60, 64, 44, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.textAlign = 'center'
  ctx.font = `italic 22px ${SERIF}`
  ctx.fillStyle = 'rgba(228,220,203,0.75)'
  ctx.fillText(danger >= 2 ? 'Something is touching the blanket...' : 'Hiding under the blanket...', W / 2, H / 2 - 6)
  ctx.font = `12px ${TYPE}`
  ctx.fillStyle = 'rgba(228,220,203,0.45)'
  ctx.fillText('let go of SPACE to peek out', W / 2, H / 2 + 22)
  ctx.textAlign = 'left'
}

// The monster lunges out of the dark right into your face.
export function drawScare(ctx, kind, p, t) {
  const f = getFaces()
  ctx.save()
  const strobe = Math.floor(t * 16) % 2 === 0
  ctx.fillStyle = p < 0.5 && strobe ? '#3a0000' : '#000'
  ctx.fillRect(0, 0, W, H)
  if (kind === 'fear') ctx.drawImage(f.eyes, 0, 0, W, H)
  const img = faceFor(kind)
  const lunge = Math.min(1, p / 0.12)
  const size = H * (0.25 + lunge * 1.45) * (1 + Math.sin(t * 30) * 0.02)
  const shake = 40 * (1 - p * 0.6)
  const dx = (Math.random() - 0.5) * shake
  const dy = (Math.random() - 0.5) * shake
  const w = size * (img.width / img.height)
  ctx.drawImage(img, W / 2 - w / 2 + dx, H / 2 - size / 2 + dy, w, size)
  ctx.globalAlpha = 0.35
  ctx.globalCompositeOperation = 'lighter'
  ctx.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)'
  ctx.drawImage(img, W / 2 - w / 2 + dx + 16, H / 2 - size / 2 + dy, w * 1.03, size * 1.03)
  ctx.filter = 'none'
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  for (let i = 0; i < 500; i++) {
    const g = Math.random() * 255
    ctx.fillStyle = `rgba(${g},${g},${g},0.3)`
    ctx.fillRect(Math.random() * W, Math.random() * H, 3, 2)
  }
  for (let i = 0; i < 5; i++) {
    const y = Math.random() * H
    const slice = 6 + Math.random() * 24
    ctx.drawImage(ctx.canvas, 0, y, W, slice, (Math.random() - 0.5) * 70, y, W, slice)
  }
  ctx.restore()
}

// A monster face that flashes for a split second. Was it really there?
export function drawHallucination(ctx, kind, t) {
  const img = faceFor(kind === 'fear' ? 'leftDoor' : kind)
  ctx.save()
  ctx.globalAlpha = 0.45
  ctx.globalCompositeOperation = 'screen'
  const size = H * 1.1
  const w = size * (img.width / img.height)
  ctx.drawImage(img, W / 2 - w / 2 + Math.sin(t * 50) * 8, H / 2 - size / 2, w, size)
  ctx.restore()
}
