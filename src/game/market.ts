// ตลาดนัดสายบุญ – a player market. Other players' stalls are simulated
// deterministically (they change every hour); your own listings sell after a
// delay that depends on how fair the price is. A server backend can replace
// `browseListings` / the sale timer with real trades (see supabase/schema.sql).

import { game, mutate, type GameState } from './state'
import { MATERIAL_IDS, MATERIAL_INFO, type MaterialId } from './materials'
import { ITEMS, ITEM_BY_ID } from './data/items'
import { FURNITURE, FURNITURE_BY_ID } from './data/furniture'
import { OUTFITS, OUTFIT_BY_ID } from './data/outfits'
import { simulatedProfile } from '../services/social'
import { Rng } from '../engine/rng'
import { notify, toast } from './events'
import { COLLECTIBLES, COLLECTIBLE_BY_ID } from './data/collectibles'
import type { Rarity } from './data/collectibleTypes'
import { addToCollection, removeFromCollection } from './collectibles'
import { track } from './actions'

export type TradeKind = 'mat' | 'item' | 'furniture' | 'outfit' | 'collectible'

export interface Listing {
  id: string
  kind: TradeKind
  itemId: string
  qty: number
  /** Total price in Boon Coins for the whole lot. */
  price: number
  seller: { code: string; name: string }
}

export interface MyListing {
  id: string
  kind: TradeKind
  itemId: string
  qty: number
  price: number
  createdAt: number
  /** When a buyer takes it (simulated). */
  soldAt: number
}

export const MARKET_FEE = 0.05
export const MAX_LISTINGS = 6

export function tradeName(kind: TradeKind, id: string): string {
  if (kind === 'mat') return MATERIAL_INFO[id as MaterialId]?.name ?? id
  if (kind === 'item') return ITEM_BY_ID[id]?.name ?? id
  if (kind === 'furniture') return FURNITURE_BY_ID[id]?.name ?? id
  if (kind === 'collectible') return COLLECTIBLE_BY_ID[id]?.name ?? id
  return OUTFIT_BY_ID[id]?.name ?? id
}

/** A fair per-unit value for pricing suggestions. */
export function baseValue(kind: TradeKind, id: string): number {
  if (kind === 'mat') return id === 'gold' ? 20 : 9
  if (kind === 'item') return Math.max(3, ITEM_BY_ID[id]?.price ?? 5)
  if (kind === 'furniture') {
    const f = FURNITURE_BY_ID[id]
    if (!f) return 30
    return Math.round(Object.values(f.recipe).reduce((a, n) => a + (n ?? 0) * 10, 0) + (f.coins ?? 0) + 10)
  }
  if (kind === 'collectible') return Math.max(5, COLLECTIBLE_BY_ID[id]?.value ?? 25)
  return Math.max(20, OUTFIT_BY_ID[id]?.price ?? 50)
}

const SELLER_CODES = Array.from({ length: 24 }, (_, i) => `MK-${(i * 7919 + 1301).toString(36).toUpperCase()}`)

/** Other players' stalls right now (changes hourly; bought lots disappear). */
export function browseListings(s: GameState = game.value): Listing[] {
  const hour = Math.floor(Date.now() / 3_600_000)
  const r = new Rng(`market:${hour}`)
  const out: Listing[] = []
  const bought = new Set(s.market.bought)
  const add = (kind: TradeKind, itemId: string, qty: number, mult: number) => {
    const code = r.pick(SELLER_CODES)
    const id = `${hour}:${out.length}`
    if (bought.has(id)) return
    out.push({ id, kind, itemId, qty, price: Math.max(1, Math.round(baseValue(kind, itemId) * qty * mult)), seller: { code, name: simulatedProfile(code).name } })
  }
  for (let i = 0; i < 6; i++) add('mat', r.pick(MATERIAL_IDS), r.int(2, 8), r.range(0.8, 1.35))
  const items = ITEMS.filter((it) => (it.price ?? 0) > 0)
  for (let i = 0; i < 4; i++) add('item', r.pick(items).id, r.int(1, 4), r.range(0.75, 1.2))
  const furn = FURNITURE.filter((f) => !f.fixed)
  for (let i = 0; i < 4; i++) add('furniture', r.pick(furn).id, 1, r.range(0.9, 1.5))
  const outfits = OUTFITS.filter((o) => !o.premium && !o.exclusive && o.price > 0 && !(o as { shopOnly?: string }).shopOnly && !s.outfits.includes(o.id))
  for (let i = 0; i < 4 && outfits.length; i++) add('outfit', r.pick(outfits).id, 1, r.range(0.85, 1.25))
  // Collectors trade souvenirs too – rarer ones are scarcer and pricier, and
  // out-of-season items only turn up here.
  const pool = COLLECTIBLES.filter((c) => c.tradeable !== false)
  const MARKUP: Record<Rarity, [number, number]> = { common: [0.8, 1.2], uncommon: [0.9, 1.3], rare: [1, 1.45], epic: [1.1, 1.6], legendary: [1.2, 1.9] }
  for (let i = 0; i < 6 && pool.length; i++) {
    const total = pool.reduce((a, c) => a + MARKET_RARITY_WEIGHT[c.rarity], 0)
    let roll = r.float() * total
    const k = Math.max(0, pool.findIndex((x) => (roll -= MARKET_RARITY_WEIGHT[x.rarity]) < 0))
    const c = pool.splice(k, 1)[0]
    const [lo, hi] = MARKUP[c.rarity]
    add('collectible', c.id, c.rarity === 'common' && r.chance(0.3) ? 2 : 1, r.range(lo, hi) * (c.season && c.season !== 'always' ? 1.15 : 1))
  }
  return out
}

