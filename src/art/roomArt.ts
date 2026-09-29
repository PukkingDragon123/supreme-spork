// Art for the extra rooms: the big shrine altar, the Thai kitchen counter,
// regional furniture (ตุ่มสามโคก, ขันโตก, แคน, ไหปลาร้า, โคมเต็งลั้ง …),
// temple models, regional wallpapers and floors, window views and frames,
// and each room's architecture. Registered into the furniture art registry
// by art/furniture.ts. Same 3/4 front view and conventions as furniture.ts:
// a canvas is (W + 2·padX) × (up + D) with the footprint's back edge at y=up.

import { mix, Surface, type Color } from '../engine/pixel'
import { Rng } from '../engine/rng'
import { P } from './palette'
import { drawBuddha, GOLD } from './interior'
import type { Phase } from '../game/time'
import type { RoomId, WindowFrame, WindowView } from '../game/data/rooms'

export interface ArtCtx {
  W: number
  D: number
  x0: number
  y0: number
  b: number
}

export interface Art {
  up: number
  padX?: number
  frames?: number
  outline?: Color | null
  draw(g: Surface, a: ArtCtx, fr: number): void
}

export interface RoomFxState {
  on: boolean
  poke: number
}

/** Animated overlay for a placed item; (x, y) = footprint top-left in world px. */
export type RoomFx = (g: Surface, x: number, y: number, flip: boolean, t: number, st: RoomFxState, emissive: boolean) => void

interface Wood {
  hi: Color
  top: Color
  mid: Color
  dark: Color
  deep: Color
}

const TEAK: Wood = { hi: '#ecb477', top: '#d49257', mid: '#b97643', dark: '#955631', deep: '#6b3b24' }
const DARK_TEAK: Wood = { hi: '#b0724a', top: '#8e5636', mid: '#74432a', dark: '#5a321f', deep: '#3e2216' }
const LACQUER: Wood = { hi: '#e0645a', top: '#c8423f', mid: '#a8323a', dark: '#83263a', deep: '#5e1c30' }
const BAMBOO: Wood = { hi: '#f4e2a0', top: '#e6cc7c', mid: '#d2b262', dark: '#b08e48', deep: '#846a34' }
const WHITE: Wood = { hi: '#fffdf8', top: '#fbf5ea', mid: '#f0e6d6', dark: '#dccdb7', deep: '#bba98f' }
const JADE: Wood = { hi: '#b8e8cc', top: '#8fd4b0', mid: '#5fb48e', dark: '#3f8c6c', deep: '#2a624c' }
const CLAY = { hi: '#f2a57a', base: '#d97b52', dark: '#b45a3a', deep: '#8a4030' }
const LEAF = ['#9bd66e', '#6cbf5c', '#48a052', '#2f7a47', '#215a3b'] as const

// ---------------------------------------------------------------------------
// Helpers

function box(g: Surface, x: number, y: number, w: number, topD: number, frontH: number, p: Wood) {
  g.rect(x, y, w, topD, p.top)
  g.hline(x, x + w - 1, y, p.hi)
  g.rect(x, y + topD, w, frontH, p.mid)
  g.hline(x, x + w - 1, y + topD, p.hi)
  if (frontH > 2) g.hline(x, x + w - 1, y + topD + frontH - 1, p.dark)
}

function leg(g: Surface, x: number, y0: number, y1: number, p: Wood, w = 2) {
  g.rect(x, y0, w, y1 - y0, p.mid)
  g.vline(x + w - 1, y0, y1 - 1, p.dark)
}

function grain(g: Surface, x: number, y: number, w: number, h: number, c: Color, seed: number, n = 6) {
  const r = new Rng(seed)
  for (let i = 0; i < n; i++) {
    const gx = x + r.int(0, Math.max(0, w - 3))
    const gy = y + r.int(0, Math.max(0, h - 1))
    g.hline(gx, gx + r.int(1, 2), gy, c)
  }
}

function flame(g: Surface, x: number, baseY: number, t: number, seed: number) {
  const f = Math.sin(t * 12 + seed) > 0.2 ? 1 : 0
  g.px(x, baseY - 1 - f, '#ffd54f')
  g.px(x, baseY - 2 - f, '#fff3a6')
  g.px(x, baseY, '#f58f35')
}

/** Rounded clay pot/jar body. */
function jar(g: Surface, cx: number, top: number, bottom: number, rx: number, c: { hi: Color; base: Color; dark: Color; deep: Color }) {
  const cy = (top + bottom) / 2
  const ry = (bottom - top) / 2
  g.ellipse(cx, cy, rx, ry, c.base)
  g.ellipse(cx + rx * 0.35, cy + ry * 0.15, rx * 0.6, ry * 0.8, c.dark)
  g.ellipse(cx - rx * 0.1, cy, rx * 0.72, ry * 0.85, c.base)
  g.ellipse(cx - rx * 0.45, cy - ry * 0.35, rx * 0.22, ry * 0.3, c.hi)
  g.hline(Math.round(cx - rx * 0.6), Math.round(cx + rx * 0.6), Math.round(bottom - 1), c.deep)
}

export const ROOM_ART: Record<string, Art> = {}
export const ROOM_FX: Record<string, RoomFx> = {}

// ---------------------------------------------------------------------------
// Built-ins

/** Candle flames and the incense bowl on the big altar, in canvas coordinates. */
const ALTAR_UP = 76
const ALTAR_CANDLES: [number, number][] = [
  [11, 55],
  [53, 55],
  [26, 65],
  [38, 65],
]

ROOM_ART.altar_grand = {
  up: ALTAR_UP,
  draw(g, a) {
    const { b } = a
    const L = LACQUER
    // Backboard arch (ซุ้ม) in red lacquer with gold edging and flame tips.
    g.poly(
      [
        [17, 50],
        [17, 22],
        [22, 12],
        [32, 2],
        [42, 12],
        [47, 22],
        [47, 50],
      ],
      GOLD.dark,
    )
    g.poly(
      [
        [19, 50],
        [19, 23],
        [23, 14],
        [32, 5],
        [41, 14],
        [45, 23],
        [45, 50],
      ],
      L.mid,
    )
    g.poly(
      [
        [21, 50],
        [21, 24],
        [25, 16],
        [32, 9],
        [39, 16],
        [43, 24],
        [43, 50],
      ],
      L.deep,
    )
    for (const [x, y] of [
      [17, 28],
      [18, 20],
      [22, 12],
      [27, 6],
      [37, 6],
      [42, 12],
      [46, 20],
      [47, 28],
    ] as [number, number][]) {
      g.px(x, y - 1, GOLD.base)
      g.px(x, y - 2, GOLD.light)
    }
    g.px(32, 0, GOLD.light)
    g.px(32, 1, GOLD.base)
    // Halo glow behind the image.
    g.alpha(0.35)
    g.ellipse(32, 30, 9, 11, GOLD.light)
    g.alpha(1)
    // The principal image on a lotus base.
    drawBuddha(g, 32, 44, 0.4, GOLD)
    g.ellipse(32, 45.5, 11, 2.2, GOLD.dark)
    g.ellipse(32, 45, 10, 1.6, GOLD.base)
    for (let x = 23; x <= 41; x += 3) g.px(x, 46, GOLD.light)
    // Top table.
    box(g, 18, 47, 28, 3, 6, L)
    g.hline(18, 45, 52, GOLD.base)
    for (let x = 20; x < 45; x += 4) g.px(x, 55, GOLD.base)
    // Side tables with vases.
    for (const x0 of [4, 44]) {
      box(g, x0, 55, 16, 3, 6, L)
      g.hline(x0, x0 + 15, 60, GOLD.base)
      // Vase of lotus and marigold.
      const vx = x0 + 11 - (x0 === 44 ? 6 : 0)
      g.rect(vx - 2, 50, 4, 5, '#e8eef4')
      g.hline(vx - 2, vx + 1, 50, '#ffffff')
      g.rect(vx - 1, 49, 2, 1, '#cfd8e2')
      for (const [dx, dy, c] of [
        [-2, 46, P.pink],
        [1, 45, '#ffb84a'],
        [0, 47, P.pinkL],
        [-1, 44, '#fff6dc'],
      ] as [number, number, string][])
        g.rect(vx + dx, dy, 2, 2, c)
      g.px(vx - 3, 48, LEAF[2])
      g.px(vx + 2, 47, LEAF[1])
    }
    // Candles on the side tables.
    for (const [cx, cy] of ALTAR_CANDLES.slice(0, 2)) {
      g.rect(cx - 1, cy, 2, 5, '#fff6dc')
      g.vline(cx, cy, cy + 4, '#f0e2c4')
    }
    // Front table: long, with kanok apron.
    box(g, 0, 63, 64, 4, b - 67, L)
    g.hline(0, 63, 67, GOLD.base)
    for (let x = 3; x < 62; x += 6) {
      g.px(x, 70, GOLD.base)
      g.px(x + 1, 69, GOLD.base)
      g.px(x + 2, 70, GOLD.dark)
      g.px(x + 1, 71, GOLD.dark)
    }
    g.rect(0, b - 3, 3, 3, GOLD.dark)
    g.rect(61, b - 3, 3, 3, GOLD.dark)
    // Incense bowl with sticks, small candles, two offering trays (พาน) with garlands.
    g.ellipse(32, 64, 5, 2, '#c9b08a')
    g.ellipse(32, 63.5, 4, 1.2, '#8a7a64')
    for (const dx of [-2, 0, 2]) {
      g.vline(32 + dx, 56, 63, '#b8343f')
      g.px(32 + dx, 55, '#ffb84a')
    }
    for (const [cx, cy] of ALTAR_CANDLES.slice(2)) {
      g.rect(cx - 1, cy - 4, 2, 4, '#fff6dc')
    }
    for (const px of [10, 54]) {
      g.rect(px - 3, 63, 6, 1, GOLD.dark)
      g.rect(px - 1, 64, 2, 1, GOLD.dark)
      g.ellipse(px, 61, 3.5, 2, '#fffaf0')
      g.px(px - 2, 61, '#ff6f91')
      g.px(px + 1, 60, '#ff6f91')
      g.px(px, 62, '#e8514a')
    }
  },
}

ROOM_FX.altar_grand = (g, x, y, _flip, t, _st, emissive) => {
  for (const [cx, cy] of ALTAR_CANDLES) flame(g, x + cx, y + cy - ALTAR_UP - (cy > 60 ? 4 : 0), t, cx)
  if (emissive) return
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.5 + k / 3) % 1
    const sx = x + 32 + Math.round(Math.sin(ph * 8 + k) * 2)
    const sy = y + 54 - ALTAR_UP - Math.round(ph * 16)
    g.alpha(0.55 * (1 - ph))
    g.px(sx, sy, '#f4eef8')
    g.alpha(1)
  }
}

/** Glow points of the altar (world offsets from its footprint top-left) for the scene's lighting. */
export const ALTAR_GLOW: [number, number, number][] = [
  [11, 55 - ALTAR_UP - 2, 8],
  [53, 55 - ALTAR_UP - 2, 8],
  [32, 30 - ALTAR_UP, 16],
]

ROOM_ART.kitchen_counter = {
  up: 40,
  draw(g, a) {
    const { b } = a
    const T = TEAK
    // Open shelf with jars of chilli, garlic and pickles.
    g.rect(0, 5, 64, 3, T.mid)
    g.hline(0, 63, 5, T.hi)
    g.hline(0, 63, 7, T.dark)
    for (const [x, c, h] of [
      [3, '#e8413a', 7],
      [10, '#fff1d6', 6],
      [17, '#f58f35', 8],
      [25, '#86c95f', 6],
      [48, '#ffd23f', 7],
      [56, '#b45a3a', 6],
    ] as [number, Color, number][]) {
      g.rect(x, 5 - h, 5, h, '#e2f0f4')
      g.rect(x + 1, 5 - h + 2, 3, h - 2, c)
      g.rect(x, 5 - h - 1, 5, 1, '#9aa3ae')
      g.px(x, 5 - h + 1, '#ffffff')
    }
    // Hanging ladle, spatula and a bunch of chillies.
    g.hline(32, 44, 10, '#9aa3ae')
    g.vline(34, 10, 20, '#6d7582')
    g.ellipse(34, 21, 2.2, 1.4, '#9aa3ae')
    g.vline(39, 10, 19, '#9a6a45')
    g.rect(38, 19, 3, 3, '#cfd5dc')
    g.vline(43, 10, 14, '#6e4a35')
    for (const [dx, dy] of [
      [-1, 15],
      [1, 16],
      [0, 18],
      [-1, 19],
    ])
      g.rect(43 + dx, dy, 2, 2, '#e8413a')
    g.px(43, 14, '#43905a')
    // Tiled backsplash.
    g.rect(0, 23, 64, 16, '#f2f7f4')
    for (let y = 23; y < 39; y += 4) {
      g.hline(0, 63, y, '#dce8e2')
      for (let x = (y - 23) % 8 ? 0 : 4; x < 64; x += 8) g.vline(x, y, y + 3, '#dce8e2')
    }
    // Countertop.
    box(g, 0, 38, 64, 5, b - 43, WHITE)
    g.rect(0, 38, 64, 5, '#d9d4cc')
    g.hline(0, 63, 38, '#f2efe9')
    // Sink with a tap.
    g.rect(4, 39, 16, 3, '#9aa3ae')
    g.rect(5, 39, 14, 2, '#6d7582')
    g.hline(6, 17, 39, '#cfd5dc')
    g.vline(12, 32, 38, '#cfd5dc')
    g.hline(12, 15, 32, '#cfd5dc')
    g.px(15, 33, '#78d2e2')
    // Stone mortar (ครก) with pestle and a basket of garlic + chilli.
    g.ellipse(29, 38, 4.5, 3, '#8c8187')
    g.ellipse(29, 36.5, 3.5, 1.2, '#625867')
    g.thickLine(30, 36, 33, 30, 2, '#bdb2ae')
    g.ellipse(42, 38, 5, 2.6, '#d9ab62')
    for (const [dx, c] of [
      [-3, '#fff6dc'],
      [-1, '#e8413a'],
      [1, '#fff6dc'],
      [3, '#86c95f'],
    ] as [number, string][])
      g.rect(42 + dx, 35, 2, 2, c)
    // Gas burner.
    g.rect(51, 39, 11, 3, '#3a3a46')
    g.ellipse(56, 39.5, 3.5, 1.2, '#5a5a66')
    // Cabinet doors.
    for (const x of [2, 18, 34, 50]) {
      g.rect(x, 45, 13, b - 48, WHITE.top)
      g.hline(x, x + 12, 45, WHITE.hi)
      g.vline(x + 12, 45, b - 4, WHITE.dark)
      g.rect(x + 5, 47, 3, 1, '#9aa3ae')
    }
    g.rect(0, b - 2, 64, 2, WHITE.deep)
  },
}

