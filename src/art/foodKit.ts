// Food pixel-art kit: a tiny paint buffer with shaded primitives (lit balls,
// bevelled slabs, glossy cylinders), texture sprinkles (grains, seeds,
// crumbs, condensation) and a finishing pass that adds a selective warm
// outline (tinted by the colour it borders, darker on the bottom-right) and a
// soft one-pixel drop shadow. Every food icon is drawn with it at 16×16 and
// scaled by whole numbers, so they all share one lighting direction (top
// left), one outline treatment and one set of hue-shifted colour ramps.

import { createCanvas, mix, hexToRgb } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'

/** Five-tone material ramp: specular, light, mid, shade, deep. */
export interface Ramp {
  hi: string
  l: string
  m: string
  s: string
  d: string
}

/** Warm plum-brown ink the outlines are tinted towards (never pure black). */
export const OUT = '#33192a'
const SHADE_HUE = '#5c2a52'
const DEEP_HUE = '#301430'
const LIGHT_HUE = '#fff1c2'

/** Hue-shifted ramp from one mid colour: shadows lean plum, lights lean warm. */
export function ramp(m: string, deep = 1): Ramp {
  return {
    hi: mix(m, '#ffffff', 0.78),
    l: mix(m, LIGHT_HUE, 0.36),
    m,
    s: mix(m, SHADE_HUE, 0.26 * deep),
    d: mix(m, DEEP_HUE, 0.5 * deep),
  }
}

/** Ramp from explicit colours (light → dark). */
export const R5 = (hi: string, l: string, m: string, s: string, d: string): Ramp => ({ hi, l, m, s, d })

