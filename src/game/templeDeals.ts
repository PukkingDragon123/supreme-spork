// Deals offered on the brief card before each temple mini-game: bundles at a
// discount, a free first round of the day and the วันพระ merit blessing.
// Pure rules (canBuy / apply) work on a plain state so they are testable; the
// `buyDeal` wrapper runs them through `mutate`.
//
// Daily limits live in `daily.counts['deal:<id>']` (reset with the day), so no
// new save fields are needed.

import type { GameState } from './state'
import { game, mutate } from './state'
import { ITEM_BY_ID } from './data/items'

export interface TempleDeal {
  id: string
  label: string
  /** Short savings note ("ลด 20%", "ฟรีวันละครั้ง"). */
  note: string
  /** Price in Boon Coins (0 = free). */
  price: number
  /** Items added to the inventory (in units, e.g. pellets or sticks). */
  items?: Record<string, number>
  /** Extra lottery rubs today. */
  lottery?: number
  /** Extra siamsi shakes today (used before paying coins). */
  siamsi?: number
  /** A merit buff (multiplier, minutes). */
  buff?: { mult: number; minutes: number }
  /** How often it can be bought. */
  limit: 'daily' | 'none'
  /** Only on Buddhist holy days. */
  wanpra?: boolean
  /** Reuses an existing daily flag instead of a deal counter. */
  flag?: 'freeFishFood'
  icon: string
}

const pack = (id: string) => ITEM_BY_ID[id]?.pack ?? 1

export const WANPRA_DEAL: TempleDeal = {
  id: 'wanpra',
  label: 'วันพระ บุญ x2',
  note: 'ฟรี 30 นาที วันพระเท่านั้น',
  price: 0,
  buff: { mult: 2, minutes: 30 },
  limit: 'daily',
  wanpra: true,
  icon: 'lotus',
}

export const TEMPLE_DEALS: Record<string, TempleDeal[]> = {
  alms: [
    { id: 'alms_set', label: 'ชุดใส่บาตรครบเซ็ต', note: 'ข้าว 3 แกง ไข่ กล้วย ลด 30%', price: 25, items: { rice: 3, curry: 1, egg: 1, banana: 1 }, limit: 'none', icon: 'bowl' },
    { id: 'alms_rice', label: 'ข้าวสวยทัพพีแรกฟรี', note: 'ฟรีวันละครั้ง', price: 0, items: { rice: 1 }, limit: 'daily', icon: 'rice' },
  ],
  koi: [
    { id: 'koi_free', label: 'อาหารปลาถุงแรกฟรี', note: 'ฟรีวันละถุง (12 เม็ด)', price: 0, items: { fish_food: 12 }, limit: 'daily', flag: 'freeFishFood', icon: 'fishfood' },
    { id: 'koi5', label: 'อาหารปลา 5 ถุง 20 คอยน์', note: 'ถูกกว่าปกติ 5 คอยน์', price: 20, items: { fish_food: 5 * pack('fish_food') }, limit: 'none', icon: 'fishfood' },
  ],
  koi_river: [{ id: 'bread3', label: 'ขนมปัง 3 ก้อน 12 คอยน์', note: 'ลด 20%', price: 12, items: { catfish_food: 3 * pack('catfish_food') }, limit: 'none', icon: 'bread' }],
  wish: [
    { id: 'incense_big', label: 'ธูปชุดใหญ่ลด 20%', note: 'ธูปเทียนแพ 5 ชุด', price: 12, items: { incense: 5 * pack('incense') }, limit: 'none', icon: 'incense' },
    { id: 'wish_flowers', label: 'ชุดดอกไม้ถวายพระ', note: 'บัว 2 + มาลัย 1 ลด 25%', price: 12, items: { lotus: 2, garland: 1 }, limit: 'none', icon: 'garland' },
  ],
  siamsi: [{ id: 'siamsi3', label: 'เสี่ยงเพิ่ม 3 ครั้ง 12 คอยน์', note: 'ปกติครั้งละ 5 คอยน์', price: 12, siamsi: 3, limit: 'none', icon: 'fortune' }],
  deity: [{ id: 'deity_set', label: 'ชุดไหว้เทพ ผลไม้+มาลัย+ธูป', note: 'ลด 25%', price: 16, items: { fruit: 1, garland: 1, incense: pack('incense') }, limit: 'none', icon: 'fruit' }],
  lottery: [{ id: 'powder2', label: 'แป้งขูด 2 ครั้ง 25 คอยน์', note: 'ปกติครั้งละ 15 คอยน์', price: 25, lottery: 2, limit: 'none', icon: 'powder' }],
  gold_leaf: [
    { id: 'leaf_free', label: 'ทองคำเปลวแผ่นแรกฟรี', note: 'ฟรีวันละแผ่น', price: 0, items: { gold_leaf: 1 }, limit: 'daily', icon: 'goldleaf' },
    { id: 'leaf3', label: 'ทองคำเปลว 3 แผ่น 25 คอยน์', note: 'ปกติ 30 คอยน์', price: 25, items: { gold_leaf: 3 }, limit: 'none', icon: 'goldleaf' },
  ],
  krathong: [{ id: 'kt2', label: 'กระทง 2 ใบ 25 คอยน์', note: 'ปกติ 30 คอยน์', price: 25, items: { krathong: 2 }, limit: 'none', icon: 'krathong' }],
  dog: [{ id: 'dog_set', label: 'ชุดอิ่มท้องน้องหมา', note: 'อาหารเม็ด 3 + ไก่ 1 ลด 20%', price: 18, items: { dog_food: 3 * pack('dog_food'), chicken: pack('chicken') }, limit: 'none', icon: 'dogfood' }],
}

