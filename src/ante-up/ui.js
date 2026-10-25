// Everything drawn in HTML on top of the 3D view.
import { C, onKey, onUp, wait } from './core.js';
import { S, ITEMS, meta, saveMeta, fill } from './state.js';
import { A } from './audio.js';

const $ = id => document.getElementById(id);
export const ui = { dlgWait: null, panelOpen: false, rules: null, onPauseQuit: null, busy: 0 };

const ICONS = {
  screw: '<path d="M8 32 L22 18" stroke="#9a6a3a" stroke-width="5" stroke-linecap="round"/><path d="M22 18 L34 6" stroke="#8a8f96" stroke-width="2"/>',
  book: '<rect x="8" y="6" width="24" height="30" rx="2" fill="#5a2a18"/><rect x="11" y="8" width="19" height="26" fill="#d8c8a0"/><path d="M14 14h12M14 19h12M14 24h9" stroke="#6a4a2a"/>',
  match: '<rect x="8" y="12" width="24" height="18" rx="3" fill="#7a4a2a"/><path d="M14 12 V4" stroke="#d8c08a" stroke-width="2"/><circle cx="14" cy="4" r="2.4" fill="#a01a10"/>',
  key: '<circle cx="12" cy="12" r="6" fill="none" stroke="#7a7680" stroke-width="3"/><path d="M16 16 L32 32 M26 26 L30 22 M29 29 L32 26" stroke="#7a7680" stroke-width="3"/>',
  weight: '<path d="M14 10 h12 l4 24 h-20z" fill="#5a5d64"/><circle cx="20" cy="8" r="3" fill="none" stroke="#8a8d94" stroke-width="2"/>',
  shard: '<path d="M10 34 L30 6 L34 28 Z" fill="#c8d4e8" stroke="#fff" stroke-width="1"/>',
  oil: '<rect x="10" y="12" width="18" height="22" rx="3" fill="#7a2a18"/><path d="M26 14 L34 6" stroke="#7a2a18" stroke-width="3"/>',
  map: '<rect x="6" y="8" width="28" height="24" fill="#c8b890"/><path d="M10 26 L18 16 L24 22 L30 12" stroke="#7a1a10" stroke-width="2" fill="none"/><circle cx="30" cy="12" r="2" fill="#7a1a10"/>',
  dice: '<rect x="6" y="14" width="14" height="14" rx="2" fill="#e8dcc0"/><rect x="20" y="8" width="14" height="14" rx="2" fill="#e8dcc0"/><circle cx="13" cy="21" r="1.6" fill="#200"/><circle cx="24" cy="12" r="1.6" fill="#200"/><circle cx="30" cy="18" r="1.6" fill="#200"/>',
  page: '<path d="M10 4 h16 l6 6 v26 h-22z" fill="#d8c8a0"/><path d="M13 14h14M13 19h14M13 24h10" stroke="#6a4a2a"/>',
};

export function initUI() {
  ui.dlg = $('dlg');
  ui.dlg.addEventListener('pointerdown', e => { e.stopPropagation(); advance(); });
  ui.dlg.style.pointerEvents = 'auto';
  onKey((k) => {
    if (ui.modalOpen) return;
    if ((k === 'space' || k === 'enter') && ui.dlgWait) { advance(); return; }
    if (k === 'escape') { if (ui.panelOpen) closePanel(); else if (ui.canPause?.()) openPause(); return; }
    if (ui.screenOpen || ui.blockPanels) return;
    if (k === 'i' || k === 'tab') togglePanel('items');
    if (k === 'j') togglePanel('journal');
    if (k === 'r' && ui.rules) togglePanel('rules');
  });
  onUp(() => { if (ui.dlgWait && !C.mouse.drag && !C.hover) advance(); });
  C.onLocked = why => toast(why);
  ui.sanCv = $('mSan').querySelector('canvas');
  ui.susCv = $('mSus').querySelector('canvas');
  meters(false);
}

