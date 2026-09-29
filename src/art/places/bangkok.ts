// Bangkok group – shared art for the six Bangkok place maps (วัดพระแก้ว,
// วัดโพธิ์, วัดอรุณฯ, ศาลพระพรหมเอราวัณ, ภูเขาทอง, วัดไตรมิตรฯ).
// Everything is procedural pixel art baked once into cached sprites; only the
// scenes animate small things per frame.
//
// This file holds the building blocks used by several places: prop/building
// wrappers, ground painters (marble, granite, roads, river), statues (giant
// yaksha, kinnara, Chinese stone guardians, lions, hermits), a generic Thai
// pavilion and the little vendor stalls.

import { bake, ditherOn, mix, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas } from '../../engine/sprite'
import { P } from '../palette'
import type { Prop } from '../props'
import { GOLD, WHITE, ROOF, slice, tier, longRoof, valance, column, type Ramp, type RoofRamp, type Building, type Pt } from '../temple'

export { GOLD, WHITE, ROOF, slice, tier }
export type { Building, Pt, Ramp, RoofRamp }

// ---------------------------------------------------------------------------
// Wrappers

/** Cached building with animation hooks (relative to the ground anchor), outlined in ink. */
export function bbuild(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): Building {
  return cached('bk:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as Building
    const o = outlineCanvas(c, P.ink)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as Building
  }) as Building
}

export function bprop(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface) => void, outline = true): Prop {
  return bbuild(key, w, h, ax, ay, (g) => fn(g), outline)
}

/** World positions of a building's hooks placed at (x, y). */
export function hookAt(b: Building, name: string, x: number, y: number): Pt[] {
  return (b.hooks[name] ?? []).map((h) => ({ x: x + h.x, y: y + h.y }))
}

/** Deterministic hash → 0..1. */
export function hsh(x: number, y: number, s = 0): number {
  let n = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + s * 7919, 0x9e3779b1)
  n ^= n >>> 15
  n = Math.imul(n, 0x85ebca6b)
  n ^= n >>> 13
  return ((n >>> 0) % 10007) / 10007
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// ---------------------------------------------------------------------------
// Ramps

export const GOLDR: Ramp = { L: GOLD.L, b: GOLD.b, d: GOLD.d, D: GOLD.D }
export const WHITER: Ramp = { L: '#ffffff', b: '#fffaf0', d: '#ece0cc', D: '#d2bfa2' }
export const STONER: Ramp = { L: '#e6e2de', b: '#c9c3be', d: '#a9a29d', D: '#857d7a' }
export const MARBLER: Ramp = { L: '#ffffff', b: '#f6f4f0', d: '#e2ddd6', D: '#c8c0b8' }
export const BRONZER: Ramp = { L: '#e8c47a', b: '#b98244', d: '#8c5c2e', D: '#62381f' }

export const BK = {
  ink: P.ink,
  red: '#d9443f',
  redD: '#a82c36',
  redDD: '#6e1f2e',
  green: '#3f9a6b',
  greenD: '#2c7552',
  blue: '#3d63b5',
  blueL: '#8fb6ff',
  glassB: '#5ab8e8',
  glassG: '#62d0a0',
  jade: '#3fbf7a',
  jadeD: '#1f7a4e',
  jadeL: '#b6f5cf',
  marigold: '#f58f35',
  marigoldL: '#ffbb66',
  jasmine: '#fffaf0',
  wood: '#9a6a45',
  woodD: '#6e4a35',
  woodL: '#c28e5c',
  shadow: 'rgba(58,40,56,0.22)',
} as const

// ---------------------------------------------------------------------------
// Ground painters (for MapDef.bake)

/** Polished white marble slabs with faint grey veins. */
export function marble(g: Surface, x: number, y: number, w: number, h: number, seed = 0, size = 12, tone: 'white' | 'warm' | 'grey' = 'white') {
  const base = tone === 'white' ? '#f5f2ed' : tone === 'warm' ? '#f4ece0' : '#e2dfdc'
  const joint = tone === 'white' ? '#dcd5cc' : tone === 'warm' ? '#dccdb8' : '#c6c0bc'
  const hi = tone === 'grey' ? '#f0eeec' : '#ffffff'
  const vein = tone === 'grey' ? '#cfcac6' : '#e2dcd4'
  g.rect(x, y, w, h, base)
  const rows = Math.ceil(h / (size * 0.7))
  const rh = Math.round(size * 0.7)
  for (let r = 0; r < rows; r++) {
    const yy = y + r * rh
    g.hline(x, x + w - 1, yy, joint)
    const off = r % 2 ? size >> 1 : 0
    for (let i = -off; i < w; i += size) {
      if (i > 0) g.vline(x + i, yy, Math.min(y + h - 1, yy + rh - 1), joint)
      const sx = x + Math.max(0, i + 1)
      const ex = x + Math.min(w - 1, i + size - 1)
      if (ex > sx) g.hline(sx, Math.min(ex, sx + 3), yy + 1, hi)
      // Vein.
      const v = hsh(x + i, yy, seed)
      if (v < 0.55) {
        let vx = x + i + 2 + Math.floor(v * (size - 3))
        let vy = yy + 2
        for (let k = 0; k < rh - 3; k++) {
          if (vx > x && vx < x + w - 1 && vy < y + h) g.px(vx, vy, vein)
          vx += hsh(vx, vy, seed + 1) < 0.5 ? 1 : 0
          vy++
        }
      }
    }
  }
  // Polished reflections.
  for (let j = 0; j < h; j += 2)
    for (let i = (j >> 1) % 2; i < w; i += 7) {
      const X = x + i
      const Y = y + j
      if (Math.sin(X * 0.05 + Y * 0.11 + seed) > 0.93 && ditherOn(X, Y, 0.5)) g.px(X, Y, hi)
    }
}

/** Grey granite slabs (courtyards of the old royal temples). */
export function granite(g: Surface, x: number, y: number, w: number, h: number, seed = 0, size = 10) {
  g.rect(x, y, w, h, '#d8d2cc')
  const rh = 7
  for (let yy = y, r = 0; yy < y + h; yy += rh, r++) {
    g.hline(x, x + w - 1, yy, '#bdb5ae')
    const off = r % 2 ? size >> 1 : 0
    for (let i = -off; i < w; i += size) {
      if (i > 0) g.vline(x + i, yy, Math.min(y + h - 1, yy + rh - 1), '#bdb5ae')
      const v = hsh(x + i, yy, seed)
      const tint = v < 0.3 ? '#cfc8c1' : v > 0.8 ? '#e2ddd8' : null
      if (tint) g.rect(x + Math.max(0, i + 1), yy + 1, Math.min(size - 1, w - Math.max(0, i + 1)), Math.min(rh - 1, y + h - yy - 1), tint)
      if (i + 1 >= 0) g.hline(x + i + 1, x + Math.min(w - 1, i + 3), yy + 1, '#ece8e4')
    }
  }
  for (let k = 0; k < (w * h) / 40; k++) {
    const X = x + Math.floor(hsh(k, seed, 3) * w)
    const Y = y + Math.floor(hsh(seed, k, 4) * h)
    g.px(X, Y, hsh(X, Y, 5) < 0.5 ? '#b4aca6' : '#ebe6e1')
  }
}

/** Old red-brick / terracotta path. */
export function brick(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, '#c9744e')
  for (let yy = y, r = 0; yy < y + h; yy += 4, r++) {
    g.hline(x, x + w - 1, yy, '#a8583c')
    for (let i = r % 2 ? 4 : 0; i < w; i += 8) {
      g.vline(x + i, yy, Math.min(y + h - 1, yy + 3), '#a8583c')
      if (hsh(x + i, yy, seed) < 0.3) g.rect(x + i + 1, yy + 1, 6, 2, '#d88a5e')
    }
  }
}

/** Asphalt road with lane marks. */
export function asphalt(g: Surface, x: number, y: number, w: number, h: number, opts: { lanes?: number; yellow?: boolean; seed?: number } = {}) {
  g.rect(x, y, w, h, '#6a6374')
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = hsh(x + i, y + j, opts.seed ?? 2)
      if (v < 0.035) g.px(x + i, y + j, '#7b7486')
      else if (v > 0.975) g.px(x + i, y + j, '#5c5566')
    }
  const lanes = opts.lanes ?? 2
  for (let l = 1; l < lanes; l++) {
    const ly = Math.round(y + (h * l) / lanes)
    if (opts.yellow && l === lanes >> 1) {
      g.hline(x, x + w - 1, ly - 1, '#f0c040')
      g.hline(x, x + w - 1, ly + 1, '#f0c040')
    } else for (let i = x + 2; i < x + w; i += 14) g.rect(i, ly, 7, 1, '#e8e2dc')
  }
  g.hline(x, x + w - 1, y, '#565060')
}

