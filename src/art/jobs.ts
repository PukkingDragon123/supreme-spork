// Art for the temple volunteer jobs (งานอาสาในวัด): brooms, leaves, baskets,
// mops, buckets, muddy footprints, pond fish, catfish, shoes and the rack,
// candles and wind puffs, watering cans and potted flowers, brass vessels,
// dust, and cute tourists. Everything is procedural pixel art with the game's
// plum outlines; small pieces are cached sprites, animated pieces are drawn
// per frame with the Surface API.

import { bake, createCanvas, ditherOn, Surface, type Color } from '../engine/pixel'
import { cached, outlineCanvas, type Sprite } from '../engine/sprite'
import { P } from './palette'
import { mixHex } from './characters'
import { canopy, lawn, LEAVES, paving, weather } from './garden'
import { drawBuddhaHD, sculpt, softGlow, type SculptOpts } from './hall'
import type { AvatarLook } from './avatar'

const INK = P.ink

// ---------------------------------------------------------------------------
// Helpers

/** Cached sprite drawn by `fn` (w×h), with the plum outline added around it. */
export function jobSprite(key: string, w: number, h: number, fn: (g: Surface) => void, outline: Color | null = INK): Sprite {
  return cached(`job:${key}`, () => {
    const c = bake(w, h, fn)
    return outline ? outlineCanvas(c, outline) : { canvas: c, w, h }
  })
}

/** Draw a sprite centred horizontally on x with its bottom row on y. */
export function drawAt(g: Surface, s: Sprite, x: number, y: number, flip = false) {
  g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h + 1), flip)
}

/** Draw a sprite centred on (x, y). */
export function drawMid(g: Surface, s: Sprite, x: number, y: number, flip = false) {
  g.draw(s.canvas, Math.round(x - s.w / 2), Math.round(y - s.h / 2), flip)
}

/** A line with a 1px plum outline (for procedural tools such as handles). */
export function inkLine(g: Surface, x0: number, y0: number, x1: number, y1: number, w: number, c: Color, outline: Color = INK) {
  g.thickLine(x0, y0, x1, y1, w + 2, outline)
  g.thickLine(x0, y0, x1, y1, w, c)
}

/** Soft dithered drop shadow. */
export function shadow(g: Surface, cx: number, cy: number, rx: number, ry: number, strength = 0.55) {
  g.ctx.save()
  g.ctx.fillStyle = 'rgba(58,40,56,0.22)'
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2
      if (d <= 1 && ditherOn(x, y, (1 - d) * strength + 0.35)) g.ctx.fillRect(x - g.ox, y - g.oy, 1, 1)
    }
  g.ctx.restore()
}

const hash = (a: number, b = 0, c = 0) => ((((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0) % 10000) / 10000

// ---------------------------------------------------------------------------
// กวาดลานวัด – leaves, broom, basket and dustpan

export const LEAF_COLORS: { b: Color; d: Color; l: Color }[] = [
  { b: '#7cc36a', d: '#4f9a58', l: '#b4e486' },
  { b: '#f2cf5a', d: '#d0a03a', l: '#fff09a' },
  { b: '#f29a4a', d: '#c8682a', l: '#ffc27a' },
  { b: '#c9975a', d: '#8f6440', l: '#e8c08a' },
]

/** A small bodhi leaf (heart shape with a drip tip) at one of 8 angles. */
export function leafSprite(kind: number, rot: number): Sprite {
  const k = ((kind % 4) + 4) % 4
  const r = ((rot % 8) + 8) % 8
  return jobSprite(`leaf:${k}:${r}`, 11, 11, (g) => {
    const c = LEAF_COLORS[k]
    const a = (r / 8) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    // Half-width of the leaf along its length u (-4 = stalk end, +5 = drip tip).
    const half = (u: number) => {
      if (u < -3.2 || u > 5) return -1
      if (u < -2.2) return 1.6 + (u + 3.2) * 1.2
      if (u < 1) return 2.8 - Math.max(0, u + 0.5) * 0.35
      if (u < 3.4) return 2.3 * (1 - (u - 1) / 2.8)
      return 0.5
    }
    for (let y = 0; y < 11; y++)
      for (let x = 0; x < 11; x++) {
        const dx = x + 0.5 - 5.5
        const dy = y + 0.5 - 5.5
        // Local leaf coordinates (u along the leaf, v across).
        const u = dx * ca + dy * sa
        const v = -dx * sa + dy * ca
        const hw = half(u)
        const stalk = u < -3 && u > -4.6 && Math.abs(v) < 0.55
        // Heart-shaped notch at the base.
        const notch = u < -2.4 && Math.abs(v) < 0.5
        if ((hw < 0 || Math.abs(v) > hw || notch) && !stalk) continue
        let col = c.b
        if (stalk) col = c.d
        else if (Math.abs(v) < 0.5 && u > -2.6 && u < 3.6) col = c.d
        else if (v < -0.4 && u < 2) col = c.l
        else if (v > hw - 0.9) col = c.d
        g.px(x, y, col)
      }
  })
}

/** Coconut-rib broom (ไม้กวาดทางมะพร้าว): bristle tips at (x, y), handle leaning by `lean` (radians from vertical). */
export function drawBroom(g: Surface, x: number, y: number, lean: number, swish: number) {
  const L = 22
  const sx = Math.sin(lean)
  const cy = Math.cos(lean)
  const hx = x + sx * 13
  const hy = y - cy * 13
  const tx = hx + sx * L
  const ty = hy - cy * L
  // Handle: a bundle of ribs tied with red string.
  inkLine(g, hx, hy, tx, ty, 3, '#c9a45a')
  g.line(hx + cy, hy + sx, tx + cy, ty + sx, '#9a7a3a')
  g.line(hx - cy * 0.6, hy - sx * 0.6, tx - cy * 0.6, ty - sx * 0.6, '#ecd08a')
  // Bristle fan.
  const n = 13
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1) - 0.5
    const ex = x + f * 24 + swish * (1 - Math.abs(f) * 1.4) * 3
    const ey = y + Math.abs(f) * 3 - (i % 2)
    pts.push([ex, ey])
  }
  for (const [ex, ey] of pts) g.thickLine(hx, hy, ex, ey, 3, INK)
  pts.forEach(([ex, ey], i) => g.line(hx, hy, ex, ey, i % 3 === 1 ? '#b8943a' : i % 2 ? '#f0d078' : '#d9b25f'))
  pts.forEach(([ex, ey], i) => i % 2 === 0 && g.px(Math.round(ex), Math.round(ey), '#8a6a2a'))
  // Red binding.
  for (let k = 0; k < 3; k++) {
    const bx = hx + sx * (1 + k)
    const by = hy - cy * (1 + k)
    g.rect(Math.round(bx) - 2, Math.round(by), 5, 1, k === 1 ? P.redL : P.red)
  }
}

/** Bamboo basket (เข่ง) with a level of leaves inside (0..1). */
export function drawBasket(g: Surface, x: number, y: number, fill: number, wob: number, t: number) {
  const W = 26
  const H = 18
  const x0 = Math.round(x - W / 2 + Math.sin(t * 30) * wob)
  const y0 = Math.round(y - H)
  shadow(g, x, y + 1, 15, 3.5)
  // Body: trapezoid, woven.
  const body: [number, number][] = [
    [x0 - 1, y0 + 2],
    [x0 + W + 1, y0 + 2],
    [x0 + W - 3, y0 + H + 1],
    [x0 + 3, y0 + H + 1],
  ]
  g.poly(body, INK)
  const inner: [number, number][] = [
    [x0, y0 + 3],
    [x0 + W, y0 + 3],
    [x0 + W - 4, y0 + H],
    [x0 + 4, y0 + H],
  ]
  g.poly(inner, '#d9b25f')
  for (let yy = y0 + 4; yy < y0 + H; yy++) {
    const f = (yy - y0 - 3) / (H - 3)
    const xa = Math.round(x0 + f * 4)
    const xb = Math.round(x0 + W - f * 4)
    for (let xx = xa; xx < xb; xx++) {
      const weave = ((xx >> 1) + (yy >> 1)) % 2 === 0
      if (weave) g.px(xx, yy, (yy & 1) ? '#c9a04c' : '#e8c86a')
      if ((xx - xa) % 5 === 0) g.px(xx, yy, '#a8803a')
    }
    g.px(xb - 1, yy, '#a8803a')
    g.px(xb - 2, yy, '#b8903f')
  }
  // Rim (thick bamboo band).
  g.rect(x0 - 2, y0, W + 4, 4, INK)
  g.rect(x0 - 1, y0 + 1, W + 2, 2, '#b8843a')
  g.hline(x0, x0 + W - 1, y0 + 1, '#e8c86a')
  for (let xx = x0; xx < x0 + W; xx += 4) g.px(xx, y0 + 2, '#8a5a2a')
  // Leaves heaped inside.
  const lv = Math.max(0, Math.min(1, fill))
  if (lv > 0) {
    const n = Math.round(4 + lv * 26)
    for (let i = 0; i < n; i++) {
      const hx = x0 + 2 + hash(i, 3) * (W - 4)
      const hy = y0 - 1 - lv * 5 * (1 - Math.abs(hx - x) / (W / 2)) + hash(i, 7) * 3
      const c = LEAF_COLORS[i % 4]
      g.rect(Math.round(hx) - 1, Math.round(hy), 3, 2, INK)
      g.rect(Math.round(hx), Math.round(hy), 2, 2, c.b)
      g.px(Math.round(hx), Math.round(hy), c.l)
    }
  }
}

/** Plastic dustpan with a stubby handle; `load` 0..1 shows carried leaves. */
export function drawDustpan(g: Surface, x: number, y: number, load: number) {
  // Handle.
  inkLine(g, x + 9, y - 2, x + 16, y - 13, 3, '#5a8de0')
  g.px(Math.round(x + 15), Math.round(y - 12), '#9fd0ff')
  // Pan (a scoop seen from above-front).
  g.poly(
    [
      [x - 13, y + 5],
      [x + 12, y + 5],
      [x + 10, y - 5],
      [x - 9, y - 5],
    ],
    INK,
  )
  g.poly(
    [
      [x - 12, y + 4],
      [x + 11, y + 4],
      [x + 9, y - 4],
      [x - 8, y - 4],
    ],
    '#6fa8ee',
  )
  g.hline(x - 8, x + 8, y - 4, '#9fd0ff')
  g.hline(x - 7, x + 7, y - 3, '#8ac0f8')
  g.hline(x - 12, x + 10, y + 4, '#3d63b5')
  g.hline(x - 12, x + 10, y + 3, '#4f7fd0')
  g.px(x - 6, y - 2, '#ffffff')
  g.px(x - 5, y - 2, '#ffffff')
  const n = Math.round(load * 18)
  for (let i = 0; i < n; i++) {
    const c = LEAF_COLORS[i % 4]
    const lx = x - 9 + hash(i, 11) * 17
    const ly = y - 1 - hash(i, 13) * Math.min(8, 2 + n * 0.4)
    g.rect(Math.round(lx), Math.round(ly), 3, 2, c.b)
    g.px(Math.round(lx), Math.round(ly), c.l)
    g.px(Math.round(lx) + 2, Math.round(ly) + 1, c.d)
  }
}

/** Courtyard with a bodhi canopy along the top edge (baked). */
export function bakeCourtyard(w: number, h: number, top: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    paving(g, 0, 0, w, h, 12, 'cream')
    weather(g, 0, 0, w, h, 5, 0.6)
    // A lotus-bud kerb on both sides.
    for (let y = 0; y < h; y += 6) {
      g.rect(0, y, 5, 5, '#e3d3bb')
      g.px(1, y + 1, '#fbf6ec')
      g.rect(w - 5, y, 5, 5, '#e3d3bb')
      g.px(w - 4, y + 1, '#fbf6ec')
    }
    g.vline(5, 0, h, '#c9b69a')
    g.vline(w - 6, 0, h, '#c9b69a')
    // Dappled canopy shade.
    const shadeY = top + 26
    for (let y = 0; y < shadeY + 30; y++)
      for (let x = 0; x < w; x++) {
        const n = Math.sin(x * 0.21 + Math.cos(y * 0.13) * 2) + Math.cos(y * 0.19 + x * 0.05)
        const fade = y < shadeY ? 1 : 1 - (y - shadeY) / 30
        if (n > 0.2 && ditherOn(x, y, 0.45 * fade)) g.px(x, y, 'rgba(60,90,70,0.16)')
      }
    // Bodhi canopy.
    const blobs: [number, number, number][] = []
    for (let x = -10; x < w + 16; x += 13) blobs.push([x, top - 2 + ((x * 7) % 9) - 4, 14 + ((x * 13) % 5)])
    for (let x = -4; x < w + 10; x += 17) blobs.push([x + 6, top + 10 + ((x * 3) % 5), 9 + ((x * 11) % 4)])
    canopy(g, blobs, LEAVES.bodhi, 7)
    // Trunk peeking at the right.
    g.rect(w - 22, 0, 9, top + 4, '#8b6a55')
    g.rect(w - 21, 0, 2, top + 4, '#b08a6e')
    g.rect(w - 15, 0, 2, top + 4, '#6b4f41')
    canopy(
      g,
      [
        [w - 30, top + 4, 11],
        [w - 10, top + 2, 12],
      ],
      LEAVES.bodhi,
      9,
    )
  })
}

