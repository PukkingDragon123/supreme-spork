// Shared art for the central-region place maps (พระปฐมเจดีย์, วัดโสธร,
// วัดจุฬามณี, วัดสมานรัตนาราม, วัดพระพุทธบาท): a lit "lathe" painter for
// round masonry (chedis, domes, jars), a small sculpt-primitive kit for the
// big statues, interior floor painters, market stalls and the little props
// that mark volunteer jobs (brooms and leaf piles, mops, shoe racks…).

import { bake, bayer, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas } from '../../engine/sprite'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { sculpt, type SculptOpts, type Sculpted } from '../hall'

// ---------------------------------------------------------------------------
// Small maths helpers.

/** Ordered-dither offset in -0.5..0.5. */
export const dth = (x: number, y: number) => (bayer(x, y) + 0.5) / 16 - 0.5
/** Deterministic 0..1 noise per pixel. */
export const hash = (x: number, y: number, s = 0) => ((((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000) / 1000
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const clampI = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)

function norm(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

// ---------------------------------------------------------------------------
// Cached sprites.

/** Cached building sprite (outlined in plum ink) with hooks relative to the anchor. */
export function building(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline: Color | false = P.ink): Building {
  return cached('central:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as Building
    const o = outlineCanvas(c, outline)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as Building
  }) as Building
}

export function prop(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface) => void, outline: Color | false = P.ink): Prop {
  return building(key, w, h, ax, ay, (g) => fn(g), outline)
}

/** Hook points of a building translated to world space. */
export function hooksAt(b: Building, name: string, at: { x: number; y: number }): Pt[] {
  return (b.hooks[name] ?? []).map((h) => ({ x: at.x + h.x, y: at.y + h.y }))
}

// ---------------------------------------------------------------------------
// Ramps (dark → light). For sculpts index 0 is the outline colour.

export const RAMPS = {
  /** Phra Pathom Chedi's orange-gold glazed tiles. */
  glaze: ['#4a1a0c', '#72280f', '#973a12', '#b95016', '#d4681c', '#e88424', '#f5a136', '#fcbf52', '#ffdb84', '#fff1c0'],
  /** Night flood-lit glaze (warmer, glowing). */
  glazeNight: ['#5a2010', '#853414', '#aa4816', '#c9601a', '#e27c22', '#f39a30', '#fdb642', '#ffcf62', '#ffe596', '#fff6d0'],
  gold: ['#5a2e10', '#8a4a18', '#b36a22', '#d38a2a', '#eaaa36', '#f7c84c', '#ffe38a', '#fff8d8'],
  white: ['#8e7f90', '#a99aa6', '#c2b4b8', '#d8cbc6', '#e9dfd6', '#f5eee4', '#fcf8f0', '#ffffff'],
  pink: ['#6a2140', '#96335c', '#bb4a78', '#d86592', '#ec82aa', '#f79fbf', '#ffbad2', '#ffd4e3', '#ffeef4'],
  blue: ['#141a4a', '#20296e', '#2c3a92', '#3b50b0', '#4f68c8', '#6a84da', '#8ca3e8', '#b3c4f4', '#dfe6ff'],
  teak: ['#24120a', '#3c1f10', '#5a3018', '#784222', '#95562c', '#b06c38', '#c98748', '#dfa462', '#f0c488'],
  bronze: ['#1e1410', '#3a2618', '#56381f', '#724c28', '#8e6232', '#aa7a40', '#c49452', '#dcb06a', '#f0d08e'],
  green: ['#0e2a1e', '#16402c', '#1f573a', '#2a6e48', '#378656', '#4a9e66', '#62b67a', '#84cc92', '#b0e2b4'],
  stone: ['#3e343e', '#5a4e58', '#766a72', '#90848a', '#a89ea0', '#bfb6b4', '#d4ccc8', '#e6e0dc', '#f6f2ee'],
  robe: ['#4a1a08', '#7a2c0c', '#a44012', '#c85818', '#e2741e', '#f29232', '#fcb050', '#ffcc7c', '#ffe6b0'],
  skinMonk: ['#3a2014', '#5e3822', '#80512f', '#9c6a40', '#b78454', '#cd9e6c', '#e0b886', '#eecda0', '#f8e2bf'],
} as const

// ---------------------------------------------------------------------------
// Lathe: shade a surface of revolution (radius `half(y)` per screen row) with
// a top-left light, glaze highlight, optional tile courses and joints.

export interface LatheOpts {
  ambient?: number
  diffuse?: number
  spec?: number
  specPow?: number
  rim?: number
  /** Tile course height in px (a darker line every n rows). */
  rowH?: number
  /** Number of tile columns across the visible half. */
  cols?: number
  /** Chance of a glaze sparkle on lit pixels. */
  sparkle?: number
  seed?: number
  light?: [number, number, number]
  /** Tone shift for this band (e.g. -1 for a recessed ring). */
  shift?: number
}

const L0 = norm(-0.55, 0.5, 0.67)

export function lathe(g: Surface, cx: number, y0: number, y1: number, half: (y: number) => number, ramp: readonly Color[], o: LatheOpts = {}) {
  const n = ramp.length
  const L = o.light ? norm(...o.light) : L0
  const H = norm(L[0], L[1], L[2] + 1)
  const amb = o.ambient ?? 0.12
  const dif = o.diffuse ?? 0.78
  const spw = o.spec ?? 0.35
  const spp = o.specPow ?? 18
  const rimK = o.rim ?? 0.12
  for (let y = y0; y < y1; y++) {
    const r = half(y)
    if (r < 0.5) continue
    const dr = (half(y + 1) - half(y - 1)) / 2
    let prev = NaN
    const row = o.rowH ? Math.floor((y - y0) / o.rowH) : 0
    for (let x = Math.floor(cx - r); x < Math.ceil(cx + r); x++) {
      const u = (x + 0.5 - cx) / r
      if (u < -1 || u > 1) continue
      const [nx, ny, nz] = norm(u, dr, Math.sqrt(1 - u * u))
      const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
      const sp = Math.pow(Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]), spp)
      const v = amb + dif * diff + spw * sp + Math.pow(1 - nz, 3) * rimK
      let idx = Math.round(clamp01(v) * (n - 1) + dth(x, y) * 0.9) + (o.shift ?? 0)
      if (o.rowH && (y - y0) % o.rowH === 0) idx -= 1
      if (o.cols) {
        const cell = Math.floor((Math.asin(u) / Math.PI + 0.5) * o.cols + (row % 2) * 0.5)
        if (!Number.isNaN(prev) && cell !== prev) idx -= 1
        prev = cell
      }
      if (o.sparkle && idx >= n - 3 && hash(x, y, o.seed ?? 0) < o.sparkle) idx = n - 1
      g.px(x, y, ramp[clampI(idx, 0, n - 1)])
    }
  }
}