/** Bangkok sidewalk: square grey tiles with the red kerb stripes. */
export function sidewalk(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, '#d6cfca')
  for (let j = 0; j < h; j += 6) g.hline(x, x + w - 1, y + j, '#c2b9b4')
  for (let i = 0; i < w; i += 6) g.vline(x + i, y, y + h - 1, '#c2b9b4')
  for (let j = 0; j < h; j += 6)
    for (let i = 0; i < w; i += 6) {
      const v = hsh(x + i, y + j, seed)
      if (v < 0.12) g.rect(x + i + 1, y + j + 1, 5, 5, '#ccc4bf')
      else if (v > 0.93) g.rect(x + i + 1, y + j + 1, 5, 5, '#e0d9d4')
      // Tactile guide strip.
    }
}

/** Painted kerb (black-white or red-white stripes). */
export function kerbStripes(g: Surface, x: number, y: number, w: number, a: Color = '#fffaf0', b: Color = '#3a3040') {
  for (let i = 0; i < w; i += 6) g.rect(x + i, y, Math.min(6, w - i), 2, (i / 6) % 2 ? b : a)
  g.hline(x, x + w - 1, y + 2, 'rgba(40,30,40,0.35)')
}

export function zebra(g: Surface, x: number, y: number, w: number, h: number, vertical = false) {
  if (vertical) for (let j = 1; j < h - 1; j += 5) g.rect(x + 1, y + j, w - 2, 3, '#f0ece6')
  else for (let i = 1; i < w - 1; i += 5) g.rect(x + i, y + 1, 3, h - 2, '#f0ece6')
}

/**
 * A raised platform seen in 3/4: the walkable top surface from y..y+h and
 * the front face below it (faceH rows). The top is left for the caller to
 * pave; this paints the face, lip and a soft drop shadow.
 */
export function platformFace(g: Surface, x: number, y: number, w: number, faceH: number, r: Ramp = WHITER, band?: Color) {
  g.rect(x, y, w, faceH, r.b)
  g.hline(x, x + w - 1, y, r.L)
  g.hline(x, x + w - 1, y + 1, r.d)
  g.rect(x, y + faceH - 2, w, 2, r.D)
  if (band) {
    const by = y + Math.round(faceH * 0.45)
    g.rect(x, by, w, 2, band)
    g.hline(x, x + w - 1, by - 1, GOLD.d)
    g.hline(x, x + w - 1, by + 2, GOLD.d)
  }
  g.vline(x, y, y + faceH - 1, r.d)
  g.vline(x + w - 1, y, y + faceH - 1, r.D)
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(58,40,56,0.16)'
  g.ctx.fillRect(x - g.ox, y + faceH - g.oy, w, 2)
  g.ctx.restore()
}

/** Flight of steps from yTop down to yBot (baked), centred on cx. */
export function stairs(g: Surface, cx: number, yTop: number, yBot: number, half: number, r: Ramp = WHITER, step = 3, flare = 0) {
  const n = Math.max(1, Math.round((yBot - yTop) / step))
  for (let i = 0; i < n; i++) {
    const y0 = Math.round(yTop + ((yBot - yTop) * i) / n)
    const y1 = Math.round(yTop + ((yBot - yTop) * (i + 1)) / n)
    const hw = half + Math.round((flare * i) / n)
    g.rect(cx - hw, y0, hw * 2, y1 - y0, r.b)
    g.hline(cx - hw, cx + hw - 1, y0, r.L)
    g.hline(cx - hw, cx + hw - 1, y1 - 1, r.D)
    g.px(cx + hw - 1, y0 + 1, r.d)
  }
}

/** Low balustrade along a platform edge (baked). */
export function balustrade(g: Surface, x0: number, x1: number, y: number, r: Ramp = WHITER, h = 5, gap = 4) {
  g.rect(x0, y - h, x1 - x0 + 1, 2, r.b)
  g.hline(x0, x1, y - h, r.L)
  for (let x = x0 + 1; x < x1; x += gap) {
    g.rect(x, y - h + 2, 2, h - 2, r.d)
    g.px(x, y - h + 2, r.b)
  }
  g.hline(x0, x1, y, r.D)
}

/** Chao Phraya water (baked base; the scene animates glints on top). */
export function riverWater(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.gradientV(x, y, w, h, ['#7cc0b4', '#63a89f', '#548f8c', '#4a7f80'], 5)
  for (let yy = y + 3; yy < y + h; yy += 4)
    for (let xx = x + ((yy * 7 + seed) % 11); xx < x + w; xx += 13 + ((yy * 3) % 7)) {
      const len = 3 + ((xx + yy) % 5)
      g.hline(xx, xx + len, yy, yy < y + h * 0.4 ? '#a6ddd0' : '#7fb8ae')
    }
}

/** Soft rounded drop shadow under a statue/prop, baked into the ground. */
export function blobShadow(g: Surface, cx: number, cy: number, rx: number, ry: number, a = 0.22) {
  g.ctx.save()
  g.ctx.fillStyle = `rgba(58,40,56,${a})`
  for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++) {
    const dy = (yy + 0.5 - cy) / ry
    if (Math.abs(dy) > 1) continue
    const half = rx * Math.sqrt(1 - dy * dy)
    g.ctx.fillRect(Math.round(cx - half) - g.ox, yy - g.oy, Math.round(half * 2), 1)
  }
  g.ctx.restore()
}

/** Porcelain/glass mosaic speckle over a rectangle. */
export function mosaic(g: Surface, x: number, y: number, w: number, h: number, cols: Color[], density = 0.3, seed = 0) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = hsh(x + i, y + j, seed)
      if (v < density) g.px(x + i, y + j, cols[Math.floor((v / density) * cols.length) % cols.length])
    }
}

/** Little porcelain flower (Wat Arun style): petals around a centre. */
export function porcelainFlower(g: Surface, x: number, y: number, petal: Color, centre: Color = GOLD.b) {
  g.px(x, y - 1, petal)
  g.px(x - 1, y, petal)
  g.px(x + 1, y, petal)
  g.px(x, y + 1, petal)
  g.px(x, y, centre)
}

// ---------------------------------------------------------------------------
// Giant yaksha guardians (ยักษ์วัดพระแก้ว / วัดอรุณฯ)

export type YakshaKind = 'thotsakan' | 'sahatsadecha' | 'suriyaphop' | 'wirunchambang' | 'maiyarap' | 'inthorachit'

const YAK: Record<YakshaKind, { skin: Color; skinD: Color; skinL: Color; cloth: Color; clothD: Color; trim: Color; crown: 'faces' | 'spire' | 'rooster' }> = {
  thotsakan: { skin: '#3fae6a', skinD: '#2a7f4e', skinL: '#7fd89a', cloth: '#d9443f', clothD: '#9e2a33', trim: '#3d63b5', crown: 'faces' },
  sahatsadecha: { skin: '#f3efe6', skinD: '#cfc6b8', skinL: '#ffffff', cloth: '#3d63b5', clothD: '#26306e', trim: '#d9443f', crown: 'spire' },
  suriyaphop: { skin: '#e0564a', skinD: '#a83a3a', skinL: '#ff8a7a', cloth: '#2f8a5a', clothD: '#1e5a3e', trim: '#ffd23f', crown: 'spire' },
  wirunchambang: { skin: '#4f5fb8', skinD: '#343f86', skinL: '#8a9ae8', cloth: '#f5b83a', clothD: '#c07a22', trim: '#d9443f', crown: 'rooster' },
  maiyarap: { skin: '#8a58c8', skinD: '#5e3a94', skinL: '#b99ae8', cloth: '#e8709e', clothD: '#a84872', trim: '#3fae6a', crown: 'spire' },
  inthorachit: { skin: '#6cc36a', skinD: '#43905a', skinL: '#b4e486', cloth: '#5a8de0', clothD: '#3d63b5', trim: '#f58f35', crown: 'rooster' },
}

