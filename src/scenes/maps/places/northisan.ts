// North & Isan place maps: Doi Suthep, Wat Rong Khun, Wat Huay Pla Kang,
// Kham Chanod, Wat Phra That Phanom and the Thao Suranari (Ya Mo) monument.
// Outdoor maps are keyed by place id, interiors by `<placeId>:<room>`.

import type { MapDef } from '../../world'
import { DOI_MAPS } from './northisan-doi'
import { RK_MAPS } from './northisan-rongkhun'
import { HPK_MAPS } from './northisan-huaypla'
import { KC_MAPS } from './northisan-khamchanod'
import { TP_MAPS } from './northisan-phanom'
import { YM_MAPS } from './northisan-yamo'

export const MAPS: Record<string, () => MapDef> = {
  ...DOI_MAPS,
  ...RK_MAPS,
  ...HPK_MAPS,
  ...KC_MAPS,
  ...TP_MAPS,
  ...YM_MAPS,
}
