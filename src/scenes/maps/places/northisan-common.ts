// Shared scene helpers for the north & isan place maps: pilgrims walking
// circles round a chedi, swaying Lanna tung banners, things moving along a
// track (cable car, boats), drifting mist, twinkling lights, music notes and
// costume overlays for tappable characters.

import type { Color, Surface } from '../../../engine/pixel'
import { rand } from '../../../engine/rng'
import { sfx } from '../../../engine/audio'
import { avatarSprite, type AvatarLook, type Pose } from '../../../art/avatar'
import { drawShadow } from '../../../art/props'
import { mixHex } from '../../../art/characters'
import { randomVisitorLook, type Hotspot, type WorldScene } from '../../world'
import type { Life } from '../../life'
import type { GagPose } from '../../gags'
import { drawGlow } from '../../sky'
import type { Rect } from '../../pathfind'

export function look(o: Partial<AvatarLook>): AvatarLook {
  return { ...randomVisitorLook(), ...o }
}

export type R = { x: number; y: number; w: number; h: number }

/** Hotspot shorthand: rect + stand point (+ optional marker/face). */
export function hs(id: string, label: string, hint: string, icon: string, rect: R, at: { x: number; y: number }, o: Partial<Hotspot> = {}): Hotspot {
  return { id, label, hint, icon, rect, at, face: 'up', ...o }
}

// ---------------------------------------------------------------------------
// Pilgrims circling a monument clockwise (เวียนเทียน / ประทักษิณ).

