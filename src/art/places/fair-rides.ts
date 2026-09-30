// The fair's moving rides, drawn every frame in two passes: `body` (inside
// the y-sorted world, gets the night tint) and `lights` (after the tint, so
// the bulbs blaze). The ferris wheel (ชิงช้าสวรรค์) cycles light shows, the
// carousel (ม้าหมุน) horses bob, the bumper cars (รถบั๊มพ์) spark on the
// ceiling net.

import { bake, type Color, type Surface } from '../../engine/pixel'
import { cached } from '../../engine/sprite'
import { avatarSprite, type AvatarLook } from '../avatar'
import { drawShadow } from '../props'
import { BULBS } from './fair'
import { hprop, INK, mix, type HubProp } from './hub-kit'

// ---------------------------------------------------------------------------
// Ferris wheel.

export const WHEEL_N = 12
const CABIN_COLS: Color[] = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#f58f35']

/** Static parts of the wheel: A-frame legs, braces and the double rim (baked once per size). */
function wheelFrame(r: number): HTMLCanvasElement {
  return cached(`fair:wheelframe:${r}`, () => {
    const S = r * 2 + 40
    const c = bake(S, S, (g) => {
      const cx = S / 2
      const cy = r + 6
      const gy = cy + r + 18
      const frame = '#8a86c0'
      const frameD = '#5a5690'
      for (const [dx, col] of [
        [-3, frameD],
        [3, frame],
      ] as const) {
        g.thickLine(cx + dx, cy, cx + dx - r * 0.58, gy, 2.4, col)
        g.thickLine(cx + dx, cy, cx + dx + r * 0.58, gy, 2.4, col)
      }
      for (const k of [0.45, 0.72]) {
        const y = cy + (gy - cy) * k
        const hw = r * 0.58 * k
        g.hline(Math.round(cx - hw), Math.round(cx + hw), Math.round(y), frameD)
      }
      // Rim: outer and inner ring with a zigzag lattice.
      const N = Math.round(r * 7)
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2
        g.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), frame)
        g.px(Math.round(cx + Math.cos(a) * (r - 4)), Math.round(cy + Math.sin(a) * (r - 4)), frameD)
      }
      const Z = 48
      for (let i = 0; i < Z; i++) {
        const a0 = (i / Z) * Math.PI * 2
        const a1 = ((i + 1) / Z) * Math.PI * 2
        const rr0 = i % 2 ? r : r - 4
        const rr1 = i % 2 ? r - 4 : r
        g.line(cx + Math.cos(a0) * rr0, cy + Math.sin(a0) * rr0, cx + Math.cos(a1) * rr1, cy + Math.sin(a1) * rr1, mix(frame, frameD, 0.5))
      }
    })
    return { canvas: c, w: S, h: S }
  }).canvas as HTMLCanvasElement
}

export interface WheelOpts {
  riders?: AvatarLook[]
  /** Light show mode 0..3 (chase, rainbow sweep, pulse, sparkle). */
  mode?: number
  /** Index of a cabin to leave empty (the player rides it in the ride scene). */
  skip?: number
}

/** Where cabin i hangs from the rim (world coordinates of its hook). */
export function wheelCabin(cx: number, cy: number, r: number, angle: number, i: number): { x: number; y: number } {
  const a = angle + (i / WHEEL_N) * Math.PI * 2
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
}

