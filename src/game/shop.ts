// v4 storefront rules: rarity for cosmetics, daily limited-time deals,
// coin bundles, the daily free gift and the featured / best-seller rows.
// Pure helpers take the state explicitly so they are easy to test.

import { game, mutate, type GameState } from './state'
import { dayKey } from './time'
import { Rng } from '../engine/rng'
import { OUTFITS, OUTFIT_BY_ID, inGeneralShop, type OutfitItem } from './data/outfits'
import { PETS, PET_BY_ID, RARITY, type PetDef, type PetRarity } from './data/pets'
import { ITEM_BY_ID } from './data/items'
import { levelFromMerit } from './economy'
import { addCoins, addItems, grantOutfit, grantPet, spendCoins } from './actions'
import { toast } from './events'

export type Rarity = PetRarity
export { RARITY }

// ---------------------------------------------------------------------------
// Rarity

/** Cosmetic rarity from its source and price (pets carry their own). */
export function outfitRarity(o: OutfitItem): Rarity {
  if (o.exclusive === 'pass_premium') return 'legend'
  if (o.exclusive === 'pack' || o.premium) return 'epic'
  if (o.exclusive === 'pass_free' || o.exclusive === 'event') return 'rare'
  if (o.slot === 'suit') return o.price >= 400 ? 'legend' : o.price >= 300 ? 'epic' : 'rare'
  if (o.price >= 200) return 'epic'
  if (o.price >= 100) return 'rare'
  return 'common'
}

export const isNewOutfit = (o: OutfitItem) => !!o.tags?.includes('new')

/** Hand-picked best sellers ("ขายดี" ribbon). */
export const BEST_SELLERS = new Set(['suit_trex', 'suit_cat', 'head_tomyum', 'back_thaitea', 'pygmy_hippo', 'orange_cat', 'suit_hippo', 'hand_chayen', 'neck_saimu', 'top_jersey'])

/** The featured row (แนะนำ), in order; unknown / owned ids are skipped by the UI. */
export const FEATURED = ['suit_hippo', 'pygmy_hippo', 'head_tomyum', 'back_blindbox', 'butter_bear', 'suit_butterbear', 'head_malai_bun', 'water_monitor', 'back_thaitea', 'capybara', 'head_mookata', 'hand_lotus_bouquet']

// ---------------------------------------------------------------------------
// Shop entries: one shape for outfits and pets

export type EntryKind = 'outfit' | 'pet'

export interface ShopEntry {
  kind: EntryKind
  id: string
  name: string
  desc: string
  price: number
  rarity: Rarity
  level: number
}

export function entryOf(kind: EntryKind, id: string): ShopEntry | null {
  if (kind === 'outfit') {
    const o = OUTFIT_BY_ID[id]
    if (!o) return null
    return { kind, id, name: o.name, desc: o.desc, price: o.price, rarity: outfitRarity(o), level: o.level ?? 1 }
  }
  const p = PET_BY_ID[id]
  if (!p) return null
  return { kind, id, name: p.name, desc: p.desc, price: p.price, rarity: p.rarity, level: 1 }
}

/** Resolve an id that may be an outfit or a pet. */
export function entryById(id: string): ShopEntry | null {
  return entryOf(OUTFIT_BY_ID[id] ? 'outfit' : 'pet', id)
}

export function owns(kind: EntryKind, id: string, s: GameState = game.value): boolean {
  return kind === 'outfit' ? s.outfits.includes(id) : s.pets.includes(id)
}

/** Buyable for coins in the general shop (not granted-only, not place-only). */
export function buyable(kind: EntryKind, id: string): boolean {
  if (kind === 'outfit') {
    const o = OUTFIT_BY_ID[id]
    return !!o && inGeneralShop(o) && o.price > 0
  }
  const p = PET_BY_ID[id]
  return !!p && !p.premium && !p.exclusive
}

// ---------------------------------------------------------------------------
// Limited-time deals (one set per day, the same for a player all day)

export interface Deal {
  id: string
  kind: EntryKind
  itemId: string
  /** Percent off, e.g. 50. */
  off: number
  price: number
  was: number
}

const DEAL_OFFS = [50, 40, 30]

