import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import { ensureDaily } from '../actions'
import { dayKey } from '../time'
import { defaultHubs, normalizeHubs } from '../hubState'
import {
  claimPassport,
  FAIR_FULL_ROUNDS,
  FAIR_GAME_IDS,
  FAIR_GAMES,
  FAIR_ID,
  FAIR_PLAY_COST,
  FAIR_PRIZE_BY_ID,
  FAIR_PRIZES,
  fairPlayCost,
  fairPlaysToday,
  finishFairRound,
  HUB_IDS,
  HUB_META,
  hubArrived,
  hubCrowd,
  hubFeed,
  hubPick,
  isHubMap,
  passportStamps,
  PASSPORT_REWARD,
  prizeAvailable,
  redeemPrize,
  startFairRound,
  ticketsFor,
} from '../hubs'
import { HUB_QUESTS, QUESTS } from '../data/npcQuests/hubs'
import { HUB_SHOPS, HUB_SNACKS } from '../data/hubShops'
import { PLACE_SHOPS, SNACK_BY_ID } from '../data/placeShops'
import { PLACE_BY_ID } from '../data/places'
import { COLLECTIBLES, HUB_COLLECTIBLE_BY_ID } from '../data/collectibles/hubs'
import { OUTFITS } from '../data/outfits'

const ALL = [...HUB_IDS, FAIR_ID]

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  ensureDaily()
})

describe('saved hub state', () => {
  it('defaults old saves and repairs junk', () => {
    expect(normalizeHubs(undefined)).toEqual(defaultHubs())
    expect(normalizeHubs('nope')).toEqual(defaultHubs())
    const h = normalizeHubs({
      visited: ['hub_chatuchak', 7, 'hub_chatuchak', 'fair_temple'],
      days: { hub_chatuchak: '2026-09-01', bad: 3 },
      visits: -4,
      tickets: 12.7,
      ticketsTotal: Number.NaN,
      best: { darts: 18, rings: 'lots' },
      plays: { day: 5, n: { darts: 2, cork: null } },
      prizes: { fair_goldfish: 2, x: '1' },
      passport: 'yes',
    })
    expect(h).toEqual({
      visited: ['hub_chatuchak', 'fair_temple'],
      days: { hub_chatuchak: '2026-09-01' },
      visits: 0,
      tickets: 12,
      ticketsTotal: 0,
      best: { darts: 18 },
      plays: { day: '', n: { darts: 2 } },
      prizes: { fair_goldfish: 2 },
      passport: false,
      passes: {},
    })
  })

  it('is part of the migrated game state', () => {
    expect(migrate({}).hubs).toEqual(defaultHubs())
    const kept = migrate({ ...defaultState(), hubs: { visited: ['hub_maeklong'], tickets: 9, passport: true } }).hubs
    expect(kept.visited).toEqual(['hub_maeklong'])
    expect(kept.tickets).toBe(9)
    expect(kept.passport).toBe(true)
  })
})

