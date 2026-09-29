// Generic battle pass maths (บัตรผ่าน): points → tiers, and which tiers of
// the free and premium rows can be claimed. Pure functions, event agnostic.

import type { PassDef, PassTier } from './events/types'

export type PassRow = 'free' | 'premium'

export interface PassProgressLike {
  points: number
  premium: boolean
  claimedFree: number[]
  claimedPremium: number[]
}

export function maxTier(pass: PassDef): number {
  return pass.tiers.length
}

/** Highest tier reached with this many points (0 = none yet). */
export function tierForPoints(points: number, pass: PassDef): number {
  return Math.max(0, Math.min(maxTier(pass), Math.floor(Math.max(0, points) / Math.max(1, pass.pointsPerTier))))
}

/** Points needed to reach a tier. */
export function pointsForTier(tier: number, pass: PassDef): number {
  return Math.max(0, tier) * pass.pointsPerTier
}

export interface TierProgress {
  tier: number
  /** Points into the current tier. */
  into: number
  need: number
  /** 0..1 towards the next tier (1 when maxed). */
  pct: number
  maxed: boolean
  /** 0..1 along the whole pass. */
  total: number
}

export function tierProgress(points: number, pass: PassDef): TierProgress {
  const tier = tierForPoints(points, pass)
  const max = maxTier(pass)
  const maxed = tier >= max
  const into = maxed ? pass.pointsPerTier : Math.max(0, points) - pointsForTier(tier, pass)
  return {
    tier,
    into,
    need: pass.pointsPerTier,
    pct: maxed ? 1 : into / pass.pointsPerTier,
    maxed,
    total: Math.min(1, Math.max(0, points) / pointsForTier(max, pass)),
  }
}

export type TierState = 'locked' | 'claimable' | 'claimed' | 'premium_locked'

export function tierState(p: PassProgressLike, pass: PassDef, tier: number, row: PassRow): TierState {
  const claimed = row === 'free' ? p.claimedFree : p.claimedPremium
  if (claimed.includes(tier)) return 'claimed'
  if (tier > tierForPoints(p.points, pass)) return 'locked'
  if (row === 'premium' && !p.premium) return 'premium_locked'
  return 'claimable'
}

export function tierDef(pass: PassDef, tier: number): PassTier | undefined {
  return pass.tiers.find((t) => t.tier === tier)
}

/** Every tier/row pair that can be claimed right now, in tier order. */
export function claimable(p: PassProgressLike, pass: PassDef): { tier: number; row: PassRow }[] {
  const out: { tier: number; row: PassRow }[] = []
  const reached = tierForPoints(p.points, pass)
  for (const t of pass.tiers) {
    if (t.tier > reached) break
    if (t.free.length && tierState(p, pass, t.tier, 'free') === 'claimable') out.push({ tier: t.tier, row: 'free' })
    if (t.premium.length && tierState(p, pass, t.tier, 'premium') === 'claimable') out.push({ tier: t.tier, row: 'premium' })
  }
  return out
}

/** How many tiers the given points added (for "ขึ้นขั้น!" celebrations). */
export function tiersGained(before: number, after: number, pass: PassDef): number {
  return tierForPoints(after, pass) - tierForPoints(before, pass)
}
