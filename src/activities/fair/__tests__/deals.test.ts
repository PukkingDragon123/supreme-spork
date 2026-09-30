import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { game, defaultState } from '../../../game/state'
import { ensureDaily } from '../../../game/actions'
import { normalizeHubs } from '../../../game/hubState'
import { FAIR_GAME_IDS, FAIR_PLAY_COST, FAIR_PRIZE_BY_ID } from '../../../game/hubs'
import { COLLECTIBLE_BY_ID } from '../../../game/data/collectibles'
import { BONUS_AT, BONUS_TICKETS, bonusFor, buyDeal, dealsFor, isHappyHour, nextQuote, passesOf, payRound, quoteFor } from '../deals'
import { RIDE_IDS, rideCost, startRide } from '../rides'
import { gameBooth, rideBooth, VENDORS } from '../vendors'

const NOON = new Date(2026, 8, 30, 12, 0)
const HAPPY = new Date(2026, 8, 30, 20, 30)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOON)
  game.value = { ...defaultState(), onboarded: true }
  ensureDaily()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('fair prices (pure)', () => {
  it('knows happy hour', () => {
    expect(isHappyHour(NOON)).toBe(false)
    expect(isHappyHour(HAPPY)).toBe(true)
    expect(isHappyHour(new Date(2026, 8, 30, 21, 0))).toBe(false)
  })

  it('quotes free first round, then prepaid, happy hour, full price', () => {
    expect(quoteFor(10, 0, 0, NOON)).toEqual({ cost: 0, via: 'free', normal: 10 })
    expect(quoteFor(10, 0, 3, NOON).via).toBe('free')
    expect(quoteFor(10, 2, 3, NOON)).toEqual({ cost: 0, via: 'pass', normal: 10 })
    expect(quoteFor(10, 2, 0, HAPPY)).toEqual({ cost: 5, via: 'happy', normal: 10 })
    expect(quoteFor(15, 2, 0, HAPPY).cost).toBe(8)
    expect(quoteFor(10, 2, 0, NOON)).toEqual({ cost: 10, via: 'full', normal: 10 })
    expect(quoteFor(0, 5, 0, NOON).cost).toBe(0)
  })

  it('bundles are cheaper than paying round by round', () => {
    expect(dealsFor('darts', 10).map((d) => [d.rounds, d.price, d.normal])).toEqual([
      [3, 25, 30],
      [5, 40, 50],
    ])
    for (const base of [10, 15, 20]) for (const d of dealsFor('x', base)) expect(d.price).toBeLessThan(d.normal)
    expect(dealsFor('ride:likay', 0)).toEqual([])
  })

  it('gives bonus tickets on the 5th round only', () => {
    expect([1, 2, 3, 4, 5, 6, 10].map(bonusFor)).toEqual([0, 0, 0, 0, BONUS_TICKETS, 0, 0])
  })
})

describe('fair deals in the economy', () => {
  it('a bundle is paid once and then covers that many rounds', () => {
    game.value = { ...game.value, coins: 100 }
    expect(payRound('darts', FAIR_PLAY_COST).via).toBe('free')
    expect(buyDeal('darts', FAIR_PLAY_COST, 'darts:x3')).toBe(true)
    expect(game.value.coins).toBe(75)
    expect(passesOf('darts')).toBe(3)
    for (let i = 0; i < 3; i++) {
      const p = payRound('darts', FAIR_PLAY_COST)
      expect(p).toMatchObject({ ok: true, via: 'pass', cost: 0 })
    }
    expect(game.value.coins).toBe(75)
    expect(passesOf('darts')).toBe(0)
    // Back to full price; passes are per booth.
    expect(nextQuote('darts', FAIR_PLAY_COST)).toMatchObject({ cost: 10, via: 'full' })
    expect(passesOf('rings')).toBe(0)
  })

  it('refuses a deal you cannot afford and unknown deals', () => {
    game.value = { ...game.value, coins: 20 }
    expect(buyDeal('darts', FAIR_PLAY_COST, 'darts:x3')).toBe(false)
    expect(buyDeal('darts', FAIR_PLAY_COST, 'darts:x99')).toBe(false)
    expect(game.value.coins).toBe(20)
    expect(passesOf('darts')).toBe(0)
  })

  it('happy hour halves the price', () => {
    game.value = { ...game.value, coins: 100 }
    payRound('cork', FAIR_PLAY_COST)
    vi.setSystemTime(HAPPY)
    expect(payRound('cork', FAIR_PLAY_COST)).toMatchObject({ ok: true, via: 'happy', cost: 5 })
    expect(game.value.coins).toBe(95)
  })

  it('the 5th round of the day adds prize tickets', () => {
    game.value = { ...game.value, coins: 100 }
    const t0 = game.value.hubs.tickets
    let bonus = 0
    for (let i = 0; i < BONUS_AT + 1; i++) bonus += payRound('rings', FAIR_PLAY_COST).bonus
    expect(bonus).toBe(BONUS_TICKETS)
    expect(game.value.hubs.tickets).toBe(t0 + BONUS_TICKETS)
    expect(game.value.coins).toBe(100 - BONUS_AT * FAIR_PLAY_COST)
  })

  it('rides use the same deals', () => {
    game.value = { ...game.value, coins: 100 }
    expect(startRide('wheel')).toBe(true)
    expect(rideCost('wheel')).toBe(20)
    expect(buyDeal('ride:wheel', 20, 'ride:wheel:x3')).toBe(true)
    expect(game.value.coins).toBe(50)
    expect(rideCost('wheel')).toBe(0)
    expect(startRide('wheel')).toBe(true)
    expect(passesOf('ride:wheel')).toBe(2)
    expect(game.value.coins).toBe(50)
  })

  it('passes survive a save round trip and junk is dropped', () => {
    expect(normalizeHubs({ passes: { darts: 3, rings: 'x', cork: -2, bumper: 500.7 } }).passes).toEqual({ darts: 3, cork: 0, bumper: 99 })
    expect(normalizeHubs({}).passes).toEqual({})
  })
})

describe('fair vendors', () => {
  it('every booth and ride has a vendor with lines and valid prizes', () => {
    const booths = [...FAIR_GAME_IDS.map(gameBooth), ...RIDE_IDS.map(rideBooth)]
    for (const b of booths) {
      expect(b.vendor, b.key).toBeTruthy()
      expect(b.vendor.lines.length).toBeGreaterThan(0)
      expect(b.vendor.what.length).toBeGreaterThan(10)
      for (const id of b.vendor.prizes) expect(FAIR_PRIZE_BY_ID[id], id).toBeTruthy()
      for (const s of b.vendor.souvenirs) expect(COLLECTIBLE_BY_ID[s.id], s.id).toBeTruthy()
      expect(b.vendor.prizes.length + b.vendor.souvenirs.length).toBeGreaterThan(0)
    }
    expect(Object.keys(VENDORS)).toHaveLength(booths.length)
  })
})
