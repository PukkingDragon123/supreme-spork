// วัดร่องขุ่น (the White Temple), Chiang Rai – dazzling white ubosot with
// mirror mosaic, the bridge over the pit of reaching hands, cute guardians,
// the tree of hanging (pop-culture) heads, silver wishing plates, the famous
// golden building (the golden restrooms!), wishing well and the art shop.

import type { Color, Surface } from '../../engine/pixel'
import { P } from '../palette'
import { mixHex } from '../characters'
import { GOLD, slice, type Ramp } from '../temple'
import { bld, block, GOLDR, hsh, stallProp, type Built, type Pt } from './northisan'

export const WHT = { L: '#ffffff', b: '#f4f8ff', d: '#dfe8f8', D: '#b8c8e8', DD: '#8ea4d0', M: '#9fd0ff', M2: '#c8e4ff' }
const WR: Ramp = { L: WHT.L, b: WHT.b, d: WHT.d, D: WHT.D }

function mirror(g: Surface, x: number, y: number, seed: number) {
  const v = hsh(x, y, seed) % 11
  if (v === 0) g.px(x, y, WHT.M)
  else if (v === 3) g.px(x, y, WHT.M2)
  else if (v === 6) g.px(x, y, '#ffffff')
}

/** White gable: mosaic field, spiky white barge boards, chofa and curls. */
function whiteGable(g: Surface, cx: number, apex: number, hw: number, base: number, glints: Pt[], deep = false) {
  const h = base - apex
  for (let y = apex; y < base; y++) {
    const half = ((y - apex) / h) * hw
    g.hline(Math.round(cx - half), Math.round(cx + half), y, deep ? WHT.d : WHT.b)
    for (let x = Math.round(cx - half) + 2; x < cx + half - 1; x++) mirror(g, x, y, 3)
    // Inner frame.
    const inner = half - 4
    if (inner > 2 && y > apex + 5) {
      g.px(Math.round(cx - inner), y, WHT.D)
      g.px(Math.round(cx + inner), y, WHT.D)
    }
  }
  // Central motif: a white lotus / mandala medallion with blue glass.
  const my = Math.round(apex + h * 0.58)
  const r = Math.max(3, Math.round(hw * 0.16))
  g.circle(cx, my, r + 1, WHT.D)
  g.circle(cx, my, r, WHT.L)
  g.circle(cx, my, r - 1.5, WHT.M2)
  g.px(cx, my, WHT.M)
  for (let a = 0; a < 8; a++) g.px(Math.round(cx + Math.cos(a) * (r + 2)), Math.round(my + Math.sin(a) * (r + 2)), WHT.M)
  // Base frame.
  g.hline(Math.round(cx - hw) + 1, Math.round(cx + hw) - 1, base - 1, WHT.D)
  g.hline(Math.round(cx - hw) + 1, Math.round(cx + hw) - 1, base, WHT.DD)
  // Barge boards with spiky ใบระกา.
  for (const s of [-1, 1]) {
    const n = Math.round(hw)
    for (let i = 0; i <= n; i++) {
      const x = cx + s * i
      const y = Math.round(apex + (i / hw) * h)
      g.px(x, y - 1, WHT.L)
      g.px(x, y, WHT.b)
      g.px(x, y + 1, WHT.D)
      g.px(x, y + 2, WHT.DD)
      if (i > 2 && i < n - 2 && i % 3 === 0) {
        // Flame spikes pointing up and out.
        g.px(x, y - 2, WHT.b)
        g.px(x + s, y - 3, WHT.L)
        g.px(x + s, y - 4, WHT.M2)
      }
    }
    // Hang hong curl.
    const ex = cx + s * (hw + 1)
    g.px(ex, base, WHT.b)
    g.px(ex + s, base - 1, WHT.b)
    g.px(ex + s, base - 2, WHT.L)
    g.px(ex, base - 3, WHT.M2)
    g.px(ex + s * 2, base - 1, WHT.D)
    glints.push({ x: ex + s, y: base - 3 })
  }
  // Chofa spike at the apex.
  for (let k = 0; k < Math.max(5, Math.round(h * 0.22)); k++) g.px(cx, apex - 1 - k, k % 2 ? WHT.L : WHT.b)
  g.px(cx + 1, apex - Math.max(5, Math.round(h * 0.22)), WHT.M2)
  glints.push({ x: cx, y: apex - Math.max(5, Math.round(h * 0.22)) })
}

/** White roof wing (sloped band of white tiles with mirror sparkles). */
function whiteWing(g: Surface, ax: number, ay: number, bx: number, by: number, depth: number) {
  const dir = bx > ax ? 1 : -1
  const n = Math.abs(bx - ax)
  for (let i = 0; i <= n; i++) {
    const x = ax + i * dir
    const yb = Math.round(ay + ((by - ay) * i) / n)
    for (let k = 0; k < depth; k++) {
      const c = k === 0 ? WHT.DD : k === 1 ? WHT.D : k % 3 === 0 ? WHT.d : WHT.b
      g.px(x, yb - k, c)
      if (k > 1) mirror(g, x, yb - k, 5)
    }
    g.px(x, yb - depth, WHT.L)
    if (i % 3 === 0 && i > 1 && i < n - 1) {
      g.px(x, yb - depth - 1, WHT.b)
      g.px(x + dir, yb - depth - 2, WHT.L)
    }
  }
  // Curling tip.
  g.px(bx + dir, by - 1, WHT.b)
  g.px(bx + dir, by - 2, WHT.L)
  g.px(bx, by - 3, WHT.M2)
}

