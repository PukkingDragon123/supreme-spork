// Maps for real places, grouped by region. Each group file exports
// `MAPS: Record<string, () => MapDef>` keyed by map id.

import type { MapDef } from '../../world'
import { MAPS as CENTRAL } from './central'
import { MAPS as HISTORIC } from './historic'
import { MAPS as SOUTH } from './south'
import { MAPS as BANGKOK } from './bangkok'
import { MAPS as NORTHISAN } from './northisan'
import { MAPS as HUBS } from './hubs'
import { MAPS as BEACHES } from './beaches'

export const PLACE_MAPS: Record<string, () => MapDef> = {
  ...CENTRAL,
  ...HISTORIC,
  ...SOUTH,
  ...BANGKOK,
  ...NORTHISAN,
  ...HUBS,
  ...BEACHES,
}
