import { track } from './actions'
// Cooking rules: unlock level, ingredient checks, grading and turning a
// finished mini-game into dishes in the inventory. UI lives in
// activities/cook; data in data/recipes.ts and data/items.ts.

import { game, mutate, type GameState } from './state'
import { levelFromMerit } from './economy'
import { addMerit, spendCoins } from './actions'
import { RECIPE_BY_ID, RECIPES, type CookRecipe } from './data/recipes'
import { goldDishId, ITEM_BY_ID } from './data/items'

/** Player level at which the kitchen opens. */
export const COOKING_LEVEL = 10

/** Extra coins for the "ไรเดอร์" delivery of missing ingredients. */
export const DELIVERY_FEE = 5

export type Stars = 1 | 2 | 3

const lvl = (s: GameState) => levelFromMerit(s.merit).level

export function cookingUnlocked(s: GameState = game.value): boolean {
  return lvl(s) >= COOKING_LEVEL
}

/** Recipe exists and the player's level is high enough for it. */
export function recipeUnlocked(recipeId: string, s: GameState = game.value): boolean {
  const r = RECIPE_BY_ID[recipeId]
  return !!r && cookingUnlocked(s) && lvl(s) >= r.level
}

/** Ingredients still needed (item id → how many more), empty when ready. */
export function missingIngredients(recipeId: string, inv: Record<string, number> = game.value.inventory): Record<string, number> {
  const r = RECIPE_BY_ID[recipeId]
  if (!r) return {}
  const out: Record<string, number> = {}
  for (const [id, n] of Object.entries(r.ingredients)) {
    const have = inv[id] ?? 0
    if (have < n) out[id] = n - have
  }
  return out
}

export function hasIngredients(recipeId: string, inv: Record<string, number> = game.value.inventory): boolean {
  return !!RECIPE_BY_ID[recipeId] && Object.keys(missingIngredients(recipeId, inv)).length === 0
}

/** Unlocked and every ingredient is in the bag. */
export function canCook(recipeId: string, s: GameState = game.value): boolean {
  return recipeUnlocked(recipeId, s) && hasIngredients(recipeId, s.inventory)
}

export type RecipeStatus = 'locked' | 'missing' | 'ready'

export function recipeStatus(recipeId: string, s: GameState = game.value): RecipeStatus {
  if (!recipeUnlocked(recipeId, s)) return 'locked'
  return hasIngredients(recipeId, s.inventory) ? 'ready' : 'missing'
}

/** Recipes the player can see in the book, lowest level first. */
export function recipeBook(): CookRecipe[] {
  return [...RECIPES].sort((a, b) => a.level - b.level)
}

/** Packs to buy for the missing ingredients and what they cost. */
export function missingCost(recipeId: string, inv: Record<string, number> = game.value.inventory): { coins: number; packs: Record<string, number> } {
  const packs: Record<string, number> = {}
  let coins = 0
  for (const [id, need] of Object.entries(missingIngredients(recipeId, inv))) {
    const it = ITEM_BY_ID[id]
    if (!it) continue
    const n = Math.ceil(need / (it.pack ?? 1))
    packs[id] = n
    coins += n * it.price
  }
  return { coins, packs }
}

/** Buy every missing ingredient at once (plus an optional delivery fee). */
export function buyMissing(recipeId: string, fee = 0): boolean {
  const { coins, packs } = missingCost(recipeId)
  if (!Object.keys(packs).length) return true
  if (!spendCoins(coins + fee)) return false
  mutate((d) => {
    for (const [id, n] of Object.entries(packs)) d.inventory[id] = (d.inventory[id] ?? 0) + n * (ITEM_BY_ID[id]?.pack ?? 1)
  })
  return true
}

/** Step scores (0..1 each) → 1–3 stars. Cooking is cosy: never zero. */
export function starsFor(scores: number[]): Stars {
  if (!scores.length) return 1
  const avg = scores.reduce((a, b) => a + Math.max(0, Math.min(1, b)), 0) / scores.length
  if (avg >= 0.8) return 3
  if (avg >= 0.5) return 2
  return 1
}

/** Grade words for one step score (Cooking Mama style pops). */
export function gradeFor(score: number): { key: 'perfect' | 'great' | 'close' | 'oops'; text: string } {
  if (score >= 0.88) return { key: 'perfect', text: 'เยี่ยมมาก!' }
  if (score >= 0.66) return { key: 'great', text: 'ดีมาก!' }
  if (score >= 0.4) return { key: 'close', text: 'เกือบแล้ว!' }
  return { key: 'oops', text: 'ไม่เป็นไรนะ~' }
}

export interface DishOut {
  /** Dish item id added (gold variant at 3★). */
  id: string
  /** Total servings added. */
  qty: number
  /** Of which bonus servings (3★). */
  bonus: number
  merit: number
}

/** What a finished cook yields for a star grade (no side effects). */
export function dishFor(recipeId: string, stars: number): DishOut | null {
  const r = RECIPE_BY_ID[recipeId]
  if (!r) return null
  const gold = stars >= 3
  const id = gold ? goldDishId(r.makes) : r.makes
  const bonus = gold ? 1 : 0
  return { id, qty: r.qty + bonus, bonus, merit: ITEM_BY_ID[id]?.merit ?? 0 }
}

export interface CookResult extends DishOut {
  recipe: CookRecipe
  stars: Stars
}

/**
 * Finish a recipe: consume its ingredients and add the dish servings.
 * Returns null (and changes nothing) when locked or ingredients are missing.
 */
export function cook(recipeId: string, stars: number): CookResult | null {
  const r = RECIPE_BY_ID[recipeId]
  if (!r || !canCook(recipeId)) return null
  track('cook')
  const st = Math.max(1, Math.min(3, Math.round(stars))) as Stars
  const out = dishFor(recipeId, st)!
  mutate((d) => {
    for (const [id, n] of Object.entries(r.ingredients)) {
      d.inventory[id] = (d.inventory[id] ?? 0) - n
      if (d.inventory[id] <= 0) delete d.inventory[id]
    }
    d.inventory[out.id] = (d.inventory[out.id] ?? 0) + out.qty
    d.daily.counts['cooked'] = (d.daily.counts['cooked'] ?? 0) + 1
  })
  return { ...out, recipe: r, stars: st }
}

/** A little merit for the care put into cooking for the monks (diminishes after 5 a day). */
export function rewardCooking(stars: number): number {
  return addMerit(3 + Math.max(1, Math.min(3, stars)) * 3, { key: 'cook', free: 5 })
}

/** How many dishes (any kind) the player holds — handy for an alms hint. */
export function dishCount(inv: Record<string, number> = game.value.inventory): number {
  let n = 0
  for (const [id, c] of Object.entries(inv)) if (ITEM_BY_ID[id]?.category === 'dish') n += c
  return n
}
