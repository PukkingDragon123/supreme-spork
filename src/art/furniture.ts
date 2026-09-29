// Home art: furniture sprites, wallpapers, floors, the big city window and
// crafting-material icons. Everything is procedural pixel art baked into
// cached canvases. Furniture is drawn in the same 3/4 front view as the
// temple world: a top face, a front face and a dark plum outline.

import { bake, createCanvas, mix, Surface, type Color } from '../engine/pixel'
import { cached, flipSprite, outlineCanvas, type Sprite } from '../engine/sprite'
import { Rng } from '../engine/rng'
import { P } from './palette'
import { drawBuddha, GOLD } from './interior'
import { FURNITURE_BY_ID, type MaterialId } from '../game/data/furniture'
import { ROOM } from '../game/house'
import type { Phase } from '../game/time'
import { DARK_BASEBOARD, ROOM_ART, ROOM_FLOOR, ROOM_FX, ROOM_WALLPAPER } from './roomArt'

// ---------------------------------------------------------------------------
// Room geometry (world pixels; origin = top-left of the back wall)

export const TILE_W = 16
export const TILE_H = 12
export const WALL_TILE = 16
export const WALL_H = ROOM.wallRows * WALL_TILE
export const ROOM_W = ROOM.cols * TILE_W
export const FLOOR_Y = WALL_H
export const FLOOR_H = ROOM.rows * TILE_H
export const ROOM_H = FLOOR_Y + FLOOR_H

/** Glass area of the big window in world pixels (inside its frame). */
export const WINDOW = { x: 64, y: 0, w: 64, h: WALL_H } as const
export const GLASS = { x: WINDOW.x + 3, y: 3, w: WINDOW.w - 6, h: WALL_H - 5 } as const

// ---------------------------------------------------------------------------
// Local palette

interface Wood {
  hi: Color
  top: Color
  mid: Color
  dark: Color
  deep: Color
}

const TEAK: Wood = { hi: '#ecb477', top: '#d49257', mid: '#b97643', dark: '#955631', deep: '#6b3b24' }
const OAK: Wood = { hi: '#fbe2b4', top: '#efc995', mid: '#dfae76', dark: '#c18c58', deep: '#9a6a40' }
const WHITE: Wood = { hi: '#fffdf8', top: '#fbf5ea', mid: '#f0e6d6', dark: '#dccdb7', deep: '#bba98f' }
const RATTAN: Wood = { hi: '#f8e2a8', top: '#ebc783', mid: '#d9ab62', dark: '#b98846', deep: '#8e6232' }
const LACQUER: Wood = { hi: '#e0645a', top: '#c8423f', mid: '#a8323a', dark: '#83263a', deep: '#5e1c30' }

const LINEN = '#fff8ec'
const LINEN_D = '#eadfcc'
const LINEN_DD = '#d3c3aa'
const LEAF = ['#9bd66e', '#6cbf5c', '#48a052', '#2f7a47', '#215a3b'] as const
const CLAY = { hi: '#f2a57a', base: '#d97b52', dark: '#b45a3a', deep: '#8a4030' }
const METAL = { hi: '#f4f6f8', base: '#cfd5dc', dark: '#9aa3ae', deep: '#6d7582' }

const OUTLINE = P.ink
const RUG_OUTLINE = '#7a5238'

// ---------------------------------------------------------------------------
// Helpers

/** A block with a top face and a front face. (x, y) is the back-left of the top face. */
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

/** Grain speckles on a wooden surface. */
function grain(g: Surface, x: number, y: number, w: number, h: number, c: Color, seed: number, n = 6) {
  const r = new Rng(seed)
  for (let i = 0; i < n; i++) {
    const gx = x + r.int(0, Math.max(0, w - 3))
    const gy = y + r.int(0, Math.max(0, h - 1))
    g.hline(gx, gx + r.int(1, 2), gy, c)
  }
}

function flowerDot(g: Surface, x: number, y: number, petal: Color, centre: Color) {
  g.px(x, y - 1, petal)
  g.px(x - 1, y, petal)
  g.px(x + 1, y, petal)
  g.px(x, y + 1, petal)
  g.px(x, y, centre)
}

/** Monstera-style leaf: a heart blob with notches. */
function bigLeaf(g: Surface, cx: number, cy: number, r: number, light: Color, base: Color, dark: Color, notch: Color | null) {
  g.ellipse(cx, cy, r, r * 0.8, base)
  g.ellipse(cx - r * 0.25, cy - r * 0.25, r * 0.55, r * 0.4, light)
  g.line(cx, cy + r * 0.7, cx, cy - r * 0.5, dark)
  if (notch) {
    g.px(cx - Math.round(r * 0.7), cy, notch)
    g.px(cx + Math.round(r * 0.7), cy - 1, notch)
    g.px(cx - Math.round(r * 0.5), cy + Math.round(r * 0.5), notch)
  }
}

// ---------------------------------------------------------------------------
// Furniture art registry

interface ArtCtx {
  /** Footprint width/depth in px. */
  W: number
  D: number
  /** Left edge of the footprint inside the canvas (= padX). */
  x0: number
  /** Back edge (top) of the footprint inside the canvas (= up). */
  y0: number
  /** Front edge of the footprint (floor line) inside the canvas. */
  b: number
}

interface Art {
  up: number
  padX?: number
  frames?: number
  outline?: Color | null
  draw(g: Surface, a: ArtCtx, fr: number): void
}

const ART: Record<string, Art> = {}

// --- Built-ins --------------------------------------------------------------

/** Mirror panels of the wardrobe relative to its footprint top-left. */
export const WARDROBE_MIRRORS = [
  { x: 2, y: -56, w: 14, h: 61 },
  { x: 16, y: -56, w: 14, h: 61 },
]

ART.wardrobe_mirror = {
  up: 78,
  draw(g, a) {
    const { b } = a
    const F = WHITE
    // Top face and body.
    g.rect(0, 0, 32, 3, F.top)
    g.hline(0, 31, 0, F.hi)
    g.rect(0, 3, 32, b - 3, F.mid)
    g.vline(31, 3, b - 1, F.dark)
    g.vline(0, 3, b - 1, F.hi)
    // Upper cupboard doors.
    for (const x of [2, 16]) {
      g.rect(x, 5, 14, 15, F.top)
      g.hline(x, x + 13, 5, F.hi)
      g.vline(x + 13, 5, 19, F.dark)
      g.hline(x, x + 13, 19, F.dark)
      g.rect(x + 5, 16, 4, 1, OAK.dark)
    }
    // Oak trim band.
    g.rect(1, 21, 30, 2, OAK.mid)
    g.hline(1, 30, 21, OAK.hi)
    // Mirror panels (the scene draws reflections inside them).
    const my0 = a.y0 + WARDROBE_MIRRORS[0].y
    const mh = WARDROBE_MIRRORS[0].h
    for (const m of WARDROBE_MIRRORS) {
      const mx = m.x
      for (let j = 0; j < mh; j++) {
        const t = j / mh
        g.hline(mx, mx + m.w - 1, my0 + j, t < 0.4 ? '#e3f0f3' : t < 0.8 ? '#d3e6eb' : '#c1d8e0')
      }
      // Shine streaks.
      for (const [sx, sy, len, wdt] of [
        [mx + 2, my0 + 16, 10, 2],
        [mx + 7, my0 + 14, 5, 1],
        [mx + 3, my0 + 44, 6, 1],
      ] as const) {
        for (let k = 0; k < len; k++) for (let q = 0; q < wdt; q++) g.px(sx + k + q, sy - k, '#f7fcfd')
      }
    }
    // Sliding door frames: the right panel sits in front.
    g.rect(15, my0 - 1, 2, mh + 1, F.dark)
    g.vline(16, my0 - 1, my0 + mh - 1, F.hi)
    g.hline(1, 30, my0 - 1, F.dark)
    g.hline(1, 30, my0 + mh, F.dark)
    // Handles.
    g.rect(13, my0 + 26, 1, 8, OAK.dark)
    g.rect(18, my0 + 26, 1, 8, OAK.dark)
    // Plinth.
    g.rect(0, b - 4, 32, 4, OAK.mid)
    g.hline(0, 31, b - 4, OAK.hi)
    g.hline(0, 31, b - 1, OAK.dark)
  },
}

ART.altar_shelf = {
  up: 0,
  draw(g, _a, fr) {
    // Pointed-arch backboard (ซุ้ม) in red lacquer with gold edging.
    g.poly(
      [
        [8, 21],
        [8, 8],
        [16, 0],
        [24, 8],
        [24, 21],
      ],
      GOLD.dark,
    )
    g.poly(
      [
        [9, 21],
        [9, 9],
        [16, 2],
        [23, 9],
        [23, 21],
      ],
      LACQUER.mid,
    )
    g.poly(
      [
        [10, 21],
        [10, 10],
        [16, 4],
        [22, 10],
        [22, 21],
      ],
      LACQUER.dark,
    )
    g.px(16, 0, GOLD.light)
    // Halo glow behind the image.
    g.circle(16, 10, 4, '#b8403f')
    drawBuddha(g, 16, 20, 0.19)
    // Vases with flowers at both ends.
    for (const vx of [4, 27]) {
      g.rect(vx - 1, 16, 3, 4, GOLD.base)
      g.px(vx + 1, 17, GOLD.dark)
      g.px(vx + 1, 18, GOLD.dark)
      g.rect(vx - 2, 15, 5, 1, GOLD.dark)
      g.vline(vx, 12, 15, LEAF[3])
      g.px(vx - 1, 13, LEAF[2])
      g.px(vx + 1, 14, LEAF[2])
      flowerDot(g, vx - 1, 11, vx < 16 ? '#ffd23f' : '#ff9fc0', '#fff3a6')
      flowerDot(g, vx + 1, 12, vx < 16 ? '#f58f35' : '#ffd6e0', '#fff3a6')
    }
    // Candles (flames are drawn live by the scene).
    for (const cx of [7, 25]) {
      g.rect(cx, 15, 2, 5, '#fff3d6')
      g.px(cx + 1, 16, '#e8d6b0')
      g.px(cx + 1, 17, '#e8d6b0')
      if (fr === 0) {
        g.px(cx, 14, '#ffd54f')
        g.px(cx, 13, '#fff3a6')
      }
    }
    // Shelf board.
    g.rect(1, 20, 30, 2, TEAK.top)
    g.hline(1, 30, 20, TEAK.hi)
    g.rect(1, 22, 30, 3, TEAK.mid)
    g.hline(1, 30, 23, GOLD.base)
    g.hline(1, 30, 24, TEAK.dark)
    // Carved brackets.
    for (const bx of [4, 25]) {
      g.rect(bx, 25, 3, 2, TEAK.mid)
      g.rect(bx + 1, 27, 2, 2, TEAK.dark)
      g.px(bx + 1, 29, TEAK.dark)
    }
    // Jasmine garland hanging from the shelf.
    const pts: [number, number][] = [
      [11, 25],
      [12, 27],
      [13, 28],
      [15, 29],
      [17, 29],
      [19, 28],
      [20, 27],
      [21, 25],
    ]
    for (const [x, y] of pts) g.px(x, y, '#fffdf5')
    g.px(14, 29, '#e8e2cf')
    g.px(18, 29, '#e8e2cf')
    g.rect(15, 30, 3, 1, P.red)
    g.px(16, 31, LEAF[2])
  },
}

ART.door = {
  up: 0,
  frames: 2,
  draw(g, _a, fr) {
    // Architrave.
    g.rect(3, 1, 26, 47, WHITE.mid)
    g.vline(3, 1, 47, WHITE.hi)
    g.vline(28, 1, 47, WHITE.dark)
    g.hline(3, 28, 1, WHITE.hi)
    if (fr === 1) {
      // Ajar: warm light from the corridor and the leaf swung inward.
      g.rect(5, 3, 22, 45, '#fff1c4')
      g.rect(5, 3, 3, 45, '#ffe08a')
      g.rect(18, 3, 9, 45, TEAK.mid)
      g.vline(18, 3, 47, TEAK.hi)
      g.vline(26, 3, 47, TEAK.dark)
      g.rect(20, 25, 2, 2, GOLD.base)
      return
    }
    // Leaf.
    g.rect(5, 3, 22, 45, TEAK.mid)
    g.vline(5, 3, 47, TEAK.hi)
    g.vline(26, 3, 47, TEAK.dark)
    // Raised panels.
    for (const [px, py, pw, ph] of [
      [8, 7, 7, 15],
      [17, 7, 7, 15],
      [8, 26, 7, 17],
      [17, 26, 7, 17],
    ] as const) {
      g.rect(px, py, pw, ph, TEAK.dark)
      g.rect(px + 1, py + 1, pw - 2, ph - 2, TEAK.top)
      g.hline(px + 1, px + pw - 2, py + 1, TEAK.hi)
    }
    // Brass lever handle and keyhole.
    g.rect(21, 24, 4, 1, GOLD.base)
    g.px(24, 25, GOLD.dark)
    g.px(24, 27, P.ink2)
    // Peephole.
    g.px(16, 5, P.ink2)
    // Jasmine garland on the handle (มาลัย).
    g.px(21, 25, '#fffdf5')
    g.px(21, 26, '#fffdf5')
    g.px(22, 27, '#fffdf5')
    g.px(23, 26, '#fffdf5')
    g.px(22, 28, P.red)
    g.px(22, 29, LEAF[2])
    g.px(22, 30, '#fffdf5')
  },
}

// --- Beds & seating ---------------------------------------------------------------

