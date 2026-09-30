// Painting toolkit for the Buddha-journey stage map, in the manner of Thai
// temple murals (จิตรกรรมฝาผนัง): flat colour with fine ink lines, stylised
// trees and เขามอ rocks, water drawn with wave lines, สินเทา zigzags between
// scenes and gold for everything sacred. Only static things live here; the
// stage map bakes them once into a big canvas (see buddhaJourney.ts).

import { mix, Surface, type Color } from '../engine/pixel'
import type { ChapterBand, JourneyChapter, JourneyLayout, LocalPt } from './buddhaJourneyStory'

// ---------------------------------------------------------------------------
// Palette

export const J = {
  ink: '#2b1a12',
  inkS: '#4a2e1e',
  // Day ground (pale mural green) and its textures.
  gnd: '#b8c68a',
  gndL: '#cad5a0',
  gndD: '#a3b477',
  gndDD: '#8a9e62',
  // Night ground (the escape and the enlightenment are painted at night).
  ngnd: '#26405a',
  ngndL: '#2f4d66',
  ngndD: '#1d3249',
  ngndDD: '#15263a',
  nsky: '#1b2250',
  nskyL: '#28306a',
  // Grass and leaves.
  grass: '#7a9c54',
  grassD: '#5a7c40',
  grassL: '#a4c46a',
  leafDD: '#1f3d2c',
  leafD: '#2f5b3a',
  leaf: '#447a45',
  leafL: '#6a9e4e',
  leafLL: '#9cc463',
  trunk: '#6a4028',
  trunkD: '#43281a',
  trunkL: '#8e5a36',
  // Road.
  sand: '#ecd9a6',
  sandL: '#f7eac4',
  sandD: '#d3b77c',
  sandDD: '#a88452',
  // Water.
  waterDD: '#23557e',
  waterD: '#2f6a98',
  water: '#3f86b8',
  waterL: '#63a6d2',
  waterLL: '#9fd2ea',
  foam: '#e8f6fa',
  // Rocks (เขามอ).
  rockDD: '#34524f',
  rockD: '#46706a',
  rock: '#5f8c86',
  rockL: '#86b3a7',
  rockLL: '#bcdac8',
  // Architecture.
  wall: '#f3e9d2',
  wallD: '#d8c7a2',
  wallDD: '#b29e78',
  roof: '#b3362a',
  roofD: '#7a2019',
  roofL: '#d9573d',
  roofG: '#3f7a52',
  roofGD: '#2a5540',
  // Gold.
  goldDD: '#7a4a14',
  goldD: '#b87a22',
  gold: '#e3a93a',
  goldM: '#f2c54e',
  goldL: '#ffe58a',
  goldLL: '#fff6c8',
  // Cloth and skin.
  red: '#b8322a',
  redD: '#7e1f1a',
  redL: '#df5a3e',
  robe: '#c7652a',
  robeD: '#8e4220',
  robeL: '#e8914a',
  green: '#2f7a4a',
  greenL: '#4fa060',
  blue: '#2b4a8a',
  blueL: '#4f74b8',
  white: '#f6efdc',
  whiteD: '#d9ccb0',
  skin: '#eab88c',
  skinD: '#c48a62',
  skinDD: '#9a6444',
  hair: '#2a1c18',
  grey: '#c9c4bc',
  // Flowers.
  pink: '#f59ab8',
  pinkL: '#fcd2e0',
  pinkD: '#d0607e',
  lotus: '#f6a6c4',
  sal: '#f7b8a6',
  salD: '#e0806e',
  // Lacquer (dividers and frames).
  lac: '#8a2418',
  lacD: '#5a140e',
  lacL: '#b33a26',
} as const

// ---------------------------------------------------------------------------
// Moonlight

/**
 * Recolour RGBA pixel data in place as if lit by the moon: a little
 * desaturated and pushed towards indigo. k = 1 for day scenes, less for
 * scenes that are already painted at night.
 */
export function moonlight(d: Uint8ClampedArray, from = 0, to = d.length, k = 1) {
  for (let i = from; i < to; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const l = r * 0.3 + g * 0.55 + b * 0.15
    d[i] = (r * 0.62 + l * 0.38) * (1 - k * 0.66) + k * 10
    d[i + 1] = (g * 0.62 + l * 0.38) * (1 - k * 0.6) + k * 16
    d[i + 2] = (b * 0.62 + l * 0.38) * (1 - k * 0.42) + k * 44
  }
}

// ---------------------------------------------------------------------------
// Tiny deterministic randomness

