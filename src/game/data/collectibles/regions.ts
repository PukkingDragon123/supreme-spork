// ของดีประจำภาค – one souvenir series per region. Items with a `place` are
// that place's signature souvenirs (always in stock at its stalls); the rest
// roll into the daily random stock of shops in (mostly) that region.

import type { CollectibleDef, CollectibleGroup, CollectibleSeries } from '../collectibleTypes'

export const S_BANGKOK = 'ของดีกรุงเทพฯ'
export const S_CENTRAL = 'ของดีภาคกลาง'
export const S_NORTH = 'ของดีภาคเหนือ'
export const S_ISAN = 'ของดีภาคอีสาน'
export const S_SOUTH = 'ของดีภาคใต้'

const GOLD: [string, string, string] = ['#ffd54f', '#e9a53a', '#fff3a6']

const BANGKOK: CollectibleDef[] = [
  { id: 'cl_yak_figure', name: 'ยักษ์วัดพระแก้วจิ๋ว', desc: 'ทวารบาลตาโตเขี้ยวงอน ยืนเฝ้าโต๊ะทำงานให้ ใครจะมาขโมยขนมต้องผ่านยักษ์ก่อน', rarity: 'uncommon', kind: 'figure', series: S_BANGKOK, place: 'wat_phra_kaew', value: 70, art: { motif: 'giant', palette: ['#4fb07a', '#e8514a', '#ffd54f'] } },
  { id: 'cl_emerald_stamp', name: 'แสตมป์พระแก้วมรกต', desc: 'แสตมป์ที่ระลึกสีเขียวมรกต ขอบหยักคม ๆ แปะสมุดแล้วบุญขึ้น (ทางใจ)', rarity: 'rare', kind: 'stamp', series: S_BANGKOK, place: 'wat_phra_kaew', value: 150, art: { motif: 'buddha', palette: ['#3fae6a', '#ffd54f', '#e8f8d0'] } },
  { id: 'cl_reclining_postcard', name: 'โปสการ์ดพระนอนวัดโพธิ์', desc: 'องค์พระยาว 46 เมตร ต้องถ่ายพาโนรามาถึงจะติด ใส่โปสการ์ดได้ก็บุญแล้ว', rarity: 'common', kind: 'postcard', series: S_BANGKOK, place: 'wat_pho', value: 25, art: { motif: 'reclining', palette: GOLD } },
  { id: 'cl_prang_globe', name: 'สโนว์โกลบพระปรางค์วัดอรุณ', desc: 'เขย่าแล้วกลีบดอกไม้ปลิวรอบพระปรางค์ สวยเหมือนยามเย็นริมเจ้าพระยา', rarity: 'rare', kind: 'snowglobe', series: S_BANGKOK, place: 'wat_arun', value: 170, art: { motif: 'prang', palette: ['#f4efe6', '#5a8de0', '#ff9fc0'] } },
  { id: 'cl_brahma_amulet', name: 'ล็อกเก็ตท้าวมหาพรหมจำลอง', desc: 'สี่พักตร์ มองได้ทุกทิศ ลืมกุญแจบ้านไว้ตรงไหนก็น่าจะเห็น', rarity: 'rare', kind: 'amulet', series: S_BANGKOK, place: 'erawan', value: 160, art: { motif: 'brahma', palette: GOLD } },
  { id: 'cl_goldmount_keychain', name: 'พวงกุญแจภูเขาทอง', desc: 'บันได 344 ขั้นย่อส่วนเหลือหนึ่งนิ้ว ไม่ต้องเหนื่อยก็ได้ขึ้นยอด', rarity: 'common', kind: 'keychain', series: S_BANGKOK, place: 'golden_mount', value: 25, art: { motif: 'mount', palette: ['#ffd54f', '#6cc36a', '#fffaf0'] } },
  { id: 'cl_golden_buddha', name: 'หลวงพ่อทองคำจิ๋ว', desc: 'จำลององค์พระทองคำเยาวราช เงาวับจนต้องใส่แว่นกันแดดดู', rarity: 'epic', kind: 'figure', series: S_BANGKOK, place: 'wat_traimit', value: 420, art: { motif: 'buddha', palette: GOLD } },
  { id: 'cl_tuktuk_magnet', name: 'แม่เหล็กตุ๊กตุ๊ก', desc: 'ตุ๊กตุ๊กติดตู้เย็น ขับเร็วกว่าตัวจริงเพราะไม่ติดไฟแดง', rarity: 'common', kind: 'magnet', series: S_BANGKOK, value: 25, art: { motif: 'tuktuk', palette: ['#5a8de0', '#ffd54f', '#e8514a'] } },
  { id: 'cl_dragon_keychain', name: 'พวงกุญแจมังกรเยาวราช', desc: 'มังกรแดงทองหน้าตาดุ แต่จริง ๆ ชอบกินเกาลัดคั่ว', rarity: 'uncommon', kind: 'keychain', series: S_BANGKOK, value: 60, art: { motif: 'dragon', palette: ['#e8514a', '#ffd54f', '#fff3a6'] } },
  { id: 'cl_tuktuk_toy', name: 'ตุ๊กตุ๊กไขลาน', desc: 'ไขลานแล้ววิ่งปื๊ด ๆ มีเสียงแตรปี๊นปี๊น (เสียงเราเองนะ)', rarity: 'rare', kind: 'toy', series: S_BANGKOK, value: 140, art: { motif: 'tuktuk', palette: ['#e8514a', '#ffd54f', '#5a8de0'] } },
]

