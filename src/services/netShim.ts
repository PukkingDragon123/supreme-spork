// DEV ONLY: a stand-in for the artifact host's `room` and `user`
// capabilities, built on BroadcastChannel, so two tabs of the dev server can
// see each other move, chat and trade without publishing anything.
//
//   /?skipintro&roomshim&slot=a&as=มะปราง
//   /?skipintro&roomshim&slot=b&as=ต้นกล้า
//
// `as` is the account name the fake host vouches for, `guest` marks the tab
// as an invited guest, `roomshim=deny` refuses the `chat` topic
// (not_permitted) and `roomshim=lobby` refuses named rooms, to exercise the
// fallbacks. Loaded only from main.tsx behind import.meta.env.DEV.

import type { NamedRoomLike, RoomLike, RoomMessage, RoomNamespace, RoomOnError, RoomPeer, RoomPeersChange, UserNamespace } from './netRoom'

type Wire =
  | { k: 'pres'; room: string; peer: string; by: string; guest: boolean; name: string; presence: Record<string, unknown> }
  | { k: 'emit'; room: string; peer: string; by: string; guest: boolean; topic: string; data: unknown }
  | { k: 'hello'; room: string; peer: string }
  | { k: 'bye'; room: string; peer: string }

const TOPIC_RE = /^[a-z][a-z0-9_.-]{0,47}$/
const ROOM_RE = /^[a-z0-9][a-z0-9_.-]{0,47}$/
const reject = (code: string, message = code) => Promise.reject({ code, message })
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v ?? null)).length

function hash(s: string): string {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return (h >>> 0).toString(36)
}

interface Remote {
  peer: string
  by: string
  guest: boolean
  presence: Readonly<Record<string, unknown>>
  updatedAt: number
  seen: number
}

class ShimHost {
  readonly peer = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  readonly by: string
  readonly name: string
  readonly guest: boolean
  readonly deny: Set<string>
  readonly noRooms: boolean
  readonly bc = new BroadcastChannel('boondee-room-shim')
  readonly rooms = new Map<string, ShimRoom>()
  readonly names = new Map<string, string>()

  constructor(q: URLSearchParams) {
    this.name = q.get('as') || 'ผู้ทดสอบ'
    this.by = `u_${hash(this.name)}`
    this.guest = q.has('guest')
    const mode = q.get('roomshim') ?? ''
    this.deny = new Set(mode === 'deny' ? ['chat'] : [])
    this.noRooms = mode === 'lobby'
    this.names.set(this.by, this.name)
    this.bc.onmessage = (e) => this.receive(e.data as Wire)
    setInterval(() => this.tick(), 1000)
    addEventListener('pagehide', () => {
      for (const r of this.rooms.values()) this.post({ k: 'bye', room: r.name, peer: this.peer })
    })
  }

  post(w: Wire) {
    this.bc.postMessage(w)
  }

  private receive(w: Wire) {
    if (!w || typeof w !== 'object' || w.peer === this.peer) return
    const room = this.rooms.get(w.room)
    if (w.k === 'pres') this.names.set(w.by, w.name)
    if (!room) return
    if (w.k === 'hello') room.announce()
    else if (w.k === 'bye') room.drop(w.peer)
    else if (w.k === 'pres') room.upsert(w)
    else if (w.k === 'emit') room.hear(w)
  }

  private tick() {
    for (const r of this.rooms.values()) {
      r.announce()
      r.sweep()
    }
  }
}

class ShimRoom implements RoomLike {
  private mine: Record<string, unknown> = {}
  private remote = new Map<string, Remote>()
  private topicFns = new Map<string, Set<(m: RoomMessage) => void>>()
  private peerFns = new Set<(c: RoomPeersChange) => void>()
  private snapshot: readonly RoomPeer[] = Object.freeze([])
  private delivered = new Map<string, RoomPeer>()
  private pending = false
  private selfAt = Date.now()
  left = false

