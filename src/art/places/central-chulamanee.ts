// วัดจุฬามณี (อัมพวา สมุทรสงคราม): a peaceful canal-side temple among coconut
// and pomelo orchards. A dark teak sermon hall (ศาลาการเปรียญ) with carved
// gables, the tall blue ท้าวเวสสุวรรณ guardian, a canal with a wooden bridge
// and paddle boats, and the lifelike image of หลวงพ่อปาน inside the hall.

import type { Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, roofBand, bargeBoard, hangHong, gable, type Building, type Pt, type RoofRamp } from '../temple'
import type { Prop } from '../props'
import { GOLD_RAMP } from '../hall'
import { block, building, Cap, clamp01, dth, Ell, hash, prop, RAMPS, sculpted, stallProp, type Prim } from './central'

export const TEAK_ROOF: RoofRamp = { field: '#9a4a2a', fieldD: '#6e3018', fieldL: '#c86a3a', border: '#5a3018', borderD: '#3a1e10', under: '#2a1408' }
const TK = { L: '#c98748', b: '#95562c', d: '#6a3a1c', D: '#3c1f10' }

/** Teak sermon hall on stilts with carved gables. Anchor = bottom of the stairs. */
export function teakHallSprite(night = false): Building {
  const W = 176
  const H = 150
  return building(`chula-hall:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    const floor = 118
    // Roof: steep main gable with two lower wings.
    const A = 6
    const B = 70
    const HW = 54
    g.poly(
      [
        [cx, A],
        [cx + HW + 30, B + 20],
        [cx - HW - 30, B + 20],
      ],
      TEAK_ROOF.fieldD,
    )
    roofBand(g, cx, A, cx - HW, B, 12, TEAK_ROOF, 4)
    roofBand(g, cx, A, cx + HW, B, 12, TEAK_ROOF, 4)
    for (const s of [-1, 1]) {
      const ax = cx + s * (HW - 6)
      const ay = B - 4
      const bx = cx + s * (HW + 30)
      const by = B + 18
      roofBand(g, ax, ay, bx, by, 9, TEAK_ROOF, 4)
      bargeBoard(g, ax, ay, bx, by, 2)
      hangHong(g, bx + s, by + 1, s)
      glints.push({ x: bx + s * 3, y: by - 3 })
    }
    // Carved teak gable (หน้าบันไม้แกะสลัก): dark wood with gold-leaf scrolls.
    glints.push(...gable(g, cx, A, HW, B, { field: TK.b, fieldD: TK.D, sparkA: TK.L, sparkB: GOLD.d, motif: 'narai', thick: 3 }))
    // Sunburst rays carved below the gable (ลายพระอาทิตย์).
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      g.line(cx, B + 16, cx + Math.cos(a) * 20, B + 16 + Math.sin(a) * 12, i % 2 ? TK.L : GOLD.d)
    }
    // Walls: vertical teak boards with carved window panels.
    const wl = cx - HW - 26
    const wr = cx + HW + 26
    g.rect(wl, B + 19, wr - wl, floor - B - 19, TK.b)
    for (let x = wl; x < wr; x += 3) g.vline(x, B + 19, floor - 1, x % 2 ? TK.d : mixHex(TK.b, TK.d, 0.5))
    g.rect(wl, B + 19, wr - wl, 3, TK.D)
    for (const wx of [cx - 30, cx + 30, cx - 60, cx + 60]) {
      g.rect(wx - 6, floor - 30, 12, 20, TK.D)
      g.rect(wx - 5, floor - 29, 10, 18, night ? '#ffcf7a' : '#4a2a18')
      if (!night) for (let yy = floor - 28; yy < floor - 11; yy += 3) for (let xx = wx - 4; xx < wx + 5; xx += 3) g.px(xx + ((yy / 3) % 2), yy, TK.L)
      g.rect(wx - 7, floor - 32, 14, 2, GOLD.d)
    }
    // Open double door with the glow inside.
    g.rect(cx - 11, floor - 34, 22, 34, TK.D)
    g.rect(cx - 9, floor - 32, 18, 32, night ? '#ffd88a' : '#3a2010')
    g.ellipse(cx, floor - 16, 4, 5, night ? '#fff0c0' : '#b8742a')
    g.rect(cx - 14, floor - 36, 28, 3, GOLD.d)
    hooks.door = [{ x: cx, y: floor }]
    // Veranda posts.
    for (const x of [wl + 2, cx - 44, cx - 16, cx + 14, cx + 42, wr - 5]) {
      g.rect(x, B + 20, 3, floor - B - 20, TK.d)
      g.px(x, B + 20, TK.L)
    }
    // Raised floor on stilts with a railing.
    g.rect(wl - 4, floor, wr - wl + 8, 4, TK.L)
    g.rect(wl - 4, floor + 4, wr - wl + 8, 2, TK.D)
    for (let x = wl - 2; x < wr + 4; x += 10) g.rect(x, floor + 6, 3, 14, TK.D)
    g.rect(wl - 4, floor + 18, wr - wl + 8, 2, '#5a3a2a')
    for (let x = wl - 4; x < wr + 4; x += 4) if (Math.abs(x - cx) > 16) g.rect(x, floor - 6, 1, 6, TK.L)
    g.hline(wl - 4, wr + 3, floor - 6, TK.L)
    // Wooden stairs.
    for (let i = 0; i < 7; i++) {
      const y = floor + 4 + i * 4
      g.rect(cx - 14, y, 28, 3, TK.L)
      g.hline(cx - 14, cx + 13, y + 3, TK.D)
    }
    g.rect(cx - 16, floor, 2, H - floor, TK.D)
    g.rect(cx + 14, floor, 2, H - floor, TK.D)
    hooks.glints = glints
    hooks.bells = [
      { x: cx - HW - 31, y: B + 23 },
      { x: cx + HW + 31, y: B + 23 },
    ]
  })
}

/** ท้าวเวสสุวรรณ: tall blue guardian king with a club, in armour. Anchor = pedestal front. */
export function vessavanaSprite(): Prop {
  const W = 50
  const H = 96
  return prop('chula-vessavana', W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    const B = RAMPS.blue
    const sk = (x: number, y: number, v: number) => g.px(x, y, B[Math.round(clamp01(v + dth(x, y) * 0.15) * 8)])
    // Pedestal.
    block(g, cx, H - 14, 13, 22, RAMPS.white)
    for (let x = cx - 20; x < cx + 20; x += 3) g.px(x, H - 12, GOLD.d)
    g.rect(cx - 20, H - 7, 40, 2, '#b8343f')
    const base = H - 15
    // Legs in red-gold trousers and boots.
    for (const s of [-1, 1]) {
      g.rect(cx + s * 5 - 3, base - 20, 7, 20, '#b8343f')
      g.rect(cx + s * 5 - 3, base - 20, 2, 20, '#e8514a')
      g.rect(cx + s * 5 - 3, base - 4, 7, 4, GOLD.d)
    }
    // Armoured torso and belt.
    for (let y = base - 46; y < base - 20; y++) {
      const half = 10 + (y < base - 38 ? (base - 38 - y) * 0.35 : 0)
      for (let x = Math.round(cx - half); x < cx + half; x++) {
        const u = (x - cx) / half
        const gr = RAMPS.gold
        g.px(x, y, (x + y) % 4 === 0 ? gr[3] : gr[Math.round(clamp01(0.7 - u * 0.4) * 7)])
      }
    }
    g.rect(cx - 11, base - 24, 22, 4, '#3d63b5')
    g.rect(cx - 3, base - 25, 6, 6, GOLD.b)
    g.px(cx, base - 23, '#e8514a')
    // Arms: blue, one holding the club (กระบอง) planted in front.
    for (const s of [-1, 1]) for (let i = 0; i < 18; i++) sk(cx + s * (13 + i * 0.1), base - 44 + i, 0.6 - s * 0.2)
    for (const s of [-1, 1]) for (let i = 0; i < 18; i++) sk(cx + s * (12 + i * 0.1), base - 44 + i, 0.55 - s * 0.2)
    g.rect(cx - 2, base - 30, 4, 30, '#6e4a35')
    g.rect(cx - 3, base - 34, 6, 5, GOLD.d)
    g.rect(cx - 5, base - 28, 3, 3, B[5])
    g.rect(cx + 2, base - 28, 3, 3, B[4])
    // Head: fierce blue face, fangs, bulging eyes.
    const hy = base - 54
    for (let y = hy - 8; y < hy + 8; y++)
      for (let x = cx - 8; x < cx + 8; x++) {
        const dx = (x + 0.5 - cx) / 8
        const dy = (y + 0.5 - hy) / 8
        if (dx * dx + dy * dy <= 1) sk(x, y, 0.72 - dx * 0.35 - dy * 0.1)
      }
    g.rect(cx - 5, hy - 2, 4, 3, '#ffffff')
    g.rect(cx + 1, hy - 2, 4, 3, '#ffffff')
    g.px(cx - 3, hy - 1, P.ink)
    g.px(cx + 3, hy - 1, P.ink)
    g.hline(cx - 6, cx - 2, hy - 4, B[0])
    g.hline(cx + 2, cx + 6, hy - 4, B[0])
    g.rect(cx - 4, hy + 4, 8, 2, '#b8343f')
    g.px(cx - 3, hy + 3, '#ffffff')
    g.px(cx + 3, hy + 3, '#ffffff')
    // Tall tiered crown (ชฎา).
    for (let i = 0; i < 20; i++) {
      const half = 8 - i * 0.36
      const y = hy - 8 - i
      g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, i % 4 === 0 ? GOLD.D : i % 2 ? GOLD.b : GOLD.l)
      if (i % 4 === 2) g.px(cx, y, '#e8514a')
    }
    g.px(cx, hy - 29, GOLD.L)
    for (const s of [-1, 1]) {
      g.rect(cx + s * 9 - 1, hy - 3, 3, 5, GOLD.d)
      g.px(cx + s * 9, hy + 2, '#e8514a')
    }
    // Shoulder flames.
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.px(cx + s * (14 + i), base - 47 - i, i % 2 ? GOLD.b : GOLD.l)
  })
}

/** Open pavilion roof for the guardian (drawn in front, higher sort). */
export function guardianPavilionSprite(): Building {
  const W = 70
  const H = 112
  return building('chula-pavilion', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    for (const x of [3, W - 7]) {
      g.rect(x, 26, 4, H - 28, '#b8343f')
      g.rect(x, 26, 1, H - 28, '#e8514a')
      g.rect(x - 1, H - 5, 6, 4, GOLD.d)
      g.rect(x - 1, 26, 6, 2, GOLD.b)
    }
    g.rect(2, 22, W - 4, 4, '#7e2436')
    g.hline(2, W - 3, 22, GOLD.l)
    roofBand(g, cx, 2, 0, 24, 8, { field: '#3f9a6b', fieldD: '#2c7552', fieldL: '#6cc38e', border: '#f28a3c', borderD: '#cf6424', under: '#1e4a3a' }, 4)
    roofBand(g, cx, 2, W - 1, 24, 8, { field: '#3f9a6b', fieldD: '#2c7552', fieldL: '#6cc38e', border: '#f28a3c', borderD: '#cf6424', under: '#1e4a3a' }, 4)
    hooks.glints = gable(g, cx, 2, cx - 8, 24, { field: '#b8343f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'emblem', thick: 2 })
    hooks.bells = [
      { x: 1, y: 27 },
      { x: W - 2, y: 27 },
    ]
  })
}

/** Pomelo / fruit tree in the orchard (ส้มโอ). Anchor = trunk base. */
export function pomeloTreeSprite(v = 0): Prop {
  return prop('chula-pomelo' + v, 40, 42, 20, 41, (g) => {
    g.rect(18, 26, 4, 15, '#7a5a44')
    g.px(18, 26, '#9a7a60')
    const R = { L: '#8ed06a', b: '#4fa058', d: '#337a48', D: '#225a3a' }
    const blobs: [number, number, number][] = [
      [20, 16, 12],
      [11, 20, 8],
      [29, 20, 8],
      [20, 9, 8],
    ]
    for (const [x, y, s] of blobs) g.circle(x, y + 1, s, R.D)
    for (const [x, y, s] of blobs) g.circle(x, y, s, R.d)
    for (const [x, y, s] of blobs) g.circle(x - s * 0.2, y - s * 0.25, s * 0.78, R.b)
    for (const [x, y, s] of blobs) g.circle(x - s * 0.4, y - s * 0.45, s * 0.36, R.L)
    for (let i = 0; i < 7; i++) {
      const x = 8 + ((i * 7 + v * 3) % 24)
      const y = 12 + ((i * 5 + v) % 14)
      g.circle(x, y, 2, i % 2 ? '#d8e070' : '#c8d860')
      g.px(x - 1, y - 1, '#f4f8c0')
    }
  })
}

/** Coconut-sugar & local snack stall (น้ำตาลมะพร้าว ขนมไทย). */
export function sugarStallSprite(): Prop {
  return stallProp('chula-sugar', {
    w: 52,
    awning: ['#9a6a45', '#fff1d6'],
    counter: '#c28e5c',
    goods(g, x0, y, w) {
      // Coconut-sugar cakes stacked in cups (left).
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 3 - r; i++) {
          const sx = x0 + 4 + r * 2 + i * 4
          const sy = y - 2 - r * 3
          g.ellipse(sx, sy, 2, 1.4, '#b8742a')
          g.px(sx - 1, sy - 1, '#e0a860')
        }
      // A clay jar of liquid sugar.
      g.ellipse(x0 + 22, y - 1, 3.4, 3, '#8a4a2a')
      g.rect(x0 + 20, y - 5, 5, 2, '#6e3a1e')
      // Kanom (green leaf parcels, pink sweets) on trays (right).
      for (let i = 0; i < 4; i++) {
        g.rect(x0 + w - 18 + (i % 2) * 6, y - 3 - Math.floor(i / 2) * 3, 5, 2, i % 2 ? '#ff9fc0' : '#6cc36a')
        g.px(x0 + w - 17 + (i % 2) * 6, y - 3 - Math.floor(i / 2) * 3, '#ffffff')
      }
      for (let i = 0; i < 4; i++) {
        g.circle(x0 + 6 + i * 12, y + 6, 2.2, '#e8c070')
        g.px(x0 + 6 + i * 12, y + 5, '#fff0c0')
      }
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.circle(cx - 3, y + 2, 2, '#8a5a3a')
      g.rect(cx + 1, y + 1, 4, 3, '#b8742a')
    },
  })
}

/** Paddle boat with a vendor (ตลาดน้ำ) or a monk. */
export function drawCanalBoat(g: Surface, x: number, y: number, t: number, kind: 'vendor' | 'monk') {
  const bob = Math.round(Math.sin(t * 2 + x * 0.1) * 0.8)
  g.poly(
    [
      [x - 16, y - 3 + bob],
      [x + 16, y - 3 + bob],
      [x + 12, y + 3 + bob],
      [x - 12, y + 3 + bob],
    ],
    '#5a3a2a',
  )
  g.hline(x - 16, x + 16, y - 3 + bob, '#8a5a3a')
  g.hline(x - 11, x + 11, y + 4 + bob, '#3f6a7a')
  if (kind === 'vendor') {
    // Hat, fruit baskets.
    g.rect(x - 2, y - 11 + bob, 5, 8, '#5a8de0')
    g.rect(x - 2, y - 14 + bob, 5, 3, '#f0bd90')
    g.rect(x - 5, y - 16 + bob, 11, 2, '#e0c080')
    g.rect(x - 2, y - 17 + bob, 5, 1, '#c9a06a')
    for (const [dx, c] of [
      [-11, '#ffd23f'],
      [-7, '#f58f35'],
      [8, '#6cc36a'],
      [12, '#e8514a'],
    ] as const) g.circle(x + dx, y - 5 + bob, 2, c)
  } else {
    g.rect(x - 2, y - 11 + bob, 5, 8, '#ee9136')
    g.rect(x - 2, y - 14 + bob, 5, 3, '#cf9163')
    g.ellipse(x + 7, y - 5 + bob, 3, 2, '#3a3040')
  }
  g.line(x + 3, y - 9 + bob, x + 13, y + 3 + bob, '#6e4a35')
}

// ---------------------------------------------------------------------------
// Interior: หลวงพ่อปาน, a lifelike seated monk image in a glass case.

function monkPrims(): Prim[] {
  return [
    Ell(0, 6, 0, 24, 6, 10, 1, 1),
    Ell(-20, 5, 3, 8, 5, 8, 1, 1),
    Ell(20, 5, 3, 8, 5, 8, 1, 1),
    Cap([0, 10, 0.5], [0, 30, 0.5], 12, 13, 2, 1, 0.66),
    Ell(0, 31, 1, 14.4, 8, 7.4, 2, 1),
    // Bare right shoulder and arm (skin), hands in the lap.
    Cap([12, 30, 1], [16, 18, 4], 3.6, 3, 3, 0),
    Cap([16, 18, 4], [4, 11, 9], 3, 2.6, 3, 0),
    Cap([-12, 30, 1], [-16, 18, 4], 3.8, 3.2, 4, 1),
    Cap([-16, 18, 4], [-4, 11, 9], 3.2, 2.8, 4, 0),
    Ell(0, 10.6, 10, 6.6, 2.4, 2.6, 5, 0),
    Cap([0, 36, 0.5], [0, 41, 1], 3.6, 3.4, 6, 0),
    // Shaven head, ears.
    Ell(0, 47.6, 1.5, 7.2, 8.2, 7, 7, 0),
    Ell(-7, 47, 0.5, 1.4, 2.4, 1.4, 8, 0),
    Ell(7, 47, 0.5, 1.4, 2.4, 1.4, 8, 0),
  ]
}

export function luangPhoPan(s: number) {
  const q = Math.round(s * 40) / 40
  return sculpted(`chula-lpp:${q}`, () => ({
    prims: monkPrims(),
    s: q,
    x0: -30,
    x1: 30,
    y0: -1,
    y1: 58,
    ramps: [RAMPS.skinMonk, RAMPS.robe],
    rim: 0.2,
    ambient: 0.1,
    spec: [10, 0.25],
    outline: '#2a1408',
    detail(d) {
      d.curve(-4.6, -1.4, (x) => 47.2 - 0.12 * (x + 3) * (x + 3), -3)
      d.curve(1.4, 4.6, (x) => 47.2 - 0.12 * (x - 3) * (x - 3), -3)
      d.curve(-5, -1.2, (x) => 50.2 + 0.4 * (1 - ((x + 3.1) / 1.9) ** 2), -2)
      d.curve(1.2, 5, (x) => 50.2 + 0.4 * (1 - ((x - 3.1) / 1.9) ** 2), -2)
      d.line(0.6, 47, 0.6, 44.6, -1)
      d.line(-1.6, 42.6, 1.6, 42.6, -2)
      d.line(-12, 30, 8, 12, -2)
      d.line(-12, 29, 8, 11, 1)
    },
  }))
}

/** Glass display case (ตู้กระจก) outline drawn over a figure. */
export function drawGlassCase(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x - 3, y + h, w + 6, 8, '#6a3a1c')
  g.hline(x - 3, x + w + 2, y + h, '#c98748')
  for (let i = x; i < x + w + 3; i += 6) g.px(i, y + h + 4, GOLD.d)
  g.ctx.save()
  g.ctx.globalAlpha = 0.18
  g.rect(x, y, w, h, '#dff4ff')
  g.ctx.restore()
  g.frame(x - 1, y - 1, w + 2, h + 2, GOLD.d)
  g.line(x + 3, y + h - 4, x + 12, y + 3, '#ffffff')
  g.line(x + 6, y + h - 4, x + 15, y + 3, '#e8f8ff')
  g.rect(x - 3, y - 5, w + 6, 4, '#6a3a1c')
  g.hline(x - 3, x + w + 2, y - 5, '#c98748')
}

/** Carved teak panel with a gilded floral medallion (wall decoration). */
export function drawCarvedPanel(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, TK.d)
  g.frame(x, y, w, h, TK.D)
  g.frame(x + 2, y + 2, w - 4, h - 4, TK.L)
  const cx = x + w / 2
  const cy = y + h / 2
  for (let a = 0; a < 12; a++) {
    const ang = (a / 12) * Math.PI * 2
    g.px(cx + Math.cos(ang) * (w / 4), cy + Math.sin(ang) * (h / 4), a % 2 ? GOLD.d : TK.L)
  }
  g.circle(cx, cy, 2, GOLD.b)
  for (let i = 0; i < 8; i++) if (hash(x + i, y, seed) < 0.5) g.px(x + 4 + ((i * 5) % (w - 8)), y + 4 + ((i * 7) % (h - 8)), TK.L)
}

export { TK, GOLD_RAMP }
