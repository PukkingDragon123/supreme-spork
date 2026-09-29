// พระปฐมเจดีย์ (นครปฐม): the world's tallest stupa – a colossal bell-shaped
// chedi clad in orange-gold glazed tiles, ringed by a circular cloister
// (พระระเบียง) with viharns at the cardinal points. The north viharn houses
// พระร่วงโรจนฤทธิ์, a gilded standing Buddha. Below: gardens, a turtle pond
// and the temple fair with its famous ข้าวหลาม and pomelo stalls.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { GOLD, WHITE, ROOF, roofBand, bargeBoard, hangHong, chofa, gable, column, crown, lacquerPanel, valance, nagaRail, type Building, type Pt } from '../temple'
import type { Prop } from '../props'
import { GOLD_RAMP } from '../hall'
import { block, building, Cap, clamp01, dth, Ell, hash, lathe, prop, RAMPS, sculpted, stallProp, type Prim } from './central'

// ---------------------------------------------------------------------------
// The great chedi.

export const PATHOM_CHEDI = { W: 244, H: 336 }

/**
 * พระปฐมเจดีย์. Anchor = front of the lowest base ring (bottom centre).
 * Hooks: glints (spire, crown, dome highlights).
 */
export function pathomChediSprite(night = false): Building {
  const { W, H } = PATHOM_CHEDI
  return building(`pathomchedi:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W / 2
    const glaze = night ? RAMPS.glazeNight : RAMPS.glaze
    const glazeLo = glaze.slice(0, 8)
    const gold = RAMPS.gold
    const glints: Pt[] = []
    // --- terrace wall and base (ฐานประทักษิณ) ---
    const baseTop = H - 44
    // Top surface of the base ring (seen from above).
    g.ellipse(cx, baseTop + 1, 116, 9, glaze[4])
    g.ellipse(cx, baseTop + 1, 113, 7.5, glaze[6])
    g.ellipse(cx - 20, baseTop, 70, 4.5, glaze[7])
    // Base drum with lotus mouldings.
    lathe(g, cx, baseTop + 2, H - 12, () => 116, glazeLo, { rowH: 3, cols: 40, spec: 0.1, ambient: 0.2 })
    for (let x = cx - 115; x < cx + 115; x += 3) {
      const u = (x - cx) / 116
      const lit = u < 0.3
      g.px(x, baseTop + 6, lit ? gold[6] : gold[3])
      g.px(x + 1, baseTop + 5, lit ? gold[5] : gold[2])
      g.px(x, H - 22, lit ? gold[5] : gold[2])
    }
    g.hline(cx - 116, cx + 115, baseTop + 2, glaze[8])
    g.hline(cx - 116, cx + 115, H - 24, glaze[2])
    g.hline(cx - 116, cx + 115, H - 20, glaze[7])
    // Lower plinth (white, with little niches).
    block(g, cx, H - 12, 11, 122, RAMPS.white)
    for (let x = cx - 116; x < cx + 116; x += 12) {
      g.rect(x + 3, H - 9, 5, 7, '#9a8a9a')
      g.rect(x + 4, H - 8, 3, 6, night ? '#ffcf7a' : '#6a5a72')
      g.px(x + 5, H - 10, GOLD.d)
    }
    g.hline(cx - 122, cx + 121, H - 2, RAMPS.white[2])
    // --- garland rings (มาลัยเถา) at the foot of the bell ---
    const ringTop = baseTop - 18
    const rings: [number, number, number][] = [
      [ringTop + 12, 6, 108],
      [ringTop + 6, 6, 104],
      [ringTop, 6, 100],
    ]
    for (const [top, h, r] of rings) {
      lathe(g, cx, top, top + h, (y) => r + 2.6 * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - top - h / 2) / (h / 2)) ** 2)), glaze, { spec: 0.5, specPow: 10, cols: 48 })
      g.ellipse(cx - 10, top, r * 0.9, 2, glaze[8])
    }
    // --- the bell (องค์ระฆัง) ---
    const domeTop = ringTop - 104
    const domeBot = ringTop + 1
    const Hd = domeBot - domeTop
    const R = 98
    const domeR = (y: number) => {
      const v = (y - domeTop) / Hd
      if (v < 0 || v > 1) return 0
      let r = R * Math.sqrt(Math.max(0, 1 - (1 - v) * (1 - v)))
      if (v > 0.84) r += ((v - 0.84) / 0.16) ** 2 * 5
      return r
    }
    lathe(g, cx, domeTop, domeBot, domeR, glaze, { rowH: 3, cols: 44, sparkle: 0.05, seed: 7, spec: 0.42, specPow: 14, ambient: 0.1 })
    // A gold band (รัดอก) round the shoulder of the bell.
    const bandY = domeTop + 30
    for (let y = bandY; y < bandY + 3; y++) {
      const r = domeR(y)
      for (let x = Math.round(cx - r) + 1; x < cx + r - 1; x++) {
        const u = (x + 0.5 - cx) / r
        const v = clamp01(0.78 - u * 0.55 - (y - bandY) * 0.12 + dth(x, y) * 0.15)
        g.px(x, y, gold[Math.round(v * (gold.length - 1))])
      }
    }
    for (let x = Math.round(cx - domeR(bandY + 3)) + 3; x < cx + domeR(bandY + 3) - 3; x += 6) {
      g.px(x, bandY + 3, gold[4])
      g.px(x, bandY + 4, gold[2])
    }
    // Specular glints to animate.
    glints.push({ x: cx - 44, y: domeTop + 40 }, { x: cx - 30, y: domeTop + 22 }, { x: cx - 58, y: domeTop + 64 }, { x: cx - 12, y: domeTop + 12 }, { x: cx + 30, y: domeTop + 48 })
    // --- neck rings and the harmika (บัลลังก์) ---
    const neckBot = domeTop + 8
    lathe(g, cx, neckBot - 6, neckBot, () => 36, glaze, { spec: 0.4, cols: 20, shift: 1 })
    g.ellipse(cx - 4, neckBot - 6, 34, 2.2, glaze[8])
    const hBot = neckBot - 6
    const hTop = hBot - 28
    block(g, cx, hTop + 5, 23, 30, glaze)
    // Redented panels on the harmika face.
    for (const s of [-1, 1]) {
      g.vline(cx + s * 22, hTop + 7, hBot - 3, s < 0 ? glaze[8] : glaze[3])
      g.vline(cx + s * 12, hTop + 7, hBot - 3, s < 0 ? glaze[7] : glaze[4])
    }
    g.rect(cx - 8, hTop + 10, 16, 12, glaze[3])
    g.rect(cx - 7, hTop + 11, 14, 10, glaze[5])
    for (let i = 0; i < 3; i++) g.hline(cx - 6, cx + 5, hTop + 13 + i * 3, glaze[7])
    // Cornice.
    block(g, cx, hTop, 5, 34, gold)
    block(g, cx, hTop + 4, 2, 32, glaze, false)
    g.hline(cx - 34, cx + 33, hTop + 5, glaze[1])
    // --- colonnade (เสาหาน) ---
    const colBot = hTop
    const colTop = colBot - 16
    lathe(g, cx, colTop, colBot, () => 20, glaze.slice(0, 5), { ambient: 0.3, diffuse: 0.5, spec: 0 })
    for (let k = -4; k <= 4; k++) {
      const a = (k / 4.6) * (Math.PI / 2)
      const x = Math.round(cx + Math.sin(a) * 20)
      const w = Math.max(1, Math.round(3 * Math.cos(a)))
      const lit = clamp01(0.75 - Math.sin(a) * 0.5)
      for (let y = colTop + 2; y < colBot - 1; y++) for (let i = 0; i < w; i++) g.px(x + i - (w >> 1), y, glaze[Math.round(3 + lit * 6)])
    }
    block(g, cx, colTop - 2, 3, 24, gold)
    // --- rings of the spire (ปล้องไฉน) ---
    const spBot = colTop - 2
    const spTop = spBot - 88
    lathe(g, cx, spTop, spBot, (y) => 3.6 + ((y - spTop) / (spBot - spTop)) * 12.6, glaze, { rowH: 4, spec: 0.5, specPow: 8, ambient: 0.16, sparkle: 0.04, seed: 3 })
    // --- golden bud (ปลี) and crown (มงกุฎ) ---
    const pTop = spTop - 26
    lathe(g, cx, pTop, spTop, (y) => 0.8 + ((y - pTop) / (spTop - pTop)) * 3, gold, { spec: 0.6, specPow: 6 })
    // Crown at the very top.
    const cTop = pTop - 16
    lathe(g, cx, cTop + 6, pTop + 1, (y) => 1.5 + Math.sin(((y - cTop - 6) / 11) * Math.PI) * 3.2, gold, { spec: 0.6, specPow: 6 })
    for (let i = 0; i < 6; i++) g.px(cx - 0.5, cTop + i, i < 2 ? gold[7] : gold[5])
    g.px(cx - 2, cTop + 8, gold[7])
    g.px(cx + 2, cTop + 8, gold[3])
    glints.push({ x: cx, y: cTop + 1 }, { x: cx - 1, y: pTop + 8 }, { x: cx - 5, y: spTop + 30 }, { x: cx - 8, y: spBot - 10 })
    hooks.glints = glints
    hooks.top = [{ x: cx, y: cTop }]
  })
}

// ---------------------------------------------------------------------------
// Cloister gallery (พระระเบียงคด) around the chedi, drawn column by column
// along an ellipse so it curves naturally in the 3/4 view.

export interface Ring {
  cx: number
  cy: number
  rx: number
  ry: number
  /** Radial depth of the gallery floor (px). */
  depth: number
}

const GAL_WALL = 13
const GAL_ROOF = 11

/** y of the outer front edge of the ring at x (lower half), or NaN. */
export function ringFront(r: Ring, x: number, inner = false): number {
  const rx = inner ? r.rx - r.depth : r.rx
  const ry = inner ? r.ry - r.depth * 0.7 : r.ry
  const u = (x - r.cx) / rx
  if (Math.abs(u) > 1) return NaN
  return r.cy + ry * Math.sqrt(1 - u * u)
}

function galleryColumn(g: Surface, x: number, base: number, ox: number, oy: number, night: boolean, idx: number) {
  const X = x - ox
  const B = base - oy
  // Outer wall with a red dado and little windows.
  for (let y = B - GAL_WALL; y <= B; y++) {
    let c: Color = WHITE.b
    if (y > B - 4) c = y === B ? '#7e2436' : '#b8343f'
    else if (y === B - GAL_WALL) c = WHITE.DD
    else if (y === B - GAL_WALL + 1) c = WHITE.D
    g.px(X, y, c)
  }
  const k = idx % 9
  if (k >= 3 && k <= 5) {
    for (let y = B - GAL_WALL + 4; y < B - 5; y++) g.px(X, y, night ? (k === 4 ? '#fff0b8' : '#ffcf7a') : k === 4 ? '#5a3d4f' : '#6e4a60')
    g.px(X, B - GAL_WALL + 3, GOLD.d)
  }
  if (k === 0) g.px(X, B - 5, GOLD.d)
  // Gold eave trim.
  g.px(X, B - GAL_WALL - 1, GOLD.b)
  // Roof: tile rows, green border at the eave, gold ridge on top.
  const r = ROOF.orange
  for (let j = 1; j <= GAL_ROOF; j++) {
    const y = B - GAL_WALL - 1 - j
    let c: Color = r.field
    if (j <= 2) c = j === 1 ? r.borderD : r.border
    else if (j % 3 === 0) c = r.fieldD
    else if ((idx + (j >> 1)) % 5 === 0) c = r.fieldL
    g.px(X, y, c)
  }
  g.px(X, B - GAL_WALL - GAL_ROOF - 2, GOLD.l)
  g.px(X, B - GAL_WALL - GAL_ROOF - 3, GOLD.D)
}

export interface Strip {
  sprite: Prop
  x: number
  y: number
}

/**
 * Front arcs of the gallery as narrow sprites (so they y-sort correctly),
 * skipping the x ranges in `gaps` (the north viharn and stair openings).
 */
export function galleryStrips(r: Ring, gaps: [number, number][], night: boolean): Strip[] {
  const out: Strip[] = []
  let x = Math.ceil(r.cx - r.rx) + 1
  const x1 = Math.floor(r.cx + r.rx) - 1
  let idx = 0
  while (x < x1) {
    if (gaps.some(([a, b]) => x >= a && x < b)) {
      x++
      idx++
      continue
    }
    // Grow the strip while its base stays within 3 px and no gap starts.
    const start = x
    const y0 = ringFront(r, x)
    let end = x + 1
    while (end < x1 && end - start < 12 && Math.abs(ringFront(r, end) - y0) <= 3 && !gaps.some(([a, b]) => end >= a && end < b)) end++
    let maxY = -Infinity
    let minY = Infinity
    for (let i = start; i < end; i++) {
      const b = Math.round(ringFront(r, i))
      maxY = Math.max(maxY, b)
      minY = Math.min(minY, b)
    }
    const top = minY - GAL_WALL - GAL_ROOF - 4
    const h = maxY - top + 2
    const w = end - start
    const i0 = idx
    const sp = prop(`gal:${r.cx}:${r.cy}:${r.rx}:${start}:${night ? 1 : 0}`, w, h, 0, h - 2, (g) => {
      for (let i = start; i < end; i++) galleryColumn(g, i, Math.round(ringFront(r, i)), start, top, night, i0 + (i - start))
    }, false)
    out.push({ sprite: sp, x: start, y: maxY })
    idx += w
    x = end
  }
  return out
}

/** Back arcs of the gallery (inner colonnade facing the chedi), baked into the ground. */
export function bakeGalleryBack(g: Surface, r: Ring, night: boolean) {
  for (let x = Math.ceil(r.cx - r.rx) + 1; x < r.cx + r.rx - 1; x++) {
    const u = (x - r.cx) / r.rx
    const base = Math.round(r.cy - r.ry * Math.sqrt(1 - u * u) + 10)
    const i = x - Math.ceil(r.cx - r.rx)
    // Shadowy inner walkway behind white columns.
    for (let y = base - GAL_WALL; y <= base; y++) g.px(x, y, y > base - 3 ? '#c9b69a' : night ? '#4a3a58' : '#8a6a70')
    if (i % 7 < 2) for (let y = base - GAL_WALL; y <= base - 1; y++) g.px(x, y, i % 7 === 0 ? WHITE.b : WHITE.D)
    // Mural glimpses between the columns.
    if (i % 7 === 4) g.px(x, base - 8, night ? '#b89a60' : '#c9a04c')
    const rr = ROOF.orange
    for (let j = 1; j <= GAL_ROOF - 2; j++) g.px(x, base - GAL_WALL - j, j <= 1 ? rr.borderD : j === 2 ? rr.border : j % 3 === 0 ? rr.fieldD : rr.field)
    g.px(x, base - GAL_WALL - GAL_ROOF + 1, GOLD.l)
  }
}

/** Ends of the east/west viharns peeking in at the sides of the ring. */
export function sideViharnSprite(flip: boolean, night = false): Building {
  const W = 44
  const H = 62
  return building(`pathom-sideviharn:${flip ? 1 : 0}:${night ? 1 : 0}`, W, H, flip ? 8 : W - 8, H - 1, (g, hooks) => {
    const cx = flip ? 14 : W - 14
    const s = flip ? 1 : -1
    // Wall and door facing the chedi.
    g.rect(cx - 13, 34, 26, 26, WHITE.b)
    g.rect(cx - 13, 34, 26, 2, WHITE.D)
    g.rect(cx + s * 6 - 13, 34, 13, 26, WHITE.d)
    lacquerPanel(g, cx - 4, 44, 8, 15, night, 2)
    crown(g, cx, 43, 12, 8)
    g.rect(cx - 15, 58, 30, 3, '#b8343f')
    // Roof tiers, seen end-on.
    roofBand(g, cx, 8, cx - 20, 34, 8, ROOF.orange)
    roofBand(g, cx, 8, cx + 20, 34, 8, ROOF.orange)
    const gl = gable(g, cx, 8, 17, 34, { field: '#b8343f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'emblem', thick: 2 })
    hooks.glints = gl
    hooks.bells = [
      { x: cx - 20, y: 38 },
      { x: cx + 20, y: 38 },
    ]
  })
}

// ---------------------------------------------------------------------------
// The north viharn (วิหารพระร่วงโรจนฤทธิ์), facing the visitor.

export const VIHARN = { W: 156, H: 132, door: { w: 18, h: 34 } }

export function pathomViharnSprite(night = false): Building {
  const { W, H } = VIHARN
  return building(`pathom-viharn:${night ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const cx = W >> 1
    const glints: Pt[] = []
    const bells: Pt[] = []
    const A = 6
    const B = 58
    const HW = 46
    const floor = 104
    // Roof mass behind the gables.
    g.poly(
      [
        [cx, A - 4],
        [cx + HW + 30, B + 18],
        [cx - HW - 30, B + 18],
      ],
      '#7e2436',
    )
    roofBand(g, cx, A, cx - HW, B, 12, ROOF.orange)
    roofBand(g, cx, A, cx + HW, B, 12, ROOF.orange)
    for (const s of [-1, 1]) {
      const ax = cx + s * (HW - 4)
      const ay = B - 3
      const bx = cx + s * (HW + 26)
      const by = B + 16
      roofBand(g, ax, ay, bx, by, 9, ROOF.orange)
      bargeBoard(g, ax, ay, bx, by, 3)
      hangHong(g, bx + s, by + 1, s)
      glints.push({ x: bx + s * 3, y: by - 3 })
      bells.push({ x: bx + s, y: by + 4 })
    }
    glints.push(...gable(g, cx, A, HW, B, { field: '#b8343f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'narai' }))
    chofa(g, cx, A, 8, 1)
    // Porch shade and walls.
    const wl = cx - HW - 24
    const wr = cx + HW + 24
    g.rect(wl, B + 17, wr - wl, floor - B - 17, WHITE.d)
    g.rect(wl, B + 17, wr - wl, 4, WHITE.DD)
    g.rect(wl, B + 21, wr - wl, 2, WHITE.D)
    // Beam.
    g.rect(wl, B + 16, wr - wl, 1, GOLD.l)
    g.rect(wl, B + 17, wr - wl, 2, P.redD)
    // Tall open doorway with the golden standing Buddha glimpsed inside.
    const dw = VIHARN.door.w
    const dh = VIHARN.door.h
    const dx = cx - dw / 2
    const dy = floor - dh
    g.rect(dx - 2, dy - 2, dw + 4, dh + 2, GOLD.d)
    g.rect(dx, dy, dw, dh, night ? '#6a3a2a' : '#4a2a2a')
    for (let y = dy; y < floor; y++) for (let x = dx; x < dx + dw; x++) if (hash(x, y, 4) < 0.08) g.px(x, y, '#5a3432')
    // Glimpse: robe, raised hand and halo glow.
    const bx = cx
    g.ellipse(bx, dy + 7, 6, 6, night ? '#a8742a' : '#8a5a22')
    g.rect(bx - 4, dy + 10, 8, dh - 10, GOLD.D)
    g.rect(bx - 3, dy + 10, 3, dh - 10, GOLD.d)
    g.rect(bx - 2, dy + 11, 1, dh - 12, GOLD.b)
    g.circle(bx, dy + 5, 3, GOLD.d)
    g.px(bx - 1, dy + 4, GOLD.l)
    g.px(bx, dy + 1, GOLD.b)
    g.rect(bx + 4, dy + 12, 2, 5, GOLD.d)
    g.px(bx + 5, dy + 11, GOLD.l)
    crown(g, cx, dy - 2, dw + 10, 14)
    hooks.door = [{ x: cx, y: floor }]
    // Windows.
    for (const wx of [cx - 32, cx + 32, cx - 58, cx + 58]) {
      const ww = Math.abs(wx - cx) > 40 ? 6 : 8
      const wy = floor - 24
      crown(g, wx, wy - 1, ww + 4, 8)
      lacquerPanel(g, wx - ww / 2, wy, ww, 14, night, 2)
    }
    // Square pillars with gold stencil.
    for (const x of [cx - 20, cx + 16, cx - 45, cx + 41]) column(g, x, B + 20, floor, 5, WHITE.b, WHITE.D)
    for (const x of [cx - 72, cx + 68]) column(g, x, B + 22, floor, 4)
    valance(g, cx - 40, cx - 21, B + 19)
    valance(g, cx + 21, cx + 41, B + 19)
    // Platform with red lotus band.
    const px0 = wl - 2
    const pw = wr - wl + 4
    g.rect(px0, floor, pw, 12, WHITE.b)
    g.hline(px0, px0 + pw - 1, floor, WHITE.L)
    g.rect(px0, floor + 3, pw, 4, P.redD)
    for (let x = px0 + 1; x < px0 + pw; x += 4) {
      g.px(x, floor + 5, GOLD.b)
      g.px(x + 1, floor + 4, GOLD.d)
    }
    g.hline(px0, px0 + pw - 1, floor + 11, WHITE.D)
    // Broad stairs.
    const steps = 5
    for (let i = 0; i < steps; i++) {
      const y = floor + 12 + i * 3
      const half = 18 + i * 2
      g.rect(cx - half, y, half * 2 + 1, 3, WHITE.b)
      g.hline(cx - half, cx + half, y, WHITE.L)
      g.hline(cx - half, cx + half, y + 2, WHITE.D)
    }
    for (const s of [-1, 1]) nagaRail(g, cx + s * 20, floor + 6, cx + s * 30, H - 1, s, '#43a86a')
    hooks.glints = glints
    hooks.bells = bells
    hooks.candles = [
      { x: cx - 13, y: floor - 6 },
      { x: cx + 13, y: floor - 6 },
    ]
    for (const s of [-1, 1]) {
      g.rect(cx + s * 13 - 1, floor - 4, 3, 4, GOLD.d)
      g.px(cx + s * 13, floor - 5, WHITE.b)
    }
  })
}

// ---------------------------------------------------------------------------
// Terrace pieces.

/** Chinese stone statues brought as ship ballast (ตุ๊กตาหินจีน). */
export function stoneStatueSprite(kind: 'lion' | 'warrior' | 'sage', flip = false): Prop {
  const S = RAMPS.stone
  return prop(`pathom-stone:${kind}:${flip ? 1 : 0}`, 18, 30, 9, 29, (g) => {
    // Plinth.
    g.rect(2, 24, 14, 5, S[5])
    g.hline(2, 15, 24, S[7])
    g.rect(12, 24, 4, 5, S[3])
    if (kind === 'lion') {
      // Seated shishi with a curly mane and a ball.
      g.ellipse(9, 18, 5, 6, S[5])
      g.ellipse(8, 17, 3, 4, S[6])
      g.circle(9, 9, 5, S[5])
      g.circle(8, 8, 3.4, S[6])
      for (let i = 0; i < 8; i++) g.px(5 + ((i * 3) % 9), 5 + ((i * 5) % 8), S[3])
      g.px(7, 9, P.ink)
      g.px(11, 9, P.ink)
      g.rect(8, 11, 3, 1, S[2])
      g.circle(flip ? 5 : 13, 22, 2, S[4])
      g.px(flip ? 4 : 12, 21, S[7])
    } else if (kind === 'warrior') {
      g.rect(5, 12, 8, 12, S[5])
      g.rect(5, 12, 3, 12, S[6])
      g.rect(11, 12, 2, 12, S[3])
      g.rect(4, 16, 10, 2, S[3])
      g.circle(9, 8, 3.6, S[6])
      g.rect(5, 3, 8, 3, S[4])
      g.px(9, 2, S[4])
      g.px(8, 8, P.ink)
      g.px(10, 8, P.ink)
      g.vline(flip ? 3 : 14, 4, 23, S[3])
      g.px(flip ? 3 : 14, 3, S[6])
    } else {
      // Long-robed sage with a beard and a staff.
      g.poly(
        [
          [5, 12],
          [13, 12],
          [15, 24],
          [3, 24],
        ],
        S[5],
      )
      g.poly(
        [
          [5, 12],
          [8, 12],
          [7, 24],
          [3, 24],
        ],
        S[6],
      )
      g.circle(9, 8, 3.6, S[6])
      g.rect(8, 10, 3, 4, S[7])
      g.px(8, 7, P.ink)
      g.px(10, 7, P.ink)
      g.rect(7, 3, 5, 2, S[4])
      g.vline(flip ? 2 : 15, 6, 23, '#8a6a4a')
      g.circle(flip ? 2 : 15, 5, 1.4, '#c9a04c')
    }
  })
}

/** Replica of the original (pre-1853) chedi with its prang top. */
export function oldChediReplicaSprite(): Prop {
  return prop('pathom-replica', 30, 52, 15, 51, (g) => {
    block(g, 15, 44, 7, 14, RAMPS.white)
    lathe(g, 15, 26, 44, (y) => 8 + ((y - 26) / 18) * 3, RAMPS.glaze, { rowH: 3 })
    // Prang tower.
    for (let y = 6; y < 26; y++) {
      const f = (26 - y) / 20
      const half = Math.max(1, 6 * Math.pow(1 - f, 0.5))
      for (let x = Math.round(15 - half); x < 15 + half; x++) {
        const u = (x + 0.5 - 15) / half
        g.px(x, y, RAMPS.stone[Math.round(clamp01(0.7 - u * 0.4 - ((y % 4 === 0) ? 0.2 : 0)) * 8)])
      }
    }
    g.vline(15, 0, 6, GOLD.b)
    g.px(15, 0, GOLD.L)
  })
}

// ---------------------------------------------------------------------------
// Shops of the temple fair.

/** ข้าวหลาม & ส้มโอนครชัยศรี stall: bamboo tubes over coals and pomelo pyramids. */
export function khaoLamStallSprite(): Prop {
  return stallProp('pathom-khaolam', {
    w: 52,
    awning: ['#6cc36a', '#fffaf0'],
    counter: '#b0803a',
    goods(g, x0, y, w) {
      // Bamboo tubes standing in a rack (left).
      for (let i = 0; i < 4; i++) {
        const x = x0 + 3 + i * 3
        const h = 14 - (i % 3)
        g.rect(x, y - h, 2, h, i % 2 ? '#9ab85a' : '#b8c86a')
        g.px(x, y - h, '#e8e0b8')
        g.px(x + 1, y - h, '#fffaf0')
        g.px(x, y - h + 4, '#6a8a3a')
        g.px(x, y - h + 9, '#6a8a3a')
      }
      // Grilled (blackened) tubes lying on the counter.
      for (let i = 0; i < 3; i++) {
        g.rect(x0 + 2, y + 3 + i * 2, 18, 2, i % 2 ? '#4a3a2a' : '#6a5238')
        g.px(x0 + 20, y + 3 + i * 2, '#fffaf0')
      }
      // Pomelo pyramid (right).
      const px = x0 + w - 9
      const pom = ['#c8d86a', '#b4c85a', '#dde88a']
      for (let r = 0; r < 3; r++)
        for (let i = 0; i <= 2 - r; i++) {
          const cx = px - (2 - r) * 3 + i * 6 - 3
          const cy = y - 1 - r * 5
          g.circle(cx, cy, 3.2, pom[(r + i) % 3])
          g.px(cx - 1, cy - 1, '#f4f8c0')
        }
      // Pomelo segments on a plate and a stack of wrapped khao lam.
      g.ellipse(x0 + 28, y + 1, 5, 1.6, '#fffaf0')
      g.circle(x0 + 26, y, 1.6, '#ffb8c0')
      g.circle(x0 + 30, y, 1.6, '#ff9fb0')
      g.px(x0 + 25, y - 1, '#ffe0e4')
      g.rect(x0 + 24, y + 5, 10, 2, '#9ab85a')
      g.rect(x0 + 24, y + 7, 10, 2, '#b8c86a')
      g.px(x0 + 33, y + 5, '#fffaf0')
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.rect(cx - 5, y + 1, 2, 3, '#9ab85a')
      g.rect(cx - 2, y + 1, 2, 3, '#9ab85a')
      g.circle(cx + 3, y + 2, 2, '#c8d86a')
    },
  })
}

/** Balloon-dart game booth (ปาลูกโป่ง) with teddy prizes. */
export function fairGameStallSprite(): Prop {
  return stallProp('pathom-fairgame', {
    w: 50,
    awning: ['#e8514a', '#ffd23f'],
    counter: '#5a8de0',
    goods(g, x0, y, w) {
      // Balloon board at the back.
      g.rect(x0 + 4, y - 14, w - 8, 12, '#fff1d6')
      const cols = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#ffb35a', '#c8a0ff']
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 7; i++) {
          const bx = x0 + 7 + i * 6 + (r % 2) * 3
          const by = y - 12 + r * 4
          if (bx > x0 + w - 6) continue
          g.circle(bx, by, 1.6, cols[(r * 3 + i) % cols.length])
          g.px(bx - 1, by - 1, '#ffffff')
        }
      // Teddy prizes on the counter.
      for (let i = 0; i < 3; i++) {
        const tx = x0 + 8 + i * 16
        const c = ['#c9a06a', '#ff9fc0', '#fffaf0'][i]
        g.circle(tx, y + 2, 3, c)
        g.circle(tx - 2, y - 1, 1.2, c)
        g.circle(tx + 2, y - 1, 1.2, c)
        g.circle(tx, y + 6, 3.4, c)
        g.px(tx - 1, y + 2, P.ink)
        g.px(tx + 1, y + 2, P.ink)
      }
      // Darts.
      for (let i = 0; i < 3; i++) g.line(x0 + w - 12 + i * 2, y + 4, x0 + w - 10 + i * 2, y + 1, '#3a3040')
    },
    sign(g, cx, y) {
      g.rect(cx - 7, y - 1, 14, 6, '#fffaf0')
      g.circle(cx - 3, y + 2, 2, '#ff6f91')
      g.circle(cx + 2, y + 2, 2, '#6cf0c0')
    },
  })
}

/** Garland & lotus stand at the viharn stairs. */
export function lotusStandSprite(): Prop {
  return stallProp('pathom-lotus', {
    w: 36,
    awning: ['#ff9fc0', '#fffaf0'],
    goods(g, x0, y) {
      for (let i = 0; i < 6; i++) {
        const x = x0 + 4 + i * 5
        g.vline(x, y - 6, y, '#43905a')
        g.ellipse(x, y - 8, 2, 3, i % 2 ? '#ff9fc0' : '#ffd6e0')
        g.px(x, y - 11, '#e8709e')
      }
      for (let i = 0; i < 4; i++) {
        const x = x0 + 5 + i * 8
        g.circle(x, y + 5, 2.6, '#fffaf0')
        g.px(x, y + 5, '#ffd23f')
        g.px(x + 1, y + 7, '#e8514a')
      }
    },
  })
}

/** Pedicab (สามล้อ) parked outside the gate. Anchor = bottom centre. */
export function samlorSprite(): Prop {
  return prop('pathom-samlor', 40, 30, 20, 29, (g) => {
    const wheel = (x: number, y: number, r: number) => {
      g.circle(x, y, r, '#3a3040')
      g.circle(x, y, r - 1, '#9a90a8')
      g.circle(x, y, r - 2, '#3a3040')
      g.px(x, y, '#e4ddd6')
      for (let a = 0; a < 6; a++) g.px(x + Math.cos(a) * (r - 1.5), y + Math.sin(a) * (r - 1.5), '#c9c3d6')
    }
    // Passenger seat with a folding hood.
    g.rect(3, 12, 16, 8, '#e8514a')
    g.rect(3, 12, 16, 2, '#ff8a7a')
    g.rect(4, 20, 14, 2, '#7e2436')
    for (let i = 0; i < 8; i++) g.hline(2 + Math.round(i * 0.4), 18 - Math.round(i * 0.3), 4 + i, i % 3 === 0 ? '#3a3040' : '#5a5068')
    g.rect(18, 4, 2, 16, '#3a3040')
    // Frame to the front wheel and the rider's saddle.
    g.line(18, 22, 33, 16, '#3d63b5')
    g.line(24, 12, 30, 22, '#3d63b5')
    g.rect(22, 10, 5, 2, '#3a3040')
    g.line(33, 16, 35, 8, '#8c8187')
    g.rect(33, 7, 5, 2, '#3a3040')
    wheel(6, 25, 4)
    wheel(16, 25, 4)
    wheel(33, 25, 4)
  })
}

/** Small gate pavilion (ซุ้มประตูพระระเบียง) at the cloister openings. */
export function cloisterGateSprite(): Building {
  return building('pathom-cloistergate', 30, 46, 15, 45, (g, hooks) => {
    for (const x of [2, 24]) {
      g.rect(x, 20, 4, 24, WHITE.b)
      g.rect(x, 20, 1, 24, WHITE.L)
      g.rect(x + 3, 20, 1, 24, WHITE.D)
      g.rect(x - 1, 41, 6, 4, WHITE.d)
      g.rect(x, 26, 4, 10, '#b8343f')
      g.px(x + 1, 30, GOLD.b)
      g.px(x + 2, 31, GOLD.b)
    }
    // Arch.
    for (let x = 6; x < 24; x++) {
      const t = (x - 6) / 17
      const y = 22 - Math.round(Math.sin(t * Math.PI) * 5)
      g.vline(x, 17, y, WHITE.b)
      g.px(x, y, GOLD.b)
      g.px(x, y + 1, GOLD.D)
    }
    g.rect(0, 15, 30, 3, WHITE.d)
    g.hline(0, 29, 15, WHITE.L)
    // Roof.
    roofBand(g, 15, 2, 1, 15, 6, ROOF.orange)
    roofBand(g, 15, 2, 29, 15, 6, ROOF.orange)
    hooks.glints = gable(g, 15, 2, 12, 15, { field: '#b8343f', fieldD: '#7e2436', sparkA: '#ff8a7a', sparkB: '#8fb6ff', motif: 'none', thick: 2 })
    hooks.bells = [
      { x: 0, y: 17 },
      { x: 29, y: 17 },
    ]
  })
}

/** Turtle for the pond (baked sprite drawn by life systems). */
export function drawTurtle(g: Surface, x: number, y: number, t: number, flip: boolean) {
  const k = flip ? -1 : 1
  const bob = Math.round(Math.sin(t * 2 + x) * 0.5)
  g.ellipse(x, y + bob, 4, 2.6, '#5a7a3a')
  g.ellipse(x - 0.5, y - 0.5 + bob, 3, 1.8, '#7a9a4a')
  g.px(x - 1, y - 1 + bob, '#a8c870')
  g.px(x + 1, y + bob, '#4a6a2a')
  g.rect(x + k * 4, y - 1 + bob, 2, 2, '#8aa860')
  g.px(x + k * 5, y - 1 + bob, P.ink)
  g.px(x - k * 3, y + 2 + bob, '#8aa860')
  g.px(x + k * 2, y + 2 + bob, '#8aa860')
}

// ---------------------------------------------------------------------------
// Interior: พระร่วงโรจนฤทธิ์, the gilded standing Buddha (ปางห้ามญาติ).

function standingBuddhaPrims(): Prim[] {
  return [
    // Feet and the flared robe hem.
    Ell(-4.2, 1.2, 4, 3.6, 1.6, 4.4, 1),
    Ell(4.2, 1.2, 4, 3.6, 1.6, 4.4, 1),
    Ell(0, 6.5, 0.5, 11.6, 3.4, 7.2, 2),
    // Lower robe (antaravasaka) as a slim column.
    Cap([0, 6, 0], [0, 47, 0.5], 10.4, 9.2, 2, 0, 0.72),
    // Upper robe and torso, broad shoulders.
    Cap([0, 46, 0.5], [0, 70, 0.5], 9.4, 12.2, 3, 0, 0.66),
    Ell(0, 71.4, 0.5, 14.2, 4.8, 7.4, 3),
    // Neck and head.
    Cap([0, 72, 1], [0, 78.4, 1.4], 3.6, 3.2, 4),
    Ell(0, 84.8, 1.6, 6.8, 7.8, 6.4, 5),
    Ell(0, 80.2, 3.2, 4.1, 3.1, 4.4, 5),
    Cap([-6, 88, 0.4], [-6.6, 80.6, 1], 0.9, 1.4, 6),
    Cap([6, 88, 0.4], [6.6, 80.6, 1], 0.9, 1.4, 6),
    // Ushnisha and the flame finial (Sukhothai).
    Ell(0, 91.8, 1, 4.4, 3.4, 4, 7),
    Cap([0, 93.6, 1], [0, 104.5, 1], 2.1, 0.3, 8),
    // Left arm hanging, hand by the thigh.
    Cap([-12.8, 70, 0], [-15.2, 55, 1.2], 3.4, 2.8, 9),
    Cap([-15.2, 55, 1.2], [-14.6, 43, 2.4], 2.8, 2.3, 9),
    Ell(-14.4, 40.6, 2.8, 2.2, 3.2, 2, 10),
    // Right arm raised in abhaya: palm facing out at shoulder height.
    Cap([12.8, 70, 0], [16.4, 57.2, 2], 3.4, 2.9, 11),
    Cap([16.4, 57.2, 2], [15.2, 68.6, 7.6], 2.7, 2.3, 11),
    Ell(15, 72.2, 8.6, 2.8, 3.8, 1.4, 12),
    // Robe drape falling from the left arm.
    Cap([-11, 62, 1.6], [-12.4, 18, 2], 2.2, 3.4, 13, 0, 0.6),
  ]
}

/** The gilded standing Buddha (local origin = between the feet). */
export function standingBuddha(s: number) {
  const q = Math.round(s * 40) / 40
  return sculpted(`standing-buddha:${q}`, () => ({
    prims: standingBuddhaPrims(),
    s: q,
    x0: -20,
    x1: 20,
    y0: -1,
    y1: 106,
    ramps: [GOLD_RAMP],
    rim: 0.22,
    ambient: 0.02,
    spec: [12, 0.5],
    detail(d) {
      // Robe edges, pleats and the sash.
      d.curve(-10, 10, (x) => 8.6 + 0.012 * x * x, -2)
      for (const px of [-5, 0, 5]) d.line(px, 10, px * 0.8, 44, -1)
      d.curve(-9.4, 9.4, (x) => 47 + 0.02 * x * x, -2)
      d.line(-12, 70, 6, 48, -2)
      d.line(-11.4, 69, 7, 48.6, 1)
      // Face: brows, downcast eyes, nose and smile.
      d.curve(-4.6, -0.8, (x) => 86.4 + 0.9 * (1 - ((x + 2.7) / 1.9) ** 2), -2)
      d.curve(0.8, 4.6, (x) => 86.4 + 0.9 * (1 - ((x - 2.7) / 1.9) ** 2), -2)
      d.curve(-4, -1.4, (x) => 84.2 - 0.12 * (x + 2.7) * (x + 2.7), -3)
      d.curve(1.4, 4, (x) => 84.2 - 0.12 * (x - 2.7) * (x - 2.7), -3)
      d.line(0.5, 85.6, 0.5, 82.4, -1)
      d.line(-1.4, 80.3, 1.4, 80.3, -2)
      // Hair curls.
      d.each((i, j, lx, ly, part) => {
        if ((part === 5 && ly > 88.4 - 0.03 * lx * lx) || part === 7) if ((i + j) % 2 === 0) d.add(i, j, -1)
      })
      // Fingers of the raised palm.
      d.line(14, 74.6, 14, 71.4, -1)
      d.line(15.8, 74.8, 15.8, 71.6, -1)
      d.line(-0.6, 101, -0.6, 95, 1)
    },
  }))
}

/** Tall gilded niche (ซุ้มเรือนแก้ว) behind the standing Buddha. */
export function drawBuddhaNiche(g: Surface, cx: number, baseY: number, w: number, h: number, night = false) {
  const top = baseY - h
  // Deep red backdrop with a gold starfield.
  for (let y = top; y < baseY; y++) {
    const half = y < top + w / 2 ? (w / 2) * Math.sqrt(Math.max(0, 1 - ((top + w / 2 - y) / (w / 2)) ** 2)) : w / 2
    g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, y % 2 ? '#7e2436' : '#8a2a3c')
  }
  for (let i = 0; i < 70; i++) {
    const x = cx - w / 2 + 3 + hash(i, 3) * (w - 6)
    const y = top + w / 3 + hash(i, 9) * (h - w / 3 - 4)
    g.px(x, y, i % 3 ? GOLD.d : GOLD.l)
  }
  // Gold frame with flame tips (กระหนก).
  for (let y = top; y < baseY; y++) {
    const half = y < top + w / 2 ? (w / 2) * Math.sqrt(Math.max(0, 1 - ((top + w / 2 - y) / (w / 2)) ** 2)) : w / 2
    g.rect(Math.round(cx - half) - 3, y, 3, 1, GOLD.b)
    g.rect(Math.round(cx + half), y, 3, 1, GOLD.d)
    if (y % 5 === 0) {
      g.px(Math.round(cx - half) - 4, y, GOLD.l)
      g.px(Math.round(cx + half) + 3, y, GOLD.D)
    }
  }
  for (let i = -3; i <= 3; i++) g.px(cx + i, top - 2 - (3 - Math.abs(i)), GOLD.l)
  g.px(cx, top - 7, GOLD.L)
  if (night) for (let i = 0; i < 12; i++) g.px(cx - w / 2 + hash(i, 1) * w, top + w / 2 + hash(i, 2) * 20, GOLD.L)
}

/** Octagonal gold lotus pedestal for the standing image. */
export function drawLotusPedestal(g: Surface, cx: number, topY: number, w: number, h: number) {
  const gold = RAMPS.gold
  for (let y = 0; y < h; y++) {
    const half = w / 2 - Math.abs(y - h * 0.35) * 0.4
    for (let x = Math.round(cx - half); x < cx + half; x++) {
      const u = (x + 0.5 - cx) / half
      let v = 0.56 - u * 0.34
      if (y % 4 === 0) v -= 0.18
      g.px(x, topY + y, gold[Math.round(clamp01(v + dth(x, topY + y) * 0.2) * (gold.length - 1))])
    }
  }
  // Petals.
  for (let x = Math.round(cx - w / 2) + 2; x < cx + w / 2 - 2; x += 4) {
    g.px(x, topY + 2, GOLD.L)
    g.px(x + 1, topY + 1, GOLD.l)
    g.px(x - 1, topY + h - 2, GOLD.D)
  }
  g.rect(Math.round(cx - w / 2) - 4, topY + h, w + 8, 5, '#b8343f')
  g.hline(Math.round(cx - w / 2) - 4, Math.round(cx + w / 2) + 3, topY + h, '#e8514a')
  for (let x = Math.round(cx - w / 2) - 3; x < cx + w / 2 + 3; x += 3) g.px(x, topY + h + 2, GOLD.d)
}
