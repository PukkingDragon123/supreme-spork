import { describe, expect, it } from 'vitest'
import { defaultBotnoi, normalizeBotnoi, type BotnoiState } from '../botnoiState'
import {
  TUT_STEPS,
  TUT_REWARD,
  TUT_REPLAY_REWARD,
  completes,
  currentStep,
  shouldAutoStart,
  shouldOffer,
  shouldResume,
  tutProgress,
  tutReduce,
  tutReward,
  type TutInput,
} from '../botnoiTutorial'
import { defaultState, migrate } from '../state'

const run = (st: BotnoiState, ...inputs: TutInput[]) => inputs.reduce(tutReduce, st)
const started = () => tutReduce(defaultBotnoi(), { kind: 'start' })
const at = (st: BotnoiState) => currentStep(st)?.id ?? null

/** Inputs that play the whole tutorial the way a player would. */
const HAPPY_PATH: TutInput[] = [
  { kind: 'next' }, // hello
  { kind: 'ui', id: 'walked' },
  { kind: 'event', event: 'wish' },
  { kind: 'ui', id: 'bag_open' },
  { kind: 'ui', id: 'bag_close' },
  { kind: 'event', event: 'koi_fed' },
  { kind: 'ui', id: 'pray_open' },
  { kind: 'ui', id: 'pray_start' },
  { kind: 'event', event: 'chant' },
  { kind: 'ui', id: 'claimed' },
  { kind: 'event', event: 'npc_talk' },
  { kind: 'ui', id: 'map_open' },
  { kind: 'ui', id: 'map_close' },
  { kind: 'ui', id: 'gift' },
  { kind: 'ui', id: 'house' },
  { kind: 'ui', id: 'edit_on' },
  { kind: 'ui', id: 'edit_off' },
]

describe('botnoi state', () => {
  it('new saves auto-start; old saves get the arrival intro instead', () => {
    expect(defaultState().botnoi.tut).toBe('new')
    expect(shouldAutoStart(defaultState().botnoi)).toBe(true)
    const old = migrate({ onboarded: true, coins: 50 })
    expect(old.botnoi.tut).toBe('offer')
    expect(shouldOffer(old.botnoi)).toBe(true)
    expect(shouldAutoStart(old.botnoi)).toBe(false)
    // Mid-onboarding saves are still "new".
    expect(migrate({ onboarded: false }).botnoi.tut).toBe('new')
  })

  it('normalises junk', () => {
    const b = normalizeBotnoi({ tut: 'weird', step: 5, steps: ['walk', 3, 'walk'], finished: -2, seen: 'x', joke: 2.7, hidden: 'yes' })
    expect(b.tut).toBe('new')
    expect(b.step).toBeNull()
    expect(b.steps).toEqual(['walk'])
    expect(b.finished).toBe(0)
    expect(b.seen).toEqual([])
    expect(b.joke).toBe(2)
    expect(b.hidden).toBe(false)
    // A step is only kept while the tutorial runs.
    expect(normalizeBotnoi({ tut: 'done', step: 'walk' }).step).toBeNull()
    expect(normalizeBotnoi({ tut: 'active', step: 'bag' }).step).toBe('bag')
  })

  it('survives a save round trip mid-tutorial (resumable)', () => {
    const s = defaultState()
    s.botnoi = run(started(), { kind: 'next' }, { kind: 'ui', id: 'walked' })
    const back = migrate(JSON.parse(JSON.stringify(s)))
    expect(back.botnoi.tut).toBe('active')
    expect(at(back.botnoi)).toBe('incense')
    expect(shouldResume(back.botnoi)).toBe(true)
  })
})

