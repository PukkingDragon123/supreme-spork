// Temple props, drawn procedurally into cached canvases. Each prop returns a
// sprite plus an anchor (the pixel on the ground the prop stands on) so the
// world can y-sort props and characters together.

import { bake, ditherOn, Surface, type Color } from '../engine/pixel'
import { cached, makeSprite, outlineCanvas, type Sprite } from '../engine/sprite'
import { P } from './palette'
import { mixHex } from './characters'

export interface Prop extends Sprite {
  /** Anchor offset inside the sprite (usually bottom centre). */
  ax: number
  ay: number
}

function prop(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface) => void, outline = true): Prop {
  return cached(key, () => {
    const c = bake(w, h, fn)
    if (!outline) return { canvas: c, w, h, ax, ay } as Prop
    const o = outlineCanvas(c, P.ink)
    return { ...o, ax: ax + 1, ay: ay + 1 } as Prop
  }) as Prop
}

// ---------------------------------------------------------------------------
// Roof helpers shared with buildings.

/** Thai gable (หน้าบัน) with gold barge boards, chofa and hang hong. */
export function drawGable(
  g: Surface,
  cx: number,
  baseY: number,
  halfW: number,
  height: number,
  opts: { face?: Color; faceD?: Color; trim?: Color; trimD?: Color; emblem?: boolean } = {},
) {
  const face = opts.face ?? P.redD
  const faceD = opts.faceD ?? P.redDD
  const trim = opts.trim ?? P.gold
  const trimD = opts.trimD ?? P.goldD
  const peakY = baseY - height
  // Pediment face.
  g.poly(
    [
      [cx - halfW, baseY],
      [cx, peakY],
      [cx + halfW, baseY],
    ],
    face,
  )
  // Darker inner triangle for depth.
  g.poly(
    [
      [cx - halfW + 6, baseY - 1],
      [cx, peakY + 7],
      [cx + halfW - 6, baseY - 1],
    ],
    faceD,
  )
  if (opts.emblem !== false) {
    // Gold emblem: a lotus-like motif in the pediment.
    const ey = baseY - Math.round(height * 0.38)
    g.circle(cx, ey, Math.max(2, height * 0.13), trim)
    g.circle(cx, ey, Math.max(1, height * 0.07), trimD)
    for (let i = -2; i <= 2; i++) {
      g.rect(cx + i * 3 - 0.5, ey + height * 0.16, 1, 2, trim)
    }
    g.hline(cx - halfW * 0.45, cx + halfW * 0.45, baseY - 3, trimD)
  }
  // Barge boards with serrated ใบระกา.
  const steps = Math.max(1, Math.round(halfW))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const xL = Math.round(cx - halfW * (1 - t))
    const xR = Math.round(cx + halfW * (1 - t))
    const y = Math.round(baseY - height * t)
    g.px(xL, y, trim)
    g.px(xL + 1, y, trimD)
    g.px(xR, y, trim)
    g.px(xR - 1, y, trimD)
    if (i % 3 === 0 && i > 1 && i < steps - 1) {
      g.px(xL - 1, y - 1, trim)
      g.px(xR + 1, y - 1, trim)
    }
  }
  // Chofa at the peak: a slender curved hook.
  g.px(cx, peakY - 1, trim)
  g.px(cx, peakY - 2, trim)
  g.px(cx + 1, peakY - 3, trim)
  g.px(cx + 1, peakY - 4, trim)
  g.px(cx + 2, peakY - 5, trim)
  g.px(cx + 3, peakY - 5, trimD)
  // Hang hong curls at the eaves.
  g.px(cx - halfW - 1, baseY, trim)
  g.px(cx - halfW - 2, baseY - 1, trim)
  g.px(cx - halfW - 2, baseY - 2, trim)
  g.px(cx + halfW + 1, baseY, trim)
  g.px(cx + halfW + 2, baseY - 1, trim)
  g.px(cx + halfW + 2, baseY - 2, trim)
}

