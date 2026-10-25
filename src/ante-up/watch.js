// The Dealer's attention, the Suspicion meter, cheating, getting caught,
// and Sanity damage. Games call watch.start() during play.
import { C, THREE, wait, tween, ease, rand, pick, shake } from './core.js';
import { S, D, meta } from './state.js';
import { dealer } from './dealer.js';
import { A } from './audio.js';
import { toast, say } from './ui.js';

export const watch = {
  active: false, state: 'watch', t: 0, warned: false, frozen: false, onCaught: null, catching: false,
  lines: { away: [], back: [] },

  start(o = {}) {
    this.active = true;
    this.state = 'watch';
    this.t = rand(...D().look) * (o.firstLonger ? 1.4 : 1);
    this.frozen = false;
    this.onCaught = o.onCaught || null;
    dealer.attention = 'watch';
    dealer.lookAtPlayer();
  },
  stop() {
    this.active = false;
    this.goWatch(true);
  },
  // force him to watch (during his turn, dialogue, etc.) or release
  freeze(v) {
    this.frozen = v;
    if (v && this.state === 'away') this.goWatch();
  },
  goAway() {
    if (this.state === 'away') return;
    this.state = 'away';
    this.t = rand(...D().away);
    this.warned = false;
    dealer.attention = 'away';
    const where = pick(['up', 'side', 'cards', 'dark', 'candle']);
    dealer.lookAway(where);
    dealer.leanBack(where === 'up' || where === 'cards');
    A.sfx('exhale');
  },
  goWatch(silent) {
    if (this.state === 'watch' && !silent) return;
    const was = this.state;
    this.state = 'watch';
    this.t = rand(...D().look);
    dealer.attention = 'watch';
    dealer.lookAtPlayer();
    dealer.leanBack(false);
    if (was === 'away' && !silent) A.sfx('lookBack');
  },
  away() { return this.active && this.state === 'away'; },

  update(dt) {
    if (S.suspicion === undefined) return;
    if (!this.active || this.catching) return;
    // drifting back down
    if (!C.holding) S.suspicion = Math.max(0, S.suspicion - dt * 1.6);
    if (this.frozen) return;
    this.t -= dt;
    if (this.state === 'watch') {
      // fast, jerky looking around while he watches is suspicious
      if (C.angSpeed > 2.6 && C.view.mode === 'seat') this.add((C.angSpeed - 2.6) * dt * 6);
      if (this.t <= 0) this.goAway();
    } else {
      if (!this.warned && this.t < 0.7 && S.diff !== 'nightmare') { this.warned = true; A.sfx('warn'); }
      if (this.t <= 0) this.goWatch();
    }
  },

  add(n) {
    if (this.catching) return;
    const before = S.suspicion;
    S.suspicion = Math.min(100, S.suspicion + n * D().susMul);
    if (Math.floor(S.suspicion / 10) > Math.floor(before / 10)) A.sfx('susTick');
    if (S.suspicion >= 100) this.caught();
  },

  // A hold-to-cheat action. "time" is how long you must hold.
  cheat(time, onDone, o = {}) {
    return {
      time, cheat: true,
      onStart: () => { A.sfx('cardSlide'); },
      onTick: (t, dt) => {
        if (this.state === 'watch' || !this.active) {
          this.add((o.watched ?? 55) * dt);
          if (S.suspicion > 35 && dealer.snapT <= 0 && Math.random() < dt * 3) dealer.snap();
        } else this.add((o.quiet ?? 2.5) * dt);
      },
      onDone: () => {
        S.cheats = (S.cheats || 0) + 1;
        S.cheatedThisAct = true;
        if (this.catching) return;
        onDone();
      },
      onCancel: () => {},
    };
  },

  async caught() {
    if (this.catching) return;
    this.catching = true;
    S.catches = (S.catches || 0) + 1;
    C.holding = null;
    await jumpscare();
    hurt(14, 'caught');
    try { await this.onCaught?.(); } catch (e) { console.warn(e); }
    S.suspicion = 30;
    this.catching = false;
    this.goWatch(true);
  },
};

// The Dealer lunges at the camera.
export async function jumpscare() {
  const g = dealer.group;
  const p0 = g.position.clone();
  const cam = C.camera.position;
  const inp = C.input;
  C.input = false;
  dealer.snap();
  dealer.tell('flare', 1.5);
  A.duck(1.8);
  A.sfx('stinger');
  A.motif('metal', 0.9);
  C.fx.red = 1;
  shake(0.12, 0.8);
  const target = new THREE.Vector3(cam.x * 0.6, 0, cam.z - 1.95 * dealer.scale);
  await tween(0.22, k => { g.position.lerpVectors(p0, target, k); }, ease.out);
  C.fx.flash = 0.35;
  await wait(0.6);
  await tween(0.7, k => { g.position.lerpVectors(target, p0, k); }, ease.io);
  g.position.copy(p0);
  C.input = inp;
}

// ---------------------------------------------------------------- sanity
export const san = { lastHit: 0, events: [] };
export function hurt(n, why = '') {
  const amt = n * D().lossMul;
  S.sanity = Math.max(0, S.sanity - amt);
  san.lastHit = C.t;
  C.fx.red = Math.max(C.fx.red, Math.min(0.8, amt / 20));
  if (amt >= 6) { A.sfx('heartbeat', 0.8); setTimeout(() => A.sfx('heartbeat', 0.6), 900); }
  if (amt >= 10) shake(0.03, 0.5);
  if (why !== 'quiet') toast(`Sanity &minus;${Math.round(amt)}`, 'bad', 2.2);
  return S.sanity <= 0;
}
export function heal(n, quiet) {
  const before = S.sanity;
  S.sanity = Math.min(100, S.sanity + n);
  if (!quiet && S.sanity > before) toast(`Sanity +${Math.round(S.sanity - before)}`, 'good', 2.2);
}

// Lines he says when he looks back at you mid-cheat, etc.
export const TAUNT = {
  caught: ['Did you think I blinked?', 'Fingers. I see them.', 'You are not the first to try that, {name}.', 'Cheat at MY table?', 'Again, and I keep the hand.'],
  watchAgain: ['Hmm.', 'Where were we.', 'Your move.'],
};
export async function caughtLine() {
  await say('dealer', pick(TAUNT.caught), { auto: 1.6 });
}
export { meta };
