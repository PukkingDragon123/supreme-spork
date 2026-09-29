// ของตามฤดูกาล – each series only appears in shops during its season (see
// SEASON_WINDOWS in src/game/collectibles.ts). Out of season you can still
// find them in the player market.

import type { CollectibleDef, CollectibleGroup, CollectibleSeries } from '../collectibleTypes'

export const S_SONGKRAN = 'สงกรานต์ชุ่มฉ่ำ'
export const S_RAINY = 'หน้าฝนฉ่ำใจ'
export const S_KRATHONG = 'ลอยกระทงยี่เป็ง'
export const S_COOL = 'หน้าหนาวลมเย็น'
export const S_NEWYEAR = 'ปีใหม่สุขสันต์'
export const S_CNY = 'ตรุษจีนเฮงเฮง'

const ITEMS: CollectibleDef[] = [
  // สงกรานต์ (April)
  { id: 'cl_watergun_toy', name: 'ปืนฉีดน้ำหัวช้าง', desc: 'อาวุธประจำเดือนเมษา ยิงแม่นทุกนัด ยกเว้นตอนเล็งคนที่ถือขันใหญ่กว่า', rarity: 'common', kind: 'toy', series: S_SONGKRAN, season: 'songkran', value: 30, art: { motif: 'watergun', palette: ['#5a8de0', '#ffd54f', '#b3eef4'] } },
  { id: 'cl_khan_magnet', name: 'แม่เหล็กขันเงินลายไทย', desc: 'ขันรดน้ำดำหัวผู้ใหญ่ ติดตู้เย็นแล้วรู้สึกอยากไปขอพรคุณยาย', rarity: 'uncommon', kind: 'magnet', series: S_SONGKRAN, season: 'songkran', value: 60, art: { motif: 'khan', palette: ['#dfe3ea', '#a8a8b8', '#ffd54f'] } },
  { id: 'cl_flowershirt_pin', name: 'เข็มกลัดเสื้อลายดอก', desc: 'เสื้อลายดอกสีแสบตา ชุดประจำชาติช่วงสงกรานต์ ใส่แล้วหาเพื่อนเจอง่าย', rarity: 'common', kind: 'pin', series: S_SONGKRAN, season: 'songkran', value: 25, art: { motif: 'flowershirt', palette: ['#3fb8e8', '#ffd54f', '#ff5a8a'] } },
  { id: 'cl_splash_elephant', name: 'ช้างน้อยพ่นน้ำสงกรานต์', desc: 'ช้างสีฟ้าชูงวงพ่นน้ำ สายสาดตัวจริงต้องมีไว้ประจำบ้าน', rarity: 'rare', kind: 'figure', series: S_SONGKRAN, season: 'songkran', value: 160, art: { motif: 'elephant', palette: ['#78d2e2', '#ffd54f', '#b3eef4'] } },

  // หน้าฝน (June to mid-October)
  { id: 'cl_frog_keychain', name: 'พวงกุญแจกบร้องเรียกฝน', desc: 'กบเขียวอ้าปากกว้าง ร้องอ๊บ ๆ ทุกครั้งที่ฟ้าครึ้ม (ในจินตนาการ)', rarity: 'common', kind: 'keychain', series: S_RAINY, season: 'rainy', value: 25, art: { motif: 'frog', palette: ['#6cc36a', '#fff3a6', '#2f6f4b'] } },
  { id: 'cl_snail_toy', name: 'หอยทากสายชิล', desc: 'คลานช้า ๆ ใต้ใบบอน ไม่รีบไม่ร้อน ฝนตกก็ยังชิล', rarity: 'common', kind: 'toy', series: S_RAINY, season: 'rainy', value: 25, art: { motif: 'snail', palette: ['#e0bb8a', '#9fd0ff', '#c28e5c'] } },
  { id: 'cl_rain_umbrella', name: 'ชาร์มร่มกระดาษหน้าฝน', desc: 'ร่มจิ๋วสีสดกันฝนได้หนึ่งหยด หยดที่สองขอตัวก่อน', rarity: 'uncommon', kind: 'charm', series: S_RAINY, season: 'rainy', value: 55, art: { motif: 'umbrella', palette: ['#5a8de0', '#fffaf0', '#ffd54f'] } },
  { id: 'cl_rainbow_pin', name: 'เข็มกลัดสายรุ้งหลังฝน', desc: 'ฝนหยุดแล้วรุ้งมา ติดเสื้อแล้วอารมณ์ดีทั้งวัน', rarity: 'uncommon', kind: 'pin', series: S_RAINY, season: 'rainy', value: 55, art: { motif: 'rainbow', palette: ['#e8514a', '#ffd54f', '#5a8de0'] } },
  { id: 'cl_lent_candle', name: 'เทียนพรรษาแกะสลักจิ๋ว', desc: 'เทียนเข้าพรรษาลายกนกสีทอง จำลองจากขบวนแห่เมืองอุบลฯ', rarity: 'rare', kind: 'figure', series: S_RAINY, season: 'rainy', value: 170, art: { motif: 'candle', palette: ['#ffcf3a', '#e9a53a', '#fff3a6'] } },

  // ลอยกระทง / ยี่เป็ง (late Oct – Nov)
  { id: 'cl_krathong_figure', name: 'กระทงใบตองจิ๋ว', desc: 'กระทงพับมือมีธูปเทียนดอกไม้ครบ ลอยในใจได้ทุกคืนวันเพ็ญ', rarity: 'common', kind: 'figure', series: S_KRATHONG, season: 'loy_krathong', value: 30, art: { motif: 'krathong', palette: ['#5ea653', '#ff9fc0', '#ffd54f'] } },
  { id: 'cl_yipeng_lantern', name: 'ชาร์มโคมลอยยี่เป็ง', desc: 'โคมกระดาษสีส้มเรืองแสง ปล่อยความทุกข์ลอยไปกับลมหนาว', rarity: 'uncommon', kind: 'charm', series: S_KRATHONG, season: 'loy_krathong', value: 65, art: { motif: 'lantern', palette: ['#ffb03a', '#fff3a6', '#e8514a'] } },
  { id: 'cl_fullmoon_globe', name: 'สโนว์โกลบคืนวันเพ็ญ', desc: 'พระจันทร์ดวงโตกับกระทงลอยน้ำ เขย่าแล้วแสงระยิบบนผิวน้ำ', rarity: 'rare', kind: 'snowglobe', series: S_KRATHONG, season: 'loy_krathong', value: 170, art: { motif: 'moon', palette: ['#fff3a6', '#2c2f63', '#78d2e2'] } },

  // หน้าหนาว (Dec – Feb)
  { id: 'cl_mist_globe', name: 'สโนว์โกลบทะเลหมอก', desc: 'ยอดดอยโผล่พ้นหมอกยามเช้า เขย่าแล้วหนาวถึงใจ (ต้องใส่เสื้อกันหนาวดู)', rarity: 'rare', kind: 'snowglobe', series: S_COOL, season: 'cool', value: 170, art: { motif: 'mist', palette: ['#5ea653', '#fffaf0', '#a4dcff'] } },
  { id: 'cl_scarf_pin', name: 'เข็มกลัดผ้าพันคอไหมพรม', desc: 'ผ้าพันคอถักมือของคุณยาย ใส่ได้ปีละสองอาทิตย์ แต่ต้องมี', rarity: 'common', kind: 'pin', series: S_COOL, season: 'cool', value: 25, art: { motif: 'scarf', palette: ['#e8514a', '#fffaf0', '#6cc36a'] } },
  { id: 'cl_sakura_charm', name: 'ชาร์มดอกนางพญาเสือโคร่ง', desc: 'ซากุระเมืองไทยบานสีชมพูบนดอย ไม่ต้องบินไปญี่ปุ่นก็ได้ชม', rarity: 'uncommon', kind: 'charm', series: S_COOL, season: 'cool', value: 60, art: { motif: 'flower', palette: ['#ff9fc0', '#ffd6e0', '#e8709e'] } },

  // ปีใหม่ (late Dec – early Jan)
  { id: 'cl_firework_pin', name: 'เข็มกลัดพลุปีใหม่', desc: 'ตูมตาม! สวัสดีปีใหม่ ขอให้ปีนี้บุญเยอะกว่าปีที่แล้ว', rarity: 'common', kind: 'pin', series: S_NEWYEAR, season: 'new_year', value: 25, art: { motif: 'firework', palette: ['#ffd54f', '#ff5a8a', '#5a8de0'] } },
  { id: 'cl_calendar_magnet', name: 'แม่เหล็กปฏิทินวัดแจกฟรี', desc: 'ปฏิทินพระประจำปีที่ทุกบ้านต้องมี ได้มาฟรีแต่ศักดิ์สิทธิ์เกินราคา', rarity: 'common', kind: 'magnet', series: S_NEWYEAR, season: 'new_year', value: 25, art: { motif: 'calendar', palette: ['#fffaf0', '#e8514a', '#ffd54f'] } },
  { id: 'cl_gift_basket', name: 'กระเช้าปีใหม่จิ๋ว', desc: 'กระเช้าผลไม้ห่อพลาสติกใส ผูกโบว์แดง ให้ผู้ใหญ่แล้วได้อั่งเปากลับ', rarity: 'uncommon', kind: 'figure', series: S_NEWYEAR, season: 'new_year', value: 60, art: { motif: 'basket', palette: ['#c28e5c', '#e8514a', '#ffd54f'] } },

  // ตรุษจีน (mid Jan – Feb)
  { id: 'cl_angpao_pin', name: 'เข็มกลัดอั่งเปาทอง', desc: 'ซองแดงตัวอักษรทอง ข้างในว่างเปล่า แต่ความหวังเต็มซอง', rarity: 'common', kind: 'pin', series: S_CNY, season: 'chinese_new_year', value: 25, art: { motif: 'angpao', palette: ['#e8514a', '#ffd54f', '#b8343f'] } },
  { id: 'cl_orange_magnet', name: 'แม่เหล็กส้มมงคล', desc: 'ส้มสีทองคู่หนึ่ง ไหว้แล้วเฮง ๆ ปัง ๆ ตลอดปี', rarity: 'common', kind: 'magnet', series: S_CNY, season: 'chinese_new_year', value: 25, art: { motif: 'citrus', palette: ['#ffa53a', '#6cc36a', '#e8514a'] } },
  { id: 'cl_lion_charm', name: 'ชาร์มสิงโตเชิดโชคลาภ', desc: 'หัวสิงโตแดงทองกะพริบตาได้ เชิดรับทรัพย์ไปทั้งซอย', rarity: 'rare', kind: 'charm', series: S_CNY, season: 'chinese_new_year', value: 170, art: { motif: 'lion', palette: ['#e8514a', '#ffd54f', '#fffaf0'] } },
  { id: 'cl_gold_ingot', name: 'ก้อนทองไช่ซิงเอี๊ยะ', desc: 'ก้อนทองรูปเรือจากเทพเจ้าแห่งโชคลาภ วางไว้ที่แคชเชียร์แล้วลิ้นชักเต็ม', rarity: 'epic', kind: 'relic', series: S_CNY, season: 'chinese_new_year', value: 420, art: { motif: 'ingot', palette: ['#ffd54f', '#e8514a', '#fff3a6'] } },
]

