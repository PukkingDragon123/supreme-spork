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
  /** Optional: only counts while the player is on this map id (interiors `<map>:<room>` count too). */
  map?: string
  /** Optional: for `npc_talk`, only talking to this quest NPC counts (hotspot id `npc:<id>` or `shop:<id>`). */
  npc?: string
  /** Optional: hotspot id the quest log's "นำทาง" walks to (else guessed from the event). */
  nav?: string
  /** Optional: what the `npc` says when you reach them for this step (deliveries). */
  say?: string
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
  /** Optional backstory for the "เล่าให้ฟังหน่อย" reply (speech bubbles). */
  lore?: string[]
  /** Optional NPC line right after accepting. */
  accepted?: string
  /** Optional reminder while the quest is in progress. */
  waiting?: string
  level?: number
  /** Quest ids that must be completed first (quest chains). */
  requires?: string[]
  repeat?: 'once' | 'daily'
  /** Difficulty stars 1-3 for the UI. */
  stars?: 1 | 2 | 3
}