/** Sloping tiled eave seen from the front (ปีกนก). */
export function drawEave(g: Surface, x0: number, x1: number, yTop: number, yBot: number, side: 'left' | 'right', tile: Color = P.orange, tileD: Color = P.orangeD, edge: Color = P.leaf) {
  const w = x1 - x0
  for (let x = 0; x <= w; x++) {
    const t = side === 'left' ? 1 - x / w : x / w
    const top = Math.round(yTop + (yBot - yTop) * t * 0.9)
    const bottom = Math.round(yBot + 2)
    for (let y = top; y <= bottom; y++) {
      const band = (y - top) % 3 === 2
      g.px(x0 + x, y, band ? tileD : tile)
    }
    g.px(x0 + x, bottom + 1, edge)
    g.px(x0 + x, top, mixHex(tile, '#ffffff', 0.25))
  }
}

// ---------------------------------------------------------------------------
// Trees and plants.

function blob(g: Surface, cx: number, cy: number, r: number, base: Color, light: Color, dark: Color) {
  g.circle(cx, cy, r, dark)
  g.circle(cx - 0.6, cy - 0.8, r - 0.8, base)
  g.circle(cx - r * 0.35, cy - r * 0.4, r * 0.45, light)
}

export function frangipaniTree(variant = 0): Prop {
  return prop(`tree-frangipani-${variant}`, 36, 40, 18, 39, (g) => {
    const trunk = '#a98f84'
    const trunkD = '#7f6a66'
    // Trunk & branches.
    g.rect(17, 24, 3, 16, trunk)
    g.rect(19, 24, 1, 16, trunkD)
    g.line(18, 26, 9, 15, trunk)
    g.line(19, 25, 27, 14, trunk)
    g.line(18, 22, 17, 10, trunk)
    g.rect(15, 38, 7, 2, trunkD)
    // Leaf clusters.
    const L = P.leaf
    const LL = P.grass
    const LD = P.leafD
    blob(g, 9, 13, 6.5, L, LL, LD)
    blob(g, 27, 12, 6.5, L, LL, LD)
    blob(g, 18, 8, 7, L, LL, LD)
    blob(g, 13, 18, 4, L, LL, LD)
    blob(g, 24, 18, 4, L, LL, LD)
    // Flowers.
    const petal = variant % 2 === 0 ? '#fffaf0' : '#ffc4d8'
    const flowers = [
      [7, 10],
      [11, 14],
      [16, 5],
      [21, 7],
      [26, 9],
      [30, 13],
      [24, 16],
      [14, 17],
      [19, 11],
    ]
    for (const [x, y] of flowers) {
      g.px(x, y, petal)
      g.px(x + 1, y, petal)
      g.px(x, y + 1, petal)
      g.px(x + 1, y + 1, P.yellow)
    }
  })
}

/** Big sacred tree (ต้นตะเคียน) with coloured cloth wrapped around the trunk. */
export function sacredTree(): Prop {
  return prop('tree-sacred', 76, 84, 38, 83, (g) => {
    const bark = '#8b6a55'
    const barkD = '#6b4f41'
    const barkL = '#a9876f'
    // Roots.
    g.poly(
      [
        [22, 84],
        [30, 70],
        [46, 70],
        [54, 84],
      ],
      barkD,
    )
    // Trunk.
    g.rect(29, 40, 18, 40, bark)
    g.rect(29, 40, 4, 40, barkL)
    g.rect(43, 40, 4, 40, barkD)
    for (let y = 42; y < 78; y += 5) g.px(36 + ((y * 7) % 5), y, barkD)
    // Three-colour cloth (ผ้าสามสี).
    const bands: Color[] = ['#e8514a', '#ffd23f', '#6cc36a']
    bands.forEach((c, i) => {
      const y = 56 + i * 3
      g.rect(28, y, 20, 3, c)
      g.rect(28, y + 2, 20, 1, mixHex(c, '#3a2838', 0.25))
    })
    // A tiny ribbon tail.
    g.rect(46, 62, 2, 6, '#e8514a')
    g.rect(47, 64, 2, 6, '#ffd23f')
    // Canopy.
    const L = '#3f8a4f'
    const LL = '#6cb85c'
    const LD = '#2c6a45'
    blob(g, 38, 24, 22, L, LL, LD)
    blob(g, 16, 34, 13, L, LL, LD)
    blob(g, 60, 34, 13, L, LL, LD)
    blob(g, 28, 12, 12, L, LL, LD)
    blob(g, 50, 13, 12, L, LL, LD)
    // Dither texture on the canopy.
    const img = g.ctx.getImageData(0, 0, 76, 50).data
    for (let y = 2; y < 50; y++)
      for (let x = 2; x < 74; x++) {
        if ((x * 13 + y * 7) % 17 === 0 && img[(y * 76 + x) * 4 + 3] > 0) g.px(x, y, LD)
      }
    // Small offerings at the base: garland and a doll dress.
    g.rect(24, 78, 4, 4, '#ff9fc0')
    g.rect(25, 76, 2, 2, '#ffd6e0')
    g.rect(49, 79, 4, 3, '#f58f35')
  })
}

