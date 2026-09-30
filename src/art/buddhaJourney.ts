// The Buddha-journey stage map, baked. Static painting happens once per map
// width into one tall canvas (plus a moonlit copy for night), and the small
// animated things (water, clouds, fireflies, deer, the Dhamma wheel …) are
// collected as fx items that the stage-select view draws on a second canvas,
// culled to what is on screen.

import { Surface } from '../engine/pixel'
import { softGlow } from './hall'
import { firefliesFx } from './buddhaJourneyFx'
import { gatePoint, JOURNEY, journeyLayout, type JourneyLayout } from './buddhaJourneyStory'
import { J, moonlight, PaintCtx, paintRoad, sinthao, type FxEnv, type FxItem, type Light } from './buddhaJourneyPaint'
import { paintBottomCap, paintTopCap, SCENES, templeGateArt } from './buddhaJourneyScenes'
import { templeGates } from './buddhaJourneyStory'

export interface JourneyArt {
  layout: JourneyLayout
  /** Day painting (the escape and enlightenment chapters are always night scenes). */
  day: HTMLCanvasElement
  /** What stays bright at night (gold, lamps, halos). */
  emissive: HTMLCanvasElement
  lights: Light[]
  fx: FxItem[]
  /** Milliseconds the bake took (for tuning). */
  ms: number
}

const artCache = new Map<number, JourneyArt>()
const nightCache = new Map<number, HTMLCanvasElement>()

/** Bake (once per width) the whole journey map. */
export function journeyArt(width: number): JourneyArt {
  const w = Math.round(width)
  const hit = artCache.get(w)
  if (hit) return hit
  const t0 = performance.now()
  const layout = journeyLayout(w)
  const g = new Surface(w, layout.h)
  const e = new Surface(w, layout.h)
  const lights: Light[] = []
  const fx: FxItem[] = []
  const ctxs = JOURNEY.map((c, i) => new PaintCtx(g, e, layout, layout.bands[i], c, lights, fx))
  // 1. Backdrops, terrain and water.
  paintBottomCap(g, layout, fx)
  ctxs.forEach((c) => SCENES[c.chapter.id].ground(c))
  paintTopCap(g, e, layout, fx, lights)
  // 2. สินเทา zigzags between the scenes.
  layout.bands.forEach((b, i) => {
    if (i === layout.bands.length - 1) return
    sinthao(g, 0, w, b.top, JOURNEY[i + 1].night ? 'night' : 'day', JOURNEY[i].night ? 'night' : 'day')
  })
  sinthao(g, 0, w, layout.bands[0].bottom, JOURNEY[0].night ? 'night' : 'day', 'day')
  // 3. The road.
  const nightAt = (y: number) => {
    for (let i = 0; i < layout.bands.length; i++) if (y >= layout.bands[i].top && y < layout.bands[i].bottom) return !!JOURNEY[i].night
    return false
  }
  paintRoad(g, layout.road, 0, layout.h, nightAt)
  // 4. Scenery, figures and the temple gates.
  ctxs.forEach((c) => SCENES[c.chapter.id].objects(c))
  for (const gate of templeGates()) {
    const p = gatePoint(layout, gate.stageId)
    templeGateArt(g, e, p.x, p.y, nightAt(p.y - 10))
  }
  // Fireflies come out over the day scenes when the map is shown at night.
  layout.bands.forEach((b, i) => {
    if (!JOURNEY[i].night) fx.push(firefliesFx([0, b.top + 6, w, b.bottom - 6], 12, 700 + i * 31))
  })
  fx.sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
  const art: JourneyArt = { layout, day: g.canvas, emissive: e.canvas, lights, fx, ms: performance.now() - t0 }
  artCache.set(w, art)
  return art
}

/** The moonlit version: darken to blue, keep emissive paint, add glows. */
export function journeyNight(art: JourneyArt): HTMLCanvasElement {
  const hit = nightCache.get(art.layout.w)
  if (hit) return hit
  const { w, h } = art.layout
  // (A Surface resets its canvas, so make it first.)
  const g = new Surface(w, h)
  const c = g.canvas
  const ctx = g.ctx
  ctx.drawImage(art.day, 0, 0)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  // Night chapters are already dark: dim them less.
  const soft = new Uint8Array(h)
  art.layout.bands.forEach((b, i) => {
    if (!JOURNEY[i].night) return
    for (let y = Math.max(0, b.top); y < Math.min(h, b.bottom); y++) soft[y] = 1
  })
  for (let y = 0; y < h; y++) moonlight(d, y * w * 4, (y + 1) * w * 4, soft[y] ? 0.78 : 1)
  ctx.putImageData(img, 0, 0)
  ctx.drawImage(art.emissive, 0, 0)
  for (const L of art.lights) softGlow(g, L.x, L.y, L.r, L.s, L.color)
  nightCache.set(w, c)
  return c
}

/** Draw the visible fx between map rows y0 and y1. */
export function drawJourneyFx(g: Surface, art: JourneyArt, t: number, y0: number, y1: number, env: FxEnv) {
  for (const f of art.fx) {
    const shift = (f.par ?? 0) * (env.viewMid - (f.box[1] + f.box[3]) / 2)
    if (f.box[3] + shift < y0 || f.box[1] + shift > y1) continue
    f.draw(g, t, env)
  }
}

export { J }
