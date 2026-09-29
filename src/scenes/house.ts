// The player's home (บ้านของฉัน): cosy rooms in 3/4 front view – the Bangkok
// bedroom, the shrine room, the kitchen and one regional-style room per ภาค,
// each with its own architecture and window view. Tap-to-walk, tap furniture
// to use it, and an edit mode for placing and moving furniture on the floor
// and wall grids.

import { bake, Surface } from '../engine/pixel'
import type { PointerInfo, Scene } from '../engine/stage'
import { Particles } from '../engine/particles'
import { rand } from '../engine/rng'
import { clamp, easeInOutSine } from '../engine/ease'
import { avatarSprite, DEFAULT_LOOK, type AvatarLook, type Pose, type View } from '../art/avatar'
import { drawShadow } from '../art/props'
import { markerSprite } from '../art/icons'
import { P } from '../art/palette'
import {
  drawBaseboard,
  drawFloor,
  drawFurnitureFx,
  drawWallpaper,
  drawWindowEmissive,
  drawWindowFrame,
  drawWindowGlass,
  FLOOR_H,
  FLOOR_Y,
  furnitureFrameCount,
  furnitureOrigin,
  furnitureSprite,
  GLASS,
  ROOM_H,
  ROOM_W,
  TILE_H,
  TILE_W,
  TV_SCREEN,
  WALL_H,
  WALL_TILE,
  WARDROBE_MIRRORS,
  WINDOW,
  type FxState,
} from '../art/furniture'
import { FURNITURE_BY_ID, type Furniture, type Interact } from '../game/data/furniture'
import {
  canPlace,
  findSpot,
  moveFurniture,
  placeFurniture,
  ROOM,
  viewRoom,
  type HouseState,
  type PlacedFurniture,
} from '../game/house'
import { ROOM_BY_ID, type RoomDef } from '../game/data/rooms'
import { ALTAR_GLOW, drawRoomFrame, drawRoomTrim, drawRoomView, drawRoomViewEmissive, roomBackdrop, viewRect, type Rect } from '../art/roomArt'
import type { Phase } from '../game/time'
import { NavGrid } from './pathfind'
import { currentPhase } from './sky'

export type HouseMode = 'live' | 'edit'
export type HouseFocus = 'room' | 'mirror'

export interface GhostInfo {
  id: string
  /** Set when moving an already placed item. */
  uid?: string
  x: number
  y: number
  flip: boolean
  valid: boolean
}

export interface HouseCallbacks {
  /** The player walked up to an item and used it (live mode). */
  onInteract?(kind: Interact, uid: string): void
  /** A placed (non built-in) item was tapped in edit mode. */
  onEditPick?(uid: string): void
  /** A new item was placed. `next` is the house with it applied. */
  onPlaced?(id: string, x: number, y: number, flip: boolean, next: HouseState): void
  /** An item was moved. `next` is the house with it applied. */
  onMoved?(uid: string, x: number, y: number, flip: boolean, next: HouseState): void
  /** The placement ghost appeared, moved, changed validity or went away. */
  onGhostChange?(g: GhostInfo | null): void
}

type Facing = 'up' | 'down' | 'left' | 'right'

// Room bounds including the cut-away frame around it.
const FRAME_SIDE = 6
const FRAME_TOP = 8
const FRAME_BOTTOM = 8
const BOUNDS = { x: -FRAME_SIDE, y: -FRAME_TOP, w: ROOM_W + FRAME_SIDE * 2, h: ROOM_H + FRAME_TOP + FRAME_BOTTOM }
/** World rect the mirror close-up frames: the wardrobe and the player in front of it. */
const MIRROR_FOCUS = { x: -4, y: 16, w: 48, h: 94 }
const MIRROR_SPOT = { x: 16, y: FLOOR_Y + TILE_H + 8 }

const INDOOR_TINT: Record<Phase, { c: string; a: number } | null> = {
  dawn: { c: '#ffd4c4', a: 0.2 },
  day: null,
  golden: { c: '#ffcf99', a: 0.22 },
  dusk: { c: '#a58ad0', a: 0.38 },
  night: { c: '#3a3f96', a: 0.55 },
}

const WALK_CYCLE: Pose[] = ['walk1', 'pass', 'walk2', 'pass']

/** Built-in windows (drawn by the scene, never as sprites). */
const WINDOW_IDS = new Set(['window_big', 'window_wide'])

interface WindowInfo {
  /** Footprint of the window on the wall, world px. */
  win: Rect
  /** Glass rect (where the view is). */
  glass: Rect
  def: RoomDef
  /** The original bedroom city window with sheer curtains. */
  classic: boolean
}

/** Smooth additive light pool (posterised by the pixel scaling). */
function softGlow(s: Surface, x: number, y: number, r: number, strength: number, color: string) {
  if (strength <= 0) return
  const n = parseInt(color.slice(1), 16)
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
  const cx = x - s.ox
  const cy = y - s.oy
  const a = Math.min(1, strength)
  const grad = s.ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0, `rgba(${rgb},${0.42 * a})`)
  grad.addColorStop(0.45, `rgba(${rgb},${0.16 * a})`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  s.ctx.save()
  s.ctx.globalCompositeOperation = 'lighter'
  s.ctx.fillStyle = grad
  s.ctx.fillRect(Math.round(cx - r), Math.round(cy - r), r * 2, r * 2)
  s.ctx.restore()
}

class Walker {
  path: [number, number][] = []
  facing: Facing = 'down'
  moving = false
  animT = 0
  constructor(
    public x: number,
    public y: number,
    public speed: number,
  ) {}

  walk(dt: number): boolean {
    if (!this.path.length) {
      this.moving = false
      return false
    }
    const [tx, ty] = this.path[0]
    const dx = tx - this.x
    const dy = ty - this.y
    const d = Math.hypot(dx, dy)
    const step = this.speed * dt
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left'
    else if (d > 0.01) this.facing = dy > 0 ? 'down' : 'up'
    if (d <= step) {
      this.x = tx
      this.y = ty
      this.path.shift()
    } else {
      this.x += (dx / d) * step
      this.y += (dy / d) * step
    }
    this.moving = true
    this.animT += dt
    if (!this.path.length) {
      this.moving = false
      return true
    }
    return false
  }
}

function viewOf(f: Facing): { view: View; flip: boolean } {
  if (f === 'down') return { view: 'front', flip: false }
  if (f === 'up') return { view: 'back', flip: false }
  return { view: 'side', flip: f === 'left' }
}

interface Glyph {
  kind: 'note' | 'z' | 'wind'
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
}

const NOTE = ['..##', '..#.', '..#.', '###.', '##..']
const ZED = ['###', '..#', '.#.', '#..', '###']

interface ItemBox {
  p: PlacedFurniture
  f: Furniture
  /** Sprite rect in world px. */
  sx: number
  sy: number
  sw: number
  sh: number
  /** Footprint top-left in world px. */
  fx: number
  fy: number
}

export class HouseScene implements Scene {
  house: HouseState
  look: AvatarLook
  mode: HouseMode = 'live'
  focus: HouseFocus = 'room'
  /** Force a time of day (null = follow the game clock). */
  phaseOverride: Phase | null = null
  /** Floating icons over the door, wardrobe, altar and workbench. */
  showMarkers = true
  /** Draw ✓ / flip / ✕ buttons next to the placement ghost. */
  showGhostButtons = true
  /** Hide the player (used for still renders). */
  hidePlayer = false
  paused = false

  readonly particles = new Particles()
  readonly player: Walker
  private grid!: NavGrid
  private glyphs: Glyph[] = []
  private cb: HouseCallbacks
  private vw = 168
  private vh = 320
  private insetTop = 0
  private insetBottom = 0
  private time = 0
  private phase: Phase = 'day'
  private target: { uid: string; face: Facing } | null = null
  private sitting: { uid: string; x: number; y: number } | null = null
  private pose: { pose: Pose; view: View; until: number } | null = null
  private toggles = new Map<string, boolean>()
  private pokes = new Map<string, number>()
  private sheerOpen = 0.55
  private sheerTarget = 0.55
  private fanSpin = new Map<string, number>()
  private shellCache: { key: string; canvas: HTMLCanvasElement } | null = null
  private boxes: ItemBox[] = []
  private ghost: GhostInfo | null = null
  private drag:
    | { kind: 'ghost'; offX: number; offY: number }
    | { kind: 'pick'; uid: string; sx: number; sy: number; offX: number; offY: number }
    | { kind: 'tap'; sx: number; sy: number }
    | { kind: 'button'; which: 'ok' | 'flip' | 'cancel' }
    | null = null
  private tapFx: { x: number; y: number; t: number } | null = null
  private flash: { uid: string; t: number } | null = null
  private zoomT = 0
  private reflectHappy = 0
  private doorOpen = 0
  private buf = new Surface(16, 16)
  private camX = 0
  private camY = 0
  private z = 1

