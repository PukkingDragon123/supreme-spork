import { describe, expect, it } from 'vitest'
import {
  LEAD_IN,
  PRE_ROLL,
  ROUND_GAP,
  audioAt,
  autoAlign,
  envelope,
  filePlan,
  learnSps,
  lineWeights,
  parseTiming,
  pickQuiz,
  recordingRate,
  speakable,
  speechRateFor,
  synthPlan,
  timeAt,
  timingJson,
} from '../chantTiming'
import { STAGE_BY_ID, chantById, type PrayerStage } from '../data/prayers'
import { lineWords } from '../chantScore'

const stage = (over: Partial<PrayerStage> = {}): PrayerStage => ({
  id: 'test',
  chapter: 'wat',
  n: 1,
  chant: 'namo',
  tempo: 400,
  judge: 2,
  hint: 'read',
  bows: 1,
  merit: 1,
  coins: 1,
  mats: {},
  ...over,
})

describe('parseTiming', () => {
  it('accepts objects and bare arrays with one increasing time per line', () => {
    expect(parseTiming({ lines: [0.5, 8, 16], end: 24 }, 3)).toEqual({ lines: [0.5, 8, 16], end: 24 })
    expect(parseTiming([0, 1, 2], 3)).toEqual({ lines: [0, 1, 2] })
    expect(parseTiming({ lines: [0, 1, 2], auto: true }, 3)?.auto).toBe(true)
  })
  it('rejects wrong counts, unordered or bad values', () => {
    expect(parseTiming({ lines: [0, 1] }, 3)).toBeNull()
    expect(parseTiming({ lines: [0, 2, 1] }, 3)).toBeNull()
    expect(parseTiming({ lines: [-1, 2, 3] }, 3)).toBeNull()
    expect(parseTiming({ lines: [0, 'x', 3] }, 3)).toBeNull()
    expect(parseTiming(null, 3)).toBeNull()
  })
  it('drops an end that is before the last line and keeps valid word marks', () => {
    const t = parseTiming({ lines: [0, 5], end: 3, words: [[0, 1], 'bad'] }, 2)!
    expect(t.end).toBeUndefined()
    expect(t.words).toEqual([[0, 1], null])
  })
  it('round-trips through the exported JSON', () => {
    const json = timingJson('namo', { lines: [0.812, 8.9, 17.14], end: 24.2 })
    expect(parseTiming(JSON.parse(json), 3)).toEqual({ lines: [0.81, 8.9, 17.14], end: 24.2 })
  })
})

describe('synthPlan', () => {
  it('lays out a stage passage with syllables and line spans', () => {
    const p = synthPlan(STAGE_BY_ID['wat-1'])
    expect(p.source).toBe('synth')
    expect(p.lines).toHaveLength(1)
    expect(p.words.map((w) => w.text)).toEqual(['นะโม', 'ตัสสะ', 'ภะคะวะโต', 'อะระหะโต', 'สัมมาสัมพุทธัสสะ'])
    expect(p.words[0].start).toBeCloseTo(LEAD_IN)
    expect(p.words[2].syl.map((s) => s.text)).toEqual(['ภะ', 'คะ', 'วะ', 'โต'])
    const w = p.words[2]
    expect(w.syl[0].start).toBeCloseTo(w.start)
    expect(w.syl[3].start + w.syl[3].dur).toBeCloseTo(w.start + w.dur)
    expect(p.lineStart[0]).toBeCloseTo(p.words[0].start)
    expect(p.total).toBeGreaterThan(p.lineEnd[0])
  })
  it('expands rounds and maps lines back to the chant', () => {
    const p = synthPlan(stage({ chant: 'ganesha', rounds: 2 }))
    expect(p.lines).toHaveLength(6)
    expect(p.src).toEqual([0, 1, 2, 0, 1, 2])
    const part = synthPlan(stage({ chant: 'jinabanchara', part: [4, 8] }))
    expect(part.src).toEqual([4, 5, 6, 7])
  })
  it('gets slower with a higher ms-per-syllable tempo', () => {
    expect(synthPlan(stage({ tempo: 460 })).total).toBeGreaterThan(synthPlan(stage({ tempo: 330 })).total)
  })
})

