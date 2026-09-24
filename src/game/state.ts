// Game state: shape, defaults, persistence and the reactive store.

import { signal, computed } from '@preact/signals'
import type { AvatarLook } from '../art/avatar'
import { DEFAULT_LOOK } from '../art/avatar'
import type { AreaId } from './data/areas'
import type { GameEvent } from './data/quests'
import { STARTER_INVENTORY } from './data/items'
import { STARTER_OUTFITS } from './data/outfits'
import { levelFromMerit } from './economy'
import { weekKey } from './time'

export const SAVE_KEY = 'boondee.save.v1'
export const SAVE_VERSION = 1

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
}

export interface GameState {
  v: number
  createdAt: number
  onboarded: boolean
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
    onboarded: false,
    player: { name: 'สายบุญ', birthDay: new Date().getDay(), friendCode: makeFriendCode(), look: { ...DEFAULT_LOOK } },
    merit: 0,
    coins: 100,
    inventory: { ...STARTER_INVENTORY },
    outfits: [...STARTER_OUTFITS],
    areas: ['home'],
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
    lastArea: 'home',
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
    v: SAVE_VERSION,
  }
  if (!merged.areas.includes('home')) merged.areas.unshift('home')
  return merged
}

// ---------------------------------------------------------------------------
// Storage (falls back to memory when localStorage is unavailable).

let memory: string | null = null

export const storage = {
  load(): string | null {
    try {
      return window.localStorage.getItem(SAVE_KEY) ?? memory
    } catch {
      return memory
    }
  },
  save(data: string) {
    memory = data
    try {
      window.localStorage.setItem(SAVE_KEY, data)
    } catch {
      /* storage blocked: keep the in-memory copy */
    }
  },
  clear() {
    memory = null
    try {
      window.localStorage.removeItem(SAVE_KEY)
    } catch {
      /* ignore */
    }
  },
}

export function loadState(): GameState {
  const raw = storage.load()
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
  storage.save(JSON.stringify(game.value))
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
