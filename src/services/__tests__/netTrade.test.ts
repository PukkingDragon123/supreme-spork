import { describe, expect, it } from 'vitest'
import { TRADE_TIMEOUTS, idleTrade, parseTradeMsg, tradeStep, type TradeInput, type TradeMsg, type TradeState } from '../netTrade'
import type { TradeLine } from '../netValidate'

// A side of the trade with its own bag, wired to the other side through a
// mock transport (a queue we flush by hand, so tests control the timing).
class Side {
  s: TradeState = idleTrade()
  bag: Record<string, number>
  now = 1000
  outbox: TradeMsg[] = []
  log: string[] = []
  cap = true
  constructor(
    readonly id: string,
    bag: Record<string, number>,
  ) {
    this.bag = { ...bag }
  }
  owns = (lines: TradeLine[]) => lines.every((l) => (this.bag[`${l.k}:${l.id}`] ?? 0) >= l.n)
  do(input: TradeInput) {
    const r = tradeStep(this.s, input, { now: this.now, owns: this.owns, canReceive: () => this.cap })
    this.s = r.s
    this.outbox.push(...r.send)
    for (const fx of r.fx) {
      if (fx.kind !== 'escrow' && fx.kind !== 'refund' && fx.kind !== 'receive') continue
      const sign = fx.kind === 'escrow' ? -1 : 1
      this.log.push(fx.kind)
      for (const l of fx.lines) this.bag[`${l.k}:${l.id}`] = (this.bag[`${l.k}:${l.id}`] ?? 0) + sign * l.n
    }
  }
}

/** Deliver every queued message (through the untrusted parser) until both queues are empty. */
function flush(a: Side, b: Side) {
  for (let i = 0; i < 50 && (a.outbox.length || b.outbox.length); i++) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ] as const) {
      const msgs = from.outbox.splice(0)
      for (const m of msgs) {
        const parsed = parseTradeMsg(JSON.parse(JSON.stringify(m)))
        if (parsed && parsed.to === to.id) to.do({ kind: 'recv', from: from.id, msg: parsed })
      }
    }
  }
}

const lotus = (n: number): TradeLine => ({ k: 'item', id: 'lotus', n })
const fruit = (n: number): TradeLine => ({ k: 'item', id: 'fruit', n })

function openTrade() {
  const a = new Side('pa', { 'item:lotus': 4 })
  const b = new Side('pb', { 'item:fruit': 3 })
  a.do({ kind: 'request', peer: 'pb', tid: 'trade0001' })
  flush(a, b)
  expect(b.s.phase).toBe('asked')
  b.do({ kind: 'accept' })
  flush(a, b)
  expect(a.s.phase).toBe('open')
  expect(b.s.phase).toBe('open')
  return { a, b }
}

describe('trade handshake', () => {
  it('offer → counter → both ready → both confirm → swap', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(2)] })
    b.do({ kind: 'offer', lines: [fruit(1)] })
    flush(a, b)
    expect(a.s.theirs).toEqual([fruit(1)])
    expect(b.s.theirs).toEqual([lotus(2)])
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    expect(a.s.theirReady && b.s.theirReady).toBe(true)
    a.do({ kind: 'confirm' })
    expect(a.bag['item:lotus']).toBe(2) // escrowed on confirm
    flush(a, b)
    expect(b.s.theirConfirm).toBe(true)
    b.do({ kind: 'confirm' })
    flush(a, b)
    expect(a.s.phase).toBe('done')
    expect(b.s.phase).toBe('done')
    expect(a.bag).toEqual({ 'item:lotus': 2, 'item:fruit': 1 })
    expect(b.bag).toEqual({ 'item:fruit': 2, 'item:lotus': 2 })
  })

  it('a counter-offer resets readiness on both sides', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(1)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    b.do({ kind: 'offer', lines: [fruit(2)] })
    flush(a, b)
    expect(a.s.myReady || a.s.theirReady || b.s.myReady || b.s.theirReady).toBe(false)
    a.do({ kind: 'confirm' })
    expect(a.s.phase).toBe('open') // can't confirm without both ready
  })

  it('a change after I confirmed voids the deal and refunds my escrow', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(3)] })
    b.do({ kind: 'offer', lines: [fruit(1)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    a.do({ kind: 'confirm' })
    expect(a.bag['item:lotus']).toBe(1)
    // B swaps its offer instead of confirming (A's confirm hasn't arrived yet).
    b.do({ kind: 'offer', lines: [fruit(1), { k: 'item', id: 'rice', n: 1 }] })
    flush(a, b)
    expect(a.s.phase).toBe('open')
    expect(a.bag['item:lotus']).toBe(4)
    expect(a.log).toEqual(['escrow', 'refund'])
    // B's side ignored A's stale confirm.
    expect(b.s.theirConfirm).toBe(false)
  })

  it('cancel refunds escrow and ends the trade for both', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(1)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    a.do({ kind: 'confirm' })
    b.do({ kind: 'cancel' })
    flush(a, b)
    expect(a.s).toMatchObject({ phase: 'closed', reason: 'they_cancelled' })
    expect(b.s).toMatchObject({ phase: 'closed', reason: 'cancelled' })
    expect(a.bag['item:lotus']).toBe(4)
  })

  it('a waiting confirmation times out and refunds', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(2)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    a.do({ kind: 'confirm' })
    a.outbox = [] // B never hears it
    a.now += TRADE_TIMEOUTS.confirmed + 1
    a.do({ kind: 'tick' })
    expect(a.s).toMatchObject({ phase: 'closed', reason: 'timeout' })
    expect(a.bag['item:lotus']).toBe(4)
  })

  it('a request nobody answers times out', () => {
    const a = new Side('pa', {})
    a.do({ kind: 'request', peer: 'pb', tid: 'trade0002' })
    a.now += TRADE_TIMEOUTS.asking + 1
    a.do({ kind: 'tick' })
    expect(a.s).toMatchObject({ phase: 'closed', reason: 'timeout' })
  })

  it('refuses to confirm items I no longer own, or past my daily cap', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(4)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    a.bag['item:lotus'] = 1 // used some meanwhile
    a.do({ kind: 'confirm' })
    flush(a, b)
    expect(a.s).toMatchObject({ phase: 'closed', reason: 'not_owned' })
    expect(b.s).toMatchObject({ phase: 'closed', reason: 'they_cancelled' })
    expect(a.bag['item:lotus']).toBe(1)

    const t = openTrade()
    t.b.cap = false
    t.a.do({ kind: 'offer', lines: [lotus(1)] })
    flush(t.a, t.b)
    t.a.do({ kind: 'ready', on: true })
    t.b.do({ kind: 'ready', on: true })
    flush(t.a, t.b)
    t.b.do({ kind: 'confirm' })
    expect(t.b.s).toMatchObject({ phase: 'closed', reason: 'cap' })
  })
})

