// Small pure rules shared by the temple mini-games: star ratings, combo
// praise and rhythm timing. Stars are a cosmetic score; the merit rewards
// stay exactly as each activity grants them.

export type Stars = 0 | 1 | 2 | 3

/** Count how many ascending thresholds `value` reaches (0..3). */
export function starsFrom(value: number, t: [number, number, number]): Stars {
  let n = 0
  for (const x of t) if (value >= x) n++
  return n as Stars
}

/** Praise shouted at combo milestones (null when nothing to say). */
export function comboPraise(combo: number): string | null {
  if (combo >= 12 && combo % 4 === 0) return 'บุญล้นแก้ว!'
  switch (combo) {
    case 3:
      return 'ดีมาก!'
    case 5:
      return 'เยี่ยม!'
    case 7:
      return 'สุดยอด!'
    case 9:
      return 'เทพมาก!'
    default:
      return null
  }
}

export type Timing = 'perfect' | 'good' | 'miss'

/**
 * Grade a tap against a steady beat: `phase` is the time since the last beat,
 * `period` the beat length. Close to either beat edge is perfect.
 */
export function beatTiming(phase: number, period: number): Timing {
  const p = ((phase % period) + period) % period
  const err = Math.min(p, period - p)
  if (err <= period * 0.16) return 'perfect'
  if (err <= period * 0.32) return 'good'
  return 'miss'
}

/** Words for each star count on the result card. */
export const STAR_WORDS = ['ไว้ลองใหม่นะ', 'ดีแล้ว', 'เก่งมาก', 'ยอดเยี่ยม!'] as const

/** Fill accuracy for hold-to-fill meters (holy water, rice scoop): 1 = dead centre of the gold zone. */
export function fillStars(fill: number, lo: number, hi: number): Stars {
  if (fill < lo * 0.5) return 0
  const mid = (lo + hi) / 2
  if (fill >= lo && fill <= hi) return Math.abs(fill - mid) <= (hi - lo) * 0.25 ? 3 : 2
  return 1
}
