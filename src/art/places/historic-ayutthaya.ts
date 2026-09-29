// วัดมหาธาตุ อยุธยา – red-brick prang ruins, bell chedis (one leaning),
// rows of headless Buddha images, the sandstone Buddha head held in the
// roots of a bodhi tree, a pointed brick archway, octagonal column stumps,
// a big weathered Buddha under the sky, frog-faced Ayutthaya tuk-tuks and
// the roti sai mai (candy-floss roti) cart.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import type { Prop } from '../props'
import { buddhaSculpt, ANTIQUE_RAMP, GOLD_RAMP } from '../hall'
import { canopy, LEAVES } from '../garden'
import { GOLD } from '../temple'
import {
  BR,
  BRICK9,
  C,
  E,
  MATTE_STUCCO,
  OLD_STUCCO,
  SAFFRON,
  SANDSTONE,
  STUCCO,
  brickColor,
  brickMat,
  bricks,
  build,
  drawSculpt,
  hsh,
  paintTower,
  recolorBy,
  ruinPlants,
  sculptCached,
  spr,
  stallBuilder,
  type Building,
  type Prim,
  type Seg,
} from './historic'

// ---------------------------------------------------------------------------
// Prang and chedi ruins.

export interface RuinOpts {
  key: string
  w: number
  h: number
  seed: number
  /** 0 = intact silhouette … 1 = upper half gone. */
  broken?: number
  /** Horizontal drift of the top in px (leaning chedi). */
  lean?: number
  stucco?: number
  /** Porch + stairs on the front (prangs). */
  porch?: boolean
}

function stainAt(g: Surface, x: number, y: number, len: number, cut: (x: number) => number) {
  for (let k = 0; k < len; k++) if (y + k >= cut(x)) g.px(x, y + k, 'rgba(40,16,16,0.22)')
}

