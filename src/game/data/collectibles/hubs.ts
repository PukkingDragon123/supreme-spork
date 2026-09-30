// Hub-market and temple-fair collectibles (group `hubs`). Market souvenirs
// carry `place` (the hub's place id) so the hub stalls can stock them; the
// fair prizes are won with prize tickets at the fair's prize booth
// (src/activities/fair/prizes.tsx) and are not sold anywhere.

import type { CollectibleDef } from '../collectibleTypes'

const SOUVENIRS: CollectibleDef[] = [
  // --- ตลาดนัดจตุจักร ---
  { id: 'hub_jj_clocktower', name: 'หอนาฬิกาจตุจักรจิ๋ว', desc: 'โมเดลหอนาฬิกากลางตลาด จุดนัดเจอเพื่อนยอดฮิต หลงเมื่อไหร่ให้มองหามัน', rarity: 'uncommon', kind: 'figure', series: 'ของดีตลาดนัดจตุจักร', place: 'hub_chatuchak', value: 120, art: { motif: 'clocktower', palette: ['#fffaf0', '#e8514a', '#5a8de0'] } },
  { id: 'hub_jj_hippo_plush', name: 'ตุ๊กตาหมูดึ๋งฮิปโปแคระ', desc: 'ฮิปโปแคระตัวกลมแก้มชมพู กัดเบา ๆ เด้งดึ๋ง ของไวรัลที่ใคร ๆ ก็ต่อคิว', rarity: 'rare', kind: 'plush', series: 'ของดีตลาดนัดจตุจักร', place: 'hub_chatuchak', value: 260, art: { motif: 'hippo', palette: ['#8a8098', '#ff9fc0', '#fffaf0'] } },
  { id: 'hub_jj_blindbox', name: 'กล่องสุ่มลาบุ๊บลาบั๊บ', desc: 'ฟันเลื่อยยิ้มกว้าง จะได้สีไหนไม่รู้จนกว่าจะแกะ (พาโรดี้ ไม่ใช่ของแบรนด์จริงนะ)', rarity: 'rare', kind: 'toy', series: 'ของดีตลาดนัดจตุจักร', place: 'hub_chatuchak', value: 240, art: { motif: 'blindbox', palette: ['#c8a0ff', '#fffaf0', '#ff6f91'] } },
  { id: 'hub_jj_elephant_pants', name: 'พวงกุญแจกางเกงช้าง', desc: 'กางเกงช้างจิ๋วห้อยกระเป๋า ใส่แล้วสบายกระเป๋า', rarity: 'common', kind: 'keychain', series: 'ของดีตลาดนัดจตุจักร', place: 'hub_chatuchak', value: 45, art: { motif: 'elephant', palette: ['#6a4fb0', '#ffd23f', '#fffaf0'] } },
  { id: 'hub_jj_orange_cat', name: 'แม่เหล็กแมวส้มหนึ่งเซลล์', desc: 'แมวส้มทุกตัวใช้สมองร่วมกันหนึ่งก้อน วันนี้ตัวนี้ถือ', rarity: 'common', kind: 'magnet', series: 'ของดีตลาดนัดจตุจักร', place: 'hub_chatuchak', value: 40, art: { motif: 'cat', palette: ['#f58f35', '#fffaf0', '#3a2838'] } },
  // --- ตลาดน้ำดำเนินสะดวก ---
  { id: 'hub_dn_boat', name: 'เรือพายแม่ค้าจิ๋ว', desc: 'เรือไม้ลำเล็กพร้อมแม่ค้าใส่งอบ ผลไม้เต็มลำ', rarity: 'uncommon', kind: 'figure', series: 'ของดีตลาดน้ำดำเนินสะดวก', place: 'hub_damnoen', value: 110, art: { motif: 'boat', palette: ['#8a5a3a', '#5a8de0', '#ffd23f'] } },
  { id: 'hub_dn_ngob', name: 'เข็มกลัดงอบชาวสวน', desc: 'งอบสานใบลานกันแดดกันฝน ของคู่แม่ค้าตลาดน้ำ', rarity: 'common', kind: 'pin', series: 'ของดีตลาดน้ำดำเนินสะดวก', place: 'hub_damnoen', value: 35, art: { motif: 'hat', palette: ['#e0c080', '#9a6a45', '#fffaf0'] } },
  { id: 'hub_dn_monitor', name: 'ตุ๊กตาตัวเงินตัวทอง', desc: 'ว่ายข้ามคลองทีไร ทั้งตลาดตะโกนพร้อมกัน ตัวเงินตัวทอง!', rarity: 'rare', kind: 'plush', series: 'ของดีตลาดน้ำดำเนินสะดวก', place: 'hub_damnoen', value: 220, art: { motif: 'lizard', palette: ['#5e6a4a', '#ffd23f', '#3a3040'] } },
  { id: 'hub_dn_postcard', name: 'โปสการ์ดคลองดำเนินฯ', desc: 'ภาพเรือแน่นคลองยามเช้า หมอกบาง ๆ กับกลิ่นก๋วยเตี๋ยวเรือ', rarity: 'common', kind: 'postcard', series: 'ของดีตลาดน้ำดำเนินสะดวก', place: 'hub_damnoen', value: 30, art: { motif: 'canal', palette: ['#4aa0c8', '#8a5a3a', '#86c95f'] } },
  // --- ตลาดร่มหุบ แม่กลอง ---
  { id: 'hub_mk_train', name: 'รถไฟแม่กลองไขลาน', desc: 'ไขลานแล้ววิ่งผ่านตลาด ร่มจิ๋วหุบเองได้ (จริง ๆ ไม่ได้ แต่ลองจินตนาการ)', rarity: 'rare', kind: 'toy', series: 'ของดีตลาดร่มหุบ', place: 'hub_maeklong', value: 230, art: { motif: 'train', palette: ['#ffd23f', '#e8514a', '#5a8de0'] } },
  { id: 'hub_mk_umbrella', name: 'พวงกุญแจร่มหุบได้', desc: 'กางได้ หุบได้ เหมือนแม่ค้าตอนรถไฟมา', rarity: 'common', kind: 'keychain', series: 'ของดีตลาดร่มหุบ', place: 'hub_maeklong', value: 45, art: { motif: 'umbrella', palette: ['#e8514a', '#fffaf0', '#6e4a35'] } },
  { id: 'hub_mk_platu', name: 'แม่เหล็กปลาทูหน้างอคอหัก', desc: 'ปลาทูแม่กลองแท้ต้องหน้างอคอหัก ติดตู้เย็นแล้วหิวทุกครั้ง', rarity: 'uncommon', kind: 'magnet', series: 'ของดีตลาดร่มหุบ', place: 'hub_maeklong', value: 80, art: { motif: 'fish', palette: ['#9fb4c8', '#e0bb8a', '#3a3040'] } },
  // --- ถนนคนเดินเชียงใหม่ ---
  { id: 'hub_tp_gate', name: 'โมเดลประตูท่าแพ', desc: 'กำแพงอิฐแดงกับประตูไม้บานใหญ่ นกพิราบแถมไม่ได้', rarity: 'uncommon', kind: 'figure', series: 'ของดีถนนคนเดินเชียงใหม่', place: 'hub_thaphae', value: 120, art: { motif: 'gate', palette: ['#b8543a', '#6e4a35', '#fffaf0'] } },
  { id: 'hub_tp_lantern', name: 'โคมยี่เป็งจิ๋ว', desc: 'โคมล้านนาห้อยพู่ จุดไฟแล้วอบอุ่นใจ', rarity: 'common', kind: 'charm', series: 'ของดีถนนคนเดินเชียงใหม่', place: 'hub_thaphae', value: 50, art: { motif: 'lantern', palette: ['#ffcf5a', '#e8514a', '#fffaf0'] } },
  { id: 'hub_tp_bosang', name: 'ร่มบ่อสร้างวาดมือ', desc: 'ร่มกระดาษสาลายดอกไม้ วาดสด ๆ ต่อหน้า', rarity: 'rare', kind: 'figure', series: 'ของดีถนนคนเดินเชียงใหม่', place: 'hub_thaphae', value: 200, art: { motif: 'umbrella', palette: ['#ff9fc0', '#6cc36a', '#ffd23f'], foil: true } },
  // --- ตลาดกิมหยง ---
  { id: 'hub_ky_chicken', name: 'พวงกุญแจไก่ทอดหาดใหญ่', desc: 'ไก่ทอดโรยหอมเจียว กลิ่นไม่มี แต่ความหิวมีเต็ม', rarity: 'common', kind: 'keychain', series: 'ของดีตลาดกิมหยง', place: 'hub_kimyong', value: 45, art: { motif: 'chicken', palette: ['#d9782a', '#ffd23f', '#6e4a35'] } },
  { id: 'hub_ky_dates', name: 'กล่องอินทผลัมทองคำ', desc: 'กล่องทองลายดาว อินทผลัมเม็ดโตเรียงสวย', rarity: 'uncommon', kind: 'figure', series: 'ของดีตลาดกิมหยง', place: 'hub_kimyong', value: 90, art: { motif: 'dates', palette: ['#8a4a2a', '#ffd54f', '#fffaf0'] } },
  { id: 'hub_ky_market', name: 'สแตมป์ตลาดกิมหยง', desc: 'ตราประทับอาคารตลาดเก่าหาดใหญ่ ของสะสมนักช้อปข้ามแดน', rarity: 'common', kind: 'stamp', series: 'ของดีตลาดกิมหยง', place: 'hub_kimyong', value: 30, art: { motif: 'market', palette: ['#f0d890', '#e8514a', '#3a2838'] } },
  // --- ตลาดอินโดจีน มุกดาหาร ---
  { id: 'hub_ic_tower', name: 'หอแก้วมุกดาหารจิ๋ว', desc: 'หอคอยริมโขงยอดลูกแก้ว ส่องไปเห็นสะหวันนะเขต', rarity: 'uncommon', kind: 'snowglobe', series: 'ของดีตลาดอินโดจีน', place: 'hub_indochina', value: 130, art: { motif: 'tower', palette: ['#fffaf0', '#9fd0ff', '#ffd54f'] } },
  { id: 'hub_ic_silk', name: 'ผ้าไหมมัดหมี่ผืนจิ๋ว', desc: 'ลายขิดมัดหมี่ทอมือจากแม่ใหญ่ริมโขง', rarity: 'rare', kind: 'charm', series: 'ของดีตลาดอินโดจีน', place: 'hub_indochina', value: 210, art: { motif: 'silk', palette: ['#b8343f', '#ffd54f', '#3d63b5'] } },
  { id: 'hub_ic_naga', name: 'เข็มกลัดพญานาคริมโขง', desc: 'พญานาคเขียวมรกตเฝ้าแม่น้ำโขง', rarity: 'common', kind: 'pin', series: 'ของดีตลาดอินโดจีน', place: 'hub_indochina', value: 40, art: { motif: 'naga', palette: ['#43a86a', '#ffd54f', '#fffaf0'] } },
  // --- ตราประทับพาสปอร์ตตลาด (รางวัลเควส) ---
  { id: 'hub_passport_gold', name: 'พาสปอร์ตนักช้อปทองคำ', desc: 'ประทับครบทั้งหกตลาดดังทั่วไทย ตัวจริงเรื่องช้อป', rarity: 'epic', kind: 'stamp', series: 'พาสปอร์ตตลาดดัง', value: 600, art: { motif: 'passport', palette: ['#ffd54f', '#b8343f', '#fffaf0'], foil: true }, tradeable: false },
]

