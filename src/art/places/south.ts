// Shared art for the southern places (group `south`): a prop builder with
// animation hooks, colour ramps, big shade trees, street stalls and vendor
// carts, people-sized statues and ground painters. Place-specific art lives in
// south_nst.ts, south_aikhai.ts, south_phuket.ts; interiors in south_interior.ts.

import { bake, ditherOn, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas } from '../../engine/sprite'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, WHITE, ROOF, slice, tier, roofBand, bargeBoard, hangHong, type Building, type Pt, type Ramp, type RoofRamp } from '../temple'
import { canopy, LEAVES, type LeafRamp } from '../garden'

export { GOLD, WHITE, ROOF, slice, tier }
export type { Building, Pt, Ramp }

// ---------------------------------------------------------------------------
// Ramps.

export const WHITE_R: Ramp = { L: '#ffffff', b: '#fffaf0', d: '#ece0cc', D: '#d2bfa2' }
export const MARBLE_R: Ramp = { L: '#ffffff', b: '#f4f2f4', d: '#dcd8e0', D: '#b8b2c4' }
export const GOLD_R: Ramp = { L: GOLD.L, b: GOLD.b, d: GOLD.d, D: GOLD.D }
export const RED_R: Ramp = { L: P.redL, b: P.red, d: P.redD, D: P.redDD }
export const BRICK_R: Ramp = { L: '#e8a07a', b: '#c8704c', d: '#a4543a', D: '#7a3a2c' }
export const BRONZE_R: Ramp = { L: '#f0cf78', b: '#c9a04c', d: '#9c7a3c', D: '#6e5230' }
export const TEAK_R: Ramp = { L: '#d09060', b: '#b0703f', d: '#8a522e', D: '#5e361e' }

/** Prop builder with animation hooks (like temple.ts' build), cached per key. */
export function buildProp(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): Building {
  return cached('south:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as Building
    const o = outlineCanvas(c, P.ink)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as Building
  }) as Building
}