// ---------------------------------------------------------------------------
// ถูพื้นศาลา – hall floor, muddy footprints, mop, bucket and wet-floor sign

/** Top-down hall interior: red wall with a door at the top, marble tiles below. */
export function bakeHallFloor(w: number, h: number, wallY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    const T = 16
    for (let ty = wallY; ty < h; ty += T)
      for (let tx = 0; tx < w; tx += T) {
        const odd = ((tx / T) | 0) + ((ty / T) | 0)
        const base = odd % 2 ? '#f6eee2' : '#ece0cf'
        g.rect(tx, ty, T, T, base)
        // Marble veins.
        const seed = tx * 7 + ty * 13
        let vx = tx + hash(seed) * T
        let vy = ty
        for (let k = 0; k < T; k++) {
          vx += hash(seed, k) > 0.5 ? 1 : -1
          vy += 1
          if (vx > tx && vx < tx + T - 1 && hash(seed, k, 3) > 0.35) g.px(vx, vy, odd % 2 ? '#e6d8c4' : '#dccbb4')
        }
        g.hline(tx + 1, tx + T - 2, ty + 1, odd % 2 ? '#fffaf2' : '#f6ecdc')
        g.hline(tx, tx + T - 1, ty, '#cdbba2')
        g.vline(tx, ty, ty + T - 1, '#cdbba2')
      }
    // Window light falling across the floor.
    for (let y = wallY; y < h; y++)
      for (let x = 0; x < w; x++) {
        const band = (x + (y - wallY) * 0.6) % 70
        if (band > 8 && band < 26 && ditherOn(x, y, 0.2)) g.px(x, y, '#fffaf0')
      }
    // Wall with gold trim and a door.
    g.rect(0, 0, w, wallY, '#9a2e3e')
    for (let x = 0; x < w; x += 10) {
      g.rect(x + 3, wallY - 12, 4, 4, '#b8434f')
      g.px(x + 4, wallY - 11, '#d9606a')
    }
    g.rect(0, wallY - 4, w, 4, P.goldD)
    g.hline(0, w, wallY - 4, P.gold)
    g.hline(0, w, wallY - 1, P.goldDD)
    g.rect(0, wallY, w, 2, 'rgba(58,40,56,0.25)')
    const dx = Math.round(w / 2 - 14)
    g.rect(dx - 2, 0, 32, wallY - 3, P.goldD)
    g.rect(dx, 0, 28, wallY - 4, '#7e2436')
    g.rect(dx + 2, 0, 11, wallY - 6, '#b8343f')
    g.rect(dx + 15, 0, 11, wallY - 6, '#b8343f')
    g.vline(dx + 14, 0, wallY - 5, P.goldDD)
    for (let y = 4; y < wallY - 8; y += 6) {
      g.px(dx + 7, y, P.gold)
      g.px(dx + 20, y, P.gold)
    }
    // Pillars at the sides.
    for (const px of [0, w - 12]) {
      g.rect(px, 0, 12, wallY + 6, '#b8343f')
      g.rect(px + 2, 0, 2, wallY + 6, '#e0646a')
      g.rect(px + 9, 0, 2, wallY + 6, '#7e2436')
      g.rect(px - 1, wallY + 2, 14, 5, P.goldD)
      g.hline(px - 1, px + 12, wallY + 2, P.gold)
      g.rect(px - 1, wallY + 7, 14, 1, 'rgba(58,40,56,0.3)')
    }
  })
}

export type PrintKind = 'shoe' | 'kid' | 'bare' | 'paw'

const MUD = ['#7a5238', '#8a6040', '#6e4a35', '#94704a']

/** Stamp one muddy footprint on a dirt layer. */
export function stampPrint(g: Surface, x: number, y: number, ang: number, kind: PrintKind, left: boolean, seed: number) {
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  // Local (u forward, v sideways) → world.
  const P2 = (u: number, v: number): [number, number] => [x + u * ca - v * sa, y + u * sa + v * ca]
  const blob = (u: number, v: number, ru: number, rv: number, tread = false) => {
    const r = Math.max(ru, rv) + 1
    const [cx, cy] = P2(u, v)
    for (let yy = Math.floor(cy - r); yy <= cy + r; yy++)
      for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) {
        const lx = (xx + 0.5 - cx) * ca + (yy + 0.5 - cy) * sa
        const ly = -(xx + 0.5 - cx) * sa + (yy + 0.5 - cy) * ca
        const q = (lx / ru) ** 2 + (ly / rv) ** 2
        if (q > 1) continue
        let c = hash(xx, yy, seed) < 0.3 ? MUD[2] : MUD[0]
        if (q > 0.7) c = MUD[2]
        else if (tread && Math.round(lx + 10) % 2 === 0 && Math.abs(ly) < rv - 0.8) c = MUD[3]
        g.px(xx, yy, c)
      }
  }
  const side = left ? -1 : 1
  if (kind === 'paw') {
    blob(0, 0, 2.1, 2.5)
    blob(3, -2.3, 1.1, 1.1)
    blob(3.7, -0.7, 1.1, 1.1)
    blob(3.7, 0.9, 1.1, 1.1)
    blob(3, 2.5, 1.1, 1.1)
    return
  }
  const s = kind === 'kid' ? 0.72 : 1
  if (kind === 'bare') {
    blob(-3.6, 0, 2.1, 1.9)
    blob(-0.6, 0.6 * side, 1.4, 1.2)
    blob(2, 0.3 * side, 2.8, 2.3)
    const toes = [1.3, 1, 0.9, 0.8, 0.7]
    for (let i = 0; i < 5; i++) blob(5.4 - Math.abs(i - 0.6) * 0.45, (-2.5 + i * 1.25) * side * -1, toes[i], toes[i])
    return
  }
  // Shoe sole with tread and a separate heel.
  blob(-4.6 * s, 0, 2.4 * s, 2.3 * s, true)
  blob(2 * s, 0.3 * side * s, 4.3 * s, 2.9 * s, true)
}

/** A splash of mud. */
export function stampSplat(g: Surface, x: number, y: number, r: number, seed: number) {
  for (let i = 0; i < 6; i++) {
    const a = hash(seed, i) * Math.PI * 2
    const d = hash(seed, i, 2) * r
    const rr = 0.8 + hash(seed, i, 5) * (r * 0.45)
    const cx = x + Math.cos(a) * d
    const cy = y + Math.sin(a) * d * 0.7
    for (let yy = Math.floor(cy - rr); yy <= cy + rr; yy++)
      for (let xx = Math.floor(cx - rr); xx <= cx + rr; xx++)
        if ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 <= rr * rr) g.px(xx, yy, MUD[Math.floor(hash(xx, yy, seed) * 4)])
  }
}

/** String mop (ไม้ถูพื้น) with its head at (x, y). */
export function drawMop(g: Surface, x: number, y: number, wet: number, lean: number, swish: number, t: number) {
  const sx = Math.sin(lean)
  const cy = Math.cos(lean)
  const hx = x
  const hy = y
  const tx = hx + sx * 36
  const ty = hy - cy * 36
  inkLine(g, hx, hy, tx, ty, 2, '#e0bb8a')
  g.line(hx + 1, hy, tx + 1, ty, '#b8844a')
  g.rect(Math.round(tx) - 1, Math.round(ty) - 3, 3, 4, INK)
  g.rect(Math.round(tx), Math.round(ty) - 2, 1, 2, P.red)
  // Strands radiating around the head (a string mop seen from above).
  const dry = wet < 0.15
  const light = dry ? '#fffaf0' : mixHex('#f3ecdc', '#a8bcd6', wet)
  const dark = dry ? '#e8dcc8' : mixHex('#d8ccb8', '#7890b4', wet)
  const n = 22
  const ends: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2
    const L = 10 + ((i * 7) % 3) + (dry ? ((i * 5) % 2) * 2 : 0)
    const wig = Math.sin(t * 16 + i * 1.9) * (dry ? 1.3 : 0.7)
    ends.push([x + Math.cos(a) * L - swish * 2 * Math.cos(a) + wig, y + 2 + Math.sin(a) * L * 0.7 + wig * 0.5])
  }
  for (const [ex, ey] of ends) g.thickLine(x, y + 2, ex, ey, 4, INK)
  ends.forEach(([ex, ey], i) => g.thickLine(x, y + 2, ex, ey, 2, i % 2 ? light : dark))
  ends.forEach(([ex, ey], i) => i % 3 === 0 && g.px(Math.round(ex), Math.round(ey), dark))
  g.ellipse(x, y + 2, 6.5, 4.5, INK)
  g.ellipse(x, y + 2, 5.5, 3.8, light)
  g.ellipse(x - 1, y + 1, 3.5, 2.2, dry ? '#ffffff' : mixHex('#fffaf0', '#c8d8ea', wet))
  // Clamp.
  g.rect(Math.round(hx) - 3, Math.round(hy) - 2, 6, 5, INK)
  g.rect(Math.round(hx) - 2, Math.round(hy) - 1, 4, 3, '#5a8de0')
  g.px(Math.round(hx) - 2, Math.round(hy) - 1, '#9fd0ff')
  if (!dry && Math.sin(t * 7 + x) > 0.6) g.px(Math.round(x + Math.sin(t * 3) * 6), Math.round(y + 8), '#b3eef4')
  inkLine(g, hx + sx * 3, hy - cy * 3, tx, ty, 2, '#e0bb8a')
  g.line(hx + sx * 3 + 1, hy - cy * 3, tx + 1, ty, '#b8844a')
  g.rect(Math.round(tx) - 1, Math.round(ty) - 3, 3, 4, INK)
  g.rect(Math.round(tx), Math.round(ty) - 2, 1, 2, P.red)
}

/** Blue plastic bucket (ถังน้ำ) seen from above-front. */
export function drawBucket(g: Surface, x: number, y: number, t: number, slosh: number) {
  shadow(g, x, y + 1, 13, 3.5)
  const W = 22
  const H = 16
  const x0 = Math.round(x - W / 2)
  const y0 = Math.round(y - H)
  g.poly(
    [
      [x0 - 1, y0 + 3],
      [x0 + W + 1, y0 + 3],
      [x0 + W - 2, y0 + H + 1],
      [x0 + 2, y0 + H + 1],
    ],
    INK,
  )
  g.poly(
    [
      [x0, y0 + 4],
      [x0 + W, y0 + 4],
      [x0 + W - 3, y0 + H],
      [x0 + 3, y0 + H],
    ],
    '#4f8fd8',
  )
  g.rect(x0 + 3, y0 + 6, 3, H - 7, '#7fb4f0')
  g.rect(x0 + W - 7, y0 + 6, 3, H - 7, '#3d63b5')
  g.hline(x0 + 2, x0 + W - 3, y0 + 10, '#3d73c8')
  // Rim and water.
  g.ellipse(x, y0 + 3, W / 2 + 1.5, 4.5, INK)
  g.ellipse(x, y0 + 3, W / 2 + 0.5, 3.5, '#6fa8ee')
  g.ellipse(x, y0 + 3.5, W / 2 - 1.5, 2.5, '#78d2e2')
  g.ellipse(x - 2, y0 + 3, W / 2 - 5, 1.2, '#b3eef4')
  const r = (t * 3) % 1
  if (slosh > 0) {
    g.alpha(Math.min(1, slosh * 2))
    g.hline(x - 6 * r - 2, x + 6 * r + 2, y0 + 3, '#ffffff')
    g.alpha(1)
  }
  // Handle.
  for (let i = -8; i <= 8; i++) g.px(x + i, Math.round(y0 + 1 - Math.sqrt(Math.max(0, 64 - i * i)) * 0.5), '#9fb4c8')
}

