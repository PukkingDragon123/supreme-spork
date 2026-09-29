// Collectible registry (ของสะสม / ของที่ระลึก). Every group file exports a
// `CollectibleGroup`; add new groups (ranks, hub markets, fair, flood…) to
// GROUPS below, or call `registerCollectibleGroup()` at start-up.
//
//   import { COLLECTIBLE_BY_ID } from './data/collectibles'
//   grantCollectible('cl_hippo_plush')      // src/game/collectibles.ts

import type { CollectibleDef, CollectibleGroup, CollectibleSeries, Rarity } from '../collectibleTypes'
import { REGION_GROUP } from './regions'
import { POP_GROUP } from './pop'
import { SEASONAL_GROUP } from './seasonal'
import { RANK_COLLECTIBLES } from './ranks'
import { HUB_COLLECTIBLES, FAIR_PRIZE_COLLECTIBLES } from './hubs'

/** Rare temple-rank souvenirs: quest rewards only, never in shop stock. */
const RANK_GROUP: CollectibleGroup = {
  id: 'ranks',
  items: RANK_COLLECTIBLES.map((c) => ({ ...c, source: 'reward' as const })),
  series: [{ id: 'ทำเนียบแรงก์วัดดัง', blurb: 'ของหายากจากวัดแรงก์ S และ SS', color: '#ffc43a', motif: 'chedi' }],
}

/** Market souvenirs (hub stalls) and temple-fair booth prizes (ticket rewards only). */
const HUB_GROUP: CollectibleGroup = {
  id: 'hubs',
  items: HUB_COLLECTIBLES.map((c) => (c.id === 'hub_passport_gold' ? { ...c, source: 'reward' as const } : c)),
}
const FAIR_GROUP: CollectibleGroup = { id: 'fair', items: FAIR_PRIZE_COLLECTIBLES.map((c) => ({ ...c, source: 'reward' as const })) }

const GROUPS: CollectibleGroup[] = [REGION_GROUP, POP_GROUP, SEASONAL_GROUP, RANK_GROUP, HUB_GROUP, FAIR_GROUP]

export const COLLECTIBLE_GROUPS: CollectibleGroup[] = []
export const COLLECTIBLES: CollectibleDef[] = []
export const COLLECTIBLE_BY_ID: Record<string, CollectibleDef> = {}
export const SERIES_META: Record<string, CollectibleSeries> = {}

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const RARITY_INFO: Record<Rarity, { name: string; color: string; dark: string; stars: number }> = {
  common: { name: 'ธรรมดา', color: '#c8bca8', dark: '#7a6a58', stars: 1 },
  uncommon: { name: 'ไม่ธรรมดา', color: '#7cc55e', dark: '#2f6f3a', stars: 2 },
  rare: { name: 'หายาก', color: '#5aa9f0', dark: '#1f4f8e', stars: 3 },
  epic: { name: 'สุดยอด', color: '#b37cf0', dark: '#5a2a9e', stars: 4 },
  legendary: { name: 'ตำนาน', color: '#ffc43a', dark: '#9a5a10', stars: 5 },
}

/** Add a group of collectibles (idempotent per group id). */
export function registerCollectibleGroup(g: CollectibleGroup) {
  if (COLLECTIBLE_GROUPS.some((x) => x.id === g.id)) return
  COLLECTIBLE_GROUPS.push(g)
  for (const it of g.items) {
    if (COLLECTIBLE_BY_ID[it.id]) continue
    COLLECTIBLES.push(it)
    COLLECTIBLE_BY_ID[it.id] = it
  }
  for (const s of g.series ?? []) SERIES_META[s.id] = { ...SERIES_META[s.id], ...s }
}

for (const g of GROUPS) registerCollectibleGroup(g)

export interface SeriesInfo extends Required<Pick<CollectibleSeries, 'id' | 'color' | 'motif' | 'reward' | 'order'>> {
  blurb: string
  items: CollectibleDef[]
}

/** Every series with its items, in book order. */
export function seriesList(): SeriesInfo[] {
  const by = new Map<string, CollectibleDef[]>()
  for (const c of COLLECTIBLES) {
    const l = by.get(c.series) ?? []
    l.push(c)
    by.set(c.series, l)
  }
  const out: SeriesInfo[] = []
  let i = 0
  for (const [id, items] of by) {
    const m = SERIES_META[id] ?? { id }
    const sorted = [...items].sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || a.value - b.value)
    out.push({
      id,
      blurb: m.blurb ?? '',
      color: m.color ?? '#e0bb8a',
      motif: m.motif ?? sorted[0]?.art.motif ?? 'star',
      reward: m.reward ?? seriesReward(items),
      order: m.order ?? 100 + i,
      items: sorted,
    })
    i++
  }
  return out.sort((a, b) => a.order - b.order)
}

/** Default set-completion prize: about 30% of the set's shop value, rounded. */
export function seriesReward(items: CollectibleDef[]): number {
  const v = items.reduce((a, c) => a + c.value, 0)
  return Math.max(50, Math.round((v * 0.3) / 10) * 10)
}
