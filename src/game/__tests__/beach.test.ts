import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import { ensureDaily } from '../actions'
import { BEACH_GAMES, BEACH_IDS, BEACH_META, beachOf } from '../data/beaches'
import { BEACH_COLLECTIBLES, BEACH_SHELLS } from '../data/collectibles/beach'
import { COLLECTIBLE_BY_ID } from '../data/collectibles'
import { PLACE_BY_ID } from '../data/places'
import { PLACE_SHOPS, SNACK_BY_ID } from '../data/placeShops'
import { BEACH_SHOPS } from '../data/beachShops'
import { OUTFIT_BY_ID } from '../data/outfits'
import { normalizeBeach } from '../beachState'
import {
  beachArrived,
  beachFullLeft,
  beachOffer,
  beachPlaysToday,
  beachReward,
  canSnorkel,
  finishBeachRound,
  payBeachRound,
  photoKey,
  photoTime,
  rollRarity,
  rollShell,
  shellLuck,
  takePhoto,
} from '../beach'
import { mulberry32 } from '../../engine/rng'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true, coins: 500 }
  ensureDaily()
})

describe('beach data', () => {
  it('has six beach places with metadata, stalls and hosts', () => {
    expect(BEACH_IDS).toHaveLength(6)
    for (const id of BEACH_IDS) {
      const p = PLACE_BY_ID[id]
      expect(p?.kind, id).toBe('beach')
      expect(BEACH_META[id].games.length).toBeGreaterThanOrEqual(4)
      expect(BEACH_META[id].games).toContain('photo')
      const shops = BEACH_SHOPS.filter((s) => s.place === id)
      expect(shops.length, id).toBeGreaterThanOrEqual(2)
      for (const s of shops) {
        expect(PLACE_SHOPS[s.id]).toBe(s)
        for (const sn of s.snacks) expect(SNACK_BY_ID[sn], sn).toBeTruthy()
      }
    }
    for (const g of Object.values(BEACH_GAMES)) {
      expect(g.host.name.length).toBeGreaterThan(1)
      for (const k of ['hair', 'top', 'bottom', 'head'] as const) { const v = g.host.look[k]; if (v) expect(OUTFIT_BY_ID[v], v).toBeTruthy() }
    }
    expect(beachOf('beach_samui')).toBe('beach_samui')
    expect(beachOf('wat')).toBeNull()
  })

  it('registers the collectibles and cosmetics', () => {
    for (const c of BEACH_COLLECTIBLES) expect(COLLECTIBLE_BY_ID[c.id]).toBe(c)
    for (const s of BEACH_SHELLS) expect(s.source).toBe('reward')
    for (const id of ['head_beach_strawhat', 'head_sunset_shades', 'bot_beach_pareo', 'top_beach_wave']) expect(PLACE_BY_ID[OUTFIT_BY_ID[id].shopOnly!]?.kind).toBe('beach')
  })
})

describe('rewards and daily caps', () => {
  it('pays by stars, doubles the first round of the day and caps later rounds', () => {
    const d = BEACH_GAMES.cleanup
    expect(beachReward(d, 3, 0).merit).toBe(d.merit * 2)
    expect(beachReward(d, 3, 1).merit).toBe(d.merit)
    expect(beachReward(d, 2, 1).merit).toBe(Math.round(d.merit * 0.75))
    const capped = beachReward(d, 3, d.daily)
    expect(capped.capped).toBe(true)
    expect(capped.merit).toBe(Math.round(d.merit * 0.25))
    expect(beachReward(d, 0, 0)).toEqual({ merit: 1, coins: 0, capped: false })
    // No first-round bonus on games without one.
    expect(beachReward(BEACH_GAMES.shells, 3, 0).merit).toBe(BEACH_GAMES.shells.merit)
  })

  it('finishes a round: merit, coins, counts, events and finds', () => {
    const m0 = game.value.merit
    const c0 = game.value.coins
    const r = finishBeachRound('cleanup', 3, { score: 20, trash: 14, finds: ['bc_shell_cowrie', 'bc_shell_cowrie'] })
    expect(r.merit).toBeGreaterThan(0)
    expect(game.value.merit).toBe(m0 + r.merit)
    expect(game.value.coins).toBeGreaterThanOrEqual(c0 + r.coins)
    expect(game.value.beach.trash).toBe(14)
    expect(game.value.stats.job).toBe(1)
    expect(game.value.stats.beach_play).toBe(1)
    expect(game.value.collection.owned.bc_shell_cowrie).toBe(2)
    expect(beachPlaysToday('cleanup')).toBe(1)
    expect(beachFullLeft('cleanup')).toBe(BEACH_GAMES.cleanup.daily - 1)
    expect(r.best).toBe(true)
    const t = finishBeachRound('turtle', 2, { turtles: 9 })
    expect(t.merit).toBeGreaterThan(0)
    expect(game.value.stats.sea_turtle).toBe(9)
    expect(game.value.beach.turtles).toBe(9)
    finishBeachRound('chedi', 1, { chedi: true })
    expect(game.value.beach.chedis).toBe(1)
    expect(game.value.stats.sand_chedi).toBe(1)
  })

  it('logs new fish once', () => {
    expect(finishBeachRound('snorkel', 2, { fish: ['clown', 'clown', 'parrot'] }).newFish).toEqual(['clown', 'parrot'])
    expect(finishBeachRound('snorkel', 2, { fish: ['clown', 'moray'] }).newFish).toEqual(['moray'])
    expect(game.value.beach.fish).toEqual(['clown', 'parrot', 'moray'])
  })
})

