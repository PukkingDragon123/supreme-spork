// Pixel icons for live events: tickets, points, the HUD badge and placeholder
// thumbnails for the pass cosmetics and pets (basin helmet, whistle, rescue
// suit, soggy cat, rescue dog…). Drawn on a 14×14 grid and outlined like
// src/art/icons.ts. Real wardrobe/pet thumbnails can replace these by id.

import { bake, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, spriteDataUrl, type Sprite } from '../engine/sprite'
import { P } from './palette'

type Draw = (g: Surface) => void
const k = P.ink

const OR = '#f58f35'
const ORD = '#d0661f'
const REFL = '#fff3a6'
const NAVY = '#2f3f6a'

/** Punch a transparent hole. */
function hole(g: Surface, fn: () => void) {
  g.blend('destination-out')
  fn()
  g.blend('source-over')
}

function ring(g: Surface, cx: number, cy: number, r: number, a = OR, b = P.white) {
  g.circle(cx, cy, r, a)
  hole(g, () => g.circle(cx, cy, r - 2.6, '#000'))
  // Stripes.
  g.rect(cx - r, cy - 1, 2, 2, b)
  g.rect(cx + r - 2, cy - 1, 2, 2, b)
  g.rect(cx - 1, cy - r, 2, 2, b)
  g.rect(cx - 1, cy + r - 2, 2, 2, b)
}

function catFace(g: Surface, fur: string, dark: string, wet: boolean) {
  g.rect(3, 5, 8, 7, fur)
  g.poly([[3, 6], [3, 1], [6, 5]], fur)
  g.poly([[11, 6], [11, 1], [8, 5]], fur)
  g.px(4, 3, dark)
  g.px(10, 3, dark)
  g.rect(5, 7, 1, 2, k)
  g.rect(9, 7, 1, 2, k)
  g.px(7, 9, P.pinkD)
  g.rect(6, 10, 3, 1, P.white)
  if (wet) {
    // Flattened, dripping fur and a sad brow.
    g.px(4, 6, k)
    g.px(10, 6, k)
    g.rect(2, 12, 1, 2, P.waterD)
    g.rect(12, 11, 1, 2, P.waterD)
    g.px(7, 13, P.water)
    g.px(1, 8, P.water)
    g.px(13, 6, P.water)
  }
}

function dogFace(g: Surface, vest: boolean) {
  const fur = '#c28e5c'
  const dark = '#8a5a30'
  g.rect(3, 3, 8, 8, fur)
  g.rect(1, 3, 3, 6, dark)
  g.rect(10, 3, 3, 6, dark)
  g.rect(5, 7, 4, 3, P.cream)
  g.rect(6, 7, 2, 1, k)
  g.px(5, 5, k)
  g.px(8, 5, k)
  g.px(7, 10, '#ff8a9a')
  if (vest) {
    // Goggles on the forehead and the rescue vest collar.
    g.rect(4, 2, 6, 2, '#4ab0d8')
    g.px(5, 2, P.skyL)
    g.rect(2, 11, 10, 3, OR)
    g.rect(2, 12, 10, 1, REFL)
    g.rect(6, 11, 2, 2, P.blue)
  }
}

