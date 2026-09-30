// Foliage kit: lush Thai plants for the walkable maps. Every plant is a cached,
// ink-outlined Prop (anchor: bottom centre on the ground); plants that sway
// come in three frames (`sway` -1, 0, 1) so a scene can animate a few of them
// without redrawing. Ground painters (tufts, ferns, moss, beds, lotus, vines,
// dappled shadows) draw straight into a map's baked layer.
//
//   plantSprite(kind, variant, sway)  ·  PLANTS[kind] (size, trunk, petals)
//   tufts · fernPatch · moss · marigoldBed · ixoraBorder · lotusPatch ·
//   vines · dapple · groundCover
//
// src/scenes/foliage.ts places them on maps (dressMap) and animates them.

import { ditherOn, type Color, type Surface } from '../engine/pixel'
import { mixHex } from './characters'
import { canopy, LEAVES, type LeafRamp } from './garden'
import type { Prop } from './props'
import { sprite } from './temple'

export type PlantKind =
  | 'banana'
  | 'coconut'
  | 'areca'
  | 'frangipani'
  | 'bougainvillea'
  | 'bamboo'
  | 'raintree'
  | 'bodhi'
  | 'mango'
  | 'fern'
  | 'elephant_ear'
  | 'grass'
  | 'ixora'
  | 'hibiscus'
  | 'marigold'
  | 'pot'
  | 'ivy'

export interface PlantInfo {
  /** Trunk footprint (w, h) centred on the anchor; null = walk-through. */
  trunk: [number, number] | null
  /** Canopy half width (spacing, shade and dapple size). */
  r: number
  /** Petal / leaf colours dropped by `FoliageLife` (none = no falling). */
  fall?: Color[]
  /** How many variants the kind has. */
  variants: number
  /** Big enough to cast a dappled shadow. */
  shade?: boolean
}

export const PLANTS: Record<PlantKind, PlantInfo> = {
  banana: { trunk: [4, 3], r: 16, variants: 3, fall: ['#b8c85a', '#9a8a4a'] },
  coconut: { trunk: [4, 3], r: 22, variants: 2 },
  areca: { trunk: [4, 3], r: 12, variants: 3 },
  frangipani: { trunk: [6, 4], r: 22, variants: 4, fall: ['#fffaf0', '#ffe9a8'], shade: true },
  bougainvillea: { trunk: null, r: 16, variants: 3, fall: ['#e8489a', '#ff8ac4'] },
  bamboo: { trunk: [14, 5], r: 18, variants: 2, fall: ['#a8c860', '#c9b060'] },
  raintree: { trunk: [8, 5], r: 46, variants: 2, fall: ['#8fbf5a', '#c9a04c', '#ff9fc0'], shade: true },
  bodhi: { trunk: [10, 5], r: 38, variants: 2, fall: ['#b4e486', '#c9a04c'], shade: true },
  mango: { trunk: [6, 4], r: 26, variants: 2, fall: ['#6fa050', '#c9a04c'], shade: true },
  fern: { trunk: null, r: 9, variants: 3 },
  elephant_ear: { trunk: null, r: 11, variants: 3 },
  grass: { trunk: null, r: 7, variants: 3 },
  ixora: { trunk: null, r: 9, variants: 3 },
  hibiscus: { trunk: null, r: 11, variants: 3, fall: ['#e8384a'] },
  marigold: { trunk: null, r: 8, variants: 2 },
  pot: { trunk: [10, 4], r: 8, variants: 6 },
  ivy: { trunk: null, r: 12, variants: 3 },
}

/** Integer hash → 0..999. */
function hh(a: number, b = 0, s = 0): number {
  return (((a * 73856093) ^ (b * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

const GR = LEAVES.green
const DEEP = LEAVES.deep
const BANANA: LeafRamp = { L: '#c4ec84', b: '#8fcf5e', d: '#5fa84f', D: '#3f8043' }
const BAMBOO: LeafRamp = { L: '#c8e67a', b: '#94c85a', d: '#62a04a', D: '#44783c' }
const RAIN: LeafRamp = { L: '#a6d876', b: '#6cb458', d: '#468a4c', D: '#2e6640' }
const MANGO: LeafRamp = { L: '#86c464', b: '#4a9450', d: '#327242', D: '#225436' }
const BARK = { L: '#b8a292', b: '#8f786a', d: '#6b5650', D: '#4a3a3c' }

/** Tapered trunk from (x0,y0) (base) to (x1,y1) with bark shading. */
function trunk(g: Surface, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c = BARK) {
  const n = Math.max(1, Math.ceil(Math.abs(y1 - y0)))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = Math.round(y0 + (y1 - y0) * t)
    const w = Math.max(1, Math.round(w0 + (w1 - w0) * t))
    const l = Math.round(x - w / 2)
    g.rect(l, y, w, 1, c.b)
    g.px(l, y, c.L)
    if (w > 2) g.px(l + w - 1, y, c.d)
    if (w > 4) g.px(l + w - 2, y, c.d)
    if (w > 5 && hh(i, 7) < 120) g.px(l + 2 + (i % Math.max(1, w - 4)), y, c.D)
  }
}

/** A long leaf blade with a midrib (banana, elephant ear, grass). */
function blade(g: Surface, x0: number, y0: number, x1: number, y1: number, width: number, r: LeafRamp, droop = 0, torn = 0) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * -width * 0.3 + t * t * droop
    const w = Math.sin(Math.min(1, t * 1.25) * Math.PI) * width
    const top = Math.round(y - w)
    const bot = Math.round(y + w * 0.9)
    const X = Math.round(x)
    const tear = torn && t > 0.25 && hh(i, X, torn) < 180
    if (tear) {
      g.px(X, Math.round(y), r.d)
      continue
    }
    g.vline(X, top, bot, r.b)
    g.px(X, top, r.L)
    if (bot - top > 2) g.px(X, top + 1, r.L)
    g.px(X, bot, r.D)
    if (bot - top > 3) g.px(X, bot - 1, r.d)
    g.px(X, Math.round(y), t < 0.95 ? mixHex(r.L, '#fffaf0', 0.35) : r.b)
  }
}

// ---------------------------------------------------------------------------
// Tall plants.

/** กล้วย – banana clump with paddle leaves; v1 carries a bunch and a purple flower, v2 is a young double clump. */
function banana(g: Surface, v: number, s: number) {
  const W = 44
  const cx = W / 2
  const stems = v === 2 ? [cx - 6, cx + 6] : [cx]
  for (const [k, x] of stems.entries()) {
    const top = k === 1 ? 30 : 24
    for (let y = top; y < 58; y++) {
      const w = y > 50 ? 5 : 4
      g.rect(x - 2, y, w, 1, '#9cc862')
      g.px(x - 2, y, '#c4e48a')
      g.px(x - 2 + w - 1, y, '#6a9a45')
      if (hh(y, x) < 110) g.px(x, y, '#8a6a45')
    }
    // A dry old leaf hanging down the stem.
    for (let j = 0; j < 16; j++) g.px(x + 2 + (j > 8 ? 1 : 0), top + 6 + j, j % 3 ? '#b09a5a' : '#8a7a45')
    const S = (d: number) => d + s * (Math.abs(d) > 12 ? 2 : 1)
    // Big shredded paddle leaves arching out of the crown.
    const L = (dx: number, dy: number, lift: number, w: number, torn: number) => paddle(g, x, top + 1, x + dx * 0.45, top + dy - lift, x + S(dx), top + dy, w, BANANA, torn)
    L(-19, 6, 14, 4.2, 3)
    L(19, 4, 14, 4.2, 5)
    L(-13, -12, 12, 3.6, 0)
    L(12, -14, 12, 3.6, 7)
    L(-2, -22, 4, 3, 0)
    if (k === 0) L(-15, 18, 6, 3.2, 9)
  }
  if (v === 1) {
    const bx = cx + 7
    g.line(cx, 26, bx, 30, '#6a9a45')
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 3 - (j > 2 ? 1 : 0); i++) {
        g.rect(bx - 3 + i * 2 + (j > 2 ? 1 : 0), 30 + j * 2, 2, 2, j % 2 ? '#b8d860' : '#cfe070')
        g.px(bx - 3 + i * 2 + (j > 2 ? 1 : 0), 30 + j * 2, '#e8f098')
      }
    g.vline(bx + 1, 38, 40, '#6a9a45')
    g.ellipse(bx + 1, 43, 2.2, 3.4, '#7a3a60')
    g.px(bx, 41, '#a85a80')
  }
}

