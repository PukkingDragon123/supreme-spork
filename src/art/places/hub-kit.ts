// Shared art for the hub markets and the temple fair: a cached prop builder
// with hooks, colour ramps, market ground painters (worn concrete, tiles,
// planks, canal water, rails), market booths with corrugated roofs, tarp
// stalls, carts, and a big box of goods painters (fruit, clothes, plush,
// toys, dried fish, lanterns, pots…). Place landmarks live in hub-*.ts.

import { bake, ditherOn, type Color, type Surface } from '../../engine/pixel'
import { cached, outlineCanvas } from '../../engine/sprite'
import { mixHex } from '../characters'
import type { Prop } from '../props'

export type Pt = { x: number; y: number }
export interface HubProp extends Prop {
  hooks: Record<string, Pt[]>
}

export const INK = '#3a2838'
export const INK2 = '#5a3d4f'
export const mix = mixHex

/** Cached prop with hooks (relative to the anchor), outlined in plum ink. */
export function hprop(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>) => void, outline = true): HubProp {
  return cached('hub:' + key, () => {
    const hooks: Record<string, Pt[]> = {}
    const c = bake(w, h, (g) => fn(g, hooks))
    for (const k of Object.keys(hooks)) hooks[k] = hooks[k].map((p) => ({ x: p.x - ax, y: p.y - ay }))
    if (!outline) return { canvas: c, w, h, ax, ay, hooks } as HubProp
    const o = outlineCanvas(c, INK)
    return { ...o, ax: ax + 1, ay: ay + 1, hooks } as HubProp
  }) as HubProp
}

/** Hooks of a placed prop in world space. */
export function hooksAt(p: HubProp, name: string, x: number, y: number): Pt[] {
  return (p.hooks[name] ?? []).map((h) => ({ x: x + h.x, y: y + h.y }))
}

/** Integer hash → 0..999. */
export function hsh(x: number, y: number, s = 0): number {
  return (((x * 73856093) ^ (y * 19349663) ^ (s * 83492791)) >>> 0) % 1000
}

export interface Ramp4 {
  L: Color
  b: Color
  d: Color
  D: Color
}

export function ramp(c: Color): Ramp4 {
  return { L: mix(c, '#ffffff', 0.38), b: c, d: mix(c, INK, 0.22), D: mix(c, INK, 0.45) }
}

// ---------------------------------------------------------------------------
// Ground painters.

/** Worn market concrete with joints, stains and the odd crack. */
export function concrete(g: Surface, x: number, y: number, w: number, h: number, seed = 0, base: Color = '#cfc6bd', joint = 24) {
  g.rect(x, y, w, h, base)
  const l = mix(base, '#ffffff', 0.28)
  const d = mix(base, '#6a5a5e', 0.2)
  const dd = mix(base, '#6a5a5e', 0.34)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const n = Math.sin(X * 0.05 + seed) + Math.cos(Y * 0.07 + X * 0.013 + seed)
      if (n > 1.35 && ditherOn(X, Y, 0.35)) g.px(X, Y, l)
      else if (n < -1.3 && ditherOn(X, Y, 0.4)) g.px(X, Y, d)
      const v = hsh(X, Y, seed)
      if (v < 6) g.px(X, Y, dd)
      else if (v > 994) g.px(X, Y, l)
    }
  if (joint > 0) {
    for (let j = joint; j < h; j += joint) g.hline(x, x + w - 1, y + j, d)
    for (let i = joint; i < w; i += joint) g.vline(x + i, y, y + h - 1, d)
  }
  // Stains and cracks.
  for (let k = 0; k < (w * h) / 900; k++) {
    const v = hsh(k, seed, 7)
    const sx = x + ((v * 37) % w)
    const sy = y + ((v * 91 + k * 53) % h)
    if (k % 3 === 0) {
      g.alpha(0.35)
      g.ellipse(sx, sy, 3 + (v % 4), 1.5 + (v % 2), dd)
      g.alpha(1)
    } else if (k % 3 === 1) {
      let cx = sx
      let cy = sy
      for (let s = 0; s < 6; s++) {
        g.px(cx, cy, dd)
        cx += (hsh(s, k, seed) % 3) - 1
        cy += 1
      }
    }
  }
}

/** Square market floor tiles (two tones, slightly irregular). */
export function tiles(g: Surface, x: number, y: number, w: number, h: number, size: number, a: Color, b: Color, seed = 0) {
  for (let j = 0; j < h; j += size)
    for (let i = 0; i < w; i += size) {
      const v = hsh(i + x, j + y, seed)
      const c = ((i / size + j / size) & 1) === 0 ? a : b
      g.rect(x + i, y + j, Math.min(size, w - i), Math.min(size, h - j), v < 80 ? mix(c, '#6a5a5e', 0.1) : c)
      g.hline(x + i, x + i + Math.min(size, w - i) - 1, y + j, mix(c, '#ffffff', 0.2))
    }
  const grout = mix(a, '#5a4a4e', 0.3)
  for (let j = 0; j < h; j += size) g.hline(x, x + w - 1, y + j + size - 1, grout)
  for (let i = 0; i < w; i += size) g.vline(x + i + size - 1, y, y + h - 1, grout)
}