ROOM_FX.kitchen_counter = (g, x, y, _flip, t, _st, emissive) => {
  if (emissive) return
  // Steam from the burner and a drip from the tap.
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.7 + k * 0.5) % 1
    g.alpha(0.5 * (1 - ph))
    g.px(x + 56 + Math.round(Math.sin(ph * 7 + k) * 1.5), y - 3 - Math.round(ph * 10), '#ffffff')
    g.alpha(1)
  }
  const d = (t * 0.9) % 1
  if (d < 0.6) g.px(x + 15, y - 6 + Math.round(d * 5), '#9fe6f2')
}

ROOM_ART.window_wide = {
  up: 0,
  outline: null,
  draw(g, a) {
    // Thumbnail only: the scene draws the live view and frame.
    const r = { x: 2, y: 2, w: a.W - 4, h: a.D - 3 }
    drawRoomView(g, 'bts', 'day', 0, r)
    drawRoomFrame(g, 'black', 0, 1, r, { x: 0, y: 0, w: a.W, h: a.D })
  },
}

// ---------------------------------------------------------------------------
// ภาคกลาง

ROOM_ART.c_samkhok_jar = {
  up: 14,
  draw(g, a) {
    const { b } = a
    const C = { hi: '#c98a5a', base: '#9a5536', dark: '#7a3e28', deep: '#5a2c1e' }
    jar(g, 8, 6, b, 7.5, C)
    // Rim, glaze drips and the ladle.
    g.ellipse(8, 7, 5, 1.8, C.deep)
    g.ellipse(8, 6.6, 4, 1.2, '#3a5a6a')
    g.px(6, 6, '#78b4c8')
    for (const x of [4, 7, 11]) g.vline(x, 9, 12 + (x % 3), '#b8743e')
    // Wooden lid half on, coconut-shell ladle.
    g.rect(9, 4, 7, 2, TEAK.mid)
    g.hline(9, 15, 4, TEAK.hi)
    g.ellipse(4, 5, 2.5, 1.5, '#6e4a35')
    g.px(3, 4, '#9a6a45')
    g.line(5, 5, 8, 2, '#9a6a45')
  },
}

ROOM_ART.c_pinto = {
  up: 20,
  draw(g, a) {
    const { b } = a
    // Little teak stool.
    box(g, 1, b - 8, 14, 2, 2, TEAK)
    leg(g, 2, b - 4, b, TEAK)
    leg(g, 12, b - 4, b, TEAK)
    // Five enamel tiers, alternating cream / blue-flower.
    const tiers = 5
    for (let i = 0; i < tiers; i++) {
      const y = b - 10 - i * 4
      const blue = i % 2 === 0
      g.rect(4, y - 3, 8, 4, blue ? '#fff8ec' : '#9fc4ee')
      g.hline(4, 11, y - 3, blue ? '#ffffff' : '#bfe3ff')
      g.hline(4, 11, y, blue ? '#e2d4bd' : '#5a8de0')
      if (blue) {
        g.px(6, y - 2, '#3a78c0')
        g.px(9, y - 1, '#3a78c0')
      } else {
        g.px(7, y - 2, '#fffaf0')
      }
    }
    // Carry frame and handle.
    const top = b - 10 - tiers * 4 + 1
    g.vline(3, top - 1, b - 10, '#cfd5dc')
    g.vline(12, top - 1, b - 10, '#9aa3ae')
    g.hline(3, 12, top - 2, '#cfd5dc')
    g.rect(6, top - 5, 4, 1, '#cfd5dc')
    g.vline(6, top - 5, top - 2, '#cfd5dc')
    g.vline(9, top - 5, top - 2, '#9aa3ae')
  },
}

ROOM_ART.c_birdcage = {
  up: 0,
  frames: 2,
  draw(g, _a, fr) {
    // Hook and chain.
    g.vline(8, 0, 4, '#6e4a35')
    g.px(7, 0, '#6e4a35')
    // Dome cage of split bamboo.
    g.ellipse(8, 9, 2, 1.5, BAMBOO.dark)
    for (let x = 2; x <= 14; x += 2) {
      const top = 8 + Math.round(Math.abs(x - 8) * 0.6)
      g.vline(x, top, 27, x < 8 ? BAMBOO.top : BAMBOO.mid)
    }
    g.hline(2, 14, 27, BAMBOO.dark)
    g.hline(2, 14, 28, TEAK.mid)
    g.hline(2, 14, 29, TEAK.dark)
    g.hline(3, 13, 16, BAMBOO.hi)
    // Perch and the zebra dove.
    g.hline(4, 12, 22, TEAK.mid)
    const bob = fr
    g.ellipse(8, 19 - bob, 3, 2.2, '#b8a898')
    g.ellipse(7, 19.5 - bob, 2, 1.4, '#d8ccc0')
    g.circle(10, 16.5 - bob, 1.6, '#c4b8b0')
    g.px(11, 16 - bob, P.ink)
    g.px(12, 17 - bob, '#e8a080')
    g.px(5, 18 - bob, '#8a7a70')
    g.px(4, 19 - bob, '#8a7a70')
    for (const x of [6, 8]) g.px(x, 18 - bob, '#8a7a70')
    // Cloth cover rolled at the top.
    g.rect(4, 8, 8, 2, '#c8423f')
    g.hline(4, 11, 8, '#e0645a')
  },
}

// ---------------------------------------------------------------------------
// ภาคเหนือ

ROOM_ART.n_khantok = {
  up: 12,
  draw(g, a) {
    const { b } = a
    const L = LACQUER
    // Round lacquer tray on a flared stand.
    g.ellipse(16, b - 3, 10, 2.5, L.deep)
    g.rect(9, b - 8, 14, 5, L.mid)
    g.hline(9, 22, b - 8, L.hi)
    for (let x = 10; x < 22; x += 3) g.vline(x, b - 7, b - 4, L.dark)
    g.ellipse(16, b - 10, 15, 5, GOLD.dark)
    g.ellipse(16, b - 10.5, 14, 4.2, L.top)
    g.ellipse(16, b - 10.8, 12.5, 3.4, L.mid)
    // Dishes: sticky rice basket, nam prik noom, cabbage, pork rinds.
    g.ellipse(9, b - 13, 3, 3.5, BAMBOO.mid)
    g.rect(7, b - 18, 5, 4, BAMBOO.top)
    g.hline(7, 11, b - 18, BAMBOO.hi)
    g.hline(7, 11, b - 15, BAMBOO.dark)
    g.vline(9, b - 21, b - 18, TEAK.dark)
    g.ellipse(16, b - 11, 3, 1.5, '#fffaf0')
    g.ellipse(16, b - 11.4, 2, 0.9, '#9bd66e')
    g.ellipse(22, b - 12, 3, 1.5, '#fffaf0')
    g.ellipse(22, b - 12.4, 2, 0.9, '#f2c86a')
    g.px(21, b - 13, '#fff6dc')
    g.ellipse(18, b - 8, 2.4, 1.2, '#c8f0cf')
    g.px(13, b - 8, '#e8413a')
  },
}

ROOM_ART.n_tung = {
  up: 0,
  frames: 2,
  draw(g, _a, fr) {
    // Bamboo pole with the woven banner hanging down.
    g.hline(1, 14, 1, BAMBOO.mid)
    g.hline(1, 14, 2, BAMBOO.dark)
    g.px(0, 1, BAMBOO.dark)
    const sway = fr
    const bands = ['#e8514a', '#ffd23f', '#43905a', '#fffaf0', '#5a8de0', '#e8514a', '#ffd23f']
    for (let i = 0; i < bands.length; i++) {
      const y = 3 + i * 3
      const x = 4 + (i > 3 ? sway : 0)
      g.rect(x, y, 8, 3, bands[i])
      g.px(x + 3, y + 1, i % 2 ? '#fffaf0' : '#b8343f')
      g.px(x + 4, y + 1, i % 2 ? '#fffaf0' : '#b8343f')
    }
    // Side streamers and the tassel.
    g.vline(3, 3, 20, '#ffd23f')
    g.vline(12, 3, 20, '#ffd23f')
    g.rect(6 + sway, 24, 4, 2, GOLD.base)
    for (const x of [6, 7, 8, 9]) g.vline(x + sway, 26, 29 + (x % 2), x % 2 ? '#e8514a' : GOLD.dark)
  },
}

ROOM_ART.n_kalae = {
  up: 0,
  draw(g) {
    const W = DARK_TEAK
    // Mounting plank.
    g.rect(2, 12, 28, 3, W.mid)
    g.hline(2, 29, 12, W.hi)
    // Two crossed boards flaring out with curled tips (กาแล).
    for (const side of [-1, 1] as const) {
      const pts: [number, number][] =
        side < 0
          ? [
              [18, 13],
              [22, 13],
              [9, 2],
              [5, 2],
            ]
          : [
              [10, 13],
              [14, 13],
              [27, 2],
              [23, 2],
            ]
      g.poly(pts, W.top)
      const tip = side < 0 ? 5 : 26
      g.circle(tip, 2, 2.2, W.top)
      g.px(tip, 2, W.deep)
      // Gold carving highlights along the board.
      for (let k = 0; k < 4; k++) {
        const x = side < 0 ? 17 - k * 3 : 15 + k * 3
        g.px(x, 11 - k * 2.5, GOLD.base)
      }
    }
    g.rect(14, 8, 4, 4, W.deep)
    g.px(15, 9, GOLD.base)
    g.px(16, 10, GOLD.base)
  },
}

// ---------------------------------------------------------------------------
// ภาคอีสาน

ROOM_ART.i_khaen = {
  up: 28,
  frames: 2,
  draw(g, a, fr) {
    const { b } = a
    // Wooden stand.
    g.rect(3, b - 5, 10, 3, TEAK.mid)
    g.hline(3, 12, b - 5, TEAK.hi)
    leg(g, 4, b - 2, b, TEAK)
    leg(g, 10, b - 2, b, TEAK)
    // Two rows of bamboo pipes, longest in the middle.
    const lens = [22, 27, 31, 34, 34, 31, 27, 22]
    for (let i = 0; i < lens.length; i++) {
      const x = 3 + i
      const top = b - 6 - lens[i]
      g.vline(x, top, b - 6, i % 2 ? BAMBOO.mid : BAMBOO.top)
      g.px(x, top, BAMBOO.hi)
      g.px(x, top + 8, BAMBOO.dark)
    }
    g.vline(11, b - 30, b - 6, BAMBOO.dark)
    // Wind chest (เต้าแคน) with the mouthpiece.
    g.ellipse(7, b - 16, 3.5, 2.5, DARK_TEAK.mid)
    g.ellipse(6.5, b - 16.5, 2.5, 1.5, DARK_TEAK.hi)
    g.rect(11, b - 17, 3, 2, DARK_TEAK.dark)
    // Binding bands.
    for (const y of [b - 24, b - 10]) g.hline(3, 10, y, '#b8343f')
    if (fr) {
      g.px(1, b - 30, '#ffd23f')
      g.px(14, b - 26, '#ff9fc0')
    }
  },
}

ROOM_ART.i_plara = {
  up: 12,
  draw(g, a) {
    const { b } = a
    const C = { hi: '#c9a07a', base: '#a47650', dark: '#7e5638', deep: '#5a3c28' }
    jar(g, 8, 3, b, 7, C)
    // Neck and cloth cover tied with string.
    g.rect(5, 1, 6, 3, C.dark)
    g.ellipse(8, 1, 4.5, 2, '#e8dcc0')
    g.ellipse(8, 0.6, 3.6, 1.3, '#fff6dc')
    g.hline(4, 12, 3, '#b8343f')
    g.px(12, 4, '#b8343f')
    g.px(13, 5, '#b8343f')
    // Rough glaze ring.
    g.hline(3, 13, b - 6, C.hi)
  },
}

ROOM_FX.i_plara = (g, x, y, flip, t, _st, emissive) => {
  if (emissive) return
  // Legendary aroma (กลิ่นนัว) wafting up in green squiggles.
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.35 + k / 3) % 1
    const bx = x + (flip ? 5 : 11) + k * 2 - 2
    const by = y - 12 - Math.round(ph * 14)
    g.alpha(0.7 * (1 - ph))
    g.px(bx + Math.round(Math.sin(ph * 10 + k) * 1.5), by, '#9bd66e')
    g.px(bx + Math.round(Math.sin(ph * 10 + k + 1) * 1.5), by - 1, '#6cbf5c')
    g.alpha(1)
  }
}

