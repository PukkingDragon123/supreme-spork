// Bangkok group – วัดพระเชตุพนฯ (Wat Pho) landmarks: the long viharn of the
// reclining Buddha, the four great ceramic chedis of the first four reigns,
// the little chedi rai, the cloister of gilded Buddhas, the Khao Mor rock
// garden and the massage school pavilion.

import { mix, type Color, type Surface } from '../../engine/pixel'
import { GOLD, WHITE, ROOF, crown, lacquerPanel, valance, type Building } from '../temple'
import type { Prop } from '../props'
import { buddhaSculpt } from '../hall'
import { bbuild, bprop, BK, hsh } from './bangkok'
import { WHITE5, STONE5, litRow, squareTier, ringStack, spire, type Ramp5 } from './bangkok-arch'

// ---------------------------------------------------------------------------
// พระวิหารพระพุทธไสยาส – the long viharn seen from its long side.

/** Long tiled roof tier (trapezoid) with gold barge ends and chofa. */
export function longTier(g: Surface, x0: number, x1: number, ridgeY: number, eaveY: number, inset: number, field: Color, fieldD: Color, border: Color, borderD: Color) {
  for (let y = ridgeY; y <= eaveY; y++) {
    const t = (y - ridgeY) / Math.max(1, eaveY - ridgeY)
    const a = Math.round(x0 + inset * (1 - t))
    const b = Math.round(x1 - inset * (1 - t))
    const e = eaveY - y
    let c = field
    if (e < 3) c = e === 0 ? borderD : border
    else if ((y - ridgeY) % 3 === 2) c = fieldD
    g.rect(a, y, b - a + 1, 1, c)
    if (e >= 3 && (y - ridgeY) % 3 === 1) for (let x = a + ((y >> 1) % 4); x < b; x += 4) g.px(x, y, mix(field, '#ffffff', 0.3))
    g.px(a, y, GOLD.b)
    g.px(b, y, GOLD.b)
    g.px(a + 1, y, GOLD.D)
    g.px(b - 1, y, GOLD.D)
  }
  g.hline(x0 + inset, x1 - inset, ridgeY, GOLD.b)
  g.hline(x0 + inset, x1 - inset, ridgeY - 1, GOLD.d)
  for (const [x, dir] of [
    [x0 + inset, -1],
    [x1 - inset, 1],
  ] as const) {
    for (let k = 0; k < 6; k++) g.px(x + (k > 3 ? dir : 0), ridgeY - 2 - k, k < 2 ? GOLD.D : GOLD.b)
    g.px(x + dir * 2, ridgeY - 7, GOLD.l)
  }
  // Gold eave tips.
  g.px(x0 - 1, eaveY + 1, GOLD.b)
  g.px(x0 - 2, eaveY, GOLD.l)
  g.px(x1 + 1, eaveY + 1, GOLD.b)
  g.px(x1 + 2, eaveY, GOLD.l)
}

