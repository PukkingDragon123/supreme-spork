// Interior kit for the historic places' walk-in halls (top-down 3/4 view):
// back walls with Thai murals (เทพชุมนุม rows, zigzag bands), black-and-gold
// lacquer or teak panelling, windows with light, floors (marble, teak,
// terracotta, carpets and mats), pillars, the tiered golden throne (ฐานชุกชี),
// candle racks, offering tables, monks' dais, parasols and donation trees.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { GOLD, WHITE } from '../temple'
import { drawBuddhaHD, type BuddhaStyle } from '../hall'
import { build, hsh, spr, tinyPerson, type Building } from './historic'

// ---------------------------------------------------------------------------
// Walls.

export interface MuralPal {
  bg: Color
  bgD: Color
  band: Color
  bandD: Color
  skin: Color
  robes: Color[]
  gold: Color
}

export const MURAL_RED: MuralPal = { bg: '#9a3a2c', bgD: '#7a2a22', band: '#e8b44a', bandD: '#9a6424', skin: '#f2d6a2', robes: ['#3f7d5f', '#e9e1c8', '#4f6fa8', '#c0453f'], gold: '#ffd54f' }
export const MURAL_CREAM: MuralPal = { bg: '#e8d8b4', bgD: '#d4c098', band: '#9a3a2c', bandD: '#6a2420', skin: '#f2d0a0', robes: ['#3f7d5f', '#9a3a2c', '#4f6fa8', '#d8a040', '#6a4a8a'], gold: '#c8902a' }

/** A seated deva (เทพพนม) with a pointed crown, hands in wai; ~7×9 px. */
export function deva(g: Surface, x: number, y: number, pal: MuralPal, robe: Color) {
  g.px(x + 3, y, pal.gold)
  g.rect(x + 2, y + 1, 3, 2, pal.gold)
  g.rect(x + 2, y + 3, 3, 2, pal.skin)
  g.px(x + 3, y + 6, pal.skin)
  g.rect(x + 1, y + 5, 5, 3, robe)
  g.px(x + 3, y + 5, pal.skin)
  g.rect(x, y + 8, 7, 1, mixHex(robe, '#000000', 0.25))
  g.px(x + 1, y + 4, pal.gold)
  g.px(x + 5, y + 4, pal.gold)
}

/** Zigzag triangle band (สามเหลี่ยมฟันปลา) separating mural registers. */
export function zigzag(g: Surface, x: number, y: number, w: number, h: number, a: Color, b: Color) {
  g.rect(x, y, w, h, b)
  for (let i = 0; i < w; i++) {
    const k = i % (h * 2)
    const hh = k < h ? k : h * 2 - k
    g.rect(x + i, y + h - hh, 1, hh, a)
  }
}

/** Mural wall of deva rows (and an optional story scene painter below). */
export function muralWall(g: Surface, x: number, y: number, w: number, h: number, pal: MuralPal, seed = 0, story?: (g: Surface, x: number, y: number, w: number, h: number) => void) {
  g.rect(x, y, w, h, pal.bg)
  const rows = Math.max(1, Math.floor((h * 0.55) / 13))
  let yy = y + 2
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i + 7 < w; i += 10) {
      const v = hsh(i, r, seed)
      deva(g, x + i + 2 + (r % 2) * 5, yy + 1, pal, pal.robes[v % pal.robes.length])
    }
    yy += 10
    zigzag(g, x, yy, w, 3, pal.band, pal.bandD)
    yy += 3
  }
  if (story) story(g, x, yy, w, y + h - yy)
  else {
    // Landscape register: hills, trees and tiny people.
    const top = yy
    g.rect(x, top, w, y + h - top, mixHex(pal.bg, '#e8d8b4', 0.55))
    for (let i = 0; i < w; i += 9) {
      const v = hsh(i, seed, 7)
      g.circle(x + i, top + 6 + (v % 4), 4 + (v % 3), v % 2 ? '#5a8a5a' : '#3f6e4a')
    }
    for (let i = 4; i < w - 4; i += 14) {
      const v = hsh(i, seed, 8)
      tinyPerson(g, x + i, y + h - 3, pal.robes[v % pal.robes.length], '#2a1e20', pal.skin)
    }
  }
}

