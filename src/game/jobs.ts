// Rewards and daily bookkeeping for the temple volunteer jobs.
//
// A play with at least one star uses up one of the job's daily full-reward
// plays (d.daily.counts[`job:<id>`]); once they are used up the rewards drop
// to 25%. A zero-star play only pays a token merit and is not counted.

import { game, mutate, type GameState } from './state'
import { addCoins, addMerit, track } from './actions'
import { JOB_BY_ID, JOBS, type JobDef } from './data/jobs'
import type { GameEvent } from './data/quests'
import type { MaterialId } from './materials'
import { jobDealBonus, TRIO_KEY, type JobBonus } from './workDeals'

export type JobStars = 0 | 1 | 2 | 3

/** Share of the full reward paid per star count. */
export const STAR_RATE: readonly number[] = [0, 0.5, 0.75, 1]
/** Share paid once the daily full-reward plays are used up. */
export const CAPPED_RATE = 0.25
/** Quest/stat event tracked on every counted play (add it to GameEvent). */
export const JOB_EVENT = 'job'

export const jobKey = (id: string) => `job:${id}`

/** Stars earned for a 0..1 score against three ascending thresholds. */
export function starsFor(value: number, thresholds: readonly [number, number, number]): JobStars {
  const eps = 1e-6
  if (value + eps >= thresholds[2]) return 3
  if (value + eps >= thresholds[1]) return 2
  if (value + eps >= thresholds[0]) return 1
  return 0
}

/** Clamp any number into a valid star count. */
export function toStars(n: number): JobStars {
  return Math.max(0, Math.min(3, Math.round(n))) as JobStars
}

export interface JobReward {
  merit: number
  coins: number
  mat?: { id: MaterialId; n: number }
  capped: boolean
}

/**
 * Base (pre-multiplier) reward for a play, given how many counted plays the
 * player already made today. Pure: no state is read or written.
 */
export function jobReward(def: JobDef, stars: JobStars, playsBefore: number): JobReward {
  if (stars <= 0) return { merit: 1, coins: 0, capped: playsBefore >= def.daily }
  const capped = playsBefore >= def.daily
  const rate = STAR_RATE[stars] * (capped ? CAPPED_RATE : 1)
  const merit = Math.max(1, Math.round(def.merit * rate))
  const coins = Math.max(capped ? 0 : 1, Math.round(def.coins * rate))
  const n = capped ? 0 : stars === 3 ? 2 : stars === 2 ? 1 : 0
  return { merit, coins, mat: def.mat && n > 0 ? { id: def.mat, n } : undefined, capped }
}

/** Counted plays of a job today. */
export function jobPlaysToday(id: string, s: GameState = game.value): number {
  return s.daily.counts[jobKey(id)] ?? 0
}

/** Full-reward plays left today for a job. */
export function jobFullLeft(id: string, s: GameState = game.value): number {
  const def = JOB_BY_ID[id]
  if (!def) return 0
  return Math.max(0, def.daily - jobPlaysToday(id, s))
}

/** Today's job plays: total, per job and how many different jobs were done. */
export function jobsDoneToday(s: GameState = game.value): { total: number; distinct: number; byJob: Record<string, number> } {
  const byJob: Record<string, number> = {}
  let total = 0
  for (const j of JOBS) {
    const n = jobPlaysToday(j.id, s)
    if (n > 0) byJob[j.id] = n
    total += n
  }
  return { total, distinct: Object.keys(byJob).length, byJob }
}

export interface JobResult {
  merit: number
  coins: number
  mat?: { id: MaterialId; n: number }
  capped: boolean
  /** Deals that paid out on this play (first job, featured job, trio). */
  bonuses?: JobBonus['applied']
}

/** Grant the rewards of a finished job and record the play. */
export function finishJob(id: string, stars: JobStars): JobResult {
  const def = JOB_BY_ID[id]
  if (!def) return { merit: 0, coins: 0, capped: false }
  const st = toStars(stars)
  const before = jobPlaysToday(id)
  const r = jobReward(def, st, before)
  const bonus = jobDealBonus(def, st, r)
  const merit = r.merit + bonus.merit > 0 ? addMerit(r.merit + bonus.merit) : 0
  const coins = r.coins + bonus.coins > 0 ? addCoins(r.coins + bonus.coins, { boost: true }) : 0
  mutate((d) => {
    if (bonus.trio) d.daily.counts[TRIO_KEY] = 1
    if (st > 0) d.daily.counts[jobKey(id)] = before + 1
    if (r.mat) d.materials[r.mat.id] = (d.materials[r.mat.id] ?? 0) + r.mat.n
  })
  // `'job'` is not in GameEvent yet; tracking it already records stats.job.
  if (st > 0) track(JOB_EVENT as string as GameEvent)
  return { merit, coins, mat: r.mat, capped: r.capped, bonuses: bonus.applied }
}
