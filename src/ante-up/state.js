// Everything about the current run (sanity, items, memories, journal) and the
// things that survive between runs (endings found, settings).

const SAVE_KEY = 'anteup.save.v1';
const META_KEY = 'anteup.meta.v1';

export const DIFF = {
  easy: {
    label: 'Easy', susMul: 0.6, tell: 3.2, lossMul: 0.7, timers: [330, 290, 250, 210],
    moveLimit: 20, chessDepth: 2, chessTime: 400, noise: 0.35, rig: 0.25, look: [3.5, 6.5], away: [3.5, 5.5],
  },
  normal: {
    label: 'Normal', susMul: 1, tell: 2.2, lossMul: 1, timers: [300, 260, 220, 180],
    moveLimit: 15, chessDepth: 4, chessTime: 1100, noise: 0.15, rig: 0.45, look: [4, 8], away: [2.6, 4.2],
  },
  nightmare: {
    label: 'Nightmare', susMul: 1.45, tell: 1.3, lossMul: 1.3, timers: [260, 220, 190, 150],
    moveLimit: 12, chessDepth: 5, chessTime: 2200, noise: 0.04, rig: 0.65, look: [5, 10], away: [1.8, 3.2],
  },
};

export const ITEMS = {
  screwdriver: { name: 'Rusty Screwdriver', desc: 'Pulled from the drain. The handle is wrapped in old twine.', icon: 'screw' },
  diary: { name: "Edward's Diary", desc: 'Pages kept under the loose floorboard. Signed E.H., 1931.', icon: 'book' },
  matches: { name: 'Tin of Matches', desc: "Marguerite's matches. Eleven left, all dry.", icon: 'match' },
  key: { name: 'Iron Key', desc: 'Heavy and cold. It was hanging inside the fuse box.', icon: 'key' },
  weight: { name: 'Lead Weight', desc: 'A plumb weight. Heavy enough to hold anything still.', icon: 'weight' },
  shard: { name: 'Mirror Shard', desc: 'A triangle of old silvered glass. It shows things a little wrong.', icon: 'shard' },
  oil: { name: 'Lamp Oil', desc: 'A dented can, still half full. It smells sharp.', icon: 'oil' },
  map: { name: 'Gas Line Plan', desc: 'Crane House, 1887. The valve is behind the third stone of the east wall.', icon: 'map' },
  dice: { name: 'Honest Dice', desc: 'Two plain bone dice. Tomás swore they were fair.', icon: 'dice' },
  lastpage: { name: "Edward's Last Page", desc: 'Thawed out of the ice. Written in a shaking hand.', icon: 'page' },
};

export const MEMS = ['name', 'pet', 'friend', 'home'];

export const S = {};
export const meta = load(META_KEY) || { endings: {}, settings: { master: 0.85, music: 0.7, sens: 1, reduce: false, low: false }, played: false };
meta.settings = Object.assign({ master: 0.85, music: 0.7, sens: 1, reduce: false, low: false }, meta.settings);

function load(k) {
  try { return JSON.parse(localStorage.getItem(k)); } catch { return null; }
}
function store(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ }
}

export function newRun(name, diff) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, {
    name: name || 'Stranger', diff, act: 1, sanity: 100, suspicion: 0, items: {}, journal: [], read: {},
    memories: { name: { a: name || 'Stranger', lost: false } }, flags: {}, catches: 0, cheats: 0, blackouts: 0,
    lastChance: false, startedAt: Date.now(),
  });
}

// Snapshot taken at the start of every act, so "Continue" puts you back there.
export function autosave() {
  S.suspicion = 0;
  store(SAVE_KEY, S);
}
export function loadRun() {
  const s = load(SAVE_KEY);
  if (!s) return false;
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, s);
  return true;
}
export const hasSave = () => !!load(SAVE_KEY);
export const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } };
export const saveMeta = () => store(META_KEY, meta);

export const D = () => DIFF[S.diff] || DIFF.normal;
export const has = id => !!S.items[id];
export const flag = id => !!S.flags[id];
export const setFlag = (id, v = true) => { S.flags[id] = v; };

// A memory's text, or a black bar once it has been sacrificed.
export function mem(k, field = 'a') {
  const m = S.memories?.[k];
  if (!m || !m[field]) return k === 'name' ? 'Stranger' : '';
  return m.lost ? '█'.repeat(Math.max(4, Math.min(9, m[field].length))) : m[field];
}
export const lost = k => !!S.memories?.[k]?.lost;
export const nm = () => (lost('name') ? 'Nobody' : S.name);

export function journal(id, title, text) {
  if (S.journal.some(j => j.id === id)) return false;
  S.journal.push({ id, title, text, act: S.act });
  return true;
}

// Fills {name}, {pet}, {petkind}, {friend}, {home} in story text.
export function fill(t) {
  return t
    .replace(/\{name\}/g, () => nm())
    .replace(/\{pet\}/g, () => mem('pet'))
    .replace(/\{petkind\}/g, () => mem('pet', 'kind'))
    .replace(/\{friend\}/g, () => mem('friend'))
    .replace(/\{home\}/g, () => mem('home'));
}

export function endingFound(id) {
  meta.endings[id] = (meta.endings[id] || 0) + 1;
  saveMeta();
}
