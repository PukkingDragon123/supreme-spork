// Large temple buildings drawn procedurally in a front-facing 3/4 view.

import type { Color, Surface } from '../engine/pixel'
import { P } from './palette'
import { mixHex } from './characters'
import { drawGable } from './props'

interface RoofColors {
  tile: Color
  tileD: Color
  tileL: Color
  edge: Color
  edgeD: Color
}

const ROOF_ORANGE: RoofColors = { tile: '#f08a3a', tileD: '#cf6424', tileL: '#ffae62', edge: '#3f9a6b', edgeD: '#2c7552' }
const ROOF_RED: RoofColors = { tile: '#e2503f', tileD: '#b8343f', tileL: '#ff8a7a', edge: '#3f9a6b', edgeD: '#2c7552' }
const ROOF_BLUE: RoofColors = { tile: '#4f7fd0', tileD: '#3a5fb0', tileL: '#8fb6ff', edge: '#e9a53a', edgeD: '#b8742a' }
const ROOF_GOLD: RoofColors = { tile: '#f5c542', tileD: '#d99a2b', tileL: '#fff09a', edge: '#e8514a', edgeD: '#b8343f' }

export const ROOFS = { orange: ROOF_ORANGE, red: ROOF_RED, blue: ROOF_BLUE, gold: ROOF_GOLD }

/** A sloping roof plane between a front edge line and the same line shifted up by `depth`. */
function roofPlane(g: Surface, ax: number, ay: number, bx: number, by: number, depth: number, c: RoofColors, rows = 3) {
  // Quadrilateral: a → b (front edge), then back up by depth.
  const pts: [number, number][] = [
    [ax, ay],
    [bx, by],
    [bx, by - depth],
    [ax, ay - depth],
  ]
  g.poly(pts, c.tile)
  // Tile courses: lines parallel to the front edge.
  for (let k = rows; k < depth; k += rows) {
    g.line(ax, ay - k, bx, by - k, c.tileD)
  }
  // Vertical tile seams.
  const len = Math.abs(bx - ax)
  const dir = bx > ax ? 1 : -1
  for (let s = 4; s < len; s += 4) {
    const x = ax + s * dir
    const t = s / len
    const y = ay + (by - ay) * t
    for (let k = 1; k < depth; k += 2) if ((k + s) % 4 < 2) g.px(x, y - k, c.tileD)
  }
  g.line(ax, ay - depth, bx, by - depth, c.tileL)
}

export interface UbosotOptions {
  wallW?: number
  wallH?: number
  gableH?: number
  depth?: number
  roof?: RoofColors
  wall?: Color
  wallD?: Color
  door?: Color
  night?: boolean
}

