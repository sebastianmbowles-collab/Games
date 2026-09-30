import { useEffect, useRef } from 'react'

// 2D loading animation on black: a rubber duck runs for its life while
// another duck chases it, swinging a giant hammer. BONK! (it always misses)
function drawDuck(g, x, y, s, t, opts) {
  const { body, beak, band, run = 1 } = opts
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  // legs
  g.strokeStyle = beak
  g.lineWidth = 5
  g.lineCap = 'round'
  for (const ph of [0, Math.PI]) {
    const a = Math.sin(t * 18 * run + ph) * 0.8
    g.beginPath()
    g.moveTo(0, 18)
    g.lineTo(Math.sin(a) * 18, 18 + Math.cos(a) * 16)
    g.lineTo(Math.sin(a) * 18 + 9, 18 + Math.cos(a) * 16)
    g.stroke()
  }
  // tail
  g.fillStyle = body
  g.beginPath()
  g.moveTo(-26, -2)
  g.lineTo(-44, -16)
  g.lineTo(-30, 10)
  g.fill()
  // body
  g.beginPath()
  g.ellipse(0, 4, 32, 22, 0, 0, Math.PI * 2)
  g.fill()
  // wing (flaps while running)
  g.fillStyle = shade(body)
  g.beginPath()
  g.ellipse(-6, 2, 16, 9, -0.3 + Math.sin(t * 20 * run) * 0.4, 0, Math.PI * 2)
  g.fill()
  // head
  g.fillStyle = body
  g.beginPath()
  g.arc(20, -24, 17, 0, Math.PI * 2)
  g.fill()
  if (band) {
    g.fillStyle = band
    g.fillRect(4, -32, 32, 7)
    g.beginPath()
    g.moveTo(5, -30)
    g.lineTo(-10, -38 + Math.sin(t * 25) * 4)
    g.lineTo(-8, -26 + Math.sin(t * 25) * 4)
    g.fill()
  }
  // beak
  g.fillStyle = beak
  g.beginPath()
  g.ellipse(40, -20, 13, 6, 0.1, 0, Math.PI * 2)
  g.fill()
  // eye
  g.fillStyle = '#fff'
  g.beginPath()
  g.arc(26, -28, 6, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#111'
  g.beginPath()
  g.arc(opts.scared ? 25 : 28, -28, 3, 0, Math.PI * 2)
  g.fill()
  if (opts.angry) {
    g.strokeStyle = '#111'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(19, -37)
    g.lineTo(33, -33)
    g.stroke()
  }
  g.restore()
}

function shade(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, (n >> 16) - 40)
  const gg = Math.max(0, ((n >> 8) & 255) - 40)
  const b = Math.max(0, (n & 255) - 40)
  return `rgb(${r},${gg},${b})`
}

