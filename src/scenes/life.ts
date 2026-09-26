// Ambient "life" systems for the walkable worlds: koi and lotus, pigeons,
// butterflies, eave bells, glints, candle flames, lanterns, cloud shadows,
// sun rays, street traffic and tap zones. A map composes the systems it
// wants in MapDef.life(scene); the scene calls each hook at the right layer.

import type { Color, Surface } from '../engine/pixel'
import { rand, pick } from '../engine/rng'
import { sfx } from '../engine/audio'
import { drawRing } from '../engine/particles'
import { butterflySprite, pigeonSprite, mixHex } from '../art/characters'
import { drawRackBell, drawTowerBell, GOLD } from '../art/temple'
import { drawLantern, drawFlag, CANDLE_FLAMES } from '../art/templeprops'
import { tukTuk } from '../art/props'
import type { Rect } from './pathfind'
import type { WorldScene } from './world'
import { drawGlow } from './sky'

export interface Life {
  update?(dt: number, t: number): void
  /** Drawn right after the baked ground layer (water creatures). */
  ground?(g: Surface, t: number): void
  /** Push y-sorted drawables. */
  sorted?(add: (y: number, draw: () => void) => void, t: number): void
  /** Drawn after sorted drawables and particles, before the lighting tint. */
  over?(g: Surface, t: number): void
  /** Drawn after the tint; `light` is 0..1 (how strongly lamps glow now). */
  glow?(g: Surface, t: number, light: number): void
  /** World-space tap. Return true if something reacted. */
  tap?(x: number, y: number): boolean
}

type Pt = { x: number; y: number }

const inRect = (r: Rect, x: number, y: number, pad = 0) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad

// ---------------------------------------------------------------------------
// Koi pond with lotus blooms, lily pads and dragonflies.

interface Koi {
  x: number
  y: number
  a: number
  v: number
  turn: number
  flee: number
  fx: number
  fy: number
  body: Color
  spot: Color
  len: number
  ph: number
}

interface Lotus {
  x: number
  y: number
  open: number // 0 bud → 1 bloom
  target: number
  color: Color
}

interface Dragonfly {
  x: number
  y: number
  tx: number
  ty: number
  hover: number
  color: Color
}

const KOI_KINDS: [Color, Color][] = [
  ['#fffaf0', '#e8514a'],
  ['#f58f35', '#fffaf0'],
  ['#ffd54f', '#ffd54f'],
  ['#fffaf0', '#3a2838'],
  ['#e8514a', '#fffaf0'],
  ['#ffbb66', '#f58f35'],
]

export class KoiPond implements Life {
  private koi: Koi[] = []
  lotus: Lotus[] = []
  private flies: Dragonfly[] = []
  constructor(
    private s: WorldScene,
    readonly blobs: [number, number, number, number][],
    opts: { koi?: number; lotus?: [number, number, boolean?][]; dragonflies?: number; lotusColor?: Color } = {},
  ) {
    const n = opts.koi ?? 6
    for (let i = 0; i < n; i++) {
      const [x, y] = this.randomPoint(0.6)
      const [body, spot] = KOI_KINDS[i % KOI_KINDS.length]
      this.koi.push({ x, y, a: rand(0, Math.PI * 2), v: rand(4, 8), turn: 0, flee: 0, fx: 0, fy: 0, body, spot, len: 4 + (i % 2), ph: rand(0, 6) })
    }
    for (const [x, y, open] of opts.lotus ?? []) {
      const o = open ? 1 : 0
      this.lotus.push({ x, y, open: o, target: o, color: opts.lotusColor ?? '#ff9fc0' })
    }
    for (let i = 0; i < (opts.dragonflies ?? 1); i++) {
      const [x, y] = this.randomPoint(0.9)
      this.flies.push({ x, y: y - 8, tx: x, ty: y - 8, hover: rand(0.5, 2), color: i % 2 ? '#e8514a' : '#4f7fd0' })
    }
  }

  inside(x: number, y: number, k = 1): boolean {
    for (const [cx, cy, rx, ry] of this.blobs) {
      const dx = (x - cx) / (rx * k)
      const dy = (y - cy) / (ry * k)
      if (dx * dx + dy * dy <= 1) return true
    }
    return false
  }

  private randomPoint(k: number): [number, number] {
    for (let i = 0; i < 40; i++) {
      const [cx, cy, rx, ry] = pick(this.blobs)
      const x = cx + rand(-rx, rx) * k
      const y = cy + rand(-ry, ry) * k
      if (this.inside(x, y, 0.8)) return [x, y]
    }
    return [this.blobs[0][0], this.blobs[0][1]]
  }