/** Cheap integer hash → 0..999. */
export function hash(x: number, y: number, s = 0) {
  return (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

/** A point relative to an anchored prop. */
export function hookAt(p: { x: number; y: number }, h: { x: number; y: number }) {
  return { x: p.x + h.x, y: p.y + h.y }
}

// ---------------------------------------------------------------------------
// Trees.

/** Huge shade tree (ต้นจามจุรี / rain tree) with a wide umbrella canopy. */
export function rainTree(variant = 0, leaves: LeafRamp = LEAVES.green): Building {
  const W = 92
  const H = 84
  return buildProp(`raintree:${variant}:${leaves.b}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const bark: Ramp = { L: '#b8a090', b: '#8f7768', d: '#6e5a52', D: '#4e3e3c' }
    // Trunk splitting into boughs.
    for (let y = 44; y < H - 1; y++) {
      const half = 3.2 + Math.max(0, (y - (H - 10)) * 0.5)
      slice(g, cx, y, half, bark, 0.3)
    }
    for (const [dx, dy] of [
      [-22, 30],
      [20, 28],
      [-8, 24],
      [10, 22],
    ]) {
      const n = 22
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = cx + dx * t
        const y = 50 - (50 - dy) * t - Math.sin(t * Math.PI) * 4
        g.rect(Math.round(x - 1.5 + t), Math.round(y), 3 - Math.round(t), 2, i % 4 ? bark.b : bark.d)
      }
    }
    // Roots.
    g.line(cx - 4, H - 2, cx - 11, H - 1, bark.d)
    g.line(cx + 3, H - 2, cx + 10, H - 1, bark.d)
    const v = variant * 7
    const blobs: [number, number, number][] = [
      [cx - 30, 30 + (v % 3), 14],
      [cx - 14, 20, 16],
      [cx + 4, 16 + (v % 2), 17],
      [cx + 22, 22, 15],
      [cx + 34, 32, 11],
      [cx - 38, 38, 9],
      [cx - 20, 36, 13],
      [cx + 12, 34, 14],
      [cx - 2, 30, 12],
      [cx + 28, 40, 9],
    ]
    canopy(g, blobs, leaves, variant + 3)
    // Pink powder-puff flowers of the rain tree.
    for (let i = 0; i < 26; i++) {
      const hh = hash(i, variant, 11)
      const [bx, by, r] = blobs[hh % blobs.length]
      const a = (hh % 628) / 100
      const x = Math.round(bx + Math.cos(a) * r * 0.7)
      const y = Math.round(by + Math.sin(a) * r * 0.5 - 2)
      if (variant % 2 === 0) {
        g.px(x, y, '#ffb3cf')
        g.px(x + 1, y, '#ff8fb8')
      }
    }
    hooks.canopy = [{ x: cx, y: 28 }]
  })
}

/** Tall slim areca / betel palm (หมาก) clump, very southern. */
export function arecaPalm(variant = 0): Building {
  const W = 30
  const H = 74
  return buildProp(`areca:${variant}`, W, H, 15, H - 1, (g) => {
    const trunk: Ramp = { L: '#d8d0b8', b: '#b8ae94', d: '#968c74', D: '#6e6656' }
    const lean = variant % 2 ? 3 : -3
    for (let y = 18; y < H - 1; y++) {
      const t = (H - 1 - y) / (H - 19)
      const x = 15 + lean * t * t
      slice(g, x, y, 1.4, trunk, 0.4)
      if (y % 4 === 0) g.px(Math.round(x - 1), y, trunk.D)
    }
    const top = { x: 15 + lean, y: 18 }
    g.rect(top.x - 1, top.y - 1, 3, 6, '#7aa84e')
    // Fronds.
    const fr: [number, number][] = [
      [-13, -4],
      [-11, 6],
      [12, -3],
      [11, 7],
      [-4, -14],
      [5, -13],
      [0, 8],
    ]
    for (const [dx, dy] of fr) {
      const n = 12
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const x = top.x + dx * t
        const y = top.y + dy * t + t * t * 5
        g.px(Math.round(x), Math.round(y), LEAVES.palm.b)
        if (i % 2 === 0 && i > 1) {
          g.px(Math.round(x), Math.round(y) + 1, LEAVES.palm.d)
          g.px(Math.round(x) + (dx > 0 ? 1 : -1), Math.round(y) + 2, LEAVES.palm.D)
        }
        if (i % 3 === 0) g.px(Math.round(x), Math.round(y) - 1, LEAVES.palm.L)
      }
    }
    // Betel nuts.
    g.px(top.x - 1, top.y + 5, '#f58f35')
    g.px(top.x + 1, top.y + 6, '#e9a53a')
    g.px(top.x, top.y + 6, '#f58f35')
  })
}

/** Low tropical bush with big leaves (โกสน / croton) in reds and greens. */
export function crotonBush(variant = 0): Building {
  const W = 22
  const H = 16
  return buildProp(`croton:${variant}`, W, H, 11, H - 1, (g) => {
    const cols = variant % 2 ? ['#e8514a', '#ffd23f', '#43905a', '#b8343f'] : ['#43905a', '#ffd23f', '#76c05e', '#e9a53a']
    for (let i = 0; i < 26; i++) {
      const hh = hash(i, variant, 3)
      const x = 3 + (hh % 16)
      const y = 3 + ((hh >> 4) % 11)
      const c = cols[hh % cols.length]
      g.rect(x, y, 3, 2, c)
      g.px(x + 1, y - 1, mixHex(c, '#ffffff', 0.3))
    }
    g.rect(4, H - 3, 14, 2, '#2f6f4b')
  })
}

/** Glazed Chinese-style planter pot with a clipped shrub (common at southern wats). */
export function potPlant(variant = 0): Building {
  return buildProp(`potplant:${variant}`, 16, 22, 8, 21, (g) => {
    const pot: Ramp = variant % 2 ? { L: '#9fd0ff', b: '#5a8de0', d: '#3d63b5', D: '#26306e' } : { L: '#ffb8a0', b: '#d8704c', d: '#a8503a', D: '#7a3a2c' }
    for (let y = 13; y < 21; y++) slice(g, 8, y, 5 - (y - 13) * 0.25, pot, 0.35)
    g.hline(3, 12, 13, pot.L)
    g.px(6, 16, '#fffaf0')
    g.px(9, 17, '#fffaf0')
    canopy(
      g,
      [
        [8, 8, 6],
        [4, 10, 3.5],
        [12, 10, 3.5],
      ],
      variant > 1 ? LEAVES.bodhi : LEAVES.green,
      variant,
    )
    if (variant > 1) for (const [x, y] of [[5, 7], [10, 6], [8, 10]]) g.px(x, y, variant === 2 ? '#ff9fc0' : '#ffd23f')
  })
}

// ---------------------------------------------------------------------------
// Buildings: a compact Thai sala (open pavilion) builder used across places.

export interface SalaOpts {
  w: number
  /** Column height (floor → beam). */
  colH: number
  roof?: RoofRamp
  /** Red lacquer or white columns. */
  cols?: 'red' | 'white'
  gable?: Color
  /** Extra draw inside (between columns) with (x0, x1, floorY, beamY). */
  inner?: (g: Surface, x0: number, x1: number, floorY: number, beamY: number) => void
  key: string
  night?: boolean
}

/** An open-fronted Thai sala: plinth, columns, stacked roof with a gable. */
export function salaSprite(o: SalaOpts): Building {
  const roof = o.roof ?? ROOF.orange
  const W = o.w + 18
  const roofH = Math.round(o.w * 0.34) + 10
  const H = roofH + o.colH + 12
  return buildProp(`sala:${o.key}:${o.night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const floor = H - 8
    const beam = floor - o.colH
    // Back wall shade.
    g.rect(9, beam, o.w, o.colH, mixHex(WHITE.D, '#b8a3c8', 0.3))
    g.rect(9, beam, o.w, 3, WHITE.DD)
    o.inner?.(g, 9, 9 + o.w, floor, beam)
    // Plinth.
    tier(g, cx, floor, 7, o.w / 2 + 5, WHITE_R, P.redD)
    // Columns.
    const n = Math.max(2, Math.round(o.w / 26) + 1)
    for (let i = 0; i < n; i++) {
      const x = Math.round(9 + (i * (o.w - 4)) / (n - 1))
      if (o.cols === 'white') {
        g.rect(x, beam, 4, o.colH, WHITE.b)
        g.rect(x + 3, beam, 1, o.colH, WHITE.D)
        g.rect(x, beam, 1, o.colH, '#ffffff')
      } else {
        g.rect(x, beam, 4, o.colH, P.redD)
        g.rect(x, beam, 1, o.colH, P.red)
        for (let y = beam + 4; y < floor - 2; y += 5) g.px(x + 2, y, GOLD.d)
      }
      g.rect(x - 1, beam, 6, 2, GOLD.b)
      g.rect(x - 1, floor - 2, 6, 2, GOLD.d)
    }
    // Beam.
    g.rect(6, beam - 3, W - 12, 3, P.redD)
    g.hline(6, W - 7, beam - 3, GOLD.l)
    g.hline(6, W - 7, beam - 1, GOLD.D)
    // Roof: lower skirt + upper gable.
    const eave = beam - 3
    const skirtTop = eave - Math.round(roofH * 0.42)
    for (let y = skirtTop; y <= eave; y++) {
      const t = (y - skirtTop) / Math.max(1, eave - skirtTop)
      const a = Math.round(cx - o.w / 2 - 2 - t * 7)
      const b = Math.round(cx + o.w / 2 + 2 + t * 7)
      const edge = eave - y
      let c = roof.field
      if (edge < 2) c = edge === 0 ? roof.borderD : roof.border
      else if ((y - skirtTop) % 3 === 2) c = roof.fieldD
      g.rect(a, y, b - a, 1, c)
      if (edge >= 2 && (y - skirtTop) % 3 === 1) for (let x = a + ((y >> 1) % 4); x < b; x += 4) g.px(x, y, roof.fieldL)
    }
    hangHong(g, Math.round(cx - o.w / 2 - 10), eave + 1, -1)
    hangHong(g, Math.round(cx + o.w / 2 + 10), eave + 1, 1)
    const apex = 4
    const hw = Math.round(o.w * 0.34)
    roofBand(g, cx, apex, cx - hw - 6, skirtTop + 2, 7, roof)
    roofBand(g, cx, apex, cx + hw + 6, skirtTop + 2, 7, roof)
    // Gable triangle.
    const gb = o.gable ?? P.redD
    for (let y = apex + 3; y < skirtTop; y++) {
      const half = ((y - apex) / (skirtTop - apex)) * hw
      g.rect(Math.round(cx - half), y, Math.round(half * 2) + 1, 1, gb)
    }
    for (let y = apex + 8; y < skirtTop - 2; y += 3)
      for (let x = Math.round(cx - hw); x < cx + hw; x += 4) {
        const half = ((y - apex) / (skirtTop - apex)) * hw - 2
        if (Math.abs(x - cx) < half) g.px(x + (y % 2), y, mixHex(gb, GOLD.b, 0.45))
      }
    g.rect(Math.round(cx - 2), Math.round((apex + skirtTop) / 2), 5, 5, GOLD.d)
    g.px(Math.round(cx), Math.round((apex + skirtTop) / 2) + 1, GOLD.L)
    bargeBoard(g, cx, apex, cx - hw - 1, skirtTop, 2)
    bargeBoard(g, cx, apex, cx + hw + 1, skirtTop, 2)
    g.hline(Math.round(cx - hw), Math.round(cx + hw), skirtTop, GOLD.d)
    // Chofa.
    g.px(cx, apex - 1, GOLD.b)
    g.px(cx, apex - 2, GOLD.b)
    g.px(cx + 1, apex - 3, GOLD.l)
    g.px(cx + 2, apex - 3, GOLD.b)
    hangHong(g, Math.round(cx - hw - 3), skirtTop + 1, -1)
    hangHong(g, Math.round(cx + hw + 3), skirtTop + 1, 1)
    hooks.glints = [
      { x: cx + 1, y: apex - 3 },
      { x: Math.round(cx - o.w / 2 - 10), y: eave - 2 },
      { x: Math.round(cx + o.w / 2 + 10), y: eave - 2 },
    ]
    hooks.bells = [
      { x: Math.round(cx - o.w / 2 - 8), y: eave + 3 },
      { x: Math.round(cx + o.w / 2 + 8), y: eave + 3 },
    ]
    hooks.floor = [{ x: cx, y: floor }]
    hooks.beam = [{ x: cx, y: beam }]
  })
}

// ---------------------------------------------------------------------------
// Street stalls and vendor carts (place shops).

export interface StallOpts {
  key: string
  /** Canopy stripes. */
  canopy: [Color, Color]
  /** Goods painter on the counter top (x0..x1 at y). */
  goods(g: Surface, x0: number, x1: number, y: number): void
  /** Optional sign text colour band. */
  sign?: Color
  w?: number
}

/** Market stall with a striped awning, counter and goods. */
export function awningStall(o: StallOpts): Building {
  const W = o.w ?? 50
  const H = 42
  return buildProp(`stall:${o.key}`, W, H, W / 2, H - 1, (g, hooks) => {
    // Posts.
    g.rect(3, 10, 2, 31, '#6e4a35')
    g.rect(W - 5, 10, 2, 31, '#6e4a35')
    // Awning with scalloped edge.
    for (let y = 2; y < 11; y++) {
      const inset = Math.round((10 - y) * 0.6)
      for (let x = inset; x < W - inset; x++) g.px(x, y, Math.floor((x - inset) / 6) % 2 ? o.canopy[1] : o.canopy[0])
    }
    g.hline(2, W - 3, 1, mixHex(o.canopy[0], '#ffffff', 0.4))
    for (let x = 0; x < W; x += 6) {
      g.rect(x, 11, 6, 1, Math.floor(x / 6) % 2 ? o.canopy[1] : o.canopy[0])
      g.rect(x + 1, 12, 4, 1, Math.floor(x / 6) % 2 ? o.canopy[1] : o.canopy[0])
    }
    if (o.sign) {
      g.rect(W / 2 - 12, 3, 24, 6, '#fffaf0')
      g.hline(W / 2 - 10, W / 2 + 9, 5, o.sign)
      g.hline(W / 2 - 8, W / 2 + 5, 7, P.ink2)
    }
    // Counter.
    g.rect(2, 26, W - 4, 3, '#e0bb8a')
    g.hline(2, W - 3, 26, '#f3dcb2')
    g.rect(2, 29, W - 4, 11, '#c28e5c')
    for (let x = 5; x < W - 3; x += 6) g.vline(x, 30, 39, '#9a6a45')
    g.rect(2, 29, W - 4, 1, '#9a6a45')
    o.goods(g, 4, W - 4, 25)
    hooks.counter = [{ x: W / 2, y: 26 }]
  })
}

/** Push-cart (รถเข็น) with a glass case and umbrella – noodle / dessert vendors. */
export function pushCart(key: string, umbrella: [Color, Color], body: Color, fill: (g: Surface, x: number, y: number) => void): Building {
  const W = 40
  const H = 46
  return buildProp(`cart:${key}`, W, H, W / 2, H - 1, (g, hooks) => {
    // Umbrella.
    for (let i = 0; i <= 8; i++) {
      const y = 10 - i
      const half = 19 - i * 2.1
      g.rect(Math.round(20 - half), y, Math.round(half * 2), 1, i % 2 ? umbrella[0] : umbrella[1])
    }
    for (let k = 0; k < 5; k++) g.line(20, 2, 2 + k * 9, 10, '#fffaf0')
    g.px(20, 1, GOLD.b)
    g.rect(19, 11, 2, 12, '#6e4a35')
    // Glass case.
    g.rect(6, 18, 28, 9, '#d4f1ff')
    g.rect(6, 18, 28, 1, '#ffffff')
    g.frame(6, 18, 28, 9, '#8fa8c0')
    fill(g, 7, 20)
    // Body.
    const R: Ramp = { L: mixHex(body, '#ffffff', 0.35), b: body, d: mixHex(body, '#3a2838', 0.25), D: mixHex(body, '#3a2838', 0.45) }
    for (let y = 27; y < 38; y++) slice(g, 20, y, 16, R, 0.3)
    g.hline(4, 35, 27, R.L)
    g.rect(8, 30, 24, 5, '#fffaf0')
    g.hline(10, 29, 32, P.redD)
    // Wheels.
    g.circle(9, 40, 3, '#3a3040')
    g.circle(31, 40, 3, '#3a3040')
    g.px(9, 40, '#bdb2ae')
    g.px(31, 40, '#bdb2ae')
    // Handle.
    g.line(36, 30, 39, 26, '#9a9aa8')
    hooks.steam = [{ x: 14, y: 17 }]
  })
}

// ---------------------------------------------------------------------------
// Ground painters.

/** Laterite / sandy temple ground with pebbles (southern soil). */
export function sandGround(g: Surface, x: number, y: number, w: number, h: number, seed = 0, base = '#e8d4a8') {
  g.rect(x, y, w, h, base)
  const d = mixHex(base, '#8a6040', 0.25)
  const l = mixHex(base, '#ffffff', 0.35)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const n = Math.sin(X * 0.07 + seed) + Math.cos(Y * 0.09 + X * 0.02)
      if (n > 1.2 && ditherOn(X, Y, 0.4)) g.px(X, Y, l)
      else if (n < -1.2 && ditherOn(X, Y, 0.35)) g.px(X, Y, d)
      const v = hash(X, Y, seed)
      if (v < 12) g.px(X, Y, d)
      else if (v > 992) g.px(X, Y, '#bdb2ae')
    }
}

/** Polished marble slabs with soft veins (terraces, halls). */
export function marbleFloor(g: Surface, x: number, y: number, w: number, h: number, size = 12, seed = 0, tint = '#f2eff2') {
  g.rect(x, y, w, h, tint)
  const joint = mixHex(tint, '#8c8199', 0.22)
  const vein = mixHex(tint, '#9c93a8', 0.3)
  const shine = '#ffffff'
  for (let j = 0; j < h; j += size) g.hline(x, x + w - 1, y + j, joint)
  for (let i = 0; i < w; i += size) g.vline(x + i, y, y + h - 1, joint)
  for (let j = 0; j < h; j += size)
    for (let i = 0; i < w; i += size) {
      const v = hash(x + i, y + j, seed)
      if (v % 3 === 0) {
        // A wandering vein.
        let vx = x + i + 2 + (v % (size - 4))
        let vy = y + j + 2
        for (let k = 0; k < size - 3; k++) {
          if (vx < x + w && vy < y + h) g.px(vx, vy, vein)
          vy += 1
          vx += (v >> k) & 1 ? 1 : -1
          if (vx < x + i + 1) vx = x + i + 1
          if (vx > x + i + size - 2) vx = x + i + size - 2
        }
      }
      if (v % 5 === 1) g.px(x + i + 2, y + j + 2, shine)
      if (v % 7 === 2) g.hline(x + i + 1, Math.min(x + w - 1, x + i + 3), y + j + 1, shine)
    }
}

/** Scatter of little dropped leaves (the job:sweep_leaves spots). */
export function leafPile(g: Surface, cx: number, cy: number, r: number, seed = 0, cols = ['#c9a04c', '#d9b25f', '#9a8a4a', '#e0a060', '#b0803a', '#8fbf5a']) {
  for (let i = 0; i < r * r * 0.8; i++) {
    const hh = ((i + 3) * 2654435761 + seed * 131) >>> 0
    const a = (hh % 628) / 100
    const d = Math.sqrt(((hh >>> 10) % 1000) / 1000) * r
    const X = Math.round(cx + Math.cos(a) * d)
    const Y = Math.round(cy + Math.sin(a) * d * 0.55)
    const c = cols[(hh >>> 16) % cols.length]
    g.px(X, Y, c)
    if ((hh >>> 3) % 2) g.px(X + 1, Y, mixHex(c, '#3a2838', 0.2))
  }
}

/** Soft sunlight patch (e.g. through a window) – lightens with dithering. */
export function lightPatch(g: Surface, pts: [number, number][], color = '#fff6d8', strength = 0.35) {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  g.ctx.fillStyle = color
  for (let yy = Math.floor(y0); yy <= y1; yy++)
    for (let xx = Math.floor(x0); xx <= x1; xx++) {
      if (!inPoly(pts, xx + 0.5, yy + 0.5)) continue
      if (ditherOn(xx, yy, strength)) g.ctx.fillRect(xx - g.ox, yy - g.oy, 1, 1)
    }
}

export function inPoly(poly: [number, number][], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** String of triangular festival flags (baked). */
export function flagString(g: Surface, x0: number, y0: number, x1: number, y1: number, sag: number, cols: Color[]) {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 5))
  let px = x0
  let py = y0
  for (let i = 1; i <= n; i++) {
    const f = i / n
    const x = x0 + (x1 - x0) * f
    const y = y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag
    g.line(px, py, x, y, '#5a3d4f')
    const c = cols[i % cols.length]
    g.px(Math.round(px + 1), Math.round(py + 1), c)
    g.px(Math.round(px + 2), Math.round(py + 1), c)
    g.px(Math.round(px + 1), Math.round(py + 2), c)
    px = x
    py = y
  }
}

