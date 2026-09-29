// Home furniture catalogue: crafting materials, furniture, wallpapers and
// floors for the player's room (บ้านของฉัน). Art lives in art/furniture.ts;
// placement rules live in game/house.ts.

export type MaterialId = 'wood' | 'cloth' | 'clay' | 'gold' | 'flower'

export interface Material {
  id: MaterialId
  name: string
  desc: string
}

export const MATERIALS: Material[] = [
  { id: 'wood', name: 'ไม้', desc: 'ไม้สักเนื้อดีกลิ่นหอม ใช้ทำโต๊ะ ตู้ และเตียง' },
  { id: 'cloth', name: 'ผ้า', desc: 'ผ้าฝ้ายทอมือนุ่มนิ่ม ใช้ทำหมอน ผ้าม่าน และพรม' },
  { id: 'clay', name: 'ดินเผา', desc: 'ดินเผาจากเกาะเกร็ด ปั้นเป็นกระถางและโอ่งน้อย' },
  { id: 'gold', name: 'ทองคำเปลว', desc: 'แผ่นทองบางเฉียบ ประดับของให้ดูขลังและงดงาม' },
  { id: 'flower', name: 'ดอกไม้', desc: 'ลีลาวดีและมะลิหอมกรุ่น ใช้ร้อยมาลัยและแต่งห้อง' },
]

export const MATERIAL_BY_ID = Object.fromEntries(MATERIALS.map((m) => [m.id, m])) as Record<MaterialId, Material>

export type Recipe = Partial<Record<MaterialId, number>>

export type FurnitureKind = 'floor' | 'wall' | 'rug'

export type Interact =
  | 'altar'
  | 'wardrobe'
  | 'bed'
  | 'workbench'
  | 'door'
  | 'window'
  | 'tv'
  | 'fan'
  | 'lamp'
  | 'plant'
  | 'music'
  | 'aquarium'
  | 'cat'
  | 'cook'
  | null

export interface Furniture {
  id: string
  name: string
  desc: string
  kind: FurnitureKind
  /** Footprint in tiles: floor/rug use floor tiles, wall items use wall tiles. */
  w: number
  h: number
  recipe: Recipe
  /** Extra Boon Coin cost when crafting. */
  coins?: number
  /** Player level needed to craft. */
  level?: number
  interact?: Interact
  /** Built into the room: can't be moved or stored. */
  fixed?: boolean
  /** Given to every new player (part of the starter layout). */
  starter?: boolean
  /** 'seat' (player sits on it), 'light', 'plant', 'thai', 'cosy', 'tall' … */
  tags?: string[]
}

