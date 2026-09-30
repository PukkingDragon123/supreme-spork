// Game-side actions for บอทน้อย: drive the tutorial machine, pay its
// reward, remember feature tips and the robot's little settings.
// Pure logic lives in botnoiTutorial.ts / botnoiTips.ts; the UI in src/ui/botnoi/.

import { game, mutate } from './state'
import { addCoins, addMerit, grantOutfit } from './actions'
import { defaultBotnoi, type BotnoiState } from './botnoiState'
import { currentStep, tutReduce, tutReward, type TutInput, type TutStepId } from './botnoiTutorial'

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
  tutorialInput({ kind: 'skip' })
}

export interface TutPayout {
  coins: number
  merit: number
  outfit: string | null
}

/** Finish the last step and pay the reward (full once, small on replays). */
export function finishTutorial(): TutPayout | null {
  const st = bn()
  if (currentStep(st)?.id !== 'finish') return null
  const r = tutReward(st)
  tutorialInput({ kind: 'finish' })
  const coins = addCoins(r.coins)
  const merit = r.merit ? addMerit(r.merit) : 0
  const outfit = r.outfit && grantOutfit(r.outfit) ? r.outfit : null
  return { coins, merit, outfit }
}

/** Existing players: dismiss the "Bot Noi has arrived!" offer (tutorial stays replayable). */
export function declineTutorial() {
  mutate((d) => {
    d.botnoi = { ...bn(d), tut: bn(d).tut === 'offer' ? 'skipped' : bn(d).tut }
  })
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