ROOM_ART.i_khrae = {
  up: 12,
  draw(g, a) {
    const { b } = a
    const B = BAMBOO
    // Slatted bamboo platform.
    g.rect(0, b - 12, 32, 6, B.top)
    for (let x = 0; x < 32; x += 3) g.vline(x, b - 12, b - 7, B.dark)
    g.hline(0, 31, b - 12, B.hi)
    g.rect(0, b - 6, 32, 2, B.mid)
    g.hline(0, 31, b - 5, B.dark)
    for (const x of [1, 29]) leg(g, x, b - 4, b, B, 2)
    leg(g, 15, b - 4, b, B, 2)
    // Sticky-rice basket (กระติ๊บ) and a plate of som tam.
    g.rect(4, b - 21, 7, 9, B.mid)
    g.hline(4, 10, b - 21, B.hi)
    for (let y = b - 19; y < b - 12; y += 2) g.hline(4, 10, y, B.dark)
    g.rect(5, b - 23, 5, 2, B.top)
    g.hline(3, 11, b - 13, B.deep)
    g.ellipse(20, b - 12, 5, 1.8, '#fffaf0')
    g.ellipse(20, b - 12.4, 3.8, 1.1, '#f2c86a')
    g.px(18, b - 13, '#e8413a')
    g.px(21, b - 12, '#9bd66e')
    g.px(22, b - 13, '#e8413a')
    // A little clay mortar.
    g.ellipse(27, b - 13, 2.5, 2, CLAY.dark)
    g.ellipse(27, b - 14, 2, 0.8, CLAY.deep)
  },
}

// ---------------------------------------------------------------------------
// ภาคใต้

ROOM_ART.s_lantern = {
  up: 0,
  frames: 2,
  draw(g, _a, fr) {
    const on = fr === 1
    g.vline(8, 0, 4, '#3a2838')
    // Gold caps.
    g.rect(5, 4, 6, 2, GOLD.dark)
    g.hline(5, 10, 4, GOLD.base)
    g.rect(5, 21, 6, 2, GOLD.dark)
    // Round red body with ribs.
    const body = on ? '#ff6a5a' : '#d8433c'
    const shade = on ? '#e8514a' : '#a8323a'
    g.ellipse(8, 13.5, 7, 8, body)
    g.ellipse(10, 14, 4.5, 7, shade)
    g.ellipse(7.5, 13.5, 5, 7.5, body)
    if (on) g.ellipse(7, 12, 3, 4, '#ffb89a')
    for (const x of [3, 6, 10, 13]) g.vline(x, 8, 19, on ? '#ffd0a0' : '#83263a')
    g.px(5, 9, '#ffffff')
    // Tassel.
    for (const x of [6, 7, 8, 9, 10]) g.vline(x, 23, 28 + (x % 2), x % 2 ? GOLD.base : '#e8514a')
  },
}

ROOM_ART.s_mukchair = {
  up: 22,
  draw(g, a) {
    const { b } = a
    // Rosewood armchair of a tin-mining towkay's house, pearl inlay on the splat.
    const R: Wood = { hi: '#a8644e', top: '#84463a', mid: '#66322a', dark: '#4a221e', deep: '#301614' }
    const pearl = ['#f4f8ff', '#d8ecf4', '#f8e8f4']
    // Back posts and the curved top rail.
    for (const x of [2, 12]) {
      g.rect(x, 2, 2, b - 12, R.mid)
      g.vline(x, 2, b - 11, R.hi)
    }
    g.rect(1, 1, 14, 3, R.top)
    g.hline(3, 12, 0, R.top)
    g.hline(1, 14, 1, R.hi)
    g.px(0, 2, R.top)
    g.px(15, 2, R.top)
    g.hline(1, 14, 3, R.dark)
    // Carved splat with a round mother-of-pearl medallion.
    g.rect(5, 4, 6, b - 17, R.top)
    g.vline(10, 4, b - 14, R.dark)
    g.circle(7.5, 9, 2.6, R.deep)
    g.circle(7.5, 9, 1.9, pearl[0])
    g.px(7, 8, pearl[2])
    g.px(8, 10, pearl[1])
    g.px(7, 13, pearl[0])
    g.px(8, 15, pearl[1])
    g.px(7, 17, pearl[2])
    // Arms with little scroll ends.
    for (const [x0, x1, tip] of [
      [0, 3, 0],
      [12, 15, 15],
    ] as [number, number, number][]) {
      g.rect(x0, b - 18, x1 - x0 + 1, 2, R.top)
      g.hline(x0, x1, b - 18, R.hi)
      g.rect(tip, b - 17, 1, 5, R.mid)
      g.px(tip, b - 19, R.hi)
    }
    // Seat with a red silk cushion.
    box(g, 1, b - 13, 14, 4, 3, R)
    g.rect(2, b - 14, 12, 3, '#c8423f')
    g.hline(2, 13, b - 14, '#e8746a')
    g.px(4, b - 13, GOLD.base)
    g.px(11, b - 13, GOLD.base)
    for (const [x, c] of [
      [4, pearl[0]],
      [8, pearl[1]],
      [11, pearl[2]],
    ] as [number, string][])
      g.px(x, b - 8, c)
    // Legs and the stretcher.
    leg(g, 1, b - 6, b, R)
    leg(g, 13, b - 6, b, R)
    g.hline(3, 12, b - 3, R.dark)
  },
}

ROOM_ART.s_cabinet = {
  up: 34,
  draw(g, a) {
    const { b } = a
    const J = JADE
    // Carved crest.
    g.poly(
      [
        [2, 4],
        [8, 0],
        [24, 0],
        [30, 4],
      ],
      J.dark,
    )
    g.hline(8, 23, 1, GOLD.base)
    g.rect(0, 4, 32, 3, J.top)
    g.hline(0, 31, 4, J.hi)
    // Body.
    g.rect(0, 7, 32, b - 7, J.mid)
    g.vline(0, 7, b - 1, J.top)
    g.vline(31, 7, b - 1, J.dark)
    // Two glass doors with shelves of blue-and-white bowls.
    for (const dx of [2, 17]) {
      g.rect(dx, 9, 13, 26, '#dff0ee')
      g.hline(dx, dx + 12, 21, J.dark)
      for (const [bx, by] of [
        [dx + 3, 19],
        [dx + 9, 19],
        [dx + 6, 32],
      ] as [number, number][]) {
        g.ellipse(bx, by, 2.8, 1.8, '#fffaf0')
        g.hline(bx - 2, bx + 2, by, '#3a78c0')
        g.px(bx, by - 1, '#5a8de0')
      }
      g.rect(dx + 1, 25, 3, 6, '#ffb84a')
      g.rect(dx + 1, 25, 3, 1, '#fff6dc')
      g.px(dx + 11, 10, '#ffffff')
      g.px(dx + 10, 11, '#ffffff')
    }
    g.rect(15, 9, 2, 26, J.dark)
    // Drawers and brass handles.
    g.rect(2, 37, 28, b - 40, J.top)
    g.hline(2, 29, 37, J.hi)
    g.px(9, 39, GOLD.base)
    g.px(22, 39, GOLD.base)
    g.rect(0, b - 2, 32, 2, J.deep)
  },
}

// ---------------------------------------------------------------------------
// กรุงเทพฯ คอนโด

ROOM_ART.b_sofa = {
  up: 16,
  draw(g, a) {
    const { b } = a
    const M = { hi: '#ffe08a', top: '#f2c14a', mid: '#e0a83a', dark: '#c08a2a', deep: '#8e6420' }
    // Back cushions.
    g.rect(2, 0, 44, 12, M.mid)
    g.hline(2, 45, 0, M.hi)
    for (const x of [16, 31]) g.vline(x, 1, 11, M.dark)
    // Arms.
    for (const x of [0, 43]) {
      g.rect(x, 5, 5, b - 9, M.top)
      g.hline(x, x + 4, 5, M.hi)
      g.vline(x + 4, 6, b - 5, M.dark)
    }
    // Seat cushions.
    g.rect(4, 11, 40, 9, M.top)
    g.hline(4, 43, 11, M.hi)
    for (const x of [17, 31]) g.vline(x, 11, 19, M.dark)
    g.rect(3, 20, 42, b - 24, M.mid)
    g.hline(3, 44, b - 5, M.dark)
    // Legs.
    for (const x of [4, 42]) g.rect(x, b - 4, 2, 4, '#3a2838')
    // Throw pillows and a bubble-tea cup on the arm.
    g.rect(6, 4, 8, 7, '#5a8de0')
    g.rect(7, 5, 6, 5, '#78a8f0')
    g.px(10, 7, '#fffaf0')
    g.rect(33, 4, 8, 7, '#fffaf0')
    for (const [x, y] of [
      [34, 5],
      [37, 7],
      [39, 5],
      [35, 9],
    ] as [number, number][])
      g.px(x, y, '#e8709e')
    g.rect(44, 0, 4, 5, '#e8dcc8')
    g.rect(44, 3, 4, 2, '#3a2838')
    g.vline(46, -3, 0, '#ff9fc0')
  },
}

ROOM_ART.b_wfh = {
  up: 22,
  frames: 2,
  draw(g, a, fr) {
    const { b } = a
    const on = fr === 1
    // White desk.
    box(g, 0, 11, 32, 3, 2, WHITE)
    leg(g, 1, 16, b, WHITE)
    leg(g, 29, 16, b, WHITE)
    g.rect(22, 16, 8, 6, WHITE.top)
    g.hline(22, 29, 16, WHITE.hi)
    g.px(26, 19, '#9aa3ae')
    // Laptop.
    g.rect(6, 1, 15, 10, '#3a3a46')
    g.rect(7, 2, 13, 8, on ? '#7fc8f0' : '#2a2a36')
    if (on) {
      g.rect(8, 3, 5, 3, '#bfe3ff')
      g.rect(14, 3, 5, 3, '#ffd0a8')
      g.rect(8, 7, 5, 2, '#c8f0cf')
      g.rect(14, 7, 5, 2, '#e2ccff')
    } else {
      g.px(9, 3, '#4a4a58')
      g.px(10, 4, '#4a4a58')
    }
    g.rect(4, 11, 19, 2, '#cfd5dc')
    g.hline(4, 22, 11, '#eef1f5')
    // Cactus and bubble tea.
    g.rect(25, 7, 4, 4, CLAY.base)
    g.rect(26, 2, 2, 5, '#6cbf5c')
    g.px(25, 4, '#6cbf5c')
    g.px(28, 3, '#6cbf5c')
    g.px(26, 1, '#ff9fc0')
    g.rect(1, 5, 4, 6, '#f4e2c4')
    g.rect(1, 8, 4, 3, '#3a2838')
    g.px(2, 9, '#5a4050')
    g.vline(3, 1, 5, '#e8514a')
    g.hline(1, 4, 5, '#fffaf0')
  },
}

ROOM_FX.b_wfh = (g, x, y, _flip, t, st, emissive) => {
  if (!st.on || !emissive) return
  // Meeting-call blink on the laptop.
  if (Math.sin(t * 3) > 0) g.px(x + 19, y - 20, '#7cff9a')
}

ROOM_ART.b_robot = {
  up: 4,
  draw(g, a) {
    const { b } = a
    g.ellipse(8, b - 5, 7, 3.6, '#5a5a66')
    g.ellipse(8, b - 6, 7, 3.2, '#9aa3ae')
    g.ellipse(8, b - 6.6, 5.5, 2.2, '#cfd5dc')
    g.ellipse(7, b - 7.2, 3, 1, '#eef1f5')
    g.rect(6, b - 9, 4, 1, '#3a3a46')
    // Cute face on the bumper.
    g.px(5, b - 4, P.ink)
    g.px(10, b - 4, P.ink)
    g.hline(7, 8, b - 3, P.ink)
    g.px(4, b - 3, '#ff9aa6')
    g.px(11, b - 3, '#ff9aa6')
  },
}

ROOM_FX.b_robot = (g, x, y, _flip, t, st, emissive) => {
  if (!emissive && Math.sin(t * 4) > 0.2) g.px(x + 8, y + 3, '#7cd2ff')
  // Tapped: a happy little heart.
  if (!emissive && st.poke < 1) {
    g.alpha(1 - st.poke)
    g.px(x + 7, y - 4 - Math.round(st.poke * 6), '#ff6f91')
    g.px(x + 9, y - 4 - Math.round(st.poke * 6), '#ff6f91')
    g.px(x + 8, y - 3 - Math.round(st.poke * 6), '#ff6f91')
    g.alpha(1)
  }
}

// ---------------------------------------------------------------------------
// ภาคตะวันออก

function durian(g: Surface, cx: number, cy: number, r: number) {
  g.ellipse(cx, cy, r, r * 0.85, '#7a9a3a')
  g.ellipse(cx - r * 0.2, cy - r * 0.2, r * 0.7, r * 0.6, '#9ab84a')
  for (let yy = -2; yy <= 2; yy++)
    for (let xx = -2; xx <= 2; xx++) {
      const px = Math.round(cx + xx * r * 0.36)
      const py = Math.round(cy + yy * r * 0.32)
      if ((xx + yy) % 2 === 0 && Math.hypot(xx, yy) < 2.6) g.px(px, py, '#5a7a2a')
    }
  g.vline(Math.round(cx), Math.round(cy - r - 2), Math.round(cy - r * 0.8), '#6e4a35')
}

ROOM_ART.e_durian = {
  up: 12,
  draw(g, a) {
    const { b } = a
    // Bamboo basket (เข่ง).
    g.poly(
      [
        [1, b - 11],
        [15, b - 11],
        [13, b],
        [3, b],
      ],
      BAMBOO.mid,
    )
    for (let y = b - 9; y < b; y += 2) g.hline(2, 14, y, BAMBOO.dark)
    for (let x = 4; x < 14; x += 3) g.vline(x, b - 11, b - 1, BAMBOO.top)
    g.hline(1, 15, b - 11, BAMBOO.hi)
    // Two durians, one cracked open with golden flesh.
    durian(g, 5, b - 14, 4.5)
    durian(g, 11, b - 15, 4.5)
    g.ellipse(11, b - 15, 2, 1.6, '#ffe070')
    g.px(10, b - 16, '#fff3a6')
  },
}

