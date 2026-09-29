// Wardrobe catalogue. Visual fields drive both avatar renderers (the small
// 16×27 world sprite in art/avatar.ts and the HD doll in art/doll.ts); shop
// fields drive the wardrobe screen. Prices are in Boon Coins.

import { DAY_COLORS } from '../../art/palette'
import { V4_OUTFITS } from './cosmetics'

/**
 * `back` = worn on the back (wings, backpacks, auras, flags).
 * `suit` = full-body costume (ชุดมาสคอต / kigurumi) that visually replaces the
 * top and bottom (and the hair, for hooded suits) while it is worn.
 */
export type Slot = 'hair' | 'top' | 'bottom' | 'shoes' | 'head' | 'neck' | 'hand' | 'back' | 'suit'

/** Where a granted-only cosmetic or pet comes from. */
export type Exclusive = 'pack' | 'pass_free' | 'pass_premium' | 'event'

/** Shop grouping for the wardrobe UI. `costume` = full-body suits. */
export type OutfitCategory = 'school' | 'thai' | 'modern' | 'temple' | 'accessory' | 'fun' | 'work' | 'costume'

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
  /** Sparkly sequins (ลิเก). */
  | 'sequin'
  /** Wax-resist batik flowers and swirls. */
  | 'batik'
  /** Ikat zig-zag diamonds (มัดหมี่). */
  | 'mudmee'
  /** Cartoon stars and moons (pyjamas). */
  | 'stars'
  /** Three bold bands across the chest (shop uniform polo). */
  | 'bands'
  /** Overlapping scales (พญานาค). */
  | 'scale'
  /** Stepped flowing-water zig-zags (ซิ่นลายน้ำไหล เมืองน่าน). */
  | 'wave'
  /** Diagonal grill marks (หมูปิ้ง). */
  | 'grill'

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
  /** Deep scoop with shoulder straps (เสื้อกล้าม). Use with sleeve 'none'. */
  | 'tank'
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
  extra?: 'sabai' | 'buttons' | 'overalls' | 'hood' | 'logo' | 'sash' | 'likay' | 'khon' | 'astro' | 'lifevest' | 'rescue'
  extraColor?: string
  /** Colour index into DAY_COLORS if this top counts as a lucky colour. */
  dayColor?: number

  // ---- detail params (shared by both renderers) ----
  collar?: Collar
  /** Collar colour (defaults to a lighter main / trim). */
  collarColor?: string
  /** Front opening: full button placket, half placket (polo), zip or double-breasted (chef). */
  placket?: 'buttons' | 'half' | 'zip' | 'double'
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
  /** Chest print. The Thai-word keys are funny slogan tees. */
  graphic?: 'lotus' | 'boon' | 'heart' | 'elephant' | 'star' | 'hiw' | 'yakuan' | 'boonma' | 'maiphet' | 'aikhai' | 'mutelu' | 'hippo'
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
  /** Sleeveless vest worn over the top (motorbike-taxi vest). */
  vest?: VestArt
  /** Bib apron tied over the top, hanging over the bottom. */
  apron?: ApronArt
}

export interface VestArt {
  main: string
  shade: string
  /** Reflective strip / piping. */
  trim?: string
  /** Number patch, small on the chest and big on the back. */
  number?: string
  numberColor?: string
  patchColor?: string
}

export interface ApronArt {
  main: string
  shade: string
  pattern?: Pattern
  patternColor?: string
  /** Neck strap / waist ties colour. */
  strap?: string
  /** Front money pocket. */
  pocket?: boolean
}

export interface BottomArt {
  /** 'pleated' = pleated skirt, 'skirt' = A-line/flared skirt. */
  kind: 'pants' | 'skirt' | 'sarong' | 'jong' | 'loose' | 'shorts' | 'pleated'
  main: string
  shade: string
  pattern?: Pattern
  patternColor?: string
  patternColor2?: string
  hem?: string
  /** Leg / hem length. Defaults: pants long, shorts short, skirts long. */
  length?: 'mini' | 'short' | 'knee' | 'midi' | 'long'
  belt?: string
  buckle?: string
  /** muay = Thai boxing shorts (wide band, flared legs, satin), ripped = torn knees, pads = knee pads. */
  detail?: 'denim' | 'cargo' | 'jogger' | 'crease' | 'fray' | 'muay' | 'ripped' | 'pads'
  /** Wide waistband colour (boxing shorts). */
  band?: string
  /** Lettering on the waistband. */
  bandText?: string
  /** Contrast stitching (jeans). */
  stitch?: string
  /** Side stripe (track pants). */
  stripe?: string
}

export interface ShoeArt {
  kind: 'shoe' | 'sneaker' | 'hightop' | 'flipflop' | 'sandal' | 'maryjane' | 'boot' | 'heel' | 'slipper' | 'wrap' | 'clog' | 'flipper'
  main: string
  shade: string
  sole?: string
  accent?: string
  /** Sock colour, or omitted for none. */
  sock?: string
  /** Sock height in rows above the shoe (HD doll). */
  sockH?: number
  /** Light-up sole colours (flashing sneakers). */
  glow?: string[]
}

/** Art key of a full-body suit (hood, face frame, tail... in both renderers). */
export type SuitKind =
  | 'trex'
  | 'shark'
  | 'frog'
  | 'cat'
  | 'penguin'
  | 'bunny'
  | 'chicken'
  | 'elephant'
  | 'durian'
  | 'banana'
  | 'mango'
  | 'moopin'
  | 'liondance'
  | 'yak'
  | 'nangkwak'
  | 'naga'
  | 'ramkaebon'
  // v4 cosmetics
  | 'scuba'
  | 'rescue'
  | 'hippo'
  | 'monitor'
  | 'capybara'
  | 'butterbear'

/**
 * Full-body costume. The renderers turn it into a synthetic top + bottom (see
 * `suitGarments`) so every pose works, then paint the hood, belly, tail,
 * spikes... for `kind` on top.
 */
export interface SuitArt {
  kind: SuitKind
  main: string
  shade: string
  /** Tummy patch / muzzle / inner ears. */
  belly?: string
  /** Spikes, comb, fins, gold trims. */
  accent?: string
  accent2?: string
  pattern?: Pattern
  patternColor?: string
  patternColor2?: string
  /** `hood` (default) covers the hair and frames the face; `crown` keeps the hair and adds a headdress. */
  head?: 'hood' | 'crown'
  /** Garment overrides for dress-type costumes (sabai, sarong...). */
  top?: Partial<TopArt>
  bottom?: Partial<BottomArt>
  /** Mitten paws in this colour instead of bare hands. */
  paws?: string
  /** Booties that replace the worn shoes. */
  feet?: ShoeArt
  /** Premium sparkle overlay. */
  shimmer?: boolean
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
  /**
   * Granted only (never sold in the general shop): real-money packs, the
   * battle-pass free / premium tiers or events. See grantOutfit().
   */
  exclusive?: Exclusive
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
  /** Accessory art key for head/neck/hand/back slots. */
  acc?: string
  /** Full-body costume art for slot 'suit'. */
  suit?: SuitArt
  /**
   * Place id (see data/places.ts) whose shop NPC sells this item. Place-only
   * items are hidden from the general shop.
   */
  shopOnly?: string
  tags?: string[]
}

/** The synthetic garments a suit is drawn with (shared by both renderers). */
export function suitGarments(s: SuitArt): { top: TopArt; bottom: BottomArt; shoes: ShoeArt | null } {
  const top: TopArt = {
    main: s.main,
    shade: s.shade,
    sleeve: 'long',
    pattern: s.pattern,
    patternColor: s.patternColor,
    patternColor2: s.patternColor2,
    collar: 'none',
    fit: 'oversized',
    hem: 'long',
    ...s.top,
  }
  const bottom: BottomArt = {
    kind: 'pants',
    main: s.main,
    shade: s.shade,
    pattern: s.pattern,
    patternColor: s.patternColor,
    patternColor2: s.patternColor2,
    ...s.bottom,
  }
  return { top, bottom, shoes: s.feet ?? null }
}

/** Head accessories that still show with a hooded suit (glasses, face paint). */
export const SUIT_FACE_ACCS: ReadonlySet<string> = new Set(['glasses', 'sunglasses', 'heartshades', 'nerdglasses', 'dinsor', 'mirrorshades'])

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

// ======================================================================
// Modern Thai lifestyle pack: work sets, fun costumes, street snacks and
// things you wear on your back.

const sportsTop = (id: string, colour: string, main: string, shade: string, trim: string, number: string): OutfitItem => ({
  id,
  slot: 'top',
  name: `เสื้อกีฬาสี${colour}`,
  desc: `คณะสี${colour} เชียร์ดังที่สุดในสนาม! ปรี๊ด ๆ`,
  price: 45,
  category: 'school',
  top: { main, shade, trim, sleeve: 'short', collar: 'v', emblem: 'school', emblemColor: trim, cuff: trim, stripe: trim, graphic: 'star', graphicColor: trim, graphicColor2: trim, number, numberColor: trim, hem: 'out' },
  tags: ['sportsday'],
})

