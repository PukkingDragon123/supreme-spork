import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../state'
import * as A from '../actions'
import * as P from '../prayer'
import { CHAPTERS, STAGES, STAGE_BY_ID, stageLines, chantById } from '../data/prayers'
import { notices } from '../events'
import type { ChantResult } from '../chantScore'

const result = (score: number, stars: 0 | 1 | 2 | 3): ChantResult => ({
  score,
  stars,
  grade: 'A',
  perfect: 10,
  good: 0,
  miss: 0,
  maxCombo: 10,
  rhythm: score,
  flow: score,
  focus: score,
  completeness: score,
})

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  notices.value = []
  A.ensureDaily()
})

describe('prayer stages data', () => {
  it('every stage points at a real chant with lines', () => {
    for (const st of STAGES) {
      expect(chantById(st.chant).id).toBe(st.chant)
      expect(stageLines(st).length).toBeGreaterThan(0)
    }
  })
  it('stage numbers are contiguous per chapter', () => {
    for (const c of CHAPTERS) {
      const ns = STAGES.filter((s) => s.chapter === c.id).map((s) => s.n)
      expect(ns).toEqual(ns.map((_, i) => i + 1))
    }
  })
})

describe('unlocks', () => {
  it('opens stages one by one and chapters by stars', () => {
    expect(P.stageUnlocked(STAGE_BY_ID['wat-1'])).toBe(true)
    expect(P.stageUnlocked(STAGE_BY_ID['wat-2'])).toBe(false)
    expect(P.chapterUnlocked('shrine')).toBe(false)
    P.finishPrayer('wat-1', result(80, 2), 'voice')
    expect(P.stageUnlocked(STAGE_BY_ID['wat-2'])).toBe(true)
    expect(P.nextStage().id).toBe('wat-2')
    for (let n = 2; n <= 4; n++) P.finishPrayer(`wat-${n}`, result(95, 3), 'voice')
    expect(P.totalStars()).toBe(11)
    expect(P.chapterUnlocked('shrine')).toBe(true)
    expect(game.value.areas).toContain('shrine')
  })
})

describe('rewards', () => {
  it('first clear gives the stage materials, replays give a little', () => {
    const st = STAGE_BY_ID['wat-3']
    const first = P.computeReward(st, { score: 90, stars: 3 }, 0, 'voice')
    expect(first.mats).toEqual(st.mats)
    expect(first.newStars).toBe(3)
    const again = P.computeReward(st, { score: 90, stars: 3 }, 3, 'voice', 1)
    const total = Object.values(again.mats).reduce((a, b) => a + (b ?? 0), 0)
    expect(total).toBe(2)
    expect(again.coins).toBeLessThan(first.coins)
  })
  it('singing with the microphone is worth more than tapping', () => {
    const st = STAGE_BY_ID['wat-2']
    expect(P.computeReward(st, { score: 80, stars: 2 }, 0, 'voice').merit).toBeGreaterThan(P.computeReward(st, { score: 80, stars: 2 }, 0, 'tap').merit)
  })
  it('a failed prayer (0 stars) gives no materials', () => {
    expect(P.computeReward(STAGE_BY_ID['wat-1'], { score: 30, stars: 0 }, 0, 'tap').mats).toEqual({})
  })
  it('finishPrayer records stars, best, streak and adds materials', () => {
    const before = game.value.materials.flower
    const r = P.finishPrayer('wat-1', result(70, 1), 'voice')
    expect(r.firstClear).toBe(true)
    expect(r.merit).toBeGreaterThan(0)
    expect(game.value.prayer.stars['wat-1']).toBe(1)
    expect(game.value.prayer.best['wat-1']).toBe(70)
    expect(game.value.prayer.streak).toBe(1)
    expect(game.value.materials.flower).toBe(before + 2)
    P.finishPrayer('wat-1', result(50, 1), 'voice')
    expect(game.value.prayer.best['wat-1']).toBe(70)
    const r3 = P.finishPrayer('wat-1', result(99, 3), 'voice')
    expect(r3.goalDone).toBe(true)
    expect(P.prayersToday()).toBe(3)
    expect(game.value.prayer.stars['wat-1']).toBe(3)
  })
})