export function bodhiTree(): Prop {
  return prop('tree-bodhi', 60, 70, 30, 69, (g) => {
    g.rect(26, 40, 8, 30, '#8b7465')
    g.rect(26, 40, 2, 30, '#a69080')
    g.rect(32, 40, 2, 30, '#6b5a50')
    g.line(29, 44, 16, 32, '#8b7465')
    g.line(30, 44, 44, 30, '#8b7465')
    const L = '#4f9a58'
    const LL = '#86c95f'
    const LD = '#337049'
    blob(g, 30, 22, 18, L, LL, LD)
    blob(g, 13, 30, 11, L, LL, LD)
    blob(g, 47, 29, 11, L, LL, LD)
    // Heart shaped leaf highlights.
    for (let i = 0; i < 26; i++) {
      const x = 6 + ((i * 37) % 48)
      const y = 8 + ((i * 23) % 34)
      g.px(x, y, '#b4e486')
    }
  })
}

export function palmTree(): Prop {
  return prop('tree-palm', 34, 56, 17, 55, (g) => {
    // Curved trunk.
    for (let y = 14; y < 56; y++) {
      const x = 16 + Math.round(Math.sin((y - 14) / 16) * 3)
      g.rect(x, y, 3, 1, (y % 4 === 0 ? '#8b6a55' : '#a8876c'))
    }
    const L = '#43905a'
    const LL = '#86c95f'
    const fronds: [number, number][] = [
      [-14, 6],
      [-10, -4],
      [0, -9],
      [10, -5],
      [15, 5],
      [8, 10],
      [-8, 10],
    ]
    for (const [dx, dy] of fronds) {
      g.line(17, 14, 17 + dx, 14 + dy, L)
      g.line(17, 13, 17 + dx, 13 + dy, LL)
      g.line(17, 15, 17 + dx, 15 + dy + 1, L)
    }
    g.circle(16, 16, 2.4, '#7a5a3a')
    g.circle(19, 17, 2, '#8b6a4a')
  })
}

export function pineTree(): Prop {
  return prop('tree-pine', 26, 48, 13, 47, (g) => {
    g.rect(12, 38, 3, 10, '#7a5a48')
    const tiers = [
      [38, 12],
      [30, 10],
      [22, 8],
      [14, 5],
    ]
    for (const [y, hw] of tiers) {
      g.poly(
        [
          [13 - hw, y],
          [13.5, y - 14],
          [14 + hw, y],
        ],
        '#2f6f4b',
      )
      g.poly(
        [
          [13 - hw + 2, y - 1],
          [13.5, y - 13],
          [13.5, y - 1],
        ],
        '#43905a',
      )
    }
  })
}

export function bananaTree(): Prop {
  return prop('tree-banana', 30, 40, 15, 39, (g) => {
    g.rect(14, 16, 3, 24, '#8fbf5a')
    g.rect(16, 16, 1, 24, '#6a9a45')
    const leaf = (x0: number, y0: number, x1: number, y1: number) => {
      g.line(x0, y0, x1, y1, '#5ea653')
      g.line(x0, y0 + 1, x1, y1 + 1, '#86c95f')
      g.line(x0, y0 + 2, x1, y1 + 3, '#5ea653')
    }
    leaf(15, 16, 1, 8)
    leaf(15, 15, 28, 6)
    leaf(15, 14, 8, 1)
    leaf(16, 14, 22, 0)
    g.rect(20, 22, 4, 6, '#c9d86a')
    g.rect(21, 28, 2, 2, '#7a3a55')
  })
}