ROOM_ART.e_fruitstall = {
  up: 18,
  draw(g, a) {
    const { b } = a
    // Wooden stall with a slanted top.
    box(g, 0, 8, 32, 6, b - 14, TEAK)
    grain(g, 1, 16, 30, b - 18, TEAK.dark, 21, 6)
    leg(g, 1, b - 3, b, TEAK)
    leg(g, 29, b - 3, b, TEAK)
    // Fruit piles: mangosteen, rambutan, longkong, salak.
    const piles: [number, Color, Color][] = [
      [5, '#5a2848', '#7a3c64'],
      [13, '#e8413a', '#ff7a6a'],
      [21, '#d9b27a', '#f0cf98'],
      [28, '#7a4a34', '#9a6a48'],
    ]
    for (const [cx, base, hi] of piles) {
      for (const [dx, dy] of [
        [-2, 0],
        [1, 0],
        [-1, -2],
        [2, -2],
        [0, -4],
      ]) {
        g.circle(cx + dx, 10 + dy, 1.6, base)
        g.px(cx + dx - 1, 9 + dy, hi)
      }
    }
    // Mangosteen caps and rambutan hairs.
    g.px(5, 5, '#43905a')
    g.px(4, 7, '#43905a')
    for (const x of [11, 13, 15]) g.px(x, 5, '#2f7a47')
    // Little price sign.
    g.rect(12, 0, 8, 4, '#fffaf0')
    g.hline(13, 18, 1, '#e8514a')
    g.hline(13, 16, 2, P.ink2)
  },
}

ROOM_ART.e_ngop = {
  up: 0,
  draw(g) {
    // Nail, then the wide cone of the palm-leaf hat seen from the front.
    g.px(8, 1, '#6d7582')
    g.poly(
      [
        [8, 2],
        [15, 11],
        [1, 11],
      ],
      '#e6cc7c',
    )
    g.poly(
      [
        [8, 2],
        [15, 11],
        [9, 11],
      ],
      '#d2b262',
    )
    for (let y = 5; y < 11; y += 2) g.hline(8 - (y - 2) * 0.75, 8 + (y - 2) * 0.75, y, '#b08e48')
    g.ellipse(8, 12, 7.5, 2, '#b08e48')
    g.ellipse(8, 11.6, 6.5, 1.3, '#f4e2a0')
    // Red chin strap.
    g.line(3, 12, 6, 15, '#e8514a')
    g.line(13, 12, 10, 15, '#e8514a')
  },
}

// ---------------------------------------------------------------------------
// ภาคตะวันตก

ROOM_ART.w_hammock = {
  up: 24,
  draw(g, a) {
    const { b } = a
    // Two posts.
    for (const x of [1, 44]) {
      g.rect(x, 0, 3, b, TEAK.mid)
      g.vline(x, 0, b - 1, TEAK.hi)
      g.vline(x + 2, 0, b - 1, TEAK.dark)
    }
    // Ropes and the sagging striped net.
    g.line(4, 6, 10, 12, '#e6cc7c')
    g.line(43, 6, 37, 12, '#e6cc7c')
    const stripes = ['#e8514a', '#ffd23f', '#5a8de0', '#86c95f', '#ff9fc0']
    for (let x = 10; x <= 37; x++) {
      const u = (x - 10) / 27
      const sag = Math.round(Math.sin(u * Math.PI) * 8)
      const c = stripes[Math.floor((x - 10) / 6) % stripes.length]
      g.vline(x, 12 + sag - 2, 12 + sag + 2, c)
      g.px(x, 12 + sag + 3, mix(c, '#3a2838', 0.3))
    }
    g.line(10, 12, 37, 12, '#fff6dc')
  },
}

ROOM_ART.w_lifering = {
  up: 0,
  draw(g) {
    g.circle(8, 8, 7, '#f58f35')
    g.circle(8, 8, 3.2, 'rgba(0,0,0,0)')
    for (const [a0, c] of [
      [0, '#fffaf0'],
      [Math.PI / 2, '#fffaf0'],
      [Math.PI, '#fffaf0'],
      [(3 * Math.PI) / 2, '#fffaf0'],
    ] as [number, string][]) {
      for (let r = 4; r <= 7; r++) {
        g.px(Math.round(8 + Math.cos(a0) * r), Math.round(8 + Math.sin(a0) * r), c)
        g.px(Math.round(8 + Math.cos(a0 + 0.25) * r), Math.round(8 + Math.sin(a0 + 0.25) * r), c)
      }
    }
    // Hole in the middle (clear) and a rope.
    g.ctx.clearRect(6 - g.ox, 6 - g.oy, 5, 5)
    g.ctx.clearRect(5 - g.ox, 7 - g.oy, 7, 3)
    g.ctx.clearRect(7 - g.ox, 5 - g.oy, 3, 7)
    g.px(1, 5, '#e6cc7c')
    g.px(15, 11, '#e6cc7c')
    g.px(4, 14, '#e6cc7c')
  },
}

ROOM_ART.w_fishtrap = {
  up: 18,
  draw(g, a) {
    const { b } = a
    // Long woven trap (ไซ) leaning back.
    g.poly(
      [
        [2, b - 2],
        [7, b - 3],
        [11, 1],
        [8, 0],
      ],
      BAMBOO.mid,
    )
    for (let k = 0; k < 7; k++) {
      const y = b - 4 - k * 3.4
      const x = 3 + k * 0.9
      g.hline(Math.round(x), Math.round(x + 4 - k * 0.3), Math.round(y), BAMBOO.dark)
    }
    g.line(8, 0, 2, b - 2, BAMBOO.hi)
    // Fish basket (ข้อง) with a narrow neck.
    g.ellipse(11, b - 5, 4, 4.5, BAMBOO.top)
    for (let y = b - 8; y < b - 1; y += 2) g.hline(8, 14, y, BAMBOO.dark)
    g.rect(10, b - 12, 3, 3, BAMBOO.mid)
    g.hline(9, 13, b - 12, BAMBOO.hi)
    g.px(14, b - 9, '#9fc4ee')
  },
}

// ---------------------------------------------------------------------------
// Temple models (SS rewards)

interface ChediSpec {
  body: Color
  bodyD: Color
  hi: Color
  top: Color
  shape: 'bell' | 'lotus' | 'wide'
  umbrellas?: boolean
}

const CHEDI: Record<string, ChediSpec> = {
  model_phra_kaew: { body: GOLD.base, bodyD: GOLD.dark, hi: GOLD.light, top: GOLD.base, shape: 'bell' },
  model_pathom: { body: '#f58f35', bodyD: '#d0661f', hi: '#ffbb66', top: GOLD.base, shape: 'wide' },
  model_doi_suthep: { body: GOLD.base, bodyD: GOLD.dark, hi: GOLD.light, top: GOLD.light, shape: 'bell', umbrellas: true },
  model_that_phanom: { body: '#f4f0e8', bodyD: '#d8d0c0', hi: '#ffffff', top: GOLD.base, shape: 'lotus' },
  model_nst: { body: '#f7f4ee', bodyD: '#dcd4c6', hi: '#ffffff', top: GOLD.base, shape: 'bell' },
}

function drawChedi(g: Surface, b: number, c: ChediSpec) {
  // Teak display stand with a glass-less plinth.
  box(g, 1, b - 7, 14, 2, 3, TEAK)
  g.rect(2, b - 2, 12, 2, TEAK.dark)
  const base = b - 7
  // Stepped base.
  g.rect(3, base - 3, 10, 3, c.bodyD)
  g.hline(3, 12, base - 3, c.hi)
  g.rect(4, base - 5, 8, 2, c.body)
  if (c.shape === 'lotus') {
    // Square that with a lotus-bud top.
    g.rect(5, base - 17, 6, 12, c.body)
    g.vline(10, base - 17, base - 6, c.bodyD)
    g.vline(5, base - 17, base - 6, c.hi)
    for (const y of [base - 9, base - 13]) g.hline(5, 10, y, c.top)
    g.poly(
      [
        [5, base - 17],
        [8, base - 26],
        [11, base - 17],
      ],
      c.top,
    )
    g.px(7, base - 22, GOLD.light)
  } else {
    const rx = c.shape === 'wide' ? 6 : 4.5
    g.ellipse(8, base - 9, rx, 5, c.body)
    g.ellipse(9.5, base - 8.5, rx * 0.5, 4, c.bodyD)
    g.ellipse(6.5, base - 10, rx * 0.35, 3, c.hi)
    // Throne and the tapering spire.
    g.rect(6, base - 15, 4, 2, c.bodyD)
    g.poly(
      [
        [6, base - 15],
        [8, base - 28],
        [10, base - 15],
      ],
      c.top,
    )
    for (let y = base - 24; y < base - 15; y += 2) g.px(8, y, GOLD.light)
  }
  g.px(8, base - 29, '#fffaf0')
  if (c.umbrellas) {
    // Four-cornered golden umbrellas (ฉัตร), tiers widening downwards.
    for (const x of [1, 14]) {
      g.vline(x, base - 15, base - 4, GOLD.dark)
      for (let k = 0; k < 3; k++) g.hline(x - 1 - (k >> 1), x + 1 + (k >> 1), base - 14 + k * 3, GOLD.base)
    }
  }
}

for (const [id, spec] of Object.entries(CHEDI)) {
  ROOM_ART[id] = {
    up: 30,
    draw(g, a) {
      drawChedi(g, a.b, spec)
    },
  }
  ROOM_FX[id] = (g, x, y, _flip, t, _st, emissive) => {
    if (emissive) return
    // A slow sparkle running up the spire.
    const ph = (t * 0.4 + x * 0.01) % 1
    if (ph < 0.5) g.px(x + 8, y - 8 - Math.round(ph * 36), '#ffffff')
  }
}

// ---------------------------------------------------------------------------
// Wallpapers (x, y, w, h = the whole back wall; baseboard is drawn after)

type SurfaceDraw = (g: Surface, x: number, y: number, w: number, h: number) => void