ART.bed_simple = {
  up: 16,
  draw(g, a) {
    const { b, y0 } = a
    // Headboard with a scalloped top.
    g.rect(0, 4, 32, y0 + 6 - 4, OAK.mid)
    g.rect(2, 2, 28, 3, OAK.mid)
    g.rect(6, 1, 20, 2, OAK.mid)
    g.hline(6, 25, 1, OAK.hi)
    g.hline(2, 29, 2, OAK.hi)
    g.rect(3, 6, 12, 10, OAK.top)
    g.rect(17, 6, 12, 10, OAK.top)
    g.hline(3, 14, 6, OAK.hi)
    g.hline(17, 28, 6, OAK.hi)
    g.vline(31, 4, y0 + 5, OAK.dark)
    // Mattress (top) and sheet.
    const top = y0 + 2
    g.rect(1, top, 30, b - 7 - top, LINEN)
    // Pillows.
    for (const px of [3, 17]) {
      g.rect(px, top + 1, 12, 7, '#fffdf8')
      g.rect(px + 1, top, 10, 1, '#fffdf8')
      g.hline(px, px + 11, top + 7, LINEN_D)
      g.rect(px + 10, top + 1, 2, 6, LINEN_D)
      g.px(px + 2, top + 2, '#ffffff')
    }
    // Blush duvet with little flowers, folded back at the top.
    const dt = top + 11
    g.rect(0, dt, 32, b - 5 - dt, '#ffc9cf')
    g.rect(0, dt, 32, 2, '#ffe3e6')
    g.hline(0, 31, dt + 2, '#f2a9b3')
    for (let y = dt + 5; y < b - 7; y += 5)
      for (let x = ((y / 5) % 2) * 3 + 3; x < 31; x += 6) flowerDot(g, x, y, '#fff1f3', '#ffd54f')
    // Pha khao ma (checked cloth) throw at the foot.
    const ty = b - 13
    for (let x = 0; x < 32; x++)
      for (let y = ty; y < ty + 6; y++) {
        const c = (x >> 1) % 3 === 0 ? ((y - ty) >> 1) % 2 ? '#2f7a8a' : '#e8514a' : ((y - ty) >> 1) % 3 === 1 ? '#f58f35' : '#c93f45'
        g.px(x, y, c)
      }
    g.hline(0, 31, ty, '#ff8a7a')
    // Duvet draping over the front edge, then the frame.
    g.rect(0, b - 7, 32, 3, '#f2a9b3')
    g.hline(0, 31, b - 5, '#e18e9a')
    g.rect(0, b - 4, 32, 3, OAK.mid)
    g.hline(0, 31, b - 4, OAK.hi)
    g.rect(1, b - 1, 2, 1, OAK.dark)
    g.rect(29, b - 1, 2, 1, OAK.dark)
  },
}

ART.bed_teak = {
  up: 30,
  draw(g, a) {
    const { b, y0 } = a
    const T = TEAK
    // Back posts and canopy frame.
    g.rect(0, 2, 3, y0 + 4, T.mid)
    g.rect(29, 2, 3, y0 + 4, T.mid)
    g.rect(0, 0, 32, 3, T.top)
    g.hline(0, 31, 0, T.hi)
    // Valance of the mosquito net.
    for (let x = 2; x < 30; x++) g.px(x, 3 + ((x >> 1) % 2), '#fffaf0')
    g.hline(2, 29, 3, '#f1ece2')
    // Carved headboard with a gold kanok flame.
    g.rect(3, y0 - 12, 26, 16, T.mid)
    g.rect(5, y0 - 10, 22, 12, T.dark)
    for (const kx of [9, 16, 23]) {
      g.poly(
        [
          [kx - 3, y0 + 1],
          [kx, y0 - 6],
          [kx + 3, y0 + 1],
        ],
        GOLD.dark,
      )
      g.poly(
        [
          [kx - 2, y0 + 1],
          [kx, y0 - 3],
          [kx + 2, y0 + 1],
        ],
        GOLD.base,
      )
    }
    g.hline(5, 26, y0 - 9, GOLD.base)
    // Mattress and bedding.
    const top = y0 + 3
    g.rect(2, top, 28, b - 8 - top, LINEN)
    for (const px of [4, 17]) {
      g.rect(px, top + 1, 11, 6, '#fffdf8')
      g.hline(px, px + 10, top + 7, LINEN_D)
      g.hline(px, px + 10, top + 1, GOLD.base)
    }
    // Thai silk runner (ผ้าไหม) across the foot.
    const ry = b - 18
    g.rect(2, ry, 28, 7, '#8e3a8f')
    g.hline(2, 29, ry + 1, GOLD.base)
    g.hline(2, 29, ry + 5, GOLD.base)
    for (let x = 4; x < 29; x += 4) g.px(x, ry + 3, GOLD.light)
    g.rect(2, b - 8, 28, 3, LINEN_D)
    g.hline(2, 29, b - 6, LINEN_DD)
    // Frame and front posts.
    g.rect(0, b - 5, 32, 4, T.mid)
    g.hline(0, 31, b - 5, T.hi)
    g.hline(0, 31, b - 2, T.dark)
    g.rect(0, y0 + 10, 3, b - y0 - 10, T.mid)
    g.rect(29, y0 + 10, 3, b - y0 - 10, T.mid)
    g.vline(2, y0 + 10, b - 1, T.dark)
    g.vline(31, y0 + 10, b - 1, T.dark)
    g.rect(0, y0 + 8, 3, 2, GOLD.base)
    g.rect(29, y0 + 8, 3, 2, GOLD.base)
    // Net gathered at each post.
    for (const nx of [3, 26]) {
      g.rect(nx, 4, 3, y0 + 4, '#fffaf0')
      g.vline(nx + 1, 5, y0 + 7, '#ebe5d9')
      g.rect(nx, y0 - 2, 3, 1, GOLD.base)
    }
    g.rect(3, y0 + 10, 2, b - y0 - 16, '#fffaf0')
    g.rect(27, y0 + 10, 2, b - y0 - 16, '#fffaf0')
  },
}

ART.teak_daybed = {
  up: 10,
  draw(g, a) {
    const { b } = a
    const T = TEAK
    // Platform top and carved apron.
    g.rect(0, 6, 48, b - 12, T.top)
    g.hline(0, 47, 6, T.hi)
    grain(g, 1, 7, 46, b - 14, T.mid, 11, 10)
    g.rect(0, b - 6, 48, 3, T.mid)
    g.hline(0, 47, b - 6, T.hi)
    for (let x = 3; x < 46; x += 6) g.rect(x, b - 3, 3, 1, T.dark)
    g.rect(0, b - 3, 3, 3, T.mid)
    g.rect(45, b - 3, 3, 3, T.mid)
    g.hline(0, 47, b - 4, T.dark)
    // Long cushion (เบาะ) with red/gold stripes.
    g.rect(3, 12, 42, b - 20, '#c8423f')
    for (let x = 5; x < 44; x += 5) g.vline(x, 12, b - 9, GOLD.base)
    g.hline(3, 44, 12, '#e0645a')
    g.hline(3, 44, b - 9, '#83263a')
    // Triangle cushion (หมอนขวาน) at the left end.
    g.poly(
      [
        [2, 16],
        [9, 0],
        [16, 16],
      ],
      '#b8343f',
    )
    g.poly(
      [
        [4, 15],
        [9, 4],
        [14, 15],
      ],
      GOLD.base,
    )
    g.poly(
      [
        [6, 15],
        [9, 8],
        [12, 15],
      ],
      '#2f7a47',
    )
    g.hline(2, 16, 16, '#83263a')
    // Tea tray at the right end.
    g.rect(34, 5, 10, 5, T.dark)
    g.rect(35, 5, 8, 4, T.mid)
    g.rect(36, 1, 4, 4, '#f4ecdf')
    g.px(40, 2, '#f4ecdf')
    g.px(37, 0, '#f4ecdf')
    g.rect(41, 3, 2, 2, '#f58f35')
  },
}

ART.cushion_khwan = {
  up: 10,
  draw(g, a) {
    const { b } = a
    // Seat mat.
    g.rect(0, b - 8, 16, 6, '#c8423f')
    g.hline(0, 15, b - 8, '#e0645a')
    for (let x = 2; x < 15; x += 4) g.vline(x, b - 7, b - 3, GOLD.base)
    g.rect(0, b - 2, 16, 2, '#83263a')
    // Triangle pillow with ขิด diamonds.
    g.poly(
      [
        [1, b - 7],
        [8, 0],
        [15, b - 7],
      ],
      '#b8343f',
    )
    g.poly(
      [
        [3, b - 8],
        [8, 3],
        [13, b - 8],
      ],
      GOLD.base,
    )
    g.poly(
      [
        [5, b - 8],
        [8, 7],
        [11, b - 8],
      ],
      '#2f6f9a',
    )
    g.px(8, 11, GOLD.light)
    g.px(8, 4, GOLD.light)
    g.hline(1, 14, b - 8, '#83263a')
  },
}

ART.chair_rattan = {
  up: 18,
  draw(g, a) {
    const { b } = a
    const R = RATTAN
    // Arched woven back.
    g.ellipse(8, 7, 7.5, 7, R.mid)
    g.rect(1, 7, 14, 10, R.mid)
    for (let y = 1; y < 17; y++)
      for (let x = 1; x < 16; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) g.px(x, y, R.dark)
    g.ellipse(8, 7, 5, 4.5, R.top)
    for (let y = 3; y < 12; y++) for (let x = 4; x < 13; x++) if ((x + y) % 3 === 0) g.px(x, y, R.mid)
    // Seat cushion.
    g.rect(1, 16, 14, 5, '#a8c69a')
    g.hline(1, 14, 16, '#c9e0bc')
    g.hline(1, 14, 20, '#86a67a')
    // Apron and bent legs.
    g.rect(1, 21, 14, 2, R.mid)
    g.hline(1, 14, 22, R.dark)
    leg(g, 1, 23, b, R)
    leg(g, 13, 23, b, R)
    g.px(3, b - 1, R.dark)
    g.px(12, b - 1, R.dark)
  },
}

// --- Tables & storage ---------------------------------------------------------

ART.workbench = {
  up: 14,
  draw(g, a) {
    const { b } = a
    // Tools on top.
    g.rect(24, 2, 5, 6, '#b9dcef')
    g.rect(24, 1, 5, 1, METAL.dark)
    g.px(25, 5, METAL.base)
    g.px(27, 4, METAL.base)
    g.px(26, 6, METAL.base)
    // Thick top.
    box(g, 0, 7, 32, 7, 3, OAK)
    grain(g, 1, 8, 30, 5, OAK.mid, 3, 7)
    // Plank, hammer and pencil.
    g.rect(12, 8, 10, 3, TEAK.top)
    g.hline(12, 21, 8, TEAK.hi)
    g.hline(12, 21, 10, TEAK.mid)
    g.rect(3, 11, 7, 1, TEAK.dark)
    g.rect(8, 9, 3, 3, METAL.dark)
    g.px(8, 9, METAL.hi)
    g.rect(24, 10, 4, 1, '#ffd23f')
    g.px(28, 10, '#ffb0a0')
    // Curly shavings.
    g.px(5, 8, OAK.hi)
    g.px(6, 9, OAK.hi)
    g.px(22, 12, OAK.hi)
    // Vise at the front.
    g.rect(26, 15, 5, 4, METAL.base)
    g.hline(26, 30, 15, METAL.hi)
    g.px(28, 19, METAL.dark)
    // Legs and a lower shelf with logs.
    leg(g, 1, 17, b, OAK, 3)
    leg(g, 28, 19, b, OAK, 3)
    g.rect(4, 21, 24, 2, OAK.mid)
    g.hline(4, 27, 22, OAK.dark)
    for (const lx of [8, 14, 20]) {
      g.circle(lx, 19, 2.5, TEAK.mid)
      g.px(lx, 19, TEAK.hi)
    }
  },
}

ART.side_table = {
  up: 10,
  draw(g, a) {
    const { b } = a
    // Water glass and books on top.
    g.rect(3, 1, 3, 5, '#cfeef8')
    g.hline(3, 5, 1, '#ffffff')
    g.px(4, 4, '#9fd6ec')
    g.rect(8, 3, 6, 2, '#5a8de0')
    g.rect(9, 1, 5, 2, '#ff9fc0')
    g.hline(9, 13, 1, '#ffd6e0')
    box(g, 0, 5, 16, 5, 8, TEAK)
    // Drawer.
    g.rect(2, 12, 12, 4, TEAK.top)
    g.hline(2, 13, 12, TEAK.hi)
    g.rect(7, 13, 2, 1, GOLD.base)
    leg(g, 1, 18, b, TEAK)
    leg(g, 13, 18, b, TEAK)
  },
}

ART.table_low = {
  up: 8,
  draw(g, a) {
    const { b } = a
    // Cha yen and a bowl of mango.
    g.rect(6, 1, 4, 6, '#f7a35c')
    g.rect(6, 1, 4, 1, '#fff3e0')
    g.px(9, 3, '#ffc98a')
    g.vline(8, 0, 1, '#e8514a')
    g.ellipse(21, 5, 5, 2, '#f4ecdf')
    g.ellipse(20, 4, 2, 1.5, '#ffd23f')
    g.ellipse(23, 4, 2, 1.5, '#ffbb33')
    box(g, 0, 5, 32, 7, 2, OAK)
    grain(g, 1, 6, 30, 5, OAK.mid, 7, 6)
    leg(g, 1, 14, b, OAK)
    leg(g, 29, 14, b, OAK)
  },
}

