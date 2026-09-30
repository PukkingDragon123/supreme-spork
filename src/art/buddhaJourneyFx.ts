// Animated bits of the Buddha-journey map, drawn every frame on the fx layer
// (only the part of the map on screen): the golden trail of passed stages,
// the arrival sparkle, drifting clouds, birds, fireflies, falling blossoms,
// glints on water and glowing leaves.

import { createCanvas, type Surface } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'
import { softGlow } from './hall'
import { J, hash01, moonlight, muralCloud, type FxItem } from './buddhaJourneyPaint'
import { drawSprite } from './buddhaJourneyFigures'
import { roadAt, type RoadPath } from './buddhaJourneyStory'

const TAU = Math.PI * 2

/** Golden footsteps along the road from s0 to s1 (the passed part of the journey). */
export function drawTrail(g: Surface, road: RoadPath, s0: number, s1: number) {
  const start = Math.ceil(s0 / 5) * 5
  for (let s = start; s <= s1; s += 5) {
    const p = roadAt(road, s)
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (s % 20 === 0) {
      // A tiny gold lotus every few steps.
      g.px(x - 1, y, J.goldD)
      g.px(x + 1, y, J.goldD)
      g.px(x, y - 1, J.goldL)
      g.px(x, y, J.goldM)
      g.px(x - 1, y - 1, J.gold)
      g.px(x + 1, y - 1, J.gold)
    } else {
      g.rect(x, y, 2, 2, J.gold)
      g.px(x, y, J.goldL)
      g.px(x + 1, y + 1, J.goldD)
    }
  }
}

/** A ring of sparkles where the avatar arrived (k: 0..1). */
export function drawArrivalBurst(g: Surface, p: { x: number; y: number }, k: number) {
  const n = 10
  const r = 6 + k * 18
  const a = 1 - k
  g.alpha(Math.max(0, a))
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU + k * 1.5
    const x = Math.round(p.x + Math.cos(t) * r)
    const y = Math.round(p.y + Math.sin(t) * r * 0.7)
    g.px(x, y, '#ffffff')
    g.px(x + 1, y, J.goldL)
    g.px(x - 1, y, J.goldL)
    g.px(x, y + 1, J.goldL)
    g.px(x, y - 1, J.goldL)
  }
  g.reset()
  softGlow(g, p.x, p.y, 16 + k * 10, 0.6 * a, '#ffe08a')
}

// ---------------------------------------------------------------------------
// Reusable fx items

/** A mural cloud drifting sideways with parallax. */
export function cloudFx(x: number, y: number, w: number, speed: number, mapW: number, night: boolean): FxItem {
  const span = mapW + w * 2
  return {
    box: [0, y - w, mapW, y + 4],
    par: 0.25,
    z: 20,
    draw: (g, t, env) => {
      const xx = ((((x + t * speed) % span) + span) % span) - w
      const yy = Math.round(y + (env.viewMid - y) * 0.25)
      if (env.night || night) muralCloud(g, Math.round(xx), yy, w, '#5a6498', '#3a4274')
      else muralCloud(g, Math.round(xx), yy, w)
    },
  }
}

/** A small flock of birds crossing the map. */
export function birdsFx(y: number, mapW: number, seed: number): FxItem {
  const speed = 9 + hash01(seed) * 6
  const span = mapW + 80
  return {
    box: [0, y - 12, mapW, y + 12],
    par: 0.12,
    z: 30,
    draw: (g, t, env) => {
      const yy = y + (env.viewMid - y) * 0.12
      for (let i = 0; i < 3; i++) {
        const bx = ((t * speed + i * 11 + seed * 37) % span) - 40
        const by = yy + Math.sin(t * 1.3 + i) * 2 + (i % 2) * 4
        const up = Math.sin(t * 9 + i * 2) > 0
        const c = env.night ? '#c8cce8' : J.inkS
        const X = Math.round(bx)
        const Y = Math.round(by)
        g.px(X, Y, c)
        g.px(X - 1, Y + (up ? -1 : 0), c)
        g.px(X + 1, Y + (up ? -1 : 0), c)
        g.px(X - 2, Y + (up ? -2 : 1), c)
        g.px(X + 2, Y + (up ? -2 : 1), c)
      }
    },
  }
}

/** Fireflies wandering in a box (brighter at night). */
export function firefliesFx(box: [number, number, number, number], n: number, seed: number, always = false): FxItem {
  const [x0, y0, x1, y1] = box
  return {
    box,
    z: 40,
    draw: (g, t, env) => {
      if (!always && !env.night) return
      for (let i = 0; i < n; i++) {
        const k = hash01(seed + i * 17)
        const k2 = hash01(seed + i * 31)
        const x = x0 + ((k * (x1 - x0) + Math.sin(t * 0.5 + i) * 10) % (x1 - x0))
        const y = y0 + ((k2 * (y1 - y0) + Math.cos(t * 0.4 + i * 1.7) * 8) % (y1 - y0))
        const blink = Math.sin(t * 2.2 + i * 2.1) * 0.5 + 0.5
        if (blink < 0.25) continue
        softGlow(g, x, y, 5, blink * 0.7, '#fff08a')
        g.px(Math.round(x), Math.round(y), '#fffbd0')
      }
    },
  }
}

