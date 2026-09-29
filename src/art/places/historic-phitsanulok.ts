// วัดพระศรีรัตนมหาธาตุ (วัดใหญ่) พิษณุโลก – Phra Phuttha Chinnarat in its
// flame-edged arch (ซุ้มเรือนแก้ว) with naga-makara ends, the white central
// prang with its gilded top, cloister galleries of seated golden images,
// the famous mother-of-pearl doors, Nan-river raft houses, the "flying
// morning glory" (ผักบุ้งลอยฟ้า) cook and the kluay tak (sun-dried banana) stall.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { GOLD, WHITE, ROOF } from '../temple'
import { buddhaSculpt, GOLD_RAMP } from '../hall'
import { build, drawSculpt, hsh, paintTower, spr, stallBuilder, type Building, type Seg } from './historic'
import type { DoorPainter } from './historic-halls'

// ---------------------------------------------------------------------------
// Mother-of-pearl door (บานประตูประดับมุก): black lacquer with iridescent inlay.

export const pearlDoor: DoorPainter = (g, x, y, w, h, night) => {
  g.rect(x - 1, y - 1, w + 2, h + 1, GOLD.d)
  g.rect(x - 1, y - 1, w + 2, 1, GOLD.l)
  if (night) {
    g.rect(x, y, w, h, '#ffcf7a')
    g.rect(x + 1, y + 1, w - 2, h - 1, '#ffe7a8')
    return
  }
  g.rect(x, y, w, h, '#1a1216')
  const pearl = ['#f4f0ff', '#d8f0ff', '#ffe0f4', '#e0ffe8']
  for (let j = 1; j < h - 1; j++)
    for (let i = 1; i < w - 1; i++) {
      const v = hsh(x + i, y + j, 5)
      const cxl = (i % Math.ceil(w / 2)) - w / 4
      const ring = Math.abs(Math.hypot(cxl, ((j + 2) % 7) - 3) - 2.4) < 0.7
      if (ring || v % 9 === 0) g.px(x + i, y + j, pearl[v % pearl.length])
    }
  g.vline(x + Math.floor(w / 2), y, y + h - 1, GOLD.D)
}

// ---------------------------------------------------------------------------
// Phra Phuttha Chinnarat and its arch.

/** Flame-edged arch (ซุ้มเรือนแก้ว) whose ends curl into naga-makara heads. */
export function drawChinnaratArch(g: Surface, cx: number, seatY: number, s: number) {
  const R = 44 * s
  const top = seatY - 92 * s
  const baseY = seatY + 2
  // Arch profile: straight sides rising then a pointed round top.
  const pts: [number, number][] = []
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const a = Math.PI * (1 - t)
    pts.push([cx + Math.cos(a) * R, top + 28 * s - Math.sin(a) * 28 * s - Math.pow(Math.sin(a), 8) * 10 * s])
  }
  const path = [[cx - R, baseY] as [number, number], ...pts, [cx + R, baseY] as [number, number]]
  // Dark red-black inner field with gold stars.
  g.poly(path, '#2a0e14')
  const inner = path.map(([x, y]) => [cx + (x - cx) * 0.86, y + (y < baseY - 1 ? 4 * s : 0)] as [number, number])
  g.poly(inner, '#521418')
  for (let i = 0; i < 40; i++) {
    const v = hsh(i, 3, 17)
    const x = cx - R * 0.7 + (v % Math.round(R * 1.4))
    const y = top + 20 * s + ((v >> 4) % Math.round(80 * s))
    g.px(x, y, i % 3 ? GOLD.d : GOLD.b)
  }
  // Frame: two gold bands (the naga bodies) with a flame fringe outside.
  for (let k = 0; k < path.length - 1; k++) {
    const [ax, ay] = path[k]
    const [bx, by] = path[k + 1]
    g.thickLine(ax, ay, bx, by, 4 * s, GOLD.D)
    g.thickLine(ax, ay, bx, by, 3 * s, GOLD.b)
    g.line(ax, ay - 1, bx, by - 1, GOLD.L)
  }
  // Flames (ลายเปลว) licking outward all along the arch.
  for (let k = 1; k < pts.length - 1; k += 2) {
    const [x, y] = pts[k]
    const nx = x - cx
    const ny = y - (top + 50 * s)
    const l = Math.hypot(nx, ny) || 1
    const fx = x + (nx / l) * 6 * s
    const fy = y + (ny / l) * 6 * s
    g.thickLine(x, y, fx, fy - 2 * s, 2 * s, GOLD.b)
    g.px(fx, fy - 2 * s, GOLD.L)
  }
  for (const side of [-1, 1]) {
    // Flame tongues along the vertical sides.
    for (let y = baseY - 6 * s; y > top + 30 * s; y -= 5 * s) {
      g.thickLine(cx + side * R, y, cx + side * (R + 5 * s), y - 3 * s, 1.6 * s, GOLD.b)
      g.px(cx + side * (R + 5 * s), y - 3 * s, GOLD.L)
    }
    // Naga-makara head at the foot, mouth open, facing outward.
    const hx = cx + side * (R + 2 * s)
    const hy = baseY - 6 * s
    g.ellipse(hx + side * 3 * s, hy, 6 * s, 5 * s, GOLD.D)
    g.ellipse(hx + side * 3 * s, hy - 1, 5 * s, 4 * s, GOLD.b)
    g.ellipse(hx + side * 2 * s, hy - 2.5 * s, 2.4 * s, 1.6 * s, GOLD.L)
    g.px(hx + side * 5 * s, hy - 2 * s, '#3a1a0e')
    g.thickLine(hx + side * 6 * s, hy + 1 * s, hx + side * 10 * s, hy - 3 * s, 1.6 * s, GOLD.d)
    for (let i = 0; i < 3; i++) g.px(hx + side * (1 + i * 2) * s, hy - 5 * s - i, GOLD.l)
  }
}

