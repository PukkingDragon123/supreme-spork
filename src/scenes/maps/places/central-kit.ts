// Small helpers shared by the central-region place maps (central-*.ts):
// visitor looks, tree-shake taps, swimming creatures, gag builders and
// hotspot shorthands.

import type { Color, Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import type { AvatarLook, Pose, View } from '../../../art/avatar'
import { randomVisitorLook, type Facing, type Hotspot, type WorldScene } from '../../world'
import type { Rect } from '../../pathfind'
import type { Life } from '../../life'
import { drawPerson, drawSpriteGag, type Extra, type Gag, type GagPose } from '../../gags'
import type { Prop } from '../../../art/props'

export function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

/** Tap zone that shakes a tree prop, drops leaves/petals and startles birds. */
export function shakeTree(s: WorldScene, id: string, x: number, y: number, w: number, colors: [Color, Color], kind: 'petal' | 'leaf' = 'leaf', h = 44) {
  return {
    rect: { x: x - w / 2, y: y - h - 14, w, h },
    fn: () => {
      s.shake(id)
      s.drop(x, y - h * 0.7, w * 0.7, 6, colors[0], colors[1], kind)
      if (Math.random() < 0.7) s.burstBirds(x, y - h * 0.8, 1 + Math.floor(Math.random() * 3))
      sfx.whoosh()
    },
  }
}

/** A person gag: stands (or strolls) and says a line when tapped. */
export function person(x: number, y: number, lk: AvatarLook, lines: string[], o: { view?: View; extras?: Extra[]; pose?: Pose; walk?: Gag['walk']; z?: number; react?: Gag['react'] } = {}): Gag {
  return {
    x,
    y,
    z: o.z,
    walk: o.walk,
    lines,
    draw: (g, p) => drawPerson(g, lk, p, o.view ?? 'front', o.extras ?? [], p.moving ? undefined : o.pose),
    react: o.react,
  }
}

/** A sprite gag (sign, statue…) that bounces and speaks when tapped. */
export function spriteGag(x: number, y: number, sp: Prop, lines: string[], o: { w?: number; h?: number; react?: Gag['react']; bounce?: boolean } = {}): Gag {
  return { x, y, w: o.w ?? sp.w, h: o.h ?? sp.h, lines, draw: (g, p) => drawSpriteGag(g, sp, p, o.bounce ?? true), react: o.react }
}

/** Hotspot shorthand. */
export function spot(id: string, label: string, hint: string, icon: string, rect: Rect, at: { x: number; y: number }, face: Facing = 'up', extra: Partial<Hotspot> = {}): Hotspot {
  return { id, label, hint, icon, rect, at, face, ...extra }
}

/** Door hotspot into another map. */
export function door(to: string, label: string, rect: Rect, at: { x: number; y: number }, face: Facing = 'up', marker?: { x: number; y: number }): Hotspot {
  return { id: 'door:' + to, label, hint: 'เดินเข้าไปข้างใน', icon: 'door', rect, at, face, marker, near: 12 }
}

// ---------------------------------------------------------------------------
// Swimmers: turtles, catfish or tilapia moving inside a set of ellipses,
// scattering when tapped. Drawn on the ground layer (in the water).

interface Swim {
  x: number
  y: number
  a: number
  v: number
  t: number
  flee: number
  kind: number
}

export class Swimmers implements Life {
  private list: Swim[] = []
  constructor(
    private s: WorldScene,
    private blobs: [number, number, number, number][],
    n: number,
    private paint: (g: Surface, x: number, y: number, t: number, flip: boolean, kind: number) => void,
    private speed = 5,
    kinds = 1,
  ) {
    for (let i = 0; i < n; i++) {
      const [x, y] = this.point(0.7)
      this.list.push({ x, y, a: rand(0, Math.PI * 2), v: rand(0.6, 1.2), t: rand(0, 5), flee: 0, kind: i % kinds })
    }
  }
  private inside(x: number, y: number, k = 1) {
    return this.blobs.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 <= 1)
  }
  private point(k: number): [number, number] {
    for (let i = 0; i < 30; i++) {
      const [cx, cy, rx, ry] = this.blobs[Math.floor(Math.random() * this.blobs.length)]
      const x = cx + rand(-rx, rx) * k
      const y = cy + rand(-ry, ry) * k
      if (this.inside(x, y, 0.85)) return [x, y]
    }
    const [cx, cy] = this.blobs[0]
    return [cx, cy]
  }
  update(dt: number) {
    for (const f of this.list) {
      f.t += dt
      f.flee = Math.max(0, f.flee - dt)
      if (Math.random() < dt * 0.5) f.a += rand(-1, 1)
      const sp = this.speed * f.v * (f.flee > 0 ? 4 : 1)
      const nx = f.x + Math.cos(f.a) * sp * dt
      const ny = f.y + Math.sin(f.a) * sp * dt * 0.6
      if (this.inside(nx, ny, 0.82)) {
        f.x = nx
        f.y = ny
      } else f.a += Math.PI * (0.6 + Math.random() * 0.6)
    }
  }
  ground(g: Surface, t: number) {
    for (const f of this.list) if (this.s.onScreen(f.x, f.y, 10)) this.paint(g, Math.round(f.x), Math.round(f.y), t + f.t, Math.cos(f.a) < 0, f.kind)
  }
  tap(x: number, y: number): boolean {
    if (!this.inside(x, y, 1.05)) return false
    for (const f of this.list) {
      if (Math.hypot(f.x - x, f.y - y) < 24) {
        f.flee = 1.2
        f.a = Math.atan2(f.y - y, f.x - x)
      }
    }
    this.s.particles.add({ kind: 'ripple', x, y, max: 1.2, size: 10, color: '#e8fbff' })
    sfx.plop()
    return true
  }
  /** Gather everyone near a point (e.g. when food is thrown). */
  gather(x: number, y: number) {
    for (const f of this.list) f.a = Math.atan2(y - f.y, x - f.x)
  }
}

/** Obstacle rects (4-px columns) for a band between two curves. */
export function bandObstacles(x0: number, x1: number, top: (x: number) => number, bottom: (x: number) => number, step = 4): Rect[] {
  const out: Rect[] = []
  for (let x = x0; x < x1; x += step) {
    const a = Math.min(top(x), top(x + step - 1))
    const b = Math.max(bottom(x), bottom(x + step - 1))
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    out.push({ x, y: Math.floor(a), w: step, h: Math.ceil(b - a) + 1 })
  }
  return out
}

/** Pose helper for drawing a gag person with a fixed pose. */
export function drawPosed(g: Surface, lk: AvatarLook, p: GagPose, view: View, pose: Pose, extras: Extra[] = []) {
  drawPerson(g, lk, p, view, extras, pose)
}
