import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../state'
import { ensureDaily } from '../actions'
import { meritForLevel } from '../economy'
import { JOB_BY_ID, JOBS } from '../data/jobs'
import { RECIPE_BY_ID } from '../data/recipes'
import { finishJob, jobReward } from '../jobs'
import * as C from '../cooking'
import { BUNDLE_OFF, bundleQuote, buyBundle, featuredJob, firstCookActive, jobDealBonus, jobDeals, TRIO_BONUS, TRIO_KEY } from '../workDeals'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true, coins: 500 }
  ensureDaily()
})

const notFeatured = () => JOBS.filter((j) => j.id !== featuredJob(game.value.daily.key)).map((j) => j.id)

describe('job deals', () => {
  it('picks one stable featured job per day', () => {
    expect(featuredJob('2026-09-30')).toBe(featuredJob('2026-09-30'))
    const seen = new Set(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'].map(featuredJob))
    expect(seen.size).toBeGreaterThan(1)
  })

  it('doubles the merit of the first job of the day only', () => {
    const [a, b] = notFeatured()
    const base = jobReward(JOB_BY_ID[a], 3, 0)
    expect(jobDeals(a).find((d) => d.id === 'first')?.active).toBe(true)
    const bonus = jobDealBonus(JOB_BY_ID[a], 3, base)
    expect(bonus.merit).toBe(base.merit)
    expect(bonus.applied.map((x) => x.id)).toEqual(['first'])
    const m0 = game.value.merit
    const r1 = finishJob(a, 3)
    expect(r1.bonuses?.map((x) => x.id)).toContain('first')
    expect(game.value.merit - m0).toBe(r1.merit)
    expect(r1.merit).toBeGreaterThanOrEqual(base.merit * 2)
    // Second job: no first-job bonus any more.
    expect(jobDeals(b).find((d) => d.id === 'first')?.active).toBe(false)
    const r2 = finishJob(b, 3)
    expect(r2.bonuses?.map((x) => x.id) ?? []).not.toContain('first')
  })

  it('gives no deal for a zero-star play', () => {
    const [a] = notFeatured()
    const r = finishJob(a, 0)
    expect(r.bonuses).toEqual([])
    expect(jobDeals(a).find((d) => d.id === 'first')?.active).toBe(true)
  })

  it('pays the featured job 1.5x coins while full plays remain', () => {
    const f = featuredJob(game.value.daily.key)
    const def = JOB_BY_ID[f]
    const base = jobReward(def, 3, 1)
    game.value = { ...game.value, daily: { ...game.value.daily, counts: { ...game.value.daily.counts, [`job:${f}`]: 1 } } }
    const bonus = jobDealBonus(def, 3, base)
    expect(bonus.coins).toBe(Math.round(base.coins * 0.5))
    const capped = jobReward(def, 3, def.daily)
    game.value = { ...game.value, daily: { ...game.value.daily, counts: { [`job:${f}`]: def.daily } } }
    expect(jobDealBonus(def, 3, capped).coins).toBe(0)
  })

  it('adds the trio bonus once, on the third different job', () => {
    const ids = notFeatured()
    finishJob(ids[0], 2)
    finishJob(ids[0], 2)
    expect(jobDeals(ids[1]).find((d) => d.id === 'trio')?.active).toBe(false)
    finishJob(ids[1], 2)
    const trio = jobDeals(ids[2]).find((d) => d.id === 'trio')!
    expect(trio.active).toBe(true)
    expect(trio.progress).toEqual([2, 3])
    const c0 = game.value.coins
    const r = finishJob(ids[2], 2)
    expect(r.bonuses?.map((x) => x.id)).toContain('trio')
    expect(game.value.coins - c0).toBeGreaterThanOrEqual(TRIO_BONUS.coins)
    expect(game.value.daily.counts[TRIO_KEY]).toBe(1)
    const again = finishJob(ids[3], 2)
    expect(again.bonuses?.map((x) => x.id) ?? []).not.toContain('trio')
  })
})

describe('cooking deals', () => {
  const setup = (inv: Record<string, number>) => {
    game.value = { ...game.value, merit: meritForLevel(12), coins: 500, inventory: inv }
  }

  it('prices the missing set at 7-บุญ with 15% off for two or more kinds', () => {
    setup({})
    const q = bundleQuote('kaijiao')
    expect(q.lines.length).toBeGreaterThanOrEqual(2)
    expect(q.full).toBe(q.lines.reduce((a, l) => a + l.packs * l.price, 0))
    expect(q.deal).toBe(true)
    expect(q.price).toBe(Math.round(q.full * (1 - BUNDLE_OFF)))
    expect(q.price).toBeLessThan(q.full)
  })

  it('charges full price when only one kind is missing', () => {
    const full = { ...RECIPE_BY_ID.kaijiao.ingredients }
    const [first] = Object.keys(full)
    delete full[first]
    setup(full)
    const q = bundleQuote('kaijiao')
    expect(q.lines).toHaveLength(1)
    expect(q.deal).toBe(false)
    expect(q.price).toBe(q.full)
  })

  it('buys the whole set in one tap and makes the recipe cookable', () => {
    setup({})
    const q = bundleQuote('kaijiao')
    expect(C.canCook('kaijiao')).toBe(false)
    expect(buyBundle('kaijiao')).toBe(true)
    expect(game.value.coins).toBe(500 - q.price)
    expect(C.canCook('kaijiao')).toBe(true)
    expect(bundleQuote('kaijiao').lines).toHaveLength(0)
  })

  it('refuses when the player cannot afford the set', () => {
    setup({})
    game.value = { ...game.value, coins: 1 }
    expect(buyBundle('kaijiao')).toBe(false)
    expect(game.value.coins).toBe(1)
    expect(C.canCook('kaijiao')).toBe(false)
  })

  it('doubles the cooking merit for the first dish of the day', () => {
    setup({ ...RECIPE_BY_ID.kaijiao.ingredients, ...RECIPE_BY_ID.kaijiao.ingredients })
    game.value = { ...game.value, inventory: Object.fromEntries(Object.entries(RECIPE_BY_ID.kaijiao.ingredients).map(([k, n]) => [k, n * 2])) }
    expect(firstCookActive()).toBe(true)
    C.cook('kaijiao', 2)
    expect(firstCookActive()).toBe(false)
    const first = C.rewardCooking(2)
    C.cook('kaijiao', 2)
    const second = C.rewardCooking(2)
    expect(first).toBeGreaterThan(second)
    expect(first).toBeGreaterThanOrEqual(second * 2 - 1)
  })
})