/** A lit square block seen from the front (left face lit, right in shade). */
export function block(g: Surface, cx: number, top: number, h: number, half: number, ramp: readonly Color[], lip = true) {
  const n = ramp.length
  const x0 = Math.round(cx - half)
  const x1 = Math.round(cx + half)
  for (let y = top; y < top + h; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x + 0.5 - cx) / half
      // Front face with two redented corners.
      let v = 0.62 - u * 0.18
      if (u < -0.8) v = 0.82
      else if (u > 0.8) v = 0.32
      g.px(x, y, ramp[clampI(Math.round(v * (n - 1) + dth(x, y) * 0.8), 0, n - 1)])
    }
  }
  if (lip) g.hline(x0, x1 - 1, top, ramp[n - 1])
}

// ---------------------------------------------------------------------------
// Sculpt primitives (the statue renderer from hall.ts). Local coords: x right,
// y UP, z toward the viewer; `part` separates contour lines, `m` = material.

export type Prim = SculptOpts['prims'][number]
export type V3 = [number, number, number]

export const Ell = (x: number, y: number, z: number, rx: number, ry: number, rz: number, part: number, m = 0, minY?: number, maxY?: number): Prim => ({ t: 0, x, y, z, rx, ry, rz, part, m, minY, maxY })
export const Cap = (a: V3, b: V3, ra: number, rb: number, part: number, m = 0, zk = 1, minY?: number): Prim => ({
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
  m,
  minY,
  zk,
})

const sculptCache = new Map<string, Sculpted>()
export function sculpted(key: string, make: () => SculptOpts): Sculpted {
  let r = sculptCache.get(key)
  if (!r) {
    r = sculpt(make())
    sculptCache.set(key, r)
  }
  return r
}

/** Draw a sculpt with its local origin at (x, y). */
export function drawSculpt(g: Surface, sc: Sculpted, x: number, y: number, flip = false) {
  g.draw(sc.canvas, Math.round(x) - (flip ? sc.canvas.width - sc.ox : sc.ox), Math.round(y) - sc.oy, flip)
}

// ---------------------------------------------------------------------------
// Ground and floor painters.

/** Polished plank floor running left-right. */
export function woodFloor(g: Surface, x: number, y: number, w: number, h: number, c: { b: Color; d: Color; l: Color; j: Color }, plank = 5, seed = 0) {
  g.rect(x, y, w, h, c.b)
  for (let j = 0; j < h; j += plank) {
    g.hline(x, x + w - 1, y + j, c.j)
    const row = Math.floor(j / plank)
    const off = ((row * 37 + seed) % 5) * 7
    for (let i = -off; i < w; i += 34) if (i > 0) g.vline(x + i, y + j, Math.min(y + h - 1, y + j + plank - 1), c.j)
    // Grain.
    for (let i = 0; i < w; i += 3) {
      const v = hash(x + i, y + j, seed + 3)
      if (v < 0.22) g.px(x + i, y + j + 2, c.d)
      else if (v > 0.9) g.hline(x + i, x + i + 3, y + j + 1, c.l)
    }
  }
}