/** Black lacquer panel with gilt ลายรดน้ำ (flame scrolls and rosettes). */
export function lacquerWall(g: Surface, x: number, y: number, w: number, h: number, seed = 0, black: Color = '#1e1216') {
  g.rect(x, y, w, h, black)
  for (let j = 2; j < h - 2; j += 6)
    for (let i = 2; i < w - 2; i += 6) {
      const v = hsh(x + i, y + j, seed)
      const cx = x + i + ((j / 6) % 2 ? 3 : 0)
      const cy = y + j
      if (v % 3 === 0) {
        g.px(cx, cy, GOLD.b)
        g.px(cx - 1, cy + 1, GOLD.d)
        g.px(cx + 1, cy + 1, GOLD.d)
        g.px(cx, cy + 2, GOLD.D)
      } else {
        g.px(cx, cy, GOLD.d)
        g.px(cx + 1, cy - 1, GOLD.b)
      }
    }
  g.frame(x, y, w, h, GOLD.D)
  g.frame(x + 1, y + 1, w - 2, h - 2, GOLD.b)
}

/** Teak planks (walls or floors), vertical or horizontal. */
export function teak(g: Surface, x: number, y: number, w: number, h: number, vertical: boolean, tone: 'red' | 'brown' | 'honey' = 'brown', seed = 0) {
  const T = tone === 'red' ? ['#7a2a22', '#9a3a2c', '#b04a34', '#5a1e1a'] : tone === 'honey' ? ['#b07a48', '#c89058', '#dcaa70', '#8a5a34'] : ['#6e4a35', '#8a5e40', '#a4744c', '#4a3128']
  g.rect(x, y, w, h, T[1])
  const n = vertical ? w : h
  for (let k = 0; k < n; k += 5) {
    const v = hsh(k, seed, 3)
    const c = T[v % 3]
    if (vertical) {
      g.rect(x + k, y, 4, h, c)
      g.vline(x + k + 4, y, y + h - 1, T[3])
      for (let j = 0; j < h; j += 7) if (hsh(k, j, seed) % 4 === 0) g.px(x + k + 1, y + j, T[2])
    } else {
      g.rect(x, y + k, w, 4, c)
      g.hline(x, x + w - 1, y + k + 4, T[3])
      for (let i = 0; i < w; i += 9) if (hsh(i, k, seed) % 3 === 0) g.hline(x + i, x + i + 3, y + k + 1, T[2])
      // Board joints.
      for (let i = (hsh(k, 0, seed) % 30); i < w; i += 34) g.vline(x + i, y + k, y + k + 3, T[3])
    }
  }
}

/** A window in the back wall with its lacquer shutters open and light behind. */
export function wallWindow(g: Surface, x: number, y: number, w: number, h: number, outside: Color = '#bfe4f6', green = '#86c95f') {
  g.rect(x - 2, y - 2, w + 4, h + 4, GOLD.D)
  g.rect(x - 1, y - 1, w + 2, h + 2, GOLD.b)
  g.rect(x, y, w, h, outside)
  g.rect(x, y + Math.round(h * 0.6), w, Math.round(h * 0.4), green)
  g.rect(x + 1, y + 1, 2, h - 2, '#ffffff')
  // Pointed crown over the frame.
  for (let i = 0; i < 5; i++) g.hline(x + i, x + w - 1 - i, y - 3 - i, i % 2 ? GOLD.d : GOLD.b)
  // Open shutters.
  g.rect(x - 5, y, 3, h, P.redD)
  g.rect(x + w + 2, y, 3, h, P.redD)
  g.px(x - 4, y + (h >> 1), GOLD.b)
  g.px(x + w + 3, y + (h >> 1), GOLD.b)
}