// Material ramps shared across the icons.
export const M = {
  rice: R5('#ffffff', '#fffdf7', '#f3ede0', '#dccfbd', '#b9a693'),
  sticky: R5('#ffffff', '#fffbef', '#f5ecd6', '#e0cfae', '#bba27e'),
  eggW: R5('#ffffff', '#fffcf5', '#f7eedf', '#e3cfb8', '#c1a38a'),
  yolk: R5('#fff8c4', '#ffe46a', '#ffc21f', '#f0931a', '#c66412'),
  crispy: R5('#ffe9a8', '#f7c66a', '#e0973a', '#b86a26', '#80421c'),
  mango: R5('#fff8c8', '#ffe45a', '#ffc72a', '#f29a1c', '#c4631a'),
  chili: R5('#ffc0b0', '#ff6c56', '#e8352e', '#b41f2c', '#761226'),
  basil: R5('#c8f5a6', '#72cc5c', '#3c9c46', '#26703c', '#174a32'),
  leaf: R5('#d8f5b0', '#93d36a', '#62b04e', '#3f8543', '#275d38'),
  grill: R5('#fcd29a', '#dc9150', '#b85c2e', '#8a3b22', '#5a2419'),
  porkRaw: R5('#fff0f0', '#ffbfc2', '#f5909d', '#cf6580', '#8f4060'),
  chicken: R5('#fff8ea', '#fde6c2', '#f3cd96', '#d9a468', '#a8743e'),
  shrimp: R5('#ffe0c8', '#ffa070', '#f46e3e', '#c9472a', '#8a2b22'),
  tomyum: R5('#ffe0a0', '#ffac48', '#f27d2a', '#c8541e', '#88341a'),
  noodle: R5('#fff6da', '#f8e0ae', '#ebc486', '#c99b5c', '#98693a'),
  cream: R5('#ffffff', '#fffdf6', '#f7f1e4', '#e2d6c0', '#bfab8e'),
  husk: R5('#eec08c', '#bf824c', '#8f5632', '#673c25', '#43261b'),
  banana: R5('#fff8b8', '#ffe860', '#f9cb30', '#d99a25', '#98661c'),
  durian: R5('#e6f5a6', '#b6d866', '#8bb444', '#608c36', '#3d5e2a'),
  rambutan: R5('#ffc4b0', '#ff6a5a', '#e0303a', '#a81c34', '#6a1228'),
  mangosteen: R5('#e6b0e0', '#9a5696', '#6e2c70', '#4c1a4e', '#2e0e30'),
  tea: R5('#ffe0b0', '#ffae58', '#f3812c', '#c95c20', '#8a3a18'),
  milkTea: R5('#fff0dc', '#ffd2a0', '#f5b070', '#d08a50', '#946034'),
  soda: R5('#ffc0c6', '#ff5a6c', '#e8243c', '#ad142c', '#6e0c20'),
  glass: R5('#ffffff', '#f2fbff', '#d4ecf6', '#a9cfe2', '#7ca6bf'),
  plate: R5('#ffffff', '#fffcf4', '#f3ecdc', '#d8cbb3', '#ad9d86'),
  wood: R5('#f5dc98', '#dab466', '#b88c42', '#8a652d', '#5c421f'),
  bamboo: R5('#d6f09c', '#98cc62', '#66a846', '#437c38', '#2a552e'),
  gold: R5('#fff8c8', '#ffe274', '#f8c142', '#d28a25', '#8c5418'),
  steel: R5('#ffffff', '#e8e8ef', '#bcbccb', '#8c8c9f', '#5c5c70'),
  pink: R5('#fff2f8', '#ffcce2', '#ff9dc6', '#e46b9f', '#a8467a'),
  pandan: R5('#e8fac8', '#ace478', '#6fc24e', '#4a963e', '#2e6a30'),
  sauce: R5('#f2b878', '#c47a3a', '#96522a', '#6a3620', '#422014'),
  corn: R5('#fffcc8', '#ffea70', '#ffd23a', '#e6a52a', '#ac7420'),
  fish: R5('#ffffff', '#e2edf4', '#adc1d1', '#7a92aa', '#4c627c'),
  tofu: R5('#fff8cc', '#ffea9c', '#f7d272', '#d6a84e', '#a67836'),
  paper: R5('#ffffff', '#fffaf0', '#f0e6d2', '#d6c6a8', '#ab9676'),
  red: R5('#ffc0b4', '#ff7a66', '#e8473e', '#b42c34', '#761a2a'),
  green: R5('#d4f5b4', '#8ed46a', '#56b04c', '#3a8442', '#255a36'),
  blue: R5('#dcecff', '#8ebcff', '#5a8de0', '#3d63b5', '#283f82'),
  purple: R5('#eadcff', '#c0a2f5', '#9270dc', '#6a4cb2', '#43307a'),
  orange: R5('#ffe0b8', '#ffb060', '#f58f35', '#cc6320', '#8a3c16'),
  brown: R5('#f0c898', '#c89060', '#9a6a45', '#6e4a35', '#4a3128'),
  coconutMeat: R5('#ffffff', '#fffef8', '#f6f1e6', '#ded3be', '#b8a88c'),
  ice: R5('#ffffff', '#f6fdff', '#e0f4fb', '#b8e0ee', '#8cc0d6'),
  lime: R5('#f0ffc8', '#c2ec70', '#8ccc3c', '#5e9c30', '#3a6c26'),
  cucumber: R5('#e8ffd0', '#a6e27a', '#62b24c', '#3c843c', '#245a30'),
  tomato: R5('#ffc8b8', '#ff7460', '#ee4034', '#b82a30', '#7a1a26'),
  egg: R5('#fff8ec', '#fbe6cc', '#eecaa0', '#d4a274', '#a4744c'),
  choc: R5('#e8b890', '#a86a44', '#7a4630', '#56301f', '#361c14'),
}

type C = string | null

/** A small paint buffer. Coordinates are pixels; fills use the same rules as Surface. */
export class Pix {
  readonly w: number
  readonly h: number
  c: C[]
  /** Un-outlined effect pixels (steam, twinkles) painted after the outline pass. */
  f: C[]
  constructor(w = 16, h = 16) {
    this.w = w
    this.h = h
    this.c = new Array(w * h).fill(null)
    this.f = new Array(w * h).fill(null)
  }

