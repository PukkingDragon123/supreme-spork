// Beaches (group `beaches`): หาดบางแสน, หาดหัวหิน, หาดสมิหลา, หาดบ่อผุด
// เกาะสมุย, หาดป่าตอง, หาดไร่เลย์. Map ids equal their place ids
// (src/game/data/places.ts, kind 'beach'); shared builder in beach-common.ts.

import type { MapDef } from '../../world'
import { bangsaenMap } from './beach-bangsaen'
import { huahinMap } from './beach-huahin'
import { samilaMap } from './beach-samila'
import { samuiMap } from './beach-samui'
import { patongMap } from './beach-patong'
import { railayMap } from './beach-railay'

export const MAPS: Record<string, () => MapDef> = {
  beach_bangsaen: bangsaenMap,
  beach_huahin: huahinMap,
  beach_samila: samilaMap,
  beach_samui: samuiMap,
  beach_patong: patongMap,
  beach_railay: railayMap,
}
