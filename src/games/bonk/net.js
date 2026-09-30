import Peer from 'peerjs'

// Online play with PeerJS: browsers find each other through PeerJS's free
// public server, then talk directly (WebRTC). The host runs the real game;
// guests send their controls and draw what the host sends back.
const PREFIX = 'bonkduck-v1-'
const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ'

function peerOptions() {
  // `?peerhost=localhost:9000` points at a local PeerJS server (for testing).
  const p = new URLSearchParams(location.search).get('peerhost')
  if (!p) return { debug: 0 }
  const [host, port] = p.split(':')
  return { host, port: Number(port) || 9000, path: '/', secure: false, debug: 0 }
}

// ---------------------------------------------------------------- chat safety

// A small word filter, Roblox style: rude words turn into ####.
const RUDE = ['fuck', 'fuk', 'shit', 'bitch', 'bastard', 'dick', 'cunt', 'piss', 'crap', 'damn', 'asshole', 'arse', 'wanker', 'slut', 'whore', 'nigg', 'fag', 'retard', 'stupid', 'idiot', 'dumb', 'kill yourself', 'kys', 'hate you', 'shut up']
// Anything that looks like a phone number, email or address gets hidden too.
const PRIVATE = [/\d[\d\s-]{5,}\d/g, /\S+@\S+/g, /https?:\/\/\S+/gi, /www\.\S+/gi]

export function cleanText(text, max = 80) {
  let t = [...String(text ?? '')].filter((c) => c.charCodeAt(0) >= 32).join('').trim().slice(0, max)
  for (const re of PRIVATE) t = t.replace(re, (m) => '#'.repeat(Math.min(m.length, 8)))
  const lower = t.toLowerCase()
  const hide = []
  for (const w of RUDE) {
    let i = lower.indexOf(w)
    while (i >= 0) {
      // only at the start of a word, so "scrap" and "parse" are fine
      if (i === 0 || !/[a-z]/.test(lower[i - 1])) hide.push([i, i + w.length])
      i = lower.indexOf(w, i + 1)
    }
  }
  if (hide.length) t = [...t].map((c, i) => (c !== ' ' && hide.some(([a, b]) => i >= a && i < b) ? '#' : c)).join('')
  return t
}

// Did this message have a rude word in it? (phone numbers etc. don't count)
export function isRude(text) {
  let t = String(text ?? '')
  for (const re of PRIVATE) t = t.replace(re, '')
  return cleanText(t, 1000) !== t.trim().slice(0, 1000)
}

// Swear 3 times in a row and chat is switched off for a while.
export const SWEAR_LIMIT = 3
export const BAN_MS = 5 * 60 * 1000

