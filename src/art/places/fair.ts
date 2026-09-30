// งานวัด (the temple fair) – static props of the night fair. Most props come
// as a pair: the outlined `base` sprite and a `lit` layer with only the parts
// that glow (signs, lit booth interiors, bulbs, lamps, glass cases). The map
// draws the lit layers after the night tint, so the fair really shines.
//
// Rides and moving things live in fair-rides.ts, fireworks in
// fair-fireworks.ts, the haunted house interior in fair-ghost.ts.

import { createCanvas, type Color, type Surface } from '../../engine/pixel'
import { outlineCanvas, type Sprite } from '../../engine/sprite'
import { avatarSprite, type AvatarLook } from '../avatar'
import { drawShadow } from '../props'
import { drawMiniHippo, hprop, hsh, INK, mix, pennants, ramp, type HubProp, type Pt } from './hub-kit'

export { INK }

export const BULBS: Color[] = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#ffb35a', '#c8a0ff']

/** One blinking bulb (chase pattern by index). */
export function bulb(g: Surface, x: number, y: number, i: number, t: number, lit = true) {
  const on = lit && (Math.floor(t * 4) + i) % 3 !== 0
  g.px(Math.round(x), Math.round(y), on ? BULBS[i % BULBS.length] : mix(BULBS[i % BULBS.length], '#3a3048', 0.6))
}

/** A prop and its glowing layer (same anchor; `lit` has no outline). */
export interface LitProp {
  base: HubProp
  lit: HubProp
}

/**
 * Build a prop twice: once whole (outlined) and once with only the emissive
 * parts (`lit` = true: skip everything that does not glow).
 */
export function litPair(key: string, w: number, h: number, ax: number, ay: number, fn: (g: Surface, hooks: Record<string, Pt[]>, lit: boolean) => void): LitProp {
  return {
    base: hprop(key, w, h, ax, ay, (g, hooks) => fn(g, hooks, false)),
    lit: hprop(`${key}:lit`, w, h, ax, ay, (g, hooks) => fn(g, hooks, true), false),
  }
}

/** Pseudo lettering (the fair's hand-painted Thai signs, unreadable at this size). */
export function letters(g: Surface, x: number, y: number, w: number, c: Color, seed = 0) {
  let cx = x
  let i = 0
  while (cx < x + w - 2) {
    const v = hsh(i, seed, 5)
    const gw = 2 + (v % 3)
    g.rect(cx, y + 1, gw, 2, c)
    if (v % 4 === 0) g.px(cx + gw - 1, y, c)
    if (v % 5 === 1) g.px(cx, y + 3, c)
    cx += gw + 1
    i++
  }
}

// ---------------------------------------------------------------------------
// Likay stage.

/** Likay stage (anchor: centre front). Hooks: `floor` (performer spots), `bulbs`. */
export function likayStage(): LitProp {
  const W = 124
  const H = 86
  return litPair('fair:likay', W, H, W / 2, H - 1, (g, hooks, lit) => {
    if (!lit) {
      g.rect(0, H - 22, W, 22, '#6a4a3a')
      g.rect(0, H - 22, W, 3, '#8a6a4a')
      for (let x = 4; x < W; x += 10) g.vline(x, H - 19, H - 1, '#4a3128')
      g.rect(0, H - 4, W, 4, '#3a2a2a')
    }
    // Painted backdrop: a palace under a moon, glittering.
    g.rect(8, 10, W - 16, H - 32, '#2a3a6a')
    for (let i = 0; i < 26; i++) {
      const v = hsh(i, 7, 2)
      g.px(10 + (v % (W - 20)), 12 + ((v >> 4) % 20), i % 3 ? '#9fb0e0' : '#fff6c8')
    }
    g.circle(W - 28, 22, 6, '#fff6c8')
    g.circle(W - 26, 21, 5, '#fffbe0')
    g.rect(24, 30, 40, 24, '#e8e0d4')
    g.poly([[20, 30], [44, 14], [68, 30]], '#c8543a')
    g.poly([[36, 20], [44, 8], [52, 20]], '#ffd54f')
    g.rect(38, 38, 12, 16, '#8a2335')
    for (const x of [28, 56]) g.rect(x, 36, 5, 7, '#6a86c0')
    for (let x = 72; x < W - 14; x += 10) g.circle(x, H - 34, 5, '#2e6a4a')
    if (!lit) {
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
      g.rect(0, 0, W, 8, '#c8343f')
      for (let x = 0; x < W; x += 6) g.poly([[x, 8], [x + 6, 8], [x + 3, 11]], '#ffd54f')
      for (const x of [2, W - 12]) {
        g.rect(x, H - 40, 10, 16, '#2a2a30')
        g.circle(x + 5, H - 35, 2.5, '#5a5a64')
        g.circle(x + 5, H - 28, 2, '#5a5a64')
      }
    }
    // The troupe's sign: ดาวเลื่อม.
    g.rect(W / 2 - 24, 1, 48, 6, '#ffd54f')
    letters(g, W / 2 - 21, 2, 42, '#8a2335', 3)
    // Footlights.
    for (let x = 6; x < W - 4; x += 8) {
      g.rect(x, H - 23, 3, 1, '#fff6c8')
      g.px(x + 1, H - 24, '#ffffff')
    }
    hooks.floor = [{ x: W / 2 - 26, y: H - 10 }, { x: W / 2, y: H - 8 }, { x: W / 2 + 26, y: H - 10 }]
    hooks.bulbs = Array.from({ length: 20 }, (_, i) => ({ x: 3 + i * 6, y: 12 }))
  })
}

// ---------------------------------------------------------------------------
// Game booths.

export type BoothKind = 'darts' | 'rings' | 'cork' | 'scoop' | 'prizes'