/** Little wooden sign on a post with coloured text bars. */
export function signPost(key: string, board: Color, text: Color, w = 20): Building {
  return buildProp(`sign:${key}`, w + 2, 22, (w + 2) / 2, 21, (g) => {
    g.rect(w / 2, 9, 2, 13, '#6e4a35')
    g.rect(0, 0, w + 2, 10, '#6e4a35')
    g.rect(1, 1, w, 8, board)
    g.hline(3, w - 2, 3, text)
    g.hline(3, w - 5, 6, mixHex(text, board, 0.4))
  })
}

/** A simple parasol table set for eating by the stalls. */
export function tableSet(color: Color): Building {
  return buildProp(`table:${color}`, 24, 30, 12, 29, (g) => {
    for (let i = 0; i <= 6; i++) {
      const half = 11 - i * 1.5
      g.rect(Math.round(12 - half), 7 - i, Math.round(half * 2), 1, i % 2 ? color : mixHex(color, '#ffffff', 0.4))
    }
    g.rect(11, 8, 2, 14, '#9a9aa8')
    g.rect(3, 20, 18, 3, '#e4ddd6')
    g.hline(3, 20, 20, '#ffffff')
    g.rect(5, 23, 2, 6, '#9a9aa8')
    g.rect(17, 23, 2, 6, '#9a9aa8')
    // Stools.
    g.rect(0, 25, 4, 2, '#e8514a')
    g.rect(20, 25, 4, 2, '#5a8de0')
    g.rect(1, 27, 1, 2, '#9a9aa8')
    g.rect(22, 27, 1, 2, '#9a9aa8')
    // Bowls.
    g.rect(7, 18, 4, 2, '#fffaf0')
    g.rect(13, 18, 4, 2, '#fffaf0')
    g.px(8, 17, '#f58f35')
    g.px(15, 17, '#86c95f')
  })
}

