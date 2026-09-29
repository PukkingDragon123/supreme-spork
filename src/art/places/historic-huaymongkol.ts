// วัดห้วยมงคล (Hua Hin) – the giant seated Luang Pu Thuat on his hill,
// huge elephant statues you walk under for luck, rows of donated little
// elephants, a golden Luang Pu Thuat for the hall, a dried-squid cart with
// a roller press and an elephant-figurine stall.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { GOLD, WHITE, ROOF } from '../temple'
import { canopy, LEAVES } from '../garden'
import { C, E, ELE_GREY, ELE_WHITE, GOLD9, M, MONK_SKIN, SAFFRON, build, drawSculpt, hsh, sculptCached, spr, stallBuilder, type Building, type Prim } from './historic'

// ---------------------------------------------------------------------------
// Luang Pu Thuat (หลวงปู่ทวด), seated in meditation. Material 0 = robe, 1 = skin.

function thuatPrims(): Prim[] {
  const robe = 0
  const skin = 1
  return [
    ...M(robe, E(0, 7.4, 0, 31, 7.6, 11, 1, 0), E(-28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0), E(28.5, 6.2, 3, 10, 6.6, 9.5, 1, 0), C([28, 5.5, 6], [-8, 7, 8], 4.6, 4.2, 1, 0), C([-29, 7.6, 9], [12, 10.8, 13], 4.8, 3.8, 9, 0)),
    ...M(skin, E(18.6, 11.8, 13.6, 6.4, 2.6, 3, 10)),
    ...M(robe, E(0, 17, 1.5, 11.6, 7.4, 8.6, 2), C([0, 18, 0.5], [0, 33, 0.5], 10.2, 14.6, 2, undefined, 0.64), E(0, 35.5, 1, 16.6, 11.5, 8.4, 2), C([15.4, 40.6, 0], [0, 43.2, 0], 5.2, 5, 2, undefined, 0.9)),
    ...M(skin, C([-15.4, 40.6, 0], [0, 43.2, 0], 5, 5, 12, undefined, 0.9), C([0, 43, 0.5], [0, 49.5, 1.5], 4.6, 4.2, 12)),
    // Bald, round, kindly old head with long ears.
    ...M(skin, E(0, 58.6, 2, 9.6, 10.4, 9.4, 3), E(0, 52.6, 3.8, 6.8, 5, 6.6, 3), C([-9.1, 60.5, 0.5], [-9.7, 52.5, 1.6], 1.15, 1.7, 8), C([9.1, 60.5, 0.5], [9.7, 52.5, 1.6], 1.15, 1.7, 8)),
    // Right arm bare, both hands resting in the lap (meditation).
    ...M(skin, C([-17.4, 41.4, 0], [-23.6, 27, 1.5], 5.1, 4.1, 4), C([-23.6, 27, 1.5], [-7, 15.6, 10.5], 4, 3.2, 4), E(-2.4, 14.6, 11.6, 7.4, 2.7, 3.2, 6)),
    ...M(robe, C([17.4, 41.4, 0], [23.8, 27, 1.5], 5.6, 4.6, 5), C([23.8, 27, 1.5], [9, 15.4, 10.5], 4.4, 3.4, 5)),
    ...M(skin, E(4.2, 15.6, 12.4, 6.6, 2.5, 3, 7)),
  ]
}

