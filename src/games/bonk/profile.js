import { checkAchievements, TOTAL_SECRETS } from './achievements'
import { COSTUMES } from './costumes'
import { loadSave, persist } from './save'
import { sfx } from './sound'

// Glue between the game and the saved profile: counts stats, turns match
// results into Bonk Bucks, and pops achievement toasts.
const COUNTED_SECRETS = ['wall', 'under', 'above', 'room', 'door', 'button', 'platform', 'npc', 'route', 'ending', 'path', 'button2', 'message', 'room2', 'hidden', 'npc2', 'switch', 'door2', 'place', 'cloud', 'tree', 'dev']
if (COUNTED_SECRETS.length !== TOTAL_SECRETS) console.warn('secret count mismatch')

const session = { kos: 0, matches: 0, lastResult: null, focused: true }
let dirty = false
const toastListeners = new Set()

export function onToast(fn) {
  toastListeners.add(fn)
  return () => toastListeners.delete(fn)
}
export function toast(text, kind = 'info') {
  for (const fn of toastListeners) fn({ text, kind, id: Math.random() })
}

export function stat(key, n = 1) {
  const s = loadSave()
  if (key === 'sessionKos') {
    session.kos += n
    return max('best_sessionKos', session.kos)
  }
  s.stats[key] = (s.stats[key] || 0) + n
  if (key === 'kos') {
    s.stats.cur_koNoHit = (s.stats.cur_koNoHit || 0) + n
    s.stats.cur_koNoOut = (s.stats.cur_koNoOut || 0) + n
    max('best_koNoHit', s.stats.cur_koNoHit)
    max('best_koNoOut', s.stats.cur_koNoOut)
  }
  if (key === 'hitsTaken') s.stats.cur_koNoHit = 0
  if (key === 'outs') s.stats.cur_koNoOut = 0
  dirty = true
}

export function max(key, v) {
  const s = loadSave()
  if ((s.stats[key] || 0) < v) {
    s.stats[key] = v
    dirty = true
  }
}

export function addToList(list, item, countStat) {
  const s = loadSave()
  s.lists[list] = s.lists[list] || []
  if (!s.lists[list].includes(item)) {
    s.lists[list].push(item)
    if (countStat) s.stats[countStat] = s.lists[list].length
    dirty = true
    return true
  }
  return false
}

export function findSecret(name) {
  const s = loadSave()
  stat(`secret_${name}`)
  if (COUNTED_SECRETS.includes(name) && !s.secrets.includes(name)) {
    s.secrets.push(name)
    dirty = true
    toast(`🔍 SECRET FOUND! (${s.secrets.length}/${TOTAL_SECRETS})`, 'secret')
    sfx.achievement()
  }
  if (s.secrets.length >= TOTAL_SECRETS - 1 && s.stats.secret_devpc) stat('secret_final')
}

export const hooks = {
  stat,
  max,
  event: (key) => addToList('events', key, 'eventTypes'),
  koStreak: () => {},
  emote: (key) => {
    const s = loadSave()
    if (!s.emotes.includes(key)) s.emotes.push(key)
  },
}

// Flush stats to storage and check achievements (called a few times a second).
export function flush(force) {
  if (!dirty && !force) return
  dirty = false
  const s = loadSave()
  const fresh = checkAchievements(s)
  persist()
  fresh.slice(0, 5).forEach((a, i) => setTimeout(() => {
    toast(`🏆 ${a.name}  +${a.reward} BB`, 'ach')
    sfx.achievement()
  }, i * 700))
  if (fresh.length > 5) setTimeout(() => toast(`🏆 …and ${fresh.length - 5} more achievements!`, 'ach'), 3600)
}

export function startSession() {
  const s = loadSave()
  const today = new Date().toDateString()
  if (s.lastDay !== today) {
    s.lastDay = today
    stat('days')
  }
  if (s.lastSeen && Date.now() - s.lastSeen > 3600 * 1000) stat('longReturn')
  s.lastSeen = Date.now()
  dirty = true
}

