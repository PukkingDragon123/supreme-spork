// Prayer progression and rewards (the core loop): stage unlocks, stars,
// streaks, merit/coins/material rewards.

import { game, mutate, type GameState } from './state'
import { addCoins, addMerit, track } from './actions'
import { CHAPTERS, STAGES, STAGE_BY_ID, stagesOf, type PrayerStage } from './data/prayers'
import type { AreaId } from './data/areas'
import { MATERIAL_IDS, type MaterialId } from './materials'
import { dayKey } from './time'
import type { ChantResult } from './chantScore'

export const DAILY_PRAYER_GOAL = 3

export function totalStars(s: GameState = game.value): number {
  let n = 0
  for (const st of STAGES) n += s.prayer.stars[st.id] ?? 0
  return n
}

export function chapterStars(ch: AreaId, s: GameState = game.value): { got: number; max: number } {
  const list = stagesOf(ch)
  return { got: list.reduce((a, st) => a + (s.prayer.stars[st.id] ?? 0), 0), max: list.length * 3 }
}

export function chapterUnlocked(ch: AreaId, s: GameState = game.value): boolean {
  const c = CHAPTERS.find((x) => x.id === ch)
  if (!c) return false
  return c.stars <= totalStars(s) || s.areas.includes(ch)
}

export function stageUnlocked(st: PrayerStage, s: GameState = game.value): boolean {
  if (!chapterUnlocked(st.chapter, s)) return false
  if (st.n === 1) return true
  const prev = STAGES.find((x) => x.chapter === st.chapter && x.n === st.n - 1)
  return !prev || (s.prayer.stars[prev.id] ?? 0) >= 1
}

/** The stage the player should do next: first unlocked stage without 3 stars, preferring uncleared ones. */
export function nextStage(s: GameState = game.value): PrayerStage {
  const open = STAGES.filter((st) => stageUnlocked(st, s))
  return open.find((st) => !(s.prayer.stars[st.id] ?? 0)) ?? open.find((st) => (s.prayer.stars[st.id] ?? 0) < 3) ?? open[open.length - 1] ?? STAGES[0]
}

export interface PrayerReward {
  merit: number
  coins: number
  mats: Partial<Record<MaterialId, number>>
  stars: number
  prevStars: number
  best: boolean
  firstClear: boolean
  streak: number
  goalDone: boolean
}

/** Pure reward maths (unit tested): what a finished prayer is worth. */
export function computeReward(st: PrayerStage, r: Pick<ChantResult, 'score' | 'stars'>, prevStars: number, mode: 'voice' | 'tap', seed = 0) {
  const q = 0.4 + (r.score / 100) * 0.8
  const voiceBonus = mode === 'voice' ? 1.25 : 1
  const merit = Math.max(1, Math.round(st.merit * q * voiceBonus))
  let coins = Math.round(st.coins * (0.3 + r.score / 150))
  const newStars = Math.max(0, r.stars - prevStars)
  coins += newStars * 10
  const mats: Partial<Record<MaterialId, number>> = {}
  if (r.stars >= 1) {
    if (prevStars === 0) for (const [k, v] of Object.entries(st.mats)) mats[k as MaterialId] = v
    else {
      // Replays still drop a little something.
      const keys = Object.keys(st.mats) as MaterialId[]
      const pick = keys.length ? keys[Math.abs(seed) % keys.length] : MATERIAL_IDS[Math.abs(seed) % MATERIAL_IDS.length]
      mats[pick] = 1 + (r.stars >= 3 ? 1 : 0)
    }
    if (newStars > 0 && prevStars > 0) mats.gold = (mats.gold ?? 0) + newStars
  }
  return { merit, coins, mats, newStars }
}

/** Apply a finished prayer: stars, best score, streak, merit, coins and materials. */
export function finishPrayer(stageId: string, r: ChantResult, mode: 'voice' | 'tap'): PrayerReward {
  const st = STAGE_BY_ID[stageId]
  const s = game.value
  const prevStars = s.prayer.stars[stageId] ?? 0
  const prevBest = s.prayer.best[stageId] ?? 0
  const seed = s.prayer.plays * 7919 + r.score
  const calc = computeReward(st, r, prevStars, mode, seed)
  const key = dayKey()
  let streak = s.prayer.streak
  let goalDone = false
  mutate((d) => {
    const p = d.prayer
    p.plays++
    p.stars[stageId] = Math.max(prevStars, r.stars)
    p.best[stageId] = Math.max(prevBest, r.score)
    if (p.todayKey !== key) {
      p.todayKey = key
      p.today = 0
    }
    p.today++
    goalDone = p.today === DAILY_PRAYER_GOAL
    if (p.lastDay !== key) {
      const y = new Date()
      y.setDate(y.getDate() - 1)
      p.streak = p.lastDay === dayKey(y) ? p.streak + 1 : 1
      p.lastDay = key
    }
    streak = p.streak
    for (const [k, v] of Object.entries(calc.mats)) d.materials[k as MaterialId] = (d.materials[k as MaterialId] ?? 0) + (v ?? 0)
    // Opening a chapter by stars also opens its area.
    for (const c of CHAPTERS) if (!d.areas.includes(c.id) && c.stars <= totalStars(d)) d.areas.push(c.id)
  })
  const merit = addMerit(calc.merit, { key: `pray:${stageId}`, free: 3, area: st.chapter })
  let coins = addCoins(calc.coins, { boost: true })
  if (goalDone) coins += addCoins(30)
  track('chant')
  return {
    merit,
    coins,
    mats: calc.mats,
    stars: Math.max(prevStars, r.stars),
    prevStars,
    best: r.score > prevBest,
    firstClear: prevStars === 0 && r.stars > 0,
    streak,
    goalDone,
  }
}

export function setPrayerMode(mode: 'voice' | 'tap') {
  mutate((d) => {
    d.prayer.mode = mode
  })
}

export function prayersToday(s: GameState = game.value): number {
  return s.prayer.todayKey === dayKey() ? s.prayer.today : 0
}

export function addMaterials(m: Partial<Record<MaterialId, number>>) {
  mutate((d) => {
    for (const [k, v] of Object.entries(m)) d.materials[k as MaterialId] = Math.max(0, (d.materials[k as MaterialId] ?? 0) + (v ?? 0))
  })
}
