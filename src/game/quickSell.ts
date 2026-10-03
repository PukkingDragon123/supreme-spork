// Sell things from the bag straight back to the game for coins (the bag's
// item popup). Pays a fraction of the market's reference value, so the
// player-to-player market (game/market.ts) stays the better deal.

import { game, mutate, type GameState } from './state'
import { addCoins } from './actions'
import { baseValue, owned, type TradeKind } from './market'

/** Share of the market value the game pays. */
export const SELL_RATE = 0.4

/** Coins the game pays for one unit (at least 1). */
export function sellPrice(kind: TradeKind, id: string): number {
  return Math.max(1, Math.floor(baseValue(kind, id) * SELL_RATE))
}

/** How many of this the player can sell. */
export function sellable(kind: TradeKind, id: string, s: GameState = game.value): number {
  if (kind === 'outfit' || kind === 'collectible') return 0
  return owned(kind, id, s)
}

/** Sell `qty` units to the game. Returns the coins paid (0 when nothing was sold). */
export function sellToGame(kind: TradeKind, id: string, qty: number): number {
  const n = Math.min(Math.floor(qty), sellable(kind, id))
  if (n < 1) return 0
  mutate((d) => {
    if (kind === 'mat') {
      const m = d.materials as unknown as Record<string, number>
      m[id] = (m[id] ?? 0) - n
    } else if (kind === 'item') {
      d.inventory[id] = (d.inventory[id] ?? 0) - n
      if (d.inventory[id] <= 0) delete d.inventory[id]
    } else if (kind === 'furniture') {
      d.house.storage[id] = (d.house.storage[id] ?? 0) - n
      if (d.house.storage[id] <= 0) delete d.house.storage[id]
    }
  })
  return addCoins(sellPrice(kind, id) * n)
}