export function tickPlaytime(dt) {
  const s = loadSave()
  s.stats.playtime = (s.stats.playtime || 0) + dt
  s.lastSeen = Date.now()
}

export function lookAway(inMatch) {
  stat('lookAway')
  if (inMatch) {
    stat('matchLookAway')
    session.focused = false
  }
}

export function matchStarted(config) {
  stat('matchesStarted')
  if (session.lastResult === 'loss') stat('again')
  if (session.lastResult === 'win') stat('afterWin')
  if (config.challenge !== 'none') stat('chStarted')
  session.focused = true
  for (const h of config.humans) {
    addToList('worn', h.costume, 'costumesWorn')
    stat(`matchesAs_${h.costume}`)
  }
}

// Apply a finished match. Returns the Bonk Bucks breakdown for the results screen.
export function matchFinished(r, muted) {
  const s = loadSave()
  const won = r.humanWon
  stat('matches')
  stat('finished')
  session.matches += 1
  max('best_sessionMatches', session.matches)
  s.stats.cur_playStreak = (s.stats.cur_playStreak || 0) + 1
  max('best_playStreak', s.stats.cur_playStreak)
  if (won) {
    stat('wins')
    s.stats.cur_winStreak = (s.stats.cur_winStreak || 0) + 1
    max('bestWinStreak', s.stats.cur_winStreak)
  } else {
    stat('losses')
    s.stats.cur_winStreak = 0
  }
  session.lastResult = won ? 'win' : 'loss'
  if (r.events >= 3) stat('chaosMatches')
  max('best_eventsInMatch', r.events)
  max('best_eventsSurvived', r.eventsSurvived)
  if (r.night) stat('nightMatches')
  stat(muted ? 'mutedMatches' : 'soundMatches')
  if (session.focused) stat('focusMatches')
  if (r.mysteryBot) stat('mysteryBot')
  // arenas
  const a = r.arena
  if (addToList('arenas', a.name)) s.maps = s.lists.arenas.slice()
  s.maps = s.lists.arenas.slice()
  if (a.preset) addToList('presets', a.key, 'presetsVisited')
  stat(`map_${a.key}`)
  if (a.blob) stat('blobs')
  if (a.key === 'void') stat('voidPlays')

  let bb = 0
  const lines = []
  for (const h of r.humans) {
    const ms = h.ms
    max('best_kos', ms.kos)
    max('best_jumps', ms.jumps)
    max('best_dodges', ms.dodges)
    max('best_falls', ms.falls)
    max('best_uniqueKos', ms.unique)
    max('best_survive', ms.survive)
    max('best_lastBalloon', ms.lastBalloonT)
    max('best_airTotal', ms.air)
    max('best_noHitTime', ms.noHitBest || 0)
    max('best_score', ms.score)
    stat('points', ms.score)
    const streak = (k, ok) => {
      s.stats[`cur_${k}`] = ok ? (s.stats[`cur_${k}`] || 0) + 1 : 0
      max(`best_${k}`, s.stats[`cur_${k}`])
    }
    if (ms.hitsTaken === 0) stat('noHitMatches')
    if (ms.falls === 0) stat('noFallMatches')
    streak('noHitStreak', ms.hitsTaken === 0)
    streak('noFallStreak', ms.falls === 0)
    streak('flawlessStreak', h.won && ms.lost === 0)
    if (h.won) {
      const W = (k) => stat(k)
      if (ms.jumps === 0) W('winsNoJump')
      if (ms.jumps >= 50) W('winsJumpy')
      if (ms.lost === 0) W('winsFlawless')
      if (ms.hitsTaken === 0) W('winsNoHit')
      if (h.balloons === 1) W('winsLastBalloon')
      if (ms.kos === 0 && h.balloons === 1) W('winsNothing')
      if (ms.wasLast) W('comebacks')
      if (r.duration < 60) W('winsFast')
      if (r.duration < 30) W('winsVeryFast')
      if (r.duration > 180) W('winsSlow')
      if (h.airborne) W('winsAir')
      if (ms.kos >= 1) W('winsKo1')
      if (ms.kos === 0) W('winsZeroKo')
      if (ms.kos === 1) W('winsOneKo')
      if (ms.kos >= 5) W('winsKo5')
      if (ms.kos >= 9) W('winsKo9')
      if (ms.dodges >= 5) W('winsDodgy')
      if (ms.falls >= 2) W('winsClumsy')
      if (ms.swings === 0) W('winsNoSwing')
      if (ms.lost === 0 && ms.kos >= 5) W('perfectMatches')
      W(`winsAs_${h.costume}`)
      if (r.ducks <= 4) W('winsSmall')
      if (r.ducks >= 8) W('winsBig8')
      if (r.ducks >= 10) W('winsBig')
      if (r.rare) W('winsRare')
      if (r.duck) W('winsDuck')
      if (r.lastEvent === 'storm') W('winsStorm')
      if (r.lastEvent === 'apocalypse') W('winsApocalypse')
      W(`winMap_${a.key}`)
      addToList('winArenas', a.name, 'winMaps')
      if (r.challenge === 'none') W(`win_${r.difficulty}`)
    }
    // Bonk Bucks: coins for surviving, popping and winning.
    const alive = Math.floor(ms.survive / 3)
    const pops = ms.pops * 10
    const kos = ms.kos * 25
    const win = h.won ? 100 : 0
    const events = r.eventsSurvived * 5
    bb += alive + pops + kos + win + events
    lines.push({ name: h.name, alive, pops, kos, win, events })
  }

  // challenges
  if (r.challenge !== 'none') {
    const h = r.humans.find((x) => x.won)
    stat('chPlaytime', r.duration)
    for (const x of r.humans) max('best_chSurvive', x.ms.survive)
    let ok = !!h
    if (h && r.realChallenge === 'nodamage') ok = h.ms.lost === 0
    if (h && r.realChallenge === 'ko') ok = h.ms.kos >= 3
    if (ok) {
      stat(`ch_${r.challenge}`)
      stat('chWon')
      addToList('challenges', r.challenge, 'chTypes')
      if (h.ms.falls === 0) stat('chNoFall')
      if (h.ms.lost === 0) stat('chFlawless')
      if (h.balloons === 1) stat('chLastBalloon')
      s.stats.cur_chStreak = (s.stats.cur_chStreak || 0) + 1
      max('best_chStreak', s.stats.cur_chStreak)
      bb += 150
    } else s.stats.cur_chStreak = 0
  }

  s.bb += bb
  s.stats.bbEarned = (s.stats.bbEarned || 0) + bb
  dirty = true
  flush(true)
  return { bb, lines }
}

