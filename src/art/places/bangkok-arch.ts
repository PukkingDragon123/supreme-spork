// Bangkok group – reusable Thai architecture pieces at "landmark" scale:
// lit/tiled round masonry rows, gold bell domes, Khmer prang towers, square
// redented tiers, and a configurable grand ordination hall (อุโบสถ) used by
// several of the Bangkok temples.

import { ditherOn, mix, type Color, type Surface } from '../../engine/pixel'
import { P } from '../palette'
import { GOLD, WHITE, ROOF, roofBand, bargeBoard, chofa, hangHong, gable, column, crown, lacquerPanel, valance, nagaRail, type RoofRamp, type Building, type Pt } from '../temple'
import { bbuild, BK, hsh } from './bangkok'

/** Five-step light→dark ramp used by the lit row painters. */
export type Ramp5 = [Color, Color, Color, Color, Color]

export const GOLD5: Ramp5 = [GOLD.L, GOLD.l, GOLD.b, GOLD.d, GOLD.D]
export const WHITE5: Ramp5 = ['#ffffff', '#fffaf0', '#f0e6d4', '#dccab0', '#bfa98e']
export const STONE5: Ramp5 = ['#eeeae6', '#d6d0cb', '#bdb5af', '#9f9791', '#7d7571']
export const PORCELAIN5: Ramp5 = ['#ffffff', '#f4f2f8', '#e2dff0', '#c8c2dc', '#a29ab8']
export const JADE5: Ramp5 = ['#c8ffe0', '#7fe0a8', '#3fbf7a', '#2a9a60', '#1a6e46']

/** Pick a ramp colour for horizontal position u (-1 left … 1 right) with a light from the upper left. */
/** Shade value (0 = brightest … 4 = darkest) of a round surface at u (-1 left … 1 right). */
export function shadeAt(u: number, bias = 0): number {
  let v = 2.1 + 1.85 * u + bias
  // Soft specular band on the lit side.
  v -= 1.4 * Math.exp(-(((u + 0.42) / 0.2) ** 2))
  if (u < -0.88) v += 0.9 // rim on the far left edge
  return v
}

export function litColor(r: Ramp5, u: number, x: number, y: number, bias = 0): Color {
  const v = shadeAt(u, bias)
  const i = Math.floor(v)
  const f = v - i
  const k = ditherOn(x, y, f) ? i + 1 : i
  return r[Math.max(0, Math.min(4, k))]
}

/** One lit row of round masonry centred on cx. `tiles` adds a gold-mosaic grid. */
export function litRow(g: Surface, cx: number, y: number, half: number, r: Ramp5, o: { tiles?: boolean; bias?: number } = {}) {
  const x0 = Math.round(cx - half)
  const x1 = Math.round(cx + half)
  if (x1 <= x0) return
  for (let x = x0; x < x1; x++) {
    const u = (x + 0.5 - cx) / Math.max(0.5, half)
    let b = o.bias ?? 0
    if (o.tiles) {
      // Brick-bond grid of little gold tiles.
      const row = Math.floor(y / 3)
      if (y % 3 === 0) b += 0.75
      else if ((x + (row % 2) * 2) % 4 === 0) b += 0.55
      else if (y % 3 === 1 && (x + (row % 2) * 2) % 4 === 1) b -= 0.45
    }
    g.px(x, y, litColor(r, u, x, y, b))
  }
}

/** A dome/bell from baseY up to baseY-h; `shape` exponent controls the bell curve. */
export function bellDome(g: Surface, cx: number, baseY: number, halfW: number, h: number, r: Ramp5, shape = 2.4, tiles = false) {
  for (let i = 0; i < h; i++) {
    const t = (i + 0.5) / h
    const half = halfW * Math.sqrt(Math.max(0, 1 - Math.pow(t, shape)))
    litRow(g, cx, baseY - 1 - i, half, r, { tiles })
  }
}

