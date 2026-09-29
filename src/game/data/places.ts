// แผนที่ทำบุญทั่วไทย – real, famous merit-making places. Every place reuses
// one of the four playable scene templates (see areas.ts). Map positions are
// in pixels of the illustrated map (src/art/thaimap.ts): real places sit at
// their true latitude/longitude, nudged apart where pins would overlap;
// Bangkok's temples live in a magnified inset circle out in the gulf.

import { AREAS, type AreaId } from './areas'
import { CHAPTERS } from './prayers'

export type Region = 'north' | 'northeast' | 'central' | 'east' | 'west' | 'south' | 'bangkok'
export type SceneTemplate = AreaId
export type PlaceDeity = 'ganesha' | 'guanyin' | 'lakshmi' | 'brahma' | 'naga'

export interface Place {
  id: string
  /** Thai name as people say it. */
  name: string
  /** Short English name. */
  en: string
  province: string
  region: Region
  /** Pin position on the map art, in map pixels (the icon's base point). */
  x: number
  y: number
  /** Playable scene template this place uses. */
  scene: SceneTemplate
  deity?: PlaceDeity
  tagline: string
  about: string
  wishFor: string[]
  tip: string
  /** Total prayer stars needed to unlock. */
  stars: number
  /** Alternative unlock price in Boon Coins. */
  coins: number
  /** Merit multiplier. */
  bonus: number
  /** True location (for reference); absent for the fictional home areas. */
  lon?: number
  lat?: number
  /** Drawn inside the Bangkok inset circle. */
  inset?: boolean
  /** One of the original fictional areas near the player's home. */
  home?: boolean
  /** Hub market or temple fair (social hubs, drawn with a stall-style pin). */
  kind?: 'market' | 'fair'
}

// ---------------------------------------------------------------------------
// Map projection (equirectangular, shared with the map art)

export const MAP = {
  W: 378,
  H: 652,
  /** Frame thickness around the drawable map. */
  PAD: 10,
  /** Pixels per degree of latitude. */
  K: 40,
  LON0: 96.9,
  LAT0: 21.0,
  /** cos(13°) – longitude squeeze at Thailand's mean latitude. */
  COS: 0.974,
} as const

/** Longitude/latitude → map pixels. */
export function proj(lon: number, lat: number): [number, number] {
  return [(lon - MAP.LON0) * MAP.K * MAP.COS + MAP.PAD, (MAP.LAT0 - lat) * MAP.K + MAP.PAD]
}

/** Map pixels → longitude/latitude. */
export function unproj(x: number, y: number): [number, number] {
  return [(x - MAP.PAD) / (MAP.K * MAP.COS) + MAP.LON0, MAP.LAT0 - (y - MAP.PAD) / MAP.K]
}

/** The magnified Bangkok + hometown circle in the Gulf of Thailand. */
export const INSET = { cx: 185, cy: 428, r: 58 } as const
/** Where Bangkok is on the main map (the inset's leader lines start here). */
export const BANGKOK = (() => {
  const [x, y] = proj(100.51, 13.75)
  return { x: Math.round(x), y: Math.round(y) }
})()

const at = (lon: number, lat: number, dx = 0, dy = 0) => {
  const [x, y] = proj(lon, lat)
  return { lon, lat, x: Math.round(x + dx), y: Math.round(y + dy) }
}
const inset = (lon: number, lat: number, dx: number, dy: number) => ({ lon, lat, x: INSET.cx + dx, y: INSET.cy + dy, inset: true })

/** Coins scale with the star requirement. */
const price = (stars: number) => (stars === 0 ? 0 : Math.round((80 + stars * 16) / 10) * 10)

type Base = Omit<Place, 'coins' | 'x' | 'y'> & { x?: number; y?: number; coins?: number }

function place(p: Base & { x: number; y: number }): Place {
  return { ...p, coins: p.coins ?? price(p.stars) }
}

