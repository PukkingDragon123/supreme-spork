// Furniture and surfaces for the extra rooms (ห้องพระ, ห้องครัว and the seven
// regional rooms). Merged into the main catalogue by data/furniture.ts, so
// furniture.ts is only imported for types here (no runtime cycle).
// Art: art/roomArt.ts.

import type { Furniture, Surfacing } from './furniture'
import { PLACE_BY_ID } from './places'
import { crownOf, RANKS } from './ranks'
import { ROOMS } from './rooms'

export const ROOM_FURNITURE: Furniture[] = [
  // --- Built-ins of the new rooms -----------------------------------------------
  {
    id: 'altar_grand',
    name: 'โต๊ะหมู่บูชาห้องพระ',
    desc: 'โต๊ะหมู่เก้าแกะลายกนกปิดทอง ประดิษฐานพระพุทธรูป แจกัน ธูปเทียนครบชุด',
    kind: 'floor',
    w: 4,
    h: 1,
    recipe: {},
    interact: 'altar',
    fixed: true,
    tags: ['thai', 'light', 'tall'],
  },
  {
    id: 'kitchen_counter',
    name: 'เคาน์เตอร์ครัวไทย',
    desc: 'ซิงก์ล้างจาน เตาแก๊ส ครกหินกับสาก ตะกร้าพริกกระเทียม แตะเพื่อทำอาหาร',
    kind: 'floor',
    w: 4,
    h: 1,
    recipe: {},
    interact: 'cook',
    fixed: true,
    tags: ['cosy'],
  },
  {
    id: 'window_wide',
    name: 'กระจกวิวรถไฟฟ้า',
    desc: 'กระจกเต็มผนัง รถไฟฟ้าวิ่งผ่านหน้าห้องทุกสองนาที โบกมือให้คนบนรถได้เลย',
    kind: 'wall',
    w: 6,
    h: 5,
    recipe: {},
    interact: 'window',
    fixed: true,
  },

  // --- ภาคกลาง: เรือนไทยริมน้ำ --------------------------------------------------
  {
    id: 'c_samkhok_jar',
    name: 'ตุ่มสามโคก',
    desc: 'ตุ่มดินเผาเนื้อแกร่งจากปทุมฯ ใส่น้ำฝนเย็นชื่นใจ มีกะลาลอยไว้ตัก',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 4 },
    coins: 40,
    level: 6,
    tags: ['thai'],
  },
  {
    id: 'c_pinto',
    name: 'ปิ่นโตเถาลายคราม',
    desc: 'ปิ่นโตห้าชั้นลายดอกไม้ ใส่แกงไปถวายพระที่วัดริมน้ำ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 2, gold: 1 },
    coins: 40,
    level: 6,
    tags: ['thai', 'cosy'],
  },
  {
    id: 'c_birdcage',
    name: 'กรงนกเขาชวา',
    desc: 'กรงไม้ไผ่ทรงโดม นกเขาขันเสียงใส "จุ๊กกรู้ ๆ" แตะเพื่อฟังเสียงขัน',
    kind: 'wall',
    w: 1,
    h: 2,
    recipe: { wood: 3, gold: 1 },
    coins: 60,
    level: 8,
    interact: 'music',
    tags: ['thai'],
  },

  // --- ภาคเหนือ: เรือนกาแลล้านนา ------------------------------------------------
  {
    id: 'n_khantok',
    name: 'ขันโตกล้านนา',
    desc: 'โตกไม้สักทรงกลม ข้าวเหนียว น้ำพริกหนุ่ม แคบหมู นั่งล้อมวงกินแบบคนเมือง',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 4, gold: 1 },
    coins: 60,
    level: 8,
    tags: ['seat', 'thai', 'cosy'],
  },
  {
    id: 'n_tung',
    name: 'ตุงล้านนา',
    desc: 'ตุงผ้าทอหลากสีห้อยพู่ แขวนไว้เป็นสิริมงคลแบบงานปอยหลวง',
    kind: 'wall',
    w: 1,
    h: 2,
    recipe: { cloth: 3, gold: 1 },
    level: 6,
    tags: ['thai'],
  },
  {
    id: 'n_kalae',
    name: 'กาแลแกะสลัก',
    desc: 'ไม้แกะรูปกากบาทไขว้เหนือจั่วเรือนล้านนา เชื่อว่าคุ้มครองคนในบ้าน',
    kind: 'wall',
    w: 2,
    h: 1,
    recipe: { wood: 5, gold: 1 },
    coins: 80,
    level: 10,
    tags: ['thai'],
  },

  // --- ภาคอีสาน: ใต้ถุนเรือนอีสาน -----------------------------------------------
  {
    id: 'i_khaen',
    name: 'แคนแปด',
    desc: 'แคนไม้ซางสิบหกลูก เป่าลายลำเพลิน ม่วนซื่นโฮแซว แตะเพื่อเป่าแคน',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 3, gold: 1 },
    coins: 80,
    level: 10,
    interact: 'music',
    tags: ['thai'],
  },
  {
    id: 'i_plara',
    name: 'ไหปลาร้า',
    desc: 'ไหดินเผาปิดปากด้วยผ้า หมักปลาร้านัว ๆ ไว้ตำส้มตำ กลิ่นมาก่อนตัว',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 3, cloth: 1 },
    level: 6,
    tags: ['thai'],
  },
  {
    id: 'i_khrae',
    name: 'แคร่ไม้ไผ่กับกระติ๊บ',
    desc: 'แคร่ใต้ถุนบ้านไว้นั่งเล่นหลบแดด มีกระติ๊บข้าวเหนียวกับส้มตำรออยู่',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 4 },
    coins: 30,
    level: 6,
    tags: ['seat', 'thai', 'cosy'],
  },

  // --- ภาคใต้: บ้านชิโนโปรตุกีส ------------------------------------------------
  {
    id: 's_lantern',
    name: 'โคมเต็งลั้งแดง',
    desc: 'โคมจีนสีแดงพู่ทอง แขวนหน้าบ้านย่านเมืองเก่า เปิดไฟแล้วสว่างนวล',
    kind: 'wall',
    w: 1,
    h: 2,
    recipe: { cloth: 2, gold: 1 },
    level: 6,
    interact: 'lamp',
    tags: ['light'],
  },
  {
    id: 's_mukchair',
    name: 'เก้าอี้ไม้ฝังมุก',
    desc: 'เก้าอี้ไม้ดำฝังเปลือกหอยมุกแวววาว แบบบ้านเถ้าแก่เหมืองแร่',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 3, gold: 1 },
    coins: 60,
    level: 8,
    tags: ['seat', 'cosy'],
  },
  {
    id: 's_cabinet',
    name: 'ตู้โชว์ลายครามบ้าบ๋า',
    desc: 'ตู้ไม้สีเขียวหยก โชว์ถ้วยชามลายครามและปิ่นโตเพอรานากัน',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 5, clay: 2 },
    coins: 100,
    level: 10,
    tags: ['tall'],
  },

  // --- กรุงเทพฯ: คอนโดวิวรถไฟฟ้า -----------------------------------------------
  {
    id: 'b_sofa',
    name: 'โซฟาตัวยาวสีมัสตาร์ด',
    desc: 'โซฟานุ่มยุบ นั่งดูรถไฟฟ้าวิ่งผ่านพร้อมชานมไข่มุก ชีวิตคนเมืองของแท้',
    kind: 'floor',
    w: 3,
    h: 1,
    recipe: { cloth: 4, wood: 2 },
    coins: 120,
    level: 8,
    tags: ['seat', 'cosy'],
  },
  {
    id: 'b_wfh',
    name: 'โต๊ะ WFH กับชานมไข่มุก',
    desc: 'โต๊ะทำงานมีโน้ตบุ๊ก ต้นกระบองเพชร และชานมหวานร้อยเปอร์เซ็นต์ แตะเพื่อเปิดจอ',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 3 },
    coins: 100,
    level: 8,
    interact: 'lamp',
    tags: ['light'],
  },
  {
    id: 'b_robot',
    name: 'หุ่นยนต์ดูดฝุ่นน้องปิ๊บ',
    desc: 'วิ่งชนขาโต๊ะทั้งวัน แต่ห้องสะอาดนะ แตะเพื่อชมเชยน้อง',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { clay: 1, gold: 1 },
    coins: 150,
    level: 6,
  },

  // --- ภาคตะวันออก: บ้านสวนทุเรียน ---------------------------------------------
  {
    id: 'e_durian',
    name: 'เข่งทุเรียนหมอนทอง',
    desc: 'ทุเรียนจันท์ลูกโต หนามแหลม เนื้อเหลืองหวานมัน ห้ามพาขึ้นรถไฟฟ้า',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 1, flower: 2 },
    coins: 60,
    level: 6,
  },
  {
    id: 'e_fruitstall',
    name: 'แผงผลไม้ชาวสวน',
    desc: 'มังคุด เงาะ ลองกอง สละ วางเต็มแผง ของดีเมืองจันท์',
    kind: 'floor',
    w: 2,
    h: 1,
    recipe: { wood: 3, flower: 3 },
    coins: 80,
    level: 8,
    tags: ['plant'],
  },
  {
    id: 'e_ngop',
    name: 'งอบชาวสวน',
    desc: 'งอบใบลานสานมือ ใส่ตัดทุเรียนกลางแดดแล้วเย็นหัวสุด ๆ',
    kind: 'wall',
    w: 1,
    h: 1,
    recipe: { flower: 2, cloth: 1 },
    level: 6,
    tags: ['thai'],
  },

  // --- ภาคตะวันตก: เรือนแพกาญจนบุรี ---------------------------------------------
  {
    id: 'w_hammock',
    name: 'เปลญวนริมแพ',
    desc: 'เปลญวนผูกเสาแพ นอนไกวฟังเสียงน้ำแควไหล หลับไม่รู้ตัว',
    kind: 'floor',
    w: 3,
    h: 1,
    recipe: { cloth: 3, wood: 2 },
    coins: 60,
    level: 8,
    tags: ['seat', 'cosy'],
  },
  {
    id: 'w_lifering',
    name: 'ห่วงชูชีพ',
    desc: 'ห่วงยางสีส้มขาวประจำเรือนแพ ปลอดภัยไว้ก่อนเวลาลงเล่นน้ำ',
    kind: 'wall',
    w: 1,
    h: 1,
    recipe: { cloth: 2 },
    level: 6,
  },
  {
    id: 'w_fishtrap',
    name: 'ไซดักปลากับข้อง',
    desc: 'ไซไม้ไผ่สานกับข้องใส่ปลา ภูมิปัญญาคนริมน้ำแคว',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { wood: 2, flower: 1 },
    level: 6,
    tags: ['thai'],
  },

  // --- Temple models (SS rank rewards) ---------------------------------------
  {
    id: 'model_phra_kaew',
    name: 'โมเดลพระศรีรัตนเจดีย์',
    desc: 'เจดีย์ทองทรงระฆังจากวัดพระแก้วย่อส่วน รางวัลแรงก์ SS กรุงเทพฯ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { gold: 6, clay: 2 },
    level: 20,
    tags: ['thai', 'light'],
  },
  {
    id: 'model_pathom',
    name: 'โมเดลองค์พระปฐมเจดีย์',
    desc: 'เจดีย์กระเบื้องสีส้มทององค์ใหญ่สุดในไทย ย่อส่วน รางวัลแรงก์ SS ภาคกลาง',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { gold: 4, clay: 4 },
    level: 20,
    tags: ['thai', 'light'],
  },
  {
    id: 'model_doi_suthep',
    name: 'โมเดลพระธาตุดอยสุเทพ',
    desc: 'พระธาตุทองกับฉัตรสี่มุม รางวัลแรงก์ SS ภาคเหนือ',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { gold: 6, wood: 2 },
    level: 20,
    tags: ['thai', 'light'],
  },
  {
    id: 'model_that_phanom',
    name: 'โมเดลพระธาตุพนม',
    desc: 'องค์พระธาตุทรงบัวเหลี่ยมสีขาวยอดทอง รางวัลแรงก์ SS ภาคอีสาน',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { gold: 5, clay: 3 },
    level: 20,
    tags: ['thai', 'light'],
  },
  {
    id: 'model_nst',
    name: 'โมเดลพระบรมธาตุนครฯ',
    desc: 'เจดีย์ทรงลังกาสีขาว ยอดหุ้มทองคำ รางวัลแรงก์ SS ภาคใต้',
    kind: 'floor',
    w: 1,
    h: 1,
    recipe: { gold: 6, clay: 2 },
    level: 20,
    tags: ['thai', 'light'],
  },
]

