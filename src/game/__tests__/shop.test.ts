import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import * as A from '../actions'
import * as S from '../shop'
import { notices } from '../events'
import { OUTFIT_BY_ID, OUTFITS, inGeneralShop, isExclusive } from '../data/outfits'
import { PET_BY_ID, PETS, isExclusivePet, petsForShop } from '../data/pets'
import { PACK_OUTFIT_IDS, PASS_FREE_OUTFIT_IDS, PASS_PREMIUM_OUTFIT_IDS, POP_OUTFIT_IDS } from '../data/cosmetics'
import { SPECIAL_OFFERS } from '../data/store'
import { meritForLevel } from '../economy'
import { dayKey } from '../time'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  notices.value = []
  A.ensureDaily()
})

const SLOTS: Record<string, string> = {
  hat_elephant: 'head',
  bottom_elephant_pants: 'bottom',
  suit_scuba: 'suit',
  shoes_flippers: 'shoes',
  head_basin: 'head',
  top_swim_vest: 'top',
  neck_whistle: 'neck',
  shoes_rain_boots: 'shoes',
  back_swim_ring: 'back',
  hand_bailer: 'hand',
  suit_rescue: 'suit',
  head_rescue_helmet: 'head',
  top_rescue_jacket: 'top',
  hand_megaphone: 'hand',
  back_rescue_tube: 'back',
  shoes_rescue_boots: 'shoes',
  back_paddle: 'back',
}

describe('v4 catalogue contract', () => {
  it('has every agreed id in the agreed slot', () => {
    for (const [id, slot] of Object.entries(SLOTS)) {
      expect(OUTFIT_BY_ID[id], id).toBeDefined()
      expect(OUTFIT_BY_ID[id].slot, id).toBe(slot)
    }
    for (const id of ['chang_noi', 'betta', 'soggy_cat', 'tub_rescue']) expect(PET_BY_ID[id], id).toBeDefined()
  })

  it('marks pack / pass items exclusive and keeps them out of the shop', () => {
    const tiers: [string[], string][] = [
      [PACK_OUTFIT_IDS, 'pack'],
      [PASS_FREE_OUTFIT_IDS, 'pass_free'],
      [PASS_PREMIUM_OUTFIT_IDS, 'pass_premium'],
    ]
    for (const [ids, tier] of tiers)
      for (const id of ids) {
        const o = OUTFIT_BY_ID[id]
        expect(o.exclusive, id).toBe(tier)
        expect(isExclusive(o)).toBe(true)
        expect(inGeneralShop(o)).toBe(false)
        expect(S.buyable('outfit', id)).toBe(false)
      }
    expect(PET_BY_ID.chang_noi.exclusive).toBe('pack')
    expect(PET_BY_ID.betta.exclusive).toBe('pack')
    expect(PET_BY_ID.soggy_cat.exclusive).toBe('pass_free')
    expect(PET_BY_ID.tub_rescue.exclusive).toBe('pass_premium')
    expect(PET_BY_ID.tub_rescue.swims).toBe(true)
    for (const p of PETS) if (p.exclusive) expect(isExclusivePet(p)).toBe(true)
    expect(petsForShop().some((p) => p.exclusive)).toBe(false)
  })

  it('adds 25+ buyable pop-culture cosmetics and 6+ buyable pets with Thai text', () => {
    expect(POP_OUTFIT_IDS.length).toBeGreaterThanOrEqual(25)
    const thai = /[฀-๿]/
    for (const id of POP_OUTFIT_IDS) {
      const o = OUTFIT_BY_ID[id]
      expect(inGeneralShop(o), id).toBe(true)
      expect(o.price, id).toBeGreaterThan(0)
      expect(o.name).toMatch(thai)
      expect(o.desc.length, id).toBeGreaterThan(15)
      expect(o.tags).toContain('new')
      expect(o.acc || o.top || o.bottom || o.shoes || o.suit, id).toBeTruthy()
    }
    const newPets = ['orange_cat', 'water_monitor', 'capybara', 'pygmy_hippo', 'blindbox_monster', 'butter_bear']
    for (const id of newPets) expect(S.buyable('pet', id), id).toBe(true)
  })

  it('keeps ids unique across the whole wardrobe', () => {
    expect(new Set(OUTFITS.map((o) => o.id)).size).toBe(OUTFITS.length)
  })
})

describe('grant APIs', () => {
  it('grantOutfit gives an exclusive once and can wear it', () => {
    expect(A.buyOutfit('head_basin')).toBe(false)
    expect(A.grantOutfit('head_basin', { equip: true })).toBe(true)
    expect(game.value.outfits).toContain('head_basin')
    expect(game.value.player.look.head).toBe('head_basin')
    expect(game.value.shop.got['outfit:head_basin']).toBeGreaterThan(1)
    expect(A.grantOutfit('head_basin')).toBe(false)
    expect(A.grantOutfit('nope')).toBe(false)
  })

  it('grantPet gives a pass pet and optionally walks with it', () => {
    game.value = { ...game.value, coins: 99999 }
    expect(A.buyPet('tub_rescue')).toBe(false)
    expect(A.grantPet('tub_rescue', { walk: true })).toBe(true)
    expect(game.value.pets).toContain('tub_rescue')
    expect(game.value.pet).toBe('tub_rescue')
    expect(A.grantPet('tub_rescue')).toBe(false)
  })
})