/** A white serpent riding a roof edge, head curling up at (bx, by). */
function nagaEdge(g: Surface, ax: number, ay: number, bx: number, by: number, dir: number) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = ax + (bx - ax) * t
    const y = ay + (by - ay) * t - 2
    g.circle(x, y, 1.6, WHT.D)
    g.px(Math.round(x), Math.round(y) - 1, WHT.L)
    if (i % 4 === 0) {
      g.px(Math.round(x), Math.round(y) - 3, WHT.b)
      g.px(Math.round(x + dir), Math.round(y) - 4, WHT.M2)
    }
  }
  // Head rearing up at the eave end.
  g.rect(Math.round(bx) + (dir > 0 ? 0 : -3), Math.round(by) - 8, 4, 6, WHT.b)
  g.px(Math.round(bx) + dir * 2, Math.round(by) - 7, '#4a6ab0')
  for (let k = 0; k < 4; k++) g.px(Math.round(bx) + (dir > 0 ? k : -k), Math.round(by) - 9 - (k % 2), WHT.M2)
  g.px(Math.round(bx) + dir * 4, Math.round(by) - 5, WHT.L)
}

/** Pale blue shadow band under an eave. */
function underEave(g: Surface, ax: number, ay: number, bx: number, by: number, depth = 3) {
  const dir = bx > ax ? 1 : -1
  const n = Math.abs(bx - ax)
  for (let i = 0; i <= n; i++) {
    const x = ax + i * dir
    const y = Math.round(ay + ((by - ay) * i) / n)
    for (let k = 1; k <= depth; k++) g.px(x, y + k, k === 1 ? WHT.DD : '#c8d4ec')
  }
}

/**
 * The White Temple ubosot, 200×214. Anchor = foot of the front stairs.
 * Hooks: glints (many), door, windows.
 */