/** Ayutthaya prang (corn-cob tower) in weathered brick. Hooks: flood (base lights), top, door. */
export function ruinPrang(o: RuinOpts): Building {
  const W = o.w + 16
  const H = o.h + 8
  return build(`prang:${o.key}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const gy = H - 1
    const { w, h, seed } = o
    const broken = o.broken ?? 0
    const topCut = gy - h * (1 - broken * 0.55)
    const cut = (x: number) => (broken > 0 ? topCut + (hsh(x >> 1, 7, seed) % 11) - 5 + Math.abs(x - W / 2) * 0.12 : -1e9)
    const mat = brickMat({ seed, stucco: o.stucco ?? 0.16, moss: 0.3 })
    const t1 = Math.max(3, Math.round(h * 0.05))
    const t2 = Math.max(3, Math.round(h * 0.045))
    const t3 = Math.max(3, Math.round(h * 0.04))
    const bodyH = Math.round(h * 0.2)
    const bodyHalf = w * 0.29
    const nT = h > 120 ? 7 : 5
    const cobH = Math.round(h * 0.6)
    const tierH = Math.floor(cobH / nT)
    const prof = (T: number) => bodyHalf * 0.94 * (1 - 0.84 * Math.pow(T, 1.25)) * (1 + 0.12 * Math.sin(Math.PI * T))
    const segs: Seg[] = [
      { h: t1, half: () => w / 2, ledge: true },
      { h: t2, half: () => w / 2 - w * 0.07, ledge: true, paint: (x, y, u) => ((x + y) % 3 === 0 && Math.abs(u) < 0.95 && y % 2 ? BR.L : null) },
      { h: t3, half: () => w / 2 - w * 0.14, ledge: true },
      {
        h: bodyH,
        half: (t) => bodyHalf + (t > 0.9 ? 1 : 0),
        ledge: true,
      },
    ]
    for (let k = 0; k < nT; k++) {
      segs.push({
        h: tierH,
        half: (t) => prof((k + t) / nT),
        round: true,
        ledge: true,
        paint: (_x, _y, u, t) => (Math.abs(u) < 0.13 && t > 0.2 && t < 0.72 ? (t > 0.62 ? BR.D : '#3a2024') : null),
      })
    }
    segs.push({ h: Math.round(h * 0.06), half: (t) => Math.max(0.6, prof(1) * (1 - t * 0.7)), round: true })
    const tw = paintTower(g, W / 2, gy, segs, mat, { lean: o.lean, cut })
    const put = (x: number, y: number, c: Color) => {
      if (y >= cut(x)) g.px(x, y, c)
    }
    // Redented vertical grooves on the cob.
    for (const [y, [x0, x1]] of tw.rows) {
      if (y > tw.tops[3]) continue
      const c = tw.cx(y)
      const hf = (x1 - x0) / 2
      put(Math.round(c - hf * 0.55), y, BR.L)
      put(Math.round(c + hf * 0.55), y, BR.DD)
    }
    // Antefix petals (กลีบขนุน) at each cob tier.
    for (let k = 4; k < 4 + nT; k++) {
      const y = tw.tops[k]
      const r = tw.rows.get(y)
      if (!r) continue
      const [x0, x1] = r
      const c = tw.cx(y)
      for (const px of [x0 - 1, x1, Math.round(c - (x1 - x0) * 0.25), Math.round(c + (x1 - x0) * 0.25)]) {
        const lit = px < c
        put(px, y - 1, lit ? BR.L : BR.d)
        put(px, y - 2, lit ? BR.b : BR.D)
        if (Math.abs(px - c) > 3) put(px + (px < c ? 1 : -1), y - 1, lit ? BR.b : BR.D)
      }
      // Stains below the ledge.
      for (let x = x0; x < x1; x++) if (hsh(x, y, seed) < 220) stainAt(g, x, y + 1, 2 + (hsh(x, y, seed + 1) % 4), cut)
    }
    // Porch (มุข) with a pointed gable, dark doorway and steep stairs.
    const bodyTop = tw.tops[3]
    const floorY = tw.tops[2] - 1
    if (o.porch !== false) {
      const c = tw.cx(floorY)
      const pw = Math.max(5, Math.round(w * 0.14))
      for (let y = bodyTop + 3; y <= floorY; y++) for (let x = Math.round(c - pw); x <= Math.round(c + pw); x++) put(x, y, brickColor(x, y, 0.7 - ((x - c + pw) / (2 * pw)) * 0.3, { seed: seed + 2, stucco: 0.3 }))
      // Pointed gable of the porch.
      const gh = Math.round(pw * 1.3)
      for (let i = 0; i < gh; i++) {
        const hw = pw + 1 - (i / gh) * (pw + 1)
        const y = bodyTop + 3 - i
        for (let x = Math.round(c - hw); x <= Math.round(c + hw); x++) put(x, y, i === 0 ? BR.L : brickColor(x, y, x < c ? 0.75 : 0.4, { seed: seed + 3, stucco: 0.35 }))
        put(Math.round(c - hw), y, BR.L)
        put(Math.round(c + hw), y, BR.D)
      }
      // Doorway.
      const dw = Math.max(2, Math.round(w * 0.055))
      const dh = Math.round(bodyH * 0.62)
      for (let y = floorY - dh; y <= floorY; y++) {
        const k = y - (floorY - dh)
        const hw = k < dw ? Math.round(Math.sqrt(Math.max(0, dw * dw - (dw - k) * (dw - k)))) : dw
        for (let x = Math.round(c - hw); x <= Math.round(c + hw); x++) put(x, y, k < 2 ? '#4a2a2a' : '#2a1618')
      }
      if (dh > 10) {
        // A tiny seated image glimmering inside.
        put(Math.round(c), floorY - 5, '#8a6a3a')
        put(Math.round(c), floorY - 4, '#a8844a')
        put(Math.round(c) - 1, floorY - 3, '#8a6a3a')
        put(Math.round(c), floorY - 3, '#a8844a')
        put(Math.round(c) + 1, floorY - 3, '#6a4e2e')
      }
      hooks.door = [{ x: Math.round(c), y: floorY - 3 }]
      // Stairs down across the base tiers.
      const sw = pw - 1
      for (let y = floorY + 1; y <= gy; y++) {
        const cc = tw.cx(y)
        const step = (gy - y) % 2 === 0
        for (let x = Math.round(cc - sw); x <= Math.round(cc + sw); x++) put(x, y, step ? (x < cc ? '#e0a07a' : '#c47a58') : x < cc ? BR.d : BR.D)
        put(Math.round(cc - sw) - 1, y, BR.L)
        put(Math.round(cc + sw) + 1, y, BR.DD)
      }
    }
    // Plants on the ledges and along the broken top.
    for (const k of [0, 1, 2, 3]) {
      const y = tw.tops[k]
      const r = tw.rows.get(y)
      if (r) ruinPlants(g, r[0] + 1, r[1] - 2, y, seed + k, 0.12)
    }
    if (broken > 0) {
      for (let x = 0; x < W; x++) {
        const y = Math.ceil(cut(x))
        const r = tw.rows.get(y)
        if (!r || x < r[0] || x >= r[1]) continue
        const v = hsh(x, y, seed + 9)
        if (v < 330) {
          g.vline(x, y - 1 - (v % 3), y, v % 2 ? '#6fa050' : '#8fc060')
          if (v % 7 === 0) g.circle(x, y - 3, 2.2, '#5e9a4a')
        } else g.px(x, y, v % 3 ? BR.L : BR.b)
      }
    }
    // Rubble at the foot.
    for (let i = 0; i < 10; i++) {
      const v = hsh(i, seed, 4)
      const x = 2 + (v % (W - 4))
      if (Math.abs(x - W / 2) < w * 0.16) continue
      g.rect(x, gy - 1, 3, 2, v % 2 ? BR.d : BR.b)
      g.px(x, gy - 1, BR.L)
    }
    hooks.flood = [
      { x: Math.round(W / 2 - w * 0.34), y: gy },
      { x: Math.round(W / 2 + w * 0.34), y: gy },
    ]
    const ty = Math.max(tw.tops[tw.tops.length - 1], broken > 0 ? Math.round(topCut) : 0)
    hooks.top = [{ x: Math.round(tw.cx(ty)), y: ty }]
  })
}

/** Bell-shaped brick chedi ruin (Sukhothai/Ayutthaya style). Hooks: top, flood. */
export function ruinChedi(o: RuinOpts): Building {
  const W = o.w + 14 + Math.abs(o.lean ?? 0) * 2
  const H = o.h + 6
  return build(`rchedi:${o.key}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const gy = H - 1
    const { w, h, seed } = o
    const broken = o.broken ?? 0
    const topCut = gy - h * (1 - broken * 0.5)
    const cut = (x: number) => (broken > 0 ? topCut + (hsh(x >> 1, 3, seed) % 9) - 4 + Math.abs(x - W / 2 - (o.lean ?? 0) * 0.6) * 0.18 : -1e9)
    const mat = brickMat({ seed, stucco: o.stucco ?? 0.14, moss: 0.35 })
    const B = w * 0.36
    const segs: Seg[] = [
      { h: Math.round(h * 0.05), half: () => w / 2, ledge: true },
      { h: Math.round(h * 0.045), half: () => w * 0.44, ledge: true },
      { h: Math.round(h * 0.045), half: () => w * 0.38, ledge: true },
      { h: Math.max(2, Math.round(h * 0.03)), half: () => w * 0.35, round: true, ledge: true },
      { h: Math.max(2, Math.round(h * 0.03)), half: () => w * 0.31, round: true, ledge: true },
      { h: Math.max(2, Math.round(h * 0.03)), half: () => w * 0.27, round: true, ledge: true },
      { h: Math.round(h * 0.3), half: (t) => B * Math.sqrt(Math.max(0.04, 1 - t * t * 0.9)), round: true },
      { h: Math.round(h * 0.05), half: () => w * 0.12, ledge: true },
      {
        h: Math.round(h * 0.28),
        half: (t) => Math.max(0.8, w * 0.09 * (1 - t * 0.85)),
        round: true,
        paint: (_x, y, _u, _t, base) => (y % 3 === 0 ? mixHex(base, '#3a1a14', 0.3) : null),
      },
      { h: Math.round(h * 0.04), half: () => 0.7, round: true },
    ]
    const tw = paintTower(g, W / 2 - (o.lean ?? 0) / 2, gy, segs, mat, { lean: o.lean, cut })
    // Stains under the bell and plants on the ledges.
    const bellTop = tw.tops[6]
    for (const [y, [x0, x1]] of tw.rows) {
      if (y === bellTop + 2) for (let x = x0; x < x1; x++) if (hsh(x, y, seed) < 240) stainAt(g, x, y, 3 + (hsh(x, y, seed + 2) % 6), cut)
    }
    for (const k of [0, 1, 2, 5, 7]) {
      const y = tw.tops[k]
      const r = tw.rows.get(y)
      if (r) ruinPlants(g, r[0] + 1, r[1] - 2, y, seed + k, 0.14)
    }
    if (broken > 0) {
      for (let x = 0; x < W; x++) {
        const y = Math.ceil(cut(x))
        const r = tw.rows.get(y)
        if (!r || x < r[0] || x >= r[1]) continue
        const v = hsh(x, y, seed + 11)
        if (v < 380) g.vline(x, y - 1 - (v % 3), y, v % 2 ? '#6fa050' : '#8fc060')
        if (v % 9 === 0) g.circle(x, y - 3, 2.4, '#5e9a4a')
      }
    }
    const ty = Math.max(tw.tops[tw.tops.length - 1], broken > 0 ? Math.round(topCut) : 0)
    hooks.top = [{ x: Math.round(tw.cx(ty)), y: ty }]
    hooks.flood = [{ x: Math.round(W / 2), y: gy }]
  })
}

