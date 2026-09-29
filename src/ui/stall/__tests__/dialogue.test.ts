import { describe, expect, it } from 'vitest'
import { brokeLine, buyLine, byeLine, haggleLine, lookLine, pokeLine, recommendLine, soldOutLine, thanksLine } from '../dialogue'
import type { StallNpc, Dialect } from '../../../game/stalls'
import { DEFAULT_LOOK } from '../../../art/avatar'

const shop = { id: 'x', name: 'ร้านทดสอบ', npc: 'ป้าทดสอบ', greeting: 'สวัสดีจ้า', snacks: [] }
const DIALECTS: Dialect[] = ['central', 'north', 'isan', 'south', 'chinese', 'polite', 'teen']

describe('shopkeeper lines', () => {
  it('never leave a placeholder behind, for every dialect and gender', () => {
    for (const dialect of DIALECTS)
      for (const gender of ['m', 'f'] as const)
        for (const elder of [true, false]) {
          const npc: StallNpc = { name: 'x', gender, elder, dialect, look: DEFAULT_LOOK }
          for (let i = 0; i < 12; i++) {
            const lines = [
              recommendLine(npc, shop, { name: 'ของดี', rarity: 'rare', kind: 'collectible' }),
              recommendLine(npc, shop, { name: 'ขนม', kind: 'snack' }),
              recommendLine(npc, shop, null),
              haggleLine(npc, 0, false),
              haggleLine(npc, 0.1, false),
              haggleLine(npc, 0.2, false),
              haggleLine(npc, 0, true),
              thanksLine(npc, shop),
              buyLine(npc, shop, 'collectible'),
              buyLine(npc, shop, 'snack'),
              soldOutLine(npc),
              brokeLine(npc),
              byeLine(npc),
              pokeLine(npc),
              lookLine(npc, 'legendary') ?? '',
            ]
            for (const l of lines) expect(l).not.toMatch(/[{}]/)
          }
        }
  })

  it('uses the recommended item name', () => {
    const npc: StallNpc = { name: 'x', gender: 'f', elder: true, dialect: 'south', look: DEFAULT_LOOK }
    expect(recommendLine(npc, shop, { name: 'ไก่ชนทองคำ', rarity: 'epic', kind: 'collectible' })).toContain('ไก่ชนทองคำ')
  })
})