/** Checkerboard marble tiles with a soft vein and sheen. */
export function marbleFloor(g: Surface, x: number, y: number, w: number, h: number, a: Color, b: Color, size = 8, vein: Color = '#d8d0d8') {
  for (let j = 0; j < h; j += size)
    for (let i = 0; i < w; i += size) {
      const c = ((i / size + j / size) & 1) === 0 ? a : b
      g.rect(x + i, y + j, Math.min(size, w - i), Math.min(size, h - j), c)
      g.px(x + i + 1, y + j + 1, mixHex(c, '#ffffff', 0.5))
      if (hash(x + i, y + j, 11) < 0.35) g.line(x + i + 2, y + j + size - 2, x + i + size - 3, y + j + 3, mixHex(c, vein, 0.5))
    }
}

/** Long carpet runner with a border and a repeating motif. */
export function carpet(g: Surface, x: number, y: number, w: number, h: number, main: Color, border: Color, motif: Color) {
  g.rect(x, y, w, h, border)
  g.rect(x + 2, y + 2, w - 4, h - 4, main)
  for (let j = y + 5; j < y + h - 4; j += 8)
    for (let i = x + 5; i < x + w - 4; i += 8) {
      g.px(i, j, motif)
      g.px(i - 1, j + 1, motif)
      g.px(i + 1, j + 1, motif)
      g.px(i, j + 2, motif)
    }
  for (let i = x + 1; i < x + w - 1; i += 3) {
    g.px(i, y + 1, motif)
    g.px(i, y + h - 2, motif)
  }
}

/** Soft reflection of a bright object on a polished floor. */
export function sheen(g: Surface, cx: number, y: number, w: number, h: number, color: Color, strength = 0.4) {
  for (let j = 0; j < h; j++) {
    const k = (1 - j / h) * strength
    const half = w / 2 - j * 0.3
    for (let i = Math.round(-half); i < half; i++) if (bayer(cx + i, y + j) < k * 16) g.px(cx + i, y + j, color)
  }
}

/**
 * Thai temple mural (จิตรกรรมฝาผนัง): an upper register of seated devas in
 * rows (เทพชุมนุม) separated by a zigzag ribbon, and a lower register of
 * little narrative scenes – trees, pavilions, figures and a boat.
 */
export function drawMural(g: Surface, x: number, y: number, w: number, h: number, seed = 0, o: { bg?: Color; dark?: boolean } = {}) {
  const bg = o.bg ?? '#e8d4a8'
  const ink = '#6a3a2a'
  g.rect(x, y, w, h, bg)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (hash(x + i, y + j, seed + 1) < 0.05) g.px(x + i, y + j, mixHex(bg, '#b89a70', 0.4))
  const devaH = Math.min(18, Math.floor(h * 0.34))
  // Rows of devas with hands in añjali, gold crowns, alternating robes.
  const robes = ['#b8343f', '#3f7a5a', '#c9a04c', '#4a5a9a', '#e8a86a']
  for (let row = 0; row < 2; row++) {
    const ry = y + 2 + row * Math.floor(devaH / 2)
    for (let i = 0; i < Math.floor((w - 4) / 8); i++) {
      const dx = x + 4 + i * 8 + (row % 2) * 4
      if (dx > x + w - 6) continue
      const c = robes[(i + row * 2 + seed) % robes.length]
      g.poly(
        [
          [dx - 3, ry + 8],
          [dx + 3, ry + 8],
          [dx, ry + 3],
        ],
        c,
      )
      g.rect(dx - 1, ry + 2, 2, 2, '#f4d8b0')
      g.px(dx, ry, GOLD.d)
      g.px(dx, ry + 1, GOLD.b)
      g.px(dx, ry + 5, '#f4d8b0')
      // Flame motif between devas.
      g.px(dx + 4, ry + 6, '#b8343f')
      g.px(dx + 4, ry + 4, '#e8514a')
    }
  }
  // Zigzag ribbon (สินเทา) dividing the registers.
  const zy = y + devaH + 2
  for (let i = 0; i < w; i++) {
    const k = Math.abs(((i + seed) % 8) - 4)
    g.px(x + i, zy + k - 2, ink)
    g.px(x + i, zy + k - 1, '#b8343f')
  }
  // Narrative register.
  const ny = zy + 4
  const nh = y + h - ny
  if (nh < 8) return
  // Distant hills and water.
  for (let i = 0; i < w; i++) {
    const hy = ny + 2 + Math.round(Math.abs(Math.sin((i + seed * 7) * 0.09)) * 5)
    g.vline(x + i, hy, ny + 8, '#c8c8a0')
  }
  g.rect(x, y + h - 5, w, 4, '#a8c0b0')
  for (let i = 0; i < w; i += 5) g.hline(x + i, x + i + 2, y + h - 3, '#d8e4d8')
  const R = (k: number) => hash(k, seed, 77)
  const n = Math.max(3, Math.floor((w * nh) / 140))
  for (let k = 0; k < n; k++) {
    const px = x + 4 + Math.floor(R(k) * (w - 12))
    const py = ny + 6 + Math.floor(R(k + 50) * Math.max(1, nh - 14))
    const kind = Math.floor(R(k + 90) * 4)
    if (kind === 0) {
      // Tree.
      g.vline(px, py + 2, py + 7, '#6a4a3a')
      g.circle(px, py + 1, 3, '#5a7a4a')
      g.circle(px - 1, py, 2, '#7a9a5a')
    } else if (kind === 1) {
      // Pavilion.
      g.rect(px - 3, py + 3, 7, 4, '#f4ecd8')
      g.poly(
        [
          [px - 5, py + 3],
          [px + 5, py + 3],
          [px, py - 2],
        ],
        '#b8343f',
      )
      g.px(px, py - 3, GOLD.b)
    } else if (kind === 2) {
      // Two figures.
      for (const d of [-2, 2]) {
        g.rect(px + d, py + 2, 2, 4, robes[(k + d + 5) % robes.length])
        g.px(px + d, py + 1, '#f4d8b0')
      }
    } else {
      // A boat on the water.
      g.hline(px - 4, px + 4, y + h - 4, '#6a4a3a')
      g.hline(px - 3, px + 3, y + h - 3, '#8a5a3a')
      g.px(px, y + h - 6, '#f4d8b0')
      g.px(px, y + h - 5, '#b8343f')
    }
  }
  if (o.dark) g.frame(x, y, w, h, '#4a2a2a')
}