/** Wooden planks (a pier or boardwalk). `vertical` runs the boards top→bottom. */
export function planks(g: Surface, x: number, y: number, w: number, h: number, seed = 0, vertical = false, base: Color = '#b07a52') {
  g.rect(x, y, w, h, base)
  const l = mix(base, '#ffffff', 0.22)
  const d = mix(base, INK, 0.28)
  const bw = 5
  const len = vertical ? h : w
  const across = vertical ? w : h
  for (let a = 0; a < across; a += bw) {
    const shade = hsh(a, seed) % 3
    const c = shade === 0 ? base : shade === 1 ? mix(base, '#ffffff', 0.08) : mix(base, INK, 0.1)
    // Butt joints staggered along each board.
    const off = hsh(a, seed, 3) % 40
    for (let s = 0; s < len; s++) {
      const joint = (s + off) % 40 === 0
      for (let k = 0; k < bw - 1 && a + k < across; k++) {
        const [px, py] = vertical ? [x + a + k, y + s] : [x + s, y + a + k]
        g.px(px, py, joint ? d : k === 0 ? l : c)
      }
      const [gx, gy] = vertical ? [x + a + bw - 1, y + s] : [x + s, y + a + bw - 1]
      if (a + bw - 1 < across) g.px(gx, gy, d)
    }
  }
  // Nail heads.
  for (let k = 0; k < (w * h) / 60; k++) {
    const v = hsh(k, seed, 9)
    g.px(x + (v % w), y + ((v * 7 + k * 13) % h), mix(base, INK, 0.5))
  }
}

/** Murky green-brown canal water with ripples and reflections. */
export function canalWater(g: Surface, x: number, y: number, w: number, h: number, night: boolean, seed = 0) {
  const deep = night ? '#1f3a4a' : '#4a7a6a'
  const mid = night ? '#28485a' : '#5e9480'
  const light = night ? '#46708a' : '#8cc4a6'
  g.rect(x, y, w, h, mid)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const n = Math.sin(X * 0.11 + Y * 0.03 + seed) + Math.sin(Y * 0.29 + X * 0.02)
      if (n > 1.4 && ditherOn(X, Y, 0.5)) g.px(X, Y, light)
      else if (n < -1.25 && ditherOn(X, Y, 0.6)) g.px(X, Y, deep)
    }
  // Darker water along the banks.
  for (let j = 0; j < h; j++) {
    g.px(x, y + j, deep)
    g.px(x + 1, y + j, ditherOn(x + 1, y + j, 0.5) ? deep : mid)
    g.px(x + w - 1, y + j, deep)
    g.px(x + w - 2, y + j, ditherOn(x + w - 2, y + j, 0.5) ? deep : mid)
  }
  for (let k = 0; k < (w * h) / 70; k++) {
    const v = hsh(k, seed, 5)
    const X = x + 3 + (v % Math.max(1, w - 6))
    const Y = y + ((v * 13 + k * 29) % h)
    g.hline(X, X + 1 + (k % 3), Y, k % 4 ? light : night ? '#7aa0c0' : '#d4f1e0')
  }
}

/** Railway: gravel bed, sleepers and two rails (vertical, x = centre). */
export function railTrack(g: Surface, cx: number, y0: number, y1: number, seed = 0) {
  const half = 14
  for (let y = y0; y < y1; y++)
    for (let x = cx - half; x < cx + half; x++) {
      const v = hsh(x, y, seed)
      g.px(x, y, v < 330 ? '#9a8e88' : v < 660 ? '#b0a49c' : v < 900 ? '#857a76' : '#cfc4bc')
    }
  for (let y = y0 + 2; y < y1; y += 6) {
    g.rect(cx - 12, y, 24, 3, '#7a5a42')
    g.hline(cx - 12, cx + 11, y, '#9a7456')
    g.hline(cx - 12, cx + 11, y + 2, '#5a4232')
  }
  for (const rx of [cx - 8, cx + 7]) {
    g.vline(rx, y0, y1 - 1, '#5e5a64')
    g.vline(rx + 1, y0, y1 - 1, '#c8c4cc')
  }
}

/** Soft shade patch under canopies (baked into the ground). */
export function shade(g: Surface, x: number, y: number, w: number, h: number, a = 0.18) {
  g.alpha(a)
  g.rect(x, y, w, h, '#3a2838')
  g.alpha(1)
}

/** A drain grate / manhole decal. */
export function drain(g: Surface, x: number, y: number, round = false) {
  if (round) {
    g.ellipse(x, y, 5, 3, '#6a6374')
    g.ellipse(x, y, 4, 2, '#857d8a')
    g.hline(x - 3, x + 3, y, '#6a6374')
    return
  }
  g.rect(x, y, 10, 5, '#5c5566')
  for (let i = 1; i < 10; i += 2) g.vline(x + i, y + 1, y + 3, '#3e3846')
}

/** Painted parking / lane stripes (yellow). */
export function stripeLine(g: Surface, x: number, y: number, len: number, vertical = false, c: Color = '#f0c040') {
  for (let i = 0; i < len; i += 8) {
    if (vertical) g.rect(x, y + i, 1, Math.min(4, len - i), c)
    else g.rect(x + i, y, Math.min(4, len - i), 1, c)
  }
}

// ---------------------------------------------------------------------------
// Goods painters (for counters, trays and back walls).

export type Goods = (g: Surface, x0: number, x1: number, y: number) => void

