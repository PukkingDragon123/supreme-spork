// Walkable temple world: camera, tap-to-walk player, NPCs, temple dogs,
// hotspots and day/night lighting. Each area supplies a MapDef.

import type { Surface } from '../engine/pixel'
import type { PointerInfo, Scene } from '../engine/stage'
import { Particles } from '../engine/particles'
import { rand, pick } from '../engine/rng'
import { clamp } from '../engine/ease'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../art/avatar'
import { birdSprite, catSprite, dogSprite, DOG_COATS, monkSprite, noviceSweepSprite, type DogPose } from '../art/characters'
import { markerSprite } from '../art/icons'
import { drawShadow, type Prop } from '../art/props'
import { P } from '../art/palette'
import { NavGrid, type Rect } from './pathfind'
import { applyTint, currentPhase, drawGlow, drawSky, SKY } from './sky'
import type { Phase } from '../game/time'
import { hourOf } from '../game/time'
import type { AreaId } from '../game/data/areas'
import { DOG_BY_ID } from '../game/data/dogs'
import { bake } from '../engine/pixel'
import { OUTFITS } from '../game/data/outfits'
import { SKIN_TONES } from '../art/palette'

export type Facing = 'up' | 'down' | 'left' | 'right'

export interface Hotspot {
  id: string
  label: string
  hint?: string
  icon: string
  rect: Rect
  at: { x: number; y: number }
  face?: Facing
  marker?: { x: number; y: number }
}

export interface PlacedProp {
  sprite: Prop
  x: number
  y: number
  flip?: boolean
  shadow?: [number, number]
  /** Sort key offset (useful for flat things that should stay behind). */
  z?: number
}

export interface MapDef {
  id: AreaId
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
  decor?(g: Surface, t: number, s: WorldScene): void
  overlay?(g: Surface, t: number, s: WorldScene): void
  ambient?(s: WorldScene, dt: number, t: number): void
  wander: Rect[]
  pois: { x: number; y: number; face: Facing }[]
  monkPath?: { y: number; x0: number; x1: number }
  birds?: Rect
  cats?: { x: number; y: number; pose: 'loaf' | 'sleep'; color?: string }[]
  novice?: Rect
  dogs: string[]
  visitors?: number
}

export type ArriveTarget = { kind: 'hotspot'; hotspot: Hotspot } | { kind: 'dog'; id: string }

