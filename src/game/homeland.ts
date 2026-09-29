// Home province (บ้านเกิด) and temple ranks (อันดับวัดประจำภาค): pure rules
// over GameState, no DOM and no mutations, so everything is unit tested.
// Mutating actions live in homelandActions.ts.

import type { GameState } from './state'
import { levelFromMerit } from './economy'
import { PLACE_BY_ID, type Place, type Region } from './data/places'
import { STAGES } from './data/prayers'
import { PROVINCE_BY_ID, type Province } from './data/provinces'
import { RANK_BY_PLACE, ranksOf, TEMPLE_DONE_KINDS, TIER_BY_ID, tierIndex, TIERS, type RankEntry, type TierId } from './data/ranks'
import { REGION_ROOM, ROOM_BY_ID, type RoomId } from './data/rooms'

// ---------------------------------------------------------------------------
// Home province

/** Merit multiplier while making merit at a temple in your home region. */
export const HOME_BONUS = 1.1
/** Boon Coins to move your house registration after the first (free) pick. */
export const MOVE_COST = 100

export function homeProvince(s: GameState): Province | null {
  const id = s.homeland?.province
  return id ? PROVINCE_BY_ID[id] ?? null : null
}

export function homeRegion(s: GameState): Region | null {
  return homeProvince(s)?.region ?? null
}

/** The regional room that is free for your home region. */
export function homeRoom(s: GameState): RoomId | null {
  const r = homeRegion(s)
  return r ? REGION_ROOM[r] : null
}

/** Rooms usable without buying them (for house.switchRoom's `extra`). */
export function freeRooms(s: GameState): RoomId[] {
  const r = homeRoom(s)
  return r ? [r] : []
}

/** Is this real place in the player's home region? (The fictional home areas never are.) */
export function inHomeRegion(s: GameState, placeId: string | null | undefined): boolean {
  if (!placeId) return false
  const p = PLACE_BY_ID[placeId]
  const r = homeRegion(s)
  return !!p && !p.home && !!r && p.region === r
}

/** Extra merit multiplier for where the player is standing right now. */
export function homelandMeritBonus(s: GameState): number {
  return inHomeRegion(s, s.places?.current) ? HOME_BONUS : 1
}

/** Cost of choosing `province` now (0 for the first pick or the same one). */
export function moveCost(s: GameState, province: string): number {
  const cur = s.homeland?.province
  if (!cur || cur === province) return 0
  return MOVE_COST
}

/** 'เชียงใหม่ · ภาคเหนือ · ของดี: ข้าวซอย' */
export function provinceFact(p: Province, regionName: string): string {
  return `${p.name} · ${regionName} · ของดี: ${p.good}`
}

// ---------------------------------------------------------------------------
// Temple completion (ทำบุญครบ)

export function starsOf(s: GameState): number {
  let n = 0
  for (const st of STAGES) n += s.prayer?.stars?.[st.id] ?? 0
  return n
}

export function templeKinds(s: GameState, placeId: string): string[] {
  return s.homeland?.temples?.[placeId] ?? []
}

/** Visited and made at least TEMPLE_DONE_KINDS kinds of merit there. */
export function templeDone(s: GameState, placeId: string): boolean {
  return s.places.visited.includes(placeId) && templeKinds(s, placeId).length >= TEMPLE_DONE_KINDS
}

// ---------------------------------------------------------------------------
// Rank quests

type QuestDoneFn = (s: GameState, questId: string) => boolean

/**
 * Default reader for finished NPC quests. The quest engine can register its
 * own with `setRankQuestChecker`; this one understands a `npcQuests.done`
 * list/record or a `npcQuests.quests[id].status === 'done'` map.
 */
function defaultQuestDone(s: GameState, id: string): boolean {
  const nq = (s as unknown as { npcQuests?: { done?: unknown; quests?: Record<string, { status?: string; done?: boolean }> } }).npcQuests
  if (!nq) return false
  const done = nq.done
  if (Array.isArray(done) && done.includes(id)) return true
  if (done && typeof done === 'object' && (done as Record<string, unknown>)[id]) return true
  const q = nq.quests?.[id]
  return !!q && (q.status === 'done' || q.status === 'claimed' || q.done === true)
}

let questDone: QuestDoneFn = defaultQuestDone

