// Shared art for the "historic" group of real places (Ayutthaya, Hua Hin,
// Phitsanulok, Lampang and Nan): sprite/sculpt helpers, brick masonry,
// statue ramps and recolouring, and props that several of the places use
// (vendor stalls, signs, shoe racks, big trees, elephants, rope fences…).
//
// Every builder returns a cached Prop (sprite + ground anchor) or a Building
// (Prop + animation hooks relative to the anchor), like src/art/temple.ts.

import { bake, createCanvas, hexToRgb, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas } from '../../engine/sprite'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { GOLD, WHITE, slice, type Ramp } from '../temple'
import { sculpt, type SculptOpts, type Sculpted } from '../hall'
import { canopy, LEAVES, type LeafRamp } from '../garden'

// ---------------------------------------------------------------------------
// Sprite builders

export interface Pt {
  x: number
  y: number
}

export interface Building extends Prop {
  hooks: Record<string, Pt[]>
}

/** Bake a sprite once (outlined in plum ink) with hooks stored relative to the anchor. */
export function build(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): Building {
  return cached('hist:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as Building
    const o = outlineCanvas(c, P.ink)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as Building
  }) as Building
}

export function spr(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface) => void, outline = true): Prop {
  return build(key, w, h, ax, ay, (g) => fn(g), outline)
}

/** World position of a building hook. */
export function hookAt(p: { x: number; y: number }, h: Pt): Pt {
  return { x: p.x + h.x, y: p.y + h.y }
}