export function hash01(n: number): number {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Paint context: one per chapter while baking

export interface Light {
  x: number
  y: number
  r: number
  color: Color
  /** Peak strength at night. */
  s: number
}

/** An animated thing drawn on the fx layer; `box` is used for culling. */
export interface FxItem {
  box: [number, number, number, number]
  /** Layer order (lower first). */
  z?: number
  /** Parallax: 0 = fixed to the map, 0.3 = drifts with 30% of the scroll. */
  par?: number
  draw: (g: Surface, t: number, env: FxEnv) => void
}

export interface FxEnv {
  night: boolean
  /** Map y (art px) at the middle of the view: parallax items drift relative to it. */
  viewMid: number
  /** Reduced motion: draw a still frame. */
  still: boolean
}

export class PaintCtx {
  /** Water polygons painted so far in this chapter (scenery avoids them). */
  water: [number, number][][] = []
  constructor(
    readonly g: Surface,
    /** Emissive layer: what still shines when the map is painted at night. */
    readonly e: Surface,
    readonly L: JourneyLayout,
    readonly band: ChapterBand,
    readonly chapter: JourneyChapter,
    readonly lights: Light[],
    readonly fx: FxItem[],
  ) {}
  get cx() {
    return this.L.cx
  }
  get night() {
    return !!this.chapter.night
  }
  X(dx: number) {
    return this.cx + dx
  }
  Y(up: number) {
    return this.band.bottom - up
  }
  P(p: LocalPt): [number, number] {
    return [this.cx + p[0], this.band.bottom - p[1]]
  }
  light(dx: number, up: number, r: number, color: Color, s = 0.8) {
    this.lights.push({ x: this.X(dx), y: this.Y(up), r, color, s })
  }
  /** Draw on the base and the emissive layer. */
  both(fn: (g: Surface) => void) {
    fn(this.g)
    fn(this.e)
  }
  addFx(item: FxItem) {
    this.fx.push(item)
  }
}

// ---------------------------------------------------------------------------
// Ground

/** Mural ground: flat colour with soft dithered patches and ink specks. */
export function paintGround(g: Surface, x0: number, y0: number, w: number, h: number, night: boolean, seed: number) {
  const base = night ? J.ngnd : J.gnd
  const light = night ? J.ngndL : J.gndL
  const dark = night ? J.ngndD : J.gndD
  const speck = night ? J.ngndDD : J.gndDD
  g.rect(x0, y0, w, h, base)
  const r = rng(seed)
  // Soft patches.
  const n = Math.round((w * h) / 1400)
  for (let i = 0; i < n; i++) {
    const px = x0 + r() * w
    const py = y0 + r() * h
    const rr = 6 + r() * 16
    g.ditherCircle(px, py, rr, r() < 0.5 ? light : dark, 0.55, 0.5)
  }
  // Specks and tiny grass strokes.
  const m = Math.round((w * h) / 90)
  for (let i = 0; i < m; i++) {
    const px = Math.round(x0 + r() * w)
    const py = Math.round(y0 + r() * h)
    const k = r()
    if (k < 0.5) g.px(px, py, speck)
    else if (k < 0.8) {
      g.px(px, py, night ? J.ngndDD : J.grassD)
      g.px(px + 1, py - 1, night ? J.ngndD : J.grass)
    } else g.px(px, py, light)
  }
}

/** A clump of grass blades. */
export function grassTuft(g: Surface, x: number, y: number, night = false, s = 1) {
  const d = night ? '#16303a' : J.grassD
  const m = night ? '#244a4a' : J.grass
  const l = night ? '#3a6a5a' : J.grassL
  g.px(x, y, d)
  g.px(x - 1, y, d)
  g.px(x + 1, y, d)
  g.px(x - 2, y - 1, m)
  g.px(x, y - 1, m)
  g.px(x, y - 2, l)
  g.px(x + 2, y - 1, m)
  if (s > 1) {
    g.px(x - 3, y - 2, m)
    g.px(x + 3, y - 2, l)
    g.px(x + 1, y - 2, m)
  }
}

/** Little flowers dotted in the grass. */
export function flowerDots(g: Surface, x0: number, y0: number, w: number, h: number, n: number, seed: number, colors: Color[]) {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + r() * w)
    const y = Math.round(y0 + r() * h)
    const c = colors[Math.floor(r() * colors.length)]
    g.px(x, y, c)
    g.px(x, y + 1, J.grassD)
  }
}

// ---------------------------------------------------------------------------
// Trees (mural style: a dark mass with clusters of lighter leaf scallops)

export interface TreeStyle {
  dark: Color
  mid: Color
  light: Color
  hi: Color
  trunk: Color
  trunkD: Color
}

