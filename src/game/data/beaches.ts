// Beach data (หาด): the six beach places, their mini-games and what other
// (simulated) visitors say there. Place entries live in places.ts (kind
// 'beach'); maps in src/scenes/maps/places/beach-*.ts; the mini-games in
// src/activities/beach. Hotspot contract: `beach:<game>` opens
// openActivity('beach', { game }) on the current beach map.

import type { GameEvent } from './quests'
import type { AvatarLook } from '../../art/avatar'

export const BEACH_IDS = ['beach_bangsaen', 'beach_huahin', 'beach_samila', 'beach_samui', 'beach_patong', 'beach_railay'] as const
export type BeachId = (typeof BEACH_IDS)[number]

export function isBeach(id: string | null | undefined): id is BeachId {
  return !!id && (BEACH_IDS as readonly string[]).includes(id.split(':')[0])
}

export type BeachGameId = 'chedi' | 'cleanup' | 'turtle' | 'shells' | 'snorkel' | 'banana' | 'photo'

export interface BeachGameDef {
  id: BeachGameId
  name: string
  icon: string
  /** One-line goal for the how-to card and the HUD. */
  goal: string
  steps: string[]
  /** Reward line on the how-to card. */
  reward: string
  /** Round length in seconds (0 = untimed). */
  time: number
  /** Full-reward rounds per day (after that rewards drop to 25%). */
  daily: number
  /** Base merit and coins at three stars (before place bonus and buffs). */
  merit: number
  coins: number
  /** Quest/stat event tracked on a counted round (besides 'beach_play'). */
  event?: GameEvent
  /** Hotspot hint on the map. */
  hint: string
  /** The host / vendor who runs it (shown on the brief card). */
  host: { name: string; role: string; line: string; look: Partial<AvatarLook> }
  /** Coins per round (0 = free). */
  price: number
  /** Ride packs: N rounds for a discount (e.g. 3 rounds 20% off). */
  pack?: { n: number; off: number }
  /** Merit multiplier on the first counted round of the day. */
  firstBonus?: number
  /** Price off (0..1) when wearing the full snorkel set (suit + flippers). */
  gearOff?: number
}