// Usernames: letters, numbers and _ only, 3-16 long, and no rude words.
export function cleanName(name) {
  const n = String(name ?? '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 16)
  if (n.length < 3 || cleanText(n) !== n) return 'Duck' + Math.floor(Math.random() * 9000 + 1000)
  return n
}

export function nameProblem(name) {
  if (/[^A-Za-z0-9_]/.test(name)) return 'Only letters, numbers and _ (no spaces).'
  if (name.length < 3) return 'At least 3 letters.'
  if (name.length > 16) return '16 letters max.'
  if (cleanText(name) !== name) return 'That name is not allowed. Try another!'
  return ''
}

// A duck colour that stays the same for each online player.
export function colorFor(id) {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `hsl(${h % 360}, 85%, 62%)`
}

export function makeCode() {
  return Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')
}

// ---------------------------------------------------------------- host

export function hostRoom(code, handlers) {
  const peer = new Peer(PREFIX + code, peerOptions())
  const guests = new Map() // peer id -> { conn, name, costume, pet, cmd }
  peer.on('open', () => handlers.onOpen?.())
  peer.on('error', (e) => handlers.onError?.(e.type === 'unavailable-id' ? 'That room code is taken. Try again!' : `Connection problem (${e.type}).`))
  peer.on('connection', (conn) => {
    conn.on('data', (msg) => {
      if (msg.t === 'hello') {
        if (guests.size >= 7) {
          conn.send({ t: 'full' })
          return
        }
        const g = { conn, id: conn.peer, name: cleanName(msg.name), costume: msg.costume, pet: msg.pet, cmd: null }
        guests.set(conn.peer, g)
        handlers.onGuests?.([...guests.values()])
        handlers.onJoin?.(g)
      } else if (msg.t === 'input') {
        const g = guests.get(conn.peer)
        if (!g) return
        // One-shot buttons stay pressed until the game reads them once.
        const prev = g.cmd
        g.cmd = { ...msg.cmd, jump: msg.cmd.jump || !!prev?.jump, dash: msg.cmd.dash || !!prev?.dash, shield: msg.cmd.shield || !!prev?.shield, emote: msg.cmd.emote >= 0 ? msg.cmd.emote : prev?.emote ?? -1 }
      } else if (msg.t === 'hub') {
        if (guests.has(conn.peer)) handlers.onHub?.(conn.peer, msg.s)
      } else if (msg.t === 'chat') {
        const g = guests.get(conn.peer)
        const now = performance.now()
        // at most one message a second each, so nobody can spam
        if (!g || now - (g.lastChat || 0) < 1000) return
        g.lastChat = now
        if ((g.bannedUntil || 0) > now) return
        if (isRude(msg.text)) {
          g.strikes = (g.strikes || 0) + 1
          if (g.strikes >= SWEAR_LIMIT) {
            g.strikes = 0
            g.bannedUntil = now + BAN_MS
          }
        } else g.strikes = 0
        const text = cleanText(msg.text)
        if (text) handlers.onChat?.(conn.peer, g.name, text)
      }
    })
    conn.on('close', () => {
      const g = guests.get(conn.peer)
      if (!g) return
      guests.delete(conn.peer)
      handlers.onGuests?.([...guests.values()])
      handlers.onLeave?.(conn.peer, g.name)
    })
  })
  return {
    code,
    guests,
    handlers,
    // set what happens when something arrives (onJoin, onHub, onChat, onLeave…)
    on(key, fn) {
      handlers[key] = fn
    },
    // Read (and use up) a guest's latest controls.
    readGuest(id) {
      const g = guests.get(id)
      if (!g || !g.cmd) return { mx: 0, my: 0, jump: false, bonk: false, dash: false, shield: false, emote: -1, aim: null }
      const c = g.cmd
      g.cmd = { ...c, jump: false, dash: false, shield: false, emote: -1 }
      return { ...c, aim: null }
    },
    send(id, msg) {
      const g = guests.get(id)
      if (g?.conn.open) g.conn.send(msg)
    },
    broadcast(msg, except) {
      for (const g of guests.values()) if (g.id !== except && g.conn.open) g.conn.send(msg)
    },
    close() {
      peer.destroy()
    },
  }
}

// ---------------------------------------------------------------- guest

export function joinRoom(code, me, handlers) {
  const peer = new Peer(undefined, peerOptions())
  let conn = null
  peer.on('open', () => {
    conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true })
    conn.on('open', () => {
      conn.send({ t: 'hello', name: me.name, costume: me.costume, pet: me.pet })
      handlers.onJoined?.(peer.id)
    })
    conn.on('data', (msg) => handlers.onMessage?.(msg))
    conn.on('close', () => handlers.onClose?.())
  })
  peer.on('error', (e) => handlers.onError?.(e.type === 'peer-unavailable' ? `No room called ${code.toUpperCase()}. Check the code!` : `Connection problem (${e.type}).`))
  return {
    sendInput(cmd) {
      if (conn?.open) conn.send({ t: 'input', cmd })
    },
    send(msg) {
      if (conn?.open) conn.send(msg)
    },
    close() {
      peer.destroy()
    },
  }
}

