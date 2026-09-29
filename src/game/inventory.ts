// The bag (กระเป๋า): one list of everything the player owns – merit items,
// ingredients, dishes, materials, outfits, pets, stored furniture and
// collectibles – with sorting, filtering and search. Pure functions over the
// state so the view stays thin and the rules are testable.

import type { GameState } from './state'
import { ITEM_BY_ID, type Item } from './data/items'
import { OUTFIT_BY_ID, type Slot } from './data/outfits'
import { PET_BY_ID, type PetRarity } from './data/pets'
import { FURNITURE_BY_ID } from './data/furniture'
import { MATERIAL_IDS, MATERIAL_INFO, type MaterialId } from './materials'
import { outfitRarity } from './shop'

export type InvKind = 'item' | 'ingredient' | 'dish' | 'material' | 'outfit' | 'pet' | 'furniture' | 'collectible'

export const INV_KINDS: InvKind[] = ['item', 'ingredient', 'dish', 'material', 'outfit', 'pet', 'furniture', 'collectible']

export const INV_KIND_INFO: Record<InvKind, { label: string; icon: string; order: number }> = {
  item: { label: 'ของทำบุญ', icon: 'bowl', order: 0 },
  ingredient: { label: 'วัตถุดิบ', icon: 'pan', order: 1 },
  dish: { label: 'อาหาร', icon: 'rice', order: 2 },
  material: { label: 'วัสดุช่าง', icon: 'hammer', order: 3 },
  outfit: { label: 'ชุด', icon: 'shirt', order: 4 },
  pet: { label: 'สัตว์เลี้ยง', icon: 'paw', order: 5 },
  furniture: { label: 'ของแต่งบ้าน', icon: 'home', order: 6 },
  collectible: { label: 'ของสะสม', icon: 'star', order: 7 },
}

export type InvRarity = PetRarity

export const RARITY_ORDER: Record<InvRarity, number> = { common: 0, rare: 1, epic: 2, legend: 3 }

export interface InvEntry {
  /** `${kind}:${id}` – also the key in `state.shop.got`. */
  key: string
  kind: InvKind
  id: string
  name: string
  desc: string
  count: number
  rarity: InvRarity
  /** First time it was seen owned (ms; 0/1 = before tracking). */
  got: number
  /** Short sub-label (slot, category, perk...). */
  sub?: string
  /** Worn / walking with you right now. */
  active?: boolean
}

// ---------------------------------------------------------------------------
// Collectibles hook: the collectibles system can register how to read and
// describe its items; by default `state.collection.owned` is read if present
// (either an id -> count record or an id list).

export interface CollectibleInfo {
  name: string
  desc?: string
  /** 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' (or the 4-tier names). */
  rarity?: string
}

export interface CollectibleSource {
  /** Owned collectibles as id -> count. */
  owned?: (s: GameState) => Record<string, number>
  info?: (id: string) => CollectibleInfo | null
  /** Data URL of a small icon (optional; the bag falls back to a star icon). */
  icon?: (id: string) => string | null
  /** Open the collection book at an item. */
  open?: (id: string) => void
}

export const inventoryHooks: { collectibles: CollectibleSource } = { collectibles: {} }

/** Wire the collectibles system into the bag (call once at startup). */
export function registerCollectibles(src: CollectibleSource) {
  inventoryHooks.collectibles = { ...inventoryHooks.collectibles, ...src }
}

function defaultOwnedCollectibles(s: GameState): Record<string, number> {
  const raw = (s as unknown as { collection?: { owned?: unknown } }).collection?.owned
  if (!raw) return {}
  if (Array.isArray(raw)) {
    const out: Record<string, number> = {}
    for (const id of raw) if (typeof id === 'string') out[id] = (out[id] ?? 0) + 1
    return out
  }
  if (typeof raw === 'object') {
    const out: Record<string, number> = {}
    for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = typeof v === 'number' ? v : typeof v === 'object' && v && typeof (v as { count?: unknown }).count === 'number' ? (v as { count: number }).count : v ? 1 : 0
      if (n > 0) out[id] = n
    }
    return out
  }
  return {}
}

