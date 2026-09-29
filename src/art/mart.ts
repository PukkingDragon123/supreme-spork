// "7-บุญ" convenience store interior: glowing drink fridges, a บุญ café
// coffee bar, snack gondolas, the checkout counter with steamed buns
// (ซาลาเปา), a toastie press and the till, a สังฆทาน shelf, ice-cream
// freezer, ATM, magazine rack, wet-floor sign and the floor/walls bake.

import type { Color, Surface } from '../engine/pixel'
import { Rng } from '../engine/rng'
import { P } from './palette'
import type { Prop } from './props'
import { sprite } from './temple'

const STRIPE = ['#f58f35', '#3fa06e', '#e8514a']
const STEEL = { L: '#f2f2f6', b: '#d0d0da', d: '#a8a8b8', D: '#80808e' }

// Tiny glyphs for signs (5 px tall).
const GLYPH: Record<string, string[]> = {
  '7': ['#####', '....#', '...#.', '..#..', '..#..'],
  '-': ['...', '...', '###', '...', '...'],
  บ: ['#..#', '#..#', '#..#', '#..#', '####'],
  ญ: ['#.#.#', '#.#.#', '##..#', '#...#', '#####'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  C: ['###', '#..', '#..', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  E: ['###', '#..', '##.', '#..', '###'],
  '1': ['.#', '##', '.#', '.#', '.#'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  ' ': ['..', '..', '..', '..', '..'],
}

export function signText(g: Surface, x: number, y: number, text: string, color: Color) {
  let cx = x
  for (const ch of text) {
    const gl = GLYPH[ch] ?? GLYPH[' ']
    for (let r = 0; r < gl.length; r++) for (let c = 0; c < gl[r].length; c++) if (gl[r][c] === '#') g.px(cx + c, y + r, color)
    cx += gl[0].length + 1
  }
}

/** The "7-บุญ" logo (about 26×9) with the three brand stripes underneath. */
export function martLogo(g: Surface, x: number, y: number) {
  g.rect(x, y, 26, 9, '#ffffff')
  signText(g, x + 2, y + 2, '7', '#e8514a')
  signText(g, x + 8, y + 2, '-', '#f58f35')
  signText(g, x + 12, y + 2, 'บ', '#3fa06e')
  g.px(x + 15, y + 8, '#3fa06e')
  g.px(x + 16, y + 8, '#3fa06e')
  signText(g, x + 17, y + 2, 'ญ', '#3fa06e')
}

const DRINKS: [Color, Color][] = [
  ['#dff4ff', '#5a8de0'],
  ['#9ee07a', '#3f9a4a'],
  ['#e8514a', '#ffffff'],
  ['#ffb03a', '#f58f35'],
  ['#fffaf0', '#5a8de0'],
  ['#ffd23f', '#e8514a'],
  ['#c9a0f0', '#7255c2'],
  ['#8a5a32', '#e8514a'],
]

/** A wall of four glass-door drink fridges (120×46). Anchor: bottom-left. */
export function fridgeWallSprite(): Prop {
  return sprite('mart:fridges', 120, 46, 0, 45, (g) => {
    const rng = new Rng(7)
    g.rect(0, 0, 120, 46, '#dfe3ea')
    // Light-box header with the store logo.
    g.rect(0, 0, 120, 11, '#5a8de0')
    g.hline(0, 119, 0, '#9fd0ff')
    g.hline(0, 119, 10, '#3d63b5')
    for (let x = 4; x < 116; x += 8) if (x < 42 || x > 76) g.rect(x, 4, 4, 2, x % 16 ? '#d4f1ff' : '#ffffff')
    g.rect(46, 1, 28, 9, '#3fa06e')
    martLogo(g, 47, 1)
    // Snowflakes: "cold drinks".
    for (const sx of [10, 106]) {
      g.px(sx, 5, '#ffffff')
      g.px(sx - 1, 5, '#d4f1ff')
      g.px(sx + 1, 5, '#d4f1ff')
      g.px(sx, 4, '#d4f1ff')
      g.px(sx, 6, '#d4f1ff')
    }
    for (let i = 0; i < 4; i++) {
      const dx = 2 + i * 29
      g.rect(dx, 12, 28, 31, '#6d6478')
      g.rect(dx + 1, 13, 26, 29, '#e8f8ff')
      g.dither(dx + 1, 13, 26, 5, null, '#ffffff', 0.4)
      for (const sy of [19, 26, 33, 40]) {
        g.hline(dx + 1, dx + 26, sy, '#a8a8b8')
        let x = dx + 2
        while (x < dx + 25) {
          const [body, cap] = DRINKS[rng.int(0, DRINKS.length - 1)]
          const can = rng.chance(0.3)
          const h = can ? 4 : 6
          g.rect(x, sy - h, can ? 3 : 2, h, body)
          g.px(x, sy - h - (can ? 0 : 1), cap)
          if (!can) g.px(x + 1, sy - h, cap)
          g.px(x, sy - h + 1, '#ffffff')
          x += can ? 4 : 3
        }
      }
      // Glass glints and the handle.
      g.line(dx + 4, 41, dx + 12, 14, 'rgba(255,255,255,0.7)')
      g.line(dx + 7, 41, dx + 15, 14, 'rgba(255,255,255,0.35)')
      g.rect(dx + 24, 22, 2, 12, STEEL.b)
      g.px(dx + 24, 22, STEEL.L)
      // Promo sticker on one door.
      if (i === 2) {
        g.rect(dx + 3, 27, 7, 5, '#ffd23f')
        g.rect(dx + 4, 28, 5, 1, '#e8514a')
        g.px(dx + 5, 30, '#e8514a')
        g.px(dx + 7, 30, '#e8514a')
      }
    }
    g.rect(0, 43, 120, 3, '#8c8187')
    g.hline(0, 119, 43, '#a8a8b8')
  })
}

/** "บุญ café" coffee bar with a machine and cups (32×42). */
export function coffeeBarSprite(): Prop {
  return sprite('mart:coffee', 32, 42, 16, 41, (g) => {
    // Cabinet.
    g.rect(0, 22, 32, 20, '#fffaf0')
    g.rect(0, 22, 32, 3, '#e0bb8a')
    g.hline(0, 31, 22, '#f3dcb2')
    g.rect(2, 28, 13, 12, '#f0e6d6')
    g.rect(17, 28, 13, 12, '#f0e6d6')
    g.px(13, 33, '#a8a8b8')
    g.px(18, 33, '#a8a8b8')
    // Espresso machine.
    g.rect(3, 4, 16, 18, '#4a3128')
    g.rect(3, 4, 16, 3, '#6e4a35')
    g.rect(5, 8, 12, 5, '#2a2838')
    g.px(7, 10, '#6fcf8f')
    g.px(9, 10, '#ffd23f')
    g.rect(8, 14, 6, 3, '#a8a8b8')
    g.rect(9, 18, 4, 4, '#fffaf0')
    g.px(10, 17, '#6e4a35')
    // Brown sign strip "café".
    g.rect(3, 0, 16, 4, '#9a6a45')
    g.hline(3, 18, 0, '#c28e5c')
    signText(g, 5, -1 + 1, 'C', '#fff1d6')
    g.rect(9, 1, 1, 2, '#fff1d6')
    g.rect(12, 1, 2, 2, '#fff1d6')
    // Stacks of cups, a cookie jar.
    for (let i = 0; i < 4; i++) g.rect(21, 18 - i * 3, 5, 3, i % 2 ? '#fffaf0' : '#f0e6d6')
    g.rect(22, 6, 3, 1, '#e8514a')
    g.rect(26, 14, 5, 8, '#dff4ff')
    g.rect(27, 16, 3, 5, '#d9964a')
    g.px(28, 17, '#6e4a35')
    g.rect(26, 13, 5, 1, '#e8514a')
  })
}

/** Shelf behind the counter with สังฆทาน buckets and alms sets (78×36). */
export function almsShelfSprite(): Prop {
  return sprite('mart:almsshelf', 78, 36, 0, 35, (g) => {
    g.rect(0, 0, 78, 36, '#c9d3dc')
    g.rect(2, 2, 74, 32, '#eef2f5')
    for (const sy of [16, 33]) {
      g.rect(1, sy, 76, 2, '#a8a8b8')
      g.hline(1, 76, sy, '#e4e8ec')
    }
    // Yellow สังฆทาน buckets with orange cellophane tops.
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 15
      g.poly([[x, 6], [x + 11, 6], [x + 10, 16], [x + 1, 16]], '#ffd23f')
      g.rect(x + 1, 9, 9, 2, '#e8514a')
      g.poly([[x - 1, 6], [x + 5, 1], [x + 12, 6]], '#ffb03a')
      g.px(x + 5, 0, '#e8514a')
      g.px(x + 2, 7, '#fff3a6')
    }
    // Ready-made ตักบาตร trays and drinking-water packs.
    for (let i = 0; i < 4; i++) {
      const x = 4 + i * 18
      g.rect(x, 24, 14, 9, '#fffaf0')
      g.rect(x + 1, 25, 5, 4, '#fffaf0')
      g.rect(x + 1, 26, 4, 3, '#86c95f')
      g.rect(x + 7, 25, 6, 4, '#f0c078')
      g.rect(x, 31, 14, 2, '#f58f35')
    }
    g.rect(0, 0, 78, 2, '#80808e')
  })
}

/** Checkout counter with the steamed-bun case, toastie press, till and donation box (78×48). */
export function counterSprite(): Prop {
  return sprite('mart:counter', 78, 48, 0, 47, (g) => {
    // Top surface and front face.
    g.rect(0, 20, 78, 10, '#f4f2ee')
    g.hline(0, 77, 20, '#ffffff')
    g.rect(0, 30, 78, 18, '#fffaf0')
    g.rect(74, 30, 4, 18, '#e6dccb')
    STRIPE.forEach((c, i) => g.rect(0, 36 + i, 78, 1, c))
    g.rect(0, 45, 78, 3, '#bdb2ae')
    martLogo(g, 24, 38 - 1)
    // Steamed buns in a glass steamer with a red "hot" light.
    g.rect(2, 4, 22, 18, '#6d6478')
    g.rect(3, 6, 20, 15, '#fff8ec')
    g.dither(3, 6, 20, 5, null, '#ffffff', 0.5)
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 3; c++) {
        const x = 7 + c * 6 + (r % 2 ? 2 : 0)
        const y = 11 + r * 5
        g.ellipse(x, y, 2.6, 2.1, '#fffaf0')
        g.px(x, y - 1, r ? '#e8514a' : '#9a6a45')
      }
    g.rect(2, 0, 22, 6, '#e8514a')
    g.hline(2, 23, 0, '#ff8a7a')
    signText(g, 7, 1, 'HOT', '#fff3a6')
    // Till with a green screen (the clerk stands in the gap to its left).
    g.rect(48, 12, 15, 9, '#80808e')
    g.rect(50, 5, 11, 8, '#3a3040')
    g.rect(51, 6, 9, 5, '#6fcf8f')
    g.hline(52, 58, 8, '#b4f0c8')
    for (let x = 50; x < 62; x += 3) g.px(x, 16, '#d0d0da')
    // Toastie press.
    g.rect(64, 13, 12, 8, STEEL.d)
    g.rect(64, 11, 12, 4, STEEL.b)
    g.hline(64, 75, 11, STEEL.L)
    g.rect(75, 13, 3, 2, '#3a3040')
    g.px(66, 17, '#ff8a3d')
    g.rect(66, 19, 8, 2, '#f0c078')
    // Clear donation box (ตู้บริจาค) hung on the front.
    g.rect(64, 31, 8, 10, '#dff4ff')
    g.rect(65, 36, 6, 4, P.gold)
    g.px(67, 35, P.goldD)
    g.rect(64, 30, 8, 1, '#e8514a')
    g.rect(67, 32, 2, 1, '#6d6478')
  })
}

const SNACKS: Color[] = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#f58f35', '#9270dc', '#fffaf0', '#47a6cb']

/** Snack gondola (88×30): chips, cup noodles, candy; top shelf seen from above. */
export function gondolaSprite(seed = 1): Prop {
  return sprite(`mart:gondola:${seed}`, 88, 30, 0, 29, (g) => {
    const rng = new Rng(seed * 13 + 5)
    // Top face with bags lying flat.
    g.rect(0, 0, 88, 9, '#dfe3ea')
    for (let x = 2; x < 85; x += 6) {
      const c = rng.pick(SNACKS)
      g.rect(x, 1, 5, 6, c)
      g.hline(x, x + 4, 3, '#ffffff')
      g.px(x + 1, 1, '#ffffff')
    }
    // Front face: three shelves.
    g.rect(0, 9, 88, 21, '#eef2f5')
    for (const [i, sy] of [15, 21, 27].entries()) {
      let x = 2
      while (x < 84) {
        const k = rng.int(0, 5)
        if (i === 2 && k < 2) {
          // Cup noodles.
          g.rect(x, sy - 4, 4, 4, '#fffaf0')
          g.hline(x, x + 3, sy - 4, '#e8514a')
          g.px(x + 1, sy - 2, '#ffd23f')
          x += 5
        } else if (k === 5) {
          // Tall candy box.
          const c = rng.pick(SNACKS)
          g.rect(x, sy - 5, 3, 5, c)
          g.px(x + 1, sy - 4, '#ffffff')
          x += 4
        } else {
          // Chip bag with a highlight.
          const c = rng.pick(SNACKS)
          g.rect(x, sy - 5, 4, 5, c)
          g.hline(x, x + 3, sy - 5, '#ffffff')
          g.px(x + 1, sy - 3, c === '#fffaf0' ? '#e8514a' : '#ffffff')
          x += 5
        }
      }
      g.rect(1, sy, 86, 1, '#ffd23f')
      for (let px = 6; px < 84; px += 14) g.px(px, sy, '#e8514a')
    }
    g.rect(0, 9, 2, 21, STEEL.d)
    g.rect(86, 9, 2, 21, STEEL.d)
    g.rect(0, 28, 88, 2, '#8c8187')
  })
}

/** Chest ice-cream freezer (38×26). */
export function iceFreezerSprite(): Prop {
  return sprite('mart:freezer', 38, 26, 19, 25, (g) => {
    // Glass lid with ice creams inside.
    g.rect(0, 0, 38, 12, '#80808e')
    g.rect(1, 1, 36, 10, '#d4f1ff')
    const pops: Color[] = ['#ff9fc0', '#ffd23f', '#8fd47a', '#fffaf0', '#9270dc', '#f58f35', '#e8514a', '#8a5a32']
    for (let i = 0; i < 8; i++) {
      const x = 3 + i * 4
      g.rect(x, 3 + (i % 2), 3, 5, pops[i])
      g.px(x + 1, 8 + (i % 2), '#e0bb8a')
      g.px(x, 3 + (i % 2), '#ffffff')
    }
    g.line(4, 10, 12, 2, 'rgba(255,255,255,0.8)')
    g.line(22, 10, 30, 2, 'rgba(255,255,255,0.6)')
    g.vline(19, 1, 10, '#a8a8b8')
    // Front face with a cute cone logo.
    g.rect(0, 12, 38, 14, '#fffaf0')
    g.rect(0, 12, 38, 2, '#5a8de0')
    g.poly([[16, 17], [22, 17], [19, 24]], '#e0bb8a')
    g.circle(19, 16.5, 3, '#ff9fc0')
    g.px(18, 15, '#ffffff')
    g.rect(0, 24, 38, 2, '#bdb2ae')
  })
}

/** ATM (20×38). */
export function atmSprite(): Prop {
  return sprite('mart:atm', 20, 38, 10, 37, (g) => {
    g.rect(0, 6, 20, 32, '#9aa3ae')
    g.rect(0, 6, 20, 2, '#cfd5dc')
    g.rect(17, 8, 3, 30, '#6d7582')
    g.rect(0, 0, 20, 7, '#3fa06e')
    signText(g, 2, 1, 'ATM', '#ffffff')
    g.rect(3, 10, 13, 9, '#2a2838')
    g.rect(4, 11, 11, 7, '#7fc4ff')
    g.hline(5, 12, 13, '#d4f1ff')
    g.hline(5, 10, 15, '#d4f1ff')
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g.px(5 + c * 2, 22 + r * 2, '#fffaf0')
    g.px(12, 22, '#6cc36a')
    g.px(12, 24, '#ffd23f')
    g.px(12, 26, '#e8514a')
    g.rect(4, 30, 11, 2, '#3a3040')
    g.rect(3, 35, 14, 3, '#80808e')
  })
}

/** Wire magazine rack with colourful covers (40×26). */
export function magazineRackSprite(): Prop {
  return sprite('mart:mags', 40, 26, 0, 25, (g) => {
    const covers: [Color, Color][] = [
      ['#ff9fc0', '#fffaf0'],
      ['#5a8de0', '#ffd23f'],
      ['#ffd23f', '#e8514a'],
      ['#6cc36a', '#fffaf0'],
      ['#9270dc', '#ffb8cf'],
      ['#e8514a', '#fffaf0'],
    ]
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 6; i++) {
        const [c, d] = covers[(i + row * 3) % covers.length]
        const x = 1 + i * 6 + (row ? 3 : 0)
        const y = row ? 11 : 2
        if (x + 6 > 40) continue
        g.rect(x, y, 6, 9, c)
        g.rect(x + 1, y + 1, 4, 2, d)
        g.circle(x + 3, y + 5.5, 1.3, '#fdd3b6')
        g.px(x + 2, y + 4, '#3b2f40')
        g.px(x + 4, y + 4, '#3b2f40')
        g.hline(x, x + 5, y + 8, '#ffffff')
      }
    for (const y of [10, 19]) g.rect(0, y, 40, 1, '#80808e')
    // Newspapers in a basket below.
    g.rect(2, 20, 36, 6, '#a8a8b8')
    g.rect(4, 19, 14, 3, '#f4f2ee')
    g.hline(5, 16, 20, '#80808e')
    g.rect(20, 19, 14, 3, '#fff1d6')
    g.hline(21, 32, 20, '#e8514a')
    g.vline(0, 0, 25, '#6d7582')
    g.vline(39, 0, 25, '#6d7582')
  })
}

