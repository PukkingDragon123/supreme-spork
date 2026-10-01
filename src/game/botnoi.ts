// Game-side actions for บอทน้อย: drive the tutorial machine, pay its
// reward, remember feature tips and the robot's little settings.
// Pure logic lives in botnoiTutorial.ts / botnoiTips.ts; the UI in src/ui/botnoi/.

import { game, mutate } from './state'
import { addCoins, addItems, addMerit, grantOutfit } from './actions'
import { addToStorage } from './house'
import { defaultBotnoi, type BotnoiState } from './botnoiState'
import { currentStep, loanFor, reclaimAmounts, tutReduce, tutReward, type TutInput, type TutStepId } from './botnoiTutorial'

const bn = (s = game.value): BotnoiState => s.botnoi ?? defaultBotnoi()

/** Listeners told whenever the running step changes (the UI plays a chime, praises…). */
const stepListeners: ((from: TutStepId | null, to: TutStepId | null, input: TutInput) => void)[] = []

export function onTutorialStep(fn: (from: TutStepId | null, to: TutStepId | null, input: TutInput) => void): () => void {
  stepListeners.push(fn)
  return () => {
    const i = stepListeners.indexOf(fn)
    if (i >= 0) stepListeners.splice(i, 1)
  }
}

/** Feed one input to the tutorial. Returns true when the step changed. */
export function tutorialInput(input: TutInput): boolean {
  const before = bn()
  const after = tutReduce(before, input)
  if (after === before) return false
  const from = currentStep(before)?.id ?? null
  mutate((d) => {
    d.botnoi = after
  })
  const to = currentStep(after)?.id ?? null
  if (from !== to || before.tut !== after.tut) for (const fn of [...stepListeners]) fn(from, to, input)
  return true
}

export function startTutorial(replay = false) {
  tutorialInput({ kind: 'start', replay })
}

export function skipTutorial() {
  reclaimLoan()
  tutorialInput({ kind: 'skip' })
  // Skipped: placed loaner furniture stays as a little keepsake.
  mutate((d) => {
    d.botnoi = { ...bn(d), loan: null }
  })
}

export interface TutPayout {
  coins: number
  merit: number
  outfit: string | null
  items: Record<string, number>
  furniture: Record<string, number>
}

/**
 * Finish the last step and pay the one big reward: the whole starter kit
 * once (coins, incense, alms set, fish food, furniture, the antenna
 * headband), a small thank-you on replays.
 */
export function finishTutorial(): TutPayout | null {
  const st = bn()
  if (currentStep(st)?.id !== 'finish') return null
  const kept = reclaimLoan()
  const r = tutReward(bn(), kept)
  tutorialInput({ kind: 'finish' })
  mutate((d) => {
    d.botnoi = { ...bn(d), loan: null }
  })
  const coins = addCoins(r.coins)
  const merit = r.merit ? addMerit(r.merit) : 0
  const outfit = r.outfit && grantOutfit(r.outfit) ? r.outfit : null
  if (Object.keys(r.items).length) addItems(r.items)
  if (Object.keys(r.furniture).length)
    mutate((d) => {
      for (const [id, n] of Object.entries(r.furniture)) d.house = addToStorage(d.house, id, n)
    })
  return { coins, merit, outfit, items: r.items, furniture: { ...r.furniture, ...kept } }
}

/** Existing players: dismiss the "Bot Noi has arrived!" offer (tutorial stays replayable). */
export function declineTutorial() {
  mutate((d) => {
    d.botnoi = { ...bn(d), tut: bn(d).tut === 'offer' ? 'skipped' : bn(d).tut }
  })
}

/**
 * Lend what `step` needs when the player doesn't have it (an empty new
 * save): บอทน้อยให้ยืมก่อนนะ. Returns true when something was lent.
 */
export function lendFor(step: TutStepId | null): boolean {
  const s = game.value
  if (bn(s).loan) return false
  const l = loanFor(step, { items: s.inventory, furniture: s.house.storage })
  if (!l || !step) return false
  mutate((d) => {
    d.botnoi = { ...bn(d), loan: { step, items: l.items, furniture: l.furniture } }
    for (const [id, n] of Object.entries(l.items)) d.inventory[id] = (d.inventory[id] ?? 0) + n
    for (const [id, n] of Object.entries(l.furniture)) d.house = addToStorage(d.house, id, n)
  })
  return true
}

/**
 * Take back whatever is left of a loan (unused items, unplaced furniture).
 * Returns loaned furniture the player placed: it stays, as part of the reward.
 */
export function reclaimLoan(): Record<string, number> {
  const s = game.value
  const loan = bn(s).loan
  if (!loan) return {}
  const items = reclaimAmounts(loan.items, s.inventory)
  const furn = reclaimAmounts(loan.furniture, s.house.storage)
  const kept: Record<string, number> = {}
  for (const [id, n] of Object.entries(loan.furniture)) if (n - (furn[id] ?? 0) > 0) kept[id] = n - (furn[id] ?? 0)
  mutate((d) => {
    for (const [id, n] of Object.entries(items)) {
      d.inventory[id] = (d.inventory[id] ?? 0) - n
      if (d.inventory[id] <= 0) delete d.inventory[id]
    }
    for (const [id, n] of Object.entries(furn)) {
      d.house.storage[id] = (d.house.storage[id] ?? 0) - n
      if (d.house.storage[id] <= 0) delete d.house.storage[id]
    }
    d.botnoi = { ...bn(d), loan: kept && Object.keys(kept).length && bn(d).tut === 'active' ? { step: 'kept', items: {}, furniture: kept } : null }
  })
  return kept
}

/** The step a loan belongs to (null when nothing is lent). */
export function loanStep(): string | null {
  return bn().loan?.step ?? null
}

export function tipSeen(id: string, s = game.value): boolean {
  return bn(s).seen.includes(id)
}

export function markTipSeen(id: string) {
  if (tipSeen(id)) return
  mutate((d) => {
    const b = bn(d)
    d.botnoi = { ...b, seen: [...b.seen, id] }
  })
}

export function setBotHidden(hidden: boolean) {
  mutate((d) => {
    d.botnoi = { ...bn(d), hidden }
  })
}

/** Next index of a rotating list (jokes, daily tips) and remember it. */
export function nextRotating(kind: 'joke' | 'tip', len: number): number {
  const b = bn()
  const i = b[kind] % Math.max(1, len)
  mutate((d) => {
    const x = bn(d)
    d.botnoi = { ...x, [kind]: x[kind] + 1 }
  })
  return i
}

export function pokeBot(): number {
  const n = bn().pokes + 1
  mutate((d) => {
    d.botnoi = { ...bn(d), pokes: n }
  })
  return n
}
