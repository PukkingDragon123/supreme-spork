// Bangkok group – วัดอรุณราชวราราม (Wat Arun, Temple of Dawn): the great
// porcelain-clad central prang, the four minor prangs, the mondops, the
// climbable terraces carried by demons and monkeys, the ubosot with its
// giant guardians, and the Chao Phraya pier with ferries and long-tails.

import { mix, type Color, type Surface } from '../../engine/pixel'
import { GOLD, WHITE, ROOF, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { bbuild, bprop, BK, hsh } from './bangkok'
import { PORCELAIN5, GOLD5, litRow, squareTier, prangTower, grandHall, ringStack, spire, type Ramp5 } from './bangkok-arch'

export const ARUN_FLOWERS: Color[] = ['#5a8de0', '#e8709e', '#3fae6a', '#ffd23f', '#e8514a', '#8fb6ff']
const FLOWERS = ARUN_FLOWERS

/** Porcelain flower mosaic over a flat face. */
function flowerField(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  for (let j = 1; j < h - 1; j += 4)
    for (let i = 1 + ((j >> 2) % 2) * 2; i < w - 1; i += 4) {
      const c = FLOWERS[Math.floor(hsh(x + i, y + j, seed) * FLOWERS.length)]
      const X = x + i
      const Y = y + j
      g.px(X, Y - 1, c)
      g.px(X - 1, Y, c)
      g.px(X + 1, Y, c)
      g.px(X, Y + 1, c)
      g.px(X, Y, GOLD.b)
    }
}

/** Row of crouching demons and monkeys holding up a tier (caryatids). */
export function caryatids(g: Surface, x0: number, x1: number, baseY: number, h: number) {
  let k = 0
  for (let x = x0 + 4; x < x1 - 4; x += 8, k++) {
    const demon = k % 2 === 0
    const c = demon ? (['#3fae6a', '#e0564a', '#5a8de0', '#fffaf0'] as Color[])[(k >> 1) % 4] : '#fffaf0'
    const cd = mix(c, '#3a2838', 0.3)
    g.rect(x - 2, baseY - 4, 5, 4, c)
    g.rect(x - 3, baseY - 2, 2, 2, cd)
    g.rect(x + 2, baseY - 2, 2, 2, cd)
    g.rect(x - 2, baseY - h + 5, 5, h - 9, c)
    g.px(x + 2, baseY - h + 6, cd)
    g.ellipse(x, baseY - h + 3, 2.4, 2.2, c)
    g.px(x - 1, baseY - h + 2, BK.ink)
    g.px(x + 1, baseY - h + 2, BK.ink)
    if (demon) g.px(x, baseY - h, GOLD.b)
    else g.px(x + 3, baseY - h + 7, c) // monkey tail
    g.line(x - 3, baseY - h + 6, x - 3, baseY - h, c)
    g.line(x + 3, baseY - h + 6, x + 3, baseY - h, cd)
  }
}

/**
 * A terrace of the prang base (baked into the ground): walkable top from
 * `top` to `front`, and a porcelain face `face` px tall carried by demons.
 */
export function arunTerrace(g: Surface, x0: number, x1: number, top: number, front: number, face: number, seed = 0) {
  const w = x1 - x0
  // Top surface: pale grey stone with porcelain edging.
  g.rect(x0, top, w, front - top, '#e6e0da')
  for (let y = top; y < front; y += 6) g.hline(x0, x1 - 1, y, '#d2cbc4')
  for (let x = x0; x < x1; x += 10) g.vline(x + ((top >> 2) % 2) * 5, top, front - 1, '#d2cbc4')
  g.hline(x0, x1 - 1, top, '#ffffff')
  // Face.
  g.rect(x0, front, w, face, '#f4f2f8')
  g.hline(x0, x1 - 1, front, '#ffffff')
  g.rect(x0, front + 1, w, 2, '#c8c2dc')
  flowerField(g, x0, front + 3, w, Math.max(2, Math.round(face * 0.3)), seed)
  const cy = front + Math.round(face * 0.3) + 3
  g.rect(x0, cy, w, face - (cy - front) - 2, '#e2dff0')
  caryatids(g, x0, x1, front + face - 2, face - (cy - front) - 2)
  g.rect(x0, front + face - 2, w, 2, '#a29ab8')
  g.vline(x0, front, front + face - 1, '#c8c2dc')
  g.vline(x1 - 1, front, front + face - 1, '#a29ab8')
  // Balustrade at the front edge of the top.
  for (let x = x0 + 2; x < x1 - 2; x += 5) {
    g.rect(x, front - 4, 2, 4, '#f4f2f8')
    g.px(x, front - 5, FLOWERS[(x >> 2) % FLOWERS.length])
  }
  g.hline(x0, x1 - 1, front - 5, '#ffffff')
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(58,40,56,0.16)'
  g.ctx.fillRect(x0 - g.ox, front + face - g.oy, w, 2)
  g.ctx.restore()
}

/** Steep stone stairs of the prang (narrow, with porcelain rails). */
export function arunStairs(g: Surface, cx: number, yTop: number, yBot: number, half: number) {
  const n = Math.max(2, Math.round((yBot - yTop) / 2))
  for (let i = 0; i < n; i++) {
    const y = Math.round(yTop + ((yBot - yTop) * i) / n)
    g.rect(cx - half, y, half * 2, 2, i % 2 ? '#e2ddd6' : '#f4f0ea')
    g.hline(cx - half, cx + half - 1, y, '#ffffff')
  }
  for (const s of [-1, 1]) {
    g.vline(cx + s * (half + 1) - (s > 0 ? 1 : 0), yTop - 3, yBot, '#c8c2dc')
    g.vline(cx + s * (half + 2) - (s > 0 ? 1 : 0), yTop - 3, yBot, '#f4f2f8')
    for (let y = yTop; y < yBot; y += 4) g.px(cx + s * (half + 2) - (s > 0 ? 1 : 0), y, FLOWERS[(y >> 2) % FLOWERS.length])
  }
}

// ---------------------------------------------------------------------------
// The central prang tower (above the upper terrace).

const ARUN5: Ramp5 = ['#ffffff', '#f2f0f6', '#dcd8ea', '#bdb6d2', '#948caa']

export function arunTower(): Building {
  const W = 120
  const H = 280
  return bbuild('arun:tower', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    // Redented pedestal tiers with caryatids.
    let y = H - 1
    for (const [half, h] of [
      [54, 14],
      [47, 13],
      [41, 12],
    ]) {
      y -= h
      squareTier(g, cx, y, h, half, ARUN5)
      flowerField(g, Math.round(cx - half) + 1, y + 1, half * 2 - 2, 4, half)
      caryatids(g, Math.round(cx - half) + 2, Math.round(cx + half) - 2, y + h - 1, h - 5)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y + h - 1, '#948caa')
    }
    // Corncob body with porcelain flowers.
    glints.push(...prangTower(g, cx, y, y - 6, 38, { body: ARUN5, porcelain: FLOWERS, ledge: '#948caa', leaf: '#ffffff', tiers: 9 }))
    // Niche with Indra riding the three-headed elephant Erawan.
    const ny = y - 2
    g.rect(cx - 9, ny - 20, 18, 20, '#4a3a6a')
    g.ellipse(cx, ny - 20, 9, 5, '#4a3a6a')
    g.rect(cx - 7, ny - 9, 14, 7, '#fffaf0')
    for (const dx of [-5, 0, 5]) {
      g.circle(cx + dx, ny - 11, 2.4, '#fffaf0')
      g.vline(cx + dx, ny - 10, ny - 6, '#e2dff0')
    }
    g.rect(cx - 2, ny - 18, 4, 6, '#3fae6a')
    g.px(cx, ny - 20, GOLD.b)
    g.px(cx, ny - 19, GOLD.l)
    g.rect(cx - 8, ny - 2, 16, 2, GOLD.d)
    hooks.glints = glints
    hooks.top = [glints[glints.length - 1]]
  })
}

