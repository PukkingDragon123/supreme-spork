// Cross-system wiring for the v4 systems that were built side by side:
// quests ↔ stalls, quests → collectibles, ranks → quests, bag → collectibles.
// Imported once at start-up (main.tsx).

import { registerStallChoices } from './stall/StallView'
import { questChoicesFor } from './quest/questUi'
import { setCollectibleGranter } from '../game/npcQuests'
import { grantCollectible } from '../game/collectibles'
import { registerCollectibles } from '../game/inventory'
import { COLLECTIBLE_BY_ID } from '../game/data/collectibles'
import { collectibleUrl } from '../art/collectibles'
import { setRankQuestChecker } from '../game/homeland'
import { openPanel } from './store'

// NPC quest rewards hand collectibles to the collection.
setCollectibleGranter((id, n) => {
  grantCollectible(id, n)
})

// Temple-rank quests count as done once turned in at least once.
setRankQuestChecker((s, id) => (s.npcQuests?.done?.[id] ?? 0) > 0)

// Shop keepers who give quests offer them as a reply inside the stall scene.
registerStallChoices((shop) =>
  questChoicesFor(shop.id)
    .filter((c) => c.kind !== 'locked')
    .map((c) => ({
      label: c.kind === 'turnin' ? `ส่งเควสต์: ${c.detail}` : c.kind === 'deliver' ? c.label : 'มีอะไรให้ช่วยไหม?',
      icon: c.icon,
      tone: 'gold' as const,
      onPick: () => c.onPick(),
    })),
)

// The bag shows collectibles with their real names, rarity and art.
registerCollectibles({
  owned: (s) => s.collection.owned,
  info: (id) => {
    const c = COLLECTIBLE_BY_ID[id]
    return c ? { name: c.name, desc: c.desc, rarity: c.rarity } : null
  },
  icon: (id) => (COLLECTIBLE_BY_ID[id] ? collectibleUrl(id, 2) : null),
  open: () => openPanel('collection'),
})
