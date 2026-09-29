// ของสะสม logic: seasons, the daily stall stock rotation, the collection
// (owned counts, first-found day, "ใหม่!" badges) and set-completion rewards.
//
// Stock rotation: every day each stall rolls a seeded, rarity-weighted pick
// from the season-appropriate pool, so different stalls sell different
// things and a stall is stable for the whole day. A place's signature items
// (CollectibleDef.place) and a stall's own `collectibles` are always in
// stock. Quantities are limited per day.
//
// Other systems grant items with `grantCollectible(id)` /
// `grantCollectibles({ id: n })`.

import { game, mutate, type GameState } from './state'
import { COLLECTIBLES, COLLECTIBLE_BY_ID, RARITY_INFO, seriesList, type SeriesInfo } from './data/collectibles'
import type { CollectibleDef, CollectibleKind, Rarity, SeasonId } from './data/collectibleTypes'
import type { PlaceShop, StallKind } from './data/placeShops'
import { PLACE_BY_ID, type Region } from './data/places'
import { S_BANGKOK, S_CENTRAL, S_ISAN, S_NORTH, S_SOUTH } from './data/collectibles/regions'
import { S_MU, S_POP, S_STAMP } from './data/collectibles/pop'
import { S_CNY } from './data/collectibles/seasonal'
import { Rng } from '../engine/rng'
import { dayKey } from './time'
import { notify, toast } from './events'
import { spendCoins, track } from './actions'
import { emptyCollection, type CollectionState } from './collectionState'

// ---------------------------------------------------------------------------
// Seasons (Thai calendar flavour). Windows are [month, day] → [month, day],
// inclusive; a window may wrap over the new year.

type Window = [number, number, number, number]

export const SEASON_WINDOWS: Record<Exclude<SeasonId, 'always' | 'flood_event'>, Window> = {
  songkran: [4, 1, 4, 30],
  rainy: [6, 1, 10, 15],
  loy_krathong: [10, 25, 11, 30],
  cool: [12, 1, 2, 28],
  new_year: [12, 20, 1, 10],
  chinese_new_year: [1, 15, 2, 25],
}

export const SEASON_NAMES: Record<SeasonId, string> = {
  always: 'ทั้งปี',
  songkran: 'สงกรานต์',
  rainy: 'หน้าฝน',
  loy_krathong: 'ลอยกระทง',
  cool: 'หน้าหนาว',
  new_year: 'ปีใหม่',
  chinese_new_year: 'ตรุษจีน',
  flood_event: 'อีเวนต์น้ำท่วม',
}

/** Events that switch themselves on (e.g. the flood event) can add their season here. */
export const extraSeasons = new Set<SeasonId>()

function inWindow(d: Date, [m1, d1, m2, d2]: Window): boolean {
  const v = (d.getMonth() + 1) * 100 + d.getDate()
  const a = m1 * 100 + d1
  const b = m2 * 100 + d2
  return a <= b ? v >= a && v <= b : v >= a || v <= b
}

/** Seasons running on a date (several can overlap, e.g. ปีใหม่ inside หน้าหนาว). */
export function activeSeasons(date: Date = new Date()): SeasonId[] {
  const out: SeasonId[] = ['always']
  for (const [id, w] of Object.entries(SEASON_WINDOWS) as [SeasonId, Window][]) if (inWindow(date, w)) out.push(id)
  for (const s of extraSeasons) if (!out.includes(s)) out.push(s)
  return out
}

export function inSeason(c: CollectibleDef, date: Date = new Date()): boolean {
  return !c.season || c.season === 'always' || activeSeasons(date).includes(c.season)
}

/** Local date for a day key (noon, so time zones never shift the day). */
export function dateOfDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

// ---------------------------------------------------------------------------
// Daily stock

export const RARITY_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 26, rare: 10, epic: 3.5, legendary: 0.8 }
/** Units a stall has of each rolled item per day. */
export const RARITY_STOCK: Record<Rarity, number> = { common: 5, uncommon: 3, rare: 2, epic: 1, legendary: 1 }