export function whiteUbosotSprite(night = false): Built {
  const W = 200
  const H = 216
  return bld(`rk:ubosot:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    const floor = H - 14
    // Platform with mirror bands.
    block(g, 8, floor, W - 16, 14, 3, WR)
    for (let x = 10; x < W - 10; x++) mirror(g, x, floor + 7, 1)
    g.hline(9, W - 10, floor + 10, WHT.D)
    // Roof mass behind everything (fills between the stacked wings).
    g.poly([[cx - 30, 52], [cx + 30, 52], [cx + 90, 134], [cx + 96, 150], [cx - 96, 150], [cx - 90, 134]], WHT.d)
    for (let y = 52; y < 150; y++) {
      const half = Math.min(94, 28 + (y - 52) * (66 / 82))
      for (let x = Math.round(cx - half) + 1; x < cx + half - 1; x++) if ((x * 5 + y * 3) % 13 === 0) mirror(g, x, y, 11)
    }
    // Top gable (furthest back, highest).
    whiteGable(g, cx, 22, 38, 80, glints, true)
    // Roof wings either side, two stacked layers, with shadowed undersides.
    for (const s of [-1, 1]) {
      underEave(g, cx + s * 26, 60, cx + s * 82, 116, 4)
      whiteWing(g, cx + s * 26, 60, cx + s * 82, 116, 16)
      nagaEdge(g, cx + s * 30, 44, cx + s * 82, 100, s)
      underEave(g, cx + s * 52, 108, cx + s * 97, 150, 4)
      whiteWing(g, cx + s * 52, 108, cx + s * 97, 150, 14)
      nagaEdge(g, cx + s * 56, 94, cx + s * 97, 136, s)
      glints.push({ x: cx + s * 84, y: 92 }, { x: cx + s * 99, y: 128 })
    }
    // Main gable.
    underEave(g, cx - 68, 128, cx + 68, 128, 3)
    whiteGable(g, cx, 52, 68, 128, glints)
    for (const s of [-1, 1]) nagaEdge(g, cx, 50, cx + s * 70, 126, s)
    // Walls.
    const wt = 130
    g.rect(22, wt, W - 44, floor - wt, WHT.b)
    g.rect(22, wt, W - 44, 2, WHT.D)
    g.rect(W - 36, wt, 14, floor - wt, WHT.d)
    for (let y = wt + 2; y < floor; y++) for (let x = 22; x < W - 22; x++) if ((x + y) % 9 === 0) mirror(g, x, y, 7)
    // Arched windows with blue glass.
    for (const wx of [34, 56, W - 66, W - 44]) {
      g.rect(wx - 1, wt + 16, 12, 30, WHT.D)
      if (night) g.rect(wx, wt + 17, 10, 29, '#ffe7a8')
      else {
        g.rect(wx, wt + 17, 10, 29, '#6a8ad0')
        g.rect(wx + 1, wt + 18, 3, 26, '#9fd0ff')
      }
      for (let i = 0; i < 6; i++) g.hline(wx + i, wx + 9 - i, wt + 16 - i, i % 2 ? WHT.L : WHT.D)
      g.px(wx + 5, wt + 9, WHT.M)
      glints.push({ x: wx + 5, y: wt + 9 })
    }
    // Pilasters with spiky finials.
    for (const px of [26, 48, 72, W - 76, W - 52, W - 30]) {
      g.rect(px, wt + 4, 4, floor - wt - 4, WHT.L)
      g.vline(px + 3, wt + 4, floor, WHT.D)
      for (let y = wt + 8; y < floor - 4; y += 5) g.px(px + 1, y, WHT.M)
    }
    // Front porch: gable, columns and the arched door.
    const pt = 98
    for (const s of [-1, 1]) {
      g.rect(cx + s * 26 - 3, pt + 34, 6, floor - pt - 34, WHT.L)
      g.vline(cx + s * 26 + 2, pt + 34, floor, WHT.D)
      for (let y = pt + 38; y < floor - 2; y += 4) g.px(cx + s * 26, y, WHT.M)
      // Column capital flames.
      g.rect(cx + s * 26 - 4, pt + 32, 8, 3, WHT.b)
      g.px(cx + s * 26, pt + 30, WHT.L)
    }
    whiteGable(g, cx, pt, 34, pt + 34, glints)
    // Door.
    const dw = 22
    for (let y = pt + 40; y < floor; y++) {
      const t = Math.min(1, (y - (pt + 40)) / 10)
      const half = (dw / 2) * Math.sqrt(t)
      g.hline(Math.round(cx - half) - 2, Math.round(cx + half) + 1, y, WHT.D)
      if (half > 1) g.hline(Math.round(cx - half), Math.round(cx + half) - 1, y, night ? '#ffcf7a' : '#e8e4f0')
    }
    if (!night) {
      g.vline(cx, pt + 44, floor, WHT.D)
      for (let y = pt + 48; y < floor - 2; y += 4) {
        g.px(cx - 5, y, WHT.M)
        g.px(cx + 4, y, WHT.M)
      }
    }
    g.px(cx, pt + 37, WHT.M)
    // Front stairs with white nagas.
    for (let i = 0; i < 5; i++) g.rect(cx - 14 - i, floor + 2 + i * 2, 28 + i * 2, 2, i % 2 ? WHT.d : WHT.L)
    for (const s of [-1, 1]) {
      const nx = cx + s * 20
      for (let k = 0; k < 12; k++) g.rect(nx - 2 + Math.round(Math.sin(k * 0.7) * s), floor + 1 + k, 4, 1, k % 2 ? WHT.b : WHT.L)
      g.rect(nx - 3, floor - 5, 6, 5, WHT.b)
      g.px(nx + s * 2, floor - 3, '#6a8ad0')
      for (let k = 0; k < 4; k++) g.px(nx - 2 + k, floor - 6 - (k % 2), WHT.M2)
    }
    hooks.glints = glints
    hooks.door = [{ x: cx, y: floor - 10 }]
    hooks.windows = [{ x: 39, y: wt + 30 }, { x: 61, y: wt + 30 }, { x: W - 61, y: wt + 30 }, { x: W - 39, y: wt + 30 }]
  })
}

/** Gate of Heaven: a small white arch with two guardians. 60×56. */
export function heavenGateSprite(): Built {
  const W = 64
  const H = 58
  return bld('rk:heavengate', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 4 : W - 18
      block(g, x0, 20, 14, H - 20, 0, WR)
      for (let y = 24; y < H - 2; y++) for (let x = x0 + 1; x < x0 + 13; x++) if ((x * 3 + y) % 7 === 0) mirror(g, x, y, 9)
      // Spiky finial tower.
      for (let i = 0; i < 8; i++) slice(g, x0 + 7, 20 - i * 2, 6 - i * 0.7, WR, 0.4)
      g.px(x0 + 7, 2, WHT.M)
      glints.push({ x: x0 + 7, y: 2 })
    }
    // Arch beam.
    g.rect(16, 18, W - 32, 8, WHT.b)
    g.hline(16, W - 17, 18, WHT.L)
    for (let x = 18; x < W - 18; x += 3) g.px(x, 22, WHT.M)
    for (let i = 0; i < 8; i++) g.hline(cx - 12 + i, cx + 11 - i, 17 - i, i % 2 ? WHT.L : WHT.d)
    g.px(cx, 9, WHT.M)
    glints.push({ x: cx, y: 9 })
    // Kinnaree guardians on the pillars.
    for (const s of [-1, 1]) {
      const gx = cx + s * 20
      g.rect(gx - 2, 30, 4, 8, WHT.L)
      g.circle(gx, 28, 2.5, WHT.L)
      g.px(gx + s, 28, WHT.DD)
      g.line(gx + s * 2, 32, gx + s * 6, 27, WHT.b)
      g.line(gx + s * 2, 33, gx + s * 7, 30, WHT.d)
    }
    hooks.glints = glints
  })
}

/** Cute white guardian of the bridge (two variants). 36×52. */
export function guardianSprite(v: 0 | 1): Built {
  const W = 38
  const H = 54
  return bld(`rk:guard:${v}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    block(g, 4, H - 7, W - 8, 7, 2, WR)
    const S = { L: '#ffffff', b: '#eef2fa', d: '#d0dcf0', D: '#a8b8d8' }
    const b = H - 7
    // Legs and body.
    g.rect(cx - 8, b - 12, 6, 12, S.b)
    g.rect(cx + 2, b - 12, 6, 12, S.d)
    g.ellipse(cx, b - 20, 11, 10, S.d)
    g.ellipse(cx - 1, b - 21, 10, 9, S.b)
    // Belt with mirror jewels.
    g.hline(cx - 10, cx + 9, b - 14, S.D)
    for (let x = cx - 8; x < cx + 8; x += 3) g.px(x, b - 14, WHT.M)
    // Head: big round cute face with little fangs.
    g.circle(cx, b - 34, 9, S.d)
    g.circle(cx - 0.5, b - 34.5, 8.5, S.b)
    g.px(cx - 4, b - 36, P.ink)
    g.px(cx + 3, b - 36, P.ink)
    g.px(cx - 4, b - 37, '#ffffff')
    g.px(cx - 5, b - 34, '#ffb8c8')
    g.px(cx + 4, b - 34, '#ffb8c8')
    g.hline(cx - 2, cx + 1, b - 31, S.D)
    g.px(cx - 2, b - 30, '#ffffff')
    g.px(cx + 1, b - 30, '#ffffff')
    // Crown flames.
    for (let i = -2; i <= 2; i++) {
      const hh = 6 - Math.abs(i) * 1.5
      for (let k = 0; k < hh; k++) g.px(cx + i * 3, b - 43 - k, k % 2 ? S.L : WHT.M2)
    }
    if (v === 0) {
      // Rahu holding the moon.
      g.circle(cx + 12, b - 28, 4, '#fff6c8')
      g.circle(cx + 13, b - 29, 3, '#fffbe8')
      g.rect(cx + 7, b - 26, 4, 3, S.b)
      g.rect(cx - 13, b - 26, 4, 8, S.b)
    } else {
      // Holding a lotus.
      g.rect(cx + 9, b - 26, 4, 8, S.b)
      g.rect(cx - 13, b - 26, 4, 3, S.b)
      g.vline(cx - 13, b - 34, b - 26, '#6cc36a')
      g.ellipse(cx - 13, b - 36, 2.5, 3, '#ff9fc0')
    }
    hooks.glints = [{ x: cx, y: b - 48 }]
  })
}