  update(dt: number, t: number) {
    for (const k of this.koi) {
      k.ph += dt
      if (k.flee > 0) {
        k.flee -= dt
        const want = Math.atan2(k.y - k.fy, k.x - k.fx)
        k.a += angleDiff(k.a, want) * Math.min(1, dt * 8)
      } else {
        k.turn += rand(-1, 1) * dt * 2
        k.turn *= 0.98
        k.a += k.turn * dt
      }
      const sp = k.flee > 0 ? 26 : k.v * (0.7 + 0.3 * Math.sin(k.ph * 0.7))
      const nx = k.x + Math.cos(k.a) * sp * dt
      const ny = k.y + Math.sin(k.a) * sp * dt * 0.7
      if (this.inside(nx, ny, 0.78)) {
        k.x = nx
        k.y = ny
      } else {
        k.a += Math.PI * (0.5 + Math.random() * 0.5)
        k.turn = 0
      }
    }
    for (const l of this.lotus) l.open += (l.target - l.open) * Math.min(1, dt * 3)
    const day = this.s.phase === 'day' || this.s.phase === 'golden' || this.s.phase === 'dawn'
    for (const f of this.flies) {
      if (!day) continue
      f.hover -= dt
      if (f.hover <= 0) {
        const [x, y] = this.randomPoint(1.1)
        f.tx = x
        f.ty = y - rand(4, 12)
        f.hover = rand(0.8, 3)
      }
      f.x += (f.tx - f.x) * Math.min(1, dt * 5)
      f.y += (f.ty - f.y) * Math.min(1, dt * 5) + Math.sin(t * 9 + f.tx) * 0.05
    }
    // Occasional rising bubble ring.
    if (Math.random() < dt * 0.35) {
      const k = pick(this.koi)
      this.s.particles.add({ kind: 'ripple', x: k.x, y: k.y, max: 1.1, size: 5, color: '#c8f4fa' })
    }
  }

  ground(g: Surface, t: number) {
    for (const k of this.koi) {
      const dx = Math.cos(k.a)
      const dy = Math.sin(k.a) * 0.7
      const wig = Math.sin(k.ph * (k.flee > 0 ? 18 : 7)) * 0.6
      for (let i = 0; i < k.len; i++) {
        const x = Math.round(k.x - dx * i + (i > 1 ? -dy * wig * (i - 1) * 0.6 : 0))
        const y = Math.round(k.y - dy * i + (i > 1 ? dx * wig * (i - 1) * 0.4 : 0))
        g.px(x, y, i === 1 || i === 2 ? k.spot : k.body)
      }
      // Tail fin.
      const tx = Math.round(k.x - dx * k.len - dy * wig)
      const ty = Math.round(k.y - dy * k.len + dx * wig)
      g.px(tx, ty, mixHex(k.body, '#78d2e2', 0.35))
    }
    // Lotus flowers (buds open into blooms).
    for (const l of this.lotus) {
      const x = Math.round(l.x)
      const y = Math.round(l.y)
      const light = mixHex(l.color, '#ffffff', 0.45)
      const dark = mixHex(l.color, '#b8343f', 0.3)
      if (l.open < 0.5) {
        g.px(x, y - 3, light)
        g.rect(x - 1, y - 2, 3, 2, l.color)
        g.px(x + 1, y - 2, dark)
        g.px(x, y, '#3f8a4f')
      } else {
        g.px(x - 3, y - 1, l.color)
        g.px(x + 3, y - 1, l.color)
        g.rect(x - 2, y - 2, 5, 2, l.color)
        g.px(x - 1, y - 3, light)
        g.px(x + 1, y - 3, light)
        g.px(x, y - 4, light)
        g.rect(x - 1, y - 2, 3, 1, '#ffe45e')
        g.px(x, y - 2, '#fff3a6')
        g.hline(x - 2, x + 2, y, dark)
      }
    }
    // Water sparkle.
    for (let i = 0; i < 5; i++) {
      const ph = Math.floor(t * 1.3 + i * 1.9)
      const [cx, cy, rx, ry] = this.blobs[Math.abs((ph + i) | 0) % this.blobs.length] ?? this.blobs[0]
      const x = Math.round(cx + (((ph * 37 + i * 13) % 100) / 50 - 1) * rx * 0.7)
      const y = Math.round(cy + (((ph * 23 + i * 7) % 100) / 50 - 1) * ry * 0.6)
      if ((ph + i) % 2 === 0) {
        g.px(x, y, '#effcff')
        g.px(x + 1, y, '#c8f4fa')
      }
    }
  }

