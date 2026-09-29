// Shared art for the north & isan place maps (Doi Suthep, Wat Rong Khun,
// Wat Huay Pla Kang, Kham Chanod, That Phanom, Ya Mo): a hook-returning
// sprite builder, multi-headed naga and serpent balustrades, market stalls,
// interior rooms (floors, walls, pillars, altars) and offerings.

import { bake, ditherOn, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../../engine/sprite'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { GOLD, WHITE, slice, type Ramp } from '../temple'
import { buddhaSculpt, deitySculpt, type BuddhaStyle } from '../hall'

export type Pt = { x: number; y: number }

export interface Built extends Prop {
  hooks: Record<string, Pt[]>
}

/** Cached, ink-outlined sprite with animation hooks stored relative to the anchor. */
export function bld(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): Built {
  return cached('ni:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as Built
    const o = outlineCanvas(c, P.ink)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as Built
  }) as Built
}

/** Hook points of a built sprite placed at (x, y), in world coordinates. */
export function hooksAt(b: { hooks?: Record<string, Pt[]> }, key: string, x: number, y: number): Pt[] {
  return (b.hooks?.[key] ?? []).map((h) => ({ x: x + h.x, y: y + h.y }))
}

export const GOLDR: Ramp = { L: GOLD.L, b: GOLD.b, d: GOLD.d, D: GOLD.D }
export const WHITER: Ramp = { L: '#ffffff', b: '#fffaf0', d: '#ece0cc', D: '#d2bfa2' }
export const MARBLE: Ramp = { L: '#ffffff', b: '#f4f1ee', d: '#dcd6d2', D: '#bfb6b2' }
export const LACQUER = { L: '#e25a48', b: '#b8343f', d: '#8a2335', D: '#5e1830' }
export const TEAK = { L: '#c98e5a', b: '#a86b3e', d: '#84502e', D: '#5e3822' }

