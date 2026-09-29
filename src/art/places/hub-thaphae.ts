// ถนนคนเดินท่าแพ เชียงใหม่ – the red-brick Tha Phae Gate with its crenellated
// wall and teak doors, Doi Suthep on the skyline, a Lanna viharn closing the
// walking street, Bo Sang paper-umbrella stall, lantern stall, the foot-
// massage chair row and a red songthaew.

import type { Color, Surface } from '../../engine/pixel'
import { hprop, hsh, INK, mix, ramp, type HubProp } from './hub-kit'

const BRICK = { L: '#d8826a', b: '#b8543a', d: '#984232', D: '#6e2e24', mortar: '#e0b098' }

/** Brick texture fill. */
function bricks(g: Surface, x: number, y: number, w: number, h: number, seed: number, night: boolean) {
  const base = night ? mix(BRICK.b, '#2a2a4a', 0.3) : BRICK.b
  const mortar = night ? mix(BRICK.mortar, '#2a2a4a', 0.35) : BRICK.mortar
  g.rect(x, y, w, h, base)
  for (let j = 0; j < h; j += 4) {
    g.hline(x, x + w - 1, y + j, mortar)
    const off = (j / 4) % 2 ? 4 : 0
    for (let i = off; i < w; i += 8) g.vline(x + i, y + j, Math.min(y + h - 1, y + j + 3), mortar)
    for (let i = off; i < w; i += 8) {
      const v = hsh(x + i, y + j, seed)
      if (v < 180) g.rect(x + i + 1, y + j + 1, 6, 3, night ? mix(BRICK.d, '#2a2a4a', 0.3) : BRICK.d)
      else if (v > 900) g.rect(x + i + 1, y + j + 1, 6, 3, night ? mix(BRICK.L, '#2a2a4a', 0.3) : BRICK.L)
    }
  }
  // Moss and weathering at the base.
  for (let i = 0; i < w; i++) {
    const v = hsh(x + i, y + h, seed + 1)
    if (v < 300) g.px(x + i, y + h - 1 - (v % 3), night ? '#2e4a3a' : '#6a8a4a')
  }
}

/** The Tha Phae city wall across the map with the gate opening (baked). */
export function thaPhaeWall(g: Surface, y: number, w: number, gap0: number, gap1: number, night: boolean) {
  const H = 46
  const top = y - H
  for (const [a, b] of [
    [0, gap0],
    [gap1, w],
  ]) {
    bricks(g, a, top + 8, b - a, H - 8, a + 3, night)
    // Crenellations (merlons) along the top.
    for (let x = a; x < b; x += 10) {
      bricks(g, x, top, 6, 9, x, night)
      g.hline(x, x + 5, top, night ? '#a86a5a' : BRICK.L)
    }
    g.hline(a, b - 1, top + 8, night ? '#a86a5a' : BRICK.L)
    // Top ledge shadow and base plinth.
    g.hline(a, b - 1, top + 9, BRICK.D)
    g.rect(a, y - 4, b - a, 4, night ? '#6a5050' : '#8a5a4a')
  }
  // The gate's inner reveal (thick walls) on both sides of the opening.
  for (const [x, dir] of [
    [gap0, 1],
    [gap1, -1],
  ] as const) {
    for (let i = 0; i < 6; i++) g.vline(x + (dir > 0 ? i : -1 - i), top + 8, y - 1, mix(BRICK.d, INK, 0.1 + i * 0.05))
  }
  // Big corner towers (bastions) at the gap.
  for (const x of [gap0 - 16, gap1]) {
    bricks(g, x, top - 8, 16, H + 8, x + 11, night)
    for (let k = 0; k < 2; k++) {
      bricks(g, x + k * 10, top - 14, 6, 7, x + k, night)
      g.hline(x + k * 10, x + k * 10 + 5, top - 14, night ? '#a86a5a' : BRICK.L)
    }
    g.vline(x + 15, top - 8, y - 1, BRICK.D)
  }
}