describe('filePlan (real recordings)', () => {
  const timing = { lines: [0.8, 8.9, 17.1], end: 24.2 }
  it('spreads words over each marked line and maps audio time to the timeline', () => {
    const p = filePlan(stage({ tempo: 400 }), timing, 25, { rate: 1 })
    expect(p.source).toBe('file')
    expect(p.segments).toHaveLength(1)
    const s = p.segments[0]
    expect(s.a0).toBeCloseTo(0.8 - PRE_ROLL)
    expect(s.a1).toBeCloseTo(24.2)
    expect(s.t0).toBeCloseTo(LEAD_IN)
    // First word starts where the first line was marked.
    expect(p.words[0].start).toBeCloseTo(timeAt(p.segments, 0, 0.8))
    // Line 2 starts at its mark.
    const second = p.words.find((w) => w.line === 1)!
    expect(second.start).toBeCloseTo(timeAt(p.segments, 0, 8.9))
    // Words stay in order and inside their line slot.
    for (let i = 1; i < p.words.length; i++) expect(p.words[i].start).toBeGreaterThan(p.words[i - 1].start)
    const lastL0 = p.words.filter((w) => w.line === 0).pop()!
    expect(lastL0.start + lastL0.dur).toBeLessThanOrEqual(second.start)
  })
  it('plays only the passage a stage needs, and replays it for rounds', () => {
    const p = filePlan(stage({ part: [1, 2], rounds: 2 }), timing, 25, { rate: 1 })
    expect(p.lines).toHaveLength(2)
    expect(p.segments).toHaveLength(2)
    expect(p.segments[0].a0).toBeCloseTo(8.9 - PRE_ROLL)
    expect(p.segments[0].a1).toBeCloseTo(17.1)
    expect(p.segments[1].t0 - p.segments[0].t1).toBeCloseTo(ROUND_GAP)
    expect(audioAt(p.segments, p.segments[0].t1 + 0.1)).toBeNull()
    const mid = audioAt(p.segments, p.segments[1].t0 + 1)!
    expect(mid.seg).toBe(1)
    expect(mid.pos).toBeCloseTo(8.9 - PRE_ROLL + 1)
  })
  it('uses marked word times when given', () => {
    const t = { ...timing, words: [[0.8, 2, 3, 4.5, 6], null, null] }
    const p = filePlan(stage(), t, 25, { rate: 1 })
    expect(p.words[1].start).toBeCloseTo(timeAt(p.segments, 0, 2))
    expect(p.words[3].start).toBeCloseTo(timeAt(p.segments, 0, 4.5))
  })
  it('speeds a slow recording up gently toward the stage tempo', () => {
    expect(recordingRate(400, 400)).toBe(1)
    expect(recordingRate(520, 400)).toBe(1.3)
    expect(recordingRate(800, 400)).toBe(1.3)
    expect(recordingRate(300, 400)).toBe(0.85)
    const fast = filePlan(stage({ tempo: 300 }), timing, 25)
    expect(fast.rate).toBeGreaterThan(1)
    expect(fast.segments[0].t1 - fast.segments[0].t0).toBeCloseTo((24.2 - 0.5) / fast.rate)
  })
  it('keeps bows from the text', () => {
    const tg = chantById('triple_gem')
    const t = { lines: tg.lines.map((_, i) => 1 + i * 5), end: 32 }
    const p = filePlan(stage({ chant: 'triple_gem' }), t, 33, { rate: 1 })
    expect(p.words.filter((w) => w.bow)).toHaveLength(3)
  })
})

