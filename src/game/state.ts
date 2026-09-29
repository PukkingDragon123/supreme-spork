// Game state: shape, defaults, persistence and the reactive store.

import { signal, computed } from '@preact/signals'
import type { AvatarLook } from '../art/avatar'
import { DEFAULT_LOOK } from '../art/avatar'
import type { AreaId } from './data/areas'
import type { GameEvent } from './data/quests'
import { STARTER_INVENTORY } from './data/items'
import { STARTER_OUTFITS } from './data/outfits'
import { levelFromMerit } from './economy'
import { emptyMaterials, type Materials } from './materials'
import { defaultHouse, normalizeHouse, type HouseState } from './house'
import { defaultHomeland, normalizeHomeland, type HomelandState } from './homelandState'
import { weekKey } from './time'
import { defaultLiveEvents, normalizeLiveEvents, type LiveEventsState } from './events/save'
import { emptyCollection, normalizeCollection, type CollectionState } from './collectionState'

export const SAVE_KEY = 'boondee.save.v1'
export const SAVE_VERSION = 2

export type BuffKind = 'merit' | 'coin' | 'animal'

export interface Buff {
  id: string
  kind: BuffKind
  mult: number
  until: number
  source: string
}

export interface DailyQuest {
  id: string
  progress: number
  claimed: boolean
}

export interface DailyState {
  key: string
  quests: DailyQuest[]
  bonusClaimed: boolean
  loginClaimed: boolean
  ads: number
  counts: Record<string, number>
  lotteryUsed: number
  lotteryExtra: number
  freeFishFood: boolean
  dedicated: boolean
  monthlyClaimed: boolean
  sathuGiven: number
}

export interface DogState {
  hearts: number
  fedToday: number
  lastFedDay: string
  petToday: boolean
}

export interface CreatedGroup {
  id: string
  name: string
  icon: string
  createdAt: number
}

export interface Settings {
  sound: boolean
  music: boolean
  time: 'real' | 'dawn' | 'day' | 'golden' | 'night'
  haptics: boolean
  reduceMotion: boolean
  /** Show other (online) players walking around the temples. */
  showOthers?: boolean
}

export interface AccountLink {
  kind: 'guest' | 'local' | 'supabase'
  id: string | null
  email: string | null
}

export interface PrayerProgress {
  /** Best stars per stage id. */
  stars: Record<string, number>
  /** Best score per stage id. */
  best: Record<string, number>
  plays: number
  /** Preferred input: real microphone or tap-along. */
  mode: 'voice' | 'tap'
  /** Consecutive days with at least one prayer. */
  streak: number
  lastDay: string | null
  /** Prayers finished today (for the daily goal). */
  today: number
  todayKey: string
}

export interface GameState {
  v: number
  createdAt: number
  /** Last local save time (for choosing between device and cloud saves). */
  savedAt: number
  onboarded: boolean
  account: AccountLink | null
  /** One-time story beats already shown. */
  seen: { intro: boolean; arrival: string[]; tips: string[] }
  materials: Materials
  prayer: PrayerProgress
  pickups: { day: string; taken: string[] }
  mala: { total: number; today: number; day: string }
  reminder: { on: boolean; hour: number; minute: number }
  house: HouseState
  /** Home province (บ้านเกิด) and temple-rank progress (see game/homeland.ts). */
  homeland: HomelandState
  /** Owned pet companions and the one walking with you. */
  pets: string[]
  pet: string | null
  /** Real places on the Thailand map: bought early, visited, and where you are now. */
  places: { bought: string[]; visited: string[]; current: string | null }
  /** Player market: your stall and what you bought from others. */
  market: { mine: import('./market').MyListing[]; bought: string[]; earned: number }
  /** Collectibles & souvenirs: owned counts, first-found days, daily stall stock (see game/collectibles.ts). */
  collection: CollectionState
  player: { name: string; birthDay: number; friendCode: string; look: AvatarLook }
  merit: number
  coins: number
  inventory: Record<string, number>
  outfits: string[]
  areas: AreaId[]
  buffs: Buff[]
  week: { key: string; merit: number }
  days: Record<string, number>
  daily: DailyState
  login: { streak: number; last: string | null; best: number }
  stats: Partial<Record<GameEvent, number>>
  achievements: Record<string, number>
  dogs: Record<string, DogState>
  companion: string | null
  lotteryLog: { day: string; nums: string[]; source: string }[]
  wishes: { day: string; text: string; cat: string; place: string }[]
  fortunes: { day: string; n: number }[]
  charity: Record<string, number>
  purchases: { id: string; at: number; priceTHB: number; tx: string }[]
  monthly: { until: string | null }
  starterBought: boolean
  social: { friends: string[]; groupId: string | null; created: CreatedGroup[]; reacted: Record<string, boolean>; groupClaims: Record<string, number> }
  settings: Settings
  lastArea: AreaId
  /** Live events (tickets, missions, battle pass) keyed by event id. */
  liveEvents: LiveEventsState
}

export function makeFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `BD-${s}`
}

export function emptyDaily(key: string): DailyState {
  return {
    key,
    quests: [],
    bonusClaimed: false,
    loginClaimed: false,
    ads: 0,
    counts: {},
    lotteryUsed: 0,
    lotteryExtra: 0,
    freeFishFood: false,
    dedicated: false,
    monthlyClaimed: false,
    sathuGiven: 0,
  }
}

