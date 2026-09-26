// The prayer hall (อุโบสถ / วิหาร / หิ้งพระ) in high detail.
//
// Everything here is drawn once per resize / temple into static layers:
//  - a per-pixel "shader" pass paints the room in one-point perspective
//    (coffered ceiling, mural walls, polished floor, carpet),
//  - the principal Buddha image is "sculpted" from analytic 3D primitives,
//    lit and quantised to a gold pixel ramp with clean contour lines,
//  - architecture and altar furniture are drawn with the Surface API on top.
// Only small things (flames, smoke, glows, people) are drawn per frame.

import { bayer, createCanvas, mix, Surface, type Color } from '../engine/pixel'
import { catSprite } from './characters'

// ---------------------------------------------------------------------------
// Colour + pixel buffer helpers

const intCache = new Map<string, number>()

/** Packed little-endian RGBA (ImageData order) for a #rrggbb colour. */
export function cint(hex: string): number {
  let v = intCache.get(hex)
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16)
    v = ((0xff << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)) >>> 0
    intCache.set(hex, v)
  }
  return v
}

/** A raw pixel buffer for bake-time shading; converted to a canvas at the end. */
export class PixBuf {
  readonly data: Uint32Array
  readonly img: ImageData
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.img = new ImageData(Math.max(1, w), Math.max(1, h))
    this.data = new Uint32Array(this.img.data.buffer)
  }
  set(x: number, y: number, c: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.data[y * this.w + x] = c
  }
  toCanvas(): HTMLCanvasElement {
    const c = createCanvas(this.w, this.h)
    c.getContext('2d')!.putImageData(this.img, 0, 0)
    return c
  }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
/** Ordered-dither offset in -0.5..0.5 for pixel (x, y). */
const dth = (x: number, y: number) => (bayer(x, y) + 0.5) / 16 - 0.5

// ---------------------------------------------------------------------------
// Sculpt: tiny analytic 3D renderer for statues and vessels.
// Local coordinates: x right, y UP, z toward the viewer.

interface Ell {
  t: 0
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  part: number
  minY?: number
  maxY?: number
  /** Material (index into the sculpt's ramps). */
  m?: number
}
interface Cap {
  t: 1
  ax: number
  ay: number
  az: number
  bx: number
  by: number
  bz: number
  ra: number
  rb: number
  part: number
  minY?: number
  /** Depth squash of the cross-section (1 = round). */
  zk: number
  m?: number
}
type Prim = Ell | Cap
type V3 = [number, number, number]

const E = (x: number, y: number, z: number, rx: number, ry: number, rz: number, part: number, minY?: number): Ell => ({ t: 0, x, y, z, rx, ry, rz, part, minY })
const C = (a: V3, b: V3, ra: number, rb: number, part: number, minY?: number, zk = 1): Cap => ({
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
/** Assign a material to a group of primitives. */
function M(m: number, ...ps: Prim[]): Prim[] {
  for (const p of ps) p.m = m
  return ps
}

const hitOut = { z: 0, nx: 0, ny: 0, nz: 1 }
function hitPrim(p: Prim, x: number, y: number): boolean {
  if (p.minY !== undefined && y < p.minY) return false
  if (p.t === 0) {
    if (p.maxY !== undefined && y > p.maxY) return false
    const dx = (x - p.x) / p.rx
    const dy = (y - p.y) / p.ry
    const q = 1 - dx * dx - dy * dy
    if (q <= 0) return false
    const dz = Math.sqrt(q)
    hitOut.z = p.z + p.rz * dz
    let nx = dx / p.rx
    let ny = dy / p.ry
    let nz = dz / p.rz
    const l = Math.hypot(nx, ny, nz) || 1
    nx /= l
    ny /= l
    nz /= l
    hitOut.nx = nx
    hitOut.ny = ny
    hitOut.nz = nz
    return true
  }
  const vx = p.bx - p.ax
  const vy = p.by - p.ay
  const vv = vx * vx + vy * vy || 1
  let t = ((x - p.ax) * vx + (y - p.ay) * vy) / vv
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const px = p.ax + vx * t
  const py = p.ay + vy * t
  const r = p.ra + (p.rb - p.ra) * t
  const dx = x - px
  const dy = y - py
  const d2 = dx * dx + dy * dy
  if (d2 >= r * r) return false
  const h = Math.sqrt(r * r - d2)
  hitOut.z = p.az + (p.bz - p.az) * t + h * p.zk
  const nz = h / p.zk
  const l = Math.hypot(dx, dy, nz) || 1
  hitOut.nx = dx / l
  hitOut.ny = dy / l
  hitOut.nz = nz / l
  return true
}

export interface SculptDetail {
  s: number
  w: number
  h: number
  /** Pixel of a local point. */
  px(lx: number, ly: number): [number, number]
  solid(i: number, j: number): boolean
  part(i: number, j: number): number
  mat(i: number, j: number): number
  /** Shift the ramp index of a solid pixel. */
  add(i: number, j: number, d: number): void
  set(i: number, j: number, tone: number): void
  /** Change the material (and optionally the tone) of a solid pixel. */
  paint(i: number, j: number, m: number, tone?: number): void
  tone(i: number, j: number): number
  /** Tone-shift along a line given in local coordinates. */
  line(ax: number, ay: number, bx: number, by: number, d: number): void
  /** Tone-shift along y = f(x) for x in [x0, x1] (local). */
  curve(x0: number, x1: number, f: (x: number) => number, d: number): void
  each(fn: (i: number, j: number, lx: number, ly: number, part: number) => void): void
}

export interface SculptOpts {
  prims: Prim[]
  s: number
  x0: number
  x1: number
  y0: number
  y1: number
  /** Colour ramps per material; index 0 of each is its outline colour. */
  ramps: readonly (readonly string[])[]
  /** Silhouette outline colour (default: the ramp's own index 0). */
  outline?: string
  lineDepth?: number
  /** Extra brightness from a backlight / halo rim (0..1). */
  rim?: number
  /** Specular power and weight. */
  spec?: [number, number]
  /** Per-material multiplier of the specular weight. */
  gloss?: number[]
  ambient?: number
  detail?: (d: SculptDetail) => void
}

export interface Sculpted {
  canvas: HTMLCanvasElement
  /** Pixel position of the local origin inside the canvas. */
  ox: number
  oy: number
}

const LX = -0.5
const LY = 0.62
const LZ = 0.6
const LL = Math.hypot(LX, LY, LZ)
const L1: V3 = [LX / LL, LY / LL, LZ / LL]
const HL = Math.hypot(L1[0], L1[1], L1[2] + 1)
const H1: V3 = [L1[0] / HL, L1[1] / HL, (L1[2] + 1) / HL]
const L2: V3 = [0.08, -0.45, 0.89]

export function sculpt(o: SculptOpts): Sculpted {
  const s = o.s
  const ox = Math.round(-o.x0 * s) + 2
  const oy = Math.round(o.y1 * s) + 2
  const w = Math.ceil((o.x1 - o.x0) * s) + 4
  const h = Math.ceil((o.y1 - o.y0) * s) + 4
  const n = w * h
  const tone = new Int16Array(n).fill(-1)
  const zb = new Float32Array(n).fill(-1e9)
  const part = new Uint8Array(n)
  const mat = new Uint8Array(n)
  const N = 8
  const rimK = o.rim ?? 0.3
  const [sp, sw] = o.spec ?? [16, 0.5]
  const amb = o.ambient ?? 0.06
  for (let j = 0; j < h; j++) {
    const ly = (oy - (j + 0.5)) / s
    for (let i = 0; i < w; i++) {
      const lx = (i + 0.5 - ox) / s
      let best = -1e9
      let bn0 = 0
      let bn1 = 0
      let bn2 = 1
      let bp = 0
      let bm = 0
      for (const p of o.prims) {
        if (!hitPrim(p, lx, ly)) continue
        if (hitOut.z > best) {
          best = hitOut.z
          bn0 = hitOut.nx
          bn1 = hitOut.ny
          bn2 = hitOut.nz
          bp = p.part
          bm = p.m ?? 0
        }
      }
      if (best === -1e9) continue
      const k = j * w + i
      const diff = Math.max(0, bn0 * L1[0] + bn1 * L1[1] + bn2 * L1[2])
      const under = Math.max(0, bn0 * L2[0] + bn1 * L2[1] + bn2 * L2[2])
      const spec = Math.pow(Math.max(0, bn0 * H1[0] + bn1 * H1[1] + bn2 * H1[2]), sp) * (o.gloss?.[bm] ?? 1)
      const rim = Math.pow(1 - bn2, 2.2) * (0.45 + 0.55 * Math.max(0, bn1 + 0.3))
      const v = amb + 0.5 * diff + 0.13 * under + sw * spec + rimK * rim
      const f = clamp01(v) * (N - 1) + 1 + dth(i, j) * 0.85
      tone[k] = Math.max(1, Math.min(N, Math.round(f)))
      zb[k] = best
      part[k] = bp
      mat[k] = bm
    }
  }
  const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h
  const d: SculptDetail = {
    s,
    w,
    h,
    px: (lx, ly) => [Math.floor(ox + lx * s), Math.floor(oy - ly * s)],
    solid: (i, j) => inside(i, j) && tone[j * w + i] >= 0,
    part: (i, j) => (inside(i, j) ? part[j * w + i] : 0),
    mat: (i, j) => (inside(i, j) ? mat[j * w + i] : 0),
    add: (i, j, dd) => {
      if (!inside(i, j)) return
      const k = j * w + i
      if (tone[k] < 0) return
      tone[k] = Math.max(1, Math.min(N, tone[k] + dd))
    },
    set: (i, j, t) => {
      if (!inside(i, j)) return
      const k = j * w + i
      if (tone[k] < 0) return
      tone[k] = Math.max(0, Math.min(N, t))
    },
    paint: (i, j, m, t) => {
      if (!inside(i, j)) return
      const k = j * w + i
      if (tone[k] < 0) return
      mat[k] = m
      if (t !== undefined) tone[k] = Math.max(0, Math.min(N, t))
    },
    tone: (i, j) => (inside(i, j) ? tone[j * w + i] : -1),
    line: (ax, ay, bx, by, dd) => {
      let [x0, y0] = d.px(ax, ay)
      const [x1, y1] = d.px(bx, by)
      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      for (let q = 0; q < 500; q++) {
        d.add(x0, y0, dd)
        if (x0 === x1 && y0 === y1) break
        const e2 = 2 * err
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
    },
    curve: (x0, x1, f, dd) => {
      const seen = new Set<number>()
      const steps = Math.max(2, Math.ceil(Math.abs(x1 - x0) * s * 3))
      for (let q = 0; q <= steps; q++) {
        const lx = x0 + ((x1 - x0) * q) / steps
        const [i, j] = d.px(lx, f(lx))
        const key = j * w + i
        if (seen.has(key)) continue
        seen.add(key)
        d.add(i, j, dd)
      }
    },
    each: (fn) => {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const k = j * w + i
          if (tone[k] < 0) continue
          fn(i, j, (i + 0.5 - ox) / s, (oy - (j + 0.5)) / s, part[k])
        }
    },
  }
  // Internal contour lines where one part passes in front of another.
  const lineDepth = o.lineDepth ?? 2.4
  const mark = new Uint8Array(n)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      if (tone[k] < 0) continue
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ii = i + di
        const jj = j + dj
        if (!inside(ii, jj)) continue
        const q = jj * w + ii
        if (tone[q] < 0 || part[q] === part[k]) continue
        if (zb[k] - zb[q] > lineDepth) mark[q] = 1
      }
    }
  for (let k = 0; k < n; k++) if (mark[k]) tone[k] = 1
  o.detail?.(d)
  // Colour and silhouette outline.
  const buf = new PixBuf(w, h)
  const cols = o.ramps.map((r) => r.map(cint))
  const out = o.outline ? cint(o.outline) : 0
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      const t = tone[k]
      if (t >= 0) {
        const r = cols[mat[k]] ?? cols[0]
        buf.data[k] = r[Math.min(r.length - 1, t)]
        continue
      }
      let nb = -1
      if (i > 0 && tone[k - 1] >= 0) nb = k - 1
      else if (i < w - 1 && tone[k + 1] >= 0) nb = k + 1
      else if (j > 0 && tone[k - w] >= 0) nb = k - w
      else if (j < h - 1 && tone[k + w] >= 0) nb = k + w
      if (nb >= 0) buf.data[k] = out || (cols[mat[nb]] ?? cols[0])[0]
    }
  return { canvas: buf.toCanvas(), ox, oy }
}

// ---------------------------------------------------------------------------
// Palettes

/** Gold ramp: index 0 is the outline. */
export const GOLD_RAMP = ['#3b1a0e', '#62301a', '#8c4a1c', '#b36a22', '#d38a2a', '#eaaa36', '#f7c84c', '#ffe38a', '#fff8d8'] as const
export const ANTIQUE_RAMP = ['#2a140c', '#4e2814', '#71401c', '#935a24', '#b3772e', '#cf963c', '#e6b55a', '#f5d28a', '#fff0c8'] as const
export const LANNA_RAMP = ['#301508', '#5e2c10', '#8a4816', '#b3681c', '#d88b22', '#f0ae30', '#fdd052', '#ffe98a', '#fffadc'] as const

export type BuddhaStyle = 'sukhothai' | 'lanna' | 'antique'

function buddhaPrims(style: BuddhaStyle): Prim[] {
  const lanna = style === 'lanna'
  const sh = lanna ? 1.07 : 1 // broader chest in the Chiang Saen style
  const hy = lanna ? -0.8 : 0 // Lanna images have a shorter neck
  const p: Prim[] = [
    // Crossed legs: broad lap, knees, the right shin on top, sole upturned.
    E(0, 7.4, 0, 31, 7.6, 11, 1, 0),
    E(-28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0),
    E(28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0),
    C([28, 5.5, 6], [-8, 7, 8], 4.6, 4.2, 1, 0),
    C([-29, 7.6, 9], [12, 10.8, 13], 4.8, 3.8, 9, 0),
    E(18.6, 11.8, 13.6, 6.8, 2.8, 3, 10),
    // Torso: broad shoulders tapering to a slim waist.
    E(0, 17, 1.5, 11 * sh, 7, 8.4, 2),
    C([0, 18, 0.5], [0, 33, 0.5], 9.6 * sh, 14.2 * sh, 2, undefined, 0.62),
    E(0, 35.5, 1, 16.4 * sh, 11.5, 8.4, 2),
    C([-15.4 * sh, 40.6, 0], [0, 43.2, 0], 5, 5, 2, undefined, 0.9),
    C([15.4 * sh, 40.6, 0], [0, 43.2, 0], 5, 5, 2, undefined, 0.9),
    C([0, 43, 0.5], [0, 50 + hy, 1.5], 4.4, 4, 2),
    // Head.
    E(0, 60 + hy, 2, lanna ? 9.6 : 9, lanna ? 10.4 : 10.8, 9, 3),
    E(0, 53.8 + hy, 3.6, lanna ? 6.6 : 6, 4.8, 6.4, 3),
    C([-8.7, 64.2 + hy, 0.5], [-9.4, 53.4 + hy, 1.5], 1.05, 1.6, 8),
    C([8.7, 64.2 + hy, 0.5], [9.4, 53.4 + hy, 1.5], 1.05, 1.6, 8),
    E(0, 71.1 + hy, 1.5, lanna ? 6.8 : 6.2, lanna ? 5 : 4.6, 5.5, 7),
    // Arms: the image's right hand touches the earth (มารวิชัย).
    C([-17.4 * sh, 41.4, 0], [-23.6, 27, 1.5], 5.1, 4.1, 4),
    C([-23.6, 27, 1.5], [-27.8, 12, 8], 4, 3, 4),
    C([-27.8, 12, 9], [-28.8, 3.6, 11], 2.9, 2.5, 6),
    C([17.4 * sh, 41.4, 0], [23.6, 27, 1.5], 5.1, 4.1, 5),
    C([23.6, 27, 1.5], [10.5, 15.2, 10.5], 4, 3, 5),
    E(3.6, 14.2, 11.4, 7, 2.6, 3, 6),
  ]
  if (lanna) {
    // Lotus-bud finial (ดอกบัวตูม).
    p.push(E(0, 77.7 + hy, 1.5, 3.3, 4.4, 3, 11), C([0, 79.5 + hy, 1.5], [0, 85 + hy, 1.5], 1.8, 0.3, 11))
  } else {
    // Flame finial (รัศมีเปลว).
    p.push(C([0, 74.5, 1.5], [0, 93.5, 1.5], 2.9, 0.35, 11))
  }
  return p
}

function buddhaDetail(style: BuddhaStyle) {
  const lanna = style === 'lanna'
  const Y = (lanna ? -0.8 : 0) - 4 // head offset relative to the face constants below
  return (d: SculptDetail) => {
    const s = d.s
    const fine = s >= 0.8
    // Hair curls on the head above the hairline and on the ushnisha.
    const hairline = (x: number) => (lanna ? 68.7 : 68.4) + Y - 0.022 * x * x
    d.each((i, j, lx, ly, part) => {
      const hair = (part === 3 && ly > hairline(lx)) || part === 7
      if (!hair) return
      const dot = fine ? j % 2 === 0 && (i + (j >> 1)) % 2 === 0 : (i + j) % 2 === 0
      if (dot) d.add(i, j, -1)
      else if (fine && (i + (j >> 1)) % 2 === 1 && j % 2 === 1) d.add(i, j, 1)
    })
    d.curve(-8.4, 8.4, hairline, -2)
    // Brows meeting at the nose bridge (continuous arch).
    const brow = (x: number) => {
      const u = (Math.abs(x) - 4.2) / 3.4
      return 65.6 + Y + 1.6 * (1 - u * u)
    }
    d.curve(-7.3, -0.9, brow, -2)
    d.curve(0.9, 7.3, brow, -2)
    // Downcast eyes.
    d.curve(-6.2, -2.1, (x) => 63.1 + Y - 0.09 * (x + 4.2) * (x + 4.2), -3)
    d.curve(2.1, 6.2, (x) => 63.1 + Y - 0.09 * (x - 4.2) * (x - 4.2), -3)
    // Nose: shadow on the far side, highlight on the lit bridge.
    d.line(0.7, 65 + Y, 0.7, 60.4 + Y, -1)
    d.line(-0.4, 64.5 + Y, -0.4, 61.5 + Y, 1)
    const [ni, nj] = d.px(1.5, 59.9 + Y)
    d.add(ni, nj, -2)
    const [mi, mj] = d.px(-1.3, 59.9 + Y)
    d.add(mi, mj, -1)
    // Gentle smile.
    d.line(-2.2, 57.4 + Y, 2.2, 57.4 + Y, -2)
    d.line(-2.9, 58 + Y, -2.2, 57.4 + Y, -1)
    d.line(2.2, 57.4 + Y, 2.9, 58 + Y, -1)
    if (fine) d.line(-1, 56.2 + Y, 1, 56.2 + Y, 1)
    // Neck folds.
    const nk = lanna ? -0.8 : 0
    d.curve(-3.7, 3.7, (x) => 47.6 + nk + 0.03 * x * x, -1)
    if (fine) d.curve(-3.2, 3.2, (x) => 45.8 + nk + 0.03 * x * x, -1)
    // Robe edge across the chest leaving the right shoulder bare.
    const robe = (x: number) => 30.5 + ((x + 14) / 19.5) * 15 - 0.02 * (x + 4) * (x + 4)
    d.curve(-14, 5.2, robe, -2)
    d.curve(-13.5, 4.8, (x) => robe(x) - 1 / s, 1)
    // Sash (สังฆาฏิ) over the left shoulder with a fishtail end.
    const sx0 = lanna ? 5 : 4.4
    const sx1 = lanna ? 10 : 9.2
    const send = lanna ? 29 : 20.5
    d.each((i, j, lx, ly, part) => {
      if (part !== 2 || lx < sx0 || lx > sx1 || ly < send || ly > 45.5) return
      d.add(i, j, 1)
    })
    d.line(sx0, 45.5, sx0, send, -2)
    d.line(sx1, 44.5, sx1, send, -1)
    const mid = (sx0 + sx1) / 2
    d.line(sx0, send, sx0 + 1.2, send - 1.6, -2)
    d.line(sx0 + 1.2, send - 1.6, mid, send, -2)
    d.line(mid, send, sx1 - 1.2, send - 1.6, -2)
    d.line(sx1 - 1.2, send - 1.6, sx1, send, -2)
    if (fine) d.line(mid, 44, mid, send + 1, -1)
    // Waistband and navel.
    d.curve(-10.5, 3.8, (x) => 16.4 + 0.012 * x * x, -1)
    const [vi, vj] = d.px(-0.2, 21.5)
    d.add(vi, vj, -2)
    // Robe hem over the shin and the upturned sole of the right foot.
    d.line(9.8, 14.3, 13.2, 8, -2)
    d.each((i, j, _lx, ly, part) => {
      if (part === 10 && ly > 12.2) d.add(i, j, 1)
    })
    for (let k = 0; k < 3; k++) {
      const [ti, tj] = d.px(23.4 - k * 0.1, 13.2 - k * 1.3)
      d.add(ti, tj, -2)
    }
    // Fingers of the earth-touching hand.
    d.line(-29.5, 7.6, -29.8, 3.6, -1)
    d.line(-27.4, 8.2, -27.6, 3, -1)
    // Fingers of the hand resting in the lap.
    d.line(-2.4, 14.3, 2.8, 14.9, -1)
    // Finial highlight.
    if (!lanna) d.line(-0.6, 89.5, -0.6, 76.5, 1)
    else {
      d.line(-0.8, 80.5, -0.8, 75.5, 1)
      d.curve(-3, 3, (x) => 74.3 + 0.08 * x * x, -1)
    }
  }
}