ART.bookshelf = {
  up: 34,
  draw(g, a) {
    const { b } = a
    const T = TEAK
    // Little plant and a photo on top.
    g.rect(3, 2, 4, 4, CLAY.base)
    g.px(3, 2, CLAY.hi)
    g.ellipse(5, 1, 3, 2, LEAF[2])
    g.rect(24, 1, 5, 5, GOLD.base)
    g.rect(25, 2, 3, 3, '#a4dcff')
    box(g, 0, 6, 32, 3, b - 9, T)
    g.vline(0, 9, b - 1, T.hi)
    g.vline(31, 9, b - 1, T.dark)
    const colors = ['#e8514a', '#5a8de0', '#ffd23f', '#6cc36a', '#ff9fc0', '#9270dc', '#f58f35', '#fffaf0', '#47a6cb']
    const r = new Rng(21)
    for (const sy of [10, 21, 32]) {
      g.rect(2, sy, 28, 10, T.deep)
      let x = 2
      while (x < 29) {
        const bw = r.int(2, 3)
        const bh = r.int(6, 9)
        if (r.chance(0.12) && x < 24) {
          // A leaning book or a tiny ornament.
          g.rect(x, sy + 10 - 4, 4, 4, r.chance(0.5) ? '#f4ecdf' : GOLD.base)
          x += 5
          continue
        }
        const c = r.pick(colors)
        g.rect(x, sy + 10 - bh, bw, bh, c)
        g.vline(x, sy + 10 - bh, sy + 9, mix(c, '#ffffff', 0.35))
        g.px(x + bw - 1, sy + 10 - bh + 2, mix(c, '#3a2838', 0.3))
        x += bw
      }
      g.rect(1, sy + 10, 30, 1, T.top)
    }
    g.rect(0, b - 2, 32, 2, T.dark)
  },
}

ART.tv_flat = {
  up: 24,
  draw(g, a) {
    const { b } = a
    // Screen.
    g.rect(2, 0, 28, 17, '#2d2a3a')
    g.rect(3, 1, 26, 15, '#3d4a6a')
    g.line(5, 12, 10, 4, '#56648a')
    g.line(6, 13, 12, 4, '#56648a')
    g.rect(14, 17, 4, 2, '#2d2a3a')
    g.rect(11, 19, 10, 1, '#2d2a3a')
    // Low oak cabinet.
    box(g, 0, 19, 32, 5, b - 24, OAK)
    g.rect(2, 26, 13, 5, OAK.top)
    g.rect(17, 26, 13, 5, OAK.top)
    g.hline(2, 14, 26, OAK.hi)
    g.hline(17, 29, 26, OAK.hi)
    g.rect(7, 28, 3, 1, OAK.deep)
    g.rect(22, 28, 3, 1, OAK.deep)
    // Tiny potted cactus.
    g.rect(26, 16, 3, 3, CLAY.base)
    g.rect(27, 13, 1, 3, LEAF[2])
    g.px(26, 14, LEAF[2])
  },
}

/** Screen rect of the TV relative to the footprint top-left. */
export const TV_SCREEN = { x: 3, y: -23, w: 26, h: 15 }

ART.aquarium = {
  up: 22,
  draw(g, a) {
    const { b } = a
    // Lid with a lamp.
    g.rect(1, 0, 30, 2, '#4a4658')
    g.hline(1, 30, 0, '#6a6680')
    // Tank.
    g.rect(1, 2, 30, 18, '#8edbe9')
    for (let y = 2; y < 20; y++) if (y > 11) g.hline(2, 29, y, y > 16 ? '#5fb9d4' : '#74cbe0')
    g.hline(2, 29, 3, '#c6f1f7')
    // Sand, pebbles and weeds.
    g.rect(2, 17, 28, 3, '#f1dca8')
    g.px(6, 17, '#e8514a')
    g.px(20, 18, '#9270dc')
    g.px(25, 17, '#fffaf0')
    for (const wx of [4, 9, 27]) {
      for (let y = 8; y < 17; y++) g.px(wx + ((y >> 1) % 2), y, LEAF[2])
      g.px(wx, 8, LEAF[0])
    }
    // Tiny chedi ornament.
    g.rect(15, 14, 5, 3, '#fffaf0')
    g.rect(16, 11, 3, 3, '#fffaf0')
    g.px(17, 9, GOLD.base)
    g.px(17, 10, GOLD.base)
    // Glass edges.
    g.vline(1, 2, 19, '#d6f5fa')
    g.vline(30, 2, 19, '#5fb9d4')
    // Wooden cabinet.
    box(g, 0, 20, 32, 2, b - 22, TEAK)
    g.rect(3, 24, 11, 6, TEAK.top)
    g.rect(18, 24, 11, 6, TEAK.top)
    g.px(12, 27, GOLD.base)
    g.px(19, 27, GOLD.base)
  },
}

/** Water area of the aquarium relative to the footprint top-left. */
export const AQUARIUM_WATER = { x: 2, y: -18, w: 28, h: 13 }

ART.altar_table = {
  up: 32,
  draw(g, a) {
    const { b } = a
    const L = LACQUER
    const table = (x: number, y: number, w: number, h: number) => {
      g.rect(x, y, w, 2, L.top)
      g.hline(x, x + w - 1, y, GOLD.light)
      g.rect(x, y + 2, w, 3, L.mid)
      g.hline(x, x + w - 1, y + 3, GOLD.base)
      for (let k = x + 2; k < x + w - 2; k += 3) g.px(k, y + 4, GOLD.dark)
      g.rect(x, y + 5, 2, h - 5, GOLD.dark)
      g.rect(x + w - 2, y + 5, 2, h - 5, GOLD.dark)
      g.rect(x + 2, y + 5, w - 4, h - 5, L.dark)
      g.px(x + 1, y + h - 1, GOLD.deep)
      g.px(x + w - 1, y + h - 1, GOLD.deep)
    }
    // Back (highest) table with the Buddha image.
    table(9, 14, 14, b - 14)
    drawBuddha(g, 16, 14, 0.16)
    // Side tables with vases.
    table(1, 22, 9, b - 22)
    table(22, 22, 9, b - 22)
    for (const vx of [5, 26]) {
      g.rect(vx - 1, 17, 3, 5, '#fffaf0')
      g.px(vx + 1, 18, '#dcd3c6')
      g.vline(vx, 13, 16, LEAF[3])
      flowerDot(g, vx - 1, 13, '#ffd23f', '#f58f35')
      flowerDot(g, vx + 1, 12, '#ff9fc0', '#fff3a6')
      g.px(vx, 11, '#fffaf0')
    }
    // Front table with candles and the incense bowl.
    table(6, 30, 20, b - 30)
    for (const cx of [9, 22]) {
      g.rect(cx, 26, 2, 4, '#fff3d6')
      g.px(cx + 1, 27, '#e8d6b0')
    }
    g.rect(13, 27, 6, 3, GOLD.base)
    g.hline(13, 18, 27, GOLD.light)
    g.hline(13, 18, 29, GOLD.dark)
    for (const ix of [14, 16, 18]) g.vline(ix - (ix === 18 ? 1 : 0), 22, 26, '#b8343f')
  },
}

// --- Lights, fan, music ------------------------------------------------------------

ART.lamp_paper = {
  up: 28,
  frames: 2,
  draw(g, a, fr) {
    const { b } = a
    const lit = fr === 1
    const shade = lit ? '#fff1c4' : '#fbf1de'
    const shadeD = lit ? '#ffd98a' : '#e6d4b6'
    // Stand and base.
    g.ellipse(8, b - 3, 5.5, 2.5, TEAK.dark)
    g.ellipse(8, b - 4, 5, 2, TEAK.mid)
    g.rect(7, 18, 2, b - 21, TEAK.mid)
    g.vline(8, 18, b - 4, TEAK.dark)
    // Round paper shade with bamboo ribs.
    g.ellipse(8, 11, 7, 8.5, shade)
    g.ellipse(9.5, 12, 5, 7, lit ? '#ffe8a8' : '#f4e7cf')
    g.ellipse(8, 11, 4.5, 6, shade)
    for (const ry of [5, 9, 13, 17]) {
      const half = Math.round(7 * Math.sqrt(Math.max(0, 1 - ((ry - 11) / 8.5) ** 2)))
      g.hline(8 - half, 8 + half, ry, shadeD)
    }
    g.rect(6, 2, 4, 1, TEAK.dark)
    if (lit) {
      g.ellipse(8, 11, 2.5, 3.5, '#fffbe6')
    }
  },
}

ART.lantern_oil = {
  up: 16,
  frames: 2,
  draw(g, a, fr) {
    const { b } = a
    const lit = fr === 1
    // Handle loop.
    g.hline(6, 10, 0, METAL.dark)
    g.px(5, 1, METAL.dark)
    g.px(11, 1, METAL.dark)
    g.vline(4, 2, 4, METAL.dark)
    g.vline(12, 2, 4, METAL.dark)
    // Cap.
    g.rect(5, 5, 7, 2, '#3f8a5c')
    g.hline(5, 11, 5, '#6cbf7c')
    g.rect(4, 7, 9, 1, '#2f6f4b')
    // Glass globe.
    g.ellipse(8.5, 13, 4.5, 5, lit ? '#ffe8a8' : '#e2f2f5')
    g.ellipse(7.5, 12, 2, 3, lit ? '#fff6d0' : '#f6fbfc')
    g.rect(8, 12, 1, 4, lit ? '#f58f35' : '#c9a37a')
    if (lit) {
      g.px(8, 11, '#ffd54f')
      g.px(8, 10, '#fff3a6')
    }
    // Enamel base.
    g.rect(3, 18, 11, 2, '#2f6f4b')
    g.rect(2, 20, 13, b - 21, '#3f8a5c')
    g.hline(2, 14, 20, '#6cbf7c')
    g.hline(3, 13, b - 2, '#2f6f4b')
    g.rect(4, 22, 2, 1, GOLD.base)
  },
}

ART.fan_stand = {
  up: 30,
  frames: 4,
  draw(g, a, fr) {
    const { b } = a
    const body = '#8fd3cf'
    const bodyD = '#5fb3af'
    const bodyL = '#c6efec'
    // Base with piano-key buttons.
    g.ellipse(8, b - 4, 7.5, 3.5, bodyD)
    g.ellipse(8, b - 5, 7, 3, body)
    g.ellipse(7, b - 6, 4, 1.5, bodyL)
    g.px(5, b - 3, '#e8514a')
    g.px(7, b - 3, '#fffaf0')
    g.px(9, b - 3, '#fffaf0')
    g.px(11, b - 3, '#fffaf0')
    // Pole.
    g.rect(7, 16, 3, b - 22, body)
    g.vline(9, 16, b - 7, bodyD)
    g.vline(7, 16, b - 7, bodyL)
    g.rect(6, 15, 5, 3, bodyD)
    // Cage.
    const cx = 8
    const cy = 9
    g.circle(cx, cy, 8, '#e9f6f5')
    // Blades.
    const base = fr === 0 ? 0.3 : 0.3 + fr * 0.7
    for (let k = 0; k < 3; k++) {
      const ang = base + (k * Math.PI * 2) / 3
      for (let rr = 2; rr <= 6; rr++) {
        const w = rr < 4 ? 0 : 1
        for (let q = -w; q <= w; q++) {
          const a2 = ang + q * 0.28
          g.px(Math.round(cx - 0.5 + Math.cos(a2) * rr), Math.round(cy - 0.5 + Math.sin(a2) * rr), rr === 5 && q === 0 ? '#e6f7f5' : '#6fc2bd')
        }
      }
    }
    if (fr > 0) {
      // Motion smear.
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2 + fr
        g.px(Math.round(cx + Math.cos(ang) * 6), Math.round(cy + Math.sin(ang) * 6), '#cdeeed')
      }
    }
    // Cage wires.
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2
      g.line(cx + Math.cos(ang) * 2, cy + Math.sin(ang) * 2, cx + Math.cos(ang) * 7.5, cy + Math.sin(ang) * 7.5, '#9ab7c0')
    }
    for (let k = 0; k < 40; k++) {
      const ang = (k / 40) * Math.PI * 2
      g.px(Math.round(cx - 0.5 + Math.cos(ang) * 7.6), Math.round(cy - 0.5 + Math.sin(ang) * 7.6), '#6f98a5')
    }
    g.circle(cx, cy, 1.8, '#e8514a')
    g.px(cx - 1, cy - 1, '#ff8a7a')
  },
}

ART.speaker = {
  up: 16,
  frames: 2,
  draw(g, a, fr) {
    const { b } = a
    const T = TEAK
    box(g, 1, 2, 14, 3, b - 5, T)
    g.vline(14, 5, b - 1, T.dark)
    // Grille panel.
    g.rect(3, 6, 10, b - 9, '#4a3a44')
    const pump = fr === 1 ? 0.6 : 0
    g.circle(8, 10, 2.2 + pump * 0.5, '#6a5a64')
    g.circle(8, 10, 1, '#c9b8c0')
    g.circle(8, 19, 3.8 + pump, '#6a5a64')
    g.circle(8, 19, 2.4 + pump * 0.5, '#8a7a84')
    g.circle(8, 19, 1, '#d8c8d0')
    g.px(11, 7, fr === 1 ? '#7cff9a' : '#4f9a55')
    g.rect(2, b - 1, 2, 1, T.deep)
    g.rect(12, b - 1, 2, 1, T.deep)
  },
}

// --- Plants & pets ------------------------------------------------------------

function potBody(g: Surface, x: number, y: number, w: number, h: number, c: { hi: Color; base: Color; dark: Color; deep: Color }) {
  g.rect(x - 1, y, w + 2, 2, c.hi)
  g.hline(x - 1, x + w, y + 1, c.base)
  g.poly(
    [
      [x, y + 2],
      [x + w, y + 2],
      [x + w - 1.5, y + h],
      [x + 1.5, y + h],
    ],
    c.base,
  )
  g.rect(x + w - 3, y + 2, 2, h - 3, c.dark)
  g.hline(x + 2, x + w - 2, y + h - 1, c.deep)
}

