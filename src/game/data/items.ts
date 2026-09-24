// Consumable items bought with Boon Coins: alms food, offerings, animal food.

export type ItemCategory = 'alms' | 'offering' | 'animal' | 'special'

export interface Item {
  id: string
  name: string
  desc: string
  category: ItemCategory
  price: number
  /** Merit gained when this item is used. */
  merit: number
  /** Pixel icon key (see art/icons.ts). */
  icon: string
  /** Units received per purchase (e.g. a bag of 10 fish pellets). */
  pack?: number
  level?: number
}

export const ITEMS: Item[] = [
  // ตักบาตร – alms food
  { id: 'rice', name: 'ข้าวสวยร้อน ๆ', desc: 'ข้าวหอมมะลิหุงใหม่ ตักใส่บาตรพระ', category: 'alms', price: 5, merit: 6, icon: 'rice' },
  { id: 'sticky', name: 'ข้าวเหนียว', desc: 'ข้าวเหนียวนึ่งห่อใบตอง', category: 'alms', price: 5, merit: 6, icon: 'sticky' },
  { id: 'curry', name: 'แกงเขียวหวาน', desc: 'กับข้าวถุงหอมกรุ่น', category: 'alms', price: 8, merit: 8, icon: 'curry' },
  { id: 'egg', name: 'ไข่พะโล้', desc: 'ไข่พะโล้หวานกลมกล่อม', category: 'alms', price: 8, merit: 8, icon: 'egg' },
  { id: 'dessert', name: 'ขนมไทย', desc: 'ทองหยิบ ฝอยทอง ขนมมงคล', category: 'alms', price: 6, merit: 7, icon: 'dessert' },
  { id: 'banana', name: 'กล้วยน้ำว้า', desc: 'ผลไม้สุกกำลังดี', category: 'alms', price: 4, merit: 5, icon: 'banana' },
  { id: 'water', name: 'น้ำดื่ม', desc: 'น้ำดื่มสะอาดถวายพระ', category: 'alms', price: 3, merit: 4, icon: 'water' },
  { id: 'lotus', name: 'ดอกบัว', desc: 'ดอกบัวบูชาพระรัตนตรัย', category: 'alms', price: 4, merit: 5, icon: 'lotus' },
  {
    id: 'sangkhathan',
    name: 'ชุดสังฆทาน',
    desc: 'ชุดใหญ่ ของใช้จำเป็นสำหรับพระสงฆ์ บุญแรง!',
    category: 'alms',
    price: 40,
    merit: 45,
    icon: 'sangkhathan',
    level: 3,
  },

  // ไหว้พระ ไหว้เทพ – offerings
  { id: 'incense', name: 'ธูปเทียนแพ', desc: 'ธูป เทียน ดอกไม้ ชุดบูชาพื้นฐาน', category: 'offering', price: 3, merit: 3, icon: 'incense', pack: 3 },
  { id: 'garland', name: 'พวงมาลัยดาวเรือง', desc: 'มาลัยสีส้มสดใส ถวายได้ทุกองค์', category: 'offering', price: 8, merit: 8, icon: 'garland' },
  { id: 'rose', name: 'กุหลาบแดง', desc: 'ดอกกุหลาบสีแดงสด', category: 'offering', price: 8, merit: 8, icon: 'rose' },
  { id: 'fruit', name: 'ผลไม้มงคล', desc: 'กล้วย ส้ม องุ่น จัดใส่พาน', category: 'offering', price: 10, merit: 10, icon: 'fruit' },
  { id: 'laddu', name: 'ขนมลาดู', desc: 'ขนมหวานสีส้มที่พระพิฆเนศโปรดปราน', category: 'offering', price: 10, merit: 10, icon: 'laddu' },
  { id: 'milk', name: 'นมสด', desc: 'นมสดถวายเทพ', category: 'offering', price: 6, merit: 6, icon: 'milk' },
  { id: 'redsoda', name: 'น้ำแดง', desc: 'น้ำแดงเย็น ๆ ของโปรดสายมู', category: 'offering', price: 5, merit: 5, icon: 'redsoda' },
  { id: 'boiled_egg', name: 'ไข่ต้ม', desc: 'ไข่ต้มปอกเปลือก ถวายพญานาค', category: 'offering', price: 6, merit: 6, icon: 'boiledegg' },
  { id: 'elephant', name: 'ช้างไม้', desc: 'ช้างไม้แกะสลักคู่ ถวายพระพรหม', category: 'offering', price: 20, merit: 20, icon: 'elephant' },
  { id: 'tea', name: 'น้ำชาจีน', desc: 'ชาร้อนหอม ๆ ถวายเจ้าแม่กวนอิม', category: 'offering', price: 6, merit: 6, icon: 'tea' },
  { id: 'gold_leaf', name: 'แผ่นทองคำเปลว', desc: 'ใช้ปิดทององค์พระ', category: 'offering', price: 10, merit: 12, icon: 'goldleaf' },

  // สัตว์ – animal food
  { id: 'fish_food', name: 'อาหารปลา', desc: 'ถุงละ 12 เม็ด ให้ปลาคาร์ฟในบ่อวัด', category: 'animal', price: 5, merit: 1, icon: 'fishfood', pack: 12 },
  { id: 'dog_food', name: 'อาหารเม็ดน้องหมา', desc: 'อาหารเม็ดโภชนาการครบ', category: 'animal', price: 5, merit: 8, icon: 'dogfood' },
  { id: 'chicken', name: 'ไก่ต้มฉีก', desc: 'ของโปรดน้องหมาวัด ความสนิท +2', category: 'animal', price: 8, merit: 10, icon: 'chicken' },
  { id: 'catfish_food', name: 'ขนมปังให้ปลา', desc: 'ขนมปังก้อนสำหรับปลาสวายริมน้ำ', category: 'animal', price: 5, merit: 1, icon: 'bread', pack: 12, level: 6 },

  // พิเศษ
  { id: 'krathong', name: 'กระทงใบตอง', desc: 'กระทงดอกไม้ ลอยขอพรที่วัดริมน้ำ', category: 'special', price: 15, merit: 15, icon: 'krathong', level: 6 },
  { id: 'lottery_ticket', name: 'สิทธิ์ขูดเลขเพิ่ม', desc: 'ขูดเลขต้นตะเคียนเพิ่ม 1 ครั้ง', category: 'special', price: 15, merit: 0, icon: 'powder' },
]