/** Phra Phuttha Chinnarat on his lacquer-and-gold throne inside the arch. Hooks: glints, candles. */
export function chinnaratSprite(): Building {
  const s = 0.92
  const W = 132
  const H = 168
  return build('chinnarat', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const gy = H - 1
    // Throne tiers: black lacquer with gold and glass mosaic.
    const tiers: [number, number][] = [
      [9, 60],
      [8, 56],
      [7, 52],
      [7, 48],
    ]
    let y = gy
    for (const [h, hw] of tiers) {
      y -= h
      g.rect(cx - hw, y, hw * 2, h, '#1e1216')
      g.rect(cx - hw, y, hw * 2, 2, GOLD.b)
      g.hline(cx - hw, cx + hw - 1, y, GOLD.L)
      for (let x = cx - hw + 3; x < cx + hw - 3; x += 5) {
        g.px(x, y + 4, GOLD.b)
        g.px(x, y + 5, (x >> 2) % 2 ? '#8fb6ff' : '#ff8a7a')
      }
      g.hline(cx - hw, cx + hw - 1, y + h - 1, GOLD.D)
    }
    for (let x = cx - 36; x < cx + 36; x += 5) {
      g.ellipse(x + 2, y - 1, 3, 3, GOLD.b)
      g.px(x + 1, y - 3, GOLD.L)
    }
    const seatY = y - 2
    drawChinnaratArch(g, cx, seatY, s)
    drawSculpt(g, buddhaSculpt('sukhothai', s), cx, seatY)
    hooks.glints = [
      { x: cx, y: seatY - Math.round(92 * s) },
      { x: cx - 30, y: seatY - Math.round(70 * s) },
      { x: cx + 30, y: seatY - Math.round(70 * s) },
      { x: cx + 12, y: seatY - Math.round(36 * s) },
    ]
    hooks.candles = [
      { x: cx - 50, y: gy - 30 },
      { x: cx + 50, y: gy - 30 },
    ]
    hooks.halo = [{ x: cx, y: seatY - Math.round(55 * s) }]
  })
}

/** Small seated golden image (galleries, side altars). */
export function smallBuddhaSprite(s = 0.26, tint: 'gold' | 'dark' = 'gold'): Prop {
  return spr(`smallbud:${s}:${tint}`, Math.round(80 * s) + 10, Math.round(100 * s) + 8, (Math.round(80 * s) + 10) >> 1, Math.round(100 * s) + 7, (g) => {
    const b = buddhaSculpt(tint === 'gold' ? 'sukhothai' : 'antique', s)
    const cx = (Math.round(80 * s) + 10) >> 1
    const gy = Math.round(100 * s) + 7
    g.rect(cx - Math.round(30 * s) - 2, gy - 4, Math.round(60 * s) + 4, 4, '#1e1216')
    g.hline(cx - Math.round(30 * s) - 2, cx + Math.round(30 * s) + 1, gy - 4, GOLD.b)
    drawSculpt(g, b, cx, gy - 4)
  }, false)
}