/**
 * A broad leaf along a quadratic curve (x0,y0) → (x1,y1) → (x2,y2), shaded
 * across its width, with a pale midrib; `torn` shreds it into strips.
 */
function paddle(g: Surface, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, width: number, r: LeafRamp, torn = 0) {
  const len = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1)
  const n = Math.ceil(len * 1.6)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * x1 + t * t * x2
    const y = u * u * y0 + 2 * u * t * y1 + t * t * y2
    let tx = 2 * u * (x1 - x0) + 2 * t * (x2 - x1)
    let ty = 2 * u * (y1 - y0) + 2 * t * (y2 - y1)
    const tl = Math.hypot(tx, ty) || 1
    tx /= tl
    ty /= tl
    // Normal pointing to the upper (lit) side.
    let nx = -ty
    let ny = tx
    if (ny > 0 || (ny === 0 && nx > 0)) {
      nx = -nx
      ny = -ny
    }
    const w = t < 0.12 ? 0.6 : width * Math.pow(Math.sin(Math.min(1, (t - 0.12) / 0.88 + 0.08) * Math.PI), 0.55)
    const slit = torn && t > 0.3 && hh(Math.floor(i / 3), torn, 5) < 260
    for (let k = -w; k <= w; k += 0.5) {
      if (slit && Math.abs(k) > w * 0.35 && (k > 0) === (hh(Math.floor(i / 3), torn) % 2 === 0)) continue
      const px = Math.round(x + nx * k)
      const py = Math.round(y + ny * k)
      const c = k > w - 0.9 ? r.L : k > 0.4 ? r.b : k < -w + 0.9 ? r.D : k < -0.4 ? r.d : t > 0.12 && t < 0.92 ? mixHex(r.L, '#fffaf0', 0.3) : r.b
      g.px(px, py, c)
    }
  }
}

/** มะพร้าว – tall coconut palm with pinnate fronds and a cluster of nuts. */
function coconut(g: Surface, v: number, s: number) {
  const lean = v % 2 ? -1 : 1
  const H = 92
  let tx = 26
  for (let y = 24; y < H; y++) {
    const t = (H - y) / (H - 24)
    const x = 26 + Math.round(Math.sin(t * 1.3) * 7 * lean)
    tx = x
    g.rect(x - 2, y, 4, 1, y % 4 === 0 ? '#8b6a55' : '#b08a6e')
    g.px(x - 2, y, '#d0b090')
    g.px(x + 1, y, '#8b6a55')
  }
  const top = 24
  const fronds: [number, number][] = [
    [-24, 10],
    [-20, -6],
    [-9, -16],
    [5, -18],
    [18, -9],
    [25, 7],
    [15, 17],
    [-14, 17],
  ]
  for (const [fi, [dx0, dy]] of fronds.entries()) {
    const dx = dx0 + s * Math.sign(dx0) * (Math.abs(dy) < 12 ? 2 : 1)
    const n = 18
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const x = tx + dx * t
      const y = top + dy * t + Math.sin(t * Math.PI) * -3 + t * t * 7
      g.px(x, y, LEAVES.palm.b)
      g.px(x, y + 1, LEAVES.palm.d)
      if (i > 1 && i < n) {
        // Leaflets hanging from the rachis.
        const len = Math.round(2 + Math.sin(t * Math.PI) * 3)
        const sx = dx > 0 ? -1 : 1
        for (let k = 1; k <= len; k++) {
          g.px(x + (i % 2 ? sx : 0) * Math.floor(k / 2), y + 1 + k, k === len ? LEAVES.palm.D : fi % 2 ? LEAVES.palm.d : LEAVES.palm.b)
        }
        if (i % 3 === 0) g.px(x, y - 1, LEAVES.palm.L)
      }
    }
  }
  for (const [x, y, c] of [
    [-2, 27, '#7a5a3a'],
    [2, 28, '#8b6a4a'],
    [0, 30, '#6a8a3a'],
    [-3, 30, '#8a9a45'],
  ] as [number, number, Color][]) {
    g.circle(tx + x, y, 2.2, c)
    g.px(tx + x - 1, y - 1, mixHex(c, '#ffffff', 0.35))
  }
}

/** หมาก – slender areca palms (1-3 stems) with a bright crownshaft. */
function areca(g: Surface, v: number, s: number) {
  const stems = v === 0 ? [[20, 0, 80]] : v === 1 ? [[15, -1, 80], [25, 1, 64]] : [[13, -2, 80], [21, 0, 70], [28, 2, 58]]
  for (const [x0, lean, h] of stems) {
    const top = 84 - h
    let tx = x0
    for (let y = top + 10; y < 84; y++) {
      const t = (84 - y) / h
      const x = x0 + Math.round(t * t * lean * 3)
      tx = x
      g.rect(x - 1, y, 2, 1, y % 5 === 0 ? '#9a9a88' : '#c8c8b4')
      g.px(x - 1, y, '#e0e0cc')
    }
    g.rect(tx - 1, top + 4, 3, 7, '#7cc860')
    g.px(tx - 1, top + 5, '#a8e080')
    for (const [dx0, dy] of [
      [-12, 3],
      [-8, -7],
      [0, -11],
      [8, -7],
      [12, 4],
      [4, 8],
      [-5, 8],
    ]) {
      const dx = dx0 + (Math.abs(dx0) > 5 ? s : 0)
      const n = 12
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = tx + dx * t
        const y = top + 4 + dy * t + t * t * 4
        g.px(x, y, LEAVES.palm.b)
        if (i > 1) g.px(x, y + 1, i % 2 ? LEAVES.palm.d : LEAVES.palm.D)
        if (i > 2 && i % 2) g.px(x, y + 2, LEAVES.palm.d)
      }
    }
    if (v > 0) {
      g.circle(tx + 2, top + 12, 1.4, '#f58f35')
      g.px(tx + 3, top + 13, '#e8514a')
    }
  }
}

