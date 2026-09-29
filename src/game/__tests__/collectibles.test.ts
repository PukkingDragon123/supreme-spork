import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import { COLLECTIBLES, COLLECTIBLE_BY_ID, seriesList, registerCollectibleGroup } from '../data/collectibles'
import {
  activeSeasons,
  addToCollection,
  buyCollectible,
  claimSetReward,
  collectionStats,
  grantCollectible,
  grantCollectibles,
  markSeen,
  msUntilRotation,
  rollStock,
  rotationCountdown,
  seriesProgress,
  stockLeft,
  RARITY_WEIGHT,
} from '../collectibles'
import { normalizeCollection } from '../collectionState'
import { stallKindFor, haggleOutcome, tryHaggle } from '../stalls'
import { PLACE_SHOPS, shopFor } from '../data/placeShops'
import { notices } from '../events'
import type { Rarity } from '../data/collectibleTypes'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true, coins: 5000 }
  notices.value = []
})

describe('catalogue', () => {
  it('has 80+ unique items across every rarity with valid art', () => {
    expect(COLLECTIBLES.length).toBeGreaterThanOrEqual(80)
    expect(new Set(COLLECTIBLES.map((c) => c.id)).size).toBe(COLLECTIBLES.length)
    const rarities = new Set(COLLECTIBLES.map((c) => c.rarity))
    expect([...rarities].sort()).toEqual(['common', 'epic', 'legendary', 'rare', 'uncommon'])
    for (const c of COLLECTIBLES) {
      expect(c.art.palette).toHaveLength(3)
      expect(c.value).toBeGreaterThan(0)
      expect(c.name.length).toBeGreaterThan(2)
    }
  })

  it('groups items into series with rewards', () => {
    const s = seriesList()
    expect(s.length).toBeGreaterThanOrEqual(8)
    for (const x of s) {
      expect(x.items.length).toBeGreaterThan(0)
      expect(x.reward).toBeGreaterThan(0)
    }
  })

  it('accepts new groups from other systems', () => {
    registerCollectibleGroup({ id: 'test-group', items: [{ id: 'cl_test_x', name: 'ของทดสอบ', desc: '', rarity: 'rare', kind: 'pin', series: 'ชุดทดสอบ', value: 99, art: { motif: 'star', palette: ['#fff', '#000', '#f00'] }, source: 'reward' }] })
    expect(COLLECTIBLE_BY_ID.cl_test_x).toBeTruthy()
    expect(seriesList().some((s) => s.id === 'ชุดทดสอบ')).toBe(true)
  })
})

describe('seasons', () => {
  it('knows the Thai seasons by date', () => {
    expect(activeSeasons(new Date(2026, 3, 13))).toContain('songkran')
    expect(activeSeasons(new Date(2026, 8, 29))).toContain('rainy')
    expect(activeSeasons(new Date(2026, 10, 24))).toContain('loy_krathong')
    const ny = activeSeasons(new Date(2026, 11, 31))
    expect(ny).toContain('cool')
    expect(ny).toContain('new_year')
    expect(activeSeasons(new Date(2027, 0, 5))).toContain('new_year')
    expect(activeSeasons(new Date(2026, 1, 1))).toContain('chinese_new_year')
    expect(activeSeasons(new Date(2026, 7, 1))).not.toContain('songkran')
  })
})

