// วัดโสธรวรารามวรวิหาร (ฉะเชิงเทรา): the gleaming white-and-gold ubosot with
// its tall central spire on the Bang Pakong river, home of หลวงพ่อพุทธโสธร.
// People fulfil vows (แก้บน) with trays of boiled eggs and Thai dance
// performances; a riverside market sells แปดริ้ว mangoes and ขนมจาก.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, roofBand, bargeBoard, hangHong, chofa, gable, column, crown, lacquerPanel, valance, nagaRail, type Building, type Pt, type RoofRamp } from '../temple'
import type { Prop } from '../props'
import { GOLD_RAMP } from '../hall'
import { block, building, Cap, clamp01, dth, Ell, hash, lathe, prop, RAMPS, sculpted, stallProp, type Prim } from './central'

/** White glazed roof tiles with gold borders. */
export const WHITE_ROOF: RoofRamp = { field: '#f3eee9', fieldD: '#d6ccd2', fieldL: '#ffffff', border: '#ffd54f', borderD: '#e0a526', under: '#8a7a8a' }

const WHITE_GABLE = { field: '#fffaf0', fieldD: '#e8dccb', sparkA: '#ffe38a', sparkB: '#ffffff' }

// ---------------------------------------------------------------------------
// The ubosot.

export const UBOSOT = { W: 232, H: 262 }

/**
 * The white ubosot with a golden spire. Anchor = bottom of the front stairs.
 * Hooks: glints, bells, candles, door.
 */
