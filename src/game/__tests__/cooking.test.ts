import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../state'
import { meritForLevel } from '../economy'
import * as A from '../actions'
import * as C from '../cooking'
import { RECIPES, RECIPE_BY_ID } from '../data/recipes'
import { DISHES, DISH_IDS, INGREDIENTS, INGREDIENT_IDS, ITEMS, ITEM_BY_ID, MART_STOCK, goldDishId } from '../data/items'
import { notices } from '../events'

const atLevel = (level: number, inventory: Record<string, number> = {}) => {
  game.value = { ...defaultState(), onboarded: true, merit: meritForLevel(level), coins: 500, inventory }
}

const fullFor = (id: string) => ({ ...RECIPE_BY_ID[id].ingredients })

beforeEach(() => {
  notices.value = []
  atLevel(1)
  A.ensureDaily()
})

describe('cooking data', () => {
  it('has ten Thai recipes between level 10 and 20', () => {
    expect(RECIPES).toHaveLength(10)
    const ids = new Set(RECIPES.map((r) => r.id))
    expect(ids.size).toBe(10)
    for (const r of RECIPES) {
      expect(r.level).toBeGreaterThanOrEqual(C.COOKING_LEVEL)
      expect(r.level).toBeLessThanOrEqual(20)
      expect(r.name).toMatch(/[฀-๿]/)
      expect(r.steps.length).toBeGreaterThanOrEqual(3)
      expect(r.qty).toBeGreaterThan(0)
      expect(ITEM_BY_ID[r.makes]?.category).toBe('dish')
      expect(ITEM_BY_ID[goldDishId(r.makes)]?.gold).toBe(true)
      for (const [id, n] of Object.entries(r.ingredients)) {
        expect(ITEM_BY_ID[id]?.category, id).toBe('ingredient')
        expect(n).toBeGreaterThan(0)
      }
      for (const s of r.steps) {
        if (s.kind === 'season') expect(s.order?.length).toBeGreaterThan(0)
        expect(s.text.length).toBeGreaterThan(4)
      }
      expect(r.steps[r.steps.length - 1].kind).toBe('plate')
    }
  })

  it('uses every kind of mini-game somewhere', () => {
    const kinds = new Set(RECIPES.flatMap((r) => r.steps.map((s) => s.kind)))
    for (const k of ['chop', 'crack', 'stir', 'pour', 'fry', 'season', 'shape', 'wrap', 'plate']) expect(kinds.has(k as never), k).toBe(true)
  })

  it('keeps the old items and adds ingredients and dishes to the shared catalogue', () => {
    for (const id of ['rice', 'egg', 'curry', 'chicken', 'sangkhathan', 'fish_food']) expect(ITEM_BY_ID[id]).toBeTruthy()
    for (const it of [...INGREDIENTS, ...DISHES]) {
      expect(ITEM_BY_ID[it.id]).toBe(it)
      expect(ITEMS).toContain(it)
    }
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length)
    // Ingredients are for sale, dishes only come from the kitchen.
    for (const it of INGREDIENTS) expect(it.price).toBeGreaterThan(0)
    for (const it of DISHES) expect(it.price).toBe(0)
    for (const id of INGREDIENT_IDS) expect(MART_STOCK).toContain(id)
    for (const id of DISH_IDS) expect(MART_STOCK).not.toContain(id)
  })

  it('makes home cooking worth far more merit than bought alms food', () => {
    const bestBought = Math.max(...ITEMS.filter((i) => i.category === 'alms' && i.id !== 'sangkhathan').map((i) => i.merit))
    for (const d of DISHES) {
      expect(d.merit).toBeGreaterThanOrEqual(bestBought * 2)
      if (d.gold) expect(d.merit).toBeGreaterThan(ITEM_BY_ID[d.base!].merit)
    }
    expect(Math.max(...DISHES.map((d) => d.merit))).toBeGreaterThan(ITEM_BY_ID.sangkhathan.merit)
  })
})

describe('unlocking', () => {
  it('opens the kitchen at level 10 and each recipe at its own level', () => {
    expect(C.cookingUnlocked()).toBe(false)
    expect(C.recipeStatus('kaijiao')).toBe('locked')
    atLevel(10)
    expect(C.cookingUnlocked()).toBe(true)
    expect(C.recipeUnlocked('kaijiao')).toBe(true)
    expect(C.recipeUnlocked('kiaowan')).toBe(false)
    expect(C.recipeStatus('kaijiao')).toBe('missing')
    atLevel(20)
    expect(C.recipeUnlocked('kiaowan')).toBe(true)
    expect(C.recipeUnlocked('nope')).toBe(false)
  })
})