// ---------------------------------------------------------------- meters
let lastSan = -1, lastSus = -1;
export function meters(v) { $('meters').style.opacity = v ? 1 : 0; ui.metersOn = v; }
export function drawMeters() {
  const san = Math.round(S.sanity ?? 100), sus = Math.round(S.suspicion ?? 0);
  if (san !== lastSan) {
    lastSan = san;
    const g = ui.sanCv.getContext('2d'), w = 48, h = 76;
    g.clearRect(0, 0, w, h);
    const k = Math.max(0, san) / 100;
    const top = h - 6 - k * 50;
    g.fillStyle = '#3a2a14'; g.fillRect(8, h - 6, 32, 4);
    const grd = g.createLinearGradient(14, 0, 34, 0);
    grd.addColorStop(0, '#b8a888'); grd.addColorStop(0.5, '#efe4cc'); grd.addColorStop(1, '#a89878');
    g.fillStyle = grd; g.fillRect(15, top, 18, h - 6 - top);
    g.fillStyle = 'rgba(230,220,200,.9)'; g.beginPath(); g.ellipse(24, top, 9, 2.5, 0, 0, 7); g.fill();
    if (san > 0) {
      const fh = 6 + k * 12;
      const fg = g.createRadialGradient(24, top - fh * 0.5, 1, 24, top - fh * 0.5, fh);
      fg.addColorStop(0, 'rgba(255,240,200,1)'); fg.addColorStop(0.4, 'rgba(255,160,60,.85)'); fg.addColorStop(1, 'rgba(255,80,0,0)');
      g.fillStyle = fg; g.beginPath(); g.ellipse(24, top - fh * 0.55, fh * 0.45, fh, 0, 0, 7); g.fill();
    }
    $('mSan').querySelector('b').textContent = Math.max(0, san);
    $('mSan').classList.toggle('warn', san <= 25);
  }
  if (sus !== lastSus) {
    lastSus = sus;
    const g = ui.susCv.getContext('2d'), w = 76, h = 48;
    g.clearRect(0, 0, w, h);
    const k = Math.max(0, Math.min(100, sus)) / 100;
    const open = 2 + k * 15;
    g.save();
    g.beginPath(); g.moveTo(6, 24); g.quadraticCurveTo(38, 24 - open * 2, 70, 24); g.quadraticCurveTo(38, 24 + open * 2, 6, 24); g.closePath();
    g.fillStyle = '#e8e2f2'; g.fill(); g.clip();
    const red = Math.floor(80 + k * 175);
    g.fillStyle = `rgb(${red},${Math.floor(200 - k * 180)},${Math.floor(220 - k * 200)})`;
    g.beginPath(); g.arc(38, 24, 10, 0, 7); g.fill();
    g.fillStyle = '#050305'; g.beginPath(); g.ellipse(38, 24, 2 + (1 - k) * 2, 8, 0, 0, 7); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(233,220,195,.6)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(6, 24); g.quadraticCurveTo(38, 24 - open * 2, 70, 24); g.moveTo(6, 24); g.quadraticCurveTo(38, 24 + open * 2, 70, 24); g.stroke();
    $('mSus').querySelector('b').textContent = Math.max(0, sus);
    $('mSus').classList.toggle('warn', sus >= 70);
  }
}

