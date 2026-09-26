// UI navigation state (which tab, sheet or activity is open).

import { signal } from '@preact/signals'
import type { AreaId } from '../game/data/areas'
import type { ArriveTarget } from '../scenes/world'

export type Tab = 'temple' | 'quests' | 'shop' | 'wardrobe' | 'social'

export type ActivityId =
  | 'alms'
  | 'chant'
  | 'meditate'
  | 'wish'
  | 'siamsi'
  | 'holy_water'
  | 'deity'
  | 'lottery'
  | 'koi'
  | 'dog'
  | 'bells'
  | 'gold_leaf'
  | 'donate'
  | 'dedicate'
  | 'krathong'
  | 'circle'
  | 'hall'

export interface ActivityRequest {
  id: ActivityId
  params?: Record<string, string | number | boolean | undefined>
}

export const tab = signal<Tab>('temple')
export const activity = signal<ActivityRequest | null>(null)
export const arrived = signal<ArriveTarget | null>(null)
export const area = signal<AreaId>('wat')

export type ShopSection = 'alms' | 'offering' | 'animal' | 'special' | 'boost' | 'area'
export const shopSection = signal<ShopSection>('alms')

export type SocialSection = 'friends' | 'groups' | 'feed' | 'charity'
export const socialSection = signal<SocialSection>('friends')

export const coinStoreOpen = signal(false)
export const mapOpen = signal(false)
export const settingsOpen = signal(false)
export const journalOpen = signal(false)
export const profileOpen = signal(false)

export function openActivity(id: ActivityId, params?: ActivityRequest['params']) {
  arrived.value = null
  activity.value = { id, params }
}

/** Close the current activity, returning to its parent (e.g. the hall) if any. */
export function closeActivity() {
  const back = activity.value?.params?.back
  activity.value = typeof back === 'string' ? { id: back as ActivityId, params: {} } : null
}

export function openShop(section: ShopSection) {
  shopSection.value = section
  activity.value = null
  arrived.value = null
  tab.value = 'shop'
}

export function openSocial(section: SocialSection) {
  socialSection.value = section
  activity.value = null
  arrived.value = null
  tab.value = 'social'
}