/** The white central prang with its gilded upper tiers. Hooks: glints, top. */
export function whitePrangSprite(): Building {
  const w = 70
  const h = 176
  const W = w + 16
  const H = h + 10
  return build('wprang', W, H, W >> 1, H - 1, (g, hooks) => {
    const gy = H - 1
    const white = (x: number, y: number, light: number) => {
      const k = light + (hsh(x, y, 2) % 23 === 0 ? -0.1 : 0)
      return k > 0.62 ? '#ffffff' : k > 0.46 ? '#f4eee4' : k > 0.3 ? '#dcd2c2' : '#b8aa98'
    }
    const gold = (x: number, y: number, light: number) => {
      const k = light + ((x + y) % 5 === 0 ? 0.1 : 0)
      return k > 0.62 ? GOLD.L : k > 0.46 ? GOLD.b : k > 0.3 ? GOLD.d : GOLD.D
    }
    const bodyHalf = w * 0.29
    const nT = 7
    const cobH = Math.round(h * 0.58)
    const tierH = Math.floor(cobH / nT)
    const prof = (T: number) => bodyHalf * 0.95 * (1 - 0.82 * Math.pow(T, 1.2)) * (1 + 0.12 * Math.sin(Math.PI * T))
    const segs: Seg[] = [
      { h: Math.round(h * 0.05), half: () => w / 2, ledge: true },
      { h: Math.round(h * 0.05), half: () => w / 2 - w * 0.08, ledge: true },
      { h: Math.round(h * 0.045), half: () => w / 2 - w * 0.15, ledge: true },
      { h: Math.round(h * 0.19), half: () => bodyHalf, ledge: true, paint: (_x, _y, u, t) => (Math.abs(u) < 0.2 && t < 0.7 ? (t > 0.62 ? GOLD.d : '#3a2024') : null) },
    ]
    for (let k = 0; k < nT; k++) segs.push({ h: tierH, half: (t) => prof((k + t) / nT), round: true, ledge: true, paint: k >= 3 ? (x, y, _u, _t) => gold(x, y, 0.5 + ((x * 3) % 7) / 20) : undefined })
    segs.push({ h: 14, half: (t) => Math.max(0.6, 2.4 * (1 - t)), round: true, paint: (x, y) => gold(x, y, 0.7) })
    const tw = paintTower(g, W / 2, gy, segs, (x, y, l) => white(x, y, l), { ledgeLight: '#ffffff', ledgeShade: '#e4d8c6' })
    // Gold antefix petals at each cob tier.
    for (let k = 4; k < 4 + nT; k++) {
      const y = tw.tops[k]
      const r = tw.rows.get(y)
      if (!r) continue
      for (const px of [r[0] - 1, r[1]]) {
        g.px(px, y - 1, GOLD.b)
        g.px(px, y - 2, GOLD.l)
      }
    }
    // Trident finial (นภศูล).
    const ty = tw.tops[tw.tops.length - 1]
    const tx = Math.round(tw.cx(ty))
    g.vline(tx, ty - 8, ty, GOLD.b)
    g.hline(tx - 2, tx + 2, ty - 5, GOLD.b)
    g.px(tx - 2, ty - 6, GOLD.L)
    g.px(tx + 2, ty - 6, GOLD.L)
    g.px(tx, ty - 9, GOLD.L)
    hooks.glints = [
      { x: tx, y: ty - 9 },
      { x: tx - 6, y: tw.tops[8] },
      { x: tx + 8, y: tw.tops[6] },
    ]
    hooks.top = [{ x: tx, y: ty - 8 }]
  })
}

/** Cloister gallery (ระเบียงคด) segment: tiled roof over a row of golden images. */
export function gallerySprite(len: number, seed = 0): Prop {
  return spr(`gallery:${len}:${seed}`, len, 46, 0, 45, (g) => {
    const b = buddhaSculpt('sukhothai', 0.24)
    // Back wall.
    g.rect(0, 12, len, 30, '#f2e8d8')
    g.rect(0, 12, len, 4, '#dccab0')
    // Roof.
    for (let y = 0; y < 12; y++) {
      const c = y % 3 === 0 ? ROOF.red.fieldD : y < 3 ? ROOF.red.fieldL : ROOF.red.field
      g.hline(0, len - 1, y, c)
    }
    g.hline(0, len - 1, 11, ROOF.red.border)
    g.hline(0, len - 1, 12, ROOF.red.borderD)
    for (let x = 6; x < len - 4; x += 22) {
      // Seated golden image on a black-and-gold base.
      g.rect(x - 1, 36, 20, 4, '#1e1216')
      g.hline(x - 1, x + 18, 36, GOLD.b)
      drawSculpt(g, b, x + 9, 36)
    }
    // Pillars at the front.
    for (let x = 0; x < len; x += 22) {
      g.rect(x, 12, 3, 32, WHITE.b)
      g.vline(x + 2, 12, 43, WHITE.D)
      g.rect(x - 1, 12, 5, 1, GOLD.b)
    }
    g.rect(0, 42, len, 4, WHITE.d)
    g.hline(0, len - 1, 42, WHITE.L)
    void seed
  })
}

