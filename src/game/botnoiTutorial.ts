// The interactive tutorial's step machine (pure; the UI lives in
// src/ui/botnoi/). Each step completes when the player actually does the
// thing: a tracked game event (see actions.track / onTrack) or a UI signal
// raised by the tutorial controller (bag opened, prayer started, map
// opened, furniture mode…). Read-only steps complete with "ต่อไป".
//
// The machine never soft-locks: every step can be skipped (`skipStep`), the
// whole tutorial can be skipped (`skip`), and "back" signals only ever move
// to an earlier step (e.g. leaving a prayer before finishing it).

import type { GameEvent } from './data/quests'
import type { BotnoiState } from './botnoiState'

/** UI signals raised by the tutorial controller (src/ui/botnoi/tutorialCtl.ts). */
export type TutUi =
  | 'walked'
  | 'bag_open'
  | 'bag_close'
  | 'pray_open'
  | 'pray_close'
  | 'pray_start'
  | 'pray_quit'
  | 'quests_open'
  | 'claimed'
  | 'map_open'
  | 'map_close'
  | 'shop_open'
  | 'gift'
  | 'house'
  | 'edit_on'
  | 'edit_off'

export type TutStepId = 'hello' | 'incense' | 'merit' | 'pray' | 'quests' | 'npc' | 'map' | 'shop' | 'decorate' | 'finish'

export interface TutStepDef {
  id: TutStepId
  /** Completes on any of these tracked events. */
  events?: GameEvent[]
  /** Completes on any of these UI signals. */
  ui?: TutUi[]
  /** Read-only step: completes with the bubble's "ต่อไป" button. */
  next?: boolean
  /** UI signals that send the player back to an earlier step. */
  back?: Partial<Record<TutUi, TutStepId>>
  /** Counted in the "ขั้นที่ x/y" progress (the greeting and finale are not). */
  counted?: boolean
}

/**
 * A short, relaxed tour: steps can be done in any order (each completes
 * whenever it happens, even while the tutorial is paused); Bot Noi just
 * suggests the next unfinished one.
 */
export const TUT_STEPS: TutStepDef[] = [
  { id: 'hello', next: true },
  { id: 'incense', events: ['wish'], counted: true },
  { id: 'merit', events: ['koi_fed', 'catfish_fed', 'alms', 'alms_item', 'dish_alms'], counted: true },
  { id: 'pray', events: ['chant'], counted: true },
  { id: 'quests', ui: ['claimed'], counted: true },
  { id: 'npc', events: ['npc_talk'], counted: true },
  { id: 'map', ui: ['map_open'], counted: true },
  { id: 'shop', ui: ['gift'], counted: true },
  { id: 'decorate', ui: ['edit_off'], counted: true },
  { id: 'finish' },
]

export const TUT_STEP_BY_ID = Object.fromEntries(TUT_STEPS.map((s) => [s.id, s])) as Record<TutStepId, TutStepDef>

export const TUT_FIRST: TutStepId = 'hello'
export const TUT_LAST: TutStepId = 'finish'

/** First-finish reward and the small "thanks for revising" reward on replays. */
export const TUT_REWARD = {
  coins: 300,
  merit: 30,
  outfit: 'head_botnoi_antenna',
  /** The starter kit: everything a new save didn't start with. */
  items: { incense: 6, garland: 1, rice: 3, curry: 1, banana: 2, water: 2, fish_food: 12 } as Record<string, number>,
  furniture: { plant_monstera: 1, rug_mat: 1 } as Record<string, number>,
} as const
export const TUT_REPLAY_REWARD = { coins: 30 } as const

/**
 * Steps that need something a brand-new (empty) save doesn't have: Bot Noi
 * lends it for that one action ("บอทน้อยให้ยืมก่อนนะ") and takes back what
 * is left afterwards. Lighting incense needs nothing (Bot Noi's free stick).
 */
export interface TutLoanDef {
  step: TutStepId
  /** Later steps the loan is still needed for. */
  keep?: TutStepId[]
  items?: Record<string, number>
  furniture?: Record<string, number>
}

export const TUT_LOANS: TutLoanDef[] = [
  { step: 'merit', items: { fish_food: 12, rice: 1, banana: 1, water: 1 } },
  { step: 'decorate', furniture: { plant_monstera: 1 } },
]

/** What to lend as `step` begins: only what the player is missing. */
export function loanFor(step: TutStepId | null, have: { items: Record<string, number>; furniture: Record<string, number> }): { items: Record<string, number>; furniture: Record<string, number> } | null {
  const def = TUT_LOANS.find((l) => l.step === step)
  if (!def) return null
  const items = Object.fromEntries(Object.entries(def.items ?? {}).filter(([id]) => (have.items[id] ?? 0) <= 0))
  const furniture = Object.fromEntries(Object.entries(def.furniture ?? {}).filter(([id]) => (have.furniture[id] ?? 0) <= 0))
  if (!Object.keys(items).length && !Object.keys(furniture).length) return null
  return { items, furniture }
}

/** Is a loan made at `loanStep` still needed while the tutorial is at `now`? */
export function loanStillNeeded(loanStep: string, now: string | null): boolean {
  if (!now) return false
  if (loanStep === now) return true
  return !!TUT_LOANS.find((l) => l.step === loanStep)?.keep?.includes(now as TutStepId)
}

/** How much of a loan to take back: what is still in the bag / storage, never more than lent. */
export function reclaimAmounts(lent: Record<string, number>, have: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [id, n] of Object.entries(lent)) {
    const k = Math.min(n, Math.max(0, have[id] ?? 0))
    if (k > 0) out[id] = k
  }
  return out
}

