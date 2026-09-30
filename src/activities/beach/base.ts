// Shared base for the beach mini-game scenes: the round stats handed to
// finishBeachRound, the beach backdrop (sky, sea with rolling surf, sand)
// in day or night palettes, the player's wrist for beach poses, and a few
// tiny drawing helpers (shadows, wave lines, sparkles).

import type { Surface } from '../../engine/pixel'
import { bake, ditherOn } from '../../engine/pixel'
import { JobScene } from '../jobs/base'
import type { BeachRoundStats } from '../../game/beach'
import { currentPhase } from '../../scenes/sky'
import { beachWrist } from '../../art/poses/beach'
import { DOLL_W, DOLL_H } from '../../art/doll'
import { mix, SAND, SEA, type SeaPal } from '../../art/places/beach-kit'
import { BEACH_META, beachOf } from '../../game/data/beaches'
import { mapId } from '../../ui/store'

export const INK = '#3a2838'

export abstract class BeachScene extends JobScene {
  score = 0
  night = ['dusk', 'night'].includes(currentPhase())
  sea: SeaPal = SEA[BEACH_META[beachOf(mapId.value) ?? 'beach_samila']?.sea ?? 'gulf']
  /** What finishBeachRound records. */
  abstract stats(): BeachRoundStats
}

/** World position of a beach-pose wrist for a doll with feet at (x, feetY). */
export function bwrist(pose: string, side: 'L' | 'R', x: number, feetY: number, flip = false): [number, number] {
  const ox = Math.round(x - DOLL_W / 2)
  const oy = Math.round(feetY - DOLL_H + 1)
  const w = beachWrist(pose, flip ? (side === 'L' ? 'R' : 'L') : side) ?? [side === 'L' ? 9 : 24, 33]
  return [ox + (flip ? DOLL_W - w[0] : w[0]), oy + w[1]]
}

const cache = new Map<string, HTMLCanvasElement>()

/** Sky + sea + sand backdrop, baked per size. `seaY` = shoreline. */
export function backdrop(w: number, h: number, o: { horizon: number; shore: number; night: boolean; sea: SeaPal; sunset?: boolean }): HTMLCanvasElement {
  const key = `${w}:${h}:${o.horizon}:${o.shore}:${o.night}:${o.sea.deep}:${o.sunset ? 1 : 0}`
  let c = cache.get(key)
  if (c) return c
  c = bake(w, h, (g) => {
    const sky = o.night ? ['#12143a', '#1f2358', '#2e3a78', '#3e4c8c'] : o.sunset ? ['#7aa0e0', '#c9a4d8', '#ffc08a', '#ffe2a0'] : ['#78c4ff', '#a0d8ff', '#c8ecff', '#e6f7ff']
    g.gradientV(0, 0, w, o.horizon, sky, 5)
    if (o.night) for (let i = 0; i < 30; i++) g.px((i * 53) % w, (i * 29) % Math.max(1, o.horizon - 4), i % 4 ? '#e2e8ff' : '#fff3a6')
    const pal = o.night ? SEA.night : o.sea
    for (let y = o.horizon; y < o.shore; y++) {
      const t = (y - o.horizon) / Math.max(1, o.shore - o.horizon)
      for (let x = 0; x < w; x++) {
        let col = t < 0.25 ? pal.deep : t < 0.6 ? pal.mid : t < 0.85 ? pal.shallow : pal.surf
        if (t > 0.2 && t < 0.3 && ditherOn(x, y, (t - 0.2) * 10)) col = pal.mid
        if (t > 0.55 && t < 0.65 && ditherOn(x, y, (t - 0.55) * 10)) col = pal.shallow
        g.px(x, y, col)
      }
    }
    for (let k = 0; k < (w * (o.shore - o.horizon)) / 30; k++) {
      const x = (k * 37) % w
      const y = o.horizon + 2 + ((k * 53) % Math.max(1, o.shore - o.horizon - 4))
      g.hline(x, x + 2, y, mix(pal.glint, pal.mid, 0.5))
    }
    g.hline(0, w - 1, o.horizon, mix(pal.glint, pal.deep, 0.3))
    const sand = o.night ? SAND.night : SAND.white
    for (let y = o.shore; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = y - o.shore
        let col = d < 14 ? sand.wet : sand.base
        const n = Math.sin(x * 0.09 + y * 0.02) + Math.cos(y * 0.11 - x * 0.03)
        if (d >= 14 && n > 1.3 && ditherOn(x, y, 0.3)) col = sand.light
        else if (d >= 14 && n < -1.25 && ditherOn(x, y, 0.3)) col = sand.dark
        if ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 997 < 6) col = sand.dark
        g.px(x, y, col)
      }
  })
  cache.set(key, c)
  return c
}

/** Animated surf on a straight shoreline (drawn each frame over the backdrop). */
export function drawSurf(g: Surface, w: number, shore: number, t: number, pal: SeaPal, amp = 6) {
  for (let x = 0; x < w; x++) {
    const run = Math.sin(t * 0.9 + x * 0.03) * 0.5 + 0.5
    const wy = shore - 2 + Math.round(run * run * amp)
    g.alpha(0.65)
    g.vline(x, shore - 8, wy - 1, pal.surf)
    g.alpha(1)
    g.px(x, wy, pal.foam)
    if ((x + Math.floor(t * 3)) % 3) g.px(x, wy - 1, pal.foam)
    const by = shore - 14 - Math.round(Math.sin(t * 0.9 + x * 0.03 + 1.3) * 3)
    if (Math.sin(x * 0.3 + t * 1.4) > 0.3) g.px(x, by, pal.foam)
  }
}

export function shadow(g: Surface, x: number, y: number, rx: number, ry: number, a = 0.28) {
  g.alpha(a)
  g.ellipse(x, y, rx, ry, INK)
  g.alpha(1)
}

/** Four-point sparkle. */
export function twinkle(g: Surface, x: number, y: number, k: number, c = '#ffffff') {
  const X = Math.round(x)
  const Y = Math.round(y)
  g.px(X, Y, c)
  if (k > 0.4) {
    g.px(X - 1, Y, '#fff3a6')
    g.px(X + 1, Y, '#fff3a6')
    g.px(X, Y - 1, '#fff3a6')
    g.px(X, Y + 1, '#fff3a6')
  }
  if (k > 0.8) {
    g.px(X - 2, Y, '#fff3a6')
    g.px(X + 2, Y, '#fff3a6')
  }
}
