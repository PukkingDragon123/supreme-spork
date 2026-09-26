// Temple furniture and guardians: ยักษ์, ท้าวเวสสุวรรณ, lamp posts, incense
// urns, donation boxes, stalls, spirit houses, flags, jars and benches.

import type { Color, Surface } from '../engine/pixel'
import { P } from './palette'
import { mixHex } from './characters'
import type { Prop } from './props'
import { GOLD, WHITE, ROOF, slice, tier, sprite, dome, type Ramp } from './temple'

const WHITE_RAMP: Ramp = { L: '#ffffff', b: '#fffaf0', d: '#ece0cc', D: '#d2bfa2' }
const GOLD_RAMP: Ramp = { L: GOLD.L, b: GOLD.b, d: GOLD.d, D: GOLD.D }

// ---------------------------------------------------------------------------
// Guardians.

export interface SkinRamp {
  L: Color
  b: Color
  d: Color
}

export const YAKSHA_SKINS: Record<string, SkinRamp> = {
  green: { L: '#9be3a2', b: '#5cbf73', d: '#3a8f58' },
  red: { L: '#ffa08e', b: '#e8645a', d: '#b53f48' },
  blue: { L: '#9fc4ff', b: '#5a8de0', d: '#3d5fb0' },
  indigo: { L: '#8a96e0', b: '#4f5fb8', d: '#34408a' },
}

/**
 * Cute chibi temple giant (ยักษ์วัด) holding a club, on a pedestal.
 * `king` draws ท้าวเวสสุวรรณ with a taller crown and more gold.
 */