/** A towering guardian giant (about 2× a person) on a pedestal, hands on a mace. */
export function giantYaksha(kind: YakshaKind = 'thotsakan'): Prop {
  const k = YAK[kind]
  const W = 48
  const H = 96
  return bprop(`yak:${kind}`, W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    const G = GOLD
    // Pedestal.
    tier(g, cx, H - 10, 10, 21, WHITER, BK.redD)
    g.hline(cx - 20, cx + 19, H - 6, G.d)
    // Feet and anklets.
    for (const s of [-1, 1]) {
      const fx = cx + s * 9
      g.rect(fx - 4, H - 14, 8, 4, k.skin)
      g.hline(fx - 4, fx + 3, H - 11, k.skinD)
      g.px(fx + s * 3, H - 13, k.skinL)
      g.rect(fx - 4, H - 17, 8, 3, G.b)
      g.hline(fx - 4, fx + 3, H - 17, G.L)
      g.px(fx - 2, H - 16, BK.red)
      g.px(fx + 1, H - 16, BK.red)
    }
    // Legs (patterned trousers).
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? cx - 14 : cx + 4
      for (let y = 60; y < H - 17; y++) {
        const w = 10 - (y > 74 ? 1 : 0)
        g.rect(x0 + (s < 0 ? 0 : 0), y, w, 1, k.cloth)
        if ((y - 60) % 4 === 1) for (let x = x0 + 1; x < x0 + w - 1; x += 3) g.px(x, y, G.b)
        if ((y - 60) % 4 === 3) for (let x = x0 + 2; x < x0 + w - 1; x += 3) g.px(x, y, k.trim)
        g.px(s < 0 ? x0 + w - 1 : x0, y, k.clothD)
      }
      // Knee guards.
      g.rect(x0 + 1, 67, 8, 3, G.b)
      g.hline(x0 + 1, x0 + 8, 67, G.L)
      g.px(x0 + 4, 68, BK.red)
    }
    // Front cloth panel (ชายไหว) between the legs.
    for (let y = 58; y < 80; y++) {
      const hw = 4 - Math.floor((y - 58) / 10)
      g.rect(cx - hw, y, hw * 2, 1, y % 3 === 0 ? G.d : k.clothD)
      g.px(cx - hw, y, G.b)
      g.px(cx + hw - 1, y, G.D)
    }
    g.rect(cx - 2, 80, 4, 2, G.b)
    // Belt with a monster-face buckle.
    g.rect(cx - 13, 55, 26, 5, G.b)
    g.hline(cx - 13, cx + 12, 55, G.L)
    g.hline(cx - 13, cx + 12, 59, G.D)
    g.rect(cx - 4, 54, 8, 7, G.d)
    g.rect(cx - 3, 55, 6, 5, G.b)
    g.px(cx - 2, 56, BK.ink)
    g.px(cx + 1, 56, BK.ink)
    g.hline(cx - 2, cx + 1, 58, BK.red)
    // Hip flaps.
    for (const s of [-1, 1]) {
      g.poly(
        [
          [cx + s * 13, 58],
          [cx + s * 18, 66],
          [cx + s * 14, 68],
          [cx + s * 10, 60],
        ],
        k.cloth,
      )
      g.line(cx + s * 13, 58, cx + s * 18, 66, G.b)
    }
    // Torso.
    for (let y = 36; y < 55; y++) {
      const hw = 11 - Math.max(0, Math.floor((y - 44) / 4))
      g.rect(cx - hw, y, hw * 2, 1, k.skin)
      g.px(cx + hw - 2, y, k.skinD)
      g.px(cx + hw - 1, y, k.skinD)
      g.px(cx - hw + 1, y, k.skinL)
    }
    // Chest armour: collar and crossing sashes.
    g.rect(cx - 10, 36, 20, 4, G.b)
    g.hline(cx - 10, cx + 9, 36, G.L)
    for (let x = cx - 9; x < cx + 9; x += 3) g.px(x, 38, BK.red)
    for (let i = 0; i < 16; i++) {
      g.px(cx - 9 + i, 40 + i, G.b)
      g.px(cx + 8 - i, 40 + i, G.b)
      if (i % 3 === 0) {
        g.px(cx - 9 + i, 41 + i, G.D)
        g.px(cx + 8 - i, 41 + i, G.D)
      }
    }
    g.rect(cx - 2, 46, 4, 4, G.d)
    g.px(cx - 1, 47, BK.red)
    g.px(cx, 47, BK.red)
    // Flame epaulettes.
    for (const s of [-1, 1]) {
      const sx = cx + s * 13
      g.poly(
        [
          [sx - 5, 40],
          [sx + s * 6, 30],
          [sx + s * 4, 36],
          [sx + s * 8, 34],
          [sx + s * 5, 42],
          [sx, 43],
        ],
        G.b,
      )
      g.line(sx, 40, sx + s * 6, 31, G.L)
      g.px(sx + s * 2, 39, BK.red)
    }
    // Arms: elbows out, hands meeting on the mace in front of the belly.
    for (const s of [-1, 1]) {
      g.thickLine(cx + s * 13, 41, cx + s * 16, 50, 5, k.skin)
      g.thickLine(cx + s * 16, 50, cx + s * 5, 53, 4.5, k.skin)
      g.px(cx + s * 16, 47, k.skinL)
      // Arm bands.
      g.rect(cx + s * 15 - 2, 44, 5, 2, G.b)
      g.rect(cx + s * 11 - 2, 51, 4, 2, G.b)
    }
    // Mace (กระบอง) planted in front.
    g.rect(cx - 1, 50, 3, H - 12 - 50, G.d)
    g.vline(cx - 1, 50, H - 13, G.L)
    for (let y = 60; y < H - 14; y += 6) g.rect(cx - 1, y, 3, 1, BK.red)
    g.ellipse(cx, 50, 4, 3, G.b)
    g.px(cx - 2, 49, G.L)
    // Hands over the knob.
    g.ellipse(cx - 3, 52, 3, 2.2, k.skin)
    g.ellipse(cx + 3, 52, 3, 2.2, k.skinD)
    g.px(cx - 4, 51, k.skinL)
    // Neck.
    g.rect(cx - 4, 32, 8, 4, k.skinD)
    // Head.
    g.ellipse(cx, 25, 10, 9, k.skin)
    g.ellipse(cx + 3, 26, 6, 7, k.skinD)
    g.ellipse(cx - 2, 24, 7, 7, k.skin)
    g.px(cx - 6, 21, k.skinL)
    g.px(cx - 5, 20, k.skinL)
    // Ears with big gold earrings.
    for (const s of [-1, 1]) {
      g.rect(cx + s * 10 - (s > 0 ? 1 : 1), 22, 3, 5, k.skinD)
      g.ellipse(cx + s * 10, 31, 2, 3, G.b)
      g.px(cx + s * 10, 30, BK.red)
      g.px(cx + s * 10, 34, G.D)
    }
    // Fierce brows and bulging eyes.
    g.hline(cx - 8, cx - 2, 20, k.skinD)
    g.hline(cx + 1, cx + 7, 20, k.skinD)
    g.px(cx - 8, 19, BK.ink)
    g.px(cx + 7, 19, BK.ink)
    for (const s of [-1, 1]) {
      const ex = cx + s * 4 - (s > 0 ? 1 : 0)
      g.ellipse(ex, 23, 2.8, 2.2, '#ffffff')
      g.rect(ex - 1, 22, 2, 2, BK.ink)
      g.px(ex - 1, 22, '#ffffff')
      g.hline(ex - 2, ex + 2, 21, BK.ink)
    }
    // Nose and fanged grin.
    g.rect(cx - 1, 25, 3, 2, k.skinD)
    g.px(cx - 2, 26, BK.ink)
    g.px(cx + 2, 26, BK.ink)
    g.rect(cx - 5, 28, 11, 3, BK.redDD)
    g.hline(cx - 5, cx + 5, 28, '#ffffff')
    g.px(cx - 4, 27, '#ffffff')
    g.px(cx + 4, 27, '#ffffff')
    g.px(cx - 4, 26, '#ffffff')
    g.px(cx + 4, 26, '#ffffff')
    g.hline(cx - 3, cx + 3, 30, '#ff8a8a')
    g.hline(cx - 5, cx + 5, 31, k.skinD)
    // Crown (ชฎา / มงกุฎยักษ์).
    g.rect(cx - 10, 15, 20, 4, G.b)
    g.hline(cx - 10, cx + 9, 15, G.L)
    g.hline(cx - 10, cx + 9, 18, G.D)
    for (let x = cx - 8; x < cx + 9; x += 4) g.px(x, 16, BK.red)
    if (k.crown === 'faces') {
      // Thotsakan: rows of tiny faces stacked up the crown.
      for (let row = 0; row < 2; row++) {
        const y = 11 - row * 5
        const n = row === 0 ? 3 : 2
        for (let i = 0; i < n; i++) {
          const fx = cx - (n - 1) * 3 + i * 6
          g.ellipse(fx, y, 2.6, 2.4, k.skin)
          g.px(fx - 1, y - 1, BK.ink)
          g.px(fx + 1, y - 1, BK.ink)
          g.hline(fx - 1, fx + 1, y + 1, BK.redDD)
          g.rect(fx - 3, y - 3, 6, 1, G.b)
        }
      }
      for (let i = 0; i < 5; i++) g.rect(cx - 2 + (i > 2 ? 1 : 0), -1 + i, 4 - (i > 2 ? 2 : 0), 1, G.b)
      g.px(cx, -2 + 1, G.L)
    } else if (k.crown === 'rooster') {
      // Curved rooster-tail crown.
      for (let i = 0; i < 14; i++) {
        const hw = Math.max(1, 7 - i * 0.5)
        g.rect(Math.round(cx - hw + (i > 8 ? i - 8 : 0)), 14 - i, Math.round(hw * 2), 1, i % 3 === 0 ? G.d : G.b)
      }
      g.px(cx + 7, 0, G.L)
      g.px(cx + 8, 1, G.b)
    } else {
      // Tall pointed spire with stacked tiers.
      for (let i = 0; i < 15; i++) {
        const hw = Math.max(0.6, 8 - i * 0.52)
        g.rect(Math.round(cx - hw), 14 - i, Math.max(1, Math.round(hw * 2)), 1, i % 3 === 0 ? G.D : i % 3 === 1 ? G.b : G.l)
      }
      g.px(cx, -1 + 1, G.L)
    }
    // Crown ear flaps (กรรเจียก).
    for (const s of [-1, 1]) {
      g.poly(
        [
          [cx + s * 9, 16],
          [cx + s * 15, 10],
          [cx + s * 13, 18],
        ],
        G.b,
      )
      g.px(cx + s * 13, 12, G.L)
    }
  })
}

