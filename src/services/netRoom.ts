// Transport 1: the artifact host's `room` capability (everyone viewing the
// published game right now: the owner's organization and invited guests).
//
//  - Lobby (the room everyone shares): small presence {n, lv, m, fc} so the
//    "who's online everywhere" list works, plus the addressed topics
//    (gift, trade, ping).
//  - One named room per map (`map-wat`, `map-hub_chatuchak`, `map-wat.ubosot`):
//    full presence (position, look, pet, activity) and the map topics
//    (chat, emote, sathu, fair, dance). The old room is left on a map change.
//  - If this viewer may not join named rooms, everything falls back to the
//    lobby (full presence there; players are filtered by map).
//
// Senders are stamped by the host (`peer`, `by`, `isMe`, `guest`); names come
// from the `user` capability's profiles(), and the player's own in-game
// nickname travels in presence (labelled as self-chosen in the UI).
// Everything received is validated in netValidate.ts.

import { MAP_TOPICS, NET_TOPICS, type NetApi, type NetMessage, type NetPlayer, type NetStatus, type NetTopic } from './net'
import { applyMePatch, defaultMe, lobbyPresence, mapPresence, parsePresence, roomName, toNetPlayer, type MeState } from './netValidate'

// Minimal local shapes of the host API (see the capability's room.d.ts / user.d.ts).
export interface RoomSender {
  peer: string
  by: string | null
  isMe: boolean
  sameTab: boolean
  kind: 'viewer' | 'agent'
  guest: boolean
}
export interface RoomPeer extends RoomSender {
  presence: Readonly<Record<string, unknown>>
  updatedAt: number
}
export interface RoomMessage extends RoomSender {
  topic: string
  data?: unknown
}
export type RoomOnError = (e: { code: string; message: string }) => void
export interface RoomPeersChange {
  peers: readonly RoomPeer[]
  joined: readonly RoomPeer[]
  left: readonly RoomPeer[]
  updated: readonly RoomPeer[]
}
export interface RoomLike {
  emit(topic: string, data?: unknown): Promise<void>
  on(topic: string, handler: (msg: RoomMessage) => void, onError?: RoomOnError): () => void
  presence(patch: Record<string, unknown>): Promise<void>
  peers(): readonly RoomPeer[]
  onPeers(handler: (change: RoomPeersChange) => void, onError?: RoomOnError): () => void
  connected(): boolean
  onConnection(handler: (connected: boolean) => void, onError?: RoomOnError): () => void
}
export interface NamedRoomLike extends RoomLike {
  readonly name: string
  leave(): Promise<void>
}
export interface RoomNamespace extends RoomLike {
  join(name: string): Promise<NamedRoomLike>
}
export interface UserNamespace {
  profiles(ids: readonly string[] | string): Promise<Record<string, { name: string; guest?: boolean }>>
}

const TERMINAL = new Set(['revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error'])
const errCode = (e: unknown) => (e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : 'upstream_error')

type Handler = (msg: NetMessage<unknown>) => void

export class RoomNet implements NetApi {
  private me: MeState = defaultMe()
  private mapRoom: NamedRoomLike | null = null
  /** Map whose room we are in or joining ('' = none). */
  private mapName = ''
  private joinSeq = 0
  private mode: 'rooms' | 'lobby' = 'rooms'
  private handlers = new Map<NetTopic, Set<Handler>>()
  private changeFns = new Set<() => void>()
  private offMap: (() => void)[] = []
  private names = new Map<string, string>()
  private asked = new Set<string>()
  private connectedNow = false
  private dead = false
  private deniedTopics = new Set<NetTopic>()
  private self: string | null = null
  private sent = { lobby: new Map<string, string>(), map: new Map<string, string>() }
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private lastFlush = 0
  private lobbyPlayers = new Map<string, NetPlayer>()
  private mapPlayers: NetPlayer[] = []
  private changeQueued = false

  constructor(
    private readonly lobby: RoomNamespace,
    private readonly user: UserNamespace | null,
  ) {
    const onErr: RoomOnError = (e) => this.onLobbyError(e.code)
    for (const t of NET_TOPICS) lobby.on(t, (m) => this.deliver(t, m), onErr)
    lobby.onPeers(() => this.rebuild(), onErr)
    lobby.onConnection((c) => {
      this.connectedNow = c
      this.emitChange()
    }, onErr)
  }

  // ------------------------------------------------------------------ NetApi

  kind() {
    return 'room' as const
  }

  online() {
    return !this.dead && this.connectedNow
  }

  status(): NetStatus {
    return this.dead ? 'error' : this.connectedNow ? 'online' : 'connecting'
  }

