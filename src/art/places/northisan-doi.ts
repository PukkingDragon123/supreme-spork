// วัดพระธาตุดอยสุเทพ – art for the naga staircase, the golden Lanna chedi
// with its gold umbrellas, cloister galleries, the Lanna viharn, cable car,
// Chiang Mai's red songthaews, stalls and the city panorama.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, ROOF, bargeBoard, chofa, gable, hangHong, roofBand, slice, tier, type RoofRamp, type Ramp } from '../temple'
import { bld, block, GOLDR, hsh, LACQUER, TEAK, WHITER, stallProp, type Built, type Pt } from './northisan'

const LANNA_ROOF: RoofRamp = { field: '#c8503a', fieldD: '#9a3a2e', fieldL: '#e8805a', border: GOLD.d, borderD: GOLD.D, under: '#5e2a22' }
const DARK_WOOD: Ramp = { L: '#8a5a3a', b: '#6e4430', d: '#553322', D: '#3e2418' }

// ---------------------------------------------------------------------------
// The golden chedi (พระบรมธาตุดอยสุเทพ).

export function lannaChediSprite(): Built {
  const W = 96
  const H = 168
  return bld('doi:chedi', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    let y = H - 1
    // Redented platform tiers.
    for (const [h, half] of [
      [8, 44],
      [7, 39],
      [6, 35],
    ] as const) {
      y -= h
      tier(g, cx, y, h, half, GOLDR, GOLD.D)
      g.hline(Math.round(cx - half) + 2, Math.round(cx + half) - 3, y + 2, GOLD.L)
    }
    // Body with niches (เรือนธาตุ).
    const bodyH = 18
    y -= bodyH
    tier(g, cx, y, bodyH, 30, GOLDR)
    for (const nx of [-18, 0, 18]) {
      const w = nx === 0 ? 10 : 8
      g.rect(cx + nx - w / 2, y + 4, w, 12, GOLD.D)
      g.rect(cx + nx - w / 2 + 1, y + 6, w - 2, 10, '#6a3a1a')
      // Arched top.
      g.hline(cx + nx - w / 2 + 2, cx + nx + w / 2 - 3, y + 5, GOLD.D)
      g.px(cx + nx, y + 3, GOLD.l)
      // Tiny seated Buddha.
      g.rect(cx + nx - 2, y + 12, 4, 3, GOLD.b)
      g.rect(cx + nx - 1, y + 9, 2, 3, GOLD.b)
      g.px(cx + nx - 1, y + 9, GOLD.L)
      glints.push({ x: cx + nx, y: y + 3 })
    }
    // Lotus mouldings.
    for (const half of [28, 26, 24]) {
      for (let i = 0; i < 3; i++) {
        y -= 1
        slice(g, cx, y, half - i * 0.6, GOLDR, 0.3)
      }
      for (let x = Math.round(cx - half) + 2; x < cx + half - 2; x += 3) g.px(x, y + 1, GOLD.D)
      g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, y, GOLD.L)
    }
    // Octagonal bell (องค์ระฆัง) with facet lines.
    const bellH = 32
    const bellW = 22
    const bb = y
    for (let i = 1; i <= bellH; i++) {
      const t = i / bellH
      const half = bellW * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4)))
      slice(g, cx, bb - i, half, GOLDR, 0.34)
      // Facet edges.
      g.px(Math.round(cx - half * 0.55), bb - i, GOLD.L)
      g.px(Math.round(cx + half * 0.5), bb - i, GOLD.d)
    }
    // Filigree bands on the bell.
    for (const k of [6, 13]) {
      const t = k / bellH
      const half = bellW * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4)))
      g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, bb - k, GOLD.D)
      for (let x = Math.round(cx - half) + 2; x < cx + half - 2; x += 2) g.px(x, bb - k - 1, (x & 2) ? GOLD.L : GOLD.d)
    }
    glints.push({ x: cx - 12, y: bb - 18 }, { x: cx - 6, y: bb - 28 })
    y = bb - bellH
    // Harmika.
    g.rect(cx - 11, y - 1, 22, 1, GOLD.D)
    for (let i = 0; i < 7; i++) slice(g, cx, y - 1 - i, i === 0 || i === 6 ? 11 : 9, GOLDR, 0.35)
    y -= 8
    // Rings (ปล้องไฉน).
    for (let i = 0; i < 9; i++) {
      const half = 8 - i * 0.6
      slice(g, cx, y, half, GOLDR)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, GOLD.D)
      slice(g, cx, y - 1, half - 0.2, GOLDR, 0.4)
      slice(g, cx, y - 2, half - 0.4, GOLDR, 0.4)
      y -= 3
    }
    // Spire.
    for (let i = 0; i < 14; i++) slice(g, cx, y - i, 2.4 - (i / 14) * 1.8, GOLDR, 0.5)
    y -= 14
    // Five-tiered umbrella (ฉัตร) crowning the spire.
    for (let i = 0; i < 5; i++) {
      const uy = y - i * 3
      const half = 6 - i
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, uy, GOLD.b)
      g.hline(Math.round(cx - half) + 1, Math.round(cx + half) - 2, uy - 1, GOLD.L)
      g.px(Math.round(cx - half), uy + 1, GOLD.D)
      g.px(Math.round(cx + half) - 1, uy + 1, GOLD.D)
      g.vline(cx, uy - 2, uy, GOLD.d)
    }
    y -= 15
    g.px(cx, y, '#ffffff')
    g.px(cx - 1, y + 1, GOLD.L)
    glints.push({ x: cx, y }, { x: cx - 30, y: H - 24 }, { x: cx + 28, y: H - 40 })
    hooks.glints = glints
    hooks.top = [{ x: cx, y }]
  })
}