// ---------------------------------------------------------------------------
// People-ish sprites that the character set lacks.

const MONK_SKIN = ['#f5c9a0', '#e0a878', '#c28a5e']

/** A monk seated cross-legged (chanting when `frame` is 1). Anchor: bottom centre. */
export function seatedMonkSprite(frame: 0 | 1 = 0, skin = 1, fan = false): Building {
  return buildProp(`smonk:${frame}:${skin}:${fan ? 1 : 0}`, 18, 20, 9, 19, (g) => {
    const sk = MONK_SKIN[skin % MONK_SKIN.length]
    const skD = mixHex(sk, '#8a4a30', 0.35)
    const robe = '#f0902a'
    const robeD = '#c86a1a'
    const robeL = '#ffb454'
    // Lap (crossed legs under the robe).
    g.ellipse(9, 17, 8, 2.6, robeD)
    g.ellipse(9, 16, 7.5, 2.4, robe)
    g.hline(4, 13, 15, robeL)
    // Torso.
    g.rect(5, 8, 8, 8, robe)
    g.rect(11, 8, 2, 5, sk)
    g.px(12, 12, skD)
    g.line(5, 9, 10, 15, robeD)
    g.vline(5, 8, 15, robeL)
    // Hands in the lap.
    g.rect(7, 14, 4, 1, sk)
    // Head.
    g.rect(6, 2, 6, 6, sk)
    g.rect(7, 1, 4, 1, sk)
    g.px(6, 2, skD)
    g.px(11, 6, skD)
    g.hline(7, 8, 4, '#3a2838')
    g.hline(10, 11, 4, '#3a2838')
    g.px(9, 6, frame ? '#b8343f' : skD)
    if (frame) g.px(9, 7, '#7e2436')
    g.px(5, 4, sk)
    g.px(12, 4, sk)
    if (fan) {
      g.vline(15, 2, 16, '#6e4a35')
      g.ellipse(15, 3, 2.6, 3.4, '#f58f35')
      g.px(15, 2, '#ffd23f')
    }
  })
}