export function hsh(x: number, y: number, s = 0) {
  return (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

/** Paint a vertical shaded block (front face) with a lighter top face. */
export function block(g: Surface, x: number, y: number, w: number, h: number, top: number, r: Ramp) {
  g.rect(x, y + top, w, h - top, r.b)
  g.rect(x, y + top, 1, h - top, r.L)
  g.rect(x + w - Math.max(1, Math.round(w * 0.2)), y + top, Math.max(1, Math.round(w * 0.2)), h - top, r.d)
  g.rect(x + w - 1, y + top, 1, h - top, r.D)
  if (top > 0) {
    g.rect(x, y, w, top, r.L)
    g.hline(x, x + w - 1, y + top - 1, r.b)
  }
}

// ---------------------------------------------------------------------------
// HD sculpted statues (hall.ts), wrapped as props anchored at the seat.

export function buddhaProp(style: BuddhaStyle, s: number): Prop {
  return cached(`ni:buddha:${style}:${s}`, () => {
    const sc = buddhaSculpt(style, s)
    return { canvas: sc.canvas, w: sc.canvas.width, h: sc.canvas.height, ax: sc.ox, ay: sc.oy } as Prop
  }) as Prop
}

export function guanyinProp(s: number): Prop {
  return cached(`ni:guanyin:${s}`, () => {
    const sc = deitySculpt('guanyin', s)
    return { canvas: sc.canvas, w: sc.canvas.width, h: sc.canvas.height, ax: sc.ox, ay: sc.oy } as Prop
  }) as Prop
}

// ---------------------------------------------------------------------------
// Naga: the seven-headed serpent that guards stairs and bridges, and long
// serpent bodies for balustrades.

export interface NagaPal {
  b: Color
  d: Color
  D: Color
  L: Color
  belly: Color
  bellyD: Color
  crest: Color
  crestL: Color
  /** Mosaic scale sparkles. */
  gems: Color[]
}

export const NAGA_GREEN: NagaPal = { b: '#43a86a', d: '#2f7f55', D: '#1e5a42', L: '#7cd08e', belly: '#fff1c4', bellyD: '#e8cf8a', crest: GOLD.b, crestL: GOLD.L, gems: ['#9fe8ff', '#ffe27a', '#ff9fc0', '#b4f0a0'] }
export const NAGA_GOLD: NagaPal = { b: '#f0b83a', d: '#c98a26', D: '#8a5222', L: '#ffe27a', belly: '#fff6d6', bellyD: '#f0d890', crest: '#e8514a', crestL: '#ff9a7a', gems: ['#9fe8ff', '#6cf0a0', '#ffffff', '#ff9fc0'] }
export const NAGA_JADE: NagaPal = { b: '#3fb0a0', d: '#2a8a80', D: '#1c5e5a', L: '#86e0cc', belly: '#fff1c4', bellyD: '#e8cf8a', crest: GOLD.b, crestL: GOLD.L, gems: ['#ffe27a', '#ffffff', '#9fd0ff', '#ffb3cf'] }

/** One naga head at (x, y) = skull centre, facing the viewer; s scales it. */
function nagaHeadFront(g: Surface, x: number, y: number, p: NagaPal, s = 1) {
  const r = Math.round
  // Crest flames (หงอน) sweeping up and out.
  const fl: [number, number, number][] = [
    [-3, 5, -1],
    [-1.2, 8, 0],
    [1.2, 8, 0],
    [3, 5, 1],
  ]
  for (const [dx, h, lean] of fl) {
    const hh = Math.round(h * s)
    for (let k = 0; k < hh; k++) {
      const t = k / hh
      const xx = r(x + dx * s + lean * t * t * 3 * s)
      g.px(xx, r(y - 3 * s - k), t > 0.7 ? p.crestL : p.crest)
      if (t < 0.5) g.px(xx + (dx < 0 ? -1 : 1), r(y - 3 * s - k), mixHex(p.crest, '#8a5222', 0.35))
    }
  }
  // Skull.
  g.ellipse(x, y + 0.5, 4.6 * s, 3.8 * s, p.D)
  g.ellipse(x, y, 4.3 * s, 3.4 * s, p.d)
  g.ellipse(x - 0.4 * s, y - 0.5 * s, 3.6 * s, 2.8 * s, p.b)
  g.px(r(x - 2 * s), r(y - 2 * s), p.L)
  g.px(r(x - 1 * s), r(y - 2.4 * s), p.L)
  // Gold brow band.
  g.hline(r(x - 3.5 * s), r(x + 3.5 * s), r(y - 3 * s), p.crest)
  // Big eyes.
  for (const sx of [-1, 1]) {
    const ex = r(x + sx * 2.2 * s)
    const ey = r(y - 0.5 * s)
    g.rect(ex - (sx < 0 ? 1 : 0), ey, 2, 2, '#ffffff')
    g.px(ex + (sx < 0 ? 0 : 0), ey + 1, P.ink)
  }
  // Snout, open mouth with fangs.
  g.rect(r(x - 3 * s), r(y + 2 * s), r(6 * s) + 1, r(2.2 * s), p.b)
  g.hline(r(x - 2.4 * s), r(x + 2.4 * s), r(y + 2 * s), p.L)
  g.rect(r(x - 2 * s), r(y + 3.6 * s), r(4 * s) + 1, Math.max(1, r(1.4 * s)), '#c8384a')
  g.px(r(x - 2 * s), r(y + 3.6 * s), '#fffaf0')
  g.px(r(x + 2 * s), r(y + 3.6 * s), '#fffaf0')
  g.hline(r(x - 2.4 * s), r(x + 2.4 * s), r(y + 5 * s), p.d)
  // Whisker curls.
  g.px(r(x - 4.6 * s), r(y + 2.5 * s), p.crest)
  g.px(r(x + 4.6 * s), r(y + 2.5 * s), p.crest)
}

/**
 * Multi-headed naga rising from a plinth (the stair guardians). 60×76.
 * Anchor = bottom centre of the plinth. Hooks: glints.
 */
export function nagaHeadsSprite(p: NagaPal = NAGA_GREEN, heads = 7, plinth = true, key = 'g'): Built {
  const W = 62
  const H = 78
  return bld(`nagaheads:${key}:${heads}:${plinth ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    let base = H - 1
    if (plinth) {
      block(g, cx - 19, base - 8, 38, 8, 2, WHITER)
      g.hline(cx - 18, cx + 17, base - 4, GOLD.d)
      for (let x = cx - 16; x < cx + 16; x += 4) g.px(x, base - 3, GOLD.b)
      block(g, cx - 16, base - 13, 32, 6, 1, WHITER)
      base -= 12
    }
    // Coil on the plinth.
    g.ellipse(cx + 5, base - 3, 15, 4.5, p.D)
    g.ellipse(cx + 4, base - 4, 14, 3.8, p.d)
    g.ellipse(cx + 2, base - 5, 11, 2.8, p.b)
    for (let x = -10; x < 16; x += 3) g.px(cx + x, base - 6 + (x & 1), p.crest)
    // Trunk rising to the junction where the necks fan out.
    const jy = base - 26
    for (let y = base - 5; y > jy; y--) {
      const t = (base - 5 - y) / (base - 5 - jy)
      const half = 6 + t * 3
      const sway = Math.sin(t * 2.6) * 1.5
      const x0 = Math.round(cx - half + sway)
      const x1 = Math.round(cx + half + sway)
      g.rect(x0, y, x1 - x0, 1, p.b)
      g.px(x0, y, p.L)
      g.px(x1 - 1, y, p.D)
      g.px(x1 - 2, y, p.d)
      const bw = Math.max(2, Math.round(half * 0.5))
      g.rect(Math.round(cx - bw + sway), y, bw * 2, 1, y % 3 === 0 ? p.bellyD : p.belly)
      if (y % 3 === 1) g.px(x0 + 2, y, p.gems[y % p.gems.length])
      if (y % 4 === 2) g.px(x1 - 3, y, p.gems[(y + 1) % p.gems.length])
    }
    // Necks and heads, outer heads first (they sit lower and behind).
    const c = (heads - 1) / 2
    const idx = Array.from({ length: heads }, (_, i) => i).sort((a, b) => Math.abs(b - c) - Math.abs(a - c))
    const glints: Pt[] = []
    for (const i of idx) {
      const k = i - c
      const hx = cx + k * 7.6
      const hy = jy - 22 + Math.abs(k) * Math.abs(k) * 1.4 + Math.abs(k) * 1.2
      const n = 18
      for (let j = 0; j <= n; j++) {
        const t = j / n
        const x = cx + k * 1.5 + (hx - cx - k * 1.5) * Math.pow(t, 0.8)
        const y = jy + 2 + (hy + 4 - jy - 2) * t
        const w = 3.2 - t * 0.6
        g.circle(x + 0.6, y, w + 0.6, p.D)
        g.circle(x, y, w, p.b)
        g.px(Math.round(x - w + 1), Math.round(y), p.L)
        g.px(Math.round(x), Math.round(y), (j & 1) ? p.belly : p.bellyD)
        if (j % 4 === 2) g.px(Math.round(x + w - 1), Math.round(y), p.gems[(i + j) % p.gems.length])
      }
      nagaHeadFront(g, hx, hy, p, i === Math.round(c) ? 1.15 : 0.95)
      glints.push({ x: Math.round(hx), y: Math.round(hy - 9) })
    }
    hooks.glints = glints
  })
}

/**
 * Serpent body along a polyline (baked into the ground layer): scaled
 * body, cream belly on the near side and a gold crest ridge.
 */
export function serpent(g: Surface, pts: [number, number][], w: number, p: NagaPal, seed = 0) {
  const step = 1
  const samples: [number, number][] = []
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step))
    for (let k = 0; k < n; k++) samples.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
  }
  samples.push(pts[pts.length - 1])
  for (const [x, y] of samples) g.circle(x, y + 1, w / 2 + 0.5, p.D)
  for (const [x, y] of samples) g.circle(x, y, w / 2, p.d)
  for (const [x, y] of samples) g.circle(x - w * 0.12, y - w * 0.15, w * 0.36, p.b)
  samples.forEach(([x, y], i) => {
    if (i % 2 === 0) g.px(Math.round(x - w * 0.25), Math.round(y - w * 0.3), p.L)
    if (i % 3 === 0) g.px(Math.round(x), Math.round(y + w * 0.3), p.belly)
    if (i % 5 === (seed % 5)) g.px(Math.round(x + w * 0.15), Math.round(y), p.gems[(i + seed) % p.gems.length])
    if (i % 4 === 0) {
      g.px(Math.round(x), Math.round(y - w / 2 - 1), p.crest)
      if (i % 8 === 0) g.px(Math.round(x), Math.round(y - w / 2 - 2), p.crestL)
    }
  })
}

// ---------------------------------------------------------------------------
// Market stalls: a shared frame with an awning and goods painted by callback.

export interface StallOpts {
  w?: number
  awning: [Color, Color]
  wood?: Ramp
  sign?: Color
  /** Paint goods on the counter; (x, y) is the counter's top-left. */
  goods?: (g: Surface, x: number, y: number, w: number) => void
  /** Paint on the sign board. */
  signArt?: (g: Surface, x: number, y: number, w: number) => void
  umbrella?: boolean
}

export function stallProp(key: string, o: StallOpts): Built {
  const W = o.w ?? 46
  const H = 52
  const wood = o.wood ?? TEAK
  return bld(`stall:${key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Counter.
    const cy = H - 16
    block(g, 3, cy, W - 6, 15, 3, wood)
    for (let x = 6; x < W - 6; x += 5) g.vline(x, cy + 4, H - 3, wood.d)
    g.rect(3, H - 3, W - 6, 2, wood.D)
    if (o.sign) {
      g.rect(cx - 10, cy + 5, 20, 7, o.sign)
      g.frame(cx - 10, cy + 5, 20, 7, mixHex(o.sign, '#000000', 0.3))
      o.signArt?.(g, cx - 9, cy + 6, 18)
    }
    // Posts.
    g.rect(4, 9, 2, cy - 8, wood.d)
    g.rect(W - 6, 9, 2, cy - 8, wood.d)
    // Awning (striped, scalloped).
    if (o.umbrella) {
      for (let i = 0; i < 9; i++) {
        const half = (W / 2 - 1) * (0.35 + (i / 9) * 0.65)
        g.rect(Math.round(cx - half), 2 + i, Math.round(half * 2), 1, i % 2 ? o.awning[0] : o.awning[1])
      }
      g.vline(cx, 10, cy, wood.D)
      g.px(cx, 1, GOLD.b)
    } else {
      for (let y = 4; y < 12; y++) {
        const inset = Math.round((12 - y) * 0.5)
        for (let x = 1 + inset; x < W - 1 - inset; x++) g.px(x, y, Math.floor((x - 1) / 5) % 2 ? o.awning[0] : o.awning[1])
      }
      g.hline(4, W - 5, 3, mixHex(o.awning[0], '#ffffff', 0.4))
      for (let x = 1; x < W - 1; x += 5) {
        const c = Math.floor((x - 1) / 5) % 2 ? o.awning[0] : o.awning[1]
        g.rect(x, 12, 5, 1, c)
        g.rect(x + 1, 13, 3, 1, c)
      }
    }
    o.goods?.(g, 5, cy, W - 10)
    hooks.lamp = [{ x: cx, y: 14 }]
  })
}

/** A cute vendor cart on two wheels with a parasol. */
export function cartProp(key: string, o: { body: Color; bodyD: Color; parasol: [Color, Color]; goods?: (g: Surface, x: number, y: number) => void; w?: number }): Built {
  const W = o.w ?? 36
  const H = 46
  return bld(`cart:${key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Parasol.
    for (let i = 0; i < 8; i++) {
      const half = 15 * (0.3 + (i / 8) * 0.7)
      for (let x = Math.round(cx - half); x < cx + half; x++) g.px(x, 3 + i, Math.floor((x - cx + 20) / 4) % 2 ? o.parasol[0] : o.parasol[1])
    }
    g.px(cx, 2, GOLD.b)
    g.vline(cx, 11, 25, '#8a8480')
    // Box.
    g.rect(4, 25, W - 8, 13, o.body)
    g.rect(4, 25, W - 8, 2, mixHex(o.body, '#ffffff', 0.45))
    g.rect(4, 36, W - 8, 2, o.bodyD)
    g.rect(W - 7, 27, 3, 9, o.bodyD)
    // Glass top.
    g.rect(6, 21, W - 12, 4, '#d4f1ff')
    g.hline(6, W - 7, 21, '#ffffff')
    o.goods?.(g, 6, 21)
    // Wheels and handle.
    g.circle(9, 40, 3.5, '#3a3040')
    g.circle(W - 9, 40, 3.5, '#3a3040')
    g.px(9, 40, '#bdb2ae')
    g.px(W - 9, 40, '#bdb2ae')
    g.line(W - 4, 28, W - 1, 24, '#8a8480')
    hooks.lamp = [{ x: cx, y: 12 }]
  })
}

// ---------------------------------------------------------------------------
// Offerings.

/** Bai sri: a tiered banana-leaf cone crowned with flowers (Isan / Lao). */
export function baiSriSprite(size = 1): Prop {
  const W = Math.round(18 * size) + 4
  const H = Math.round(26 * size) + 4
  return bld(`baisri:${size}`, W, H, W / 2, H - 1, (g) => {
    const cx = W / 2
    const base = H - 1
    // Tray.
    g.rect(cx - 7 * size, base - 3, 14 * size, 3, GOLD.d)
    g.hline(cx - 7 * size, cx + 7 * size - 1, base - 3, GOLD.L)
    const tiers = 4
    for (let i = 0; i < tiers; i++) {
      const y = base - 4 - i * 5 * size
      const half = (7 - i * 1.4) * size
      for (let k = 0; k < 5 * size; k++) {
        const hh = half * (1 - k / (5 * size) * 0.25)
        slice(g, cx, y - k, hh, { L: '#b4f0a0', b: '#6cc36a', d: '#3f9a5a', D: '#2c6a45' })
      }
      // Leaf folds and a band of flowers.
      for (let x = -half + 1; x < half; x += 2) g.px(Math.round(cx + x), Math.round(y - 1), i % 2 ? '#fffaf0' : '#ff9fc0')
      g.px(Math.round(cx - half), Math.round(y - 3 * size), '#3f9a5a')
    }
    // Egg and flower on top.
    const top = base - 4 - tiers * 5 * size
    g.ellipse(cx, top, 2.5 * size, 3 * size, '#fffaf0')
    g.px(cx - 1, top - 1, '#ffffff')
    g.px(cx, top - 3 * size - 1, '#f58f35')
    g.px(cx - 1, top - 3 * size, '#ffd23f')
    g.px(cx + 1, top - 3 * size, '#ffd23f')
  })
}

/** Heap of marigold garlands (พวงมาลัยดาวเรือง). */
export function marigoldPile(w = 20, seed = 0): Prop {
  return bld(`marigold:${w}:${seed}`, w + 2, 10, (w + 2) / 2, 9, (g) => {
    for (let i = 0; i < w * 3; i++) {
      const hh = hsh(i, seed, 3)
      const x = 1 + (hh % w)
      const t = Math.abs(x - w / 2) / (w / 2)
      const y = 9 - Math.round(((hh >> 3) % 7) * (1 - t * 0.8))
      g.circle(x, y, 1.6, i % 3 === 0 ? '#f58f35' : i % 3 === 1 ? '#ffb13b' : '#ffd23f')
      if (i % 5 === 0) g.px(x, y - 1, '#ffe27a')
    }
    g.px(2, 8, '#6cc36a')
    g.px(w - 1, 8, '#6cc36a')
  })
}

/** Lotus bud bouquet in a gold vase. */
export function lotusVase(tall = false): Prop {
  return bld(`lotusvase:${tall ? 1 : 0}`, 10, tall ? 22 : 16, 5, tall ? 21 : 15, (g) => {
    const H = tall ? 22 : 16
    g.ellipse(5, H - 4, 3.2, 3.5, GOLD.d)
    g.ellipse(4.5, H - 4.5, 2.4, 2.6, GOLD.b)
    g.px(3, H - 6, GOLD.L)
    g.rect(3, H - 9, 4, 2, GOLD.d)
    for (const [x, y] of [
      [2, 2],
      [5, 0],
      [8, 3],
    ] as const) {
      g.line(5, H - 9, x, y + 4, '#3f8a4f')
      g.ellipse(x, y + 2, 1.4, 2.4, '#ff9fc0')
      g.px(x, y, '#ffe0ea')
    }
    if (tall) {
      g.line(5, H - 9, 1, 8, '#3f8a4f')
      g.ellipse(1, 7, 1.4, 2, '#f58ab4')
    }
  })
}

// ---------------------------------------------------------------------------
// Interior rooms (seen in 3/4 from the doorway).

export type FloorKind = 'teak' | 'marble' | 'redtile' | 'white' | 'jade' | 'stone'

export function floor(g: Surface, kind: FloorKind, x: number, y: number, w: number, h: number, seed = 0) {
  if (kind === 'teak') {
    g.rect(x, y, w, h, TEAK.b)
    for (let j = 0; j < h; j += 4) {
      g.hline(x, x + w - 1, y + j, TEAK.d)
      const off = hsh(j, seed) % 23
      for (let i = off; i < w; i += 23 + (hsh(i, j) % 9)) g.vline(x + i, y + j, y + j + 3, TEAK.d)
      for (let i = 0; i < w; i += 3) if (hsh(x + i, y + j, seed) % 7 === 0) g.px(x + i, y + j + 2, TEAK.L)
      g.hline(x, x + w - 1, y + j + 1, mixHex(TEAK.b, TEAK.L, 0.35))
    }
  } else if (kind === 'marble' || kind === 'white' || kind === 'jade') {
    const a = kind === 'jade' ? '#d8efe4' : '#f7f4f0'
    const b = kind === 'marble' ? '#e6ddd6' : kind === 'jade' ? '#bfe0d2' : '#eef0f4'
    const s = 10
    for (let j = 0; j < h; j += s)
      for (let i = 0; i < w; i += s) {
        const c = ((i / s + j / s) & 1) === 0 ? a : b
        g.rect(x + i, y + j, Math.min(s, w - i), Math.min(s, h - j), c)
        const v = hsh(i, j, seed)
        if (v < 300) g.line(x + i + (v % 7), y + j + 1, x + i + (v % 7) + 3, y + j + 5, mixHex(c, '#b8b0b8', 0.25))
        g.px(x + i + 1, y + j + 1, '#ffffff')
      }
  } else if (kind === 'redtile') {
    g.rect(x, y, w, h, '#c86a4a')
    for (let j = 0; j < h; j += 8) {
      g.hline(x, x + w - 1, y + j, '#a8543c')
      for (let i = (j / 8) % 2 ? 4 : 0; i < w; i += 8) {
        g.vline(x + i, y + j, y + j + 7, '#a8543c')
        g.px(x + i + 1, y + j + 1, '#e08a66')
      }
    }
  } else {
    g.rect(x, y, w, h, '#d8d0c8')
    for (let j = 0; j < h; j += 6) for (let i = (j / 6) % 2 ? 0 : 6; i < w; i += 12) g.frame(x + i, y + j, 12, 6, '#c4bab2')
  }
}

export interface RoomOpts {
  w: number
  h: number
  /** Top of the back wall and its visible height. */
  wallTop: number
  wallH: number
  /** Side wall thickness. */
  side: number
  /** Front ledge height at the bottom. */
  front: number
  /** Door opening (centre x, width). */
  door: { x: number; w: number }
  floor: FloorKind
  wall: Ramp
  /** Wainscot colour band along the wall foot. */
  dado?: Color
  void?: Color
}

/** Geometry of a room: walkable floor rect, obstacles and the door rect. */
export function roomGeo(o: RoomOpts) {
  const fy = o.wallTop + o.wallH
  const fb = o.h - o.front
  const floorRect = { x: o.side, y: fy, w: o.w - o.side * 2, h: fb - fy }
  const obstacles = [
    { x: 0, y: 0, w: o.w, h: fy + 4 },
    { x: 0, y: 0, w: o.side, h: o.h },
    { x: o.w - o.side, y: 0, w: o.side, h: o.h },
    { x: 0, y: fb, w: o.door.x - o.door.w / 2, h: o.front },
    { x: o.door.x + o.door.w / 2, y: fb, w: o.w - o.door.x - o.door.w / 2, h: o.front },
    { x: 0, y: o.h - 3, w: o.w, h: 3 },
  ]
  const door = { x: o.door.x - o.door.w / 2, y: fb - 6, w: o.door.w, h: o.front + 6 }
  return { floorRect, obstacles, door, fy, fb }
}

/** Bake the shell of a room: void, back wall, side walls, floor, front ledge and door. */
export function bakeRoom(g: Surface, o: RoomOpts, wallArt?: (g: Surface, x: number, y: number, w: number, h: number) => void, seed = 0) {
  const { fy, fb } = roomGeo(o)
  g.rect(0, 0, o.w, o.h, o.void ?? '#2b1d26')
  // Floor.
  floor(g, o.floor, o.side, fy, o.w - o.side * 2, fb - fy + o.front, seed)
  // Soft shadow at the foot of the back wall.
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(40,20,30,0.18)'
  for (let k = 0; k < 6; k++) if (k % 2 === 0 || k < 3) g.ctx.fillRect(o.side - g.ox, fy + k - g.oy, o.w - o.side * 2, 1)
  g.ctx.restore()
  // Back wall face.
  const wx = o.side
  const ww = o.w - o.side * 2
  g.rect(wx, o.wallTop, ww, o.wallH, o.wall.b)
  g.rect(wx, o.wallTop, ww, 2, o.wall.L)
  g.rect(wx, o.wallTop + 2, ww, 1, o.wall.d)
  if (o.dado) {
    g.rect(wx, fy - 7, ww, 7, o.dado)
    g.hline(wx, wx + ww - 1, fy - 7, mixHex(o.dado, '#ffffff', 0.35))
    g.hline(wx, wx + ww - 1, fy - 1, mixHex(o.dado, '#000000', 0.3))
  }
  wallArt?.(g, wx, o.wallTop + 3, ww, o.wallH - 3 - (o.dado ? 7 : 0))
  // Side walls seen from above (thick tops) with a light inner edge.
  for (const s of [0, 1]) {
    const x = s ? o.w - o.side : 0
    g.rect(x, o.wallTop - 4, o.side, o.h - o.wallTop + 4, o.wall.D)
    g.rect(x + (s ? 1 : 0), o.wallTop - 4, o.side - 1, o.h - o.wallTop + 4, o.wall.d)
    g.vline(s ? x : x + o.side - 1, o.wallTop - 4, o.h - 1, o.wall.L)
  }
  // Top of the back wall.
  g.rect(0, o.wallTop - 4, o.w, 4, o.wall.d)
  g.hline(0, o.w - 1, o.wallTop - 4, o.wall.L)
  // Front ledge with the doorway gap.
  const dl = o.door.x - o.door.w / 2
  const dr = o.door.x + o.door.w / 2
  for (const [x0, x1] of [
    [0, dl],
    [dr, o.w],
  ] as const) {
    g.rect(x0, fb, x1 - x0, o.front, o.wall.d)
    g.rect(x0, fb, x1 - x0, 2, o.wall.L)
    g.rect(x0, fb + 2, x1 - x0, 1, o.wall.b)
  }
  // Threshold.
  g.rect(dl, fb + 1, o.door.w, 2, mixHex(o.wall.D, '#000000', 0.2))
  g.rect(dl, fb + 3, o.door.w, o.front - 3, '#fff3d6')
  g.ctx.save()
  g.ctx.globalAlpha = 0.5
  g.rect(dl + 2, fb + 3, o.door.w - 4, o.front - 3, '#fffbe8')
  g.ctx.restore()
}

/** Tall round pillar for interiors. */
export function pillarSprite(style: 'lanna' | 'white' | 'redgold' | 'jade', h = 64): Prop {
  return bld(`pillar:${style}:${h}`, 10, h + 4, 5, h + 3, (g) => {
    const body: Ramp =
      style === 'lanna' || style === 'redgold'
        ? LACQUER
        : style === 'jade'
          ? { L: '#b4f0dc', b: '#6cc3a8', d: '#3f9a80', D: '#2a6f5c' }
          : WHITER
    for (let y = 4; y < h; y++) slice(g, 5, y, 3.5, body, 0.3)
    // Base and capital.
    for (let i = 0; i < 4; i++) slice(g, 5, h - i, 4.5 - (i === 3 ? 1 : 0), GOLDR)
    for (let i = 0; i < 4; i++) slice(g, 5, 4 + i, 4.5 - i * 0.4, GOLDR)
    if (style === 'lanna' || style === 'redgold') {
      // Gold stencil (ลายคำ) rosettes.
      for (let y = 10; y < h - 6; y += 6) {
        g.px(4, y, GOLD.b)
        g.px(5, y - 1, GOLD.l)
        g.px(5, y + 1, GOLD.d)
        g.px(6, y, GOLD.d)
        g.px(3, y + 3, GOLD.d)
        g.px(7, y + 3, GOLD.D)
      }
    } else if (style === 'white') {
      g.vline(3, 8, h - 4, '#ffffff')
    } else {
      for (let y = 10; y < h - 6; y += 5) g.px(4 + (y % 2), y, '#fff3a6')
    }
  })
}

/** Tiered throne (ฐานชุกชี) with a statue on it and gold finery. */
export function altarSprite(key: string, statue: Prop, o: { w?: number; tiers?: number; body?: Ramp; trim?: Color; arch?: 'lanna' | 'thai' | 'none' | 'halo' } = {}): Built {
  const W = Math.max(o.w ?? 70, statue.w + 12)
  const tiers = o.tiers ?? 3
  const baseH = tiers * 6 + 4
  const archH = o.arch && o.arch !== 'none' ? 18 : 4
  const H = baseH + statue.h + archH
  const body = o.body ?? LACQUER
  return bld(`altar:${key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    let y = H - 1
    const glints: Pt[] = []
    for (let i = 0; i < tiers; i++) {
      const half = W / 2 - 1 - i * 5
      y -= 6
      g.rect(Math.round(cx - half), y, Math.round(half * 2), 6, body.b)
      g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, GOLD.L)
      g.rect(Math.round(cx - half), y + 1, Math.round(half * 2), 1, GOLD.d)
      g.rect(Math.round(cx + half) - 3, y + 2, 3, 4, body.d)
      // Glass-inlay diamonds.
      for (let x = Math.round(cx - half) + 3; x < cx + half - 4; x += 5) {
        g.px(x, y + 3, GOLD.b)
        g.px(x + 1, y + 4, (x + i) % 3 ? '#9fe8ff' : '#ffb3cf')
        g.px(x + 2, y + 3, GOLD.b)
      }
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y + 5, body.D)
    }
    // Lotus seat.
    y -= 4
    for (let i = 0; i < 4; i++) slice(g, cx, y + i, statue.w / 2 - 2 + i, GOLDR)
    for (let x = Math.round(cx - statue.w / 2 + 3); x < cx + statue.w / 2 - 3; x += 3) g.px(x, y + 2, GOLD.D)
    const seatY = y + 1
    // Arch or halo behind the statue.
    const sTop = seatY - statue.h + statue.h - statue.ay
    if (o.arch === 'lanna' || o.arch === 'thai') {
      const aw = statue.w / 2 + 6
      const top = seatY - statue.ay - 14
      for (let yy = top; yy < seatY; yy++) {
        const t = (yy - top) / (seatY - top)
        const half = o.arch === 'lanna' ? aw * Math.min(1, 0.25 + t * 1.6) : aw * Math.sqrt(Math.min(1, t * 1.3))
        g.hline(Math.round(cx - half), Math.round(cx + half) - 1, yy, t < 0.08 ? GOLD.L : GOLD.d)
        const inner = half - 3
        if (inner > 0) g.hline(Math.round(cx - inner), Math.round(cx + inner) - 1, yy, o.trim ?? '#5e1830')
      }
      // Flame fringe.
      for (let yy = top + 2; yy < seatY - 2; yy += 3) {
        const t = (yy - top) / (seatY - top)
        const half = o.arch === 'lanna' ? aw * Math.min(1, 0.25 + t * 1.6) : aw * Math.sqrt(Math.min(1, t * 1.3))
        g.px(Math.round(cx - half) - 1, yy, GOLD.b)
        g.px(Math.round(cx + half), yy, GOLD.b)
      }
      g.px(cx, top - 2, GOLD.L)
      g.px(cx, top - 1, GOLD.b)
      glints.push({ x: cx, y: top - 2 })
    } else if (o.arch === 'halo') {
      const r = statue.w * 0.42
      g.circle(cx, seatY - statue.ay * 0.62, r + 2, GOLD.d)
      g.circle(cx, seatY - statue.ay * 0.62, r, '#fff6d0')
      glints.push({ x: Math.round(cx - r), y: Math.round(seatY - statue.ay * 0.62) })
    }
    void sTop
    g.draw(statue.canvas, Math.round(cx - statue.ax), Math.round(seatY - statue.ay))
    glints.push({ x: cx, y: seatY - statue.ay + 2 })
    hooks.glints = glints
    hooks.seat = [{ x: cx, y: seatY }]
    // Candles on the lowest step.
    hooks.candles = [
      { x: Math.round(cx - W / 2 + 6), y: H - 8 },
      { x: Math.round(cx + W / 2 - 7), y: H - 8 },
    ]
  })
}