/** Yellow wet-floor A-frame sign with the slipping pictogram. */
export function wetSignSprite(): Sprite {
  return jobSprite('wetsign', 13, 17, (g) => {
    g.poly(
      [
        [6, 0],
        [12, 16],
        [0, 16],
      ],
      '#ffd23f',
    )
    g.rect(3, 15, 7, 2, '#e0a526')
    g.line(6, 1, 1, 15, '#fff09a')
    // Pictogram.
    g.px(7, 6, INK)
    g.line(6, 8, 5, 11, INK)
    g.line(5, 11, 3, 12, INK)
    g.line(5, 11, 8, 12, INK)
    g.line(6, 8, 8, 9, INK)
    g.hline(3, 9, 14, '#78d2e2')
  })
}

// ---------------------------------------------------------------------------
// ให้อาหารปลา – lotus pond and top-down koi / tilapia

/** Lotus pond filling the stage, stone edges and a wooden deck at the bottom. */
export function bakePond(w: number, h: number, deckY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.rect(0, 0, w, h, P.waterD)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2)
        const dy = (y - h * 0.45) / (h * 0.55)
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 0.75 && ditherOn(x, y, (0.75 - d) * 1.4)) g.px(x, y, P.waterDD)
        if (d > 0.8 && ditherOn(x, y, (d - 0.8) * 2.6)) g.px(x, y, P.water)
      }
    // Sky reflection streaks and pebbles.
    for (let i = 0; i < 26; i++) {
      const x = hash(i, 1) * w
      const y = hash(i, 2) * h
      g.hline(x, x + 4 + hash(i, 3) * 8, y, '#6cc0da')
    }
    for (let i = 0; i < 90; i++) g.px(hash(i, 5) * w, hash(i, 6) * h, hash(i, 7) > 0.5 ? '#3a86b0' : '#5ab0d0')
    // Stone edges left/right.
    for (const side of [0, 1]) {
      for (let y = -4; y < h + 6; y += 9) {
        const x = side ? w - 3 + hash(y, 9) * 3 : 2 - hash(y, 9) * 3
        const r = 6 + hash(y, 10) * 2
        g.ellipse(x, y, r + 1, r * 0.8 + 1, INK)
        g.ellipse(x, y, r, r * 0.8, P.stone)
        g.ellipse(x - 1.5, y - 1.5, r * 0.55, r * 0.4, P.stoneL)
        g.px(x + 2, y + 2, P.stoneD)
      }
    }
    // Wooden deck at the bottom.
    if (deckY < h) {
      g.rect(0, deckY - 1, w, 1, INK)
      g.rect(0, deckY, w, h - deckY, '#b8844a')
      for (let y = deckY + 1; y < h; y += 5) {
        g.hline(0, w, y, '#d9a868')
        g.hline(0, w, y + 4, '#8a5a32')
      }
      for (let x = 7; x < w; x += 24) {
        for (let y = deckY + 2; y < h; y += 5) g.px(x + ((y / 5) % 2) * 11, y, '#6e4a35')
      }
      g.rect(0, deckY - 3, w, 2, 'rgba(20,50,80,0.3)')
    }
  })
}

export interface PondFishLook {
  base: Color
  patch: Color
  patch2?: Color
  fin: Color
  stripes?: boolean
}

export const POND_FISH: Record<string, PondFishLook> = {
  kohaku: { base: '#fffaf0', patch: '#f0592b', fin: '#ffe6d6' },
  sanke: { base: '#fffaf0', patch: '#e8452f', patch2: '#2f2838', fin: '#ffe6d6' },
  kigoi: { base: '#ffd23f', patch: '#ffe98a', fin: '#fff3b8' },
  orange: { base: '#ff8a3d', patch: '#ffb36a', fin: '#ffd2a8' },
  showa: { base: '#2f2838', patch: '#e8452f', patch2: '#fffaf0', fin: '#5a4a58' },
  tilapia: { base: '#8a9a82', patch: '#5e6e5a', fin: '#b0a090', stripes: true },
  ruby: { base: '#ff8f8f', patch: '#e86070', fin: '#ffc0c0', stripes: true },
}

/** A top-down fish that bends as it swims; head at (x, y) facing angle a. */
export function drawPondFish(g: Surface, x: number, y: number, a: number, len: number, wiggle: number, look: PondFishLook, seed: number, mouth: number) {
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const pts: [number, number, number][] = []
  const wide = look.stripes ? 1.25 : 1
  for (let d = 0; d <= len; d++) {
    const t = d / len
    const lat = Math.sin(wiggle - d * 0.32) * t * t * 2.6
    const px = x - cos * d - sin * lat
    const py = y - sin * d + cos * lat
    const r = (t < 0.18 ? 1.8 + t * 7 : t < 0.5 ? 3.1 : Math.max(0.7, 3.1 - (t - 0.5) * 5.6)) * wide
    pts.push([px, py, r])
  }
  // Shadow on the pond floor.
  for (const [px, py, r] of pts) g.ellipse(px + 3, py + 4, r, r * 0.8, 'rgba(20,40,70,0.22)')
  // Pectoral fins.
  const fx = x - cos * len * 0.22
  const fy = y - sin * len * 0.22
  const flap = Math.sin(wiggle * 1.6) * 0.7
  for (const side of [-1, 1]) {
    const ex = fx - sin * side * (3.6 + flap) - cos * 1.5
    const ey = fy + cos * side * (3.6 + flap) - sin * 1.5
    g.ellipse(ex, ey, 2.4, 2.4, INK)
    g.ellipse(ex, ey, 1.4, 1.4, look.fin)
  }
  // Tail fin.
  const [tx, ty] = pts[pts.length - 1]
  const tw = Math.sin(wiggle) * 2
  const t1: [number, number] = [tx - cos * 5 - sin * (4 + tw), ty - sin * 5 + cos * (4 + tw)]
  const t2: [number, number] = [tx - cos * 5 + sin * (4 - tw), ty - sin * 5 - cos * (4 - tw)]
  g.thickLine(tx, ty, t1[0], t1[1], 3.4, INK)
  g.thickLine(tx, ty, t2[0], t2[1], 3.4, INK)
  g.thickLine(tx, ty, t1[0], t1[1], 1.6, look.fin)
  g.thickLine(tx, ty, t2[0], t2[1], 1.6, look.fin)
  // Outline then body.
  for (const [px, py, r] of pts) g.circle(px, py, r + 1, INK)
  pts.forEach(([px, py, r], i) => {
    let c = look.base
    if (look.stripes) {
      if (i > 3 && i < len - 2 && i % 4 === 0) c = look.patch
    } else {
      const n = Math.sin(i * 0.9 + seed * 3)
      if (n > 0.35) c = look.patch
      else if (look.patch2 && n < -0.65) c = look.patch2
    }
    g.circle(px, py, r, c)
  })
  // Back highlight / dorsal line.
  for (let i = 2; i < len - 3; i++) {
    const [px, py] = pts[i]
    g.px(px, py, look.stripes ? look.patch : mixHex(look.base, '#ffffff', 0.45))
  }
  // Eyes and mouth.
  g.px(x - cos * 1.5 - sin * 2, y - sin * 1.5 + cos * 2, INK)
  g.px(x - cos * 1.5 + sin * 2, y - sin * 1.5 - cos * 2, INK)
  if (mouth > 0) {
    g.px(x + cos * 0.6, y + sin * 0.6, '#ff9aa6')
    g.px(x + cos * 1.4, y + sin * 1.4, INK)
  }
}

/** Little green turtle paddling by (top-down). */
export function drawTurtle(g: Surface, x: number, y: number, t: number) {
  const leg = Math.sin(t * 6) > 0 ? 1 : 0
  for (const [lx, ly] of [
    [-4 - leg, -5],
    [3 + leg, -5],
    [-4 + leg, 5],
    [3 - leg, 5],
  ]) {
    g.circle(x + lx, y + ly, 2, INK)
    g.circle(x + lx, y + ly, 1.2, '#7aa85a')
  }
  g.circle(x + 7, y, 2.8, INK)
  g.circle(x + 7, y, 2, '#8ab86a')
  g.px(x + 8, y - 1, INK)
  g.px(x + 8, y + 1, INK)
  g.ellipse(x, y, 7, 6, INK)
  g.ellipse(x, y, 6, 5, '#5e8a4a')
  g.ellipse(x - 0.5, y - 0.5, 4.2, 3.4, '#7aa85a')
  g.px(x - 2, y - 2, '#b4e486')
  g.px(x, y, '#5e8a4a')
}

/** Lily pad with an optional pink lotus. */
export function drawLilyPad(g: Surface, x: number, y: number, r: number, flower: boolean, t: number) {
  g.ellipse(x + 1, y + 2, r, r * 0.85, 'rgba(20,50,40,0.3)')
  g.ellipse(x, y, r + 1, r * 0.85 + 1, '#224f3e')
  g.ellipse(x, y, r, r * 0.85, '#43905a')
  g.ellipse(x - 0.7, y - 0.7, r - 1.5, r * 0.85 - 1.5, '#5eae55')
  g.line(x, y, x + r, y - 1, '#2f6f4b')
  g.px(x - r * 0.4, y - r * 0.4, '#9ed86a')
  if (flower) {
    const b = Math.sin(t * 1.5 + x) > 0 ? 0 : 1
    g.rect(x - 3, y - 4 - b, 7, 4, INK)
    g.rect(x - 2, y - 5 - b, 5, 5, INK)
    g.rect(x - 2, y - 4 - b, 5, 3, P.pink)
    g.rect(x - 1, y - 5 - b, 3, 3, P.pinkL)
    g.px(x, y - 3 - b, P.gold)
  }
}

// ---------------------------------------------------------------------------
// ให้อาหารปลาดุก – riverside pier, catfish heads and leaps

/** Riverside view: sky, far bank, murky river and the wooden pier in front. */
export function bakeRiver(w: number, h: number, horizon: number, pierY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.gradientV(0, 0, w, horizon, ['#9fd8ff', '#c9ecff', '#ffe9c4'])
    // Soft clouds.
    for (const [cx, cy, r] of [
      [30, horizon * 0.45, 9],
      [44, horizon * 0.42, 7],
      [140, horizon * 0.55, 8],
      [152, horizon * 0.5, 10],
    ] as [number, number, number][]) {
      g.circle(cx, cy, r, '#ffffff')
      g.circle(cx + 2, cy + 2, r * 0.7, '#f2f8ff')
    }
    // Far bank: trees, a sala on stilts and a chedi.
    g.rect(0, horizon - 4, w, 6, '#7aa06a')
    canopy(
      g,
      Array.from({ length: Math.ceil(w / 11) + 2 }, (_, i) => [i * 11 - 6, horizon - 8 - ((i * 5) % 4), 8 + ((i * 7) % 4)] as [number, number, number]),
      LEAVES.far,
      3,
    )
    const sx = Math.round(w * 0.68)
    g.rect(sx, horizon - 16, 26, 10, '#e8514a')
    g.poly(
      [
        [sx - 4, horizon - 16],
        [sx + 13, horizon - 26],
        [sx + 30, horizon - 16],
      ],
      '#f58f35',
    )
    g.hline(sx - 4, sx + 30, horizon - 16, '#43905a')
    g.rect(sx + 2, horizon - 14, 22, 6, '#fff1d6')
    for (let x = sx + 1; x < sx + 26; x += 6) g.vline(x, horizon - 8, horizon + 2, '#6e4a35')
    const cx = Math.round(w * 0.22)
    g.rect(cx - 4, horizon - 14, 9, 8, '#fffaf0')
    g.poly(
      [
        [cx - 3, horizon - 14],
        [cx + 0.5, horizon - 28],
        [cx + 4, horizon - 14],
      ],
      '#ffd54f',
    )
    g.px(cx + 1, horizon - 29, '#fff3a6')
    // River.
    const water = h - horizon
    g.gradientV(0, horizon, w, water, ['#9ab874', '#86a660', '#76964f', '#688848'], 10)
    for (let i = 0; i < 70; i++) {
      const y = horizon + 2 + hash(i, 1) * (pierY - horizon - 4)
      const x = hash(i, 2) * w
      const L = 3 + hash(i, 3) * 10 * ((y - horizon) / water + 0.4)
      g.hline(x, x + L, y, hash(i, 4) > 0.5 ? '#a8c488' : '#5e7e44')
    }
    g.hline(0, w, horizon, '#c8e0a8')
    // Pier: posts, planks and a rope.
    const py = pierY
    for (let x = 8; x < w; x += 44) {
      g.rect(x - 1, py - 14, 8, h - py + 14, INK)
      g.rect(x, py - 13, 6, h - py + 13, '#8a5a32')
      g.rect(x, py - 13, 2, h - py + 13, '#b8844a')
      g.rect(x - 1, py - 15, 8, 2, '#6e4a35')
    }
    g.rect(0, py - 1, w, 1, INK)
    g.rect(0, py, w, h - py, '#c28e5c')
    for (let y = py + 1; y < h; y += 6) {
      g.hline(0, w, y, '#e0b078')
      g.hline(0, w, y + 5, '#8a5a32')
      for (let x = ((y / 6) | 0) % 2 ? 9 : 27; x < w; x += 36) {
        g.vline(x, y + 1, y + 4, '#8a5a32')
        g.px(x + 2, y + 2, '#6e4a35')
      }
    }
    g.rect(0, py - 3, w, 2, 'rgba(40,50,30,0.35)')
    for (let x = 0; x < w; x++) g.px(x, py - 10 + Math.round(Math.sin(x / 7) * 2 + 2), '#d9b25f')
  })
}