export const PLACES: Place[] = [
  // --- Bangkok (starters) --------------------------------------------------
  place({
    id: 'wat_phra_kaew',
    name: 'วัดพระแก้ว',
    en: 'Wat Phra Kaew · Emerald Buddha',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...inset(100.4927, 13.7516, -4, -30),
    scene: 'wat',
    tagline: 'กราบพระแก้วมรกต คู่บ้านคู่เมือง',
    about:
      'วัดพระศรีรัตนศาสดารามในเขตพระบรมมหาราชวัง ประดิษฐานพระพุทธมหามณีรัตนปฏิมากร (พระแก้วมรกต) พระพุทธรูปคู่บ้านคู่เมืองของไทย',
    wishFor: ['สิริมงคล', 'ความมั่นคง', 'การงาน'],
    tip: 'แต่งกายสุภาพ ห้ามกางเกงขาสั้นและเสื้อแขนกุด ควรไปช่วงเช้าก่อนคนเยอะ',
    stars: 0,
    bonus: 1,
  }),
  place({
    id: 'wat_pho',
    name: 'วัดโพธิ์',
    en: 'Wat Pho · Reclining Buddha',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...inset(100.493, 13.7465, -6, -8),
    scene: 'wat',
    tagline: 'หยอดเหรียญ 108 บาตร รับบุญเต็มอิ่ม',
    about:
      'วัดพระเชตุพนวิมลมังคลาราม มีพระพุทธไสยาส (พระนอน) ปิดทององค์ใหญ่ยาว 46 เมตร และเป็นแหล่งกำเนิดการนวดแผนไทย',
    wishFor: ['สุขภาพแข็งแรง', 'ความสงบร่มเย็น', 'โชคลาภ'],
    tip: 'ถอดรองเท้าก่อนเข้าวิหารพระนอน แลกเหรียญไว้หยอดบาตร 108 ใบเรียงรอบวิหาร',
    stars: 0,
    bonus: 1,
  }),
  place({
    id: 'wat_arun',
    name: 'วัดอรุณฯ',
    en: 'Wat Arun · Temple of Dawn',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...inset(100.4889, 13.7437, -31, -10),
    scene: 'river',
    tagline: 'รุ่งอรุณแห่งบุญ ริมเจ้าพระยา',
    about:
      'วัดอรุณราชวรารามริมฝั่งธนบุรี โดดเด่นด้วยพระปรางค์ประดับกระเบื้องเคลือบสีสันงดงาม เป็นสัญลักษณ์ของแม่น้ำเจ้าพระยา',
    wishFor: ['ชีวิตรุ่งโรจน์', 'การงานก้าวหน้า', 'ความสำเร็จ'],
    tip: 'นั่งเรือข้ามฟากจากท่าเตียน ไปช่วงเย็นจะเห็นพระปรางค์ต้องแสงสวยที่สุด',
    stars: 0,
    bonus: 1,
  }),
  place({
    id: 'erawan',
    name: 'ศาลพระพรหมเอราวัณ',
    en: 'Erawan Shrine · Four-faced Brahma',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...inset(100.5404, 13.7445, 37, -9),
    scene: 'shrine',
    deity: 'brahma',
    tagline: 'สี่พักตร์ ประทานพรทุกทิศ',
    about:
      'ศาลท้าวมหาพรหมที่แยกราชประสงค์ เป็นที่เคารพของทั้งคนไทยและชาวต่างชาติ นิยมขอพรและแก้บนด้วยพวงมาลัยและการรำถวาย',
    wishFor: ['สมหวังทุกด้าน', 'การงาน', 'ความรัก', 'โชคลาภ'],
    tip: 'ไหว้ให้ครบทั้งสี่พักตร์ เวียนตามเข็มนาฬิกาเริ่มจากด้านหน้า นิยมใช้ธูป 9 ดอกและพวงมาลัย 4 พวง',
    stars: 0,
    bonus: 1,
  }),
  place({
    id: 'golden_mount',
    name: 'วัดสระเกศ ภูเขาทอง',
    en: 'Wat Saket · Golden Mount',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...inset(100.5067, 13.7538, 22, -30),
    scene: 'mountain',
    tagline: 'ขึ้น 344 ขั้น ชีวิตก็สูงขึ้น',
    about:
      'วัดสระเกศราชวรมหาวิหาร มีบรมบรรพตหรือภูเขาทอง เจดีย์ทองบนเนินสูงที่ประดิษฐานพระบรมสารีริกธาตุ เดินขึ้นบันได 344 ขั้นชมวิวกรุงเทพฯ',
    wishFor: ['ชีวิตสูงขึ้น', 'การงานก้าวหน้า', 'สุขภาพ'],
    tip: 'ไปช่วงเย็นลมเย็นสบาย งานวัดภูเขาทองจัดราวเดือนพฤศจิกายน มีพิธีห่มผ้าแดงองค์เจดีย์',
    stars: 4,
    bonus: 1.05,
  }),
  place({
    id: 'wat_traimit',
    name: 'วัดไตรมิตรฯ',
    en: 'Wat Traimit · Golden Buddha',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...inset(100.5135, 13.7378, 20, -4),
    scene: 'wat',
    tagline: 'หลวงพ่อทองคำ ทองทั้งองค์ บุญทั้งใจ',
    about: 'วัดไตรมิตรวิทยารามย่านเยาวราช ประดิษฐานหลวงพ่อทองคำ พระพุทธรูปทองคำบริสุทธิ์หนักประมาณ 5.5 ตัน',
    wishFor: ['เงินทอง', 'ความมั่งคั่ง', 'ค้าขายรุ่งเรือง'],
    tip: 'ขึ้นไปกราบหลวงพ่อทองคำชั้นบนสุดของพระมหามณฑป แล้วเดินต่อไปกินของอร่อยเยาวราช',
    stars: 6,
    bonus: 1.05,
  }),

  // --- Central ---------------------------------------------------------------
  place({
    id: 'pathom_chedi',
    name: 'พระปฐมเจดีย์',
    en: 'Phra Pathom Chedi',
    province: 'นครปฐม',
    region: 'central',
    ...at(100.0601, 13.8199, -3, 0),
    scene: 'wat',
    tagline: 'เจดีย์แรก สูงที่สุดในสยาม',
    about:
      'เจดีย์ที่สูงที่สุดในประเทศไทย สูงราว 120 เมตร องค์ระฆังสีทองอร่าม เชื่อว่าเป็นจุดแรกที่พระพุทธศาสนาเข้าสู่ดินแดนสุวรรณภูมิ',
    wishFor: ['ความเป็นหนึ่ง', 'การเรียน', 'สิริมงคล'],
    tip: 'เดินเวียนประทักษิณรอบองค์เจดีย์ 3 รอบ แล้วลองชิมข้าวหลามนครปฐม',
    stars: 8,
    bonus: 1.05,
  }),
  place({
    id: 'wat_chulamanee',
    name: 'วัดจุฬามณี',
    en: 'Wat Chulamanee · Vessavana',
    province: 'สมุทรสงคราม',
    region: 'central',
    ...at(99.9936, 13.4097, -8, 6),
    scene: 'river',
    tagline: 'ท้าวเวสสุวรรณ ขอรวย ขอปัง',
    about:
      'วัดริมคลองอัมพวา มีรูปเคารพท้าวเวสสุวรรณ ยักษ์ผู้ดูแลทรัพย์สมบัติ คนนิยมมาขอพรเรื่องโชคลาภและให้ปัดเป่าสิ่งไม่ดี',
    wishFor: ['โชคลาภ', 'ป้องกันภัย', 'ค้าขาย'],
    tip: 'ไหว้ท้าวเวสสุวรรณแล้วไปเดินตลาดน้ำอัมพวาช่วงเย็นวันศุกร์ถึงอาทิตย์',
    stars: 12,
    bonus: 1.1,
  }),
  place({
    id: 'wat_phutthabat',
    name: 'วัดพระพุทธบาท',
    en: 'Wat Phra Phutthabat · Footprint',
    province: 'สระบุรี',
    region: 'central',
    ...at(100.7983, 14.7208, 4, -4),
    scene: 'mountain',
    tagline: 'กราบรอยพระพุทธบาท ตีระฆังรับบุญ',
    about:
      'ประดิษฐานรอยพระพุทธบาทในมณฑปยอดแหลมงดงาม ขึ้นบันไดนาคไปกราบ และนิยมตีระฆังที่เรียงรายรอบมณฑปเพื่อความเป็นสิริมงคล',
    wishFor: ['สิริมงคล', 'ความสุข', 'ครอบครัว'],
    tip: 'งานเทศกาลใหญ่จัดช่วงเดือนสามและเดือนสี่ (ราวกุมภาพันธ์–มีนาคม) ถ้าอยากเงียบสงบไปวันธรรมดา',
    stars: 16,
    bonus: 1.1,
  }),
  place({
    id: 'wat_mahathat_ayutthaya',
    name: 'วัดมหาธาตุ อยุธยา',
    en: 'Wat Mahathat · Ayutthaya',
    province: 'พระนครศรีอยุธยา',
    region: 'central',
    ...at(100.5675, 14.3571, -4, 2),
    scene: 'wat',
    tagline: 'เศียรพระในรากโพธิ์ ศรัทธาข้ามกาลเวลา',
    about:
      'โบราณสถานในอุทยานประวัติศาสตร์พระนครศรีอยุธยา มรดกโลก มีเศียรพระพุทธรูปหินทรายอยู่ในรากต้นโพธิ์ที่โด่งดังไปทั่วโลก',
    wishFor: ['ความสงบใจ', 'สติปัญญา', 'ความมั่นคง'],
    tip: 'ถ่ายรูปกับเศียรพระต้องนั่งหรือย่อตัวให้ต่ำกว่าเศียร ไปช่วงเช้าแดดยังไม่แรง',
    stars: 18,
    bonus: 1.1,
  }),

  // --- East ------------------------------------------------------------------
  place({
    id: 'wat_sothon',
    name: 'วัดโสธรวรารามฯ',
    en: 'Wat Sothon · Luang Pho Sothon',
    province: 'ฉะเชิงเทรา',
    region: 'east',
    ...at(101.0687, 13.6749, 0, 4),
    scene: 'river',
    tagline: 'หลวงพ่อโสธร ศักดิ์สิทธิ์ริมบางปะกง',
    about: 'ประดิษฐานหลวงพ่อพุทธโสธร พระพุทธรูปศักดิ์สิทธิ์ริมแม่น้ำบางปะกง ที่คนไทยนิยมมาขอพรและแก้บน',
    wishFor: ['สมหวัง', 'การงาน', 'ครอบครัว'],
    tip: 'นิยมแก้บนด้วยไข่ต้มและพวงมาลัย ไปวันธรรมดาคนน้อยกว่า',
    stars: 10,
    bonus: 1.05,
  }),
  place({
    id: 'wat_samarn',
    name: 'วัดสมานรัตนาราม',
    en: 'Wat Saman · Reclining Ganesha',
    province: 'ฉะเชิงเทรา',
    region: 'east',
    ...at(101.11, 13.73, 16, -10),
    scene: 'shrine',
    deity: 'ganesha',
    tagline: 'พระพิฆเนศองค์ชมพู ประทานพรไว',
    about:
      'มีพระพิฆเนศปางนอนเอกเขนกองค์สีชมพูขนาดใหญ่ ผู้คนนิยมขอพรโดยกระซิบที่หูหนูมูสิกะบริวารตามสีประจำวันเกิด',
    wishFor: ['ความสำเร็จ', 'การเรียน', 'งานศิลปะ', 'ความรัก'],
    tip: 'กระซิบคำขอที่หูหนูสีประจำวันเกิด แล้วเอามือปิดหูอีกข้างไว้ไม่ให้พรหลุด',
    stars: 14,
    bonus: 1.1,
  }),

  // --- West ------------------------------------------------------------------
  place({
    id: 'wat_huay_mongkol',
    name: 'วัดห้วยมงคล',
    en: 'Wat Huay Mongkol · Luang Pu Thuat',
    province: 'ประจวบคีรีขันธ์',
    region: 'west',
    ...at(99.84, 12.52, -4, 0),
    scene: 'wat',
    tagline: 'หลวงปู่ทวดองค์ใหญ่ เหยียบน้ำทะเลจืด',
    about: 'วัดใกล้หัวหิน มีรูปหล่อหลวงปู่ทวดองค์ใหญ่ที่สุดในโลก ผู้คนนิยมมาขอพรให้แคล้วคลาดและลอดท้องช้างเสริมสิริมงคล',
    wishFor: ['แคล้วคลาด', 'โชคลาภ', 'สุขภาพ'],
    tip: 'ลองลอดท้องช้างเพื่อความเป็นสิริมงคล แล้วแวะเที่ยวทะเลหัวหินต่อได้',
    stars: 20,
    bonus: 1.1,
  }),

  // --- North -----------------------------------------------------------------
  place({
    id: 'wat_yai_phitsanulok',
    name: 'วัดใหญ่ พระพุทธชินราช',
    en: 'Wat Yai · Phra Phuttha Chinnarat',
    province: 'พิษณุโลก',
    region: 'north',
    ...at(100.2603, 16.8261),
    scene: 'wat',
    tagline: 'พระพุทธชินราช งามที่สุดในแผ่นดิน',
    about:
      'วัดพระศรีรัตนมหาธาตุริมแม่น้ำน่าน ประดิษฐานพระพุทธชินราช พระพุทธรูปที่ได้ชื่อว่างดงามที่สุดในประเทศไทย',
    wishFor: ['ชนะอุปสรรค', 'การงาน', 'สุขภาพ'],
    tip: 'กราบพระแล้วแวะชิมก๋วยเตี๋ยวห้อยขาริมแม่น้ำน่าน แต่งกายสุภาพ',
    stars: 22,
    bonus: 1.15,
  }),
  place({
    id: 'doi_suthep',
    name: 'วัดพระธาตุดอยสุเทพ',
    en: 'Wat Phra That Doi Suthep',
    province: 'เชียงใหม่',
    region: 'north',
    ...at(98.9217, 18.8049, -2, 0),
    scene: 'mountain',
    tagline: 'ขึ้นบันไดนาค ไหว้พระธาตุคู่เมืองเชียงใหม่',
    about:
      'วัดบนดอยสุเทพคู่เมืองเชียงใหม่ ขึ้นบันไดนาค 306 ขั้นสู่พระบรมธาตุเจดีย์สีทองอร่าม เป็นพระธาตุประจำปีมะแม',
    wishFor: ['ชีวิตรุ่งเรือง', 'สุขภาพ', 'การงาน'],
    tip: 'เดินบันไดนาคหรือนั่งรถรางขึ้นก็ได้ เตรียมเสื้อคลุมเพราะบนดอยอากาศเย็น',
    stars: 24,
    bonus: 1.15,
  }),
  place({
    id: 'lampang_luang',
    name: 'วัดพระธาตุลำปางหลวง',
    en: 'Wat Phra That Lampang Luang',
    province: 'ลำปาง',
    region: 'north',
    ...at(99.3886, 18.2178, 2, 2),
    scene: 'wat',
    tagline: 'ล้านนางามล้ำ เงาพระธาตุกลับหัว',
    about:
      'วัดล้านนาโบราณที่งดงามสมบูรณ์ที่สุดแห่งหนึ่ง มีวิหารหลวงไม้แบบเปิดโล่ง และปรากฏการณ์เงาพระธาตุกลับหัวผ่านรูเล็กๆ ในหอพระพุทธบาท',
    wishFor: ['ความมั่นคง', 'สิริมงคล', 'ครอบครัว'],
    tip: 'ตามคติล้านนา ผู้หญิงไม่เข้าหอพระพุทธบาท (จุดชมเงาพระธาตุ) ควรเคารพข้อห้ามของวัด',
    stars: 27,
    bonus: 1.15,
  }),
  place({
    id: 'wat_rong_khun',
    name: 'วัดร่องขุ่น',
    en: 'Wat Rong Khun · White Temple',
    province: 'เชียงราย',
    region: 'north',
    ...at(99.7631, 19.8242, -8, 6),
    scene: 'wat',
    tagline: 'ขาวบริสุทธิ์ดั่งใจที่ทำบุญ',
    about:
      'วัดสีขาวประดับกระจกระยิบระยับ ผลงานของอาจารย์เฉลิมชัย โฆษิตพิพัฒน์ ศิลปินแห่งชาติ สื่อถึงความบริสุทธิ์ของพระพุทธศาสนา',
    wishFor: ['จิตใจบริสุทธิ์', 'แรงบันดาลใจ', 'ความสำเร็จ'],
    tip: 'ข้ามสะพานเข้าสู่อุโบสถแล้วห้ามเดินย้อนกลับ แต่งกายสุภาพ ไปช่วงเช้าแดดสะท้อนกระจกสวยมาก',
    stars: 30,
    bonus: 1.2,
  }),
  place({
    id: 'wat_huay_pla_kang',
    name: 'วัดห้วยปลากั้ง',
    en: 'Wat Huay Pla Kang · Guanyin',
    province: 'เชียงราย',
    region: 'north',
    ...at(99.8538, 19.9373, 12, -10),
    scene: 'shrine',
    deity: 'guanyin',
    tagline: 'เจ้าแม่กวนอิมองค์ใหญ่ เมตตาทั่วฟ้า',
    about:
      'มีองค์เจ้าแม่กวนอิมสีขาวขนาดใหญ่สูงเท่าตึก 25 ชั้น และเจดีย์ 9 ชั้นศิลปะล้านนาผสมจีน ขึ้นไปชมวิวได้ถึงภายในองค์เจ้าแม่',
    wishFor: ['เมตตามหานิยม', 'สุขภาพ', 'ครอบครัว'],
    tip: 'ไปช่วงเช้าหรือเย็นอากาศเย็นสบาย ถ้างดเนื้อสัตว์ก่อนไปไหว้เจ้าแม่ยิ่งเป็นมงคล',
    stars: 33,
    bonus: 1.2,
  }),
  place({
    id: 'wat_phumin',
    name: 'วัดภูมินทร์',
    en: 'Wat Phumin · Nan',
    province: 'น่าน',
    region: 'north',
    ...at(100.7717, 18.7757, 2, 0),
    scene: 'wat',
    tagline: 'กระซิบรักบันลือโลก ขอพรเรื่องหัวใจ',
    about:
      'วัดโบราณกลางเมืองน่าน อุโบสถจัตุรมุขมีพญานาคแบกไว้ ภายในมีจิตรกรรมฝาผนังปู่ม่านย่าม่าน หรือภาพกระซิบรักบันลือโลก',
    wishFor: ['ความรัก', 'คู่ครอง', 'ความสุข'],
    tip: 'ปั่นจักรยานชมเมืองเก่าน่านได้สบาย ไปช่วงหน้าหนาวอากาศดีมาก',
    stars: 36,
    bonus: 1.2,
  }),

  // --- Northeast (Isan) -----------------------------------------------------
  place({
    id: 'ya_mo',
    name: 'อนุสาวรีย์ย่าโม',
    en: 'Thao Suranari · Ya Mo',
    province: 'นครราชสีมา',
    region: 'northeast',
    ...at(102.1044, 14.9751),
    scene: 'shrine',
    tagline: 'ย่าโมคุ้มครอง วีรสตรีเมืองโคราช',
    about:
      'อนุสาวรีย์ท้าวสุรนารีหน้าประตูชุมพล ชาวโคราชนับถือย่าโมอย่างสูง นิยมมาขอพรและแก้บนด้วยการร้องเพลงโคราชหรือรำถวาย',
    wishFor: ['ความกล้าหาญ', 'การงาน', 'ความสำเร็จ'],
    tip: 'ถวายดอกไม้ธูปเทียน งานฉลองวันแห่งชัยชนะของท้าวสุรนารีจัดช่วงปลายมีนาคมถึงต้นเมษายน',
    stars: 39,
    bonus: 1.2,
  }),
  place({
    id: 'kham_chanod',
    name: 'คำชะโนด',
    en: 'Kham Chanod · Naga Forest',
    province: 'อุดรธานี',
    region: 'northeast',
    ...at(102.96, 17.61),
    scene: 'mountain',
    deity: 'naga',
    tagline: 'เมืองบาดาลของพญานาค',
    about:
      'ป่าเกาะกลางน้ำที่เต็มไปด้วยต้นชะโนด เชื่อกันว่าเป็นที่สถิตของพ่อปู่ศรีสุทโธและแม่ย่าศรีปทุมมา พญานาคผู้ประทานโชคลาภ',
    wishFor: ['โชคลาภ', 'การงาน', 'ความรัก'],
    tip: 'ถวายพานบายศรีและดอกไม้ แต่งกายสุภาพ สำรวมวาจา และเช็กเวลาเปิดปิดก่อนไป',
    stars: 42,
    bonus: 1.25,
  }),
  place({
    id: 'that_phanom',
    name: 'วัดพระธาตุพนม',
    en: 'Wat Phra That Phanom',
    province: 'นครพนม',
    region: 'northeast',
    ...at(104.7234, 16.9425, -4, 0),
    scene: 'river',
    tagline: 'องค์พระธาตุริมโขง ศรัทธาสองฝั่ง',
    about:
      'พระธาตุเจดีย์คู่บ้านคู่เมืองของชาวอีสานและลาวริมแม่น้ำโขง เชื่อกันว่าประดิษฐานพระอุรังคธาตุ (กระดูกส่วนหน้าอก) ของพระพุทธเจ้า',
    wishFor: ['สุขภาพ', 'โชคลาภ', 'ความสงบสุข'],
    tip: 'เป็นพระธาตุประจำปีวอก งานนมัสการพระธาตุพนมจัดช่วงเดือนสาม ราวกุมภาพันธ์',
    stars: 45,
    bonus: 1.25,
  }),

  // --- South -----------------------------------------------------------------
  place({
    id: 'nst_mahathat',
    name: 'วัดพระมหาธาตุฯ นครศรีธรรมราช',
    en: 'Wat Phra Mahathat · Nakhon Si Thammarat',
    province: 'นครศรีธรรมราช',
    region: 'south',
    ...at(99.9667, 8.4108, -2, 2),
    scene: 'wat',
    tagline: 'แห่ผ้าขึ้นธาตุ ศรัทธาปักษ์ใต้',
    about:
      'พระบรมธาตุเจดีย์ทรงระฆังคว่ำแบบลังกาอายุนับพันปี ยอดหุ้มทองคำ เป็นศูนย์รวมศรัทธาของชาวใต้ทั้งคาบสมุทร',
    wishFor: ['สิริมงคล', 'สุขภาพ', 'ครอบครัว'],
    tip: 'ประเพณีแห่ผ้าขึ้นธาตุจัดในวันมาฆบูชาและวิสาขบูชา แต่งกายสุภาพ',
    stars: 48,
    bonus: 1.25,
  }),
  place({
    id: 'ai_khai',
    name: 'วัดเจดีย์ (ไอ้ไข่)',
    en: 'Wat Chedi · Ai Khai',
    province: 'นครศรีธรรมราช',
    region: 'south',
    ...at(99.88, 8.95, -2, -2),
    scene: 'wat',
    tagline: 'ไอ้ไข่เด็กวัดเจดีย์ ขอแล้วได้ไว',
    about:
      'วัดดังอำเภอสิชล ประดิษฐานรูปเคารพไอ้ไข่ เด็กวัดผู้ศักดิ์สิทธิ์ ผู้คนนิยมมาขอโชคลาภและขอให้ได้ของหายคืน แล้วแก้บนด้วยไก่ชนปูนปั้นและประทัด',
    wishFor: ['โชคลาภ', 'ของหายได้คืน', 'ค้าขาย'],
    tip: 'แก้บนด้วยตุ๊กตาไก่ชน ชุดทหารหรือตำรวจเด็ก และของเล่น ไปวันธรรมดาคนน้อยกว่า',
    stars: 51,
    bonus: 1.25,
  }),
  place({
    id: 'wat_chalong',
    name: 'วัดฉลอง',
    en: 'Wat Chalong · Phuket',
    province: 'ภูเก็ต',
    region: 'south',
    ...at(98.3363, 7.8465, 8, 2),
    scene: 'wat',
    tagline: 'หลวงพ่อแช่ม ศรัทธาไข่มุกอันดามัน',
    about:
      'วัดไชยธารารามวัดสำคัญของภูเก็ต ประดิษฐานรูปหลวงพ่อแช่มที่ชาวภูเก็ตเคารพ และมีพระมหาธาตุเจดีย์ที่บรรจุพระบรมสารีริกธาตุ',
    wishFor: ['แคล้วคลาด', 'สุขภาพ', 'การงาน'],
    tip: 'ชาวบ้านนิยมจุดประทัดแก้บน เตรียมปิดหูไว้หน่อย และแต่งกายสุภาพ',
    stars: 54,
    bonus: 1.3,
  }),
  place({
    id: 'phuket_big_buddha',
    name: 'พระใหญ่ภูเก็ต',
    en: 'Big Buddha · Phuket',
    province: 'ภูเก็ต',
    region: 'south',
    ...at(98.3128, 7.8278, -14, 10),
    scene: 'mountain',
    tagline: 'พระใหญ่บนยอดเขา มองเห็นอันดามัน',
    about:
      'พระพุทธมิ่งมงคลเอกนาคคีรี พระพุทธรูปหินอ่อนสีขาวสูง 45 เมตรบนยอดเขานาคเกิด มองเห็นทะเลอันดามันและอ่าวฉลองได้รอบทิศ',
    wishFor: ['ความสงบใจ', 'สิริมงคล', 'เดินทางปลอดภัย'],
    tip: 'ถนนขึ้นเขาชัน ขับรถระวัง มีผ้าให้ยืมคลุม ไปช่วงเย็นชมพระอาทิตย์ตกทะเล',
    stars: 58,
    bonus: 1.3,
  }),

  // --- Hub markets and the temple fair (maps in src/scenes/maps/places/hub*.ts) ---
  place({
    id: 'hub_chatuchak',
    kind: 'market',
    name: 'ตลาดนัดจตุจักร',
    en: 'Chatuchak Weekend Market',
    province: 'กรุงเทพมหานคร',
    region: 'bangkok',
    ...at(100.55, 13.7998, 18, -14),
    scene: 'wat',
    tagline: 'ตลาดนัดที่ใหญ่ที่สุด เพื่อนเล่นออนไลน์เพียบ',
    about:
      'ตลาดนัดสุดสัปดาห์กว่าหมื่นห้าพันร้าน มีหอนาฬิกาเป็นจุดนัดพบกลางตลาด ทั้งเสื้อผ้าวินเทจ ต้นไม้ โซนสัตว์เลี้ยง ไอติมมะพร้าว และของไวรัลทุกยุค',
    wishFor: ['ช้อปปิ้ง', 'แลกของสะสม', 'เพื่อนใหม่'],
    tip: 'เปิดเสาร์–อาทิตย์ ไปช่วงเช้าอากาศเย็นกว่า หลงทางเมื่อไหร่ให้มองหาหอนาฬิกา',
    stars: 0,
    bonus: 1,
  }),
  place({
    id: 'hub_damnoen',
    kind: 'market',
    name: 'ตลาดน้ำดำเนินสะดวก',
    en: 'Damnoen Saduak Floating Market',
    province: 'ราชบุรี',
    region: 'west',
    ...at(99.956, 13.5186, -27, -9),
    scene: 'river',
    tagline: 'ซื้อของจากเรือ ก๋วยเตี๋ยวเรือส่งถึงมือ',
    about:
      'ตลาดน้ำเก่าแก่ริมคลองดำเนินสะดวก เรือพายของแม่ค้าใส่งอบบรรทุกผลไม้ ก๋วยเตี๋ยวเรือ และขนมครกแน่นคลองทุกเช้า',
    wishFor: ['ของกินอร่อย', 'ค้าขายรุ่งเรือง', 'แลกของสะสม'],
    tip: 'ไปก่อนเก้าโมงเช้าเรือแม่ค้าเยอะที่สุด ระวังตัวเงินตัวทองว่ายข้ามคลอง (ตะโกนได้)',
    stars: 4,
    bonus: 1,
  }),
  place({
    id: 'hub_maeklong',
    kind: 'market',
    name: 'ตลาดร่มหุบ แม่กลอง',
    en: 'Maeklong Railway Market',
    province: 'สมุทรสงคราม',
    region: 'central',
    ...at(99.998, 13.4072, 14, 30),
    scene: 'river',
    tagline: 'รถไฟมา แม่ค้าหุบร่ม!',
    about:
      'ตลาดสดริมทางรถไฟสายแม่กลอง แผงวางชิดราง เมื่อรถไฟมาแม่ค้าจะหุบร่มและกันสาดหลบภายในไม่กี่วินาที แล้วกางกลับเหมือนไม่มีอะไรเกิดขึ้น ปลาทูแม่กลองขึ้นชื่อที่สุด',
    wishFor: ['ปลาทูสด ๆ', 'ถ่ายรูปรถไฟ', 'แลกของสะสม'],
    tip: 'รถไฟเข้าสถานีราว 8:30 11:10 14:30 17:40 น. มาก่อนสัก 15 นาที แล้วยืนชิดแผงให้ดี',
    stars: 6,
    bonus: 1,
  }),
  place({
    id: 'hub_thaphae',
    kind: 'market',
    name: 'ถนนคนเดินท่าแพ',
    en: 'Tha Phae Gate Walking Street',
    province: 'เชียงใหม่',
    region: 'north',
    ...at(98.9933, 18.7877, 22, -4),
    scene: 'mountain',
    tagline: 'โคมล้านนาเต็มถนน งานคราฟต์ ข้าวซอย',
    about:
      'ถนนคนเดินวันอาทิตย์ตั้งแต่ประตูท่าแพเข้าไปตามถนนราชดำเนิน มีร่มบ่อสร้างวาดมือ งานไม้ ผ้าทอ ดนตรีเปิดหมวก ข้าวซอย และโคมล้านนาห้อยตลอดทาง',
    wishFor: ['งานคราฟต์', 'ของกินเมืองเหนือ', 'เพื่อนใหม่'],
    tip: 'เปิดวันอาทิตย์บ่ายสี่โมงถึงสี่ทุ่ม ตอนหกโมงเย็นทุกคนหยุดยืนเคารพเพลงชาติ',
    stars: 10,
    bonus: 1,
  }),
  place({
    id: 'hub_kimyong',
    kind: 'market',
    name: 'ตลาดกิมหยง',
    en: 'Kim Yong Market · Hat Yai',
    province: 'สงขลา',
    region: 'south',
    ...at(100.4733, 7.0056, 0, 0),
    scene: 'wat',
    tagline: 'ของแห้งข้ามแดน ไก่ทอดหาดใหญ่ อินทผลัม',
    about:
      'ตลาดเก่าใจกลางหาดใหญ่ ขึ้นชื่อเรื่องของแห้ง ถั่ว อินทผลัม ขนมจากมาเลเซีย และไก่ทอดหาดใหญ่โรยหอมเจียว นักท่องเที่ยวข้ามแดนแวะช้อปไม่ขาดสาย',
    wishFor: ['ของฝาก', 'ค้าขายรุ่งเรือง', 'แลกของสะสม'],
    tip: 'ชิมก่อนซื้อได้แทบทุกร้าน ต่อราคาอย่างสุภาพ พกถุงผ้าไปเยอะ ๆ',
    stars: 14,
    bonus: 1,
  }),
  place({
    id: 'hub_indochina',
    kind: 'market',
    name: 'ตลาดอินโดจีน',
    en: 'Indochina Market · Mukdahan',
    province: 'มุกดาหาร',
    region: 'northeast',
    ...at(104.7456, 16.5436, 4, 8),
    scene: 'river',
    tagline: 'ตลาดริมโขง ของสามประเทศ มองเห็นลาว',
    about:
      'ตลาดยาวริมเขื่อนแม่น้ำโขง ขายผ้าไหม ของใช้ ของเล่น และอาหารจากไทย ลาว เวียดนาม จีน ฝั่งตรงข้ามคือสะหวันนะเขต ใกล้หอแก้วมุกดาหาร',
    wishFor: ['ผ้าไหม', 'อาหารเวียดนาม', 'แลกของสะสม'],
    tip: 'ไปช่วงเย็นชมพระอาทิตย์ตกหลังฝั่งลาว แล้วต่อหมูกระทะริมโขง',
    stars: 18,
    bonus: 1,
  }),
  place({
    id: 'fair_temple',
    kind: 'fair',
    name: 'งานวัดศรีบุญดี',
    en: 'Temple Fair · Wat Si Boondee',
    province: 'บ้านเรา',
    region: 'bangkok',
    x: INSET.cx - 12,
    y: INSET.cy + 12,
    inset: true,
    scene: 'wat',
    tagline: 'ชิงช้าสวรรค์ ลิเก รำวง ซุ้มเกมแลกรางวัล',
    about:
      'งานประจำปีของวัดใกล้บ้าน ไฟระยิบระยับทั้งคืน มีชิงช้าสวรรค์ ม้าหมุน ลิเกเลื่อมวิบวับ รำวง ผีบ้าน และซุ้มปาลูกโป่ง โยนห่วง ยิงปืนจุก เก็บตั๋วไปแลกของรางวัล',
    wishFor: ['สนุกสนาน', 'ของรางวัล', 'ทำบุญ'],
    tip: 'งานวัดสนุกที่สุดตอนกลางคืน เก็บตั๋วจากซุ้มเกมไปแลกของที่ซุ้มรางวัลหน้างาน',
    stars: 0,
    bonus: 1,
  }),
]

