// Bangkok group – ภูเขาทอง วัดสระเกศ (Golden Mount) and วัดไตรมิตรฯ with
// Yaowarat: the gold chedi on its hill with the spiral stairway, bells and a
// gong along the climb, the Bangkok panorama; the white marble mondop of the
// Golden Buddha, the Chinatown gate, shophouses with neon signs.

import { mix, type Color, type Surface } from '../../engine/pixel'
import { GOLD, WHITE, ROOF, crown, lacquerPanel, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { drawShophouse, seeded } from '../cinematic'
import { bbuild, bprop, BK, hsh } from './bangkok'
import { GOLD5, WHITE5, STONE5, litRow, bellDome, squareTier, ringStack, spire, mosaicColumn, type Ramp5 } from './bangkok-arch'

// ---------------------------------------------------------------------------
// Golden Mount

/** The golden bell chedi on its white square terrace, optionally wrapped in red cloth. */
export function goldenMountChedi(big = true): Building {
  const W = big ? 110 : 70
  const H = big ? 170 : 110
  const k = big ? 1 : 0.64
  const R = (v: number) => Math.max(1, Math.round(v * k))
  return bbuild(`gm:chedi:${big ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    // White terrace with small corner turrets.
    squareTier(g, cx, H - R(14), R(14), R(52), WHITE5, BK.redD)
    for (let x = R(6); x < W - R(6); x += 4) g.rect(x, H - R(18), 2, R(4), '#ffffff')
    for (const s of [-1, 1]) {
      const tx = cx + s * R(44)
      for (let i = 0; i < R(22); i++) litRow(g, tx, H - R(14) - i, R(4) * (1 - i / R(24)) + 0.6, i < R(8) ? WHITE5 : GOLD5)
      g.px(tx, H - R(14) - R(23), GOLD.L)
    }
    // Stepped gold base.
    let y = H - R(14)
    for (const [half, h] of [
      [34, 8],
      [29, 7],
      [25, 6],
    ]) {
      y -= R(h)
      squareTier(g, cx, y, R(h), R(half), GOLD5, GOLD.D)
    }
    // Lotus rings.
    for (let i = 0; i < R(6); i++) litRow(g, cx, y - 1 - i, R(24) - i * 0.5, GOLD5, { bias: i % 2 ? 0.8 : -0.4 })
    y -= R(6)
    const bellH = R(44)
    bellDome(g, cx, y, R(24), bellH, GOLD5, 2.2, true)
    // Red cloth band wrapped around the bell (the November fair).
    for (let i = R(8); i < R(15); i++) {
      const t = i / bellH
      const half = R(24) * Math.sqrt(1 - Math.pow(t, 2.2))
      for (let x = Math.round(cx - half); x < cx + half; x++) g.px(x, y - i, i === R(8) || (x + i) % 5 === 0 ? '#9e2a33' : x < cx - half * 0.3 ? '#ff6a5a' : '#e0443c')
    }
    y -= bellH
    for (let i = 0; i < R(6); i++) litRow(g, cx, y - i, R(8), GOLD5, { bias: i === 0 ? 1 : 0 })
    y -= R(6)
    y = ringStack(g, cx, y, big ? 9 : 7, R(6), R(1.6), GOLD5, big ? 3 : 2)
    const tip = spire(g, cx, y, R(20), R(1.6), GOLD5)
    hooks.glints = [tip, { x: cx - R(12), y: H - R(70) }, { x: cx - R(8), y: H - R(50) }]
  })
}

/** Long row of small bells on a red rail (for the climb). Hooks: bells. */
export function bellRail(n = 10): Building {
  const W = n * 7 + 8
  return bbuild(`gm:bellrail:${n}`, W, 28, W >> 1, 27, (g, hooks) => {
    g.rect(1, 6, W - 2, 3, BK.redD)
    g.hline(1, W - 2, 6, GOLD.l)
    for (let x = 2; x < W; x += Math.max(8, Math.floor(W / 3))) g.rect(x, 6, 3, 21, BK.redDD)
    g.rect(W - 4, 6, 3, 21, BK.redDD)
    g.rect(0, 24, W, 3, '#bdb5af')
    hooks.bells = Array.from({ length: n }, (_, i) => ({ x: 7 + i * 7, y: 9 }))
  })
}

/** Big bronze gong on a wooden frame. */
export function gongSprite(): Prop {
  return bprop('gm:gong', 30, 34, 15, 33, (g) => {
    g.rect(2, 4, 3, 29, BK.woodD)
    g.rect(25, 4, 3, 29, BK.woodD)
    g.rect(0, 2, 30, 3, BK.wood)
    g.hline(0, 29, 2, BK.woodL)
    g.vline(15, 5, 9, '#3a3040')
    g.circle(15, 18, 9, '#8c5c2e')
    g.circle(15, 18, 8, '#b98244')
    g.circle(15, 18, 3, '#e8c47a')
    g.circle(15, 18, 1.5, '#b98244')
    g.px(11, 13, '#ffe8a8')
  })
}

/** Stone vulture statue on a dead branch (a nod to Wat Saket's history, kept cute). */
export function vultureStatue(): Prop {
  return bprop('gm:vulture', 22, 34, 11, 33, (g) => {
    squareTier(g, 11, 28, 5, 8, STONE5)
    g.line(4, 27, 11, 14, '#8a7a70')
    g.line(11, 14, 18, 8, '#8a7a70')
    g.ellipse(12, 11, 4, 5, '#6a6474')
    g.ellipse(13, 12, 2.5, 3.5, '#8c8699')
    g.circle(10, 5, 2.4, '#e0a878')
    g.px(9, 4, '#3a2838')
    g.px(7, 5, '#c9a060')
    g.rect(9, 7, 4, 1, '#fffaf0')
  })
}

/** Paint a stone stairway strip along a polyline (baked). */
export function stairPath(g: Surface, pts: [number, number][], w: number) {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    const n = Math.ceil(len)
    for (let k = 0; k <= n; k++) {
      const t = k / n
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      g.ellipse(x, y + 1.5, w / 2 + 1, w / 2 - 1, '#9f9791')
    }
  }
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    for (let k = 0; k <= Math.ceil(len); k++) {
      const t = k / Math.ceil(len)
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      g.ellipse(x, y, w / 2, w / 2 - 2, k % 4 < 2 ? '#e8e0d6' : '#d6cbbd')
    }
  }
  // Red railing posts along the outer edge.
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const len = Math.hypot(bx - ax, by - ay)
    for (let d = 6; d < len; d += 10) {
      const t = d / len
      g.rect(Math.round(ax + (bx - ax) * t), Math.round(ay + (by - ay) * t + w / 2 - 3), 2, 4, BK.redD)
    }
  }
}

/** Bangkok panorama for the summit: old-town roofs, temple spires, towers (baked). */
export function bangkokPanorama(g: Surface, y0: number, y1: number, w: number, night: boolean) {
  const r = seeded(77)
  const far = night ? '#3a3f7a' : '#b8c8e0'
  const mid = night ? '#4a4f8a' : '#9eb2d0'
  // Skyscrapers far away.
  for (let x = 0; x < w; x += 8 + Math.floor(r() * 10)) {
    const h = 16 + Math.floor(r() * 40)
    const bw = 6 + Math.floor(r() * 8)
    g.rect(x, y0 + 30 - h, bw, h + 10, far)
    if (night) for (let yy = y0 + 32 - h; yy < y0 + 36; yy += 3) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (r() < 0.4) g.px(xx, yy, '#ffe7a8')
  }
  // Mid-ground: old town roofs, trees and temple spires.
  g.rect(0, y0 + 36, w, y1 - y0 - 36, mid)
  for (let x = 0; x < w; x += 12) {
    const rh = 4 + Math.floor(r() * 6)
    g.poly(
      [
        [x - 2, y0 + 40],
        [x + 6, y0 + 40 - rh],
        [x + 14, y0 + 40],
      ],
      night ? '#6a5a7a' : ['#e8905a', '#d9745a', '#c9c3cc'][x % 3],
    )
  }
  for (const [x, h] of [
    [w * 0.2, 26],
    [w * 0.55, 34],
    [w * 0.82, 22],
  ]) {
    for (let i = 0; i < h; i++) g.rect(Math.round(x - (1 - i / h) * 4), y0 + 40 - i, Math.max(1, Math.round((1 - i / h) * 8)), 1, night ? '#c9b070' : '#f0d890')
  }
  for (let x = 0; x < w; x += 7) g.circle(x, y0 + 44 + (x % 3), 4, night ? '#2e4a5a' : '#6fa870')
  g.rect(0, y0 + 46, w, y1 - y0 - 46, night ? '#2e4a5a' : '#5e9a66')
}

// ---------------------------------------------------------------------------
// Wat Traimit: the Phra Maha Mondop (white marble, gold top).

export function traimitMondop(night = false): Building {
  const W = 156
  const H = 250
  return bbuild(`tm:mondop:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const M5: Ramp5 = ['#ffffff', '#f7f5f2', '#e8e4de', '#d0c9c0', '#aaa298']
    const glints: Pt[] = []
    // Front staircase and the base.
    squareTier(g, cx, H - 16, 16, 76, M5, GOLD.d)
    for (let i = 0; i < 8; i++) {
      const y = H - 16 + i * 2
      g.rect(cx - 14 - i, y, 28 + i * 2, 2, i % 2 ? '#ebe6e0' : '#ffffff')
    }
    // Three storeys with gold balustrades and windows.
    let y = H - 16
    const floors: [number, number][] = [
      [68, 40],
      [58, 36],
      [48, 34],
    ]
    floors.forEach(([half, h], fi) => {
      y -= h
      squareTier(g, cx, y, h, half, M5)
      // Gold balustrade on top.
      for (let x = Math.round(cx - half) + 2; x < cx + half - 2; x += 3) g.rect(x, y - 3, 1, 3, GOLD.b)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y - 4, GOLD.l)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      // Windows / doors with gold crowns.
      const n = fi === 0 ? 5 : fi === 1 ? 4 : 3
      for (let i = 0; i < n; i++) {
        const x = Math.round(cx - half + ((i + 0.5) * half * 2) / n)
        const wh = Math.round(h * 0.5)
        crown(g, x, y + h - wh - 5, 10, 8)
        lacquerPanel(g, x - 3, y + h - wh - 4, 6, wh, night, 2)
      }
      // Pilasters.
      for (let x = Math.round(cx - half) + 2; x < cx + half; x += Math.round(half / 2.5)) g.rect(x, y + 2, 2, h - 3, M5[3])
    })
    // Gilded Thai mondop roof: stacked tiers and a tall spire.
    for (let i = 0; i < 6; i++) {
      const half = 44 - i * 6
      for (let k = 0; k < 7; k++) litRow(g, cx, y - 1 - k, half - k * 0.8, k < 2 ? GOLD5 : (['#ffb065', '#f28a3c', '#cf6424', '#a8501e', '#7a3a18'] as Ramp5))
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      for (const s of [-1, 1]) {
        g.px(Math.round(cx + s * half), y - 7, GOLD.l)
        g.px(Math.round(cx + s * (half + 1)), y - 8, GOLD.b)
      }
      // Small gold gable.
      g.poly(
        [
          [cx - 6, y - 1],
          [cx, y - 9],
          [cx + 6, y - 1],
        ],
        GOLD.b,
      )
      g.px(cx, y - 5, BK.redD)
      glints.push({ x: Math.round(cx - half), y: y - 7 })
      y -= 7
    }
    y = ringStack(g, cx, y, 8, 7, 1.8, GOLD5, 3)
    const tip = spire(g, cx, y, 22, 1.8, GOLD5)
    glints.push(tip)
    hooks.glints = glints
    hooks.windows = [{ x: cx, y: H - 40 }]
  })
}

