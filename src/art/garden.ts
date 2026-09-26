// Temple garden: trees, shrubs, flower beds and ground painters (grass,
// paving, ponds). Trees return cached Props; ground painters draw straight
// into a baked layer.

import { ditherOn, type Color, type Surface } from '../engine/pixel'
import { P } from './palette'
import { mixHex } from './characters'
import type { Prop } from './props'
import { GOLD, WHITE, sprite, slice, type Ramp } from './temple'

export interface LeafRamp {
  L: Color
  b: Color
  d: Color
  D: Color
}

export const LEAVES = {
  green: { L: '#9ed86a', b: '#5eae55', d: '#3f8a4f', D: '#2c6a45' },
  deep: { L: '#7cc36a', b: '#43905a', d: '#2f6f4b', D: '#224f3e' },
  bodhi: { L: '#b4e486', b: '#76c05e', d: '#4f9a58', D: '#337049' },
  palm: { L: '#a8dc70', b: '#62b058', d: '#3f8a4f', D: '#2c6a45' },
  far: { L: '#8cc0a0', b: '#6aa288', d: '#528670', D: '#40705e' },
} satisfies Record<string, LeafRamp>

/** Leafy blob cluster with top-left light and a little leaf texture. */
export function canopy(g: Surface, blobs: [number, number, number][], r: LeafRamp, seed = 0) {
  for (const [x, y, s] of blobs) g.circle(x, y + 1, s, r.D)
  for (const [x, y, s] of blobs) g.circle(x, y, s, r.d)
  for (const [x, y, s] of blobs) g.circle(x - s * 0.18, y - s * 0.22, s * 0.82, r.b)
  for (const [x, y, s] of blobs) g.circle(x - s * 0.38, y - s * 0.42, s * 0.42, r.L)
  // Leaf texture: little two-pixel strokes.
  for (const [x, y, s] of blobs) {
    const n = Math.round(s * s * 0.35)
    for (let i = 0; i < n; i++) {
      const h = ((i + 1) * 2654435761 + seed * 977 + x * 31 + y * 17) >>> 0
      const a = (h % 628) / 100
      const d = ((h >>> 10) % 100) / 100
      const px = Math.round(x + Math.cos(a) * s * d * 0.9)
      const py = Math.round(y + Math.sin(a) * s * d * 0.9)
      const upper = Math.sin(a) < -0.2 && Math.cos(a) < 0.3
      const c = upper ? r.b : Math.sin(a) > 0.3 ? r.D : r.d
      g.px(px, py, c)
      g.px(px + 1, py - 1, upper ? r.L : r.d)
    }
  }
}

function bark(g: Surface, x0: number, y0: number, x1: number, y1: number, w: number, c: Ramp) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    const ww = Math.max(1, w * (1 - t * 0.45))
    g.rect(Math.round(x - ww / 2), Math.round(y), Math.max(1, Math.round(ww)), 1, c.b)
    g.px(Math.round(x - ww / 2), Math.round(y), c.L)
    if (ww > 2) g.px(Math.round(x + ww / 2) - 1, Math.round(y), c.d)
  }
}

const BARK_GREY: Ramp = { L: '#cbbab2', b: '#a38f86', d: '#7f6a66', D: '#5e4c4c' }
const BARK_BROWN: Ramp = { L: '#b08a6e', b: '#8b6a55', d: '#6b4f41', D: '#4a3128' }

// ---------------------------------------------------------------------------
// Trees.