/** Low table of offerings: candles, flowers, fruit. */
export function offeringTable(key: string, w = 30, items: ('candle' | 'lotus' | 'fruit' | 'baisri' | 'garland' | 'water' | 'egg')[] = ['candle', 'lotus', 'fruit', 'lotus', 'candle']): Built {
  const H = 20
  return bld(`offtable:${key}`, w, H, w / 2, H - 1, (g, hooks) => {
    block(g, 1, H - 9, w - 2, 8, 3, LACQUER)
    g.hline(1, w - 2, H - 9, GOLD.L)
    g.hline(1, w - 2, H - 6, GOLD.d)
    g.rect(2, H - 2, 2, 1, LACQUER.D)
    g.rect(w - 4, H - 2, 2, 1, LACQUER.D)
    const flames: Pt[] = []
    const step = (w - 6) / Math.max(1, items.length - 1)
    items.forEach((it, i) => {
      const x = Math.round(3 + i * step)
      const y = H - 10
      if (it === 'candle') {
        g.rect(x, y - 5, 2, 5, '#fff6d6')
        g.px(x, y - 5, '#ffffff')
        flames.push({ x, y: y - 6 })
      } else if (it === 'lotus') {
        g.ellipse(x + 1, y - 3, 1.6, 3, '#ff9fc0')
        g.px(x + 1, y - 6, '#ffe0ea')
        g.vline(x + 1, y - 1, y, '#3f8a4f')
      } else if (it === 'fruit') {
        g.ellipse(x + 1, y - 1, 3, 1.4, GOLD.d)
        g.circle(x, y - 3, 1.5, '#ffb13b')
        g.circle(x + 2, y - 3, 1.5, '#e8514a')
        g.circle(x + 1, y - 5, 1.5, '#86c95f')
      } else if (it === 'baisri') {
        for (let k = 0; k < 8; k++) g.hline(x + 1 - Math.round((8 - k) / 3), x + 1 + Math.round((8 - k) / 3), y - k, k % 3 ? '#6cc36a' : '#fffaf0')
        g.px(x + 1, y - 9, '#f58f35')
      } else if (it === 'garland') {
        for (let k = 0; k < 5; k++) g.px(x + k - 1, y - 1 - Math.round(Math.sin((k / 4) * Math.PI) * 2), k % 2 ? '#fffaf0' : '#ffd23f')
        g.px(x + 1, y + 1, '#e8514a')
      } else if (it === 'water') {
        g.rect(x, y - 5, 3, 5, '#e8514a')
        g.px(x + 1, y - 7, '#ffffff')
        g.vline(x + 1, y - 7, y - 5, '#ffffff')
        g.px(x, y - 4, '#ff8a7a')
      } else if (it === 'egg') {
        g.ellipse(x + 1, y - 2, 1.6, 2, '#fffaf0')
        g.px(x, y - 3, '#ffffff')
      }
    })
    hooks.flames = flames
  })
}

