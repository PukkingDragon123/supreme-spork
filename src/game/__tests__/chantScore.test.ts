import { describe, expect, it } from 'vitest'
import { buildTimeline, ChantScorer, estimateSyllables, gradeFor, splitSyllables, starsFor, starsWith, type Judge, type TimelineWord } from '../chantScore'
import { CHANTS } from '../data/chants'
import type { VoiceFrame } from '../../engine/voice'

const NAMO = CHANTS.find((c) => c.id === 'namo')!.lines
const TRIPLE = CHANTS.find((c) => c.id === 'triple_gem')!.lines
const FPS = 60

const inWord = (words: TimelineWord[], t: number) => words.find((w) => t >= w.start && t <= w.start + w.dur)

type Shape = (t: number, w: TimelineWord | undefined) => number

/** Drive a voice-mode scorer with synthetic 60 fps frames. */
function sing(
  lines: string[],
  voiced: (t: number, w: TimelineWord | undefined) => boolean,
  pitch: Shape = (t) => 150 + 1.5 * Math.sin(t * 5),
  loud: Shape = () => 0.6,
) {
  const tl = buildTimeline(lines)
  const judged: Judge[] = []
  const s = new ChantScorer(tl, { mode: 'voice', onJudge: (_, j) => judged.push(j) })
  for (let i = 0; i <= tl.total * FPS; i++) {
    const t = i / FPS
    const w = inWord(tl.words, t)
    const active = voiced(t, w)
    const f: VoiceFrame = {
      t,
      level: active ? 0.05 : 0.002,
      loudness: active ? loud(t, w) : 0,
      active,
      pitch: active ? pitch(t, w) : null,
      clarity: active ? 0.95 : 0,
    }
    s.feed(f)
  }
  return { tl, s, judged, r: s.finish() }
}

function tapAll(lines: string[], offset: number, skip: (i: number) => boolean = () => false) {
  const tl = buildTimeline(lines)
  const s = new ChantScorer(tl, { mode: 'tap' })
  for (const w of tl.words) {
    s.advance(w.start - 0.5)
    if (!skip(w.index)) s.tap(w.start + offset)
  }
  s.advance(tl.total)
  return { tl, s, r: s.finish() }
}

describe('estimateSyllables', () => {
  it('counts Pali syllables written in Thai', () => {
    expect(estimateSyllables('นะโม')).toBe(2)
    expect(estimateSyllables('ตัสสะ')).toBe(2)
    expect(estimateSyllables('ภะคะวะโต')).toBe(4)
    expect(estimateSyllables('อะระหะโต')).toBe(4)
    expect(estimateSyllables('สัมมาสัมพุทธัสสะ')).toBeGreaterThanOrEqual(5)
    expect(estimateSyllables('สัมมาสัมพุทธัสสะ')).toBeLessThanOrEqual(6)
    expect(estimateSyllables('พุทโธ')).toBe(2)
    expect(estimateSyllables('อะภิวาเทมิ')).toBe(5)
  })

  it('clamps to 1..6', () => {
    expect(estimateSyllables('')).toBe(1)
    expect(estimateSyllables('ok')).toBe(1)
    expect(estimateSyllables('วิชชาจะระณะสัมปันโน')).toBe(6)
  })
})