/** ลีลาวดี – frangipani with candelabra branches and flower clusters. */
export function frangipani(variant = 0): Prop {
  return sprite(`frangi2:${variant}`, 46, 48, 23, 47, (g) => {
    const flip = variant % 2 === 1
    const X = (x: number) => (flip ? 46 - x : x)
    bark(g, X(23), 47, X(23), 30, 5, BARK_GREY)
    bark(g, X(23), 33, X(11), 19, 3.4, BARK_GREY)
    bark(g, X(23), 32, X(35), 17, 3.4, BARK_GREY)
    bark(g, X(23), 30, X(22), 13, 3, BARK_GREY)
    bark(g, X(12), 21, X(6), 15, 2.2, BARK_GREY)
    bark(g, X(33), 20, X(40), 14, 2.2, BARK_GREY)
    g.rect(19, 45, 9, 2, BARK_GREY.d)
    const blobs: [number, number, number][] = [
      [X(7), 12, 6],
      [X(14), 15, 5.5],
      [X(22), 9, 7],
      [X(31), 12, 6],
      [X(39), 11, 5.5],
      [X(17), 5, 4.5],
      [X(29), 5, 4.5],
    ]
    canopy(g, blobs, LEAVES.green, variant)
    const petal = variant >= 2 ? '#ffc4d8' : '#fffaf0'
    const petalD = variant >= 2 ? '#f59abb' : '#f3e7c8'
    const heart = variant >= 2 ? '#ffe45e' : '#ffd23f'
    const flowers: [number, number][] = [
      [5, 8],
      [10, 12],
      [15, 9],
      [20, 4],
      [24, 7],
      [27, 2],
      [32, 8],
      [37, 6],
      [41, 10],
      [13, 16],
      [30, 14],
      [22, 12],
      [17, 2],
      [35, 13],
    ]
    for (const [fx, fy] of flowers) {
      const x = X(fx)
      g.px(x, fy - 1, petal)
      g.px(x - 1, fy, petal)
      g.px(x + 1, fy, petal)
      g.px(x, fy + 1, petalD)
      g.px(x, fy, heart)
    }
  })
}

/** ต้นตะเคียนทอง – the sacred tree, trunk wrapped in seven-colour cloth (ผ้าแพร). */
export function takhianTree(): Prop {
  return sprite('takhian', 88, 98, 44, 97, (g) => {
    // Buttress roots.
    g.poly(
      [
        [24, 97],
        [34, 80],
        [54, 80],
        [64, 97],
      ],
      BARK_BROWN.d,
    )
    g.poly(
      [
        [28, 97],
        [36, 82],
        [44, 82],
        [40, 97],
      ],
      BARK_BROWN.b,
    )
    g.poly(
      [
        [48, 97],
        [50, 84],
        [56, 86],
        [60, 97],
      ],
      BARK_BROWN.b,
    )
    // Trunk.
    for (let y = 44; y < 86; y++) slice(g, 44, y, 9 - (86 - y) * 0.03, BARK_BROWN, 0.3)
    for (let y = 48; y < 84; y += 5) g.px(42 + ((y * 7) % 5), y, BARK_BROWN.D)
    bark(g, 44, 50, 26, 34, 6, BARK_BROWN)
    bark(g, 44, 48, 64, 32, 6, BARK_BROWN)
    // Seven-colour cloth bands (ผ้าแพรเจ็ดสี) spiralling around the trunk.
    const bands: Color[] = ['#e8514a', '#ffd23f', '#ff9fc0', '#6cc36a', '#5a8de0', '#f58f35', '#b394f0']
    bands.forEach((c, i) => {
      const y = 60 + i * 2.4
      for (let x = 35; x <= 53; x++) {
        const yy = Math.round(y + (x - 44) * 0.12)
        g.px(x, yy, c)
        g.px(x, yy + 1, i % 2 ? mixHex(c, '#3a2838', 0.2) : c)
      }
      g.px(35, Math.round(y - 1), mixHex(c, '#ffffff', 0.35))
    })
    // Hanging cloth tails.
    g.rect(52, 66, 2, 9, '#e8514a')
    g.rect(54, 68, 2, 8, '#ffd23f')
    g.rect(35, 70, 2, 7, '#5a8de0')
    g.px(53, 75, '#ff9fc0')
    // Canopy.
    canopy(
      g,
      [
        [44, 28, 22],
        [20, 38, 13],
        [68, 38, 13],
        [29, 16, 13],
        [59, 16, 13],
        [44, 10, 11],
        [12, 30, 8],
        [76, 30, 8],
      ],
      LEAVES.deep,
      3,
    )
    // Little golden leaves glint (ตะเคียนทอง).
    for (const [x, y] of [
      [30, 20],
      [55, 12],
      [66, 34],
      [18, 36],
      [44, 6],
    ])
      g.px(x, y, GOLD.l)
  })
}

