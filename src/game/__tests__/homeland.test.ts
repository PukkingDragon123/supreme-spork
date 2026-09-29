import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { game, defaultState, migrate, type GameState } from '../state'
import * as A from '../actions'
import { notices } from '../events'
import { meritForLevel } from '../economy'
import { PROVINCES, PROVINCE_BY_ID, provincesOf, searchProvinces } from '../data/provinces'
import { PLACE_BY_ID, PLACES, REGIONS, type Region } from '../data/places'
import { RANKS, RANK_BY_PLACE, ranksOf, crownOf, TIERS, tierIndex, TEMPLE_DONE_KINDS } from '../data/ranks'
import { RANK_QUESTS, RANK_QUEST_BY_ID } from '../data/npcQuests/ranks'
import { RANK_COLLECTIBLES, RANK_COLLECTIBLE_BY_ID } from '../data/collectibles/ranks'
import { FURNITURE_BY_ID } from '../data/furniture'
import { PLACE_SHOPS } from '../data/placeShops'
import { STAGES } from '../data/prayers'
import { ROOMS, REGION_ROOM } from '../data/rooms'
import {
  canClaimRank,
  effectivePrice,
  effectiveStars,
  HOME_BONUS,
  homelandMeritBonus,
  homeRoom,
  MOVE_COST,
  placeAccess,
  rankReqs,
  regionProgress,
  regionTierReached,
  roomStatus,
  setRankQuestChecker,
  templeDone,
} from '../homeland'
import { claimRank, enterRoom, installHomelandTracking, setProvince, unlockRoomNow } from '../homelandActions'
import { normalizeHomeland } from '../homelandState'

const allStars = (): Record<string, number> => Object.fromEntries(STAGES.map((s) => [s.id, 3]))

function fresh(patch: Partial<GameState> = {}): GameState {
  return { ...defaultState(), onboarded: true, ...patch }
}

/** Mark a temple visited and completed (3 kinds of merit). */
function complete(s: GameState, id: string) {
  if (!s.places.visited.includes(id)) s.places.visited.push(id)
  s.homeland.temples[id] = ['alms', 'chant', 'wish']
}

beforeEach(() => {
  game.value = fresh()
  notices.value = []
  setRankQuestChecker(null)
})

afterEach(() => setRankQuestChecker(null))

describe('provinces', () => {
  it('lists all 77 provinces with unique ids and names', () => {
    expect(PROVINCES).toHaveLength(77)
    expect(new Set(PROVINCES.map((p) => p.id)).size).toBe(77)
    expect(new Set(PROVINCES.map((p) => p.name)).size).toBe(77)
    for (const p of PROVINCES) {
      expect(p.name).toMatch(/[฀-๿]/)
      expect(p.good).toMatch(/[฀-๿]/)
      expect(p.sight).toMatch(/[฀-๿]/)
      expect(REGIONS.some((r) => r.id === p.region)).toBe(true)
    }
  })

  it('covers every region, matching the provinces of the map places', () => {
    const counts = Object.fromEntries(REGIONS.map((r) => [r.id, provincesOf(r.id).length]))
    expect(counts).toEqual({ bangkok: 1, central: 14, north: 16, northeast: 20, east: 7, west: 5, south: 14 })
    for (const pl of PLACES) {
      const pr = PROVINCES.find((p) => p.name === pl.province)
      expect(pr, pl.province).toBeTruthy()
      expect(pr!.region).toBe(pl.region)
    }
  })

  it('searches by name, food or landmark', () => {
    expect(searchProvinces('เชียงใหม่').map((p) => p.id)).toEqual(['chiang_mai'])
    expect(searchProvinces('ข้าวซอย').map((p) => p.id)).toContain('chiang_mai')
    expect(searchProvinces('พระธาตุพนม').map((p) => p.id)).toContain('nakhon_phanom')
    expect(searchProvinces('  ')).toHaveLength(77)
  })
})