/** Integer hash in 0..999. */
export function hsh(x: number, y: number, s = 0): number {
  return (((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

/** Seeded pseudo random generator (0..1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Sculpt helpers (analytic 3D statues from src/art/hall.ts).
// Local units: x right, y UP, z toward the viewer.

export type Prim = SculptOpts['prims'][number]
export type V3 = [number, number, number]

export const E = (x: number, y: number, z: number, rx: number, ry: number, rz: number, part: number, minY?: number): Prim => ({ t: 0, x, y, z, rx, ry, rz, part, minY })
export const C = (a: V3, b: V3, ra: number, rb: number, part: number, minY?: number, zk = 1): Prim => ({
  t: 1,
  ax: a[0],
  ay: a[1],
  az: a[2],
  bx: b[0],
  by: b[1],
  bz: b[2],
  ra,
  rb,
  part,
  minY,
  zk,
})

/** Assign a material index to primitives. */
export function M(m: number, ...ps: Prim[]): Prim[] {
  for (const p of ps) p.m = m
  return ps
}

const sculptCache = new Map<string, Sculpted>()
export function sculptCached(key: string, o: SculptOpts): Sculpted {
  let r = sculptCache.get(key)
  if (!r) {
    r = sculpt(o)
    sculptCache.set(key, r)
  }
  return r
}

/** Draw a sculpted canvas with its local origin at (x, y). */
export function drawSculpt(g: Surface, s: Sculpted | { canvas: HTMLCanvasElement; ox: number; oy: number }, x: number, y: number) {
  g.draw(s.canvas, Math.round(x) - s.ox, Math.round(y) - s.oy)
}

// Colour ramps for statues (index 0 = outline, 1..8 dark→light).
export const STUCCO = ['#3a3034', '#5e5256', '#7e7274', '#9c9290', '#b8aea8', '#cfc6bc', '#e2dacd', '#f0eadf', '#fbf8f0'] as const
/** Old, dark weathered stucco over brick (headless images). */
export const OLD_STUCCO = ['#1e181a', '#3a3032', '#50443f', '#665850', '#7c6c62', '#928074', '#a69486', '#b8a898', '#c8baa8'] as const
/** Matte whitewash, a little grimy (restored open-air images). */
export const MATTE_STUCCO = ['#3a2e2e', '#62544e', '#7e6e66', '#98887e', '#ae9e92', '#c2b4a6', '#d2c6b6', '#ddd2c2', '#e6dccc'] as const
export const SANDSTONE = ['#2c2628', '#4a4044', '#665c5e', '#827876', '#9e948e', '#b8aea4', '#cec4b8', '#e2d9cc', '#f4eee4'] as const
export const BRICK9 = ['#3a1a14', '#5a2620', '#7e3627', '#a0452f', '#bd5a3a', '#d0704a', '#e08a5e', '#eca47a', '#f6c49c'] as const
export const SAFFRON = ['#4a1a08', '#7a2e0c', '#a84212', '#cc5a18', '#e67422', '#f58f35', '#ffab52', '#ffc878', '#ffe6b0'] as const
export const MONK_SKIN = ['#24140e', '#3e2418', '#5a3522', '#74462c', '#8e5a38', '#a87048', '#c08a5e', '#d6a67c', '#ecc8a2'] as const
export const ELE_GREY = ['#2a2830', '#46424e', '#5e5a66', '#76727e', '#8e8a94', '#a6a2aa', '#bcb8be', '#d2cfd2', '#e8e6e6'] as const
export const ELE_WHITE = ['#4a4450', '#76707c', '#9a94a0', '#b6b0ba', '#ccc8cf', '#dedae0', '#ebe8ec', '#f6f4f6', '#ffffff'] as const
export const GOLD9 = ['#3b1a0e', '#62301a', '#8c4a1c', '#b36a22', '#d38a2a', '#eaaa36', '#f7c84c', '#ffe38a', '#fff8d8'] as const
export const DARK_GOLD9 = ['#1e0c08', '#3a1a0e', '#5a2c12', '#7e4418', '#a4621e', '#c8842a', '#e6a83c', '#f8cc66', '#fff0b0'] as const
export const BRONZE9 = ['#24130c', '#43261a', '#62381f', '#7f4d28', '#9c6634', '#b98244', '#d4a25a', '#ecc47c', '#fff0c0'] as const
export const LACQUER9 = ['#140608', '#24080c', '#3a0e12', '#521418', '#6a1c1e', '#842624', '#a0342a', '#bc4a36', '#d8684a'] as const

/**
 * Recolour a canvas: every opaque pixel is matched to the nearest colour of
 * `from` and replaced by `pick(index, x, y)` (baked once, never per frame).
 */
export function recolorBy(src: HTMLCanvasElement, from: readonly string[], pick: (i: number, x: number, y: number) => string): HTMLCanvasElement {
  const c = createCanvas(src.width, src.height)
  const ctx = c.getContext('2d')!
  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const F = from.map(hexToRgb)
  const memo = new Map<string, [number, number, number]>()
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 20) continue
    let best = 0
    let bd = Infinity
    for (let k = 0; k < F.length; k++) {
      const dr = d[i] - F[k][0]
      const dg = d[i + 1] - F[k][1]
      const db = d[i + 2] - F[k][2]
      const dd = dr * dr + dg * dg + db * db
      if (dd < bd) {
        bd = dd
        best = k
      }
    }
    const p = i >> 2
    const hex = pick(best, p % c.width, Math.floor(p / c.width))
    let rgb = memo.get(hex)
    if (!rgb) {
      rgb = hexToRgb(hex)
      memo.set(hex, rgb)
    }
    d[i] = rgb[0]
    d[i + 1] = rgb[1]
    d[i + 2] = rgb[2]
    d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return c
}

export function recolor(src: HTMLCanvasElement, from: readonly string[], to: readonly string[]): HTMLCanvasElement {
  return recolorBy(src, from, (i) => to[Math.min(i, to.length - 1)])
}

// ---------------------------------------------------------------------------
// Brick masonry (Ayutthaya / Lanna red brick).

export const BR = {
  L: '#ec9c72',
  b: '#cf6a46',
  d: '#aa4f38',
  D: '#833a2c',
  DD: '#5e2a24',
  mortar: '#dcbda6',
  mortarD: '#b0907e',
  moss: '#7fa058',
  mossD: '#5e7e44',
}

const BRICK_TONES = [BR.DD, BR.D, BR.d, BR.b, BR.L]

export interface BrickOpts {
  seed?: number
  /** Overall brightness 0..1 (0.55 = a face in full light). */
  light?: number
  /** Brightness change across the width (negative = right side darker). */
  slope?: number
  course?: number
  len?: number
  /** 0..1: amount of whitish stucco still clinging to the bricks. */
  stucco?: number
  /** 0..1: moss and dark water stains. */
  moss?: number
}

/** Colour of one pixel of brickwork at world pixel (X, Y) with brightness `light`. */
export function brickColor(X: number, Y: number, light: number, o: BrickOpts): Color {
  const course = o.course ?? 3
  const len = o.len ?? 5
  const seed = o.seed ?? 0
  const r = Math.floor(Y / course)
  const inRow = ((Y % course) + course) % course
  const stag = (r & 1) * Math.floor(len / 2)
  const bx = X + stag
  const bi = Math.floor(bx / len)
  const v = hsh(bi, r, seed)
  // Stucco remnants in small ragged patches.
  if (o.stucco) {
    const n = Math.sin(X * 0.37 + seed) + Math.cos(Y * 0.31 + X * 0.13 + seed * 0.3) + Math.sin((X - Y) * 0.19 + seed * 0.7)
    const thr = 2.55 - o.stucco * 1.6
    if (n > thr || (n > thr - 0.25 && ((X + Y) & 1) === 0)) {
      const k = Math.max(0, Math.min(1, light)) - (n < thr ? 0.15 : 0)
      return k > 0.62 ? '#e6ddd0' : k > 0.42 ? '#cfc4b6' : k > 0.25 ? '#b0a496' : '#8c8078'
    }
  }
  if (o.moss) {
    const mv = hsh(X, Y, seed + 7)
    if (mv < o.moss * 40) return mv % 2 ? BR.moss : BR.mossD
  }
  if (inRow === course - 1) return light > 0.5 ? BR.mortar : BR.mortarD
  if (((bx % len) + len) % len === 0) return light > 0.35 ? BR.mortarD : BR.D
  let t = light * 4 + (v < 180 ? -1 : v > 880 ? 1 : 0) + (inRow === 0 ? 0.4 : 0)
  if (v % 97 === 0) t -= 2 // a scorched brick
  // Dark lichen and soot in broad weathered patches.
  const m = Math.sin(X * 0.09 + seed * 1.3) * Math.cos(Y * 0.07 - seed) + Math.sin((X + Y) * 0.05 + seed) * 0.4
  if (m > 0.62) t -= 1
  return BRICK_TONES[Math.max(0, Math.min(4, Math.round(t)))]
}

/** Flat brick face (running bond), lit from the left. */
export function bricks(g: Surface, x: number, y: number, w: number, h: number, o: BrickOpts = {}) {
  const light = o.light ?? 0.55
  const slope = o.slope ?? -0.12
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const l = light + slope * (i / Math.max(1, w - 1))
      g.px(x + i, y + j, brickColor(x + i, y + j, l, o))
    }
}

/** One row of a round brick body (chedi bell, prang), shaded like a cylinder. */
export function brickSlice(g: Surface, cx: number, y: number, half: number, o: BrickOpts = {}) {
  if (half <= 0.4) return
  const x0 = Math.round(cx - half)
  const x1 = Math.round(cx + half)
  const len = o.len ?? 5
  for (let x = x0; x < x1; x++) {
    const u = Math.max(-0.999, Math.min(0.999, (x + 0.5 - cx) / half))
    const light = 0.8 - (u + 1) * 0.36 + (o.light ?? 0.55) - 0.55
    // Bricks shrink toward the silhouette.
    const arc = Math.asin(u) * half * 1.1
    const X = Math.round(arc + cx) + Math.floor(Math.abs(u) > 0.85 ? 0 : 0)
    g.px(x, y, brickColor(X, y, light, { ...o, len }))
  }
}

/** Redented brick tier seen from the front: a lit top ledge, brick face and shadow line. */
export function brickTier(g: Surface, cx: number, top: number, h: number, half: number, o: BrickOpts = {}) {
  const x0 = Math.round(cx - half)
  const w = Math.round(half * 2)
  bricks(g, x0, top + 1, w, h - 1, o)
  g.hline(x0, x0 + w - 1, top, BR.L)
  g.hline(x0 + 1, x0 + w - 2, top + 1, mixHex(BR.L, BR.b, 0.5))
  // Redent shadows near the corners.
  if (half > 6) {
    g.vline(x0 + 3, top + 2, top + h - 1, BR.L)
    g.vline(x0 + w - 4, top + 2, top + h - 1, BR.DD)
    g.vline(x0 + w - 3, top + 2, top + h - 1, BR.D)
  }
}

/** Water stains streaking down from ledges. */
export function stains(g: Surface, x0: number, x1: number, y: number, len: number, seed: number, color = 'rgba(40,20,20,0.22)') {
  for (let x = x0; x <= x1; x++) {
    const v = hsh(x, y, seed)
    if (v > 260) continue
    const l = Math.round(len * (0.3 + (v % 70) / 100))
    g.rect(x, y, 1, l, color)
  }
}

/** Grass tufts and a small plant clinging to a ruined ledge. */
export function ruinPlants(g: Surface, x0: number, x1: number, y: number, seed: number, dens = 0.25) {
  for (let x = x0; x <= x1; x++) {
    const v = hsh(x, y, seed + 3)
    if (v > dens * 1000) continue
    const h = 1 + (v % 3)
    g.vline(x, y - h, y, v % 2 ? '#6fa050' : '#8fc060')
    if (v % 5 === 0) g.px(x + 1, y - h, '#a8d070')
    if (v % 17 === 0) {
      g.circle(x, y - 3, 2, '#5e9a4a')
      g.px(x - 1, y - 4, '#8fc060')
    }
  }
}

// ---------------------------------------------------------------------------
// Tower painter: prangs and chedis are stacks of segments (square tiers, round
// mouldings, bells, corn-cob tiers…) painted row by row from the ground up.

export interface Seg {
  h: number
  /** Half width at t (0 = bottom row, 1 = top row of the segment). */
  half: (t: number) => number
  round?: boolean
  /** Lit ledge on the top row (a cornice or tier edge). */
  ledge?: boolean
  /** Optional override colour for a pixel (u = -1..1 across the row). */
  paint?: (x: number, y: number, u: number, t: number, base: Color) => Color | null
}

export type Material = (x: number, y: number, light: number, u: number) => Color

export interface TowerOut {
  /** Row extents: y → [x0, x1) of the painted silhouette. */
  rows: Map<number, [number, number]>
  /** y of each segment's top row. */
  tops: number[]
  cx: (y: number) => number
}

export function paintTower(
  g: Surface,
  cx0: number,
  gy: number,
  segs: Seg[],
  mat: Material,
  o: { lean?: number; cut?: (x: number) => number; ledgeLight?: Color; ledgeShade?: Color } = {},
): TowerOut {
  const total = segs.reduce((s, q) => s + q.h, 0)
  const lean = o.lean ?? 0
  const cx = (y: number) => cx0 + (lean * (gy - y)) / Math.max(1, total)
  const cut = o.cut ?? (() => -1e9)
  const rows = new Map<number, [number, number]>()
  const tops: number[] = []
  let y = gy
  for (const s of segs) {
    for (let i = 0; i < s.h; i++, y--) {
      const t = s.h > 1 ? i / (s.h - 1) : 1
      const top = s.ledge && i === s.h - 1
      const hf = s.half(t) + (top ? 1 : 0)
      if (hf <= 0.3) continue
      const c = cx(y)
      const x0 = Math.round(c - hf)
      const x1 = Math.max(x0 + 1, Math.round(c + hf))
      rows.set(y, [x0, x1])
      for (let x = x0; x < x1; x++) {
        if (y < cut(x)) continue
        const u = Math.max(-1, Math.min(1, (x + 0.5 - c) / hf))
        const light = s.round ? 0.8 - (u + 1) * 0.36 : 0.64 - (u + 1) * 0.13
        let col: Color
        if (top) col = u < 0.55 ? (o.ledgeLight ?? BR.L) : (o.ledgeShade ?? BR.b)
        else col = mat(x, y, light, u)
        const p = s.paint?.(x, y, u, t, col)
        g.px(x, y, p ?? col)
      }
      // Redent lines on square tiers.
      if (!s.round && hf > 7 && !top) {
        const a = x0 + 2
        const b = x1 - 3
        if (y >= cut(a)) g.px(a, y, mixHex(mat(a, y, 0.9, -0.8), '#ffffff', 0.15))
        if (y >= cut(b)) g.px(b, y, mixHex(mat(b, y, 0.1, 0.8), '#000000', 0.2))
      }
    }
    tops.push(y + 1)
  }
  return { rows, tops, cx }
}

/** Brick material for paintTower. */
export function brickMat(o: BrickOpts): Material {
  return (x, y, light) => brickColor(x, y, light, o)
}

// ---------------------------------------------------------------------------
// Ground painters (baked layers).

/** Laterite / brick-dust path with scattered brick fragments. */
export function brickPath(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, '#d9a07a')
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = hsh(x + i, y + j, seed)
      if (v < 60) g.px(x + i, y + j, '#c4845e')
      else if (v > 960) g.px(x + i, y + j, '#ecc09a')
    }
  // Paving bricks laid in a herringbone-ish pattern.
  for (let j = 0; j < h; j += 4)
    for (let i = (j / 4) % 2 ? 0 : 3; i < w; i += 6) {
      const v = hsh(x + i, y + j, seed + 1)
      if (v < 300) continue
      g.rect(x + i, y + j, 4, 2, v > 700 ? '#c96a48' : '#b85c40')
      g.hline(x + i, x + i + 3, y + j, '#e08a64')
    }
  g.hline(x, x + w - 1, y, '#b87a58')
  g.hline(x, x + w - 1, y + h - 1, '#b87a58')
}