/** Minor prang at a corner of the base, with the wind god on horseback. */
export function minorPrang(): Building {
  const W = 50
  const H = 160
  return bbuild('arun:minor', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    let y = H - 1
    for (const [half, h] of [
      [22, 10],
      [19, 9],
      [16, 8],
    ]) {
      y -= h
      squareTier(g, cx, y, h, half, ARUN5)
      flowerField(g, Math.round(cx - half) + 1, y + 1, half * 2 - 2, 3, half)
      caryatids(g, Math.round(cx - half) + 2, Math.round(cx + half) - 2, y + h - 1, h - 3)
    }
    // Niche: Phra Phai on a white horse.
    g.rect(cx - 5, y - 12, 10, 12, '#4a3a6a')
    g.ellipse(cx, y - 12, 5, 3, '#4a3a6a')
    g.rect(cx - 3, y - 6, 6, 3, '#fffaf0')
    g.px(cx + 3, y - 7, '#fffaf0')
    g.rect(cx - 1, y - 10, 2, 4, '#3fae6a')
    const gl = prangTower(g, cx, y - 1, y - 8, 15, { body: ARUN5, porcelain: FLOWERS, ledge: '#948caa', leaf: '#ffffff', tiers: 7 })
    hooks.glints = gl
  })
}

/** Small mondop on the first terrace (porcelain roof, a statue inside). */
export function arunMondop(): Building {
  const W = 34
  const H = 66
  return bbuild('arun:mondop', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    squareTier(g, cx, H - 6, 6, 15, ARUN5)
    g.rect(cx - 12, H - 26, 24, 20, '#f4f2f8')
    g.rect(cx - 6, H - 22, 12, 16, '#4a3a6a')
    g.ellipse(cx, H - 22, 6, 4, '#4a3a6a')
    g.rect(cx - 2, H - 16, 4, 10, GOLD.b)
    g.ellipse(cx, H - 17, 2, 2, GOLD.l)
    for (const x of [cx - 13, cx + 10]) {
      g.rect(x, H - 26, 3, 20, '#dcd8ea')
      flowerField(g, x, H - 26, 3, 20, x)
    }
    let y = H - 26
    for (let i = 0; i < 5; i++) {
      const half = 15 - i * 2.4
      for (let k = 0; k < 4; k++) litRow(g, cx, y - k, half - k * 0.4, k === 0 ? (['#fff6c0', GOLD.l, GOLD.b, GOLD.d, GOLD.D] as Ramp5) : PORCELAIN5)
      flowerField(g, Math.round(cx - half) + 1, y - 3, Math.round(half * 2) - 2, 3, i)
      y -= 4
    }
    y = ringStack(g, cx, y, 4, 3, 1.2, ARUN5, 2)
    const tip = spire(g, cx, y, 10, 1.2, GOLD5)
    hooks.glints = [tip]
  })
}

