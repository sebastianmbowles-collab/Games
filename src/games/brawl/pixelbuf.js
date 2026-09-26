// A tiny pixel-art "paint program". Shapes are painted into a grid where every pixel remembers
// its color and which body part (region) it belongs to. finish() then does what a pixel artist
// does by hand: highlights on the top-left of each part, shadows on the bottom-right, a darker
// line where a part overlaps the one behind it, and a colored outline around the whole sprite.

const HIGHLIGHT = [255, 244, 208]
const SHADOW = [42, 26, 74]
const OUTLINE = [20, 12, 28]

export const FLAT = 1 // no shading (eyes, shiny bits)

function rgb(c) {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255]
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function scale(a, f) {
  return [a[0] * f, a[1] * f, a[2] * f]
}

export class PixelBuf {
  constructor(w, h) {
    this.w = w
    this.h = h
    this.col = new Int32Array(w * h)
    this.reg = new Uint16Array(w * h)
    this.flag = new Uint8Array(w * h)
    this.details = []
    this.nextRegion = 1
    this.ox = 0
    this.oy = 0
    this.canvas = document.createElement('canvas')
    this.canvas.width = w
    this.canvas.height = h
    this.ctx = this.canvas.getContext('2d')
    this.image = this.ctx.createImageData(w, h)
  }

  clear() {
    this.reg.fill(0)
    this.flag.fill(0)
    this.details.length = 0
    this.nextRegion = 1
  }

  // Start a new body part. Parts painted later count as "in front".
  part() {
    return this.nextRegion++
  }

  origin(x, y) {
    this.ox = x
    this.oy = y
  }

  set(x, y, c, r, f = 0) {
    x = Math.floor(x + this.ox)
    y = Math.floor(y + this.oy)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const i = y * this.w + x
    this.col[i] = c
    this.reg[i] = r
    this.flag[i] = f
  }

  ellipse(cx, cy, rx, ry, c, r, f = 0) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx
        const dy = (y + 0.5 - cy) / ry
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, r, f)
      }
    }
  }

  rect(x, y, w, h, c, r, f = 0) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, r, f)
  }

  // Filled polygon from [[x, y], ...]
  poly(pts, c, r, f = 0) {
    const ys = pts.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const py = y + 0.5
      const xs = []
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i]
        const [x2, y2] = pts[(i + 1) % pts.length]
        if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) xs.push(x1 + ((py - y1) / (y2 - y1)) * (x2 - x1))
      }
      xs.sort((a, b) => a - b)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c, r, f)
      }
    }
  }

  // A rounded limb from (x0,y0) to (x1,y1) that can taper from radius r0 to r1.
  capsule(x0, y0, x1, y1, r0, r1, c, r, f = 0) {
    const minX = Math.floor(Math.min(x0 - r0, x1 - r1))
    const maxX = Math.ceil(Math.max(x0 + r0, x1 + r1))
    const minY = Math.floor(Math.min(y0 - r0, y1 - r1))
    const maxY = Math.ceil(Math.max(y0 + r0, y1 + r1))
    const dx = x1 - x0
    const dy = y1 - y0
    const len2 = dx * dx + dy * dy || 1
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5
        const py = y + 0.5
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2))
        const qx = x0 + dx * t - px
        const qy = y0 + dy * t - py
        const rad = r0 + (r1 - r0) * t
        if (qx * qx + qy * qy <= rad * rad) this.set(x, y, c, r, f)
      }
    }
  }

  // Detail pixels (eyes, mouths, stripes) go on top after shading, exactly as given.
  dot(x, y, c) {
    this.details.push(Math.floor(x + this.ox), Math.floor(y + this.oy), c)
  }

  dots(list, c) {
    for (const [x, y] of list) this.dot(x, y, c)
  }

  line(x0, y0, x1, y1, c) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let i = 0; i <= steps; i++) this.dot(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), c)
  }

  // `tint` optionally recolors every body pixel, e.g. for costumes.
  finish(tint = null) {
    const { w, h, col, reg, flag } = this
    const out = this.image.data
    out.fill(0)
    const same = (x, y, r) => x >= 0 && y >= 0 && x < w && y < h && reg[y * w + x] === r
    const regAt = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? reg[y * w + x] : 0)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        const r = reg[i]
        let c
        if (r) {
          c = rgb(col[i])
          if (!(flag[i] & FLAT)) {
            const edgeDark = !same(x + 1, y, r) || !same(x, y + 1, r)
            const edgeMid = !same(x + 2, y, r) || !same(x, y + 2, r)
            const edgeLight = !same(x - 1, y, r) || !same(x, y - 1, r)
            if (edgeDark) c = mix(scale(c, 0.66), SHADOW, 0.22)
            else if (edgeMid) c = mix(scale(c, 0.85), SHADOW, 0.08)
            else if (edgeLight) c = mix(c, HIGHLIGHT, 0.3)
            // A part in front of another gets a dark edge where they meet.
            const behind = (nr) => nr !== 0 && nr < r
            if (behind(regAt(x - 1, y)) || behind(regAt(x + 1, y)) || behind(regAt(x, y - 1)) || behind(regAt(x, y + 1))) {
              c = mix(scale(rgb(col[i]), 0.4), OUTLINE, 0.35)
            }
          }
        } else {
          // Outline: empty pixel touching the sprite takes a very dark version of its neighbor.
          let ni = -1
          if (x > 0 && reg[i - 1]) ni = i - 1
          else if (x < w - 1 && reg[i + 1]) ni = i + 1
          else if (y > 0 && reg[i - w]) ni = i - w
          else if (y < h - 1 && reg[i + w]) ni = i + w
          if (ni < 0) continue
          c = mix(scale(rgb(col[ni]), 0.3), OUTLINE, 0.55)
        }
        if (tint) c = tint(c)
        const o = i * 4
        out[o] = c[0]
        out[o + 1] = c[1]
        out[o + 2] = c[2]
        out[o + 3] = 255
      }
    }
    const d = this.details
    for (let k = 0; k < d.length; k += 3) {
      const x = d[k]
      const y = d[k + 1]
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const c = rgb(d[k + 2])
      const o = (y * w + x) * 4
      out[o] = c[0]
      out[o + 1] = c[1]
      out[o + 2] = c[2]
      out[o + 3] = 255
    }
    this.ctx.putImageData(this.image, 0, 0)
    return this.canvas
  }
}
