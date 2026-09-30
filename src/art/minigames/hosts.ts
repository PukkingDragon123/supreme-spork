// The host NPC of each temple mini-game (vendors, monks, temple kids): their
// HD doll looks, names and speech-bubble lines. Used by the brief cards and
// drawn into the scenes as ambient life.

import type { AvatarLook } from '../avatar'

export interface TempleHost {
  name: string
  role: string
  /** A monk or novice uses the HD monk sprite instead of a doll. */
  monk?: 'monk' | 'novice'
  look?: AvatarLook
  lines: string[]
}

const L = (o: Partial<AvatarLook> & Pick<AvatarLook, 'gender' | 'hair' | 'top' | 'bottom'>): AvatarLook => ({
  skin: 1,
  face: 1,
  hairColor: 0,
  head: null,
  neck: null,
  hand: null,
  shoes: null,
  back: null,
  ...o,
})

export const AUNTIE_RICE = L({ gender: 'f', skin: 2, face: 1, hairColor: 1, hair: 'hair_bun', top: 'top_floral', bottom: 'bot_sarong', head: 'head_vendorband' })
export const UNCLE_KOI = L({ gender: 'm', skin: 2, face: 3, hairColor: 6, hair: 'hair_buzz', top: 'top_hawaii', bottom: 'bot_fisherman', head: 'head_sunhat' })
export const AUNTIE_FLOWER = L({ gender: 'f', skin: 1, face: 4, hairColor: 0, hair: 'hair_bun', top: 'top_pakaoma', bottom: 'bot_sin_mudmee', head: 'head_jasmine', neck: 'neck_garland' })
export const AUNTIE_POWDER = L({ gender: 'f', skin: 2, face: 2, hairColor: 2, hair: 'hair_curly', top: 'top_retro_floral', bottom: 'bot_batik', head: 'head_sunglasses' })
export const GRANNY_GOLD = L({ gender: 'f', skin: 3, face: 1, hairColor: 6, hair: 'hair_bun', top: 'top_white', bottom: 'bot_sarong', neck: 'neck_amulet' })
export const STEWARD = L({ gender: 'm', skin: 1, face: 0, hairColor: 6, hair: 'hair_short', top: 'top_white', bottom: 'bot_black', neck: 'neck_pakaoma' })
export const SHRINE_KEEPER = L({ gender: 'f', skin: 1, face: 5, hairColor: 0, hair: 'hair_long', top: 'top_thaisilk', bottom: 'bot_sin_nan', head: 'head_frangipani' })
export const KRATHONG_GIRL = L({ gender: 'f', skin: 1, face: 5, hairColor: 3, hair: 'hair_twin', top: 'top_sabai', bottom: 'bot_jong', head: 'head_flowercrown' })
export const TEMPLE_KID = L({ gender: 'm', skin: 2, face: 5, hairColor: 0, hair: 'hair_jook', top: 'top_tee_boon', bottom: 'bot_denim_shorts', head: 'head_cap' })

/** Background worshippers for crowd scenes. */
export const WORSHIPPERS: AvatarLook[] = [
  L({ gender: 'f', skin: 2, face: 1, hair: 'hair_long', top: 'top_white', bottom: 'bot_sarong' }),
  L({ gender: 'm', skin: 0, face: 0, hairColor: 1, hair: 'hair_short', top: 'top_white', bottom: 'bot_khaki' }),
  L({ gender: 'f', skin: 3, face: 2, hair: 'hair_bun', top: 'top_lace', bottom: 'bot_skirt' }),
  L({ gender: 'm', skin: 1, face: 3, hairColor: 6, hair: 'hair_buzz', top: 'top_polo', bottom: 'bot_black' }),
  L({ gender: 'f', skin: 1, face: 5, hairColor: 4, hair: 'hair_ponytail', top: 'top_tee_lotus', bottom: 'bot_jeans' }),
]

