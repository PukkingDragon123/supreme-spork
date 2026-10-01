// Consumable items bought with Boon Coins: alms food, offerings, animal food.

export type ItemCategory = 'alms' | 'offering' | 'animal' | 'special' | 'ingredient' | 'dish'

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
  /** Cooked dishes: id of the plain dish this 3★ "ฝีมือเชฟ" variant belongs to. */
  base?: string
  /** Cooked dishes: the 3★ gold variant (1.5× merit). */
  gold?: boolean
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

/**
 * Items the player starts with: nothing. บอทน้อย lends what each tutorial
 * step needs and gives the whole starter kit at the end (src/game/
 * botnoiTutorial.ts TUT_REWARD); his quests pay items when turned in.
 */
export const STARTER_INVENTORY: Record<string, number> = {}

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

// ---------------------------------------------------------------------------
// Cooking (unlocks at level 10): raw ingredients sold at the 7-บุญ mart and
// home-cooked dishes. Dishes are offered in ตักบาตร like bought alms food but
// are worth far more merit; a 3★ cook gives the "ฝีมือเชฟ" (gold) variant
// with 1.5× merit. Recipes live in data/recipes.ts, rules in game/cooking.ts
// and icons in art/cooking.ts (`foodIcon(id)`; each item's `icon` is its id).

const ing = (id: string, name: string, desc: string, price: number, pack?: number): Item => ({
  id,
  name,
  desc,
  category: 'ingredient',
  price,
  merit: 0,
  icon: id,
  ...(pack ? { pack } : {}),
})

export const INGREDIENTS: Item[] = [
  ing('ing_egg', 'ไข่ไก่สด', 'แพ็คละ 4 ฟอง ไข่ใหม่จากฟาร์ม ใช้ได้แทบทุกเมนู', 8, 4),
  ing('ing_rice', 'ข้าวสารหอมมะลิ', 'ถุงละ 3 ถ้วย หุงแล้วหอมฟุ้งทั้งบ้าน', 6, 3),
  ing('ing_sticky', 'ข้าวเหนียวเขี้ยวงู', 'แช่น้ำไว้แล้ว พร้อมนึ่ง แพ็คละ 2 ถ้วย', 6, 2),
  ing('ing_pork', 'หมูสับ', 'หมูสับสดใหม่ แพ็คพอดีหนึ่งมื้อ', 10),
  ing('ing_chicken', 'อกไก่สด', 'ไก่สดหั่นชิ้นพอดีคำ นุ่มไม่แห้ง', 10),
  ing('ing_tofu', 'เต้าหู้ไข่', 'หลอดละ 2 แท่ง นุ่มละมุนลิ้น', 6, 2),
  ing('ing_noodle', 'เส้นจันท์', 'เส้นผัดไทยเหนียวนุ่มจากจันทบุรี', 8),
  ing('ing_basil', 'ใบกะเพรา', 'กะเพราป่ากลิ่นแรง กำละ 2 มื้อ', 4, 2),
  ing('ing_chili', 'พริกขี้หนู', 'เผ็ดจี๊ดจ๊าด แพ็คละ 3 กำ', 3, 3),
  ing('ing_garlic', 'กระเทียมไทย', 'กลีบเล็กหอมแรง แพ็คละ 3 หัว', 3, 3),
  ing('ing_veg', 'ผักรวมสด', 'ผักกาด ต้นหอม ถั่วงอก มะเขือ สดกรอบ แพ็คละ 2', 5, 2),
  ing('ing_coconut', 'กะทิสด', 'กะทิคั้นสดข้นมัน หอมมะพร้าว', 8),
  ing('ing_paste', 'พริกแกงเขียวหวาน', 'พริกแกงตำเองสูตรคุณยาย', 8),
  ing('ing_mango', 'มะม่วงน้ำดอกไม้', 'สุกเหลืองหวานหอม ลูกโต', 10),
  ing('ing_flour', 'แป้งข้าวเหนียว', 'ใช้ปั้นบัวลอยและทำขนมครก แพ็คละ 2', 5, 2),
  ing('ing_sugar', 'น้ำตาลปี๊บ', 'หวานหอมกลิ่นมะพร้าว แพ็คละ 3', 3, 3),
  ing('ing_fishsauce', 'น้ำปลาแท้', 'ขวดเล็กเค็มกลมกล่อม ใช้ได้ 3 ครั้ง', 3, 3),
  ing('ing_oil', 'น้ำมันพืช', 'ขวดเล็กใช้ได้ 4 ครั้ง', 4, 4),
]

