// Two-player online play. Each player shares one small "state" object with the other about
// 20 times a second: the host shares the whole game, the guest shares which buttons they press.
//
// Inside the published game page it uses the page's own live room (claude.ai's `room` feature).
// Anywhere else (the arcade file) it uses the arcade's PeerJS netcode from Animal Brawl.

import { hostRoom, joinRoom } from '../brawl/net'

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const SEND_EVERY = 0.05

export function randomCode() {
  let c = ''
  for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return c
}

export const cleanCode = (s) =>
  String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)

async function getRoomApi() {
  try {
    if (!window.claude?.use) return null
    return await window.claude.use('room')
  } catch {
    return null
  }
}

// role: 'host' or 'guest'. For a guest, `code` is the code they typed.
// Returns a session: { code, mine(state), theirs(), linked(), error, close() }.
export function startSession(role, code) {
  const s = {
    role,
    code: role === 'host' ? randomCode() : cleanCode(code),
    error: null,
    ready: false,
    lastSend: 0,
    state: null,
    theirState: null,
    impl: null,
    mine(state) {
      this.state = state
      const now = performance.now() / 1000
      if (now - this.lastSend < SEND_EVERY) return
      this.lastSend = now
      this.impl?.send(state)
    },
    theirs() {
      return this.impl ? this.impl.theirs() : null
    },
    linked() {
      return !!this.theirs()
    },
    close() {
      this.closed = true
      this.cancel?.()
      this.impl?.close()
    },
  }
  connect(s)
  return s
}

async function connect(s) {
  const api = await getRoomApi()
  if (s.closed) return
  if (api) {
    try {
      const room = await api.join(`avd-${s.code.toLowerCase()}`)
      if (s.closed) {
        room.leave()
        return
      }
      s.impl = {
        send: (state) => room.presence(state).catch(() => {}),
        theirs: () => {
          const p = room.peers().find((x) => !x.sameTab && x.presence && x.presence.role && x.presence.role !== s.role)
          return p ? p.presence : null
        },
        close: () => room.leave(),
      }
      s.ready = true
    } catch {
      s.error = "Couldn't open a game room. Try again in a moment."
    }
    return
  }
  // outside the game page: PeerJS, browser to browser
  let last = null
  const opts = { prefix: 'faz-arcade-avd-', onError: (msg) => (s.error = msg) }
  const pending = s.role === 'host' ? hostRoom({ ...opts, onCode: (c) => (s.code = c) }) : joinRoom(s.code, opts)
  s.cancel = pending.cancel
  s.ready = s.role === 'host'
  try {
    const link = await pending.promise
    if (s.closed) {
      link.close()
      return
    }
    link.on('p', (m) => (last = m.p))
    link.onClose(() => {
      last = null
      s.error = 'Your friend left the game.'
    })
    s.impl = {
      send: (state) => link.send({ t: 'p', p: state }),
      theirs: () => last,
      close: () => link.close(),
    }
    s.ready = true
  } catch {
    if (!s.error) s.error = "Couldn't connect. Check the code and try again."
  }
}