/** Yellow "careful, wet floor" A-frame (10×15). */
export function wetSignSprite(): Prop {
  return sprite('mart:wet', 10, 15, 5, 14, (g) => {
    g.poly([[2, 0], [7, 0], [10, 15], [0, 15]], '#ffd23f')
    g.poly([[5, 0], [7, 0], [10, 15], [6, 15]], '#e9a53a')
    // Slipping stick figure.
    g.px(4, 4, '#3a2838')
    g.line(4, 5, 5, 8, '#3a2838')
    g.line(5, 8, 3, 10, '#3a2838')
    g.line(5, 8, 7, 9, '#3a2838')
    g.line(4, 6, 6, 5, '#3a2838')
    g.hline(2, 7, 12, '#3a2838')
  })
}

/** Potted money plant by the door (12×20). */
export function plantSprite(): Prop {
  return sprite('mart:plant', 12, 20, 6, 19, (g) => {
    g.rect(2, 13, 8, 7, '#d97b52')
    g.hline(2, 9, 13, '#f2a57a')
    for (const [x, y, c] of [
      [6, 4, '#43905a'],
      [3, 7, '#6cbf5c'],
      [9, 6, '#6cbf5c'],
      [5, 10, '#86c95f'],
      [8, 10, '#43905a'],
      [6, 1, '#86c95f'],
    ] as [number, number, string][]) {
      g.ellipse(x, y, 2.6, 2, c)
      g.px(x - 1, y - 1, '#b4e486')
    }
  })
}

