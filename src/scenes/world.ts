// Walkable temple world: camera, tap-to-walk player, NPCs, temple dogs and
// cats, pickups, hotspots and day/night lighting. Each area supplies a
// MapDef; ambient creatures and effects come from composable Life systems
// (see life.ts).
//
// Public API used by the UI:
//   new WorldScene(map, look, callbacks, { companion, spawn, pickups })
//   goTo(hotspotId) · walkTo(x, y) · setLook · setCompanion · setPickups
//   highlight (hotspot id | null) · interactive · paused · particles · vw/vh
//   lookAt(x, y) · hotspotScreenPos(id) · playerScreenPos() · dogScreenPos(id)
// Callbacks: onArrive (hotspot/dog), onMove, onPickup(id, kind), onNear(hotspot|null)

import type { Surface } from '../engine/pixel'
import type { PointerInfo, Scene } from '../engine/stage'
import { Particles } from '../engine/particles'
import { rand, pick } from '../engine/rng'
import { clamp } from '../engine/ease'
import { sfx } from '../engine/audio'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../art/avatar'
import { catPoseSprite, dogSprite, DOG_COATS, monkSprite, noviceSweepSprite, sparrowSprite, type CatPose, type DogPose } from '../art/characters'
import { drawShadow, type Prop } from '../art/props'
import { petSprite, type PetAnim, type PetFacing } from '../art/pets'
import { PET_BY_ID } from '../game/data/pets'
import { pickupSprite, type PickupKind } from '../art/templeprops'
import { NavGrid, type Rect } from './pathfind'
import { applyTint, currentPhase, drawGlow, drawSky, SKY } from './sky'
import { Pigeons, type Life } from './life'
import type { Phase } from '../game/time'
import { hourOf } from '../game/time'
import type { AreaId } from '../game/data/areas'
import { DOG_BY_ID } from '../game/data/dogs'
import { bake } from '../engine/pixel'
import { OUTFITS } from '../game/data/outfits'
import { SKIN_TONES } from '../art/palette'
import { drawWorldMarker, mergeQuestNpcs, type MarkerFn } from './questLayer'

export type Facing = 'up' | 'down' | 'left' | 'right'

export interface Hotspot {
  id: string
  label: string
  hint?: string
  icon: string
  rect: Rect
  at: { x: number; y: number }
  face?: Facing
  /** Where the twinkle marker sits (defaults to the top centre of rect). */
  marker?: { x: number; y: number }
  /** Draw a soft golden beacon here instead of a twinkle (the main hall). */
  beacon?: boolean
  /** Distance (px) from `at` at which onNear reports this hotspot. Default 18. */
  near?: number
}

export interface PlacedProp {
  sprite: Prop
  /** Alternative sprite used at dusk/night (lit windows etc.). */
  night?: Prop
  x: number
  y: number
  flip?: boolean
  shadow?: [number, number]
  /** Sort key offset (useful for flat things that should stay behind). */
  z?: number
  /** Id used by shake() for tap reactions. */
  id?: string
}

export type PickupKindT = PickupKind

export interface Pickup {
  id: string
  kind: PickupKind
  x: number
  y: number
}

export interface MapDef {
  /** Map id: an AreaId, a place id (src/game/data/places.ts) or `<place>:<room>` for interiors. */
  id: string
  /** Prayer chapter / merit area this map counts as (defaults to 'wat'). */
  area?: AreaId
  /** Real place this map belongs to (for place shops, bonuses and names). */
  place?: string
  /** Interiors: no sky, no day/night tint; `lights` always glow at `indoorLight`. */
  indoor?: boolean
  /** Glow strength of `lights` indoors (default 0.8). */
  indoorLight?: number
  /** Where the player appears when arriving from another map (keyed by that map's id). */
  entries?: Record<string, { x: number; y: number; face?: Facing }>
  w: number
  h: number
  skyH: number
  ground: string
  bake(g: Surface, night: boolean): void
  props: PlacedProp[]
  obstacles: Rect[]
  ellipses?: [number, number, number, number][]
  hotspots: Hotspot[]
  spawn: { x: number; y: number; face?: Facing }
  lights: { x: number; y: number; r: number; color?: string }[]
  /** Good places for crafting pickups; the host picks which appear each day. */
  pickupSpots: { x: number; y: number }[]
  /** Ambient systems (koi, bells, flags…) built once per scene. */
  life?(s: WorldScene): Life[]
  decor?(g: Surface, t: number, s: WorldScene): void
  overlay?(g: Surface, t: number, s: WorldScene): void
  ambient?(s: WorldScene, dt: number, t: number): void
  wander: Rect[]
  pois: { x: number; y: number; face: Facing }[]
  /** Dawn alms procession route (monks walk it in single file). */
  monkPath?: [number, number][]
  /** Area where a pigeon flock pecks about. */
  birds?: Rect
  cats?: { x: number; y: number; pose: 'loaf' | 'sleep' | 'sit'; color?: string }[]
  /** Area swept by a novice with a broom. */
  novice?: Rect
  /** Number of novices strolling between the pois. */
  novices?: number
  /** Standing shopkeepers. */
  vendors?: { x: number; y: number; seed?: number }[]
  /** Night-time firefly zones (defaults to wander). */
  fireflies?: Rect[]
  /** Where the player sits vertically on screen (0 top … 1 bottom). */
  camBias?: number
  dogs: string[]
  visitors?: number
  /** Open water (ponds, rivers, flooded streets): swimming pets paddle here. */
  water?: Rect[]
  /** What other (simulated) players say here (defaults to temple chatter). */
  remoteChat?: string[]
  /** Always show this time of day (e.g. the night-time temple fair). */
  forcePhase?: Phase
}

/** Hotspots that sit on water (used when a map has no explicit `water`). */
const WATER_HOTSPOT = /pond|river|koi|krathong|flood|catfish|canal|lake|beach|pier|boat/

/** Another player sharing this map (online presence). */
export interface RemotePlayer {
  id: string
  name: string
  look: AvatarLook
  pet?: string | null
  level?: number
  /** A real online player (services/net.ts); the rest are simulated. */
  real?: boolean
  /** Invited guest (real players only; display only). */
  guest?: boolean
  /** Short activity label shown under the name tag. */
  doing?: string | null
  /** Live position feed (real players): replaces the simulated wandering and chatter. */
  pos?: () => { x: number; y: number; face: Facing; moving: boolean; pose?: Pose | null } | null
}

interface RemoteEnt {
  p: RemotePlayer
  w: Walker
  timer: number
  chat: number
  petX: number
  petY: number
  pose?: Pose | null
}

const REMOTE_CHAT = ['สาธุ~', 'มาทำบุญด้วยกันนะ', 'อนุโมทนาบุญค่ะ', 'วันนี้คนเยอะจัง', 'ใครสวดด่าน 5 ผ่านแล้วบ้าง', 'ไปกินไอติมกันไหม', 'สวัสดีครับ 🙏', 'แมวน่ารักมาก', 'ขอให้ถูกหวยนะ 555', 'ชุดสวยจัง!', 'เพิ่งได้มังกรมา ><', '🙏🙏🙏']

export type ArriveTarget = { kind: 'hotspot'; hotspot: Hotspot } | { kind: 'dog'; id: string }

export interface WorldCallbacks {
  onArrive(t: ArriveTarget): void
  onMove?(): void
  /** A crafting pickup was collected (it is removed from the scene). */
  onPickup?(id: string, kind: PickupKind): void
  /** The hotspot the player is standing near changed (null = none). */
  onNear?(h: Hotspot | null): void
  /**
   * Scenery said something (world coordinates of the bubble's tail). If
   * provided, the host renders the Thai text (see speechBubbles()); if not,
   * the scene draws a small wordless pixel bubble.
   */
  onSay?(text: string, x: number, y: number): void
  /** A remote player was tapped; return true to consume the tap (e.g. open their card). */
  onPlayer?(id: string): boolean
}