ART.plant_monstera = {
  up: 24,
  padX: 3,
  frames: 3,
  draw(g, a, fr) {
    const { b, x0 } = a
    const s = fr - 1
    const X = (v: number) => x0 + v
    // Stems.
    g.line(X(8), b - 10, X(3 + s), 10, LEAF[3])
    g.line(X(8), b - 10, X(13 + s), 8, LEAF[3])
    g.line(X(8), b - 10, X(8 + s), 4, LEAF[3])
    g.line(X(7), b - 10, X(1), 18, LEAF[3])
    g.line(X(9), b - 10, X(16), 17, LEAF[3])
    // Leaves (back to front).
    bigLeaf(g, X(8 + s), 5, 5, LEAF[1], LEAF[2], LEAF[3], null)
    bigLeaf(g, X(2 + s), 11, 5, LEAF[1], LEAF[2], LEAF[3], LEAF[4])
    bigLeaf(g, X(14 + s), 9, 5, LEAF[1], LEAF[2], LEAF[3], LEAF[4])
    bigLeaf(g, X(0), 18, 4.5, LEAF[0], LEAF[1], LEAF[3], LEAF[3])
    bigLeaf(g, X(16), 17, 4.5, LEAF[0], LEAF[1], LEAF[3], LEAF[3])
    // Glazed white pot.
    potBody(g, X(3), b - 11, 10, 11, { hi: '#ffffff', base: '#f4efe6', dark: '#dcd2c2', deep: '#bfb29c' })
    g.hline(X(4), X(11), b - 6, '#9fd0c8')
  },
}

ART.plant_bonsai = {
  up: 12,
  frames: 3,
  draw(g, a, fr) {
    const { b } = a
    const s = fr - 1
    // Glazed tray pot.
    g.rect(1, b - 6, 14, 2, '#6a8fd0')
    g.hline(1, 14, b - 6, '#9fc0f0')
    g.rect(2, b - 4, 12, 3, '#4a6fb5')
    g.rect(2, b - 1, 2, 1, '#34508a')
    g.rect(12, b - 1, 2, 1, '#34508a')
    g.rect(2, b - 7, 12, 1, '#6e4a35')
    // Twisted trunk.
    g.line(7, b - 7, 5, b - 11, TEAK.deep)
    g.line(6, b - 7, 4, b - 11, TEAK.dark)
    g.line(5, b - 11, 9, b - 15, TEAK.dark)
    g.line(9, b - 15, 7, b - 19, TEAK.dark)
    g.line(6, b - 12, 11, b - 12, TEAK.dark)
    // Cloud pads of foliage.
    for (const [px, py, r] of [
      [4 + s, b - 13, 3.2],
      [12 + s, b - 13, 2.8],
      [8 + s, b - 20, 3.6],
    ] as const) {
      g.ellipse(px, py, r + 0.8, r * 0.7, LEAF[3])
      g.ellipse(px - 0.5, py - 0.8, r, r * 0.55, LEAF[2])
      g.ellipse(px - 1, py - 1.2, r * 0.5, r * 0.3, LEAF[1])
    }
  },
}

ART.lotus_pot = {
  up: 18,
  padX: 1,
  frames: 3,
  draw(g, a, fr) {
    const { b, x0 } = a
    const s = fr - 1
    const X = (v: number) => x0 + v
    // Stems and a big leaf standing up.
    g.line(X(9), b - 11, X(10 + s), 5, LEAF[3])
    g.line(X(6), b - 11, X(4), 7, LEAF[3])
    g.line(X(11), b - 11, X(14), 10, LEAF[3])
    g.ellipse(X(3.5), 7, 3.5, 2, LEAF[2])
    g.hline(X(1), X(5), 7, LEAF[1])
    g.ellipse(X(14), 10, 3, 1.6, LEAF[2])
    // Lotus flower and bud.
    const fx = X(10 + s)
    g.poly(
      [
        [fx - 4, 5],
        [fx - 2, 0],
        [fx, 3],
        [fx + 2, 0],
        [fx + 4, 5],
      ],
      '#ff9fc0',
    )
    g.poly(
      [
        [fx - 1.5, 5],
        [fx, -1],
        [fx + 1.5, 5],
      ],
      '#ffd6e0',
    )
    g.hline(fx - 3, fx + 3, 5, '#e8709e')
    g.px(fx, 3, '#fff3a6')
    g.ellipse(X(4), 3, 1.3, 2, '#ff9fc0')
    g.px(X(4), 1, '#ffd6e0')
    // Clay basin with water and lily pads.
    g.ellipse(X(8), b - 11, 8, 2.5, CLAY.hi)
    g.ellipse(X(8), b - 11, 6.5, 1.6, '#5fb9d4')
    g.ellipse(X(6), b - 11, 2, 0.8, LEAF[1])
    g.poly(
      [
        [X(0), b - 10],
        [X(16), b - 10],
        [X(14), b - 1],
        [X(2), b - 1],
      ],
      CLAY.base,
    )
    g.hline(X(1), X(15), b - 7, '#f4d6a0')
    g.hline(X(1), X(15), b - 6, CLAY.dark)
    g.rect(X(11), b - 9, 3, 7, CLAY.dark)
    g.hline(X(2), X(14), b - 1, CLAY.deep)
  },
}

ART.cat_sleepy = {
  up: 6,
  frames: 4,
  draw(g, a, fr) {
    const { b } = a
    const breathe = fr % 2
    const tailUp = fr >= 2
    // Cushion bed.
    g.ellipse(8, b - 5, 8, 4.5, '#c9a8e8')
    g.ellipse(8, b - 6, 6.5, 3, '#e2d2ff')
    g.ellipse(8, b - 5.5, 5.5, 2.2, '#f2eaff')
    // Curled orange cat.
    const O = '#f5a55a'
    const OD = '#e07f3a'
    const OL = '#ffc98a'
    g.ellipse(8, b - 8 - breathe * 0.5, 5.5 + breathe * 0.4, 3.5 + breathe * 0.4, O)
    g.ellipse(7, b - 9 - breathe * 0.5, 3, 1.6, OL)
    for (const sx of [6, 9, 11]) g.vline(sx, b - 11, b - 10, OD)
    // Head tucked on the left with ears.
    g.ellipse(4, b - 8, 3, 2.5, O)
    g.px(2, b - 11, O)
    g.px(3, b - 11, OD)
    g.px(5, b - 11, O)
    g.px(6, b - 11, OD)
    g.hline(2, 3, b - 8, P.ink2)
    g.hline(5, 6, b - 8, P.ink2)
    g.px(4, b - 7, '#ff8fa3')
    // Tail wrapped around the front.
    if (tailUp) {
      g.hline(8, 12, b - 5, O)
      g.px(13, b - 6, O)
      g.px(14, b - 7, OD)
      g.px(14, b - 8, OD)
    } else {
      g.hline(6, 13, b - 5, O)
      g.px(5, b - 5, OD)
      g.px(13, b - 6, O)
    }
    g.px(11, b - 5, OD)
    g.px(9, b - 5, OD)
  },
}

ART.elephant_carving = {
  up: 12,
  draw(g, a) {
    const { b } = a
    const T = TEAK
    // Stand.
    g.rect(1, b - 4, 14, 3, T.dark)
    g.hline(1, 14, b - 4, T.mid)
    g.hline(2, 13, b - 1, T.deep)
    // Body.
    g.ellipse(9, b - 10, 5.5, 4, T.mid)
    g.ellipse(8.5, b - 11, 4, 2.4, T.top)
    // Legs.
    for (const lx of [5, 8, 11, 13]) g.rect(lx - 1, b - 8, 2, 4, lx === 8 || lx === 13 ? T.dark : T.mid)
    // Head and raised trunk.
    g.ellipse(4, b - 12, 3.2, 3.2, T.mid)
    g.ellipse(3.5, b - 13, 1.6, 1.4, T.top)
    g.line(1, b - 11, 0, b - 14, T.mid)
    g.line(0, b - 14, 1, b - 17, T.mid)
    g.px(2, b - 17, T.top)
    // Ear, eye and tusk.
    g.ellipse(6.5, b - 12, 1.8, 2.6, T.dark)
    g.px(3, b - 13, P.ink)
    g.px(2, b - 10, '#fffaf0')
    // Saddle cloth with gold.
    g.rect(8, b - 14, 5, 3, '#c8423f')
    g.hline(8, 12, b - 12, GOLD.base)
    g.px(10, b - 15, GOLD.base)
    // Tail.
    g.px(15, b - 10, T.dark)
    g.px(15, b - 9, T.dark)
  },
}

// --- Rugs ------------------------------------------------------------------------

ART.rug_mat = {
  up: 0,
  outline: RUG_OUTLINE,
  draw(g, a) {
    const W = a.W
    const D = a.D
    const base = '#ecd293'
    const reed = '#dcbc76'
    g.rect(0, 0, W, D, base)
    for (let y = 0; y < D; y++) if (y % 2) g.hline(0, W - 1, y, reed)
    // Woven stripes in red, green and purple.
    for (const [y, c] of [
      [3, '#c4574e'],
      [4, '#c4574e'],
      [8, '#5f9a60'],
      [D - 9, '#5f9a60'],
      [D - 5, '#8e5aa8'],
      [D - 4, '#8e5aa8'],
    ] as const)
      g.hline(2, W - 3, y, c)
    // Diamond band in the middle.
    const my = Math.floor(D / 2)
    for (let x = 4; x < W - 4; x += 6) {
      g.px(x + 2, my - 2, '#c4574e')
      g.hline(x + 1, x + 3, my - 1, '#c4574e')
      g.hline(x, x + 4, my, '#c4574e')
      g.hline(x + 1, x + 3, my + 1, '#c4574e')
      g.px(x + 2, my + 2, '#c4574e')
      g.px(x + 2, my, '#ffd23f')
    }
    // Cloth binding.
    g.rect(0, 0, W, 1, '#a8704a')
    g.rect(0, D - 1, W, 1, '#a8704a')
    g.rect(0, 0, 1, D, '#a8704a')
    g.rect(W - 1, 0, 1, D, '#a8704a')
  },
}

ART.rug_cloth = {
  up: 0,
  outline: RUG_OUTLINE,
  draw(g, a) {
    const W = a.W
    const D = a.D
    g.rect(0, 0, W, D, '#c8644c')
    g.rect(2, 2, W - 4, D - 4, '#fff1d6')
    g.rect(3, 3, W - 6, D - 6, '#c8644c')
    g.hline(3, W - 4, 4, '#e8a07a')
    g.hline(3, W - 4, D - 5, '#a84a3a')
    // A parade of little elephants.
    const ELE = ['.###...', '#####..', '######.', '#.#.#..', '#.#.#..']
    for (const [ox, oy] of [
      [6, 6],
      [17, 6],
      [11, 13],
    ] as const)
      for (let r = 0; r < ELE.length; r++)
        for (let c = 0; c < ELE[r].length; c++) if (ELE[r][c] === '#') g.px(ox + c, oy + r, '#fff1d6')
    // Tassels on the short ends.
    for (let y = 1; y < D - 1; y += 2) {
      g.px(0, y, '#fff1d6')
      g.px(W - 1, y, '#fff1d6')
    }
  },
}

// --- Wall decor ----------------------------------------------------------------

ART.clock_wall = {
  up: 0,
  frames: 2,
  draw(g, _a, fr) {
    g.circle(8, 8, 7, TEAK.mid)
    g.circle(8, 8, 6, TEAK.dark)
    g.circle(8, 8, 5.4, '#fff8ec')
    g.px(8, 3, P.ink2)
    g.px(8, 13, P.ink2)
    g.px(3, 8, P.ink2)
    g.px(13, 8, P.ink2)
    g.px(7, 1, GOLD.base)
    g.px(8, 0, GOLD.base)
    g.px(9, 1, GOLD.base)
    if (fr === 0) {
      g.line(8, 8, 5, 6, P.ink)
      g.line(8, 8, 11, 5, P.ink)
    }
    g.px(8, 8, P.red)
  },
}

ART.garland_hang = {
  up: 0,
  draw(g) {
    // Nail and loop of jasmine.
    g.px(8, 1, METAL.dark)
    const ring: [number, number][] = []
    for (let k = 0; k < 22; k++) {
      const ang = (k / 22) * Math.PI * 2
      ring.push([Math.round(8 + Math.cos(ang) * 5), Math.round(9 + Math.sin(ang) * 6.5)])
    }
    for (const [x, y] of ring) {
      g.px(x, y, '#fffdf5')
      g.px(x + 1, y, '#efe9d6')
    }
    g.px(8, 2, '#fffdf5')
    // Rose and marigold centrepiece.
    g.circle(8.5, 16, 2.5, '#e8514a')
    g.px(8, 15, '#ff8a7a')
    g.px(5, 16, '#f58f35')
    g.px(11, 16, '#f58f35')
    g.px(6, 18, LEAF[2])
    g.px(11, 18, LEAF[2])
    // Tassels (อุบะ) with ribbon.
    for (const [tx, len] of [
      [6, 9],
      [8, 12],
      [10, 9],
    ] as const) {
      for (let y = 19; y < 19 + len; y++) g.px(tx, y, y % 3 === 0 ? '#ffd6e0' : '#fffdf5')
      g.px(tx, 19 + len, '#e8514a')
    }
    g.px(7, 19, '#6cbf5c')
    g.px(9, 19, '#6cbf5c')
  },
}