function thuatDetail(d: import('../hall').SculptDetail) {
  const fine = d.s >= 0.8
  // Bare right chest: skin above the robe edge on the viewer's left.
  const robe = (x: number) => 30.5 + ((x + 14) / 19.5) * 15 - 0.02 * (x + 4) * (x + 4)
  d.each((i, j, lx, ly, part) => {
    if (part === 2 && lx < 5 && ly > robe(lx)) d.paint(i, j, 1)
  })
  d.curve(-14, 5.2, robe, -2)
  d.curve(-13.5, 4.8, (x) => robe(x) - 1 / d.s, 1)
  // Folded sash (สังฆาฏิ) over the left shoulder.
  d.each((i, j, lx, ly, part) => {
    if (part === 2 && lx > 4.6 && lx < 10.4 && ly > 18 && ly < 46) d.add(i, j, 1)
  })
  d.line(4.6, 46, 4.6, 18, -2)
  d.line(10.4, 45, 10.4, 18, -1)
  d.line(4.6, 18, 7.5, 16.5, -2)
  d.line(7.5, 16.5, 10.4, 18, -2)
  if (fine) for (let y = 22; y < 44; y += 4) d.line(5, y, 10, y - 0.6, -1)
  // Robe folds across the lap.
  d.curve(-24, 22, (x) => 8.6 + 0.004 * x * x, -1)
  if (fine) d.curve(-20, 20, (x) => 5.2 + 0.005 * x * x, -1)
  // Face: gentle downcast eyes, soft old brows, a kindly smile, forehead lines.
  const Y = -1.4
  d.curve(-7, -1.2, (x) => 63.4 + Y + 1.3 * (1 - ((Math.abs(x) - 4) / 3) ** 2), -3)
  d.curve(1.2, 7, (x) => 63.4 + Y + 1.3 * (1 - ((Math.abs(x) - 4) / 3) ** 2), -3)
  d.curve(-6.2, -2, (x) => 60.4 + Y - 0.12 * (x + 4.1) * (x + 4.1), -4)
  d.curve(2, 6.2, (x) => 60.4 + Y - 0.12 * (x - 4.1) * (x - 4.1), -4)
  d.line(0.6, 61.5 + Y, 0.9, 57.4 + Y, -2)
  d.line(-0.5, 61 + Y, -0.5, 58 + Y, 1)
  const [ni, nj] = d.px(1.8, 56.8 + Y)
  d.add(ni, nj, -3)
  const [mi, mj] = d.px(-1.2, 56.8 + Y)
  d.add(mi, mj, -2)
  d.curve(-3.2, 3.2, (x) => 54.4 + Y + 0.14 * x * x, -3)
  d.line(-3.8, 55.6 + Y, -3.2, 54.9 + Y, -2)
  d.line(3.2, 54.9 + Y, 3.8, 55.6 + Y, -2)
  d.curve(-2, 2, (x) => 53.4 + Y + 0.1 * x * x, 1)
  if (fine) {
    d.curve(-4.5, 4.5, (x) => 66.6 + Y + 0.03 * x * x, -2)
    d.curve(-3.5, 3.5, (x) => 68.2 + Y + 0.03 * x * x, -1)
    d.line(-7, 57.4, -5.8, 55.2, -2)
    d.line(7, 57.4, 5.8, 55.2, -2)
    // Crown highlight on the bald head.
    d.curve(-4, 1, (x) => 66.8 + 0.12 * (x + 1.5) * (x + 1.5) - 0.2, 1)
  }
  // Fingers of the stacked hands.
  d.line(-6, 14.8, 7, 15.8, -1)
}

export function luangPuThuat(s: number, gold = false) {
  return sculptCached(`thuat:${s}:${gold ? 1 : 0}`, {
    prims: thuatPrims(),
    s,
    x0: -38,
    x1: 38,
    y0: -1,
    y1: 72,
    ramps: gold ? [GOLD9, GOLD9] : [SAFFRON, MONK_SKIN],
    rim: 0.32,
    spec: gold ? [14, 0.55] : [10, 0.22],
    gloss: gold ? [1, 1] : [0.6, 0.9],
    detail: thuatDetail,
  })
}