export function recliningViharn(night = false): Building {
  const W = 250
  const H = 132
  return bbuild(`pho:viharn:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const floor = H - 14
    // Roofs: three stepped tiers (orange field, green border).
    longTier(g, 22, W - 23, 10, 34, 18, ROOF.orange.field, ROOF.orange.fieldD, ROOF.green.field, ROOF.green.fieldD)
    longTier(g, 10, W - 11, 32, 50, 10, ROOF.orange.field, ROOF.orange.fieldD, ROOF.green.field, ROOF.green.fieldD)
    longTier(g, 2, W - 3, 48, 62, 6, ROOF.green.field, ROOF.green.fieldD, ROOF.orange.field, ROOF.orange.fieldD)
    // Gable ends peeking out (small pediments at each end).
    for (const x of [24, W - 25]) {
      g.poly(
        [
          [x - 10, 34],
          [x, 14],
          [x + 10, 34],
        ],
        '#b8343f',
      )
      g.px(x, 22, GOLD.b)
      g.px(x - 1, 23, GOLD.d)
      g.px(x + 1, 23, GOLD.d)
    }
    // Walls behind the colonnade.
    g.rect(6, 62, W - 12, floor - 62, WHITE.d)
    g.rect(6, 62, W - 12, 4, WHITE.DD)
    // Doors and windows: black lacquer with gold (ลายรดน้ำ).
    const doors = [56, 136, 196]
    for (let x = 16; x < W - 12; x += 20) {
      const isDoor = doors.some((d) => Math.abs(d - x) < 12)
      if (isDoor) continue
      crown(g, x, 75, 9, 7)
      lacquerPanel(g, x - 3, 76, 6, 14, night, 2)
      g.rect(x - 3, 76, 6, 14, night ? '#ffe7a8' : '#241a2b')
      for (let j = 78; j < 89; j += 3) g.px(x, j, night ? '#fff6d6' : GOLD.d)
      g.rect(x - 4, 75, 8, 1, GOLD.d)
    }
    for (const x of doors) {
      crown(g, x, 70, 16, 12)
      g.rect(x - 7, 71, 14, floor - 71, GOLD.d)
      g.rect(x - 6, 72, 12, floor - 72, night ? '#ffcf7a' : '#241a2b')
      for (let j = 74; j < floor - 2; j += 3) for (let i = x - 5; i < x + 5; i += 3) g.px(i + ((j / 3) % 2), j, night ? '#fff6d6' : GOLD.d)
      g.vline(x, 72, floor - 1, night ? '#fff0c0' : GOLD.D)
    }
    hooks.door = doors.map((x) => ({ x, y: floor - 8 }))
    // Colonnade: white square pillars with gold capitals.
    for (let x = 6; x < W - 6; x += 20) {
      if (doors.some((d) => Math.abs(d - x - 2) < 9)) continue
      g.rect(x, 64, 5, floor - 64, WHITE.b)
      g.vline(x, 64, floor - 1, '#ffffff')
      g.vline(x + 4, 64, floor - 1, WHITE.D)
      g.rect(x - 1, 63, 7, 2, GOLD.b)
      g.rect(x - 1, floor - 3, 7, 3, GOLD.d)
    }
    valance(g, 8, W - 9, 64)
    // Platform with lotus mouldings.
    for (let y = floor; y < H; y++) litRow(g, W >> 1, y, (W >> 1) - 1 + (y > floor + 6 ? 1 : 0), WHITE5, { bias: y === floor ? -1 : 0 })
    g.rect(2, floor + 5, W - 4, 3, BK.redD)
    for (let x = 4; x < W - 4; x += 4) g.px(x, floor + 6, GOLD.b)
    hooks.glints = [
      { x: 22 + 18, y: 5 },
      { x: W - 23 - 18, y: 5 },
      { x: W >> 1, y: 9 },
      { x: 8, y: 48 },
      { x: W - 9, y: 48 },
    ]
    hooks.bells = [
      { x: 1, y: 64 },
      { x: W - 2, y: 64 },
      { x: 8, y: 52 },
      { x: W - 9, y: 52 },
    ]
  })
}

// ---------------------------------------------------------------------------
// พระมหาเจดีย์สี่รัชกาล – redented chedis clad in ceramic flowers.

export type ChediTone = 'green' | 'white' | 'yellow' | 'blue'

const TONES: Record<ChediTone, { r: Ramp5; flowers: Color[] }> = {
  green: { r: ['#b4f0c8', '#6cd092', '#3fae6a', '#2a8a52', '#1c6a3e'], flowers: ['#fffaf0', '#e8514a', '#ffd23f', '#5a8de0'] },
  white: { r: ['#ffffff', '#f6f4f0', '#e2ddd6', '#c9c1b8', '#a8a098'], flowers: ['#5a8de0', '#e8514a', '#3fae6a', '#ffd23f'] },
  yellow: { r: ['#fff6c0', '#ffe27a', '#f5c542', '#d99a2b', '#b0762a'], flowers: ['#e8514a', '#3fae6a', '#5a8de0', '#fffaf0'] },
  blue: { r: ['#c8dcff', '#8fb6ff', '#5a8de0', '#3d63b5', '#2a4488'], flowers: ['#fffaf0', '#ffd23f', '#e8514a', '#62d0a0'] },
}

function ceramicDots(g: Surface, cx: number, y: number, half: number, cols: Color[], k: number) {
  if (half < 3) return
  for (let x = Math.round(cx - half) + 2; x < cx + half - 2; x += 4) {
    const c = cols[(x + k) % cols.length]
    g.px(x + ((y >> 1) % 2) * 2, y, c)
  }
}

export function greatChedi(tone: ChediTone, big = true): Building {
  const T = TONES[tone]
  const W = big ? 54 : 34
  const H = big ? 176 : 110
  const s = big ? 1 : 0.62
  const R = (v: number) => Math.max(1, Math.round(v * s))
  return bbuild(`pho:chedi:${tone}:${big ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    // Base: white stepped tiers with a staircase shrine front.
    squareTier(g, cx, H - R(9), R(9), R(25), WHITE5, BK.redD)
    let y = H - R(9)
    // Redented tiers (ย่อมุมไม้สิบสอง) in the ceramic colour.
    const tiers = [R(21), R(18), R(15.5)]
    for (const half of tiers) {
      const h = R(8)
      y -= h
      squareTier(g, cx, y, h, half, T.r)
      for (let yy = y + 2; yy < y + h - 1; yy += 2) ceramicDots(g, cx, yy, half, T.flowers, yy)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y + h - 1, T.r[4])
    }
    // Niche with a small Buddha.
    g.rect(cx - R(3), y + 2, R(6), R(7), T.r[4])
    g.rect(cx - R(2), y + 3, R(4), R(6), GOLD.b)
    g.px(cx - 1, y + 3, GOLD.L)
    // Bell body: redented (drawn as a lit dome with vertical grooves).
    const bellH = R(50)
    const bellW = R(13)
    for (let i = 0; i < bellH; i++) {
      const t = i / bellH
      const half = bellW * (1 - Math.pow(t, 2.2) * 0.75) * (t < 0.12 ? 0.9 + t : 1)
      litRow(g, cx, y - 1 - i, half, T.r)
      if (half > 4) {
        g.px(Math.round(cx - half * 0.5), y - 1 - i, T.r[3])
        g.px(Math.round(cx + half * 0.5), y - 1 - i, T.r[4])
      }
      if (i % 3 === 1) ceramicDots(g, cx, y - 1 - i, half, T.flowers, i)
    }
    y -= bellH + 1
    // Neck and rings.
    for (let i = 0; i < R(4); i++) litRow(g, cx, y - i, R(5), T.r, { bias: i === 0 ? 1 : 0 })
    y -= R(4)
    y = ringStack(g, cx, y, big ? 9 : 7, R(5), R(1.6), T.r, big ? 3 : 2)
    // Spire.
    const tip = spire(g, cx, y, R(46), R(2), T.r)
    // A gold finial.
    g.px(tip.x, tip.y - 1, GOLD.L)
    g.px(tip.x, tip.y, GOLD.b)
    hooks.glints = [tip, { x: cx - R(8), y: H - R(60) }]
  })
}

