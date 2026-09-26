// Collectible pet companions (สัตว์เลี้ยงคู่ใจ). A pet follows the player
// around the temple world and the home, stands next to the doll in the
// dress-up screen and gives a small passive perk. Sprites live in
// src/art/pets.ts and are keyed by the same ids.
//
// Prices are in Boon Coins. `premium` pets are only granted by real-money
// packs; their `price` is the coin-equivalent value shown on the card.

export type PetRarity = 'common' | 'rare' | 'epic' | 'legend'

/** What a pet's perk boosts. */
export type PetPerkKind =
  /** Merit (บุญ) earned from every activity. */
  | 'merit'
  /** Boon Coins earned from every activity. */
  | 'coin'
  /** Merit from animal-kindness activities (feeding dogs, releasing fish, birds...). */
  | 'animal'
  /** Crafting materials found around the temple. */
  | 'mats'

export type PetSound = 'meow' | 'bark' | 'trumpet' | 'chirp' | 'roar' | 'bubble'

export interface PetPerk {
  kind: PetPerkKind
  /** Percentage bonus, 2..8. */
  pct: number
}

export interface PetDef {
  id: string
  name: string
  desc: string
  /** Boon Coins (coin-equivalent value for premium pets). */
  price: number
  /** Only obtainable from real-money packs. */
  premium?: boolean
  rarity: PetRarity
  /** Hovers above the ground (sprite includes its own soft shadow). */
  flying: boolean
  perk: PetPerk
  sound?: PetSound
}

export const RARITY: Record<PetRarity, { name: string; color: string; order: number }> = {
  common: { name: 'ธรรมดา', color: '#86c95f', order: 0 },
  rare: { name: 'หายาก', color: '#5a8de0', order: 1 },
  epic: { name: 'ล้ำค่า', color: '#9270dc', order: 2 },
  legend: { name: 'ตำนาน', color: '#e9a53a', order: 3 },
}

export const PERK_LABEL: Record<PetPerkKind, string> = {
  merit: 'บุญ',
  coin: 'เหรียญบุญ',
  animal: 'บุญจากการช่วยสัตว์',
  mats: 'วัตถุดิบ',
}

/** Short Thai perk text, e.g. "+5% เหรียญบุญ". */
export function perkText(p: PetPerk): string {
  return `+${p.pct}% ${PERK_LABEL[p.kind]}`
}

