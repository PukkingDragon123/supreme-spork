import { describe, expect, it } from 'vitest'
import { PERK_LABEL, PET_BY_ID, PETS, perkText, petsForShop, RARITY } from '../data/pets'
import { petArtIds, petFrames } from '../../art/pets'

describe('pet catalogue', () => {
  it('has ~16 pets with unique ids', () => {
    expect(PETS.length).toBeGreaterThanOrEqual(16)
    const ids = new Set(PETS.map((p) => p.id))
    expect(ids.size).toBe(PETS.length)
    for (const p of PETS) expect(PET_BY_ID[p.id]).toBe(p)
  })

  it('uses Thai names and descriptions', () => {
    const thai = /[฀-๿]/
    for (const p of PETS) {
      expect(p.name).toMatch(thai)
      expect(p.desc).toMatch(thai)
      expect(p.desc.length).toBeGreaterThan(15)
    }
  })

  it('keeps prices, perks and rarities in range', () => {
    for (const p of PETS) {
      expect(p.price).toBeGreaterThanOrEqual(150)
      expect(p.price).toBeLessThanOrEqual(1500)
      expect(Number.isInteger(p.price)).toBe(true)
      expect(RARITY[p.rarity]).toBeDefined()
      expect(PERK_LABEL[p.perk.kind]).toBeDefined()
      expect(p.perk.pct).toBeGreaterThanOrEqual(2)
      expect(p.perk.pct).toBeLessThanOrEqual(8)
      expect(perkText(p.perk)).toContain(`+${p.perk.pct}%`)
    }
  })

  it('has every rarity, some premium and some coin-buyable pets', () => {
    for (const r of Object.keys(RARITY)) expect(PETS.some((p) => p.rarity === r)).toBe(true)
    expect(PETS.some((p) => p.premium)).toBe(true)
    expect(PETS.filter((p) => !p.premium).length).toBeGreaterThan(10)
    expect(PETS.some((p) => p.flying)).toBe(true)
  })

  it('prices rise with rarity (on average)', () => {
    const avg = (r: string) => {
      const xs = PETS.filter((p) => p.rarity === r).map((p) => p.price)
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(avg('common')).toBeLessThan(avg('rare'))
    expect(avg('rare')).toBeLessThan(avg('epic'))
    expect(avg('epic')).toBeLessThan(avg('legend'))
  })

  it('sorts the shop by rarity then price', () => {
    const s = petsForShop()
    for (let i = 1; i < s.length; i++) {
      const a = RARITY[s[i - 1].rarity].order
      const b = RARITY[s[i].rarity].order
      expect(a < b || (a === b && s[i - 1].price <= s[i].price)).toBe(true)
    }
  })

  it('has art for every pet', () => {
    const art = new Set(petArtIds())
    for (const p of PETS) expect(art.has(p.id)).toBe(true)
    expect(petFrames('walk')).toBe(4)
    expect(petFrames('idle')).toBe(2)
  })
})