// ---------------------------------------------------------------------------
// The original fictional areas, shown in the hometown half of the inset.

const homePin = (id: AreaId, dx: number, dy: number): Place => {
  const a = AREAS.find((x) => x.id === id)!
  const ch = CHAPTERS.find((c) => c.id === id)
  const bits: Record<AreaId, Pick<Place, 'tagline' | 'wishFor' | 'tip'>> = {
    wat: { tagline: 'วัดใกล้บ้าน อบอุ่นเหมือนบ้าน', wishFor: ['ความสุข', 'ครอบครัว', 'สุขภาพ'], tip: 'ตักบาตรตอนเช้า แล้วอย่าลืมทักทายน้องหมาวัดนะ' },
    shrine: { tagline: 'รวมเทพสี่องค์ ในลานเดียว', wishFor: ['ความสำเร็จ', 'ความรัก', 'เงินทอง'], tip: 'ไหว้ให้ครบทั้งสี่ศาล แล้วค่อยขอพรสิ่งที่ตั้งใจ' },
    river: { tagline: 'ตักบาตรทางเรือ ลอยกระทงขอพร', wishFor: ['ชีวิตราบรื่น', 'โชคลาภ', 'ความรัก'], tip: 'ไปตั้งแต่เช้าตรู่จะทันพระพายเรือมารับบาตร' },
    mountain: { tagline: 'เจดีย์ทองเหนือทะเลหมอก', wishFor: ['ความสงบใจ', 'สุขภาพ', 'การงาน'], tip: 'ขึ้นดอยตอนเช้าจะเห็นทะเลหมอก พกเสื้อกันหนาวไปด้วย' },
  }
  return {
    id,
    name: a.name,
    en: { wat: 'Wat Si Boondee', shrine: 'Deity Plaza', river: 'Riverside Temple', mountain: 'Mountain Temple' }[id],
    province: 'บ้านเรา',
    region: 'bangkok',
    x: INSET.cx + dx,
    y: INSET.cy + dy,
    scene: id,
    tagline: bits[id].tagline,
    about: a.desc,
    wishFor: bits[id].wishFor,
    tip: bits[id].tip,
    stars: ch?.stars ?? 0,
    coins: a.unlockPrice,
    bonus: a.meritBonus,
    inset: true,
    home: true,
  }
}

