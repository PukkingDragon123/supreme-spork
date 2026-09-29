// Parametric Central-Thai viharn / ubosot façade for the historic places:
// stepped front gables (1–3 tiers), side wing eaves (ปีกนก), porch columns
// with valances, a door painter (lacquer, mother-of-pearl, gilded), windows,
// a lotus-moulded platform and naga stairs. Anchor = bottom centre of the
// stairs. Hooks: bells, glints, windows, door, candles.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, bargeBoard, column, crown, gable, hangHong, lacquerPanel, nagaRail, roofBand, valance, chofa, type GableStyle, type RoofRamp } from '../temple'
import { build, type Building, type Pt } from './historic'

export type DoorPainter = (g: Surface, x: number, y: number, w: number, h: number, night: boolean) => void

export interface ViharnOpts {
  key: string
  /** Width of the wall body (the platform is wider). */
  w: number
  /** Stepped front gables, 1–3. */
  tiers: number
  roof: RoofRamp
  /** Roof of the rear (upper) tiers. */
  roofBack?: RoofRamp
  gable: GableStyle
  gableBack?: GableStyle
  wall?: Color
  wallD?: Color
  /** Porch columns (pairs are placed symmetrically). */
  cols?: number
  colBody?: Color
  colShade?: Color
  night?: boolean
  /** Platform height. */
  base?: number
  /** Height of the wall under the eaves. */
  wallH?: number
  /** Gable pitch (height / half width). */
  pitch?: number
  door?: DoorPainter
  doorW?: number
  doorH?: number
  /** Windows per side of the door. */
  windows?: number
  nagas?: boolean
  nagaColor?: Color
  /** Extra space above the apex (chofa). */
  headroom?: number
}

/** Gold-framed lacquer door (default). */
export const lacquerDoor: DoorPainter = (g, x, y, w, h, night) => lacquerPanel(g, x, y, w, h, night, 2)