/** Bake the pit of reaching hands (semi-oval) – cute, waving white hands. */
export function handsPit(g: Surface, cx: number, cy: number, rx: number, ry: number, gap: number, seed = 0) {
  // Sunken floor.
  g.ellipse(cx, cy, rx + 3, ry + 3, '#c8d4ec')
  g.ellipse(cx, cy, rx, ry, '#6a78a8')
  g.ellipse(cx, cy + 2, rx - 4, ry - 4, '#56628f')
  // Hands, back rows first.
  const pts: [number, number][] = []
  for (let i = 0; i < 320; i++) {
    const v = hsh(i, seed, 13)
    const a = ((v % 628) / 100)
    const d = Math.sqrt(hsh(i, seed + 1, 29) / 1000)
    const x = cx + Math.cos(a) * rx * d * 0.92
    const y = cy + Math.sin(a) * ry * d * 0.85
    if (Math.abs(x - cx) < gap) continue
    pts.push([x, y])
  }
  pts.sort((a, b) => a[1] - b[1])
  pts.forEach(([x, y], i) => drawHand(g, Math.round(x), Math.round(y), i))
}

export function drawHand(g: Surface, x: number, y: number, i: number, wave = 0) {
  const h = 7 + (i % 4)
  const S = ['#ffffff', '#f4f8ff', '#e8eef8']
  const c = S[i % 3]
  g.rect(x - 1, y - h, 3, h, c)
  g.px(x + 1, y - h + 1, WHT.D)
  // Palm and fingers.
  const px = x + wave
  g.rect(px - 2, y - h - 3, 5, 3, c)
  for (let f = 0; f < 4; f++) g.vline(px - 2 + f + (f > 1 ? 1 : 0), y - h - 5 - (f === 1 || f === 2 ? 1 : 0), y - h - 3, c)
  g.px(px + 3, y - h - 2, c)
  g.px(px + 2, y - h - 1, WHT.D)
  if (i % 17 === 0) {
    // One hand holds up a little phone, one a teacup (cute pop culture).
    g.rect(px - 1, y - h - 9, 3, 4, '#3a3040')
    g.px(px, y - h - 8, '#9fd0ff')
  }
}