/** ลีลาวดี – frangipani: candelabra branches, leaf rosettes at the tips, white / pink / yellow blooms. */
function frangipani(g: Surface, v: number, s: number) {
  const W = 56
  const cx = W / 2
  const B = { L: '#d8ccc4', b: '#b0a298', d: '#8a7c76', D: '#6a5e5c' }
  trunk(g, cx, 59, cx, 40, 6, 5, B)
  const tips: [number, number][] = [
    [8, 18],
    [17, 12],
    [cx, 8],
    [39, 12],
    [48, 19],
    [22, 22],
    [36, 23],
  ]
  for (const [x, y] of tips) {
    const mx = (cx + x) / 2
    trunk(g, cx, 42, mx, (42 + y) / 2 + 4, 4, 3, B)
    trunk(g, mx, (42 + y) / 2 + 4, x, y + 3, 3, 2, B)
  }
  const ramp = v === 3 ? DEEP : GR
  // Leaf clusters at the branch tips (long leaves poking out of each blob).
  const blobs: [number, number, number][] = tips.map(([x, y]) => [x + (y < 16 ? s : 0), y, 5.5])
  for (const [x, y] of blobs)
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI * 0.9 + k * 0.45
      paddle(g, x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 4, x + Math.cos(a) * 8.5, y + Math.sin(a) * 5 + 3, 1.4, ramp)
    }
  canopy(g, blobs, ramp, v + 3)
  const pal: Record<number, [Color, Color, Color]> = {
    0: ['#fffaf0', '#f3e7c8', '#ffd23f'],
    1: ['#fffaf0', '#f3e7c8', '#ffd23f'],
    2: ['#ffb4cc', '#f58aae', '#ffe45e'],
    3: ['#ffe27a', '#f5c040', '#ff9a4a'],
  }
  const [p, pd, heart] = pal[v] ?? pal[0]
  for (const [ti, [X, y]] of blobs.entries()) {
    const spots: [number, number][] = [
      [-2, -3],
      [2, -2],
      [0, -5],
      [-4, 0],
      [3, 1],
    ]
    for (const [fi, [fx, fy]] of spots.entries()) {
      if (hh(ti, fi, v) < 250) continue
      const bx = Math.round(X + fx)
      const by = Math.round(y + fy)
      g.px(bx - 1, by, p)
      g.px(bx + 1, by, p)
      g.px(bx, by - 1, p)
      g.px(bx - 1, by + 1, pd)
      g.px(bx + 1, by + 1, pd)
      g.px(bx, by, heart)
    }
  }
}

/** เฟื่องฟ้า – mounded bougainvillea with arching canes and bract clusters. */
function bougainvillea(g: Surface, v: number, s: number) {
  const cols: [Color, Color, Color][] = [
    ['#e8489a', '#ff8ac4', '#b02a72'],
    ['#ff8a3d', '#ffbb66', '#d0602a'],
    ['#fff0f4', '#ffc4d8', '#e8a0b8'],
  ]
  const [c, cl, cd] = cols[v % 3]
  canopy(
    g,
    [
      [9, 20, 7],
      [20, 16, 8],
      [31, 20, 7],
      [14, 11, 6],
      [27, 10, 6],
      [20 + s, 6, 5],
    ],
    GR,
    v + 31,
  )
  // Arching canes spilling out at the sides.
  for (const [x0, x1] of [
    [6, 1],
    [34, 39],
  ]) {
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      const x = Math.round(x0 + (x1 - x0) * t + s * t)
      const y = Math.round(14 + t * 12 - Math.sin(t * Math.PI) * 4)
      g.px(x, y, GR.d)
      if (i % 2) g.px(x, y - 1, c)
    }
  }
  // Clusters of papery bracts.
  for (let i = 0; i < 16; i++) {
    const h = hh(i, v, 3)
    const a = ((h % 628) / 100) * 1.0
    const d = 0.35 + (hh(i, v, 5) % 60) / 100
    const x = Math.round(20 + Math.cos(a) * 16 * d + (d > 0.7 ? s : 0))
    const y = Math.round(14 + Math.sin(a) * 9 * d)
    g.rect(x - 1, y - 1, 3, 2, c)
    g.px(x, y + 1, cd)
    g.px(x - 1, y - 1, cl)
    if (i % 2) {
      g.px(x + 2, y, c)
      g.px(x + 1, y + 1, cd)
    }
  }
}

/** ไผ่ – bamboo clump: jointed culms leaning out, feathery leaf sprays. */
function bamboo(g: Surface, v: number, s: number) {
  const W = 48
  const culms: [number, number, number][] =
    v === 0
      ? [
          [16, -10, 70],
          [21, -4, 78],
          [25, 2, 80],
          [29, 8, 74],
          [33, 13, 62],
        ]
      : [
          [18, -8, 64],
          [23, 0, 72],
          [28, 7, 66],
          [32, 12, 52],
        ]
  const green = v === 1 ? ['#e8d060', '#c8a840', '#8a9a3a'] : ['#a8d06a', '#7aa84e', '#557a3a']
  const tops: [number, number][] = []
  for (const [x0, lean, h] of culms) {
    const H = 84
    let px = x0
    for (let y = H - 1; y > H - h; y--) {
      const t = (H - y) / h
      const x = Math.round(x0 + lean * t * t + s * t * t * 2)
      g.rect(x - 1, y, 3, 1, green[0])
      g.px(x - 1, y, mixHex(green[0], '#ffffff', 0.3))
      g.px(x + 1, y, green[1])
      if ((H - y) % 9 === 0) {
        g.rect(x - 1, y, 3, 1, green[2])
        g.px(x + 2, y - 1, green[1])
      }
      px = x
    }
    tops.push([px, H - h])
  }
  const leaf = v === 1 ? BAMBOO : { ...BAMBOO, L: '#b8e070', b: '#7cc050' }
  // Sprays of small lance leaves hanging out from the upper nodes.
  for (const [ci, [x0, lean, h]] of culms.entries()) {
    const out = lean < 0 ? -1 : lean > 0 ? 1 : ci % 2 ? 1 : -1
    for (let yy = 84 - h + 3; yy < 84 - h * 0.45; yy += 10) {
      const t = (84 - yy) / h
      const x = Math.round(x0 + lean * t * t + s * t * t * 2)
      for (let k = 0; k < 3; k++) {
        const dir = k === 2 ? -out : out
        const len = 6 + (hh(k, yy, x0) % 4)
        const lx = x + dir * len
        const ly = yy + 2 + k * 1.5
        paddle(g, x, yy, x + dir * len * 0.5, yy - 2 + k, lx + (t > 0.8 ? s : 0), ly, 1.3, leaf)
      }
    }
    // Tip spray.
    const [tx, ty] = tops[ci]
    paddle(g, tx, ty + 2, tx + out * 2, ty - 3, tx + out * 5 + s, ty - 2, 1.2, leaf)
    paddle(g, tx, ty + 2, tx - out * 3, ty - 1, tx - out * 7 + s, ty + 3, 1.2, leaf)
  }
  // Fallen sheaths and a few young shoots at the foot.
  for (const [x, c] of [
    [12, '#c9b060'],
    [36, '#b09a4a'],
    [30, '#c9b060'],
  ] as [number, Color][]) {
    g.px(x, 83, c)
    g.px(x + 1, 83, c)
  }
  g.poly([[W / 2 - 12, 83], [W / 2 - 10, 76], [W / 2 - 8, 83]], '#b8a050')
}

