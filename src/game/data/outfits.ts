// Wardrobe catalogue. Visual fields drive the avatar renderer, shop fields
// drive the wardrobe screen. Prices are in Boon Coins.

import { DAY_COLORS } from '../../art/palette'

export type Slot = 'hair' | 'top' | 'bottom' | 'head' | 'neck' | 'hand'

export type Pattern = 'none' | 'dots' | 'floral' | 'plaid' | 'stripes' | 'thai' | 'elephant' | 'lace' | 'check'

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
}

export interface BottomArt {
  kind: 'pants' | 'skirt' | 'sarong' | 'jong' | 'loose'
  main: string
  shade: string
  pattern?: Pattern
  patternColor?: string
  hem?: string
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
  top?: TopArt
  bottom?: BottomArt
  /** Hair style key for slot 'hair'. */
  hair?: string
  /** Accessory art key for head/neck/hand slots. */
  acc?: string
  tags?: string[]
}

const dayTops: OutfitItem[] = DAY_COLORS.map((c, i) => ({
  id: `top_day${i}`,
  slot: 'top' as const,
  name: `เสื้อสี${c.name}`,
  desc: `สีประจำวัน${c.day} ใส่ตรงวันรับบุญเพิ่ม 10%`,
  price: 30,
  top: { main: c.hex, shade: c.shade, trim: c.light, sleeve: 'short' as const, dayColor: i },
  tags: ['lucky'],
}))