/** Random collectibles per stall per day (on top of fixed items). */
export const ROTATION_COUNT: Record<StallKind, number> = {
  souvenir: 5,
  amulet: 4,
  rooster: 3,
  costume: 3,
  mart: 3,
  teahouse: 3,
  icecream: 2,
  snack: 2,
  noodle: 2,
}

const REGION_SERIES: Record<Region, string> = {
  bangkok: S_BANGKOK,
  central: S_CENTRAL,
  east: S_CENTRAL,
  west: S_CENTRAL,
  north: S_NORTH,
  northeast: S_ISAN,
  south: S_SOUTH,
}
const REGIONAL = new Set([S_BANGKOK, S_CENTRAL, S_NORTH, S_ISAN, S_SOUTH])

/** How much a stall kind likes an item (multiplies the rarity weight). */
function affinity(kind: StallKind, c: CollectibleDef): number {
  const k: CollectibleKind = c.kind
  switch (kind) {
    case 'amulet':
      return k === 'amulet' || k === 'relic' || k === 'charm' ? 4 : c.series === S_MU ? 3 : 0.4
    case 'souvenir':
      return ['keychain', 'magnet', 'postcard', 'snowglobe', 'pin', 'stamp'].includes(k) ? 1.6 : 1
    case 'costume':
      return k === 'pin' || k === 'charm' || k === 'keychain' ? 2 : 0.6
    case 'rooster':
      return c.art.motif === 'rooster' ? 6 : k === 'figure' ? 2 : 0.7
    case 'teahouse':
      return c.series === S_CNY || ['dragon', 'lion', 'guanyin', 'ingot', 'angpao'].includes(c.art.motif) ? 4 : k === 'figure' || k === 'relic' ? 1.3 : 0.7
    case 'mart':
      return c.series === S_POP ? 4 : k === 'toy' || k === 'keychain' ? 1.5 : 0.6
    default:
      return k === 'keychain' || k === 'magnet' || k === 'toy' || k === 'plush' ? 1.5 : 0.8
  }
}

export interface StockEntry {
  id: string
  /** Units for the whole day. */
  qty: number
  /** Always stocked here (signature item) rather than rolled today. */
  fixed: boolean
}

export interface RollOptions {
  shopId: string
  /** Day key (YYYY-MM-DD); also decides which seasons are on. */
  day: string
  /** Player rotation seed (GameState.collection.seed). */
  seed: string
  place?: string
  kind?: StallKind
  /** Extra always-stocked ids (PlaceShop.collectibles). */
  fixed?: string[]
  /** Random picks (defaults by kind). */
  count?: number
  /** Candidate pool (defaults to the whole catalogue). */
  pool?: CollectibleDef[]
}

/** Weighted pick without replacement. */
function weightedPick<T>(r: Rng, items: T[], weight: (t: T) => number, n: number): T[] {
  const left = items.map((t) => ({ t, w: Math.max(0, weight(t)) })).filter((x) => x.w > 0)
  const out: T[] = []
  while (out.length < n && left.length) {
    const total = left.reduce((a, x) => a + x.w, 0)
    let roll = r.float() * total
    let i = 0
    for (; i < left.length - 1; i++) {
      roll -= left[i].w
      if (roll < 0) break
    }
    out.push(left[i].t)
    left.splice(i, 1)
  }
  return out
}