/** Dado and skirting band where the back wall meets the floor. */
export function skirting(g: Surface, x: number, y: number, w: number, c: Color = '#7a2a22') {
  g.rect(x, y - 6, w, 6, c)
  g.hline(x, x + w - 1, y - 6, GOLD.b)
  for (let i = x + 2; i < x + w; i += 6) {
    g.px(i, y - 4, GOLD.d)
    g.px(i + 1, y - 3, GOLD.b)
  }
  g.hline(x, x + w - 1, y - 1, mixHex(c, '#000000', 0.35))
  g.rect(x, y, w, 2, 'rgba(30,16,20,0.3)')
}

// ---------------------------------------------------------------------------
// Floors.

export function marbleFloor(g: Surface, x: number, y: number, w: number, h: number, a: Color = '#f2ece4', b: Color = '#d8cec6', size = 10) {
  for (let j = 0; j < h; j += size)
    for (let i = 0; i < w; i += size) {
      const on = ((i / size + j / size) | 0) % 2 === 0
      g.rect(x + i, y + j, Math.min(size, w - i), Math.min(size, h - j), on ? a : b)
      g.px(x + i + 2, y + j + 2, mixHex(on ? a : b, '#ffffff', 0.5))
    }
  // Soft veins.
  for (let k = 0; k < (w * h) / 300; k++) {
    const v = hsh(k, x, y)
    const X = x + (v % w)
    const Y = y + ((v * 7) % h)
    g.px(X, Y, mixHex(a, '#8c8187', 0.3))
    g.px(X + 1, Y + 1, mixHex(a, '#8c8187', 0.2))
  }
}

export function terracottaFloor(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  const T = ['#c86a48', '#b85c40', '#d8805a', '#a84e36']
  for (let j = 0; j < h; j += 8)
    for (let i = 0; i < w; i += 8) {
      const v = hsh(i + x, j + y, seed)
      g.rect(x + i, y + j, 8, 8, T[v % 3])
      g.hline(x + i, x + i + 7, y + j, T[3])
      g.vline(x + i, y + j, y + j + 7, T[3])
      g.px(x + i + 2, y + j + 2, '#e8987a')
    }
}

/** Long red carpet runner with gold borders. */
export function carpet(g: Surface, x: number, y: number, w: number, h: number, c: Color = '#b8343f') {
  g.rect(x, y, w, h, c)
  g.rect(x, y, 2, h, GOLD.d)
  g.rect(x + w - 2, y, 2, h, GOLD.d)
  g.vline(x + 2, y, y + h - 1, GOLD.l)
  g.vline(x + w - 3, y, y + h - 1, GOLD.l)
  for (let j = y + 4; j < y + h; j += 8) {
    g.px(x + (w >> 1), j, GOLD.b)
    g.px(x + (w >> 1) - 1, j + 1, GOLD.d)
    g.px(x + (w >> 1) + 1, j + 1, GOLD.d)
  }
}

/** Woven prayer mats (เสื่อ) in a row. */
export function mats(g: Surface, x: number, y: number, n: number, gap = 14, c: Color = '#e0bb8a') {
  for (let i = 0; i < n; i++) {
    const X = x + i * gap
    g.rect(X, y, 12, 7, c)
    for (let k = 0; k < 12; k += 2) g.vline(X + k, y, y + 6, mixHex(c, '#8a6040', 0.3))
    g.frame(X, y, 12, 7, mixHex(c, '#6e4a35', 0.5))
    g.hline(X + 1, X + 10, y + 1, '#e8514a')
  }
}

// ---------------------------------------------------------------------------
// Props.

export type PillarStyle = 'lacquer' | 'white' | 'teak' | 'gilt'