ART.frames_trio = {
  up: 0,
  draw(g) {
    const frame = (x: number, y: number, w: number, h: number, edge: Color, edgeD: Color) => {
      g.rect(x, y, w, h, edge)
      g.hline(x, x + w - 1, y, mix(edge, '#ffffff', 0.4))
      g.vline(x + w - 1, y, y + h - 1, edgeD)
      g.hline(x, x + w - 1, y + h - 1, edgeD)
    }
    // Family.
    frame(1, 3, 11, 10, TEAK.mid, TEAK.dark)
    g.rect(2, 4, 9, 8, '#bfe6ff')
    g.rect(2, 9, 9, 3, '#b4e486')
    for (const [px, c] of [
      [3, '#e8514a'],
      [6, '#5a8de0'],
      [9, '#ffd23f'],
    ] as const) {
      g.px(px, 6, '#f0bd90')
      g.rect(px, 7, 1, 3, c)
    }
    // Temple dog.
    frame(13, 1, 8, 8, '#fffaf0', '#dccdb7')
    g.rect(14, 2, 6, 6, '#ffd6e0')
    g.rect(15, 4, 4, 3, '#f4ecdf')
    g.px(15, 3, '#e0bb8a')
    g.px(18, 3, '#e0bb8a')
    g.px(16, 5, P.ink)
    g.px(18, 5, P.ink)
    g.px(17, 6, '#ff8fa3')
    // Graduation.
    frame(22, 4, 9, 11, GOLD.base, GOLD.deep)
    g.rect(23, 5, 7, 9, '#e2d2ff')
    g.circle(26.5, 8, 1.6, '#f0bd90')
    g.rect(24, 10, 5, 4, '#3b2f40')
    g.hline(24, 29, 6, '#3b2f40')
    g.px(29, 7, GOLD.base)
  },
}

ART.painting_wat = {
  up: 0,
  draw(g) {
    // Ornate gold frame.
    g.rect(0, 4, 32, 25, GOLD.dark)
    g.rect(1, 5, 30, 23, GOLD.base)
    g.hline(1, 30, 5, GOLD.light)
    for (const [cx, cy] of [
      [1, 5],
      [30, 5],
      [1, 27],
      [30, 27],
    ] as const)
      g.px(cx, cy, GOLD.light)
    // Sunset sky.
    const sx = 3
    const sy = 7
    const w = 26
    const h = 19
    g.gradientV(sx, sy, w, 12, ['#ffb7a8', '#ffd08a', '#ffe8b0'], 2)
    g.circle(sx + 19, sy + 8, 2.5, '#fff3c4')
    // River.
    g.rect(sx, sy + 12, w, h - 12, '#7fb8d8')
    g.hline(sx, sx + w - 1, sy + 12, '#ffd9b0')
    g.hline(sx + 16, sx + 22, sy + 14, '#ffe8b0')
    g.hline(sx + 3, sx + 8, sy + 16, '#a8d4ea')
    // Temple silhouette with a prang and a roof with chofa.
    const tb = sy + 12
    g.poly(
      [
        [sx + 5, tb],
        [sx + 7, tb - 9],
        [sx + 8, tb - 11],
        [sx + 9, tb - 9],
        [sx + 11, tb],
      ],
      '#b0708a',
    )
    g.px(sx + 8, tb - 12, '#b0708a')
    g.poly(
      [
        [sx + 11, tb],
        [sx + 11, tb - 3],
        [sx + 14, tb - 7],
        [sx + 17, tb - 3],
        [sx + 17, tb],
      ],
      '#c47a6a',
    )
    g.px(sx + 11, tb - 4, GOLD.base)
    g.px(sx + 17, tb - 4, GOLD.base)
    g.px(sx + 14, tb - 8, GOLD.base)
    g.rect(sx + 12, tb - 2, 5, 2, '#fff1d6')
    // A little boat.
    g.rect(sx + 18, sy + 15, 5, 1, '#6e4a35')
    g.px(sx + 20, sy + 14, '#f58f35')
    // Hanging wire.
    g.line(10, 4, 16, 1, P.ink2)
    g.line(16, 1, 22, 4, P.ink2)
  },
}

ART.umbrella_bosang = {
  up: 0,
  draw(g) {
    const cx = 16
    const cy = 14
    g.circle(cx, cy, 13, '#e8674f')
    g.circle(cx, cy, 11, '#f58f5a')
    g.circle(cx, cy, 6, '#ffbb77')
    // Ribs.
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2
      g.line(cx + Math.cos(ang) * 2, cy + Math.sin(ang) * 2, cx + Math.cos(ang) * 12.5, cy + Math.sin(ang) * 12.5, '#d0563f')
    }
    // Painted flowers.
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + 0.3
      const fx = Math.round(cx + Math.cos(ang) * 8.5)
      const fy = Math.round(cy + Math.sin(ang) * 8.5)
      flowerDot(g, fx, fy, k % 2 ? '#fffaf0' : '#ffd6e0', '#ffd23f')
      g.px(fx + 1, fy + 1, LEAF[2])
    }
    g.circle(cx, cy, 2, '#b8432f')
    g.px(cx, cy, GOLD.base)
    // Handle.
    g.rect(cx - 1, cy + 13, 2, 4, TEAK.mid)
    g.px(cx - 1, cy + 17, TEAK.dark)
  },
}

ART.poster_city = {
  up: 0,
  draw(g) {
    g.rect(1, 1, 14, 30, '#fffaf0')
    g.gradientV(2, 2, 12, 18, ['#ffb7a8', '#ffd6a0', '#ffe8c4'], 2)
    // Skyline.
    for (const [x, h, c] of [
      [2, 9, '#8d80ad'],
      [4, 13, '#6c6290'],
      [7, 7, '#8d80ad'],
      [9, 15, '#5a5080'],
      [12, 10, '#6c6290'],
    ] as const)
      g.rect(x, 20 - h, 2 + (x % 3 === 0 ? 1 : 0), h, c)
    for (let y = 8; y < 19; y += 2) g.px(10, y, '#ffe08a')
    // Skytrain on its track.
    g.rect(2, 16, 12, 1, '#d8d2cc')
    g.rect(3, 13, 10, 3, '#eef2f4')
    g.hline(3, 12, 15, '#5fb56a')
    for (let x = 4; x < 12; x += 2) g.px(x, 14, '#5a8de0')
    g.rect(5, 17, 1, 3, '#d8d2cc')
    g.rect(11, 17, 1, 3, '#d8d2cc')
    // Title band.
    g.rect(2, 21, 12, 9, '#3d63b5')
    g.hline(3, 12, 23, '#fffaf0')
    g.hline(3, 9, 25, '#ffd23f')
    g.hline(3, 11, 27, '#fffaf0')
    // Tape.
    g.px(1, 1, '#f3e3c3')
    g.px(14, 1, '#f3e3c3')
    g.px(2, 0, '#f3e3c3')
    g.px(13, 0, '#f3e3c3')
  },
}

const FLAG_COLS = ['#e8514a', '#ffd23f', '#6cc36a', '#5a8de0', '#ff9fc0', '#fffaf0', '#f58f35']

ART.bunting = {
  up: 0,
  draw(g) {
    const pts: [number, number][] = []
    for (let x = 0; x < 48; x++) pts.push([x, Math.round(2 + Math.sin((x / 47) * Math.PI) * 4)])
    for (const [x, y] of pts) g.px(x, y, P.ink2)
    for (let i = 0; i < 7; i++) {
      const x = 2 + i * 6.5
      const y = pts[Math.min(47, Math.round(x + 2))][1] + 1
      g.poly(
        [
          [x, y],
          [x + 5, y],
          [x + 2.5, y + 7],
        ],
        FLAG_COLS[i % FLAG_COLS.length],
      )
      g.hline(Math.round(x), Math.round(x) + 4, y, mix(FLAG_COLS[i % FLAG_COLS.length], '#ffffff', 0.4))
    }
  },
}

ART.lamp_lanna = {
  up: 0,
  frames: 2,
  draw(g, _a, fr) {
    const lit = fr === 1
    const body = lit ? '#ff8a6a' : '#e0524a'
    const bodyD = lit ? '#f0604a' : '#b8343f'
    // Cord from the ceiling.
    g.vline(8, 0, 5, P.ink2)
    // Top frill.
    for (let x = 2; x < 15; x++) g.px(x, 6 + (x % 2), '#fffaf0')
    g.hline(3, 13, 6, GOLD.base)
    // Body.
    g.rect(3, 8, 11, 10, body)
    g.rect(11, 8, 3, 10, bodyD)
    g.hline(3, 13, 12, GOLD.base)
    if (lit) g.rect(5, 9, 4, 7, '#ffd0a0')
    // Bottom frill and tassel tail.
    for (let x = 2; x < 15; x++) g.px(x, 18 + (x % 2), '#fffaf0')
    g.hline(3, 13, 18, GOLD.base)
    for (let y = 20; y < 30; y++) g.px(8 + (y > 25 ? ((y >> 1) % 2) : 0), y, y % 4 < 2 ? '#fffaf0' : body)
    g.px(7, 30, GOLD.base)
    g.px(8, 31, GOLD.base)
    g.px(9, 30, GOLD.base)
  },
}

// The window's static sprite (used for thumbnails; the scene draws it live).
ART.window_big = {
  up: 0,
  outline: null,
  draw(g) {
    g.setCamera(WINDOW.x, WINDOW.y)
    drawWindowGlass(g, 'day', 0, 0)
    drawWindowFrame(g, 0, 0.5)
    g.setCamera(0, 0)
  },
}

// Extra rooms: built-ins, regional furniture and temple models (roomArt.ts).
Object.assign(ART, ROOM_ART)

// ---------------------------------------------------------------------------
// Sprite API

export function furnitureFrameCount(id: string): number {
  return ART[id]?.frames ?? 1
}

function artOf(id: string): Art {
  return ART[id] ?? ART.side_table
}

function footprintPx(id: string): { W: number; D: number } {
  const f = FURNITURE_BY_ID[id]
  if (!f) return { W: TILE_W, D: TILE_H }
  if (f.kind === 'wall') return { W: f.w * WALL_TILE, D: f.h * WALL_TILE }
  return { W: f.w * TILE_W, D: f.h * TILE_H }
}

function bakeArt(id: string, frame: number): HTMLCanvasElement {
  const art = artOf(id)
  const { W, D } = footprintPx(id)
  const padX = art.padX ?? 0
  const cw = W + padX * 2
  const ch = art.up + D
  return bake(cw, ch, (g) => art.draw(g, { W, D, x0: padX, y0: art.up, b: art.up + D }, frame))
}

/** Offset of the footprint's top-left tile corner inside the sprite. */
export function furnitureOrigin(id: string): { ox: number; oy: number } {
  const art = artOf(id)
  const pad = art.outline === null ? 0 : 1
  return { ox: (art.padX ?? 0) + pad, oy: art.up + pad }
}

/** Outlined sprite of a furniture item (optionally mirrored and animated). */
export function furnitureSprite(id: string, flip = false, frame = 0): Sprite {
  const n = furnitureFrameCount(id)
  const fr = ((frame % n) + n) % n
  return cached(`furn:${id}:${fr}:${flip ? 1 : 0}`, () => {
    if (flip) return flipSprite(furnitureSprite(id, false, fr))
    const c = bakeArt(id, fr)
    const art = artOf(id)
    if (art.outline === null) return { canvas: c, w: c.width, h: c.height }
    return outlineCanvas(c, art.outline ?? OUTLINE)
  })
}

/** Downscale by an integer factor, keeping the most common colour of each block. */
function modeDownscale(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const w = Math.ceil(src.width / k)
  const h = Math.ceil(src.height / k)
  const sctx = src.getContext('2d')!
  const data = sctx.getImageData(0, 0, src.width, src.height).data
  const out = createCanvas(w, h)
  const octx = out.getContext('2d')!
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const counts = new Map<number, number>()
      let opaque = 0
      for (let j = 0; j < k; j++)
        for (let i = 0; i < k; i++) {
          const sx = x * k + i
          const sy = y * k + j
          if (sx >= src.width || sy >= src.height) continue
          const o = (sy * src.width + sx) * 4
          if (data[o + 3] < 128) continue
          opaque++
          const key = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2]
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      if (opaque * 2 < k * k) continue
      let best = 0
      let bestN = -1
      for (const [key, n] of counts)
        if (n > bestN) {
          best = key
          bestN = n
        }
      octx.fillStyle = `#${best.toString(16).padStart(6, '0')}`
      octx.fillRect(x, y, 1, 1)
    }
  return out
}

export const THUMB = 24

function centreInThumb(s: Sprite): Sprite {
  const c = createCanvas(THUMB, THUMB)
  const ctx = c.getContext('2d')!
  ctx.drawImage(s.canvas, Math.floor((THUMB - s.w) / 2), Math.floor((THUMB - s.h) / 2))
  return { canvas: c, w: THUMB, h: THUMB }
}

/** 24×24 inventory thumbnail. */
export function furnitureThumb(id: string): Sprite {
  return cached(`furnthumb:${id}`, () => {
    const lit = id === 'lamp_paper' || id === 'lantern_oil' || id === 'lamp_lanna' || id === 's_lantern' || id === 'b_wfh' ? 1 : 0
    const raw = bakeArt(id, lit)
    const art = artOf(id)
    const big = Math.max(raw.width, raw.height)
    const k = big <= THUMB - 2 ? 1 : Math.ceil(big / (THUMB - 2))
    const small = k === 1 ? raw : modeDownscale(raw, k)
    const s = art.outline === null ? { canvas: small, w: small.width, h: small.height } : outlineCanvas(small, art.outline ?? OUTLINE)
    return centreInThumb(s)
  })
}

// ---------------------------------------------------------------------------
// Live effects on top of the static sprites

export interface FxState {
  on: boolean
  /** Seconds since the item was last tapped (for reactions). */
  poke: number
}

/**
 * Draw animated bits for a placed item. (x, y) is the footprint top-left in
 * world pixels. `emissive` is the pass drawn after the night tint.
 */
