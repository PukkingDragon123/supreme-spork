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
  { id: 'khanom_la', name: 'ขนมลา', desc: 'ขนมลาเส้นฝอยเหมือนลูกไม้ ของเดือนสิบเมืองคอน', icon: 'dessert', price: 20, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'cha_chak', name: 'ชาชัก', desc: 'ชาชักฟองนุ่มแบบร้านน้ำชาปักษ์ใต้', icon: 'tea', price: 15, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'khao_yam', name: 'ข้าวยำปักษ์ใต้', desc: 'ข้าวยำน้ำบูดูผักสมุนไพรเต็มจาน สุขภาพดีได้บุญ', icon: 'curry', price: 25, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'red_soda', name: 'น้ำแดงแก้บน', desc: 'น้ำแดงเย็น ๆ ใส่หลอด ถวายไอ้ไข่แล้วกินต่อได้', icon: 'redsoda', price: 10, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
  { id: 'mee_hoon', name: 'หมี่หุ้นแกงปู', desc: 'เส้นหมี่หุ้นกับแกงปูกะทิ อาหารเช้าคนภูเก็ต', icon: 'curry', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'baba_sweets', name: 'ขนมบ้าบ๋า', desc: 'ขนมเต้าส้อ อาโป้ง ของหวานเพอรานากัน', icon: 'dessert', price: 20, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'thai_massage', name: 'นวดเท้าวัดโพธิ์ 30 นาที', desc: 'หมอนวดมือหนัก เดินต่อได้อีกสิบวัด', icon: 'lotus', price: 40, buff: { kind: 'merit', mult: 1.25, minutes: 15 } },
  { id: 'herbal_balm', name: 'ยาหม่องสมุนไพร', desc: 'ทาขมับหอมเย็น หายเมื่อยหายง่วง', icon: 'vessel', price: 15, buff: { kind: 'coin', mult: 1.15, minutes: 20 } },
  { id: 'matoom', name: 'น้ำมะตูมเย็น', desc: 'หวานหอมชื่นใจ หลังเดินขึ้นบันได 344 ขั้น', icon: 'tea', price: 15, buff: { kind: 'animal', mult: 1.15, minutes: 20 } },
  { id: 'chrysanthemum', name: 'น้ำเก๊กฮวย', desc: 'เย็นชื่นใจ แก้ร้อนใน', icon: 'tea', price: 12, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
  { id: 'chestnut', name: 'เกาลัดคั่ว', desc: 'เกาลัดร้อน ๆ ย่านเยาวราช หอมหวาน', icon: 'fruit', price: 20, buff: { kind: 'merit', mult: 1.15, minutes: 15 } },
  { id: 'kanom_pang', name: 'ขนมปังสังขยา', desc: 'ปังนึ่งจิ้มสังขยาใบเตยเขียว ๆ', icon: 'dessert', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'sai_ua', name: 'ไส้อั่วแคบหมู', desc: 'ไส้อั่วสมุนไพรย่างหอม ๆ กับแคบหมูกรอบ', icon: 'curry', price: 25, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  { id: 'salapao', name: 'ซาลาเปาเจ', desc: 'ซาลาเปาไส้เผือกนุ่ม ๆ กับขนมจีบเจ', icon: 'dessert', price: 20, buff: { kind: 'merit', mult: 1.15, minutes: 20 } },
  { id: 'gai_yang', name: 'ไก่ย่างข้าวเหนียว', desc: 'ไก่ย่างหนังกรอบ ข้าวเหนียวในกระติ๊บ', icon: 'sticky', price: 30, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
]

export const SNACK_BY_ID: Record<string, Snack> = Object.fromEntries(SNACKS.map((s) => [s.id, s]))

/** First-person stall look (src/ui/stall). */
export type StallKind = 'icecream' | 'amulet' | 'noodle' | 'mart' | 'souvenir' | 'snack' | 'costume' | 'teahouse' | 'rooster'

export interface PlaceShop {
  id: string
  name: string
  npc: string
  greeting: string
  place?: string
  snacks: string[]
  /** The 7-บุญ convenience store also sells groceries / alms items. */
  mart?: boolean
  /** Stall look; derived from the id / place / snacks when absent (see game/stalls.ts). */
  kind?: StallKind
  /** Collectible ids always in stock here, on top of the daily rotation. */
  collectibles?: string[]
  /** How many random collectibles roll into today's stock (default depends on the kind). */
  rotation?: number
  /** Extra NPC lines for the reply choices (mixed in with the defaults). */
  lines?: { recommend?: string[]; haggle?: string[]; thanks?: string[]; buy?: string[] }
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
  nst_mahathat_amulet: { id: 'nst_mahathat_amulet', name: 'แผงพระเครื่องท่าแพ', npc: 'เซียนพระหนุ่ย', greeting: 'ส่องได้เลยครับ แท้ทุกองค์ ไม่แท้ยินดีคืนบุญ!', place: 'nst_mahathat', snacks: ['cha_chak'] },
  nst_mahathat_khanomla: { id: 'nst_mahathat_khanomla', name: 'ขนมลาแม่เอียด', npc: 'แม่เอียด', greeting: 'ขนมลากรอบ ๆ ข้าวยำหรอยจังฮู้ จ้า', place: 'nst_mahathat', snacks: ['khanom_la', 'khao_yam', 'cha_chak'] },
  ai_khai_rooster: { id: 'ai_khai_rooster', name: 'ร้านไก่แก้บน', npc: 'บังหมัด', greeting: 'ไก่ตัวเล็กตัวใหญ่ มีครบ ถูกหวยแล้วมาแก้บนน้า', place: 'ai_khai', snacks: ['red_soda'] },
  ai_khai_lottery: { id: 'ai_khai_lottery', name: 'แผงลอตเตอรี่เลขไอ้ไข่', npc: 'ป้าสมศรี', greeting: 'เลขเด็ดไอ้ไข่ งวดนี้มาแน่! (ถ้าไม่มาก็ทำบุญไป)', place: 'ai_khai', snacks: ['red_soda', 'chayen'] },
  wat_chalong_mee: { id: 'wat_chalong_mee', name: 'หมี่ฮกเกี้ยนเจ๊หงส์', npc: 'เจ๊หงส์', greeting: 'หมี่ผัดร้อน ๆ หมี่หุ้นแกงปูก็มีนะลูก', place: 'wat_chalong', snacks: ['hokkien', 'mee_hoon'] },
  wat_chalong_ohaew: { id: 'wat_chalong_ohaew', name: 'โอ้เอ๋วบ้าบ๋า', npc: 'อาม่าเกียว', greeting: 'โอ้เอ๋วเย็น ๆ ขนมบ้าบ๋าหวานน้อยจ้า', place: 'wat_chalong', snacks: ['oh_aew', 'baba_sweets'] },
  phuket_big_buddha_tile: { id: 'phuket_big_buddha_tile', name: 'จุดร่วมบุญกระเบื้องหินอ่อน', npc: 'พี่อาสา', greeting: 'เขียนชื่อบนกระเบื้อง ร่วมสร้างฐานพระใหญ่ได้บุญนะครับ', place: 'phuket_big_buddha', snacks: ['chayen', 'icecream_coconut'] },
  wat_phra_kaew_amulet: { id: 'wat_phra_kaew_amulet', name: 'ร้านของที่ระลึกวังหลวง', npc: 'พี่นก', greeting: 'พวงกุญแจช้าง ตุ๊กตุ๊กจิ๋ว ถูกกว่าหน้าห้างนะคะ', place: 'wat_phra_kaew', snacks: ['chayen'] },
  wat_pho_massage: { id: 'wat_pho_massage', name: 'ศาลานวดแผนไทยวัดโพธิ์', npc: 'ป้านวลหมอนวด', greeting: 'เมื่อยไหมลูก นวดเท้าสักหน่อย ป้ามือเบา (ไม่จริง)', place: 'wat_pho', snacks: ['thai_massage'] },
  wat_pho_balm: { id: 'wat_pho_balm', name: 'ร้านยาหม่องลุงเหม', npc: 'ลุงเหม', greeting: 'ยาหม่อง ลูกประคบ น้ำมันเหลือง สูตรโบราณครับ', place: 'wat_pho', snacks: ['herbal_balm'] },
  wat_arun_costume: { id: 'wat_arun_costume', name: 'ร้านเช่าชุดไทยริมเจ้าพระยา', npc: 'น้องมิ้นท์', greeting: 'ใส่ชุดไทยถ่ายรูปกับพระปรางค์ สวยปังแน่นอนค่ะ!', place: 'wat_arun', snacks: ['chayen', 'icecream_coconut'] },
  erawan_garland: { id: 'erawan_garland', name: 'แผงพวงมาลัยท้าวมหาพรหม', npc: 'เจ๊ติ๋ม', greeting: 'ชุดไหว้ธูป 9 ดอก มาลัย 4 พวง ครบชุดจ้า', place: 'erawan', snacks: ['sugarcane'] },
  erawan_dance: { id: 'erawan_dance', name: 'จองนางรำแก้บน', npc: 'ครูรำ', greeting: '2 คน 4 คน หรือ 8 คนคะ? ขอพรใหญ่ก็จ้างเยอะหน่อย', place: 'erawan', snacks: ['chrysanthemum'] },
  golden_mount_drinks: { id: 'golden_mount_drinks', name: 'น้ำเย็นกลางบันได', npc: 'ลุงชม', greeting: 'เหนื่อยไหมหลาน? อีกนิดเดียวถึงแล้ว (โกหก)', place: 'golden_mount', snacks: ['matoom', 'chrysanthemum'] },
  golden_mount_redcloth: { id: 'golden_mount_redcloth', name: 'ผ้าแดงห่มองค์พระเจดีย์', npc: 'พี่อาสา', greeting: 'ร่วมห่มผ้าแดงองค์เจดีย์ ได้บุญสูงเหมือนภูเขาเลยครับ', place: 'golden_mount', snacks: ['chrysanthemum'] },
  wat_traimit_streetfood: { id: 'wat_traimit_streetfood', name: 'สตรีทฟู้ดเยาวราช', npc: 'เฮียเล้ง', greeting: 'บะหมี่ เกาลัด ขนมปังสังขยา อร่อยทุกเจ้า!', place: 'wat_traimit', snacks: ['yaowarat', 'chestnut', 'kanom_pang'] },
  wat_traimit_gold: { id: 'wat_traimit_gold', name: 'ห้างทองเยาวราช', npc: 'เถ้าแก่ทอง', greeting: 'ทองคำเปลว ปิดองค์พระเสริมบารมี ลื้อเอากี่แผ่น?', place: 'wat_traimit', snacks: ['dumpling'] },
  doi_suthep_khaosoi: { id: 'doi_suthep_khaosoi', name: 'ข้าวซอยตีนดอย', npc: 'แม่คำ', greeting: 'กิ๋นข้าวซอยก่อนขึ้นบันได 306 ขั้นเน้อ', place: 'doi_suthep', snacks: ['khao_soi', 'sai_ua'] },
  doi_suthep_hilltribe: { id: 'doi_suthep_hilltribe', name: 'ร้านผ้าปักชาวดอย', npc: 'น้องหมี่', greeting: 'ย่ามปักมือ หมวกไหมพรม ใส่แล้วน่ารักมากเลยค่ะ', place: 'doi_suthep', snacks: ['chayen'] },
  wat_rong_khun_artshop: { id: 'wat_rong_khun_artshop', name: 'ร้านศิลปะวัดร่องขุ่น', npc: 'พี่อาร์ต', greeting: 'โปสการ์ด เสื้อ ของที่ระลึกสีขาววิบวับครับ', place: 'wat_rong_khun', snacks: ['icecream_coconut'] },
  wat_huay_pla_kang_teahouse: { id: 'wat_huay_pla_kang_teahouse', name: 'โรงน้ำชากวนอิม', npc: 'อาแปะหลิว', greeting: 'ดื่มชาร้อน ๆ ใจเย็น ๆ กินเจอิ่มบุญ', place: 'wat_huay_pla_kang', snacks: ['salapao', 'dumpling'] },
  kham_chanod_offerings: { id: 'kham_chanod_offerings', name: 'ของถวายพ่อปู่', npc: 'ป้าบุญมี', greeting: 'บายศรี มาลัยดาวเรือง น้ำแดง ถวายพญานาคจ้า', place: 'kham_chanod', snacks: ['red_soda', 'som_tam'] },
  that_phanom_somtam: { id: 'that_phanom_somtam', name: 'ตำแซ่บริมโขง', npc: 'แม่หนูพร', greeting: 'ตำไทยตำลาว ไก่ย่างข้าวเหนียว แซ่บหลายเด้อ', place: 'that_phanom', snacks: ['som_tam', 'gai_yang'] },
  ya_mo_padmee: { id: 'ya_mo_padmee', name: 'ผัดหมี่โคราชตลาดคืน', npc: 'ยายเบิ้ม', greeting: 'ผัดหมี่โคราชจ้า เผ็ดน้อยเผ็ดมากบอกยายเด้อ', place: 'ya_mo', snacks: ['pad_mee', 'som_tam'] },
}

/** Add stalls from other systems (hub markets, temple fairs…); same schema. */
export function registerPlaceShops(shops: PlaceShop[]) {
  for (const sh of shops) PLACE_SHOPS[sh.id] = sh
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
