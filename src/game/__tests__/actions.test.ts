import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../state'
import * as A from '../actions'
import { QUEST_POOL } from '../data/quests'
import { notices } from '../events'
import { meritForLevel } from '../economy'
import { dayKey } from '../time'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  notices.value = []
  A.ensureDaily()
})

describe('daily rollover', () => {
  it('rolls four quests on different events', () => {
    const q = game.value.daily.quests
    expect(q).toHaveLength(4)
    const events = q.map((x) => QUEST_POOL.find((d) => d.id === x.id)!.event)
    expect(new Set(events).size).toBe(4)
  })

  it('is deterministic for the same day and player', () => {
    const a = A.rollQuests('2026-09-24', 'BD-AAAAAA', 5, ['home'])
    const b = A.rollQuests('2026-09-24', 'BD-AAAAAA', 5, ['home'])
    expect(a).toEqual(b)
  })
})

describe('merit and coins', () => {
  it('adds merit to the lifetime, weekly and daily totals', () => {
    const got = A.addMerit(10)
    expect(got).toBeGreaterThan(0)
    expect(game.value.merit).toBe(got)
    expect(game.value.week.merit).toBe(got)
    expect(game.value.days[dayKey()]).toBe(got)
  })

  it('levels up with coins and a notice', () => {
    const coins = game.value.coins
    A.grantMeritRaw(meritForLevel(3))
    expect(game.value.coins).toBeGreaterThan(coins)
    expect(notices.value.some((n) => n.notice.kind === 'levelup')).toBe(true)
    // Level 3 opens the deity plaza.
    expect(A.isAreaUnlocked('shrine')).toBe(true)
  })

  it('refuses to spend more coins than the player has', () => {
    game.value = { ...game.value, coins: 5 }
    expect(A.spendCoins(10, true)).toBe(false)
    expect(game.value.coins).toBe(5)
  })

  it('buys packs of consumables', () => {
    const before = A.count('fish_food')
    expect(A.buyItem('fish_food')).toBe(true)
    expect(A.count('fish_food')).toBe(before + 12)
  })

  it('stacks buffs additively', () => {
    A.addBuff('merit', 2, 10, 'a')
    A.addBuff('merit', 1.5, 10, 'b')
    expect(A.buffMult('merit')).toBeCloseTo(2.5)
  })
})

describe('quests', () => {
  it('tracks progress and pays out once', () => {
    const q = game.value.daily.quests[0]
    const def = QUEST_POOL.find((d) => d.id === q.id)!
    A.track(def.event, def.target)
    const coins = game.value.coins
    expect(A.claimQuest(q.id)).toBe(true)
    expect(game.value.coins).toBeGreaterThan(coins)
    expect(A.claimQuest(q.id)).toBe(false)
  })
})

describe('temple dogs', () => {
  it('gains hearts and gets full after three meals', () => {
    game.value = { ...game.value, inventory: { ...game.value.inventory, dog_food: 10, chicken: 1 } }
    expect(A.feedDog('somo', 'chicken').ok).toBe(true)
    expect(A.dogState('somo').hearts).toBe(2)
    A.feedDog('somo', 'dog_food')
    A.feedDog('somo', 'dog_food')
    expect(A.feedDog('somo', 'dog_food').full).toBe(true)
  })
})

describe('lucky numbers', () => {
  it('are stable for a seed and use up the daily chance', () => {
    expect(A.luckyNumbers('x')).toEqual(A.luckyNumbers('x'))
    expect(A.lotteryLeft()).toBe(1)
    const n = A.useLottery('tree')
    expect(n?.three).toMatch(/^\d{3}$/)
    expect(A.lotteryLeft()).toBe(0)
    expect(A.useLottery('tree')).toBeNull()
  })
})

describe('login streak', () => {
  it('continues from yesterday and resets after a gap', () => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    game.value = { ...game.value, login: { streak: 4, last: dayKey(y), best: 4 } }
    expect(A.loginInfo().streak).toBe(5)
    const old = new Date()
    old.setDate(old.getDate() - 3)
    game.value = { ...game.value, login: { streak: 4, last: dayKey(old), best: 4 } }
    expect(A.loginInfo().streak).toBe(1)
  })
})

describe('purchases', () => {
  it('grants coins and bonus for a pack', () => {
    const before = game.value.coins
    expect(A.completePurchase('boondee.coins.300', 'test-1')).toBe(true)
    expect(game.value.coins).toBe(before + 330)
    expect(game.value.purchases[0].id).toBe('boondee.coins.300')
  })

  it('unlocks the limited shirt with the starter pack', () => {
    A.completePurchase('boondee.starter', 'test-2')
    expect(game.value.starterBought).toBe(true)
    expect(game.value.outfits).toContain('top_boondee')
  })
})