export const TREE_DAY: TreeStyle = { dark: J.leafD, mid: J.leaf, light: J.leafL, hi: J.leafLL, trunk: J.trunk, trunkD: J.trunkD }
export const TREE_OLIVE: TreeStyle = { dark: '#3d5a2a', mid: '#5a7c36', light: '#7fa04a', hi: '#b4cc66', trunk: J.trunk, trunkD: J.trunkD }
export const TREE_TEAL: TreeStyle = { dark: '#1f4a42', mid: '#2f6a58', light: '#4a8c6c', hi: '#86bc8a', trunk: '#5a3a2a', trunkD: J.trunkD }
export const TREE_NIGHT2: TreeStyle = { dark: '#122a36', mid: '#1c3e48', light: '#2a5a5a', hi: '#4a7e6e', trunk: '#3a2a2a', trunkD: '#22181c' }
export const TREE_NIGHT: TreeStyle ={ dark: '#10262a', mid: '#1a3a3a', light: '#28524a', hi: '#3c6e58', trunk: '#3a2a2a', trunkD: '#22181c' }

/** Trunk with a couple of branches, bottom at (x, y). */
export function trunk(g: Surface, x: number, y: number, h: number, w: number, st: TreeStyle, lean = 0) {
  for (let i = 0; i < h; i++) {
    const k = i / h
    const ww = Math.max(1, Math.round(w * (1 - k * 0.45)))
    const xx = Math.round(x + lean * k * h * 0.3 - ww / 2)
    g.rect(xx - 1, y - i, ww + 2, 1, J.ink)
    g.rect(xx, y - i, ww, 1, st.trunk)
    g.px(xx, y - i, st.trunkD)
  }
  // Root flare.
  g.rect(Math.round(x - w / 2 - 2), y, w + 4, 1, J.ink)
  g.rect(Math.round(x - w / 2 - 1), y - 1, w + 2, 1, st.trunk)
}

/**
 * A mural canopy: a lumpy silhouette with an ink rim, filled with rows of
 * leaf scallops (the fish-scale foliage of Thai murals), lit from the top
 * left. `bloom` sprinkles flowers of that colour between the leaves.
 */
export function canopy(g: Surface, cx: number, cy: number, rx: number, ry: number, st: TreeStyle, seed: number, lumps = 9, bloom?: Color) {
  const r = rng(seed)
  const blobs: [number, number, number, number][] = []
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2 + r() * 0.4
    const d = 0.55 + r() * 0.25
    const br = Math.min(rx, ry) * (0.42 + r() * 0.2)
    blobs.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, br, br * 0.9])
  }
  blobs.push([cx, cy, rx * 0.72, ry * 0.72])
  for (const [x, y, a, b] of blobs) g.ellipse(x, y, a + 1, b + 1, J.ink)
  for (const [x, y, a, b] of blobs) g.ellipse(x, y, a, b, st.dark)
  const inside = (x: number, y: number) => blobs.some(([bx, by, a, b]) => ((x - bx) / (a - 0.8)) ** 2 + ((y - by) / (b - 0.8)) ** 2 < 1)
  // Scallop rows.
  const x0 = Math.floor(cx - rx - 4)
  const x1 = Math.ceil(cx + rx + 4)
  const y0 = Math.floor(cy - ry - 4)
  const y1 = Math.ceil(cy + ry + 4)
  let row = 0
  for (let y = y0; y <= y1; y += 3, row++) {
    for (let x = x0 + (row % 2) * 2; x <= x1; x += 4) {
      if (!inside(x, y) || !inside(x + 2, y)) continue
      // Light from the top left: brighter scallops there.
      const lx = (x - cx) / rx
      const ly = (y - cy) / ry
      const lightK = -lx * 0.5 - ly * 0.8 + (r() - 0.5) * 0.5
      const c = lightK > 0.55 ? st.hi : lightK > 0.05 ? st.light : st.mid
      g.px(x, y, c)
      g.px(x + 1, y - 1, c)
      g.px(x + 2, y - 1, c)
      g.px(x + 3, y, c)
      if (lightK > 0.3) g.px(x + 1, y, st.mid)
      if (bloom && r() < 0.16) {
        g.px(x + 1, y + 1, bloom)
        g.px(x + 2, y + 1, bloom)
      }
    }
  }
}

/** A generic mural tree. */
export function muralTree(g: Surface, x: number, y: number, size: number, st: TreeStyle, seed: number, bloom?: Color) {
  trunk(g, x, y, Math.round(size * 0.9), Math.max(2, Math.round(size * 0.22)), st)
  canopy(g, x, y - size * 1.25, size * 0.85, size * 0.72, st, seed, 7 + Math.round(size / 4), bloom)
}

/** Low bush of scallop mounds; bottom-centre (x, y). */
export function bush(g: Surface, x: number, y: number, w: number, st: TreeStyle, seed: number, bloom?: Color) {
  canopy(g, x, y - w * 0.3, w * 0.5, w * 0.3, st, seed, 5, bloom)
}

/** Tall tree in stacked tiers (a mural favourite). */
export function tieredTree(g: Surface, x: number, y: number, h: number, st: TreeStyle, seed: number) {
  trunk(g, x, y, Math.round(h * 0.4), 3, st)
  for (let i = 0; i < 3; i++) {
    const rx = h * 0.26 * (1 - i * 0.24)
    const ty = y - h * 0.34 - i * h * 0.2
    canopy(g, x, ty - rx * 0.4, rx, rx * 0.5, st, seed + i * 7, 5)
  }
}

