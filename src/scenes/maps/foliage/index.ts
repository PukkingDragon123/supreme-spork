// Foliage dressing registry: map id → FoliageSpec (plants from the kit in
// src/art/foliage.ts, placed by src/scenes/foliage.ts). mapFor() applies it
// to every map it builds, so map files stay untouched.

import type { MapDef } from '../../world'
import { dressMap, type FoliageSpec } from '../../foliage'
import { HOME_FOLIAGE } from './home'
import { PLACE_FOLIAGE } from './places'
import { HUB_FOLIAGE } from './hubs'

export const FOLIAGE: Record<string, FoliageSpec> = { ...HOME_FOLIAGE, ...PLACE_FOLIAGE, ...HUB_FOLIAGE }

/** The map with its foliage dressing (unchanged if it has none). */
export function withFoliage(m: MapDef): MapDef {
  const spec = FOLIAGE[m.id]
  return spec ? dressMap(m, spec) : m
}