const CENTRAL: CollectibleDef[] = [
  { id: 'cl_pathom_globe', name: 'สโนว์โกลบพระปฐมเจดีย์', desc: 'เจดีย์ที่สูงที่สุดในไทย ย่อลงมาอยู่ในลูกแก้ว เขย่าแล้วหิมะตก (ครั้งแรกของนครปฐม)', rarity: 'uncommon', kind: 'snowglobe', series: S_CENTRAL, place: 'pathom_chedi', value: 65, art: { motif: 'chedi', palette: ['#f58f35', '#ffd54f', '#fff1d6'] } },
  { id: 'cl_amphawa_boat', name: 'แม่เหล็กเรือแม่ค้าอัมพวา', desc: 'เรือพายขายก๋วยเตี๋ยว ติดตู้เย็นแล้วรู้สึกหิวทุกครั้งที่เปิด', rarity: 'common', kind: 'magnet', series: S_CENTRAL, place: 'wat_chulamanee', value: 25, art: { motif: 'longtail', palette: ['#9a6a45', '#ffd54f', '#78d2e2'] } },
  { id: 'cl_footprint_relic', name: 'รอยพระพุทธบาทจำลอง', desc: 'ประดิษฐานในผอบทองเล็ก ๆ เก็บไว้บูชาที่บ้าน สายบุญตัวจริงต้องมี', rarity: 'rare', kind: 'relic', series: S_CENTRAL, place: 'wat_phutthabat', value: 180, art: { motif: 'footprint', palette: GOLD } },
  { id: 'cl_treehead_postcard', name: 'โปสการ์ดเศียรพระในรากไม้', desc: 'ภาพดังจากอยุธยา รากโพธิ์โอบเศียรพระไว้อย่างอ่อนโยน ถ่ายรูปต้องนั่งต่ำกว่านะ', rarity: 'uncommon', kind: 'postcard', series: S_CENTRAL, place: 'wat_mahathat_ayutthaya', value: 60, art: { motif: 'treehead', palette: ['#b8a58a', '#5ea653', '#8a6a4a'] } },
  { id: 'cl_elephant_pants', name: 'พวงกุญแจกางเกงช้างจิ๋ว', desc: 'กางเกงช้างขนาดใส่ได้แค่นิ้วก้อย ใส่แล้วนิ้วเย็นสบาย', rarity: 'common', kind: 'keychain', series: S_CENTRAL, place: 'wat_mahathat_ayutthaya', value: 25, art: { motif: 'pants', palette: ['#5a8de0', '#fffaf0', '#ffd54f'] } },
  { id: 'cl_sothon_egg', name: 'ชาร์มไข่ต้มแก้บน', desc: 'ไข่ต้มนำโชคจากแปดริ้ว ไม่เน่า ไม่แตก ไม่มีวันหมดอายุ', rarity: 'common', kind: 'charm', series: S_CENTRAL, place: 'wat_sothon', value: 25, art: { motif: 'egg', palette: ['#fffaf0', '#ffd84a', '#e8514a'] } },
  { id: 'cl_sothon_amulet', name: 'เหรียญหลวงพ่อโสธรจำลอง', desc: 'เหรียญที่ระลึกองค์หลวงพ่อสีทอง คนแปดริ้วมีติดบ้านทุกหลัง', rarity: 'rare', kind: 'amulet', series: S_CENTRAL, value: 150, art: { motif: 'buddha', palette: GOLD } },
  { id: 'cl_ganesha_figure', name: 'พระพิฆเนศปางนอนสีชมพู', desc: 'องค์ชมพูหวานปางนอนสบาย ๆ ขอพรแล้วอย่าลืมกระซิบหนูทูตด้วย', rarity: 'epic', kind: 'figure', series: S_CENTRAL, place: 'wat_samarn', value: 400, art: { motif: 'ganesha', palette: ['#ff9fc0', '#ffd54f', '#e8709e'] } },
  { id: 'cl_rat_plush', name: 'ตุ๊กตาหนูกระซิบพร', desc: 'หนูทูตหูกลมตั้งใจฟัง บอกความลับแล้วเก็บเงียบ (แต่ไปบอกพระพิฆเนศ)', rarity: 'uncommon', kind: 'plush', series: S_CENTRAL, value: 60, art: { motif: 'rat', palette: ['#c9a0c8', '#ff9fc0', '#fffaf0'] } },
  { id: 'cl_wood_elephant', name: 'ช้างไม้หลวงปู่ทวด', desc: 'ช้างไม้แกะมือจากห้วยมงคล ลูบงวงแล้วขอพร จะได้ลอดท้องช้างทางใจ', rarity: 'common', kind: 'figure', series: S_CENTRAL, place: 'wat_huay_mongkol', value: 30, art: { motif: 'elephant', palette: ['#d6a064', '#e8514a', '#ffd54f'] } },
  { id: 'cl_mango_plush', name: 'ตุ๊กตาข้าวเหนียวมะม่วง', desc: 'นุ่มฟูหอมกะทิ (แค่ในจินตนาการ) กอดแล้วหิวทุกที', rarity: 'uncommon', kind: 'plush', series: S_CENTRAL, value: 70, art: { motif: 'mango', palette: ['#ffcf3a', '#fbf7ee', '#6cc36a'] } },
  { id: 'cl_roti_keychain', name: 'พวงกุญแจโรตีสายไหม', desc: 'สายไหมสีชมพูม้วนกลม ๆ ห้ามกัด เป็นยาง', rarity: 'common', kind: 'keychain', series: S_CENTRAL, value: 25, art: { motif: 'roti', palette: ['#ff9fc0', '#fff1d6', '#8fd47a'] } },
  { id: 'cl_pomelo_magnet', name: 'แม่เหล็กส้มโอนครชัยศรี', desc: 'ส้มโอหวานอมเปรี้ยว ติดตู้เย็นแล้วตู้เย็นดูสดชื่นขึ้นสามเท่า', rarity: 'common', kind: 'magnet', series: S_CENTRAL, value: 25, art: { motif: 'citrus', palette: ['#b4e486', '#5ea653', '#ffb8cf'] } },
]

