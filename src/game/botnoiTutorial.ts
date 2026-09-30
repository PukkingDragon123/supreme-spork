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

export type TutStepId =
  | 'hello'
  | 'walk'
  | 'incense'
  | 'bag'
  | 'bag_look'
  | 'merit'
  | 'pray'
  | 'pray_stage'
  | 'pray_do'
  | 'quests'
  | 'npc'
  | 'map'
  | 'map_look'
  | 'shop'
  | 'home'
  | 'decorate'
  | 'decorate_done'
  | 'finish'

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

export const TUT_STEPS: TutStepDef[] = [
  { id: 'hello', next: true },
  { id: 'walk', ui: ['walked'], counted: true },
  { id: 'incense', events: ['wish'], counted: true },
  { id: 'bag', ui: ['bag_open'], counted: true },
  { id: 'bag_look', ui: ['bag_close'], next: true },
  { id: 'merit', events: ['koi_fed', 'catfish_fed', 'alms', 'alms_item', 'dish_alms'], counted: true },
  { id: 'pray', ui: ['pray_open', 'pray_start'], counted: true },
  { id: 'pray_stage', ui: ['pray_start'], back: { pray_close: 'pray' } },
  { id: 'pray_do', events: ['chant'], back: { pray_quit: 'pray' } },
  { id: 'quests', ui: ['claimed'], counted: true },
  { id: 'npc', events: ['npc_talk'], counted: true },
  { id: 'map', ui: ['map_open'], counted: true },
  { id: 'map_look', ui: ['map_close'], next: true },
  { id: 'shop', ui: ['gift'], counted: true },
  { id: 'home', ui: ['house'], counted: true },
  { id: 'decorate', ui: ['edit_on'], counted: true },
  { id: 'decorate_done', ui: ['edit_off'], next: true },
  { id: 'finish' },
]

export const TUT_STEP_BY_ID = Object.fromEntries(TUT_STEPS.map((s) => [s.id, s])) as Record<TutStepId, TutStepDef>

export const TUT_FIRST: TutStepId = 'hello'
export const TUT_LAST: TutStepId = 'finish'

/** First-finish reward and the small "thanks for revising" reward on replays. */
export const TUT_REWARD = { coins: 300, merit: 30, outfit: 'head_botnoi_antenna' } as const
export const TUT_REPLAY_REWARD = { coins: 30 } as const

/**
 * What Bot Noi hands out as the tutorial goes (a new save starts with an
 * empty bag): each gift pops up when its step begins, once per save.
 */
export interface TutGift {
  id: string
  /** Given when this step starts. */
  step: TutStepId
  coins?: number
  items?: Record<string, number>
  /** Furniture put into the house storage. */
  furniture?: Record<string, number>
  /** What Bot Noi says on the reveal card. */
  line: string
}

export const TUT_GIFTS: TutGift[] = [
  { id: 'welcome', step: 'walk', coins: 50, line: 'กระเป๋ายังว่างอยู่ใช่ไหมครับ? ผมให้ค่าขนมไว้ใช้ก่อนนะ!' },
  { id: 'incense', step: 'incense', items: { incense: 3, garland: 1 }, line: 'ธูป 3 ดอกกับพวงมาลัย เอาไว้จุดธูปขอพรกันครับ' },
  { id: 'alms', step: 'bag', items: { rice: 2, curry: 1, banana: 1, water: 1, fish_food: 12 }, line: 'ชุดใส่บาตรกับอาหารปลา ใส่กระเป๋าให้แล้วครับ!' },
  { id: 'furniture', step: 'decorate', furniture: { plant_monstera: 1, rug_mat: 1 }, line: 'ต้นไม้กับเสื่อผืนแรก เอาไปแต่งห้องกันครับ ^^' },
]

/** The gift to hand out as `step` begins (null if none or already given). */
export function giftFor(step: TutStepId | null, given: string[]): TutGift | null {
  return TUT_GIFTS.find((g) => g.step === step && !given.includes(g.id)) ?? null
}