export function sothonUbosotSprite(night = false): Building {
  const { W, H } = UBOSOT
  return building(`sothon-ubosot:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    const bells: Pt[] = []
    const floor = H - 44
    // --- central spire (ยอดมงกุฎ) rising behind the ridge ---
    const spBase = 96
    let y = spBase
    const tiers = [
      [14, 25],
      [12, 20],
      [11, 16],
      [10, 13],
      [9, 10.5],
      [8, 8.5],
      [7, 6.8],
      [6, 5.4],
    ]
    for (const [h, half] of tiers) {
      y -= h
      block(g, cx, y, h - 2, half, RAMPS.white)
      block(g, cx, y + h - 2, 2, half + 1.5, RAMPS.gold)
      // Tiny gold arched niches on the tiers.
      if (half > 9) for (const s of [-1, 1]) {
        g.rect(cx + s * (half * 0.45) - 1, y + 2, 3, h - 6, GOLD.d)
        g.rect(cx + s * (half * 0.45), y + 3, 1, h - 7, night ? '#fff0b8' : '#8a6a7a')
      }
      g.rect(cx - 1, y + 2, 3, Math.max(1, h - 6), GOLD.d)
    }
    // Golden bud and finial.
    lathe(g, cx, y - 26, y, (yy) => 0.6 + ((yy - (y - 26)) / 26) * 4.2, RAMPS.gold, { rowH: 3, spec: 0.6, specPow: 6 })
    g.px(cx, y - 28, GOLD.L)
    g.px(cx, y - 27, GOLD.l)
    glints.push({ x: cx, y: y - 27 }, { x: cx - 3, y: y - 10 }, { x: cx - 8, y: spBase - 40 })
    // --- roofs: rear main roof, wide side wings, front porch ---
    const A2 = 58
    const B2 = 118
    const HW2 = 62
    // Roof mass: white tiles in rows behind the gables.
    tiledPoly(
      g,
      [
        [cx, A2 - 6],
        [cx + HW2 + 44, B2 + 36],
        [cx - HW2 - 44, B2 + 36],
      ],
      WHITE_ROOF,
    )
    roofBand(g, cx, A2, cx - HW2, B2, 13, WHITE_ROOF, 6)
    roofBand(g, cx, A2, cx + HW2, B2, 13, WHITE_ROOF, 6)
    for (const s of [-1, 1]) {
      const ax = cx + s * (HW2 - 8)
      const ay = B2 - 6
      const bx = cx + s * (HW2 + 26)
      const by = B2 + 16
      roofBand(g, ax, ay, bx, by, 10, WHITE_ROOF, 5)
      bargeBoard(g, ax, ay, bx, by, 3)
      hangHong(g, bx + s, by + 1, s)
      const cx2 = cx + s * (HW2 + 18)
      const cy2 = B2 + 14
      const dx2 = cx + s * (HW2 + 44)
      const dy2 = B2 + 34
      roofBand(g, cx2, cy2, dx2, dy2, 9, WHITE_ROOF, 5)
      bargeBoard(g, cx2, cy2, dx2, dy2, 3)
      hangHong(g, dx2 + s, dy2 + 1, s)
      glints.push({ x: bx + s * 3, y: by - 3 }, { x: dx2 + s * 3, y: dy2 - 3 })
      bells.push({ x: bx + s, y: by + 4 }, { x: dx2 + s, y: dy2 + 4 })
    }
    glints.push(...gable(g, cx, A2, HW2, B2, { ...WHITE_GABLE, motif: 'emblem' }))
    const A1 = 96
    const B1 = 140
    const HW1 = 50
    roofBand(g, cx, A1, cx - HW1, B1, 9, WHITE_ROOF, 5)
    roofBand(g, cx, A1, cx + HW1, B1, 9, WHITE_ROOF, 5)
    glints.push(...gable(g, cx, A1, HW1, B1, { ...WHITE_GABLE, motif: 'narai' }))
    bells.push({ x: cx - HW1 - 2, y: B1 + 4 }, { x: cx + HW1 + 2, y: B1 + 4 })
    // --- walls in the verandah shade ---
    const wl = cx - HW2 - 42
    const wr = cx + HW2 + 42
    g.rect(wl, B1 + 1, wr - wl, floor - B1 - 1, '#f6f0e8')
    g.rect(wl, B1 + 1, wr - wl, 4, '#d8ccd0')
    g.rect(wl, B1 + 5, wr - wl, 2, '#e6dcdc')
    g.rect(wl, B1, wr - wl, 1, GOLD.l)
    g.rect(wl, B1 + 1, wr - wl, 1, GOLD.d)
    // Door and windows with gold crowns.
    const dw = 16
    const dh = 32
    crown(g, cx, floor - dh - 1, dw + 8, 16)
    lacquerPanel(g, cx - dw / 2, floor - dh, dw, dh, night, 2)
    if (!night) {
      // White-gold lacquer instead of red: repaint the leaves.
      goldShutter(g, cx - dw / 2, floor - dh, dw, dh)
    }
    hooks.door = [{ x: cx, y: floor }]
    for (const wx of [cx - 34, cx + 34, cx - 64, cx + 64, cx - 92, cx + 92]) {
      const ww = 8
      const wy = floor - 28
      crown(g, wx, wy - 1, ww + 4, 9)
      lacquerPanel(g, wx - ww / 2, wy, ww, 16, night, 2)
      if (!night) goldShutter(g, wx - ww / 2, wy, ww, 16)
    }
    // Gold-capped white columns.
    for (const x of [cx - 20, cx + 17, cx - 48, cx + 45, cx - 78, cx + 75, cx - 104, cx + 101]) column(g, x, B1 + 8, floor, 4)
    valance(g, cx - 44, cx - 21, B1 + 7)
    valance(g, cx + 21, cx + 45, B1 + 7)
    valance(g, cx - 74, cx - 49, B1 + 7)
    valance(g, cx + 49, cx + 75, B1 + 7)
    // --- high marble platform with a balustrade ---
    const pl = wl - 6
    const pw = wr - wl + 12
    g.rect(pl, floor, pw, 20, '#f6f2ee')
    g.hline(pl, pl + pw - 1, floor, '#ffffff')
    g.rect(pl, floor + 5, pw, 3, GOLD.d)
    g.hline(pl, pl + pw - 1, floor + 5, GOLD.l)
    for (let x = pl + 2; x < pl + pw; x += 5) g.rect(x, floor + 10, 2, 8, '#e0d6d6')
    g.hline(pl, pl + pw - 1, floor + 19, '#c9bfc4')
    // Balustrade posts on the platform edge.
    for (let x = pl + 4; x < pl + pw - 2; x += 14) {
      if (Math.abs(x - cx) < 30) continue
      g.rect(x, floor - 5, 3, 6, '#ffffff')
      g.px(x + 1, floor - 6, GOLD.b)
    }
    // Front stairs with white naga.
    for (let i = 0; i < 8; i++) {
      const yy = floor + 1 + i * 3
      const half = 22 + i * 2
      g.rect(cx - half, yy, half * 2 + 1, 3, '#fbf8f4')
      g.hline(cx - half, cx + half, yy, '#ffffff')
      g.hline(cx - half, cx + half, yy + 2, '#dcd2d6')
    }
    for (const s of [-1, 1]) nagaRail(g, cx + s * 24, floor - 4, cx + s * 40, H - 2, s, '#f2ece6', GOLD.b)
    hooks.glints = glints
    hooks.bells = bells
    hooks.candles = [
      { x: cx - 14, y: floor - 7 },
      { x: cx + 14, y: floor - 7 },
    ]
    for (const s of [-1, 1]) {
      g.rect(cx + s * 14 - 1, floor - 5, 3, 5, GOLD.d)
      g.px(cx + s * 14, floor - 6, WHITE.b)
    }
  })
}

/** Fill a polygon with roof tiles (rows, staggered joints, highlights). */
function tiledPoly(g: Surface, pts: [number, number][], r: RoofRamp) {
  g.poly(pts, r.field)
  let y0 = Infinity
  let y1 = -Infinity
  for (const [, y] of pts) {
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  // Re-scan rows inside the polygon to add the tile pattern.
  for (let y = Math.floor(y0); y <= y1; y++) {
    const xs: number[] = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) {
        if (y % 3 === 0) g.px(x, y, r.fieldD)
        else if ((x + (Math.floor(y / 3) % 2) * 2) % 4 === 0 && y % 3 === 2) g.px(x, y, r.fieldD)
        else if (y % 3 === 1 && (x + y) % 9 === 0) g.px(x, y, r.fieldL)
      }
  }
}

/** Gold-lacquered shutter with ลายรดน้ำ flecks. */
function goldShutter(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#e9b84a')
  for (let j = 1; j < h - 1; j += 2) for (let i = 1; i < w - 1; i++) if ((i + j) % 3 === 0) g.px(x + i, y + j, GOLD.l)
  g.rect(x, y, w, 1, GOLD.D)
  g.vline(x + Math.floor(w / 2) - (w % 2 ? 0 : 1), y, y + h - 1, GOLD.D)
  g.px(x + 1, y + (h >> 1), '#fff8d8')
  g.px(x + w - 2, y + (h >> 1), '#fff8d8')
}

// ---------------------------------------------------------------------------
// Courtyard pieces.

/** Tray piled with a pyramid of boiled eggs (ไข่ต้มแก้บน). */
export function drawEggTray(g: Surface, cx: number, y: number, n = 3, tray: Color = '#c9a04c') {
  g.ellipse(cx, y + 1, n * 3 + 2, 2, mixHex(tray, '#3a2838', 0.35))
  g.ellipse(cx, y, n * 3 + 2, 1.6, tray)
  for (let r = 0; r < n; r++)
    for (let i = 0; i < n - r; i++) {
      const ex = cx - (n - r - 1) * 2.5 + i * 5
      const ey = y - 2 - r * 3
      g.ellipse(ex, ey, 2.2, 1.8, '#fffaf0')
      g.px(ex - 1, ey - 1, '#ffffff')
      g.px(ex + 1, ey + 1, '#e8dcc8')
    }
}

/** Long offering table with rows of egg trays and garlands. */
export function eggTableSprite(w = 56, seed = 0): Prop {
  return prop(`sothon-eggtable:${w}:${seed}`, w + 2, 24, (w + 2) >> 1, 23, (g) => {
    g.rect(1, 12, w, 6, '#e8514a')
    g.rect(1, 12, w, 1, '#ff8a7a')
    g.rect(1, 17, w, 1, GOLD.d)
    for (let x = 2; x < w; x += 3) g.px(x, 15, (x >> 1) % 2 ? '#fffaf0' : '#ffd23f')
    g.rect(3, 18, 2, 6, '#7e2436')
    g.rect(w - 3, 18, 2, 6, '#7e2436')
    const k = Math.floor((w - 4) / 12)
    for (let i = 0; i < k; i++) drawEggTray(g, 8 + i * 12, 11, 2 + ((i + seed) % 2), i % 2 ? '#c9a04c' : '#e0c080')
    // A garland on top.
    g.circle(w - 5, 9, 2.4, '#ffd23f')
    g.px(w - 5, 9, '#f58f35')
  })
}

/** Open dance pavilion (ศาลารำแก้บน) with a red cloth backdrop. Anchor = front centre. */
export function danceSalaSprite(): Building {
  const W = 84
  const H = 66
  return building('sothon-dancesala', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    // Stage floor.
    g.rect(2, H - 12, W - 4, 11, '#9a6a45')
    g.rect(2, H - 12, W - 4, 2, '#c28e5c')
    for (let x = 4; x < W - 4; x += 6) g.vline(x, H - 10, H - 2, '#7a5238')
    g.rect(2, H - 3, W - 4, 2, '#6e4a35')
    // Backdrop: red velvet with gold swags.
    g.rect(6, 22, W - 12, H - 34, '#b8343f')
    for (let x = 6; x < W - 6; x += 4) g.vline(x, 22, H - 13, '#a02a36')
    for (let x = 6; x < W - 6; x++) g.px(x, 24 + Math.round(Math.abs(Math.sin((x - 6) * 0.2)) * 3), GOLD.b)
    // Posts.
    for (const x of [4, W - 8]) {
      g.rect(x, 18, 4, H - 29, '#fbf2de')
      g.rect(x + 3, 18, 1, H - 29, '#d8c8b0')
      g.rect(x - 1, 18, 6, 2, GOLD.b)
    }
    // Roof.
    roofBand(g, cx, 2, 0, 20, 8, WHITE_ROOF, 4)
    roofBand(g, cx, 2, W - 1, 20, 8, WHITE_ROOF, 4)
    hooks.glints = gable(g, cx, 2, cx - 6, 20, { ...WHITE_GABLE, motif: 'emblem', thick: 2 })
    hooks.bells = [
      { x: 2, y: 22 },
      { x: W - 3, y: 22 },
    ]
    chofa(g, cx, 2, 6, 1)
  })
}

/** Ranat (Thai xylophone) with a little mallet. */
export function ranatSprite(): Prop {
  return prop('sothon-ranat', 26, 12, 13, 11, (g) => {
    g.poly(
      [
        [1, 3],
        [25, 3],
        [21, 10],
        [5, 10],
      ],
      '#8a4a2a',
    )
    g.hline(1, 25, 3, '#c9803a')
    for (let i = 0; i < 10; i++) {
      g.rect(3 + i * 2, 2 - (i % 2 ? 0 : 1) + Math.round(Math.abs(i - 5) * 0.2), 2, 2, i % 2 ? '#e8c890' : '#d8b070')
    }
    g.rect(10, 10, 6, 2, '#6e3a1e')
  })
}

/** Replica of หลวงพ่อโสธร in a little open sala where people pray outdoors. */
export function replicaSalaSprite(night = false): Building {
  const W = 64
  const H = 70
  return building(`sothon-replica:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    g.rect(2, H - 8, W - 4, 7, '#f6f2ee')
    g.hline(2, W - 3, H - 8, '#ffffff')
    g.rect(2, H - 4, W - 4, 2, GOLD.d)
    for (const x of [5, W - 9]) {
      g.rect(x, 22, 4, H - 30, '#fbf8f4')
      g.rect(x + 3, 22, 1, H - 30, '#d8ccd0')
      g.rect(x - 1, 22, 6, 2, GOLD.b)
    }
    g.rect(9, 24, W - 18, H - 32, night ? '#5a4a6a' : '#e8dcd0')
    // Golden seated image on a stepped gold throne.
    for (let i = 0; i < 3; i++) block(g, cx, H - 16 - i * 4, 4, 16 - i * 3, RAMPS.gold)
    const lp = luangPhoSothon(0.3)
    g.draw(lp.canvas, cx - lp.ox, H - 28 - lp.oy)
    roofBand(g, cx, 4, 0, 24, 8, WHITE_ROOF, 4)
    roofBand(g, cx, 4, W - 1, 24, 8, WHITE_ROOF, 4)
    hooks.glints = gable(g, cx, 4, cx - 6, 24, { ...WHITE_GABLE, motif: 'emblem', thick: 2 })
    hooks.bells = [
      { x: 2, y: 26 },
      { x: W - 3, y: 26 },
    ]
    hooks.candles = [
      { x: cx - 12, y: H - 14 },
      { x: cx + 12, y: H - 14 },
    ]
    for (const s of [-1, 1]) g.rect(cx + s * 12 - 1, H - 13, 3, 5, WHITE.b)
  })
}

