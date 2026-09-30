// What the temple fair's `fair:*` hotspots offer (called from
// src/ui/hotspots.ts). The first action runs when you walk up to it.
//   fair:<game>        darts · rings · cork · scoop · bumper · ramwong (ticket games)
//   fair:prizes        the prize booth
//   fair:<ride>        wheel · carousel · claw · likay
//   fair:eat:<shopId>  a food cart (eat right here, or browse the stall)

import type { HotspotAction } from '../../ui/hotspots'
import { openActivity, openPlaceShop } from '../../ui/store'
import { questChoicesFor } from '../../ui/quest/questUi'
import { FAIR_GAMES } from '../../game/hubs'
import { RIDES, type RideId } from './rides'

const RIDE_LABEL: Record<RideId, string> = {
  wheel: 'ขึ้นชิงช้าสวรรค์',
  carousel: 'ขี่ม้าหมุน',
  claw: 'เล่นตู้คีบ',
  likay: 'นั่งดูลิเก',
}

/** Every fair hotspot suffix the activity knows (dev checks use it). */
export function isFairHotspot(what: string): boolean {
  return what === 'prizes' || what in FAIR_GAMES || what in RIDES || what.startsWith('eat:')
}

export function fairHotspotActions(what: string): HotspotAction[] {
  if (what === 'prizes') return [{ label: 'แลกของรางวัล', icon: 'gift', run: () => openActivity('fair', { booth: 'prizes' }) }]
  if (what.startsWith('eat:')) {
    const shop = what.slice(4)
    return [
      { label: 'ซื้อกินเลย', icon: 'bowl', run: () => openActivity('fair', { eat: shop }) },
      { label: 'ดูร้าน', icon: 'shop', tone: 'paper', run: () => openPlaceShop(shop) },
      ...questChoicesFor(shop).map((c) => ({ label: c.label, icon: c.icon, tone: 'gold', run: c.onPick })),
    ]
  }
  if (what in RIDES) {
    const r = RIDES[what as RideId]
    return [{ label: RIDE_LABEL[r.id], icon: r.icon, run: () => openActivity('fair', { ride: r.id }) }]
  }
  if (what in FAIR_GAMES) {
    const booth = what === 'darts' || what === 'rings' || what === 'cork' || what === 'scoop'
    return [
      { label: booth ? 'เล่นเกม' : `เล่น${FAIR_GAMES[what as keyof typeof FAIR_GAMES].name}`, icon: 'play', run: () => openActivity('fair', { game: what }) },
      { label: 'ซุ้มแลกรางวัล', icon: 'gift', tone: 'paper', run: () => openActivity('fair', { booth: 'prizes' }) },
    ]
  }
  return []
}