/** The giant statue on its tall stone pedestal. Anchor = front of the pedestal. Hooks: glints, head. */
export function thuatMonumentSprite(): Building {
  const W = 180
  const H = 214
  return build('thuatmon', W, H, 90, H - 1, (g, hooks) => {
    const cx = 90
    const gy = H - 1
    const s = 1.88
    const st = luangPuThuat(s)
    // Pedestal: three tiers of grey stone with lotus mouldings and gold lines.
    const tiers: [number, number, Color][] = [
      [14, 86, '#bdb2ae'],
      [12, 80, '#cfc6c0'],
      [10, 74, '#bdb2ae'],
      [8, 70, '#e4ddd6'],
    ]
    let y = gy
    for (const [h, half, c] of tiers) {
      y -= h
      g.rect(cx - half, y, half * 2, h, c)
      g.rect(cx - half, y, half * 2, 1, '#f4f0ea')
      g.rect(cx + half - Math.round(half * 0.3), y + 1, Math.round(half * 0.3), h - 1, mixHex(c, '#625867', 0.25))
      g.rect(cx - half, y + h - 1, half * 2, 1, '#8c8187')
      for (let x = cx - half + 2; x < cx + half - 2; x += 4) {
        g.px(x, y + 2, GOLD.d)
        g.px(x + 1, y + 3, GOLD.b)
      }
    }
    // Upturned lotus petals under the seat.
    for (let x = cx - 66; x < cx + 66; x += 6) {
      g.ellipse(x + 3, y - 1, 3, 3, x < cx + 30 ? '#f4d0d8' : '#e0b0bc')
      g.px(x + 2, y - 3, '#ffffff')
    }
    const seat = y - 2
    // The statue.
    drawSculpt(g, st, cx, seat)
    // Garlands hung on the hands.
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI
      const x = cx + 2 + Math.cos(a) * 8
      const yy = seat - 28 + Math.sin(a) * 6
      g.px(x, yy, i % 2 ? '#fffaf0' : '#ffd23f')
    }
    hooks.glints = [
      { x: cx - 8, y: seat - Math.round(66 * s) },
      { x: cx + 12, y: seat - Math.round(34 * s) },
      { x: cx - 20, y: seat - Math.round(10 * s) },
    ]
    hooks.head = [{ x: cx, y: seat - Math.round(60 * s) }]
  })
}

/** Golden Luang Pu Thuat on a lacquer throne for the hall. Hooks: candles. */
export function goldThuatSprite(): Building {
  const W = 80
  const H = 84
  return build('goldthuat', W, H, 40, H - 1, (g, hooks) => {
    const cx = 40
    const gy = H - 1
    const s = 0.7
    const st = luangPuThuat(s, true)
    // Red-and-gold lacquer throne.
    const tiers: [number, number][] = [
      [8, 34],
      [7, 30],
      [5, 27],
    ]
    let y = gy
    for (const [h, half] of tiers) {
      y -= h
      g.rect(cx - half, y, half * 2, h, P.redD)
      g.rect(cx - half, y, half * 2, 1, GOLD.l)
      g.rect(cx - half, y + h - 1, half * 2, 1, GOLD.D)
      for (let x = cx - half + 2; x < cx + half - 2; x += 3) g.px(x, y + (h >> 1), GOLD.b)
    }
    for (let x = cx - 26; x < cx + 26; x += 5) {
      g.ellipse(x + 2, y - 1, 2.5, 2.5, GOLD.b)
      g.px(x + 1, y - 2, GOLD.L)
    }
    // Halo ring behind the head.
    const hy = y - Math.round(58 * s)
    g.circle(cx, hy, 11, mixHex(GOLD.d, '#7e2436', 0.5))
    g.circle(cx, hy, 9.5, mixHex(GOLD.b, '#b8343f', 0.4))
    drawSculpt(g, st, cx, y - 1)
    hooks.candles = [
      { x: cx - 24, y: y - 2 },
      { x: cx + 24, y: y - 2 },
    ]
    hooks.head = [{ x: cx, y: hy }]
  })
}

// ---------------------------------------------------------------------------
// Elephant statues.

/**
 * Huge standing elephant statue you can walk under (side view, facing right).
 * Anchor = ground between the near legs. The walkable gap is dx −13…+13.
 */
