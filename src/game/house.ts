// The player's home: state shape and pure placement / crafting helpers.
// No DOM here so everything can be unit tested in node.

import {
  FLOOR_BY_ID,
  FLOORS,
  FURNITURE,
  FURNITURE_BY_ID,
  MATERIALS,
  WALLPAPER_BY_ID,
  WALLPAPERS,
  type Furniture,
  type MaterialId,
  type Recipe,
} from './data/furniture'

export interface PlacedFurniture {
  uid: string
  id: string
  /** Tile position: floor grid for floor/rug items, wall grid for wall items. */
  x: number
  y: number
  flip?: boolean
}

export interface HouseState {
  wallpaper: string
  floor: string
  placed: PlacedFurniture[]
  /** Crafted items waiting in the storage box, by furniture id. */
  storage: Record<string, number>
  /** Wallpaper and floor ids the player owns (can switch between freely). */
  surfaces: string[]
}

/**
 * Room grid sizes. The floor grid is `cols × rows` tiles (16×12 px each in
 * the scene) and the back wall is `wallCols × wallRows` tiles (16×16 px).
 * Wall column i sits directly above floor column i.
 */
export const ROOM = { cols: 10, rows: 8, wallCols: 10, wallRows: 5 } as const

export interface TileRect {
  x: number
  y: number
  w: number
  h: number
}

/** Floor tiles that must stay walkable (in front of the door and wardrobe). Rugs are fine. */
export const CLEAR_ZONES: TileRect[] = [
  { x: 8, y: 0, w: 2, h: 1 },
  { x: 0, y: 1, w: 2, h: 1 },
]

/** Where the built-ins live. Their uids are stable (`fixed:<id>`). */
export const FIXED_LAYOUT: PlacedFurniture[] = [
  { uid: 'fixed:wardrobe_mirror', id: 'wardrobe_mirror', x: 0, y: 0 },
  { uid: 'fixed:altar_shelf', id: 'altar_shelf', x: 2, y: 0 },
  { uid: 'fixed:window_big', id: 'window_big', x: 4, y: 0 },
  { uid: 'fixed:door', id: 'door', x: 8, y: 2 },
]

export const DEFAULT_WALLPAPER = 'wp_cream'
export const DEFAULT_FLOOR = 'fl_oak'

/** A cosy starter room: bed under the altar shelf, a reed mat, a plant and the workbench. */
export function defaultHouse(): HouseState {
  return {
    wallpaper: DEFAULT_WALLPAPER,
    floor: DEFAULT_FLOOR,
    placed: [
      ...FIXED_LAYOUT.map((p) => ({ ...p })),
      { uid: 'u1', id: 'bed_simple', x: 2, y: 0 },
      { uid: 'u2', id: 'side_table', x: 4, y: 0 },
      { uid: 'u3', id: 'plant_monstera', x: 7, y: 0 },
      { uid: 'u4', id: 'rug_mat', x: 4, y: 4 },
      { uid: 'u5', id: 'workbench', x: 7, y: 6 },
    ],
    storage: { cushion_khwan: 1 },
    surfaces: [...WALLPAPERS.filter((w) => w.starter).map((w) => w.id), ...FLOORS.filter((f) => f.starter).map((f) => f.id)],
  }
}

// ---------------------------------------------------------------------------
// Geometry

export function footprint(p: { id: string; x: number; y: number }): TileRect | null {
  const f = FURNITURE_BY_ID[p.id]
  if (!f) return null
  return { x: p.x, y: p.y, w: f.w, h: f.h }
}

export function overlaps(a: TileRect, b: TileRect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** Wall items share the wall grid; floor items and rugs share the floor grid. */
export function onWall(f: Furniture): boolean {
  return f.kind === 'wall'
}

export function inBounds(f: Furniture, x: number, y: number): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false
  const cols = onWall(f) ? ROOM.wallCols : ROOM.cols
  const rows = onWall(f) ? ROOM.wallRows : ROOM.rows
  return x >= 0 && y >= 0 && x + f.w <= cols && y + f.h <= rows
}