/** Game booth (anchor: centre ground). Hooks: `bulbs`. */
export function gameBooth(kind: BoothKind): LitProp {
  const W = kind === 'prizes' ? 80 : 68
  const H = 64
  return litPair(`fair:booth:${kind}`, W, H, W / 2, H - 1, (g, hooks, lit) => {
    const col = { darts: '#e8514a', rings: '#3d63b5', cork: '#43905a', scoop: '#2a9ac8', prizes: '#6a4fb0' }[kind]
    const R = ramp(col)
    if (!lit) {
      g.rect(1, 12, 3, H - 12, R.d)
      g.rect(W - 4, 12, 3, H - 12, R.d)
      for (let y = 0; y < 12; y++) {
        const inset = Math.round((11 - y) * 0.5)
        for (let x = inset; x < W - inset; x++) g.px(x, y, Math.floor(x / 6) % 2 ? R.b : '#fffaf0')
      }
      for (let x = 0; x < W; x += 6) g.poly([[x, 12], [x + 6, 12], [x + 3, 15]], Math.floor(x / 6) % 2 ? R.b : '#fffaf0')
    }
    // Lit interior.
    g.rect(4, 14, W - 8, H - 30, '#3a2e48')
    // Sign board.
    g.rect(W / 2 - 20, 1, 40, 8, '#ffd54f')
    g.frame(W / 2 - 20, 1, 40, 8, R.D)
    letters(g, W / 2 - 17, 3, 34, R.D, kind.length)
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
      // A dartboard on the side.
      g.circle(W - 11, 20, 4, '#3a3040')
      g.circle(W - 11, 20, 3, '#fffaf0')
      g.circle(W - 11, 20, 1.5, '#e8514a')
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
      // Ducks on the rail.
      for (let x = 10; x < W - 10; x += 12) {
        g.ellipse(x, H - 21, 3, 2, '#ffd23f')
        g.px(x + 2, H - 23, '#ffd23f')
        g.px(x + 3, H - 23, '#f58f35')
      }
    } else if (kind === 'scoop') {
      // Goldfish bags hanging in rows, a lit aquarium wall.
      g.rect(8, 16, W - 16, H - 34, '#1e5a8a')
      for (let i = 0; i < 18; i++) {
        const v = hsh(i, 9, 4)
        g.px(10 + (v % (W - 20)), 18 + ((v >> 4) % (H - 38)), '#6ab8e8')
      }
      for (let j = 0; j < 2; j++)
        for (let x = 12 + j * 4; x < W - 10; x += 9) {
          const y = 22 + j * 10
          g.vline(x, y - 4, y - 2, '#fffaf0')
          g.ellipse(x, y + 1, 3, 3.5, '#bfe8ff')
          g.px(x - 1, y, '#e8f8ff')
          g.rect(x - 1, y + 1, 3, 2, (x + j) % 3 ? '#f58f35' : '#3a3048')
          g.px(x + 2, y + 2, (x + j) % 3 ? '#ff9a5a' : '#5a5068')
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
    if (!lit) {
      // Counter.
      g.rect(2, H - 16, W - 4, 4, '#fff1d6')
      g.hline(2, W - 3, H - 16, '#ffffff')
      g.rect(3, H - 12, W - 6, 12, R.b)
      for (let x = 6; x < W - 4; x += 8) g.rect(x, H - 10, 4, 8, R.d)
      if (kind === 'cork') {
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
      } else if (kind === 'scoop') {
        // The shallow tub on the counter.
        g.ellipse(W / 2, H - 17, W / 2 - 6, 4, '#5a8de0')
        g.ellipse(W / 2, H - 17.5, W / 2 - 8, 3, '#3aa0d8')
        for (let x = 12; x < W - 12; x += 7) g.rect(x + (x % 3), H - 18 + (x % 2), 2, 1, '#f58f35')
        for (const x of [6, W - 10]) {
          g.circle(x + 2, H - 20, 2, '#fffaf0')
          g.vline(x + 2, H - 18, H - 15, '#e0c080')
        }
      }
    }
    hooks.bulbs = Array.from({ length: Math.floor(W / 5) }, (_, i) => ({ x: 2 + i * 5, y: 15 }))
  })
}

// ---------------------------------------------------------------------------
// Dunk tank (สาวน้อยตกน้ำ).

/** Dunk tank with the seat and target (the mascot uncle is drawn by the map). */
export function dunkTank(): LitProp {
  return litPair('fair:dunk', 60, 64, 30, 63, (g, hooks, lit) => {
    const T = 8
    // "สาวน้อยตกน้ำ" sign with a heart.
    g.rect(4, 0, 38, 7, '#ff9fc0')
    letters(g, 7, 2, 26, '#8a2335', 11)
    g.circle(37, 3, 2, '#e8514a')
    if (!lit) {
      g.rect(6, 18 + T, 34, 36, '#9fd8f0')
      g.rect(6, 18 + T, 34, 6, '#c8ecf8')
      for (let x = 6; x <= 40; x += 4) g.vline(x, 8 + T, 54 + T, '#8a8480')
      g.hline(6, 40, 8 + T, '#8a8480')
      g.rect(4, 50 + T, 38, 5, '#e8514a')
      g.hline(4, 41, 50 + T, '#ff8a70')
      g.rect(8, 22 + T, 22, 2, '#c8a878')
      g.vline(52, 10 + T, 54 + T, '#8a8480')
      g.rect(44, 46 + T, 10, 8, '#3d63b5')
      for (let i = 0; i < 3; i++) g.circle(46 + i * 3, 45 + T, 1.5, '#ffd23f')
    } else {
      // The water glows under the fair lights.
      g.rect(7, 26 + T, 32, 26, '#6ac0e8')
    }
    // Target.
    g.circle(52, 14 + T, 6, '#e8514a')
    g.circle(52, 14 + T, 4, '#fffaf0')
    g.circle(52, 14 + T, 2, '#e8514a')
    hooks.seat = [{ x: 19, y: 22 + T }]
    hooks.water = [{ x: 23, y: 26 + T }]
    hooks.target = [{ x: 52, y: 14 + T }]
  })
}

// ---------------------------------------------------------------------------
// Haunted house (บ้านผีสิง).

/** Haunted house façade with a giant face for a door (anchor: centre ground). */
export function hauntedHouse(): LitProp {
  const W = 96
  const H = 80
  return litPair('fair:ghost', W, H, W / 2, H - 1, (g, hooks, lit) => {
    const cx = W / 2
    if (!lit) {
      g.rect(4, 20, W - 8, H - 20, '#3a2a48')
      for (let x = 8; x < W - 6; x += 7) g.vline(x, 22, H - 1, '#2e2040')
      g.poly([[0, 22], [cx - 6, 6], [cx + 10, 10], [W, 24]], '#4a3a5a')
      g.poly([[cx - 6, 6], [cx - 2, 0], [cx + 2, 6]], '#5a4a6a')
      g.rect(W - 26, 6, 12, 18, '#3a2a48')
      g.poly([[W - 28, 7], [W - 20, 0], [W - 12, 7]], '#4a3a5a')
      g.rect(cx - 26, 12, 52, 10, '#1e1428')
      g.ellipse(cx - 16, 36, 8, 6, '#1e1428')
      g.ellipse(cx + 16, 36, 8, 6, '#1e1428')
      g.poly([[cx - 22, H - 26], [cx + 22, H - 26], [cx + 16, H - 1], [cx - 16, H - 1]], '#140c1c')
      for (let x = cx - 20; x < cx + 20; x += 6) g.poly([[x, H - 26], [x + 6, H - 26], [x + 3, H - 20]], '#fffaf0')
      g.line(4, 20, 16, 30, '#bdb2ae')
      g.line(4, 26, 12, 20, '#bdb2ae')
      g.line(8, 21, 10, 28, '#bdb2ae')
      g.rect(W - 18, H - 22, 10, 21, '#6e4a35')
      g.vline(W - 13, H - 20, H - 4, '#e8e0d4')
      g.hline(W - 16, W - 10, H - 16, '#e8e0d4')
      // Pumpkin-ish lanterns (coconut shell lamps) by the door.
      for (const x of [cx - 30, cx + 28]) {
        g.circle(x, H - 6, 4, '#c86a2a')
        g.px(x - 1, H - 7, '#ffd23f')
        g.px(x + 1, H - 7, '#ffd23f')
      }
    }
    // Glowing bits: the turret window, the drippy sign, the eyes, lanterns.
    g.rect(W - 23, 12, 5, 6, '#c8ff8a')
    for (let i = 0; i < 6; i++) {
      const x = cx - 22 + i * 8
      g.rect(x, 14, 6, 2, '#c8ff8a')
      g.vline(x + (i % 3), 16, 18 + (i % 2) * 2, '#c8ff8a')
    }
    g.circle(cx - 16, 37, 3, '#fff6c8')
    g.circle(cx + 16, 37, 3, '#fff6c8')
    g.px(cx - 16, 37, '#e8514a')
    g.px(cx + 16, 37, '#e8514a')
    for (const x of [cx - 30, cx + 28]) {
      g.px(x - 1, H - 7, '#ffd23f')
      g.px(x + 1, H - 7, '#ffd23f')
      g.hline(x - 1, x + 1, H - 5, '#ffb35a')
    }
    hooks.door = [{ x: cx, y: H - 6 }]
    hooks.eyes = [{ x: cx - 16, y: 37 }, { x: cx + 16, y: 37 }]
  })
}

// ---------------------------------------------------------------------------
// Entrance arch.

/** Fair entrance arch covered in bulbs (anchor: centre ground). Hooks: `bulbs`. */
export function fairGate(): LitProp {
  const W = 120
  const H = 72
  return litPair('fair:gate', W, H, W / 2, H - 1, (g, hooks, lit) => {
    const cx = W / 2
    if (!lit) {
      for (const x of [4, W - 12]) {
        g.rect(x, 20, 8, H - 20, '#c8343f')
        g.vline(x + 1, 20, H - 1, '#e8514a')
        g.vline(x + 6, 20, H - 1, '#8a2335')
      }
      for (let x = 0; x < W; x++) {
        const y = Math.round(18 - Math.sin((x / W) * Math.PI) * 14)
        g.vline(x, y, y + 6, '#ffd54f')
        g.px(x, y, '#fff3a6')
        g.px(x, y + 6, '#b8742a')
      }
      g.circle(cx, 2, 3, '#ffd54f')
    }
    g.rect(cx - 34, 8, 68, 14, '#8a2335')
    g.frame(cx - 34, 8, 68, 14, '#ffd54f')
    letters(g, cx - 29, 11, 58, '#fff6c8', 21)
    letters(g, cx - 20, 16, 40, '#ffd54f', 22)
    const bulbs: Pt[] = []
    for (let x = 2; x < W; x += 5) bulbs.push({ x, y: Math.round(18 - Math.sin((x / W) * Math.PI) * 14) + 8 })
    for (let y = 26; y < H - 4; y += 6) {
      bulbs.push({ x: 8, y })
      bulbs.push({ x: W - 8, y })
    }
    hooks.bulbs = bulbs
  })
}

// ---------------------------------------------------------------------------
// Food carts.

export type CartKind = 'icepop' | 'saimai' | 'lookchin' | 'popcorn' | 'quail' | 'squid' | 'tokyo' | 'redsoda' | 'pressed' | 'takoyaki'

const CART_BODY: Record<CartKind, Color> = {
  icepop: '#5a8de0',
  saimai: '#ff9fc0',
  lookchin: '#e8514a',
  popcorn: '#ffd23f',
  quail: '#e8834a',
  squid: '#3d8a8a',
  tokyo: '#c8a0ff',
  redsoda: '#e8e0d4',
  pressed: '#f0b030',
  takoyaki: '#c8343f',
}

/** Fair food carts (anchor: centre ground). Hooks: `steam`, `vendor`, `lamp`. */
export function fairCart(kind: CartKind): LitProp {
  return litPair(`fair:cart:${kind}`, 40, 46, 20, 45, (g, hooks, lit) => {
    const body = CART_BODY[kind]
    const R = ramp(body)
    const Y = 2
    if (!lit) {
      g.rect(3, 24 + Y, 34, 14, R.b)
      g.hline(3, 36, 24 + Y, R.L)
      g.rect(3, 36 + Y, 34, 2, R.D)
      g.circle(9, 40 + Y, 3, '#3a3040')
      g.circle(31, 40 + Y, 3, '#3a3040')
      g.px(9, 40 + Y, '#bdb2ae')
      g.px(31, 40 + Y, '#bdb2ae')
    }
    // Menu strip on the front (lit).
    g.rect(7, 27 + Y, 22, 6, '#fffaf0')
    letters(g, 8, 28 + Y, 20, R.D, kind.length * 3)
    // A bare bulb on a stick.
    if (!lit) g.vline(35, 6, 24 + Y, '#8a8480')
    g.circle(35, 5, 1.5, '#fff3a6')
    g.px(35, 5, '#ffffff')
    const cook = (fn: () => void) => fn()
    if (kind === 'icepop') {
      cook(() => {
        g.rect(6, 17 + Y, 26, 7, '#e8f4ff')
        for (let x = 8; x < 31; x += 3) g.rect(x, 12 + (x % 2) + Y, 2, 6, ['#e8514a', '#6cc36a', '#9fd0ff', '#ffd23f', '#c8a0ff'][((x / 3) | 0) % 5])
        if (!lit) {
          g.vline(20, 2, 16, '#8a8480')
          for (let i = 0; i < 7; i++) g.hline(20 - (7 - i) * 2, 20 + (7 - i) * 2, 2 + i, i % 2 ? '#fffaf0' : '#5a8de0')
        }
      })
    } else if (kind === 'saimai') {
      g.rect(8, 16 + Y, 24, 8, '#d4f1ff')
      g.circle(20, 20 + Y, 5, '#ffd6e0')
      for (const [x, c] of [
        [8, '#ff9fc0'],
        [16, '#c8e8ff'],
        [26, '#ffb8d0'],
        [31, '#e2d2ff'],
      ] as const) {
        if (!lit) g.vline(x, 8, 16 + Y, '#e0c080')
        g.circle(x, 6, 4, c)
        g.px(x - 1, 4, '#ffffff')
      }
    } else if (kind === 'lookchin') {
      if (!lit) g.rect(5, 19 + Y, 30, 5, '#3a3040')
      for (let x = 7; x < 34; x += 2) g.px(x, 20 + Y, x % 4 ? '#ff7a3a' : '#ffd23f')
      if (!lit)
        for (let x = 8; x < 32; x += 4) {
          g.vline(x, 10, 19 + Y, '#e0c080')
          g.circle(x, 13, 1.5, '#c8784a')
          g.circle(x, 16, 1.5, '#c8784a')
        }
    } else if (kind === 'popcorn') {
      g.rect(8, 6, 24, 18 + Y, '#d4f1ff')
      g.frame(8, 6, 24, 18 + Y, '#e8514a')
      for (let i = 0; i < 28; i++) g.circle(10 + ((i * 7) % 20), 12 + ((i * 3) % 10), 1.4, i % 3 ? '#fff6d0' : '#ffe27a')
      g.rect(8, 2, 24, 4, '#e8514a')
      for (let x = 8; x < 32; x += 4) g.rect(x, 2, 2, 4, '#fffaf0')
    } else if (kind === 'quail') {
      // Dimpled pan of quail eggs over a blue flame.
      if (!lit) g.ellipse(18, 21 + Y, 13, 4, '#2a2830')
      for (let i = 0; i < 10; i++) {
        const x = 9 + (i % 5) * 4.5
        const y = 19 + Y + Math.floor(i / 5) * 3
        g.ellipse(x, y, 1.8, 1.2, '#fffaf0')
        g.px(Math.round(x), y, '#ffc83a')
      }
      g.hline(10, 26, 25 + Y, '#6ab8ff')
      if (!lit) {
        // Awning.
        for (let x = 2; x < 38; x += 4) g.rect(x, 8, 4, 4, Math.floor(x / 4) % 2 ? '#e8834a' : '#fffaf0')
        g.vline(3, 12, 24 + Y, '#8a8480')
      }
    } else if (kind === 'squid') {
      // Charcoal grill with squid on skewers.
      if (!lit) g.rect(5, 19 + Y, 28, 5, '#3a3040')
      for (let x = 6; x < 32; x += 2) g.px(x, 20 + Y, x % 6 ? '#ff7a3a' : '#ffd23f')
      for (let x = 9; x < 31; x += 6) {
        if (!lit) g.vline(x, 8, 19 + Y, '#e0c080')
        g.ellipse(x, 11, 2, 3.5, lit ? '#ffb07a' : '#e89a7a')
        for (let k = -1; k <= 1; k++) g.vline(x + k, 14, 17, '#d8826a')
        g.px(x - 1, 10, '#ffd0b8')
      }
    } else if (kind === 'tokyo') {
      // Flat griddle with rolled pancakes and a glass box of fillings.
      if (!lit) g.rect(5, 21 + Y, 28, 3, '#9a9aa8')
      g.hline(5, 32, 21 + Y, '#e8e8f0')
      for (let x = 8; x < 30; x += 5) {
        g.rect(x, 18 + Y, 4, 3, '#e8b870')
        g.px(x + 1, 18 + Y, x % 2 ? '#6cc36a' : '#ff9f6a')
      }
      g.rect(8, 10, 22, 7, '#d4f1ff')
      for (let x = 10; x < 28; x += 4) g.rect(x, 13, 3, 3, ['#6cc36a', '#ff9fc0', '#ffd23f'][(x / 4) % 3 | 0])
      if (!lit) g.frame(8, 10, 22, 7, '#a8c8d8')
    } else if (kind === 'redsoda') {
      // Bags of red soda hanging from a line, a cooler box.
      if (!lit) {
        g.hline(4, 34, 7, '#8a8480')
        g.vline(4, 7, 24 + Y, '#8a8480')
        g.rect(8, 17 + Y, 22, 7, '#5a8de0')
        g.rect(8, 17 + Y, 22, 2, '#fffaf0')
      }
      for (let x = 8; x < 32; x += 6) {
        g.vline(x, 8, 9, '#fffaf0')
        g.ellipse(x, 13, 2.5, 3.5, '#ff4a5a')
        g.px(x - 1, 11, '#ffc0c8')
        g.vline(x + 1, 7, 10, '#6cc36a')
      }
    } else if (kind === 'pressed') {
      // The hand-cranked squid press with a big wheel.
      if (!lit) {
        g.rect(8, 14, 16, 10 + Y, '#8a8a98')
        g.rect(9, 17, 14, 2, '#c8c8d0')
        g.rect(9, 20, 14, 2, '#c8c8d0')
        g.circle(28, 17, 5, '#5a5a64')
        g.circle(28, 17, 3.5, '#8a8a98')
        g.px(28, 17, '#3a3040')
        g.line(28, 17, 31, 12, '#3a3040')
      }
      for (let x = 10; x < 24; x += 5) {
        g.rect(x, 6, 4, 6, '#f0c090')
        g.hline(x, x + 3, 11, '#d89060')
      }
      if (!lit) g.hline(8, 26, 5, '#8a8480')
    } else {
      // Takoyaki: dimpled pan, a red noren with a white circle.
      if (!lit) {
        g.rect(4, 5, 32, 7, '#c8343f')
        for (let x = 4; x < 36; x += 8) g.vline(x, 5, 11, '#8a2335')
        g.circle(20, 8, 2.5, '#fffaf0')
        g.rect(5, 20 + Y, 26, 4, '#2a2830')
      }
      for (let i = 0; i < 8; i++) {
        const x = 8 + (i % 4) * 5
        const y = 19 + Y + Math.floor(i / 4) * 2
        g.circle(x, y, 1.8, '#c8864a')
        g.px(x, y - 1, lit ? '#ffd8a0' : '#e8b070')
      }
      g.px(12, 17 + Y, '#6a4a2a')
      g.px(19, 17 + Y, '#f0e0c0')
    }
    hooks.steam = [{ x: 20, y: 10 }]
    hooks.vendor = [{ x: 20, y: 22 }]
    hooks.lamp = [{ x: 35, y: 5 }]
  })
}

// ---------------------------------------------------------------------------
// Ramwong floor and table.

/** Ramwong dance floor (baked): a round wooden floor. */
export function ramwongFloor(g: Surface, cx: number, cy: number, rx: number, ry: number) {
  g.ellipse(cx, cy + 1, rx + 4, ry + 3, '#3a2620')
  g.ellipse(cx, cy, rx + 3, ry + 2, '#4a3128')
  g.ellipse(cx, cy, rx, ry, '#a86a3e')
  for (let r = rx - 8; r > 0; r -= 8) {
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2
      g.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * (ry / rx)), '#8a522e')
    }
  }
  // A painted lotus in the middle.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.ellipse(cx + Math.cos(a) * 7, cy + Math.sin(a) * 3.5, 3, 1.6, '#c8804e')
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
    g.ellipse(24, 19, 4, 2, '#e0c8a0')
    g.rect(21, 19, 6, 5, '#8a2335')
  })
}