/** The Chinatown gate (ซุ้มประตูเฉลิมพระเกียรติ) at Odeon Circle; opening x 34..66. */
export function chinaGate(): Building {
  const W = 104
  const H = 100
  return bbuild('tm:chinagate', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const red = '#d9443f'
    const redD = '#9e2a33'
    // Four pillars.
    for (const x of [8, 26, W - 32, W - 14]) {
      g.rect(x, 40, 6, H - 44, red)
      g.vline(x, 40, H - 5, '#ff7a6a')
      g.vline(x + 5, 40, H - 5, redD)
      g.rect(x - 2, H - 6, 10, 5, '#e2ddd6')
      g.rect(x - 1, 40, 8, 2, GOLD.b)
    }
    // Beams and the plaque.
    g.rect(4, 34, W - 8, 7, red)
    g.hline(4, W - 5, 34, GOLD.l)
    g.hline(4, W - 5, 40, redD)
    for (let x = 6; x < W - 6; x += 4) g.px(x, 37, (x >> 2) % 2 ? '#3fae6a' : '#5a8de0')
    g.rect(cx - 14, 26, 28, 12, GOLD.d)
    g.rect(cx - 12, 27, 24, 10, '#2f4fa8')
    for (let i = 0; i < 4; i++) {
      const x = cx - 10 + i * 6
      g.rect(x, 29, 3, 1, GOLD.l)
      g.vline(x + 1, 29, 34, GOLD.l)
      g.rect(x, 33, 3, 1, GOLD.l)
    }
    // Side roofs (lower) and the central roof (upper), green-glazed with gold ridges.
    const roofC = (x0: number, x1: number, y: number, h: number) => {
      for (let k = 0; k < h; k++) {
        const inset = Math.round(((h - k) / h) * 4)
        g.hline(x0 - 4 + inset, x1 + 3 - inset, y + k, k % 2 ? '#2c7552' : '#3f9a6b')
      }
      g.hline(x0 - 5, x1 + 4, y + h, GOLD.d)
      g.hline(x0 + 2, x1 - 2, y - 1, GOLD.b)
      for (const [x, d] of [
        [x0 - 5, -1],
        [x1 + 4, 1],
      ]) {
        g.px(x, y + h - 1, GOLD.b)
        g.px(x + d, y + h - 2, GOLD.l)
        g.px(x + d, y + h - 3, GOLD.b)
      }
    }
    roofC(4, 36, 26, 6)
    roofC(W - 37, W - 5, 26, 6)
    roofC(20, W - 21, 10, 8)
    // Dragon/pearl ridge ornament.
    g.circle(cx, 6, 2.5, '#e8514a')
    g.px(cx - 1, 5, '#ff9a8a')
    for (const s of [-1, 1]) {
      g.line(cx + s * 4, 8, cx + s * 18, 8, GOLD.b)
      g.px(cx + s * 19, 7, GOLD.l)
    }
    hooks.glints = [
      { x: cx, y: 5 },
      { x: 4, y: 31 },
      { x: W - 5, y: 31 },
    ]
    hooks.lanterns = [
      { x: 22, y: 42 },
      { x: W - 23, y: 42 },
    ]
  })
}