const buddhaCache = new Map<string, Sculpted>()

/** The principal Buddha image, seated in the posture of subduing Mara. */
export function buddhaSculpt(style: BuddhaStyle, s: number): Sculpted {
  const q = Math.round(s * 40) / 40
  const key = `${style}:${q}`
  let r = buddhaCache.get(key)
  if (!r) {
    r = sculpt({
      prims: buddhaPrims(style),
      s: q,
      x0: -38,
      x1: 38,
      y0: -1,
      y1: 96,
      ramps: [style === 'antique' ? ANTIQUE_RAMP : style === 'lanna' ? LANNA_RAMP : GOLD_RAMP],
      rim: 0.34,
      spec: [14, 0.55],
      detail: buddhaDetail(style),
    })
    buddhaCache.set(key, r)
  }
  return r
}

/** Draw the Buddha with its seat (lap bottom) centred on (cx, seatY). */
export function drawBuddhaHD(g: Surface, cx: number, seatY: number, s: number, style: BuddhaStyle = 'sukhothai') {
  const b = buddhaSculpt(style, s)
  g.draw(b.canvas, Math.round(cx) - b.ox, Math.round(seatY) - b.oy)
}

// ---------------------------------------------------------------------------
// Lighting: every material colour is lit in 10 quantised levels that lean
// toward a warm plum shadow or a warm candle highlight (6 = as authored).

const SHADOW = '#1a0b13'
const HILITE = '#ffe7b3'
const litHex = new Map<string, string>()

export function lit(hex: string, lvl: number): string {
  const l = lvl < 0 ? 0 : lvl > 9 ? 9 : lvl | 0
  const key = hex + l
  let v = litHex.get(key)
  if (!v) {
    v = l < 6 ? mix(hex, SHADOW, ((6 - l) / 6) * 0.92) : l > 6 ? mix(hex, HILITE, (l - 6) * 0.15) : hex
    litHex.set(key, v)
  }
  return v
}
const litRows = new Map<string, Uint32Array>()
function litInt(hex: string, lvl: number): number {
  const l = lvl < 0 ? 0 : lvl > 9 ? 9 : lvl | 0
  let row = litRows.get(hex)
  if (!row) {
    row = new Uint32Array(10)
    for (let i = 0; i < 10; i++) row[i] = cint(lit(hex, i))
    litRows.set(hex, row)
  }
  return row[l]
}

/** Visit the pixel runs inside a polygon, row by row (scanline). */
function polyRows(poly: [number, number][], w: number, h: number, fn: (y: number, x0: number, x1: number) => void) {
  let y0 = Infinity
  let y1 = -Infinity
  for (const [, y] of poly) {
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) {
    const sy = y + 0.5
    const xs: number[] = []
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i]
      const [bx, by] = poly[(i + 1) % poly.length]
      if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(0, Math.round(xs[i]))
      const b = Math.min(w, Math.round(xs[i + 1]))
      if (b > a) fn(y, a, b)
    }
  }
}
/** Lit colour for a light value (1 = authored) with ordered dithering. */
const shadeAt = (hex: string, light: number, x: number, y: number) => litInt(hex, Math.round(light * 6 + dth(x, y) * 0.6))

// Soft additive glow: a small cached radial gradient scaled up with
// nearest-neighbour sampling, so it posterises into crisp pixel rings.
const glowCanvases = new Map<string, HTMLCanvasElement>()
function glowCanvas(color: string): HTMLCanvasElement {
  let c = glowCanvases.get(color)
  if (!c) {
    const n = 48
    c = createCanvas(n, n)
    const ctx = c.getContext('2d')!
    const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]
    const grad = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
    grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
    grad.addColorStop(0.22, `rgba(${r},${g},${b},0.55)`)
    grad.addColorStop(0.55, `rgba(${r},${g},${b},0.16)`)
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, n, n)
    glowCanvases.set(color, c)
  }
  return c
}

