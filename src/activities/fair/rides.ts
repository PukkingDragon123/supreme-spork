// Rides and shows of the temple fair that aren't ticket games: the ferris
// wheel, the carousel, the claw machines and the likay show. Price per go
// (the first go of each ride is free every day), round bookkeeping in the
// shared daily counter `hubs.plays` (keys `ride:<id>`), the fair_game event,
// a little merit (the takings go to the temple) and souvenirs.

import { game, mutate } from '../../game/state'
import { addMerit, track } from '../../game/actions'
import { grantCollectible, ownedCount } from '../../game/collectibles'
import { toast } from '../../game/events'
import { dayKey } from '../../game/time'

export type RideId = 'wheel' | 'carousel' | 'claw' | 'likay'

export interface RideDef {
  id: RideId
  name: string
  icon: string
  /** Coins per go after the free one (0 = always free). */
  price: number
  blurb: string
  steps: string[]
  /** Shown to other real players under your name. */
  doing: string
}

export const RIDES: Record<RideId, RideDef> = {
  wheel: {
    id: 'wheel',
    name: 'ชิงช้าสวรรค์',
    icon: 'sparkle',
    price: 20,
    blurb: 'นั่งกระเช้าขึ้นไปดูวิวงานวัดทั้งงาน ถึงยอดเมื่อไหร่พลุขึ้นพอดี!',
    steps: ['นั่งเฉย ๆ ชมวิวได้เลย กระเช้าจะหมุนขึ้นไปเอง', 'แตะท้องฟ้าเพื่อจุดพลุ แตะกระเช้าเพื่อโบกมือ', 'กด “ถ่ายรูป” ตอนอยู่บนยอด ได้รูปเก็บไว้เป็นที่ระลึก'],
    doing: 'กำลังนั่งชิงช้าสวรรค์',
  },
  carousel: {
    id: 'carousel',
    name: 'ม้าหมุน',
    icon: 'star',
    price: 15,
    blurb: 'ขี่ม้าหมุนวนไปตามเสียงเพลง ม้าขึ้นลงเด้งดึ๋ง',
    steps: ['ม้าจะหมุนและขึ้นลงเอง ชมไฟงานวัดไปเลย', 'แขนแจกห่วงจะยื่นมาเป็นระยะ แตะตอนห่วงอยู่ในวงเพื่อคว้า', 'ห่วงทองมีรอบละไม่กี่วง คว้าได้เก็บเป็นของสะสม!'],
    doing: 'กำลังขี่ม้าหมุน',
  },
  claw: {
    id: 'claw',
    name: 'ตู้คีบตุ๊กตา',
    icon: 'gift',
    price: 10,
    blurb: 'หยอดเหรียญหนึ่งครั้ง คีบได้หนึ่งที ตุ๊กตาที่คีบได้เก็บเป็นของสะสม',
    steps: ['กดปุ่มซ้ายขวาค้างไว้ (หรือลากในตู้) เพื่อเลื่อนก้ามคีบ', 'กด “คีบ!” ให้ก้ามลงไปตรงตุ๊กตา ยิ่งตรงกลางยิ่งติดแน่น', 'พลาดติดกันหลายที ตู้จะใจดีขึ้น (จริงนะ)'],
    doing: 'กำลังคีบตุ๊กตา',
  },
  likay: {
    id: 'likay',
    name: 'ลิเกดาวเลื่อม',
    icon: 'mic',
    price: 0,
    blurb: 'นั่งดูลิเกเรื่อง “เจ้าชายนกยูงทอง” ฟรี! เชียร์ได้ตลอดเรื่อง',
    steps: ['แตะที่ไหนก็ได้เพื่อเชียร์ (กรี๊ด!) ยิ่งเชียร์คนดูยิ่งคึก', 'ตอนพระเอกเก๊กท่า กด “เชียร์!” ให้ตรงจังหวะ', 'เชียร์ตรงเป๊ะ พระเอกจะคล้องมาลัยแบงก์คืนให้!'],
    doing: 'กำลังดูลิเก',
  },
}

export const RIDE_IDS = Object.keys(RIDES) as RideId[]

const key = (id: RideId) => `ride:${id}`

export function ridePlaysToday(id: RideId, s = game.value): number {
  return s.hubs.plays.day === dayKey() ? (s.hubs.plays.n[key(id)] ?? 0) : 0
}

/** Price of the next go when `plays` goes were had today (pure). */
export function rideCostFor(def: Pick<RideDef, 'price'>, plays: number): number {
  return def.price <= 0 || plays <= 0 ? 0 : def.price
}

export function rideCost(id: RideId): number {
  return rideCostFor(RIDES[id], ridePlaysToday(id))
}

/** Pay for a go (the first each day is free). False if you can't afford it. */
export function startRide(id: RideId): boolean {
  const cost = rideCost(id)
  if (cost > 0 && game.value.coins < cost) {
    toast('บุญคอยน์ไม่พอค่าตั๋วรอบนี้', 'coin', 'warn')
    return false
  }
  mutate((d) => {
    const day = dayKey()
    if (d.hubs.plays.day !== day) d.hubs.plays = { day, n: {} }
    d.hubs.plays.n[key(id)] = (d.hubs.plays.n[key(id)] ?? 0) + 1
    if (cost > 0) d.coins -= cost
  })
  return true
}

export interface RideResult {
  merit: number
  /** Collectible granted this go (null if none / already owned when once-only). */
  got: string | null
}

/**
 * Book a finished go: the fair_game event, a little merit and the souvenir.
 * `once` souvenirs (a photo, the golden ring…) are only given the first time.
 */
export function finishRide(id: RideId, prize: { id: string; once?: boolean } | null = null): RideResult {
  track('fair_game')
  const merit = addMerit(1, { key: 'fair:ride', free: 8 })
  let got: string | null = null
  if (prize && !(prize.once && ownedCount(prize.id) > 0)) {
    if (grantCollectible(prize.id, 1, { silent: true })) got = prize.id
  }
  void id
  return { merit, got }
}
