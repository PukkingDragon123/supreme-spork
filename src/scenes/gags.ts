// Ambient "gags": little scenery characters and objects that react to a tap
// with a speech bubble (scene.say) and a small animation – vendors, a selfie
// tourist, an auntie with a sun umbrella, a monk checking his phone, a
// sprawled soi dog, cats in a box… No rewards, just charm.

import type { Color, Surface } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'
import { rand } from '../engine/rng'
import { sfx } from '../engine/audio'
import { avatarSprite, type AvatarLook, type Pose, type View } from '../art/avatar'
import { monkSprite } from '../art/characters'
import { drawShadow } from '../art/props'
import { drawBanner } from '../art/modern'
import { mixHex } from '../art/characters'
import type { Life } from './life'
import type { WorldScene } from './world'
import { drawGlow } from './sky'

export interface GagPose {
  x: number
  y: number
  flip: boolean
  moving: boolean
  /** Seconds left of the tap reaction (0 = idle). */
  react: number
  t: number
}

export interface Gag {
  x: number
  y: number
  /** Hit box size above the anchor (default 14×26). */
  w?: number
  h?: number
  /** Speech lines (one is said per tap, in turn). */
  lines: string[]
  /** Stroll back and forth between x0 and x1. */
  walk?: { x0: number; x1: number; speed: number }
  draw(g: Surface, p: GagPose): void
  react?(s: WorldScene, x: number, y: number): void
  /** Sort offset (e.g. -1 to stay behind a stall). */
  z?: number
}

interface GagState {
  gag: Gag
  react: number
  line: number
  x: number
  y: number
  flip: boolean
  moving: boolean
  walkT: number
  pause: number
}

export class Gags implements Life {
  private items: GagState[]
  constructor(
    private s: WorldScene,
    gags: Gag[],
  ) {
    this.items = gags.map((gag) => ({ gag, react: 0, line: Math.floor(Math.random() * gag.lines.length), x: gag.x, y: gag.y, flip: false, moving: false, walkT: rand(0, 10), pause: 0 }))
  }
  update(dt: number) {
    for (const it of this.items) {
      it.react = Math.max(0, it.react - dt)
      const w = it.gag.walk
      if (!w) continue
      if (it.react > 0 || it.pause > 0) {
        it.pause = Math.max(0, it.pause - dt)
        it.moving = false
        continue
      }
      const prev = it.x
      it.walkT += dt
      const len = Math.abs(w.x1 - w.x0) || 1
      const ph = ((it.walkT * w.speed) / len) % 2
      it.x = w.x0 + (w.x1 - w.x0) * (ph < 1 ? ph : 2 - ph)
      it.flip = it.x < prev
      it.moving = true
      if (Math.random() < dt * 0.08) it.pause = rand(1.5, 4)
    }
  }
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    for (const it of this.items) {
      if (!this.s.onScreen(it.x, it.y - 10, 30)) continue
      add(it.y + (it.gag.z ?? 0), () => it.gag.draw(this.s.gfx, { x: Math.round(it.x), y: it.y, flip: it.flip, moving: it.moving, react: it.react, t }))
    }
  }
  tap(x: number, y: number): boolean {
    for (const it of this.items) {
      const w = it.gag.w ?? 14
      const h = it.gag.h ?? 26
      if (x >= it.x - w / 2 && x <= it.x + w / 2 && y >= it.y - h && y <= it.y + 3) {
        it.react = 1.6
        const lines = it.gag.lines
        if (lines.length) {
          this.s.say(lines[it.line % lines.length], it.x, it.y - h - 2)
          it.line++
        }
        it.gag.react?.(this.s, it.x, it.y)
        return true
      }
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers for gag characters.

export type Extra = 'phone' | 'selfie' | 'umbrella' | 'drink' | 'vest' | 'none'

const WALK: Pose[] = ['walk1', 'pass', 'walk2', 'pass']

/** Draw a person (avatar) with an optional prop overlay. */
export function drawPerson(g: Surface, look: AvatarLook, p: GagPose, view: View = 'front', extras: Extra[] = [], pose?: Pose) {
  const v: View = p.moving ? 'side' : view
  const ps: Pose = pose ?? (p.moving ? WALK[Math.floor(p.t * 8) % 4] : p.react > 0 && view === 'front' ? 'happy' : 'stand')
  const s = avatarSprite(look, v, ps, { flip: p.flip })
  const x = p.x
  const y = p.y
  drawShadow(g, x, y, 6, 2)
  if (extras.includes('umbrella')) umbrella(g, x + (p.flip ? -3 : 3), y, p.t)
  g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h + 1))
  for (const e of extras) {
    if (e === 'vest') {
      g.rect(x - 4, y - 14, 8, 6, '#f58f35')
      g.rect(x - 4, y - 11, 8, 1, '#fff3a6')
      g.px(x - 1, y - 13, '#fffaf0')
      g.px(x, y - 13, '#fffaf0')
    } else if (e === 'phone') {
      g.rect(x + (p.flip ? -4 : 2), y - 12, 2, 3, '#3a3040')
      g.px(x + (p.flip ? -4 : 2), y - 12, '#9fd0ff')
    } else if (e === 'drink') {
      const dx = x + (p.flip ? -6 : 5)
      g.rect(dx, y - 11, 3, 4, '#f07a4a')
      g.px(dx, y - 11, '#ffc0a0')
      g.px(dx + 1, y - 13, '#ffffff')
      g.px(dx + 1, y - 12, '#ffffff')
      g.px(dx + 2, y - 10, '#fffaf0')
    } else if (e === 'selfie') {
      const up = p.react > 0 ? 2 : 0
      g.line(x + 3, y - 16, x + 6, y - 24 - up, '#f0bd90')
      g.rect(x + 5, y - 29 - up, 3, 5, '#3a3040')
      g.px(x + 6, y - 28 - up, '#5a5068')
    }
  }
}