/** Candle rack (ราวเทียน) with many little candles. */
export function candleRack(key: string, n = 8, color: Color = '#fff6d6'): Built {
  const W = n * 3 + 6
  const H = 16
  return bld(`candlerack:${key}:${n}`, W, H, W / 2, H - 1, (g, hooks) => {
    g.rect(1, 8, W - 2, 3, GOLD.d)
    g.hline(1, W - 2, 8, GOLD.L)
    g.hline(1, W - 2, 10, GOLD.D)
    g.rect(2, 11, 2, 5, GOLD.D)
    g.rect(W - 4, 11, 2, 5, GOLD.D)
    const flames: Pt[] = []
    for (let i = 0; i < n; i++) {
      const x = 3 + i * 3
      const hh = 3 + (i % 3)
      g.rect(x, 8 - hh, 1, hh, color)
      flames.push({ x, y: 8 - hh - 1 })
    }
    hooks.flames = flames
  })
}

/** Open shoe rack by a doorway, with pairs of shoes on two shelves. */
export function shoeRack(key: string, w = 30, full = true): Prop {
  return bld(`shoerack:${key}:${w}:${full ? 1 : 0}`, w, 18, w / 2, 17, (g) => {
    const cols = ['#e8514a', '#5a8de0', '#fffaf0', '#3a3040', '#ffd23f', '#ff9fc0', '#6cc36a', '#9a6a45']
    // Frame.
    g.rect(1, 2, 2, 16, TEAK.d)
    g.rect(w - 3, 2, 2, 16, TEAK.d)
    g.rect(1, 2, w - 2, 1, TEAK.L)
    for (const sy of [7, 13]) {
      g.rect(1, sy, w - 2, 2, TEAK.b)
      g.hline(1, w - 2, sy, TEAK.L)
      g.hline(1, w - 2, sy + 2, TEAK.D)
    }
    g.rect(3, 3, w - 6, 4, '#4a3028')
    g.rect(3, 9, w - 6, 4, '#4a3028')
    // Pairs of shoes (some gaps on a messy rack).
    for (const [sy, row] of [[7, 0], [13, 1]] as const) {
      for (let x = 4; x < w - 5; x += 5) {
        const v = hsh(x, row, w)
        if (!full && v % 3 === 0) continue
        const c = cols[v % cols.length]
        const tilt = !full && v % 2 ? 1 : 0
        g.rect(x, sy - 2 - tilt, 2, 2, c)
        g.rect(x + 2, sy - 2, 2, 2, c)
        g.px(x, sy - 2 - tilt, mixHex(c, '#ffffff', 0.45))
        g.px(x + 2, sy - 2, mixHex(c, '#ffffff', 0.45))
      }
    }
  })
}

