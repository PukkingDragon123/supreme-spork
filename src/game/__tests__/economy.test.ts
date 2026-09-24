import { describe, expect, it } from 'vitest'
import { applyMerit, expToNext, levelFromMerit, loginReward, meritForLevel, repeatFactor, titleFor } from '../economy'

describe('levels', () => {
  it('starts at level 1', () => {
    expect(levelFromMerit(0)).toEqual({ level: 1, into: 0, need: expToNext(1) })
  })

  it('requires more merit for every level', () => {
    for (let l = 1; l < 49; l++) expect(expToNext(l + 1)).toBeGreaterThan(expToNext(l))
  })

  it('round-trips meritForLevel', () => {
    for (const l of [2, 5, 10, 20]) {
      const r = levelFromMerit(meritForLevel(l))
      expect(r.level).toBe(l)
      expect(r.into).toBe(0)
    }
  })

  it('has a title for every level', () => {
    expect(titleFor(1)).toBe('สายบุญฝึกหัด')
    expect(titleFor(12)).toBe('ผู้ใจบุญ')
  })
})

describe('merit multipliers', () => {
  const base = { buffMult: 1, luckyColor: false, morningAlms: false, areaBonus: 1, repeat: 1 }

  it('doubles for morning alms and adds 10% for the lucky colour', () => {
    expect(applyMerit(10, { ...base, morningAlms: true })).toBe(20)
    expect(applyMerit(10, { ...base, luckyColor: true })).toBe(11)
  })

  it('never rounds a positive reward down to zero', () => {
    expect(applyMerit(1, { ...base, repeat: 0.2 })).toBe(1)
  })

  it('tapers repeated activities to a floor', () => {
    expect(repeatFactor(0, 3)).toBe(1)
    expect(repeatFactor(2, 3)).toBe(1)
    expect(repeatFactor(3, 3)).toBeLessThan(1)
    expect(repeatFactor(100, 3)).toBe(0.2)
  })
})

describe('login rewards', () => {
  it('cycles every seven days with a big day 7', () => {
    expect(loginReward(1).coins).toBe(10)
    expect(loginReward(7).item).toBe('sangkhathan')
    expect(loginReward(8)).toEqual(loginReward(1))
  })
})