describe('tutorial step machine', () => {
  it('has unique ids, starts with the greeting and ends with the finale', () => {
    const ids = TUT_STEPS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('hello')
    expect(ids[ids.length - 1]).toBe('finish')
    // Every step can complete somehow (or is the finale).
    for (const s of TUT_STEPS) if (s.id !== 'finish') expect(!!(s.next || s.events?.length || s.ui?.length)).toBe(true)
  })

  it('plays the whole tutorial end to end', () => {
    let st = started()
    expect(at(st)).toBe('hello')
    st = run(st, ...HAPPY_PATH)
    expect(at(st)).toBe('finish')
    expect(tutProgress(st).n).toBe(tutProgress(st).total)
    st = tutReduce(st, { kind: 'finish' })
    expect(st.tut).toBe('done')
    expect(st.finished).toBe(1)
    expect(st.rewarded).toBe(true)
    expect(currentStep(st)).toBeNull()
  })

  it('only advances on the action the step asks for', () => {
    let st = run(started(), { kind: 'next' })
    expect(at(st)).toBe('walk')
    // Wrong things do nothing (and return the same object: no save).
    const same = run(st, { kind: 'event', event: 'wish' }, { kind: 'ui', id: 'bag_open' }, { kind: 'next' })
    expect(same).toBe(st)
    st = tutReduce(st, { kind: 'ui', id: 'walked' })
    expect(at(st)).toBe('incense')
    expect(tutReduce(st, { kind: 'event', event: 'koi_fed' })).toBe(st)
    expect(at(tutReduce(st, { kind: 'event', event: 'wish' }))).toBe('bag')
  })

  it('accepts either merit-making action (koi or alms)', () => {
    const base = run(started(), ...HAPPY_PATH.slice(0, 5))
    expect(at(base)).toBe('merit')
    for (const event of ['koi_fed', 'alms', 'alms_item', 'dish_alms', 'catfish_fed'] as const) expect(at(tutReduce(base, { kind: 'event', event }))).toBe('pray')
  })

  it('reading steps close with ต่อไป or by closing the window', () => {
    const inBag = run(started(), ...HAPPY_PATH.slice(0, 4))
    expect(at(inBag)).toBe('bag_look')
    expect(at(tutReduce(inBag, { kind: 'next' }))).toBe('merit')
    expect(at(tutReduce(inBag, { kind: 'ui', id: 'bag_close' }))).toBe('merit')
  })

  it('leaving the prayer early goes back to the pray button (never forward-locks)', () => {
    let st = run(started(), ...HAPPY_PATH.slice(0, 7))
    expect(at(st)).toBe('pray_stage')
    // Closed the stage map without starting.
    expect(at(tutReduce(st, { kind: 'ui', id: 'pray_close' }))).toBe('pray')
    st = tutReduce(st, { kind: 'ui', id: 'pray_start' })
    expect(at(st)).toBe('pray_do')
    // Quit the session before finishing.
    const quit = tutReduce(st, { kind: 'ui', id: 'pray_quit' })
    expect(at(quit)).toBe('pray')
    // Starting a prayer straight from the hall jumps over the stage map.
    expect(at(tutReduce(quit, { kind: 'ui', id: 'pray_start' }))).toBe('pray_do')
    expect(at(tutReduce(st, { kind: 'event', event: 'chant' }))).toBe('quests')
  })

  it('every step but the finale can be skipped; skipping all reaches the finale', () => {
    let st = started()
    for (let i = 0; i < TUT_STEPS.length + 3; i++) st = tutReduce(st, { kind: 'skipStep' })
    expect(at(st)).toBe('finish')
    expect(completes(TUT_STEPS[TUT_STEPS.length - 1], { kind: 'skipStep' })).toBe(false)
    // 'finish' only works on the last step.
    expect(tutReduce(started(), { kind: 'finish' }).tut).toBe('active')
  })

  it('can be skipped at any time and replayed from the menu', () => {
    const mid = run(started(), ...HAPPY_PATH.slice(0, 6))
    const skipped = tutReduce(mid, { kind: 'skip' })
    expect(skipped.tut).toBe('skipped')
    expect(currentStep(skipped)).toBeNull()
    // Inputs are ignored while not running.
    expect(tutReduce(skipped, { kind: 'next' })).toBe(skipped)
    const again = tutReduce(skipped, { kind: 'start', replay: true })
    expect(again.tut).toBe('active')
    expect(again.replay).toBe(true)
    expect(at(again)).toBe('hello')
    expect(again.steps).toEqual([])
  })

  it('pays the full reward once and a small one on replays', () => {
    const first = run(started(), ...HAPPY_PATH)
    expect(tutReward(first)).toEqual({ coins: TUT_REWARD.coins, merit: TUT_REWARD.merit, outfit: TUT_REWARD.outfit, items: TUT_REWARD.items, furniture: TUT_REWARD.furniture })
    const done = tutReduce(first, { kind: 'finish' })
    const replay = run(tutReduce(done, { kind: 'start', replay: true }), ...HAPPY_PATH)
    expect(tutReward(replay)).toEqual({ coins: TUT_REPLAY_REWARD.coins, merit: 0, outfit: null, items: {}, furniture: {} })
    expect(tutReduce(replay, { kind: 'finish' }).finished).toBe(2)
  })

  it('recovers from an unknown step id (old data)', () => {
    const st: BotnoiState = { ...defaultBotnoi(), tut: 'active', step: 'removed_step', steps: ['hello', 'walk'] }
    expect(at(st)).toBe('incense')
    const next = tutReduce(st, { kind: 'event', event: 'wish' })
    expect(at(next)).toBe('bag')
    expect(next.steps).toContain('incense')
  })

  it('counts progress over the real steps only', () => {
    const p0 = tutProgress(started())
    expect(p0.n).toBe(0)
    expect(p0.total).toBe(TUT_STEPS.filter((s) => s.counted).length)
    expect(tutProgress(run(started(), { kind: 'next' })).n).toBe(1)
    // Sub-steps share the number of their parent step.
    const bag = run(started(), ...HAPPY_PATH.slice(0, 3))
    const look = tutReduce(bag, { kind: 'ui', id: 'bag_open' })
    expect(tutProgress(look).n).toBe(tutProgress(bag).n)
  })
})