export function mapRarity(r: string | undefined): InvRarity {
  switch (r) {
    case 'legend':
    case 'legendary':
      return 'legend'
    case 'epic':
      return 'epic'
    case 'rare':
    case 'uncommon':
      return 'rare'
    default:
      return 'common'
  }
}

// ---------------------------------------------------------------------------
// Building the list

function itemKind(it: Item): InvKind {
  return it.category === 'ingredient' ? 'ingredient' : it.category === 'dish' ? 'dish' : 'item'
}

function itemRarity(it: Item): InvRarity {
  if (it.gold) return 'epic'
  if (it.category === 'dish' || it.price >= 30) return 'rare'
  return 'common'
}

const SLOT_LABEL: Record<Slot | 'shoes', string> = {
  hair: 'ทรงผม',
  top: 'เสื้อ',
  bottom: 'ท่อนล่าง',
  shoes: 'รองเท้า',
  head: 'หมวก/ศีรษะ',
  neck: 'คอ/ตัว',
  hand: 'ถือในมือ',
  back: 'สะพายหลัง',
  suit: 'ชุดมาสคอต',
}

const ITEM_CAT: Record<string, string> = { alms: 'ของใส่บาตร', offering: 'ของถวาย', animal: 'อาหารสัตว์', special: 'ของพิเศษ', ingredient: 'วัตถุดิบ', dish: 'อาหารทำเอง' }

/** Every owned thing, one entry per kind + id. */
export function collectInventory(s: GameState): InvEntry[] {
  const got = s.shop?.got ?? {}
  const out: InvEntry[] = []
  const add = (e: Omit<InvEntry, 'key' | 'got'>) => {
    const key = `${e.kind === 'ingredient' || e.kind === 'dish' ? 'item' : e.kind}:${e.id}`
    out.push({ ...e, key, got: got[key] ?? 0 })
  }
  for (const [id, n] of Object.entries(s.inventory)) {
    const it = ITEM_BY_ID[id]
    if (!it || n <= 0) continue
    add({ kind: itemKind(it), id, name: it.name, desc: it.desc, count: n, rarity: itemRarity(it), sub: ITEM_CAT[it.category] })
  }
  if (s.daily.lotteryExtra > 0) {
    const it = ITEM_BY_ID.lottery_ticket
    if (it) add({ kind: 'item', id: 'lottery_ticket', name: it.name, desc: it.desc, count: s.daily.lotteryExtra, rarity: 'common', sub: ITEM_CAT.special })
  }
  for (const m of MATERIAL_IDS) {
    const n = s.materials[m as MaterialId] ?? 0
    if (n <= 0) continue
    add({ kind: 'material', id: m, name: MATERIAL_INFO[m].name, desc: MATERIAL_INFO[m].desc, count: n, rarity: m === 'gold' ? 'rare' : 'common', sub: 'วัสดุช่างไม้' })
  }
  const look = s.player.look as unknown as Record<string, string | null | undefined>
  for (const id of s.outfits) {
    const o = OUTFIT_BY_ID[id]
    if (!o) continue
    add({ kind: 'outfit', id, name: o.name, desc: o.desc, count: 1, rarity: outfitRarity(o), sub: SLOT_LABEL[o.slot], active: look[o.slot] === id })
  }
  for (const id of s.pets) {
    const p = PET_BY_ID[id]
    if (!p) continue
    add({ kind: 'pet', id, name: p.name, desc: p.desc, count: 1, rarity: p.rarity, sub: 'สัตว์เลี้ยงคู่ใจ', active: s.pet === id })
  }
  for (const [id, n] of Object.entries(s.house?.storage ?? {})) {
    const f = FURNITURE_BY_ID[id]
    if (!f || n <= 0) continue
    add({ kind: 'furniture', id, name: f.name, desc: f.desc, count: n, rarity: (f.level ?? 1) >= 8 ? 'epic' : (f.level ?? 1) >= 4 || (f.recipe.gold ?? 0) > 0 ? 'rare' : 'common', sub: 'ในกล่องเก็บของ' })
  }
  const src = inventoryHooks.collectibles
  const cols = src.owned ? src.owned(s) : defaultOwnedCollectibles(s)
  for (const [id, n] of Object.entries(cols)) {
    if (n <= 0) continue
    const info = src.info?.(id) ?? null
    add({ kind: 'collectible', id, name: info?.name ?? id, desc: info?.desc ?? 'ของสะสมหายาก', count: n, rarity: mapRarity(info?.rarity), sub: 'ของสะสม' })
  }
  return out
}

