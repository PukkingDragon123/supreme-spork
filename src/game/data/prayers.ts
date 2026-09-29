// Prayer stages: the core loop. Each chapter is a temple; each stage is a
// chant (or part of one) sung at a tempo with a difficulty. A stage must be
// PASSED (1★ = its pass mark) to open the next one, and stars open the next
// temple. Difficulty ramps up with longer passages, faster tempo, tighter
// timing windows and fewer on-screen hints; boss stages recite a whole บท.

import type { AreaId } from './areas'
import type { MaterialId } from '../materials'
import { CHANTS, CHANT_BY_ID, type Chant } from './chants'

/** Timing strictness: 1 kind … 4 strict. */
export type JudgeLevel = 1 | 2 | 3 | 4

/**
 * On-screen help:
 * - learn: full text, approach ring, a wood-block tick on every word, guide voice
 * - read: full text and guide voice
 * - fade: text appears only as you reach it, softer guide
 * - memory: words are blanks (tap mode picks the right word); no guide voice
 */
export type HintLevel = 'learn' | 'read' | 'fade' | 'memory'

export interface PrayerStage {
  id: string
  chapter: AreaId
  /** 1-based number shown on the tile. */
  n: number
  chant: string
  /** Only these chant lines [from, to) (default: the whole chant). */
  part?: [number, number]
  /** Repeat the passage this many times. */
  rounds?: number
  /** Milliseconds per syllable: lower is faster. */
  tempo: number
  judge: JudgeLevel
  hint: HintLevel
  /** Bows (กราบ) after the chant. */
  bows: number
  merit: number
  coins: number
  /** Materials awarded on the first clear and (fewer) on replays. */
  mats: Partial<Record<MaterialId, number>>
  /** Boss stage: a whole บท, gold tile. */
  big?: boolean
}

export interface PrayerChapter {
  id: AreaId
  name: string
  short: string
  /** Total stars needed across all chapters to open this one. */
  stars: number
  /** Where the prayer happens. */
  hall: 'wat' | 'river' | 'mountain' | 'shrine'
}

export const CHAPTERS: PrayerChapter[] = [
  { id: 'wat', name: 'วัดศรีบุญดี', short: 'ใกล้บ้าน', stars: 0, hall: 'wat' },
  { id: 'shrine', name: 'ลานเทพรวมใจ', short: 'ลานเทพ', stars: 8, hall: 'shrine' },
  { id: 'river', name: 'วัดริมน้ำ', short: 'ริมน้ำ', stars: 18, hall: 'river' },
  { id: 'mountain', name: 'วัดบนดอย', short: 'บนดอย', stars: 32, hall: 'mountain' },
]

const S = (
  chapter: AreaId,
  n: number,
  chant: string,
  hint: HintLevel,
  judge: JudgeLevel,
  tempo: number,
  merit: number,
  coins: number,
  mats: PrayerStage['mats'],
  extra: Partial<PrayerStage> = {},
): PrayerStage => ({ id: `${chapter}-${n}`, chapter, n, chant, hint, judge, tempo, bows: 3, merit, coins, mats, ...extra })

export const STAGES: PrayerStage[] = [
  S('wat', 1, 'namo', 'learn', 1, 460, 12, 6, { flower: 2 }, { part: [0, 1], bows: 1 }),
  S('wat', 2, 'triple_gem', 'learn', 1, 440, 16, 8, { wood: 2, flower: 1 }),
  S('wat', 3, 'namo', 'learn', 1, 430, 18, 9, { wood: 2, cloth: 1 }),
  S('wat', 4, 'refuge', 'read', 2, 420, 20, 10, { cloth: 2 }, { part: [0, 3] }),
  S('wat', 5, 'refuge', 'read', 2, 410, 24, 12, { cloth: 2, clay: 1 }),
  S('wat', 6, 'namo', 'memory', 2, 420, 24, 12, { flower: 2, clay: 1 }),
  S('wat', 7, 'itipiso', 'read', 2, 410, 26, 13, { clay: 2, flower: 1 }, { part: [0, 2] }),
  S('wat', 8, 'itipiso', 'read', 2, 400, 30, 15, { clay: 2, flower: 2 }),
  S('wat', 9, 'metta_all', 'read', 2, 400, 30, 16, { flower: 3, cloth: 1 }),
  S('wat', 10, 'wai_set', 'read', 2, 390, 44, 24, { gold: 2, wood: 2 }, { big: true }),

  S('shrine', 1, 'ganesha', 'learn', 1, 400, 26, 14, { gold: 1, flower: 2 }, { bows: 1 }),
  S('shrine', 2, 'guanyin', 'learn', 1, 400, 26, 14, { cloth: 2, flower: 1 }, { bows: 1 }),
  S('shrine', 3, 'lakshmi', 'learn', 1, 400, 26, 14, { gold: 1, clay: 1 }, { bows: 1 }),
  S('shrine', 4, 'ganesha', 'fade', 2, 340, 32, 18, { gold: 2 }, { rounds: 2, bows: 1 }),
  S('shrine', 5, 'guanyin', 'memory', 2, 340, 32, 18, { cloth: 3 }, { rounds: 2, bows: 1 }),
  S('shrine', 6, 'deva_set', 'read', 3, 330, 44, 26, { gold: 2, flower: 2 }, { bows: 1, big: true }),

  S('river', 1, 'metta_self', 'read', 2, 400, 34, 18, { wood: 3, flower: 1 }),
  S('river', 2, 'metta_all', 'fade', 2, 380, 36, 18, { flower: 2, cloth: 1 }),
  S('river', 3, 'sila5', 'read', 2, 390, 40, 20, { clay: 3 }),
  S('river', 4, 'dhamma', 'read', 3, 380, 40, 20, { wood: 2, cloth: 1 }),
  S('river', 5, 'sangha', 'read', 3, 370, 44, 22, { cloth: 2, clay: 1 }, { part: [0, 4] }),
  S('river', 6, 'yatha', 'read', 3, 380, 46, 24, { clay: 2, gold: 1 }),
  S('river', 7, 'sila5', 'memory', 3, 380, 48, 26, { wood: 2, gold: 1 }),
  S('river', 8, 'itipiso_full', 'read', 3, 370, 70, 40, { gold: 3, wood: 2 }, { big: true }),

  S('mountain', 1, 'bahum', 'read', 3, 400, 50, 26, { wood: 3, cloth: 2 }),
  S('mountain', 2, 'jinabanchara', 'read', 3, 380, 54, 28, { clay: 3, flower: 2 }, { part: [0, 4] }),
  S('mountain', 3, 'jinabanchara', 'read', 3, 380, 56, 28, { gold: 2, cloth: 2 }, { part: [4, 8] }),
  S('mountain', 4, 'triple_gem', 'memory', 3, 360, 58, 30, { gold: 2, clay: 2 }),
  S('mountain', 5, 'bahum', 'fade', 4, 350, 60, 32, { gold: 2, wood: 2 }),
  S('mountain', 6, 'refuge', 'memory', 4, 340, 64, 34, { cloth: 3, clay: 2 }),
  S('mountain', 7, 'itipiso', 'memory', 4, 340, 66, 34, { gold: 3, flower: 2 }),
  S('mountain', 8, 'jinabanchara', 'fade', 4, 330, 96, 54, { gold: 4, wood: 3, cloth: 3 }, { big: true }),
]