/** Petals drifting down from a tree canopy (sal blossoms). */
export function petalsFx(box: [number, number, number, number], n: number, seed: number, colors: string[]): FxItem {
  const [x0, y0, x1, y1] = box
  const h = y1 - y0
  return {
    box,
    z: 35,
    draw: (g, t) => {
      for (let i = 0; i < n; i++) {
        const k = hash01(seed + i * 13)
        const sp = 6 + hash01(seed + i * 7) * 6
        const fall = (t * sp + k * h) % h
        const x = x0 + hash01(seed + i * 29) * (x1 - x0) + Math.sin(t * 1.4 + i) * 4
        const y = y0 + fall
        const c = colors[i % colors.length]
        g.px(Math.round(x), Math.round(y), c)
        if (Math.sin(t * 3 + i) > 0) g.px(Math.round(x) + 1, Math.round(y), c)
      }
    },
  }
}

/** Twinkling glints on water inside a list of rectangles. */
export function glintsFx(box: [number, number, number, number], inside: (x: number, y: number) => boolean, n: number, seed: number): FxItem {
  const [x0, y0, x1, y1] = box
  return {
    box,
    z: 5,
    draw: (g, t, env) => {
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.7 + hash01(seed + i * 3)) % 1
        const cycle = Math.floor(t * 0.7 + hash01(seed + i * 3))
        const x = Math.round(x0 + hash01(seed + i * 11 + cycle * 101) * (x1 - x0))
        const y = Math.round(y0 + hash01(seed + i * 19 + cycle * 53) * (y1 - y0))
        if (!inside(x, y)) continue
        const a = Math.sin(ph * Math.PI)
        const c = env.night ? '#9fc4f0' : J.foam
        g.alpha(a)
        g.px(x, y, c)
        g.px(x + 1, y - 1, c)
        g.px(x + 2, y - 1, c)
        g.px(x + 3, y, c)
        g.reset()
      }
    },
  }
}

/** Soft pulsing glow (a halo, a lamp). */
export function glowFx(x: number, y: number, r: number, s: number, color: string, speed = 1.2, nightBoost = 1.6): FxItem {
  return {
    box: [x - r, y - r, x + r, y + r],
    z: 50,
    draw: (g, t, env) => {
      const k = 0.8 + 0.2 * Math.sin(t * speed + x * 0.1)
      softGlow(g, x, y, r, s * k * (env.night ? nightBoost : 1), color)
    },
  }
}

// ---------------------------------------------------------------------------
// Moonlit sprites for animated figures drawn over the night map

const tintCache = new WeakMap<HTMLCanvasElement, Sprite>()

/** A cached moonlit copy of a sprite (for fx drawn over the night map). */
export function nightSprite(s: Sprite): Sprite {
  let t = tintCache.get(s.canvas)
  if (!t) {
    const c = createCanvas(s.w, s.h)
    const ctx = c.getContext('2d')!
    ctx.drawImage(s.canvas, 0, 0)
    const img = ctx.getImageData(0, 0, s.w, s.h)
    moonlight(img.data)
    ctx.putImageData(img, 0, 0)
    t = { canvas: c, w: s.w, h: s.h }
    tintCache.set(s.canvas, t)
  }
  return t
}

/** Draw an fx sprite bottom-centred at (x, y), moonlit when the map is. */
export function fxSprite(g: Surface, s: Sprite, x: number, y: number, flip: boolean, night: boolean) {
  drawSprite(g, night ? nightSprite(s) : s, x, y, flip)
}

/** Rotating sparkles around a point (holy light). */
export function sparklesFx(x: number, y: number, r: number, n: number, seed: number): FxItem {
  return {
    box: [x - r - 2, y - r - 2, x + r + 2, y + r + 2],
    z: 55,
    draw: (g, t) => {
      for (let i = 0; i < n; i++) {
        const ph = (t * 0.45 + hash01(seed + i * 5)) % 1
        const a = hash01(seed + i * 9) * TAU
        const d = r * (0.3 + 0.7 * hash01(seed + i * 23))
        const sx = Math.round(x + Math.cos(a) * d)
        const sy = Math.round(y + Math.sin(a) * d - ph * 6)
        const k = Math.sin(ph * Math.PI)
        if (k < 0.2) continue
        g.alpha(k)
        g.px(sx, sy, '#ffffff')
        if (k > 0.7) {
          g.px(sx - 1, sy, J.goldL)
          g.px(sx + 1, sy, J.goldL)
          g.px(sx, sy - 1, J.goldL)
          g.px(sx, sy + 1, J.goldL)
        }
        g.reset()
      }
    },
  }
}