export function defaultState(): GameState {
  return {
    v: SAVE_VERSION,
    createdAt: Date.now(),
    savedAt: 0,
    onboarded: false,
    account: null,
    seen: { intro: false, arrival: [], tips: [] },
    materials: emptyMaterials(),
    prayer: { stars: {}, best: {}, plays: 0, mode: 'voice', streak: 0, lastDay: null, today: 0, todayKey: '' },
    pickups: { day: '', taken: [] },
    mala: { total: 0, today: 0, day: '' },
    reminder: { on: false, hour: 19, minute: 0 },
    house: defaultHouse(),
    homeland: defaultHomeland(),
    pets: [],
    pet: null,
    places: { bought: [], visited: [], current: null },
    market: { mine: [], bought: [], earned: 0 },
    collection: emptyCollection(),
    player: { name: 'สายบุญ', birthDay: new Date().getDay(), friendCode: makeFriendCode(), look: { ...DEFAULT_LOOK } },
    merit: 0,
    coins: 100,
    inventory: { ...STARTER_INVENTORY },
    outfits: [...STARTER_OUTFITS],
    areas: ['wat'],
    buffs: [],
    week: { key: weekKey(), merit: 0 },
    days: {},
    daily: emptyDaily(''),
    login: { streak: 0, last: null, best: 0 },
    stats: {},
    achievements: {},
    dogs: {},
    companion: null,
    lotteryLog: [],
    wishes: [],
    fortunes: [],
    charity: {},
    purchases: [],
    monthly: { until: null },
    starterBought: false,
    social: { friends: [], groupId: null, created: [], reacted: {}, groupClaims: {} },
    settings: { sound: true, music: true, time: 'real', haptics: true, reduceMotion: false },
    lastArea: 'wat',
    liveEvents: defaultLiveEvents(),
  }
}

/** Fill in fields missing from older saves. */
export function migrate(raw: unknown): GameState {
  const base = defaultState()
  if (!raw || typeof raw !== 'object') return base
  const s = raw as Partial<GameState>
  const merged: GameState = {
    ...base,
    ...s,
    player: { ...base.player, ...(s.player ?? {}), look: { ...base.player.look, ...(s.player?.look ?? {}) } },
    daily: { ...emptyDaily(''), ...(s.daily ?? {}) },
    login: { ...base.login, ...(s.login ?? {}) },
    settings: { ...base.settings, ...(s.settings ?? {}) },
    social: { ...base.social, ...(s.social ?? {}) },
    monthly: { ...base.monthly, ...(s.monthly ?? {}) },
    week: { ...base.week, ...(s.week ?? {}) },
    seen: { ...base.seen, ...(s.seen ?? {}) },
    materials: { ...base.materials, ...(s.materials ?? {}) },
    prayer: { ...base.prayer, ...(s.prayer ?? {}) },
    pickups: { ...base.pickups, ...(s.pickups ?? {}) },
    mala: { ...base.mala, ...(s.mala ?? {}) },
    reminder: { ...base.reminder, ...(s.reminder ?? {}) },
    house: s.house ? normalizeHouse(s.house) : base.house,
    homeland: normalizeHomeland(s.homeland),
    places: { ...base.places, ...(s.places ?? {}) },
    market: { ...base.market, ...(s.market ?? {}) },
    liveEvents: normalizeLiveEvents(s.liveEvents),
    collection: normalizeCollection(s.collection),
    v: SAVE_VERSION,
  }
  // v1 called the main temple 'home'; it is 'wat' now that players have a house.
  merged.areas = [...new Set(merged.areas.map((a) => ((a as string) === 'home' ? 'wat' : a)))] as AreaId[]
  if ((merged.lastArea as string) === 'home') merged.lastArea = 'wat'
  if (!merged.areas.includes('wat')) merged.areas.unshift('wat')
  // New starter clothes appear for everyone.
  merged.outfits = [...new Set([...(merged.outfits ?? []), ...STARTER_OUTFITS])]
  return merged
}

// ---------------------------------------------------------------------------
// Storage (falls back to memory when localStorage is unavailable).

const memory = new Map<string, string>()
let slotKey = SAVE_KEY

/** Which save slot is active: one per signed-in account, the legacy key for guests. */
export function useSaveSlot(accountId: string | null) {
  slotKey = accountId ? `${SAVE_KEY}:${accountId}` : SAVE_KEY
}

export function currentSaveSlot() {
  return slotKey
}

export const storage = {
  load(key = slotKey): string | null {
    try {
      return window.localStorage.getItem(key) ?? memory.get(key) ?? null
    } catch {
      return memory.get(key) ?? null
    }
  },
  save(data: string, key = slotKey) {
    memory.set(key, data)
    try {
      window.localStorage.setItem(key, data)
    } catch {
      /* storage blocked: keep the in-memory copy */
    }
  },
  clear(key = slotKey) {
    memory.delete(key)
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

/** Called after every local save (e.g. to push to the cloud). */
export const persistListeners: ((data: string) => void)[] = []

export function loadState(key?: string): GameState {
  const raw = storage.load(key)
  if (!raw) return defaultState()
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return defaultState()
  }
}

// ---------------------------------------------------------------------------
// Reactive store.

export const game = signal<GameState>(defaultState())

export const level = computed(() => levelFromMerit(game.value.merit))

let saveTimer: ReturnType<typeof setTimeout> | undefined

export function persistNow() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = undefined
  game.value.savedAt = Date.now()
  const data = JSON.stringify(game.value)
  storage.save(data)
  for (const f of persistListeners) f(data)
}

function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persistNow, 350)
}

/** Apply a change to a copy of the state and publish it. */
export function mutate(fn: (s: GameState) => void) {
  const next = structuredClone(game.value)
  fn(next)
  game.value = next
  schedulePersist()
}

export function replaceState(s: GameState) {
  game.value = s
  schedulePersist()
}
