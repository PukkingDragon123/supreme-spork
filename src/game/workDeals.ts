// Deals shown on the job and recipe brief cards, and applied for real:
//
//   Jobs    · งานแรกของวัน    first counted job of the day pays merit ×2
//           · งานด่วนวันนี้    one featured job a day pays coins ×1.5 (full plays)
//           · ครบ 3 งาน       the 3rd different job of the day adds +30 บุญ +20 coins (once a day)
//   Cooking · ชุดวัตถุดิบ     buying every missing ingredient of a recipe at once
//                              (2+ kinds) is 15% off at 7-บุญ
//           · จานแรกของวัน    the first dish cooked today doubles the cooking merit
//
// Daily bookkeeping lives in daily.counts (reset with the day).

import { game, mutate, type GameState } from './state'
import { spendCoins } from './actions'
import { JOB_BY_ID, JOBS, type JobDef, type JobId } from './data/jobs'
import { ITEM_BY_ID } from './data/items'
import { missingIngredients } from './cooking'
export { FIRST_COOK_MULT } from './cooking'

export const FIRST_JOB_MERIT_MULT = 2
export const FEATURED_COIN_MULT = 1.5
export const TRIO_BONUS = { merit: 30, coins: 20 } as const
export const TRIO_KEY = 'jobTrio'
export const BUNDLE_OFF = 0.15

export type JobDealId = 'first' | 'featured' | 'trio'

export interface JobDeal {
  id: JobDealId
  /** Short chip label. */
  label: string
  /** One-line explanation. */
  detail: string
  /** Applies if the player finishes this job now (with at least one star). */
  active: boolean
  /** e.g. [1, 3] different jobs done toward the trio bonus. */
  progress?: [number, number]
}

function counted(s: GameState, id: string) {
  return s.daily.counts[`job:${id}`] ?? 0
}

function jobsToday(s: GameState) {
  let total = 0
  let distinct = 0
  for (const j of JOBS) {
    const n = counted(s, j.id)
    total += n
    if (n > 0) distinct++
  }
  return { total, distinct }
}

/** Deterministic featured ("urgent") job for a day key. */
export function featuredJob(dayKey: string): JobId {
  let h = 2166136261
  for (let i = 0; i < dayKey.length; i++) h = Math.imul(h ^ dayKey.charCodeAt(i), 16777619) >>> 0
  return JOBS[h % JOBS.length].id
}

/** Deals for a job, as shown on its brief card. */
export function jobDeals(jobId: string, s: GameState = game.value): JobDeal[] {
  const def = JOB_BY_ID[jobId]
  if (!def) return []
  const { total, distinct } = jobsToday(s)
  const full = counted(s, jobId) < def.daily
  const after = distinct + (counted(s, jobId) === 0 ? 1 : 0)
  const trioDone = !!s.daily.counts[TRIO_KEY]
  return [
    { id: 'first', label: 'งานแรกของวัน บุญ ×2', detail: total === 0 ? 'ยังไม่ได้ทำงานวันนี้ งานนี้ได้บุญสองเท่า!' : 'ใช้สิทธิ์ไปแล้ว พรุ่งนี้มาใหม่นะ', active: total === 0 },
    {
      id: 'featured',
      label: 'งานด่วนวันนี้ เหรียญ ×1.5',
      detail: featuredJob(s.daily.key) === def.id ? (full ? 'หลวงพ่อฝากด่วน ได้เหรียญเพิ่มครึ่งหนึ่ง' : 'รอบรางวัลเต็มหมดแล้ว') : `วันนี้งานด่วนคือ ${JOB_BY_ID[featuredJob(s.daily.key)].name}`,
      active: featuredJob(s.daily.key) === def.id && full,
    },
    {
      id: 'trio',
      label: `ครบ 3 งาน +${TRIO_BONUS.merit} บุญ +${TRIO_BONUS.coins}`,
      detail: trioDone ? 'รับโบนัสครบ 3 งานแล้ววันนี้' : after >= 3 ? 'ทำงานนี้เสร็จ รับโบนัสครบ 3 งานเลย!' : `ทำงานต่างกันให้ครบ 3 งาน (${distinct}/3)`,
      active: !trioDone && after >= 3,
      progress: [Math.min(3, distinct), 3],
    },
  ]
}