export function obbyFinished(level, reward, time, falls) {
  const s = loadSave()
  stat(`obby_${level}`)
  stat('obbys')
  if (level === 'hard' && falls === 0) {
    stat('obbyHardNoFall')
    stat('obbyHardNoCp')
  }
  s.bb += reward
  toast(`🏁 ${level.toUpperCase()} OBBY COMPLETE in ${time.toFixed(1)}s! +${reward} BB`, 'ach')
  sfx.win()
  flush(true)
}

export function ownedCount() {
  return loadSave().owned.filter((k) => COSTUMES[k]).length
}

// Shop actions live here so the UI never mutates the save directly.
export function shopBuy(item, isPet) {
  const s = loadSave()
  const price = item.price || 0
  if (s.bb < price) return false
  s.bb -= price
  s.stats.bbSpent = (s.stats.bbSpent || 0) + price
  if (isPet) {
    s.pets.push(item.key)
    stat('petsOwned')
  } else s.owned.push(item.key)
  sfx.coin()
  shopEquip(item, isPet)
  return true
}

export function shopEquip(item, isPet) {
  const s = loadSave()
  if (isPet) s.pet = s.pet === item.key ? null : item.key
  else {
    if (s.costume !== item.key) stat('costumeChanges')
    s.costume = item.key
  }
  flush(true)
}