// ---------------------------------------------------------------------------
// Riverside.

/** A wooden pier on stilts over the water (baked). */
export function drawPier(g: Surface, x: number, y: number, w: number, h: number) {
  // Shadow on the water and posts.
  g.rect(x + 2, y + h, w - 2, 3, 'rgba(40,60,60,0.35)')
  for (let px = x + 2; px < x + w; px += 10) {
    g.rect(px, y + h, 2, 5, '#5e3e28')
    g.hline(px - 1, px + 2, y + h + 5, '#b8d0c0')
  }
  // Deck planks running out over the river.
  g.rect(x, y, w, h, '#a06e46')
  for (let i = x; i < x + w; i += 4) {
    g.vline(i, y, y + h - 1, '#7a5238')
    for (let j = y + ((i * 7) % 9); j < y + h; j += 11) g.px(i + 2, j, '#c28e5c')
  }
  g.hline(x, x + w - 1, y, '#c8925e')
  g.hline(x, x + w - 1, y + h - 1, '#6e4a35')
  g.vline(x, y, y + h - 1, '#c8925e')
  g.vline(x + w - 1, y, y + h - 1, '#6e4a35')
  // Rope rails with posts.
  for (const px of [x, x + w - 2]) for (let j = y; j < y + h; j += 12) g.rect(px, j - 5, 2, 6, '#6e4a35')
  g.hline(x, x + 1, y - 5, '#c8925e')
}