export class Circlers implements Life {
  private walkers: { a: number; look: AvatarLook; v: number; lotus: boolean }[] = []
  constructor(
    private s: WorldScene,
    private cx: number,
    private cy: number,
    private rx: number,
    private ry: number,
    n = 5,
    /** Only draw walkers in front of (y > cy) or anywhere. */
    private looks: Partial<AvatarLook>[] = [],
  ) {
    for (let i = 0; i < n; i++) {
      this.walkers.push({ a: (i / n) * Math.PI * 2 + rand(-0.2, 0.2), look: look({ top: 'top_white', ...(this.looks[i % Math.max(1, this.looks.length)] ?? {}) }), v: rand(0.1, 0.14), lotus: i % 2 === 0 })
    }
  }
  update(dt: number) {
    for (const w of this.walkers) w.a += w.v * dt
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const w of this.walkers) {
      // Clockwise seen from above: right side going down, left side going up.
      const x = this.cx + Math.cos(w.a) * this.rx
      const y = this.cy + Math.sin(w.a) * this.ry
      if (!this.s.onScreen(x, y, 30)) continue
      const dx = -Math.sin(w.a)
      const dy = Math.cos(w.a)
      add(y, () => {
        const g = this.s.gfx
        const view = Math.abs(dx) * this.rx > Math.abs(dy) * this.ry ? 'side' : dy > 0 ? 'front' : 'back'
        const pose: Pose = ['walk1', 'pass', 'walk2', 'pass'][Math.floor(t * 5 + w.a * 7) % 4] as Pose
        const sp = avatarSprite(w.look, view, pose, { flip: dx < 0 })
        drawShadow(g, x, y, 6, 2)
        g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1))
        if (w.lotus) {
          const hx = Math.round(x + (view === 'side' ? (dx < 0 ? -4 : 4) : 0))
          g.px(hx, Math.round(y - 14), '#ff9fc0')
          g.px(hx, Math.round(y - 15), '#ffe0ea')
          g.px(hx + 1, Math.round(y - 13), '#3f8a4f')
        }
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Lanna tung (ตุง) banners hanging from beams; they sway with the breeze.

export class Tung implements Life {
  constructor(
    private s: WorldScene,
    private items: { x: number; y: number; len: number; colors: Color[]; sortY?: number }[],
  ) {}
  private draw(g: Surface, t: number) {
    this.items.forEach((b, i) => {
      if (!this.s.onScreen(b.x, b.y + b.len / 2, b.len)) return
      const w = this.s.wind()
      g.px(b.x, b.y - 1, '#6e4a35')
      g.hline(b.x - 2, b.x + 2, b.y, '#9a6a45')
      for (let k = 0; k < b.len; k++) {
        const sway = Math.round(Math.sin(t * 1.8 + i + k * 0.12) * (k / b.len) * (1.2 + Math.abs(w)))
        const c = b.colors[Math.floor(k / 4) % b.colors.length]
        const half = k % 8 < 1 ? 2 : 1
        g.hline(b.x - half + sway, b.x + half + sway, b.y + 1 + k, c)
        if (k % 8 === 0) g.px(b.x + sway, b.y + 1 + k, '#fff3a6')
      }
      // Tassel.
      const sway = Math.round(Math.sin(t * 1.8 + i + b.len * 0.12) * (1.2 + Math.abs(w)))
      g.px(b.x + sway - 1, b.y + b.len + 1, b.colors[0])
      g.px(b.x + sway + 1, b.y + b.len + 1, b.colors[0])
      g.px(b.x + sway, b.y + b.len + 2, '#ffd23f')
    })
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const sy = this.items[0]?.sortY
    if (sy !== undefined) add(sy, () => this.draw(this.s.gfx, t))
  }
  over(g: Surface, t: number) {
    if (this.items[0]?.sortY === undefined) this.draw(g, t)
  }
}

// ---------------------------------------------------------------------------
// Something travelling back and forth along a polyline (cable car, boat).

export class Shuttle implements Life {
  private d = 0
  private dir = 1
  private wait = 0
  private len: number
  react = 0
  private line = 0
  constructor(
    private s: WorldScene,
    private path: [number, number][],
    private speed: number,
    private drawFn: (g: Surface, x: number, y: number, t: number, dir: number) => void,
    private o: { pause?: number; lines?: string[]; hit?: { w: number; h: number }; onArrive?: () => void; sortOffset?: number; loop?: boolean } = {},
  ) {
    let L = 0
    for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1])
    this.len = L
    this.d = rand(0, L)
  }
  pos(): [number, number] {
    let d = this.d
    const p = this.path
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
      if (d <= l || i === p.length - 1) {
        const k = l ? Math.min(1, d / l) : 0
        return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k]
      }
      d -= l
    }
    return p[0]
  }
  update(dt: number) {
    this.react = Math.max(0, this.react - dt)
    if (this.wait > 0) {
      this.wait -= dt
      return
    }
    this.d += this.speed * this.dir * dt
    if (this.o.loop) {
      if (this.d > this.len) this.d -= this.len
      return
    }
    if (this.d >= this.len || this.d <= 0) {
      this.d = Math.max(0, Math.min(this.len, this.d))
      this.dir *= -1
      this.wait = this.o.pause ?? 3
      this.o.onArrive?.()
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    const [x, y] = this.pos()
    if (!this.s.onScreen(x, y, 40)) return
    add(y + (this.o.sortOffset ?? 0), () => this.drawFn(this.s.gfx, x, y, t, this.dir))
  }
  tap(x: number, y: number): boolean {
    const [px, py] = this.pos()
    const hit = this.o.hit ?? { w: 16, h: 16 }
    if (Math.abs(x - px) > hit.w / 2 || y < py - hit.h || y > py + 3) return false
    this.react = 1
    const lines = this.o.lines ?? []
    if (lines.length) this.s.say(lines[this.line++ % lines.length], px, py - hit.h - 2)
    sfx.chime()
    return true
  }
}

// ---------------------------------------------------------------------------
// Mist and night twinkles.

/** Soft drifting mist banks (draw in overlay). */
export function drawMist(g: Surface, t: number, x0: number, x1: number, bands: number[], alpha = 0.26, color = '#f5f7ff') {
  g.ctx.save()
  g.ctx.globalAlpha = alpha
  bands.forEach((y, i) => {
    const w = x1 - x0 + 160
    const x = x0 + ((t * (3 + (i % 3)) + i * 71) % w) - 80
    const yy = y + Math.sin(t * 0.2 + i) * 4
    g.ellipse(x, yy, 50, 6, color)
    g.ellipse(x + 40, yy + 4, 36, 5, color)
    g.ellipse(x - 34, yy + 3, 28, 4, color)
  })
  g.ctx.restore()
}