/**
 * Temple-fair collectibles (group `fair`, rewards only): prize-booth prizes
 * bought with tickets, claw-machine plushies, scooped goldfish and the
 * souvenirs of the rides, shows and the haunted house.
 */
export const FAIR_PRIZE_COLLECTIBLES: CollectibleDef[] = [
  { id: 'fair_goldfish', name: 'ปลาทองในถุงงานวัด', desc: 'ปลาทองตัวจิ๋วในถุงพลาสติกผูกหนังยาง รางวัลคลาสสิกของงานวัด', rarity: 'common', kind: 'toy', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 40, art: { motif: 'goldfish', palette: ['#f58f35', '#d4f1ff', '#ff6f91'] } },
  { id: 'fair_balloon_hippo', name: 'ลูกโป่งหมูดึ๋ง', desc: 'ลูกโป่งฮิปโปแคระลอยหงึกหงัก ผูกข้อมือไว้ไม่ให้ลอยหนี', rarity: 'uncommon', kind: 'toy', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 90, art: { motif: 'hippo', palette: ['#b4a8c8', '#ff9fc0', '#fffaf0'] } },
  { id: 'fair_teddy_pink', name: 'ตุ๊กตาหมีชมพูตัวยักษ์', desc: 'หมีตัวใหญ่กว่าคนถือ ต้องนั่งรถเมล์กลับบ้านสองที่', rarity: 'rare', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 180, art: { motif: 'teddy', palette: ['#ff9fc0', '#fffaf0', '#3a2838'] } },
  { id: 'fair_likay_doll', name: 'ตุ๊กตาพระเอกลิเก', desc: 'ชุดเลื่อมวิบวับ ขนนกฟู ร้องได้หนึ่งประโยค โอ้ละหนอ~', rarity: 'rare', kind: 'figure', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 200, art: { motif: 'likay', palette: ['#e8514a', '#ffd54f', '#6cf0c0'], foil: true } },
  { id: 'fair_ferris_globe', name: 'ลูกแก้วชิงช้าสวรรค์', desc: 'เขย่าแล้วไฟกระพริบ ชิงช้าหมุนเบา ๆ ในลูกแก้ว', rarity: 'epic', kind: 'snowglobe', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 360, art: { motif: 'ferriswheel', palette: ['#6a5a9a', '#ffd23f', '#ff6f91'], foil: true } },
  { id: 'fair_ghost_keychain', name: 'พวงกุญแจผีบ้านขี้ตกใจ', desc: 'ผีที่กลัวคนมากกว่าคนกลัวผี แตะแล้วร้องกรี๊ด', rarity: 'uncommon', kind: 'keychain', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 70, art: { motif: 'ghost', palette: ['#fffaf0', '#9fd0ff', '#3a2838'] } },
  { id: 'fair_uncle_duck', name: 'ฟิกเกอร์ลุงเป็ดตกน้ำ', desc: 'มาสคอตลุงเป็ดในชุดกันน้ำ ตกน้ำไปแล้ว 999 ครั้งยังยิ้มได้', rarity: 'rare', kind: 'figure', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 190, art: { motif: 'duck', palette: ['#ffd23f', '#f58f35', '#5a8de0'] } },
  { id: 'fair_mega_hippo', name: 'หมูดึ๋งไซส์จัมโบ้', desc: 'รางวัลใหญ่สุดของงาน ตุ๊กตาฮิปโปแคระตัวเท่าโซฟา คนทั้งงานปรบมือให้', rarity: 'legendary', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 900, art: { motif: 'hippo', palette: ['#8a8098', '#ff6f91', '#ffd54f'], foil: true }, tradeable: false },
  // --- ตุ๊กตาผ้ากำมะหยี่บนผนังรางวัล (plush art: src/art/plush.ts) ---
  { id: 'fair_plush_friedegg', name: 'ตุ๊กตาไข่ดาว', desc: 'ไข่ดาวขอบกรอบนุ่มนิ่มเหมือนหมอน ไข่แดงยิ้มตลอดเวลา ใช้หนุนนอนกลางวันได้', rarity: 'uncommon', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 110, art: { motif: 'friedegg', palette: ['#ffc21f', '#fffaf0', '#e0973a'] } },
  { id: 'fair_plush_elephant', name: 'ตุ๊กตาช้างน้อย', desc: 'ช้างน้อยหูกางใส่ผ้าคลุมหลังสีแดงขลิบทอง งวงม้วนขึ้นแปลว่าโชคดี', rarity: 'uncommon', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 130, art: { motif: 'elephant', palette: ['#a8b0c8', '#e8514a', '#ffd54f'] } },
  { id: 'fair_plush_rooster', name: 'ตุ๊กตาไก่ชนนำโชค', desc: 'ไก่ชนหงอนแดงหางเขียวเงา ขันเสียงดังทุกเช้า (ในใจ)', rarity: 'uncommon', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 140, art: { motif: 'rooster', palette: ['#e8603a', '#ffd23f', '#2f5a48'] } },
  { id: 'fair_plush_mookata', name: 'ตุ๊กตาหมูกระทะ', desc: 'เตาหมูกระทะหน้ายิ้ม มีหมูสามชิ้นกับน้ำซุปรอบ ๆ กอดแล้วได้กลิ่นเนย (ไม่จริง)', rarity: 'rare', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 200, art: { motif: 'mookata', palette: ['#9a9aae', '#f5909d', '#f8a860'] } },
  { id: 'fair_plush_labubun', name: 'ตุ๊กตาลาบูบุญตัวโต', desc: 'มอนสเตอร์หูกระต่ายฟันซี่เล็ก ยิ้มกวนเหมือนรู้ความลับของทั้งงาน', rarity: 'rare', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 240, art: { motif: 'monster', palette: ['#c9a0a0', '#fff1d6', '#e8709e'] } },
  { id: 'fair_plush_naga', name: 'ตุ๊กตาพญานาคน้อย', desc: 'พญานาคขดตัวกลมดิ๊ก หงอนทองอร่าม ปกป้องกระเป๋าเงินไม่ให้แฟบ', rarity: 'epic', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 380, art: { motif: 'naga', palette: ['#3fbf8a', '#fff6dc', '#ffd23f'], foil: true } },
  { id: 'fair_plush_bigcat', name: 'ตุ๊กตาแมวส้มยักษ์', desc: 'แมวส้มทรงขนมปังตัวเท่ากระสอบข้าว นอนแผ่ทั้งวัน ใครเห็นก็อยากซุก', rarity: 'epic', kind: 'plush', series: 'ของรางวัลงานวัด', place: 'fair_temple', value: 420, art: { motif: 'bigcat', palette: ['#f58f35', '#fff1d6', '#3a2838'], foil: true } },
  // --- ตู้คีบตุ๊กตา (claw machines, src/activities/fair/claw.ts) ---
  { id: 'fair_claw_hippo', name: 'หมูดึ๋งตู้คีบ', desc: 'หมูดึ๋งตัวจิ๋วที่คีบขึ้นมาได้ในครั้งที่สิบเจ็ด ภูมิใจที่สุดในชีวิต', rarity: 'common', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 60, art: { motif: 'hippo', palette: ['#b4a8c8', '#ff9fc0', '#fffaf0'] }, hint: 'คีบได้จากตู้คีบตุ๊กตาในงานวัด' },
  { id: 'fair_claw_cat', name: 'แมวส้มตู้คีบ', desc: 'แมวส้มนอนหลับอยู่ก้นตู้ คีบขึ้นมาก็ยังหลับอยู่', rarity: 'common', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 60, art: { motif: 'cat', palette: ['#f58f35', '#fffaf0', '#3a2838'] }, hint: 'คีบได้จากตู้คีบตุ๊กตาในงานวัด' },
  { id: 'fair_claw_frog', name: 'กบเขียวหน้างง', desc: 'กบที่ไม่รู้ว่าตัวเองมาอยู่ในตู้ได้ยังไง แต่ก็ยอม', rarity: 'common', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 60, art: { motif: 'frog', palette: ['#6cc36a', '#ffd23f', '#3a2838'] }, hint: 'คีบได้จากตู้คีบตุ๊กตาในงานวัด' },
  { id: 'fair_claw_mango', name: 'ตุ๊กตาข้าวเหนียวมะม่วง', desc: 'นุ่มฟูกลิ่นกะทิ (ในจินตนาการ) กอดแล้วหิว', rarity: 'uncommon', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 110, art: { motif: 'mango', palette: ['#ffd23f', '#fffaf0', '#6cc36a'] }, hint: 'คีบได้จากตู้คีบตุ๊กตาในงานวัด' },
  { id: 'fair_claw_dino', name: 'ไดโนน้อยคาดผ้าขาวม้า', desc: 'ไดโนเสาร์สายไทยแท้ คาดผ้าขาวม้าไปงานวัดทุกปี', rarity: 'uncommon', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 110, art: { motif: 'dino', palette: ['#6cc3a0', '#e8514a', '#fffaf0'] }, hint: 'คีบได้จากตู้คีบตุ๊กตาในงานวัด' },
  { id: 'fair_claw_turtle', name: 'เต่าน้อยนักคีบ', desc: 'เต่าที่หลุดจากก้ามคีบบ่อยที่สุด เพราะกระดองลื่น', rarity: 'rare', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 180, art: { motif: 'turtle', palette: ['#43905a', '#ffd23f', '#fffaf0'] }, hint: 'คีบได้จากตู้คีบตุ๊กตาในงานวัด (ตัวหายาก)' },
  { id: 'fair_claw_golden', name: 'หมูดึ๋งทองคำตู้คีบ', desc: 'ตัวลับสีทองที่อยู่ในตู้แค่ตัวเดียว ใครคีบได้ทั้งงานกรี๊ด', rarity: 'epic', kind: 'plush', series: 'ตุ๊กตาตู้คีบงานวัด', place: 'fair_temple', value: 380, art: { motif: 'hippo', palette: ['#ffd54f', '#ff6f91', '#fff3a6'], foil: true }, hint: 'ตัวลับในตู้คีบตุ๊กตา' },
  // --- ปลาทองจากซุ้มตักปลา (src/activities/fair/scoop.ts) ---
  { id: 'fair_goldfish_black', name: 'ปลาทองตาโปนดำ', desc: 'ตาโปนแป๋ว ว่ายช้าแต่ดูเท่ ชอบมองหน้าคนตัก', rarity: 'uncommon', kind: 'toy', series: 'ปลาทองตักได้', place: 'fair_temple', value: 90, art: { motif: 'goldfish', palette: ['#4a4058', '#d4f1ff', '#ffd23f'] }, hint: 'ตักได้ที่ซุ้มตักปลาในงานวัด' },
  { id: 'fair_goldfish_calico', name: 'ปลาทองสามสี', desc: 'ลายขาวส้มดำเหมือนแมวสามสี แต่ว่ายน้ำได้', rarity: 'rare', kind: 'toy', series: 'ปลาทองตักได้', place: 'fair_temple', value: 170, art: { motif: 'goldfish', palette: ['#fffaf0', '#f58f35', '#3a3048'] }, hint: 'ตักได้ที่ซุ้มตักปลาในงานวัด' },
  { id: 'fair_goldfish_lion', name: 'ปลาทองหัวสิงห์ทองคำ', desc: 'หัววุ้นฟูเหมือนสิงโต ว่ายวนในอ่างอย่างสง่างาม ตักได้คือเฮงทั้งปี', rarity: 'epic', kind: 'toy', series: 'ปลาทองตักได้', place: 'fair_temple', value: 360, art: { motif: 'goldfish', palette: ['#ffb33a', '#ff6f91', '#fff3a6'], foil: true }, hint: 'ตัวหายากในซุ้มตักปลา' },
  // --- ความทรงจำงานวัด (rides, shows, the haunted house) ---
  { id: 'fair_wheel_photo', name: 'รูปถ่ายบนยอดชิงช้าสวรรค์', desc: 'ถ่ายตอนพลุขึ้นพอดีเป๊ะ เบลอนิดหน่อยแต่ยิ้มสุด', rarity: 'uncommon', kind: 'postcard', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 100, art: { motif: 'ferriswheel', palette: ['#2e3a78', '#ffd23f', '#ff6f91'] }, hint: 'ขึ้นชิงช้าสวรรค์แล้วถ่ายรูปตอนอยู่บนยอด' },
  { id: 'fair_carousel_ring', name: 'ห่วงทองม้าหมุน', desc: 'คว้าได้ตอนม้าหมุนผ่านพอดี ตำนานว่าได้ขี่ฟรีตลอดชีวิต (ไม่จริง)', rarity: 'rare', kind: 'charm', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 200, art: { motif: 'goldring', palette: ['#ffd54f', '#e8514a', '#fff3a6'], foil: true }, hint: 'ขี่ม้าหมุนแล้วคว้าห่วงทอง' },
  { id: 'fair_brave_cert', name: 'ใบประกาศคนกล้าบ้านผีสิง', desc: 'มอบให้ผู้ที่เดินครบทุกห้องโดยกรี๊ดไม่เกินสิบครั้ง (ประมาณนั้น)', rarity: 'uncommon', kind: 'stamp', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 120, art: { motif: 'ghost', palette: ['#3a2a48', '#c8ff8a', '#fffaf0'] }, hint: 'เจอผีครบทุกตัวในบ้านผีสิง' },
  { id: 'fair_money_garland', name: 'มาลัยแบงก์แม่ยก', desc: 'พระเอกลิเกคล้องคืนให้พร้อมขยิบตาหนึ่งที แม่ยกทั้งแถวอิจฉา', rarity: 'rare', kind: 'charm', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 180, art: { motif: 'moneygarland', palette: ['#6cc36a', '#ffd54f', '#ff6f91'] }, hint: 'เชียร์ลิเกให้ตรงจังหวะท่าเก๊ก' },
  { id: 'fair_firework_pin', name: 'เข็มกลัดพลุงานวัด', desc: 'ที่ระลึกคืนพลุเต็มฟ้าเหนือโบสถ์ ปัง! ปัง!', rarity: 'common', kind: 'pin', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 50, art: { motif: 'firework', palette: ['#ff6f91', '#ffd23f', '#9fd0ff'] }, hint: 'ดูพลุงานวัดจนจบรอบ' },
  { id: 'fair_bumper_badge', name: 'เข็มกลัดราชารถบั๊มพ์', desc: 'สำหรับคนที่ชนคนอื่นเก่งที่สุดในลาน (เฉพาะในลานนะ)', rarity: 'uncommon', kind: 'pin', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 110, art: { motif: 'bumpercar', palette: ['#e8514a', '#ffd23f', '#9fd0ff'] }, hint: 'เล่นรถบั๊มพ์ได้สามดาว' },
  { id: 'fair_ramwong_fan', name: 'พัดรำวงลายดอกบัว', desc: 'พัดที่วงดนตรีลุงเสนาะมอบให้นักรำที่รำตรงจังหวะที่สุดของคืน', rarity: 'uncommon', kind: 'charm', series: 'ความทรงจำงานวัด', place: 'fair_temple', value: 110, art: { motif: 'fan', palette: ['#ff9fc0', '#ffd54f', '#e8514a'] }, hint: 'รำวงได้สามดาว' },
]

export const HUB_COLLECTIBLES: CollectibleDef[] = SOUVENIRS

/** Everything this group adds (souvenirs + fair prizes). */
export const COLLECTIBLES: CollectibleDef[] = [...SOUVENIRS, ...FAIR_PRIZE_COLLECTIBLES]

export const HUB_COLLECTIBLE_BY_ID: Record<string, CollectibleDef> = Object.fromEntries(COLLECTIBLES.map((c) => [c.id, c]))