// ---------------------------------------------------------------------------
// Statues.

/** Recolour a gold sculpt into weathered stucco with bricks showing through. */
function weathered(
  src: HTMLCanvasElement,
  from: readonly string[],
  seed: number,
  o: { brick?: number; sash?: (x: number, y: number) => boolean; dark?: number; ramp?: readonly string[] } = {},
) {
  const brick = o.brick ?? 0.3
  const R = o.ramp ?? STUCCO
  return recolorBy(src, from, (i, x, y) => {
    if (i === 0) return R[0]
    if (o.sash?.(x, y)) return SAFFRON[Math.max(2, Math.min(8, i))]
    const n = Math.sin(x * 0.55 + seed) + Math.cos(y * 0.47 + x * 0.13 + seed * 0.7) + Math.sin((x + y) * 0.29 + seed)
    if (n > 2.55 - brick * 2.6) return BRICK9[Math.max(1, Math.min(7, i - 1))]
    const m = Math.sin(x * 0.2 + seed) * Math.cos(y * 0.23 - seed * 0.5)
    const k = Math.max(1, Math.min(8, i - (o.dark ?? 0) - (m > 0.55 ? 1 : 0) + (hsh(x, y, seed) % 11 === 0 ? -1 : 0)))
    return R[k]
  })
}

/** A row of headless seated Buddha images on a brick plinth (the gallery). */
export function headlessRow(n: number, seed: number, spacing = 32): Prop {
  const W = n * spacing + 6
  const H = 38
  return spr(`hlrow:${n}:${seed}:${spacing}`, W, H, 0, H - 1, (g) => {
    const s = 0.42
    const base = buddhaSculpt('antique', s)
    // Plinth.
    bricks(g, 1, H - 9, W - 2, 8, { seed: seed + 1, light: 0.5, stucco: 0.2, moss: 0.3 })
    g.hline(1, W - 2, H - 10, BR.L)
    g.hline(1, W - 2, H - 9, mixHex(BR.L, BR.b, 0.5))
    for (let x = 2; x < W - 2; x += 3) g.px(x, H - 6, BR.L)
    for (let i = 0; i < n; i++) {
      const v = hsh(i, seed, 1)
      const kind = v % 4
      const cx = 3 + spacing / 2 + i * spacing
      const cutLocal = 45.5 + (v % 3)
      const sash =
        kind === 2 || kind === 0
          ? (x: number, y: number) => {
              const lx = (x - base.ox) / s
              const ly = (base.oy - y) / s
              return Math.abs(ly - (18 + (lx + 12) * 1.05)) < 4.5 && lx > -14 && lx < 16 && ly > 15 && ly < 46
            }
          : undefined
      const c = weathered(base.canvas, ANTIQUE_RAMP, seed + i * 7, { brick: kind === 1 ? 0.7 : 0.3, sash: kind === 2 ? sash : undefined, dark: kind === 3 ? 1 : 0, ramp: OLD_STUCCO })
      // Cut the head off with a jagged break.
      const ctx = c.getContext('2d')!
      const jc = Math.round(base.oy - cutLocal * s)
      for (let x = 0; x < c.width; x++) {
        const j = jc + (hsh(x, i, seed) % 3) - 1
        ctx.clearRect(x, 0, 1, j)
        ctx.fillStyle = OLD_STUCCO[1]
        const d = ctx.getImageData(x, j + 1, 1, 1).data
        if (d[3] > 0) ctx.fillRect(x, j, 1, 1)
      }
      const y0 = H - 10
      g.draw(c, Math.round(cx - base.ox), y0 - base.oy + 1)
      // Offerings: a garland or a lotus bud at some knees.
      if (v % 3 === 0) {
        g.px(cx - 3, y0, '#fffaf0')
        g.px(cx - 2, y0, '#ffd23f')
        g.px(cx - 1, y0, '#fffaf0')
      }
      if (v % 5 === 1) {
        g.rect(cx + 5, y0 - 3, 1, 3, '#5ea653')
        g.px(cx + 5, y0 - 4, '#ff9fc0')
      }
    }
    ruinPlants(g, 2, W - 3, H - 10, seed + 5, 0.08)
  })
}

// Head-only sculpt primitives (adapted from the principal Buddha).
function headPrims(): Prim[] {
  const p: Prim[] = [
    E(0, 0, 2, 9, 10.8, 9, 3),
    E(0, -6.2, 3.6, 6, 4.8, 6.4, 3),
    C([-8.7, 4.2, 0.5], [-9.4, -6.6, 1.5], 1.05, 1.6, 8),
    C([8.7, 4.2, 0.5], [9.4, -6.6, 1.5], 1.05, 1.6, 8),
    E(0, 11.1, 1.5, 6.2, 4.6, 5.5, 7),
  ]
  return p
}