/** A tree whose branches carry hanging ropes (the heads are drawn by the scene). */
export function headsTreeSprite(): Built {
  const W = 84
  const H = 86
  return bld('rk:headstree', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const bark = { L: '#d8d0cc', b: '#b8aca8', d: '#8c8187', D: '#6d6478' }
    // Trunk.
    for (let y = 30; y < H; y++) {
      const half = 4 + (y > H - 8 ? (y - (H - 8)) * 0.8 : 0)
      slice(g, cx, y, half, bark, 0.3)
    }
    // Branches.
    const br: [number, number, number, number][] = [
      [cx, 40, 8, 22],
      [cx, 38, W - 8, 20],
      [cx, 34, cx - 20, 10],
      [cx, 34, cx + 22, 8],
    ]
    for (const [x0, y0, x1, y1] of br) g.thickLine(x0, y0, x1, y1, 3, bark.b)
    // Canopy, pale silvery green.
    const leaf = { L: '#d8f0c8', b: '#a8d49a', d: '#7aae78', D: '#588a60' }
    for (const [x, y, r] of [
      [14, 18, 11],
      [30, 10, 12],
      [52, 9, 12],
      [70, 17, 11],
      [42, 22, 10],
    ] as const) {
      g.circle(x, y + 1, r, leaf.D)
      g.circle(x, y, r, leaf.d)
      g.circle(x - 2, y - 2, r * 0.75, leaf.b)
      g.circle(x - 4, y - 4, r * 0.35, leaf.L)
    }
    const ropes: Pt[] = [
      { x: 12, y: 24 },
      { x: 24, y: 30 },
      { x: 38, y: 32 },
      { x: 54, y: 30 },
      { x: 66, y: 26 },
      { x: 76, y: 24 },
    ]
    hooks.ropes = ropes
  })
}

/** Pop-culture heads that dangle from the tree (drawn by the scene, swinging). */
export function drawHead(g: Surface, kind: number, x: number, y: number) {
  const X = Math.round(x)
  const Y = Math.round(y)
  switch (kind % 6) {
    case 0: // Big-eyed green alien.
      g.ellipse(X, Y, 5, 6, '#3a8a50')
      g.ellipse(X, Y - 0.5, 4.5, 5.5, '#7cd08e')
      g.ellipse(X - 2, Y, 1.6, 2.4, P.ink)
      g.ellipse(X + 2, Y, 1.6, 2.4, P.ink)
      g.px(X - 2, Y - 1, '#ffffff')
      g.px(X + 2, Y - 1, '#ffffff')
      g.vline(X - 2, Y - 9, Y - 6, '#7cd08e')
      g.px(X - 2, Y - 10, '#ffd23f')
      break
    case 1: // Masked hero (blue mask, pointy ears).
      g.ellipse(X, Y, 5, 5.5, '#2a3470')
      g.rect(X - 4, Y - 1, 9, 3, '#3a5fb0')
      g.px(X - 2, Y, '#ffffff')
      g.px(X + 2, Y, '#ffffff')
      g.ellipse(X, Y + 3, 3, 2, '#f0bd90')
      g.px(X - 4, Y - 6, '#2a3470')
      g.px(X + 4, Y - 6, '#2a3470')
      break
    case 2: // Shiny robot head.
      g.rect(X - 5, Y - 5, 10, 10, '#8a90a8')
      g.rect(X - 4, Y - 4, 8, 8, '#c8d0e0')
      g.rect(X - 3, Y - 1, 2, 2, '#6cf0ff')
      g.rect(X + 1, Y - 1, 2, 2, '#6cf0ff')
      g.hline(X - 2, X + 1, Y + 3, '#5a6078')
      g.vline(X, Y - 8, Y - 5, '#8a90a8')
      g.px(X, Y - 9, '#e8514a')
      break
    case 3: // Dreadlocked space hunter (cute version).
      g.ellipse(X, Y, 5, 5.5, '#8a7a50')
      g.ellipse(X, Y, 4, 4.5, '#b8a870')
      for (let i = -4; i <= 4; i += 2) g.vline(X + i, Y - 4, Y + 5, '#3a3040')
      g.px(X - 2, Y - 1, '#ffd23f')
      g.px(X + 2, Y - 1, '#ffd23f')
      g.hline(X - 1, X + 1, Y + 3, '#5a4a30')
      break
    case 4: // Round panda-bear mascot.
      g.circle(X, Y, 5, '#ffffff')
      g.circle(X - 4, Y - 4, 2, P.ink)
      g.circle(X + 4, Y - 4, 2, P.ink)
      g.ellipse(X - 2, Y, 1.5, 1.8, P.ink)
      g.ellipse(X + 2, Y, 1.5, 1.8, P.ink)
      g.px(X, Y + 2, P.ink)
      break
    default: // Red-horned smiling demon mask.
      g.ellipse(X, Y, 5, 5.5, '#b8343f')
      g.ellipse(X, Y - 0.5, 4.5, 5, '#e8514a')
      g.px(X - 2, Y - 1, '#ffd23f')
      g.px(X + 2, Y - 1, '#ffd23f')
      g.hline(X - 2, X + 2, Y + 2, '#fffaf0')
      g.px(X - 4, Y - 6, '#fffaf0')
      g.px(X + 4, Y - 6, '#fffaf0')
      g.px(X - 3, Y - 5, '#fffaf0')
      g.px(X + 3, Y - 5, '#fffaf0')
  }
}