/** Row of Yaowarat shophouses with gold shops (baked). Returns sign anchor points. */
export function yaowaratRow(g: Surface, x0: number, x1: number, gy: number, seed: number, night: boolean): Pt[] {
  const r = seeded(seed)
  let x = x0
  let v = seed % 5
  const signs: Pt[] = []
  while (x < x1) {
    const uw = 26 + Math.floor(r() * 3) * 2
    drawShophouse(g, x, gy, uw, v++, r)
    // Gold shop fronts (ห้างทอง): red interior glowing with gold.
    if (v % 3 === 0) {
      g.rect(x + 3, gy - 21, uw - 6, 20, night ? '#ff8a5a' : '#b8343f')
      for (let yy = gy - 18; yy < gy - 3; yy += 4) for (let xx = x + 5; xx < x + uw - 5; xx += 3) g.px(xx, yy, GOLD.l)
      g.rect(x + 2, gy - 30, uw - 4, 6, '#b8343f')
      for (let xx = x + 4; xx < x + uw - 4; xx += 3) g.px(xx, gy - 27, GOLD.b)
    }
    signs.push({ x: x + uw - 4, y: gy - 60 })
    x += uw
  }
  return signs
}

const NEON: [Color, Color][] = [
  ['#ff4f7a', '#ffd0dc'],
  ['#ffd23f', '#fff6c0'],
  ['#4fd8ff', '#d8f8ff'],
  ['#6cf07a', '#d8ffd8'],
  ['#ff8a3a', '#ffe0c0'],
]