// ---------------------------------------------------------------------------
// Riverside life.

/** Nan-river raft house (เรือนแพ) floating on bamboo. */
export function raftHouseSprite(v = 0): Prop {
  const wall: Color = ['#c28e5c', '#9fc2a0', '#e8c890'][v % 3]
  return spr(`raft:${v}`, 58, 40, 29, 39, (g) => {
    // Bamboo raft.
    g.rect(2, 32, 54, 5, '#c8b060')
    for (let x = 2; x < 56; x += 3) g.vline(x, 32, 36, '#a08a40')
    g.hline(2, 55, 32, '#e8d890')
    // House.
    g.rect(6, 16, 40, 16, wall)
    g.rect(6, 16, 40, 2, mixHex(wall, '#ffffff', 0.3))
    for (let x = 8; x < 46; x += 4) g.vline(x, 18, 31, mixHex(wall, '#3a2838', 0.2))
    g.rect(12, 20, 8, 7, '#3a3040')
    g.rect(13, 21, 6, 5, '#9fd0ff')
    g.rect(26, 21, 8, 11, '#6e4a35')
    // Tin roof.
    g.poly(
      [
        [2, 17],
        [26, 4],
        [50, 17],
      ],
      '#8c8187',
    )
    for (let x = 6; x < 48; x += 3) g.px(x, 15, '#bdb2ae')
    g.line(2, 17, 26, 4, '#bdb2ae')
    // Deck with a flower pot and a hanging lamp.
    g.rect(46, 26, 8, 6, '#9a6a45')
    g.rect(48, 22, 3, 4, '#e8514a')
    g.px(49, 21, '#5ea653')
    g.px(40, 18, '#ffe07a')
  })
}

/** Riverside restaurant cook tossing phak bung (the pan). */
export function wokStandSprite(): Prop {
  return spr('wokstand', 24, 20, 12, 19, (g) => {
    g.rect(2, 8, 20, 11, '#8c8187')
    g.hline(2, 21, 8, '#bdb2ae')
    g.rect(4, 11, 16, 5, '#3a3040')
    for (let x = 5; x < 19; x += 2) g.px(x, 13, '#ff7a3a')
    g.ellipse(12, 7, 7, 2, '#3a3040')
    g.ellipse(12, 6, 6, 1.4, '#5a5068')
    g.line(18, 6, 23, 3, '#6e4a35')
  })
}

/** Kluay tak (sun-dried banana) stall with drying racks. */
export function kluayTakStallSprite(): Prop {
  return stallBuilder('kluaytak', {
    w: 50,
    kind: 'awning',
    roof: ['#ffd23f', '#6cc36a'],
    body: '#c28e5c',
    sign: '#e8a53a',
    goods: (g, x0, y0, w) => {
      // Racks of flattened bananas drying (golden-brown).
      g.rect(x0 + 3, y0 - 12, w - 6, 1, '#6e4a35')
      for (let i = 0; i < 6; i++) {
        const x = x0 + 5 + i * 7
        g.rect(x, y0 - 11, 5, 3, i % 2 ? '#c0782c' : '#d89040')
        g.px(x + 1, y0 - 11, '#f0b060')
      }
      // Bags and honey jars on the counter.
      for (let i = 0; i < 4; i++) {
        const x = x0 + 4 + i * 11
        g.rect(x, y0 - 5, 8, 5, '#fff4d6')
        g.rect(x + 1, y0 - 4, 6, 3, '#c0782c')
        g.rect(x, y0 - 6, 8, 1, i % 2 ? '#e8514a' : '#3d63b5')
      }
      g.rect(x0 + w - 7, y0 - 7, 4, 7, '#e8a53a')
      g.rect(x0 + w - 7, y0 - 8, 4, 1, '#fff4d6')
    },
  })
}

/** Big incense-and-lotus offering table in front of the viharn. */
export function lotusTableSprite(): Prop {
  return spr('lotustable', 44, 18, 22, 17, (g) => {
    g.rect(0, 8, 44, 3, P.redD)
    g.hline(0, 43, 8, GOLD.b)
    g.rect(2, 11, 2, 7, P.redDD)
    g.rect(40, 11, 2, 7, P.redDD)
    for (let i = 0; i < 9; i++) {
      const x = 3 + i * 4.5
      g.vline(Math.round(x) + 1, 3, 8, '#5ea653')
      g.rect(Math.round(x), 0 + (i % 2), 3, 4, i % 3 ? '#ff9fc0' : '#fffaf0')
    }
  })
}

export { GOLD_RAMP }