const CAT = { d: '#4a4640', b: '#6a645a', l: '#8a8476', belly: '#d8cfbf', bellyD: '#b8ae9c' }
const ALBINO = { d: '#c89a8a', b: '#f0c8b8', l: '#ffe4d6', belly: '#fff4ea', bellyD: '#f0d8c8' }

/**
 * Catfish head poking out of the water, mouth up and wide (x, y = water line).
 * rise 0..1 how far it is out, open 0..1 mouth.
 */
export function drawCatfishHead(g: Surface, x: number, y: number, s: number, rise: number, open: number, t: number, albino: boolean) {
  if (rise <= 0.02) return
  const c = albino ? ALBINO : CAT
  const H = Math.max(2, 14 * s * rise)
  const W = 7.5 * s
  const top = y - H
  const clip = (fn: () => void) => {
    g.ctx.save()
    g.ctx.beginPath()
    g.ctx.rect(0, 0, g.w, Math.round(y) + 1 - g.oy)
    g.ctx.clip()
    fn()
    g.ctx.restore()
  }
  clip(() => {
    g.ellipse(x, top + H * 0.62, W + 1, H * 0.66 + 1, INK)
    g.ellipse(x, top + H * 0.62, W, H * 0.66, c.b)
    g.ellipse(x - W * 0.25, top + H * 0.48, W * 0.55, H * 0.4, c.l)
    // Pale throat.
    g.ellipse(x, top + H * 0.82, W * 0.62, H * 0.42, c.bellyD)
    g.ellipse(x, top + H * 0.84, W * 0.5, H * 0.36, c.belly)
  })
  const my = top + 3.2 * s
  if (rise > 0.5) {
    // Mouth.
    const mo = Math.max(0.15, open)
    g.ellipse(x, my, 4.8 * s + 1, (1 + 3.2 * mo) * s + 1, INK)
    g.ellipse(x, my, 4.8 * s, (1 + 3.2 * mo) * s, albino ? '#e8a0a8' : '#e8d8c8')
    if (mo > 0.3) {
      g.ellipse(x, my + 0.5, 3.6 * s, (0.4 + 2.6 * mo) * s, '#7e2436')
      g.ellipse(x, my + 1.5 * s * mo, 2.2 * s, 0.9 * s * mo + 0.4, '#e86a7a')
    }
    // Eyes with glints.
    for (const side of [-1, 1]) {
      const ex = Math.round(x + side * 5.4 * s)
      const ey = Math.round(my + 2.5 * s)
      g.rect(ex - 1, ey - 1, 2, 2, INK)
      g.px(ex - (side < 0 ? 1 : 0), ey - 1, '#ffffff')
    }
    // Whiskers (barbels).
    for (const side of [-1, 1]) {
      const wig = Math.sin(t * 9 + side + x) * 1.2
      const bx = x + side * 4.4 * s
      g.line(bx, my, bx + side * 7 * s, my - 2 * s + wig, INK)
      g.line(bx + side * 7 * s, my - 2 * s + wig, bx + side * 11 * s, my + 1 * s + wig, INK)
      g.line(bx, my + 1, bx + side * 6 * s, my + 4 * s - wig, c.d)
      g.line(x + side * 2 * s, my + 3 * s, x + side * 4 * s, my + 8 * s + wig * 0.5, c.d)
    }
  }
  // Water ring around the neck.
  g.ellipse(x, y + 0.5, W + 3, 2.2, '#b8d49a')
  g.hline(x - W - 2, x + W + 2, y, '#e6f2d8')
  const f = Math.floor(t * 8) % 2
  g.px(x - W - 3 + f, y - 1, '#ffffff')
  g.px(x + W + 2 - f, y - 1, '#ffffff')
}

/** A catfish leaping out of the water (side view); ang is the heading, dir ±1 which way it faces. */
export function drawCatfishLeap(g: Surface, x: number, y: number, ang: number, s: number, t: number, albino: boolean, dir = 1) {
  const c = albino ? ALBINO : CAT
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)
  // Normal pointing to the fish's belly side.
  const nx = -sin * dir
  const ny = cos * dir
  const L = Math.round(26 * s)
  const pts: [number, number, number][] = []
  for (let d = 0; d <= L; d++) {
    const k = d / L
    const bend = Math.sin(t * 14 - d * 0.3) * k * k * 2.2
    const px = x - cos * d + nx * bend
    const py = y - sin * d + ny * bend
    const r = (k < 0.12 ? 3.6 + k * 8 : k < 0.5 ? 4.5 - (k - 0.12) * 1.5 : Math.max(1.1, 3.9 - (k - 0.5) * 6)) * s
    pts.push([px, py, r])
  }
  const at = (k: number) => pts[Math.min(L, Math.max(0, Math.round(k * L)))]
  // Tail fin: a rounded fan.
  const [tx, ty] = pts[L]
  const fx = tx - cos * 3.5 * s
  const fy = ty - sin * 3.5 * s
  g.ellipse(fx, fy, 5 * s + 1, 5 * s + 1, INK)
  g.ellipse(fx, fy, 5 * s, 5 * s, c.d)
  g.ellipse(fx - cos, fy - sin, 3 * s, 3 * s, c.b)
  // Dorsal (back) and anal (belly) fin ribbons.
  for (let k = 0.3; k <= 0.95; k += 0.03) {
    const [px, py, r] = at(k)
    g.circle(px - nx * (r + 1.2), py - ny * (r + 1.2), 2.2, INK)
  }
  for (let k = 0.55; k <= 0.95; k += 0.03) {
    const [px, py, r] = at(k)
    g.circle(px + nx * (r + 1), py + ny * (r + 1), 1.9, INK)
  }
  for (let k = 0.3; k <= 0.95; k += 0.03) {
    const [px, py, r] = at(k)
    g.circle(px - nx * (r + 1.2), py - ny * (r + 1.2), 1.2, c.d)
  }
  for (let k = 0.55; k <= 0.95; k += 0.03) {
    const [px, py, r] = at(k)
    g.circle(px + nx * (r + 1), py + ny * (r + 1), 0.9, c.d)
  }
  // Body: outline, back colour, pale belly, highlight.
  for (const [px, py, r] of pts) g.circle(px, py, r + 1, INK)
  for (const [px, py, r] of pts) g.circle(px, py, r, c.b)
  for (const [px, py, r] of pts) g.circle(px + nx * r * 0.5, py + ny * r * 0.5, r * 0.5, c.belly)
  for (let i = 2; i < L - 3; i += 2) {
    const [px, py, r] = pts[i]
    g.px(px - nx * r * 0.55, py - ny * r * 0.55, c.l)
  }
  // Wide open mouth at the front, eye and trailing whiskers.
  const mx = x + cos * 1.5
  const my = y + sin * 1.5
  g.ellipse(mx + nx * 0.8, my + ny * 0.8, 2.6 * s + 1, 2.6 * s + 1, INK)
  g.ellipse(mx + nx * 0.8, my + ny * 0.8, 2.6 * s, 2.6 * s, '#7e2436')
  g.px(mx + nx * 1.5, my + ny * 1.5, '#e86a7a')
  const ex = x - cos * 3 * s - nx * 2.2 * s
  const ey = y - sin * 3 * s - ny * 2.2 * s
  g.rect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 2, INK)
  g.px(Math.round(ex) - 1, Math.round(ey) - 1, '#ffffff')
  for (const k of [-1, 1]) {
    const wig = Math.sin(t * 12 + k) * 2
    const bx = mx + nx * k * 2 * s
    const by = my + ny * k * 2 * s
    g.line(bx, by, bx - cos * 9 * s + nx * k * 6 * s + wig, by - sin * 9 * s + ny * k * 6 * s, INK)
    g.line(bx, by, bx - cos * 4 * s + nx * (k + 1.5) * 5 * s, by - sin * 4 * s + ny * (k + 1.5) * 5 * s + wig, INK)
  }
}

/** Dark catfish back breaking the surface (the crowd). */
export function drawCatfishBack(g: Surface, x: number, y: number, s: number, dir: number, t: number, ph: number) {
  const bob = Math.sin(t * 3 + ph)
  const hgt = (2.2 + bob * 1.2) * s
  if (hgt <= 0.3) return
  g.ctx.save()
  g.ctx.beginPath()
  g.ctx.rect(0, 0, g.w, Math.round(y) + 1 - g.oy)
  g.ctx.clip()
  g.ellipse(x, y, 9 * s + 1, hgt + 1, INK)
  g.ellipse(x, y, 9 * s, hgt, CAT.b)
  g.hline(x - 6 * s, x + 4 * s, Math.round(y - hgt + 1), CAT.l)
  g.ctx.restore()
  // Head end with a whisker.
  const hx = x + dir * 8 * s
  g.line(hx, y - 1, hx + dir * 5 * s, y - 2 + Math.sin(t * 7 + ph) * 1.5, INK)
  g.hline(x - 10 * s, x + 10 * s, Math.round(y + 1), '#a8c488')
  if (bob > 0.85) g.px(x - dir * 9 * s, y - 2, '#ffffff')
}

/** A clay bowl of fish food on the pier. */
export function drawFoodBowl(g: Surface, x: number, y: number) {
  shadow(g, x, y + 1, 11, 2.5)
  g.ellipse(x, y - 4, 11, 6, INK)
  g.ellipse(x, y - 5, 10, 5, '#c9703f')
  g.ellipse(x, y - 7, 9, 3, '#8a4a2a')
  for (let i = 0; i < 16; i++) {
    const px = x - 7 + hash(i, 21) * 14
    const py = y - 8 - hash(i, 22) * 2
    g.px(px, py, hash(i, 23) > 0.5 ? '#e8c07a' : '#c28e5c')
  }
  g.hline(x - 9, x - 3, y - 4, '#e8a070')
}

// ---------------------------------------------------------------------------
// จัดรองเท้า – shoes of many styles (side view), the rack and the entrance

export type ShoeStyle = 'sneaker' | 'school' | 'heel' | 'boot' | 'flipflop' | 'clog' | 'sandal' | 'slipon'

export const SHOE_STYLES: ShoeStyle[] = ['sneaker', 'school', 'heel', 'boot', 'flipflop', 'clog', 'sandal', 'slipon']