/** Would two items on the same grid collide? Rugs slide under ordinary floor items. */
function conflicts(a: Furniture, b: Furniture): boolean {
  if (onWall(a) !== onWall(b)) return false
  if (onWall(a)) return true
  if (a.kind === 'rug' && b.kind === 'rug') return true
  if (a.kind === 'rug' || b.kind === 'rug') return !!(a.fixed || b.fixed)
  return true
}

/** Can furniture `id` sit with its top-left tile at (x, y)? */
export function canPlace(h: HouseState, id: string, x: number, y: number, ignoreUid?: string): boolean {
  const f = FURNITURE_BY_ID[id]
  if (!f || !inBounds(f, x, y)) return false
  const r = { x, y, w: f.w, h: f.h }
  if (f.kind === 'floor' && !f.fixed && CLEAR_ZONES.some((z) => overlaps(r, z))) return false
  for (const p of h.placed) {
    if (p.uid === ignoreUid) continue
    const o = FURNITURE_BY_ID[p.id]
    if (!o || !conflicts(f, o)) continue
    if (overlaps(r, { x: p.x, y: p.y, w: o.w, h: o.h })) return false
  }
  return true
}

/** Find a free spot for `id`, scanning outward from (nearX, nearY). */
export function findSpot(h: HouseState, id: string, nearX?: number, nearY?: number, ignoreUid?: string): { x: number; y: number } | null {
  const f = FURNITURE_BY_ID[id]
  if (!f) return null
  const cols = onWall(f) ? ROOM.wallCols : ROOM.cols
  const rows = onWall(f) ? ROOM.wallRows : ROOM.rows
  const cx = nearX ?? Math.floor((cols - f.w) / 2)
  const cy = nearY ?? Math.floor((rows - f.h) / 2)
  let best: { x: number; y: number } | null = null
  let bestD = Infinity
  for (let y = 0; y + f.h <= rows; y++)
    for (let x = 0; x + f.w <= cols; x++) {
      if (!canPlace(h, id, x, y, ignoreUid)) continue
      const d = (x - cx) ** 2 + (y - cy) ** 2 * 1.2
      if (d < bestD) {
        bestD = d
        best = { x, y }
      }
    }
  return best
}

// ---------------------------------------------------------------------------
// State transitions (always return a new object; unchanged input on failure)

export function nextUid(h: HouseState): string {
  let n = 0
  for (const p of h.placed) {
    const m = /^u(\d+)$/.exec(p.uid)
    if (m) n = Math.max(n, Number(m[1]))
  }
  return `u${n + 1}`
}

export function storedCount(h: HouseState, id: string): number {
  return h.storage[id] ?? 0
}

/** Stored + placed copies of an item. */
export function ownedCount(h: HouseState, id: string): number {
  return storedCount(h, id) + h.placed.filter((p) => p.id === id).length
}

export function addToStorage(h: HouseState, id: string, n = 1): HouseState {
  if (!FURNITURE_BY_ID[id] || n <= 0) return h
  return { ...h, storage: { ...h.storage, [id]: storedCount(h, id) + n } }
}

function takeFromStorage(storage: Record<string, number>, id: string): Record<string, number> {
  const next = { ...storage }
  const left = (next[id] ?? 0) - 1
  if (left > 0) next[id] = left
  else delete next[id]
  return next
}

/** Place one stored copy of `id`. Returns `h` unchanged if nothing is stored or the spot is taken. */
export function placeFurniture(h: HouseState, id: string, x: number, y: number, flip = false): HouseState {
  if (storedCount(h, id) <= 0 || !canPlace(h, id, x, y)) return h
  const p: PlacedFurniture = { uid: nextUid(h), id, x, y }
  if (flip) p.flip = true
  return { ...h, placed: [...h.placed, p], storage: takeFromStorage(h.storage, id) }
}

export function moveFurniture(h: HouseState, uid: string, x: number, y: number, flip?: boolean): HouseState {
  const i = h.placed.findIndex((p) => p.uid === uid)
  if (i < 0) return h
  const cur = h.placed[i]
  const f = FURNITURE_BY_ID[cur.id]
  if (!f || f.fixed || !canPlace(h, cur.id, x, y, uid)) return h
  const nf = flip ?? cur.flip ?? false
  const moved: PlacedFurniture = { uid, id: cur.id, x, y }
  if (nf) moved.flip = true
  const placed = h.placed.slice()
  placed[i] = moved
  return { ...h, placed }
}