export function bigElephantStatue(v = 0): Building {
  const W = 104
  const H = 76
  return build(`bigele:${v}`, W, H, 52, H - 1, (g, hooks) => {
    const R = v % 2 ? ELE_WHITE : ELE_GREY
    const cx = 52
    const gy = H - 1
    const B = R[5]
    const D = R[3]
    const DD = R[2]
    const L = R[7]
    const leg = (x: number, c: Color, back = false) => {
      g.rect(x, 38, 11, gy - 38 - (back ? 3 : 0), c)
      g.rect(x - 1, gy - 5 - (back ? 3 : 0), 13, 5, c)
      g.rect(x, 38, 3, gy - 42, mixHex(c, '#ffffff', 0.18))
      for (let k = 0; k < 3; k++) g.rect(x + 1 + k * 4, gy - 2 - (back ? 3 : 0), 2, 2, '#f4ecdc')
    }
    // Far legs.
    leg(cx - 28, DD, true)
    leg(cx + 19, DD, true)
    // Tail.
    g.line(cx - 40, 26, cx - 43, 44, D)
    g.rect(cx - 44, 44, 3, 4, DD)
    // Body.
    g.ellipse(cx - 2, 28, 38, 19, D)
    g.ellipse(cx - 3, 26, 37, 18, B)
    g.ellipse(cx - 8, 18, 24, 9, mixHex(B, L, 0.5))
    g.ellipse(cx - 2, 42, 30, 3.5, DD)
    // Saddle cloth with gold trim and tassels.
    g.rect(cx - 24, 8, 36, 20, v % 2 ? '#e8514a' : '#3d63b5')
    g.hline(cx - 24, cx + 11, 8, GOLD.l)
    g.hline(cx - 24, cx + 11, 27, GOLD.b)
    for (let x = cx - 22; x < cx + 12; x += 4) {
      g.px(x, 28, GOLD.d)
      g.px(x, 29, GOLD.b)
    }
    for (let x = cx - 20; x < cx + 10; x += 6) {
      g.px(x, 16, GOLD.b)
      g.px(x + 1, 17, GOLD.l)
      g.px(x, 18, GOLD.b)
    }
    // Near legs.
    leg(cx - 24, B)
    leg(cx + 14, B)
    // Head.
    g.circle(cx + 34, 20, 14, D)
    g.circle(cx + 33, 19, 13.5, B)
    g.circle(cx + 32, 12, 8, mixHex(B, L, 0.55))
    g.px(cx + 30, 7, L)
    // Ear.
    g.ellipse(cx + 24, 24, 8, 12, D)
    g.ellipse(cx + 24, 23, 7, 11, mixHex(B, D, 0.35))
    // Trunk.
    const tr: [number, number, number][] = [
      [cx + 43, 24, 8],
      [cx + 46, 34, 7],
      [cx + 47, 44, 6],
      [cx + 47, 54, 5],
      [cx + 48, 62, 4],
      [cx + 51, 66, 3.4],
    ]
    for (let i = 0; i + 1 < tr.length; i++) g.thickLine(tr[i][0], tr[i][1], tr[i + 1][0], tr[i + 1][1], tr[i][2], B)
    for (let y = 30; y < 64; y += 4) g.px(cx + 49, y, D)
    // Tusks and eye.
    g.thickLine(cx + 40, 33, cx + 46, 40, 2, '#fbf3e4')
    g.px(cx + 47, 41, '#e8dcc8')
    g.rect(cx + 37, 17, 2, 2, P.ink)
    g.px(cx + 38, 15, P.ink)
    // Garland hung on the forehead.
    for (let i = 0; i < 7; i++) g.px(cx + 30 + i, 6 + Math.round(Math.sin((i / 6) * Math.PI) * 3), i % 2 ? '#ffd23f' : '#fffaf0')
    // Plinth edge line at the feet.
    g.hline(cx - 32, cx + 32, gy, mixHex(D, '#000000', 0.2))
    hooks.gap = [{ x: cx, y: gy }]
  })
}