/** A seated audience member (helper for the likay crowd). */
export function drawSeated(g: Surface, lk: AvatarLook, x: number, y: number, t: number, cheer = false) {
  const sp = avatarSprite(lk, 'back', cheer && Math.floor(t * 4) % 2 ? 'happy' : 'sit')
  drawShadow(g, x, y, 5, 1.5)
  g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1))
}

// ---------------------------------------------------------------------------
// Claw machines (ตู้คีบตุ๊กตา).

const CLAW_COLS: Color[] = ['#ff6fa8', '#5aa0f0', '#ffc83a', '#5ac88a']

/** A claw machine cabinet (anchor: centre ground). Hooks: `glass` (centre of the glass box). */
export function clawMachine(i: number): LitProp {
  const W = 22
  const H = 46
  const col = CLAW_COLS[i % CLAW_COLS.length]
  return litPair(`fair:claw:${i % CLAW_COLS.length}`, W, H, W / 2, H - 1, (g, hooks, lit) => {
    const R = ramp(col)
    if (!lit) {
      g.rect(1, 30, W - 2, 16, R.b)
      g.hline(1, W - 2, 30, R.L)
      g.rect(1, 44, W - 2, 2, R.D)
      g.rect(3, 33, W - 6, 4, '#3a3040')
      g.circle(7, 34, 1.5, '#e8514a')
      g.vline(7, 32, 34, '#bdb2ae')
      g.circle(14, 35, 1.5, '#ffd23f')
      g.rect(5, 39, 7, 4, '#1e1828')
      g.rect(14, 39, 3, 2, '#8a8480')
      g.vline(1, 6, 30, R.d)
      g.vline(W - 2, 6, 30, R.d)
    }
    // Marquee.
    g.rect(1, 0, W - 2, 6, R.L)
    letters(g, 3, 1, W - 6, R.D, i + 40)
    for (let x = 2; x < W - 1; x += 3) g.px(x, 5, BULBS[(x + i) % BULBS.length])
    // Glass box with a pile of plush.
    g.rect(2, 6, W - 4, 24, '#3a3060')
    g.rect(2, 6, W - 4, 2, '#5a5090')
    g.hline(3, W - 4, 8, '#8a8480')
    g.vline(11, 8, 12, '#c8c8d0')
    g.poly([[9, 12], [13, 12], [14, 15], [8, 15]], '#c8c8d0')
    const pile: [number, number, Color][] = [
      [5, 27, '#ff9fc0'],
      [10, 28, '#9fd0ff'],
      [15, 27, '#ffd23f'],
      [7, 24, '#6cc36a'],
      [13, 24, '#b4a8c8'],
      [17, 25, '#f58f35'],
      [10, 21, '#fffaf0'],
    ]
    for (const [x, y, c] of pile) {
      g.circle(x, y, 2.6, c)
      g.px(x - 1, y - 1, INK)
      g.px(x + 1, y - 1, INK)
    }
    // Glass shine.
    g.line(4, 20, 8, 10, 'rgba(255,255,255,0.35)')
    g.line(5, 26, 11, 14, 'rgba(255,255,255,0.18)')
    hooks.glass = [{ x: W / 2, y: 18 }]
  })
}