export const SEASONAL_SERIES: CollectibleSeries[] = [
  { id: S_SONGKRAN, blurb: 'มีขายเฉพาะเดือนเมษายน', color: '#78d2e2', motif: 'watergun', order: 30 },
  { id: S_RAINY, blurb: 'มีขายช่วงหน้าฝน มิ.ย. – กลาง ต.ค.', color: '#86d6c0', motif: 'frog', order: 31 },
  { id: S_KRATHONG, blurb: 'มีขายช่วงลอยกระทง ปลาย ต.ค. – พ.ย.', color: '#ffbb66', motif: 'krathong', order: 32 },
  { id: S_COOL, blurb: 'มีขายช่วงหน้าหนาว ธ.ค. – ก.พ.', color: '#d4f1ff', motif: 'mist', order: 33 },
  { id: S_NEWYEAR, blurb: 'มีขายช่วงปีใหม่ 20 ธ.ค. – 10 ม.ค.', color: '#ffe45e', motif: 'firework', order: 34 },
  { id: S_CNY, blurb: 'มีขายช่วงตรุษจีน กลาง ม.ค. – ก.พ.', color: '#ff8a7a', motif: 'angpao', order: 35 },
]

export const SEASONAL_GROUP: CollectibleGroup = { id: 'seasonal', items: ITEMS, series: SEASONAL_SERIES }
