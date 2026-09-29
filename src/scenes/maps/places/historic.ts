// "historic" group of real places: Ayutthaya, Hua Hin, Phitsanulok, Lampang
// and Nan. Outdoor maps are keyed by place id; interiors `<placeId>:<room>`.

import type { MapDef } from '../../world'
import { ayutthayaMap, ayutthayaRuinMap } from './historic-ayutthaya'
import { huayMongkolMap, huayMongkolHallMap } from './historic-huaymongkol'
import { phitsanulokMap, phitsanulokViharnMap } from './historic-phitsanulok'
import { lampangMap, lampangViharnMap } from './historic-lampang'
import { phuminMap, phuminUbosotMap } from './historic-phumin'

export const MAPS: Record<string, () => MapDef> = {
  wat_mahathat_ayutthaya: ayutthayaMap,
  'wat_mahathat_ayutthaya:ruin': ayutthayaRuinMap,
  wat_huay_mongkol: huayMongkolMap,
  'wat_huay_mongkol:hall': huayMongkolHallMap,
  wat_yai_phitsanulok: phitsanulokMap,
  'wat_yai_phitsanulok:viharn': phitsanulokViharnMap,
  lampang_luang: lampangMap,
  'lampang_luang:viharn': lampangViharnMap,
  wat_phumin: phuminMap,
  'wat_phumin:ubosot': phuminUbosotMap,
}