/** Vertical neon sign board jutting from a shophouse; `lit` glows at night. */
export function neonSign(v: number, lit: boolean): Prop {
  const [c, cl] = NEON[v % NEON.length]
  const h = 30 + (v % 3) * 8
  return bprop(`tm:neon:${v}:${lit ? 1 : 0}`, 12, h, 6, h - 1, (g) => {
    g.rect(1, 0, 10, h - 4, lit ? '#2a1830' : '#b8343f')
    g.frame(1, 0, 10, h - 4, lit ? c : GOLD.d)
    // Glyph-like strokes (Chinese/Thai lettering, not real words).
    for (let y = 3; y < h - 8; y += 7) {
      const col = lit ? cl : '#fff3a6'
      g.hline(3, 8, y, col)
      g.vline(5 + ((y >> 3) % 2), y, y + 4, col)
      g.px(3, y + 3, col)
      g.px(8, y + 2, col)
      g.hline(4, 7, y + 4, col)
    }
    g.rect(5, h - 4, 2, 4, '#6a6478')
  })
}

/** Glass case with the old stucco shell that hid the Golden Buddha for centuries. */
export function stuccoCase(): Prop {
  return bprop('tm:stucco', 30, 26, 15, 25, (g) => {
    g.rect(2, 16, 26, 9, BK.woodD)
    g.rect(3, 4, 24, 12, '#dff4ff')
    g.frame(3, 4, 24, 12, '#8c8699')
    for (const [x, y] of [
      [6, 10],
      [12, 8],
      [19, 11],
    ]) {
      g.rect(x, y, 5, 4, '#cfc6b8')
      g.px(x + 1, y + 1, GOLD.b)
    }
    g.line(5, 6, 9, 5, '#ffffff')
    g.rect(8, 18, 14, 4, '#fffaf0')
    g.hline(10, 19, 20, BK.redD)
  })
}