/** Collectors list rarer things more often than shops stock them. */
export const MARKET_RARITY_WEIGHT: Record<Rarity, number> = { common: 40, uncommon: 30, rare: 18, epic: 7, legendary: 2 }

/** How many of something you own and could sell. */
export function owned(kind: TradeKind, id: string, s: GameState = game.value): number {
  if (kind === 'mat') return s.materials[id as MaterialId] ?? 0
  if (kind === 'item') return s.inventory[id] ?? 0
  if (kind === 'furniture') return s.house.storage[id] ?? 0
  if (kind === 'collectible') return COLLECTIBLE_BY_ID[id]?.tradeable === false ? 0 : s.collection.owned[id] ?? 0
  return 0
}

function give(d: GameState, kind: TradeKind, id: string, qty: number) {
  if (kind === 'mat') d.materials[id as MaterialId] = (d.materials[id as MaterialId] ?? 0) + qty
  else if (kind === 'item') d.inventory[id] = (d.inventory[id] ?? 0) + qty
  else if (kind === 'furniture') d.house = { ...d.house, storage: { ...d.house.storage, [id]: (d.house.storage[id] ?? 0) + qty } }
  else if (kind === 'collectible') addToCollection(d, id, qty)
  else if (!d.outfits.includes(id)) d.outfits.push(id)
}

function take(d: GameState, kind: TradeKind, id: string, qty: number) {
  if (kind === 'mat') d.materials[id as MaterialId] = Math.max(0, (d.materials[id as MaterialId] ?? 0) - qty)
  else if (kind === 'item') d.inventory[id] = Math.max(0, (d.inventory[id] ?? 0) - qty)
  else if (kind === 'furniture') d.house = { ...d.house, storage: { ...d.house.storage, [id]: Math.max(0, (d.house.storage[id] ?? 0) - qty) } }
  else if (kind === 'collectible') removeFromCollection(d, id, qty)
}

export function buyListing(l: Listing): boolean {
  if (l.kind === 'outfit' && game.value.outfits.includes(l.itemId)) {
    toast('มีชุดนี้แล้วนะ', 'shirt', 'warn')
    return false
  }
  if (game.value.coins < l.price) {
    toast('บุญคอยน์ไม่พอ', 'coin', 'warn')
    return false
  }
  mutate((d) => {
    d.coins -= l.price
    give(d, l.kind, l.itemId, l.qty)
    d.market.bought.push(l.id)
    if (d.market.bought.length > 200) d.market.bought = d.market.bought.slice(-200)
  })
  track('trade')
  if (l.kind === 'collectible') track('collectible', l.qty)
  return true
}

/** Minutes until a listing sells: fair prices go in minutes, greedy ones take hours. */
export function saleDelayMin(kind: TradeKind, id: string, qty: number, price: number, seed: number): number {
  const ratio = price / Math.max(1, baseValue(kind, id) * qty)
  const r = new Rng(`sale:${seed}`)
  const base = r.range(2, 12)
  return Math.round(base * Math.pow(Math.max(0.3, ratio), 3) * (ratio > 1.8 ? 6 : 1))
}

export function listItem(kind: TradeKind, itemId: string, qty: number, price: number): boolean {
  const s = game.value
  if (s.market.mine.length >= MAX_LISTINGS) {
    toast(`วางขายได้สูงสุด ${MAX_LISTINGS} รายการ`, 'market', 'warn')
    return false
  }
  if (qty < 1 || owned(kind, itemId) < qty || price < 1) return false
  const now = Date.now()
  mutate((d) => {
    take(d, kind, itemId, qty)
    d.market.mine.push({ id: `m${now.toString(36)}`, kind, itemId, qty, price, createdAt: now, soldAt: now + saleDelayMin(kind, itemId, qty, price, now) * 60_000 })
  })
  return true
}

export function cancelListing(id: string) {
  const l = game.value.market.mine.find((x) => x.id === id)
  if (!l || l.soldAt <= Date.now()) return
  mutate((d) => {
    d.market.mine = d.market.mine.filter((x) => x.id !== id)
    give(d, l.kind, l.itemId, l.qty)
  })
}

/** Collect coins for everything that has sold. Returns coins received. */
export function collectSales(): number {
  const now = Date.now()
  const sold = game.value.market.mine.filter((l) => l.soldAt <= now)
  if (!sold.length) return 0
  const coins = sold.reduce((a, l) => a + Math.floor(l.price * (1 - MARKET_FEE)), 0)
  mutate((d) => {
    d.market.mine = d.market.mine.filter((l) => l.soldAt > now)
    d.coins += coins
    d.market.earned += coins
  })
  notify({ kind: 'reward', title: 'ขายของในตลาดได้แล้ว!', merit: 0, coins, note: sold.map((l) => `${tradeName(l.kind, l.itemId)} ×${l.qty}`).join(' · ') })
  track('trade', sold.length)
  return coins
}

export function soldCount(s: GameState = game.value): number {
  const now = Date.now()
  return s.market.mine.filter((l) => l.soldAt <= now).length
}