/** Covered frame hung with silver bodhi-leaf wishing plates. */
export function wishPlatesSprite(len = 80): Built {
  const H = 42
  return bld(`rk:plates:${len}`, len, H, len / 2, H - 1, (g, hooks) => {
    const glints: Pt[] = []
    // Posts.
    for (const x of [2, len - 5]) {
      g.rect(x, 8, 3, H - 8, GOLD.d)
      g.vline(x, 8, H - 1, GOLD.l)
    }
    // Golden roof beam with a little white spiky crest.
    g.rect(0, 5, len, 4, GOLD.b)
    g.hline(0, len - 1, 5, GOLD.L)
    g.hline(0, len - 1, 8, GOLD.D)
    for (let x = 3; x < len - 2; x += 4) {
      g.px(x, 4, WHT.L)
      g.px(x, 3, WHT.b)
    }
    // Rails with dangling plates.
    for (const ry of [9, 20]) {
      g.hline(3, len - 4, ry, GOLD.D)
      for (let x = 6; x < len - 5; x += 4) {
        const v = hsh(x, ry, 2)
        const py = ry + 3 + (v % 3)
        g.vline(x, ry + 1, py - 1, '#c8c0b8')
        // Bodhi-leaf plate.
        g.rect(x - 1, py, 3, 4, v % 5 === 0 ? GOLD.b : '#e4e8f0')
        g.px(x, py + 4, v % 5 === 0 ? GOLD.d : '#c8d0e0')
        g.px(x - 1, py, '#ffffff')
        if (v % 4 === 0) glints.push({ x, y: py + 1 })
      }
    }
    hooks.glints = glints
  })
}

/** The famous golden building (it houses the restrooms). 76×74. */
export function goldenBuildingSprite(): Built {
  const W = 78
  const H = 76
  return bld('rk:golden', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const glints: Pt[] = []
    block(g, 4, H - 8, W - 8, 8, 2, GOLDR)
    // Walls with ornate gold relief.
    g.rect(10, 34, W - 20, H - 42, GOLD.b)
    g.rect(W - 18, 34, 8, H - 42, GOLD.d)
    for (let y = 36; y < H - 10; y += 3) for (let x = 12; x < W - 12; x += 3) if ((x + y) % 2) g.px(x, y, (x * y) % 5 ? GOLD.d : GOLD.L)
    // Doors (men / women) with little icons.
    for (const [dx, icon] of [
      [-16, 'm'],
      [16, 'f'],
    ] as const) {
      const x = cx + dx
      g.rect(x - 6, 46, 12, H - 54, GOLD.D)
      g.rect(x - 5, 47, 10, H - 55, '#8a5222')
      g.circle(x, 42, 2.5, '#fffaf0')
      // Tiny person icon on a sign.
      g.px(x, 41, '#3a5fb0')
      if (icon === 'm') g.rect(x - 1, 42, 3, 2, '#3a5fb0')
      else {
        g.px(x, 41, '#e8514a')
        g.rect(x - 1, 42, 3, 2, '#e8514a')
      }
    }
    // Roof: gold tiers with spiky crest.
    for (let i = 0; i < 3; i++) {
      const y = 34 - i * 9
      const hw = 36 - i * 9
      for (let k = 0; k < 9; k++) g.hline(Math.round(cx - hw + k * 1.2), Math.round(cx + hw - k * 1.2), y - k, k === 0 ? GOLD.DD : k % 3 === 0 ? GOLD.d : GOLD.b)
      for (let x = Math.round(cx - hw + 2); x < cx + hw - 2; x += 3) g.px(x, y - 9, GOLD.L)
      g.px(Math.round(cx - hw) - 1, y - 1, GOLD.l)
      g.px(Math.round(cx + hw) + 1, y - 1, GOLD.l)
      glints.push({ x: Math.round(cx - hw), y: y - 2 }, { x: Math.round(cx + hw), y: y - 2 })
    }
    for (let k = 0; k < 8; k++) g.px(cx, 5 - k + 3, k % 2 ? GOLD.L : GOLD.b)
    glints.push({ x: cx, y: 1 })
    hooks.glints = glints
  })
}

/** Wishing well: white round well with coins glinting in the water. */
export function wishingWellSprite(): Built {
  return bld('rk:well', 32, 30, 16, 29, (g, hooks) => {
    g.ellipse(16, 22, 14, 7, WHT.D)
    g.ellipse(16, 21, 14, 7, WHT.b)
    g.ellipse(16, 20, 11, 5, '#4a78c0')
    g.ellipse(16, 21, 9, 3.5, '#3a60a8')
    for (const [x, y] of [
      [12, 20],
      [18, 22],
      [20, 19],
      [14, 22],
    ] as const)
      g.px(x, y, GOLD.b)
    g.rect(2, 22, 28, 6, WHT.b)
    g.hline(2, 29, 27, WHT.D)
    for (let x = 4; x < 28; x += 4) g.px(x, 24, WHT.M)
    // Little white arch over it.
    g.rect(3, 4, 2, 18, WHT.L)
    g.rect(27, 4, 2, 18, WHT.D)
    for (let x = 3; x < 29; x++) g.px(x, 4 - Math.round(Math.sin(((x - 3) / 25) * Math.PI) * 3), WHT.b)
    g.px(16, 0, WHT.M)
    hooks.glints = [{ x: 16, y: 0 }, { x: 18, y: 22 }]
  })
}