export function yakshaSprite(skin: keyof typeof YAKSHA_SKINS = 'green', o: { king?: boolean; cloth?: Color } = {}): Prop {
  const W = 30
  const H = o.king ? 56 : 52
  return sprite(`yaksha:${skin}:${o.king ? 1 : 0}:${o.cloth ?? ''}`, W, H, W >> 1, H - 1, (g) => {
    const s = YAKSHA_SKINS[skin]
    const cloth = o.cloth ?? (skin === 'red' ? '#3fa06e' : P.redD)
    const clothL = mixHex(cloth, '#ffffff', 0.3)
    const cx = 15
    const base = H - 1
    // Pedestal.
    tier(g, cx, base - 5, 5, 13, WHITE_RAMP, P.redD)
    g.hline(cx - 12, cx + 11, base - 3, GOLD.d)
    const top = base - 6 // feet level
    // Feet and legs (wide stance).
    for (const d of [-1, 1]) {
      const fx = cx + d * 5
      g.rect(fx - 3, top - 2, 6, 2, s.d)
      g.rect(fx - 2, top - 3, 4, 1, s.b)
      g.rect(fx - 2, top - 9, 4, 6, s.b)
      g.px(fx - 2, top - 8, s.L)
      g.rect(fx - 2, top - 5, 4, 1, GOLD.b)
      g.px(fx + 1, top - 7, s.d)
    }
    // Skirt / loincloth.
    const sk = top - 16
    g.rect(cx - 8, sk, 17, 8, cloth)
    g.rect(cx - 8, sk, 17, 1, GOLD.b)
    g.rect(cx - 8, sk + 7, 17, 1, GOLD.D)
    g.rect(cx - 2, sk + 1, 5, 9, clothL)
    g.rect(cx - 2, sk + 9, 5, 1, GOLD.d)
    for (let x = cx - 7; x < cx + 9; x += 3) g.px(x, sk + 4, GOLD.d)
    // Belt.
    g.rect(cx - 7, sk - 2, 15, 2, GOLD.b)
    g.px(cx, sk - 2, P.red)
    g.px(cx - 4, sk - 1, GOLD.D)
    g.px(cx + 4, sk - 1, GOLD.D)
    // Torso with golden armour.
    const to = sk - 11
    g.rect(cx - 7, to, 15, 9, s.b)
    g.rect(cx - 6, to + 1, 13, 7, GOLD.b)
    g.rect(cx - 6, to + 1, 13, 1, GOLD.L)
    for (let x = cx - 5; x < cx + 7; x += 2) g.px(x, to + 4, GOLD.D)
    g.rect(cx - 1, to + 2, 3, 3, P.red)
    g.px(cx, to + 2, P.redL)
    g.rect(cx - 6, to + 7, 13, 1, GOLD.D)
    // Shoulder flares (อินทรธนู).
    for (const d of [-1, 1]) {
      g.rect(cx + d * 8 - 1, to, 3, 2, GOLD.b)
      g.px(cx + d * 10, to - 1, GOLD.b)
      g.px(cx + d * 11, to - 2, GOLD.l)
    }
    // Arms reaching to the club.
    for (const d of [-1, 1]) {
      g.rect(cx + d * 8 - 1, to + 2, 3, 6, s.b)
      g.px(cx + d * 8 - (d > 0 ? -1 : 1), to + 3, s.L)
      g.rect(cx + d * 5 - 1, to + 7, 3, 2, s.b)
      g.rect(cx + d * 8 - 1, to + 5, 3, 1, GOLD.b)
    }
    // Club (กระบอง).
    g.rect(cx - 1, to + 5, 3, top - to - 6, '#8a5a3a')
    g.px(cx - 1, to + 6, '#b07a50')
    for (let y = to + 10; y < top - 2; y += 4) g.rect(cx - 1, y, 3, 1, GOLD.b)
    g.rect(cx - 2, to + 3, 5, 3, GOLD.b)
    g.px(cx - 1, to + 3, GOLD.L)
    g.rect(cx - 2, top - 2, 5, 1, GOLD.D)
    // Hands on top of the club.
    g.rect(cx - 3, to + 6, 3, 2, s.b)
    g.rect(cx + 1, to + 6, 3, 2, s.b)
    // Head.
    const hy = to - 12
    g.rect(cx - 6, hy + 1, 13, 10, s.b)
    g.rect(cx - 5, hy, 11, 12, s.b)
    g.rect(cx - 5, hy + 1, 2, 8, s.L)
    g.rect(cx + 5, hy + 2, 1, 8, s.d)
    // Big round eyes with brows.
    for (const d of [-1, 1]) {
      const ex = cx + d * 3 - (d < 0 ? 1 : 0)
      g.rect(ex - 1, hy + 4, 3, 3, '#ffffff')
      g.rect(ex, hy + 5, 2, 2, P.ink)
      g.px(ex, hy + 5, '#ffffff')
      g.rect(ex - 1, hy + 3, 3, 1, s.d)
    }
    // Nose, mouth and fangs.
    g.px(cx, hy + 7, s.d)
    g.rect(cx - 3, hy + 9, 7, 2, P.redDD)
    g.px(cx - 3, hy + 8, '#ffffff')
    g.px(cx + 3, hy + 8, '#ffffff')
    g.rect(cx - 1, hy + 9, 3, 1, P.red)
    // Blush.
    g.px(cx - 5, hy + 8, mixHex(s.b, P.pink, 0.5))
    g.px(cx + 5, hy + 8, mixHex(s.b, P.pink, 0.5))
    // Ear ornaments (กรรเจียก).
    for (const d of [-1, 1]) {
      g.rect(cx + d * 7 - (d > 0 ? 0 : 1), hy + 2, 2, 6, GOLD.b)
      g.px(cx + d * 8, hy + 1, GOLD.l)
      g.px(cx + d * 8, hy + 7, GOLD.D)
    }
    // Crown (ชฎา).
    const ct = o.king ? 12 : 9
    g.rect(cx - 6, hy - 1, 13, 2, GOLD.b)
    g.hline(cx - 6, cx + 6, hy - 1, GOLD.L)
    g.px(cx, hy, P.red)
    for (let i = 0; i < ct; i++) {
      const half = 5 - (i * 4.5) / ct
      slice(g, cx + 0.5, hy - 2 - i, half, GOLD_RAMP, 0.4)
      if (i % 3 === 1) g.hline(Math.round(cx + 0.5 - half), Math.round(cx + 0.5 + half) - 1, hy - 2 - i, GOLD.D)
    }
    g.px(cx, hy - 2 - ct, GOLD.L)
    g.px(cx, hy - 3 - ct, GOLD.b)
    if (o.king) {
      g.px(cx - 1, hy - 5, P.red)
      g.px(cx + 1, hy - 5, '#5a8de0')
    }
  })
}

