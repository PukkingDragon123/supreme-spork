// งานวัด (the temple fair) – a night fair in the temple grounds: the ferris
// wheel (ชิงช้าสวรรค์) and carousel (ม้าหมุน) drawn every frame, the likay
// stage with a painted palace backdrop, the game booths (balloon darts, ring
// toss, cork gun) and the prize booth, the dunk tank with the mascot uncle,
// the haunted house (ผีบ้าน), food carts, the entrance arch full of bulbs.

import type { Color, Surface } from '../../engine/pixel'
import { avatarSprite, type AvatarLook } from '../avatar'
import { drawShadow } from '../props'
import { drawMiniHippo, hprop, hsh, INK, mix, ramp, type HubProp } from './hub-kit'

const BULBS: Color[] = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#ffb35a', '#c8a0ff']

function bulb(g: Surface, x: number, y: number, i: number, t: number, lit = true) {
  const on = lit && (Math.floor(t * 4) + i) % 3 !== 0
  g.px(Math.round(x), Math.round(y), on ? BULBS[i % BULBS.length] : mix(BULBS[i % BULBS.length], '#3a3048', 0.6))
}

// ---------------------------------------------------------------------------
// Ferris wheel.

/** The ferris wheel: A-frame legs, rotating spokes and hanging cabins. (cx, cy) = hub. */
export function drawBigWheel(g: Surface, cx: number, cy: number, r: number, t: number, riders: AvatarLook[] = []) {
  const frame = '#8a86c0'
  const frameD = '#5a5690'
  const gy = cy + r + 16
  // Legs (two A-frames, back one darker).
  for (const [dx, c] of [
    [-3, frameD],
    [3, frame],
  ] as const) {
    g.thickLine(cx + dx, cy, cx + dx - r * 0.55, gy, 2, c)
    g.thickLine(cx + dx, cy, cx + dx + r * 0.55, gy, 2, c)
  }
  g.hline(Math.round(cx - r * 0.5), Math.round(cx + r * 0.5), Math.round(cy + r * 0.6), frameD)
  // Rim (double ring) with bulbs.
  const a0 = t * 0.18
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2
    g.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), frame)
    g.px(Math.round(cx + Math.cos(a) * (r - 3)), Math.round(cy + Math.sin(a) * (r - 3)), frameD)
  }
  const N = 12
  for (let i = 0; i < N; i++) {
    const a = a0 + (i / N) * Math.PI * 2
    // Spoke.
    for (let k = 3; k < r - 2; k += 2) g.px(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), k % 4 ? frame : frameD)
    // Bulbs along the spoke.
    for (let k = 8; k < r - 3; k += 9) bulb(g, cx + Math.cos(a) * k, cy + Math.sin(a) * k, i + k, t)
    bulb(g, cx + Math.cos(a + 0.13) * r, cy + Math.sin(a + 0.13) * r, i * 2, t)
  }
  // Cabins hang below each rim point (always upright).
  for (let i = 0; i < N; i++) {
    const a = a0 + (i / N) * Math.PI * 2
    const x = Math.round(cx + Math.cos(a) * r)
    const y = Math.round(cy + Math.sin(a) * r)
    const sway = Math.round(Math.sin(t * 1.3 + i) * 0.6)
    const c = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#f58f35'][i % 6]
    g.vline(x, y, y + 2, '#bdb2ae')
    g.rect(x - 4 + sway, y + 2, 9, 3, mix(c, '#ffffff', 0.3))
    g.rect(x - 4 + sway, y + 5, 9, 5, c)
    g.hline(x - 4 + sway, x + 4 + sway, y + 9, mix(c, INK, 0.35))
    const rider = riders[i % Math.max(1, riders.length)]
    if (rider && i % 3 === 0) {
      g.px(x - 1 + sway, y + 3, '#f0bd90')
      g.px(x + 1 + sway, y + 3, '#f0bd90')
      g.px(x - 1 + sway, y + 2, INK)
    } else g.rect(x - 2 + sway, y + 3, 5, 1, '#fff6c8')
  }
  // Hub.
  g.circle(cx, cy, 4, frameD)
  g.circle(cx, cy, 2.5, '#ffd54f')
  g.px(cx, cy, '#fff3a6')
  // Base platform + ticket kiosk.
  g.rect(Math.round(cx - r * 0.7), gy - 1, Math.round(r * 1.4), 4, '#6a6374')
  g.hline(Math.round(cx - r * 0.7), Math.round(cx + r * 0.7), gy - 1, '#8c8187')
  g.rect(cx - 7, gy - 12, 14, 11, '#e8514a')
  g.rect(cx - 5, gy - 10, 10, 5, '#fff6c8')
  g.rect(cx - 8, gy - 14, 16, 2, '#ffd23f')
}