/** Piles of round fruit on a counter top. */
export function fruitGoods(cols: Color[], r = 2): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + r; x <= x1 - r; x += r * 2 + 1) {
      const c = cols[k % cols.length]
      g.circle(x, y - r, r, mix(c, INK, 0.25))
      g.circle(x, y - r - 0.5, r - 0.5, c)
      g.px(x - 1, y - r - 1, mix(c, '#ffffff', 0.5))
      if (k % 2 === 0) {
        g.circle(x + r, y - r * 2 - 1, r - 0.5, mix(cols[(k + 1) % cols.length], INK, 0.1))
        g.px(x + r - 1, y - r * 2 - 2, '#ffffff')
      }
      k++
    }
  }
}

/** Clothes hanging on a rail (shirts, dresses). */
export function clothesGoods(cols: Color[], seed = 0): Goods {
  return (g, x0, x1, y) => {
    g.hline(x0, x1, y, '#8a8480')
    let k = 0
    for (let x = x0 + 1; x <= x1 - 4; x += 5) {
      const c = cols[(k + seed) % cols.length]
      const long = hsh(k, seed) % 3 === 0
      g.px(x + 2, y + 1, '#8a8480')
      g.rect(x, y + 2, 5, long ? 10 : 7, c)
      g.rect(x - 1, y + 2, 1, 3, c)
      g.rect(x + 5, y + 2, 1, 3, c)
      g.vline(x + 4, y + 2, y + (long ? 11 : 8), mix(c, INK, 0.25))
      g.px(x + 1, y + 3, mix(c, '#ffffff', 0.4))
      if (hsh(k, seed, 2) % 4 === 0) g.rect(x + 1, y + 5, 3, 2, mix(c, '#ffffff', 0.5))
      k++
    }
  }
}

/** Folded elephant pants stacked in colours, pattern dots on top. */
export function pantsGoods(): Goods {
  const cols = ['#6a4fb0', '#3d63b5', '#e8514a', '#43905a', '#f58f35', '#3a3040', '#ff9fc0']
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0; x <= x1 - 6; x += 7) {
      for (let s = 0; s < 3; s++) {
        const c = cols[(k * 3 + s) % cols.length]
        const yy = y - 2 - s * 2
        g.rect(x, yy, 6, 2, c)
        g.px(x + 1 + (s % 2) * 2, yy, '#ffd23f')
        g.px(x + 4 - (s % 2), yy, '#fffaf0')
      }
      k++
    }
  }
}

/** Plush toys in a row (hippos, bears). */
export function plushGoods(kind: 'hippo' | 'bear' | 'mix' = 'mix'): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + 3; x <= x1 - 3; x += 7) {
      const hippo = kind === 'hippo' || (kind === 'mix' && k % 2 === 0)
      if (hippo) drawMiniHippo(g, x, y, k % 3 === 2 ? '#b4a8c8' : '#8a8098')
      else {
        const c = ['#c9a06a', '#ff9fc0', '#fffaf0', '#9fd0ff'][k % 4]
        g.circle(x, y - 3, 3, c)
        g.circle(x, y - 7, 2.5, c)
        g.px(x - 2, y - 9, c)
        g.px(x + 2, y - 9, c)
        g.px(x - 1, y - 7, INK)
        g.px(x + 1, y - 7, INK)
      }
      k++
    }
  }
}

/** Tiny pygmy-hippo figure (หมูดึ๋ง), standing at (x, y). */
export function drawMiniHippo(g: Surface, x: number, y: number, body: Color = '#8a8098', s = 1) {
  const D = mix(body, INK, 0.3)
  const L = mix(body, '#ffffff', 0.35)
  g.ellipse(x, y - 3 * s, 4 * s, 3 * s, body)
  g.ellipse(x + 3 * s, y - 4 * s, 2.5 * s, 2.2 * s, body)
  g.px(x + 4 * s, y - 3 * s, '#ff9fc0')
  g.px(x + 3 * s, y - 5 * s, INK)
  g.px(x + 1 * s, y - 6 * s, D)
  g.px(x - 1 * s, y - 5 * s, L)
  g.rect(x - 3 * s, y - 1 * s, s, s, D)
  g.rect(x + 2 * s, y - 1 * s, s, s, D)
  g.px(x + 5 * s, y - 4 * s, '#ff9fc0')
}

/** Blind boxes stacked (pastel cubes with a "?"). */
export function boxGoods(): Goods {
  const cols = ['#c8a0ff', '#9fd0ff', '#ff9fc0', '#ffe27a', '#b4e486']
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0; x <= x1 - 5; x += 6) {
      for (let s = 0; s < 2; s++) {
        const c = cols[(k + s * 2) % cols.length]
        const yy = y - 5 - s * 5
        if (s === 1 && k % 3 === 2) continue
        g.rect(x, yy, 5, 5, c)
        g.hline(x, x + 4, yy, mix(c, '#ffffff', 0.5))
        g.vline(x + 4, yy + 1, yy + 4, mix(c, INK, 0.25))
        g.px(x + 2, yy + 2, INK2)
      }
      k++
    }
  }
}

