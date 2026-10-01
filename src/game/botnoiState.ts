// Save-game namespace for บอทน้อย (GameState.botnoi): the interactive
// tutorial, one-time feature tips and the robot helper's own bookkeeping.
// Pure: no imports from the rest of the game so state.ts can use it.

/**
 * Tutorial status.
 * - `new`: a brand-new save; the tutorial starts on the first visit to the temple.
 * - `offer`: an existing player who has not met Bot Noi yet (short intro, opt in).
 * - `active`: running (resumable after a reload).
 * - `done` / `skipped`: finished or skipped (replayable from the menu).
 */
export type TutStatus = 'new' | 'offer' | 'active' | 'done' | 'skipped'

export interface BotnoiState {
  tut: TutStatus
  /** Current step id while `active`. */
  step: string | null
  /** Steps finished in the current run (ids). */
  steps: string[]
  /** Times the tutorial was finished. */
  finished: number
  /** The first-finish reward (coins + antenna headband) was granted. */
  rewarded: boolean
  /** This run is a replay (smaller reward, no greeting cutscene). */
  replay: boolean
  /** Feature tips already shown (tip ids, see game/botnoiTips.ts). */
  seen: string[]
  /** Hide Bot Noi in the world (the menu can call him back). */
  hidden: boolean
  /** Rotating indices for jokes and daily tips. */
  joke: number
  tip: number
  /** Times the player tapped Bot Noi (for a few easter-egg lines). */
  pokes: number
  /**
   * Things Bot Noi lent for one tutorial step (บอทน้อยให้ยืมก่อนนะ): taken
   * back when the step is over, so nothing lands in the bag before the
   * finale. Furniture that was placed stays and counts toward the reward.
   */
  loan: Loan | null
}

export interface Loan {
  step: string
  items: Record<string, number>
  furniture: Record<string, number>
}

export function defaultBotnoi(): BotnoiState {
  return { tut: 'new', step: null, steps: [], finished: 0, rewarded: false, replay: false, seen: [], hidden: false, joke: 0, tip: 0, pokes: 0, loan: null }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const STATUSES: TutStatus[] = ['new', 'offer', 'active', 'done', 'skipped']
const nat = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0)
const strs = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : [])

/**
 * Repair whatever a save holds under `botnoi`. Saves from before Bot Noi
 * existed (`raw` missing) get `offer` when the player was already playing,
 * so they see the short "Bot Noi has arrived!" intro instead of the full
 * tutorial forcing itself on them.
 */
export function normalizeBotnoi(raw: unknown, ctx: { onboarded?: boolean } = {}): BotnoiState {
  const b = defaultBotnoi()
  if (!isObj(raw)) {
    if (ctx.onboarded) b.tut = 'offer'
    return b
  }
  b.tut = STATUSES.includes(raw.tut as TutStatus) ? (raw.tut as TutStatus) : b.tut
  b.step = typeof raw.step === 'string' ? raw.step : null
  b.steps = strs(raw.steps)
  b.finished = nat(raw.finished)
  b.rewarded = raw.rewarded === true
  b.replay = raw.replay === true
  b.seen = strs(raw.seen)
  b.hidden = raw.hidden === true
  b.joke = nat(raw.joke)
  b.tip = nat(raw.tip)
  b.pokes = nat(raw.pokes)
  if (isObj(raw.loan) && typeof raw.loan.step === 'string') {
    const nums = (v: unknown) => (isObj(v) ? Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === 'number' && n > 0).map(([k, n]) => [k, Math.floor(n as number)])) : {})
    b.loan = { step: raw.loan.step, items: nums(raw.loan.items), furniture: nums(raw.loan.furniture) }
  }
  if (b.tut !== 'active') b.step = null
  return b
}
