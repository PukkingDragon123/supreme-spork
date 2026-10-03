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
  { kind: 'event', event: 'wish' },
  { kind: 'event', event: 'koi_fed' },
  { kind: 'event', event: 'chant' },
  { kind: 'ui', id: 'claimed' },
  { kind: 'event', event: 'npc_talk' },
  { kind: 'ui', id: 'map_open' },
  { kind: 'ui', id: 'gift' },
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
    s.botnoi = run(started(), { kind: 'next' }, { kind: 'event', event: 'wish' })
    const back = migrate(JSON.parse(JSON.stringify(s)))
    expect(back.botnoi.tut).toBe('active')
    expect(at(back.botnoi)).toBe('merit')
    expect(shouldResume(back.botnoi)).toBe(true)
  })
})

describe('tutorial step machine', () => {
  it('is short: a greeting, a few real steps and the finale', () => {
    const ids = TUT_STEPS.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('hello')
    expect(ids[ids.length - 1]).toBe('finish')
    expect(TUT_STEPS.filter((x) => x.counted).length).toBeLessThanOrEqual(9)
    for (const x of TUT_STEPS) if (x.id !== 'finish') expect(!!(x.next || x.events?.length || x.ui?.length)).toBe(true)
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

  it('steps complete in any order, whenever they happen', () => {
    let st = run(started(), { kind: 'next' })
    expect(at(st)).toBe('incense')
    // Opened the map and claimed the shop gift first: they count right away.
    st = run(st, { kind: 'ui', id: 'map_open' }, { kind: 'ui', id: 'gift' })
    expect(st.steps).toEqual(expect.arrayContaining(['map', 'shop']))
    expect(at(st)).toBe('incense')
    // Even before the greeting is read.
    const early = tutReduce(started(), { kind: 'event', event: 'chant' })
    expect(early.steps).toContain('pray')
    expect(at(early)).toBe('hello')
    // Reverse order still finishes.
    st = run(started(), { kind: 'next' }, ...HAPPY_PATH.slice(1).reverse())
    expect(at(st)).toBe('finish')
    // Unrelated things do nothing (same object: no save).
    const same = run(st, { kind: 'ui', id: 'bag_open' }, { kind: 'event', event: 'bell' })
    expect(same).toBe(st)
  })

  it('"ไว้ทีหลัง" pauses (no hints), steps still count, and it resumes', () => {
    let st = run(started(), { kind: 'next' }, { kind: 'pause' })
    expect(st.tut).toBe('paused')
    expect(currentStep(st)).toBeNull()
    st = run(st, { kind: 'event', event: 'wish' }, { kind: 'event', event: 'koi_fed' })
    expect(st.steps).toEqual(expect.arrayContaining(['incense', 'merit']))
    // Buttons on the hidden bubble do nothing while paused.
    expect(tutReduce(st, { kind: 'skipStep' })).toBe(st)
    st = tutReduce(st, { kind: 'resume' })
    expect(st.tut).toBe('active')
    expect(at(st)).toBe('pray')
    expect(normalizeBotnoi(JSON.parse(JSON.stringify({ ...st, tut: 'paused' }))).tut).toBe('paused')
  })

  it('accepts either merit-making action (koi or alms)', () => {
    for (const event of ['koi_fed', 'alms', 'alms_item', 'dish_alms', 'catfish_fed'] as const) expect(tutReduce(started(), { kind: 'event', event }).steps).toContain('merit')
  })

  it('any suggested step can be skipped; skipping all reaches the finale', () => {
    let st = started()
    for (let i = 0; i < TUT_STEPS.length + 3; i++) st = tutReduce(st, { kind: 'skipStep' })
    expect(at(st)).toBe('finish')
    expect(completes(TUT_STEPS[TUT_STEPS.length - 1], { kind: 'skipStep' })).toBe(false)
    expect(tutReduce(started(), { kind: 'finish' }).tut).toBe('active')
  })

  it('can be skipped at any time and replayed from the menu', () => {
    const mid = run(started(), ...HAPPY_PATH.slice(0, 4))
    const skipped = tutReduce(mid, { kind: 'skip' })
    expect(skipped.tut).toBe('skipped')
    expect(currentStep(skipped)).toBeNull()
    expect(tutReduce(skipped, { kind: 'next' })).toBe(skipped)
    expect(tutReduce(tutReduce(mid, { kind: 'pause' }), { kind: 'skip' }).tut).toBe('skipped')
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

  it('recovers from unknown step ids in old saves', () => {
    const st: BotnoiState = { ...defaultBotnoi(), tut: 'active', step: 'bag_look', steps: ['hello', 'walk', 'incense'] }
    expect(at(st)).toBe('merit')
    expect(tutProgress(st).n).toBe(1)
  })
})
