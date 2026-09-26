// TEMP stand-in (replaced by the house helpers).
import { FURNITURE_BY_ID, type Furniture, type MaterialId } from './data/furniture'
export interface PlacedFurniture { uid: string; id: string; x: number; y: number; flip?: boolean }
export interface HouseState { wallpaper: string; floor: string; placed: PlacedFurniture[]; storage: Record<string, number> }
export const ROOM = { cols: 10, rows: 6, wallCols: 10, wallRows: 3 }
export function defaultHouse(): HouseState {
  return { wallpaper: 'wall_cream', floor: 'floor_oak', placed: [], storage: {} }
}
export function canPlace(h: HouseState, id: string, x: number, y: number, ignoreUid?: string): boolean {
  const f = FURNITURE_BY_ID[id]
  if (!f) return false
  if (x < 0 || y < 0 || x + f.w > ROOM.cols || y + f.h > ROOM.rows) return false
  return !h.placed.some((p) => p.uid !== ignoreUid && FURNITURE_BY_ID[p.id]?.kind === f.kind && x < p.x + FURNITURE_BY_ID[p.id].w && p.x < x + f.w && y < p.y + FURNITURE_BY_ID[p.id].h && p.y < y + f.h)
}
let n = 0
export function placeFurniture(h: HouseState, id: string, x: number, y: number, flip = false): HouseState {
  const storage = { ...h.storage, [id]: Math.max(0, (h.storage[id] ?? 0) - 1) }
  return { ...h, storage, placed: [...h.placed, { uid: `f${Date.now().toString(36)}${n++}`, id, x, y, flip }] }
}
export function moveFurniture(h: HouseState, uid: string, x: number, y: number, flip?: boolean): HouseState {
  return { ...h, placed: h.placed.map((p) => (p.uid === uid ? { ...p, x, y, flip: flip ?? p.flip } : p)) }
}
export function storeFurniture(h: HouseState, uid: string): HouseState {
  const p = h.placed.find((q) => q.uid === uid)
  if (!p) return h
  return { ...h, placed: h.placed.filter((q) => q.uid !== uid), storage: { ...h.storage, [p.id]: (h.storage[p.id] ?? 0) + 1 } }
}
export function canCraft(mats: Partial<Record<MaterialId, number>>, coins: number, f: Pick<Furniture, 'recipe' | 'coins'>): boolean {
  return Object.entries(f.recipe).every(([k, v]) => (mats[k as MaterialId] ?? 0) >= (v ?? 0)) && coins >= (f.coins ?? 0)
}
export function missingFor(mats: Partial<Record<MaterialId, number>>, f: Pick<Furniture, 'recipe'>): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {}
  for (const [k, v] of Object.entries(f.recipe)) {
    const miss = (v ?? 0) - (mats[k as MaterialId] ?? 0)
    if (miss > 0) out[k as MaterialId] = miss
  }
  return out
}
export function roomScore(h: HouseState): number {
  return h.placed.length * 10
}
