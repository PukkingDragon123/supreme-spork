// Maps for real places, grouped by region. Each group file exports
// `MAPS: Record<string, () => MapDef>` keyed by map id.

import type { MapDef } from '../../world'
import { MAPS as CENTRAL } from './central'

export const PLACE_MAPS: Record<string, () => MapDef> = {
  ...CENTRAL,
}