/** Small donated elephant figurine (ตุ๊กตาช้าง) on a tiny base, side view. */
export function miniElephantSprite(v: number): Prop {
  const tone = v % 4
  return spr(`miniele2:${v}`, 18, 16, 9, 15, (g) => {
    const R = tone === 1 ? ELE_WHITE : tone === 2 ? GOLD9 : tone === 3 ? ELE_WHITE : ELE_GREY
    const B = R[5]
    const D = R[3]
    const L = R[7]
    const flip = v % 3 === 0
    const X = (x: number) => (flip ? 17 - x : x)
    const px = (x: number, y: number, c: Color) => g.px(X(x), y, c)
    const hl = (x0: number, x1: number, y: number, c: Color) => g.hline(X(x0), X(x1), y, c)
    // Base.
    g.rect(1, 13, 16, 3, '#bdb2ae')
    g.hline(1, 16, 13, '#e4ddd6')
    // Far legs, body, near legs.
    for (const x of [4, 10]) for (let y = 9; y < 13; y++) px(x, y, D)
    const bodyRows: [number, number, number][] = [
      [4, 4, 9],
      [5, 3, 11],
      [6, 2, 11],
      [7, 2, 11],
      [8, 2, 11],
      [9, 3, 10],
    ]
    for (const [y, a, b] of bodyRows) hl(a, b, y, y < 6 ? L : B)
    for (const x of [3, 9]) for (let y = 9; y < 13; y++) {
      px(x, y, B)
      px(x + 1, y, D)
    }
    px(1, 6, D)
    px(1, 7, D)
    // Head, ear and trunk.
    const headRows: [number, number, number][] = [
      [3, 11, 13],
      [4, 10, 14],
      [5, 10, 15],
      [6, 10, 15],
      [7, 11, 15],
      [8, 12, 15],
    ]
    for (const [y, a, b] of headRows) hl(a, b, y, y < 5 ? L : B)
    for (const [x, y] of [
      [10, 5],
      [10, 6],
      [11, 5],
      [11, 6],
      [11, 7],
      [10, 7],
    ])
      px(x, y, D)
    for (let y = 8; y < 12; y++) px(15, y, B)
    px(16, 11, B)
    px(14, 5, P.ink)
    px(14, 8, '#fbf3e4')
    if (v % 5 === 0) {
      hl(4, 9, 5, '#e8514a')
      hl(4, 9, 6, '#e8514a')
      hl(4, 9, 7, GOLD.b)
    }
    if (v % 7 === 2) {
      px(12, 2, '#ffd23f')
      px(13, 2, '#fffaf0')
      px(11, 2, '#fffaf0')
    }
  })
}

// ---------------------------------------------------------------------------
// Shops and street life.

/** Dried squid cart with a roller press (ปลาหมึกบด) and a charcoal grill. */
export function squidCartSprite(): Prop {
  return stallBuilder('squid', {
    w: 48,
    kind: 'cart',
    roof: ['#5a8de0', '#d4f1ff'],
    sign: '#3d63b5',
    body: '#e0bb8a',
    goods: (g, x0, y0, w) => {
      // Lines of dried squid hanging from the roof.
      for (const [ly, n] of [
        [y0 - 13, 6],
        [y0 - 7, 5],
      ] as [number, number][]) {
        g.hline(x0 + 4, x0 + w - 5, ly, '#8c8187')
        for (let i = 0; i < n; i++) {
          const x = x0 + 6 + i * 7 + (ly % 2)
          g.rect(x, ly + 1, 4, 4, '#f0c890')
          g.px(x + 1, ly + 1, '#fff0d0')
          g.rect(x, ly + 5, 1, 1, '#d8a870')
          g.rect(x + 2, ly + 5, 1, 1, '#d8a870')
          g.px(x + 3, ly + 5, '#d8a870')
        }
      }
      // The roller press with a big wheel.
      g.rect(x0 + w - 16, y0 - 5, 10, 5, '#8c8187')
      g.rect(x0 + w - 15, y0 - 4, 8, 2, '#bdb2ae')
      g.circle(x0 + w - 6, y0 - 6, 4, '#625867')
      g.circle(x0 + w - 6, y0 - 6, 2, '#bdb2ae')
      g.line(x0 + w - 6, y0 - 6, x0 + w - 3, y0 - 10, '#3a3040')
      // Grill with glowing coals.
      g.rect(x0 + 4, y0 - 3, 12, 3, '#3a3040')
      for (let x = x0 + 5; x < x0 + 15; x += 2) g.px(x, y0 - 2, '#ff7a3a')
      g.rect(x0 + 6, y0 - 5, 8, 2, '#f0c890')
    },
  })
}