/** Round/octagonal pillar from floor to the (off-screen) ceiling. */
export function pillarSprite(h: number, style: PillarStyle, w = 8): Prop {
  return spr(`pillar:${style}:${h}:${w}`, w + 4, h + 3, (w + 4) >> 1, h + 2, (g) => {
    const x0 = 2
    const body: Color[] =
      style === 'lacquer' ? ['#e05a48', '#b8343f', '#8a2432', '#5e1a26'] : style === 'teak' ? ['#b07a48', '#8a5e40', '#6e4a35', '#4a3128'] : style === 'gilt' ? [GOLD.L, GOLD.b, GOLD.d, GOLD.D] : [WHITE.L, WHITE.b, WHITE.d, WHITE.D]
    for (let y = 0; y < h; y++) {
      for (let i = 0; i < w; i++) {
        const k = i / (w - 1)
        g.px(x0 + i, y, k < 0.18 ? body[0] : k < 0.55 ? body[1] : k < 0.85 ? body[2] : body[3])
      }
    }
    if (style === 'lacquer' || style === 'teak') {
      // Gold stencil (ลายคำ) bands and diamond pattern.
      for (let y = 6; y < h - 10; y += 8)
        for (let i = 1; i < w - 1; i += 3) {
          g.px(x0 + i, y + (i % 2), GOLD.b)
          if (i < w * 0.6) g.px(x0 + i, y + 3, GOLD.d)
        }
    }
    // Lotus capital near the top and a base.
    g.rect(0, 0, w + 4, 3, GOLD.b)
    g.hline(0, w + 3, 0, GOLD.L)
    for (let i = 0; i < w + 4; i += 2) g.px(i, 3, GOLD.d)
    g.rect(0, h - 4, w + 4, 4, style === 'white' ? GOLD.d : GOLD.b)
    g.hline(0, w + 3, h - 4, GOLD.L)
    g.hline(0, w + 3, h - 1, GOLD.D)
  })
}