// ---------------------------------------------------------------------------
// Lighting and offerings.

/** Thai lamp post with a little pavilion-shaped lantern. */
export function thaiLampSprite(night = false): Prop {
  return sprite(`tlamp:${night ? 1 : 0}`, 11, 36, 5, 35, (g) => {
    tier(g, 5.5, 31, 5, 4, WHITE_RAMP, GOLD.d)
    for (let y = 13; y < 31; y++) slice(g, 5.5, y, 1.6, WHITE_RAMP, 0.4)
    g.rect(3, 18, 5, 1, GOLD.b)
    g.rect(3, 25, 5, 1, GOLD.b)
    g.rect(2, 11, 7, 2, GOLD.d)
    g.hline(2, 8, 11, GOLD.l)
    // Lantern glass.
    g.rect(2, 5, 7, 6, GOLD.D)
    g.rect(3, 5, 5, 6, night ? '#fff6c8' : '#fff0b0')
    g.rect(3, 5, 1, 6, night ? '#ffffff' : '#fffadc')
    g.vline(5, 5, 10, night ? '#ffe07a' : GOLD.d)
    // Roof.
    g.rect(1, 4, 9, 1, ROOF.red.field)
    g.rect(2, 3, 7, 1, ROOF.red.field)
    g.rect(3, 2, 5, 1, ROOF.red.fieldL)
    g.px(5, 1, GOLD.b)
    g.px(5, 0, GOLD.l)
    g.px(0, 4, GOLD.b)
    g.px(10, 4, GOLD.b)
  })
}

/** Big bronze incense urn (กระถางธูป) on a pedestal. Smoke rises from hooks in the map. */
export function urnSprite(): Prop {
  return sprite('urn2', 26, 28, 13, 27, (g) => {
    tier(g, 13, 22, 6, 11, WHITE_RAMP, P.redD)
    const bronze: Ramp = { L: '#f0cf78', b: '#c9a04c', d: '#9c7a3c', D: '#6e5230' }
    for (let i = 0; i < 9; i++) {
      const t = i / 8
      slice(g, 13, 21 - i, 6 + Math.sin(t * Math.PI) * 4, bronze, 0.3)
    }
    g.rect(2, 11, 22, 3, bronze.b)
    g.hline(2, 23, 11, bronze.L)
    g.hline(2, 23, 13, bronze.D)
    g.ellipse(13, 11, 9, 1.6, '#5a4a3a')
    g.ellipse(13, 11, 8, 1, '#8a7a6a')
    // Lion-head handles.
    for (const x of [1, 24]) {
      g.rect(x - 1, 14, 2, 3, bronze.d)
      g.px(x - 1, 14, bronze.L)
    }
    // Relief band.
    for (let x = 6; x < 21; x += 3) g.px(x, 17, bronze.L)
    // Incense sticks with glowing tips.
    const sticks = [6, 8, 9, 11, 13, 14, 16, 18, 20]
    sticks.forEach((x, i) => {
      const h = 3 + ((i * 5) % 4)
      g.vline(x, 10 - h, 10, i % 2 ? '#c0392b' : '#d8563a')
      g.px(x, 9 - h, '#ffb35a')
    })
  })
}

