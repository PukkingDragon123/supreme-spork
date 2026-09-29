// Registry of live events. Add a new event by writing its definition and
// listing it here; the hub, HUD badge, missions and pass pick it up.
// (Import this file directly: "../game/events" would resolve to the
// notification bus in src/game/events.ts.)

import type { LiveEventDef } from './types'
import { FLOOD_EVENT, FLOOD_REWARD_NAMES } from './flood'

export const LIVE_EVENTS: LiveEventDef[] = [FLOOD_EVENT]

export const LIVE_EVENT_BY_ID: Record<string, LiveEventDef> = Object.fromEntries(LIVE_EVENTS.map((e) => [e.id, e]))

/** Fallback display names for reward ids owned by other systems (outfits, pets). */
export const EVENT_REWARD_NAMES: Record<string, string> = { ...FLOOD_REWARD_NAMES }

export type { LiveEventDef, MissionDef, PassDef, PassTier, Reward, EventReward, RewardKind } from './types'