/** Pins for the four original areas; their ids equal the AreaId. */
export const HOME_PLACES: Record<AreaId, Place> = {
  wat: homePin('wat', -34, 26),
  river: homePin('river', -10, 34),
  shrine: homePin('shrine', 14, 28),
  mountain: homePin('mountain', 36, 22),
}

/** Every pin on the map: hometown areas first, then the real places. */
export const ALL_PLACES: Place[] = [...Object.values(HOME_PLACES), ...PLACES]

export const PLACE_BY_ID: Record<string, Place> = Object.fromEntries(ALL_PLACES.map((p) => [p.id, p]))

export const REGIONS: { id: Region; name: string; color: string }[] = [
  { id: 'bangkok', name: 'กรุงเทพฯ', color: '#ff9fc0' },
  { id: 'central', name: 'ภาคกลาง', color: '#c8e58a' },
  { id: 'north', name: 'ภาคเหนือ', color: '#8fd06c' },
  { id: 'northeast', name: 'ภาคอีสาน', color: '#f4c86a' },
  { id: 'east', name: 'ภาคตะวันออก', color: '#86d6c0' },
  { id: 'west', name: 'ภาคตะวันตก', color: '#dcc47c' },
  { id: 'south', name: 'ภาคใต้', color: '#5fc27c' },
]

export const REGION_BY_ID: Record<Region, { id: Region; name: string; color: string }> = Object.fromEntries(
  REGIONS.map((r) => [r.id, r]),
) as Record<Region, { id: Region; name: string; color: string }>

/** Which scene template a pin plays in. */
export function sceneFor(id: string): SceneTemplate | null {
  return PLACE_BY_ID[id]?.scene ?? null
}
