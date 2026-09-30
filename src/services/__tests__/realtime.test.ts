import { describe, expect, it } from 'vitest'
import { PhoenixSocket, applyPresenceJoins, applyPresenceLeaves, presenceFromState, type PhxFrame } from '../realtime'
import { RealtimeNet } from '../realtimeNet'
import type { NetMessage } from '../net'
import { tick } from './mockRoom'

// A tiny fake of Supabase Realtime's websocket protocol (vsn 1.0.0 frames).
class FakeServer {
  sockets = new Set<FakeWs>()
  channels = new Map<string, Map<FakeWs, { key: string; meta: Record<string, unknown> | null }>>()
  frames: PhxFrame[] = []
  ref = 0

  send(ws: FakeWs, f: PhxFrame) {
    queueMicrotask(() => ws.readyState === 1 && ws.onmessage?.({ data: JSON.stringify(f) }))
  }

  handle(ws: FakeWs, f: PhxFrame) {
    this.frames.push(f)
    if (f.topic === 'phoenix') return this.send(ws, { topic: 'phoenix', event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: f.ref })
    let ch = this.channels.get(f.topic)
    if (!ch) this.channels.set(f.topic, (ch = new Map()))
    const members = ch
    const p = f.payload as Record<string, any>
    if (f.event === 'phx_join') {
      members.set(ws, { key: p.config.presence.key, meta: null })
      this.send(ws, { topic: f.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: f.ref, join_ref: f.join_ref })
      const state: Record<string, { metas: unknown[] }> = {}
      for (const m of members.values()) if (m.meta) state[m.key] = { metas: [m.meta] }
      this.send(ws, { topic: f.topic, event: 'presence_state', payload: state, ref: null })
    } else if (f.event === 'presence') {
      const me = members.get(ws)!
      const old = me.meta
      me.meta = p.event === 'track' ? { ...p.payload, phx_ref: `r${++this.ref}` } : null
      const diff = { joins: me.meta ? { [me.key]: { metas: [me.meta] } } : {}, leaves: old ? { [me.key]: { metas: [old] } } : {} }
      for (const other of members.keys()) this.send(other, { topic: f.topic, event: 'presence_diff', payload: diff, ref: null })
    } else if (f.event === 'broadcast') {
      for (const other of members.keys()) if (other !== ws) this.send(other, { topic: f.topic, event: 'broadcast', payload: f.payload, ref: null })
    } else if (f.event === 'phx_leave') {
      const me = members.get(ws)
      members.delete(ws)
      if (me?.meta) for (const other of members.keys()) this.send(other, { topic: f.topic, event: 'presence_diff', payload: { joins: {}, leaves: { [me.key]: { metas: [me.meta] } } }, ref: null })
    }
  }
}

class FakeWs {
  static server = new FakeServer()
  readyState = 0
  onopen: ((ev: unknown) => void) | null = null
  onclose: ((ev: unknown) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  onmessage: ((ev: { data: unknown }) => void) | null = null
  constructor(readonly url: string) {
    FakeWs.server.sockets.add(this)
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.({})
    }, 1)
  }
  send(data: string) {
    FakeWs.server.handle(this, JSON.parse(data))
  }
  close() {
    this.readyState = 3
    this.onclose?.({})
  }
}

describe('Phoenix presence helpers', () => {
  it('tracks the latest meta per key and only drops the one that left', () => {
    const t = presenceFromState({ a: { metas: [{ phx_ref: '1', n: 'A' }] }, b: { metas: [] } })
    expect([...t.keys()]).toEqual(['a'])
    // A re-track arrives as join(new) + leave(old): keep the new one.
    applyPresenceJoins(t, { a: { metas: [{ phx_ref: '2', n: 'A2' }] } })
    applyPresenceLeaves(t, { a: { metas: [{ phx_ref: '1' }] } })
    expect(t.get('a')).toMatchObject({ n: 'A2' })
    applyPresenceLeaves(t, { a: { metas: [{ phx_ref: '2' }] } })
    expect(t.has('a')).toBe(false)
    applyPresenceJoins(t, 'junk')
    applyPresenceLeaves(t, null)
  })
})