/** The serene sandstone Buddha head (local origin = centre of the head). */
export function buddhaHead(s: number, ramp: readonly string[] = SANDSTONE) {
  return sculptCached(`bhead:${s}:${ramp[4]}`, {
    prims: headPrims(),
    s,
    x0: -11,
    x1: 11,
    y0: -12,
    y1: 16,
    ramps: [ramp],
    rim: 0.3,
    spec: [10, 0.25],
    detail: (d) => {
      const fine = d.s >= 0.8
      const hairline = (x: number) => 4.4 - 0.022 * x * x
      d.each((i, j, lx, ly, part) => {
        const hair = (part === 3 && ly > hairline(lx)) || part === 7
        if (!hair) return
        if (j % 2 === 0 && (i + (j >> 1)) % 2 === 0) d.add(i, j, -1)
      })
      d.curve(-8.4, 8.4, hairline, -2)
      const brow = (x: number) => {
        const u = (Math.abs(x) - 4.2) / 3.4
        return 1.6 + 1.6 * (1 - u * u)
      }
      d.curve(-7.3, -0.9, brow, -2)
      d.curve(0.9, 7.3, brow, -2)
      d.curve(-6.2, -2.1, (x) => -0.9 - 0.09 * (x + 4.2) * (x + 4.2), -3)
      d.curve(2.1, 6.2, (x) => -0.9 - 0.09 * (x - 4.2) * (x - 4.2), -3)
      d.line(0.7, 1, 0.7, -3.6, -1)
      d.line(-0.4, 0.5, -0.4, -2.5, 1)
      const [ni, nj] = d.px(1.5, -4.1)
      d.add(ni, nj, -2)
      d.line(-2.2, -6.6, 2.2, -6.6, -2)
      d.line(-2.9, -6, -2.2, -6.6, -1)
      d.line(2.2, -6.6, 2.9, -6, -1)
      if (fine) d.line(-1, -7.8, 1, -7.8, 1)
    },
  })
}

const HEAD_STONE = ['#2c2426', '#4e4244', '#6e6260', '#8e827c', '#aa9e94', '#c2b6aa', '#d6ccbe', '#e8e0d2', '#f8f2e8'] as const

function bez(g: Surface, a: [number, number], c: [number, number], b: [number, number], w: number, body: Color, lit: Color, dark: Color) {
  const n = 24
  let px = a[0]
  let py = a[1]
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0]
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]
    g.thickLine(px, py + 1, x, y + 1, w, dark)
    g.thickLine(px, py, x, y, w, body)
    g.line(px, py - Math.floor(w / 2), x, y - Math.floor(w / 2), lit)
    px = x
    py = y
  }
}

/** ต้นโพธิ์ holding the Buddha head in its roots. Hooks: head (face centre), canopy. */
export function headTreeSprite(): Building {
  const W = 132
  const H = 140
  return build('headtree2', W, H, 66, H - 1, (g, hooks) => {
    const cx = 66
    const gy = H - 1
    const head = buddhaHead(1.12, HEAD_STONE)
    const hx = cx - 1
    const hy = gy - 24
    const R = { L: '#c8b6a6', b: '#a08a7a', d: '#7c665c', D: '#5a4a44', DD: '#3a2c2a' }
    const top = 52
    const trunkHalf = (y: number) => 12 + Math.pow(Math.max(0, (y - top) / (gy - top)), 2.1) * 30
    // Root flare over the ground.
    for (let i = 0; i < 20; i++) {
      const side = i % 2 ? 1 : -1
      const k = Math.floor(i / 2)
      const x0 = cx + side * (10 + k * 3)
      const x1 = cx + side * (26 + k * 6 + (i % 3) * 3)
      const y1 = gy - 1 - (k % 3)
      g.thickLine(x0, gy - 9, x1, y1, 2.4, R.d)
      g.line(x0, gy - 10, x1, y1 - 1, k % 2 ? R.L : R.b)
    }
    // Dark depth behind the braided roots.
    for (let y = top; y < gy - 2; y++) {
      const hf = trunkHalf(y)
      g.rect(Math.round(cx - hf), y, Math.round(hf * 2) + 1, 1, R.DD)
    }
    // Braided strands.
    for (let i = 0; i < 14; i++) {
      const f = ((i + 0.5) / 14) * 2 - 1
      const ph = i * 1.9
      for (let y = top; y < gy - 3; y++) {
        const k = (y - top) / (gy - top)
        const hf = trunkHalf(y)
        const x = cx + f * hf * 0.9 + Math.sin(y * 0.13 + ph) * (2 + k * 2)
        const wd = Math.round(3 + (i % 3 === 0 ? 1 : 0) + k * 1.6)
        for (let q = 0; q < wd; q++) {
          const c = q === 0 ? R.L : q >= wd - 1 ? R.D : f > 0.35 ? R.d : R.b
          g.px(Math.round(x - wd / 2 + q), y, c)
        }
      }
    }
    // Branches into the canopy.
    for (const [x1, y1] of [
      [26, 32],
      [104, 30],
      [58, 18],
      [82, 22],
    ] as [number, number][])
      g.thickLine(cx, 62, x1, y1, 5, R.b)
    canopy(
      g,
      [
        [66, 30, 26],
        [36, 38, 18],
        [96, 38, 18],
        [46, 16, 16],
        [86, 16, 16],
        [66, 8, 12],
        [16, 46, 11],
        [116, 46, 11],
      ],
      LEAVES.bodhi,
      21,
    )
    for (let i = 0; i < 50; i++) {
      const v = hsh(i, 5, 31)
      g.px(8 + (v % 116), 4 + ((v >> 3) % 52), LEAVES.bodhi.L)
    }
    // The hollow and the head.
    g.ellipse(hx, hy, 16, 19, R.DD)
    g.ellipse(hx, hy + 1, 14, 17, '#241a1a')
    drawSculpt(g, head, hx, hy)
    // Roots over the crown, round the temples and under the chin.
    const roots: [[number, number], [number, number], [number, number], number][] = [
      [[hx - 22, hy - 30], [hx, hy - 28], [hx + 20, hy - 12], 3],
      [[hx - 17, hy - 13], [hx - 4, hy - 26], [hx + 9, hy - 19], 2.4],
      [[hx - 18, hy - 10], [hx - 16, hy + 2], [hx - 12, hy + 14], 2.6],
      [[hx + 18, hy - 8], [hx + 16, hy + 4], [hx + 12, hy + 14], 2.6],
      [[hx - 15, hy - 17], [hx - 9, hy - 7], [hx - 13, hy + 4], 2],
      [[hx + 13, hy - 19], [hx + 8, hy - 9], [hx + 14, hy + 2], 2],
      [[hx - 15, hy + 15], [hx, hy + 10], [hx + 15, hy + 16], 2.6],
    ]
    for (const [a, c, b, w] of roots) bez(g, a, c, b, w, R.b, R.L, R.DD)
    // Moss on the roots.
    for (let i = 0; i < 30; i++) {
      const v = hsh(i, 2, 77)
      const x = cx - 36 + (v % 72)
      const y = gy - 30 + ((v >> 4) % 26)
      if (Math.abs(x - hx) < 11 && Math.abs(y - hy) < 12) continue
      g.px(x, y, v % 2 ? '#7fa058' : '#95b86a')
    }
    // Offerings at the foot: garlands, a lotus bud and a candle.
    g.rect(hx - 10, gy - 5, 20, 3, '#b0906c')
    g.hline(hx - 10, hx + 9, gy - 5, '#c9aa82')
    for (let x = hx - 9; x < hx + 9; x += 3) {
      g.px(x, gy - 6, '#fffaf0')
      g.px(x + 1, gy - 6, '#ffd23f')
    }
    g.rect(hx + 7, gy - 11, 1, 5, '#5ea653')
    g.rect(hx + 6, gy - 13, 3, 2, '#ff9fc0')
    g.px(hx + 7, gy - 14, '#ffd6e0')
    g.rect(hx - 8, gy - 9, 2, 4, '#fff4d6')
    hooks.head = [{ x: hx, y: hy }]
    hooks.flame = [{ x: hx - 7, y: gy - 10 }]
    hooks.canopy = [{ x: cx, y: 30 }]
  })
}