  constructor(
    readonly host: ShimHost,
    readonly name: string,
  ) {
    host.rooms.set(name, this)
    this.rebuild()
    host.post({ k: 'hello', room: name, peer: host.peer })
    this.announce()
  }

  announce() {
    const h = this.host
    h.post({ k: 'pres', room: this.name, peer: h.peer, by: h.by, guest: h.guest, name: h.name, presence: this.mine })
  }

  upsert(w: Extract<Wire, { k: 'pres' }>) {
    const cur = this.remote.get(w.peer)
    const same = cur && JSON.stringify(cur.presence) === JSON.stringify(w.presence)
    this.remote.set(w.peer, {
      peer: w.peer,
      by: w.by,
      guest: w.guest,
      presence: same ? cur!.presence : Object.freeze({ ...w.presence }),
      updatedAt: same ? cur!.updatedAt : Date.now(),
      seen: Date.now(),
    })
    if (!same) this.changed()
  }

  drop(peer: string) {
    if (this.remote.delete(peer)) this.changed()
  }

  sweep() {
    const now = Date.now()
    let any = false
    for (const [k, r] of this.remote) if (now - r.seen > 3500) any = this.remote.delete(k) || any
    if (any) this.changed()
  }

  hear(w: Extract<Wire, { k: 'emit' }>) {
    const msg: RoomMessage = Object.freeze({ peer: w.peer, by: w.by, isMe: false, sameTab: false, kind: 'viewer' as const, guest: w.guest, topic: w.topic, data: w.data })
    for (const fn of [...(this.topicFns.get(w.topic) ?? [])]) fn(msg)
  }

  private rebuild() {
    const h = this.host
    const self: RoomPeer = Object.freeze({ peer: h.peer, by: h.by, isMe: true, sameTab: true, kind: 'viewer' as const, guest: h.guest, presence: Object.freeze({ ...this.mine }), updatedAt: this.selfAt })
    const others = [...this.remote.values()].map((r) => {
      const prev = this.snapshot.find((p) => p.peer === r.peer)
      if (prev && prev.presence === r.presence && prev.guest === r.guest) return prev
      return Object.freeze({ peer: r.peer, by: r.by, isMe: false, sameTab: false, kind: 'viewer' as const, guest: r.guest, presence: r.presence, updatedAt: r.updatedAt })
    })
    this.snapshot = Object.freeze([self, ...others])
  }

  private changed() {
    this.rebuild()
    if (this.pending) return
    this.pending = true
    setTimeout(() => this.flushPeers(), 16)
  }

  private flushPeers() {
    this.pending = false
    const now = new Map(this.snapshot.map((p) => [p.peer, p]))
    const joined: RoomPeer[] = []
    const updated: RoomPeer[] = []
    const left: RoomPeer[] = []
    for (const [k, p] of now) {
      const old = this.delivered.get(k)
      if (!old) joined.push(p)
      else if (old !== p) updated.push(p)
    }
    for (const [k, p] of this.delivered) if (!now.has(k)) left.push(p)
    this.delivered = now
    if (!joined.length && !updated.length && !left.length) return
    const change: RoomPeersChange = { peers: this.snapshot, joined, left, updated }
    for (const fn of [...this.peerFns]) fn(change)
  }

  emit(topic: string, data?: unknown): Promise<void> {
    if (this.left) return reject('invalid_argument', 'left the room')
    if (!TOPIC_RE.test(topic)) return reject('invalid_argument', 'bad topic')
    if (bytes(data) > 4096) return reject('invalid_argument', 'data over 4 KiB')
    if (this.host.deny.has(topic)) return reject('not_permitted', `topic ${topic} is admin-only`)
    const h = this.host
    h.post({ k: 'emit', room: this.name, peer: h.peer, by: h.by, guest: h.guest, topic, data })
    const echo: RoomMessage = Object.freeze({ peer: h.peer, by: h.by, isMe: true, sameTab: true, kind: 'viewer' as const, guest: h.guest, topic, data })
    setTimeout(() => {
      for (const fn of [...(this.topicFns.get(topic) ?? [])]) fn(echo)
    }, 0)
    return Promise.resolve()
  }