  over(g: Surface, t: number) {
    const day = this.s.phase === 'day' || this.s.phase === 'golden' || this.s.phase === 'dawn'
    if (!day) return
    for (const f of this.flies) {
      const x = Math.round(f.x)
      const y = Math.round(f.y)
      g.hline(x - 2, x + 1, y, f.color)
      g.px(x + 2, y, P_INK)
      const up = Math.sin(t * 60) > 0
      g.alpha(0.7)
      g.px(x - 1, y + (up ? -1 : 1), '#e8fbff')
      g.px(x, y + (up ? -1 : 1), '#e8fbff')
      g.alpha(1)
    }
  }

  tap(x: number, y: number): boolean {
    for (const l of this.lotus) {
      if (Math.abs(x - l.x) <= 4 && y >= l.y - 6 && y <= l.y + 2) {
        l.target = l.target > 0.5 ? 0 : 1
        if (l.target) {
          this.s.particles.sparkles(l.x, l.y - 3, 6, '#ffe1ea', 6)
          sfx.sparkle()
        } else sfx.plop()
        return true
      }
    }
    if (!this.inside(x, y, 1.05)) return false
    this.s.particles.add({ kind: 'ripple', x, y, max: 1.2, size: 12, color: '#e8fbff' })
    this.s.particles.add({ kind: 'ripple', x, y, max: 0.8, size: 6, color: '#ffffff' })
    for (let i = 0; i < 4; i++) this.s.particles.add({ kind: 'drop', x, y: y - 1, vx: rand(-14, 14), vy: rand(-26, -12), g: 90, max: 0.45, color: '#c8f4fa' })
    for (const k of this.koi) {
      if (Math.hypot(k.x - x, k.y - y) < 26) {
        k.flee = rand(0.6, 1.1)
        k.fx = x
        k.fy = y
      }
    }
    sfx.plop()
    return true
  }
}

const P_INK = '#3a2838'

function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

// ---------------------------------------------------------------------------
// Pigeon flock: pecks around, bursts into the air when startled, circles and
// lands somewhere else.

interface Pigeon {
  x: number
  y: number
  vx: number
  vy: number
  fly: number // seconds of flight left, 0 = on ground
  lx: number
  ly: number
  t: number
  peck: number
  flip: boolean
  tone: number
  z: number
}

export class Pigeons implements Life {
  private birds: Pigeon[] = []
  private calm = 0
  constructor(
    private s: WorldScene,
    private area: Rect,
    n = 8,
  ) {
    for (let i = 0; i < n; i++) {
      const [x, y] = this.spot()
      this.birds.push({ x, y, vx: 0, vy: 0, fly: 0, lx: x, ly: y, t: rand(0, 3), peck: 0, flip: Math.random() < 0.5, tone: i % 3, z: 0 })
    }
  }

  private spot(): [number, number] {
    const r = this.area
    for (let i = 0; i < 20; i++) {
      const x = rand(r.x, r.x + r.w)
      const y = rand(r.y, r.y + r.h)
      if (this.s.grid.freeAt(x, y)) return [x, y]
    }
    return [r.x + r.w / 2, r.y + r.h / 2]
  }

  scatter(fromX: number, fromY: number, radius = 60) {
    let any = false
    for (const b of this.birds) {
      if (b.fly > 0 || Math.hypot(b.x - fromX, b.y - fromY) > radius) continue
      const dir = b.x < fromX ? -1 : 1
      b.fly = rand(2.6, 4.2)
      b.vx = dir * rand(30, 55)
      b.vy = rand(-50, -34)
      b.flip = dir < 0
      const [lx, ly] = this.spot()
      b.lx = lx
      b.ly = ly
      any = true
    }
    if (any) {
      sfx.whoosh()
      this.calm = 2
    }
    return any
  }

  update(dt: number) {
    const p = this.s.player
    this.calm -= dt
    for (const b of this.birds) {
      b.t += dt
      if (b.fly > 0) {
        b.fly -= dt
        // Swoop: rise, glide in an arc, then descend to the landing spot.
        if (b.fly > 1.2) {
          b.vy += 18 * dt
          b.x += b.vx * dt
          b.z += -b.vy * dt * 0.02
          b.y += b.vy * dt
        } else {
          const k = Math.min(1, dt * 3.2)
          b.x += (b.lx - b.x) * k
          b.y += (b.ly - b.y) * k
          b.vx = b.lx - b.x
        }
        b.flip = b.vx < 0
        if (b.fly <= 0) {
          b.x = b.lx
          b.y = b.ly
        }
        continue
      }
      if (b.peck > 0) b.peck -= dt
      else if (Math.random() < dt * 0.5) b.peck = rand(0.3, 0.9)
      if (Math.random() < dt * 0.35) {
        const nx = b.x + rand(-4, 4)
        const ny = b.y + rand(-2, 2)
        if (this.s.grid.freeAt(nx, ny) && inRect(this.area, nx, ny, 6)) {
          b.flip = nx < b.x
          b.x = nx
          b.y = ny
        }
      }
      if (this.calm <= 0) {
        const near = Math.hypot(p.x - b.x, p.y - b.y) < (p.moving ? 22 : 12)
        if (near || this.s.dogsNear(b.x, b.y, 16)) this.scatter(b.x, b.y, 40)
      }
    }
  }