export const STAGE_BY_ID: Record<string, PrayerStage> = Object.fromEntries(STAGES.map((s) => [s.id, s]))

export function stagesOf(chapter: AreaId): PrayerStage[] {
  return STAGES.filter((s) => s.chapter === chapter)
}

export function chantById(id: string): Chant {
  return CHANT_BY_ID[id] ?? CHANTS[0]
}

/** The chant line range a stage sings. */
export function stageRange(st: PrayerStage): [number, number] {
  const n = chantById(st.chant).lines.length
  const [a, b] = st.part ?? [0, n]
  return [Math.max(0, Math.min(n - 1, a)), Math.max(1, Math.min(n, b))]
}

/** Lines to sing for a stage (with rounds expanded). */
export function stageLines(st: PrayerStage): string[] {
  const c = chantById(st.chant)
  const [a, b] = stageRange(st)
  const out: string[] = []
  for (let r = 0; r < (st.rounds ?? 1); r++) out.push(...c.lines.slice(a, b))
  return out
}

/** For each stage line, the chant line it comes from (for verse meanings). */
export function stageSourceLines(st: PrayerStage): number[] {
  const [a, b] = stageRange(st)
  const out: number[] = []
  for (let r = 0; r < (st.rounds ?? 1); r++) for (let i = a; i < b; i++) out.push(i)
  return out
}

/** Score needed for 1★ (the pass mark), 2★ and 3★. */
export const STAR_TABLE: Record<JudgeLevel, readonly [number, number, number]> = {
  1: [50, 72, 88],
  2: [55, 75, 90],
  3: [58, 78, 91],
  4: [62, 80, 92],
}

export function stageStarScores(st: PrayerStage): readonly [number, number, number] {
  return STAR_TABLE[st.judge] ?? STAR_TABLE[2]
}

/** Score needed to pass the stage (and open the next one). */
export function passMark(st: PrayerStage): number {
  return stageStarScores(st)[0]
}

export const HINT_LABEL: Record<HintLevel, { name: string; desc: string; icon: string }> = {
  learn: { name: 'ฝึกหัด', desc: 'มีเสียงนำ เสียงเกราะทุกคำ และวงบอกจังหวะ', icon: 'book' },
  read: { name: 'อ่านตาม', desc: 'มีเสียงนำและตัวบทครบ', icon: 'scroll' },
  fade: { name: 'จางหาย', desc: 'ตัวบทโผล่ทีละคำ ต้องจำล่วงหน้า', icon: 'sparkle' },
  memory: { name: 'ท่องจำ', desc: 'ตัวบทเป็นช่องว่าง ไม่มีเสียงนำ เลือกคำให้ถูก', icon: 'meditate' },
}

export const JUDGE_LABEL: Record<JudgeLevel, string> = { 1: 'ใจดี', 2: 'ปกติ', 3: 'แม่นยำ', 4: 'เป๊ะมาก' }

/** Syllables per second as a friendly tempo label. */
export function tempoLabel(ms: number): string {
  return ms >= 430 ? 'ช้า' : ms >= 390 ? 'ปานกลาง' : ms >= 350 ? 'เร็ว' : 'เร็วมาก'
}