/** Square redented tier (ย่อมุม) with a lit front and top lip. */
export function squareTier(g: Surface, cx: number, top: number, h: number, half: number, r: Ramp5, band?: Color) {
  const x0 = Math.round(cx - half)
  const x1 = Math.round(cx + half)
  for (let y = top; y < top + h; y++) {
    for (let x = x0; x < x1; x++) {
      const u = (x + 0.5 - cx) / half
      // Flat front face: mostly mid tone, shaded on the right third, lit strip at the left.
      let k = u < -0.8 ? 1 : u > 0.7 ? 3 : 2
      if (x === x0 + 2 || x === x1 - 3) k += 1 // redent grooves
      g.px(x, y, r[Math.min(4, k)])
    }
  }
  g.hline(x0, x1 - 1, top, r[0])
  if (band) g.hline(x0, x1 - 1, top + h - 1, band)
}

/** Stack of rings (ปล้องไฉน) tapering from `half0` to `half1`. Returns the top y. */
export function ringStack(g: Surface, cx: number, baseY: number, n: number, half0: number, half1: number, r: Ramp5, ringH = 3): number {
  let y = baseY
  for (let i = 0; i < n; i++) {
    const half = half0 + ((half1 - half0) * i) / Math.max(1, n - 1)
    for (let k = 0; k < ringH; k++) litRow(g, cx, y - k, half - (k === ringH - 1 ? 0.5 : 0), r, { bias: k === 0 ? 1 : k === ringH - 1 ? -0.6 : 0 })
    y -= ringH
  }
  return y
}

/** Tapering spire (ปลียอด) with a crystal ball on top; returns the tip point. */
export function spire(g: Surface, cx: number, baseY: number, h: number, half: number, r: Ramp5): Pt {
  for (let i = 0; i < h; i++) {
    const t = i / h
    litRow(g, cx, baseY - i, Math.max(0.5, half * (1 - t) + 0.4), r)
  }
  const ty = baseY - h
  g.px(cx - 1, ty, r[0])
  g.px(cx - 1, ty - 1, '#ffffff')
  g.px(cx, ty - 1, r[1])
  g.px(cx - 1, ty - 2, r[2])
  g.px(cx - 1, ty - 3, r[0])
  return { x: cx - 1, y: ty - 2 }
}

// ---------------------------------------------------------------------------
// Khmer prang (ปรางค์): corn-cob tower of stacked redented tiers with
// antefix leaves (กลีบขนุน) on every ledge.

export interface PrangStyle {
  body: Ramp5
  /** Porcelain speckle colours (Wat Arun) – omit for plain/gilded towers. */
  porcelain?: Color[]
  /** Ledge colour. */
  ledge?: Color
  leaf?: Color
  tiers?: number
  /** Draw guardian niches on the lowest tier. */
  niche?: Color
}

/** Corn-cob (bullet) profile: nearly upright sides that round off near the top. */
export function prangHalf(half0: number, t: number): number {
  return Math.max(1.2, half0 * (1 - 0.42 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(t / 0.98, 2.6))))
}