/** Large weathered Buddha under the open sky on a brick pedestal. Hooks: candles, glints. */
export function bigRuinBuddha(): Building {
  const W = 144
  const H = 166
  return build('bigruinbuddha', W, H, 72, H - 1, (g, hooks) => {
    const cx = 72
    const gy = H - 1
    const s = 1.18
    const b = buddhaSculpt('sukhothai', s)
    // Pedestal: brick lion base (ฐานสิงห์) with stucco remains.
    const tiers: [number, number][] = [
      [8, 68],
      [6, 64],
      [7, 58],
      [5, 54],
      [6, 58],
    ]
    let y = gy
    for (const [h, half] of tiers) {
      y -= h
      bricks(g, cx - half, y + 1, half * 2, h - 1, { seed: 71 + h, light: 0.56, slope: -0.2, stucco: 0.35, moss: 0.3 })
      g.hline(cx - half, cx + half - 1, y, BR.L)
    }
    // Lotus petal band.
    for (let x = cx - 57; x < cx + 57; x += 4) {
      g.px(x + 1, y + 2, '#efe6da')
      g.px(x + 2, y + 2, '#efe6da')
      g.px(x + 1, y + 3, '#cfc6bc')
    }
    const seatY = y - 1
    const sash = (px: number, py: number) => {
      const lx = (px - b.ox) / s
      const ly = (b.oy - py) / s
      return Math.abs(ly - (18 + (lx + 12) * 1.05)) < 5 && lx > -14 && lx < 16 && ly > 16 && ly < 46
    }
    const c = weathered(b.canvas, GOLD_RAMP, 5, { brick: 0.3, sash, ramp: MATTE_STUCCO })
    g.draw(c, Math.round(cx - b.ox), seatY - b.oy + 2)
    // Old gold leaf flakes on the lap and chest (devotees' ปิดทอง).
    for (let i = 0; i < 14; i++) {
      const v = hsh(i, 9, 3)
      g.px(cx - 20 + (v % 40), seatY - 6 - ((v >> 4) % 26), i % 2 ? GOLD.b : GOLD.l)
    }
    ruinPlants(g, cx - 66, cx + 66, gy - tiers[0][0], 5, 0.1)
    hooks.candles = [
      { x: cx - 30, y: y - 1 },
      { x: cx + 30, y: y - 1 },
    ]
    hooks.glints = [
      { x: cx - 2, y: seatY - Math.round(92 * s) },
      { x: cx + 6, y: seatY - Math.round(40 * s) },
    ]
  })
}

/** Stucco guardian lion (สิงห์) seated at a stair, facing the viewer. */
export function singhaSprite(flip = false): Prop {
  return spr(`singha:${flip ? 1 : 0}`, 18, 26, 9, 25, (g) => {
    const S = MATTE_STUCCO
    // Plinth.
    bricks(g, 1, 20, 16, 5, { seed: 81, light: 0.55 })
    g.hline(1, 16, 19, BR.L)
    // Haunches, chest and forelegs.
    g.ellipse(9, 16, 7, 4, S[4])
    g.ellipse(8, 15, 6, 3.5, S[5])
    g.rect(5, 9, 8, 8, S[5])
    g.rect(5, 9, 3, 8, S[6])
    g.rect(11, 9, 2, 8, S[3])
    g.rect(5, 16, 3, 3, S[6])
    g.rect(10, 16, 3, 3, S[4])
    // Head with a curly mane and a big grin.
    g.circle(9, 6, 5.5, S[3])
    g.circle(9, 6, 4.5, S[5])
    g.circle(8, 5, 2.5, S[6])
    for (let a = 0; a < 10; a++) {
      const x = 9 + Math.cos((a / 10) * Math.PI * 2) * 5.5
      const y = 6 + Math.sin((a / 10) * Math.PI * 2) * 5.5
      g.px(x, y, S[2])
    }
    g.px(7, 5, P.ink)
    g.px(11, 5, P.ink)
    g.hline(7, 11, 8, S[1])
    g.px(9, 7, S[2])
    g.px(flip ? 4 : 14, 12, S[4])
  })
}

/** Octagonal brick column stump of a ruined viharn. */
export function columnStump(h: number, seed: number): Prop {
  return spr(`colstump:${h}:${seed}`, 12, h + 4, 6, h + 3, (g) => {
    const gy = h + 3
    const top = 3 + (hsh(seed, 1, 2) % 3)
    for (let y = top; y <= gy; y++) {
      for (let x = 1; x < 11; x++) {
        const u = (x - 6) / 5
        const face = x < 3 ? 0.8 : x < 6 ? 0.62 : x < 9 ? 0.42 : 0.28
        g.px(x, y, brickColor(x + seed * 5, y, face - Math.abs(u) * 0.05, { seed, stucco: 0.22, moss: 0.35 }))
      }
    }
    // Broken top.
    for (let x = 1; x < 11; x++) {
      const d = hsh(x, seed, 5) % 3
      g.ctx.clearRect(x, 0, 1, top + d)
      g.px(x, top + d, x < 6 ? BR.L : BR.b)
    }
    ruinPlants(g, 2, 9, top + 1, seed, 0.25)
    g.rect(0, gy - 1, 12, 2, BR.d)
    g.hline(0, 11, gy - 1, BR.b)
  })
}