/** ต้นโพธิ์ – bodhi tree on a round white base with cloth and wooden props (ไม้ค้ำโพธิ์). */
export function bodhiTree2(): Prop {
  return sprite('bodhi2', 90, 96, 45, 95, (g) => {
    // Round platform.
    g.ellipse(45, 89, 30, 6, WHITE.D)
    g.ellipse(45, 88, 30, 6, WHITE.b)
    g.rect(15, 88, 61, 5, WHITE.b)
    g.ellipse(45, 93, 30, 3, WHITE.D)
    g.rect(15, 88, 61, 1, '#ffffff')
    for (let x = 17; x < 75; x += 4) g.px(x, 90, GOLD.d)
    g.ellipse(45, 87, 26, 4.5, '#b0906c')
    g.ellipse(45, 87, 25, 3.8, '#9a7a58')
    // Trunk with aerial roots.
    for (let y = 46; y < 88; y++) slice(g, 45, y, 7.5 + (y > 80 ? (y - 80) * 0.6 : 0), BARK_GREY, 0.3)
    for (const dx of [-5, -2, 3, 6]) g.vline(45 + dx, 60, 86, BARK_GREY.d)
    bark(g, 45, 52, 26, 36, 5, BARK_GREY)
    bark(g, 45, 50, 64, 34, 5, BARK_GREY)
    bark(g, 45, 48, 44, 26, 4, BARK_GREY)
    // Wooden Y-props leaning against the branches.
    for (const [x0, x1, y1] of [
      [22, 30, 40],
      [68, 60, 39],
      [30, 34, 44],
    ] as [number, number, number][]) {
      g.line(x0, 87, x1, y1, '#c9a070')
      g.line(x0 + 1, 87, x1 + 1, y1, '#9a6a45')
      g.px(x1 - 1, y1 - 1, '#c9a070')
      g.px(x1 + 2, y1 - 1, '#c9a070')
    }
    // Cloth around the trunk.
    for (const [y, c] of [
      [66, '#ffd23f'],
      [69, '#e8514a'],
      [72, '#fffaf0'],
    ] as [number, Color][]) {
      g.rect(38, y, 15, 2, c)
      g.hline(38, 52, y + 1, mixHex(c, '#3a2838', 0.2))
    }
    // Canopy with heart-shaped leaf sparkle.
    canopy(
      g,
      [
        [45, 30, 22],
        [21, 38, 14],
        [69, 38, 14],
        [30, 16, 13],
        [60, 16, 13],
        [45, 9, 10],
        [11, 32, 8],
        [79, 32, 8],
      ],
      LEAVES.bodhi,
      7,
    )
    for (let i = 0; i < 40; i++) {
      const h = ((i + 3) * 2654435761) >>> 0
      const x = 8 + (h % 74)
      const y = 4 + ((h >>> 8) % 44)
      g.px(x, y, LEAVES.bodhi.L)
    }
  })
}

export function coconutPalm(variant = 0): Prop {
  return sprite(`coco:${variant}`, 44, 70, 22, 69, (g) => {
    const lean = variant % 2 ? -1 : 1
    for (let y = 18; y < 70; y++) {
      const t = (70 - y) / 52
      const x = 22 + Math.round(Math.sin(t * 1.4) * 5 * lean)
      g.rect(x - 1, y, 3, 1, y % 4 === 0 ? '#8b6a55' : '#b08a6e')
      g.px(x - 1, y, '#c9a888')
    }
    const tx = 22 + Math.round(Math.sin(1.4) * 5 * lean)
    const fronds: [number, number][] = [
      [-19, 8],
      [-15, -4],
      [-6, -11],
      [5, -12],
      [15, -5],
      [20, 7],
      [12, 13],
      [-11, 13],
    ]
    for (const [dx, dy] of fronds) {
      const n = 12
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = tx + dx * t
        const y = 18 + dy * t + Math.sin(t * Math.PI) * -2 + t * t * 4
        g.px(x, y, LEAVES.palm.b)
        g.px(x, y + 1, LEAVES.palm.d)
        if (i % 2 === 0 && i > 1) {
          g.px(x + (dx > 0 ? -1 : 1), y + 2, LEAVES.palm.d)
          g.px(x, y + 2, LEAVES.palm.D)
        }
        if (i % 3 === 0) g.px(x, y - 1, LEAVES.palm.L)
      }
    }
    g.circle(tx - 1, 20, 2.2, '#7a5a3a')
    g.circle(tx + 2, 21, 2, '#8b6a4a')
    g.px(tx - 2, 19, '#a88a5a')
  })
}

