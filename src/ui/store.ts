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

export type ShopSection = 'pets' | 'fashion' | 'alms' | 'offering' | 'animal' | 'mats' | 'special' | 'boost' | 'area'
export const shopSection = signal<ShopSection>('pets')

export type SocialSection = 'friends' | 'groups' | 'feed' | 'charity'
export const socialSection = signal<SocialSection>('friends')

/** Top-level screen. */
export type Mode = 'intro' | 'title' | 'create' | 'arrival' | 'world' | 'house'
export const mode = signal<Mode>('title')
/** Where the arrival cutscene is heading. */
export const arrivalTarget = signal<AreaId>('wat')
/** Real map place being visited (null for the home temples). */
export const arrivalPlace = signal<string | null>(null)

/** Windows opened from the hotbar / menu. */
export type Panel = 'menu' | 'pray' | 'bag' | 'craft' | 'mala' | 'chants' | 'dress' | 'reminder'
export const panel = signal<Panel | null>(null)
/** Running prayer session (stage id). */
export const prayStage = signal<string | null>(null)
/** Praying at the home altar instead of the temple hall. */
export const prayAtHome = signal(false)
/** Home is in furniture edit mode (hides the HUD and hotbar). */
export const houseEditing = signal(false)

export function openPanel(p: Panel | null) {
  panel.value = p
}

/** Travel to a temple area with the arrival cutscene. */
export function goTemple(a: AreaId = area.value, place: string | null = arrivalPlace.value) {
  arrivalPlace.value = place
  panel.value = null
  activity.value = null
  arrived.value = null
  tab.value = 'temple'
  arrivalTarget.value = a
  mode.value = 'arrival'
}

export function goHome() {
  panel.value = null
  activity.value = null
  arrived.value = null
  tab.value = 'temple'
  mode.value = 'house'
}

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