/** The ferris wheel body (frame, spokes, cabins, kiosk). (cx, cy) = hub. */
export function drawWheelBody(g: Surface, cx: number, cy: number, r: number, angle: number, t: number, o: WheelOpts = {}) {
  const fr = wheelFrame(r)
  const S = r * 2 + 40
  g.draw(fr, Math.round(cx - S / 2), Math.round(cy - r - 6))
  const frame = '#8a86c0'
  const frameD = '#5a5690'
  const N = 16
  for (let i = 0; i < N; i++) {
    const a = angle + (i / N) * Math.PI * 2
    for (let k = 4; k < r - 4; k += 2) g.px(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), k % 4 ? frame : frameD)
  }
  g.circle(cx, cy, 5, frameD)
  g.circle(cx, cy, 3.5, '#ffd54f')
  // Cabins hang below each rim point (always upright).
  const riders = o.riders ?? []
  for (let i = 0; i < WHEEL_N; i++) {
    if (i === o.skip) continue
    const { x: hx, y: hy } = wheelCabin(cx, cy, r, angle, i)
    const x = Math.round(hx)
    const y = Math.round(hy)
    const sway = Math.round(Math.sin(t * 1.3 + i) * 0.7)
    const c = CABIN_COLS[i % CABIN_COLS.length]
    g.vline(x, y, y + 2, '#bdb2ae')
    // Roof, window band, body.
    g.rect(x - 5 + sway, y + 2, 11, 2, mix(c, INK, 0.25))
    g.rect(x - 4 + sway, y + 4, 9, 3, mix(c, '#ffffff', 0.3))
    g.rect(x - 5 + sway, y + 7, 11, 5, c)
    g.hline(x - 5 + sway, x + 5 + sway, y + 11, mix(c, INK, 0.35))
    const rider = riders[i % Math.max(1, riders.length)]
    if (rider && i % 3 === 0) {
      g.px(x - 1 + sway, y + 5, '#f0bd90')
      g.px(x + 1 + sway, y + 5, '#f0bd90')
      g.px(x - 1 + sway, y + 4, INK)
      g.px(x + 1 + sway, y + 4, '#6a4a3a')
    }
  }
  // Base platform, ticket kiosk and the queue rail.
  const gy = cy + r + 18
  g.rect(Math.round(cx - r * 0.72), gy - 2, Math.round(r * 1.44), 5, '#6a6374')
  g.hline(Math.round(cx - r * 0.72), Math.round(cx + r * 0.72), gy - 2, '#8c8187')
  g.rect(cx - 8, gy - 14, 16, 12, '#e8514a')
  g.rect(cx - 6, gy - 12, 12, 5, '#3a2e48')
  g.rect(cx - 9, gy - 16, 18, 2, '#ffd23f')
  for (let x = cx - r * 0.7; x < cx - 12; x += 5) g.vline(Math.round(x), gy - 6, gy - 2, '#bdb2ae')
  g.hline(Math.round(cx - r * 0.7), cx - 12, gy - 6, '#e8514a')
}

/** Wheel lights (after the tint): four light shows that change every few seconds. */
export function drawWheelLights(g: Surface, cx: number, cy: number, r: number, angle: number, t: number, mode = 0) {
  const N = 16
  const lit = (i: number, k: number): Color | null => {
    const col = BULBS[(i + k) % BULBS.length]
    switch (mode % 4) {
      case 0:
        return (Math.floor(t * 6) + i + k) % 4 === 0 ? null : col
      case 1: {
        // Rainbow sweep round the wheel.
        const hue = ((i / N + t * 0.25) % 1) * BULBS.length
        return BULBS[Math.floor(hue) % BULBS.length]
      }
      case 2:
        // Pulse out from the hub.
        return Math.floor(t * 5 - k / 9) % 3 === 0 ? '#fff6c8' : k % 2 ? col : null
      default:
        return (Math.floor(t * 12) * 7 + i * 13 + k * 5) % 5 === 0 ? '#ffffff' : col
    }
  }
  for (let i = 0; i < N; i++) {
    const a = angle + (i / N) * Math.PI * 2
    for (let k = 9; k < r - 5; k += 8) {
      const c = lit(i, k)
      if (c) g.px(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), c)
    }
    const c = lit(i, 99)
    const b = a + Math.PI / N
    if (c) {
      g.px(Math.round(cx + Math.cos(b) * r), Math.round(cy + Math.sin(b) * r), c)
      g.px(Math.round(cx + Math.cos(b) * (r - 4)), Math.round(cy + Math.sin(b) * (r - 4)), mix(c, '#ffffff', 0.4))
    }
  }
  g.circle(cx, cy, 2.5, '#fff3a6')
  g.px(cx, cy, '#ffffff')
  // Cabin windows glow.
  for (let i = 0; i < WHEEL_N; i++) {
    const { x, y } = wheelCabin(cx, cy, r, angle, i)
    const sway = Math.round(Math.sin(t * 1.3 + i) * 0.7)
    g.alpha(0.55)
    g.rect(Math.round(x) - 3 + sway, Math.round(y) + 5, 7, 1, '#fff6c8')
    g.alpha(1)
  }
  // Kiosk sign.
  const gy = cy + r + 18
  g.rect(cx - 9, gy - 16, 18, 2, '#ffe27a')
}