export type TutInput =
  | { kind: 'start'; replay?: boolean }
  | { kind: 'event'; event: GameEvent }
  | { kind: 'ui'; id: TutUi }
  | { kind: 'next' }
  | { kind: 'skipStep' }
  | { kind: 'skip' }
  | { kind: 'finish' }

export function stepIndexOf(id: string | null): number {
  return TUT_STEPS.findIndex((s) => s.id === id)
}

/** The running step (null unless the tutorial is active). Unknown ids resolve to the first unfinished step. */
export function currentStep(st: BotnoiState): TutStepDef | null {
  if (st.tut !== 'active') return null
  const i = stepIndexOf(st.step)
  if (i >= 0) return TUT_STEPS[i]
  return TUT_STEPS.find((s) => !st.steps.includes(s.id)) ?? TUT_STEPS[TUT_STEPS.length - 1]
}

/** "ขั้นที่ x/y" for the bubble (x is 1-based; 0 on the greeting). */
export function tutProgress(st: BotnoiState): { n: number; total: number } {
  const counted = TUT_STEPS.filter((s) => s.counted)
  const total = counted.length
  const cur = currentStep(st)
  if (!cur) return { n: st.tut === 'done' ? total : 0, total }
  const i = stepIndexOf(cur.id)
  const n = TUT_STEPS.slice(0, i + 1).filter((s) => s.counted).length
  return { n, total }
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

function advance(st: BotnoiState, from: TutStepDef): BotnoiState {
  const i = stepIndexOf(from.id)
  const next = TUT_STEPS[i + 1]
  const steps = st.steps.includes(from.id) ? st.steps : [...st.steps, from.id]
  return { ...st, steps, step: next ? next.id : TUT_LAST }
}

/**
 * Apply one input. Pure: returns the same object when nothing changes, so
 * callers can skip a save. Finishing the last step is `{ kind: 'finish' }`
 * (the UI grants the reward, see tutReward()).
 */
export function tutReduce(st: BotnoiState, input: TutInput): BotnoiState {
  if (input.kind === 'start') {
    return { ...st, tut: 'active', step: TUT_FIRST, steps: [], replay: !!input.replay }
  }
  if (st.tut !== 'active') return st
  if (input.kind === 'skip') return { ...st, tut: 'skipped', step: null, replay: false }
  const cur = currentStep(st)
  if (!cur) return st
  if (input.kind === 'finish') {
    if (cur.id !== TUT_LAST) return st
    return { ...st, tut: 'done', step: null, steps: [...new Set([...st.steps, TUT_LAST])], finished: st.finished + 1, rewarded: true, replay: false }
  }
  if (input.kind === 'ui' && cur.back?.[input.id]) {
    const to = cur.back[input.id]!
    if (stepIndexOf(to) < stepIndexOf(cur.id)) return { ...st, step: to }
  }
  if (!completes(cur, input)) return st
  // Normalise a stale id (data changed between versions) before advancing.
  const base = st.step === cur.id ? st : { ...st, step: cur.id }
  let out = advance(base, cur)
  // A UI signal can finish the following steps too (e.g. a prayer started
  // from the hall skips the stage-map explanation).
  for (let nxt = currentStep(out); input.kind === 'ui' && nxt && nxt.id !== TUT_LAST && nxt.ui?.includes(input.id); nxt = currentStep(out)) out = advance(out, nxt)
  return out
}

/** What finishing the tutorial pays: the full reward once, a small one on replays. */
export function tutReward(st: BotnoiState): { coins: number; merit: number; outfit: string | null } {
  if (st.rewarded) return { coins: TUT_REPLAY_REWARD.coins, merit: 0, outfit: null }
  return { coins: TUT_REWARD.coins, merit: TUT_REWARD.merit, outfit: TUT_REWARD.outfit }
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
