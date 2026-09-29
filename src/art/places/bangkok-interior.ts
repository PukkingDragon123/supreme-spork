// Bangkok group – interior pieces for the walk-in rooms: the Emerald Buddha
// on its towering golden busabok throne, crowned standing Buddhas, the 46 m
// reclining Buddha with mother-of-pearl soles, the 108 bronze bowls, crystal
// chandeliers, mural walls, painted pillars, altars and floors.
//
// Statues are "sculpted" with the analytic renderer from hall.ts (lit and
// quantised to a pixel ramp once, at bake time).

import { mix, type Color, type Surface } from '../../engine/pixel'
import { sculpt, GOLD_RAMP, buddhaSculpt, type SculptDetail, type Sculpted } from '../hall'
import { P } from '../palette'
import { GOLD, WHITE, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { bbuild, bprop, BK, hsh } from './bangkok'
import { GOLD5, litRow, squareTier, mosaicColumn, type Ramp5 } from './bangkok-arch'

// ---------------------------------------------------------------------------
// Sculpt primitives (same shapes as hall.ts; declared locally).

type V3 = [number, number, number]
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
  zk: number
  m?: number
}
type Prim = Ell | Cap
const E = (x: number, y: number, z: number, rx: number, ry: number, rz: number, part: number, minY?: number, m?: number): Ell => ({ t: 0, x, y, z, rx, ry, rz, part, minY, m })
const C = (a: V3, b: V3, ra: number, rb: number, part: number, minY?: number, zk = 1, m?: number): Cap => ({ t: 1, ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], ra, rb, part, minY, zk, m })
function withM(m: number, ps: Prim[]): Prim[] {
  for (const p of ps) p.m = m
  return ps
}

export const JADE_RAMP = ['#06261a', '#0b3a26', '#10502f', '#17683c', '#1f8449', '#2ba35a', '#47c275', '#86e3a6', '#d6ffe6'] as const

// ---------------------------------------------------------------------------
// พระแก้วมรกต – the Emerald Buddha in meditation, wearing its hot-season
// regalia (tall gold crown, necklace, armlets and belt).

let emeraldCache: Sculpted | null = null
export function emeraldBuddha(): Sculpted {
  if (emeraldCache) return emeraldCache
  const prims: Prim[] = [
    E(0, 7.4, 0, 31, 7.6, 11, 1, 0),
    E(-28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0),
    E(28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0),
    C([28, 5.5, 6], [-8, 7, 8], 4.6, 4.2, 1, 0),
    C([-29, 7.6, 9], [12, 10.8, 13], 4.8, 3.8, 9, 0),
    E(18.6, 11.8, 13.6, 6.8, 2.8, 3, 10),
    E(0, 17, 1.5, 11, 7, 8.4, 2),
    C([0, 18, 0.5], [0, 33, 0.5], 9.6, 14.2, 2, undefined, 0.62),
    E(0, 35.5, 1, 16.4, 11.5, 8.4, 2),
    C([-15.4, 40.6, 0], [0, 43.2, 0], 5, 5, 2, undefined, 0.9),
    C([15.4, 40.6, 0], [0, 43.2, 0], 5, 5, 2, undefined, 0.9),
    C([0, 43, 0.5], [0, 50, 1.5], 4.4, 4, 2),
    E(0, 60, 2, 9, 10.8, 9, 3),
    E(0, 53.8, 3.6, 6, 4.8, 6.4, 3),
    C([-8.7, 64.2, 0.5], [-9.4, 53.4, 1.5], 1.05, 1.6, 8),
    C([8.7, 64.2, 0.5], [9.4, 53.4, 1.5], 1.05, 1.6, 8),
    // Both hands resting in the lap.
    C([-17.4, 41.4, 0], [-22.5, 27, 2], 5.1, 4.1, 4),
    C([-22.5, 27, 2], [-5, 14.5, 10], 4, 3, 4),
    C([17.4, 41.4, 0], [22.5, 27, 2], 5.1, 4.1, 5),
    C([22.5, 27, 2], [5, 15, 10.5], 4, 3, 5),
    E(0, 14.6, 11.6, 8.5, 2.6, 3.2, 6),
    // Gold crown.
    ...withM(1, [E(0, 69.5, 1.8, 9.4, 3.3, 8.8, 12), E(0, 76, 2, 6.6, 5, 6.2, 11), C([0, 76, 1.8], [0, 104, 1.8], 6.4, 0.35, 11)]),
    // Gold necklace collar (thin shell over the chest).
    ...withM(1, [E(0, 43.4, 3.2, 13.5, 2.2, 7.4, 13)]),
  ]
  const detail = (d: SculptDetail) => {
    // Armlets, belt and crown tiers.
    d.each((i, j, _lx, ly, part) => {
      if ((part === 4 || part === 5) && ly > 30 && ly < 33.5) d.paint(i, j, 1)
      if (part === 2 && ly > 16 && ly < 19) d.paint(i, j, 1)
      if (part === 11 && Math.floor(ly / 4) % 2 === 0) d.add(i, j, -1)
    })
    // Serene face.
    const Y = -4
    d.curve(-6.2, -2.1, (x) => 63.1 + Y - 0.09 * (x + 4.2) * (x + 4.2), -3)
    d.curve(2.1, 6.2, (x) => 63.1 + Y - 0.09 * (x - 4.2) * (x - 4.2), -3)
    d.line(0.7, 65 + Y, 0.7, 60.4 + Y, -1)
    d.line(-2.2, 57.4 + Y, 2.2, 57.4 + Y, -2)
    d.curve(-7.3, -0.9, (x) => 65.6 + Y + 1.6 * (1 - ((Math.abs(x) - 4.2) / 3.4) ** 2), -2)
    d.curve(0.9, 7.3, (x) => 65.6 + Y + 1.6 * (1 - ((Math.abs(x) - 4.2) / 3.4) ** 2), -2)
    d.line(-2.4, 14.3, 2.8, 14.9, -1)
  }
  emeraldCache = sculpt({ prims, s: 0.34, x0: -38, x1: 38, y0: -1, y1: 106, ramps: [JADE_RAMP, GOLD_RAMP], rim: 0.4, spec: [18, 0.7], gloss: [1.4, 0.8], detail })
  return emeraldCache
}