  sorted(add: (y: number, draw: () => void) => void) {
    for (const b of this.birds) {
      if (b.fly > 0) continue
      add(b.y, () => {
        const s = pigeonSprite(b.peck > 0 && Math.sin(b.t * 14) > 0 ? 'peck' : 'stand', b.flip, b.tone)
        this.s.gfx.draw(s.canvas, Math.round(b.x - s.w / 2), Math.round(b.y - s.h + 1))
      })
    }
  }

  over(g: Surface) {
    for (const b of this.birds) {
      if (b.fly <= 0) continue
      const s = pigeonSprite(Math.sin(b.t * 22) > 0 ? 'fly1' : 'fly2', b.flip, b.tone)
      const lift = b.fly > 0.4 ? 6 : b.fly * 15
      g.draw(s.canvas, Math.round(b.x - s.w / 2), Math.round(b.y - s.h - lift))
    }
  }

  tap(x: number, y: number): boolean {
    for (const b of this.birds) if (b.fly <= 0 && Math.hypot(b.x - x, b.y - 3 - y) < 10) return this.scatter(x, y, 50)
    return false
  }
}

// ---------------------------------------------------------------------------
// Butterflies over flower beds (daytime only).

interface Fly {
  x: number
  y: number
  tx: number
  ty: number
  t: number
  color: Color
  home: Rect
  flee: number
}

const BFLY_COLORS = ['#fffaf0', '#ffe45e', '#ff9fc0', '#9fd0ff', '#ffbb66']

export class Butterflies implements Life {
  private flies: Fly[] = []
  constructor(
    private s: WorldScene,
    areas: Rect[],
    n = 5,
  ) {
    for (let i = 0; i < n; i++) {
      const home = areas[i % areas.length]
      const x = rand(home.x, home.x + home.w)
      const y = rand(home.y, home.y + home.h)
      this.flies.push({ x, y, tx: x, ty: y, t: rand(0, 5), color: BFLY_COLORS[i % BFLY_COLORS.length], home, flee: 0 })
    }
  }
  private active() {
    return this.s.phase === 'day' || this.s.phase === 'golden' || this.s.phase === 'dawn'
  }
  update(dt: number) {
    if (!this.active()) return
    for (const f of this.flies) {
      f.t += dt
      f.flee -= dt
      if (Math.hypot(f.tx - f.x, f.ty - f.y) < 2 || Math.random() < dt * 0.4) {
        const h = f.home
        f.tx = rand(h.x, h.x + h.w)
        f.ty = rand(h.y - 10, h.y + h.h)
      }
      const sp = f.flee > 0 ? 40 : 11
      const d = Math.hypot(f.tx - f.x, f.ty - f.y) || 1
      f.x += ((f.tx - f.x) / d) * sp * dt + Math.sin(f.t * 5) * 6 * dt
      f.y += ((f.ty - f.y) / d) * sp * dt + Math.cos(f.t * 7) * 8 * dt
    }
  }
  over(g: Surface) {
    if (!this.active()) return
    for (const f of this.flies) {
      const s = butterflySprite(Math.sin(f.t * (f.flee > 0 ? 40 : 18)) > 0 ? 0 : 1, f.color)
      g.draw(s.canvas, Math.round(f.x - 1), Math.round(f.y - 10))
    }
  }
  tap(x: number, y: number): boolean {
    if (!this.active()) return false
    let hit = false
    for (const f of this.flies) {
      if (Math.hypot(f.x - x, f.y - 9 - y) < 9) {
        f.flee = 1.2
        f.tx = f.x + rand(-30, 30)
        f.ty = f.y - rand(20, 36)
        this.s.particles.sparkles(f.x, f.y - 9, 3, f.color, 4)
        hit = true
      }
    }
    if (hit) sfx.sparkle()
    return hit
  }
}

// ---------------------------------------------------------------------------
// Eave bells (กระดิ่งชายคา): tiny bells with bodhi-leaf clappers that sway in
// the wind and chime when tapped.

