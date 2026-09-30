// Who asks for each volunteer job: portrait, name, role and a funny line for
// the brief card shown before the job starts.

import type { JobId } from '../../game/data/jobs'
import type { AvatarLook } from '../../art/avatar'
import { cached, type Sprite } from '../../engine/sprite'
import { createCanvas } from '../../engine/pixel'
import { dollPortrait } from '../../art/doll'
import { hdMonkSprite } from '../../art/minigames/monk'

export interface Requester {
  name: string
  role: string
  /** Portrait: an HD monk / novice, or a lay person's doll look. */
  who: { monk: 'monk' | 'novice' } | { look: AvatarLook }
  lines: string[]
}

const AUNTIE: AvatarLook = { gender: 'f', skin: 2, face: 2, hairColor: 0, hair: 'hair_bun', top: 'top_raj', bottom: 'bot_sarong', shoes: null, head: null, neck: null, hand: null, back: null }
const UNCLE: AvatarLook = { gender: 'm', skin: 3, face: 1, hairColor: 0, hair: 'hair_short', top: 'top_mohom', bottom: 'bot_fisherman', shoes: null, head: 'head_ngob', neck: null, hand: null, back: null }
const GRANNY: AvatarLook = { gender: 'f', skin: 1, face: 1, hairColor: 6, hair: 'hair_bun', top: 'top_white', bottom: 'bot_sarong', shoes: null, head: null, neck: null, hand: null, back: null }
const VOLUNTEER: AvatarLook = { gender: 'm', skin: 1, face: 0, hairColor: 1, hair: 'hair_twoblock', top: 'top_polo', bottom: 'bot_khaki', shoes: null, head: null, neck: null, hand: null, back: null }
const STEWARD: AvatarLook = { gender: 'm', skin: 2, face: 3, hairColor: 6, hair: 'hair_short', top: 'top_white', bottom: 'bot_khaki', shoes: null, head: null, neck: 'neck_pakaoma', hand: null, back: null }

export const REQUESTERS: Record<JobId, Requester> = {
  sweep_leaves: {
    name: 'หลวงตาบุญมี',
    role: 'เจ้าอาวาส',
    who: { monk: 'monk' },
    lines: ['ใบโพธิ์ร่วงทุกวัน เหมือนความกังวลนั่นแหละโยม กวาดบ่อย ๆ ใจจะโล่ง', 'ลมแรงวันนี้ อาตมาเห็นใบไม้บินเข้าปากเณรไปสองใบแล้ว'],
  },
  mop_floor: {
    name: 'ป้าสมศรี',
    role: 'แม่ครัวประจำวัด',
    who: { look: AUNTIE },
    lines: ['ใครเดินเท้าเปื้อนโคลนเข้าศาลาอีก ป้าจะตีด้วยทัพพี!', 'ถูให้เงาจนป้าส่องหน้าแต่งหน้าได้เลยนะหนู'],
  },
  feed_fish: {
    name: 'เณรต้นกล้า',
    role: 'สามเณรน้อย',
    who: { monk: 'novice' },
    lines: ['ปลาคาร์ฟหิวแล้วครับพี่ แต่อย่าให้เยอะนะ เดี๋ยวพุงป่องลอยน้ำ', 'ตัวสีทองชื่อ “บุญมา” ครับ ขี้งอนที่สุดในสระ'],
  },
  feed_catfish: {
    name: 'ลุงชม',
    role: 'คนเฝ้าท่าน้ำ',
    who: { look: UNCLE },
    lines: ['ปลาดุกที่นี่ตัวใหญ่กว่าแขนลุงอีก ระวังนิ้วด้วยล่ะ!', 'โยนให้ลงปากนะ ถ้าพลาดมันจะมองค้อนเหมือนแฟนเก่า'],
  },
  arrange_shoes: {
    name: 'พี่ปอ',
    role: 'จิตอาสาหน้าโบสถ์',
    who: { look: VOLUNTEER },
    lines: ['คนมาทำบุญเยอะมาก รองเท้าเต็มบันไดเลย ช่วยจับคู่หน่อยน้า', 'เจอรองเท้าข้างเดียวอย่าตกใจ มีคนเดินกลับไปขาเดียวทุกวัน… ล้อเล่น!'],
  },
  light_candles: {
    name: 'หลวงพี่ต้อม',
    role: 'พระดูแลวิหาร',
    who: { monk: 'monk' },
    lines: ['จุดเทียนให้สว่าง ใจเราก็สว่างตาม ระวังลมซนนะโยม', 'ก้อนลมพวกนี้ชอบแกล้งอาตมาทุกเย็นเลย'],
  },
  water_plants: {
    name: 'ยายเพ็ญ',
    role: 'ผู้ดูแลสวนหน้ากุฏิ',
    who: { look: GRANNY },
    lines: ['ดอกไม้ต้องการน้ำพอดี ๆ เหมือนความรักนั่นแหละหลาน', 'ต้นดาวเรืองต้นนั้นยายคุยด้วยทุกเช้า มันเลยบานสวยที่สุด'],
  },
  polish_brass: {
    name: 'ลุงแดง',
    role: 'ไวยาวัจกร',
    who: { look: STEWARD },
    lines: ['ขันใบนี้อายุมากกว่าลุงอีก ขัดให้เงาจนส่องเห็นรูจมูกเลย', 'ขัดแรง ๆ นะ ถือว่าออกกำลังแขนไปในตัว'],
  },
  wipe_statues: {
    name: 'เณรต้นกล้า',
    role: 'สามเณรน้อย',
    who: { monk: 'novice' },
    lines: ['ค่อย ๆ เช็ดนะครับ พระท่านไม่รีบ เราก็ไม่ต้องรีบ', 'ถ้าเช็ดแรงไป หลวงตาจะหันมามองแบบนี้ครับ… (ทำตาเขียว)'],
  },
}

/** Round-crop head-and-shoulders portrait (40×40). */
export function requesterPortrait(r: Requester): Sprite {
  const key = 'who' in r && 'monk' in r.who ? `req:monk:${r.who.monk}` : `req:${r.name}`
  return cached(key, () => {
    const S = 40
    const c = createCanvas(S, S)
    const ctx = c.getContext('2d')!
    if ('monk' in r.who) {
      const m = hdMonkSprite('front', 'stand', { novice: r.who.monk === 'novice' })
      ctx.drawImage(m.canvas, Math.round(S / 2 - m.w / 2), 4)
    } else {
      const p = dollPortrait(r.who.look, 34)
      ctx.drawImage(p.canvas, 3, 5)
    }
    return { canvas: c, w: S, h: S }
  })
}

/** A line for today (changes each play so the brief feels alive). */
export function requesterLine(r: Requester, seed: number): string {
  return r.lines[Math.abs(seed) % r.lines.length]
}