/** Lights that twinkle at night (city lights, fairy lights, fire boats…). */
export class Twinkles implements Life {
  constructor(
    private s: WorldScene,
    private pts: { x: number; y: number; c?: Color; r?: number }[],
    private always = false,
  ) {}
  glow(g: Surface, t: number, light: number) {
    const k = this.always ? Math.max(0.6, light) : light
    if (k < 0.3) return
    this.pts.forEach((p, i) => {
      if (!this.s.onScreen(p.x, p.y, 8)) return
      const on = Math.sin(t * (1.3 + (i % 5) * 0.4) + i * 2.1) > -0.4
      if (!on) return
      const c = p.c ?? '#ffe07a'
      if (p.r) drawGlow(g, p.x, p.y, p.r, k * 0.7, c)
      g.px(p.x, p.y, mixHex(c, '#ffffff', 0.4))
    })
  }
}

// ---------------------------------------------------------------------------
// Music notes floating up from a performer.

export class Notes implements Life {
  private notes: { x: number; y: number; t: number; c: Color }[] = []
  constructor(private s: WorldScene) {}
  emit(x: number, y: number, n = 3) {
    for (let i = 0; i < n; i++) this.notes.push({ x: x + rand(-4, 4), y: y - i * 3, t: -i * 0.25, c: ['#ff6f91', '#ffd23f', '#6cc3ff', '#b394f0'][Math.floor(Math.random() * 4)] })
  }
  update(dt: number) {
    for (const n of this.notes) {
      n.t += dt
      if (n.t > 0) {
        n.y -= 10 * dt
        n.x += Math.sin(n.t * 4) * 6 * dt
      }
    }
    this.notes = this.notes.filter((n) => n.t < 1.8)
  }
  over(g: Surface) {
    for (const n of this.notes) {
      if (n.t < 0 || !this.s.onScreen(n.x, n.y, 8)) continue
      g.alpha(Math.min(1, (1.8 - n.t) * 1.5))
      const x = Math.round(n.x)
      const y = Math.round(n.y)
      g.px(x, y, n.c)
      g.px(x + 1, y, n.c)
      g.px(x, y + 1, n.c)
      g.px(x + 1, y + 1, n.c)
      g.vline(x + 2, y - 4, y, n.c)
      g.px(x + 3, y - 4, n.c)
      g.alpha(1)
    }
  }
}

/** Play a little pentatonic phrase. */
export function tune(steps: number[], gap = 140) {
  steps.forEach((s, i) => setTimeout(() => sfx.hum(s), i * gap))
}

// ---------------------------------------------------------------------------
// Costume overlays for gag characters (drawn over drawPerson / avatars).

export type Costume = 'akha' | 'hmong' | 'karen' | 'lanna' | 'isan' | 'korat' | 'apron' | 'chef' | 'none'

/** Draw a person with a costume overlay; view is front unless walking. */
export function drawCostumed(g: Surface, lk: AvatarLook, p: GagPose, costume: Costume, pose?: Pose, view: 'front' | 'back' | 'side' = 'front') {
  const v = p.moving ? 'side' : view
  const ps: Pose = pose ?? (p.moving ? (['walk1', 'pass', 'walk2', 'pass'] as Pose[])[Math.floor(p.t * 8) % 4] : p.react > 0 && v === 'front' ? 'happy' : 'stand')
  const s = avatarSprite(lk, v, ps, { flip: p.flip })
  const x = p.x
  const y = p.y
  drawShadow(g, x, y, 6, 2)
  g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h + 1))
  costumeOverlay(g, x, y, costume, v, p.t)
}