interface Swing {
  x: number
  y: number
  a: number
  v: number
}

export class EaveBells implements Life {
  private bells: Swing[]
  private gust = rand(4, 10)
  constructor(
    private s: WorldScene,
    points: Pt[],
    private sortY: number,
  ) {
    this.bells = points.map((p) => ({ x: p.x, y: p.y, a: 0, v: 0 }))
  }
  update(dt: number, t: number) {
    this.gust -= dt
    let push = 0
    if (this.gust <= 0) {
      this.gust = rand(9, 18)
      push = rand(2.5, 4)
      if (this.bells.some((b) => this.s.onScreen(b.x, b.y, 0)) && Math.random() < 0.6) sfx.sparkle()
    }
    for (const b of this.bells) {
      const wind = Math.sin(t * 1.3 + b.x * 0.05) * 0.8 + Math.sin(t * 3.1 + b.y) * 0.3
      b.v += (-b.a * 14 - b.v * 1.6 + wind * 2) * dt + push * (0.6 + Math.random() * 0.6)
      b.a += b.v * dt
    }
  }
  sorted(add: (y: number, draw: () => void) => void) {
    add(this.sortY + 0.5, () => {
      const g = this.s.gfx
      for (const b of this.bells) {
        const off = Math.round(Math.max(-2, Math.min(2, b.a)))
        g.px(b.x, b.y - 1, '#6e4a35')
        g.rect(b.x - 1, b.y, 3, 2, GOLD.b)
        g.px(b.x - 1, b.y, GOLD.l)
        g.hline(b.x - 1, b.x + 1, b.y + 2, GOLD.D)
        g.px(b.x + Math.round(off / 2), b.y + 3, '#6e4a35')
        // Bodhi-leaf clapper.
        g.px(b.x + off, b.y + 4, GOLD.d)
        g.rect(b.x + off - 1, b.y + 5, 3, 1, GOLD.b)
        g.px(b.x + off, b.y + 6, GOLD.d)
      }
    })
  }
  tap(x: number, y: number): boolean {
    let hit = -1
    this.bells.forEach((b, i) => {
      if (Math.abs(b.x - x) < 7 && y > b.y - 5 && y < b.y + 10) {
        b.v += (x < b.x ? 1 : -1) * 9
        hit = i
      }
    })
    if (hit < 0) return false
    sfx.bell(10 + (hit % 5))
    const b = this.bells[hit]
    this.s.particles.sparkles(b.x, b.y + 2, 4, '#fff3a6', 4)
    return true
  }
}

// ---------------------------------------------------------------------------
// Bell tower's big bell and the rack of nine bells.

export class TowerBell implements Life {
  private a = 0
  private v = 0
  constructor(
    private s: WorldScene,
    private x: number,
    private y: number,
    private hit: Rect,
    private sortY: number,
  ) {}
  update(dt: number, t: number) {
    this.v += (-this.a * 6 - this.v * 0.9 + Math.sin(t * 0.8) * 0.1) * dt
    this.a += this.v * dt
  }
  sorted(add: (y: number, draw: () => void) => void) {
    add(this.sortY + 0.5, () => drawTowerBell(this.s.gfx, this.x, this.y, Math.round(this.a)))
  }
  tap(x: number, y: number): boolean {
    if (!inRect(this.hit, x, y)) return false
    this.v += 6
    sfx.bigBell()
    for (let i = 0; i < 3; i++) this.s.particles.add({ kind: 'ripple', x: this.x, y: this.y + 6, max: 1.4 + i * 0.4, size: 22 + i * 10, color: '#fff3a6' })
    return true
  }
}

export class RackBells implements Life {
  private bells: Swing[]
  constructor(
    private s: WorldScene,
    points: Pt[],
    private hit: Rect,
    private sortY: number,
  ) {
    this.bells = points.map((p) => ({ x: p.x, y: p.y, a: 0, v: 0 }))
  }
  update(dt: number, t: number) {
    for (const b of this.bells) {
      b.v += (-b.a * 10 - b.v * 1.2 + Math.sin(t * 1.1 + b.x * 0.1) * 0.25) * dt
      b.a += b.v * dt
    }
  }
  sorted(add: (y: number, draw: () => void) => void) {
    add(this.sortY + 0.5, () => {
      for (const b of this.bells) drawRackBell(this.s.gfx, b.x, b.y, Math.round(Math.max(-2, Math.min(2, b.a))))
    })
  }
  tap(x: number, y: number): boolean {
    if (!inRect(this.hit, x, y)) return false
    let best = 0
    this.bells.forEach((b, i) => {
      if (Math.abs(b.x - x) < Math.abs(this.bells[best].x - x)) best = i
    })
    this.bells.forEach((b, i) => {
      const d = Math.abs(i - best)
      b.v += (d === 0 ? 7 : 3 / d) * (i % 2 ? 1 : -1)
    })
    sfx.bell(best)
    const b = this.bells[best]
    this.s.particles.add({ kind: 'ripple', x: b.x, y: b.y + 5, max: 0.9, size: 9, color: '#fff3a6' })
    return true
  }
}

