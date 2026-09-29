// Live events (อีเวนต์): shared shapes for every limited-time event. An event
// is pure data (see ./flood.ts); the stateful rules live in ../liveEvents.ts
// and the generic pass maths in ../battlepass.ts, so a future event only has
// to add one definition file and a mini-game.

import type { GameEvent } from '../data/quests'

/** Something the player can be given (see ./rewards.ts `grantReward`). */
export type RewardKind = 'outfit' | 'pet' | 'item' | 'coins' | 'merit'

export interface Reward {
  kind: RewardKind
  /** Outfit / pet / item id. */
  id?: string
  /** Amount for items, coins and merit. */
  n?: number
}

/** Pass and mission rewards may also pay event tickets. */
export type EventReward = Reward | { kind: 'ticket'; n: number }

export interface MissionDef {
  id: string
  /** Player-facing Thai text, e.g. "สวดมนต์ให้ผ่าน 2 ด่าน". */
  text: string
  /** Tracked game event that drives progress (via `onTrack`). */
  event: GameEvent
  target: number
  /** 'sum' adds up every tracked amount (default); 'max' keeps the best single amount (e.g. rescues in one run). */
  mode?: 'sum' | 'max'
  /** Pixel icon (src/art/icons.ts or an event icon). */
  icon: string
  tickets: number
  points: number
  /** Minimum player level before it can be rolled. */
  level?: number
  /** Area that must be open (e.g. the river temple for catfish). */
  area?: string
  /** Always part of the daily set. */
  always?: boolean
}

export interface PassTier {
  /** 1-based tier number. */
  tier: number
  free: EventReward[]
  premium: EventReward[]
  /** Highlight tier (bigger card): cosmetics and the finale. */
  big?: boolean
}

export interface PassProduct {
  /** Store product id, e.g. "boondee.pass.flood". */
  id: string
  title: string
  priceTHB: number
  /** Extra event points granted on purchase (skips tiers). */
  bonusPoints?: number
  badge?: string
}

export interface PassDef {
  /** Free row name, e.g. "ผู้ประสบภัย". */
  freeName: string
  /** Premium row name, e.g. "กู้ภัย". */
  premiumName: string
  pointsPerTier: number
  tiers: PassTier[]
  products: PassProduct[]
}

export interface TicketDef {
  name: string
  icon: string
  /** Free tickets that can be claimed each day. */
  dailyFree: number
  /** Tickets can't pile up past this. */
  max: number
  /** Optional coin price of one extra ticket and how many can be bought per day. */
  coinPrice?: number
  coinBuyDaily?: number
}

export interface LiveEventDef {
  id: string
  name: string
  tagline: string
  /** Rolling season: `lengthDays` long windows counted from `epoch` (local YYYY-MM-DD). */
  season: { lengthDays: number; epoch: string }
  /** Minimum player level. */
  level: number
  ticket: TicketDef
  /** Name of the event score, e.g. "แต้มกู้ภัย". */
  pointsName: string
  missions: MissionDef[]
  missionsPerDay: number
  pass: PassDef
  /** How-to and rules (Thai). */
  rules: string[]
  /** Event icon key (src/art/eventIcons.ts) for the HUD badge. */
  icon: string
  /** Theme colours for the hub. */
  theme: { a: string; b: string; ink: string }
}