/** Today's collectible stock of one stall (pure and deterministic). */
export function rollStock(o: RollOptions): StockEntry[] {
  const date = dateOfDay(o.day)
  const pool = (o.pool ?? COLLECTIBLES).filter((c) => inSeason(c, date))
  const kind = o.kind ?? 'snack'
  const fixedIds = new Set<string>(o.fixed ?? [])
  for (const c of pool) {
    if (c.shop === o.shopId) fixedIds.add(c.id)
    else if (!c.shop && o.place && c.place === o.place && c.source !== 'reward') fixedIds.add(c.id)
  }
  const fixed = [...fixedIds].map((id) => COLLECTIBLE_BY_ID[id] ?? pool.find((c) => c.id === id)).filter((c): c is CollectibleDef => !!c && inSeason(c, date))
  const homeSeries = o.place ? REGION_SERIES[PLACE_BY_ID[o.place]?.region as Region] : undefined
  const candidates = pool.filter((c) => !c.place && !c.shop && c.source !== 'reward' && !fixedIds.has(c.id))
  const r = new Rng(`stock:${o.seed}:${o.day}:${o.shopId}`)
  const count = o.count ?? ROTATION_COUNT[kind] ?? 2
  const picks = weightedPick(r, candidates, (c) => {
    let w = RARITY_WEIGHT[c.rarity] * affinity(kind, c)
    if (REGIONAL.has(c.series)) w *= homeSeries ? (c.series === homeSeries ? 3 : 0.5) : 0.8
    if (c.season && c.season !== 'always') w *= 2.5
    if (c.series === S_STAMP && kind !== 'souvenir') w *= 0.6
    return w
  }, count)
  return [
    ...fixed.map((c) => ({ id: c.id, qty: RARITY_STOCK[c.rarity] + (c.rarity === 'common' ? 3 : 1), fixed: true })),
    ...picks.map((c) => ({ id: c.id, qty: RARITY_STOCK[c.rarity], fixed: false })),
  ]
}

/** Today's stock of a stall, for the current player. */
export function shopStock(shop: PlaceShop, kind: StallKind, s: GameState = game.value, day = dayKey()): StockEntry[] {
  return rollStock({ shopId: shop.id, day, seed: s.collection.seed, place: shop.place, kind, fixed: shop.collectibles, count: shop.rotation })
}

const soldKey = (shopId: string, id: string) => `${shopId}|${id}`

/** Units bought today at a stall. */
export function soldToday(shopId: string, id: string, s: GameState = game.value, day = dayKey()): number {
  return s.collection.stock.day === day ? s.collection.stock.sold[soldKey(shopId, id)] ?? 0 : 0
}

export function stockLeft(shopId: string, e: StockEntry, s: GameState = game.value, day = dayKey()): number {
  return Math.max(0, e.qty - soldToday(shopId, e.id, s, day))
}

/** Milliseconds until the stock rotates (local midnight). */
export function msUntilRotation(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  return Math.max(0, next.getTime() - now.getTime())
}

