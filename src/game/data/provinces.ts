// ๗๗ จังหวัด – every Thai province for the "choose your home province" picker.
// Regions follow the game's own map regions (places.ts): the official six
// regions, with Bangkok on its own and the lower-north provinces
// (พิษณุโลก, สุโขทัย …) counted as ภาคเหนือ like on the temple map.

import type { Region } from './places'

export interface Province {
  id: string
  /** Thai name as people say it. */
  name: string
  region: Region
  /** ของดี: a signature food or craft. */
  good: string
  /** A famous sight or landmark. */
  sight: string
}

const P = (id: string, name: string, region: Region, good: string, sight: string): Province => ({ id, name, region, good, sight })

export const PROVINCES: Province[] = [
  // --- กรุงเทพฯ -----------------------------------------------------------------
  P('bangkok', 'กรุงเทพมหานคร', 'bangkok', 'ผัดไทยประตูผี', 'วัดพระแก้ว'),

  // --- ภาคกลาง -----------------------------------------------------------------
  P('nakhon_pathom', 'นครปฐม', 'central', 'ข้าวหลามนครชัยศรี', 'องค์พระปฐมเจดีย์'),
  P('nonthaburi', 'นนทบุรี', 'central', 'ทุเรียนนนท์', 'เกาะเกร็ด'),
  P('pathum_thani', 'ปทุมธานี', 'central', 'ข้าวหอมปทุม', 'วัดเจดีย์หอย'),
  P('ayutthaya', 'พระนครศรีอยุธยา', 'central', 'โรตีสายไหม', 'วัดมหาธาตุ'),
  P('ang_thong', 'อ่างทอง', 'central', 'ตุ๊กตาชาววัง', 'พระพุทธรูปใหญ่วัดม่วง'),
  P('lopburi', 'ลพบุรี', 'central', 'น้อยหน่าลพบุรี', 'พระปรางค์สามยอด'),
  P('sing_buri', 'สิงห์บุรี', 'central', 'ปลาช่อนแม่ลา', 'วัดพระนอนจักรสีห์'),
  P('chai_nat', 'ชัยนาท', 'central', 'ส้มโอขาวแตงกวา', 'สวนนกชัยนาท'),
  P('saraburi', 'สระบุรี', 'central', 'กะละแม', 'วัดพระพุทธบาท'),
  P('nakhon_nayok', 'นครนายก', 'central', 'มะยงชิด', 'น้ำตกสาริกา'),
  P('samut_prakan', 'สมุทรปราการ', 'central', 'ปลาสลิดบางบ่อ', 'เมืองโบราณ'),
  P('samut_songkhram', 'สมุทรสงคราม', 'central', 'ปลาทูแม่กลอง', 'ตลาดน้ำอัมพวา'),
  P('samut_sakhon', 'สมุทรสาคร', 'central', 'อาหารทะเลมหาชัย', 'ตลาดทะเลไทย'),
  P('suphan_buri', 'สุพรรณบุรี', 'central', 'สาลี่สุพรรณ', 'บึงฉวาก'),

  // --- ภาคเหนือ ----------------------------------------------------------------
  P('chiang_mai', 'เชียงใหม่', 'north', 'ข้าวซอย', 'ดอยสุเทพ'),
  P('chiang_rai', 'เชียงราย', 'north', 'ชาดอยแม่สลอง', 'วัดร่องขุ่น'),
  P('lampang', 'ลำปาง', 'north', 'ข้าวแต๋นน้ำแตงโม', 'รถม้าลำปาง'),
  P('lamphun', 'ลำพูน', 'north', 'ลำไยอบแห้ง', 'พระธาตุหริภุญชัย'),
  P('phrae', 'แพร่', 'north', 'ผ้าหม้อห้อม', 'พระธาตุช่อแฮ'),
  P('nan', 'น่าน', 'north', 'ส้มสีทอง', 'วัดภูมินทร์'),
  P('phayao', 'พะเยา', 'north', 'ปลาส้มกว๊าน', 'กว๊านพะเยา'),
  P('mae_hong_son', 'แม่ฮ่องสอน', 'north', 'ถั่วเน่าแผ่น', 'ปาย'),
  P('uttaradit', 'อุตรดิตถ์', 'north', 'ลางสาดลับแล', 'เมืองลับแล'),
  P('phitsanulok', 'พิษณุโลก', 'north', 'กล้วยตาก', 'พระพุทธชินราช'),
  P('sukhothai', 'สุโขทัย', 'north', 'ก๋วยเตี๋ยวสุโขทัย', 'อุทยานประวัติศาสตร์สุโขทัย'),
  P('phichit', 'พิจิตร', 'north', 'ส้มโอท่าข่อย', 'บึงสีไฟ'),
  P('kamphaeng_phet', 'กำแพงเพชร', 'north', 'กล้วยไข่', 'เมืองเก่ากำแพงเพชร'),
  P('phetchabun', 'เพชรบูรณ์', 'north', 'มะขามหวาน', 'ภูทับเบิก'),
  P('nakhon_sawan', 'นครสวรรค์', 'north', 'ขนมโมจิ', 'ต้นแม่น้ำเจ้าพระยา'),
  P('uthai_thani', 'อุทัยธานี', 'north', 'ปลาแรดสะแกกรัง', 'วัดท่าซุง'),

  // --- ภาคอีสาน ----------------------------------------------------------------
  P('nakhon_ratchasima', 'นครราชสีมา', 'northeast', 'ผัดหมี่โคราช', 'อนุสาวรีย์ย่าโม'),
  P('khon_kaen', 'ขอนแก่น', 'northeast', 'ไก่ย่างเขาสวนกวาง', 'ไดโนเสาร์ภูเวียง'),
  P('udon_thani', 'อุดรธานี', 'northeast', 'แหนมเนือง', 'ทะเลบัวแดง'),
  P('ubon_ratchathani', 'อุบลราชธานี', 'northeast', 'หมูยออุบล', 'แห่เทียนพรรษา'),
  P('buriram', 'บุรีรัมย์', 'northeast', 'ข้าวภูเขาไฟ', 'ปราสาทพนมรุ้ง'),
  P('surin', 'สุรินทร์', 'northeast', 'ผ้าไหมสุรินทร์', 'งานช้างสุรินทร์'),
  P('sisaket', 'ศรีสะเกษ', 'northeast', 'ทุเรียนภูเขาไฟ', 'วัดล้านขวด'),
  P('roi_et', 'ร้อยเอ็ด', 'northeast', 'ข้าวหอมมะลิทุ่งกุลา', 'พระมหาเจดีย์ชัยมงคล'),
  P('maha_sarakham', 'มหาสารคาม', 'northeast', 'ผ้าไหมมัดหมี่', 'พระธาตุนาดูน'),
  P('kalasin', 'กาฬสินธุ์', 'northeast', 'ผ้าไหมแพรวา', 'ไดโนเสาร์ภูกุ้มข้าว'),
  P('chaiyaphum', 'ชัยภูมิ', 'northeast', 'ผ้าไหมบ้านเขว้า', 'ทุ่งดอกกระเจียว'),
  P('loei', 'เลย', 'northeast', 'ผีตาโขนด่านซ้าย', 'ภูกระดึง'),
  P('nong_khai', 'หนองคาย', 'northeast', 'ปลาแม่น้ำโขง', 'บั้งไฟพญานาค'),
  P('bueng_kan', 'บึงกาฬ', 'northeast', 'ยางพารา', 'หินสามวาฬ'),
  P('nong_bua_lamphu', 'หนองบัวลำภู', 'northeast', 'ผ้าฝ้ายทอมือ', 'ถ้ำเอราวัณ'),
  P('sakon_nakhon', 'สกลนคร', 'northeast', 'ผ้าย้อมคราม', 'พระธาตุเชิงชุม'),
  P('nakhon_phanom', 'นครพนม', 'northeast', 'ไหลเรือไฟ', 'พระธาตุพนม'),
  P('mukdahan', 'มุกดาหาร', 'northeast', 'ตลาดอินโดจีน', 'หอแก้วมุกดาหาร'),
  P('yasothon', 'ยโสธร', 'northeast', 'หมอนขิด', 'บุญบั้งไฟ'),
  P('amnat_charoen', 'อำนาจเจริญ', 'northeast', 'ข้าวหอมมะลิ', 'พระมงคลมิ่งเมือง'),

  // --- ภาคตะวันออก -------------------------------------------------------------
  P('chonburi', 'ชลบุรี', 'east', 'ข้าวหลามหนองมน', 'หาดบางแสน'),
  P('rayong', 'ระยอง', 'east', 'น้ำปลาระยอง', 'เกาะเสม็ด'),
  P('chanthaburi', 'จันทบุรี', 'east', 'ทุเรียนจันท์', 'น้ำตกพลิ้ว'),
  P('trat', 'ตราด', 'east', 'สับปะรดตราดสีทอง', 'เกาะช้าง'),
  P('chachoengsao', 'ฉะเชิงเทรา', 'east', 'ข้าวเหนียวมะม่วงแปดริ้ว', 'หลวงพ่อโสธร'),
  P('prachin_buri', 'ปราจีนบุรี', 'east', 'ทุเรียนปราจีน', 'แก่งหินเพิง'),
  P('sa_kaeo', 'สระแก้ว', 'east', 'ตลาดโรงเกลือ', 'ปราสาทสด๊กก๊อกธม'),

  // --- ภาคตะวันตก --------------------------------------------------------------
  P('kanchanaburi', 'กาญจนบุรี', 'west', 'ล่องแพแม่น้ำแคว', 'สะพานข้ามแม่น้ำแคว'),
  P('tak', 'ตาก', 'west', 'ตลาดริมเมย', 'น้ำตกทีลอซู'),
  P('ratchaburi', 'ราชบุรี', 'west', 'โอ่งมังกร', 'ตลาดน้ำดำเนินสะดวก'),
  P('phetchaburi', 'เพชรบุรี', 'west', 'ขนมหม้อแกง', 'พระนครคีรี'),
  P('prachuap', 'ประจวบคีรีขันธ์', 'west', 'สับปะรดสามร้อยยอด', 'หัวหิน'),

  // --- ภาคใต้ ------------------------------------------------------------------
  P('nakhon_si_thammarat', 'นครศรีธรรมราช', 'south', 'ขนมลา', 'วัดพระมหาธาตุ'),
  P('phuket', 'ภูเก็ต', 'south', 'หมี่ฮกเกี้ยน', 'เมืองเก่าภูเก็ต'),
  P('surat_thani', 'สุราษฎร์ธานี', 'south', 'หอยนางรม', 'เกาะสมุย'),
  P('songkhla', 'สงขลา', 'south', 'ไก่ทอดหาดใหญ่', 'หาดสมิหลา'),
  P('krabi', 'กระบี่', 'south', 'ผ้าบาติก', 'ทะเลแหวก'),
  P('phang_nga', 'พังงา', 'south', 'กะปิเกาะปันหยี', 'เขาตะปู'),
  P('trang', 'ตรัง', 'south', 'หมูย่างเมืองตรัง', 'ถ้ำมรกต'),
  P('phatthalung', 'พัทลุง', 'south', 'ข้าวสังข์หยด', 'ทะเลน้อย'),
  P('satun', 'สตูล', 'south', 'โรตีชาชัก', 'เกาะหลีเป๊ะ'),
  P('chumphon', 'ชุมพร', 'south', 'กาแฟชุมพร', 'หาดทรายรี'),
  P('ranong', 'ระนอง', 'south', 'เม็ดมะม่วงหิมพานต์', 'บ่อน้ำร้อนรักษะวาริน'),
  P('pattani', 'ปัตตานี', 'south', 'ไก่กอและ', 'มัสยิดกรือเซะ'),
  P('yala', 'ยะลา', 'south', 'ไก่เบตง', 'ทะเลหมอกอัยเยอร์เวง'),
  P('narathiwat', 'นราธิวาส', 'south', 'ปลากุเลาเค็มตากใบ', 'หาดนราทัศน์'),
]

export const PROVINCE_BY_ID: Record<string, Province> = Object.fromEntries(PROVINCES.map((p) => [p.id, p]))

/** Region order for the picker tabs (same order as the map's REGIONS list). */
export const PROVINCE_REGIONS: Region[] = ['bangkok', 'central', 'north', 'northeast', 'east', 'west', 'south']

export function provincesOf(region: Region): Province[] {
  return PROVINCES.filter((p) => p.region === region)
}

/** Loose Thai search: ignores spaces and matches name, ของดี or landmark. */
export function searchProvinces(q: string): Province[] {
  const k = q.replace(/\s+/g, '').trim()
  if (!k) return PROVINCES
  return PROVINCES.filter((p) => p.name.includes(k) || p.good.replace(/\s+/g, '').includes(k) || p.sight.replace(/\s+/g, '').includes(k) || p.id.includes(k.toLowerCase()))
}
