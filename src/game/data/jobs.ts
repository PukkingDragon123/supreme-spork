// Temple volunteer side jobs (งานอาสาในวัด): short tactile mini-games that
// temple maps expose as `job:<id>` hotspots. Rewards are granted by
// finishJob() in src/game/jobs.ts.

import type { MaterialId } from '../materials'

export type JobId =
  | 'sweep_leaves'
  | 'mop_floor'
  | 'feed_fish'
  | 'feed_catfish'
  | 'arrange_shoes'
  | 'light_candles'
  | 'water_plants'
  | 'polish_brass'
  | 'wipe_statues'

export interface JobDef {
  id: JobId
  /** Thai job name (window / card title). */
  name: string
  /** One-line description for job lists. */
  desc: string
  /** Icon name from src/art/icons.ts. */
  icon: string
  /** Flavour: where in the temple it happens. */
  place: string
  /** Base merit for a 3-star play (before multipliers). */
  merit: number
  /** Base Boon Coins for a 3-star play. */
  coins: number
  /** Crafting material dropped on good plays. */
  mat?: MaterialId
  /** Plays per day that pay full rewards; later plays pay 25%. */
  daily: number
  /** Round length in seconds. */
  time: number
}

/** How-to card for a job (same shape as the activity goal cards). */
export interface JobGoal {
  title: string
  icon: string
  goal: string
  steps: [string, string, string]
  reward: string
}

export const JOBS: JobDef[] = [
  {
    id: 'sweep_leaves',
    name: 'กวาดลานวัด',
    desc: 'กวาดใบโพธิ์ที่ร่วงให้เป็นกอง แล้วตักใส่เข่ง',
    icon: 'broom',
    place: 'ลานหน้าโบสถ์ ใต้ต้นโพธิ์ใหญ่',
    merit: 12,
    coins: 8,
    mat: 'wood',
    daily: 3,
    time: 45,
  },
  {
    id: 'mop_floor',
    name: 'ถูพื้นศาลา',
    desc: 'ถูรอยเท้าเลอะโคลนบนพื้นศาลาจนเงาวับ',
    icon: 'water',
    place: 'ศาลาการเปรียญ',
    merit: 12,
    coins: 8,
    mat: 'cloth',
    daily: 3,
    time: 45,
  },
  {
    id: 'feed_fish',
    name: 'ให้อาหารปลา',
    desc: 'โปรยอาหารให้ปลาคาร์ฟกับปลานิลอิ่มทุกตัว แต่อย่าให้เหลือจนน้ำขุ่น',
    icon: 'koi',
    place: 'สระบัวข้างอุโบสถ',
    merit: 10,
    coins: 6,
    mat: 'flower',
    daily: 3,
    time: 40,
  },
  {
    id: 'feed_catfish',
    name: 'ป้อนปลาดุก',
    desc: 'โยนอาหารลงปากปลาดุกที่อ้าปากรอกันเต็มท่าน้ำ',
    icon: 'bread',
    place: 'ท่าน้ำหลังวัด',
    merit: 10,
    coins: 6,
    mat: 'clay',
    daily: 3,
    time: 30,
  },
  {
    id: 'arrange_shoes',
    name: 'จัดรองเท้า',
    desc: 'จับรองเท้าให้เข้าคู่ แล้ววางขึ้นชั้นให้เรียบร้อย',
    icon: 'door',
    place: 'บันไดหน้าอุโบสถ',
    merit: 12,
    coins: 8,
    mat: 'wood',
    daily: 3,
    time: 45,
  },
  {
    id: 'light_candles',
    name: 'จุดเทียนบูชา',
    desc: 'จุดเทียนให้ครบทุกเล่ม แล้วแตะปัดลมไม่ให้เทียนดับ',
    icon: 'incense',
    place: 'โต๊ะหมู่บูชาในวิหาร',
    merit: 14,
    coins: 8,
    mat: 'gold',
    daily: 3,
    time: 40,
  },
  {
    id: 'water_plants',
    name: 'รดน้ำต้นไม้',
    desc: 'รดน้ำกระถางดอกไม้ให้พอดีขีด ไม่ขาด ไม่ล้น',
    icon: 'rose',
    place: 'สวนดอกไม้หน้ากุฏิ',
    merit: 10,
    coins: 6,
    mat: 'flower',
    daily: 3,
    time: 40,
  },
  {
    id: 'polish_brass',
    name: 'ขัดทองเหลือง',
    desc: 'ถูขัน ระฆัง และพานทองเหลืองแรง ๆ จนเงาวิ้ง',
    icon: 'bell',
    place: 'โต๊ะเครื่องบูชาในวิหาร',
    merit: 12,
    coins: 8,
    mat: 'gold',
    daily: 3,
    time: 40,
  },
  {
    id: 'wipe_statues',
    name: 'เช็ดองค์พระ',
    desc: 'ค่อย ๆ วนผ้าเช็ดฝุ่นบนพระพุทธรูปองค์เล็ก ใจเย็น ๆ อย่ารีบ',
    icon: 'wai',
    place: 'หิ้งพระในวิหาร',
    merit: 16,
    coins: 8,
    mat: 'cloth',
    daily: 3,
    time: 45,
  },
]