/** Ordination hall (อุโบสถ) – `baseY` is the ground line at the top of the stairs. */
export function drawUbosot(g: Surface, cx: number, baseY: number, o: UbosotOptions = {}) {
  const W = o.wallW ?? 104
  const wallH = o.wallH ?? 38
  const gableH = o.gableH ?? 34
  const depth = o.depth ?? 22
  const roof = o.roof ?? ROOF_ORANGE
  const wall = o.wall ?? '#fffaf0'
  const wallD = o.wallD ?? '#eadfcb'
  const door = o.door ?? '#b8343f'
  const plinthH = 10
  const wallTop = baseY - plinthH - wallH
  const halfW = Math.round(W / 2)
  const gHalf = halfW + 8

  // --- lower tier side roofs (ปีกนก) behind everything ---
  const tierY = wallTop + 8
  roofPlane(g, cx - gHalf - 16, tierY + 4, cx - halfW + 4, tierY - 6, 14, roof)
  roofPlane(g, cx + gHalf + 16, tierY + 4, cx + halfW - 4, tierY - 6, 14, roof)
  g.line(cx - gHalf - 16, tierY + 5, cx - halfW + 4, tierY - 5, roof.edge)
  g.line(cx + gHalf + 16, tierY + 5, cx + halfW - 4, tierY - 5, roof.edge)
  g.line(cx - gHalf - 16, tierY + 6, cx - halfW + 4, tierY - 4, roof.edgeD)
  g.line(cx + gHalf + 16, tierY + 6, cx + halfW - 4, tierY - 4, roof.edgeD)
  // tier hang-hong
  g.px(cx - gHalf - 17, tierY + 3, P.gold)
  g.px(cx - gHalf - 18, tierY + 2, P.gold)
  g.px(cx + gHalf + 17, tierY + 3, P.gold)
  g.px(cx + gHalf + 18, tierY + 2, P.gold)

  // --- main roof planes ---
  const peakY = wallTop - gableH
  roofPlane(g, cx - gHalf, wallTop, cx, peakY, depth, roof)
  roofPlane(g, cx + gHalf, wallTop, cx, peakY, depth, roof)
  // Ridge with a back chofa.
  g.vline(cx, peakY - depth, peakY, P.goldD)
  g.px(cx, peakY - depth - 1, P.gold)
  g.px(cx - 1, peakY - depth - 2, P.gold)
  g.px(cx - 1, peakY - depth - 3, P.gold)
  g.px(cx - 2, peakY - depth - 4, P.gold)
  // Eave edges down the sides.
  g.vline(cx - gHalf, wallTop - depth, wallTop, roof.edge)
  g.vline(cx + gHalf, wallTop - depth, wallTop, roof.edge)
  // Little finials along the roof edges (ใบระกา seen from above).
  for (let k = 3; k < depth; k += 4) {
    g.px(cx - gHalf - 1, wallTop - k, P.gold)
    g.px(cx + gHalf + 1, wallTop - k, P.gold)
  }

  // --- walls ---
  g.rect(cx - halfW, wallTop, W, wallH, wall)
  g.rect(cx + halfW - 6, wallTop, 6, wallH, wallD)
  g.rect(cx - halfW, wallTop, W, 2, mixHex(wall, '#3a2838', 0.12))
  // Windows.
  const winXs = [cx - halfW + 12, cx - halfW + 30, cx + halfW - 38, cx + halfW - 20]
  for (const wx of winXs) {
    g.rect(wx - 1, wallTop + 11, 10, 15, P.gold)
    g.rect(wx, wallTop + 12, 8, 13, o.night ? '#ffd88a' : door)
    g.vline(wx + 4, wallTop + 12, wallTop + 24, o.night ? '#f5b85a' : P.redDD)
    // Pointed window crown.
    g.poly(
      [
        [wx - 1, wallTop + 11],
        [wx + 4, wallTop + 4],
        [wx + 9, wallTop + 11],
      ],
      P.gold,
    )
    g.px(wx + 4, wallTop + 7, P.goldDD)
  }
  // Door with its tall gold arch.
  const dw = 16
  const dh = 26
  const dx = cx - dw / 2
  const dy = baseY - plinthH - dh
  g.poly(
    [
      [dx - 3, dy],
      [cx, dy - 14],
      [dx + dw + 3, dy],
    ],
    P.gold,
  )
  g.poly(
    [
      [dx + 1, dy],
      [cx, dy - 9],
      [dx + dw - 1, dy],
    ],
    P.goldD,
  )
  g.rect(dx - 3, dy, dw + 6, dh, P.gold)
  g.rect(dx - 1, dy + 2, dw + 2, dh - 2, o.night ? '#ffd88a' : door)
  if (!o.night) {
    g.vline(cx, dy + 2, dy + dh - 1, P.redDD)
    // Gold door ornaments.
    for (const ox of [-5, 4]) {
      g.rect(cx + ox, dy + 6, 2, 2, P.gold)
      g.rect(cx + ox, dy + 14, 2, 2, P.gold)
      g.px(cx + ox, dy + 10, P.gold)
    }
  } else {
    g.rect(cx - 2, dy + 12, 4, 10, '#ffe7a8')
  }

  // Columns.
  const colXs = [cx - halfW + 2, cx - halfW + 24, cx + halfW - 28, cx + halfW - 6]
  for (const x of colXs) {
    g.rect(x, wallTop + 2, 5, wallH - 2, '#fffdf7')
    g.rect(x + 4, wallTop + 2, 1, wallH - 2, wallD)
    g.rect(x - 1, wallTop + 2, 7, 3, P.gold)
    g.px(x, wallTop + 5, P.goldD)
    g.px(x + 4, wallTop + 5, P.goldD)
    g.rect(x - 1, baseY - plinthH - 3, 7, 3, P.gold)
  }

  // --- front gable on top of the walls ---
  drawGable(g, cx, wallTop, gHalf, gableH, { face: P.redD, faceD: P.redDD })
  // Frame under the gable.
  g.hline(cx - gHalf, cx + gHalf, wallTop, P.goldD)
  g.hline(cx - gHalf, cx + gHalf, wallTop + 1, P.gold)

  // --- plinth ---
  const px0 = cx - halfW - 8
  g.rect(px0, baseY - plinthH, W + 16, plinthH, '#fffaf0')
  g.rect(px0, baseY - 2, W + 16, 2, '#dccfb8')
  g.rect(px0, baseY - plinthH, W + 16, 1, '#ffffff')
  g.rect(px0, baseY - 6, W + 16, 2, P.redD)
  for (let x = px0 + 2; x < px0 + W + 14; x += 4) g.px(x, baseY - 6, P.gold)
}