/** Scattered pairs of flip-flops and sneakers (messy shoes outside a hall). */
export function looseShoes(g: Surface, x: number, y: number, w: number, h: number, n: number, seed = 0) {
  const cols = ['#e8514a', '#5a8de0', '#ffd23f', '#3a3040', '#ff9fc0', '#fffaf0', '#6cc36a', '#9a6a45']
  for (let i = 0; i < n; i++) {
    const hh = ((i + 5) * 2654435761 + seed * 977) >>> 0
    const X = x + (hh % w)
    const Y = y + ((hh >>> 9) % h)
    const c = cols[(hh >>> 18) % cols.length]
    const tilt = (hh >>> 22) % 3
    g.rect(X, Y, 3, 2, mixHex(c, '#3a2838', 0.35))
    g.rect(X, Y - 1, 3, 1, c)
    g.rect(X + 4, Y + (tilt === 1 ? 1 : 0), 3, 2, mixHex(c, '#3a2838', 0.35))
    g.rect(X + 4, Y - 1 + (tilt === 1 ? 1 : 0), 3, 1, c)
  }
}

/** A curb of stones / step. */
export function steps(g: Surface, x: number, y: number, w: number, n: number, stepH: number, ramp: { L: Color; b: Color; d: Color; D: Color }, widen = 0) {
  for (let i = 0; i < n; i++) {
    const yy = y + i * stepH
    const ww = w + i * widen * 2
    const xx = x - i * widen
    g.rect(xx, yy, ww, stepH, ramp.b)
    g.hline(xx, xx + ww - 1, yy, ramp.L)
    g.hline(xx, xx + ww - 1, yy + stepH - 1, ramp.d)
    g.px(xx, yy, ramp.d)
    g.px(xx + ww - 1, yy, ramp.D)
  }
}

/** Water surface with bands, shimmer and dark banks. */
export function waterBand(g: Surface, x: number, y: number, w: number, h: number, c: { L: Color; b: Color; d: Color; D: Color }, seed = 0) {
  g.gradientV(x, y, w, h, [c.b, c.d, c.D], 5)
  for (let j = 2; j < h - 2; j += 3)
    for (let i = ((j * 7 + seed) % 13) - 13; i < w; i += 17 + ((j + seed) % 5)) {
      const len = 3 + ((i + j) % 5)
      g.hline(x + Math.max(0, i), x + Math.min(w - 1, i + len), y + j, j < h / 2 ? c.L : mixHex(c.L, c.b, 0.5))
    }
}

/** Stone slab paving clipped to an ellipse (joints in absolute coordinates). */
export function paveEllipse(g: Surface, cx: number, cy: number, rx: number, ry: number, tone: { b: Color; j: Color; l: Color }, size = 8) {
  for (let y = Math.ceil(cy - ry); y < cy + ry; y++) {
    const half = rx * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - cy) / ry) ** 2))
    paveRow(g, Math.round(cx - half), Math.round(cx + half), y, tone, size)
  }
}