/** Old brick foundation outline (ruined wall stubs) baked into the lawn. */
export function brickFootprint(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  const t = 3
  for (const [rx, ry, rw, rh] of [
    [x, y, w, t],
    [x, y + h - t, w, t],
    [x, y, t, h],
    [x + w - t, y, t, h],
  ] as [number, number, number, number][]) {
    for (let j = 0; j < rh; j++)
      for (let i = 0; i < rw; i++) {
        const v = hsh(rx + i, ry + j, seed)
        if (v < 120) continue
        g.px(rx + i, ry + j, j === 0 ? BR.L : v > 600 ? BR.b : BR.d)
      }
  }
}

/** Fine sand courtyard (Lanna temples keep their grounds in swept sand). */
export function sand(g: Surface, x: number, y: number, w: number, h: number, seed = 0, tone: 'warm' | 'pale' = 'warm') {
  const base = tone === 'warm' ? '#ecd6ac' : '#f2e6cc'
  const d = tone === 'warm' ? '#dcc294' : '#e2d2b0'
  const l = tone === 'warm' ? '#f8e8c6' : '#fbf4e2'
  g.rect(x, y, w, h, base)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = hsh(x + i, y + j, seed)
      if (v < 70) g.px(x + i, y + j, d)
      else if (v > 950) g.px(x + i, y + j, l)
    }
  // Broom strokes.
  for (let k = 0; k < (w * h) / 260; k++) {
    const v = hsh(k, seed, 11)
    const X = x + (v * 7) % w
    const Y = y + ((v * 13 + k * 17) % h)
    for (let q = 0; q < 6; q++) g.px(X + q, Y + Math.round(Math.sin(q * 0.8) * 1), d)
  }
}