export const ROOM_WALLPAPERS: Surfacing[] = [
  { id: 'wp_rotnam', name: 'ผนังลายรดน้ำ', desc: 'ลายทองบนพื้นรักดำ แบบตู้พระธรรมโบราณ ขลังสงบ', recipe: { gold: 3, cloth: 1 }, level: 6 },
  { id: 'wp_tile', name: 'ผนังกระเบื้องครัว', desc: 'กระเบื้องขาวคาดเขียวมิ้นต์ เช็ดคราบน้ำมันง่าย', recipe: { clay: 3 }, level: 6 },
  { id: 'wp_riverhouse', name: 'ฝาปะกนเรือนริมน้ำ', desc: 'ฝาไม้สักสีแดงเข้มกับช่องลมลายไทย ลมเย็นจากแม่น้ำพัดผ่าน', recipe: { wood: 5, gold: 1 }, level: 8 },
  { id: 'wp_lanna', name: 'ฝาไม้ล้านนา', desc: 'ไม้สักสีเข้มคาดลายดาวเพดานสีทองแดง แบบวิหารล้านนา', recipe: { wood: 5, gold: 1 }, level: 8 },
  { id: 'wp_khattae', name: 'ฝาขัดแตะไม้ไผ่', desc: 'ไม้ไผ่สานลายขัด ลมโกรกเย็นสบายแบบใต้ถุนบ้านอีสาน', recipe: { wood: 3, flower: 2 }, level: 8 },
  { id: 'wp_sino', name: 'ผนังปูนชิโนโปรตุกีส', desc: 'ปูนสีเหลืองพาสเทลกับกระเบื้องเพอรานากันแถวล่าง', recipe: { clay: 3, cloth: 2 }, level: 8 },
  { id: 'wp_loft', name: 'ผนังปูนเปลือยลอฟต์', desc: 'ปูนขัดมันสีเทา ไฟ LED ซ่อนฝ้า คอนโดคนเมืองรุ่นใหม่', recipe: { clay: 4 }, coins: 60, level: 8 },
  { id: 'wp_orchard', name: 'ฝาไม้ทาสีเขียวบ้านสวน', desc: 'ไม้ตีเกล็ดทาสีเขียวซีด แขวนตะกร้าหวาย กลิ่นสวนทุเรียนลอยมา', recipe: { wood: 4, flower: 1 }, level: 8 },
  { id: 'wp_raft', name: 'ฝาจากเรือนแพ', desc: 'ฝาใบจากกับโครงไม้ไผ่ มีเชือกผูก แสงลอดเป็นริ้ว ๆ', recipe: { flower: 3, wood: 2 }, level: 8 },
]

