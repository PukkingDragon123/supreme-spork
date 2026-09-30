// Beach rules and rewards: daily full-reward rounds per mini-game, the
// reward of a finished round (merit, coins, shells), shell finds by rarity,
// the snorkel gear check, the photo album and the beach passport.
//
// A round with at least one star uses one of the game's daily full-reward
// rounds (GameState.beach.plays); after they are used up rewards drop to 25%.

import { game, mutate, type GameState } from './state'
import { addCoins, addMerit, track } from './actions'
import { grantCollectibles } from './collectibles'
import { BEACH_GAMES, isBeach, type BeachGameDef, type BeachGameId } from './data/beaches'
import { BEACH_SHELLS } from './data/collectibles/beach'
import type { Rarity } from './data/collectibleTypes'
import type { AvatarLook } from '../art/avatar'
import { dayKey, type Phase } from './time'
import { toStars, type JobStars } from './jobs'

/** Share of the full reward paid per star count. */
export const BEACH_STAR_RATE: readonly number[] = [0, 0.5, 0.75, 1]
/** Share paid once the daily full-reward rounds are used up. */
export const BEACH_CAPPED_RATE = 0.25

// ---------------------------------------------------------------------------
// Daily plays

export function beachPlaysToday(id: BeachGameId, s: GameState = game.value, day = dayKey()): number {
  return s.beach.plays.day === day ? s.beach.plays.n[id] ?? 0 : 0
}

export function beachFullLeft(id: BeachGameId, s: GameState = game.value, day = dayKey()): number {
  return Math.max(0, BEACH_GAMES[id].daily - beachPlaysToday(id, s, day))
}

export interface BeachReward {
  merit: number
  coins: number
  capped: boolean
}

/** Base (pre-multiplier) reward of a round given the counted rounds already played today. Pure. */
export function beachReward(def: BeachGameDef, stars: JobStars, playsBefore: number): BeachReward {
  const capped = playsBefore >= def.daily
  if (stars <= 0) return { merit: def.merit > 0 ? 1 : 0, coins: 0, capped }
  const rate = BEACH_STAR_RATE[stars] * (capped ? BEACH_CAPPED_RATE : 1)
  return {
    merit: def.merit > 0 ? Math.max(1, Math.round(def.merit * rate)) : 0,
    coins: Math.max(capped ? 0 : 1, Math.round(def.coins * rate)),
    capped,
  }
}

// ---------------------------------------------------------------------------
// Shells

/** Relative odds of each rarity for a find (luck shifts weight to the rare end). */
export const SHELL_WEIGHT: Record<Rarity, number> = { common: 60, uncommon: 27, rare: 9, epic: 3, legendary: 0.35 }
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

/** The rarity of one find. `r` returns 0..1; `luck` 0..1 (sparkly shells, reef clams). */
export function rollRarity(r: () => number, luck = 0): Rarity {
  const L = Math.max(0, Math.min(1, luck))
  const w = RARITY_ORDER.map((k, i) => SHELL_WEIGHT[k] * (1 + L * i * 1.6) * (i === 0 ? 1 - L * 0.5 : 1))
  let x = r() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < w.length; i++) {
    x -= w[i]
    if (x < 0) return RARITY_ORDER[i]
  }
  return 'common'
}

/**
 * A shell (collectible id) found on the beach, or at the reef when `reef`
 * (pearls only come from reef clams; beaches never roll a pearl).
 */
export function rollShell(r: () => number, o: { luck?: number; reef?: boolean } = {}): string {
  const pool = BEACH_SHELLS.filter((c) => (o.reef ? true : c.id !== 'bc_pearl'))
  const rar = rollRarity(r, o.luck ?? 0)
  if (o.reef && rar === 'epic') return 'bc_pearl'
  // Walk down to the nearest rarity the pool has.
  for (let i = RARITY_ORDER.indexOf(rar); i >= 0; i--) {
    const list = pool.filter((c) => c.rarity === RARITY_ORDER[i] && c.id !== 'bc_pearl')
    if (list.length) return list[Math.floor(r() * list.length) % list.length].id
  }
  return pool[0].id
}

/** Count a list of found ids into a grant map. */
export function tally(ids: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const id of ids) out[id] = (out[id] ?? 0) + 1
  return out
}