/** Nine-tiered white umbrella (นพปฎลมหาเศวตฉัตร) on a gold pole. */
function chatra(g: Surface, x: number, top: number, bottom: number, tiers = 7) {
  g.vline(x, top, bottom, GOLD.d)
  g.vline(x + 1, top + 2, bottom, GOLD.D)
  const span = bottom - top - 10
  for (let i = 0; i < tiers; i++) {
    const y = top + 4 + Math.round((span * i) / tiers)
    const hw = 3 + i * 1.1
    g.rect(Math.round(x - hw), y, Math.round(hw * 2) + 1, 3, WHITE.b)
    g.hline(Math.round(x - hw), Math.round(x + hw), y, '#ffffff')
    g.hline(Math.round(x - hw), Math.round(x + hw), y + 3, GOLD.b)
    for (let k = Math.round(x - hw); k <= x + hw; k += 2) g.px(k, y + 4, GOLD.d)
  }
  g.px(x, top - 1, GOLD.L)
}

/** Towering golden busabok with the Emerald Buddha on top. Anchor = bottom centre. */
export function emeraldThrone(): Building {
  const W = 132
  const H = 196
  return bbuild('int:emeraldthrone', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    const RED5: Ramp5 = ['#e8605a', '#c23a3f', '#9e2a33', '#7e2436', '#5a1826']
    // Busabok spire behind the image.
    g.poly(
      [
        [cx - 20, 118],
        [cx - 14, 70],
        [cx - 6, 30],
        [cx, 6],
        [cx + 6, 30],
        [cx + 14, 70],
        [cx + 20, 118],
      ],
      GOLD.D,
    )
    for (let y = 12; y < 118; y++) {
      const t = (y - 6) / 112
      const hw = 2 + t * 17
      for (let x = Math.round(cx - hw); x < cx + hw; x++) {
        const u = (x - cx) / hw
        let c = u < -0.5 ? GOLD.l : u > 0.5 ? GOLD.d : GOLD.b
        if ((x + y) % 6 === 0 || (x - y + 300) % 6 === 0) c = GOLD.D
        if ((x + y) % 12 === 3 && y % 4 === 1) c = ['#62d0a0', '#e8514a', '#8fb6ff'][(x + y) % 3]
        g.px(x, y, c)
      }
      if (y % 8 === 0) g.hline(Math.round(cx - hw) - 1, Math.round(cx + hw), y, GOLD.D)
    }
    glints.push({ x: cx, y: 8 })
    // Halo of flame leaves around the seat.
    for (let a = 0; a < 20; a++) {
      const ang = Math.PI + (a / 19) * Math.PI
      const x = cx + Math.cos(ang) * 24
      const y = 104 + Math.sin(ang) * 30
      g.px(Math.round(x), Math.round(y), GOLD.L)
      g.px(Math.round(x), Math.round(y) + 1, GOLD.b)
    }
    // Umbrellas.
    chatra(g, cx - 44, 30, 118)
    chatra(g, cx + 44, 30, 118)
    // Tiers of the throne.
    const tiers: [number, number, Ramp5, Color?][] = [
      [16, 13, GOLD5, BK.redD],
      [22, 9, RED5],
      [28, 10, GOLD5, GOLD.D],
      [34, 12, RED5],
      [42, 10, GOLD5, GOLD.D],
      [50, 12, RED5],
      [60, 14, GOLD5, BK.redD],
    ]
    let y = 110
    for (const [half, h, r, band] of tiers) {
      squareTier(g, cx, y, h, half, r, band)
      if (r === RED5) {
        // Glass-set gold figures (devas and garudas) along the red tiers.
        for (let x = Math.round(cx - half) + 3; x < cx + half - 3; x += 6) {
          g.rect(x, y + 3, 2, h - 5, GOLD.b)
          g.px(x, y + 2, GOLD.L)
          g.px(x - 1, y + 4, GOLD.d)
          g.px(x + 2, y + 4, GOLD.d)
          if ((x >> 1) % 3 === 0) g.px(x + 1, y + h - 3, '#62d0a0')
        }
      } else {
        for (let x = Math.round(cx - half) + 1; x < cx + half - 1; x += 3) g.px(x, y + 1, GOLD.D)
        for (let x = Math.round(cx - half) + 2; x < cx + half - 1; x += 4) g.px(x, y + h - 3, '#5ab8e8')
      }
      glints.push({ x: Math.round(cx - half) + 2, y: y + 1 })
      y += h
    }
    // Lotus seat.
    for (let i = 0; i < 5; i++) litRow(g, cx, 110 - i, 14 - i * 0.5, GOLD5, { bias: i === 2 ? 1 : 0 })
    for (let x = cx - 12; x <= cx + 12; x += 3) g.px(x, 108, GOLD.D)
    // The Emerald Buddha itself.
    const b = emeraldBuddha()
    g.draw(b.canvas, cx - b.ox, 106 - b.oy)
    glints.push({ x: cx - 3, y: 106 - 34 }, { x: cx, y: 106 - 30 })
    hooks.glints = glints
    hooks.buddha = [{ x: cx, y: 90 }]
    hooks.candles = [
      { x: cx - 58, y: 176 },
      { x: cx + 58, y: 176 },
    ]
  })
}