/** Dark water band (river, moat) with ripples and highlights. */
export function waterBand(g: Surface, x: number, y: number, w: number, h: number, night: boolean, seed = 0) {
  const deep = night ? '#1e3a6a' : '#3a86b4'
  const mid = night ? '#2a4c80' : '#4aa0c8'
  const hi = night ? '#6a8ac0' : '#9fe0f0'
  g.rect(x, y, w, h, mid)
  for (let j = 0; j < h; j++) {
    const k = j / h
    if (k > 0.35) for (let i = 0; i < w; i++) if ((i + j * 3 + seed) % 7 === 0 || hsh(x + i, y + j, seed) < 350 * (k - 0.35)) g.px(x + i, y + j, deep)
  }
  for (let k = 0; k < (w * h) / 90; k++) {
    const v = hsh(k, seed, 5)
    const X = x + ((v * 31 + k * 7) % w)
    const Y = y + 2 + ((v * 3 + k * 11) % Math.max(1, h - 4))
    g.hline(X, X + 2 + (v % 4), Y, hi)
  }
}

// ---------------------------------------------------------------------------
// Signs, shoe racks and small furniture.

/** Wooden sign board on two posts with pixel "text" lines. */
export function signSprite(key: string, w: number, h: number, board: Color = '#fffaf0', lines: Color[] = [P.ink2, P.redD], post: Color = '#6e4a35'): Prop {
  return spr(`sign:${key}`, w + 2, h + 9, (w + 2) >> 1, h + 8, (g) => {
    g.rect(3, h, 2, 9, post)
    g.rect(w - 3, h, 2, 9, post)
    g.rect(1, 1, w, h, mixHex(post, '#000000', 0.2))
    g.rect(2, 2, w - 2, h - 2, board)
    g.hline(2, w - 1, 2, mixHex(board, '#ffffff', 0.5))
    let y = 4
    lines.forEach((c, i) => {
      if (y > h - 3) return
      const lw = w - 8 - ((i * 5) % 7)
      for (let x = 5; x < 5 + lw; x += 1) if ((x * 7 + i * 3) % 9 !== 0) g.px(x, y, c)
      y += 3
    })
  })
}