  selfId() {
    return this.self
  }

  denied() {
    return [...this.deniedTopics]
  }

  players(map: string): NetPlayer[] {
    if (!map) return []
    if (this.mode === 'rooms' && this.mapRoom && map === this.me.map) return this.mapPlayers
    return [...this.lobbyPlayers.values()].filter((p) => p.map === map)
  }

  everyone(): NetPlayer[] {
    const out = new Map(this.lobbyPlayers)
    for (const p of this.mapPlayers) out.set(p.id, { ...p, accountName: p.accountName ?? out.get(p.id)?.accountName })
    return [...out.values()]
  }

  player(id: string): NetPlayer | null {
    return this.mapPlayers.find((p) => p.id === id) ?? this.lobbyPlayers.get(id) ?? null
  }

  onChange(fn: () => void) {
    this.changeFns.add(fn)
    return () => void this.changeFns.delete(fn)
  }

  on<T>(topic: NetTopic, fn: (msg: NetMessage<T>) => void) {
    let set = this.handlers.get(topic)
    if (!set) this.handlers.set(topic, (set = new Set()))
    set.add(fn as Handler)
    return () => void set.delete(fn as Handler)
  }

  setMe(patch: Partial<Omit<NetPlayer, 'id'>> & { hidden?: boolean }) {
    this.me = applyMePatch(this.me, patch)
    this.syncMap()
    this.scheduleFlush()
  }

  send<T>(topic: NetTopic, data: T) {
    if (this.dead || this.deniedTopics.has(topic) || this.me.hidden) return
    const mapTopic = MAP_TOPICS.includes(topic)
    const target: RoomLike | null = mapTopic && this.mode === 'rooms' ? this.mapRoom : this.lobby
    if (!target) return
    target.emit(topic, data).catch((e) => {
      const code = errCode(e)
      if (code === 'not_permitted') {
        this.deniedTopics.add(topic)
        this.emitChange()
      } else if (TERMINAL.has(code)) this.onLobbyError(code)
    })
  }

  // ------------------------------------------------------------------ internals

  private emitChange() {
    if (this.changeQueued) return
    this.changeQueued = true
    queueMicrotask(() => {
      this.changeQueued = false
      for (const fn of [...this.changeFns]) fn()
    })
  }

  private onLobbyError(code: string) {
    if (!TERMINAL.has(code)) return
    this.dead = true
    this.connectedNow = false
    this.lobbyPlayers.clear()
    this.mapPlayers = []
    this.emitChange()
  }

  private deliver(topic: NetTopic, m: RoomMessage) {
    if (!m || m.kind !== 'viewer' || (m.isMe && !m.sameTab) || typeof m.peer !== 'string') return
    const set = this.handlers.get(topic)
    if (!set?.size) return
    const msg: NetMessage<unknown> = { from: m.peer, topic, data: m.data, me: !!m.sameTab }
    for (const fn of [...set]) {
      try {
        fn(msg)
      } catch (e) {
        console.error(e)
      }
    }
  }

  private accountName(by: string | null): string | null {
    return by ? this.names.get(by) ?? null : null
  }

  /** Rebuild player lists from the rooms' peers (both are frozen snapshots). */
  private rebuild() {
    const lobbyMap = new Map<string, NetPlayer>()
    const unknown: string[] = []
    for (const p of this.lobby.peers()) {
      if (p.sameTab) this.self = p.peer
      if (p.isMe || p.kind !== 'viewer') continue
      const info = parsePresence(p.presence)
      if (!info) continue
      if (p.by && !this.names.has(p.by) && !this.asked.has(p.by)) unknown.push(p.by)
      lobbyMap.set(p.peer, toNetPlayer(p.peer, info, { guest: p.guest, accountName: this.accountName(p.by) }))
    }
    this.lobbyPlayers = lobbyMap
    const mapList: NetPlayer[] = []
    if (this.mapRoom) {
      for (const p of this.mapRoom.peers()) {
        if (p.isMe || p.kind !== 'viewer') continue
        const info = parsePresence(p.presence)
        if (!info?.full || info.map !== this.me.map) continue
        if (p.by && !this.names.has(p.by) && !this.asked.has(p.by)) unknown.push(p.by)
        mapList.push(toNetPlayer(p.peer, info, { guest: p.guest, accountName: this.accountName(p.by) }))
      }
    }
    this.mapPlayers = mapList
    if (unknown.length) this.resolveNames(unknown)
    this.emitChange()
  }