/** Standing crowned Buddha (Phra Buddha Yodfa / Loetla) in royal regalia. */
export function crownedBuddha(flip = false): Prop {
  const W = 30
  const H = 92
  return bprop(`int:crowned:${flip ? 1 : 0}`, W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    squareTier(g, cx, H - 10, 10, 13, ['#e8605a', '#c23a3f', '#9e2a33', '#7e2436', '#5a1826'], GOLD.b)
    for (let i = 0; i < 4; i++) litRow(g, cx, H - 11 - i, 11 - i, GOLD5, { bias: i === 1 ? 1 : 0 })
    // Robe and regalia.
    for (let y = 34; y < H - 14; y++) {
      const t = (y - 34) / (H - 48)
      const hw = 6 + t * 3
      litRow(g, cx, y, hw, GOLD5, { tiles: y > 50 && y % 5 === 0 })
    }
    // Belt, jewelled apron and sash.
    g.rect(cx - 6, 52, 12, 2, BK.redD)
    for (let x = cx - 5; x < cx + 6; x += 2) g.px(x, 52, '#62d0a0')
    g.rect(cx - 2, 54, 4, 24, GOLD.l)
    g.vline(cx, 54, 77, BK.redD)
    // Arms raised forward, palms out (ห้ามญาติ).
    for (const s of [-1, 1]) {
      g.thickLine(cx + s * 6, 38, cx + s * 9, 50, 3, GOLD.b)
      g.ellipse(cx + s * 9, 52, 2, 3, GOLD.l)
    }
    // Collar and epaulettes.
    g.rect(cx - 7, 34, 14, 3, GOLD.l)
    for (let x = cx - 7; x < cx + 7; x += 2) g.px(x, 36, BK.redD)
    for (const s of [-1, 1]) {
      g.poly(
        [
          [cx + s * 5, 34],
          [cx + s * 11, 30],
          [cx + s * 9, 37],
        ],
        GOLD.b,
      )
    }
    // Head with crown (ชฎา).
    g.ellipse(cx, 28, 4.5, 5, GOLD.b)
    g.ellipse(cx + 1, 29, 3, 4, GOLD.d)
    g.px(cx - 2, 28, GOLD.DD)
    g.px(cx + 2, 28, GOLD.DD)
    for (let i = 0; i < 20; i++) {
      const hw = Math.max(0.5, 5 - i * 0.24)
      g.rect(Math.round(cx - hw), 23 - i, Math.max(1, Math.round(hw * 2)), 1, i % 3 === 0 ? GOLD.D : i % 3 === 1 ? GOLD.b : GOLD.l)
    }
    g.px(cx, 2, GOLD.L)
    for (const s of [-1, 1]) g.poly([[cx + s * 4, 24], [cx + s * 8, 18], [cx + s * 6, 26]], GOLD.b)
  })
}

// ---------------------------------------------------------------------------
// Chandeliers and lamps (drawn per frame in the overlay, cheap).

export function chandelierSprite(): Prop {
  return bprop('int:chandelier', 32, 40, 16, 0, (g) => {
    const cx = 16
    g.vline(cx, 0, 6, GOLD.D)
    // Tiers of crystal drops on a gold frame.
    const tiers: [number, number][] = [
      [8, 6],
      [16, 10],
      [26, 14],
    ]
    for (const [y, hw] of tiers) {
      g.hline(cx - hw, cx + hw, y, GOLD.b)
      g.hline(cx - hw + 1, cx + hw - 1, y + 1, GOLD.D)
      for (let x = cx - hw; x <= cx + hw; x += 2) {
        g.vline(x, y + 2, y + 4 + ((x >> 1) % 2), '#dff4ff')
        g.px(x, y + 5 + ((x >> 1) % 2), '#ffffff')
      }
      // Candle bulbs.
      for (let x = cx - hw; x <= cx + hw; x += Math.max(4, hw)) {
        g.rect(x, y - 3, 1, 3, '#fffaf0')
        g.px(x, y - 4, '#fff3a6')
      }
    }
    g.vline(cx, 6, 34, GOLD.d)
    g.circle(cx, 36, 2, '#dff4ff')
    g.px(cx - 1, 35, '#ffffff')
  })
}

// ---------------------------------------------------------------------------
// Room painters (for MapDef.bake of the interiors).