// ---------------------------------------------------------------------------
// Carousel.

/** Carousel (ม้าหมุน) with bobbing horses; (cx, gy) = ground centre. */
export function drawCarousel(g: Surface, cx: number, gy: number, t: number, riders: AvatarLook[] = []) {
  const R = 40
  const top = gy - 58
  const a0 = t * 0.6
  // Back half of the horses first (behind the pole).
  const horse = (a: number, i: number, front: boolean) => {
    const s = Math.sin(a)
    if (front !== s > 0) return
    const x = Math.round(cx + Math.cos(a) * (R - 8))
    const bob = Math.round(Math.sin(t * 3 + i * 1.7) * 2)
    const y = Math.round(gy - 14 + s * 6) + bob
    const c = ['#fffaf0', '#ff9fc0', '#ffd23f', '#9fd0ff'][i % 4]
    const dir = Math.cos(a) > 0 ? -1 : 1
    g.vline(x, top + 16, y - 6, '#ffd54f')
    g.rect(x - 4, y - 6, 9, 4, c)
    g.rect(x + dir * 4 - 1, y - 9, 3, 4, c)
    g.px(x + dir * 5, y - 9, INK)
    g.rect(x + dir * 4 - 1, y - 10, 2, 1, mix(c, INK, 0.3))
    g.vline(x - 3, y - 2, y, mix(c, INK, 0.3))
    g.vline(x + 3, y - 2, y, mix(c, INK, 0.3))
    g.px(x - dir * 5, y - 5, mix(c, INK, 0.3))
    g.px(x, y - 7, '#e8514a')
    const rider = riders[i % Math.max(1, riders.length)]
    if (rider && i % 2 === 0) {
      const sp = avatarSprite(rider, 'side', 'sit', { flip: dir < 0 })
      g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - 6 - sp.h + 10))
    }
  }
  // Platform.
  g.ellipse(cx, gy - 2, R + 2, 9, '#6a4a3a')
  g.ellipse(cx, gy - 3, R, 8, '#c8704c')
  g.ellipse(cx, gy - 4, R - 2, 6.5, '#e8b070')
  for (let i = 0; i < 8; i++) horse(a0 + (i / 8) * Math.PI * 2, i, false)
  // Centre column with mirrors.
  g.rect(cx - 7, top + 12, 14, gy - top - 16, '#e8514a')
  for (let y = top + 16; y < gy - 8; y += 6) g.rect(cx - 5, y, 10, 3, '#fff6c8')
  for (let i = 0; i < 8; i++) horse(a0 + (i / 8) * Math.PI * 2, i, true)
  // Striped canopy with a scalloped rim and bulbs.
  for (let y = 0; y < 16; y++) {
    const half = 8 + y * 2.3
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const k = Math.floor(((x - cx) / Math.max(1, half)) * 4 + 8)
      g.px(x, top + y, k % 2 ? '#e8514a' : '#fffaf0')
    }
  }
  for (let x = cx - R - 2; x <= cx + R + 2; x += 4) {
    g.rect(x, top + 16, 4, 2, Math.floor((x - cx) / 4) % 2 ? '#e8514a' : '#ffd23f')
    g.px(x + 1, top + 18, '#ffd23f')
  }
  for (let i = 0; i < 20; i++) bulb(g, cx - R + i * 4.2, top + 19, i, t)
  g.vline(cx, top - 8, top, '#ffd54f')
  g.circle(cx, top - 9, 2, '#ff6f91')
}