export interface WorldCallbacks {
  onArrive(t: ArriveTarget): void
  onMove?(): void
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
  state: 'walk' | 'pray' | 'idle'
  timer: number
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

interface Bird {
  x: number
  y: number
  vx: number
  vy: number
  flying: boolean
  t: number
  respawn: number
}

interface MonkEnt {
  x: number
  novice: boolean
  skin: number
}

function randomVisitorLook(): AvatarLook {
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
  readonly grid: NavGrid
  readonly particles = new Particles()
  readonly player: Walker
  look: AvatarLook
  private target: ArriveTarget | null = null
  private retarget = 0
  private layers: { day?: HTMLCanvasElement; night?: HTMLCanvasElement } = {}
  private visitors: Visitor[] = []
  private dogs: DogEnt[] = []
  private birds: Bird[] = []
  private monks: MonkEnt[] = []
  private monkTimer = 0
  private novice?: Walker
  private drag: { sx: number; sy: number; moved: boolean; camX: number; camY: number } | null = null
  private tapFx: { x: number; y: number; t: number } | null = null
  phase: Phase = 'day'
  time = 0
  companion: string | null = null
  paused = false
  /** When false the scene ignores input (used for the title screen). */
  interactive = true
  highlight: string | null = null

  constructor(
    readonly map: MapDef,
    look: AvatarLook,
    private cb: WorldCallbacks,
    opts: { companion?: string | null; spawn?: { x: number; y: number } } = {},
  ) {
    this.look = look
    this.grid = new NavGrid(map.w, map.h, 4)
    for (const r of map.obstacles) this.grid.block(r)
    for (const [cx, cy, rx, ry] of map.ellipses ?? []) this.grid.blockEllipse(cx, cy, rx, ry)
    const sp = opts.spawn ?? map.spawn
    this.player = new Walker(sp.x, sp.y, 62)
    this.player.facing = map.spawn.face ?? 'up'
    this.companion = opts.companion ?? null
    this.spawnActors()
    this.phase = currentPhase()
  }

  // ---------------------------------------------------------------- setup

  private spawnActors() {
    const m = this.map
    const randomPoint = (): [number, number] => {
      for (let i = 0; i < 30; i++) {
        const r = pick(m.wander)
        const x = rand(r.x, r.x + r.w)
        const y = rand(r.y, r.y + r.h)
        if (this.grid.freeAt(x, y)) return [x, y]
      }
      return [m.spawn.x, m.spawn.y]
    }
    for (let i = 0; i < (m.visitors ?? 3); i++) {
      const [x, y] = randomPoint()
      this.visitors.push({ w: new Walker(x, y, 26 + Math.random() * 8), look: randomVisitorLook(), state: 'idle', timer: rand(0, 3) })
    }
    const dogIds = [...m.dogs]
    if (this.companion && !dogIds.includes(this.companion)) dogIds.push(this.companion)
    for (const id of dogIds) {
      const def = DOG_BY_ID[id]
      if (!def) continue
      const coat = DOG_COATS.find((c) => c.id === def.coat) ?? DOG_COATS[0]
      const [x, y] = id === this.companion ? [this.player.x + 12, this.player.y + 4] : randomPoint()
      const state = id === this.companion ? 'follow' : Math.random() < 0.3 ? 'sleep' : 'idle'
      this.dogs.push({ id, w: new Walker(x, y, 30), coat, state, timer: rand(1, 6), flip: Math.random() < 0.5, wag: 0 })
    }
    if (m.birds) {
      for (let i = 0; i < 5; i++) this.birds.push(this.newBird())
    }
    if (m.novice) {
      const r = m.novice
      this.novice = new Walker(r.x + r.w / 2, r.y + r.h / 2, 10)
    }
  }

  private newBird(): Bird {
    const r = this.map.birds!
    return { x: rand(r.x, r.x + r.w), y: rand(r.y, r.y + r.h), vx: 0, vy: 0, flying: false, t: rand(0, 2), respawn: 0 }
  }

  setLook(look: AvatarLook) {
    this.look = look
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

  resize(w: number, h: number) {
    this.vw = w
    this.vh = h
    this.snapCamera()
  }

  snapCamera() {
    const [cx, cy] = this.cameraTarget()
    this.camX = cx
    this.camY = cy
  }

  private cameraTarget(): [number, number] {
    const m = this.map
    const cx = m.w <= this.vw ? (m.w - this.vw) / 2 : clamp(this.player.x - this.vw / 2, 0, m.w - this.vw)
    const cy = m.h <= this.vh ? (m.h - this.vh) / 2 : clamp(this.player.y - this.vh * 0.55, 0, m.h - this.vh)
    return [cx, cy]
  }

  // ---------------------------------------------------------------- control

  /** Walk to a hotspot by id (used by quick-travel buttons). */
  goTo(id: string) {
    const h = this.map.hotspots.find((x) => x.id === id)
    if (h) this.approach({ kind: 'hotspot', hotspot: h })
  }

  approach(t: ArriveTarget) {
    this.target = t
    const [x, y] = t.kind === 'hotspot' ? [t.hotspot.at.x, t.hotspot.at.y] : this.dogApproachPoint(t.id)
    if (t.kind === 'dog') {
      const d = this.dogs.find((dd) => dd.id === t.id)
      if (d && d.state !== 'follow') {
        d.state = 'wait'
        d.w.path = []
      }
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
      this.cb.onMove?.()
    }
  }

  private arrive() {
    const t = this.target
    this.target = null
    if (!t) return
    if (t.kind === 'hotspot' && t.hotspot.face) this.player.facing = t.hotspot.face
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

  // ---------------------------------------------------------------- input

  pointer(e: PointerInfo) {
    if (this.paused || !this.interactive) return
    if (e.type === 'down') {
      this.drag = { sx: e.x, sy: e.y, moved: false, camX: this.camX, camY: this.camY }
    } else if (e.type === 'move' && this.drag) {
      const dx = e.x - this.drag.sx
      const dy = e.y - this.drag.sy
      if (!this.drag.moved && Math.hypot(dx, dy) > 5) this.drag.moved = true
      if (this.drag.moved) {
        this.freeCam = true
        const m = this.map
        this.camX = m.w <= this.vw ? this.camX : clamp(this.drag.camX - dx, 0, m.w - this.vw)
        this.camY = m.h <= this.vh ? this.camY : clamp(this.drag.camY - dy, 0, m.h - this.vh)
      }
    } else if (e.type === 'up') {
      const d = this.drag
      this.drag = null
      if (d && !d.moved) this.tap(e.x + this.camX, e.y + this.camY)
    } else if (e.type === 'cancel') {
      this.drag = null
    }
  }

  private tap(wx: number, wy: number) {
    this.tapFx = { x: wx, y: wy, t: 0.4 }
    // Dogs first (they sit on top of the scene).
    for (const d of this.dogs) {
      if (Math.abs(wx - d.w.x) < 11 && wy > d.w.y - 16 && wy < d.w.y + 4) {
        this.approach({ kind: 'dog', id: d.id })
        return
      }
    }
    // Hotspots, preferring the smallest area that contains the tap.
    let best: Hotspot | null = null
    for (const h of this.map.hotspots) {
      const r = h.rect
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) {
        if (!best || r.w * r.h < best.rect.w * best.rect.h) best = h
      }
    }
    if (best) {
      this.approach({ kind: 'hotspot', hotspot: best })
      return
    }
    this.target = null
    this.walkTo(wx, wy)
  }

  // ---------------------------------------------------------------- update

  update(dt: number, t: number) {
    this.time = t
    this.phase = currentPhase()
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

    if (!this.freeCam) {
      const [cx, cy] = this.cameraTarget()
      const k = Math.min(1, dt * 6)
      this.camX += (cx - this.camX) * k
      this.camY += (cy - this.camY) * k
    }

    this.updateVisitors(dt)
    this.updateDogs(dt)
    this.updateBirds(dt)
    this.updateMonks(dt)
    if (this.novice && this.map.novice) {
      const n = this.novice
      if (!n.path.length) {
        const r = this.map.novice
        n.path = [[rand(r.x, r.x + r.w), rand(r.y, r.y + r.h)]]
      }
      n.walk(dt)
      if (Math.random() < dt * 3) this.particles.add({ kind: 'dot', x: n.x + (n.facing === 'left' ? -6 : 6), y: n.y, vx: rand(-6, 6), vy: rand(-8, -2), max: 0.5, color: '#e0cfa8' })
    }
    this.map.ambient?.(this, dt, t)
    if (this.phase === 'night' || this.phase === 'dusk') {
      if (Math.random() < dt * 1.2) {
        const r = pick(this.map.wander)
        this.particles.add({ kind: 'firefly', x: rand(r.x, r.x + r.w), y: rand(r.y, r.y + r.h), vx: rand(-4, 4), vy: rand(-4, 2), max: rand(3, 6), color: '#fff3a6' })
      }
    }
    this.particles.update(dt)
    if (this.tapFx) {
      this.tapFx.t -= dt
      if (this.tapFx.t <= 0) this.tapFx = null
    }
  }

  private updateVisitors(dt: number) {
    const pois = this.map.pois
    for (const v of this.visitors) {
      v.timer -= dt
      if (v.state === 'walk') {
        if (v.w.walk(dt)) {
          v.state = Math.random() < 0.6 ? 'pray' : 'idle'
          v.timer = rand(3, 7)
          const poi = pois.find((q) => Math.hypot(q.x - v.w.x, q.y - v.w.y) < 4)
          if (poi) v.w.facing = poi.face
        }
      } else if (v.timer <= 0) {
        const poi = pick(pois)
        const path = this.grid.find(v.w.x, v.w.y, poi.x + rand(-6, 6), poi.y + rand(-2, 2))
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

  private updateBirds(dt: number) {
    if (!this.map.birds) return
    const p = this.player
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i]
      b.t += dt
      if (b.flying) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.vy -= 20 * dt
        b.respawn -= dt
        if (b.respawn <= 0) this.birds[i] = this.newBird()
        continue
      }
      if (Math.hypot(p.x - b.x, p.y - b.y) < 22 || this.dogs.some((d) => d.w.moving && Math.hypot(d.w.x - b.x, d.w.y - b.y) < 16)) {
        b.flying = true
        b.vx = (b.x < p.x ? -1 : 1) * rand(40, 60)
        b.vy = rand(-50, -30)
        b.respawn = rand(6, 12)
      } else if (Math.random() < dt * 0.6) {
        b.x += rand(-3, 3)
        b.y += rand(-1, 1)
      }
    }
  }

  private monksActive(): boolean {
    const override = this.map.monkPath && (this.phase === 'dawn' || (hourOf() >= 5 && hourOf() < 9))
    return !!override
  }

  private updateMonks(dt: number) {
    const mp = this.map.monkPath
    if (!mp) return
    if (!this.monks.length) {
      this.monkTimer -= dt
      if (this.monkTimer <= 0 && this.monksActive()) {
        this.monks = [0, 1, 2, 3].map((i) => ({ x: mp.x1 + 10 + i * 20, novice: i === 3, skin: [2, 1, 3, 1][i] }))
      }
      return
    }
    for (const m of this.monks) m.x -= 14 * dt
    if (this.monks.every((m) => m.x < mp.x0 - 20)) {
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
    const m = this.map
    const cx = Math.round(this.camX)
    const cy = Math.round(this.camY)
    g.clear(m.ground)
    g.setCamera(cx, cy)
    // Sky band (dynamic).
    if (cy < m.skyH) drawSky(g, 0, 0, m.w, m.skyH, this.phase, this.time)
    const night = this.phase === 'night' || this.phase === 'dusk'
    g.draw(this.layer(night), 0, 0)
    m.decor?.(g, this.time, this)

    // Y-sorted drawables.
    type D = { y: number; draw: () => void }
    const list: D[] = []
    for (const pr of m.props) {
      const s = pr.sprite
      list.push({
        y: pr.y + (pr.z ?? 0),
        draw: () => {
          if (pr.shadow) drawShadow(g, pr.x, pr.y, pr.shadow[0], pr.shadow[1])
          g.draw(s.canvas, pr.x - s.ax, pr.y - s.ay, pr.flip)
        },
      })
    }
    for (const c of m.cats ?? []) {
      const s = catSprite(c.pose, c.color)
      list.push({ y: c.y, draw: () => g.draw(s.canvas, c.x - s.w / 2, c.y - s.h) })
    }
    for (const b of this.birds) {
      const s = birdSprite(b.flying ? 'fly' : Math.sin(b.t * 6) > 0.6 ? 'b' : 'a')
      list.push({ y: b.flying ? 9999 : b.y, draw: () => g.draw(s.canvas, b.x - 3, b.y - s.h, b.vx < 0) })
    }
    const drawWalker = (w: Walker, look: AvatarLook, pose?: Pose) => {
      const { view, flip } = viewOf(w.facing)
      const ps: Pose = pose ?? (w.moving ? WALK_CYCLE[Math.floor(w.animT * 8) % 4] : 'stand')
      const s = avatarSprite(look, view, ps, { flip })
      drawShadow(g, w.x, w.y, 6, 2)
      g.draw(s.canvas, Math.round(w.x - s.w / 2), Math.round(w.y - s.h + 1))
    }
    for (const v of this.visitors) {
      list.push({
        y: v.w.y,
        draw: () => {
          if (v.state === 'pray') {
            const s = avatarSprite(v.look, v.w.facing === 'down' ? 'front' : 'back', 'wai')
            drawShadow(g, v.w.x, v.w.y, 6, 2)
            g.draw(s.canvas, Math.round(v.w.x - s.w / 2), Math.round(v.w.y - s.h + 1))
          } else drawWalker(v.w, v.look)
        },
      })
    }
    for (const d of this.dogs) {
      list.push({
        y: d.w.y,
        draw: () => {
          let pose: DogPose = 'stand'
          if (d.w.moving) pose = Math.floor(d.w.animT * 8) % 2 ? 'walk1' : 'stand'
          else if (d.state === 'sleep') pose = 'sleep'
          else if (d.state === 'sit' || d.state === 'wait') pose = Math.floor(d.wag * 5) % 2 ? 'wag' : 'sit'
          const s = dogSprite(d.coat, pose, d.flip)
          drawShadow(g, d.w.x, d.w.y, 7, 2)
          g.draw(s.canvas, Math.round(d.w.x - s.w / 2), Math.round(d.w.y - s.h + 1))
          if (d.state === 'sleep' && Math.floor(this.time * 1.2) % 2 === 0) {
            g.px(d.w.x + (d.flip ? -5 : 5), d.w.y - 12, '#e2e8ff')
            g.px(d.w.x + (d.flip ? -6 : 6), d.w.y - 14, '#e2e8ff')
          }
        },
      })
    }
    if (this.novice) {
      const n = this.novice
      list.push({
        y: n.y,
        draw: () => {
          const s = noviceSweepSprite(Math.floor(this.time * 3) % 2 as 0 | 1, n.facing === 'left')
          drawShadow(g, n.x, n.y, 6, 2)
          g.draw(s.canvas, Math.round(n.x - 9), Math.round(n.y - s.h + 1))
        },
      })
    }
    const mp = m.monkPath
    if (mp) {
      for (const mk of this.monks) {
        list.push({
          y: mp.y,
          draw: () => {
            const s = monkSprite('side', Math.floor(this.time * 3 + mk.x) % 2 ? 'walk1' : 'walk2', { novice: mk.novice, skin: mk.skin, flip: true })
            drawShadow(g, mk.x, mp.y, 6, 2)
            g.draw(s.canvas, Math.round(mk.x - s.w / 2), Math.round(mp.y - s.h + 1))
          },
        })
      }
    }
    list.push({ y: this.player.y + 0.1, draw: () => drawWalker(this.player, this.look) })
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()

    m.overlay?.(g, this.time, this)
    this.particles.render(g)

    // Lighting.
    g.setCamera(0, 0)
    applyTint(g, this.phase)
    g.setCamera(cx, cy)
    const L = SKY[this.phase].lights
    if (L > 0) for (const l of m.lights) drawGlow(g, l.x, l.y, l.r, L, l.color)
    if (this.phase === 'night' || this.phase === 'dusk') {
      // Fireflies stay bright after the tint.
      for (const p of this.particles.list) if (p.kind === 'firefly') drawGlow(g, p.x, p.y, 3, 0.6, '#fff3a6')
    }

    // Hotspot markers (above the tint so they read at night).
    for (const h of this.interactive ? m.hotspots : []) {
      const mk = h.marker ?? { x: h.rect.x + h.rect.w / 2, y: h.rect.y - 4 }
      // Don't cover the player's face with a marker.
      if (Math.abs(mk.x - this.player.x) < 12 && mk.y > this.player.y - 40 && mk.y < this.player.y + 4) continue
      const bob = Math.round(Math.sin(this.time * 2.4 + mk.x * 0.1) * 1.5)
      this.drawMarker(g, mk.x, mk.y + bob, h.icon, this.highlight === h.id)
    }
    for (const d of this.dogs) {
      if (d.state === 'follow') continue
      const bob = Math.round(Math.sin(this.time * 3 + d.w.x) * 1)
      g.px(d.w.x, d.w.y - 17 + bob, '#ff6f91')
      g.px(d.w.x - 1, d.w.y - 18 + bob, '#ff6f91')
      g.px(d.w.x + 1, d.w.y - 18 + bob, '#ff6f91')
    }
    if (this.tapFx) {
      const r = (0.4 - this.tapFx.t) * 20
      g.alpha(this.tapFx.t / 0.4)
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2
        g.px(this.tapFx.x + Math.cos(ang) * r, this.tapFx.y + Math.sin(ang) * r * 0.5, '#fffaf0')
      }
      g.alpha(1)
    }
    g.setCamera(0, 0)
  }

  private drawMarker(g: Surface, x: number, y: number, icon: string, hi: boolean) {
    const s = markerSprite(icon)
    const bx = Math.round(x - 6)
    const by = Math.round(y - 13)
    g.rect(bx + 1, by, 11, 11, hi ? P.gold : '#fffaf0')
    g.rect(bx, by + 1, 13, 9, hi ? P.gold : '#fffaf0')
    g.frame(bx, by + 1, 13, 9, P.ink)
    g.rect(bx + 1, by, 11, 1, P.ink)
    g.rect(bx + 1, by + 10, 11, 1, P.ink)
    g.px(bx + 6, by + 11, P.ink)
    g.px(bx + 5, by + 11, P.ink)
    g.px(bx + 7, by + 11, P.ink)
    g.px(bx + 6, by + 12, P.ink)
    g.rect(bx + 1, by + 1, 11, 9, hi ? P.gold : '#fffaf0')
    g.draw(s.canvas, bx + 2, by + 1)
  }

  dogScreenPos(id: string): [number, number] | null {
    const d = this.dogs.find((x) => x.id === id)
    return d ? [d.w.x - this.camX, d.w.y - this.camY] : null
  }

  playerScreenPos(): [number, number] {
    return [this.player.x - this.camX, this.player.y - this.camY]
  }

  releaseDog(id: string) {
    const d = this.dogs.find((x) => x.id === id)
    if (d && d.state !== 'follow') {
      d.state = 'sit'
      d.timer = 2
    }
  }
}