/** Put a placed item back into storage (built-ins stay put). */
export function storeFurniture(h: HouseState, uid: string): HouseState {
  const p = h.placed.find((q) => q.uid === uid)
  if (!p) return h
  const f = FURNITURE_BY_ID[p.id]
  if (!f || f.fixed) return h
  return { ...h, placed: h.placed.filter((q) => q.uid !== uid), storage: { ...h.storage, [p.id]: storedCount(h, p.id) + 1 } }
}

export function isFixed(h: HouseState, uid: string): boolean {
  const p = h.placed.find((q) => q.uid === uid)
  return !!(p && FURNITURE_BY_ID[p.id]?.fixed)
}

// ---------------------------------------------------------------------------
// Wallpaper & floor

export function ownsSurface(h: HouseState, id: string): boolean {
  return h.surfaces.includes(id)
}

export function unlockSurface(h: HouseState, id: string): HouseState {
  if (!(WALLPAPER_BY_ID[id] || FLOOR_BY_ID[id]) || ownsSurface(h, id)) return h
  return { ...h, surfaces: [...h.surfaces, id] }
}

export function setWallpaper(h: HouseState, id: string): HouseState {
  if (!WALLPAPER_BY_ID[id] || !ownsSurface(h, id) || h.wallpaper === id) return h
  return { ...h, wallpaper: id }
}

export function setFloor(h: HouseState, id: string): HouseState {
  if (!FLOOR_BY_ID[id] || !ownsSurface(h, id) || h.floor === id) return h
  return { ...h, floor: id }
}

// ---------------------------------------------------------------------------
// Crafting

export type Materials = Partial<Record<MaterialId, number>>

export interface CostLike {
  recipe: Recipe
  coins?: number
  level?: number
}

export interface Missing {
  mats: Materials
  coins: number
  /** Player level still needed (0 when the level is fine or not checked). */
  level: number
}

/**
 * What's still missing to craft `f`. Pass `level` to also check the level
 * requirement.
 */
export function missingFor(mats: Materials, coins: number, f: CostLike, level?: number): Missing {
  const out: Missing = { mats: {}, coins: 0, level: 0 }
  for (const m of MATERIALS) {
    const need = f.recipe[m.id] ?? 0
    const have = mats[m.id] ?? 0
    if (need > have) out.mats[m.id] = need - have
  }
  out.coins = Math.max(0, (f.coins ?? 0) - coins)
  if (level !== undefined && f.level && level < f.level) out.level = f.level - level
  return out
}

export function canCraft(mats: Materials, coins: number, f: CostLike, level?: number): boolean {
  const m = missingFor(mats, coins, f, level)
  return Object.keys(m.mats).length === 0 && m.coins === 0 && m.level === 0
}

/** Materials left after paying for `f` (assumes canCraft). */
export function spendRecipe(mats: Materials, f: CostLike): Materials {
  const out: Materials = { ...mats }
  for (const m of MATERIALS) {
    const need = f.recipe[m.id] ?? 0
    if (!need) continue
    const left = (out[m.id] ?? 0) - need
    if (left > 0) out[m.id] = left
    else delete out[m.id]
  }
  return out
}

// ---------------------------------------------------------------------------
// Cosiness score (ความน่าอยู่)

/** Base cosiness of one item, roughly proportional to its crafting effort. */
export function itemCosy(f: Furniture): number {
  if (f.fixed) return 0
  const mats = Object.values(f.recipe).reduce((a, b) => a + (b ?? 0), 0)
  let s = 4 + mats * 2 + Math.round((f.coins ?? 0) / 25) + (f.level ?? 1)
  if (f.tags?.includes('cosy')) s += 3
  if (f.tags?.includes('thai')) s += 2
  return s
}