export const OUTFITS: OutfitItem[] = [
  // ---- hair styles ----
  { id: 'hair_bob', slot: 'hair', name: 'ผมบ๊อบหน้าม้า', desc: 'ทรงยอดฮิต น่ารักสดใส', price: 0, starter: true, hair: 'bob' },
  { id: 'hair_short', slot: 'hair', name: 'ผมสั้นเท่ ๆ', desc: 'สั้นกระชับ ไปวัดสบาย', price: 0, starter: true, hair: 'short' },
  { id: 'hair_long', slot: 'hair', name: 'ผมยาวสลวย', desc: 'ยาวตรงเงางาม', price: 0, starter: true, hair: 'long' },
  { id: 'hair_bun', slot: 'hair', name: 'ผมมวยสูง', desc: 'มวยกลมบนหัว เรียบร้อยน่ารัก', price: 40, hair: 'bun' },
  { id: 'hair_twin', slot: 'hair', name: 'ผมแกละ', desc: 'ผมแกละสองข้างแบบเด็กไทย', price: 40, hair: 'twin' },
  { id: 'hair_jook', slot: 'hair', name: 'ผมจุก', desc: 'ผมจุกผูกดอกมะลิ แบบไทยโบราณ', price: 90, hair: 'jook', level: 4 },

  // ---- tops ----
  {
    id: 'top_white',
    slot: 'top',
    name: 'เสื้อขาวไปวัด',
    desc: 'เสื้อขาวสะอาดตา แต่งกายสุภาพ',
    price: 0,
    starter: true,
    top: { main: '#fffaf0', shade: '#e6dccb', trim: '#f3dcb2', sleeve: 'short' },
  },
  {
    id: 'top_lace',
    slot: 'top',
    name: 'เสื้อลูกไม้ขาว',
    desc: 'ปกลูกไม้ละมุน ใส่ทำบุญวันพระ',
    price: 45,
    top: { main: '#fffaf0', shade: '#e6dccb', trim: '#ffd6e0', sleeve: 'long', pattern: 'lace', patternColor: '#f0e2d0' },
  },
  ...dayTops,
  {
    id: 'top_floral',
    slot: 'top',
    name: 'เสื้อลายดอกสงกรานต์',
    desc: 'ลายดอกไม้สีสด ใส่แล้วอารมณ์ดี',
    price: 60,
    top: { main: '#6fc7e8', shade: '#3f9fcb', trim: '#fffaf0', sleeve: 'short', pattern: 'floral', patternColor: '#ff9fc0', patternColor2: '#fff3a6' },
  },
  {
    id: 'top_mohom',
    slot: 'top',
    name: 'เสื้อม่อฮ่อม',
    desc: 'เสื้อพื้นเมืองสีคราม ขลิบแดง',
    price: 80,
    top: { main: '#3d4f8f', shade: '#2c3a6e', trim: '#e8514a', sleeve: 'long', extra: 'buttons', extraColor: '#e8514a' },
  },
  {
    id: 'top_raj',
    slot: 'top',
    name: 'เสื้อราชปะแตน',
    desc: 'คอตั้ง กระดุมทอง ดูภูมิฐาน',
    price: 150,
    level: 5,
    top: { main: '#fffaf0', shade: '#e3d8c6', trim: '#fffaf0', sleeve: 'long', extra: 'buttons', extraColor: '#ffd54f' },
  },
  {
    id: 'top_sabai',
    slot: 'top',
    name: 'ชุดไทยสไบทอง',
    desc: 'สไบเฉียงลายทอง งามอย่างไทย',
    price: 180,
    level: 6,
    top: { main: '#e8709e', shade: '#c24f7e', trim: '#ffd54f', sleeve: 'long', extra: 'sabai', extraColor: '#ffd54f' },
  },
  {
    id: 'top_hoodie',
    slot: 'top',
    name: 'ฮู้ดน้องหมาวัด',
    desc: 'ฮู้ดสีน้ำตาลหูหมาน่าฟัด',
    price: 120,
    top: { main: '#e0a868', shade: '#bf8446', trim: '#fff1d6', sleeve: 'long', extra: 'hood', extraColor: '#9a6a45' },
  },
  {
    id: 'top_overalls',
    slot: 'top',
    name: 'เอี๊ยมยีนส์',
    desc: 'เอี๊ยมยีนส์ทับเสื้อขาว ขี้เล่นสุด ๆ',
    price: 90,
    top: { main: '#fffaf0', shade: '#e6dccb', trim: '#fffaf0', sleeve: 'short', extra: 'overalls', extraColor: '#5a8de0' },
  },
  {
    id: 'top_pakaoma',
    slot: 'top',
    name: 'เสื้อผ้าขาวม้า',
    desc: 'ลายตารางผ้าขาวม้า ไทยแท้ร่วมสมัย',
    price: 70,
    top: { main: '#e8514a', shade: '#b8343f', trim: '#fffaf0', sleeve: 'short', pattern: 'plaid', patternColor: '#3d63b5', patternColor2: '#ffd54f' },
  },
  {
    id: 'top_boondee',
    slot: 'top',
    name: 'เสื้อบุญดี',
    desc: 'เสื้อลายดอกบัวลิมิเต็ด จากแพ็กเริ่มต้น',
    price: 0,
    premium: true,
    top: { main: '#ffd54f', shade: '#e9a53a', trim: '#fffaf0', sleeve: 'short', extra: 'logo', extraColor: '#ff9fc0' },
  },

  // ---- bottoms ----
  {
    id: 'bot_khaki',
    slot: 'bottom',
    name: 'กางเกงขายาวกากี',
    desc: 'ขายาวสุภาพ ใส่ได้ทุกวัน',
    price: 0,
    starter: true,
    bottom: { kind: 'pants', main: '#c9a878', shade: '#a58556' },
  },
  {
    id: 'bot_black',
    slot: 'bottom',
    name: 'กางเกงขายาวดำ',
    desc: 'เรียบง่าย เข้ากับทุกเสื้อ',
    price: 0,
    starter: true,
    bottom: { kind: 'pants', main: '#4a3f55', shade: '#342b3f' },
  },
  {
    id: 'bot_skirt',
    slot: 'bottom',
    name: 'กระโปรงยาวสีขาว',
    desc: 'กระโปรงยาวคลุมเข่า พลิ้วไหว',
    price: 0,
    starter: true,
    bottom: { kind: 'skirt', main: '#fffaf0', shade: '#e3d8c6' },
  },
  {
    id: 'bot_sarong',
    slot: 'bottom',
    name: 'ผ้าถุงลายไทย',
    desc: 'ผ้าถุงลายกนกสีคราม',
    price: 40,
    bottom: { kind: 'sarong', main: '#5566b0', shade: '#3d4a8a', pattern: 'thai', patternColor: '#ffd54f', hem: '#e8514a' },
  },
  {
    id: 'bot_jong',
    slot: 'bottom',
    name: 'โจงกระเบนสีม่วง',
    desc: 'โจงกระเบนผ้าไหม สง่างาม',
    price: 100,
    level: 5,
    bottom: { kind: 'jong', main: '#8a64d6', shade: '#6448ad', hem: '#ffd54f' },
  },
  {
    id: 'bot_elephant',
    slot: 'bottom',
    name: 'กางเกงลายช้าง',
    desc: 'กางเกงเลลายช้าง ใส่สบายสุด ๆ',
    price: 60,
    bottom: { kind: 'loose', main: '#2f8f7a', shade: '#236e5e', pattern: 'elephant', patternColor: '#ffd54f' },
  },
  {
    id: 'bot_pinkskirt',
    slot: 'bottom',
    name: 'กระโปรงจีบชมพู',
    desc: 'กระโปรงจีบรอบสีชมพูหวาน',
    price: 50,
    bottom: { kind: 'skirt', main: '#ff9fc0', shade: '#e8709e', pattern: 'stripes', patternColor: '#ffd6e0' },
  },

  // ---- head accessories ----
  { id: 'head_jasmine', slot: 'head', name: 'ดอกมะลิทัดหู', desc: 'หอมละมุนแบบไทย', price: 20, acc: 'jasmine' },
  { id: 'head_frangipani', slot: 'head', name: 'ดอกลีลาวดี', desc: 'ดอกลีลาวดีสีชมพูทัดหู', price: 25, acc: 'frangipani' },
  { id: 'head_ngob', slot: 'head', name: 'งอบไทย', desc: 'หมวกงอบกันแดดแบบชาวนา', price: 70, acc: 'ngob' },
  { id: 'head_dogears', slot: 'head', name: 'ที่คาดหูหมา', desc: 'หูตั้งน่ารัก เหมือนน้องหมาวัด', price: 80, acc: 'dogears' },
  { id: 'head_lotus', slot: 'head', name: 'มงกุฎดอกบัว', desc: 'มงกุฎดอกบัวชมพู สำหรับสายบุญตัวจริง', price: 160, level: 8, acc: 'lotus' },
  { id: 'head_glasses', slot: 'head', name: 'แว่นกลมเรโทร', desc: 'แว่นกลมดูเป็นคนเรียนเก่ง', price: 40, acc: 'glasses' },

  // ---- neck ----
  { id: 'neck_garland', slot: 'neck', name: 'พวงมาลัยคล้องคอ', desc: 'มาลัยดาวเรืองสีส้มสดใส', price: 40, acc: 'garland' },
  { id: 'neck_pakaoma', slot: 'neck', name: 'ผ้าขาวม้าพันคอ', desc: 'ผ้าขาวม้าลายตาราง ใช้ได้ทุกอย่าง', price: 35, acc: 'scarf' },

  // ---- hand ----
  { id: 'hand_yam', slot: 'hand', name: 'ย่ามสะพายข้าง', desc: 'ย่ามผ้าทอสีแดง ใส่ของทำบุญ', price: 50, acc: 'yam' },
  { id: 'hand_umbrella', slot: 'hand', name: 'ร่มบ่อสร้าง', desc: 'ร่มกระดาษลายดอกจากเชียงใหม่', price: 90, level: 3, acc: 'umbrella' },
]

export const OUTFIT_BY_ID: Record<string, OutfitItem> = Object.fromEntries(OUTFITS.map((o) => [o.id, o]))

export const STARTER_OUTFITS = OUTFITS.filter((o) => o.starter).map((o) => o.id)