// ---------------------------------------------------------------------------
// Carousel.

export interface CarouselOpts {
  riders?: AvatarLook[]
  /** Bob amplitude multiplier (tap boost). */
  bob?: number
}

/** Carousel (ม้าหมุน) with bobbing horses; (cx, gy) = ground centre. */
export function drawCarouselBody(g: Surface, cx: number, gy: number, angle: number, t: number, o: CarouselOpts = {}) {
  const R = 42
  const top = gy - 62
  const riders = o.riders ?? []
  const bobK = o.bob ?? 1
  const horse = (a: number, i: number, front: boolean) => {
    const s = Math.sin(a)
    if (front !== s > 0) return
    const x = Math.round(cx + Math.cos(a) * (R - 8))
    const bob = Math.round(Math.sin(t * 3 * Math.min(2, bobK) + i * 1.7) * 2 * bobK)
    const y = Math.round(gy - 14 + s * 6) + bob
    const c = ['#fffaf0', '#ff9fc0', '#ffd23f', '#9fd0ff'][i % 4]
    const dir = Math.cos(a) > 0 ? -1 : 1
    g.vline(x, top + 18, y - 6, '#ffd54f')
    g.px(x, top + 18 + ((Math.floor(t * 4) + i) % 6) * 3, '#fff3a6')
    // Body, neck, head with a mane, legs mid-gallop, saddle.
    g.rect(x - 4, y - 6, 9, 4, c)
    g.rect(x + dir * 4 - 1, y - 9, 3, 4, c)
    g.px(x + dir * 5, y - 9, INK)
    g.rect(x + dir * 4 - 1, y - 10, 2, 1, mix(c, INK, 0.3))
    g.vline(x + dir * 3, y - 10, y - 7, '#e8514a')
    g.line(x - 3, y - 2, x - 4 - dir, y + 1, mix(c, INK, 0.3))
    g.line(x + 3, y - 2, x + 3 + dir, y + 1, mix(c, INK, 0.3))
    g.px(x - dir * 5, y - 5, mix(c, INK, 0.3))
    g.px(x - dir * 6, y - 4, mix(c, INK, 0.3))
    g.rect(x - 1, y - 7, 3, 1, '#e8514a')
    const rider = riders[i % Math.max(1, riders.length)]
    if (rider && i % 2 === 0) {
      const sp = avatarSprite(rider, 'side', 'sit', { flip: dir < 0 })
      g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - 6 - sp.h + 10))
    }
  }
  // Platform.
  g.ellipse(cx, gy - 1, R + 3, 10, '#4a3a3a')
  g.ellipse(cx, gy - 2, R + 2, 9, '#6a4a3a')
  g.ellipse(cx, gy - 3, R, 8, '#c8704c')
  g.ellipse(cx, gy - 4, R - 2, 6.5, '#e8b070')
  for (let i = 0; i < 8; i++) horse(angle + (i / 8) * Math.PI * 2, i, false)
  // Centre column with mirrors.
  g.rect(cx - 7, top + 14, 14, gy - top - 18, '#e8514a')
  for (let y = top + 18; y < gy - 8; y += 6) g.rect(cx - 5, y, 10, 3, '#fff6c8')
  for (let i = 0; i < 8; i++) horse(angle + (i / 8) * Math.PI * 2, i, true)
  // Striped canopy with a scalloped rim.
  for (let y = 0; y < 18; y++) {
    const half = 8 + y * 2.15
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const k = Math.floor(((x - cx) / Math.max(1, half)) * 4 + 8 + angle * 1.3)
      g.px(x, top + y, k % 2 ? '#e8514a' : '#fffaf0')
    }
  }
  for (let x = cx - R - 2; x <= cx + R + 2; x += 4) {
    g.rect(x, top + 18, 4, 2, Math.floor((x - cx) / 4) % 2 ? '#e8514a' : '#ffd23f')
    g.px(x + 1, top + 20, '#ffd23f')
  }
  g.vline(cx, top - 8, top, '#ffd54f')
  g.circle(cx, top - 9, 2, '#ff6f91')
}