export function drawFurnitureFx(g: Surface, id: string, x: number, y: number, flip: boolean, t: number, st: FxState, emissive: boolean) {
  const roomFx = ROOM_FX[id]
  if (roomFx) return roomFx(g, x, y, flip, t, st, emissive)
  const { W } = footprintPx(id)
  const mx = (v: number) => (flip ? x + W - 1 - v : x + v)
  switch (id) {
    case 'altar_shelf':
      for (const cx of [7, 25]) flame(g, mx(cx), y + 14, t, cx)
      break
    case 'altar_table':
      for (const cx of [9, 22]) flame(g, mx(cx), y - 7, t, cx)
      if (!emissive) {
        // Incense smoke curls.
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.6 + k / 3) % 1
          const sx = mx(16) + Math.round(Math.sin(ph * 9 + k) * 1.5)
          const sy = y - 11 - Math.round(ph * 12)
          g.alpha(0.6 * (1 - ph))
          g.px(sx, sy, '#f4eef8')
          g.alpha(1)
        }
      }
      break
    case 'clock_wall': {
      if (emissive) break
      const d = new Date()
      const hr = (d.getHours() % 12) + d.getMinutes() / 60
      const mn = d.getMinutes() + d.getSeconds() / 60
      const cx = x + 8
      const cy = y + 8
      const ha = (hr / 12) * Math.PI * 2 - Math.PI / 2
      const ma = (mn / 60) * Math.PI * 2 - Math.PI / 2
      g.line(cx, cy, cx + Math.cos(ma) * 4.4, cy + Math.sin(ma) * 4.4, P.ink)
      g.line(cx, cy, cx + Math.cos(ha) * 2.8, cy + Math.sin(ha) * 2.8, P.ink)
      const sa = ((d.getSeconds() + (t % 1)) / 60) * Math.PI * 2 - Math.PI / 2
      g.px(Math.round(cx + Math.cos(sa) * 4), Math.round(cy + Math.sin(sa) * 4), P.red)
      g.px(cx, cy, P.red)
      break
    }
    case 'aquarium':
      if (!emissive) drawFish(g, x, y, t, st)
      break
    case 'tv_flat':
      if (st.on && emissive) {
        const sx = x + TV_SCREEN.x
        const sy = y + TV_SCREEN.y
        g.ctx.save()
        g.ctx.beginPath()
        g.ctx.rect(sx - g.ox, sy - g.oy, TV_SCREEN.w, TV_SCREEN.h)
        g.ctx.clip()
        drawTvShow(g, sx, sy, t)
        g.ctx.restore()
      }
      break
    case 'lamp_paper':
      if (emissive && st.on) {
        g.ellipse(mx(8), y - 28 + 11, 2.5, 3.5, '#fffbe6')
      }
      break
    case 'lantern_oil':
      if (emissive && st.on) {
        const f = Math.sin(t * 11) > 0 ? 1 : 0
        g.px(mx(8), y - 16 + 11 - f, '#ffd54f')
        g.px(mx(8), y - 16 + 10 - f, '#fff3a6')
      }
      break
    case 'lamp_lanna':
      if (emissive && st.on) g.rect(mx(5) - (flip ? 3 : 0), y + 9, 4, 7, '#ffe0b0')
      break
  }
}

function flame(g: Surface, x: number, baseY: number, t: number, seed: number) {
  const f = Math.sin(t * 12 + seed * 1.7) > 0.2 ? 1 : 0
  g.px(x, baseY, '#ffb347')
  g.px(x, baseY - 1 - f, '#ffd54f')
  g.px(x, baseY - 2 - f, '#fff3a6')
}

const FISH = [
  { c: '#f58f35', c2: '#ffd23f', speed: 7, row: 4, len: 3 },
  { c: '#ff9fc0', c2: '#9270dc', speed: 5, row: 8, len: 3 },
  { c: '#5a8de0', c2: '#e8514a', speed: 9, row: 11, len: 2 },
]

function drawFish(g: Surface, x: number, y: number, t: number, st: FxState) {
  const wx = x + AQUARIUM_WATER.x
  const wy = y + AQUARIUM_WATER.y
  const ww = AQUARIUM_WATER.w
  for (let i = 0; i < FISH.length; i++) {
    const f = FISH[i]
    const excite = st.poke < 2 ? 2 : 1
    const span = ww - f.len - 3
    const ph = ((t * f.speed * excite) / span + i * 0.37) % 2
    const right = ph < 1
    const fx = wx + 1 + Math.round((right ? ph : 2 - ph) * span)
    const fy = wy + f.row + Math.round(Math.sin(t * 2 + i * 2) * 1)
    for (let k = 0; k < f.len; k++) g.px(fx + k, fy, f.c)
    const tail = right ? fx - 1 : fx + f.len
    g.px(tail, fy - 1, f.c2)
    g.px(tail, fy + 1, f.c2)
    g.px(right ? fx + f.len - 1 : fx, fy, P.ink)
  }
  // Bubbles.
  const n = st.poke < 2 ? 5 : 2
  for (let k = 0; k < n; k++) {
    const ph = (t * 0.5 + k * 0.29) % 1
    const bx = wx + 22 + ((k * 3) % 5)
    const by = wy + 12 - Math.round(ph * 12)
    g.px(bx, by, '#e6fbff')
  }
}

function drawTvShow(g: Surface, x: number, y: number, t: number) {
  const w = TV_SCREEN.w
  const h = TV_SCREEN.h
  const scene = Math.floor(t / 4) % 3
  if (scene === 0) {
    // A temple dog bouncing on a hill under the sun.
    g.rect(x, y, w, h, '#a4dcff')
    g.circle(x + w - 5, y + 4, 2.5, '#ffe45e')
    g.ellipse(x + 8, y + h, 12, 5, '#86c95f')
    g.ellipse(x + 22, y + h + 1, 10, 5, '#b4e486')
    const hop = Math.abs(Math.sin(t * 4)) * 3
    const dx = x + 10 + Math.round(Math.sin(t * 1.3) * 5)
    const dy = y + 8 - Math.round(hop)
    g.rect(dx, dy, 5, 3, '#fffaf0')
    g.rect(dx + 4, dy - 2, 3, 3, '#fffaf0')
    g.px(dx + 6, dy - 1, P.ink)
    g.px(dx, dy + 3, '#fffaf0')
    g.px(dx + 4, dy + 3, '#fffaf0')
    g.px(dx - 1, dy - 1 + (Math.floor(t * 8) % 2), '#fffaf0')
  } else if (scene === 1) {
    // Lakorn: two characters and a floating heart.
    g.rect(x, y, w, h, '#ffd6e0')
    g.rect(x, y + h - 4, w, 4, '#e8709e')
    g.rect(x + 6, y + 5, 3, 3, '#f0bd90')
    g.rect(x + 6, y + 8, 3, 3, '#5a8de0')
    g.rect(x + 17, y + 5, 3, 3, '#f0bd90')
    g.rect(x + 17, y + 8, 3, 3, '#e8514a')
    g.rect(x + 5, y + 4, 5, 1, '#3b2f40')
    g.rect(x + 16, y + 4, 5, 2, '#3b2f40')
    const hy = y + 4 - Math.round((t * 3) % 4)
    g.px(x + 12, hy, P.red)
    g.px(x + 14, hy, P.red)
    g.hline(x + 12, x + 14, hy + 1, P.red)
    g.px(x + 13, hy + 2, P.red)
  } else {
    // Thai boxing highlight with colour bars.
    const bars = ['#fffaf0', '#ffe45e', '#78d2e2', '#86c95f', '#ff9fc0', '#e8514a', '#5a8de0']
    for (let i = 0; i < bars.length; i++) g.rect(x + Math.floor((i * w) / bars.length), y, Math.ceil(w / bars.length), h - 4, bars[i])
    g.rect(x, y + h - 4, w, 4, '#3a2838')
    const k = Math.floor(t * 2) % 2
    g.rect(x + 3 + k * 2, y + h - 3, 8, 1, '#fffaf0')
  }
  g.hline(x, x + w - 1, y + Math.floor((t * 20) % h), 'rgba(255,255,255,0.18)')
}

// ---------------------------------------------------------------------------
// Wallpapers

export function drawWallpaper(g: Surface, id: string, x: number, y: number, w: number, h: number) {
  const room = ROOM_WALLPAPER[id]
  if (room) {
    room(g, x, y, w, h)
    g.hline(x, x + w - 1, y, 'rgba(90,60,40,0.18)')
    return
  }
  switch (id) {
    case 'wp_kanok': {
      g.rect(x, y, w, h, '#9c3b3b')
      for (let yy = 0; yy < h; yy += 10)
        for (let xx = ((yy / 10) % 2) * 6; xx < w + 6; xx += 12) {
          const px = x + xx
          const py = y + yy + 3
          // Tiny kanok flame.
          g.px(px, py - 2, '#e0a84a')
          g.hline(px - 1, px, py - 1, '#e0a84a')
          g.hline(px - 1, px + 1, py, '#c98a3a')
          g.px(px + 1, py - 1, '#c98a3a')
          g.px(px, py + 1, '#b07a34')
        }
      g.rect(x, y, w, 3, '#c98a3a')
      g.hline(x, x + w - 1, y + 1, '#ffd54f')
      g.rect(x, y + h - 8, w, 2, '#c98a3a')
      break
    }
    case 'wp_teak': {
      g.rect(x, y, w, h, '#b87843')
      // ฝาปะกน framed panels.
      for (let yy = 0; yy < h; yy += 24)
        for (let xx = 0; xx < w; xx += 16) {
          g.rect(x + xx, y + yy, 16, 24, '#a8683a')
          g.rect(x + xx + 2, y + yy + 2, 12, 20, '#c4834c')
          g.hline(x + xx + 2, x + xx + 13, y + yy + 2, '#d69a60')
          g.vline(x + xx + 13, y + yy + 2, y + yy + 21, '#a8683a')
          g.px(x + xx + 5, y + yy + 9, '#b87843')
          g.px(x + xx + 9, y + yy + 15, '#b87843')
        }
      break
    }
    case 'wp_mint': {
      g.rect(x, y, w, h, '#cdeedd')
      for (let xx = 2; xx < w; xx += 6) g.vline(x + xx, y, y + h - 1, '#e2f7ea')
      for (let yy = 8; yy < h - 10; yy += 16)
        for (let xx = ((yy / 16) % 2) * 12 + 5; xx < w; xx += 24) {
          g.px(x + xx, y + yy, '#8fcfa8')
          g.px(x + xx + 1, y + yy - 1, '#8fcfa8')
          g.px(x + xx - 1, y + yy + 1, '#a8dcbc')
        }
      // White wainscot.
      g.rect(x, y + h - 22, w, 18, '#f6fbf7')
      for (let xx = 0; xx < w; xx += 8) g.vline(x + xx, y + h - 22, y + h - 5, '#e0eee6')
      g.hline(x, x + w - 1, y + h - 23, '#b8e0c8')
      break
    }
    case 'wp_sakura': {
      g.rect(x, y, w, h, '#ffe1e8')
      const r = new Rng(7)
      for (let i = 0; i < (w * h) / 60; i++) {
        const fx = x + r.int(1, w - 2)
        const fy = y + r.int(1, h - 2)
        if (r.chance(0.35)) flowerDot(g, fx, fy, '#ffc2d1', '#fff5f8')
        else g.px(fx, fy, r.chance(0.5) ? '#ffcfdb' : '#fff3f6')
      }
      break
    }
    default: {
      // Cream (the reference condo): warm plaster with a picture rail.
      g.rect(x, y, w, h, '#fbefd9')
      for (let yy = 1; yy < h; yy += 4)
        for (let xx = (yy % 8 === 1 ? 0 : 4); xx < w; xx += 8) g.px(x + xx, y + yy, '#f4e4c8')
      g.hline(x, x + w - 1, y + 6, '#fffaf0')
      g.hline(x, x + w - 1, y + 7, '#ecdcc0')
    }
  }
  // Cornice shadow under the ceiling.
  g.hline(x, x + w - 1, y, 'rgba(90,60,40,0.18)')
}

// ---------------------------------------------------------------------------
// Floors

export function drawFloor(g: Surface, id: string, x: number, y: number, w: number, h: number) {
  const room = ROOM_FLOOR[id]
  if (room) return room(g, x, y, w, h)
  switch (id) {
    case 'fl_parquet': {
      // Basket-weave teak parquet.
      const cols = ['#c4814a', '#b5733f', '#cf8f58']
      for (let by = 0; by < h; by += 6)
        for (let bx = 0; bx < w; bx += 8) {
          const vertical = ((bx >> 3) + (by / 6)) % 2 === 0
          const c = cols[((bx >> 3) * 7 + by) % 3]
          g.rect(x + bx, y + by, 8, 6, c)
          if (vertical) {
            g.vline(x + bx + 2, y + by, y + by + 5, '#a8683a')
            g.vline(x + bx + 5, y + by, y + by + 5, '#a8683a')
          } else {
            g.hline(x + bx, x + bx + 7, y + by + 2, '#a8683a')
          }
          g.hline(x + bx, x + bx + 7, y + by, '#d99c64')
        }
      break
    }
    case 'fl_terrazzo': {
      g.rect(x, y, w, h, '#ece4da')
      const r = new Rng(3)
      const chips = ['#c9b8a8', '#e8a88f', '#9aa3a0', '#ffffff', '#d4c4b0', '#b8c8c0']
      for (let i = 0; i < (w * h) / 9; i++) {
        const cx = x + r.int(0, w - 1)
        const cy = y + r.int(0, h - 1)
        g.px(cx, cy, r.pick(chips))
        if (r.chance(0.2)) g.px(cx + 1, cy, r.pick(chips))
      }
      // Brass divider strips.
      for (let xx = 0; xx < w; xx += 32) g.vline(x + xx, y, y + h - 1, '#d9b77a')
      for (let yy = 0; yy < h; yy += 24) g.hline(x, x + w - 1, y + yy, '#d9b77a')
      break
    }
    case 'fl_mat': {
      // Woven bamboo mat, over-under.
      for (let by = 0; by < h; by += 4)
        for (let bx = 0; bx < w; bx += 4) {
          const alt = ((bx >> 2) + (by >> 2)) % 2 === 0
          g.rect(x + bx, y + by, 4, 4, alt ? '#e8cf8f' : '#dcc07c')
          if (alt) g.hline(x + bx, x + bx + 3, y + by + 1, '#f2dca4')
          else g.vline(x + bx + 1, y + by, y + by + 3, '#c9a864')
        }
      break
    }
    default: {
      // Warm oak planks with staggered joints.
      const r = new Rng(11)
      const tones = ['#e6b680', '#dcaa72', '#e9bf8b', '#e0b079']
      for (let py = 0; py < h; py += 6) {
        let px = -r.int(0, 30)
        while (px < w) {
          const len = r.int(26, 44)
          const c = r.pick(tones)
          g.rect(x + Math.max(0, px), y + py, Math.min(len, w - Math.max(0, px)) - (px < 0 ? -px : 0), 6, c)
          g.hline(x + Math.max(0, px), x + Math.min(w, px + len) - 1, y + py, mix(c, '#fff4e0', 0.25))
          if (px + len < w) g.vline(x + px + len - 1, y + py, y + py + 5, '#c48d5a')
          for (let k = 0; k < 2; k++) {
            const gx = px + r.int(2, len - 6)
            if (gx >= 0 && gx < w - 4) g.hline(x + gx, x + gx + r.int(2, 4), y + py + r.int(2, 4), mix(c, '#b07a48', 0.35))
          }
          px += len
        }
        g.hline(x, x + w - 1, y + py + 5, '#cf9a66')
      }
    }
  }
}

