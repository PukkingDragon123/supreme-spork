// Prices and deals of the temple fair's booths and rides, shown on the
// vendor's brief card before every round:
//  - the first round of each booth every day is free;
//  - happy hour 20:00–21:00 (your clock): half price;
//  - bundles: 3 rounds for 2.5× and 5 rounds for 4× the round price, paid
//    once up front and kept as prepaid rounds (`hubs.passes[key]`);
//  - the 5th round of a booth in a day gives +3 prize tickets.
// Booth keys: a fair game id ('darts') or 'ride:<id>' ('ride:wheel'), the
// same keys as the daily round counter `hubs.plays`.

import { game, mutate } from '../../game/state'
import { toast } from '../../game/events'
import { dayKey } from '../../game/time'

export const HAPPY_FROM = 20
export const HAPPY_TO = 21
/** The round of the day (per booth) that gives bonus tickets. */
export const BONUS_AT = 5
export const BONUS_TICKETS = 3
export const PASS_MAX = 99

export interface Deal {
  id: string
  rounds: number
  /** Coins paid once. */
  price: number
  /** What the rounds cost one by one. */
  normal: number
  label: string
}

export type PayVia = 'free' | 'pass' | 'happy' | 'full'

export interface Quote {
  cost: number
  via: PayVia
  /** Full price of a round (for "ปกติ …"). */
  normal: number
}

const floor5 = (n: number) => Math.max(5, Math.floor(n / 5) * 5)

export function isHappyHour(now: Date = new Date()): boolean {
  const h = now.getHours()
  return h >= HAPPY_FROM && h < HAPPY_TO
}

/** Round bundles for a booth whose round costs `base` (none for free booths). */
export function dealsFor(key: string, base: number): Deal[] {
  if (base <= 0) return []
  return [
    { id: `${key}:x3`, rounds: 3, price: floor5(base * 2.5), normal: base * 3, label: 'แพ็กเพื่อนซี้' },
    { id: `${key}:x5`, rounds: 5, price: floor5(base * 4), normal: base * 5, label: 'แพ็กคุ้มสุด' },
  ]
}

/** Price of the next round (pure). Order: free first round, prepaid, happy hour, full. */
export function quoteFor(base: number, playsToday: number, passes: number, now: Date = new Date()): Quote {
  if (base <= 0 || playsToday <= 0) return { cost: 0, via: 'free', normal: base }
  if (passes > 0) return { cost: 0, via: 'pass', normal: base }
  if (isHappyHour(now)) return { cost: Math.ceil(base / 2), via: 'happy', normal: base }
  return { cost: base, via: 'full', normal: base }
}

/** Bonus tickets for finishing the payment of round number `playsAfter` today (pure). */
export function bonusFor(playsAfter: number): number {
  return playsAfter === BONUS_AT ? BONUS_TICKETS : 0
}

export function playsOf(key: string, s = game.value): number {
  return s.hubs.plays.day === dayKey() ? (s.hubs.plays.n[key] ?? 0) : 0
}

export function passesOf(key: string, s = game.value): number {
  return s.hubs.passes?.[key] ?? 0
}

export function nextQuote(key: string, base: number, now: Date = new Date()): Quote {
  return quoteFor(base, playsOf(key), passesOf(key), now)
}

export interface Paid {
  ok: boolean
  via: PayVia
  cost: number
  /** Bonus tickets given with this round. */
  bonus: number
}

/** Pay for one round at booth `key` and count it. */
export function payRound(key: string, base: number, now: Date = new Date()): Paid {
  const q = nextQuote(key, base, now)
  if (q.cost > 0 && game.value.coins < q.cost) {
    toast('บุญคอยน์ไม่พอค่าเล่นรอบนี้', 'coin', 'warn')
    return { ok: false, via: q.via, cost: q.cost, bonus: 0 }
  }
  let bonus = 0
  mutate((d) => {
    const day = dayKey()
    if (d.hubs.plays.day !== day) d.hubs.plays = { day, n: {} }
    const n = (d.hubs.plays.n[key] ?? 0) + 1
    d.hubs.plays.n[key] = n
    if (q.cost > 0) d.coins -= q.cost
    if (q.via === 'pass') {
      d.hubs.passes ??= {}
      const left = (d.hubs.passes[key] ?? 0) - 1
      if (left > 0) d.hubs.passes[key] = left
      else delete d.hubs.passes[key]
    }
    bonus = bonusFor(n)
    if (bonus) {
      d.hubs.tickets += bonus
      d.hubs.ticketsTotal += bonus
    }
  })
  if (bonus) toast(`เล่นครบ ${BONUS_AT} รอบวันนี้ แถมตั๋ว +${bonus} ใบ!`, 'gift')
  return { ok: true, via: q.via, cost: q.cost, bonus }
}

/** Buy a round bundle: pay once, keep the rounds for this booth. */
export function buyDeal(key: string, base: number, dealId: string): boolean {
  const deal = dealsFor(key, base).find((x) => x.id === dealId)
  if (!deal) return false
  if (passesOf(key) + deal.rounds > PASS_MAX) {
    toast('มีรอบเหมาเยอะแล้ว เล่นให้หมดก่อนนะ', 'gift', 'warn')
    return false
  }
  if (game.value.coins < deal.price) {
    toast(`บุญคอยน์ไม่พอ ต้องใช้ ${deal.price} เหรียญ`, 'coin', 'warn')
    return false
  }
  mutate((d) => {
    d.coins -= deal.price
    d.hubs.passes ??= {}
    d.hubs.passes[key] = (d.hubs.passes[key] ?? 0) + deal.rounds
  })
  toast(`ซื้อ${deal.label} ${deal.rounds} รอบแล้ว! ประหยัด ${deal.normal - deal.price} คอยน์`, 'coin')
  return true
}