/** Stack of red shopping baskets (14×13). */
export function basketsSprite(): Prop {
  return sprite('mart:baskets', 14, 13, 7, 12, (g) => {
    for (let i = 0; i < 3; i++) {
      const y = 8 - i * 3
      g.rect(1, y, 12, 4, i === 2 ? '#e8514a' : '#b8343f')
      g.hline(1, 12, y, '#ff8a7a')
      for (let x = 3; x < 12; x += 3) g.px(x, y + 2, '#7e2436')
    }
    g.line(3, 2, 5, 0, '#3a3040')
    g.line(10, 2, 8, 0, '#3a3040')
    g.hline(5, 8, 0, '#3a3040')
  })
}

/** Cardboard promo island: chips piled up under a "1+1" sign (34×30). */
export function promoIslandSprite(): Prop {
  return sprite('mart:promo', 34, 30, 17, 29, (g) => {
    const rng = new Rng(21)
    // Sign on a stick.
    g.vline(17, 0, 10, '#a8a8b8')
    g.rect(9, 0, 17, 8, '#ffd23f')
    g.rect(10, 1, 15, 6, '#e8514a')
    signText(g, 12, 1, '1+1', '#ffffff')
    // Pile of bags on top.
    for (let i = 0; i < 9; i++) {
      const x = 3 + (i % 5) * 6 - (i > 4 ? -3 : 0)
      const y = i > 4 ? 10 : 13
      const c = rng.pick(SNACKS)
      g.rect(x, y, 5, 5, c)
      g.hline(x, x + 4, y, '#ffffff')
    }
    // Cardboard box body.
    g.rect(1, 17, 32, 13, '#e0a860')
    g.rect(1, 17, 32, 2, '#f0c078')
    g.rect(1, 27, 32, 3, '#c28e5c')
    g.rect(6, 21, 22, 4, '#fffaf0')
    for (let x = 8; x < 27; x += 4) g.rect(x, 22, 2, 2, rng.pick(SNACKS))
  })
}

