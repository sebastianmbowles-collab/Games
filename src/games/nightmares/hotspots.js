// Where each clickable/shine-able thing is on the screen right now, in a
// 960x540 space. The 3D room updates these every frame as the camera moves.

export const W = 960
export const H = 540

export const HOTSPOTS = {
  leftDoor: { x: 40, y: 120, w: 140, h: 380 },
  rightDoor: { x: W - 180, y: 120, w: 140, h: 380 },
  computer: { x: 250, y: 170, w: 145, h: 100 },
  window: { x: 395, y: 85, w: 170, h: 170 },
  paintings: { x: 570, y: 95, w: 160, h: 110 },
  underBed: { x: 300, y: 355, w: 360, h: 100 },
}

export function inHotspot(key, x, y, pad = 0) {
  const r = HOTSPOTS[key]
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad
}
