import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import * as A from '../actions'
import * as P from '../prayer'
import { CHANTS, CHANT_SETS, CHANT_BY_ID, verseOf } from '../data/chants'
import { CHAPTERS, STAGES, STAGE_BY_ID, STAR_TABLE, passMark, stageLines, stageRange, stagesOf } from '../data/prayers'
import { notices } from '../events'
import type { ChantResult } from '../chantScore'
import type { GameEvent } from '../data/quests'

const result = (score: number, stars: 0 | 1 | 2 | 3): ChantResult => ({
  score,
  stars,
  grade: 'B',
  perfect: 5,
  good: 5,
  miss: 0,
  maxCombo: 10,
  rhythm: score,
  flow: score,
  focus: score,
  completeness: score,
})

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  notices.value = []
  A.ensureDaily()
})

describe('chant texts and meanings', () => {
  it('every chant has a meaning, when-to-chant text and an illustration', () => {
    for (const c of [...CHANTS, ...CHANT_SETS]) {
      expect(c.meaning.length).toBeGreaterThan(10)
      expect(c.when.length).toBeGreaterThan(10)
      expect(c.art).toBeTruthy()
      expect(c.lines.length).toBeGreaterThan(0)
    }
  })
  it('verses cover valid line ranges in order', () => {
    for (const c of [...CHANTS, ...CHANT_SETS]) {
      let last = 0
      for (const v of c.verses ?? []) {
        expect(v.from).toBeGreaterThanOrEqual(last)
        expect(v.to).toBeGreaterThan(v.from)
        expect(v.to).toBeLessThanOrEqual(c.lines.length)
        expect(v.text.length).toBeGreaterThan(5)
        last = v.to
      }
      if (c.verses?.length) expect(verseOf(c, 0)).toBe(c.verses[0])
    }
  })
  it('the dedication (กรวดน้ำ) chant is gone', () => {
    const all = JSON.stringify([...CHANTS, ...CHANT_SETS])
    expect(all).not.toContain('กรวดน้ำ')
    expect(all).not.toContain('อิทัง เม ญาตีนัง')
    expect(CHANT_BY_ID.dedication).toBeUndefined()
    expect(STAGES.some((s) => s.chant === 'dedication')).toBe(false)
  })
  it('sets string whole chants together', () => {
    const full = CHANT_BY_ID.itipiso_full
    expect(full.lines).toEqual([...CHANT_BY_ID.itipiso.lines, ...CHANT_BY_ID.dhamma.lines, ...CHANT_BY_ID.sangha.lines])
    expect(verseOf(full, 5)?.art).toBe('dhamma')
    expect(verseOf(full, 14)?.art).toBe('sangha')
  })
  it('keeps key Pali texts exact', () => {
    expect(CHANT_BY_ID.namo.lines[0]).toBe('นะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ')
    expect(CHANT_BY_ID.itipiso.lines.join(' ')).toBe(
      'อิติปิ โส ภะคะวา อะระหัง สัมมาสัมพุทโธ วิชชาจะระณะสัมปันโน สุคะโต โลกะวิทู อะนุตตะโร ปุริสะทัมมะสาระถิ สัตถา เทวะมะนุสสานัง พุทโธ ภะคะวาติ',
    )
    expect(CHANT_BY_ID.jinabanchara.lines[4]).toBe('สีเส ปะติฏฐิโต มัยหัง พุทโธ ธัมโม ทะวิโลจะเน')
  })
})

describe('stage progression', () => {
  it('every stage sings real lines of a real chant', () => {
    for (const st of STAGES) {
      expect(CHANT_BY_ID[st.chant]).toBeDefined()
      const [a, b] = stageRange(st)
      expect(b).toBeGreaterThan(a)
      expect(stageLines(st).length).toBe((b - a) * (st.rounds ?? 1))
    }
  })
  it('each temple ends with a boss that recites a whole chant', () => {
    for (const c of CHAPTERS) {
      const list = stagesOf(c.id)
      const boss = list[list.length - 1]
      expect(boss.big).toBe(true)
      expect(boss.part).toBeUndefined()
    }
  })
  it('gets harder: stricter timing, fewer hints and more lines later on', () => {
    for (const c of CHAPTERS) {
      const js = stagesOf(c.id).map((s) => s.judge)
      for (let i = 1; i < js.length; i++) expect(js[i]).toBeGreaterThanOrEqual(js[i - 1])
    }
    const first = STAGES[0]
    const last = STAGES[STAGES.length - 1]
    expect(last.tempo).toBeLessThan(first.tempo)
    expect(passMark(last)).toBeGreaterThan(passMark(first))
    expect(STAGES.filter((s) => s.hint === 'memory').length).toBeGreaterThanOrEqual(4)
    expect(stagesOf('mountain').filter((s) => s.hint === 'memory' || s.hint === 'fade').length).toBeGreaterThanOrEqual(4)
    expect(stageLines(STAGE_BY_ID['river-8']).length).toBeGreaterThan(stageLines(STAGE_BY_ID['wat-4']).length * 4)
    for (const t of Object.values(STAR_TABLE)) expect(t[0]).toBeLessThan(t[1])
  })
  it('opens the next stage only after a pass, and tracks passes', () => {
    const seen: GameEvent[] = []
    const off = A.onTrack((e) => seen.push(e))
    try {
      const fail = P.finishPrayer('wat-1', result(30, 0), 'tap')
      expect(fail.passed).toBe(false)
      expect(fail.unlockedNext).toBeNull()
      expect(P.stageUnlocked(STAGE_BY_ID['wat-2'])).toBe(false)
      expect(seen.filter((e) => e === 'chant')).toHaveLength(1)
      expect(seen).not.toContain('prayer_pass')
      const ok = P.finishPrayer('wat-1', result(80, 2), 'tap')
      expect(ok.passed).toBe(true)
      expect(ok.unlockedNext).toBe('wat-2')
      expect(ok.passMark).toBe(passMark(STAGE_BY_ID['wat-1']))
      expect(P.stageUnlocked(STAGE_BY_ID['wat-2'])).toBe(true)
      expect(seen.filter((e) => e === 'prayer_pass')).toHaveLength(1)
      expect(seen.filter((e) => e === 'chant')).toHaveLength(2)
      // Replaying a passed stage does not "unlock" it again.
      expect(P.finishPrayer('wat-1', result(95, 3), 'tap').unlockedNext).toBeNull()
    } finally {
      off()
    }
  })
  it('reports temples opened by stars', () => {
    for (let n = 1; n <= 2; n++) P.finishPrayer(`wat-${n}`, result(95, 3), 'tap')
    const r = P.finishPrayer('wat-3', result(95, 3), 'tap')
    expect(r.chaptersOpened).toEqual(['shrine'])
  })
})

describe('old saves', () => {
  it('load with stars on removed or renamed stages without errors', () => {
    const old = { ...defaultState(), prayer: { ...defaultState().prayer, stars: { 'wat-1': 3, 'wat-10': 2, 'dedication-1': 3 }, best: { 'wat-10': 70 } } }
    const s = migrate(JSON.parse(JSON.stringify(old)))
    game.value = s
    expect(P.totalStars()).toBe(5)
    expect(P.nextStage().id).toBe('wat-2')
    expect(() => P.chapterStars('wat')).not.toThrow()
  })
})