describe('misbehaving peers', () => {
  it('only the partner can move the trade; strangers are ignored', () => {
    const { a } = openTrade()
    a.do({ kind: 'recv', from: 'mallory', msg: { t: 'offer', tid: 'trade0001', to: 'pa', rev: 9, lines: [fruit(20)] } })
    a.do({ kind: 'recv', from: 'mallory', msg: { t: 'cancel', tid: 'trade0001', to: 'pa' } })
    expect(a.s.phase).toBe('open')
    expect(a.s.theirs).toEqual([])
  })

  it('messages for another trade id are ignored', () => {
    const { a } = openTrade()
    a.do({ kind: 'recv', from: 'pb', msg: { t: 'offer', tid: 'othertrade', to: 'pa', rev: 1, lines: [fruit(1)] } })
    expect(a.s.theirs).toEqual([])
  })

  it('a confirm naming stale revisions does nothing', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(1)] })
    b.do({ kind: 'offer', lines: [fruit(1)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    a.do({ kind: 'confirm' })
    a.outbox = []
    // B claims to confirm A's revision 0 (the empty offer), not what A offered.
    a.do({ kind: 'recv', from: 'pb', msg: { t: 'confirm', tid: 'trade0001', to: 'pa', rev: 1, seen: 0 } })
    expect(a.s.phase).toBe('confirmed')
    expect(a.log).toEqual(['escrow'])
  })

  it('only what the other side committed is added, even if they cheat afterwards', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(1)] })
    b.do({ kind: 'offer', lines: [fruit(1)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    b.do({ kind: 'confirm' })
    flush(a, b)
    a.do({ kind: 'confirm' })
    flush(a, b)
    expect(a.bag['item:fruit']).toBe(1)
    // Late junk after the trade is done changes nothing.
    a.do({ kind: 'recv', from: 'pb', msg: { t: 'offer', tid: 'trade0001', to: 'pa', rev: 5, lines: [fruit(20)] } })
    a.do({ kind: 'recv', from: 'pb', msg: { t: 'confirm', tid: 'trade0001', to: 'pa', rev: 5, seen: 1 } })
    expect(a.bag['item:fruit']).toBe(1)
    expect(a.log.filter((x) => x === 'receive')).toHaveLength(1)
  })

  it('a second request while busy gets a polite "busy"', () => {
    const { a } = openTrade()
    a.do({ kind: 'recv', from: 'pc', msg: { t: 'req', tid: 'trade0003', to: 'pa' } })
    expect(a.s.peer).toBe('pb')
    expect(a.outbox.at(-1)).toMatchObject({ t: 'decline', to: 'pc', why: 'busy' })
  })

  it('rejects malformed trade payloads', () => {
    expect(parseTradeMsg({ t: 'offer', tid: 'trade0001', to: 'pa', rev: 1, lines: [{ k: 'item', id: 'lotus', n: 999 }] })).toMatchObject({ lines: [{ n: 20 }] })
    expect(parseTradeMsg({ t: 'offer', tid: 'trade0001', to: 'pa', rev: -1, lines: [] })).toBeNull()
    expect(parseTradeMsg({ t: 'offer', tid: 'trade0001', to: 'pa', rev: 1, lines: [{ k: 'item', id: '__proto__', n: 1 }] })).toBeNull()
    expect(parseTradeMsg({ t: 'hack', tid: 'trade0001', to: 'pa' })).toBeNull()
    expect(parseTradeMsg({ t: 'req', tid: 'x', to: 'pa' })).toBeNull()
    expect(parseTradeMsg(null)).toBeNull()
  })

  it('the partner leaving mid-trade refunds and closes', () => {
    const { a, b } = openTrade()
    a.do({ kind: 'offer', lines: [lotus(2)] })
    flush(a, b)
    a.do({ kind: 'ready', on: true })
    b.do({ kind: 'ready', on: true })
    flush(a, b)
    a.do({ kind: 'confirm' })
    a.do({ kind: 'gone', peer: 'pb' })
    expect(a.s).toMatchObject({ phase: 'closed', reason: 'gone' })
    expect(a.bag['item:lotus']).toBe(4)
  })
})