/** Red lacquer ceiling band with gold star flowers (ดาวเพดาน). */
export function starCeiling(g: Surface, x: number, y: number, w: number, h: number, base: Color = '#8a1e2c') {
  g.rect(x, y, w, h, base)
  g.hline(x, x + w - 1, y + h - 1, GOLD.D)
  g.hline(x, x + w - 1, y + h - 2, GOLD.b)
  for (let j = y + 3; j < y + h - 3; j += 6)
    for (let i = x + ((j / 6) % 2 ? 3 : 6); i < x + w; i += 7) {
      g.px(i, j, GOLD.l)
      g.px(i - 1, j, GOLD.d)
      g.px(i + 1, j, GOLD.d)
      g.px(i, j - 1, GOLD.d)
      g.px(i, j + 1, GOLD.d)
    }
}

/** Mural wall: scenes of the Buddha's life and the Three Worlds. */
export function muralWall(g: Surface, x: number, y: number, w: number, h: number, seed = 0, tone: 'red' | 'cream' | 'blue' = 'cream') {
  const bg = tone === 'red' ? ['#7e2436', '#9e3040', '#6a1e2c'] : tone === 'blue' ? ['#3a4e8a', '#50649e', '#2e3e70'] : ['#efe0bc', '#e2cfa2', '#d4bf90']
  g.gradientV(x, y, w, h, bg, 3)
  const r = (k: number) => hsh(seed, k, 5)
  // Registers of praying devas (เทพชุมนุม) in the upper band.
  const band = Math.round(h * 0.3)
  for (let row = 0; row < 2; row++) {
    const ry = y + 4 + row * Math.round(band / 2)
    for (let i = x + 3 + row * 3; i < x + w - 6; i += 8) {
      g.rect(i, ry + 2, 4, 5, row ? '#e8c890' : '#f5d8a8')
      g.px(i + 1, ry, GOLD.b)
      g.px(i + 2, ry, GOLD.b)
      g.px(i + 1, ry + 1, GOLD.l)
      g.rect(i - 1, ry + 7, 6, 2, row ? BK.green : BK.redD)
      g.px(i + 2, ry + 3, '#5a3d4f')
      // Tiny flame-halo between devas.
      g.px(i + 6, ry + 4, tone === 'red' ? GOLD.d : '#9e3040')
    }
  }
  g.hline(x, x + w - 1, y + band + 2, GOLD.D)
  g.hline(x, x + w - 1, y + band + 3, GOLD.b)
  // Lower scenes: palaces, trees, river and little figures.
  const sy = y + band + 5
  const sh = h - band - 5
  g.rect(x, sy + Math.round(sh * 0.62), w, Math.ceil(sh * 0.38), tone === 'red' ? '#5a1826' : '#b8a070')
  for (let i = 0; i < w; i += 1) {
    const hy = sy + Math.round(sh * 0.4 + Math.sin((x + i) * 0.11 + seed) * 3)
    g.vline(x + i, hy, sy + Math.round(sh * 0.62), tone === 'red' ? '#4a6a5a' : '#7a9a7a')
  }
  for (let k = 0; k < Math.floor(w / 30); k++) {
    const px = x + 6 + Math.floor(r(k) * (w - 24))
    const py = sy + Math.round(sh * 0.62)
    if (r(20 + k) < 0.5) {
      // Palace pavilion.
      g.rect(px, py - 8, 14, 8, '#fffaf0')
      g.rect(px + 5, py - 5, 4, 5, BK.redDD)
      for (let i = 0; i < 7; i++) g.rect(px + 7 - (6 - i), py - 9 - i, (6 - i) * 2 + 1, 1, i % 2 ? GOLD.d : BK.red)
      g.px(px + 7, py - 17, GOLD.L)
    } else {
      // Buddha preaching under a tree to kneeling disciples.
      g.circle(px + 6, py - 12, 5, '#3f7a52')
      g.vline(px + 6, py - 8, py - 3, '#6e4a35')
      g.rect(px + 4, py - 6, 4, 5, GOLD.b)
      g.px(px + 5, py - 7, GOLD.l)
      g.px(px + 6, py - 7, GOLD.l)
      for (let d = 0; d < 3; d++) g.rect(px + 10 + d * 3, py - 3, 2, 3, BK.marigold)
    }
  }
  // Wavy river band.
  const ry = sy + Math.round(sh * 0.78)
  for (let i = 0; i < w; i++) g.px(x + i, ry + Math.round(Math.sin((x + i) * 0.3) * 1), '#5a8de0')
  for (let k = 0; k < w / 5; k++) g.px(x + Math.floor(r(50 + k) * w), sy + Math.floor(r(90 + k) * sh), GOLD.b)
}

