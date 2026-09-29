// อันดับวัดประจำภาค – every region's temples on a ranking ladder C → SS.
// Famous, hard-to-reach temples sit at the top: they need a higher level,
// more prayer stars, every lower-rank temple of the region "completed"
// (ทำบุญครบ) and, for S/SS, a special rank quest (npcQuests/ranks.ts).
// Unlock logic lives in src/game/homeland.ts; places.ts is untouched.

import type { Region } from './places'

export type TierId = 'C' | 'B' | 'A' | 'S' | 'SS'

export interface TierDef {
  id: TierId
  /** Thai title of the tier. */
  name: string
  /** Player level needed to enter a temple of this tier. */
  level: number
  /** Prayer stars needed (the place's own star price counts if higher). */
  stars: number
  /** Needs its temple's rank quest to be completed first. */
  quest: boolean
  /** Badge colours: [main, light, dark]. */
  color: [string, string, string]
  /** Completion reward on the ranking board. */
  coins: number
  merit: number
}

export const TIERS: TierDef[] = [
  { id: 'C', name: 'วัดน่าแวะ', level: 1, stars: 0, quest: false, color: ['#8fcf7a', '#c8f0b0', '#4f9a4c'], coins: 60, merit: 20 },
  { id: 'B', name: 'วัดดังประจำถิ่น', level: 4, stars: 6, quest: false, color: ['#6fb4f0', '#bfe3ff', '#3a78c0'], coins: 120, merit: 40 },
  { id: 'A', name: 'วัดขึ้นชื่อ', level: 8, stars: 14, quest: false, color: ['#b98af0', '#e2ccff', '#7a4cc0'], coins: 220, merit: 80 },
  { id: 'S', name: 'วัดศักดิ์สิทธิ์', level: 12, stars: 26, quest: true, color: ['#ff8a5c', '#ffd0a8', '#c8483a'], coins: 380, merit: 150 },
  { id: 'SS', name: 'ระดับตำนาน', level: 16, stars: 36, quest: true, color: ['#ffd23f', '#fff3a6', '#d08a1f'], coins: 650, merit: 260 },
]

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t])) as Record<TierId, TierDef>

/** 0 for C … 4 for SS. */
export function tierIndex(t: TierId): number {
  return TIERS.findIndex((x) => x.id === t)
}

export interface RankEntry {
  /** Place id (see places.ts). */
  place: string
  region: Region
  tier: TierId
  /** Why it ranks where it does (shown on the board). */
  blurb: string
  /** Rank quest id (S/SS only), see npcQuests/ranks.ts. */
  quest?: string
  /** Extra furniture from the completion reward (goes to home storage). */
  furniture?: string[]
  /** Collectible ids granted by the rank quest (preview only; the quest engine grants them). */
  collectibles?: string[]
}

const R = (place: string, region: Region, tier: TierId, blurb: string, extra: Partial<RankEntry> = {}): RankEntry => ({ place, region, tier, blurb, ...extra })