export function viharnSprite(o: ViharnOpts): Building {
  const night = !!o.night
  const w = o.w
  const nT = Math.max(1, Math.min(3, o.tiers))
  const pitch = o.pitch ?? 0.78
  const base = o.base ?? 12
  const wallH = o.wallH ?? 38
  const W = w + 30
  const cx = Math.floor(W / 2)
  // Tier geometry from the front (lowest) to the back (highest).
  const hwFront = Math.round(w * 0.3)
  const tiers: { hw: number; apex: number; baseY: number }[] = []
  const stairsD = 12
  const H0 = 400
  const gy = H0 - 2
  const floor = gy - base - stairsD + 4
  const colTop = floor - wallH
  let bY = colTop - 3
  let hw = hwFront
  for (let i = 0; i < nT; i++) {
    tiers.push({ hw, apex: Math.round(bY - hw * pitch), baseY: bY })
    bY -= Math.round(16 + hw * 0.12)
    hw = Math.round(hw + w * 0.05)
  }
  const top = tiers[nT - 1].apex - (o.headroom ?? 14)
  const H = H0 - top
  const dy = -top
  return build(`viharn:${o.key}:${night ? 1 : 0}`, W, H, cx, gy + dy, (g, hooks) => {
    const Y = (v: number) => v + dy
    const glints: Pt[] = []
    const bells: Pt[] = []
    const windows: Pt[] = []
    const roof = o.roof
    const roofB = o.roofBack ?? roof
    const wall = o.wall ?? WHITE.d
    const wallD = o.wallD ?? WHITE.D
    const back = tiers[nT - 1]
    // Roof mass backing.
    g.poly(
      [
        [cx, Y(back.apex) - 6],
        [cx + back.hw + 28, Y(colTop) + 2],
        [cx - back.hw - 28, Y(colTop) + 2],
      ],
      (o.gableBack ?? o.gable).fieldD,
    )
    // Rear tiers first.
    for (let i = nT - 1; i >= 0; i--) {
      const t = tiers[i]
      const r = i === 0 ? roof : roofB
      roofBand(g, cx, Y(t.apex), cx - t.hw, Y(t.baseY), 10, r)
      roofBand(g, cx, Y(t.apex), cx + t.hw, Y(t.baseY), 10, r)
      g.vline(cx, Y(t.apex) - 9, Y(t.apex), GOLD.D)
      if (i === nT - 1) chofa(g, cx, Y(t.apex) - 9, 7, 1)
      // Wing eaves under this tier.
      for (const s of [-1, 1]) {
        const ax = cx + s * (t.hw - 6)
        const ay = Y(t.baseY) + 2
        const bx = cx + s * (t.hw + 14 + (nT - 1 - i) * 3)
        const by = Math.min(Y(colTop) + 3, ay + 14)
        roofBand(g, ax, ay, bx, by, 8, r)
        bargeBoard(g, ax, ay, bx, by, 3)
        hangHong(g, bx + s, by + 1, s)
        glints.push({ x: bx + s * 3, y: by - 3 })
        bells.push({ x: bx + s, y: by + 4 })
      }
      glints.push(...gable(g, cx, Y(t.apex), t.hw, Y(t.baseY), i === 0 ? o.gable : (o.gableBack ?? o.gable)))
    }
    // Lowest verandah eaves down to the wall corners.
    for (const s of [-1, 1]) {
      const ax = cx + s * (hwFront + 2)
      const ay = Y(tiers[0].baseY) + 6
      const bx = cx + s * (w / 2 + 12)
      const by = Y(colTop) + 6
      roofBand(g, ax, ay, bx, by, 8, roof)
      bargeBoard(g, ax, ay, bx, by, 3)
      hangHong(g, bx + s, by + 1, s)
      bells.push({ x: bx + s, y: by + 4 })
      glints.push({ x: bx + s * 3, y: by - 3 })
    }
    // Walls under the eaves.
    const wl = cx - Math.round(w / 2)
    const wr = cx + Math.round(w / 2)
    g.rect(wl, Y(colTop) + 4, wr - wl, floor - colTop - 4, wall)
    g.rect(wl, Y(colTop) + 4, wr - wl, 3, mixHex(wallD, '#6a5a6a', 0.3))
    g.rect(wl, Y(colTop) + 7, wr - wl, 2, wallD)
    // Porch beam.
    const bx0 = cx - hwFront - 4
    const bx1 = cx + hwFront + 4
    g.rect(bx0, Y(colTop), bx1 - bx0 + 1, 1, GOLD.l)
    g.rect(bx0, Y(colTop) + 1, bx1 - bx0 + 1, 2, P.redD)
    for (let x = bx0 + 2; x < bx1; x += 3) g.px(x, Y(colTop) + 1, GOLD.d)
    g.rect(bx0, Y(colTop) + 3, bx1 - bx0 + 1, 1, GOLD.D)
    // Door.
    const dw = o.doorW ?? 12
    const dh = o.doorH ?? Math.min(26, wallH - 12)
    const dx = cx - Math.floor(dw / 2)
    const dyy = Y(floor) - dh
    crown(g, cx, dyy - 1, dw + 6, 12)
    ;(o.door ?? lacquerDoor)(g, dx, dyy, dw, dh, night)
    g.rect(dx - 2, dyy - 1, 1, dh + 1, GOLD.D)
    g.rect(dx + dw + 1, dyy - 1, 1, dh + 1, GOLD.D)
    hooks.door = [{ x: cx, y: dyy + dh / 2 }]
    // Windows.
    const nW = o.windows ?? 2
    for (let i = 0; i < nW; i++) {
      for (const s of [-1, 1]) {
        const wx = cx + s * Math.round(dw / 2 + 12 + i * ((w / 2 - dw / 2 - 16) / Math.max(1, nW)))
        const ww = 7
        const wy = Y(floor) - 22
        crown(g, wx, wy - 1, ww + 4, 8)
        lacquerPanel(g, wx - Math.floor(ww / 2), wy, ww, 12, night, 2)
        windows.push({ x: wx, y: wy + 6 })
      }
    }
    // Columns and valances.
    const nC = o.cols ?? 4
    const colXs: number[] = []
    for (let i = 0; i < nC / 2; i++) {
      const off = Math.round(dw / 2 + 5 + i * ((hwFront * 2 - dw) / Math.max(1, nC - 1)))
      colXs.push(cx - off - 4, cx + off)
    }
    colXs.sort((a, b) => a - b)
    for (const x of colXs) column(g, x, Y(colTop) + 4, Y(floor), 4, o.colBody ?? WHITE.b, o.colShade ?? WHITE.D)
    for (let i = 0; i + 1 < colXs.length; i++) {
      if (Math.abs(colXs[i] + 2 - cx) < dw / 2 + 2 && Math.abs(colXs[i + 1] + 2 - cx) < dw / 2 + 2) continue
      const a = colXs[i] + 5
      const b = colXs[i + 1] - 1
      if (a < cx && b > cx) continue
      valance(g, a, b, Y(colTop) + 3)
    }
    // Platform with lotus mouldings.
    const px0 = cx - Math.round(w / 2) - 8
    const pw = w + 17
    const p0 = Y(floor) + 1
    const p1 = p0 + base
    g.rect(px0 + 2, Y(floor) - 1, pw - 4, 2, '#f6eedd')
    g.rect(px0, p0, pw, base, WHITE.b)
    g.hline(px0, px0 + pw - 1, p0, WHITE.L)
    for (let x = px0; x < px0 + pw; x++) {
      const k = (x - px0) % 3
      g.px(x, p0 + 1, k === 1 ? GOLD.l : WHITE.d)
      g.px(x, p0 + 2, k === 1 ? GOLD.d : WHITE.D)
      if (base > 9) {
        g.px(x, p1 - 4, k === 1 ? GOLD.d : WHITE.D)
        g.px(x, p1 - 3, k === 1 ? GOLD.l : WHITE.d)
      }
    }
    if (base > 9) {
      g.rect(px0, p0 + 3, pw, Math.max(1, base - 7), P.redD)
      g.hline(px0, px0 + pw - 1, p0 + 3, P.redDD)
      for (let x = px0 + 1; x < px0 + pw; x += 4) g.px(x, p0 + 4, GOLD.b)
    }
    g.hline(px0, px0 + pw - 1, p1 - 1, WHITE.D)
    // Stairs with naga balustrades.
    const steps = 5
    const ground = Y(gy)
    const stepH = (ground - Y(floor)) / steps
    for (let i = 0; i < steps; i++) {
      const y0 = Math.round(Y(floor) + 1 + i * stepH)
      const y1 = Math.round(Y(floor) + 1 + (i + 1) * stepH)
      const half = 9 + Math.round(i * 0.8)
      g.rect(cx - half, y0, half * 2 + 1, y1 - y0, WHITE.b)
      g.hline(cx - half, cx + half, y0, WHITE.L)
      g.hline(cx - half, cx + half, y1 - 1, WHITE.D)
    }
    if (o.nagas !== false) for (const s of [-1, 1]) nagaRail(g, cx + s * 11, Y(floor) - 4, cx + s * 15, ground, s, o.nagaColor)
    // Candles and flowers at the door.
    for (const s of [-1, 1]) {
      g.rect(cx + s * 8 - 1, Y(floor) - 5, 3, 5, GOLD.d)
      g.rect(cx + s * 8 - 1, Y(floor) - 5, 3, 1, GOLD.l)
      g.px(cx + s * 8, Y(floor) - 7, '#ffd6e0')
    }
    hooks.glints = glints
    hooks.bells = bells
    hooks.windows = windows
    hooks.candles = [
      { x: cx - 8, y: Y(floor) - 8 },
      { x: cx + 8, y: Y(floor) - 8 },
    ]
    hooks.floor = [{ x: cx, y: Y(floor) }]
  })
}