export const HOSTS: Record<string, TempleHost> = {
  alms: { name: 'ป้าจิต', role: 'ร้านข้าวแกงหน้าวัด', look: AUNTIE_RICE, lines: ['ข้าวหอมมะลิหุงใหม่ ๆ จ้า ตักบาตรเช้าได้บุญสองเท่านะลูก', 'ถอดรองเท้าก่อนนะ พระท่านจะได้ไม่ต้องก้มมอง', 'ตักข้าวให้พอดี ๆ อย่าล้นทัพพีเหมือนป้าเมื่อวาน'] },
  koi: { name: 'ลุงปลาทอง', role: 'ร้านอาหารปลาข้างสระ', look: UNCLE_KOI, lines: ['ปลาคาร์ฟทองโผล่มาวันนี้ด้วยนะ งับทีโชคดีทั้งปี!', 'โยนใกล้ ๆ ตัวที่ยังไม่อิ่มนะหลาน ตัวอ้วนมันแย่งเก่ง', 'ลุงขายถุงละ 5 แต่เหมา 5 ถุงลุงลดให้ ใจดีปะล่ะ'] },
  koi_river: { name: 'ลุงปลาทอง', role: 'ร้านขนมปังริมท่าน้ำ', look: UNCLE_KOI, lines: ['ปลาสวายตัวเท่าแขนเลย ระวังโดนน้ำกระเด็นนะ!', 'ขนมปังก้อนนุ่ม ๆ ปลามันชอบ ลุงก็ชอบ', 'โยนแล้วถอยนิดนึงนะ มันกระโดดแรง'] },
  wish: { name: 'ป้าบัว', role: 'แผงดอกไม้ธูปเทียน', look: AUNTIE_FLOWER, lines: ['ธูปสามดอกบูชาพระรัตนตรัยนะจ๊ะ อย่าจุดเก้าดอกเหมือนไหว้เจ้า', 'ดอกบัวบานเช้านี้เลย หอมชื่นใจ', 'ขอพรเรื่องความรักเหรอ ป้าเชียร์นะ!'] },
  siamsi: { name: 'หลวงพี่ต้น', role: 'พระผู้ดูแลเซียมซี', monk: 'monk', lines: ['ตั้งจิตให้นิ่ง ๆ ก่อนเขย่านะโยม', 'ใบไหนออกมาก็เป็นกำลังใจ อย่าเครียดนะ', 'เขย่าเบา ๆ ก็ได้ ไม่ต้องเหมือนเขย่าชานมไข่มุก'] },
  deity: { name: 'พี่แพรว', role: 'ผู้ดูแลศาลเทพ', look: SHRINE_KEEPER, lines: ['ถวายของโปรดท่าน ท่านจะยิ้มเลยนะ', 'ไหว้ขอพรแล้วอย่าลืมทำความดีด้วยนะคะ', 'วันนี้ท่านอารมณ์ดีมาก พี่รู้สึกได้'] },
  lottery: { name: 'ป้าแป้ง', role: 'แผงแป้งเด็กหน้าต้นตะเคียน', look: AUNTIE_POWDER, lines: ['ไหว้ขอขมาแม่ตะเคียนก่อนนะ แล้วค่อยลูบแป้ง', 'เลขเด็ดเลขดัง เพื่อความบันเทิงนะจ๊ะ ห้ามเครียด', 'แป้งหอม ๆ ลูบแล้วมือนิ่มด้วย ได้สองต่อ'] },
  gold_leaf: { name: 'ยายทองคำ', role: 'แผงทองคำเปลว', look: GRANNY_GOLD, lines: ['ปิดให้ทั่ว ๆ นะหลาน อย่าปิดแต่หน้าผาก', 'ปิดทองหลังพระ ทำดีไม่ต้องให้ใครเห็น', 'แผ่นแรกของวันยายให้ฟรี ยายใจดี'] },
  donate: { name: 'ลุงมัคนายก', role: 'ดูแลตู้บำรุงวัด', look: STEWARD, lines: ['ค่าน้ำค่าไฟวัดขึ้นทุกเดือนเลยหลาน สาธุ ๆ', 'หยอดเท่าไหร่ก็ได้บุญ ใจสำคัญที่สุด', 'เหรียญหล่นดังกริ๊ง ๆ ฟังแล้วชื่นใจ'] },
  bells: { name: 'เณรภูมิ', role: 'สามเณรประจำศาลาระฆัง', monk: 'novice', lines: ['ตีตามวงแสงนะพี่ ตรงจังหวะได้คอมโบ!', 'ระฆังเก้าใบ เสียงไม่ซ้ำกันเลยนะ', 'ตีเบา ๆ ก็ดัง ไม่ต้องทุ่มสุดแรง'] },
  circle: { name: 'หลวงตาบุญ', role: 'พระนำเวียนเทียน', monk: 'monk', lines: ['เดินช้า ๆ นะโยม รีบไปเทียนดับนะ', 'ให้พระธาตุอยู่ทางขวามือ เวียนสามรอบ', 'ระลึกถึงพระพุทธ พระธรรม พระสงฆ์ ทีละรอบ'] },
  holy_water: { name: 'หลวงพ่อใส', role: 'พระผู้ทำน้ำมนต์', monk: 'monk', lines: ['ตักพอดี ๆ อย่าให้ล้นโอ่งนะโยม', 'รดแล้วเย็นกายเย็นใจ', 'น้ำมนต์ปลุกเสกเมื่อเช้า สด ๆ เลย'] },
  krathong: { name: 'น้องมะลิ', role: 'ร้านกระทงใบตอง', look: KRATHONG_GIRL, lines: ['กระทงใบตองย่อยสลายได้ ปลาไม่อิ่มแต่โลกยิ้ม!', 'อธิษฐานก่อนลอยนะคะ ขอแฟนก็ได้', 'ซื้อสองใบ ลอยคู่กับคนพิเศษ~'] },
  dog: { name: 'น้องต้นกล้า', role: 'เด็กวัดเพื่อนซี้น้องหมา', look: TEMPLE_KID, lines: ['น้องชอบให้ลูบหัว แต่ไม่ชอบให้จับหางนะ!', 'ไก่ต้มฉีกคือของโปรด น้องกระดิกหางรัว ๆ', 'สนิทครบห้าหัวใจ น้องจะเดินตามพี่เลย'] },
  hall: { name: 'หลวงพี่ต้น', role: 'พระในอุโบสถ', monk: 'monk', lines: ['ถอดรองเท้า นั่งพับเพียบ ทำใจสบาย ๆ นะโยม', 'สวดมนต์วันละนิด จิตแจ่มใส', 'นั่งสมาธิแค่นาทีเดียวก็ได้บุญ'] },
}