/** One of the huge teak gate doors, standing open (anchor: bottom hinge side). */
export function gateDoor(flip = false): HubProp {
  return hprop(`tp:door:${flip ? 1 : 0}`, 14, 40, flip ? 13 : 0, 39, (g) => {
    const T = ramp('#8a5a3a')
    const x0 = flip ? 3 : 0
    g.rect(x0, 2, 11, 38, T.b)
    for (let x = x0 + 2; x < x0 + 11; x += 3) g.vline(x, 2, 39, T.d)
    for (const y of [8, 20, 32]) {
      g.hline(x0, x0 + 10, y, '#5a5566')
      for (let x = x0 + 1; x < x0 + 11; x += 3) g.px(x, y, '#bdb2ae')
    }
    g.hline(x0, x0 + 10, 2, T.L)
    g.vline(flip ? x0 + 10 : x0, 2, 39, T.D)
  })
}

/** Doi Suthep on the skyline with the golden chedi glint (baked in the sky band). */
export function doiSuthep(g: Surface, y0: number, y1: number, w: number, night: boolean) {
  const far = night ? '#3a3f6a' : '#8aa8c8'
  const mid = night ? '#2e3a5a' : '#6a90b0'
  for (let x = 0; x < w; x++) {
    const f = x / w
    const h1 = 26 + Math.sin(f * 3.1 + 0.4) * 12 + Math.sin(f * 9) * 3
    g.vline(x, Math.max(y0, Math.round(y1 - h1)), y1, far)
    const h2 = 14 + Math.sin(f * 5 + 2) * 6 + Math.cos(f * 13) * 2
    g.vline(x, Math.round(y1 - h2), y1, mid)
  }
  // The temple on the peak.
  const px = Math.round(w * 0.36)
  const py = Math.round(y1 - 26 - Math.sin(0.36 * 3.1 + 0.4) * 12 - Math.sin(0.36 * 9) * 3)
  g.rect(px - 1, py - 4, 3, 4, night ? '#fff3a6' : '#ffd54f')
  g.px(px, py - 5, '#fff6c2')
}

/** Lanna viharn façade closing the walking street (anchor: centre ground). */
export function lannaViharn(night = false): HubProp {
  const W = 110
  const H = 84
  return hprop(`tp:viharn:${night ? 1 : 0}`, W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    const RF = ramp('#b8543a')
    const GD = ramp('#ffd54f')
    // Plinth + stairs with naga.
    g.rect(8, H - 10, W - 16, 10, '#f0e8dc')
    g.hline(8, W - 9, H - 10, '#ffffff')
    for (let i = 0; i < 3; i++) g.rect(cx - 12 + i * 2, H - 4 - i * 2, 24 - i * 4, 2, '#e0d8cc')
    // White walls with a red-gold door.
    g.rect(16, H - 38, W - 32, 28, '#fffaf0')
    g.rect(W - 34, H - 38, 18, 28, '#efe4d0')
    g.rect(cx - 8, H - 32, 16, 22, '#b8343f')
    g.rect(cx - 6, H - 30, 12, 20, night ? '#ffcf7a' : '#8a2335')
    g.vline(cx, H - 30, H - 11, GD.d)
    for (const x of [26, W - 32]) g.rect(x, H - 30, 6, 12, night ? '#ffe7a8' : '#6a3a4a')
    // Tiered Lanna roof sweeping low, with gold gable.
    for (let tier = 0; tier < 3; tier++) {
      const ty = H - 40 - tier * 13
      const half = 52 - tier * 12
      for (let y = 0; y < 12; y++) {
        const hw = half - (11 - y) * 1.8
        g.hline(Math.round(cx - hw), Math.round(cx + hw), ty - 11 + y, y < 2 ? RF.L : (y + tier) % 4 === 0 ? RF.d : RF.b)
      }
      g.hline(Math.round(cx - half), Math.round(cx + half), ty, GD.d)
      // Gold gable triangle.
      g.poly([[cx - 12 + tier * 3, ty], [cx, ty - 12], [cx + 12 - tier * 3, ty]], GD.b)
      g.poly([[cx, ty - 12], [cx + 12 - tier * 3, ty], [cx + 3, ty]], GD.d)
      // Kalae finials.
      g.line(cx - 12 + tier * 3, ty, cx - 16 + tier * 3, ty - 5, GD.b)
      g.line(cx + 12 - tier * 3, ty, cx + 16 - tier * 3, ty - 5, GD.b)
    }
    g.vline(cx, 0, 10, GD.b)
    g.px(cx, 0, GD.L)
    hooks.glints = [{ x: cx, y: 2 }, { x: cx - 30, y: H - 40 }, { x: cx + 30, y: H - 40 }]
    hooks.door = [{ x: cx, y: H - 12 }]
  })
}