/** The 3★ gold variant of a dish is worth this many times the plain dish. */
export const GOLD_MERIT_MULT = 1.5

const dish = (id: string, name: string, desc: string, merit: number): Item[] => [
  { id, name, desc, category: 'dish', price: 0, merit, icon: id },
  {
    id: `${id}_gold`,
    name: `${name} ฝีมือเชฟ`,
    desc: `${desc} · ทำได้ 3 ดาว บุญพิเศษ!`,
    category: 'dish',
    price: 0,
    merit: Math.round(merit * GOLD_MERIT_MULT),
    icon: `${id}_gold`,
    base: id,
    gold: true,
  },
]

/** Home-cooked dishes (plain + gold). Offer them in ตักบาตร for big merit. */
export const DISHES: Item[] = [
  ...dish('dish_kaijiao', 'ไข่เจียวฟูกรอบ', 'ไข่เจียวทอดฟูกรอบ ราดข้าวสวยร้อน ๆ', 18),
  ...dish('dish_khaopad', 'ข้าวผัดไข่', 'ข้าวผัดหอมกระทะ เสิร์ฟกับแตงกวาและมะนาว', 20),
  ...dish('dish_tomjued', 'ต้มจืดเต้าหู้หมูสับ', 'น้ำซุปใสหวานผัก เต้าหู้นุ่ม หมูสับก้อนกลม', 22),
  ...dish('dish_khaotom', 'ข้าวต้มหมู', 'ข้าวต้มร้อน ๆ โรยกระเทียมเจียวและต้นหอม', 22),
  ...dish('dish_kaprao', 'ผัดกะเพราหมูสับ', 'เมนูในดวงใจ หอมกะเพรา เผ็ดกำลังดี', 26),
  ...dish('dish_khanomkrok', 'ขนมครก', 'ขนมครกหอมกะทิ กรอบนอกนุ่มใน', 26),
  ...dish('dish_bualoy', 'บัวลอยสามสี', 'บัวลอยใบเตย อัญชัน ฟักทอง ในน้ำกะทิหอม', 28),
  ...dish('dish_padthai', 'ผัดไทยห่อไข่', 'เส้นจันท์ผัดซอสมะขาม ห่อไข่สวยงาม', 30),
  ...dish('dish_mango', 'ข้าวเหนียวมะม่วง', 'มะม่วงน้ำดอกไม้กับข้าวเหนียวมูนราดกะทิ', 32),
  ...dish('dish_kiaowan', 'แกงเขียวหวานไก่', 'แกงเขียวหวานเข้มข้น ไก่นุ่ม หอมใบโหระพา', 36),
]

export const INGREDIENT_IDS = INGREDIENTS.map((i) => i.id)
export const DISH_IDS = DISHES.map((i) => i.id)

// Cooking items join the shared catalogue so the bag, buyItem/useItem and
// the level-up checks treat them like any other consumable. The shop screen
// and the alms tray filter by category, so neither lists them by accident.
ITEMS.push(...INGREDIENTS, ...DISHES)
for (const it of [...INGREDIENTS, ...DISHES]) ITEM_BY_ID[it.id] = it

/** Gold (3★ "ฝีมือเชฟ") variant id of a dish. */
export const goldDishId = (dishId: string) => (dishId.endsWith('_gold') ? dishId : `${dishId}_gold`)

export const isDish = (id: string) => ITEM_BY_ID[id]?.category === 'dish'
export const isIngredient = (id: string) => ITEM_BY_ID[id]?.category === 'ingredient'

/** Ready-made alms food the 7-บุญ mart also stocks (ชุดตักบาตรพร้อมถวาย). */
export const MART_ALMS = ['rice', 'sticky', 'curry', 'egg', 'dessert', 'banana', 'water', 'milk', 'redsoda', 'tea', 'sangkhathan']

/** Everything sold at the 7-บุญ counter (hotspot `shop:mart`): alms food first, then ingredients. */
export const MART_STOCK = [...MART_ALMS, ...INGREDIENT_IDS]
