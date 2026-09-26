// TEMP stand-in (replaced by the furniture art).
import { iconSprite } from './icons'
import type { Sprite } from '../engine/sprite'
import type { MaterialId } from '../game/materials'
const ICON: Record<MaterialId, string> = { wood: 'tree', cloth: 'shirt', clay: 'vessel', gold: 'goldleaf', flower: 'lotus' }
export function furnitureSprite(_id: string, _flip = false): Sprite {
  return iconSprite('home')
}
export function furnitureThumb(_id: string): Sprite {
  return iconSprite('home')
}
export function materialSprite(id: MaterialId): Sprite {
  return iconSprite(ICON[id] ?? 'sparkle')
}
