// Beach stalls (hotspots `shop:<beachId>_<slug>` on the beach maps) and the
// snacks only sold by the sea. Registered into PLACE_SHOPS / SNACKS on import
// (the beach maps group imports this module), so the regular place-shop
// window opens them. Beach cosmetics (OutfitItem.shopOnly = beach id) show up
// in every stall of that beach.

import { registerPlaceShops, registerSnacks, type PlaceShop, type Snack } from './placeShops'

export const BEACH_SNACKS: Snack[] = [
  { id: 'bc_coconut', name: 'มะพร้าวน้ำหอมเย็นเจี๊ยบ', desc: 'ผ่าสด ๆ เสียบหลอด ดื่มน้ำแล้วขูดเนื้ออ่อน ๆ กินต่อ ชื่นใจกลางแดด', icon: 'ing_coconut', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'bc_somtam_poo', name: 'ส้มตำปูม้า', desc: 'ตำแซ่บใส่ปูม้าสด นั่งกินบนเสื่อริมทะเล ลมพัดเย็น ๆ', icon: 'curry', price: 30, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  { id: 'bc_crab', name: 'ปูม้านึ่งจิ้มซีฟู้ด', desc: 'ปูม้าตัวโตนึ่งร้อน ๆ เนื้อหวาน จิ้มน้ำจิ้มซีฟู้ดสูตรเด็ดบางแสน', icon: 'curry', price: 40, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'bc_massage', name: 'นวดใต้ร่มไม้ริมหาด', desc: 'นอนบนเสื่อใต้ร่มไม้ ฟังเสียงคลื่น หมอนวดมือหนักจนหลับไปครึ่งชั่วโมง', icon: 'lotus', price: 45, buff: { kind: 'merit', mult: 1.25, minutes: 15 } },
  { id: 'bc_shake', name: 'น้ำมะม่วงปั่น', desc: 'มะม่วงสุกปั่นเย็นเฉียบ เสิร์ฟในแก้วใสกับหลอดสีรุ้ง', icon: 'tea', price: 25, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'bc_corn', name: 'ข้าวโพดปิ้งเนยเค็ม', desc: 'ข้าวโพดหวานปิ้งถ่าน ทาเนยเกลือหอมฟุ้งไปทั้งหาด', icon: 'banana', price: 20, buff: { kind: 'animal', mult: 1.15, minutes: 20 } },
]

const shop = (id: string, place: string, name: string, npc: string, greeting: string, snacks: string[], o: Partial<PlaceShop> = {}): PlaceShop => ({ id, name, npc, greeting, place, snacks, ...o })

export const BEACH_SHOPS: PlaceShop[] = [
  // หาดบางแสน
  shop('beach_bangsaen_seafood', 'beach_bangsaen', 'ปูม้านึ่งป้าแจ๋ว', 'ป้าแจ๋ว', 'ปูม้าตัวโต ๆ นึ่งใหม่ ๆ จ้า นั่งเก้าอี้ผ้าใบกินริมทะเลเลยลูก', ['bc_crab', 'bc_somtam_poo', 'bc_coconut'], {
    kind: 'noodle',
    lines: { recommend: ['ปูม้าตัวนี้ป้าคัดเอง เนื้อแน่นเต็มกระดอง', 'สั่งส้มตำปูม้าคู่กันสิ ฟิน'], haggle: ['ลดให้สิบ แต่ห้ามบอกใครนะ', 'ปูแพงนะลูก ป้าขาดทุนแล้ว!'], thanks: ['อิ่ม ๆ นะลูก ระวังลิงแย่งด้วย'] },
  }),
  shop('beach_bangsaen_ring', 'beach_bangsaen', 'ห่วงยางเช่าพี่ตู่', 'พี่ตู่', 'ห่วงยางขาวลอยน้ำวงละยี่สิบ ของที่ระลึกบางแสนก็มีครับ', ['bc_coconut'], {
    kind: 'souvenir',
    lines: { recommend: ['ห่วงยางวงนี้ลอยเก่งที่สุดในหาด', 'พวงกุญแจห่วงยางซื้อไปฝากเพื่อนสิ'], thanks: ['เล่นน้ำในเขตธงนะครับ'] },
  }),
  // หาดหัวหิน
  shop('beach_huahin_squid', 'beach_huahin', 'หมึกย่างลุงชัยหัวหิน', 'ลุงชัย', 'หมึกย่างไม้ใหญ่ ๆ ร้อน ๆ ข้าวโพดปิ้งก็มีครับ', ['dried_squid', 'bc_corn'], {
    kind: 'snack',
    lines: { recommend: ['หมึกไข่ไม้นี้เด็ดสุด', 'จิ้มน้ำจิ้มซีฟู้ดลุงนะ เผ็ดนิดเดียว (โกหก)'], thanks: ['ระวังนกนางนวลแย่งนะหลาน'] },
  }),
  shop('beach_huahin_icecream', 'beach_huahin', 'ไอติมรถเข็นกริ๊ง ๆ', 'ลุงหวาน', 'กริ๊ง ๆ ๆ ไอติมกะทิสดมาแล้วจ้า น้ำมะม่วงปั่นก็มี', ['icecream_coconut', 'bc_shake'], {
    kind: 'icecream',
    lines: { recommend: ['ไอติมกะทิใส่ขนมปังคือที่สุด', 'แว่นกันแดดสีพระอาทิตย์ตกก็มีนะ ใส่แล้วหล่อ'], thanks: ['กริ๊ง ๆ ขอบใจจ้า'] },
  }),
  // หาดสมิหลา
  shop('beach_samila_coconut', 'beach_samila', 'มะพร้าวใต้ต้นสนก๊ะเยาะ', 'ก๊ะเยาะ', 'มะพร้าวเย็น ๆ ส้มตำปูม้าหรอยจังฮู้ นั่งใต้ต้นสนเลยจ้า', ['bc_coconut', 'bc_somtam_poo'], {
    kind: 'snack',
    lines: { recommend: ['มะพร้าวลูกนี้หวานแรง', 'กินแล้วไปขอพรนางเงือกทองต่อนะ'], haggle: ['ลดให้นิดนึงนะหลาน', 'ก๊ะให้ถูกแล้วจ้า'], thanks: ['หรอยจังฮู้ ขอบใจจ้า'] },
  }),
  shop('beach_samila_massage', 'beach_samila', 'นวดใต้ต้นสนป้านี', 'ป้านี', 'นวดเท้านวดตัวใต้ต้นสน ลมเย็น ๆ หลับสบายแน่นอนจ้า', ['bc_massage', 'bc_coconut'], {
    kind: 'teahouse',
    lines: { recommend: ['นวดหนึ่งชั่วโมงเดินเก็บขยะได้ทั้งหาด', 'ป้ามือเบา (มือไม่เบา)'], thanks: ['เบาตัวแล้วใช่ไหมลูก'] },
  }),
  // หาดบ่อผุด สมุย
  shop('beach_samui_coconut', 'beach_samui', 'มะพร้าวสมุยพี่หนุ่ม', 'พี่หนุ่ม', 'มะพร้าวเกาะสมุยแท้ ๆ ลูกเล็กแต่หวานเจี๊ยบ ปั่นก็ได้ครับ', ['bc_coconut', 'bc_shake', 'icecream_coconut'], {
    kind: 'snack',
    lines: { recommend: ['สมุยคือเกาะมะพร้าว ของมันต้องลอง', 'ไอติมกะทิในกะลาลูกนี้ปังมาก'], thanks: ['ไปกราบพระใหญ่แล้วแวะมาอีกนะครับ'] },
  }),
  shop('beach_samui_sarong', 'beach_samui', 'ผ้าปาเต๊ะป้าจันทร์', 'ป้าจันทร์', 'ผ้าปาเต๊ะลายชบาทอเอง ผูกเป็นกระโปรงก็ได้ คลุมไหล่เข้าวัดก็ดีจ้า', ['bc_coconut'], {
    kind: 'costume',
    lines: { recommend: ['ผืนนี้ลายชบาสีสด ใส่ถ่ายรูปริมทะเลสวยมาก', 'ขึ้นไปกราบพระใหญ่ต้องคลุมไหล่นะ ผืนนี้เลย'], haggle: ['ผืนละนิดเดียวเองลูก', 'ป้าทอเองนะ ลดได้นิดเดียว'], thanks: ['ใส่แล้วสวยเหมือนนางเอกเลย'] },
  }),
  // หาดป่าตอง
  shop('beach_patong_somtam', 'beach_patong', 'ส้มตำหาบเร่พี่ต่าย', 'พี่ต่าย', 'ส้มตำหาบเร่ถึงร่มเลยจ้า ข้าวโพดปิ้งด้วยไหม', ['bc_somtam_poo', 'bc_corn', 'bc_shake'], {
    kind: 'noodle',
    lines: { recommend: ['ตำปูม้าเผ็ดกลาง ๆ ฝรั่งยังกินได้', 'หาบมาไกลจากหัวหาดเลยนะ'], thanks: ['แซ่บนัว ๆ ขอบคุณจ้า'] },
  }),
  shop('beach_patong_hat', 'beach_patong', 'หมวกกับผ้าปาเต๊ะเจ๊นก', 'เจ๊นก', 'หมวกสานคาดแว่น ผ้าปาเต๊ะ เสื้อลายทะเล ใส่แล้วปังทั้งหาดค่ะ', ['bc_shake'], {
    kind: 'costume',
    lines: { recommend: ['หมวกใบนี้มีแว่นเสียบมาด้วย สองต่อ!', 'ใส่เดินหาดป่าตองแล้วดูเป็นซุปตาร์'], haggle: ['ลดให้นิดนึง ลูกค้าคนแรกของวัน', 'ราคานี้เจ๊ขาดทุนแล้วนะ'], thanks: ['สวยมาก ถ่ายรูปส่งมาให้เจ๊ดูด้วย'] },
  }),
  shop('beach_patong_massage', 'beach_patong', 'นวดใต้ร่มไม้ป่าตอง', 'ป้าแดง', 'นวดน้ำมัน นวดไทย ใต้ร่มไม้ริมหาดจ้า ครึ่งชั่วโมงก็หายเมื่อย', ['bc_massage', 'bc_coconut'], {
    kind: 'teahouse',
    lines: { recommend: ['นอนฟังคลื่นไปด้วย ฟินที่สุด', 'ป้านวดมายี่สิบปีแล้ว'], thanks: ['เบาสบายตัวแล้วไปเล่นน้ำต่อได้'] },
  }),
  // หาดไร่เลย์
  shop('beach_railay_shake', 'beach_railay', 'น้ำปั่นบนเรือหางยาว', 'บังเดช', 'น้ำปั่นขายบนเรือหางยาวครับ จอดรอตรงนี้ทั้งวัน', ['bc_shake', 'bc_coconut', 'bc_corn'], {
    kind: 'snack',
    lines: { recommend: ['มะม่วงปั่นแก้วใหญ่ ๆ แก้ร้อน', 'นั่งเรือกลับอ่าวนางก็เรียกบังได้'], thanks: ['ขอบคุณครับ ขอให้เดินทางปลอดภัย'] },
  }),
  shop('beach_railay_souvenir', 'beach_railay', 'ของที่ระลึกไร่เลย์', 'น้องแพรว', 'โปสการ์ดหน้าผา เรือหางยาวจิ๋ว เสื้อลายทะเลก็มีค่ะ', ['bc_coconut'], {
    kind: 'souvenir',
    lines: { recommend: ['เรือหางยาวจิ๋วผูกผ้าแพรเหมือนของจริงเลย', 'ส่งโปสการ์ดจากไร่เลย์ให้ที่บ้านสิคะ'], thanks: ['เที่ยวให้สนุกนะคะ'] },
  }),
]

export const BEACH_SHOP_BY_ID: Record<string, PlaceShop> = Object.fromEntries(BEACH_SHOPS.map((s) => [s.id, s]))

let done = false
/** Register the beach stalls and snacks (idempotent; runs on import). */
export function registerBeachShops() {
  if (done) return
  done = true
  registerSnacks(BEACH_SNACKS)
  registerPlaceShops(BEACH_SHOPS)
}

registerBeachShops()
