// Walkable temple interiors (top-down 3/4 cut-away rooms): the room shell
// (mural back wall, side walls with windows, polished floor, carpet runner,
// front wall with the doorway and a marble porch), the principal Buddha on a
// tiered throne under a flame arch, altar sets, pillars, floor candle stands,
// monks' dais, shoe racks, gold-leaf tables, fortune sticks and the job props.
// The Buddha itself is the sculpted HD image from hall.ts.

import { ditherOn, type Color, type Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { buddhaSculpt, GOLD_RAMP, ANTIQUE_RAMP, LANNA_RAMP, type BuddhaStyle } from '../hall'
import { GOLD, WHITE, ROOF, slice, tier, type Building, type Ramp } from '../temple'
import { buildProp, hash, lightPatch, marbleFloor, GOLD_R, RED_R, WHITE_R, BRONZE_R, TEAK_R, MARBLE_R } from './south'

// ---------------------------------------------------------------------------
// Room shell.

export type MuralKind = 'deva' | 'jataka' | 'stars' | 'plain' | 'tiles' | 'marble'
export type FloorKind = 'marble' | 'teak' | 'checker' | 'terrazzo'

export interface RoomStyle {
  /** Mural ground colour of the walls. */
  wall: Color
  mural: MuralKind
  floor: FloorKind
  floorTint?: Color
  carpet?: Color
  /** Colour of the wall tops seen from above (cut-away). */
  cap: Color
  /** Dark void outside the room. */
  void: Color
  /** What the windows look out on. */
  view?: 'garden' | 'sea' | 'sky'
}

export interface RoomSpec {
  w: number
  h: number
  /** Height of the back wall face. */
  wallH: number
  /** Side wall thickness. */
  side: number
  /** Top of the front wall (seen from above). */
  frontY: number
  frontH?: number
  doorX: number
  doorW: number
  windows?: number[]
  sideWindows?: number[]
  carpet?: { x: number; w: number; y0: number; y1: number }
  /** Marble porch below the front wall (to the bottom of the map). */
  porch?: boolean
  seed?: number
}

/** Seated celestial beings in rows (เทพชุมนุม), wall-unit painter. */
export function devaRows(g: Surface, x: number, y: number, w: number, h: number, ground: Color, seed: number) {
  const robes = ['#3f7d5f', '#c0453f', '#e9e1c8', '#4f6fa8', '#e8b44a']
  g.rect(x, y, w, h, ground)
  const rowH = 9
  for (let r = 0; r * rowH + 7 <= h; r++) {
    const yy = y + r * rowH + 1
    const facing = r % 2 ? -1 : 1
    for (let i = 3; i + 4 < w; i += 7) {
      const xx = x + i
      const robe = robes[hash(xx, yy, seed) % robes.length]
      // Halo + pointed crown.
      g.px(xx + 2, yy, GOLD.b)
      g.px(xx + 2, yy + 1, GOLD.d)
      g.rect(xx + 1, yy + 2, 3, 2, '#f2d6a2')
      g.px(xx + 1 + (facing > 0 ? 2 : 0), yy + 3, '#3a2838')
      // Body in wai.
      g.rect(xx, yy + 4, 5, 3, robe)
      g.px(xx + 2 + facing, yy + 4, '#f2d6a2')
      g.hline(xx - 1, xx + 5, yy + 7, mixHex(robe, '#3a2838', 0.3))
    }
  }
}

/** Zigzag border (สามเหลี่ยมฟันปลา). */
export function zigzag(g: Surface, x: number, y: number, w: number, a: Color, b: Color) {
  g.rect(x, y, w, 4, b)
  for (let i = 0; i < w; i++) {
    const k = i % 6
    const hgt = k < 3 ? k + 1 : 6 - k
    g.vline(x + i, y + 4 - hgt, y + 3, a)
  }
  g.hline(x, x + w - 1, y, GOLD.d)
  g.hline(x, x + w - 1, y + 4, GOLD.D)
}

/** Lower mural register: a Jataka landscape with houses, trees, water and people. */
export function jataka(g: Surface, x: number, y: number, w: number, h: number, seed: number) {
  g.rect(x, y, w, h, '#d8c89a')
  g.rect(x, y, w, Math.round(h * 0.35), '#bcd0b0')
  // River band.
  g.rect(x, y + h - 5, w, 3, '#6fa8b8')
  for (let i = 0; i < w; i += 5) g.px(x + i + (seed % 3), y + h - 4, '#a8d8e0')
  for (let i = 0; i < w; i += 9) {
    const v = hash(x + i, y, seed)
    const xx = x + i + (v % 4)
    if (v % 3 === 0) {
      // Tree.
      g.rect(xx + 2, y + h - 10, 1, 5, '#6e4a35')
      g.circle(xx + 2, y + h - 12, 3, '#4a7a4a')
      g.px(xx + 1, y + h - 14, '#76a860')
    } else if (v % 3 === 1) {
      // Thai house with a steep roof.
      g.rect(xx, y + h - 11, 6, 5, '#e9e1c8')
      g.poly(
        [
          [xx - 1, y + h - 11],
          [xx + 3, y + h - 16],
          [xx + 7, y + h - 11],
        ],
        '#a8503a',
      )
      g.px(xx + 3, y + h - 17, GOLD.b)
      g.px(xx + 2, y + h - 9, '#5a3d4f')
    } else {
      // Little people.
      const c = ['#c0453f', '#4f6fa8', '#3f7d5f', '#e8b44a'][v % 4]
      g.px(xx + 1, y + h - 11, '#f2d6a2')
      g.rect(xx, y + h - 10, 3, 3, c)
      g.px(xx + 4, y + h - 10, '#f2d6a2')
      g.rect(xx + 3, y + h - 9, 3, 2, ['#e8b44a', '#c0453f'][v % 2])
    }
  }
  // Mountains / clouds at the top.
  for (let i = 0; i < w; i += 13) {
    const v = hash(x + i, y + 3, seed)
    g.poly(
      [
        [x + i, y + 7],
        [x + i + 5, y + 1 + (v % 3)],
        [x + i + 11, y + 7],
      ],
      '#9ab0a0',
    )
  }
}

/** Arched window with gold crown frame, open red shutters and the view outside. */
function windowArch(g: Surface, cx: number, top: number, w: number, h: number, night: boolean, view: 'garden' | 'sea' | 'sky') {
  const x = Math.round(cx - w / 2)
  // Crown frame.
  for (let i = 0; i < 4; i++) g.rect(cx - Math.round(w / 2) - 2 + i, top - 3 - i * 2, w + 4 - i * 2, 2, i % 2 ? GOLD.d : GOLD.b)
  g.px(cx, top - 11, GOLD.l)
  g.rect(x - 1, top - 1, w + 2, h + 2, GOLD.d)
  // View.
  if (night) {
    g.rect(x, top, w, h, '#2a3068')
    g.px(x + 2, top + 2, '#fff3a6')
    g.px(x + w - 3, top + 4, '#ffffff')
    g.rect(x, top + h - 3, w, 3, '#1e2a48')
  } else if (view === 'sea') {
    g.rect(x, top, w, h, '#bfeaff')
    g.rect(x, top + Math.round(h * 0.5), w, h - Math.round(h * 0.5), '#4aa8d8')
    g.hline(x, x + w - 1, top + Math.round(h * 0.5), '#ffffff')
    g.px(x + 2, top + Math.round(h * 0.7), '#bfeaff')
  } else if (view === 'sky') {
    g.rect(x, top, w, h, '#bfeaff')
    g.rect(x + 1, top + 2, 4, 2, '#ffffff')
  } else {
    g.rect(x, top, w, h, '#bfeaff')
    g.rect(x, top + Math.round(h * 0.4), w, h - Math.round(h * 0.4), '#5eae55')
    g.circle(x + 2, top + Math.round(h * 0.45), 3, '#3f8a4f')
    g.circle(x + w - 2, top + Math.round(h * 0.5), 3, '#43905a')
    g.px(x + w - 4, top + 2, '#ffffff')
  }
  // Iron grille.
  for (let i = 2; i < w; i += 3) g.vline(x + i, top, top + h - 1, night ? '#3a3a5a' : '#8a7a8a')
  // Shutters folded open.
  for (const s of [-1, 1]) {
    const sx = s < 0 ? x - 5 : x + w + 1
    g.rect(sx, top, 4, h, P.redD)
    g.rect(sx + (s < 0 ? 0 : 3), top, 1, h, P.redDD)
    for (let j = 2; j < h - 1; j += 3) g.px(sx + 1 + (j % 2), top + j, GOLD.d)
  }
  g.rect(x - 1, top + h + 1, w + 2, 2, WHITE.b)
}

export interface BakedRoom {
  /** Floor rectangle (walkable area before furniture). */
  floor: { x: number; y: number; w: number; h: number }
}

/** Paint the room shell into a baked layer. */
export function bakeRoom(g: Surface, s: RoomSpec, st: RoomStyle, night: boolean): BakedRoom {
  const seed = s.seed ?? 1
  const frontH = s.frontH ?? 8
  const W = s.w
  g.rect(0, 0, W, s.h, st.void)
  const fx = s.side
  const fy = s.wallH
  const fw = W - s.side * 2
  const fh = s.frontY - s.wallH
  // --- floor ---
  const tint = st.floorTint ?? (st.floor === 'teak' ? '#b87a48' : '#f0ece8')
  if (st.floor === 'marble') marbleFloor(g, fx, fy, fw, fh, 12, seed, tint)
  else if (st.floor === 'terrazzo') {
    g.rect(fx, fy, fw, fh, tint)
    for (let j = 0; j < fh; j++)
      for (let i = 0; i < fw; i++) {
        const v = hash(fx + i, fy + j, seed)
        if (v < 30) g.px(fx + i, fy + j, v < 10 ? '#c9a8a0' : v < 20 ? '#a8b8c8' : '#ffffff')
      }
    for (let j = 0; j < fh; j += 16) g.hline(fx, fx + fw - 1, fy + j, mixHex(tint, '#8c8199', 0.25))
  } else if (st.floor === 'checker') {
    for (let j = 0; j < fh; j += 8)
      for (let i = 0; i < fw; i += 8) {
        const a = ((i + j) / 8) % 2 === 0
        g.rect(fx + i, fy + j, 8, 8, a ? tint : mixHex(tint, '#a8503a', 0.55))
        g.px(fx + i + 1, fy + j + 1, '#ffffff')
      }
  } else {
    // Teak planks, long boards running away from the viewer.
    g.rect(fx, fy, fw, fh, tint)
    for (let i = 0; i < fw; i += 6) {
      g.vline(fx + i, fy, fy + fh - 1, mixHex(tint, '#3a2020', 0.35))
      for (let j = (hash(i, 0, seed) % 40) - 40; j < fh; j += 40) if (j > 0) g.hline(fx + i, fx + i + 5, fy + j, mixHex(tint, '#3a2020', 0.3))
      for (let j = 0; j < fh; j += 7) if (hash(i, j, seed) % 5 === 0) g.px(fx + i + 2, fy + j, mixHex(tint, '#ffffff', 0.25))
      g.vline(fx + i + 1, fy, fy + fh - 1, mixHex(tint, '#ffffff', 0.12))
    }
  }
  // Soft shadow along the back wall foot and the side walls.
  for (let k = 0; k < 6; k++) {
    g.alpha(0.1 * (6 - k) * 0.5)
    g.hline(fx, fx + fw - 1, fy + k, '#3a2838')
    g.vline(fx + k, fy, fy + fh - 1, '#3a2838')
    g.vline(fx + fw - 1 - k, fy, fy + fh - 1, '#3a2838')
    g.alpha(1)
  }
  // Carpet runner from the door to the altar.
  if (s.carpet && st.carpet) {
    const c = s.carpet
    const cd = mixHex(st.carpet, '#3a2838', 0.3)
    g.rect(c.x, c.y0, c.w, c.y1 - c.y0, st.carpet)
    g.rect(c.x, c.y0, 2, c.y1 - c.y0, GOLD.d)
    g.rect(c.x + c.w - 2, c.y0, 2, c.y1 - c.y0, GOLD.d)
    g.vline(c.x + 3, c.y0, c.y1 - 1, cd)
    g.vline(c.x + c.w - 4, c.y0, c.y1 - 1, cd)
    for (let y = c.y0 + 4; y < c.y1; y += 10) {
      const cx = c.x + c.w / 2
      g.px(cx, y, GOLD.b)
      g.px(cx - 1, y + 1, GOLD.d)
      g.px(cx + 1, y + 1, GOLD.d)
      g.px(cx, y + 2, GOLD.b)
    }
  }
  // Window light on the floor (day).
  if (!night) {
    for (const wy of s.sideWindows ?? []) {
      lightPatch(g, [[fx, wy], [fx + 26, wy + 12], [fx + 26, wy + 24], [fx, wy + 12]], '#fff3d0', 0.28)
      lightPatch(g, [[fx + fw, wy], [fx + fw - 26, wy + 12], [fx + fw - 26, wy + 24], [fx + fw, wy + 12]], '#fff3d0', 0.28)
    }
    lightPatch(g, [[s.doorX - s.doorW / 2, s.frontY], [s.doorX + s.doorW / 2, s.frontY], [s.doorX + s.doorW / 2 + 8, s.frontY - 34], [s.doorX - s.doorW / 2 - 8, s.frontY - 34]], '#fff6d8', 0.4)
  }
  // --- back wall ---
  const bw = s.wallH
  const ground = st.wall
  const groundD = mixHex(ground, '#1a0b13', 0.35)
  g.rect(0, 0, W, bw, ground)
  // Beam / ceiling edge at the top.
  g.rect(0, 0, W, 5, mixHex(ground, '#1a0b13', 0.55))
  g.hline(0, W - 1, 5, GOLD.d)
  for (let x = 2; x < W; x += 5) g.px(x, 2, GOLD.D)
  if (st.mural === 'deva' || st.mural === 'jataka') {
    const band = Math.max(18, Math.round(bw * 0.34))
    devaRows(g, 0, 7, W, band, groundD, seed)
    zigzag(g, 0, 7 + band, W, ground, groundD)
    const lower = bw - (12 + band) - 10
    if (lower > 8) jataka(g, 0, 12 + band, W, lower, seed)
  } else if (st.mural === 'stars') {
    // Gold star rosettes (ดาวเพดาน) in a lattice, with a lotus frieze on top.
    for (let x = 0; x < W; x += 4) {
      g.px(x, 9, GOLD.d)
      g.px(x + 1, 10, GOLD.b)
      g.px(x + 2, 9, GOLD.d)
    }
    g.hline(0, W - 1, 12, GOLD.D)
    for (let y = 18, row = 0; y < bw - 14; y += 9, row++)
      for (let x = row % 2 ? 5 : 0; x < W; x += 10) {
        g.px(x, y, GOLD.L)
        g.px(x - 1, y, GOLD.b)
        g.px(x + 1, y, GOLD.b)
        g.px(x, y - 1, GOLD.b)
        g.px(x, y + 1, GOLD.b)
        g.px(x - 1, y - 1, GOLD.D)
        g.px(x + 1, y + 1, GOLD.D)
        g.px(x + 1, y - 1, GOLD.D)
        g.px(x - 1, y + 1, GOLD.D)
        if (hash(x, y, seed) % 4 === 0) {
          g.px(x - 2, y, GOLD.d)
          g.px(x + 2, y, GOLD.d)
        }
      }
  } else if (st.mural === 'tiles') {
    for (let y = 8; y < bw - 10; y += 6)
      for (let x = 0; x < W; x += 6) {
        g.rect(x, y, 5, 5, mixHex(ground, '#ffffff', 0.15))
        g.px(x + 2, y + 2, hash(x, y, seed) % 2 ? '#4f7fd0' : GOLD.d)
      }
  } else if (st.mural === 'marble') {
    marbleFloor(g, 0, 7, W, bw - 17, 14, seed + 3, ground)
  }
  // Dado and skirting.
  g.rect(0, bw - 10, W, 8, groundD)
  for (let x = 1; x < W; x += 4) {
    g.px(x, bw - 7, GOLD.d)
    g.px(x + 1, bw - 6, GOLD.b)
  }
  g.hline(0, W - 1, bw - 10, GOLD.d)
  g.rect(0, bw - 2, W, 2, mixHex(ground, '#1a0b13', 0.6))
  for (const wx of s.windows ?? []) windowArch(g, wx, 16, 12, Math.round(bw * 0.36), night, st.view ?? 'garden')
  // --- side walls (cut-away, seen from above) ---
  for (const sd of [0, 1]) {
    const x0 = sd ? W - s.side : 0
    g.rect(x0, bw, s.side, s.frontY - bw + frontH, st.cap)
    // Inner face strip.
    const ix = sd ? x0 : x0 + s.side - 3
    g.rect(ix, bw, 3, s.frontY - bw, mixHex(ground, '#1a0b13', 0.2))
    g.vline(sd ? x0 + 3 : x0 + s.side - 4, bw, s.frontY - 1, GOLD.d)
    g.vline(sd ? x0 + s.side - 1 : x0, bw, s.frontY + frontH - 1, mixHex(st.cap, '#1a0b13', 0.4))
    // Coping tiles.
    for (let y = bw + 2; y < s.frontY; y += 4) g.hline(x0 + 1, x0 + s.side - 5, y, mixHex(st.cap, '#1a0b13', 0.15))
    for (const wy of s.sideWindows ?? []) {
      g.rect(ix, wy, 3, 12, night ? '#2a3068' : '#fff3c0')
      g.rect(ix + (sd ? 0 : 2), wy, 1, 12, night ? '#1e2048' : '#ffffff')
      g.hline(ix - 1, ix + 3, wy - 1, GOLD.d)
      g.hline(ix - 1, ix + 3, wy + 12, GOLD.d)
    }
  }
  // --- front wall (top seen from above) with the doorway ---
  const d0 = Math.round(s.doorX - s.doorW / 2)
  const d1 = Math.round(s.doorX + s.doorW / 2)
  for (const [a, b] of [
    [0, d0],
    [d1, W],
  ]) {
    g.rect(a, s.frontY, b - a, frontH, st.cap)
    g.hline(a, b - 1, s.frontY, mixHex(st.cap, '#ffffff', 0.3))
    g.hline(a, b - 1, s.frontY + frontH - 1, mixHex(st.cap, '#1a0b13', 0.45))
    g.hline(a, b - 1, s.frontY + 2, GOLD.d)
  }
  // Door leaves folded open against the wall and a gilded sill.
  for (const sd of [-1, 1]) {
    const x = sd < 0 ? d0 - 1 : d1 - 3
    g.rect(x, s.frontY - 10, 4, 10, P.redD)
    g.rect(x + 1, s.frontY - 9, 2, 8, P.red)
    g.px(x + 2, s.frontY - 6, GOLD.b)
  }
  g.rect(d0, s.frontY + frontH - 2, d1 - d0, 2, GOLD.d)
  g.hline(d0, d1 - 1, s.frontY + frontH - 2, GOLD.l)
  // --- porch ---
  if (s.porch) {
    const py = s.frontY + frontH
    marbleFloor(g, 0, py, W, s.h - py, 10, seed + 7, '#f6f2ec')
    g.alpha(0.18)
    g.rect(0, py, W, 3, '#3a2838')
    g.alpha(1)
    // Steps at the bottom.
    for (let i = 0; i < 3; i++) {
      const y = s.h - 12 + i * 4
      g.rect(s.doorX - 20 - i * 3, y, 40 + i * 6, 4, i % 2 ? '#ece6de' : '#fbf8f2')
      g.hline(s.doorX - 20 - i * 3, s.doorX + 19 + i * 3, y, '#ffffff')
    }
  }
  return { floor: { x: fx, y: fy, w: fw, h: fh } }
}

/** A kneeling mat with a gold border (baked). */
export function kneelMat(g: Surface, x: number, y: number, w = 14, h = 7, c: Color = '#c0453f') {
  g.rect(x, y + 1, w, h, mixHex(c, '#1a0b13', 0.45))
  g.rect(x, y, w, h, c)
  g.frame(x, y, w, h, GOLD.d)
  g.hline(x + 2, x + w - 3, y + 2, mixHex(c, '#ffffff', 0.25))
}

/** Scattered shoes by a doorway (baked). */
export function scatteredShoes(g: Surface, x: number, y: number, n: number, seed = 0) {
  const cols = ['#e8514a', '#5a8de0', '#3a3040', '#fffaf0', '#ff9fc0', '#6cc36a', '#f58f35', '#9a6a45']
  for (let i = 0; i < n; i++) {
    const v = hash(i, seed, 17)
    const sx = x + (v % 30) - 15
    const sy = y + ((v >> 5) % 12) - 6
    const c = cols[v % cols.length]
    g.rect(sx, sy, 3, 2, c)
    g.rect(sx + 4, sy + (v % 2), 3, 2, c)
    g.px(sx, sy, mixHex(c, '#ffffff', 0.4))
  }
}

// ---------------------------------------------------------------------------
// Pillars.

export type PillarKind = 'red' | 'white' | 'teak' | 'marble' | 'black'

/** A tall interior pillar with a lotus capital and gold stencil work. */
export function pillarSprite(h: number, kind: PillarKind = 'red'): Building {
  const W = 11
  const H = h + 4
  return buildProp(`pillar:${kind}:${h}`, W, H, 5, H - 1, (g) => {
    const R: Ramp =
      kind === 'red' ? { L: '#e05a52', b: '#b8343f', d: '#8e2433', D: '#6e1a2a' } : kind === 'white' ? WHITE_R : kind === 'marble' ? MARBLE_R : kind === 'black' ? { L: '#5a4a5e', b: '#3a2838', d: '#2a1a28', D: '#1a0e18' } : TEAK_R
    const top = 5
    const bot = H - 5
    for (let y = top; y < bot; y++) slice(g, 5.5, y, 3.4, R, 0.3)
    // Stencil diamonds (ลายรดน้ำ) on lacquer.
    if (kind === 'red' || kind === 'black') {
      for (let y = top + 6; y < bot - 6; y += 5) {
        g.px(5, y, GOLD.b)
        g.px(4, y + 1, GOLD.d)
        g.px(6, y + 1, GOLD.d)
        g.px(5, y + 2, GOLD.b)
      }
      // Top and bottom bands (กาบพรหมศร).
      for (let i = 0; i < 5; i++) {
        g.hline(2, 8, top + i, i % 2 ? GOLD.d : GOLD.b)
        g.hline(2, 8, bot - 1 - i, i % 2 ? GOLD.d : GOLD.b)
      }
      for (let i = 0; i < 3; i++) {
        g.px(3 + i * 2, top + 5, GOLD.b)
        g.px(3 + i * 2, bot - 6, GOLD.b)
      }
    } else if (kind === 'teak') {
      for (let y = top + 3; y < bot; y += 7) g.hline(3, 7, y, TEAK_R.D)
    }
    // Lotus capital.
    g.rect(1, 1, 9, 2, GOLD.b)
    g.hline(1, 9, 1, GOLD.L)
    for (let x = 1; x < 10; x++) g.px(x, 3, (x & 1) === 0 ? GOLD.l : GOLD.D)
    g.rect(2, 4, 7, 1, GOLD.d)
    g.px(0, 2, GOLD.d)
    g.px(10, 2, GOLD.d)
    // Base.
    g.rect(1, bot, 9, 2, GOLD.d)
    for (let x = 1; x < 10; x++) g.px(x, bot + 2, (x & 1) === 0 ? GOLD.b : GOLD.D)
    g.rect(0, bot + 3, 11, 2, kind === 'white' || kind === 'marble' ? WHITE.D : GOLD.D)
  })
}

// ---------------------------------------------------------------------------
// Principal Buddha on a throne under a flame arch.

export interface BuddhaOpts {
  s: number
  style?: BuddhaStyle
  /** Colour scheme of the throne. */
  throne?: 'red' | 'gold' | 'white' | 'marble'
  arch?: boolean
  parasols?: boolean
  /** Replace the gold with another ramp (e.g. white marble). */
  recolor?: readonly string[]
  key?: string
}

function petals(g: Surface, cx: number, y: number, w: number, up: boolean, r: Ramp) {
  const x0 = Math.round(cx - w / 2)
  for (let x = x0; x < x0 + w; x++) {
    const k = (x - x0) % 4
    const hgt = k === 0 ? 1 : k === 1 || k === 3 ? 2 : 3
    for (let j = 0; j < hgt; j++) g.px(x, up ? y - j : y + j, j === hgt - 1 ? r.L : k === 2 ? r.b : r.d)
  }
}

function parasol(g: Surface, x: number, foot: number, top: number) {
  g.vline(x, top, foot, GOLD.d)
  g.vline(x + 1, top, foot, GOLD.D)
  const tiers = 5
  const span = Math.max(20, Math.round((foot - top) * 0.62))
  const step = Math.max(4, Math.floor(span / tiers))
  for (let i = 0; i < tiers; i++) {
    const y = top + 2 + i * step
    const hw = 2 + Math.round(i * 1.5)
    // Domed white canopy with a gold scalloped fringe.
    g.rect(x - hw + 1, y, hw * 2, 1, '#ffffff')
    g.rect(x - hw, y + 1, hw * 2 + 2, 2, '#fffaf0')
    g.px(x + hw + 1, y + 1, '#e9e1d0')
    g.px(x + hw + 1, y + 2, '#e9e1d0')
    g.hline(x - hw - 1, x + hw + 2, y + 3, GOLD.b)
    for (let k = -hw - 1; k <= hw + 2; k += 2) g.px(x + k, y + 4, GOLD.d)
  }
  g.px(x, top - 1, GOLD.L)
  g.px(x, top - 2, GOLD.b)
  g.rect(x - 2, foot - 2, 6, 2, GOLD.d)
}

/** Recolour a canvas from one ramp to another (bake time only). */
function recolorCanvas(src: HTMLCanvasElement, from: readonly string[], to: readonly string[]): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const map = new Map<number, [number, number, number]>()
  const rgb = (h: string): [number, number, number] => {
    const n = parseInt(h.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  from.forEach((h, i) => {
    const [r, g2, b] = rgb(h)
    map.set((r << 16) | (g2 << 8) | b, rgb(to[Math.min(i, to.length - 1)]))
  })
  const fromRgb = from.map(rgb)
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]
    let t = map.get(key)
    if (!t) {
      // Nearest ramp entry by luminance-weighted distance.
      let best = 0
      let bd = Infinity
      fromRgb.forEach(([r, g2, b], k) => {
        const dd = (r - d[i]) ** 2 + (g2 - d[i + 1]) ** 2 + (b - d[i + 2]) ** 2
        if (dd < bd) {
          bd = dd
          best = k
        }
      })
      t = rgb(to[Math.min(best, to.length - 1)])
      map.set(key, t)
    }
    d[i] = t[0]
    d[i + 1] = t[1]
    d[i + 2] = t[2]
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export const HD_MARBLE = ['#5a5068', '#8a8098', '#aaa2b8', '#c4bece', '#d8d4e0', '#e8e6ee', '#f4f3f7', '#fbfbfd', '#ffffff'] as const
export const HD_BRONZE = ['#24130c', '#43261a', '#62381f', '#7f4d28', '#9c6634', '#b98244', '#d4a25a', '#ecc47c', '#fff0c0'] as const

/** The sculpted Buddha canvas, optionally recoloured (cached). */
const hdCache = new Map<string, { canvas: HTMLCanvasElement; ox: number; oy: number }>()
export function buddhaHD(style: BuddhaStyle, s: number, recolor?: readonly string[]) {
  const key = `${style}:${s}:${recolor?.[4] ?? ''}`
  let r = hdCache.get(key)
  if (!r) {
    const b = buddhaSculpt(style, s)
    r = { canvas: recolor ? recolorCanvas(b.canvas, style === 'antique' ? ANTIQUE_RAMP : style === 'lanna' ? LANNA_RAMP : GOLD_RAMP, recolor) : b.canvas, ox: b.ox, oy: b.oy }
    hdCache.set(key, r)
  }
  return r
}

/** Principal Buddha image on its throne (anchor: front foot of the throne). */
export function principalBuddha(o: BuddhaOpts): Building {
  const s = o.s
  const style = o.style ?? 'sukhothai'
  const b = buddhaHD(style, s, o.recolor)
  const bw = Math.round(76 * s)
  const bh = Math.round(97 * s)
  const throneW = Math.round(bw * 1.32)
  const archHW = Math.round(bw * 0.62)
  const archH = Math.round(bh * 1.18)
  const pw = o.parasols ? 14 : 0
  const W = Math.max(throneW, archHW * 2 + 14) + pw * 2 + 4
  const tH = [Math.round(5 + s * 6), Math.round(4 + s * 5), Math.round(3 + s * 4)]
  const throneH = tH[0] + tH[1] + tH[2] + 4
  const H = archH + throneH + 16
  const cx = Math.round(W / 2)
  const key = o.key ?? `${style}:${s}:${o.throne ?? 'red'}:${o.arch ? 1 : 0}:${o.parasols ? 1 : 0}:${o.recolor?.[4] ?? ''}`
  return buildProp(`buddha:${key}`, W, H, cx, H - 1, (g, hooks) => {
    const foot = H - 1
    const seat = foot - throneH
    const TR: Ramp =
      o.throne === 'gold' ? GOLD_R : o.throne === 'white' ? WHITE_R : o.throne === 'marble' ? MARBLE_R : { L: '#e05a52', b: '#b8343f', d: '#8e2433', D: '#6e1a2a' }
    // --- flame arch (ซุ้มเรือนแก้ว) ---
    if (o.arch) {
      const base = seat + 2
      const topY = seat - archH
      const shoulder = seat - Math.round(archH * 0.45)
      const halfAt = (y: number) => {
        if (y >= shoulder) return archHW
        const t = (shoulder - y) / (shoulder - topY)
        return archHW * Math.pow(Math.max(0, 1 - t * t), 0.62)
      }
      // Backdrop.
      for (let y = topY + 2; y < base; y++) {
        const hw = halfAt(y) - 2
        if (hw > 0) g.rect(Math.round(cx - hw), y, Math.round(hw * 2), 1, '#4a1a2e')
      }
      for (let y = topY + 6; y < base; y += 4)
        for (let x = -archHW; x < archHW; x += 4) if (Math.abs(x) < halfAt(y) - 4 && hash(x, y, 3) % 3 === 0) g.px(cx + x + (y % 8 ? 0 : 2), y, GOLD.d)
      // Halo behind the head.
      const hy = seat - Math.round(bh * 0.78)
      g.circle(cx, hy, Math.round(bh * 0.2) + 2, GOLD.D)
      g.circle(cx, hy, Math.round(bh * 0.2), '#6a2438')
      for (let a = 0; a < Math.PI * 2; a += 0.3) g.px(Math.round(cx + Math.cos(a) * (bh * 0.2 + 1)), Math.round(hy + Math.sin(a) * (bh * 0.2 + 1)), GOLD.l)
      // Gold band + flames.
      for (let y = topY; y < base; y++) {
        const hw = halfAt(y)
        for (const sd of [-1, 1]) {
          const x = Math.round(cx + sd * hw)
          g.rect(sd < 0 ? x : x - 2, y, 3, 1, GOLD.b)
          g.px(sd < 0 ? x : x, y, sd < 0 ? GOLD.L : GOLD.D)
          if (y % 5 === 0) {
            g.px(x + sd * 2, y, GOLD.d)
            g.px(x + sd * 3, y - 1, GOLD.b)
            g.px(x + sd * 4, y - 2, GOLD.l)
          }
          if (y % 7 === 3) g.px(x - sd, y, '#e84a5a')
        }
      }
      // Finial flame.
      for (let i = 0; i < 9; i++) g.rect(cx - Math.max(0, 2 - Math.floor(i / 3)), topY - i, Math.max(1, 5 - Math.floor(i / 2)), 1, i % 2 ? GOLD.b : GOLD.l)
      hooks.glints = [
        { x: cx, y: topY - 8 },
        { x: cx - archHW, y: shoulder },
        { x: cx + archHW, y: shoulder },
      ]
    }
    // --- parasols ---
    if (o.parasols) {
      parasol(g, cx - Math.round(throneW / 2) - 7, foot - 2, seat - Math.round(bh * 0.9))
      parasol(g, cx + Math.round(throneW / 2) + 6, foot - 2, seat - Math.round(bh * 0.9))
    }
    // --- throne (ฐานชุกชี) ---
    let y = foot
    const widths = [throneW, Math.round(throneW * 0.88), Math.round(throneW * 0.76)]
    for (let i = 0; i < 3; i++) {
      y -= tH[i]
      tier(g, cx, y, tH[i], widths[i] / 2, TR, GOLD.d)
      g.hline(Math.round(cx - widths[i] / 2) + 1, Math.round(cx + widths[i] / 2) - 2, y + 1, GOLD.b)
      // Gold rosettes / glass mosaic.
      for (let x = Math.round(cx - widths[i] / 2) + 4; x < cx + widths[i] / 2 - 3; x += 5) {
        g.px(x, y + Math.round(tH[i] / 2), GOLD.l)
        if (tH[i] > 5) g.px(x + 2, y + Math.round(tH[i] / 2) + 1, '#8fd8f0')
      }
    }
    // Lotus pedestal.
    petals(g, cx, y, Math.round(throneW * 0.7), true, GOLD_R)
    petals(g, cx, y - 3, Math.round(throneW * 0.64), true, GOLD_R)
    // --- Buddha ---
    g.draw(b.canvas, cx - b.ox, seat - b.oy + 1)
    hooks.chest = [{ x: cx, y: seat - Math.round(bh * 0.45) }]
    hooks.head = [{ x: cx, y: seat - Math.round(bh * 0.86) }]
    hooks.seat = [{ x: cx, y: seat }]
  })
}

// ---------------------------------------------------------------------------
// Altar & offerings.

/** Tiered altar set (โต๊ะหมู่บูชา) with candles, incense, vases and fruit. */
export function altarSprite(lacquer: 'red' | 'black' | 'teak' = 'red', wide = 1): Building {
  const W = Math.round(56 * wide)
  const H = 34
  return buildProp(`altar:${lacquer}:${wide}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const L: Ramp = lacquer === 'black' ? { L: '#5a4a5e', b: '#3a2838', d: '#2a1a28', D: '#1a0e18' } : lacquer === 'teak' ? TEAK_R : RED_R
    const table = (x: number, top: number, w: number, legH: number) => {
      // Top board.
      g.rect(x, top, w, 3, L.b)
      g.hline(x, x + w - 1, top, L.L)
      g.hline(x, x + w - 1, top + 2, GOLD.d)
      // Apron with stencil.
      g.rect(x + 1, top + 3, w - 2, 4, L.d)
      for (let i = x + 3; i < x + w - 3; i += 4) {
        g.px(i, top + 4, GOLD.b)
        g.px(i + 1, top + 5, GOLD.d)
      }
      g.hline(x + 1, x + w - 2, top + 7, GOLD.D)
      // Curved gold legs.
      for (const lx of [x + 1, x + w - 3]) {
        g.rect(lx, top + 7, 2, legH, GOLD.d)
        g.px(lx + (lx > cx ? 1 : 0), top + 7 + legH - 1, GOLD.b)
        g.px(lx + (lx > cx ? 2 : -1), top + 7 + legH - 1, GOLD.D)
      }
    }
    // Back table (tall).
    table(Math.round(cx - 20 * wide), 6, Math.round(40 * wide), 16)
    // Side low tables.
    table(1, 16, 14, 11)
    table(W - 15, 16, 14, 11)
    // Front table (middle height).
    table(Math.round(cx - 12), 13, 24, 13)
    // Vases with lotus on the back table.
    for (const vx of [Math.round(cx - 14 * wide), Math.round(cx + 14 * wide)]) {
      g.rect(vx - 2, 1, 5, 5, GOLD.d)
      g.px(vx - 1, 2, GOLD.L)
      g.rect(vx - 1, 0, 3, 1, GOLD.b)
      for (const [dx, dy, c] of [
        [-2, -4, '#ff9fc0'],
        [0, -6, '#ffd6e0'],
        [2, -4, '#ff9fc0'],
        [-1, -2, '#43905a'],
        [1, -2, '#43905a'],
      ] as const) {
        g.rect(vx + dx, dy + 1, 2, 3, c)
      }
    }
    // Small golden Buddha / relic casket in the middle of the back table.
    g.rect(cx - 3, 1, 6, 5, GOLD.b)
    g.rect(cx - 2, -1, 4, 2, GOLD.d)
    g.px(cx, -2, GOLD.L)
    g.px(cx - 1, 2, GOLD.L)
    // Candlesticks on the front table.
    const flames = []
    for (const sx of [cx - 9, cx + 8]) {
      g.rect(sx - 1, 11, 3, 2, GOLD.d)
      g.rect(sx, 5, 1, 6, '#fff4d6')
      g.px(sx, 5, '#ffffff')
      flames.push({ x: sx, y: 4 })
    }
    // Incense bowl with sticks.
    g.rect(cx - 4, 9, 8, 4, BRONZE_R.b)
    g.hline(cx - 4, cx + 3, 9, BRONZE_R.L)
    g.hline(cx - 4, cx + 3, 12, BRONZE_R.D)
    for (let i = -2; i <= 2; i++) {
      g.vline(cx + i, 4 + Math.abs(i), 8, '#c0392b')
      g.px(cx + i, 3 + Math.abs(i), '#ffb35a')
    }
    // Fruit & garlands on the side tables.
    g.circle(5, 14, 2, '#ffd23f')
    g.circle(9, 14, 2, '#e8514a')
    g.circle(W - 9, 14, 2, '#86c95f')
    g.circle(W - 5, 14, 2, '#f58f35')
    for (let i = 0; i < 5; i++) {
      g.px(cx - 10 + i * 5, 21, i % 2 ? '#fffaf0' : '#ffd23f')
      g.px(cx - 10 + i * 5, 22, '#e8514a')
    }
    hooks.flames = flames
    hooks.smoke = [{ x: cx, y: 2 }]
    hooks.glints = [{ x: cx, y: -1 }]
  })
}

/** Tall brass floor candle stand (เชิงเทียนพื้น). Hook `flame`. */
export function floorCandleSprite(): Building {
  return buildProp('floorcandle', 9, 34, 4, 33, (g, hooks) => {
    g.rect(1, 30, 7, 3, BRONZE_R.d)
    g.hline(1, 7, 30, BRONZE_R.L)
    g.rect(2, 28, 5, 2, BRONZE_R.b)
    for (let y = 10; y < 28; y++) g.px(4, y, y % 5 === 0 ? BRONZE_R.L : BRONZE_R.b)
    for (let y = 10; y < 28; y++) g.px(5, y, BRONZE_R.D)
    for (const y of [14, 20, 25]) g.rect(3, y, 3, 1, BRONZE_R.L)
    g.rect(1, 8, 7, 2, BRONZE_R.b)
    g.hline(1, 7, 8, BRONZE_R.L)
    g.rect(3, 1, 3, 7, '#fff4d6')
    g.px(3, 1, '#ffffff')
    g.px(5, 3, '#e9d6b0')
    hooks.flame = [{ x: 4, y: 0 }]
  })
}

/** Floor vase with a big spray of lotus and marigolds. */
export function lotusVaseSprite(): Building {
  return buildProp('lotusvase', 14, 24, 7, 23, (g) => {
    for (let y = 13; y < 23; y++) slice(g, 7, y, 3 + Math.sin(((y - 13) / 10) * Math.PI) * 2.5, { L: '#a6bfe4', b: '#4462a8', d: '#2c3f78', D: '#1c2446' }, 0.35)
    g.hline(3, 10, 13, '#eef3fb')
    for (let i = 0; i < 5; i++) g.px(4 + i * 1.5, 17, '#eef3fb')
    const buds: [number, number, string][] = [
      [2, 4, '#ff9fc0'],
      [7, 1, '#ffd6e0'],
      [11, 4, '#ff9fc0'],
      [5, 7, '#f58f35'],
      [9, 7, '#ffd23f'],
    ]
    for (const [x, y, c] of buds) {
      g.vline(x, y + 3, 13, '#43905a')
      g.rect(x - 1, y, 3, 3, c)
      g.px(x, y - 1, mixHex(c, '#ffffff', 0.5))
    }
  })
}

// ---------------------------------------------------------------------------
// Furniture & job props.

/** Monks' raised seat (อาสน์สงฆ์) with triangle cushions and ceremonial fans. */
export function monkDaisSprite(len = 44): Building {
  const W = len
  const H = 30
  return buildProp(`dais:${len}`, W, H, W / 2, H - 1, (g) => {
    // Platform body.
    g.rect(0, 14, W, 12, P.redD)
    g.hline(0, W - 1, 14, GOLD.b)
    g.hline(0, W - 1, 15, GOLD.d)
    for (let x = 3; x < W - 2; x += 6) {
      g.rect(x, 18, 4, 5, P.redDD)
      g.px(x + 1, 19, GOLD.d)
      g.px(x + 2, 21, GOLD.d)
    }
    g.rect(0, 26, W, 3, GOLD.D)
    // Top surface (mat).
    g.rect(1, 9, W - 2, 5, '#e0bb8a')
    for (let x = 2; x < W - 2; x += 3) g.px(x, 11, '#c9a06a')
    // Triangle pillows (หมอนอิง) and fans (ตาลปัตร).
    for (let x = 4; x + 8 < W; x += 13) {
      g.poly(
        [
          [x, 11],
          [x + 4, 3],
          [x + 8, 11],
        ],
        '#e8b44a',
      )
      g.line(x + 1, 10, x + 4, 4, '#fff3a6')
      g.hline(x, x + 8, 11, '#b8742a')
      // Fan on its stand.
      g.vline(x + 10, 3, 11, '#6e4a35')
      g.ellipse(x + 10, 2, 2.5, 3, '#f58f35')
      g.px(x + 10, 1, '#ffd23f')
    }
  })
}

/** Wooden shoe rack with colourful pairs (job:arrange_shoes). */
export function shoeRackSprite(): Building {
  return buildProp('shoerack', 30, 20, 15, 19, (g) => {
    const wood: Ramp = TEAK_R
    for (const x of [0, 28]) g.rect(x, 0, 2, 20, wood.d)
    for (const y of [5, 11, 17]) {
      g.rect(0, y, 30, 2, wood.b)
      g.hline(0, 29, y, wood.L)
    }
    const cols = ['#e8514a', '#5a8de0', '#3a3040', '#fffaf0', '#ff9fc0', '#6cc36a', '#f58f35', '#ffd23f']
    let k = 0
    for (const y of [5, 11, 17]) {
      for (let x = 3; x < 26; x += 6) {
        const c = cols[(k * 5 + 3) % cols.length]
        k++
        if ((k * 7) % 5 === 0) continue
        g.rect(x, y - 2, 2, 2, c)
        g.rect(x + 2, y - 2, 2, 2, c)
        g.px(x, y - 2, mixHex(c, '#ffffff', 0.4))
      }
    }
  })
}

/** Mop, bucket and a "wet floor" sign (job:mop_floor). */
export function mopBucketSprite(): Building {
  return buildProp('mopbucket', 22, 24, 11, 23, (g) => {
    // Bucket.
    for (let y = 15; y < 23; y++) slice(g, 7, y, 4.5 - (y - 15) * 0.15, { L: '#9fd0ff', b: '#5a8de0', d: '#3d63b5', D: '#26306e' }, 0.35)
    g.ellipse(7, 15, 4.5, 1.3, '#b3eef4')
    g.hline(3, 11, 14, '#26306e')
    // Mop leaning.
    g.line(9, 16, 14, 0, '#c28e5c')
    for (let i = -2; i <= 2; i++) g.line(9, 16, 8 + i, 20, '#fffaf0')
    // Yellow sign.
    g.poly(
      [
        [15, 22],
        [18, 10],
        [21, 22],
      ],
      '#ffd23f',
    )
    g.line(15, 22, 18, 10, '#e9a53a')
    g.px(18, 15, '#3a2838')
    g.px(18, 17, '#3a2838')
    g.px(18, 18, '#3a2838')
  })
}

/** A small gold Buddha on a table covered in gold-leaf flakes (ปิดทอง). */
export function goldLeafTableSprite(): Building {
  return buildProp('goldleaf', 24, 28, 12, 27, (g, hooks) => {
    g.rect(1, 17, 22, 3, P.redD)
    g.hline(1, 22, 17, GOLD.l)
    g.rect(2, 20, 20, 5, P.redDD)
    g.rect(2, 25, 2, 3, GOLD.d)
    g.rect(20, 25, 2, 3, GOLD.d)
    // Buddha.
    for (let y = 12; y < 17; y++) slice(g, 12, y, 6 - (16 - y) * 0.4, GOLD_R, 0.35)
    for (let y = 6; y < 12; y++) slice(g, 12, y, 2.6 + (y - 6) * 0.35, GOLD_R, 0.35)
    g.circle(12, 4, 2.4, GOLD.b)
    g.px(12, 1, GOLD.L)
    g.px(11, 3, GOLD.L)
    // Flakes.
    for (const [x, y] of [[9, 8], [14, 10], [11, 13], [15, 14], [8, 14]]) {
      g.px(x, y, '#fff8d8')
      g.px(x + 1, y, GOLD.L)
    }
    // Tray with leaf packets.
    g.rect(3, 15, 5, 2, '#fffaf0')
    g.rect(17, 15, 5, 2, '#fffaf0')
    g.px(4, 15, GOLD.b)
    g.px(19, 15, GOLD.b)
    hooks.glints = [{ x: 12, y: 3 }]
  })
}

/** Fortune sticks (เซียมซี) cylinder on a little red table. */
export function siamsiSprite(): Building {
  return buildProp('siamsi', 14, 20, 7, 19, (g) => {
    g.rect(0, 12, 14, 2, P.redD)
    g.hline(0, 13, 12, GOLD.l)
    g.rect(1, 14, 2, 6, P.redDD)
    g.rect(11, 14, 2, 6, P.redDD)
    g.rect(4, 5, 6, 7, '#c0392b')
    g.hline(4, 9, 5, GOLD.b)
    g.hline(4, 9, 11, GOLD.b)
    g.px(6, 8, GOLD.l)
    for (let i = 0; i < 6; i++) g.vline(4 + i, 1 + (i % 3), 5, '#e9c47a')
    g.px(6, 0, '#e8514a')
  })
}

/** Stepped shelf with a row of small Buddha images (job:wipe_statues). */
export function buddhaShelfSprite(n = 5, metal: 'gold' | 'bronze' = 'gold'): Building {
  const W = n * 11 + 4
  const H = 30
  return buildProp(`bshelf2:${n}:${metal}`, W, H, W / 2, H - 1, (g, hooks) => {
    const R: Ramp = metal === 'gold' ? GOLD_R : BRONZE_R
    g.rect(0, 21, W, 8, P.redD)
    g.hline(0, W - 1, 21, GOLD.b)
    g.rect(1, 23, W - 2, 5, P.redDD)
    for (let x = 3; x < W - 2; x += 5) g.px(x, 25, GOLD.d)
    const glints = []
    for (let i = 0; i < n; i++) {
      const x = 7 + i * 11
      const tall = i % 2 === 0
      const base = 21
      // Halo backplate.
      g.circle(x, base - 13 - (tall ? 1 : 0), 4, '#6a2438')
      g.circle(x, base - 13 - (tall ? 1 : 0), 3, '#8e2433')
      // Lotus pedestal.
      g.rect(x - 4, base - 2, 9, 2, R.d)
      for (let k = -4; k <= 4; k += 2) g.px(x + k, base - 3, R.L)
      // Crossed legs.
      for (let y = base - 5; y < base - 2; y++) slice(g, x + 0.5, y, 4, R, 0.35)
      // Torso with robe fold.
      for (let y = base - 10; y < base - 5; y++) slice(g, x + 0.5, y, 1.8 + (y - (base - 10)) * 0.35, R, 0.35)
      g.line(x - 1, base - 9, x + 2, base - 6, R.D)
      // Head, curls and flame.
      const hy = base - 13 - (tall ? 1 : 0)
      g.rect(x - 1, hy, 3, 3, R.b)
      g.px(x - 1, hy, R.L)
      g.px(x + 1, hy + 2, R.d)
      g.px(x, hy - 1, R.d)
      g.px(x, hy - 2, R.L)
      g.px(x, hy + 3, R.b)
      glints.push({ x, y: hy - 2 })
    }
    hooks.glints = glints
  })
}

/** Glass display cabinet with Buddha images or relics. */
export function glassCabinetSprite(kind: 'buddha' | 'relic' | 'amulet' = 'buddha'): Building {
  return buildProp(`cabinet:${kind}`, 26, 34, 13, 33, (g, hooks) => {
    g.rect(0, 26, 26, 7, TEAK_R.d)
    g.hline(0, 25, 26, TEAK_R.L)
    g.rect(1, 2, 24, 24, '#cfe8f0')
    g.frame(0, 1, 26, 26, TEAK_R.b)
    g.rect(0, 0, 26, 2, TEAK_R.b)
    g.hline(0, 25, 0, TEAK_R.L)
    for (const y of [11, 19]) g.hline(1, 24, y, TEAK_R.D)
    if (kind === 'relic') {
      // Golden stupa-shaped reliquary.
      for (let y = 12; y < 25; y++) slice(g, 13, y, 1.5 + Math.max(0, (y - 12) * 0.35), GOLD_R, 0.35)
      g.circle(13, 16, 4, GOLD.b)
      g.px(12, 14, GOLD.L)
      g.vline(13, 5, 11, GOLD.d)
      g.px(13, 4, '#ffffff')
      g.px(13, 19, '#ffffff')
    } else {
      const cols = kind === 'amulet' ? ['#c9a04c', '#6e5230', '#fff3a6', '#bdb2ae'] : [GOLD.b, GOLD.d, GOLD.l]
      for (const y of [10, 18, 25]) {
        for (let x = 4; x < 24; x += 5) {
          const c = cols[(x + y) % cols.length]
          if (kind === 'amulet') {
            g.circle(x, y - 3, 1.8, c)
            g.px(x - 1, y - 4, '#ffffff')
          } else {
            g.rect(x - 1, y - 3, 3, 3, c)
            g.px(x, y - 5, c)
            g.px(x - 1, y - 3, GOLD.L)
          }
        }
      }
    }
    // Glass shine.
    g.line(4, 3, 9, 24, '#ffffff')
    g.alpha(0.5)
    g.line(6, 3, 11, 24, '#ffffff')
    g.alpha(1)
    hooks.glints = [{ x: 13, y: 12 }]
  })
}

/** Big bronze gong on a red frame (ฆ้อง). */
export function gongSprite(): Building {
  return buildProp('gong', 26, 32, 13, 31, (g, hooks) => {
    for (const x of [1, 23]) g.rect(x, 2, 3, 29, P.redD)
    g.rect(0, 1, 26, 3, P.redD)
    g.hline(0, 25, 1, GOLD.l)
    g.circle(13, 16, 9, BRONZE_R.d)
    g.circle(13, 16, 8, BRONZE_R.b)
    g.circle(12, 15, 5, BRONZE_R.d)
    g.circle(13, 16, 3, BRONZE_R.L)
    g.px(12, 15, '#ffffff')
    g.line(13, 4, 13, 7, '#6e4a35')
    hooks.gong = [{ x: 13, y: 16 }]
  })
}

/** Plaque with the temple's name (white on red). */
export function namePlaque(key: string, w = 30): Building {
  return buildProp(`plaque:${key}`, w, 10, w / 2, 9, (g) => {
    g.rect(0, 0, w, 10, GOLD.d)
    g.rect(1, 1, w - 2, 8, P.redD)
    g.hline(3, w - 4, 4, GOLD.l)
    g.hline(5, w - 6, 6, GOLD.b)
  })
}

/** Hanging jasmine garland loops painted on a wall/beam (baked). */
export function garlandSwag(g: Surface, x0: number, x1: number, y: number, sag = 5) {
  const n = Math.max(2, Math.round((x1 - x0) / 2))
  for (let i = 0; i <= n; i++) {
    const f = i / n
    const x = Math.round(x0 + (x1 - x0) * f)
    const yy = Math.round(y + Math.sin(f * Math.PI) * sag)
    g.px(x, yy, i % 3 === 0 ? '#fffaf0' : '#f0ead8')
    if (i % 5 === 0) g.px(x, yy + 1, '#e8514a')
  }
}

/** Dust motes drifting in a light shaft – returns a random point in the shaft. */
export function shaftPoint(x0: number, y0: number, x1: number, y1: number, width: number): [number, number] {
  const t = Math.random()
  const x = x0 + (x1 - x0) * t + (Math.random() - 0.5) * width
  const y = y0 + (y1 - y0) * t
  return [x, y]
}

/** Additive light shafts from windows (drawn per frame in `glow`, cheap polygons). */
export function drawShaft(g: Surface, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, a: number, color = '255,236,190') {
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'lighter'
  g.ctx.fillStyle = `rgba(${color},${a.toFixed(3)})`
  g.ctx.beginPath()
  g.ctx.moveTo(x0 - w0 / 2 - g.ox, y0 - g.oy)
  g.ctx.lineTo(x0 + w0 / 2 - g.ox, y0 - g.oy)
  g.ctx.lineTo(x1 + w1 / 2 - g.ox, y1 - g.oy)
  g.ctx.lineTo(x1 - w1 / 2 - g.ox, y1 - g.oy)
  g.ctx.closePath()
  g.ctx.fill()
  g.ctx.restore()
}

export { ROOF, ditherOn }
