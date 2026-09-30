// Foliage for the real temples (central, historic, Bangkok, north & isan).
// The southern group and the beaches are dressed by their own maps.

import type { FoliageSpec } from '../../foliage'
import { AUTO_PLANTS } from './auto'

const IDS = [
  'pathom_chedi',
  'wat_sothon',
  'wat_chulamanee',
  'wat_samarn',
  'wat_phutthabat',
  'wat_mahathat_ayutthaya',
  'wat_huay_mongkol',
  'wat_yai_phitsanulok',
  'lampang_luang',
  'wat_phumin',
  'wat_phra_kaew',
  'wat_pho',
  'wat_arun',
  'erawan',
  'golden_mount',
  'wat_traimit',
  'doi_suthep',
  'wat_rong_khun',
  'wat_huay_pla_kang',
  'kham_chanod',
  'that_phanom',
  'ya_mo',
]

export const PLACE_FOLIAGE: Record<string, FoliageSpec> = Object.fromEntries(IDS.map((id) => [id, { tufts: 0.45, plants: AUTO_PLANTS[id] ?? [] }]))