// ---------------------------------------------------------------------------
// Kinnari / kinnara (half bird) in gilded bronze on a pedestal.

export function kinnaraSprite(male = false): Prop {
  return bprop(`kinnara:${male ? 1 : 0}`, 26, 40, 13, 39, (g) => {
    const cx = 13
    const G = GOLD
    tier(g, cx, 34, 6, 9, WHITER, BK.redD)
    // Tail feathers behind.
    for (let i = 0; i < 6; i++) g.line(cx + 2, 30, cx + 9 + i, 18 + i * 2, i % 2 ? G.d : G.b)
    // Wings.
    for (const s of [-1, 1]) {
      g.poly(
        [
          [cx + s * 2, 16],
          [cx + s * 11, 8],
          [cx + s * 12, 13],
          [cx + s * 9, 20],
          [cx + s * 3, 22],
        ],
        s < 0 ? G.b : G.d,
      )
      for (let j = 0; j < 3; j++) g.line(cx + s * 4, 18 - j, cx + s * (10 - j), 10 + j * 2, G.D)
    }
    // Bird legs.
    g.rect(cx - 3, 27, 2, 7, G.d)
    g.rect(cx + 1, 27, 2, 7, G.D)
    g.hline(cx - 5, cx - 1, 33, G.D)
    g.hline(cx + 1, cx + 5, 33, G.D)
    // Feathered skirt.
    g.ellipse(cx, 25, 5, 4, G.b)
    for (let x = cx - 4; x <= cx + 4; x += 2) g.px(x, 28, G.D)
    // Torso and arms in wai.
    g.rect(cx - 3, 15, 6, 8, G.b)
    g.px(cx + 2, 16, G.d)
    g.rect(cx - 1, 14, 2, 6, G.l)
    g.px(cx - 1, 13, G.L)
    // Head and crown.
    g.ellipse(cx, 10, 3, 3.2, G.b)
    g.px(cx - 1, 10, G.D)
    g.px(cx + 1, 10, G.D)
    for (let i = 0; i < 6; i++) g.rect(cx - 2 + (i >> 1), 6 - i, Math.max(1, 5 - i), 1, i % 2 ? G.d : G.l)
    g.px(cx, 0, G.L)
    if (male) g.hline(cx - 2, cx + 2, 12, G.D)
  })
}

// ---------------------------------------------------------------------------
// Chinese granite guardians (ตุ๊กตาอับเฉา) – ballast stones from the junk trade.

export type StoneKind = 'warrior' | 'scholar' | 'farang' | 'lion'

export function stoneGuardian(kind: StoneKind, flip = false): Prop {
  const W = 22
  const H = kind === 'lion' ? 30 : 46
  return bprop(`stone:${kind}:${flip ? 1 : 0}`, W, H, W >> 1, H - 1, (g) => {
    const cx = W >> 1
    const S = STONER
    const f = flip ? -1 : 1
    // Plinth.
    tier(g, cx, H - 6, 6, 9, S)
    if (kind === 'lion') {
      // Chinese guardian lion sitting on a block, paw on a ball.
      g.rect(cx - 7, H - 16, 14, 10, S.b)
      g.rect(cx + 4, H - 16, 3, 10, S.d)
      g.ellipse(cx, H - 18, 7, 5, S.b)
      g.ellipse(cx, H - 23, 6, 5, S.b)
      g.ellipse(cx + 2 * f, H - 23, 4, 4, S.d)
      // Curly mane.
      for (let a = 0; a < 8; a++) g.px(cx + Math.round(Math.cos(a) * 6), H - 23 + Math.round(Math.sin(a) * 5), S.D)
      g.px(cx - 2, H - 24, S.D)
      g.px(cx + 2, H - 24, S.D)
      g.hline(cx - 2, cx + 2, H - 21, S.D)
      g.circle(cx + 5 * f, H - 9, 2.5, S.L)
      g.px(cx + 5 * f, H - 9, S.d)
      return
    }
    const robe = kind === 'farang' ? S.d : S.b
    // Legs / robe hem.
    if (kind === 'warrior') {
      g.rect(cx - 5, H - 16, 4, 10, S.b)
      g.rect(cx + 1, H - 16, 4, 10, S.d)
      g.rect(cx - 6, H - 8, 5, 2, S.D)
      g.rect(cx + 1, H - 8, 5, 2, S.D)
    } else if (kind === 'farang') {
      g.rect(cx - 4, H - 18, 3, 12, S.d)
      g.rect(cx + 1, H - 18, 3, 12, S.D)
      g.rect(cx - 5, H - 8, 4, 2, S.D)
      g.rect(cx + 1, H - 8, 4, 2, S.D)
    } else {
      for (let y = H - 22; y < H - 6; y++) {
        const hw = 5 + Math.floor((y - (H - 22)) / 5)
        g.rect(cx - hw, y, hw * 2, 1, robe)
        g.px(cx + hw - 1, y, S.D)
      }
      g.hline(cx - 7, cx + 6, H - 7, S.D)
    }
    // Body.
    for (let y = H - 34; y < H - 15; y++) {
      const hw = kind === 'warrior' ? 7 : 6
      g.rect(cx - hw, y, hw * 2, 1, robe)
      g.px(cx + hw - 1, y, S.D)
      g.px(cx - hw, y, S.L)
    }
    if (kind === 'warrior') {
      // Armour scales and a belt.
      for (let y = H - 32; y < H - 18; y += 2) for (let x = cx - 5 + ((y >> 1) % 2); x < cx + 5; x += 2) g.px(x, y, S.d)
      g.rect(cx - 7, H - 20, 14, 2, S.D)
      // Halberd.
      g.vline(cx + 9 * f, H - 44, H - 7, S.D)
      g.rect(cx + 8 * f - (f < 0 ? 2 : 0), H - 44, 3, 4, S.d)
      g.px(cx + 9 * f, H - 45, S.L)
    } else if (kind === 'scholar') {
      g.vline(cx, H - 33, H - 8, S.d)
      // Sleeves meeting at the front holding a tablet.
      g.rect(cx - 6, H - 27, 12, 4, S.L)
      g.rect(cx - 1, H - 31, 2, 6, S.D)
    } else {
      // Coat lapels and buttons.
      g.line(cx - 2, H - 33, cx, H - 26, S.L)
      g.line(cx + 2, H - 33, cx, H - 26, S.b)
      for (let y = H - 25; y < H - 17; y += 3) g.px(cx, y, S.D)
      // Walking cane.
      g.vline(cx + 8 * f, H - 26, H - 7, S.D)
    }
    // Arms.
    g.rect(cx - 8, H - 32, 3, 10, S.d)
    g.rect(cx + 5, H - 32, 3, 10, S.D)
    // Head.
    g.ellipse(cx, H - 38, 4.5, 4.5, S.b)
    g.px(cx - 2, H - 39, S.D)
    g.px(cx + 1, H - 39, S.D)
    g.hline(cx - 1, cx + 1, H - 36, S.D)
    if (kind === 'warrior') {
      g.rect(cx - 5, H - 44, 10, 3, S.d)
      g.px(cx, H - 46, S.D)
      g.px(cx, H - 45, S.d)
      g.hline(cx - 2, cx + 2, H - 34, S.D) // beard
    } else if (kind === 'scholar') {
      g.rect(cx - 4, H - 44, 8, 3, S.D)
      g.rect(cx - 6, H - 42, 12, 1, S.D)
      g.rect(cx - 1, H - 35, 3, 3, S.d) // long beard
    } else {
      // Top hat!
      g.rect(cx - 6, H - 42, 12, 2, S.D)
      g.rect(cx - 4, H - 46, 8, 5, S.d)
      g.hline(cx - 4, cx + 3, H - 46, S.b)
      g.hline(cx - 4, cx + 3, H - 43, S.D)
    }
  })
}