const NORTH: CollectibleDef[] = [
  { id: 'cl_elephant_keychain', name: 'พวงกุญแจช้างเชียงใหม่', desc: 'ช้างผ้าปักลายชาวเขา งวงชูขึ้นรับโชค ห้อยกระเป๋าแล้วไปไหนก็มีเพื่อน', rarity: 'common', kind: 'keychain', series: S_NORTH, value: 25, art: { motif: 'elephant', palette: ['#9aa8b8', '#e8514a', '#ffd54f'] } },
  { id: 'cl_doisuthep_globe', name: 'สโนว์โกลบพระธาตุดอยสุเทพ', desc: 'เขย่าแล้วหมอกลอยรอบพระธาตุทอง เย็นสบายเหมือนอยู่บนดอย', rarity: 'rare', kind: 'snowglobe', series: S_NORTH, place: 'doi_suthep', value: 170, art: { motif: 'chedi', palette: GOLD } },
  { id: 'cl_rooster_bowl', name: 'แม่เหล็กชามตราไก่', desc: 'ชามไก่ลำปางของแท้ (ขนาดแม่เหล็ก) ใส่ข้าวไม่ได้ แต่ใส่ใจได้', rarity: 'common', kind: 'magnet', series: S_NORTH, place: 'lampang_luang', value: 25, art: { motif: 'bowl', palette: ['#fffaf0', '#e8514a', '#3fa06e'] } },
  { id: 'cl_white_temple', name: 'วัดร่องขุ่นขาววิบวับ', desc: 'โมเดลโบสถ์สีขาวประดับกระจกเงา วางตรงแดดแล้วห้องทั้งห้องระยิบระยับ', rarity: 'epic', kind: 'figure', series: S_NORTH, place: 'wat_rong_khun', value: 450, art: { motif: 'whitetemple', palette: ['#f4f7fb', '#b8d4f0', '#dfe8f4'] } },
  { id: 'cl_guanyin_figure', name: 'เจ้าแม่กวนอิมหยกขาว', desc: 'องค์หยกขาวจากห้วยปลากั้ง ยิ้มเมตตา มองแล้วใจเย็นลงทันที', rarity: 'rare', kind: 'figure', series: S_NORTH, place: 'wat_huay_pla_kang', value: 180, art: { motif: 'guanyin', palette: ['#f4f7fb', '#9fd0ff', '#ffd54f'] } },
  { id: 'cl_whisper_postcard', name: 'โปสการ์ดกระซิบรักบันลือโลก', desc: 'จิตรกรรมฝาผนังวัดภูมินทร์ หนุ่มกระซิบสาว สาวเขิน คนดูก็เขิน', rarity: 'uncommon', kind: 'postcard', series: S_NORTH, place: 'wat_phumin', value: 65, art: { motif: 'couple', palette: ['#c28e5c', '#e8514a', '#3a8fb8'] } },
  { id: 'cl_chinnarat_amulet', name: 'ล็อกเก็ตพระพุทธชินราชจำลอง', desc: 'พระพุทธรูปที่งามที่สุดในแผ่นดิน ซุ้มเรือนแก้วทองอร่าม', rarity: 'rare', kind: 'amulet', series: S_NORTH, place: 'wat_yai_phitsanulok', value: 180, art: { motif: 'buddha', palette: GOLD } },
  { id: 'cl_kluaytak_keychain', name: 'พวงกุญแจกล้วยตาก', desc: 'กล้วยตากหนึบ ๆ จากบางกระทุ่ม หอมน้ำผึ้งจนมดเข้าใจผิด', rarity: 'common', kind: 'keychain', series: S_NORTH, place: 'wat_yai_phitsanulok', value: 25, art: { motif: 'banana', palette: ['#e0a040', '#ffe28a', '#6cc36a'] } },
  { id: 'cl_bosang_pin', name: 'เข็มกลัดร่มบ่อสร้าง', desc: 'ร่มกระดาษสาลายดอกไม้ กางได้จริง (ถ้าเป็นมด)', rarity: 'uncommon', kind: 'pin', series: S_NORTH, value: 60, art: { motif: 'umbrella', palette: ['#e8514a', '#ffd54f', '#6cc36a'] } },
  { id: 'cl_khaosoi_magnet', name: 'แม่เหล็กข้าวซอย', desc: 'ข้าวซอยไก่หมี่กรอบฟู ติดตู้เย็นแล้วกลิ่นแกงลอยมาในใจ', rarity: 'common', kind: 'magnet', series: S_NORTH, value: 25, art: { motif: 'noodle', palette: ['#f0a830', '#fff1d6', '#e8514a'] } },
  { id: 'cl_white_elephant', name: 'ช้างเผือกทองคำ', desc: 'ช้างเผือกมงคลประดับทอง ของหายากที่สุดแห่งล้านนา ใครได้ถือว่าบุญหนักมาก', rarity: 'legendary', kind: 'figure', series: S_NORTH, value: 1000, art: { motif: 'elephant', palette: ['#fffaf0', '#ffd54f', '#e8709e'], foil: true } },
]

