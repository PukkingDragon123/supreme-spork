// Transport 2: self-hosted realtime over Supabase Realtime (presence +
// broadcast channels), enabled when VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are set (see README "เล่นออนไลน์").
//
//  - `boondee-lobby`: presence {pid, n, lv, m, fc} for the online list, and
//    the addressed topics (gift, trade, ping) as broadcasts.
//  - `boondee-map-<map>`: presence with look / pet / last position (tracked on
//    changes, at most once a second), a `pos` broadcast at ~8 Hz while walking
//    (idle keepalive every 10 s), and the map topics (chat, emote, sathu,
//    fair, dance).
// Broadcast payloads are {f: senderPeerId, d: data}. Unlike the artifact
// room, the server does not vouch for senders here: names are self-chosen
// nicknames and everything is validated like any other untrusted input.

import { MAP_TOPICS, NET_TOPICS, type NetApi, type NetMessage, type NetPlayer, type NetStatus, type NetTopic } from './net'
import { applyMePatch, cleanCoord, cleanFace, cleanPeerId, defaultMe, lobbyPresence, mapPresence, newToken, parsePresence, roomName, toNetPlayer, type MeState } from './netValidate'
import { PhoenixSocket, applyPresenceJoins, applyPresenceLeaves, presenceFromState, type PhxChannel, type WsCtor } from './realtime'

type Handler = (msg: NetMessage<unknown>) => void
type Table = Map<string, Record<string, unknown>>

export interface RealtimeOptions {
  url: string
  anonKey: string
  /** Signed-in user's access token (optional; the anon key otherwise). */
  token?: () => Promise<string | null>
  WebSocket?: WsCtor
  /** Prefix for channel names (lets several games share one project). */
  prefix?: string
}

const POS_HZ = 8
const KEEPALIVE_MS = 10_000
const TRACK_MIN_MS = 1000

export class RealtimeNet implements NetApi {
  private readonly sock: PhoenixSocket
  private readonly peer = `p${newToken(12)}`
  private me: MeState = defaultMe()
  private lobby: PhxChannel
  private lobbyTable: Table = new Map()
  private mapCh: PhxChannel | null = null
  private mapTable: Table = new Map()
  private mapName = ''
  private pos = new Map<string, { x: number; y: number; face: NetPlayer['face']; moving: boolean }>()
  private handlers = new Map<NetTopic, Set<Handler>>()
  private changeFns = new Set<() => void>()
  private open = false
  private token: string | null = null
  private lastTrack = { lobby: '', map: '' }
  private trackTimer: ReturnType<typeof setTimeout> | null = null
  private lastTrackAt = 0
  private lastPos = { at: 0, key: '' }
  private posTimer: ReturnType<typeof setTimeout> | null = null
  private keepalive: ReturnType<typeof setInterval> | null = null
  private tokenTimer: ReturnType<typeof setInterval> | null = null
  private changeQueued = false
  private readonly prefix: string

  constructor(private readonly o: RealtimeOptions) {
    this.prefix = o.prefix ?? 'boondee'
    const ws = o.url.replace(/^http/i, 'ws').replace(/\/+$/, '')
    this.sock = new PhoenixSocket(`${ws}/realtime/v1/websocket`, { apikey: o.anonKey, vsn: '1.0.0' }, o.WebSocket)
    this.sock.onState((open) => {
      this.open = open
      if (!open) {
        this.lobbyTable.clear()
        this.mapTable.clear()
      }
      this.emitChange()
    })
    this.lobby = this.channel(`${this.prefix}-lobby`, false)
    this.lobby.join()
    this.keepalive = setInterval(() => this.sendPos(true), KEEPALIVE_MS)
    // Signed-in players join with their own token (picked up on the next (re)join).
    this.tokenTimer = setInterval(() => void this.refreshToken(), 5 * 60_000)
    void this.refreshToken().finally(() => this.sock.connect())
  }

