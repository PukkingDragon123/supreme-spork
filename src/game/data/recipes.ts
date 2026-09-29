// Cooking recipes (unlocks at player level 10). Each recipe is a short run of
// Cooking-Mama-style mini-game steps; the average step score becomes 1–3
// stars (see game/cooking.ts). Ingredients are items sold at the 7-บุญ mart
// (data/items.ts INGREDIENTS); `makes` is the plain dish item, a 3★ cook
// gives its gold "ฝีมือเชฟ" variant instead plus one bonus serving.

export type StepKind = 'chop' | 'crack' | 'stir' | 'pour' | 'fry' | 'season' | 'shape' | 'wrap' | 'plate'

/** Where a step happens in the kitchen. */
export type Vessel = 'wok' | 'pan' | 'pot' | 'bowl' | 'krok' | 'board'

/** Bottles on the spice shelf used by `season` steps. */
export type Condiment = 'fishsauce' | 'sugar' | 'chili' | 'soy' | 'lime' | 'pepper' | 'tamarind'

/** Food drawn on the board or in a vessel (art/cooking.ts knows each key). */
export type Bit =
  | 'garlic'
  | 'chili'
  | 'basil'
  | 'pork'
  | 'chicken'
  | 'tofu'
  | 'cabbage'
  | 'onion'
  | 'mango'
  | 'eggplant'
  | 'cucumber'
  | 'rice'
  | 'egg'
  | 'noodle'
  | 'curry'
  | 'batter'
  | 'porridge'
  | 'soup'
  | 'sticky'
  | 'dough'
  | 'coconut'

export type Liquid = 'water' | 'oil' | 'coconut' | 'batter' | 'broth'

export interface CookStep {
  kind: StepKind
  /** Instruction shown under the kitchen (Thai, short). */
  text: string
  /** chop: things on the board · stir: what is in the vessel · shape: dough kind. */
  items?: Bit[]
  /** crack: eggs · stir: turns · chop: cuts per item · shape/wrap: pieces · fry: pieces · pour: cups. */
  n?: number
  vessel?: Vessel
  /** season: condiments to add, in this order. */
  order?: Condiment[]
  /** pour: what is poured. */
  liquid?: Liquid
  /** plate: served on a plate, in a bowl or on a banana leaf. */
  serve?: 'plate' | 'bowl' | 'leaf'
}

export interface CookRecipe {
  id: string
  name: string
  desc: string
  /** Player level needed (10–20). */
  level: number
  steps: CookStep[]
  /** Item id → amount consumed. */
  ingredients: Record<string, number>
  /** Plain dish item id (data/items.ts DISHES). */
  makes: string
  /** Servings made (a 3★ cook adds one bonus serving). */
  qty: number
  /** One-line kitchen wisdom on the recipe card. */
  tip: string
}