/** Additive soft glow of radius r; strength is the peak opacity (0..1+). */
export function softGlow(g: Surface, x: number, y: number, r: number, strength: number, color = '#ffcf7a') {
  if (strength <= 0.01 || r < 1) return
  const c = glowCanvas(color)
  const R = Math.round(r)
  const ctx = g.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(1, strength)
  ctx.drawImage(c, Math.round(x - R - g.ox), Math.round(y - R - g.oy), R * 2, R * 2)
  if (strength > 1) {
    ctx.globalAlpha = Math.min(1, strength - 1)
    ctx.drawImage(c, Math.round(x - R - g.ox), Math.round(y - R - g.oy), R * 2, R * 2)
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Layout

export type HallTemple = 'wat' | 'river' | 'mountain' | 'home' | 'shrine'

export interface FlameSpot {
  x: number
  y: number
  /** 0 = tiny votive, 1 = altar candle, 2 = tall floor candle, 3 = lantern. */
  size: number
  /** Order in which the lights come on during the entrance (0..1). */
  order: number
}

export interface HallLayout {
  temple: HallTemple
  w: number
  h: number
  /** Art scale (1 ≈ a 200 px wide phone in portrait). */
  s: number
  cx: number
  /** Eye level (vanishing point). */
  vpY: number
  /** Floor line of the back wall (depth factor k = 1). */
  backY: number
  /** Ceiling line of the back wall. */
  ceilY: number
  /** Half width of the back wall. */
  halfBack: number
  /** Focal depth: world depth of the back wall. */
  F: number
  /** Seat of the principal Buddha (bottom of the crossed legs). */
  seatY: number
  /** Centre of the Buddha's head, for the halo. */
  headX: number
  headY: number
  haloR: number
  /** Heart of the image: where offerings of light fly to. */
  heartY: number
  /** Front edge of the altar set on the floor. */
  altarY: number
  flames: FlameSpot[]
  incense: { x: number; y: number }[]
  /** Player bottom-centre (knees on the floor). */
  playerX: number
  playerY: number
  worshippers: { x: number; y: number }[]
  monk: { x: number; y: number } | null
  safeTop: number
  safeBottom: number
  /** Light shafts (screen-space quads) for dust motes. */
  shafts: [number, number][][]
  /** Pillars as depth factors (drawn back to front). */
  pillarsK: number[]
  pillarX: number
  /** Side-wall windows: centre depth and half length (world units). */
  windows: { z: number; half: number }[]
  /** Shimmering water-light streaks (river hall). */
  ripples: { x: number; y: number; w: number }[]
  /** Twinkling string-light bulbs (shrine). */
  bulbs: { x: number; y: number; c: string }[]
}

export interface SafeArea {
  /** Fraction of the height kept calm at the top (default 0.12). */
  top?: number
  /** Fraction of the height kept calm at the bottom (default 0.35). */
  bottom?: number
  /** Where the player kneels inside the bottom zone, 0 = its top edge (default 0.55). */
  player?: number
}

/** Floor y at depth factor k. */
export const floorAt = (L: HallLayout, k: number) => L.vpY + (L.backY - L.vpY) * k
/** Ceiling y at depth factor k. */
export const ceilAt = (L: HallLayout, k: number) => L.vpY - (L.vpY - L.ceilY) * k

export function hallLayout(temple: HallTemple, w: number, h: number, safe: SafeArea = {}): HallLayout {
  const top = Math.round(h * (safe.top ?? 0.12))
  const bot = Math.round(h * (1 - (safe.bottom ?? 0.35)))
  const band = Math.max(40, bot - top)
  const home = temple === 'home'
  let s = Math.min(band / (home ? 150 : 205), w / (home ? 150 : 165))
  s = Math.max(0.5, Math.min(2.2, s))
  s = Math.round(s * 40) / 40
  const cx = Math.round(w / 2)
  // Vertical group: arch apex (seat - up) to altar front (seat + down).
  const up = home ? 64 : 122
  const down = home ? 62 : 71
  const seatY = Math.round(top + (band - (up + down) * s) / 2 + up * s)
  const backY = Math.round(seatY + (home ? 62 : 47) * s)
  const vpY = Math.round(seatY - (home ? 6 : 14) * s)
  const ceilY = Math.round(seatY - (home ? 150 : 134) * s)
  const halfBack = home ? Math.round(120 * s) : Math.max(Math.round(66 * s), Math.round(w * 0.36))
  const L: HallLayout = {
    temple,
    w,
    h,
    s,
    cx,
    vpY,
    backY,
    ceilY,
    halfBack,
    F: 300 * s,
    seatY,
    headX: cx,
    headY: Math.round(seatY - (home ? 28 : 56) * s),
    haloR: Math.round((home ? 18 : 30) * s),
    heartY: Math.round(seatY - (home ? 16 : 32) * s),
    altarY: Math.round(backY + (home ? 0 : 24) * s),
    flames: [],
    incense: [],
    playerX: cx,
    playerY: Math.round(bot + (h - bot) * (safe.player ?? 0.55)),
    worshippers: [],
    monk: null,
    safeTop: top,
    safeBottom: h - bot,
    shafts: [],
    pillarsK: [],
    pillarX: Math.round((halfBack / s) * 0.76),
    windows: [],
    ripples: [],
    bulbs: [],
  }
  if (!home) {
    // Pillars evenly spaced in depth; the first pair stands at the back
    // corners, the next frames the screen edges.
    const kEdge = Math.max(1.5, (w / 2 - 3) / (L.pillarX * s))
    const z1 = 1 / 1.3
    const dz = z1 - 1 / kEdge
    for (let i = 0; i < 6; i++) {
      const z = z1 - dz * i
      if (z <= 0.2) break
      L.pillarsK.push(1 / z)
    }
    const zs = [1, ...L.pillarsK.map((k) => 1 / k)]
    for (let i = 0; i + 1 < zs.length; i++) L.windows.push({ z: ((zs[i] + zs[i + 1]) / 2) * L.F, half: (zs[i] - zs[i + 1]) * 0.3 * L.F })
    const kw = 1.8
    const wy = Math.round(floorAt(L, kw))
    L.worshippers = [
      { x: Math.round(cx - Math.max(27 * s * kw, w * 0.2)), y: wy },
      { x: Math.round(cx + Math.max(27 * s * kw, w * 0.2)), y: wy },
    ]
  }
  return L
}

// ---------------------------------------------------------------------------
// Room shader: ceiling, back wall, side walls and floor in one-point
// perspective. Coordinates handed to the surface functions are in world
// units (= pixels at the back wall):
//  - floor/ceiling: X lateral from the centre line, Z depth from the camera,
//  - back wall: u lateral, v height above the floor,
//  - side walls: Z depth, v height, dir -1 left / +1 right.

interface RoomSurfaces {
  ceiling(X: number, Z: number, k: number, x: number, y: number): number
  back(u: number, v: number, x: number, y: number): number
  side(Z: number, v: number, dir: number, k: number, x: number, y: number): number
  floor(X: number, Z: number, k: number, x: number, y: number): number
}

function shadeRoom(L: HallLayout, S: RoomSurfaces): PixBuf {
  const buf = new PixBuf(L.w, L.h)
  const E = L.backY - L.vpY
  const Cc = L.vpY - L.ceilY
  for (let y = 0; y < L.h; y++) {
    const py = y + 0.5
    const kf = py > L.vpY ? (py - L.vpY) / E : 0
    const kc = py < L.vpY ? (L.vpY - py) / Cc : 0
    for (let x = 0; x < L.w; x++) {
      const px = x + 0.5
      const kx = Math.abs(px - L.cx) / L.halfBack
      let c: number
      if (kf <= 1 && kc <= 1 && kx <= 1) c = S.back(px - L.cx, L.backY - py, x, y)
      else if (kx >= kf && kx >= kc) c = S.side(L.F / kx, E - (py - L.vpY) / kx, px < L.cx ? -1 : 1, kx, x, y)
      else if (kf >= kc) c = S.floor((px - L.cx) / kf, L.F / kf, kf, x, y)
      else c = S.ceiling((px - L.cx) / kc, L.F / kc, kc, x, y)
      buf.data[y * L.w + x] = c
    }
  }
  return buf
}

/** Cheap integer hash → 0..1. */
function hash2(a: number, b: number): number {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fract = (v: number) => v - Math.floor(v)

// Thai mural helpers (in wall units). -------------------------------------

/** Rows of seated celestial beings (เทพชุมนุม) facing the Buddha. */
function devaRow(u: number, v: number, v0: number, v1: number, cell: number, pal: MuralPal): string | null {
  const hgt = v1 - v0
  const cu = fract(u / cell)
  const cv = (v - v0) / hgt
  const idx = Math.floor(u / cell)
  // Halo.
  const hx = (cu - 0.5) * cell
  const hy = (cv - 0.66) * hgt
  const hr = Math.hypot(hx, hy * 1.05)
  if (cv > 0.1 && cv < 0.96) {
    // Crown spire.
    if (cv > 0.74 && cv < 0.97 && Math.abs(cu - 0.5) * cell < (0.97 - cv) * hgt * 0.22 + 0.3) return pal.gold
    // Head.
    if (Math.hypot(hx, (cv - 0.64) * hgt) < hgt * 0.11) return pal.skin
    // Body (seated, hands in wai).
    const bw = (0.46 - (cv - 0.1) * 0.5) * cell
    if (cv < 0.54 && Math.abs(hx) < bw) {
      if (cv > 0.36 && cv < 0.47 && Math.abs(hx) < cell * 0.07) return pal.skin
      return pal.robes[idx % pal.robes.length]
    }
    if (hr < hgt * 0.24 && hr > hgt * 0.18) return pal.goldD
  }
  // Scattered gold flowers on the dark ground.
  if (hash2(Math.floor(u * 0.9), Math.floor(v * 0.9)) > 0.93) return pal.goldD
  return null
}

/** Zigzag border (สามเหลี่ยมฟันปลา). */
function zigzag(u: number, v: number, v0: number, hgt: number, period: number): 0 | 1 | 2 {
  const t = (v - v0) / hgt
  if (t < 0 || t > 1) return 0
  const tri = Math.abs(fract(u / period) - 0.5) * 2
  return t < tri ? 1 : 2
}

interface MuralPal {
  gold: string
  goldD: string
  skin: string
  robes: string[]
}

// ---------------------------------------------------------------------------
// WAT — the classic central-Thai ubosot.

const WAT = {
  lacquer: '#8a1e2c',
  lacquerD: '#5e1220',
  wall: '#7a1a28',
  wallD: '#4e0e1a',
  mural: '#3a0e18',
  cream: '#e6cf9a',
  gold: '#e3a843',
  goldD: '#a8661e',
  goldL: '#ffe08a',
  floorA: '#6d3a2e',
  floorB: '#65342a',
  grout: '#40201a',
  carpet: '#9c1e2e',
  carpetD: '#5c0c18',
  sky: '#fff1c8',
}

const WAT_MURAL: MuralPal = { gold: '#e8b44a', goldD: '#9a6424', skin: '#f2d6a2', robes: ['#3f7d5f', '#c0453f', '#e9e1c8', '#4f6fa8'] }

function watSurfaces(L: HallLayout): RoomSurfaces {
  const s = L.s
  const cx = L.cx
  const glowY = L.seatY
  const sig = 90 * s
  const wallH = L.backY - L.ceilY
  const kAltar = (L.altarY - L.vpY) / (L.backY - L.vpY)
  const zAltar = L.F / kAltar
  const glow = (x: number, y: number) => Math.exp(-((x - cx) * (x - cx) + (y - glowY) * (y - glowY) * 0.7) / (2 * sig * sig))
  const vig = (x: number, y: number) => {
    const dx = (x - cx) / (L.w / 2)
    const dyB = Math.max(0, (y - L.backY) / Math.max(1, L.h - L.backY))
    const dyT = Math.max(0, (L.ceilY + 10 * s - y) / Math.max(1, L.ceilY + 10 * s))
    return 1 - 0.28 * dx * dx - 0.32 * dyB * dyB - 0.25 * dyT
  }
  // The windows sit high on the side walls between the pillar bays.
  const winV0 = 64 * s
  const winV1 = 116 * s
  const wallPattern = (u: number, v: number, x: number, y: number, lightK: number) => {
    // Top frieze.
    const vt = wallH - v
    if (vt < 2 * s) return shadeAt(WAT.goldD, lightK * 0.8, x, y)
    if (vt < 9 * s) {
      // Hanging gold leaves (กระจัง).
      const tri = Math.abs(fract(u / (6 * s)) - 0.5) * 2
      const t = (vt - 2 * s) / (7 * s)
      return t < 1 - tri * 0.9 ? shadeAt(WAT.gold, lightK, x, y) : shadeAt(WAT.wallD, lightK, x, y)
    }
    if (vt < 11 * s) return shadeAt(WAT.gold, lightK * 0.9, x, y)
    // Celestial rows.
    const r0 = wallH - 11 * s - 26 * s
    if (v > r0) {
      const c = devaRow(u, v, r0 + 1 * s, wallH - 11 * s, 11 * s, WAT_MURAL)
      return shadeAt(c ?? WAT.mural, lightK, x, y)
    }
    const z = zigzag(u, v, r0 - 5 * s, 5 * s, 6 * s)
    if (z) return shadeAt(z === 1 ? WAT.gold : WAT.lacquerD, lightK, x, y)
    const r1 = r0 - 5 * s - 24 * s
    if (v > r1) {
      const c = devaRow(u + 5 * s, v, r1 + 1 * s, r0 - 5 * s, 11 * s, WAT_MURAL)
      return shadeAt(c ?? WAT.mural, lightK * 0.95, x, y)
    }
    const z2 = zigzag(u + 3 * s, v, r1 - 5 * s, 5 * s, 6 * s)
    if (z2) return shadeAt(z2 === 1 ? WAT.gold : WAT.lacquerD, lightK, x, y)
    // Lower wall: red lacquer with a gold stencilled lattice (ลายรดน้ำ).
    if (v < 3 * s) return shadeAt(WAT.wallD, lightK * 0.7, x, y)
    const gu = u / (9 * s)
    const gv = v / (11 * s)
    const du = Math.abs(fract(gu + (Math.floor(gv) % 2) * 0.5) - 0.5)
    const dv = Math.abs(fract(gv) - 0.5)
    const dd = du + dv
    if (dd < 0.13) return shadeAt(WAT.gold, lightK * 0.85, x, y)
    if (dd > 0.44 && dd < 0.5) return shadeAt(WAT.goldD, lightK * 0.8, x, y)
    return shadeAt(WAT.wall, lightK, x, y)
  }
  return {
    ceiling(X, Z, k, x, y) {
      const light = (0.62 + 0.25 * glow(x, y)) * vig(x, y) - (k - 1) * 0.08
      const cs = 22 * s
      const fx = fract(X / cs + 0.5)
      const fz = fract(Z / cs)
      const bx = Math.min(fx, 1 - fx) * cs
      const bz = Math.min(fz, 1 - fz) * cs
      const beam = Math.min(bx, bz)
      if (beam < 1.6 * s) return shadeAt(WAT.gold, light * 0.8, x, y)
      if (beam < 4 * s) return shadeAt(WAT.lacquerD, light, x, y)
      // Coffer with a gold star (ดาวเพดาน).
      const ux = (fx - 0.5) * cs
      const uz = (fz - 0.5) * cs
      const ax = Math.abs(ux)
      const az = Math.abs(uz)
      const r = Math.hypot(ux, uz)
      const star = r < 1.8 * s || (ax < 0.9 * s && az < 5.2 * s) || (az < 0.9 * s && ax < 5.2 * s) || (Math.abs(ax - az) < 0.8 * s && r < 4 * s)
      if (star) return shadeAt(r < 1.2 * s ? WAT.goldL : WAT.gold, light * 1.1, x, y)
      if (beam < 5 * s) return shadeAt(WAT.goldD, light * 0.75, x, y)
      return shadeAt(WAT.lacquer, light * 0.85, x, y)
    },
    back(u, v, x, y) {
      const light = (0.7 + 0.35 * glow(x, y)) * vig(x, y)
      return wallPattern(u, v, x, y, light)
    },
    side(Z, v, dir, k, x, y) {
      const light = (0.64 + 0.2 * glow(x, y)) * vig(x, y) - (k - 1) * 0.1 + (dir < 0 ? 0.05 : 0)
      for (const { z: wz, half: winHalf } of L.windows) {
        if (Math.abs(Z - wz) < winHalf && v > winV0 && v < winV1) {
          const edge = Math.min(winHalf - Math.abs(Z - wz), v - winV0, winV1 - v)
          if (edge < 1.8 * s / k) return shadeAt(WAT.gold, 1.05, x, y)
          // Open window: bright garden light with a hint of leaves.
          const leaf = hash2(Math.floor(Z / 3), Math.floor(v / 3)) > 0.72 && v < winV0 + (winV1 - winV0) * 0.45
          return shadeAt(leaf ? '#cfe3a6' : WAT.sky, 1.15, x, y)
        }
        // Open shutters painted with gold on red.
        if (Math.abs(Z - wz) < winHalf * 1.8 && Math.abs(Z - wz) >= winHalf && v > winV0 && v < winV1) {
          const inner = Math.abs(Z - wz) - winHalf
          if (inner < 1.2 * s || inner > winHalf * 0.8 - 1.2 * s) return shadeAt(WAT.gold, light, x, y)
          return shadeAt(WAT.lacquer, light * 1.05, x, y)
        }
      }
      return wallPattern(Z * 0.55, v, x, y, light)
    },
    floor(X, Z, k, x, y) {
      const light = (0.7 + 0.45 * glow(x, y)) * vig(x, y)
      const cw = 17 * s
      if (Math.abs(X) < cw && Z < zAltar) {
        const ax = Math.abs(X)
        if (ax > cw - 1.4 * s) return shadeAt(WAT.carpetD, light, x, y)
        if (ax > cw - 3.4 * s && ax < cw - 2 * s) return shadeAt(WAT.gold, light * 0.95, x, y)
        const pz = fract(Z / (16 * s))
        const dmd = Math.abs(ax - (ax < 5 * s ? 0 : 9 * s)) / (3 * s) + Math.abs(pz - 0.5) * 2.2
        if (ax < 12 * s && dmd < 0.55) return shadeAt(WAT.gold, light * 0.85, x, y)
        const pile = ((x + y) & 1) === 0 ? 1 : 0.96
        return shadeAt(WAT.carpet, light * pile * 0.9, x, y)
      }
      const ts = 20 * s
      const fx = fract(X / ts + 0.5)
      const fz = fract(Z / ts)
      const gx = Math.min(fx, 1 - fx) * ts * k
      const gz = Math.min(fz, 1 - fz) * ts * k * 0.25
      if (gx < 0.55 || gz < 0.5) return shadeAt(WAT.grout, light, x, y)
      const alt = (Math.floor(X / ts + 0.5) + Math.floor(Z / ts)) & 1
      const sheen = 0.06 * Math.sin((X + Z) * 0.08)
      return shadeAt(alt ? WAT.floorA : WAT.floorB, light + sheen, x, y)
    },
  }
}

// Architecture ------------------------------------------------------------

const G = GOLD_RAMP

/** A lacquered pillar with gold stencil work, lotus capital and base. */
function drawPillar(g: Surface, L: HallLayout, X: number, k: number, pal: PillarPal) {
  const s = L.s
  const cxp = L.cx + X * s * k
  const wp = Math.max(3, Math.round(10 * s * k))
  const x0 = Math.round(cxp - wp / 2)
  const top = Math.floor(ceilAt(L, k))
  const bot = Math.ceil(floorAt(L, k))
  const toCentre = X < 0 ? 1 : -1
  // Faces: inner (toward the Buddha) lit, front mid, outer dark.
  const f1 = Math.max(1, Math.round(wp * 0.28))
  const f2 = wp - f1 * 2
  const lightIn = 1.08
  const lightMid = 0.9
  const lightOut = 0.6
  const faces: [number, number, number][] =
    toCentre > 0
      ? [
          [x0, f1, lightOut],
          [x0 + f1, f2, lightMid],
          [x0 + f1 + f2, f1, lightIn],
        ]
      : [
          [x0, f1, lightIn],
          [x0 + f1, f2, lightMid],
          [x0 + f1 + f2, f1, lightOut],
        ]
  const y0 = Math.max(top, -2)
  for (const [fx, fw, li] of faces) {
    for (let y = y0; y < bot; y++) {
      const depthDark = 1 - Math.max(0, (y - L.backY) / (L.h * 1.2)) * 0.5
      g.rect(fx, y, fw, 1, lit(pal.body, Math.round((li * depthDark) * 6 + dth(fx, y))))
    }
  }
  if (pal.style === 'teak') {
    // Round teak post: wood grain and tri-colour cloth (ผ้าสามสี) tied round it.
    for (let y = y0; y < bot; y += Math.max(3, Math.round(7 * s * k))) g.px(x0 + f1 + ((y * 7) % Math.max(1, f2)), y, lit(pal.body, 3))
    const cy = Math.round(bot - (bot - L.vpY) * 0.62)
    const bh = Math.max(3, Math.round(3 * s * k))
    ;['#e8709e', '#ffd23f', '#6cc36a'].forEach((c, i) => {
      for (const [fx, fw, li] of faces) g.rect(fx, cy + i * bh, fw, bh, lit(c, Math.round(li * 6)))
    })
    g.rect(x0 - 1, cy + bh * 3, 2, Math.round(9 * s * k), lit('#e8709e', 5))
    g.rect(x0 + wp - 1, cy + bh * 3, 1, Math.round(6 * s * k), lit('#6cc36a', 5))
    g.rect(x0 - 1, bot - 2, wp + 2, 2, lit(pal.body, 2))
    g.rect(x0 - 1, y0, 1, bot - y0, pal.line)
    g.rect(x0 + wp, y0, 1, bot - y0, pal.line)
    return
  }
  if (pal.style === 'lanna') {
    // Black lacquer bands with gold stencil near the foot and the head.
    for (const [by0, bh0] of [
      [bot - Math.round(52 * s * k), Math.round(20 * s * k)],
      [Math.max(y0, top + Math.round(18 * s * k)), Math.round(16 * s * k)],
    ]) {
      for (const [fx, fw, li] of faces) g.rect(fx, by0, fw, bh0, lit('#1c1414', Math.round(li * 6)))
      for (let y = by0 + 1; y < by0 + bh0 - 1; y++)
        for (let x = x0; x < x0 + wp; x++) if ((x * 3 + y * 5) % 7 === 0 || (y - by0) % Math.max(4, Math.round(6 * s * k)) === 0) g.px(x, y, lit(pal.gold, 5))
    }
  }
  // Stencil motifs on the front face.
  const step = Math.max(6, Math.round(15 * s * k))
  const mx = x0 + f1 + Math.floor(f2 / 2)
  const dr = Math.max(1, Math.round(2.2 * s * k))
  for (let y = bot - Math.round(34 * s * k) - step; y > y0 - step; y -= step) {
    for (let d = -dr; d <= dr; d++) {
      const hw = dr - Math.abs(d)
      g.rect(mx - hw, y + d, hw * 2 + 1, 1, lit(pal.gold, 5))
    }
    g.px(mx, y, lit(pal.body, 4))
    if (f2 >= 7) {
      g.px(mx - dr - 1, y + Math.round(step / 2), lit(pal.gold, 4))
      g.px(mx + dr + 1, y + Math.round(step / 2), lit(pal.gold, 4))
    }
  }
  // Gold edge lines on the front face.
  if (f2 >= 5) {
    g.rect(x0 + f1 + 1, y0, 1, bot - y0, lit(pal.gold, 5))
    g.rect(x0 + f1 + f2 - 2, y0, 1, bot - y0, lit(pal.gold, 4))
  }
  // Base: tall gold leaves (กาบพรหมศร).
  const bh = Math.round(30 * s * k)
  const by = bot - bh
  for (let y = by; y < bot; y++) {
    const t = (y - by) / bh
    for (let x = x0; x < x0 + wp; x++) {
      const u = ((x - x0 + 0.5) / wp) * 3
      const tri = Math.abs(fract(u) - 0.5) * 2
      const inLeaf = t > tri * 0.9
      const face = x < x0 + f1 ? faces[0][2] : x < x0 + f1 + f2 ? faces[1][2] : faces[2][2]
      if (inLeaf) {
        const edge = t - tri * 0.9 < 0.08
        g.px(x, y, lit(edge ? pal.goldD : pal.gold, Math.round(face * 6 + dth(x, y))))
      }
    }
  }
  g.rect(x0 - 1, bot - Math.max(2, Math.round(3 * s * k)), wp + 2, Math.max(2, Math.round(3 * s * k)), lit(pal.goldD, 4))
  g.rect(x0 - 1, bot - 1, wp + 2, 1, lit(pal.body, 2))
  // Lotus capital (บัวหัวเสา) under the ceiling.
  if (top > -30 * s * k) {
    const ch = Math.round(14 * s * k)
    for (let y = top; y < top + ch; y++) {
      const t = (y - top) / ch
      const flare = Math.round((1 - t) * 3 * s * k)
      for (let x = x0 - flare; x < x0 + wp + flare; x++) {
        const u = ((x - x0 + flare + 0.5) / (wp + flare * 2)) * 4
        const tri = Math.abs(fract(u) - 0.5) * 2
        const pet = 1 - t > tri * 0.85
        const li = x < x0 + f1 ? faces[0][2] : x < x0 + f1 + f2 ? faces[1][2] : faces[2][2]
        g.px(x, y, lit(pet ? pal.gold : pal.goldD, Math.round(li * 6 + dth(x, y))))
      }
    }
    g.rect(x0 - 1, top + ch, wp + 2, Math.max(1, Math.round(2 * s * k)), lit(pal.gold, 7))
  }
  // Clean outline.
  g.rect(x0 - 1, y0, 1, bot - y0, pal.line)
  g.rect(x0 + wp, y0, 1, bot - y0, pal.line)
}

interface PillarPal {
  body: string
  gold: string
  goldD: string
  line: string
  style?: 'lacquer' | 'teak' | 'lanna'
}

/** Golden flame-edged arch (ซุ้มเรือนแก้ว) around the principal image. */
const archCache = new Map<string, { c: HTMLCanvasElement; dx: number; dy: number }>()
function drawRuenKaew(g: Surface, cx: number, seatY: number, s: number, ramp: readonly string[], inner: string | null) {
  const key = s + ramp[5] + inner
  let a = archCache.get(key)
  if (!a) {
    const tmp = new Surface(Math.ceil(140 * s + 40), Math.ceil(160 * s + 20))
    const ox = Math.round(tmp.w / 2)
    const oy = Math.round(135 * s + 4)
    rasterRuenKaew(tmp, ox, oy, s, ramp, inner)
    a = { c: tmp.canvas, dx: ox, dy: oy }
    archCache.set(key, a)
  }
  g.draw(a.c, Math.round(cx) - a.dx, Math.round(seatY) - a.dy)
}

function rasterRuenKaew(g: Surface, cx: number, seatY: number, s: number, ramp: readonly string[], inner: string | null) {
  const A = 44 * s
  const Hs = 60 * s
  const Ha = 110 * s
  const T = Math.max(3, 5.5 * s)
  // Inner edge polyline (left half, from the base up to the apex).
  const pts: [number, number][] = []
  const base = 20 * s
  for (let y = -base; y < Hs; y += 1) pts.push([-A, y])
  for (let i = 0; i <= 60; i++) {
    const t = i / 60
    const u = 1 - t
    const bx = u * u * u * -A + 3 * u * u * t * -A + 3 * u * t * t * (-12 * s) + t * t * t * 0
    const by = u * u * u * Hs + 3 * u * u * t * (Hs + 36 * s) + 3 * u * t * t * (Ha - 12 * s) + t * t * t * Ha
    pts.push([bx, by])
  }
  // Arc length for flame spacing.
  const acc: number[] = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const flameGap = 7.5 * s
  const flameLen = 7 * s
  const flameW = 3.4 * s
  const x0 = Math.floor(cx - A - T - flameLen - 3)
  const x1 = Math.ceil(cx + A + T + flameLen + 3)
  const yTop = Math.floor(seatY - Ha - T - 20 * s)
  const yBot = Math.ceil(seatY + base)
  const w = x1 - x0
  const h = yBot - yTop
  const buf = new PixBuf(w, h)
  const tone = new Int8Array(w * h).fill(-1)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const lx0 = x0 + i + 0.5 - cx
      const ly = seatY - (yTop + j + 0.5)
      const lx = -Math.abs(lx0)
      // Coarse early-out far from the band (and its flames).
      let coarse = 1e9
      for (let q = 0; q < pts.length; q += 6) {
        const ddx = lx - pts[q][0]
        const ddy = ly - pts[q][1]
        coarse = Math.min(coarse, ddx * ddx + ddy * ddy)
      }
      const reach = T + flameLen + 7 * s
      if (coarse > reach * reach && !(ly > Ha && Math.abs(lx0) < 6 * s)) continue
      // Nearest point on the polyline.
      let best = 1e9
      let bi = 0
      let bt = 0
      for (let q = 0; q < pts.length - 1; q++) {
        const [ax, ay] = pts[q]
        const [bx, by] = pts[q + 1]
        const vx = bx - ax
        const vy = by - ay
        const vv = vx * vx + vy * vy || 1
        let t = ((lx - ax) * vx + (ly - ay) * vy) / vv
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const dx = lx - (ax + vx * t)
        const dy = ly - (ay + vy * t)
        const d2 = dx * dx + dy * dy
        if (d2 < best) {
          best = d2
          bi = q
          bt = t
        }
      }
      const [ax, ay] = pts[bi]
      const [bx, by] = pts[bi + 1]
      const tx = bx - ax
      const ty = by - ay
      const tl = Math.hypot(tx, ty) || 1
      // Outward normal (away from the image) for the left half.
      const nx = -ty / tl
      const ny = tx / tl
      const qx = ax + tx * bt
      const qy = ay + ty * bt
      const d = (lx - qx) * nx + (ly - qy) * ny
      const along = acc[bi] + tl * bt
      const k = j * w + i
      if (ly > Ha && Math.abs(lx0) < 0.5) {
        // fallthrough to the finial below
      }
      if (d >= 0 && d < T) {
        // Bevelled band: dark inner line, bright bead, gold body, outline.
        const f = d / T
        let t: number
        if (d < 1) t = 1
        else if (d < 2) t = 7
        else if (f > 0.82) t = 2
        else {
          const lightDir = nx * -0.55 + ny * 0.8
          t = Math.round(4.6 + lightDir * 1.4 + (0.5 - Math.abs(f - 0.55)) * 2 + dth(i, j) * 0.8)
        }
        // Little jewels along the band.
        if (d > 2 && f < 0.8 && Math.abs(fract(along / (6 * s)) - 0.5) < 0.12 / s) t = 8
        tone[k] = Math.max(1, Math.min(8, t))
      } else if (d >= T && d < T + flameLen && ly > -base * 0.2) {
        // Flame tongues (ลายเปลว) curling toward the apex.
        const n = d - T
        const idx = Math.round(along / flameGap)
        const ta = along - idx * flameGap + n * n * 0.09 / s
        const fw = flameW * Math.pow(1 - n / flameLen, 0.7)
        if (Math.abs(ta) < fw / 2) {
          const edge = fw / 2 - Math.abs(ta) < 0.9
          tone[k] = edge ? 3 : ta < 0 ? 6 : 5
        }
      } else if (d < 0 && inner) {
        tone[k] = -2
      }
    }
  }
  // Finial flame at the apex.
  const fh = 20 * s
  for (let j = 0; j < h; j++) {
    const ly = seatY - (yTop + j + 0.5)
    const n = ly - (Ha + T * 0.6)
    if (n < 0 || n > fh) continue
    const half = 3.4 * s * Math.pow(1 - n / fh, 0.8) + 0.4
    for (let i = 0; i < w; i++) {
      const lx = x0 + i + 0.5 - cx - Math.sin((n / fh) * 3) * 1.2 * s
      if (Math.abs(lx) < half) tone[j * w + i] = Math.abs(lx) > half - 1 ? 3 : lx < 0 ? 7 : 5
    }
  }
  // Colour + outline.
  const cols = ramp.map(cint)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const k = j * w + i
      const t = tone[k]
      if (t > 0) buf.data[k] = cols[t]
      else if (t === -1) {
        const nb = (i > 0 && tone[k - 1] > 0) || (i < w - 1 && tone[k + 1] > 0) || (j > 0 && tone[k - w] > 0) || (j < h - 1 && tone[k + w] > 0)
        if (nb) buf.data[k] = cols[0]
      }
    }
  g.draw(buf.toCanvas(), x0, yTop)
}