  /** Stop everything (tests). */
  close() {
    if (this.keepalive) clearInterval(this.keepalive)
    if (this.tokenTimer) clearInterval(this.tokenTimer)
    this.sock.disconnect()
  }

  private async refreshToken() {
    try {
      this.token = (await this.o.token?.()) ?? null
    } catch {
      this.token = null
    }
  }

  private channel(name: string, isMap: boolean): PhxChannel {
    const ch = this.sock.channel(`realtime:${name}`, () => ({
      config: { broadcast: { self: false, ack: false }, presence: { key: this.peer, enabled: true }, postgres_changes: [], private: false },
      access_token: this.token ?? this.o.anonKey,
    }))
    const table = () => (isMap ? this.mapTable : this.lobbyTable)
    ch.onJoin((ok) => {
      if (!ok) return
      if (isMap) this.lastTrack.map = ''
      else this.lastTrack.lobby = ''
      this.track(true)
    })
    ch.on('presence_state', (p) => {
      const t = presenceFromState(p)
      if (isMap) this.mapTable = t
      else this.lobbyTable = t
      this.emitChange()
    })
    ch.on('presence_diff', (p) => {
      const d = (p ?? {}) as { joins?: unknown; leaves?: unknown }
      applyPresenceJoins(table(), d.joins)
      applyPresenceLeaves(table(), d.leaves)
      if (isMap) for (const k of [...this.pos.keys()]) if (!this.mapTable.has(k)) this.pos.delete(k)
      this.emitChange()
    })
    ch.on('broadcast', (p) => this.onBroadcast(p, isMap))
    return ch
  }

  // ------------------------------------------------------------------ NetApi

  kind() {
    return 'realtime' as const
  }

  online() {
    return this.open
  }

  status(): NetStatus {
    return this.open ? 'online' : 'connecting'
  }

  selfId() {
    return this.peer
  }

  denied() {
    return []
  }

  players(map: string): NetPlayer[] {
    if (!map) return []
    if (map === this.me.map && this.mapCh) {
      const out: NetPlayer[] = []
      for (const [key, meta] of this.mapTable) {
        if (key === this.peer || !cleanPeerId(key)) continue
        const info = parsePresence(meta)
        if (!info?.full || info.map !== map) continue
        const p = toNetPlayer(key, info)
        const live = this.pos.get(key)
        out.push(live ? { ...p, ...live } : p)
      }
      return out
    }
    return this.everyone().filter((p) => p.map === map)
  }

  everyone(): NetPlayer[] {
    const out: NetPlayer[] = []
    for (const [key, meta] of this.lobbyTable) {
      if (key === this.peer || !cleanPeerId(key)) continue
      const info = parsePresence(meta)
      if (info) out.push(toNetPlayer(key, info))
    }
    if (this.me.map && this.mapCh) {
      const here = new Map(this.players(this.me.map).map((p) => [p.id, p]))
      return out.map((p) => here.get(p.id) ?? p)
    }
    return out
  }

  player(id: string): NetPlayer | null {
    return this.everyone().find((p) => p.id === id) ?? null
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
    const before = this.me
    this.me = applyMePatch(this.me, patch)
    this.syncMap()
    const moved = before.x !== this.me.x || before.y !== this.me.y || before.face !== this.me.face || before.moving !== this.me.moving
    if (moved) this.sendPos(false)
    // Presence carries everything but the live position; re-track on real changes
    // (and when stopping, so newcomers see where we stand).
    const stopped = before.moving && !this.me.moving
    this.track(stopped)
  }