export interface SpeechBubble {
  text: string
  /** Screen position (virtual px) of the bubble tail. */
  x: number
  y: number
  /** 0..1 fade. */
  alpha: number
}

export interface WorldOptions {
  companion?: string | null
  /** Pet companion id (src/game/data/pets.ts) that trails the player. */
  pet?: string | null
  spawn?: { x: number; y: number; face?: Facing }
  pickups?: Pickup[]
}

// ---------------------------------------------------------------------------

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

const WALK_CYCLE: Pose[] = ['walk1', 'pass', 'walk2', 'pass']

interface Visitor {
  w: Walker
  look: AvatarLook
  kind: 'person' | 'novice'
  state: 'walk' | 'pray' | 'idle'
  timer: number
  skin: number
}

interface DogEnt {
  id: string
  w: Walker
  coat: (typeof DOG_COATS)[number]
  state: 'idle' | 'wander' | 'sit' | 'sleep' | 'follow' | 'wait'
  timer: number
  flip: boolean
  wag: number
}

interface CatEnt {
  hx: number
  hy: number
  x: number
  y: number
  color: string
  state: 'loaf' | 'sleep' | 'sit' | 'groom' | 'happy' | 'walk'
  timer: number
  flip: boolean
  tx: number
  ty: number
  t: number
}

interface Flyer {
  x: number
  y: number
  vx: number
  vy: number
  t: number
}

type Goal = ArriveTarget | { kind: 'cat'; cat: CatEnt } | { kind: 'pickup'; id: string }

export function randomVisitorLook(): AvatarLook {
  const of = (slot: string) => OUTFITS.filter((o) => o.slot === slot && !o.premium && !o.level && o.hair !== 'jook')
  return {
    gender: Math.random() < 0.5 ? 'm' : 'f',
    skin: Math.floor(Math.random() * SKIN_TONES.length),
    face: Math.floor(Math.random() * 3),
    hairColor: Math.random() < 0.8 ? Math.floor(Math.random() * 3) : 6,
    hair: pick(of('hair')).id,
    top: Math.random() < 0.5 ? 'top_white' : pick(of('top')).id,
    bottom: pick(of('bottom')).id,
    head: null,
    neck: null,
    hand: Math.random() < 0.2 ? 'hand_yam' : null,
  }
}

export class WorldScene implements Scene {
  vw = 180
  vh = 320
  camX = 0
  camY = 0
  private freeCam = false
  private camVel = { x: 0, y: 0 }
  readonly grid: NavGrid
  readonly particles = new Particles()
  readonly player: Walker
  look: AvatarLook
  /** Surface being rendered this frame (for life systems' sorted draws). */
  gfx!: Surface
  private target: Goal | null = null
  private retarget = 0
  private layers: { day?: HTMLCanvasElement; night?: HTMLCanvasElement } = {}
  private visitors: Visitor[] = []
  private dogs: DogEnt[] = []
  private cats: CatEnt[] = []
  private flyers: Flyer[] = []
  private monks: { d: number; novice: boolean; skin: number }[] = []
  private monkTimer = 0
  private novice?: Walker
  private vendorLooks: AvatarLook[] = []
  private life: Life[] = []
  private pickups: Pickup[] = []
  private shakes = new Map<string, number>()
  private drag: { sx: number; sy: number; moved: boolean; camX: number; camY: number; t: number } | null = null
  private tapFx: { x: number; y: number; t: number; walk: boolean } | null = null
  private near: Hotspot | null = null
  private windT = 0
  private speech: { text: string; x: number; y: number; t: number; max: number }[] = []
  phase: Phase = 'day'
  time = 0
  companion: string | null = null
  pet: string | null = null
  private remotes: RemoteEnt[] = []
  private petPos = { x: 0, y: 0, facing: 'down' as Facing, moving: false, t: 0, idle: 0, happy: 0 }
  private trail: [number, number][] = []
  paused = false
  /** When false the scene ignores input (used for the title screen). */
  interactive = true
  highlight: string | null = null
  /** Quest/shop markers above hotspots (see questLayer.ts); set by the UI. */
  private markerFn: MarkerFn | null = null
  /** Optional pose override for the player (online emotes); null = walk/stand. */
  playerPose: (() => Pose | null) | null = null

  constructor(
    readonly map: MapDef,
    look: AvatarLook,
    private cb: WorldCallbacks,
    opts: WorldOptions = {},
  ) {
    // Quest-giver NPCs registered for this map join its hotspots and actors.
    this.map = map = mergeQuestNpcs(map)
    this.look = look
    this.grid = new NavGrid(map.w, map.h, 4)
    for (const r of map.obstacles) this.grid.block(r)
    for (const [cx, cy, rx, ry] of map.ellipses ?? []) this.grid.blockEllipse(cx, cy, rx, ry)
    const sp = opts.spawn ?? map.spawn
    this.player = new Walker(sp.x, sp.y, 62)
    this.player.facing = opts.spawn?.face ?? map.spawn.face ?? 'up'
    this.companion = opts.companion ?? null
    this.pet = opts.pet ?? null
    this.pickups = [...(opts.pickups ?? [])]
    this.phase = map.forcePhase ?? currentPhase()
    this.spawnActors()
    if (map.birds) this.life.push(new Pigeons(this, map.birds, 9))
    this.life.push(...(map.life?.(this) ?? []))
  }

  // ---------------------------------------------------------------- setup

  private randomPoint(): [number, number] {
    const m = this.map
    for (let i = 0; i < 30; i++) {
      const r = pick(m.wander)
      const x = rand(r.x, r.x + r.w)
      const y = rand(r.y, r.y + r.h)
      if (this.grid.freeAt(x, y)) return [x, y]
    }
    return [m.spawn.x, m.spawn.y]
  }

  private spawnActors() {
    const m = this.map
    for (let i = 0; i < (m.visitors ?? 3); i++) {
      const [x, y] = this.randomPoint()
      this.visitors.push({ w: new Walker(x, y, 26 + Math.random() * 8), look: randomVisitorLook(), kind: 'person', state: 'idle', timer: rand(0, 3), skin: 1 })
    }
    for (let i = 0; i < (m.novices ?? 0); i++) {
      const [x, y] = this.randomPoint()
      this.visitors.push({ w: new Walker(x, y, 18), look: randomVisitorLook(), kind: 'novice', state: 'idle', timer: rand(1, 6), skin: [1, 2, 3][i % 3] })
    }
    const dogIds = [...m.dogs]
    if (this.companion && !dogIds.includes(this.companion)) dogIds.push(this.companion)
    for (const id of dogIds) {
      const def = DOG_BY_ID[id]
      if (!def) continue
      const coat = DOG_COATS.find((c) => c.id === def.coat) ?? DOG_COATS[0]
      const [x, y] = id === this.companion ? [this.player.x + 12, this.player.y + 4] : this.randomPoint()
      const state = id === this.companion ? 'follow' : Math.random() < 0.3 ? 'sleep' : 'idle'
      this.dogs.push({ id, w: new Walker(x, y, 30), coat, state, timer: rand(1, 6), flip: Math.random() < 0.5, wag: 0 })
    }
    for (const c of m.cats ?? []) {
      this.cats.push({ hx: c.x, hy: c.y, x: c.x, y: c.y, color: c.color ?? '#f5a55a', state: c.pose, timer: rand(6, 14), flip: Math.random() < 0.5, tx: c.x, ty: c.y, t: 0 })
    }
    if (m.novice) {
      const r = m.novice
      this.novice = new Walker(r.x + r.w / 2, r.y + r.h / 2, 10)
    }
    this.vendorLooks = (m.vendors ?? []).map(() => randomVisitorLook())
  }