// ---------------------------------------------------------------------------
// Static booths (props).

/** Likay stage (anchor: centre front of the stage). Hooks: `floor` (performer spots). */
export function likayStage(): HubProp {
  const W = 124
  const H = 86
  return hprop('fair:likay', W, H, W / 2, H - 1, (g, hooks) => {
    // Stage deck.
    g.rect(0, H - 22, W, 22, '#6a4a3a')
    g.rect(0, H - 22, W, 3, '#8a6a4a')
    for (let x = 4; x < W; x += 10) g.vline(x, H - 19, H - 1, '#4a3128')
    g.rect(0, H - 4, W, 4, '#3a2a2a')
    // Painted backdrop: a palace with a moon.
    g.rect(8, 10, W - 16, H - 32, '#2a3a6a')
    g.circle(W - 28, 22, 6, '#fff6c8')
    g.rect(24, 30, 40, 24, '#e8e0d4')
    g.poly([[20, 30], [44, 14], [68, 30]], '#c8543a')
    g.poly([[36, 20], [44, 8], [52, 20]], '#ffd54f')
    g.rect(38, 38, 12, 16, '#8a2335')
    for (let x = 72; x < W - 14; x += 10) g.circle(x, H - 34, 5, '#2e6a4a')
    // Red curtains with gold trim.
    for (const [x0, dir] of [
      [0, 1],
      [W - 16, -1],
    ] as const) {
      for (let x = 0; x < 16; x++) {
        const c = x % 4 === 0 ? '#8a2335' : '#c8343f'
        g.vline(x0 + x, 6, H - 22 - (dir > 0 ? x * 0.5 : (15 - x) * 0.5), c)
      }
      g.vline(dir > 0 ? x0 + 15 : x0, 6, H - 30, '#ffd54f')
    }
    // Top valance + sign.
    g.rect(0, 0, W, 8, '#c8343f')
    for (let x = 0; x < W; x += 6) g.poly([[x, 8], [x + 6, 8], [x + 3, 11]], '#ffd54f')
    g.rect(W / 2 - 24, 1, 48, 6, '#ffd54f')
    for (let i = 0; i < 6; i++) g.rect(W / 2 - 20 + i * 7, 3, 5, 1, '#8a2335')
    // Speakers.
    for (const x of [2, W - 12]) {
      g.rect(x, H - 40, 10, 16, '#2a2a30')
      g.circle(x + 5, H - 35, 2.5, '#5a5a64')
      g.circle(x + 5, H - 28, 2, '#5a5a64')
    }
    hooks.floor = [{ x: W / 2 - 26, y: H - 10 }, { x: W / 2, y: H - 8 }, { x: W / 2 + 26, y: H - 10 }]
    hooks.bulbs = Array.from({ length: 20 }, (_, i) => ({ x: 3 + i * 6, y: 12 }))
  })
}

export type BoothKind = 'darts' | 'rings' | 'cork' | 'prizes'

