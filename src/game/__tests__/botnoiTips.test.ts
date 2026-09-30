import { describe, expect, it } from 'vitest'
import { TIPS, TIP_BY_ID, pickTip, tipLine } from '../botnoiTips'
import { NPC_QUESTS } from '../data/npcQuests'
import { BOTNOI_GIVER } from '../data/npcQuests/botnoi'
import { OUTFIT_BY_ID } from '../data/outfits'
import { TUT_REWARD, TUT_GIFTS, giftFor } from '../botnoiTutorial'
import { defaultState, migrate } from '../state'
import { ITEM_BY_ID } from '../data/items'
import { FURNITURE_BY_ID } from '../data/furniture'
import { normalizeBotnoi } from '../botnoiState'

describe('bot noi feature tips', () => {
  it('covers every system from the brief with 1-3 bubbles', () => {
    for (const id of ['stall', 'market', 'collection', 'event', 'pass', 'hub', 'fair', 'cook', 'craft', 'jobs', 'online_chat', 'online_card', 'rank', 'rooms', 'chant_memory']) expect(TIP_BY_ID[id], id).toBeTruthy()
    for (const t of TIPS) {
      expect(t.lines.length, t.id).toBeGreaterThanOrEqual(1)
      expect(t.lines.length, t.id).toBeLessThanOrEqual(3)
    }
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length)
  })

  it('shows each tip once, in trigger order, respecting level gates', () => {
    expect(pickTip(['market', 'stall'], [], 1)?.id).toBe('market')
    expect(pickTip(['market', 'stall'], ['market'], 1)?.id).toBe('stall')
    expect(pickTip(['market'], ['market'], 1)).toBeNull()
    // Cooking opens at Lv10, crafting at Lv5.
    expect(pickTip(['cook'], [], 9)).toBeNull()
    expect(pickTip(['cook'], [], 10)?.id).toBe('cook')
    expect(pickTip(['craft', 'jobs'], [], 4)?.id).toBe('jobs')
    expect(pickTip(['nope'], [], 99)).toBeNull()
  })

  it('parses face tags', () => {
    expect(tipLine('happy|สวัสดี')).toEqual({ e: 'happy', t: 'สวัสดี' })
    expect(tipLine('ไม่มีหน้า')).toEqual({ e: 'normal', t: 'ไม่มีหน้า' })
  })
})

describe('bot noi quests and reward', () => {
  const bot = NPC_QUESTS.filter((q) => q.giver === BOTNOI_GIVER)
  it('is a chain of coin-paying quests given by Bot Noi', () => {
    expect(bot.length).toBeGreaterThanOrEqual(10)
    for (const q of bot) {
      expect(q.reward.coins, q.id).toBeGreaterThan(0)
      expect(q.npcName).toBe('บอทน้อย')
      for (const r of q.requires ?? []) expect(bot.some((b) => b.id === r), `${q.id} requires ${r}`).toBe(true)
    }
    expect(bot.filter((q) => !q.requires?.length).length).toBe(1)
  })

  it('the tutorial reward is a real, granted-only outfit', () => {
    const o = OUTFIT_BY_ID[TUT_REWARD.outfit]
    expect(o).toBeTruthy()
    expect(o.slot).toBe('head')
    expect(o.exclusive).toBeTruthy()
  })
})

describe('empty start and Bot Noi gifts', () => {
  it('a new save starts with nothing extra', () => {
    const s = defaultState()
    expect(s.inventory).toEqual({})
    expect(s.coins).toBe(0)
    expect(s.pets).toEqual([])
    expect(s.house.storage).toEqual({})
    // Only hair styles plus the plain clothes being worn.
    const clothes = s.outfits.filter((id) => OUTFIT_BY_ID[id]?.slot !== 'hair')
    expect(clothes.sort()).toEqual([s.player.look.top, s.player.look.bottom].sort())
    // The old freebies are no longer free.
    for (const id of ['top_school_m', 'bot_jeans', 'shoes_school']) expect(OUTFIT_BY_ID[id].price).toBeGreaterThan(0)
  })

  it('existing saves keep what they own', () => {
    const old = migrate({ onboarded: true, outfits: ['top_school_m', 'shoes_school'], inventory: { rice: 3 }, coins: 77 })
    expect(old.outfits).toContain('top_school_m')
    expect(old.inventory.rice).toBe(3)
    expect(old.coins).toBe(77)
  })

  it('gifts real things, each once, before the step that needs them', () => {
    for (const g of TUT_GIFTS) {
      for (const id of Object.keys(g.items ?? {})) expect(ITEM_BY_ID[id], `${g.id} ${id}`).toBeTruthy()
      for (const id of Object.keys(g.furniture ?? {})) expect(FURNITURE_BY_ID[id], `${g.id} ${id}`).toBeTruthy()
    }
    expect(giftFor('incense', [])?.items?.incense).toBeGreaterThan(0)
    expect(giftFor('bag', [])?.items?.fish_food).toBeGreaterThan(0)
    expect(giftFor('decorate', [])?.furniture).toBeTruthy()
    expect(giftFor('incense', ['incense'])).toBeNull()
    expect(giftFor('npc', [])).toBeNull()
    expect(normalizeBotnoi({ gifts: ['alms', 3, 'alms'] }).gifts).toEqual(['alms'])
  })

  it('Bot Noi quests are an early source of items', () => {
    const first = NPC_QUESTS.find((q) => q.id === 'bn_1')!
    expect(Object.keys(first.reward.items ?? {}).length).toBeGreaterThan(0)
    const daily = NPC_QUESTS.find((q) => q.id === 'bn_daily')!
    expect(Object.keys(daily.reward.items ?? {}).length).toBeGreaterThan(0)
  })
})
