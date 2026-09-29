import { beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate } from '../state'
import * as A from '../actions'
import * as Q from '../npcQuests'
import { NPC_QUESTS, NPC_QUEST_BY_ID } from '../data/npcQuests'
import { QUEST_NPCS, SHOP_KEEPER_LOOKS, questNpc } from '../data/questNpcs'
import { PLACE_SHOPS, shopFor } from '../data/placeShops'
import { OUTFIT_BY_ID } from '../data/outfits'
import { PET_BY_ID } from '../data/pets'
import { ITEM_BY_ID } from '../data/items'
import { QUEST_POOL } from '../data/quests'
import { meritForLevel } from '../economy'
import { normalizeNpcQuests } from '../npcQuestState'
import { notices } from '../events'
import { mapId } from '../../ui/store'
import { dayKey } from '../time'
import type { NpcQuestDef } from '../data/npcQuestTypes'

const MAP_IDS_WITH_PLACES = new Set(Object.keys(PLACE_SHOPS).map((k) => PLACE_SHOPS[k].place).filter(Boolean) as string[])

beforeEach(() => {
  game.value = { ...defaultState(), onboarded: true }
  notices.value = []
  mapId.value = 'wat'
  A.ensureDaily()
  Q.setCollectibleGranter(null)
})

const setLevel = (lvl: number) => (game.value = { ...game.value, merit: meritForLevel(lvl) })
const finishAll = (def: NpcQuestDef) => {
  for (const st of def.steps) {
    if (st.map) mapId.value = st.map
    if (st.event === 'npc_talk') Q.talkTo(st.npc!)
    else A.track(st.event, st.target)
  }
}

describe('quest data', () => {
  it('has 60+ quests with unique ids that all pay coins', () => {
    expect(NPC_QUESTS.length).toBeGreaterThanOrEqual(60)
    expect(new Set(NPC_QUESTS.map((q) => q.id)).size).toBe(NPC_QUESTS.length)
    for (const q of NPC_QUESTS) {
      expect(q.reward.coins, q.id).toBeGreaterThan(0)
      expect(q.steps.length, q.id).toBeGreaterThan(0)
      expect(q.intro.length, q.id).toBeGreaterThan(0)
      for (const st of q.steps) expect(st.target, q.id).toBeGreaterThan(0)
    }
  })

  it('has givers that exist on the right map with the right name', () => {
    for (const q of NPC_QUESTS) {
      if (q.giver.startsWith('npc:')) {
        const n = questNpc(q.giver)
        expect(n, q.id).toBeTruthy()
        expect(n!.map, q.id).toBe(q.map)
        expect(n!.name, q.id).toBe(q.npcName)
      } else {
        expect(q.giver.startsWith('shop:'), q.id).toBe(true)
        const shop = PLACE_SHOPS[q.giver.slice(5)]
        expect(shop, q.id).toBeTruthy()
        expect(shop.npc, q.id).toBe(q.npcName)
        if (shop.place) expect(q.map, q.id).toBe(shop.place)
      }
    }
  })

  it('chains, rewards and step targets reference real things', () => {
    for (const q of NPC_QUESTS) {
      for (const r of q.requires ?? []) {
        const req = NPC_QUEST_BY_ID[r]
        expect(req, `${q.id} requires ${r}`).toBeTruthy()
        expect(req.level ?? 1, `${q.id} level after ${r}`).toBeLessThanOrEqual(q.level ?? 1)
      }
      for (const o of q.reward.outfits ?? []) {
        expect(OUTFIT_BY_ID[o], `${q.id} outfit ${o}`).toBeTruthy()
        expect(OUTFIT_BY_ID[o].premium, `${q.id} outfit ${o} premium`).toBeFalsy()
      }
      for (const p of q.reward.pets ?? []) {
        expect(PET_BY_ID[p], `${q.id} pet ${p}`).toBeTruthy()
        expect(PET_BY_ID[p].premium, `${q.id} pet ${p}`).toBeFalsy()
      }
      for (const i of Object.keys(q.reward.items ?? {})) expect(ITEM_BY_ID[i], `${q.id} item ${i}`).toBeTruthy()
      for (const st of q.steps) {
        if (st.event === 'npc_talk') expect(st.npc, q.id).toBeTruthy()
        if (st.npc?.startsWith('npc:')) expect(questNpc(st.npc), `${q.id} → ${st.npc}`).toBeTruthy()
        if (st.npc?.startsWith('shop:')) expect(PLACE_SHOPS[st.npc.slice(5)], `${q.id} → ${st.npc}`).toBeTruthy()
        if (st.event === 'place_visit') expect(st.map, q.id).toBeTruthy()
      }
    }
  })

  it('NPC looks and shop portraits use real outfits', () => {
    const slots = ['hair', 'top', 'bottom', 'head', 'neck', 'hand'] as const
    for (const n of QUEST_NPCS) {
      for (const k of slots) {
        const v = n.look?.[k]
        if (v) expect(OUTFIT_BY_ID[v], `${n.id} ${k} ${v}`).toBeTruthy()
      }
    }
    for (const [id, look] of Object.entries(SHOP_KEEPER_LOOKS)) {
      expect(PLACE_SHOPS[id], id).toBeTruthy()
      for (const k of slots) {
        const v = look[k]
        if (v) expect(OUTFIT_BY_ID[v], `${id} ${k} ${v}`).toBeTruthy()
      }
    }
    expect(new Set(QUEST_NPCS.map((n) => n.id)).size).toBe(QUEST_NPCS.length)
    expect(MAP_IDS_WITH_PLACES.size).toBeGreaterThan(5)
    expect(shopFor('wat_pho_massage').npc).toBe('ป้านวลหมอนวด')
  })
})