describe('hub data', () => {
  it('has metadata and a map pin for all six markets and the fair', () => {
    expect(HUB_IDS).toHaveLength(6)
    for (const id of ALL) {
      const m = HUB_META[id]
      expect(m, id).toBeTruthy()
      expect(isHubMap(id)).toBe(true)
      expect(m.kind).toBe(id === FAIR_ID ? 'fair' : 'market')
      expect(m.npcs.length).toBeGreaterThanOrEqual(2)
      expect(m.npcs.length).toBeLessThanOrEqual(4)
      expect(m.chat.length).toBeGreaterThan(3)
      expect(PLACE_BY_ID[id]?.kind, id).toBe(m.kind)
    }
    expect(isHubMap('wat')).toBe(false)
  })

  it('points board picks and stalls at real shops and snacks', () => {
    const snackIds = new Set(HUB_SNACKS.map((s) => s.id))
    expect(snackIds.size).toBe(HUB_SNACKS.length)
    for (const [id, shop] of Object.entries(HUB_SHOPS)) {
      expect(shop.id).toBe(id)
      expect(ALL).toContain(shop.place)
      expect(id.startsWith(`${shop.place}_`)).toBe(true)
      expect(PLACE_SHOPS[id]).toBe(shop)
      for (const sn of shop.snacks) expect(SNACK_BY_ID[sn], `${id}: ${sn}`).toBeTruthy()
    }
    for (const id of ALL) {
      for (const p of HUB_META[id].picks) {
        expect(p.shop.startsWith('shop:')).toBe(true)
        expect(HUB_SHOPS[p.shop.slice(5)]?.place, p.shop).toBe(id)
      }
    }
  })

  it('wires every quest to a giver on its map and to known rewards', () => {
    expect(QUESTS).toBe(HUB_QUESTS)
    const ids = new Set(HUB_QUESTS.map((q) => q.id))
    expect(ids.size).toBe(HUB_QUESTS.length)
    for (const q of HUB_QUESTS) {
      expect(ALL).toContain(q.map)
      expect(HUB_META[q.map].npcs.map((n) => n.id), q.id).toContain(q.giver)
      expect(q.steps.length).toBeGreaterThan(0)
      for (const st of q.steps) {
        expect(st.target).toBeGreaterThan(0)
        if (st.map) expect(ALL).toContain(st.map)
      }
      for (const r of q.requires ?? []) expect(ids.has(r), `${q.id} requires ${r}`).toBe(true)
      for (const c of Object.keys(q.reward.collectibles ?? {})) expect(HUB_COLLECTIBLE_BY_ID[c], `${q.id}: ${c}`).toBeTruthy()
      expect(q.reward.coins).toBeGreaterThan(0)
    }
    // Every quest giver on a map has at least one quest.
    for (const id of ALL) for (const n of HUB_META[id].npcs) expect(HUB_QUESTS.some((q) => q.giver === n.id), n.id).toBe(true)
  })

  it('has unique collectibles and prizes that exist', () => {
    expect(new Set(COLLECTIBLES.map((c) => c.id)).size).toBe(COLLECTIBLES.length)
    expect(new Set(FAIR_PRIZES.map((p) => p.id)).size).toBe(FAIR_PRIZES.length)
    for (const p of FAIR_PRIZES) {
      expect(p.tickets).toBeGreaterThan(0)
      if (p.kind === 'collectible') expect(HUB_COLLECTIBLE_BY_ID[p.ref], p.id).toBeTruthy()
      if (p.kind === 'outfit') expect(OUTFITS.some((o) => o.id === p.ref), p.id).toBe(true)
      if (p.kind === 'coins') expect(p.amount).toBeGreaterThan(0)
    }
    expect([...FAIR_GAME_IDS].sort()).toEqual(['bumper', 'cork', 'darts', 'ramwong', 'rings', 'scoop'])
    for (const g of FAIR_GAME_IDS) expect(FAIR_GAMES[g].steps).toHaveLength(3)
  })
})

describe('arrivals and the market passport', () => {
  it('stamps a hub once and counts every arrival', () => {
    const a = hubArrived('hub_kimyong')
    expect(a).toMatchObject({ first: true, firstToday: true, stamps: 1 })
    const b = hubArrived('hub_kimyong')
    expect(b).toMatchObject({ first: false, firstToday: false, stamps: 1 })
    expect(game.value.hubs.visits).toBe(2)
    expect(game.value.hubs.days.hub_kimyong).toBe(dayKey())
    expect(game.value.stats.hub_visit).toBe(2)
    // The fair is not a passport stamp.
    hubArrived(FAIR_ID)
    expect(passportStamps()).toBe(1)
  })

  it('pays the passport reward once, after all six markets', () => {
    for (const id of HUB_IDS.slice(0, 5)) hubArrived(id)
    expect(claimPassport()).toBe(false)
    hubArrived(HUB_IDS[5])
    const coins = game.value.coins
    expect(claimPassport()).toBe(true)
    expect(game.value.coins).toBe(coins + PASSPORT_REWARD.coins)
    expect(game.value.hubs.tickets).toBe(PASSPORT_REWARD.tickets)
    expect(game.value.hubs.prizes.hub_passport_gold).toBe(1)
    expect(claimPassport()).toBe(false)
  })
})