export const ROOM_WALLPAPER: Record<string, SurfaceDraw> = {
  wp_rotnam(g, x, y, w, h) {
    // Gold-on-black lacquer (ลายรดน้ำ): lattice of kanok florets and borders.
    g.rect(x, y, w, h, '#2a1a22')
    for (let yy = 12; yy < h - 10; yy += 12)
      for (let xx = ((yy / 12) % 2) * 8 + 4; xx < w; xx += 16) {
        const px = x + xx
        const py = y + yy
        g.px(px, py - 3, '#e9b23a')
        g.hline(px - 1, px + 1, py - 2, '#e9b23a')
        g.hline(px - 2, px + 2, py - 1, '#c8902a')
        g.px(px - 3, py, '#c8902a')
        g.px(px + 3, py, '#c8902a')
        g.hline(px - 1, px + 1, py, '#ffd54f')
        g.px(px, py + 1, '#e9b23a')
        g.px(px - 2, py + 2, '#8a5a22')
        g.px(px + 2, py + 2, '#8a5a22')
      }
    for (const by of [y + 2, y + h - 12]) {
      g.rect(x, by, w, 5, '#3e2430')
      g.hline(x, x + w - 1, by, '#e9b23a')
      g.hline(x, x + w - 1, by + 4, '#c8902a')
      for (let xx = 2; xx < w; xx += 6) {
        g.px(x + xx, by + 2, '#ffd54f')
        g.px(x + xx + 1, by + 1, '#e9b23a')
        g.px(x + xx + 1, by + 3, '#e9b23a')
      }
    }
  },
  wp_tile(g, x, y, w, h) {
    // White subway tiles, a mint band and mint tiles below it.
    const band = y + Math.round(h * 0.55)
    g.rect(x, y, w, h, '#f6f8f6')
    for (let yy = 0; yy < h; yy += 5) {
      const row = y + yy
      const mint = row >= band + 3
      if (mint) g.rect(x, row, w, 5, '#c8f0dd')
      g.hline(x, x + w - 1, row, mint ? '#a8dcc4' : '#dfe6e2')
      for (let xx = (yy / 5) % 2 ? 0 : 5; xx < w; xx += 10) g.vline(x + xx, row, row + 4, mint ? '#a8dcc4' : '#dfe6e2')
    }
    g.rect(x, band, w, 3, '#5fb48e')
    g.hline(x, x + w - 1, band, '#8fd4b0')
  },
  wp_riverhouse(g, x, y, w, h) {
    // ฝาปะกน in weathered red teak with a carved ventilation band at the top.
    g.rect(x, y, w, h, '#8e4a2e')
    for (let yy = 14; yy < h; yy += 22)
      for (let xx = 0; xx < w; xx += 20) {
        g.rect(x + xx + 1, y + yy + 1, 18, 20, '#7a3e26')
        g.rect(x + xx + 3, y + yy + 3, 14, 16, '#a2583a')
        g.hline(x + xx + 3, x + xx + 16, y + yy + 3, '#b86a48')
        g.vline(x + xx + 16, y + yy + 3, y + yy + 18, '#7a3e26')
        g.px(x + xx + 7, y + yy + 9, '#8e4a2e')
        g.px(x + xx + 12, y + yy + 14, '#8e4a2e')
      }
    // ช่องลม: lattice with little holes letting the river breeze in.
    g.rect(x, y, w, 13, '#6b3620')
    for (let xx = 2; xx < w; xx += 6) {
      g.rect(x + xx, y + 3, 3, 3, '#ffe8c0')
      g.rect(x + xx + 3, y + 7, 3, 3, '#ffe8c0')
      g.px(x + xx + 1, y + 4, '#fff6dc')
    }
    g.hline(x, x + w - 1, y + 12, '#b86a48')
  },
  wp_lanna(g, x, y, w, h) {
    // Dark teak boards with a red-and-gold star band (ลายดาวเพดาน).
    g.rect(x, y, w, h, '#5a3322')
    for (let xx = 0; xx < w; xx += 8) {
      g.vline(x + xx, y, y + h - 1, '#4a2818')
      g.vline(x + xx + 1, y, y + h - 1, '#6a3d28')
    }
    const by = y + 16
    g.rect(x, by, w, 12, '#9a2a2a')
    g.hline(x, x + w - 1, by, GOLD.base)
    g.hline(x, x + w - 1, by + 11, GOLD.base)
    for (let xx = 6; xx < w; xx += 12) {
      const cx = x + xx
      const cy = by + 6
      g.px(cx, cy - 3, GOLD.base)
      g.px(cx, cy + 3, GOLD.base)
      g.px(cx - 3, cy, GOLD.base)
      g.px(cx + 3, cy, GOLD.base)
      g.hline(cx - 1, cx + 1, cy, GOLD.light)
      g.vline(cx, cy - 1, cy + 1, GOLD.light)
      for (const [dx, dy] of [
        [-2, -2],
        [2, 2],
        [2, -2],
        [-2, 2],
      ])
        g.px(cx + dx, cy + dy, GOLD.dark)
    }
    // Stencilled gold motifs (ลายคำ) lower down.
    for (let yy = 40; yy < h - 8; yy += 16)
      for (let xx = ((yy / 16) % 2) * 12 + 6; xx < w; xx += 24) {
        g.px(x + xx, y + yy, '#b8843a')
        g.hline(x + xx - 1, x + xx + 1, y + yy + 1, '#b8843a')
        g.px(x + xx, y + yy + 2, '#8a5a2a')
      }
  },
  wp_khattae(g, x, y, w, h) {
    // Woven bamboo (ฝาขัดแตะ): over-under strips with wooden rails.
    for (let yy = 0; yy < h; yy += 4)
      for (let xx = 0; xx < w; xx += 4) {
        const alt = ((xx >> 2) + (yy >> 2)) % 2 === 0
        g.rect(x + xx, y + yy, 4, 4, alt ? '#e8cf8f' : '#d4b670')
        if (alt) g.hline(x + xx, x + xx + 3, y + yy + 1, '#f4e2a8')
        else g.vline(x + xx + 1, y + yy, y + yy + 3, '#bf9c58')
      }
    for (const ry of [y + 24, y + h - 20]) {
      g.rect(x, ry, w, 3, TEAK.mid)
      g.hline(x, x + w - 1, ry, TEAK.hi)
      g.hline(x, x + w - 1, ry + 2, TEAK.dark)
    }
  },
  wp_sino(g, x, y, w, h) {
    // Pastel plaster, white cornice and a Peranakan tile dado.
    g.rect(x, y, w, h, '#f6e2a0')
    for (let yy = 8; yy < h - 24; yy += 6) for (let xx = yy % 12 ? 3 : 0; xx < w; xx += 9) g.px(x + xx, y + yy, '#eed28a')
    g.rect(x, y, w, 7, '#fffaf0')
    g.hline(x, x + w - 1, y + 5, '#e8dcc8')
    for (let xx = 2; xx < w; xx += 5) g.px(x + xx, y + 6, '#d8c8b0')
    const ty = y + h - 22
    g.rect(x, ty - 2, w, 2, '#fffaf0')
    for (let xx = 0; xx < w; xx += 10) {
      const alt = (xx / 10) % 2 === 0
      g.rect(x + xx, ty, 10, 10, alt ? '#fdf6e6' : '#e8f4f0')
      g.frame(x + xx, ty, 10, 10, '#5fb4a8')
      const c = alt ? '#e8514a' : '#3a78c0'
      g.px(x + xx + 5, ty + 2, c)
      g.hline(x + xx + 3, x + xx + 7, ty + 5, c)
      g.px(x + xx + 5, ty + 8, c)
      g.vline(x + xx + 5, ty + 3, ty + 7, alt ? '#43905a' : '#ffd23f')
      g.px(x + xx + 1, ty + 1, '#ffd23f')
      g.px(x + xx + 8, ty + 8, '#ffd23f')
    }
  },
  wp_loft(g, x, y, w, h) {
    // Polished concrete with form-tie holes and a warm LED cove.
    g.rect(x, y, w, h, '#bdbab4')
    const r = new Rng(41)
    for (let i = 0; i < (w * h) / 14; i++) g.px(x + r.int(0, w - 1), y + r.int(0, h - 1), r.chance(0.5) ? '#b2afa8' : '#c8c5bf')
    for (let yy = 16; yy < h; yy += 28) {
      g.hline(x, x + w - 1, y + yy + 12, '#aeaba4')
      for (let xx = 12; xx < w; xx += 32) {
        g.px(x + xx, y + yy, '#8f8c86')
        g.px(x + xx + 16, y + yy + 14, '#8f8c86')
      }
    }
    for (let xx = 0; xx < w; xx += 48) g.vline(x + xx, y, y + h - 1, '#aeaba4')
    g.rect(x, y, w, 3, '#6d6a66')
    g.hline(x, x + w - 1, y + 3, '#fff6dc')
    g.alpha(0.35)
    g.rect(x, y + 4, w, 3, '#fff0c8')
    g.alpha(1)
  },
  wp_orchard(g, x, y, w, h) {
    // Green-painted clapboards (ตีเกล็ด).
    for (let yy = 0; yy < h; yy += 6) {
      g.rect(x, y + yy, w, 6, '#8fbf8a')
      g.hline(x, x + w - 1, y + yy, '#a8d4a0')
      g.hline(x, x + w - 1, y + yy + 5, '#6e9e6a')
    }
    const r = new Rng(9)
    for (let i = 0; i < w / 3; i++) g.px(x + r.int(0, w - 1), y + r.int(0, h - 1), '#b8dcb0')
    g.rect(x, y, w, 3, '#5a7a4a')
  },
  wp_raft(g, x, y, w, h) {
    // Nipa-palm thatch panels (ฝาจาก) in bamboo frames with rope lashings.
    g.rect(x, y, w, h, '#a8964e')
    for (let yy = 0; yy < h; yy += 5)
      for (let xx = 0; xx < w; xx += 3) {
        const c = (xx * 7 + yy * 3) % 4 === 0 ? '#9a8a4a' : (xx + yy) % 3 === 0 ? '#b8a45a' : '#a8964e'
        g.line(x + xx, y + yy + 4, x + xx + 2, y + yy, c)
      }
    for (let xx = 0; xx < w; xx += 32) {
      g.rect(x + xx, y, 3, h, BAMBOO.mid)
      g.vline(x + xx, y, y + h - 1, BAMBOO.hi)
      for (let yy = 10; yy < h; yy += 22) g.px(x + xx + 1, y + yy, BAMBOO.deep)
    }
    for (const ry of [y + 18, y + h - 16]) {
      g.rect(x, ry, w, 2, BAMBOO.top)
      g.hline(x, x + w - 1, ry + 1, BAMBOO.dark)
      for (let xx = 0; xx < w; xx += 32) {
        g.px(x + xx + 1, ry - 1, '#e6cc7c')
        g.px(x + xx + 2, ry + 2, '#e6cc7c')
      }
    }
  },
}

/** Wallpapers that want the dark teak skirting board. */
export const DARK_BASEBOARD = new Set(['wp_rotnam', 'wp_riverhouse', 'wp_lanna', 'wp_khattae', 'wp_raft', 'wp_orchard'])

// ---------------------------------------------------------------------------
// Floors

export const ROOM_FLOOR: Record<string, SurfaceDraw> = {
  fl_checker(g, x, y, w, h) {
    for (let by = 0; by < h; by += 6)
      for (let bx = 0; bx < w; bx += 8) {
        const alt = ((bx >> 3) + by / 6) % 2 === 0
        g.rect(x + bx, y + by, 8, 6, alt ? '#fbfbf6' : '#9fdcc4')
        g.hline(x + bx, x + bx + 7, y + by, alt ? '#ffffff' : '#b8e8d4')
      }
  },
  fl_chan(g, x, y, w, h) {
    // Wide teak planks with gaps glinting with the river below.
    const r = new Rng(17)
    for (let py = 0; py < h; py += 8) {
      const tone = ['#c4814a', '#b8743f', '#cc8c54'][(py / 8) % 3]
      g.rect(x, y + py, w, 7, tone)
      g.hline(x, x + w - 1, y + py, mix(tone, '#fff0d0', 0.25))
      g.hline(x, x + w - 1, y + py + 7, '#5a3a2a')
      for (let k = 0; k < 5; k++) {
        const gx = r.int(0, w - 8)
        g.hline(x + gx, x + gx + r.int(3, 7), y + py + r.int(2, 5), mix(tone, '#7a4a2a', 0.35))
      }
      for (let k = 0; k < 3; k++) g.px(x + r.int(0, w - 1), y + py + 7, '#78c8e0')
    }
  },
  fl_lanna(g, x, y, w, h) {
    const r = new Rng(23)
    for (let py = 0; py < h; py += 6) {
      let px = -r.int(0, 30)
      while (px < w) {
        const len = r.int(30, 50)
        const c = r.pick(['#6a3d28', '#744430', '#5e3522'])
        const x0 = Math.max(0, px)
        g.rect(x + x0, y + py, Math.min(w, px + len) - x0, 6, c)
        g.hline(x + x0, x + Math.min(w, px + len) - 1, y + py, '#8a5638')
        if (px + len < w) g.vline(x + px + len - 1, y + py, y + py + 5, '#3e2216')
        px += len
      }
      g.hline(x, x + w - 1, y + py + 5, '#4a2818')
      // Polished shine.
      g.alpha(0.2)
      g.hline(x + ((py * 13) % w), x + ((py * 13) % w) + 12, y + py + 2, '#ffe0b0')
      g.alpha(1)
    }
  },
  fl_earth(g, x, y, w, h) {
    g.rect(x, y, w, h, '#b88a5a')
    const r = new Rng(31)
    for (let i = 0; i < (w * h) / 10; i++) g.px(x + r.int(0, w - 1), y + r.int(0, h - 1), r.pick(['#a87a4e', '#c89a68', '#9a6e46']))
    for (let i = 0; i < w / 5; i++) {
      const sx = x + r.int(0, w - 5)
      const sy = y + r.int(0, h - 1)
      g.line(sx, sy, sx + r.int(2, 4), sy + r.int(-1, 1), '#e6cc7c')
    }
    for (let i = 0; i < w / 12; i++) {
      const sx = x + r.int(0, w - 2)
      const sy = y + r.int(1, h - 2)
      g.rect(sx, sy, 2, 1, '#8c8187')
      g.px(sx, sy - 1, '#bdb2ae')
    }
  },
  fl_peranakan(g, x, y, w, h) {
    // 16×12 encaustic tiles: cream ground, quarter-circle corners and a centre flower.
    for (let by = 0; by < h; by += 12)
      for (let bx = 0; bx < w; bx += 16) {
        const alt = (bx / 16 + by / 12) % 2 === 0
        const X = x + bx
        const Y = y + by
        g.rect(X, Y, 16, 12, '#fbf1dc')
        const corner = alt ? '#7cc4b4' : '#f0a890'
        for (const [cx, cy] of [
          [X, Y],
          [X + 15, Y],
          [X, Y + 11],
          [X + 15, Y + 11],
        ]) {
          g.rect(cx - (cx > X ? 2 : 0), cy - (cy > Y ? 2 : 0), 3, 3, corner)
        }
        const c = alt ? '#e8705a' : '#3a9a8a'
        g.px(X + 8, Y + 4, c)
        g.px(X + 7, Y + 5, c)
        g.px(X + 9, Y + 5, c)
        g.px(X + 8, Y + 6, c)
        g.px(X + 8, Y + 5, '#ffd23f')
        g.hline(X, X + 15, Y, '#e8dcc4')
        g.vline(X, Y, Y + 11, '#e8dcc4')
      }
  },
  fl_marble(g, x, y, w, h) {
    g.rect(x, y, w, h, '#f2f0ec')
    const r = new Rng(5)
    for (let i = 0; i < 18; i++) {
      let vx = x + r.int(0, w - 1)
      let vy = y + r.int(0, h - 1)
      for (let k = 0; k < 14; k++) {
        if (vy >= y && vy < y + h) g.px(vx, vy, r.chance(0.5) ? '#e2dfda' : '#d8d4ce')
        vx += r.int(0, 2)
        vy += r.int(-1, 1)
      }
    }
    for (let xx = 0; xx < w; xx += 32) g.vline(x + xx, y, y + h - 1, '#e2ded8')
    for (let yy = 0; yy < h; yy += 24) g.hline(x, x + w - 1, y + yy, '#e2ded8')
    g.alpha(0.3)
    for (let yy = 4; yy < h; yy += 24) for (let xx = 6; xx < w; xx += 32) g.hline(x + xx, x + xx + 14, y + yy, '#ffffff')
    g.alpha(1)
  },
  fl_redtile(g, x, y, w, h) {
    const r = new Rng(13)
    for (let by = 0; by < h; by += 12)
      for (let bx = 0; bx < w; bx += 12) {
        const c = r.pick(['#d27a4a', '#c86e42', '#dc8654'])
        g.rect(x + bx, y + by, 12, 12, c)
        g.hline(x + bx, x + bx + 11, y + by, mix(c, '#ffe0c0', 0.3))
        g.hline(x + bx, x + bx + 11, y + by + 11, '#9a4a2a')
        g.vline(x + bx + 11, y + by, y + by + 11, '#9a4a2a')
        g.px(x + bx + r.int(2, 9), y + by + r.int(2, 9), mix(c, '#7a3a22', 0.3))
      }
  },
  fl_bamboo(g, x, y, w, h) {
    for (let py = 0; py < h; py += 4) {
      g.rect(x, y + py, w, 3, (py / 4) % 2 ? '#dcc07c' : '#e6cc88')
      g.hline(x, x + w - 1, y + py, '#f2dca4')
      g.hline(x, x + w - 1, y + py + 3, (py / 4) % 5 === 2 ? '#6ab4d0' : '#9a7a40')
      for (let xx = ((py * 7) % 23) + 4; xx < w; xx += 23) g.vline(x + xx, y + py, y + py + 2, '#b89a58')
    }
  },
}

// ---------------------------------------------------------------------------
// Architecture drawn over the wall of each regional room (stays when the
// player changes the wallpaper): beams, posts, cornices.