/** Banana plant: a short trunk and broad drooping leaves. */
export function banana(g: Surface, x: number, y: number, h: number, st: TreeStyle, seed: number) {
  const r = rng(seed)
  for (let i = 0; i < h * 0.5; i++) {
    g.rect(x - 2, y - i, 4, 1, J.ink)
    g.rect(x - 1, y - i, 2, 1, st.light)
  }
  const top = y - Math.round(h * 0.5)
  for (let k = 0; k < 5; k++) {
    const dir = k % 2 ? 1 : -1
    const len = h * (0.35 + r() * 0.2)
    const up = 2 + k * 2
    const ex = x + dir * len
    const ey = top - up + len * 0.35
    g.thickLine(x, top - up, ex, ey, 4, J.ink)
    g.thickLine(x, top - up, ex, ey, 2.4, k < 2 ? st.mid : st.light)
    g.line(x, top - up, ex, ey, st.hi)
  }
}

/** Tall slim palm (ตาล) – a classic of Thai mural landscapes. */
export function palmTree(g: Surface, x: number, y: number, h: number, st: TreeStyle, seed: number) {
  const r = rng(seed)
  const lean = (r() - 0.5) * 6
  for (let i = 0; i < h; i++) {
    const xx = Math.round(x + (lean * i) / h)
    g.rect(xx - 2, y - i, 4, 1, J.ink)
    g.rect(xx - 1, y - i, 2, 1, i % 3 === 0 ? st.trunkD : st.trunk)
  }
  const tx = Math.round(x + lean)
  const ty = y - h
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.42
    const len = 7 + r() * 3
    const ex = tx + Math.cos(a) * len
    const ey = ty + Math.sin(a) * len * 0.8 + Math.abs(k - 4) * 1.2
    g.thickLine(tx, ty, ex, ey, 2, J.ink)
  }
  for (let k = 0; k < 9; k++) {
    const a = -Math.PI / 2 + (k - 4) * 0.42
    const len = 6 + r() * 3
    const ex = tx + Math.cos(a) * len
    const ey = ty + Math.sin(a) * len * 0.8 + Math.abs(k - 4) * 1.2
    g.line(tx, ty, ex, ey, k % 2 ? st.mid : st.light)
  }
  g.ellipse(tx, ty + 1, 2, 1.5, st.trunkD)
}