/** Draw a prang tower body from baseY up `h` pixels; returns glint points. */
export function prangTower(g: Surface, cx: number, baseY: number, h: number, half0: number, st: PrangStyle): Pt[] {
  const n = st.tiers ?? 7
  const glints: Pt[] = []
  const bodyH = Math.round(h * 0.84)
  // Tier heights shrink upwards.
  const hs: number[] = []
  let tot = 0
  for (let i = 0; i < n; i++) {
    const w = 1 - i * 0.07
    hs.push(w)
    tot += w
  }
  let y = baseY
  for (let i = 0; i < n; i++) {
    const th = Math.max(3, Math.round((hs[i] / tot) * bodyH))
    const t0 = (baseY - y) / bodyH
    for (let k = 0; k < th; k++) {
      const t = (baseY - y + k) / bodyH
      // Convex corn-cob profile.
      const half = prangHalf(half0, t)
      const yy = y - k
      litRow(g, cx, yy, half, st.body, { bias: k === th - 1 ? -0.7 : k < 2 ? 0.6 : 0 })
      // Vertical redent grooves.
      if (half > 5) {
        for (const s of [-0.55, 0.55]) g.px(Math.round(cx + s * half), yy, st.body[Math.min(4, 3)])
      }
      if (st.porcelain && k > 0 && k < th - 1) {
        for (let x = Math.round(cx - half) + 1; x < cx + half - 1; x++) {
          const v = hsh(x, yy, 11)
          if (v < 0.28) {
            if ((x + yy) % 3 === 0) g.px(x, yy, st.porcelain[Math.floor(v * 97) % st.porcelain.length])
          }
        }
        // Little porcelain flowers in rows.
        if (k === Math.floor(th / 2) && half > 4) {
          for (let x = Math.round(cx - half) + 2; x < cx + half - 2; x += 4) {
            const c = st.porcelain[(x + i) % st.porcelain.length]
            g.px(x, yy - 1, c)
            g.px(x - 1, yy, c)
            g.px(x + 1, yy, c)
            g.px(x, yy + 1, c)
            g.px(x, yy, GOLD.b)
          }
        }
      }
    }
    // Ledge and antefix leaves at the top of each tier.
    const tTop = (baseY - (y - th)) / bodyH
    const halfTop = prangHalf(half0, tTop)
    const ly = y - th
    g.hline(Math.round(cx - halfTop - 1), Math.round(cx + halfTop), ly, st.ledge ?? st.body[3])
    const leaf = st.leaf ?? st.body[1]
    if (halfTop > 2) {
      const lh = Math.max(2, Math.min(5, Math.round(th * 0.35)))
      // Corner antefixes (กลีบขนุน) jutting out of the silhouette.
      for (const s of [-1, 1]) {
        const lx = Math.round(cx + s * (halfTop + 0.5))
        for (let k = 1; k <= lh; k++) g.px(lx + (k > lh - 1 ? s : 0), ly - k, k === lh ? st.body[0] : leaf)
        g.px(lx - s, ly - 1, leaf)
      }
      // Smaller leaves along the ledge.
      const step = halfTop > 14 ? 6 : halfTop > 7 ? 5 : 100
      for (let x = Math.round(cx - halfTop) + step; x < cx + halfTop - 2; x += step) {
        for (let k = 1; k < lh; k++) g.px(x, ly - k, leaf)
        g.px(x + 1, ly - 1, st.body[3])
      }
      g.px(cx, ly - 1, leaf)
      g.px(cx, ly - 2, leaf)
      glints.push({ x: Math.round(cx - halfTop), y: ly - 2 })
    }
    if (i === 0 && st.niche && half0 > 8) {
      const nh = Math.max(5, Math.round(th * 0.7))
      g.rect(cx - 3, y - nh, 6, nh, st.niche)
      g.px(cx - 2, y - nh - 1, st.niche)
      g.px(cx + 1, y - nh - 1, st.niche)
      g.rect(cx - 1, y - nh + 2, 2, nh - 3, GOLD.b)
      g.px(cx - 1, y - nh + 1, GOLD.l)
    }
    void t0
    y -= th
  }
  // Finial: stepped cone and the trident (นภศูล).
  const fin = h - (baseY - y)
  for (let i = 0; i < Math.max(2, fin * 0.35); i++) litRow(g, cx, y - i, Math.max(0.5, 1.6 - i * 0.2), st.body)
  const ty = y - Math.round(fin * 0.35)
  g.vline(cx, ty - Math.round(fin * 0.65), ty, GOLD.b)
  g.vline(cx - 1, ty - Math.round(fin * 0.45), ty, GOLD.d)
  const tt = ty - Math.round(fin * 0.65)
  g.px(cx - 1, tt + 2, GOLD.l)
  g.px(cx + 1, tt + 2, GOLD.l)
  g.px(cx - 1, tt + 1, GOLD.l)
  g.px(cx + 1, tt + 1, GOLD.l)
  g.px(cx, tt - 1, GOLD.L)
  glints.push({ x: cx, y: tt })
  return glints
}

// ---------------------------------------------------------------------------
// Mosaic column: gold body with a lozenge pattern of coloured glass.