// ---------------------------------------------------------------------------
// มวยตู้ (the boxing booth): the ring comes in two sprites so the boxers can
// stand between the back and the front ropes.

const RING_W = 84

/** Boxing ring: canvas, apron, back posts and ropes (anchor: centre front; sort it behind). */
export function boxingRingBack(): LitProp {
  const W = RING_W
  const H = 70
  return litPair('fair:ring:back', W, H, W / 2, H - 1, (g, hooks, lit) => {
    // Tent top and the banner: มวยตู้.
    if (!lit) {
      g.poly([[0, 12], [W / 2, 0], [W, 12]], '#c8343f')
      for (let x = 4; x < W; x += 10) g.line(W / 2, 1, x, 12, '#e8514a')
      g.rect(2, 12, 2, 32, '#8a8480')
      g.rect(W - 4, 12, 2, 32, '#8a8480')
    }
    g.rect(W / 2 - 22, 5, 44, 8, '#ffd54f')
    letters(g, W / 2 - 19, 7, 38, '#8a2335', 31)
    for (let x = 6; x < W - 4; x += 6) bulb(g, x, 14, x, 0)
    if (!lit) {
      // Canvas floor (3/4 view) and the skirt.
      g.rect(6, 36, W - 12, 20, '#d8d4e8')
      g.hline(6, W - 7, 36, '#eeeaf8')
      for (let y = 40; y < 56; y += 5) g.hline(8, W - 9, y, '#c8c4dc')
      g.rect(4, 56, W - 8, 12, '#3d63b5')
      for (let x = 8; x < W - 8; x += 8) g.vline(x, 57, 66, '#2e4a8a')
      g.hline(4, W - 5, 56, '#5a8de0')
      // Back corner posts (red and blue) and three back ropes.
      g.rect(6, 22, 3, 16, '#e8514a')
      g.rect(W - 9, 22, 3, 16, '#3d63b5')
      for (const [k, c] of [
        [0, '#e8514a'],
        [5, '#fffaf0'],
        [10, '#3d63b5'],
      ] as const)
        g.hline(8, W - 9, 24 + k, c)
      // Side ropes (drawn short: they run towards the viewer).
      for (const k of [0, 5, 10]) {
        g.line(7, 24 + k, 5, 44 + k, '#fffaf0')
        g.line(W - 8, 24 + k, W - 6, 44 + k, '#fffaf0')
      }
    }
    hooks.corners = [{ x: 16, y: 50 }, { x: W - 16, y: 50 }]
  })
}