/** Shoe rack (ชั้นวางรองเท้า) with a few pairs, placed beside a hall's stairs. */
export function shoeRackSprite(messy = false): Prop {
  return spr(`shoerack:${messy ? 1 : 0}`, 26, 18, 13, 17, (g) => {
    const wood = { L: '#d9a878', b: '#b88458', d: '#8a5e3c', D: '#5e3e28' }
    for (const x of [1, 23]) g.rect(x, 1, 2, 17, wood.d)
    for (const y of [3, 9, 15]) {
      g.rect(1, y, 24, 2, wood.b)
      g.hline(1, 24, y, wood.L)
    }
    const shoes: Color[] = ['#e8514a', '#3a3040', '#fffaf0', '#5a8de0', '#ff9fc0', '#9a6a45', '#6cc36a', '#ffd23f']
    let k = 0
    for (const y of [1, 7, 13]) {
      for (let x = 4; x < 22; x += 5) {
        const c = shoes[(k++ * 3) % shoes.length]
        g.rect(x, y, 2, 2, c)
        g.rect(x + 2, y, 2, 2, c)
        g.px(x, y, mixHex(c, '#ffffff', 0.4))
      }
    }
    if (messy) {
      g.rect(3, 16, 3, 2, '#e8514a')
      g.rect(8, 17, 3, 1, '#3a3040')
    }
  })
}

/** Loose pairs of shoes left at a doorway (baked into the ground). */
export function shoesOnGround(g: Surface, x: number, y: number, n: number, seed = 0) {
  const shoes: Color[] = ['#e8514a', '#3a3040', '#fffaf0', '#5a8de0', '#ff9fc0', '#9a6a45', '#6cc36a', '#ffd23f', '#8c8187']
  for (let i = 0; i < n; i++) {
    const v = hsh(i, seed, 21)
    const X = x + (v % 30) - 15
    const Y = y + ((v >>> 3) % 8) - 4
    const c = shoes[v % shoes.length]
    g.rect(X, Y, 3, 2, c)
    g.rect(X + 3 + (v % 2), Y + ((v >> 2) % 2), 3, 2, c)
    g.px(X, Y, mixHex(c, '#ffffff', 0.4))
    g.hline(X, X + 2, Y + 2, 'rgba(58,40,56,0.25)')
  }
}

/** A broom (ไม้กวาดทางมะพร้าว) leaning on something – hints at the sweeping job. */
export function broomSprite(): Prop {
  return spr('broom', 10, 24, 5, 23, (g) => {
    g.line(7, 0, 4, 14, '#9a6a45')
    g.line(8, 0, 5, 14, '#6e4a35')
    for (let i = 0; i < 7; i++) g.line(4, 13, 1 + i, 23, i % 2 ? '#d9b25f' : '#c9a04c')
    g.hline(2, 7, 14, '#b8343f')
  })
}

/** Mop bucket for the floor-mopping job. */
export function mopBucketSprite(): Prop {
  return spr('mopbucket', 16, 24, 8, 23, (g) => {
    g.line(10, 0, 9, 17, '#c28e5c')
    g.line(11, 0, 10, 17, '#9a6a45')
    for (let i = 0; i < 5; i++) g.vline(7 + i, 15, 19, i % 2 ? '#e8e2d8' : '#fffaf0')
    g.rect(2, 16, 10, 7, '#5a8de0')
    g.hline(2, 11, 16, '#9fd0ff')
    g.rect(3, 17, 8, 1, '#a4dcff')
    g.vline(11, 17, 22, '#3d63b5')
    g.hline(3, 10, 22, '#3d63b5')
  })
}

/** Watering can for the plant-watering job. */
export function wateringCanSprite(): Prop {
  return spr('wcan', 16, 11, 8, 10, (g) => {
    g.rect(4, 3, 8, 7, '#6cc36a')
    g.hline(4, 11, 3, '#a8e0a0')
    g.vline(11, 4, 9, '#3f8a4f')
    g.line(12, 7, 15, 2, '#5ea653')
    g.rect(14, 1, 2, 2, '#3f8a4f')
    g.line(4, 2, 6, 0, '#3f8a4f')
    g.line(6, 0, 10, 0, '#3f8a4f')
    g.line(10, 0, 11, 2, '#3f8a4f')
  })
}

