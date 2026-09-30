// The people who run each booth and ride of the temple fair, for the brief
// card shown before you play: who they are, what they shout, what the game
// is in a line or two, and what you can win there.

import type { AvatarLook } from '../../art/avatar'
import { FAIR_GAMES, FAIR_PLAY_COST, type FairGameId } from '../../game/hubs'
import { CLAW_PRIZES } from './rules'
import { RIDES, rideKey, type RideId } from './rides'

export interface Souvenir {
  id: string
  /** How you get it. */
  how: string
}

export interface Vendor {
  name: string
  /** Job title under the name. */
  role: string
  look: AvatarLook
  /** Things they shout (one is picked each time the card opens). */
  lines: string[]
  /** What the game is, in a line or two. */
  what: string
  /** Prize-booth prizes their tickets go towards (FAIR_PRIZES ids). */
  prizes: string[]
  /** Collectibles won right here. */
  souvenirs: Souvenir[]
}

const L = (o: Partial<AvatarLook>): AvatarLook => ({ gender: 'm', skin: 2, face: 0, hairColor: 0, hair: 'hair_short', top: 'top_vendor', bottom: 'bot_khaki', ...o })

export const VENDORS: Record<string, Vendor> = {
  darts: {
    name: 'พี่ตุ๊ก',
    role: 'เจ้าของซุ้มปาลูกโป่ง',
    look: L({ gender: 'f', skin: 1, face: 2, hair: 'hair_ponytail', hairColor: 3, top: 'top_stripe', bottom: 'bot_jeans', head: 'head_vendorband' }),
    lines: ['ปาโดนสามลูก รับตุ๊กตาเลยจ้า!', 'ลูกโป่งทองแตกยาก แต่แตกทีคุ้มนะน้อง!', 'ปาไม่โดนก็ได้บุญ ปาโดนได้ตั๋ว วินวิน~'],
    what: 'ปาลูกดอกให้โดนลูกโป่งบนกระดาน ลูกโป่งทองกับหมูดึ๋งที่ลอยผ่านได้แต้มเยอะ',
    prizes: ['prize_coins_s', 'fair_balloon_hippo', 'fair_teddy_pink', 'fair_mega_hippo'],
    souvenirs: [],
  },
  rings: {
    name: 'ลุงแหวน',
    role: 'เซียนโยนห่วงสามสิบปี',
    look: L({ skin: 3, face: 1, hair: 'hair_buzz', hairColor: 6, top: 'top_hawaii', bottom: 'bot_fisherman', head: 'head_sunhat' }),
    lines: ['คล้องคอขวดได้ ลุงยกให้ทั้งลังเลย! (ล้อเล่น)', 'ข้อมือนิ่ง ๆ ใจเย็น ๆ ห่วงจะไปเอง', 'แถวหลังแต้มสูงนะหลาน ลองดูสักวง!'],
    what: 'ลากนิ้วโยนห่วงไปคล้องคอขวดและตุ๊กตา ยิ่งไกลยิ่งได้แต้มเยอะ',
    prizes: ['fair_goldfish', 'fair_uncle_duck', 'prize_lookchin', 'fair_ferris_globe'],
    souvenirs: [],
  },
  cork: {
    name: 'เฮียปัง',
    role: 'มือปืนจุกคอร์กประจำงาน',
    look: L({ skin: 1, face: 3, hair: 'hair_twoblock', hairColor: 0, top: 'top_tee_black', bottom: 'bot_jeans_black', head: 'head_sunglasses' }),
    lines: ['เล็งหัวตุ๊กตา แรงกว่าเยอะ เชื่อเฮีย!', 'หมียักษ์สามนัดตก ใครยิงได้เฮียเลี้ยงน้ำแดง!', 'ปัง! ปัง! ของรางวัลรอเจ้าของอยู่นะ'],
    what: 'เล็งแล้วยิงจุกคอร์กให้ของรางวัลตกจากชั้น ตุ๊กตาใหญ่ต้องยิงหลายนัด',
    prizes: ['fair_ghost_keychain', 'fair_teddy_pink', 'fair_likay_doll', 'fair_mega_hippo'],
    souvenirs: [],
  },
  scoop: {
    name: 'ป้าพร',
    role: 'แม่ค้าปลาทองใจดี',
    look: L({ gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_floral', bottom: 'bot_sin_mudmee' }),
    lines: ['ตักเบา ๆ นะลูก โปยป้าบางกว่าใจแฟนเก่า', 'ตักได้ปลาหัวสิงห์ ป้าแถมถุงสวยให้เลย!', 'ปลาดำตาโปนน่ารักนะ ลองตักดู~'],
    what: 'จุ่มกระดาษโปยใต้ปลาทองแล้วช้อนขึ้นก่อนกระดาษขาด ได้ปลาตัวที่ดีที่สุดกลับบ้าน',
    prizes: ['fair_goldfish', 'fair_balloon_hippo', 'fair_uncle_duck'],
    souvenirs: [
      { id: 'fair_goldfish_black', how: 'ตักได้ในอ่าง' },
      { id: 'fair_goldfish_calico', how: 'ตักได้ในอ่าง' },
      { id: 'fair_goldfish_lion', how: 'ตัวหายากในอ่าง' },
    ],
  },
  bumper: {
    name: 'น้าสายฟ้า',
    role: 'ผู้คุมลานรถบั๊มพ์',
    look: L({ skin: 2, face: 2, hair: 'hair_curly', hairColor: 1, top: 'top_jersey', bottom: 'bot_track', head: 'head_cap' }),
    lines: ['ชนได้ ชนเลย! แต่ห้ามชนน้านะ', 'รถสีทองวิ่งเร็ว ชนได้สามแต้ม!', 'รัดเข็มขัด (ในใจ) แล้วลุยยย!'],
    what: 'ขับรถบั๊มพ์ไล่ชนรถคันอื่นในลาน ชนท้ายหรือชนข้างได้แต้มสองเท่า',
    prizes: ['prize_coins_s', 'fair_uncle_duck', 'fair_teddy_pink'],
    souvenirs: [{ id: 'fair_bumper_badge', how: 'เล่นได้สามดาว' }],
  },
  ramwong: {
    name: 'ลุงเสนาะ',
    role: 'หัวหน้าวงรำวง',
    look: L({ skin: 3, face: 0, hair: 'hair_short', hairColor: 6, top: 'top_raj', bottom: 'bot_slacks_grey', neck: 'neck_garland' }),
    lines: ['กลองโทนมาแล้ว ยกมือจีบเลยหลาน!', 'รำตรงจังหวะ ลุงมีพัดสวย ๆ ให้', 'เพลงนี้เพลงประจำงาน ใครรำไม่เป็นลุงสอน!'],
    what: 'แตะซ้ายหรือขวาให้ตรงจังหวะดอกไม้ที่ลอยลงวงทอง ต่อคอมโบได้แต้มเพิ่ม',
    prizes: ['fair_likay_doll', 'prize_likay_hat'],
    souvenirs: [{ id: 'fair_ramwong_fan', how: 'รำได้สามดาว' }],
  },
  'ride:wheel': {
    name: 'พี่โอ๋',
    role: 'คนคุมชิงช้าสวรรค์',
    look: L({ gender: 'f', skin: 1, face: 0, hair: 'hair_bob', hairColor: 2, top: 'top_denim', bottom: 'bot_jeans', head: 'head_headphones' }),
    lines: ['ขึ้นไปถึงยอดพอดีพลุขึ้น ฟินมาก!', 'ถ่ายรูปบนยอดนะ วิวดีที่สุดในงาน', 'นั่งนิ่ง ๆ ห้ามโยกนะคะ (โยกนิดนึงได้)'],
    what: 'นั่งกระเช้าขึ้นไปชมวิวงานวัดทั้งงาน แตะฟ้าจุดพลุ กดถ่ายรูปบนยอด',
    prizes: [],
    souvenirs: [
      { id: 'fair_wheel_photo', how: 'ถ่ายรูปบนยอด' },
      { id: 'fair_firework_pin', how: 'ดูพลุในงานจนจบรอบ' },
    ],
  },
  'ride:carousel': {
    name: 'ยายหมุน',
    role: 'เจ้าของม้าหมุนรุ่นคุณปู่',
    look: L({ gender: 'f', skin: 2, face: 3, hair: 'hair_bun', hairColor: 6, top: 'top_cardigan', bottom: 'bot_sarong', head: 'head_glasses' }),
    lines: ['ม้าตัวสีชมพูเร็วสุดนะหลาน (เท่ากันหมด)', 'คว้าห่วงทองได้ ยายให้เก็บไว้เลย', 'หมุนมาสี่สิบปี ยังไม่เคยเวียนหัว!'],
    what: 'ขี่ม้าหมุนวนตามเสียงเพลง แตะคว้าห่วงทองตอนแขนแจกห่วงยื่นมาใกล้',
    prizes: [],
    souvenirs: [{ id: 'fair_carousel_ring', how: 'คว้าห่วงทองได้' }],
  },
  'ride:claw': {
    name: 'น้องบีม',
    role: 'เด็กหยอดเหรียญตู้คีบ',
    look: L({ skin: 1, face: 2, hair: 'hair_curtain', hairColor: 4, top: 'top_hoodie_over', bottom: 'bot_joggers', head: 'head_catears' }),
    lines: ['ตู้นี้ใจดี คีบพลาดหลายทีเดี๋ยวติดเอง!', 'มีหมูดึ๋งทองอยู่ตัวนึงนะ ใครคีบได้กรี๊ดเลย', 'เล็งตรงกลางตัว ติดแน่นกว่า เชื่อผม'],
    what: 'เลื่อนก้ามคีบไปเหนือตุ๊กตาแล้วกดคีบ ตุ๊กตาที่คีบได้เก็บเป็นของสะสม',
    prizes: [],
    souvenirs: CLAW_PRIZES.map((p) => ({ id: p.id, how: p.id === 'fair_claw_golden' ? 'ตัวลับ มีตัวเดียว' : 'คีบได้ในตู้' })),
  },
  'ride:likay': {
    name: 'แม่ยกสมศรี',
    role: 'แฟนคลับลิเกเบอร์หนึ่ง',
    look: L({ gender: 'f', skin: 2, face: 1, hair: 'hair_bun', hairColor: 6, top: 'top_thaisilk', bottom: 'bot_sin_mudmee', neck: 'neck_money_garland', hand: 'hand_fan' }),
    lines: ['พระเอกเก๊กท่าเมื่อไหร่ กรี๊ดให้ดังเลย!', 'นั่งดูฟรี แต่เชียร์ต้องจัดเต็มนะ', 'โอ้ละหนอ~ พ่อพระเอกหล่อจนแม่ลืมบ้าน'],
    what: 'นั่งดูลิเกฟรี แตะเชียร์ได้ตลอด กดเชียร์ให้ตรงตอนพระเอกเก๊กท่า',
    prizes: [],
    souvenirs: [{ id: 'fair_money_garland', how: 'เชียร์ตรงจังหวะท่าเก๊ก' }],
  },
}

export interface BoothInfo {
  key: string
  name: string
  icon: string
  /** Coins per round after the free first one (0 = always free). */
  base: number
  vendor: Vendor
}

export function gameBooth(id: FairGameId): BoothInfo {
  const def = FAIR_GAMES[id]
  return { key: id, name: def.booth, icon: def.icon, base: FAIR_PLAY_COST, vendor: VENDORS[id] }
}

export function rideBooth(id: RideId): BoothInfo {
  const def = RIDES[id]
  return { key: rideKey(id), name: def.name, icon: def.icon, base: def.price, vendor: VENDORS[rideKey(id)] }
}