// ---------------------------------------------------------------- snapshots

const STATE = { solid: 's', warn: 'w', falling: 'f', gone: 'g', rising: 'r' }
const STATE_BACK = Object.fromEntries(Object.entries(STATE).map(([k, v]) => [v, k]))

export function arenaInfo(a) {
  return {
    key: a.key,
    name: a.name,
    dark: a.dark,
    blob: a.blob,
    preset: a.preset,
    tiles: a.tiles.map((t) => [t.i, t.j, t.x, t.y, t.color, t.alt ? 1 : 0, Math.round(t.dist)]),
    movers: a.movers.map((m) => ({ k: m.k, r: m.r, w: m.w, h: m.h, bx: m.bx, by: m.by, x: m.x, y: m.y, mv: m.mv })),
  }
}

export function buildMirror(info, night, myId) {
  const tiles = info.tiles.map(([i, j, x, y, color, alt, dist]) => ({ i, j, x, y, color, alt: !!alt, dist, state: 'solid', drop: 0, t: 0 }))
  return {
    mirror: true,
    myId,
    night,
    arena: { ...info, tiles, movers: info.movers.map((m) => ({ ...m, dx: 0, dy: 0 })), angle: 0, lavaLevel: -400 },
    players: [],
    t: 0,
    shake: 0,
    phase: 'countdown',
    countdown: 3,
    flags: new Set(),
    wind: { a: 0, s: 0 },
    meteors: [],
    rain: [],
    bombs: [],
    boxes: [],
    crates: [],
    golden: null,
    giantDuck: null,
    popups: [],
    particles: [],
    twinkles: [],
    feed: [],
    banner: null,
    blackout: 0,
  }
}

const PKEYS = ['id', 'x', 'y', 'z', 'facing', 'state', 'balloons', 'hammer', 'swinging', 'swingT', 'swingDur', 'spin', 'flipT', 'shieldT', 'invuln', 'king', 'fallT', 'walk', 'parachute']

export function makeSnapshot(w, hud) {
  const a = w.arena
  let tiles = ''
  const drops = []
  a.tiles.forEach((t, i) => {
    tiles += STATE[t.state]
    if (t.drop) drops.push(i, Math.round(t.drop))
  })
  return {
    t: 'snap',
    time: w.t,
    phase: w.phase,
    countdown: w.countdown,
    shake: w.shake,
    blackout: w.blackout,
    angle: a.angle,
    lava: a.lavaLevel,
    movers: a.movers.map((m) => [m.x, m.y]),
    tiles,
    drops,
    flags: [...w.flags],
    wind: w.wind,
    players: w.players.map((p) => {
      const o = {}
      for (const k of PKEYS) o[k] = p[k]
      o.emote = p.emote ? p.emote.key : null
      o.shield = p.powers.shield > 0
      o.tiny = p.powers.tiny > 0
      o.fly = p.flyAway ? [p.flyAway.x, p.flyAway.y, p.flyAway.z] : null
      return o
    }),
    meteors: w.meteors.map((m) => [m.x, m.y, m.t, m.r]),
    rain: w.rain.map((r) => [r.x, r.y, r.t, r.r, r.a]),
    bombs: w.bombs.map((b) => [b.x, b.y, b.z, b.r, b.hue]),
    boxes: w.boxes.map((b) => [b.x, b.y, b.z]),
    crates: w.crates.map((b) => [b.x, b.y, b.z]),
    golden: w.golden ? [w.golden.x, w.golden.y, w.golden.z] : null,
    duck: w.giantDuck ? [w.giantDuck.x, w.giantDuck.y, w.giantDuck.dir, w.giantDuck.t, w.giantDuck.quackT] : null,
    popups: w.popups.map((p) => [p.x, p.y, p.z, p.text, p.color, p.size, p.life, p.t, p.rot]),
    twinkles: w.twinkles.map((t) => [t.x, t.y, t.z, t.t, t.color]),
    feed: w.feed.map((f) => [f.text, f.t]),
    banner: w.banner ? { ev: w.banner.ev, t: w.banner.t } : null,
    hud,
  }
}

