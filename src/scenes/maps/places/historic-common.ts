// Shared helpers for the "historic" place maps (Ayutthaya, Hua Hin,
// Phitsanulok, Lampang, Nan): looks for gag characters, tree shaking,
// footprint obstacles, a walking-sprite gag and a few ambient systems.

import type { Color, Surface } from '../../../engine/pixel'
import type { AvatarLook } from '../../../art/avatar'
import type { Prop } from '../../../art/props'
import type { Rect } from '../../pathfind'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { drawShadow } from '../../../art/props'
import { randomVisitorLook, type Hotspot, type Facing, type WorldScene } from '../../world'
import type { Gag, GagPose } from '../../gags'
import type { Life } from '../../life'
import { drawGlow } from '../../sky'

export function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

/** Obstacle rect for something standing at (x, y) (its ground anchor). */
export function foot(x: number, y: number, w: number, h: number): Rect {
  return { x: Math.round(x - w / 2), y: Math.round(y - h), w, h }
}

/** A tap zone that shakes a tree prop and drops leaves or petals. */
export function shakeTree(s: WorldScene, id: string, x: number, y: number, w: number, h: number, colors: [Color, Color], kind: 'petal' | 'leaf' = 'leaf') {
  return {
    rect: { x: x - w / 2, y: y - h, w, h: h - 10 },
    fn: () => {
      s.shake(id)
      s.drop(x, y - h * 0.55, w * 0.7, 6, colors[0], colors[1], kind)
      if (Math.random() < 0.7) s.burstBirds(x, y - h * 0.7, 1 + Math.floor(Math.random() * 3))
      sfx.whoosh()
    },
  }
}

/** Shorthand for a hotspot whose rect is centred over `at`. */
export function spot(id: string, label: string, hint: string, icon: string, at: { x: number; y: number }, face: Facing, rect: Rect, extra: Partial<Hotspot> = {}): Hotspot {
  return { id, label, hint, icon, rect, at, face, ...extra }
}

/** Draw a baked prop at a gag pose (optionally flipped when walking left). */
export function drawPropAt(g: Surface, s: Prop, p: GagPose, flip = false, shadow?: [number, number]) {
  if (shadow) drawShadow(g, p.x, p.y, shadow[0], shadow[1])
  const hop = p.react > 1.3 ? -1 : 0
  g.draw(s.canvas, Math.round(flip ? p.x - (s.w - s.ax) : p.x - s.ax), Math.round(p.y - s.ay + hop), flip)
}

/**
 * A gag that walks back and forth using animation frames of a side-view
 * sprite that faces right (elephants, horse carriages, cyclists).
 */
export function walkerGag(o: {
  x0: number
  x1: number
  y: number
  speed: number
  frames: (f: number) => Prop
  lines: string[]
  w?: number
  h?: number
  fps?: number
  shadow?: [number, number]
  react?: Gag['react']
}): Gag {
  return {
    x: o.x0,
    y: o.y,
    w: o.w ?? 40,
    h: o.h ?? 40,
    walk: { x0: o.x0, x1: o.x1, speed: o.speed },
    lines: o.lines,
    draw: (g, p) => {
      const f = p.moving ? Math.floor(p.t * (o.fps ?? 4)) : 0
      drawPropAt(g, o.frames(f), p, p.flip, o.shadow)
    },
    react: o.react,
  }
}

/** Soft coloured flood lights on ruins at night (drawn after the tint). */
export class Floodlights implements Life {
  constructor(
    private s: WorldScene,
    private lamps: { x: number; y: number; r: number; color: Color }[],
  ) {}
  glow(g: Surface, t: number, light: number) {
    if (light < 0.3) return
    for (const l of this.lamps) {
      if (!this.s.onScreen(l.x, l.y, l.r)) continue
      const k = light * (0.55 + Math.sin(t * 0.7 + l.x) * 0.05)
      drawGlow(g, l.x, l.y, l.r, k, l.color)
    }
  }
}

