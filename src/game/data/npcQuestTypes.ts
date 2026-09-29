// Shared schema for NPC-given quests (quest givers on maps, shop keepers,
// hub-market characters, temple-rank quests). Any data file may export
// `NpcQuestDef[]`; the NPC quest engine (src/game/npcQuests.ts) collects
// them from src/game/data/npcQuests/index.ts.

import type { GameEvent } from './quests'

export interface NpcQuestStep {
  /** Tracked game event that advances this step (see `track()`). */
  event: GameEvent
  target: number
  /** Short Thai instruction shown in the quest log, e.g. 'ให้อาหารปลาดุก 10 ครั้ง'. */
  text: string
  /** Optional: only counts while the player is on this map id. */
  map?: string
}

export interface NpcQuestReward {
  coins: number
  merit?: number
  items?: Record<string, number>
  /** Collectible / souvenir ids (see src/game/data/collectibles.ts). */
  collectibles?: Record<string, number>
  outfits?: string[]
  pets?: string[]
}

export interface NpcQuestDef {
  id: string
  /**
   * Who gives it. Either a shop keeper (`shop:<placeShopId>`) or a free-standing
   * quest NPC (`npc:<id>`), matching the hotspot id on the map.
   */
  giver: string
  /** Map id where the giver stands. */
  map: string
  /** NPC display name, e.g. 'ป้าแต๋ว'. */
  npcName: string
  title: string
  /** What the NPC says when offering the quest (speech bubbles, in order). */
  intro: string[]
  /** Player reply options shown under the bubble; the first one accepts. */
  replies?: { accept: string; decline?: string }
  steps: NpcQuestStep[]
  reward: NpcQuestReward
  /** NPC line when the quest is turned in. */
  done: string
  level?: number
  /** Quest ids that must be completed first (quest chains). */
  requires?: string[]
  repeat?: 'once' | 'daily'
  /** Difficulty stars 1-3 for the UI. */
  stars?: 1 | 2 | 3
}