/** A synthetic recording envelope: voiced syllables, short word gaps, long line pauses. */
function fakeEnvelope(lines: number[][], hop: number, lead = 0.8) {
  const env: number[] = []
  const marks: number[] = []
  const push = (sec: number, v: number) => {
    for (let i = 0; i < Math.round(sec / hop); i++) env.push(v + ((i * 7919) % 13) * 0.0005)
  }
  push(lead, 0.004)
  for (const line of lines) {
    marks.push(env.length * hop)
    for (const syl of line) {
      for (let k = 0; k < syl; k++) {
        push(0.3, 0.3)
        push(0.04, 0.02)
      }
      push(0.1, 0.01)
    }
    push(0.9, 0.004)
  }
  return { env, marks }
}

describe('autoAlign', () => {
  it('finds line starts from pauses in a recording', () => {
    const lines = chantById('namo').lines
    const shape = lines.map((l) => lineWords(l).map((w) => Math.min(6, w.length > 8 ? 6 : 2)))
    const { env, marks } = fakeEnvelope(shape, 0.02)
    const t = autoAlign(env, 0.02, lineWeights(lines))!
    expect(t).not.toBeNull()
    expect(t.auto).toBe(true)
    t.lines.forEach((x, i) => expect(Math.abs(x - marks[i])).toBeLessThan(0.1))
    expect(t.end).toBeGreaterThan(t.lines[2])
  })
  it('prefers the pauses that match line lengths over word gaps', () => {
    const lines = ['a b c d', 'e', 'f g h']
    const w = [
      [2, 2, 2, 2],
      [2],
      [2, 2, 2],
    ]
    const { env, marks } = fakeEnvelope(w, 0.02)
    const t = autoAlign(env, 0.02, [8, 2, 6])!
    t.lines.forEach((x, i) => expect(Math.abs(x - marks[i])).toBeLessThan(0.1))
    expect(lines).toHaveLength(3)
  })
  it('gives up on silence', () => {
    expect(autoAlign(new Array(500).fill(0.001), 0.02, [1, 1])).toBeNull()
    expect(autoAlign([], 0.02, [1])).toBeNull()
  })
  it('computes an RMS envelope', () => {
    const sr = 1000
    const s = new Float32Array(sr)
    for (let i = 500; i < 1000; i++) s[i] = i % 2 ? 0.5 : -0.5
    const e = envelope(s, sr, 0.1)
    expect(e).toHaveLength(10)
    expect(e[0]).toBe(0)
    expect(e[9]).toBeCloseTo(0.5)
  })
})

describe('speech pacing', () => {
  it('picks a slower rate for slower tempos and learns the voice speed', () => {
    expect(speechRateFor(460)).toBeLessThan(speechRateFor(330))
    expect(speechRateFor(200, 5)).toBe(1)
    expect(speechRateFor(10000)).toBe(0.3)
    const sps = learnSps(5, 20, 2, 1)
    expect(sps).toBeGreaterThan(5)
    expect(learnSps(5, 20, 0.1, 1)).toBe(5)
  })
  it('reads lines without bow markers', () => {
    expect(speakable('ธัมมัง นะมัสสามิ (กราบ)')).toBe('ธัมมัง นะมัสสามิ')
  })
})

describe('pickQuiz', () => {
  const plan = synthPlan(stage({ chant: 'sila5', hint: 'memory' }))
  const pool = chantById('sila5').lines.flatMap(lineWords)
  const q = pickQuiz(plan.words, pool, 3, 0.4)
  it('picks some words, never the first or two in a row', () => {
    expect(q.length).toBeGreaterThan(2)
    expect(q.every((x) => x.i > 0)).toBe(true)
    for (let k = 1; k < q.length; k++) expect(q[k].i - q[k - 1].i).toBeGreaterThanOrEqual(2)
  })
  it('offers three different choices including the answer', () => {
    for (const x of q) {
      expect(x.choices).toHaveLength(3)
      expect(new Set(x.choices).size).toBe(3)
      expect(x.choices[x.answer]).toBe(plan.words[x.i].text)
    }
  })
  it('is deterministic for a seed', () => {
    expect(pickQuiz(plan.words, pool, 3, 0.4)).toEqual(q)
  })
})