/** The inside of the arch: a deep backdrop for the halo. */
function drawArchBackdrop(g: Surface, cx: number, seatY: number, s: number, col: string, dot: string) {
  const A = 44 * s
  const Hs = 60 * s
  const Ha = 110 * s
  for (let y = Math.floor(seatY - Ha); y <= seatY; y++) {
    const ly = seatY - y
    let half: number
    if (ly <= Hs) half = A
    else {
      // Approximate the ogee: solve for the bezier x at this height.
      let hx = 0
      for (let i = 0; i <= 80; i++) {
        const t = i / 80
        const u = 1 - t
        const by = u * u * u * Hs + 3 * u * u * t * (Hs + 36 * s) + 3 * u * t * t * (Ha - 12 * s) + t * t * t * Ha
        if (by >= ly) {
          hx = -(u * u * u * -A + 3 * u * u * t * -A + 3 * u * t * t * (-12 * s))
          break
        }
      }
      half = hx
    }
    const x0 = Math.round(cx - half)
    const x1 = Math.round(cx + half)
    for (let x = x0; x < x1; x++) {
      const r = Math.hypot(x - cx, (y - (seatY - 55 * s)) * 0.8) / (A * 1.3)
      const li = 0.95 - r * 0.45
      const p = ((x - cx + 1000) % 6 === 0 && (y + 1000) % 6 === 0) || ((x - cx + 1003) % 6 === 0 && (y + 1003) % 6 === 0)
      g.px(x, y, lit(p ? dot : col, Math.round(li * 6 + dth(x, y) * 1.1)))
    }
  }
}

/** Tiered throne (ฐานชุกชี) under the image. Returns the y of its foot. */
function drawThrone(g: Surface, cx: number, seatY: number, s: number, pal: ThronePal): number {
  let y = seatY
  // Upturned lotus petals (บัวหงาย).
  const lw = Math.round(88 * s)
  const lh = Math.max(4, Math.round(10 * s))
  const half = Math.round(lh / 2)
  petalRow(g, cx, y + half - Math.round(2 * s), lw - Math.round(8 * s), lh - 1, 10, true, pal.ramp, 0.5)
  petalRow(g, cx, y + half, lw, lh, 11, true, pal.ramp, 0)
  y += half
  g.rect(cx - lw / 2, y, lw, Math.max(1, Math.round(1.2 * s)), pal.ramp[7])
  y += Math.max(1, Math.round(1.2 * s))
  g.rect(cx - lw / 2 + 1, y, lw - 2, 1, pal.ramp[1])
  y += 1
  // Waist (ท้องไม้) with glass mosaic.
  const ww = Math.round(76 * s)
  const wh = Math.max(4, Math.round(8 * s))
  g.rect(cx - ww / 2, y, ww, wh, pal.waist)
  g.rect(cx - ww / 2, y, ww, 1, pal.ramp[5])
  g.rect(cx - ww / 2, y + wh - 1, ww, 1, pal.ramp[3])
  const gap = Math.max(4, Math.round(7 * s))
  const glass = pal.glass
  let gi = 0
  for (let x = Math.round(cx - ww / 2 + gap / 2); x < cx + ww / 2 - 2; x += gap, gi++) {
    const my = y + Math.floor(wh / 2)
    const r = Math.max(1, Math.round(2 * s))
    for (let d = -r; d <= r; d++) {
      const hw = r - Math.abs(d)
      g.rect(x - hw, my + d, hw * 2 + 1, 1, pal.ramp[4])
    }
    g.px(x, my, glass[gi % glass.length])
    if (r > 1) {
      g.px(x - 1, my, glass[gi % glass.length])
      g.px(x, my - 1, mix(glass[gi % glass.length], '#ffffff', 0.5))
    }
  }
  y += wh
  // Downturned lotus (บัวคว่ำ).
  const dh = Math.max(3, Math.round(7 * s))
  petalRow(g, cx, y, Math.round(94 * s), dh, 12, false, pal.ramp, 0)
  y += dh
  // Frieze tier (หน้ากระดาน).
  const tw = Math.round(104 * s)
  const th = Math.max(4, Math.round(10 * s))
  drawLacquerTier(g, cx, y, tw, th, pal, s)
  y += th
  // Base tier with lion feet.
  const bw = Math.round(114 * s)
  const bh = Math.max(4, Math.round(11 * s)) + half
  drawLacquerTier(g, cx, y, bw, bh, pal, s)
  const fw = Math.max(3, Math.round(8 * s))
  for (const sx of [-1, 1]) {
    const fx = Math.round(cx + sx * (bw / 2 - fw / 2))
    g.rect(fx - fw / 2, y, fw, bh, pal.ramp[4])
    g.rect(fx - fw / 2, y, fw, 1, pal.ramp[7])
    g.rect(fx - fw / 2 + (sx < 0 ? 0 : fw - 1), y, 1, bh, pal.ramp[2])
    g.rect(fx - fw / 2 + 1, y + bh - 2, fw - 2, 1, pal.ramp[6])
  }
  y += bh
  g.rect(cx - bw / 2 - 1, y - 1, bw + 2, 1, pal.ramp[0])
  return y
}

interface ThronePal {
  ramp: readonly string[]
  lacquer: string
  waist: string
  glass: string[]
}

function drawLacquerTier(g: Surface, cx: number, y: number, tw: number, th: number, pal: ThronePal, s: number) {
  const x0 = Math.round(cx - tw / 2)
  for (let j = 0; j < th; j++) {
    const li = 0.8 + (j / th) * 0.25
    for (let i = 0; i < tw; i++) {
      const edge = i / tw
      const l2 = li - Math.pow(Math.abs(edge - 0.5) * 2, 3) * 0.25
      g.px(x0 + i, y + j, lit(pal.lacquer, Math.round(l2 * 6 + dth(x0 + i, y + j))))
    }
  }
  g.rect(x0, y, tw, 1, pal.ramp[6])
  g.rect(x0, y + 1, tw, 1, pal.ramp[3])
  g.rect(x0, y + th - 1, tw, 1, pal.ramp[2])
  // Gold rosettes (ประจำยาม) and small กระจัง leaves along the top.
  const step = Math.max(5, Math.round(9 * s))
  const my = y + Math.floor(th / 2) + 1
  for (let x = x0 + Math.round(step / 2); x < x0 + tw - 2; x += step) {
    g.px(x, my, pal.ramp[7])
    g.px(x - 1, my, pal.ramp[5])
    g.px(x + 1, my, pal.ramp[4])
    g.px(x, my - 1, pal.ramp[6])
    g.px(x, my + 1, pal.ramp[3])
    if (th >= 7) {
      g.px(x + Math.round(step / 2), y + 2, pal.ramp[5])
      g.px(x + Math.round(step / 2), y + 3, pal.ramp[3])
    }
  }
}

/** A row of lotus petals; `up` petals point upward from y, else hang down. */
function petalRow(g: Surface, cx: number, y: number, width: number, hgt: number, n: number, up: boolean, ramp: readonly string[], shift: number) {
  const pw = width / n
  const x0 = cx - width / 2
  for (let j = 0; j < hgt; j++) {
    const v = up ? 1 - (j + 0.5) / hgt : (j + 0.5) / hgt // 0 at the base, 1 at the tip
    for (let i = 0; i < Math.ceil(width); i++) {
      const u = (i + 0.5) / pw + shift
      const cell = Math.floor(u)
      const fu = (u - cell - 0.5) * 2 // -1..1 across the petal
      const half = Math.pow(Math.max(0, 1 - v), 0.55)
      const bulge = up ? 1 : Math.pow(Math.max(0, 1 - (1 - v) * 0.2), 1)
      const inside = Math.abs(fu) < half * bulge
      if (!inside) continue
      const edge = half * bulge - Math.abs(fu) < 0.28
      let t: number
      if (edge) t = 1
      else if (Math.abs(fu) < 0.12 && v > 0.15) t = 7
      else t = Math.round(5 - fu * 1.4 + (up ? v : 1 - v) * 0.6 + dth(i, j) * 0.7)
      g.px(Math.round(x0 + i), (up ? y - hgt : y) + j, ramp[Math.max(1, Math.min(8, t))])
    }
  }
}

/** Seven-tiered parasol (ฉัตร) on a gilded pole. */
function drawChatra(g: Surface, x: number, footY: number, topY: number, s: number, cloth: string) {
  const pole = Math.max(1, Math.round(1.4 * s))
  g.rect(x - 1, topY, pole + 2, footY - topY, G[1])
  g.rect(x, topY, pole, footY - topY, G[5])
  const tiers = 7
  const span = (footY - topY) * 0.58
  const gap = span / tiers
  for (let i = 0; i < tiers; i++) {
    const ty = Math.round(topY + 6 * s + i * gap)
    const hw = Math.max(2, Math.round((2.6 + i * 0.95) * s))
    const th = Math.max(2, Math.round(Math.min(gap - 1, 3.2 * s)))
    // Domed canopy: gold cap, white cloth skirt, scalloped gold hem.
    for (let j = 0; j < th; j++) {
      const t = (j + 1) / th
      const w2 = Math.round(hw * Math.sqrt(t))
      g.rect(x - w2 - 1, ty + j, w2 * 2 + 3, 1, G[0])
      for (let q = -w2; q <= w2; q++) g.px(x + q, ty + j, j === 0 ? G[6] : lit(cloth, q < 0 ? 7 : q > w2 * 0.5 ? 4 : 6))
    }
    for (let q = -hw; q <= hw; q++) {
      g.px(x + q, ty + th, (q & 1) === 0 ? G[6] : G[3])
      if ((q & 1) === 0) g.px(x + q, ty + th + 1, G[2])
    }
  }
  // Finial and foot.
  const fh = Math.max(3, Math.round(7 * s))
  for (let j = 0; j < fh; j++) g.rect(x - (j < fh / 3 ? 1 : 0), topY + 6 * s - 1 - j, j < fh / 3 ? 3 : 1, 1, j === fh - 1 ? G[8] : G[6])
  g.rect(Math.round(x - 3 * s), footY - 2, Math.round(6 * s) + 1, 2, G[3])
  g.rect(Math.round(x - 3 * s), footY - 2, Math.round(6 * s) + 1, 1, G[6])
}


// Offerings & altar furniture -----------------------------------------------

const WAX = ['#4a3020', '#8a6a52', '#b89878', '#d9bf9c', '#ecd8b8', '#f7e8cc', '#fff4e0', '#fffaf0', '#ffffff'] as const
export const BRONZE_RAMP = ['#24130c', '#43261a', '#62381f', '#7f4d28', '#9c6634', '#b98244', '#d4a25a', '#ecc47c', '#fff0c0'] as const
const PORCELAIN = ['#1c2446', '#2c3f78', '#4462a8', '#7090cc', '#a6bfe4', '#d2def2', '#eef3fb', '#ffffff', '#ffffff'] as const
const PINK = ['#5a1a30', '#a83a64', '#e0709a', '#f7a2c0', '#ffd0e0'] as const
const LEAF = ['#1e3a26', '#2f5e38', '#4a8a4a', '#76b45e'] as const

/** Wax candle standing on baseY; returns the flame base. */
function drawCandleHD(g: Surface, x: number, baseY: number, hgt: number, s: number, fat = false): [number, number] {
  const w = fat ? Math.max(3, Math.round(4 * s)) : s >= 0.9 ? 3 : 2
  const x0 = Math.round(x - Math.floor(w / 2))
  const top = Math.round(baseY - hgt)
  g.rect(x0 - 1, top, w + 2, baseY - top, WAX[1])
  for (let i = 0; i < w; i++) {
    const t = i === 0 ? 7 : i === w - 1 ? 3 : i === 1 ? 6 : 5
    g.rect(x0 + i, top + 1, 1, baseY - top - 1, WAX[t])
  }
  g.rect(x0, top, w, 1, WAX[6])
  g.rect(x0 + w - 1, top + 1, 1, Math.min(3, baseY - top - 2), WAX[7]) // drip
  g.px(Math.round(x), top - 1, '#3a2418')
  return [Math.round(x), top - 1]
}

/** Small gilded candlestick; returns the top of its pan. */
function drawCandlestick(g: Surface, x: number, baseY: number, s: number): number {
  const fw = Math.max(3, Math.round(3 * s))
  const sh = Math.max(2, Math.round(4 * s))
  g.rect(x - fw, baseY - 1, fw * 2 + 1, 1, G[2])
  g.rect(x - fw + 1, baseY - 2, fw * 2 - 1, 1, G[5])
  g.rect(x, baseY - 2 - sh, 1, sh, G[6])
  g.rect(x + 1, baseY - 2 - sh, 1, sh, G[3])
  const py = baseY - 3 - sh
  g.rect(x - fw, py, fw * 2 + 2, 1, G[7])
  g.rect(x - fw, py + 1, fw * 2 + 2, 1, G[3])
  return py
}

/** Tall floor candle stand (เชิงเทียนพื้น); returns the flame base. */
function drawFloorStand(g: Surface, x: number, footY: number, hgt: number, s: number): [number, number] {
  const fw = Math.round(6 * s)
  for (let j = 0; j < Math.round(5 * s); j++) {
    const hw = Math.round(fw * (1 - j / (6 * s)) + 1)
    g.rect(x - hw, footY - 1 - j, hw * 2 + 1, 1, j === 0 ? G[2] : j % 2 ? G[5] : G[4])
  }
  const stemTop = Math.round(footY - hgt)
  g.rect(x - 1, stemTop, 3, footY - stemTop, G[1])
  g.rect(x, stemTop, 1, footY - stemTop, G[6])
  for (const f of [0.35, 0.68]) {
    const ky = Math.round(footY - hgt * f)
    g.ellipse(x + 0.5, ky, 2.6 * s, 1.4 * s, G[3])
    g.ellipse(x, ky - 0.5, 2 * s, 1 * s, G[6])
  }
  const pw = Math.round(5 * s)
  g.rect(x - pw - 1, stemTop - 1, pw * 2 + 3, 3, G[1])
  g.rect(x - pw, stemTop - 1, pw * 2 + 1, 1, G[7])
  g.rect(x - pw, stemTop, pw * 2 + 1, 1, G[4])
  return drawCandleHD(g, x, stemTop - 1, Math.round(12 * s), s, true)
}

const vaseCache = new Map<string, Sculpted>()
function vaseSculpt(s: number, kind: 'gold' | 'porcelain' | 'bronze'): Sculpted {
  const key = `${kind}:${s}`
  let v = vaseCache.get(key)
  if (!v) {
    v = sculpt({
      prims: [E(0, 5, 0, 4.2, 5, 4.2, 1), C([0, 8.5, 0], [0, 12, 0], 1.7, 2.3, 1), E(0, 12.4, 0, 3.1, 0.9, 3.1, 2), E(0, 0.9, 0, 2.8, 0.9, 2.8, 2, 0)],
      s,
      x0: -5,
      x1: 5,
      y0: 0,
      y1: 13.5,
      ramps: [kind === 'gold' ? G : kind === 'porcelain' ? PORCELAIN : BRONZE_RAMP],
      rim: 0.2,
      detail:
        kind === 'porcelain'
          ? (d) => {
              // Blue-and-white band with a gold rim.
              d.curve(-4, 4, () => 7.4, -3)
              d.curve(-4, 4, () => 3.6, -3)
              d.each((i, j, lx, ly) => {
                if (ly > 4.4 && ly < 6.6 && (i + j) % 3 === 0 && Math.abs(lx) < 3.6) d.add(i, j, -3)
              })
            }
          : undefined,
    })
    vaseCache.set(key, v)
  }
  return v
}

function drawBud(g: Surface, x: number, y: number, s: number, open = false) {
  // A lotus bud (ดอกบัวตูม): pointed tip at (x, y).
  const hgt = Math.max(3, Math.round(5 * s))
  for (let j = 0; j < hgt; j++) {
    const t = j / (hgt - 1)
    const hw = Math.round(Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.62) * (open ? 2.4 : 1.6) * s)
    g.rect(x - hw - 1, y + j, hw * 2 + 3, 1, PINK[0])
    for (let i = -hw; i <= hw; i++) g.px(x + i, y + j, PINK[i < 0 ? 3 : i === 0 ? (t < 0.3 ? 4 : 3) : 2])
  }
  g.px(x, y - 1, PINK[0])
}

/** A vase of lotus buds or orchids; (x, baseY) is the vase foot. */
function drawVaseOfFlowers(g: Surface, x: number, baseY: number, s: number, kind: 'lotus' | 'orchid', vase: 'gold' | 'porcelain' | 'bronze', seed: number) {
  const v = vaseSculpt(Math.round(s * 20) / 20, vase)
  const mouth = Math.round(baseY - 12.4 * s)
  if (kind === 'lotus') {
    const buds: [number, number][] = [
      [0, -15],
      [-5, -11],
      [5, -12],
      [-2.5, -7],
      [3, -6.5],
    ]
    for (const [bx, by] of buds) g.line(x, mouth, x + bx * s, mouth + (by + 4) * s, LEAF[1])
    // Leaves.
    g.ellipse(x - 6 * s, mouth - 3 * s, 3 * s, 1.4 * s, LEAF[2])
    g.ellipse(x + 6.5 * s, mouth - 2 * s, 3 * s, 1.3 * s, LEAF[1])
    g.px(x - 7 * s, mouth - 3.5 * s, LEAF[3])
    buds.forEach(([bx, by], i) => drawBud(g, Math.round(x + bx * s), Math.round(mouth + by * s), s * (i < 3 ? 1 : 0.8), i === 0 && seed % 2 === 0))
  } else {
    const cols = ['#b24fc4', '#e59af0', '#fbe6ff']
    for (const side of [-1, 1]) {
      for (let q = 0; q < 2; q++) {
        const len = (13 + q * 3) * s
        let px = x
        let py = mouth
        for (let i = 0; i <= 10; i++) {
          const t = i / 10
          const nx = x + side * Math.sin(t * 1.6) * len * (0.55 + q * 0.2)
          const ny = mouth - Math.sin(t * 2.2) * len * 0.8 + t * t * 6 * s
          g.line(px, py, nx, ny, LEAF[1])
          px = nx
          py = ny
          if (i >= 4 && i % 2 === 0) {
            g.px(Math.round(nx), Math.round(ny) - 1, cols[0])
            g.px(Math.round(nx) - 1, Math.round(ny), cols[1])
            g.px(Math.round(nx) + 1, Math.round(ny), cols[0])
            g.px(Math.round(nx), Math.round(ny), cols[2])
          }
        }
      }
    }
    g.ellipse(x - 3 * s, mouth - 1 * s, 3.2 * s, 1.2 * s, LEAF[2])
    g.ellipse(x + 3 * s, mouth - 1.5 * s, 3.2 * s, 1.2 * s, LEAF[1])
  }
  g.draw(v.canvas, Math.round(x) - v.ox, Math.round(baseY) - v.oy)
}

/** Hanging jasmine garland (พวงมาลัย) with a rose pendant. */
function drawGarland(g: Surface, x: number, y: number, hw: number, sag: number, s: number, accent = '#e0344a') {
  for (let i = -hw; i <= hw; i++) {
    const t = i / hw
    const yy = Math.round(y + (1 - t * t) * sag)
    g.px(x + i, yy + 1, '#8a7a66')
    g.px(x + i, yy, (i & 1) === 0 ? '#fffaf0' : '#e8e0c8')
  }
  const py = Math.round(y + sag + 1)
  const pr = Math.max(1, Math.round(1.6 * s))
  g.circle(x + 0.5, py + pr + 0.5, pr + 0.8, '#5a1420')
  g.circle(x + 0.5, py + pr + 0.5, pr, accent)
  g.px(x, py + pr, mix(accent, '#ffffff', 0.4))
  g.rect(x, py + pr * 2 + 1, 1, Math.round(4 * s), '#e8c040')
  g.rect(x + 1, py + pr * 2 + 1, 1, Math.round(3 * s), LEAF[2])
}