// ---------------------------------------------------------------------------
// Glints on gold (ช่อฟ้า tips etc.), candle flames, incense smoke.

export class Glints implements Life {
  private live: { x: number; y: number; t: number }[] = []
  private next = 0.5
  constructor(
    private s: WorldScene,
    private points: Pt[],
    private rate = 0.9,
  ) {}
  update(dt: number) {
    this.next -= dt
    if (this.next <= 0 && this.points.length) {
      this.next = rand(0.4, 1.6) / this.rate
      const p = pick(this.points)
      this.live.push({ x: p.x, y: p.y, t: 0 })
    }
    for (const l of this.live) l.t += dt
    this.live = this.live.filter((l) => l.t < 0.6)
  }
  over(g: Surface) {
    const night = this.s.phase === 'night'
    for (const l of this.live) {
      const k = Math.sin((l.t / 0.6) * Math.PI)
      const r = Math.round(k * 2.4)
      const c = night ? '#fff3a6' : '#ffffff'
      g.px(l.x, l.y, c)
      for (let i = 1; i <= r; i++) {
        g.alpha(1 - i / (r + 1))
        g.px(l.x - i, l.y, c)
        g.px(l.x + i, l.y, c)
        g.px(l.x, l.y - i, c)
        g.px(l.x, l.y + i, c)
      }
      g.alpha(1)
    }
  }
}

export class Flames implements Life {
  constructor(
    private s: WorldScene,
    private points: Pt[],
    private sortY?: number,
  ) {}
  static candles(s: WorldScene, x: number, y: number) {
    return new Flames(
      s,
      CANDLE_FLAMES.map(([dx, dy]) => ({ x: x + dx, y: y + dy })),
      y,
    )
  }
  private draw(g: Surface, t: number) {
    this.points.forEach((p, i) => {
      const f = Math.sin(t * 13 + i * 2.1) + Math.sin(t * 7.7 + i)
      g.px(p.x, p.y, '#ffb35a')
      g.px(p.x, p.y - 1, f > -0.6 ? '#fff3a6' : '#ffb35a')
      if (f > 0.4) g.px(p.x, p.y - 2, '#ffe07a')
    })
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    if (this.sortY !== undefined) add(this.sortY + 0.6, () => this.draw(this.s.gfx, t))
  }
  over(g: Surface, t: number) {
    if (this.sortY === undefined) this.draw(g, t)
  }
  glow(g: Surface, t: number, light: number) {
    if (light <= 0.2) return
    for (const p of this.points) drawGlow(g, p.x, p.y - 1, 5 + Math.round(Math.sin(t * 9 + p.x)), light * 0.8, '#ffb35a')
    // Re-draw the flames on top of the tint so they stay bright.
    this.draw(g, t)
  }
}

