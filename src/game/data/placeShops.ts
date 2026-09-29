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
  { id: 'mango_sticky', name: 'ข้าวเหนียวมะม่วงแปดริ้ว', desc: 'มะม่วงน้ำดอกไม้หวานฉ่ำ ราดกะทิ', icon: 'dessert', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'khanom_jak', name: 'ขนมจาก', desc: 'ขนมใบจากปิ้งหอม ๆ ของดีแปดริ้ว', icon: 'sticky', price: 15, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'pomelo', name: 'ส้มโอนครชัยศรี', desc: 'ส้มโอหวานอมเปรี้ยว เนื้อกุ้งสวย', icon: 'fruit', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'kalamae', name: 'กะละแม', desc: 'กะละแมเหนียวนุ่มหอมกะทิ ของฝากสระบุรี', icon: 'dessert', price: 15, buff: { kind: 'merit', mult: 1.1, minutes: 20 } },
  { id: 'sugarcane', name: 'อ้อยควั่น', desc: 'อ้อยหวานเย็น ถวายพระพิฆเนศก็ได้ กินเองก็ดี', icon: 'banana', price: 10, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
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
  pathom_chedi_khaolam: { id: 'pathom_chedi_khaolam', name: 'ข้าวหลามแม่ลำใย', npc: 'แม่ลำใย', greeting: 'ข้าวหลามร้อน ๆ ส้มโอหวาน ๆ จ้า', place: 'pathom_chedi', snacks: ['khao_lam', 'pomelo'] },
  pathom_chedi_fairgame: { id: 'pathom_chedi_fairgame', name: 'ซุ้มปาเป้างานวัด', npc: 'พี่ตุ๊ก', greeting: 'ปาโดนลูกโป่งรับตุ๊กตาเลยจ้า!', place: 'pathom_chedi', snacks: ['chayen'] },
  wat_sothon_eggs: { id: 'wat_sothon_eggs', name: 'ร้านไข่ต้มแก้บน', npc: 'ป้าจิ๋ม', greeting: 'ไข่ต้มถวายหลวงพ่อ แก้บนได้ครบ ๆ จ้า', place: 'wat_sothon', snacks: ['boiled_egg'] },
  wat_sothon_market: { id: 'wat_sothon_market', name: 'ตลาดริมน้ำหน้าวัด', npc: 'พี่นก', greeting: 'ข้าวเหนียวมะม่วงแปดริ้วของแท้จ้า', place: 'wat_sothon', snacks: ['mango_sticky', 'khanom_jak'] },
  wat_chulamanee_sugar: { id: 'wat_chulamanee_sugar', name: 'น้ำตาลมะพร้าวอัมพวา', npc: 'ยายปุ๋ย', greeting: 'น้ำตาลมะพร้าวแท้ ๆ จากสวนยายเอง', place: 'wat_chulamanee', snacks: ['coconut_sugar'] },
  wat_samarn_ratwish: { id: 'wat_samarn_ratwish', name: 'ซุ้มเหรียญกระซิบหนู', npc: 'น้องแพร', greeting: 'หยอดเหรียญแล้วกระซิบหนูประจำวันเกิดนะคะ', place: 'wat_samarn', snacks: ['sugarcane'] },
  wat_samarn_marigold: { id: 'wat_samarn_marigold', name: 'ร้านดาวเรืองถวายพระพิฆเนศ', npc: 'ป้าดวง', greeting: 'ดาวเรือง กล้วย อ้อย ของโปรดท่านครบจ้า', place: 'wat_samarn', snacks: ['sugarcane'] },
  wat_phutthabat_souvenir: { id: 'wat_phutthabat_souvenir', name: 'ของฝากพระพุทธบาท', npc: 'ลุงเสริม', greeting: 'กะละแมสระบุรี ผ้าทอไทยวน แวะก่อนจ้า', place: 'wat_phutthabat', snacks: ['kalamae'] },
  wat_mahathat_ayutthaya_rotisaimai: { id: 'wat_mahathat_ayutthaya_rotisaimai', name: 'โรตีสายไหมบังนิด', npc: 'บังนิด', greeting: 'โรตีสายไหมอยุธยาแท้ หวานละมุนครับ', place: 'wat_mahathat_ayutthaya', snacks: ['roti_saimai'] },
  wat_mahathat_ayutthaya_souvenir: { id: 'wat_mahathat_ayutthaya_souvenir', name: 'ร้านกางเกงช้าง', npc: 'พี่เก๋', greeting: 'กางเกงช้างใส่สบาย ถ่ายรูปกับวัดสวยมากจ้า', place: 'wat_mahathat_ayutthaya', snacks: ['chayen'] },
  wat_huay_mongkol_elephant: { id: 'wat_huay_mongkol_elephant', name: 'ร้านช้างถวายหลวงปู่ทวด', npc: 'ป้าศรี', greeting: 'ช้างไม้ พวงมาลัย อ้อยถวายจ้า', place: 'wat_huay_mongkol', snacks: ['sugarcane'] },
  wat_huay_mongkol_squid: { id: 'wat_huay_mongkol_squid', name: 'หมึกย่างหัวหิน', npc: 'ลุงชัย', greeting: 'หมึกรีดร้อน ๆ น้ำจิ้มแซ่บจ้า', place: 'wat_huay_mongkol', snacks: ['dried_squid'] },
  wat_yai_phitsanulok_kluaytak: { id: 'wat_yai_phitsanulok_kluaytak', name: 'กล้วยตากบางกระทุ่ม', npc: 'ยายแป้น', greeting: 'กล้วยตากน้ำผึ้งของดีพิษณุโลกจ้า', place: 'wat_yai_phitsanulok', snacks: ['kluay_tak'] },
  lampang_luang_chickenbowl: { id: 'lampang_luang_chickenbowl', name: 'ชามตราไก่ลำปาง', npc: 'พี่แดง', greeting: 'ชามไก่ของแท้เมืองลำปางเจ้า', place: 'lampang_luang', snacks: ['khao_soi'] },
  lampang_luang_khaotaen: { id: 'lampang_luang_khaotaen', name: 'ข้าวแต๋นน้ำแตงโม', npc: 'แม่อุ๊ย', greeting: 'ข้าวแต๋นกรอบ ๆ หวาน ๆ เจ้า', place: 'lampang_luang', snacks: ['khao_soi'] },
  wat_phumin_cloth: { id: 'wat_phumin_cloth', name: 'ผ้าทอน่าน', npc: 'แม่คำ', greeting: 'ผ้าซิ่นลายน้ำไหล ทอมือเองเจ้า', place: 'wat_phumin', snacks: ['chayen'] },
  wat_phumin_orange: { id: 'wat_phumin_orange', name: 'ส้มสีทองน่าน', npc: 'ลุงปั๋น', greeting: 'ส้มสีทองหวานฉ่ำเจ้า', place: 'wat_phumin', snacks: ['pomelo'] },
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