export const PETS: PetDef[] = [
  {
    id: 'bangkaew',
    name: 'น้องหมาบางแก้ว',
    desc: 'ขนฟูขาวปุยหางพวงสวย ซื่อสัตย์ที่สุดในสามโลก เดินตามต้อย ๆ ไม่ห่างเลย',
    price: 180,
    rarity: 'common',
    flying: false,
    perk: { kind: 'animal', pct: 4 },
    sound: 'bark',
  },
  {
    id: 'ridgeback',
    name: 'หมาไทยหลังอาน',
    desc: 'มีขนย้อนเป็นแนวอานบนหลัง วิ่งเร็ว ใจกล้า แต่ขี้อ้อนสุด ๆ กับเจ้าของ',
    price: 220,
    rarity: 'common',
    flying: false,
    perk: { kind: 'mats', pct: 3 },
    sound: 'bark',
  },
  {
    id: 'siamese',
    name: 'แมววิเชียรมาศ',
    desc: 'แมวไทยตาสีฟ้าใสแต้มสีน้ำตาลที่หน้าหูเท้า ชอบคลอเคลียขาเวลาไหว้พระ',
    price: 200,
    rarity: 'common',
    flying: false,
    perk: { kind: 'coin', pct: 3 },
    sound: 'meow',
  },
  {
    id: 'korat',
    name: 'แมวโคราช',
    desc: 'แมวสีสวาดขนสีเทาเงินตาเขียวมรกต เชื่อกันว่านำโชคลาภมาให้ผู้เลี้ยง',
    price: 240,
    rarity: 'common',
    flying: false,
    perk: { kind: 'coin', pct: 4 },
    sound: 'meow',
  },
  {
    id: 'turtle',
    name: 'เต่าน้อย',
    desc: 'ค่อย ๆ เดินแต่ไม่เคยหยุด อายุยืนเป็นร้อยปี ปล่อยเต่าได้บุญอายุยืน',
    price: 150,
    rarity: 'common',
    flying: false,
    perk: { kind: 'merit', pct: 2 },
    sound: 'bubble',
  },
  {
    id: 'monkey',
    name: 'ลิงน้อย',
    desc: 'จอมซนหน้าบ้อง ชอบเก็บของเล็กของน้อยมาฝาก บางทีก็เป็นกล้วยครึ่งลูก',
    price: 260,
    rarity: 'common',
    flying: false,
    perk: { kind: 'mats', pct: 4 },
    sound: 'chirp',
  },
  {
    id: 'buffalo',
    name: 'ควายน้อย',
    desc: 'เพื่อนชาวนาตัวจิ๋ว เขาโค้งสวย ขยันเดินตาม ชอบนอนแช่น้ำเย็น ๆ',
    price: 380,
    rarity: 'rare',
    flying: false,
    perk: { kind: 'mats', pct: 5 },
    sound: 'trumpet',
  },
  {
    id: 'elephant',
    name: 'ช้างน้อย',
    desc: 'ลูกช้างสีเทาหูกางแกว่งไปมา ชอบยกงวงทักทาย และพ่นน้ำให้เย็นชื่นใจ',
    price: 450,
    rarity: 'rare',
    flying: false,
    perk: { kind: 'merit', pct: 4 },
    sound: 'trumpet',
  },
  {
    id: 'hornbill',
    name: 'นกเงือก',
    desc: 'นกปากโตโหนกสีทอง รักเดียวใจเดียวตลอดชีวิต เป็นสัญลักษณ์ของความรักแท้',
    price: 480,
    rarity: 'rare',
    flying: false,
    perk: { kind: 'animal', pct: 6 },
    sound: 'chirp',
  },
  {
    id: 'jaderabbit',
    name: 'กระต่ายหยก',
    desc: 'กระต่ายจากดวงจันทร์ ขนขาวแต้มสีหยก กระโดดดึ๋ง ๆ พาความสงบใจมาให้',
    price: 520,
    rarity: 'rare',
    flying: false,
    perk: { kind: 'merit', pct: 5 },
    sound: 'chirp',
  },
  {
    id: 'koi',
    name: 'ปลาคาร์ฟลอยฟ้า',
    desc: 'วิญญาณปลาคาร์ฟแห่งสายน้ำ ว่ายวนกลางอากาศได้ นำโชคและความอุดมสมบูรณ์',
    price: 750,
    rarity: 'epic',
    flying: true,
    perk: { kind: 'coin', pct: 6 },
    sound: 'bubble',
  },
  {
    id: 'hongsa',
    name: 'หงส์ทอง',
    desc: 'หงส์ทองจากป่าหิมพานต์ ลอยสง่างามเหนือพื้น ขนหางพลิ้วเป็นลายกนก',
    price: 900,
    rarity: 'epic',
    flying: true,
    perk: { kind: 'merit', pct: 6 },
    sound: 'chirp',
  },
  {
    id: 'garuda',
    name: 'ครุฑน้อย',
    desc: 'พญาครุฑตัวจิ๋วสวมชฎาทอง กางปีกบินปกป้องเจ้าของ ใจดีแม้หน้าจะดุ',
    price: 980,
    premium: true,
    rarity: 'epic',
    flying: true,
    perk: { kind: 'coin', pct: 7 },
    sound: 'roar',
  },
  {
    id: 'whiteelephant',
    name: 'ช้างเผือก',
    desc: 'ช้างเผือกมงคลคู่บ้านคู่เมือง ผิวขาวอมชมพู สวมเครื่องทรงทองอร่าม',
    price: 1200,
    rarity: 'legend',
    flying: false,
    perk: { kind: 'merit', pct: 7 },
    sound: 'trumpet',
  },
  {
    id: 'dragon',
    name: 'มังกรทองน้อย',
    desc: 'มังกรทองตัวน้อยมีหนวดพลิ้ว ลอยวนรอบตัวนำโชคลาภและความเฮงมาให้',
    price: 1400,
    premium: true,
    rarity: 'legend',
    flying: true,
    perk: { kind: 'coin', pct: 8 },
    sound: 'roar',
  },
  {
    id: 'naga',
    name: 'พญานาคน้อย',
    desc: 'ลูกพญานาคเกล็ดเขียวประกายทอง ลอยเฝ้าคุ้มครองผู้มีบุญ ชอบฟังเสียงสวดมนต์',
    price: 1500,
    premium: true,
    rarity: 'legend',
    flying: true,
    perk: { kind: 'merit', pct: 8 },
    sound: 'roar',
  },
]

export const PET_BY_ID: Record<string, PetDef> = Object.fromEntries(PETS.map((p) => [p.id, p]))

/** Pets sorted for the shop: rarity, then price. */
export function petsForShop(): PetDef[] {
  return [...PETS].sort((a, b) => RARITY[a.rarity].order - RARITY[b.rarity].order || a.price - b.price)
}
