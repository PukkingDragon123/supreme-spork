import { describe, expect, it } from 'vitest'
import { TIPS, TIP_BY_ID, pickTip, tipLine } from '../botnoiTips'
import { NPC_QUESTS } from '../data/npcQuests'
import { BOTNOI_GIVER } from '../data/npcQuests/botnoi'
import { OUTFIT_BY_ID } from '../data/outfits'
import { TUT_REWARD } from '../botnoiTutorial'

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