/** Bronze Khmer-style lion (สิงห์) on a pedestal. */
export function singhaSprite(flip = false): Prop {
  return bprop(`singha:${flip ? 1 : 0}`, 26, 30, 13, 29, (g) => {
    const B = BRONZER
    const f = flip ? -1 : 1
    tier(g, 13, 24, 5, 11, WHITER, BK.redD)
    // Haunches and forelegs.
    g.ellipse(13 - 3 * f, 18, 7, 5, B.b)
    g.rect(13 + 2 * f - 2, 13, 5, 11, B.b)
    g.rect(13 + 4 * f - 1, 14, 2, 10, B.d)
    // Chest and head up high.
    g.ellipse(13 + 2 * f, 11, 6, 5, B.b)
    g.ellipse(13 + 4 * f, 6, 5, 4.5, B.b)
    g.ellipse(13 + 5 * f, 7, 3, 3, B.d)
    // Mane curls.
    for (let i = 0; i < 6; i++) g.px(13 + 4 * f + Math.round(Math.cos(i) * 5), 6 + Math.round(Math.sin(i) * 4.5), B.D)
    g.px(13 + 6 * f, 5, '#ffffff')
    g.px(13 + 7 * f, 8, B.D)
    g.hline(13 + 5 * f - 1, 13 + 5 * f + 1, 9, BK.redDD)
    g.px(13 + 2 * f, 3, B.L)
    g.px(13 - 5 * f, 16, B.L)
    // Tail curling up.
    g.line(13 - 9 * f, 17, 13 - 10 * f, 11, B.d)
    g.px(13 - 10 * f, 10, B.L)
  })
}

/** Stone hermit (ฤๅษีดัดตน) demonstrating a stretch; pose 0..3. */
export function hermitSprite(pose = 0): Prop {
  return bprop(`hermit:${pose}`, 24, 34, 12, 33, (g) => {
    const cx = 12
    tier(g, cx, 29, 5, 10, STONER)
    const skin = '#c9a47a'
    const skinD = '#9c7a52'
    const cloth = '#b9a079'
    // Tiger-skin loincloth hermit with a tall cap.
    if (pose === 0) {
      // Seated, one leg over the knee, arm stretched up.
      g.ellipse(cx, 26, 7, 3, skinD)
      g.rect(cx - 3, 16, 6, 9, skin)
      g.rect(cx - 3, 22, 6, 4, cloth)
      g.thickLine(cx + 2, 17, cx + 7, 8, 2, skin)
      g.thickLine(cx - 2, 18, cx - 6, 23, 2, skin)
    } else if (pose === 1) {
      // Standing on one leg, hands together overhead.
      g.rect(cx - 1, 20, 2, 9, skin)
      g.line(cx, 22, cx + 5, 18, skinD)
      g.line(cx + 5, 18, cx + 1, 17, skinD)
      g.rect(cx - 3, 12, 6, 9, skin)
      g.rect(cx - 3, 18, 6, 3, cloth)
      g.line(cx - 2, 12, cx - 1, 3, skin)
      g.line(cx + 2, 12, cx + 1, 3, skin)
    } else if (pose === 2) {
      // Deep side bend.
      g.rect(cx - 4, 20, 2, 9, skin)
      g.rect(cx + 2, 20, 2, 9, skinD)
      g.rect(cx - 4, 17, 8, 4, cloth)
      g.poly(
        [
          [cx - 3, 17],
          [cx + 3, 17],
          [cx + 8, 10],
          [cx + 4, 8],
        ],
        skin,
      )
      g.thickLine(cx + 6, 9, cx + 9, 20, 2, skin)
    } else {
      // Seated twist hugging a knee.
      g.ellipse(cx, 26, 8, 3, skinD)
      g.rect(cx - 4, 16, 7, 10, skin)
      g.rect(cx - 4, 22, 7, 4, cloth)
      g.ellipse(cx + 4, 20, 3, 4, skinD)
      g.thickLine(cx - 3, 18, cx + 5, 17, 2, skin)
    }
    // Head with beard and pointed hermit cap.
    const hx = pose === 2 ? cx + 6 : cx
    const hy = pose === 1 ? 10 : pose === 2 ? 7 : 13
    g.ellipse(hx, hy, 2.8, 2.8, skin)
    g.rect(hx - 1, hy + 2, 3, 3, '#f0ece4')
    g.px(hx - 1, hy - 1, '#3a2838')
    g.px(hx + 1, hy - 1, '#3a2838')
    for (let i = 0; i < 5; i++) g.rect(hx - 2 + (i >> 1), hy - 3 - i, Math.max(1, 5 - i), 1, i % 2 ? '#d9b36a' : '#c0924c')
  })
}

// ---------------------------------------------------------------------------
// Generic Thai pavilion (ศาลา): open sides, tiled roof seen from the long side.

export interface SalaOpts {
  w: number
  roof?: RoofRamp
  floor?: 'wood' | 'white'
  posts?: Color
  h?: number
  /** Draw mats/cushions on the floor. */
  mats?: boolean
  gold?: boolean
}

export function salaSprite(o: SalaOpts): Building {
  const W = o.w
  const H = (o.h ?? 30) + 22
  const roof = o.roof ?? ROOF.orange
  return bbuild(`sala:${W}:${H}:${roof.field}:${o.floor ?? 'wood'}:${o.posts ?? ''}:${o.mats ? 1 : 0}`, W, H, W >> 1, H - 1, (g, hooks) => {
    const floorY = H - 6
    // Plinth.
    tier(g, W >> 1, floorY, 6, (W >> 1) - 1, WHITER, o.floor === 'white' ? undefined : BK.redD)
    // Floor boards.
    const fl = o.floor === 'white' ? '#efe8dc' : '#c9965e'
    g.rect(3, floorY - 3, W - 6, 3, fl)
    g.hline(3, W - 4, floorY - 3, o.floor === 'white' ? '#ffffff' : '#e0b27a')
    if (o.mats) {
      for (let x = 8; x < W - 14; x += 14) {
        g.rect(x, floorY - 3, 11, 2, '#e8c890')
        g.hline(x + 1, x + 9, floorY - 2, '#d9443f')
      }
    }
    // Posts.
    const postC = o.posts ?? BK.redD
    const top = 20
    const n = Math.max(2, Math.round(W / 26))
    for (let i = 0; i <= n; i++) {
      const x = Math.round(4 + ((W - 11) * i) / n)
      if (o.posts === 'white') column(g, x, top, floorY - 3, 3)
      else {
        g.rect(x, top, 3, floorY - 3 - top, postC)
        g.vline(x, top, floorY - 4, mix(postC, '#ffffff', 0.3))
        g.rect(x - 1, floorY - 6, 5, 3, GOLD.d)
      }
    }
    // Beam and valance.
    g.rect(2, top - 2, W - 4, 3, postC === 'white' ? BK.redD : postC)
    g.hline(2, W - 3, top - 2, GOLD.l)
    g.hline(2, W - 3, top, GOLD.D)
    valance(g, 6, W - 7, top + 1)
    longRoof(g, 2, W - 3, 4, top - 3, Math.min(10, Math.round(W / 8)), roof)
    hooks.bells = [
      { x: 1, y: top + 2 },
      { x: W - 2, y: top + 2 },
    ]
    hooks.floor = [{ x: W >> 1, y: floorY - 3 }]
    hooks.lamp = [{ x: W >> 1, y: top + 4 }]
  })
}