/** Ruined gallery / viharn wall with broken top and narrow light slits. */
export function ruinWall(len: number, h: number, seed: number, slits = true): Prop {
  return spr(`rwall:${len}:${h}:${seed}:${slits ? 1 : 0}`, len, h + 5, 0, h + 4, (g) => {
    const gy = h + 4
    // Top surface (thickness) then face.
    const topOf = (x: number) => 2 + Math.round((Math.sin(x * 0.11 + seed) + 1) * h * 0.18 + (hsh(x >> 2, 0, seed) % 5))
    for (let x = 0; x < len; x++) {
      const t = topOf(x)
      g.px(x, t, BR.L)
      g.px(x, t + 1, mixHex(BR.L, BR.b, 0.4))
      g.px(x, t + 2, mixHex(BR.L, BR.b, 0.6))
      for (let y = t + 3; y <= gy; y++) g.px(x, y, brickColor(x, y, 0.5, { seed, stucco: 0.2, moss: 0.3 }))
    }
    if (slits) {
      for (let x = 10; x < len - 8; x += 16) {
        const t = topOf(x) + 5
        if (t > gy - 12) continue
        g.rect(x, Math.max(t, gy - h + 8), 2, 9, '#3a2024')
        g.px(x, Math.max(t, gy - h + 8), '#5a3030')
      }
    }
    for (let x = 0; x < len; x++) if (hsh(x, 1, seed) < 180) ruinPlants(g, x, x, topOf(x), seed + x, 1)
    g.hline(0, len - 1, gy, BR.D)
  })
}

/** Pointed brick archway (ซุ้มประตู) of the inner cloister. Hooks: glow (opening). */
export function brickArchSprite(): Building {
  const W = 52
  const H = 70
  return build('brickarch', W, H, 26, H - 1, (g, hooks) => {
    const gy = H - 1
    // Piers and wall body.
    bricks(g, 2, 16, W - 4, gy - 16, { seed: 44, light: 0.58, slope: -0.25, stucco: 0.3, moss: 0.25 })
    // Pointed (lotus-bud) crown.
    for (let i = 0; i < 18; i++) {
      const hw = (W / 2 - 3) * Math.sqrt(1 - Math.pow(i / 18, 1.6))
      const y = 16 - i
      for (let x = Math.round(26 - hw); x <= Math.round(26 + hw); x++) g.px(x, y, brickColor(x, y, x < 26 ? 0.72 : 0.42, { seed: 45, stucco: 0.45 }))
      g.px(Math.round(26 - hw), y, BR.L)
    }
    g.rect(25, 0, 2, 3, BR.b)
    // Opening with a pointed arch, glimpse of the green courtyard.
    const ow = 9
    const top = 22
    for (let y = top; y < gy; y++) {
      const k = y - top
      const hw = k < 12 ? Math.round(ow * Math.sqrt(1 - Math.pow((12 - k) / 12, 1.4))) : ow
      for (let x = 26 - hw; x <= 26 + hw; x++) {
        let c: Color = y > gy - 12 ? '#7fb060' : y > gy - 20 ? '#5e8a4a' : '#3a4a3a'
        if (y > gy - 22 && y < gy - 12 && Math.abs(x - 26) < 4) c = '#b8aea4'
        if (y > gy - 26 && y <= gy - 22 && Math.abs(x - 26) < 2) c = '#cfc6bc'
        g.px(x, y, c)
      }
      g.px(26 - hw - 1, y, BR.DD)
      g.px(26 + hw + 1, y, BR.L)
    }
    // Stucco moulding around the arch.
    for (let k = 0; k < 14; k++) {
      const hw = Math.round((ow + 3) * Math.sqrt(1 - Math.pow((13 - k) / 13, 1.4)))
      g.px(26 - hw, top - 3 + k, '#efe6da')
      g.px(26 + hw, top - 3 + k, '#cfc6bc')
    }
    ruinPlants(g, 6, W - 8, 16, 3, 0.15)
    hooks.glow = [{ x: 26, y: gy - 14 }]
  })
}

// ---------------------------------------------------------------------------
// Street life: frog tuk-tuk, roti sai mai, souvenirs, elephant ride platform.

/** Ayutthaya's frog-faced tuk-tuk (ตุ๊กตุ๊กหัวกบ), side view facing right. */
export function frogTukTukSprite(color: Color = '#5ab87a', blink = false): Prop {
  return spr(`frogtuk:${color}:${blink ? 1 : 0}`, 44, 30, 22, 29, (g) => {
    const B = color
    const D = mixHex(color, '#1e3a2a', 0.4)
    const L = mixHex(color, '#ffffff', 0.35)
    // Rear passenger cabin.
    g.rect(3, 13, 22, 10, B)
    g.hline(3, 24, 13, L)
    g.rect(3, 21, 22, 2, D)
    g.rect(5, 15, 16, 5, '#fff1d6')
    g.rect(5, 15, 16, 1, '#e0bb8a')
    g.rect(2, 4, 26, 3, D)
    g.rect(3, 3, 24, 1, L)
    for (const x of [3, 24]) g.rect(x, 7, 1, 6, '#3a3040')
    // Fringe on the roof edge.
    for (let x = 3; x < 27; x += 2) g.px(x, 7, GOLD.b)
    // Driver and handlebar.
    g.rect(24, 12, 4, 3, '#3a3040')
    g.line(29, 10, 30, 14, '#8c8187')
    // Frog head: rounded bonnet with two big headlight eyes on top.
    g.ellipse(33, 18, 9, 7, D)
    g.ellipse(33, 17, 8.5, 6.5, B)
    g.ellipse(31, 14, 5, 3, L)
    for (const ex of [29, 36]) {
      g.circle(ex, 10, 3, D)
      g.circle(ex, 9.5, 2.6, '#fffaf0')
      if (blink) g.hline(ex - 2, ex + 2, 10, P.ink)
      else {
        g.rect(ex, 9, 2, 2, P.ink)
        g.px(ex, 9, '#ffffff')
      }
    }
    // Smile grille and cheeks.
    g.line(35, 20, 40, 18, P.ink)
    g.px(38, 17, '#ff9aa6')
    g.px(39, 17, '#ff9aa6')
    // Wheels.
    for (const [x, r] of [
      [10, 3.6],
      [34, 3.2],
    ] as [number, number][]) {
      g.circle(x, 25, r, '#3a3040')
      g.circle(x, 25, r * 0.4, '#bdb2ae')
    }
  })
}