/** Bo Sang paper-umbrella stall: open painted umbrellas on display. */
export function bosangStall(): HubProp {
  return hprop('tp:bosang', 50, 44, 25, 43, (g, hooks) => {
    g.rect(2, 30, 46, 3, '#e8e2dc')
    g.rect(3, 33, 44, 10, '#6a4a8a')
    g.hline(3, 46, 33, '#8a6aaa')
    const cols: [Color, Color][] = [
      ['#ff9fc0', '#fffaf0'],
      ['#6cc36a', '#ffd23f'],
      ['#5a8de0', '#fffaf0'],
      ['#e8514a', '#ffd23f'],
      ['#f58f35', '#fffaf0'],
    ]
    const um = (x: number, y: number, r: number, c: [Color, Color]) => {
      g.circle(x, y, r, mix(c[0], INK, 0.3))
      g.circle(x, y, r - 0.6, c[0])
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2
        g.line(x, y, Math.round(x + Math.cos(a) * (r - 1)), Math.round(y + Math.sin(a) * (r - 1)), mix(c[0], '#ffffff', 0.35))
      }
      g.circle(x + 1, y - 1, r * 0.35, c[1])
      g.px(x, y, '#6e4a35')
    }
    um(12, 12, 10, cols[0])
    um(34, 10, 9, cols[1])
    um(24, 20, 8, cols[2])
    um(7, 25, 5, cols[3])
    um(42, 24, 5, cols[4])
    for (let x = 6; x < 46; x += 7) {
      g.vline(x, 26, 30, '#c9a06a')
      g.rect(x - 1, 27, 3, 3, cols[(x / 7) % 5 | 0][0])
    }
    hooks.lamp = [{ x: 25, y: 4 }]
  })
}

/** A row of reclining foot-massage chairs (anchor: centre ground). */
export function massageChairs(n = 4): HubProp {
  const W = n * 16 + 4
  return hprop(`tp:massage:${n}`, W, 20, W / 2, 19, (g) => {
    for (let i = 0; i < n; i++) {
      const x = 2 + i * 16
      g.rect(x, 8, 12, 4, '#8a5a3a')
      g.line(x, 8, x + 3, 1, '#8a5a3a')
      g.line(x + 1, 8, x + 4, 1, '#a87050')
      g.rect(x + 1, 12, 1, 7, '#6e4a35')
      g.rect(x + 10, 12, 1, 7, '#6e4a35')
      g.rect(x + 9, 11, 5, 3, '#e8e2dc')
      g.rect(x + 2, 7, 8, 2, ['#e8514a', '#43905a', '#3d63b5', '#f58f35'][i % 4])
    }
  })
}

/** Red songthaew (รถแดง) parked, side view. */
export function redTruck(): HubProp {
  return hprop('tp:rotdaeng', 48, 26, 24, 25, (g) => {
    const R = ramp('#d8343a')
    g.rect(2, 6, 32, 14, R.b)
    g.rect(2, 4, 32, 3, R.L)
    for (let x = 5; x < 32; x += 6) g.rect(x, 8, 4, 5, '#3a2a30')
    g.rect(34, 9, 11, 11, R.b)
    g.rect(36, 10, 6, 5, '#8fb6d0')
    g.hline(2, 44, 16, R.d)
    g.rect(0, 18, 46, 2, '#3a3040')
    g.circle(10, 21, 3.5, '#3a3040')
    g.circle(38, 21, 3.5, '#3a3040')
    g.px(10, 21, '#bdb2ae')
    g.px(38, 21, '#bdb2ae')
    g.px(46, 14, '#fff3a6')
    g.rect(6, 2, 22, 2, '#ffd23f')
  })
}
