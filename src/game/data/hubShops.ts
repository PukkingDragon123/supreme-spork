// Stalls of the hub markets and the temple fair (hotspots
// `shop:<hubId>_<slug>`), plus the snacks only sold there. Merged into
// PLACE_SHOPS / SNACKS by placeShops.ts, so the regular place-shop window
// opens them.

import type { PlaceShop, Snack } from './placeShops'

export const HUB_SNACKS: Snack[] = [
  // ตลาดนัดจตุจักร
  { id: 'hub_coconut_icecream', name: 'ไอติมมะพร้าวจตุจักร', desc: 'ไอติมกะทิในลูกมะพร้าวทั้งลูก โรยถั่วกับข้าวเหนียว ต่อคิวยาวแต่คุ้มทุกนาที', icon: 'dessert', price: 25, buff: { kind: 'merit', mult: 1.15, minutes: 15 } },
  { id: 'hub_mango_pistachio', name: 'ข้าวเหนียวมะม่วงพิสตาชิโอ', desc: 'มะม่วงน้ำดอกไม้ ราดกะทิ โรยพิสตาชิโอตามเทรนด์ ของมันต้องมี', icon: 'dessert', price: 35, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  { id: 'hub_matcha', name: 'มัทฉะลาเต้แก้วเขียว', desc: 'มัทฉะเข้มข้นแบบที่คนต่อคิวถ่ายรูป เขียวสดชื่นทั้งวัน', icon: 'tea', price: 30, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'hub_hippo_pancake', name: 'แพนเค้กหน้าหมูดึ๋ง', desc: 'แพนเค้กรูปฮิปโปแคระแก้มชมพู กินแล้วอยากเด้งดึ๋ง', icon: 'dessert', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'hub_blindbox_soda', name: 'โซดากล่องสุ่ม', desc: 'สุ่มรสลับ! ได้ลิ้นจี่บ้าง ได้ผักชีบ้าง ขอให้โชคดีนะ', icon: 'redsoda', price: 15, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
  { id: 'hub_catface_icecream', name: 'ไอติมหน้าแมวส้ม', desc: 'ไอติมส้มหน้าแมว หูเป็นคุกกี้ กินแล้วคิดช้าลงนิดนึง', icon: 'dessert', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 20 } },
  { id: 'hub_giant_paella', name: 'ข้าวผัดกระทะยักษ์', desc: 'ข้าวผัดซีฟู้ดกระทะใหญ่เท่าล้อรถ ลุงผัดโชว์ทุกชั่วโมง', icon: 'curry', price: 35, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  // ตลาดน้ำดำเนินสะดวก
  { id: 'hub_boat_noodle', name: 'ก๋วยเตี๋ยวเรือชามจิ๋ว', desc: 'น้ำตกเข้มข้น ยื่นส่งจากเรือถึงมือ ชามเล็กจนต้องกินสิบชาม', icon: 'curry', price: 20, buff: { kind: 'merit', mult: 1.15, minutes: 15 } },
  { id: 'hub_kanom_krok', name: 'ขนมครกกะทิสด', desc: 'ขนมครกหอมกะทิ ประกบคู่ร้อน ๆ จากเตาบนเรือ', icon: 'dessert', price: 20, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'hub_coconut_water', name: 'มะพร้าวน้ำหอมเผา', desc: 'มะพร้าวน้ำหอมจากสวนริมคลอง หวานเย็นชื่นใจ', icon: 'fruit', price: 20, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'hub_pad_thai_boat', name: 'ผัดไทยเรือ', desc: 'ผัดบนเรือโยกเยก ไฟแรงหอมกระทะ ห่อใบตองส่งให้', icon: 'curry', price: 30, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  // ตลาดร่มหุบ แม่กลอง
  { id: 'hub_platu', name: 'ปลาทูแม่กลองน้ำพริกกะปิ', desc: 'ปลาทูหน้างอคอหัก สดจากอ่าวแม่กลอง ทอดกรอบกินกับผักต้ม', icon: 'curry', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'hub_lychee', name: 'ลิ้นจี่ค่อมแม่กลอง', desc: 'ลิ้นจี่เนื้อหนาหวานหอม ของขึ้นชื่อสมุทรสงคราม', icon: 'fruit', price: 25, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  { id: 'hub_kanom_tan', name: 'ขนมตาลฟูนุ่ม', desc: 'ขนมตาลสีเหลืองนวล หอมลูกตาลสุก ห่อกระทงใบตอง', icon: 'dessert', price: 15, buff: { kind: 'coin', mult: 1.15, minutes: 20 } },
  // ถนนคนเดินเชียงใหม่
  { id: 'hub_longan_juice', name: 'น้ำลำไยเย็น', desc: 'ลำไยเชียงใหม่หวานฉ่ำ ดื่มแล้วเดินต่อได้ทั้งถนน', icon: 'tea', price: 15, buff: { kind: 'coin', mult: 1.15, minutes: 20 } },
  { id: 'hub_roti_banana', name: 'โรตีกล้วยไข่', desc: 'โรตีกรอบนอกนุ่มใน ราดนมข้นหวาน ร้านนี้เปิดมาสามสิบปี', icon: 'dessert', price: 25, buff: { kind: 'merit', mult: 1.15, minutes: 15 } },
  { id: 'hub_nam_ngiao', name: 'ขนมจีนน้ำเงี้ยว', desc: 'น้ำเงี้ยวมะเขือเทศเลือดหมู หอมดอกงิ้ว รสชาติบ้าน ๆ เมืองเหนือ', icon: 'curry', price: 30, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  // ตลาดกิมหยง หาดใหญ่
  { id: 'hub_kai_tod_hatyai', name: 'ไก่ทอดหาดใหญ่', desc: 'ไก่ทอดโรยหอมเจียวกรอบ ๆ กับข้าวเหนียวร้อน ของดีเมืองหาดใหญ่', icon: 'chicken', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'hub_dates', name: 'อินทผลัมเม็ดโต', desc: 'อินทผลัมหวานฉ่ำ บังให้ชิมก่อนซื้อสามเม็ด', icon: 'fruit', price: 25, buff: { kind: 'animal', mult: 1.2, minutes: 20 } },
  { id: 'hub_mataba', name: 'โรตีมะตะบะ', desc: 'แป้งบางห่อไส้ไก่แกงกะหรี่ ทอดกรอบกินกับอาจาด', icon: 'curry', price: 25, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  { id: 'hub_cashew', name: 'เม็ดมะม่วงหิมพานต์คั่ว', desc: 'คั่วใหม่ร้อน ๆ หอมมัน ชิมได้หนึ่งกำมือ', icon: 'fruit', price: 20, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
  // ตลาดอินโดจีน มุกดาหาร
  { id: 'hub_naem_nueang', name: 'แหนมเนือง', desc: 'หมูย่างม้วนผักกับแผ่นแป้งเวียดนาม จิ้มน้ำจิ้มสูตรลับ', icon: 'curry', price: 35, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'hub_lao_coffee', name: 'กาแฟลาวใส่นมข้น', desc: 'กาแฟดริปถุงผ้าข้นคลั่ก หวานมันแบบริมโขง', icon: 'tea', price: 20, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'hub_moo_kata', name: 'หมูกระทะริมโขง', desc: 'ย่างหมูบนโดมเตา น้ำซุปรอบ ๆ ชมพระอาทิตย์ตกริมโขง', icon: 'curry', price: 45, buff: { kind: 'merit', mult: 1.25, minutes: 15 } },
  { id: 'hub_khao_jee', name: 'ข้าวจี่ปาเต้', desc: 'ขนมปังฝรั่งเศสแบบญวน ยัดหมูยอปาเต้ผักดอง', icon: 'bread', price: 25, buff: { kind: 'animal', mult: 1.2, minutes: 15 } },
  // งานวัด
  { id: 'hub_ice_pop', name: 'ไอติมหลอด', desc: 'ไอติมหลอดสีสด ๆ ดูดจนลิ้นเปลี่ยนสี', icon: 'dessert', price: 10, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
  { id: 'hub_sai_mai', name: 'สายไหมสีชมพู', desc: 'ปั่นเป็นก้อนเมฆฟูเท่าหัว ละลายในปากทันที', icon: 'dessert', price: 15, buff: { kind: 'merit', mult: 1.1, minutes: 20 } },
  { id: 'hub_lookchin_tod', name: 'ลูกชิ้นทอดไม้ใหญ่', desc: 'ลูกชิ้นทอดพองราดน้ำจิ้มหวานเผ็ด ไม้ละสิบบาท', icon: 'curry', price: 20, buff: { kind: 'animal', mult: 1.15, minutes: 15 } },
  { id: 'hub_popcorn', name: 'ข้าวโพดคั่วคาราเมล', desc: 'คั่วกันสด ๆ เสียงป๊อก ๆ หอมไปทั้งงาน', icon: 'dessert', price: 20, buff: { kind: 'coin', mult: 1.15, minutes: 15 } },
  { id: 'fair_quail_egg', name: 'ไข่นกกระทาทอด', desc: 'ไข่นกกระทาในกระทะหลุม กรอบนอกนุ่มใน จิ้มซอสพริก', icon: 'boiledegg', price: 15, buff: { kind: 'animal', mult: 1.15, minutes: 15 } },
  { id: 'fair_squid_grill', name: 'หมึกย่างตัวใหญ่', desc: 'หมึกย่างเตาถ่าน หอมควันลอยทั่วงาน ราดน้ำจิ้มซีฟู้ด', icon: 'curry', price: 30, buff: { kind: 'merit', mult: 1.2, minutes: 15 } },
  { id: 'fair_khanom_tokyo', name: 'ขนมโตเกียวไส้ครีม', desc: 'แป้งบางม้วนไส้ครีมใบเตยกับไส้กรอก เลือกได้สองไส้', icon: 'dessert', price: 15, buff: { kind: 'coin', mult: 1.1, minutes: 20 } },
  { id: 'fair_red_soda_bag', name: 'น้ำแดงถุงใส่น้ำแข็ง', desc: 'น้ำแดงมะลิถุงผูกหนังยาง ดูดจนหลอดสั่น ชื่นใจสุด', icon: 'redsoda', price: 10, buff: { kind: 'animal', mult: 1.1, minutes: 20 } },
  { id: 'fair_squid_pressed', name: 'ปลาหมึกบด', desc: 'หมึกแห้งย่างแล้วเข้าเครื่องบดสองรอบจนแบนเป็นแผ่น เคี้ยวเพลินทั้งคืน', icon: 'curry', price: 25, buff: { kind: 'coin', mult: 1.2, minutes: 15 } },
  { id: 'fair_takoyaki', name: 'ทาโกะยากิลูกโต', desc: 'ลูกกลมร้อน ๆ ราดซอส โรยปลาโอแห้งที่เต้นระบำบนหน้า', icon: 'curry', price: 25, buff: { kind: 'merit', mult: 1.15, minutes: 15 } },
]

const shop = (id: string, place: string, name: string, npc: string, greeting: string, snacks: string[]): [string, PlaceShop] => [id, { id, name, npc, greeting, place, snacks }]

export const HUB_SHOPS: Record<string, PlaceShop> = Object.fromEntries([
  // ตลาดนัดจตุจักร
  shop('hub_chatuchak_coconut', 'hub_chatuchak', 'ไอติมมะพร้าวอ่อน', 'พี่มะพร้าว', 'ไอติมมะพร้าวลูกละ 60 จ้า เอ๊ย 25 บุญคอยน์! ต่อคิวตรงนี้เลย', ['hub_coconut_icecream', 'chayen']),
  shop('hub_chatuchak_mango', 'hub_chatuchak', 'ข้าวเหนียวมะม่วง', 'แม่วรรณ', 'ข้าวเหนียวมะม่วงสูตรที่ไปดังเมืองนอกจ้า มีรุ่นพิสตาชิโอด้วยนะ', ['hub_mango_pistachio', 'mango_sticky', 'hub_matcha']),
  shop('hub_chatuchak_vintage', 'hub_chatuchak', 'วินเทจโซน 2016', 'เจ๊วิน', 'เสื้อยุค 2016 กลับมาฮิตแล้ว! ปีนี้คือ 2016 ใหม่นะคะ', ['hub_matcha', 'chayen']),
  shop('hub_chatuchak_pants', 'hub_chatuchak', 'กางเกงช้างทุกสี', 'พี่ช้าง', 'ตัวละร้อย สามตัวสองร้อยห้า! ใส่แล้วเดินตลาดสบายสุด', ['hub_coconut_icecream']),
  shop('hub_chatuchak_hippo', 'hub_chatuchak', 'ร้านตุ๊กตาหมูดึ๋ง', 'น้องดึ๋ง', 'ฮิปโปแคระสุดไวรัล กัดเบา ๆ ไม่เจ็บ! มีแพนเค้กหน้าหมูดึ๋งด้วย', ['hub_hippo_pancake']),
  shop('hub_chatuchak_blindbox', 'hub_chatuchak', 'ป๊อปบุญ กล่องสุ่ม', 'พนักงานป๊อปบุญ', 'ต่อคิวหนึ่งคนหนึ่งกล่องนะคะ~ ของหมดไวมาก (หมดทุกห้านาที)', ['hub_blindbox_soda']),
  shop('hub_chatuchak_pets', 'hub_chatuchak', 'โซนสัตว์เลี้ยง', 'ป้าส้ม', 'ดูได้ อุ้มได้ แต่ห้ามแอบใส่กระเป๋ากลับบ้านนะ!', ['hub_catface_icecream']),
  shop('hub_chatuchak_paella', 'hub_chatuchak', 'ข้าวผัดกระทะยักษ์', 'ลุงโจ้', 'กระทะนี้เลี้ยงคนได้ทั้งซอย! รับจานนึงไหมครับ', ['hub_giant_paella']),
  // ตลาดน้ำดำเนินสะดวก
  shop('hub_damnoen_noodle', 'hub_damnoen', 'ก๋วยเตี๋ยวเรือ', 'ป้าสมใจ', 'ก๋วยเตี๋ยวเรือชามละนิดเดียว สั่งห้าชามเลยลูก!', ['hub_boat_noodle', 'hub_pad_thai_boat']),
  shop('hub_damnoen_fruit', 'hub_damnoen', 'เรือผลไม้', 'ยายเพียร', 'มะม่วง มังคุด เงาะ ส้มโอ สดจากสวนเมื่อเช้าจ้า', ['hub_coconut_water', 'mango_sticky']),
  shop('hub_damnoen_krok', 'hub_damnoen', 'ขนมครกน้าแดง', 'น้าแดง', 'ขนมครกร้อน ๆ ระวังลวกปากนะจ๊ะ', ['hub_kanom_krok']),
  shop('hub_damnoen_hats', 'hub_damnoen', 'ร้านงอบริมคลอง', 'ลุงสาน', 'งอบใบลานกันแดดได้ กันฝนได้ กันคำถามว่าไปไหนมาไม่ได้', ['hub_coconut_water']),
  // ตลาดร่มหุบ แม่กลอง
  shop('hub_maeklong_platu', 'hub_maeklong', 'แผงปลาทูลุงเปี๊ยก', 'ลุงเปี๊ยก', 'ปลาทูแม่กลองแท้ หน้างอคอหัก! รีบซื้อก่อนรถไฟมา', ['hub_platu']),
  shop('hub_maeklong_fruit', 'hub_maeklong', 'ผลไม้ริมราง', 'ป้าหน่อย', 'ลิ้นจี่ค่อมหวาน ๆ วางไว้ริมราง รถไฟผ่านไม่โดนนะ (เฉียด ๆ)', ['hub_lychee', 'coconut_sugar']),
  shop('hub_maeklong_kanom', 'hub_maeklong', 'ขนมไทยแม่กลอง', 'แม่ละเอียด', 'ขนมตาล ขนมชั้น น้ำตาลมะพร้าวแท้ ทำเองทุกวัน', ['hub_kanom_tan', 'coconut_sugar']),
  // ถนนคนเดินเชียงใหม่
  shop('hub_thaphae_khaosoi', 'hub_thaphae', 'ข้าวซอยแม่คำปัน', 'แม่คำปัน', 'ข้าวซอยน้ำข้น ๆ เผ็ดหอมกลิ่นเครื่องแกงเจ้า', ['khao_soi', 'hub_nam_ngiao', 'sai_ua']),
  shop('hub_thaphae_umbrella', 'hub_thaphae', 'ร่มบ่อสร้างวาดสด', 'พี่ปอ', 'ร่มกระดาษสาวาดมือทีละคัน วาดชื่อให้ฟรีเจ้า', ['hub_longan_juice']),
  shop('hub_thaphae_roti', 'hub_thaphae', 'โรตีป้าเฮาะ', 'ป้าเฮาะ', 'โรตีกล้วยไข่ราดนมเจ้า คิวยาวแต่ป้ามือไว!', ['hub_roti_banana', 'hub_longan_juice']),
  // ตลาดกิมหยง
  shop('hub_kimyong_chicken', 'hub_kimyong', 'ไก่ทอดหาดใหญ่', 'เจ๊ยะ', 'ไก่ทอดหอมเจียวกรอบ ๆ กับข้าวเหนียว หรอยจังฮู้!', ['hub_kai_tod_hatyai']),
  shop('hub_kimyong_dates', 'hub_kimyong', 'อินทผลัมบังดีน', 'บังดีน', 'ชิมก่อนได้ครับ สามเม็ดฟรี! เม็ดที่สี่เริ่มคิดเงิน', ['hub_dates', 'hub_cashew']),
  shop('hub_kimyong_dried', 'hub_kimyong', 'ของแห้งเฮียหลี', 'เฮียหลี', 'หมึกแห้ง กุ้งแห้ง เม็ดมะม่วง ช็อกโกแลตจากข้ามแดน ครบจบที่เดียว', ['dried_squid', 'hub_cashew']),
  shop('hub_kimyong_roti', 'hub_kimyong', 'โรตีชาชักกะลีมะห์', 'กะลีมะห์', 'ชาชักฟองนุ่ม โรตีมะตะบะร้อน ๆ ค่ะ', ['cha_chak', 'hub_mataba']),
  // ตลาดอินโดจีน
  shop('hub_indochina_naem', 'hub_indochina', 'แหนมเนืองริมโขง', 'ลุงเหงียน', 'ม้วนเองนะ ผักเยอะ ๆ ห่อแน่น ๆ แบบลุงสอน', ['hub_naem_nueang', 'hub_khao_jee']),
  shop('hub_indochina_silk', 'hub_indochina', 'ผ้าไหมแม่คำพอง', 'แม่ใหญ่คำพอง', 'ผ้าไหมทอมือเด้อลูก กาแฟลาวร้อน ๆ ก็มีเด้อ', ['hub_lao_coffee']),
  shop('hub_indochina_mookata', 'hub_indochina', 'หมูกระทะริมโขง', 'เจ๊นก', 'เตาร้อนแล้ว! หมูสามชั้นจัดเต็ม ชมโขงไปย่างไป', ['hub_moo_kata', 'som_tam']),
  shop('hub_indochina_toys', 'hub_indochina', 'ของเล่นร้อยแปด', 'อาเฮีย', 'ของเล่นไขลาน ไฟกระพริบ ร้อยแปดพันเก้า เลือกเลย', ['hub_khao_jee', 'hub_lao_coffee']),
  // งานวัด
  shop('fair_temple_icepop', 'fair_temple', 'ไอติมหลอดลุงชื่น', 'ลุงชื่น', 'ไอติมหลอดหลอดละสิบบาท~ สีแดง สีเขียว สีฟ้าเลือกเลย!', ['hub_ice_pop']),
  shop('fair_temple_saimai', 'fair_temple', 'สายไหมป้าจุก', 'ป้าจุก', 'สายไหมฟู ๆ เท่าหัวหนู! ชมพูหรือฟ้าจ๊ะ', ['hub_sai_mai']),
  shop('fair_temple_lookchin', 'fair_temple', 'ลูกชิ้นทอดพี่หนุ่ม', 'พี่หนุ่ม', 'ลูกชิ้นทอดพอง ๆ น้ำจิ้มสูตรเด็ด เผ็ดน้อยเผ็ดมาก?', ['hub_lookchin_tod']),
  shop('fair_temple_popcorn', 'fair_temple', 'ข้าวโพดคั่ว', 'เฮียป๊อก', 'ป๊อก ๆ ๆ หอมไหม! คาราเมลหรือเนย?', ['hub_popcorn', 'chayen']),
  shop('fair_temple_quail', 'fair_temple', 'ไข่นกกระทาป้าไข่', 'ป้าไข่', 'ไข่นกกระทากระทะหลุม ห้าลูกสิบบาท~ ร้อน ๆ ระวังลวกปากนะ', ['fair_quail_egg']),
  shop('fair_temple_squid', 'fair_temple', 'หมึกย่างลุงหนวด', 'ลุงหนวด', 'หมึกย่างตัวโต ๆ ย่างใหม่ทุกไม้! เอาน้ำจิ้มเผ็ดไหม', ['fair_squid_grill']),
  shop('fair_temple_tokyo', 'fair_temple', 'ขนมโตเกียวน้องแพร', 'น้องแพร', 'ไส้ครีม ไส้กรอก ไส้หมูหยอง เลือกเลยค่า~', ['fair_khanom_tokyo']),
  shop('fair_temple_redsoda', 'fair_temple', 'น้ำแดงถุงเจ๊นิด', 'เจ๊นิด', 'น้ำแดงถุงจ้า! เย็นเจี๊ยบ ใส่น้ำแข็งเต็มถุง', ['fair_red_soda_bag', 'chayen']),
  shop('fair_temple_pressed', 'fair_temple', 'ปลาหมึกบดลุงเครื่อง', 'ลุงเครื่อง', 'หมุน ๆ ๆ บดสองรอบ แบนแต๊ดแต๋! เคี้ยวเพลินทั้งคืน', ['fair_squid_pressed']),
  shop('fair_temple_takoyaki', 'fair_temple', 'ทาโกะยากิพี่โอ๊ต', 'พี่โอ๊ต', 'ทาโกะยากิลูกโต ปลาโอแห้งเต้นได้ ร้อนมากเป่าก่อนนะ!', ['fair_takoyaki']),
])