export function costumeOverlay(g: Surface, x: number, y: number, costume: Costume, view: 'front' | 'back' | 'side', t: number) {
  if (costume === 'akha') {
    // Tall silver-studded headdress with red pompoms and coin fringe.
    const top = y - 33
    g.rect(x - 5, top, 10, 7, '#2a2438')
    for (let i = 0; i < 5; i++) g.px(x - 4 + i * 2, top + 1 + (i % 2), '#e4e8f0')
    for (let i = 0; i < 4; i++) g.px(x - 3 + i * 2, top + 4, '#ffffff')
    g.rect(x - 6, top - 2, 3, 3, '#e8514a')
    g.rect(x + 3, top - 2, 3, 3, '#e8514a')
    g.px(x - 1, top - 2, '#ffd23f')
    g.px(x + 1, top - 3, '#6cc36a')
    for (let i = -4; i <= 4; i += 2) g.px(x + i, top + 7, '#e4e8f0')
    if (view !== 'back') {
      // Embroidered jacket panel.
      g.rect(x - 4, y - 15, 8, 5, '#2a2438')
      g.hline(x - 4, x + 3, y - 12, '#e8514a')
      g.hline(x - 4, x + 3, y - 11, '#ffd23f')
      g.px(x - 2, y - 14, '#6cc3ff')
      g.px(x + 1, y - 14, '#ff9fc0')
    }
  } else if (costume === 'hmong') {
    // Black turban with a pink pompom trim and an embroidered collar.
    const top = y - 30
    g.rect(x - 6, top, 12, 4, '#241a2b')
    g.hline(x - 6, x + 5, top + 3, '#ff6f91')
    for (let i = -5; i <= 5; i += 2) g.px(x + i, top + 4, '#ff9fc0')
    if (view !== 'back') {
      g.rect(x - 4, y - 15, 8, 3, '#241a2b')
      g.hline(x - 3, x + 2, y - 14, '#6cc3ff')
      g.px(x - 1, y - 13, '#ff6f91')
      g.px(x + 1, y - 13, '#ffd23f')
      // Silver neck ring.
      g.hline(x - 3, x + 2, y - 16, '#e4e8f0')
      g.px(x - 2, y - 15, '#ffffff')
    }
    g.rect(x - 4, y - 8, 8, 2, '#3a3a78')
    g.hline(x - 4, x + 3, y - 7, '#e8514a')
  } else if (costume === 'karen') {
    if (view !== 'back') {
      g.rect(x - 4, y - 15, 8, 7, '#e8514a')
      g.hline(x - 4, x + 3, y - 11, '#fffaf0')
      g.px(x - 2, y - 13, '#fffaf0')
      g.px(x + 1, y - 13, '#fffaf0')
    }
    g.rect(x - 5, y - 30, 10, 2, '#fffaf0')
  } else if (costume === 'lanna') {
    // Sabai sash and a flower in the hair bun.
    if (view !== 'back') {
      g.line(x - 4, y - 16, x + 3, y - 10, '#ffd23f')
      g.line(x - 4, y - 15, x + 3, y - 9, '#f58f35')
    }
    g.px(x + 3, y - 27, '#ff9fc0')
    g.px(x + 4, y - 28, '#ffe0ea')
    g.px(x + 4, y - 26, '#ffd23f')
  } else if (costume === 'isan') {
    // Indigo mo hom shirt and a checked pha khao ma.
    if (view !== 'back') {
      g.rect(x - 4, y - 15, 8, 6, '#3a3a78')
      g.px(x, y - 14, '#fffaf0')
    }
    for (let i = -4; i <= 3; i++) g.px(x + i, y - 9, (i & 1) ? '#e8514a' : '#5a8de0')
  } else if (costume === 'korat') {
    // Silk sash and a gold belt.
    if (view !== 'back') g.line(x - 4, y - 16, x + 3, y - 10, '#b394f0')
    g.hline(x - 4, x + 3, y - 9, '#ffd23f')
  } else if (costume === 'apron') {
    if (view !== 'back') {
      g.rect(x - 3, y - 12, 6, 6, '#fffaf0')
      g.hline(x - 3, x + 2, y - 12, '#e8514a')
    }
    g.rect(x - 5, y - 29, 10, 2, '#e8514a')
  } else if (costume === 'chef') {
    g.rect(x - 4, y - 34, 8, 6, '#ffffff')
    g.rect(x - 5, y - 34, 10, 3, '#ffffff')
    g.hline(x - 4, x + 3, y - 29, '#dcd6d2')
  }
  void t
}