// Side view, toe to the right. Keys: o main, l light, d dark, x inside, w white,
// s sole, g outsole, k black, b strap.
const SHOE_ROWS: Record<ShoeStyle, string[]> = {
  sneaker: [
    '...ooo..........',
    '..oxxoo.........',
    '..ooooowdwd.....',
    '..oooooooooo....',
    '.olooowwwoooooo.',
    '.ooooooowwoooooo',
    'wwwwwwwwwwwwwwww',
    '.gggggggggggggg.',
  ],
  school: [
    '..ooo...........',
    '.oxxoo..........',
    '.ooooooodo......',
    '.oooooooooooo...',
    '.olloooooooooo..',
    '.ooooooooooooooo',
    '.ooooooooooooooo',
    'ggg....gggggggg.',
  ],
  heel: [
    'oo..............',
    'oloo............',
    'oooo............',
    '.ooox...........',
    '.oooooo.........',
    '.d.ooooox...llo.',
    '.d...oooooooooooo',
    '.d......gggggggg',
  ],
  boot: [
    '..oooooo........',
    '..olooox........',
    '..olooox........',
    '..oloooo........',
    '..olooooo.......',
    '.oolooooooooo...',
    '.oooooooooooooo.',
    '.ddddddddddddddd',
    '.gggggggggggggg.',
  ],
  flipflop: [
    '........bb......',
    '.......b.bb.....',
    '.....bb....bb...',
    '...bb.......b...',
    'wwwwwwwwwwwwwww.',
    'wwwwwwwwwwwwwwww',
    'bbbbbbbbbbbbbbb.',
  ],
  clog: [
    '..ooo...........',
    '.o...ooooooo....',
    '.o.oooooooooooo.',
    '.o.oxooxooxooooo',
    '..ooooooooooooooo',
    '..lllllllllllllll',
    '..ddddddddddddddd',
  ],
  sandal: [
    '..oo............',
    '.o..o...........',
    '.o...oo....oo...',
    '.o...oo....oo...',
    '.o...oo....ooo..',
    'ssssssssssssssss',
    'gggggggggggggggg',
  ],
  slipon: [
    '..kkk...........',
    '.kxxkk..........',
    '.kkkkkkkkk......',
    '.kwkwkwkwkwk....',
    '.wkwkwkwkwkwkk..',
    '.kwkwkwkwkwkwkkk',
    'wwwwwwwwwwwwwwww',
    '.gggggggggggggg.',
  ],
}

const SHOE_PAL: Record<ShoeStyle, Record<string, Color>> = {
  sneaker: { o: '#e8514a', l: '#ff8a7a', d: '#fffaf0', x: '#7e2436', w: '#fffaf0', g: '#bdb2ae' },
  school: { o: '#3a3440', l: '#8a8494', d: '#fffaf0', x: '#1e1a22', g: '#2a2228' },
  heel: { o: '#ff9fc0', l: '#ffd6e0', d: '#b8506e', x: '#8e3a5c', g: '#e8709e' },
  boot: { o: '#ffd23f', l: '#fff09a', x: '#b8742a', d: '#e0a526', g: '#8a6a3a' },
  flipflop: { w: '#fffaf0', b: '#3d73c8' },
  clog: { o: '#86d04a', l: '#b4e486', x: '#3f7a2a', d: '#5ea653' },
  sandal: { o: '#9a6a45', s: '#e0bb8a', g: '#6e4a35' },
  slipon: { k: '#2f2838', w: '#fffaf0', x: '#15101a', g: '#bdb2ae' },
}

/** One shoe (side view, toe to the right). `flip` faces left, `tipped` lies sole-up. */
export function shoeSprite(style: ShoeStyle, flip = false, tipped = false, shade = 0): Sprite {
  return cached(`job:shoe:${style}:${flip ? 1 : 0}:${tipped ? 1 : 0}:${shade}`, () => {
    const rows = SHOE_ROWS[style]
    const pal = SHOE_PAL[style]
    const w = Math.max(...rows.map((r) => r.length))
    const h = rows.length
    const c = bake(w, h, (g) => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const k = row[x]
          const col = pal[k]
          if (!col) continue
          const px = flip ? w - 1 - x : x
          const py = tipped ? h - 1 - y : y
          g.px(px, py, shade ? mixHex(col, '#3a2838', 0.22) : col)
        }
      })
    })
    return outlineCanvas(c, INK)
  })
}

/** Size of one shoe sprite (with outline). */
export function shoeSize(style: ShoeStyle): [number, number] {
  const rows = SHOE_ROWS[style]
  return [Math.max(...rows.map((r) => r.length)) + 2, rows.length + 2]
}

/** A neat pair: the far shoe peeks out behind the near one. */
export function drawShoePair(g: Surface, style: ShoeStyle, x: number, y: number, flip = false) {
  const back = shoeSprite(style, flip, false, 1)
  const front = shoeSprite(style, flip, false, 0)
  g.draw(back.canvas, Math.round(x - back.w / 2 + (flip ? -3 : 3)), Math.round(y - back.h - 2))
  g.draw(front.canvas, Math.round(x - front.w / 2), Math.round(y - front.h + 1))
}

/** Wooden shoe rack (ชั้นวางรองเท้า) with `cols` slots on two shelves. */
export function drawShoeRack(g: Surface, x: number, y: number, cols: number, slotW: number, shelfH: number) {
  const W = cols * slotW + 6
  const H = shelfH * 2 + 8
  // Posts and back boards.
  g.rect(x - 1, y - 1, W + 2, H + 2, INK)
  g.rect(x, y, W, H, '#8a5a32')
  for (let yy = y + 2; yy < y + H; yy += 4) g.hline(x + 3, x + W - 4, yy, '#7a4e2c')
  g.rect(x, y, 3, H, '#b8844a')
  g.rect(x + W - 3, y, 3, H, '#b8844a')
  g.px(x + 1, y + 1, '#d9a868')
  // Shelves.
  for (let r = 0; r < 2; r++) {
    const sy = y + (r + 1) * (shelfH + 3) - 1
    g.rect(x - 2, sy, W + 4, 4, INK)
    g.rect(x - 1, sy + 1, W + 2, 2, '#d9a868')
    g.hline(x - 1, x + W, sy + 1, '#f0c888')
    g.rect(x, sy + 3, W, 1, 'rgba(58,40,56,0.35)')
  }
  // Legs.
  g.rect(x + 1, y + H, 3, 3, INK)
  g.rect(x + W - 4, y + H, 3, 3, INK)
}

/** Temple entrance: white wall, red doors with gold, steps and a stone floor. */
export function bakeEntrance(w: number, h: number, floorY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    // Wall.
    g.rect(0, 0, w, floorY, '#fbf3e4')
    for (let y = 4; y < floorY - 6; y += 8) g.hline(0, w, y, '#f0e4cc')
    // Doors (behind the rack, visible above and beside it).
    const dw = 56
    const dx = Math.round(w / 2 - dw / 2)
    g.rect(dx - 5, 0, dw + 10, floorY - 2, P.goldD)
    g.rect(dx - 3, 0, dw + 6, floorY - 2, P.gold)
    g.rect(dx, 0, dw, floorY - 2, '#7e2436')
    g.rect(dx + 2, 0, dw / 2 - 3, floorY - 4, '#b8343f')
    g.rect(dx + dw / 2 + 1, 0, dw / 2 - 3, floorY - 4, '#b8343f')
    for (let y = 6; y < floorY - 8; y += 9)
      for (const ox of [dx + 8, dx + dw / 2 + 7]) {
        g.px(ox + 5, y, P.gold)
        g.rect(ox + 4, y + 1, 3, 1, P.goldD)
        g.px(ox + 5, y + 2, P.gold)
      }
    // Pillars.
    for (const px of [6, w - 18]) {
      g.rect(px - 1, 0, 14, floorY, INK)
      g.rect(px, 0, 12, floorY, '#fffaf0')
      g.rect(px + 9, 0, 3, floorY, '#e8dcc8')
      g.rect(px, floorY - 8, 12, 8, P.goldD)
      g.hline(px, px + 11, floorY - 8, P.gold)
    }
    // No-shoes sign on the right pillar.
    const sx = w - 38
    g.rect(sx - 1, 10, 16, 14, INK)
    g.rect(sx, 11, 14, 12, '#fffaf0')
    g.rect(sx + 3, 15, 8, 4, '#9a6a45')
    g.rect(sx + 3, 18, 9, 2, '#6e4a35')
    g.line(sx + 2, 13, sx + 12, 21, P.red)
    g.line(sx + 2, 14, sx + 12, 22, P.red)
    // Step and floor.
    g.rect(0, floorY - 2, w, 3, '#e4ddd6')
    g.hline(0, w, floorY - 2, '#ffffff')
    g.rect(0, floorY + 1, w, 2, 'rgba(58,40,56,0.25)')
    paving(g, 0, floorY + 3, w, h - floorY - 3, 16, 'cream')
    weather(g, 0, floorY + 3, w, h - floorY - 3, 11, 0.35)
    // Potted plants along the sides.
    for (let y = floorY + 30; y < h - 10; y += 70) for (const x of [7, w - 7]) {
      g.rect(x - 5, y - 1, 11, 9, INK)
      g.rect(x - 4, y, 9, 7, '#c9703f')
      g.hline(x - 4, x + 4, y, '#e8a070')
      canopy(g, [[x - 2, y - 4, 4], [x + 2, y - 5, 4], [x, y - 8, 4]], LEAVES.green, x + y)
    }
    // A woven doormat.
    const mx = Math.round(w / 2 - 22)
    const my = floorY + 6
    g.rect(mx - 1, my - 1, 46, 12, INK)
    g.rect(mx, my, 44, 10, '#c9a04c')
    for (let yy = my; yy < my + 10; yy++) for (let xx = mx; xx < mx + 44; xx++) if ((xx + yy) % 4 === 0) g.px(xx, yy, '#a8803a')
    g.rect(mx + 2, my + 2, 40, 6, '#e8514a')
    g.rect(mx + 4, my + 4, 36, 2, '#ffd23f')
  })
}

// ---------------------------------------------------------------------------
// จุดเทียน – dim shrine room, candles, the taper and cute wind puffs

/** Dim vihara wall, the principal Buddha and a red lacquer altar table (baked). */
export function bakeShrine(w: number, h: number, tableY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.gradientV(0, 0, w, tableY, ['#2a1420', '#4a1c2c', '#5e2234'], 8)
    // Gold stencil motifs.
    for (let y = 6; y < tableY - 6; y += 14)
      for (let x = ((y / 14) | 0) % 2 ? 7 : 0; x < w; x += 14) {
        g.px(x, y, '#8a5a2a')
        g.px(x - 1, y + 1, '#6e4222')
        g.px(x + 1, y + 1, '#6e4222')
        g.px(x, y + 2, '#8a5a2a')
      }
    // Red pillars with gold capitals.
    for (const px of [4, w - 16]) {
      g.rect(px - 1, 0, 14, tableY, INK)
      g.rect(px, 0, 12, tableY, '#8e2a3c')
      g.rect(px + 2, 0, 2, tableY, '#b8434f')
      g.rect(px + 9, 0, 2, tableY, '#6e1f30')
      for (let y = 8; y < tableY - 4; y += 18) {
        g.rect(px + 4, y, 4, 6, P.goldDD)
        g.px(px + 5, y + 1, P.gold)
      }
    }
    // Principal Buddha on a tiered base.
    const cx = Math.round(w / 2)
    const seat = tableY - 30
    g.rect(cx - 36, seat, 72, 30, INK)
    g.rect(cx - 35, seat + 1, 70, 29, '#7e2436')
    g.rect(cx - 35, seat + 1, 70, 3, P.goldD)
    g.hline(cx - 35, cx + 34, seat + 1, P.gold)
    for (let x = cx - 31; x < cx + 32; x += 8) {
      g.rect(x, seat + 8, 5, 12, '#9a2e3e')
      g.px(x + 2, seat + 13, P.gold)
    }
    g.rect(cx - 28, seat - 5, 56, 6, INK)
    g.rect(cx - 27, seat - 4, 54, 5, P.goldDD)
    g.hline(cx - 27, cx + 26, seat - 4, P.goldD)
    drawBuddhaHD(g, cx, seat - 4, 0.95, 'sukhothai')
    // Altar table.
    g.rect(0, tableY - 1, w, 1, INK)
    g.rect(0, tableY, w, 6, '#b8343f')
    g.hline(0, w, tableY, '#e0646a')
    g.rect(0, tableY + 6, w, 3, P.goldD)
    g.hline(0, w, tableY + 6, P.gold)
    g.rect(0, tableY + 9, w, 36, '#6e1f30')
    for (let x = 8; x < w - 8; x += 30) {
      g.rect(x, tableY + 13, 24, 26, '#8e2a3c')
      g.frame(x, tableY + 13, 24, 26, P.goldDD)
      g.frame(x + 2, tableY + 15, 20, 22, '#b8434f')
      // Gold lotus medallion.
      g.circle(x + 12, tableY + 26, 4, P.goldDD)
      g.circle(x + 12, tableY + 26, 3, P.goldD)
      g.px(x + 12, tableY + 25, P.gold)
      g.px(x + 11, tableY + 24, P.goldL)
    }
    g.rect(0, tableY + 44, w, 2, P.goldDD)
    // Floor with a praying mat, an incense urn and lotus offerings.
    const fy = tableY + 46
    g.rect(0, fy, w, h - fy, '#3a1a24')
    for (let y = fy + 3; y < h; y += 7) g.hline(0, w, y, '#4a2230')
    const my = fy + 12
    g.rect(cx - 34, my, 68, 26, INK)
    g.rect(cx - 33, my + 1, 66, 24, '#b8343f')
    g.rect(cx - 30, my + 4, 60, 18, '#e8514a')
    g.frame(cx - 30, my + 4, 60, 18, P.gold)
    for (let x = cx - 26; x < cx + 26; x += 6) g.px(x, my + 13, P.gold)
    // Urn.
    const ux = cx
    const uy = my + 2
    g.ellipse(ux, uy, 11, 6, INK)
    g.ellipse(ux, uy - 1, 10, 5, P.goldD)
    g.ellipse(ux, uy - 3, 9, 2.5, '#8a5a2a')
    g.ellipse(ux - 3, uy - 1, 3, 2, P.gold)
    for (let i = -2; i <= 2; i++) {
      g.vline(ux + i * 3, uy - 16, uy - 4, '#c8704a')
      g.px(ux + i * 3, uy - 17, '#ff8a3a')
    }
    // Lotus bowls on both sides.
    for (const lx of [cx - 56, cx + 56]) {
      g.ellipse(lx, my + 14, 9, 4, INK)
      g.ellipse(lx, my + 13, 8, 3, '#e0bb8a')
      for (const [ox, oy] of [
        [-4, 0],
        [0, -2],
        [4, 0],
      ]) {
        g.rect(lx + ox - 2, my + 6 + oy, 5, 6, INK)
        g.rect(lx + ox - 1, my + 7 + oy, 3, 4, P.pink)
        g.px(lx + ox, my + 7 + oy, P.pinkL)
      }
    }
  })
}

