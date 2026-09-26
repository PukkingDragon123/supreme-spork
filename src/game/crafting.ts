// Crafting furniture, wallpapers and floors from materials (+ a few coins).

import { game, mutate, level } from './state'
import { FURNITURE_BY_ID, FLOORS, WALLPAPERS } from './data/furniture'
import { addToStorage, canCraft, ownsSurface, unlockSurface } from './house'
import type { MaterialId } from './materials'
import { toast } from './events'

type Cost = { recipe: Partial<Record<MaterialId, number>>; coins?: number; level?: number; name: string }

export function isSurface(id: string) {
  return WALLPAPERS.some((w) => w.id === id) || FLOORS.some((f) => f.id === id)
}

export function recipeOf(id: string): Cost | null {
  return FURNITURE_BY_ID[id] ?? WALLPAPERS.find((w) => w.id === id) ?? FLOORS.find((f) => f.id === id) ?? null
}

export function craftable(id: string): boolean {
  const r = recipeOf(id)
  if (!r) return false
  if (isSurface(id) && ownsSurface(game.value.house, id)) return false
  return canCraft(game.value.materials, game.value.coins, r, level.value.level)
}

/** Spend materials and put the crafted piece into home storage (or unlock a wallpaper/floor). */
export function craft(id: string): boolean {
  const r = recipeOf(id)
  if (!r || !craftable(id)) {
    toast('วัสดุยังไม่พอ ไปสวดมนต์และเก็บของรอบวัดเพิ่มนะ', 'hammer', 'warn')
    return false
  }
  mutate((d) => {
    for (const [k, v] of Object.entries(r.recipe)) d.materials[k as MaterialId] = Math.max(0, (d.materials[k as MaterialId] ?? 0) - (v ?? 0))
    d.coins -= r.coins ?? 0
    d.house = isSurface(id) ? unlockSurface(d.house, id) : addToStorage(d.house, id)
  })
  return true
}