export const RECIPES: CookRecipe[] = [
  {
    id: 'kaijiao',
    name: 'ไข่เจียว',
    desc: 'เมนูแรกของทุกบ้าน ไข่ฟู ขอบกรอบ หอมน้ำปลา',
    level: 10,
    makes: 'dish_kaijiao',
    qty: 1,
    ingredients: { ing_egg: 2, ing_fishsauce: 1, ing_oil: 1 },
    tip: 'น้ำมันต้องร้อนจัด ไข่ถึงจะฟูเป็นดอก',
    steps: [
      { kind: 'crack', text: 'ตอกไข่ลงชาม แตะตอนไข่อยู่ตรงขอบชาม!', n: 2, vessel: 'bowl' },
      { kind: 'stir', text: 'ตีไข่ให้ฟู วนนิ้วเป็นวงกลมในชาม', n: 3, vessel: 'bowl', items: ['egg'] },
      { kind: 'pour', text: 'กดค้างเทน้ำมันลงกระทะ ปล่อยที่ขีดทอง', liquid: 'oil', vessel: 'pan' },
      { kind: 'fry', text: 'รอให้เหลืองทอง แล้วแตะเพื่อกลับด้าน!', n: 2, vessel: 'pan', items: ['egg'] },
      { kind: 'plate', text: 'ลากไข่เจียวไปวางบนข้าวสวย', serve: 'plate' },
    ],
  },
  {
    id: 'khaopad',
    name: 'ข้าวผัด',
    desc: 'ข้าวผัดไข่หอมกระทะ ร้อน ๆ ควันฉุย',
    level: 11,
    makes: 'dish_khaopad',
    qty: 1,
    ingredients: { ing_rice: 1, ing_egg: 1, ing_garlic: 1, ing_veg: 1, ing_fishsauce: 1, ing_oil: 1 },
    tip: 'ใช้ข้าวค้างคืน เม็ดจะร่วนสวยไม่แฉะ',
    steps: [
      { kind: 'chop', text: 'ปาดนิ้วผ่านกระเทียมกับต้นหอมเพื่อหั่น', items: ['garlic', 'onion'], n: 3, vessel: 'board' },
      { kind: 'crack', text: 'ตอกไข่ลงกระทะ แตะตอนไข่อยู่ตรงขอบ!', n: 1, vessel: 'wok' },
      { kind: 'stir', text: 'ผัดข้าวให้ทั่ว วนนิ้วรอบกระทะเร็ว ๆ', n: 4, vessel: 'wok', items: ['rice', 'egg', 'onion'] },
      { kind: 'season', text: 'ปรุงรสตามสูตร แตะขวดตามลำดับ', order: ['soy', 'fishsauce', 'sugar'], vessel: 'wok' },
      { kind: 'plate', text: 'ตักข้าวผัดใส่จาน วางแตงกวากับมะนาว', serve: 'plate' },
    ],
  },
  {
    id: 'tomjued',
    name: 'ต้มจืดเต้าหู้',
    desc: 'ต้มจืดเต้าหู้หมูสับ น้ำซุปใส ๆ หวานผัก',
    level: 12,
    makes: 'dish_tomjued',
    qty: 1,
    ingredients: { ing_tofu: 1, ing_pork: 1, ing_veg: 1, ing_garlic: 1 },
    tip: 'ปั้นหมูก้อนเล็ก ๆ จะสุกเร็วและนุ่ม',
    steps: [
      { kind: 'chop', text: 'หั่นเต้าหู้และผักกาดเป็นชิ้นพอดีคำ', items: ['tofu', 'cabbage'], n: 3, vessel: 'board' },
      { kind: 'pour', text: 'กดค้างเติมน้ำซุปลงหม้อ ถึงขีดทองพอดี', liquid: 'broth', vessel: 'pot' },
      { kind: 'shape', text: 'ลากหมูสับไปปั้นเป็นก้อนกลมในช่อง', items: ['pork'], n: 4 },
      { kind: 'season', text: 'ปรุงรสอ่อน ๆ แตะขวดตามลำดับ', order: ['fishsauce', 'pepper'], vessel: 'pot' },
      { kind: 'plate', text: 'ตักต้มจืดใส่ชามให้สวย', serve: 'bowl' },
    ],
  },
  {
    id: 'khaotom',
    name: 'ข้าวต้มหมู',
    desc: 'ข้าวต้มร้อน ๆ ยามเช้า อุ่นท้องสบายใจ',
    level: 13,
    makes: 'dish_khaotom',
    qty: 2,
    ingredients: { ing_rice: 1, ing_pork: 1, ing_garlic: 1, ing_fishsauce: 1 },
    tip: 'คนเบา ๆ ข้าวจะไม่ติดก้นหม้อ',
    steps: [
      { kind: 'pour', text: 'กดค้างเติมน้ำลงหม้อ ปล่อยที่ขีดทอง', liquid: 'water', vessel: 'pot' },
      { kind: 'shape', text: 'ปั้นหมูสับเป็นก้อนกลม ลากไปวางในช่อง', items: ['pork'], n: 4 },
      { kind: 'stir', text: 'คนข้าวต้มช้า ๆ วนรอบหม้อ', n: 3, vessel: 'pot', items: ['porridge', 'pork'] },
      { kind: 'season', text: 'ปรุงรสตามสูตร แตะขวดตามลำดับ', order: ['fishsauce', 'pepper', 'soy'], vessel: 'pot' },
      { kind: 'plate', text: 'ตักข้าวต้มใส่ชาม โรยต้นหอม', serve: 'bowl' },
    ],
  },
  {
    id: 'kaprao',
    name: 'ผัดกะเพราหมูสับ',
    desc: 'เมนูสิ้นคิดที่อร่อยที่สุด หอมกะเพราเผ็ดร้อน',
    level: 14,
    makes: 'dish_kaprao',
    qty: 1,
    ingredients: { ing_pork: 1, ing_basil: 1, ing_chili: 1, ing_garlic: 1, ing_rice: 1, ing_oil: 1, ing_fishsauce: 1 },
    tip: 'ใส่ใบกะเพราตอนท้าย ปิดไฟทันที หอมสุด ๆ',
    steps: [
      { kind: 'chop', text: 'สับพริกกับกระเทียมให้ละเอียด!', items: ['chili', 'garlic'], n: 4, vessel: 'board' },
      { kind: 'stir', text: 'ผัดหมูสับไฟแรง วนนิ้วรอบกระทะ', n: 4, vessel: 'wok', items: ['pork', 'chili'] },
      { kind: 'season', text: 'ปรุงรสตามสูตร แตะขวดตามลำดับ', order: ['soy', 'fishsauce', 'sugar'], vessel: 'wok' },
      { kind: 'stir', text: 'ใส่ใบกะเพรา ผัดเร็ว ๆ อีกนิด', n: 2, vessel: 'wok', items: ['pork', 'basil', 'chili'] },
      { kind: 'plate', text: 'ตักกะเพราราดข้าวสวยร้อน ๆ', serve: 'plate' },
    ],
  },
  {
    id: 'khanomkrok',
    name: 'ขนมครก',
    desc: 'ขนมครกหน้ากะทิ ผัวเมียประกบกันกลมดิ๊ก',
    level: 15,
    makes: 'dish_khanomkrok',
    qty: 2,
    ingredients: { ing_flour: 1, ing_coconut: 1, ing_sugar: 1 },
    tip: 'รอให้ขอบกรอบสีทองก่อนแคะ จะไม่แตก',
    steps: [
      { kind: 'stir', text: 'คนแป้งกับกะทิให้เนียน วนนิ้วในชาม', n: 3, vessel: 'bowl', items: ['batter'] },
      { kind: 'pour', text: 'หยอดแป้งลงหลุม กดค้างแล้วปล่อยที่ขีด', liquid: 'batter', vessel: 'krok', n: 3 },
      { kind: 'fry', text: 'รอขอบเหลืองกรอบ แล้วแตะเพื่อแคะขนม!', n: 3, vessel: 'krok', items: ['batter'] },
      { kind: 'plate', text: 'เรียงขนมครกบนใบตอง', serve: 'leaf' },
    ],
  },
  {
    id: 'bualoy',
    name: 'บัวลอย',
    desc: 'บัวลอยสามสีในน้ำกะทิ หวานมัน ชื่นใจ',
    level: 16,
    makes: 'dish_bualoy',
    qty: 2,
    ingredients: { ing_flour: 1, ing_coconut: 1, ing_sugar: 1 },
    tip: 'ปั้นเม็ดเล็กเท่ากัน จะสุกพร้อมกันพอดี',
    steps: [
      { kind: 'shape', text: 'ปั้นแป้งเป็นเม็ดกลม ลากไปวางในช่อง', items: ['dough'], n: 6 },
      { kind: 'pour', text: 'กดค้างเทกะทิลงหม้อ ถึงขีดทองพอดี', liquid: 'coconut', vessel: 'pot' },
      { kind: 'stir', text: 'คนเบา ๆ ให้บัวลอยลอยขึ้น', n: 3, vessel: 'pot', items: ['dough', 'coconut'] },
      { kind: 'season', text: 'เติมความหวาน แตะขวดตามลำดับ', order: ['sugar', 'sugar'], vessel: 'pot' },
      { kind: 'plate', text: 'ตักบัวลอยใส่ถ้วยน่ารัก ๆ', serve: 'bowl' },
    ],
  },
  {
    id: 'padthai',
    name: 'ผัดไทย',
    desc: 'ผัดไทยห่อไข่ เส้นเหนียวนุ่ม ซอสมะขามเข้มข้น',
    level: 17,
    makes: 'dish_padthai',
    qty: 1,
    ingredients: { ing_noodle: 1, ing_egg: 1, ing_tofu: 1, ing_veg: 1, ing_sugar: 1, ing_fishsauce: 1, ing_oil: 1 },
    tip: 'ซอสดีต้องเปรี้ยว หวาน เค็ม ครบรส',
    steps: [
      { kind: 'chop', text: 'หั่นเต้าหู้กับกุยช่ายเป็นท่อน', items: ['tofu', 'onion'], n: 3, vessel: 'board' },
      { kind: 'stir', text: 'ผัดเส้นจันท์ให้นุ่ม วนนิ้วรอบกระทะ', n: 4, vessel: 'wok', items: ['noodle', 'tofu', 'onion'] },
      { kind: 'season', text: 'ปรุงซอสผัดไทย แตะขวดตามลำดับ', order: ['tamarind', 'sugar', 'fishsauce'], vessel: 'wok' },
      { kind: 'crack', text: 'ตอกไข่ทำแผ่นห่อ แตะตอนไข่ตรงขอบ!', n: 1, vessel: 'pan' },
      { kind: 'wrap', text: 'ลากชายไข่ทั้งสี่ด้านมาห่อเส้นไว้', n: 4 },
      { kind: 'plate', text: 'ย้ายผัดไทยห่อไข่ลงจาน', serve: 'plate' },
    ],
  },
  {
    id: 'mango',
    name: 'ข้าวเหนียวมะม่วง',
    desc: 'ของหวานระดับโลก หอมหวานมันครบในคำเดียว',
    level: 18,
    makes: 'dish_mango',
    qty: 1,
    ingredients: { ing_sticky: 1, ing_mango: 1, ing_coconut: 1, ing_sugar: 1 },
    tip: 'มูนข้าวเหนียวตอนร้อน ๆ กะทิจะซึมเข้าเม็ด',
    steps: [
      { kind: 'pour', text: 'เทกะทิลงหม้อ กดค้างแล้วปล่อยที่ขีดทอง', liquid: 'coconut', vessel: 'pot' },
      { kind: 'stir', text: 'มูนข้าวเหนียวกับกะทิ วนนิ้วเบา ๆ', n: 3, vessel: 'pot', items: ['sticky', 'coconut'] },
      { kind: 'chop', text: 'ฝานมะม่วงเป็นชิ้นสวย ๆ', items: ['mango'], n: 5, vessel: 'board' },
      { kind: 'shape', text: 'ปั้นข้าวเหนียวเป็นก้อน ลากไปวางในช่อง', items: ['sticky'], n: 3 },
      { kind: 'plate', text: 'จัดมะม่วงคู่ข้าวเหนียว ราดหัวกะทิ', serve: 'plate' },
    ],
  },
  {
    id: 'kiaowan',
    name: 'แกงเขียวหวานไก่',
    desc: 'แกงเขียวหวานสูตรคุณยาย เข้มข้นหอมกะทิ',
    level: 20,
    makes: 'dish_kiaowan',
    qty: 2,
    ingredients: { ing_chicken: 1, ing_paste: 1, ing_coconut: 2, ing_basil: 1, ing_chili: 1, ing_fishsauce: 1, ing_sugar: 1, ing_veg: 1 },
    tip: 'ผัดพริกแกงกับหัวกะทิจนแตกมัน สีจะเขียวสวย',
    steps: [
      { kind: 'chop', text: 'หั่นไก่กับมะเขือเปราะเป็นชิ้น', items: ['chicken', 'eggplant'], n: 3, vessel: 'board' },
      { kind: 'stir', text: 'ผัดพริกแกงกับหัวกะทิจนหอม', n: 4, vessel: 'pot', items: ['curry', 'chicken'] },
      { kind: 'pour', text: 'เติมกะทิจนถึงขีดทอง', liquid: 'coconut', vessel: 'pot' },
      { kind: 'season', text: 'ปรุงรสแกง แตะขวดตามลำดับ', order: ['fishsauce', 'sugar', 'chili'], vessel: 'pot' },
      { kind: 'plate', text: 'ตักแกงใส่ชาม โรยใบโหระพาและพริก', serve: 'bowl' },
    ],
  },
]

export const RECIPE_BY_ID: Record<string, CookRecipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]))

/** Thai names of the spice-shelf bottles. */
export const CONDIMENT_NAMES: Record<Condiment, string> = {
  fishsauce: 'น้ำปลา',
  sugar: 'น้ำตาล',
  chili: 'พริกป่น',
  soy: 'ซีอิ๊ว',
  lime: 'มะนาว',
  pepper: 'พริกไทย',
  tamarind: 'น้ำมะขาม',
}

/** Thai name of each mini-game kind (step chips in the recipe book). */
export const STEP_NAMES: Record<StepKind, string> = {
  chop: 'หั่น',
  crack: 'ตอกไข่',
  stir: 'ผัด/คน',
  pour: 'เท',
  fry: 'ทอด',
  season: 'ปรุงรส',
  shape: 'ปั้น',
  wrap: 'ห่อ',
  plate: 'จัดจาน',
}