/** Candle stand (เชิงเทียน) – flames are animated by the scene at the returned offsets. */
export function candleStandSprite(): Prop {
  return sprite('candles', 18, 14, 9, 13, (g) => {
    g.rect(1, 8, 16, 2, GOLD.d)
    g.hline(1, 16, 8, GOLD.l)
    g.rect(8, 10, 2, 3, GOLD.D)
    g.rect(5, 12, 8, 2, GOLD.d)
    for (const [x, h] of [
      [3, 4],
      [6, 6],
      [9, 7],
      [12, 5],
      [15, 4],
    ]) {
      g.rect(x - 1, 8 - h, 2, h, '#fff4d6')
      g.px(x - 1, 8 - h, '#ffffff')
      g.px(x, 8 - h + 1, '#e9d6b0')
    }
  })
}
/** Flame points of candleStandSprite relative to its anchor. */
export const CANDLE_FLAMES: [number, number][] = [
  [-6, -10],
  [-3, -12],
  [0, -13],
  [3, -11],
  [6, -10],
]

/** Red lacquer donation box (ตู้ทำบุญ) with a window of coins. */
export function donationSprite(): Prop {
  return sprite('donate2', 16, 26, 8, 25, (g) => {
    g.rect(3, 17, 2, 9, '#6e4a35')
    g.rect(11, 17, 2, 9, '#6e4a35')
    g.rect(2, 24, 12, 1, '#4a3128')
    const box: Ramp = { L: P.redL, b: P.red, d: P.redD, D: P.redDD }
    for (let y = 5; y < 18; y++) slice(g, 8, y, 7, box, 0.25)
    g.rect(1, 3, 14, 2, GOLD.b)
    g.hline(1, 14, 3, GOLD.L)
    g.rect(4, 4, 8, 1, P.ink)
    // Window with coins and notes.
    g.rect(3, 8, 10, 6, GOLD.d)
    g.rect(4, 9, 8, 4, '#d4f1ff')
    g.rect(4, 11, 8, 2, '#86c95f')
    g.px(5, 10, GOLD.b)
    g.px(9, 11, GOLD.b)
    g.px(10, 10, '#ff9fc0')
    g.px(6, 12, GOLD.l)
    g.rect(4, 15, 8, 2, GOLD.b)
    g.px(7, 15, P.redD)
    g.px(8, 15, P.redD)
    // Tiny roof.
    g.rect(0, 1, 16, 2, ROOF.orange.field)
    g.hline(2, 13, 0, ROOF.orange.fieldL)
    g.px(8, 0, GOLD.b)
  })
}