/** A pair of flip-flops left on the ground (baked). */
export function flipflops(g: Surface, x: number, y: number, c: Color) {
  g.rect(x, y, 2, 3, c)
  g.rect(x + 3, y, 2, 3, c)
  g.px(x, y, mixHex(c, '#ffffff', 0.5))
  g.px(x + 3, y, mixHex(c, '#ffffff', 0.5))
}

/** Donation box (ตู้บริจาค), gold-trimmed. */
export function donationBox(key = 'd', body: Color = '#b8343f'): Prop {
  return bld(`donbox:${key}`, 12, 16, 6, 15, (g) => {
    block(g, 1, 3, 10, 12, 2, { L: mixHex(body, '#ffffff', 0.4), b: body, d: mixHex(body, '#000000', 0.2), D: mixHex(body, '#000000', 0.4) })
    g.rect(3, 7, 6, 4, '#d4f1ff')
    g.px(4, 8, '#ffffff')
    g.rect(4, 5, 4, 1, P.ink)
    g.hline(1, 10, 3, GOLD.b)
    g.px(5, 9, GOLD.b)
    g.px(6, 10, GOLD.b)
  })
}

/** Kneeling mat / carpet runner (baked). */
export function carpet(g: Surface, x: number, y: number, w: number, h: number, c: Color = '#b8343f', border: Color = GOLD.d) {
  g.rect(x, y, w, h, c)
  g.frame(x, y, w, h, border)
  g.frame(x + 2, y + 2, w - 4, h - 4, mixHex(c, border, 0.4))
  for (let j = y + 4; j < y + h - 4; j += 6) for (let i = x + 4; i < x + w - 4; i += 6) g.px(i, j, mixHex(c, '#ffffff', 0.25))
}