export function mosaicColumn(g: Surface, x: number, top: number, bottom: number, w = 4, glass: Color[] = ['#5ab8e8', '#e8514a', '#fffaf0']) {
  for (let y = top; y < bottom; y++) {
    for (let i = 0; i < w; i++) {
      const u = i / Math.max(1, w - 1)
      let c = u < 0.3 ? GOLD.l : u > 0.75 ? GOLD.d : GOLD.b
      const d = (i + y) % 4
      const e = (i - y + 64) % 4
      if (d === 0 || e === 0) c = u > 0.75 ? GOLD.D : GOLD.d
      if ((d === 2 && e === 2) || (y % 4 === 2 && i === Math.floor(w / 2))) c = glass[Math.floor(y / 4) % glass.length]
      g.px(x + i, y, c)
    }
  }
  // Lotus capital and base.
  g.rect(x - 1, top, w + 2, 1, GOLD.l)
  for (let i = -1; i <= w; i++) g.px(x + i, top + 1, (i & 1) === 0 ? GOLD.b : BK.redD)
  g.rect(x - 1, bottom - 3, w + 2, 1, GOLD.l)
  g.rect(x - 1, bottom - 2, w + 2, 2, GOLD.d)
}

// ---------------------------------------------------------------------------
// Grand ordination hall (configurable hallSprite).

export interface GrandHallOpts {
  key: string
  /** Main gable half width (the whole building grows with it). */
  hw: number
  roof?: RoofRamp
  roof2?: RoofRamp
  field?: Color
  fieldD?: Color
  field2?: Color
  field2D?: Color
  /** Wall colour behind the columns. */
  wall?: Color
  wallD?: Color
  cols?: 'white' | 'mosaic' | 'gold'
  frieze?: 'lotus' | 'garuda'
  doors?: 1 | 3
  night?: boolean
  /** Extra tier of roof between the porch and the main gable. */
  tiers?: 2 | 3
  stairs?: 'naga' | 'plain' | 'none'
  nagaColor?: Color
}

function lerpY(ax: number, ay: number, bx: number, by: number, x: number) {
  if (bx === ax) return ay
  const t = Math.max(0, Math.min(1, (x - ax) / (bx - ax)))
  return ay + (by - ay) * t
}

/**
 * Front view of a grand ubosot scaled by `hw`. Anchor = bottom centre of the
 * stairs. Hooks: bells, glints, windows, door, candles.
 */