/** Clipped topiary (ไม้ดัด) – stacked cloud-pruned balls on a crooked trunk. */
export function topiary(variant = 0): Prop {
  return sprite(`topiary:${variant}`, 22, 30, 11, 29, (g) => {
    bark(g, 11, 29, 9, 18, 3, BARK_BROWN)
    bark(g, 10, 22, 15, 14, 2, BARK_BROWN)
    bark(g, 10, 20, 6, 9, 2, BARK_BROWN)
    const r = variant === 1 ? LEAVES.deep : LEAVES.green
    canopy(g, [[15, 13, 4.5]], r, 1)
    canopy(g, [[6, 9, 4]], r, 2)
    canopy(g, [[11, 5, 4.5]], r, 3)
    if (variant === 2) for (const [x, y] of [[14, 11], [5, 7], [12, 3], [16, 14]]) g.px(x, y, '#ff9fc0')
  })
}

/** Bougainvillea bush with magenta bracts. */
export function bougainvillea(variant = 0): Prop {
  return sprite(`bougain:${variant}`, 24, 18, 12, 17, (g) => {
    canopy(
      g,
      [
        [7, 11, 6],
        [16, 11, 6],
        [12, 7, 6],
      ],
      LEAVES.green,
      variant,
    )
    const c = variant === 1 ? '#ff8a3d' : '#e8489a'
    const cl = variant === 1 ? '#ffbb66' : '#ff8ac4'
    for (let i = 0; i < 26; i++) {
      const h = ((i + 1) * 2654435761 + variant * 13) >>> 0
      const x = 3 + (h % 18)
      const y = 2 + ((h >>> 8) % 13)
      g.px(x, y, i % 3 ? c : cl)
      if (i % 2) g.px(x + 1, y, c)
    }
  })
}

/** Low round shrub. */
export function shrub(variant = 0): Prop {
  return sprite(`shrub:${variant}`, 18, 12, 9, 11, (g) => {
    canopy(
      g,
      [
        [5, 7, 4.5],
        [12, 7, 4.5],
        [9, 5, 4.5],
      ],
      variant === 1 ? LEAVES.deep : LEAVES.green,
      variant + 11,
    )
    if (variant === 2) for (const [x, y] of [[4, 5], [9, 2], [13, 6], [7, 7]]) g.px(x, y, '#fffaf0')
  })
}

export function bananaPlant(): Prop {
  return sprite('banana2', 30, 36, 15, 35, (g) => {
    g.rect(14, 16, 3, 20, '#8fbf5a')
    g.rect(16, 16, 1, 20, '#6a9a45')
    const leaf = (x0: number, y0: number, x1: number, y1: number) => {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0))
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = x0 + (x1 - x0) * t
        const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * -2
        const w = Math.sin(t * Math.PI) * 2.5
        g.rect(Math.round(x), Math.round(y - w), 1, Math.max(1, Math.round(w * 2)), LEAVES.green.b)
        g.px(Math.round(x), Math.round(y - w), LEAVES.green.L)
        g.px(Math.round(x), Math.round(y + w), LEAVES.green.d)
      }
    }
    leaf(15, 16, 1, 10)
    leaf(15, 15, 29, 8)
    leaf(15, 14, 6, 1)
    leaf(16, 14, 24, 0)
    g.rect(20, 20, 4, 5, '#c9d86a')
    g.px(21, 25, '#7a3a55')
    g.px(22, 26, '#7a3a55')
  })
}