describe('fair tickets', () => {
  it('makes the first round of the day free', () => {
    expect(fairPlayCost(0)).toBe(0)
    expect(fairPlayCost(1)).toBe(FAIR_PLAY_COST)
    expect(fairPlayCost(9)).toBe(FAIR_PLAY_COST)
  })

  it('pays tickets by stars and halves them after the full rounds', () => {
    expect([0, 1, 2, 3].map((s) => ticketsFor(s, 0))).toEqual([1, 3, 5, 8])
    expect(ticketsFor(-1, 0)).toBe(1)
    expect(ticketsFor(7, 0)).toBe(8)
    expect(ticketsFor(2.9, 0)).toBe(5)
    expect(ticketsFor(3, FAIR_FULL_ROUNDS - 1)).toBe(8)
    expect(ticketsFor(3, FAIR_FULL_ROUNDS)).toBe(4)
    expect(ticketsFor(2, FAIR_FULL_ROUNDS)).toBe(3)
    expect(ticketsFor(0, FAIR_FULL_ROUNDS + 5)).toBe(1)
  })

  it('charges for a second round and refuses when broke', () => {
    const coins = game.value.coins
    expect(startFairRound('darts')).toBe(true)
    expect(game.value.coins).toBe(coins)
    expect(fairPlaysToday('darts')).toBe(1)
    expect(startFairRound('darts')).toBe(true)
    expect(game.value.coins).toBe(coins - FAIR_PLAY_COST)
    // Each booth has its own free round.
    expect(startFairRound('rings')).toBe(true)
    expect(game.value.coins).toBe(coins - FAIR_PLAY_COST)
    game.value = { ...game.value, coins: FAIR_PLAY_COST - 1 }
    expect(startFairRound('darts')).toBe(false)
    expect(fairPlaysToday('darts')).toBe(2)
  })

  it('forgets yesterday’s rounds', () => {
    game.value = { ...game.value, hubs: { ...game.value.hubs, plays: { day: '2000-01-01', n: { cork: 9 } } } }
    expect(fairPlaysToday('cork')).toBe(0)
    const coins = game.value.coins
    expect(startFairRound('cork')).toBe(true)
    expect(game.value.coins).toBe(coins)
    expect(game.value.hubs.plays).toEqual({ day: dayKey(), n: { cork: 1 } })
  })

  it('books a finished round: tickets, best score, merit and the event', () => {
    startFairRound('rings')
    const r = finishFairRound('rings', 3, 14)
    expect(r).toMatchObject({ tickets: 8, best: true, total: 8 })
    expect(r.merit).toBeGreaterThan(0)
    startFairRound('rings')
    const r2 = finishFairRound('rings', 1, 6)
    expect(r2).toMatchObject({ tickets: 3, best: false, total: 11 })
    expect(game.value.hubs.best.rings).toBe(14)
    expect(game.value.hubs.ticketsTotal).toBe(11)
    expect(game.value.stats.fair_game).toBe(2)
  })

  it('halves tickets once the daily full rounds are used up', () => {
    game.value = { ...game.value, coins: 1000 }
    for (let i = 0; i < FAIR_FULL_ROUNDS; i++) {
      startFairRound('cork')
      finishFairRound('cork', 3, 1)
    }
    expect(game.value.hubs.tickets).toBe(8 * FAIR_FULL_ROUNDS)
    startFairRound('cork')
    expect(finishFairRound('cork', 3, 1).tickets).toBe(4)
  })
})

