export const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Graphics quality. SMOOTH HD has glow, shadows and full resolution. 64-BIT RETRO is the old chunky look.
export const GFX = [
  { name: 'SMOOTH HD', pr: 2, bloom: true, shadows: true },
  { name: 'SMOOTH', pr: 1, bloom: true, shadows: false },
  { name: '64-BIT RETRO', pr: 0.34, bloom: false, shadows: false, retro: true },
];

export const G = {
  w: 1, h: 1, dpr: 1, time: 0, mode: 'title',
  settings: { music: 6, sfx: 8, gfx: isTouch ? 1 : 0, hints: true },
  keys: {}, pressed: {},
  mouse: { x: 0, y: 0, nx: 0, ny: 0, down: false, pid: null, moved: false },
  cameras: [], shake: 0,
};
try { Object.assign(G.settings, JSON.parse(localStorage.getItem('aa-settings2') || '{}')); } catch (e) { /* no storage */ }
export function saveSettings() {
  try { localStorage.setItem('aa-settings2', JSON.stringify(G.settings)); } catch (e) { /* no storage */ }
}
export function loadSave() {
  try { return JSON.parse(localStorage.getItem('aa-save') || 'null'); } catch (e) { return null; }
}
export function writeSave(s) {
  try { localStorage.setItem('aa-save', JSON.stringify(s)); } catch (e) { /* no storage */ }
}
export function clearSave() {
  try { localStorage.removeItem('aa-save'); } catch (e) { /* no storage */ }
}

export const rnd = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const pick = a => a[(Math.random() * a.length) | 0];
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