// ---------------------------------------------------------------------------
// Vendor stalls and carts

function umbrella(g: Surface, cx: number, top: number, half: number, a: Color, b: Color, pole = 14) {
  for (let i = 0; i <= 8; i++) {
    const y = top + 8 - i
    const hw = half - i * (half / 9)
    for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) g.px(x, y, Math.floor((x - cx + 64) / 5) % 2 ? a : b)
  }
  for (let x = Math.round(cx - half); x < cx + half; x += 5) {
    g.px(x + 2, top + 9, a)
    g.px(x + 3, top + 9, a)
  }
  g.px(cx, top - 1, GOLD.b)
  g.rect(cx, top + 9, 1, pole, '#8c8187')
}

/** Coconut ice-cream push cart (รถไอติมกะทิ) with a striped umbrella. */
export function iceCreamCart(): Prop {
  return bprop('icecart', 46, 50, 23, 49, (g) => {
    umbrella(g, 23, 2, 22, '#ff9fc0', '#fffaf0', 18)
    // Cart body.
    g.rect(4, 30, 38, 13, '#5ab8e8')
    g.rect(4, 30, 38, 2, '#9fd8f5')
    g.rect(4, 41, 38, 2, '#3a86b4')
    // Painted sign: coconut + ice-cream.
    g.rect(8, 33, 16, 6, '#fffaf0')
    g.circle(12, 36, 2, '#8a5a3a')
    g.px(11, 35, '#b07a52')
    g.rect(16, 34, 2, 3, '#fff4d6')
    g.px(16, 33, '#ff9fc0')
    g.px(17, 33, '#ffd6e0')
    g.hline(19, 22, 35, BK.redD)
    g.hline(19, 21, 37, P.ink2)
    // Steel ice-cream tubs with lids.
    for (const x of [27, 35]) {
      g.rect(x, 25, 7, 5, '#c9c3d0')
      g.ellipse(x + 3.5, 25, 3.5, 1.4, '#e8e4ee')
      g.px(x + 3, 24, '#8c8699')
    }
    // Toppings jars and a stack of coconut shells.
    g.rect(6, 25, 4, 5, '#e8f4ff')
    g.rect(6, 27, 4, 3, '#e0b27a')
    g.rect(11, 25, 4, 5, '#e8f4ff')
    g.rect(11, 27, 4, 3, '#fff09a')
    g.rect(16, 25, 4, 5, '#e8f4ff')
    g.rect(16, 27, 4, 3, '#fffaf0')
    g.ellipse(23, 28, 3, 2, '#8a5a3a')
    g.ellipse(23, 26, 3, 1.6, '#fffaf0')
    // Wheels and handle.
    g.circle(10, 45, 3, '#3a3040')
    g.circle(36, 45, 3, '#3a3040')
    g.px(10, 45, '#bdb2ae')
    g.px(36, 45, '#bdb2ae')
    g.line(42, 32, 45, 29, '#8c8187')
    g.rect(1, 36, 3, 2, '#fffaf0')
    g.px(2, 35, '#ffd23f')
  })
}

/** Amulet & souvenir table (แผงพระเครื่อง ของที่ระลึก) with a glass case. */
export function amuletStall(): Prop {
  return bprop('amuletstall', 48, 44, 24, 43, (g) => {
    umbrella(g, 24, 1, 22, '#e8514a', '#ffd23f', 14)
    // Table with red cloth.
    g.rect(3, 26, 42, 3, '#d9443f')
    g.hline(3, 44, 26, '#ff8a7a')
    g.rect(3, 29, 42, 9, '#a82c36')
    for (let x = 5; x < 44; x += 4) g.px(x, 30, GOLD.b)
    g.rect(5, 38, 2, 5, BK.woodD)
    g.rect(41, 38, 2, 5, BK.woodD)
    // Glass case with rows of tiny amulets.
    g.rect(6, 18, 20, 8, '#dff4ff')
    g.frame(6, 18, 20, 8, '#8c8699')
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 5; i++) {
        const x = 8 + i * 4
        const y = 19 + r * 3
        g.rect(x, y, 2, 2, GOLD.d)
        g.px(x, y, i % 2 ? '#8a6444' : GOLD.l)
      }
    // Framed amulets on a stand, bracelets, tiny tuk-tuk and elephant souvenirs.
    g.rect(29, 14, 6, 12, '#6e4a35')
    for (let y = 15; y < 25; y += 4) {
      g.rect(30, y, 4, 3, GOLD.b)
      g.px(31, y + 1, '#8a5a3a')
    }
    g.rect(37, 22, 5, 3, '#5a8de0')
    g.px(38, 21, '#e8514a')
    g.circle(40, 21, 1, '#ffd23f')
    g.ellipse(39, 18, 3, 2, '#bdb2ae')
    g.px(41, 17, '#8c8187')
    g.px(37, 18, '#8c8187')
    // Sign.
    g.rect(14, 31, 20, 5, '#fffaf0')
    g.hline(16, 31, 33, BK.redD)
  })
}

/** Herbal balm & compress stall (ยาหม่อง ลูกประคบ). */
export function balmStall(): Prop {
  return bprop('balmstall', 48, 46, 24, 45, (g) => {
    // Wooden hut frame with a green awning.
    g.rect(3, 8, 42, 4, '#3f9a6b')
    for (let x = 3; x < 45; x += 4) g.rect(x, 12, 2, 2, x % 8 ? '#3f9a6b' : '#fffaf0')
    g.hline(3, 44, 8, '#6cc38e')
    g.rect(4, 12, 2, 32, BK.woodD)
    g.rect(42, 12, 2, 32, BK.woodD)
    // Hanging herbal compress balls (ลูกประคบ).
    for (let i = 0; i < 6; i++) {
      const x = 9 + i * 6
      g.vline(x, 12, 15, '#c9b69a')
      g.circle(x, 17, 2.2, i % 2 ? '#d9c9a0' : '#c7b27f')
      g.px(x - 1, 16, '#efe4c4')
      g.px(x, 19, '#8a7a50')
    }
    // Shelves of balm jars.
    g.rect(7, 22, 34, 2, BK.wood)
    g.rect(7, 30, 34, 2, BK.wood)
    const jar = (x: number, y: number, c: Color, lid: Color) => {
      g.rect(x, y - 3, 3, 3, c)
      g.rect(x, y - 4, 3, 1, lid)
      g.px(x, y - 3, '#ffffff')
    }
    for (let i = 0; i < 8; i++) jar(8 + i * 4, 22, ['#ffd23f', '#6cc36a', '#fffaf0', '#e8514a'][i % 4], i % 2 ? '#3d63b5' : '#e8514a')
    for (let i = 0; i < 7; i++) jar(9 + i * 4.5, 30, ['#6cc36a', '#ffd23f', '#f58f35'][i % 3], '#fffaf0')
    // Counter.
    g.rect(3, 33, 42, 3, '#e0bb8a')
    g.hline(3, 44, 33, '#f3dcb2')
    g.rect(3, 36, 42, 8, BK.woodL)
    for (let x = 8; x < 44; x += 8) g.vline(x, 37, 43, BK.wood)
    // Sign board on top.
    g.rect(12, 2, 24, 6, '#fffaf0')
    g.frame(12, 2, 24, 6, '#3f9a6b')
    g.hline(15, 32, 4, '#2c7552')
    g.hline(15, 26, 6, BK.redD)
    // Mortar and pestle.
    g.rect(34, 30, 5, 3, '#8c8187')
    g.line(37, 29, 39, 26, BK.woodD)
  })
}