  constructor(house: HouseState, look: AvatarLook, cb: HouseCallbacks = {}) {
    this.house = house
    this.look = look
    this.cb = cb
    this.player = new Walker(ROOM_W - 26, FLOOR_Y + 16, 54)
    this.player.facing = 'down'
    this.rebuild()
    this.unstick()
    this.phase = currentPhase()
  }

  // ------------------------------------------------------------ public API

  setHouse(h: HouseState) {
    const moved = h.room !== this.house.room
    this.house = h
    if (moved) {
      // uids are per room: forget switches, pokes and fans of the old room.
      this.toggles.clear()
      this.pokes.clear()
      this.fanSpin.clear()
      this.sitting = null
      this.target = null
      this.player.path = []
      this.cancelPlacing()
    }
    this.rebuild()
    if (this.ghost?.uid && !h.placed.some((p) => p.uid === this.ghost!.uid)) this.cancelPlacing()
    else if (this.ghost) this.revalidateGhost()
    if (this.sitting && !h.placed.some((p) => p.uid === this.sitting!.uid)) this.sitting = null
    if (!this.sitting) this.unstick()
  }

  setLook(l: AvatarLook) {
    this.look = l
    this.reflectHappy = 1.1
    if (this.focus === 'mirror') this.particles.sparkles(MIRROR_SPOT.x, FLOOR_Y - 30, 6, '#fff6a8', 14)
  }

  /** Reserve screen space (virtual px) covered by UI, so the room centres in what's left. */
  setInsets(top: number, bottom: number) {
    this.insetTop = Math.max(0, top)
    this.insetBottom = Math.max(0, bottom)
  }

  setPhase(p: Phase | null) {
    this.phaseOverride = p
  }

  setMode(m: HouseMode) {
    if (m === this.mode) return
    this.mode = m
    if (m === 'live') this.cancelPlacing()
    else {
      this.player.path = []
      this.target = null
    }
  }

  setFocus(f: HouseFocus) {
    if (f === this.focus) return
    this.focus = f
    if (f === 'mirror') {
      this.setMode('live')
      this.sitting = null
      this.pose = null
      this.target = null
      this.walkTo(MIRROR_SPOT.x, MIRROR_SPOT.y, 'up')
    }
  }

  /** Put the player on a floor tile (tile coordinates). */
  playerAt(x: number, y: number) {
    const wx = (clamp(x, 0, ROOM.cols - 1) + 0.5) * TILE_W
    const wy = FLOOR_Y + (clamp(y, 0, ROOM.rows - 1) + 0.5) * TILE_H
    const free = this.grid.nearestFree(wx, wy - FLOOR_Y)
    this.player.x = free ? free[0] : wx
    this.player.y = free ? free[1] + FLOOR_Y : wy
    this.player.path = []
    this.sitting = null
    this.target = null
  }

  /** Walk in through the door (after switching rooms). */
  enterFromDoor() {
    const door = this.boxes.find((b) => b.p.id === 'door')
    const x = door ? door.fx + 16 : ROOM_W - 26
    this.player.x = x
    this.player.y = FLOOR_Y + 8
    this.player.path = []
    this.player.facing = 'down'
    this.sitting = null
    this.target = null
    this.doorOpen = 1.1
    this.unstick()
    this.walkTo(x - 6, FLOOR_Y + 24, 'down')
    this.particles.sparkles(x, FLOOR_Y - 6, 8, '#fff6a8', 16)
  }

  /** The room's window (null for rooms without one, like the shrine room). */
  windowInfo(): WindowInfo | null {
    const def = ROOM_BY_ID[this.house.room] ?? ROOM_BY_ID.bedroom
    const p = this.house.placed.find((q) => WINDOW_IDS.has(q.id))
    const f = p && FURNITURE_BY_ID[p.id]
    if (!p || !f || !def.view) return null
    const win = { x: p.x * WALL_TILE, y: p.y * WALL_TILE, w: f.w * WALL_TILE, h: f.h * WALL_TILE }
    const classic = def.frame === 'alu' && def.view === 'city' && p.id === 'window_big' && p.x * WALL_TILE === WINDOW.x
    return { win, glass: classic ? { ...GLASS } : viewRect(def.frame, win), def, classic }
  }

  /** A little celebration burst (e.g. after crafting or dressing up). */
  sparkle() {
    this.particles.sparkles(this.player.x, this.player.y - 16, 10)
    this.particles.hearts(this.player.x, this.player.y - 26, 2)
  }

  ghostInfo(): GhostInfo | null {
    return this.ghost ? { ...this.ghost } : null
  }

  startPlacing(id: string) {
    const f = FURNITURE_BY_ID[id]
    if (!f) return
    this.setMode('edit')
    const near = this.defaultSpotNear(f)
    const spot = findSpot(this.house, id, near.x, near.y) ?? { x: near.x, y: near.y }
    this.ghost = { id, x: spot.x, y: spot.y, flip: false, valid: false }
    this.revalidateGhost()
  }

  startMoving(uid: string) {
    const p = this.house.placed.find((q) => q.uid === uid)
    const f = p && FURNITURE_BY_ID[p.id]
    if (!p || !f || f.fixed) return
    this.setMode('edit')
    this.ghost = { id: p.id, uid, x: p.x, y: p.y, flip: !!p.flip, valid: true }
    this.revalidateGhost()
  }

  cancelPlacing() {
    if (!this.ghost) return
    this.ghost = null
    this.drag = null
    this.cb.onGhostChange?.(null)
  }

  flipGhost() {
    if (!this.ghost) return
    this.ghost.flip = !this.ghost.flip
    this.cb.onGhostChange?.({ ...this.ghost })
  }

  /** Commit the ghost if it's in a valid spot. Returns false when it can't go there. */
  confirmGhost(): boolean {
    const g = this.ghost
    if (!g) return false
    this.revalidateGhost()
    if (!g.valid) {
      this.flashInvalid = 0.4
      return false
    }
    let next: HouseState
    if (g.uid) {
      next = moveFurniture(this.house, g.uid, g.x, g.y, g.flip)
      if (next === this.house && !this.samePlace(g)) return false
    } else {
      next = placeFurniture(this.house, g.id, g.x, g.y, g.flip)
      if (next === this.house) return false
    }
    const box = this.ghostRect(g)
    this.ghost = null
    this.drag = null
    this.setHouse(next)
    this.particles.sparkles(box.x + box.w / 2, box.y + box.h / 2, 12, '#fff6a8', box.w)
    if (g.uid) this.cb.onMoved?.(g.uid, g.x, g.y, g.flip, next)
    else this.cb.onPlaced?.(g.id, g.x, g.y, g.flip, next)
    this.cb.onGhostChange?.(null)
    return true
  }

  /** Is an item currently switched on (fan, lamp, tv, music)? */
  isOn(uid: string): boolean {
    return this.itemOn(uid)
  }

  /** Switch a fan / lamp / tv / speaker on or off. */
  setOn(uid: string, on: boolean) {
    const p = this.house.placed.find((q) => q.uid === uid)
    const i = p && FURNITURE_BY_ID[p.id]?.interact
    if (i === 'fan' || i === 'lamp' || i === 'tv' || i === 'music') this.toggles.set(uid, on)
  }

  /** Move the ghost to a tile (e.g. from arrow buttons in the UI). */
  setGhostPos(x: number, y: number) {
    const g = this.ghost
    if (!g) return
    const f = FURNITURE_BY_ID[g.id]
    const cols = f.kind === 'wall' ? ROOM.wallCols : ROOM.cols
    const rows = f.kind === 'wall' ? ROOM.wallRows : ROOM.rows
    g.x = clamp(Math.round(x), 0, cols - f.w)
    g.y = clamp(Math.round(y), 0, rows - f.h)
    this.revalidateGhost()
  }

  // ------------------------------------------------------------ internals

  private flashInvalid = 0

  private samePlace(g: GhostInfo) {
    const p = this.house.placed.find((q) => q.uid === g.uid)
    return !!p && p.x === g.x && p.y === g.y && !!p.flip === g.flip
  }

  private defaultSpotNear(f: Furniture): { x: number; y: number } {
    if (f.kind === 'wall') return { x: Math.floor((ROOM.wallCols - f.w) / 2), y: 1 }
    const tx = Math.floor(this.player.x / TILE_W)
    const ty = Math.floor((this.player.y - FLOOR_Y) / TILE_H)
    return { x: clamp(tx - Math.floor(f.w / 2), 0, ROOM.cols - f.w), y: clamp(ty + 1, 0, ROOM.rows - f.h) }
  }

  private revalidateGhost() {
    const g = this.ghost
    if (!g) return
    g.valid = canPlace(this.house, g.id, g.x, g.y, g.uid)
    this.cb.onGhostChange?.({ ...g })
  }