const ISAN: CollectibleDef[] = [
  { id: 'cl_naga_charm', name: 'ชาร์มพญานาคคำชะโนด', desc: 'เกล็ดเขียวทองวาววับ ห้อยไว้แล้วรู้สึกมีคนคุ้มครอง (หรือคนแอบมอง)', rarity: 'rare', kind: 'charm', series: S_ISAN, place: 'kham_chanod', value: 170, art: { motif: 'naga', palette: ['#3fae6a', '#ffd54f', '#b4e486'] } },
  { id: 'cl_thatphanom_stamp', name: 'แสตมป์พระธาตุพนม', desc: 'พระธาตุคู่บ้านคู่เมืองริมโขง พิมพ์ลงแสตมป์ขอบหยักสวยมาก', rarity: 'uncommon', kind: 'stamp', series: S_ISAN, place: 'that_phanom', value: 60, art: { motif: 'that', palette: ['#fffaf0', '#ffd54f', '#e8514a'] } },
  { id: 'cl_dankwian_pot', name: 'หม้อดินด่านเกวียนจิ๋ว', desc: 'เครื่องปั้นดินเผาสีสนิมจากโคราช เคาะแล้วเสียงกังวาน (อย่าเคาะแรง)', rarity: 'uncommon', kind: 'figure', series: S_ISAN, place: 'ya_mo', value: 60, art: { motif: 'pot', palette: ['#a8543a', '#6e2a1c', '#e0bb8a'] } },
  { id: 'cl_mortar_keychain', name: 'พวงกุญแจครกส้มตำ', desc: 'ครกดินกับสากไม้ ตำได้แต่ความคิดถึง แซ่บหลายเด้อ', rarity: 'common', kind: 'keychain', series: S_ISAN, value: 25, art: { motif: 'mortar', palette: ['#b87a4a', '#6cc36a', '#e8413a'] } },
  { id: 'cl_khaen_pin', name: 'เข็มกลัดแคน', desc: 'แคนไม้ไผ่จิ๋ว เป่าไม่ได้แต่ติดเสื้อแล้วม่วนซื่นทันที', rarity: 'uncommon', kind: 'pin', series: S_ISAN, value: 55, art: { motif: 'khaen', palette: ['#c9a05a', '#8a5a2a', '#e8514a'] } },
  { id: 'cl_buffalo_plush', name: 'ตุ๊กตาควายน้อยทุ่งกุลา', desc: 'ควายตัวกลมตาแป๋ว ขยันไถนาในความฝัน', rarity: 'common', kind: 'plush', series: S_ISAN, value: 30, art: { motif: 'buffalo', palette: ['#6a6478', '#fffaf0', '#ff9aa6'] } },
  { id: 'cl_kratip_keychain', name: 'พวงกุญแจกระติ๊บข้าวเหนียว', desc: 'กระติ๊บสานมือใบจิ๋ว เปิดได้จริง ข้างในว่างเปล่าเหมือนกระเป๋าตังค์สิ้นเดือน', rarity: 'common', kind: 'keychain', series: S_ISAN, value: 25, art: { motif: 'kratip', palette: ['#e0bb8a', '#9a6a45', '#fbf7ee'] } },
  { id: 'cl_fireball_globe', name: 'สโนว์โกลบบั้งไฟพญานาค', desc: 'ลูกไฟสีชมพูลอยขึ้นจากแม่น้ำโขง เขย่าแล้วลอยจริง ๆ นะ (มั้ง)', rarity: 'rare', kind: 'snowglobe', series: S_ISAN, value: 160, art: { motif: 'fireball', palette: ['#ff9fc0', '#2f77a8', '#fff3a6'] } },
  { id: 'cl_dino_figure', name: 'ไดโนเสาร์ภูเวียง', desc: 'ไดโนเสาร์คอยาวของดีขอนแก่น เดินทางข้ามล้านปีมาเป็นของที่ระลึก', rarity: 'epic', kind: 'figure', series: S_ISAN, value: 380, art: { motif: 'dino', palette: ['#7cc55e', '#f4c86a', '#43905a'] } },
]

