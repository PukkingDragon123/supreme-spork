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