/** Elephant figurines, garlands and sugar-cane for the elephants. */
export function figurineStallSprite(): Prop {
  return stallBuilder('elefig', {
    w: 50,
    kind: 'umbrella',
    roof: ['#f58f35', '#ffd23f'],
    body: '#9a6a45',
    goods: (g, x0, y0, w) => {
      // Rows of little elephants on the counter and a shelf.
      const cols: Color[][] = [[...ELE_GREY], [...ELE_WHITE], [...GOLD9]]
      for (let i = 0; i < 7; i++) {
        const R = cols[i % 3]
        const x = x0 + 3 + i * 6.5
        const y = y0 - 1
        g.rect(Math.round(x), y - 4, 5, 3, R[5])
        g.px(Math.round(x) + 5, y - 4, R[5])
        g.px(Math.round(x) + 5, y - 3, R[4])
        g.px(Math.round(x) + 1, y - 1, R[3])
        g.px(Math.round(x) + 4, y - 1, R[3])
        g.px(Math.round(x) + 4, y - 5, R[7])
      }
      // Garlands hanging.
      for (let i = 0; i < 4; i++) {
        const x = x0 + 8 + i * 11
        if (Math.abs(x - (x0 + w / 2)) < 3) continue
        g.vline(x, y0 - 16, y0 - 11, i % 2 ? '#fffaf0' : '#ffd23f')
        g.px(x, y0 - 10, '#e8514a')
      }
      // Sugar-cane bundle.
      for (let i = 0; i < 3; i++) g.vline(x0 + w - 4 - i, y0 - 12, y0, i % 2 ? '#c8d070' : '#a8b050')
    },
  })
}

/** Big tour coach (รถทัวร์) seen from the side, facing right. */
export function tourBusSprite(color: Color = '#e8514a'): Prop {
  return spr(`tourbus:${color}`, 72, 32, 36, 31, (g) => {
    const L = mixHex(color, '#ffffff', 0.35)
    const D = mixHex(color, '#3a2838', 0.35)
    g.rect(2, 4, 68, 22, color)
    g.rect(2, 4, 68, 2, L)
    g.rect(2, 24, 68, 2, D)
    // Windows.
    for (let x = 6; x < 60; x += 9) {
      g.rect(x, 8, 8, 8, '#3a3040')
      g.rect(x + 1, 9, 6, 6, '#9fd0ff')
      g.px(x + 1, 9, '#d4f1ff')
    }
    g.rect(62, 7, 7, 12, '#9fd0ff')
    g.rect(63, 8, 2, 10, '#d4f1ff')
    // Livery swoosh with little elephants.
    g.rect(4, 18, 56, 3, '#ffd23f')
    g.rect(4, 21, 56, 1, '#fffaf0')
    for (let x = 10; x < 56; x += 14) {
      g.rect(x, 12, 4, 2, '#fffaf0')
      g.px(x + 4, 13, '#fffaf0')
    }
    g.rect(64, 20, 5, 3, '#fff3a6')
    for (const x of [14, 56]) {
      g.circle(x, 27, 4.5, '#3a3040')
      g.circle(x, 27, 1.8, '#bdb2ae')
    }
  })
}

/** Wooden fish-feeding deck for the lotus pond. */
export function pondDeckSprite(): Prop {
  return spr('ponddeck', 40, 18, 20, 17, (g) => {
    const wood = { L: '#e0b88a', b: '#c29060', d: '#8a5e3c' }
    g.rect(1, 6, 38, 6, wood.b)
    for (let x = 1; x < 39; x += 5) g.vline(x, 6, 11, wood.d)
    g.hline(1, 38, 6, wood.L)
    for (const x of [3, 36]) g.rect(x, 12, 2, 6, wood.d)
    for (const x of [2, 37]) {
      g.rect(x, 0, 2, 7, wood.d)
      g.px(x, 0, wood.L)
    }
    g.hline(2, 38, 2, wood.b)
    // Bag of fish food.
    g.rect(28, 3, 5, 4, '#ffd23f')
    g.px(29, 4, '#e8514a')
  })
}