const LIFESTYLE: OutfitItem[] = [
  // ---------------------------------------------------------------- tops: work
  {
    id: 'top_winmoto',
    slot: 'top',
    name: 'เสื้อกั๊กวินมอเตอร์ไซค์',
    desc: 'เสื้อกั๊กส้มเบอร์ 99 "ไปวัดไหมพี่ 20 บาท"',
    price: 120,
    level: 2,
    category: 'work',
    top: {
      main: '#e4e9f2',
      shade: '#c2c9d8',
      sleeve: 'long',
      collar: 'shirt',
      collarColor: '#f4f6fb',
      hem: 'out',
      vest: { main: '#f58f35', shade: '#d0661f', trim: '#fff3a6', number: '99', numberColor: '#3a2838', patchColor: '#fffaf0' },
    },
    tags: ['set:winmoto'],
  },
  {
    id: 'top_vendor',
    slot: 'top',
    name: 'ชุดแม่ค้าตลาดนัด',
    desc: 'ผ้ากันเปื้อนกระเป๋าตังค์หน้าท้อง "ซื้อสองแถมหนึ่งจ้า"',
    price: 100,
    category: 'work',
    gender: 'f',
    top: {
      main: '#ff9fc0',
      shade: '#e8709e',
      sleeve: 'short',
      pattern: 'floral',
      patternColor: '#fffaf0',
      patternColor2: '#ffe45e',
      collar: 'crew',
      hem: 'out',
      apron: { main: '#4f7fd0', shade: '#3d63b5', pattern: 'check', patternColor: '#6f9ae0', strap: '#2e3a6b', pocket: true },
    },
    tags: ['set:vendor'],
  },
  {
    id: 'top_office',
    slot: 'top',
    name: 'เชิ้ตมนุษย์เงินเดือน',
    desc: 'เชิ้ตฟ้าผูกไทลายทาง ใส่เข้างานวันจันทร์แบบหมดไฟนิด ๆ',
    price: 80,
    category: 'work',
    gender: 'm',
    top: { main: '#cfe0f7', shade: '#a9c1e6', sleeve: 'long', collar: 'shirt', collarColor: '#e3edfb', placket: 'buttons', buttonColor: '#f4f8ff', tie: 'tie', tieColor: '#3d4f8f', tieColor2: '#e8514a', pocket: 'chest', hem: 'tucked' },
    tags: ['set:office'],
  },
  {
    id: 'top_office_f',
    slot: 'top',
    name: 'เบลาส์ออฟฟิศผูกโบว์',
    desc: 'เบลาส์ชมพูนมผูกโบว์คอ ประชุมเช้าก็สวยได้',
    price: 80,
    category: 'work',
    gender: 'f',
    top: { main: '#fbe3ea', shade: '#e9c2cf', sleeve: 'long', collar: 'shirt', collarColor: '#fff2f6', tie: 'bow', tieColor: '#b9657f', tieColor2: '#8e4a62', placket: 'buttons', buttonColor: '#fffaf0', fit: 'fitted', hem: 'tucked' },
    tags: ['set:office'],
  },
  {
    id: 'top_chef',
    slot: 'top',
    name: 'เสื้อเชฟร้านข้าวมันไก่',
    desc: 'เสื้อเชฟกระดุมสองแถว สับไก่ฉับ ๆ ราดน้ำจิ้มเต้าเจี้ยว',
    price: 110,
    category: 'work',
    top: { main: '#fbfcff', shade: '#d9dfec', sleeve: 'long', collar: 'mandarin', collarColor: '#fbfcff', placket: 'double', buttonColor: '#3a2838', cuff: '#e8514a', hem: 'out' },
    tags: ['set:chef'],
  },
  {
    id: 'top_convenience',
    slot: 'top',
    name: 'เสื้อพนักงานร้านสะดวกซื้อ',
    desc: 'สวัสดีค่า~ รับซาลาเปาเพิ่มไหมคะ',
    price: 70,
    category: 'work',
    top: { main: '#fbfcff', shade: '#d9dfec', sleeve: 'short', pattern: 'bands', patternColor: '#2f9f6a', patternColor2: '#f58f35', collar: 'polo', collarColor: '#2f9f6a', placket: 'half', buttonColor: '#fbfcff', nameTag: true, hem: 'out' },
    tags: ['set:convenience'],
  },

  // ---------------------------------------------------------------- tops: Thai
  {
    id: 'top_muay',
    slot: 'top',
    name: 'เสื้อกล้ามนักมวย',
    desc: 'เสื้อกล้ามแดงขลิบทอง ขึ้นเวทีราชดำเนินได้เลย',
    price: 70,
    category: 'thai',
    top: { main: '#e8514a', shade: '#b8343f', trim: '#ffd54f', sleeve: 'none', collar: 'tank', collarColor: '#ffd54f', hem: 'out' },
    tags: ['set:muay'],
  },
  {
    id: 'top_chakri',
    slot: 'top',
    name: 'ชุดไทยจักรี',
    desc: 'สไบปักดิ้นพาดไหล่ งามสง่าระดับนางในวรรณคดี',
    price: 200,
    level: 7,
    category: 'thai',
    gender: 'f',
    top: { main: '#e0b04a', shade: '#b8862e', trim: '#fff3a6', sleeve: 'none', pattern: 'silk', patternColor: '#f3cf72', extra: 'sabai', extraColor: '#8a3a9c', collar: 'none', fit: 'fitted', hem: 'tucked' },
  },
  {
    id: 'top_borompiman',
    slot: 'top',
    name: 'ชุดไทยบรมพิมาน',
    desc: 'ไหมแขนยาวคอตั้ง คาดเข็มขัดทอง ใส่ออกงานใหญ่',
    price: 190,
    level: 6,
    category: 'thai',
    gender: 'f',
    top: { main: '#3a4fa0', shade: '#2a3a7c', sleeve: 'long', pattern: 'silk', patternColor: '#5a70c0', collar: 'mandarin', collarColor: '#4a60b4', placket: 'buttons', buttonColor: '#ffd54f', fit: 'fitted', hem: 'tucked' },
  },
  {
    id: 'top_khon',
    slot: 'top',
    name: 'ชุดโขนปักดิ้นทอง',
    desc: 'กรองคอทับทรวงระยิบ ใส่แล้วอยากรำเพลงหน้าพาทย์',
    price: 240,
    level: 7,
    category: 'thai',
    top: { main: '#c0392f', shade: '#8e2533', trim: '#ffd54f', sleeve: 'long', pattern: 'thai', patternColor: '#e9a53a', patternColor2: '#fff3a6', extra: 'khon', extraColor: '#ffd54f', collar: 'none', cuff: '#ffd54f', fit: 'fitted', hem: 'tucked' },
    tags: ['set:khon'],
  },

  // ---------------------------------------------------------------- tops: fun
  {
    id: 'top_likay',
    slot: 'top',
    name: 'ชุดลิเกเลื่อมระยิบ',
    desc: 'เลื่อมทั้งตัว อินทรธนูงอนเชิด "ข้าคือพระเอกลิเกเอง!"',
    price: 260,
    level: 6,
    category: 'fun',
    top: { main: '#8a3a9c', shade: '#66287a', trim: '#ffd54f', sleeve: 'long', pattern: 'sequin', patternColor: '#ff9fc0', patternColor2: '#fff3a6', extra: 'likay', extraColor: '#ffd54f', collar: 'none', cuff: '#ffd54f', hem: 'tucked' },
    tags: ['set:likay'],
  },
  {
    id: 'top_astro',
    slot: 'top',
    name: 'ชุดนักบินอวกาศ',
    desc: 'ทำบุญไกลถึงดวงจันทร์ ติดธงช้างน้อยที่แขน',
    price: 300,
    level: 8,
    category: 'fun',
    top: { main: '#f4f5fa', shade: '#c9ccda', trim: '#e8514a', sleeve: 'long', extra: 'astro', extraColor: '#5a8de0', collar: 'crew', collarColor: '#aeb4c8', cuff: '#e8514a', fit: 'oversized', hem: 'long' },
    tags: ['set:astro'],
  },
  {
    id: 'top_pajama',
    slot: 'top',
    name: 'ชุดนอนลายดาว',
    desc: 'ชุดนอนผ้านุ่มลายดาวกับพระจันทร์ ง่วงแต่ต้องไปตักบาตร',
    price: 90,
    category: 'fun',
    top: { main: '#a9d2f5', shade: '#7fb0de', trim: '#fffaf0', sleeve: 'long', pattern: 'stars', patternColor: '#ffe45e', patternColor2: '#fffaf0', collar: 'shirt', collarColor: '#fffaf0', placket: 'buttons', buttonColor: '#fffaf0', cuff: '#fffaf0', hem: 'out' },
    tags: ['set:pajama'],
  },
  {
    id: 'top_tee_yakuan',
    slot: 'top',
    name: 'เสื้อสกรีน "อย่ากวน"',
    desc: 'ใส่วันที่อารมณ์ไม่ดี คนจะได้รู้ตัว',
    price: 60,
    category: 'fun',
    top: { main: '#fffaf0', shade: '#e6dccb', sleeve: 'short', collar: 'crew', graphic: 'yakuan', graphicColor: '#3a2838', graphicColor2: '#e8514a', hem: 'out' },
  },
  {
    id: 'top_tee_hiw',
    slot: 'top',
    name: 'เสื้อสกรีน "หิว"',
    desc: 'สถานะถาวร ตั้งแต่ตื่นจนหลับ',
    price: 55,
    category: 'fun',
    top: { main: '#ffe45e', shade: '#e9c23a', sleeve: 'short', collar: 'crew', graphic: 'hiw', graphicColor: '#e8514a', graphicColor2: '#3a2838', hem: 'out' },
  },
  {
    id: 'top_tee_boonma',
    slot: 'top',
    name: 'เสื้อสกรีน "บุญมา"',
    desc: 'บุญมา วาสนาส่ง ใส่แล้วเฮงทั้งวัน',
    price: 60,
    category: 'fun',
    top: { main: '#ff9fc0', shade: '#e8709e', sleeve: 'short', collar: 'crew', graphic: 'boonma', graphicColor: '#fffaf0', graphicColor2: '#ffd54f', hem: 'out' },
  },
  {
    id: 'top_tee_maiphet',
    slot: 'top',
    name: 'เสื้อสกรีน "ไม่เผ็ด"',
    desc: 'สั่งส้มตำต้องใส่ตัวนี้ (แต่ก็เผ็ดอยู่ดี)',
    price: 60,
    category: 'fun',
    top: { main: '#3d3547', shade: '#2b2534', sleeve: 'short', collar: 'crew', graphic: 'maiphet', graphicColor: '#fffaf0', graphicColor2: '#e8514a', hem: 'out' },
  },

  // ---------------------------------------------------------------- tops: modern
  {
    id: 'top_tank',
    slot: 'top',
    name: 'เสื้อกล้ามขาวลุงข้างบ้าน',
    desc: 'นั่งหน้าบ้าน จิบโอเลี้ยง ดูรถวิ่งผ่าน',
    price: 40,
    category: 'modern',
    top: { main: '#fbfcff', shade: '#d9dfec', sleeve: 'none', collar: 'tank', pattern: 'knit', patternColor: '#eef1f8', hem: 'out' },
  },
  {
    id: 'top_flannel',
    slot: 'top',
    name: 'เชิ้ตสก็อตลายผ้าไทย',
    desc: 'ลายสก็อตแดงกรมท่าแซมทอง เท่แบบคาเฟ่เชียงใหม่',
    price: 70,
    category: 'modern',
    top: { main: '#b8343f', shade: '#8e2533', sleeve: 'long', pattern: 'plaid', patternColor: '#2e3a6b', patternColor2: '#ffd54f', collar: 'shirt', collarColor: '#c8424c', placket: 'buttons', buttonColor: '#fffaf0', pocket: 'chest2', hem: 'out' },
  },
  {
    id: 'top_hawaii_elephant',
    slot: 'top',
    name: 'เสื้อฮาวายลายช้าง',
    desc: 'ช้างน้อยเดินเล่นริมหาด ของฝากจากเกาะช้าง',
    price: 80,
    category: 'modern',
    top: { main: '#2fb3a8', shade: '#20877f', sleeve: 'short', pattern: 'elephant', patternColor: '#ffd6e0', collar: 'camp', collarColor: '#5cd0c4', placket: 'buttons', buttonColor: '#fffaf0', hem: 'out' },
  },
  {
    id: 'top_retro_floral',
    slot: 'top',
    name: 'เชิ้ตลายดอกย้อนยุค',
    desc: 'ลายดอกสีมัสตาร์ดแบบยุค 70 เหมือนหยิบมาจากตู้คุณพ่อ',
    price: 75,
    category: 'modern',
    top: { main: '#e9b949', shade: '#c4922e', sleeve: 'short', pattern: 'floral', patternColor: '#b8543a', patternColor2: '#fff3d6', collar: 'camp', collarColor: '#f3cf72', placket: 'buttons', buttonColor: '#fff3d6', hem: 'out' },
  },
  sportsTop('top_sports_red', 'แดง', '#e8514a', '#b8343f', '#fffaf0', '1'),
  sportsTop('top_sports_yellow', 'เหลือง', '#ffd54f', '#e9a53a', '#3d63b5', '2'),
  sportsTop('top_sports_green', 'เขียว', '#5ea653', '#43905a', '#fffaf0', '3'),
  sportsTop('top_sports_blue', 'ฟ้า', '#5aa9e8', '#3d86c8', '#fffaf0', '4'),

  // ---------------------------------------------------------------- bottoms
  {
    id: 'bot_muay',
    slot: 'bottom',
    name: 'กางเกงมวยไทยแดง',
    desc: 'ผ้าซาตินเงาวับ ขอบเอวปักตัวอักษรไทย "มวยไทย"',
    price: 90,
    category: 'thai',
    bottom: { kind: 'shorts', main: '#e8514a', shade: '#b8343f', length: 'short', detail: 'muay', band: '#ffd54f', bandText: '#b8343f' },
    tags: ['set:muay'],
  },
  {
    id: 'bot_muay_blue',
    slot: 'bottom',
    name: 'กางเกงมวยไทยน้ำเงิน',
    desc: 'มุมน้ำเงินก็มีหวัง! ขอบเอวขาวตัวอักษรแดง',
    price: 90,
    category: 'thai',
    bottom: { kind: 'shorts', main: '#3d63b5', shade: '#2e4a8f', length: 'short', detail: 'muay', band: '#fbfcff', bandText: '#e8514a' },
    tags: ['set:muay'],
  },
  {
    id: 'bot_ripped',
    slot: 'bottom',
    name: 'ยีนส์ขาดเข่า',
    desc: 'ขาดตั้งแต่ร้าน ไม่ได้ล้มนะ แฟชั่น!',
    price: 80,
    category: 'modern',
    bottom: { kind: 'pants', main: '#6f94d4', shade: '#4f73b4', pattern: 'denim', patternColor: '#7ea1dc', detail: 'ripped', stitch: '#e9b25a' },
  },
  {
    id: 'bot_sin_mudmee',
    slot: 'bottom',
    name: 'ผ้าซิ่นมัดหมี่',
    desc: 'ซิ่นมัดหมี่ลายขิดจากอีสาน ทอมือทุกเส้น',
    price: 110,
    level: 3,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#8a3a9c', shade: '#66287a', pattern: 'mudmee', patternColor: '#ffd6e0', patternColor2: '#ffd54f', hem: '#e9a53a' },
  },
  {
    id: 'bot_batik',
    slot: 'bottom',
    name: 'ผ้าถุงลายบาติก',
    desc: 'ผ้าถุงบาติกลายดอกจากภูเก็ต นุ่งไปตลาดเช้า',
    price: 60,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#2f8f8a', shade: '#236e6a', pattern: 'batik', patternColor: '#f3cf72', hem: '#8a4a2a' },
  },
  {
    id: 'bot_songkran_shorts',
    slot: 'bottom',
    name: 'ขาสั้นลายดอกสงกรานต์',
    desc: 'เปียกได้ แห้งไว พร้อมลุยถนนข้าวสาร',
    price: 45,
    category: 'thai',
    bottom: { kind: 'shorts', main: '#5aa9e8', shade: '#3d86c8', length: 'short', pattern: 'hawaii', patternColor: '#fff3a6', patternColor2: '#ff9fc0' },
  },
  {
    id: 'bot_khon',
    slot: 'bottom',
    name: 'โจงกระเบนลายทอง',
    desc: 'โจงผ้ายกลายกนกทอง คู่กับชุดโขน',
    price: 150,
    level: 7,
    category: 'thai',
    bottom: { kind: 'jong', main: '#b8343f', shade: '#8e2533', pattern: 'thai', patternColor: '#e9a53a', hem: '#ffd54f' },
    tags: ['set:khon'],
  },
  {
    id: 'bot_borompiman',
    slot: 'bottom',
    name: 'ซิ่นไหมยกทอง',
    desc: 'ซิ่นยาวต่อเชิงทอง คาดเข็มขัดนาก',
    price: 150,
    level: 6,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#2a3a7c', shade: '#1f2c60', pattern: 'silk', patternColor: '#3f55a4', hem: '#ffd54f', belt: '#e9b949', buckle: '#fff3a6' },
  },
  {
    id: 'bot_track',
    slot: 'bottom',
    name: 'กางเกงวอร์มโรงเรียน',
    desc: 'วอร์มกรมท่าแถบขาว ใส่วิ่งรอบสนามตอนคาบพละ',
    price: 50,
    category: 'school',
    bottom: { kind: 'pants', main: '#34467e', shade: '#263461', detail: 'jogger', stripe: '#fbfcff' },
  },
  {
    id: 'bot_slacks_grey',
    slot: 'bottom',
    name: 'สแล็กเทาออฟฟิศ',
    desc: 'สแล็กเทารีดจีบคม เข็มขัดหนังหัวเงิน',
    price: 60,
    category: 'work',
    gender: 'm',
    bottom: { kind: 'pants', main: '#6c6678', shade: '#524d5e', belt: '#2a2530', buckle: '#d8d4e6', detail: 'crease' },
    tags: ['set:office'],
  },
  {
    id: 'bot_pencil',
    slot: 'bottom',
    name: 'กระโปรงทรงสอบออฟฟิศ',
    desc: 'กระโปรงเทาเข้ารูป เดินเร็ว ๆ ไปตอกบัตรทัน',
    price: 60,
    category: 'work',
    gender: 'f',
    bottom: { kind: 'skirt', main: '#6c6678', shade: '#524d5e', length: 'knee', belt: '#2a2530', buckle: '#d8d4e6' },
    tags: ['set:office'],
  },
  {
    id: 'bot_chef',
    slot: 'bottom',
    name: 'กางเกงเชฟลายตาราง',
    desc: 'ลายตารางขาวดำ เปื้อนน้ำจิ้มก็มองไม่เห็น',
    price: 60,
    category: 'work',
    bottom: { kind: 'pants', main: '#5a5466', shade: '#433e4e', pattern: 'check', patternColor: '#e9e4f0' },
    tags: ['set:chef'],
  },
  {
    id: 'bot_pajama',
    slot: 'bottom',
    name: 'กางเกงนอนลายดาว',
    desc: 'ขายาวผ้านุ่ม เข้าชุดกับเสื้อนอนลายดาว',
    price: 60,
    category: 'fun',
    bottom: { kind: 'pants', main: '#a9d2f5', shade: '#7fb0de', pattern: 'stars', patternColor: '#ffe45e', detail: 'jogger' },
    tags: ['set:pajama'],
  },
  {
    id: 'bot_astro',
    slot: 'bottom',
    name: 'กางเกงนักบินอวกาศ',
    desc: 'บุนวมหนาพร้อมสนับเข่า ไม่กลัวหกล้มบนดวงจันทร์',
    price: 200,
    level: 8,
    category: 'fun',
    bottom: { kind: 'pants', main: '#f4f5fa', shade: '#c9ccda', detail: 'pads', stripe: '#e8514a', belt: '#aeb4c8', buckle: '#5a8de0' },
    tags: ['set:astro'],
  },
  {
    id: 'bot_likay',
    slot: 'bottom',
    name: 'โจงลิเกเลื่อมทอง',
    desc: 'โจงเลื่อมวิบวับ เดินทีเสียงกรุ๊งกริ๊ง',
    price: 180,
    level: 6,
    category: 'fun',
    bottom: { kind: 'jong', main: '#e8709e', shade: '#c24f7e', pattern: 'sequin', patternColor: '#fff3a6', hem: '#ffd54f' },
    tags: ['set:likay'],
  },

  // ---------------------------------------------------------------- shoes
  {
    id: 'shoes_boots',
    slot: 'shoes',
    name: 'รองเท้าบูทยางลุยนา',
    desc: 'บูทยางกันโคลน ลงนาดำข้าวก็ได้ ลุยน้ำท่วมก็ดี',
    price: 70,
    category: 'work',
    shoes: { kind: 'boot', main: '#3f4a3c', shade: '#2c352b', sole: '#232a22', accent: '#e9b949' },
  },
  {
    id: 'shoes_heels',
    slot: 'shoes',
    name: 'รองเท้าส้นสูงสีแดง',
    desc: 'ส้นสูงสามนิ้ว เดินไปวัดไม่ไหวแต่ถ่ายรูปสวย',
    price: 120,
    category: 'modern',
    gender: 'f',
    shoes: { kind: 'heel', main: '#e8514a', shade: '#b8343f', sole: '#7e2436', accent: '#ff8a7a' },
  },
  {
    id: 'shoes_glow',
    slot: 'shoes',
    name: 'ผ้าใบไฟกะพริบ',
    desc: 'เดินทีไฟวิ้งทีหลากสี เด็ก ๆ ที่วัดอิจฉากันทั้งแถว',
    price: 150,
    level: 4,
    category: 'fun',
    shoes: { kind: 'sneaker', main: '#fbfcff', shade: '#d9dfec', sole: '#e9e4dc', accent: '#b9a6e6', sock: '#fbfcff', sockH: 1, glow: ['#ff5e8a', '#ffe45e', '#5ee0a0', '#5ebcff'] },
  },
  {
    id: 'shoes_bunny',
    slot: 'shoes',
    name: 'สลิปเปอร์กระต่ายขนฟู',
    desc: 'สลิปเปอร์หูกระต่าย ใส่เดินในบ้านนุ่มเท้า',
    price: 80,
    category: 'fun',
    shoes: { kind: 'slipper', main: '#fff1f5', shade: '#f0cfd9', sole: '#e8b4c4', accent: '#ff9fc0' },
    tags: ['set:pajama'],
  },
  {
    id: 'shoes_wrap',
    slot: 'shoes',
    name: 'ผ้าพันเท้านักมวย',
    desc: 'พันข้อเท้าแน่น ๆ พร้อมเตะก้านคอ',
    price: 40,
    category: 'thai',
    shoes: { kind: 'wrap', main: '#fbfcff', shade: '#d9dfec', sole: '#d9dfec', accent: '#e8514a' },
    tags: ['set:muay'],
  },
  {
    id: 'shoes_clog',
    slot: 'shoes',
    name: 'รองเท้าหัวโตติดตัวการ์ตูน',
    desc: 'หัวโตสีเขียวมะนาว ติดตัวติดรูปช้างกับดอกบัว',
    price: 90,
    category: 'modern',
    shoes: { kind: 'clog', main: '#9ee06a', shade: '#6cb84a', sole: '#5a9e3c', accent: '#ff9fc0' },
  },
  {
    id: 'shoes_astro',
    slot: 'shoes',
    name: 'บูทนักบินอวกาศ',
    desc: 'ก้าวเล็ก ๆ ของคน ก้าวใหญ่ของบุญ',
    price: 150,
    level: 8,
    category: 'fun',
    shoes: { kind: 'boot', main: '#f4f5fa', shade: '#c9ccda', sole: '#8a8496', accent: '#e8514a' },
    tags: ['set:astro'],
  },
  {
    id: 'shoes_flipflop_green',
    slot: 'shoes',
    name: 'แตะหูคีบสีเขียว',
    desc: 'แตะเขียวขาวรุ่นคลาสสิก ทนทานใส่จนพื้นบาง',
    price: 40,
    category: 'thai',
    shoes: { kind: 'flipflop', main: '#43a05a', shade: '#2f7f45', sole: '#fbfcff', accent: '#2f7f45' },
  },

  // ---------------------------------------------------------------- head
  { id: 'head_helmet', slot: 'head', name: 'หมวกกันน็อค', desc: 'ครึ่งใบสีขาวคาดแดง ขับขี่ปลอดภัยสไตล์พี่วิน', price: 80, acc: 'helmet', category: 'work', tags: ['set:winmoto'] },
  { id: 'head_helmet_cute', slot: 'head', name: 'หมวกกันน็อคหูแมว', desc: 'หมวกกันน็อคชมพูมีหูแมว ปลอดภัยแต่ต้องน่ารัก', price: 110, level: 3, acc: 'helmetcute', category: 'fun' },
  { id: 'head_sunhat', slot: 'head', name: 'หมวกปีกกว้าง', desc: 'หมวกสานปีกกว้างผูกริบบิ้น กันแดดตลาดนัดตอนเที่ยง', price: 60, acc: 'sunhat', category: 'work', tags: ['set:vendor'] },
  { id: 'head_vendorband', slot: 'head', name: 'ผ้าคาดหัวแม่ค้า', desc: 'ผ้าลายดอกคาดหัว เก็บผมไม่ให้ตกใส่ส้มตำ', price: 40, acc: 'vendorband', category: 'work', tags: ['set:vendor'] },
  { id: 'head_chefhat', slot: 'head', name: 'หมวกเชฟ', desc: 'หมวกเชฟทรงสูงพอง ๆ เพิ่มความอร่อย 20%', price: 70, acc: 'chefhat', category: 'work', tags: ['set:chef'] },
  { id: 'head_catears', slot: 'head', name: 'ที่คาดหูแมว', desc: 'หูแมวส้มขนนุ่ม เหมียว~', price: 70, acc: 'catears', category: 'accessory' },
  { id: 'head_bunnyears', slot: 'head', name: 'ที่คาดหูกระต่าย', desc: 'หูกระต่ายพับข้างหนึ่ง น่าเอ็นดูสุด ๆ', price: 70, acc: 'bunnyears', category: 'accessory' },
  { id: 'head_flowercrown', slot: 'head', name: 'มงกุฎดอกไม้', desc: 'ดาวเรือง มะลิ กุหลาบ ร้อยเป็นวง สดชื่นเหมือนงานวัด', price: 90, level: 2, acc: 'flowercrown', category: 'accessory' },
  { id: 'head_turban', slot: 'head', name: 'ผ้าโพกหัวลายขาวม้า', desc: 'โพกผ้าขาวม้าลายตาราง ลุยงานสวนได้ทั้งวัน', price: 45, acc: 'turban', category: 'thai' },
  { id: 'head_heartshades', slot: 'head', name: 'แว่นกันแดดหัวใจ', desc: 'เลนส์หัวใจสีชมพู มองโลกเป็นสีหวาน', price: 70, acc: 'heartshades', category: 'accessory' },
  { id: 'head_nerdglasses', slot: 'head', name: 'แว่นเนิร์ดติดเทป', desc: 'กรอบหนาติดเทปตรงกลาง ท่องบทสวดได้ทั้งเล่ม', price: 45, acc: 'nerdglasses', category: 'fun' },
  { id: 'head_dinsor', slot: 'head', name: 'แป้งดินสอพองสงกรานต์', desc: 'ประแป้งเต็มหน้า สุขสันต์วันสงกรานต์!', price: 40, acc: 'dinsor', category: 'fun' },
  { id: 'head_mongkol', slot: 'head', name: 'มงคลนักมวย', desc: 'มงคลสวมหัวลงยันต์ ครูมวยเสกมาให้', price: 90, level: 3, acc: 'mongkol', category: 'thai', tags: ['set:muay'] },
  { id: 'head_chada', slot: 'head', name: 'ชฎาทองแบบโขน', desc: 'ชฎายอดแหลมประดับพลอย ใส่แล้วสง่าเหมือนตัวพระ', price: 0, premium: true, acc: 'chada', category: 'thai', tags: ['set:khon'] },
  { id: 'head_likay', slot: 'head', name: 'ปันจุเหร็จลิเกขนนก', desc: 'ขนนกฟูฟ่องสูงเสียดฟ้า เพชรเม็ดโตเท่าไข่นกกระทา', price: 220, level: 6, acc: 'likay', category: 'fun', tags: ['set:likay'] },
  { id: 'head_spacehelmet', slot: 'head', name: 'หมวกนักบินอวกาศ', desc: 'ครอบแก้วใส ไปสวดมนต์บนดาวอังคาร', price: 220, level: 8, acc: 'spacehelmet', category: 'fun', tags: ['set:astro'] },
  { id: 'head_sleepcap', slot: 'head', name: 'หมวกนอนปอมปอม', desc: 'หมวกนอนลายทางห้อยปอมปอม ฝันดีนะ', price: 50, acc: 'sleepcap', category: 'fun', tags: ['set:pajama'] },

  // ---------------------------------------------------------------- neck / body
  { id: 'neck_lanyard', slot: 'neck', name: 'สายคล้องบัตรพนักงาน', desc: 'บัตรพนักงานรูปหน้าตอนตื่นสาย แตะเข้าออฟฟิศ', price: 40, acc: 'lanyard', category: 'work', tags: ['set:office'] },
  { id: 'neck_prajiad', slot: 'neck', name: 'ประเจียดผูกแขน', desc: 'ผ้าประเจียดแดงผูกต้นแขน เพิ่มพลังใจก่อนขึ้นเวที', price: 60, acc: 'prajiad', category: 'thai', tags: ['set:muay'] },
  { id: 'neck_mask', slot: 'neck', name: 'หน้ากากอนามัย', desc: 'หน้ากากสีฟ้าอ่อน กันฝุ่น PM2.5 และกันคนทัก', price: 40, acc: 'mask', category: 'accessory' },
  { id: 'neck_amulet_big', slot: 'neck', name: 'สร้อยพระเส้นโต', desc: 'สร้อยทองเส้นเท่านิ้วโป้ง ห้อยพระสามองค์ เสี่ยมาเอง', price: 180, level: 5, acc: 'amuletbig', category: 'fun' },

  // ---------------------------------------------------------------- hand
  { id: 'hand_tote', slot: 'hand', name: 'กระเป๋าผ้าลายช้าง', desc: 'ถุงผ้ารักษ์โลก ใส่ของทำบุญได้เพียบ', price: 50, acc: 'tote', category: 'accessory' },
  { id: 'hand_bubbletea', slot: 'hand', name: 'ชานมไข่มุก', desc: 'หวานร้อยเปอร์เซ็นต์ ไข่มุกหนึบ ๆ เต็มแก้ว', price: 40, acc: 'bubbletea', category: 'modern' },
  { id: 'hand_selfie', slot: 'hand', name: 'ไม้เซลฟี่', desc: 'ถ่ายรูปกับพระธาตุให้ติดทั้งองค์', price: 60, acc: 'selfie', category: 'modern' },
  { id: 'hand_fan', slot: 'hand', name: 'พัดลมมือถือ', desc: 'พัดลมจิ๋วสีพาสเทล สู้แดดเมษาฯ ได้ห้านาที', price: 45, acc: 'minifan', category: 'modern' },
  { id: 'hand_parasol', slot: 'hand', name: 'ร่มลายไทย', desc: 'ร่มกางลายกนกแดงทอง เดินเวียนเทียนก็ไม่ร้อน', price: 120, level: 3, acc: 'parasol', category: 'thai' },
  { id: 'hand_watergun', slot: 'hand', name: 'ปืนฉีดน้ำ', desc: 'ปืนฉีดน้ำถังใหญ่ สงกรานต์นี้ไม่มีใครรอด!', price: 70, acc: 'watergun', category: 'fun' },
  { id: 'hand_grocery', slot: 'hand', name: 'ถุงกับข้าว', desc: 'แกงถุงมัดหนังยาง ซื้อจากตลาดเช้าไปใส่บาตร', price: 40, acc: 'grocery', category: 'temple' },
  { id: 'hand_phone', slot: 'hand', name: 'มือถือเคสชมพู', desc: 'เช็กไลน์กลุ่มครอบครัว สวัสดีวันจันทร์', price: 80, acc: 'phone', category: 'modern' },
  { id: 'hand_patongo', slot: 'hand', name: 'ถุงปาท่องโก๋', desc: 'ปาท่องโก๋ร้อน ๆ จิ้มสังขยาใบเตย', price: 40, acc: 'patongo', category: 'fun' },
  { id: 'hand_krathong', slot: 'hand', name: 'กระทงใบตอง', desc: 'กระทงดอกดาวเรืองจุดเทียน ขอขมาพระแม่คงคา', price: 50, acc: 'krathong', category: 'temple' },
  { id: 'hand_lookchin', slot: 'hand', name: 'ลูกชิ้นปิ้ง', desc: 'ไม้ละสิบบาท ราดน้ำจิ้มหวาน ๆ เผ็ด ๆ', price: 40, acc: 'lookchin', category: 'fun' },

  // ---------------------------------------------------------------- back
  { id: 'back_angel', slot: 'back', name: 'ปีกเทวดา', desc: 'ปีกขนนกขาวบริสุทธิ์ ทำบุญจนตัวลอย', price: 0, premium: true, acc: 'angel', category: 'temple' },
  { id: 'back_butterfly', slot: 'back', name: 'ปีกผีเสื้อ', desc: 'ปีกผีเสื้อลายจุดสีรุ้ง บินเล่นในสวนดอกไม้', price: 160, level: 4, acc: 'butterfly', category: 'fun' },
  { id: 'back_thaibag', slot: 'back', name: 'เป้ลายไทย', desc: 'เป้ผ้าไหมลายกนก ไปเที่ยววัดทั่วประเทศ', price: 90, acc: 'thaibag', category: 'thai' },
  { id: 'back_schoolbag', slot: 'back', name: 'กระเป๋านักเรียน', desc: 'เป้กรมท่าปักชื่อโรงเรียน หนักเพราะหนังสือ (และขนม)', price: 50, acc: 'schoolbag', category: 'school' },
  { id: 'back_aura', slot: 'back', name: 'ออร่าบุญทอง', desc: 'รัศมีบุญเปล่งประกายรอบกาย ใครเห็นก็อนุโมทนา', price: 0, premium: true, acc: 'aura', category: 'temple' },
  { id: 'back_flag', slot: 'back', name: 'ธงหางปลา', desc: 'ธงหางปลาสีสด ปักหลังแห่ผ้าป่าขบวนใหญ่', price: 70, level: 2, acc: 'flag', category: 'temple' },
  { id: 'back_oxygen', slot: 'back', name: 'ถังออกซิเจนอวกาศ', desc: 'เป้ถังคู่สำหรับเดินอวกาศ มีไฟกะพริบด้วย', price: 140, level: 8, acc: 'oxygen', category: 'fun', tags: ['set:astro'] },
]

