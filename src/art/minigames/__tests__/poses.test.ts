import { describe, expect, it } from 'vitest'
import { T_POSE_NAMES, isTPose, tPoseViews, tWrist, tp } from '../../poses/temple'

describe('temple action poses', () => {
  it('prefixes every pose with act_t_', () => {
    for (const n of T_POSE_NAMES) expect(tp(n).startsWith('act_t_')).toBe(true)
    expect(isTPose('alms_give')).toBe(true)
    expect(isTPose('wai')).toBe(false)
  })

  it('authors at least one view per pose, with hands inside the doll frame', () => {
    for (const n of T_POSE_NAMES) {
      const views = tPoseViews(n)
      expect(views.length).toBeGreaterThan(0)
      for (const v of views)
        for (const g of ['m', 'f'] as const)
          for (const side of [1, -1] as const) {
            const w = tWrist(n, v, side, g)
            if (!w) continue
            expect(w[0]).toBeGreaterThanOrEqual(1)
            expect(w[0]).toBeLessThanOrEqual(33)
            expect(w[1]).toBeGreaterThanOrEqual(1)
            expect(w[1]).toBeLessThanOrEqual(51)
          }
    }
  })

  it('mirrors wrists when the doll is flipped', () => {
    const a = tWrist('toss_throw', 'back', -1, 'm')!
    const b = tWrist('toss_throw', 'back', -1, 'm', true)!
    expect(a[0] + b[0]).toBeCloseTo(34)
    expect(a[1]).toBe(b[1])
  })
})
