// Progression maths: levels, titles and reward multipliers. Pure functions so
// they can be unit tested without a browser.

export const MAX_LEVEL = 50

/** Merit needed to go from `level` to `level + 1`. */
export function expToNext(level: number): number {
  const l = Math.max(1, level) - 1
  return Math.round(40 + 30 * l + 6 * l * l)
}

/** Resolve total lifetime merit into a level and progress within it. */
export function levelFromMerit(total: number): { level: number; into: number; need: number } {
  let level = 1
  let rest = Math.max(0, Math.floor(total))
  while (level < MAX_LEVEL && rest >= expToNext(level)) {
    rest -= expToNext(level)
    level++
  }
  return { level, into: rest, need: level >= MAX_LEVEL ? 0 : expToNext(level) }
}

export function meritForLevel(level: number): number {
  let sum = 0
  for (let l = 1; l < level; l++) sum += expToNext(l)
  return sum
}

export const TITLES: { from: number; name: string }[] = [
  { from: 1, name: 'สายบุญฝึกหัด' },
  { from: 3, name: 'สายบุญตัวน้อย' },
  { from: 6, name: 'ขาประจำวัด' },
  { from: 10, name: 'ผู้ใจบุญ' },
  { from: 15, name: 'สายบุญตัวจริง' },
  { from: 20, name: 'ผู้มีบุญญาบารมี' },
  { from: 30, name: 'บุญญาธิการ' },
  { from: 40, name: 'มหาบุญดี' },
]

export function titleFor(level: number): string {
  let t = TITLES[0].name
  for (const e of TITLES) if (level >= e.from) t = e.name
  return t
}

/** Coins granted when reaching a level. */
export function levelUpCoins(level: number): number {
  return 20 + level * 5
}

/**
 * Diminishing returns for repeating the same activity in one day: the first
 * `free` repeats are worth full merit, then it tapers to a floor of 20%.
 */
export function repeatFactor(timesToday: number, free: number): number {
  if (timesToday < free) return 1
  const extra = timesToday - free + 1
  return Math.max(0.2, 1 / (1 + extra * 0.6))
}

export interface MeritContext {
  buffMult: number
  luckyColor: boolean
  morningAlms: boolean
  areaBonus: number
  repeat: number
}

export function applyMerit(base: number, ctx: MeritContext): number {
  let m = base * ctx.buffMult * ctx.areaBonus * ctx.repeat
  if (ctx.luckyColor) m *= 1.1
  if (ctx.morningAlms) m *= 2
  return Math.max(base > 0 ? 1 : 0, Math.round(m))
}

/** Daily login reward for a streak day (1-based, repeats every 7 days). */
export function loginReward(streakDay: number): { coins: number; item?: string; qty?: number } {
  const d = ((Math.max(1, streakDay) - 1) % 7) + 1
  const table = [
    { coins: 10 },
    { coins: 15, item: 'rice', qty: 2 },
    { coins: 20 },
    { coins: 25, item: 'garland', qty: 1 },
    { coins: 30 },
    { coins: 40, item: 'gold_leaf', qty: 1 },
    { coins: 80, item: 'sangkhathan', qty: 1 },
  ]
  return table[d - 1]
}