export function drawBaseboard(g: Surface, id: string, x: number, y: number, w: number) {
  const dark = id === 'wp_teak' || id === 'wp_kanok' || DARK_BASEBOARD.has(id)
  g.rect(x, y, w, 4, dark ? '#6b3b24' : '#fffaf0')
  g.hline(x, x + w - 1, y, dark ? '#955631' : '#ffffff')
  g.hline(x, x + w - 1, y + 3, dark ? '#4a2818' : '#e2d4bd')
}

/** 24×24 swatch for the wallpaper/floor picker. */
export function surfaceThumb(id: string): Sprite {
  return cached(`surf:${id}`, () => {
    const c = bake(THUMB, THUMB, (g) => {
      if (id.startsWith('wp_')) {
        drawWallpaper(g, id, 1, 1, THUMB - 2, THUMB - 2)
        drawBaseboard(g, id, 1, THUMB - 5, THUMB - 2)
      } else {
        drawFloor(g, id, 1, 1, THUMB - 2, THUMB - 2)
      }
      g.frame(0, 0, THUMB, THUMB, OUTLINE)
    })
    return { canvas: c, w: THUMB, h: THUMB }
  })
}

// ---------------------------------------------------------------------------
// The big window: sky, Bangkok skyline, skytrain and curtains

interface Tower {
  x: number
  w: number
  h: number
  layer: 0 | 1 | 2
  kind: 'flat' | 'spire' | 'mahanakhon' | 'round' | 'stepped'
}

const TOWERS: Tower[] = (() => {
  const r = new Rng('bkk-skyline')
  const out: Tower[] = []
  let x = -2
  while (x < GLASS.w + 2) {
    const w = r.int(5, 9)
    out.push({ x, w, h: r.int(26, 44), layer: 0, kind: r.chance(0.3) ? 'spire' : 'flat' })
    x += w + r.int(0, 2)
  }
  x = -4
  const kinds: Tower['kind'][] = ['stepped', 'flat', 'round', 'flat', 'stepped', 'flat']
  let i = 0
  while (x < GLASS.w + 4) {
    const w = r.int(8, 12)
    out.push({ x, w, h: r.int(30, 50), layer: 1, kind: kinds[i++ % kinds.length] })
    x += w + r.int(2, 5)
  }
  out.push({ x: 33, w: 9, h: 68, layer: 1, kind: 'mahanakhon' })
  out.push({ x: 2, w: 12, h: 22, layer: 2, kind: 'flat' })
  out.push({ x: 44, w: 14, h: 18, layer: 2, kind: 'flat' })
  return out
})()

interface WindowPalette {
  sky: string[]
  towers: [Color, Color, Color]
  towerD: [Color, Color, Color]
  glass: Color
  lit: number
  cloud: Color
}

const WINDOW_PAL: Record<Phase, WindowPalette> = {
  dawn: {
    sky: ['#8a86c8', '#c98fc0', '#ffb7a8', '#ffe0b0'],
    towers: ['#b8aed0', '#9486b4', '#7a6c98'],
    towerD: ['#a89ec2', '#7f72a2', '#665a86'],
    glass: '#ffd8c4',
    lit: 0.25,
    cloud: '#ffd6dc',
  },
  day: {
    sky: ['#78c4ff', '#a0d8ff', '#c8ecff', '#e6f7ff'],
    towers: ['#c6d6e8', '#9fb3cc', '#8193ad'],
    towerD: ['#b3c5da', '#8ba0bb', '#6d7f9a'],
    glass: '#e2f2ff',
    lit: 0,
    cloud: '#ffffff',
  },
  golden: {
    sky: ['#7aa0e0', '#c9a4d8', '#ffc08a', '#ffe2a0'],
    towers: ['#e0bfae', '#bf9696', '#9a7584'],
    towerD: ['#d2ae9e', '#a8828a', '#806274'],
    glass: '#ffe0a0',
    lit: 0.15,
    cloud: '#ffe6c4',
  },
  dusk: {
    sky: ['#3c3a78', '#7a5a9e', '#d97a98', '#ffa47e'],
    towers: ['#8a79a8', '#65588a', '#4b416e'],
    towerD: ['#7a6a98', '#554a7a', '#3e355e'],
    glass: '#ffd98a',
    lit: 0.45,
    cloud: '#c9a0c8',
  },
  night: {
    sky: ['#12143a', '#1f2358', '#2e3a78', '#3e4c8c'],
    towers: ['#303670', '#23285a', '#1a1d45'],
    towerD: ['#282d62', '#1c204c', '#14163a'],
    glass: '#ffe08a',
    lit: 0.55,
    cloud: '#46508a',
  },
}

/** Deterministic "is this window lit" per building cell. */
function litAt(i: number, x: number, y: number): number {
  const h = Math.sin(i * 12.9898 + x * 78.233 + y * 37.719) * 43758.5453
  return h - Math.floor(h)
}

const TRAIN_Y = GLASS.h - 16

function drawTower(g: Surface, t: Tower, gx: number, gy: number, pal: WindowPalette, night: boolean, idx: number) {
  const base = gy + GLASS.h
  const x = gx + t.x
  const top = base - t.h
  const c = pal.towers[t.layer]
  const cd = pal.towerD[t.layer]
  if (t.kind === 'round') {
    g.rect(x, top + 3, t.w, t.h - 3, c)
    g.ellipse(x + t.w / 2, top + 3, t.w / 2, 3, c)
  } else if (t.kind === 'stepped') {
    g.rect(x, top + 6, t.w, t.h - 6, c)
    g.rect(x + 2, top + 2, t.w - 4, 4, c)
    g.rect(x + t.w / 2 - 1, top - 2, 2, 4, c)
  } else if (t.kind === 'spire') {
    g.rect(x, top, t.w, t.h, c)
    g.vline(x + Math.floor(t.w / 2), top - 5, top - 1, cd)
  } else if (t.kind === 'mahanakhon') {
    g.rect(x, top, t.w, t.h, c)
    // The famous pixelated "cut" spiralling up the tower.
    for (let yy = 4; yy < t.h - 4; yy++) {
      const s = Math.floor(Math.sin(yy * 0.18) * 2 + 2)
      for (let k = 0; k < s; k++) g.px(x + t.w - 1 - k, top + yy, (yy + k) % 2 ? pal.sky[1] : cd)
    }
  } else {
    g.rect(x, top, t.w, t.h, c)
  }
  // Shade on the right side.
  g.rect(x + t.w - 2, top + (t.kind === 'round' ? 3 : t.kind === 'stepped' ? 6 : 0), 1, t.h, cd)
  // Windows.
  if (t.layer > 0) {
    for (let yy = top + 3; yy < base - 2; yy += 3)
      for (let xx = x + 1; xx < x + t.w - 2; xx += 2) {
        if (night) {
          if (litAt(idx, xx - gx, yy - gy) < pal.lit * 0.5) g.px(xx, yy, pal.glass)
          else g.px(xx, yy, cd)
        } else if ((xx + yy) % 5 === 0) g.px(xx, yy, pal.glass)
        else if (t.layer === 1) g.px(xx, yy, cd)
      }
  } else if (night) {
    for (let yy = top + 3; yy < base - 2; yy += 4)
      for (let xx = x + 1; xx < x + t.w - 1; xx += 3) if (litAt(idx, xx - gx, yy - gy) < pal.lit * 0.4) g.px(xx, yy, mix(pal.glass, pal.towers[0], 0.4))
  }
}

/** Sky + skyline + skytrain inside the window glass. */
export function drawWindowGlass(g: Surface, phase: Phase, t: number, trainT: number) {
  const pal = WINDOW_PAL[phase]
  const night = phase === 'night' || phase === 'dusk'
  const gx = GLASS.x
  const gy = GLASS.y
  g.gradientV(gx, gy, GLASS.w, GLASS.h - 10, pal.sky, 4)
  g.rect(gx, gy + GLASS.h - 10, GLASS.w, 10, pal.sky[pal.sky.length - 1])
  if (night) {
    for (let i = 0; i < 14; i++) {
      const sx = gx + ((i * 23) % GLASS.w)
      const sy = gy + ((i * 17) % 26)
      if (Math.sin(t * 1.5 + i * 2.1) > -0.3) g.px(sx, sy, i % 4 === 0 ? '#fff3a6' : '#e2e8ff')
    }
    // Moon.
    g.circle(gx + 12, gy + 10, 4, '#fff6c8')
    g.circle(gx + 13.5, gy + 9, 3.4, pal.sky[0])
  } else if (phase === 'day') {
    g.ditherCircle(gx + GLASS.w - 12, gy + 10, 9, '#fffbe0', 0.5)
    g.circle(gx + GLASS.w - 12, gy + 10, 3.5, '#fffbe0')
  } else {
    g.ditherCircle(gx + (phase === 'dawn' ? 12 : GLASS.w - 14), gy + 40, 10, '#fff0b8', 0.6)
    g.circle(gx + (phase === 'dawn' ? 12 : GLASS.w - 14), gy + 40, 4, '#fff3c4')
  }
  // Drifting clouds.
  for (let i = 0; i < 2; i++) {
    const span = GLASS.w + 30
    const cx = gx - 15 + ((((i * 37 + t * (1.5 + i)) % span) + span) % span)
    const cy = gy + 14 + i * 9
    g.ellipse(cx, cy, 7 + i * 2, 2.2, pal.cloud)
    g.ellipse(cx - 4, cy + 1, 4, 1.6, pal.cloud)
  }
  // Clip the skyline to the glass.
  g.ctx.save()
  g.ctx.beginPath()
  g.ctx.rect(gx - g.ox, gy - g.oy, GLASS.w, GLASS.h)
  g.ctx.clip()
  TOWERS.forEach((tw, i) => {
    if (tw.layer === 0) drawTower(g, tw, gx, gy, pal, night, i)
  })
  TOWERS.forEach((tw, i) => {
    if (tw.layer === 1) drawTower(g, tw, gx, gy, pal, night, i)
  })
  // Aviation light on the tallest tower.
  if (night && Math.sin(t * 3) > 0) g.px(gx + 37, gy + GLASS.h - 70, '#ff5a5a')
  // Skytrain viaduct and train.
  const ty = gy + TRAIN_Y
  const concrete = night ? '#6a6a8e' : phase === 'golden' ? '#e8c8b0' : '#e0dcd6'
  const concreteD = night ? '#4e4e72' : phase === 'golden' ? '#c8a894' : '#bdb6ae'
  for (let px = 4; px < GLASS.w; px += 18) g.rect(gx + px, ty + 3, 3, GLASS.h - TRAIN_Y - 3, concreteD)
  const period = 24
  const ph = (trainT % period) / period
  const trainX = gx - 34 + ph * (GLASS.w + 70)
  if (ph < 0.75) {
    const body = night ? '#b8c0d8' : '#eef2f4'
    g.rect(trainX, ty - 5, 32, 5, body)
    g.rect(trainX + 32, ty - 4, 2, 4, body)
    g.hline(trainX, trainX + 33, ty - 1, '#5fb56a')
    for (let wx = 2; wx < 31; wx += 3) g.px(trainX + wx, ty - 3, night ? '#fff3c4' : '#5a8de0')
    g.vline(trainX + 16, ty - 5, ty - 1, night ? '#8a90aa' : '#cfd5dc')
  }
  g.rect(gx, ty, GLASS.w, 3, concrete)
  g.hline(gx, gx + GLASS.w - 1, ty + 2, concreteD)
  TOWERS.forEach((tw, i) => {
    if (tw.layer === 2) drawTower(g, tw, gx, gy, pal, night, i)
  })
  // Treetops along the bottom.
  for (let k = 0; k < 7; k++) {
    const tx = gx + k * 9 + (k % 2) * 3
    g.ellipse(tx, gy + GLASS.h - 2, 5, 3.2, night ? '#1f3a3a' : phase === 'golden' ? '#7a9a58' : '#5ea653')
    g.ellipse(tx - 1, gy + GLASS.h - 3, 3, 1.6, night ? '#2a4a44' : phase === 'golden' ? '#9ab86a' : '#86c95f')
  }
  g.ctx.restore()
}

