// Location shops (NPC stalls on the place maps: hotspot `shop:<id>`).
// Each sells snacks (small timed blessings), place-exclusive cosmetics
// (OutfitItem.shopOnly = place id) and, for the 7-บุญ mart, groceries.

import { PLACE_BY_ID } from './places'

export interface Snack {
  id: string
  name: string
  desc: string
  icon: string
  price: number
  /** Timed blessing granted when eaten. */
  buff: { kind: 'merit' | 'coin' | 'animal'; mult: number; minutes: number }
}

export const SNACKS: Snack[] = [
  { id: 'icecream_coconut', name: 'ไอศกรีมกะทิสด', desc: 'ไอติมกะทิในกะลามะพร้าว โรยถั่ว หวานเย็นชื่นใจ', icon: 'dessert', price: 20, buff: { kind: 'merit', mult: 1.15, minutes: 10 } },
  { id: 'chayen', name: 'ชาเย็นแก้วโต', desc: 'ชาไทยสีส้มหวานมัน ดื่มแล้วมีแรงเดินต่อ', icon: 'tea', price: 15, buff: { kind: 'coin', mult: 1.15, minutes: 10 } },
  { id: 'moo_ping', name: 'หมูปิ้งข้าวเหนียว', desc: 'หมูปิ้งหอม ๆ กับข้าวเหนียวร้อน อิ่มท้องพร้อมทำบุญ', icon: 'sticky', price: 20, buff: { kind: 'merit', mult: 1.1, minutes: 15 } },
  { id: 'khao_lam', name: 'ข้าวหลาม', desc: 'ข้าวเหนียวมูนในกระบอกไม้ไผ่ หอมกะทิ', icon: 'sticky', price: 25, buff: { kind: 'merit', mult: 1.2, minutes: 10 } },
  { id: 'roti_saimai', name: 'โรตีสายไหม', desc: 'ขนมขึ้นชื่ออยุธยา แป้งบางห่อสายไหมสีหวาน', icon: 'dessert', price: 25, buff: { kind: 'coin', mult: 1.2, minutes: 10 } },
  { id: 'kluay_tak', name: 'กล้วยตาก', desc: 'กล้วยตากพิษณุโลก หวานหนึบ ของฝากคลาสสิก', icon: 'banana', price: 15, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'khao_soi', name: 'ข้าวซอย', desc: 'ข้าวซอยไก่น้ำแกงเข้มข้น ของดีเมืองเหนือ', icon: 'curry', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'som_tam', name: 'ส้มตำไก่ย่าง', desc: 'แซ่บนัว ๆ แบบอีสาน กินแล้วสดชื่น', icon: 'curry', price: 25, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  { id: 'pad_mee', name: 'ผัดหมี่โคราช', desc: 'หมี่ผัดรสเด็ด ของดีเมืองย่าโม', icon: 'curry', price: 25, buff: { kind: 'merit', mult: 1.15, minutes: 15 } },
  { id: 'dumpling', name: 'ติ่มซำกับชาจีน', desc: 'เสี่ยวหลงเปาร้อน ๆ กับชาอูหลง', icon: 'tea', price: 25, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'hokkien', name: 'หมี่ฮกเกี้ยน', desc: 'หมี่เหลืองผัดสไตล์ภูเก็ต หอมกระทะ', icon: 'curry', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'oh_aew', name: 'โอ้เอ๋ว', desc: 'ขนมหวานเย็นภูเก็ต วุ้นใส ๆ กับน้ำแดง', icon: 'redsoda', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'yaowarat', name: 'บะหมี่เยาวราช', desc: 'บะหมี่เกี๊ยวหมูแดงร้อน ๆ ย่านไชน่าทาวน์', icon: 'curry', price: 30, buff: { kind: 'coin', mult: 1.25, minutes: 10 } },
  { id: 'boiled_egg', name: 'ไข่ต้มแก้บน', desc: 'ไข่ต้มถวายหลวงพ่อโสธร แล้วนำกลับมากินเป็นสิริมงคล', icon: 'boiledegg', price: 10, buff: { kind: 'merit', mult: 1.1, minutes: 20 } },
  { id: 'coconut_sugar', name: 'น้ำตาลมะพร้าวแท้', desc: 'หวานหอมจากสวนแม่กลอง', icon: 'dessert', price: 15, buff: { kind: 'animal', mult: 1.15, minutes: 20 } },
  { id: 'dried_squid', name: 'ปลาหมึกย่าง', desc: 'หมึกแห้งย่างริมทะเลหัวหิน จิ้มน้ำจิ้มซีฟู้ด', icon: 'curry', price: 25, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
]

export const SNACK_BY_ID: Record<string, Snack> = Object.fromEntries(SNACKS.map((s) => [s.id, s]))

export interface PlaceShop {
  id: string
  name: string
  npc: string
  greeting: string
  place?: string
  snacks: string[]
  /** The 7-บุญ convenience store also sells groceries / alms items. */
  mart?: boolean
}

/** Hand-authored stalls (the rest fall back to `genericShop`). */
export const PLACE_SHOPS: Record<string, PlaceShop> = {
  mart: { id: 'mart', name: '7-บุญ ร้านสะดวกบุญ', npc: 'พนักงาน', greeting: 'สวัสดีค่ะ ยินดีต้อนรับค่ะ~ รับถุงไหมคะ', snacks: ['chayen', 'moo_ping'], mart: true },
  wat_phra_kaew_icecream: { id: 'wat_phra_kaew_icecream', name: 'ไอติมกะทิป้าแต๋ว', npc: 'ป้าแต๋ว', greeting: 'ร้อนไหมลูก ไอติมกะทิสดชื่นใจจ้า', place: 'wat_phra_kaew', snacks: ['icecream_coconut', 'chayen'] },
}

/** Best-effort stall for any `shop:<placeId>_<slug>` hotspot. */
export function shopFor(id: string): PlaceShop {
  const known = PLACE_SHOPS[id]
  if (known) return known
  const place = Object.keys(PLACE_BY_ID)
    .filter((p) => id === p || id.startsWith(`${p}_`))
    .sort((a, b) => b.length - a.length)[0]
  const p = place ? PLACE_BY_ID[place] : null
  const slug = place ? id.slice(place.length + 1) : id
  const snackFor: Record<string, string[]> = {
    icecream: ['icecream_coconut'],
    food: ['moo_ping', 'chayen'],
    snack: ['moo_ping', 'chayen'],
  }
  return {
    id,
    name: p ? `ร้านค้าที่${p.name}` : 'ร้านค้า',
    npc: 'แม่ค้า',
    greeting: 'เชิญจ้า ของดีประจำที่นี่ มีจำกัดนะ',
    place: place ?? undefined,
    snacks: snackFor[slug] ?? ['chayen', 'moo_ping'],
  }
}
