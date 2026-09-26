// Modern Thai street life around the temple: a "7-บุญ" mini-mart, cha-yen
// and moo-ping carts, the motorbike-taxi stand, lottery board, garland stand,
// vending machine, Wi-Fi sign, power pole, street spirit house with red
// Fanta and zebra figurines, fortune-teller booth, cats in a box, a sprawled
// soi dog and the temple-fair ferris wheel.

import type { Color, Surface } from '../engine/pixel'
import { cached, makeSprite, type Sprite } from '../engine/sprite'
import { P } from './palette'
import { mixHex } from './characters'
import type { Prop } from './props'
import { GOLD, ROOF, rows, slice, sprite, tier, type Ramp } from './temple'

const STEEL: Ramp = { L: '#f2f2f6', b: '#d0d0da', d: '#a8a8b8', D: '#80808e' }
const WHITE_RAMP: Ramp = { L: '#ffffff', b: '#fffaf0', d: '#ece0cc', D: '#d2bfa2' }

// Tiny hand-drawn glyphs for signs.
const GLYPH: Record<string, string[]> = {
  '7': ['#####', '....#', '...#.', '..#..', '..#..'],
  '-': ['...', '...', '###', '...', '...'],
  บ: ['#..#', '#..#', '#..#', '#..#', '####'],
  ญ: ['#.#.#', '#.#.#', '##..#', '#...#', '#####'],
  W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
  i: ['#', '.', '#', '#', '#'],
  F: ['###', '#..', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  ' ': ['..', '..', '..', '..', '..'],
}

function word(g: Surface, x: number, y: number, text: string, color: Color) {
  let cx = x
  for (const ch of text) {
    const gl = GLYPH[ch] ?? GLYPH[' ']
    rows(g, cx, y, gl.map((r) => r.replace(/#/g, 'c')), { c: color })
    cx += gl[0].length + 1
  }
}

/** "7-บุญ" convenience store front (60×56). */
export function martSprite(night = false): Prop {
  return sprite(`mart:${night ? 1 : 0}`, 62, 58, 31, 57, (g) => {
    // Building body.
    g.rect(1, 4, 60, 50, '#f4f2ee')
    g.rect(1, 4, 60, 2, '#d8d6d2')
    g.rect(57, 4, 4, 50, '#dcd8d2')
    // Sign band with the three stripes.
    g.rect(1, 6, 60, 15, '#ffffff')
    g.rect(1, 17, 60, 1, '#f58f35')
    g.rect(1, 18, 60, 1, '#3fa06e')
    g.rect(1, 19, 60, 1, '#e8514a')
    g.rect(18, 7, 26, 9, '#ffffff')
    g.frame(18, 7, 26, 9, '#3fa06e')
    word(g, 20, 9, '7', '#e8514a')
    word(g, 26, 9, '-', '#f58f35')
    word(g, 30, 9, 'บ', '#3fa06e')
    g.px(33, 15, '#3fa06e')
    g.px(34, 15, '#3fa06e')
    word(g, 35, 9, 'ญ', '#3fa06e')
    // Glass front with shelves of snacks.
    const glass = night ? '#fff6c8' : '#cfe8f4'
    g.rect(3, 22, 55, 28, '#6d6478')
    g.rect(4, 23, 53, 26, glass)
    const goods = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#f58f35', '#fffaf0']
    for (const sy of [27, 33, 39, 45]) {
      g.hline(4, 56, sy, '#a8a8b8')
      for (let x = 5; x < 56; x += 2) if ((x * 7 + sy) % 5) g.px(x, sy - 1, goods[(x + sy) % goods.length])
    }
    // Sliding door.
    g.rect(24, 23, 13, 26, night ? '#ffe7a8' : '#e2f2fa')
    g.vline(30, 23, 48, '#6d6478')
    g.rect(26, 34, 2, 1, '#6d6478')
    g.rect(33, 34, 2, 1, '#6d6478')
    // Posters on the glass.
    g.rect(6, 36, 6, 7, '#ffd23f')
    g.rect(7, 37, 4, 2, P.red)
    g.rect(47, 24, 8, 6, '#e8514a')
    g.rect(48, 26, 6, 1, '#ffffff')
    g.px(10, 25, '#ffffff')
    g.px(11, 24, '#ffffff')
    // Doorstep and an ice freezer.
    g.rect(1, 50, 60, 4, '#bdb2ae')
    g.hline(1, 60, 50, '#e4ddd6')
    g.rect(44, 42, 13, 10, '#ffffff')
    g.rect(44, 42, 13, 2, '#5a8de0')
    g.rect(46, 45, 9, 5, '#d4f1ff')
    g.px(47, 46, '#ffffff')
    // Roof edge with an AC unit.
    g.rect(0, 2, 62, 3, '#8c8187')
    g.rect(6, 0, 10, 4, '#e4ddd6')
    g.rect(8, 1, 6, 2, '#bdb2ae')
  })
}

/** Cha-yen (Thai milk tea) cart with a striped umbrella. */
export function chaYenSprite(): Prop {
  return sprite('chayen', 34, 40, 17, 39, (g) => {
    for (let i = 0; i < 8; i++) {
      const half = 16 - i * 1.9
      for (let x = Math.round(17 - half); x < 17 + half; x++) g.px(x, 10 - i, ((x >> 2) + i) % 2 ? '#f58f35' : '#fffaf0')
    }
    g.px(17, 2, GOLD.b)
    g.rect(16, 10, 2, 12, '#6e4a35')
    // Cart.
    g.rect(3, 22, 28, 3, '#e0bb8a')
    g.hline(3, 30, 22, '#f3dcb2')
    g.rect(4, 25, 26, 9, '#f58f35')
    g.rect(4, 25, 26, 1, '#ffbb66')
    g.rect(8, 27, 18, 5, '#fffaf0')
    // A cup icon on the sign.
    g.rect(15, 28, 4, 3, '#e98a2a')
    g.px(15, 28, '#ffe0b0')
    g.circle(7, 36, 3, '#3a3040')
    g.circle(27, 36, 3, '#3a3040')
    g.px(7, 36, '#bdb2ae')
    g.px(27, 36, '#bdb2ae')
    // Big jar of orange tea and stacked cups.
    g.rect(5, 13, 8, 9, '#d4f1ff')
    g.rect(6, 15, 6, 7, '#f0903a')
    g.px(6, 15, '#ffc080')
    g.rect(5, 12, 8, 1, '#a8a8b8')
    for (let i = 0; i < 4; i++) g.rect(22, 19 - i * 2, 5, 2, i % 2 ? '#fffaf0' : '#e8e8f0')
    g.rect(27, 18, 3, 4, '#f0903a')
    g.px(28, 16, '#e8514a')
    g.px(28, 17, '#e8514a')
  })
}

/** Moo-ping skewer grill cart. Smoke comes from the scene. */
export function mooPingSprite(): Prop {
  return sprite('mooping', 34, 26, 17, 25, (g) => {
    const s = STEEL
    g.rect(2, 10, 30, 3, s.b)
    g.hline(2, 31, 10, s.L)
    g.rect(3, 13, 28, 8, s.d)
    g.rect(3, 13, 28, 1, s.b)
    g.rect(6, 15, 22, 4, '#6d6478')
    for (let x = 7; x < 28; x += 3) g.px(x, 16, '#ff8a3d')
    g.circle(8, 22, 2.5, '#3a3040')
    g.circle(26, 22, 2.5, '#3a3040')
    // Grill with glowing coals and skewers.
    g.rect(4, 7, 26, 3, '#3a3040')
    for (let x = 5; x < 29; x += 2) g.px(x, 8, (x * 3) % 5 ? '#e8514a' : '#ffb35a')
    for (let i = 0; i < 7; i++) {
      const x = 6 + i * 3.4
      g.line(x, 2, x + 2, 9, '#c9a070')
      g.rect(x, 3, 2, 3, i % 2 ? '#b0503a' : '#c8643a')
      g.px(x, 3, '#e08a5a')
    }
    // Sticky rice bags.
    g.rect(28, 3, 4, 4, '#fffaf0')
    g.px(29, 2, '#e8514a')
  })
}

/** Motorbike-taxi (วิน) shelter with two parked bikes. */
export function winStandSprite(): Prop {
  return sprite('winstand', 50, 34, 25, 33, (g) => {
    // Corrugated roof on posts.
    g.rect(2, 3, 46, 4, '#8fa6c8')
    for (let x = 3; x < 48; x += 3) g.vline(x, 3, 6, '#6f86a8')
    g.hline(2, 47, 3, '#c8d8f0')
    g.rect(4, 7, 2, 26, '#8c8187')
    g.rect(44, 7, 2, 26, '#8c8187')
    // Orange sign with a helmet icon.
    g.rect(16, 8, 18, 7, '#f58f35')
    g.frame(16, 8, 18, 7, '#b85a1a')
    g.circle(25, 12, 2.5, '#fffaf0')
    g.rect(22, 12, 7, 1, '#fffaf0')
    // Bench.
    g.rect(8, 22, 34, 2, '#9a6a45')
    g.rect(9, 24, 2, 5, '#6e4a35')
    g.rect(39, 24, 2, 5, '#6e4a35')
    // Two bikes.
    for (const [x, c] of [
      [12, '#e8514a'],
      [34, '#5a8de0'],
    ] as [number, Color][]) {
      g.circle(x - 6, 30, 2.6, '#3a3040')
      g.circle(x + 6, 30, 2.6, '#3a3040')
      g.px(x - 6, 30, '#bdb2ae')
      g.px(x + 6, 30, '#bdb2ae')
      g.rect(x - 5, 25, 10, 3, c)
      g.rect(x - 3, 23, 6, 2, '#3a3040')
      g.px(x + 6, 24, '#fff3a6')
      g.line(x + 4, 22, x + 6, 26, '#3a3040')
    }
  })
}

/** Lottery-ticket seller's board (แผงลอตเตอรี่). */
export function lotteryBoardSprite(): Prop {
  return sprite('lotto', 26, 26, 13, 25, (g) => {
    g.rect(1, 1, 24, 18, '#9a6a45')
    g.rect(2, 2, 22, 16, '#c28e5c')
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 5; c++) {
        const x = 3 + c * 4
        const y = 3 + r * 4
        g.rect(x, y, 3, 3, (r + c) % 3 === 0 ? '#ffd6e0' : (r + c) % 3 === 1 ? '#d8f0c8' : '#fff1c8')
        g.px(x + 1, y + 1, '#5a3d4f')
      }
    g.rect(5, 19, 2, 7, '#6e4a35')
    g.rect(19, 19, 2, 7, '#6e4a35')
    g.rect(9, 0, 8, 2, P.red)
  })
}

/** Jasmine garland stand (พวงมาลัย). */
export function garlandStandSprite(): Prop {
  return sprite('garland-stand', 22, 22, 11, 21, (g) => {
    g.rect(1, 3, 20, 2, '#9a6a45')
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 4
      for (let y = 5; y < 11; y++) g.px(x, y, y % 2 ? '#fffaf0' : '#f3ecd8')
      g.px(x, 11, i % 2 ? '#e8514a' : '#b394f0')
      g.px(x - 1, 12, '#ffd23f')
      g.px(x + 1, 12, '#ffd23f')
    }
    g.rect(2, 14, 18, 3, '#e0bb8a')
    g.hline(2, 19, 14, '#f3dcb2')
    g.rect(3, 17, 2, 5, '#6e4a35')
    g.rect(17, 17, 2, 5, '#6e4a35')
    g.rect(1, 0, 2, 22, '#6e4a35')
    g.rect(19, 0, 2, 22, '#6e4a35')
  })
}

/** Drinks vending machine. */
export function vendingSprite(): Prop {
  return sprite('vending', 14, 26, 7, 25, (g) => {
    const r: Ramp = { L: '#ff8a7a', b: '#e8514a', d: '#b8343f', D: '#7e2436' }
    for (let y = 0; y < 24; y++) slice(g, 7, y, 6.5, r, 0.2)
    g.rect(2, 2, 8, 12, '#d4f1ff')
    const cans = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#f58f35']
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) g.rect(3 + i * 2, 3 + row * 4, 1, 3, cans[(i + row) % cans.length])
    for (let i = 0; i < 4; i++) g.px(3 + i * 2, 15, '#fff3a6')
    g.rect(11, 5, 1, 4, '#3a3040')
    g.rect(3, 18, 8, 3, '#3a3040')
    g.rect(0, 24, 14, 2, '#8c8187')
  })
}

/** "FREE WiFi" sign on a post. */
export function wifiSignSprite(): Prop {
  return sprite('wifi', 22, 30, 11, 29, (g) => {
    g.rect(10, 14, 2, 16, '#8c8187')
    g.rect(1, 1, 20, 14, '#3d63b5')
    g.frame(1, 1, 20, 14, '#26306e')
    // Wi-Fi arcs.
    for (const [r, c] of [
      [5, '#ffffff'],
      [3, '#ffffff'],
    ] as [number, Color][]) {
      for (let a = -0.8; a <= 0.8; a += 0.12) g.px(Math.round(6 + Math.sin(a) * r), Math.round(9 - Math.cos(a) * r), c)
    }
    g.px(6, 9, '#ffffff')
    word(g, 10, 3, 'Wi', '#ffd23f')
    word(g, 10, 8, 'FR', '#ffffff')
    g.px(18, 12, '#ffffff')
  })
}

/** Concrete power pole with crossarms, insulators and a transformer. */
export function powerPoleSprite(): Prop {
  return sprite('pole-elec', 16, 66, 8, 65, (g) => {
    for (let y = 4; y < 66; y++) slice(g, 8, y, 1.8 - (66 - y) * 0.004, { L: '#e4ddd6', b: '#c9c0b8', d: '#a8a098', D: '#8c8187' })
    g.rect(1, 6, 14, 2, '#8c8187')
    g.rect(3, 13, 10, 2, '#8c8187')
    for (const x of [2, 7, 13]) g.rect(x, 4, 1, 2, '#fffaf0')
    g.rect(4, 22, 8, 8, '#a8a8b8')
    g.rect(4, 22, 8, 1, '#d0d0da')
    g.px(6, 25, '#6d6478')
    // Stickers and a tangle of loose cables.
    g.rect(7, 40, 3, 4, '#ffd23f')
    g.rect(6, 46, 4, 3, '#ff9fc0')
    for (let i = 0; i < 6; i++) g.px(5 + ((i * 3) % 7), 16 + (i % 3), '#3a3040')
    g.circle(9, 32, 2.2, '#3a3040')
    g.px(10, 31, '#5a5068')
  })
}

/** Street spirit house on a pillar with red Fanta bottles and zebra figurines. */
export function streetSpiritSprite(): Prop {
  return sprite('spirit-street', 26, 40, 13, 39, (g) => {
    tier(g, 13, 35, 5, 7, WHITE_RAMP)
    for (let y = 20; y < 35; y++) slice(g, 13, y, 2.2, WHITE_RAMP)
    g.rect(4, 18, 18, 2, GOLD.d)
    g.hline(4, 21, 18, GOLD.l)
    g.rect(7, 10, 12, 8, GOLD.b)
    g.rect(8, 11, 10, 7, P.redD)
    g.rect(11, 12, 4, 6, '#4a3048')
    for (let i = 0; i < 8; i++) g.rect(5 + i, 9 - i, 16 - i * 2, 1, i < 2 ? ROOF.green.border : ROOF.orange.field)
    g.px(13, 1, GOLD.l)
    // Red Fanta bottles with straws.
    for (const x of [5, 8, 18, 21]) {
      g.rect(x, 15, 2, 3, '#e8243a')
      g.px(x, 15, '#ff7a8a')
      g.px(x + 1, 13, '#ffffff')
      g.px(x + 1, 14, '#ffffff')
    }
    // Zebra figurines at the foot.
    for (const x of [2, 20]) {
      g.rect(x, 32, 4, 2, '#ffffff')
      g.px(x + 1, 32, '#3a2838')
      g.px(x + 3, 33, '#3a2838')
      g.px(x + 4, 31, '#ffffff')
      g.px(x, 34, '#3a2838')
      g.px(x + 3, 34, '#3a2838')
    }
    // Garland.
    for (let x = 9; x <= 17; x++) g.px(x, 21 + Math.round(Math.sin(((x - 9) / 8) * Math.PI) * 2), x % 2 ? '#f58f35' : '#ffd23f')
  })
}

/** Fortune-teller booth (หมอดู) with an umbrella. */
export function fortuneBoothSprite(): Prop {
  return sprite('fortune', 34, 38, 17, 37, (g) => {
    for (let i = 0; i < 8; i++) {
      const half = 16 - i * 1.9
      g.rect(Math.round(17 - half), 10 - i, Math.round(half * 2), 1, i % 2 ? '#8a6ad0' : '#a283e8')
    }
    for (let x = 2; x < 32; x += 4) g.px(x, 11, '#ffd23f')
    g.rect(16, 11, 2, 12, '#6e4a35')
    g.rect(3, 23, 28, 3, P.redD)
    g.hline(3, 30, 23, P.red)
    g.rect(4, 26, 26, 8, P.red)
    for (let x = 6; x < 29; x += 4) g.px(x, 30, GOLD.b)
    g.rect(5, 34, 2, 4, '#6e4a35')
    g.rect(27, 34, 2, 4, '#6e4a35')
    // Crystal ball and cards.
    g.circle(11, 20, 2.5, '#c8e8ff')
    g.px(10, 19, '#ffffff')
    g.rect(9, 22, 5, 1, GOLD.d)
    for (let i = 0; i < 3; i++) g.rect(18 + i * 3, 20, 2, 3, i === 1 ? '#fffaf0' : '#b394f0')
    // Palm-reading sign.
    g.rect(24, 12, 8, 9, '#fffaf0')
    g.frame(24, 12, 8, 9, '#8a6ad0')
    g.rect(26, 15, 4, 4, '#f0bd90')
    g.vline(26, 13, 15, '#f0bd90')
    g.vline(28, 13, 15, '#f0bd90')
  })
}

/** Cardboard box with cats peeking out; `pop` lifts the heads. */
export function catBoxSprite(pop = false): Sprite {
  return cached(`catbox:${pop ? 1 : 0}`, () => {
    const art = [
      pop ? '.b..b..w..w..' : '.............',
      pop ? '.bbbb..wwww..' : '.............',
      pop ? '.BeBe..WeWe..' : '.b..b..w..w..',
      pop ? '.BBnB..WWnW..' : '.bbbb..wwww..',
      'kkkkkkkkkkkkk',
      'kKKKKKKKKKKKk',
      'kKKKKdKKKKKKk',
      'kKKKKdKKKKKKk',
      'kKKKKKKKKKKKk',
      'kkkkkkkkkkkkk',
    ]
    return makeSprite(art, { b: '#f5a55a', B: '#f5a55a', w: '#3a3040', W: '#fffaf0', e: P.ink, n: '#ff8fa3', k: '#b0804e', K: '#d8a868', d: '#8a6040' }, { outline: P.ink })
  })
}

/** Soi dog sprawled on the cool floor; `belly` rolls it over. */
export function sprawlDogSprite(belly: boolean, coat = { B: '#e0a868', b: '#b87c43', w: '#fbe3bf' }): Sprite {
  return cached(`sprawl:${belly ? 1 : 0}:${coat.B}`, () => {
    const art = belly
      ? ['.w.w.....w.w..', '.B.B.....B.B..', 'tBBBBBBBBBBBb.', '.BwwwwwwwwwBBb', '.BBBBBBBBBBBeB', '..........bBnB']
      : ['..............', '..............', '.bBBBBBBBBBb..', 'tBBBBBBBBBBBBb', 'BwBBwBBBBwBBBe', 'w..w....w..Bwn']
    return makeSprite(art, { B: coat.B, b: coat.b, w: coat.w, t: coat.B, e: P.ink, n: P.ink }, { outline: P.ink })
  })
}

/** Stone planter box with a little shrub and flowers. */
export function planterSprite(variant = 0): Prop {
  return sprite(`planter:${variant}`, 20, 16, 10, 15, (g) => {
    g.rect(1, 9, 18, 7, WHITE_RAMP.d)
    g.rect(1, 9, 18, 1, '#ffffff')
    g.rect(1, 14, 18, 2, WHITE_RAMP.D)
    g.rect(2, 7, 16, 2, '#8a6040')
    const leaves = variant === 1 ? ['#3f8a4f', '#5eae55'] : ['#5eae55', '#9ed86a']
    for (let i = 0; i < 16; i++) {
      const x = 2 + i
      const h = 3 + ((i * 7) % 4)
      g.vline(x, 8 - h, 8, i % 2 ? leaves[0] : leaves[1])
    }
    const fl = variant === 2 ? '#ff9fc0' : variant === 1 ? '#ffd23f' : '#e8514a'
    for (const x of [4, 8, 12, 16]) g.px(x, 2 + (x % 3), fl)
  })
}

/** Festival banner on a tall pole (ธงทิว). The cloth is drawn by drawBanner. */
export function drawBanner(g: Surface, x: number, y: number, t: number, color: Color, seed = 0) {
  const light = mixHex(color, '#ffffff', 0.35)
  for (let j = 0; j < 18; j++) {
    const off = Math.round(Math.sin(t * 3 + seed - j * 0.35) * (j / 18) * 2)
    const w = j > 14 ? 5 - (j - 14) * 2 : 5
    for (let i = 0; i < Math.max(1, w); i++) {
      const c = j % 6 === 2 ? GOLD.b : i === 0 ? light : color
      g.px(x + 1 + i + off + (5 - Math.max(1, w)) / 2, y + j, c)
    }
  }
}

/** Temple-fair ferris wheel (ชิงช้าสวรรค์) far away; lights twinkle at night. */
export function drawFerrisWheel(g: Surface, cx: number, cy: number, r: number, t: number, night: boolean, clipY: number) {
  const frame = night ? '#6a5a9a' : '#b8c0d8'
  const put = (x: number, y: number, c: Color) => {
    if (y < clipY) g.px(x, y, c)
  }
  // Legs.
  for (let k = 0; k <= r + 6; k++) {
    put(Math.round(cx - k * 0.45), cy + k, frame)
    put(Math.round(cx + k * 0.45), cy + k, frame)
  }
  const a0 = t * 0.25
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2
    put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), frame)
  }
  const colors = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#ffb35a']
  for (let i = 0; i < 10; i++) {
    const a = a0 + (i / 10) * Math.PI * 2
    const x = Math.round(cx + Math.cos(a) * r)
    const y = Math.round(cy + Math.sin(a) * r)
    for (let k = 1; k < r; k += 3) put(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), frame)
    const lit = night && (Math.floor(t * 3) + i) % 3 !== 0
    put(x, y + 1, lit ? colors[i % colors.length] : night ? '#8a7ab8' : '#e8514a')
    put(x + 1, y + 1, lit ? colors[i % colors.length] : night ? '#8a7ab8' : '#ffd23f')
  }
  put(cx, cy, night ? '#fff3a6' : frame)
}

export { STEEL }