/** Small cushion (baked). */
export function cushion(g: Surface, x: number, y: number, c: Color = '#e8a53a') {
  g.rect(x, y, 8, 5, mixHex(c, '#000000', 0.25))
  g.rect(x, y, 8, 4, c)
  g.hline(x + 1, x + 6, y, mixHex(c, '#ffffff', 0.4))
  g.px(x + 3, y + 2, mixHex(c, '#000000', 0.2))
}

// ---------------------------------------------------------------------------
// Misc ground painters shared by the maps.

/** Wet mossy ground (forest floors). */
export function mossGround(g: Surface, x: number, y: number, w: number, h: number, seed = 0, base: Color = '#5e9a52') {
  g.rect(x, y, w, h, base)
  const L = mixHex(base, '#c8f090', 0.3)
  const D = mixHex(base, '#1e3a2a', 0.35)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const n = Math.sin(X * 0.13 + seed) + Math.cos(Y * 0.09 + X * 0.05) + Math.sin((X - Y) * 0.07)
      if (n > 1.2 && ditherOn(X, Y, 0.5)) g.px(X, Y, L)
      else if (n < -1.1 && ditherOn(X, Y, 0.55)) g.px(X, Y, D)
      const v = hsh(X, Y, seed)
      if (v < 18) g.px(X, Y, D)
      else if (v > 990) g.px(X, Y, '#a8d878')
    }
}