  private rebuild() {
    this.grid = new NavGrid(ROOM_W, FLOOR_H, 4)
    // Keep feet a little off the skirting board.
    this.grid.block({ x: 0, y: 0, w: ROOM_W, h: 4 })
    this.boxes = []
    for (const p of this.house.placed) {
      const f = FURNITURE_BY_ID[p.id]
      if (!f) continue
      const { fx, fy } = this.footWorld(p, f)
      const s = furnitureSprite(p.id, !!p.flip, 0)
      const o = furnitureOrigin(p.id)
      this.boxes.push({ p, f, sx: fx - o.ox, sy: fy - o.oy, sw: s.w, sh: s.h, fx, fy })
      if (f.kind === 'floor') this.grid.block({ x: p.x * TILE_W, y: p.y * TILE_H, w: f.w * TILE_W, h: f.h * TILE_H }, 1)
    }
  }

  private footWorld(p: { x: number; y: number }, f: Furniture): { fx: number; fy: number } {
    if (f.kind === 'wall') return { fx: p.x * WALL_TILE, fy: p.y * WALL_TILE }
    return { fx: p.x * TILE_W, fy: FLOOR_Y + p.y * TILE_H }
  }

  private unstick() {
    const p = this.player
    if (!this.grid.freeAt(p.x, p.y - FLOOR_Y)) {
      const free = this.grid.nearestFree(p.x, p.y - FLOOR_Y)
      if (free) {
        p.x = free[0]
        p.y = free[1] + FLOOR_Y
      }
      p.path = []
    }
  }

  private itemOn(uid: string): boolean {
    const t = this.toggles.get(uid)
    if (t !== undefined) return t
    const p = this.house.placed.find((q) => q.uid === uid)
    const f = p && FURNITURE_BY_ID[p.id]
    if (f?.interact === 'lamp') return this.phase === 'night' || this.phase === 'dusk'
    return false
  }

  private walkTo(x: number, y: number, face?: Facing, uid?: string) {
    this.sitting = null
    this.pose = null
    const path = this.grid.find(this.player.x, this.player.y - FLOOR_Y, x, y - FLOOR_Y)
    this.target = uid || face ? { uid: uid ?? '', face: face ?? this.player.facing } : null
    if (path && path.length) {
      this.player.path = path.map(([px, py]) => [px, py + FLOOR_Y] as [number, number])
    } else {
      this.player.path = []
      if (this.target) this.arrive()
    }
  }

  private approachPoint(b: ItemBox): { x: number; y: number; face: Facing } {
    const f = b.f
    const cands: { x: number; y: number; face: Facing; pri: number }[] = []
    if (f.kind === 'wall') {
      const cx = b.fx + (f.w * WALL_TILE) / 2
      for (const dx of [0, -10, 10, -20, 20]) cands.push({ x: cx + dx, y: FLOOR_Y + 7, face: 'up', pri: Math.abs(dx) / 10 })
      if (b.p.id === 'door') cands.unshift({ x: cx, y: FLOOR_Y + 7, face: 'up', pri: -1 })
    } else {
      const rx = b.p.x * TILE_W
      const ry = FLOOR_Y + b.p.y * TILE_H
      const rw = f.w * TILE_W
      const rh = f.h * TILE_H
      const cx = rx + rw / 2
      cands.push({ x: cx, y: ry + rh + 5, face: 'up', pri: 0 })
      if (rw > 20) {
        cands.push({ x: rx + 7, y: ry + rh + 5, face: 'up', pri: 0.5 })
        cands.push({ x: rx + rw - 7, y: ry + rh + 5, face: 'up', pri: 0.5 })
      }
      cands.push({ x: rx - 6, y: ry + rh - 3, face: 'right', pri: 1 })
      cands.push({ x: rx + rw + 6, y: ry + rh - 3, face: 'left', pri: 1 })
      if (b.p.y > 0) cands.push({ x: cx, y: ry - 3, face: 'down', pri: 2 })
    }
    const px = this.player.x
    const py = this.player.y
    let best: { x: number; y: number; face: Facing } | null = null
    let bestScore = Infinity
    for (const c of cands) {
      if (c.x < 2 || c.x > ROOM_W - 2 || c.y < FLOOR_Y + 3 || c.y > ROOM_H - 2) continue
      if (!this.grid.freeAt(c.x, c.y - FLOOR_Y)) continue
      const path = this.grid.find(px, py - FLOOR_Y, c.x, c.y - FLOOR_Y)
      if (!path) continue
      const score = c.pri * 40 + Math.hypot(c.x - px, c.y - py) * 0.3
      if (score < bestScore) {
        bestScore = score
        best = c
      }
    }
    if (best) return best
    const n = this.grid.nearestFree(b.fx + b.sw / 2, Math.max(4, b.fy + b.sh - FLOOR_Y)) ?? [px, py - FLOOR_Y]
    return { x: n[0], y: n[1] + FLOOR_Y, face: 'up' }
  }

  private arrive() {
    const t = this.target
    this.target = null
    if (!t) return
    this.player.facing = t.face
    if (!t.uid) return
    const b = this.boxes.find((q) => q.p.uid === t.uid)
    if (!b) return
    this.react(b)
    this.cb.onInteract?.(b.f.interact ?? null, b.p.uid)
  }

  private react(b: ItemBox) {
    const f = b.f
    const uid = b.p.uid
    this.pokes.set(uid, 0)
    const cx = b.sx + b.sw / 2
    const top = b.sy + 4
    const seat = f.tags?.includes('seat') || f.interact === 'bed'
    switch (f.interact) {
      case 'fan':
      case 'tv':
      case 'music':
      case 'lamp': {
        const on = !this.itemOn(uid)
        this.toggles.set(uid, on)
        if (on) this.particles.sparkles(cx, top + 6, 5, f.interact === 'tv' ? '#bfe3ff' : '#fff6a8', 8)
        break
      }
      case 'window':
        this.sheerTarget = this.sheerTarget > 0.5 ? 0.12 : 0.9
        break
      case 'cat':
        this.particles.hearts(cx, top, 3)
        this.glyph('z', cx + 4, top)
        break
      case 'plant':
        this.particles.sparkles(cx, top + 4, 6, '#b4e486', 8)
        this.particles.add({ kind: 'leaf', x: cx, y: top + 2, vx: rand(-8, 8), vy: -6, g: 20, max: 1.4, color: '#6cbf5c', color2: '#43905a' })
        break
      case 'aquarium':
        this.particles.hearts(cx, top - 2, 2, '#78d2e2')
        break
      case 'altar':
        this.pose = { pose: 'wai', view: 'back', until: this.time + 3.5 }
        this.particles.sparkles(cx, b.sy + 10, 10, '#fff3a6', 12)
        break
      case 'workbench':
        this.particles.sparkles(cx, top + 6, 6, '#ffe8b0', 10)
        this.particles.popText(cx, top, '+', '#fff2a0')
        break
      case 'wardrobe':
        this.particles.sparkles(cx, b.sy + 30, 8, '#ffffff', 12)
        break
      case 'door':
        this.doorOpen = 1.4
        break
      case 'bed':
        this.glyph('z', cx + 6, top + 4)
        break
      default:
        this.particles.hearts(cx, top, 1)
        this.particles.sparkles(cx, top + 6, 4, '#fff6a8', 8)
    }
    if (seat) {
      const sx = b.fx + (f.w * TILE_W) / 2
      const sy = f.interact === 'bed' ? b.fy + f.h * TILE_H - 4 : b.fy + f.h * TILE_H - 2
      this.sitting = { uid, x: sx, y: sy }
      this.player.facing = 'down'
    }
  }

  private glyph(kind: Glyph['kind'], x: number, y: number, color = '#fffaf0') {
    this.glyphs.push({ kind, x, y, vx: rand(-3, 3), vy: -9, life: 1.6, max: 1.6, color })
  }

  // ------------------------------------------------------------ layout

  resize(w: number, h: number) {
    this.vw = w
    this.vh = h
    this.buf.resize(Math.max(16, w), Math.max(16, h))
  }

  /** World centre and zoom for the current frame. */
  private view(): { cx: number; cy: number; z: number; scx: number; scy: number } {
    const availH = Math.max(40, this.vh - this.insetTop - this.insetBottom)
    const scx = this.vw / 2
    const scy = this.insetTop + availH / 2
    // Room framing.
    let rcx = BOUNDS.x + BOUNDS.w / 2
    let rcy = BOUNDS.y + BOUNDS.h / 2
    if (BOUNDS.w - this.vw > 24) rcx = clamp(this.player.x, BOUNDS.x + this.vw / 2, BOUNDS.x + BOUNDS.w - this.vw / 2)
    if (BOUNDS.h > availH) rcy = clamp(this.player.y - 10, BOUNDS.y + availH / 2, BOUNDS.y + BOUNDS.h - availH / 2)
    // Mirror close-up.
    const mz = clamp(Math.floor(Math.min(this.vw / MIRROR_FOCUS.w, availH / MIRROR_FOCUS.h)), 2, 4)
    const mcx = MIRROR_FOCUS.x + MIRROR_FOCUS.w / 2
    const mcy = MIRROR_FOCUS.y + MIRROR_FOCUS.h / 2
    const k = easeInOutSine(this.zoomT)
    return { cx: rcx + (mcx - rcx) * k, cy: rcy + (mcy - rcy) * k, z: 1 + (mz - 1) * k, scx, scy }
  }