describe('prices and deals', () => {
  it('free games cost nothing and flag the first-round deal', () => {
    const o = beachOffer('chedi')
    expect(o.price).toBe(0)
    expect(o.deals.find((d) => d.kind === 'first')?.active).toBe(true)
    finishBeachRound('chedi', 2, { chedi: true })
    expect(beachOffer('chedi').deals.find((d) => d.kind === 'first')?.active).toBe(false)
  })

  it('sells banana-boat packs of 3 at 20% off and uses the credits', () => {
    const o = beachOffer('banana')
    expect(o.price).toBe(30)
    expect(o.pack).toEqual({ n: 3, price: 72, save: 18 })
    const c0 = game.value.coins
    expect(payBeachRound('banana', true)).toBe(true)
    expect(game.value.coins).toBe(c0 - 72)
    expect(game.value.beach.credits.banana).toBe(2)
    expect(beachOffer('banana').price).toBe(0)
    expect(payBeachRound('banana')).toBe(true)
    expect(payBeachRound('banana')).toBe(true)
    expect(game.value.coins).toBe(c0 - 72)
    expect(game.value.beach.credits.banana).toBe(0)
    expect(payBeachRound('banana')).toBe(true)
    expect(game.value.coins).toBe(c0 - 72 - 30)
  })

  it('refuses when coins are short', () => {
    game.value = { ...game.value, coins: 5 }
    expect(payBeachRound('banana')).toBe(false)
    expect(payBeachRound('banana', true)).toBe(false)
    expect(game.value.coins).toBe(5)
    expect(game.value.beach.credits.banana ?? 0).toBe(0)
  })

  it('halves the snorkel boat for the full gear set', () => {
    expect(beachOffer('snorkel').price).toBe(20)
    const look = { ...game.value.player.look, suit: 'suit_scuba', shoes: 'shoes_flippers' }
    game.value = { ...game.value, player: { ...game.value.player, look } }
    expect(beachOffer('snorkel').price).toBe(10)
    const c0 = game.value.coins
    payBeachRound('snorkel')
    expect(game.value.coins).toBe(c0 - 10)
  })

  it('knows the morning low tide', () => {
    expect(shellLuck(6)).toBeGreaterThan(0)
    expect(shellLuck(12)).toBe(0)
    expect(beachOffer('shells', game.value, undefined, 7).deals.find((d) => d.kind === 'tide')?.active).toBe(true)
  })
})

describe('shells, gear, photos, passport', () => {
  it('rolls rarities by weight and luck', () => {
    const r = mulberry32(7)
    const n: Record<string, number> = {}
    for (let i = 0; i < 4000; i++) {
      const k = rollRarity(r)
      n[k] = (n[k] ?? 0) + 1
    }
    expect(n.common).toBeGreaterThan(n.uncommon)
    expect(n.uncommon).toBeGreaterThan(n.rare)
    expect(n.rare).toBeGreaterThan(n.epic ?? 0)
    const lucky = mulberry32(7)
    let rare = 0
    for (let i = 0; i < 4000; i++) if (rollRarity(lucky, 1) !== 'common') rare++
    expect(rare).toBeGreaterThan(4000 - n.common)
  })

  it('never finds pearls on the sand, only at the reef', () => {
    const r = mulberry32(3)
    for (let i = 0; i < 3000; i++) expect(rollShell(r, { luck: 1 })).not.toBe('bc_pearl')
    let pearls = 0
    for (let i = 0; i < 3000; i++) if (rollShell(r, { reef: true, luck: 1 }) === 'bc_pearl') pearls++
    expect(pearls).toBeGreaterThan(0)
    for (let i = 0; i < 200; i++) expect(COLLECTIBLE_BY_ID[rollShell(r)]).toBeTruthy()
  })

  it('needs the scuba suit or flippers to snorkel', () => {
    expect(canSnorkel({ suit: null, shoes: null })).toBe(false)
    expect(canSnorkel({ suit: 'suit_scuba', shoes: null })).toBe(true)
    expect(canSnorkel({ suit: null, shoes: 'shoes_flippers' })).toBe(true)
  })

  it('keeps one album shot per beach and time of day', () => {
    expect(photoTime('golden')).toBe('sunset')
    expect(photoTime('dusk')).toBe('night')
    expect(photoKey('beach_samui', 'dawn')).toBe('beach_samui:day')
    const a = takePhoto('beach_samui', 'golden')
    expect(a.fresh).toBe(true)
    expect(a.coins).toBeGreaterThan(0)
    const b = takePhoto('beach_samui', 'golden')
    expect(b.fresh).toBe(false)
    expect(b.coins).toBe(0)
    expect(game.value.beach.photos).toEqual(['beach_samui:sunset'])
  })

  it('stamps the passport once per beach', () => {
    expect(beachArrived('beach_huahin')).toBe(true)
    expect(beachArrived('beach_huahin')).toBe(false)
    expect(beachArrived('wat')).toBe(false)
    expect(game.value.beach.visited).toEqual(['beach_huahin'])
  })

  it('normalizes old and broken saves', () => {
    expect(migrate({}).beach.visited).toEqual([])
    const n = normalizeBeach({ visited: ['a', 'a', 3], best: { x: 4, y: 'no' }, turtles: -3, credits: { banana: 2.7, bad: 'x' }, plays: 7 })
    expect(n.visited).toEqual(['a'])
    expect(n.best).toEqual({ x: 4 })
    expect(n.turtles).toBe(0)
    expect(n.credits).toEqual({ banana: 2 })
    expect(n.plays).toEqual({ day: '', n: {} })
  })
})