/** Small potted plants and cacti (plant section). */
export function plantGoods(): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + 2; x <= x1 - 2; x += 5) {
      g.rect(x - 2, y - 3, 4, 3, k % 2 ? '#c8704c' : '#e0bb8a')
      const cactus = k % 3 === 1
      if (cactus) {
        g.rect(x - 1, y - 8, 2, 5, '#5ea653')
        g.px(x + 1, y - 6, '#5ea653')
        g.px(x, y - 9, '#ff9fc0')
      } else {
        g.circle(x, y - 5, 2.5, k % 2 ? '#43905a' : '#86c95f')
        g.px(x - 1, y - 6, '#b4e486')
      }
      k++
    }
  }
}

/** Dried fish / squid hung on a line (ของแห้ง). */
export function driedGoods(kind: 'squid' | 'fish' | 'mix' = 'mix'): Goods {
  return (g, x0, x1, y) => {
    g.hline(x0, x1, y, '#8a8480')
    let k = 0
    for (let x = x0 + 2; x <= x1 - 3; x += 5) {
      const squid = kind === 'squid' || (kind === 'mix' && k % 2 === 0)
      if (squid) {
        g.rect(x, y + 1, 4, 6, '#e8c89a')
        g.rect(x + 1, y + 7, 2, 3, '#d8a870')
        g.px(x, y + 8, '#d8a870')
        g.px(x + 3, y + 8, '#d8a870')
        g.px(x + 1, y + 2, '#f8e0b8')
      } else {
        g.rect(x + 1, y + 1, 2, 7, '#c8b0a0')
        g.px(x, y + 7, '#a89080')
        g.px(x + 3, y + 7, '#a89080')
        g.px(x + 1, y + 2, INK)
      }
      k++
    }
  }
}

/** Bamboo baskets (เข่ง) of short mackerel (ปลาทู), heads bent. */
export function platuGoods(): Goods {
  return (g, x0, x1, y) => {
    for (let x = x0 + 4; x <= x1 - 4; x += 9) {
      g.ellipse(x, y - 2, 4, 2, '#c9a06a')
      g.ellipse(x, y - 2.5, 3.2, 1.4, '#e0c080')
      for (let f = 0; f < 3; f++) {
        const fx = x - 2 + f * 2
        g.rect(fx, y - 4, 1, 2, '#9fb4c8')
        g.px(fx, y - 5, '#6e8aa4')
        g.px(fx + 1, y - 4, '#d8e4ee')
      }
    }
  }
}

/** Lanna paper lanterns and trinkets (crafts). */
export function lanternGoods(): Goods {
  const cols = ['#ffcf5a', '#e8514a', '#ff9fc0', '#fffaf0', '#f58f35']
  return (g, x0, x1, y) => {
    g.hline(x0, x1, y, '#6e4a35')
    let k = 0
    for (let x = x0 + 2; x <= x1 - 2; x += 5) {
      const c = cols[k % cols.length]
      g.vline(x, y + 1, y + 2, '#6e4a35')
      g.rect(x - 2, y + 3, 5, 5, c)
      g.hline(x - 2, x + 2, y + 3, mix(c, INK, 0.3))
      g.hline(x - 2, x + 2, y + 7, mix(c, INK, 0.3))
      g.px(x, y + 5, mix(c, '#ffffff', 0.5))
      g.vline(x, y + 8, y + 10, '#ffd23f')
      k++
    }
  }
}

/** Folded silk / mudmee cloth piles. */
export function silkGoods(): Goods {
  const cols = ['#b8343f', '#3d63b5', '#6a4fb0', '#43905a', '#ffd54f', '#e8709e']
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0; x <= x1 - 7; x += 8) {
      for (let s = 0; s < 3; s++) {
        const c = cols[(k + s) % cols.length]
        const yy = y - 2 - s * 2
        g.rect(x, yy, 7, 2, c)
        for (let i = 0; i < 7; i += 2) g.px(x + i, yy, (i + s) % 4 ? '#ffd54f' : '#fffaf0')
      }
      k++
    }
  }
}

/** Bowls, pots and ceramics. */
export function potGoods(): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + 3; x <= x1 - 3; x += 6) {
      const c = ['#fffaf0', '#5a8de0', '#43905a', '#c8704c'][k % 4]
      if (k % 2) {
        g.ellipse(x, y - 2, 3, 2, mix(c, INK, 0.2))
        g.ellipse(x, y - 2.5, 2.5, 1, c)
      } else {
        g.rect(x - 2, y - 6, 4, 6, c)
        g.hline(x - 1, x + 1, y - 7, c)
        g.vline(x + 1, y - 5, y - 1, mix(c, INK, 0.25))
        g.px(x - 1, y - 4, '#9fd0ff')
      }
      k++
    }
  }
}

/** Wind-up toys and trinkets (bright plastic). */
export function toyGoods(): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + 2; x <= x1 - 3; x += 5) {
      const c = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#c8a0ff'][k % 6]
      const kind = k % 3
      if (kind === 0) {
        g.rect(x, y - 4, 4, 4, c)
        g.px(x + 1, y - 3, '#ffffff')
        g.px(x + 3, y - 5, '#8a8480')
      } else if (kind === 1) {
        g.circle(x + 2, y - 3, 2, c)
        g.px(x + 1, y - 4, '#ffffff')
      } else {
        g.rect(x + 1, y - 6, 2, 6, c)
        g.px(x + 2, y - 7, '#ffd23f')
      }
      k++
    }
  }
}

