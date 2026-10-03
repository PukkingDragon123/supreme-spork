import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState } from '../../../game/state'
import { SELL_RATE, sellPrice, sellToGame, sellable } from '../../../game/quickSell'
import { baseValue } from '../../../game/market'
import { diffGot, mergeGot, popPopup, popupQueue, pushPopup } from '../popupStore'

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true, coins: 0, inventory: { rice: 5, incense: 2 } }
  popupQueue.value = []
})

describe('sell to the game', () => {
  it('pays a share of the market value, at least 1 coin', () => {
    expect(sellPrice('item', 'rice')).toBe(Math.max(1, Math.floor(baseValue('item', 'rice') * SELL_RATE)))
    expect(sellPrice('item', 'rice')).toBeGreaterThanOrEqual(1)
  })

  it('sells only what you have and pays coins', () => {
    const got = sellToGame('item', 'rice', 3)
    expect(got).toBe(sellPrice('item', 'rice') * 3)
    expect(game.value.coins).toBe(got)
    expect(game.value.inventory.rice).toBe(2)
    expect(sellToGame('item', 'rice', 99)).toBe(sellPrice('item', 'rice') * 2)
    expect(game.value.inventory.rice).toBeUndefined()
    expect(sellToGame('item', 'rice', 1)).toBe(0)
    expect(sellable('outfit', 'top_white')).toBe(0)
  })
})

describe('popup queue', () => {
  it('finds what is new in the bag', () => {
    const before = { inventory: { rice: 1 }, outfits: ['a'], storage: {}, pets: [] }
    const after = { inventory: { rice: 3, incense: 1 }, outfits: ['a', 'b'], storage: { rug_mat: 1 }, pets: ['cat'] }
    expect(diffGot(before, after)).toEqual([
      { kind: 'item', id: 'rice', n: 2 },
      { kind: 'item', id: 'incense', n: 1 },
      { kind: 'outfit', id: 'b', n: 1 },
      { kind: 'furniture', id: 'rug_mat', n: 1 },
      { kind: 'pet', id: 'cat', n: 1 },
    ])
    expect(diffGot(after, before)).toEqual([])
  })

  it('merges new-item popups instead of stacking them', () => {
    pushPopup({ kind: 'got', items: [{ kind: 'item', id: 'rice', n: 1 }] })
    pushPopup({ kind: 'got', items: [{ kind: 'item', id: 'rice', n: 2 }, { kind: 'item', id: 'incense', n: 1 }] })
    expect(popupQueue.value).toHaveLength(1)
    const p = popupQueue.value[0]
    expect(p.kind === 'got' && p.items).toEqual([
      { kind: 'item', id: 'rice', n: 3 },
      { kind: 'item', id: 'incense', n: 1 },
    ])
    expect(mergeGot([], [{ kind: 'pet', id: 'x', n: 1 }])).toHaveLength(1)
  })

  it('queues one level-up card for several level-ups', () => {
    pushPopup({ kind: 'got', items: [{ kind: 'item', id: 'rice', n: 1 }] })
    pushPopup({ kind: 'level', level: 2, coins: 30 })
    pushPopup({ kind: 'level', level: 3, coins: 40 })
    expect(popupQueue.value).toHaveLength(2)
    const lv = popupQueue.value[1]
    expect(lv.kind === 'level' && [lv.level, lv.coins]).toEqual([3, 70])
    popPopup()
    expect(popupQueue.value[0].kind).toBe('level')
  })
})