/** Carousel lights (after the tint): canopy rim bulbs and the mirror column. */
export function drawCarouselLights(g: Surface, cx: number, gy: number, t: number) {
  const R = 42
  const top = gy - 62
  for (let i = 0; i < 22; i++) {
    const on = (Math.floor(t * 5) + i) % 3 !== 0
    g.px(Math.round(cx - R + i * 4), top + 21, on ? BULBS[i % BULBS.length] : mix(BULBS[i % BULBS.length], '#3a3048', 0.5))
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.6
    g.px(Math.round(cx + Math.cos(a) * 12), Math.round(top + 8 + Math.sin(a) * 3), '#fff3a6')
  }
  for (let y = top + 18; y < gy - 8; y += 6) {
    g.alpha(0.7)
    g.rect(cx - 5, y, 10, 3, '#fff6c8')
    g.alpha(1)
  }
  g.circle(cx, top - 9, 2, '#ff9fc0')
}

// ---------------------------------------------------------------------------
// Bumper cars (รถบั๊มพ์).

/** Diamond-plate floor with a hazard-stripe border (baked into the ground). */
export function bumperFloor(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#4a5060')
  for (let j = 2; j < h - 2; j += 4)
    for (let i = 2 + (j % 8 ? 2 : 0); i < w - 2; i += 4) {
      g.px(x + i, y + j, '#5e6678')
      g.px(x + i + 1, y + j + 1, '#3e4454')
    }
  for (let i = 0; i < w; i += 6) {
    g.rect(x + i, y, 3, 2, '#ffd23f')
    g.rect(x + i + 3, y, 3, 2, '#2a2830')
    g.rect(x + i, y + h - 2, 3, 2, '#ffd23f')
    g.rect(x + i + 3, y + h - 2, 3, 2, '#2a2830')
  }
}

/** The arena rail (top or bottom), with padded posts; `front` has a gap for the entrance. */
export function bumperRail(w: number, front: boolean): HubProp {
  return hprop(`fair:bumperrail:${w}:${front ? 1 : 0}`, w, 12, w / 2, 11, (g) => {
    const gap = front ? [w / 2 - 10, w / 2 + 10] : null
    for (let x = 0; x < w; x++) {
      if (gap && x > gap[0] && x < gap[1]) continue
      g.px(x, 4, '#e8514a')
      g.px(x, 5, '#b8343f')
      g.px(x, 7, '#ffd23f')
    }
    for (let x = 0; x < w; x += 16) {
      if (gap && x > gap[0] && x < gap[1]) continue
      g.rect(x, 2, 3, 10, '#8a8480')
      g.px(x + 1, 2, '#c8c0c8')
    }
    g.rect(w - 3, 2, 3, 10, '#8a8480')
    if (front && gap) {
      // Entrance: a little lit arch.
      g.rect(gap[0], 0, 2, 12, '#ffd23f')
      g.rect(gap[1] - 1, 0, 2, 12, '#ffd23f')
    }
  })
}

export const BUMPER_COLS: Color[] = ['#e8514a', '#5a8de0', '#6cc36a', '#ff9fc0', '#c8a0ff', '#f58f35']

/**
 * A bumper car seen from above-front (3/4), heading `ang` (radians, 0 = right).
 * Draws the rubber skirt, the body, the driver's upper half and the pole.
 */
