import { describe, expect, it } from 'vitest'
import { applyDeal, dealBlock, dealsFor, isWanPra, lunarDay, nextWanPra, regularPrice, TEMPLE_DEALS, WANPRA_DEAL, type DealState } from '../templeDeals'

const fresh = (coins = 100): DealState => ({
  coins,
  inventory: {},
  buffs: [],
  daily: { key: 'd', quests: [], bonusClaimed: false, loginClaimed: false, ads: 0, counts: {}, lotteryUsed: 0, lotteryExtra: 0, freeFishFood: false, dedicated: false, monthlyClaimed: false, sathuGiven: 0 },
})
const deal = (key: string, id: string) => TEMPLE_DEALS[key].find((d) => d.id === id)!

// Find a day that is / isn't วันพระ for deterministic tests.
const day = (want: boolean) => {
  const d = new Date(2026, 0, 1, 12)
  while (isWanPra(d) !== want) d.setDate(d.getDate() + 1)
  return d
}

describe('temple deals', () => {
  it('spends once and grants the bundle', () => {
    const s = fresh(30)
    expect(applyDeal(s, deal('koi', 'koi5'), day(false))).toBe(true)
    expect(s.coins).toBe(10)
    expect(s.inventory.fish_food).toBe(60)
  })

  it('refuses when coins are short and changes nothing', () => {
    const s = fresh(5)
    expect(dealBlock(s, deal('gold_leaf', 'leaf3'))).toBe('coins')
    expect(applyDeal(s, deal('gold_leaf', 'leaf3'))).toBe(false)
    expect(s.coins).toBe(5)
    expect(s.inventory.gold_leaf).toBeUndefined()
  })

  it('gives free daily deals only once a day', () => {
    const s = fresh(0)
    const free = deal('gold_leaf', 'leaf_free')
    expect(applyDeal(s, free)).toBe(true)
    expect(s.inventory.gold_leaf).toBe(1)
    expect(dealBlock(s, free)).toBe('used')
    expect(applyDeal(s, free)).toBe(false)
    expect(s.inventory.gold_leaf).toBe(1)
  })

  it('shares the free koi food flag with the pond', () => {
    const s = fresh(0)
    s.daily.freeFishFood = true
    expect(dealBlock(s, deal('koi', 'koi_free'))).toBe('used')
    const t = fresh(0)
    expect(applyDeal(t, deal('koi', 'koi_free'))).toBe(true)
    expect(t.daily.freeFishFood).toBe(true)
    expect(t.inventory.fish_food).toBe(12)
  })

  it('adds lottery rubs and siamsi credits', () => {
    const s = fresh(50)
    applyDeal(s, deal('lottery', 'powder2'))
    applyDeal(s, deal('siamsi', 'siamsi3'))
    expect(s.daily.lotteryExtra).toBe(2)
    expect(s.daily.counts.siamsi_credit).toBe(3)
    expect(s.coins).toBe(13)
  })

  it('only offers the วันพระ blessing on holy days', () => {
    const holy = day(true)
    const plain = day(false)
    expect(dealsFor('bells', holy)[0]).toBe(WANPRA_DEAL)
    expect(dealsFor('bells', plain)).toHaveLength(0)
    const s = fresh(0)
    expect(dealBlock(s, WANPRA_DEAL, plain)).toBe('not_wanpra')
    expect(applyDeal(s, WANPRA_DEAL, holy)).toBe(true)
    expect(s.buffs[0]).toMatchObject({ kind: 'merit', mult: 2 })
    expect(applyDeal(s, WANPRA_DEAL, holy)).toBe(false)
  })

  it('computes lunar days and the next วันพระ', () => {
    for (let i = 0; i < 40; i++) {
      const n = lunarDay(new Date(2026, 2, i + 1))
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(30)
    }
    const d = new Date(2026, 4, 1)
    const w = nextWanPra(d)
    expect(isWanPra(w)).toBe(true)
    expect(w.getTime()).toBeGreaterThanOrEqual(new Date(2026, 4, 1).getTime())
  })

  it('every paid bundle is cheaper than buying the items one by one', () => {
    for (const list of Object.values(TEMPLE_DEALS))
      for (const d of list) if (d.price > 0) expect(d.price).toBeLessThan(regularPrice(d))
  })
})