  setLook(look: AvatarLook) {
    this.look = look
  }

  /** Floating quest markers: fn(hotspotId) → marker or null (null fn = none). */
  setMarkers(fn: MarkerFn | null) {
    this.markerFn = fn
  }

  setCompanion(id: string | null) {
    this.companion = id
    for (const d of this.dogs) if (d.state === 'follow' && d.id !== id) d.state = 'idle'
    if (id) {
      let d = this.dogs.find((x) => x.id === id)
      if (!d) {
        const def = DOG_BY_ID[id]
        const coat = DOG_COATS.find((c) => c.id === def?.coat) ?? DOG_COATS[0]
        d = { id, w: new Walker(this.player.x + 10, this.player.y + 3, 30), coat, state: 'follow', timer: 0, flip: false, wag: 0 }
        this.dogs.push(d)
      }
      d.state = 'follow'
    }
  }

  /** Replace the crafting pickups lying around (e.g. a new day). */
  setPickups(list: Pickup[]) {
    this.pickups = [...list]
  }

  resize(w: number, h: number) {
    this.vw = w
    this.vh = h
    if (this.freeCam) {
      this.camX = this.clampCamX(this.camX)
      this.camY = this.clampCamY(this.camY)
    } else this.snapCamera()
  }

  snapCamera() {
    const [cx, cy] = this.cameraTarget()
    this.camX = cx
    this.camY = cy
  }

  /** Move the camera to centre a world point (until the player walks). */
  lookAt(x: number, y: number) {
    this.freeCam = true
    this.camX = this.clampCamX(x - this.vw / 2)
    this.camY = this.clampCamY(y - this.vh / 2)
  }

  private clampCamX(x: number) {
    const m = this.map
    return m.w <= this.vw ? (m.w - this.vw) / 2 : clamp(x, 0, m.w - this.vw)
  }
  private clampCamY(y: number) {
    const m = this.map
    return m.h <= this.vh ? (m.h - this.vh) / 2 : clamp(y, 0, m.h - this.vh)
  }

  private cameraTarget(): [number, number] {
    return [this.clampCamX(this.player.x - this.vw / 2), this.clampCamY(this.player.y - this.vh * (this.map.camBias ?? 0.6))]
  }

  // ---------------------------------------------------------------- helpers for life systems

  isNight() {
    return this.phase === 'night' || this.phase === 'dusk'
  }

  /** Current breeze, roughly -1..1. */
  wind() {
    const t = this.windT
    return Math.sin(t * 0.5) * 0.5 + Math.sin(t * 1.7 + 1) * 0.25 + Math.max(0, Math.sin(t * 0.21)) * 0.35
  }

  onScreen(x: number, y: number, margin = 16) {
    return x > this.camX - margin && x < this.camX + this.vw + margin && y > this.camY - margin && y < this.camY + this.vh + margin
  }

  dogsNear(x: number, y: number, r: number) {
    return this.dogs.some((d) => d.w.moving && Math.hypot(d.w.x - x, d.w.y - y) < r)
  }

