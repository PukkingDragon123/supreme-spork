// First-person stalls (ร้านค้าประจำสถานที่): which look a stall has, who
// the shopkeeper is (look, dialect, personality) and the purchase rules
// for everything a stall sells. The scene and UI live in src/ui/stall/.

import type { AvatarLook } from '../art/avatar'
import { game, mutate, level } from './state'
import { PLACE_BY_ID } from './data/places'
import { OUTFIT_BY_ID } from './data/outfits'
import { ITEM_BY_ID } from './data/items'
import type { PlaceShop, Snack, StallKind } from './data/placeShops'
import { addBuff, buyOutfitAnywhere, spendCoins, track } from './actions'
import { Rng, hashString } from '../engine/rng'
import { dayKey } from './time'

export type { StallKind }

export const STALL_KINDS: StallKind[] = ['icecream', 'amulet', 'noodle', 'mart', 'souvenir', 'snack', 'costume', 'teahouse', 'rooster']

/** Stalls whose id alone would be misleading. */
const KIND_OVERRIDE: Record<string, StallKind> = {
  wat_phra_kaew_amulet: 'souvenir',
  wat_mahathat_ayutthaya_souvenir: 'costume',
  lampang_luang_chickenbowl: 'rooster',
  wat_traimit_gold: 'amulet',
  wat_chalong_ohaew: 'icecream',
  erawan_dance: 'costume',
}

const KIND_WORDS: [StallKind, RegExp][] = [
  ['mart', /(^|_)mart$|7boon/],
  ['icecream', /icecream|ice_cream|ohaew|shavedice|gelato/],
  ['rooster', /rooster|gamecock|chickenbowl/],
  ['teahouse', /teahouse|tea_house|dimsum|chinese|tea$/],
  ['amulet', /amulet|gold$|takrut|talisman/],
  ['costume', /costume|cloth|hilltribe|dance|pants|silk|weave|rental|dress/],
  ['noodle', /noodle|mee|khaosoi|padmee|streetfood|somtam|kuay|boat_noodle/],
  ['souvenir', /souvenir|artshop|elephant|tile|redcloth|ratwish|fairgame|lottery|garland|marigold|offering|balm|massage|gift|kiosk/],
  ['snack', /snack|food|khaolam|egg|market|kluaytak|rotisaimai|khanomla|drink|orange|sugar|squid|khaotaen|fruit/],
]

const NOODLE_SNACKS = new Set(['khao_soi', 'pad_mee', 'hokkien', 'yaowarat', 'mee_hoon', 'som_tam'])

/** The stall look for a shop: explicit `kind`, then id keywords, then its snacks. */
export function stallKindFor(shop: PlaceShop): StallKind {
  if (shop.kind) return shop.kind
  if (shop.mart) return 'mart'
  if (KIND_OVERRIDE[shop.id]) return KIND_OVERRIDE[shop.id]
  const slug = shop.place && shop.id.startsWith(`${shop.place}_`) ? shop.id.slice(shop.place.length + 1) : shop.id
  for (const [k, re] of KIND_WORDS) if (re.test(slug)) return k
  const first = shop.snacks[0]
  if (first === 'icecream_coconut' || first === 'oh_aew') return 'icecream'
  if (shop.snacks.some((s) => NOODLE_SNACKS.has(s))) return 'noodle'
  if (shop.snacks.some((s) => s === 'dumpling' || s === 'salapao' || s === 'chrysanthemum')) return 'teahouse'
  return 'snack'
}

// ---------------------------------------------------------------------------
// The shopkeeper

export type Dialect = 'central' | 'north' | 'isan' | 'south' | 'chinese' | 'polite' | 'teen'

export interface StallNpc {
  name: string
  gender: 'm' | 'f'
  elder: boolean
  dialect: Dialect
  look: AvatarLook
}

const MALE = /^(ลุง|บัง|เฮีย|อาแปะ|เถ้าแก่|เซียน|พ่อ|ตา|น้าชาย|อาเสี่ย|พี่ชาย)/
const FEMALE = /^(ป้า|แม่|ยาย|เจ๊|อาม่า|น้าสาว|พี่สาว|คุณนาย)/
const ELDER = /^(ป้า|ลุง|ยาย|ตา|อาแปะ|อาม่า|แม่อุ๊ย|เถ้าแก่|พ่อ)/

const OUTFIT: Record<StallKind, { top: string[]; head: (string | null)[]; neck?: (string | null)[] }> = {
  mart: { top: ['top_convenience'], head: [null] },
  icecream: { top: ['top_vendor', 'top_stripe', 'top_polo'], head: ['head_sunhat', 'head_vendorband', 'head_cap'] },
  amulet: { top: ['top_raj', 'top_white', 'top_polo'], head: ['head_glasses', 'head_nerdglasses'], neck: ['neck_amulet_big', 'neck_amulet'] },
  noodle: { top: ['top_chef', 'top_vendor', 'top_tee_white'], head: ['head_chefhat', 'head_vendorband', null] },
  souvenir: { top: ['top_hawaii_elephant', 'top_elephant', 'top_retro_floral', 'top_hawaii'], head: ['head_cap', 'head_sunhat', null] },
  snack: { top: ['top_vendor', 'top_pakaoma', 'top_floral', 'top_mohom'], head: ['head_vendorband', null, 'head_sunhat'] },
  costume: { top: ['top_thai_rental', 'top_sabai', 'top_chitralada', 'top_thaisilk'], head: ['head_jasmine', 'head_flowercrown', 'head_frangipani'] },
  teahouse: { top: ['top_qipao', 'top_baba', 'top_mohom'], head: [null, 'head_glasses'] },
  rooster: { top: ['top_aikhai', 'top_hawaii', 'top_vendor'], head: ['head_gamecock', 'head_cap', null], neck: ['neck_goldchain', null] },
}