/** Distant tree line with atmospheric colour. */
export function treeLine(g: Surface, y: number, w: number, r: LeafRamp = LEAVES.far, seed = 0) {
  const blobs: [number, number, number][] = []
  for (let x = -8; x < w + 12; x += 9) {
    const h = ((x + 50) * 2654435761 + seed) >>> 0
    blobs.push([x, y + (h % 5), 8 + ((h >>> 5) % 5)])
  }
  canopy(g, blobs, r, seed)
  g.rect(0, y + 6, w, 20, r.d)
}

// ---------------------------------------------------------------------------
// Ground painters (for baked layers).

const GRASS = { L: '#a8dc72', b: '#86c95f', d: '#6fb455', D: '#5ea653' }

function hash(x: number, y: number, s = 0) {
  return (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

/** Lush lawn with mottled tones, tufts and tiny flowers. */
export function lawn(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, GRASS.b)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      // Large soft patches.
      const n = Math.sin(X * 0.09 + seed) + Math.cos(Y * 0.11 + X * 0.03) + Math.sin((X + Y) * 0.05)
      if (n > 1.4 && ditherOn(X, Y, 0.5)) g.px(X, Y, GRASS.L)
      else if (n < -1.3 && ditherOn(X, Y, 0.5)) g.px(X, Y, GRASS.d)
      const v = hash(X, Y, seed)
      if (v < 25) g.px(X, Y, GRASS.D)
      else if (v > 985) g.px(X, Y, GRASS.L)
    }
  for (let i = 0; i < (w * h) / 110; i++) {
    const hh = ((i + 1) * 2654435761 + seed * 97) >>> 0
    const X = x + (hh % w)
    const Y = y + ((hh >>> 8) % h)
    g.px(X, Y, GRASS.D)
    g.px(X + 1, Y - 1, GRASS.d)
    g.px(X + 2, Y, GRASS.D)
    if (i % 9 === 0) {
      const c = [P.white, P.pink, P.yellow, '#b8a6ff'][i % 4]
      g.px(X + 4, Y - 2, c)
    }
  }
}

/** Large pale stone slabs with joints (paths and courtyards). */
export function paving(g: Surface, x: number, y: number, w: number, h: number, size = 8, tone: 'cream' | 'grey' = 'cream') {
  const base = tone === 'cream' ? '#f1e8da' : '#e4ddd6'
  const joint = tone === 'cream' ? '#d8c9b2' : '#c9bfb8'
  const light = tone === 'cream' ? '#fbf6ec' : '#f2eee9'
  g.rect(x, y, w, h, base)
  for (let j = 0; j < h; j += size) {
    const off = (Math.floor(j / size) % 2) * (size >> 1)
    g.hline(x, x + w - 1, y + j, joint)
    for (let i = -off; i < w; i += size) {
      if (i > 0) g.vline(x + i, y + j, Math.min(y + h - 1, y + j + size - 1), joint)
      if (i + 1 >= 0) g.hline(x + Math.max(0, i + 1), x + Math.min(w - 1, i + size - 2), y + j + 1, light)
      // Subtle per-slab tint.
      const v = hash(x + i, y + j, 5)
      if (v < 200) for (let k = 2; k < size - 1; k += 3) g.px(x + Math.max(0, i + k), y + j + 3 + (k % 3), mixHex(base, joint, 0.5))
    }
  }
}

/** Border of darker kerb stones around an area. */
export function kerb(g: Surface, x: number, y: number, w: number, h: number) {
  g.frame(x, y, w, h, '#c9b69a')
  g.hline(x + 1, x + w - 2, y + h, 'rgba(58,40,56,0.18)')
}

/** A lotus-mandala medallion set into the paving. */
export function mandala(g: Surface, cx: number, cy: number, r: number) {
  g.ellipse(cx, cy, r, r * 0.55, '#e3d3bb')
  g.ellipse(cx, cy, r - 1.5, r * 0.55 - 1, '#f6eedf')
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const x = cx + Math.cos(a) * (r - 4)
    const y = cy + Math.sin(a) * (r - 4) * 0.55
    g.ellipse(x, y, 2, 1.2, i % 2 ? '#f0c86a' : '#e8a86a')
  }
  g.ellipse(cx, cy, r * 0.45, r * 0.25, '#e9c46a')
  g.ellipse(cx, cy, r * 0.3, r * 0.16, '#fff0c0')
}