export const FURNITURE: Furniture[] = [
  // --- Built-ins (fixed) ---------------------------------------------------
  {
    id: 'wardrobe_mirror',
    name: 'ตู้เสื้อผ้าบานกระจก',
    desc: 'ตู้บานเลื่อนกระจกเงาบานใหญ่ ส่องชุดสวย ๆ ก่อนออกไปทำบุญ',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: {},
    interact: 'wardrobe',
    fixed: true,
    tags: ['tall'],
  },
  {
    id: 'window_big',
    name: 'หน้าต่างบานใหญ่',
    desc: 'กระจกสูงจรดเพดาน มองเห็นตึกสูงกลางกรุง กลางคืนไฟระยิบระยับ',
    kind: 'wall',
    w: 4,
    h: 5,
    recipe: {},
    interact: 'window',
    fixed: true,
  },
  {
    id: 'altar_shelf',
    name: 'หิ้งพระ',
    desc: 'หิ้งพระประจำบ้าน ไหว้พระสวดมนต์ก่อนนอน จิตใจสงบเย็น',
    kind: 'wall',
    w: 2,
    h: 2,
    recipe: {},
    interact: 'altar',
    fixed: true,
    tags: ['thai', 'light'],
  },
  {
    id: 'door',
    name: 'ประตูบ้าน',
    desc: 'ใส่รองเท้าแล้วออกไปวัดกันเถอะ!',
    kind: 'wall',
    w: 2,
    h: 3,
    recipe: {},
    interact: 'door',
    fixed: true,
  },

  // --- Starter set -------------------------------------------------------
  {
    id: 'workbench',
    name: 'โต๊ะช่างไม้',
    desc: 'โต๊ะคู่ใจไว้ประดิษฐ์เฟอร์นิเจอร์ ก๊อก ๆ แก๊ก ๆ ทั้งวัน',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 3 },
    interact: 'workbench',
    starter: true,
  },
  {
    id: 'bed_simple',
    name: 'เตียงนอนแสนนุ่ม',
    desc: 'ฟูกนุ่มนิ่ม หมอนฟู ๆ ผ้าห่มลายดอก นอนหลับฝันดีทุกคืน',
    kind: 'floor',
    w: 2,
    h: 3,
    recipe: { wood: 4, cloth: 3 },
    interact: 'bed',
    starter: true,
    tags: ['cosy'],
  },
  {
    id: 'rug_mat',
    name: 'เสื่อกก',
    desc: 'เสื่อกกทอมือจากจันทบุรี นั่งเล่นเย็นสบายแม้หน้าร้อน',
    kind: 'rug',
    w: 3,
    h: 2,
    recipe: { flower: 2, cloth: 1 },
    starter: true,
    tags: ['thai'],
  },
  {
    id: 'plant_monstera',
    name: 'ต้นมอนสเตอร่า',
    desc: 'ใบใหญ่ฉีกสวย ช่วยฟอกอากาศให้ห้องสดชื่น',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 1, flower: 2 },
    interact: 'plant',
    starter: true,
    tags: ['plant'],
  },
  {
    id: 'side_table',
    name: 'โต๊ะข้างเตียง',
    desc: 'วางแก้วน้ำ แว่นตา และหนังสือเล่มโปรดก่อนนอน',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 2 },
    starter: true,
  },

  // --- Craftable ------------------------------------------------------------
  {
    id: 'cushion_khwan',
    name: 'หมอนขวานลายไทย',
    desc: 'หมอนสามเหลี่ยมลายขิด พิงแล้วสบายจนไม่อยากลุก',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { cloth: 2, gold: 1 },
    tags: ['seat', 'thai', 'cosy'],
  },
  {
    id: 'table_low',
    name: 'โต๊ะญี่ปุ่นเตี้ย',
    desc: 'โต๊ะพับขาเตี้ย นั่งกินข้าว ทำการบ้าน จิบชาเย็นได้หมด',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 3 },
  },
  {
    id: 'lamp_paper',
    name: 'โคมไฟกระดาษ',
    desc: 'โคมกระดาษสาแสงนวล เปิดตอนค่ำแล้วอบอุ่นหัวใจ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { cloth: 1, wood: 1 },
    interact: 'lamp',
    tags: ['light'],
  },
  {
    id: 'fan_stand',
    name: 'พัดลมตั้งพื้น',
    desc: 'คู่หูหน้าร้อนของคนไทย แตะเพื่อเปิดให้ปั่นลมเย็น ๆ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 1, clay: 1 },
    coins: 40,
    interact: 'fan',
  },
  {
    id: 'chair_rattan',
    name: 'เก้าอี้หวาย',
    desc: 'เก้าอี้หวายสานมือ นั่งจิบชาเย็นชิล ๆ ริมหน้าต่าง',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 3 },
    tags: ['seat'],
  },
  {
    id: 'rug_cloth',
    name: 'พรมผ้าทอลายช้าง',
    desc: 'พรมผ้าทอมือลายช้างน้อยเดินเรียงกัน นุ่มเท้าสุด ๆ',
    kind: 'rug',
    w: 2,
    h: 2,
    recipe: { cloth: 3 },
    level: 2,
    tags: ['thai', 'cosy'],
  },
  {
    id: 'plant_bonsai',
    name: 'บอนไซ',
    desc: 'ต้นไม้จิ๋วดัดทรงอย่างใจเย็น ฝึกสมาธิไปในตัว',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 2, wood: 1 },
    level: 2,
    interact: 'plant',
    tags: ['plant'],
  },
  {
    id: 'lotus_pot',
    name: 'กระถางบัว',
    desc: 'บัวหลวงในโอ่งดินเผา ดอกบานรับแสงเช้า',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 3, flower: 2 },
    level: 2,
    interact: 'plant',
    tags: ['plant', 'thai'],
  },
  {
    id: 'clock_wall',
    name: 'นาฬิกาแขวน',
    desc: 'ติ๊กต่อก ๆ เดินตรงเวลาจริง ปลุกไปใส่บาตรตอนเช้า',
    kind: 'wall',
    w: 1,
    h: 1,
    recipe: { wood: 1, gold: 1 },
  },
  {
    id: 'garland_hang',
    name: 'พวงมาลัยแขวน',
    desc: 'มาลัยมะลิร้อยมือ ประดับกุหลาบแดง หอมชื่นใจทั้งห้อง',
    kind: 'wall',
    w: 1,
    h: 2,
    recipe: { flower: 3 },
    tags: ['thai'],
  },
  {
    id: 'frames_trio',
    name: 'กรอบรูปความทรงจำ',
    desc: 'รูปครอบครัว รูปน้องหมาวัด และรูปวันรับปริญญา',
    kind: 'wall',
    w: 2,
    h: 1,
    recipe: { wood: 2 },
    tags: ['cosy'],
  },
  {
    id: 'painting_wat',
    name: 'ภาพวาดวัด',
    desc: 'ภาพสีน้ำวัดริมเจ้าพระยายามเย็น ใส่กรอบทองอร่าม',
    kind: 'wall',
    w: 2,
    h: 2,
    recipe: { cloth: 1, wood: 1, gold: 1 },
    level: 2,
    tags: ['thai'],
  },
  {
    id: 'bookshelf',
    name: 'ชั้นหนังสือ',
    desc: 'หนังสือธรรมะ นิยาย และการ์ตูนเล่มโปรดเรียงเต็มชั้น',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 4 },
    level: 2,
    tags: ['tall'],
  },
  {
    id: 'cat_sleepy',
    name: 'แมวเหมียวนอนหลับ',
    desc: 'น้องแมวส้มขดตัวบนเบาะนุ่ม หลับปุ๋ยทั้งวัน ลูบแล้วครางครืด ๆ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { cloth: 3, flower: 1 },
    coins: 30,
    level: 3,
    interact: 'cat',
    tags: ['cosy'],
  },
  {
    id: 'speaker',
    name: 'ลำโพงเพลง',
    desc: 'ลำโพงไม้เสียงอุ่น เปิดเพลงลูกทุ่งเพราะ ๆ แตะเพื่อเปิดเพลง',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 2 },
    coins: 60,
    level: 3,
    interact: 'music',
  },
  {
    id: 'bunting',
    name: 'ธงทิว',
    desc: 'ธงสามเหลี่ยมหลากสีเหมือนงานวัด ห้องดูครึกครื้นทันที',
    kind: 'wall',
    w: 3,
    h: 1,
    recipe: { cloth: 2 },
    level: 3,
  },
  {
    id: 'altar_table',
    name: 'โต๊ะหมู่บูชา',
    desc: 'โต๊ะหมู่แกะสลักลายไทย จัดแจกันดอกไม้ ธูปเทียนบูชาพระ',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 4, gold: 2, flower: 2 },
    level: 3,
    interact: 'altar',
    tags: ['thai', 'light'],
  },
  {
    id: 'umbrella_bosang',
    name: 'ร่มบ่อสร้าง',
    desc: 'ร่มกระดาษสาวาดลายดอกไม้จากบ้านบ่อสร้าง เชียงใหม่',
    kind: 'wall',
    w: 2,
    h: 2,
    recipe: { cloth: 2, wood: 1 },
    level: 4,
    tags: ['thai'],
  },
  {
    id: 'aquarium',
    name: 'ตู้ปลา',
    desc: 'ปลาหางนกยูงกับปลาทองแหวกว่ายไปมา ดูแล้วเพลินใจ',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 2, clay: 1 },
    coins: 80,
    level: 4,
    interact: 'aquarium',
  },
  {
    id: 'poster_city',
    name: 'โปสเตอร์เมืองกรุง',
    desc: 'โปสเตอร์รถไฟฟ้าวิ่งผ่านตึกสูง คิดถึงกรุงเทพฯ ทุกครั้งที่มอง',
    kind: 'wall',
    w: 1,
    h: 2,
    recipe: { cloth: 1 },
    coins: 30,
    level: 4,
  },
  {
    id: 'lantern_oil',
    name: 'ตะเกียง',
    desc: 'ตะเกียงเจ้าพายุแบบบ้านคุณยาย แสงส้มอุ่น ๆ ยามค่ำ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 1, gold: 1 },
    level: 4,
    interact: 'lamp',
    tags: ['light', 'thai'],
  },
  {
    id: 'lamp_lanna',
    name: 'โคมล้านนา',
    desc: 'โคมยี่เป็งแบบล้านนา แขวนแล้วเหมือนได้ไปเที่ยวเชียงใหม่',
    kind: 'wall',
    w: 1,
    h: 2,
    recipe: { cloth: 2, gold: 1 },
    level: 5,
    interact: 'lamp',
    tags: ['light', 'thai'],
  },
  {
    id: 'teak_daybed',
    name: 'ตั่งไม้สัก',
    desc: 'ตั่งไม้สักโบราณ ปูเบาะลายไทย นั่งเล่นนอนเล่นยามบ่าย',
    kind: 'floor',
    w: 3,
    h: 2,
    recipe: { wood: 6, cloth: 2 },
    level: 5,
    tags: ['seat', 'thai', 'cosy'],
  },
  {
    id: 'elephant_carving',
    name: 'ช้างไม้แกะสลัก',
    desc: 'ช้างไม้สักแกะมือชูงวงสูง เชื่อว่าเรียกโชคลาภเข้าบ้าน',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 3, gold: 1 },
    level: 5,
    tags: ['thai'],
  },
  {
    id: 'tv_flat',
    name: 'ทีวีจอแบน',
    desc: 'ดูละครหลังข่าวกับน้องแมว แตะเพื่อเปิดทีวี',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 2 },
    coins: 150,
    level: 6,
    interact: 'tv',
  },
  {
    id: 'bed_teak',
    name: 'เตียงไม้สักสี่เสา',
    desc: 'เตียงไม้สักแกะลายกนก มีมุ้งโปร่งบางพลิ้ว ๆ นอนแล้วฝันถึงสวรรค์',
    kind: 'floor',
    w: 2,
    h: 3,
    recipe: { wood: 8, cloth: 4, gold: 2 },
    level: 7,
    interact: 'bed',
    tags: ['cosy', 'thai'],
  },
]