/** Open wooden sala on the market pier (ตลาดน้ำ). Anchor = front centre. */
export function riverSalaSprite(): Building {
  const W = 66
  const H = 56
  return building('sothon-riversala', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    for (const x of [4, 20, W - 24, W - 8]) {
      g.rect(x, 18, 3, H - 19, '#7a5238')
      g.px(x, 18, '#c28e5c')
    }
    g.rect(3, H - 4, W - 6, 3, '#6e4a35')
    // Hanging goods: bunches of bananas and baskets.
    for (const [x, c] of [
      [12, '#ffd23f'],
      [34, '#9ab85a'],
      [52, '#c9a06a'],
    ] as const) {
      g.vline(x, 20, 24, '#6e4a35')
      g.ellipse(x, 27, 3, 2.4, c)
    }
    roofBand(g, cx, 2, 0, 20, 8, { field: '#c8643a', fieldD: '#9a4a2a', fieldL: '#e8885a', border: '#6e4a35', borderD: '#4a3128', under: '#4a3128' }, 3)
    roofBand(g, cx, 2, W - 1, 20, 8, { field: '#c8643a', fieldD: '#9a4a2a', fieldL: '#e8885a', border: '#6e4a35', borderD: '#4a3128', under: '#4a3128' }, 3)
    g.poly(
      [
        [cx, 5],
        [cx - 12, 18],
        [cx + 12, 18],
      ],
      '#9a6a45',
    )
    for (let y = 8; y < 18; y += 3) g.hline(cx - (y - 5) + 1, cx + (y - 5) - 1, y, '#7a5238')
    hooks.glints = []
  })
}