/** The front posts and ropes of the ring (anchor: centre front). */
export function boxingRingFront(): HubProp {
  const W = RING_W
  return hprop('fair:ring:front', W, 30, W / 2, 29, (g) => {
    g.rect(2, 4, 4, 26, '#e8514a')
    g.rect(W - 6, 4, 4, 26, '#3d63b5')
    g.px(3, 4, '#ff8a80')
    g.px(W - 5, 4, '#8ab0f0')
    for (const [k, c] of [
      [0, '#e8514a'],
      [5, '#fffaf0'],
      [10, '#3d63b5'],
    ] as const)
      g.hline(5, W - 6, 6 + k, c)
  })
}

// ---------------------------------------------------------------------------
// ประกวดธิดาลูกชิ้น (the funny beauty contest stage).

/** Contest stage with a lotus backdrop and a throne (anchor: centre front). Hooks: `throne`, `spots`. */
export function contestStage(): LitProp {
  const W = 104
  const H = 76
  return litPair('fair:contest', W, H, W / 2, H - 1, (g, hooks, lit) => {
    if (!lit) {
      g.rect(0, H - 18, W, 18, '#7a3a5a')
      g.rect(0, H - 18, W, 3, '#a85a7a')
      for (let x = 4; x < W; x += 8) g.vline(x, H - 15, H - 1, '#5a2a44')
      // Steps.
      g.rect(W / 2 - 10, H - 6, 20, 6, '#a85a7a')
      g.hline(W / 2 - 10, W / 2 + 9, H - 6, '#c87a9a')
    }
    // Pink backdrop with a big lotus and sparkles.
    g.rect(6, 8, W - 12, H - 26, '#ff9fc0')
    g.rect(6, 8, W - 12, 3, '#ffc0d8')
    for (let i = 0; i < 30; i++) {
      const v = hsh(i, 3, 9)
      g.px(8 + (v % (W - 16)), 12 + ((v >> 4) % (H - 32)), '#fff0f6')
    }
    const lx = W / 2
    const ly = 34
    for (const [dx, dy, r] of [
      [0, -8, 5],
      [-7, -3, 4.5],
      [7, -3, 4.5],
      [-12, 2, 4],
      [12, 2, 4],
    ] as const) {
      g.ellipse(lx + dx, ly + dy, r - 1, r + 1, '#fffaf0')
      g.ellipse(lx + dx, ly + dy + 1, r - 2, r - 1, '#ffd6e6')
    }
    g.rect(lx - 14, ly + 5, 28, 3, '#6cc36a')
    // Banner across the top.
    g.rect(14, 1, W - 28, 7, '#ffd54f')
    letters(g, 17, 3, W - 34, '#c8343f', 51)
    // The throne with a crown on it.
    g.rect(W - 26, H - 38, 14, 18, '#ffd54f')
    g.rect(W - 24, H - 36, 10, 10, '#c8343f')
    g.poly([[W - 23, H - 42], [W - 21, H - 45], [W - 19, H - 42], [W - 17, H - 45], [W - 15, H - 42]], '#ffd54f')
    if (!lit) {
      // Curtains.
      for (const x0 of [0, W - 7]) for (let x = 0; x < 7; x++) g.vline(x0 + x, 4, H - 18, x % 3 === 0 ? '#b8743a' : '#ffd54f')
    }
    hooks.throne = [{ x: W - 19, y: H - 20 }]
    hooks.spots = [{ x: 22, y: H - 10 }, { x: 40, y: H - 9 }, { x: 58, y: H - 10 }]
    hooks.bulbs = Array.from({ length: 17 }, (_, i) => ({ x: 4 + i * 6, y: 9 }))
  })
}

