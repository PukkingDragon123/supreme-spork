// Reward adapter for events and passes. Cosmetics and pets may be defined by
// other systems (wardrobe, pets); they are granted by id so an event can
// ship before (or without) their art.

import { mutate, game } from '../state'
import { addCoins, grantMeritRaw } from '../actions'
import { ITEM_BY_ID } from '../data/items'
import { OUTFIT_BY_ID } from '../data/outfits'
import { PET_BY_ID } from '../data/pets'
import { EVENT_REWARD_NAMES } from './registry'
import type { EventReward, Reward } from './types'

/** Coins paid instead when a cosmetic or pet is already owned. */
export const DUPE_COINS = 80

export interface GrantResult {
  ok: boolean
  /** Short Thai label of what was given, e.g. "บุญคอยน์ +60". */
  label: string
  /** Already owned: converted to coins. */
  dupe?: boolean
}

export function rewardName(r: EventReward): string {
  switch (r.kind) {
    case 'coins':
      return 'บุญคอยน์'
    case 'merit':
      return 'บุญ'
    case 'ticket':
      return 'ตั๋วออกเรือ'
    case 'item':
      return ITEM_BY_ID[r.id ?? '']?.name ?? EVENT_REWARD_NAMES[r.id ?? ''] ?? 'ของรางวัล'
    case 'outfit':
      return OUTFIT_BY_ID[r.id ?? '']?.name ?? EVENT_REWARD_NAMES[r.id ?? ''] ?? 'ชุดพิเศษ'
    case 'pet':
      return PET_BY_ID[r.id ?? '']?.name ?? EVENT_REWARD_NAMES[r.id ?? ''] ?? 'สัตว์เลี้ยง'
  }
}

/** "บุญคอยน์ +60", "ข้าวสวยร้อน ๆ x5", "หมวกกะละมังกันฝน". */
export function rewardLabel(r: EventReward): string {
  const name = rewardName(r)
  if (r.kind === 'coins' || r.kind === 'merit') return `${name} +${r.n ?? 0}`
  if (r.kind === 'ticket' || r.kind === 'item') return `${name} x${r.n ?? 1}`
  return name
}

export function ownsReward(r: EventReward, s = game.value): boolean {
  if (r.kind === 'outfit') return !!r.id && s.outfits.includes(r.id)
  if (r.kind === 'pet') return !!r.id && s.pets.includes(r.id)
  return false
}

/**
 * Give one reward to the player.
 *  - outfit: added to the owned outfits list
 *  - pet: added to owned pets (not auto-equipped)
 *  - item: inventory += n
 *  - coins / merit: plain amounts (merit can level you up)
 * Owned cosmetics/pets turn into DUPE_COINS coins.
 */
export function grantReward(r: Reward): GrantResult {
  const n = Math.max(0, Math.round(r.n ?? 1))
  switch (r.kind) {
    case 'coins':
      addCoins(n)
      return { ok: n > 0, label: rewardLabel(r) }
    case 'merit':
      grantMeritRaw(n)
      return { ok: n > 0, label: rewardLabel(r) }
    case 'item': {
      if (!r.id || n <= 0) return { ok: false, label: '' }
      const id = r.id
      mutate((d) => {
        d.inventory[id] = (d.inventory[id] ?? 0) + n
      })
      return { ok: true, label: rewardLabel(r) }
    }
    case 'outfit':
    case 'pet': {
      if (!r.id) return { ok: false, label: '' }
      if (ownsReward(r)) {
        addCoins(DUPE_COINS)
        return { ok: true, dupe: true, label: `${rewardName(r)} (มีแล้ว แลกเป็น ${DUPE_COINS} คอยน์)` }
      }
      const id = r.id
      mutate((d) => {
        if (r.kind === 'outfit') d.outfits.push(id)
        else d.pets.push(id)
      })
      return { ok: true, label: rewardLabel(r) }
    }
  }
  return { ok: false, label: '' }
}