describe('prize booth', () => {
  const give = (tickets: number) => (game.value = { ...game.value, hubs: { ...game.value.hubs, tickets } })

  it('needs enough tickets', () => {
    give(3)
    expect(redeemPrize('fair_goldfish')).toBe(false)
    expect(game.value.hubs.tickets).toBe(3)
    expect(redeemPrize('nope')).toBe(false)
  })

  it('limits collectibles and spends tickets', () => {
    const fish = FAIR_PRIZE_BY_ID.fair_goldfish
    give(fish.tickets * 5)
    for (let i = 0; i < (fish.limit ?? 1); i++) expect(redeemPrize(fish.id)).toBe(true)
    expect(prizeAvailable(fish)).toBe(false)
    expect(redeemPrize(fish.id)).toBe(false)
    expect(game.value.hubs.prizes.fair_goldfish).toBe(fish.limit)
    expect(game.value.hubs.tickets).toBe(fish.tickets * (5 - (fish.limit ?? 1)))
  })

  it('gives outfits once and coin bags any number of times', () => {
    const hat = FAIR_PRIZE_BY_ID.prize_likay_hat
    const bag = FAIR_PRIZE_BY_ID.prize_coins_s
    give(hat.tickets + bag.tickets * 2)
    game.value = { ...game.value, outfits: game.value.outfits.filter((o) => o !== hat.ref) }
    expect(redeemPrize(hat.id)).toBe(true)
    expect(game.value.outfits).toContain(hat.ref)
    expect(prizeAvailable(hat)).toBe(false)
    const coins = game.value.coins
    expect(redeemPrize(bag.id)).toBe(true)
    expect(redeemPrize(bag.id)).toBe(true)
    expect(game.value.coins).toBe(coins + (bag.amount ?? 0) * 2)
    expect(game.value.hubs.tickets).toBe(0)
  })
})

describe('simulated crowd and board feed', () => {
  const t = Date.UTC(2026, 8, 29, 11, 5)

  it('is stable within a 10-minute slot', () => {
    expect(hubCrowd('hub_damnoen', t, 250)).toBe(hubCrowd('hub_damnoen', t + 60_000, 250))
    expect(hubFeed('hub_damnoen', t)).toEqual(hubFeed('hub_damnoen', t + 60_000))
    expect(hubCrowd('hub_damnoen', t)).toBeGreaterThan(0)
  })

  it('keeps Chatuchak the busiest market', () => {
    for (let i = 0; i < 24; i++) {
      const at = t + i * 3_600_000
      for (const id of HUB_IDS.slice(1)) expect(hubCrowd('hub_chatuchak', at, 300)).toBeGreaterThan(hubCrowd(id, at, 300))
    }
  })

  it('never puts more players in the hubs than are online', () => {
    for (const online of [120, 200, 356]) {
      for (let i = 0; i < 12; i++) {
        const at = t + i * 600_000
        const sum = ALL.reduce((n, id) => n + hubCrowd(id, at, online), 0)
        expect(sum).toBeLessThanOrEqual(online)
      }
    }
    // A quiet night still shows a small crowd.
    expect(hubCrowd('hub_indochina', t, 20)).toBeGreaterThanOrEqual(8)
  })

  it('writes feed posts from the hub’s own chatter', () => {
    const feed = hubFeed('hub_indochina', t, 6)
    expect(feed).toHaveLength(6)
    for (const p of feed) {
      expect(HUB_META.hub_indochina.chat).toContain(p.text)
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.level).toBeGreaterThanOrEqual(1)
    }
    for (let i = 1; i < feed.length; i++) expect(feed[i].ago).toBeGreaterThan(feed[i - 1].ago)
    expect(hubFeed('nowhere', t)).toEqual([])
  })

  it('picks the same stall all day', () => {
    expect(hubPick('hub_thaphae', '2026-09-29')).toEqual(hubPick('hub_thaphae', '2026-09-29'))
    expect(HUB_META.hub_thaphae.picks).toContainEqual(hubPick('hub_thaphae', '2026-09-30'))
    expect(hubPick('nowhere')).toBeNull()
  })
})