/** Low rope fence on stubby posts (keeps visitors at a respectful distance). */
export function ropeFenceSprite(len: number, color: Color = '#c9a04c'): Prop {
  return spr(`rope:${len}:${color}`, len + 2, 10, 0, 9, (g) => {
    const posts = Math.max(2, Math.round(len / 14) + 1)
    const xs: number[] = []
    for (let i = 0; i < posts; i++) xs.push(Math.round(1 + (i * (len - 2)) / (posts - 1)))
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = xs[i]
      const b = xs[i + 1]
      for (let x = a; x <= b; x++) {
        const f = (x - a) / Math.max(1, b - a)
        g.px(x, 3 + Math.round(Math.sin(f * Math.PI) * 2), color)
      }
    }
    for (const x of xs) {
      g.rect(x - 1, 2, 3, 8, '#8a6040')
      g.px(x - 1, 2, '#c28e5c')
      g.rect(x - 1, 1, 3, 1, GOLD.b)
    }
  })
}

/** Stone bench with an old man-sized seat. */
export function stoneBenchSprite(): Prop {
  return spr('stbench', 22, 9, 11, 8, (g) => {
    g.rect(1, 1, 20, 3, '#d8d0cb')
    g.hline(1, 20, 1, '#f0ebe6')
    g.rect(1, 4, 20, 1, '#9c9290')
    g.rect(3, 5, 3, 4, '#bdb2ae')
    g.rect(16, 5, 3, 4, '#bdb2ae')
  })
}

// ---------------------------------------------------------------------------
// Vendor stalls: a generic wooden cart / table with an awning or umbrella and
// a goods painter so every place's shop looks different.

export interface StallOpts {
  w: number
  /** Umbrella / awning colours (stripes). */
  roof: [Color, Color]
  kind: 'umbrella' | 'awning' | 'cart'
  /** Paints the goods; (x0, y0) is the top-left of the counter top. */
  goods(g: Surface, x0: number, y0: number, w: number): void
  /** Front banner colour (a sign with pixel text). */
  sign?: Color
  body?: Color
}

export function stallBuilder(key: string, o: StallOpts): Prop {
  const w = o.w
  const H = o.kind === 'umbrella' ? 46 : 42
  return spr(`stall:${key}`, w + 4, H, (w + 4) >> 1, H - 1, (g) => {
    const cx = (w + 4) >> 1
    const body = o.body ?? '#c28e5c'
    const bodyD = mixHex(body, '#3a2838', 0.3)
    const bodyL = mixHex(body, '#ffffff', 0.3)
    const top = H - 18
    if (o.kind === 'umbrella') {
      for (let i = 0; i <= 11; i++) {
        const y = 12 - i
        const half = w / 2 + 1 - i * (w / 24)
        g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, i % 2 ? o.roof[0] : o.roof[1])
      }
      for (let k = 0; k < 7; k++) g.line(cx, 1, cx - w / 2 + k * (w / 6), 12, mixHex(o.roof[1], '#ffffff', 0.4))
      for (let x = cx - w / 2; x < cx + w / 2; x += 4) {
        g.px(x, 13, mixHex(o.roof[0], '#3a2838', 0.25))
        g.px(x + 1, 13, mixHex(o.roof[0], '#3a2838', 0.25))
        g.px(x + 2, 14, mixHex(o.roof[0], '#3a2838', 0.25))
      }
      g.px(cx, 0, GOLD.b)
      g.rect(cx - 1, 13, 2, top - 13, '#6e4a35')
    } else if (o.kind === 'awning') {
      for (const x of [3, w]) g.rect(x, 9, 2, top - 9, '#6e4a35')
      for (let x = 1; x < w + 3; x++) {
        const c = Math.floor((x - 1) / 4) % 2 ? o.roof[0] : o.roof[1]
        g.vline(x, 4, 10, c)
        if (Math.floor((x - 1) / 4) % 2 === 0) g.px(x, 11, c)
      }
      g.hline(1, w + 2, 4, mixHex(o.roof[1], '#ffffff', 0.4))
      g.hline(1, w + 2, 3, mixHex(o.roof[0], '#3a2838', 0.3))
    } else {
      // Push cart with a small roof and glass case.
      g.rect(2, 8, w, 2, o.roof[0])
      g.rect(3, 6, w - 2, 2, o.roof[1])
      g.hline(3, w, 6, mixHex(o.roof[1], '#ffffff', 0.4))
      for (const x of [4, w - 1]) g.rect(x, 10, 1, top - 10, '#8c8187')
    }
    // Counter.
    g.rect(2, top, w, 3, bodyL)
    g.hline(2, w + 1, top, mixHex(bodyL, '#ffffff', 0.4))
    g.rect(2, top + 3, w, 11, body)
    for (let x = 5; x < w; x += 6) g.vline(x, top + 4, top + 13, bodyD)
    g.rect(2, top + 3, w, 1, bodyD)
    if (o.kind === 'cart') {
      g.circle(8, H - 3, 2.5, '#3a3040')
      g.circle(w - 4, H - 3, 2.5, '#3a3040')
      g.px(8, H - 3, '#bdb2ae')
      g.px(w - 4, H - 3, '#bdb2ae')
    } else {
      g.rect(4, top + 14, 2, 4, '#6e4a35')
      g.rect(w - 2, top + 14, 2, 4, '#6e4a35')
    }
    if (o.sign) {
      const sw = Math.min(w - 8, 20)
      const sx = cx - (sw >> 1)
      g.rect(sx, top + 5, sw, 6, o.sign)
      g.rect(sx + 1, top + 6, sw - 2, 4, mixHex(o.sign, '#ffffff', 0.75))
      g.hline(sx + 3, sx + sw - 4, top + 7, P.ink2)
      g.hline(sx + 3, sx + sw - 7, top + 9, mixHex(o.sign, '#3a2838', 0.3))
    }
    o.goods(g, 2, top, w)
  })
}