/** Bamboo clump (for Veḷuvana). */
export function bamboo(g: Surface, x: number, y: number, h: number, seed: number, night = false) {
  const r = rng(seed)
  const stem = night ? '#3c6a4a' : '#7fae4a'
  const stemD = night ? '#284a36' : '#557a32'
  const leaf = night ? '#2a5a3a' : '#5e9a3e'
  const leafL = night ? '#3c7a4a' : '#9ccc5a'
  for (let k = 0; k < 5; k++) {
    const bx = x + (k - 2) * 3 + Math.round((r() - 0.5) * 2)
    const hh = h * (0.7 + r() * 0.3)
    const lean = (k - 2) * 1.6
    for (let i = 0; i < hh; i++) {
      const xx = Math.round(bx + (lean * i * i) / (hh * hh) * 4)
      g.px(xx - 1, y - i, J.ink)
      g.px(xx + 1, y - i, J.ink)
      g.px(xx, y - i, i % 7 === 0 ? stemD : stem)
      if (i > hh * 0.35 && i % 5 === 2) {
        const dir = (i + k) % 2 ? 1 : -1
        g.line(xx, y - i, xx + dir * 4, y - i + 2, J.ink)
        g.line(xx + dir, y - i, xx + dir * 3, y - i + 1, r() < 0.5 ? leaf : leafL)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rocks (เขามอ): stacked blocky rocks with lit tops

export function rockPile(g: Surface, x: number, y: number, w: number, h: number, seed: number, night = false) {
  const r = rng(seed)
  const D = night ? '#1d3036' : J.rockDD
  const M = night ? '#2a4648' : J.rockD
  const B = night ? '#36585a' : J.rock
  const L = night ? '#4a7270' : J.rockL
  const T = night ? '#6a9690' : J.rockLL
  // Several stepped blocks, back to front.
  const n = 3 + Math.floor(w / 10)
  const blocks: [number, number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const bw = 6 + r() * (w * 0.45)
    const bh = 5 + r() * h * 0.7
    const bx = x - w / 2 + r() * (w - bw)
    const by = y - bh - r() * (h - bh) * (1 - Math.abs(bx + bw / 2 - x) / w)
    blocks.push([bx, by, bw, bh])
  }
  blocks.sort((a, b) => a[1] + a[3] - (b[1] + b[3]))
  for (const [bx, by, bw, bh] of blocks) {
    const X = Math.round(bx)
    const Y = Math.round(by)
    const W = Math.round(bw)
    const H = Math.round(bh)
    g.rect(X - 1, Y - 1, W + 2, H + 2, J.ink)
    g.rect(X, Y, W, H, B)
    g.rect(X, Y, W, 2, T)
    g.rect(X, Y + 2, 2, H - 2, L)
    g.rect(X + W - 2, Y + 2, 2, H - 2, M)
    g.rect(X, Y + H - 1, W, 1, D)
    // Strata lines.
    for (let k = Y + 4; k < Y + H - 2; k += 3) g.hline(X + 2, X + W - 3, k, M)
  }
}

/** Soft low hill silhouette. */
export function hill(g: Surface, x: number, y: number, w: number, h: number, c: Color, cl: Color) {
  g.ellipse(x, y, w / 2 + 1, h + 1, J.ink)
  g.ellipse(x, y, w / 2, h, c)
  g.ellipse(x - w * 0.12, y - h * 0.3, w * 0.3, h * 0.5, cl)
  g.rect(x - w / 2 - 1, y, w + 2, h + 2, c)
}

// ---------------------------------------------------------------------------
// Water

/** Fill a river polygon with mural water: deep body, lighter rows and wave ticks. */
export function paintWater(g: Surface, pts: [number, number][], seed: number, night = false) {
  const D = night ? '#1a3a64' : J.waterD
  const B = night ? '#244c7c' : J.water
  const L = night ? '#3a6a9c' : J.waterL
  const F = night ? '#7aa8d0' : J.foam
  // Ink bank.
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    g.poly(
      pts.map(([x, y]) => [x + ox, y + oy] as [number, number]),
      J.ink,
    )
  g.poly(pts, B)
  // Lighter bands along the water, then little wave hooks.
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const inside = (x: number, y: number) => pointIn(pts, x + 0.5, y + 0.5)
  const r = rng(seed)
  for (let y = Math.floor(minY); y <= maxY; y++)
    for (let x = Math.floor(minX); x <= maxX; x++) {
      if (!inside(x, y)) continue
      if (!inside(x, y - 1) || !inside(x, y - 2)) g.px(x, y, D)
    }
  const n = Math.round(((maxX - minX) * (maxY - minY)) / 30)
  for (let i = 0; i < n; i++) {
    const x = Math.round(minX + r() * (maxX - minX))
    const y = Math.round(minY + r() * (maxY - minY))
    if (!inside(x, y) || !inside(x + 4, y) || !inside(x - 1, y)) continue
    // A mural wave: small arc with a curl.
    g.px(x, y, L)
    g.px(x + 1, y - 1, L)
    g.px(x + 2, y - 1, F)
    g.px(x + 3, y, L)
    if (r() < 0.4) g.px(x + 4, y + 1, D)
  }
}

/**
 * Water in the grand mural manner: rows of curling fish-scale waves with
 * white crests (for the flood from Mae Thorani's hair).
 */
export function muralWaves(g: Surface, pts: [number, number][], night = false) {
  const D = night ? '#163a6a' : J.waterD
  const B = night ? '#24548a' : J.water
  const L = night ? '#4a86c0' : J.waterL
  const F = night ? '#cfeaff' : J.foam
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    g.poly(
      pts.map(([x, y]) => [x + ox, y + oy] as [number, number]),
      J.ink,
    )
  g.poly(pts, D)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  let row = 0
  for (let y = Math.floor(minY) + 3; y <= maxY; y += 4, row++) {
    for (let x = Math.floor(minX) + (row % 2) * 3; x <= maxX; x += 6) {
      if (!pointIn(pts, x + 0.5, y + 0.5) || !pointIn(pts, x + 5.5, y + 0.5) || !pointIn(pts, x + 3, y - 2.5)) continue
      // One scallop: a rounded wave with a white curl on its crest.
      g.px(x, y, B)
      g.px(x + 1, y - 1, L)
      g.px(x + 2, y - 2, L)
      g.px(x + 3, y - 2, F)
      g.px(x + 4, y - 1, L)
      g.px(x + 5, y, B)
      g.px(x + 3, y - 1, B)
      g.px(x + 2, y - 1, F)
    }
  }
}

export function pointIn(poly: [number, number][], x: number, y: number): boolean {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

/** A river band from a centre line (list of points) with a given half width. */
export function riverPoly(center: [number, number][], half: (i: number) => number): [number, number][] {
  const left: [number, number][] = []
  const right: [number, number][] = []
  for (let i = 0; i < center.length; i++) {
    const a = center[Math.max(0, i - 1)]
    const b = center[Math.min(center.length - 1, i + 1)]
    let nx = -(b[1] - a[1])
    let ny = b[0] - a[0]
    const l = Math.hypot(nx, ny) || 1
    nx /= l
    ny /= l
    const hw = half(i)
    left.push([center[i][0] + nx * hw, center[i][1] + ny * hw])
    right.push([center[i][0] - nx * hw, center[i][1] - ny * hw])
  }
  return [...left, ...right.reverse()]
}

/** Lotus bud or bloom standing in water. */
export function lotusFlower(g: Surface, x: number, y: number, open: number, c: Color = J.lotus) {
  const dark = mix(c, '#8a2a4a', 0.35)
  const light = mix(c, '#ffffff', 0.5)
  if (open < 0.5) {
    g.rect(x - 1, y - 4, 3, 4, J.ink)
    g.rect(x - 2, y - 3, 5, 3, J.ink)
    g.px(x, y - 5, J.ink)
    g.rect(x - 1, y - 3, 3, 3, c)
    g.px(x, y - 4, light)
    g.px(x + 1, y - 1, dark)
    return
  }
  g.rect(x - 4, y - 2, 9, 2, J.ink)
  g.rect(x - 3, y - 4, 7, 2, J.ink)
  g.rect(x - 1, y - 6, 3, 2, J.ink)
  g.rect(x - 3, y - 2, 7, 1, c)
  g.rect(x - 2, y - 3, 5, 1, c)
  g.px(x - 3, y - 3, c)
  g.px(x + 3, y - 3, c)
  g.rect(x, y - 5, 1, 3, light)
  g.px(x - 2, y - 2, dark)
  g.px(x + 2, y - 2, dark)
  g.px(x, y - 1, J.goldL)
}

export function lilyPad(g: Surface, x: number, y: number, r: number, night = false) {
  g.ellipse(x, y, r + 1, r * 0.5 + 1, J.ink)
  g.ellipse(x, y, r, r * 0.5, night ? '#2a5a48' : '#5aa84e')
  g.ellipse(x - r * 0.25, y - r * 0.12, r * 0.55, r * 0.26, night ? '#3a7058' : '#86c46a')
  g.px(Math.round(x + r * 0.6), Math.round(y), night ? '#1a3a38' : '#3c7d3e')
}

// ---------------------------------------------------------------------------
// The road

export interface RoadSamples {
  xs: Float32Array
  ys: Float32Array
}

/** Sandy mural road with inked edges and pebbles, following the sampled path. */
export function paintRoad(g: Surface, road: RoadSamples, y0: number, y1: number, nightAt: (y: number) => boolean) {
  const n = road.xs.length
  const pass = (r: number, cDay: Color, cNight: Color) => {
    for (let i = 0; i < n; i += 2) {
      const x = road.xs[i]
      const y = road.ys[i]
      if (y < y0 - 8 || y > y1 + 8) continue
      g.circle(x, y, r, nightAt(y) ? cNight : cDay)
    }
  }
  pass(6.2, J.ink, '#0e1624')
  pass(5.3, J.sandDD, '#5a5652')
  pass(4.4, J.sandD, '#7c766c')
  pass(3.6, J.sand, '#a29a8a')
  // Pebbles and footprints.
  for (let i = 0; i < n; i += 5) {
    const x = Math.round(road.xs[i])
    const y = Math.round(road.ys[i])
    if (y < y0 || y > y1) continue
    const k = hash01(i * 7 + 3)
    const ox = Math.round((k - 0.5) * 5)
    const oy = Math.round((hash01(i * 13) - 0.5) * 3)
    if (k < 0.3) g.px(x + ox, y + oy, nightAt(y) ? '#b8b4bc' : J.sandL)
    else if (k < 0.5) g.px(x + ox, y + oy, nightAt(y) ? '#6a6878' : J.sandDD)
  }
}

// ---------------------------------------------------------------------------
// สินเทา: the zigzag band that separates mural scenes

export function sinthao(g: Surface, x0: number, x1: number, y: number, top: 'day' | 'night', bottom: 'day' | 'night') {
  // A double zigzag of red, gold and cream.
  const amp = 4
  const per = 8
  const at = (x: number, off: number) => y + off + Math.abs(((x / per) % 2) - 1) * amp - amp / 2
  for (let x = x0; x <= x1; x++) {
    const a = Math.round(at(x, -3))
    const b = Math.round(at(x, 3))
    g.rect(x, a - 2, 1, b - a + 5, J.ink)
    g.rect(x, a - 1, 1, 1, J.goldL)
    g.rect(x, a, 1, b - a, J.lac)
    g.rect(x, a + 1, 1, 1, J.lacL)
    g.rect(x, b, 1, 1, J.gold)
    g.rect(x, b + 1, 1, 1, J.goldD)
    // Tiny gold dots in the red.
    if (x % per === 0) g.px(x, Math.round((a + b) / 2) + 1, J.goldM)
  }
  void top
  void bottom
}

// ---------------------------------------------------------------------------
// Architecture

/** A Thai gable roof (หลังคาจั่ว) with ช่อฟ้า and หางหงส์, apex at (x, y). */
export function thaiRoof(g: Surface, x: number, y: number, w: number, h: number, tiers = 2, c: Color = J.roof, cd: Color = J.roofD, edge: Color = J.goldM) {
  for (let t = tiers - 1; t >= 0; t--) {
    const tw = w * (1 - t * 0.18)
    const ty = y + t * (h / tiers) * 0.55
    const pts: [number, number][] = [
      [x, ty],
      [x + tw / 2, ty + h],
      [x + tw / 2 - 3, ty + h],
      [x, ty + 3],
      [x - tw / 2 + 3, ty + h],
      [x - tw / 2, ty + h],
    ]
    const body: [number, number][] = [
      [x, ty],
      [x + tw / 2, ty + h],
      [x - tw / 2, ty + h],
    ]
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ])
      g.poly(
        body.map(([a, b]) => [a + ox, b + oy] as [number, number]),
        J.ink,
      )
    g.poly(body, c)
    // Tile rows.
    for (let k = 3; k < h; k += 3) {
      const half = (tw / 2) * (k / h)
      g.hline(Math.round(x - half + 1), Math.round(x + half - 1), Math.round(ty + k), cd)
    }
    // Gold bargeboards.
    g.poly(pts, edge)
    // หางหงส์ at the eaves.
    g.px(Math.round(x + tw / 2), Math.round(ty + h - 2), edge)
    g.px(Math.round(x + tw / 2 + 1), Math.round(ty + h - 3), edge)
    g.px(Math.round(x - tw / 2), Math.round(ty + h - 2), edge)
    g.px(Math.round(x - tw / 2 - 1), Math.round(ty + h - 3), edge)
  }
  // ช่อฟ้า (the finial hook on the ridge).
  g.px(x, y - 1, J.ink)
  g.px(x, y - 2, edge)
  g.px(x + 1, y - 3, edge)
  g.px(x + 2, y - 3, J.ink)
}

/** A pavilion (ศาลา): posts, a platform and a Thai roof; bottom-centre at (x, y). */
export function pavilion(g: Surface, x: number, y: number, w: number, h: number, roofC: Color = J.roof, roofD: Color = J.roofD, night = false) {
  const wall = night ? '#8a8aa0' : J.wall
  const wallD = night ? '#5a5a74' : J.wallD
  // Platform.
  g.rect(x - w / 2 - 2, y - 3, w + 4, 4, J.ink)
  g.rect(x - w / 2 - 1, y - 2, w + 2, 2, wall)
  g.hline(x - w / 2 - 1, x + w / 2, y - 1, wallD)
  // Posts.
  const posts = Math.max(2, Math.round(w / 8))
  for (let i = 0; i <= posts; i++) {
    const px = Math.round(x - w / 2 + 2 + (i * (w - 4)) / posts)
    g.rect(px - 1, y - h, 3, h - 2, J.ink)
    g.rect(px, y - h, 1, h - 2, wall)
  }
  // Roof.
  thaiRoof(g, x, y - h - Math.round(h * 0.9), w + 8, Math.round(h * 0.9), 2, roofC, roofD)
}

/** Golden bell-shaped chedi (stupa) on a tiered base; base-centre at (x, y). */
export function chedi(g: Surface, x: number, y: number, s: number) {
  const O = J.ink
  const tiers = 3
  let yy = y
  for (let i = 0; i < tiers; i++) {
    const w = Math.round(s * (1.1 - i * 0.18))
    const h = Math.round(s * 0.12)
    g.rect(x - w / 2 - 1, yy - h - 1, w + 2, h + 2, O)
    g.rect(x - w / 2, yy - h, w, h, i % 2 ? J.goldM : J.gold)
    g.hline(x - w / 2, x + w / 2 - 1, yy - h, J.goldL)
    g.hline(x - w / 2, x + w / 2 - 1, yy - 1, J.goldD)
    yy -= h
  }
  // Bell.
  const bw = s * 0.36
  const bh = s * 0.42
  g.ellipse(x, yy - bh * 0.35, bw + 1, bh * 0.75 + 1, O)
  g.ellipse(x, yy - bh * 0.35, bw, bh * 0.75, J.gold)
  g.rect(x - bw - 1, yy - bh * 0.35, bw * 2 + 2, bh * 0.35 + 1, O)
  g.rect(x - bw, yy - bh * 0.35, bw * 2, bh * 0.35, J.gold)
  g.ellipse(x - bw * 0.35, yy - bh * 0.55, bw * 0.3, bh * 0.35, J.goldL)
  g.rect(Math.round(x + bw * 0.45), Math.round(yy - bh * 0.6), Math.max(1, Math.round(bw * 0.25)), Math.round(bh * 0.55), J.goldD)
  yy -= Math.round(bh * 1.05)
  // Harmika and rings.
  g.rect(x - 3, yy - 3, 7, 4, O)
  g.rect(x - 2, yy - 2, 5, 2, J.goldM)
  yy -= 3
  const spire = Math.round(s * 0.55)
  for (let i = 0; i < spire; i++) {
    const w = Math.max(1, Math.round(4 * (1 - i / spire)))
    g.rect(x - Math.floor(w / 2) - 1, yy - i, w + 2, 1, O)
    g.rect(x - Math.floor(w / 2), yy - i, w, 1, i % 3 === 0 ? J.goldL : J.goldM)
  }
  g.px(x, yy - spire - 1, J.goldLL)
}

/** Brick wall segment with a gold coping. */
export function wallRun(g: Surface, x0: number, x1: number, y: number, h: number, night = false) {
  const c = night ? '#7a7a92' : J.wall
  const d = night ? '#54546a' : J.wallD
  // Merlons (ใบเสมา) along the top.
  for (let xx = x0 + 1; xx + 3 <= x1; xx += 6) {
    g.rect(xx - 1, y - h - 4, 5, 4, J.ink)
    g.rect(xx, y - h - 3, 3, 3, c)
    g.px(xx + 1, y - h - 4, J.ink)
  }
  g.rect(x0 - 1, y - h - 1, x1 - x0 + 2, h + 2, J.ink)
  g.rect(x0, y - h, x1 - x0, h, c)
  // Brick courses, offset every other row.
  let row = 0
  for (let yy = y - h + 3; yy < y; yy += 3, row++) {
    g.hline(x0, x1 - 1, yy, d)
    for (let xx = x0 + (row % 2) * 3; xx < x1; xx += 6) g.px(xx, yy - 1, d)
  }
  g.hline(x0, x1 - 1, y - h, night ? '#9a9ab0' : '#fffaf0')
}

/** Ray-traced-looking halo/aureole: a leaf-shaped flame nimbus behind a holy figure. */
export function aureole(g: Surface, x: number, y: number, w: number, h: number, strong = 1) {
  // Leaf (Bodhi-leaf) outline: rounded bottom, pointed top.
  const pts: [number, number][] = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const sx = Math.sin(a)
    const sy = -Math.cos(a)
    // Narrow towards the top.
    const k = sy < 0 ? 1 - Math.pow(-sy, 1.6) * 0.55 : 1
    pts.push([x + sx * (w / 2) * k, y + sy * (h / 2) + (sy < 0 ? sy * h * 0.08 : 0)])
  }
  for (const [ox, oy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ])
    g.poly(
      pts.map(([a, b]) => [a + ox, b + oy] as [number, number]),
      J.goldDD,
    )
  g.poly(pts, strong > 0.5 ? J.goldM : J.gold)
  const inner = pts.map(([a, b]) => [x + (a - x) * 0.82, y + (b - y) * 0.86 + 1] as [number, number])
  g.poly(inner, J.goldL)
  const core = pts.map(([a, b]) => [x + (a - x) * 0.62, y + (b - y) * 0.7 + 2] as [number, number])
  g.poly(core, J.goldLL)
  // Flame ticks around the rim.
  for (let i = 0; i < n; i += 3) {
    const [a, b] = pts[i]
    const dx = a - x
    const dy = b - y
    const l = Math.hypot(dx, dy) || 1
    g.px(Math.round(a + (dx / l) * 1.5), Math.round(b + (dy / l) * 1.5), J.goldM)
  }
}

/** Thai-style curly cloud (เมฆ) – three scrolls on a flat bottom. */
export function muralCloud(g: Surface, x: number, y: number, w: number, c: Color = '#f7f2e4', cd: Color = '#c9c4d8') {
  const h = Math.max(5, Math.round(w * 0.32))
  const lobes = Math.max(2, Math.round(w / 9))
  for (let i = 0; i < lobes; i++) {
    const lx = x - w / 2 + ((i + 0.5) * w) / lobes
    const lr = (w / lobes) * 0.62 + (i === Math.floor(lobes / 2) ? 1.5 : 0)
    g.circle(lx, y - lr * 0.6, lr + 1, J.inkS)
  }
  g.rect(x - w / 2 - 1, y - 2, w + 2, 3, J.inkS)
  for (let i = 0; i < lobes; i++) {
    const lx = x - w / 2 + ((i + 0.5) * w) / lobes
    const lr = (w / lobes) * 0.62 + (i === Math.floor(lobes / 2) ? 1.5 : 0)
    g.circle(lx, y - lr * 0.6, lr, c)
    // The curl.
    g.px(Math.round(lx), Math.round(y - lr * 0.6), cd)
    g.px(Math.round(lx + 1), Math.round(y - lr * 0.6 - 1), cd)
  }
  g.rect(x - w / 2, y - 1, w, 1, c)
  g.hline(x - w / 2, x + w / 2 - 1, y, cd)
  void h
}