/** The judges' table in front of the contest stage. */
export function judgesTable(): HubProp {
  return hprop('fair:judges', 40, 14, 20, 13, (g) => {
    g.rect(0, 2, 40, 5, '#fffaf0')
    g.hline(0, 39, 2, '#ffffff')
    g.rect(0, 7, 40, 7, '#e8514a')
    for (let x = 2; x < 40; x += 6) g.rect(x, 8, 3, 5, '#ffd54f')
    for (const x of [8, 20, 32]) {
      g.rect(x - 2, 0, 4, 3, '#fffaf0')
      g.px(x, 0, INK)
    }
  })
}

// ---------------------------------------------------------------------------
// The ขอพร corner in front of the ubosot.

/** The wishing tree wrapped in coloured cloth, wish tags on its branches. Hooks: `tags`. */
export function wishTree(): LitProp {
  const W = 70
  const H = 84
  return litPair('fair:wishtree', W, H, W / 2, H - 1, (g, hooks, lit) => {
    const cx = W / 2
    const tags: Pt[] = []
    if (!lit) {
      // Trunk with roots and the three-colour cloth.
      g.poly([[cx - 6, H - 1], [cx - 4, 44], [cx + 4, 44], [cx + 7, H - 1]], '#6e4a35')
      g.poly([[cx - 12, H - 1], [cx - 5, H - 8], [cx - 3, H - 1]], '#6e4a35')
      g.poly([[cx + 12, H - 1], [cx + 5, H - 8], [cx + 3, H - 1]], '#6e4a35')
      for (const [y, c] of [
        [H - 26, '#e8514a'],
        [H - 23, '#ffd23f'],
        [H - 20, '#6cc36a'],
      ] as const)
        g.rect(cx - 6, y, 13, 3, c)
      g.line(cx - 3, H - 20, cx - 6, H - 12, '#e8514a')
      // Branches and a big canopy.
      g.thickLine(cx, 46, cx - 18, 30, 3, '#6e4a35')
      g.thickLine(cx, 46, cx + 18, 28, 3, '#6e4a35')
      for (const [x, y, r, c] of [
        [cx - 16, 24, 15, '#2e6a3a'],
        [cx + 16, 22, 15, '#2e6a3a'],
        [cx, 16, 17, '#3a7a44'],
        [cx - 22, 34, 10, '#2e6a3a'],
        [cx + 22, 34, 10, '#2e6a3a'],
      ] as const)
        g.circle(x, y, r, c)
      for (let i = 0; i < 60; i++) {
        const v = hsh(i, 1, 2)
        g.px(8 + (v % (W - 16)), 4 + ((v >> 5) % 40), i % 2 ? '#4a8a54' : '#5aa062')
      }
    }
    // Wish tags and tiny lanterns hanging from the canopy.
    for (let i = 0; i < 16; i++) {
      const v = hsh(i, 5, 3)
      const x = 10 + (v % (W - 20))
      const y = 20 + ((v >> 4) % 22)
      if (!lit) g.vline(x, y - 3, y - 1, '#fffaf0')
      g.rect(x - 1, y, 3, 4, i % 3 ? '#e8514a' : '#ffd54f')
      tags.push({ x, y: y + 2 })
    }
    for (const [x, y] of [
      [cx - 20, 38],
      [cx + 20, 36],
      [cx, 32],
    ]) {
      if (!lit) g.vline(x, y - 4, y - 2, '#8a8480')
      g.ellipse(x, y + 1, 2.5, 3, '#ff6a4a')
      g.px(x, y + 1, '#ffd23f')
    }
    hooks.tags = tags
  })
}