describe('ingredients', () => {
  it('reports what is missing', () => {
    atLevel(12, { ing_egg: 1, ing_oil: 3 })
    expect(C.missingIngredients('kaijiao')).toEqual({ ing_egg: 1, ing_fishsauce: 1 })
    expect(C.canCook('kaijiao')).toBe(false)
    atLevel(12, fullFor('kaijiao'))
    expect(C.missingIngredients('kaijiao')).toEqual({})
    expect(C.canCook('kaijiao')).toBe(true)
    expect(C.recipeStatus('kaijiao')).toBe('ready')
  })

  it('prices and buys the missing packs in one go', () => {
    atLevel(12, { ing_egg: 1 })
    const { coins, packs } = C.missingCost('kaijiao')
    expect(packs).toEqual({ ing_egg: 1, ing_fishsauce: 1, ing_oil: 1 })
    expect(coins).toBe(ITEM_BY_ID.ing_egg.price + ITEM_BY_ID.ing_fishsauce.price + ITEM_BY_ID.ing_oil.price)
    const before = game.value.coins
    expect(C.buyMissing('kaijiao', C.DELIVERY_FEE)).toBe(true)
    expect(game.value.coins).toBe(before - coins - C.DELIVERY_FEE)
    expect(C.canCook('kaijiao')).toBe(true)
    expect(A.count('ing_egg')).toBe(1 + (ITEM_BY_ID.ing_egg.pack ?? 1))
  })

  it('refuses to buy without enough coins', () => {
    atLevel(12, {})
    game.value = { ...game.value, coins: 1 }
    expect(C.buyMissing('kaijiao')).toBe(false)
    expect(A.count('ing_egg')).toBe(0)
  })
})

describe('grading', () => {
  it('turns step scores into 1–3 stars', () => {
    expect(C.starsFor([1, 1, 0.9])).toBe(3)
    expect(C.starsFor([0.7, 0.6, 0.5])).toBe(2)
    expect(C.starsFor([0.1, 0.2])).toBe(1)
    expect(C.starsFor([])).toBe(1)
    expect(C.starsFor([5, -3])).toBe(2)
  })

  it('has friendly grade words', () => {
    expect(C.gradeFor(1).text).toBe('เยี่ยมมาก!')
    expect(C.gradeFor(0.5).text).toBe('เกือบแล้ว!')
    expect(C.gradeFor(0).key).toBe('oops')
  })
})

describe('cook()', () => {
  it('consumes ingredients and adds the dish', () => {
    atLevel(12, { ...fullFor('kaijiao'), ing_egg: 5 })
    const r = C.cook('kaijiao', 2)!
    expect(r).toBeTruthy()
    expect(r.id).toBe('dish_kaijiao')
    expect(r.qty).toBe(RECIPE_BY_ID.kaijiao.qty)
    expect(A.count('dish_kaijiao')).toBe(r.qty)
    expect(A.count('ing_egg')).toBe(3)
    expect(A.count('ing_fishsauce')).toBe(0)
    expect('ing_fishsauce' in game.value.inventory).toBe(false)
  })

  it('gives the gold variant and a bonus serving at 3 stars', () => {
    atLevel(15, fullFor('khaotom'))
    const r = C.cook('khaotom', 3)!
    expect(r.id).toBe('dish_khaotom_gold')
    expect(r.bonus).toBe(1)
    expect(r.qty).toBe(RECIPE_BY_ID.khaotom.qty + 1)
    expect(A.count('dish_khaotom_gold')).toBe(r.qty)
    expect(r.merit).toBe(ITEM_BY_ID.dish_khaotom_gold.merit)
  })

  it('does nothing when locked or short of ingredients', () => {
    atLevel(9, fullFor('kaijiao'))
    expect(C.cook('kaijiao', 3)).toBeNull()
    expect(A.count('ing_egg')).toBe(2)
    atLevel(12, { ing_egg: 2 })
    expect(C.cook('kaijiao', 3)).toBeNull()
    expect(A.count('ing_egg')).toBe(2)
    atLevel(12, fullFor('kiaowan'))
    expect(C.cook('kiaowan', 3)).toBeNull()
  })

  it('dishes can be offered like any alms item', () => {
    atLevel(12, fullFor('kaijiao'))
    C.cook('kaijiao', 1)
    expect(A.useItem('dish_kaijiao')).toBe(true)
    expect(A.count('dish_kaijiao')).toBe(0)
    expect(C.dishCount()).toBe(0)
  })

  it('rewards a little merit for cooking', () => {
    atLevel(12)
    const m0 = game.value.merit
    const got = C.rewardCooking(3)
    expect(got).toBeGreaterThan(0)
    expect(game.value.merit).toBe(m0 + got)
  })
})