export function bush(variant = 0): Prop {
  return prop(`bush-${variant}`, 18, 11, 9, 10, (g) => {
    blob(g, 6, 6, 5, P.grass, P.grassL, P.grassD)
    blob(g, 12, 6, 5, P.grass, P.grassL, P.grassD)
    blob(g, 9, 4, 4, P.grass, P.grassL, P.grassD)
    if (variant === 1) {
      for (const [x, y] of [
        [4, 4],
        [9, 2],
        [13, 5],
        [7, 7],
      ])
        g.px(x, y, '#ff9fc0')
    } else if (variant === 2) {
      for (const [x, y] of [
        [5, 3],
        [10, 3],
        [13, 6],
        [7, 7],
      ])
        g.px(x, y, '#ffd23f')
    }
  })
}

// ---------------------------------------------------------------------------
// Temple furniture.

/** Row of bells under a little roof (ระฆัง). */
export function bellRow(n = 5): Prop {
  const w = n * 12 + 10
  return prop(`bell-row-${n}`, w, 44, Math.floor(w / 2), 43, (g) => {
    const wood = '#b8343f'
    const woodD = '#7e2436'
    // Roof.
    g.poly(
      [
        [0, 10],
        [6, 2],
        [w - 7, 2],
        [w - 1, 10],
      ],
      P.orange,
    )
    for (let y = 4; y <= 9; y += 2) g.hline(2 + (10 - y) * 0, w - 3, y, P.orangeD)
    g.hline(0, w - 1, 10, P.leaf)
    g.hline(6, w - 7, 2, P.gold)
    // Posts and beam.
    g.rect(3, 11, 3, 33, wood)
    g.rect(w - 6, 11, 3, 33, wood)
    g.rect(3, 11, 1, 33, P.redL)
    g.rect(2, 14, w - 4, 3, wood)
    g.hline(2, w - 3, 16, woodD)
    // Bells.
    for (let i = 0; i < n; i++) {
      const bx = 10 + i * 12
      drawBell(g, bx, 18, 0)
    }
  })
}

/** A single bell with its top at (x, y); `swing` shears it sideways. */
export function drawBell(g: Surface, x: number, y: number, swing: number, scale = 1) {
  const rows = [
    '...kk...',
    '..gGGg..',
    '.gGGGGg.',
    '.gGGGGd.',
    '.gGGGGd.',
    '.gGGGGd.',
    'gGGGGGdd',
    'dddddddd',
    '...dd...',
  ]
  const pal: Record<string, Color> = { k: '#6e4a35', g: P.goldD, G: P.gold, d: P.goldDD }
  for (let r = 0; r < rows.length; r++) {
    const off = Math.round((swing * r) / rows.length)
    for (let c = 0; c < 8; c++) {
      const k = rows[r][c]
      if (k === '.') continue
      const color = pal[k]
      if (scale === 1) g.px(x - 4 + c + off, y + r, color)
      else g.rect(x + (c - 4) * scale + off * scale, y + r * scale, scale, scale, color)
    }
  }
  // Highlight.
  if (scale === 1) g.px(x - 2 + Math.round(swing / 3), y + 3, P.goldL)
  else g.rect(x - 2 * scale + Math.round(swing / 3) * scale, y + 3 * scale, scale, scale * 2, P.goldL)
}

