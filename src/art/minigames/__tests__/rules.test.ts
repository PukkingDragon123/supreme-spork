import { describe, expect, it } from 'vitest'
import { beatTiming, comboPraise, fillStars, starsFrom, STAR_WORDS } from '../rules'

describe('temple mini-game rules', () => {
  it('counts stars against ascending thresholds', () => {
    expect(starsFrom(0, [1, 5, 10])).toBe(0)
    expect(starsFrom(1, [1, 5, 10])).toBe(1)
    expect(starsFrom(7, [1, 5, 10])).toBe(2)
    expect(starsFrom(10, [1, 5, 10])).toBe(3)
    expect(starsFrom(99, [1, 5, 10])).toBe(3)
  })

  it('praises combo milestones only', () => {
    expect(comboPraise(1)).toBeNull()
    expect(comboPraise(3)).toBe('ดีมาก!')
    expect(comboPraise(5)).toBe('เยี่ยม!')
    expect(comboPraise(6)).toBeNull()
    expect(comboPraise(12)).toBe('บุญล้นแก้ว!')
    expect(comboPraise(13)).toBeNull()
  })

  it('grades taps against the beat, symmetric around it', () => {
    expect(beatTiming(0, 1)).toBe('perfect')
    expect(beatTiming(0.95, 1)).toBe('perfect')
    expect(beatTiming(0.25, 1)).toBe('good')
    expect(beatTiming(0.5, 1)).toBe('miss')
    expect(beatTiming(3.02, 1)).toBe('perfect')
    expect(beatTiming(-0.1, 1)).toBe('perfect')
  })

  it('rates hold-to-fill accuracy', () => {
    expect(fillStars(0.2, 0.8, 1.05)).toBe(0)
    expect(fillStars(0.6, 0.8, 1.05)).toBe(1)
    expect(fillStars(0.82, 0.8, 1.05)).toBe(2)
    expect(fillStars(0.93, 0.8, 1.05)).toBe(3)
    expect(fillStars(1.2, 0.8, 1.05)).toBe(1)
  })

  it('has a word for every star count', () => {
    expect(STAR_WORDS).toHaveLength(4)
  })
})
