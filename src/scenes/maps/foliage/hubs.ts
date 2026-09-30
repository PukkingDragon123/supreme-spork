// Foliage for the hub markets and the temple fair.

import type { FoliageSpec, Plant } from '../../foliage'
import { AUTO_PLANTS } from './auto'

const IDS = ['hub_chatuchak', 'hub_damnoen', 'hub_maeklong', 'hub_thaphae', 'hub_kimyong', 'hub_indochina']

/**
 * The fair is dressed by hand: its picnic mats read as lawn to the helper.
 * Bananas, palms and bougainvillea along the grass verge of the back fence,
 * pots flanking the billboard and a few by the booths.
 */
const FAIR: Plant[] = [
  ['banana', 16, 103, 1, 's'],
  ['elephant_ear', 34, 108, 0, 'w'],
  ['bougainvillea', 90, 106, 0, 'w'],
  ['fern', 128, 108, 0, 'f'],
  ['pot', 150, 108, 1, ''],
  ['pot', 250, 108, 1, 'f'],
  ['areca', 270, 102, 2, 's'],
  ['bougainvillea', 300, 106, 1, 'f'],
  ['banana', 356, 102, 2, 'sf'],
  ['elephant_ear', 396, 108, 2, ''],
  ...(AUTO_PLANTS.fair_temple ?? []).filter((p) => p[0] === 'pot' && p[2] > 160),
]

export const HUB_FOLIAGE: Record<string, FoliageSpec> = {
  ...Object.fromEntries(IDS.map((id) => [id, { tufts: 0.4, plants: AUTO_PLANTS[id] ?? [] }])),
  fair_temple: { tufts: 0.6, plants: FAIR },
}
