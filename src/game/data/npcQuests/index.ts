// Registry of every NPC quest group. Each group file exports
// `QUESTS: NpcQuestDef[]` (schema: ../npcQuestTypes.ts). To add a group,
// import it here and spread it into GROUPS; ids must be unique.

import type { NpcQuestDef } from '../npcQuestTypes'
import { QUESTS as HOME } from './home'
import { QUESTS as BANGKOK } from './bangkok'
import { QUESTS as CENTRAL } from './central'
import { QUESTS as NORTH } from './north'
import { QUESTS as SOUTH } from './south'

const GROUPS: NpcQuestDef[][] = [HOME, BANGKOK, CENTRAL, NORTH, SOUTH]

export const NPC_QUESTS: NpcQuestDef[] = GROUPS.flat()

export const NPC_QUEST_BY_ID: Record<string, NpcQuestDef> = Object.fromEntries(NPC_QUESTS.map((q) => [q.id, q]))

/** Late registration (e.g. a system that builds quests at runtime). Duplicate ids are ignored. */
export function registerNpcQuests(list: NpcQuestDef[]) {
  for (const q of list) {
    if (NPC_QUEST_BY_ID[q.id]) continue
    NPC_QUESTS.push(q)
    NPC_QUEST_BY_ID[q.id] = q
  }
}