// ---------------------------------------------------------------------------
// Trees.

const BARK = { L: '#b7a292', b: '#937c6e', d: '#6e5c54', D: '#4c3e3c' }

function limb(g: Surface, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c = BARK) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    const ww = w0 + (w1 - w0) * t
    const xa = Math.round(x - ww / 2)
    const wi = Math.max(1, Math.round(ww))
    g.rect(xa, Math.round(y), wi, 1, c.b)
    g.px(xa, Math.round(y), c.L)
    if (wi > 2) g.px(xa + wi - 1, Math.round(y), c.d)
  }
}

/** ต้นจามจุรี / ก้ามปู – a huge rain tree with a wide umbrella crown. */
export function rainTree(seed = 0, leaf: LeafRamp = LEAVES.deep): Prop {
  return spr(`raintree:${seed}`, 120, 96, 60, 95, (g) => {
    const r = rng(seed * 31 + 5)
    // Roots flare.
    g.ellipse(60, 93, 12, 2.5, BARK.d)
    for (let y = 56; y < 94; y++) slice(g, 60, y, 5 + (y > 84 ? (y - 84) * 0.7 : 0), { L: BARK.L, b: BARK.b, d: BARK.d, D: BARK.D }, 0.3)
    limb(g, 60, 62, 30, 34, 6, 3)
    limb(g, 60, 60, 90, 32, 6, 3)
    limb(g, 60, 58, 56, 26, 5, 3)
    limb(g, 44, 46, 22, 40, 3, 2)
    limb(g, 76, 46, 100, 42, 3, 2)
    const blobs: [number, number, number][] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI
      blobs.push([60 - Math.cos(a) * (46 + r() * 8), 30 - Math.sin(a) * (16 + r() * 6) + r() * 6, 13 + r() * 6])
    }
    blobs.push([60, 22, 20], [38, 26, 16], [82, 26, 16], [60, 10, 14])
    canopy(g, blobs, leaf, seed + 3)
    // Pink powder-puff blossoms.
    for (let i = 0; i < 26; i++) {
      const x = 12 + Math.floor(r() * 96)
      const y = 6 + Math.floor(r() * 34)
      g.px(x, y, '#ffb8d0')
      if (i % 3 === 0) g.px(x + 1, y, '#ff9fc0')
    }
  })
}

/** Round old tree (มะขาม – tamarind) with a gnarled trunk. */
export function oldTree(seed = 0, leaf: LeafRamp = LEAVES.green): Prop {
  return spr(`oldtree:${seed}`, 76, 80, 38, 79, (g) => {
    const r = rng(seed * 17 + 1)
    g.ellipse(38, 77, 9, 2.2, BARK.d)
    for (let y = 44; y < 78; y++) slice(g, 38 + Math.sin(y * 0.15 + seed) * 1.5, y, 4.5 + (y > 70 ? (y - 70) * 0.6 : 0), { L: BARK.L, b: BARK.b, d: BARK.d, D: BARK.D }, 0.3)
    limb(g, 38, 50, 20, 30, 4, 2)
    limb(g, 38, 48, 58, 28, 4, 2)
    const blobs: [number, number, number][] = [
      [38, 26, 18],
      [20, 32, 12],
      [56, 32, 12],
      [28, 14, 11],
      [50, 14, 11],
      [38, 8, 9],
    ]
    for (const b of blobs) b[2] += r() * 2
    canopy(g, blobs, leaf, seed + 9)
  })
}

// ---------------------------------------------------------------------------
// Elephants (ช้าง) – a walking side-view elephant, optionally with a howdah.

export interface ElephantOpts {
  frame: number
  howdah?: boolean
  mahout?: boolean
  /** Riders' shirt colours. */
  riders?: Color[]
  cloth?: Color
  white?: boolean
}