/** "hh:mm" until the next rotation. */
export function rotationCountdown(now: Date = new Date()): string {
  const m = Math.ceil(msUntilRotation(now) / 60_000)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Collection

/** Mutating helper for use inside `mutate()` (stalls, market, quests…). */
export function addToCollection(d: GameState, id: string, n = 1, day = dayKey()) {
  if (!COLLECTIBLE_BY_ID[id] || n <= 0) return
  const c = d.collection ?? (d.collection = emptyCollection())
  const had = c.owned[id] ?? 0
  c.owned[id] = had + n
  if (!c.found[id]) c.found[id] = day
  if (!had && !c.fresh.includes(id)) c.fresh.push(id)
}

export function removeFromCollection(d: GameState, id: string, n = 1) {
  const c = d.collection
  const left = Math.max(0, (c.owned[id] ?? 0) - n)
  if (left) c.owned[id] = left
  else delete c.owned[id]
}

export function ownedCount(id: string, s: GameState = game.value): number {
  return s.collection.owned[id] ?? 0
}

export function isTradeable(id: string): boolean {
  return COLLECTIBLE_BY_ID[id]?.tradeable !== false
}

/**
 * Give collectibles (quest rewards, ranks, events…). Tracks 'collectible'
 * and toasts unless silent. Unknown ids are ignored. Returns true if any
 * item was granted.
 */
export function grantCollectibles(items: Record<string, number>, opts: { silent?: boolean } = {}): boolean {
  const list = Object.entries(items).filter(([id, n]) => COLLECTIBLE_BY_ID[id] && n > 0)
  if (!list.length) return false
  mutate((d) => {
    for (const [id, n] of list) addToCollection(d, id, n)
  })
  const total = list.reduce((a, [, n]) => a + n, 0)
  track('collectible', total)
  if (!opts.silent)
    for (const [id, n] of list) {
      const c = COLLECTIBLE_BY_ID[id]
      toast(`ได้ของสะสม: ${c.name}${n > 1 ? ` ×${n}` : ''} (${RARITY_INFO[c.rarity].name})`, 'gift')
    }
  return true
}

export function grantCollectible(id: string, n = 1, opts: { silent?: boolean } = {}): boolean {
  return grantCollectibles({ [id]: n }, opts)
}

/** Buy a collectible from a stall's stock. `price` may include a bargain. */
export function buyCollectible(shopId: string, entry: StockEntry, price?: number): boolean {
  const c = COLLECTIBLE_BY_ID[entry.id]
  if (!c) return false
  const day = dayKey()
  if (stockLeft(shopId, entry, game.value, day) <= 0) {
    toast('ชิ้นนี้หมดแล้ววันนี้ พรุ่งนี้มาใหม่นะ', 'shop', 'warn')
    return false
  }
  if (!spendCoins(price ?? c.value)) return false
  mutate((d) => {
    const st = d.collection.stock
    if (st.day !== day) d.collection.stock = { day, sold: {}, haggled: [] }
    const k = soldKey(shopId, entry.id)
    d.collection.stock.sold[k] = (d.collection.stock.sold[k] ?? 0) + 1
    addToCollection(d, entry.id, 1, day)
  })
  track('stall_buy')
  track('collectible')
  return true
}

/** Clear "ใหม่!" badges once the player has looked at the items. */
export function markSeen(ids: string[]) {
  const fresh = game.value.collection.fresh
  if (!ids.some((id) => fresh.includes(id))) return
  mutate((d) => {
    d.collection.fresh = d.collection.fresh.filter((id) => !ids.includes(id))
  })
}

export interface SeriesProgress {
  series: SeriesInfo
  owned: number
  total: number
  complete: boolean
  claimed: boolean
  fresh: number
}

export function seriesProgress(s: GameState = game.value): SeriesProgress[] {
  return seriesList().map((series) => {
    const owned = series.items.filter((c) => (s.collection.owned[c.id] ?? 0) > 0).length
    return {
      series,
      owned,
      total: series.items.length,
      complete: owned === series.items.length && series.items.length > 0,
      claimed: s.collection.sets.includes(series.id),
      fresh: series.items.filter((c) => s.collection.fresh.includes(c.id)).length,
    }
  })
}

/** Claim the coin prize for a completed series. Returns coins given. */
export function claimSetReward(seriesId: string): number {
  const p = seriesProgress().find((x) => x.series.id === seriesId)
  if (!p || !p.complete || p.claimed) return 0
  const coins = p.series.reward
  mutate((d) => {
    d.collection.sets.push(seriesId)
    d.coins += coins
  })
  notify({ kind: 'reward', title: `สะสมครบชุด “${seriesId}”!`, merit: 0, coins, note: `ครบทั้ง ${p.total} ชิ้น เก่งมาก สายสะสมตัวจริง` })
  return coins
}

export function collectionStats(s: GameState = game.value) {
  const byRarity: Record<Rarity, { owned: number; total: number }> = {
    common: { owned: 0, total: 0 },
    uncommon: { owned: 0, total: 0 },
    rare: { owned: 0, total: 0 },
    epic: { owned: 0, total: 0 },
    legendary: { owned: 0, total: 0 },
  }
  let owned = 0
  for (const c of COLLECTIBLES) {
    const has = (s.collection.owned[c.id] ?? 0) > 0
    byRarity[c.rarity].total++
    if (has) {
      byRarity[c.rarity].owned++
      owned++
    }
  }
  return { owned, total: COLLECTIBLES.length, byRarity, fresh: s.collection.fresh.length }
}

export type { CollectionState }
