// Southern places (group `south`): Wat Phra Mahathat (Nakhon Si Thammarat),
// Wat Chedi / Ai Khai, Wat Chalong and the Phuket Big Buddha, each with an
// outdoor map and a walkable interior, plus the home temple's ubosot interior.

import type { MapDef } from '../../world'
import { watUbosotMap } from './south_ubosot'
import { nstMahathatMap } from './south_nst'
import { nstViharnMap } from './south_nst_viharn'
import { aiKhaiMap } from './south_aikhai'
import { aiKhaiShrineMap } from './south_aikhai_shrine'
import { chalongMap } from './south_chalong'
import { chalongChediMap } from './south_chalong_chedi'
import { bigBuddhaHallMap, bigBuddhaMap } from './south_bigbuddha'

export const MAPS: Record<string, () => MapDef> = {
  nst_mahathat: nstMahathatMap,
  'nst_mahathat:viharn': nstViharnMap,
  ai_khai: aiKhaiMap,
  'ai_khai:shrine': aiKhaiShrineMap,
  wat_chalong: chalongMap,
  'wat_chalong:chedi': chalongChediMap,
  phuket_big_buddha: bigBuddhaMap,
  'phuket_big_buddha:hall': bigBuddhaHallMap,
  'wat:ubosot': watUbosotMap,
}