/** One row of slab paving between x0 and x1 (absolute joint grid). */
export function paveRow(g: Surface, x0: number, x1: number, y: number, tone: { b: Color; j: Color; l: Color }, size = 8) {
  if (x1 <= x0) return
  const row = Math.floor(y / size)
  const off = (row % 2) * (size >> 1)
  const local = ((y % size) + size) % size
  if (local === 0) {
    g.rect(x0, y, x1 - x0, 1, tone.j)
    return
  }
  g.rect(x0, y, x1 - x0, 1, tone.b)
  for (let x = x0; x < x1; x++) {
    const k = (((x + off) % size) + size) % size
    if (k === 0) g.px(x, y, tone.j)
    else if (local === 1 && k > 0 && k < size - 1) g.px(x, y, tone.l)
    else if (hash(Math.floor((x + off) / size), row, 5) < 0.18 && (x + local) % 3 === 0) g.px(x, y, mixHex(tone.b, tone.j, 0.5))
  }
}

export const PAVE = {
  cream: { b: '#f1e8da', j: '#d8c9b2', l: '#fbf6ec' },
  grey: { b: '#e4ddd6', j: '#c9bfb8', l: '#f2eee9' },
  terracotta: { b: '#d9906a', j: '#b06a4a', l: '#eab08a' },
  marble: { b: '#f4f0ec', j: '#d6ccd0', l: '#ffffff' },
} as const

/** Sandy packed earth (fairgrounds, orchard paths). */
export function dirt(g: Surface, x: number, y: number, w: number, h: number, base: Color = '#e0c79a', seed = 0) {
  g.rect(x, y, w, h, base)
  const d = mixHex(base, '#8a6a4a', 0.25)
  const l = mixHex(base, '#ffffff', 0.3)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = hash(x + i, y + j, seed)
      if (v < 0.05) g.px(x + i, y + j, d)
      else if (v > 0.97) g.px(x + i, y + j, l)
    }
}

/** Big shady rain tree (ต้นจามจุรี) with a broad umbrella canopy. Anchor = trunk base. */
export function rainTreeSprite(v = 0): Prop {
  const W = 92
  const H = 76
  return prop('raintree' + v, W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    // Trunk and splayed branches.
    const bark = ['#5e4c4c', '#7f6a66', '#a38f86', '#cbbab2']
    for (let y = 40; y < H - 1; y++) {
      const half = 3 + (y > H - 8 ? (y - (H - 8)) * 0.8 : 0)
      for (let x = Math.round(cx - half); x < cx + half; x++) g.px(x, y, bark[Math.min(3, Math.max(0, Math.round(2.4 - ((x - cx) / half) * 1.4)))])
    }
    for (const [dx, dy] of [
      [-22, 30],
      [20, 28],
      [-8, 26],
      [10, 24],
    ]) g.thickLine(cx, 44, cx + dx, dy, 3, bark[1])
    // Canopy: a wide, flat dome of leafy blobs.
    const R = { L: '#9ed86a', b: '#5eae55', d: '#3f8a4f', D: '#2c6a45' }
    const blobs: [number, number, number][] = []
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI
      blobs.push([cx - Math.cos(a) * 36, 26 - Math.sin(a) * 12 + (i % 2) * 3, 11 + (i % 3)])
    }
    blobs.push([cx - 12, 18, 14], [cx + 12, 18, 14], [cx, 12, 13])
    for (const [x, y, s] of blobs) g.circle(x, y + 2, s, R.D)
    for (const [x, y, s] of blobs) g.circle(x, y, s, R.d)
    for (const [x, y, s] of blobs) g.circle(x - s * 0.2, y - s * 0.25, s * 0.8, R.b)
    for (const [x, y, s] of blobs) g.circle(x - s * 0.4, y - s * 0.45, s * 0.4, R.L)
    for (let i = 0; i < 160; i++) {
      const [x, y, s] = blobs[i % blobs.length]
      const a = hash(i, v, 2) * 6.28
      const d = hash(i, v, 3) * s * 0.9
      const px = Math.round(x + Math.cos(a) * d)
      const py = Math.round(y + Math.sin(a) * d)
      g.px(px, py, Math.sin(a) < -0.2 ? R.L : R.D)
      if (v % 2 === 1 && i % 9 === 0) g.px(px, py - 1, '#ff9fc0')
    }
  })
}

// ---------------------------------------------------------------------------
// Job markers: the tools lying about tell players where to help.

