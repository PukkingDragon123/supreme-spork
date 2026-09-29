import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, type GameState } from '../state'
import * as I from '../inventory'

let s: GameState

beforeEach(() => {
  s = { ...defaultState(), onboarded: true }
  s.inventory = { rice: 3, ing_egg: 4, dish_kaprao_gold: 1, gold_leaf: 2 }
  s.materials = { wood: 5, cloth: 0, clay: 1, gold: 2, flower: 0 }
  s.outfits = [...s.outfits, 'hat_elephant', 'suit_hippo']
  s.pets = ['chang_noi', 'orange_cat']
  s.pet = 'orange_cat'
  s.player.look = { ...s.player.look, head: 'hat_elephant' }
  s.house = { ...s.house, storage: { cushion_khwan: 2 } }
  game.value = s
  I.registerCollectibles({ owned: undefined, info: undefined, icon: undefined, open: undefined })
})

describe('collectInventory', () => {
  it('lists every kind the player owns', () => {
    const list = I.collectInventory(s)
    const kinds = I.countByKind(list)
    expect(kinds.item).toBe(2)
    expect(kinds.ingredient).toBe(1)
    expect(kinds.dish).toBe(1)
    expect(kinds.material).toBe(3)
    expect(kinds.pet).toBe(2)
    expect(kinds.furniture).toBe(1)
    expect(kinds.outfit).toBe(s.outfits.length)
    const hat = list.find((e) => e.key === 'outfit:hat_elephant')!
    expect(hat.active).toBe(true)
    expect(hat.rarity).toBe('epic')
    expect(list.find((e) => e.key === 'pet:orange_cat')!.active).toBe(true)
    expect(list.find((e) => e.key === 'item:dish_kaprao_gold')!.rarity).toBe('epic')
    expect(list.find((e) => e.key === 'material:wood')!.count).toBe(5)
  })

  it('reads collectibles from state.collection.owned (record or list) or a registered source', () => {
    const withRecord = { ...s, collection: { owned: { kc_a: 2, kc_b: 0 } } } as unknown as GameState
    expect(I.collectInventory(withRecord).filter((e) => e.kind === 'collectible').map((e) => [e.id, e.count])).toEqual([['kc_a', 2]])
    const withList = { ...s, collection: { owned: ['kc_a', 'kc_a', 'kc_c'] } } as unknown as GameState
    expect(I.countByKind(I.collectInventory(withList)).collectible).toBe(2)
    I.registerCollectibles({ owned: () => ({ gem: 1 }), info: () => ({ name: 'อัญมณี', rarity: 'legendary' }) })
    const e = I.collectInventory(s).find((x) => x.kind === 'collectible')!
    expect(e.name).toBe('อัญมณี')
    expect(e.rarity).toBe('legend')
  })
})

describe('sort / filter / search', () => {
  it('sorts by rarity, count, name and newest', () => {
    const list = I.collectInventory(s)
    const r = I.sortInventory(list, 'rarity')
    expect(I.RARITY_ORDER[r[0].rarity]).toBeGreaterThanOrEqual(I.RARITY_ORDER[r[r.length - 1].rarity])
    const c = I.sortInventory(list, 'count')
    expect(c[0].count).toBeGreaterThanOrEqual(c[c.length - 1].count)
    const n = I.sortInventory(list, 'name').map((e) => e.name)
    expect(n).toEqual([...n].sort((a, b) => a.localeCompare(b, 'th')))
    const stamped = list.map((e) => (e.key === 'pet:chang_noi' ? { ...e, got: 999 } : e))
    expect(I.sortInventory(stamped, 'newest')[0].key).toBe('pet:chang_noi')
    const t = I.sortInventory(list, 'type')
    expect(t[0].kind).toBe('item')
  })

  it('filters by kinds and a forgiving Thai search', () => {
    const list = I.collectInventory(s)
    expect(I.filterInventory(list, new Set(['pet']), '').every((e) => e.kind === 'pet')).toBe(true)
    expect(I.filterInventory(list, null, 'ช้าง').map((e) => e.id)).toEqual(expect.arrayContaining(['hat_elephant', 'chang_noi']))
    // tone marks are ignored: "ชาง" still finds "ช้าง"
    expect(I.filterInventory(list, null, 'ชาง').length).toBeGreaterThan(0)
    expect(I.filterInventory(list, new Set(['furniture']), 'ช้าง')).toHaveLength(0)
  })
})

describe('stampOwned', () => {
  it('marks everything old on the first run, then new keys with now', () => {
    const first = I.stampOwned(s, 5000)!
    expect(Object.values(first).every((v) => v === 1)).toBe(true)
    const s2 = { ...s, shop: { ...s.shop, got: first }, pets: [...s.pets, 'betta'] }
    const next = I.stampOwned(s2, 7000)!
    expect(next['pet:betta']).toBe(7000)
    expect(next['pet:chang_noi']).toBe(1)
    expect(I.stampOwned({ ...s2, shop: { ...s2.shop, got: next } }, 9000)).toBeNull()
  })
})
