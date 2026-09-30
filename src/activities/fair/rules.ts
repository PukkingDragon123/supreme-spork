// Scoring rules of the three temple-fair booths, kept pure (type imports only)
// so they can be unit tested without a canvas.

import type { BalloonKind, CorkPrizeKind } from './art'

// ---------------------------------------------------------------------------
// ปาลูกโป่ง (darts)

/** Score for three stars. */
export const DART_TARGET = 20

/** Points for popping a balloon (`combo` = hits in a row before this one). */
export function balloonPoints(kind: BalloonKind, combo: number): number {
  if (kind === 'steel') return 0
  const base = kind === 'hippo' ? 5 : kind === 'gold' ? 3 : 1
  return base + (combo >= 2 ? 1 : 0)
}

// ---------------------------------------------------------------------------
// โยนห่วง (ring toss)

export const RING_TARGET = 12
/** Depth of each bottle row (0 = front) and its perspective scale. */
export const ROW_DEPTH = [0, 1, 2]
export const ROW_SCALE = [1, 0.8, 0.62]
export const ROW_POINTS = [1, 2, 3]

/** Where a throw lands: swipe (dx right, dy up) → (lateral offset, depth 0..2.6). */
export function ringLanding(dx: number, dy: number): { lx: number; depth: number } {
  const power = Math.max(0, Math.min(1.3, (dy - 14) / 100))
  return { lx: dx * 0.9, depth: power * 2 }
}

/** Does a ring landing at (x, depth) catch a bottle at (bx, row)? */
export function ringCatches(x: number, depth: number, bx: number, row: number): boolean {
  const s = ROW_SCALE[row] ?? 0.6
  const d = ROW_DEPTH[row]
  if (d === undefined) return false
  return Math.abs(depth - d) < 0.3 && Math.abs(x - bx) < 4 * s + 2
}

// ---------------------------------------------------------------------------
// ยิงปืนจุก (cork gun)

export const CORK_TARGET = 14

export const CORK_PRIZES: Record<CorkPrizeKind, { hp: number; pts: number; w: number; h: number }> = {
  can: { hp: 1, pts: 1, w: 8, h: 10 },
  candy: { hp: 1, pts: 2, w: 12, h: 9 },
  doll: { hp: 2, pts: 3, w: 8, h: 16 },
  hippo: { hp: 2, pts: 4, w: 16, h: 11 },
  teddy: { hp: 3, pts: 5, w: 14, h: 24 },
  duck: { hp: 1, pts: 2, w: 12, h: 10 },
}

/** Damage a cork does to a prize hit at `relY` (0 = its top … 1 = its base). */
export function corkDamage(kind: CorkPrizeKind, relY: number): number {
  return kind === 'teddy' && relY < 0.4 ? 2 : 1
}

/** Shots a prize needs when every cork hits at `relY`. */
export function corkShotsNeeded(kind: CorkPrizeKind, relY: number): number {
  return Math.ceil(CORK_PRIZES[kind].hp / corkDamage(kind, relY))
}

// ---------------------------------------------------------------------------
// ตักปลาทอง (goldfish scoop)

export type FishKind = 'orange' | 'black' | 'calico' | 'lion'

export const SCOOP_TARGET = 12
/** Paper scoops (โปย) per round. */
export const SCOOP_PAPERS = 3
/** Scoop radius (px): fish whose centre is inside are lifted. */
export const SCOOP_R = 11
/** Lifting faster than this (px/s) lets the fish slip off. */
export const SCOOP_LIFT_MAX = 110

export const FISH: Record<FishKind, { pts: number; weight: number; speed: number; chance: number; collectible: string; name: string }> = {
  orange: { pts: 1, weight: 1, speed: 26, chance: 0.6, collectible: 'fair_goldfish', name: 'ปลาทองส้ม' },
  black: { pts: 2, weight: 1.2, speed: 16, chance: 0.22, collectible: 'fair_goldfish_black', name: 'ปลาทองตาโปนดำ' },
  calico: { pts: 3, weight: 1.3, speed: 22, chance: 0.13, collectible: 'fair_goldfish_calico', name: 'ปลาทองสามสี' },
  lion: { pts: 5, weight: 1.8, speed: 14, chance: 0.05, collectible: 'fair_goldfish_lion', name: 'ปลาทองหัวสิงห์' },
}

export const FISH_RANK: FishKind[] = ['orange', 'black', 'calico', 'lion']

/** Pick a fish kind for a roll in [0, 1). */
export function fishFor(roll: number): FishKind {
  let acc = 0
  for (const k of FISH_RANK) {
    acc += FISH[k].chance
    if (roll < acc) return k
  }
  return 'orange'
}

/** Paper wear for `dt` seconds in the water while moving at `speed` px/s. */
export function paperWear(dt: number, speed: number): number {
  return dt * (0.16 + Math.min(1.3, Math.max(0, speed) / 110) * 0.85)
}

/** Extra wear of lifting a fish out of the water. */
export function catchWear(kind: FishKind): number {
  return 0.12 * FISH[kind].weight
}

/** Is a fish `dist` px from the scoop centre caught when lifted at `liftSpeed`? */
export function scoopCatches(dist: number, liftSpeed: number, radius = SCOOP_R): boolean {
  return dist <= radius && liftSpeed <= SCOOP_LIFT_MAX
}

/** The fish you take home: the rarest one caught (null if none). */
export function bestFish(caught: FishKind[]): FishKind | null {
  let best = -1
  for (const k of caught) best = Math.max(best, FISH_RANK.indexOf(k))
  return best < 0 ? null : FISH_RANK[best]
}

// ---------------------------------------------------------------------------
// รถบั๊มพ์ (bumper cars)