/** Glass jars of sweets / nuts on a counter. */
export function jarGoods(fills: Color[]): Goods {
  return (g, x0, x1, y) => {
    let k = 0
    for (let x = x0 + 1; x <= x1 - 5; x += 6) {
      const c = fills[k % fills.length]
      g.rect(x, y - 6, 5, 6, '#d4f1ff')
      g.rect(x, y - 4, 5, 4, c)
      for (let i = 0; i < 5; i += 2) g.px(x + i, y - 3 + (i % 3 === 0 ? 1 : 0), mix(c, '#ffffff', 0.35))
      g.rect(x + 1, y - 7, 3, 1, '#e8514a')
      g.px(x + 4, y - 6, '#ffffff')
      k++
    }
  }
}

/** Steaming pot + bowls (noodle stalls). */
export function noodleGoods(): Goods {
  return (g, x0, x1, y) => {
    const cx = x0 + 6
    g.rect(cx - 5, y - 7, 10, 7, '#bdb2ae')
    g.hline(cx - 5, cx + 4, y - 7, '#e4ddd6')
    g.ellipse(cx, y - 7, 5, 1.5, '#8a4a2a')
    g.vline(cx + 4, y - 6, y - 1, '#8c8187')
    for (let x = x0 + 14; x <= x1 - 3; x += 6) {
      g.ellipse(x, y - 2, 2.5, 1.5, '#fffaf0')
      g.hline(x - 1, x + 1, y - 3, '#8a4a2a')
      g.px(x, y - 4, '#6cc36a')
    }
  }
}

/** Skewers on a grill (meatballs, moo ping). */
export function grillGoods(meat: Color = '#b8543a'): Goods {
  return (g, x0, x1, y) => {
    g.rect(x0, y - 3, x1 - x0, 3, '#3a3040')
    g.hline(x0, x1 - 1, y - 3, '#8c8187')
    for (let x = x0 + 1; x < x1 - 1; x += 2) g.px(x, y - 2, x % 4 ? '#ff7a3a' : '#ffd23f')
    for (let x = x0 + 2; x < x1 - 2; x += 3) {
      g.vline(x, y - 9, y - 4, '#e0c080')
      g.circle(x, y - 7, 1.2, meat)
      g.px(x, y - 5, meat)
    }
  }
}

// ---------------------------------------------------------------------------
// Stalls.

export interface BoothOpts {
  key: string
  w?: number
  /** Corrugated roof colour (and an optional second stripe colour). */
  roof: Color
  roof2?: Color
  /** Back wall (inside) colour. */
  wall?: Color
  /** Things hung on the back wall (clothes rail, dried fish…). */
  back?: Goods
  /** Goods on the counter top. */
  counter?: Goods
  /** Counter skirt colour. */
  skirt?: Color
  /** Striped valance under the roof edge. */
  valance?: [Color, Color]
  /** Sign board colour on the roof edge. */
  sign?: Color
  /** Price tags on the counter (numbers). */
  tags?: boolean
}