/** จามจุรี – rain tree: huge umbrella dome, stout forked trunk, pink powder-puff flowers. */
function raintree(g: Surface, v: number, s: number) {
  const W = 104
  const cx = W / 2
  trunk(g, cx, 79, cx - 2, 52, 10, 7)
  trunk(g, cx - 2, 56, cx - 22, 34, 6, 3)
  trunk(g, cx - 1, 55, cx + 20, 32, 6, 3)
  trunk(g, cx - 2, 54, cx - 1, 30, 4, 3)
  // Roots flaring at the base.
  g.rect(cx - 8, 77, 16, 3, BARK.d)
  g.px(cx - 9, 79, BARK.b)
  g.px(cx + 8, 79, BARK.b)
  const blobs: [number, number, number][] = []
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (i / 12)
    blobs.push([cx + Math.cos(a) * 38 + (i < 3 || i > 10 ? 0 : s), 30 - Math.sin(a) * 16 + (i % 2) * 3, 11 + (i % 3)])
  }
  blobs.push([cx - 16, 16, 12], [cx + 14, 15, 12], [cx, 11, 12], [cx - 30, 26, 10], [cx + 30, 26, 10])
  canopy(g, blobs, RAIN, v + 5)
  // Underside shadow band and branch glimpses.
  for (let x = cx - 44; x < cx + 44; x++) {
    const y = Math.round(40 + Math.sin(x * 0.3) * 1.5)
    if (ditherOn(x, y, 0.6)) g.px(x, y, RAIN.D)
  }
  if (v === 0)
    for (let i = 0; i < 26; i++) {
      const h = hh(i, 11, 5)
      const x = cx - 40 + (h % 80)
      const y = 6 + ((h >> 4) % 26)
      g.px(x, y, '#ff9fc0')
      g.px(x + 1, y, '#ffc4d8')
    }
}

/** โพธิ์ – bodhi tree: heart-leaf canopy, aerial roots and a three-colour sash on the trunk. */
function bodhi(g: Surface, v: number, s: number) {
  const W = 88
  const cx = W / 2
  trunk(g, cx, 83, cx, 44, 14, 9, { L: '#c8b8a8', b: '#9a8a7c', d: '#76665e', D: '#54484a' })
  trunk(g, cx - 2, 50, cx - 20, 30, 6, 3, BARK)
  trunk(g, cx + 2, 50, cx + 20, 28, 6, 3, BARK)
  // Aerial roots.
  for (const x of [cx - 14, cx - 9, cx + 11, cx + 16]) g.vline(x, 44, 60 + (x % 5), '#8a7a6c')
  canopy(
    g,
    [
      [cx - 26 + s, 30, 13],
      [cx + 26 + s, 30, 13],
      [cx - 14, 20, 14],
      [cx + 14, 19, 14],
      [cx, 13, 13],
      [cx - 32, 40, 9],
      [cx + 32, 40, 9],
      [cx, 32, 12],
    ],
    LEAVES.bodhi,
    v + 17,
  )
  // Heart-shaped leaf glints with drip tips.
  for (let i = 0; i < 34; i++) {
    const h = hh(i, 3, 17)
    const x = cx - 36 + (h % 72)
    const y = 6 + ((h >> 4) % 36)
    g.px(x, y, LEAVES.bodhi.L)
    g.px(x + 1, y, LEAVES.bodhi.L)
    g.px(x, y + 1, LEAVES.bodhi.b)
  }
  // ผ้าสามสี sash.
  const sy = 64
  for (let i = 0; i < 3; i++) g.rect(cx - 7, sy + i * 2, 14, 2, ['#e8514a', '#ffd23f', '#5a8de0'][i])
  g.rect(cx + 5, sy + 6, 2, 6, '#e8514a')
  if (v === 1) {
    // Propping sticks (ไม้ค้ำโพธิ์).
    g.line(cx - 22, 83, cx - 18, 40, '#c8a070')
    g.line(cx + 24, 83, cx + 18, 42, '#c8a070')
  }
}

/** มะม่วง – mango tree: dense dark dome and hanging fruit. */
function mango(g: Surface, v: number, s: number) {
  const W = 62
  const cx = W / 2
  trunk(g, cx, 63, cx, 36, 7, 5)
  trunk(g, cx, 42, cx - 12, 28, 4, 2)
  trunk(g, cx, 41, cx + 12, 27, 4, 2)
  canopy(
    g,
    [
      [cx - 16, 28, 11],
      [cx + 16, 28, 11],
      [cx - 8 + s, 16, 12],
      [cx + 8 + s, 15, 12],
      [cx, 26, 12],
      [cx, 8, 9],
    ],
    MANGO,
    v + 23,
  )
  // Clusters of long, pale new leaves (the reddish flush) and fruit.
  for (let i = 0; i < 8; i++) {
    const h = hh(i, 5, 23)
    const x = cx - 20 + (h % 40)
    const y = 6 + ((h >> 4) % 20)
    g.px(x, y, v === 1 ? '#c87a5a' : '#a8d880')
    g.px(x + 1, y + 1, v === 1 ? '#a85a4a' : '#86c464')
  }
  for (const [x, y] of [
    [cx - 12, 36],
    [cx + 6, 38],
    [cx + 15, 34],
    [cx - 3, 39],
  ]) {
    g.vline(x, y - 3, y - 1, MANGO.D)
    g.ellipse(x, y + 1, 1.6, 2.4, v === 1 ? '#f0c040' : '#a8c850')
    g.px(x - 1, y, v === 1 ? '#fff0a0' : '#d0e880')
  }
}

// ---------------------------------------------------------------------------
// Low plants.

