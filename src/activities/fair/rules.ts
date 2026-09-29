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