const SOUTH: CollectibleDef[] = [
  { id: 'cl_rooster_figure', name: 'ไก่แก้บนไอ้ไข่', desc: 'ไก่ชนปูนปั้นตัวเล็ก ถูกหวยแล้วอย่าลืมมาแก้บนตัวใหญ่นะ', rarity: 'common', kind: 'figure', series: S_SOUTH, place: 'ai_khai', value: 30, art: { motif: 'rooster', palette: ['#e8514a', '#ffd54f', '#3a8fb8'] } },
  { id: 'cl_gold_rooster', name: 'ไก่ชนทองคำแก้บน', desc: 'รุ่นพิเศษสีทองอร่าม ขันทีเดียวเลขออกทั้งซอย (ไม่รับประกัน)', rarity: 'epic', kind: 'figure', series: S_SOUTH, place: 'ai_khai', value: 450, art: { motif: 'rooster', palette: GOLD } },
  { id: 'cl_nst_postcard', name: 'โปสการ์ดพระบรมธาตุเมืองคอน', desc: 'เจดีย์ขาวยอดทองเก่าแก่กว่าพันปี หรอยจังฮู้ ต้องมาให้ได้สักครั้ง', rarity: 'uncommon', kind: 'postcard', series: S_SOUTH, place: 'nst_mahathat', value: 60, art: { motif: 'chedi', palette: ['#fffaf0', '#ffd54f', '#e0bb8a'] } },
  { id: 'cl_puppet_pin', name: 'เข็มกลัดหนังตะลุง', desc: 'รูปหนังไอ้เท่งจอมทะเล้น ติดเสื้อแล้วพูดมุกได้ทั้งวัน', rarity: 'uncommon', kind: 'pin', series: S_SOUTH, value: 60, art: { motif: 'puppet', palette: ['#8a4a2a', '#ffd54f', '#e8514a'] } },
  { id: 'cl_shophouse_magnet', name: 'แม่เหล็กตึกชิโนฯ ภูเก็ต', desc: 'ตึกแถวสีพาสเทลย่านเมืองเก่า ถ่ายรูปมุมไหนก็สวย ติดตู้เย็นก็สวย', rarity: 'common', kind: 'magnet', series: S_SOUTH, place: 'wat_chalong', value: 25, art: { motif: 'shophouse', palette: ['#86d6c0', '#ffd54f', '#e8709e'] } },
  { id: 'cl_bigbuddha_globe', name: 'สโนว์โกลบพระใหญ่ภูเก็ต', desc: 'พระหินอ่อนขาวบนยอดเขานาคเกิด เขย่าแล้วเห็นทะเลอันดามันวิบวับ', rarity: 'rare', kind: 'snowglobe', series: S_SOUTH, place: 'phuket_big_buddha', value: 170, art: { motif: 'buddha', palette: ['#f4f7fb', '#78d2e2', '#dfe8f4'] } },
  { id: 'cl_longtail_magnet', name: 'แม่เหล็กเรือหัวโทง', desc: 'เรือหางยาวผูกผ้าสามสีที่หัวเรือ ติดตู้เย็นแล้วได้ยินเสียงคลื่น', rarity: 'common', kind: 'magnet', series: S_SOUTH, value: 25, art: { motif: 'longtail', palette: ['#3a8fb8', '#e8514a', '#78d2e2'] } },
  { id: 'cl_durian_plush', name: 'ตุ๊กตาทุเรียนหมอนทอง', desc: 'หนามนุ่มไม่ทิ่ม กลิ่นไม่มี (ขอโทษด้วยสำหรับสายทุเรียน)', rarity: 'uncommon', kind: 'plush', series: S_SOUTH, value: 65, art: { motif: 'durian', palette: ['#9ccc65', '#ffe28a', '#5e8a35'] } },
  { id: 'cl_betta_globe', name: 'สโนว์โกลบปลากัดสยาม', desc: 'ปลากัดครีบยาวสะบัดอยู่ในลูกแก้ว สวยจนลืมว่ามันชอบกัดกัน', rarity: 'uncommon', kind: 'snowglobe', series: S_SOUTH, value: 70, art: { motif: 'betta', palette: ['#e8514a', '#5a8de0', '#b3eef4'] } },
  { id: 'cl_turtle_keychain', name: 'พวงกุญแจเต่าทะเล', desc: 'เต่ามะเฟืองน้อยจากทะเลใต้ เดินช้าแต่ห้อยกระเป๋าไวมาก', rarity: 'common', kind: 'keychain', series: S_SOUTH, value: 25, art: { motif: 'turtle', palette: ['#5ea653', '#c8f0cf', '#2f6f4b'] } },
]

