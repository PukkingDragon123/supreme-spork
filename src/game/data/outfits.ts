// Wardrobe catalogue. Visual fields drive both avatar renderers (the small
// 16×27 world sprite in art/avatar.ts and the HD doll in art/doll.ts); shop
// fields drive the wardrobe screen. Prices are in Boon Coins.

import { DAY_COLORS } from '../../art/palette'

export type Slot = 'hair' | 'top' | 'bottom' | 'shoes' | 'head' | 'neck' | 'hand'

/** Shop grouping for the wardrobe UI. */
export type OutfitCategory = 'school' | 'thai' | 'modern' | 'temple' | 'accessory'

export type Pattern =
  | 'none'
  | 'dots'
  | 'floral'
  | 'plaid'
  | 'stripes'
  | 'thai'
  | 'elephant'
  | 'lace'
  | 'check'
  /** Big hibiscus flowers and leaves (Hawaiian / ลายดอก shirt). */
  | 'hawaii'
  /** Thai silk shimmer. */
  | 'silk'
  /** Denim twill. */
  | 'denim'
  /** Knit / heather texture. */
  | 'knit'

export type Collar =
  /** Round tee neckline. */
  | 'crew'
  | 'v'
  /** Pointed shirt collar (school shirt, uni shirt). */
  | 'shirt'
  /** Big round flat collar of the Thai girls' school blouse (คอบัว). */
  | 'bua'
  /** Stand collar (ราชปะแตน, เสื้อพระราชทาน, ชุดไทยจิตรลดา). */
  | 'mandarin'
  | 'polo'
  /** Hood lying around the neck. */
  | 'hood'
  /** Football-jersey V with contrast trim. */
  | 'jersey'
  /** Open camp collar (Hawaiian shirt). */
  | 'camp'
  | 'none'

export interface JacketArt {
  kind: 'denim' | 'varsity' | 'cardigan' | 'sukajan' | 'blazer'
  main: string
  shade: string
  /** Ribbing / collar / piping colour. */
  trim?: string
  /** Contrast sleeves (varsity). */
  sleeve?: string
  sleeveShade?: string
  pattern?: Pattern
  patternColor?: string
  /** Embroidery on the chest (front) and big on the back. */
  emblem?: 'naga' | 'letter' | 'lotus'
  emblemColor?: string
  emblemColor2?: string
}

export interface TopArt {
  main: string
  shade: string
  trim?: string
  sleeve: 'short' | 'long' | 'none'
  pattern?: Pattern
  patternColor?: string
  patternColor2?: string
  /** Special overlay drawn on the torso. */
  extra?: 'sabai' | 'buttons' | 'overalls' | 'hood' | 'logo' | 'sash'
  extraColor?: string
  /** Colour index into DAY_COLORS if this top counts as a lucky colour. */
  dayColor?: number

  // ---- detail params (shared by both renderers) ----
  collar?: Collar
  /** Collar colour (defaults to a lighter main / trim). */
  collarColor?: string
  /** Front opening: full button placket, half placket (polo) or zip. */
  placket?: 'buttons' | 'half' | 'zip'
  buttonColor?: string
  pocket?: 'chest' | 'chest2' | 'kangaroo' | 'lower2'
  /** Embroidered school initials (ปักอักษรย่อ), a uni crest or a football crest. */
  emblem?: 'school' | 'crest'
  emblemColor?: string
  /** Which chest the emblem sits on, as seen by the viewer. Default 'r'. */
  emblemSide?: 'l' | 'r'
  /** Embroidered name line (ปักชื่อ). */
  nameTag?: boolean
  tie?: 'tie' | 'bow' | 'scarf'
  tieColor?: string
  tieColor2?: string
  /** Colour of a pin / brooch (เข็มกลัด). */
  pin?: string
  /** Jersey number, big on the back, small on the front. */
  number?: string
  numberColor?: string
  graphic?: 'lotus' | 'boon' | 'heart' | 'elephant' | 'star'
  graphicColor?: string
  graphicColor2?: string
  /** Open jacket / cardigan layered over this top (main/shade = inner tee). */
  jacket?: JacketArt
  fit?: 'regular' | 'fitted' | 'oversized'
  /** Tucked into the bottom, worn out over the waistband, or long (hoodies). */
  hem?: 'tucked' | 'out' | 'long'
  /** Cuff / sleeve-hem colour. */
  cuff?: string
  /** Side trim stripes (jerseys, tracksuits). */
  stripe?: string
  /** Shoulder epaulettes (scout shirt). */
  epaulets?: boolean
}

export interface BottomArt {
  /** 'pleated' = pleated skirt, 'skirt' = A-line/flared skirt. */
  kind: 'pants' | 'skirt' | 'sarong' | 'jong' | 'loose' | 'shorts' | 'pleated'
  main: string
  shade: string
  pattern?: Pattern
  patternColor?: string
  hem?: string
  /** Leg / hem length. Defaults: pants long, shorts short, skirts long. */
  length?: 'mini' | 'short' | 'knee' | 'midi' | 'long'
  belt?: string
  buckle?: string
  detail?: 'denim' | 'cargo' | 'jogger' | 'crease' | 'fray'
  /** Contrast stitching (jeans). */
  stitch?: string
  /** Side stripe (track pants). */
  stripe?: string
}

export interface ShoeArt {
  kind: 'shoe' | 'sneaker' | 'hightop' | 'flipflop' | 'sandal' | 'maryjane'
  main: string
  shade: string
  sole?: string
  accent?: string
  /** Sock colour, or omitted for none. */
  sock?: string
  /** Sock height in rows above the shoe (HD doll). */
  sockH?: number
}

export interface OutfitItem {
  id: string
  slot: Slot
  name: string
  desc: string
  price: number
  /** Unlocked from the start. */
  starter?: boolean
  /** Only obtainable from a purchase pack. */
  premium?: boolean
  level?: number
  /** Shop grouping. */
  category?: OutfitCategory
  /** Styling hint only – every item can be worn by everyone. */
  gender?: 'm' | 'f'
  top?: TopArt
  bottom?: BottomArt
  shoes?: ShoeArt
  /** Hair style key for slot 'hair'. */
  hair?: string
  /** Accessory art key for head/neck/hand slots. */
  acc?: string
  tags?: string[]
}