  /** Little birds burst out of a tree canopy. */
  burstBirds(x: number, y: number, n = 3) {
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1
      this.flyers.push({ x: x + rand(-8, 8), y: y + rand(-6, 6), vx: dir * rand(30, 55), vy: rand(-42, -22), t: rand(0, 1) })
    }
  }

  /** Show a speech bubble above a world point (scenery chatter). */
  say(text: string, x: number, y: number, dur = 2.6) {
    this.speech = this.speech.filter((b) => Math.hypot(b.x - x, b.y - y) > 24)
    this.speech.push({ text, x, y, t: dur, max: dur })
    if (this.speech.length > 3) this.speech.shift()
    this.cb.onSay?.(text, x, y)
  }

  /** Live speech bubbles in screen (virtual px) coordinates, for DOM overlays. */
  speechBubbles(): SpeechBubble[] {
    return this.speech.map((b) => ({ text: b.text, x: b.x - this.camX, y: b.y - this.camY, alpha: Math.min(1, b.t / 0.4, (b.max - b.t) / 0.15 + 0.2) }))
  }

  /** Jiggle a prop (by PlacedProp.id) for a moment. */
  shake(id: string, dur = 0.5) {
    this.shakes.set(id, dur)
  }

  /** Scatter falling petals/leaves from a canopy area. */
  drop(x: number, y: number, w: number, n: number, color: string, color2: string, kind: 'petal' | 'leaf' = 'petal') {
    for (let i = 0; i < n; i++) {
      this.particles.add({ kind, x: x + rand(-w / 2, w / 2), y: y + rand(-6, 6), vx: rand(-6, 6), vy: rand(8, 16), max: rand(1.6, 2.6), color, color2 })
    }
  }

  // ---------------------------------------------------------------- control

  /** Walk to a hotspot by id (used by quick-travel buttons). */
  goTo(id: string) {
    const h = this.map.hotspots.find((x) => x.id === id)
    if (h) this.approach({ kind: 'hotspot', hotspot: h })
  }

  approach(t: Goal) {
    this.target = t
    let x: number
    let y: number
    if (t.kind === 'hotspot') [x, y] = [t.hotspot.at.x, t.hotspot.at.y]
    else if (t.kind === 'dog') [x, y] = this.dogApproachPoint(t.id)
    else if (t.kind === 'cat') [x, y] = [t.cat.x + (this.player.x < t.cat.x ? -11 : 11), t.cat.y + 1]
    else {
      const p = this.pickups.find((q) => q.id === t.id)
      if (!p) return
      ;[x, y] = [p.x, p.y + 1]
    }
    if (t.kind === 'dog') {
      const d = this.dogs.find((dd) => dd.id === t.id)
      if (d && d.state !== 'follow') {
        d.state = 'wait'
        d.w.path = []
      }
    }
    if (t.kind === 'cat') {
      t.cat.state = t.cat.state === 'walk' ? 'sit' : t.cat.state
      t.cat.timer = 6
    }
    if (Math.hypot(x - this.player.x, y - this.player.y) < 3) {
      this.arrive()
      return
    }
    this.walkTo(x, y)
  }

  private dogApproachPoint(id: string): [number, number] {
    const d = this.dogs.find((dd) => dd.id === id)
    if (!d) return [this.player.x, this.player.y]
    const side = this.player.x < d.w.x ? -1 : 1
    return [d.w.x + side * 14, d.w.y + 1]
  }

  walkTo(x: number, y: number) {
    const path = this.grid.find(this.player.x, this.player.y, x, y)
    if (path) {
      this.player.path = path
      this.freeCam = false
      this.camVel.x = this.camVel.y = 0
      this.cb.onMove?.()
    }
  }

  private arrive() {
    const t = this.target
    this.target = null
    if (!t) return
    if (t.kind === 'hotspot' && t.hotspot.face) this.player.facing = t.hotspot.face
    if (t.kind === 'cat') {
      const c = t.cat
      this.player.facing = c.x > this.player.x ? 'right' : 'left'
      c.state = 'happy'
      c.timer = 3.5
      c.flip = c.x > this.player.x
      this.particles.hearts(c.x, c.y - 10, 3)
      sfx.sparkle()
      return
    }
    if (t.kind === 'pickup') {
      this.collect(t.id)
      return
    }
    if (t.kind === 'dog') {
      const d = this.dogs.find((dd) => dd.id === t.id)
      if (d) {
        this.player.facing = d.w.x > this.player.x ? 'right' : 'left'
        if (d.state !== 'follow') {
          d.state = 'sit'
          d.timer = 6
        }
        d.flip = d.w.x > this.player.x
        this.particles.hearts(d.w.x, d.w.y - 12, 2)
      }
    }
    this.cb.onArrive(t)
  }

  private collect(id: string) {
    const i = this.pickups.findIndex((p) => p.id === id)
    if (i < 0) return
    const p = this.pickups[i]
    this.pickups.splice(i, 1)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      this.particles.add({ kind: 'smoke', x: p.x + Math.cos(a) * 2, y: p.y - 2 + Math.sin(a), vx: Math.cos(a) * 14, vy: Math.sin(a) * 8 - 6, max: 0.5, color: '#fffaf0', size: 2, drag: 3 })
    }
    this.particles.sparkles(p.x, p.y - 4, 8, '#fff3a6', 8)
    sfx.merit()
    this.cb.onPickup?.(p.id, p.kind)
  }

  // ---------------------------------------------------------------- input

  pointer(e: PointerInfo) {
    if (this.paused || !this.interactive) return
    if (e.type === 'down') {
      this.drag = { sx: e.x, sy: e.y, moved: false, camX: this.camX, camY: this.camY, t: this.time }
      this.camVel.x = this.camVel.y = 0
    } else if (e.type === 'move' && this.drag) {
      const dx = e.x - this.drag.sx
      const dy = e.y - this.drag.sy
      if (!this.drag.moved && Math.hypot(dx, dy) > 5) this.drag.moved = true
      if (this.drag.moved) {
        this.freeCam = true
        this.camX = this.clampCamX(this.drag.camX - dx)
        this.camY = this.clampCamY(this.drag.camY - dy)
        this.camVel.x = this.camVel.x * 0.5 - e.dx * 30
        this.camVel.y = this.camVel.y * 0.5 - e.dy * 30
      }
    } else if (e.type === 'up') {
      const d = this.drag
      this.drag = null
      if (d && !d.moved) {
        this.camVel.x = this.camVel.y = 0
        this.tap(e.x + this.camX, e.y + this.camY)
      }
    } else if (e.type === 'cancel') {
      this.drag = null
    }
  }

  /** Handle a tap at a world position (exposed for tests/dev tools). */
  tap(wx: number, wy: number) {
    // Dogs first (they sit on top of the scene).
    for (const d of this.dogs) {
      if (Math.abs(wx - d.w.x) < 11 && wy > d.w.y - 16 && wy < d.w.y + 4) {
        this.tapFx = { x: wx, y: wy, t: 0.4, walk: true }
        this.approach({ kind: 'dog', id: d.id })
        return
      }
    }
    for (const c of this.cats) {
      if (Math.abs(wx - c.x) < 9 && wy > c.y - 12 && wy < c.y + 4) {
        this.tapFx = { x: wx, y: wy, t: 0.4, walk: true }
        this.approach({ kind: 'cat', cat: c })
        return
      }
    }
    // Other players (the host decides whether a tap on them means anything).
    if (this.cb.onPlayer) {
      for (const r of this.remotes) {
        if (Math.abs(wx - r.w.x) < 8 && wy > r.w.y - 26 && wy < r.w.y + 3 && this.cb.onPlayer(r.p.id)) {
          this.tapFx = { x: wx, y: wy, t: 0.4, walk: false }
          return
        }
      }
    }
    for (const p of this.pickups) {
      if (Math.hypot(wx - p.x, wy - (p.y - 3)) < 10) {
        this.tapFx = { x: wx, y: wy, t: 0.4, walk: true }
        this.approach({ kind: 'pickup', id: p.id })
        return
      }
    }
    // Ambient reactions (trees, koi, bells…). These don't stop walking.
    let reacted = false
    for (const l of this.life) if (l.tap?.(wx, wy)) reacted = true
    // Hotspots, preferring the smallest area that contains the tap.
    let best: Hotspot | null = null
    for (const h of this.map.hotspots) {
      const r = h.rect
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
        if (!best || r.w * r.h < best.rect.w * best.rect.h) best = h
      }
    }
    if (best) {
      this.tapFx = { x: wx, y: wy, t: 0.4, walk: true }
      this.approach({ kind: 'hotspot', hotspot: best })
      return
    }
    if (reacted && !this.grid.freeAt(wx, wy)) {
      this.tapFx = { x: wx, y: wy, t: 0.4, walk: false }
      return
    }
    this.tapFx = { x: wx, y: wy, t: 0.4, walk: true }
    this.target = null
    this.walkTo(wx, wy)
  }

  // ---------------------------------------------------------------- update

  /** Replace the other players shown on this map. */
  setRemotePlayers(list: RemotePlayer[]) {
    const keep = new Map(this.remotes.map((r) => [r.p.id, r]))
    this.remotes = list.map((p) => {
      const old = keep.get(p.id)
      if (old) return { ...old, p }
      const at = p.pos?.()
      const [x, y] = at ? [at.x, at.y] : this.randomPoint()
      return { p, w: new Walker(x, y, 30 + Math.random() * 6), timer: Math.random() * 3, chat: 4 + Math.random() * 14, petX: x + 8, petY: y + 3 }
    })
  }

  /** World position of a remote player's feet, or null. */
  remoteWorldPos(id: string): [number, number] | null {
    const r = this.remotes.find((q) => q.p.id === id)
    return r ? [r.w.x, r.w.y] : null
  }

  /** Screen (virtual px) position of a remote player's feet, or null. */
  remoteScreenPos(id: string): [number, number] | null {
    const r = this.remotes.find((q) => q.p.id === id)
    return r ? [r.w.x - this.camX, r.w.y - this.camY] : null
  }

  /** Name tags for other players (screen virtual px, above their heads). */
  nameTags(): { id: string; name: string; level?: number; x: number; y: number; real?: boolean; guest?: boolean; doing?: string | null }[] {
    return this.remotes
      .filter((r) => this.onScreen(r.w.x, r.w.y, 10))
      .map((r) => ({ id: r.p.id, name: r.p.name, level: r.p.level, x: r.w.x - this.camX, y: r.w.y - 30 - this.camY, real: r.p.real, guest: r.p.guest, doing: r.p.doing }))
  }

  private updateRemotes(dt: number) {
    for (const r of this.remotes) {
      const live = r.p.pos?.()
      if (live) {
        // Real player: follow the (interpolated) network position.
        r.w.x = live.x
        r.w.y = live.y
        r.w.facing = live.face
        r.w.moving = live.moving
        r.w.path = []
        if (live.moving) r.w.animT += dt
        r.pose = live.pose ?? null
      } else if (r.p.pos) {
        r.pose = null
      } else r.w.walk(dt)
      if (!r.p.pos && !r.w.moving) {
        r.timer -= dt
        if (r.timer <= 0) {
          r.timer = 2 + Math.random() * 6
          const [x, y] = this.randomPoint()
          const path = this.grid.find(r.w.x, r.w.y, x, y)
          if (path) r.w.path = path
        }
      }
      r.chat -= dt
      if (r.chat <= 0 && !r.p.real) {
        r.chat = 10 + Math.random() * 18
        const lines = this.map.remoteChat ?? REMOTE_CHAT
        if (this.onScreen(r.w.x, r.w.y, 0)) this.say(lines[Math.floor(Math.random() * lines.length)], r.w.x, r.w.y - 30, 2.4)
      }
      if (r.p.pet) {
        const dx = r.w.x + 9 - r.petX
        const dy = r.w.y + 3 - r.petY
        const k = Math.min(1, dt * 3)
        r.petX += dx * k
        r.petY += dy * k
      }
    }
  }

  setPet(id: string | null) {
    this.pet = id
    this.trail = []
    this.petPos.x = this.player.x + 10
    this.petPos.y = this.player.y + 4
  }

  /** Make the pet hop with hearts (e.g. after earning merit). */
  petHappy() {
    this.petPos.happy = 1.2
  }

  private updatePet(dt: number) {
    if (!this.pet) return
    const p = this.player
    const q = this.petPos
    if (!this.trail.length) {
      q.x = p.x + 10
      q.y = p.y + 4
    }
    const last = this.trail[this.trail.length - 1]
    if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 1) this.trail.push([p.x, p.y])
    if (this.trail.length > 40) this.trail.shift()
    // Aim at a point on the trail ~16 px behind the player.
    let tx = q.x
    let ty = q.y
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const [x, y] = this.trail[i]
      if (Math.hypot(x - p.x, y - p.y) >= 16) {
        tx = x
        ty = y
        break
      }
    }
    const dx = tx - q.x
    const dy = ty - q.y
    const d = Math.hypot(dx, dy)
    q.moving = d > 1.2
    if (q.moving) {
      const sp = Math.min(d, (p.speed * 1.1 + d * 2) * dt)
      q.x += (dx / d) * sp
      q.y += (dy / d) * sp
      q.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
      q.idle = 0
    } else q.idle += dt
    q.t += dt
    if (q.happy > 0) q.happy -= dt
  }

  /** Is (x, y) in or next to water? Uses the map's `water` rects, else pond / river hotspots. */
  nearWater(x: number, y: number, pad = 10): boolean {
    const inR = (r: Rect) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad
    if (this.map.water?.length) return this.map.water.some(inR)
    return this.map.hotspots.some((h) => !h.id.startsWith('job:') && WATER_HOTSPOT.test(h.id) && inR(h.rect))
  }

  private drawPet(g: Surface, t: number) {
    const id = this.pet!
    const q = this.petPos
    const def = PET_BY_ID[id]
    const facing: PetFacing = q.facing === 'down' ? 'down' : q.facing === 'up' ? 'up' : 'side'
    const swim = !!def?.swims && q.happy <= 0 && this.nearWater(q.x, q.y)
    const anim: PetAnim = q.happy > 0 ? 'happy' : swim ? 'swim' : q.moving ? 'walk' : q.idle > 12 ? 'sleep' : 'idle'
    const frame = anim === 'walk' ? Math.floor(q.t * 8) : anim === 'swim' ? Math.floor(q.t * 4) : Math.floor(q.t * 2)
    const s = petSprite(id, facing, anim, frame, { flip: q.facing === 'left' })
    if (!def?.flying && !swim) drawShadow(g, q.x, q.y, 5, 1.5)
    g.draw(s.canvas, Math.round(q.x - s.w / 2), Math.round(q.y - s.h + 1))
    if (anim === 'sleep' && Math.floor(t * 1.2) % 2 === 0) {
      g.px(q.x + 5, q.y - 12, '#e2e8ff')
      g.px(q.x + 6, q.y - 14, '#e2e8ff')
    }
  }

  update(dt: number, t: number) {
    this.time = t
    this.windT += dt
    this.phase = this.map.forcePhase ?? currentPhase()
    if (this.paused) {
      this.particles.update(dt)
      return
    }
    const p = this.player
    const arrived = p.walk(dt)
    if (this.target?.kind === 'dog') {
      this.retarget -= dt
      if (this.retarget <= 0 && p.path.length) {
        this.retarget = 0.4
        const [x, y] = this.dogApproachPoint(this.target.id)
        const path = this.grid.find(p.x, p.y, x, y)
        if (path) p.path = path
      }
    }
    if (arrived && this.target) this.arrive()
    this.updatePet(dt)
    this.updateRemotes(dt)
    // Walking over a pickup collects it.
    for (const q of this.pickups) {
      if (Math.hypot(q.x - p.x, q.y - p.y) < 5) {
        if (this.target?.kind === 'pickup' && this.target.id === q.id) this.target = null
        this.collect(q.id)
        break
      }
    }

    // Camera: smooth follow, or drift with fling inertia after a drag.
    if (!this.freeCam) {
      const [cx, cy] = this.cameraTarget()
      const k = 1 - Math.exp(-dt * 5)
      this.camX += (cx - this.camX) * k
      this.camY += (cy - this.camY) * k
    } else if (!this.drag && (Math.abs(this.camVel.x) > 1 || Math.abs(this.camVel.y) > 1)) {
      this.camX = this.clampCamX(this.camX + this.camVel.x * dt)
      this.camY = this.clampCamY(this.camY + this.camVel.y * dt)
      const k = Math.exp(-dt * 5)
      this.camVel.x *= k
      this.camVel.y *= k
    }

    this.updateNear()
    this.updateVisitors(dt)
    this.updateDogs(dt)
    this.updateCats(dt)
    this.updateMonks(dt)
    for (const f of this.flyers) {
      f.t += dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vy -= 8 * dt
    }
    this.flyers = this.flyers.filter((f) => f.t < 5 && f.y > this.camY - 40)
    for (const [id, v] of this.shakes) {
      if (v - dt <= 0) this.shakes.delete(id)
      else this.shakes.set(id, v - dt)
    }
    if (this.novice && this.map.novice) {
      const n = this.novice
      if (!n.path.length) {
        const r = this.map.novice
        n.path = [[rand(r.x, r.x + r.w), rand(r.y, r.y + r.h)]]
      }
      n.walk(dt)
      if (Math.random() < dt * 3) this.particles.add({ kind: 'dot', x: n.x + (n.facing === 'left' ? -6 : 6), y: n.y, vx: rand(-6, 6), vy: rand(-8, -2), max: 0.5, color: '#e0cfa8' })
      if (Math.random() < dt * 0.6) this.particles.add({ kind: 'leaf', x: n.x + (n.facing === 'left' ? -7 : 7), y: n.y - 1, vx: rand(-10, 10), vy: rand(-10, -4), g: 30, max: 0.8, color: '#c9a04c', color2: '#9a8a4a' })
    }
    for (const l of this.life) l.update?.(dt, t)
    this.map.ambient?.(this, dt, t)
    if (this.isNight() && !this.map.indoor) {
      const zones = this.map.fireflies?.length ? this.map.fireflies : this.map.wander
      if (zones.length && Math.random() < dt * 1.6) {
        const r = pick(zones)
        this.particles.add({ kind: 'firefly', x: rand(r.x, r.x + r.w), y: rand(r.y, r.y + r.h), vx: rand(-4, 4), vy: rand(-4, 2), max: rand(3, 6), color: '#fff3a6' })
      }
    }
    this.particles.update(dt)
    for (const b of this.speech) b.t -= dt
    this.speech = this.speech.filter((b) => b.t > 0)
    if (this.tapFx) {
      this.tapFx.t -= dt
      if (this.tapFx.t <= 0) this.tapFx = null
    }
  }

  private updateNear() {
    const p = this.player
    let best: Hotspot | null = null
    let bd = Infinity
    if (!p.moving || !p.path.length || p.path.length) {
      for (const h of this.map.hotspots) {
        const d = Math.hypot(h.at.x - p.x, h.at.y - p.y)
        if (d < (h.near ?? 18) && d < bd) {
          bd = d
          best = h
        }
      }
    }
    if (best !== this.near) {
      this.near = best
      this.cb.onNear?.(best)
    }
  }

  /** Hotspot the player is standing near, if any. */
  get nearHotspot() {
    return this.near
  }

  private updateVisitors(dt: number) {
    const pois = this.map.pois
    for (const v of this.visitors) {
      v.timer -= dt
      if (v.state === 'walk') {
        if (v.w.walk(dt)) {
          v.state = v.kind === 'person' && Math.random() < 0.6 ? 'pray' : 'idle'
          v.timer = rand(3, 7)
          const poi = pois.find((q) => Math.hypot(q.x - v.w.x, q.y - v.w.y) < 8)
          if (poi) v.w.facing = poi.face
        }
      } else if (v.timer <= 0) {
        const [x, y] = v.kind === 'novice' && Math.random() < 0.5 ? this.randomPoint() : (() => {
          const poi = pick(pois)
          return [poi.x + rand(-6, 6), poi.y + rand(-2, 2)]
        })()
        const path = this.grid.find(v.w.x, v.w.y, x, y)
        if (path) {
          v.w.path = path
          v.state = 'walk'
        } else v.timer = 2
      }
    }
  }

  private updateDogs(dt: number) {
    const p = this.player
    for (const d of this.dogs) {
      d.timer -= dt
      d.wag += dt
      if (d.state === 'follow') {
        const tx = p.x + (p.facing === 'left' ? 14 : -14)
        const ty = p.y + 3
        const dist = Math.hypot(tx - d.w.x, ty - d.w.y)
        if (dist > 10) {
          if (!d.w.path.length || d.timer <= 0) {
            d.timer = 0.3
            const path = this.grid.find(d.w.x, d.w.y, tx, ty)
            if (path) d.w.path = path
          }
          d.w.speed = dist > 40 ? 80 : 58
          d.w.walk(dt)
          d.flip = d.w.facing === 'left'
        } else {
          d.w.path = []
          d.w.moving = false
        }
        continue
      }
      if (d.state === 'wait') {
        d.flip = p.x < d.w.x
        continue
      }
      if (d.state === 'wander') {
        if (d.w.walk(dt)) {
          d.state = Math.random() < 0.25 ? 'sleep' : Math.random() < 0.5 ? 'sit' : 'idle'
          d.timer = d.state === 'sleep' ? rand(8, 16) : rand(2, 6)
        }
        d.flip = d.w.facing === 'left'
        continue
      }
      // Notice the player walking by.
      const near = Math.hypot(p.x - d.w.x, p.y - d.w.y) < 26
      if (near && d.state !== 'sleep' && d.state !== 'sit') {
        d.state = 'sit'
        d.timer = 3
        d.flip = p.x < d.w.x
      }
      if (d.timer <= 0) {
        for (let i = 0; i < 6; i++) {
          const r = pick(this.map.wander)
          const x = rand(r.x, r.x + r.w)
          const y = rand(r.y, r.y + r.h)
          const path = this.grid.find(d.w.x, d.w.y, x, y)
          if (path && path.length < 6) {
            d.w.path = path
            d.state = 'wander'
            break
          }
        }
        d.timer = rand(2, 5)
      }
    }
  }

  private updateCats(dt: number) {
    for (const c of this.cats) {
      c.t += dt
      c.timer -= dt
      if (c.state === 'walk') {
        const dx = c.tx - c.x
        const dy = c.ty - c.y
        const d = Math.hypot(dx, dy)
        if (d < 1) {
          c.state = Math.random() < 0.5 ? 'loaf' : 'groom'
          c.timer = rand(6, 14)
        } else {
          c.x += (dx / d) * 9 * dt
          c.y += (dy / d) * 9 * dt
          c.flip = dx < 0
        }
        continue
      }
      if (c.timer > 0) continue
      if (c.state === 'happy') {
        c.state = 'sit'
        c.timer = rand(3, 6)
        continue
      }
      const r = Math.random()
      if (r < 0.35) {
        const tx = c.hx + rand(-14, 14)
        const ty = c.hy + rand(-6, 6)
        if (this.grid.freeAt(tx, ty)) {
          c.tx = tx
          c.ty = ty
          c.state = 'walk'
          continue
        }
      }
      c.state = r < 0.6 ? 'sleep' : r < 0.8 ? 'groom' : 'loaf'
      c.timer = rand(6, 16)
    }
  }

  private monksActive(): boolean {
    return !!this.map.monkPath && (this.phase === 'dawn' || (hourOf() >= 5 && hourOf() < 9))
  }

  private updateMonks(dt: number) {
    const mp = this.map.monkPath
    if (!mp) return
    if (!this.monks.length) {
      this.monkTimer -= dt
      if (this.monkTimer <= 0 && this.monksActive()) {
        this.monks = [0, 1, 2, 3].map((i) => ({ d: -i * 16, novice: i === 3, skin: [2, 1, 3, 1][i] }))
      }
      return
    }
    for (const m of this.monks) m.d += 12 * dt
    if (this.monks.every((m) => m.d > pathLength(mp) + 10)) {
      this.monks = []
      this.monkTimer = 45
    }
  }

  monksPresent() {
    return this.monks.length > 0
  }

  // ---------------------------------------------------------------- render

  private layer(night: boolean): HTMLCanvasElement {
    const key = night ? 'night' : 'day'
    let c = this.layers[key]
    if (!c) {
      c = bake(this.map.w, this.map.h, (g) => this.map.bake(g, night))
      this.layers[key] = c
    }
    return c
  }

  render(g: Surface) {
    this.gfx = g
    const m = this.map
    const cx = Math.round(this.camX)
    const cy = Math.round(this.camY)
    const t = this.time
    const night = this.isNight()
    g.clear(m.ground)
    g.setCamera(cx, cy)
    if (!m.indoor && cy < m.skyH) drawSky(g, 0, 0, m.w, m.skyH, this.phase, t)
    // Only the visible part of the baked ground.
    const L = this.layer(night)
    const sx = Math.max(0, cx)
    const sy = Math.max(0, cy)
    const sw = Math.min(L.width - sx, this.vw + (cx < 0 ? cx : 0))
    const sh = Math.min(L.height - sy, this.vh + (cy < 0 ? cy : 0))
    if (sw > 0 && sh > 0) g.ctx.drawImage(L, sx, sy, sw, sh, sx - cx, sy - cy, sw, sh)
    for (const l of this.life) l.ground?.(g, t)
    m.decor?.(g, t, this)
    this.drawPickups(g, t)

    // Y-sorted drawables.
    type D = { y: number; draw: () => void }
    const list: D[] = []
    const add = (y: number, draw: () => void) => list.push({ y, draw })
    const x0 = cx - 8
    const x1 = cx + this.vw + 8
    const y0 = cy - 8
    const y1 = cy + this.vh + 8
    for (const pr of m.props) {
      const s = night && pr.night ? pr.night : pr.sprite
      const left = pr.x - s.ax
      const top = pr.y - s.ay
      if (left > x1 || left + s.w < x0 || top > y1 || top + s.h < y0) continue
      add(pr.y + (pr.z ?? 0), () => {
        if (pr.shadow) drawShadow(g, pr.x, pr.y, pr.shadow[0], pr.shadow[1])
        let ox = 0
        const sh = pr.id ? this.shakes.get(pr.id) : undefined
        if (sh) ox = Math.round(Math.sin(t * 50) * Math.min(1.5, sh * 4))
        g.draw(s.canvas, left + ox, top, pr.flip)
      })
    }
    for (const l of this.life) l.sorted?.(add, t)
    for (const c of this.cats) {
      add(c.y, () => {
        let pose: CatPose = c.state === 'walk' ? (Math.floor(c.t * 6) % 2 ? 'walk1' : 'walk2') : c.state === 'groom' ? (Math.floor(c.t * 2) % 3 ? 'groom' : 'sit') : c.state
        if (c.state === 'sleep') pose = 'sleep'
        const s = catPoseSprite(pose, c.color, c.flip)
        g.draw(s.canvas, Math.round(c.x - s.w / 2), Math.round(c.y - s.h + 1))
        if (c.state === 'sleep' && Math.floor(t * 1.2) % 2 === 0) {
          g.px(c.x + 4, c.y - 9, '#e2e8ff')
          g.px(c.x + 5, c.y - 11, '#e2e8ff')
        }
      })
    }
    const drawWalker = (w: Walker, look: AvatarLook, pose?: Pose) => {
      const { view, flip } = viewOf(w.facing)
      const ps: Pose = pose ?? (w.moving ? WALK_CYCLE[Math.floor(w.animT * 8) % 4] : 'stand')
      const s = avatarSprite(look, view, ps, { flip })
      drawShadow(g, w.x, w.y, 6, 2)
      g.draw(s.canvas, Math.round(w.x - s.w / 2), Math.round(w.y - s.h + 1))
    }
    for (const v of this.visitors) {
      if (!this.onScreen(v.w.x, v.w.y, 30)) continue
      add(v.w.y, () => {
        if (v.kind === 'novice') {
          const view = v.w.facing === 'down' ? 'front' : v.w.facing === 'up' ? 'back' : 'side'
          const pose = v.w.moving ? (Math.floor(v.w.animT * 4) % 2 ? 'walk1' : 'walk2') : 'stand'
          const s = monkSprite(view, pose, { novice: true, skin: v.skin, flip: v.w.facing === 'left' })
          drawShadow(g, v.w.x, v.w.y, 6, 2)
          g.draw(s.canvas, Math.round(v.w.x - s.w / 2), Math.round(v.w.y - s.h + 1))
        } else if (v.state === 'pray') {
          const s = avatarSprite(v.look, v.w.facing === 'down' ? 'front' : 'back', 'wai')
          drawShadow(g, v.w.x, v.w.y, 6, 2)
          g.draw(s.canvas, Math.round(v.w.x - s.w / 2), Math.round(v.w.y - s.h + 1))
        } else drawWalker(v.w, v.look)
      })
    }
    ;(m.vendors ?? []).forEach((vd, i) => {
      add(vd.y, () => {
        const near = Math.hypot(this.player.x - vd.x, this.player.y - vd.y) < 30
        const pose: Pose = near && Math.floor(t * 1.5) % 4 === 0 ? 'happy' : 'stand'
        const s = avatarSprite(this.vendorLooks[i], 'front', pose)
        g.draw(s.canvas, Math.round(vd.x - s.w / 2), Math.round(vd.y - s.h + 1))
      })
    })
    for (const d of this.dogs) {
      add(d.w.y, () => {
        let pose: DogPose = 'stand'
        if (d.w.moving) pose = Math.floor(d.w.animT * 8) % 2 ? 'walk1' : 'stand'
        else if (d.state === 'sleep') pose = 'sleep'
        else if (d.state === 'sit' || d.state === 'wait') pose = Math.floor(d.wag * 5) % 2 ? 'wag' : 'sit'
        const s = dogSprite(d.coat, pose, d.flip)
        drawShadow(g, d.w.x, d.w.y, 7, 2)
        g.draw(s.canvas, Math.round(d.w.x - s.w / 2), Math.round(d.w.y - s.h + 1))
        if (d.state === 'sleep' && Math.floor(t * 1.2) % 2 === 0) {
          g.px(d.w.x + (d.flip ? -5 : 5), d.w.y - 12, '#e2e8ff')
          g.px(d.w.x + (d.flip ? -6 : 6), d.w.y - 14, '#e2e8ff')
        }
      })
    }
    if (this.novice) {
      const n = this.novice
      add(n.y, () => {
        const s = noviceSweepSprite((Math.floor(t * 3) % 2) as 0 | 1, n.facing === 'left')
        drawShadow(g, n.x, n.y, 6, 2)
        g.draw(s.canvas, Math.round(n.x - 9), Math.round(n.y - s.h + 1))
      })
    }
    const mp = m.monkPath
    if (mp) {
      for (const mk of this.monks) {
        if (mk.d < 0) continue
        const [x, y, dx, dy] = pointOnPath(mp, mk.d)
        add(y, () => {
          const view = Math.abs(dx) > Math.abs(dy) ? 'side' : dy > 0 ? 'front' : 'back'
          const s = monkSprite(view, Math.floor(t * 3 + mk.d) % 2 ? 'walk1' : 'walk2', { novice: mk.novice, skin: mk.skin, flip: dx < 0 })
          drawShadow(g, x, y, 6, 2)
          g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h + 1))
        })
      }
    }
    add(this.player.y + 0.1, () => drawWalker(this.player, this.look, this.playerPose?.() ?? undefined))
    if (this.pet) add(this.petPos.y, () => this.drawPet(g, t))
    for (const r of this.remotes) {
      if (!this.onScreen(r.w.x, r.w.y, 30)) continue
      add(r.w.y, () => drawWalker(r.w, r.p.look, r.pose ?? undefined))
      if (r.p.pet) {
        const pid = r.p.pet
        add(r.petY, () => {
          const moving = Math.hypot(r.w.x + 9 - r.petX, r.w.y + 3 - r.petY) > 1
          const ps = petSprite(pid, 'side', moving ? 'walk' : 'idle', Math.floor(t * (moving ? 8 : 2)), { flip: r.w.x < r.petX })
          if (!PET_BY_ID[pid]?.flying) drawShadow(g, r.petX, r.petY, 5, 1.5)
          g.draw(ps.canvas, Math.round(r.petX - ps.w / 2), Math.round(r.petY - ps.h + 1))
        })
      }
    }
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()

    for (const f of this.flyers) {
      const s = sparrowSprite((Math.floor(f.t * 14) % 2) as 0 | 1, f.vx < 0)
      g.draw(s.canvas, Math.round(f.x), Math.round(f.y))
    }
    m.overlay?.(g, t, this)
    for (const l of this.life) l.over?.(g, t)
    this.particles.render(g)

    // Lighting.
    g.setCamera(0, 0)
    if (!m.indoor) applyTint(g, this.phase)
    g.setCamera(cx, cy)
    const light = m.indoor ? (m.indoorLight ?? 0.8) : SKY[this.phase].lights
    if (light > 0) for (const l of m.lights) if (this.onScreen(l.x, l.y, l.r)) drawGlow(g, l.x, l.y, l.r, light, l.color)
    for (const l of this.life) l.glow?.(g, t, light)
    if (night) {
      // Fireflies stay bright after the tint.
      for (const p of this.particles.list) if (p.kind === 'firefly') drawGlow(g, p.x, p.y, 3, 0.6, '#fff3a6')
    }

    // Hotspot twinkles and the hall beacon (above the tint so they read at night).
    if (this.interactive) {
      m.hotspots.forEach((h, i) => this.drawMarker(g, h, i, t))
      this.drawQuestMarkers(g, t)
      for (const d of this.dogs) {
        if (d.state === 'follow') continue
        const bob = Math.round(Math.sin(t * 3 + d.w.x) * 1)
        g.px(d.w.x, d.w.y - 17 + bob, '#ff6f91')
        g.px(d.w.x - 1, d.w.y - 18 + bob, '#ff6f91')
        g.px(d.w.x + 1, d.w.y - 18 + bob, '#ff6f91')
      }
    }
    if (!this.cb.onSay) for (const b of this.speech) this.drawBubble(g, b.x, b.y, t)
    if (this.tapFx) {
      const f = this.tapFx
      const r = (0.4 - f.t) * (f.walk ? 20 : 12)
      g.alpha(f.t / 0.4)
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2
        g.px(f.x + Math.cos(ang) * r, f.y + Math.sin(ang) * r * 0.5, f.walk ? '#fffaf0' : '#fff3a6')
      }
      g.alpha(1)
    }
    g.setCamera(0, 0)
  }

  /** Wordless fallback bubble ("…") when the host doesn't render text. */
  private drawBubble(g: Surface, x: number, y: number, t: number) {
    const bx = Math.round(x - 7)
    const by = Math.round(y - 11)
    g.rect(bx + 1, by, 13, 9, '#3a2838')
    g.rect(bx, by + 1, 15, 7, '#3a2838')
    g.rect(bx + 1, by + 1, 13, 7, '#fffaf0')
    g.px(bx + 6, by + 9, '#3a2838')
    g.px(bx + 7, by + 9, '#fffaf0')
    g.px(bx + 7, by + 10, '#3a2838')
    g.px(bx + 8, by + 9, '#3a2838')
    for (let i = 0; i < 3; i++) g.px(bx + 4 + i * 3, by + 4 - (Math.floor(t * 6) % 3 === i ? 1 : 0), '#5a3d4f')
  }

  private drawPickups(g: Surface, t: number) {
    for (const p of this.pickups) {
      if (!this.onScreen(p.x, p.y, 12)) continue
      const s = pickupSprite(p.kind)
      drawShadow(g, p.x, p.y, 4, 1.5)
      const bob = Math.round(Math.sin(t * 3 + p.x) * 0.6)
      g.draw(s.canvas, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + 1 + bob))
      const ph = (t * 0.9 + p.x * 0.13) % 1
      if (ph < 0.35) {
        const k = Math.sin((ph / 0.35) * Math.PI)
        const x = Math.round(p.x + 3)
        const y = Math.round(p.y - s.h - 1)
        g.px(x, y, '#ffffff')
        if (k > 0.5) {
          g.px(x - 1, y, '#fff3a6')
          g.px(x + 1, y, '#fff3a6')
          g.px(x, y - 1, '#fff3a6')
          g.px(x, y + 1, '#fff3a6')
        }
      }
    }
  }

  private drawQuestMarkers(g: Surface, t: number) {
    const fn = this.markerFn
    if (!fn) return
    for (const h of this.map.hotspots) {
      const qm = fn(h.id)
      if (!qm) continue
      const mk = h.marker ?? { x: h.rect.x + h.rect.w / 2, y: h.rect.y - 4 }
      if (!this.onScreen(mk.x, mk.y, 24)) continue
      drawWorldMarker(g, qm, mk.x, mk.y, t, this.highlight === h.id || this.near === h)
    }
  }

  private drawMarker(g: Surface, h: Hotspot, i: number, t: number) {
    const mk = h.marker ?? { x: h.rect.x + h.rect.w / 2, y: h.rect.y - 4 }
    if (this.markerFn?.(h.id)) return
    if (!this.onScreen(mk.x, mk.y, 20)) return
    const hi = this.highlight === h.id || this.near === h
    if (h.beacon) {
      const pulse = 0.5 + Math.sin(t * 1.6) * 0.5
      g.ctx.save()
      g.ctx.globalCompositeOperation = 'lighter'
      const x = Math.round(mk.x - g.ox)
      const y = Math.round(mk.y - g.oy)
      const grad = g.ctx.createLinearGradient(0, y - 46, 0, y + 6)
      grad.addColorStop(0, 'rgba(255,220,120,0)')
      grad.addColorStop(0.7, `rgba(255,220,120,${(0.1 + pulse * 0.08).toFixed(3)})`)
      grad.addColorStop(1, 'rgba(255,220,120,0)')
      g.ctx.fillStyle = grad
      g.ctx.fillRect(x - 3, y - 46, 7, 52)
      g.ctx.fillRect(x - 1, y - 46, 3, 52)
      g.ctx.restore()
      drawGlow(g, mk.x, mk.y, 9, 0.6 + pulse * 0.5, '#ffe7a0')
      if (Math.random() < 0.08) this.particles.add({ kind: 'sparkle', x: mk.x + rand(-4, 4), y: mk.y + rand(-2, 4), vy: rand(-14, -8), max: rand(0.8, 1.4), color: '#fff3a6', drag: 0.5 })
      return
    }
    // Keep the player's face clear.
    if (Math.abs(mk.x - this.player.x) < 10 && mk.y > this.player.y - 36 && mk.y < this.player.y + 4) return
    const ph = (t * 0.55 + i * 0.29) % 1
    const k = hi ? 0.75 + Math.sin(t * 5) * 0.25 : ph < 0.45 ? Math.sin((ph / 0.45) * Math.PI) : 0
    if (k <= 0.05) {
      g.alpha(0.55)
      g.px(mk.x, mk.y, '#fff3a6')
      g.alpha(1)
      return
    }
    const r = Math.round(k * (hi ? 3 : 2.4))
    const c = hi ? '#ffe27a' : '#ffffff'
    g.px(mk.x, mk.y, c)
    for (let d = 1; d <= r; d++) {
      g.alpha(Math.max(0.25, 1 - d / (r + 1)))
      g.px(mk.x - d, mk.y, c)
      g.px(mk.x + d, mk.y, c)
      g.px(mk.x, mk.y - d, c)
      g.px(mk.x, mk.y + d, c)
    }
    if (r >= 2) {
      g.alpha(0.5)
      g.px(mk.x - 1, mk.y - 1, '#fff3a6')
      g.px(mk.x + 1, mk.y - 1, '#fff3a6')
      g.px(mk.x - 1, mk.y + 1, '#fff3a6')
      g.px(mk.x + 1, mk.y + 1, '#fff3a6')
    }
    g.alpha(1)
  }

  dogScreenPos(id: string): [number, number] | null {
    const d = this.dogs.find((x) => x.id === id)
    return d ? [d.w.x - this.camX, d.w.y - this.camY] : null
  }

  playerScreenPos(): [number, number] {
    return [this.player.x - this.camX, this.player.y - this.camY]
  }

  hotspotScreenPos(id: string): [number, number] | null {
    const h = this.map.hotspots.find((x) => x.id === id)
    if (!h) return null
    const mk = h.marker ?? { x: h.rect.x + h.rect.w / 2, y: h.rect.y - 4 }
    return [mk.x - this.camX, mk.y - this.camY]
  }

  releaseDog(id: string) {
    const d = this.dogs.find((x) => x.id === id)
    if (d && d.state !== 'follow') {
      d.state = 'sit'
      d.timer = 2
    }
  }
}

// ---------------------------------------------------------------------------

function pathLength(p: [number, number][]) {
  let s = 0
  for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
  return s
}

/** Point at distance d along a polyline: [x, y, dirX, dirY]. */
function pointOnPath(p: [number, number][], d: number): [number, number, number, number] {
  for (let i = 1; i < p.length; i++) {
    const [ax, ay] = p[i - 1]
    const [bx, by] = p[i]
    const len = Math.hypot(bx - ax, by - ay)
    if (d <= len || i === p.length - 1) {
      const k = len ? Math.min(1, d / len) : 0
      return [ax + (bx - ax) * k, ay + (by - ay) * k, bx - ax, by - ay]
    }
    d -= len
  }
  return [p[0][0], p[0][1], 0, 1]
}