/** Little chedi rai clad in ceramic tiles. */
export function smallChedi(v = 0): Building {
  const tones: ChediTone[] = ['white', 'green', 'yellow', 'blue']
  const T = TONES[tones[v % 4]]
  const W = 20
  const H = 58
  return bbuild(`pho:chedirai:${v}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    squareTier(g, cx, H - 6, 6, 9, WHITE5, BK.redD)
    squareTier(g, cx, H - 11, 5, 7.5, T.r)
    ceramicDots(g, cx, H - 9, 7.5, T.flowers, v)
    let y = H - 11
    for (let i = 0; i < 12; i++) {
      const t = i / 12
      litRow(g, cx, y - 1 - i, 5.5 * (1 - t * t * 0.6), T.r)
      if (i % 3 === 1) ceramicDots(g, cx, y - 1 - i, 5, T.flowers, i + v)
    }
    y -= 13
    y = ringStack(g, cx, y, 5, 2.6, 1, T.r, 2)
    const tip = spire(g, cx, y, 12, 1, T.r)
    hooks.glints = [tip]
  })
}

// ---------------------------------------------------------------------------
// พระระเบียง – cloister with rows of gilded Buddha images.

export function buddhaCloister(len: number): Prop {
  const H = 58
  return bprop(`pho:cloister:${len}`, len, H, 0, H - 1, (g) => {
    const floor = H - 6
    // Back wall.
    g.rect(0, 22, len, floor - 22, '#8a1e2c')
    for (let x = 2; x < len; x += 6) g.px(x, 26, GOLD.d)
    // Pedestal with gold Buddhas.
    g.rect(0, floor - 8, len, 8, WHITE.b)
    g.hline(0, len - 1, floor - 8, '#ffffff')
    g.rect(0, floor - 5, len, 2, BK.redD)
    const b = buddhaSculpt('sukhothai', 0.2)
    for (let x = 8; x < len - 6; x += 17) g.draw(b.canvas, x - b.ox, floor - 8 - b.oy)
    // Roof strip.
    for (let y = 2; y < 22; y++) {
      const e = 22 - y
      let c: Color = ROOF.orange.field
      if (e <= 2) c = e === 1 ? ROOF.green.fieldD : ROOF.green.field
      else if (y % 3 === 2) c = ROOF.orange.fieldD
      g.rect(0, y, len, 1, c)
    }
    g.hline(0, len - 1, 1, GOLD.b)
    g.hline(0, len - 1, 0, GOLD.d)
    // Front posts.
    for (let x = 0; x < len; x += 17) {
      g.rect(x, 21, 4, floor - 21, WHITE.b)
      g.vline(x + 3, 21, floor - 1, WHITE.D)
      g.rect(x - 1, 21, 6, 2, GOLD.b)
    }
    g.rect(0, floor, len, 6, WHITE.d)
    g.hline(0, len - 1, floor, '#ffffff')
    g.hline(0, len - 1, H - 1, WHITE.DD)
  })
}

// ---------------------------------------------------------------------------
// เขามอ – rock garden mountains with tiny figures, a pagoda and plants.

export function rockery(v = 0): Prop {
  const W = 56
  const H = 52
  return bprop(`pho:rockery:${v}`, W, H, W >> 1, H - 1, (g) => {
    const peaks: [number, number, number][] = v === 0 ? [[16, 14, 10], [30, 4, 13], [44, 16, 9]] : [[14, 10, 11], [28, 16, 9], [42, 6, 12]]
    // Base rocks.
    g.ellipse(W >> 1, H - 6, 26, 6, STONE5[3])
    g.ellipse(W >> 1, H - 7, 25, 5, STONE5[2])
    for (const [x, top, hw] of peaks) {
      g.poly(
        [
          [x - hw, H - 6],
          [x - hw * 0.4, top + 8],
          [x - 1, top],
          [x + 2, top + 3],
          [x + hw * 0.5, top + 12],
          [x + hw, H - 6],
        ],
        STONE5[2],
      )
      g.poly(
        [
          [x, top + 2],
          [x + 2, top + 3],
          [x + hw * 0.5, top + 12],
          [x + hw, H - 6],
          [x + 1, H - 6],
        ],
        STONE5[3],
      )
      g.line(x - hw * 0.4, top + 8, x - 1, top, STONE5[0])
      // Pits and moss.
      for (let k = 0; k < 6; k++) {
        const px = Math.round(x - hw * 0.6 + hsh(k, x, v) * hw * 1.2)
        const py = Math.round(top + 8 + hsh(x, k, v) * (H - top - 16))
        g.px(px, py, STONE5[4])
        g.px(px + 1, py - 1, '#6fa060')
      }
    }
    // Little shrubs, a tiny chedi and a hermit figurine.
    for (const [x, y] of [
      [8, H - 12],
      [24, 20],
      [48, H - 14],
    ]) {
      g.circle(x, y, 3, '#43905a')
      g.px(x - 1, y - 1, '#86c95f')
    }
    g.rect(29, 1, 3, 4, WHITE.b)
    g.px(30, 0, GOLD.b)
    g.rect(40, H - 16, 2, 4, '#c9a47a')
    g.px(40, H - 17, '#c0924c')
  })
}

/** Stone tortoise / crocodile figurines for the pond edge. */
export function tortoise(): Prop {
  return bprop('pho:tortoise', 14, 8, 7, 7, (g) => {
    g.ellipse(7, 4, 5, 3, '#6a8a5a')
    g.ellipse(7, 3.5, 4, 2, '#8aa870')
    g.px(5, 3, '#5a7a4a')
    g.px(8, 2, '#5a7a4a')
    g.rect(12, 3, 2, 2, '#7a9a6a')
    g.px(13, 3, '#2a1810')
    g.px(2, 6, '#6a8a5a')
    g.px(11, 6, '#6a8a5a')
  })
}

/** Massage student at work: a person lying on a mat being massaged. */
export function massageMat(v = 0): Prop {
  return bprop(`pho:massage:${v}`, 34, 26, 17, 25, (g) => {
    const o = 4
    g.rect(1, 13 + o, 32, 7, '#e8c890')
    g.frame(1, 13 + o, 32, 7, '#c9a06a')
    g.hline(2, 31, 16 + o, '#d9443f')
    g.rect(3, 12 + o, 6, 3, '#fffaf0')
    // Customer lying down (feet to the right).
    const cloth = v % 2 ? '#5a8de0' : '#e8709e'
    g.circle(6, 11 + o, 2.6, '#f0bd90')
    g.rect(4, 9 + o, 5, 2, v % 2 ? '#3b2f40' : '#8a5a3a')
    g.rect(9, 10 + o, 12, 4, cloth)
    g.rect(21, 11 + o, 9, 3, '#3d63b5')
    g.rect(30, 11 + o, 2, 3, '#f0bd90')
    // Therapist in a green uniform kneeling and pressing.
    g.rect(19, 2 + o, 6, 7, '#3f9a6b')
    g.rect(19, 8 + o, 7, 3, '#2c7552')
    g.circle(22, 0.5 + o, 2.5, '#e0a878')
    g.rect(20, -1 + o, 5, 1, '#3b2f40')
    g.line(19, 4 + o, 16, 9 + o, '#e0a878')
    g.line(25, 4 + o, 27, 9 + o, '#e0a878')
  })
}

