import { describe, expect, it } from 'vitest'
import { balloonPoints, CORK_PRIZES, corkDamage, corkShotsNeeded, ringCatches, ringLanding, ROW_DEPTH, ROW_POINTS, ROW_SCALE } from '../rules'

describe('ปาลูกโป่ง scoring', () => {
  it('scores balloons by kind', () => {
    expect(balloonPoints('normal', 0)).toBe(1)
    expect(balloonPoints('gold', 0)).toBe(3)
    expect(balloonPoints('hippo', 0)).toBe(5)
  })

  it('adds a combo bonus from the third hit in a row', () => {
    expect(balloonPoints('normal', 1)).toBe(1)
    expect(balloonPoints('normal', 2)).toBe(2)
    expect(balloonPoints('hippo', 5)).toBe(6)
  })

  it('never scores the steel balloon', () => {
    expect(balloonPoints('steel', 0)).toBe(0)
    expect(balloonPoints('steel', 9)).toBe(0)
  })
})

describe('โยนห่วง throws', () => {
  it('turns a longer swipe into a farther throw, up to a cap', () => {
    expect(ringLanding(0, 0).depth).toBe(0)
    expect(ringLanding(0, 14).depth).toBe(0)
    expect(ringLanding(0, 64).depth).toBeCloseTo(1)
    expect(ringLanding(0, 114).depth).toBeCloseTo(2)
    expect(ringLanding(0, 999).depth).toBeCloseTo(2.6)
    expect(ringLanding(20, 64).lx).toBeCloseTo(18)
    expect(ringLanding(-10, 64).lx).toBeCloseTo(-9)
  })

  it('catches a bottle only near its row and position', () => {
    for (const row of [0, 1, 2]) {
      const d = ROW_DEPTH[row]
      expect(ringCatches(50, d, 50, row)).toBe(true)
      expect(ringCatches(50, d + 0.25, 50, row)).toBe(true)
      expect(ringCatches(50, d + 0.35, 50, row)).toBe(false)
      const reach = 4 * ROW_SCALE[row] + 2
      expect(ringCatches(50 + reach - 0.1, d, 50, row)).toBe(true)
      expect(ringCatches(50 + reach + 0.1, d, 50, row)).toBe(false)
    }
    expect(ringCatches(50, 3, 50, 3)).toBe(false)
  })

  it('makes back rows narrower and worth more', () => {
    for (let r = 1; r < 3; r++) {
      expect(ROW_SCALE[r]).toBeLessThan(ROW_SCALE[r - 1])
      expect(ROW_POINTS[r]).toBeGreaterThan(ROW_POINTS[r - 1])
    }
  })

  it('lands a perfect swipe on the bottle it aims at', () => {
    for (const row of [0, 1, 2]) {
      const dy = 14 + (ROW_DEPTH[row] / 2) * 100
      const { lx, depth } = ringLanding(10 / 0.9, dy)
      expect(ringCatches(lx, depth, 10, row)).toBe(true)
    }
  })
})

describe('ยิงปืนจุก damage', () => {
  it('knocks small prizes over in one shot', () => {
    expect(corkShotsNeeded('can', 0.5)).toBe(1)
    expect(corkShotsNeeded('candy', 0.5)).toBe(1)
    expect(corkShotsNeeded('duck', 0.5)).toBe(1)
  })

  it('needs two shots for dolls and three for the big teddy, fewer at the head', () => {
    expect(corkShotsNeeded('doll', 0.2)).toBe(2)
    expect(corkShotsNeeded('teddy', 0.8)).toBe(3)
    expect(corkShotsNeeded('teddy', 0.2)).toBe(2)
    expect(corkDamage('teddy', 0.1)).toBe(2)
    expect(corkDamage('doll', 0.1)).toBe(1)
  })

  it('makes tougher prizes worth more', () => {
    expect(CORK_PRIZES.teddy.pts).toBeGreaterThan(CORK_PRIZES.doll.pts)
    expect(CORK_PRIZES.doll.pts).toBeGreaterThan(CORK_PRIZES.can.pts)
  })
})