/** Thai costume rental rack (เช่าชุดไทย) with a mirror and head-dresses. */
export function costumeRack(): Prop {
  return bprop('costumerack', 56, 46, 28, 45, (g) => {
    // Canopy.
    g.rect(2, 4, 52, 5, '#e8709e')
    g.hline(2, 53, 4, '#ff9fc0')
    for (let x = 2; x < 54; x += 4) g.rect(x, 9, 2, 2, '#e8709e')
    g.rect(3, 9, 2, 35, '#c9c3d0')
    g.rect(51, 9, 2, 35, '#c9c3d0')
    // Rail with dresses (สไบ ชุดไทยจักรี ชุดไทยเรือนต้น).
    g.hline(5, 40, 13, '#8c8699')
    const dresses: [Color, Color][] = [
      ['#e8514a', GOLD.b],
      ['#3d63b5', GOLD.b],
      ['#9270dc', '#ffd6e0'],
      ['#3fae6a', GOLD.l],
      ['#f58f35', '#fffaf0'],
      ['#ff9fc0', GOLD.b],
      ['#ffd23f', BK.redD],
    ]
    dresses.forEach(([c, t], i) => {
      const x = 7 + i * 5
      g.px(x + 1, 13, '#8c8699')
      g.rect(x, 14, 4, 5, c)
      g.poly(
        [
          [x - 1, 19],
          [x + 5, 19],
          [x + 5, 32],
          [x - 1, 32],
        ],
        mix(c, '#3a2838', 0.12),
      )
      g.hline(x - 1, x + 4, 19, t)
      g.hline(x - 1, x + 4, 25, t)
      g.vline(x + 1, 20, 31, mix(c, '#ffffff', 0.25))
      g.px(x + 3, 15, t)
    })
    // Mirror.
    g.rect(43, 13, 7, 22, '#c9a04c')
    g.rect(44, 14, 5, 20, '#bfe6f5')
    g.line(45, 16, 47, 14, '#ffffff')
    g.line(45, 22, 48, 19, '#ffffff')
    // Table with crowns (ชฎา) and sabai.
    g.rect(6, 35, 44, 3, '#fffaf0')
    g.rect(6, 38, 44, 6, '#e0bb8a')
    g.rect(8, 44, 2, 1, BK.woodD)
    for (const x of [12, 22]) {
      for (let i = 0; i < 6; i++) g.rect(x - 2 + (i >> 1), 34 - i, Math.max(1, 5 - i), 1, i % 2 ? GOLD.d : GOLD.b)
      g.px(x, 28, GOLD.L)
    }
    g.rect(30, 32, 8, 3, '#e8514a')
    g.hline(30, 37, 32, GOLD.b)
    // Price sign.
    g.rect(20, 0, 16, 5, '#fffaf0')
    g.hline(22, 33, 2, BK.redD)
  })
}

/** Marigold & jasmine garland stand (ร้านพวงมาลัย) heaped with offerings. */
export function garlandStand(): Prop {
  return bprop('garlandstand', 52, 40, 26, 39, (g) => {
    umbrella(g, 26, 0, 24, '#f58f35', '#ffd23f', 12)
    // Table.
    g.rect(2, 22, 48, 3, '#fffaf0')
    g.rect(2, 25, 48, 10, '#3f9a6b')
    g.hline(2, 49, 25, '#6cc38e')
    for (let x = 4; x < 50; x += 5) g.px(x, 30, '#ffd23f')
    g.rect(4, 35, 2, 4, BK.woodD)
    g.rect(46, 35, 2, 4, BK.woodD)
    // Heaps of marigold garlands (big orange rings).
    for (let i = 0; i < 5; i++) {
      const x = 7 + i * 8
      g.ellipse(x, 20, 4, 2.6, i % 2 ? '#ffbb66' : '#f58f35')
      g.ellipse(x, 19.5, 2, 1.2, '#b05a1a')
      g.px(x - 2, 18, '#ffe45e')
      g.px(x + 2, 19, '#ffd23f')
    }
    for (let i = 0; i < 4; i++) {
      const x = 11 + i * 8
      g.ellipse(x, 17, 3.5, 2.2, i % 2 ? '#fffaf0' : '#f58f35')
      g.px(x, 17, i % 2 ? '#6cc36a' : '#e8514a')
    }
    // Hanging jasmine garlands and tiny wooden elephants.
    for (let i = 0; i < 6; i++) {
      const x = 6 + i * 8
      g.vline(x, 9, 13, '#fffaf0')
      g.px(x, 14, '#e8514a')
      g.px(x, 15, '#6cc36a')
    }
    for (const x of [42, 47]) {
      g.rect(x - 2, 16, 4, 3, '#8a5a3a')
      g.rect(x - 2, 19, 1, 2, '#6e4a35')
      g.rect(x + 1, 19, 1, 2, '#6e4a35')
      g.px(x + 2, 17, '#6e4a35')
    }
  })
}

/** Booking booth for the shrine dance troupe (จองรำแก้บน) – with a price board. */
export function danceBooth(): Prop {
  return bprop('dancebooth', 44, 48, 22, 47, (g) => {
    // Kiosk with a gold Thai roof.
    g.poly(
      [
        [2, 12],
        [22, 2],
        [42, 12],
      ],
      '#f5c542',
    )
    g.line(2, 12, 22, 2, GOLD.D)
    g.line(42, 12, 22, 2, GOLD.D)
    g.px(22, 1, GOLD.L)
    g.hline(2, 41, 12, BK.redD)
    g.rect(4, 13, 36, 30, '#fff1d6')
    g.rect(4, 13, 36, 2, '#e8c890')
    g.vline(4, 13, 42, '#e0bb8a')
    g.vline(39, 13, 42, '#c9965e')
    // Price board: rows of little dancer icons with prices.
    g.rect(7, 16, 30, 16, '#3a2838')
    for (let r = 0; r < 4; r++) {
      const y = 18 + r * 3.5
      for (let i = 0; i <= r; i++) {
        g.px(9 + i * 2, Math.round(y), GOLD.b)
        g.px(9 + i * 2, Math.round(y) + 1, '#e8514a')
      }
      g.hline(22, 34, Math.round(y) + 1, '#fff3a6')
    }
    // Counter with a queue-ticket machine and a bell.
    g.rect(2, 34, 40, 3, '#e0bb8a')
    g.hline(2, 41, 34, '#f3dcb2')
    g.rect(2, 37, 40, 10, BK.redD)
    for (let x = 5; x < 41; x += 6) g.px(x, 41, GOLD.b)
    g.rect(31, 29, 5, 5, '#5a8de0')
    g.px(33, 30, '#fffaf0')
    g.rect(32, 33, 3, 1, '#fffaf0')
    g.ellipse(10, 33, 2, 1.4, GOLD.b)
    g.px(10, 31, GOLD.D)
  })
}

/** Yaowarat street-food cart (glass case, steaming pot, red neon). */
export function streetFoodCart(kind: 'noodle' | 'pork' | 'chestnut' | 'toast' = 'noodle'): Prop {
  return bprop(`foodcart:${kind}`, 50, 46, 25, 45, (g) => {
    // Cart.
    g.rect(3, 26, 44, 12, '#c9c3d0')
    g.rect(3, 26, 44, 2, '#f0ecf2')
    g.rect(3, 36, 44, 2, '#8c8699')
    g.circle(9, 40, 3, '#3a3040')
    g.circle(41, 40, 3, '#3a3040')
    g.px(9, 40, '#bdb2ae')
    g.px(41, 40, '#bdb2ae')
    // Glass case on top.
    g.rect(5, 12, 26, 14, '#dff4ff')
    g.frame(5, 12, 26, 14, '#8c8699')
    g.rect(5, 10, 26, 2, BK.red)
    g.hline(7, 28, 11, '#fff3a6')
    if (kind === 'noodle') {
      for (let i = 0; i < 4; i++) g.rect(7 + i * 6, 20, 4, 5, '#fff4c4')
      g.rect(8, 15, 6, 4, '#e8514a')
      g.rect(18, 15, 8, 3, '#b8743a')
    } else if (kind === 'pork') {
      for (let i = 0; i < 3; i++) {
        g.rect(7 + i * 8, 16, 6, 4, '#d9443f')
        g.hline(7 + i * 8, 12 + i * 8, 16, '#ff8a7a')
        g.rect(7 + i * 8, 21, 6, 3, '#e0a868')
      }
    } else if (kind === 'chestnut') {
      g.ellipse(18, 21, 11, 4, '#3a3040')
      for (let i = 0; i < 12; i++) g.px(9 + ((i * 7) % 18), 19 + ((i * 3) % 4), '#8a5a3a')
    } else {
      for (let i = 0; i < 4; i++) {
        g.rect(7 + i * 6, 18, 5, 6, '#f5d28a')
        g.rect(7 + i * 6, 18, 5, 2, '#6cc36a')
      }
    }
    // Big steaming pot / wok.
    g.rect(34, 18, 11, 8, '#8c8699')
    g.ellipse(39.5, 18, 5.5, 1.8, '#bdb2ae')
    g.ellipse(39.5, 18, 4, 1, '#c9a060')
    g.rect(33, 24, 13, 2, '#5a5068')
    // Red plastic stool at the side.
    g.rect(0, 36, 5, 2, '#e8514a')
    g.rect(1, 38, 1, 4, '#b8343f')
    g.rect(3, 38, 1, 4, '#b8343f')
    // Menu signs.
    g.rect(33, 4, 14, 10, '#ffd23f')
    g.frame(33, 4, 14, 10, BK.redD)
    g.hline(35, 44, 7, BK.redD)
    g.hline(35, 42, 10, BK.redD)
  })
}

