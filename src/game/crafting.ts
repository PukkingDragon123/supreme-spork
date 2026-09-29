// Crafting furniture, wallpapers and floors from materials (+ a few coins).

import { game, mutate, level } from './state'
import { FURNITURE_BY_ID, FLOORS, WALLPAPERS } from './data/furniture'
import { addToStorage, canCraft, ownsSurface, unlockSurface } from './house'
import type { MaterialId } from './materials'
import { toast } from './events'
import { levelFromMerit } from './economy'
import type { GameState } from './state'
import type { GameEvent } from './data/quests'

/** The workbench (building) opens at this level. */
export const CRAFT_LEVEL = 5

export type Req =
  | { kind: 'level'; n: number }
  | { kind: 'stars'; n: number }
  | { kind: 'prayers'; n: number }
  | { kind: 'visits'; n: number }
  | { kind: 'place'; id: string; name: string }
  | { kind: 'stat'; event: GameEvent; n: number; text: string }

/** Extra unlock conditions ("quest locks") on top of an item's own level. */
export const CRAFT_REQS: Record<string, Req[]> = {
  lamp_paper: [{ kind: 'prayers', n: 3 }],
  garland_hang: [{ kind: 'prayers', n: 5 }],
  fan_stand: [{ kind: 'level', n: 6 }],
  clock_wall: [{ kind: 'stat', event: 'login', n: 3, text: 'เข้าวัดต่อเนื่อง 3 วัน' }],
  frames_trio: [{ kind: 'visits', n: 2 }],
  painting_wat: [{ kind: 'stars', n: 12 }],
  lotus_pot: [{ kind: 'stat', event: 'koi_fed', n: 20, text: 'ให้อาหารปลา 20 ครั้ง' }],
  aquarium: [{ kind: 'stat', event: 'koi_fed', n: 60, text: 'ให้อาหารปลา 60 ครั้ง' }, { kind: 'level', n: 9 }],
  cat_sleepy: [{ kind: 'stat', event: 'dog_pet', n: 5, text: 'ลูบหัวน้องหมาวัด 5 ครั้ง' }],
  bookshelf: [{ kind: 'prayers', n: 12 }],
  speaker: [{ kind: 'level', n: 8 }],
  bunting: [{ kind: 'visits', n: 3 }],
  altar_table: [{ kind: 'prayers', n: 20 }, { kind: 'stars', n: 20 }],
  umbrella_bosang: [{ kind: 'place', id: 'doi_suthep', name: 'วัดพระธาตุดอยสุเทพ' }],
  lamp_lanna: [{ kind: 'place', id: 'lampang_luang', name: 'วัดพระธาตุลำปางหลวง' }],
  poster_city: [{ kind: 'visits', n: 5 }],
  lantern_oil: [{ kind: 'level', n: 10 }],
  teak_daybed: [{ kind: 'level', n: 12 }],
  elephant_carving: [{ kind: 'stars', n: 30 }, { kind: 'visits', n: 8 }],
  tv_flat: [{ kind: 'level', n: 11 }],
  bed_teak: [{ kind: 'level', n: 14 }, { kind: 'prayers', n: 40 }],
  wp_kanok: [{ kind: 'stars', n: 10 }],
  fl_terrazzo: [{ kind: 'visits', n: 4 }],
}

function reqMet(r: Req, s: GameState): boolean {
  switch (r.kind) {
    case 'level':
      return levelFromMerit(s.merit).level >= r.n
    case 'stars':
      return Object.values(s.prayer.stars).reduce((a, b) => a + b, 0) >= r.n
    case 'prayers':
      return s.prayer.plays >= r.n
    case 'visits':
      return s.places.visited.length >= r.n
    case 'place':
      return s.places.visited.includes(r.id)
    case 'stat':
      return (s.stats[r.event] ?? 0) >= r.n
  }
}

export function reqText(r: Req): string {
  switch (r.kind) {
    case 'level':
      return `ถึงเลเวล ${r.n}`
    case 'stars':
      return `สะสมดาวสวดมนต์ ${r.n} ดวง`
    case 'prayers':
      return `สวดมนต์ครบ ${r.n} ครั้ง`
    case 'visits':
      return `ไปเยือนสถานที่ ${r.n} แห่ง`
    case 'place':
      return `ไปเยือน${r.name}`
    case 'stat':
      return r.text
  }
}

/** Every unlock condition for an item (its level + quest locks) with progress. */
export function requirements(id: string, s: GameState = game.value): { text: string; met: boolean }[] {
  const out: Req[] = []
  const r = recipeOf(id)
  if (r?.level && r.level > 1) out.push({ kind: 'level', n: r.level })
  out.push(...(CRAFT_REQS[id] ?? []))
  return out.map((q) => ({ text: reqText(q), met: reqMet(q, s) }))
}

export function unlocked(id: string, s: GameState = game.value): boolean {
  return requirements(id, s).every((r) => r.met)
}

export function craftingOpen(s: GameState = game.value): boolean {
  return levelFromMerit(s.merit).level >= CRAFT_LEVEL
}

type Cost = { recipe: Partial<Record<MaterialId, number>>; coins?: number; level?: number; name: string }

export function isSurface(id: string) {
  return WALLPAPERS.some((w) => w.id === id) || FLOORS.some((f) => f.id === id)
}

export function recipeOf(id: string): Cost | null {
  return FURNITURE_BY_ID[id] ?? WALLPAPERS.find((w) => w.id === id) ?? FLOORS.find((f) => f.id === id) ?? null
}

export function craftable(id: string): boolean {
  const r = recipeOf(id)
  if (!r || !craftingOpen() || !unlocked(id)) return false
  if (isSurface(id) && ownsSurface(game.value.house, id)) return false
  return canCraft(game.value.materials, game.value.coins, r, level.value.level)
}

/** Spend materials and put the crafted piece into home storage (or unlock a wallpaper/floor). */
export function craft(id: string): boolean {
  const r = recipeOf(id)
  if (!r || !craftable(id)) {
    toast('วัสดุยังไม่พอ ไปสวดมนต์และเก็บของรอบวัดเพิ่มนะ', 'hammer', 'warn')
    return false
  }
  mutate((d) => {
    for (const [k, v] of Object.entries(r.recipe)) d.materials[k as MaterialId] = Math.max(0, (d.materials[k as MaterialId] ?? 0) - (v ?? 0))
    d.coins -= r.coins ?? 0
    d.house = isSurface(id) ? unlockSurface(d.house, id) : addToStorage(d.house, id)
  })
  return true
}