/** Big bronze incense urn (กระถางธูป) on a pedestal. */
export function incenseUrn(): Prop {
  return prop('incense-urn', 20, 22, 10, 21, (g) => {
    g.rect(4, 17, 12, 5, P.stone)
    g.rect(4, 17, 12, 1, P.stoneL)
    g.rect(4, 21, 12, 1, P.stoneD)
    g.ellipse(10, 12, 8, 5, '#9c7a3c')
    g.ellipse(10, 11, 8, 4, '#c9a04c')
    g.rect(2, 8, 16, 3, '#b8903f')
    g.hline(2, 17, 8, '#e3bf62')
    g.ellipse(10, 8, 7, 1.5, '#5a4a3a')
    // Incense sticks.
    const sticks = [5, 7, 9, 11, 13, 15]
    sticks.forEach((x, i) => {
      g.vline(x, 1 + (i % 2), 7, '#c0392b')
      g.px(x, (i % 2), '#ff8a3d')
    })
    // Handles.
    g.px(1, 10, '#9c7a3c')
    g.px(18, 10, '#9c7a3c')
  })
}

export function donationBox(): Prop {
  return prop('donation-box', 14, 20, 7, 19, (g) => {
    g.rect(1, 3, 12, 10, '#b8343f')
    g.rect(1, 3, 12, 1, P.redL)
    g.rect(1, 12, 12, 1, P.redDD)
    g.rect(4, 5, 6, 1, P.ink)
    g.rect(3, 7, 8, 4, P.gold)
    g.rect(4, 8, 6, 2, P.goldD)
    g.rect(2, 13, 2, 7, '#6e4a35')
    g.rect(10, 13, 2, 7, '#6e4a35')
    g.rect(0, 0, 14, 3, '#7e2436')
    g.hline(0, 13, 0, P.gold)
  })
}

/** Ratchaburi dragon jar (โอ่งมังกร) holding holy water, under a mini roof. */
export function holyWaterPavilion(): Prop {
  return prop('holy-water-pavilion', 44, 50, 22, 49, (g) => {
    // Posts.
    g.rect(3, 16, 3, 34, '#fffaf0')
    g.rect(38, 16, 3, 34, '#fffaf0')
    g.rect(5, 16, 1, 34, '#e3d8c6')
    g.rect(40, 16, 1, 34, '#e3d8c6')
    // Roof.
    drawEave(g, 0, 21, 8, 14, 'left')
    drawEave(g, 22, 43, 8, 14, 'right')
    drawGable(g, 22, 15, 10, 13, { emblem: false })
    // Jar.
    g.ellipse(22, 39, 11, 10, '#7a4a2e')
    g.ellipse(21, 38, 10, 9, '#9a5f3a')
    g.ellipse(18, 35, 4, 4, '#b8774a')
    g.rect(14, 29, 16, 3, '#6e3f27')
    g.ellipse(22, 29, 8, 2, '#5a3322')
    g.ellipse(22, 29, 7, 1.4, P.waterD)
    // Dragon motif.
    const dragon = [
      [14, 38],
      [15, 37],
      [16, 37],
      [17, 38],
      [18, 39],
      [19, 39],
      [20, 38],
      [21, 37],
      [22, 37],
      [23, 38],
      [24, 39],
      [25, 39],
      [26, 38],
      [27, 37],
      [28, 37],
    ]
    for (const [x, y] of dragon) g.px(x, y, P.gold)
    g.px(28, 36, P.gold)
    g.px(29, 36, P.goldL)
    // Floating flower & ladle.
    g.px(20, 29, '#ff9fc0')
    g.px(24, 29, '#fffaf0')
    g.line(25, 28, 31, 24, '#c9a04c')
  })
}