/** Game booth (anchor: centre ground). Hooks: `bulbs`. */
export function gameBooth(kind: BoothKind): HubProp {
  const W = kind === 'prizes' ? 80 : 68
  const H = 64
  return hprop(`fair:booth:${kind}`, W, H, W / 2, H - 1, (g, hooks) => {
    const col = { darts: '#e8514a', rings: '#3d63b5', cork: '#43905a', prizes: '#6a4fb0' }[kind]
    const R = ramp(col)
    // Frame.
    g.rect(1, 12, 3, H - 12, R.d)
    g.rect(W - 4, 12, 3, H - 12, R.d)
    g.rect(4, 14, W - 8, H - 30, '#2a2030')
    // Striped roof.
    for (let y = 0; y < 12; y++) {
      const inset = Math.round((11 - y) * 0.5)
      for (let x = inset; x < W - inset; x++) g.px(x, y, Math.floor(x / 6) % 2 ? R.b : '#fffaf0')
    }
    for (let x = 0; x < W; x += 6) g.poly([[x, 12], [x + 6, 12], [x + 3, 15]], Math.floor(x / 6) % 2 ? R.b : '#fffaf0')
    // Sign board.
    g.rect(W / 2 - 20, 1, 40, 8, '#ffd54f')
    g.frame(W / 2 - 20, 1, 40, 8, R.D)
    for (let i = 0; i < 5; i++) g.rect(W / 2 - 16 + i * 7, 4, 5, 2, R.D)
    // Back wall contents.
    if (kind === 'darts') {
      g.rect(8, 17, W - 16, H - 36, '#e8d0a8')
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 9; i++) {
          const c = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#c8a0ff'][(i + j * 2) % 6]
          const x = 12 + i * 5.4 + (j % 2) * 2
          const y = 21 + j * 6
          g.circle(Math.round(x), y, 2.2, c)
          g.px(Math.round(x) - 1, y - 1, '#ffffff')
        }
    } else if (kind === 'rings') {
      for (let s = 0; s < 3; s++) {
        const y = H - 22 - s * 8
        g.rect(8 + s * 6, y, W - 16 - s * 12, 3, '#c8a878')
        for (let x = 12 + s * 6; x < W - 12 - s * 6; x += 6) {
          const c = s === 2 ? '#ffd54f' : ['#43905a', '#9fd8c0', '#8a5a3a'][(x + s) % 3]
          g.rect(x, y - 6, 3, 6, c)
          g.rect(x + 1, y - 8, 1, 2, c)
        }
      }
    } else if (kind === 'cork') {
      for (let s = 0; s < 3; s++) {
        const y = 24 + s * 9
        g.rect(8, y, W - 16, 2, '#c8a878')
        for (let x = 11; x < W - 11; x += 7) {
          const k = hsh(x, s, 3) % 4
          const c = ['#e8514a', '#ffd23f', '#5a8de0', '#ff9fc0'][k]
          if (k === 0) g.rect(x, y - 5, 4, 5, c)
          else if (k === 1) g.circle(x + 2, y - 3, 2.5, c)
          else g.rect(x, y - 6, 3, 6, c)
        }
      }
    } else {
      // Prize shelves: giant plush, hippos, goldfish bags.
      g.circle(18, 30, 9, '#ff9fc0')
      g.circle(18, 20, 6, '#ff9fc0')
      g.px(15, 19, INK)
      g.px(21, 19, INK)
      g.circle(12, 15, 2, '#ff9fc0')
      g.circle(24, 15, 2, '#ff9fc0')
      drawMiniHippo(g, 42, 40, '#8a8098', 2)
      g.circle(62, 30, 7, '#c9a06a')
      g.circle(62, 22, 5, '#c9a06a')
      g.px(60, 21, INK)
      g.px(64, 21, INK)
      for (let x = 10; x < W - 8; x += 9) {
        g.vline(x, 15, 17, '#fffaf0')
        g.ellipse(x, 20, 2.5, 3, '#d4f1ff')
        g.px(x, 20, '#f58f35')
      }
    }
    // Counter.
    g.rect(2, H - 16, W - 4, 4, '#fff1d6')
    g.hline(2, W - 3, H - 16, '#ffffff')
    g.rect(3, H - 12, W - 6, 12, R.b)
    for (let x = 6; x < W - 4; x += 8) g.rect(x, H - 10, 4, 8, R.d)
    if (kind === 'cork') {
      // Cork guns on the counter.
      for (const x of [14, W - 22]) {
        g.rect(x, H - 19, 10, 2, '#6e4a35')
        g.rect(x + 8, H - 20, 3, 4, '#8a5a3a')
      }
    } else if (kind === 'rings') {
      for (let x = 12; x < W - 10; x += 12) {
        g.circle(x, H - 18, 2.5, '#ffd23f')
        g.circle(x, H - 18, 1.2, '#fff1d6')
      }
    } else if (kind === 'darts') {
      for (let x = 12; x < W - 10; x += 10) g.line(x, H - 18, x + 4, H - 20, '#8a8480')
    }
    hooks.bulbs = Array.from({ length: Math.floor(W / 5) }, (_, i) => ({ x: 2 + i * 5, y: 15 }))
  })
}