/** Roti sai mai cart: glass cabinet of roti sheets and colourful sugar floss. */
export function rotiSaiMaiSprite(): Prop {
  return stallBuilder('rotisaimai', {
    w: 46,
    kind: 'cart',
    roof: ['#ff6f91', '#ffd6e0'],
    sign: '#e8709e',
    body: '#fff1d6',
    goods: (g, x0, y0, w) => {
      // Glass case.
      g.rect(x0 + 3, y0 - 13, w - 6, 13, '#d4f1ff')
      g.rect(x0 + 3, y0 - 13, w - 6, 1, '#fffaf0')
      g.vline(x0 + 3, y0 - 13, y0 - 1, '#9fd0ff')
      g.vline(x0 + w - 4, y0 - 13, y0 - 1, '#9fd0ff')
      // Stacks of thin roti sheets.
      for (let i = 0; i < 3; i++) {
        const x = x0 + 6 + i * 6
        for (let k = 0; k < 5; k++) g.hline(x, x + 4, y0 - 2 - k, k % 2 ? '#f5d68a' : '#fbe7a8')
      }
      // Sugar floss bags: pandan green, pink, lilac, yellow.
      const cols: Color[] = ['#8fd88a', '#ff9fc0', '#c8a0ff', '#ffe45e']
      cols.forEach((c, i) => {
        const x = x0 + 25 + (i % 2) * 8
        const y = y0 - 11 + Math.floor(i / 2) * 5
        g.rect(x, y, 6, 4, c)
        g.px(x + 1, y + 1, '#ffffff')
        g.px(x + 3, y + 2, mixHex(c, '#ffffff', 0.5))
        g.px(x + 4, y, mixHex(c, '#3a2838', 0.2))
      })
      // A roti being filled on the counter.
      g.ellipse(x0 + w / 2, y0 + 1, 5, 1.5, '#fbe7a8')
      g.rect(x0 + w / 2 - 2, y0, 4, 1, '#8fd88a')
    },
  })
}

/** Elephant-pants and souvenir stall. */
export function pantsStallSprite(): Prop {
  return stallBuilder('elepants', {
    w: 48,
    kind: 'awning',
    roof: ['#5a8de0', '#fffaf0'],
    body: '#9a6a45',
    goods: (g, x0, y0, w) => {
      // Hanging rail with elephant pants.
      g.hline(x0 + 3, x0 + w - 4, y0 - 20, '#6e4a35')
      const cols: Color[] = ['#3d63b5', '#e8514a', '#6cc36a', '#9270dc', '#f58f35', '#3a3040']
      for (let i = 0; i < 6; i++) {
        const x = x0 + 5 + i * 7
        const c = cols[i]
        g.rect(x, y0 - 19, 5, 9, c)
        g.rect(x, y0 - 10, 2, 5, c)
        g.rect(x + 3, y0 - 10, 2, 5, c)
        for (let k = 0; k < 3; k++) g.px(x + 1 + (k % 2) * 2, y0 - 17 + k * 3, mixHex(c, '#ffffff', 0.55))
        g.hline(x, x + 4, y0 - 19, mixHex(c, '#ffffff', 0.3))
      }
      // Folded pants and elephant fans on the counter.
      for (let i = 0; i < 4; i++) {
        const c = cols[(i + 2) % cols.length]
        g.rect(x0 + 4 + i * 11, y0 - 3, 8, 3, c)
        g.hline(x0 + 4 + i * 11, x0 + 11 + i * 11, y0 - 3, mixHex(c, '#ffffff', 0.4))
      }
    },
  })
}

/** Ticket booth (จุดจำหน่ายบัตร) with a tiled roof. */
export function ticketBoothSprite(): Prop {
  return spr('ticketbooth', 30, 34, 15, 33, (g) => {
    g.rect(3, 12, 24, 21, '#f3dcb2')
    g.rect(24, 12, 3, 21, '#e0bb8a')
    g.rect(6, 15, 16, 9, '#3a3040')
    g.rect(7, 16, 14, 7, '#9fd0ff')
    g.rect(7, 16, 4, 7, '#d4f1ff')
    g.rect(5, 24, 18, 2, '#9a6a45')
    g.rect(8, 27, 12, 4, '#fffaf0')
    g.hline(9, 18, 28, P.redD)
    g.hline(9, 15, 30, P.ink2)
    for (let i = 0; i < 6; i++) {
      const y = 11 - i * 2
      const half = 15 - i * 1.6
      g.rect(Math.round(15 - half), y, Math.round(half * 2), 2, i % 2 ? '#b8543a' : '#c96a48')
      g.hline(Math.round(15 - half), Math.round(15 + half) - 1, y, '#e08a64')
    }
  })
}

/** Heritage plaque: stone slab with the World Heritage emblem. */
export function heritagePlaqueSprite(): Prop {
  return spr('heritage', 22, 22, 11, 21, (g) => {
    g.rect(2, 2, 18, 16, '#8c8187')
    g.rect(3, 3, 16, 14, '#bdb2ae')
    g.hline(3, 18, 3, '#e4ddd6')
    // Emblem: circle with a square.
    g.circle(11, 8, 4, '#3d63b5')
    g.circle(11, 8, 3, '#bdb2ae')
    g.rect(9, 6, 5, 5, '#3d63b5')
    g.rect(10, 7, 3, 3, '#bdb2ae')
    g.hline(5, 16, 14, P.ink2)
    g.hline(6, 14, 16, '#625867')
    g.rect(4, 18, 14, 3, '#625867')
  })
}

/** "Please kneel lower than the Buddha head" sign with a pictogram. */
export function kneelSignSprite(): Prop {
  return spr('kneelsign', 22, 30, 11, 29, (g) => {
    g.rect(10, 16, 2, 13, '#6e4a35')
    g.rect(1, 1, 20, 16, '#3d63b5')
    g.rect(2, 2, 18, 14, '#fffaf0')
    // Head on a plinth and a kneeling figure below it.
    g.circle(15, 6, 2, '#8c8187')
    g.px(15, 3, '#8c8187')
    g.rect(13, 8, 5, 1, '#625867')
    g.circle(6, 9, 1.5, P.ink)
    g.rect(5, 11, 3, 2, P.ink)
    g.rect(5, 13, 5, 1, P.ink)
    g.line(8, 11, 10, 10, P.ink)
    // Down arrow.
    g.vline(11, 4, 7, P.redD)
    g.px(10, 6, P.redD)
    g.px(12, 6, P.redD)
    g.hline(4, 18, 14, P.redD)
  })
}

