// Death mini games: creepy old arcade games that tell the library's story.
import { say, sfx } from './audio.js';
import { I } from './player.js';

const Wd = 320, Ht = 240;
const GLITCH_WORDS = ['WHY DID YOU STAY', 'EVERYTHING HERE WAS ALIVE', 'OVERDUE', 'DO NOT LEAVE', 'SHHHH', 'ONE MORE PAGE', 'HE IS READING YOU', 'COME BACK'];

export function runMinigame(kind) {
  return new Promise(resolve => {
    const wrap = document.getElementById('mg'), cv = document.getElementById('mgc'), g = cv.getContext('2d');
    cv.width = Wd; cv.height = Ht;
    wrap.classList.add('on');
    document.body.dataset.mg = kind;
    const S = { t: 0, over: false, endT: 0, lines: [], glitch: 0.4, won: false, flash: null, msg: '' };
    const story = {
      worm: ['mg_worm1', 'mg_worm2', 'mg_worm3'], bats: ['mg_bats1', 'mg_bats2', 'mg_bats3'], marks: ['mg_marks1', 'mg_marks2', 'mg_marks3'],
    }[kind];
    const TEXT = {
      mg_worm1: 'I READ A HUNDRED BOOKS IN ONE NIGHT', mg_worm2: "I COULDN'T STOP. FASTER. FASTER.", mg_worm3: 'NOW I ONLY RUN THE HALLS',
      mg_bats1: 'WE SNUCK IN WITH FLASHLIGHTS', mg_bats2: 'JUST ONE MORE CHAPTER...', mg_bats3: 'THEN THE LIGHTS WENT OUT. FOREVER.',
      mg_marks1: 'WE SAVED OUR PLACE', mg_marks2: "WE SAID WE'D COME BACK TO FINISH", mg_marks3: 'WE NEVER CAME BACK. SO WE STAYED.',
      mg_alive: 'EVERYTHING HERE WAS ALIVE',
    };
    let storyI = 0;
    const tell = id => { say(id, null, 1); S.flash = { text: TEXT[id], t: 3.5 }; S.glitch = 1; };
    const next = () => { if (storyI < 3) tell(story[storyI++]); };
    const finish = won => {
      if (S.over) return;
      S.over = true; S.won = won; S.endT = 0;
      if (won) { setTimeout(() => tell('mg_alive'), 400); sfx('static'); } else sfx('lose');
    };
    // ---- controls ----
    let dir = null, press = false;
    const onKey = e => {
      const m = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
      if (m[e.code]) { dir = m[e.code]; e.preventDefault(); }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { press = true; e.preventDefault(); }
    };
    let tsx = 0, tsy = 0;
    const onDown = e => { tsx = e.clientX; tsy = e.clientY; if (kind !== 'worm') press = true; };
    const onUp = e => {
      if (kind !== 'worm') return;
      const dx = e.clientX - tsx, dy = e.clientY - tsy;
      if (Math.hypot(dx, dy) > 20) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
      else press = true;
    };
    document.querySelectorAll('#mgpad [data-d]').forEach(b => { b.onpointerdown = e => { e.stopPropagation(); dir = b.dataset.d; }; });
    addEventListener('keydown', onKey); cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointerup', onUp);
    document.getElementById('mgskip').onclick = () => close();
    function close() {
      removeEventListener('keydown', onKey); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointerup', onUp);
      wrap.classList.remove('on'); delete document.body.dataset.mg; cancelAnimationFrame(raf); I.events.length = 0;
      resolve(S.won);
    }

    // ================= CREEPY SNAKE =================
    const WORD = 'STORYTIME';
    const sn = { body: [[8, 7], [7, 7], [6, 7]], d: [1, 0], tick: 0, rate: 0.17, got: 0, food: null };
    const placeFood = () => { let p; do { p = [1 + Math.floor(Math.random() * 14), 2 + Math.floor(Math.random() * 9)]; } while (sn.body.some(b => b[0] === p[0] && b[1] === p[1])); sn.food = p; };
    // ================= FLAPPY FLIGHT =================
    const fl = { y: 110, v: 0, pipes: [], passed: 0, spawn: 0, started: false };
    // ================= FIND THE PAGE =================
    const fp = { round: 0, target: 0, shown: 0, flipT: 0, rate: 0.32, hits: 0, wait: 0 };
    const newRound = () => { fp.target = 100 + Math.floor(Math.random() * 300); fp.shown = fp.target - 6 - Math.floor(Math.random() * 6); fp.rate = [0.36, 0.26, 0.19][fp.round]; fp.wait = 0.8; };

    if (kind === 'worm') placeFood();
    if (kind === 'marks') newRound();
    setTimeout(next, 600);

    let last = performance.now(), raf;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; S.t += dt;
      S.glitch = Math.max(0.15, S.glitch - dt * 0.8);
      if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
      g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Ht);
      if (!S.over) step(dt); else { S.endT += dt; if ((press || dir) && S.endT > (S.won ? 4.5 : 1.5)) { close(); return; } }
      draw();
      press = false; if (kind !== 'worm') dir = null;
      glitchFx();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function step(dt) {
      if (kind === 'worm') {
        if (dir) { const nd = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[dir]; if (nd[0] !== -sn.d[0] || nd[1] !== -sn.d[1]) sn.nd = nd; dir = null; }
        sn.tick += dt;
        if (sn.tick >= sn.rate) {
          sn.tick = 0; if (sn.nd) { sn.d = sn.nd; sn.nd = null; }
          const h = [sn.body[0][0] + sn.d[0], sn.body[0][1] + sn.d[1]];
          if (h[0] < 0 || h[1] < 1 || h[0] >= 16 || h[1] >= 12 || sn.body.some(b => b[0] === h[0] && b[1] === h[1])) { finish(false); return; }
          sn.body.unshift(h);
          if (h[0] === sn.food[0] && h[1] === sn.food[1]) {
            sn.got++; sfx('blip'); sn.rate = Math.max(0.07, sn.rate - 0.012); S.glitch = 0.7;
            if (sn.got === 3 || sn.got === 6) next();
            if (sn.got >= WORD.length) { finish(true); return; }
            placeFood();
          } else sn.body.pop();
        }
      } else if (kind === 'bats') {
        if (press) { fl.v = -150; fl.started = true; sfx('flap', null, 0.6); }
        if (!fl.started) return;
        fl.v += 420 * dt; fl.y += fl.v * dt;
        fl.spawn -= dt;
        if (fl.spawn <= 0 && fl.passed + fl.pipes.length < 10) { fl.spawn = 1.7; const gap = 60 + Math.random() * 110; fl.pipes.push({ x: Wd + 10, gap, lamp: Math.random() < 0.45, done: false }); }
        for (const p of fl.pipes) {
          p.x -= 80 * dt;
          if (!p.done && p.x < 60) { p.done = true; fl.passed++; sfx('blip'); if (fl.passed === 3 || fl.passed === 6) next(); if (fl.passed >= 10) { finish(true); return; } }
          const inX = 80 > p.x - 8 && 80 < p.x + 34;
          if (inX && (fl.y < p.gap - 34 || fl.y > p.gap + 34)) { finish(false); return; }
          if (p.lamp && Math.hypot(80 - (p.x + 13), fl.y - (p.gap - 6)) < 13) { finish(false); return; }
        }
        fl.pipes = fl.pipes.filter(p => p.x > -50);
        if (fl.y > Ht - 6 || fl.y < 4) { finish(false); return; }
      } else {
        if (fp.wait > 0) { fp.wait -= dt; return; }
        fp.flipT += dt;
        if (fp.flipT > fp.rate) { fp.flipT = 0; fp.shown++; sfx('flip', null, 0.4); if (fp.shown > fp.target + 4) fp.shown = fp.target - 8 - Math.floor(Math.random() * 5); }
        if (press) {
          if (fp.shown === fp.target) {
            sfx('blip'); fp.round++; S.glitch = 1;
            if (fp.round === 1 || fp.round === 2) next();
            if (fp.round >= 3) { finish(true); return; }
            newRound();
          } else { finish(false); }
        }
      }
    }

    function draw() {
      g.font = '10px monospace'; g.textAlign = 'left';
      if (kind === 'worm') {
        g.fillStyle = '#0b1a0b'; g.fillRect(0, 20, Wd, Ht - 20);
        g.strokeStyle = '#3a6a3a'; g.strokeRect(0.5, 20.5, Wd - 1, Ht - 21);
        g.fillStyle = '#8f8'; g.fillText('CREEPY SNAKE', 6, 13);
        g.fillStyle = '#fff'; g.fillText('WORD: ' + WORD.slice(0, sn.got).split('').join(' ') + ' _'.repeat(WORD.length - sn.got), 110, 13);
        sn.body.forEach(([x, y], i) => {
          g.fillStyle = i === 0 ? '#e8c8b0' : `rgb(${190 - i * 4},${150 - i * 4},${130 - i * 4})`;
          g.fillRect(x * 20 + 2, y * 20 + 2, 16, 16);
          if (i === 0) { g.fillStyle = '#000'; g.fillRect(x * 20 + 5, y * 20 + 6, 4, 4); g.fillRect(x * 20 + 11, y * 20 + 6, 4, 4); g.strokeStyle = '#000'; g.strokeRect(x * 20 + 4, y * 20 + 5, 6, 6); g.strokeRect(x * 20 + 10, y * 20 + 5, 6, 6); }
        });
        if (sn.food) { g.fillStyle = Math.sin(S.t * 8) > 0 ? '#ff4040' : '#ffd0d0'; g.font = 'bold 16px monospace'; g.fillText(WORD[sn.got], sn.food[0] * 20 + 5, sn.food[1] * 20 + 16); }
      } else if (kind === 'bats') {
        g.fillStyle = '#05050f'; g.fillRect(0, 0, Wd, Ht);
        for (const p of fl.pipes) {
          g.fillStyle = '#3a2210'; g.fillRect(p.x, 0, 26, p.gap - 34); g.fillRect(p.x, p.gap + 34, 26, Ht);
          for (let y = 4; y < Ht; y += 12) { if (y > p.gap - 36 && y < p.gap + 36) continue; g.fillStyle = ['#7a2a2a', '#2a5a3a', '#2a3a7a', '#8a7a3a'][(y / 12 + Math.floor(p.x)) & 3]; g.fillRect(p.x + 3, y, 20, 8); }
          if (p.lamp) { g.strokeStyle = '#555'; g.beginPath(); g.moveTo(p.x + 13, p.gap - 34); g.lineTo(p.x + 13, p.gap - 14); g.stroke(); g.fillStyle = '#ffe080'; g.beginPath(); g.arc(p.x + 13, p.gap - 6, 7, 0, 7); g.fill(); g.fillStyle = 'rgba(255,220,120,.15)'; g.beginPath(); g.arc(p.x + 13, p.gap - 6, 20, 0, 7); g.fill(); }
        }
        const fl2 = Math.sin(S.t * 25) * 6;
        g.fillStyle = '#e8dfc6'; g.beginPath(); g.moveTo(80, fl.y); g.lineTo(66, fl.y - 6 + fl2); g.lineTo(72, fl.y + 2); g.lineTo(88, fl.y + 2); g.lineTo(94, fl.y - 6 + fl2); g.closePath(); g.fill();
        g.fillStyle = '#f33'; g.fillRect(77, fl.y - 2, 2, 2); g.fillRect(81, fl.y - 2, 2, 2);
        g.fillStyle = '#aaf'; g.fillText('FLAPPY FLIGHT   SHELVES: ' + fl.passed + '/10', 6, 13);
        if (!fl.started) { g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('TAP / SPACE TO FLAP', Wd / 2, Ht / 2 + 40); }
      } else {
        g.fillStyle = '#100808'; g.fillRect(0, 0, Wd, Ht);
        g.fillStyle = '#5a1410'; g.fillRect(40, 40, 240, 170);
        g.fillStyle = '#e8dfc6'; g.fillRect(50, 46, 108, 158); g.fillRect(162, 46, 108, 158);
        const flipX = 162 + 108 * (1 - Math.min(1, fp.flipT / fp.rate));
        g.fillStyle = '#c8bfa6'; g.fillRect(162, 46, Math.max(0, flipX - 162), 158);
        g.fillStyle = '#3a2a1a'; for (let y = 60; y < 190; y += 9) { g.fillRect(58, y, 90 - (y % 27), 3); g.fillRect(170, y, 88 - (y % 18), 3); }
        g.fillStyle = '#000'; g.font = 'bold 22px monospace'; g.textAlign = 'center';
        g.fillText(fp.shown, 216, 200);
        g.fillStyle = '#c33'; g.fillRect(150, 30, 10, 60); // you, a bookmark
        g.font = '11px monospace'; g.fillStyle = '#fff';
        g.fillText('FIND PAGE ' + fp.target + '   (ROUND ' + Math.min(3, fp.round + 1) + '/3)', Wd / 2, 18);
        g.fillText('PRESS / TAP WHEN THE PAGE MATCHES', Wd / 2, 232);
      }
      if (S.flash) {
        g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 96, Wd, 40);
        g.fillStyle = S.flash.text.includes('ALIVE') ? '#ff3030' : '#fff'; g.font = 'bold 12px monospace'; g.textAlign = 'center';
        g.fillText(S.flash.text, Wd / 2 + (Math.random() - 0.5) * 3 * S.glitch, 120);
      }
      if (S.over) {
        g.textAlign = 'center'; g.font = 'bold 20px monospace';
        g.fillStyle = S.won ? '#ff3030' : '#fff';
        if (!S.flash) g.fillText(S.won ? (kind === 'worm' ? 'S T O R Y T I M E' : 'THE END?') : 'GAME OVER', Wd / 2, 120);
        if (S.endT > (S.won ? 4.5 : 1.5)) { g.font = '10px monospace'; g.fillStyle = '#aaa'; g.fillText('PRESS ANY KEY / TAP', Wd / 2, 150); }
      }
    }

    function glitchFx() {
      const k = S.glitch;
      // torn horizontal slices
      const n = Math.floor(k * 8);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * Ht, h = 2 + Math.random() * 10, dx = (Math.random() - 0.5) * 30 * k;
        g.drawImage(cv, 0, y, Wd, h, dx, y, Wd, h);
      }
      if (Math.random() < 0.02 + k * 0.05) {
        g.fillStyle = `rgba(255,${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},.8)`; g.font = 'bold 13px monospace'; g.textAlign = 'center';
        g.fillText(GLITCH_WORDS[Math.floor(Math.random() * GLITCH_WORDS.length)], Math.random() * Wd, Math.random() * Ht);
      }
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < Ht; y += 2) g.fillRect(0, y, Wd, 1);
    }
  });
}
