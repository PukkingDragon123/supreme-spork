// Fireworks for the temple fair (the scheduled shows over the ubosot, taps on
// the night sky, the view from the top of the ferris wheel): rockets with a
// sparkling trail and shaped shells (peony, willow, ring, heart, crackle).
// A tiny particle system of its own; draw it after the night tint so the
// sparks glow at full brightness.

import type { Surface } from '../../engine/pixel'
import { glowSprite } from '../../scenes/sky'
import type { BurstKind } from '../../activities/fair/schedule'

interface Spark {
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  g: number
  drag: number
  life: number
  max: number
  color: string
  /** Twinkles (crackle glitter) instead of fading smoothly. */
  twinkle: boolean
  delay: number
}

interface Rocket {
  x: number
  y: number
  tx: number
  ty: number
  t: number
  dur: number
  kind: BurstKind
  color: string
  size: number
}

interface Flash {
  x: number
  y: number
  life: number
  color: string
  r: number
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export class FireworkSky {
  sparks: Spark[] = []
  rockets: Rocket[] = []
  flashes: Flash[] = []
  /** Called when a shell bursts (sound, camera flash…). */
  onBurst?: (x: number, y: number, kind: BurstKind, color: string) => void
  /** Global size factor (the ferris-wheel view draws them bigger). */
  constructor(public scale = 1) {}

  /** Launch a rocket from (x0, y0) that bursts at (x, y). */
  launch(x0: number, y0: number, x: number, y: number, kind: BurstKind, color: string, size = 1) {
    this.rockets.push({ x: x0, y: y0, tx: x, ty: y, t: 0, dur: 0.55 + Math.random() * 0.25, kind, color, size })
  }

  /** Burst immediately at (x, y). */
  burst(x: number, y: number, kind: BurstKind, color: string, size = 1) {
    const s = size * this.scale
    const add = (vx: number, vy: number, o: Partial<Spark> = {}) =>
      this.sparks.push({ x, y, px: x, py: y, vx, vy, g: 14, drag: 1.3, life: 1.2, max: 1.2, color, twinkle: false, delay: 0, ...o })
    if (kind === 'peony') {
      const n = 26
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rnd(-0.08, 0.08)
        const v = rnd(26, 36) * s
        add(Math.cos(a) * v, Math.sin(a) * v, { color: i % 4 === 0 ? '#fff6d0' : color, life: rnd(1, 1.4), max: 1.4 })
      }
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2
        const v = rnd(8, 16) * s
        add(Math.cos(a) * v, Math.sin(a) * v, { color: '#ffffff', life: 0.6, max: 0.6 })
      }
    } else if (kind === 'willow') {
      const n = 22
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const v = rnd(18, 26) * s
        add(Math.cos(a) * v, Math.sin(a) * v - 6, { color: i % 3 ? '#ffd27a' : '#fff3c0', g: 26, drag: 1.8, life: rnd(1.8, 2.3), max: 2.3 })
      }
    } else if (kind === 'ring') {
      const n = 30
      const tilt = rnd(0.45, 1)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const v = 30 * s
        add(Math.cos(a) * v, Math.sin(a) * v * tilt, { color: i % 2 ? color : '#ffffff', g: 6, life: 1.1, max: 1.1 })
      }
      add(0, 0, { color, g: 0, life: 0.5, max: 0.5 })
    } else if (kind === 'heart') {
      const n = 32
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const hx = 16 * Math.pow(Math.sin(a), 3)
        const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
        add(hx * 1.9 * s, hy * 1.9 * s, { color: i % 5 === 0 ? '#ffffff' : '#ff6f91', g: 4, drag: 1.6, life: 1.4, max: 1.4 })
      }
    } else {
      // Crackle: a small shell that splits into popping glitter.
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2
        const v = rnd(14, 24) * s
        add(Math.cos(a) * v, Math.sin(a) * v, { color, life: 0.5, max: 0.5 })
      }
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2
        const v = rnd(10, 30) * s
        add(Math.cos(a) * v, Math.sin(a) * v, { color: '#fffaf0', twinkle: true, g: 10, life: rnd(0.8, 1.3), max: 1.3, delay: rnd(0.3, 0.6) })
      }
    }
    this.flashes.push({ x, y, life: 0.35, color, r: Math.round(18 * s) })
    this.onBurst?.(x, y, kind, color)
  }

  get busy() {
    return this.sparks.length > 0 || this.rockets.length > 0
  }

  update(dt: number) {
    for (const r of this.rockets) {
      r.t += dt / r.dur
      const k = Math.min(1, r.t)
      const e = 1 - (1 - k) * (1 - k)
      const nx = r.x + (r.tx - r.x) * e
      const ny = r.y + (r.ty - r.y) * e
      // Trail glitter.
      if (Math.random() < 0.8) this.sparks.push({ x: nx + rnd(-0.5, 0.5), y: ny, px: nx, py: ny, vx: rnd(-3, 3), vy: rnd(4, 10), g: 10, drag: 1, life: 0.35, max: 0.35, color: '#ffd9a0', twinkle: false, delay: 0 })
      if (r.t >= 1) this.burst(r.tx, r.ty, r.kind, r.color, r.size)
    }
    this.rockets = this.rockets.filter((r) => r.t < 1)
    for (const s of this.sparks) {
      if (s.delay > 0) {
        s.delay -= dt
        continue
      }
      s.life -= dt
      s.px = s.x
      s.py = s.y
      const k = Math.max(0, 1 - s.drag * dt)
      s.vx *= k
      s.vy = s.vy * k + s.g * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
    }
    this.sparks = this.sparks.filter((s) => s.life > 0)
    if (this.sparks.length > 900) this.sparks.splice(0, this.sparks.length - 900)
    for (const f of this.flashes) f.life -= dt
    this.flashes = this.flashes.filter((f) => f.life > 0)
  }

  /** Draw (world or screen space, whatever the surface camera is). */
  draw(g: Surface, t: number) {
    const ctx = g.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const f of this.flashes) {
      ctx.globalAlpha = Math.min(1, f.life / 0.35) * 0.55
      const c = glowSprite(f.r, f.color)
      ctx.drawImage(c, Math.round(f.x - f.r - g.ox), Math.round(f.y - f.r - g.oy))
    }
    ctx.restore()
    for (const r of this.rockets) {
      const k = Math.min(1, r.t)
      const e = 1 - (1 - k) * (1 - k)
      g.px(r.x + (r.tx - r.x) * e, r.y + (r.ty - r.y) * e, '#fff3d0')
    }
    for (const s of this.sparks) {
      if (s.delay > 0) continue
      const a = s.life / s.max
      if (s.twinkle && Math.floor((t + s.max * 7) * 18 + s.x) % 3 === 0) continue
      g.alpha(Math.min(1, a * 1.6))
      if (a > 0.45) g.px(s.px, s.py, s.color)
      g.px(s.x, s.y, a > 0.7 ? '#ffffff' : s.color)
      g.alpha(1)
    }
  }
}