export const RANKS: RankEntry[] = [
  // --- กรุงเทพฯ ---------------------------------------------------------------
  R('erawan', 'bangkok', 'C', 'ศาลกลางเมือง แวะไหว้ได้ทุกวัน'),
  R('wat_pho', 'bangkok', 'C', 'วัดพระนอน หยอดเหรียญ 108 บาตร'),
  R('wat_arun', 'bangkok', 'B', 'พระปรางค์ริมเจ้าพระยา สัญลักษณ์กรุงเทพฯ', { furniture: ['b_robot'] }),
  R('golden_mount', 'bangkok', 'A', 'บันได 344 ขั้น ต้องใจสู้', { furniture: ['b_wfh'] }),
  R('wat_traimit', 'bangkok', 'S', 'พระพุทธรูปทองคำองค์ใหญ่ที่สุดในโลก', { quest: 'rank_bangkok_s', furniture: ['b_sofa'], collectibles: ['rk_traimit_pin'] }),
  R('wat_phra_kaew', 'bangkok', 'SS', 'วัดคู่บ้านคู่เมือง พระแก้วมรกต', { quest: 'rank_bangkok_ss', furniture: ['model_phra_kaew'], collectibles: ['rk_phra_kaew_globe'] }),

  // --- ภาคกลาง ----------------------------------------------------------------
  R('wat_chulamanee', 'central', 'C', 'วัดริมน้ำแม่กลอง บรรยากาศสบาย ๆ'),
  R('wat_mahathat_ayutthaya', 'central', 'A', 'เศียรพระในรากไม้ กรุงเก่าอยุธยา', { furniture: ['c_pinto'] }),
  R('wat_phutthabat', 'central', 'S', 'รอยพระพุทธบาท ปูชนียสถานสำคัญ', { quest: 'rank_central_s', furniture: ['c_birdcage'], collectibles: ['rk_phutthabat_stamp'] }),
  R('pathom_chedi', 'central', 'SS', 'เจดีย์ที่สูงที่สุดในประเทศไทย', { quest: 'rank_central_ss', furniture: ['model_pathom', 'c_samkhok_jar'], collectibles: ['rk_pathom_figure'] }),

  // --- ภาคเหนือ ---------------------------------------------------------------
  R('wat_huay_pla_kang', 'north', 'C', 'เจ้าแม่กวนอิมองค์ใหญ่ ชมวิวเชียงราย'),
  R('wat_rong_khun', 'north', 'B', 'วัดขาวระยิบระยับ งานศิลป์สุดอลัง', { furniture: ['n_tung'] }),
  R('wat_phumin', 'north', 'B', 'จิตรกรรมปู่ม่านย่าม่าน กระซิบรัก'),
  R('lampang_luang', 'north', 'A', 'วิหารล้านนาเก่าแก่ เงาพระธาตุกลับหัว', { furniture: ['n_khantok'] }),
  R('wat_yai_phitsanulok', 'north', 'S', 'พระพุทธชินราช งามที่สุดในแผ่นดิน', { quest: 'rank_north_s', furniture: ['n_kalae'], collectibles: ['rk_chinnarat_postcard'] }),
  R('doi_suthep', 'north', 'SS', 'บันไดนาค 306 ขั้น พระธาตุคู่เมืองเชียงใหม่', { quest: 'rank_north_ss', furniture: ['model_doi_suthep'], collectibles: ['rk_doi_suthep_figure'] }),

  // --- ภาคอีสาน ---------------------------------------------------------------
  R('ya_mo', 'northeast', 'C', 'ย่าโมคนเก่ง ใครมาโคราชต้องแวะ'),
  R('kham_chanod', 'northeast', 'B', 'ป่าคำชะโนด เกาะลึกลับของพ่อปู่', { furniture: ['i_plara'] }),
  R('that_phanom', 'northeast', 'SS', 'องค์พระธาตุพนม หลักใจชาวลุ่มน้ำโขง', { quest: 'rank_northeast_ss', furniture: ['model_that_phanom', 'i_khaen'], collectibles: ['rk_that_phanom_naga'] }),

  // --- ภาคตะวันออก ------------------------------------------------------------
  R('wat_samarn', 'east', 'C', 'พระพิฆเนศสีชมพู ขอพรไวทันใจ'),
  R('wat_sothon', 'east', 'S', 'หลวงพ่อโสธร ศักดิ์สิทธิ์คู่แปดริ้ว', { quest: 'rank_east_s', furniture: ['e_fruitstall', 'e_ngop'], collectibles: ['rk_sothon_charm'] }),

  // --- ภาคตะวันตก -------------------------------------------------------------
  R('wat_huay_mongkol', 'west', 'A', 'หลวงปู่ทวดองค์ใหญ่ เหยียบน้ำทะเลจืด', { furniture: ['w_fishtrap', 'w_lifering'] }),

  // --- ภาคใต้ -----------------------------------------------------------------
  R('ai_khai', 'south', 'C', 'ไอ้ไข่เด็กวัด ขอได้ไวแก้บนด้วยไก่'),
  R('phuket_big_buddha', 'south', 'B', 'พระใหญ่บนยอดเขานาคเกิด วิวสุดปัง', { furniture: ['s_lantern'] }),
  R('wat_chalong', 'south', 'A', 'วัดคู่เกาะภูเก็ต ประทัดดังสนั่น', { furniture: ['s_mukchair'] }),
  R('nst_mahathat', 'south', 'SS', 'พระบรมธาตุเจดีย์ คู่บ้านคู่เมืองนครฯ', { quest: 'rank_south_ss', furniture: ['model_nst', 's_cabinet'], collectibles: ['rk_nst_charm'] }),
]

export const RANK_BY_PLACE: Record<string, RankEntry> = Object.fromEntries(RANKS.map((r) => [r.place, r]))

/** Temples of a region, lowest rank first (stable within a tier). */
export function ranksOf(region: Region): RankEntry[] {
  return RANKS.filter((r) => r.region === region).sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier))
}

/** The region's top temple (its "crown"). */
export function crownOf(region: Region): RankEntry | null {
  const list = ranksOf(region)
  return list[list.length - 1] ?? null
}

/** Board title per region, e.g. 'อันดับวัดภาคเหนือ'. */
export const BOARD_TITLE: Record<Region, string> = {
  bangkok: 'อันดับวัดกรุงเทพฯ',
  central: 'อันดับวัดภาคกลาง',
  north: 'อันดับวัดภาคเหนือ',
  northeast: 'อันดับวัดภาคอีสาน',
  east: 'อันดับวัดภาคตะวันออก',
  west: 'อันดับวัดภาคตะวันตก',
  south: 'อันดับวัดภาคใต้',
}

/** Merit actions that count towards completing a temple (ทำบุญครบ). */
export const TEMPLE_ACTIONS = [
  'alms',
  'dish_alms',
  'chant',
  'meditate_sec',
  'koi_fed',
  'catfish_fed',
  'dog_fed',
  'dog_pet',
  'bell_round',
  'wish',
  'siamsi',
  'deity',
  'holy_water',
  'gold_leaf',
  'donate',
  'krathong',
  'circle_chedi',
  'job',
  'npc_quest',
] as const

/** Different kinds of merit needed at a temple to complete it. */
export const TEMPLE_DONE_KINDS = 3