describe('packs', () => {
  it('the flood pack grants the scuba suit, flippers and betta', () => {
    const flood = SPECIAL_OFFERS.find((o) => o.tag === 'flood')!
    expect(flood.outfits).toEqual(['suit_scuba', 'shoes_flippers'])
    expect(flood.pets).toEqual(['betta'])
    const coins = game.value.coins
    A.completePurchase(flood.id, 'tx-flood', { quiet: true })
    expect(game.value.outfits).toEqual(expect.arrayContaining(['suit_scuba', 'shoes_flippers']))
    expect(game.value.pets).toContain('betta')
    expect(game.value.coins).toBe(coins + flood.coins)
    expect(notices.value.some((n) => n.notice.kind === 'reward')).toBe(false)
  })
})

describe('daily deals', () => {
  it('are deterministic, discounted and not owned', () => {
    const a = S.dailyDeals(game.value, '2026-09-29')
    const b = S.dailyDeals(game.value, '2026-09-29')
    expect(a).toEqual(b)
    expect(a).toHaveLength(3)
    for (const d of a) {
      expect(d.price).toBeLessThan(d.was)
      expect(d.price % 5).toBe(0)
      expect(S.owns(d.kind, d.itemId)).toBe(false)
      expect(S.buyable(d.kind, d.itemId)).toBe(true)
    }
    expect(a.some((d) => d.kind === 'pet')).toBe(true)
  })

  it('can be bought once at the deal price', () => {
    const d = S.dailyDeals(game.value, dayKey())[0]
    game.value = { ...game.value, coins: d.price }
    expect(S.buyDeal(d)).toBe(true)
    expect(game.value.coins).toBe(0)
    expect(S.owns(d.kind, d.itemId)).toBe(true)
    expect(S.dealBought(d)).toBe(true)
    expect(S.buyDeal(d)).toBe(false)
  })
})

describe('bundles', () => {
  it('charge only for the missing pieces, with the discount', () => {
    const b = S.BUNDLES.find((x) => x.id === 'bundle_food')!
    const full = S.bundleFull(b)
    expect(S.bundlePrice(b)).toBe(Math.round((full * (100 - b.off)) / 100 / 5) * 5)
    A.grantOutfit('head_tomyum')
    const rest = b.items.filter((id) => id !== 'head_tomyum').reduce((n, id) => n + OUTFIT_BY_ID[id].price, 0)
    expect(S.bundlePrice(b)).toBe(Math.round((rest * (100 - b.off)) / 100 / 5) * 5)
  })

  it('grant every missing item on purchase', () => {
    const b = S.BUNDLES.find((x) => x.id === 'bundle_viral')!
    game.value = { ...game.value, coins: 5000, merit: meritForLevel(10) }
    expect(S.buyBundle(b.id)).toBe(true)
    expect(S.bundleMissing(b)).toHaveLength(0)
    expect(game.value.pets).toContain('pygmy_hippo')
    expect(S.buyBundle(b.id)).toBe(false)
  })
})

describe('daily free gift', () => {
  it('is claimable once a day and cycles through seven gifts', () => {
    expect(S.giftReady()).toBe(true)
    const coins = game.value.coins
    const g = S.claimGift()
    expect(g).toEqual(S.GIFT_CYCLE[0])
    expect(game.value.coins).toBe(coins + (g!.coins ?? 0))
    expect(S.giftReady()).toBe(false)
    expect(S.claimGift()).toBeNull()
    expect(S.nextGift()).toEqual(S.GIFT_CYCLE[1])
  })
})

describe('rarity & helpers', () => {
  it('rates exclusives by tier and suits by price', () => {
    expect(S.outfitRarity(OUTFIT_BY_ID.suit_rescue)).toBe('legend')
    expect(S.outfitRarity(OUTFIT_BY_ID.hat_elephant)).toBe('epic')
    expect(S.outfitRarity(OUTFIT_BY_ID.head_basin)).toBe('rare')
    expect(S.outfitRarity(OUTFIT_BY_ID.suit_butterbear)).toBe('legend')
    expect(S.outfitRarity(OUTFIT_BY_ID.neck_towel)).toBe('common')
  })

  it('formats the countdown', () => {
    expect(S.fmtCountdown(3_723_000)).toBe('01:02:03')
    expect(S.msUntilReset(new Date(2026, 8, 29, 23, 0, 0))).toBe(3_600_000)
  })

  it('normalises the shop state of old saves', () => {
    const old = migrate({ coins: 5 })
    expect(old.shop).toEqual({ giftDay: '', gifts: 0, dealDay: '', deals: [], got: {} })
    const bad = migrate({ shop: { gifts: -3, deals: [1, 'a'], got: { x: 'y', 'pet:naga': 5 } } })
    expect(bad.shop.gifts).toBe(0)
    expect(bad.shop.deals).toEqual(['a'])
    expect(bad.shop.got).toEqual({ 'pet:naga': 5 })
  })
})