describe('npc quest engine', () => {
  it('accepts, tracks steps in order and turns in for coins and items', () => {
    const def = NPC_QUEST_BY_ID.dum_3
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { dum_1: 1, dum_2: 1 } } }
    setLevel(4)
    expect(Q.questStatus(def)).toBe('available')
    expect(Q.acceptQuest('dum_3')).toBe(true)
    expect(Q.questStatus(def)).toBe('active')
    // Later steps don't count before the first one is done.
    A.track('wish')
    expect(Q.progressOf('dum_3')!.p).toEqual([0, 0, 0])
    A.track('donate')
    A.track('gold_leaf')
    expect(Q.progressOf('dum_3')!.p).toEqual([1, 1, 0])
    expect(Q.trackedInfo()!.index).toBe(2)
    A.track('wish')
    expect(Q.questStatus(def)).toBe('ready')
    expect(Q.giverMarker('npc:lung_dum')).toEqual({ kind: 'turnin' })
    const coins = game.value.coins
    const gold = game.value.inventory.gold_leaf ?? 0
    const got = Q.turnInQuest('dum_3')!
    expect(got.coins).toBe(def.reward.coins)
    expect(game.value.coins).toBe(coins + def.reward.coins)
    expect(game.value.inventory.gold_leaf).toBe(gold + 2)
    expect(Q.questStatus(def)).toBe('done')
    expect(game.value.stats.npc_quest).toBe(1)
    expect(Q.turnInQuest('dum_3')).toBeNull()
  })

  it('respects step.map (interiors count for their place)', () => {
    const def = NPC_QUEST_BY_ID.pho_bowls_1
    mapId.value = 'wat_pho'
    expect(Q.acceptQuest(def.id)).toBe(true)
    A.track('donate')
    expect(Q.progressOf(def.id)!.p[0]).toBe(0)
    mapId.value = 'wat_pho:viharn'
    A.track('place_visit')
    A.track('donate', 2)
    mapId.value = 'wat'
    A.track('donate')
    expect(Q.progressOf(def.id)!.p).toEqual([1, 2, 0])
    mapId.value = 'wat_pho:viharn'
    A.track('donate')
    A.track('job')
    expect(Q.questStatus(def)).toBe('ready')
  })

  it('completes place-visit steps on accept when already there', () => {
    setLevel(6)
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { mooh_1: 1, mooh_2: 1, mooh_3: 1 } } }
    mapId.value = 'erawan'
    expect(Q.acceptQuest('mooh_4')).toBe(true)
    expect(Q.progressOf('mooh_4')!.p).toEqual([1, 0, 0])
  })

  it('counts npc_talk only for the right NPC (deliveries)', () => {
    mapId.value = 'wat_phra_kaew'
    expect(Q.acceptQuest('wpk_icecream_1')).toBe(true)
    Q.talkTo('npc:yai_sri')
    expect(Q.questStatus(NPC_QUEST_BY_ID.wpk_icecream_1)).toBe('active')
    Q.talkTo('npc:wpk_volunteer')
    expect(Q.questStatus(NPC_QUEST_BY_ID.wpk_icecream_1)).toBe('ready')
    expect(game.value.npcQuests.met).toContain('npc:wpk_volunteer')
    // The chain opens once turned in.
    expect(Q.questStatus(NPC_QUEST_BY_ID.wpk_volunteer_1)).toBe('locked')
    Q.turnInQuest('wpk_icecream_1')
    setLevel(2)
    expect(Q.questStatus(NPC_QUEST_BY_ID.wpk_volunteer_1)).toBe('available')
  })

  it('gates by level and shows a grey marker with the level', () => {
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { yai_1: 1, yai_2: 1 } } }
    expect(Q.questStatus(NPC_QUEST_BY_ID.yai_3)).toBe('level')
    expect(Q.acceptQuest('yai_3')).toBe(false)
    expect(Q.giverMarker('npc:yai_sri')).toEqual({ kind: 'locked', level: 10 })
    setLevel(10)
    expect(Q.giverMarker('npc:yai_sri')).toEqual({ kind: 'quest' })
  })

  it('markers: shop bag, talk bubble, available and in progress', () => {
    expect(Q.questMarkerFor('shop:wat_pho_balm')).toEqual({ kind: 'shop' })
    expect(Q.questMarkerFor('shop:wat_pho_massage')).toEqual({ kind: 'quest' })
    expect(Q.questMarkerFor('pond')).toBeNull()
    expect(Q.giverMarker('npc:nen_ohm')).toEqual({ kind: 'quest' })
    Q.acceptQuest('ohm_1')
    expect(Q.giverMarker('npc:nen_ohm')).toEqual({ kind: 'progress' })
    expect(Q.questMarkerFor('npc:nen_ohm')).toEqual({ kind: 'progress' })
    // An NPC with nothing to offer just chats.
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { aikhai_numbers_1: 1 } } }
    expect(Q.giverMarker('npc:aikhai_uncle')).toEqual({ kind: 'talk' })
  })

  it('daily quests come back the next day', () => {
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { dum_1: 1 } } }
    const def = NPC_QUEST_BY_ID.dum_daily
    expect(Q.acceptQuest(def.id)).toBe(true)
    A.track('lottery')
    expect(Q.turnInQuest(def.id)).toBeTruthy()
    expect(Q.questStatus(def)).toBe('cooldown')
    expect(Q.questStatus(def, game.value, '2099-01-01')).toBe('available')
    expect(game.value.npcQuests.last[def.id]).toBe(dayKey())
    expect(game.value.npcQuests.done[def.id]).toBe(1)
  })

  it('grants outfits and pets, paying coins for ones already owned', () => {
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { puy_1: 1, puy_2: 1 } } }
    setLevel(5)
    Q.acceptQuest('puy_3')
    finishAll(NPC_QUEST_BY_ID.puy_3)
    const got = Q.turnInQuest('puy_3')!
    expect(got.pets).toEqual(['bangkaew'])
    expect(game.value.pets).toContain('bangkaew')
    expect(game.value.pet).toBe('bangkaew')

    const own = { ...game.value, outfits: [...game.value.outfits, 'head_chefhat'], npcQuests: { ...game.value.npcQuests, done: { ...game.value.npcQuests.done, yai_1: 1, yai_2: 1 } } }
    game.value = own
    setLevel(10)
    Q.acceptQuest('yai_3')
    A.track('cook')
    const coins = game.value.coins
    const r = Q.turnInQuest('yai_3')!
    expect(r.outfits).toEqual([])
    expect(r.dupeCoins).toBe(Q.dupeValue('outfit', 'head_chefhat'))
    expect(game.value.coins).toBe(coins + NPC_QUEST_BY_ID.yai_3.reward.coins + r.dupeCoins)
  })

  it('lottery ticket rewards add scratch chances instead of an item', () => {
    game.value = { ...game.value, npcQuests: { ...game.value.npcQuests, done: { dum_1: 1 } } }
    setLevel(2)
    Q.acceptQuest('dum_2')
    A.track('siamsi')
    const before = A.lotteryLeft()
    Q.turnInQuest('dum_2')
    expect(A.lotteryLeft()).toBe(before + 1)
    expect(game.value.inventory.lottery_ticket).toBeUndefined()
  })

  it('collectibles wait for the granter, then flush', () => {
    const def: NpcQuestDef = {
      id: 'test_collect',
      giver: 'npc:yai_sri',
      map: 'wat',
      npcName: 'ยายศรี',
      title: 't',
      intro: ['x'],
      steps: [{ event: 'bell', target: 1, text: 'x' }],
      reward: { coins: 5, collectibles: { magnet_test: 2 } },
      done: 'x',
    }
    NPC_QUESTS.push(def)
    NPC_QUEST_BY_ID[def.id] = def
    try {
      Q.acceptQuest(def.id)
      A.track('bell')
      Q.turnInQuest(def.id)
      expect(game.value.npcQuests.pending).toEqual({ magnet_test: 2 })
      const got: [string, number][] = []
      Q.setCollectibleGranter((id, n) => got.push([id, n]))
      expect(got).toEqual([['magnet_test', 2]])
      expect(game.value.npcQuests.pending).toEqual({})
    } finally {
      NPC_QUESTS.pop()
      delete NPC_QUEST_BY_ID[def.id]
    }
  })

  it('abandoning frees the quest and the tracker moves on', () => {
    Q.acceptQuest('ohm_1')
    Q.acceptQuest('puy_1')
    expect(game.value.npcQuests.tracked).toBe('puy_1')
    Q.abandonQuest('puy_1')
    expect(game.value.npcQuests.tracked).toBe('ohm_1')
    expect(Q.questStatus(NPC_QUEST_BY_ID.puy_1)).toBe('available')
    Q.setTracked('nope')
    expect(game.value.npcQuests.tracked).toBeNull()
    expect(Q.trackedInfo()?.def.id).toBe('ohm_1')
  })

  it('navigation points at the step, the delivery NPC or the giver', () => {
    mapId.value = 'wat_phra_kaew'
    Q.acceptQuest('wpk_icecream_1')
    const def = NPC_QUEST_BY_ID.wpk_icecream_1
    expect(Q.questNavTarget(def, Q.progressOf(def.id))).toMatchObject({ map: 'wat_phra_kaew', hotspot: 'npc:wpk_volunteer' })
    Q.talkTo('npc:wpk_volunteer')
    expect(Q.questNavTarget(def, Q.progressOf(def.id))).toMatchObject({ map: 'wat_phra_kaew', hotspot: def.giver, step: null })
  })
})

describe('state', () => {
  it('normalizes old saves and junk', () => {
    const s = migrate({ coins: 5 })
    expect(s.npcQuests).toEqual({ active: {}, done: {}, last: {}, tracked: null, met: [], pending: {} })
    const n = normalizeNpcQuests({ active: { a: { p: [1, 'x', -3] }, b: 7 }, done: { a: 2, b: 'no', c: -1 }, last: { a: '2026-01-01', b: 3 }, tracked: 4, met: ['x', 'x', 3], pending: { m: 1 } })
    expect(n.active.a.p).toEqual([1, 0, 0])
    expect(n.active.b).toBeUndefined()
    expect(n.done).toEqual({ a: 2 })
    expect(n.last).toEqual({ a: '2026-01-01' })
    expect(n.tracked).toBeNull()
    expect(n.met).toEqual(['x'])
    expect(n.pending).toEqual({ m: 1 })
  })

  it('daily pool pays coins for every quest', () => {
    for (const q of QUEST_POOL) expect(q.coins, q.id).toBeGreaterThan(0)
  })
})