/** Brass candle rail with sockets under each candle. */
export function drawCandleRail(g: Surface, x0: number, x1: number, y: number, xs: number[]) {
  g.rect(x0 - 1, y - 1, x1 - x0 + 2, 5, INK)
  g.rect(x0, y, x1 - x0, 3, P.goldD)
  g.hline(x0, x1 - 1, y, P.gold)
  for (const x of xs) {
    g.rect(x - 4, y - 3, 9, 4, INK)
    g.rect(x - 3, y - 2, 7, 2, P.gold)
    g.px(x - 2, y - 2, P.goldL)
  }
  for (const x of [x0 + 6, x1 - 7]) {
    g.rect(x - 2, y + 4, 5, 10, INK)
    g.rect(x - 1, y + 4, 3, 10, P.goldD)
  }
}

/** A wax candle standing on (x, baseY); flame when lit, bending by `lean`. */
export function drawCandleFlame(g: Surface, x: number, baseY: number, hgt: number, lit: boolean, t: number, lean: number, glow: number) {
  const top = baseY - hgt
  g.rect(x - 4, top, 9, hgt, INK)
  g.rect(x - 3, top + 1, 7, hgt - 1, '#fff3d6')
  g.rect(x + 2, top + 1, 2, hgt - 1, '#ecd6aa')
  g.vline(x - 2, top + 3, baseY - 3, '#ffffff')
  // Soft melted top with drips.
  g.rect(x - 3, top + 1, 7, 2, '#fffaf0')
  g.px(x + 3, top + 3, '#fffaf0')
  g.px(x + 3, top + 4, '#fffaf0')
  g.px(x - 3, top + 4, '#fffaf0')
  g.px(x, top + 2, '#e8d6b0')
  // Wick.
  g.vline(x, top - 2, top, INK)
  if (!lit) return
  const f = Math.sin(t * 17 + x * 1.7) * 0.6 + Math.sin(t * 29 + x) * 0.4
  const fx = x + lean
  const fy = top - 3
  if (glow > 0) softGlow(g, fx, fy - 2, 14 + glow * 8, 0.55 + glow * 0.45, '#ffb050')
  const hh = 8 + (f > 0.3 ? 1 : 0)
  g.ellipse(fx, fy - hh * 0.35, 3.2, hh * 0.55, '#ff7a24')
  g.ellipse(fx + lean * 0.3, fy - hh * 0.45, 2.3, hh * 0.5, '#ffb347')
  g.ellipse(fx + lean * 0.4, fy - hh * 0.4, 1.5, hh * 0.38, '#ffe27a')
  g.px(Math.round(fx + lean * 0.7 + f * 0.6), Math.round(fy - hh - 0.5), '#ffb347')
  g.ellipse(fx, fy - 1, 1, 1.8, '#fff8d8')
  g.px(fx, fy + 1, '#9fd0ff')
}

/** The long thin taper candle (ไม้ขีด/เทียนจุด) held by the player; flame tip at (x, y). */
export function drawTaper(g: Surface, x: number, y: number, t: number) {
  const bx = x + 10
  const by = y + 34
  inkLine(g, x, y + 3, bx, by, 2, '#ffe27a')
  g.line(x + 1, y + 3, bx + 1, by, '#e0a526')
  const f = Math.sin(t * 19) > 0 ? 1 : 0
  softGlow(g, x, y - 1, 14, 0.8, '#ffb050')
  g.ellipse(x, y - 1, 2.6, 4 + f, '#ff8a2a')
  g.ellipse(x, y - 1.5, 1.8, 3 + f * 0.5, '#ffd54f')
  g.ellipse(x, y, 1, 1.5, '#fff8d8')
  g.px(x, y - 5 - f, '#ffb347')
}

/** A cute wind spirit: a puffy cloud with cheeks full, blowing toward `dir`. */
export function drawWindPuff(g: Surface, x: number, y: number, dir: number, t: number, alpha = 1) {
  const p = Math.sin(t * 6) * 0.6
  g.alpha(alpha)
  const blobs: [number, number, number][] = [
    [-5, 1, 5 + p],
    [0, -2, 6 + p],
    [5, 1, 5 + p * 0.5],
    [0, 3, 5],
  ]
  for (const [bx, by, r] of blobs) g.circle(x + bx * -dir, y + by, r + 1, INK)
  for (const [bx, by, r] of blobs) g.circle(x + bx * -dir, y + by, r, '#e6f4ff')
  g.circle(x - dir * 2, y - 3, 3, '#ffffff')
  // Face: squinty eyes, rosy puffed cheeks and a little "o" mouth.
  const fx = x + dir * 2
  g.px(fx - 2, y - 1, INK)
  g.px(fx + 2, y - 1, INK)
  g.px(fx - 3, y - 2, INK)
  g.px(fx + 3, y - 2, INK)
  g.rect(fx - 4, y + 1, 2, 1, '#ffb0c0')
  g.rect(fx + 3, y + 1, 2, 1, '#ffb0c0')
  g.rect(Math.round(fx + dir * 5), y, 2, 2, INK)
  // Breath lines.
  for (let i = 0; i < 3; i++) {
    const ly = y - 2 + i * 3
    const lx = x + dir * (10 + ((t * 30 + i * 5) % 8))
    g.hline(lx, lx + dir * 4, ly, '#ffffff')
  }
  g.alpha(1)
}

// ---------------------------------------------------------------------------
// รดน้ำต้นไม้ – kuti garden, flower pots, gauges, watering can, butterflies

/** Monk's kuti wall (teak planks and a shuttered window), a brick ledge and lawn. */
export function bakeKutiGarden(w: number, h: number, ledgeY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    // Teak plank wall.
    g.rect(0, 0, w, ledgeY, '#9a6440')
    for (let x = 0; x < w; x += 9) {
      g.vline(x, 0, ledgeY, '#7a4a2e')
      g.vline(x + 1, 0, ledgeY, '#b07a4e')
      for (let y = (x * 7) % 23; y < ledgeY; y += 23) g.px(x + 4, y, '#86543a')
    }
    // Window with open shutters and a hanging plant.
    const wx = Math.round(w / 2 - 20)
    const wy = Math.round(ledgeY * 0.38)
    g.rect(wx - 2, wy - 2, 44, 34, INK)
    g.rect(wx, wy, 40, 30, '#ffe9b8')
    g.rect(wx, wy + 18, 40, 12, '#f3d898')
    g.vline(wx + 20, wy, wy + 30, '#6e4a35')
    g.hline(wx, wx + 39, wy + 15, '#6e4a35')
    for (const sx of [wx - 16, wx + 42]) {
      g.rect(sx - 1, wy - 2, 16, 34, INK)
      g.rect(sx, wy - 1, 14, 32, '#5ea653')
      for (let y = wy + 1; y < wy + 30; y += 3) g.hline(sx + 1, sx + 12, y, '#43905a')
    }
    g.rect(wx - 4, wy + 30, 48, 3, INK)
    g.rect(wx - 3, wy + 30, 46, 2, '#c28e5c')
    // Eaves shadow at the top.
    g.rect(0, 0, w, 6, 'rgba(40,20,10,0.35)')
    // Brick ledge.
    g.rect(0, ledgeY - 1, w, 1, INK)
    g.rect(0, ledgeY, w, 12, '#c9703f')
    g.hline(0, w, ledgeY, '#e8a070')
    for (let y = ledgeY + 3; y < ledgeY + 12; y += 4) {
      g.hline(0, w, y, '#a0522e')
      for (let x = ((y / 4) | 0) % 2 ? 0 : 5; x < w; x += 10) g.vline(x, y + 1, y + 3, '#a0522e')
    }
    g.rect(0, ledgeY + 12, w, 2, 'rgba(40,30,20,0.35)')
    // Lawn with a stepping-stone path.
    lawn(g, 0, ledgeY + 12, w, h - ledgeY - 12, 4)
    for (let i = 0; i < 6; i++) {
      const sx = w * 0.5 + Math.sin(i * 1.3) * 26
      const sy = ledgeY + 26 + i * 18
      g.ellipse(sx, sy, 9, 4.5, INK)
      g.ellipse(sx, sy, 8, 3.5, P.stone)
      g.ellipse(sx - 2, sy - 1, 4, 1.5, P.stoneL)
    }
  })
}

export type PlantKind = 'marigold' | 'jasmine' | 'orchid' | 'rose' | 'sunflower'

const PLANT_FLOWER: Record<PlantKind, { a: Color; b: Color; c: Color }> = {
  marigold: { a: '#ff9a2a', b: '#ffc24a', c: '#d0661f' },
  jasmine: { a: '#ffffff', b: '#fff6d8', c: '#ffd23f' },
  orchid: { a: '#b87ae8', b: '#e2c2ff', c: '#ffd23f' },
  rose: { a: '#e8384a', b: '#ff7a86', c: '#9e2030' },
  sunflower: { a: '#ffd23f', b: '#ffe98a', c: '#7a4a2e' },
}

/** Terracotta pot with soil that darkens as it gets wet. */
export function drawPot(g: Surface, x: number, baseY: number, size: number, wet: number, spill: number) {
  const W = size
  const H = Math.round(size * 0.85)
  const top = baseY - H
  shadow(g, x, baseY, W / 2 + 3, 2.5)
  g.poly(
    [
      [x - W / 2 - 1, top],
      [x + W / 2 + 1, top],
      [x + W / 2 - 2, baseY + 1],
      [x - W / 2 + 2, baseY + 1],
    ],
    INK,
  )
  g.poly(
    [
      [x - W / 2, top + 1],
      [x + W / 2, top + 1],
      [x + W / 2 - 3, baseY],
      [x - W / 2 + 3, baseY],
    ],
    '#c9703f',
  )
  g.rect(x - W / 2 + 2, top + 5, 2, H - 7, '#e8a070')
  g.rect(x + W / 2 - 5, top + 5, 2, H - 7, '#a0522e')
  // Rim.
  g.rect(x - W / 2 - 2, top - 1, W + 4, 5, INK)
  g.rect(x - W / 2 - 1, top, W + 2, 3, '#d98050')
  g.hline(x - W / 2 - 1, x + W / 2, top, '#f0a878')
  // Soil.
  const soil = wet > 0.95 ? '#3a2418' : wet > 0.5 ? '#5a3a24' : '#8a6040'
  g.rect(x - W / 2 + 1, top + 1, W - 2, 2, soil)
  if (wet > 0.3) g.px(x - 2, top + 1, '#8fc8e8')
  if (spill > 0) {
    g.alpha(Math.min(1, spill))
    g.rect(x - W / 2 - 1, top + 2, 2, H - 2, '#78d2e2')
    g.rect(x + W / 2 - 1, top + 3, 2, H - 4, '#78d2e2')
    g.ellipse(x, baseY + 1, W / 2 + 5, 2, '#78d2e2')
    g.alpha(1)
  }
}