/** The altar table with a small golden Buddha, candles, garlands and an urn. */
export function wishAltar(): LitProp {
  return litPair('fair:altar', 44, 36, 22, 35, (g, hooks, lit) => {
    if (!lit) {
      g.rect(2, 18, 40, 5, '#c8343f')
      g.hline(2, 41, 18, '#e8514a')
      g.rect(3, 23, 38, 12, '#8a2335')
      for (let x = 6; x < 40; x += 8) g.rect(x, 25, 4, 8, '#ffd54f')
      // Buddha on a pedestal.
      g.rect(17, 12, 10, 6, '#b8742a')
      g.circle(22, 8, 4, '#ffc83a')
      g.circle(22, 3, 2.2, '#ffc83a')
      g.px(22, 0, '#ffe27a')
      g.rect(18, 9, 9, 4, '#e8a52a')
      // Urn with incense.
      g.ellipse(9, 16, 5, 2.5, '#b8742a')
      g.rect(5, 14, 8, 3, '#d8923a')
      for (const x of [7, 9, 11]) g.vline(x, 6, 13, '#8a3a2a')
      // Garlands.
      for (const x of [31, 37]) {
        g.circle(x, 15, 2.5, '#fffaf0')
        g.circle(x, 15, 1.2, '#ffd23f')
      }
    }
    // Candle flames and incense tips.
    for (const x of [15, 29]) {
      if (!lit) g.rect(x - 1, 11, 2, 7, '#fff6d0')
      g.px(x - 1, 10, '#ffd23f')
      g.px(x - 1, 9, '#ffffff')
    }
    for (const x of [7, 9, 11]) g.px(x, 5, '#ff7a3a')
    g.circle(22, 8, 1, '#fff3a6')
    hooks.smoke = [{ x: 9, y: 4 }]
    hooks.flames = [{ x: 14, y: 9 }, { x: 28, y: 9 }]
  })
}

// ---------------------------------------------------------------------------
// Bits and bobs.

/** A stack of PA speakers (the likay and ramwong band). */
export function speakerStack(): HubProp {
  return hprop('fair:speaker', 14, 28, 7, 27, (g) => {
    for (const y of [0, 14]) {
      g.rect(0, y, 14, 14, '#2a2a30')
      g.frame(0, y, 14, 14, '#4a4a54')
      g.circle(7, y + 8, 4, '#4a4a54')
      g.circle(7, y + 8, 2, '#1a1a20')
      g.circle(7, y + 3, 1.5, '#5a5a64')
    }
  })
}

/** Straw mat for the audience / picnic (baked into the ground). */
export function mat(g: Surface, x: number, y: number, w: number, h: number, a: Color, b: Color) {
  g.rect(x, y, w, h, a)
  for (let i = x; i < x + w; i += 6) g.vline(i, y, y + h - 1, b)
  g.hline(x, x + w - 1, y, mix(a, '#ffffff', 0.25))
  g.hline(x, x + w - 1, y + h - 1, mix(a, INK, 0.3))
}

/** The balloon seller's stand (the balloons themselves are drawn by the map so they can pop). */
export function balloonStand(): HubProp {
  return hprop('fair:balloonstand', 16, 20, 8, 19, (g) => {
    g.rect(2, 12, 12, 8, '#6e4a35')
    g.hline(2, 13, 12, '#9a6a45')
    g.vline(8, 2, 12, '#8a8480')
    g.rect(4, 14, 8, 3, '#e8d0a8')
  })
}

/** Lantern pole with a red paper lantern (baked pole, lantern glows). */
export function lanternPole(): LitProp {
  return litPair('fair:lanternpole', 10, 44, 5, 43, (g, _hooks, lit) => {
    if (!lit) {
      g.rect(4, 6, 2, 38, '#5a4a4e')
      g.hline(2, 8, 6, '#5a4a4e')
    }
    g.ellipse(5, 13, 4, 5, '#e8514a')
    g.hline(2, 8, 9, '#ffd23f')
    g.hline(2, 8, 17, '#ffd23f')
    g.vline(5, 18, 21, '#ffd23f')
    g.px(4, 12, '#ffb0a0')
  })
}