/** Front stairs with naga balustrades (บันไดนาค) descending from `topY`. */
export function drawNagaStairs(g: Surface, cx: number, topY: number, steps = 5, w = 26, nagaBody: Color = '#6cc36a', nagaScale: Color = '#ffd54f') {
  for (let i = 0; i < steps; i++) {
    const y = topY + i * 3
    const ext = i * 2
    g.rect(cx - w / 2 - ext, y, w + ext * 2, 3, i % 2 ? '#f0e6d6' : '#fffaf0')
    g.hline(cx - w / 2 - ext, cx + w / 2 + ext - 1, y + 2, '#d8c9b2')
  }
  const bottom = topY + steps * 3
  for (const side of [-1, 1]) {
    const x0 = cx + side * (w / 2 + 2)
    const x1 = cx + side * (w / 2 + steps * 2 + 3)
    // Body sloping down.
    g.line(x0, topY - 2, x1, bottom - 3, nagaBody)
    g.line(x0, topY - 1, x1, bottom - 2, nagaBody)
    g.line(x0, topY, x1, bottom - 1, mixHex(nagaBody, '#3a2838', 0.3))
    for (let t = 0; t < 1; t += 0.2) {
      const x = Math.round(x0 + (x1 - x0) * t)
      const y = Math.round(topY - 2 + (bottom - 1 - topY) * t)
      g.px(x, y, nagaScale)
    }
    // Raised head with a crest.
    const hx = x1
    const hy = bottom - 10
    g.rect(hx - 2, hy, 5, 8, nagaBody)
    g.rect(hx - 3, hy - 3, 7, 4, nagaScale)
    g.px(hx - 3, hy - 4, nagaScale)
    g.px(hx + 3, hy - 4, nagaScale)
    g.px(hx, hy - 5, nagaScale)
    g.px(hx - 1, hy + 1, P.ink)
    g.px(hx + 1, hy + 1, P.ink)
    g.px(hx, hy + 4, '#e8514a')
  }
}

export interface ChediOptions {
  gold?: boolean
  scale?: number
}

