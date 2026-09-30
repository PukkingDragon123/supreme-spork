// Pure rules of the beach mini-games (no canvas, no state) so they can be
// unit tested: stacking the sand chedi, the chedi's quality score, shell
// points and which finds go home in the bucket, turtle and banana-boat
// scoring, and the snorkel fish list.

import type { Rarity } from '../../game/data/collectibleTypes'

// ---------------------------------------------------------------------------
// ก่อเจดีย์ทราย

/** Tier widths of the sand chedi, base first (the spire is added on top). */
export const CHEDI_TIERS = [36, 30, 24, 18, 12]

export interface Tier {
  /** Centre x. */
  x: number
  w: number
}

/**
 * Drop a tier (centred at `x`, width `w`) onto the previous one: the part
 * hanging over the edge crumbles away. Returns the tier that stays and how
 * much sand was lost. A tier that misses completely keeps a 2 px stub.
 */
export function stackTier(prev: Tier, x: number, w: number): { tier: Tier; lost: number; ratio: number } {
  const l = Math.max(prev.x - prev.w / 2, x - w / 2)
  const r = Math.min(prev.x + prev.w / 2, x + w / 2)
  const kept = Math.max(2, r - l)
  const cx = r - l > 0 ? (l + r) / 2 : prev.x
  const tw = Math.min(w, kept)
  return { tier: { x: cx, w: tw }, lost: Math.max(0, w - tw), ratio: Math.max(0, Math.min(1, (r - l) / w)) }
}

/** Quality 0..1 from how well the tiers lined up, how smooth it is and how many decorations it got. */
export function chediScore(ratios: number[], smooth: number, decor: number, decorGoal = 6): number {
  const stack = ratios.length ? ratios.reduce((a, b) => a + b, 0) / CHEDI_TIERS.length : 0
  const d = Math.min(1, decor / decorGoal)
  return Math.max(0, Math.min(1, stack * 0.5 + Math.max(0, Math.min(1, smooth)) * 0.2 + d * 0.3))
}

// ---------------------------------------------------------------------------
// เก็บเปลือกหอย

export const SHELL_POINTS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 5, legendary: 8 }
export const SHELL_TARGET = 16
/** How many finds go home in the bucket (the rest go back to the sea). */
export const SHELLS_KEPT = 3

const ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

/** The best `n` finds by rarity (ties keep the earlier find). */
export function keepBest<T extends { rarity: Rarity }>(finds: T[], n = SHELLS_KEPT): T[] {
  return finds
    .map((f, i) => ({ f, i }))
    .sort((a, b) => ORDER.indexOf(b.f.rarity) - ORDER.indexOf(a.f.rarity) || a.i - b.i)
    .slice(0, n)
    .map((x) => x.f)
}

// ---------------------------------------------------------------------------
// ปล่อยเต่าทะเล

export const TURTLES = 12
export const TURTLE_THRESHOLDS: [number, number, number] = [4 / TURTLES, 8 / TURTLES, 11 / TURTLES]

/** Nudge a crawling hatchling toward the sea: returns the new heading (radians, -π/2 = straight up). */
export function steerTurtle(heading: number, boost: number): number {
  const up = -Math.PI / 2
  return heading + (up - heading) * Math.max(0, Math.min(1, boost))
}

// ---------------------------------------------------------------------------
// บานาน่าโบ๊ต

export const BANANA_TARGET = 16

/**
 * Points for a wave hitting the boat: +2 holding on through a big wave, +1
 * through a small one, and a wobble (-1) when caught letting go on a big one.
 */
export function wavePoints(big: boolean, holding: boolean): { pts: number; wobble: boolean } {
  if (holding) return { pts: big ? 2 : 1, wobble: false }
  return big ? { pts: -1, wobble: true } : { pts: 0, wobble: false }
}

/** Bonus for cheering (arms up) through a calm stretch of at least `min` seconds. */
export function calmBonus(calm: number, min = 1.2): number {
  return calm >= min ? 1 : 0
}

// ---------------------------------------------------------------------------
// ดำน้ำดูปะการัง

export interface FishDef {
  id: string
  name: string
  /** Relative depth band 0 (surface) .. 1 (reef floor). */
  depth: number
  rare?: boolean
}

export const REEF_FISH: FishDef[] = [
  { id: 'clown', name: 'ปลาการ์ตูนส้มขาว', depth: 0.82 },
  { id: 'sergeant', name: 'ปลาสลิดหินบั้งเหลือง', depth: 0.4 },
  { id: 'parrot', name: 'ปลานกแก้ว', depth: 0.62 },
  { id: 'butterfly', name: 'ปลาผีเสื้อ', depth: 0.55 },
  { id: 'idol', name: 'ปลาโนรีครีบยาว', depth: 0.45 },
  { id: 'tang', name: 'ปลาขี้ตังเบ็ดฟ้า', depth: 0.35 },
  { id: 'turtle', name: 'เต่ากระ', depth: 0.3, rare: true },
  { id: 'moray', name: 'ปลาไหลมอเรย์', depth: 0.9, rare: true },
  { id: 'shark', name: 'ฉลามครีบดำ (ตัวเล็ก ใจดี)', depth: 0.25, rare: true },
]
export const FISH_GOAL = 6
export const FISH_BY_ID: Record<string, FishDef> = Object.fromEntries(REEF_FISH.map((f) => [f.id, f]))

/** Seconds of being close that count as "spotted" (rare fish are shy: longer). */
export function spotTime(f: FishDef): number {
  return f.rare ? 0.9 : 0.5
}