/** Plaque: "หลวงพ่อทองคำ ทองคำหนัก 5.5 ตัน". */
export function goldPlaque(): Prop {
  return bprop('tm:plaque', 24, 22, 12, 21, (g) => {
    g.rect(11, 12, 2, 9, '#8c8187')
    g.rect(1, 1, 22, 12, GOLD.d)
    g.rect(2, 2, 20, 10, '#3a2838')
    g.hline(4, 19, 4, GOLD.l)
    g.hline(4, 14, 7, GOLD.b)
    g.hline(4, 17, 9, GOLD.b)
  })
}

/** Potted bonsai (ไม้ดัด) in a blue-and-white Chinese pot. */
export function bonsaiPot(v = 0): Prop {
  return bprop(`tm:bonsai:${v}`, 22, 26, 11, 25, (g) => {
    g.rect(4, 18, 14, 7, '#f4f2f8')
    g.hline(4, 17, 18, '#ffffff')
    for (let x = 5; x < 17; x += 3) g.px(x, 21, '#3d63b5')
    g.hline(5, 16, 23, '#3d63b5')
    g.line(11, 18, 9 + (v % 2) * 3, 10, '#6e4a35')
    g.line(10, 13, 15, 9, '#6e4a35')
    for (const [x, y, rr] of [
      [7, 9, 4],
      [15, 7, 3.5],
      [11, 4, 3],
    ] as [number, number, number][]) {
      g.ellipse(x, y, rr, rr * 0.7, '#2f6f4b')
      g.ellipse(x - 0.5, y - 0.5, rr - 1, rr * 0.5, '#43905a')
    }
  })
}

export { mix, hsh, WHITE, ROOF, mosaicColumn }
