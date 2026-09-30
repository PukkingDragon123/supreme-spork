import { afterEach, describe, expect, it, vi } from 'vitest'
import { RoomNet } from '../netRoom'
import { net, netTransport, setNet, type NetMessage } from '../net'
import { MockHub, tick } from './mockRoom'
import { DEFAULT_LOOK } from '../../art/avatar'

afterEach(() => {
  setNet()
  vi.useRealTimers()
})

async function pair(hub = new MockHub()) {
  const a = hub.connect({ name: 'Mali A' })
  const b = hub.connect({ name: 'Guest B', guest: true })
  const na = new RoomNet(a.room, a.user)
  const nb = new RoomNet(b.room, b.user)
  na.setMe({ name: 'มะปราง', level: 5, map: 'wat', x: 100, y: 200, face: 'down', look: { ...DEFAULT_LOOK, hair: 'hair_twin' } })
  nb.setMe({ name: 'ต้นกล้า', level: 2, map: 'wat', x: 140, y: 210, face: 'left' })
  await tick(250)
  return { hub, a, b, na, nb }
}

describe('RoomNet (artifact room transport)', () => {
  it('two players on one map see each other with look, position and host-vouched names', async () => {
    const { na, nb, b } = await pair()
    expect(na.online()).toBe(true)
    const seen = na.players('wat')
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ id: b.peer, name: 'ต้นกล้า', level: 2, x: 140, y: 210, face: 'left', guest: true, accountName: 'Guest B' })
    expect(nb.players('wat')[0]).toMatchObject({ name: 'มะปราง', look: { hair: 'hair_twin' } })
    expect(na.everyone()).toHaveLength(1)
    expect(na.selfId()).not.toBe(b.peer)
  })

  it('joins one named room per map and leaves the old one', async () => {
    const { hub, na, nb } = await pair()
    expect(hub.space('map-wat').members.size).toBe(2)
    na.setMe({ map: 'wat:ubosot', x: 50, y: 60 })
    await tick(250)
    expect(hub.space('map-wat').members.size).toBe(1)
    expect(hub.space('map-wat.ubosot').members.size).toBe(1)
    // The lobby still knows where everyone is, so the online list works.
    expect(nb.players('wat')).toHaveLength(0)
    expect(nb.everyone()[0]).toMatchObject({ name: 'มะปราง', map: 'wat:ubosot' })
    // Lobby presence stays small: no look or position there.
    const lobby = hub.space('').presence.get(na.selfId()!)!
    expect(Object.keys(lobby).sort()).toEqual(['fc', 'lv', 'm', 'n', 'v'].filter((k) => k in lobby).sort())
    expect(lobby.x).toBeUndefined()
  })

  it('map topics stay on the map, addressed topics reach everyone', async () => {
    const { na, nb } = await pair()
    const chats: NetMessage<unknown>[] = []
    const gifts: NetMessage<unknown>[] = []
    nb.on('chat', (m) => chats.push(m))
    nb.on('gift', (m) => gifts.push(m))
    na.send('chat', { text: 'สวัสดี' })
    await tick()
    expect(chats).toHaveLength(1)
    expect(chats[0]).toMatchObject({ from: na.selfId(), me: false, data: { text: 'สวัสดี' } })
    nb.setMe({ map: 'river' })
    await tick(250)
    na.send('chat', { text: 'ยังอยู่ไหม' })
    na.send('gift', { t: 'offer', to: nb.selfId() })
    await tick()
    expect(chats).toHaveLength(1)
    expect(gifts).toHaveLength(1)
  })

  it('hands our own echo back as me:true', async () => {
    const { na } = await pair()
    const got: NetMessage<unknown>[] = []
    na.on('emote', (m) => got.push(m))
    na.send('emote', { e: 'wai' })
    await tick()
    expect(got).toEqual([{ from: na.selfId(), topic: 'emote', data: { e: 'wai' }, me: true }])
  })

  it('handles not_permitted topics gracefully (reported, not retried)', async () => {
    const hub = new MockHub()
    hub.deniedTopics.add('chat')
    const { na } = await pair(hub)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    na.send('chat', { text: 'x' })
    await tick()
    expect(na.denied()).toEqual(['chat'])
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('falls back to the lobby when named rooms are not allowed', async () => {
    const hub = new MockHub()
    hub.noRooms = true
    const { na, nb } = await pair(hub)
    expect(na.players('wat')).toHaveLength(1)
    expect(na.players('wat')[0]).toMatchObject({ name: 'ต้นกล้า', x: 140 })
    const chats: unknown[] = []
    nb.on('chat', (m) => chats.push(m.data))
    na.send('chat', { text: 'hi' })
    await tick()
    expect(chats).toEqual([{ text: 'hi' }])
  })

  it('players stuck in the lobby still show up for players in map rooms', async () => {
    const { hub, na } = await pair()
    hub.noRooms = true
    const c = hub.connect({ name: 'Lobby C' })
    const nc = new RoomNet(c.room, c.user)
    nc.setMe({ name: 'ซี', level: 1, map: 'wat', x: 70, y: 80 })
    await tick(250)
    expect(nc.roomMode()).toBe('lobby')
    expect(na.players('wat').map((p) => p.name).sort()).toEqual(['ซี', 'ต้นกล้า'])
    expect(na.players('wat').find((p) => p.name === 'ซี')).toMatchObject({ x: 70, y: 80 })
  })

  it('sanitizes hostile presence and ignores agent peers', async () => {
    const { hub, na } = await pair()
    const evil = hub.connect({ name: 'Evil' })
    hub.space('map-wat').members.add(evil.peer)
    hub.space('').members.add(evil.peer)
    hub.forcePresence('map-wat', evil.peer, { n: '<b>บอส</b>‮', m: 'wat', lv: 1e6, x: 9e9, y: -3, f: 'up', lk: { top: 'hack', hair: 'hair_short' }, d: 'x'.repeat(500) })
    hub.forcePresence('', evil.peer, { n: 'evil', m: 'wat' })
    const bot = hub.connect({ name: 'Bot', kind: 'agent' })
    hub.forcePresence('', bot.peer, { n: 'bot', m: 'wat' })
    hub.space('').members.add(bot.peer)
    await tick(20)
    const p = na.players('wat').find((x) => x.id === evil.peer)!
    expect(p.name).toBe('<b>บอส</b>')
    expect(p.level).toBe(999)
    expect(p.x).toBe(4096)
    expect(p.y).toBe(0)
    expect(p.look.top).toBe(DEFAULT_LOOK.top)
    expect(p.look.hair).toBe('hair_short')
    expect(p.doing!.length).toBeLessThanOrEqual(32)
    expect(na.everyone().some((x) => x.id === bot.peer)).toBe(false)
  })

  it('hidden players publish nothing and leave the map room', async () => {
    const { hub, na, nb } = await pair()
    na.setMe({ hidden: true } as never)
    await tick(250)
    expect(nb.players('wat')).toHaveLength(0)
    expect(nb.everyone()).toHaveLength(0)
    expect(hub.space('map-wat').members.has(na.selfId()!)).toBe(false)
  })
})

describe('net facade', () => {
  it('keeps listeners registered before a transport arrives', async () => {
    const hub = new MockHub()
    const got: unknown[] = []
    const off = net.on('ping', (m) => got.push(m.data))
    let changes = 0
    const offC = net.onChange(() => changes++)
    expect(net.kind()).toBe('offline')
    const a = hub.connect({ name: 'A' })
    const b = hub.connect({ name: 'B' })
    const na = new RoomNet(a.room, a.user)
    const nb = new RoomNet(b.room, b.user)
    setNet(na)
    expect(netTransport()).toBe(na)
    expect(net.kind()).toBe('room')
    na.setMe({ name: 'A', map: 'wat', x: 1, y: 1 })
    nb.setMe({ name: 'B', map: 'wat', x: 2, y: 2 })
    await tick(250)
    nb.send('ping', { to: na.selfId(), w: 'wave' })
    await tick()
    expect(got).toEqual([{ to: na.selfId(), w: 'wave' }])
    expect(changes).toBeGreaterThan(0)
    expect(net.players('wat')).toHaveLength(1)
    off()
    offC()
    nb.send('ping', { to: na.selfId() })
    await tick()
    expect(got).toHaveLength(1)
  })
})