/** Gold multi-tiered umbrella (ฉัตรทอง) on a pole. */
export function goldUmbrellaSprite(): Built {
  const W = 20
  const H = 60
  return bld('doi:umbrella', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    // Pedestal.
    block(g, cx - 5, H - 7, 10, 7, 2, GOLDR)
    g.vline(cx, 6, H - 7, GOLD.D)
    g.vline(cx - 1, 6, H - 7, GOLD.b)
    // Tiers: widest at the bottom.
    const tiers = 7
    for (let i = 0; i < tiers; i++) {
      const y = H - 18 - i * 5
      const half = 9 - i * 1.1
      for (let k = 0; k < 3; k++) slice(g, cx, y - k, half - (2 - k) * 0.8, GOLDR, 0.4)
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y + 1, GOLD.D)
      // Fringe.
      for (let x = Math.round(cx - half); x < cx + half; x += 2) g.px(x, y + 2, GOLD.d)
    }
    g.px(cx, 2, '#ffffff')
    g.px(cx - 1, 3, GOLD.L)
    g.px(cx - 1, 4, GOLD.b)
    hooks.glints = [{ x: cx - 1, y: 3 }, { x: cx - 6, y: H - 20 }]
  })
}

/** Low gold railing fence segment (in front of the chedi). */
export function goldRailSprite(len: number): Built {
  return bld(`doi:rail:${len}`, len, 12, 0, 11, (g) => {
    g.rect(0, 3, len, 2, GOLD.b)
    g.hline(0, len - 1, 3, GOLD.L)
    g.rect(0, 9, len, 2, GOLD.d)
    for (let x = 0; x < len; x += 4) {
      g.rect(x, 3, 1, 8, x % 16 === 0 ? GOLD.b : GOLD.d)
      if (x % 16 === 0) {
        g.rect(x - 1, 0, 3, 3, GOLD.b)
        g.px(x, 0, GOLD.L)
      }
    }
    g.rect(len - 2, 0, 2, 11, GOLD.b)
  })
}

// ---------------------------------------------------------------------------
// Lanna buildings.

/** Stepped Lanna roof gable pair (the classic low sweeping roofs). */
function lannaRoof(g: Surface, cx: number, apex: number, hw: number, base: number, roof: RoofRamp, glints: Pt[], field: Color = '#b8343f') {
  roofBand(g, cx, apex, cx - hw, base, 9, roof, 3)
  roofBand(g, cx, apex, cx + hw, base, 9, roof, 3)
  const gl = gable(g, cx, apex + 2, hw - 6, base - 2, { field, fieldD: mixHex(field, '#000000', 0.35), sparkA: GOLD.l, sparkB: '#9fe8ff', motif: 'emblem', thick: 3 })
  glints.push(...gl)
}

/**
 * Lanna viharn (วิหารล้านนา) facade: three stepped roofs, gilded gable with
 * the carved "โก่งคิ้ว" arch, red lacquer doors and a little naga stair.
 * 150×128, anchor = foot of the stairs.
 */