/** Rice barge (เรือเอี้ยมจุ๊น) silhouette drifting on the river. */
export function drawBarge(g: Surface, x: number, y: number, t: number) {
  const bob = Math.round(Math.sin(t * 1.4 + x * 0.05))
  g.poly(
    [
      [x - 24, y - 3 + bob],
      [x + 24, y - 3 + bob],
      [x + 20, y + 3 + bob],
      [x - 20, y + 3 + bob],
    ],
    '#5a3a2a',
  )
  g.hline(x - 24, x + 24, y - 3 + bob, '#8a5a3a')
  g.rect(x - 10, y - 9 + bob, 20, 6, '#c9a06a')
  g.rect(x - 11, y - 10 + bob, 22, 2, '#7a5238')
  for (let i = -8; i < 10; i += 4) g.px(x + i, y - 6 + bob, '#8a6a4a')
  g.hline(x - 18, x + 18, y + 4 + bob, '#2f6a8a')
}

/** Riverside market stall for แปดริ้ว mangoes and ขนมจาก. */
export function mangoStallSprite(): Prop {
  return stallProp('sothon-mango', {
    w: 50,
    awning: ['#ffd23f', '#f58f35'],
    counter: '#9a6a45',
    goods(g, x0, y, w) {
      // Mango pyramid (left).
      for (let r = 0; r < 3; r++)
        for (let i = 0; i <= 2 - r; i++) {
          const mx = x0 + 6 + (2 - r) * 2 + i * 4
          const my = y - 2 - r * 3
          g.ellipse(mx, my, 2.4, 1.8, r === 2 ? '#ffe45e' : i % 2 ? '#f5c542' : '#ffd23f')
          g.px(mx - 1, my - 1, '#fff6c0')
        }
      // Sticky rice box and mango slices.
      g.rect(x0 + 22, y - 3, 8, 3, '#fffaf0')
      g.rect(x0 + 22, y - 5, 8, 2, '#ffd23f')
      // Khanom jak: grilled nipa-leaf parcels (right).
      for (let i = 0; i < 5; i++) {
        g.rect(x0 + w - 16 + (i % 3) * 4, y - 2 - Math.floor(i / 3) * 2, 3, 2, i % 2 ? '#5a6a3a' : '#7a8a4a')
        g.px(x0 + w - 15 + (i % 3) * 4, y - 2 - Math.floor(i / 3) * 2, '#3a4a2a')
      }
      g.rect(x0 + w - 18, y + 3, 14, 6, '#5a3a2a')
      for (let i = 0; i < 4; i++) g.px(x0 + w - 16 + i * 3, y + 5, '#ff6a2a')
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.ellipse(cx - 2, y + 2, 3, 2, '#ffd23f')
      g.rect(cx + 3, y + 1, 3, 2, '#7a8a4a')
    },
  })
}