/** Today's three deals: one pet and two cosmetics the player doesn't own yet. */
export function dailyDeals(s: GameState = game.value, day = dayKey()): Deal[] {
  const rng = new Rng(`deals:${day}:${s.player.friendCode}`)
  const lvl = levelFromMerit(s.merit).level
  const outfits = OUTFITS.filter((o) => inGeneralShop(o) && o.price >= 60 && (o.level ?? 1) <= lvl && !s.outfits.includes(o.id))
  const pets = PETS.filter((p) => buyable('pet', p.id) && !s.pets.includes(p.id))
  const pick: { kind: EntryKind; item: OutfitItem | PetDef }[] = []
  const petPick = rng.shuffle([...pets])[0]
  if (petPick) pick.push({ kind: 'pet', item: petPick })
  // Prefer a suit and something new for the cosmetics.
  const sh = rng.shuffle([...outfits])
  const suit = sh.find((o) => o.slot === 'suit')
  if (suit) pick.push({ kind: 'outfit', item: suit })
  for (const o of sh) {
    if (pick.length >= 3) break
    if (pick.some((p) => p.item.id === o.id)) continue
    pick.push({ kind: 'outfit', item: o })
  }
  return pick.slice(0, 3).map((p, i) => {
    const off = DEAL_OFFS[i % DEAL_OFFS.length]
    const was = p.item.price
    return { id: `deal:${day}:${p.item.id}`, kind: p.kind, itemId: p.item.id, off, was, price: Math.max(5, Math.round((was * (100 - off)) / 100 / 5) * 5) }
  })
}

/** Milliseconds until the deals (and the free gift) refresh at local midnight. */
export function msUntilReset(now = new Date()): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