/** Flat water surface with ripples and sky glints (lakes, rivers). */
export function water(g: Surface, x: number, y: number, w: number, h: number, night: boolean, o: { deep?: Color; mid?: Color; light?: Color; seed?: number } = {}) {
  const deep = o.deep ?? (night ? '#28406e' : '#3a86b4')
  const mid = o.mid ?? (night ? '#34528a' : '#4aa0c8')
  const light = o.light ?? (night ? '#5a78b0' : '#8fd0e8')
  g.rect(x, y, w, h, mid)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const n = Math.sin(X * 0.08 + Y * 0.02 + (o.seed ?? 0)) + Math.sin(Y * 0.31)
      if (n > 1.35 && ditherOn(X, Y, 0.5)) g.px(X, Y, light)
      else if (n < -1.2 && ditherOn(X, Y, 0.6)) g.px(X, Y, deep)
    }
  for (let i = 0; i < (w * h) / 60; i++) {
    const hh = ((i + 5) * 2654435761 + (o.seed ?? 0) * 31) >>> 0
    const X = x + (hh % w)
    const Y = y + ((hh >>> 8) % h)
    g.hline(X, X + 2 + (i % 3), Y, i % 3 ? light : '#ffffff')
  }
}

export const ART: Record<string, () => Sprite> = {
  nagaGreen: () => nagaHeadsSprite(NAGA_GREEN),
  nagaGold: () => nagaHeadsSprite(NAGA_GOLD, 7, true, 'gold'),
  nagaJade5: () => nagaHeadsSprite(NAGA_JADE, 5, false, 'jade'),
  baisri: () => baiSriSprite(1),
  marigold: () => marigoldPile(20),
  lotusVase: () => lotusVase(true),
  pillarLanna: () => pillarSprite('lanna'),
  altarLanna: () => altarSprite('lanna', buddhaProp('lanna', 0.6), { arch: 'lanna' }),
  offTable: () => offeringTable('t1'),
  candleRack: () => candleRack('r1'),
  shoeRack: () => shoeRack('s1'),
  stallTest: () => stallProp('test', { awning: ['#e8514a', '#fffaf0'], sign: '#ffd23f' }),
  cartTest: () => cartProp('test', { body: '#5a8de0', bodyD: '#3a5fb0', parasol: ['#ff9fc0', '#fffaf0'] }),
}

export { GOLD, WHITE, slice, mixHex, ditherOn }
export type { Color, Ramp }
