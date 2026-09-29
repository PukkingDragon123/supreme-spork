// Map registry. Home temples are AreaIds; real places register their maps
// (outdoor `<placeId>` plus interiors `<placeId>:<room>`) from the place files.

import type { MapDef } from '../world'
import { watMap } from './wat'
import { shrineMap } from './shrine'
import { riverMap } from './river'
import { mountainMap } from './mountain'
import { PLACE_MAPS } from './places'
import { martMap } from './mart'

const builders: Record<string, () => MapDef> = {
  wat: watMap,
  shrine: shrineMap,
  river: riverMap,
  mountain: mountainMap,
  mart: martMap,
  ...PLACE_MAPS,
}

const cache = new Map<string, MapDef>()

export function hasMap(id: string): boolean {
  return id in builders
}

export function mapFor(id: string): MapDef {
  let m = cache.get(id)
  if (!m) {
    m = (builders[id] ?? builders.wat)()
    cache.set(id, m)
  }
  return m
}