export class Smoke implements Life {
  constructor(
    private s: WorldScene,
    private points: Pt[],
    private rate = 6,
  ) {}
  update(dt: number) {
    for (const p of this.points) {
      if (Math.random() < dt * this.rate) {
        this.s.particles.add({ kind: 'smoke', x: p.x + rand(-3, 3), y: p.y, vx: rand(-2, 2) + this.s.wind() * 3, vy: rand(-10, -5), max: rand(1.6, 2.8), color: '#efeaf4', size: Math.random() < 0.4 ? 2 : 1 })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Waving flags on poles, lantern strings and bunting.

export class Flags implements Life {
  constructor(
    private s: WorldScene,
    private flags: { x: number; y: number; kind: 'dharma' | 'thai' | 'color'; sortY: number }[],
  ) {}
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    this.flags.forEach((f, i) => add(f.sortY + 0.4, () => drawFlag(this.s.gfx, f.x, f.y, t + this.s.wind() * 0.5, f.kind, i * 1.3)))
  }
}

export class Lanterns implements Life {
  constructor(
    private s: WorldScene,
    private strings: { x0: number; y0: number; x1: number; y1: number; n: number; sag?: number; colors?: Color[] }[],
  ) {}
  private each(t: number, fn: (x: number, y: number, c: Color, i: number) => void) {
    for (const st of this.strings) {
      const sag = st.sag ?? 6
      for (let i = 0; i < st.n; i++) {
        const f = (i + 0.5) / st.n
        const sway = Math.sin(t * 1.6 + i * 0.7 + st.x0) * 0.6 * (0.5 + Math.abs(this.s.wind()))
        const x = Math.round(st.x0 + (st.x1 - st.x0) * f + sway)
        const y = Math.round(st.y0 + (st.y1 - st.y0) * f + Math.sin(f * Math.PI) * sag)
        const cs = st.colors ?? ['#e8514a', '#ffd23f', '#ff9fc0', '#f58f35']
        fn(x, y, cs[i % cs.length], i)
      }
    }
  }
  over(g: Surface, t: number) {
    for (const st of this.strings) {
      const sag = st.sag ?? 6
      let px = st.x0
      let py = st.y0
      const n = 24
      for (let i = 1; i <= n; i++) {
        const f = i / n
        const x = st.x0 + (st.x1 - st.x0) * f
        const y = st.y0 + (st.y1 - st.y0) * f + Math.sin(f * Math.PI) * sag
        g.line(px, py, x, y, '#5a3d4f')
        px = x
        py = y
      }
    }
    const lit = this.s.phase === 'night' || this.s.phase === 'dusk'
    this.each(t, (x, y, c) => drawLantern(g, x, y + 1, c, lit))
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    this.each(t, (x, y, c) => {
      drawGlow(g, x, y + 3, 7, light, mixHex(c, '#ffcf7a', 0.5))
      drawLantern(g, x, y + 1, c, true)
    })
  }
}

// ---------------------------------------------------------------------------
// Drifting cloud shadows and golden-hour sun rays.

let shadowBlob: HTMLCanvasElement | null = null
function cloudShadowSprite(): HTMLCanvasElement {
  if (shadowBlob) return shadowBlob
  const w = 120
  const h = 60
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2c3a5a'
  const blobs = [
    [60, 30, 48, 20],
    [30, 34, 26, 14],
    [90, 28, 26, 16],
    [60, 22, 30, 14],
  ]
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let d = 0
      for (const [bx, by, rx, ry] of blobs) d = Math.max(d, 1 - Math.hypot((x - bx) / rx, (y - by) / ry))
      if (d <= 0) continue
      const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)]
      if (bay < Math.min(1, d * 2.2) * 16) ctx.fillRect(x, y, 1, 1)
    }
  shadowBlob = c
  return c
}

export class CloudShadows implements Life {
  private clouds: { x: number; y: number; v: number }[] = []
  constructor(
    private s: WorldScene,
    n = 3,
  ) {
    for (let i = 0; i < n; i++) this.clouds.push({ x: rand(-120, s.map.w), y: rand(s.map.skyH, s.map.h - 60), v: rand(3, 5) })
  }
  update(dt: number) {
    for (const c of this.clouds) {
      c.x += c.v * dt
      c.y += c.v * dt * 0.25
      if (c.x > this.s.map.w + 20 || c.y > this.s.map.h) {
        c.x = -140
        c.y = rand(this.s.map.skyH - 40, this.s.map.h - 120)
      }
    }
  }
  over(g: Surface) {
    const a = this.s.phase === 'day' ? 0.13 : this.s.phase === 'golden' ? 0.1 : this.s.phase === 'dawn' ? 0.06 : 0
    if (!a) return
    const img = cloudShadowSprite()
    g.ctx.save()
    g.ctx.globalAlpha = a
    for (const c of this.clouds) if (this.s.onScreen(c.x + 60, c.y + 30, 80)) g.draw(img, c.x, c.y)
    g.ctx.restore()
  }
}