export const JOB_BY_ID: Record<string, JobDef> = Object.fromEntries(JOBS.map((j) => [j.id, j]))

const REWARD = (mat: string) => `บุญ + บุญคอยน์ + ${mat} · ได้เต็มวันละ 3 รอบ`

export const JOB_GOALS: Record<JobId, JobGoal> = {
  sweep_leaves: {
    title: 'กวาดลานวัด',
    icon: 'broom',
    goal: 'กวาดใบไม้ลงเข่งให้ครบ 30 ใบ',
    steps: ['ลากนิ้วปัดไม้กวาด ต้อนใบไม้เข้าวงกลางลาน', 'กดที่กองใบไม้ แล้วลากไปเทใส่เข่ง', 'ลมมาเมื่อไหร่ กองใบไม้จะปลิว รีบเก็บนะ'],
    reward: REWARD('ไม้'),
  },
  mop_floor: {
    title: 'ถูพื้นศาลา',
    icon: 'water',
    goal: 'ถูรอยเท้าเลอะโคลนให้หมดจนพื้นเงาวับ',
    steps: ['ลากไม้ถูพื้นไปบนรอยเท้า', 'ม็อบแห้งแล้วลากไปจุ่มในถังน้ำ', 'ระวังน้องหมาวัดเดินเหยียบซ้ำ'],
    reward: REWARD('ผ้า'),
  },
  feed_fish: {
    title: 'ให้อาหารปลาในสระบัว',
    icon: 'koi',
    goal: 'ให้ปลาทุกตัวอิ่ม โดยไม่ให้อาหารเหลือจม',
    steps: ['แตะผิวน้ำใกล้ปลาเพื่อโปรยอาหาร', 'ปลาที่อิ่มแล้วจะมีหัวใจ ไม่ต้องให้เพิ่ม', 'อาหารที่เหลือจมทำให้น้ำขุ่นและเสียดาว'],
    reward: REWARD('ดอกไม้'),
  },
  feed_catfish: {
    title: 'ให้อาหารปลาดุก',
    icon: 'bread',
    goal: 'โยนอาหารลงปากปลาดุกให้ได้ 20 คำ',
    steps: ['รอปลาดุกโผล่หัวอ้าปาก', 'แตะที่ปากปลาเพื่อโยนอาหาร', 'ปลาดุกตัวอ้วนสีทองได้ 3 คำเลย'],
    reward: REWARD('ดินเผา'),
  },
  arrange_shoes: {
    title: 'จัดรองเท้าหน้าโบสถ์',
    icon: 'door',
    goal: 'วางรองเท้าขึ้นชั้นให้ครบทั้ง 8 คู่',
    steps: ['ลากรองเท้าไปวางบนข้างที่เหมือนกัน', 'ลากคู่ที่จับได้แล้วขึ้นชั้นวาง', 'นักท่องเที่ยวเดินผ่านอาจเตะรองเท้ากระจาย'],
    reward: REWARD('ไม้'),
  },
  light_candles: {
    title: 'จุดเทียนบูชา',
    icon: 'incense',
    goal: 'จุดเทียนให้ติดพร้อมกันครบทั้ง 9 เล่ม',
    steps: ['ลากไม้จุดเทียนไปแตะไส้เทียนค้างไว้', 'แตะก้อนลมที่ลอยมาให้หายไป', 'ถ้าลมถึงเทียนจะดับ ต้องจุดใหม่'],
    reward: REWARD('ทองคำเปลว'),
  },
  water_plants: {
    title: 'รดน้ำต้นไม้',
    icon: 'rose',
    goal: 'รดน้ำทั้ง 5 กระถางให้อยู่ในขีดสีเขียว',
    steps: ['กดค้างเหนือกระถางเพื่อรดน้ำ', 'ยกนิ้วเมื่อน้ำถึงขีดสีเขียว', 'รดพอดีแล้วดอกจะบานและผีเสื้อมาเยี่ยม'],
    reward: REWARD('ดอกไม้'),
  },
  polish_brass: {
    title: 'ขัดเครื่องทองเหลือง',
    icon: 'bell',
    goal: 'ขัดขัน ระฆัง และพานให้เงาครบ 3 ชิ้น',
    steps: ['ถูนิ้วไปมาเร็ว ๆ บนคราบหมอง', 'ยิ่งถูแรงยิ่งเงาไว', 'เงาครบแล้วชิ้นต่อไปจะเลื่อนมาเอง'],
    reward: REWARD('ทองคำเปลว'),
  },
  wipe_statues: {
    title: 'เช็ดองค์พระ',
    icon: 'wai',
    goal: 'เช็ดฝุ่นพระพุทธรูปทั้ง 3 องค์ให้สะอาดอย่างนุ่มนวล',
    steps: ['วนผ้าเป็นวงกลมช้า ๆ บนฝุ่น', 'ถ้ารีบถูเร็วเกินไปจะเสียดาว', 'ใจเย็น ๆ เช็ดอย่างเคารพ'],
    reward: REWARD('ผ้า'),
  },
}