export function fmtCountdown(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = t % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

export function dealBought(deal: Deal, s: GameState = game.value): boolean {
  return owns(deal.kind, deal.itemId, s) || (s.shop.dealDay === dayKey() && s.shop.deals.includes(deal.id))
}

/** Buy an item at its deal price. */
export function buyDeal(deal: Deal): boolean {
  if (dealBought(deal)) return false
  const e = entryOf(deal.kind, deal.itemId)
  if (!e) return false
  if (e.level > levelFromMerit(game.value.merit).level) {
    toast(`ปลดล็อกที่เลเวล ${e.level}`, 'lock', 'warn')
    return false
  }
  if (!spendCoins(deal.price)) return false
  mutate((d) => {
    const day = dayKey()
    if (d.shop.dealDay !== day) {
      d.shop.dealDay = day
      d.shop.deals = []
    }
    d.shop.deals.push(deal.id)
  })
  if (deal.kind === 'outfit') grantOutfit(deal.itemId, { equip: true })
  else grantPet(deal.itemId, { walk: true })
  return true
}

// ---------------------------------------------------------------------------
// Coin bundles (themed sets at a discount; you pay only for what you lack)

export interface Bundle {
  id: string
  name: string
  desc: string
  /** Outfit or pet ids. */
  items: string[]
  /** Percent off the sum of the missing items. */
  off: number
  theme: 'food' | 'selfie' | 'viral' | 'aunty' | 'muay'
}

export const BUNDLES: Bundle[] = [
  { id: 'bundle_viral', name: 'เซ็ตไวรัลฮิปโปแคระ', desc: 'น้องหมูดึ๋ง + หูฮิปโป + เสื้อสกรีน + สลิปเปอร์ฮิปโป', items: ['pygmy_hippo', 'head_hippo_ears', 'top_tee_hippo', 'shoes_hippo'], off: 30, theme: 'viral' },
  { id: 'bundle_food', name: 'เซ็ตสายกินซอฟต์พาวเวอร์', desc: 'หมวกต้มยำกุ้ง + ข้าวเหนียวมะม่วง + หมูกระทะ + กะเพราไข่ดาว', items: ['head_tomyum', 'head_mango_sticky', 'head_mookata', 'hand_krapao_box'], off: 30, theme: 'food' },
  { id: 'bundle_selfie', name: 'เซ็ตชุดไทยสไบเซลฟี่', desc: 'สไบเฉียงชมพู + ซิ่นไหม + มาลัยพันมวย + ไฟวงแหวน', items: ['top_sabai_pink', 'bot_sin_pink', 'head_malai_bun', 'hand_ringlight'], off: 25, theme: 'selfie' },
  { id: 'bundle_muay', name: 'เซ็ตนักมวยไทยใจบุญ', desc: 'กางเกงมวยดำทอง + มงคล + ประเจียด + ผ้าพันเท้า', items: ['bot_muay_gold', 'head_mongkol', 'neck_prajiad', 'shoes_wrap'], off: 25, theme: 'muay' },
  { id: 'bundle_aunty', name: 'เซ็ตป้าข้างบ้าน', desc: 'โรลม้วนผม + เสื้อคอกระเช้า + ผ้าขนหนูพาดคอ + ถุงกับข้าว', items: ['head_curlers', 'top_kradao', 'neck_towel', 'hand_grocery'], off: 30, theme: 'aunty' },
]

export function bundleMissing(b: Bundle, s: GameState = game.value): ShopEntry[] {
  return b.items.map((id) => entryById(id)).filter((e): e is ShopEntry => !!e && !owns(e.kind, e.id, s))
}

export function bundleFull(b: Bundle): number {
  return b.items.reduce((n, id) => n + (entryById(id)?.price ?? 0), 0)
}

/** Coins for the missing part of a bundle after the discount (0 = complete). */
export function bundlePrice(b: Bundle, s: GameState = game.value): number {
  const sum = bundleMissing(b, s).reduce((n, e) => n + e.price, 0)
  if (!sum) return 0
  return Math.max(5, Math.round((sum * (100 - b.off)) / 100 / 5) * 5)
}

export function buyBundle(id: string): boolean {
  const b = BUNDLES.find((x) => x.id === id)
  if (!b) return false
  const missing = bundleMissing(b)
  if (!missing.length) return false
  const lvl = levelFromMerit(game.value.merit).level
  const lockedE = missing.find((e) => e.level > lvl)
  if (lockedE) {
    toast(`${lockedE.name} ปลดล็อกที่เลเวล ${lockedE.level}`, 'lock', 'warn')
    return false
  }
  if (!spendCoins(bundlePrice(b))) return false
  for (const e of missing) {
    if (e.kind === 'outfit') grantOutfit(e.id)
    else grantPet(e.id, { walk: true })
  }
  return true
}

// ---------------------------------------------------------------------------
// Daily free gift (7-day cycle)

export interface Gift {
  coins?: number
  items?: Record<string, number>
  label: string
  icon: string
}

export const GIFT_CYCLE: Gift[] = [
  { coins: 15, label: '15 คอยน์', icon: 'coins' },
  { items: { incense: 6 }, label: 'ธูปเทียน x6', icon: 'incense' },
  { coins: 20, label: '20 คอยน์', icon: 'coins' },
  { items: { fish_food: 12, dog_food: 2 }, label: 'อาหารปลา+หมา', icon: 'fishfood' },
  { coins: 25, label: '25 คอยน์', icon: 'coinbag' },
  { items: { gold_leaf: 2, garland: 1 }, label: 'ทองคำเปลว x2', icon: 'goldleaf' },
  { coins: 50, label: '50 คอยน์', icon: 'chest' },
]

export function giftReady(s: GameState = game.value, day = dayKey()): boolean {
  return s.shop.giftDay !== day
}

export function nextGift(s: GameState = game.value): Gift {
  return GIFT_CYCLE[s.shop.gifts % GIFT_CYCLE.length]
}

/** Claim today's free gift. Returns what was given, or null if already claimed. */
export function claimGift(): Gift | null {
  if (!giftReady()) return null
  const g = nextGift()
  mutate((d) => {
    d.shop.giftDay = dayKey()
    d.shop.gifts += 1
  })
  if (g.coins) addCoins(g.coins)
  if (g.items) addItems(g.items)
  return g
}

/** Name of a gift / reward item for toasts. */
export function giftText(g: Gift): string {
  if (g.coins) return `${g.coins} บุญคอยน์`
  return Object.entries(g.items ?? {})
    .map(([id, n]) => `${ITEM_BY_ID[id]?.name ?? id} x${n}`)
    .join(' ')
}