export const REGION_SERIES: CollectibleSeries[] = [
  { id: S_BANGKOK, blurb: 'ของฝากจากเมืองหลวง วัดดัง ตุ๊กตุ๊ก เยาวราช', color: '#ff9fc0', motif: 'tuktuk', order: 10 },
  { id: S_CENTRAL, blurb: 'อยุธยา แปดริ้ว นครปฐม อัมพวา ห้วยมงคล', color: '#c8e58a', motif: 'chedi', order: 11 },
  { id: S_NORTH, blurb: 'ล้านนา ดอยสุเทพ ร่องขุ่น น่าน ลำปาง', color: '#8fd06c', motif: 'elephant', order: 12 },
  { id: S_ISAN, blurb: 'พญานาค ริมโขง ส้มตำ แคน ม่วนซื่นหลาย', color: '#f4c86a', motif: 'naga', order: 13 },
  { id: S_SOUTH, blurb: 'ไอ้ไข่ เมืองคอน ภูเก็ต ทะเลใต้ หรอยจังฮู้', color: '#5fc27c', motif: 'rooster', order: 14 },
]

export const REGION_GROUP: CollectibleGroup = {
  id: 'regions',
  items: [...BANGKOK, ...CENTRAL, ...NORTH, ...ISAN, ...SOUTH],
  series: REGION_SERIES,
}
