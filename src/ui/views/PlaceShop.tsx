// A location shop as a first-person stall: the shopkeeper faces you behind
// the counter, the goods sit on shelves, hooks and trays, and you chat or
// tap a product to buy it (snacks with timed blessings, place-only outfits,
// 7-บุญ groceries and today's collectibles). See src/ui/stall/.
//
// Other systems can inject reply choices with the `extraChoices` prop or
// globally with `registerStallChoices()` from src/ui/stall/StallView.

import { shopFor } from '../../game/data/placeShops'
import { openPanel, placeShopId } from '../store'
import { StallView, type StallChoice } from '../stall/StallView'

export type { StallChoice, StallApi } from '../stall/StallView'
export { registerStallChoices } from '../stall/StallView'

function devShopId(): string | null {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(location.search).get('shop')
}

export function PlaceShopWindow({ extraChoices, onClose }: { extraChoices?: StallChoice[]; onClose?: () => void } = {}) {
  const id = placeShopId.value ?? devShopId() ?? 'mart'
  const shop = shopFor(id)
  return <StallView key={shop.id} shop={shop} extraChoices={extraChoices} onClose={onClose ?? (() => openPanel(null))} />
}