describe('buildTimeline', () => {
  it('lays words out in order with syllable-based durations', () => {
    const { words, total } = buildTimeline(NAMO)
    expect(words).toHaveLength(15)
    expect(words[0]).toMatchObject({ index: 0, text: 'นะโม', line: 0, start: 1.5 })
    expect(words[0].dur).toBeCloseTo(0.76)
    expect(words[1].start).toBeCloseTo(1.5 + 0.76 + 0.12)
    expect(words[5].line).toBe(1)
    expect(words[5].start - (words[4].start + words[4].dur)).toBeCloseTo(0.6)
    for (let i = 1; i < words.length; i++) expect(words[i].start).toBeGreaterThan(words[i - 1].start + words[i - 1].dur)
    const last = words[words.length - 1]
    expect(total).toBeGreaterThan(last.start + last.dur)
  })

  it('marks bows and adds a pause after them', () => {
    const withBow = buildTimeline(['ธัมมัง นะมัสสามิ (กราบ)', 'สังฆัง นะมามิ'])
    const plain = buildTimeline(['ธัมมัง นะมัสสามิ', 'สังฆัง นะมามิ'])
    expect(withBow.words.map((w) => w.text)).toEqual(['ธัมมัง', 'นะมัสสามิ', 'สังฆัง', 'นะมามิ'])
    expect(withBow.words[1].bow).toBe(true)
    expect(withBow.words[0].bow).toBeUndefined()
    expect(withBow.total - plain.total).toBeCloseTo(1.4)
    expect(buildTimeline(TRIPLE).words.filter((w) => w.bow)).toHaveLength(3)
  })

  it('respects options', () => {
    const { words } = buildTimeline(['นะโม ตัสสะ'], { msPerSyllable: 500, gapMs: 0, leadInMs: 0 })
    expect(words[0].start).toBe(0)
    expect(words[1].start).toBeCloseTo(1)
  })
})

describe('ChantScorer (voice)', () => {
  it('rewards a steady singer who follows every word', () => {
    const { r, judged, tl } = sing(TRIPLE, (_, w) => !!w)
    expect(judged).toHaveLength(tl.words.length)
    expect(r.miss).toBe(0)
    expect(r.perfect).toBe(tl.words.length)
    expect(r.maxCombo).toBe(tl.words.length)
    expect(r.stars).toBe(3)
    expect(['S', 'A']).toContain(r.grade)
    expect(r.completeness).toBe(100)
    expect(r.focus).toBeGreaterThan(85)
  })

  it('gives nothing for silence', () => {
    const { r, tl, s } = sing(NAMO, () => false)
    expect(r.miss).toBe(tl.words.length)
    expect(r.stars).toBe(0)
    expect(r.score).toBe(0)
    expect(r.grade).toBe('D')
    expect(s.combo).toBe(0)
  })

  it('scores half a chant in between', () => {
    const { r, tl } = sing(NAMO, (_, w) => !!w && w.index % 2 === 0)
    expect(r.miss).toBe(Math.floor(tl.words.length / 2))
    expect(r.stars).toBeGreaterThanOrEqual(0)
    expect(r.stars).toBeLessThanOrEqual(2)
    expect(r.score).toBeGreaterThan(20)
    expect(r.score).toBeLessThan(72)
  })

  it('judges late or partial voicing as good', () => {
    const { r } = sing(NAMO, (t, w) => !!w && t > w.start + w.dur * 0.55)
    expect(r.good).toBe(15)
    expect(r.perfect).toBe(0)
  })

  it('does not penalise slurring words together, but does penalise sound during long rests', () => {
    const lines = ['นะโม ตัสสะ ภะคะวะโต', 'อะระหะโต สัมมาสัมพุทธัสสะ']
    const words = buildTimeline(lines).words
    const clean = sing(lines, (_, w) => !!w).r
    // Voice carried across the short gaps inside a line, dipping between words.
    const inLine = (t: number) => words.some((w) => t >= w.start - 0.02 && t <= w.start + w.dur + 0.13)
    const slurred = sing(lines, inLine, undefined, (_, w) => (w ? 0.7 : 0.3)).r
    expect(slurred.flow).toBe(clean.flow)
    expect(slurred.perfect).toBe(words.length)
    // A drone with no articulation still counts, but never as perfect after the first word.
    const droning = sing(lines, (t) => t > 1.4 && t < 9.5).r
    expect(droning.flow).toBeLessThan(clean.flow)
    expect(droning.miss).toBe(0)
    expect(droning.perfect).toBe(1)
    expect(droning.stars).toBeLessThan(clean.stars)
  })

  it('penalises a wobbly pitch in focus', () => {
    const steady = sing(NAMO, (_, w) => !!w).r
    const wobbly = sing(NAMO, (_, w) => !!w, (t) => 150 * (1 + 0.25 * Math.sin(t * 20))).r
    expect(wobbly.focus).toBeLessThan(steady.focus)
  })

  it('ignores taps and out-of-order frames', () => {
    const s = new ChantScorer(buildTimeline(NAMO), { mode: 'voice' })
    expect(s.tap(1.5)).toBeNull()
    s.feed({ t: 2, level: 0.05, loudness: 0.5, active: true, pitch: 150, clarity: 0.9 })
    s.feed({ t: 1, level: 0.05, loudness: 0.5, active: true, pitch: 150, clarity: 0.9 })
    expect(s.finish()).toBe(s.finish())
  })
})