/** A potted plant growing from (x, soilY). life: 0 droopy → 1 perky; bloom 0..1. */
export function drawPlant(g: Surface, kind: PlantKind, x: number, soilY: number, life: number, bloom: number, t: number, seed: number) {
  const leaf = mixHex('#b8b060', '#5eae55', life)
  const leafD = mixHex('#8a8440', '#3f8a4f', life)
  const stems = kind === 'sunflower' ? 1 : kind === 'orchid' ? 2 : 3
  const fc = PLANT_FLOWER[kind]
  const tall = kind === 'sunflower' ? 30 : kind === 'orchid' ? 22 : 18
  for (let i = 0; i < stems; i++) {
    const f = stems === 1 ? 0 : i / (stems - 1) - 0.5
    const sway = Math.sin(t * 1.6 + seed + i) * 0.8 * life
    const hgt = tall * (0.75 + life * 0.25) * (1 - Math.abs(f) * 0.25)
    const droop = (1 - life) * (f < 0 ? -1 : 1) * 9
    const tx = x + f * 10 + droop + sway
    const ty = soilY - hgt + (1 - life) * hgt * 0.35
    const mx = x + f * 4
    const my = soilY - hgt * 0.55
    inkLine(g, x + f * 2, soilY, mx, my, 1, leafD)
    inkLine(g, mx, my, tx, ty, 1, leafD)
    // Leaves along the stem.
    for (const k of [0.35, 0.65]) {
      const lx = x + (tx - x) * k
      const ly = soilY + (ty - soilY) * k
      const side = (i + (k > 0.5 ? 1 : 0)) % 2 ? 1 : -1
      const lw = kind === 'orchid' ? 5 : 3.5
      const lyy = ly + (1 - life) * 2
      g.ellipse(lx + side * lw, lyy, lw + 1, 2.4, INK)
      g.ellipse(lx + side * lw, lyy, lw, 1.5, leaf)
      g.px(lx + side * (lw - 1), lyy - 1, mixHex(leaf, '#ffffff', 0.35))
    }
    // Flower (or a closed bud).
    if (bloom <= 0.05) {
      g.ellipse(tx, ty, 2.2, 2.6, INK)
      g.ellipse(tx, ty, 1.3, 1.7, life > 0.5 ? leaf : leafD)
      if (life > 0.6) g.px(tx, ty - 1, fc.a)
      continue
    }
    const r = (kind === 'sunflower' ? 6 : kind === 'jasmine' ? 2.8 : 3.8) * Math.min(1, bloom * 1.3)
    if (kind === 'sunflower') {
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2 + t * 0.2
        g.circle(tx + Math.cos(a) * r, ty + Math.sin(a) * r, 2.4, INK)
      }
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2 + t * 0.2
        g.circle(tx + Math.cos(a) * r, ty + Math.sin(a) * r, 1.6, p % 2 ? fc.a : fc.b)
      }
      g.circle(tx, ty, r * 0.6 + 1, INK)
      g.circle(tx, ty, r * 0.6, fc.c)
      g.px(tx - 1, ty - 1, '#a8703a')
      // A happy face on the sunflower.
      if (bloom > 0.9) {
        g.px(tx - 1, ty - 1, INK)
        g.px(tx + 1, ty - 1, INK)
        g.px(tx, ty + 1, INK)
      }
      continue
    }
    const petals = kind === 'jasmine' ? 5 : 6
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2 + seed
      g.circle(tx + Math.cos(a) * r * 0.6, ty + Math.sin(a) * r * 0.6, r * 0.55 + 1, INK)
    }
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2 + seed
      g.circle(tx + Math.cos(a) * r * 0.6, ty + Math.sin(a) * r * 0.6, r * 0.55, p % 2 ? fc.a : fc.b)
    }
    g.circle(tx, ty, Math.max(0.8, r * 0.3), fc.c)
    g.px(tx - 1, ty - 1, '#ffffff')
  }
}

/** Water gauge beside a pot: fill level and the green target band. */
export function drawGauge(g: Surface, x: number, y: number, hgt: number, level: number, lo: number, hi: number, state: 'dry' | 'good' | 'over', t: number) {
  g.rect(x - 1, y - 1, 6, hgt + 2, INK)
  g.rect(x, y, 4, hgt, '#fff1d6')
  const band0 = Math.round(y + hgt * (1 - hi))
  const band1 = Math.round(y + hgt * (1 - lo))
  g.rect(x, band0, 4, band1 - band0, state === 'good' && Math.sin(t * 8) > 0 ? '#d8f8b0' : '#9ed86a')
  const f = Math.round(hgt * Math.min(1, level))
  g.rect(x + 1, y + hgt - f, 2, f, state === 'over' ? '#e8514a' : '#47a6cb')
  if (f > 0) g.px(x + 1, y + hgt - f, '#b3eef4')
  g.rect(x - 2, band0 - 1, 1, band1 - band0 + 2, '#2f6f4b')
  g.rect(x + 5, band0 - 1, 1, band1 - band0 + 2, '#2f6f4b')
  g.px(x - 2, band0, INK)
  g.px(x + 5, band0, INK)
}

/** Green watering can; the spout tip is at (x, y). tilt 0..1 pours. */
export function drawWateringCan(g: Surface, x: number, y: number, tilt: number) {
  const a = -0.15 - tilt * 0.55
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  // Local frame: spout tip at origin, body to the right and below.
  const P2 = (u: number, v: number): [number, number] => [x + u * ca - v * sa, y + u * sa + v * ca]
  const poly = (pts: [number, number][], c: Color) => g.poly(pts.map(([u, v]) => P2(u, v)), c)
  // Spout.
  const s0 = P2(0, 0)
  const s1 = P2(14, 8)
  g.thickLine(s0[0], s0[1], s1[0], s1[1], 4, INK)
  g.thickLine(s0[0], s0[1], s1[0], s1[1], 2, '#4f9e4c')
  const rose = P2(-1, -0.5)
  g.circle(rose[0], rose[1], 2.6, INK)
  g.circle(rose[0], rose[1], 1.7, '#86c95f')
  // Body.
  poly(
    [
      [12, 3],
      [30, 3],
      [31, 17],
      [11, 17],
    ],
    INK,
  )
  poly(
    [
      [13, 4],
      [29, 4],
      [30, 16],
      [12, 16],
    ],
    '#5ea653',
  )
  poly(
    [
      [14, 5],
      [18, 5],
      [18, 15],
      [13, 15],
    ],
    '#86c95f',
  )
  poly(
    [
      [26, 5],
      [29, 5],
      [29, 16],
      [26, 16],
    ],
    '#43905a',
  )
  // Handle.
  const h0 = P2(16, 3)
  const h1 = P2(21, -4)
  const h2 = P2(27, 3)
  g.thickLine(h0[0], h0[1], h1[0], h1[1], 4, INK)
  g.thickLine(h1[0], h1[1], h2[0], h2[1], 4, INK)
  g.thickLine(h0[0], h0[1], h1[0], h1[1], 2, '#4f9e4c')
  g.thickLine(h1[0], h1[1], h2[0], h2[1], 2, '#4f9e4c')
  const back = P2(31, 6)
  const back2 = P2(35, 12)
  g.thickLine(back[0], back[1], back2[0], back2[1], 4, INK)
  g.thickLine(back[0], back[1], back2[0], back2[1], 2, '#4f9e4c')
}

const BFLY: Color[] = ['#ffd23f', '#ff9fc0', '#9fd0ff', '#ffb347', '#e2d2ff']

/** A little butterfly with flapping wings. */
export function drawButterfly(g: Surface, x: number, y: number, t: number, color: number) {
  const c = BFLY[color % BFLY.length]
  const d = mixHex(c, '#3a2838', 0.3)
  const l = mixHex(c, '#ffffff', 0.5)
  const open = Math.sin(t * 20) > -0.2
  x = Math.round(x)
  y = Math.round(y)
  if (open) {
    for (const s of [-1, 1]) {
      g.ellipse(x + s * 3.5, y - 2, 3.4, 3, INK)
      g.ellipse(x + s * 3, y + 2, 2.4, 2.2, INK)
      g.ellipse(x + s * 3.5, y - 2, 2.4, 2, c)
      g.ellipse(x + s * 3, y + 2, 1.5, 1.3, d)
      g.px(x + s * 4, y - 3, l)
    }
  } else {
    for (const s of [-1, 1]) {
      g.ellipse(x + s * 1.5, y - 3, 1.8, 3.2, INK)
      g.ellipse(x + s * 1.5, y - 3, 0.9, 2.2, c)
    }
  }
  g.vline(x, y - 3, y + 3, INK)
  g.px(x - 1, y - 5, INK)
  g.px(x + 1, y - 5, INK)
}

// ---------------------------------------------------------------------------
// ขัดทองเหลือง – brass bowl, bell and tray, sculpted twice: dull and gleaming

type Prim = SculptOpts['prims'][number]
const pE = (x: number, y: number, z: number, rx: number, ry: number, rz: number, part: number, m = 0, minY?: number, maxY?: number): Prim => ({ t: 0, x, y, z, rx, ry, rz, part, m, minY, maxY }) as Prim
const pC = (a: [number, number, number], b: [number, number, number], ra: number, rb: number, part: number, m = 0): Prim =>
  ({ t: 1, ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], ra, rb, part, zk: 1, m }) as Prim

export type BrassKind = 'bowl' | 'bell' | 'tray'
export const BRASS_KINDS: BrassKind[] = ['bowl', 'bell', 'tray']
export const BRASS_NAMES: Record<BrassKind, string> = { bowl: 'ขันทองเหลือง', bell: 'ระฆังทองเหลือง', tray: 'พานทองเหลือง' }

const BRASS_BRIGHT = ['#3a1e0e', '#5e3414', '#8a531c', '#b27a26', '#d49d34', '#ebbd48', '#f7d866', '#fff09a', '#fffbe0'] as const
const BRASS_BRIGHT_IN = ['#3a1e0e', '#4a2a10', '#6a4016', '#8a5a1e', '#a87428', '#c89032', '#dca840', '#ecc050', '#f8d870'] as const
const BRASS_DULL = ['#2e2216', '#3a2c1c', '#4a3a24', '#5a482c', '#685432', '#745e38', '#7e683e', '#887044', '#927a4a'] as const
const BRASS_DULL_IN = ['#2e2216', '#30241a', '#3a2c1e', '#443422', '#4e3c26', '#58442a', '#604a2e', '#685032', '#705636'] as const
const PATINA = ['#2e2a1c', '#34402c', '#3e4e36', '#4a5c40', '#566a48', '#607650', '#6a8058', '#748a60', '#7e9468'] as const

function brassPrims(kind: BrassKind): { prims: Prim[]; x0: number; x1: number; y0: number; y1: number } {
  if (kind === 'bowl')
    return {
      prims: [
        pE(0, 22, 0, 36, 22, 36, 0, 0, 3, 30),
        pE(0, 3, 0, 20, 3.2, 20, 1),
        pE(0, 30, 0, 35, 3.4, 35, 2),
        pE(0, 31, 34, 30.5, 2.6, 2, 3, 1),
      ],
      x0: -38,
      x1: 38,
      y0: -1,
      y1: 35,
    }
  if (kind === 'bell')
    return {
      prims: [
        pC([0, 12, 0], [0, 42, 0], 23, 15, 0),
        pE(0, 11, 0, 27, 5.5, 27, 1),
        pE(0, 44, 0, 16, 9, 16, 2),
        pC([0, 50, 0], [0, 58, 0], 3.4, 3.4, 3),
        pE(0, 59, 0, 7, 4, 4, 3),
        pE(0, 4, 8, 4.5, 5, 4.5, 4, 1),
      ],
      x0: -29,
      x1: 29,
      y0: -2,
      y1: 64,
    }
  return {
    prims: [
      pE(0, 4, 0, 22, 4, 22, 0),
      pC([0, 6, 0], [0, 13, 0], 15, 8, 1),
      pE(0, 16, 0, 11, 4.5, 11, 2),
      pC([0, 19, 0], [0, 26, 0], 6, 11, 3),
      pE(0, 31, 0, 44, 8, 44, 4, 0, 23, 33),
      pE(0, 33.5, 0, 43, 3.2, 43, 5),
      pE(0, 34, 42, 38, 2.2, 2, 6, 1),
    ],
    x0: -46,
    x1: 46,
    y0: -1,
    y1: 38,
  }
}