describe('daily stock rotation', () => {
  const base = { seed: 'seedA', kind: 'souvenir' as const }

  it('is deterministic per day and shop', () => {
    const a = rollStock({ ...base, shopId: 'wat_arun_costume', day: '2026-09-29', place: 'wat_arun' })
    const b = rollStock({ ...base, shopId: 'wat_arun_costume', day: '2026-09-29', place: 'wat_arun' })
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('changes with the day and differs between shops', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']
    const one = days.map((day) => rollStock({ ...base, shopId: 'shop_a', day }).map((e) => e.id).join())
    expect(new Set(one).size).toBeGreaterThan(1)
    const shops = ['shop_a', 'shop_b', 'shop_c', 'shop_d']
    const same = shops.map((shopId) => rollStock({ ...base, shopId, day: '2026-09-10' }).map((e) => e.id).join())
    expect(new Set(same).size).toBeGreaterThan(1)
  })

  it('weights picks by rarity', () => {
    const seen: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
    for (let i = 0; i < 400; i++) {
      const day = `2026-0${1 + (i % 9)}-${String(1 + (i % 27)).padStart(2, '0')}`
      for (const e of rollStock({ seed: `s${i}`, kind: 'snack', shopId: `x${i}`, day })) if (!e.fixed) seen[COLLECTIBLE_BY_ID[e.id].rarity]++
    }
    expect(seen.common).toBeGreaterThan(seen.uncommon)
    expect(seen.uncommon).toBeGreaterThan(seen.rare)
    expect(seen.rare).toBeGreaterThan(seen.epic)
    expect(seen.epic).toBeGreaterThanOrEqual(seen.legendary)
    expect(RARITY_WEIGHT.common).toBeGreaterThan(RARITY_WEIGHT.legendary)
  })

  it('only sells seasonal items in their season', () => {
    const songkran = COLLECTIBLES.filter((c) => c.season === 'songkran').map((c) => c.id)
    const rolled = (day: string) => {
      const ids = new Set<string>()
      for (let i = 0; i < 120; i++) for (const e of rollStock({ seed: `k${i}`, kind: 'souvenir', shopId: `s${i}`, day })) ids.add(e.id)
      return ids
    }
    const sept = rolled('2026-09-15')
    expect(songkran.some((id) => sept.has(id))).toBe(false)
    const april = rolled('2026-04-10')
    expect(songkran.some((id) => april.has(id))).toBe(true)
  })

  it('always stocks a place’s signature items and a shop’s own fixed items', () => {
    const sig = COLLECTIBLES.filter((c) => c.place === 'ai_khai').map((c) => c.id)
    expect(sig.length).toBeGreaterThan(0)
    for (const day of ['2026-01-03', '2026-05-20', '2026-09-29']) {
      const st = rollStock({ seed: 'z', kind: 'rooster', shopId: 'ai_khai_rooster', day, place: 'ai_khai', fixed: ['cl_boba_keychain'] })
      for (const id of sig) expect(st.find((e) => e.id === id)?.fixed).toBe(true)
      expect(st.find((e) => e.id === 'cl_boba_keychain')?.fixed).toBe(true)
      // Other places' signature items never roll here.
      for (const e of st) {
        const c = COLLECTIBLE_BY_ID[e.id]
        if (c.place) expect(c.place).toBe('ai_khai')
      }
    }
  })

  it('never rolls reward-only items', () => {
    registerCollectibleGroup({ id: 'test-reward', items: [{ id: 'cl_reward_only', name: 'รางวัล', desc: '', rarity: 'common', kind: 'pin', series: 'ชุดรางวัล', value: 10, art: { motif: 'star', palette: ['#fff', '#000', '#f00'] }, source: 'reward' }] })
    for (let i = 0; i < 80; i++) expect(rollStock({ seed: `r${i}`, kind: 'souvenir', shopId: 'q', day: '2026-09-29' }).some((e) => e.id === 'cl_reward_only')).toBe(false)
  })

  it('counts down to midnight', () => {
    expect(msUntilRotation(new Date(2026, 8, 29, 23, 0, 0))).toBe(3_600_000)
    expect(rotationCountdown(new Date(2026, 8, 29, 21, 30, 0))).toBe('02:30')
  })
})

describe('collection', () => {
  it('normalizes old and broken saves', () => {
    const s = migrate({ coins: 10 })
    expect(s.collection.owned).toEqual({})
    expect(s.collection.seed).toBeTruthy()
    const n = normalizeCollection({ owned: { a: 2, b: -1, c: 'x' }, found: { a: '2026-01-01', b: 3 }, fresh: ['a', 'a', 4], sets: null, seed: '' })
    expect(n.owned).toEqual({ a: 2 })
    expect(n.found).toEqual({ a: '2026-01-01' })
    expect(n.fresh).toEqual(['a'])
    expect(n.sets).toEqual([])
    expect(n.seed.length).toBeGreaterThan(0)
  })

  it('grants items with first-found day and a new badge', () => {
    expect(grantCollectible('cl_tuktuk_magnet', 2)).toBe(true)
    const c = game.value.collection
    expect(c.owned.cl_tuktuk_magnet).toBe(2)
    expect(c.found.cl_tuktuk_magnet).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(c.fresh).toContain('cl_tuktuk_magnet')
    expect(game.value.stats.collectible).toBe(2)
    markSeen(['cl_tuktuk_magnet'])
    expect(game.value.collection.fresh).not.toContain('cl_tuktuk_magnet')
    expect(grantCollectibles({ nope: 1 })).toBe(false)
  })

  it('buys from limited daily stock', () => {
    const entry = { id: 'cl_gold_rooster', qty: 1, fixed: true }
    expect(buyCollectible('ai_khai_rooster', entry)).toBe(true)
    expect(game.value.coins).toBe(5000 - COLLECTIBLE_BY_ID.cl_gold_rooster.value)
    expect(stockLeft('ai_khai_rooster', entry)).toBe(0)
    expect(buyCollectible('ai_khai_rooster', entry)).toBe(false)
    expect(game.value.collection.owned.cl_gold_rooster).toBe(1)
    expect(game.value.stats.stall_buy).toBe(1)
    // Another stall has its own stock.
    expect(stockLeft('ai_khai_lottery', entry)).toBe(1)
  })

  it('pays a set-completion reward once', () => {
    const series = seriesList().find((s) => s.items.length >= 3)!
    expect(claimSetReward(series.id)).toBe(0)
    const d = structuredClone(game.value)
    for (const c of series.items) addToCollection(d, c.id)
    game.value = d
    const p = seriesProgress().find((x) => x.series.id === series.id)!
    expect(p.complete).toBe(true)
    const before = game.value.coins
    expect(claimSetReward(series.id)).toBe(series.reward)
    expect(game.value.coins).toBe(before + series.reward)
    expect(claimSetReward(series.id)).toBe(0)
    expect(collectionStats().owned).toBe(series.items.length)
  })
})

describe('stalls', () => {
  it('derives a stall look for every hand-made shop', () => {
    const kinds = Object.values(PLACE_SHOPS).map((s) => [s.id, stallKindFor(s)])
    expect(Object.fromEntries(kinds)).toMatchObject({
      mart: 'mart',
      wat_phra_kaew_icecream: 'icecream',
      nst_mahathat_amulet: 'amulet',
      wat_chalong_mee: 'noodle',
      wat_arun_costume: 'costume',
      wat_huay_pla_kang_teahouse: 'teahouse',
      ai_khai_rooster: 'rooster',
      wat_rong_khun_artshop: 'souvenir',
      pathom_chedi_khaolam: 'snack',
    })
    expect(stallKindFor(shopFor('doi_suthep_icecream'))).toBe('icecream')
    expect(stallKindFor({ id: 'x', name: 'x', npc: 'x', greeting: '', snacks: [] })).toBe('snack')
  })

  it('bargains once per stall per day, deterministically', () => {
    expect(haggleOutcome('a', '2026-09-29', 's')).toBe(haggleOutcome('a', '2026-09-29', 's'))
    const first = tryHaggle('wat_pho_balm')
    expect(first.again).toBe(false)
    const second = tryHaggle('wat_pho_balm')
    expect(second.again).toBe(true)
    expect(second.discount).toBe(0)
  })
})

describe('market trading', () => {
  it('lists collectibles and trades them in and out of the collection', async () => {
    const M = await import('../market')
    const list = M.browseListings()
    const col = list.filter((l) => l.kind === 'collectible')
    expect(col.length).toBeGreaterThan(0)
    expect(new Set(col.map((l) => l.itemId)).size).toBe(col.length)
    const l = col[0]
    expect(M.tradeName('collectible', l.itemId)).toBe(COLLECTIBLE_BY_ID[l.itemId].name)
    expect(M.buyListing(l)).toBe(true)
    expect(game.value.collection.owned[l.itemId]).toBe(l.qty)
    expect(game.value.stats.trade).toBe(1)
    expect(game.value.stats.collectible).toBe(l.qty)
    expect(M.owned('collectible', l.itemId)).toBe(l.qty)
    expect(M.listItem('collectible', l.itemId, 1, M.baseValue('collectible', l.itemId))).toBe(true)
    expect(game.value.collection.owned[l.itemId] ?? 0).toBe(l.qty - 1)
    M.cancelListing(game.value.market.mine[0].id)
    expect(game.value.collection.owned[l.itemId]).toBe(l.qty)
  })
})