/** Hook for the NPC quest engine: tell the rank ladder which quests are finished. */
export function setRankQuestChecker(fn: QuestDoneFn | null) {
  questDone = fn ?? defaultQuestDone
}

export function rankQuestDone(s: GameState, questId: string): boolean {
  return questDone(s, questId)
}

// ---------------------------------------------------------------------------
// Rank locks

export type RankReqKind = 'level' | 'stars' | 'lower' | 'quest'

export interface RankReq {
  kind: RankReqKind
  text: string
  have: number
  need: number
  met: boolean
}

const priceFor = (stars: number) => (stars === 0 ? 0 : Math.round((80 + stars * 16) / 10) * 10)

/** Prayer stars a place needs: its own price or its tier's, whichever is higher. */
export function effectiveStars(p: Place): number {
  const r = RANK_BY_PLACE[p.id]
  return Math.max(p.stars, r ? TIER_BY_ID[r.tier].stars : 0)
}

/** Boon Coin price to skip the star requirement. */
export function effectivePrice(p: Place): number {
  return RANK_BY_PLACE[p.id] ? Math.max(p.coins, priceFor(effectiveStars(p))) : p.coins
}

/** Lower-rank temples of the same region (all must be completed first). */
export function lowerTemples(entry: RankEntry): RankEntry[] {
  const t = tierIndex(entry.tier)
  return ranksOf(entry.region).filter((r) => tierIndex(r.tier) < t)
}

/** Every requirement of a ranked temple with progress. Empty for unranked places. */
export function rankReqs(s: GameState, placeId: string): RankReq[] {
  const entry = RANK_BY_PLACE[placeId]
  const p = PLACE_BY_ID[placeId]
  if (!entry || !p) return []
  const tier = TIER_BY_ID[entry.tier]
  const out: RankReq[] = []
  const lv = levelFromMerit(s.merit).level
  if (tier.level > 1) out.push({ kind: 'level', text: `เลเวล ${tier.level}`, have: lv, need: tier.level, met: lv >= tier.level })
  const need = effectiveStars(p)
  if (need > 0) {
    const have = starsOf(s)
    const bought = s.places.bought.includes(placeId)
    out.push({ kind: 'stars', text: bought ? 'ดาวสวดมนต์ (ปลดด้วยคอยน์แล้ว)' : `ดาวสวดมนต์ ${need} ดวง`, have: bought ? need : have, need, met: bought || have >= need })
  }
  const lower = lowerTemples(entry)
  if (lower.length) {
    const done = lower.filter((r) => templeDone(s, r.place)).length
    out.push({ kind: 'lower', text: `ทำบุญครบวัดแรงก์ต่ำกว่าในภาค`, have: done, need: lower.length, met: done >= lower.length })
  }
  if (tier.quest && entry.quest) {
    const ok = rankQuestDone(s, entry.quest)
    out.push({ kind: 'quest', text: 'ภารกิจเลื่อนแรงก์', have: ok ? 1 : 0, need: 1, met: ok })
  }
  return out
}

export interface PlaceAccess {
  /** Can travel there now. */
  open: boolean
  /** Opened before (visited or bought): ranks never lock it again. */
  kept: boolean
  /** Blocked by level / lower temples / rank quest (coins can't skip these). */
  rankLocked: boolean
  reqs: RankReq[]
  starsNeed: number
  starsHave: number
  /** Only the stars are missing, so coins can open it. */
  canBuy: boolean
  price: number
}

/** Can the player travel to a real (non-home) place? Home areas use the area unlocks. */
export function placeAccess(s: GameState, placeId: string): PlaceAccess {
  const p = PLACE_BY_ID[placeId]
  const starsHave = starsOf(s)
  if (!p) return { open: false, kept: false, rankLocked: false, reqs: [], starsNeed: 0, starsHave, canBuy: false, price: 0 }
  const kept = s.places.visited.includes(placeId) || s.places.bought.includes(placeId)
  const reqs = rankReqs(s, placeId)
  const starsNeed = effectiveStars(p)
  const price = effectivePrice(p)
  if (kept) return { open: true, kept, rankLocked: false, reqs, starsNeed, starsHave, canBuy: false, price }
  const rankLocked = reqs.some((r) => r.kind !== 'stars' && !r.met)
  const starsOk = starsHave >= starsNeed
  return { open: !rankLocked && starsOk, kept, rankLocked, reqs, starsNeed, starsHave, canBuy: !rankLocked && !starsOk, price }
}