/** Boiled-egg & offering stall: egg trays, garlands and incense sets. */
export function eggStallSprite(): Prop {
  return stallProp('sothon-eggs', {
    w: 56,
    awning: ['#e8514a', '#fffaf0'],
    counter: '#c28e5c',
    goods(g, x0, y, w) {
      drawEggTray(g, x0 + 8, y - 1, 3)
      drawEggTray(g, x0 + w - 9, y - 1, 3, '#e0c080')
      // Garlands hanging and incense bundles on the counter front.
      for (let i = 0; i < 4; i++) {
        const gx = x0 + 6 + i * 13
        g.circle(gx, y + 6, 2.4, i % 2 ? '#ffd23f' : '#f58f35')
        g.px(gx, y + 6, '#fffaf0')
        g.vline(gx, y + 8, y + 11, '#e8514a')
      }
      for (let i = 0; i < 3; i++) g.vline(x0 + 22 + i * 2, y - 5, y - 1, '#d8563a')
      g.px(x0 + 24, y - 6, '#ffd23f')
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.ellipse(cx - 3, y + 2, 2, 1.6, '#f4ecd8')
      g.ellipse(cx + 1, y + 2, 2, 1.6, '#f4ecd8')
      g.circle(cx + 5, y + 2, 1.5, '#f58f35')
    },
  })
}

// ---------------------------------------------------------------------------
// Interior: หลวงพ่อพุทธโสธร – seated in meditation, gilded, on a tall throne.

function meditationPrims(): Prim[] {
  return [
    // Lap and crossed legs.
    Ell(0, 7, 0, 30, 7.2, 11, 1),
    Ell(-26, 6, 3, 9.4, 6.2, 9, 1),
    Ell(26, 6, 3, 9.4, 6.2, 9, 1),
    Cap([-24, 7, 7], [18, 9.5, 11], 4.6, 4, 2),
    Ell(14, 11.2, 13, 6, 2.4, 3, 3),
    // Torso.
    Ell(0, 17, 1.5, 11, 7, 8.2, 4),
    Cap([0, 18, 0.5], [0, 33, 0.5], 9.8, 14, 4, 0, 0.62),
    Ell(0, 35.5, 1, 16.2, 11, 8.2, 4),
    Cap([-15.4, 40.6, 0], [0, 43, 0], 5, 5, 4, 0, 0.9),
    Cap([15.4, 40.6, 0], [0, 43, 0], 5, 5, 4, 0, 0.9),
    Cap([0, 43, 0.5], [0, 50, 1.5], 4.4, 4, 5),
    // Head, ears, ushnisha and flame.
    Ell(0, 60, 2, 9.4, 11, 9, 6),
    Ell(0, 53.8, 3.6, 6.2, 4.8, 6.4, 6),
    Cap([-8.9, 64.2, 0.5], [-9.6, 53.4, 1.5], 1.1, 1.7, 7),
    Cap([8.9, 64.2, 0.5], [9.6, 53.4, 1.5], 1.1, 1.7, 7),
    Ell(0, 71.2, 1.5, 6.4, 4.8, 5.5, 8),
    Cap([0, 74.5, 1.5], [0, 92, 1.5], 3, 0.35, 9),
    // Both arms curving down to hands resting one on the other in the lap.
    Cap([-17.2, 41, 0], [-23, 27, 1.5], 5, 4, 10),
    Cap([-23, 27, 1.5], [-9, 14.6, 10.5], 4, 3, 10),
    Cap([17.2, 41, 0], [23, 27, 1.5], 5, 4, 11),
    Cap([23, 27, 1.5], [9, 14.6, 10.5], 4, 3, 11),
    Ell(0, 14.4, 12, 9.6, 2.8, 3.2, 12),
  ]
}