/** Distant Hua Hin hills (baked). */
export function huaHinHills(g: Surface, y: number, w: number, night: boolean) {
  const far = night ? '#5a6aa0' : '#a8bcd8'
  const mid = night ? '#4a5a8a' : '#8aa8c8'
  for (let x = -30; x < w + 40; x += 46) {
    g.poly(
      [
        [x - 40, y],
        [x + 4, y - 30 - ((x * 7) % 14)],
        [x + 52, y],
      ],
      far,
    )
  }
  for (let x = -10; x < w + 30; x += 34) {
    g.poly(
      [
        [x - 26, y],
        [x + 8, y - 16 - ((x * 5) % 9)],
        [x + 40, y],
      ],
      mid,
    )
  }
}

/** Grassy hill mound under the giant statue with boulders and a stone stair (baked). */
export function statueHill(g: Surface, cx: number, top: number, bottom: number, halfTop: number, halfBot: number, stairHalf: number, seed = 0) {
  const G = LEAVES.green
  const B = (bottom - top) * 1.18
  const yc = bottom + 6
  const A = halfBot
  const hwAt = (y: number) => A * Math.sqrt(Math.max(0, 1 - ((y - yc) / B) ** 2))
  void halfTop
  for (let y = top; y <= bottom; y++) {
    const hw = hwAt(y)
    const k = (y - top) / (bottom - top)
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / Math.max(1, hw)
      const lightV = 0.75 - (u + 1) * 0.28 - k * 0.12
      let c = lightV > 0.52 ? G.L : lightV > 0.3 ? '#86c95f' : lightV > 0.12 ? G.b : G.d
      const v = hsh(x, y, seed)
      if (v < 50) c = G.d
      else if (v > 970) c = G.L
      if (Math.abs(u) > 0.96 || y > bottom - 1) c = G.D
      else if (Math.abs(u) > 0.9) c = G.d
      g.px(x, y, c)
    }
  }
  // Grass tufts.
  for (let i = 0; i < 90; i++) {
    const v = hsh(i, seed, 13)
    const y = top + (v % (bottom - top))
    const hw = hwAt(y)
    const x = Math.round(cx - hw + ((v >> 4) % Math.max(1, Math.round(hw * 2))))
    g.px(x, y, G.D)
    g.px(x + 1, y - 1, G.d)
    g.px(x + 2, y, G.D)
  }
  // Boulders.
  for (let i = 0; i < 16; i++) {
    const v = hsh(i, seed, 3)
    const y = top + 30 + (v % (bottom - top - 40))
    const hw = hwAt(y)
    const side = i % 2 ? 1 : -1
    const x = cx + side * (stairHalf + 12 + ((v >> 3) % Math.max(1, Math.round(hw - stairHalf - 24))))
    const r = 3 + (v % 4)
    g.ellipse(x, y + 1, r + 1, r * 0.7 + 1, '#625867')
    g.ellipse(x, y, r, r * 0.7, '#a89c9a')
    g.ellipse(x - r * 0.3, y - r * 0.25, r * 0.5, r * 0.3, '#d2c8c4')
  }
  // Flowering bushes.
  for (let i = 0; i < 18; i++) {
    const v = hsh(i, seed, 9)
    const y = top + 24 + (v % (bottom - top - 30))
    const hw = hwAt(y)
    const side = i % 2 ? 1 : -1
    const x = cx + side * (stairHalf + 8 + ((v >> 4) % Math.max(1, Math.round(hw - stairHalf - 14))))
    canopy(g, [[x, y, 4 + (v % 3)]], LEAVES.deep, i)
    if (i % 3 === 0) {
      g.px(x - 1, y - 2, '#ff9fc0')
      g.px(x + 2, y - 1, '#ffd23f')
    }
  }
  // Stone stair with side walls.
  for (let y = top; y <= bottom; y++) {
    const step = (bottom - y) % 5
    for (let x = cx - stairHalf; x <= cx + stairHalf; x++) g.px(x, y, step === 0 ? WHITE.D : step === 1 ? '#f2eee9' : '#e4ddd6')
    g.rect(cx - stairHalf - 3, y, 2, 1, '#bdb2ae')
    g.rect(cx + stairHalf + 2, y, 2, 1, '#9c9290')
    g.px(cx - stairHalf - 1, y, '#8c8187')
    g.px(cx + stairHalf + 1, y, '#8c8187')
  }
}

export { ROOF, GOLD }