/** Flower & incense stall (ร้านดอกไม้ธูปเทียน) with marigold garlands. */
export function stallSprite(): Prop {
  return sprite('stall2', 52, 44, 26, 43, (g) => {
    // Umbrella.
    for (let i = 0; i <= 10; i++) {
      const y = 12 - i
      const half = 24 - i * 2.2
      g.rect(Math.round(26 - half), y, Math.round(half * 2), 1, i % 2 ? '#ff9fc0' : '#ffb8d0')
    }
    for (let k = 0; k < 6; k++) g.line(26, 2, 3 + k * 9.2, 12, '#fffaf0')
    for (let x = 3; x < 50; x += 4) {
      g.px(x, 13, '#e8709e')
      g.px(x + 1, 13, '#e8709e')
      g.px(x + 2, 14, '#e8709e')
    }
    g.px(26, 1, GOLD.b)
    g.rect(25, 13, 2, 14, '#6e4a35')
    // Hanging garlands (พวงมาลัย).
    for (let i = 0; i < 5; i++) {
      const x = 7 + i * 9
      if (Math.abs(x - 26) < 3) continue
      g.vline(x, 14, 17, i % 2 ? '#fffaf0' : '#ffd23f')
      g.px(x, 18, '#e8514a')
      g.px(x - 1, 17, '#f58f35')
      g.px(x + 1, 17, '#f58f35')
    }
    // Table.
    g.rect(3, 27, 46, 3, '#e0bb8a')
    g.hline(3, 48, 27, '#f3dcb2')
    g.rect(3, 30, 46, 10, '#c28e5c')
    for (let x = 6; x < 48; x += 6) g.vline(x, 31, 39, '#9a6a45')
    g.rect(3, 30, 46, 1, '#9a6a45')
    g.rect(5, 40, 2, 3, '#6e4a35')
    g.rect(45, 40, 2, 3, '#6e4a35')
    // Goods: marigold piles, lotus buds, incense bundles, candles.
    const goods: [number, Color, Color][] = [
      [7, '#f58f35', '#ffbb66'],
      [13, '#ffd23f', '#fff09a'],
      [33, '#ff9fc0', '#ffd6e0'],
      [40, '#fffaf0', '#ffffff'],
    ]
    for (const [x, c, l] of goods) {
      g.ellipse(x + 2, 25.5, 3.5, 2.5, c)
      g.px(x + 1, 24, l)
      g.px(x + 3, 23, l)
    }
    for (let i = 0; i < 4; i++) {
      g.rect(18 + i * 2, 20, 1, 7, '#e8514a')
      g.px(18 + i * 2, 19, '#ffd23f')
    }
    g.rect(27, 22, 2, 5, '#fff4d6')
    g.rect(30, 23, 2, 4, '#fff4d6')
    // Lotus buds in a bucket.
    g.rect(44, 22, 5, 5, '#5a8de0')
    for (const [x, y] of [
      [45, 19],
      [47, 18],
      [46, 20],
    ])
      g.rect(x, y, 2, 3, '#ff9fc0')
    // Price sign.
    g.rect(20, 31, 12, 6, '#fffaf0')
    g.hline(22, 29, 33, P.redD)
    g.hline(22, 27, 35, P.ink2)
  })
}

/** Spirit house (ศาลพระภูมิ) on its pillar, with tiny offerings. */
export function spiritHouseSprite(): Prop {
  return sprite('spirit', 20, 36, 10, 35, (g) => {
    tier(g, 10, 32, 4, 5, WHITE_RAMP)
    for (let y = 18; y < 32; y++) slice(g, 10, y, 2, WHITE_RAMP)
    g.rect(3, 16, 14, 2, GOLD.d)
    g.hline(3, 16, 16, GOLD.l)
    // House body.
    g.rect(5, 9, 10, 7, GOLD.b)
    g.rect(6, 10, 8, 6, P.redD)
    g.rect(8, 11, 4, 5, '#4a3048')
    g.px(9, 13, GOLD.b)
    g.px(10, 13, GOLD.b)
    // Roof.
    for (let i = 0; i < 7; i++) g.rect(3 + i, 8 - i, 14 - i * 2, 1, i < 2 ? ROOF.green.border : ROOF.orange.field)
    g.px(10, 1, GOLD.b)
    g.px(10, 0, GOLD.l)
    g.px(2, 8, GOLD.b)
    g.px(17, 8, GOLD.b)
    // Offerings: red drink, garland, figurines.
    g.rect(4, 14, 1, 2, '#e8514a')
    g.rect(15, 14, 1, 2, '#e8514a')
    g.px(4, 13, '#fffaf0')
    g.px(15, 13, '#fffaf0')
    g.px(7, 15, '#ffd23f')
    g.px(12, 15, '#ffd23f')
    // Garland on the pillar.
    for (let x = 7; x <= 13; x++) g.px(x, 19 + Math.round(Math.sin(((x - 7) / 6) * Math.PI) * 2), x % 2 ? '#f58f35' : '#ffd23f')
  })
}

/** Flag pole; the flag cloth is drawn by drawFlag every frame. */
export function flagPoleSprite(h = 44): Prop {
  return sprite(`flagpole:${h}`, 7, h + 4, 3, h + 3, (g) => {
    g.rect(0, h, 7, 4, WHITE.d)
    g.hline(0, 6, h, '#ffffff')
    g.rect(3, 2, 1, h - 1, '#c9c0c8')
    g.px(2, 3, '#ffffff')
    g.rect(2, 0, 3, 2, GOLD.b)
    g.px(3, 0, GOLD.L)
  })
}

