// The shop: coins you earn in the game buy upgrades and gold skins. Saved with your player (save.js).

export const SHOP_ITEMS = {
  aliens: [
    { key: 'shield', name: 'Extra shield', desc: '+1 shield for your UFO', prices: [30, 60, 90] },
    { key: 'tank', name: 'Big fuel tank', desc: 'Fuel lasts longer', prices: [40, 80] },
    { key: 'beam', name: 'Mega beam', desc: 'Wider beam that lifts faster', prices: [40, 80] },
    { key: 'laser', name: 'Double laser', desc: 'Zap two lasers at once', prices: [100] },
    { key: 'gold', name: 'Gold UFO', desc: 'A shiny gold flying saucer', prices: [150] },
  ],
  dinos: [
    { key: 'life', name: 'Extra life', desc: '+1 life for your T. rex', prices: [30, 60, 90] },
    { key: 'roar', name: 'Mega roar', desc: 'Your roar reaches further', prices: [40, 80] },
    { key: 'pouch', name: 'Roar pouch', desc: '+1 roar for every word', prices: [40, 80] },
    { key: 'jump', name: 'Super legs', desc: 'Run faster, jump higher', prices: [60] },
    { key: 'gold', name: 'Gold T. rex', desc: 'A shiny gold T. rex', prices: [150] },
  ],
}

export const itemLevel = (shop, side, key) => shop.owned[`${side}.${key}`] || 0

// Buys the next level of an item. Returns true if it worked.
export function buy(shop, side, item) {
  const lvl = itemLevel(shop, side, item.key)
  const price = item.prices[lvl]
  if (price === undefined || shop.coins < price) return false
  shop.coins -= price
  shop.owned[`${side}.${item.key}`] = lvl + 1
  return true
}