const bowlCache = new Map<number, Sculpted>()
/** Incense bowl (กระถางธูป) with sticks; returns the glowing stick tips. */
function drawIncenseBowl(g: Surface, x: number, baseY: number, s: number): [number, number][] {
  const q = Math.round(s * 20) / 20
  let b = bowlCache.get(q)
  if (!b) {
    const bowl = E(0, 7, 0, 7.5, 6.5, 5.5, 1, 0)
    bowl.maxY = 7
    b = sculpt({ prims: [bowl, E(0, 7, 0.2, 8, 1.2, 5.6, 2), E(0, 0.8, 0, 4, 0.9, 3, 1, 0)], s: q, x0: -9, x1: 9, y0: 0, y1: 9, ramps: [BRONZE_RAMP], rim: 0.25 })
    bowlCache.set(q, b)
  }
  const top = Math.round(baseY - 7.6 * s)
  const tips: [number, number][] = []
  for (const [dx, hgt] of [
    [-2.2, 11],
    [0, 13],
    [2.2, 11.5],
  ] as [number, number][]) {
    const sx = Math.round(x + dx * s)
    const ty = Math.round(top - hgt * s)
    g.line(sx, top, sx + Math.round(dx * 0.4), ty, '#8a2a22')
    tips.push([sx + Math.round(dx * 0.4), ty])
  }
  g.draw(b.canvas, Math.round(x) - b.ox, Math.round(baseY) - b.oy)
  g.ellipse(x, top + 1, 6.5 * s, 1.1 * s, '#cdbb98')
  return tips
}

/** A carved lacquer altar table (seen from the front, a little from above). */
function drawTable(g: Surface, cx: number, topY: number, footY: number, w: number, s: number, lacquer: string) {
  const x0 = Math.round(cx - w / 2)
  const slab = Math.max(2, Math.round(2.5 * s))
  const apron = Math.max(2, Math.round(3.5 * s))
  const leg = Math.max(2, Math.round(2.2 * s))
  // Legs (ขาสิงห์) curling outward at the foot.
  for (const lx of [x0 + 1, x0 + w - 1 - leg]) {
    g.rect(lx - 1, topY + slab, leg + 2, footY - topY - slab, G[1])
    g.rect(lx, topY + slab, leg, footY - topY - slab - 1, G[4])
    g.rect(lx, topY + slab, 1, footY - topY - slab - 1, G[6])
    const out = lx < cx ? -1 : 1
    g.rect(lx + (out < 0 ? -1 : leg - 1), footY - 2, 2, 2, G[3])
  }
  // Top: a lit top surface, the slab edge, then a carved apron.
  g.rect(x0 - 1, topY - 1, w + 2, slab + apron + 2, G[0])
  g.rect(x0, topY, w, 1, lit(lacquer, 8))
  g.rect(x0, topY + 1, w, slab - 1, G[6])
  g.rect(x0, topY + slab, w, apron, lit(lacquer, 5))
  g.rect(x0, topY + slab, w, 1, G[3])
  const step = Math.max(3, Math.round(4 * s))
  for (let x = x0 + 1; x < x0 + w - 1; x++) {
    const f = ((x - x0) % step) / step
    const yy = topY + slab + apron - 1 - Math.round(Math.sin(f * Math.PI) * Math.min(2, apron - 1))
    g.px(x, yy, G[5])
    g.px(x, yy + 1, G[2])
  }
  for (let x = x0 + Math.round(step / 2); x < x0 + w - 1; x += step * 2) g.px(x, topY + slab + 1, G[7])
}

// Light shafts ---------------------------------------------------------------

function hull(points: [number, number][]): [number, number][] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop()
    lower.push(pt)
  }
  const upper: [number, number][] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop()
    upper.push(pt)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

export function inPoly(poly: [number, number][], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Bake dithered sun shafts from the side-wall windows into `light` and add
 * their outlines to the layout (for dust motes).
 */
function bakeShafts(L: HallLayout, light: Surface, v0: number, v1: number, color: string, sides: number[] = [-1, 1], strength = 1) {
  const E0 = L.backY - L.vpY
  const acc = new Float32Array(L.w * L.h)
  const proj = (X: number, v: number, Z: number): [number, number] => {
    const k = L.F / Z
    return [L.cx + X * k, L.vpY + (E0 - v) * k]
  }
  for (const side of sides) {
    L.windows.forEach((win, wi) => {
      if (side > 0 && wi > 0) return
      const X = side * L.halfBack
      const dir = [-side * 1, -0.8, -0.32]
      const corners: [number, number][] = []
      const lands: [number, number][] = []
      for (const Z of [win.z - win.half * 0.8, win.z + win.half * 0.8])
        for (const v of [v0, v1]) {
          corners.push(proj(X, v, Z))
          const t = v / 0.8
          lands.push(proj(X + dir[0] * t, 0, Math.max(L.F * 0.15, Z + dir[2] * t)))
        }
      const poly = hull([...corners, ...lands])
      L.shafts.push(poly)
      const wc = corners.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0])
      const lc = lands.reduce((a, c) => [a[0] + c[0] / 4, a[1] + c[1] / 4], [0, 0])
      const len = Math.hypot(lc[0] - wc[0], lc[1] - wc[1]) || 1
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const [px, py] of poly) {
        minX = Math.min(minX, px)
        maxX = Math.max(maxX, px)
        minY = Math.min(minY, py)
        maxY = Math.max(maxY, py)
      }
      const st = (side < 0 ? 1 : 0.6) * strength
      polyRows(poly, L.w, L.h, (y, xa, xb) => {
        for (let x = xa; x < xb; x++) {
          const prog = ((x - wc[0]) * (lc[0] - wc[0]) + (y - wc[1]) * (lc[1] - wc[1])) / (len * len)
          const band = 0.75 + 0.25 * Math.sin((x * 0.9 - y * 0.55) * 0.35 + wi * 2)
          const t = st * (0.62 - Math.max(0, prog) * 0.4) * band
          const k = y * L.w + x
          acc[k] = Math.max(acc[k], t)
        }
      })
      // The warm patch where the light lands on the floor.
      const land = hull(lands)
      polyRows(land, L.w, L.h, (y, xa, xb) => {
        for (let x = xa; x < xb; x++) acc[y * L.w + x] += 0.45 * st
      })
    })
  }
  // Posterise the soft beams into a few alpha steps for a crisp pixel look.
  const buf = new PixBuf(L.w, L.h)
  const c = cint(color) & 0xffffff
  for (let k = 0; k < acc.length; k++) {
    if (acc[k] <= 0) continue
    const a = Math.round(Math.min(1, acc[k]) * 7) / 7
    buf.data[k] = (((a * 255) | 0) << 24 | c) >>> 0
  }
  light.ctx.putImageData(buf.img, 0, 0)
}

// Bake -----------------------------------------------------------------------

export interface HallLayers {
  L: HallLayout
  /** Opaque room behind everything (with the arch backdrop). */
  far: HTMLCanvasElement
  /** Statue, arch, throne, altar (transparent; drawn over the halo glow). */
  mid: HTMLCanvasElement
  /** Nearest framing pillars (transparent; parallax during the entrance). */
  fg: HTMLCanvasElement
  /** Additive light shafts (draw with 'lighter' at low alpha). */
  light: HTMLCanvasElement
  /** Colour of halos / glows for this place. */
  glow: string
  /** Halo colour right behind the image. */
  halo: string
}

export type ShrineDeity = 'ganesha' | 'guanyin' | 'lakshmi'

export interface BakeOptions {
  safe?: SafeArea
  deity?: ShrineDeity
}

export function bakeHall(temple: HallTemple, w: number, h: number, opts: BakeOptions = {}): HallLayers {
  const L = hallLayout(temple, w, h, opts.safe)
  if (temple === 'home') return bakeHome(L)
  if (temple === 'shrine') return bakeShrine(L, opts.deity ?? 'ganesha')
  if (temple === 'river') return bakeRiver(L)
  if (temple === 'mountain') return bakeMountain(L)
  return bakeWat(L)
}

/** Mirror the mid layer onto the polished floor (outside the carpet). */
function floorReflection(L: HallLayout, far: Surface, mid: HTMLCanvasElement, alpha: number, carpetHalf: number) {
  const ctx = far.ctx
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, L.backY, L.w, L.h - L.backY)
  if (carpetHalf > 0) {
    const kA = (L.altarY - L.vpY) / (L.backY - L.vpY)
    const kB = (L.h - L.vpY) / (L.backY - L.vpY)
    ctx.moveTo(L.cx - carpetHalf * kA, L.altarY)
    ctx.lineTo(L.cx - carpetHalf * kB, L.h)
    ctx.lineTo(L.cx + carpetHalf * kB, L.h)
    ctx.lineTo(L.cx + carpetHalf * kA, L.altarY)
    ctx.closePath()
  }
  ctx.clip('evenodd')
  ctx.globalAlpha = alpha
  ctx.translate(0, L.backY * 2)
  ctx.scale(1, -1)
  ctx.drawImage(mid, 0, 0)
  ctx.restore()
}

/** Altar set, candle stands and offerings in front of the throne. */
function drawAltarSet(g: Surface, L: HallLayout, lacquer: string, vases: 'gold' | 'porcelain' | 'bronze') {
  const { s, cx, backY, altarY } = L
  const r = (v: number) => Math.round(v)
  // Back tier: the tallest centre table holds a small image.
  const t1 = r(altarY - 42 * s)
  drawTable(g, cx, t1, r(backY + 6 * s), r(22 * s), s, lacquer)
  const small = buddhaSculpt('sukhothai', Math.max(0.15, Math.round(s * 0.22 * 40) / 40))
  petalRow(g, cx, t1, r(12 * s), Math.max(2, r(3 * s)), 5, true, G, 0)
  g.draw(small.canvas, cx - small.ox, t1 - r(3 * s) - small.oy)
  const t2 = r(altarY - 31 * s)
  const t3 = r(altarY - 21 * s)
  for (const sx of [-1, 1]) {
    drawTable(g, r(cx + sx * 21 * s), t2, r(backY + 12 * s), r(17 * s), s, lacquer)
    drawVaseOfFlowers(g, r(cx + sx * 21 * s), t2, s, 'lotus', vases, sx + 3)
  }
  for (const sx of [-1, 1]) {
    drawTable(g, r(cx + sx * 36 * s), t3, r(backY + 18 * s), r(15 * s), s, lacquer)
    drawVaseOfFlowers(g, r(cx + sx * 36 * s), t3, s * 0.9, 'orchid', vases === 'gold' ? 'porcelain' : vases, sx + 5)
  }
  // Front table: incense bowl, two candles and garlands.
  const t4 = r(altarY - 12 * s)
  drawTable(g, cx, t4, altarY, r(58 * s), s, lacquer)
  for (const sx of [-1, 1]) {
    const px = r(cx + sx * 13 * s)
    const pan = drawCandlestick(g, px, t4, s)
    const [fx, fy] = drawCandleHD(g, px, pan, r(9 * s), s)
    L.flames.push({ x: fx, y: fy, size: 1, order: sx < 0 ? 0.08 : 0.16 })
  }
  L.incense.push(...drawIncenseBowl(g, cx, t4, s).map(([x, y]) => ({ x, y })))
  for (const sx of [-1, 1]) drawGarland(g, r(cx + sx * 21 * s), t4 + r(3 * s), r(5 * s), r(3 * s), s, sx < 0 ? '#e0344a' : '#f59a2a')
  drawGarland(g, cx, t4 + r(3 * s), r(4 * s), r(2 * s), s, '#e0344a')
  // Tall floor candle stands flanking the altar.
  for (const sx of [-1, 1]) {
    const [fx, fy] = drawFloorStand(g, r(cx + sx * 46 * s), r(altarY + 3 * s), r(40 * s), s)
    L.flames.push({ x: fx, y: fy, size: 2, order: sx < 0 ? 0.3 : 0.4 })
  }
}

function bakeWat(L: HallLayout): HallLayers {
  const { w, h, s, cx, seatY } = L
  const far = new Surface(w, h)
  far.ctx.putImageData(shadeRoom(L, watSurfaces(L)).img, 0, 0)
  drawArchBackdrop(far, cx, seatY, s, '#4a0e1c', '#b8742a')
  const mid = new Surface(w, h)
  drawRuenKaew(mid, cx, seatY, s, G, '#4a0e1c')
  drawBuddhaHD(mid, cx, seatY, s, 'sukhothai')
  const foot = drawThrone(mid, cx, seatY, s, { ramp: G, lacquer: '#8a1e2c', waist: '#4a0c18', glass: ['#5ad0a0', '#6aa8ff', '#fff4d0', '#ff7a8a'] })
  // Votive lights along the lowest tier.
  for (let i = 0; i < 6; i++) {
    const vx = Math.round(cx + (i - 2.5) * 17 * s)
    if (Math.abs(vx - cx) < 34 * s) continue
    const vy = Math.round(foot - 11 * s)
    mid.rect(vx - 1, vy, 3, 2, G[4])
    mid.rect(vx - 1, vy + 2, 3, 1, G[2])
    L.flames.push({ x: vx, y: vy - 1, size: 0, order: 0.5 + i * 0.07 })
  }
  const pal: PillarPal = { body: WAT.lacquer, gold: WAT.gold, goldD: WAT.goldD, line: '#2a0810' }
  const fg = new Surface(w, h)
  const ks = L.pillarsK.slice().sort((a, b) => a - b)
  for (const k of ks) {
    const tgt = k < 1.45 ? mid : fg
    drawPillar(tgt, L, -L.pillarX, k, pal)
    drawPillar(tgt, L, L.pillarX, k, pal)
  }
  drawAltarSet(mid, L, '#8a1e2c', 'gold')
  floorReflection(L, far, mid.canvas, 0.16, 17 * s)
  const light = new Surface(w, h)
  bakeShafts(L, light, 64 * s, 116 * s, '#fff0c8')
  L.monk = null
  return { L, far: far.canvas, mid: mid.canvas, fg: fg.canvas, light: light.canvas, glow: '#ffcf7a', halo: '#ffe7a0' }
}

// ---------------------------------------------------------------------------
// Shared helpers for the other halls

function roomLight(L: HallLayout, sigma: number, dark: number) {
  const s = L.s
  const sig = sigma * s
  const glow = (x: number, y: number) => Math.exp(-((x - L.cx) * (x - L.cx) + (y - L.seatY) * (y - L.seatY) * 0.7) / (2 * sig * sig))
  const vig = (x: number, y: number) => {
    const dx = (x - L.cx) / (L.w / 2)
    const dyB = Math.max(0, (y - L.backY) / Math.max(1, L.h - L.backY))
    const dyT = Math.max(0, (L.ceilY + 10 * s - y) / Math.max(1, L.ceilY + 10 * s))
    return 1 - dark * (0.3 * dx * dx + 0.34 * dyB * dyB + 0.3 * dyT)
  }
  return { glow, vig }
}

function zAltarOf(L: HallLayout) {
  return L.F / ((L.altarY - L.vpY) / (L.backY - L.vpY))
}

/** Streaks of reflected river light near the doors (animated in the scene). */
function seedRipples(L: HallLayout) {
  const s = L.s
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1
    const x = L.cx + side * (L.halfBack * (1 + hash2(i, 3) * 0.5) - hash2(i, 9) * 30 * s)
    const y = L.ceilY + (hash2(i, 5) - 0.6) * 60 * s
    if (x < 0 || x > L.w || y < 0) continue
    L.ripples.push({ x: Math.round(x), y: Math.round(y), w: Math.round((3 + hash2(i, 7) * 6) * s) })
  }
}

/** Brass oil lantern hanging on a chain; returns the flame spot. */
function drawHangingLantern(g: Surface, x: number, topY: number, y: number, s: number): [number, number] {
  for (let yy = Math.max(0, topY); yy < y; yy++) g.px(x, yy, (yy & 1) === 0 ? BRONZE_RAMP[5] : BRONZE_RAMP[2])
  const hw = Math.max(2, Math.round(3.4 * s))
  const hh = Math.max(4, Math.round(8 * s))
  g.rect(x - hw + 1, y, hw * 2 - 1, 1, BRONZE_RAMP[6])
  g.rect(x - hw, y + 1, hw * 2 + 1, 1, BRONZE_RAMP[4])
  g.rect(x - hw - 1, y + 2, hw * 2 + 3, hh, BRONZE_RAMP[0])
  g.rect(x - hw, y + 2, hw * 2 + 1, hh, '#ffe7a0')
  g.rect(x - hw, y + 2, 1, hh, BRONZE_RAMP[5])
  g.rect(x + hw, y + 2, 1, hh, BRONZE_RAMP[3])
  g.rect(x - hw, y + 2 + hh, hw * 2 + 1, 2, BRONZE_RAMP[4])
  g.px(x, y + 4 + hh, BRONZE_RAMP[6])
  return [x, y + 2 + Math.round(hh * 0.75)]
}

/** Long Lanna prayer banner (ตุง) hanging from the rafters. */
function drawTung(g: Surface, x: number, y0: number, y1: number, w: number, seed: number) {
  const cols = seed % 2 ? ['#c23a32', '#f4ecd8', '#e8b048'] : ['#f4ecd8', '#c23a32', '#3f7d5f']
  const hw = Math.max(1, Math.round(w / 2))
  const seg = Math.max(4, hw * 3)
  for (let y = Math.max(0, y0); y < y1; y++) {
    const k = Math.floor((y - y0) / seg)
    const c = cols[k % cols.length]
    const f = (y - y0) % seg
    g.rect(x - hw - 1, y, hw * 2 + 3, 1, '#2a1410')
    g.rect(x - hw, y, hw * 2 + 1, 1, f === 0 ? '#e8b048' : lit(c, 6))
    if (f === Math.floor(seg / 2)) g.px(x, y, '#e8b048')
    g.px(x + hw, y, lit(c, 4))
  }
  // Swallow-tail fringe.
  for (let j = 0; j < hw + 2; j++) {
    for (let i = -hw; i <= hw; i++) if (Math.abs(i) >= j - 1 || j === 0) g.px(x + i, y1 + j, lit(cols[0], i < 0 ? 6 : 5))
  }
}

// ---------------------------------------------------------------------------
// RIVER — an old teak-wood hall by the water, lantern-lit.

const RIV = {
  teak: '#7a4a2c',
  teakD: '#4a2a18',
  teakL: '#a06a3e',
  seam: '#2a160c',
  mat: '#d9b77a',
  matD: '#b88e52',
  matRed: '#a0302e',
  water: '#2f7f96',
  waterL: '#9fe2e8',
  sky: '#ffd49a',
  skyH: '#ffb886',
  bank: '#3f6a44',
  gold: '#c8903a',
}