/** Side view facing right, 56×50, anchor at the feet (x = body centre). */
export function elephantSprite(o: ElephantOpts): Prop {
  const f = ((o.frame % 4) + 4) % 4
  const key = `ele:${f}:${o.howdah ? 1 : 0}:${o.mahout ? 1 : 0}:${(o.riders ?? []).join('')}:${o.cloth ?? ''}:${o.white ? 1 : 0}`
  return spr(key, 56, 50, 26, 49, (g) => {
    const R = o.white ? ELE_WHITE : ELE_GREY
    const B = R[5]
    const D = R[3]
    const DD = R[2]
    const L = R[7]
    const pink = o.white ? '#f2c4c4' : '#c89a9c'
    const gy = 49
    // Leg swing per frame (near legs opposite far legs).
    const sw = [0, 2, 0, -2][f]
    const lift = [0, 1, 0, 1][f]
    const leg = (x: number, c: string, up: number) => {
      g.rect(x, 33, 6, gy - 33 - up, c)
      g.rect(x - 1, gy - 3 - up, 8, 3, c)
      g.px(x, gy - 1 - up, '#f4ecdc')
      g.px(x + 2, gy - 1 - up, '#f4ecdc')
      g.px(x + 4, gy - 1 - up, '#f4ecdc')
    }
    // Far legs (darker).
    leg(14 - sw, DD, 0)
    leg(34 + sw, DD, 0)
    // Tail.
    g.line(6, 26, 4, 38, D)
    g.rect(3, 38, 2, 3, DD)
    // Body.
    g.ellipse(24, 29, 18, 12, D)
    g.ellipse(23, 27, 17, 11, B)
    g.ellipse(20, 23, 11, 6, mixHex(B, L, 0.5))
    g.ellipse(24, 38, 15, 3, D)
    // Near legs.
    leg(18 + sw, B, lift)
    leg(38 - sw, B, f === 1 || f === 3 ? 0 : 0)
    g.vline(20 + sw, 34, 44, D)
    g.vline(40 - sw, 34, 44, D)
    // Head and forehead dome.
    g.circle(42, 22, 9, D)
    g.circle(41, 21, 8.5, B)
    g.circle(41, 16, 5, mixHex(B, L, 0.5))
    g.px(40, 13, L)
    // Ear with pink freckles.
    g.ellipse(35, 24, 5.5, 8, D)
    g.ellipse(35, 23, 4.5, 7, mixHex(B, D, 0.4))
    for (const [x, y] of [
      [33, 27],
      [35, 29],
      [37, 26],
    ])
      g.px(x, y, pink)
    // Trunk curling forward.
    const trunk: [number, number, number][] = [
      [47, 24, 5],
      [49, 30, 4.5],
      [50, 36, 3.6],
      [50, 41, 3],
      [52, 44, 2.4],
      [54, 43, 2],
    ]
    for (let i = 0; i + 1 < trunk.length; i++) g.thickLine(trunk[i][0], trunk[i][1], trunk[i + 1][0], trunk[i + 1][1], trunk[i][2], B)
    for (let y = 28; y < 42; y += 3) g.px(51, y, D)
    g.px(49, 33, pink)
    g.px(50, 38, pink)
    // Tusk and eye.
    g.line(46, 29, 49, 32, '#fbf3e4')
    g.px(49, 32, '#e8dcc8')
    g.px(44, 20, P.ink)
    g.px(44, 19, P.ink)
    g.px(45, 18, P.ink)
    g.px(43, 21, mixHex(B, '#000000', 0.2))
    // Rosy cheek.
    g.px(46, 23, '#e8a0a8')
    if (o.howdah) {
      const cloth = o.cloth ?? '#e8514a'
      // Saddle cloth with gold fringe.
      g.rect(12, 15, 22, 10, cloth)
      g.hline(12, 33, 15, mixHex(cloth, '#ffffff', 0.35))
      for (let x = 12; x < 34; x += 2) g.px(x, 25, GOLD.b)
      g.rect(14, 18, 18, 1, GOLD.b)
      g.rect(14, 22, 18, 1, GOLD.d)
      // Howdah seat.
      g.rect(13, 9, 20, 6, '#9a6a45')
      g.hline(13, 32, 9, '#c28e5c')
      g.rect(14, 11, 18, 2, '#6e4a35')
      // Canopy.
      g.vline(14, 0, 9, '#6e4a35')
      g.vline(31, 0, 9, '#6e4a35')
      g.rect(11, 0, 24, 2, cloth)
      g.hline(11, 34, 0, mixHex(cloth, '#ffffff', 0.4))
      for (let x = 11; x < 35; x += 3) g.px(x, 2, GOLD.b)
      // Riders.
      ;(o.riders ?? []).forEach((c, i) => {
        const x = 18 + i * 8
        g.rect(x - 2, 5, 5, 5, c)
        g.circle(x, 3, 2, '#f0bd90')
        g.rect(x - 2, 1, 5, 2, i % 2 ? '#3b2f40' : '#6e4a35')
        g.px(x + 1, 3, P.ink)
      })
    }
    if (o.mahout) {
      g.rect(38, 8, 5, 6, '#3d63b5')
      g.circle(40, 6, 2.2, '#c89060')
      g.rect(38, 3, 5, 2, '#3a3040')
      g.px(41, 6, P.ink)
      g.line(43, 11, 47, 7, '#9a6a45')
    }
  })
}

// ---------------------------------------------------------------------------
// Tiny pixel people for dense crowds (riders, boats, murals).

export function tinyPerson(g: Surface, x: number, y: number, shirt: Color, hair: Color = '#3b2f40', skin: Color = '#f0bd90') {
  g.rect(x - 1, y - 4, 3, 4, shirt)
  g.px(x, y - 6, skin)
  g.px(x - 1, y - 6, skin)
  g.px(x + 1, y - 6, skin)
  g.hline(x - 1, x + 1, y - 7, hair)
  g.px(x - 1, y, '#3a3040')
  g.px(x + 1, y, '#3a3040')
}

export { GOLD, WHITE, LEAVES }
export type { Ramp, LeafRamp }
