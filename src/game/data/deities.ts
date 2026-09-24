// Deities you can pay respect to. Each has favourite offerings and grants a
// small, time-limited blessing (buff) once per day.

import type { AreaId } from './areas'

export type BlessingKind = 'merit' | 'coin' | 'animal' | 'lucky'

export interface Deity {
  id: string
  name: string
  title: string
  about: string
  /** Where they can be visited. */
  area: AreaId
  favorites: string[]
  /** Offering items that are not appropriate (e.g. meat for Guan Yin). */
  avoid?: string[]
  mantra?: string
  blessing: { kind: BlessingKind; mult: number; minutes: number; text: string }
  palette: { body: string; bodyD: string; robe: string; robeD: string; gold: string; aura: string }
}

export const DEITIES: Deity[] = [
  {
    id: 'vessavana',
    name: 'ท้าวเวสสุวรรณ',
    title: 'ผู้พิทักษ์ ปกป้องภัย',
    about: 'ท้าวจตุโลกบาลผู้ดูแลทิศเหนือ เชื่อกันว่าช่วยปกป้องคุ้มครองและเสริมโชคลาภ มักประดิษฐานที่ประตูวัด',
    area: 'home',
    favorites: ['fruit', 'redsoda', 'incense', 'garland'],
    mantra: 'อิติปิโส ภะคะวา ยมราชาโน ท้าวเวสสุวัณโณ มรณังสุขัง อะระหัง สุคะโต นะโมพุทธายะ',
    blessing: { kind: 'coin', mult: 1.25, minutes: 60, text: 'เหรียญจากกิจกรรม +25% เป็นเวลา 1 ชั่วโมง' },
    palette: { body: '#4f7fbf', bodyD: '#3a5f96', robe: '#b8343f', robeD: '#7e2436', gold: '#ffd54f', aura: '#9fd0ff' },
  },
  {
    id: 'ganesha',
    name: 'พระพิฆเนศ',
    title: 'เทพแห่งความสำเร็จ',
    about: 'เทพผู้ขจัดอุปสรรคและประทานความสำเร็จ เป็นที่เคารพของผู้ทำงานศิลปะและการเรียน',
    area: 'shrine',
    favorites: ['laddu', 'fruit', 'milk', 'garland'],
    mantra: 'โอม ศรี คเณศายะ นะมะห์',
    blessing: { kind: 'merit', mult: 1.2, minutes: 60, text: 'ได้บุญเพิ่ม 20% เป็นเวลา 1 ชั่วโมง' },
    palette: { body: '#f28fa6', bodyD: '#d06a86', robe: '#ffd23f', robeD: '#e0a526', gold: '#ffd54f', aura: '#ffd6e0' },
  },
  {
    id: 'brahma',
    name: 'พระพรหม',
    title: 'ผู้สร้าง ประทานพรทั้งสี่ทิศ',
    about: 'เทพสี่พักตร์ ผู้มีเมตตาไม่มีประมาณ ผู้คนนิยมมาขอพรให้สมหวังในทุกด้าน',
    area: 'shrine',
    favorites: ['garland', 'elephant', 'fruit', 'milk'],
    blessing: { kind: 'merit', mult: 1.1, minutes: 180, text: 'ได้บุญเพิ่ม 10% เป็นเวลา 3 ชั่วโมง' },
    palette: { body: '#ffd54f', bodyD: '#e9a53a', robe: '#fffaf0', robeD: '#e6dccb', gold: '#ffd54f', aura: '#fff3a6' },
  },
  {
    id: 'guanyin',
    name: 'เจ้าแม่กวนอิม',
    title: 'เมตตาต่อสรรพสัตว์',
    about: 'พระโพธิสัตว์แห่งความเมตตากรุณา คอยช่วยเหลือผู้ทุกข์ยาก ถวายได้เฉพาะของเจ ไม่มีเนื้อสัตว์',
    area: 'shrine',
    favorites: ['fruit', 'tea', 'lotus', 'incense'],
    avoid: ['boiled_egg', 'chicken', 'egg'],
    mantra: 'นำโม กวนซืออิม ผ่อสัก',
    blessing: { kind: 'animal', mult: 2, minutes: 60, text: 'ให้อาหารสัตว์ได้บุญสองเท่า 1 ชั่วโมง' },
    palette: { body: '#fde4cf', bodyD: '#eec3a2', robe: '#fffaf0', robeD: '#dfe7f2', gold: '#9fd0ff', aura: '#d4f1ff' },
  },
  {
    id: 'lakshmi',
    name: 'พระแม่ลักษมี',
    title: 'ความรักและความมั่งคั่ง',
    about: 'เทวีแห่งโชคลาภ ความงาม และความรัก ประทับบนดอกบัว',
    area: 'shrine',
    favorites: ['rose', 'lotus', 'milk', 'dessert'],
    mantra: 'โอม ศรี มหาลักษมี นะมะห์',
    blessing: { kind: 'coin', mult: 1.3, minutes: 60, text: 'เหรียญจากกิจกรรม +30% เป็นเวลา 1 ชั่วโมง' },
    palette: { body: '#f9c9a6', bodyD: '#e3a57f', robe: '#e8709e', robeD: '#c24f7e', gold: '#ffd54f', aura: '#ffc4d8' },
  },
  {
    id: 'naga',
    name: 'พญานาค',
    title: 'ผู้พิทักษ์สายน้ำ ให้โชคลาภ',
    about: 'พญานาคผู้พิทักษ์พระศาสนาและแม่น้ำ ชาวบ้านเชื่อว่าช่วยให้ร่ำรวยและมีโชค',
    area: 'mountain',
    favorites: ['lotus', 'boiled_egg', 'redsoda', 'fruit'],
    blessing: { kind: 'lucky', mult: 1, minutes: 24 * 60, text: 'ได้สิทธิ์ขูดเลขเด็ดเพิ่ม 1 ครั้งวันนี้' },
    palette: { body: '#43a86a', bodyD: '#2f7a4f', robe: '#ffd54f', robeD: '#e0a526', gold: '#ffd54f', aura: '#b4e486' },
  },
]

export const DEITY_BY_ID: Record<string, Deity> = Object.fromEntries(DEITIES.map((d) => [d.id, d]))