/** Cold drinks cooler cart with an umbrella (น้ำเย็น ๆ). */
export function drinkCart(): Prop {
  return bprop('drinkcart', 40, 44, 20, 43, (g) => {
    umbrella(g, 20, 0, 18, '#5a8de0', '#fffaf0', 14)
    g.rect(5, 26, 30, 12, '#e8514a')
    g.rect(5, 26, 30, 2, '#ff8a7a')
    g.hline(5, 34, 37, '#b8343f')
    g.rect(9, 29, 22, 5, '#fffaf0')
    g.hline(11, 28, 31, '#3d63b5')
    // Bottles in ice.
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 4
      g.rect(x, 20, 2, 6, ['#6cc36a', '#f58f35', '#9fd0ff', '#e8514a', '#ffd23f', '#fffaf0'][i])
      g.px(x, 19, '#e8e4ee')
    }
    g.rect(6, 24, 28, 2, '#dff4ff')
    g.circle(10, 40, 2.5, '#3a3040')
    g.circle(30, 40, 2.5, '#3a3040')
  })
}

/** Ticket booth (จำหน่ายบัตร) with a little Thai roof. */
export function ticketBooth(): Prop {
  return bprop('ticketbooth', 34, 44, 17, 43, (g) => {
    g.poly(
      [
        [0, 12],
        [17, 2],
        [33, 12],
      ],
      ROOF.orange.field,
    )
    g.hline(0, 33, 12, ROOF.orange.border)
    g.line(0, 12, 17, 2, GOLD.b)
    g.line(33, 12, 17, 2, GOLD.b)
    g.px(17, 1, GOLD.L)
    g.rect(3, 13, 28, 30, WHITE.b)
    g.vline(30, 13, 42, WHITE.D)
    g.rect(7, 17, 20, 11, '#9fd0ff')
    g.frame(7, 17, 20, 11, GOLD.d)
    g.line(9, 26, 14, 19, '#d4f1ff')
    g.rect(13, 23, 8, 5, '#3a2838')
    g.rect(5, 29, 24, 2, GOLD.d)
    g.rect(9, 33, 16, 5, BK.redD)
    g.hline(11, 22, 35, '#fff3a6')
  })
}

/** Standing sign board; `kind` changes the pictogram. */
export function signBoard(kind: 'nophoto' | 'dress' | 'shoes' | 'info' | 'coins'): Prop {
  return bprop(`sign:${kind}`, 16, 24, 8, 23, (g) => {
    g.rect(7, 12, 2, 11, '#8c8187')
    g.rect(5, 22, 6, 1, '#625867')
    g.rect(1, 1, 14, 12, '#fffaf0')
    g.frame(1, 1, 14, 12, kind === 'info' ? '#3d63b5' : BK.redD)
    if (kind === 'nophoto') {
      g.rect(4, 5, 8, 5, '#3a3040')
      g.circle(8, 7, 1.5, '#9fd0ff')
      g.rect(5, 4, 3, 1, '#3a3040')
      g.line(3, 3, 12, 11, BK.red)
      g.line(4, 3, 13, 11, BK.red)
    } else if (kind === 'dress') {
      g.rect(4, 4, 3, 7, '#5a8de0')
      g.rect(9, 4, 3, 4, '#e8709e')
      g.rect(9, 8, 3, 3, '#e8709e')
      g.line(3, 3, 12, 11, BK.red)
    } else if (kind === 'shoes') {
      g.rect(3, 8, 5, 2, '#6e4a35')
      g.rect(8, 7, 5, 3, '#5a8de0')
      g.line(3, 3, 12, 11, BK.red)
    } else if (kind === 'coins') {
      g.circle(6, 7, 2.5, GOLD.b)
      g.circle(10, 8, 2.5, GOLD.d)
      g.px(6, 6, GOLD.L)
    } else {
      g.circle(8, 4, 1, '#3d63b5')
      g.rect(7, 6, 2, 5, '#3d63b5')
    }
  })
}

/** Low shoe shelf (ชั้นวางรองเท้า) with a few pairs. */
export function shoeRack(w = 28, messy = true): Prop {
  return bprop(`shoerack:${w}:${messy ? 1 : 0}`, w, 16, w >> 1, 15, (g) => {
    g.rect(0, 2, w, 2, BK.woodL)
    g.rect(0, 8, w, 2, BK.woodL)
    g.rect(0, 14, w, 2, BK.wood)
    g.rect(0, 2, 2, 14, BK.woodD)
    g.rect(w - 2, 2, 2, 14, BK.woodD)
    const cols: Color[] = ['#e8514a', '#3a3040', '#5a8de0', '#fffaf0', '#f58f35', '#9270dc', '#6cc36a']
    for (let i = 0; i < Math.floor((w - 4) / 5); i++) {
      const c = cols[i % cols.length]
      g.rect(3 + i * 5, 5, 4, 3, c)
      g.px(3 + i * 5, 5, mix(c, '#ffffff', 0.4))
      if (!messy || i % 3 !== 1) {
        g.rect(3 + i * 5, 11, 4, 3, cols[(i + 3) % cols.length])
      }
    }
  })
}

/** A pair of flip-flops/shoes lying on the ground (baked decal). */
export function looseShoes(g: Surface, x: number, y: number, c: Color) {
  g.rect(x, y, 3, 2, c)
  g.rect(x + 4, y + 1, 3, 2, c)
  g.px(x + 1, y, mix(c, '#ffffff', 0.4))
}

/** Red plastic table with stools (โต๊ะพลาสติกแดงริมถนน). */
export function plasticTable(): Prop {
  return bprop('plastictable', 30, 18, 15, 17, (g) => {
    g.rect(7, 4, 16, 3, '#e8514a')
    g.hline(7, 22, 4, '#ff8a7a')
    g.rect(8, 7, 2, 7, '#b8343f')
    g.rect(20, 7, 2, 7, '#b8343f')
    // Bowls.
    g.ellipse(12, 4, 2, 1, '#fffaf0')
    g.ellipse(18, 4, 2, 1, '#fffaf0')
    g.px(15, 3, '#6cc36a')
    for (const x of [1, 25]) {
      g.rect(x, 11, 5, 2, '#5a8de0')
      g.rect(x + 1, 13, 1, 4, '#3d63b5')
      g.rect(x + 3, 13, 1, 4, '#3d63b5')
    }
  })
}

/** A cluster of carved wooden elephants (ช้างไม้แก้บน). */
export function woodElephants(n = 5, seed = 0): Prop {
  return bprop(`woodele:${n}:${seed}`, 12 + n * 7, 22, (12 + n * 7) >> 1, 21, (g) => {
    for (let i = 0; i < n; i++) {
      const big = hsh(i, seed) > 0.6
      const x = 4 + i * 7 + Math.round(hsh(i, seed, 1) * 2)
      const y = 20 - (i % 2) * 3
      const s = big ? 1.3 : 1
      const c = hsh(i, seed, 2) < 0.4 ? '#8a5a3a' : hsh(i, seed, 2) < 0.7 ? '#a8784e' : '#6e4a35'
      const cD = mix(c, '#2a1810', 0.35)
      const bw = Math.round(7 * s)
      const bh = Math.round(5 * s)
      g.rect(x, y - bh - 3, bw, bh, c)
      g.rect(x + 1, y - 3, 2, 3, cD)
      g.rect(x + bw - 3, y - 3, 2, 3, cD)
      g.rect(x + bw - 1, y - bh - 4, 3, 4, c)
      g.vline(x + bw + 1, y - bh, y - 2, cD)
      g.px(x + bw, y - bh - 3, '#2a1810')
      g.px(x + 1, y - bh - 3, mix(c, '#ffffff', 0.3))
      // Garland on some.
      if (i % 2 === 0) g.hline(x + 1, x + bw - 1, y - bh - 1, '#f58f35')
    }
  })
}