export const BEACH_GAMES: Record<BeachGameId, BeachGameDef> = {
  chedi: {
    id: 'chedi',
    name: 'ก่อเจดีย์ทราย',
    icon: 'temple',
    goal: 'ก่อเจดีย์ทรายให้สูงตรงสวย แล้วประดับธงกับดอกไม้',
    steps: ['แตะเพื่อคว่ำถังทรายเป็นชั้น ๆ ให้ตรงกลางที่สุด', 'ถูเกลี่ยทรายให้เรียบเนียน', 'แตะประดับธงทิวและดอกไม้ แล้วอธิษฐาน'],
    reward: 'บุญก้อนโต (ประเพณีก่อพระเจดีย์ทรายช่วงสงกรานต์) + คอยน์',
    time: 50,
    daily: 3,
    merit: 30,
    coins: 20,
    event: 'sand_chedi',
    hint: 'ก่อพระเจดีย์ทรายถวายเป็นพุทธบูชา',
    host: { name: 'ยายเพียร', role: 'ผู้เฒ่าชวนก่อเจดีย์ทราย', line: 'ทรายติดเท้าออกจากวัดไป ก่อเจดีย์คืนให้ท่านนะหลาน ได้บุญสองเด้ง', look: { gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_white', bottom: 'bot_sarong', head: 'head_sunhat' } },
    price: 0,
    firstBonus: 2,
  },
  cleanup: {
    id: 'cleanup',
    name: 'เก็บขยะชายหาด',
    icon: 'trash',
    goal: 'เก็บขยะก่อนคลื่นพาลงทะเล ระวังปูหนีบ',
    steps: ['แตะขยะบนหาด แล้วเราจะเดินไปคีบใส่ถุง', 'คลื่นซัดขยะใหม่ขึ้นมาเรื่อย ๆ เก็บต่อกันเป็นคอมโบ', 'เจอเปลือกหอยสวย ๆ เก็บไว้ได้ แต่อย่าไปคีบปูนะ!'],
    reward: 'บุญจิตอาสา + คอยน์ + เปลือกหอยที่เจอระหว่างทาง',
    time: 45,
    daily: 3,
    merit: 22,
    coins: 24,
    event: 'job',
    hint: 'งานอาสา: เก็บขยะคืนหาดสวยให้ทะเล',
    host: { name: 'พี่เต้ย', role: 'หัวหน้าจิตอาสารักษ์หาด', line: 'ถุงมือกับที่คีบพร้อม! ขยะหนึ่งชิ้นอาจช่วยชีวิตเต่าได้หนึ่งตัวเลยนะ', look: { gender: 'm', skin: 2, face: 0, hair: 'hair_short', hairColor: 0, top: 'top_tee_boon', bottom: 'bot_cargo', head: 'head_cap' } },
    price: 0,
    firstBonus: 2,
  },
  turtle: {
    id: 'turtle',
    name: 'ปล่อยเต่าทะเล',
    icon: 'heart',
    goal: 'พาลูกเต่าคลานลงทะเลให้ได้มากที่สุด',
    steps: ['แตะลูกเต่าเพื่อช่วยดันให้คลานตรงไปหาคลื่น', 'แตะไล่ปูลมกับนกนางนวลก่อนจะถึงตัวลูกเต่า', 'ลูกเต่าหงายท้อง แตะพลิกกลับให้ด้วยนะ'],
    reward: 'บุญปล่อยสัตว์ + คอยน์ ลูกเต่ายิ่งรอดเยอะยิ่งได้เยอะ',
    time: 45,
    daily: 2,
    merit: 34,
    coins: 18,
    event: 'sea_turtle',
    hint: 'ช่วยศูนย์อนุรักษ์ปล่อยลูกเต่าทะเล',
    host: { name: 'หมอเต่า', role: 'สัตวแพทย์ศูนย์อนุรักษ์เต่าทะเล', line: 'ลูกเต่าฟักเมื่อคืนสิบสองตัว ห้ามให้ปูกับนกได้ไปแม้แต่ตัวเดียวนะ!', look: { gender: 'f', skin: 1, face: 5, hair: 'hair_ponytail', hairColor: 1, top: 'top_polo', bottom: 'bot_khaki', head: 'head_cap' } },
    price: 10,
    firstBonus: 2,
  },
  shells: {
    id: 'shells',
    name: 'เก็บเปลือกหอย',
    icon: 'star',
    goal: 'คลื่นถอยเมื่อไหร่ รีบเก็บเปลือกหอยก่อนคลื่นลูกใหม่มา',
    steps: ['รอคลื่นถอย เปลือกหอยจะโผล่พ้นทราย', 'แตะเก็บให้ไว ตัวที่วิบวับคือของหายาก', 'หอยที่ยังมีปูเสฉวนอยู่ข้างใน ห้ามเก็บนะ เขามีบ้านแล้ว!'],
    reward: 'เปลือกหอยเข้าสมุดของสะสม (มีระดับความหายาก) + คอยน์นิดหน่อย',
    time: 40,
    daily: 3,
    merit: 6,
    coins: 12,
    hint: 'เดินเก็บเปลือกหอยริมคลื่น',
    host: { name: 'น้องมุก', role: 'เด็กชาวเล นักล่าเปลือกหอย', line: 'หอยที่มีปูเสฉวนอยู่ห้ามเอานะ เขาเช่าบ้านอยู่ ยังไม่หมดสัญญา!', look: { gender: 'f', skin: 3, face: 5, hair: 'hair_ponytail', hairColor: 0, top: 'top_tee_white', bottom: 'bot_jeans' } },
    price: 0,
  },
  snorkel: {
    id: 'snorkel',
    name: 'ดำน้ำดูปะการัง',
    icon: 'water',
    goal: 'ว่ายชมปลาให้ครบหลายชนิด อย่าเหยียบปะการังหรือเม่นทะเล',
    steps: ['ลากนิ้วเพื่อว่ายไปรอบแนวปะการัง', 'ว่ายเข้าใกล้ปลาเพื่อจดลงสมุดปลา', 'เจอถุงพลาสติกลอยอยู่ เก็บขึ้นมาได้บุญด้วย'],
    reward: 'คอยน์ + สมุดปลา + ลุ้นไข่มุกหายาก',
    time: 50,
    daily: 3,
    merit: 10,
    coins: 26,
    hint: 'ใส่ชุดดำน้ำหรือตีนกบแล้วลงไปดูปะการัง',
    host: { name: 'บังโซ๊ะ', role: 'คนขับเรือพาดำน้ำ', line: 'ใส่ตีนกบแล้วว่ายตามบังมา ปลาการ์ตูนนั่งรออยู่ในดอกไม้ทะเลแล้ว', look: { gender: 'm', skin: 3, face: 2, hair: 'hair_buzz', hairColor: 0, top: 'top_hawaii', bottom: 'bot_fisherman', head: 'head_sunglasses' } },
    price: 20,
    gearOff: 0.5,
  },
  banana: {
    id: 'banana',
    name: 'บานาน่าโบ๊ต',
    icon: 'banana',
    goal: 'กดค้างให้เกาะแน่นตอนเรือกระแทกคลื่น ปล่อยตอนเรือนิ่ง',
    steps: ['เห็นป้าย ! แปลว่าคลื่นลูกใหญ่มา กดค้างไว้', 'คลื่นผ่านแล้วปล่อยมือ ยกมือเฮได้คะแนนโบนัส', 'สุดท้าย... คนขับจะเลี้ยวหักศอก (ทุกคนรู้ว่าจะเกิดอะไรขึ้น)'],
    reward: 'คอยน์ + เสียงหัวเราะ',
    time: 35,
    daily: 3,
    merit: 4,
    coins: 22,
    hint: 'ขี่กล้วยยักษ์ลากด้วยเรือเร็ว',
    host: { name: 'พี่ต้อง', role: 'คนขับเรือเร็วลากบานาน่าโบ๊ต', line: 'เกาะแน่น ๆ นะ รับรองไม่ตก... อาจจะตกนิดหน่อย 555', look: { gender: 'm', skin: 2, face: 3, hair: 'hair_short', hairColor: 0, top: 'top_hawaii', bottom: 'bot_jeans', head: 'head_sunglasses' } },
    price: 30,
    pack: { n: 3, off: 0.2 },
  },
  photo: {
    id: 'photo',
    name: 'จุดถ่ายรูป',
    icon: 'camera',
    goal: 'จัดท่าแล้วกดชัตเตอร์ เก็บภาพครบทั้งกลางวัน ตอนเย็น และกลางคืน',
    steps: ['เลือกท่าโพสที่ชอบ', 'รอคลื่นกับนกให้สวยแล้วกดชัตเตอร์', 'ภาพใหม่ของแต่ละช่วงเวลาได้คอยน์และเข้าอัลบั้ม'],
    reward: 'คอยน์สำหรับภาพใหม่ + อัลบั้มทะเล',
    time: 0,
    daily: 6,
    merit: 0,
    coins: 15,
    hint: 'มุมถ่ายรูปพระอาทิตย์ตกทะเล',
    host: { name: 'ช่างเจมส์', role: 'ช่างภาพประจำหาด', line: 'ยิ้ม~ หันหน้าหาแสง อย่าหลับตาตอนแฟลชนะ เดี๋ยวได้ภาพผี', look: { gender: 'm', skin: 1, face: 0, hair: 'hair_short', hairColor: 1, top: 'top_hawaii', bottom: 'bot_jeans', head: 'head_cap' } },
    price: 0,
  },
}

export const BEACH_GAME_IDS = Object.keys(BEACH_GAMES) as BeachGameId[]

export interface BeachMeta {
  id: BeachId
  /** Short name for chips, e.g. 'บางแสน'. */
  short: string
  /** The merit landmark near the beach. */
  landmark: string
  /** Mini-games on this beach (each has a `beach:<game>` hotspot). */
  games: BeachGameId[]
  /** Which sea (sets the water colours in the mini-games). */
  sea: 'gulf' | 'andaman'
  /** What other (simulated) visitors say here. */
  chat: string[]
}

const COMMON_CHAT = ['ทาครีมกันแดดยัง!', 'ทรายร้อนมากกก', 'ใครเห็นรองเท้าแตะฉันบ้าง', 'ถ่ายรูปให้หน่อยได้ไหม', 'น้ำทะเลเค็มจัง 555', 'มะพร้าวลูกนี้หวานมาก', 'ปูวิ่งเร็วมาก!', 'อนุโมทนาบุญกับคนเก็บขยะนะ']

export const BEACH_META: Record<BeachId, BeachMeta> = {
  beach_bangsaen: {
    id: 'beach_bangsaen',
    short: 'บางแสน',
    landmark: 'ศาลเจ้าแม่สามมุข',
    games: ['chedi', 'cleanup', 'shells', 'banana', 'photo'],
    sea: 'gulf',
    chat: [...COMMON_CHAT, 'ลิงเอาแว่นฉันไป!!', 'เช่าห่วงยางวงละยี่สิบ', 'ปูม้านึ่งมาแล้ว', 'ไปไหว้เจ้าแม่สามมุขก่อนกลับนะ'],
  },
  beach_huahin: {
    id: 'beach_huahin',
    short: 'หัวหิน',
    landmark: 'พระพุทธรูปยืนเขาตะเกียบ',
    games: ['chedi', 'cleanup', 'shells', 'turtle', 'photo'],
    sea: 'gulf',
    chat: [...COMMON_CHAT, 'ขี่ม้าไหมครับ', 'หมึกย่างไม้นี้ใหญ่มาก', 'สถานีรถไฟหัวหินสวยสุด ๆ', 'ม้าตัวนั้นชื่อเจ้าแต้ว'],
  },
  beach_samila: {
    id: 'beach_samila',
    short: 'สมิหลา',
    landmark: 'นางเงือกทอง',
    games: ['turtle', 'cleanup', 'shells', 'chedi', 'photo'],
    sea: 'gulf',
    chat: [...COMMON_CHAT, 'ขอพรนางเงือกทองกัน', 'เกาะหนูเกาะแมวอยู่ตรงนั้น', 'ลมใต้ต้นสนเย็นสบายจัง', 'หรอยจังฮู้!'],
  },
  beach_samui: {
    id: 'beach_samui',
    short: 'สมุย',
    landmark: 'พระใหญ่เกาะฟาน',
    games: ['snorkel', 'chedi', 'shells', 'turtle', 'photo'],
    sea: 'gulf',
    chat: [...COMMON_CHAT, 'กราบพระใหญ่มาแล้ว', 'คืนนี้มีโชว์ควงไฟ!', 'น้ำใสเห็นปลาเลย', 'มะพร้าวสมุยหวานที่สุด'],
  },
  beach_patong: {
    id: 'beach_patong',
    short: 'ป่าตอง',
    landmark: 'วัดสุวรรณคีรีวงก์',
    games: ['banana', 'cleanup', 'snorkel', 'shells', 'photo'],
    sea: 'andaman',
    chat: [...COMMON_CHAT, 'บานาน่าโบ๊ตตกน้ำทุกรอบ 555', 'พาราเซลลอยไปแล้ว!', 'ผ้าปาเต๊ะผืนละร้อย', 'นวดใต้ต้นไม้ฟินมาก'],
  },
  beach_railay: {
    id: 'beach_railay',
    short: 'ไร่เลย์',
    landmark: 'ถ้ำพระนาง',
    games: ['snorkel', 'cleanup', 'shells', 'turtle', 'photo'],
    sea: 'andaman',
    chat: [...COMMON_CHAT, 'หน้าผาสูงมาก!', 'นั่งเรือหางยาวมาเมาคลื่นนิดนึง', 'ถ้ำพระนางต้องเงียบ ๆ นะ', 'มีคนปีนผาอยู่ข้างบน!'],
  },
}

/** Beach id for a map id (`beach_x` or an interior `beach_x:room`), else null. */
export function beachOf(mapId: string | null | undefined): BeachId | null {
  if (!mapId) return null
  const root = mapId.split(':')[0]
  return isBeach(root) ? root : null
}