  on(topic: string, handler: (msg: RoomMessage) => void, onError?: RoomOnError): () => void {
    if (typeof handler !== 'function') throw new TypeError('handler')
    if (!TOPIC_RE.test(topic)) {
      queueMicrotask(() => onError?.({ code: 'invalid_argument', message: 'bad topic' }))
      return () => undefined
    }
    let set = this.topicFns.get(topic)
    if (!set) this.topicFns.set(topic, (set = new Set()))
    set.add(handler)
    return () => void set.delete(handler)
  }

  presence(patch: Record<string, unknown>): Promise<void> {
    if (this.left) return reject('invalid_argument', 'left the room')
    const next = { ...this.mine }
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete next[k]
      else next[k] = v
    }
    if (bytes(next) > 4096) return reject('invalid_argument', 'presence over 4 KiB')
    this.mine = next
    this.selfAt = Date.now()
    this.announce()
    this.changed()
    return Promise.resolve()
  }

  peers(): readonly RoomPeer[] {
    return this.snapshot
  }

  onPeers(handler: (change: RoomPeersChange) => void): () => void {
    this.peerFns.add(handler)
    queueMicrotask(() => {
      if (!this.peerFns.has(handler)) return
      handler({ peers: this.snapshot, joined: this.snapshot, left: [], updated: [] })
    })
    return () => void this.peerFns.delete(handler)
  }

  connected() {
    return !this.left
  }

  onConnection(handler: (connected: boolean) => void): () => void {
    let on = true
    queueMicrotask(() => on && handler(!this.left))
    return () => void (on = false)
  }

  leave(): Promise<void> {
    if (this.left) return Promise.resolve()
    this.left = true
    this.host.post({ k: 'bye', room: this.name, peer: this.host.peer })
    this.host.rooms.delete(this.name)
    this.topicFns.clear()
    this.peerFns.clear()
    return Promise.resolve()
  }
}

/** Install `window.claude` with the fake room + user capabilities (no-op when a host is present). */
export function installRoomShim(q = new URLSearchParams(location.search)) {
  const w = window as unknown as { claude?: { use?: unknown } }
  if (w.claude?.use || typeof BroadcastChannel === 'undefined') return
  const host = new ShimHost(q)
  const lobby = new ShimRoom(host, '')
  const room: RoomNamespace = Object.freeze({
    emit: (t: string, d?: unknown) => lobby.emit(t, d),
    on: (t: string, h: (m: RoomMessage) => void, e?: RoomOnError) => lobby.on(t, h, e),
    presence: (p: Record<string, unknown>) => lobby.presence(p),
    peers: () => lobby.peers(),
    onPeers: (h: (c: RoomPeersChange) => void) => lobby.onPeers(h),
    connected: () => true,
    onConnection: (h: (c: boolean) => void) => lobby.onConnection(h),
    join(name: string): Promise<NamedRoomLike> {
      if (!ROOM_RE.test(name)) return reject('invalid_argument', 'bad room name')
      if (host.noRooms) return reject('not_permitted', 'named rooms are off')
      const existing = host.rooms.get(name)
      const r = existing && !existing.left ? existing : new ShimRoom(host, name)
      return new Promise((res) => setTimeout(() => res(r as unknown as NamedRoomLike), 60))
    },
  })
  const user: UserNamespace & Record<string, unknown> = Object.freeze({
    async profiles(ids: readonly string[] | string) {
      const list = typeof ids === 'string' ? [ids] : ids
      return Object.fromEntries(list.map((id) => [id, { id, name: host.names.get(id) ?? '', guest: false }]))
    },
    id: async () => host.by,
    name: async () => host.name,
    me: async () => ({ id: host.by, name: host.name, email: null, isOwner: false, canEdit: false }),
    isOwner: async () => false,
    canEdit: async () => false,
    can: async () => null,
  })
  w.claude = Object.freeze({
    use: async (name: string) => (name === 'room' ? room : name === 'user' ? user : null),
  })
}