/** A waving flag hung from the pole top at (x, y). kind: dharma wheel or colourful triangle. */
export function drawFlag(g: Surface, x: number, y: number, t: number, kind: 'dharma' | 'thai' | 'color' = 'dharma', seed = 0) {
  const w = 12
  const h = 8
  for (let i = 0; i < w; i++) {
    const wave = Math.round(Math.sin(t * 5 + seed - i * 0.55) * (i / w) * 1.6)
    for (let j = 0; j < h; j++) {
      let c: Color
      if (kind === 'thai') c = j < 1 || j > 6 ? P.red : j < 2 || j > 5 ? '#fffaf0' : '#3d4f9a'
      else if (kind === 'color') c = ['#e8514a', '#ffd23f', '#6cc36a', '#5a8de0', '#ff9fc0'][(seed | 0) % 5]
      else {
        c = '#ffc934'
        const dx = i - 6
        const dy = j - 3.5
        const r = Math.hypot(dx, dy)
        if (r < 2.8 && (r > 1.8 || r < 0.8 || Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5)) c = '#d6382f'
      }
      if (kind === 'color' && j > h - 1 - Math.floor((i / w) * 5)) continue
      const shade = Math.sin(t * 5 + seed - i * 0.55) > 0.5 ? 0.12 : 0
      g.px(x + 1 + i, y + j + wave, shade ? mixHex(c, '#3a2838', shade) : c)
    }
  }
}

/** Glazed lotus jar (โอ่งบัว) with leaves and a flower. */
export function lotusJarSprite(color: 'blue' | 'green' | 'brown' = 'blue'): Prop {
  return sprite(`lotusjar:${color}`, 16, 18, 8, 17, (g) => {
    const r: Ramp =
      color === 'blue'
        ? { L: '#9fd0ff', b: '#5a8de0', d: '#3d63b5', D: '#2a4488' }
        : color === 'green'
          ? { L: '#a8e0b0', b: '#5cae78', d: '#3f8a5a', D: '#2c6a45' }
          : { L: '#e0a878', b: '#b0703f', d: '#8a522e', D: '#6a3a22' }
    for (let i = 0; i < 9; i++) {
      const t = i / 8
      slice(g, 8, 16 - i, 4 + Math.sin(t * Math.PI * 0.9) * 3.2, r, 0.3)
    }
    g.rect(2, 7, 12, 1, r.b)
    g.hline(2, 13, 7, r.L)
    for (let x = 4; x < 13; x += 3) g.px(x, 12, '#fffaf0')
    // Leaves and lotus.
    g.ellipse(5, 6, 3, 1.5, P.leaf)
    g.ellipse(11, 5.5, 3, 1.5, P.grassD)
    g.px(4, 5, P.grass)
    g.vline(8, 2, 6, P.leaf)
    g.rect(7, 0, 3, 3, '#ff9fc0')
    g.px(8, 0, '#ffd6e0')
    g.px(7, 2, '#e8709e')
    g.px(9, 2, '#e8709e')
  })
}

/** Stone bench (ม้านั่ง). */
export function benchSprite(): Prop {
  return sprite('bench', 22, 10, 11, 9, (g) => {
    g.rect(0, 2, 22, 3, WHITE.b)
    g.hline(0, 21, 2, '#ffffff')
    g.hline(0, 21, 4, WHITE.D)
    for (const x of [2, 17]) {
      g.rect(x, 5, 3, 5, WHITE.d)
      g.px(x + 2, 6, WHITE.D)
    }
  })
}