/**
 * A crisp little name tag (UI font snapped to hard pixels, outlined) for
 * real players at the fair. Not cached: callers keep the sprite themselves
 * (names come from the network, so a global cache could grow without end).
 */
export function nameTag(text: string, maxW = 60, color: Color = '#fffaf0', outline: Color = '#2a1d3a'): Sprite {
  const size = 9
  const probe = createCanvas(4, 4).getContext('2d')!
  probe.font = `600 ${size}px "Mali", sans-serif`
  let t = text
  while (t.length > 1 && probe.measureText(t).width > maxW - 4) t = t.slice(0, -1)
  if (t !== text) t = t.slice(0, -1) + '…'
  const w = Math.max(1, Math.ceil(probe.measureText(t).width) + 4)
  const h = size * 2 + 2
  const c = createCanvas(w, h)
  const ctx = c.getContext('2d')!
  ctx.font = probe.font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(t, 2, h / 2 + 1)
  const d = ctx.getImageData(0, 0, w, h)
  let y0 = h
  let y1 = 0
  for (let i = 3; i < d.data.length; i += 4) {
    const on = d.data[i] > 96
    d.data[i] = on ? 255 : 0
    if (on) {
      const y = Math.floor((i >> 2) / w)
      y0 = Math.min(y0, y)
      y1 = Math.max(y1, y)
    }
  }
  ctx.putImageData(d, 0, 0)
  if (y1 < y0) return outlineCanvas(c, outline, true)
  const crop = createCanvas(w, y1 - y0 + 1)
  crop.getContext('2d')!.drawImage(c, 0, -y0)
  return outlineCanvas(crop, outline, true)
}

// ---------------------------------------------------------------------------
// The back boundary of the fair: a zinc hoarding plastered with show posters,
// a bunting line on top (the string lights are drawn by FairLights) and a big
// lit billboard in the middle.

/** Painted zinc fence across 0..w from y0 (top) to y1 (ground line). */
export function fairFence(g: Surface, w: number, y0: number, y1: number, night: boolean) {
  const h = y1 - y0
  const zinc = night ? '#5a6478' : '#9aa6b8'
  const zincL = mix(zinc, '#ffffff', 0.22)
  const zincD = mix(zinc, INK, 0.28)
  g.rect(0, y0, w, h, zinc)
  for (let x = 0; x < w; x += 4) {
    g.vline(x, y0, y1 - 1, zincL)
    g.vline(x + 2, y0, y1 - 1, zincD)
  }
  // Rust streaks and the top rail.
  for (let i = 0; i < 22; i++) {
    const v = hsh(i, 5, 71)
    g.vline(v % w, y0 + 3, y0 + 4 + ((v >> 3) % Math.max(2, h - 8)), night ? '#6a5a58' : '#b08a6e')
  }
  g.rect(0, y0, w, 2, night ? '#3a3048' : '#5a4a4e')
  g.rect(0, y0 + 2, w, 1, zincD)
  // Show posters (likay, boxing, the contest, a lottery ad) in pseudo lettering.
  const POSTERS: Color[] = ['#e8514a', '#ffd23f', '#5a8de0', '#ff9fc0', '#6cc36a', '#c8a0ff', '#f58f35']
  let i = 0
  for (let x = 6; x < w - 20; x += 24 + (hsh(x, 1, 9) % 14)) {
    i++
    if (x > w / 2 - 66 && x < w / 2 + 50) continue
    const c = POSTERS[i % POSTERS.length]
    const pw = 14 + (hsh(i, 2, 9) % 6)
    const ph = Math.min(h - 10, 15 + (hsh(i, 3, 9) % 5))
    const py = y0 + 5 + (hsh(i, 4, 9) % 3)
    g.rect(x, py, pw, ph, c)
    g.rect(x, py + ph - 4, pw, 4, mix(c, INK, 0.25))
    g.rect(x + 2, py + 2, pw - 4, Math.max(3, ph - 9), mix(c, '#fffaf0', 0.55))
    g.circle(x + pw / 2, py + 2 + (ph - 9) / 2, 2, mix(c, INK, 0.1))
    letters(g, x + 1, py + ph - 4, pw - 2, '#fffaf0', i + 40)
    g.px(x + pw - 1, py, zinc)
    g.px(x + pw - 2, py, zinc)
    g.px(x + pw - 1, py + 1, zinc)
  }
  // Kick plate and its shadow on the ground.
  g.rect(0, y1 - 3, w, 3, night ? '#3a3048' : '#6a5a5e')
  g.alpha(0.3)
  g.rect(0, y1, w, 3, INK)
  g.alpha(1)
  pennants(g, 0, y0 + 2, w / 2, y0 + 2, 4, BULBS)
  pennants(g, w / 2, y0 + 2, w, y0 + 2, 4, BULBS)
}

/** Billboard over the back fence, "งานวัดศรีบุญดี ประจำปี" (anchor: centre bottom). Hooks: `bulbs`. */
export function fairBillboard(): LitProp {
  const W = 100
  const H = 48
  return litPair('fair:billboard', W, H, W / 2, H - 1, (g, hooks, lit) => {
    if (!lit) {
      for (const x of [16, W - 20]) {
        g.rect(x, 32, 4, H - 32, '#5a4a4e')
        g.vline(x, 32, H - 1, '#8a7a7e')
      }
    }
    g.rect(2, 2, W - 4, 30, '#8a2335')
    g.frame(2, 2, W - 4, 30, '#ffd54f')
    g.frame(4, 4, W - 8, 26, '#e8514a')
    letters(g, 22, 8, W - 44, '#fff6c8', 51)
    letters(g, 26, 15, W - 52, '#ffd54f', 52)
    letters(g, 34, 22, W - 68, '#ff9fc0', 53)
    for (const x of [13, W - 13]) {
      g.circle(x, 17, 5, '#ff9fc0')
      g.circle(x, 16, 3, '#ffc4d8')
      g.px(x, 12, '#fffaf0')
      g.rect(x - 4, 22, 9, 2, '#6cc36a')
    }
    const bulbs: Pt[] = []
    for (let x = 4; x < W - 2; x += 5) {
      bulbs.push({ x, y: 1 })
      bulbs.push({ x, y: 32 })
    }
    hooks.bulbs = bulbs
  })
}