export type TutInput =
  | { kind: 'start'; replay?: boolean }
  | { kind: 'event'; event: GameEvent }
  | { kind: 'ui'; id: TutUi }
  | { kind: 'next' }
  | { kind: 'skipStep' }
  | { kind: 'skip' }
  | { kind: 'finish' }
  /** "ไว้ทีหลัง": hide Bot Noi's hints (steps still complete in the background). */
  | { kind: 'pause' }
  | { kind: 'resume' }

export function stepIndexOf(id: string | null): number {
  return TUT_STEPS.findIndex((s) => s.id === id)
}

const MIDDLE = () => TUT_STEPS.filter((s) => s.id !== TUT_FIRST && s.id !== TUT_LAST)

/** First unfinished step in order (the greeting first, the finale once the rest are done). */
function firstOpen(done: string[]): TutStepDef {
  if (!done.includes(TUT_FIRST)) return TUT_STEPS[0]
  return MIDDLE().find((s) => !done.includes(s.id)) ?? TUT_STEPS[TUT_STEPS.length - 1]
}

/** The suggested step (null unless the tutorial is active, i.e. not paused). */
export function currentStep(st: BotnoiState): TutStepDef | null {
  if (st.tut !== 'active') return null
  return firstOpen(st.steps)
}

/** "x/y" steps done for the bubble. */
export function tutProgress(st: BotnoiState): { n: number; total: number } {
  const mids = MIDDLE()
  const total = mids.length
  if (st.tut === 'done') return { n: total, total }
  return { n: mids.filter((s) => st.steps.includes(s.id)).length, total }
}

/** Does this input complete the given step? */
export function completes(step: TutStepDef, input: TutInput): boolean {
  switch (input.kind) {
    case 'event':
      return !!step.events?.includes(input.event)
    case 'ui':
      return !!step.ui?.includes(input.id)
    case 'next':
      return !!step.next
    case 'skipStep':
      return step.id !== TUT_LAST
    default:
      return false
  }
}

const withSteps = (st: BotnoiState, steps: string[]): BotnoiState => ({ ...st, steps, step: firstOpen(steps).id })

/**
 * Apply one input. Pure: returns the same object when nothing changes, so
 * callers can skip a save. Events and UI signals complete ANY unfinished
 * step (any order, also while paused); "ต่อไป" / "ข้าม" act on the suggested
 * one. Finishing is `{ kind: 'finish' }` (the UI grants the reward).
 */
export function tutReduce(st: BotnoiState, input: TutInput): BotnoiState {
  if (input.kind === 'start') return { ...st, tut: 'active', step: TUT_FIRST, steps: [], replay: !!input.replay }
  const live = st.tut === 'active' || st.tut === 'paused'
  if (!live) return st
  if (input.kind === 'skip') return { ...st, tut: 'skipped', step: null, replay: false }
  if (input.kind === 'pause') return st.tut === 'active' ? { ...st, tut: 'paused' } : st
  if (input.kind === 'resume') return st.tut === 'paused' ? { ...st, tut: 'active', step: firstOpen(st.steps).id } : st
  if (input.kind === 'event' || input.kind === 'ui') {
    const hit = MIDDLE().filter((s) => !st.steps.includes(s.id) && completes(s, input)).map((s) => s.id)
    return hit.length ? withSteps(st, [...st.steps, ...hit]) : st
  }
  if (st.tut !== 'active') return st
  const cur = firstOpen(st.steps)
  if (input.kind === 'finish') {
    if (cur.id !== TUT_LAST) return st
    return { ...st, tut: 'done', step: null, steps: [...new Set([...st.steps, TUT_LAST])], finished: st.finished + 1, rewarded: true, replay: false }
  }
  if (!completes(cur, input)) return st
  return withSteps(st, [...st.steps, cur.id])
}

/** What finishing the tutorial pays: the full reward once, a small one on replays. */
export interface TutRewardDef {
  coins: number
  merit: number
  outfit: string | null
  items: Record<string, number>
  furniture: Record<string, number>
}

/**
 * What finishing pays: the whole starter kit once (one big reveal), a small
 * thank-you on replays. `kept` is loaned furniture the player placed during
 * the tutorial: it is already theirs, so the kit gives that much less.
 */
export function tutReward(st: BotnoiState, kept: Record<string, number> = {}): TutRewardDef {
  if (st.rewarded) return { coins: TUT_REPLAY_REWARD.coins, merit: 0, outfit: null, items: {}, furniture: {} }
  const furniture: Record<string, number> = {}
  for (const [id, n] of Object.entries(TUT_REWARD.furniture)) if (n - (kept[id] ?? 0) > 0) furniture[id] = n - (kept[id] ?? 0)
  return { coins: TUT_REWARD.coins, merit: TUT_REWARD.merit, outfit: TUT_REWARD.outfit, items: { ...TUT_REWARD.items }, furniture }
}

/** Should the tutorial greet the player automatically on reaching the temple? */
export function shouldAutoStart(st: BotnoiState): boolean {
  return st.tut === 'new'
}

/** Should the existing-player intro ("บอทน้อยมาแล้ว!") show? */
export function shouldOffer(st: BotnoiState): boolean {
  return st.tut === 'offer'
}

/** Should the running tutorial resume (with a "มาเรียนต่อกัน" line)? */
export function shouldResume(st: BotnoiState): boolean {
  return st.tut === 'active' && !!currentStep(st)
}

/** Paused with "ไว้ทีหลัง" (Bot Noi's menu offers "สอนต่อ"). */
export function isPaused(st: BotnoiState): boolean {
  return st.tut === 'paused'
}
