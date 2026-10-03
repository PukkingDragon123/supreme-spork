import { describe, expect, it } from 'vitest'
import { TIPS, TIP_BY_ID, pickTip, tipLine } from '../botnoiTips'
import { NPC_QUESTS } from '../data/npcQuests'
import { BOTNOI_GIVER } from '../data/npcQuests/botnoi'
import { OUTFIT_BY_ID } from '../data/outfits'
import { TUT_REWARD, TUT_LOANS, TUT_STEPS, loanFor, loanStillNeeded, reclaimAmounts, tutReward, type TutInput } from '../botnoiTutorial'
import { game } from '../state'
import { finishTutorial, lendFor, reclaimLoan, startTutorial, tutorialInput } from '../botnoi'
import { defaultBotnoi } from '../botnoiState'
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

describe('empty start, loans and the finale gift', () => {
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

  it('lends only what is missing, and takes back only what is left', () => {
    for (const l of TUT_LOANS) {
      for (const id of Object.keys(l.items ?? {})) expect(ITEM_BY_ID[id], id).toBeTruthy()
      for (const id of Object.keys(l.furniture ?? {})) expect(FURNITURE_BY_ID[id], id).toBeTruthy()
    }
    const empty = { items: {}, furniture: {} }
    expect(loanFor('merit', empty)?.items.fish_food).toBeGreaterThan(0)
    expect(loanFor('merit', { items: { fish_food: 3, rice: 1, banana: 1, water: 1 }, furniture: {} })).toBeNull()
    expect(loanFor('decorate', empty)?.furniture.plant_monstera).toBe(1)
    // No mid-tutorial loans for steps that need nothing (incense is lit for free).
    for (const step of ['hello', 'incense', 'pray', 'npc', 'shop'] as const) expect(loanFor(step, empty)).toBeNull()
    expect(loanStillNeeded('decorate', 'decorate')).toBe(true)
    expect(loanStillNeeded('decorate', 'finish')).toBe(false)
    expect(loanStillNeeded('merit', 'pray')).toBe(false)
    expect(reclaimAmounts({ fish_food: 12 }, { fish_food: 5 })).toEqual({ fish_food: 5 })
    expect(reclaimAmounts({ fish_food: 12 }, { fish_food: 30 })).toEqual({ fish_food: 12 })
    expect(reclaimAmounts({ fish_food: 12 }, {})).toEqual({})
  })

  it('pays the whole starter kit once at the end (minus loaned furniture already placed)', () => {
    const full = tutReward(defaultBotnoi())
    expect(full.coins).toBe(TUT_REWARD.coins)
    expect(full.items.incense).toBeGreaterThan(0)
    expect(full.items.fish_food).toBeGreaterThan(0)
    expect(full.furniture).toEqual({ plant_monstera: 1, rug_mat: 1 })
    expect(tutReward(defaultBotnoi(), { plant_monstera: 1 }).furniture).toEqual({ rug_mat: 1 })
    const again = tutReward({ ...defaultBotnoi(), rewarded: true })
    expect(again.items).toEqual({})
    expect(again.furniture).toEqual({})
    expect(again.outfit).toBeNull()
  })

  it('plays an empty save through: nothing in the bag until the finale, then one big reward', () => {
    game.value = { ...defaultState(), onboarded: true }
    startTutorial(false)
    const go = (id: string) => {
      for (let k = 0; k < 40 && game.value.botnoi.step !== id; k++) tutorialInput({ kind: 'skipStep' } as TutInput)
      expect(game.value.botnoi.step).toBe(id)
    }
    go('merit')
    expect(lendFor('merit')).toBe(true)
    expect(game.value.inventory.fish_food).toBe(12)
    // Fed 5 pellets, then the step ends: the rest goes back to Bot Noi.
    game.value = { ...game.value, inventory: { ...game.value.inventory, fish_food: 7 } }
    tutorialInput({ kind: 'event', event: 'koi_fed' })
    reclaimLoan()
    expect(game.value.inventory).toEqual({})
    go('decorate')
    expect(lendFor('decorate')).toBe(true)
    expect(game.value.house.storage.plant_monstera).toBe(1)
    // Placed the loaner plant: it stays, as part of the reward.
    game.value = { ...game.value, house: { ...game.value.house, storage: {} } }
    expect(reclaimLoan()).toEqual({ plant_monstera: 1 })
    go('finish')
    expect(game.value.inventory).toEqual({})
    expect(game.value.coins).toBe(0)
    const got = finishTutorial()!
    expect(got.coins).toBe(TUT_REWARD.coins)
    expect(game.value.inventory.incense).toBe(TUT_REWARD.items.incense)
    expect(game.value.house.storage).toEqual({ rug_mat: 1 })
    expect(game.value.outfits).toContain(TUT_REWARD.outfit)
    expect(game.value.botnoi.loan).toBeNull()
    expect(TUT_STEPS.length).toBeGreaterThan(5)
  })

  it('normalises a saved loan', () => {
    expect(normalizeBotnoi({ loan: { step: 'merit', items: { fish_food: 12, x: -1 }, furniture: 'no' } }).loan).toEqual({ step: 'merit', items: { fish_food: 12 }, furniture: {} })
    expect(normalizeBotnoi({ loan: 5 }).loan).toBeNull()
  })

  it('Bot Noi quests pay items when turned in', () => {
    const first = NPC_QUESTS.find((q) => q.id === 'bn_1')!
    expect(Object.keys(first.reward.items ?? {}).length).toBeGreaterThan(0)
    const daily = NPC_QUESTS.find((q) => q.id === 'bn_daily')!
    expect(Object.keys(daily.reward.items ?? {}).length).toBeGreaterThan(0)
  })
})