function riverSurfaces(L: HallLayout): RoomSurfaces {
  const s = L.s
  const { glow, vig } = roomLight(L, 70, 1.3)
  const wallH = L.backY - L.ceilY
  const zAltar = zAltarOf(L)
  const doorV = 96 * s
  return {
    ceiling(X, Z, k, x, y) {
      const li = (0.42 + 0.3 * glow(x, y)) * vig(x, y) - (k - 1) * 0.06
      if (fract(Z / (34 * s)) < 0.16) return shadeAt(RIV.teakD, li * 0.9, x, y)
      const fx = fract(X / (9 * s))
      if (fx < 0.12) return shadeAt(RIV.seam, li, x, y)
      return shadeAt(fx < 0.5 ? RIV.teak : RIV.teakL, li * 0.9, x, y)
    },
    back(u, v, x, y) {
      const li = (0.5 + 0.45 * glow(x, y)) * vig(x, y)
      const vt = wallH - v
      if (vt < 8 * s) {
        const z = zigzag(u, vt, 1.5 * s, 5 * s, 6 * s)
        return shadeAt(z === 1 ? RIV.gold : RIV.teakD, li, x, y)
      }
      // Open shutters either side of the image looking out over the river.
      const au = Math.abs(u)
      if (au > 50 * s && au < 64 * s && v > 24 * s && v < 100 * s) {
        const edge = Math.min(au - 50 * s, 64 * s - au, v - 24 * s, 100 * s - v)
        if (edge < 1.6 * s) return shadeAt(RIV.teakD, li * 0.8, x, y)
        const vv = v - 24 * s
        if (vv < 30 * s) {
          const shimmer = Math.sin(u * 0.9 + vv * 1.9) + Math.sin(u * 0.37 - vv * 1.1)
          return shadeAt(shimmer > 1.05 ? RIV.waterL : RIV.water, 0.95 + vv / (90 * s), x, y)
        }
        if (vv < 30 * s + 5 * s + hash2(Math.floor(u / (2.5 * s)), 3) * 9 * s) return shadeAt(RIV.bank, 0.9, x, y)
        return shadeAt(vv < 58 * s ? RIV.sky : RIV.skyH, 1.08, x, y)
      }
      if (Math.abs(v - 22 * s) < 1.5 * s) return shadeAt(RIV.teakL, li, x, y)
      if (fract(u / (8 * s)) < 0.12) return shadeAt(RIV.seam, li, x, y)
      const grain = hash2(Math.floor(u / (8 * s)), Math.floor(v / (3 * s))) * 0.08
      return shadeAt(v < 22 * s ? RIV.teakD : RIV.teak, li - grain, x, y)
    },
    side(Z, v, _dir, k, x, y) {
      const li = (0.45 + 0.25 * glow(x, y)) * vig(x, y) - (k - 1) * 0.08
      for (const win of L.windows) {
        const dz = Math.abs(Z - win.z)
        const half = win.half * 1.2
        if (dz < half && v < doorV) {
          const edge = Math.min(half - dz, doorV - v)
          if (edge < 2 * s / k) return shadeAt(RIV.teakD, li * 0.8, x, y)
          // River view through the open door.
          if (v < 26 * s) {
            const shimmer = Math.sin(Z * 0.5 + v * 1.7) + Math.sin(Z * 0.23 - v * 0.9)
            return shadeAt(shimmer > 1.1 ? RIV.waterL : RIV.water, 1 + v / (80 * s), x, y)
          }
          if (v < 42 * s) {
            const tree = hash2(Math.floor(Z / (3 * s)), 1) * 12 * s
            if (v < 30 * s + tree) return shadeAt(RIV.bank, 0.95, x, y)
          }
          return shadeAt(v < 62 * s ? RIV.sky : RIV.skyH, 1.1, x, y)
        }
      }
      if (fract(Z / (10 * s)) < 0.1) return shadeAt(RIV.seam, li, x, y)
      return shadeAt(v < 22 * s ? RIV.teakD : RIV.teak, li, x, y)
    },
    floor(X, Z, k, x, y) {
      const li = (0.55 + 0.5 * glow(x, y)) * vig(x, y)
      const mw = 18 * s
      if (Math.abs(X) < mw && Z < zAltar) {
        const ax = Math.abs(X)
        if (ax > mw - 1.2 * s) return shadeAt(RIV.matD, li * 0.8, x, y)
        if (ax > mw - 4 * s && ax < mw - 2.4 * s) return shadeAt(RIV.matRed, li, x, y)
        const wv = (Math.floor(X / (2.4 * s)) + Math.floor(Z / (2.4 * s))) & 1
        return shadeAt(wv ? RIV.mat : RIV.matD, li * 0.92, x, y)
      }
      const fx = fract(X / (8 * s))
      const gx = Math.min(fx, 1 - fx) * 8 * s * k
      if (gx < 0.5) return shadeAt(RIV.seam, li, x, y)
      const plank = Math.floor(X / (8 * s))
      return shadeAt(hash2(plank, 4) > 0.5 ? RIV.teak : RIV.teakL, li * 0.9 + 0.04 * Math.sin(Z * 0.3), x, y)
    },
  }
}

function bakeRiver(L: HallLayout): HallLayers {
  const { w, h, s, cx, seatY } = L
  const far = new Surface(w, h)
  far.ctx.putImageData(shadeRoom(L, riverSurfaces(L)).img, 0, 0)
  drawArchBackdrop(far, cx, seatY, s, '#2e160e', '#8a5a2a')
  const mid = new Surface(w, h)
  drawRuenKaew(mid, cx, seatY, s, ANTIQUE_RAMP, '#2e160e')
  drawBuddhaHD(mid, cx, seatY, s, 'antique')
  drawThrone(mid, cx, seatY, s, { ramp: ANTIQUE_RAMP, lacquer: '#5a2616', waist: '#2e1410', glass: ['#9fe2e8', '#ffe7a0', '#e8a0a0'] })
  const pal: PillarPal = { body: RIV.teak, gold: RIV.gold, goldD: RIV.teakD, line: '#1c0e08', style: 'teak' }
  const fg = new Surface(w, h)
  for (const k of L.pillarsK.slice().sort((a, b) => a - b)) {
    const tgt = k < 1.45 ? mid : fg
    drawPillar(tgt, L, -L.pillarX, k, pal)
    drawPillar(tgt, L, L.pillarX, k, pal)
  }
  // Hanging lanterns between the pillars.
  for (const [X, k, drop] of [
    [-34, 1.12, 38],
    [34, 1.12, 38],
    [-44, 1.6, 30],
    [44, 1.6, 30],
  ] as [number, number, number][]) {
    const x = Math.round(cx + X * s * k)
    if (x < 4 || x > w - 4) continue
    const top = Math.round(ceilAt(L, k))
    const [fx, fy] = drawHangingLantern(k < 1.45 ? mid : fg, x, top, Math.round(Math.max(top, 0) + drop * s * (k - 0.4)), s * Math.min(1.3, k * 0.85))
    L.flames.push({ x: fx, y: fy, size: 3, order: 0.55 + (k - 1) * 0.5 + (X > 0 ? 0.05 : 0) })
  }
  drawAltarSet(mid, L, '#5a2616', 'bronze')
  floorReflection(L, far, mid.canvas, 0.1, 18 * s)
  const light = new Surface(w, h)
  bakeShafts(L, light, 8 * s, 80 * s, '#d8f4ff', [-1, 1], 0.7)
  seedRipples(L)
  return { L, far: far.canvas, mid: mid.canvas, fg: fg.canvas, light: light.canvas, glow: '#ffb860', halo: '#ffcf80' }
}

// ---------------------------------------------------------------------------
// MOUNTAIN — a Lanna vihara: black lacquer with gold stencil (ลายคำ), red
// columns, misty light and a white-gold chedi glimpsed outside.

const LAN = {
  black: '#261c1c',
  blackL: '#3a2c28',
  gold: '#dcae4a',
  goldD: '#9a6a26',
  red: '#a8322e',
  redD: '#6a1c1c',
  mist: '#e4ecf2',
  sky: '#cfdcea',
  mount: '#93a8bc',
  mountD: '#71869c',
  chedi: '#f6f1e6',
  chediD: '#c9c2b8',
  floor: '#5c3c28',
  floorL: '#6a4630',
  seam: '#2e1c12',
  carpet: '#9a2a2a',
}

/** Gold stencil (ลายคำ) on black lacquer: small rosettes in a lattice. */
function laiKham(u: number, v: number, s: number): number {
  const cu = u / (10 * s)
  const cv = v / (10 * s)
  const iu = Math.floor(cu)
  const iv = Math.floor(cv)
  const fu = fract(cu + (iv & 1) * 0.5) - 0.5
  const fv = fract(cv) - 0.5
  const r = Math.hypot(fu, fv)
  const a = Math.atan2(fv, fu)
  const petal = 0.22 + 0.1 * Math.cos(a * 4)
  if (r < 0.07) return 2
  if (r < petal && r > petal - 0.08) return 1
  if (Math.abs(Math.abs(fu) + Math.abs(fv) - 0.5) < 0.03) return 1
  void iu
  return 0
}

function mountainView(u: number, v: number, v0: number, s: number, chedi: boolean): string {
  const t = v - v0
  const ridge = 18 * s + Math.sin(u * 0.09) * 7 * s + Math.sin(u * 0.23 + 1) * 3 * s
  const ridge2 = 10 * s + Math.sin(u * 0.13 + 2) * 5 * s
  if (chedi) {
    // White chedi with a gold spire.
    const cu = u
    const bell = t - 6 * s
    const bw = bell < 0 ? 7 * s : 7 * s * Math.max(0, 1 - bell / (13 * s)) ** 0.8
    if (t < 6 * s && Math.abs(cu) < 9 * s - t * 0.3) return Math.abs(cu) > 7 * s ? LAN.chediD : LAN.chedi
    if (bell >= 0 && Math.abs(cu) < bw) return cu > bw * 0.4 ? LAN.chediD : LAN.chedi
    if (bell >= 0 && bell < 26 * s && Math.abs(cu) < Math.max(0.6, 2.4 * s * (1 - (bell - 9 * s) / (17 * s)))) return bell > 9 * s ? LAN.gold : LAN.chedi
  }
  if (t < ridge2) return LAN.mountD
  if (t < ridge) return LAN.mount
  return LAN.sky
}

function lannaSurfaces(L: HallLayout): RoomSurfaces {
  const s = L.s
  const { glow, vig } = roomLight(L, 80, 1)
  const wallH = L.backY - L.ceilY
  const zAltar = zAltarOf(L)
  const wv0 = 64 * s
  const wv1 = 116 * s
  const mistAt = (v: number, Z: number) => Math.max(0, 0.32 - v / (300 * s)) + Math.max(0, (Z - L.F * 0.8) / L.F) * 0.4
  const mistCache = new Map<string, string>()
  const withMist = (c: string, li: number, m: number, x: number, y: number) => {
    if (m <= 0.02) return shadeAt(c, li, x, y)
    const q = Math.min(6, Math.round(m * 10 + dth(x, y)))
    const key = c + q
    let mc = mistCache.get(key)
    if (!mc) mistCache.set(key, (mc = mix(c, LAN.mist, q / 10)))
    return shadeAt(mc, li + m * 0.4, x, y)
  }
  const stencil = (u: number, v: number, li: number, x: number, y: number, m: number) => {
    const p = laiKham(u, v, s)
    return withMist(p === 2 ? '#ffe08a' : p === 1 ? LAN.gold : LAN.black, p ? li * 0.95 : li, m, x, y)
  }
  return {
    ceiling(X, Z, k, x, y) {
      const li = (0.55 + 0.3 * glow(x, y)) * vig(x, y) - (k - 1) * 0.06
      if (fract(Z / (26 * s)) < 0.18) return shadeAt(LAN.red, li * 0.9, x, y)
      return stencil(X, Z, li, x, y, 0)
    },
    back(u, v, x, y) {
      const li = (0.66 + 0.4 * glow(x, y)) * vig(x, y)
      const m = mistAt(v, L.F) * 0.6
      const vt = wallH - v
      if (vt < 10 * s) return withMist(vt < 2 * s || vt > 8 * s ? LAN.gold : LAN.red, li, m, x, y)
      // High windows either side of the image: misty hills, a chedi on the right.
      const au = Math.abs(u)
      if (au > 51 * s && au < 64 * s && v > 92 * s && v < 150 * s) {
        const edge = Math.min(au - 51 * s, 64 * s - au, v - 92 * s, 150 * s - v)
        if (edge < 1.5 * s) return shadeAt(LAN.gold, li, x, y)
        return shadeAt(mountainView(u - Math.sign(u) * 57.5 * s, v, 92 * s, s, u > 0), 1.1, x, y)
      }
      if (v < 16 * s) return withMist(v > 14 * s ? LAN.gold : LAN.redD, li, m, x, y)
      return stencil(u, v, li, x, y, m)
    },
    side(Z, v, _dir, k, x, y) {
      const li = (0.6 + 0.22 * glow(x, y)) * vig(x, y) - (k - 1) * 0.1
      const m = mistAt(v, Z)
      for (const win of L.windows) {
        const dz = Math.abs(Z - win.z)
        if (dz < win.half && v > wv0 && v < wv1) {
          const edge = Math.min(win.half - dz, v - wv0, wv1 - v)
          if (edge < 1.8 * s / k) return shadeAt(LAN.red, 0.9, x, y)
          return shadeAt(mountainView(Z * 0.8, v, wv0, s, false), 1.15, x, y)
        }
      }
      if (v < 16 * s) return withMist(v > 14 * s ? LAN.gold : LAN.redD, li, m, x, y)
      return stencil(Z * 0.6, v, li, x, y, m)
    },
    floor(X, Z, k, x, y) {
      const li = (0.6 + 0.45 * glow(x, y)) * vig(x, y)
      const m = Math.max(0, (Z - L.F * 0.75) / L.F) * 0.8
      const cw = 16 * s
      if (Math.abs(X) < cw && Z < zAltar) {
        const ax = Math.abs(X)
        if (ax > cw - 1.4 * s) return shadeAt(LAN.black, li, x, y)
        if (ax > cw - 3.4 * s && ax < cw - 2.2 * s) return shadeAt(LAN.gold, li * 0.9, x, y)
        const pz = fract(Z / (14 * s))
        if (ax < 3 * s && Math.abs(pz - 0.5) < 0.12) return shadeAt(LAN.gold, li * 0.85, x, y)
        return withMist(LAN.carpet, li * 0.92, m * 0.5, x, y)
      }
      const fx = fract(X / (9 * s))
      if (Math.min(fx, 1 - fx) * 9 * s * k < 0.5) return shadeAt(LAN.seam, li, x, y)
      const plank = Math.floor(X / (9 * s))
      return withMist(hash2(plank, 8) > 0.5 ? LAN.floor : LAN.floorL, li * 0.9, m, x, y)
    },
  }
}

