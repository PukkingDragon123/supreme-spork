// Prayer stages: the core loop. Each chapter is a temple; each stage is a
// chant sung at a tempo. Clearing a stage (1★+) opens the next one, and
// stars open the next temple.

import type { AreaId } from './areas'
import type { MaterialId } from '../materials'
import { CHANTS, DEDICATION, type Chant } from './chants'

export interface PrayerStage {
  id: string
  chapter: AreaId
  /** 1-based number shown on the tile. */
  n: number
  chant: string
  /** Repeat the chant this many times (e.g. นะโม ๓ จบ is already 3 lines). */
  rounds?: number
  /** Milliseconds per syllable: lower is faster. */
  tempo: number
  /** Bows (กราบ) after the chant. */
  bows: number
  merit: number
  coins: number
  /** Materials awarded on the first clear and (fewer) on replays. */
  mats: Partial<Record<MaterialId, number>>
  /** Stage is a "boss": longer, gold tile. */
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
  { id: 'mountain', name: 'วัดบนดอย', short: 'บนดอย', stars: 30, hall: 'mountain' },
]

const S = (
  chapter: AreaId,
  n: number,
  chant: string,
  tempo: number,
  merit: number,
  coins: number,
  mats: PrayerStage['mats'],
  extra: Partial<PrayerStage> = {},
): PrayerStage => ({ id: `${chapter}-${n}`, chapter, n, chant, tempo, bows: 3, merit, coins, mats, ...extra })

export const STAGES: PrayerStage[] = [
  S('wat', 1, 'namo1', 440, 12, 6, { flower: 2 }, { bows: 1 }),
  S('wat', 2, 'namo', 420, 16, 8, { wood: 2, flower: 1 }),
  S('wat', 3, 'triple_gem', 420, 20, 10, { wood: 2, cloth: 1 }),
  S('wat', 4, 'refuge', 400, 24, 12, { cloth: 2, clay: 1 }),
  S('wat', 5, 'sila5', 380, 30, 15, { wood: 3, gold: 1 }, { big: true }),
  S('wat', 6, 'itipiso', 380, 34, 16, { clay: 2, flower: 2 }),
  S('wat', 7, 'dhamma', 370, 34, 16, { wood: 2, cloth: 2 }),
  S('wat', 8, 'sangha', 360, 38, 18, { clay: 2, gold: 1 }),
  S('wat', 9, 'metta_all', 380, 30, 16, { flower: 3, cloth: 1 }),
  S('wat', 10, 'dedication', 360, 44, 24, { gold: 2, wood: 2 }, { big: true }),

  S('shrine', 1, 'ganesha', 400, 26, 14, { gold: 1, flower: 2 }, { bows: 1 }),
  S('shrine', 2, 'guanyin', 400, 26, 14, { cloth: 2, flower: 1 }, { bows: 1 }),
  S('shrine', 3, 'lakshmi', 400, 26, 14, { gold: 1, clay: 1 }, { bows: 1 }),
  S('shrine', 4, 'ganesha', 330, 32, 18, { gold: 2 }, { rounds: 3, bows: 1 }),
  S('shrine', 5, 'guanyin', 330, 32, 18, { cloth: 3 }, { rounds: 3, bows: 1 }),
  S('shrine', 6, 'lakshmi', 330, 40, 24, { gold: 2, flower: 2 }, { rounds: 3, bows: 1, big: true }),

  S('river', 1, 'metta_self', 380, 34, 18, { wood: 3, flower: 1 }),
  S('river', 2, 'yatha', 380, 40, 20, { clay: 3 }),
  S('river', 3, 'bahum', 400, 46, 24, { wood: 2, gold: 1 }),
  S('river', 4, 'itipiso', 330, 46, 24, { cloth: 3, clay: 1 }, { rounds: 2 }),
  S('river', 5, 'jinabanchara', 380, 56, 30, { gold: 3, wood: 2 }, { big: true }),

  S('mountain', 1, 'triple_gem', 330, 50, 26, { wood: 3, cloth: 2 }),
  S('mountain', 2, 'sila5', 320, 56, 28, { clay: 3, flower: 2 }),
  S('mountain', 3, 'bahum', 340, 60, 30, { gold: 2, cloth: 2 }),
  S('mountain', 4, 'jinabanchara', 330, 66, 34, { gold: 3, clay: 2 }),
  S('mountain', 5, 'itipiso', 300, 90, 50, { gold: 4, wood: 3, cloth: 3 }, { rounds: 3, big: true }),
]

export const STAGE_BY_ID: Record<string, PrayerStage> = Object.fromEntries(STAGES.map((s) => [s.id, s]))

export function stagesOf(chapter: AreaId): PrayerStage[] {
  return STAGES.filter((s) => s.chapter === chapter)
}

const NAMO1: Chant = {
  id: 'namo1',
  name: 'นะโม ตัสสะ (๑ จบ)',
  short: 'นะโม ตัสสะ ภะคะวะโต',
  lines: ['นะโม ตัสสะ ภะคะวะโต อะระหะโต สัมมาสัมพุทธัสสะ'],
  meaning: 'ขอนอบน้อมแด่พระผู้มีพระภาคเจ้า ผู้เป็นพระอรหันต์ ตรัสรู้ชอบได้โดยพระองค์เอง – บทแรกก่อนสวดทุกบท',
  merit: 6,
}

const DEDICATION_CHANT: Chant = {
  id: 'dedication',
  name: DEDICATION.name,
  short: 'อิทัง เม ญาตีนัง โหตุ',
  lines: DEDICATION.lines,
  meaning: DEDICATION.meaning,
  merit: 12,
}

const EXTRA_CHANTS = [NAMO1, DEDICATION_CHANT]

export function chantById(id: string): Chant {
  return CHANTS.find((c) => c.id === id) ?? EXTRA_CHANTS.find((c) => c.id === id) ?? CHANTS[0]
}

/** Lines to sing for a stage (with rounds expanded). */
export function stageLines(st: PrayerStage): string[] {
  const c = chantById(st.chant)
  const out: string[] = []
  for (let r = 0; r < (st.rounds ?? 1); r++) out.push(...c.lines)
  return out
}