/** Golden seated Buddha on a lotus throne – a small outdoor statue. */
export function buddhaStatueSprite(): Prop {
  return sprite('buddha-out', 20, 26, 10, 25, (g) => {
    tier(g, 10, 21, 5, 9, WHITE_RAMP, P.redD)
    // Lotus throne.
    for (let x = 2; x < 18; x++) g.px(x, 20, (x & 1) === 0 ? GOLD.l : GOLD.d)
    g.rect(3, 18, 14, 2, GOLD.d)
    // Crossed legs.
    for (let y = 15; y < 18; y++) slice(g, 10, y, 7 - (17 - y) * 0.3, GOLD_RAMP, 0.35)
    // Body and robe fold.
    for (let y = 8; y < 15; y++) slice(g, 10, y, 3.6 + (y - 8) * 0.3, GOLD_RAMP, 0.35)
    g.line(8, 9, 12, 14, GOLD.D)
    g.rect(8, 14, 4, 1, GOLD.l)
    // Head, ushnisha and flame.
    g.circle(10, 5.5, 2.8, GOLD.b)
    g.px(9, 4, GOLD.L)
    g.px(9, 6, GOLD.D)
    g.px(11, 6, GOLD.D)
    g.rect(9, 2, 3, 1, GOLD.d)
    g.px(10, 1, GOLD.b)
    g.px(10, 0, GOLD.L)
  })
}

/** Rack of little Thai dresses offered to the tree spirit (ชุดไทยถวายแม่ตะเคียน). */
export function dressRackSprite(): Prop {
  return sprite('dresses', 22, 16, 11, 15, (g) => {
    g.rect(1, 3, 20, 1, '#9a6a45')
    g.rect(1, 3, 1, 13, '#9a6a45')
    g.rect(20, 3, 1, 13, '#9a6a45')
    const cols: [Color, Color][] = [
      ['#e8514a', GOLD.b],
      ['#ff9fc0', GOLD.b],
      ['#5a8de0', GOLD.l],
      ['#6cc36a', GOLD.b],
    ]
    cols.forEach(([c, t], i) => {
      const x = 3 + i * 4.5
      g.rect(x + 1, 4, 2, 3, c)
      g.rect(x, 7, 4, 6, c)
      g.hline(x, x + 3, 7, t)
      g.px(x + 1, 10, t)
      g.hline(x, x + 3, 12, mixHex(c, '#3a2838', 0.25))
    })
  })
}

/** Offering tray of fruit and garlands for statues. */
export function offeringSprite(): Prop {
  return sprite('offer-tray', 14, 7, 7, 6, (g) => {
    g.rect(0, 4, 14, 2, GOLD.d)
    g.hline(0, 13, 4, GOLD.l)
    g.rect(4, 6, 6, 1, GOLD.D)
    g.circle(3, 3, 1.8, '#ffd23f')
    g.circle(7, 2.5, 2, '#e8514a')
    g.circle(11, 3, 1.8, '#86c95f')
    g.px(6, 1, '#ffffff')
  })
}

/** Paper lantern (โคมล้านนา-ish) used on lantern strings. */
export function drawLantern(g: Surface, x: number, y: number, color: Color, lit: boolean) {
  const c = lit ? mixHex(color, '#fff3a6', 0.45) : color
  g.px(x, y - 1, '#5a3d4f')
  g.rect(x - 1, y, 3, 1, GOLD.D)
  g.rect(x - 2, y + 1, 5, 3, c)
  g.px(x - 2, y + 1, mixHex(c, '#3a2838', 0.2))
  g.px(x + 2, y + 3, mixHex(c, '#3a2838', 0.25))
  g.px(x - 1, y + 2, lit ? '#fffbe0' : mixHex(c, '#ffffff', 0.4))
  g.rect(x - 1, y + 4, 3, 1, GOLD.D)
  g.px(x, y + 5, GOLD.b)
}

