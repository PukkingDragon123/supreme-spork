import type { AreaId } from '../../game/data/areas'
import type { MapDef } from '../world'
import { homeMap } from './home'
import { shrineMap } from './shrine'
import { riverMap } from './river'
import { mountainMap } from './mountain'

const builders: Record<AreaId, () => MapDef> = {
  home: homeMap,
  shrine: shrineMap,
  river: riverMap,
  mountain: mountainMap,
}

const cache = new Map<AreaId, MapDef>()

export function mapFor(id: AreaId): MapDef {
  let m = cache.get(id)
  if (!m) {
    m = (builders[id] ?? builders.home)()
    cache.set(id, m)
  }
  return m
}