function bakeMountain(L: HallLayout): HallLayers {
  const { w, h, s, cx, seatY } = L
  const far = new Surface(w, h)
  far.ctx.putImageData(shadeRoom(L, lannaSurfaces(L)).img, 0, 0)
  drawArchBackdrop(far, cx, seatY, s, '#1c1414', '#b8862e')
  const mid = new Surface(w, h)
  drawRuenKaew(mid, cx, seatY, s, LANNA_RAMP, '#1c1414')
  drawBuddhaHD(mid, cx, seatY, s, 'lanna')
  drawThrone(mid, cx, seatY, s, { ramp: LANNA_RAMP, lacquer: LAN.red, waist: LAN.black, glass: ['#ffe08a', '#6aa8ff', '#fff4d0'] })
  const pal: PillarPal = { body: LAN.red, gold: LAN.gold, goldD: LAN.goldD, line: '#1c0808', style: 'lanna' }
  const fg = new Surface(w, h)
  for (const k of L.pillarsK.slice().sort((a, b) => a - b)) {
    const tgt = k < 1.45 ? mid : fg
    drawPillar(tgt, L, -L.pillarX, k, pal)
    drawPillar(tgt, L, L.pillarX, k, pal)
  }
  drawAltarSet(mid, L, LAN.black, 'gold')
  // Prayer banners (ตุง) hanging in front of the bays.
  for (const sx of [-1, 1]) {
    const k = 1.65
    const x = Math.round(cx + sx * 45 * s * k)
    drawTung(fg, x, 0, Math.round(seatY - 30 * s), Math.round(5 * s * k), sx > 0 ? 1 : 0)
  }
  floorReflection(L, far, mid.canvas, 0.1, 16 * s)
  // Morning mist pooling low in the hall.
  const ctx = far.ctx
  const grad = ctx.createLinearGradient(0, L.seatY - 40 * s, 0, L.backY + 50 * s)
  grad.addColorStop(0, 'rgba(228,236,242,0)')
  grad.addColorStop(0.6, 'rgba(228,236,242,0.14)')
  grad.addColorStop(1, 'rgba(228,236,242,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  const light = new Surface(w, h)
  bakeShafts(L, light, 64 * s, 116 * s, '#eef6ff', [-1, 1], 1.1)
  return { L, far: far.canvas, mid: mid.canvas, fg: fg.canvas, light: light.canvas, glow: '#ffd890', halo: '#fff0c0' }
}

// ---------------------------------------------------------------------------
// HOME — the player's own altar shelf (หิ้งพระ), warm evening room light.

const HOME = {
  wall: '#efd9b6',
  wallD: '#e2c69c',
  dot: '#e6a8a0',
  wood: '#8a5634',
  woodL: '#a86e42',
  woodD: '#5c3620',
  seam: '#3a2014',
  mat: '#dcc088',
  matD: '#bc9a5e',
  matStripe: '#5a8a6a',
  sky: '#ffc58e',
  skyT: '#c98aa8',
  curtain: '#8fc0a8',
  curtainD: '#5e9280',
}

function homeSurfaces(L: HallLayout, win: { x0: number; x1: number; v0: number; v1: number }): RoomSurfaces {
  const s = L.s
  const { glow, vig } = roomLight(L, 85, 1)
  const wains = 34 * s
  const matZ0 = L.F / 3.3
  const matZ1 = L.F / 1.55
  return {
    ceiling(_X, _Z, _k, x, y) {
      return shadeAt(HOME.wallD, 0.6, x, y)
    },
    back(u, v, x, y) {
      const li = (0.66 + 0.42 * glow(x, y)) * vig(x, y)
      if (u > win.x0 && u < win.x1 && v > win.v0 && v < win.v1) {
        const edge = Math.min(u - win.x0, win.x1 - u, v - win.v0, win.v1 - v)
        if (edge < 2 * s) return shadeAt(HOME.woodL, li * 1.05, x, y)
        if (Math.abs(u - (win.x0 + win.x1) / 2) < 0.8 * s || Math.abs(v - (win.v0 + win.v1) / 2) < 0.8 * s) return shadeAt(HOME.wood, li, x, y)
        // Evening sky with a few rooftops and a palm.
        const t = (v - win.v0) / (win.v1 - win.v0)
        const roof = 14 * s + (fract(u / (22 * s)) < 0.5 ? 6 * s : 0) - Math.abs(fract(u / (22 * s)) - 0.25) * 10 * s
        if (v - win.v0 < roof) return shadeAt('#7a5a7a', 0.9, x, y)
        return shadeAt(t > 0.7 ? HOME.skyT : t > 0.45 ? mix(HOME.sky, HOME.skyT, 0.4) : HOME.sky, 1.05, x, y)
      }
      // Curtains either side of the window.
      if (v > win.v0 - 4 * s && v < win.v1 + 6 * s && ((u > win.x0 - 9 * s && u <= win.x0) || (u >= win.x1 && u < win.x1 + 9 * s))) {
        const fold = Math.sin(u * 1.3) > 0.2
        if (v > win.v1 + 3 * s) return shadeAt(HOME.woodD, li, x, y)
        return shadeAt(fold ? HOME.curtain : HOME.curtainD, li * 1.05, x, y)
      }
      if (v < wains) {
        if (v > wains - 2 * s) return shadeAt(HOME.woodL, li, x, y)
        if (v < 3 * s) return shadeAt(HOME.woodD, li * 0.8, x, y)
        return shadeAt(fract(u / (9 * s)) < 0.1 ? HOME.woodD : HOME.wood, li * 0.95, x, y)
      }
      const gu = u / (11 * s)
      const gv = v / (11 * s)
      const du = fract(gu + (Math.floor(gv) & 1) * 0.5) - 0.5
      const dv = fract(gv) - 0.5
      if (du * du + dv * dv < 0.012) return shadeAt(HOME.dot, li, x, y)
      if (Math.abs(du) < 0.03 && Math.abs(dv) < 0.2) return shadeAt(HOME.wallD, li, x, y)
      return shadeAt(HOME.wall, li, x, y)
    },
    side(_Z, _v, _dir, _k, x, y) {
      return shadeAt(HOME.wallD, 0.7, x, y)
    },
    floor(X, Z, k, x, y) {
      const li = (0.66 + 0.4 * glow(x, y)) * vig(x, y)
      const mw = 30 * s
      if (Math.abs(X) < mw && Z > matZ0 && Z < matZ1) {
        const ax = Math.abs(X)
        if (ax > mw - 1.2 * s || Z < matZ0 + 1.5 * s || Z > matZ1 - 1.5 * s) return shadeAt(HOME.matD, li * 0.85, x, y)
        if (ax > mw - 4.5 * s && ax < mw - 3 * s) return shadeAt(HOME.matStripe, li, x, y)
        const wv = (Math.floor(X / (2.2 * s)) + Math.floor(Z / (2.2 * s))) & 1
        return shadeAt(wv ? HOME.mat : HOME.matD, li * 0.95, x, y)
      }
      const fx = fract(X / (11 * s))
      if (Math.min(fx, 1 - fx) * 11 * s * k < 0.55) return shadeAt(HOME.seam, li, x, y)
      const plank = Math.floor(X / (11 * s))
      return shadeAt(hash2(plank, 1) > 0.5 ? HOME.wood : HOME.woodL, li * 0.92 + 0.05 * Math.sin(Z * 0.2 + plank), x, y)
    },
  }
}

function bakeHome(L: HallLayout): HallLayers {
  const { w, h, s, cx, seatY, backY } = L
  const sb = Math.round(s * 0.5 * 40) / 40
  const win = { x0: -Math.round(w / 2 - 6 * s) + 0, x1: -Math.round(w / 2 - 6 * s) + Math.round(34 * s), v0: 76 * s, v1: 132 * s }
  if (w / 2 > 110 * s) {
    win.x0 = -Math.round(96 * s)
    win.x1 = -Math.round(62 * s)
  }
  const far = new Surface(w, h)
  far.ctx.putImageData(shadeRoom(L, homeSurfaces(L, win)).img, 0, 0)
  const mid = new Surface(w, h)
  // The shelf (หิ้ง) with carved brackets.
  const shelfY = Math.round(seatY + 47 * sb)
  const shw = Math.round(64 * s)
  const r = (v: number) => Math.round(v)
  // Carved teak backboard with a small gilded arch.
  mid.rect(cx - r(34 * s), r(seatY - 70 * s), r(68 * s), shelfY - r(seatY - 70 * s), lit(HOME.woodD, 5))
  mid.frame(cx - r(34 * s), r(seatY - 70 * s), r(68 * s), shelfY - r(seatY - 70 * s), G[3])
  mid.frame(cx - r(34 * s) + 2, r(seatY - 70 * s) + 2, r(68 * s) - 4, shelfY - r(seatY - 70 * s) - 4, G[1])
  drawArchBackdrop(mid, cx, seatY, sb, '#4a1a20', '#b8742a')
  drawRuenKaew(mid, cx, seatY, sb, G, '#4a1a20')
  drawBuddhaHD(mid, cx, seatY, sb, 'sukhothai')
  const foot = drawThrone(mid, cx, seatY, sb, { ramp: G, lacquer: '#8a1e2c', waist: '#4a0c18', glass: ['#5ad0a0', '#6aa8ff', '#fff4d0'] })
  // Shelf board and brackets.
  mid.rect(cx - shw, foot, shw * 2, r(4 * s), HOME.woodL)
  mid.rect(cx - shw, foot, shw * 2, 1, lit(HOME.woodL, 8))
  mid.rect(cx - shw, foot + r(4 * s), shw * 2, r(2 * s), HOME.woodD)
  mid.frame(cx - shw - 1, foot - 1, shw * 2 + 2, r(6 * s) + 2, HOME.seam)
  for (const sx of [-1, 1]) {
    const bx = r(cx + sx * shw * 0.72)
    for (let j = 0; j < r(14 * s); j++) {
      const hw = Math.max(1, r((14 * s - j) * 0.45))
      mid.rect(sx < 0 ? bx - 1 : bx - hw + 1, foot + r(6 * s) + j, hw, 1, j % 3 === 0 ? HOME.woodL : HOME.wood)
    }
  }
  // Offerings on the shelf.
  for (const sx of [-1, 1]) {
    const px = r(cx + sx * 44 * s)
    const pan = drawCandlestick(mid, px, foot, s)
    const [fx, fy] = drawCandleHD(mid, px, pan, r(10 * s), s)
    L.flames.push({ x: fx, y: fy, size: 1, order: sx < 0 ? 0.15 : 0.3 })
    drawVaseOfFlowers(mid, r(cx + sx * 30 * s), foot, s * 0.8, sx < 0 ? 'lotus' : 'orchid', 'porcelain', 2)
  }
  L.incense.push(...drawIncenseBowl(mid, cx, foot + 1, s * 0.75).map(([x, y]) => ({ x, y })))
  // A glass of water and a plate of bananas.
  const gx = r(cx + 16 * s)
  mid.rect(gx - 2, foot - r(5 * s), 4, r(5 * s), '#cfe8f0')
  mid.rect(gx - 2, foot - r(3 * s), 4, r(3 * s), '#9fd0e8')
  mid.frame(gx - 3, foot - r(5 * s) - 1, 6, r(5 * s) + 1, '#5a7a8a')
  const bx = r(cx - 17 * s)
  mid.ellipse(bx, foot - 1, 5 * s, 1.4 * s, '#e8e0d0')
  for (let i = 0; i < 3; i++) {
    mid.thickLine(bx - 3 * s, foot - 2 - i, bx + 3 * s, foot - 3 - i * 1.5, 1.6, i % 2 ? '#ffe45e' : '#f5c83a')
  }
  // Garlands hanging from the shelf edge.
  for (const sx of [-1, 0, 1]) drawGarland(mid, r(cx + sx * 22 * s), foot + r(5 * s), r(6 * s), r(3 * s), s, sx === 0 ? '#e0344a' : '#f59a2a')
  // Tri-colour cloth tied at the shelf ends.
  for (const sx of [-1, 1]) {
    const x = r(cx + sx * (shw - 2))
    ;['#e8709e', '#ffd23f', '#6cc36a'].forEach((c, i) => mid.rect(x + i - 1, foot + r(4 * s), 1, r(14 * s) - i * 2, c))
  }
  // A potted plant by the wall and a sleeping cat on the floor.
  const potX = r(cx + Math.min(w / 2 - 14 * s, 82 * s))
  const potY = r(backY + 10 * s)
  mid.rect(potX - r(6 * s), potY - r(10 * s), r(12 * s), r(10 * s), '#c46a3a')
  mid.rect(potX - r(7 * s), potY - r(11 * s), r(14 * s), r(2 * s), '#e0864a')
  mid.frame(potX - r(7 * s) - 1, potY - r(11 * s) - 1, r(14 * s) + 2, r(11 * s) + 1, HOME.seam)
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42
    const len = (22 + (i % 3) * 7) * s
    const ex = potX + Math.cos(a) * len * 0.8
    const ey = potY - r(11 * s) + Math.sin(a) * len
    mid.line(potX, potY - r(11 * s), ex, ey, LEAF[1])
    mid.ellipse(ex, ey, 4.4 * s, 2.4 * s, LEAF[0])
    mid.ellipse(ex, ey, 3.8 * s, 1.9 * s, i % 2 ? LEAF[2] : LEAF[1])
    mid.px(ex - 1, ey - 1, LEAF[3])
  }
  const cat = catSprite('sleep', '#f5a55a')
  const catY = Math.round(floorAt(L, 1.45))
  mid.ctx.globalAlpha = 0.3
  mid.ellipse(potX - 24 * s, catY, cat.w * 1.1, 2, '#1a0b13')
  mid.ctx.globalAlpha = 1
  mid.drawScaled(cat.canvas, Math.round(potX - 24 * s - cat.w), catY - cat.h * 2 + 1, 2)
  L.worshippers = []
  L.flames.sort((a, b) => a.order - b.order)
  // Window light falling across the room.
  const light = new Surface(w, h)
  const E0 = L.backY - L.vpY
  const acc = new Float32Array(w * h)
  const wc: [number, number][] = [
    [cx + win.x0, backY - win.v1],
    [cx + win.x1, backY - win.v1],
    [cx + win.x1, backY - win.v0],
    [cx + win.x0, backY - win.v0],
  ]
  const off: [number, number] = [70 * s, E0 * 1.9]
  const poly = hull([...wc, ...wc.map(([x, y]) => [x + off[0], y + off[1]] as [number, number])])
  L.shafts.push(poly)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inPoly(poly, x + 0.5, y + 0.5)) continue
      const prog = (y - wc[0][1]) / off[1]
      acc[y * w + x] = 0.55 - Math.max(0, prog) * 0.3
    }
  const buf = new PixBuf(w, h)
  const col = cint('#ffd9a0') & 0xffffff
  for (let k = 0; k < acc.length; k++) if (acc[k] > 0) buf.data[k] = ((((Math.round(acc[k] * 7) / 7) * 255) << 24) | col) >>> 0
  light.ctx.putImageData(buf.img, 0, 0)
  const fg = new Surface(w, h)
  return { L, far: far.canvas, mid: mid.canvas, fg: fg.canvas, light: light.canvas, glow: '#ffc880', halo: '#ffe7a0' }
}

// ---------------------------------------------------------------------------
// SHRINE — an open-air deity shrine (ศาล) at golden hour.

const R_PINK = ['#4a1a26', '#8a3448', '#b84e66', '#d86a82', '#ec8a9e', '#f7a8b8', '#ffc4d0', '#ffdce4', '#fff4f6'] as const
const R_PALE = ['#5a3428', '#9a6450', '#c88c70', '#e2aa8c', '#f2c4a6', '#fcd9c0', '#ffe8d6', '#fff4ea', '#ffffff'] as const
const R_SKIN = ['#4a2418', '#8a4a30', '#b86e4c', '#d68e68', '#eaa882', '#f6c29e', '#ffd8ba', '#ffeada', '#fff8f0'] as const
const R_WHITE = ['#3a3448', '#6a6480', '#9a94ac', '#bdb8cc', '#d8d4e2', '#ebe8f0', '#f6f4f8', '#ffffff', '#ffffff'] as const
const R_SARI = ['#3a0818', '#6e1030', '#a01c44', '#c82c58', '#e0486e', '#f0708c', '#fa9cb0', '#ffc8d4', '#fff0f4'] as const
const R_YELLOW = ['#4a2808', '#7a4410', '#a86418', '#d08a20', '#eaa82a', '#f8c440', '#ffda6a', '#ffec9e', '#fffadc'] as const
const R_IVORY = ['#4a3a2a', '#8a7a66', '#b8a890', '#d8ccb4', '#ece2cc', '#f6f0e0', '#fffaf0', '#ffffff', '#ffffff'] as const
const R_HAIR = ['#120a10', '#1e1420', '#2a1e2e', '#3a2c3e', '#4a3a50', '#5c4a62', '#705e78', '#8a7890', '#a898b0'] as const
const R_ORANGE = ['#4a1a08', '#8a3410', '#c05a18', '#e07a20', '#f59a2a', '#ffb84a', '#ffd070', '#ffe8a8', '#fff8e0'] as const
const R_LOTUS = ['#5a1a30', '#8a2848', '#b83e68', '#d85a84', '#ec7aa0', '#f79cba', '#ffbcd2', '#ffd8e6', '#fff0f6'] as const

type Deco = (d: SculptDetail) => void

function deityModel(id: ShrineDeity): { prims: Prim[]; ramps: (readonly string[])[]; detail: Deco; top: number } {
  if (id === 'ganesha') {
    // 0 skin, 1 gold, 2 dhoti, 3 ivory, 4 laddu, 5 lotus
    const prims: Prim[] = [
      ...M(2, E(0, 6, 0, 20, 6.5, 10, 1, 0), E(-16, 5, 2, 7, 5.5, 8, 1, 0), E(16, 5, 2, 7, 5.5, 8, 1, 0)),
      ...M(0, E(0, 17, 3, 12.5, 10, 10, 2), E(0, 27, 0, 12.5, 7, 8, 2)),
      ...M(0, C([-11, 29, 0], [11, 29, 0], 4, 4, 2, undefined, 0.9)),
      ...M(0, E(-11.5, 37, -3, 7.5, 8.5, 3, 3), E(11.5, 37, -3, 7.5, 8.5, 3, 3)),
      ...M(0, E(0, 38, 2, 8.5, 8, 8, 4)),
      ...M(0, C([0, 34, 8], [-1.5, 28, 10.5], 3, 2.6, 5), C([-1.5, 28, 10.5], [-4, 22.5, 11.5], 2.6, 2.1, 5), C([-4, 22.5, 11.5], [-2.2, 18.5, 12.5], 2.1, 1.5, 5)),
      ...M(3, C([2.8, 33, 8.5], [4.8, 29.5, 9.5], 1.2, 0.6, 6)),
      ...M(1, E(0, 45.5, 2, 8, 2.2, 7, 7), C([0, 46, 1], [0, 61, 1], 6.2, 1, 7), E(0, 62, 1, 1.6, 1.6, 1.6, 7)),
      // Arms: raised pair with lotus and axe, blessing hand and a sweet.
      ...M(0, C([-12, 30, 0], [-18, 34, 1], 3.2, 2.8, 8), C([-18, 34, 1], [-17, 42, 2], 2.8, 2.3, 8)),
      ...M(0, C([12, 30, 0], [18, 34, 1], 3.2, 2.8, 9), C([18, 34, 1], [17, 42, 2], 2.8, 2.3, 9)),
      ...M(5, E(-17, 45, 3, 3, 2.6, 2.6, 10)),
      ...M(1, C([17, 40, 3], [17, 50, 3], 0.8, 0.8, 11), E(19, 49, 3, 2.6, 1.6, 1, 11)),
      ...M(0, C([-12, 25, 2], [-16.5, 18, 7], 3.3, 2.8, 12), E(-16.5, 15.5, 8.5, 2.4, 3.2, 2.4, 12)),
      ...M(0, C([12, 25, 2], [15.5, 17, 7], 3.3, 2.8, 13), E(14, 14.5, 9, 3, 2, 2.6, 13)),
      ...M(4, E(14, 16.5, 10, 2.8, 2.8, 2.8, 14)),
    ]
    const detail: Deco = (d) => {
      // Eyes, tilak, necklace, belly band, ear insides.
      for (const ex of [-3.2, 3.2]) {
        const [i, j] = d.px(ex, 39.5)
        d.set(i, j, 1)
        d.set(i + (ex < 0 ? -1 : 1), j - 1, 2)
      }
      const [ti, tj] = d.px(0, 43)
      d.paint(ti, tj, 4, 3)
      d.paint(ti, tj + 1, 4, 4)
      d.each((i, j, lx, ly, part) => {
        if (part === 3 && Math.hypot((Math.abs(lx) - 12) / 4.5, (ly - 37) / 5.5) < 1) d.paint(i, j, 5, d.tone(i, j) - 1)
        if (part === 2 && Math.abs(ly - (29 - 0.02 * lx * lx - 2)) < 0.7 && Math.abs(lx) < 9) d.paint(i, j, 1, 7)
        if (part === 2 && Math.abs(ly - 9.5) < 0.8 && Math.abs(lx) < 11) d.paint(i, j, 1, 6)
      })
      d.line(-4, 25, 4, 25, -1)
    }
    return { prims, ramps: [R_PINK, GOLD_RAMP, R_YELLOW, R_IVORY, R_ORANGE, R_LOTUS], detail, top: 64 }
  }
  if (id === 'guanyin') {
    // 0 skin, 1 white robe, 2 gold, 3 porcelain, 4 hair, 5 lotus
    const prims: Prim[] = [
      ...M(1, E(0, 6, 0, 21, 6.5, 10, 1, 0), E(-16, 5, 2, 7, 5.5, 8, 1, 0), E(16, 5, 2, 7, 5.5, 8, 1, 0)),
      ...M(1, C([0, 9, 0], [0, 32, 0], 12, 10.5, 2, undefined, 0.7), C([-9, 34, 0], [9, 34, 0], 4.5, 4.5, 2, undefined, 0.9)),
      ...M(1, E(0, 46, -2, 9.5, 11, 5, 3), E(0, 36, -1, 12, 6, 5, 3)),
      ...M(0, C([0, 36, 1], [0, 40, 1], 3, 3, 4), E(0, 45, 2.5, 6.4, 7.4, 6.5, 4)),
      ...M(1, E(0, 49.6, 2.2, 7.4, 4.8, 7, 3), E(0, 53.5, 1, 4.6, 3.4, 4.4, 3)),
      ...M(2, E(0, 52.6, 6.8, 2.2, 1.8, 1.6, 6)),
      ...M(1, C([-11, 33, 1], [-7, 23, 8], 3.6, 3.2, 7), C([11, 33, 1], [7, 23, 8], 3.6, 3.2, 7)),
      ...M(0, E(0, 23, 10, 4.6, 2.6, 3, 8)),
      ...M(3, C([1.5, 24, 12], [1.5, 31, 12], 2.4, 1.2, 9), E(1.5, 31.5, 12, 1.6, 0.8, 1.6, 9)),
    ]
    const detail: Deco = (d) => {
      d.curve(-4.6, -1.6, (x) => 45.6 - 0.1 * (x + 3) * (x + 3), -3)
      d.curve(1.6, 4.6, (x) => 45.6 - 0.1 * (x - 3) * (x - 3), -3)
      d.line(-1.2, 41.6, 1.2, 41.6, -2)
      const [bi, bj] = d.px(0, 48)
      d.paint(bi, bj, 5, 4)
      // Willow sprig from the vase.
      d.line(1.5, 32, -2.5, 37, -3)
      d.each((i, j, lx, ly, part) => {
        if (part === 2 && Math.abs(lx + (ly - 30) * 0.5) < 0.6 && ly < 32 && ly > 12) d.add(i, j, -1)
        if (part === 3 && Math.abs(Math.hypot(lx, (ly - 46) * 0.86) - 8.4) < 0.7) d.paint(i, j, 2, 6)
      })
    }
    return { prims, ramps: [R_PALE, R_WHITE, GOLD_RAMP, PORCELAIN, R_HAIR, R_LOTUS], detail, top: 58 }
  }
  // Lakshmi: 0 skin, 1 gold, 2 sari, 3 hair, 4 lotus
  const prims: Prim[] = [
    ...M(2, E(0, 6, 0, 20, 6.5, 10, 1, 0), E(-16, 5, 2, 7, 5.5, 8, 1, 0), E(16, 5, 2, 7, 5.5, 8, 1, 0)),
    ...M(2, C([0, 9, 0], [0, 30, 0], 10.5, 11, 2, undefined, 0.62), C([-10, 32, 0], [10, 32, 0], 4, 4, 2, undefined, 0.9)),
    ...M(3, E(0, 41, -2.5, 8, 9, 5, 3), C([-5, 38, -2], [-6, 28, -2], 2.4, 2, 3), C([5, 38, -2], [6, 28, -2], 2.4, 2, 3)),
    ...M(0, C([0, 33, 1], [0, 37, 1], 2.8, 2.8, 4), E(0, 40.5, 2.5, 6.2, 7, 6.5, 4)),
    ...M(1, E(0, 46.5, 2, 6.6, 2, 6, 5), C([0, 47, 1.5], [0, 57, 1.5], 5, 0.9, 5), E(0, 58, 1.5, 1.4, 1.4, 1.4, 5)),
    ...M(0, C([-10, 31, -1], [-15.5, 34, -1], 2.6, 2.2, 6), C([-15.5, 34, -1], [-15, 39.5, 0], 2.2, 1.9, 6)),
    ...M(0, C([10, 31, -1], [15.5, 34, -1], 2.6, 2.2, 7), C([15.5, 34, -1], [15, 39.5, 0], 2.2, 1.9, 7)),
    ...M(4, E(-15.2, 42.4, 1, 3.3, 3.1, 3, 8), E(15.2, 42.4, 1, 3.3, 3.1, 3, 8)),
    ...M(0, C([-10.5, 29, 2], [-13, 21, 6], 3, 2.6, 9), C([-13, 21, 6], [-8, 25, 10], 2.5, 2.1, 9), E(-7.5, 27.5, 10.5, 2, 2.8, 2, 9)),
    ...M(0, C([10.5, 29, 2], [13, 21, 6], 3, 2.6, 10), C([13, 21, 6], [10, 14.5, 10], 2.5, 2.1, 10), E(9.5, 12.5, 10.5, 2.4, 2, 2.2, 10)),
    ...M(1, E(9.5, 9.5, 11, 1.6, 0.9, 1.6, 11), E(8, 8, 11.5, 1.6, 0.9, 1.6, 11), E(11, 8, 11.5, 1.6, 0.9, 1.6, 11)),
  ]
  const detail: Deco = (d) => {
    d.curve(-4.2, -1.4, (x) => 41 - 0.1 * (x + 2.8) * (x + 2.8), -3)
    d.curve(1.4, 4.2, (x) => 41 - 0.1 * (x - 2.8) * (x - 2.8), -3)
    d.line(-1.1, 37.2, 1.1, 37.2, -2)
    const [bi, bj] = d.px(0, 43.4)
    d.paint(bi, bj, 2, 3)
    d.each((i, j, lx, ly, part) => {
      // Gold sari border and necklace.
      if (part === 2 && Math.abs(ly - (22 + lx * 0.55)) < 0.7 && Math.abs(lx) < 10) d.paint(i, j, 1, 6)
      if (part === 1 && ly > 11.5 && ly < 12.6) d.paint(i, j, 1, 6)
      if (part === 2 && Math.abs(ly - (31.5 - 0.03 * lx * lx)) < 0.6 && Math.abs(lx) < 7) d.paint(i, j, 1, 7)
    })
  }
  return { prims, ramps: [R_SKIN, GOLD_RAMP, R_SARI, R_HAIR, R_LOTUS], detail, top: 60 }
}