export interface JobBonus {
  merit: number
  coins: number
  applied: { id: JobDealId; label: string }[]
  /** The trio bonus is paid by this play (mark it done). */
  trio: boolean
}

/**
 * Extra base merit / coins the deals add to a play's reward. Pure: `s` is the
 * state before the play is recorded.
 */
export function jobDealBonus(def: JobDef, stars: number, reward: { merit: number; coins: number; capped: boolean }, s: GameState = game.value): JobBonus {
  const out: JobBonus = { merit: 0, coins: 0, applied: [], trio: false }
  if (stars <= 0) return out
  const deals = jobDeals(def.id, s)
  const on = (id: JobDealId) => deals.find((d) => d.id === id)
  if (on('first')?.active) {
    out.merit += Math.round(reward.merit * (FIRST_JOB_MERIT_MULT - 1))
    out.applied.push({ id: 'first', label: 'งานแรกของวัน บุญ ×2' })
  }
  if (on('featured')?.active && !reward.capped) {
    out.coins += Math.round(reward.coins * (FEATURED_COIN_MULT - 1))
    out.applied.push({ id: 'featured', label: 'งานด่วนวันนี้ เหรียญ ×1.5' })
  }
  if (on('trio')?.active) {
    out.merit += TRIO_BONUS.merit
    out.coins += TRIO_BONUS.coins
    out.trio = true
    out.applied.push({ id: 'trio', label: `โบนัสครบ 3 งาน +${TRIO_BONUS.merit} บุญ` })
  }
  return out
}

// ---------------------------------------------------------------------------
// Cooking

export interface MartLine {
  id: string
  name: string
  packs: number
  /** Price per pack at 7-บุญ. */
  price: number
  total: number
}

export interface BundleQuote {
  lines: MartLine[]
  /** Sum at list price. */
  full: number
  /** What the player pays. */
  price: number
  /** The 15% set discount applies (2+ kinds missing). */
  deal: boolean
}

/** Price every missing ingredient of a recipe at the 7-บุญ mart, with the set deal. */
export function bundleQuote(recipeId: string, inv: Record<string, number> = game.value.inventory): BundleQuote {
  const lines: MartLine[] = []
  for (const [id, need] of Object.entries(missingIngredients(recipeId, inv))) {
    const it = ITEM_BY_ID[id]
    if (!it) continue
    const packs = Math.ceil(need / (it.pack ?? 1))
    lines.push({ id, name: it.name, packs, price: it.price, total: packs * it.price })
  }
  const full = lines.reduce((a, l) => a + l.total, 0)
  const deal = lines.length >= 2
  return { lines, full, price: deal ? Math.round(full * (1 - BUNDLE_OFF)) : full, deal }
}

/** Buy the whole missing set in one tap at the quoted (discounted) price. */
export function buyBundle(recipeId: string): boolean {
  const q = bundleQuote(recipeId)
  if (!q.lines.length) return true
  if (!spendCoins(q.price)) return false
  mutate((d) => {
    for (const l of q.lines) d.inventory[l.id] = (d.inventory[l.id] ?? 0) + l.packs * (ITEM_BY_ID[l.id]?.pack ?? 1)
    d.daily.counts['martBundle'] = (d.daily.counts['martBundle'] ?? 0) + 1
  })
  return true
}

/** The next dish cooked today is the first (cooking merit ×2). */
export function firstCookActive(s: GameState = game.value): boolean {
  return (s.daily.counts['cooked'] ?? 0) === 0
}
