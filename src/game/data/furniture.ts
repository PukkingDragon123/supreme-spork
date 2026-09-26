// TEMP stand-in (replaced by the furniture catalogue).
import type { MaterialId } from '../materials'
export type { MaterialId }
export const MATERIALS: { id: MaterialId; name: string; desc: string }[] = []
export type FurnitureKind = 'floor' | 'wall' | 'rug'
export type Interact = 'altar' | 'wardrobe' | 'bed' | 'workbench' | 'door' | 'window' | 'tv' | 'fan' | 'lamp' | 'plant' | 'music' | 'aquarium' | 'cat' | null
export interface Furniture {
  id: string
  name: string
  desc: string
  kind: FurnitureKind
  w: number
  h: number
  recipe: Partial<Record<MaterialId, number>>
  coins?: number
  level?: number
  interact?: Interact
  fixed?: boolean
  tags?: string[]
}
export const FURNITURE: Furniture[] = [
  { id: 'rug_mat', name: 'เสื่อกก', desc: 'เสื่อทอมือ', kind: 'rug', w: 3, h: 2, recipe: { cloth: 2 } },
  { id: 'plant_monstera', name: 'ต้นมอนสเตอร่า', desc: 'ต้นไม้ใบใหญ่', kind: 'floor', w: 1, h: 1, recipe: { clay: 1, flower: 1 } },
  { id: 'fan', name: 'พัดลมตั้งพื้น', desc: 'ลมเย็นสบาย', kind: 'floor', w: 1, h: 1, recipe: { wood: 1, clay: 1 }, interact: 'fan' },
]
export const FURNITURE_BY_ID: Record<string, Furniture> = Object.fromEntries(FURNITURE.map((f) => [f.id, f]))
export const WALLPAPERS: { id: string; name: string; recipe: Partial<Record<MaterialId, number>>; coins?: number }[] = [{ id: 'wall_cream', name: 'ครีม', recipe: {} }]
export const FLOORS: { id: string; name: string; recipe: Partial<Record<MaterialId, number>>; coins?: number }[] = [{ id: 'floor_oak', name: 'ไม้โอ๊ค', recipe: {} }]