/** เฟิร์น – arching fern fronds (v2: bird's-nest fern). */
function fern(g: Surface, v: number, s: number) {
  const cx = 14
  const by = 21
  const r = v === 1 ? DEEP : GR
  if (v === 2) {
    // Bird's-nest fern: broad glossy straps in a rosette.
    const R: LeafRamp = { L: '#b4e486', b: '#76c05e', d: '#4f9a58', D: '#337049' }
    for (const [dx, dy, lift] of [
      [-12, -2, 8],
      [12, -3, 8],
      [-7, -12, 6],
      [7, -13, 6],
      [0, -16, 2],
    ])
      paddle(g, cx, by, cx + dx * 0.4, by + dy - lift, cx + dx + (dy < -8 ? s : 0), by + dy, 2.2, R)
    return
  }
  // Arching fronds, back ones darker; pinnae stroked on both sides of the rachis.
  const fronds: [number, number, number, boolean][] = [
    [-13, -6, 10, true],
    [13, -7, 10, true],
    [-6, -15, 6, true],
    [7, -15, 6, true],
    [-11, 0, 6, false],
    [11, 0, 6, false],
    [-3, -12, 7, false],
    [4, -11, 7, false],
  ]
  for (const [dx, dy, lift, back] of fronds) {
    const x2 = cx + dx + (dy < -8 ? s : s * 0.5)
    const y2 = by + dy
    const x1 = cx + dx * 0.35
    const y1 = by + dy - lift
    const n = 16
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const u = 1 - t
      const x = u * u * cx + 2 * u * t * x1 + t * t * x2
      const y = u * u * by + 2 * u * t * y1 + t * t * y2
      const tx = 2 * u * (x1 - cx) + 2 * t * (x2 - x1)
      const ty = 2 * u * (y1 - by) + 2 * t * (y2 - y1)
      const l = Math.hypot(tx, ty) || 1
      const nx = -ty / l
      const ny = tx / l
      g.px(Math.round(x), Math.round(y), back ? r.D : r.d)
      if (i < 2 || i % 2) continue
      const pw = Math.max(1, Math.round(Math.sin(t * Math.PI * 0.95) * 3.2))
      for (let j = 1; j <= pw; j++) {
        const c = back ? (j === pw ? r.b : r.d) : j === pw ? r.L : r.b
        g.px(Math.round(x + nx * j + tx / l * j * 0.4), Math.round(y + ny * j + ty / l * j * 0.4), c)
        g.px(Math.round(x - nx * j + tx / l * j * 0.4), Math.round(y - ny * j + ty / l * j * 0.4), back ? r.D : r.d)
      }
    }
  }
}

/** บอน – elephant ears: huge heart leaves on long stalks (v2 is the pink บอนสี). */
function elephantEar(g: Surface, v: number, s: number) {
  const W = 30
  const leaves: [number, number, number][] = [
    [8, 10, 5],
    [22, 9, 5.5],
    [15 + s, 5, 6],
    [4, 17, 4],
    [26, 17, 4],
  ]
  const ramp: LeafRamp = v === 1 ? { L: '#b8e890', b: '#6cc060', d: '#3f8a4f', D: '#2c6a45' } : v === 2 ? { L: '#ffd0dc', b: '#f07aa0', d: '#c04a70', D: '#8a3050' } : GR
  for (const [x, y] of leaves) g.line(W / 2, 27, x, y + 3, v === 2 ? '#c05a70' : '#6a9a45')
  for (const [x, y, r] of leaves) {
    // Heart: two lobes and a point, a pale vein.
    g.ellipse(x - r * 0.4, y, r * 0.7, r * 0.6, ramp.d)
    g.ellipse(x + r * 0.4, y, r * 0.7, r * 0.6, ramp.d)
    g.poly([[x - r, y], [x + r, y], [x, y + r * 1.2]], ramp.d)
    g.ellipse(x - r * 0.4, y - 0.5, r * 0.6, r * 0.5, ramp.b)
    g.ellipse(x + r * 0.4, y - 0.5, r * 0.6, r * 0.5, ramp.b)
    g.poly([[x - r + 1, y], [x + r - 1, y], [x, y + r * 1.05]], ramp.b)
    g.px(x - r * 0.5, y - r * 0.3, ramp.L)
    g.px(x - r * 0.5 + 1, y - r * 0.3, ramp.L)
    g.line(x, y - r * 0.2, x, y + r * 0.9, v === 2 ? '#ffe0ea' : mixHex(ramp.L, '#fffaf0', 0.4))
    if (v === 1) for (let k = 0; k < 3; k++) g.px(x - 2 + k * 2, y + 1, '#fffaf0')
  }
}

/** Tall grass tuft (หญ้าขน / หญ้าคา); v2 carries fluffy seed heads. */
function grass(g: Surface, v: number, s: number) {
  const cols = v === 1 ? ['#b8c860', '#9aa850', '#c8d880'] : ['#86c95f', '#5ea653', '#a8dc72']
  for (let k = 0; k < 11; k++) {
    const x0 = 5 + k
    const h = 8 + (hh(k, v) % 8)
    const lean = ((k - 5) / 5) * 4 + s * (h / 12)
    for (let i = 0; i < h; i++) {
      const t = i / h
      g.px(Math.round(x0 + lean * t * t), 19 - i, cols[k % 3])
    }
    if (v === 2 && k % 3 === 1) {
      const tx = Math.round(x0 + lean)
      g.rect(tx - 1, 19 - h - 2, 2, 3, '#f3ecd8')
      g.px(tx, 19 - h - 3, '#fffaf0')
    }
  }
}

/** เข็ม – ixora shrub with round flower heads (red-orange, pink, yellow). */
function ixora(g: Surface, v: number, s: number) {
  canopy(
    g,
    [
      [7, 12, 5.5],
      [15, 12, 5.5],
      [11 + s * 0.5, 8, 5.5],
    ],
    DEEP,
    v + 41,
  )
  const [c, cl] = [
    ['#f0503a', '#ff8a6a'],
    ['#ff6f91', '#ffb0c8'],
    ['#ffb33a', '#ffe27a'],
  ][v % 3]
  for (const [x, y] of [
    [5, 9],
    [11, 5],
    [17, 9],
    [9, 13],
    [15, 14],
  ]) {
    const X = x + (y < 8 ? s : 0)
    g.circle(X, y, 1.6, c)
    g.px(X - 1, y - 1, cl)
    g.px(X + 1, y, cl)
  }
}

/** ชบา – hibiscus bush with big trumpet flowers. */
function hibiscus(g: Surface, v: number, s: number) {
  canopy(
    g,
    [
      [7, 16, 6],
      [18, 16, 6],
      [12 + s * 0.5, 10, 7],
      [5, 9, 4],
      [20, 9, 4],
    ],
    GR,
    v + 47,
  )
  const [c, cd, cl] = [
    ['#e8384a', '#a82035', '#ff7a80'],
    ['#ff8ab0', '#d85a88', '#ffc4d8'],
    ['#ffcc3a', '#e89a2a', '#fff0a0'],
  ][v % 3]
  for (const [x, y] of [
    [6, 8],
    [15, 5],
    [20, 12],
    [9, 15],
  ]) {
    const X = x + (y < 9 ? s : 0)
    g.circle(X, y, 2.6, c)
    g.px(X - 1, y - 2, cl)
    g.px(X - 2, y - 1, cl)
    g.px(X, y, cd)
    g.px(X + 1, y + 1, '#ffe27a')
    g.px(X + 2, y + 2, '#ffe27a')
  }
}

