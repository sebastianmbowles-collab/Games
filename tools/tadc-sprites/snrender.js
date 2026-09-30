// Draws a Stick Nodes stickfigure (from sticknodes-rs JSON) onto a canvas.
function snLayout(fig, yUp) {
  const nodes = []
  const byIdx = {}
  function walk(n, parent, pabs) {
    const abs = parent ? pabs + n.local_angle : 0
    const rad = (abs * Math.PI) / 180
    const len = n.length * (n.use_segment_scale ? n.scale : 1)
    const x = parent ? parent.x + Math.cos(rad) * len : 0
    const y = parent ? parent.y + (yUp ? -1 : 1) * Math.sin(rad) * len : 0
    const rec = { n, parent, x, y, abs }
    nodes.push(rec)
    byIdx[n.draw_order_index] = rec
    for (const c of n.children) walk(c, rec, abs)
  }
  for (const r of fig.nodes) walk(r, null, 0)
  return { nodes, byIdx }
}
function rgba(c) { return `rgba(${c.red},${c.green},${c.blue},${c.alpha / 255})` }
function curvePoints(p0, p1, v, steps = 16) {
  // v = how many degrees the bone bends away from a straight line at each end.
  if (!v) return [p0, p1]
  const dx = p1.x - p0.x, dy = p1.y - p0.y
  const L = Math.hypot(dx, dy) || 1
  const half = Math.min(Math.abs(v), 179) * Math.PI / 180
  const R = (L / 2) / Math.sin(half)
  const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2
  const h = R * Math.cos(half)
  const nx = -dy / L, ny = dx / L
  const s = Math.sign(v)
  const cx = mx + nx * h * s, cy = my + ny * h * s
  const a0 = Math.atan2(p0.y - cy, p0.x - cx)
  const a1 = Math.atan2(p1.y - cy, p1.x - cx)
  let da = a1 - a0
  // go the long way round when the bend is more than 90 degrees
  while (da > Math.PI) da -= 2 * Math.PI
  while (da < -Math.PI) da += 2 * Math.PI
  if (Math.abs(v) > 90) da = da > 0 ? da - 2 * Math.PI : da + 2 * Math.PI
  const pts = []
  for (let i = 0; i <= steps; i++) { const a = a0 + (da * i) / steps; pts.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }) }
  return pts
}
function snDraw(c, fig, opts = {}) {
  const { nodes, byIdx } = snLayout(fig, opts.yUp)
  const figColor = fig.color
  const polysByAnchor = {}
  for (const p of fig.polyfills) (polysByAnchor[p.anchor_node_draw_index] ||= []).push(p)
  const ordered = [...nodes].sort((a, b) => a.n.draw_order_index - b.n.draw_order_index)
  const flip = opts.curveFlip ? -1 : 1
  for (const rec of ordered) {
    for (const pf of polysByAnchor[rec.n.draw_order_index] || []) {
      const ids = [pf.anchor_node_draw_index, ...pf.attached_node_draw_indices].filter((i) => byIdx[i])
      const pts = []
      for (let k = 0; k < ids.length; k++) {
        const A = byIdx[ids[k]]
        const B = byIdx[ids[(k + 1) % ids.length]]
        pts.push({ x: A.x, y: A.y })
        if (ids.length < 2) break
        // follow a curved bone between two joined nodes
        if (B.parent === A && B.n.segment_curve_radius_and_default_curve_radius) pts.push(...curvePoints(A, B, B.n.segment_curve_radius_and_default_curve_radius * flip).slice(1, -1))
        else if (A.parent === B && A.n.segment_curve_radius_and_default_curve_radius) pts.push(...curvePoints(B, A, A.n.segment_curve_radius_and_default_curve_radius * flip).slice(1, -1).reverse())
      }
      if (ids.length === 1) {
        const A = byIdx[ids[0]]
        if (A.parent && A.n.segment_curve_radius_and_default_curve_radius) pts.push(...curvePoints(A.parent, A, A.n.segment_curve_radius_and_default_curve_radius * flip))
      }
      c.beginPath()
      pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
      c.closePath()
      c.fillStyle = rgba(pf.use_polyfill_color ? pf.color : figColor)
      c.fill()
    }
    const n = rec.n
    if (!rec.parent || n.node_type === 'RootNode') continue
    const p0 = rec.parent, p1 = rec
    const col = rgba(n.use_segment_color ? n.color : figColor)
    let t = n.thickness * (n.use_segment_scale ? n.scale : 1)
    if (opts.minWidth && t > 0 && (n.node_type === 'RoundedSegment' || n.node_type === 'Segment')) t = Math.max(t, opts.minWidth)
    c.fillStyle = col
    c.strokeStyle = col
    const dx = p1.x - p0.x, dy = p1.y - p0.y
    const L = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    if (n.node_type === 'RoundedSegment' || n.node_type === 'Segment') {
      if (t <= 0) continue
      const pts = curvePoints(p0, p1, n.segment_curve_radius_and_default_curve_radius * flip)
      c.lineWidth = t
      c.lineCap = n.node_type === 'RoundedSegment' ? 'round' : 'butt'
      c.lineJoin = 'round'
      c.beginPath()
      pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
      c.stroke()
    } else if (n.node_type === 'Circle' || n.node_type === 'FilledCircle') {
      const cx = (p0.x + p1.x) / 2, cy = (p0.y + p1.y) / 2
      c.beginPath()
      if (n.half_arc) c.arc(cx, cy, L / 2, ang, ang + Math.PI)
      else c.arc(cx, cy, L / 2, 0, Math.PI * 2)
      if (n.circle_is_hollow) { c.lineWidth = t; c.stroke() } else c.fill()
      if (n.use_circle_outline) { c.lineWidth = Math.max(1, t / 4); c.strokeStyle = rgba(n.circle_outline_color); c.stroke() }
    } else if (n.node_type === 'Ellipse') {
      c.beginPath()
      c.ellipse((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, L / 2, t / 2, ang, 0, Math.PI * 2)
      if (n.circle_is_hollow) { c.lineWidth = 2; c.stroke() } else c.fill()
    } else if (n.node_type === 'Trapezoid') {
      const w0 = (n.use_trapezoid_thickness_start ? n.trapezoid_thickness_start : t) / 2
      const w1 = (n.use_trapezoid_thickness_end ? n.trapezoid_thickness_end : t) / 2
      const nx = -Math.sin(ang), ny = Math.cos(ang)
      c.beginPath()
      c.moveTo(p0.x + nx * w0, p0.y + ny * w0)
      c.lineTo(p1.x + nx * w1, p1.y + ny * w1)
      c.lineTo(p1.x - nx * w1, p1.y - ny * w1)
      c.lineTo(p0.x - nx * w0, p0.y - ny * w0)
      c.closePath()
      c.fill()
      if (n.trapezoid_is_rounded_start) { c.beginPath(); c.arc(p0.x, p0.y, w0, 0, 7); c.fill() }
      if (n.trapezoid_is_rounded_end) { c.beginPath(); c.arc(p1.x, p1.y, w1, 0, 7); c.fill() }
    } else if (n.node_type === 'Triangle') {
      const nx = -Math.sin(ang), ny = Math.cos(ang)
      const w = t / 2
      let base = p0, tip = p1
      if (n.triangle_upside_down) { base = p1; tip = p0 }
      c.beginPath()
      if (n.triangle_type === 'Right') {
        const s = n.triangle_flipped ? -1 : 1
        c.moveTo(base.x + nx * w * s, base.y + ny * w * s); c.lineTo(base.x - nx * w * s, base.y - ny * w * s); c.lineTo(tip.x + nx * w * s, tip.y + ny * w * s)
      } else {
        c.moveTo(base.x + nx * w, base.y + ny * w); c.lineTo(base.x - nx * w, base.y - ny * w); c.lineTo(tip.x, tip.y)
      }
      c.closePath()
      c.fill()
    } else if (n.node_type === 'Polygon') {
      const k = n.num_polygon_vertices
      c.beginPath()
      for (let i = 0; i < k; i++) { const a = ang + (i * 2 * Math.PI) / k; const px = (p0.x + p1.x) / 2 + Math.cos(a) * L / 2, py = (p0.y + p1.y) / 2 + Math.sin(a) * L / 2; i ? c.lineTo(px, py) : c.moveTo(px, py) }
      c.closePath(); c.fill()
    }
  }
}
// Bounding box (rough, uses joint positions plus thickness)
function snBounds(fig, opts = {}) {
  const { nodes } = snLayout(fig, opts.yUp)
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of nodes) {
    const t = (r.n.thickness || 0) / 2 + 2
    x0 = Math.min(x0, r.x - t); y0 = Math.min(y0, r.y - t); x1 = Math.max(x1, r.x + t); y1 = Math.max(y1, r.y + t)
  }
  return { x0, y0, x1, y1 }
}
