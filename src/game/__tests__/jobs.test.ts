import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../state'
import { ensureDaily } from '../actions'
import { JOBS, JOB_BY_ID, JOB_GOALS } from '../data/jobs'
import { CAPPED_RATE, finishJob, jobFullLeft, jobKey, jobPlaysToday, jobReward, jobsDoneToday, starsFor, toStars } from '../jobs'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  ensureDaily()
})

describe('job data', () => {
  it('defines all nine volunteer jobs with how-to cards', () => {
    const ids = ['sweep_leaves', 'mop_floor', 'feed_fish', 'feed_catfish', 'arrange_shoes', 'light_candles', 'water_plants', 'polish_brass', 'wipe_statues']
    expect(JOBS.map((j) => j.id).sort()).toEqual([...ids].sort())
    for (const id of ids) {
      const j = JOB_BY_ID[id]
      expect(j).toBeTruthy()
      expect(j.merit).toBeGreaterThan(0)
      expect(j.coins).toBeGreaterThan(0)
      expect(j.daily).toBeGreaterThan(0)
      expect(j.time).toBeGreaterThanOrEqual(20)
      expect(j.time).toBeLessThanOrEqual(45)
      const g = JOB_GOALS[j.id]
      expect(g.steps).toHaveLength(3)
      expect(g.goal.length).toBeGreaterThan(0)
    }
  })
})

describe('stars', () => {
  it('maps a score onto three thresholds', () => {
    const t = [0.4, 0.7, 1] as const
    expect(starsFor(0, t)).toBe(0)
    expect(starsFor(0.39, t)).toBe(0)
    expect(starsFor(0.4, t)).toBe(1)
    expect(starsFor(0.7, t)).toBe(2)
    expect(starsFor(0.999_999_9, t)).toBe(3)
    expect(starsFor(1.2, t)).toBe(3)
  })

  it('clamps star counts', () => {
    expect(toStars(-2)).toBe(0)
    expect(toStars(2.4)).toBe(2)
    expect(toStars(9)).toBe(3)
  })
})

describe('jobReward', () => {
  const def = JOB_BY_ID.sweep_leaves

  it('pays in full for three stars and less for fewer', () => {
    const r3 = jobReward(def, 3, 0)
    const r2 = jobReward(def, 2, 0)
    const r1 = jobReward(def, 1, 0)
    expect(r3).toMatchObject({ merit: def.merit, coins: def.coins, capped: false })
    expect(r3.mat).toEqual({ id: def.mat, n: 2 })
    expect(r2.merit).toBeLessThan(r3.merit)
    expect(r2.mat?.n).toBe(1)
    expect(r1.merit).toBeLessThan(r2.merit)
    expect(r1.mat).toBeUndefined()
  })

  it('drops to a quarter after the daily cap', () => {
    const r = jobReward(def, 3, def.daily)
    expect(r.capped).toBe(true)
    expect(r.merit).toBe(Math.round(def.merit * CAPPED_RATE))
    expect(r.mat).toBeUndefined()
  })

  it('gives a token merit for zero stars', () => {
    expect(jobReward(def, 0, 0)).toMatchObject({ merit: 1, coins: 0 })
  })
})

describe('finishJob', () => {
  it('grants merit, coins and materials and counts the play', () => {
    const coins = game.value.coins
    const r = finishJob('mop_floor', 3)
    expect(r.capped).toBe(false)
    expect(r.merit).toBeGreaterThan(0)
    expect(game.value.merit).toBe(r.merit)
    expect(game.value.coins).toBe(coins + r.coins)
    expect(game.value.materials.cloth).toBe(2)
    expect(jobPlaysToday('mop_floor')).toBe(1)
    expect(game.value.daily.counts[jobKey('mop_floor')]).toBe(1)
    expect(jobFullLeft('mop_floor')).toBe(JOB_BY_ID.mop_floor.daily - 1)
  })

  it('caps rewards once the daily plays are used up', () => {
    const def = JOB_BY_ID.feed_fish
    const full = finishJob('feed_fish', 3)
    for (let i = 1; i < def.daily; i++) finishJob('feed_fish', 3)
    expect(jobFullLeft('feed_fish')).toBe(0)
    const late = finishJob('feed_fish', 3)
    expect(late.capped).toBe(true)
    expect(late.merit).toBeLessThan(full.merit)
    expect(late.mat).toBeUndefined()
    expect(jobPlaysToday('feed_fish')).toBe(def.daily + 1)
  })

  it('does not count zero-star plays', () => {
    const r = finishJob('light_candles', 0)
    expect(r.merit).toBe(1)
    expect(jobPlaysToday('light_candles')).toBe(0)
  })

  it('summarises the day and ignores unknown jobs', () => {
    finishJob('sweep_leaves', 2)
    finishJob('sweep_leaves', 1)
    finishJob('wipe_statues', 3)
    expect(jobsDoneToday()).toEqual({ total: 3, distinct: 2, byJob: { sweep_leaves: 2, wipe_statues: 1 } })
    expect(finishJob('nope', 3)).toEqual({ merit: 0, coins: 0, capped: false })
    expect(game.value.stats['job' as never]).toBe(3)
  })
})