// ---------------------------------------------------------------------------
// Sort / filter / search

export type InvSort = 'newest' | 'name' | 'rarity' | 'count' | 'type'

export const INV_SORTS: { id: InvSort; label: string }[] = [
  { id: 'newest', label: 'ใหม่สุด' },
  { id: 'rarity', label: 'หายากสุด' },
  { id: 'name', label: 'ชื่อ ก-ฮ' },
  { id: 'count', label: 'จำนวน' },
  { id: 'type', label: 'ประเภท' },
]

const byType = (a: InvEntry, b: InvEntry) => INV_KIND_INFO[a.kind].order - INV_KIND_INFO[b.kind].order
const byName = (a: InvEntry, b: InvEntry) => a.name.localeCompare(b.name, 'th')

export function sortInventory(list: InvEntry[], mode: InvSort): InvEntry[] {
  const l = [...list]
  switch (mode) {
    case 'newest':
      return l.sort((a, b) => b.got - a.got || byType(a, b) || byName(a, b))
    case 'name':
      return l.sort((a, b) => byName(a, b) || byType(a, b))
    case 'rarity':
      return l.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || byType(a, b) || byName(a, b))
    case 'count':
      return l.sort((a, b) => b.count - a.count || byName(a, b))
    case 'type':
      return l.sort((a, b) => byType(a, b) || RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || byName(a, b))
  }
}

/** Normalise Thai/Latin text for a forgiving search (case, spaces, tone marks). */
export function normSearch(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFC')
    .replace(/[่-์]/g, '')
    .replace(/\s+/g, '')
}

export function filterInventory(list: InvEntry[], kinds: ReadonlySet<InvKind> | null, query: string): InvEntry[] {
  const q = normSearch(query)
  return list.filter((e) => {
    if (kinds && kinds.size && !kinds.has(e.kind)) return false
    if (!q) return true
    return normSearch(e.name).includes(q) || normSearch(e.id).includes(q) || normSearch(e.sub ?? '').includes(q) || normSearch(INV_KIND_INFO[e.kind].label).includes(q)
  })
}

export function countByKind(list: InvEntry[]): Record<InvKind, number> {
  const out = Object.fromEntries(INV_KINDS.map((k) => [k, 0])) as Record<InvKind, number>
  for (const e of list) out[e.kind] += 1
  return out
}

// ---------------------------------------------------------------------------
// "Newest" bookkeeping

/**
 * `got` map with every currently owned key stamped. Keys never seen before
 * get `now`; on the very first run (empty map) everything gets 1 so old
 * saves don't all look brand new. Returns null when nothing changed.
 */
export function stampOwned(s: GameState, now: number): Record<string, number> | null {
  const got = s.shop?.got ?? {}
  const first = Object.keys(got).length === 0
  let changed = false
  const next = { ...got }
  for (const e of collectInventory(s)) {
    if (next[e.key]) continue
    next[e.key] = first ? 1 : now
    changed = true
  }
  return changed ? next : null
}
