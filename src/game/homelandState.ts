// Saved state of the home-province + temple-rank system (GameState.homeland).
// Kept free of runtime imports from state.ts so state.ts can import it.

import { PROVINCE_BY_ID } from './data/provinces'
import { RANK_BY_PLACE, TEMPLE_ACTIONS } from './data/ranks'

export interface HomelandState {
  /** Home province id (data/provinces.ts), null until chosen. */
  province: string | null
  /** Province changes after the first pick (the first one is free). */
  moves: number
  /** Kinds of merit made at each ranked temple (place id → event names). */
  temples: Record<string, string[]>
  /** Ranked temples whose completion reward was claimed. */
  claimed: string[]
}

export function defaultHomeland(): HomelandState {
  return { province: null, moves: 0, temples: {}, claimed: [] }
}

const ACTIONS = new Set<string>(TEMPLE_ACTIONS)

/** Repair a loaded homeland block (older saves have none). */
export function normalizeHomeland(raw: unknown): HomelandState {
  const out = defaultHomeland()
  if (!raw || typeof raw !== 'object') return out
  const r = raw as Partial<HomelandState>
  if (typeof r.province === 'string' && PROVINCE_BY_ID[r.province]) out.province = r.province
  if (typeof r.moves === 'number' && r.moves > 0) out.moves = Math.floor(r.moves)
  if (r.temples && typeof r.temples === 'object') {
    for (const [id, list] of Object.entries(r.temples)) {
      if (!RANK_BY_PLACE[id] || !Array.isArray(list)) continue
      const kinds = [...new Set(list.filter((k) => typeof k === 'string' && ACTIONS.has(k)))]
      if (kinds.length) out.temples[id] = kinds
    }
  }
  if (Array.isArray(r.claimed)) out.claimed = [...new Set(r.claimed.filter((id) => typeof id === 'string' && RANK_BY_PLACE[id]))]
  return out
}