const W = '#fffaf0'
const WS = '#e6dccb'
/** Crisp school white (a little cooler than the cream temple white). */
const SW = '#fbfcff'
const SWS = '#d9dfec'
const NAVY = '#2e3a6b'
const NAVYS = '#212a52'
const EMB = '#3d63b5'

const dayTops: OutfitItem[] = DAY_COLORS.map((c, i) => ({
  id: `top_day${i}`,
  slot: 'top' as const,
  name: `เสื้อสี${c.name}`,
  desc: `สีประจำวัน${c.day} ใส่ตรงวันรับบุญเพิ่ม 10%`,
  price: 30,
  category: 'temple' as const,
  top: { main: c.hex, shade: c.shade, trim: c.light, sleeve: 'short' as const, dayColor: i, collar: 'polo' as const, placket: 'half' as const, collarColor: c.light },
  tags: ['lucky'],
}))

export const OUTFITS: OutfitItem[] = [
  // ======================================================================
  // Hair styles
  { id: 'hair_bob', slot: 'hair', name: 'ผมบ๊อบหน้าม้า', desc: 'ทรงยอดฮิต น่ารักสดใส', price: 0, starter: true, hair: 'bob', gender: 'f', category: 'modern' },
  { id: 'hair_short', slot: 'hair', name: 'ผมสั้นเท่ ๆ', desc: 'สั้นกระชับ ไปวัดสบาย', price: 0, starter: true, hair: 'short', gender: 'm', category: 'modern' },
  { id: 'hair_long', slot: 'hair', name: 'ผมยาวสลวย', desc: 'ยาวตรงเงางาม', price: 0, starter: true, hair: 'long', gender: 'f', category: 'modern' },
  { id: 'hair_twoblock', slot: 'hair', name: 'ผมสองบล็อก', desc: 'ทรงเกาหลีสุดฮิต ด้านข้างสั้นเกรียน', price: 0, starter: true, hair: 'twoblock', gender: 'm', category: 'modern' },
  { id: 'hair_buzz', slot: 'hair', name: 'ผมเกรียนนักเรียน', desc: 'เกรียนสามด้าน ถูกระเบียบครูปกครอง', price: 0, starter: true, hair: 'buzz', gender: 'm', category: 'school' },
  { id: 'hair_schoolgirl', slot: 'hair', name: 'ผมนักเรียนติ่งหู', desc: 'สั้นเสมอติ่งหู หน้าม้าซีทรู ติดกิ๊บคู่', price: 0, starter: true, hair: 'schoolgirl', gender: 'f', category: 'school' },
  { id: 'hair_ponytail', slot: 'hair', name: 'ผมหางม้า', desc: 'มัดสูงสะบัดได้ พร้อมโดดเล่นสงกรานต์', price: 0, starter: true, hair: 'ponytail', gender: 'f', category: 'modern' },
  { id: 'hair_curtain', slot: 'hair', name: 'ผมแสกกลาง', desc: 'หน้าม้าผ้าม่านแสกกลาง ลุคไอดอล', price: 60, hair: 'curtain', gender: 'm', category: 'modern' },
  { id: 'hair_bun', slot: 'hair', name: 'ผมมวยสูง', desc: 'มวยกลมบนหัว เรียบร้อยน่ารัก', price: 40, hair: 'bun', gender: 'f', category: 'temple' },
  { id: 'hair_twin', slot: 'hair', name: 'ผมแกละ', desc: 'ผมแกละสองข้างแบบเด็กไทย', price: 40, hair: 'twin', gender: 'f', category: 'thai' },
  { id: 'hair_braid', slot: 'hair', name: 'ผมเปียข้าง', desc: 'ถักเปียพาดไหล่ หวานแบบสาวเหนือ', price: 60, hair: 'braid', gender: 'f', category: 'thai' },
  { id: 'hair_wavy', slot: 'hair', name: 'ผมยาวลอนคลื่น', desc: 'ลอนใหญ่พลิ้วสวย เหมือนเพิ่งออกจากร้าน', price: 80, hair: 'wavy', gender: 'f', category: 'modern', level: 2 },
  { id: 'hair_curly', slot: 'hair', name: 'ผมหยิกฟูฟ่อง', desc: 'หยิกฟูนุ่มนิ่ม มีเสน่ห์ไม่ซ้ำใคร', price: 70, hair: 'curly', category: 'modern', level: 2 },
  { id: 'hair_jook', slot: 'hair', name: 'ผมจุก', desc: 'ผมจุกผูกดอกมะลิ แบบไทยโบราณ', price: 90, hair: 'jook', level: 4, category: 'thai' },

  // ======================================================================
  // Tops – temple basics
  {
    id: 'top_white',
    slot: 'top',
    name: 'เสื้อขาวไปวัด',
    desc: 'เสื้อขาวสะอาดตา แต่งกายสุภาพ',
    price: 0,
    starter: true,
    category: 'temple',
    top: { main: W, shade: WS, trim: '#f3dcb2', sleeve: 'short', collar: 'shirt', placket: 'buttons', buttonColor: '#efe4d2', hem: 'out' },
  },
  {
    id: 'top_lace',
    slot: 'top',
    name: 'เสื้อลูกไม้ขาว',
    desc: 'ปกลูกไม้ละมุน ใส่ทำบุญวันพระ',
    price: 45,
    category: 'temple',
    gender: 'f',
    top: { main: W, shade: WS, trim: '#ffd6e0', sleeve: 'long', pattern: 'lace', patternColor: '#f0e2d0', collar: 'bua', collarColor: '#fff6f8', hem: 'out' },
  },
  ...dayTops,

  // ---- school uniforms ----
  {
    id: 'top_school_m',
    slot: 'top',
    name: 'เสื้อนักเรียนชาย',
    desc: 'เชิ้ตขาวแขนสั้น ปักอักษรย่อสีน้ำเงินที่กระเป๋า',
    price: 0,
    starter: true,
    category: 'school',
    gender: 'm',
    top: { main: SW, shade: SWS, sleeve: 'short', collar: 'shirt', placket: 'buttons', buttonColor: '#e8ecf5', pocket: 'chest', emblem: 'school', emblemColor: EMB, nameTag: true, hem: 'tucked' },
  },
  {
    id: 'top_school_f',
    slot: 'top',
    name: 'เสื้อนักเรียนหญิงคอบัว',
    desc: 'คอบัวผูกโบว์กรมท่า ใส่แล้วสดใสวัยเรียน',
    price: 0,
    starter: true,
    category: 'school',
    gender: 'f',
    top: { main: SW, shade: SWS, sleeve: 'short', collar: 'bua', tie: 'bow', tieColor: NAVY, tieColor2: NAVYS, emblem: 'school', emblemColor: EMB, emblemSide: 'l', nameTag: true, hem: 'out' },
  },
  {
    id: 'top_uni_m',
    slot: 'top',
    name: 'ชุดนักศึกษาชาย',
    desc: 'เชิ้ตขาวแขนยาว ผูกเนกไทสีกรมเข้ม พร้อมรับปริญญา',
    price: 80,
    category: 'school',
    gender: 'm',
    top: { main: SW, shade: SWS, sleeve: 'long', collar: 'shirt', placket: 'buttons', buttonColor: '#e8ecf5', tie: 'tie', tieColor: '#2a2f55', tieColor2: '#1b1f3d', hem: 'tucked' },
  },
  {
    id: 'top_uni_f',
    slot: 'top',
    name: 'เสื้อนักศึกษาหญิง',
    desc: 'เสื้อเข้ารูปกระดุมเงิน ติดเข็มกลัดมหาวิทยาลัย',
    price: 80,
    category: 'school',
    gender: 'f',
    top: { main: SW, shade: SWS, sleeve: 'short', collar: 'shirt', placket: 'buttons', buttonColor: '#b9bccb', pin: '#e9b949', fit: 'fitted', hem: 'tucked' },
  },
  {
    id: 'top_scout',
    slot: 'top',
    name: 'ชุดลูกเสือ',
    desc: 'เสื้อกากีผูกผ้าพันคอ เตรียมพร้อมเสมอ!',
    price: 90,
    level: 2,
    category: 'school',
    gender: 'm',
    top: { main: '#c9a66b', shade: '#a58550', sleeve: 'short', collar: 'shirt', placket: 'buttons', buttonColor: '#8a6a3a', pocket: 'chest2', tie: 'scarf', tieColor: '#ffd23f', tieColor2: '#e8514a', epaulets: true, hem: 'tucked' },
  },
  {
    id: 'top_guide',
    slot: 'top',
    name: 'ชุดเนตรนารี',
    desc: 'เสื้อสีน้ำเงินผ้าพันคอฟ้า ใจอาสาเต็มร้อย',
    price: 90,
    level: 2,
    category: 'school',
    gender: 'f',
    top: { main: '#34467e', shade: '#263461', sleeve: 'short', collar: 'shirt', placket: 'buttons', buttonColor: '#c9c3d6', pocket: 'chest2', tie: 'scarf', tieColor: '#7fc4ff', tieColor2: '#fffaf0', epaulets: true, hem: 'out' },
  },
  {
    id: 'top_pe',
    slot: 'top',
    name: 'เสื้อพละสีส้ม',
    desc: 'เสื้อโปโลวิชาพละ ใส่แล้ววิ่งเร็วขึ้น (มั้ง)',
    price: 40,
    category: 'school',
    top: { main: '#f58f35', shade: '#d0661f', sleeve: 'short', collar: 'polo', collarColor: SW, placket: 'half', buttonColor: SW, emblem: 'school', emblemColor: SW, cuff: SW, hem: 'out' },
  },

  // ---- Thai style ----
  {
    id: 'top_floral',
    slot: 'top',
    name: 'เสื้อลายดอกสงกรานต์',
    desc: 'ลายดอกไม้สีสด ใส่แล้วอารมณ์ดี',
    price: 60,
    category: 'thai',
    top: { main: '#6fc7e8', shade: '#3f9fcb', trim: W, sleeve: 'short', pattern: 'floral', patternColor: '#ff9fc0', patternColor2: '#fff3a6', collar: 'camp', placket: 'buttons', hem: 'out' },
  },
  {
    id: 'top_mohom',
    slot: 'top',
    name: 'เสื้อม่อฮ่อม',
    desc: 'เสื้อพื้นเมืองสีคราม ขลิบแดง',
    price: 80,
    category: 'thai',
    top: { main: '#3d4f8f', shade: '#2c3a6e', trim: '#e8514a', sleeve: 'long', extra: 'buttons', extraColor: '#e8514a', collar: 'mandarin', collarColor: '#e8514a', placket: 'buttons', buttonColor: '#e8514a', pocket: 'lower2', hem: 'out' },
  },
  {
    id: 'top_raj',
    slot: 'top',
    name: 'เสื้อราชปะแตน',
    desc: 'คอตั้ง กระดุมทอง ดูภูมิฐาน',
    price: 150,
    level: 5,
    category: 'thai',
    gender: 'm',
    top: { main: W, shade: '#e3d8c6', trim: W, sleeve: 'long', extra: 'buttons', extraColor: '#ffd54f', collar: 'mandarin', collarColor: W, placket: 'buttons', buttonColor: '#ffd54f', pocket: 'lower2', hem: 'out' },
  },
  {
    id: 'top_phraratchathan',
    slot: 'top',
    name: 'เสื้อพระราชทาน',
    desc: 'คอตั้ง ผ่าหน้ากระดุมห้าเม็ด ผ้าไหมสีครีม',
    price: 160,
    level: 5,
    category: 'thai',
    gender: 'm',
    top: { main: '#f2e6cc', shade: '#d8c6a2', sleeve: 'long', pattern: 'silk', patternColor: '#fff6e2', collar: 'mandarin', collarColor: '#f7eed9', placket: 'buttons', buttonColor: '#c9a24a', pocket: 'lower2', hem: 'out' },
  },
  {
    id: 'top_thaisilk',
    slot: 'top',
    name: 'เสื้อไหมไทย',
    desc: 'ไหมไทยเหลือบสีบานเย็น เงาวิบวับเวลาต้องแสง',
    price: 120,
    level: 3,
    category: 'thai',
    top: { main: '#c0508e', shade: '#94346c', sleeve: 'short', pattern: 'silk', patternColor: '#e98cbb', collar: 'mandarin', collarColor: '#e98cbb', placket: 'buttons', buttonColor: '#ffd54f', hem: 'out' },
  },
  {
    id: 'top_chitralada',
    slot: 'top',
    name: 'ชุดไทยจิตรลดา',
    desc: 'เสื้อไหมคอกลมตั้ง กระดุมห้าเม็ด สง่างามแบบไทย',
    price: 150,
    level: 5,
    category: 'thai',
    gender: 'f',
    top: { main: '#f3a0b5', shade: '#d67a93', sleeve: 'long', pattern: 'silk', patternColor: '#ffd0dc', collar: 'mandarin', collarColor: '#ffc4d3', placket: 'buttons', buttonColor: '#ffd54f', fit: 'fitted', hem: 'tucked' },
  },
  {
    id: 'top_sabai',
    slot: 'top',
    name: 'ชุดไทยสไบทอง',
    desc: 'สไบเฉียงลายทอง งามอย่างไทย',
    price: 180,
    level: 6,
    category: 'thai',
    gender: 'f',
    top: { main: '#e8709e', shade: '#c24f7e', trim: '#ffd54f', sleeve: 'long', extra: 'sabai', extraColor: '#ffd54f', collar: 'none', fit: 'fitted', hem: 'tucked' },
  },
  {
    id: 'top_pakaoma',
    slot: 'top',
    name: 'เสื้อผ้าขาวม้า',
    desc: 'ลายตารางผ้าขาวม้า ไทยแท้ร่วมสมัย',
    price: 70,
    category: 'thai',
    top: { main: '#e8514a', shade: '#b8343f', trim: W, sleeve: 'short', pattern: 'plaid', patternColor: '#3d63b5', patternColor2: '#ffd54f', collar: 'camp', placket: 'buttons', hem: 'out' },
  },
  {
    id: 'top_elephant',
    slot: 'top',
    name: 'เสื้อยืดลายช้าง',
    desc: 'ลายช้างเดินเรียงแถว ของฝากยอดฮิตจากเชียงใหม่',
    price: 50,
    category: 'thai',
    top: { main: '#2f6f8f', shade: '#22546e', sleeve: 'short', pattern: 'elephant', patternColor: '#ffd54f', collar: 'crew', hem: 'out' },
  },

  // ---- modern real clothes ----
  {
    id: 'top_tee_white',
    slot: 'top',
    name: 'เสื้อยืดขาวเบสิก',
    desc: 'ใส่ได้ทุกวัน เข้ากับทุกอย่าง',
    price: 0,
    starter: true,
    category: 'modern',
    top: { main: W, shade: WS, sleeve: 'short', collar: 'crew', hem: 'out' },
  },
  {
    id: 'top_tee_black',
    slot: 'top',
    name: 'เสื้อยืดสีดำ',
    desc: 'ดำเรียบ ๆ แต่เท่ไม่ไหว',
    price: 30,
    category: 'modern',
    top: { main: '#3d3547', shade: '#2b2534', sleeve: 'short', collar: 'crew', hem: 'out' },
  },
  {
    id: 'top_tee_grey',
    slot: 'top',
    name: 'เสื้อยืดสีเทาท็อปดราย',
    desc: 'เทาท็อปดรายผ้านุ่ม ใส่สบายสุด ๆ',
    price: 30,
    category: 'modern',
    top: { main: '#aaa4b3', shade: '#878092', sleeve: 'short', pattern: 'knit', patternColor: '#bab5c2', collar: 'crew', hem: 'out' },
  },
  {
    id: 'top_tee_lotus',
    slot: 'top',
    name: 'เสื้อสกรีนดอกบัว',
    desc: 'สกรีนลายดอกบัวชมพูตรงอก มินิมอลสายบุญ',
    price: 50,
    category: 'modern',
    top: { main: '#fff3d6', shade: '#e9d7ae', sleeve: 'short', collar: 'crew', graphic: 'lotus', graphicColor: '#ff9fc0', graphicColor2: '#6cc36a', hem: 'out' },
  },
  {
    id: 'top_tee_boon',
    slot: 'top',
    name: 'เสื้อสกรีน "บุญ"',
    desc: 'ตัวอักษรบุญตัวโต ใส่แล้วบุญวิ่งเข้าหา',
    price: 60,
    category: 'modern',
    top: { main: '#3d3547', shade: '#2b2534', sleeve: 'short', collar: 'crew', graphic: 'boon', graphicColor: '#ffd54f', graphicColor2: '#ff9fc0', hem: 'out' },
  },
  {
    id: 'top_stripe',
    slot: 'top',
    name: 'เสื้อลายขวางมารีน',
    desc: 'ลายขวางกรมท่า-ขาว สไตล์ชาวเรือ',
    price: 0,
    starter: true,
    category: 'modern',
    top: { main: W, shade: WS, sleeve: 'long', pattern: 'stripes', patternColor: '#3d4f8f', collar: 'crew', hem: 'out' },
  },
  {
    id: 'top_polo',
    slot: 'top',
    name: 'เสื้อโปโลเขียวขวด',
    desc: 'โปโลคอปกเรียบร้อย ไปวัดก็ได้ ไปเที่ยวก็ดี',
    price: 60,
    category: 'modern',
    top: { main: '#2f8f7a', shade: '#236e5e', sleeve: 'short', collar: 'polo', collarColor: '#3fa88f', placket: 'half', buttonColor: W, hem: 'out' },
  },
  {
    id: 'top_hawaii',
    slot: 'top',
    name: 'เสื้อฮาวายลายดอก',
    desc: 'ดอกชบาตัวโต ลุคหน้าร้อนริมทะเล',
    price: 70,
    category: 'modern',
    top: { main: '#e8514a', shade: '#b8343f', sleeve: 'short', pattern: 'hawaii', patternColor: '#fff3a6', patternColor2: '#43905a', collar: 'camp', placket: 'buttons', buttonColor: '#fff3a6', hem: 'out' },
  },
  {
    id: 'top_hoodie_over',
    slot: 'top',
    name: 'ฮู้ดโอเวอร์ไซซ์',
    desc: 'ตัวใหญ่ใส่อุ่น แขนเสื้อยาวคลุมมือนิด ๆ',
    price: 110,
    category: 'modern',
    top: { main: '#b9a6e6', shade: '#9580c8', trim: W, sleeve: 'long', collar: 'hood', pocket: 'kangaroo', fit: 'oversized', hem: 'long', cuff: '#a893d8' },
  },
  {
    id: 'top_hoodie',
    slot: 'top',
    name: 'ฮู้ดน้องหมาวัด',
    desc: 'ฮู้ดสีน้ำตาลหูหมาน่าฟัด',
    price: 120,
    category: 'modern',
    top: { main: '#e0a868', shade: '#bf8446', trim: '#fff1d6', sleeve: 'long', extra: 'hood', extraColor: '#9a6a45', collar: 'hood', pocket: 'kangaroo', hem: 'long', cuff: '#cf955a' },
  },
  {
    id: 'top_overalls',
    slot: 'top',
    name: 'เอี๊ยมยีนส์',
    desc: 'เอี๊ยมยีนส์ทับเสื้อขาว ขี้เล่นสุด ๆ',
    price: 90,
    category: 'modern',
    top: { main: W, shade: WS, trim: W, sleeve: 'short', extra: 'overalls', extraColor: '#5a8de0', collar: 'crew', hem: 'tucked' },
  },
  {
    id: 'top_denim',
    slot: 'top',
    name: 'แจ็กเก็ตยีนส์ทับเสื้อยืด',
    desc: 'ยีนส์ฟอกทับเสื้อยืดขาว คลาสสิกไม่มีวันตกยุค',
    price: 140,
    level: 3,
    category: 'modern',
    top: {
      main: W,
      shade: WS,
      sleeve: 'long',
      collar: 'crew',
      hem: 'out',
      jacket: { kind: 'denim', main: '#5f86c8', shade: '#4467a8', trim: '#8fb0e6', pattern: 'denim', patternColor: '#6d93d2' },
    },
  },
  {
    id: 'top_cardigan',
    slot: 'top',
    name: 'คาร์ดิแกนไหมพรม',
    desc: 'คาร์ดิแกนสีครีมเนยทับเสื้อขาว อบอุ่นละมุน',
    price: 90,
    category: 'modern',
    gender: 'f',
    top: {
      main: W,
      shade: WS,
      sleeve: 'long',
      collar: 'crew',
      hem: 'out',
      jacket: { kind: 'cardigan', main: '#ffe3a3', shade: '#f0c67a', trim: '#fff3d0', pattern: 'knit', patternColor: '#ffecbd' },
    },
  },
  {
    id: 'top_varsity',
    slot: 'top',
    name: 'แจ็กเก็ตวาร์ซิตี้',
    desc: 'แจ็กเก็ตทีมกีฬาตัว B แขนหนังสีครีม',
    price: 180,
    level: 5,
    category: 'modern',
    top: {
      main: '#3d3547',
      shade: '#2b2534',
      sleeve: 'long',
      collar: 'crew',
      hem: 'out',
      jacket: { kind: 'varsity', main: '#b8343f', shade: '#8e2533', trim: '#fffaf0', sleeve: '#f5ecd7', sleeveShade: '#d8c9a8', emblem: 'letter', emblemColor: '#fffaf0', emblemColor2: '#ffd54f' },
    },
  },
  {
    id: 'top_sukajan',
    slot: 'top',
    name: 'แจ็กเก็ตซูกาจันปักพญานาค',
    desc: 'ผ้าซาตินปักพญานาคทองด้านหลัง เท่ระดับตำนาน',
    price: 260,
    level: 8,
    category: 'modern',
    top: {
      main: '#fffaf0',
      shade: '#e6dccb',
      sleeve: 'long',
      collar: 'crew',
      hem: 'out',
      jacket: { kind: 'sukajan', main: '#1f4d49', shade: '#153935', trim: '#e9a53a', emblem: 'naga', emblemColor: '#ffd54f', emblemColor2: '#e9a53a' },
    },
  },
  {
    id: 'top_jersey',
    slot: 'top',
    name: 'เสื้อบอลทีมชาติไทย',
    desc: 'เสื้อช้างศึกเบอร์ 10 เชียร์สุดใจ',
    price: 120,
    level: 3,
    category: 'modern',
    top: { main: '#2f52b8', shade: '#223d8c', trim: '#e8514a', sleeve: 'short', collar: 'jersey', collarColor: '#fffaf0', emblem: 'crest', emblemColor: '#e8514a', number: '10', numberColor: '#fffaf0', cuff: '#e8514a', stripe: '#fffaf0', hem: 'out' },
  },
  {
    id: 'top_boondee',
    slot: 'top',
    name: 'เสื้อบุญดี',
    desc: 'เสื้อลายดอกบัวลิมิเต็ด จากแพ็กเริ่มต้น',
    price: 0,
    premium: true,
    category: 'modern',
    top: { main: '#ffd54f', shade: '#e9a53a', trim: '#fffaf0', sleeve: 'short', extra: 'logo', extraColor: '#ff9fc0', collar: 'crew', graphic: 'lotus', graphicColor: '#ff9fc0', graphicColor2: '#43905a', hem: 'out' },
  },

  // ======================================================================
  // Bottoms
  {
    id: 'bot_khaki',
    slot: 'bottom',
    name: 'กางเกงขายาวกากี',
    desc: 'ขายาวสุภาพ ใส่ได้ทุกวัน',
    price: 0,
    starter: true,
    category: 'temple',
    bottom: { kind: 'pants', main: '#c9a878', shade: '#a58556', detail: 'crease' },
  },
  {
    id: 'bot_black',
    slot: 'bottom',
    name: 'กางเกงขายาวดำ',
    desc: 'เรียบง่าย เข้ากับทุกเสื้อ',
    price: 0,
    starter: true,
    category: 'temple',
    bottom: { kind: 'pants', main: '#4a3f55', shade: '#342b3f', detail: 'crease' },
  },
  {
    id: 'bot_skirt',
    slot: 'bottom',
    name: 'กระโปรงยาวสีขาว',
    desc: 'กระโปรงยาวคลุมเข่า พลิ้วไหว',
    price: 0,
    starter: true,
    category: 'temple',
    gender: 'f',
    bottom: { kind: 'skirt', main: W, shade: '#e3d8c6', length: 'long' },
  },
  // ---- school ----
  {
    id: 'bot_school_navy',
    slot: 'bottom',
    name: 'กางเกงนักเรียนขาสั้นกรมท่า',
    desc: 'ขาสั้นสีกรมท่า คาดเข็มขัดหนังหัวโรงเรียน',
    price: 0,
    starter: true,
    category: 'school',
    gender: 'm',
    bottom: { kind: 'shorts', main: NAVY, shade: NAVYS, length: 'short', belt: '#3a2838', buckle: '#d8d4e6' },
  },
  {
    id: 'bot_school_khaki',
    slot: 'bottom',
    name: 'กางเกงนักเรียนขาสั้นกากี',
    desc: 'ขาสั้นสีกากีแบบประถม ใส่คู่ชุดลูกเสือก็ได้',
    price: 30,
    category: 'school',
    gender: 'm',
    bottom: { kind: 'shorts', main: '#c2a36e', shade: '#9c7f4c', length: 'short', belt: '#6e4a35', buckle: '#e9c24a' },
  },
  {
    id: 'bot_school_skirt',
    slot: 'bottom',
    name: 'กระโปรงนักเรียนจีบรอบ',
    desc: 'กระโปรงกรมท่าจีบรอบตัว ยาวคลุมเข่าตามระเบียบ',
    price: 0,
    starter: true,
    category: 'school',
    gender: 'f',
    bottom: { kind: 'pleated', main: NAVY, shade: NAVYS, length: 'knee' },
  },
  {
    id: 'bot_uni_slacks',
    slot: 'bottom',
    name: 'กางเกงสแล็กนักศึกษา',
    desc: 'สแล็กดำจีบหน้า เข็มขัดหัวตรามหาวิทยาลัย',
    price: 70,
    category: 'school',
    gender: 'm',
    bottom: { kind: 'pants', main: '#34303f', shade: '#24212d', belt: '#2a2530', buckle: '#e9b949', detail: 'crease' },
  },
  {
    id: 'bot_uni_skirt',
    slot: 'bottom',
    name: 'กระโปรงนักศึกษาทรงเอ',
    desc: 'กระโปรงดำทรงเอ คาดเข็มขัดหัวทองเงาวับ',
    price: 70,
    category: 'school',
    gender: 'f',
    bottom: { kind: 'skirt', main: '#34303f', shade: '#24212d', length: 'knee', belt: '#2a2530', buckle: '#e9b949' },
  },
  {
    id: 'bot_uni_pleat',
    slot: 'bottom',
    name: 'กระโปรงพลีทนักศึกษา',
    desc: 'พลีทดำยาวพลิ้ว เดินทีสะบัดที',
    price: 80,
    category: 'school',
    gender: 'f',
    bottom: { kind: 'pleated', main: '#34303f', shade: '#24212d', length: 'midi', belt: '#2a2530', buckle: '#e9b949' },
  },
  // ---- Thai ----
  {
    id: 'bot_sarong',
    slot: 'bottom',
    name: 'ผ้าถุงลายไทย',
    desc: 'ผ้าถุงลายกนกสีคราม',
    price: 40,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#5566b0', shade: '#3d4a8a', pattern: 'thai', patternColor: '#ffd54f', hem: '#e8514a' },
  },
  {
    id: 'bot_chitralada',
    slot: 'bottom',
    name: 'ผ้าซิ่นตีนจก',
    desc: 'ซิ่นไหมยาวต่อเชิงทอง คู่กับชุดไทยจิตรลดา',
    price: 140,
    level: 5,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#7a3a8c', shade: '#5b2a6a', pattern: 'silk', patternColor: '#9a58ab', hem: '#ffd54f' },
  },
  {
    id: 'bot_jong',
    slot: 'bottom',
    name: 'โจงกระเบนสีม่วง',
    desc: 'โจงกระเบนผ้าไหม สง่างาม',
    price: 100,
    level: 5,
    category: 'thai',
    bottom: { kind: 'jong', main: '#8a64d6', shade: '#6448ad', hem: '#ffd54f', pattern: 'silk', patternColor: '#a383e6' },
  },
  {
    id: 'bot_elephant',
    slot: 'bottom',
    name: 'กางเกงลายช้าง',
    desc: 'กางเกงเลลายช้าง ใส่สบายสุด ๆ',
    price: 60,
    category: 'thai',
    bottom: { kind: 'loose', main: '#2f8f7a', shade: '#236e5e', pattern: 'elephant', patternColor: '#ffd54f', hem: '#236e5e' },
  },
  {
    id: 'bot_elephant_purple',
    slot: 'bottom',
    name: 'กางเกงช้างสีม่วง',
    desc: 'กางเกงช้างรุ่นยอดนิยมของนักท่องเที่ยว ผ้าเบาใส่แล้วพลิ้ว',
    price: 60,
    category: 'thai',
    bottom: { kind: 'loose', main: '#6a4bb0', shade: '#4f358c', pattern: 'elephant', patternColor: '#ffd54f', hem: '#4f358c' },
  },
  {
    id: 'bot_fisherman',
    slot: 'bottom',
    name: 'กางเกงเล',
    desc: 'กางเกงเลผ้าฝ้ายสีคราม ผูกเอวสไตล์ชาวเล',
    price: 50,
    category: 'thai',
    bottom: { kind: 'loose', main: '#3d4f8f', shade: '#2c3a6e', length: 'midi', hem: '#2c3a6e', belt: '#3d4f8f' },
  },
  // ---- modern ----
  {
    id: 'bot_jeans',
    slot: 'bottom',
    name: 'ยีนส์ฟอกขายาว',
    desc: 'ยีนส์สียีนส์ฟอก ใส่ได้ทุกที่ทุกเวลา',
    price: 0,
    starter: true,
    category: 'modern',
    bottom: { kind: 'pants', main: '#5f86c8', shade: '#4467a8', pattern: 'denim', patternColor: '#6d93d2', detail: 'denim', stitch: '#e9b25a' },
  },
  {
    id: 'bot_jeans_black',
    slot: 'bottom',
    name: 'ยีนส์ดำ',
    desc: 'ยีนส์ดำทรงกระบอก เท่แบบไม่ต้องพยายาม',
    price: 60,
    category: 'modern',
    bottom: { kind: 'pants', main: '#3a3544', shade: '#282431', pattern: 'denim', patternColor: '#433d4e', detail: 'denim', stitch: '#8c8187' },
  },
  {
    id: 'bot_denim_shorts',
    slot: 'bottom',
    name: 'กางเกงยีนส์ขาสั้น',
    desc: 'ยีนส์ขาสั้นปลายรุ่ย รับลมร้อนเมืองไทย',
    price: 50,
    category: 'modern',
    bottom: { kind: 'shorts', main: '#6f94d4', shade: '#4f73b4', length: 'mini', pattern: 'denim', patternColor: '#7ea1dc', detail: 'fray', stitch: '#e9b25a' },
  },
  {
    id: 'bot_cargo',
    slot: 'bottom',
    name: 'กางเกงคาร์โก้',
    desc: 'กระเป๋าข้างเยอะ ใส่ของทำบุญได้เพียบ',
    price: 80,
    category: 'modern',
    bottom: { kind: 'pants', main: '#7a7a4e', shade: '#5c5c38', detail: 'cargo' },
  },
  {
    id: 'bot_joggers',
    slot: 'bottom',
    name: 'จ็อกเกอร์สีเทา',
    desc: 'ขาจั๊มปลาย ผ้านุ่มใส่ออกกำลังกายตอนเช้า',
    price: 60,
    category: 'modern',
    bottom: { kind: 'pants', main: '#8a8496', shade: '#6c6678', detail: 'jogger', stripe: '#fffaf0' },
  },
  {
    id: 'bot_pinkskirt',
    slot: 'bottom',
    name: 'กระโปรงจีบชมพู',
    desc: 'กระโปรงจีบรอบสีชมพูหวาน',
    price: 50,
    category: 'modern',
    gender: 'f',
    bottom: { kind: 'pleated', main: '#ff9fc0', shade: '#e8709e', pattern: 'stripes', patternColor: '#ffd6e0', length: 'short' },
  },

  // ======================================================================
  // Shoes
  {
    id: 'shoes_school',
    slot: 'shoes',
    name: 'รองเท้านักเรียนหนังดำ',
    desc: 'หนังดำขัดเงา คู่ถุงเท้าขาวพับข้อ',
    price: 0,
    starter: true,
    category: 'school',
    shoes: { kind: 'shoe', main: '#2f2a36', shade: '#1f1b25', sole: '#1a1720', accent: '#6a6478', sock: '#fbfcff', sockH: 2 },
  },
  {
    id: 'shoes_sneaker_white',
    slot: 'shoes',
    name: 'ผ้าใบสีขาว',
    desc: 'ผ้าใบขาวสะอาด ต้องคอยเช็ดตลอด',
    price: 0,
    starter: true,
    category: 'modern',
    shoes: { kind: 'sneaker', main: '#fbfcff', shade: '#d9dfec', sole: '#e9e4dc', accent: '#9fb0cc', sock: '#fbfcff', sockH: 1 },
  },
  {
    id: 'shoes_maryjane',
    slot: 'shoes',
    name: 'รองเท้านักเรียนหญิงสายคาด',
    desc: 'คัตชูดำมีสายคาด คู่ถุงเท้าขาวลูกไม้',
    price: 30,
    category: 'school',
    gender: 'f',
    shoes: { kind: 'maryjane', main: '#2f2a36', shade: '#1f1b25', sole: '#1a1720', accent: '#6a6478', sock: '#fbfcff', sockH: 2 },
  },
  {
    id: 'shoes_canvas_black',
    slot: 'shoes',
    name: 'ผ้าใบนักเรียนสีดำ',
    desc: 'ผ้าใบดำพื้นขาว ใส่เรียนพละทั้งปี',
    price: 40,
    category: 'school',
    shoes: { kind: 'sneaker', main: '#34303f', shade: '#24212d', sole: '#fbfcff', accent: '#fbfcff', sock: '#fbfcff', sockH: 1 },
  },
  {
    id: 'shoes_sneaker_pastel',
    slot: 'shoes',
    name: 'ผ้าใบสีพาสเทล',
    desc: 'ผ้าใบชมพูพาสเทลขอบมิ้นต์ น่ารักทุกก้าว',
    price: 70,
    category: 'modern',
    shoes: { kind: 'sneaker', main: '#ffc4d8', shade: '#f59abb', sole: '#fbfcff', accent: '#7fd3b5' },
  },
  {
    id: 'shoes_hightop',
    slot: 'shoes',
    name: 'ผ้าใบหุ้มข้อสีแดง',
    desc: 'หุ้มข้อสีแดงสด ลุคสตรีทเต็มขั้น',
    price: 90,
    level: 3,
    category: 'modern',
    shoes: { kind: 'hightop', main: '#e8514a', shade: '#b8343f', sole: '#fbfcff', accent: '#fbfcff' },
  },
  {
    id: 'shoes_flipflop',
    slot: 'shoes',
    name: 'รองเท้าแตะหูคีบ',
    desc: 'แตะฟ้าขาวคู่ใจคนไทย หายหน้าวัดก็ซื้อใหม่ได้',
    price: 20,
    category: 'thai',
    shoes: { kind: 'flipflop', main: '#5a8de0', shade: '#3d63b5', sole: '#fbfcff', accent: '#3d63b5' },
  },
  {
    id: 'shoes_sandal',
    slot: 'shoes',
    name: 'รองเท้ารัดส้น',
    desc: 'รัดส้นหนังน้ำตาล เดินเที่ยวตลาดน้ำทั้งวัน',
    price: 50,
    category: 'thai',
    shoes: { kind: 'sandal', main: '#9a6a45', shade: '#6e4a35', sole: '#6e4a35', accent: '#c28e5c' },
  },

  // ======================================================================
  // Head accessories
  { id: 'head_jasmine', slot: 'head', name: 'ดอกมะลิทัดหู', desc: 'หอมละมุนแบบไทย', price: 20, acc: 'jasmine', category: 'thai' },
  { id: 'head_frangipani', slot: 'head', name: 'ดอกลีลาวดี', desc: 'ดอกลีลาวดีสีชมพูทัดหู', price: 25, acc: 'frangipani', category: 'thai' },
  { id: 'head_clips', slot: 'head', name: 'กิ๊บติดผมพาสเทล', desc: 'กิ๊บสีหวานสามตัว ติดเรียงข้างหน้าม้า', price: 30, acc: 'clips', category: 'accessory' },
  { id: 'head_ribbon', slot: 'head', name: 'โบว์ผมผูกใหญ่', desc: 'โบว์แดงใบโต ติดหลังศีรษะ', price: 35, acc: 'ribbon', category: 'accessory' },
  { id: 'head_glasses', slot: 'head', name: 'แว่นกลมเรโทร', desc: 'แว่นกลมดูเป็นคนเรียนเก่ง', price: 40, acc: 'glasses', category: 'accessory' },
  { id: 'head_sunglasses', slot: 'head', name: 'แว่นกันแดด', desc: 'แว่นดำเลนส์เงา แดดเมืองไทยก็ไม่หวั่น', price: 60, acc: 'sunglasses', category: 'accessory' },
  { id: 'head_cap', slot: 'head', name: 'หมวกแก๊ป', desc: 'แก๊ปสีกรมปักดอกบัว กันแดดตอนเดินวัด', price: 50, acc: 'cap', category: 'modern' },
  { id: 'head_headphones', slot: 'head', name: 'หูฟังครอบหู', desc: 'ฟังบทสวดมนต์แบบชิล ๆ', price: 90, level: 3, acc: 'headphones', category: 'modern' },
  { id: 'head_ngob', slot: 'head', name: 'งอบไทย', desc: 'หมวกงอบกันแดดแบบชาวนา', price: 70, acc: 'ngob', category: 'thai' },
  { id: 'head_dogears', slot: 'head', name: 'ที่คาดหูหมา', desc: 'หูตั้งน่ารัก เหมือนน้องหมาวัด', price: 80, acc: 'dogears', category: 'accessory' },
  { id: 'head_lotus', slot: 'head', name: 'มงกุฎดอกบัว', desc: 'มงกุฎดอกบัวชมพู สำหรับสายบุญตัวจริง', price: 160, level: 8, acc: 'lotus', category: 'temple' },

  // ---- neck / body ----
  { id: 'neck_garland', slot: 'neck', name: 'พวงมาลัยคล้องคอ', desc: 'มาลัยดาวเรืองสีส้มสดใส', price: 40, acc: 'garland', category: 'temple' },
  { id: 'neck_pakaoma', slot: 'neck', name: 'ผ้าขาวม้าพันคอ', desc: 'ผ้าขาวม้าลายตาราง ใช้ได้ทุกอย่าง', price: 35, acc: 'scarf', category: 'thai' },
  { id: 'neck_pakaoma_waist', slot: 'neck', name: 'ผ้าขาวม้าคาดเอว', desc: 'คาดเอวผูกปมข้าง แมนแบบหนุ่มไทย', price: 35, acc: 'waistsash', category: 'thai' },
  { id: 'neck_amulet', slot: 'neck', name: 'สร้อยพระ', desc: 'สร้อยทองห้อยพระเครื่อง อุ่นใจทุกที่', price: 120, level: 4, acc: 'amulet', category: 'temple' },

  // ---- hand ----
  { id: 'hand_yam', slot: 'hand', name: 'ย่ามสะพายข้าง', desc: 'ย่ามผ้าทอสีแดง ใส่ของทำบุญ', price: 50, acc: 'yam', category: 'temple' },
  { id: 'hand_lotus', slot: 'hand', name: 'ดอกบัวตูม', desc: 'ดอกบัวตูมสีชมพู พร้อมถวายพระ', price: 25, acc: 'lotusbud', category: 'temple' },
  { id: 'hand_chayen', slot: 'hand', name: 'ชาเย็นแก้วโต', desc: 'ชาไทยหวานเย็นชื่นใจ หลอดใหญ่ดูดไข่มุก', price: 30, acc: 'chayen', category: 'modern' },
  { id: 'hand_umbrella', slot: 'hand', name: 'ร่มบ่อสร้าง', desc: 'ร่มกระดาษลายดอกจากเชียงใหม่', price: 90, level: 3, acc: 'umbrella', category: 'thai' },
]

export const OUTFIT_BY_ID: Record<string, OutfitItem> = Object.fromEntries(OUTFITS.map((o) => [o.id, o]))

export const STARTER_OUTFITS = OUTFITS.filter((o) => o.starter).map((o) => o.id)