  private toWorld(sx: number, sy: number): [number, number] {
    return [this.camX + sx / this.z, this.camY + sy / this.z]
  }

  // ------------------------------------------------------------ input

  pointer(e: PointerInfo) {
    if (this.paused || this.focus === 'mirror' || this.zoomT > 0.01) return
    const [wx, wy] = this.toWorld(e.x, e.y)
    if (this.mode === 'edit') return this.editPointer(e, wx, wy)
    if (e.type === 'down') this.drag = { kind: 'tap', sx: e.x, sy: e.y }
    else if (e.type === 'up') {
      const d = this.drag
      this.drag = null
      if (d?.kind === 'tap' && Math.hypot(e.x - d.sx, e.y - d.sy) < 8) this.liveTap(wx, wy)
    } else if (e.type === 'cancel') this.drag = null
  }

  private liveTap(wx: number, wy: number) {
    this.tapFx = { x: wx, y: wy, t: 0.4 }
    const b = this.hit(wx, wy, false)
    if (b) {
      const a = this.approachPoint(b)
      if (Math.hypot(a.x - this.player.x, a.y - this.player.y) < 3 && !this.sitting) {
        this.target = { uid: b.p.uid, face: a.face }
        this.arrive()
      } else this.walkTo(a.x, a.y, a.face, b.p.uid)
      return
    }
    const fy = clamp(wy, FLOOR_Y + 5, ROOM_H - 3)
    this.walkTo(clamp(wx, 3, ROOM_W - 3), fy)
  }

  /** Topmost item under a world point. */
  private hit(wx: number, wy: number, includeRugs: boolean): ItemBox | null {
    const order = this.drawOrder()
    for (let i = order.length - 1; i >= 0; i--) {
      const b = order[i]
      if (b.f.kind === 'rug' && !includeRugs) continue
      if (wx < b.sx || wy < b.sy || wx >= b.sx + b.sw || wy >= b.sy + b.sh) continue
      if (WINDOW_IDS.has(b.p.id) || this.opaqueAt(b, wx, wy)) return b
    }
    return null
  }

  private opaqueAt(b: ItemBox, wx: number, wy: number): boolean {
    const s = furnitureSprite(b.p.id, !!b.p.flip, 0)
    const x = Math.floor(wx - b.sx)
    const y = Math.floor(wy - b.sy)
    // Be generous: accept a hit within 1px of an opaque pixel.
    const ctx = s.canvas.getContext('2d')!
    const x0 = clamp(x - 1, 0, s.w - 1)
    const y0 = clamp(y - 1, 0, s.h - 1)
    const w = Math.min(3, s.w - x0)
    const h = Math.min(3, s.h - y0)
    const d = ctx.getImageData(x0, y0, w, h).data
    for (let i = 3; i < d.length; i += 4) if (d[i] > 20) return true
    return false
  }

  private editPointer(e: PointerInfo, wx: number, wy: number) {
    if (e.type === 'down') {
      if (this.ghost) {
        const btn = this.ghostButtonAt(wx, wy)
        if (btn) {
          this.drag = { kind: 'button', which: btn }
          return
        }
        const r = this.ghostRect(this.ghost)
        const inside = wx >= r.x - 2 && wy >= r.y - 2 && wx < r.x + r.w + 2 && wy < r.y + r.h + 2
        const [ox, oy] = this.ghostOrigin(this.ghost)
        const f = FURNITURE_BY_ID[this.ghost.id]
        const [tw, th] = f.kind === 'wall' ? [WALL_TILE, WALL_TILE] : [TILE_W, TILE_H]
        this.drag = inside ? { kind: 'ghost', offX: wx - ox, offY: wy - oy } : { kind: 'ghost', offX: (f.w * tw) / 2, offY: (f.h * th) / 2 }
        if (!inside) this.moveGhostTo(wx, wy)
        return
      }
      const b = this.hit(wx, wy, true)
      if (b && !b.f.fixed) this.drag = { kind: 'pick', uid: b.p.uid, sx: e.x, sy: e.y, offX: wx - b.fx, offY: wy - b.fy }
      else {
        if (b?.f.fixed) this.flash = { uid: b.p.uid, t: 0.35 }
        this.drag = null
      }
      return
    }
    if (e.type === 'move') {
      const d = this.drag
      if (!d) return
      if (d.kind === 'pick' && Math.hypot(e.x - d.sx, e.y - d.sy) > 5) {
        this.startMoving(d.uid)
        this.drag = { kind: 'ghost', offX: d.offX, offY: d.offY }
      }
      if (this.drag?.kind === 'ghost') this.moveGhostTo(wx, wy)
      return
    }
    if (e.type === 'up') {
      const d = this.drag
      this.drag = null
      if (d?.kind === 'pick') {
        this.flash = { uid: d.uid, t: 0.35 }
        this.cb.onEditPick?.(d.uid)
      } else if (d?.kind === 'button') {
        const btn = this.ghostButtonAt(wx, wy)
        if (btn === d.which) {
          if (btn === 'ok') this.confirmGhost()
          else if (btn === 'flip') this.flipGhost()
          else this.cancelPlacing()
        }
      }
      return
    }
    this.drag = null
  }

  private moveGhostTo(wx: number, wy: number) {
    const g = this.ghost
    const d = this.drag
    if (!g || !d || d.kind !== 'ghost') return
    const f = FURNITURE_BY_ID[g.id]
    let nx: number
    let ny: number
    if (f.kind === 'wall') {
      nx = Math.round((wx - d.offX) / WALL_TILE)
      ny = Math.round((wy - d.offY) / WALL_TILE)
      nx = clamp(nx, 0, ROOM.wallCols - f.w)
      ny = clamp(ny, 0, ROOM.wallRows - f.h)
    } else {
      nx = Math.round((wx - d.offX) / TILE_W)
      ny = Math.round((wy - d.offY - FLOOR_Y) / TILE_H)
      nx = clamp(nx, 0, ROOM.cols - f.w)
      ny = clamp(ny, 0, ROOM.rows - f.h)
    }
    if (nx !== g.x || ny !== g.y) {
      g.x = nx
      g.y = ny
      this.revalidateGhost()
    }
  }

  private ghostOrigin(g: GhostInfo): [number, number] {
    const f = FURNITURE_BY_ID[g.id]
    const { fx, fy } = this.footWorld(g, f)
    return [fx, fy]
  }

  private ghostRect(g: GhostInfo): { x: number; y: number; w: number; h: number } {
    const [fx, fy] = this.ghostOrigin(g)
    const s = furnitureSprite(g.id, g.flip, 0)
    const o = furnitureOrigin(g.id)
    return { x: fx - o.ox, y: fy - o.oy, w: s.w, h: s.h }
  }

  private ghostButtons(): { which: 'ok' | 'flip' | 'cancel'; x: number; y: number }[] {
    if (!this.ghost || !this.showGhostButtons) return []
    const r = this.ghostRect(this.ghost)
    const cx = r.x + r.w / 2
    let y = r.y - 15
    if (y < BOUNDS.y + 1) y = r.y + r.h + 3
    const xs = [cx - 20, cx - 6, cx + 8]
    const lo = Math.max(BOUNDS.x + 1, Math.ceil(this.camX) + 1)
    const hi = Math.min(BOUNDS.x + BOUNDS.w - 13, Math.floor(this.camX + this.vw / this.z) - 14)
    const shift = xs[0] < lo ? lo - xs[0] : xs[2] > hi ? hi - xs[2] : 0
    return (['cancel', 'flip', 'ok'] as const).map((which, i) => ({ which, x: Math.round(xs[i] + shift), y: Math.round(y) }))
  }

  private ghostButtonAt(wx: number, wy: number): 'ok' | 'flip' | 'cancel' | null {
    for (const b of this.ghostButtons()) if (wx >= b.x - 1 && wy >= b.y - 1 && wx < b.x + 13 && wy < b.y + 13) return b.which
    return null
  }

  // ------------------------------------------------------------ update