/** A tiny animal drawn in place (squirrel, gecko, bird) for tap gags. */
export function drawSquirrel(g: Surface, x: number, y: number, t: number, hop: boolean, flip = false) {
  const f = flip ? -1 : 1
  const by = y - (hop ? 3 : 0)
  const c = '#9a6a45'
  const cL = '#c9956a'
  // Tail.
  const wag = Math.round(Math.sin(t * 6))
  g.rect(x - 4 * f - (f < 0 ? 2 : 0), by - 7 + wag, 3, 5, c)
  g.px(x - 4 * f, by - 8 + wag, cL)
  g.rect(x - 2, by - 4, 4, 4, c)
  g.px(x - 1, by - 3, cL)
  g.rect(x + (f > 0 ? 1 : -3), by - 6, 3, 3, c)
  g.px(x + (f > 0 ? 3 : -3), by - 5, '#241a2b')
  g.px(x + (f > 0 ? 2 : -2), by - 7, c)
}

// ---------------------------------------------------------------------------
// Fish shadows swimming in open water (catfish, tilapia); tap to make one jump.

export class SwimFish implements Life {
  private fish: { x: number; y: number; a: number; v: number; len: number; jump: number; c: Color }[] = []
  constructor(
    private s: WorldScene,
    private areas: Rect[],
    n = 8,
    colors: Color[] = ['#3a4a5e', '#4a5a6e', '#5a6a58'],
  ) {
    for (let i = 0; i < n; i++) {
      const r = areas[i % areas.length]
      this.fish.push({ x: rand(r.x, r.x + r.w), y: rand(r.y, r.y + r.h), a: rand(0, Math.PI * 2), v: rand(4, 9), len: 4 + (i % 3), jump: 0, c: colors[i % colors.length] })
    }
  }
  private inside(x: number, y: number) {
    return this.areas.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
  }
  update(dt: number) {
    for (const f of this.fish) {
      if (f.jump > 0) {
        f.jump -= dt
        continue
      }
      f.a += rand(-1.5, 1.5) * dt
      const nx = f.x + Math.cos(f.a) * f.v * dt
      const ny = f.y + Math.sin(f.a) * f.v * dt * 0.6
      if (this.inside(nx, ny)) {
        f.x = nx
        f.y = ny
      } else f.a += Math.PI * 0.7
    }
  }
  ground(g: Surface, t: number) {
    for (const f of this.fish) {
      if (!this.s.onScreen(f.x, f.y, 10) || f.jump > 0) continue
      g.alpha(0.55)
      const dx = Math.cos(f.a)
      const dy = Math.sin(f.a) * 0.6
      for (let k = 0; k < f.len; k++) g.px(Math.round(f.x - dx * k), Math.round(f.y - dy * k), f.c)
      const tail = Math.sin(t * 8 + f.x) > 0 ? 1 : -1
      g.px(Math.round(f.x - dx * f.len - dy * tail), Math.round(f.y - dy * f.len + dx * tail * 0.6), f.c)
      g.alpha(1)
    }
  }
  over(g: Surface) {
    for (const f of this.fish) {
      if (f.jump <= 0 || !this.s.onScreen(f.x, f.y, 10)) continue
      const k = 1 - f.jump / 0.7
      const y = f.y - Math.sin(k * Math.PI) * 10
      g.rect(Math.round(f.x) - 2, Math.round(y) - 1, 5, 2, '#8a9aae')
      g.px(Math.round(f.x) + 3, Math.round(y) - 2, '#8a9aae')
      g.px(Math.round(f.x) - 1, Math.round(y) - 1, '#ffffff')
    }
  }
  tap(x: number, y: number): boolean {
    if (!this.inside(x, y)) return false
    let best: (typeof this.fish)[number] | null = null
    let bd = 30
    for (const f of this.fish) {
      const d = Math.hypot(f.x - x, f.y - y)
      if (d < bd) {
        bd = d
        best = f
      }
    }
    if (!best) return false
    best.jump = 0.7
    for (let i = 0; i < 5; i++) this.s.particles.add({ kind: 'drop', x: best.x, y: best.y, vx: rand(-14, 14), vy: rand(-26, -10), g: 80, max: 0.6, color: '#bfe6ff', size: 1 })
    this.s.particles.add({ kind: 'ripple', x: best.x, y: best.y, max: 0.9, size: 8, color: '#e8f8ff' })
    sfx.splash()
    return true
  }
}

/** Area helper for wander/fireflies. */
export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

export { drawGlow }