/** Covered market booth (Chatuchak-style) seen from the front: tin roof, back wall with goods, counter. */
export function booth(o: BoothOpts): HubProp {
  const W = o.w ?? 52
  const H = 50
  return hprop(`booth:${o.key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const wall = o.wall ?? '#e8dccb'
    const wr = ramp(wall)
    // Back wall (in shade).
    g.rect(2, 12, W - 4, 24, mix(wall, INK, 0.32))
    g.rect(3, 13, W - 6, 22, mix(wall, INK, 0.2))
    for (let x = 6; x < W - 5; x += 8) g.vline(x, 13, 34, mix(wall, INK, 0.28))
    o.back?.(g, 5, W - 6, 15)
    // Posts.
    g.rect(1, 10, 2, 39, '#8a8480')
    g.rect(W - 3, 10, 2, 39, '#8a8480')
    g.vline(1, 10, 48, '#b0aab0')
    // Corrugated roof sloping toward us.
    for (let y = 1; y < 12; y++) {
      const inset = Math.round((11 - y) * 0.35)
      for (let x = inset; x < W - inset; x++) {
        const rib = (x + Math.floor(y / 4)) % 4
        let c = o.roof2 && Math.floor(x / 8) % 2 ? o.roof2 : o.roof
        c = rib === 0 ? mix(c, '#ffffff', 0.3) : rib === 3 ? mix(c, INK, 0.2) : c
        g.px(x, y, c)
      }
    }
    g.hline(0, W - 1, 11, mix(o.roof, INK, 0.45))
    g.hline(3, W - 4, 1, mix(o.roof, '#ffffff', 0.45))
    if (o.valance) {
      for (let x = 0; x < W; x += 4) {
        const c = Math.floor(x / 4) % 2 ? o.valance[1] : o.valance[0]
        g.rect(x, 12, 4, 2, c)
        g.rect(x + 1, 14, 2, 1, c)
      }
    }
    if (o.sign) {
      g.rect(W / 2 - 13, 3, 26, 7, o.sign)
      g.frame(W / 2 - 13, 3, 26, 7, mix(o.sign, INK, 0.4))
      g.hline(W / 2 - 10, W / 2 + 8, 5, '#fffaf0')
      g.hline(W / 2 - 8, W / 2 + 4, 7, mix(o.sign, '#ffffff', 0.55))
    }
    // Counter.
    const skirt = o.skirt ?? '#c28e5c'
    const sr = ramp(skirt)
    g.rect(2, 34, W - 4, 3, wr.L)
    g.hline(2, W - 3, 34, '#ffffff')
    g.hline(2, W - 3, 36, wr.d)
    g.rect(3, 37, W - 6, 11, sr.b)
    g.hline(3, W - 4, 37, sr.d)
    for (let x = 6; x < W - 5; x += 7) g.vline(x, 38, 47, sr.d)
    g.hline(3, W - 4, 47, sr.D)
    o.counter?.(g, 4, W - 5, 34)
    if (o.tags) {
      for (let x = 8; x < W - 8; x += 14) {
        g.rect(x, 39, 7, 4, '#fffaf0')
        g.hline(x + 1, x + 5, 40, '#e8514a')
        g.hline(x + 1, x + 3, 41, INK2)
      }
    }
    hooks.lamp = [{ x: W / 2, y: 13 }]
    hooks.counter = [{ x: W / 2, y: 34 }]
  })
}

export interface TarpOpts {
  key: string
  w?: number
  tarp: Color
  tarp2?: Color
  table?: Color
  goods?: Goods
  /** Goods on the ground in front (trays, baskets). */
  ground?: Goods
}

/** Open tarp canopy on four poles over a folding table. */
export function tarpStall(o: TarpOpts): HubProp {
  const W = o.w ?? 48
  const H = 46
  return hprop(`tarp:${o.key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const tr = ramp(o.tarp)
    // Back poles.
    g.rect(4, 8, 1, 26, '#8a8480')
    g.rect(W - 5, 8, 1, 26, '#8a8480')
    // Tarp (sagging).
    for (let x = 1; x < W - 1; x++) {
      const sag = Math.round(Math.sin(((x - 1) / (W - 2)) * Math.PI) * 2)
      const top = 2 + sag
      for (let y = top; y < top + 9; y++) {
        const stripe = o.tarp2 && Math.floor(x / 6) % 2 ? o.tarp2 : o.tarp
        g.px(x, y, y === top ? mix(stripe, '#ffffff', 0.35) : y > top + 6 ? mix(stripe, INK, 0.18) : stripe)
      }
      if (x % 6 === 0) g.px(x, top + 9, tr.d)
    }
    // Table.
    const tb = o.table ?? '#e8e2dc'
    g.rect(3, 26, W - 6, 3, tb)
    g.hline(3, W - 4, 26, '#ffffff')
    g.hline(3, W - 4, 28, mix(tb, INK, 0.25))
    g.rect(5, 29, 1, 12, '#8a8480')
    g.rect(W - 6, 29, 1, 12, '#8a8480')
    g.line(6, 30, W - 7, 38, '#a8a2a8')
    o.goods?.(g, 5, W - 6, 26)
    // Front poles.
    g.rect(1, 10, 2, 35, '#9a9aa8')
    g.rect(W - 3, 10, 2, 35, '#9a9aa8')
    o.ground?.(g, 4, W - 5, 45)
    hooks.lamp = [{ x: W / 2, y: 12 }]
  })
}