/** Wat Arun's ubosot: green-and-orange roof with porcelain gables. */
export function arunUbosot(night = false): Building {
  return grandHall({
    key: 'arun',
    hw: 44,
    roof: ROOF.green,
    roof2: ROOF.orange,
    field: '#f4f2f8',
    fieldD: '#c8c2dc',
    field2: '#3d63b5',
    field2D: '#26306e',
    wall: WHITE.d,
    cols: 'white',
    frieze: 'lotus',
    doors: 1,
    stairs: 'plain',
    night,
  })
}

/** Porcelain gate of the ubosot enclosure, the opening is x 14..34. */
export function arunGate(): Building {
  const W = 48
  const H = 74
  return bbuild('arun:gate', W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    for (const [a, b] of [
      [0, cx - 10],
      [cx + 10, W],
    ]) {
      for (let y = 30; y < H; y++) for (let x = a; x < b; x++) g.px(x, y, x - a < 2 ? '#ffffff' : b - x < 3 ? '#c8c2dc' : '#f4f2f8')
      flowerField(g, a + 1, 34, b - a - 2, H - 40, a)
      g.rect(a, H - 4, b - a, 4, '#e2dff0')
    }
    for (let x = cx - 10; x < cx + 10; x++) {
      const t = (x - (cx - 10)) / 19
      const ay = 34 + Math.round(Math.pow(Math.abs(t - 0.5) * 2, 2) * 5) - 2
      g.vline(x, 26, ay, '#f4f2f8')
      g.px(x, ay, GOLD.b)
    }
    let y = 28
    for (let i = 0; i < 5; i++) {
      const half = 22 - i * 3.5
      for (let k = 0; k < 5; k++) litRow(g, cx, y - k, half - k * 0.5, k < 1 ? GOLD5 : ARUN5)
      flowerField(g, Math.round(cx - half) + 1, y - 4, Math.round(half * 2) - 2, 4, i + 3)
      y -= 5
    }
    const tip = spire(g, cx, y, 6, 1.4, GOLD5)
    hooks.glints = [tip]
  })
}

// ---------------------------------------------------------------------------
// The river: pier and boats.