export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.id, i]))

/** Items the player starts with. */
export const STARTER_INVENTORY: Record<string, number> = {
  rice: 3,
  curry: 1,
  banana: 2,
  water: 2,
  incense: 6,
  garland: 1,
  fish_food: 12,
  dog_food: 2,
  gold_leaf: 1,
}

export interface Boost {
  id: string
  name: string
  desc: string
  price: number
  icon: string
  buff: { kind: 'merit' | 'coin'; mult: number; minutes: number }
}

export const BOOSTS: Boost[] = [
  { id: 'boost_merit2', name: 'บุญทวีคูณ x2', desc: 'ได้บุญ (EXP) สองเท่า 30 นาที', price: 60, icon: 'boost', buff: { kind: 'merit', mult: 2, minutes: 30 } },
  { id: 'boost_merit15', name: 'บุญเสริม x1.5', desc: 'ได้บุญเพิ่มครึ่งหนึ่ง 2 ชั่วโมง', price: 90, icon: 'boost2', buff: { kind: 'merit', mult: 1.5, minutes: 120 } },
  { id: 'boost_coin', name: 'ถุงเงินถุงทอง', desc: 'เหรียญจากภารกิจ +50% 1 ชั่วโมง', price: 50, icon: 'coinbag', buff: { kind: 'coin', mult: 1.5, minutes: 60 } },
]
