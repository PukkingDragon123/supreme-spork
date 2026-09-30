// A tiny Phoenix-channels client for Supabase Realtime (websocket, JSON
// "vsn 1.0.0" frames), just enough for presence and broadcast: no SDK, a few
// KB in the single-file build.
//
//   const sock = new PhoenixSocket(`${wsUrl}/realtime/v1/websocket`, { apikey, vsn: '1.0.0' })
//   const ch = sock.channel('realtime:boondee-lobby', () => ({ config: {...}, access_token }))
//   ch.on('broadcast', (payload) => …); ch.join(); ch.push('broadcast', {...})
//
// Reconnects with backoff and rejoins every channel after a drop.

export interface PhxFrame {
  topic: string
  event: string
  payload: unknown
  ref: string | null
  join_ref?: string | null
}

type WsLike = {
  readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((ev: unknown) => void) | null
  onclose: ((ev: unknown) => void) | null
  onerror: ((ev: unknown) => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
}
export type WsCtor = new (url: string) => WsLike

const OPEN = 1

export class PhoenixSocket {
  private ws: WsLike | null = null
  private refN = 0
  private channels = new Set<PhxChannel>()
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private pendingHeartbeat: string | null = null
  private retry = 0
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private closedByUser = false
  private stateFns = new Set<(open: boolean) => void>()
  readonly url: string

  constructor(
    endpoint: string,
    params: Record<string, string>,
    private readonly Ws: WsCtor | undefined = (globalThis as unknown as { WebSocket?: WsCtor }).WebSocket,
    private readonly heartbeatMs = 25_000,
  ) {
    const q = new URLSearchParams(params).toString()
    this.url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${q}`
  }

  isOpen() {
    return this.ws?.readyState === OPEN
  }

  onState(fn: (open: boolean) => void) {
    this.stateFns.add(fn)
    return () => void this.stateFns.delete(fn)
  }

  nextRef(): string {
    this.refN = (this.refN + 1) % 1e9
    return String(this.refN)
  }

  connect() {
    if (!this.Ws || this.ws) return
    this.closedByUser = false
    let ws: WsLike
    try {
      ws = new this.Ws(this.url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      this.retry = 0
      this.startHeartbeat()
      for (const fn of this.stateFns) fn(true)
      for (const ch of this.channels) ch.rejoin()
    }
    ws.onmessage = (ev) => this.onMessage(ev.data)
    ws.onerror = () => undefined
    ws.onclose = () => {
      if (this.ws !== ws) return
      this.ws = null
      this.stopHeartbeat()
      for (const ch of this.channels) ch.socketClosed()
      for (const fn of this.stateFns) fn(false)
      if (!this.closedByUser) this.scheduleReconnect()
    }
  }

  disconnect() {
    this.closedByUser = true
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = null
    this.stopHeartbeat()
    const ws = this.ws
    this.ws = null
    try {
      ws?.close(1000, 'bye')
    } catch {
      /* ignore */
    }
    for (const ch of this.channels) ch.socketClosed()
    for (const fn of this.stateFns) fn(false)
  }

  channel(topic: string, joinPayload: () => unknown): PhxChannel {
    const ch = new PhxChannel(this, topic, joinPayload)
    this.channels.add(ch)
    return ch
  }

  /** @internal */
  forget(ch: PhxChannel) {
    this.channels.delete(ch)
  }

  /** @internal Send a frame (dropped while disconnected). */
  send(frame: PhxFrame): boolean {
    if (!this.ws || this.ws.readyState !== OPEN) return false
    try {
      this.ws.send(JSON.stringify(frame))
      return true
    } catch {
      return false
    }
  }

  private scheduleReconnect() {
    if (this.retryTimer || this.closedByUser) return
    const wait = [1000, 2000, 5000, 10_000, 20_000][Math.min(this.retry, 4)]
    this.retry++
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, wait)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeat = setInterval(() => {
      if (this.pendingHeartbeat) {
        // No reply to the last one: the connection is dead, start over.
        this.pendingHeartbeat = null
        try {
          this.ws?.close(4000, 'heartbeat timeout')
        } catch {
          /* ignore */
        }
        return
      }
      const ref = this.nextRef()
      this.pendingHeartbeat = ref
      this.send({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref })
    }, this.heartbeatMs)
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = null
    this.pendingHeartbeat = null
  }

  private onMessage(raw: unknown) {
    if (typeof raw !== 'string' || raw.length > 256_000) return
    let f: PhxFrame
    try {
      f = JSON.parse(raw)
    } catch {
      return
    }
    if (!f || typeof f !== 'object' || typeof f.topic !== 'string' || typeof f.event !== 'string') return
    if (f.topic === 'phoenix') {
      if (f.ref && f.ref === this.pendingHeartbeat) this.pendingHeartbeat = null
      return
    }
    for (const ch of this.channels) if (ch.topic === f.topic) ch.handle(f)
  }
}

export type ChannelState = 'closed' | 'joining' | 'joined' | 'errored' | 'leaving'

export class PhxChannel {
  state: ChannelState = 'closed'
  private joinRef: string | null = null
  private handlers = new Map<string, Set<(payload: unknown) => void>>()
  private wantJoined = false
  private joinFns = new Set<(ok: boolean, reply: unknown) => void>()
  private rejoinTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private readonly socket: PhoenixSocket,
    readonly topic: string,
    private readonly joinPayload: () => unknown,
  ) {}

  on(event: string, fn: (payload: unknown) => void) {
    let set = this.handlers.get(event)
    if (!set) this.handlers.set(event, (set = new Set()))
    set.add(fn)
    return () => void set.delete(fn)
  }

  /** Called with the result of every (re)join. */
  onJoin(fn: (ok: boolean, reply: unknown) => void) {
    this.joinFns.add(fn)
    return () => void this.joinFns.delete(fn)
  }

  join() {
    this.wantJoined = true
    this.rejoin()
  }

  leave() {
    this.wantJoined = false
    if (this.rejoinTimer) clearTimeout(this.rejoinTimer)
    if (this.state === 'joined' || this.state === 'joining') this.socket.send({ topic: this.topic, event: 'phx_leave', payload: {}, ref: this.socket.nextRef(), join_ref: this.joinRef })
    this.state = 'closed'
    this.socket.forget(this)
  }

  push(event: string, payload: unknown): boolean {
    if (this.state !== 'joined') return false
    return this.socket.send({ topic: this.topic, event, payload, ref: this.socket.nextRef(), join_ref: this.joinRef })
  }

  /** @internal */
  rejoin() {
    if (!this.wantJoined || !this.socket.isOpen() || this.state === 'joining' || this.state === 'joined') return
    this.state = 'joining'
    this.joinRef = this.socket.nextRef()
    this.socket.send({ topic: this.topic, event: 'phx_join', payload: this.joinPayload(), ref: this.joinRef, join_ref: this.joinRef })
  }

  /** @internal */
  socketClosed() {
    if (this.state !== 'closed') this.state = 'errored'
  }

  /** @internal */
  handle(f: PhxFrame) {
    if (f.event === 'phx_reply' && f.ref === this.joinRef && this.state === 'joining') {
      const p = f.payload as { status?: string; response?: unknown } | null
      const ok = p?.status === 'ok'
      this.state = ok ? 'joined' : 'errored'
      for (const fn of this.joinFns) fn(ok, p?.response)
      if (!ok) this.retryLater()
      return
    }
    if (f.join_ref && this.joinRef && f.join_ref !== this.joinRef && f.event.startsWith('phx_')) return
    if (f.event === 'phx_error' || f.event === 'phx_close') {
      if (this.state !== 'closed') this.state = 'errored'
      if (this.wantJoined) this.retryLater()
      return
    }
    for (const fn of this.handlers.get(f.event) ?? []) {
      try {
        fn(f.payload)
      } catch (e) {
        console.error(e)
      }
    }
  }

  private retryLater() {
    if (this.rejoinTimer || !this.wantJoined) return
    this.rejoinTimer = setTimeout(() => {
      this.rejoinTimer = null
      if (this.state === 'errored') this.state = 'closed'
      this.rejoin()
    }, 3000)
  }
}

// ---------------------------------------------------------------------------
// Phoenix presence (the shape Supabase Realtime sends).

export type PresenceMetas = Record<string, { metas?: unknown[] }>

/** Latest meta per presence key, from a `presence_state` payload. */
export function presenceFromState(state: unknown): Map<string, Record<string, unknown>> {
  const out = new Map<string, Record<string, unknown>>()
  applyPresenceJoins(out, state)
  return out
}

export function applyPresenceJoins(table: Map<string, Record<string, unknown>>, joins: unknown) {
  if (!joins || typeof joins !== 'object') return
  for (const [key, v] of Object.entries(joins as PresenceMetas)) {
    const metas = Array.isArray(v?.metas) ? v.metas : []
    const last = metas[metas.length - 1]
    if (last && typeof last === 'object') table.set(key, last as Record<string, unknown>)
  }
}

export function applyPresenceLeaves(table: Map<string, Record<string, unknown>>, leaves: unknown) {
  if (!leaves || typeof leaves !== 'object') return
  for (const [key, v] of Object.entries(leaves as PresenceMetas)) {
    const cur = table.get(key)
    const gone = Array.isArray(v?.metas) ? v.metas : []
    // Only drop the key when the meta that left is the one we hold.
    if (!cur || !gone.length || gone.some((m) => m && typeof m === 'object' && (m as { phx_ref?: unknown }).phx_ref === cur.phx_ref)) table.delete(key)
  }
}