/** Guardian giant (ท้าวเวสสุวรรณ) statue on a pedestal. */
export function guardianStatue(): Prop {
  return prop('guardian', 22, 44, 11, 43, (g) => {
    // Pedestal.
    g.rect(2, 36, 18, 8, '#fffaf0')
    g.rect(2, 36, 18, 1, P.gold)
    g.rect(2, 43, 18, 1, '#d8c3a8')
    g.rect(4, 39, 14, 2, P.redD)
    // Body.
    const skin = '#4f7fbf'
    const skinD = '#3a5f96'
    g.rect(7, 22, 8, 14, P.redD)
    g.rect(7, 22, 8, 2, P.gold)
    g.rect(7, 29, 8, 1, P.gold)
    g.rect(8, 34, 2, 2, skinD)
    g.rect(12, 34, 2, 2, skinD)
    // Arms and club.
    g.rect(5, 23, 2, 8, skin)
    g.rect(15, 23, 2, 8, skin)
    g.rect(9, 30, 4, 2, skin)
    g.rect(10, 18, 2, 18, '#6e4a35')
    g.rect(9, 17, 4, 2, P.gold)
    // Head.
    g.rect(7, 12, 8, 9, skin)
    g.rect(13, 12, 2, 9, skinD)
    g.px(8, 15, '#fffaf0')
    g.px(13, 15, '#fffaf0')
    g.px(8, 16, P.ink)
    g.px(13, 16, P.ink)
    g.hline(9, 12, 19, '#fffaf0')
    g.px(9, 18, '#fffaf0')
    g.px(12, 18, '#fffaf0')
    // Crown (ชฎา).
    g.rect(6, 9, 10, 3, P.gold)
    g.rect(7, 6, 8, 3, P.gold)
    g.rect(8, 3, 6, 3, P.goldD)
    g.rect(9, 1, 4, 2, P.gold)
    g.rect(10, 0, 2, 1, P.goldL)
    g.hline(6, 15, 11, P.goldDD)
    g.px(10, 7, P.redL)
  })
}

export function lampPost(): Prop {
  return prop('lamp-post', 9, 30, 4, 29, (g) => {
    g.rect(3, 8, 2, 20, '#3a3040')
    g.rect(2, 27, 4, 3, '#3a3040')
    g.rect(1, 3, 6, 6, '#3a3040')
    g.rect(2, 4, 4, 4, '#fff3a6')
    g.px(4, 1, '#3a3040')
    g.rect(3, 2, 2, 1, '#3a3040')
    g.hline(0, 7, 9, '#3a3040')
  })
}

/** Flower & incense stall (ร้านดอกไม้ธูปเทียน). */
export function flowerStall(): Prop {
  return prop('flower-stall', 44, 34, 22, 33, (g) => {
    // Umbrella.
    g.poly(
      [
        [2, 10],
        [22, 1],
        [42, 10],
      ],
      '#ff9fc0',
    )
    for (let i = 0; i < 5; i++) g.line(22, 1, 2 + i * 10, 10, '#fffaf0')
    g.hline(2, 42, 10, '#e8709e')
    g.rect(21, 10, 2, 12, '#6e4a35')
    // Table.
    g.rect(3, 20, 38, 3, '#c28e5c')
    g.rect(3, 23, 38, 7, '#9a6a45')
    g.rect(5, 30, 2, 4, '#6e4a35')
    g.rect(37, 30, 2, 4, '#6e4a35')
    g.hline(3, 40, 20, '#e0bb8a')
    // Buckets of flowers.
    const colors = ['#ffd23f', '#f58f35', '#ff9fc0', '#fffaf0', '#e8514a']
    colors.forEach((c, i) => {
      const x = 6 + i * 7
      g.rect(x, 16, 5, 4, '#5a8de0')
      g.circle(x + 2.5, 14.5, 3, c)
      g.px(x + 1, 13, mixHex(c, '#ffffff', 0.4))
      g.px(x + 3, 12, '#43905a')
    })
    // Hanging garlands.
    for (let i = 0; i < 4; i++) {
      const x = 7 + i * 9
      g.vline(x, 11, 13, '#f58f35')
      g.px(x, 14, '#ffd23f')
    }
  })
}