const deityCache = new Map<string, Sculpted>()
export function deitySculpt(id: ShrineDeity, s: number): Sculpted {
  const q = Math.round(s * 40) / 40
  const key = `${id}:${q}`
  let r = deityCache.get(key)
  if (!r) {
    const m = deityModel(id)
    r = sculpt({ prims: m.prims, s: q, x0: -26, x1: 26, y0: -1, y1: m.top + 2, ramps: m.ramps, rim: 0.3, ambient: 0.2, spec: [14, 0.35], gloss: [0.5, 1.3, 0.3, 0.6, 0.4, 0.4], outline: '#2a1420', detail: m.detail })
    deityCache.set(key, r)
  }
  return r
}

const DUSK_SKY = ['#2a2a62', '#48407e', '#7a5494', '#b86a98', '#e8849a', '#ffa888', '#ffc890', '#ffe0a8']

function bakeShrine(L: HallLayout, deity: ShrineDeity): HallLayers {
  const { w, h, s, cx, seatY, backY, vpY } = L
  const r = (v: number) => Math.round(v)
  const E0 = backY - vpY
  const buf = new PixBuf(w, h)
  const sunX = cx
  // Sky, distant roofs and a warm stone plaza.
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let c: number
      if (y < vpY) {
        const t = y / vpY
        const skyL = t * (DUSK_SKY.length - 1) + dth(x, y) * 0.9
        const hex = DUSK_SKY[Math.max(0, Math.min(DUSK_SKY.length - 1, Math.round(skyL)))]
        const u = x - cx
        const far = vpY - y
        // Distant temple roofs and chedi spires.
        const bump = 10 * s + 6 * s * Math.sin(u * 0.05 + 1) + (Math.abs(fract(u / (34 * s)) - 0.5) < 0.05 ? 22 * s * (1 - Math.abs(fract(u / (34 * s)) - 0.5) * 20) : 0)
        const trees = 5 * s + 4 * s * Math.abs(Math.sin(u * 0.13)) + 3 * s * Math.sin(u * 0.41)
        if (far < trees) c = shadeAt('#4a3458', 1, x, y)
        else if (far < bump) c = shadeAt('#6e4e7c', 1, x, y)
        else if (t < 0.25 && hash2(x, y) > 0.992) c = cint('#fff3d0')
        else c = litInt(hex, 6)
        const sd = Math.hypot(x - sunX, (y - vpY + 8 * s) * 1.1)
        if (far >= bump && sd < 60 * s) c = litInt(hex, 6 + Math.round((1 - sd / (60 * s)) * 2 + dth(x, y) * 0.6))
      } else {
        const k = (y + 0.5 - vpY) / E0
        const X = (x + 0.5 - cx) / k
        const Z = L.F / k
        const li = 0.95 - Math.min(0.4, (k - 1) * 0.1) + 0.25 * Math.exp(-(X * X) / (2 * (40 * s) ** 2)) * Math.min(1, 2 / k)
        const path = Math.abs(X) < 20 * s
        const ts = (path ? 14 : 18) * s
        const fx = fract(X / ts + (path ? 0.5 : 0))
        const fz = fract(Z / ts + (Math.floor(X / ts) & 1) * 0.5)
        const seam = Math.min(fx, 1 - fx) * ts * k < 0.55 || Math.min(fz, 1 - fz) * ts * k * 0.3 < 0.45
        const hex = seam ? '#6a4a52' : path ? '#d8b8a0' : hash2(Math.floor(X / ts), Math.floor(Z / ts)) > 0.5 ? '#b8948a' : '#aa8a84'
        c = shadeAt(hex, li, x, y)
      }
      buf.data[y * w + x] = c
    }
  const far = new Surface(w, h)
  far.ctx.putImageData(buf.img, 0, 0)
  const mid = new Surface(w, h)
  // Pavilion inner wall: deep red with a golden aura panel.
  const roofY = r(seatY - 88 * s)
  const colX = r(46 * s)
  far.rect(cx - colX, roofY, colX * 2, backY - r(14 * s) - roofY, '#5a1420')
  drawArchBackdrop(far, cx, seatY, s * 0.82, '#6a1a28', '#d8a040')
  // Stepped platform and a white-marble lotus throne.
  let y = backY
  for (let i = 0; i < 3; i++) {
    const sw = r((96 - i * 10) * s)
    const sh = r(5 * s)
    mid.rect(cx - sw / 2, y - sh, sw, sh, lit('#e8dcd0', 6 - i * 0))
    mid.rect(cx - sw / 2, y - sh, sw, 1, '#fffaf0')
    mid.rect(cx - sw / 2, y - 1, sw, 1, '#9a8a8a')
    mid.frame(cx - sw / 2 - 1, y - sh - 1, sw + 2, sh + 2, '#4a3440')
    y -= sh
  }
  const ts = s * 0.62
  const thrTop = y - r(47 * ts)
  drawThrone(mid, cx, thrTop, ts, { ramp: GOLD_RAMP, lacquer: '#e8dcd0', waist: '#b83a4a', glass: ['#5ad0a0', '#6aa8ff', '#fff4d0'] })
  const ds = Math.round(s * 1.08 * 40) / 40
  const dz = deitySculpt(deity, ds)
  mid.draw(dz.canvas, cx - dz.ox, thrTop - dz.oy)
  L.seatY = thrTop
  const model = { ganesha: 38, guanyin: 45, lakshmi: 40.5 }[deity]
  L.headY = r(thrTop - model * ds)
  L.heartY = r(thrTop - 22 * ds)
  L.haloR = r(24 * s)
  // Columns and the tiered Thai roof with chofa finials.
  for (const sx of [-1, 1]) {
    const x = cx + sx * colX
    const cw = Math.max(3, r(4 * s))
    mid.rect(x - cw / 2 - 1, roofY, cw + 2, backY - r(15 * s) - roofY, '#2a0c14')
    mid.rect(x - cw / 2, roofY, cw, backY - r(15 * s) - roofY, '#b8303a')
    mid.rect(x - cw / 2, roofY, 1, backY - r(15 * s) - roofY, '#e0585a')
    for (let yy = roofY + r(8 * s); yy < backY - r(18 * s); yy += r(9 * s)) mid.rect(x - cw / 2, yy, cw, 1, G[6])
    mid.rect(x - cw / 2 - 1, backY - r(19 * s), cw + 2, r(4 * s), G[4])
    mid.rect(x - cw / 2 - 1, roofY + 1, cw + 2, r(3 * s), G[5])
  }
  for (let t = 0; t < 3; t++) {
    const ty = roofY - t * r(11 * s)
    const half = r((60 - t * 14) * s)
    const th = r(12 * s)
    for (let j = 0; j < th; j++) {
      const f = j / th
      const hw = r(half * (0.62 + 0.38 * f))
      const yy = ty - th + j
      mid.rect(cx - hw - 1, yy, hw * 2 + 3, 1, '#2a0c14')
      for (let xx = -hw; xx <= hw; xx++) {
        const tile = (xx + j * 2) % 5 === 0 || j % 3 === 0
        mid.px(cx + xx, yy, j >= th - 2 ? G[5] : tile ? '#8a1e28' : xx < 0 ? '#c8383c' : '#b02c34')
      }
    }
    // Upturned eave ends (ช่อฟ้า / หางหงส์).
    for (const sx of [-1, 1]) {
      const ex = cx + sx * half
      mid.line(ex, ty - 1, ex + sx * 4 * s, ty - 7 * s, G[5])
      mid.line(ex + sx, ty - 1, ex + sx * (4 * s + 1), ty - 7 * s, G[2])
      mid.px(r(ex + sx * 4 * s), r(ty - 8 * s), G[7])
    }
    // Gable ornament.
    mid.ellipse(cx, ty - th * 0.45, 5 * s, 3 * s, G[4])
    mid.ellipse(cx, ty - th * 0.5, 3 * s, 1.6 * s, G[7])
  }
  const spireB = roofY - 2 * r(11 * s) - r(12 * s)
  for (let j = 0; j < r(26 * s); j++) {
    const hw = Math.max(0, r(3.4 * s * (1 - j / (26 * s))))
    mid.rect(cx - hw - 1, spireB - j, hw * 2 + 3, 1, G[0])
    mid.rect(cx - hw, spireB - j, hw * 2 + 1, 1, j % 4 === 0 ? G[7] : G[5])
  }
  // Marigold and rose garlands along the eaves.
  for (let i = -2; i <= 2; i++) drawGarland(mid, r(cx + i * 18 * s), roofY + r(2 * s), r(8 * s), r(5 * s), s, i % 2 ? '#e0344a' : '#f59a2a')
  for (let i = -2; i <= 2; i++) {
    const gx0 = r(cx + i * 18 * s)
    for (let q = -r(8 * s); q <= r(8 * s); q++) {
      const tt = q / (8 * s)
      mid.px(gx0 + q, r(roofY + 2 * s + (1 - tt * tt) * 5 * s), (q & 1) === 0 ? '#f59a2a' : '#ffc040')
    }
  }
  // Tall parasols either side.
  for (const sx of [-1, 1]) drawChatra(mid, r(cx + sx * 64 * s), backY + r(6 * s), r(seatY - 70 * s), s, '#f6eedc')
  // Offering table (red cloth) with the deity's favourite gifts.
  const tTop = r(L.altarY - 14 * s)
  const tw = r(70 * s)
  mid.rect(cx - tw / 2 - 1, tTop - 1, tw + 2, L.altarY - tTop + 1, '#2a0c14')
  mid.rect(cx - tw / 2, tTop, tw, L.altarY - tTop, '#b8243a')
  mid.rect(cx - tw / 2, tTop, tw, 1, '#e8506a')
  for (let x = cx - tw / 2; x < cx + tw / 2; x += 2) mid.px(x, L.altarY - 3, G[6])
  for (const sx of [-1, 1]) {
    const px = r(cx + sx * 30 * s)
    const pan = drawCandlestick(mid, px, tTop, s)
    const [fx, fy] = drawCandleHD(mid, px, pan, r(8 * s), s)
    L.flames.push({ x: fx, y: fy, size: 1, order: sx < 0 ? 0.1 : 0.2 })
  }
  drawOfferings(mid, deity, cx, tTop, s)
  // Big bronze incense urns on the plaza with thick bundles of sticks.
  for (const sx of [-1, 1]) {
    const ux = r(cx + sx * 50 * s)
    const uy = r(L.altarY + 12 * s)
    const tips = drawIncenseBowl(mid, ux, uy, s * 1.3)
    for (const [tx, ty] of tips) L.incense.push({ x: tx, y: ty })
    for (let i = 0; i < 4; i++) {
      const tx = r(ux + (i - 1.5) * 2 * s)
      const ty = r(uy - 9 * s * 1.3 - (8 + (i % 2) * 3) * s)
      mid.line(tx, r(uy - 9.8 * s), tx, ty, '#a0302a')
      L.incense.push({ x: tx, y: ty })
    }
  }
  // String lights: sagging strands from the roof to the edges of the frame.
  const bulbCols = ['#fff0c0', '#ff9fc0', '#ffd35a', '#9fe0a0', '#9fd0ff']
  let bi = 0
  for (const sx of [-1, 1]) {
    const ax = cx + sx * r(60 * s)
    const ay = roofY - 2
    const bx = sx < 0 ? -4 : w + 4
    const by = r(roofY - 30 * s)
    const n = Math.max(6, Math.round(Math.abs(bx - ax) / (5 * s)))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = ax + (bx - ax) * t
      const yy = ay + (by - ay) * t + Math.sin(t * Math.PI) * 14 * s
      const px = r(x)
      const py = r(yy)
      mid.px(px, py - 1, '#2a1420')
      if (i % 2 === 0 && px >= 0 && px < w) L.bulbs.push({ x: px, y: py, c: bulbCols[bi++ % bulbCols.length] })
    }
  }
  L.worshippers = L.worshippers.map((p, i) => ({ x: p.x + (i ? 6 : -6) * s, y: p.y }))
  const fg = new Surface(w, h)
  const light = new Surface(w, h)
  // Low golden sunlight washing across the plaza.
  const acc = new PixBuf(w, h)
  const col = cint('#ffd28a') & 0xffffff
  for (let yy = vpY; yy < h; yy++)
    for (let x = 0; x < w; x++) {
      const band = Math.sin((x - yy * 0.6) * 0.045) * 0.5 + 0.5
      const a = band > 0.72 ? 0.35 * (1 - (yy - vpY) / (h - vpY)) : 0
      if (a > 0.02) acc.data[yy * w + x] = ((((Math.round(a * 7) / 7) * 255) << 24) | col) >>> 0
    }
  light.ctx.putImageData(acc.img, 0, 0)
  L.shafts.push([
    [0, vpY],
    [w, vpY],
    [w, backY + 30 * s],
    [0, backY + 30 * s],
  ])
  return { L, far: far.canvas, mid: mid.canvas, fg: fg.canvas, light: light.canvas, glow: '#ffc070', halo: deity === 'guanyin' ? '#d4f1ff' : deity === 'lakshmi' ? '#ffc4d8' : '#ffd6a0' }
}

/** Deity-specific offerings on the table top at y. */
function drawOfferings(g: Surface, deity: ShrineDeity, cx: number, y: number, s: number) {
  const r = (v: number) => Math.round(v)
  // Fruit plate.
  const fx = r(cx - 14 * s)
  g.ellipse(fx, y - 1, 7 * s, 1.6 * s, '#f0e8dc')
  g.circle(fx - 3 * s, y - 3 * s, 2.2 * s, '#f59a2a')
  g.circle(fx + 2 * s, y - 3 * s, 2.2 * s, '#ffb84a')
  g.circle(fx, y - 5.5 * s, 2 * s, '#f59a2a')
  g.px(fx - 1, r(y - 6.5 * s), '#ffe0a0')
  if (deity === 'ganesha') {
    // Red soda with straws, laddu and little elephant figurines.
    for (let i = 0; i < 3; i++) {
      const bx = r(cx + (8 + i * 4) * s)
      g.rect(bx - 1, y - r(8 * s), 3, r(8 * s), '#2a0c14')
      g.rect(bx, y - r(7 * s), 1, r(7 * s) - 1, '#e8303a')
      g.px(bx, y - r(7 * s), '#ff8a8a')
      g.line(bx, y - r(8 * s), bx + 1, y - r(12 * s), '#fffaf0')
    }
    for (const sx of [-1, 1]) {
      const ex = r(cx + sx * 22 * s)
      g.ellipse(ex, y - 3 * s, 3.4 * s, 2.4 * s, '#dcd8e0')
      g.circle(ex + sx * 3 * s, y - 4 * s, 1.8 * s, '#e8e4ec')
      g.line(ex + sx * 4.6 * s, y - 3.5 * s, ex + sx * 5 * s, y - 0.5, '#bcb6c4')
      g.rect(ex - 2 * s, y - 1.5 * s, 1, 1.5 * s, '#bcb6c4')
      g.rect(ex + 1.5 * s, y - 1.5 * s, 1, 1.5 * s, '#bcb6c4')
      g.px(r(ex + sx * 3.4 * s), r(y - 4.6 * s), '#2a1420')
    }
    for (let i = 0; i < 3; i++) g.circle(cx - 3 * s + i * 2.4 * s, y - 2 * s - (i === 1 ? 1.6 * s : 0), 1.4 * s, '#f5a030')
  } else if (deity === 'guanyin') {
    drawVaseOfFlowers(g, r(cx + 14 * s), y, s * 0.8, 'lotus', 'porcelain', 1)
    // Tea cups and a water vase.
    for (let i = 0; i < 3; i++) {
      const tx = r(cx - 2 * s + i * 4 * s)
      g.rect(tx - 1, y - 3, 3, 3, '#f6f4f8')
      g.rect(tx - 1, y - 3, 3, 1, '#c8a060')
    }
    const v = vaseSculpt(Math.round(s * 0.7 * 20) / 20, 'porcelain')
    g.draw(v.canvas, r(cx + 24 * s) - v.ox, y - v.oy)
  } else {
    // Lotus, roses and a heap of gold coins.
    drawVaseOfFlowers(g, r(cx + 16 * s), y, s * 0.8, 'lotus', 'gold', 2)
    for (let i = 0; i < 9; i++) {
      const cxx = r(cx - 4 * s + (i % 4) * 2.6 * s)
      const cyy = r(y - 1 - Math.floor(i / 4) * 1.6 * s)
      g.ellipse(cxx, cyy, 1.6 * s, 0.9 * s, '#b8742a')
      g.ellipse(cxx, cyy - 0.4, 1.3 * s, 0.6 * s, '#ffd54f')
    }
    const rx = r(cx + 24 * s)
    g.rect(rx - 2, y - r(5 * s), 5, r(5 * s), '#e8e0f0')
    for (let i = 0; i < 3; i++) g.circle(rx - 2 * s + i * 2 * s, y - 7 * s - (i === 1 ? 1.5 * s : 0), 1.5 * s, '#d8203a')
  }
}

export { drawBuddhaHD as drawPrincipalBuddha }
export type { Color }