describe('ChantScorer (tap)', () => {
  it('gives three stars for taps on every beat', () => {
    const { r, tl } = tapAll(TRIPLE, 0)
    expect(r.perfect).toBe(tl.words.length)
    expect(r.stars).toBe(3)
    expect(r.score).toBe(100)
  })

  it('rates consistently late taps mostly good', () => {
    const { r, tl } = tapAll(NAMO, 0.2)
    expect(r.good).toBeGreaterThanOrEqual(Math.ceil(tl.words.length * 0.8))
    expect(r.perfect).toBe(0)
    expect(r.score).toBeLessThan(tapAll(NAMO, 0).r.score)
    expect(r.focus).toBe(100)
  })

  it('resets the combo on a miss', () => {
    const tl = buildTimeline(NAMO)
    const combos: number[] = []
    const s = new ChantScorer(tl, { mode: 'tap' })
    s.onJudge = () => combos.push(s.combo)
    for (const w of tl.words) if (w.index !== 3) s.tap(w.start + 0.05)
    const r = s.finish()
    expect(s.judgements[3]).toBe('miss')
    expect(combos.slice(0, 5)).toEqual([1, 2, 3, 0, 1])
    expect(r.maxCombo).toBe(tl.words.length - 4)
    expect(r.miss).toBe(1)
  })

  it('treats far-off taps as strays and judges unmatched words as misses', () => {
    const tl = buildTimeline(NAMO)
    const s = new ChantScorer(tl, { mode: 'tap' })
    expect(s.tap(0.2)).toBeNull()
    expect(s.tap(tl.words[0].start + 0.1)).toBe('perfect')
    expect(s.tap(tl.words[0].start + 0.15)).toBeNull()
    s.advance(tl.words[2].start + tl.words[2].dur + 0.01)
    expect(s.judgements.slice(0, 3)).toEqual(['perfect', 'miss', 'miss'])
    expect(s.combo).toBe(0)
  })

  it('penalises spam taps', () => {
    const tl = buildTimeline(NAMO)
    const s = new ChantScorer(tl, { mode: 'tap' })
    for (let t = 0; t < tl.total; t += 0.1) s.tap(t)
    const r = s.finish()
    expect(r.flow).toBeLessThan(80)
    expect(r.stars).toBeLessThan(3)
  })
})