  send<T>(topic: NetTopic, data: T) {
    if (this.me.hidden || !NET_TOPICS.includes(topic)) return
    const ch = MAP_TOPICS.includes(topic) ? this.mapCh : this.lobby
    if (!ch) return
    const ok = ch.push('broadcast', { type: 'broadcast', event: topic, payload: { f: this.peer, d: data } })
    // Our own copy (the server doesn't echo with self: false).
    if (ok) queueMicrotask(() => this.dispatch(topic, { from: this.peer, topic, data, me: true }))
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

  private dispatch(topic: NetTopic, msg: NetMessage<unknown>) {
    for (const fn of [...(this.handlers.get(topic) ?? [])]) {
      try {
        fn(msg)
      } catch (e) {
        console.error(e)
      }
    }
  }

  private onBroadcast(p: unknown, isMap: boolean) {
    if (!p || typeof p !== 'object') return
    const { event, payload } = p as { event?: unknown; payload?: unknown }
    const body = (payload ?? {}) as { f?: unknown; d?: unknown }
    const from = cleanPeerId(body.f)
    if (!from || from === this.peer) return
    if (event === 'pos' && isMap) {
      const d = (body.d ?? {}) as Record<string, unknown>
      const x = cleanCoord(d.x)
      const y = cleanCoord(d.y)
      if (x === null || y === null || !this.mapTable.has(from)) return
      this.pos.set(from, { x, y, face: cleanFace(d.fc), moving: d.mv === 1 })
      this.emitChange()
      return
    }
    const topic = event as NetTopic
    if (!NET_TOPICS.includes(topic) || MAP_TOPICS.includes(topic) !== isMap) return
    this.dispatch(topic, { from, topic, data: body.d, me: false })
  }

  private syncMap() {
    const target = this.me.hidden ? '' : this.me.map
    if (target === this.mapName) return
    this.mapName = target
    this.mapCh?.leave()
    this.mapCh = null
    this.mapTable = new Map()
    this.pos.clear()
    this.lastTrack.map = ''
    if (target) {
      this.mapCh = this.channel(`${this.prefix}-${roomName(target)}`, true)
      this.mapCh.join()
    }
    this.emitChange()
  }

  private sendPos(keepalive: boolean) {
    if (!this.mapCh || this.me.hidden) return
    const now = Date.now()
    const key = `${this.me.x},${this.me.y},${this.me.face},${this.me.moving}`
    if (keepalive) {
      if (now - this.lastPos.at < KEEPALIVE_MS - 500) return
    } else if (key === this.lastPos.key) return
    const gap = now - this.lastPos.at
    if (!keepalive && gap < 1000 / POS_HZ) {
      // Coalesce: send the latest position when the slot opens.
      if (!this.posTimer) this.posTimer = setTimeout(() => ((this.posTimer = null), this.sendPos(false)), 1000 / POS_HZ - gap)
      return
    }
    this.lastPos = { at: now, key }
    this.mapCh.push('broadcast', { type: 'broadcast', event: 'pos', payload: { f: this.peer, d: { x: this.me.x, y: this.me.y, fc: this.me.face, mv: this.me.moving ? 1 : 0 } } })
  }

  private track(force: boolean) {
    const now = Date.now()
    if (!force && now - this.lastTrackAt < TRACK_MIN_MS) {
      if (!this.trackTimer) this.trackTimer = setTimeout(() => ((this.trackTimer = null), this.track(false)), TRACK_MIN_MS - (now - this.lastTrackAt))
      return
    }
    this.lastTrackAt = now
    const me = this.me
    const lobby = me.hidden ? 'hidden' : JSON.stringify({ pid: this.peer, ...lobbyPresence(me) })
    if (lobby !== this.lastTrack.lobby) {
      const sent = me.hidden ? this.lobby.push('presence', { type: 'presence', event: 'untrack' }) : this.lobby.push('presence', { type: 'presence', event: 'track', payload: JSON.parse(lobby) })
      if (sent) this.lastTrack.lobby = lobby
    }
    if (this.mapCh && !me.hidden) {
      // The live position rides on `pos`; presence keeps the last resting spot.
      const state = JSON.stringify({ pid: this.peer, ...mapPresence(me), mv: 0 })
      const cmp = JSON.stringify({ ...mapPresence(me), x: 0, y: 0, mv: 0 })
      if (force || cmp !== this.lastTrack.map) {
        if (this.mapCh.push('presence', { type: 'presence', event: 'track', payload: JSON.parse(state) })) this.lastTrack.map = cmp
      }
    }
  }
}
