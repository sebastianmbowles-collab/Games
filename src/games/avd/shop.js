// The shop and the four currencies, saved with your player (save.js).
//   ◆ Xenobits      the main currency: earned for almost everything
//   ⚡ Plasma Cells  alien upgrades: earned by solving math and zapping enemy UFOs
//   🦴 Fossil Shards dinosaur upgrades: earned by spelling dino words and grabbing gems
//   🧬 DNA          rare: earned by beating the volcano boss and finding hidden DNA strands;
//                   spent (with Xenobits) to evolve your UFO and your T. rex

export const CURRENCIES = {
  xeno: { icon: '◆', name: 'XENOBITS', color: '#63c74d' },
  cells: { icon: '⚡', name: 'PLASMA CELLS', color: '#2ce8f5' },
  shards: { icon: '🦴', name: 'FOSSIL SHARDS', color: '#ead4aa' },
  dna: { icon: '🧬', name: 'DNA', color: '#f6757a' },
}
export const CURRENCY_ORDER = ['xeno', 'cells', 'shards', 'dna']

export const SHOP_TABS = ['aliens', 'dinos', 'evolve']

export const SHOP_ITEMS = {
  aliens: [
    { side: 'aliens', key: 'shield', name: 'Extra shield', desc: '+1 shield for your UFO', costs: [{ cells: 6 }, { cells: 12 }, { cells: 18 }] },
    { side: 'aliens', key: 'tank', name: 'Big fuel tank', desc: 'Fuel lasts longer', costs: [{ cells: 8 }, { cells: 16 }] },
    { side: 'aliens', key: 'beam', name: 'Mega beam', desc: 'Wider beam that lifts faster', costs: [{ cells: 8 }, { cells: 16 }] },
    { side: 'aliens', key: 'laser', name: 'Double laser', desc: 'Zap two lasers at once', costs: [{ cells: 20 }] },
  ],
  dinos: [
    { side: 'dinos', key: 'life', name: 'Extra life', desc: '+1 life for your T. rex', costs: [{ shards: 6 }, { shards: 12 }, { shards: 18 }] },
    { side: 'dinos', key: 'roar', name: 'Mega roar', desc: 'Your roar reaches further', costs: [{ shards: 8 }, { shards: 16 }] },
    { side: 'dinos', key: 'pouch', name: 'Roar pouch', desc: '+1 roar for every word', costs: [{ shards: 8 }, { shards: 16 }] },
    { side: 'dinos', key: 'jump', name: 'Super legs', desc: 'Run faster, jump higher', costs: [{ shards: 12 }] },
  ],
  evolve: [
    { side: 'aliens', key: 'evo', name: 'Evolve UFO', desc: 'Star Saucer, then Galaxy Cruiser', costs: [{ dna: 2, xeno: 100 }, { dna: 4, xeno: 250 }], stages: ['STAR SAUCER', 'GALAXY CRUISER'] },
    { side: 'dinos', key: 'evo', name: 'Evolve T. rex', desc: 'Mega Rex, then Ultra Rex', costs: [{ dna: 2, xeno: 100 }, { dna: 4, xeno: 250 }], stages: ['MEGA REX', 'ULTRA REX'] },
    { side: 'aliens', key: 'gold', name: 'Gold UFO', desc: 'A shiny gold flying saucer', costs: [{ xeno: 150 }] },
    { side: 'dinos', key: 'gold', name: 'Gold T. rex', desc: 'A shiny gold T. rex', costs: [{ xeno: 150 }] },
  ],
}

// Old saves had just "coins": those become Xenobits.
export function normalizeShop(s) {
  return { xeno: s?.xeno ?? s?.coins ?? 0, cells: s?.cells || 0, shards: s?.shards || 0, dna: s?.dna || 0, owned: s?.owned || {}, secrets: s?.secrets || [] }
}

export const itemLevel = (shop, side, key) => shop.owned[`${side}.${key}`] || 0

// e.g. "🧬2 ◆100"
export const costText = (cost) =>
  Object.entries(cost)
    .map(([k, n]) => `${CURRENCIES[k].icon}${n}`)
    .join(' ')

// What you're short of for this cost, or null if you can afford it.
export function shortOf(shop, cost) {
  for (const [k, n] of Object.entries(cost)) if ((shop[k] || 0) < n) return { kind: k, need: n - (shop[k] || 0) }
  return null
}

// Buys the next level of an item. Returns true if it worked.
export function buy(shop, item) {
  const lvl = itemLevel(shop, item.side, item.key)
  const cost = item.costs[lvl]
  if (!cost || shortOf(shop, cost)) return false
  for (const [k, n] of Object.entries(cost)) shop[k] -= n
  shop.owned[`${item.side}.${item.key}`] = lvl + 1
  return true
}

// "UFO", "STAR SAUCER", "GALAXY CRUISER" / "T. REX", "MEGA REX", "ULTRA REX"
export function evoName(side, lvl) {
  if (!lvl) return side === 'aliens' ? 'UFO' : 'T. REX'
  return SHOP_ITEMS.evolve.find((i) => i.side === side && i.key === 'evo').stages[lvl - 1]
}