// ---------------------------------------------------------------------------
// Region progress

export interface RegionProgress {
  region: Region
  entries: RankEntry[]
  done: number
  total: number
  /** Highest tier of a completed temple. */
  best: TierId | null
  /** Next temple to work on (lowest-ranked not yet completed). */
  next: RankEntry | null
  /** Completion rewards waiting to be claimed. */
  claimable: number
}

export function regionProgress(s: GameState, region: Region): RegionProgress {
  const entries = ranksOf(region)
  let best: TierId | null = null
  let done = 0
  let claimable = 0
  for (const e of entries) {
    if (!templeDone(s, e.place)) continue
    done++
    if (!s.homeland.claimed.includes(e.place)) claimable++
    if (!best || tierIndex(e.tier) > tierIndex(best)) best = e.tier
  }
  const next = entries.find((e) => !templeDone(s, e.place)) ?? null
  return { region, entries, done, total: entries.length, best, next, claimable }
}

/** Has the player completed a temple of `tier` or higher in the region? */
export function regionTierReached(s: GameState, region: Region, tier: TierId): boolean {
  const best = regionProgress(s, region).best
  return !!best && tierIndex(best) >= tierIndex(tier)
}

// ---------------------------------------------------------------------------
// Rank rewards

export interface RankReward {
  coins: number
  merit: number
  furniture: string[]
  collectibles: string[]
}

export function rankReward(entry: RankEntry): RankReward {
  const t = TIER_BY_ID[entry.tier]
  return { coins: t.coins, merit: t.merit, furniture: entry.furniture ?? [], collectibles: entry.collectibles ?? [] }
}

export function canClaimRank(s: GameState, placeId: string): boolean {
  return !!RANK_BY_PLACE[placeId] && templeDone(s, placeId) && !s.homeland.claimed.includes(placeId)
}

/** Everything claimable right now across Thailand (for badges). */
export function claimableRanks(s: GameState): string[] {
  return Object.keys(RANK_BY_PLACE).filter((id) => canClaimRank(s, id))
}

// ---------------------------------------------------------------------------
// Rooms

export interface RoomReq {
  text: string
  met: boolean
}

export interface RoomStatus {
  id: RoomId
  /** Usable now. */
  owned: boolean
  /** Why it is free: the home region's room, or a reached region rank. */
  free: 'home' | 'rank' | null
  /** Can be unlocked right now (free claim or affordable purchase). */
  canUnlock: boolean
  /** Coins to pay when unlocking now (0 when free). */
  price: number
  reqs: RoomReq[]
}

export function roomStatus(s: GameState, id: RoomId): RoomStatus {
  const def = ROOM_BY_ID[id]
  const home = homeRoom(s) === id
  const owned = id === 'bedroom' || s.house.owned.includes(id) || home
  const u = def.unlock
  const lv = levelFromMerit(s.merit).level
  const reqs: RoomReq[] = []
  const rankOk = !!u.rank && regionTierReached(s, u.rank.region, u.rank.tier)
  if (u.rank) reqs.push({ text: `ได้แรงก์ ${u.rank.tier} ขึ้นไปใน${regionName(u.rank.region)} (ฟรี)`, met: rankOk })
  if (u.level) reqs.push({ text: `${u.rank ? 'หรือ ' : ''}เลเวล ${u.level}${u.coins ? ` + ${u.coins.toLocaleString('en-US')} คอยน์` : ' (ฟรี)'}`, met: lv >= u.level && s.coins >= (u.coins ?? 0) })
  const free: RoomStatus['free'] = home ? 'home' : rankOk ? 'rank' : null
  const buyable = !!u.level && lv >= u.level
  const price = free ? 0 : u.coins ?? 0
  const canUnlock = !owned && (!!free || (buyable && s.coins >= price))
  return { id, owned, free, canUnlock, price, reqs }
}

const REGION_NAME: Record<Region, string> = {
  bangkok: 'กรุงเทพฯ',
  central: 'ภาคกลาง',
  north: 'ภาคเหนือ',
  northeast: 'ภาคอีสาน',
  east: 'ภาคตะวันออก',
  west: 'ภาคตะวันตก',
  south: 'ภาคใต้',
}

export function regionName(r: Region): string {
  return REGION_NAME[r]
}

/** All tiers (for legends). */
export { TIERS }