  /** Effect pixel: never outlined, drawn on top of everything. */
  fx(x: number, y: number, col: string) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.in(x, y)) this.f[y * this.w + x] = col
  }

  /** Two wisps of steam rising from (x, y). */
  steam(x: number, y: number) {
    this.fx(x, y, 'rgba(238,230,242,0.95)')
    this.fx(x + 1, y - 1, 'rgba(238,230,242,0.75)')
    this.fx(x, y - 2, 'rgba(238,230,242,0.5)')
    this.fx(x + 4, y - 1, 'rgba(238,230,242,0.85)')
    this.fx(x + 3, y - 2, 'rgba(238,230,242,0.5)')
  }

  in(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }
  get(x: number, y: number): C {
    return this.in(x, y) ? this.c[y * this.w + x] : null
  }
  px(x: number, y: number, col: string | null) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.in(x, y)) this.c[y * this.w + x] = col
  }
  /** Paint only where something is already painted. */
  on(x: number, y: number, col: string) {
    x = Math.round(x)
    y = Math.round(y)
    if (this.get(x, y)) this.px(x, y, col)
  }
  rect(x: number, y: number, w: number, h: number, col: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col)
  }
  hline(x1: number, x2: number, y: number, col: string) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) this.px(x, y, col)
  }
  vline(x: number, y1: number, y2: number, col: string) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) this.px(x, y, col)
  }
  line(x0: number, y0: number, x1: number, y1: number, col: string) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (let i = 0; i < 200; i++) {
      this.px(x0, y0, col)
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
  }
  thick(x0: number, y0: number, x1: number, y1: number, r: number, col: string) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2))
    for (let i = 0; i <= n; i++) this.ell(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, r, r, col)
  }
  ell(cx: number, cy: number, rx: number, ry: number, col: string) {
    if (rx <= 0 || ry <= 0) return
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      const dy = (y + 0.5 - cy) / ry
      if (Math.abs(dy) > 1) continue
      const half = rx * Math.sqrt(1 - dy * dy)
      const xa = Math.round(cx - half)
      const xb = Math.round(cx + half)
      for (let x = xa; x < xb; x++) this.px(x, y, col)
    }
  }
  poly(pts: [number, number][], col: string) {
    let minY = Infinity
    let maxY = -Infinity
    for (const [, y] of pts) {
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5
      const xs: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]
        const [bx, by] = pts[(i + 1) % pts.length]
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax))
      }
      xs.sort((a, b) => a - b)
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.px(x, y, col)
    }
  }

  /** Occupancy mask of whatever `fn` paints (on a scratch buffer). */
  mask(fn: (m: Pix) => void): Uint8Array {
    const m = new Pix(this.w, this.h)
    fn(m)
    const out = new Uint8Array(this.w * this.h)
    for (let i = 0; i < out.length; i++) out[i] = m.c[i] ? 1 : 0
    return out
  }

  /**
   * Paint a shaded form. `shape` paints its silhouette (any colour); the form
   * is then lit from the top-left:
   * - 'ball': a lit sphere/ellipsoid with a specular glint and a rim light.
   * - 'bevel': flat face with a light top-left edge and a dark bottom-right edge.
   * - 'cyl': a vertical glossy cylinder (bottles, cups, bamboo).
   * - 'flat': the mid tone only.
   */
  form(r: Ramp, shape: (m: Pix) => void, mode: 'ball' | 'bevel' | 'cyl' | 'flat' = 'ball', o: FormOpts = {}) {
    const mk = this.mask(shape)
    const W = this.w
    let x0 = W
    let y0 = this.h
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < W; x++)
        if (mk[y * W + x]) {
          x0 = Math.min(x0, x)
          y0 = Math.min(y0, y)
          x1 = Math.max(x1, x)
          y1 = Math.max(y1, y)
        }
    if (x1 < 0) return
    const at = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < this.h && mk[y * W + x] === 1
    const cx = o.cx ?? (x0 + x1 + 1) / 2
    const cy = o.cy ?? (y0 + y1 + 1) / 2
    const rx = o.rx ?? (x1 - x0 + 1) / 2
    const ry = o.ry ?? (y1 - y0 + 1) / 2
    const [lx, ly, lz] = o.light ?? [-0.55, -0.68, 0.5]
    const ll = Math.hypot(lx, ly, lz)
    let best = -9
    let bx = -1
    let by = -1
    const tones = [r.d, r.s, r.m, r.l]
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (!at(x, y)) continue
        let col = r.m
        if (mode === 'ball') {
          const nx = (x + 0.5 - cx) / rx
          const ny = (y + 0.5 - cy) / ry
          const r2 = Math.min(1, nx * nx + ny * ny)
          const nz = Math.sqrt(1 - r2)
          const dot = (nx * lx + ny * ly + nz * lz) / ll
          let t = dot > (o.lightAt ?? 0.72) ? 3 : dot > 0.3 ? 2 : dot > -0.12 ? 1 : 0
          // Reflected rim light along the bottom-right edge.
          if (o.rim !== false && r2 > 0.7 && nx + ny > 0.9 && (!at(x + 1, y) || !at(x, y + 1)) && t < 2) t += 1
          col = tones[t]
          if (dot > best) {
            best = dot
            bx = x
            by = y
          }
        } else if (mode === 'bevel') {
          const up = at(x, y - 1)
          const lf = at(x - 1, y)
          const dn = at(x, y + 1)
          const rt = at(x + 1, y)
          if (!dn && !rt) col = r.d
          else if (!dn || !rt) col = r.s
          else if (!up || !lf) col = r.l
          if (o.grad) {
            const g = (x - x0) / Math.max(1, x1 - x0) + (y - y0) / Math.max(1, y1 - y0)
            if (col === r.m && g > 1.25) col = r.s
          }
        } else if (mode === 'cyl') {
          // Use this row's own extent so tapered shapes shade correctly.
          let a = x
          let b = x
          while (at(a - 1, y)) a--
          while (at(b + 1, y)) b++
          const t = (x - a + 0.5) / (b - a + 1)
          col = t < 0.16 ? r.l : t < 0.34 ? (b - a >= 4 ? r.hi : r.l) : t < 0.62 ? r.m : t < 0.86 ? r.s : r.d
          if (!at(x, y - 1) && col !== r.d) col = col === r.s ? r.m : r.l
        }
        this.px(x, y, col)
      }
    if (mode === 'ball' && o.spec !== false && bx >= 0) {
      const [sx, sy] = o.specAt ?? [bx, by]
      this.px(sx, sy, r.hi)
      if (rx >= 3.5 && ry >= 3) this.px(sx + 1, sy, mix(r.hi, r.l, 0.5))
    }
    // Separation line: darken whatever this form now overlaps, one pixel out.
    if (o.sep) {
      const touched = new Set<number>()
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (!at(x, y)) continue
          for (const [dx, dy] of o.sep === 'down' ? [[0, 1], [1, 0]] : [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
            const nx = x + dx
            const ny = y + dy
            if (at(nx, ny) || !this.get(nx, ny)) continue
            touched.add(ny * W + nx)
          }
        }
      for (const i of touched) this.c[i] = mix(this.c[i] as string, OUT, 0.55)
    }
  }

  ball(cx: number, cy: number, rx: number, ry: number, r: Ramp, o: FormOpts = {}) {
    this.form(r, (m) => m.ell(cx, cy, rx, ry, '#000'), 'ball', { cx, cy, rx, ry, ...o })
  }

  /** Sprinkle `n` pixels of `col` over painted pixels inside a box (optionally only over `only` colours). */
  speckle(x0: number, y0: number, x1: number, y1: number, col: string, n: number, seed = 1, only?: string[]) {
    let s = (seed * 2654435761) >>> 0
    const rnd = () => {
      s = (s * 1103515245 + 12345) >>> 0
      return (s >>> 8) / 16777216
    }
    let tries = 0
    let placed = 0
    while (placed < n && tries < n * 12) {
      tries++
      const x = Math.floor(x0 + rnd() * (x1 - x0 + 1))
      const y = Math.floor(y0 + rnd() * (y1 - y0 + 1))
      const cur = this.get(x, y)
      if (!cur) continue
      if (only && !only.includes(cur)) continue
      this.px(x, y, col)
      placed++
    }
  }

  /** Rice grains: short light/dark dashes over a white mound. */
  grains(x0: number, y0: number, x1: number, y1: number, r: Ramp, seed = 3) {
    this.speckle(x0, y0, x1, y1, r.s, Math.max(2, Math.round(((x1 - x0 + 1) * (y1 - y0 + 1)) / 11)), seed, [r.m, r.l])
    this.speckle(x0, y0, x1, y1, r.hi, Math.max(1, Math.round(((x1 - x0 + 1) * (y1 - y0 + 1)) / 16)), seed + 7, [r.m])
  }

  /** Condensation / sauce shine: a bright pixel with a soft tail below. */
  drop(x: number, y: number, hi = '#ffffff', tail?: string) {
    this.on(x, y, hi)
    if (tail) this.on(x, y + 1, tail)
  }

  /** Recolour every pixel of colour `from` to `to`. */
  swap(from: string, to: string) {
    for (let i = 0; i < this.c.length; i++) if (this.c[i] === from) this.c[i] = to
  }

  /**
   * Finish into a sprite: selective outline tinted by the neighbouring colour
   * (darker on the bottom/right sides), then a soft drop shadow one pixel
   * below the silhouette.
   */
  finish(o: FinishOpts = {}): Sprite {
    const W = this.w
    const H = this.h
    const src = this.c.slice()
    const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] !== null
    const out: C[] = src.slice()
    const isOutline = new Uint8Array(W * H)
    const outlineCol = o.outline
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (filled(x, y)) continue
        const up = filled(x, y - 1)
        const dn = filled(x, y + 1)
        const lf = filled(x - 1, y)
        const rt = filled(x + 1, y)
        if (!up && !dn && !lf && !rt) continue
        // Pick the neighbour colour: prefer the one above/left (lit side).
        const n = up ? src[(y - 1) * W + x] : lf ? src[y * W + x - 1] : rt ? src[y * W + x + 1] : src[(y + 1) * W + x]
        const bottomRight = (up || lf) && !dn && !rt
        out[y * W + x] = outlineCol ?? tintOutline(n as string, bottomRight)
        isOutline[y * W + x] = 1
      }
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')!
    // Drop shadow under the outlined silhouette.
    if (o.shadow !== false) {
      ctx.fillStyle = o.shadowColor ?? 'rgba(51,25,42,0.28)'
      for (let y = 0; y < H - 1; y++)
        for (let x = 0; x < W; x++) {
          if (!out[y * W + x]) continue
          if (out[(y + 1) * W + x]) continue
          if (y + 1 < H) ctx.fillRect(x, y + 1, 1, 1)
        }
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const col = out[y * W + x]
        if (!col) continue
        ctx.fillStyle = col
        ctx.fillRect(x, y, 1, 1)
      }
    for (let i = 0; i < this.f.length; i++) {
      const col = this.f[i]
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(i % W, Math.floor(i / W), 1, 1)
    }
    return { canvas, w: W, h: H }
  }
}

