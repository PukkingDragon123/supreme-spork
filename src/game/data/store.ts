// Real-money products (in-app purchases). Product ids are what you would
// register in App Store Connect / Google Play Console.

export interface CoinPack {
  id: string
  name: string
  coins: number
  bonus: number
  priceTHB: number
  badge?: string
  art: 'pouch-s' | 'pouch-m' | 'pouch-l' | 'chest' | 'temple'
}

export const COIN_PACKS: CoinPack[] = [
  { id: 'boondee.coins.100', name: 'ถุงบุญใบเล็ก', coins: 100, bonus: 0, priceTHB: 35, art: 'pouch-s' },
  { id: 'boondee.coins.300', name: 'ถุงบุญใบกลาง', coins: 300, bonus: 30, priceTHB: 99, art: 'pouch-m', badge: 'ขายดี' },
  { id: 'boondee.coins.650', name: 'ถุงบุญใบใหญ่', coins: 650, bonus: 100, priceTHB: 199, art: 'pouch-l' },
  { id: 'boondee.coins.1400', name: 'หีบบุญ', coins: 1400, bonus: 300, priceTHB: 399, art: 'chest', badge: 'คุ้มสุด' },
  { id: 'boondee.coins.3800', name: 'กองบุญมหากุศล', coins: 3800, bonus: 1000, priceTHB: 999, art: 'temple' },
]

export interface SpecialOffer {
  id: string
  name: string
  desc: string
  priceTHB: number
  coins: number
  items?: Record<string, number>
  outfits?: string[]
  /** Pet companions included (premium pets come only from packs). */
  pets?: string[]
  buff?: { kind: 'merit' | 'coin'; mult: number; minutes: number }
  oneTime?: boolean
  /** Monthly pass: daily coin drip for 30 days. */
  monthly?: { daily: number; days: number }
}

export const SPECIAL_OFFERS: SpecialOffer[] = [
  {
    id: 'boondee.starter',
    name: 'แพ็กเริ่มต้นสายบุญ',
    desc: '200 คอยน์ + เสื้อบุญดีลิมิเต็ด + ชุดสังฆทาน + บุญ x2 นาน 1 ชั่วโมง',
    priceTHB: 49,
    coins: 200,
    items: { sangkhathan: 1, gold_leaf: 2 },
    outfits: ['top_boondee'],
    buff: { kind: 'merit', mult: 2, minutes: 60 },
    oneTime: true,
  },
  {
    id: 'boondee.pet.dragon',
    name: 'แพ็กมังกรทองน้อย',
    desc: 'มังกรทองน้อยเดินตามคุณทุกที่ (เหรียญ +8%) + 300 คอยน์',
    priceTHB: 199,
    coins: 300,
    pets: ['dragon'],
  },
  {
    id: 'boondee.set.khon',
    name: 'ชุดเทวดาโขนทอง',
    desc: 'ชฎาทอง + ปีกเทวดา + ออร่าทองเปล่งประกาย + 200 คอยน์',
    priceTHB: 149,
    coins: 200,
    outfits: ['head_chada', 'back_angel', 'back_aura', 'top_khon', 'bot_khon'],
  },
  {
    id: 'boondee.pet.naga',
    name: 'แพ็กพญานาคน้อย',
    desc: 'พญานาคน้อยเกล็ดทองลอยตามคุณ (บุญ +8%) + 300 คอยน์',
    priceTHB: 199,
    coins: 300,
    pets: ['naga'],
  },
  {
    id: 'boondee.pet.garuda',
    name: 'แพ็กครุฑน้อย',
    desc: 'ครุฑน้อยผู้พิทักษ์ (เหรียญ +7%) + 150 คอยน์',
    priceTHB: 129,
    coins: 150,
    pets: ['garuda'],
  },
  {
    id: 'boondee.monthly',
    name: 'บัตรบุญรายเดือน',
    desc: 'รับทันที 150 คอยน์ และรับเพิ่มวันละ 40 คอยน์ นาน 30 วัน',
    priceTHB: 129,
    coins: 150,
    monthly: { daily: 40, days: 30 },
  },
]

export const AD_REWARD_COINS = 15
export const AD_DAILY_LIMIT = 5

/** Crafting material bundles bought with Boon Coins. */
export const MATERIAL_PACKS: { id: string; name: string; desc: string; price: number; mats: Partial<Record<'wood' | 'cloth' | 'clay' | 'gold' | 'flower', number>> }[] = [
  { id: 'mat_wood', name: 'มัดไม้สัก', desc: 'ไม้ 5 ชิ้น สำหรับเฟอร์นิเจอร์', price: 40, mats: { wood: 5 } },
  { id: 'mat_cloth', name: 'พับผ้าไหม', desc: 'ผ้า 5 ผืน สำหรับหมอนและม่าน', price: 40, mats: { cloth: 5 } },
  { id: 'mat_clay', name: 'ตะกร้าดินเผา', desc: 'ดินเผา 5 ชิ้น สำหรับกระถางและโคม', price: 40, mats: { clay: 5 } },
  { id: 'mat_flower', name: 'กำดอกไม้', desc: 'ดอกไม้ 5 ดอก หอมสดชื่น', price: 30, mats: { flower: 5 } },
  { id: 'mat_gold', name: 'ทองคำเปลว', desc: 'ทอง 3 แผ่น สำหรับของชิ้นพิเศษ', price: 60, mats: { gold: 3 } },
  { id: 'mat_all', name: 'ชุดช่างใหญ่', desc: 'ทุกอย่างอย่างละ 4 คุ้มที่สุด', price: 150, mats: { wood: 4, cloth: 4, clay: 4, flower: 4, gold: 4 } },
]
