// Things the game remembers between plays: high score, skins you unlocked, badges you earned.
import { THREE } from './engine.js';
import { G } from './state.js';
import { sfx } from './audio.js';
import * as H from './hud.js';

export const SKINS = [
  { id: 'gunmetal', name: 'GUNMETAL', how: 'Always unlocked', metal: 0x66728a, lite: 0x9aa8bd, dark: 0x2b313b },
  { id: 'bronze', name: 'BRONZE', how: 'Beat Mission 1', metal: 0xb87333, lite: 0xd89a5a, dark: 0x4a2a14, m: 0.9, r: 0.3 },
  { id: 'silver', name: 'SILVER', how: 'Beat Mission 2', metal: 0xd0d6e0, lite: 0xf4f6fa, dark: 0x5a6070, m: 1, r: 0.18 },
  { id: 'camo', name: 'CAMO', how: 'Beat Mission 3', metal: 0x5a6a3a, lite: 0x7a8a4a, dark: 0x2a2a1a, m: 0.2, r: 0.7 },
  { id: 'redblack', name: 'RED AND BLACK', how: 'Beat General Vrax', metal: 0xb01818, lite: 0x1e1e22, dark: 0x0a0a0c, m: 0.6, r: 0.3 },
  { id: 'gold', name: 'GOLD', how: 'Beat Mission 5', metal: 0xffc83a, lite: 0xffe08a, dark: 0x7a5a10, m: 1, r: 0.22 },
  { id: 'rainbow', name: 'RAINBOW', how: 'Beat Mission 6', metal: 0xff4040, lite: 0xffffff, dark: 0x202020, rainbow: true },
  { id: 'diamond', name: 'DIAMOND', how: 'Beat the Null Emperor', metal: 0xbfefff, lite: 0xeafaff, dark: 0x6aa8c8, m: 0.1, r: 0.04, glow: 0x2a6a8a },
];
export const BADGES = [
  { id: 'first', name: 'FIRST CONTACT', how: 'Defeat your first alien' },
  { id: 'goo100', name: 'GOO BUSTER', how: 'Defeat 100 aliens' },
  { id: 'nohit', name: 'UNTOUCHABLE', how: 'Finish a mission without getting hit' },
  { id: 'overdrive', name: 'OVERCHARGED', how: 'Use Overdrive' },
  { id: 'block10', name: 'BLOCK PARTY', how: 'Block 10 hits with your arm' },
  { id: 'laser', name: 'LASER SHOW', how: 'Unlock the Plasma Laser' },
  { id: 'vrax', name: 'GENERAL DISCHARGE', how: 'Defeat General Vrax' },
  { id: 'emperor', name: 'GALAXY SAVED', how: 'Defeat the Null Emperor' },
  { id: 'patient', name: 'JUNGLE SURVIVOR', how: 'Defeat Patient Zero' },
  { id: 'commander', name: 'TRUE COMMANDER', how: 'Defeat a boss on COMMANDER difficulty' },
  { id: 'score', name: 'HIGH ROLLER', how: 'Score 50,000 points' },
];

const KEY = 'aa-progress';
export const PROG = { high: 0, skins: ['gunmetal'], badges: [], skin: 'gunmetal', kills: 0, blocks: 0 };
try { Object.assign(PROG, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* no storage */ }
export function saveProg() { try { localStorage.setItem(KEY, JSON.stringify(PROG)); } catch (e) { /* no storage */ } }

let toast = null;
export function unlockBadge(id) {
  if (PROG.badges.includes(id)) return;
  PROG.badges.push(id); saveProg();
  const b = BADGES.find(x => x.id === id);
  toast = { title: 'BADGE UNLOCKED!', name: b.name, t: 3.5, col: '#ffe14a' };
  sfx.select();
}
export function unlockSkin(id) {
  if (!id || PROG.skins.includes(id)) return;
  PROG.skins.push(id); saveProg();
  const s = SKINS.find(x => x.id === id);
  toast = { title: 'NEW SKIN UNLOCKED!', name: s.name, t: 3.5, col: '#7fe3ff' };
  sfx.select();
}
export function addScore(n, score) {
  const s = score + n;
  if (s > PROG.high) { PROG.high = s; saveProg(); }
  if (s >= 50000) unlockBadge('score');
  return s;
}
export function drawToast(dt) {
  if (!toast) return;
  toast.t -= dt;
  if (toast.t <= 0) { toast = null; return; }
  const W = G.w, w = Math.min(380, W - 20), x = (W - w) / 2, slide = Math.min(1, (3.5 - toast.t) * 4, toast.t * 3), y = -60 + slide * 140;
  H.panel(x, y, w, 52, toast.col);
  H.text(toast.title, W / 2, y + 16, 9, toast.col, 'center', { stroke: false });
  H.text(toast.name, W / 2, y + 36, 13, '#ffffff', 'center', { stroke: false });
}

// ===== Skins: recolour UNIT-07's armour =====
// Each metal part remembers whether it is "metal", "lite" (bright trim) or "dark".
const CLASS = { 0x5d6878: 'metal', 0x66728a: 'metal', 0x8c97a8: 'metal', 0x9aa5b6: 'metal', 0x8d99ab: 'lite', 0x9aa8bd: 'lite', 0x2f3540: 'dark', 0x2b313b: 'dark' };
const tagged = [];
export function tagSkin(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    const cls = CLASS[o.material.color.getHex()];
    if (!cls) return;
    o.material = o.material.clone();
    o.material.userData.skin = cls;
    o.material.userData.m0 = o.material.metalness; o.material.userData.r0 = o.material.roughness;
    tagged.push(o.material);
  });
}
const hsl = new THREE.Color();
export function applySkin(time = 0) {
  const s = SKINS.find(x => x.id === PROG.skin) || SKINS[0];
  for (const m of tagged) {
    const cls = m.userData.skin;
    if (s.rainbow && cls === 'metal') m.color.copy(hsl.setHSL((time * 0.15 + (m.id % 7) * 0.14) % 1, 0.9, 0.55));
    else m.color.setHex(s[cls]);
    m.metalness = s.m ?? m.userData.m0; m.roughness = s.r ?? m.userData.r0;
    if (m.emissive) m.emissive.setHex(s.glow && cls !== 'dark' ? s.glow : 0x000000);
  }
}
export const skinIsRainbow = () => PROG.skin === 'rainbow';
