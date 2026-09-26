// Crafting furniture, wallpapers and floors from materials (+ a few coins).

import { game, mutate, level } from './state'
import { FURNITURE_BY_ID, FLOORS, WALLPAPERS } from './data/furniture'
import { canCraft } from './house'
import type { MaterialId } from './materials'
import { toast } from './events'

type Recipe = { recipe: Partial<Record<MaterialId, number>>; coins?: number; level?: number; name: string }

export function recipeOf(id: string): Recipe | null {
  return FURNITURE_BY_ID[id] ?? WALLPAPERS.find((w) => w.id === id) ?? FLOORS.find((f) => f.id === id) ?? null
}

export function craftable(id: string): boolean {
  const r = recipeOf(id)
  if (!r) return false
  if ((r.level ?? 1) > level.value.level) return false
  return canCraft(game.value.materials, game.value.coins, { recipe: r.recipe, coins: r.coins })
}

/** Spend materials and put one crafted piece into home storage. */
export function craft(id: string): boolean {
  const r = recipeOf(id)
  if (!r || !craftable(id)) {
    toast('วัสดุยังไม่พอ ไปสวดมนต์และเก็บของรอบวัดเพิ่มนะ', 'hammer', 'warn')
    return false
  }
  mutate((d) => {
    for (const [k, v] of Object.entries(r.recipe)) d.materials[k as MaterialId] -= v ?? 0
    d.coins -= r.coins ?? 0
    d.house = { ...d.house, storage: { ...d.house.storage, [id]: (d.house.storage[id] ?? 0) + 1 } }
  })
  return true
}