/** Dunk tank with the seat and target (the mascot uncle is drawn by the gag). */
export function dunkTank(): HubProp {
  return hprop('fair:dunk', 60, 56, 30, 55, (g, hooks) => {
    // Cage + tank.
    g.rect(6, 18, 34, 36, '#9fd8f0')
    g.rect(6, 18, 34, 6, '#c8ecf8')
    for (let x = 6; x <= 40; x += 4) g.vline(x, 8, 54, '#8a8480')
    g.hline(6, 40, 8, '#8a8480')
    g.rect(4, 50, 38, 5, '#e8514a')
    g.hline(4, 41, 50, '#ff8a70')
    // Seat plank.
    g.rect(8, 22, 22, 2, '#c8a878')
    // Target on a pole (right).
    g.vline(52, 10, 54, '#8a8480')
    g.circle(52, 14, 6, '#e8514a')
    g.circle(52, 14, 4, '#fffaf0')
    g.circle(52, 14, 2, '#e8514a')
    // Ball bucket.
    g.rect(44, 46, 10, 8, '#3d63b5')
    for (let i = 0; i < 3; i++) g.circle(46 + i * 3, 45, 1.5, '#ffd23f')
    hooks.seat = [{ x: 19, y: 22 }]
    hooks.water = [{ x: 23, y: 26 }]
    hooks.target = [{ x: 52, y: 14 }]
  })
}

/** Haunted house (ผีบ้าน) façade with a giant face for a door (anchor: centre ground). */
export function hauntedHouse(): HubProp {
  const W = 96
  const H = 80
  return hprop('fair:ghost', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    g.rect(4, 20, W - 8, H - 20, '#3a2a48')
    for (let x = 8; x < W - 6; x += 7) g.vline(x, 22, H - 1, '#2e2040')
    // Crooked roof and a turret.
    g.poly([[0, 22], [cx - 6, 6], [cx + 10, 10], [W, 24]], '#4a3a5a')
    g.poly([[cx - 6, 6], [cx - 2, -2 + 2], [cx + 2, 6]], '#5a4a6a')
    g.rect(W - 26, 6, 12, 18, '#3a2a48')
    g.poly([[W - 28, 7], [W - 20, 0], [W - 12, 7]], '#4a3a5a')
    g.rect(W - 23, 12, 5, 6, '#c8ff8a')
    // Drippy sign.
    g.rect(cx - 26, 12, 52, 10, '#1e1428')
    for (let i = 0; i < 6; i++) {
      const x = cx - 22 + i * 8
      g.rect(x, 14, 6, 2, '#c8ff8a')
      g.vline(x + (i % 3), 16, 18 + (i % 2) * 2, '#c8ff8a')
    }
    // The face: eyes (windows) and the mouth door.
    g.ellipse(cx - 16, 36, 8, 6, '#1e1428')
    g.ellipse(cx + 16, 36, 8, 6, '#1e1428')
    g.circle(cx - 16, 37, 3, '#fff6c8')
    g.circle(cx + 16, 37, 3, '#fff6c8')
    g.px(cx - 16, 37, '#e8514a')
    g.px(cx + 16, 37, '#e8514a')
    g.poly([[cx - 22, H - 26], [cx + 22, H - 26], [cx + 16, H - 1], [cx - 16, H - 1]], '#140c1c')
    for (let x = cx - 20; x < cx + 20; x += 6) g.poly([[x, H - 26], [x + 6, H - 26], [x + 3, H - 20]], '#fffaf0')
    // Cobwebs, bats, a coffin by the door.
    g.line(4, 20, 16, 30, '#bdb2ae')
    g.line(4, 26, 12, 20, '#bdb2ae')
    g.rect(W - 18, H - 22, 10, 21, '#6e4a35')
    g.vline(W - 13, H - 20, H - 4, '#e8e0d4')
    g.hline(W - 16, W - 10, H - 16, '#e8e0d4')
    hooks.door = [{ x: cx, y: H - 6 }]
    hooks.eyes = [{ x: cx - 16, y: 37 }, { x: cx + 16, y: 37 }]
  })
}