/** หลวงพ่อโสธร (local origin = centre of the lap bottom). */
export function luangPhoSothon(s: number) {
  const q = Math.round(s * 40) / 40
  return sculpted(`sothon-lp:${q}`, () => ({
    prims: meditationPrims(),
    s: q,
    x0: -38,
    x1: 38,
    y0: -1,
    y1: 94,
    ramps: [GOLD_RAMP],
    rim: 0.24,
    ambient: 0.04,
    spec: [14, 0.5],
    detail(d) {
      const Y = -4
      d.curve(-7.3, -0.9, (x) => 65.6 + Y + 1.6 * (1 - ((Math.abs(x) - 4.2) / 3.4) ** 2), -2)
      d.curve(0.9, 7.3, (x) => 65.6 + Y + 1.6 * (1 - ((Math.abs(x) - 4.2) / 3.4) ** 2), -2)
      d.curve(-6.2, -2.1, (x) => 63.1 + Y - 0.09 * (x + 4.2) * (x + 4.2), -3)
      d.curve(2.1, 6.2, (x) => 63.1 + Y - 0.09 * (x - 4.2) * (x - 4.2), -3)
      d.line(0.7, 65 + Y, 0.7, 60.4 + Y, -1)
      d.line(-2.2, 57.4 + Y, 2.2, 57.4 + Y, -2)
      d.each((i, j, lx, ly, part) => {
        if ((part === 6 && ly > 64.4 - 0.022 * lx * lx) || part === 8) if ((i + j) % 2 === 0) d.add(i, j, -1)
      })
      d.curve(-14, 5.2, (x) => 30.5 + ((x + 14) / 19.5) * 15 - 0.02 * (x + 4) * (x + 4), -2)
      d.line(4.4, 45.5, 4.4, 20.5, -2)
      d.line(9.2, 44.5, 9.2, 20.5, -1)
      d.curve(-9, 9, (x) => 14.4 + 0.01 * x * x, -1)
      d.line(-0.6, 89.5, -0.6, 76.5, 1)
    },
  }))
}

/** Tall gilded throne (ฐานชุกชี) with lotus tiers and glass-mosaic panels. */
export function drawThrone(g: Surface, cx: number, topY: number, w: number, h: number) {
  const gr = RAMPS.gold
  const tiers = 5
  const th = h / tiers
  for (let i = 0; i < tiers; i++) {
    const tw = w * (0.62 + i * 0.1)
    const y0 = Math.round(topY + i * th)
    for (let yy = y0; yy < Math.round(y0 + th); yy++)
      for (let x = Math.round(cx - tw / 2); x < cx + tw / 2; x++) {
        const u = (x + 0.5 - cx) / (tw / 2)
        let v = 0.6 - u * 0.3 - ((yy - y0) / th) * 0.15
        if (yy === y0) v += 0.3
        g.px(x, yy, gr[Math.round(clamp01(v + dth(x, yy) * 0.2) * 7)])
      }
    // Mosaic panels of coloured glass.
    for (let x = Math.round(cx - tw / 2) + 3; x < cx + tw / 2 - 3; x += 6) {
      g.rect(x, y0 + 2, 3, Math.max(1, th - 4), i % 2 ? '#b8343f' : '#3d63b5')
      if (hash(x, y0, 3) < 0.5) g.px(x + 1, y0 + 2, '#ffffff')
    }
  }
}

export { GOLD, WHITE, P }