export function drawRoomTrim(g: Surface, room: RoomId, w: number, wallH: number) {
  const post = (x: number, p: Wood, pw = 5) => {
    g.rect(x, 0, pw, wallH, p.mid)
    g.vline(x, 0, wallH - 1, p.hi)
    g.vline(x + pw - 1, 0, wallH - 1, p.dark)
  }
  switch (room) {
    case 'central':
      g.rect(0, 0, w, 4, TEAK.dark)
      g.hline(0, w - 1, 3, TEAK.mid)
      post(0, TEAK)
      post(w - 5, TEAK)
      break
    case 'north':
      g.rect(0, 0, w, 5, DARK_TEAK.dark)
      g.hline(0, w - 1, 4, DARK_TEAK.hi)
      // Hanging fringe of little red/gold triangles.
      for (let x = 2; x < w; x += 6)
        g.poly(
          [
            [x, 5],
            [x + 4, 5],
            [x + 2, 8],
          ],
          (x - 2) % 12 ? GOLD.base : '#c8423f',
        )
      post(0, DARK_TEAK)
      post(w - 5, DARK_TEAK)
      break
    case 'isan':
      // Underside of the house above: heavy beams and joists (ใต้ถุน).
      g.rect(0, 0, w, 7, TEAK.deep)
      for (let x = 4; x < w; x += 12) {
        g.rect(x, 0, 4, 7, TEAK.dark)
        g.hline(x, x + 3, 6, TEAK.mid)
      }
      g.hline(0, w - 1, 7, '#4a2818')
      post(0, TEAK, 6)
      post(w - 6, TEAK, 6)
      break
    case 'south':
      g.rect(0, 0, 4, wallH, '#fffaf0')
      g.rect(w - 4, 0, 4, wallH, '#fffaf0')
      g.vline(3, 0, wallH - 1, '#e8dcc8')
      g.vline(w - 4, 0, wallH - 1, '#e8dcc8')
      break
    case 'east':
      g.rect(0, 0, w, 4, '#5a7a4a')
      g.hline(0, w - 1, 3, '#7a9a64')
      post(0, TEAK, 4)
      post(w - 4, TEAK, 4)
      break
    case 'west':
      g.rect(0, 0, w, 4, BAMBOO.mid)
      g.hline(0, w - 1, 0, BAMBOO.hi)
      g.hline(0, w - 1, 3, BAMBOO.dark)
      for (let x = 10; x < w; x += 32) {
        g.px(x, 1, '#8a6a34')
        g.px(x + 1, 2, '#8a6a34')
      }
      post(0, BAMBOO, 4)
      post(w - 4, BAMBOO, 4)
      break
    default:
      break
  }
}

/** Look of the house outside the cut-away frame. */
export interface Backdrop {
  base: Color
  line: Color
  cut: Color
  cutL: Color
  sill: Color
  pattern: 'planks' | 'thatch' | 'plaster'
  /** River water along the bottom (the raft house). */
  water?: boolean
}