/** Lit city windows and the train redrawn after the night tint so they glow. */
export function drawWindowEmissive(g: Surface, phase: Phase, t: number, trainT: number, sheer: number) {
  if (phase !== 'night' && phase !== 'dusk') return
  const pal = WINDOW_PAL[phase]
  const gx = GLASS.x
  const gy = GLASS.y
  const cover = sheerRects(sheer, t)
  const under = (x: number) => cover.some(([a, b]) => x >= a && x < b)
  g.ctx.save()
  g.ctx.beginPath()
  g.ctx.rect(gx - g.ox, gy - g.oy, GLASS.w, GLASS.h)
  g.ctx.clip()
  TOWERS.forEach((tw, i) => {
    if (tw.layer === 0) return
    const base = gy + GLASS.h
    const top = base - tw.h
    const x = gx + tw.x
    for (let yy = top + 3; yy < base - 2; yy += 3)
      for (let xx = x + 1; xx < x + tw.w - 2; xx += 2) {
        const v = litAt(i, xx - gx, yy - gy)
        if (v >= pal.lit * 0.5) continue
        // A few windows switch on and off.
        if (v < 0.02 && Math.sin(t * 0.7 + xx) < 0) continue
        g.alpha(under(xx) ? 0.45 : 0.9)
        g.px(xx, yy, v < pal.lit * 0.2 ? '#fff3c4' : pal.glass)
      }
  })
  g.alpha(1)
  const ty = gy + TRAIN_Y
  const ph = (trainT % 24) / 24
  if (ph < 0.75) {
    const trainX = gx - 34 + ph * (GLASS.w + 70)
    for (let wx = 2; wx < 31; wx += 3) {
      const px = Math.round(trainX + wx)
      g.alpha(under(px) ? 0.5 : 1)
      g.px(px, ty - 3, '#fff3c4')
    }
    g.alpha(1)
  }
  if (Math.sin(t * 3) > 0) g.px(gx + 37, gy + GLASS.h - 70, '#ff5a5a')
  g.ctx.restore()
}

/**
 * Horizontal spans of the two sheer curtains (world x). `open` 0 = drawn
 * closed across the glass, 1 = gathered to the sides.
 */
function sheerRects(open: number, t: number): [number, number][] {
  const gx = GLASS.x
  const half = GLASS.w / 2
  const reach = Math.round(half * (1 - open * 0.72))
  const sway = Math.round(Math.sin(t * 0.8) * 1)
  return [
    [gx, gx + reach + sway],
    [gx + GLASS.w - reach + sway, gx + GLASS.w],
  ]
}

const CURTAIN = { hi: '#c9dcc0', base: '#a9c29f', dark: '#86a283', deep: '#6a8a6c' }

/** Window frame, sheer curtains, heavy side curtains and rod. */
export function drawWindowFrame(g: Surface, t: number, open: number, breeze = 0) {
  const W0 = WINDOW.x
  const W1 = WINDOW.x + WINDOW.w
  const H = WALL_H
  // Aluminium frame and mullions.
  const fr = '#eeeae4'
  const frD = '#cfc8be'
  g.rect(W0, 0, WINDOW.w, 3, fr)
  g.rect(W0, 0, 3, H, fr)
  g.rect(W1 - 3, 0, 3, H, fr)
  g.rect(W0, H - 2, WINDOW.w, 2, frD)
  g.vline(W0 + 2, 3, H - 1, frD)
  g.vline(W1 - 1, 0, H - 1, frD)
  const mid = W0 + WINDOW.w / 2
  g.rect(mid - 1, 3, 2, H - 5, fr)
  g.vline(mid, 3, H - 3, frD)
  g.rect(W0 + 3, 22, WINDOW.w - 6, 2, fr)
  g.hline(W0 + 3, W1 - 4, 23, frD)
  // Balcony rail silhouette at the bottom of the glass.
  g.alpha(0.55)
  g.rect(W0 + 3, H - 14, WINDOW.w - 6, 1, '#f4f2ee')
  for (let x = W0 + 5; x < W1 - 4; x += 4) g.vline(x, H - 13, H - 3, '#f4f2ee')
  g.alpha(1)
  // Sheer curtains.
  const spans = sheerRects(open, t)
  g.alpha(0.55)
  for (const [a, b] of spans) {
    g.rect(a, 3, b - a, H - 4, '#fffdf8')
    for (let x = a + 1; x < b; x += 3) {
      const wav = Math.round(Math.sin(t * (1.2 + breeze * 3) + x * 0.6) * (0.6 + breeze * 1.2))
      g.vline(x + wav, 5, H - 3, '#ffffff')
    }
  }
  g.alpha(0.3)
  for (const [a, b] of spans) for (let x = a + 2; x < b; x += 3) g.vline(x, 4, H - 3, '#e8e2d8')
  g.alpha(1)
  // Heavy curtains, gathered at the sides with a tie-back.
  for (const side of [-1, 1] as const) {
    const edge = side < 0 ? W0 - 4 : W1 + 4
    const inner = side < 0 ? W0 + 8 : W1 - 8
    const a = Math.min(edge, inner)
    const w = Math.abs(inner - edge)
    for (let y = 2; y < H + 1; y++) {
      // Hourglass shape at the tie-back.
      const pinch = y > 44 && y < 56 ? Math.round(3 - Math.abs(y - 50) * 0.5) : 0
      const sway = y > 56 ? Math.round(Math.sin(t * 0.9 + y * 0.12) * 0.6 * (y - 56) * 0.05 * (1 + breeze * 3)) : 0
      const x0 = side < 0 ? a : a + Math.max(0, pinch)
      const x1 = side < 0 ? a + w - Math.max(0, pinch) : a + w
      for (let x = x0; x < x1; x++) {
        const k = (x - a + (side < 0 ? 0 : 1)) % 4
        const c = k === 0 ? CURTAIN.hi : k === 3 ? CURTAIN.dark : CURTAIN.base
        g.px(x + sway, y, c)
      }
      g.px((side < 0 ? x1 : x0 - 1) + sway, y, CURTAIN.deep)
    }
    // Tie-back.
    const tb = side < 0 ? a + 1 : a + 4
    g.rect(tb, 49, 7, 2, GOLD.base)
    g.px(tb + 3, 51, GOLD.dark)
    g.px(tb + 3, 52, GOLD.dark)
  }
  // Rod with finials and rings.
  g.rect(W0 - 6, 1, WINDOW.w + 12, 2, TEAK.dark)
  g.hline(W0 - 6, W1 + 5, 1, TEAK.mid)
  g.circle(W0 - 6, 2, 1.6, GOLD.base)
  g.circle(W1 + 5, 2, 1.6, GOLD.base)
}

// ---------------------------------------------------------------------------
// Crafting materials (12×12 icons)

const MAT_DRAW: Record<MaterialId, (g: Surface) => void> = {
  wood: (g) => {
    // A log with a ring end and a sprout.
    g.rect(1, 4, 8, 6, TEAK.mid)
    g.hline(1, 8, 4, TEAK.hi)
    g.hline(1, 8, 9, TEAK.dark)
    g.hline(2, 5, 6, TEAK.dark)
    g.hline(4, 7, 8, TEAK.dark)
    g.ellipse(8.5, 7, 2.5, 3.2, OAK.top)
    g.px(8, 7, OAK.dark)
    g.px(9, 6, OAK.mid)
    g.px(3, 3, LEAF[2])
    g.px(4, 2, LEAF[1])
    g.px(2, 2, LEAF[1])
  },
  cloth: (g) => {
    // Two folded fabrics.
    g.rect(1, 6, 10, 4, '#5fb3af')
    g.hline(1, 10, 6, '#8fd3cf')
    g.hline(1, 10, 8, '#ffd23f')
    g.rect(2, 2, 8, 4, '#ff9fc0')
    g.hline(2, 9, 2, '#ffd6e0')
    g.px(4, 4, '#fffaf0')
    g.px(7, 4, '#fffaf0')
    g.vline(10, 3, 5, '#e8709e')
  },
  clay: (g) => {
    // Little terracotta pot.
    g.rect(2, 2, 8, 2, CLAY.hi)
    g.poly(
      [
        [2, 4],
        [10, 4],
        [9, 11],
        [3, 11],
      ],
      CLAY.base,
    )
    g.rect(7, 4, 2, 6, CLAY.dark)
    g.hline(3, 8, 6, '#f4d6a0')
    g.px(4, 5, CLAY.hi)
  },
  gold: (g) => {
    // A sheet of gold leaf with a curled corner.
    g.rect(1, 2, 9, 9, GOLD.base)
    g.hline(1, 9, 2, GOLD.light)
    g.vline(1, 2, 10, GOLD.light)
    g.rect(7, 8, 3, 3, GOLD.dark)
    g.px(9, 8, GOLD.deep)
    g.px(3, 4, '#ffffff')
    g.px(4, 5, GOLD.light)
    g.px(10, 1, '#ffffff')
    g.px(11, 2, GOLD.light)
  },
  flower: (g) => {
    // Frangipani (ลีลาวดี).
    const petal = '#fffaf0'
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2 - Math.PI / 2
      g.ellipse(6 + Math.cos(ang) * 2.8, 6 + Math.sin(ang) * 2.8, 2.2, 2.2, petal)
    }
    g.circle(6, 6, 1.8, '#ffd23f')
    g.px(6, 6, '#f58f35')
    g.px(4, 3, '#fff3a6')
  },
}

export function materialSprite(id: MaterialId): Sprite {
  return cached(`mat:${id}`, () => {
    const inner = bake(10, 10, (g) => {
      g.setCamera(1, 1)
      MAT_DRAW[id](g)
    })
    return outlineCanvas(inner, OUTLINE)
  })
}

// ---------------------------------------------------------------------------
// Kitchen (cooking): stove counter (interact 'cook'), fridge and rice cooker.

ART.kitchen_stove = {
  up: 16,
  draw(g, a) {
    const { b } = a
    // Wok simmering on the left burner, a kettle on the right.
    g.ellipse(10, 10, 8, 3, '#3a3a46')
    g.ellipse(10, 9.5, 6.5, 2, '#5a5a66')
    g.ellipse(10, 9, 4, 1.2, '#a8704f')
    g.px(8, 8, '#3f9a4a')
    g.px(12, 9, '#e8413a')
    g.rect(1, 9, 2, 2, '#c28e5c')
    g.rect(22, 3, 7, 7, METAL.base)
    g.hline(22, 28, 3, METAL.hi)
    g.rect(24, 1, 3, 2, '#e8514a')
    g.line(29, 5, 31, 3, METAL.dark)
    // Steam.
    g.px(9, 3, '#ffffff')
    g.px(10, 1, '#ffffff')
    g.px(26, 0, '#ffffff')
    // Countertop with a stainless hob.
    box(g, 0, 11, 32, 5, b - 16, OAK)
    g.rect(3, 12, 26, 3, '#c9ced6')
    g.hline(3, 28, 12, '#eef1f5')
    // Cabinet doors and knobs.
    g.rect(2, 19, 13, b - 21, OAK.top)
    g.rect(17, 19, 13, b - 21, OAK.top)
    g.hline(2, 14, 19, OAK.hi)
    g.hline(17, 29, 19, OAK.hi)
    g.px(13, 23, GOLD.base)
    g.px(18, 23, GOLD.base)
    for (const kx of [6, 10, 22, 26]) g.px(kx, 17, '#3a3648')
    g.rect(0, b - 2, 32, 2, OAK.dark)
  },
}

ART.kitchen_fridge = {
  up: 30,
  draw(g, a) {
    const { b } = a
    const M = { hi: '#e4fbf1', top: '#c8f0dd', mid: '#a9e3c8', dark: '#7fc8a6', deep: '#5aa585' }
    g.rect(1, 0, 14, b, M.mid)
    g.rect(1, 0, 14, 2, M.hi)
    g.vline(1, 0, b - 1, M.hi)
    g.vline(14, 2, b - 1, M.dark)
    g.hline(1, 14, 13, M.deep)
    g.rect(12, 4, 1, 6, '#fffaf0')
    g.rect(12, 16, 1, 8, '#fffaf0')
    // Cute magnets: a tiny temple and a heart.
    g.rect(4, 5, 3, 2, '#f58f35')
    g.px(5, 4, '#f58f35')
    g.rect(4, 7, 3, 1, '#fffaf0')
    g.px(7, 18, '#ff6f91')
    g.px(8, 18, '#ff6f91')
    g.px(7, 19, '#ff6f91')
    g.px(8, 19, '#ff6f91')
    g.rect(3, 22, 4, 5, '#fffaf0')
    g.hline(3, 6, 23, '#9fc4ee')
    g.rect(2, b - 2, 12, 2, M.deep)
  },
}

ART.rice_cooker = {
  up: 12,
  draw(g, a) {
    const { b } = a
    // Little stool.
    g.rect(1, 13, 14, 3, TEAK.top)
    g.hline(1, 14, 13, TEAK.hi)
    leg(g, 2, 16, b, TEAK)
    leg(g, 12, 16, b, TEAK)
    // Flowery cooker.
    g.ellipse(8, 9, 6, 4.5, '#fffaf0')
    g.rect(2, 6, 12, 4, '#fffaf0')
    g.ellipse(8, 5, 6, 2.2, '#f0e6d6')
    g.ellipse(8, 4.5, 5, 1.6, '#fffaf0')
    g.rect(7, 2, 2, 2, '#e8514a')
    for (const [x, y, c] of [
      [4, 8, '#ff9fc0'],
      [8, 10, '#ffd23f'],
      [12, 8, '#ff9fc0'],
    ] as [number, number, string][])
      flowerDot(g, x, y, c, '#e8514a')
    g.px(13, 11, '#6fcf8f')
    g.px(4, 1, '#ffffff')
    g.px(5, 0, '#ffffff')
  },
}