/** White spiky pinnacle post that lines the paths. */
export function pinnacleSprite(): Built {
  return bld('rk:pinnacle', 12, 36, 6, 35, (g) => {
    block(g, 1, 30, 10, 6, 1, WR)
    for (let i = 0; i < 14; i++) slice(g, 6, 30 - i * 2, Math.max(0.8, 4 - i * 0.26), WR, 0.4)
    for (let i = 0; i < 6; i++) {
      g.px(1 + (i % 2), 26 - i * 4, WHT.b)
      g.px(10 - (i % 2), 26 - i * 4, WHT.b)
    }
    g.px(6, 1, WHT.M)
    g.px(5, 14, WHT.M2)
    g.px(6, 20, WHT.M)
  })
}

/** The artist's gallery hall (white, with framed paintings). */
export function artGallerySprite(): Built {
  const W = 84
  const H = 58
  return bld('rk:gallery', W, H, W / 2, H - 1, (g) => {
    block(g, 4, H - 6, W - 8, 6, 2, WR)
    g.rect(8, 22, W - 16, H - 28, WHT.b)
    g.rect(W - 18, 22, 10, H - 28, WHT.d)
    // Paintings in the windows.
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 15
      g.rect(x, 30, 10, 12, GOLD.d)
      g.rect(x + 1, 31, 8, 10, ['#e8814a', '#6a8ad0', '#6cc36a', '#b394f0'][i])
      g.px(x + 3, 34, '#fffaf0')
      g.px(x + 6, 37, '#ffd23f')
    }
    g.rect(W / 2 - 5, 44, 10, H - 50, '#dfe8f8')
    // Roof.
    for (let k = 0; k < 14; k++) g.hline(4 + k, W - 5 - k, 22 - k, k === 0 ? WHT.DD : k % 3 === 0 ? WHT.d : WHT.b)
    for (let x = 8; x < W - 8; x += 3) g.px(x, 8 + Math.abs(x - W / 2) * 0 , WHT.L)
  })
}

/** White Temple souvenir shop: prints, postcards and white-temple tees. */
export function artShopSprite(): Built {
  return stallProp('rk:artshop', {
    w: 54,
    awning: ['#ffffff', '#9fc8f0'],
    wood: { L: '#ffffff', b: '#e8eef8', d: '#c8d4ec', D: '#9fb0d0' },
    goods: (g, x, y, w) => {
      // Framed prints hanging from the awning.
      for (let i = 0; i < 4; i++) {
        const px = x + 2 + i * 11
        g.vline(px + 3, y - 20, y - 18, '#8a8480')
        g.rect(px, y - 18, 8, 9, GOLD.d)
        g.rect(px + 1, y - 17, 6, 7, ['#6a8ad0', '#e8814a', '#fffaf0', '#6cc36a'][i])
        g.px(px + 3, y - 15, '#ffffff')
      }
      // Postcards and folded T-shirts.
      for (let i = 0; i < w - 4; i += 6) {
        g.rect(x + 2 + i, y - 3, 5, 3, i % 12 ? '#ffffff' : '#9fc8f0')
        g.px(x + 3 + i, y - 2, '#6a8ad0')
      }
    },
  })
}

/** Seated wax figure of a revered monk (interior). */
export function waxMonkSprite(): Built {
  return bld('rk:waxmonk', 28, 30, 14, 29, (g) => {
    block(g, 2, 24, 24, 6, 2, WR)
    g.ellipse(14, 22, 11, 4, '#c7661f')
    g.ellipse(14, 17, 7, 7, '#ee9136')
    g.rect(8, 14, 12, 8, '#ee9136')
    g.line(9, 12, 18, 20, '#c7661f')
    g.circle(14, 8, 4, '#e8c09a')
    g.px(12, 8, P.ink)
    g.px(16, 8, P.ink)
    g.hline(13, 15, 11, '#c89a78')
    g.rect(11, 17, 6, 3, '#e8c09a')
  })
}

