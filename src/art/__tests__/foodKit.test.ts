import { describe, expect, it } from 'vitest'
import { Pix, ramp, tintOutline, OUT } from '../foodKit'
import { FOOD_KIT_NAMES, hasFoodKitIcon } from '../foodIcons'
import { hasPlushArt, PLUSH_MOTIFS } from '../plush'
import { SNACKS } from '../../game/data/placeShops'
import { INGREDIENTS, DISHES as DISH_ITEMS, ITEMS } from '../../game/data/items'
import { COLLECTIBLES, COLLECTIBLE_BY_ID } from '../../game/data/collectibles'
import { FAIR_PRIZES } from '../../game/hubs'
import { hexToRgb } from '../../engine/pixel'

const lum = (c: string) => {
  const [r, g, b] = hexToRgb(c)
  return r * 0.3 + g * 0.55 + b * 0.15
}

describe('food kit ramps', () => {
  it('orders tones from light to dark', () => {
    for (const base of ['#ffc72a', '#e8352e', '#3c9c46', '#f3ede0', '#5a8de0']) {
      const r = ramp(base)
      expect(lum(r.hi)).toBeGreaterThan(lum(r.l))
      expect(lum(r.l)).toBeGreaterThan(lum(r.m))
      expect(lum(r.m)).toBeGreaterThan(lum(r.s))
      expect(lum(r.s)).toBeGreaterThan(lum(r.d))
    }
  })

  it('tints outlines toward the ink, darker on the bottom-right', () => {
    const c = tintOutline('#e8352e')
    const dark = tintOutline('#e8352e', true)
    expect(lum(c)).toBeLessThan(lum('#e8352e') * 0.6)
    expect(lum(dark)).toBeLessThanOrEqual(lum(c))
    // Never pure black: stays near the warm plum ink.
    expect(lum(dark)).toBeGreaterThanOrEqual(lum(OUT) - 1)
  })
})

describe('Pix shaded forms', () => {
  it('lights a ball from the top-left with a specular glint', () => {
    const k = new Pix(16, 16)
    const r = ramp('#ffc72a')
    k.ball(8, 8, 5, 5, r)
    const tl = k.get(5, 5)
    const br = k.get(11, 11)
    expect(tl && lum(tl)).toBeGreaterThan(br ? lum(br) : 0)
    expect(k.c.includes(r.hi)).toBe(true)
    // Nothing painted outside the ellipse.
    expect(k.get(0, 0)).toBeNull()
  })

  it('separation lines darken only what a form overlaps', () => {
    const k = new Pix(16, 16)
    k.rect(0, 10, 16, 4, '#ffffff')
    k.form(ramp('#3c9c46'), (m) => m.rect(4, 4, 8, 6, '#000'), 'bevel', { sep: 'down' })
    expect(k.get(6, 10)).not.toBe('#ffffff')
    expect(k.get(6, 12)).toBe('#ffffff')
    expect(k.get(1, 3)).toBeNull()
  })

  it('keeps effect pixels out of the outline mask', () => {
    const k = new Pix(8, 8)
    k.fx(2, 2, '#ffffff')
    expect(k.c.every((c) => c === null)).toBe(true)
  })
})

describe('food icon coverage', () => {
  it('every stall snack has its own kit icon', () => {
    for (const s of SNACKS) {
      expect(hasFoodKitIcon(s.id), s.id).toBe(true)
      expect(s.icon, s.id).toBe(s.id)
    }
  })

  it('every ingredient, dish (and gold dish) and food alms item is drawn by the kit', () => {
    for (const it of [...INGREDIENTS, ...DISH_ITEMS]) expect(hasFoodKitIcon(it.icon), it.id).toBe(true)
    const food = ITEMS.filter((i) => ['rice', 'sticky', 'curry', 'egg', 'dessert', 'banana', 'water', 'fruit', 'laddu', 'milk', 'redsoda', 'boiled_egg', 'tea', 'fish_food', 'dog_food', 'chicken', 'catfish_food', 'sangkhathan'].includes(i.id))
    expect(food.length).toBeGreaterThan(15)
    for (const it of food) expect(hasFoodKitIcon(it.icon), it.id).toBe(true)
  })

  it('offers the Thai classics as icon names', () => {
    for (const n of ['tomyum', 'khaomangai', 'lookchin', 'friedegg', 'kluaytod', 'popcorn', 'saimai', 'khaolam', 'mango', 'durian', 'rambutan', 'mangosteen', 'coconut', 'banana', 'fish', 'shrimp', 'thongyod', 'kaprao', 'padthai', 'somtam', 'namdaeng', 'chayen'])
      expect(FOOD_KIT_NAMES, n).toContain(n)
  })
})

describe('plush collectibles', () => {
  it('every plush collectible has stitched plush art', () => {
    const plush = COLLECTIBLES.filter((c) => c.kind === 'plush')
    expect(plush.length).toBeGreaterThanOrEqual(20)
    for (const c of plush) expect(hasPlushArt(c.art.motif), c.id).toBe(true)
  })

  it('covers the requested animals and the new plushies', () => {
    for (const m of ['hippo', 'elephant', 'cat', 'teddy', 'lizard', 'monster', 'rooster', 'naga', 'mookata', 'bigcat', 'friedegg']) expect(PLUSH_MOTIFS, m).toContain(m)
  })

  it('puts the new plushies on the fair prize wall', () => {
    for (const id of ['fair_plush_friedegg', 'fair_plush_elephant', 'fair_plush_rooster', 'fair_plush_mookata', 'fair_plush_labubun', 'fair_plush_naga', 'fair_plush_bigcat']) {
      expect(COLLECTIBLE_BY_ID[id]?.kind, id).toBe('plush')
      expect(FAIR_PRIZES.some((p) => p.ref === id)).toBe(true)
    }
    const t = FAIR_PRIZES.map((p) => p.tickets)
    expect([...t].sort((a, b) => a - b)).toEqual(t)
  })
})