/** Flower bed: soil with rows of blooms. */
export function flowerBed(g: Surface, x: number, y: number, w: number, h: number, palette: Color[], seed = 0) {
  g.rect(x, y, w, h, '#8a6040')
  g.rect(x, y, w, 1, '#a8784e')
  g.rect(x - 1, y + h, w + 2, 1, WHITE.D)
  g.rect(x - 1, y - 1, w + 2, 1, WHITE.b)
  g.vline(x - 1, y - 1, y + h, WHITE.d)
  g.vline(x + w, y - 1, y + h, WHITE.d)
  for (let j = 1; j < h - 1; j += 2)
    for (let i = 1; i < w - 1; i += 2) {
      const v = hash(x + i, y + j, seed)
      g.px(x + i, y + j + 1, LEAVES.green.d)
      g.px(x + i + 1, y + j + 1, LEAVES.green.b)
      const c = palette[v % palette.length]
      g.px(x + i, y + j, c)
      if (v % 3 === 0) g.px(x + i + 1, y + j, mixHex(c, '#ffffff', 0.35))
    }
}

/** Neatly clipped hedge strip (baked). */
export function hedge(g: Surface, x: number, y: number, w: number, h = 6) {
  g.rect(x, y + 1, w, h, LEAVES.deep.d)
  g.rect(x, y, w, h - 1, LEAVES.green.b)
  g.hline(x, x + w - 1, y, LEAVES.green.L)
  g.hline(x, x + w - 1, y + h, LEAVES.deep.D)
  for (let i = 0; i < w; i += 2) {
    const v = hash(x + i, y, 3)
    g.px(x + i, y + 1 + (v % Math.max(1, h - 2)), v % 2 ? LEAVES.green.L : LEAVES.green.d)
  }
  g.hline(x, x + w - 1, y + h + 1, 'rgba(58,40,56,0.2)')
}

/** Organic pond (union of ellipses) with rim stones, depth and reflections. */
export function pondBed(g: Surface, blobs: [number, number, number, number][], sky = '#bff0f6') {
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy + 1, rx + 4, ry + 3.5, '#8c8187')
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy, rx + 3, ry + 3, '#bdb2ae')
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy, rx + 1, ry + 1, '#4f8fb0')
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy + 0.5, rx, ry, '#5fb8d4')
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy + 1.5, rx - 3, ry - 2, '#4aa0c8')
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx + 1, cy + 2.5, rx - 8, ry - 5, '#3a86b4')
  // Upper rim shadow onto the water.
  for (const [cx, cy, rx, ry] of blobs) {
    for (let x = -rx + 2; x < rx - 2; x++) {
      const yy = cy - ry * Math.sqrt(Math.max(0, 1 - (x / rx) * (x / rx)))
      g.px(cx + x, yy + 1, '#3f7ea0')
    }
  }
  // Sky reflection glints.
  for (const [cx, cy, rx, ry] of blobs) {
    for (let i = 0; i < rx / 3; i++) {
      const x = cx - rx * 0.5 + ((i * 37) % Math.max(1, rx))
      const y = cy - ry * 0.2 + ((i * 11) % Math.max(1, ry)) * 0.6
      g.hline(x, x + 2 + (i % 3), y, sky)
    }
  }
  // Rim stones.
  for (const [cx, cy, rx, ry] of blobs) {
    for (let a = 0; a < Math.PI * 2; a += 0.28) {
      const x = cx + Math.cos(a) * (rx + 2.5)
      const y = cy + Math.sin(a) * (ry + 2.5)
      const v = hash(Math.round(x), Math.round(y), 9)
      g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 2, v % 3 ? '#d8d0cb' : '#c9bfb8')
      g.px(Math.round(x) - 1, Math.round(y) - 1, '#f0ebe6')
    }
  }
}

/** Lily pad (baked). */
export function lilyPad(g: Surface, x: number, y: number, r: number, seed = 0) {
  g.ellipse(x, y + 0.5, r, r * 0.6, '#2f7a4f')
  g.ellipse(x, y, r, r * 0.6, '#4fa860')
  g.ellipse(x - r * 0.25, y - r * 0.15, r * 0.5, r * 0.3, '#78c870')
  // Notch.
  const a = (seed % 6) * 1.05
  g.line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, '#3f8a4f')
}