const HAIR_F = ['hair_bun', 'hair_long', 'hair_ponytail', 'hair_bob', 'hair_braid', 'hair_wavy', 'hair_curly']
const HAIR_M = ['hair_short', 'hair_twoblock', 'hair_buzz', 'hair_curtain']
const HAIR_ELDER_F = ['hair_bun', 'hair_curly', 'hair_bob']
const HAIR_ELDER_M = ['hair_buzz', 'hair_short']

function has(id: string | null | undefined): id is string {
  return !!id && !!OUTFIT_BY_ID[id]
}

/** Deterministic shopkeeper for a stall. */
export function stallNpc(shop: PlaceShop, kind: StallKind = stallKindFor(shop)): StallNpc {
  const name = shop.npc
  const r = new Rng(`npc:${shop.id}`)
  const g = shop.greeting
  let gender: 'm' | 'f' = MALE.test(name) ? 'm' : FEMALE.test(name) ? 'f' : /ครับ|ผม/.test(g) ? 'm' : /ค่ะ|คะ|ดิฉัน/.test(g) ? 'f' : r.chance(0.6) ? 'f' : 'm'
  if (name === 'แม่อุ๊ย') gender = 'f'
  const elder = ELDER.test(name)
  const region = shop.place ? PLACE_BY_ID[shop.place]?.region : undefined
  const dialect: Dialect =
    kind === 'mart'
      ? 'polite'
      : /^(เฮีย|เจ๊|อาแปะ|อาม่า|เถ้าแก่|อาเสี่ย)/.test(name) || kind === 'teahouse'
        ? 'chinese'
        : region === 'north'
          ? 'north'
          : region === 'northeast'
            ? 'isan'
            : region === 'south'
              ? 'south'
              : /^น้อง/.test(name)
                ? 'teen'
                : 'central'
  const o = OUTFIT[kind]
  const topPick = [...o.top]
  if (kind === 'teahouse') topPick.sort((a) => (gender === 'm' ? (a === 'top_baba' ? -1 : 1) : a === 'top_qipao' ? -1 : 1))
  const top = topPick.find((t, i) => has(t) && (i === 0 || r.chance(0.5))) ?? topPick.find(has) ?? 'top_white'
  const head = o.head[r.int(0, o.head.length - 1)]
  const neck = o.neck ? o.neck[r.int(0, o.neck.length - 1)] : null
  const hairs = elder ? (gender === 'f' ? HAIR_ELDER_F : HAIR_ELDER_M) : gender === 'f' ? HAIR_F : HAIR_M
  const look: AvatarLook = {
    gender,
    skin: region === 'south' || region === 'northeast' ? r.int(1, 3) : r.int(0, 2),
    face: r.int(0, 2),
    hairColor: elder ? 6 : r.chance(0.8) ? r.int(0, 1) : r.int(2, 3),
    hair: r.pick(hairs.filter((h) => OUTFIT_BY_ID[h])) ?? 'hair_short',
    top,
    bottom: gender === 'f' ? 'bot_khaki' : 'bot_khaki',
    head: has(head) ? head : null,
    neck: has(neck) ? neck : null,
    hand: null,
    shoes: null,
    back: null,
    suit: null,
  }
  return { name, gender, elder, dialect, look }
}

// ---------------------------------------------------------------------------
// Purchases (every stall purchase tracks 'stall_buy')

export function buySnack(sn: Snack, price = sn.price): boolean {
  if (!spendCoins(price)) return false
  addBuff(sn.buff.kind, sn.buff.mult, sn.buff.minutes, `snack:${sn.id}`)
  track('stall_buy')
  return true
}

export function buyStallOutfit(id: string): boolean {
  if (!buyOutfitAnywhere(id)) return false
  track('stall_buy')
  return true
}

export function outfitLocked(id: string): number | null {
  const o = OUTFIT_BY_ID[id]
  return o && (o.level ?? 1) > level.value.level ? (o.level ?? 1) : null
}

/** Mart groceries (alms food, ingredients). `price` is per purchase. */
export function buyGrocery(id: string, price?: number): boolean {
  const it = ITEM_BY_ID[id]
  if (!it) return false
  if (!spendCoins(price ?? it.price)) return false
  mutate((d) => {
    d.inventory[id] = (d.inventory[id] ?? 0) + (it.pack ?? 1)
  })
  track('stall_buy')
  return true
}

// ---------------------------------------------------------------------------
// Bargaining: one try per stall per day. The outcome is seeded so reloading
// doesn't help. Returns the discount fraction (0 = no luck).

export function haggleOutcome(shopId: string, day: string, seed: string): number {
  const h = hashString(`haggle:${seed}:${day}:${shopId}`) % 100
  return h < 12 ? 0.2 : h < 42 ? 0.1 : 0
}

export function haggledToday(shopId: string): boolean {
  const st = game.value.collection.stock
  return st.day === dayKey() && st.haggled.includes(shopId)
}

export function tryHaggle(shopId: string): { discount: number; again: boolean } {
  const day = dayKey()
  const again = haggledToday(shopId)
  const discount = again ? 0 : haggleOutcome(shopId, day, game.value.collection.seed)
  if (!again)
    mutate((d) => {
      if (d.collection.stock.day !== day) d.collection.stock = { day, sold: {}, haggled: [] }
      d.collection.stock.haggled.push(shopId)
    })
  return { discount, again }
}