export interface FormOpts {
  cx?: number
  cy?: number
  rx?: number
  ry?: number
  light?: [number, number, number]
  /** Dot threshold for the light band (lower = bigger lit area). */
  lightAt?: number
  rim?: boolean
  spec?: boolean
  specAt?: [number, number]
  grad?: boolean
  /** Darken the pixels this form overlaps along its edge (all sides, or only below/right). */
  sep?: boolean | 'down'
}

export interface FinishOpts {
  outline?: string
  shadow?: boolean
  shadowColor?: string
}

const outlineCache = new Map<string, string>()

/** Outline colour next to `c`: the ink, lightly tinted by the fill it borders. */
export function tintOutline(c: string, dark = false): string {
  const k = c + (dark ? '1' : '0')
  let v = outlineCache.get(k)
  if (!v) {
    const [r, g, b] = hexToRgb(c)
    const lum = (r * 0.3 + g * 0.55 + b * 0.15) / 255
    // Saturated fills tint the outline more; near-whites only a little.
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
    const t = dark ? 0.1 + sat * 0.12 : 0.2 + sat * 0.2 - lum * 0.04
    v = mix(OUT, c, Math.max(0.08, t))
    outlineCache.set(k, v)
  }
  return v
}

/** Draw a 16×16 food icon with the kit and finish it. */
export function foodSprite(draw: (k: Pix) => void, o?: FinishOpts): Sprite {
  const k = new Pix(16, 16)
  draw(k)
  return k.finish(o)
}

/** A tiny four-point twinkle (gold "chef's special" marker). */
export function twinkle(k: Pix, x: number, y: number, c = '#ffd54f', core = '#ffffff') {
  k.fx(x, y, core)
  k.fx(x - 1, y, c)
  k.fx(x + 1, y, c)
  k.fx(x, y - 1, c)
  k.fx(x, y + 1, c)
}
