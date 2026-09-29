// Event #1: หนีภัยน้ำท่วม – a flooded-village rescue mini-game with daily
// missions and a 30-tier pass (free "ผู้ประสบภัย" / premium "กู้ภัย").

import type { EventReward, LiveEventDef, PassTier } from './types'

const c = (n: number): EventReward => ({ kind: 'coins', n })
const m = (n: number): EventReward => ({ kind: 'merit', n })
const i = (id: string, n: number): EventReward => ({ kind: 'item', id, n })
const t = (n: number): EventReward => ({ kind: 'ticket', n })
const o = (id: string): EventReward => ({ kind: 'outfit', id })
const p = (id: string): EventReward => ({ kind: 'pet', id })

// [free, premium, big?]
const TIERS: [EventReward[], EventReward[], boolean?][] = [
  [[c(60)], [c(200), t(2)]],
  [[i('rice', 5)], [m(150), i('curry', 3)]],
  [[m(60)], [o('head_rescue_helmet')], true],
  [[t(1)], [i('sangkhathan', 1), c(100)]],
  [[o('head_basin')], [m(200), i('fruit', 3)], true],
  [[i('fish_food', 24)], [t(2), c(120)]],
  [[c(80)], [i('gold_leaf', 3), m(150)]],
  [[m(80)], [o('hand_megaphone')], true],
  [[i('dessert', 4)], [c(150), i('chicken', 4)]],
  [[o('neck_whistle')], [m(250), t(1)], true],
  [[c(90)], [i('garland', 4), c(120)]],
  [[i('egg', 4)], [o('top_rescue_jacket')], true],
  [[t(1)], [m(250), i('sangkhathan', 1)]],
  [[m(100)], [c(200), i('dog_food', 5)]],
  [[o('top_swim_vest')], [m(300), t(2)], true],
  [[i('curry', 3)], [o('back_rescue_tube')], true],
  [[c(100)], [i('gold_leaf', 4), c(150)]],
  [[i('banana', 6)], [m(300), i('fruit', 4)]],
  [[m(120)], [c(200), t(1)]],
  [[o('shoes_rain_boots')], [o('shoes_rescue_boots')], true],
  [[c(120)], [m(350), i('sangkhathan', 2)]],
  [[t(1)], [c(250), i('chicken', 5)]],
  [[i('sticky', 6)], [m(350), i('lotus', 6)]],
  [[o('back_swim_ring')], [o('back_paddle')], true],
  [[m(150)], [c(300), t(2)]],
  [[i('water', 6)], [m(400), i('gold_leaf', 5)]],
  [[o('hand_bailer')], [c(300), i('sangkhathan', 2)], true],
  [[c(150)], [o('suit_rescue')], true],
  [[m(200)], [m(500), c(400)]],
  [[p('soggy_cat')], [p('tub_rescue')], true],
]

export const FLOOD_TIERS: PassTier[] = TIERS.map(([free, premium, big], k) => ({ tier: k + 1, free, premium, big: !!big }))

/** Player-facing names for the event cosmetics (used until the wardrobe/pet data ships them). */
export const FLOOD_REWARD_NAMES: Record<string, string> = {
  head_basin: 'หมวกกะละมังกันฝน',
  top_swim_vest: 'เสื้อชูชีพสีส้ม',
  neck_whistle: 'นกหวีดขอความช่วยเหลือ',
  shoes_rain_boots: 'บูทยางลุยน้ำ',
  back_swim_ring: 'ห่วงยางเป็ดน้อย',
  hand_bailer: 'ขันวิดน้ำคู่ใจ',
  soggy_cat: 'แมวเปียกปอน',
  suit_rescue: 'ชุดกู้ภัยเต็มยศ',
  head_rescue_helmet: 'หมวกนิรภัยกู้ภัย',
  top_rescue_jacket: 'เสื้อกั๊กกู้ภัยสะท้อนแสง',
  hand_megaphone: 'โทรโข่งกู้ภัย',
  back_rescue_tube: 'ทุ่นกู้ภัยสีแดง',
  shoes_rescue_boots: 'บูทกู้ภัย',
  back_paddle: 'ไม้พายเรือกู้ภัย',
  tub_rescue: 'ตูบกู้ภัย',
}