export class SunRays implements Life {
  constructor(private s: WorldScene) {}
  glow(g: Surface, t: number) {
    const ph = this.s.phase
    if (ph !== 'golden' && ph !== 'dawn') return
    const color = ph === 'golden' ? '255,214,140' : '255,200,190'
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    const w = g.w
    const h = g.h
    for (let i = 0; i < 4; i++) {
      const a = 0.045 + Math.sin(t * 0.4 + i * 1.7) * 0.02
      g.ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`
      const x = ((i * 53 + t * 1.5) % (w + 80)) - 40
      const bw = 10 + (i % 2) * 8
      g.ctx.beginPath()
      g.ctx.moveTo(x, 0)
      g.ctx.lineTo(x + bw, 0)
      g.ctx.lineTo(x + bw - h * 0.45, h)
      g.ctx.lineTo(x - h * 0.45, h)
      g.ctx.closePath()
      g.ctx.fill()
    }
    g.ctx.restore()
  }
}

// ---------------------------------------------------------------------------
// Street traffic beyond the temple wall.

interface Vehicle {
  x: number
  lane: number
  kind: 'tuktuk' | 'bike' | 'songthaew' | 'cycle'
  v: number
  color: Color
}

export class Traffic implements Life {
  private cars: Vehicle[] = []
  private next = 1
  constructor(
    private s: WorldScene,
    private lanes: { y: number; dir: 1 | -1 }[],
  ) {}
  update(dt: number) {
    this.next -= dt
    if (this.next <= 0) {
      this.next = rand(3, 8)
      const lane = Math.floor(Math.random() * this.lanes.length)
      const L = this.lanes[lane]
      const kind = pick(['tuktuk', 'bike', 'bike', 'songthaew', 'cycle'] as const)
      const v = kind === 'cycle' ? 14 : kind === 'bike' ? 42 : 30
      this.cars.push({ x: L.dir > 0 ? -40 : this.s.map.w + 40, lane, kind, v, color: pick(['#e8514a', '#5a8de0', '#6cc36a', '#ffd23f', '#ff9fc0']) })
    }
    for (const c of this.cars) c.x += c.v * this.lanes[c.lane].dir * dt
    this.cars = this.cars.filter((c) => c.x > -60 && c.x < this.s.map.w + 60)
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const c of this.cars) {
      const L = this.lanes[c.lane]
      add(L.y, () => this.drawVehicle(this.s.gfx, c, L.y, L.dir, t))
    }
  }
  private drawVehicle(g: Surface, c: Vehicle, y: number, dir: 1 | -1, t: number) {
    const x = Math.round(c.x)
    const bob = Math.floor(t * 8 + c.x) % 2
    if (c.kind === 'tuktuk') {
      const s = tukTuk()
      g.draw(s.canvas, x - s.ax, y - s.ay - bob, dir < 0)
      return
    }
    if (c.kind === 'songthaew') {
      g.rect(x - 14, y - 12 - bob, 28, 8, c.color)
      g.rect(x - 14, y - 14 - bob, 28, 2, mixHex(c.color, '#ffffff', 0.3))
      g.rect(x - 12, y - 11 - bob, 18, 3, '#d4f1ff')
      g.rect(x + (dir > 0 ? 8 : -14), y - 11 - bob, 6, 4, '#d4f1ff')
      g.rect(x - 14, y - 4 - bob, 28, 2, '#3a3040')
      g.circle(x - 8, y - 2, 2.5, '#3a3040')
      g.circle(x + 8, y - 2, 2.5, '#3a3040')
      g.px(x + dir * 14, y - 7 - bob, '#fff3a6')
      return
    }
    // Motorbike / bicycle with a rider.
    const wheel = '#3a3040'
    g.circle(x - 5, y - 2, 2.2, wheel)
    g.circle(x + 5, y - 2, 2.2, wheel)
    g.px(x - 5, y - 2, '#bdb2ae')
    g.px(x + 5, y - 2, '#bdb2ae')
    if (c.kind === 'bike') {
      g.rect(x - 5, y - 6, 10, 3, c.color)
      g.px(x + dir * 5, y - 6, '#fff3a6')
    } else {
      g.line(x - 5, y - 2, x, y - 6, '#9a6a45')
      g.line(x + 5, y - 2, x, y - 6, '#9a6a45')
      // Ice-cream box.
      g.rect(x - 8 * dir - 3, y - 9, 6, 5, '#fffaf0')
      g.px(x - 8 * dir - 1, y - 8, '#ff9fc0')
    }
    // Rider.
    g.rect(x - 2, y - 13 - bob, 4, 6, c.kind === 'bike' ? '#fffaf0' : '#86c95f')
    g.rect(x - 2, y - 17 - bob, 4, 4, '#f0bd90')
    g.rect(x - 2, y - 18 - bob, 4, 2, c.kind === 'bike' ? c.color : '#3b2f40')
    g.px(x + dir, y - 16 - bob, '#3a2838')
  }
}

// ---------------------------------------------------------------------------
// Generic tap zones (the map supplies a reaction).

export class TapZones implements Life {
  constructor(private zones: { rect: Rect; fn: (x: number, y: number) => void }[]) {}
  tap(x: number, y: number): boolean {
    for (const z of this.zones) {
      if (inRect(z.rect, x, y)) {
        z.fn(x, y)
        return true
      }
    }
    return false
  }
}

/** Ripple rings helper for maps. */
export function ringFx(g: Surface, x: number, y: number, r: number, c: Color) {
  drawRing(g, x, y, r, r * 0.5, c)
}