export function lannaViharnSprite(night = false): Built {
  const W = 150
  const H = 128
  return bld(`doi:viharn:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    const floor = H - 10
    // Base plinth.
    block(g, 8, floor, W - 16, 10, 3, WHITER)
    g.hline(9, W - 10, floor + 5, GOLD.d)
    // Walls.
    const wallTop = floor - 34
    g.rect(14, wallTop, W - 28, 34, '#fffaf0')
    g.rect(14, wallTop, W - 28, 2, '#ece0cc')
    g.rect(W - 26, wallTop, 12, 34, '#ece0cc')
    // Carved gold panel belt.
    g.rect(14, floor - 6, W - 28, 6, LACQUER.b)
    for (let x = 16; x < W - 16; x += 4) g.px(x, floor - 4, GOLD.b)
    // Windows with gold frames.
    for (const wx of [24, 44, W - 52, W - 32]) {
      g.rect(wx - 1, wallTop + 8, 10, 16, GOLD.d)
      if (night) g.rect(wx, wallTop + 9, 8, 14, '#ffd98a')
      else {
        g.rect(wx, wallTop + 9, 8, 14, LACQUER.d)
        for (let k = 0; k < 4; k++) g.px(wx + 2 + (k % 2) * 3, wallTop + 11 + k * 3, GOLD.b)
      }
      g.px(wx + 4, wallTop + 6, GOLD.l)
    }
    // Door with lacquer and gold ลายคำ.
    const dw = 22
    g.rect(cx - dw / 2 - 2, wallTop + 2, dw + 4, 32, GOLD.d)
    if (night) {
      g.rect(cx - dw / 2, wallTop + 4, dw, 30, '#ffcf7a')
      g.rect(cx - dw / 2 + 2, wallTop + 6, dw - 4, 28, '#ffe7a8')
    } else {
      g.rect(cx - dw / 2, wallTop + 4, dw, 30, LACQUER.b)
      g.vline(cx, wallTop + 4, floor, LACQUER.D)
      for (let yy = wallTop + 7; yy < floor - 2; yy += 4)
        for (let xx = cx - dw / 2 + 2; xx < cx + dw / 2 - 1; xx += 3) if (((xx + yy) >> 1) % 2) g.px(xx, yy, GOLD.b)
    }
    // Carved gold arch over the door (ซุ้มโขง).
    for (let i = 0; i < 12; i++) {
      const half = 16 - i * 1.2
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, wallTop + 2 - i, i % 3 === 0 ? GOLD.L : GOLD.b)
    }
    g.px(cx, wallTop - 11, '#ffffff')
    glints.push({ x: cx, y: wallTop - 10 })
    // Pillars at the porch.
    for (const px of [18, 32, W - 36, W - 22]) {
      g.rect(px, wallTop - 4, 4, 38, LACQUER.b)
      g.vline(px, wallTop - 4, floor, LACQUER.L)
      for (let yy = wallTop; yy < floor - 4; yy += 5) g.px(px + 2, yy, GOLD.b)
      g.rect(px - 1, wallTop - 4, 6, 2, GOLD.b)
      g.rect(px - 1, floor - 2, 6, 2, GOLD.d)
    }
    // Roofs: back (widest, lowest), middle, and the front gable.
    const r1 = floor - 36
    for (const s of [-1, 1]) {
      roofBand(g, cx + s * 44, r1 - 8, cx + s * 74, r1 + 6, 12, LANNA_ROOF, 3)
      bargeBoard(g, cx + s * 44, r1 - 8, cx + s * 74, r1 + 6, 2)
      hangHong(g, cx + s * 75, r1 + 7, s)
    }
    for (const s of [-1, 1]) {
      roofBand(g, cx + s * 28, r1 - 24, cx + s * 62, r1 - 2, 16, LANNA_ROOF, 3)
      bargeBoard(g, cx + s * 28, r1 - 24, cx + s * 62, r1 - 2, 2)
      hangHong(g, cx + s * 63, r1 - 1, s)
    }
    lannaRoof(g, cx, r1 - 58, 48, r1 + 4, LANNA_ROOF, glints, '#b8343f')
    // Gold นาคทันต์ brackets under the eaves.
    for (const s of [-1, 1]) {
      g.line(cx + s * 38, r1 + 4, cx + s * 44, wallTop + 6, GOLD.b)
      g.line(cx + s * 37, r1 + 4, cx + s * 43, wallTop + 6, GOLD.D)
    }
    // Front stairs with little nagas.
    for (let i = 0; i < 4; i++) g.rect(cx - 14 + i, floor + 2 + i * 2, 28 - i * 2, 2, i % 2 ? '#ece0cc' : '#fffaf0')
    for (const s of [-1, 1]) {
      const nx = cx + s * 17
      g.rect(nx - 1, floor + 1, 3, 8, '#43a86a')
      g.rect(nx - 2, floor - 3, 5, 4, '#43a86a')
      g.px(nx - 1, floor - 4, GOLD.b)
      g.px(nx + 1, floor - 4, GOLD.b)
      g.px(nx, floor - 5, GOLD.L)
      g.px(nx + (s < 0 ? -1 : 1), floor - 2, P.ink)
    }
    hooks.glints = glints
    hooks.windows = [{ x: 28, y: wallTop + 16 }, { x: 48, y: wallTop + 16 }, { x: W - 48, y: wallTop + 16 }, { x: W - 28, y: wallTop + 16 }]
    hooks.door = [{ x: cx, y: floor - 12 }]
    hooks.bells = [
      { x: cx - 75, y: r1 + 11 },
      { x: cx + 75, y: r1 + 11 },
      { x: cx - 63, y: r1 + 3 },
      { x: cx + 63, y: r1 + 3 },
    ]
  })
}

/** Outer wall of the cloister (ระเบียงคด) seen from outside: white base, red Lanna roof. */
export function galleryOuterSprite(len: number): Built {
  const H = 34
  return bld(`doi:galout:${len}`, len, H, 0, H - 1, (g) => {
    // Roof.
    for (let y = 0; y < 14; y++) {
      const c = y === 13 ? LANNA_ROOF.borderD : y === 12 ? LANNA_ROOF.border : y % 3 === 2 ? LANNA_ROOF.fieldD : LANNA_ROOF.field
      g.hline(0, len - 1, y + 2, c)
      if (y % 3 === 1) for (let x = (y * 3) % 5; x < len; x += 5) g.px(x, y + 2, LANNA_ROOF.fieldL)
    }
    g.hline(0, len - 1, 1, GOLD.b)
    g.hline(0, len - 1, 0, GOLD.d)
    for (let x = 6; x < len; x += 24) {
      g.px(x, -1 + 1, GOLD.L)
      g.vline(x, 0, 1, GOLD.l)
    }
    // Wall with small arched windows.
    g.rect(0, 16, len, H - 16, '#fffaf0')
    g.rect(0, 16, len, 1, LANNA_ROOF.under)
    g.rect(0, H - 4, len, 4, '#ece0cc')
    g.hline(0, len - 1, H - 1, '#d2bfa2')
    for (let x = 8; x < len - 6; x += 16) {
      g.rect(x, 21, 5, 7, GOLD.d)
      g.rect(x + 1, 22, 3, 6, '#5e2a22')
      g.px(x + 2, 20, GOLD.l)
    }
  })
}

/** Lanna gate (ซุ้มประตูโขง) set into the cloister wall. 64×78. Opening x 22..42. */
export function lannaGateSprite(): Built {
  const W = 64
  const H = 80
  return bld('doi:gate', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    // Stepped stucco towers either side.
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 2 : W - 20
      block(g, x0, 34, 18, H - 34, 0, WHITER)
      for (let i = 0; i < 5; i++) {
        const y = 34 - i * 6
        const half = 9 - i * 1.3
        block(g, Math.round(x0 + 9 - half), y - 6, Math.round(half * 2), 6, 1, WHITER)
        g.hline(Math.round(x0 + 9 - half), Math.round(x0 + 9 + half) - 1, y - 1, GOLD.d)
        g.px(Math.round(x0 + 9 - half), y - 6, GOLD.b)
        g.px(Math.round(x0 + 9 + half) - 1, y - 6, GOLD.b)
      }
      g.px(x0 + 9, 2, GOLD.L)
      g.vline(x0 + 9, 3, 5, GOLD.b)
      glints.push({ x: x0 + 9, y: 2 })
      // Stucco kanok panel.
      g.rect(x0 + 4, 44, 10, 26, '#f1e6d4')
      for (let y = 46; y < 68; y += 4) {
        g.px(x0 + 7, y, GOLD.d)
        g.px(x0 + 8, y + 1, GOLD.b)
        g.px(x0 + 10, y, GOLD.d)
      }
    }
    // Central arch body.
    block(g, 18, 22, W - 36, H - 22, 0, WHITER)
    // Pointed tiers above the arch.
    for (let i = 0; i < 6; i++) {
      const y = 22 - i * 3
      const half = 14 - i * 2
      g.rect(Math.round(cx - half), y - 3, Math.round(half * 2), 3, i % 2 ? '#fffaf0' : '#f1e6d4')
      g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y - 1, GOLD.d)
    }
    g.px(cx, 1, GOLD.L)
    g.vline(cx, 2, 4, GOLD.b)
    glints.push({ x: cx, y: 1 })
    // Opening.
    const ox0 = 22
    const ox1 = W - 22
    for (let x = ox0; x < ox1; x++) {
      const t = (x - ox0) / (ox1 - ox0 - 1)
      const ay = 38 - Math.round(Math.sin(t * Math.PI) * 8)
      g.vline(x, ay, H - 1, '#3a2530')
      g.px(x, ay - 1, GOLD.b)
      g.px(x, ay - 2, GOLD.d)
    }
    // Light from the courtyard beyond.
    g.rect(ox0 + 3, 48, ox1 - ox0 - 6, H - 49, '#fff3d6')
    g.rect(ox0 + 5, 52, ox1 - ox0 - 10, H - 53, '#fffbe8')
    // Glimpse of the golden chedi through the gate.
    g.rect(cx - 5, 56, 10, H - 57, GOLD.d)
    g.rect(cx - 4, 56, 4, H - 57, GOLD.b)
    g.ellipse(cx, 56, 5, 4, GOLD.b)
    hooks.glints = glints
  })
}

/** Inside wall of the cloister: an arcade of pillars with seated Buddhas. */
export function galleryInsideSprite(len: number, key = 'a'): Built {
  const H = 46
  return bld(`doi:galin:${len}:${key}`, len, H, 0, H - 1, (g, hooks) => {
    // Roof edge.
    for (let y = 0; y < 9; y++) {
      const c = y === 8 ? GOLD.D : y === 7 ? GOLD.d : y % 3 === 2 ? LANNA_ROOF.fieldD : LANNA_ROOF.field
      g.hline(0, len - 1, y, c)
    }
    // Back wall (dark) with murals of the relic legend.
    g.rect(0, 9, len, H - 15, '#7a3a2e')
    for (let x = 2; x < len - 2; x += 6) {
      const v = hsh(x, len, 7)
      g.rect(x, 12, 5, 8, v % 3 ? '#a8604a' : '#c8906a')
      g.px(x + 1, 14, v % 2 ? '#e8d8b0' : '#6cc36a')
      g.px(x + 3, 16, '#e8d8b0')
    }
    // Plinth.
    g.rect(0, H - 8, len, 8, '#fffaf0')
    g.hline(0, len - 1, H - 8, '#ffffff')
    g.hline(0, len - 1, H - 4, GOLD.d)
    g.hline(0, len - 1, H - 1, '#d2bfa2')
    // Row of seated golden Buddhas.
    const glints: Pt[] = []
    for (let x = 8; x < len - 6; x += 12) {
      const by = H - 9
      g.rect(x - 4, by - 2, 9, 2, GOLD.D)
      g.ellipse(x, by - 4, 4, 2, GOLD.d)
      g.rect(x - 2, by - 10, 5, 7, GOLD.b)
      g.px(x - 2, by - 10, GOLD.L)
      g.circle(x, by - 12, 2, GOLD.b)
      g.px(x, by - 15, GOLD.l)
      g.px(x - 1, by - 13, GOLD.L)
      glints.push({ x, y: by - 15 })
    }
    // Pillars.
    for (let x = 2; x < len; x += 24) {
      g.rect(x, 8, 3, H - 16, LACQUER.b)
      g.vline(x, 8, H - 9, LACQUER.L)
      g.rect(x - 1, 8, 5, 2, GOLD.b)
    }
    hooks.glints = glints
  })
}

// ---------------------------------------------------------------------------
// Terrace furniture.

/** The white elephant who carried the relic up the mountain, on a plinth. */
export function whiteElephantSprite(): Built {
  const W = 44
  const H = 44
  return bld('doi:elephant', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    block(g, 4, H - 9, W - 8, 9, 2, { L: '#e8e0d8', b: '#c9bfb8', d: '#a89e98', D: '#8c8187' })
    g.hline(5, W - 6, H - 5, GOLD.d)
    const b = H - 9
    const E = { L: '#ffffff', b: '#f4efe8', d: '#dcd2c8', D: '#bfb2a8' }
    // Legs.
    for (const lx of [9, 15, 26, 32]) {
      g.rect(lx, b - 9, 5, 9, lx > 20 ? E.d : E.b)
      g.hline(lx, lx + 4, b - 1, E.D)
    }
    // Body.
    g.ellipse(cx + 2, b - 14, 15, 9, E.d)
    g.ellipse(cx + 1, b - 15, 14, 8, E.b)
    g.ellipse(cx - 3, b - 18, 8, 4, E.L)
    // Head and trunk (facing left).
    g.ellipse(9, b - 19, 7, 7, E.b)
    g.ellipse(8, b - 21, 4, 3, E.L)
    g.rect(3, b - 16, 4, 10, E.b)
    g.rect(2, b - 8, 4, 3, E.b)
    g.px(2, b - 6, E.D)
    // Ear.
    g.ellipse(14, b - 18, 4, 6, E.d)
    g.px(6, b - 21, P.ink)
    // Tusk.
    g.hline(4, 7, b - 13, '#fffaf0')
    // Saddle cloth and the little golden relic chedi on its back.
    g.rect(cx - 5, b - 23, 16, 8, LACQUER.b)
    g.hline(cx - 5, cx + 10, b - 23, GOLD.b)
    g.hline(cx - 5, cx + 10, b - 16, GOLD.b)
    for (let x = cx - 4; x < cx + 10; x += 3) g.px(x, b - 15, GOLD.d)
    for (let i = 0; i < 12; i++) slice(g, cx + 3, b - 24 - i, Math.max(0.6, 4.5 - i * 0.36), GOLDR, 0.4)
    g.px(cx + 3, b - 37, '#ffffff')
    // Garland on the tusks.
    for (let i = 0; i < 6; i++) g.px(3 + i, b - 11 + Math.round(Math.sin(i / 5 * Math.PI) * 2), i % 2 ? '#ffd23f' : '#fffaf0')
    hooks.glints = [{ x: cx + 3, y: b - 37 }]
  })
}

/** Coin-operated binoculars at the lookout. */
export function binocularsSprite(): Prop2 {
  return bld('doi:binoc', 14, 24, 7, 23, (g) => {
    g.rect(6, 10, 2, 13, '#8a8480')
    g.rect(3, 21, 8, 2, '#6d6478')
    g.rect(2, 3, 10, 7, '#3f8ad0')
    g.rect(2, 3, 10, 2, '#7fb6f0')
    g.rect(1, 5, 3, 3, '#2a5a9a')
    g.rect(10, 5, 3, 3, '#2a5a9a')
    g.px(2, 6, '#d4f1ff')
    g.px(11, 6, '#d4f1ff')
    g.rect(5, 9, 4, 2, '#ffd23f')
    g.px(6, 9, P.ink)
  })
}
type Prop2 = Built

/** Rest pavilion (ศาลาพักร้อน) on the stair landing: Lanna roof on four posts. */
export function restSalaSprite(): Built {
  const W = 48
  const H = 40
  return bld('doi:sala', W, H, W / 2, H - 1, (g) => {
    block(g, 3, H - 5, W - 6, 5, 2, WHITER)
    for (const x of [6, W - 9]) g.rect(x, 16, 3, H - 21, DARK_WOOD.b)
    g.rect(8, H - 11, W - 16, 3, TEAK.b)
    g.hline(8, W - 9, H - 11, TEAK.L)
    for (let y = 2; y < 16; y++) {
      const inset = Math.round((16 - y) * 0.9)
      const c = y === 15 ? GOLD.D : y === 14 ? GOLD.d : y % 3 === 2 ? LANNA_ROOF.fieldD : LANNA_ROOF.field
      g.hline(1 + inset, W - 2 - inset, y, c)
    }
    g.hline(15, W - 16, 1, GOLD.b)
    chofa(g, 15, 2, 5, -1)
    chofa(g, W - 16, 2, 5, 1)
  })
}

// ---------------------------------------------------------------------------
// Cable car (รถราง) stations and cabin.

export function cableStationSprite(top: boolean): Built {
  const W = 40
  const H = 36
  return bld(`doi:station:${top ? 1 : 0}`, W, H, W / 2, H - 1, (g) => {
    block(g, 2, 10, W - 4, H - 10, 0, { L: '#f4efe8', b: '#e4ddd6', d: '#c9bfb8', D: '#a89e98' })
    // Roof.
    g.rect(0, 5, W, 6, LANNA_ROOF.field)
    g.hline(0, W - 1, 5, LANNA_ROOF.fieldL)
    g.hline(0, W - 1, 10, LANNA_ROOF.borderD)
    // Sign.
    g.rect(8, 12, W - 16, 6, '#3f8ad0')
    for (let x = 10; x < W - 10; x += 2) g.px(x, 14 + (x % 4 ? 0 : 1), '#fffaf0')
    // Doorway.
    g.rect(W / 2 - 6, 20, 12, H - 21, '#5a5068')
    g.rect(W / 2 - 5, 21, 10, H - 22, top ? '#7a7088' : '#6d6478')
    g.rect(4, 22, 6, 6, '#d4f1ff')
    g.rect(W - 10, 22, 6, 6, '#d4f1ff')
    g.px(5, 23, '#ffffff')
    g.px(W - 9, 23, '#ffffff')
  })
}

/** Cable-car cabin (drawn by the scene every frame). */
export function drawCabin(g: Surface, x: number, y: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  g.rect(X - 7, Y - 12, 14, 12, '#3a2838')
  g.rect(X - 6, Y - 11, 12, 10, '#e8514a')
  g.rect(X - 6, Y - 11, 12, 2, '#ff8a70')
  g.rect(X - 5, Y - 8, 10, 4, '#d4f1ff')
  g.px(X - 4, Y - 8, '#ffffff')
  // Passengers' heads bobbing.
  const bob = Math.floor(t * 2) % 2
  g.rect(X - 4, Y - 7 + bob, 2, 2, '#3b2f40')
  g.rect(X + 1, Y - 7, 2, 2, '#6e4a35')
  g.rect(X - 6, Y - 3, 12, 2, '#b3363b')
  g.px(X - 2, Y - 13, '#8a8480')
  g.px(X + 2, Y - 13, '#8a8480')
}

// ---------------------------------------------------------------------------
// Street at the foot of the mountain.

/** Chiang Mai's red songthaew (รถแดง), parked, facing left. 44×28. */
export function songthaewRedSprite(flip = false): Built {
  const base = songthaewBase()
  return flip ? flipBuilt(base, 'doi:songthaewF') : base
}
function songthaewBase(): Built {
  const W = 46
  const H = 28
  return bld('doi:songthaew', W, H, W / 2, H - 2, (g) => {
    const R = { L: '#ff8a70', b: '#d8403a', d: '#a82e30', D: '#7e2430' }
    // Rear cabin with roof rack.
    g.rect(16, 5, 28, 15, R.b)
    g.rect(16, 5, 28, 2, R.L)
    g.rect(16, 18, 28, 2, R.d)
    g.rect(17, 2, 26, 3, '#8a8480')
    g.hline(17, 42, 2, '#bdb2ae')
    // Windows with benches and passengers.
    for (let x = 18; x < 42; x += 6) {
      g.rect(x, 8, 5, 6, '#d4f1ff')
      g.px(x, 8, '#ffffff')
    }
    g.rect(21, 10, 2, 3, '#3b2f40')
    g.rect(33, 10, 2, 3, '#e0a868')
    // Cab.
    g.rect(2, 9, 15, 11, R.b)
    g.rect(2, 9, 15, 2, R.L)
    g.rect(4, 11, 8, 5, '#d4f1ff')
    g.px(4, 11, '#ffffff')
    g.rect(1, 16, 3, 2, '#fff3a6')
    g.rect(2, 19, 42, 3, '#3a3040')
    // Wheels.
    for (const wx of [9, 36]) {
      g.circle(wx, 22, 3.5, '#241a2b')
      g.circle(wx, 22, 1.6, '#bdb2ae')
    }
    // Sign on the roof.
    g.rect(22, 0, 14, 2, '#fffaf0')
    g.hline(24, 33, 1, R.b)
  })
}
export function flipBuilt(b: Built, key: string): Built {
  return bld(key, b.w, b.h, b.w - b.ax, b.ay, (g) => g.draw(b.canvas, 0, 0, true), false)
}

/** Khao soi and sai ua (grilled northern sausage) stall. */
export function khaoSoiStallSprite(): Built {
  return stallProp('doi:khaosoi', {
    w: 50,
    awning: ['#e8514a', '#ffd23f'],
    sign: '#fffaf0',
    signArt: (g, x, y) => {
      // Bowl icon + chilli.
      g.ellipse(x + 5, y + 3, 4, 2, '#f0a040')
      g.hline(x + 1, x + 9, y + 2, '#fffaf0')
      g.rect(x + 12, y + 1, 4, 2, '#e8514a')
      g.px(x + 16, y + 1, '#6cc36a')
    },
    goods: (g, x, y, w) => {
      // Big steaming pot of curry broth.
      g.rect(x + 1, y - 9, 12, 9, '#8a8480')
      g.rect(x + 1, y - 9, 12, 2, '#bdb2ae')
      g.ellipse(x + 7, y - 9, 6, 1.6, '#e8a040')
      g.px(x + 5, y - 10, '#ffd080')
      // Crispy noodles basket.
      g.ellipse(x + 18, y - 2, 4, 2, '#c9a04c')
      for (let i = 0; i < 6; i++) g.px(x + 15 + i, y - 4 + (i % 2), '#ffd23f')
      // Grill with a sausage coil.
      g.rect(x + 24, y - 3, w - 26, 3, '#3a3040')
      for (let i = 0; i < 3; i++) g.ellipse(x + 30 + i * 4, y - 4, 2, 1.2, i === 1 ? '#c8503a' : '#a83a2e')
      g.px(x + 29, y - 5, '#ff8a70')
      // Bowls stacked.
      g.rect(x + w - 6, y - 5, 5, 2, '#fffaf0')
      g.rect(x + w - 6, y - 7, 5, 2, '#5a8de0')
    },
  })
}

/** Hill-tribe handicraft stall: embroidered bags, hats and silver. */
export function hillTribeStallSprite(): Built {
  return stallProp('doi:hilltribe', {
    w: 50,
    awning: ['#3a3a78', '#e8514a'],
    wood: DARK_WOOD,
    goods: (g, x, y, w) => {
      const cols = ['#e8514a', '#3a3a78', '#ffd23f', '#6cc36a', '#ff9fc0', '#5a8de0']
      // Bags hanging from the awning beam.
      for (let i = 0; i < 6; i++) {
        const bx = x + 2 + i * 7
        const c = cols[i % cols.length]
        g.vline(bx + 2, y - 16, y - 13, '#3a2838')
        g.rect(bx, y - 13, 5, 6, c)
        g.hline(bx, bx + 4, y - 11, cols[(i + 2) % cols.length])
        g.px(bx + 1, y - 9, cols[(i + 3) % cols.length])
        g.px(bx + 3, y - 9, '#fffaf0')
      }
      // Silver on the counter.
      for (let i = 0; i < w - 4; i += 4) {
        g.ellipse(x + 3 + i, y - 1, 1.6, 1, '#e4e8f0')
        g.px(x + 2 + i, y - 2, '#ffffff')
      }
    },
  })
}

/** Misty mountain pine with layered, textured tiers. */
export function pineSprite(v = 0): Built {
  const W = 30
  const H = 58
  return bld(`doi:pine:${v}`, W, H, W / 2, H - 1, (g) => {
    const cx = W / 2
    const L = v % 2 ? { L: '#6cb88a', b: '#3f8a66', d: '#2c6a52', D: '#1e4a3e' } : { L: '#7cc08a', b: '#4a9a6a', d: '#337552', D: '#22523e' }
    g.rect(cx - 1, H - 12, 3, 12, '#7a5a48')
    g.px(cx - 1, H - 12, '#9a7a62')
    const tiers = 5
    for (let i = 0; i < tiers; i++) {
      const base = H - 9 - i * 9
      const hw = 13 - i * 2.2
      const top = base - 14
      for (let y = top; y <= base; y++) {
        const t = (y - top) / (base - top)
        const half = hw * t
        const jag = hsh(y, i, v) % 3 === 0 ? 1 : 0
        const x0 = Math.round(cx - half - jag)
        const x1 = Math.round(cx + half + jag)
        g.hline(x0, x1, y, L.d)
        g.hline(x0 + 1, Math.round(cx), y, L.b)
        if (t > 0.3 && hsh(y, x0, v) % 4 === 0) g.px(x0 + 2, y, L.L)
        g.px(x1, y, L.D)
      }
      g.hline(Math.round(cx - hw) + 1, Math.round(cx + hw) - 1, base + 1, L.D)
    }
    g.px(cx, H - 9 - tiers * 9 - 5, L.L)
  })
}

// ---------------------------------------------------------------------------
// Panorama over Chiang Mai (baked into the ground layer).

export function cityView(g: Surface, x: number, y: number, w: number, h: number, night: boolean) {
  const sky = night ? '#2e3270' : '#b8d4f0'
  g.rect(x, y, w, h, sky)
  // Far ranges across the valley.
  const ranges: [number, Color][] = night
    ? [[14, '#3c3e82'], [20, '#34387a']]
    : [[14, '#9ab4dc'], [22, '#86a4d0']]
  ranges.forEach(([base, c], k) => {
    for (let i = 0; i < w; i++) {
      const hh = 5 + Math.round(Math.sin((x + i) * (0.06 + k * 0.03) + k) * 3 + Math.sin((x + i) * 0.21) * 1.5)
      g.vline(x + i, y + base - hh, y + base + 6, c)
    }
  })
  // Valley floor fading into haze.
  const land = night ? '#2a3466' : '#8fb89a'
  const landD = night ? '#243060' : '#7aa688'
  g.rect(x, y + 28, w, h - 28, land)
  g.ctx.save()
  g.ctx.globalAlpha = night ? 0.25 : 0.55
  g.rect(x, y + 26, w, 8, night ? '#4a4a8c' : '#e4eef8')
  g.ctx.restore()
  for (let j = 30; j < h; j += 2) for (let i = (j * 7) % 6; i < w; i += 7) g.px(x + i, y + j, landD)
  // Tree clumps.
  for (let k = 0; k < 40; k++) {
    const v = hsh(k, 5, 12)
    g.circle(x + (v % w), y + 34 + ((v >> 4) % (h - 40)), 1.5 + (v % 2), night ? '#1e2a58' : '#5f9a6a')
  }
  // The city: rows of tiny buildings, smaller and hazier far away.
  const cx = x + w * 0.5
  const cy = y + 34 + (h - 34) * 0.42
  for (let j = 32; j < h - 2; j += 3) {
    const far = 1 - (j - 32) / (h - 34)
    for (let i = 1; i < w - 2; i += 3) {
      const X = x + i
      const Y = y + j
      const d = Math.hypot((X - cx) / (w * 0.62), (Y - cy) / ((h - 34) * 0.55))
      const v = hsh(i, j, 11)
      if (d > 1 || v > 780 - d * 300) continue
      const tall = v % 23 === 0 && far < 0.8
      if (night) {
        g.rect(X, Y, 2, 1, '#34407a')
        if (v % 3 === 0) g.px(X + (v % 2), Y, v % 5 ? '#ffe07a' : '#ffb35a')
        if (tall) {
          g.rect(X, Y - 4, 2, 4, '#34407a')
          g.px(X, Y - 3, '#ffe07a')
        }
        continue
      }
      const roof = ['#f4f0ea', '#e8e0d8', '#d8785a', '#c8d8e8', '#f0e0c8'][v % 5]
      const side = mixHex(roof, '#6a6070', 0.35)
      const haze = far * 0.4
      g.px(X, Y, mixHex(roof, '#e4eef8', haze))
      g.px(X + 1, Y, mixHex(roof, '#e4eef8', haze))
      g.px(X, Y + 1, mixHex(side, '#e4eef8', haze))
      g.px(X + 1, Y + 1, mixHex(side, '#e4eef8', haze))
      if (tall) {
        g.rect(X, Y - 5, 2, 5, mixHex('#e8ecf4', '#e4eef8', haze))
        g.px(X + 1, Y - 5, '#c8cfe0')
        g.vline(X + 1, Y - 4, Y - 1, '#b8c0d4')
      }
    }
  }
  // Old-city moat square with a golden spire inside.
  const mx = Math.round(cx - 11)
  const my = Math.round(cy + 2)
  g.frame(mx - 1, my - 1, 24, 14, night ? '#1e2a58' : '#6aa080')
  g.frame(mx, my, 22, 12, night ? '#5a78c8' : '#4aa8d0')
  g.px(mx + 11, my + 5, GOLD.b)
  g.px(mx + 11, my + 4, GOLD.L)
  g.px(mx + 11, my + 3, GOLD.b)
  // Ping river and the airport runway.
  for (let j = 30; j < h; j++) g.px(Math.round(x + w * 0.78 + Math.sin(j * 0.12) * 3), y + j, night ? '#4a60a8' : '#6ec0e0')
  g.line(x + 4, y + h - 12, x + 30, y + h - 22, night ? '#8a8ac0' : '#d8d0cc')
  g.line(x + 4, y + h - 11, x + 30, y + h - 21, night ? '#6a6aa0' : '#b8b0ac')
  // Mist banks.
  g.ctx.save()
  g.ctx.globalAlpha = night ? 0.15 : 0.3
  for (let k = 0; k < 4; k++) g.ellipse(x + ((k * 53) % w), y + 30 + k * ((h - 30) / 4), 30, 3, '#ffffff')
  g.ctx.restore()
}

export const DOI_ART = {
  chedi: () => lannaChediSprite(),
  umbrella: () => goldUmbrellaSprite(),
  rail: () => goldRailSprite(60),
  viharn: () => lannaViharnSprite(),
  viharnN: () => lannaViharnSprite(true),
  galout: () => galleryOuterSprite(96),
  gate: () => lannaGateSprite(),
  galin: () => galleryInsideSprite(96),
  elephant: () => whiteElephantSprite(),
  binoc: () => binocularsSprite(),
  sala: () => restSalaSprite(),
  station: () => cableStationSprite(false),
  songthaew: () => songthaewRedSprite(),
  khaosoi: () => khaoSoiStallSprite(),
  hilltribe: () => hillTribeStallSprite(),
  pine0: () => pineSprite(0),
  pine1: () => pineSprite(1),
}

export { LANNA_ROOF, DARK_WOOD, hsh, ROOF }