// Keep objects stable between snapshots so the 3D view can reuse its meshes.
function keyed(list, prev, make) {
  return list.map((row, i) => {
    const o = prev[i] || {}
    Object.assign(o, make(row))
    return o
  })
}

export function applySnapshot(w, s, players) {
  const a = w.arena
  w.t = s.time
  w.phase = s.phase
  w.countdown = s.countdown
  w.shake = s.shake
  w.blackout = s.blackout
  a.angle = s.angle
  a.lavaLevel = s.lava
  s.movers.forEach(([x, y], i) => {
    const m = a.movers[i]
    if (m) {
      m.x = x
      m.y = y
    }
  })
  for (let i = 0; i < a.tiles.length; i++) {
    const t = a.tiles[i]
    t.state = STATE_BACK[s.tiles[i]] || 'solid'
    t.drop = 0
  }
  for (let i = 0; i < s.drops.length; i += 2) if (a.tiles[s.drops[i]]) a.tiles[s.drops[i]].drop = s.drops[i + 1]
  w.flags = new Set(s.flags)
  w.wind = s.wind
  for (const sp of s.players) {
    const p = players.get(sp.id)
    if (!p) continue
    // remember where we were so the view can glide between snapshots
    p.from = { x: p.x, y: p.y, z: p.z }
    p.to = { x: sp.x, y: sp.y, z: sp.z }
    p.lerpT = 0
    Object.assign(p, sp, { x: p.from.x ?? sp.x, y: p.from.y ?? sp.y, z: p.from.z ?? sp.z })
    p.emote = sp.emote ? { key: sp.emote } : null
    p.powers = { shield: sp.shield ? 1 : 0, tiny: sp.tiny ? 1 : 0 }
    p.flyAway = sp.fly ? { x: sp.fly[0], y: sp.fly[1], z: sp.fly[2] } : null
  }
  w.meteors = keyed(s.meteors, w.meteors, ([x, y, t, r]) => ({ x, y, t, r, done: t <= 0 }))
  w.rain = keyed(s.rain, w.rain, ([x, y, t, r, an]) => ({ x, y, t, r, a: an, done: t <= 0 }))
  w.bombs = keyed(s.bombs, w.bombs, ([x, y, z, r, hue]) => ({ x, y, z, r, hue }))
  w.boxes = keyed(s.boxes, w.boxes, ([x, y, z]) => ({ x, y, z }))
  w.crates = keyed(s.crates, w.crates, ([x, y, z]) => ({ x, y, z }))
  w.golden = s.golden ? Object.assign(w.golden || {}, { x: s.golden[0], y: s.golden[1], z: s.golden[2] }) : null
  w.giantDuck = s.duck ? Object.assign(w.giantDuck || {}, { x: s.duck[0], y: s.duck[1], dir: s.duck[2], t: s.duck[3], quackT: s.duck[4], r: 95 }) : null
  w.popups = s.popups.map(([x, y, z, text, color, size, life, t, rot]) => ({ x, y, z, text, color, size, life, t, rot }))
  w.twinkles = s.twinkles.map(([x, y, z, t, color]) => ({ x, y, z, t, color }))
  w.feed = s.feed.map(([text, t]) => ({ text, t }))
  w.banner = s.banner
}

// Glide guest-side ducks toward the latest snapshot position.
export function smoothPlayers(w, dt) {
  for (const p of w.players) {
    if (!p.to) continue
    p.lerpT = Math.min(1, (p.lerpT || 0) + dt / 0.05)
    p.x = p.from.x + (p.to.x - p.from.x) * p.lerpT
    p.y = p.from.y + (p.to.y - p.from.y) * p.lerpT
    p.z = p.from.z + (p.to.z - p.from.z) * p.lerpT
  }
}