/** ดาวเรือง – marigold clump (orange / yellow pompoms). */
function marigold(g: Surface, v: number, s: number) {
  canopy(
    g,
    [
      [6, 10, 4],
      [13, 10, 4],
      [9, 7, 4],
    ],
    GR,
    v + 53,
  )
  const [c, cl, cd] = v === 1 ? ['#ffd23f', '#fff08a', '#e0a020'] : ['#ff9a1a', '#ffc050', '#d86a10']
  for (const [x, y] of [
    [5, 6],
    [10, 4],
    [15, 7],
    [8, 9],
    [13, 10],
  ]) {
    const X = x + (y < 6 ? s : 0)
    g.circle(X, y, 1.8, c)
    g.px(X - 1, y - 1, cl)
    g.px(X + 1, y + 1, cd)
  }
}

/** Potted plants: 0 terracotta ixora, 1 dragon jar + papyrus, 2 lotus bowl, 3 snake plant, 4 bougainvillea standard, 5 fishtail palm. */
function pot(g: Surface, v: number, s: number) {
  const W = 28
  const cx = W / 2
  const base = 33
  const terracotta = (w: number, h: number) => {
    const y0 = base - h
    for (let y = y0; y < base; y++) {
      const t = (y - y0) / h
      const hw = Math.round(w / 2 - t * 2)
      g.rect(cx - hw, y, hw * 2, 1, '#c86a3a')
      g.px(cx - hw, y, '#e08a52')
      g.px(cx + hw - 1, y, '#a0502a')
    }
    g.rect(cx - w / 2 - 1, y0 - 2, w + 2, 3, '#d87a44')
    g.hline(cx - w / 2 - 1, cx + w / 2, y0 - 2, '#f0a068')
    return y0 - 2
  }
  if (v === 1 || v === 2) {
    // Glazed dragon jar (โอ่งมังกร) or a wide lotus bowl.
    const wide = v === 2
    const rx = wide ? 11 : 9
    const top = wide ? base - 9 : base - 16
    for (let y = top; y < base; y++) {
      const t = (y - top) / (base - top)
      const hw = wide ? rx - t * t * 3 : rx * Math.sin(0.35 + t * 2.4) + 1
      g.rect(Math.round(cx - hw), y, Math.round(hw * 2), 1, wide ? '#3d63b5' : '#8a4a2a')
      g.px(Math.round(cx - hw), y, wide ? '#6a8de0' : '#b8704a')
      g.px(Math.round(cx + hw) - 1, y, wide ? '#2a4a8a' : '#5a2a1a')
    }
    if (!wide) {
      // Dragon in yellow glaze.
      for (let i = 0; i < 12; i++) g.px(cx - 6 + i, top + 7 + Math.round(Math.sin(i * 0.9) * 2), '#e8c060')
      g.px(cx - 6, top + 6, '#ffe27a')
      g.rect(cx - 5, top - 1, 10, 2, '#6a3a22')
      // Papyrus umbrellas.
      for (const [dx, h] of [
        [-4, 16],
        [0, 20],
        [4, 15],
        [-1, 12],
      ]) {
        const tx = cx + dx + s * (h > 15 ? 1 : 0)
        g.line(cx + dx * 0.3, top, tx, top - h, '#6aa050')
        for (let k = -3; k <= 3; k++) g.px(tx + k, top - h - 1 + Math.abs(k) * 0.4, k % 2 ? '#a8dc72' : '#7cc060')
      }
    } else {
      g.ellipse(cx, top + 1, rx - 1, 2, '#4fa0c8')
      g.ellipse(cx - 3, top + 1, 3, 1.2, '#4fa860')
      g.ellipse(cx + 4, top + 1, 3, 1.2, '#43905a')
      g.line(cx, top, cx + s, top - 7, '#5a9a45')
      g.circle(cx + s, top - 9, 2.4, '#ff9fc0')
      g.px(cx + s - 1, top - 11, '#ffc4d8')
      g.px(cx + s, top - 9, '#ffe45e')
      g.line(cx + 5, top, cx + 6, top - 5, '#5a9a45')
      g.ellipse(cx + 6, top - 6, 1, 1.8, '#f58aae')
    }
    return
  }
  const rim = terracotta(v === 3 ? 10 : 12, 9)
  if (v === 0) {
    canopy(g, [[cx - 4, rim - 4, 4.5], [cx + 4, rim - 4, 4.5], [cx + s * 0.5, rim - 8, 4.5]], DEEP, 61)
    for (const [x, y] of [
      [-4, -7],
      [3, -10],
      [5, -4],
      [-1, -3],
    ]) {
      g.circle(cx + x + (y < -6 ? s : 0), rim + y, 1.5, '#f0503a')
      g.px(cx + x - 1, rim + y - 1, '#ff8a6a')
    }
  } else if (v === 3) {
    // ลิ้นมังกร – snake plant blades with yellow edges.
    for (let k = 0; k < 7; k++) {
      const x = cx - 5 + k * 1.7
      const h = 12 + (hh(k, 3) % 7)
      const lean = (k - 3) * 0.6 + (h > 16 ? s * 0.5 : 0)
      for (let i = 0; i < h; i++) {
        const X = Math.round(x + (lean * i) / h)
        g.px(X, rim - i, i % 4 === 0 ? '#8ac860' : '#3f8a4f')
        g.px(X + 1, rim - i, i > h - 3 ? '#3f8a4f' : '#e8d860')
      }
    }
  } else if (v === 4) {
    // Bougainvillea trained as a standard.
    g.vline(cx, rim - 10, rim, '#8b6a55')
    canopy(g, [[cx - 4 + s * 0.5, rim - 14, 5], [cx + 4 + s * 0.5, rim - 14, 5], [cx + s, rim - 18, 5]], GR, 67)
    for (let i = 0; i < 20; i++) {
      const h = hh(i, 67)
      g.px(cx - 7 + (h % 15) + s * 0.5, rim - 21 + ((h >> 4) % 11), i % 3 ? '#e8489a' : '#ff8ac4')
    }
  } else {
    // หมากเขียว fishtail palm fronds.
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (1.15 + k * 0.175)
      blade(g, cx, rim, cx + Math.cos(a) * 12 + s, rim + Math.sin(a) * 16, 1.6, LEAVES.palm, 3)
    }
  }
}

/** Ivy curtain hanging down a wall face (anchor: bottom centre of the strands). */
function ivy(g: Surface, v: number, s: number) {
  const W = v === 2 ? 40 : 26
  const flower = v === 1 ? '#e8489a' : null
  g.hline(0, W - 1, 1, DEEP.d)
  for (let i = 0; i < W; i += 2) {
    const len = 6 + (hh(i, v, 71) % (v === 2 ? 22 : 16))
    for (let j = 0; j < len; j++) {
      const x = i + Math.round(Math.sin(j * 0.5 + i) * 0.8 + (s * j) / len)
      const y = 1 + j
      const c = j % 3 === 0 ? GR.L : j % 3 === 1 ? GR.b : DEEP.d
      g.px(x, y, c)
      if (j % 3 === 0) g.px(x + 1, y, GR.d)
      if (flower && j % 5 === 2 && hh(i, j) < 400) g.px(x, y, flower)
    }
  }
}