/** Coconut-rib broom (ไม้กวาดทางมะพร้าว) leaning on a dustpan. */
export function broomProp(): Prop {
  return prop('broom', 16, 22, 7, 21, (g) => {
    g.line(4, 1, 8, 13, '#9a6a45')
    g.line(5, 1, 9, 13, '#c28e5c')
    g.rect(7, 12, 4, 2, '#e8514a')
    for (let i = 0; i < 7; i++) g.line(8, 14, 3 + i * 1.6, 21, i % 2 ? '#d9b25f' : '#b8904a')
    // Dustpan.
    g.rect(11, 16, 5, 5, '#5a8de0')
    g.rect(11, 16, 5, 1, '#9fd0ff')
    g.rect(12, 14, 1, 2, '#3d63b5')
  })
}

/** Heap of swept leaves. */
export function leafPileProp(v = 0): Prop {
  return prop('leafpile' + v, 16, 8, 8, 7, (g) => {
    const cols = ['#c9a04c', '#d9b25f', '#9a8a4a', '#e0a060', '#b0803a', '#8fbf5a']
    g.ellipse(8, 5, 7.5, 3, '#9a7a3a')
    for (let i = 0; i < 40; i++) {
      const a = (i * 2.4 + v) % 6.28
      const r = ((i * 7) % 10) / 10
      const x = 8 + Math.cos(a) * 6.5 * r
      const y = 5 + Math.sin(a) * 2.6 * r - (1 - r) * 2.5
      g.px(x, y, cols[(i + v) % cols.length])
    }
  })
}

/** Blue bucket with a mop. */
export function mopBucketProp(): Prop {
  return prop('mop', 14, 22, 6, 21, (g) => {
    g.line(9, 0, 7, 16, '#c28e5c')
    g.line(10, 0, 8, 16, '#9a6a45')
    g.rect(2, 13, 9, 8, '#3d8ad0')
    g.rect(2, 13, 9, 2, '#9fd0ff')
    g.rect(3, 15, 7, 1, '#b3eef4')
    g.rect(9, 14, 2, 7, '#2f6fae')
    g.hline(2, 10, 20, '#2a5a8e')
    for (let i = 0; i < 5; i++) g.px(4 + i, 12 - (i % 2), '#fffaf0')
  })
}

/** Watering can beside two potted plants. */
export function wateringProp(): Prop {
  return prop('watering', 22, 14, 11, 13, (g) => {
    for (const [x, c] of [
      [4, '#e8514a'],
      [17, '#ffd23f'],
    ] as const) {
      g.rect(x - 3, 9, 7, 5, '#c8643a')
      g.rect(x - 3, 9, 7, 1, '#e8885a')
      g.circle(x, 6, 3.4, '#43905a')
      g.circle(x - 1, 5, 2, '#6cc36a')
      g.px(x, 4, c)
      g.px(x + 1, 6, c)
    }
    g.rect(8, 7, 6, 6, '#4fa860')
    g.rect(8, 7, 6, 1, '#86c95f')
    g.line(13, 9, 16, 6, '#3f8a4f')
    g.px(16, 5, '#86c95f')
    g.rect(9, 5, 4, 1, '#3f8a4f')
    g.vline(8, 5, 7, '#3f8a4f')
  })
}

/** Wooden shoe rack; `messy` leaves a few pairs dumped in front. */
export function shoeRackProp(messy = true): Prop {
  return prop('shoerack' + (messy ? 1 : 0), 30, 18, 15, 17, (g) => {
    g.rect(1, 2, 28, 13, '#9a6a45')
    g.rect(1, 2, 28, 1, '#c28e5c')
    for (const y of [5, 9, 13]) g.rect(2, y, 26, 1, '#6e4a35')
    const cols = ['#e8514a', '#5a8de0', '#fffaf0', '#ffd23f', '#3a3040', '#ff9fc0', '#6cc36a']
    let k = 0
    for (const y of [3, 7, 11])
      for (let x = 3; x < 26; x += 5) {
        if ((x + y) % 3 === 0 && messy) continue
        const c = cols[k++ % cols.length]
        g.rect(x, y, 3, 2, c)
        g.px(x, y, mixHex(c, '#ffffff', 0.4))
      }
    g.rect(1, 15, 2, 3, '#6e4a35')
    g.rect(27, 15, 2, 3, '#6e4a35')
  })
}

/** Rack of votive candles, some waiting to be lit. */
export function candleRackProp(): Prop {
  return prop('candlerack', 26, 16, 13, 15, (g) => {
    g.rect(1, 8, 24, 5, '#b8742a')
    g.rect(1, 8, 24, 1, '#ffd54f')
    g.rect(2, 13, 2, 3, '#8a5222')
    g.rect(22, 13, 2, 3, '#8a5222')
    for (let i = 0; i < 7; i++) {
      const x = 3 + i * 3
      g.rect(x, 3 + (i % 2), 2, 5 - (i % 2), '#fffaf0')
      g.px(x + 1, 3 + (i % 2), '#efe4d0')
      if (i % 3 === 0) g.px(x, 2 + (i % 2), '#ffb35a')
    }
    g.rect(1, 12, 24, 1, '#8a5222')
  })
}

