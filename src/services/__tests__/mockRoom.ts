// In-memory stand-in for the host's room capability (tests only): one hub,
// many clients, the lobby plus named rooms, presence merge semantics,
// host-stamped senders, echo to the sender, and switches to refuse topics
// or named rooms.

import type { NamedRoomLike, RoomMessage, RoomNamespace, RoomPeer, RoomPeersChange, UserNamespace } from '../netRoom'

interface Client {
  peer: string
  by: string
  guest: boolean
  kind: 'viewer' | 'agent'
}

class Space {
  presence = new Map<string, Record<string, unknown>>()
  topicFns = new Map<string, Set<{ peer: string; fn: (m: RoomMessage) => void }>>()
  peerFns = new Set<{ peer: string; fn: (c: RoomPeersChange) => void }>()
  members = new Set<string>()
}

export class MockHub {
  spaces = new Map<string, Space>()
  clients = new Map<string, Client>()
  names = new Map<string, string>()
  deniedTopics = new Set<string>()
  noRooms = false
  private seq = 0

  space(name: string) {
    let s = this.spaces.get(name)
    if (!s) this.spaces.set(name, (s = new Space()))
    return s
  }

  peersFor(name: string, viewer: string): readonly RoomPeer[] {
    const s = this.space(name)
    return Object.freeze(
      [...s.members].map((peer) => {
        const c = this.clients.get(peer)!
        return Object.freeze({ peer, by: c.by, isMe: peer === viewer, sameTab: peer === viewer, kind: c.kind, guest: c.guest, presence: Object.freeze({ ...(s.presence.get(peer) ?? {}) }), updatedAt: 0 })
      }),
    )
  }

  notify(name: string) {
    const s = this.space(name)
    for (const { peer, fn } of [...s.peerFns]) fn({ peers: this.peersFor(name, peer), joined: [], left: [], updated: [] })
  }

  emit(name: string, from: string, topic: string, data: unknown) {
    const c = this.clients.get(from)!
    for (const { peer, fn } of [...(this.space(name).topicFns.get(topic) ?? [])]) {
      fn({ peer: from, by: c.by, isMe: peer === from, sameTab: peer === from, kind: c.kind, guest: c.guest, topic, data })
    }
  }

  /** A client of the hub: the namespace RoomNet talks to. */
  connect(opts: { name: string; guest?: boolean; kind?: 'viewer' | 'agent' }): { room: RoomNamespace; user: UserNamespace; peer: string } {
    const peer = `peer${++this.seq}`
    const by = `u_${this.seq}`
    this.clients.set(peer, { peer, by, guest: !!opts.guest, kind: opts.kind ?? 'viewer' })
    this.names.set(by, opts.name)
    const make = (name: string): NamedRoomLike => {
      const s = this.space(name)
      s.members.add(peer)
      let left = false
      const api: NamedRoomLike = {
        name,
        emit: async (topic, data) => {
          if (left) throw { code: 'invalid_argument', message: 'left' }
          if (this.deniedTopics.has(topic)) throw { code: 'not_permitted', message: topic }
          this.emit(name, peer, topic, data)
        },
        on: (topic, fn) => {
          let set = s.topicFns.get(topic)
          if (!set) s.topicFns.set(topic, (set = new Set()))
          const entry = { peer, fn }
          set.add(entry)
          return () => void set.delete(entry)
        },
        presence: async (patch) => {
          const cur = { ...(s.presence.get(peer) ?? {}) }
          for (const [k, v] of Object.entries(patch)) {
            if (v === null) delete cur[k]
            else cur[k] = v
          }
          if (JSON.stringify(cur).length > 4096) throw { code: 'invalid_argument', message: 'too big' }
          s.presence.set(peer, cur)
          this.notify(name)
        },
        peers: () => this.peersFor(name, peer),
        onPeers: (fn) => {
          const entry = { peer, fn }
          s.peerFns.add(entry)
          queueMicrotask(() => s.peerFns.has(entry) && fn({ peers: this.peersFor(name, peer), joined: [], left: [], updated: [] }))
          return () => void s.peerFns.delete(entry)
        },
        connected: () => true,
        onConnection: (fn) => {
          queueMicrotask(() => fn(true))
          return () => undefined
        },
        leave: async () => {
          left = true
          s.members.delete(peer)
          s.presence.delete(peer)
          for (const set of s.topicFns.values()) for (const e of [...set]) if (e.peer === peer) set.delete(e)
          for (const e of [...s.peerFns]) if (e.peer === peer) s.peerFns.delete(e)
          this.notify(name)
        },
      }
      this.notify(name)
      return api
    }
    const lobby = make('')
    const room: RoomNamespace = {
      ...lobby,
      join: async (name: string) => {
        if (!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(name)) throw { code: 'invalid_argument', message: name }
        if (this.noRooms) throw { code: 'not_permitted', message: 'no rooms' }
        return make(name)
      },
    }
    const user: UserNamespace = {
      profiles: async (ids) => Object.fromEntries((typeof ids === 'string' ? [ids] : ids).map((id) => [id, { name: this.names.get(id) ?? '' }])),
    }
    return { room, user, peer }
  }

  /** Write raw presence for a peer (a hostile client bypassing RoomNet). */
  forcePresence(name: string, peer: string, presence: Record<string, unknown>) {
    this.space(name).presence.set(peer, presence)
    this.notify(name)
  }
}

export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
