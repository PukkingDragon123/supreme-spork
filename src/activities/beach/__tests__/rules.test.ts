import { describe, expect, it } from 'vitest'
import { CHEDI_TIERS, calmBonus, chediScore, keepBest, REEF_FISH, SHELL_POINTS, spotTime, stackTier, steerTurtle, wavePoints } from '../rules'

describe('sand chedi', () => {
  it('keeps the overlap and crumbles the overhang', () => {
    const base = { x: 100, w: 36 }
    const perfect = stackTier(base, 100, 30)
    expect(perfect.tier).toEqual({ x: 100, w: 30 })
    expect(perfect.lost).toBe(0)
    expect(perfect.ratio).toBe(1)
    const off = stackTier(base, 110, 30)
    // Base spans 82..118, the drop 95..125: 23 px stay, centred at 106.5.
    expect(off.tier.w).toBeCloseTo(23)
    expect(off.tier.x).toBeCloseTo(106.5)
    expect(off.lost).toBeCloseTo(7)
    expect(off.ratio).toBeCloseTo(23 / 30)
    const miss = stackTier(base, 200, 30)
    expect(miss.tier.w).toBe(2)
    expect(miss.ratio).toBe(0)
  })

  it('scores stacking, smoothing and decorations', () => {
    const all = CHEDI_TIERS.map(() => 1)
    expect(chediScore(all, 1, 6)).toBeCloseTo(1)
    expect(chediScore([], 0, 0)).toBe(0)
    expect(chediScore(all, 0, 0)).toBeCloseTo(0.5)
    expect(chediScore(all, 1, 3)).toBeCloseTo(0.85)
    expect(chediScore(all, 5, 60)).toBe(1)
  })
})

describe('shells', () => {
  it('points go up with rarity', () => {
    expect(SHELL_POINTS.common).toBeLessThan(SHELL_POINTS.rare)
    expect(SHELL_POINTS.legendary).toBeGreaterThan(SHELL_POINTS.epic)
  })

  it('takes home the best three, earliest first on ties', () => {
    const f = [
      { id: 'a', rarity: 'common' as const },
      { id: 'b', rarity: 'rare' as const },
      { id: 'c', rarity: 'common' as const },
      { id: 'd', rarity: 'legendary' as const },
      { id: 'e', rarity: 'rare' as const },
    ]
    expect(keepBest(f).map((x) => x.id)).toEqual(['d', 'b', 'e'])
    expect(keepBest(f.slice(0, 1)).map((x) => x.id)).toEqual(['a'])
  })
})

describe('turtles, banana boat, reef', () => {
  it('nudges hatchlings toward the sea', () => {
    const up = -Math.PI / 2
    expect(steerTurtle(0, 1)).toBeCloseTo(up)
    expect(steerTurtle(0, 0)).toBe(0)
    expect(Math.abs(steerTurtle(-0.3, 0.5) - up)).toBeLessThan(Math.abs(-0.3 - up))
  })

  it('pays for holding on through big waves and punishes letting go', () => {
    expect(wavePoints(true, true)).toEqual({ pts: 2, wobble: false })
    expect(wavePoints(false, true)).toEqual({ pts: 1, wobble: false })
    expect(wavePoints(true, false)).toEqual({ pts: -1, wobble: true })
    expect(wavePoints(false, false)).toEqual({ pts: 0, wobble: false })
    expect(calmBonus(1.3)).toBe(1)
    expect(calmBonus(0.5)).toBe(0)
  })

  it('has unique reef fish and shy rare ones', () => {
    expect(new Set(REEF_FISH.map((f) => f.id)).size).toBe(REEF_FISH.length)
    const rare = REEF_FISH.find((f) => f.rare)!
    const common = REEF_FISH.find((f) => !f.rare)!
    expect(spotTime(rare)).toBeGreaterThan(spotTime(common))
  })
})