describe('grading', () => {
  it('maps scores to stars and grades', () => {
    expect([0, 49, 50, 71, 72, 87, 88, 100].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
    expect([100, 95, 94, 85, 70, 69, 50, 10].map(gradeFor)).toEqual(['S', 'S', 'A', 'A', 'B', 'C', 'C', 'D'])
  })
})

describe('splitSyllables', () => {
  it('splits Pali written in Thai into syllables', () => {
    expect(splitSyllables('นะโม')).toEqual(['นะ', 'โม'])
    expect(splitSyllables('ภะคะวะโต')).toEqual(['ภะ', 'คะ', 'วะ', 'โต'])
    expect(splitSyllables('สัมมาสัมพุทธัสสะ')).toEqual(['สัม', 'มา', 'สัม', 'พุท', 'ธัส', 'สะ'])
    expect(splitSyllables('พุทโธ')).toEqual(['พุท', 'โธ'])
    expect(splitSyllables('สวากขาโต')).toEqual(['สวาก', 'ขา', 'โต'])
    expect(splitSyllables('ทักขิเณยโย')).toEqual(['ทัก', 'ขิ', 'เณย', 'โย'])
    expect(splitSyllables('กวนซืออิม')).toEqual(['กวน', 'ซือ', 'อิม'])
    expect(splitSyllables('ผ่อสัก')).toEqual(['ผ่อ', 'สัก'])
    expect(splitSyllables('วิชชาจะระณะสัมปันโน')).toHaveLength(8)
  })
  it('joins back to the word and never splits empty text', () => {
    for (const w of ['อัญชะลีกะระณีโย', 'ครีเมขะลัง', 'โอม', 'ศรี', 'คเณศายะ']) expect(splitSyllables(w).join('')).toBe(w)
    expect(splitSyllables('')).toEqual([])
    expect(splitSyllables('ok')).toEqual(['ok'])
  })
})

describe('ChantScorer difficulty', () => {
  it('tightens the tap windows with the judge level', () => {
    const tl = buildTimeline(NAMO)
    const late = (judge: 1 | 2 | 3 | 4, off: number) => {
      const s = new ChantScorer(tl, { mode: 'tap', judge })
      for (const w of tl.words) s.tap(w.start + off)
      return s.finish()
    }
    expect(late(1, 0.13).perfect).toBe(tl.words.length)
    expect(late(2, 0.13).perfect).toBe(0)
    expect(late(4, 0.09).perfect).toBe(0)
    expect(late(4, 0.07).perfect).toBe(tl.words.length)
    // A tap late inside a long word only counts at the kinder levels.
    const long = buildTimeline(['สัมมาสัมพุทธัสสะ'])
    const w = long.words[0]
    const kind = new ChantScorer(long, { mode: 'tap', judge: 1 })
    expect(kind.tap(w.start + w.dur * 0.8)).toBe('good')
    const strict = new ChantScorer(long, { mode: 'tap', judge: 4 })
    expect(strict.tap(w.start + w.dur * 0.8)).toBeNull()
  })
  it('uses the stage star thresholds', () => {
    const { tl } = tapAll(NAMO, 0)
    const s = new ChantScorer(tl, { mode: 'tap', stars: [95, 99, 101] })
    for (const w of tl.words) s.tap(w.start)
    expect(s.finish().stars).toBe(2)
    expect(starsWith(60, [62, 80, 92])).toBe(0)
    expect(starsWith(62, [62, 80, 92])).toBe(1)
  })
  it('judges memory quiz answers: wrong is a miss, right is at least good', () => {
    const tl = buildTimeline(NAMO)
    const s = new ChantScorer(tl, { mode: 'tap', quiz: [1, 3] })
    s.tap(tl.words[0].start)
    expect(s.answer(1, tl.words[1].start - 0.9, true)).toBe('good')
    s.tap(tl.words[2].start)
    expect(s.answer(3, tl.words[3].start, false)).toBe('miss')
    expect(s.answer(3, tl.words[3].start, true)).toBeNull()
    // Quiz words stay open a little longer than normal words.
    const w = tl.words[5]
    const s2 = new ChantScorer(tl, { mode: 'tap', quiz: [5], judge: 4 })
    s2.advance(w.start + w.dur + 0.2)
    expect(s2.judgements[5]).toBeUndefined()
    expect(s2.answer(5, w.start + w.dur + 0.2, true)).toBe('good')
  })
  it('estimates the score while chanting', () => {
    const tl = buildTimeline(NAMO)
    const s = new ChantScorer(tl, { mode: 'tap' })
    expect(s.liveScore()).toBe(0)
    for (const w of tl.words.slice(0, 5)) s.tap(w.start)
    expect(s.liveScore()).toBeGreaterThan(85)
    s.advance(tl.words[9].start + tl.words[9].dur + 0.5)
    expect(s.liveScore()).toBeLessThan(70)
    expect(s.tapOffset(0)).toBeCloseTo(0)
    expect(s.tapOffset(6)).toBeNull()
  })
  it('gives every timeline word syllable windows that tile the word', () => {
    for (const w of buildTimeline(TRIPLE).words) {
      expect(w.syl.map((x) => x.text).join('')).toBe(w.text)
      expect(w.syl[0].start).toBeCloseTo(w.start)
      const last = w.syl[w.syl.length - 1]
      expect(last.start + last.dur).toBeCloseTo(w.start + w.dur)
    }
  })
})