/** Glass-box pushcart with a parasol (street food). */
export function foodCart(key: string, o: { body: Color; parasol: [Color, Color]; goods?: Goods; w?: number; steam?: boolean }): HubProp {
  const W = o.w ?? 38
  const H = 46
  return hprop(`cart:${key}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = Math.floor(W / 2)
    for (let i = 0; i < 9; i++) {
      const half = (W / 2 - 2) * (0.28 + (i / 9) * 0.72)
      for (let x = Math.round(cx - half); x < cx + half; x++) g.px(x, 2 + i, Math.floor((x - cx + 40) / 4) % 2 ? o.parasol[0] : o.parasol[1])
    }
    g.hline(cx - 3, cx + 2, 2, mix(o.parasol[0], '#ffffff', 0.4))
    g.px(cx, 1, '#ffd54f')
    g.vline(cx, 11, 24, '#8a8480')
    const br = ramp(o.body)
    g.rect(3, 26, W - 6, 12, br.b)
    g.hline(3, W - 4, 26, br.L)
    g.rect(3, 36, W - 6, 2, br.D)
    g.rect(W - 8, 28, 4, 8, br.d)
    g.rect(6, 29, W - 16, 5, '#fffaf0')
    g.hline(8, W - 12, 31, br.d)
    // Glass case.
    g.rect(5, 18, W - 10, 8, '#d4f1ff')
    g.hline(5, W - 6, 18, '#ffffff')
    g.vline(5, 18, 25, '#a8c8d8')
    g.vline(W - 6, 18, 25, '#a8c8d8')
    o.goods?.(g, 6, W - 7, 25)
    g.circle(8, 40, 3.5, '#3a3040')
    g.circle(W - 8, 40, 3.5, '#3a3040')
    g.px(8, 40, '#bdb2ae')
    g.px(W - 8, 40, '#bdb2ae')
    g.line(W - 3, 30, W - 1, 26, '#8a8480')
    hooks.lamp = [{ x: cx, y: 12 }]
    hooks.steam = [{ x: 10, y: 17 }]
  })
}

// ---------------------------------------------------------------------------
// Small market furniture.

/** Plastic stool (the eternal red/blue one). */
export function stool(c: Color = '#e8514a'): HubProp {
  return hprop(`stool:${c}`, 8, 8, 4, 7, (g) => {
    g.ellipse(4, 2, 3.5, 1.5, c)
    g.px(3, 1, mix(c, '#ffffff', 0.4))
    g.rect(1, 3, 1, 4, mix(c, INK, 0.25))
    g.rect(6, 3, 1, 4, mix(c, INK, 0.25))
    g.rect(3, 3, 2, 3, mix(c, INK, 0.1))
  })
}

/** Folding table with stools and bowls (eat here). */
export function eatTable(c: Color = '#fffaf0', stoolC: Color = '#e8514a'): HubProp {
  return hprop(`eattable:${c}:${stoolC}`, 34, 18, 17, 17, (g) => {
    for (const x of [1, 28]) {
      g.ellipse(x + 2, 11, 2.5, 1.2, stoolC)
      g.rect(x, 12, 1, 4, mix(stoolC, INK, 0.3))
      g.rect(x + 4, 12, 1, 4, mix(stoolC, INK, 0.3))
    }
    g.rect(8, 5, 18, 3, c)
    g.hline(8, 25, 5, '#ffffff')
    g.hline(8, 25, 7, mix(c, INK, 0.25))
    g.rect(9, 8, 1, 8, '#8a8480')
    g.rect(24, 8, 1, 8, '#8a8480')
    g.ellipse(13, 5, 2, 1, '#fffaf0')
    g.hline(12, 14, 4, '#e8514a')
    g.ellipse(20, 5, 2, 1, '#fffaf0')
    g.px(20, 4, '#6cc36a')
    g.rect(16, 2, 2, 3, '#e8514a')
    g.px(16, 2, '#ffffff')
  })
}

/** Stack of plastic crates. */
export function crates(n = 3, c: Color = '#5a8de0', seed = 0): HubProp {
  return hprop(`crates:${n}:${c}:${seed}`, 14, 6 + n * 5, 7, 5 + n * 5, (g) => {
    for (let i = 0; i < n; i++) {
      const y = 1 + (n - 1 - i) * 5
      const col = hsh(i, seed) % 3 === 0 ? '#e8514a' : c
      const dx = (hsh(i, seed, 1) % 3) - 1
      g.rect(1 + dx, y, 12, 5, col)
      g.hline(1 + dx, 12 + dx, y, mix(col, '#ffffff', 0.35))
      for (let k = 3; k < 12; k += 3) g.rect(k + dx, y + 2, 2, 2, mix(col, INK, 0.35))
    }
  })
}

/** Bamboo basket (เข่ง) with goods. */
export function basket(fill: Color = '#f58f35'): HubProp {
  return hprop(`basket:${fill}`, 14, 10, 7, 9, (g) => {
    g.ellipse(7, 3, 6, 2.5, mix(fill, INK, 0.2))
    for (let i = -4; i <= 4; i += 2) g.circle(7 + i, 2 + Math.abs(i) * 0.1, 1.5, i % 4 ? fill : mix(fill, '#ffffff', 0.25))
    g.poly([[1, 4], [13, 4], [11, 9], [3, 9]], '#c9a06a')
    for (let x = 2; x < 13; x += 2) g.vline(x, 5, 8, '#a8804e')
    g.hline(2, 12, 4, '#e0c080')
  })
}

/** Standing sign board / menu board. */
export function menuBoard(key: string, board: Color = '#3a3040', text: Color = '#fffaf0'): HubProp {
  return hprop(`menu:${key}`, 14, 18, 7, 17, (g) => {
    g.line(3, 17, 5, 2, '#9a6a45')
    g.line(11, 17, 9, 2, '#9a6a45')
    g.rect(2, 1, 10, 11, board)
    g.frame(2, 1, 10, 11, '#9a6a45')
    for (let y = 3; y < 11; y += 2) g.hline(4, 4 + ((y * 3) % 5) + 2, y, text)
    g.px(10, 4, '#ffd23f')
  })
}

/** Cork notice board on legs (the hub "board" hotspot). */
export function noticeBoard(key = 'board', accent: Color = '#e8514a'): HubProp {
  return hprop(`notice:${key}`, 34, 34, 17, 33, (g, hooks) => {
    g.rect(4, 20, 2, 13, '#6e4a35')
    g.rect(28, 20, 2, 13, '#6e4a35')
    // Roof.
    g.poly([[0, 5], [17, 0], [34, 5], [34, 7], [0, 7]], accent)
    g.hline(2, 31, 5, mix(accent, '#ffffff', 0.35))
    g.hline(0, 33, 7, mix(accent, INK, 0.4))
    // Frame + cork.
    g.rect(2, 7, 30, 16, '#9a6a45')
    g.rect(3, 8, 28, 14, '#d8a868')
    for (let i = 0; i < 40; i++) {
      const v = hsh(i, 3, 1)
      g.px(3 + (v % 28), 8 + ((v >> 3) % 14), '#c49052')
    }
    // Pinned notes.
    const notes: [number, number, Color][] = [
      [5, 9, '#fffaf0'],
      [12, 10, '#ffe27a'],
      [20, 9, '#9fd0ff'],
      [25, 12, '#ff9fc0'],
      [8, 15, '#b4e486'],
      [17, 15, '#fffaf0'],
    ]
    for (const [x, y, c] of notes) {
      g.rect(x, y, 6, 5, c)
      g.hline(x + 1, x + 4, y + 2, mix(c, INK, 0.45))
      g.hline(x + 1, x + 3, y + 3, mix(c, INK, 0.3))
      g.px(x + 3, y, '#e8514a')
    }
    g.rect(2, 22, 30, 1, '#6e4a35')
    hooks.top = [{ x: 17, y: 0 }]
  })
}

/** Hanging banner strip (a row of little triangle flags) – drawn directly. */
export function pennants(g: Surface, x0: number, y0: number, x1: number, y1: number, sag: number, cols: Color[], t = 0) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 5))
  let px = x0
  let py = y0
  for (let i = 1; i <= n; i++) {
    const f = i / n
    const x = x0 + (x1 - x0) * f
    const y = y0 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag
    g.line(px, py, x, y, '#5a4a4e')
    if (i < n) {
      const c = cols[i % cols.length]
      const sway = Math.round(Math.sin(t * 2 + i) * 0.6)
      g.poly([[x - 2, y], [x + 2, y], [x + sway, y + 4]], c)
    }
    px = x
    py = y
  }
}

/** Shophouse row façade (ห้องแถว) across x0..x1 standing on gy. */
export function shophouses(g: Surface, x0: number, x1: number, gy: number, seed: number, night: boolean, o: { floors?: number; cols?: Color[]; shutter?: boolean } = {}) {
  const floors = o.floors ?? 2
  const cols = o.cols ?? ['#f0e0c0', '#e8d4b0', '#d8e4d0', '#f4d8c8', '#e0dcea']
  const unit = 28
  for (let x = x0; x < x1; x += unit) {
    const w = Math.min(unit, x1 - x)
    const c = cols[hsh(x, seed) % cols.length]
    const r = ramp(c)
    const h = floors * 22 + 6
    const top = gy - h
    g.rect(x, top, w, h, r.b)
    g.vline(x, top, gy - 1, r.d)
    g.hline(x, x + w - 1, top, r.L)
    g.rect(x, top + 2, w, 2, r.d)
    // Upper windows.
    for (let f = 1; f < floors; f++) {
      const wy = top + 6 + (f - 1) * 22
      for (let k = 0; k < 2; k++) {
        const wx = x + 4 + k * 12
        if (wx + 8 > x + w) continue
        const lit = night && hsh(wx, wy, seed) % 3 !== 0
        g.rect(wx, wy, 8, 10, '#6e4a35')
        g.rect(wx + 1, wy + 1, 6, 8, lit ? '#ffe7a8' : '#8fb6d0')
        g.vline(wx + 4, wy + 1, wy + 8, '#6e4a35')
        g.hline(wx - 1, wx + 8, wy + 10, r.D)
      }
      // Balcony rail.
      g.hline(x + 1, x + w - 2, top + 18 + (f - 1) * 22, r.D)
    }
    // Ground floor: open shop with shutter / awning.
    const sy = gy - 18
    g.rect(x + 2, sy, w - 4, 18, night ? '#5a4040' : '#4a3a40')
    if (o.shutter !== false) {
      g.rect(x + 2, sy, w - 4, 4, '#bdb2ae')
      for (let yy = sy; yy < sy + 4; yy += 1) g.hline(x + 2, x + w - 3, yy, yy % 2 ? '#a8a0a0' : '#c8c0c0')
    }
    // Goods glow inside.
    for (let k = 0; k < 4; k++) {
      const v = hsh(x, k, seed + 3)
      g.rect(x + 4 + (v % Math.max(1, w - 10)), sy + 8 + (k % 2) * 4, 3, 3, ['#ffd23f', '#e8514a', '#9fd0ff', '#ff9fc0', '#6cc36a'][v % 5])
    }
    if (night) {
      g.alpha(0.35)
      g.rect(x + 3, sy + 4, w - 6, 13, '#ffcf7a')
      g.alpha(1)
    }
    // Sign band.
    const sc = ['#e8514a', '#ffd23f', '#3d63b5', '#43905a', '#f58f35'][hsh(x, seed, 2) % 5]
    g.rect(x + 3, sy - 5, w - 6, 5, sc)
    g.hline(x + 5, x + w - 8, sy - 3, mix(sc, '#ffffff', 0.6))
    // Awning.
    const aw = ['#5a8de0', '#e8514a', '#43905a', '#f58f35'][hsh(x, seed, 4) % 4]
    for (let xx = x + 1; xx < x + w - 1; xx++) g.px(xx, sy, Math.floor((xx - x) / 4) % 2 ? aw : '#fffaf0')
    g.vline(x + w - 1, top, gy - 1, r.D)
  }
}

/** Overhead electric wires sagging between poles (Thai street essential). */
export function wires(g: Surface, x0: number, y0: number, x1: number, y1: number, n = 3) {
  for (let k = 0; k < n; k++) {
    const sag = 5 + k * 2
    let px = x0
    let py = y0 + k * 2
    const steps = Math.max(8, Math.round(Math.abs(x1 - x0) / 4))
    for (let i = 1; i <= steps; i++) {
      const f = i / steps
      const x = x0 + (x1 - x0) * f
      const y = y0 + k * 2 + (y1 - y0) * f + Math.sin(f * Math.PI) * sag
      g.line(px, py, x, y, k === 0 ? '#3a3040' : '#4a4050')
      px = x
      py = y
    }
  }
}