  private resolveNames(ids: string[]) {
    if (!this.user) return
    const batch = [...new Set(ids)]
    for (const id of batch) this.asked.add(id)
    this.user
      .profiles(batch)
      .then((res) => {
        let any = false
        for (const id of batch) {
          const n = res?.[id]?.name
          if (typeof n === 'string' && n) {
            this.names.set(id, n)
            any = true
          }
        }
        if (any) this.rebuild()
      })
      .catch(() => undefined)
  }

  /** Join the current map's room (leaving the old one). */
  private syncMap() {
    const target = this.me.hidden || this.dead ? '' : this.me.map
    if (target === this.mapName) return
    this.mapName = target
    const seq = ++this.joinSeq
    const old = this.mapRoom
    this.mapRoom = null
    for (const off of this.offMap) off()
    this.offMap = []
    this.sent.map.clear()
    this.mapPlayers = []
    if (old && old.name !== (target ? roomName(target) : '')) old.leave().catch(() => undefined)
    this.emitChange()
    if (!target || this.mode === 'lobby') return
    this.join(target, seq, 0)
  }

  private join(map: string, seq: number, attempt: number) {
    const name = roomName(map)
    this.lobby
      .join(name)
      .then((room) => {
        if (seq !== this.joinSeq) {
          // A newer map switch happened meanwhile (keep it if it's the same room again).
          if (!this.mapName || roomName(this.mapName) !== room.name) room.leave().catch(() => undefined)
          return
        }
        this.mapRoom = room
        const onErr: RoomOnError = (e) => this.onMapError(e.code, seq)
        for (const t of MAP_TOPICS) this.offMap.push(room.on(t, (m) => this.deliver(t, m), onErr))
        this.offMap.push(room.onPeers(() => this.rebuild(), onErr))
        this.sent.map.clear()
        this.flush()
        this.rebuild()
      })
      .catch((e) => {
        if (seq !== this.joinSeq) return
        const code = errCode(e)
        if (code === 'not_permitted') {
          // No named rooms for this viewer: carry everything in the lobby.
          this.mode = 'lobby'
          this.sent.lobby.clear()
          this.flush()
        } else if (TERMINAL.has(code)) this.onLobbyError(code)
        else if (attempt < 6) setTimeout(() => seq === this.joinSeq && this.join(map, seq, attempt + 1), 1500 * (attempt + 1))
      })
  }

  private onMapError(code: string, seq: number) {
    if (seq !== this.joinSeq) return
    this.mapRoom = null
    this.offMap = []
    this.mapPlayers = []
    if (code === 'not_permitted') {
      this.mode = 'lobby'
      this.sent.lobby.clear()
      this.flush()
    } else if (TERMINAL.has(code)) this.onLobbyError(code)
    else if (this.mapName) setTimeout(() => seq === this.joinSeq && this.join(this.mapName, seq, 1), 1500)
    this.emitChange()
  }

  private scheduleFlush() {
    if (this.flushTimer) return
    const wait = Math.max(0, 100 - (Date.now() - this.lastFlush))
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush()
    }, wait)
  }

  /** Send only the presence fields that changed; fields that went away are nulled. */
  private patch(room: RoomLike, sent: Map<string, string>, next: Record<string, unknown>) {
    const patch: Record<string, unknown> = {}
    let any = false
    for (const [k, v] of Object.entries(next)) {
      const j = JSON.stringify(v)
      if (sent.get(k) !== j) {
        patch[k] = v
        sent.set(k, j)
        any = true
      }
    }
    for (const k of [...sent.keys()]) {
      if (!(k in next)) {
        patch[k] = null
        sent.delete(k)
        any = true
      }
    }
    if (any) room.presence(patch).catch(() => sent.clear())
  }

  private flush() {
    if (this.dead) return
    this.lastFlush = Date.now()
    const me = this.me
    if (me.hidden) {
      this.patch(this.lobby, this.sent.lobby, {})
      return
    }
    this.patch(this.lobby, this.sent.lobby, this.mode === 'lobby' ? mapPresence(me) : lobbyPresence(me))
    if (this.mapRoom && this.mode === 'rooms') this.patch(this.mapRoom, this.sent.map, mapPresence(me))
  }
}

/** Resolve the host's room (and user) namespaces; null when this view has none. */
export async function connectRoom(timeoutMs = 10_000): Promise<RoomNet | null> {
  const host = (globalThis as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude
  if (!host || typeof host.use !== 'function') return null
  const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), timeoutMs))])
  try {
    const room = (await withTimeout(host.use('room'))) as RoomNamespace | null
    if (!room || typeof room.join !== 'function') return null
    const user = ((await withTimeout(host.use('user')).catch(() => null)) as UserNamespace | null) ?? null
    return new RoomNet(room, user && typeof user.profiles === 'function' ? user : null)
  } catch {
    return null
  }
}