/** Alms-food stall (ร้านของใส่บาตร). */
export function foodStall(): Prop {
  return prop('food-stall', 50, 36, 25, 35, (g) => {
    // Striped awning.
    for (let x = 0; x < 50; x++) {
      const c = Math.floor(x / 5) % 2 === 0 ? '#e8514a' : '#fffaf0'
      g.vline(x, 2, 9, c)
      if (x % 5 === 2) g.px(x, 10, c)
    }
    g.hline(0, 49, 2, '#b8343f')
    g.rect(2, 10, 2, 26, '#6e4a35')
    g.rect(46, 10, 2, 26, '#6e4a35')
    // Counter.
    g.rect(0, 22, 50, 4, '#e0bb8a')
    g.rect(0, 26, 50, 10, '#c28e5c')
    g.hline(0, 49, 22, '#f3dcb2')
    for (let x = 4; x < 48; x += 8) g.vline(x, 27, 35, '#9a6a45')
    // Rice pot, curry bags, fruit.
    g.rect(5, 15, 10, 7, '#bdb2ae')
    g.rect(5, 15, 10, 1, '#e4ddd6')
    g.rect(6, 13, 8, 2, '#8c8187')
    g.ellipse(10, 13, 3, 1, '#fffaf0')
    for (let i = 0; i < 4; i++) {
      g.rect(18 + i * 4, 18, 3, 4, i % 2 ? '#f58f35' : '#e8514a')
      g.px(19 + i * 4, 17, '#fffaf0')
    }
    g.circle(38, 19, 3, '#ffd23f')
    g.circle(42, 20, 2.5, '#ffe45e')
    g.rect(35, 15, 2, 2, '#43905a')
    // Price sign.
    g.rect(20, 4, 12, 5, '#fffaf0')
    g.hline(22, 29, 6, '#b8343f')
  })
}

export function tukTuk(): Prop {
  return prop('tuktuk', 34, 24, 17, 23, (g) => {
    g.rect(2, 3, 30, 3, '#3d63b5')
    g.rect(3, 1, 28, 2, '#5a8de0')
    g.rect(4, 6, 2, 10, '#3a3040')
    g.rect(28, 6, 2, 10, '#3a3040')
    g.rect(2, 12, 30, 7, '#5a8de0')
    g.rect(2, 12, 30, 1, '#9fd0ff')
    g.rect(6, 7, 20, 5, '#d4f1ff')
    g.rect(14, 7, 1, 5, '#3a3040')
    g.rect(2, 16, 30, 2, '#ffd54f')
    g.circle(7, 20, 3.5, '#3a3040')
    g.circle(27, 20, 3.5, '#3a3040')
    g.circle(7, 20, 1.2, '#bdb2ae')
    g.circle(27, 20, 1.2, '#bdb2ae')
    g.rect(30, 13, 3, 2, '#fff3a6')
  })
}

/** Temple wall segment sprite (white with red cap). */
export function wallSegment(w: number): Prop {
  return prop(`wall-${w}`, w, 20, 0, 19, (g) => {
    g.rect(0, 4, w, 16, '#fffaf0')
    g.rect(0, 4, w, 1, '#ffffff')
    g.rect(0, 16, w, 4, '#e3d8c6')
    g.rect(0, 0, w, 4, P.redD)
    g.hline(0, w - 1, 0, P.redL)
    g.hline(0, w - 1, 4, P.gold)
    for (let x = 3; x < w; x += 10) {
      g.rect(x, 7, 4, 6, '#e8dcc8')
      g.px(x + 1, 9, P.goldD)
      g.px(x + 2, 9, P.goldD)
    }
  }, false)
}

/** Temple gate (ซุ้มประตู) with an opening you can walk through. */
export function templeGate(): Prop {
  return prop('temple-gate', 60, 58, 30, 57, (g) => {
    // Pillars.
    for (const x of [2, 50]) {
      g.rect(x, 24, 8, 34, '#fffaf0')
      g.rect(x + 6, 24, 2, 34, '#e3d8c6')
      g.rect(x - 1, 22, 10, 3, P.gold)
      g.rect(x - 1, 54, 10, 4, '#e3d8c6')
      g.rect(x + 2, 30, 4, 18, '#f3ead9')
      g.px(x + 3, 38, P.gold)
      g.px(x + 4, 38, P.gold)
    }
    // Lintel.
    g.rect(0, 18, 60, 6, '#fffaf0')
    g.rect(0, 18, 60, 1, P.gold)
    g.rect(0, 23, 60, 1, '#d8c3a8')
    g.rect(10, 24, 40, 3, P.redD)
    for (let x = 12; x < 48; x += 4) g.px(x, 25, P.gold)
    // Mini roof and gable.
    drawEave(g, 0, 29, 12, 18, 'left')
    drawEave(g, 30, 59, 12, 18, 'right')
    drawGable(g, 30, 18, 16, 15, {})
  })
}