// ---------------------------------------------------------------------------
// วันพระ: the 8th and 15th days of the waxing and waning moon.

const SYNODIC = 29.530588853
const NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14)

/** Day of the lunar month, 1..30. */
export function lunarDay(d: Date): number {
  const days = (d.getTime() - NEW_MOON_MS) / 86400000
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC
  return Math.floor(age) + 1
}

export function isWanPra(d: Date = new Date()): boolean {
  const n = lunarDay(d)
  return n === 8 || n === 15 || n === 23 || n >= 29
}

/** The next วันพระ on or after `d` (midday). */
export function nextWanPra(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  for (let i = 0; i < 20; i++) {
    if (isWanPra(x)) return x
    x.setDate(x.getDate() + 1)
  }
  return x
}

// ---------------------------------------------------------------------------

export type DealState = Pick<GameState, 'coins' | 'inventory' | 'daily' | 'buffs'>

/** Deals shown for an activity (วันพระ first when it applies). */
export function dealsFor(key: string, d: Date = new Date()): TempleDeal[] {
  const list = TEMPLE_DEALS[key] ?? []
  return isWanPra(d) ? [WANPRA_DEAL, ...list] : list
}

export function dealUsedToday(s: DealState, deal: TempleDeal): boolean {
  if (deal.flag === 'freeFishFood') return !!s.daily.freeFishFood
  return (s.daily.counts[`deal:${deal.id}`] ?? 0) > 0
}

export type DealBlock = 'used' | 'coins' | 'not_wanpra' | null

/** Why a deal can't be bought right now (null = it can). */
export function dealBlock(s: DealState, deal: TempleDeal, d: Date = new Date()): DealBlock {
  if (deal.wanpra && !isWanPra(d)) return 'not_wanpra'
  if (deal.limit === 'daily' && dealUsedToday(s, deal)) return 'used'
  if (s.coins < deal.price) return 'coins'
  return null
}

/** Apply a deal to a (draft) state. Returns false and changes nothing if blocked. */
export function applyDeal(s: DealState, deal: TempleDeal, d: Date = new Date()): boolean {
  if (dealBlock(s, deal, d)) return false
  s.coins -= deal.price
  for (const [k, v] of Object.entries(deal.items ?? {})) s.inventory[k] = (s.inventory[k] ?? 0) + v
  if (deal.lottery) s.daily.lotteryExtra += deal.lottery
  if (deal.siamsi) s.daily.counts.siamsi_credit = (s.daily.counts.siamsi_credit ?? 0) + deal.siamsi
  if (deal.buff) {
    const now = d.getTime()
    s.buffs = s.buffs.filter((b) => b.until > now && b.source !== `deal:${deal.id}`)
    s.buffs.push({ id: `deal:${deal.id}:${now}`, kind: 'merit', mult: deal.buff.mult, until: now + deal.buff.minutes * 60000, source: `deal:${deal.id}` })
  }
  if (deal.flag === 'freeFishFood') s.daily.freeFishFood = true
  else if (deal.limit === 'daily') s.daily.counts[`deal:${deal.id}`] = (s.daily.counts[`deal:${deal.id}`] ?? 0) + 1
  return true
}

/** Buy a deal for the player. */
export function buyDeal(deal: TempleDeal): boolean {
  let ok = false
  const now = new Date()
  if (dealBlock(game.value, deal, now)) return false
  mutate((d) => {
    ok = applyDeal(d, deal, now)
  })
  return ok
}

/** Use one prepaid siamsi shake if there is one. */
export function useSiamsiCredit(): boolean {
  if ((game.value.daily.counts.siamsi_credit ?? 0) <= 0) return false
  mutate((d) => {
    d.daily.counts.siamsi_credit = Math.max(0, (d.daily.counts.siamsi_credit ?? 0) - 1)
  })
  return true
}

/** Normal price of a deal's items bought one by one (for the "was" price). */
export function regularPrice(deal: TempleDeal): number {
  let p = 0
  for (const [k, v] of Object.entries(deal.items ?? {})) {
    const it = ITEM_BY_ID[k]
    if (it) p += it.price * Math.ceil(v / (it.pack ?? 1))
  }
  if (deal.lottery) p += deal.lottery * 15
  if (deal.siamsi) p += deal.siamsi * 5
  return p
}
