import type { AreaId } from '../../game/data/areas'
import type { MapDef } from '../world'
import { watMap } from './wat'
import { shrineMap } from './shrine'
import { riverMap } from './river'
import { mountainMap } from './mountain'

const builders: Record<AreaId, () => MapDef> = {
  wat: watMap,
  shrine: shrineMap,
  river: riverMap,
  mountain: mountainMap,
}

const cache = new Map<AreaId, MapDef>()

export function mapFor(id: AreaId): MapDef {
  let m = cache.get(id)
  if (!m) {
    m = (builders[id] ?? builders.wat)()
    cache.set(id, m)
  }
  return m
}