/** Fair entrance arch covered in bulbs (anchor: centre ground). Hooks: `bulbs`. */
export function fairGate(): HubProp {
  const W = 120
  const H = 72
  return hprop('fair:gate', W, H, W / 2, H - 1, (g, hooks) => {
    const cx = W / 2
    for (const x of [4, W - 12]) {
      g.rect(x, 20, 8, H - 20, '#c8343f')
      g.vline(x + 1, 20, H - 1, '#e8514a')
      g.vline(x + 6, 20, H - 1, '#8a2335')
    }
    // Arched top in gold with a sign.
    for (let x = 0; x < W; x++) {
      const y = Math.round(18 - Math.sin((x / W) * Math.PI) * 14)
      g.vline(x, y, y + 6, '#ffd54f')
      g.px(x, y, '#fff3a6')
      g.px(x, y + 6, '#b8742a')
    }
    g.rect(cx - 34, 8, 68, 14, '#8a2335')
    g.frame(cx - 34, 8, 68, 14, '#ffd54f')
    for (let i = 0; i < 9; i++) {
      const x = cx - 28 + i * 7
      g.rect(x, 12, 5, 1, '#fff6c8')
      g.rect(x + (i % 2) * 4, 13, 1, 4, '#fff6c8')
      g.px(x + 2, 11, '#fff6c8')
    }
    g.circle(cx, 2, 3, '#ffd54f')
    const bulbs: { x: number; y: number }[] = []
    for (let x = 2; x < W; x += 5) bulbs.push({ x, y: Math.round(18 - Math.sin((x / W) * Math.PI) * 14) + 8 })
    for (let y = 26; y < H - 4; y += 6) {
      bulbs.push({ x: 8, y })
      bulbs.push({ x: W - 8, y })
    }
    hooks.bulbs = bulbs
  })
}

export type CartKind = 'icepop' | 'saimai' | 'lookchin' | 'popcorn'