/** Red bin (8×11). */
export function binSprite(): Prop {
  return sprite('mart:bin', 9, 11, 4, 10, (g) => {
    g.rect(0, 2, 9, 9, '#3fa06e')
    g.rect(0, 0, 9, 3, '#2f7a52')
    g.hline(0, 8, 0, '#6cc36a')
    g.rect(3, 5, 3, 3, '#fffaf0')
  })
}

// ---------------------------------------------------------------------------
// Floor, walls, front glass and the entrance.

export interface MartLayout {
  w: number
  h: number
  /** Floor starts below the back wall. */
  wallH: number
  /** Front wall top y. */
  frontY: number
  door: { x: number; w: number }
}

export function bakeMart(g: Surface, L: MartLayout) {
  const { w, h, wallH, frontY, door } = L
  // Back wall: ceiling trim, brand stripes and warm white paint.
  g.rect(0, 0, w, wallH, '#fbf8f2')
  g.rect(0, 0, w, 5, '#d8d6d2')
  g.hline(0, w - 1, 5, '#ece8e2')
  STRIPE.forEach((c, i) => g.rect(0, 7 + i * 2, w, 2, c))
  for (let x = 10; x < w; x += 44) g.rect(x, 20, 2, wallH - 22, '#f1ece2')
  // Floor tiles.
  const fy = wallH
  g.rect(0, fy, w, frontY - fy, '#eef0f2')
  for (let y = fy; y < frontY; y += 16)
    for (let x = 0; x < w; x += 16) {
      if (((x + y) / 16) % 2 === 0) g.rect(x, y, 16, 16, '#e4e8ec')
      g.hline(x, x + 15, y, '#d4d8de')
      g.vline(x, y, Math.min(frontY - 1, y + 15), '#d4d8de')
      g.px(x + 3, y + 3, '#f8fafc')
    }
  g.rect(0, fy, w, 2, '#c9ccd2')
  // Side walls.
  g.rect(0, 0, 6, h, '#d8d6d2')
  g.rect(w - 6, 0, 6, h, '#d8d6d2')
  g.vline(5, 0, h - 1, '#ece8e2')
  g.vline(w - 6, 0, h - 1, '#ece8e2')
  // Front: kick plate and glass with the street outside.
  g.rect(0, frontY, w, h - frontY, '#8c8187')
  g.rect(0, frontY, w, 4, '#a8a8b8')
  g.rect(6, frontY + 4, w - 12, h - frontY - 6, '#9fd0e8')
  for (let x = 12; x < w - 12; x += 26) g.line(x, h - 3, x + 8, frontY + 5, '#d4f1ff')
  // Sliding door gap: lighter glass, handles and rails.
  g.rect(door.x, frontY, door.w, h - frontY, '#6d6478')
  g.rect(door.x + 1, frontY + 2, door.w / 2 - 1, h - frontY - 2, '#dff4ff')
  g.rect(door.x + door.w / 2 + 1, frontY + 2, door.w / 2 - 2, h - frontY - 2, '#dff4ff')
  g.rect(door.x + door.w / 2 - 3, frontY + 5, 1, 5, '#80808e')
  g.rect(door.x + door.w / 2 + 3, frontY + 5, 1, 5, '#80808e')
  // Door mat with a stripe border.
  const mx = door.x - 2
  const my = frontY - 16
  g.rect(mx, my, door.w + 4, 15, '#b8343f')
  g.rect(mx + 2, my + 2, door.w, 11, '#e8514a')
  for (let x = mx + 4; x < mx + door.w; x += 4) g.rect(x, my + 6, 2, 3, '#ff8a7a')
  // Queue footprints in front of the counter are added by the map.
}

/** Two little yellow footprint stickers (queue spot). */
export function footprints(g: Surface, x: number, y: number) {
  for (const [dx, dy] of [
    [-3, 0],
    [2, -1],
  ]) {
    g.ellipse(x + dx, y + dy, 1.6, 2.6, '#ffd23f')
    g.px(x + dx, y + dy - 3, '#ffd23f')
  }
}