/** Reeds and grasses at a pond edge (baked). */
export function reeds(g: Surface, x: number, y: number, n = 5) {
  for (let i = 0; i < n; i++) {
    const h = 5 + ((i * 7) % 5)
    const xx = x + i * 2 - n
    g.vline(xx, y - h, y, i % 2 ? LEAVES.green.d : LEAVES.green.b)
    g.px(xx + (i % 2 ? 1 : -1), y - h, LEAVES.green.L)
    if (i % 3 === 0) {
      g.rect(xx, y - h - 3, 1, 3, '#9a6a45')
    }
  }
}

/** Soft ground shadow blob (baked into the layer under trees). */
export function groundShadow(g: Surface, cx: number, cy: number, rx: number, ry: number, strength = 0.5) {
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(40,60,50,0.16)'
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      if (d <= 1 && ditherOn(x, y, (1 - d) * strength * 1.6 + 0.2)) g.ctx.fillRect(x - g.ox, y - g.oy, 1, 1)
    }
  g.ctx.restore()
}

/** Age the paving: moss in the joints, hairline cracks and stains. */
export function weather(g: Surface, x: number, y: number, w: number, h: number, seed = 0, amount = 1) {
  const n = Math.round(((w * h) / 90) * amount)
  for (let i = 0; i < n; i++) {
    const hh = ((i + 7) * 2654435761 + seed * 7919) >>> 0
    const X = x + (hh % w)
    const Y = y + ((hh >>> 9) % h)
    const kind = (hh >>> 20) % 10
    if (kind < 5) {
      // Moss clump.
      g.px(X, Y, '#8ab860')
      g.px(X + 1, Y, '#6fa050')
      if (kind < 2) {
        g.px(X, Y + 1, '#6fa050')
        g.px(X - 1, Y, '#a8cc78')
      }
    } else if (kind < 7) {
      // Crack.
      let cx = X
      let cy = Y
      for (let k = 0; k < 4; k++) {
        g.px(cx, cy, '#b8a890')
        cx += ((hh >> k) & 1) ? 1 : -1
        cy += 1
      }
    } else if (kind === 7) {
      // Old stain.
      g.px(X, Y, '#e2d6c2')
      g.px(X + 1, Y, '#e2d6c2')
      g.px(X, Y + 1, '#e8dcc8')
    } else {
      // A fallen leaf.
      g.px(X, Y, kind === 8 ? '#c9a04c' : '#8fbf5a')
      g.px(X + 1, Y - 1, kind === 8 ? '#b0803a' : '#6a9a45')
    }
  }
}

/** Rain puddle reflecting the sky. */
export function puddle(g: Surface, cx: number, cy: number, rx: number, ry: number) {
  g.ellipse(cx, cy + 0.5, rx + 1, ry + 0.8, 'rgba(90,80,100,0.25)')
  g.ellipse(cx, cy, rx, ry, '#a8d4e8')
  g.ellipse(cx - rx * 0.2, cy - ry * 0.2, rx * 0.6, ry * 0.5, '#c8ecf6')
  g.hline(cx - rx * 0.5, cx - rx * 0.1, cy - ry * 0.3, '#ffffff')
  g.px(cx + rx * 0.4, cy + ry * 0.2, '#88b8d4')
}

/** Leaf litter scattered over lawn. */
export function leafLitter(g: Surface, x: number, y: number, w: number, h: number, n: number, seed = 0) {
  const cols = ['#c9a04c', '#d9b25f', '#9a8a4a', '#e0a060', '#fffaf0']
  for (let i = 0; i < n; i++) {
    const hh = ((i + 3) * 2654435761 + seed * 131) >>> 0
    const X = x + (hh % w)
    const Y = y + ((hh >>> 8) % h)
    const c = cols[(hh >>> 16) % cols.length]
    g.px(X, Y, c)
    if ((hh >>> 3) % 2) g.px(X + 1, Y, c)
  }
}

export { GOLD, WHITE }