function brassDetail(kind: BrassKind, dull: boolean) {
  return (d: import('./hall').SculptDetail) => {
    // Engraved bands and a row of lotus-petal dots.
    const bands = kind === 'bowl' ? [14, 22] : kind === 'bell' ? [20, 30, 38] : [29]
    for (const y of bands) d.curve(-44, 44, () => y, -2)
    const dotY = kind === 'bowl' ? 18 : kind === 'bell' ? 25 : 31
    for (let x = -40; x <= 40; x += 6) {
      const [i, j] = d.px(x, dotY)
      if (d.solid(i, j) && d.part(i, j) === 0) {
        d.add(i, j, 2)
        d.add(i, j + 1, -2)
      }
    }
    if (!dull) return
    // Tarnish: blotches of green patina and dark stains.
    d.each((i, j) => {
      const n = Math.sin(i * 0.37 + j * 0.21) + Math.sin(i * 0.13 - j * 0.41 + 2) + Math.cos((i + j) * 0.29)
      const r = hash(i, j, 7)
      if (n > 1.2 && r > 0.25) d.paint(i, j, 2, Math.max(1, d.tone(i, j) - 1))
      else if (n < -1.6 && r > 0.4) d.add(i, j, -2)
      else if (r < 0.04) d.add(i, j, -3)
    })
  }
}

/** Canvases of a brass vessel: tarnished and polished (same size and origin). */
export function brassSculpts(kind: BrassKind, s: number): { dull: HTMLCanvasElement; bright: HTMLCanvasElement; ox: number; oy: number } {
  const key = `${kind}:${s}`
  let r = brassCache.get(key)
  if (!r) {
    const b = brassPrims(kind)
    const common = { prims: b.prims, s, x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1 }
    const dull = sculpt({ ...common, ramps: [BRASS_DULL, BRASS_DULL_IN, PATINA], outline: INK, spec: [5, 0.12], rim: 0.12, ambient: 0.1, detail: brassDetail(kind, true) })
    const bright = sculpt({ ...common, ramps: [BRASS_BRIGHT, BRASS_BRIGHT_IN], outline: INK, spec: [10, 0.95], rim: 0.35, ambient: 0.1, detail: brassDetail(kind, false) })
    r = { dull: dull.canvas, bright: bright.canvas, ox: dull.ox, oy: dull.oy }
    brassCache.set(key, r)
  }
  return r
}
const brassCache = new Map<string, { dull: HTMLCanvasElement; bright: HTMLCanvasElement; ox: number; oy: number }>()

/** Teak table with a red runner in front of a dark red wall (baked). */
export function bakeBrassTable(w: number, h: number, tableY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.gradientV(0, 0, w, tableY, ['#3a1a24', '#5e2234', '#7e2a3c'], 8)
    for (let y = 8; y < tableY - 8; y += 16)
      for (let x = ((y / 16) | 0) % 2 ? 8 : 0; x < w; x += 16) {
        g.px(x, y, '#9a6a2a')
        g.rect(x - 1, y + 1, 3, 1, '#7a4e22')
        g.px(x, y + 2, '#9a6a2a')
      }
    // Window light.
    for (let y = 0; y < tableY; y++)
      for (let x = 0; x < w; x++) {
        const b = (x - y * 0.5 + 40) % 120
        if (b > 0 && b < 30 && ditherOn(x, y, 0.08)) g.px(x, y, '#a04a50')
      }
    // Table top.
    g.rect(0, tableY - 1, w, 1, INK)
    g.rect(0, tableY, w, h - tableY, '#8a5a32')
    for (let y = tableY + 2; y < h; y += 3) {
      g.hline(0, w, y, hash(y, 3) > 0.5 ? '#9a6a3a' : '#7a4e2c')
      for (let x = (y * 13) % 29; x < w; x += 29) g.hline(x, x + 6, y, '#a8784a')
    }
    g.hline(0, w, tableY, '#c28e5c')
    // Red runner with gold edges.
    const rx = Math.round(w * 0.12)
    g.rect(rx - 1, tableY, w - rx * 2 + 2, h - tableY, INK)
    g.rect(rx, tableY, w - rx * 2, h - tableY, '#b8343f')
    g.rect(rx + 3, tableY, 2, h - tableY, P.gold)
    g.rect(w - rx - 5, tableY, 2, h - tableY, P.gold)
    for (let y = tableY + 6; y < h; y += 10)
      for (let x = rx + 10; x < w - rx - 10; x += 12) {
        g.px(x, y, '#e8646a')
        g.px(x + 1, y + 1, '#e8646a')
      }
  })
}

/** Red polishing rag with a dab of cream, crumpled in the hand. */
export function drawRag(g: Surface, x: number, y: number, t: number, rub: number, color: Color = '#e8514a') {
  const wig = Math.sin(t * 30) * rub
  const pts: [number, number, number][] = [
    [-5, -1, 5],
    [4, -2, 5],
    [0, 4, 5],
    [-6 + wig, 5, 4],
    [6, 4 - wig, 4],
  ]
  for (const [ox, oy, r] of pts) g.circle(x + ox, y + oy, r + 1, INK)
  for (const [ox, oy, r] of pts) g.circle(x + ox, y + oy, r, color)
  const l = mixHex(color, '#ffffff', 0.35)
  g.circle(x - 2, y - 2, 2, l)
  g.line(x - 3, y + 1, x + 2, y + 3, mixHex(color, '#3a2838', 0.3))
  g.px(x + 3, y - 3, '#ffffff')
}

// ---------------------------------------------------------------------------
// เช็ดองค์พระ – wall shrine shelf (หิ้งพระ), dust layers and a soft cloth

/** Teak wall with a tiered, gilded shrine shelf; returns the shelf's top y. */
export function bakeShrineShelf(w: number, h: number, shelfY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    g.rect(0, 0, w, h, '#6e4a35')
    for (let x = 0; x < w; x += 11) {
      g.vline(x, 0, h, '#5a3a28')
      g.vline(x + 1, 0, h, '#86583e')
    }
    // Back panel of the shelf in red lacquer with gold.
    const x0 = 8
    const x1 = w - 8
    const top = shelfY - 82
    g.rect(x0 - 1, top - 1, x1 - x0 + 2, shelfY - top + 2, INK)
    g.rect(x0, top, x1 - x0, shelfY - top, '#7e2436')
    g.frame(x0 + 3, top + 3, x1 - x0 - 6, shelfY - top - 6, P.goldD)
    for (let y = top + 10; y < shelfY - 6; y += 12)
      for (let x = x0 + 10 + (((y / 12) | 0) % 2) * 6; x < x1 - 8; x += 12) {
        g.px(x, y, '#a8484e')
        g.px(x - 1, y + 1, '#a8484e')
        g.px(x + 1, y + 1, '#a8484e')
      }
    // Pointed gilded crest.
    const cx = Math.round(w / 2)
    g.poly(
      [
        [x0 - 2, top],
        [cx, top - 16],
        [x1 + 2, top],
      ],
      INK,
    )
    g.poly(
      [
        [x0, top - 1],
        [cx, top - 14],
        [x1, top - 1],
      ],
      P.goldD,
    )
    g.poly(
      [
        [x0 + 12, top - 1],
        [cx, top - 10],
        [x1 - 12, top - 1],
      ],
      '#b8343f',
    )
    g.circle(cx, top - 5, 2, P.gold)
    // Shelf board and skirt.
    g.rect(x0 - 5, shelfY - 1, x1 - x0 + 10, 7, INK)
    g.rect(x0 - 4, shelfY, x1 - x0 + 8, 5, P.goldD)
    g.hline(x0 - 4, x1 + 3, shelfY, P.gold)
    g.rect(x0, shelfY + 6, x1 - x0, 14, '#8e2a3c')
    for (let x = x0 + 4; x < x1 - 4; x += 10) {
      g.poly(
        [
          [x, shelfY + 6],
          [x + 5, shelfY + 16],
          [x + 10, shelfY + 6],
        ],
        P.goldDD,
      )
    }
    g.rect(x0, shelfY + 20, x1 - x0, 2, 'rgba(30,15,10,0.4)')
    // Vases of flowers at the ends.
    for (const vx of [x0 + 8, x1 - 8]) {
      g.rect(vx - 3, shelfY - 9, 7, 9, INK)
      g.rect(vx - 2, shelfY - 8, 5, 8, P.gold)
      g.px(vx - 1, shelfY - 7, P.goldL)
      for (const [fx, fy, c] of [
        [-3, -15, '#fffaf0'],
        [2, -17, '#ffd23f'],
        [0, -13, '#fffaf0'],
      ] as [number, number, string][]) {
        g.circle(vx + fx, shelfY + fy, 2.4, INK)
        g.circle(vx + fx, shelfY + fy, 1.6, c)
      }
    }
  })
}

/** Dust film for a statue: speckled grey over the statue's silhouette. */
export function makeDust(src: HTMLCanvasElement, seed: number): HTMLCanvasElement {
  const w = src.width
  const h = src.height
  const out = createCanvas(w, h)
  const sd = src.getContext('2d')!.getImageData(0, 0, w, h).data
  const oc = out.getContext('2d')!
  const img = oc.createImageData(w, h)
  const od = img.data
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (sd[i + 3] === 0) continue
      const n = hash(x, y, seed)
      // Heavier dust on upper surfaces.
      const top = y < h * 0.5 ? 1 : 0.85
      const c = n < 0.12 ? [150, 138, 122] : n > 0.9 ? [220, 212, 196] : [192, 182, 166]
      od[i] = c[0]
      od[i + 1] = c[1]
      od[i + 2] = c[2]
      od[i + 3] = Math.round(255 * (0.78 + n * 0.2) * top)
    }
  oc.putImageData(img, 0, 0)
  // A few cobweb threads.
  oc.strokeStyle = 'rgba(245,240,230,0.8)'
  oc.lineWidth = 1
  for (let k = 0; k < 2; k++) {
    const x = Math.round(w * (0.25 + hash(seed, k) * 0.5))
    oc.beginPath()
    oc.moveTo(x + 0.5, 0)
    oc.lineTo(x + 6.5, 10)
    oc.moveTo(x + 0.5, 0)
    oc.lineTo(x - 5.5, 12)
    oc.stroke()
  }
  return out
}

// ---------------------------------------------------------------------------
// Shared: a cute tourist look set for NPCs that wander through jobs.

export const TOURIST_LOOKS: AvatarLook[] = [
  { gender: 'm', skin: 0, face: 1, hairColor: 3, hair: 'hair_short', top: 'top_hawaii_elephant', bottom: 'bot_songkran_shorts', head: 'head_sunhat', neck: null, hand: 'hand_selfie', shoes: null, back: 'back_thaibag' },
  { gender: 'f', skin: 1, face: 2, hairColor: 4, hair: 'hair_twin', top: 'top_retro_floral', bottom: 'bot_batik', head: 'head_heartshades', neck: null, hand: 'hand_bubbletea', shoes: null, back: null },
  { gender: 'm', skin: 2, face: 0, hairColor: 0, hair: 'hair_twoblock', top: 'top_tee_hiw', bottom: 'bot_track', head: null, neck: 'neck_lanyard', hand: 'hand_phone', shoes: null, back: 'back_schoolbag' },
  { gender: 'f', skin: 0, face: 3, hairColor: 2, hair: 'hair_ponytail', top: 'top_tank', bottom: 'bot_songkran_shorts', head: 'head_sunhat', neck: null, hand: 'hand_fan', shoes: null, back: null },
]

// Re-export for scenes that paint into their own buffers.
export { createCanvas, mixHex, sculpt }
export type { SculptOpts }