type Painter = (g: Surface, v: number, s: number) => void
const DEF: Record<PlantKind, { w: number; h: number; draw: Painter }> = {
  banana: { w: 44, h: 58, draw: banana },
  coconut: { w: 56, h: 92, draw: coconut },
  areca: { w: 42, h: 85, draw: areca },
  frangipani: { w: 56, h: 60, draw: frangipani },
  bougainvillea: { w: 40, h: 28, draw: bougainvillea },
  bamboo: { w: 48, h: 85, draw: bamboo },
  raintree: { w: 104, h: 80, draw: raintree },
  bodhi: { w: 88, h: 84, draw: bodhi },
  mango: { w: 62, h: 64, draw: mango },
  fern: { w: 28, h: 23, draw: fern },
  elephant_ear: { w: 30, h: 28, draw: elephantEar },
  grass: { w: 22, h: 20, draw: grass },
  ixora: { w: 22, h: 19, draw: ixora },
  hibiscus: { w: 26, h: 23, draw: hibiscus },
  marigold: { w: 20, h: 15, draw: marigold },
  pot: { w: 28, h: 34, draw: pot },
  ivy: { w: 40, h: 26, draw: ivy },
}

/** Size (px) of a plant sprite. */
export function plantSize(kind: PlantKind): { w: number; h: number } {
  return { w: DEF[kind].w, h: DEF[kind].h }
}

/**
 * A plant sprite (cached). `sway` -1 / 0 / 1 bends the upper leaves for the
 * animated frames. Ivy is anchored at its top (it hangs from a wall).
 */
export function plantSprite(kind: PlantKind, variant = 0, sway = 0): Prop {
  const d = DEF[kind]
  const v = ((variant % PLANTS[kind].variants) + PLANTS[kind].variants) % PLANTS[kind].variants
  const s = Math.max(-1, Math.min(1, Math.round(sway)))
  const w = kind === 'ivy' && v !== 2 ? 26 : d.w
  return sprite(`fol:${kind}:${v}:${s}`, w, d.h, Math.floor(w / 2), kind === 'ivy' ? 0 : d.h - 1, (g) => d.draw(g, v, s), kind !== 'ivy')
}

// ---------------------------------------------------------------------------
// Ground painters (baked layers).

const TUFT = ['#5ea653', '#86c95f', '#a8dc72', '#4f9a4a']

/** Grass tufts scattered over an area (density: tufts per 100 px²). */
export function tufts(g: Surface, x: number, y: number, w: number, h: number, seed = 0, density = 0.6, dry = false) {
  const n = Math.round(((w * h) / 100) * density)
  const cols = dry ? ['#9aa850', '#b8c860', '#c8d880', '#8a9a45'] : TUFT
  for (let i = 0; i < n; i++) {
    const a = hh(i, seed, 101)
    const b = hh(i, seed, 211)
    const X = x + (a % Math.max(1, w))
    const Y = y + (b % Math.max(1, h))
    const k = 2 + (a % 3)
    for (let j = 0; j < k; j++) {
      const hgt = 2 + ((a + j * 7) % 3)
      const dx = j - (k >> 1)
      g.vline(X + dx, Y - hgt, Y, cols[(j + a) % cols.length])
      g.px(X + dx + (dx < 0 ? -1 : dx > 0 ? 1 : 0), Y - hgt, cols[2])
    }
    if (b % 11 === 0) g.px(X + 1, Y - 3, ['#fffaf0', '#ffd23f', '#ff9fc0', '#b8a6ff'][b % 4])
  }
}

/** Low fern / ground-cover patch (baked, flat): little frond sprays. */
export function fernPatch(g: Surface, cx: number, cy: number, rx: number, ry: number, seed = 0) {
  const n = Math.max(3, Math.round(rx * ry * 0.08))
  for (let i = 0; i < n; i++) {
    const a = (hh(i, seed, 13) / 1000) * Math.PI * 2
    const d = Math.sqrt(hh(i, seed, 29) / 1000)
    const x = Math.round(cx + Math.cos(a) * rx * d)
    const y = Math.round(cy + Math.sin(a) * ry * d)
    for (const dir of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const X = x + dir * k
        const Y = y - (k === 2 || k === 3 ? 1 : 0) + (k === 4 ? 1 : 0)
        g.px(X, Y, k < 2 ? DEEP.d : GR.b)
        if (k % 2 === 1) {
          g.px(X, Y - 1, GR.L)
          g.px(X, Y + 1, DEEP.D)
        }
      }
    }
    g.px(x, y - 1, GR.b)
    g.px(x, y - 2, GR.L)
  }
}

/** Moss over stone or paving edges (baked). */
export function moss(g: Surface, x: number, y: number, w: number, h: number, seed = 0, amount = 1) {
  const n = Math.round(((w * h) / 18) * amount)
  for (let i = 0; i < n; i++) {
    const X = x + (hh(i, seed, 41) % Math.max(1, w))
    const Y = y + (hh(i, seed, 43) % Math.max(1, h))
    // Denser towards the bottom edge (damp).
    if (hh(i, seed, 47) / 1000 > 0.35 + ((Y - y) / Math.max(1, h)) * 0.8) continue
    g.px(X, Y, i % 3 ? '#7aa850' : '#5f9044')
    if (i % 4 === 0) g.px(X + 1, Y, '#a8cc78')
  }
}

/** ดาวเรือง bed: mounded foliage dotted with orange and yellow pompoms, a soil edge. */
export function marigoldBed(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, '#7a5236')
  g.hline(x, x + w - 1, y, '#9a6a46')
  g.hline(x, x + w - 1, y + h, 'rgba(58,40,56,0.22)')
  const blobs: [number, number, number][] = []
  for (let i = 3; i < w - 2; i += 5) for (let j = 3; j < h - 1; j += 5) blobs.push([x + i + (hh(i, j, seed) % 3) - 1, y + j, 3.2])
  canopy(g, blobs, GR, seed + 9)
  for (const [bx, by] of blobs) {
    const v = hh(bx, by, seed)
    const c = v % 3 === 0 ? '#ffd23f' : '#ff9a1a'
    const cl = v % 3 === 0 ? '#fff08a' : '#ffc050'
    const cd = v % 3 === 0 ? '#e0a020' : '#d86a10'
    for (const [dx, dy] of [
      [-1, -1],
      [2, 0],
      [0, 2],
    ]) {
      g.rect(bx + dx - 1, by + dy - 1, 2, 2, c)
      g.px(bx + dx - 1, by + dy - 1, cl)
      g.px(bx + dx, by + dy, cd)
    }
  }
}