describe('PhoenixSocket', () => {
  it('builds the websocket url, joins channels and answers heartbeats', async () => {
    FakeWs.server = new FakeServer()
    const sock = new PhoenixSocket('wss://x.supabase.co/realtime/v1/websocket', { apikey: 'anon', vsn: '1.0.0' }, FakeWs, 20)
    expect(sock.url).toBe('wss://x.supabase.co/realtime/v1/websocket?apikey=anon&vsn=1.0.0')
    const ch = sock.channel('realtime:test', () => ({ config: { presence: { key: 'k1' } } }))
    const joined: boolean[] = []
    ch.onJoin((ok) => joined.push(ok))
    ch.join()
    sock.connect()
    await tick(60)
    expect(joined).toEqual([true])
    expect(ch.state).toBe('joined')
    expect(FakeWs.server.frames.some((f) => f.topic === 'phoenix' && f.event === 'heartbeat')).toBe(true)
    expect(ch.push('broadcast', { type: 'broadcast', event: 'x', payload: {} })).toBe(true)
    sock.disconnect()
    expect(ch.push('broadcast', {})).toBe(false)
  })
})

describe('RealtimeNet (Supabase Realtime transport)', () => {
  async function pair() {
    FakeWs.server = new FakeServer()
    const a = new RealtimeNet({ url: 'https://demo.supabase.co', anonKey: 'anon', WebSocket: FakeWs })
    const b = new RealtimeNet({ url: 'https://demo.supabase.co', anonKey: 'anon', WebSocket: FakeWs })
    a.setMe({ name: 'มะปราง', level: 4, map: 'wat', x: 10, y: 20, face: 'down' })
    b.setMe({ name: 'ต้นกล้า', level: 2, map: 'wat', x: 30, y: 40, face: 'up' })
    await tick(80)
    return { a, b }
  }

  it('shares presence per map channel and the lobby', async () => {
    const { a, b } = await pair()
    expect(a.online()).toBe(true)
    expect(a.players('wat')).toEqual([expect.objectContaining({ id: b.selfId(), name: 'ต้นกล้า', x: 30, y: 40, face: 'up' })])
    expect(b.everyone()).toEqual([expect.objectContaining({ id: a.selfId(), name: 'มะปราง', map: 'wat' })])
    const topics = [...FakeWs.server.channels.keys()].sort()
    expect(topics).toEqual(['realtime:boondee-lobby', 'realtime:boondee-map-wat'])
    a.close()
    b.close()
  })

  it('streams positions at a capped rate and delivers chat to the same map only', async () => {
    const { a, b } = await pair()
    for (let i = 1; i <= 10; i++) a.setMe({ x: 10 + i, moving: true })
    await tick(200)
    const pos = FakeWs.server.frames.filter((f) => (f.payload as { event?: string })?.event === 'pos')
    expect(pos.length).toBeGreaterThan(0)
    expect(pos.length).toBeLessThanOrEqual(3)
    expect(b.players('wat')[0]).toMatchObject({ x: 20, moving: true })

    const got: NetMessage<unknown>[] = []
    b.on('chat', (m) => got.push(m))
    const mine: NetMessage<unknown>[] = []
    a.on('chat', (m) => mine.push(m))
    a.send('chat', { text: 'สาธุ' })
    await tick(10)
    expect(got).toEqual([{ from: a.selfId(), topic: 'chat', data: { text: 'สาธุ' }, me: false }])
    expect(mine[0]).toMatchObject({ me: true })
    b.setMe({ map: 'river' })
    await tick(40)
    a.send('chat', { text: 'ยังอยู่ไหม' })
    await tick(10)
    expect(got).toHaveLength(1)
    expect(a.players('wat')).toHaveLength(0)
    a.close()
    b.close()
  })

  it('ignores spoofed or malformed broadcasts', async () => {
    const { a, b } = await pair()
    const got: unknown[] = []
    b.on('chat', (m) => got.push(m))
    const ws = [...FakeWs.server.sockets][0]
    const send = (payload: unknown) => FakeWs.server.handle(ws, { topic: 'realtime:boondee-map-wat', event: 'broadcast', payload, ref: '99' })
    send({ type: 'broadcast', event: 'chat', payload: { f: 'bad id!', d: { text: 'x' } } })
    send({ type: 'broadcast', event: 'nope', payload: { f: 'p123', d: {} } })
    send({ type: 'broadcast', event: 'gift', payload: { f: 'p123', d: {} } }) // addressed topics only travel in the lobby
    send({ type: 'broadcast', event: 'pos', payload: { f: 'stranger', d: { x: 1, y: 1 } } })
    await tick(10)
    expect(got).toEqual([])
    expect(b.players('wat').some((p) => p.id === 'stranger')).toBe(false)
    a.close()
    b.close()
  })
})