/** Open pavilion (ศาลา) with a raised wooden floor. */
export function sala(): Prop {
  return prop('sala', 84, 60, 42, 59, (g) => {
    // Floor.
    g.rect(2, 44, 80, 8, '#c28e5c')
    g.rect(2, 44, 80, 1, '#e0bb8a')
    for (let x = 2; x < 82; x += 6) g.vline(x, 45, 51, '#a8774a')
    g.rect(2, 52, 80, 6, '#9a6a45')
    g.rect(34, 52, 16, 2, '#e0bb8a')
    g.rect(34, 54, 16, 2, '#c28e5c')
    g.rect(34, 56, 16, 2, '#e0bb8a')
    // Posts.
    for (const x of [4, 28, 53, 77]) {
      g.rect(x, 18, 3, 26, '#fffaf0')
      g.rect(x + 2, 18, 1, 26, '#e3d8c6')
      g.rect(x - 1, 18, 5, 2, P.gold)
    }
    // Roof.
    drawEave(g, 0, 41, 6, 18, 'left', P.red, P.redD, P.leaf)
    drawEave(g, 42, 83, 6, 18, 'right', P.red, P.redD, P.leaf)
    drawGable(g, 42, 16, 18, 16, { face: P.orangeD, faceD: '#a8501a' })
  })
}

// ---------------------------------------------------------------------------
// Small decorative sprites.

export function lotusPad(r = 3): Sprite {
  return cached(`lotus-pad-${r}`, () =>
    bakeSprite(r * 2 + 2, r * 2 + 2, (g) => {
      g.circle(r + 1, r + 1, r, P.leaf)
      g.circle(r + 0.6, r + 0.6, r - 1, P.grassD)
      g.line(r + 1, r + 1, r * 2 + 1, r + 1, P.leafD)
    }),
  )
}

export function lotusFlower(): Sprite {
  return cached('lotus-flower', () =>
    makeSprite(['.p.p.', 'pPpPp', '.pPp.', '..g..'], { p: '#e8709e', P: '#ffc4d8', g: '#43905a' }),
  )
}

function bakeSprite(w: number, h: number, fn: (g: Surface) => void): Sprite {
  const c = bake(w, h, fn)
  return { canvas: c, w, h }
}

/** Triangular bunting flag colours (ธงราว). */
export const FLAG_COLORS: Color[] = ['#e8514a', '#ffd23f', '#6cc36a', '#5a8de0', '#ff9fc0', '#fffaf0', '#f58f35']

/** Draw a bunting string between two points; `t` animates the flutter. */
export function drawBunting(g: Surface, x0: number, y0: number, x1: number, y1: number, t: number, sag = 6) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  const n = Math.max(2, Math.floor(len / 6))
  let px = x0
  let py = y0
  for (let i = 0; i <= n * 3; i++) {
    const f = i / (n * 3)
    const x = x0 + (x1 - x0) * f
    const y = y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag
    g.line(px, py, x, y, '#5a3d4f')
    px = x
    py = y
  }
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n
    const x = Math.round(x0 + (x1 - x0) * f)
    const y = Math.round(y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag)
    const c = FLAG_COLORS[i % FLAG_COLORS.length]
    const wob = Math.round(Math.sin(t * 3 + i) * 0.8)
    g.rect(x - 2, y + 1, 5, 1, c)
    g.rect(x - 1 + (wob > 0 ? 1 : 0), y + 2, 3, 1, c)
    g.px(x + wob, y + 3, c)
  }
}

/** Soft dithered shadow ellipse under things. */
export function drawShadow(g: Surface, cx: number, cy: number, rx: number, ry: number, color: Color = 'rgba(58,40,56,0.28)') {
  g.ctx.fillStyle = color
  const x0 = Math.floor(cx - rx)
  const x1 = Math.ceil(cx + rx)
  const y0 = Math.floor(cy - ry)
  const y1 = Math.ceil(cy + ry)
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / rx
      const dy = (y + 0.5 - cy) / ry
      if (dx * dx + dy * dy <= 1) g.ctx.fillRect(x - g.ox, y - g.oy, 1, 1)
    }
}

export { ditherOn }