/** Tray with a polishing cloth and a tin of brass polish. */
export function polishKitProp(): Prop {
  return prop('polish', 16, 9, 8, 8, (g) => {
    g.rect(1, 4, 14, 4, '#9a6a45')
    g.rect(1, 4, 14, 1, '#c28e5c')
    g.rect(3, 1, 5, 4, '#e8514a')
    g.rect(3, 1, 5, 1, '#ffd23f')
    g.rect(9, 2, 5, 3, '#fffaf0')
    g.px(10, 3, '#efe4d0')
    g.px(12, 2, '#ffd6e0')
  })
}

/** Bucket, sponge and cloth for washing statues. */
export function washKitProp(): Prop {
  return prop('washkit', 16, 14, 7, 13, (g) => {
    g.rect(2, 5, 9, 8, '#ffd23f')
    g.rect(2, 5, 9, 2, '#fff09a')
    g.rect(3, 6, 7, 1, '#9fd0ff')
    g.rect(9, 6, 2, 7, '#e0a526')
    g.line(2, 5, 6, 1, '#8c8187')
    g.line(6, 1, 10, 5, '#8c8187')
    g.rect(11, 10, 4, 3, '#6cc36a')
    g.rect(11, 10, 4, 1, '#b4e486')
    g.px(5, 4, '#ffffff')
  })
}

/** Bucket of fish pellets with a little fish sign. */
export function fishFoodProp(): Prop {
  return prop('fishfood', 16, 20, 8, 19, (g) => {
    g.rect(7, 1, 2, 12, '#9a6a45')
    g.rect(2, 1, 12, 7, '#fffaf0')
    g.frame(2, 1, 12, 7, '#9a6a45')
    g.ellipse(7, 4.5, 3, 1.6, '#f58f35')
    g.px(11, 4, '#f58f35')
    g.px(11, 3, '#f58f35')
    g.px(11, 5, '#f58f35')
    g.px(6, 4, '#3a2838')
    g.rect(3, 13, 10, 6, '#e8514a')
    g.rect(3, 13, 10, 1, '#ff8a7a')
    for (let i = 0; i < 6; i++) g.px(4 + i * 1.5, 12, '#c9a04c')
  })
}

// ---------------------------------------------------------------------------
// Market stalls.

export interface StallOpts {
  w: number
  /** Awning stripe colours. */
  awning: [Color, Color]
  counter?: Color
  /** Paint the goods on the counter (x0 = counter left, y = counter top). */
  goods(g: Surface, x0: number, y: number, w: number): void
  /** Paint on the awning's hanging sign (icon only). */
  sign?(g: Surface, cx: number, y: number): void
  /** Umbrella-style awning instead of a flat canopy. */
  umbrella?: boolean
}

/** A market stall with a striped awning, a counter and custom goods. Anchor = front centre. */
export function stallProp(key: string, o: StallOpts): Prop {
  const W = o.w + 8
  const H = 44
  return prop('stall:' + key, W, H, W >> 1, H - 1, (g) => {
    const x0 = 4
    const x1 = 4 + o.w
    const cw = o.counter ?? '#c28e5c'
    // Posts.
    g.rect(x0 + 1, 12, 2, 31, '#6e4a35')
    g.rect(x1 - 3, 12, 2, 31, '#6e4a35')
    // Side shelves in the shade; the middle stays open so the vendor
    // (standing 3 px behind the anchor) shows over the counter.
    for (const sx of [x0 + 3, x1 - 11]) {
      g.rect(sx, 16, 8, 12, mixHex(cw, '#3a2838', 0.45))
      g.rect(sx, 21, 8, 1, mixHex(cw, '#3a2838', 0.6))
    }
    // Counter.
    g.rect(x0, 28, o.w, 14, cw)
    g.rect(x0, 28, o.w, 2, mixHex(cw, '#ffffff', 0.35))
    g.rect(x0, 41, o.w, 2, mixHex(cw, '#3a2838', 0.4))
    for (let x = x0 + 3; x < x1 - 2; x += 6) g.vline(x, 31, 40, mixHex(cw, '#3a2838', 0.2))
    o.goods(g, x0, 28, o.w)
    // Awning.
    if (o.umbrella) {
      const cx = (x0 + x1) / 2
      for (let i = 0; i < 9; i++) {
        const half = (o.w / 2 + 4) * Math.sqrt(1 - ((8 - i) / 9) ** 2)
        for (let x = Math.round(cx - half); x < cx + half; x++) g.px(x, 2 + i, Math.floor((x - cx + 60) / 5) % 2 ? o.awning[0] : o.awning[1])
      }
      g.vline(Math.round(cx), 0, 2, '#6e4a35')
    } else {
      for (let x = x0 - 3; x < x1 + 3; x++) {
        const c = Math.floor((x - x0 + 3) / 4) % 2 ? o.awning[0] : o.awning[1]
        g.rect(x, 4, 1, 9, c)
        g.px(x, 4, mixHex(c, '#ffffff', 0.4))
      }
      // Scalloped edge.
      for (let x = x0 - 3; x < x1 + 3; x += 4) {
        const c = Math.floor((x - x0 + 3) / 4) % 2 ? o.awning[0] : o.awning[1]
        g.rect(x, 13, 4, 1, c)
        g.rect(x + 1, 14, 2, 1, c)
      }
      g.hline(x0 - 3, x1 + 2, 12, mixHex(o.awning[0], '#3a2838', 0.3))
    }
    o.sign?.(g, (x0 + x1) >> 1, 6)
  })
}