export function roomBackdrop(room: RoomId, night: boolean): Backdrop | null {
  const n = (day: Color, dark: Color) => (night ? dark : day)
  switch (room) {
    case 'central':
    case 'north':
    case 'east':
      return {
        base: n(room === 'east' ? '#b8cfa8' : room === 'north' ? '#8a5a3a' : '#d8b48a', '#3a3050'),
        line: n(room === 'east' ? '#a0bc90' : room === 'north' ? '#74482e' : '#c49c72', '#322a48'),
        cut: n(room === 'north' ? '#6a3d28' : '#9a6a45', '#4a3a58'),
        cutL: n(room === 'north' ? '#8a5638' : '#c28e5c', '#5a4a6a'),
        sill: n('#6e4a35', '#3a3050'),
        pattern: 'planks',
      }
    case 'isan':
      return { base: n('#e4c890', '#3a3450'), line: n('#d0b078', '#302a46'), cut: n('#9a6a45', '#4a3a58'), cutL: n('#c28e5c', '#5a4a6a'), sill: n('#b88a5a', '#3a3050'), pattern: 'thatch' }
    case 'west':
      return { base: n('#d8c890', '#34344e'), line: n('#c4b070', '#2e2e46'), cut: n('#b08e48', '#4a4460'), cutL: n('#e6cc7c', '#5a5470'), sill: n('#5aa8c8', '#2a3a68'), pattern: 'thatch', water: true }
    case 'south':
      return { base: n('#f4d890', '#3c3658'), line: n('#e8c878', '#34304e'), cut: n('#fffaf0', '#5a5478'), cutL: n('#ffffff', '#6a6488'), sill: n('#e8c878', '#34304e'), pattern: 'plaster' }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Window views: what each room sees outside (drawn inside the glass rect)

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const SKY: Record<Phase, string[]> = {
  dawn: ['#8a86c8', '#c98fc0', '#ffb7a8', '#ffe0b0'],
  day: ['#78c4ff', '#a0d8ff', '#c8ecff', '#e6f7ff'],
  golden: ['#7aa0e0', '#c9a4d8', '#ffc08a', '#ffe2a0'],
  dusk: ['#3c3a78', '#7a5a9e', '#d97a98', '#ffa47e'],
  night: ['#12143a', '#1f2358', '#2e3a78', '#3e4c8c'],
}

const isNight = (p: Phase) => p === 'night' || p === 'dusk'

/** Tint a daytime colour for the time of day. */
function tone(c: Color, p: Phase): Color {
  switch (p) {
    case 'night':
      return mix(c, '#1a1d45', 0.64)
    case 'dusk':
      return mix(c, '#4b416e', 0.42)
    case 'golden':
      return mix(c, '#ffb070', 0.18)
    case 'dawn':
      return mix(c, '#c8a0c8', 0.22)
    default:
      return c
  }
}

/** Glass rect of a window of `frame` style whose footprint is `win`. */
export function viewRect(frame: WindowFrame, win: Rect): Rect {
  switch (frame) {
    case 'black':
      return { x: win.x + 2, y: win.y + 2, w: win.w - 4, h: win.h - 4 }
    case 'kitchen':
      return { x: win.x + 8, y: win.y + 12, w: win.w - 16, h: 38 }
    case 'shutter':
    case 'lanna':
      return { x: win.x + 12, y: win.y + 16, w: win.w - 24, h: 42 }
    case 'bamboo':
      return { x: win.x + 6, y: win.y + 12, w: win.w - 12, h: 46 }
    case 'arch':
      return { x: win.x + 13, y: win.y + 10, w: win.w - 26, h: 50 }
    default:
      return { x: win.x + 3, y: win.y + 3, w: win.w - 6, h: win.h - 5 }
  }
}

function clipRect(g: Surface, r: Rect, arch = false) {
  g.ctx.save()
  g.ctx.beginPath()
  if (arch) {
    const rad = r.w / 2
    g.ctx.moveTo(r.x - g.ox, r.y + r.h - g.oy)
    g.ctx.lineTo(r.x - g.ox, r.y + rad - g.oy)
    g.ctx.arc(r.x + rad - g.ox, r.y + rad - g.oy, rad, Math.PI, 0)
    g.ctx.lineTo(r.x + r.w - g.ox, r.y + r.h - g.oy)
    g.ctx.closePath()
  } else g.ctx.rect(r.x - g.ox, r.y - g.oy, r.w, r.h)
  g.ctx.clip()
}

function drawSky(g: Surface, r: Rect, p: Phase, t: number) {
  const sky = SKY[p]
  g.gradientV(r.x, r.y, r.w, r.h, sky, 4)
  if (isNight(p)) {
    for (let i = 0; i < 10; i++) {
      const sx = r.x + ((i * 23 + 7) % r.w)
      const sy = r.y + ((i * 17 + 3) % Math.max(4, Math.round(r.h * 0.4)))
      if (Math.sin(t * 1.5 + i * 2.1) > -0.3) g.px(sx, sy, i % 4 === 0 ? '#fff3a6' : '#e2e8ff')
    }
    g.circle(r.x + r.w - 10, r.y + 8, 3.5, '#fff6c8')
    g.circle(r.x + r.w - 8.5, r.y + 7, 3, sky[0])
  } else if (p === 'day') {
    g.ditherCircle(r.x + 9, r.y + 8, 7, '#fffbe0', 0.5)
    g.circle(r.x + 9, r.y + 8, 3, '#fffbe0')
  } else {
    const sx = p === 'dawn' ? r.x + 8 : r.x + r.w - 10
    g.ditherCircle(sx, r.y + r.h * 0.45, 8, '#fff0b8', 0.6)
    g.circle(sx, r.y + r.h * 0.45, 3.5, '#fff3c4')
  }
  const cloud = isNight(p) ? '#46508a' : p === 'golden' ? '#ffe6c4' : p === 'dawn' ? '#ffd6dc' : '#ffffff'
  const span = r.w + 30
  for (let i = 0; i < 2; i++) {
    const cx = r.x - 15 + ((((i * 41 + t * (1.2 + i)) % span) + span) % span)
    const cy = r.y + 8 + i * 8
    g.ellipse(cx, cy, 6 + i * 2, 2, cloud)
    g.ellipse(cx - 4, cy + 1, 3.5, 1.5, cloud)
  }
}

function hills(g: Surface, r: Rect, baseY: number, amp: number, freq: number, seed: number, c: Color) {
  for (let x = 0; x < r.w; x++) {
    const h = Math.sin((x + seed) * freq) * amp * 0.6 + Math.sin((x + seed * 3) * freq * 2.3) * amp * 0.4 + amp
    g.vline(r.x + x, Math.round(baseY - h), r.y + r.h - 1, c)
  }
}

function tree(g: Surface, x: number, y: number, rr: number, p: Phase, dark = false) {
  const c = tone(dark ? '#2f7a47' : '#48a052', p)
  g.vline(x, y, y + rr + 3, tone('#6e4a35', p))
  g.ellipse(x, y, rr, rr * 0.8, c)
  g.ellipse(x - rr * 0.3, y - rr * 0.3, rr * 0.5, rr * 0.4, tone(dark ? '#43905a' : '#6cbf5c', p))
}

type ViewDraw = (g: Surface, r: Rect, p: Phase, t: number) => void

const VIEWS: Partial<Record<WindowView, ViewDraw>> = {
  garden(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    // Neighbour's pastel house with a tiled roof edge.
    g.rect(r.x, b - 18, r.w, 18, tone('#f4d8c0', p))
    g.rect(r.x, b - 20, r.w, 3, tone('#c8604a', p))
    for (let x = r.x; x < r.x + r.w; x += 4) g.px(x, b - 18, tone('#a84a3a', p))
    g.rect(r.x + r.w - 16, b - 14, 7, 8, tone('#9fc4ee', p))
    g.frame(r.x + r.w - 16, b - 14, 7, 8, tone('#fffaf0', p))
    // Mango tree with ripe mangoes.
    tree(g, r.x + 9, b - 22, 9, p)
    for (const [dx, dy] of [
      [-4, -18],
      [2, -20],
      [5, -16],
      [-1, -15],
    ])
      g.rect(r.x + 9 + dx, b + dy, 2, 2, tone('#ffd23f', p))
    // Bougainvillea over the fence.
    for (let i = 0; i < 12; i++) g.px(r.x + 16 + ((i * 7) % 20), b - 6 - ((i * 5) % 4), tone(i % 2 ? '#ff6fb0' : '#e8409a', p))
    g.rect(r.x, b - 4, r.w, 4, tone('#e8e2d8', p))
    g.hline(r.x, r.x + r.w - 1, b - 4, tone('#ffffff', p))
    // Electric pole and the famous tangle of cables.
    const px = r.x + r.w - 7
    g.rect(px, r.y + 4, 2, r.h - 8, tone('#9aa3ae', p))
    g.hline(px - 4, px + 5, r.y + 8, tone('#6d7582', p))
    const wire = tone('#2a2830', p)
    for (let k = 0; k < 4; k++) {
      for (let x = r.x; x < px; x++) {
        const u = (x - r.x) / (px - r.x)
        const sag = Math.round(Math.sin(u * Math.PI) * (4 + k * 2))
        g.px(x, r.y + 8 + k + sag, wire)
      }
    }
    g.ellipse(px - 6, r.y + 14, 3, 2, wire)
    g.ellipse(px - 6, r.y + 14, 1.5, 1, tone('#6d7582', p))
  },

  river(g, r, p, t) {
    drawSky(g, r, p, t)
    const hz = r.y + Math.round(r.h * 0.52)
    // Far bank: trees and a prang silhouette.
    for (let x = r.x; x < r.x + r.w; x += 5) g.ellipse(x + 2, hz - 2 - ((x * 7) % 3), 4, 3, tone('#3f7a52', p))
    const pr = r.x + Math.round(r.w * 0.66)
    const prang = tone('#e8d8c0', p)
    g.poly(
      [
        [pr - 5, hz - 1],
        [pr - 3, hz - 14],
        [pr - 1, hz - 22],
        [pr, hz - 26],
        [pr + 1, hz - 22],
        [pr + 3, hz - 14],
        [pr + 5, hz - 1],
      ],
      prang,
    )
    for (const y of [hz - 6, hz - 11, hz - 16]) g.hline(pr - 4 + (hz - y) / 8, pr + 4 - (hz - y) / 8, y, tone('#c8b098', p))
    g.px(pr, hz - 27, tone('#fff3a6', p))
    // Water.
    g.gradientV(r.x, hz, r.w, r.y + r.h - hz, [tone('#7ab8c8', p), tone('#5a98a8', p), tone('#4a8090', p)], 3)
    for (let k = 0; k < 6; k++) {
      const wy = hz + 3 + k * 4
      const off = Math.round((t * (6 + k) + k * 13) % 12)
      for (let x = r.x - 12 + off; x < r.x + r.w; x += 12) g.hline(x, x + 3, wy, tone('#a8dce8', p))
    }
    // Water hyacinth drifting.
    for (let i = 0; i < 3; i++) {
      const hx = r.x + ((((i * 17 + t * 2) % (r.w + 10)) + r.w + 10) % (r.w + 10)) - 5
      g.ellipse(hx, hz + 8 + i * 6, 2, 1, tone('#48a052', p))
      g.px(hx, hz + 7 + i * 6, tone('#c8a0f0', p))
    }
    // A long-tail boat crossing every so often.
    const per = 18
    const ph = (t % per) / per
    if (ph < 0.7) {
      const bx = r.x + r.w + 10 - ph * (r.w + 40)
      const by = hz + 12
      g.poly(
        [
          [bx - 12, by],
          [bx + 10, by],
          [bx + 13, by - 3],
          [bx - 14, by - 2],
        ],
        tone('#8a4a2a', p),
      )
      g.hline(bx - 12, bx + 12, by - 2, tone('#e8514a', p))
      g.line(bx + 10, by - 3, bx + 18, by + 2, tone('#3a3a46', p))
      g.rect(bx + 6, by - 7, 2, 4, tone('#5a8de0', p))
      g.rect(bx + 5, by - 9, 4, 2, tone('#e6cc7c', p))
      for (let k = 0; k < 3; k++) g.px(bx + 19 + k * 2, by + 1 + (k % 2), tone('#ffffff', p))
    }
  },

  mountain(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    hills(g, r, b - 22, 8, 0.12, 3, tone('#9ab8d8', p))
    hills(g, r, b - 14, 10, 0.09, 11, tone('#5a8a8a', p))
    // Golden chedi on the ridge (ดอยสุเทพ).
    const cx = r.x + Math.round(r.w * 0.58)
    const top = b - 14 - 19
    g.rect(cx - 2, top + 3, 5, 3, tone(GOLD.dark, p))
    g.poly(
      [
        [cx - 2, top + 4],
        [cx + 0.5, top - 4],
        [cx + 3, top + 4],
      ],
      tone(GOLD.base, p),
    )
    g.px(cx, top - 5, tone(GOLD.light, p))
    // Mist drifting across the mountains.
    g.alpha(isNight(p) ? 0.25 : 0.55)
    for (let k = 0; k < 3; k++) {
      const my = b - 16 + k * 5
      const off = ((t * (2 + k)) % 40) - 20
      g.rect(r.x + off, my, r.w * 0.7, 2, '#ffffff')
      g.rect(r.x + off + r.w * 0.5, my + 2, r.w * 0.6, 1, '#ffffff')
    }
    g.alpha(1)
    hills(g, r, b - 4, 5, 0.2, 5, tone('#3f7a52', p))
    // Pines in front.
    for (const px of [r.x + 5, r.x + r.w - 7]) {
      const pc = tone('#2f6f4b', p)
      for (let k = 0; k < 4; k++) g.hline(px - k, px + k, b - 14 + k * 2, pc)
      g.vline(px, b - 6, b - 1, tone('#6e4a35', p))
    }
  },

  field(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    const hz = r.y + Math.round(r.h * 0.42)
    hills(g, r, hz, 3, 0.1, 7, tone('#8ab0a0', p))
    // Paddy bands with dikes.
    const greens = ['#9bd66e', '#86c95f', '#b4e486', '#6cbf5c']
    let y = hz
    let i = 0
    while (y < b) {
      const hh = 3 + i
      g.rect(r.x, y, r.w, hh, tone(greens[i % 4], p))
      g.hline(r.x, r.x + r.w - 1, y, tone('#d9b27a', p))
      for (let x = r.x + ((i * 5) % 4); x < r.x + r.w; x += 4) g.px(x, y + 1 + (i % 2), tone('#48a052', p))
      y += hh
      i++
    }
    // Field hut (เถียงนา) on stilts.
    const hx = r.x + 6
    g.poly(
      [
        [hx - 5, hz + 2],
        [hx, hz - 3],
        [hx + 5, hz + 2],
      ],
      tone('#b08e48', p),
    )
    g.rect(hx - 3, hz + 2, 6, 3, tone('#8a6a34', p))
    for (const lx of [hx - 3, hx + 2]) g.vline(lx, hz + 5, hz + 8, tone('#6e4a35', p))
    // Sugar palms (ต้นตาล).
    for (const [tx, th] of [
      [r.x + r.w - 10, 26],
      [r.x + r.w - 20, 20],
    ] as [number, number][]) {
      const ty = hz + 6 - th
      g.vline(tx, ty, hz + 6, tone('#6e4a35', p))
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2
        g.line(tx, ty, Math.round(tx + Math.cos(ang) * 5), Math.round(ty + Math.sin(ang) * 3), tone('#43905a', p))
      }
      g.px(tx, ty, tone('#2f6f4b', p))
    }
    // The water buffalo, tail swishing.
    const bx = r.x + Math.round(r.w * 0.45)
    const by = b - 8
    const bc = tone('#5a5a6a', p)
    g.ellipse(bx, by, 6, 3, bc)
    g.rect(bx - 5, by + 1, 2, 4, bc)
    g.rect(bx + 3, by + 1, 2, 4, bc)
    g.ellipse(bx + 7, by - 1, 2.5, 2, bc)
    g.line(bx + 6, by - 3, bx + 4, by - 5, tone('#e2d8c8', p))
    g.line(bx + 8, by - 3, bx + 10, by - 5, tone('#e2d8c8', p))
    const sw = Math.sin(t * 3) > 0 ? 1 : 0
    g.line(bx - 6, by - 1, bx - 8, by + 2 + sw, bc)
    g.px(bx + 8, by - 1, tone('#fffaf0', p))
  },

  oldtown(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    // Two Sino-Portuguese shophouses across the street.
    const cols: [Color, Color][] = [
      ['#a8e0d0', '#80c4b0'],
      ['#ffc8d4', '#f0a0b4'],
    ]
    const fw = Math.ceil(r.w / 2)
    for (let k = 0; k < 2; k++) {
      const fx = r.x + k * fw
      const [c, cd] = cols[k]
      g.rect(fx, r.y + 12, fw, r.h - 12, tone(c, p))
      g.rect(fx, r.y + 12, fw, 3, tone('#fffaf0', p))
      g.vline(fx, r.y + 12, b - 1, tone(cd, p))
      // Upper arched window with shutters.
      const wx = fx + Math.round(fw / 2) - 4
      g.rect(wx, r.y + 20, 8, 10, tone('#3a4a5a', p))
      g.ellipse(wx + 4, r.y + 20, 4, 3, tone('#3a4a5a', p))
      g.frame(wx - 1, r.y + 20, 10, 11, tone('#fffaf0', p))
      g.rect(wx - 4, r.y + 20, 3, 10, tone('#3f9a7a', p))
      g.rect(wx + 9, r.y + 20, 3, 10, tone('#3f9a7a', p))
      // Five-foot-way arches at street level.
      g.rect(fx + 2, b - 16, fw - 4, 16, tone(cd, p))
      g.ellipse(fx + fw / 2, b - 16, fw / 2 - 2, 4, tone(cd, p))
      g.rect(fx + 4, b - 13, fw - 8, 13, tone('#6a4a3a', p))
      g.rect(fx + 5, b - 10, 3, 3, tone('#ffd98a', p))
    }
    // String of red lanterns swaying across.
    const ly = r.y + 16
    for (let x = r.x; x < r.x + r.w; x++) g.px(x, ly - 3 + Math.round(Math.sin((x - r.x) / r.w * Math.PI) * 2), tone('#3a2838', p))
    for (let k = 0; k < 4; k++) {
      const lx = r.x + 5 + k * Math.round((r.w - 10) / 3)
      const sw = Math.round(Math.sin(t * 1.4 + k) * 0.8)
      g.ellipse(lx + sw, ly + 1, 2.5, 3, tone('#e8413a', p))
      g.px(lx + sw, ly + 4, tone(GOLD.base, p))
    }
  },

  orchard(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    g.rect(r.x, b - 8, r.w, 8, tone('#86c95f', p))
    for (let x = r.x; x < r.x + r.w; x += 3) g.px(x, b - 8, tone('#b4e486', p))
    // Durian trees with fruit hanging off the branches.
    for (const [tx, s] of [
      [r.x + 8, 1],
      [r.x + r.w - 9, 1.2],
    ] as [number, number][]) {
      g.rect(tx - 1, b - 28, 3, 22, tone('#6e4a35', p))
      g.ellipse(tx, b - 32, 10 * s, 9, tone('#3f8a4a', p))
      g.ellipse(tx - 3, b - 35, 6 * s, 5, tone('#5aa85a', p))
      for (const [dx, dy] of [
        [-6, -24],
        [5, -26],
        [0, -22],
      ]) {
        g.vline(tx + dx, b + dy - 3, b + dy - 1, tone('#6e4a35', p))
        g.ellipse(tx + dx, b + dy + 1, 1.8, 2.2, tone('#8aa83a', p))
        g.px(tx + dx, b + dy + 1, tone('#5a7a2a', p))
      }
    }
    // A bamboo ladder leaning on the trunk.
    const lx = r.x + r.w - 16
    g.line(lx, b - 6, lx + 4, b - 26, tone(BAMBOO.mid, p))
    g.line(lx + 4, b - 6, lx + 8, b - 26, tone(BAMBOO.mid, p))
    for (let k = 1; k < 5; k++) g.hline(lx + k, lx + k + 4, b - 6 - k * 4, tone(BAMBOO.dark, p))
    // Mangosteen bush in front.
    g.ellipse(r.x + r.w / 2, b - 6, 6, 4, tone('#2f7a47', p))
    for (const dx of [-3, 0, 3]) g.px(r.x + r.w / 2 + dx, b - 7 + (dx % 2), tone('#5a2848', p))
  },

  kwai(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    const hz = r.y + Math.round(r.h * 0.6)
    // Limestone karsts.
    for (const [kx, kw, kh] of [
      [0.15, 10, 24],
      [0.42, 12, 30],
      [0.75, 11, 22],
      [0.95, 8, 16],
    ] as [number, number, number][]) {
      const cx = r.x + r.w * kx
      g.ellipse(cx, hz - kh / 2, kw, kh / 2 + 2, tone('#5a9a6a', p))
      g.rect(cx - kw * 0.4, hz - kh * 0.7, 3, kh * 0.5, tone('#b8b8a8', p))
      g.ellipse(cx - kw * 0.3, hz - kh * 0.85, kw * 0.4, 3, tone('#7ab87a', p))
    }
    // The iron truss bridge in the distance.
    const bgY = hz - 4
    g.hline(r.x, r.x + r.w - 1, bgY, tone('#3a3a46', p))
    for (let x = r.x; x < r.x + r.w; x += 10) {
      for (let k = 0; k <= 10; k++) g.px(x + k, bgY - Math.round(Math.sin((k / 10) * Math.PI) * 4), tone('#3a3a46', p))
      g.vline(x, bgY, hz, tone('#3a3a46', p))
    }
    // River.
    g.gradientV(r.x, hz, r.w, b - hz, [tone('#6ab0a0', p), tone('#4a9088', p)], 2)
    for (let k = 0; k < 4; k++) {
      const off = Math.round((t * (5 + k)) % 10)
      for (let x = r.x - 10 + off; x < r.x + r.w; x += 10) g.hline(x, x + 2, hz + 3 + k * 4, tone('#a8e0d0', p))
    }
    // Raft houses across the river.
    for (const rx of [r.x + 6, r.x + r.w - 14]) {
      g.rect(rx, hz - 1, 10, 3, tone('#b08e48', p))
      g.poly(
        [
          [rx - 1, hz - 1],
          [rx + 5, hz - 6],
          [rx + 11, hz - 1],
        ],
        tone('#9a8a4a', p),
      )
      g.rect(rx + 3, hz - 1, 3, 2, tone('#3a2838', p))
    }
  },

  bts(g, r, p, t) {
    drawSky(g, r, p, t)
    const b = r.y + r.h
    // Towers behind.
    const rr = new Rng('bts-view')
    let x = r.x - 2
    while (x < r.x + r.w) {
      const w = rr.int(8, 14)
      const h = rr.int(30, 60)
      const c = tone(rr.pick(['#c6d6e8', '#b3c5da', '#d8e0ea']), p)
      g.rect(x, b - h, w, h, c)
      for (let yy = b - h + 3; yy < b - 2; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) g.px(xx, yy, tone('#9fb3cc', p))
      x += w + rr.int(1, 3)
    }
    // Concrete viaduct right outside.
    const vy = r.y + Math.round(r.h * 0.6)
    const concrete = tone('#e0dcd6', p)
    for (let px = r.x + 10; px < r.x + r.w; px += 40) {
      g.rect(px, vy + 6, 6, b - vy - 6, tone('#bdb6ae', p))
      g.vline(px, vy + 6, b - 1, tone('#d0cac2', p))
    }
    // The train (every ~14 s), big and close.
    const per = 14
    const ph = (t % per) / per
    if (ph < 0.6) {
      const len = 110
      const tx = r.x + r.w + 8 - (ph / 0.6) * (r.w + len + 16)
      const ty = vy - 14
      const body = tone('#eef2f4', p)
      g.rect(tx, ty, len, 14, body)
      g.rect(tx - 3, ty + 2, 3, 11, body)
      g.hline(tx, tx + len - 1, ty, tone('#ffffff', p))
      g.rect(tx, ty + 10, len, 2, tone('#3fae5a', p))
      g.hline(tx, tx + len - 1, ty + 12, tone('#1f7a3a', p))
      for (let cx = tx + 2; cx < tx + len - 6; cx += 9) {
        g.rect(cx, ty + 3, 6, 5, tone('#5a8de0', p))
        // Commuters' heads.
        if ((cx - tx) % 18 === 2) g.circle(cx + 3, ty + 6, 1.4, tone('#3a2838', p))
      }
      for (let cx = tx + 36; cx < tx + len; cx += 37) g.vline(cx, ty + 1, ty + 12, tone('#9aa3ae', p))
    }
    g.rect(r.x, vy, r.w, 6, concrete)
    g.hline(r.x, r.x + r.w - 1, vy, tone('#f4f2ee', p))
    g.hline(r.x, r.x + r.w - 1, vy + 5, tone('#bdb6ae', p))
  },
}

/** Draw a window view inside its glass rect. */
export function drawRoomView(g: Surface, view: WindowView, phase: Phase, t: number, r: Rect, arch = false) {
  const draw = VIEWS[view]
  if (!draw) return
  clipRect(g, r, arch)
  draw(g, r, phase, t)
  g.ctx.restore()
}

/** Lights in the view redrawn after the night tint so they glow. */
export function drawRoomViewEmissive(g: Surface, view: WindowView, phase: Phase, t: number, r: Rect, arch = false) {
  if (!isNight(phase)) return
  clipRect(g, r, arch)
  const b = r.y + r.h
  switch (view) {
    case 'bts': {
      const vy = r.y + Math.round(r.h * 0.6)
      const ph = (t % 14) / 14
      if (ph < 0.6) {
        const len = 110
        const tx = r.x + r.w + 8 - (ph / 0.6) * (r.w + len + 16)
        for (let cx = tx + 2; cx < tx + len - 6; cx += 9) {
          g.alpha(0.9)
          g.rect(Math.round(cx), vy - 11, 6, 5, '#fff3c4')
        }
        g.alpha(1)
      }
      for (let i = 0; i < 24; i++) {
        const lx = r.x + ((i * 37) % r.w)
        const lyy = b - 8 - ((i * 23) % 40)
        if (Math.sin(t * 0.5 + i) > -0.6) g.px(lx, lyy, '#ffe08a')
      }
      break
    }
    case 'river':
      g.px(r.x + Math.round(r.w * 0.66), r.y + Math.round(r.h * 0.52) - 27, '#fff3a6')
      for (let k = 0; k < 5; k++) g.px(r.x + 4 + k * 9, r.y + Math.round(r.h * 0.52) - 2, '#ffd98a')
      break
    case 'oldtown': {
      const ly = r.y + 16
      for (let k = 0; k < 4; k++) {
        const lx = r.x + 5 + k * Math.round((r.w - 10) / 3)
        g.ellipse(lx, ly + 1, 2, 2.5, '#ff8a5a')
        g.px(lx, ly, '#ffd0a0')
      }
      break
    }
    case 'garden':
      g.px(r.x + r.w - 13, b - 11, '#ffe08a')
      g.px(r.x + r.w - 12, b - 11, '#ffe08a')
      break
    case 'mountain': {
      const cx = r.x + Math.round(r.w * 0.58)
      g.px(cx, r.y + r.h - 14 - 23, '#fff3a6')
      g.px(cx + 1, r.y + r.h - 14 - 20, '#ffd54f')
      break
    }
    case 'kwai':
      for (const rx of [r.x + 10, r.x + r.w - 10]) g.px(rx, r.y + Math.round(r.h * 0.6), '#ffd98a')
      break
    case 'field':
    case 'orchard':
      for (let i = 0; i < 7; i++) {
        const fx = r.x + ((i * 13 + Math.floor(t * 3) * (i % 2 ? 1 : -1)) % r.w + r.w) % r.w
        const fy = b - 6 - ((i * 7 + Math.round(Math.sin(t + i) * 3)) % 20)
        if (Math.sin(t * 4 + i * 1.7) > 0.3) g.px(fx, fy, '#e8ff7a')
      }
      break
    default:
      break
  }
  g.ctx.restore()
}

// ---------------------------------------------------------------------------
// Window frames (drawn over the view; `open` 1 = fully open, ~0.1 = closed)

export function drawRoomFrame(g: Surface, frame: WindowFrame, _t: number, open: number, r: Rect, win: Rect) {
  const closed = Math.max(0, Math.min(1, (0.5 - open) / 0.38))
  switch (frame) {
    case 'black': {
      // Slim black aluminium, mullions and a roller blind.
      const k = '#2e2e38'
      g.rect(win.x, win.y, win.w, 2, k)
      g.rect(win.x, win.y + win.h - 2, win.w, 2, k)
      g.rect(win.x, win.y, 2, win.h, k)
      g.rect(win.x + win.w - 2, win.y, 2, win.h, k)
      for (let x = win.x + Math.round(win.w / 3); x < win.x + win.w - 4; x += Math.round(win.w / 3)) g.rect(x - 1, win.y, 2, win.h, k)
      g.hline(win.x + 2, win.x + win.w - 3, win.y + Math.round(win.h * 0.82), k)
      const bh = Math.round(4 + closed * (r.h - 6))
      g.rect(r.x, r.y, r.w, bh, '#d8d4cc')
      for (let y = r.y + 2; y < r.y + bh; y += 3) g.hline(r.x, r.x + r.w - 1, y, '#c8c4bc')
      g.rect(r.x, r.y + bh - 1, r.w, 2, '#9a968e')
      g.px(r.x + r.w / 2, r.y + bh + 1, '#9a968e')
      break
    }
    case 'kitchen': {
      const f = '#fffaf0'
      g.frame(r.x - 3, r.y - 3, r.w + 6, r.h + 6, f)
      g.frame(r.x - 2, r.y - 2, r.w + 4, r.h + 4, f)
      g.frame(r.x - 4, r.y - 4, r.w + 8, r.h + 8, '#dccdb7')
      g.rect(r.x - 1, r.y + Math.round(r.h / 2) - 1, r.w + 2, 2, f)
      g.vline(r.x + r.w / 2, r.y, r.y + r.h - 1, f)
      // Sill with a pot of holy basil.
      g.rect(r.x - 6, r.y + r.h + 3, r.w + 12, 3, '#fffaf0')
      g.hline(r.x - 6, r.x + r.w + 5, r.y + r.h + 5, '#dccdb7')
      g.rect(r.x + 3, r.y + r.h - 2, 5, 5, CLAY.base)
      g.ellipse(r.x + 5, r.y + r.h - 4, 4, 3, '#48a052')
      g.px(r.x + 4, r.y + r.h - 6, '#6cbf5c')
      // Gingham café curtains sliding shut.
      const reach = Math.round(4 + closed * (r.w / 2 - 4))
      for (const side of [0, 1]) {
        const x0 = side === 0 ? r.x : r.x + r.w - reach
        for (let y = r.y + Math.round(r.h * 0.45); y < r.y + r.h; y++)
          for (let x = x0; x < x0 + reach; x++) g.px(x, y, ((x >> 1) + (y >> 1)) % 2 ? '#fffaf0' : '#f08a80')
      }
      g.rect(r.x - 2, r.y - 4, r.w + 4, 5, '#e8514a')
      for (let x = r.x - 2; x < r.x + r.w + 2; x += 3) g.px(x, r.y + 1, '#fffaf0')
      break
    }
    case 'shutter':
    case 'lanna': {
      const W = frame === 'lanna' ? DARK_TEAK : TEAK
      // Carved ventilation panel (ช่องลม) above the window.
      g.rect(r.x - 4, r.y - 12, r.w + 8, 9, W.mid)
      g.hline(r.x - 4, r.x + r.w + 3, r.y - 12, W.hi)
      for (let x = r.x; x < r.x + r.w; x += 5) {
        g.rect(x, r.y - 10, 3, 5, W.deep)
        g.px(x + 1, r.y - 9, frame === 'lanna' ? GOLD.base : '#ffe8c0')
      }
      if (frame === 'lanna') {
        g.hline(r.x - 4, r.x + r.w + 3, r.y - 4, GOLD.base)
        g.poly(
          [
            [r.x + r.w / 2 - 6, r.y - 12],
            [r.x + r.w / 2, r.y - 16],
            [r.x + r.w / 2 + 6, r.y - 12],
          ],
          W.dark,
        )
        g.px(r.x + r.w / 2, r.y - 15, GOLD.base)
      }
      // Frame and sill.
      g.frame(r.x - 3, r.y - 3, r.w + 6, r.h + 6, W.mid)
      g.frame(r.x - 2, r.y - 2, r.w + 4, r.h + 4, W.dark)
      g.frame(r.x - 1, r.y - 1, r.w + 2, r.h + 2, W.deep)
      g.rect(r.x - 6, r.y + r.h + 2, r.w + 12, 3, W.top)
      g.hline(r.x - 6, r.x + r.w + 5, r.y + r.h + 2, W.hi)
      g.hline(r.x - 6, r.x + r.w + 5, r.y + r.h + 4, W.deep)
      // Two leaves: open against the wall, or swung shut over the glass.
      const lw = Math.round(r.w / 2)
      const leaf = (x: number, w: number) => {
        g.rect(x, r.y, w, r.h, W.mid)
        g.frame(x, r.y, w, r.h, W.dark)
        g.vline(x + 1, r.y + 1, r.y + r.h - 2, W.hi)
        for (const py of [r.y + 3, r.y + Math.round(r.h / 2) + 1]) g.frame(x + 3, py, Math.max(2, w - 6), Math.round(r.h / 2) - 5, W.dark)
        if (frame === 'lanna') g.px(x + Math.round(w / 2), r.y + Math.round(r.h / 2), GOLD.base)
      }
      if (closed < 0.5) {
        const w = Math.max(3, Math.round(lw * (1 - closed * 2)))
        leaf(r.x - 3 - w, w)
        leaf(r.x + r.w + 3, w)
      } else {
        const w = Math.round(lw * (closed - 0.5) * 2)
        if (w > 0) {
          leaf(r.x, w)
          leaf(r.x + r.w - w, w)
        }
      }
      g.px(r.x - 4, r.y + Math.round(r.h / 2), GOLD.base)
      g.px(r.x + r.w + 3, r.y + Math.round(r.h / 2), GOLD.base)
      break
    }
    case 'bamboo': {
      // Bamboo pole frame with lashings and a roll-down blind.
      for (const [x, y, w, h] of [
        [r.x - 3, r.y - 3, r.w + 6, 3],
        [r.x - 3, r.y + r.h, r.w + 6, 3],
        [r.x - 3, r.y - 3, 3, r.h + 6],
        [r.x + r.w, r.y - 3, 3, r.h + 6],
      ] as [number, number, number, number][]) {
        g.rect(x, y, w, h, BAMBOO.mid)
        if (w > h) g.hline(x, x + w - 1, y, BAMBOO.hi)
        else g.vline(x, y, y + h - 1, BAMBOO.hi)
      }
      for (const [x, y] of [
        [r.x - 2, r.y - 2],
        [r.x + r.w + 1, r.y - 2],
        [r.x - 2, r.y + r.h + 1],
        [r.x + r.w + 1, r.y + r.h + 1],
      ])
        g.rect(x - 1, y - 1, 3, 3, '#8a6a34')
      g.vline(r.x + r.w / 2, r.y, r.y + r.h - 1, BAMBOO.dark)
      const bh = Math.round(3 + closed * (r.h - 4))
      for (let y = r.y; y < r.y + bh; y += 2) {
        g.hline(r.x, r.x + r.w - 1, y, BAMBOO.top)
        g.hline(r.x, r.x + r.w - 1, y + 1, BAMBOO.dark)
      }
      g.rect(r.x - 1, r.y + bh - 1, r.w + 2, 3, BAMBOO.mid)
      g.hline(r.x - 1, r.x + r.w, r.y + bh - 1, BAMBOO.hi)
      for (const x of [r.x + 4, r.x + r.w - 5]) g.vline(x, r.y, r.y + bh, '#b8343f')
      break
    }
    case 'arch': {
      // White plaster arch, stained-glass fanlight and green louvred shutters.
      const rad = r.w / 2
      const cx = r.x + rad
      const cy = r.y + rad
      for (let a = 0; a <= 64; a++) {
        const ang = Math.PI + (a / 64) * Math.PI
        for (let d = 0; d < 3; d++) g.px(Math.round(cx + Math.cos(ang) * (rad + d)), Math.round(cy + Math.sin(ang) * (rad + d)), d === 2 ? '#e8dcc8' : '#fffaf0')
      }
      g.rect(r.x - 3, cy, 3, r.h - rad, '#fffaf0')
      g.rect(r.x + r.w, cy, 3, r.h - rad, '#fffaf0')
      g.rect(r.x - 5, r.y + r.h, r.w + 10, 3, '#fffaf0')
      g.hline(r.x - 5, r.x + r.w + 4, r.y + r.h + 2, '#e8dcc8')
      // Fanlight rays.
      const glass = ['#ffd23f', '#e8514a', '#3a9a8a', '#5a8de0', '#ff9fc0']
      g.alpha(0.55)
      for (let k = 0; k < 5; k++) {
        const a0 = Math.PI + (k / 5) * Math.PI
        const a1 = Math.PI + ((k + 1) / 5) * Math.PI
        g.poly(
          [
            [cx, cy],
            [cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad],
            [cx + Math.cos((a0 + a1) / 2) * rad, cy + Math.sin((a0 + a1) / 2) * rad],
            [cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad],
          ],
          glass[k],
        )
      }
      g.alpha(1)
      g.hline(r.x, r.x + r.w - 1, cy, '#fffaf0')
      g.vline(cx, r.y, cy, '#fffaf0')
      // Louvred shutters.
      const lw = Math.round(r.w / 2)
      const shutter = (x: number, w: number) => {
        g.rect(x, cy + 1, w, r.h - rad - 1, '#3f9a7a')
        g.frame(x, cy + 1, w, r.h - rad - 1, '#2a6a54')
        for (let y = cy + 3; y < r.y + r.h - 2; y += 2) g.hline(x + 1, x + w - 2, y, '#5fb89a')
      }
      if (closed < 0.5) {
        const w = Math.max(3, Math.round(lw * 0.7 * (1 - closed * 2)))
        shutter(r.x - 3 - w, w)
        shutter(r.x + r.w + 3, w)
      } else {
        const w = Math.round(lw * (closed - 0.5) * 2)
        if (w > 0) {
          shutter(r.x, w)
          shutter(r.x + r.w - w, w)
        }
      }
      break
    }
    default:
      break
  }
}