/** Low clipped เข็ม border with red flower heads (baked strip). */
export function ixoraBorder(g: Surface, x: number, y: number, w: number, seed = 0, color: Color = '#f0503a') {
  g.rect(x, y + 1, w, 5, DEEP.d)
  g.rect(x, y, w, 4, DEEP.b)
  g.hline(x, x + w - 1, y, DEEP.L)
  g.hline(x, x + w - 1, y + 6, 'rgba(58,40,56,0.22)')
  for (let i = 1; i < w - 1; i += 3) {
    const v = hh(x + i, y, seed)
    if (v % 3 === 0) continue
    g.px(x + i, y - 1 + (v % 2), color)
    g.px(x + i + 1, y + (v % 2), mixHex(color, '#ffffff', 0.35))
  }
}

/** Lotus and water lilies over open water (baked): pads, pink and white blooms, buds. */
export function lotusPatch(g: Surface, cx: number, cy: number, rx: number, ry: number, seed = 0, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = (hh(i, seed, 61) / 1000) * Math.PI * 2
    const d = Math.sqrt(hh(i, seed, 67) / 1000)
    const x = Math.round(cx + Math.cos(a) * rx * d)
    const y = Math.round(cy + Math.sin(a) * ry * d)
    const r = 2.5 + (hh(i, seed, 71) % 3)
    g.ellipse(x, y + 0.5, r, r * 0.55, '#2f7a4f')
    g.ellipse(x, y, r, r * 0.55, '#4fa860')
    g.ellipse(x - r * 0.3, y - r * 0.15, r * 0.45, r * 0.25, '#78c870')
    g.line(x, y, x + r, y - 1, '#3f8a4f')
    const k = hh(i, seed, 73) % 4
    if (k === 0) {
      // Open bloom.
      const c = i % 2 ? '#ff9fc0' : '#fff6f0'
      const cd = i % 2 ? '#f07aa0' : '#f0d8d0'
      g.px(x - 1, y - 2, c)
      g.px(x + 1, y - 2, c)
      g.px(x, y - 3, c)
      g.px(x - 2, y - 1, cd)
      g.px(x + 2, y - 1, cd)
      g.px(x, y - 2, '#ffe45e')
    } else if (k === 1) {
      // Bud on a stalk.
      g.vline(x + 2, y - 4, y - 1, '#5a9a45')
      g.px(x + 2, y - 5, '#ff9fc0')
      g.px(x + 2, y - 6, '#f07aa0')
    }
  }
}

/** Ivy and creepers hanging from the top edge of a wall face (baked). */
export function vines(g: Surface, x: number, y: number, w: number, maxLen = 14, seed = 0, flowers: Color | null = null) {
  g.hline(x, x + w - 1, y, DEEP.d)
  for (let i = 0; i < w; i += 2) {
    if (hh(i, seed, 81) < 250) continue
    const len = 3 + (hh(i, seed, 83) % maxLen)
    for (let j = 0; j < len; j++) {
      const X = x + i + Math.round(Math.sin(j * 0.6 + i) * 0.7)
      const c = j % 3 === 0 ? GR.L : j % 3 === 1 ? GR.b : DEEP.d
      g.px(X, y + j, c)
      if (j % 3 === 0) g.px(X + 1, y + j, GR.d)
      if (flowers && j % 5 === 3 && hh(i, j, seed) < 350) g.px(X, y + j, flowers)
    }
  }
}

/** Dappled shade under a canopy: a soft shadow broken by sun flecks (baked). */
export function dapple(g: Surface, cx: number, cy: number, rx: number, ry: number, seed = 0, strength = 0.55) {
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(30,60,40,0.2)'
  const flecks: [number, number, number][] = []
  for (let i = 0; i < Math.round(rx / 3); i++) {
    const a = (hh(i, seed, 91) / 1000) * Math.PI * 2
    const d = Math.sqrt(hh(i, seed, 93) / 1000) * 0.85
    flecks.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 1.2 + (hh(i, seed, 97) % 3)])
  }
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (d > 1) continue
      if (flecks.some(([fx, fy, fr]) => ((x - fx) / fr) ** 2 + ((y - fy) / (fr * 0.6)) ** 2 < 1)) continue
      if (ditherOn(x, y, (1 - d) * strength * 1.6 + 0.25)) g.ctx.fillRect(x - g.ox, y - g.oy, 1, 1)
    }
  g.ctx.restore()
}

/** Dense planted ground cover (low mounded green with flowers), for beds and verges. */
export function groundCover(g: Surface, x: number, y: number, w: number, h: number, seed = 0, flower: Color | null = null) {
  const blobs: [number, number, number][] = []
  for (let i = 0; i < Math.max(2, Math.round((w * h) / 30)); i++) blobs.push([x + (hh(i, seed, 5) % Math.max(1, w)), y + (hh(i, seed, 7) % Math.max(1, h)), 2.5 + (hh(i, seed, 9) % 2)])
  canopy(g, blobs, DEEP, seed)
  if (flower)
    for (let i = 0; i < (w * h) / 16; i++) {
      const X = x + (hh(i, seed, 11) % Math.max(1, w))
      const Y = y + (hh(i, seed, 13) % Math.max(1, h)) - 1
      g.px(X, Y, flower)
    }
}

/** Is this baked pixel lawn? (green-dominant, opaque). */
export function isGrass(r: number, g: number, b: number, a: number): boolean {
  return a > 200 && g > r + 14 && g > b + 40 && g > 90
}

/**
 * Tufts and tiny wild flowers over every lawn pixel of a baked layer (reads
 * the layer back once, so paths and paving stay clean). Rows above `top` are
 * skipped (sky and distant tree lines).
 */
export function grassTufts(g: Surface, w: number, h: number, density = 0.5, seed = 0, top = 0) {
  const data = g.ctx.getImageData(0, 0, w, h).data
  const lawn = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false
    const i = (y * w + x) * 4
    return isGrass(data[i], data[i + 1], data[i + 2], data[i + 3])
  }
  const n = Math.round(((w * (h - top)) / 100) * density)
  for (let i = 0; i < n; i++) {
    const X = hh(i, seed, 301) % w
    const Y = top + ((hh(i, seed, 307) * 7 + hh(i, seed, 311)) % Math.max(1, h - top))
    // Keep a clean margin from paths and paving.
    if (!lawn(X, Y) || !lawn(X - 3, Y) || !lawn(X + 3, Y) || !lawn(X, Y - 4) || !lawn(X, Y + 2)) continue
    const a = hh(i, seed, 313)
    const k = 2 + (a % 3)
    for (let j = 0; j < k; j++) {
      const hg = 2 + ((a + j * 7) % 3)
      const dx = j - (k >> 1)
      g.vline(X + dx, Y - hg, Y, TUFT[(j + a) % TUFT.length])
      g.px(X + dx + (dx < 0 ? -1 : dx > 0 ? 1 : 0), Y - hg, TUFT[2])
    }
    if (a % 9 === 0) g.px(X + 1, Y - 3, ['#fffaf0', '#ffd23f', '#ff9fc0', '#b8a6ff'][a % 4])
    else if (a % 13 === 0) {
      // A little clover of three leaves.
      g.px(X + 2, Y - 1, '#4f9a4a')
      g.px(X + 3, Y - 1, '#5ea653')
      g.px(X + 2, Y - 2, '#6fb455')
    }
  }
}