/** Fair food carts (anchor: centre ground). */
export function fairCart(kind: CartKind): HubProp {
  return hprop(`fair:cart:${kind}`, 40, 44, 20, 43, (g, hooks) => {
    const body = { icepop: '#5a8de0', saimai: '#ff9fc0', lookchin: '#e8514a', popcorn: '#ffd23f' }[kind]
    const R = ramp(body)
    g.rect(3, 24, 34, 14, R.b)
    g.hline(3, 36, 24, R.L)
    g.rect(3, 36, 34, 2, R.D)
    g.rect(7, 27, 22, 6, '#fffaf0')
    g.hline(9, 26, 29, R.d)
    g.circle(9, 40, 3, '#3a3040')
    g.circle(31, 40, 3, '#3a3040')
    if (kind === 'icepop') {
      // Freezer with colourful tube ice pops.
      g.rect(6, 17, 28, 7, '#e8f4ff')
      for (let x = 8; x < 33; x += 3) g.rect(x, 12 + (x % 2), 2, 6, ['#e8514a', '#6cc36a', '#9fd0ff', '#ffd23f', '#c8a0ff'][(x / 3) % 5 | 0])
      g.vline(20, 2, 16, '#8a8480')
      for (let i = 0; i < 7; i++) g.hline(20 - (7 - i) * 2, 20 + (7 - i) * 2, 2 + i, i % 2 ? '#fffaf0' : '#5a8de0')
    } else if (kind === 'saimai') {
      g.rect(8, 16, 24, 8, '#d4f1ff')
      g.circle(20, 20, 5, '#ffd6e0')
      for (const [x, c] of [
        [8, '#ff9fc0'],
        [16, '#c8e8ff'],
        [26, '#ffb8d0'],
        [33, '#e2d2ff'],
      ] as const) {
        g.vline(x, 8, 16, '#e0c080')
        g.circle(x, 6, 4, c)
        g.px(x - 1, 4, '#ffffff')
      }
    } else if (kind === 'lookchin') {
      g.rect(5, 19, 30, 5, '#3a3040')
      for (let x = 7; x < 34; x += 2) g.px(x, 20, x % 4 ? '#ff7a3a' : '#ffd23f')
      for (let x = 8; x < 34; x += 4) {
        g.vline(x, 10, 19, '#e0c080')
        g.circle(x, 13, 1.5, '#c8784a')
        g.circle(x, 16, 1.5, '#c8784a')
      }
      g.rect(30, 12, 6, 7, '#e8514a')
    } else {
      g.rect(8, 6, 24, 18, '#d4f1ff')
      g.frame(8, 6, 24, 18, '#e8514a')
      for (let i = 0; i < 28; i++) g.circle(10 + (i * 7) % 20, 12 + ((i * 3) % 10), 1.4, i % 3 ? '#fff6d0' : '#ffe27a')
      g.rect(8, 2, 24, 4, '#e8514a')
      for (let x = 8; x < 32; x += 4) g.rect(x, 2, 2, 4, '#fffaf0')
    }
    hooks.steam = [{ x: 20, y: 8 }]
  })
}

/** Ramwong dance floor (baked): a round wooden floor with a flower table spot. */
export function ramwongFloor(g: Surface, cx: number, cy: number, rx: number, ry: number) {
  g.ellipse(cx, cy, rx + 3, ry + 2, '#4a3128')
  g.ellipse(cx, cy, rx, ry, '#a86a3e')
  for (let r = rx - 8; r > 0; r -= 8) {
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      g.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * (ry / rx)), '#8a522e')
    }
  }
}

/** The flower table in the middle of the ramwong circle, with a drum (โทน). */
export function ramwongTable(): HubProp {
  return hprop('fair:ramwong', 30, 26, 15, 25, (g) => {
    g.rect(4, 12, 22, 4, '#fffaf0')
    g.rect(5, 16, 1, 9, '#8a8480')
    g.rect(24, 16, 1, 9, '#8a8480')
    g.rect(12, 6, 6, 6, '#e8e0d4')
    for (const [x, y, c] of [
      [13, 3, '#ff9fc0'],
      [16, 2, '#ffd23f'],
      [11, 5, '#e8514a'],
      [18, 5, '#fffaf0'],
    ] as const)
      g.circle(x, y, 2, c)
    // Drum.
    g.ellipse(24, 19, 4, 2, '#e0c8a0')
    g.rect(21, 19, 6, 5, '#8a2335')
  })
}

/** A seated audience member drawn on a mat (helper for the likay crowd). */
export function drawSeated(g: Surface, lk: AvatarLook, x: number, y: number, t: number, cheer = false) {
  const sp = avatarSprite(lk, 'back', cheer && Math.floor(t * 4) % 2 ? 'happy' : 'sit')
  drawShadow(g, x, y, 5, 1.5)
  g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1))
}