export const FLOOD_EVENT: LiveEventDef = {
  id: 'flood',
  name: 'หนีภัยน้ำท่วม',
  tagline: 'น้ำมาแล้ว! ขับเรือกู้ภัยไปช่วยชาวบ้านและน้องสัตว์ขึ้นวัดบนเนิน',
  season: { lengthDays: 21, epoch: '2026-01-05' },
  level: 10,
  ticket: { name: 'ตั๋วออกเรือ', icon: 'ev_ticket', dailyFree: 1, max: 9, coinPrice: 40, coinBuyDaily: 3 },
  pointsName: 'แต้มกู้ภัย',
  missionsPerDay: 4,
  missions: [
    { id: 'fm_rescue12', text: 'ช่วยให้ได้ 12 ชีวิตในรอบเดียว', event: 'flood_rescue', target: 12, mode: 'max', icon: 'ev_ring', tickets: 1, points: 80, always: true },
    { id: 'fm_chant2', text: 'สวดมนต์ให้ผ่าน 2 ด่าน', event: 'chant', target: 2, icon: 'book', tickets: 1, points: 50 },
    { id: 'fm_dish', text: 'ทำอาหารเองแล้วนำไปตักบาตรพระ', event: 'dish_alms', target: 1, icon: 'bowl', tickets: 1, points: 60 },
    { id: 'fm_catfish15', text: 'ป้อนปลาดุกให้ได้ 15 คำ', event: 'catfish_fed', target: 15, icon: 'bread', tickets: 1, points: 50 },
    { id: 'fm_jobs3', text: 'ทำงานอาสาในวัดให้ครบ 3 งาน', event: 'job', target: 3, icon: 'broom', tickets: 1, points: 50 },
    { id: 'fm_cook2', text: 'ทำอาหารให้สำเร็จ 2 จาน', event: 'cook', target: 2, icon: 'pan', tickets: 1, points: 50 },
    { id: 'fm_alms2', text: 'ตักบาตรพระ 2 รอบ', event: 'alms', target: 2, icon: 'bowl', tickets: 1, points: 40 },
    { id: 'fm_dog3', text: 'ให้อาหารน้องหมาวัด 3 ครั้ง', event: 'dog_fed', target: 3, icon: 'dog', tickets: 1, points: 40 },
    { id: 'fm_koi30', text: 'ให้อาหารปลาคาร์ฟ 30 เม็ด', event: 'koi_fed', target: 30, icon: 'koi', tickets: 1, points: 40 },
  ],
  pass: {
    freeName: 'ผู้ประสบภัย',
    premiumName: 'กู้ภัย',
    pointsPerTier: 150,
    tiers: FLOOD_TIERS,
    products: [
      { id: 'boondee.pass.flood', title: 'บัตรผ่านกู้ภัย', priceTHB: 99 },
      { id: 'boondee.pass.flood.plus', title: 'บัตรผ่านกู้ภัยพลัส (+10 ขั้น)', priceTHB: 199, bonusPoints: 1500, badge: 'คุ้มสุด' },
    ],
  },
  rules: [
    'ใช้ตั๋วออกเรือ 1 ใบต่อการออกกู้ภัย 1 รอบ (90 วินาที)',
    'รับตั๋วฟรีวันละ 1 ใบ และรับเพิ่มจากภารกิจประจำวันของอีเวนต์',
    'ลากนิ้วบนจอเพื่อบังคับเรือ จอดนิ่ง ๆ ข้างบ้านให้วงกลมเต็มเพื่อรับคนและสัตว์ขึ้นเรือ',
    'พาทุกคนไปส่งที่วัดบนเนินด้านบน ส่งครบทั้งครอบครัวได้โบนัสพิเศษ',
    'เรือจุได้ 4 ที่นั่ง น้องควายนั่ง 2 ที่ เก็บห่วงยางเพื่อเพิ่มที่นั่ง',
    'ระวังกระแสน้ำเชี่ยวและขยะลอยน้ำ ชนแล้วเรือจะเสียหลัก',
    'แต้มกู้ภัยจากทุกรอบใช้ปลดขั้นบัตรผ่าน ขั้นละ 150 แต้ม รวม 30 ขั้น',
    'บัตรผ่านกู้ภัย (พรีเมียม) ปลดรางวัลแถวล่างทั้งหมด รวมถึงขั้นที่ผ่านมาแล้ว',
    'อีเวนต์หมุนเวียนทุก 21 วัน แต้มและขั้นจะเริ่มใหม่ ของแต่งตัวและสัตว์เลี้ยงที่ได้แล้วอยู่กับเราตลอดไป',
  ],
  icon: 'ev_flood',
  theme: { a: '#2f77a8', b: '#f58f35', ink: '#16324a' },
}