// ======================================================================
// Full-body suits (ชุดมาสคอต / ชุดตัวตลก). The face always stays visible.

const bootie = (main: string, shade: string, sole?: string, accent?: string): ShoeArt => ({ kind: 'shoe', main, shade, sole: sole ?? shade, accent: accent ?? main })

const SUITS: OutfitItem[] = [
  {
    id: 'suit_trex',
    slot: 'suit',
    name: 'ชุดไดโนเสาร์ทีเร็กซ์',
    desc: 'แขนสั้นกุดพนมมือไม่ถึงอก แต่ใจบุญใหญ่เท่าตัว แฮ่~',
    price: 450,
    level: 4,
    category: 'costume',
    suit: { kind: 'trex', main: '#7ccf5e', shade: '#56a84a', belly: '#f4f1a8', accent: '#ffb347', accent2: '#fffaf0', feet: bootie('#56a84a', '#43905a', '#2f6f4b', '#fffaf0') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_shark',
    slot: 'suit',
    name: 'ชุดฉลามน้อย',
    desc: 'โผล่หน้าออกมาจากปากฉลาม ดู ดู ดู ดู~ ฉลามสายบุญไม่กัดใคร',
    price: 360,
    level: 3,
    category: 'costume',
    suit: { kind: 'shark', main: '#6f9fd8', shade: '#4f7fbe', belly: '#fbfcff', accent: '#fffaf0', accent2: '#ff8fa8', feet: bootie('#4f7fbe', '#3d63b5') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_frog',
    slot: 'suit',
    name: 'ชุดกบเขียว',
    desc: 'อ๊บ อ๊บ! ตาโปนมองเห็นบุญได้ไกลทั้งสองข้าง',
    price: 180,
    category: 'costume',
    suit: { kind: 'frog', main: '#8fd06c', shade: '#62a94b', belly: '#eaf6bb', accent: '#ff9fc0', feet: bootie('#62a94b', '#4a8f3a') },
    tags: ['suit'],
  },
  {
    id: 'suit_cat',
    slot: 'suit',
    name: 'ชุดแมวส้ม',
    desc: 'แมวส้มทั้งโลกแชร์สมองก้อนเดียวกัน วันนี้ถึงคิวเราถือ เหมียว~',
    price: 240,
    category: 'costume',
    suit: { kind: 'cat', main: '#f5a653', shade: '#d98535', belly: '#fff1d6', accent: '#ffb3cf', accent2: '#e07f30', paws: '#fff1d6', feet: bootie('#fff1d6', '#f0d9b0', '#e0bb8a', '#ffb3cf') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_penguin',
    slot: 'suit',
    name: 'ชุดเพนกวิน',
    desc: 'เดินต้วมเต้ม ๆ ไปตักบาตร แอร์เย็นแค่ไหนก็ไม่หนาว',
    price: 240,
    level: 2,
    category: 'costume',
    suit: { kind: 'penguin', main: '#3f4466', shade: '#2d3150', belly: '#fbfcff', accent: '#ffb347', paws: '#3f4466', feet: bootie('#ffb347', '#f58f35', '#d0661f') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_bunny',
    slot: 'suit',
    name: 'ชุดกระต่ายชมพู',
    desc: 'หูยาวฟังบทสวดได้ชัดทุกคำ กระโดดดึ๋ง ๆ ไปถวายแครอท',
    price: 220,
    category: 'costume',
    suit: { kind: 'bunny', main: '#ffd6e0', shade: '#f2b1c6', belly: '#fffaf5', accent: '#ff9fc0', feet: bootie('#fffaf5', '#f0dde4', '#e8c4d2', '#ff9fc0') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_chicken',
    slot: 'suit',
    name: 'ชุดไก่ชนแก้บน',
    desc: 'ไก่ปูนปั้นหน้าศาลไอ้ไข่มาเกิดใหม่ เอ้กอี้เอ้กเอ้ก~ ขอแล้วได้ไว ๆ',
    price: 260,
    category: 'costume',
    suit: { kind: 'chicken', main: '#fbfcff', shade: '#dde2ee', belly: '#f2a33a', accent: '#e8514a', accent2: '#ffd54f', feet: bootie('#ffd54f', '#e9a53a', '#b8742a') },
    tags: ['suit', 'tail', 'aikhai'],
  },
  {
    id: 'suit_elephant',
    slot: 'suit',
    name: 'ชุดช้างน้อย',
    desc: 'หูปุ๊กปิ๊กโบกไปมา มีผ้าคลุมหลังลายไทยแบบช้างแห่ขบวนบุญ',
    price: 320,
    level: 3,
    category: 'costume',
    suit: { kind: 'elephant', main: '#b9b4d6', shade: '#958fb8', belly: '#e6e2f5', accent: '#ffc4d8', accent2: '#c0392f', feet: bootie('#958fb8', '#7a74a0', '#625867', '#fffaf0') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_durian',
    slot: 'suit',
    name: 'ชุดทุเรียนหมอนทอง',
    desc: 'ราชาผลไม้! หอมจนเพื่อนวิ่งหนี ห้ามพกขึ้นรถไฟฟ้านะ',
    price: 350,
    level: 5,
    category: 'costume',
    suit: { kind: 'durian', main: '#a3c34a', shade: '#7f9f30', pattern: 'thai', patternColor: '#6f8a26', patternColor2: '#d6e87a', belly: '#ffd24a', accent: '#6e4a35', accent2: '#ffe98a', feet: bootie('#7f9f30', '#6f8a26') },
    tags: ['suit', 'food'],
  },
  {
    id: 'suit_banana',
    slot: 'suit',
    name: 'ชุดกล้วยหอม',
    desc: 'ปอกเปลือกออกมาเจอหน้ายิ้ม ๆ โพแทสเซียมเต็มร้อย ลื่นล้มก็ยังยิ้ม',
    price: 180,
    category: 'costume',
    // half-peeled: creamy flesh on top, yellow peel legs and flaps hanging from the waist
    suit: {
      kind: 'banana',
      main: '#fff1c2',
      shade: '#ead394',
      belly: '#fffaf0',
      accent: '#6e4a35',
      accent2: '#ffe066',
      bottom: { kind: 'pants', main: '#ffe066', shade: '#e9c23a' },
      feet: bootie('#8a5a3c', '#6e4a35', '#4a3128'),
    },
    tags: ['suit', 'food'],
  },
  {
    id: 'suit_mango',
    slot: 'suit',
    name: 'ชุดข้าวเหนียวมะม่วง',
    desc: 'มะม่วงอกร่องบนหัว ข้าวเหนียวมูนราดกะทิ โรยถั่วทองกรุบ ๆ',
    price: 280,
    category: 'costume',
    suit: {
      kind: 'mango',
      main: '#fbf6e6',
      shade: '#e6dcc0',
      pattern: 'knit',
      patternColor: '#ffffff',
      belly: '#fffdf5',
      accent: '#ffc93c',
      accent2: '#5ea653',
      bottom: { kind: 'pants', main: '#5ea653', shade: '#43905a', pattern: 'stripes', patternColor: '#86c95f' },
    },
    tags: ['suit', 'food'],
  },
  {
    id: 'suit_moopin',
    slot: 'suit',
    name: 'ชุดหมูปิ้ง',
    desc: 'หมูปิ้งไม้ละสิบ เสียบไม้ทะลุหัว หอมกรุ่นก่อนตักบาตรตอนเช้า',
    price: 160,
    level: 2,
    category: 'costume',
    suit: { kind: 'moopin', main: '#c0703e', shade: '#96512c', pattern: 'grill', patternColor: '#6e3520', patternColor2: '#e8a766', accent: '#ecd49a', accent2: '#e8a766', feet: bootie('#96512c', '#6e3520') },
    tags: ['suit', 'food'],
  },
  {
    id: 'suit_liondance',
    slot: 'suit',
    name: 'ชุดเชิดสิงโตมังกรทอง',
    desc: 'ตุ้ง แช่ ตุ้ง แช่! ขนฟูตาโตกะพริบได้ ความเฮงพุ่งทะลุหลังคา',
    price: 0,
    premium: true,
    category: 'costume',
    suit: { kind: 'liondance', main: '#e8514a', shade: '#b8343f', pattern: 'dots', patternColor: '#ffd54f', belly: '#ffd54f', accent: '#ffd54f', accent2: '#fffaf0', paws: '#fffaf0', feet: bootie('#b8343f', '#8e2533', '#7e2436', '#ffd54f') },
    tags: ['suit', 'tail'],
  },
  {
    id: 'suit_yak',
    slot: 'suit',
    name: 'ชุดยักษ์วัดแจ้ง',
    desc: 'ยักษ์ใจดีเฝ้าประตูวัด ตัวเขียวเขี้ยวงอนแต่ขี้อายสุด ๆ',
    price: 520,
    level: 6,
    category: 'costume',
    suit: { kind: 'yak', main: '#4fae6a', shade: '#378a52', belly: '#ffd54f', accent: '#ffd54f', accent2: '#fffaf0', feet: bootie('#ffd54f', '#e9a53a', '#b8742a') },
    tags: ['suit'],
  },
  {
    id: 'suit_nangkwak',
    slot: 'suit',
    name: 'ชุดแม่นางกวัก',
    desc: 'ชุดไทยแดงทองสวมมงกุฎ กวักเงินกวักทอง เรียกลูกค้าเรียกบุญ',
    price: 399,
    level: 5,
    category: 'costume',
    suit: {
      kind: 'nangkwak',
      head: 'crown',
      main: '#d8343f',
      shade: '#a82632',
      accent: '#ffd54f',
      accent2: '#e9a53a',
      top: { trim: '#ffd54f', sleeve: 'none', pattern: 'thai', patternColor: '#e9a53a', extra: 'sabai', extraColor: '#ffd54f', fit: 'fitted', hem: 'tucked' },
      bottom: { kind: 'sarong', pattern: 'thai', patternColor: '#e9a53a', hem: '#ffd54f', belt: '#ffd54f', buckle: '#fff3a6' },
    },
    tags: ['suit', 'lucky'],
  },
  {
    id: 'suit_naga',
    slot: 'suit',
    name: 'ชุดพญานาคมรกต',
    desc: 'เกล็ดเขียวมรกตเปล่งประกาย หงอนทองพลิ้วไหว ผู้พิทักษ์แห่งลำน้ำโขง',
    price: 0,
    premium: true,
    category: 'costume',
    suit: { kind: 'naga', main: '#2fa88a', shade: '#20806a', pattern: 'scale', patternColor: '#6fe0c0', patternColor2: '#ffd54f', belly: '#ffe9a6', accent: '#ffd54f', accent2: '#e9a53a', shimmer: true, feet: bootie('#20806a', '#176152', '#0f4a3e', '#ffd54f') },
    tags: ['suit', 'tail'],
  },
]

// ======================================================================
// Place-exclusive souvenirs: sold only by the shop NPC at that place.

const SOUVENIRS: OutfitItem[] = [
  // วัดพระแก้ว
  {
    id: 'top_chitralada_gold',
    slot: 'top',
    shopOnly: 'wat_phra_kaew',
    name: 'ชุดไทยจิตรลดาปักทอง',
    desc: 'ไหมเขียวมรกตปักดิ้นทองรอบคอ สง่างามสมกับวัดพระแก้ว',
    price: 320,
    category: 'thai',
    gender: 'f',
    top: { main: '#2f8f6a', shade: '#236e52', sleeve: 'long', pattern: 'thai', patternColor: '#e9b949', patternColor2: '#fff3a6', collar: 'mandarin', collarColor: '#ffd54f', placket: 'buttons', buttonColor: '#ffd54f', cuff: '#ffd54f', fit: 'fitted', hem: 'tucked' },
    tags: ['souvenir'],
  },
  { id: 'head_yakhat', slot: 'head', shopOnly: 'wat_phra_kaew', name: 'หมวกยักษ์วัดพระแก้ว', desc: 'หน้ายักษ์ทวารบาลตาโตเขี้ยวงอน ใส่แล้วดุนิด ๆ แต่น่ารักมาก', price: 260, acc: 'yakhat', category: 'fun', tags: ['souvenir'] },
  // วัดโพธิ์
  {
    id: 'top_watpho_tiles',
    slot: 'top',
    shopOnly: 'wat_pho',
    name: 'เสื้อลายกระเบื้องวัดโพธิ์',
    desc: 'ลายดอกกระเบื้องเคลือบสีสด แบบพระมหาเจดีย์สี่รัชกาล',
    price: 160,
    category: 'thai',
    top: { main: '#3a8fb8', shade: '#2c6f92', sleeve: 'short', pattern: 'floral', patternColor: '#ffd54f', patternColor2: '#fffaf0', collar: 'camp', collarColor: '#5aa9d0', placket: 'buttons', buttonColor: '#fffaf0', hem: 'out' },
    tags: ['souvenir'],
  },
  { id: 'head_massage', slot: 'head', shopOnly: 'wat_pho', name: 'ผ้าคาดหัวหมอนวด', desc: 'ผ้าขาวคาดหัวเหน็บลูกประคบสมุนไพร นวดแผนไทยสูตรวัดโพธิ์', price: 90, acc: 'massageband', category: 'thai', tags: ['souvenir'] },
  // วัดอรุณ
  { id: 'head_chada_prang', slot: 'head', shopOnly: 'wat_arun', name: 'ชฎาพระปรางค์', desc: 'ชฎายอดทรงพระปรางค์ ประดับกระเบื้องสีเหมือนวัดอรุณยามเย็น', price: 300, acc: 'chadaprang', category: 'thai', tags: ['souvenir'] },
  {
    id: 'top_thai_rental',
    slot: 'top',
    shopOnly: 'wat_arun',
    name: 'ชุดไทยให้เช่า',
    desc: 'สไบชมพูติดป้ายร้านเช่า ชั่วโมงละ 200 ถ่ายกับพระปรางค์ให้คุ้ม!',
    price: 120,
    category: 'thai',
    gender: 'f',
    top: { main: '#ffc4d8', shade: '#f59abb', trim: '#ffd54f', sleeve: 'none', pattern: 'silk', patternColor: '#ffe0ea', extra: 'sabai', extraColor: '#e9b949', collar: 'none', pin: '#5aa9e8', fit: 'fitted', hem: 'tucked' },
    tags: ['souvenir'],
  },
  // ศาลพระพรหม
  { id: 'neck_marigold_big', slot: 'neck', shopOnly: 'erawan', name: 'พวงมาลัยดาวเรืองยักษ์', desc: 'มาลัยดาวเรืองพวงโตถวายท่านพรหม ส้มสดจนแสบตา', price: 120, acc: 'marigoldbig', category: 'temple', tags: ['souvenir'] },
  {
    id: 'top_nangram',
    slot: 'top',
    shopOnly: 'erawan',
    name: 'ชุดนางรำหน้าศาลพรหม',
    desc: 'ชุดเขียวขลิบทองแบบนางรำแก้บน รำงาม ๆ ถวายท่านพรหม',
    price: 220,
    category: 'thai',
    gender: 'f',
    top: { main: '#4fae6a', shade: '#378a52', trim: '#ffd54f', sleeve: 'none', pattern: 'sequin', patternColor: '#fff3a6', patternColor2: '#ffd54f', extra: 'khon', extraColor: '#ffd54f', collar: 'none', fit: 'fitted', hem: 'tucked' },
    tags: ['souvenir'],
  },
  // ภูเขาทอง
  {
    id: 'top_344',
    slot: 'top',
    shopOnly: 'golden_mount',
    name: 'เสื้อพิชิต 344 ขั้น',
    desc: 'หลักฐานว่าเดินขึ้นภูเขาทองครบทุกขั้น (หอบนิดหน่อย)',
    price: 100,
    category: 'fun',
    top: { main: '#ffd54f', shade: '#e9a53a', sleeve: 'short', collar: 'crew', graphic: 'star', graphicColor: '#fffaf0', graphicColor2: '#e8514a', number: '344', numberColor: '#8e2533', hem: 'out' },
    tags: ['souvenir'],
  },
  // วัดไตรมิตร
  { id: 'neck_goldchain', slot: 'neck', shopOnly: 'wat_traimit', name: 'สร้อยทองเยาวราช', desc: 'สร้อยทองเส้นโตจากเยาวราช วิ้งเหมือนหลวงพ่อทองคำ', price: 200, acc: 'goldchain', category: 'fun', tags: ['souvenir'] },
  // พระปฐมเจดีย์
  { id: 'head_ngob_pomelo', slot: 'head', shopOnly: 'pathom_chedi', name: 'หมวกงอบลายส้มโอ', desc: 'งอบสานติดลูกส้มโอนครชัยศรี หวานอมเปรี้ยวน่าหยิก', price: 110, acc: 'ngobpomelo', category: 'thai', tags: ['souvenir'] },
  // วัดจุฬามณี
  { id: 'neck_money_garland', slot: 'neck', shopOnly: 'wat_chulamanee', name: 'พวงมาลัยแบงก์', desc: 'มาลัยพับแบงก์สีเขียวชมพู ขอท้าวเวสสุวรรณให้รวย ๆ ปัง ๆ', price: 199, acc: 'moneygarland', category: 'fun', tags: ['souvenir'] },
  // วัดพระพุทธบาท
  { id: 'hand_karipap', slot: 'hand', shopOnly: 'wat_phutthabat', name: 'กะหรี่ปั๊บสระบุรี', desc: 'กะหรี่ปั๊บไส้ไก่ร้อน ๆ ของฝากขากลับจากกราบรอยพระพุทธบาท', price: 80, acc: 'karipap', category: 'fun', tags: ['souvenir'] },
  // อยุธยา
  {
    id: 'top_ayutthaya',
    slot: 'top',
    shopOnly: 'wat_mahathat_ayutthaya',
    name: 'ชุดไทยอยุธยาโบราณ',
    desc: 'ห่มสไบแบบออเจ้า เดินชมวัดเก่าเหมือนหลุดมาจากละคร',
    price: 240,
    category: 'thai',
    gender: 'f',
    top: { main: '#a8d8c0', shade: '#7fb89e', sleeve: 'none', pattern: 'silk', patternColor: '#cdebdc', extra: 'sabai', extraColor: '#c0508e', collar: 'none', fit: 'fitted', hem: 'tucked' },
    tags: ['souvenir', 'set:ayutthaya'],
  },
  {
    id: 'bot_ayutthaya',
    slot: 'bottom',
    shopOnly: 'wat_mahathat_ayutthaya',
    name: 'โจงกระเบนออเจ้า',
    desc: 'โจงผ้าลายอย่างสีครามทอง นุ่งแล้วหลุดปาก "ออเจ้า" ทันที',
    price: 180,
    category: 'thai',
    bottom: { kind: 'jong', main: '#3d4f8f', shade: '#2c3a6e', pattern: 'thai', patternColor: '#e9b949', hem: '#e9b949' },
    tags: ['souvenir', 'set:ayutthaya'],
  },
  // วัดโสธร
  {
    id: 'suit_ramkaebon',
    slot: 'suit',
    shopOnly: 'wat_sothon',
    name: 'ชุดรำแก้บน',
    desc: 'ชุดนางรำเลื่อมทองพร้อมชฎา รำถวายหลวงพ่อโสธรขอบคุณที่ประทานพร',
    price: 260,
    category: 'costume',
    suit: {
      kind: 'ramkaebon',
      head: 'crown',
      main: '#e8709e',
      shade: '#c24f7e',
      accent: '#ffd54f',
      accent2: '#e9a53a',
      top: { trim: '#ffd54f', sleeve: 'none', pattern: 'sequin', patternColor: '#fff3a6', patternColor2: '#ffd54f', extra: 'khon', extraColor: '#ffd54f', fit: 'fitted', hem: 'tucked' },
      bottom: { kind: 'sarong', main: '#8a3a9c', shade: '#66287a', pattern: 'thai', patternColor: '#ffd54f', hem: '#ffd54f', belt: '#ffd54f', buckle: '#e8514a' },
    },
    tags: ['souvenir', 'suit'],
  },
  // วัดสมานรัตนาราม
  { id: 'head_rat_ears', slot: 'head', shopOnly: 'wat_samarn', name: 'หมวกหนูพระพิฆเนศ', desc: 'หูหนูกลมโตแบบหนูบริวาร กระซิบขอพรได้ทั้งสองหู', price: 120, acc: 'ratears', category: 'accessory', tags: ['souvenir'] },
  // วัดห้วยมงคล
  { id: 'head_pineapple', slot: 'head', shopOnly: 'wat_huay_mongkol', name: 'หมวกสับปะรดปราณบุรี', desc: 'สับปะรดหวานฉ่ำจากประจวบฯ ใส่แล้วหัวหินก็ไม่ร้อน', price: 130, acc: 'pineapple', category: 'fun', tags: ['souvenir'] },
  // พระพุทธชินราช
  { id: 'hand_pakbung', slot: 'hand', shopOnly: 'wat_yai_phitsanulok', name: 'ผักบุ้งลอยฟ้า', desc: 'ผัดผักบุ้งโยนข้ามหัวแบบพิษณุโลก รับให้ทันนะ!', price: 90, acc: 'pakbung', category: 'fun', tags: ['souvenir'] },
  // ดอยสุเทพ
  {
    id: 'top_hilltribe',
    slot: 'top',
    shopOnly: 'doi_suthep',
    name: 'เสื้อปักลายชาวดอย',
    desc: 'เสื้อฝ้ายปักแถบลายสีสดจากตลาดบนดอย งานมือทุกฝีเข็ม',
    price: 180,
    category: 'thai',
    top: { main: '#35304a', shade: '#262236', trim: '#e8514a', sleeve: 'long', pattern: 'bands', patternColor: '#e8514a', patternColor2: '#ffd54f', collar: 'mandarin', collarColor: '#e8514a', cuff: '#5ea653', stripe: '#ffd54f', hem: 'out' },
    tags: ['souvenir'],
  },
  { id: 'head_doi_beanie', slot: 'head', shopOnly: 'doi_suthep', name: 'หมวกไหมพรมดอย', desc: 'บีนนี่ถักมือลายเกล็ดหิมะ ปอมปอมฟู ๆ ขึ้นดอยตอนเช้าก็อุ่น', price: 90, acc: 'doibeanie', category: 'accessory', tags: ['souvenir'] },
  // ลำปางหลวง
  { id: 'head_carriage', slot: 'head', shopOnly: 'lampang_luang', name: 'หมวกคนขับรถม้า', desc: 'หมวกปีกกว้างผูกผ้าแดง ก๊อบแก๊บ ๆ พาเที่ยวเมืองลำปาง', price: 150, acc: 'carriagehat', category: 'thai', tags: ['souvenir'] },
  // วัดร่องขุ่น
  {
    id: 'top_white_artist',
    slot: 'top',
    shopOnly: 'wat_rong_khun',
    name: 'ชุดศิลปินขาว',
    desc: 'เสื้อคลุมศิลปินขาวทั้งตัว ติดกระจกวิบวับเหมือนวัดร่องขุ่น',
    price: 260,
    category: 'modern',
    top: { main: '#fbfcff', shade: '#d6deee', trim: '#c9d6ea', sleeve: 'long', pattern: 'sequin', patternColor: '#cfe4fb', patternColor2: '#ffffff', collar: 'mandarin', collarColor: '#e6f0fb', placket: 'buttons', buttonColor: '#b9c8e0', pocket: 'lower2', hem: 'long' },
    tags: ['souvenir'],
  },
  { id: 'head_mirror_shades', slot: 'head', shopOnly: 'wat_rong_khun', name: 'แว่นกระจกเงา', desc: 'เลนส์ปรอทสะท้อนแสง มองวัดขาวกลางแดดก็ไม่แสบตา', price: 110, acc: 'mirrorshades', category: 'accessory', tags: ['souvenir'] },
  // วัดห้วยปลากั้ง
  {
    id: 'top_qipao',
    slot: 'top',
    shopOnly: 'wat_huay_pla_kang',
    name: 'ชุดกี่เพ้าแดงทอง',
    desc: 'กี่เพ้าผ้าต่วนแดงปักดอกโบตั๋นทอง ไหว้เจ้าแม่กวนอิมรับความเฮง',
    price: 260,
    category: 'thai',
    gender: 'f',
    top: { main: '#d8343f', shade: '#a82632', trim: '#ffd54f', sleeve: 'short', pattern: 'floral', patternColor: '#ffd54f', patternColor2: '#ff9fc0', collar: 'mandarin', collarColor: '#ffd54f', pin: '#ffd54f', cuff: '#ffd54f', fit: 'fitted', hem: 'long' },
    tags: ['souvenir'],
  },
  // วัดภูมินทร์
  {
    id: 'bot_sin_nan',
    slot: 'bottom',
    shopOnly: 'wat_phumin',
    name: 'ผ้าซิ่นลายน้ำไหลเมืองน่าน',
    desc: 'ซิ่นทอมือลายน้ำไหลพลิ้ว ๆ นุ่งไปกระซิบรักหน้าจิตรกรรมปู่ม่านย่าม่าน',
    price: 200,
    category: 'thai',
    gender: 'f',
    bottom: { kind: 'sarong', main: '#c0392f', shade: '#8e2533', pattern: 'wave', patternColor: '#ffd54f', patternColor2: '#2e3a6b', hem: '#2e2a3a' },
    tags: ['souvenir'],
  },
  // ย่าโม
  {
    id: 'top_korat',
    slot: 'top',
    shopOnly: 'ya_mo',
    name: 'เสื้อไหมลายโคราช',
    desc: 'ไหมปักธงชัยสีม่วงลายหมี่ ใส่แล้วสง่าแบบลูกหลานย่าโม',
    price: 220,
    category: 'thai',
    top: { main: '#6a4bb0', shade: '#4f358c', sleeve: 'short', pattern: 'mudmee', patternColor: '#ffd54f', patternColor2: '#ff9fc0', collar: 'mandarin', collarColor: '#ffd54f', placket: 'buttons', buttonColor: '#ffd54f', hem: 'out' },
    tags: ['souvenir'],
  },
  // คำชะโนด
  { id: 'neck_naga_scale', slot: 'neck', shopOnly: 'kham_chanod', name: 'สร้อยเกล็ดนาค', desc: 'สร้อยลายเกล็ดพญานาคเขียวทอง ของที่ระลึกจากเมืองบาดาล', price: 180, acc: 'nagascale', category: 'temple', tags: ['souvenir'] },
  // พระธาตุพนม
  { id: 'neck_pakaoma_isan', slot: 'neck', shopOnly: 'that_phanom', name: 'ผ้าขาวม้าอีสานพาดบ่า', desc: 'ผ้าขาวม้าทอมือพาดเฉียงบ่า สไตล์บ่าวสาวริมฝั่งโขง', price: 80, acc: 'pakaomasash', category: 'thai', tags: ['souvenir'] },
  // นครศรีธรรมราช
  { id: 'neck_yant_medal', slot: 'neck', shopOnly: 'nst_mahathat', name: 'สร้อยเหรียญยันต์ปักษ์ใต้', desc: 'เหรียญกลมโตลายยันต์ห้อยเชือกแดง เฮงแบบคนใต้', price: 190, acc: 'yantmedal', category: 'temple', tags: ['souvenir'] },
  // ไอ้ไข่
  { id: 'head_gamecock', slot: 'head', shopOnly: 'ai_khai', name: 'หมวกไก่ชน', desc: 'ไก่ชนหงอนแดงแบบรูปปั้นหน้าศาลไอ้ไข่ เอ้กอี้เอ้กเอ้ก!', price: 160, acc: 'gamecock', category: 'fun', tags: ['souvenir', 'aikhai'] },
  {
    id: 'top_aikhai',
    slot: 'top',
    shopOnly: 'ai_khai',
    name: 'เสื้อไอ้ไข่',
    desc: 'เสื้อสกรีน "ไอ้ไข่" ตัวโต ขอให้โชคดีทันใจ ใส่แล้วถูกหวย (มั้ง)',
    price: 99,
    category: 'fun',
    top: { main: '#e8514a', shade: '#b8343f', sleeve: 'short', collar: 'crew', graphic: 'aikhai', graphicColor: '#fffaf0', graphicColor2: '#ffd54f', hem: 'out' },
    tags: ['souvenir', 'aikhai'],
  },
  // วัดฉลอง
  {
    id: 'top_baba',
    slot: 'top',
    shopOnly: 'wat_chalong',
    name: 'ชุดบาบ๋าภูเก็ต',
    desc: 'เสื้อลูกไม้ฉลุติดเข็มกลัดโกสังทอง สไตล์เพอรานากันเมืองภูเก็ต',
    price: 280,
    category: 'thai',
    gender: 'f',
    top: { main: '#ffd6e0', shade: '#f0b0c4', trim: '#fff2f6', sleeve: 'long', pattern: 'lace', patternColor: '#fff2f6', collar: 'v', placket: 'buttons', buttonColor: '#ffd54f', fit: 'fitted', hem: 'out' },
    tags: ['souvenir'],
  },
  // พระใหญ่ภูเก็ต
  { id: 'head_beach_hat', slot: 'head', shopOnly: 'phuket_big_buddha', name: 'หมวกชายหาดภูเก็ต', desc: 'บักเก็ตลายดอกชบา กันแดดอันดามันบนยอดเขานาคเกิด', price: 100, acc: 'beachhat', category: 'modern', tags: ['souvenir'] },
]

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

  ...LIFESTYLE,
  ...SUITS,
  ...SOUVENIRS,
  ...V4_OUTFITS,
]

export const OUTFIT_BY_ID: Record<string, OutfitItem> = Object.fromEntries(OUTFITS.map((o) => [o.id, o]))

export const STARTER_OUTFITS = OUTFITS.filter((o) => o.starter).map((o) => o.id)

/** Every full-body suit, in shop order. */
export const SUIT_IDS = OUTFITS.filter((o) => o.slot === 'suit').map((o) => o.id)

/** Place id -> ids of the souvenirs only its shop NPC sells. */
export const SHOP_ONLY_BY_PLACE: Record<string, string[]> = OUTFITS.reduce<Record<string, string[]>>((acc, o) => {
  if (o.shopOnly) (acc[o.shopOnly] ??= []).push(o.id)
  return acc
}, {})

/** Granted-only items (packs, battle pass, events): never sold for coins. */
export function isExclusive(o: { exclusive?: Exclusive; premium?: boolean } | null | undefined): boolean {
  return !!o && (!!o.exclusive || !!o.premium)
}

/** Items the general fashion shop may list (not premium-only, not place-only, not pass/pack exclusives). */
export function inGeneralShop(o: OutfitItem): boolean {
  return !o.premium && !o.shopOnly && !o.exclusive
}
