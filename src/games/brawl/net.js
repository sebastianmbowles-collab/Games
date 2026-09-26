// Online play over WebRTC using PeerJS. The two browsers talk directly to each other;
// PeerJS's free cloud server is only used to help them find each other with a room code.
import { Peer } from 'peerjs'

const PREFIX = 'faz-arcade-animal-brawl-'
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O or 1/I/L mix-ups

function randomCode() {
  let code = ''
  for (let i = 0; i < 4; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

// `?peer=host:port` points at a self-hosted PeerJS server instead of the free cloud one.
function peerOptions() {
  try {
    const custom = new URLSearchParams(window.location.search).get('peer')
    if (custom) {
      const [host, port] = custom.split(':')
      return { host, port: Number(port) || 9000, path: '/', secure: window.location.protocol === 'https:' }
    }
  } catch {
    // fall through to the default server
  }
  return {}
}

// Wraps a PeerJS connection with simple typed messages: link.on('state', fn), link.send({ t: 'state', ... }).
function makeLink(peer, conn) {
  const handlers = new Map()
  let closed = false
  let onClose = () => {}
  conn.on('data', (msg) => {
    handlers.get(msg?.t)?.forEach((fn) => fn(msg))
  })
  const close = () => {
    if (closed) return
    closed = true
    onClose()
  }
  conn.on('close', close)
  conn.on('error', close)
  peer.on('disconnected', () => {
    // Lost the matchmaking server; the direct connection may still be fine.
  })
  return {
    send(msg) {
      if (!closed && conn.open) conn.send(msg)
    },
    on(type, fn) {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type).add(fn)
      return () => handlers.get(type).delete(fn)
    },
    onClose(fn) {
      onClose = fn
    },
    close() {
      closed = true
      conn.close()
      peer.destroy()
    },
  }
}

// Host: make a room and wait for a friend. Calls onCode(code) once the room exists.
export function hostRoom({ onCode, onError }) {
  let peer
  let cancelled = false
  const promise = new Promise((resolve, reject) => {
    const tryCode = (attempt) => {
      const code = randomCode()
      peer = new Peer(PREFIX + code, peerOptions())
      peer.on('open', () => onCode(code))
      let taken = false
      peer.on('connection', (conn) => {
        // Rooms are for two players; turn away anyone else.
        if (taken) {
          conn.on('open', () => conn.close())
          return
        }
        taken = true
        conn.on('open', () => resolve(makeLink(peer, conn)))
      })
      peer.on('error', (err) => {
        if (cancelled) return
        if (err.type === 'unavailable-id' && attempt < 5) {
          peer.destroy()
          tryCode(attempt + 1)
        } else {
          onError?.(friendlyError(err))
          reject(err)
        }
      })
    }
    tryCode(0)
  })
  return {
    promise,
    cancel() {
      cancelled = true
      peer?.destroy()
    },
  }
}

// Guest: join a friend's room by code.
export function joinRoom(code, { onError }) {
  let cancelled = false
  const peer = new Peer(peerOptions())
  const promise = new Promise((resolve, reject) => {
    const fail = (err) => {
      if (cancelled) return
      onError?.(friendlyError(err))
      peer.destroy()
      reject(err)
    }
    const timer = setTimeout(() => fail({ type: 'timeout' }), 15000)
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true })
      conn.on('open', () => {
        clearTimeout(timer)
        resolve(makeLink(peer, conn))
      })
    })
    peer.on('error', (err) => {
      clearTimeout(timer)
      fail(err)
    })
  })
  return {
    promise,
    cancel() {
      cancelled = true
      peer.destroy()
    },
  }
}

function friendlyError(err) {
  switch (err?.type) {
    case 'peer-unavailable':
      return "Couldn't find that room. Check the code and try again."
    case 'timeout':
      return 'Took too long to connect. Check the code, or try again.'
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return "Can't reach the matchmaking server. Check your internet connection."
    case 'browser-incompatible':
      return "This browser can't play online."
    default:
      return 'Something went wrong connecting. Try again!'
  }
}