  update(dt: number, t: number) {
    this.time = t
    this.phase = this.phaseOverride ?? currentPhase()
    const zTarget = this.focus === 'mirror' ? 1 : 0
    this.zoomT = zTarget > this.zoomT ? Math.min(1, this.zoomT + dt / 0.6) : Math.max(0, this.zoomT - dt / 0.5)
    this.sheerOpen += (this.sheerTarget - this.sheerOpen) * Math.min(1, dt * 2.5)
    for (const [k, v] of this.pokes) this.pokes.set(k, v + dt)
    if (this.tapFx && (this.tapFx.t -= dt) <= 0) this.tapFx = null
    if (this.flash && (this.flash.t -= dt) <= 0) this.flash = null
    if (this.flashInvalid > 0) this.flashInvalid -= dt
    if (this.reflectHappy > 0) this.reflectHappy -= dt
    if (this.doorOpen > 0) this.doorOpen -= dt
    if (this.pose && this.time > this.pose.until) this.pose = null
    if (this.paused) return
    if (this.mode === 'live' && !this.sitting) {
      const arrived = this.player.walk(dt)
      if (arrived) this.arrive()
    }
    // Fans spin up and down smoothly.
    for (const b of this.boxes) {
      if (b.f.interact !== 'fan') continue
      const cur = this.fanSpin.get(b.p.uid) ?? 0
      const on = this.itemOn(b.p.uid)
      this.fanSpin.set(b.p.uid, on ? Math.min(1, cur + dt * 0.8) : Math.max(0, cur - dt * 0.5))
      if (on && Math.random() < dt * 3) {
        const dir = b.p.flip ? -1 : 1
        this.glyphs.push({ kind: 'wind', x: b.fx + 8 + dir * 8, y: b.sy + 10 + rand(-3, 3), vx: dir * 26, vy: rand(-2, 2), life: 0.9, max: 0.9, color: '#ffffff' })
      }
    }
    // Ambient life.
    for (const b of this.boxes) {
      const i = b.f.interact
      if (i === 'music' && this.itemOn(b.p.uid) && Math.random() < dt * 2.2) {
        const cols = ['#ff9fc0', '#ffd23f', '#78d2e2', '#b4e486', '#bea2f5']
        this.glyphs.push({ kind: 'note', x: b.sx + b.sw / 2 + rand(-4, 4), y: b.sy + 2, vx: rand(-5, 5), vy: rand(-14, -9), life: 1.8, max: 1.8, color: cols[Math.floor(Math.random() * cols.length)] })
      }
      if (i === 'cat' && Math.random() < dt * 0.35) this.glyph('z', b.sx + b.sw / 2 + 3, b.sy + 2, '#e2e8ff')
    }
    for (let k = this.glyphs.length - 1; k >= 0; k--) {
      const gl = this.glyphs[k]
      gl.life -= dt
      if (gl.life <= 0) {
        this.glyphs.splice(k, 1)
        continue
      }
      gl.x += (gl.vx + (gl.kind === 'note' ? Math.sin(gl.life * 5) * 6 : 0)) * dt
      gl.y += gl.vy * dt
    }
    this.particles.update(dt)
  }

  // ------------------------------------------------------------ render

  private drawOrder(): ItemBox[] {
    const wall: ItemBox[] = []
    const rugs: ItemBox[] = []
    const floor: ItemBox[] = []
    for (const b of this.boxes) (b.f.kind === 'wall' ? wall : b.f.kind === 'rug' ? rugs : floor).push(b)
    const key = (b: ItemBox) => b.fy + b.f.h * TILE_H
    rugs.sort((a, b) => key(a) - key(b))
    floor.sort((a, b) => key(a) - key(b))
    return [...wall, ...rugs, ...floor]
  }

  render(g: Surface) {
    const v = this.view()
    this.z = v.z
    this.camX = v.cx - v.scx / v.z
    this.camY = v.cy - v.scy / v.z
    if (v.z === 1) {
      const ix = Math.round(this.camX)
      const iy = Math.round(this.camY)
      this.camX = ix
      this.camY = iy
      this.renderWorld(g, ix, iy, this.vw, this.vh)
      return
    }
    const bw = Math.ceil(this.vw / v.z) + 2
    const bh = Math.ceil(this.vh / v.z) + 2
    this.buf.resize(bw, bh)
    const ix = Math.floor(this.camX)
    const iy = Math.floor(this.camY)
    this.buf.reset()
    this.renderWorld(this.buf, ix, iy, bw, bh)
    g.clear('#2b2340')
    g.ctx.imageSmoothingEnabled = false
    g.ctx.drawImage(this.buf.canvas, 0, 0, bw, bh, Math.round((ix - this.camX) * v.z), Math.round((iy - this.camY) * v.z), bw * v.z, bh * v.z)
  }

  private night() {
    return this.phase === 'night' || this.phase === 'dusk'
  }

  private shell(): HTMLCanvasElement {
    const key = `${this.house.room}|${this.house.wallpaper}|${this.house.floor}`
    if (this.shellCache?.key === key) return this.shellCache.canvas
    const canvas = bake(ROOM_W, ROOM_H, (s) => {
      drawWallpaper(s, this.house.wallpaper, 0, 0, ROOM_W, WALL_H)
      drawRoomTrim(s, this.house.room, ROOM_W, WALL_H)
      drawBaseboard(s, this.house.wallpaper, 0, WALL_H - 4, ROOM_W)
      drawFloor(s, this.house.floor, 0, FLOOR_Y, ROOM_W, FLOOR_H)
      // Soft contact shadow where the floor meets the wall.
      s.alpha(0.18)
      s.rect(0, FLOOR_Y, ROOM_W, 2, '#6e4a35')
      s.alpha(0.08)
      s.rect(0, FLOOR_Y + 2, ROOM_W, 2, '#6e4a35')
      s.rect(0, FLOOR_Y, 3, FLOOR_H, '#6e4a35')
      s.rect(ROOM_W - 3, FLOOR_Y, 3, FLOOR_H, '#6e4a35')
      s.alpha(1)
      // Slippers by the door (ถอดรองเท้าก่อนเข้าบ้าน).
      const sx = 136
      const sy = FLOOR_Y + 4
      for (const [ox, c, cd] of [
        [0, '#ff9fc0', '#e8709e'],
        [11, '#78d2e2', '#47a6cb'],
      ] as const) {
        for (const k of [0, 4]) {
          s.rect(sx + ox + k, sy, 3, 6, c)
          s.hline(sx + ox + k, sx + ox + k + 2, sy + 1, cd)
          s.px(sx + ox + k + 1, sy + 5, cd)
        }
      }
    })
    this.shellCache = { key, canvas }
    return canvas
  }

  private drawBackdrop(s: Surface, cx: number, cy: number, w: number, h: number) {
    const night = this.night()
    const bd = roomBackdrop(this.house.room, night)
    if (bd) return this.drawRoomBackdrop(s, bd, cx, cy, w, h, night)
    s.clear(night ? '#27264a' : '#f4e2cb')
    s.setCamera(cx, cy)
    // Building facade texture outside the cut-away.
    const c = night ? '#2f2e58' : '#efd9bd'
    const x0 = Math.floor(cx / 8) * 8
    const y0 = Math.floor(cy / 6) * 6
    for (let y = y0; y < cy + h; y += 6) s.hline(cx, cx + w, y, c)
    for (let y = y0; y < cy + h; y += 12) for (let x = x0 + ((y / 6) % 2 ? 4 : 0); x < cx + w; x += 16) s.vline(x, y + 1, y + 5, c)
    // Cut-away frame.
    const cut = night ? '#4a4574' : '#e9cfae'
    const cutL = night ? '#5a558a' : '#f6e3c8'
    s.rect(BOUNDS.x, BOUNDS.y, BOUNDS.w, BOUNDS.h, cut)
    s.rect(BOUNDS.x, BOUNDS.y, BOUNDS.w, 2, cutL)
    s.rect(BOUNDS.x, ROOM_H + 2, BOUNDS.w, FRAME_BOTTOM - 2, night ? '#3e3a66' : '#d9b994')
    s.hline(BOUNDS.x, BOUNDS.x + BOUNDS.w - 1, ROOM_H + 1, night ? '#5a558a' : '#f6e3c8')
    s.frame(BOUNDS.x - 1, BOUNDS.y - 1, BOUNDS.w + 2, BOUNDS.h + 2, P.ink)
    s.frame(-1, -1, ROOM_W + 2, ROOM_H + 2, P.ink)
  }

  /** Wooden, thatch or plaster outside walls for the regional rooms (river below the raft house). */
  private drawRoomBackdrop(s: Surface, bd: NonNullable<ReturnType<typeof roomBackdrop>>, cx: number, cy: number, w: number, h: number, night: boolean) {
    s.clear(bd.base)
    s.setCamera(cx, cy)
    const x0 = Math.floor(cx / 8) * 8
    const y0 = Math.floor(cy / 6) * 6
    if (bd.pattern === 'planks') {
      for (let y = y0; y < cy + h; y += 6) s.hline(cx, cx + w, y, bd.line)
      for (let y = y0; y < cy + h; y += 12) for (let x = x0 + ((y / 6) % 2 ? 12 : 0); x < cx + w; x += 24) s.vline(x, y + 1, y + 5, bd.line)
    } else if (bd.pattern === 'thatch') {
      for (let y = y0; y < cy + h; y += 4) for (let x = x0 + ((y / 4) % 2 ? 2 : 0); x < cx + w; x += 4) s.px(x, y, bd.line)
    } else {
      for (let y = y0; y < cy + h; y += 12) s.hline(cx, cx + w, y, bd.line)
    }
    if (bd.water) {
      const wy = ROOM_H + FRAME_BOTTOM
      s.rect(cx, wy, w, cy + h - wy, night ? '#2a3a68' : '#5aa8c8')
      for (let y = wy + 2; y < cy + h; y += 4) {
        const off = Math.round((this.time * 6 + y) % 12)
        for (let x = x0 - 12 + off; x < cx + w; x += 12) s.hline(x, x + 3, y, night ? '#3e5088' : '#8fd0e4')
      }
    }
    s.rect(BOUNDS.x, BOUNDS.y, BOUNDS.w, BOUNDS.h, bd.cut)
    s.rect(BOUNDS.x, BOUNDS.y, BOUNDS.w, 2, bd.cutL)
    s.rect(BOUNDS.x, ROOM_H + 2, BOUNDS.w, FRAME_BOTTOM - 2, bd.sill)
    s.hline(BOUNDS.x, BOUNDS.x + BOUNDS.w - 1, ROOM_H + 1, bd.cutL)
    s.frame(BOUNDS.x - 1, BOUNDS.y - 1, BOUNDS.w + 2, BOUNDS.h + 2, P.ink)
    s.frame(-1, -1, ROOM_W + 2, ROOM_H + 2, P.ink)
  }