/** Polished floor: marble slabs, with an optional carpet runner. */
export function templeFloor(g: Surface, x: number, y: number, w: number, h: number, kind: 'marble' | 'teak' | 'terrazzo' = 'marble', seed = 0) {
  if (kind === 'teak') {
    g.rect(x, y, w, h, '#b8844f')
    for (let j = 0; j < h; j += 4) {
      g.hline(x, x + w - 1, y + j, '#9a6a3f')
      for (let i = ((j / 4) % 3) * 11; i < w; i += 34) g.vline(x + i, y + j, y + j + 3, '#9a6a3f')
      for (let i = 0; i < w; i += 5) if (hsh(i, j, seed) < 0.2) g.px(x + i, y + j + 2, '#c9955f')
    }
    return
  }
  if (kind === 'terrazzo') {
    g.rect(x, y, w, h, '#e8e0d6')
    for (let k = 0; k < (w * h) / 12; k++) {
      const X = x + Math.floor(hsh(k, seed, 1) * w)
      const Y = y + Math.floor(hsh(seed, k, 2) * h)
      g.px(X, Y, ['#c9bfb4', '#d8a890', '#a8b8c0', '#f5f0ea'][k % 4])
    }
    return
  }
  const base = '#f2ede6'
  g.rect(x, y, w, h, base)
  for (let j = 0; j < h; j += 10) {
    g.hline(x, x + w - 1, y + j, '#ddd4ca')
    for (let i = (j / 10) % 2 ? 7 : 0; i < w; i += 14) {
      g.vline(x + i, y + j, Math.min(y + h - 1, y + j + 9), '#ddd4ca')
      if (hsh(i, j, seed) < 0.4) g.line(x + i + 3, y + j + 2, x + i + 8, y + j + 7, '#e6dfd6')
      g.hline(x + i + 1, x + i + 4, y + j + 1, '#ffffff')
    }
  }
}

export function carpet(g: Surface, x: number, y: number, w: number, h: number, c: Color = '#b8343f', border: Color = GOLD.d) {
  g.rect(x, y, w, h, c)
  g.frame(x + 1, y + 1, w - 2, h - 2, border)
  for (let j = y + 4; j < y + h - 4; j += 6) for (let i = x + 4; i < x + w - 4; i += 6) g.px(i, j, mix(c, border, 0.5))
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(58,40,56,0.18)'
  g.ctx.fillRect(x - g.ox, y + h - g.oy, w, 1)
  g.ctx.restore()
}

/** Side walls of a 3/4 room: a darker strip with gold-shuttered windows. */
export function sideWall(g: Surface, x: number, y0: number, y1: number, w: number, color: Color, night = false) {
  g.rect(x, y0, w, y1 - y0, color)
  for (let y = y0 + 18; y < y1 - 20; y += 44) {
    g.rect(x + 2, y, w - 4, 22, GOLD.d)
    g.rect(x + 3, y + 1, w - 6, 20, night ? '#ffe7a8' : '#8fd0f0')
    g.vline(x + Math.floor(w / 2), y + 1, y + 20, GOLD.D)
    g.rect(x + 3, y + 1, w - 6, 3, GOLD.l)
  }
}

/** Square lacquered pillar with gold floral stencils (ลายรดน้ำ); anchor = base. */
export function paintedPillar(h: number, style: 'red' | 'mosaic' | 'white' | 'flower' = 'red'): Prop {
  const W = 10
  return bprop(`int:pillar:${h}:${style}`, W, h, W >> 1, h - 1, (g) => {
    if (style === 'mosaic') {
      mosaicColumn(g, 1, 2, h - 1, 8)
      return
    }
    const body = style === 'white' ? WHITE.b : style === 'flower' ? '#f0e0c4' : '#8a1e2c'
    const shade = style === 'white' ? WHITE.D : style === 'flower' ? '#d8c4a0' : '#5e1422'
    g.rect(1, 4, 8, h - 8, body)
    g.rect(7, 4, 2, h - 8, shade)
    g.vline(1, 4, h - 5, mix(body, '#ffffff', 0.35))
    for (let y = 8; y < h - 10; y += 6) {
      const c = style === 'flower' ? ['#e8514a', '#5a8de0', '#3f9a6b'][(y / 6) % 3] : GOLD.d
      g.px(4, y, c)
      g.px(3, y + 1, c)
      g.px(5, y + 1, c)
      g.px(4, y + 2, c)
      if (style !== 'flower') g.px(4, y + 1, GOLD.l)
    }
    // Lotus capital and base.
    g.rect(0, 1, 10, 3, GOLD.b)
    g.hline(0, 9, 1, GOLD.L)
    for (let x = 0; x < 10; x += 2) g.px(x, 4, GOLD.D)
    g.rect(0, h - 5, 10, 4, GOLD.d)
    g.hline(0, 9, h - 5, GOLD.l)
  })
}

/** Low altar table with vases, candles and a small gold Buddha. */
export function altarTable(w = 40, withBuddha = true): Prop {
  return bprop(`int:altar:${w}:${withBuddha ? 1 : 0}`, w, 30, w >> 1, 29, (g) => {
    const cx = w >> 1
    g.rect(2, 16, w - 4, 3, '#8a1e2c')
    g.hline(2, w - 3, 16, GOLD.l)
    g.rect(3, 19, w - 6, 9, '#6e1a26')
    for (let x = 5; x < w - 5; x += 4) g.px(x, 22, GOLD.d)
    g.rect(3, 27, 3, 2, GOLD.d)
    g.rect(w - 6, 27, 3, 2, GOLD.d)
    if (withBuddha) {
      const b = buddhaSculpt('sukhothai', 0.14)
      g.draw(b.canvas, cx - b.ox, 16 - b.oy)
    }
    for (const s of [-1, 1]) {
      const vx = cx + s * (w / 2 - 7)
      g.rect(vx - 2, 11, 4, 5, '#5a8de0')
      g.hline(vx - 2, vx + 1, 11, '#9fd0ff')
      g.circle(vx, 8, 3, '#43905a')
      g.px(vx - 1, 6, '#ff9fc0')
      g.px(vx + 1, 7, '#fffaf0')
      g.px(vx, 5, '#ff9fc0')
      g.rect(vx + s * -5, 10, 1, 6, '#fff4d6')
    }
    g.ellipse(cx, 15, 3, 1, GOLD.d)
  })
}