export function roomScore(h: HouseState): number {
  const counts = new Map<string, number>()
  let score = 10
  let plants = 0
  let lights = 0
  let wall = 0
  let rugs = 0
  let seats = 0
  for (const p of h.placed) {
    const f = FURNITURE_BY_ID[p.id]
    if (!f || f.fixed) continue
    const n = (counts.get(p.id) ?? 0) + 1
    counts.set(p.id, n)
    // Each extra copy of the same thing is worth a bit less.
    score += itemCosy(f) / n
    if (f.tags?.includes('plant')) plants++
    if (f.tags?.includes('light')) lights++
    if (f.tags?.includes('seat')) seats++
    if (f.kind === 'wall') wall++
    if (f.kind === 'rug') rugs++
  }
  score += counts.size * 3
  if (plants) score += 8 + Math.min(plants, 4) * 2
  if (lights) score += 8
  if (seats) score += 5
  if (rugs) score += 5
  score += Math.min(wall, 5) * 2
  if (h.placed.some((p) => p.id === 'altar_table')) score += 15
  if (h.wallpaper !== DEFAULT_WALLPAPER) score += 8
  if (h.floor !== DEFAULT_FLOOR) score += 8
  return Math.round(score)
}

export const COSY_TIERS: { min: number; name: string }[] = [
  { min: 0, name: 'ห้องโล่ง ๆ' },
  { min: 60, name: 'เริ่มน่าอยู่' },
  { min: 110, name: 'อบอุ่นละมุน' },
  { min: 180, name: 'น่าอยู่มาก' },
  { min: 260, name: 'บ้านในฝัน' },
]

export function cosyTier(score: number): { index: number; name: string; next: number | null } {
  let i = 0
  for (let k = 0; k < COSY_TIERS.length; k++) if (score >= COSY_TIERS[k].min) i = k
  return { index: i, name: COSY_TIERS[i].name, next: COSY_TIERS[i + 1]?.min ?? null }
}

// ---------------------------------------------------------------------------
// Save loading

/**
 * Repair a loaded (possibly old or hand-edited) house: fills missing fields,
 * drops unknown ids, restores the built-ins and moves overlapping items back
 * into storage.
 */
export function normalizeHouse(raw: unknown): HouseState {
  const def = defaultHouse()
  if (!raw || typeof raw !== 'object') return def
  const r = raw as Partial<HouseState>
  const surfaces = Array.isArray(r.surfaces) ? r.surfaces.filter((s) => typeof s === 'string' && (WALLPAPER_BY_ID[s] || FLOOR_BY_ID[s])) : []
  for (const s of def.surfaces) if (!surfaces.includes(s)) surfaces.push(s)
  const storage: Record<string, number> = {}
  if (r.storage && typeof r.storage === 'object') {
    for (const [id, n] of Object.entries(r.storage)) {
      const f = FURNITURE_BY_ID[id]
      if (f && !f.fixed && typeof n === 'number' && n > 0) storage[id] = Math.floor(n)
    }
  }
  let h: HouseState = {
    wallpaper: typeof r.wallpaper === 'string' && WALLPAPER_BY_ID[r.wallpaper] ? r.wallpaper : def.wallpaper,
    floor: typeof r.floor === 'string' && FLOOR_BY_ID[r.floor] ? r.floor : def.floor,
    placed: FIXED_LAYOUT.map((p) => ({ ...p })),
    storage,
    surfaces,
  }
  if (!h.surfaces.includes(h.wallpaper)) h.surfaces.push(h.wallpaper)
  if (!h.surfaces.includes(h.floor)) h.surfaces.push(h.floor)
  const seen = new Set(h.placed.map((p) => p.uid))
  const list = Array.isArray(r.placed) ? r.placed : []
  for (const p of list) {
    if (!p || typeof p !== 'object') continue
    const f = FURNITURE_BY_ID[p.id]
    if (!f || f.fixed) continue
    let uid = typeof p.uid === 'string' && !seen.has(p.uid) && !p.uid.startsWith('fixed:') ? p.uid : ''
    if (!uid) uid = nextUid(h)
    if (canPlace(h, p.id, p.x, p.y)) {
      const q: PlacedFurniture = { uid, id: p.id, x: p.x, y: p.y }
      if (p.flip) q.flip = true
      h = { ...h, placed: [...h.placed, q] }
      seen.add(uid)
    } else {
      h = addToStorage(h, p.id)
    }
  }
  return h
}

/** All furniture ids, for iteration in UI/tests. */
export const FURNITURE_IDS = FURNITURE.map((f) => f.id)
