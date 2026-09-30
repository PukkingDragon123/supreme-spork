// Beaches (group `beaches`): หาดบางแสน, หาดหัวหิน, หาดสมิหลา, หาดบ่อผุด
// เกาะสมุย, หาดป่าตอง, หาดไร่เลย์. Map ids equal their place ids
// (src/game/data/places.ts, kind 'beach'); shared builder in beach-common.ts.

import type { MapDef } from '../../world'
import { samilaMap } from './beach-samila'

export const MAPS: Record<string, () => MapDef> = {
  beach_samila: samilaMap,
}