// ---------------------------------------------------------------------------
// Wat Pho: the reclining Buddha (พระพุทธไสยาส) and the 108 bowls.

let recliningCache: Sculpted | null = null
/** Sculpted reclining Buddha, head at the left resting on its right hand. */
export function recliningSculpt(): Sculpted {
  if (recliningCache) return recliningCache
  // The head rests tilted on the right palm; "up" of the face points to the
  // upper left so the serene face still reads at pixel size.
  const hx = -166
  const hy = 88
  const ux = -0.8
  const uy = 0.6
  // Face-local (fx: image's left, fy: up) → sculpt local.
  const F = (fx: number, fy: number): V3 => [hx + 0.6 * fx + ux * fy, hy + 0.8 * fx + uy * fy, 12]
  const U = (k: number, z = 3): V3 => [hx + ux * k, hy + uy * k, z]
  const prims: Prim[] = [
    E(hx, hy, 4, 17, 17, 14, 1),
    E(F(0, -6)[0], F(0, -6)[1], 7, 11, 10, 10, 1),
    E(U(15)[0], U(15)[1], 3, 8, 8, 7, 7),
    C(U(20), U(33), 4.6, 0.5, 11),
    C(F(-9.5, 5), F(-10.5, -9), 1.4, 2.2, 8),
    C(F(9.5, 5), F(10.5, -9), 1.4, 2.2, 8),
    // Supporting right arm: elbow on the pillow, palm under the cheek.
    C([hx + 36, 44, -4], [hx + 14, 30, 4], 8, 7, 3),
    C([hx + 14, 30, 4], [hx + 4, 66, 8], 7, 6, 3),
    E(hx + 2, 70, 9, 10, 5, 7, 6),
    // Neck, shoulders and torso lying on the side.
    C([hx + 16, 76, 2], [hx + 32, 70, 1], 8, 9, 2),
    E(hx + 42, 60, 0, 20, 27, 20, 2),
    C([hx + 42, 58, 0], [-40, 48, 0], 27, 29, 2, undefined, 0.72),
    E(-40, 48, 0, 32, 31, 22, 4),
    // Upper (left) arm lying along the body, hand on the thigh.
    C([hx + 46, 84, 12], [-44, 76, 17], 8, 7, 5),
    E(-34, 74, 19, 11, 4.5, 5, 6),
    // Legs, one on the other, down to the ankles.
    C([-30, 58, 8], [150, 44, 10], 18, 11, 9),
    C([-30, 32, -2], [150, 20, 0], 18, 11, 10),
    E(156, 44, 10, 13, 11, 10, 9),
    E(156, 20, 0, 13, 11, 10, 10),
  ]
  const detail = (d: SculptDetail) => {
    d.each((i, j, lx, ly, part) => {
      // Hair curls above the hairline and on the ushnisha.
      const fx = (lx - hx) * 0.6 + (ly - hy) * 0.8
      const fy = (lx - hx) * ux + (ly - hy) * uy
      const hair = (part === 1 && fy > 9.5 - 0.03 * fx * fx) || part === 7
      if (hair) {
        if (i % 2 === 0 && (j + (i >> 1)) % 2 === 0) d.add(i, j, -1)
        else if ((i + j) % 4 === 1) d.add(i, j, 1)
      }
      // Robe pleats running along the body.
      if ((part === 2 || part === 4 || part === 9 || part === 10) && Math.floor(ly) % 7 === 0 && (i + j) % 3 !== 0) d.add(i, j, -1)
    })
    const seg = (a: V3, b: V3, t: number) => d.line(a[0], a[1], b[0], b[1], t)
    const arc = (x0: number, x1: number, f: (fx: number) => number, t: number) => {
      for (let fx = x0; fx <= x1; fx += 0.25) {
        const p = F(fx, f(fx))
        const [i, j] = d.px(p[0], p[1])
        d.add(i, j, t)
      }
    }
    // Brows meeting at the nose bridge.
    arc(-8, -1, (x) => 6 + 1.6 * (1 - ((Math.abs(x) - 4.4) / 3.6) ** 2), -3)
    arc(1, 8, (x) => 6 + 1.6 * (1 - ((Math.abs(x) - 4.4) / 3.6) ** 2), -3)
    // Downcast eyes.
    arc(-7, -2.5, (x) => 2.6 - 0.12 * (x + 4.6) * (x + 4.6), -4)
    arc(2.5, 7, (x) => 2.6 - 0.12 * (x - 4.6) * (x - 4.6), -4)
    // Nose.
    seg(F(0.9, 2), F(1.2, -4.5), -2)
    seg(F(-0.6, 1.5), F(-0.6, -3.5), 1)
    const [ni, nj] = d.px(F(1.8, -5)[0], F(1.8, -5)[1])
    d.add(ni, nj, -2)
    // Smiling lips.
    arc(-3.4, 3.4, (x) => -8 + 0.05 * x * x, -3)
    arc(-2, 2, () => -9.4, 1)
    // Hairline.
    arc(-10, 10, (x) => 9.5 - 0.03 * x * x, -2)
    // Robe hem across the ankles and the fingers.
    d.line(132, 58, 132, 8, -2)
    d.line(hx - 6, 72, hx + 10, 73, -1)
    d.line(-44, 78, -24, 78, -1)
  }
  recliningCache = sculpt({ prims, s: 1, x0: -216, x1: 172, y0: -2, y1: 124, ramps: [GOLD_RAMP], rim: 0.34, spec: [14, 0.55], detail })
  return recliningCache
}