export const BUMPER_TARGET = 16
/** Closing speed (px/s) needed for a bump to count. */
export const BUMP_MIN = 24

/**
 * Points for bumping a car. `dot` = cos of the angle between the other car's
 * heading and the direction you hit it in (1 = rear-ender, -1 = head-on).
 */
export function bumpPoints(impact: number, dot: number, golden = false): number {
  if (impact < BUMP_MIN) return 0
  const base = golden ? 3 : 1
  return dot > -0.5 ? base * 2 : base
}

// ---------------------------------------------------------------------------
// รำวง (rhythm dance)

export type Side = 'L' | 'R'
export type Grade = 'perfect' | 'good' | 'miss'

export interface Note {
  /** Seconds from the start of the song. */
  t: number
  side: Side
}

export const RAMWONG_BPM = 100
/** Seconds a note takes to travel into the gold ring. */
export const RAMWONG_LEAD = 1.6
export const PERFECT_WIN = 0.075
export const GOOD_WIN = 0.16

/** Tiny deterministic PRNG (mulberry32) so the chart is the same every round. */
function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The note chart: one bar of warm-up, then taps on the drum beats (1 and 3
 * of each bar), with extra off-beats creeping in as the song goes on. Notes
 * swap sides in little runs so it feels like the ramwong hand steps.
 */
export function ramwongChart(seconds: number, bpm = RAMWONG_BPM, seed = 7): Note[] {
  const beat = 60 / bpm
  const r = prng(seed)
  const out: Note[] = []
  const start = beat * 4
  let side: Side = 'L'
  for (let b = 0; start + b * beat < seconds - beat; b++) {
    const t = start + b * beat
    const k = t / seconds
    const inBar = b % 4
    const main = inBar === 0 || inBar === 2
    const extra = !main && r() < 0.15 + k * 0.45
    if (main || extra) {
      if (r() < 0.55) side = side === 'L' ? 'R' : 'L'
      out.push({ t: +t.toFixed(3), side })
    }
    // Late in the song: a quick half-beat pickup now and then.
    if (k > 0.55 && inBar === 3 && r() < 0.35) out.push({ t: +(t + beat / 2).toFixed(3), side: side === 'L' ? 'R' : 'L' })
  }
  return out
}

/** Grade a tap `dt` seconds away from the note (negative = early). */
export function judgeTap(dt: number): Grade {
  const a = Math.abs(dt)
  return a <= PERFECT_WIN ? 'perfect' : a <= GOOD_WIN ? 'good' : 'miss'
}

/** Points for a graded note with the combo before it. */
export function notePoints(g: Grade, combo: number): number {
  if (g === 'miss') return 0
  return (g === 'perfect' ? 2 : 1) + (combo >= 10 ? 1 : 0)
}

/** Score needed for three stars: about 70% of a perfect run. */
export function ramwongTarget(chart: Note[]): number {
  return Math.max(10, Math.round(chart.length * 2 * 0.7))
}

// ---------------------------------------------------------------------------
// ตู้คีบตุ๊กตา (claw machine)

export type ClawResult = 'miss' | 'drop' | 'slip' | 'win'

/** Fails in a row after which the machine takes pity (a strong grip). */
export const CLAW_PITY = 4

export interface ClawRoll {
  /** |claw x − prize x| in px. */
  offset: number
  /** Half the grab width of the prize (px). */
  width: number
  /** 1 = light plush, 1.5 = heavy / slippery. */
  weight: number
  /** Failed tries in a row before this one. */
  fails: number
  gripRoll: number
  slipRoll: number
}

/** Chance that the claw closes on the prize (0 if it misses it entirely). */
export function clawGripChance(offset: number, width: number, fails = 0): number {
  if (offset > width) return 0
  if (fails >= CLAW_PITY) return 1
  return Math.max(0.2, 0.88 - (offset / Math.max(1, width)) * 0.6)
}

export function clawOutcome(r: ClawRoll): ClawResult {
  const chance = clawGripChance(r.offset, r.width, r.fails)
  if (chance <= 0) return 'miss'
  if (r.gripRoll >= chance) return 'drop'
  const slip = r.fails >= CLAW_PITY ? 0 : 0.16 * r.weight
  return r.slipRoll < slip ? 'slip' : 'win'
}

export const CLAW_PRIZES: { id: string; weight: number; chance: number }[] = [
  { id: 'fair_claw_hippo', weight: 1, chance: 0.22 },
  { id: 'fair_claw_cat', weight: 1, chance: 0.2 },
  { id: 'fair_claw_frog', weight: 1, chance: 0.2 },
  { id: 'fair_claw_mango', weight: 1.1, chance: 0.13 },
  { id: 'fair_claw_dino', weight: 1.1, chance: 0.13 },
  { id: 'fair_claw_turtle', weight: 1.4, chance: 0.1 },
  { id: 'fair_claw_golden', weight: 1.6, chance: 0.02 },
]

export function clawPrizeFor(roll: number): string {
  let acc = 0
  for (const p of CLAW_PRIZES) {
    acc += p.chance
    if (roll < acc) return p.id
  }
  return CLAW_PRIZES[0].id
}

// ---------------------------------------------------------------------------
// ลิเก (the likay show): cheer on the hero's sequinned pose.

export type CheerGrade = 'perfect' | 'good' | 'early' | 'late'

/** Grade a cheer tapped at `t` for the pose that lands at `poseT` (seconds). */
export function cheerGrade(t: number, poseT: number): CheerGrade {
  const d = t - poseT
  if (d < -0.35) return 'early'
  if (d > 0.9) return 'late'
  return Math.abs(d) <= 0.3 ? 'perfect' : 'good'
}