// ---------------------------------------------------------------------------
// Misc shared props.

/** Tall red lacquer pillar with gold stencil and lotus capital (interiors). Anchor = base centre. */
export function pillarProp(h: number, body: Color = '#b8343f', stencil: Color = GOLD.d, w = 8): Prop {
  return prop(`pillar:${h}:${body}:${w}`, w + 4, h, (w + 4) >> 1, h - 1, (g) => {
    const x = 2
    g.rect(x, 6, w, h - 12, body)
    g.rect(x, 6, 1, h - 12, mixHex(body, '#ffffff', 0.3))
    g.rect(x + w - 2, 6, 2, h - 12, mixHex(body, '#3a2838', 0.35))
    // Gold stencil (ลายฉลุ) in bands.
    for (let y = 12; y < h - 10; y += 6)
      for (let i = 1; i < w - 2; i += 2) {
        g.px(x + i, y + ((i >> 1) % 2), stencil)
        if ((y / 6) % 2 === 0) g.px(x + i, y + 3, mixHex(stencil, body, 0.5))
      }
    // Lotus capital and base.
    g.rect(x - 2, 0, w + 4, 3, GOLD.b)
    g.hline(x - 2, x + w + 1, 0, GOLD.l)
    for (let i = -2; i < w + 2; i += 2) g.px(x + i, 3, GOLD.d)
    g.rect(x - 1, 4, w + 2, 2, GOLD.D)
    g.rect(x - 2, h - 6, w + 4, 6, GOLD.d)
    g.hline(x - 2, x + w + 1, h - 6, GOLD.l)
    for (let i = -1; i < w + 2; i += 2) g.px(x + i, h - 4, GOLD.b)
  })
}

/** Brass standing lamp / candle pole for interiors. */
export function brassCandleProp(): Prop {
  return prop('brasscandle', 8, 26, 4, 25, (g) => {
    g.rect(3, 4, 2, 18, GOLD.d)
    g.px(3, 4, GOLD.l)
    g.rect(1, 3, 6, 2, GOLD.b)
    g.rect(3, 0, 2, 3, WHITE.b)
    g.rect(1, 22, 6, 3, GOLD.D)
    g.hline(1, 6, 22, GOLD.b)
  })
}

/** Offering table with fruit, garlands and a little incense pot. */
export function offeringTableProp(w = 30, fruit: Color[] = ['#ffd23f', '#f58f35', '#e8514a', '#6cc36a']): Prop {
  return prop(`offertable:${w}:${fruit.join('')}`, w + 2, 18, (w + 2) >> 1, 17, (g) => {
    g.rect(1, 7, w, 5, '#b8343f')
    g.rect(1, 7, w, 1, '#e8514a')
    g.rect(1, 11, w, 1, GOLD.d)
    g.rect(3, 12, 2, 6, '#7e2436')
    g.rect(w - 3, 12, 2, 6, '#7e2436')
    for (let i = 0; i < Math.floor((w - 6) / 5); i++) {
      const x = 4 + i * 5
      const c = fruit[i % fruit.length]
      g.ellipse(x + 1.5, 5, 2.2, 2, c)
      g.px(x + 1, 4, mixHex(c, '#ffffff', 0.5))
    }
    // Garland loops on the cloth.
    for (let x = 2; x < w; x += 2) g.px(x, 9 + ((x >> 1) % 2), (x >> 1) % 3 ? '#fffaf0' : '#ffd23f')
  })
}

/** A wobbly speech-free sign board on a post with an icon painter. */
export function signProp(key: string, w: number, h: number, bg: Color, paint: (g: Surface, x: number, y: number) => void): Prop {
  return prop('sign:' + key, w + 2, h + 10, (w + 2) >> 1, h + 9, (g) => {
    g.rect(((w + 2) >> 1) - 1, h, 2, 10, '#6e4a35')
    g.rect(1, 0, w, h, bg)
    g.frame(1, 0, w, h, mixHex(bg, '#3a2838', 0.45))
    g.hline(2, w - 1, 1, mixHex(bg, '#ffffff', 0.4))
    paint(g, 1, 0)
  })
}

export { GOLD, WHITE }