// ---------------------------------------------------------------- small bits
export function status(html) { $('status').innerHTML = html || ''; }
export function keys(html) { $('keys').innerHTML = html || ''; }
export function toast(text, cls = '', sec = 3.2) {
  const d = document.createElement('div');
  d.className = 'toast ' + cls;
  d.innerHTML = text;
  $('toasts').appendChild(d);
  setTimeout(() => { d.style.transition = 'opacity .5s'; d.style.opacity = 0; }, sec * 1000);
  setTimeout(() => d.remove(), sec * 1000 + 600);
}
export function timer(sec) {
  const t = $('timer');
  if (sec === null || sec === undefined) { t.style.display = 'none'; return; }
  t.style.display = 'block';
  const s = Math.max(0, Math.ceil(sec));
  t.innerHTML = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}<small>UNTIL HE RETURNS</small>`;
  t.classList.toggle('low', s <= 30);
}
export function cross(v) { $('cross').style.display = v ? 'block' : 'none'; }

export function updatePrompt() {
  const p = $('prompt'), ring = $('ring');
  const h = C.hover;
  const cv = $('gl');
  if (!h || ui.dlgWait && false) { p.style.display = 'none'; ring.style.display = 'none'; cv.classList.remove('hot'); return; }
  const can = (!h.opts.enabled || h.opts.enabled()) && h.inReach !== false;
  let label = typeof h.opts.label === 'function' ? h.opts.label() : h.opts.label;
  if (!can) {
    const lk = typeof h.opts.locked === 'function' ? h.opts.locked() : h.opts.locked;
    if (h.inReach === false) label = 'Too far away';
    else if (lk) label = lk;
    else { p.style.display = 'none'; ring.style.display = 'none'; cv.classList.remove('hot'); return; }
  }
  if (!label) { p.style.display = 'none'; ring.style.display = 'none'; return; }
  cv.classList.toggle('hot', can);
  p.className = (h.opts.cheat ? 'cheat' : '') + (can ? '' : ' locked');
  const verb = h.opts.hold ? 'Hold' : 'Click';
  p.innerHTML = can ? `<span class="sm">${verb}</span> &nbsp;${label}` : label;
  p.style.display = 'block';
  p.style.left = C.mouse.x + 'px';
  p.style.top = C.mouse.y + 'px';
  const hd = C.holding;
  if (hd && hd.hot === h) {
    ring.style.display = 'block';
    ring.style.left = C.mouse.x + 'px';
    ring.style.top = C.mouse.y + 'px';
    const k = Math.min(1, hd.t / h.opts.hold.time);
    $('ringArc').style.strokeDashoffset = String(138.2 * (1 - k));
    $('ringArc').style.stroke = h.opts.cheat ? '#ff6a4a' : '#ffb45a';
  } else ring.style.display = 'none';
}

// ---------------------------------------------------------------- dialogue
let typer = null;
function advance() {
  const w = ui.dlgWait;
  if (!w) return;
  if (w.typing) { w.finish(); return; }
  ui.dlgWait = null;
  w.res();
}
// who: 'dealer' | 'you' | 'candle' | 'edward' | any label
export function say(who, text, o = {}) {
  text = fill(text);
  const d = ui.dlg;
  d.style.display = 'block';
  d.className = who === 'dealer' ? 'dealer' : who === 'candle' ? 'candle' : who === 'you' ? 'you' : '';
  const label = { dealer: 'THE DEALER', you: '', candle: 'THE CANDLE', edward: 'EDWARD' }[who] ?? who;
  d.querySelector('.who').textContent = label;
  const tx = d.querySelector('.txt');
  if (who === 'dealer' && !o.silent) A.hum(text.replace(/<[^>]+>/g, ''));
  if (who === 'candle' && !o.silent) A.hum(text, { voice: 'candle' });
  return new Promise(res => {
    clearInterval(typer);
    const plain = text;
    let i = 0;
    const w = { res, typing: true };
    w.finish = () => { clearInterval(typer); tx.innerHTML = plain; w.typing = false; d.classList.add('ready'); };
    d.classList.remove('ready');
    tx.innerHTML = '';
    const speed = who === 'dealer' ? 28 : 22;
    typer = setInterval(() => {
      i += 2;
      if (plain[i - 1] === '<') { const e = plain.indexOf('>', i); if (e > 0) i = e + 1; }
      tx.innerHTML = plain.slice(0, i);
      if (i >= plain.length) w.finish();
    }, speed);
    ui.dlgWait = w;
    if (o.auto) {
      const t = o.auto;
      wait(t + plain.length * 0.02).then(() => { if (ui.dlgWait === w) { w.finish(); ui.dlgWait = null; res(); } });
    }
  }).then(() => { if (!o.keep) d.style.display = 'none'; });
}
export function hideSay() { ui.dlg.style.display = 'none'; if (ui.dlgWait) { const w = ui.dlgWait; ui.dlgWait = null; w.finish?.(); w.res(); } }
// shows a line without waiting
export function line(who, text, sec = 3) { say(who, text, { auto: sec }); }

export function choose(opts, o = {}) {
  const box = $('choices');
  box.innerHTML = '';
  if (o.bottom) box.style.bottom = o.bottom + 'px'; else box.style.bottom = '';
  return new Promise(res => {
    for (const op of opts) {
      if (op.hidden) continue;
      const b = document.createElement('button');
      b.className = 'btn' + (op.danger ? ' danger' : '');
      b.innerHTML = op.label + (op.sub ? `<small>${op.sub}</small>` : '');
      b.disabled = !!op.disabled;
      b.onclick = e => { e.stopPropagation(); A.sfx('ui'); box.innerHTML = ''; res(op.value ?? op.label); };
      box.appendChild(b);
    }
    ui.cancelChoice = v => { box.innerHTML = ''; res(v); };
  });
}
export function clearChoices() { $('choices').innerHTML = ''; ui.cancelChoice = null; }

export function ask(question, o = {}) {
  const m = $('modal');
  m.style.display = 'flex';
  ui.modalOpen = true;
  m.innerHTML = `<div class="box"><div class="q">${fill(question)}</div><input maxlength="${o.max || 18}" placeholder="${o.placeholder || ''}"><button class="btn">${o.ok || 'Answer'}</button>${o.hint ? `<div class="sm">${o.hint}</div>` : ''}</div>`;
  const inp = m.querySelector('input'), btn = m.querySelector('button');
  setTimeout(() => inp.focus(), 50);
  return new Promise(res => {
    const done = () => {
      const v = inp.value.trim().replace(/[<>]/g, '');
      if (!v && !o.allowEmpty) { inp.focus(); return; }
      m.style.display = 'none'; m.innerHTML = '';
      ui.modalOpen = false;
      A.sfx('ui');
      res(v);
    };
    btn.onclick = done;
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') done(); };
  });
}

// ---------------------------------------------------------------- screens
export function screen(html, o = {}) {
  const s = $('screen');
  s.className = o.clear ? 'clear' : '';
  s.innerHTML = html;
  s.style.display = 'flex';
  ui.screenOpen = true;
  return s;
}
export function hideScreen() { const s = $('screen'); s.style.display = 'none'; s.innerHTML = ''; ui.screenOpen = false; }
export async function fade(to, sec = 1) {
  const b = $('black');
  b.style.transition = `opacity ${sec}s`;
  b.style.opacity = to;
  await wait(sec);
}
export async function actCard(n, title, sub) {
  const R = ['', 'I', 'II', 'III', 'IV', 'V'];
  screen(`<div class="actcard"><div class="n">ACT ${R[n]}</div><div class="t">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`);
  A.motif('piano', 0.5);
  await wait(3.6);
  const s = $('screen');
  s.style.transition = 'opacity 1.2s'; s.style.opacity = 0;
  await wait(1.2);
  hideScreen(); s.style.opacity = 1; s.style.transition = '';
}
export async function cardText(text, sec = 4, o = {}) {
  screen(`<div class="card actcard">${fill(text)}</div>`, o);
  await wait(sec);
  hideScreen();
}

// ---------------------------------------------------------------- documents
// pages: [{title, body(html), sig, cls}]
export function readDoc(doc) {
  const p = $('panel');
  p.style.display = 'flex';
  ui.panelOpen = true;
  A.sfx('paper');
  let i = 0;
  return new Promise(res => {
    const show = () => {
      const pg = doc.pages[i];
      p.innerHTML = `<div class="paper ${doc.cls || ''}"><h4>${pg.title || doc.title}</h4>${fill(pg.body)}${pg.sig ? `<p class="sig">${pg.sig}</p>` : ''}
        <div class="nav"><span data-a="prev" style="visibility:${i ? 'visible' : 'hidden'}">&larr; previous</span><span>${i + 1} / ${doc.pages.length}</span><span data-a="next">${i < doc.pages.length - 1 ? 'next &rarr;' : 'close'}</span></div></div>`;
      p.querySelector('[data-a=prev]').onclick = e => { e.stopPropagation(); i--; A.sfx('paper'); show(); };
      p.querySelector('[data-a=next]').onclick = e => { e.stopPropagation(); if (i < doc.pages.length - 1) { i++; A.sfx('paper'); show(); } else close(); };
    };
    const close = () => { p.style.display = 'none'; p.innerHTML = ''; ui.panelOpen = false; ui.closeDoc = null; res(); };
    ui.closeDoc = close;
    p.onclick = e => { if (e.target === p) close(); };
    show();
  });
}

// ---------------------------------------------------------------- panels
function itemCard(id) {
  const it = ITEMS[id];
  return `<div class="item"><svg viewBox="0 0 40 40">${ICONS[it.icon] || ''}</svg><b>${it.name}</b><span>${it.desc}</span></div>`;
}
function panelHtml(tab) {
  const tabs = [['items', 'Inventory <span class="sm">(I)</span>'], ['journal', 'Journal <span class="sm">(J)</span>']];
  if (ui.rules) tabs.push(['rules', 'Rules <span class="sm">(R)</span>']);
  let body = '';
  if (tab === 'items') {
    const ids = Object.keys(S.items || {}).filter(k => ITEMS[k]);
    body = ids.length ? `<div class="items">${ids.map(itemCard).join('')}</div>` : '<p class="sm">Nothing yet. Your pockets are empty.</p>';
  } else if (tab === 'journal') {
    const js = S.journal || [];
    body = js.length ? js.slice().reverse().map(j => `<div class="entry"><b>${j.title}</b><p>${fill(j.text)}</p></div>`).join('') : '<p class="sm">You have learned nothing yet.</p>';
    if (S.docs) body += `<h3>Papers</h3><div class="row" style="display:flex;gap:8px;flex-wrap:wrap">${Object.keys(S.docs).map(k => `<button class="btn" data-doc="${k}">${S.docs[k]}</button>`).join('')}</div>`;
  } else if (tab === 'rules') {
    body = ui.rules;
  }
  return `<div class="sheet"><div class="tabs">${tabs.map(([k, l]) => `<button class="btn ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}<span style="flex:1"></span><button class="btn" data-close>Close</button></div>${body}</div>`;
}
export function openPanel(tab) {
  const p = $('panel');
  p.style.display = 'flex';
  ui.panelOpen = true;
  ui.panelTab = tab;
  p.innerHTML = panelHtml(tab);
  p.onclick = e => {
    const t = e.target.closest('[data-tab]');
    if (t) { openPanel(t.dataset.tab); return; }
    if (e.target.closest('[data-close]') || e.target === p) { closePanel(); return; }
    const d = e.target.closest('[data-doc]');
    if (d) { const id = d.dataset.doc; closePanel(); ui.openDoc?.(id); }
  };
  C.paused = true;
  A.paused = true;
}
export function closePanel() {
  if (ui.closeDoc) { ui.closeDoc(); return; }
  const p = $('panel');
  p.style.display = 'none'; p.innerHTML = '';
  ui.panelOpen = false;
  if (!ui.pauseOpen) { C.paused = false; A.paused = false; }
  ui.pauseOpen = false;
}
function togglePanel(tab) {
  if (ui.panelOpen && ui.panelTab === tab) closePanel();
  else if (!ui.panelOpen) openPanel(tab);
  else openPanel(tab);
}

export function settingsHtml() {
  const s = meta.settings;
  return `<div class="set">
    <label>Master volume</label><input type="range" min="0" max="1" step="0.05" value="${s.master}" data-s="master">
    <label>Music volume</label><input type="range" min="0" max="1" step="0.05" value="${s.music}" data-s="music">
    <label>Drag sensitivity</label><input type="range" min="0.3" max="2.5" step="0.05" value="${s.sens}" data-s="sens">
    <label>Reduce effects</label><label style="text-align:left"><input type="checkbox" data-s="reduce" ${s.reduce ? 'checked' : ''}> less flashing, warping and shaking</label>
    <label>Low graphics</label><label style="text-align:left"><input type="checkbox" data-s="low" ${s.low ? 'checked' : ''}> no shadows or glow, for slow computers (reload to apply)</label>
  </div>`;
}
export function bindSettings(root) {
  root.querySelectorAll('[data-s]').forEach(el => {
    const k = el.dataset.s;
    el.oninput = el.onchange = () => {
      meta.settings[k] = el.type === 'checkbox' ? el.checked : parseFloat(el.value);
      saveMeta();
      A.applyVolume?.();
    };
  });
}

function openPause() {
  const p = $('panel');
  p.style.display = 'flex';
  ui.panelOpen = true; ui.pauseOpen = true;
  C.paused = true; A.paused = true;
  p.innerHTML = `<div class="sheet"><h2>Paused</h2><p class="sm">The candle waits. So does he.</p>${settingsHtml()}
    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap"><button class="btn" data-a="resume">Resume</button><button class="btn" data-a="items">Inventory</button><button class="btn" data-a="journal">Journal</button>${ui.rules ? '<button class="btn" data-a="rules">Rules</button>' : ''}<span style="flex:1"></span><button class="btn danger" data-a="quit">Quit to menu</button></div>
    <p class="sm" style="margin-top:14px">Your game saves itself at the start of every act.</p></div>`;
  bindSettings(p);
  p.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'resume' || e.target === p) { ui.pauseOpen = false; closePanel(); }
    if (a === 'items' || a === 'journal' || a === 'rules') { ui.pauseOpen = false; openPanel(a); }
    if (a === 'quit') { ui.pauseOpen = false; closePanel(); ui.onPauseQuit?.(); }
  };
}