/** Tiered golden throne (ฐานชุกชี) with the principal Buddha. Hooks: candles, glints, halo. */
export function throneBuddha(o: { key: string; s: number; style?: BuddhaStyle; tiers?: number; half?: number; lacquer?: Color; backdrop?: (g: Surface, cx: number, seatY: number) => void }): Building {
  const s = o.s
  const half = o.half ?? Math.round(40 * s + 14)
  const nT = o.tiers ?? 4
  const W = half * 2 + 20
  const statueH = Math.round(96 * s) + 6
  const baseH = nT * 9 + 4
  const H = statueH + baseH + 30
  return build(`throne:${o.key}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const gy = H - 1
    const lac = o.lacquer ?? P.redD
    let y = gy
    for (let i = 0; i < nT; i++) {
      const hw = half - i * 4
      const h = 9
      y -= h
      g.rect(cx - hw, y, hw * 2, h, lac)
      g.rect(cx - hw, y, hw * 2, 2, GOLD.b)
      g.hline(cx - hw, cx + hw - 1, y, GOLD.L)
      g.rect(cx - hw, y + h - 1, hw * 2, 1, GOLD.D)
      // Glass-mosaic diamonds.
      for (let x = cx - hw + 3; x < cx + hw - 3; x += 5) {
        g.px(x, y + 4, GOLD.l)
        g.px(x - 1, y + 5, GOLD.d)
        g.px(x + 1, y + 5, GOLD.d)
        g.px(x, y + 6, (x >> 2) % 2 ? '#8fb6ff' : '#ff8a7a')
      }
      g.rect(cx + hw - Math.round(hw * 0.22), y + 2, Math.round(hw * 0.22), h - 3, 'rgba(30,10,16,0.25)')
    }
    // Lotus petal seat.
    const seatY = y - 2
    for (let x = cx - Math.round(34 * s); x < cx + Math.round(34 * s); x += 5) {
      g.ellipse(x + 2, y - 1, 3, 3, GOLD.b)
      g.px(x + 1, y - 3, GOLD.L)
      g.px(x + 3, y, GOLD.D)
    }
    o.backdrop?.(g, cx, seatY)
    drawBuddhaHD(g, cx, seatY, s, o.style ?? 'sukhothai')
    hooks.candles = [
      { x: cx - half + 6, y: gy - baseH + 4 },
      { x: cx + half - 6, y: gy - baseH + 4 },
    ]
    hooks.glints = [
      { x: cx, y: seatY - Math.round(92 * s) },
      { x: cx - Math.round(10 * s), y: seatY - Math.round(60 * s) },
      { x: cx + Math.round(20 * s), y: seatY - Math.round(30 * s) },
    ]
    hooks.halo = [{ x: cx, y: seatY - Math.round(60 * s) }]
    hooks.seat = [{ x: cx, y: seatY }]
  })
}

/** Brass candle rack (ราวเทียน) with rows of candles. Hooks: flames. */
export function candleRackSprite(n = 8, lit = true): Building {
  const W = n * 4 + 8
  return build(`crack:${n}:${lit ? 1 : 0}`, W, 22, W >> 1, 21, (g, hooks) => {
    const fl: { x: number; y: number }[] = []
    g.rect(1, 12, W - 2, 3, GOLD.d)
    g.hline(1, W - 2, 12, GOLD.l)
    g.rect(3, 15, 2, 7, GOLD.D)
    g.rect(W - 5, 15, 2, 7, GOLD.D)
    g.rect(1, 20, W - 2, 2, GOLD.D)
    for (let i = 0; i < n; i++) {
      const x = 4 + i * 4
      const h = 5 + ((i * 3) % 4)
      g.rect(x, 12 - h, 2, h, '#fff4d6')
      g.px(x, 12 - h, '#ffffff')
      if (lit) fl.push({ x, y: 11 - h })
    }
    // Wax drips.
    for (let x = 3; x < W - 3; x += 3) g.px(x, 15, '#fff4d6')
    hooks.flames = fl
  })
}

/** Low red lacquer offering table with flowers, fruit and a gold bowl. */
export function offeringTableSprite(w = 34): Prop {
  return spr(`offtable:${w}`, w, 16, w >> 1, 15, (g) => {
    g.rect(0, 6, w, 3, P.redD)
    g.hline(0, w - 1, 6, GOLD.b)
    g.rect(2, 9, 2, 7, P.redDD)
    g.rect(w - 4, 9, 2, 7, P.redDD)
    g.rect(1, 9, w - 2, 1, GOLD.D)
    // Goods.
    g.ellipse(6, 5, 3.5, 2, '#f58f35')
    g.px(5, 4, '#ffbb66')
    g.ellipse(w - 7, 5, 3.5, 2, '#ffd23f')
    g.rect((w >> 1) - 3, 2, 6, 4, GOLD.b)
    g.hline((w >> 1) - 3, (w >> 1) + 2, 2, GOLD.L)
    for (let i = 0; i < 3; i++) g.rect(11 + i * 3, 0, 1, 5, '#5ea653')
    g.rect(10, 0, 3, 2, '#ff9fc0')
    g.rect(16, 0, 3, 2, '#ff9fc0')
  })
}

/** Raised monks' dais (อาสน์สงฆ์) along a wall, with cushions. */
export function monkDaisSprite(len: number, seats = 3): Prop {
  return spr(`dais:${len}:${seats}`, len, 16, 0, 15, (g) => {
    g.rect(0, 4, len, 8, '#8a5e40')
    g.hline(0, len - 1, 4, '#c28e5c')
    g.rect(0, 12, len, 3, '#5e3e28')
    for (let x = 2; x < len; x += 8) g.vline(x, 5, 11, '#6e4a35')
    for (let i = 0; i < seats; i++) {
      const x = Math.round(((i + 0.5) * len) / seats)
      g.rect(x - 6, 1, 12, 4, '#f58f35')
      g.hline(x - 6, x + 5, 1, '#ffbb66')
      g.rect(x - 5, -1 + 2, 3, 2, '#d0661f')
      // Fan (ตาลปัตร) leaning.
      g.line(x + 5, 4, x + 7, -4 + 4, '#6e4a35')
    }
  })
}

/** Multi-tiered white parasol (ฉัตร) on a pole. */
export function chatraSprite(h = 50, tiers = 5, color: Color = '#fffaf0'): Prop {
  return spr(`chatra:${h}:${tiers}:${color}`, 22, h + 2, 11, h + 1, (g) => {
    g.rect(10, 4, 2, h - 3, GOLD.d)
    g.rect(7, h - 2, 8, 3, GOLD.D)
    for (let i = 0; i < tiers; i++) {
      const y = 6 + i * Math.round((h * 0.5) / tiers)
      const hw = 3 + i * 1.6
      g.rect(Math.round(11 - hw), y, Math.round(hw * 2), 3, color)
      g.hline(Math.round(11 - hw), Math.round(11 + hw) - 1, y, mixHex(color, '#ffffff', 0.6))
      for (let x = Math.round(11 - hw); x < 11 + hw; x += 2) g.px(x, y + 3, GOLD.b)
    }
    g.px(11, 2, GOLD.L)
    g.px(11, 3, GOLD.b)
  })
}

/** Money tree (ต้นกฐิน/ต้นเงิน) with banknotes pinned on the branches. */
export function moneyTreeSprite(): Prop {
  return spr('moneytree', 20, 30, 10, 29, (g) => {
    g.rect(6, 25, 8, 5, P.redD)
    g.hline(6, 13, 25, GOLD.b)
    g.vline(10, 8, 25, '#6e4a35')
    for (const [x1, y1] of [
      [3, 8],
      [17, 9],
      [5, 15],
      [15, 16],
      [10, 3],
    ] as [number, number][])
      g.line(10, 20, x1, y1, '#8a5e40')
    const notes: Color[] = ['#86c95f', '#9fd0ff', '#ff9fc0', '#c8a0ff', '#e8514a']
    for (let i = 0; i < 16; i++) {
      const v = hsh(i, 4, 9)
      const x = 2 + (v % 16)
      const y = 2 + ((v >> 3) % 18)
      g.rect(x, y, 3, 2, notes[v % notes.length])
      g.px(x, y, '#ffffff')
    }
  })
}

/** Floor-standing gold lotus vase with lotus buds. */
export function lotusVaseSprite(): Prop {
  return spr('lotusvase', 12, 24, 6, 23, (g) => {
    g.rect(3, 19, 6, 5, GOLD.D)
    g.ellipse(6, 16, 4, 4, GOLD.b)
    g.ellipse(5, 15, 2, 2, GOLD.L)
    g.rect(4, 10, 4, 3, GOLD.d)
    for (const [x, y, c] of [
      [3, 3, '#ff9fc0'],
      [7, 1, '#ffd6e0'],
      [5, 5, '#ff9fc0'],
    ] as [number, number, Color][]) {
      g.vline(x + 1, y + 3, 11, '#5ea653')
      g.rect(x, y, 3, 4, c)
      g.px(x + 1, y - 1, c)
    }
  })
}

/** Amulet & blessing counter (glass case) with a monk's cushion behind. */
export function amuletCounterSprite(): Prop {
  return spr('amulet', 44, 22, 22, 21, (g) => {
    g.rect(1, 6, 42, 14, '#8a5e40')
    g.hline(1, 42, 6, '#c28e5c')
    g.rect(3, 8, 38, 8, '#d4f1ff')
    g.rect(3, 8, 38, 1, '#ffffff')
    for (let i = 0; i < 9; i++) {
      const x = 5 + i * 4
      g.rect(x, 11, 3, 4, i % 3 ? GOLD.b : '#8c8187')
      g.px(x + 1, 12, i % 3 ? GOLD.D : '#3a3040')
    }
    g.rect(1, 20, 42, 2, '#5e3e28')
    // Holy-water bowl and brush on top.
    g.ellipse(34, 5, 4, 2, '#c9a04c')
    g.ellipse(34, 4, 3, 1, '#9fd0ff')
    g.line(30, 1, 33, 4, '#c9a04c')
  })
}

/** Big bronze gong or temple drum on a stand. */
export function gongSprite(): Prop {
  return spr('gong', 26, 32, 13, 31, (g) => {
    g.rect(2, 2, 2, 30, '#6e4a35')
    g.rect(22, 2, 2, 30, '#6e4a35')
    g.rect(0, 1, 26, 3, '#8a5e40')
    g.hline(0, 25, 1, '#c28e5c')
    g.vline(13, 4, 7, '#3a3040')
    g.circle(13, 17, 9, '#9c6634')
    g.circle(13, 17, 8, '#c9a04c')
    g.circle(12, 16, 4, '#e6c070')
    g.circle(13, 17, 2.5, '#b98244')
    g.px(11, 14, '#fff0c0')
  })
}

/** Small shoe rack inside the door (arranged or messy). */
export { shoeRackSprite } from './historic'