/** Bell-shaped stupa (เจดีย์ทรงระฆัง). `baseY` is the ground line. */
export function drawChedi(g: Surface, cx: number, baseY: number, o: ChediOptions = {}) {
  const s = o.scale ?? 1
  const body = o.gold ? '#f5c542' : '#fffaf0'
  const bodyD = o.gold ? '#d99a2b' : '#e3d8c6'
  const bodyL = o.gold ? '#fff09a' : '#ffffff'
  const band = o.gold ? '#b8742a' : P.gold
  let y = baseY
  // Square tiers.
  const tiers = [40, 34, 28].map((v) => Math.round(v * s))
  for (const tw of tiers) {
    const th = Math.round(5 * s)
    g.rect(cx - tw / 2, y - th, tw, th, body)
    g.rect(cx + tw / 2 - Math.round(4 * s), y - th, Math.round(4 * s), th, bodyD)
    g.hline(cx - tw / 2, cx + tw / 2 - 1, y - th, bodyL)
    g.hline(cx - tw / 2, cx + tw / 2 - 1, y - 1, band)
    y -= th
  }
  // Bell dome.
  const rw = Math.round(13 * s)
  const rh = Math.round(18 * s)
  dome(g, cx, y, rw, rh, bodyD)
  dome(g, cx - Math.round(2 * s), y, rw - Math.round(2 * s), rh - 1, body)
  dome(g, cx - Math.round(5 * s), y - Math.round(6 * s), Math.round(3 * s), Math.round(7 * s), bodyL)
  g.hline(cx - rw, cx + rw - 1, y - 1, band)
  g.hline(cx - rw + 1, cx + rw - 2, y - 2, bodyD)
  y -= rh
  // Harmika.
  const hw = Math.round(10 * s)
  g.rect(cx - hw / 2, y - Math.round(4 * s), hw, Math.round(4 * s), body)
  g.rect(cx + hw / 2 - Math.round(2 * s), y - Math.round(4 * s), Math.round(2 * s), Math.round(4 * s), bodyD)
  g.hline(cx - hw / 2, cx + hw / 2 - 1, y - Math.round(4 * s), band)
  y -= Math.round(4 * s)
  // Rings (ปล้องไฉน) in gold.
  for (let i = 0; i < 6; i++) {
    const rw2 = Math.round((8 - i) * s)
    const rh2 = Math.max(1, Math.round(2 * s))
    g.rect(cx - rw2 / 2, y - rh2, rw2, rh2, i % 2 ? P.goldD : P.gold)
    y -= rh2
  }
  // Spire.
  const sh = Math.round(12 * s)
  g.rect(cx - 1, y - sh, 2, sh, P.gold)
  g.px(cx, y - sh, P.goldD)
  g.circle(cx, y - sh - 1, Math.max(1, s), P.goldL)
}

/** Upper half of an ellipse standing on `baseY`. */
export function dome(g: Surface, cx: number, baseY: number, rx: number, ry: number, c: Color) {
  for (let yy = Math.floor(baseY - ry); yy < baseY; yy++) {
    const dy = (yy + 0.5 - baseY) / ry
    const half = rx * Math.sqrt(Math.max(0, 1 - dy * dy))
    const a = Math.round(cx - half)
    const b = Math.round(cx + half)
    if (b > a) g.rect(a, yy, b - a, 1, c)
  }
}

/** Small shrine pavilion for a deity (ศาลเทพ). */
export function drawShrine(
  g: Surface,
  cx: number,
  baseY: number,
  o: { w?: number; h?: number; roof?: RoofColors; pillar?: Color; floor?: Color; back?: Color } = {},
) {
  const w = o.w ?? 46
  const h = o.h ?? 40
  const roof = o.roof ?? ROOF_RED
  const pillar = o.pillar ?? '#fffaf0'
  const floor = o.floor ?? '#fffaf0'
  const back = o.back ?? '#7e2436'
  const hw = Math.round(w / 2)
  // Platform.
  g.rect(cx - hw - 4, baseY - 6, w + 8, 6, floor)
  g.rect(cx - hw - 4, baseY - 1, w + 8, 1, '#dccfb8')
  g.rect(cx - hw - 4, baseY - 6, w + 8, 1, '#ffffff')
  g.rect(cx - hw - 2, baseY - 4, w + 4, 1, P.gold)
  // Back wall (inside of the shrine).
  g.rect(cx - hw + 3, baseY - 6 - h, w - 6, h, back)
  g.rect(cx - hw + 3, baseY - 6 - h, w - 6, 2, mixHex(back, '#000000', 0.25))
  // Pillars.
  g.rect(cx - hw, baseY - 6 - h, 4, h, pillar)
  g.rect(cx + hw - 4, baseY - 6 - h, 4, h, pillar)
  g.rect(cx - hw - 1, baseY - 6 - h, 6, 2, P.gold)
  g.rect(cx + hw - 5, baseY - 6 - h, 6, 2, P.gold)
  // Roof.
  const top = baseY - 6 - h
  roofPlane(g, cx - hw - 6, top, cx, top - 16, 10, roof, 2)
  roofPlane(g, cx + hw + 6, top, cx, top - 16, 10, roof, 2)
  drawGable(g, cx, top, hw + 6, 16, { face: P.redD, faceD: P.redDD })
  g.hline(cx - hw - 6, cx + hw + 6, top, P.gold)
}