  /** Draw the whole room with the camera's top-left at world (cx, cy). */
  renderWorld(s: Surface, cx: number, cy: number, w: number, h: number) {
    const t = this.time
    const phase = this.phase
    const night = this.night()
    this.drawBackdrop(s, cx, cy, w, h)
    s.setCamera(cx, cy)
    s.draw(this.shell(), 0, 0)
    // Window: sky and view, then the frame and curtains / shutters / blinds.
    const breeze = Math.max(0, ...[...this.fanSpin.values()])
    const wi = this.windowInfo()
    if (wi?.classic) {
      drawWindowGlass(s, phase, t, t)
      this.drawSunPatch(s, phase, 'floor', wi.glass)
      drawWindowFrame(s, t, this.sheerOpen, breeze)
    } else if (wi && wi.def.view) {
      drawRoomView(s, wi.def.view, phase, t, wi.glass, wi.def.frame === 'arch')
      this.drawSunPatch(s, phase, 'floor', wi.glass)
      drawRoomFrame(s, wi.def.frame, t, this.sheerOpen, wi.glass, wi.win)
    }

    const order = this.drawOrder()
    const fx = (b: ItemBox, emissive: boolean) => {
      const st: FxState = { on: this.itemOn(b.p.uid), poke: this.pokes.get(b.p.uid) ?? 99 }
      drawFurnitureFx(s, b.p.id, b.fx, b.fy, !!b.p.flip, t, st, emissive)
    }
    const drawItem = (b: ItemBox) => {
      if (this.ghost?.uid === b.p.uid) return
      const fr = this.frameFor(b)
      const sp = furnitureSprite(b.p.id, !!b.p.flip, fr)
      const o = furnitureOrigin(b.p.id)
      if (b.f.kind === 'floor' && b.f.id !== 'wardrobe_mirror') this.contactShadow(s, b)
      s.draw(sp.canvas, b.fx - o.ox, b.fy - o.oy)
      if (b.p.id === 'wardrobe_mirror') this.drawReflection(s, b)
      fx(b, false)
      if (this.flash?.uid === b.p.uid) {
        s.alpha(0.5 * (this.flash.t / 0.35))
        s.blend('lighter')
        s.draw(sp.canvas, b.fx - o.ox, b.fy - o.oy)
        s.reset()
      }
    }
    // Wall items and rugs sit behind everything standing on the floor.
    let i = 0
    for (; i < order.length && order[i].f.kind !== 'floor'; i++) {
      if (WINDOW_IDS.has(order[i].p.id)) continue
      if (order[i].p.id === 'door' && this.doorOpen > 0) {
        const b = order[i]
        const sp = furnitureSprite('door', false, 1)
        const o = furnitureOrigin('door')
        s.draw(sp.canvas, b.fx - o.ox, b.fy - o.oy)
        continue
      }
      drawItem(order[i])
    }
    // Y-sorted floor items and the player.
    type D = { y: number; draw: () => void }
    const list: D[] = []
    for (; i < order.length; i++) {
      const b = order[i]
      list.push({ y: b.fy + b.f.h * TILE_H, draw: () => drawItem(b) })
    }
    if (!this.hidePlayer) {
      const py = this.sitting ? this.sitting.y + 0.5 : this.player.y + 0.1
      list.push({ y: py, draw: () => this.drawPlayer(s) })
    }
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()

    if (wi) this.drawSunPatch(s, phase, 'air', wi.glass)
    this.particles.render(s)
    this.drawGlyphs(s)

    // Lighting.
    const tint = INDOOR_TINT[phase]
    if (tint) {
      s.ctx.save()
      s.ctx.globalCompositeOperation = 'multiply'
      s.ctx.globalAlpha = tint.a
      s.ctx.fillStyle = tint.c
      s.ctx.fillRect(0, 0, s.w, s.h)
      s.ctx.restore()
    }
    if (night) {
      // The ceiling light is on: a warm pool in the middle of the room.
      softGlow(s, ROOM_W / 2, FLOOR_Y + 10, 110, phase === 'night' ? 0.7 : 0.4, '#ffcf8a')
      if (wi?.classic) drawWindowEmissive(s, phase, t, t, this.sheerOpen)
      else if (wi?.def.view && this.sheerOpen > 0.45) drawRoomViewEmissive(s, wi.def.view, phase, t, wi.glass, wi.def.frame === 'arch')
    }
    for (const b of order) {
      if (this.ghost?.uid === b.p.uid) continue
      fx(b, true)
      this.drawItemGlow(s, b, night)
    }

    // Overlays.
    if (this.mode === 'edit') this.drawEditOverlay(s)
    else if (this.showMarkers && this.focus === 'room' && this.zoomT < 0.01) this.drawMarkers(s)
    if (this.tapFx) {
      const r = (0.4 - this.tapFx.t) * 20
      s.alpha(this.tapFx.t / 0.4)
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2
        s.px(this.tapFx.x + Math.cos(ang) * r, this.tapFx.y + Math.sin(ang) * r * 0.5, '#fffaf0')
      }
      s.alpha(1)
    }
    s.setCamera(0, 0)
  }

  private frameFor(b: ItemBox): number {
    const t = this.time
    const id = b.p.id
    const n = furnitureFrameCount(id)
    if (n === 1) return 0
    const seed = (b.p.x * 7 + b.p.y * 13) * 0.37
    switch (b.f.interact) {
      case 'plant': {
        const poked = (this.pokes.get(b.p.uid) ?? 99) < 1.2
        const seq = [1, 2, 1, 0]
        return seq[Math.floor(t * (poked ? 8 : 1.4) + seed) % 4]
      }
      case 'fan': {
        const spin = this.fanSpin.get(b.p.uid) ?? 0
        if (spin <= 0.02) return 0
        return 1 + (Math.floor(t * (4 + spin * 16)) % 3)
      }
      case 'music':
        return this.itemOn(b.p.uid) ? Math.floor(t * 4) % 2 : 0
      case 'lamp':
        return this.itemOn(b.p.uid) ? 1 : 0
      case 'cat': {
        const breathe = Math.sin(t * 2.2 + seed) > 0 ? 1 : 0
        const tail = Math.sin(t * 0.9 + seed * 3) > 0.85 ? 2 : 0
        return breathe + tail
      }
    }
    if (id === 'clock_wall' || id === 'altar_shelf') return 1
    return 0
  }

  private contactShadow(s: Surface, b: ItemBox) {
    const w = b.f.w * TILE_W
    s.ctx.save()
    s.ctx.globalAlpha = 0.16
    s.ctx.fillStyle = '#3a2838'
    s.ctx.fillRect(b.fx + 1 - s.ox, b.fy + b.f.h * TILE_H - 2 - s.oy, w - 1, 3)
    s.ctx.restore()
  }

  private drawPlayer(s: Surface) {
    const p = this.player
    let view: View
    let flip = false
    let pose: Pose
    let x = p.x
    let y = p.y
    if (this.sitting) {
      view = 'front'
      pose = 'sit'
      x = this.sitting.x
      y = this.sitting.y
    } else if (this.pose) {
      view = this.pose.view
      pose = this.pose.pose
    } else {
      const v = viewOf(p.facing)
      view = v.view
      flip = v.flip
      pose = p.moving ? WALK_CYCLE[Math.floor(p.animT * 8) % 4] : 'stand'
    }
    const sp = avatarSprite(this.look, view, pose, { flip })
    if (this.mode === 'edit') s.alpha(0.35)
    if (!this.sitting) drawShadow(s, x, y, 6, 2)
    s.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1))
    s.alpha(1)
  }

  /** The player's reflection in the wardrobe mirror (front/back swapped). */
  private drawReflection(s: Surface, b: ItemBox) {
    if (this.hidePlayer) return
    const p = this.player
    const x = this.sitting ? this.sitting.x : p.x
    const y = this.sitting ? this.sitting.y : p.y
    const plane = b.fy + TILE_H
    const d = y - plane
    if (d < 0 || d > 40 || x < b.fx - 14 || x > b.fx + 46) return
    let view: View = 'back'
    let flip = false
    let pose: Pose = 'stand'
    if (this.sitting) {
      view = 'back'
      pose = 'sit'
    } else {
      const v = viewOf(p.facing)
      view = v.view === 'front' ? 'back' : v.view === 'back' ? 'front' : 'side'
      flip = v.flip
      pose = p.moving ? WALK_CYCLE[Math.floor(p.animT * 8) % 4] : this.reflectHappy > 0 && view === 'front' ? 'happy' : 'stand'
      if (this.pose) pose = this.pose.pose === 'wai' ? 'wai' : pose
    }
    const sp = avatarSprite(this.look, view, pose, { flip })
    const ry = plane - d * 0.9 - 2
    s.ctx.save()
    s.ctx.beginPath()
    const m0 = WARDROBE_MIRRORS[0]
    const m1 = WARDROBE_MIRRORS[WARDROBE_MIRRORS.length - 1]
    s.ctx.rect(b.fx + m0.x - s.ox, b.fy + m0.y - s.oy, m1.x + m1.w - m0.x, m0.h)
    s.ctx.clip()
    s.alpha(0.9)
    s.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(ry - sp.h + 1))
    s.ctx.globalAlpha = 0.18
    s.ctx.fillStyle = '#cfe6ee'
    for (const m of WARDROBE_MIRRORS) s.ctx.fillRect(b.fx + m.x - s.ox, b.fy + m.y - s.oy, m.w, m.h)
    // Keep a shine streak over the reflection.
    s.ctx.globalAlpha = 0.5
    for (const m of WARDROBE_MIRRORS) for (let k = 0; k < 10; k++) s.ctx.fillRect(b.fx + m.x + 2 + k - s.ox, b.fy + m.y + 16 - k - s.oy, 2, 1)
    s.ctx.restore()
    s.reset()
  }

  /** Sunlight (or moonlight) through the big window: a patch on the floor and faint shafts in the air. */
  private drawSunPatch(s: Surface, phase: Phase, layer: 'floor' | 'air', glass: Rect = GLASS) {
    const cfg: Record<Phase, { c: string; a: number; len: number; skew: number }> = {
      dawn: { c: '#ffd0b8', a: 0.2, len: 40, skew: -22 },
      day: { c: '#fff4c8', a: 0.22, len: 34, skew: 14 },
      golden: { c: '#ffc070', a: 0.26, len: 52, skew: 30 },
      dusk: { c: '#d8a0d0', a: 0.12, len: 40, skew: 24 },
      night: { c: '#9fb4ff', a: 0.1, len: 34, skew: 10 },
    }
    const k = cfg[phase]
    const x0 = glass.x
    const x1 = glass.x + glass.w
    const y0 = FLOOR_Y
    const covered = 1 - this.sheerOpen * 0.5
    s.ctx.save()
    s.ctx.globalCompositeOperation = phase === 'night' ? 'lighter' : 'screen'
    s.ctx.fillStyle = k.c
    if (layer === 'floor') {
      s.ctx.globalAlpha = k.a * (1.1 - covered * 0.4)
      s.ctx.beginPath()
      s.ctx.moveTo(x0 - s.ox, y0 - s.oy)
      s.ctx.lineTo(x1 - s.ox, y0 - s.oy)
      s.ctx.lineTo(x1 + k.skew - s.ox, y0 + k.len - s.oy)
      s.ctx.lineTo(x0 + k.skew - s.ox, y0 + k.len - s.oy)
      s.ctx.closePath()
      s.ctx.fill()
      // Window mullion shadows inside the patch.
      s.ctx.globalCompositeOperation = 'source-over'
      s.ctx.globalAlpha = 0.07
      s.ctx.fillStyle = '#6e4a35'
      const mid = glass.x + glass.w / 2
      for (let j = 0; j < k.len; j += 1) {
        const f = j / k.len
        s.ctx.fillRect(Math.round(mid + k.skew * f - 1 - s.ox), y0 + j - s.oy, 2, 1)
      }
      const ty = Math.round(y0 + k.len * 0.72)
      s.ctx.fillRect(Math.round(x0 + k.skew * 0.72 - s.ox), ty - s.oy, x1 - x0, 2)
    } else {
      if (phase === 'night' || phase === 'dusk') {
        s.ctx.restore()
        return
      }
      s.ctx.globalAlpha = 0.06
      s.ctx.beginPath()
      s.ctx.moveTo(x0 + 4 - s.ox, 6 - s.oy)
      s.ctx.lineTo(x1 - 4 - s.ox, 6 - s.oy)
      s.ctx.lineTo(x1 + k.skew - s.ox, y0 + k.len - s.oy)
      s.ctx.lineTo(x0 + k.skew - s.ox, y0 + k.len - s.oy)
      s.ctx.closePath()
      s.ctx.fill()
      s.ctx.restore()
      // Dust motes drifting in the light.
      const t = this.time
      for (let i = 0; i < 14; i++) {
        const f = ((i * 0.618 + t * 0.03 * (1 + (i % 3))) % 1 + 1) % 1
        const yy = 10 + f * (y0 + k.len - 14)
        const span = x1 - x0 - 8
        const xx = x0 + 4 + ((i * 37) % span) + (yy / (y0 + k.len)) * k.skew + Math.sin(t * 0.7 + i) * 2
        if (Math.sin(t * 1.3 + i * 2.1) > -0.2) {
          s.alpha(0.75)
          s.px(Math.round(xx), Math.round(yy), '#fff8dc')
          s.alpha(1)
        }
      }
      return
    }
    s.ctx.restore()
  }

  private drawItemGlow(s: Surface, b: ItemBox, night: boolean) {
    const id = b.p.id
    const on = this.itemOn(b.p.uid)
    const cx = b.sx + b.sw / 2
    const strength = night ? 1 : 0.35
    if (id === 'altar_shelf') {
      softGlow(s, b.fx + 8, b.fy + 12, 7, strength * 0.8, '#ffd27a')
      softGlow(s, b.fx + 26, b.fy + 12, 7, strength * 0.8, '#ffd27a')
      if (night) softGlow(s, b.fx + 16, b.fy + 12, 14, 0.5, '#ffe08a')
    } else if (id === 'altar_grand') {
      for (const [gx, gy, gr] of ALTAR_GLOW) softGlow(s, b.fx + gx, b.fy + gy, gr, strength * (gr > 10 ? 0.6 : 0.85), '#ffd27a')
    } else if (id === 's_lantern' && on) {
      softGlow(s, b.fx + 8, b.fy + 13, 14, night ? 1 : 0.35, '#ff8a5a')
      if (night) softGlow(s, b.fx + 8, b.fy + 20, 26, 0.5, '#ffb070')
    } else if (id === 'b_wfh' && on) {
      softGlow(s, b.fx + 13, b.fy - 16, 14, night ? 0.9 : 0.25, '#bfe3ff')
    } else if (id === 'altar_table') {
      softGlow(s, b.fx + 10, b.fy - 9, 7, strength * 0.8, '#ffd27a')
      softGlow(s, b.fx + 23, b.fy - 9, 7, strength * 0.8, '#ffd27a')
    } else if (b.f.interact === 'lamp' && on) {
      const ly = id === 'lamp_lanna' ? b.fy + 13 : id === 'lantern_oil' ? b.fy - 5 : b.fy - 17
      softGlow(s, cx, ly, id === 'lantern_oil' ? 16 : 20, night ? 1 : 0.4, '#ffcf7a')
      if (night) softGlow(s, cx, ly + 10, 34, 0.55, '#ffb866')
    } else if (id === 'tv_flat' && on) {
      softGlow(s, b.fx + TV_SCREEN.x + TV_SCREEN.w / 2, b.fy + TV_SCREEN.y + TV_SCREEN.h / 2, 18, night ? 0.9 : 0.25, '#bfe3ff')
    } else if (id === 'aquarium' && night) {
      softGlow(s, b.fx + 16, b.fy - 12, 14, 0.6, '#9fe6f2')
    }
  }

  private drawGlyphs(s: Surface) {
    for (const gl of this.glyphs) {
      const a = Math.min(1, gl.life / (gl.max * 0.4))
      s.alpha(a)
      const x = Math.round(gl.x)
      const y = Math.round(gl.y)
      if (gl.kind === 'wind') {
        s.alpha(a * 0.6)
        s.hline(x, x + 3, y, gl.color)
      } else {
        const rows = gl.kind === 'note' ? NOTE : ZED
        for (let r = 0; r < rows.length; r++)
          for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') s.px(x + c, y + r, gl.color)
      }
    }
    s.alpha(1)
  }

  private drawMarkers(s: Surface) {
    const icons: Record<string, string> = { door: 'temple', wardrobe_mirror: 'shirt', altar_shelf: 'wai', workbench: 'gear', altar_grand: 'wai', kitchen_counter: 'pan' }
    for (const b of this.boxes) {
      const icon = icons[b.p.id]
      if (!icon) continue
      const mx = b.p.id === 'altar_grand' ? b.sx + 10 : b.sx + b.sw / 2
      let my = b.sy - 1
      if (b.p.id === 'wardrobe_mirror') my = b.sy + 2
      if (b.p.id === 'altar_shelf') my = b.sy - 1
      if (b.p.id === 'door') my = b.sy + 1
      // Beside the big altar's arch rather than over the Buddha image.
      if (b.p.id === 'altar_grand') my = b.sy + 44
      // Don't cover the player's face.
      if (Math.abs(mx - this.player.x) < 11 && my > this.player.y - 38 && my < this.player.y + 2) continue
      const bob = Math.round(Math.sin(this.time * 2.4 + mx * 0.1) * 1.2)
      const m = markerSprite(icon)
      const bx = Math.round(mx - 6)
      const by = Math.round(my - 12 + bob)
      s.rect(bx + 1, by, 11, 11, '#fffaf0')
      s.rect(bx, by + 1, 13, 9, '#fffaf0')
      s.frame(bx, by + 1, 13, 9, P.ink)
      s.rect(bx + 1, by, 11, 1, P.ink)
      s.rect(bx + 1, by + 10, 11, 1, P.ink)
      s.px(bx + 6, by + 11, P.ink)
      s.rect(bx + 1, by + 1, 11, 9, '#fffaf0')
      s.draw(m.canvas, bx + 2, by + 1)
    }
  }

  private drawEditOverlay(s: Surface) {
    const gh = this.ghost
    const wallGhost = gh && FURNITURE_BY_ID[gh.id]?.kind === 'wall'
    // Floor grid.
    s.ctx.save()
    s.ctx.globalAlpha = wallGhost ? 0.18 : 0.4
    s.ctx.fillStyle = '#fffaf0'
    for (let c = 0; c <= ROOM.cols; c++) for (let y = FLOOR_Y; y < ROOM_H; y += 2) s.ctx.fillRect(c * TILE_W - s.ox, y - s.oy, 1, 1)
    for (let r = 0; r <= ROOM.rows; r++) for (let x = 0; x < ROOM_W; x += 2) s.ctx.fillRect(x - s.ox, FLOOR_Y + r * TILE_H - s.oy, 1, 1)
    // Wall grid.
    s.ctx.globalAlpha = wallGhost ? 0.45 : 0.14
    s.ctx.fillStyle = wallGhost ? '#fffaf0' : '#8a6a5a'
    for (let c = 0; c <= ROOM.wallCols; c++) for (let y = 0; y < WALL_H; y += 2) s.ctx.fillRect(c * WALL_TILE - s.ox, y - s.oy, 1, 1)
    for (let r = 0; r <= ROOM.wallRows; r++) for (let x = 0; x < ROOM_W; x += 2) s.ctx.fillRect(x - s.ox, r * WALL_TILE - s.oy, 1, 1)
    s.ctx.restore()
    // Built-ins get a small lock.
    for (const b of this.boxes) {
      if (!b.f.fixed || WINDOW_IDS.has(b.p.id)) continue
      const lx = Math.round(b.sx + 2)
      const ly = Math.round(b.p.id === 'wardrobe_mirror' ? b.sy + 4 : b.sy + 2)
      s.rect(lx, ly + 2, 5, 4, '#fffaf0')
      s.frame(lx - 1, ly + 1, 7, 6, P.ink)
      s.px(lx + 1, ly, P.ink)
      s.px(lx + 3, ly, P.ink)
      s.px(lx + 1, ly + 1, P.ink)
      s.px(lx + 3, ly + 1, P.ink)
      s.hline(lx + 1, lx + 3, ly - 1, P.ink)
      s.px(lx + 2, ly + 3, P.ink2)
    }
    if (!gh) return
    const f = FURNITURE_BY_ID[gh.id]
    const [fx, fy] = this.ghostOrigin(gh)
    const [tw, th] = f.kind === 'wall' ? [WALL_TILE, WALL_TILE] : [TILE_W, TILE_H]
    const ok = gh.valid
    const blink = this.flashInvalid > 0 && Math.floor(this.flashInvalid * 20) % 2 === 0
    // Footprint cells.
    s.ctx.save()
    s.ctx.globalAlpha = 0.45
    s.ctx.fillStyle = ok ? '#7cff9a' : '#ff5a6a'
    s.ctx.fillRect(fx - s.ox, fy - s.oy, f.w * tw, f.h * th)
    s.ctx.restore()
    s.frame(fx, fy, f.w * tw, f.h * th, ok ? '#3fbf6a' : '#e0314a')
    // The item itself, tinted.
    const sp = furnitureSprite(gh.id, gh.flip, 0)
    const o = furnitureOrigin(gh.id)
    const bob = Math.round(Math.sin(this.time * 5) * 0.8) - 1
    s.alpha(0.88)
    s.draw(sp.canvas, fx - o.ox, fy - o.oy + bob)
    s.reset()
    if (!ok || blink) {
      const tintC = bake(sp.w, sp.h, (tg) => {
        tg.ctx.drawImage(sp.canvas, 0, 0)
        tg.ctx.globalCompositeOperation = 'source-atop'
        tg.ctx.fillStyle = 'rgba(255,60,80,0.45)'
        tg.ctx.fillRect(0, 0, sp.w, sp.h)
      })
      s.draw(tintC, fx - o.ox, fy - o.oy + bob)
    }
    // Buttons.
    for (const b of this.ghostButtons()) {
      const pressed = this.drag?.kind === 'button' && this.drag.which === b.which
      const bg = b.which === 'ok' ? (ok ? '#7cd67a' : '#b8b0b0') : b.which === 'cancel' ? '#ff9a8a' : '#ffe08a'
      const y = b.y + (pressed ? 1 : 0)
      s.rect(b.x + 1, y, 10, 12, bg)
      s.rect(b.x, y + 1, 12, 10, bg)
      s.frame(b.x, y + 1, 12, 10, P.ink)
      s.hline(b.x + 1, b.x + 10, y, P.ink)
      s.hline(b.x + 1, b.x + 10, y + 11, P.ink)
      s.hline(b.x + 2, b.x + 9, y + 1, 'rgba(255,255,255,0.6)')
      const ic = P.ink
      if (b.which === 'ok') {
        s.line(b.x + 3, y + 6, b.x + 5, y + 8, ic)
        s.line(b.x + 5, y + 8, b.x + 9, y + 3, ic)
        s.line(b.x + 3, y + 5, b.x + 5, y + 7, ic)
      } else if (b.which === 'cancel') {
        s.line(b.x + 3, y + 3, b.x + 8, y + 8, ic)
        s.line(b.x + 8, y + 3, b.x + 3, y + 8, ic)
      } else {
        s.hline(b.x + 3, b.x + 8, y + 4, ic)
        s.px(b.x + 7, y + 3, ic)
        s.px(b.x + 7, y + 5, ic)
        s.hline(b.x + 3, b.x + 8, y + 7, ic)
        s.px(b.x + 4, y + 6, ic)
        s.px(b.x + 4, y + 8, ic)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Still renders (dress-up backdrop, thumbnails)

let stillScene: HouseScene | null = null

/**
 * Static render of the room into `g` at (0, 0) filling w×h. 'room' fits the
 * whole room (integer-scaled when there's space); 'mirror' frames the
 * wardrobe mirror for the dress-up screen.
 */
export function drawRoomStill(
  g: Surface,
  w: number,
  h: number,
  house: HouseState,
  opts: { night?: boolean; focus?: HouseFocus; phase?: Phase } = {},
) {
  const focus = opts.focus ?? 'room'
  // The mirror lives in the bedroom, whichever room the player is in.
  if (focus === 'mirror') house = viewRoom(house, 'bedroom')
  if (!stillScene) stillScene = new HouseScene(house, DEFAULT_LOOK, {})
  const sc = stillScene
  sc.setHouse(house)
  sc.hidePlayer = true
  sc.showMarkers = false
  sc.phaseOverride = opts.phase ?? (opts.night ? 'night' : 'day')
  sc.update(0, 1.3)
  const region = focus === 'mirror' ? MIRROR_FOCUS : BOUNDS
  const fit = Math.min(w / region.w, h / region.h)
  const ctx = g.ctx
  ctx.save()
  ctx.imageSmoothingEnabled = false
  if (fit >= 1) {
    const s = Math.max(1, Math.floor(fit))
    const bw = Math.ceil(w / s)
    const bh = Math.ceil(h / s)
    const cx = Math.round(region.x + region.w / 2 - bw / 2)
    const cy = Math.round(region.y + region.h / 2 - bh / 2)
    const tmp = new Surface(bw, bh)
    sc.renderWorld(tmp, cx, cy, bw, bh)
    ctx.drawImage(tmp.canvas, 0, 0, bw, bh, 0, 0, bw * s, bh * s)
  } else {
    const tmp = new Surface(region.w, region.h)
    sc.renderWorld(tmp, region.x, region.y, region.w, region.h)
    const dw = Math.round(region.w * fit)
    const dh = Math.round(region.h * fit)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(tmp.canvas, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh)
  }
  ctx.restore()
}