/** Monk dwelling (กุฏิ) – a raised teak house. */
export function kutiSprite(): Prop {
  return sprite('kuti', 44, 40, 22, 39, (g) => {
    const teak = '#b0703f'
    const teakD = '#8a522e'
    const teakL = '#d09060'
    // Stilts.
    for (const x of [4, 14, 28, 38]) g.rect(x, 28, 2, 12, teakD)
    g.rect(2, 26, 40, 3, teakD)
    // Walls with vertical boards.
    g.rect(4, 12, 36, 14, teak)
    for (let x = 5; x < 40; x += 3) g.vline(x, 12, 25, teakD)
    g.rect(4, 12, 36, 1, teakL)
    // Window and door.
    g.rect(9, 15, 7, 6, '#4a3048')
    g.rect(9, 15, 7, 1, teakL)
    g.vline(12, 15, 20, teakD)
    g.rect(26, 14, 8, 12, '#6a3a22')
    g.px(32, 20, GOLD.b)
    // Saffron robes drying on a line.
    g.hline(2, 12, 30, '#5a3d4f')
    g.rect(3, 31, 4, 4, '#f5a03a')
    g.rect(8, 31, 3, 5, '#e98a2a')
    // Steep roof.
    for (let i = 0; i < 12; i++) {
      const half = 23 - i * 1.6
      g.rect(Math.round(22 - half), 12 - i, Math.round(half * 2), 1, i < 2 ? ROOF.red.fieldD : i % 3 === 0 ? ROOF.red.fieldD : ROOF.red.field)
    }
    g.rect(21, 0, 2, 1, GOLD.b)
    // Steps.
    for (let i = 0; i < 4; i++) g.rect(27 - i, 27 + i * 3, 8 + i * 2, 1, teakL)
  })
}

// ---------------------------------------------------------------------------
// Crafting pickups lying on the ground.

export type PickupKind = 'wood' | 'cloth' | 'clay' | 'gold' | 'flower'

export function pickupSprite(kind: PickupKind): Prop {
  return sprite(`pickup:${kind}`, 11, 8, 5, 7, (g) => {
    switch (kind) {
      case 'wood':
        // A fallen branch with a leaf.
        g.line(0, 6, 9, 3, '#9a6a45')
        g.line(0, 7, 9, 4, '#6e4a35')
        g.line(4, 5, 6, 2, '#9a6a45')
        g.px(1, 5, '#c28e5c')
        g.rect(6, 1, 2, 2, '#5eae55')
        g.px(8, 1, '#9ed86a')
        break
      case 'cloth':
        // A dropped ribbon of temple cloth.
        g.rect(1, 4, 4, 3, '#e8514a')
        g.rect(4, 3, 3, 3, '#ffd23f')
        g.rect(6, 4, 3, 3, '#6cc36a')
        g.px(1, 4, '#ff8a7a')
        g.px(9, 6, '#6cc36a')
        g.px(0, 7, '#b8343f')
        break
      case 'clay':
        // Terracotta shard.
        g.poly(
          [
            [1, 7],
            [3, 2],
            [8, 1],
            [10, 6],
          ],
          '#c9703f',
        )
        g.line(3, 2, 8, 1, '#e8a070')
        g.px(5, 4, '#a0522e')
        g.px(7, 5, '#a0522e')
        break
      case 'gold':
        // A glint of gold leaf.
        g.poly(
          [
            [2, 6],
            [4, 2],
            [9, 3],
            [7, 7],
          ],
          GOLD.b,
        )
        g.line(4, 2, 9, 3, GOLD.L)
        g.px(6, 5, GOLD.D)
        g.px(5, 3, '#ffffff')
        break
      case 'flower':
        // Fallen frangipani.
        g.rect(4, 1, 3, 2, '#fffaf0')
        g.rect(1, 3, 3, 2, '#fffaf0')
        g.rect(7, 3, 3, 2, '#fffaf0')
        g.rect(3, 5, 2, 2, '#f3e7c8')
        g.rect(6, 5, 2, 2, '#f3e7c8')
        g.rect(4, 3, 3, 2, '#ffd23f')
        g.px(5, 3, '#fff3a6')
        break
    }
  })
}

export { dome }