export function grandHall(o: GrandHallOpts): Building {
  const hw = o.hw
  const k = hw / 48 // 1 = the size of the neighbourhood hall
  const R = (v: number) => Math.round(v * k)
  const W = Math.round(hw * 2 + 64 * k) + 4
  const H = R(166)
  const cx = W >> 1
  const night = !!o.night
  const roof = o.roof ?? ROOF.orange
  const roof2 = o.roof2 ?? roof
  const field = o.field ?? '#c23a3f'
  const fieldD = o.fieldD ?? '#7e2436'
  const field2 = o.field2 ?? '#3d63b5'
  const field2D = o.field2D ?? '#26306e'
  const wall = o.wall ?? WHITE.d
  const wallD = o.wallD ?? WHITE.D
  const tiers = o.tiers ?? 2
  return bbuild(`ghall:${o.key}:${night ? 1 : 0}`, W, H, cx, H - 2, (g, hooks) => {
    const glints: Pt[] = []
    const bells: Pt[] = []
    const windows: Pt[] = []
    const A2 = R(22)
    const B2 = R(74)
    const HW2 = hw
    const A1 = R(58)
    const B1 = R(96)
    const HW1 = Math.round(hw * 0.82)
    const colTop = B1 + 4
    const floor = R(136)
    const plat0 = floor + 1
    const plat1 = floor + R(14)
    const ground = H - 2
    // Roof mass backing.
    g.poly(
      [
        [cx, A2 - 8],
        [cx + HW2 + R(26), B2 + R(26)],
        [cx + HW2 + R(20), B2 + R(28)],
        [cx - HW2 - R(20), B2 + R(28)],
        [cx - HW2 - R(26), B2 + R(26)],
      ],
      fieldD,
    )
    // Main roof.
    roofBand(g, cx, A2, cx - HW2, B2, R(11), roof2)
    roofBand(g, cx, A2, cx + HW2, B2, R(11), roof2)
    g.vline(cx, A2 - R(11), A2, GOLD.D)
    chofa(g, cx, A2 - R(11), R(7), 1)
    glints.push({ x: cx + 1, y: A2 - R(18) })
    for (const s of [-1, 1]) {
      const ax = cx + s * (HW2 - R(6))
      const ay = Math.round(lerpY(cx, A2, cx + s * HW2, B2, ax)) + 3
      const bx = cx + s * (HW2 + R(14))
      const by = B2 + R(12)
      roofBand(g, ax, ay, bx, by, R(8), roof)
      bargeBoard(g, ax, ay, bx, by, 3)
      hangHong(g, bx + s, by + 1, s)
      glints.push({ x: bx + s * 3, y: by - 3 })
      bells.push({ x: bx + s, y: by + 4 })
      const cx2 = cx + s * (HW2 + R(2))
      const cy2 = B2 + R(12)
      const dx2 = cx + s * (HW2 + R(24))
      const dy2 = B2 + R(25)
      roofBand(g, cx2, cy2, dx2, dy2, R(8), roof)
      bargeBoard(g, cx2, cy2, dx2, dy2, 3)
      hangHong(g, dx2 + s, dy2 + 1, s)
      glints.push({ x: dx2 + s * 3, y: dy2 - 3 })
      bells.push({ x: dx2 + s, y: dy2 + 4 })
    }
    glints.push(...gable(g, cx, A2, HW2, B2, { field: field2, fieldD: field2D, sparkA: '#8fb6ff', sparkB: '#ffd6e0', motif: 'emblem' }))
    if (tiers === 3) {
      // Middle tier between main and porch.
      const Am = Math.round((A2 + A1) / 2) + 2
      const Bm = Math.round((B2 + B1) / 2) + 2
      const HWm = Math.round((HW2 + HW1) / 2)
      roofBand(g, cx, Am, cx - HWm, Bm, R(8), roof)
      roofBand(g, cx, Am, cx + HWm, Bm, R(8), roof)
      glints.push(...gable(g, cx, Am, HWm, Bm, { field, fieldD, sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'emblem' }))
    }
    roofBand(g, cx, A1, cx - HW1, B1, R(8), roof)
    roofBand(g, cx, A1, cx + HW1, B1, R(8), roof)
    g.vline(cx, A1 - R(8), A1, GOLD.D)
    glints.push(...gable(g, cx, A1, HW1, B1, { field, fieldD, sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'narai' }))
    bells.push({ x: cx - HW1 - 2, y: B1 + 4 }, { x: cx + HW1 + 2, y: B1 + 4 })
    // Walls.
    const wallL = cx - HW2 - R(20)
    const wallR = cx + HW2 + R(20)
    g.rect(wallL, B1 + 1, wallR - wallL, floor - B1 - 1, wall)
    g.rect(wallL, B1 + 1, wallR - wallL, 3, mix(wallD, '#3a2838', 0.25))
    g.rect(wallL, B1 + 4, wallR - wallL, 2, wallD)
    g.rect(wallL, B1 + 1, R(18), floor - B1 - 1, mix(wallD, '#b8a3c8', 0.2))
    g.rect(wallR - R(18), B1 + 1, R(18), floor - B1 - 1, mix(wallD, '#b8a3c8', 0.2))
    if (o.cols === 'mosaic' || o.cols === 'gold') {
      // Gilded wall with a diaper of glass flowers.
      for (let y = B1 + 7; y < floor - 3; y += 4)
        for (let x = wallL + R(20); x < wallR - R(20); x += 4) {
          g.px(x + ((y >> 2) % 2) * 2, y, GOLD.d)
          if ((x + y) % 12 === 0) g.px(x + ((y >> 2) % 2) * 2, y + 1, '#5ab8e8')
        }
    }
    // Beams.
    g.rect(cx - HW1 - 4, B1, (HW1 + 4) * 2 + 1, 1, GOLD.l)
    g.rect(cx - HW1 - 4, B1 + 1, (HW1 + 4) * 2 + 1, 2, P.redD)
    for (let x = cx - HW1 - 2; x < cx + HW1 + 4; x += 3) g.px(x, B1 + 1, GOLD.d)
    g.rect(cx - HW1 - 4, B1 + 3, (HW1 + 4) * 2 + 1, 1, GOLD.D)
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? wallL : cx + HW1 + 5
      const x1 = s < 0 ? cx - HW1 - 5 : wallR - 1
      g.rect(x0, B2 + R(26), x1 - x0 + 1, 1, GOLD.l)
      g.rect(x0, B2 + R(27), x1 - x0 + 1, 2, P.redD)
      g.rect(x0, B2 + R(29), x1 - x0 + 1, 1, GOLD.D)
    }
    // Doors.
    const dw = R(12)
    const dh = R(24)
    const doorXs = o.doors === 3 ? [cx, cx - R(30), cx + R(30)] : [cx]
    for (const x of doorXs) {
      const main = x === cx
      const w = main ? dw : R(10)
      const h = main ? dh : R(21)
      const dx = Math.round(x - w / 2)
      const dy = floor - h
      crown(g, x, dy - 1, w + 6, main ? R(12) : R(10))
      lacquerPanel(g, dx, dy, w, h, night, 2)
      g.rect(dx - 2, dy - 1, 1, h + 1, GOLD.D)
      g.rect(dx + w + 1, dy - 1, 1, h + 1, GOLD.D)
      if (!main) windows.push({ x, y: dy + h / 2 })
    }
    hooks.door = [{ x: cx, y: floor - dh / 2 }]
    // Windows.
    const wxs = o.doors === 3 ? [cx - R(57), cx + R(57)] : [cx - R(25), cx + R(25), cx - R(57), cx + R(57)]
    for (const wx of wxs) {
      const ww = Math.abs(wx - cx) > 40 * k ? R(6) : R(8)
      const wy = floor - R(22)
      crown(g, wx, wy - 1, ww + 4, R(8))
      lacquerPanel(g, Math.round(wx - ww / 2), wy, ww, R(13), night, 2)
      windows.push({ x: wx, y: wy + 6 })
    }
    // Columns.
    const colXs = [cx - R(14), cx + R(11), cx - R(38), cx + R(35)]
    const colW = Math.max(4, R(4))
    for (const x of colXs) {
      if (o.cols === 'mosaic') mosaicColumn(g, x, colTop, floor, colW)
      else if (o.cols === 'gold') mosaicColumn(g, x, colTop, floor, colW, [GOLD.l, GOLD.b])
      else column(g, x, colTop, floor, colW)
    }
    for (const x of [cx - R(67), cx + R(64)]) {
      if (o.cols === 'mosaic') mosaicColumn(g, x, B2 + R(30), floor, colW)
      else column(g, x, B2 + R(30), floor, colW)
    }
    valance(g, cx - R(33), cx - R(15), colTop - 1)
    valance(g, cx + R(15), cx + R(34), colTop - 1)
    valance(g, cx - R(62), cx - R(40), B2 + R(30))
    valance(g, cx + R(40), cx + R(63), B2 + R(30))
    for (const s of [-1, 1]) {
      const bx = s < 0 ? cx - R(67) : cx + R(67)
      g.line(bx, B2 + R(34), bx + s * 4, B2 + R(29), GOLD.d)
      g.px(bx + s * 4, B2 + R(28), GOLD.l)
    }
    // Platform with lotus mouldings and a frieze.
    const px0 = cx - HW2 - R(26)
    const pw = (HW2 + R(26)) * 2 + 1
    g.rect(px0 + 2, floor - 1, pw - 4, 2, '#f6eedd')
    g.hline(px0 + 2, px0 + pw - 3, floor - 1, WHITE.L)
    g.rect(px0, plat0, pw, plat1 - plat0, WHITE.b)
    g.hline(px0, px0 + pw - 1, plat0, WHITE.L)
    for (let x = px0; x < px0 + pw; x++) {
      const m = (x - px0) % 3
      g.px(x, plat0 + 1, m === 1 ? GOLD.l : WHITE.d)
      g.px(x, plat0 + 2, m === 1 ? GOLD.d : WHITE.D)
      g.px(x, plat1 - 3, m === 1 ? GOLD.d : WHITE.D)
      g.px(x, plat1 - 2, m === 1 ? GOLD.l : WHITE.d)
    }
    const fy0 = plat0 + 3
    const fy1 = plat1 - 3
    g.rect(px0, fy0, pw, fy1 - fy0, P.redD)
    g.hline(px0, px0 + pw - 1, fy0, P.redDD)
    if (o.frieze === 'garuda') {
      // Rows of little gold garudas gripping green nagas (ครุฑยุดนาค).
      for (let x = px0 + 3; x < px0 + pw - 3; x += 6) {
        const my = fy0 + Math.floor((fy1 - fy0) / 2)
        g.px(x, my - 2, GOLD.L)
        g.rect(x - 1, my - 1, 3, 3, GOLD.b)
        g.px(x - 2, my - 2, GOLD.d)
        g.px(x + 2, my - 2, GOLD.d)
        g.px(x - 3, my - 3, GOLD.b)
        g.px(x + 3, my - 3, GOLD.b)
        g.px(x - 1, my + 2, '#5cbf73')
        g.px(x + 1, my + 2, '#5cbf73')
      }
    } else {
      for (let x = px0 + 1; x < px0 + pw; x += 4) {
        g.px(x, fy0 + 2, GOLD.b)
        g.px(x + 1, fy0 + 1, GOLD.d)
        g.px(x - 1, fy0 + 1, GOLD.d)
      }
    }
    g.rect(px0, plat1 - 1, pw, 1, WHITE.D)
    g.vline(px0 + 3, plat0, plat1 - 1, WHITE.d)
    g.vline(px0 + pw - 4, plat0, plat1 - 1, WHITE.D)
    // Stairs.
    if (o.stairs !== 'none') {
      const steps = 6
      const stepH = (ground - floor) / steps
      for (let i = 0; i < steps; i++) {
        const y = Math.round(floor + 1 + i * stepH)
        const y2 = Math.round(floor + 1 + (i + 1) * stepH)
        const half = R(10) + Math.round(i * 0.8)
        g.rect(cx - half, y, half * 2 + 1, y2 - y, WHITE.b)
        g.hline(cx - half, cx + half, y, WHITE.L)
        g.hline(cx - half, cx + half, y2 - 1, WHITE.D)
      }
      if (o.stairs === 'naga') for (const s of [-1, 1]) nagaRail(g, cx + s * (R(10) + 2), floor - 4, cx + s * (R(10) + 6), ground, s, o.nagaColor)
      else
        for (const s of [-1, 1]) {
          g.line(cx + s * (R(10) + 1), floor - 2, cx + s * (R(10) + 5), ground - 1, WHITE.D)
          g.line(cx + s * (R(10) + 2), floor - 2, cx + s * (R(10) + 6), ground - 1, WHITE.b)
        }
    }
    for (const s of [-1, 1]) {
      g.rect(cx + s * R(9) - 1, floor - 5, 3, 5, GOLD.d)
      g.rect(cx + s * R(9) - 1, floor - 5, 3, 1, GOLD.l)
      g.px(cx + s * R(9), floor - 7, '#ffd6e0')
    }
    hooks.glints = glints
    hooks.bells = bells
    hooks.windows = windows
    hooks.candles = [
      { x: cx - R(9), y: floor - 8 },
      { x: cx + R(9), y: floor - 8 },
    ]
    hooks.floor = [{ x: cx, y: floor }]
  })
}
