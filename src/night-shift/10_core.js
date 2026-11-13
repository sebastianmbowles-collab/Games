'use strict';
// ---------- core: constants, save data, per-night state ----------
const W = 480, H = 270, MIN = 1.25, LIMIT = 6, SAVE = 'nightshift-v1';
const $ = id => document.getElementById(id);
const cv = $('cv');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.random() * a.length | 0];
const hsh = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const wait = s => new Promise(r => setTimeout(r, s * 1000));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// P = everything that survives closing the tab. R = the current run (one attempt at the seven nights).
let P = { endings: [], reduce: false, vol: 0.8, run: null, myRule: '' };
try { const s = JSON.parse(localStorage.getItem(SAVE)); if (s && typeof s === 'object') P = Object.assign(P, s); } catch (e) { /* storage blocked: play without saving */ }
function save() { try { localStorage.setItem(SAVE, JSON.stringify(P)); } catch (e) { /* ignore */ } }
let R = P.run;
function newRun(name) { R = P.run = { name: (name || '').trim().toUpperCase().slice(0, 18) || 'YOU', night: 1, strikes: 0, broken: [], mem: [], pay: 0, told: false }; save(); }
const has = m => R.mem.includes(m);

// G = the state of tonight. Rebuilt from scratch every night.
const G = { scene: 'title', epoch: 0, modal: 0, ext: { station: 1, lit: 1, dawn: 0, fig: null }, eyes: 0, cam: 480, view: 1, time: 0 };
function resetNight(n) {
  Object.assign(G, {
    scene: 'play', night: n, t: -3, speed: 1, modal: 0, started: false, view: 1, cam: 480, zoom: null, feed: 0, eyes: 0, eyesHeld: false,
    lights: true, power: true, flick: 0, flickStrong: false, flickFigs: [], dark: 0, shock: 0, glimpse: 0, lightsOffT: 0,
    sched: [], people: [], pid: 0, counter: null, receipt: null, receiptsRead: 0, total: 0,
    phone: { plugged: true, call: null, shake: 0 }, fridge: [], thirteen: 0, wrong: 0,
    behind: null, wave: null, knock: null, knockAnim: 0, camLabels: [1, 2, 3, 4], cam4On: false, cam4Trap: false, cam98: 0,
    doorAjar: 0, outside: [], nightStrikes: 0, tips: 0, deduct: 0, clockStop: false, stopT: 0, ended: false,
    paperGone: false, rule12: false, binder: false, clipboard: false, doorGlow: false, tickT: 0, ticking: false, remember: false,
    staffOpen: n >= 5, newDoor: n >= 2, emptyShelf: n === 3, toiletOpen: false, finale: false, docOpen: false, hover: null
  });
  mkFridge(n === 7 ? 0 : 12);
}
// Clock: G.t is minutes after 3:00 AM. The shift runs 0..180.
function fmt(t) { const m = Math.floor(t + 180 + 1e-6), h = Math.floor(m / 60), mm = m % 60; return h + ':' + (mm < 10 ? '0' : '') + mm; }
function at(str, fn) { const [h, m] = str.split(':').map(Number); G.sched.push({ t: (h - 3) * 60 + m, fn }); }
function runSched() {
  for (const e of G.sched) if (!e.done && e.t <= G.t) { e.done = true; try { e.fn(); } catch (err) { console.error(err); } if (G.modal) break; }
}

// Fridge: bottles are loose on three shelves so you really do have to count.
function mkFridge(n) { G.fridge = []; for (let i = 0; i < n; i++) addBottle(false); }
function addBottle(odd) {
  const per = [0, 0, 0]; G.fridge.forEach(b => per[b.s]++);
  let s = per.indexOf(Math.min(...per)); if (Math.random() < 0.4) s = Math.random() * 3 | 0; if (per[s] >= 6) s = per.indexOf(Math.min(...per));
  let x = 0, ok = false;
  for (let k = 0; k < 40 && !ok; k++) { x = rnd(0.02, 0.94); ok = !G.fridge.some(b => b.s === s && Math.abs(b.x - x) < 0.075); }
  G.fridge.push({ s, x, odd: !!odd });
}