export const ROOM_FLOORS: Surfacing[] = [
  { id: 'fl_checker', name: 'พื้นกระเบื้องตาหมากรุก', desc: 'ขาวสลับเขียวมิ้นต์ ร้านกาแฟโบราณก็ใช้แบบนี้', recipe: { clay: 3 }, level: 6 },
  { id: 'fl_chan', name: 'พื้นชานไม้สัก', desc: 'แผ่นไม้สักแผ่นกว้างเว้นร่อง เห็นแสงน้ำระยิบข้างล่าง', recipe: { wood: 5 }, level: 8 },
  { id: 'fl_lanna', name: 'พื้นไม้สักขัดเงา', desc: 'ไม้สักเก่าสีเข้มขัดมันวาว ปูเสื่อลายน้ำไหลตรงกลาง', recipe: { wood: 5, cloth: 1 }, level: 8 },
  { id: 'fl_earth', name: 'ลานดินใต้ถุน', desc: 'ดินอัดแน่นเย็นเท้า มีฟางข้าวกระจายนิด ๆ', recipe: { clay: 2, flower: 1 }, level: 8 },
  { id: 'fl_peranakan', name: 'กระเบื้องเพอรานากัน', desc: 'กระเบื้องลายดอกไม้หลากสีจากเมืองเก่าภูเก็ต', recipe: { clay: 4, gold: 1 }, level: 8 },
  { id: 'fl_marble', name: 'พื้นหินอ่อนขาว', desc: 'หินอ่อนลายเทาเงาวับ เย็นเท้าแบบคอนโดหรู', recipe: { clay: 4 }, coins: 80, level: 8 },
  { id: 'fl_redtile', name: 'พื้นดินเผาแดง', desc: 'กระเบื้องดินเผาสีส้มอิฐ แบบบ้านสวนเมืองจันท์', recipe: { clay: 4 }, level: 8 },
  { id: 'fl_bamboo', name: 'พื้นไม้ไผ่ลำเรือนแพ', desc: 'ไม้ไผ่ลำเรียงชิด เดินแล้วยวบ ๆ เห็นน้ำไหลผ่านร่อง', recipe: { wood: 4 }, level: 8 },
]