/** Coconut-rib broom (ไม้กวาดทางมะพร้าว) leaning on something + a dustpan. */
export function broomSprite(): Building {
  return buildProp('broom', 16, 26, 8, 25, (g) => {
    g.line(4, 0, 9, 17, '#c28e5c')
    g.line(5, 0, 10, 17, '#9a6a45')
    for (let i = -4; i <= 4; i++) g.line(9, 17, 9 + i, 25, i % 2 ? '#e0c890' : '#c9a86a')
    g.hline(7, 11, 18, '#e8514a')
    // Dustpan.
    g.rect(0, 21, 6, 4, '#5a8de0')
    g.hline(0, 5, 21, '#9fd0ff')
    g.vline(3, 17, 20, '#3d63b5')
  })
}

/** Green watering can (บัวรดน้ำ). */
export function wateringCanSprite(): Building {
  return buildProp('wcan', 16, 12, 8, 11, (g) => {
    for (let y = 4; y < 11; y++) slice(g, 7, y, 4, { L: '#b4e486', b: '#6cc36a', d: '#44944f', D: '#2f6f4b' }, 0.35)
    g.line(11, 7, 15, 3, '#44944f')
    g.rect(14, 2, 2, 2, '#6cc36a')
    g.px(15, 2, '#b4e486')
    g.line(4, 4, 7, 1, '#44944f')
    g.line(7, 1, 10, 4, '#44944f')
    g.ellipse(7, 4, 3.5, 1, '#2f6f4b')
  })
}

/** Chunky toy-style pixel text bubble colours etc. */
export const SOUTH = {
  kebaya: '#fbe6ee',
  batik: '#3d63b5',
  sea: '#3a9ad0',
  seaD: '#2a70a8',
  seaL: '#8fd8f0',
}