export default function LoadingChase({ progress }) {
  const ref = useRef(null)
  const progressRef = useRef(progress)
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    const canvas = ref.current
    const g = canvas.getContext('2d')
    let raf
    const t0 = performance.now()
    const dust = []
    let lastSlam = -1
    const frame = () => {
      const t = (performance.now() - t0) / 1000
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = canvas.clientWidth
      const H = canvas.clientHeight
      if (canvas.width !== Math.round(W * dpr)) {
        canvas.width = Math.round(W * dpr)
        canvas.height = Math.round(H * dpr)
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.fillStyle = '#000'
      g.fillRect(0, 0, W, H)

      const s = Math.min(W / 700, H / 420)
      const ground = H * 0.62
      // swing cycle: 1.4s — wind up, SLAM, recover
      const cyc = (t % 1.4) / 1.4
      const slamming = cyc > 0.55 && cyc < 0.62
      const slamNow = Math.floor(t / 1.4)
      const shake = cyc > 0.6 && cyc < 0.75 ? (Math.random() - 0.5) * 8 : 0
      g.save()
      g.translate(shake, shake * 0.5)

      // scrolling ground dashes and speed lines
      g.strokeStyle = '#444'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(0, ground + 34 * s)
      g.lineTo(W, ground + 34 * s)
      g.stroke()
      g.strokeStyle = '#666'
      for (let i = 0; i < 14; i++) {
        const x = ((i * 90 - t * 420) % (W + 90) + W + 90) % (W + 90) - 45
        g.beginPath()
        g.moveTo(x, ground + 44 * s)
        g.lineTo(x + 30, ground + 44 * s)
        g.stroke()
      }
      g.strokeStyle = 'rgba(255,255,255,0.25)'
      for (let i = 0; i < 6; i++) {
        const y = ground - 80 * s + i * 22 * s
        const x = ((i * 157 - t * 900) % W + W) % W
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + 60, y)
        g.stroke()
      }

      // the runner hops over each slam
      const runX = W * 0.62 + Math.sin(t * 1.3) * 20 * s
      const hop = cyc > 0.5 && cyc < 0.72 ? Math.sin(((cyc - 0.5) / 0.22) * Math.PI) * 50 * s : Math.abs(Math.sin(t * 18)) * 4 * s
      drawDuck(g, runX, ground - hop, s * 1.1, t, { body: '#ffd23f', beak: '#ff8f1f', run: 1.2, scared: true })
      // sweat drops
      g.fillStyle = '#7cd4ff'
      for (let i = 0; i < 2; i++) {
        const k = (t * 2 + i * 0.5) % 1
        g.globalAlpha = 1 - k
        g.beginPath()
        g.arc(runX - 10 * s - k * 30 * s, ground - hop - 70 * s + k * 20 * s, 4 * s, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1

      // the chaser with a GIANT hammer
      const chX = W * 0.3 + Math.sin(t * 1.3 + 0.5) * 20 * s
      const chY = ground - Math.abs(Math.sin(t * 16)) * 4 * s
      let ang
      if (cyc < 0.45) ang = -2.6 + (cyc / 0.45) * -0.3 // wind up behind the head
      else if (cyc < 0.58) ang = -2.9 + ((cyc - 0.45) / 0.13) * 3.1 // SLAM
      else ang = 0.2 - ((cyc - 0.58) / 0.42) * 2.8 // lift back up
      const px = chX + 10 * s
      const py = chY - 10 * s
      g.save()
      g.translate(px, py)
      g.rotate(ang)
      g.fillStyle = '#8a5a2b'
      g.fillRect(0, -5 * s, 150 * s, 10 * s)
      g.fillStyle = '#9aa1ad'
      g.fillRect(130 * s, -38 * s, 60 * s, 76 * s)
      g.fillStyle = '#c4cad3'
      g.fillRect(134 * s, -34 * s, 14 * s, 68 * s)
      g.strokeStyle = '#222'
      g.lineWidth = 3
      g.strokeRect(130 * s, -38 * s, 60 * s, 76 * s)
      g.restore()
      drawDuck(g, chX, chY, s * 1.1, t, { body: '#7b5cd6', beak: '#ff8f1f', band: '#e53935', run: 1.1, angry: true })

      // BONK! when the hammer hits the ground
      if (slamming && lastSlam !== slamNow) {
        lastSlam = slamNow
        const hx = px + Math.cos(0.2) * 160 * s
        for (let i = 0; i < 14; i++) dust.push({ x: hx, y: ground + 30 * s, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 250, t: 0 })
      }
      for (const d of dust) {
        d.t += 1 / 60
        d.x += (d.vx - 420) / 60
        d.y += d.vy / 60
        d.vy += 600 / 60
      }
      while (dust.length && dust[0].t > 0.8) dust.shift()
      g.fillStyle = '#bbb'
      for (const d of dust) {
        g.globalAlpha = 1 - d.t / 0.8
        g.beginPath()
        g.arc(d.x, d.y, 5 * s, 0, Math.PI * 2)
        g.fill()
      }
      g.globalAlpha = 1
      if (cyc > 0.56 && cyc < 0.85) {
        const k = (cyc - 0.56) / 0.29
        g.save()
        g.translate(chX + 170 * s, ground - 40 * s - k * 30 * s)
        g.rotate(-0.15)
        g.scale(1 + (1 - k) * 0.5, 1 + (1 - k) * 0.5)
        g.globalAlpha = 1 - k
        g.font = `${Math.round(38 * s)}px "Press Start 2P", monospace`
        g.textAlign = 'center'
        g.lineWidth = 6
        g.strokeStyle = '#ff4d6d'
        g.strokeText('BONK!', 0, 0)
        g.fillStyle = '#ffd23f'
        g.fillText('BONK!', 0, 0)
        g.restore()
      }
      g.restore()

      // loading bar
      const p = progressRef.current
      const bw = Math.min(420, W * 0.7)
      const bx = (W - bw) / 2
      const by = H * 0.82
      g.strokeStyle = '#fff'
      g.lineWidth = 3
      g.strokeRect(bx, by, bw, 22)
      const grad = g.createLinearGradient(bx, 0, bx + bw, 0)
      ;['#ff4d6d', '#ffd23f', '#2bd96b', '#3aa0ff', '#b36bff'].forEach((c, i) => grad.addColorStop(i / 4, c))
      g.fillStyle = grad
      g.fillRect(bx + 3, by + 3, (bw - 6) * (p / 100), 16)
      g.fillStyle = '#fff'
      g.font = '12px "Press Start 2P", monospace'
      g.textAlign = 'center'
      g.fillText(`LOADING… ${Math.floor(p)}%`, W / 2, by + 48)

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="bonk-loading-chase" />
}