// ---------------------------------------------------------------------------
// Gear, photos, passport

export const SNORKEL_GEAR = ['suit_scuba', 'shoes_flippers'] as const

/** Snorkelling needs the scuba suit or the flippers on. */
export function canSnorkel(look: Pick<AvatarLook, 'suit' | 'shoes'>): boolean {
  return look.suit === 'suit_scuba' || look.shoes === 'shoes_flippers'
}

export type PhotoTime = 'day' | 'sunset' | 'night'

export function photoTime(phase: Phase): PhotoTime {
  return phase === 'golden' ? 'sunset' : phase === 'dusk' || phase === 'night' ? 'night' : 'day'
}

export const PHOTO_TIME_NAME: Record<PhotoTime, string> = { day: 'กลางวัน', sunset: 'พระอาทิตย์ตก', night: 'กลางคืน' }

export function photoKey(beach: string, phase: Phase): string {
  return `${beach}:${photoTime(phase)}`
}

/** Record a photo; a new album shot pays coins (more for the sunset). */
export function takePhoto(beach: string, phase: Phase): { fresh: boolean; coins: number; key: string } {
  const key = photoKey(beach, phase)
  const fresh = !game.value.beach.photos.includes(key)
  let coins = 0
  if (fresh) {
    coins = addCoins(photoTime(phase) === 'sunset' ? 25 : 15, { boost: true })
    mutate((d) => {
      if (!d.beach.photos.includes(key)) d.beach.photos.push(key)
    })
  }
  track('beach_play')
  return { fresh, coins, key }
}

/** Stamp the beach passport on arrival (returns true the first time). */
export function beachArrived(id: string): boolean {
  if (!isBeach(id) || game.value.beach.visited.includes(id)) return false
  mutate((d) => {
    if (!d.beach.visited.includes(id)) d.beach.visited.push(id)
  })
  return true
}

// ---------------------------------------------------------------------------
// Finishing a round

export interface BeachRoundStats {
  /** Raw score for the best-score record. */
  score?: number
  /** Rubbish picked up (cleanup, snorkel). */
  trash?: number
  /** Baby turtles that reached the sea. */
  turtles?: number
  /** A sand chedi was finished. */
  chedi?: boolean
  /** Collectible ids found this round (shells, pearls). */
  finds?: string[]
  /** Reef species spotted. */
  fish?: string[]
  /** A banana-boat ride happened. */
  ride?: boolean
}

export interface BeachRoundResult extends BeachReward {
  finds: Record<string, number>
  best: boolean
  newFish: string[]
  plays: number
}

/** Grant the rewards of a finished round and record it. */
export function finishBeachRound(id: BeachGameId, stars: JobStars, stats: BeachRoundStats = {}): BeachRoundResult {
  const def = BEACH_GAMES[id]
  const st = toStars(stars)
  const day = dayKey()
  const before = beachPlaysToday(id, game.value, day)
  const r = beachReward(def, st, before)
  const merit = r.merit > 0 ? addMerit(r.merit) : 0
  const coins = r.coins > 0 ? addCoins(r.coins, { boost: true }) : 0
  const score = Math.max(0, Math.round(stats.score ?? 0))
  const best = score > (game.value.beach.best[id] ?? 0)
  const newFish = (stats.fish ?? []).filter((f, i, a) => a.indexOf(f) === i && !game.value.beach.fish.includes(f))
  mutate((d) => {
    const b = d.beach
    if (b.plays.day !== day) b.plays = { day, n: {} }
    if (st > 0) b.plays.n[id] = before + 1
    if (best) b.best[id] = score
    if (st > 0 && stats.chedi) b.chedis += 1
    b.turtles += Math.max(0, stats.turtles ?? 0)
    b.trash += Math.max(0, stats.trash ?? 0)
    if (stats.ride) b.rides += 1
    for (const f of newFish) b.fish.push(f)
  })
  const finds = tally(stats.finds ?? [])
  if (Object.keys(finds).length) grantCollectibles(finds, { silent: true })
  if (st > 0 && def.event) track(def.event, def.event === 'sea_turtle' ? Math.max(1, stats.turtles ?? 1) : 1)
  track('beach_play')
  return { merit, coins, capped: r.capped, finds, best, newFish, plays: before + (st > 0 ? 1 : 0) }
}