/** Floating pier (ท่าเรือ) with a roofed waiting pavilion. Anchor = bottom-left. */
export function pierSprite(w: number): Prop {
  const H = 46
  return bprop(`arun:pier:${w}`, w, H, 0, H - 1, (g) => {
    // Pontoon deck.
    g.rect(0, H - 12, w, 8, '#9a9aa8')
    g.hline(0, w - 1, H - 12, '#c9c9d4')
    g.rect(0, H - 4, w, 3, '#5a5068')
    for (let x = 6; x < w - 4; x += 14) {
      g.circle(x, H - 6, 2.5, '#3a3040')
      g.px(x, H - 6, '#6a6474')
    }
    // Railing.
    g.hline(0, w - 1, H - 17, '#e8514a')
    for (let x = 0; x < w; x += 6) g.vline(x, H - 17, H - 12, '#fffaf0')
    // Roof pavilion.
    for (const x of [8, w - 10]) g.rect(x, 12, 3, H - 24, BK.redD)
    for (let y = 2; y < 13; y++) {
      const e = 13 - y
      g.rect(2 + Math.round((13 - y) * 0.4), y, w - 4 - Math.round((13 - y) * 0.8), 1, e < 2 ? ROOF.orange.border : y % 3 === 1 ? ROOF.orange.fieldD : ROOF.orange.field)
    }
    g.hline(8, w - 9, 2, GOLD.b)
    // Sign board.
    g.rect(w / 2 - 14, 14, 28, 6, '#3d63b5')
    g.hline(w / 2 - 12, w / 2 + 11, 16, '#fffaf0')
    g.hline(w / 2 - 10, w / 2 + 6, 18, '#ffd23f')
  })
}

/** Cross-river ferry (เรือข้ามฟาก), bow to the right. */
export function ferrySprite(): Prop {
  return bprop('arun:ferry', 56, 24, 28, 22, (g) => {
    g.poly(
      [
        [2, 14],
        [50, 14],
        [55, 10],
        [52, 20],
        [6, 20],
      ],
      '#3d63b5',
    )
    g.hline(2, 50, 14, '#8fb6ff')
    g.rect(6, 18, 44, 2, '#26306e')
    g.hline(8, 48, 16, '#fffaf0')
    // Cabin with people.
    g.rect(10, 4, 34, 10, '#fffaf0')
    g.rect(10, 2, 34, 2, '#e8514a')
    for (let x = 13; x < 42; x += 6) {
      g.rect(x, 6, 4, 5, '#9fd0ff')
      g.circle(x + 2, 9, 1.4, ['#f0bd90', '#c9905e', '#e0a878'][(x >> 2) % 3])
      g.px(x + 2, 7, '#3b2f40')
    }
    g.rect(44, 6, 5, 8, '#e8e4ee')
    g.px(47, 7, '#9fd0ff')
  })
}

/** Old teak rice barge (เรือข้าว), slow and heavy. */
export function riceBarge(): Prop {
  return bprop('arun:barge', 60, 22, 30, 20, (g) => {
    g.poly(
      [
        [0, 10],
        [58, 10],
        [52, 20],
        [6, 20],
      ],
      '#6e4a35',
    )
    g.hline(0, 58, 10, '#9a6a45')
    g.hline(6, 52, 18, '#4a3128')
    // Curved rattan roof.
    for (let x = 8; x < 44; x++) {
      const h = Math.round(Math.sin(((x - 8) / 36) * Math.PI) * 3)
      g.vline(x, 3 - h + 3, 10, x % 3 ? '#c9965e' : '#a8784e')
    }
    g.rect(46, 4, 6, 6, '#8a5a3a')
    g.px(48, 6, '#ffd23f')
  })
}

/** Dinner-cruise boat lit with fairy lights (night). */
export function cruiseSprite(lit: boolean): Prop {
  return bprop(`arun:cruise:${lit ? 1 : 0}`, 70, 26, 35, 24, (g) => {
    g.poly(
      [
        [2, 16],
        [64, 16],
        [69, 12],
        [66, 22],
        [6, 22],
      ],
      '#fffaf0',
    )
    g.rect(6, 20, 60, 2, '#3d63b5')
    g.rect(8, 6, 52, 10, lit ? '#ffe7a8' : '#e8e4ee')
    for (let x = 10; x < 58; x += 5) g.rect(x, 8, 3, 5, lit ? '#fff6d6' : '#9fd0ff')
    g.rect(6, 4, 56, 2, '#e8514a')
    g.rect(12, 0, 44, 4, '#fffaf0')
    for (let x = 12; x < 56; x += 3) g.px(x, 0, lit ? ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff'][(x / 3) % 4] : '#c9c3d0')
  })
}