describe('rank ladder data', () => {
  it('ranks real temples in their own region', () => {
    for (const r of RANKS) {
      const p = PLACE_BY_ID[r.place]
      expect(p, r.place).toBeTruthy()
      expect(p.home).toBeFalsy()
      expect(p.region).toBe(r.region)
      expect(r.blurb).toMatch(/[฀-๿]/)
    }
    expect(new Set(RANKS.map((r) => r.place)).size).toBe(RANKS.length)
    for (const reg of REGIONS) expect(ranksOf(reg.id).length).toBeGreaterThan(0)
  })

  it('puts the famous temples at the very top', () => {
    for (const id of ['wat_phra_kaew', 'doi_suthep', 'that_phanom', 'nst_mahathat']) {
      expect(RANK_BY_PLACE[id].tier).toBe('SS')
      expect(crownOf(RANK_BY_PLACE[id].region)?.place).toBe(id)
    }
  })

  it('gets harder tier by tier', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].level).toBeGreaterThan(TIERS[i - 1].level)
      expect(TIERS[i].stars).toBeGreaterThan(TIERS[i - 1].stars)
      expect(TIERS[i].coins).toBeGreaterThan(TIERS[i - 1].coins)
    }
  })

  it('gives every S/SS temple a rank quest from a lower temple of the same region', () => {
    const shops = PLACE_SHOPS as Record<string, { place?: string }>
    for (const r of RANKS) {
      const needs = TIERS[tierIndex(r.tier)].quest
      expect(!!r.quest).toBe(needs)
      if (!r.quest) continue
      const q = RANK_QUEST_BY_ID[r.quest]
      expect(q, r.quest).toBeTruthy()
      const shop = shops[q.giver.replace('shop:', '')]
      expect(shop, q.giver).toBeTruthy()
      expect(shop.place).toBe(q.map)
      const giverRank = RANK_BY_PLACE[q.map]
      expect(giverRank.region).toBe(r.region)
      expect(tierIndex(giverRank.tier)).toBeLessThan(tierIndex(r.tier))
      for (const id of q.requires ?? []) expect(RANK_QUEST_BY_ID[id]).toBeTruthy()
    }
    expect(new Set(RANK_QUESTS.map((q) => q.id)).size).toBe(RANK_QUESTS.length)
  })

  it('rewards rare collectibles and real furniture', () => {
    for (const q of RANK_QUESTS) {
      for (const id of Object.keys(q.reward.collectibles ?? {})) expect(RANK_COLLECTIBLE_BY_ID[id], id).toBeTruthy()
      for (const st of q.steps) expect(st.target).toBeGreaterThan(0)
    }
    for (const r of RANKS) {
      for (const f of r.furniture ?? []) expect(FURNITURE_BY_ID[f], f).toBeTruthy()
      for (const c of r.collectibles ?? []) expect(RANK_COLLECTIBLE_BY_ID[c], c).toBeTruthy()
      if (r.tier === 'SS') for (const c of r.collectibles ?? []) expect(RANK_COLLECTIBLE_BY_ID[c].rarity).toBe('legendary')
      if (r.tier === 'S') for (const c of r.collectibles ?? []) expect(RANK_COLLECTIBLE_BY_ID[c].rarity).toBe('epic')
    }
    for (const c of RANK_COLLECTIBLES) {
      expect(c.art.palette).toHaveLength(3)
      for (const col of c.art.palette) expect(col).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('rank locks', () => {
  it('keeps easy temples open and famous ones locked for a new player', () => {
    const s = game.value
    expect(placeAccess(s, 'erawan').open).toBe(true)
    const pk = placeAccess(s, 'wat_phra_kaew')
    expect(pk.open).toBe(false)
    expect(pk.rankLocked).toBe(true)
    expect(pk.canBuy).toBe(false)
    expect(pk.reqs.map((r) => r.kind)).toEqual(['level', 'stars', 'lower', 'quest'])
  })

  it('never re-locks a temple the player already visited or bought', () => {
    const s = fresh({ places: { bought: ['wat_traimit'], visited: ['wat_phra_kaew'], current: null } })
    expect(placeAccess(s, 'wat_phra_kaew')).toMatchObject({ open: true, kept: true })
    expect(placeAccess(s, 'wat_traimit')).toMatchObject({ open: true, kept: true })
  })

  it('needs level, stars, every lower temple and the rank quest', () => {
    const s = fresh({ merit: meritForLevel(TIERS[4].level), prayer: { ...defaultState().prayer, stars: allStars() } })
    let a = placeAccess(s, 'doi_suthep')
    expect(a.open).toBe(false)
    expect(a.reqs.find((r) => r.kind === 'level')?.met).toBe(true)
    expect(a.reqs.find((r) => r.kind === 'stars')?.met).toBe(true)
    const lower = a.reqs.find((r) => r.kind === 'lower')!
    expect(lower).toMatchObject({ have: 0, need: 5, met: false })
    for (const r of ranksOf('north')) if (r.place !== 'doi_suthep') complete(s, r.place)
    a = placeAccess(s, 'doi_suthep')
    expect(a.reqs.find((r) => r.kind === 'lower')?.met).toBe(true)
    expect(a.open).toBe(false) // still needs the rank quest
    setRankQuestChecker((_s, id) => id === 'rank_north_ss')
    expect(placeAccess(s, 'doi_suthep').open).toBe(true)
  })

  it('reads finished quests from the quest engine state by default', () => {
    const s = fresh({ merit: meritForLevel(20), prayer: { ...defaultState().prayer, stars: allStars() } })
    for (const r of ranksOf('northeast')) if (r.tier !== 'SS') complete(s, r.place)
    ;(s as unknown as { npcQuests: unknown }).npcQuests = { done: ['rank_northeast_ss'] }
    expect(placeAccess(s, 'that_phanom').open).toBe(true)
  })

  it('lets coins skip only the stars', () => {
    const s = fresh({ merit: meritForLevel(20) })
    for (const r of ranksOf('south')) if (r.tier === 'C') complete(s, r.place)
    const a = placeAccess(s, 'phuket_big_buddha')
    expect(a.rankLocked).toBe(false)
    expect(a.open).toBe(false)
    expect(a.canBuy).toBe(true)
    const p = PLACE_BY_ID.phuket_big_buddha
    expect(a.price).toBe(effectivePrice(p))
    expect(effectiveStars(p)).toBe(Math.max(p.stars, TIERS[1].stars))
    // Paying (bought) satisfies the stars row.
    s.places.bought.push('phuket_big_buddha')
    expect(rankReqs(s, 'phuket_big_buddha').find((r) => r.kind === 'stars')?.met).toBe(true)
  })

  it('SS temples need more stars than their map price', () => {
    expect(effectiveStars(PLACE_BY_ID.wat_phra_kaew)).toBe(TIERS[4].stars)
    expect(effectivePrice(PLACE_BY_ID.wat_phra_kaew)).toBeGreaterThan(PLACE_BY_ID.wat_phra_kaew.coins)
    expect(rankReqs(game.value, 'wat_mahathat_ayutthaya').find((r) => r.kind === 'lower')?.need).toBe(1)
    expect(rankReqs(game.value, 'nowhere')).toEqual([])
  })
})

describe('temple completion and rewards', () => {
  it('needs a visit and three kinds of merit', () => {
    const s = fresh()
    s.homeland.temples.wat_pho = ['alms', 'chant', 'wish']
    expect(templeDone(s, 'wat_pho')).toBe(false) // never visited
    s.places.visited.push('wat_pho')
    expect(templeDone(s, 'wat_pho')).toBe(true)
    s.homeland.temples.wat_pho = ['alms']
    expect(templeDone(s, 'wat_pho')).toBe(false)
  })

  it('tracks distinct merit kinds only while at a ranked temple', () => {
    let here = true
    const off = installHomelandTracking(() => here)
    game.value = fresh({ places: { bought: [], visited: ['wat_pho'], current: 'wat_pho' } })
    A.track('alms')
    A.track('alms')
    A.track('login')
    expect(game.value.homeland.temples.wat_pho).toEqual(['alms'])
    here = false
    A.track('chant')
    expect(game.value.homeland.temples.wat_pho).toEqual(['alms'])
    here = true
    A.track('chant')
    A.track('wish')
    expect(templeDone(game.value, 'wat_pho')).toBe(true)
    expect(TEMPLE_DONE_KINDS).toBe(3)
    off()
  })

  it('claims a completed temple once, with coins, merit and furniture', () => {
    const s = fresh()
    complete(s, 'wat_arun')
    game.value = s
    expect(canClaimRank(game.value, 'wat_arun')).toBe(true)
    const coins = game.value.coins
    expect(claimRank('wat_arun')).toBe(true)
    expect(game.value.coins).toBeGreaterThanOrEqual(coins + TIERS[1].coins) // + level-up coins
    expect(game.value.merit).toBe(TIERS[1].merit)
    expect(game.value.house.storage.b_robot).toBe(1)
    expect(claimRank('wat_arun')).toBe(false)
    expect(claimRank('wat_pho')).toBe(false) // not completed
  })

  it('summarises region progress', () => {
    const s = fresh()
    complete(s, 'ai_khai')
    complete(s, 'phuket_big_buddha')
    const p = regionProgress(s, 'south')
    expect(p).toMatchObject({ done: 2, total: 4, best: 'B', claimable: 2 })
    expect(p.next?.place).toBe('wat_chalong')
    expect(regionTierReached(s, 'south', 'B')).toBe(true)
    expect(regionTierReached(s, 'south', 'A')).toBe(false)
  })
})

describe('home province', () => {
  it('first pick is free, moving later costs coins', () => {
    game.value = fresh({ coins: 150 })
    expect(setProvince('chiang_mai')).toBe(true)
    expect(game.value.homeland.province).toBe('chiang_mai')
    expect(game.value.coins).toBe(150)
    expect(setProvince('chiang_mai')).toBe(true)
    expect(setProvince('phuket')).toBe(true)
    expect(game.value.coins).toBe(150 - MOVE_COST)
    expect(game.value.homeland.moves).toBe(1)
    expect(setProvince('nan')).toBe(false) // can't afford another move
    expect(setProvince('atlantis')).toBe(false)
  })

  it('makes the home region room free', () => {
    game.value = fresh()
    expect(roomStatus(game.value, 'north').owned).toBe(false)
    setProvince('chiang_rai')
    expect(homeRoom(game.value)).toBe('north')
    expect(roomStatus(game.value, 'north')).toMatchObject({ owned: true, free: 'home' })
    expect(enterRoom('north')).toBe(true)
    expect(game.value.house.room).toBe('north')
    expect(game.value.house.placed.some((p) => p.id === 'n_khantok')).toBe(true)
    // Moving away walks you back to the bedroom and the room locks again.
    game.value = { ...game.value, coins: 999 }
    setProvince('khon_kaen')
    expect(game.value.house.room).toBe('bedroom')
    expect(roomStatus(game.value, 'north').owned).toBe(false)
    expect(roomStatus(game.value, 'isan').owned).toBe(true)
    // The north room keeps its layout for later.
    expect(game.value.house.rooms.north?.placed.some((p) => p.id === 'n_khantok')).toBe(true)
  })

  it('gives a merit bonus only at temples of the home region', () => {
    const s = fresh()
    s.homeland.province = 'chiang_mai'
    s.places.current = 'doi_suthep'
    expect(homelandMeritBonus(s)).toBe(HOME_BONUS)
    s.places.current = 'wat_pho'
    expect(homelandMeritBonus(s)).toBe(1)
    s.places.current = null
    expect(homelandMeritBonus(s)).toBe(1)
    s.homeland.province = 'bangkok'
    s.places.current = 'wat'
    expect(homelandMeritBonus(s)).toBe(1) // the fictional home areas don't count
  })

  it('applies the bonus in addMerit', () => {
    game.value = fresh({ places: { bought: [], visited: ['doi_suthep'], current: 'doi_suthep' } })
    const plain = A.addMerit(100)
    game.value = fresh({ places: { bought: [], visited: ['doi_suthep'], current: 'doi_suthep' } })
    game.value.homeland.province = 'chiang_mai'
    const home = A.addMerit(100)
    expect(home).toBeGreaterThan(plain)
  })
})

describe('room unlocks', () => {
  it('opens base rooms by level and coins', () => {
    game.value = fresh({ coins: 1000 })
    expect(roomStatus(game.value, 'shrine').canUnlock).toBe(false)
    expect(unlockRoomNow('shrine')).toBe(false)
    game.value = fresh({ coins: 1000, merit: meritForLevel(4) })
    expect(roomStatus(game.value, 'shrine')).toMatchObject({ canUnlock: true, price: 250 })
    expect(unlockRoomNow('shrine')).toBe(true)
    expect(game.value.coins).toBe(750)
    expect(game.value.house.owned).toContain('shrine')
    game.value = fresh({ merit: meritForLevel(10), coins: 0 })
    expect(roomStatus(game.value, 'kitchen')).toMatchObject({ canUnlock: true, price: 0 })
  })

  it('opens a regional room free with the region rank, or buys it', () => {
    const s = fresh({ coins: 0 })
    complete(s, 'wat_huay_mongkol') // west's A temple
    game.value = s
    expect(roomStatus(game.value, 'west')).toMatchObject({ free: 'rank', canUnlock: true, price: 0 })
    expect(unlockRoomNow('west')).toBe(true)
    game.value = fresh({ merit: meritForLevel(12), coins: 2000 })
    expect(roomStatus(game.value, 'south')).toMatchObject({ canUnlock: true, price: 1500 })
  })

  it('maps every region to a regional room', () => {
    for (const r of REGIONS) {
      const room = ROOMS.find((x) => x.id === REGION_ROOM[r.id as Region])!
      expect(room.region).toBe(r.id)
      expect(room.unlock.rank?.region).toBe(r.id)
    }
  })
})

describe('saves', () => {
  it('fills in the homeland block for old saves and repairs junk', () => {
    const old = JSON.parse(JSON.stringify(defaultState())) as Record<string, unknown>
    delete old.homeland
    expect(migrate(old).homeland).toEqual({ province: null, moves: 0, temples: {}, claimed: [] })
    const h = normalizeHomeland({ province: 'nowhere', moves: -3, temples: { wat_pho: ['alms', 'alms', 'bogus'], nope: ['alms'] }, claimed: ['wat_pho', 'x'] })
    expect(h).toEqual({ province: null, moves: 0, temples: { wat_pho: ['alms'] }, claimed: ['wat_pho'] })
    expect(normalizeHomeland({ province: 'nan' }).province).toBe('nan')
    expect(PROVINCE_BY_ID.nan.region).toBe('north')
  })
})