/**
 * The whole reclining Buddha group: dais, glass-mosaic pillows, the statue
 * and the mother-of-pearl soles. Anchor = front centre of the dais.
 */
export function recliningBuddha(): Building {
  const W = 452
  const H = 150
  return bbuild('int:reclining', W, H, W >> 1, H - 1, (g, hooks) => {
    const b = recliningSculpt()
    const ox = 232 // sprite x of the sculpt origin
    const oy = H - 16 // sprite y of the dais top
    // Dais (red lacquer and gold).
    g.rect(4, oy, W - 8, 14, '#8a1e2c')
    g.hline(4, W - 5, oy, GOLD.l)
    g.hline(4, W - 5, oy + 1, GOLD.d)
    for (let x = 8; x < W - 8; x += 6) {
      g.px(x, oy + 6, GOLD.b)
      g.px(x - 1, oy + 7, GOLD.d)
      g.px(x + 1, oy + 7, GOLD.d)
    }
    g.hline(4, W - 5, oy + 12, GOLD.D)
    g.hline(4, W - 5, oy + 13, '#5a1826')
    // Glass-mosaic box pillows under the head and arm.
    for (const [x, y, w, h] of [
      [ox - 214, oy - 30, 56, 30],
      [ox - 206, oy - 52, 42, 22],
    ]) {
      for (let j = 0; j < h; j++)
        for (let i = 0; i < w; i++) {
          const d = (i + j) % 6
          const e = (i - j + 60) % 6
          let c: Color = i > w - 6 ? '#1a3a6e' : '#2f4fa8'
          if (d === 0 || e === 0) c = GOLD.d
          else if (d === 3 && e === 3) c = ['#62d0a0', '#e8514a', '#fffaf0', GOLD.l][(i + j * 3) % 4]
          g.px(x + i, y + j, c)
        }
      g.hline(x, x + w - 1, y, GOLD.l)
      g.rect(x, y + h - 2, w, 2, GOLD.D)
    }
    // The statue.
    g.draw(b.canvas, ox - b.ox, oy - b.oy)
    // Mother-of-pearl soles at the foot end (seen end-on).
    const fx = ox + 176
    const fy = oy - 2
    for (const [dx, dy] of [
      [0, -58],
      [0, -30],
    ]) {
      const x0 = fx + dx
      const y0 = fy + dy
      for (let j = 0; j < 28; j++) {
        const t = j / 27
        const hw = 10 - Math.pow(Math.abs(t - 0.45) * 2, 3) * 3
        g.rect(Math.round(x0 - hw), y0 + j, Math.round(hw * 2), 1, '#241a2b')
      }
      // Pearl panels of the 108 auspicious signs.
      for (let j = 3; j < 26; j += 4)
        for (let i = -7; i < 7; i += 4) {
          const c = ['#fffaf0', '#dff4ff', '#ffe6f0', '#e8fff0'][(i + j + 16) % 4]
          g.rect(x0 + i, y0 + j, 3, 3, c)
          g.px(x0 + i + 1, y0 + j + 1, '#9fd0ff')
        }
      // Dharma wheel in the middle.
      g.circle(x0, y0 + 14, 3.5, '#fffaf0')
      g.circle(x0, y0 + 14, 1.5, GOLD.b)
      // Toes along the top (all the same length).
      for (let k = -2; k <= 2; k++) g.circle(x0 + k * 4, y0 - 1, 1.8, GOLD.b)
      g.hline(x0 - 10, x0 + 9, y0 + 27, GOLD.D)
    }
    hooks.head = [{ x: ox - 166, y: oy - 84 }]
    hooks.feet = [{ x: fx, y: fy - 40 }]
    hooks.glints = [
      { x: ox - 200, y: oy - 90 },
      { x: ox - 120, y: oy - 88 },
      { x: ox - 20, y: oy - 82 },
      { x: ox + 80, y: oy - 60 },
      { x: ox + 150, y: oy - 50 },
      { x: fx - 6, y: fy - 46 },
    ]
  })
}

/** The long bench of 108 bronze bowls (บาตร 108 ใบ). */
export function bowlBench(n = 108, gap = 4): Prop {
  const W = n * gap + 8
  return bprop(`int:bowls:${n}:${gap}`, W, 18, 0, 17, (g) => {
    g.rect(0, 8, W, 3, '#8a5a3a')
    g.hline(0, W - 1, 8, '#b07a52')
    g.rect(1, 11, W - 2, 5, '#6e4a35')
    for (let x = 6; x < W; x += 40) g.rect(x, 11, 2, 6, '#4a3128')
    for (let i = 0; i < n; i++) {
      const x = 4 + i * gap
      g.ellipse(x + 1.5, 5.5, 2.2, 2.6, '#b98244')
      g.px(x, 4, '#ecc47c')
      g.px(x, 5, '#d4a25a')
      g.hline(x, x + 2, 3, '#62381f')
      g.px(x + 2, 6, '#7f4d28')
    }
  })
}