const ICONS: Record<string, Draw> = {
  // ---- event UI ----
  ev_flood: (g) => {
    g.rect(0, 9, 14, 5, P.waterD)
    g.rect(0, 9, 14, 1, P.waterL)
    ring(g, 7, 7, 5.5)
    g.circle(7, 7, 2.6, P.waterD)
    g.px(2, 11, P.white)
    g.px(10, 12, P.white)
  },
  ev_ticket: (g) => {
    g.poly([[1, 3], [13, 3], [13, 5], [12, 7], [13, 9], [13, 11], [1, 11], [1, 9], [2, 7], [1, 5]], '#5ab0e0')
    g.rect(1, 3, 12, 1, '#b3eef4')
    g.vline(9, 4, 10, '#2f77a8')
    for (let y = 4; y < 11; y += 2) g.px(9, y, '#b3eef4')
    // Little boat on the stub.
    g.poly([[3, 7], [8, 7], [7, 9], [4, 9]], OR)
    g.vline(5, 4, 7, P.white)
    g.poly([[5, 4], [7, 6], [5, 6]], P.white)
    g.px(11, 6, P.gold)
    g.px(11, 8, P.gold)
  },
  ev_points: (g) => {
    g.poly([[7, 0], [9, 5], [14, 5], [10, 8], [12, 13], [7, 10], [2, 13], [4, 8], [0, 5], [5, 5]], P.gold)
    g.poly([[7, 3], [8, 6], [11, 6], [9, 8], [10, 11], [7, 9], [4, 11], [5, 8], [3, 6], [6, 6]], P.goldL)
    g.circle(7, 7.5, 1.5, P.waterD)
    g.px(7, 6, P.water)
  },
  ev_ring: (g) => {
    ring(g, 7, 7, 6.5)
    g.circle(7, 7, 2.5, P.waterD)
    g.px(3, 3, P.white)
  },
  ev_crown: (g) => {
    g.poly([[1, 11], [1, 4], [4, 7], [7, 2], [10, 7], [13, 4], [13, 11]], P.gold)
    g.rect(1, 10, 13, 2, P.goldD)
    g.px(7, 5, P.redL)
    g.px(4, 9, P.blueL)
    g.px(10, 9, P.blueL)
    g.px(7, 2, P.goldL)
  },
  ev_heli: (g) => {
    g.hline(1, 12, 1, P.stoneDD)
    g.vline(7, 1, 3, P.stoneDD)
    g.ellipse(6, 7, 5, 3.5, P.red)
    g.rect(5, 5, 4, 2, P.skyL)
    g.rect(10, 6, 4, 2, P.red)
    g.vline(13, 4, 7, P.redD)
    g.hline(3, 9, 11, P.stoneDD)
  },
  ev_boat: (g) => {
    g.rect(0, 11, 14, 3, P.waterD)
    g.poly([[0, 8], [14, 8], [12, 12], [2, 12]], OR)
    g.rect(0, 8, 14, 1, P.white)
    g.rect(4, 3, 4, 5, NAVY)
    g.rect(4, 3, 4, 2, P.white)
    g.rect(4, 5, 4, 1, OR)
    g.px(10, 7, '#3a3f4f')
  },
  // ---- free row cosmetics ----
  head_basin: (g) => {
    // กะละมังคว่ำ as a rain hat.
    g.ellipse(7, 10, 7, 2.5, '#8c8187')
    g.poly([[2, 10], [4, 3], [10, 3], [12, 10]], '#bdb2ae')
    g.rect(4, 3, 6, 1, P.stoneL)
    g.vline(5, 4, 9, P.stoneL)
    g.rect(1, 9, 12, 1, '#e4ddd6')
    for (const x of [3, 7, 11]) g.px(x, 12 + (x % 2), P.water)
  },
  top_swim_vest: (g) => {
    g.poly([[2, 2], [5, 1], [7, 4], [9, 1], [12, 2], [13, 13], [1, 13]], OR)
    g.rect(6, 4, 2, 9, NAVY)
    g.rect(1, 7, 13, 1, REFL)
    g.rect(1, 10, 13, 1, REFL)
    g.rect(3, 4, 2, 2, ORD)
    g.rect(9, 4, 2, 2, ORD)
  },
  neck_whistle: (g) => {
    g.line(2, 1, 6, 8, P.red)
    g.line(12, 1, 8, 8, P.red)
    g.rect(4, 8, 7, 4, '#e4ddd6')
    g.rect(4, 8, 7, 1, P.white)
    g.rect(10, 9, 3, 2, '#bdb2ae')
    g.circle(6, 10, 1.2, '#8c8187')
    g.px(1, 11, P.gold)
    g.px(13, 6, P.gold)
  },
  shoes_rain_boots: (g) => {
    for (const x of [1, 7]) {
      g.rect(x + 1, 2, 4, 9, P.yellow)
      g.rect(x + 1, 9, 6, 3, P.yellow)
      g.rect(x + 1, 12, 6, 1, '#b8742a')
      g.rect(x + 1, 2, 4, 1, P.goldL)
      g.vline(x + 1, 3, 11, P.goldD)
    }
  },
  back_swim_ring: (g) => {
    g.ellipse(7, 8, 6.5, 5, P.yellow)
    g.ellipse(7, 8.5, 2.6, 1.6, P.waterD)
    g.circle(11, 3, 2.5, P.yellow)
    g.px(11, 2, k)
    g.rect(13, 3, 1, 1, P.orange)
    g.px(12, 4, P.orange)
    g.px(3, 6, P.goldL)
  },
  hand_bailer: (g) => {
    // ขันวิดน้ำ: a scoop with a long handle, splashing.
    g.ellipse(6, 9, 5, 3.5, P.blue)
    g.ellipse(6, 8, 4, 2, P.blueL)
    g.rect(2, 8, 9, 1, P.blueD)
    g.thickLine(10, 8, 13, 2, 2, P.blueD)
    g.px(2, 3, P.water)
    g.px(4, 1, P.water)
    g.px(6, 3, P.waterL)
  },
  soggy_cat: (g) => catFace(g, '#b8b2c4', '#8c8187', true),
  // ---- premium row cosmetics ----
  suit_rescue: (g) => {
    // Full uniform: helmet on top of the jacket.
    g.ellipse(7, 2.5, 3.5, 2.5, P.white)
    g.rect(3, 3, 8, 1, OR)
    g.rect(3, 5, 8, 6, OR)
    g.rect(1, 6, 2, 5, OR)
    g.rect(11, 6, 2, 5, OR)
    g.rect(1, 8, 12, 1, REFL)
    g.rect(6, 5, 2, 6, NAVY)
    g.rect(4, 11, 2, 3, NAVY)
    g.rect(8, 11, 2, 3, NAVY)
  },
  head_rescue_helmet: (g) => {
    g.ellipse(7, 7, 6, 5, P.white)
    hole(g, () => g.rect(0, 10, 14, 4, '#000'))
    g.rect(0, 8, 14, 2, '#e4ddd6')
    g.rect(1, 6, 12, 2, OR)
    g.rect(6, 2, 2, 4, OR)
    g.px(4, 3, P.white)
    g.rect(3, 10, 1, 3, k)
    g.rect(10, 10, 1, 3, k)
    g.rect(4, 12, 6, 1, k)
  },
  top_rescue_jacket: (g) => {
    g.poly([[2, 1], [5, 1], [7, 3], [9, 1], [12, 1], [13, 13], [1, 13]], '#c8f000')
    g.rect(6, 3, 2, 10, NAVY)
    g.rect(1, 6, 13, 2, P.stoneL)
    g.rect(1, 10, 13, 2, P.stoneL)
    g.px(3, 4, '#e8514a')
    g.px(10, 4, '#e8514a')
  },
  hand_megaphone: (g) => {
    g.poly([[2, 5], [9, 1], [9, 11], [2, 8]], P.white)
    g.rect(9, 1, 3, 11, OR)
    g.rect(0, 5, 3, 3, OR)
    g.rect(4, 8, 2, 4, '#3a3f4f')
    g.px(13, 3, P.gold)
    g.px(13, 6, P.gold)
    g.px(13, 9, P.gold)
  },
  back_rescue_tube: (g) => {
    g.poly([[3, 1], [11, 1], [12, 3], [12, 11], [11, 13], [3, 13], [2, 11], [2, 3]], P.red)
    g.rect(3, 1, 8, 1, P.redL)
    g.rect(2, 5, 10, 1, P.white)
    g.rect(2, 9, 10, 1, P.white)
    g.vline(1, 3, 11, '#3a3f4f')
    g.vline(13, 3, 11, '#3a3f4f')
  },
  shoes_rescue_boots: (g) => {
    for (const x of [1, 7]) {
      g.rect(x + 1, 1, 4, 10, '#2a2830')
      g.rect(x + 1, 9, 6, 3, '#2a2830')
      g.rect(x + 1, 12, 6, 1, OR)
      g.rect(x + 1, 5, 4, 1, REFL)
      g.rect(x + 1, 1, 4, 1, '#5a5563')
    }
  },
  back_paddle: (g) => {
    g.thickLine(3, 11, 10, 3, 1.5, '#9a6a45')
    g.ellipse(11.5, 2.5, 2.5, 2, OR)
    g.poly([[9, 3], [12, 0], [14, 2], [11, 5]], OR)
    g.rect(1, 11, 4, 2, '#6e4a35')
    g.px(12, 1, P.white)
  },
  tub_rescue: (g) => dogFace(g, true),
}

export const EVENT_ICON_NAMES = Object.keys(ICONS)

export function hasEventIcon(name: string): boolean {
  return !!ICONS[name]
}

export function eventIconSprite(name: string): Sprite {
  return cached(`evicon:${name}`, () => outlineCanvas(bake(14, 14, ICONS[name] ?? ICONS.ev_points), k))
}

const urls = new Map<string, string>()

export function eventIconUrl(name: string, scale = 3): string {
  const key = `${name}@${scale}`
  let u = urls.get(key)
  if (!u) {
    u = spriteDataUrl(eventIconSprite(name), scale)
    urls.set(key, u)
  }
  return u
}