// --- Kitchen (cooking unlocks at level 10) --------------------------------
FURNITURE.push(
  {
    id: 'kitchen_stove',
    name: 'เคาน์เตอร์ครัวเตาแก๊ส',
    desc: 'เตาแก๊สสองหัวบนเคาน์เตอร์ไม้ แตะเพื่อทำอาหารใส่บาตร บุญแรงกว่าซื้อ!',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 3, clay: 3, gold: 1 },
    coins: 60,
    level: 10,
    interact: 'cook',
    tags: ['cosy'],
  },
  {
    id: 'kitchen_fridge',
    name: 'ตู้เย็นสีพาสเทล',
    desc: 'ตู้เย็นสองประตูสีมิ้นต์ ติดแม่เหล็กรูปวัดน่ารัก ๆ เก็บวัตถุดิบสดใหม่',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 2, clay: 2 },
    coins: 120,
    level: 10,
    tags: ['tall'],
  },
  {
    id: 'rice_cooker',
    name: 'หม้อหุงข้าวลายดอก',
    desc: 'หม้อหุงข้าวลายดอกไม้แบบบ้านคุณยาย หุงข้าวหอมมะลิไว้ตักบาตรทุกเช้า',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 2, flower: 1 },
    coins: 40,
    level: 10,
    tags: ['thai'],
  },
)