/** Wooden elephant-mounting platform (ที่ขึ้นช้าง) with steps. */
export function elephantDeckSprite(): Prop {
  return spr('eledeck', 34, 34, 17, 33, (g) => {
    const wood = { L: '#d9a878', b: '#b88458', d: '#8a5e3c', D: '#5e3e28' }
    for (const x of [8, 30]) g.rect(x, 12, 3, 22, wood.d)
    g.rect(6, 10, 26, 4, wood.b)
    g.hline(6, 31, 10, wood.L)
    // Rails.
    for (const x of [7, 31]) g.rect(x, 2, 2, 9, wood.d)
    g.hline(7, 32, 3, wood.b)
    g.hline(7, 32, 6, wood.b)
    // Steps down to the left.
    for (let i = 0; i < 5; i++) {
      g.rect(1 + i, 14 + i * 4, 8, 2, wood.b)
      g.hline(1 + i, 8 + i, 14 + i * 4, wood.L)
    }
    // Sign.
    g.rect(14, 16, 12, 7, '#fffaf0')
    g.rect(15, 18, 5, 3, '#8c8187')
    g.px(21, 19, P.redD)
    g.px(23, 19, P.redD)
  })
}

/** Monitor lizard (ตัวเงินตัวทอง) sunbathing; frame 1 = tongue out. */
export function lizardSprite(frame: 0 | 1, flip = false): Prop {
  return spr(`lizard:${frame}:${flip ? 1 : 0}`, 34, 9, 17, 8, (g) => {
    const b = '#5a5a44'
    const d = '#3e3e30'
    const sp = '#d8c060'
    const f = (x: number) => (flip ? 33 - x : x)
    for (let x = 0; x < 14; x++) g.px(f(x), 5 + Math.round(Math.sin(x * 0.5) * 0.8), d)
    for (let x = 12; x < 28; x++) {
      const w = x < 16 ? 2 : 3
      g.rect(f(x) - (flip ? 0 : 0), 6 - w, 1, w + 1, b)
      if (x % 3 === 0) g.px(f(x), 5 - w + 1, sp)
    }
    for (let x = 27; x < 32; x++) g.rect(f(x), 3, 1, 3, b)
    g.px(f(30), 3, P.ink)
    for (const lx of [15, 24]) {
      g.px(f(lx), 7, d)
      g.px(f(lx + 1), 8, d)
      g.px(f(lx - 1), 8, d)
    }
    if (frame) {
      g.px(f(32), 5, '#e8709e')
      g.px(f(33), 4, '#e8709e')
      g.px(f(33), 6, '#e8709e')
    }
  })
}

/** Brick gate pillar with a stucco lotus-bud finial; optionally the temple's name board. */
export function gatePillarSprite(board = false): Prop {
  return spr(`gpillar:${board ? 1 : 0}`, board ? 34 : 14, 44, 7, 43, (g) => {
    bricks(g, 2, 12, 10, 31, { seed: 61, light: 0.6, slope: -0.35, stucco: 0.2 })
    g.rect(1, 10, 12, 3, '#e8e0d4')
    g.hline(1, 12, 10, '#ffffff')
    g.ellipse(7, 7, 3.5, 3.5, '#efe6da')
    g.ellipse(6, 6, 2, 2, '#ffffff')
    g.poly(
      [
        [4, 6],
        [7, 0],
        [10, 6],
      ],
      '#efe6da',
    )
    g.px(7, 1, '#ffffff')
    g.rect(1, 41, 12, 2, BR.D)
    if (board) {
      g.rect(13, 18, 20, 12, '#6e4a35')
      g.rect(14, 19, 18, 10, '#fff1d6')
      g.hline(16, 29, 21, P.redD)
      g.hline(16, 26, 24, P.ink2)
      g.hline(16, 28, 26, P.ink2)
    }
  })
}

/** An artist's easel with a little painting of the prangs. */
export function easelSprite(): Prop {
  return spr('easel', 18, 30, 9, 29, (g) => {
    g.line(3, 29, 8, 2, '#9a6a45')
    g.line(15, 29, 10, 2, '#9a6a45')
    g.line(9, 8, 9, 29, '#6e4a35')
    g.rect(2, 6, 14, 12, '#fffaf0')
    g.rect(3, 7, 12, 6, '#bfe4f6')
    g.rect(3, 13, 12, 4, '#86c95f')
    g.rect(6, 9, 3, 4, '#cf6a46')
    g.px(7, 8, '#cf6a46')
    g.rect(10, 10, 2, 3, '#aa4f38')
    g.rect(1, 18, 16, 1, '#6e4a35')
  })
}

/** Far skyline: Wat Phra Si Sanphet's three chedis and distant prangs (baked). */
export function ayutthayaSkyline(g: Surface, y: number, w: number, night: boolean) {
  const c = night ? '#6a6aa0' : '#c6a8a8'
  const c2 = night ? '#5a5a8e' : '#b4969a'
  const bell = (cx: number, base: number, s: number, col: string) => {
    g.rect(cx - 7 * s, base - 4 * s, 14 * s, 4 * s, col)
    g.ellipse(cx, base - 7 * s, 5.5 * s, 5 * s, col)
    g.poly(
      [
        [cx - 2 * s, base - 10 * s],
        [cx, base - 26 * s],
        [cx + 2 * s, base - 10 * s],
      ],
      col,
    )
  }
  bell(34, y, 1, c)
  bell(52, y - 1, 1.1, c)
  bell(70, y, 1, c)
  const prang = (cx: number, base: number, s: number, col: string) => {
    g.rect(cx - 6 * s, base - 5 * s, 12 * s, 5 * s, col)
    g.poly(
      [
        [cx - 5 * s, base - 5 * s],
        [cx - 4 * s, base - 16 * s],
        [cx - 2 * s, base - 24 * s],
        [cx, base - 28 * s],
        [cx + 2 * s, base - 24 * s],
        [cx + 4 * s, base - 16 * s],
        [cx + 5 * s, base - 5 * s],
      ],
      col,
    )
  }
  prang(w - 46, y, 1.05, c)
  prang(w - 22, y + 2, 0.7, c2)
  prang(120, y + 3, 0.6, c2)
}

export { SANDSTONE, STUCCO }
