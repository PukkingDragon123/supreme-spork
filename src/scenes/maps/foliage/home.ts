// Foliage for the four home temples: the helper's lawn plants plus hand
// touches (ivy on the outer walls, lotus along the river bank).

import type { FoliageSpec, Plant } from '../../foliage'
import { lotusPatch, moss } from '../../../art/foliage'
import { AUTO_PLANTS } from './auto'

/** Ivy hanging over the wat's outer wall (the wall props stand at y 642). */
const WAT_IVY: Plant[] = [
  ['ivy', 14, 622, 0, 'z21'],
  ['ivy', 70, 622, 1, 'z21'],
  ['ivy', 186, 622, 2, 'z21'],
  ['ivy', 240, 622, 0, 'z21'],
]

export const HOME_FOLIAGE: Record<string, FoliageSpec> = {
  wat: { tufts: 0.45, plants: [...AUTO_PLANTS.wat, ...WAT_IVY] },
  shrine: { tufts: 0.45, plants: AUTO_PLANTS.shrine },
  river: {
    tufts: 0.45,
    plants: AUTO_PLANTS.river,
    ground(g) {
      // Lotus and water lilies in the shallows by the bank, moss on the steps.
      lotusPatch(g, 44, 168, 40, 7, 3, 9)
      lotusPatch(g, 250, 170, 30, 6, 5, 6)
      moss(g, 0, 176, 288, 6, 7, 0.8)
    },
  },
  mountain: { tufts: 0.45, plants: AUTO_PLANTS.mountain },
}