// ---------------------------------------------------------------------------
// Crafting locks (merged into CRAFT_REQS in game/crafting.ts): a regional
// piece can be crafted once you've visited the temple whose rank reward gives
// it (or the region's top temple); regional surfaces need that region's top
// temple too.

export interface PlaceLock {
  kind: 'place'
  id: string
  name: string
}

const lockAt = (placeId: string): PlaceLock => ({ kind: 'place', id: placeId, name: PLACE_BY_ID[placeId]?.name ?? placeId })

const OWN_IDS = new Set([...ROOM_FURNITURE, ...ROOM_WALLPAPERS, ...ROOM_FLOORS].map((x) => x.id))

export const ROOM_CRAFT_REQS: Record<string, PlaceLock[]> = (() => {
  const out: Record<string, PlaceLock[]> = {}
  for (const r of RANKS) for (const f of r.furniture ?? []) if (!out[f]) out[f] = [lockAt(r.place)]
  for (const room of ROOMS) {
    if (!room.region) continue
    const crown = crownOf(room.region)
    if (!crown) continue
    for (const id of [room.wallpaper, room.floor, ...room.starter.map((s) => s.id)]) {
      if (!out[id] && OWN_IDS.has(id)) out[id] = [lockAt(crown.place)]
    }
  }
  return out
})()