/** The surreal mural of the ubosot's back wall (cute version, baked). */
export function surrealMural(g: Surface, x: number, y: number, w: number, h: number) {
  // Heaven above: pale gold sky with the Buddha's radiance.
  for (let j = 0; j < h; j++) {
    const t = j / h
    const c = t < 0.45 ? mixHex('#fff6d8', '#ffd98a', t / 0.45) : mixHex('#ff9a5a', '#c8403a', (t - 0.45) / 0.55)
    g.hline(x, x + w - 1, y + j, c)
  }
  // Swirling flames of desire in the lower half.
  for (let i = 0; i < w; i += 3) {
    const v = hsh(i, 5, 21)
    const fh = 6 + (v % 10)
    for (let k = 0; k < fh; k++) g.px(x + i + Math.round(Math.sin(k * 0.6 + i) * 1.5), y + h - 1 - k, k > fh - 3 ? '#ffe07a' : '#ff7a3a')
  }
  // A giant cute two-eyed face (the tempter) in the middle.
  const fx = x + w / 2
  const fy = y + h * 0.66
  g.ellipse(fx, fy, 14, 9, '#8a2335')
  g.ellipse(fx - 6, fy - 1, 4, 4, '#ffffff')
  g.ellipse(fx + 6, fy - 1, 4, 4, '#ffffff')
  g.circle(fx - 5, fy, 2, '#2a3470')
  g.circle(fx + 7, fy, 2, '#2a3470')
  g.hline(fx - 4, fx + 4, fy + 5, '#ffe07a')
  // Pop culture in the flames: a rocket, a flying caped hero, a blue robot cat, a phone, a UFO.
  const rk = { x: x + 12, y: y + h * 0.55 }
  g.rect(rk.x, rk.y, 3, 7, '#fffaf0')
  g.px(rk.x + 1, rk.y - 1, '#e8514a')
  g.px(rk.x - 1, rk.y + 6, '#e8514a')
  g.px(rk.x + 3, rk.y + 6, '#e8514a')
  g.px(rk.x + 1, rk.y + 8, '#ffe07a')
  const hero = { x: x + w - 26, y: y + h * 0.5 }
  g.rect(hero.x, hero.y, 6, 2, '#3a5fb0')
  g.rect(hero.x + 6, hero.y - 1, 2, 2, '#f0bd90')
  g.line(hero.x, hero.y, hero.x - 4, hero.y + 3, '#e8514a')
  g.line(hero.x + 1, hero.y + 1, hero.x - 3, hero.y + 4, '#e8514a')
  const cat = { x: x + 30, y: y + h * 0.76 }
  g.circle(cat.x, cat.y, 4, '#4a9ae0')
  g.ellipse(cat.x, cat.y + 1, 3, 2.4, '#ffffff')
  g.px(cat.x - 1, cat.y - 1, P.ink)
  g.px(cat.x + 1, cat.y - 1, P.ink)
  g.px(cat.x, cat.y, '#e8514a')
  g.hline(cat.x - 2, cat.x + 2, cat.y + 4, '#e8514a')
  const ph = { x: x + w - 40, y: y + h * 0.78 }
  g.rect(ph.x, ph.y, 4, 7, '#3a3040')
  g.rect(ph.x + 1, ph.y + 1, 2, 4, '#9fd0ff')
  const ufo = { x: x + w * 0.3, y: y + h * 0.5 }
  g.ellipse(ufo.x, ufo.y, 6, 2, '#bdb2ae')
  g.ellipse(ufo.x, ufo.y - 1.5, 3, 2, '#9fd0ff')
  g.px(ufo.x - 3, ufo.y + 1, '#ffe07a')
  g.px(ufo.x + 3, ufo.y + 1, '#ffe07a')
  // Heaven: a golden radiance and floating devas.
  g.circle(x + w / 2, y + 12, 10, '#fff0b8')
  g.circle(x + w / 2, y + 12, 6, '#fffbe8')
  for (let a = 0; a < 12; a++) g.line(x + w / 2, y + 12, x + w / 2 + Math.cos(a / 12 * Math.PI * 2) * 16, y + 12 + Math.sin(a / 12 * Math.PI * 2) * 9, '#ffe7a0')
  for (const dx of [-40, -24, 24, 40]) {
    const dvx = x + w / 2 + dx
    g.rect(dvx - 1, y + 16, 3, 4, '#fffaf0')
    g.circle(dvx, y + 14, 1.5, '#f0bd90')
    g.line(dvx - 3, y + 18, dvx + 3, y + 18, '#ffe07a')
  }
}

export const RK_ART: Record<string, () => { canvas: HTMLCanvasElement; w: number; h: number }> = {
  ubosot: () => whiteUbosotSprite(),
  ubosotN: () => whiteUbosotSprite(true),
  heavengate: () => heavenGateSprite(),
  guard0: () => guardianSprite(0),
  guard1: () => guardianSprite(1),
  headstree: () => headsTreeSprite(),
  plates: () => wishPlatesSprite(),
  golden: () => goldenBuildingSprite(),
  well: () => wishingWellSprite(),
  pinnacle: () => pinnacleSprite(),
  gallery: () => artGallerySprite(),
  artshop: () => artShopSprite(),
  waxmonk: () => waxMonkSprite(),
  pit: () => bld('rk:pittest', 130, 70, 0, 0, (g) => {
    handsPit(g, 65, 36, 60, 28, 8)
    for (let k = 0; k < 6; k++) drawHead(g, k, 10 + k * 20, 8)
  }, false),
  mural: () => bld('rk:muraltest', 190, 60, 0, 0, (g) => surrealMural(g, 0, 0, 190, 60), false),
}

export type { Color }