/** Birds that sit on a tower top and scatter when tapped. */
export class PerchedBirds implements Life {
  private away = 0
  constructor(
    private s: WorldScene,
    private perches: { x: number; y: number }[],
    private zone: Rect,
  ) {}
  update(dt: number) {
    this.away = Math.max(0, this.away - dt)
  }
  over(g: Surface, t: number) {
    if (this.away > 0) return
    this.perches.forEach((p, i) => {
      if (!this.s.onScreen(p.x, p.y, 10)) return
      const bob = Math.floor(t * 2 + i) % 5 === 0 ? 1 : 0
      g.rect(p.x - 1, p.y - 2 + bob, 3, 2, '#6e6470')
      g.px(p.x + (i % 2 ? 2 : -2), p.y - 2 + bob, '#8c8187')
      g.px(p.x + (i % 2 ? 2 : -2), p.y - 3 + bob, '#3a3040')
    })
  }
  tap(x: number, y: number) {
    const z = this.zone
    if (x < z.x || x > z.x + z.w || y < z.y || y > z.y + z.h || this.away > 0) return false
    for (const p of this.perches) this.s.burstBirds(p.x, p.y - 2, 1)
    this.away = 14
    sfx.whoosh()
    return true
  }
}

/**
 * Luck zone: walking through `rect` (e.g. under an elephant's belly) pops
 * sparkles and a line of speech once per pass.
 */
export class LuckZone implements Life {
  private inside = false
  private cool = 0
  constructor(
    private s: WorldScene,
    private rect: Rect,
    private lines: string[],
    private at: { x: number; y: number },
  ) {}
  update(dt: number) {
    this.cool = Math.max(0, this.cool - dt)
    const p = this.s.player
    const r = this.rect
    const inside = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
    if (inside && !this.inside && this.cool <= 0) {
      this.s.particles.sparkles(p.x, p.y - 14, 12, '#fff3a6', 10)
      this.s.particles.add({ kind: 'coin', x: p.x, y: p.y - 20, vy: -16, max: 0.9 })
      this.s.say(this.lines[Math.floor(rand(0, this.lines.length))], this.at.x, this.at.y)
      sfx.sparkle()
      this.cool = 4
    }
    this.inside = inside
  }
}

/** Gentle floating dust motes in a beam of light (interiors). */
export class DustMotes implements Life {
  private motes: { x: number; y: number; t: number }[] = []
  constructor(
    private s: WorldScene,
    private beams: Rect[],
    n = 18,
  ) {
    for (let i = 0; i < n; i++) {
      const b = beams[i % beams.length]
      this.motes.push({ x: rand(b.x, b.x + b.w), y: rand(b.y, b.y + b.h), t: rand(0, 10) })
    }
  }
  update(dt: number) {
    for (const m of this.motes) {
      m.t += dt
      m.y -= dt * 1.5
      m.x += Math.sin(m.t * 0.7) * dt * 2
      const b = this.beams.find((q) => m.x >= q.x - 4 && m.x <= q.x + q.w + 4 && m.y >= q.y - 4 && m.y <= q.y + q.h + 4)
      if (!b) {
        const nb = this.beams[Math.floor(Math.random() * this.beams.length)]
        m.x = rand(nb.x, nb.x + nb.w)
        m.y = nb.y + nb.h
      }
    }
  }
  over(g: Surface, t: number) {
    for (const m of this.motes) {
      if (!this.s.onScreen(m.x, m.y, 4)) continue
      g.alpha(0.5 + Math.sin(m.t * 2 + t) * 0.3)
      g.px(m.x, m.y, '#fff3c8')
      g.alpha(1)
    }
  }
}

/** Light shafts through windows (additive, drawn after the tint). */
export class LightShafts implements Life {
  constructor(
    private s: WorldScene,
    private shafts: { x: number; y: number; w: number; h: number; dx: number; color?: string; a?: number }[],
  ) {}
  glow(g: Surface, t: number) {
    const ctx = g.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const s of this.shafts) {
      if (!this.s.onScreen(s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h))) continue
      const a = (s.a ?? 0.07) * (0.85 + Math.sin(t * 0.6 + s.x) * 0.15)
      const grad = ctx.createLinearGradient(0, s.y - g.oy, 0, s.y + s.h - g.oy)
      const col = s.color ?? '255,236,190'
      grad.addColorStop(0, `rgba(${col},${a.toFixed(3)})`)
      grad.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(s.x - g.ox, s.y - g.oy)
      ctx.lineTo(s.x + s.w - g.ox, s.y - g.oy)
      ctx.lineTo(s.x + s.w + s.dx - g.ox, s.y + s.h - g.oy)
      ctx.lineTo(s.x + s.dx - g.ox, s.y + s.h - g.oy)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}