/** Coin exchange booth (แลกเหรียญหยอดบาตร). */
export function coinBooth(): Prop {
  return bprop('int:coinbooth', 34, 30, 17, 29, (g) => {
    g.rect(2, 10, 30, 3, '#e0bb8a')
    g.hline(2, 31, 10, '#f3dcb2')
    g.rect(3, 13, 28, 15, BK.woodL)
    g.rect(3, 13, 28, 1, BK.wood)
    for (let i = 0; i < 4; i++) {
      const x = 6 + i * 6
      g.ellipse(x + 2, 8, 3, 2, '#c9a04c')
      g.ellipse(x + 2, 7, 2.2, 1.2, GOLD.l)
      g.px(x + 1, 7, '#ffffff')
    }
    g.rect(8, 16, 18, 6, '#fffaf0')
    g.hline(10, 23, 18, BK.redD)
    g.hline(10, 20, 20, P.ink2)
  })
}

/** Principal Buddha on a tall tiered pedestal before a flame-edged arch. */
export function principalAltar(key: string, o: { style?: 'sukhothai' | 'lanna' | 'antique'; s?: number; arch?: Color; archD?: Color; lacquer?: Ramp5; W?: number; H?: number } = {}): Building {
  const W = o.W ?? 120
  const H = o.H ?? 160
  const s = o.s ?? 0.62
  return bbuild(`int:altar:${key}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const RED5: Ramp5 = o.lacquer ?? ['#e8605a', '#c23a3f', '#9e2a33', '#7e2436', '#5a1826']
    // Arch backdrop with a border of gold flames.
    const archTop = 6
    const base = H - 50
    const aw = Math.round(W * 0.36)
    for (let y = archTop; y < base; y++) {
      const t = (y - archTop) / Math.max(1, base - archTop)
      const hw = t < 0.35 ? aw * Math.sqrt(Math.max(0, 1 - ((0.35 - t) / 0.35) ** 2)) : aw
      g.hline(Math.round(cx - hw), Math.round(cx + hw) - 1, y, o.arch ?? '#3a4e8a')
      if (hw > 3) {
        g.px(Math.round(cx - hw), y, GOLD.b)
        g.px(Math.round(cx + hw) - 1, y, GOLD.d)
        if (y % 3 === 0) {
          g.px(Math.round(cx - hw) - 1, y, GOLD.l)
          g.px(Math.round(cx + hw), y - 1, GOLD.b)
        }
      }
    }
    for (let y = archTop + 10; y < base; y += 5)
      for (let x = cx - aw + 4; x < cx + aw - 3; x += 6) g.px(x + ((y / 5) % 2) * 3, y, o.archD ?? '#5a6aa8')
    // Halo.
    for (let a = 0; a < 26; a++) {
      const ang = Math.PI + (a / 25) * Math.PI
      g.px(Math.round(cx + Math.cos(ang) * 26), Math.round(base - 34 + Math.sin(ang) * 34), GOLD.l)
    }
    // Tiered pedestal.
    let y = base
    const tiers: [number, number, Ramp5, Color?][] = [
      [30, 8, GOLD5, GOLD.D],
      [38, 10, RED5],
      [46, 10, GOLD5, BK.redD],
      [54, 12, RED5],
      [58, 10, GOLD5, GOLD.D],
    ]
    for (const [half, h, r, band] of tiers) {
      squareTier(g, cx, y, h, half, r, band)
      if (r === RED5) for (let x = Math.round(cx - half) + 3; x < cx + half - 2; x += 5) {
        g.px(x, y + 3, GOLD.b)
        g.px(x, y + h - 4, '#62d0a0')
      }
      else for (let x = Math.round(cx - half) + 2; x < cx + half - 1; x += 3) g.px(x, y + 1, GOLD.D)
      y += h
    }
    for (let i = 0; i < 4; i++) litRow(g, cx, base - i, 24 - i * 0.6, GOLD5, { bias: i === 2 ? 1 : 0 })
    for (let x = cx - 22; x <= cx + 22; x += 3) g.px(x, base - 2, GOLD.D)
    const b = buddhaSculpt(o.style ?? 'sukhothai', s)
    g.draw(b.canvas, cx - b.ox, base - 3 - b.oy)
    hooks.glints = [
      { x: cx - 8, y: base - 40 },
      { x: cx, y: base - 3 - Math.round(90 * s) },
      { x: cx - 50, y: H - 14 },
      { x: cx + 40, y: H - 26 },
    ]
  })
}

export function arunAltar(): Building {
  return principalAltar('arun', { arch: '#3a4e8a', archD: '#5a6aa8', s: 0.6 })
}

/** A tall standing floor candelabrum. */
export function floorCandle(): Prop {
  return bprop('int:floorcandle', 10, 34, 5, 33, (g) => {
    g.rect(2, 30, 6, 3, GOLD.D)
    g.vline(4, 8, 30, GOLD.d)
    g.vline(5, 8, 30, GOLD.D)
    g.rect(1, 7, 8, 2, GOLD.b)
    g.rect(3, 1, 4, 6, '#fff4d6')
    g.vline(3, 1, 6, '#ffffff')
  })
}