export const FURNITURE_BY_ID: Record<string, Furniture> = Object.fromEntries(FURNITURE.map((f) => [f.id, f]))

/** Everything the player can craft at the workbench (built-ins excluded). */
export const CRAFTABLE: Furniture[] = FURNITURE.filter((f) => !f.fixed)

export interface Surfacing {
  id: string
  name: string
  desc: string
  recipe: Recipe
  coins?: number
  level?: number
  /** Owned from the start. */
  starter?: boolean
}

export const WALLPAPERS: Surfacing[] = [
  { id: 'wp_cream', name: 'ผนังสีครีม', desc: 'สีครีมอุ่น ๆ สว่างสบายตา', recipe: {}, starter: true },
  { id: 'wp_kanok', name: 'วอลเปเปอร์ลายกนก', desc: 'ลายกนกทองบนพื้นแดงหม่น สไตล์เรือนไทย', recipe: { cloth: 2, gold: 2 }, level: 3 },
  { id: 'wp_teak', name: 'ผนังไม้สักบุ', desc: 'ไม้สักบุผนังแบบเรือนไทยโบราณ หอมกลิ่นไม้', recipe: { wood: 5 }, level: 2 },
  { id: 'wp_mint', name: 'ผนังสีมิ้นต์', desc: 'สีเขียวมิ้นต์สดชื่น เหมือนอยู่ในสวน', recipe: { cloth: 1, flower: 1 }, coins: 20 },
  { id: 'wp_sakura', name: 'ผนังชมพูซากุระ', desc: 'ชมพูพาสเทลโรยกลีบดอกไม้ น่ารักละมุน', recipe: { cloth: 1, flower: 3 }, coins: 30, level: 2 },
]

export const FLOORS: Surfacing[] = [
  { id: 'fl_oak', name: 'พื้นไม้โอ๊ค', desc: 'พื้นไม้ลายสวยแบบคอนโดกลางเมือง', recipe: {}, starter: true },
  { id: 'fl_parquet', name: 'ปาร์เก้ไม้สัก', desc: 'ไม้สักปูลายก้างปลา ขัดเงาวาววับ', recipe: { wood: 5 }, level: 2 },
  { id: 'fl_terrazzo', name: 'พื้นหินขัด', desc: 'หินขัดแบบบ้านคุณยาย เย็นเท้าสบาย', recipe: { clay: 4 }, coins: 20, level: 3 },
  { id: 'fl_mat', name: 'พื้นเสื่อสาน', desc: 'เสื่อไม้ไผ่สานเต็มห้อง บรรยากาศบ้านสวน', recipe: { flower: 2, wood: 2 }, level: 2 },
]

export const WALLPAPER_BY_ID: Record<string, Surfacing> = Object.fromEntries(WALLPAPERS.map((w) => [w.id, w]))
export const FLOOR_BY_ID: Record<string, Surfacing> = Object.fromEntries(FLOORS.map((f) => [f.id, f]))