export function drawBumperCar(g: Surface, x: number, y: number, ang: number, color: Color, driver: AvatarLook | null, t: number, golden = false) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const body = golden ? '#ffd54f' : color
  const D = mix(body, INK, 0.3)
  const L = mix(body, '#ffffff', 0.4)
  drawShadow(g, X, Y + 1, 10, 3)
  g.ellipse(X, Y - 2, 10, 5, '#2a2830')
  g.ellipse(X, Y - 3, 9, 4.2, D)
  g.ellipse(X, Y - 4, 8, 3.6, body)
  // Nose shows the heading.
  const nx = Math.round(X + Math.cos(ang) * 7)
  const ny = Math.round(Y - 4 + Math.sin(ang) * 2.5)
  g.circle(nx, ny, 1.6, L)
  g.px(nx, ny, '#ffffff')
  if (driver) {
    const sp = avatarSprite(driver, 'front', 'sit')
    g.drawPart(sp.canvas, 0, 0, sp.w, 15, X - Math.round(sp.w / 2), Y - 18)
  }
  // Front cowl over the driver's lap.
  g.ellipse(X, Y - 3, 6, 2, D)
  g.hline(X - 5, X + 5, Y - 4, body)
  // The pole with its spark on the ceiling net.
  g.vline(X - 6, Y - 22, Y - 5, '#8a8480')
  if (golden && Math.floor(t * 6) % 2) g.px(X + 4, Y - 7, '#ffffff')
}

/**
 * The close-up bumper car of the mini-game (3/4 view from above-front, about
 * 30×24): fat rubber skirt, shiny body with a number, the driver sitting in
 * it with a steering wheel, the pole up to the net. (x, y) = ground centre.
 */
export function drawBumperCarBig(g: Surface, x: number, y: number, ang: number, color: Color, driver: AvatarLook | null, t: number, o: { golden?: boolean; num?: number; spin?: boolean } = {}) {
  const X = Math.round(x)
  const Y = Math.round(y)
  const body = o.golden ? '#ffd54f' : color
  const D = mix(body, INK, 0.32)
  const DD = mix(body, INK, 0.55)
  const L = mix(body, '#ffffff', 0.45)
  drawShadow(g, X, Y + 1, 15, 4)
  // Rubber skirt and body shell.
  g.ellipse(X, Y - 4, 15, 7, '#26242c')
  g.ellipse(X, Y - 5, 14, 6, '#3a3844')
  g.ellipse(X, Y - 7, 13, 6, DD)
  g.ellipse(X, Y - 8, 12, 5.4, body)
  g.ellipse(X - 3, Y - 10, 6, 2, L)
  // Nose light shows the heading.
  const nx = Math.round(X + Math.cos(ang) * 10)
  const ny = Math.round(Y - 7 + Math.sin(ang) * 3.5)
  g.circle(nx, ny, 2, '#fff6c8')
  g.px(nx, ny, '#ffffff')
  // Seat back and the driver (head and shoulders).
  g.rect(X - 7, Y - 22, 14, 10, D)
  g.rect(X - 6, Y - 21, 12, 2, L)
  if (driver) {
    const sp = avatarSprite(driver, 'front', o.spin ? 'happy' : 'sit')
    g.drawPart(sp.canvas, 0, 0, sp.w, 17, X - Math.round(sp.w / 2), Y - 28)
  }
  // Cowl, steering wheel and the number on the front.
  g.ellipse(X, Y - 9, 9, 3, D)
  g.hline(X - 8, X + 8, Y - 11, body)
  g.ellipse(X, Y - 12, 3, 1.4, '#2a2830')
  g.px(X, Y - 12, '#8a8480')
  g.circle(X, Y - 6, 3, '#fffaf0')
  g.px(X, Y - 6, DD)
  g.px(X, Y - 7, DD)
  if (o.num !== undefined) g.px(X + 1, Y - 5, DD)
  // The pole and its contact on the net.
  g.vline(X - 9, Y - 36, Y - 10, '#8a8480')
  g.vline(X - 8, Y - 36, Y - 10, '#bdb2ae')
  if (o.golden && Math.floor(t * 6) % 2) {
    g.px(X + 7, Y - 12, '#ffffff')
    g.px(X - 6, Y - 9, '#fff3a6')
  }
}

/** A spark at the top of a car pole (lights pass). */
export function drawPoleSpark(g: Surface, x: number, y: number, t: number, i: number) {
  if ((Math.floor(t * 14) + i * 3) % 5 !== 0) return
  const X = Math.round(x - 6)
  const Y = Math.round(y - 23)
  g.px(X, Y, '#ffffff')
  g.px(X - 1, Y, '#9fd0ff')
  g.px(X + 1, Y - 1, '#9fd0ff')
  g.px(X, Y - 1, '#e8f8ff')
}