function umbrella(g: Surface, x: number, y: number, t: number) {
  const wob = Math.round(Math.sin(t * 2) * 0.6)
  g.vline(x, y - 31, y - 12, '#6e4a35')
  const top = y - 34 + wob
  for (let i = 0; i < 5; i++) {
    const half = 9 - (4 - i) * 1.8
    g.rect(Math.round(x - half), top + i, Math.round(half * 2) + 1, 1, i % 2 ? '#ff9fc0' : '#ffb8d0')
  }
  for (let k = -8; k <= 8; k += 4) g.px(x + k, top + 5, '#e8709e')
  g.px(x, top - 1, '#e8709e')
}

/** A monk (or novice) glancing at a smartphone. */
export function drawPhoneMonk(g: Surface, p: GagPose, novice = false) {
  const s = monkSprite('front', 'stand', { novice, skin: 2 })
  drawShadow(g, p.x, p.y, 6, 2)
  g.draw(s.canvas, Math.round(p.x - s.w / 2), Math.round(p.y - s.h + 1))
  // Phone held low, screen glowing.
  const glow = Math.sin(p.t * 3) > 0.7 ? '#e8f8ff' : '#9fd0ff'
  g.rect(p.x - 2, p.y - 11, 4, 3, '#3a3040')
  g.rect(p.x - 1, p.y - 11, 2, 2, glow)
  if (p.react > 0) {
    // A tiny heart for the kind blessing.
    g.px(p.x + 5, p.y - 30, '#ff6f91')
    g.px(p.x + 4, p.y - 31, '#ff6f91')
    g.px(p.x + 6, p.y - 31, '#ff6f91')
  }
}

/** Plain sprite gag (stalls, signs…), optionally bouncing on tap. */
export function drawSpriteGag(g: Surface, s: Sprite & { ax?: number; ay?: number }, p: GagPose, bounce = true) {
  const ax = s.ax ?? s.w / 2
  const ay = s.ay ?? s.h - 1
  const hop = bounce && p.react > 1.3 ? -1 : 0
  g.draw(s.canvas, Math.round(p.x - ax), Math.round(p.y - ay + hop))
}

// ---------------------------------------------------------------------------
// Festival banners and temple-fair string lights.

export class Banners implements Life {
  constructor(
    private s: WorldScene,
    private items: { x: number; y: number; color: Color; sortY: number }[],
  ) {}
  sorted(add: (y: number, draw: () => void) => void, t: number) {
    this.items.forEach((b, i) => add(b.sortY + 0.4, () => drawBanner(this.s.gfx, b.x, b.y, t + this.s.wind(), b.color, i * 1.7)))
  }
}

export class FairLights implements Life {
  constructor(
    _s: WorldScene,
    private strings: { x0: number; y0: number; x1: number; y1: number; n: number; sag?: number }[],
  ) {}
  private bulbs(fn: (x: number, y: number, c: Color, on: boolean) => void, t: number) {
    const colors = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#ffb35a', '#c8a0ff']
    for (const st of this.strings) {
      for (let i = 0; i < st.n; i++) {
        const f = (i + 0.5) / st.n
        const x = Math.round(st.x0 + (st.x1 - st.x0) * f)
        const y = Math.round(st.y0 + (st.y1 - st.y0) * f + Math.sin(f * Math.PI) * (st.sag ?? 8))
        fn(x, y + 1, colors[i % colors.length], (Math.floor(t * 4) + i) % 4 !== 0)
      }
    }
  }
  over(g: Surface, t: number) {
    for (const st of this.strings) {
      const n = 20
      let px = st.x0
      let py = st.y0
      for (let i = 1; i <= n; i++) {
        const f = i / n
        const x = st.x0 + (st.x1 - st.x0) * f
        const y = st.y0 + (st.y1 - st.y0) * f + Math.sin(f * Math.PI) * (st.sag ?? 8)
        g.line(px, py, x, y, '#4a3848')
        px = x
        py = y
      }
    }
    this.bulbs((x, y, c) => g.px(x, y, mixHex(c, '#5a4a5e', 0.5)), t)
  }
  glow(g: Surface, t: number, light: number) {
    if (light < 0.5) return
    this.bulbs((x, y, c, on) => {
      if (!on) return
      drawGlow(g, x, y, 4, light * 0.8, c)
      g.px(x, y, c)
      g.px(x, y + 1, mixHex(c, '#ffffff', 0.5))
    }, t)
  }
}

/** A few one-liners for gags that flash (selfies) or chime. */
export const gagFx = {
  flash(s: WorldScene, x: number, y: number) {
    s.particles.sparkles(x + 6, y - 28, 8, '#ffffff', 6)
    sfx.click()
  },
  chime() {
    sfx.chime()
  },
}
