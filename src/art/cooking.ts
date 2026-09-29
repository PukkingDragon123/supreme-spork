// Cooking art: 16×16 item icons for every ingredient and dish (`foodIcon`),
// big plated dishes for the result reveal (`dishSprite`), and the pieces of
// the close-up kitchen used by the Cooking-Mama-style mini-games: the
// backdrop, gas stove and flames, wok, pan, pot, rooster bowl, ขนมครก pan,
// round tamarind-wood board, plates, spice bottles, tools and food bits.
// Everything is procedural pixel art, cached per key.

import { bake, type Color, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, spriteDataUrl, type Sprite } from '../engine/sprite'
import { P } from './palette'
import type { Bit, Condiment } from '../game/data/recipes'

const INK = P.ink

function outlined(key: string, w: number, h: number, draw: (g: Surface) => void, outline: Color | null = INK): Sprite {
  return cached(key, () => {
    const c = bake(w, h, draw)
    return outline ? outlineCanvas(c, outline) : { canvas: c, w, h }
  })
}

// ---------------------------------------------------------------------------
// Food palette

export const FOOD = {
  rice: '#fffaf0',
  riceD: '#e9dfcc',
  riceS: '#d6c8ae',
  egg: '#ffd84a',
  eggL: '#fff2a0',
  eggD: '#f0a830',
  eggB: '#c9782a',
  white: '#fffdf6',
  porkRaw: '#f2a0a0',
  porkRawL: '#ffc6bf',
  porkRawD: '#cf6e75',
  pork: '#a8704f',
  porkL: '#c98e68',
  porkD: '#7a4a35',
  chick: '#f6dcc2',
  chickD: '#dcb898',
  chickRaw: '#ffd0c0',
  basil: '#3f9a4a',
  basilL: '#6cc36a',
  basilD: '#2a6e3a',
  chili: '#e8413a',
  chiliL: '#ff7a5a',
  chiliD: '#aa2430',
  stem: '#5ea653',
  garlic: '#fff6ea',
  garlicD: '#e6d6c4',
  garlicP: '#c9a0c8',
  tofu: '#ffe28a',
  tofuD: '#e8b85a',
  cabbage: '#d8f0b8',
  cabbageD: '#a8d888',
  onion: '#7cc55e',
  onionD: '#4f9a45',
  mango: '#ffcf3a',
  mangoL: '#ffe57a',
  mangoD: '#f0a020',
  eggplant: '#e6f4cf',
  eggplantD: '#8cc070',
  cucumber: '#7cc55e',
  cucumberL: '#e8f8d0',
  noodle: '#f0dcb0',
  noodleD: '#d9b584',
  noodleS: '#d98f55',
  curry: '#9ccc65',
  curryL: '#c5e59a',
  curryD: '#6ea345',
  coconut: '#fffbf2',
  coconutD: '#ece2d0',
  batter: '#fff1d6',
  batterD: '#f2dcae',
  porridge: '#f6efe2',
  porridgeD: '#e2d6c0',
  soup: '#f6e8b8',
  soupD: '#e8d38e',
  sticky: '#fbf7ee',
  stickyD: '#e3d8c2',
  lime: '#9ccc65',
  limeL: '#d9f0a8',
  oil: '#ffd84a',
  broth: '#f3dd9a',
  water: '#b3e4f4',
} as const

/** บัวลอย colours: ใบเตย, อัญชัน, ฟักทอง, กุหลาบ. */
export const DOUGH = ['#8fd47a', '#8fb0f5', '#ffb866', '#ffb8cf'] as const
export const DOUGH_D = ['#5eae55', '#5f80d0', '#e88a3a', '#e8809e'] as const

// ---------------------------------------------------------------------------
// Parametric vessels and toppings shared by icons (s = 1) and big dishes.

type XY = { X: (v: number) => number; Y: (v: number) => number; R: (v: number) => number }
const tf = (cx: number, cy: number, s: number): XY => ({ X: (v) => cx + v * s, Y: (v) => cy + v * s, R: (v) => v * s })

function servePlate(g: Surface, cx: number, cy: number, s: number, gold: boolean) {
  const { X, Y, R } = tf(cx, cy, s)
  g.ellipse(X(0), Y(0.6), R(6.6), R(3.2), '#d9cdb8')
  g.ellipse(X(0), Y(0), R(6.6), R(3.2), gold ? '#ffe9a0' : '#fffaf0')
  if (s >= 2) g.ellipse(X(0), Y(0), R(5.6), R(2.6), gold ? '#ffd54f' : '#9fc4ee')
  g.ellipse(X(0), Y(0.15), R(5.1), R(2.3), gold ? '#fff6d0' : '#fffdf8')
  if (s < 2) {
    g.px(X(-5), Y(0), gold ? '#e9a53a' : '#9fc4ee')
    g.px(X(5) - 1, Y(0), gold ? '#e9a53a' : '#9fc4ee')
  }
}

const ROOSTER = ['..r....', '.rrr.g.', 'rrrr.gg', '.rrrrg.', '..rr...', '..y.y..']

/** Rooster bowl (ชามตราไก่): returns the soup surface ellipse. */
function serveBowl(g: Surface, cx: number, cy: number, s: number, gold: boolean): { cx: number; cy: number; rx: number; ry: number } {
  const { X, Y, R } = tf(cx, cy, s)
  const top = Y(-1.4)
  const bot = Y(3.4)
  const body = gold ? '#ffe9a0' : '#fffaf0'
  const shade = gold ? '#ffd98a' : '#ece2d0'
  g.poly(
    [
      [X(-6), top],
      [X(6), top],
      [X(4), bot],
      [X(-4), bot],
    ],
    body,
  )
  g.poly(
    [
      [X(2.4), top],
      [X(6), top],
      [X(4), bot],
      [X(1.8), bot],
    ],
    shade,
  )
  g.rect(X(-2.6), bot, R(5.2), Math.max(1, R(0.7)), gold ? '#e9a53a' : '#d9cdb8')
  // Green band, banana tree and the proud red rooster.
  const band = Y(1.5)
  g.hline(X(-4.8) + 1, X(4.8) - 1, band, gold ? '#e9a53a' : '#6cbf5c')
  if (s >= 2) {
    const ox = Math.round(X(-2.6))
    const oy = Math.round(Y(-0.5))
    for (let r = 0; r < ROOSTER.length; r++)
      for (let c = 0; c < ROOSTER[r].length; c++) {
        const k = ROOSTER[r][c]
        if (k !== '.') g.px(ox + c, oy + r, k === 'r' ? '#e8514a' : k === 'g' ? '#3a2838' : '#e9a53a')
      }
    const bx = Math.round(X(2.2))
    g.vline(bx, Y(-0.4), band, '#43905a')
    g.line(bx, Y(-0.4), bx - 3, Y(0.3), '#6cbf5c')
    g.line(bx, Y(-0.4), bx + 3, Y(0.1), '#6cbf5c')
  } else {
    g.px(X(-2), Y(0.6), '#e8514a')
    g.px(X(-1), Y(0.6), '#e8514a')
    g.px(X(-1.5), Y(0.2), '#e8514a')
  }
  g.ellipse(X(0), top, R(6), R(2.5), gold ? '#e9a53a' : '#d9cdb8')
  g.ellipse(X(0), top - 0.3, R(5.5), R(2.1), body)
  return { cx: X(0), cy: top + 0.3, rx: R(4.9), ry: R(1.7) }
}

function serveLeaf(g: Surface, cx: number, cy: number, s: number, gold: boolean) {
  const { X, Y, R } = tf(cx, cy, s)
  if (gold) g.ellipse(X(0), Y(0.4), R(7), R(3.5), '#e9a53a')
  g.poly(
    [
      [X(-6.8), Y(0.4)],
      [X(-3), Y(-3)],
      [X(4), Y(-3.2)],
      [X(6.8), Y(-0.2)],
      [X(3), Y(3.2)],
      [X(-4), Y(3.2)],
    ],
    '#5eae55',
  )
  g.poly(
    [
      [X(-5.8), Y(0.2)],
      [X(-2.6), Y(-2.4)],
      [X(3.6), Y(-2.5)],
      [X(5.8), Y(-0.2)],
      [X(2.6), Y(2.4)],
      [X(-3.6), Y(2.4)],
    ],
    '#8fd47a',
  )
  g.line(X(-5.5), Y(0.2), X(5.5), Y(-0.2), '#5eae55')
  if (s >= 2) for (let i = -4; i <= 4; i += 2) g.line(X(i), Y(-0.1), X(i + 1.2), Y(-2), '#6cbf5c')
}

/** Irregular heap made of overlapping circles (rice, pork, sticky rice…). */
function heap(g: Surface, cx: number, cy: number, s: number, rx: number, ry: number, base: Color, light: Color, dark: Color, seed = 1) {
  const { X, Y, R } = tf(cx, cy, s)
  g.ellipse(X(0), Y(0.3), R(rx), R(ry), dark)
  g.ellipse(X(-0.2), Y(-0.1), R(rx - 0.4), R(ry - 0.3), base)
  g.ellipse(X(-rx * 0.35), Y(-ry * 0.35), R(rx * 0.45), R(ry * 0.4), light)
  if (s >= 2) {
    let n = seed * 97
    for (let i = 0; i < rx * ry * s * 0.9; i++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff
      const a = (n % 628) / 100
      const d = ((n >> 10) % 100) / 100
      const x = Math.round(X(Math.cos(a) * rx * 0.85 * d))
      const y = Math.round(Y(Math.sin(a) * ry * 0.8 * d))
      g.px(x, y, i % 3 ? dark : light)
    }
  }
}

function leafBit(g: Surface, x: number, y: number, s: number, c: Color = FOOD.basil, l: Color = FOOD.basilL) {
  if (s < 2) {
    g.px(x, y, c)
    return
  }
  g.ellipse(x, y, 1.6 * (s / 3) + 0.6, 1 * (s / 3) + 0.5, c)
  g.px(Math.round(x - 1), Math.round(y - 1), l)
}

function drawDishArt(g: Surface, id: string, cx: number, cy: number, s: number, gold: boolean) {
  const { X, Y, R } = tf(cx, cy, s)
  const big = s >= 2
  switch (id) {
    case 'dish_kaijiao': {
      servePlate(g, cx, cy, s, gold)
      heap(g, X(-2.4), Y(-0.8), s, 3, 1.7, FOOD.rice, '#ffffff', FOOD.riceD, 3)
      // Puffy, flat omelette with crispy golden lace around the edge.
      const om: [number, number, number, number][] = [
        [1.4, -0.6, 3.4, 1.9],
        [3, 0.4, 2.4, 1.4],
        [0.2, 0.7, 2.6, 1.4],
      ]
      for (const [x, y, rx, ry] of om) g.ellipse(X(x), Y(y), R(rx) + 0.8, R(ry) + 0.8, FOOD.eggB)
      for (const [x, y, rx, ry] of om) g.ellipse(X(x), Y(y), R(rx), R(ry), FOOD.eggD)
      for (const [x, y, rx, ry] of om) g.ellipse(X(x - 0.2), Y(y - 0.3), R(rx * 0.78), R(ry * 0.66), FOOD.egg)
      g.ellipse(X(0.8), Y(-1), R(1.3), R(0.6), FOOD.eggL)
      if (big) {
        g.ellipse(X(2.8), Y(0.2), R(0.7), R(0.35), FOOD.eggL)
        // Lace bubbles and crispy bits.
        for (const [x, y] of [[-1.6, 1.2], [4.8, 0.4], [2.4, -2.3], [4, 1.6], [-0.8, -0.4], [1.8, 1.8]]) g.px(X(x), Y(y), FOOD.eggB)
        for (const [x, y] of [[0.4, -0.2], [2, 0.6], [3.4, -0.4]]) g.px(X(x), Y(y), FOOD.eggD)
        leafBit(g, X(3.6), Y(-1.6), s, FOOD.onion, FOOD.basilL)
        // A drizzle of chilli sauce (ซอสพริก).
        g.line(X(0), Y(-0.2), X(2.4), Y(-0.9), '#e8514a')
      }
      break
    }
    case 'dish_khaopad': {
      servePlate(g, cx, cy, s, gold)
      heap(g, X(-0.5), Y(-0.6), s, 4.4, 2.2, '#f6cf88', '#fbe3b0', '#e0a860', 5)
      g.px(X(-1.5), Y(-1.2), FOOD.egg)
      g.px(X(1), Y(-0.4), FOOD.onion)
      if (big) {
        for (const [x, y] of [[-2.6, -0.4], [0.4, -1.6], [2, 0], [-1, 0.6]]) g.rect(X(x), Y(y), R(0.6), R(0.5), FOOD.egg)
        for (const [x, y] of [[-3, -1.2], [1.6, -1.1], [-0.4, 0.2], [3, -0.6]]) g.px(X(x), Y(y), FOOD.onion)
        for (const [x, y] of [[-1.8, 0.3], [2.4, -1.5]]) g.px(X(x), Y(y), '#e88a7a')
      }
      // Cucumber slices and a lime wedge.
      g.circle(X(4.4), Y(1), R(0.9), FOOD.cucumber)
      g.circle(X(4.4), Y(1), R(0.6), FOOD.cucumberL)
      g.poly([[X(-5), Y(1.2)], [X(-3.2), Y(0.6)], [X(-3.4), Y(2)]], FOOD.lime)
      if (big) g.line(X(-4.6), Y(1.2), X(-3.4), Y(1.3), FOOD.limeL)
      break
    }
    case 'dish_kaprao': {
      servePlate(g, cx, cy, s, gold)
      heap(g, X(-2.3), Y(-0.4), s, 3, 1.9, FOOD.rice, '#ffffff', FOOD.riceD, 7)
      heap(g, X(2), Y(-0.2), s, 3.2, 1.9, FOOD.pork, FOOD.porkL, FOOD.porkD, 8)
      leafBit(g, X(1.2), Y(-1.2), s)
      leafBit(g, X(3), Y(0), s)
      g.px(X(2.2), Y(-0.6), FOOD.chili)
      if (big) {
        leafBit(g, X(2.2), Y(-1.9), s, FOOD.basilD, FOOD.basil)
        leafBit(g, X(0.6), Y(0.4), s)
        for (const [x, y] of [[3.8, -1], [1.6, 0.8], [0.2, -0.6]]) g.rect(X(x), Y(y), R(0.5), R(0.4), FOOD.chili)
        // Tiny cup of chilli fish sauce (พริกน้ำปลา).
        g.ellipse(X(-4.2), Y(1.6), R(1.2), R(0.6), '#fffaf0')
        g.ellipse(X(-4.2), Y(1.5), R(0.9), R(0.4), '#c86f1a')
        g.px(X(-4.3), Y(1.4), FOOD.chili)
      }
      break
    }
    case 'dish_padthai': {
      servePlate(g, cx, cy, s, gold)
      // Egg-net parcel: a plump pillow with a lattice and a peek of noodles.
      g.ellipse(X(-0.2), Y(-0.2), R(4.4), R(2.5), FOOD.eggB)
      g.ellipse(X(-0.2), Y(-0.4), R(4.2), R(2.2), FOOD.eggD)
      g.ellipse(X(-0.5), Y(-0.7), R(3.7), R(1.8), FOOD.egg)
      if (big) {
        const ex = X(-0.2)
        const ey = Y(-0.4)
        for (let j = -8; j <= 8; j += 3)
          for (let i = -16; i <= 16; i += 3) {
            const x = ex + i + (((j + 8) / 3) % 2 ? 1.5 : 0)
            const y = ey + j
            const dx = (x - ex) / R(3.9)
            const dy = (y - ey) / R(2)
            if (dx * dx + dy * dy < 1) g.px(Math.round(x), Math.round(y), FOOD.eggD)
          }
        g.ellipse(X(0.6), Y(-0.9), R(1.3), R(0.5), FOOD.noodleS)
        g.hline(X(-0.4), X(1.4), Y(-1), FOOD.noodle)
        g.ellipse(X(-2), Y(-1.3), R(1), R(0.4), FOOD.eggL)
      } else {
        g.px(X(-1), Y(-1), FOOD.eggL)
        g.px(X(1), Y(-0.5), FOOD.eggD)
      }
      g.poly([[X(4), Y(0.8)], [X(5.8), Y(0)], [X(5.6), Y(1.8)]], FOOD.lime)
      g.line(X(-5), Y(1.4), X(-2.6), Y(2), FOOD.onionD)
      if (big) {
        g.line(X(-5), Y(0.8), X(-2.8), Y(1.6), FOOD.onion)
        for (const [x, y] of [[3, 2], [3.6, 1.6], [-1, 2.2]]) g.px(X(x), Y(y), '#d9a45a')
      }
      break
    }
    case 'dish_mango': {
      servePlate(g, cx, cy, s, gold)
      heap(g, X(-2.2), Y(-0.3), s, 2.8, 1.8, FOOD.sticky, '#ffffff', FOOD.stickyD, 11)
      // Coconut cream drizzle and mung beans.
      g.ellipse(X(-2.4), Y(-1), R(1.6), R(0.7), FOOD.coconut)
      g.px(X(-2.2), Y(-1.6), '#f0c040')
      // Mango cheek sliced and fanned out.
      for (let i = 0; i < 4; i++) {
        const x = X(1.4 + i * 1.1)
        const y = Y(-0.4 + i * 0.25)
        g.ellipse(x, y, R(0.9) + 0.6, R(2) + 0.6, FOOD.mangoD)
        g.ellipse(x - 0.3, y - 0.3, R(0.9), R(2), i % 2 ? FOOD.mango : FOOD.mangoL)
        if (big) g.vline(Math.round(x - R(0.3)), Math.round(y - R(1.2)), Math.round(y + R(0.8)), '#fff3b0')
      }
      if (big) leafBit(g, X(5.2), Y(-2.2), s, FOOD.basilL, '#b4e486')
      break
    }
    case 'dish_tomjued':
    case 'dish_khaotom':
    case 'dish_bualoy':
    case 'dish_kiaowan': {
      const b = serveBowl(g, cx, cy + s * 0.5, s, gold)
      const soup =
        id === 'dish_tomjued'
          ? [FOOD.soup, FOOD.soupD]
          : id === 'dish_khaotom'
            ? [FOOD.porridge, FOOD.porridgeD]
            : id === 'dish_bualoy'
              ? [FOOD.coconut, FOOD.coconutD]
              : [FOOD.curry, FOOD.curryD]
      g.ellipse(b.cx, b.cy, b.rx, b.ry, soup[0])
      g.ellipse(b.cx + b.rx * 0.3, b.cy + b.ry * 0.35, b.rx * 0.6, b.ry * 0.5, soup[1])
      const pts: [number, number][] = [
        [-0.55, -0.2],
        [0.1, 0.25],
        [0.55, -0.1],
        [-0.15, -0.45],
        [0.35, 0.45],
        [-0.45, 0.4],
      ]
      const P2 = (i: number): [number, number] => [b.cx + pts[i][0] * b.rx, b.cy + pts[i][1] * b.ry]
      if (id === 'dish_tomjued') {
        for (const i of [0, 2]) {
          const [x, y] = P2(i)
          g.rect(x - R(0.6), y - R(0.4), R(1.2), R(0.9), FOOD.tofu)
        }
        const [px, py] = P2(1)
        g.circle(px, py, R(0.6), '#c9a088')
        const [cxx, cyy] = P2(3)
        leafBit(g, cxx, cyy, s, FOOD.cabbageD, FOOD.cabbage)
        if (big) {
          const [x4, y4] = P2(4)
          g.circle(x4, y4, R(0.55), '#c9a088')
          for (const i of [5]) leafBit(g, P2(i)[0], P2(i)[1], s, FOOD.onion, FOOD.basilL)
        }
      } else if (id === 'dish_khaotom') {
        const [px, py] = P2(1)
        g.circle(px, py, R(0.6), '#c9a088')
        g.px(P2(0)[0], P2(0)[1], FOOD.onion)
        g.px(P2(2)[0], P2(2)[1], '#e0a040')
        if (big) {
          for (const i of [3, 4, 5]) g.px(P2(i)[0], P2(i)[1], i % 2 ? FOOD.onion : '#e0a040')
          g.circle(P2(2)[0] - 2, P2(2)[1] + 1, R(0.5), '#c9a088')
          // Ginger threads.
          g.line(b.cx - R(1), b.cy - R(0.4), b.cx + R(0.2), b.cy - R(0.6), '#f5d08a')
        }
      } else if (id === 'dish_bualoy') {
        for (let i = 0; i < (big ? 6 : 4); i++) {
          const [x, y] = P2(i)
          g.circle(x, y, big ? R(0.55) : 1, DOUGH[i % 4])
          if (big) g.px(Math.round(x - 1), Math.round(y - 1), '#ffffff')
        }
        if (big) leafBit(g, b.cx + b.rx * 0.7, b.cy - b.ry * 0.5, s, FOOD.basil, FOOD.basilL)
      } else {
        g.ellipse(b.cx - b.rx * 0.2, b.cy - b.ry * 0.2, b.rx * 0.35, b.ry * 0.3, FOOD.curryL)
        for (const i of [0, 2]) g.circle(P2(i)[0], P2(i)[1], R(0.6), FOOD.chick)
        g.px(P2(1)[0], P2(1)[1], FOOD.chili)
        leafBit(g, P2(3)[0], P2(3)[1], s)
        if (big) {
          g.circle(P2(4)[0], P2(4)[1], R(0.55), FOOD.chick)
          g.circle(P2(5)[0], P2(5)[1], R(0.6), FOOD.eggplant)
          for (const [dx, dy] of [[0.2, 0.05], [-0.3, 0.25]]) g.rect(b.cx + dx * b.rx, b.cy + dy * b.ry, R(0.5), R(0.35), FOOD.chili)
        }
      }
      if (id !== 'dish_bualoy' && big) {
        // Steam curls.
        for (const dx of [-1.6, 1.2]) {
          g.px(X(dx), Y(-4.2), '#ffffff')
          g.px(X(dx) + 1, Y(-5), '#ffffff')
          g.px(X(dx), Y(-5.8), '#ffffff')
        }
      }
      break
    }
    case 'dish_khanomkrok': {
      serveLeaf(g, cx, cy, s, gold)
      const cups: [number, number][] = big
        ? [
            [-3.4, -0.9],
            [0, -1.1],
            [3.4, -0.9],
            [-1.8, 1.2],
            [1.8, 1.2],
          ]
        : [
            [-2.8, -0.6],
            [0, -0.8],
            [2.8, -0.6],
            [-1.4, 1.2],
            [1.4, 1.2],
          ]
      for (const [x, y] of cups) {
        g.ellipse(X(x), Y(y) + 1, R(1.5), R(1.05), FOOD.eggB)
        g.ellipse(X(x), Y(y), R(1.5), R(1.05), '#e8a23a')
        g.ellipse(X(x), Y(y) - (big ? 1 : 0), R(1.05), R(0.7), FOOD.coconut)
        if (big) {
          g.px(X(x) - 1, Y(y) - 2, '#ffffff')
          g.px(X(x) + 1, Y(y) - 1, FOOD.onion)
        }
      }
      break
    }
    default:
      servePlate(g, cx, cy, s, gold)
  }
  if (gold) {
    // A little golden star sparkle marks the chef-made variant.
    const sx = big ? X(5.4) : 12
    const sy = big ? Y(-4.4) : 2
    g.px(sx, sy, '#fff3a6')
    g.px(sx - 1, sy, P.gold)
    g.px(sx + 1, sy, P.gold)
    g.px(sx, sy - 1, P.gold)
    g.px(sx, sy + 1, P.gold)
    if (big) {
      g.px(sx - 2, sy, P.goldD)
      g.px(sx + 2, sy, P.goldD)
      g.px(sx, sy - 2, P.goldD)
      g.px(sx, sy + 2, P.goldD)
    }
  }
}

// ---------------------------------------------------------------------------
// Ingredient icons (14×14 grid, outlined to 16×16 like art/icons.ts)

type Draw = (g: Surface) => void

const ING: Record<string, Draw> = {
  ing_egg: (g) => {
    g.ellipse(3.8, 6.2, 2.9, 3.7, '#fff6e8')
    g.ellipse(4.6, 7.2, 1.9, 2.6, '#f0dcc0')
    g.ellipse(3.6, 5.8, 2.2, 2.8, '#fff6e8')
    g.px(2, 4, '#ffffff')
    g.ellipse(10.2, 5.6, 2.9, 3.7, '#f0c088')
    g.ellipse(11, 6.6, 1.9, 2.6, '#d99a5c')
    g.ellipse(10, 5.2, 2.2, 2.8, '#f0c088')
    g.px(9, 3, '#ffe4c0')
    // Pulp carton.
    g.rect(0, 9, 14, 4, '#c9d3dc')
    g.hline(0, 13, 9, '#e6edf2')
    for (const x of [3, 7, 10]) g.vline(x, 10, 12, '#a9b6c2')
    g.hline(0, 13, 12, '#a9b6c2')
  },
  ing_rice: (g) => {
    g.poly([[3, 4], [11, 4], [12, 13], [2, 13]], '#fffaf0')
    g.poly([[9, 4], [11, 4], [12, 13], [10, 13]], '#ece2d0')
    g.rect(4, 2, 6, 2, '#e9dfcc')
    g.px(6, 1, '#c28e5c')
    g.px(7, 1, '#c28e5c')
    g.rect(4, 7, 6, 4, '#6cc36a')
    g.rect(5, 8, 4, 2, '#fffaf0')
    g.px(6, 8, '#e8514a')
    g.px(1, 13, '#fffaf0')
    g.px(13, 12, '#fffaf0')
  },
  ing_sticky: (g) => {
    g.rect(3, 6, 8, 7, '#d9ab62')
    for (let y = 7; y < 13; y += 2) for (let x = 3 + ((y >> 1) % 2); x < 11; x += 2) g.px(x, y, '#b98846')
    g.rect(2, 3, 10, 3, '#ebc783')
    g.hline(2, 11, 3, '#f8e2a8')
    g.rect(4, 5, 6, 1, '#fffaf0')
    g.px(7, 2, '#8e6232')
    g.rect(4, 13, 6, 1, '#8e6232')
  },
  ing_pork: (g) => {
    g.rect(1, 8, 12, 5, '#f4f2ee')
    g.hline(1, 12, 8, '#ffffff')
    g.hline(1, 12, 12, '#d8d4cc')
    g.ellipse(7, 8, 5, 3, FOOD.porkRaw)
    for (const [x, y] of [[4, 7], [6, 9], [8, 7], [10, 9], [7, 8]]) g.px(x, y, (x + y) % 3 ? FOOD.porkRawD : FOOD.porkRawL)
    g.px(4, 6, '#ffffff')
    g.px(5, 5, '#ffffff')
  },
  ing_chicken: (g) => {
    g.rect(1, 9, 12, 4, '#8fc4ec')
    g.hline(1, 12, 9, '#bfe0f8')
    g.ellipse(7, 8, 5, 3, FOOD.chickRaw)
    g.ellipse(6, 7.5, 3.5, 2, '#ffe4d8')
    g.px(10, 9, '#f0a898')
    g.px(4, 6, '#ffffff')
  },
  ing_tofu: (g) => {
    g.rect(1, 3, 12, 5, FOOD.tofu)
    g.hline(1, 12, 3, '#fff3b8')
    g.hline(1, 12, 7, FOOD.tofuD)
    g.rect(5, 3, 4, 5, '#e8514a')
    g.px(6, 5, '#fffaf0')
    g.px(7, 5, '#fffaf0')
    g.vline(0, 4, 6, '#f4f2ee')
    g.vline(13, 4, 6, '#f4f2ee')
    g.ellipse(4, 11, 2.6, 2, FOOD.tofuD)
    g.ellipse(4, 10.6, 2.2, 1.5, FOOD.tofu)
    g.ellipse(9.5, 11, 2.6, 2, FOOD.tofuD)
    g.ellipse(9.5, 10.6, 2.2, 1.5, FOOD.tofu)
  },
  ing_noodle: (g) => {
    for (let x = 3; x <= 10; x++) {
      const c = x % 2 ? FOOD.noodle : FOOD.noodleD
      for (let y = 1; y <= 12; y++) g.px(x + (((y + x) >> 2) % 2 ? 0 : 0), y, c)
    }
    g.px(2, 2, FOOD.noodle)
    g.px(11, 11, FOOD.noodleD)
    g.rect(2, 6, 10, 2, '#e8514a')
    g.hline(2, 11, 6, '#ff8a7a')
  },
  ing_basil: (g) => {
    g.line(7, 13, 5, 7, '#8a4a6a')
    g.line(7, 13, 9, 7, '#8a4a6a')
    g.line(7, 13, 7, 5, '#8a4a6a')
    for (const [x, y, c] of [
      [4, 6, FOOD.basil],
      [10, 6, FOOD.basil],
      [7, 3, FOOD.basilD],
      [4, 9, FOOD.basilD],
      [10, 9, FOOD.basil],
      [7, 7, FOOD.basil],
    ] as [number, number, string][]) {
      g.ellipse(x, y, 2.4, 1.7, c)
      g.px(x - 1, y - 1, FOOD.basilL)
    }
  },
  ing_chili: (g) => {
    const chili = (x0: number, y0: number, x1: number, y1: number, c: Color) => {
      g.thickLine(x0, y0, x1, y1, 2.3, c)
      g.px(Math.round((x0 + x1) / 2) - 1, Math.round((y0 + y1) / 2), FOOD.chiliL)
      g.px(x1, y1 - 1, FOOD.stem)
      g.px(x1, y1 - 2, FOOD.stem)
    }
    chili(2, 12, 5, 4, FOOD.chili)
    chili(12, 12, 9, 4, FOOD.chili)
    chili(7, 13, 7, 4, FOOD.chiliD)
  },
  ing_garlic: (g) => {
    g.ellipse(7, 8.5, 5.2, 4.5, FOOD.garlic)
    g.vline(5, 6, 12, FOOD.garlicD)
    g.vline(9, 6, 12, FOOD.garlicD)
    g.px(3, 10, FOOD.garlicP)
    g.px(11, 10, FOOD.garlicP)
    g.px(7, 11, FOOD.garlicP)
    g.rect(6, 2, 2, 3, '#efe2d0')
    g.rect(5, 13, 4, 1, '#c9b8a0')
    g.px(4, 6, '#ffffff')
  },
  ing_veg: (g) => {
    g.circle(6, 8, 5.2, FOOD.cabbageD)
    g.circle(6, 8, 3.8, FOOD.cabbage)
    g.line(6, 11, 4, 6, FOOD.cabbageD)
    g.line(6, 11, 8, 6, FOOD.cabbageD)
    g.px(5, 5, '#f0fbe0')
    g.vline(11, 2, 11, FOOD.onion)
    g.vline(12, 1, 9, FOOD.onionD)
    g.rect(10, 11, 3, 2, '#fffaf0')
  },
  ing_coconut: (g) => {
    g.ellipse(7, 9.5, 6.2, 4, '#8a5a32')
    g.ellipse(7, 8, 5.4, 2.6, FOOD.coconut)
    g.ellipse(7, 8.2, 3.8, 1.6, FOOD.coconutD)
    for (const [x, y] of [[3, 11], [6, 12], [10, 11]]) g.px(x, y, '#6e4a35')
    g.px(11, 1, '#ffffff')
    g.rect(10, 2, 3, 2, '#ffffff')
    g.px(11, 4, '#ece2d0')
  },
  ing_paste: (g) => {
    g.poly([[1, 7], [13, 7], [11, 13], [3, 13]], '#bdb2ae')
    g.poly([[9, 7], [13, 7], [11, 13], [9, 13]], '#9a9088')
    g.ellipse(7, 7, 6, 2.4, '#8c8187')
    g.ellipse(7, 7, 4.8, 1.7, FOOD.curryD)
    g.px(5, 6, FOOD.curry)
    g.px(8, 7, FOOD.chili)
    g.thickLine(9, 6, 12, 1, 2, '#c28e5c')
    g.px(12, 0, '#e0bb8a')
  },
  ing_mango: (g) => {
    g.ellipse(7, 8.5, 6, 4.5, FOOD.mangoD)
    g.ellipse(6.6, 8, 5.4, 4, FOOD.mango)
    g.ellipse(5.5, 7, 3, 2.2, FOOD.mangoL)
    g.px(4, 6, '#fff3b0')
    g.px(11, 4, '#6e4a35')
    g.poly([[11, 4], [13, 1], [9, 2]], FOOD.stem)
  },
  ing_flour: (g) => {
    g.poly([[2, 4], [12, 4], [12, 13], [2, 13]], '#fffaf0')
    g.rect(10, 4, 2, 9, '#ece2d0')
    g.rect(3, 2, 8, 2, '#f0e6d6')
    g.rect(4, 7, 6, 4, P.pink)
    g.circle(7, 9, 1.4, '#fffaf0')
    g.px(4, 1, '#ffffff')
    g.px(9, 0, '#ffffff')
  },
  ing_sugar: (g) => {
    for (let i = 0; i < 3; i++) {
      const y = 11 - i * 3
      g.ellipse(7, y + 0.6, 5.2, 2, '#b8742a')
      g.ellipse(7, y, 5, 1.8, '#d9964a')
      g.ellipse(6, y - 0.4, 2.4, 0.8, '#f0c078')
    }
  },
  ing_fishsauce: (g) => {
    g.rect(5, 5, 5, 8, '#c86f1a')
    g.rect(6, 2, 3, 3, '#c86f1a')
    g.rect(6, 1, 3, 1, P.red)
    g.rect(5, 7, 5, 4, '#fffaf0')
    g.px(6, 9, P.blue)
    g.px(7, 9, P.blue)
    g.px(8, 8, P.blue)
    g.vline(5, 5, 12, '#f0a050')
    g.rect(4, 13, 7, 1, '#9a5214')
  },
  ing_oil: (g) => {
    g.rect(4, 4, 6, 9, FOOD.oil)
    g.rect(5, 2, 4, 2, '#fff09a')
    g.rect(5, 1, 4, 1, '#3fa06e')
    g.rect(4, 7, 6, 3, '#3fa06e')
    g.px(6, 8, '#ffd84a')
    g.vline(4, 4, 12, '#fff09a')
    g.px(12, 9, FOOD.oil)
    g.px(12, 10, '#f0a830')
  },
}

const DISH_KEYS = [
  'dish_kaijiao',
  'dish_khaopad',
  'dish_tomjued',
  'dish_khaotom',
  'dish_kaprao',
  'dish_khanomkrok',
  'dish_bualoy',
  'dish_padthai',
  'dish_mango',
  'dish_kiaowan',
]

/** Every item id foodIcon() knows (ingredients, dishes and their gold variants). */
export const FOOD_ICON_IDS = [...Object.keys(ING), ...DISH_KEYS, ...DISH_KEYS.map((d) => `${d}_gold`)]

export function hasFoodIcon(id: string): boolean {
  return FOOD_ICON_IDS.includes(id)
}

/** 16×16 item icon for a cooking ingredient or dish (same style as art/icons.ts). */
export function foodIcon(itemId: string): Sprite {
  return outlined(`food:${itemId}`, 14, 14, (g) => {
    const ing = ING[itemId]
    if (ing) return ing(g)
    const gold = itemId.endsWith('_gold')
    const base = gold ? itemId.slice(0, -5) : itemId
    drawDishArt(g, base, 7, 8, 1, gold)
  })
}

const urls = new Map<string, string>()

/** Data URL of a food icon at an integer scale (for <img>). */
export function foodIconUrl(itemId: string, scale = 3): string {
  const k = `${itemId}@${scale}`
  let u = urls.get(k)
  if (!u) {
    u = spriteDataUrl(foodIcon(itemId), scale)
    urls.set(k, u)
  }
  return u
}

/** Big plated dish (about 50×38) for the result reveal and the final plate. */
export function dishSprite(dishId: string): Sprite {
  const gold = dishId.endsWith('_gold')
  const base = gold ? dishId.slice(0, -5) : dishId
  return outlined(`dishbig:${dishId}`, 50, 38, (g) => drawDishArt(g, base, 25, 22, 3.4, gold))
}

// ---------------------------------------------------------------------------
// Kitchen backdrop

/** Bake the kitchen wall and countertop for a w×h stage; the counter starts at `counterY`. */
export function bakeKitchen(w: number, h: number, counterY: number): HTMLCanvasElement {
  return bake(w, h, (g) => {
    // Upper wall: warm cream with a soft stripe.
    g.rect(0, 0, w, counterY, '#fbeed6')
    for (let x = 0; x < w; x += 12) g.rect(x, 0, 6, counterY, '#f8e8cc')
    // Tiled backsplash.
    const tileTop = counterY - 44
    g.rect(0, tileTop, w, counterY - tileTop, '#bfe8d6')
    for (let y = tileTop; y < counterY; y += 6) {
      g.hline(0, w - 1, y, '#98cfb9')
      const off = ((y - tileTop) / 6) % 2 ? 6 : 0
      for (let x = off; x < w; x += 12) g.vline(x, y, Math.min(counterY - 1, y + 5), '#98cfb9')
      for (let x = off + 1; x < w; x += 12) g.px(x, y + 1, '#dcf5ea')
    }
    g.hline(0, w - 1, tileTop - 1, '#e0bb8a')
    g.hline(0, w - 1, tileTop - 2, '#c28e5c')

    // Window with the temple roof far away.
    const wx = Math.round(w * 0.1)
    const ww = Math.min(74, Math.round(w * 0.42))
    const wy = Math.max(26, tileTop - 72)
    const wh = tileTop - wy - 12
    g.rect(wx - 3, wy - 3, ww + 6, wh + 6, '#9a6a45')
    g.rect(wx - 2, wy - 2, ww + 4, wh + 4, '#c28e5c')
    g.gradientV(wx, wy, ww, wh, ['#bfe8ff', '#dff4ff', '#fff4d8'], 4)
    g.circle(wx + ww - 14, wy + 10, 5, '#fff7c2')
    // Far temple roof with chofa.
    const tx = wx + Math.round(ww * 0.62)
    const ty = wy + wh - 14
    g.poly([[tx - 14, ty + 6], [tx, ty - 6], [tx + 14, ty + 6]], '#f28a3c')
    g.poly([[tx - 10, ty + 6], [tx, ty - 2], [tx + 10, ty + 6]], '#cf6424')
    g.px(tx, ty - 8, P.gold)
    g.px(tx, ty - 7, P.gold)
    g.px(tx - 15, ty + 5, P.gold)
    g.px(tx + 15, ty + 5, P.gold)
    g.rect(tx - 9, ty + 6, 18, 6, '#fffaf0')
    g.rect(tx - 2, ty + 7, 4, 5, '#e8514a')
    // Trees and a coconut palm.
    for (let x = wx; x < wx + ww; x += 7) g.circle(x + 3, wy + wh - 3 + ((x * 7) % 3), 5, (x / 7) % 2 ? '#6cbf5c' : '#86c95f')
    g.rect(wx, wy + wh - 3, ww, 3, '#5ea653')
    g.vline(wx + 12, wy + 12, wy + wh - 4, '#9a6a45')
    for (const [dx, dy] of [[-6, 2], [6, 2], [-4, -2], [5, -2]]) g.line(wx + 12, wy + 12, wx + 12 + dx, wy + 12 + dy, '#43905a')
    // Mullions and curtains.
    g.vline(wx + Math.round(ww / 2), wy, wy + wh - 1, '#c28e5c')
    g.hline(wx, wx + ww - 1, wy + Math.round(wh / 2), '#c28e5c')
    for (const [cx, dir] of [[wx - 4, 1], [wx + ww + 3, -1]] as [number, number][]) {
      for (let y = wy - 5; y < wy + wh + 2; y++) {
        const k = Math.sin(y * 0.4) > 0 ? 1 : 0
        g.rect(cx - (dir < 0 ? 5 : 0), y, 6, 1, k ? '#ffb8cf' : '#ff9fc0')
      }
      g.rect(cx - (dir < 0 ? 5 : 0), wy + Math.round(wh * 0.55), 6, 2, '#e8709e')
    }
    g.rect(wx - 8, wy - 7, ww + 16, 3, '#9a6a45')
    // Sill with herb pots (กะเพรา and พริก).
    const sy = wy + wh + 3
    g.rect(wx - 6, sy, ww + 12, 3, '#e0bb8a')
    g.hline(wx - 6, wx + ww + 5, sy, '#f3dcb2')
    const pots: [number, 'basil' | 'chili'][] = [
      [wx + 8, 'basil'],
      [wx + ww - 10, 'chili'],
    ]
    for (const [px, kind] of pots) {
      g.rect(px - 4, sy - 6, 9, 6, '#d97b52')
      g.hline(px - 4, px + 4, sy - 6, '#f2a57a')
      g.circle(px, sy - 10, 5, kind === 'basil' ? FOOD.basil : '#5eae55')
      g.circle(px - 1, sy - 11, 3, kind === 'basil' ? FOOD.basilL : '#86c95f')
      if (kind === 'chili') for (const [dx, dy] of [[-3, -9], [2, -12], [3, -8]]) g.rect(px + dx, sy + dy, 1, 2, FOOD.chili)
    }

    // Shelf with jars on the right.
    const shx = wx + ww + 12
    if (shx + 30 < w) {
      const shy = wy + 18
      const shw = w - shx - 6
      for (const [jx, c, lid] of [
        [shx + 3, '#ffd23f', '#e8514a'],
        [shx + 13, '#e8514a', '#6cc36a'],
        [shx + 23, '#fffaf0', '#5a8de0'],
        [shx + 33, '#9ccc65', '#e9a53a'],
      ] as [number, string, string][]) {
        if (jx + 8 > shx + shw) break
        g.rect(jx, shy - 9, 8, 9, '#dff4ff')
        g.rect(jx + 1, shy - 6, 6, 6, c)
        g.rect(jx, shy - 11, 8, 2, lid)
        g.px(jx + 1, shy - 8, '#ffffff')
      }
      g.rect(shx, shy, shw, 3, '#c28e5c')
      g.hline(shx, shx + shw - 1, shy, '#e0bb8a')
      g.rect(shx + 2, shy + 3, 2, 3, '#9a6a45')
      g.rect(shx + shw - 4, shy + 3, 2, 3, '#9a6a45')
      // Utensil rail: ladle, turner and whisk.
      const ry = shy + 14
      g.hline(shx, shx + shw - 1, ry, '#a8a8b8')
      const tools: [number, 'ladle' | 'turner' | 'whisk' | 'garlic'][] = [
        [shx + 5, 'ladle'],
        [shx + 14, 'turner'],
        [shx + 23, 'whisk'],
        [shx + 33, 'garlic'],
      ]
      for (const [tx2, kind] of tools) {
        if (tx2 + 4 > shx + shw) break
        g.px(tx2, ry + 1, '#80808e')
        if (kind === 'ladle') {
          g.vline(tx2, ry + 2, ry + 14, '#c28e5c')
          g.ellipse(tx2, ry + 17, 3.5, 2.5, '#a8a8b8')
          g.ellipse(tx2, ry + 16.4, 2.5, 1.4, '#d0d0da')
        } else if (kind === 'turner') {
          g.vline(tx2, ry + 2, ry + 12, '#9a6a45')
          g.rect(tx2 - 3, ry + 12, 7, 7, '#a8a8b8')
          g.hline(tx2 - 3, tx2 + 3, ry + 12, '#d0d0da')
        } else if (kind === 'whisk') {
          g.vline(tx2, ry + 2, ry + 9, '#e8514a')
          g.ellipse(tx2, ry + 14, 2.5, 5, '#d0d0da')
          g.ellipse(tx2, ry + 14, 1.4, 4, '#fbeed6')
          g.vline(tx2, ry + 10, ry + 18, '#a8a8b8')
        } else {
          // A braid of garlic bulbs.
          g.vline(tx2, ry + 2, ry + 20, '#c9a06a')
          for (let k = 0; k < 4; k++) g.circle(tx2 + (k % 2 ? 2 : -2), ry + 5 + k * 4, 2.2, k % 2 ? FOOD.garlic : FOOD.garlicD)
        }
      }
      // Wall clock above the shelf.
      const cx = shx + Math.round(shw / 2)
      const cy = Math.max(12, wy - 10)
      g.circle(cx, cy, 7, '#e8514a')
      g.circle(cx, cy, 5.6, '#fffaf0')
      g.vline(cx, cy - 4, cy, P.ink)
      g.hline(cx, cx + 3, cy, P.ink)
      g.px(cx, cy - 5, '#e8514a')
    }
    // Hanging string of dried chillies at the far left.
    for (let y = 8; y < wy + 30 && y < tileTop - 6; y += 4) {
      g.px(3, y, '#9a6a45')
      g.rect(4, y + 1, 2, 3, y % 8 ? FOOD.chili : FOOD.chiliD)
    }

    // Countertop: teak planks with a soft shadow under the backsplash.
    g.rect(0, counterY, w, h - counterY, '#e8c48e')
    for (let y = counterY + 10; y < h; y += 14) g.hline(0, w - 1, y, '#d6ad74')
    for (let y = counterY; y < h; y += 14) {
      const off = ((y - counterY) / 14) % 2 ? 23 : 7
      for (let x = off; x < w; x += 46) g.vline(x, y, Math.min(h - 1, y + 13), '#d6ad74')
      for (let x = off + 9; x < w; x += 31) g.hline(x, x + 3, y + 5, '#f0d3a2')
    }
    g.rect(0, counterY, w, 3, '#c9a06a')
    g.hline(0, w - 1, counterY + 3, '#f3dcb2')
    g.dither(0, counterY + 4, w, 4, null, '#d6ad74', 0.35)
  })
}

// ---------------------------------------------------------------------------
// Stove, vessels and tools (drawn directly on the kitchen stage)

const STEEL = { hi: '#f2f2f6', l: '#d0d0da', b: '#a8a8b8', d: '#80808e', D: '#5a5a68', DD: '#3a3a48' }
const WOK = { rim: '#6d6d7a', rimL: '#9a9aa8', in: '#3a3a46', inL: '#4d4d5c', inD: '#2a2a34' }

/** Two-burner gas stove centred at cx; the burner ring sits at (cx, cy). */
export function drawStove(g: Surface, cx: number, cy: number) {
  const w = 124
  const x = Math.round(cx - w / 2)
  const top = Math.round(cy - 24)
  const depth = 44
  // Soft shadow on the counter.
  g.alpha(0.25)
  g.rect(x + 2, top + depth + 12, w, 3, '#6e4a35')
  g.alpha(1)
  g.rect(x - 1, top - 1, w + 2, depth + 14, INK)
  // Stainless top face with a brushed sheen.
  g.rect(x, top, w, depth, '#c9ced6')
  g.hline(x, x + w - 1, top, '#eef1f5')
  for (let y = top + 4; y < top + depth; y += 5) g.hline(x + 2, x + w - 3, y, '#d6dae1')
  g.rect(x, top + depth - 2, w, 2, '#aab1bb')
  // Front face with the knobs and igniter.
  g.rect(x, top + depth, w, 12, '#8f98a4')
  g.hline(x, x + w - 1, top + depth, '#b4bcc6')
  for (const kx of [x + 14, x + w - 14]) {
    g.circle(kx, top + depth + 6, 4, INK)
    g.circle(kx, top + depth + 6, 3.2, '#3a3648')
    g.circle(kx - 0.5, top + depth + 5.5, 1.6, '#5a5668')
    g.vline(kx, top + depth + 3, top + depth + 5, '#e8514a')
  }
  g.rect(Math.round(cx) - 9, top + depth + 4, 18, 5, '#3a3648')
  g.px(Math.round(cx) - 6, top + depth + 6, '#6fcf8f')
  g.px(Math.round(cx) + 5, top + depth + 6, '#e8514a')
  // Burner bowl and pan-support grate.
  g.ellipse(cx, cy, 34, 13, '#3a3648')
  g.ellipse(cx, cy + 1, 30, 11, '#2a2838')
  g.ellipse(cx, cy, 11, 4, '#5a5668')
  g.ellipse(cx, cy, 7, 2.5, '#2a2838')
  for (const [dx, dy] of [
    [-30, 0],
    [30, 0],
    [0, -12],
    [0, 12],
  ])
    g.thickLine(cx + dx * 0.55, cy + dy * 0.55, cx + dx, cy + dy, 2, '#1e1c28')
}

/** Flickering gas flames peeking out around a vessel on the burner. */
export function drawFlames(g: Surface, cx: number, cy: number, t: number, power = 1) {
  const n = 12
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = cx + Math.cos(a) * 14
    const y = cy + Math.sin(a) * 5
    const fl = (Math.sin(t * 18 + i * 1.7) + 1) * 0.5
    const hgt = Math.round((3 + fl * 3) * power)
    g.vline(Math.round(x), Math.round(y - hgt), Math.round(y), '#5a8de0')
    g.px(Math.round(x), Math.round(y - hgt - 1), fl > 0.5 ? '#ffbb66' : '#9fd0ff')
    if (fl > 0.7 && power > 0.8) g.px(Math.round(x), Math.round(y - hgt - 2), '#fff3a6')
  }
}

/** Big round wok; returns the inner food ellipse. */
export function drawWok(g: Surface, cx: number, cy: number, rx = 46, ry = 24) {
  // Wooden side handles.
  for (const s of [-1, 1]) {
    const hx = cx + s * (rx + 4)
    g.ellipse(hx, cy - 2, 6, 3.5, INK)
    g.ellipse(hx, cy - 2, 5, 2.6, '#c28e5c')
    g.ellipse(hx, cy - 2.5, 2.6, 1.2, '#4a3128')
  }
  g.ellipse(cx, cy + 4, rx + 1, ry + 3, INK)
  g.ellipse(cx, cy + 3, rx, ry + 2, WOK.rim)
  g.ellipse(cx, cy, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy, rx, ry, WOK.rimL)
  g.ellipse(cx, cy + 0.5, rx - 3, ry - 2.5, WOK.in)
  g.ellipse(cx + 3, cy + 3, rx - 12, ry - 9, WOK.inD)
  g.ellipse(cx - rx * 0.35, cy - ry * 0.4, rx * 0.3, ry * 0.18, WOK.inL)
  return { cx, cy: cy + 2, rx: rx - 10, ry: ry - 7 }
}

/** Flat frying pan with a long handle to the right; returns the food ellipse. */
export function drawPan(g: Surface, cx: number, cy: number, rx = 38, ry = 20) {
  g.thickLine(cx + rx - 2, cy + 1, cx + rx + 34, cy - 7, 7, INK)
  g.thickLine(cx + rx, cy, cx + rx + 33, cy - 7, 5, '#3a3040')
  g.thickLine(cx + rx + 16, cy - 3, cx + rx + 32, cy - 7, 5, '#9a6a45')
  g.px(cx + rx + 30, cy - 8, '#c28e5c')
  g.ellipse(cx, cy + 4, rx + 1, ry + 3, INK)
  g.ellipse(cx, cy + 3, rx, ry + 2, '#4a4658')
  g.ellipse(cx, cy, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy, rx, ry, '#6a6680')
  g.ellipse(cx, cy + 0.5, rx - 3, ry - 2.5, '#3a3a46')
  g.ellipse(cx - rx * 0.35, cy - ry * 0.4, rx * 0.25, ry * 0.15, '#4d4d5c')
  return { cx, cy: cy + 1, rx: rx - 6, ry: ry - 5 }
}

/** Aluminium pot seen from above-front; returns the liquid surface ellipse and fill box. */
export function drawPot(g: Surface, cx: number, cy: number, rx = 38, ry = 14, depth = 30) {
  const top = cy - Math.round(depth / 2)
  for (const s of [-1, 1]) {
    g.rect(cx + s * (rx + 2) - 4, top + 4, 8, 4, INK)
    g.rect(cx + s * (rx + 2) - 3, top + 5, 6, 2, STEEL.D)
  }
  g.rect(cx - rx - 1, top, rx * 2 + 2, depth + 1, INK)
  g.ellipse(cx, top + depth, rx + 1, ry + 1, INK)
  g.rect(cx - rx, top, rx * 2, depth, STEEL.l)
  g.ellipse(cx, top + depth, rx, ry, STEEL.l)
  g.rect(cx - rx, top, 5, depth, STEEL.hi)
  g.rect(cx + rx - 9, top, 9, depth, STEEL.b)
  g.ellipse(cx + rx - 5, top + depth, 4, ry * 0.8, STEEL.b)
  g.hline(cx - rx, cx + rx - 1, top + 8, STEEL.b)
  g.ellipse(cx, top, rx + 1, ry + 1, INK)
  g.ellipse(cx, top, rx, ry, STEEL.hi)
  g.ellipse(cx, top + 0.5, rx - 3, ry - 2.5, STEEL.D)
  return { cx, cy: top + 1, rx: rx - 4, ry: ry - 3.5 }
}

/** White rooster mixing bowl (ชามตราไก่); returns the inside ellipse. */
export function drawMixBowl(g: Surface, cx: number, cy: number, rx = 38, ry = 15, depth = 26) {
  const top = cy - Math.round(depth / 2)
  const body: [number, number][] = [
    [cx - rx, top],
    [cx + rx, top],
    [cx + rx * 0.62, top + depth],
    [cx - rx * 0.62, top + depth],
  ]
  g.poly(body.map(([x, y]) => [x + (x < cx ? -1 : 1), y + 1] as [number, number]), INK)
  g.ellipse(cx, top + depth, rx * 0.62 + 1, 5, INK)
  g.poly(body, '#fffaf0')
  g.ellipse(cx, top + depth, rx * 0.62, 4, '#ece2d0')
  g.poly(
    [
      [cx + rx * 0.45, top],
      [cx + rx, top],
      [cx + rx * 0.62, top + depth],
      [cx + rx * 0.3, top + depth],
    ],
    '#ece2d0',
  )
  // Green band and a proud red rooster.
  g.hline(cx - rx + 5, cx + rx - 5, top + 9, '#6cbf5c')
  g.hline(cx - rx + 7, cx + rx - 7, top + 10, '#43905a')
  const rx0 = Math.round(cx - rx * 0.35)
  const ry0 = top + 13
  g.rect(rx0, ry0, 7, 5, '#e8514a')
  g.rect(rx0 + 6, ry0 - 3, 3, 4, '#e8514a')
  g.px(rx0 + 8, ry0 - 4, '#e8514a')
  g.px(rx0 + 9, ry0 - 2, '#ffd23f')
  g.poly([[rx0, ry0], [rx0 - 4, ry0 - 5], [rx0 - 1, ry0 - 1]], '#3fa06e')
  g.px(rx0 - 3, ry0 - 5, '#e8514a')
  g.vline(rx0 + 2, ry0 + 5, ry0 + 7, '#e9a53a')
  g.vline(rx0 + 4, ry0 + 5, ry0 + 7, '#e9a53a')
  // Banana tree.
  const bx = Math.round(cx + rx * 0.3)
  g.vline(bx, top + 12, top + 20, '#43905a')
  g.line(bx, top + 12, bx - 5, top + 15, '#6cbf5c')
  g.line(bx, top + 12, bx + 5, top + 14, '#6cbf5c')
  g.line(bx, top + 13, bx + 3, top + 17, '#43905a')
  g.ellipse(cx, top, rx + 1, ry + 1, INK)
  g.ellipse(cx, top, rx, ry, '#fffaf0')
  g.ellipse(cx, top + 1, rx - 3, ry - 2.5, '#efe6d6')
  g.ellipse(cx + 3, top + 2.5, rx - 12, ry - 7, '#e6dccb')
  return { cx, cy: top + 1.5, rx: rx - 6, ry: ry - 4.5 }
}

/** Cast-iron ขนมครก pan with holes; returns hole centres. */
export function drawKrokPan(g: Surface, cx: number, cy: number, cols = 3, rows = 2): { x: number; y: number }[] {
  const rx = 48
  const ry = 26
  g.ellipse(cx, cy + 4, rx + 1, ry + 3, INK)
  g.ellipse(cx, cy + 3, rx, ry + 2, '#2e2a36')
  g.ellipse(cx, cy, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy, rx, ry, '#4a4658')
  g.ellipse(cx - 12, cy - 9, 18, 6, '#5a5668')
  const holes: { x: number; y: number }[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = Math.round(cx + (c - (cols - 1) / 2) * 27 + (r % 2 ? 0 : 0))
      const y = Math.round(cy + (r - (rows - 1) / 2) * 17)
      g.ellipse(x, y, 11, 6.5, '#2a2632')
      g.ellipse(x, y + 1, 9.5, 5, '#1e1c26')
      g.hline(x - 6, x + 5, y - 5, '#6a6680')
      holes.push({ x, y })
    }
  return holes
}

/** Round tamarind-wood chopping board (เขียงไม้มะขาม). */
export function drawBoard(g: Surface, cx: number, cy: number, rx = 64, ry = 34) {
  g.ellipse(cx, cy + 7, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy + 6, rx, ry, '#9a5f38')
  g.rect(cx - rx, cy, rx * 2, 6, '#9a5f38')
  g.ellipse(cx, cy, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy, rx, ry, '#e0b07a')
  for (let k = 1; k <= 4; k++) g.ellipse(cx, cy, rx * (1 - k * 0.19), ry * (1 - k * 0.19), k % 2 ? '#d49e66' : '#e0b07a')
  g.ellipse(cx, cy, 4, 2, '#c28e5c')
  // Knife scratches.
  for (const [x, y] of [[-30, -6], [18, 10], [-8, 14], [34, -8]]) g.line(cx + x, cy + y, cx + x + 5, cy + y - 3, '#cf9a60')
}

export function drawPlate(g: Surface, cx: number, cy: number, rx = 32, ry = 16) {
  g.ellipse(cx, cy + 3, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy + 2, rx, ry, '#d9cdb8')
  g.ellipse(cx, cy, rx + 1, ry + 1, INK)
  g.ellipse(cx, cy, rx, ry, '#fffaf0')
  g.ellipse(cx, cy, rx - 3, ry - 2, '#9fc4ee')
  g.ellipse(cx, cy + 0.5, rx - 5, ry - 3.5, '#fffdf8')
  g.ellipse(cx + 3, cy + 2, rx - 12, ry - 8, '#f4ecdf')
}

export function drawServeBowl(g: Surface, cx: number, cy: number) {
  const s = 4
  serveBowl(g, cx, cy, s, false)
}

export function drawBananaLeaf(g: Surface, cx: number, cy: number) {
  // A woven bamboo tray under the leaf.
  g.ellipse(cx, cy + 2, 40, 21, INK)
  g.ellipse(cx, cy + 1, 39, 20, '#d9ab62')
  for (let y = -16; y <= 16; y += 3) g.hline(cx - Math.round(Math.sqrt(1 - (y / 20) ** 2) * 36), cx + Math.round(Math.sqrt(1 - (y / 20) ** 2) * 36), cy + y, '#b98846')
  serveLeaf(g, cx, cy, 5, false)
}

export type Tool = 'knife' | 'turner' | 'ladle' | 'whisk' | 'finger' | 'spoon'

/** Hand-held tool sprite; its anchor (ax, ay) is the working tip. */
export function toolSprite(tool: Tool): Sprite & { ax: number; ay: number } {
  const s = outlined(`tool:${tool}`, 24, 30, (g) => {
    switch (tool) {
      case 'knife':
        // Cleaver: tip at bottom-left.
        g.poly([[1, 22], [14, 10], [20, 16], [8, 28]], '#dfe3ea')
        g.poly([[1, 22], [8, 28], [9, 27], [2, 21]], '#ffffff')
        g.line(12, 13, 17, 18, '#a8a8b8')
        g.thickLine(17, 12, 22, 7, 4, '#9a6a45')
        g.px(20, 8, '#c28e5c')
        g.px(18, 13, '#80808e')
        break
      case 'turner':
        g.thickLine(12, 2, 12, 16, 3, '#9a6a45')
        g.px(12, 3, '#c28e5c')
        g.rect(6, 16, 13, 11, '#d0d0da')
        g.hline(6, 18, 16, '#f2f2f6')
        g.hline(6, 18, 26, '#a8a8b8')
        break
      case 'ladle':
        g.thickLine(12, 2, 12, 18, 2.4, '#c28e5c')
        g.ellipse(12, 23, 7, 5, '#a8a8b8')
        g.ellipse(12, 22, 5.5, 3, '#e4e4ec')
        break
      case 'whisk':
        g.thickLine(12, 2, 12, 12, 3, '#e8514a')
        g.ellipse(12, 20, 5, 9, '#d0d0da')
        g.ctx.clearRect(10, 13, 5, 14)
        g.vline(12, 12, 28, '#a8a8b8')
        g.vline(10, 14, 26, '#d0d0da')
        g.vline(14, 14, 26, '#d0d0da')
        break
      case 'spoon':
        g.thickLine(14, 2, 12, 18, 2.4, '#d0d0da')
        g.ellipse(11, 23, 4.5, 3.4, '#e4e4ec')
        break
      case 'finger':
        // A chubby pointing hand; tip at the top-left.
        g.rect(9, 2, 5, 14, '#fdd3b6')
        g.rect(9, 2, 2, 12, '#ffe7d3')
        g.rect(7, 12, 14, 12, '#fdd3b6')
        g.rect(7, 12, 14, 2, '#ffe7d3')
        g.rect(19, 14, 3, 8, '#eeae90')
        g.rect(7, 24, 14, 4, '#9fd0ff')
        g.hline(7, 20, 24, '#d4f1ff')
        g.px(12, 3, '#ff9aa6')
        break
    }
  })
  const anchor: Record<Tool, [number, number]> = {
    knife: [3, 24],
    turner: [12, 26],
    ladle: [12, 24],
    whisk: [12, 27],
    spoon: [11, 24],
    finger: [11, 3],
  }
  const [ax, ay] = anchor[tool]
  return { ...s, ax: ax + 1, ay: ay + 1 }
}

/** Whole egg (with crack stages 0 = whole, 1 = cracked, 2 = open halves). */
export function eggSprite(stage: 0 | 1 | 2): Sprite {
  return outlined(`egg:${stage}`, 16, 18, (g) => {
    if (stage < 2) {
      g.ellipse(8, 10, 6, 7.5, '#fff3e0')
      g.ellipse(9.5, 11, 4, 6, '#f7e3c4')
      g.ellipse(6, 6.5, 2, 2.5, '#ffffff')
      if (stage === 1) {
        g.line(2, 9, 5, 11, '#b8935f')
        g.line(5, 11, 7, 8, '#b8935f')
        g.line(7, 8, 10, 11, '#b8935f')
        g.line(10, 11, 14, 9, '#b8935f')
      }
    } else {
      g.poly([[1, 6], [4, 3], [6, 5], [7, 3], [7, 12], [2, 11]], '#fff3e0')
      g.poly([[9, 3], [11, 5], [12, 3], [15, 6], [14, 11], [9, 12]], '#f7e3c4')
      g.rect(2, 7, 4, 3, '#ffffff')
    }
  })
}

// ---------------------------------------------------------------------------
// Spice shelf bottles

export const CONDIMENT_COLORS: Record<Condiment, { liquid: Color; drop: Color }> = {
  fishsauce: { liquid: '#c86f1a', drop: '#e08a30' },
  soy: { liquid: '#5a3424', drop: '#7a4a35' },
  sugar: { liquid: '#fffaf0', drop: '#ffffff' },
  chili: { liquid: '#e8413a', drop: '#ff7a5a' },
  pepper: { liquid: '#5a5068', drop: '#3a3040' },
  lime: { liquid: '#9ccc65', drop: '#d9f0a8' },
  tamarind: { liquid: '#8a4a2a', drop: '#b86a3a' },
}

/** Condiment bottle / jar sprite (about 16×26). */
export function bottleSprite(c: Condiment): Sprite {
  return outlined(`bottle:${c}`, 16, 26, (g) => {
    switch (c) {
      case 'fishsauce':
        g.rect(4, 8, 8, 17, '#c86f1a')
        g.rect(6, 3, 4, 5, '#c86f1a')
        g.rect(6, 1, 4, 2, P.red)
        g.rect(4, 12, 8, 7, '#fffaf0')
        g.rect(6, 14, 4, 2, P.blue)
        g.px(9, 13, P.blue)
        g.vline(5, 9, 23, '#f0a050')
        break
      case 'soy':
        g.rect(4, 8, 8, 17, '#4a2a1e')
        g.rect(6, 3, 4, 5, '#4a2a1e')
        g.rect(6, 1, 4, 2, '#3fa06e')
        g.rect(4, 12, 8, 7, '#ffd23f')
        g.rect(6, 14, 4, 3, '#3fa06e')
        g.vline(5, 9, 23, '#7a4a35')
        break
      case 'sugar':
        g.rect(2, 10, 12, 15, '#dff4ff')
        g.rect(3, 13, 10, 12, '#fffaf0')
        for (const [x, y] of [[4, 15], [8, 17], [11, 14], [6, 21], [10, 22]]) g.px(x, y, '#e6dccb')
        g.rect(2, 7, 12, 3, P.pink)
        g.hline(2, 13, 7, P.pinkL)
        g.thickLine(10, 2, 8, 12, 2, '#d0d0da')
        g.ellipse(10, 2, 2, 1.4, '#e4e4ec')
        break
      case 'chili':
        g.rect(3, 10, 10, 15, '#dff4ff')
        g.rect(4, 13, 8, 12, '#e8413a')
        for (const [x, y] of [[5, 15], [9, 17], [7, 21], [10, 23]]) g.px(x, y, '#ffbb66')
        g.rect(3, 7, 10, 3, '#fffaf0')
        for (let x = 4; x < 12; x += 2) g.px(x, 8, '#bdb2ae')
        break
      case 'pepper':
        g.rect(4, 9, 8, 16, '#fffaf0')
        g.rect(5, 13, 6, 11, '#5a5068')
        g.rect(4, 5, 8, 4, '#bdb2ae')
        g.ellipse(8, 5, 4, 2, '#d0d0da')
        for (const x of [6, 8, 10]) g.px(x, 5, '#5a5a68')
        break
      case 'lime':
        g.ellipse(8, 19, 7, 6, '#fffaf0')
        g.ellipse(8, 18, 6, 4, '#e6dccb')
        g.circle(6, 16, 3.5, '#6cbf5c')
        g.circle(6, 16, 2.5, '#d9f0a8')
        g.px(6, 16, '#9ccc65')
        g.circle(10.5, 17, 3.5, '#4f9a45')
        g.px(9.5, 15, '#9ccc65')
        break
      case 'tamarind':
        g.ellipse(8, 20, 7, 5, '#fffaf0')
        g.ellipse(8, 18.5, 6, 3, '#8a4a2a')
        g.ellipse(7, 18, 3, 1.4, '#b86a3a')
        // Tamarind pods leaning out.
        g.thickLine(10, 16, 13, 6, 2.6, '#9a6a45')
        g.px(12, 9, '#c28e5c')
        g.px(11, 12, '#6e4a35')
        break
    }
  })
}

export function bottleUrl(c: Condiment, scale = 2): string {
  const k = `bottle:${c}@${scale}`
  let u = urls.get(k)
  if (!u) {
    u = spriteDataUrl(bottleSprite(c), scale)
    urls.set(k, u)
  }
  return u
}

export function dishUrl(dishId: string, scale = 3): string {
  const k = `dish:${dishId}@${scale}`
  let u = urls.get(k)
  if (!u) {
    u = spriteDataUrl(dishSprite(dishId), scale)
    urls.set(k, u)
  }
  return u
}

// ---------------------------------------------------------------------------
// Food on the board and in vessels

const BIT_COLORS: Record<Bit, [Color, Color, Color]> = {
  garlic: [FOOD.garlic, '#ffffff', FOOD.garlicD],
  chili: [FOOD.chili, FOOD.chiliL, FOOD.chiliD],
  basil: [FOOD.basil, FOOD.basilL, FOOD.basilD],
  pork: [FOOD.pork, FOOD.porkL, FOOD.porkD],
  chicken: [FOOD.chick, '#fff0e0', FOOD.chickD],
  tofu: [FOOD.tofu, '#fff3b8', FOOD.tofuD],
  cabbage: [FOOD.cabbage, '#f0fbe0', FOOD.cabbageD],
  onion: [FOOD.onion, '#b4e486', FOOD.onionD],
  mango: [FOOD.mango, FOOD.mangoL, FOOD.mangoD],
  eggplant: [FOOD.eggplant, '#f6fbe8', FOOD.eggplantD],
  cucumber: [FOOD.cucumber, FOOD.cucumberL, '#4f9a45'],
  rice: [FOOD.rice, '#ffffff', FOOD.riceD],
  egg: [FOOD.egg, FOOD.eggL, FOOD.eggD],
  noodle: [FOOD.noodle, '#fbeccc', FOOD.noodleS],
  curry: [FOOD.curry, FOOD.curryL, FOOD.curryD],
  batter: [FOOD.batter, '#fffaf0', FOOD.batterD],
  porridge: [FOOD.porridge, '#ffffff', FOOD.porridgeD],
  soup: [FOOD.soup, '#fff6d8', FOOD.soupD],
  sticky: [FOOD.sticky, '#ffffff', FOOD.stickyD],
  dough: [DOUGH[0], '#c8f0b8', DOUGH_D[0]],
  coconut: [FOOD.coconut, '#ffffff', FOOD.coconutD],
}

export function bitColors(b: Bit): [Color, Color, Color] {
  return BIT_COLORS[b]
}

/** Liquids that fill a vessel as a flat surface rather than loose bits. */
export const LIQUID_BITS: Bit[] = ['curry', 'batter', 'porridge', 'soup', 'coconut']
/** Loose foods that pile up into a heap in the wok. */
const MASS_BITS: Bit[] = ['rice', 'pork', 'noodle', 'egg', 'sticky']

/**
 * A whole ingredient lying on the board, with knife cuts (x offsets in px,
 * relative to the item's left edge). Returns its width.
 */
export function drawChopItem(g: Surface, b: Bit, x: number, y: number, cuts: number[], t = 0): number {
  const [c, l, d] = BIT_COLORS[b]
  const w = CHOP_W[b] ?? 30
  const sorted = [...cuts].sort((a, b2) => a - b2)
  // Pieces separate a little after every cut.
  const segs: [number, number][] = []
  let from = 0
  for (const cx of sorted) {
    segs.push([from, cx])
    from = cx
  }
  segs.push([from, w])
  segs.forEach(([a, bb], i) => {
    const off = (i - (segs.length - 1) / 2) * 1.2 * Math.min(1, cuts.length / 3)
    const sx = Math.round(x + a + off)
    const sw = Math.max(1, Math.round(bb - a) - (i < segs.length - 1 ? 1 : 0))
    g.ctx.save()
    g.ctx.beginPath()
    g.ctx.rect(sx - g.ox, y - 20 - g.oy, sw, 40)
    g.ctx.clip()
    drawWhole(g, b, x + off, y, w, c, l, d)
    g.ctx.restore()
    // Fresh cut face.
    if (i > 0) g.vline(sx, y - 5, y + 4, l)
  })
  void t
  return w
}

const CHOP_W: Partial<Record<Bit, number>> = {
  garlic: 24,
  chili: 38,
  basil: 34,
  pork: 38,
  chicken: 40,
  tofu: 40,
  cabbage: 38,
  onion: 46,
  mango: 44,
  eggplant: 26,
  cucumber: 40,
}

export function chopWidth(b: Bit): number {
  return CHOP_W[b] ?? 30
}

function drawWhole(g: Surface, b: Bit, x: number, y: number, w: number, c: Color, l: Color, d: Color) {
  const cx = x + w / 2
  switch (b) {
    case 'garlic':
      g.ellipse(cx, y, w / 2 + 1, 11, INK)
      g.ellipse(cx, y, w / 2, 10, c)
      g.ellipse(cx + 3, y + 3, w / 2 - 5, 6, d)
      g.ellipse(cx - 1, y, w / 2 - 4, 7, c)
      g.vline(Math.round(cx - 4), y - 7, y + 7, d)
      g.vline(Math.round(cx + 4), y - 7, y + 7, d)
      for (const [dx, dy] of [[-8, 3], [7, 4], [0, 8], [-3, -6]]) g.px(Math.round(cx + dx), y + dy, FOOD.garlicP)
      g.rect(Math.round(cx - 1), y - 14, 3, 5, '#efe2d0')
      g.px(Math.round(cx), y - 14, '#d6c8ae')
      g.rect(Math.round(cx - 6), y - 6, 2, 3, '#ffffff')
      break
    case 'chili':
      g.thickLine(x + 3, y + 3, x + w - 6, y - 2, 10, INK)
      g.thickLine(x + 3, y + 3, x + w - 6, y - 2, 8, c)
      g.thickLine(x + 4, y + 4, x + w - 8, y, 4, d)
      g.line(x + 5, y, x + w - 10, y - 4, l)
      g.line(x + 6, y + 1, x + w - 12, y - 3, l)
      g.rect(x + w - 7, y - 6, 4, 6, INK)
      g.rect(x + w - 6, y - 5, 5, 4, FOOD.stem)
      g.rect(x + w - 2, y - 7, 2, 3, FOOD.stem)
      break
    case 'basil':
      g.thickLine(Math.round(x), y + 1, Math.round(x + w), y, 2, '#8a4a6a')
      for (let i = 0; i < 6; i++) {
        const lx = x + 3 + i * (w / 6)
        const ly = y + (i % 2 ? -4 : 4)
        g.ellipse(lx + 2, ly, 6, 4.4, INK)
        g.ellipse(lx + 2, ly, 5, 3.5, i % 2 ? c : d)
        g.line(lx - 1, ly, lx + 5, ly, i % 2 ? d : FOOD.basil)
        g.px(Math.round(lx), Math.round(ly - 2), l)
      }
      break
    case 'onion':
      g.rect(Math.round(x), y - 5, Math.round(w), 10, INK)
      g.rect(Math.round(x) + 1, y - 4, Math.round(w) - 2, 8, c)
      g.hline(Math.round(x) + 1, Math.round(x + w) - 2, y - 4, l)
      g.hline(Math.round(x) + 1, Math.round(x + w) - 2, y - 3, l)
      g.hline(Math.round(x) + 1, Math.round(x + w) - 2, y + 3, d)
      g.rect(Math.round(x + w) - 12, y - 4, 11, 8, '#fffaf0')
      g.hline(Math.round(x + w) - 12, Math.round(x + w) - 2, y + 2, '#e6dccb')
      g.hline(Math.round(x + w) - 12, Math.round(x + w) - 2, y + 3, '#e6dccb')
      for (let k = 0; k < 3; k++) g.px(Math.round(x + w), y - 2 + k * 2, '#d6c8ae')
      break
    case 'cucumber':
    case 'eggplant':
    case 'mango':
    case 'tofu':
    case 'pork':
    case 'chicken':
    case 'cabbage':
    default: {
      const ry = b === 'tofu' ? 9 : b === 'cabbage' ? 13 : b === 'eggplant' ? 12 : 11
      if (b === 'tofu') {
        g.rect(Math.round(x), y - ry, Math.round(w), ry * 2, INK)
        g.rect(Math.round(x) + 1, y - ry + 1, Math.round(w) - 2, ry * 2 - 2, c)
        g.rect(Math.round(x) + 1, y - ry + 1, Math.round(w) - 2, 3, l)
        g.rect(Math.round(x) + 1, y + ry - 4, Math.round(w) - 2, 3, d)
      } else {
        g.ellipse(cx, y, w / 2 + 1, ry + 1, INK)
        g.ellipse(cx, y, w / 2, ry, c)
        g.ellipse(cx - w * 0.15, y - ry * 0.35, w * 0.25, ry * 0.35, l)
        g.ellipse(cx + w * 0.15, y + ry * 0.4, w * 0.28, ry * 0.3, d)
        if (b === 'cabbage') for (let k = -2; k <= 2; k++) g.line(cx + k * 5, y + ry - 2, cx + k * 3, y - ry + 3, d)
        if (b === 'eggplant') {
          for (const k of [-4, 0, 4]) g.vline(Math.round(cx + k), y - ry + 3, y + ry - 3, d)
          g.rect(Math.round(cx) - 3, y - ry - 2, 6, 3, FOOD.stem)
        }
        if (b === 'pork') for (const [dx, dy] of [[-6, -2], [4, 3], [8, -3], [-2, 4]]) g.px(Math.round(cx + dx), y + dy, '#fff0e8')
        if (b === 'mango') g.px(Math.round(x + w - 4), y - 4, FOOD.stem)
      }
    }
  }
}

/** Small pieces of food scattered in a vessel (rotating with `spin`). */
export function drawBits(
  g: Surface,
  bits: Bit[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  spin: number,
  seed = 1,
  doneness = 0,
) {
  // Liquids fill the vessel first.
  const liquid = bits.find((b) => LIQUID_BITS.includes(b))
  if (liquid) {
    const [c, l, d] = BIT_COLORS[liquid]
    g.ellipse(cx, cy, rx + 3, ry + 2, d)
    g.ellipse(cx, cy - 0.5, rx + 2, ry + 1.2, c)
    // Swirl highlight follows the spoon.
    for (let i = 0; i < 3; i++) {
      const a = spin + i * 2.1
      g.ellipse(cx + Math.cos(a) * rx * 0.5, cy + Math.sin(a) * ry * 0.5, rx * 0.22, ry * 0.18, l)
    }
  }
  const loose = bits.filter((b) => !LIQUID_BITS.includes(b))
  if (!loose.length) return
  // The main ingredient forms a heap that sloshes around with the spoon.
  const main = loose[0]
  if (!liquid && MASS_BITS.includes(main)) {
    const [c0, l, d] = BIT_COLORS[main]
    const c = doneness > 0 && (main === 'rice' || main === 'noodle') ? mixc(c0, main === 'rice' ? '#f6cf88' : FOOD.noodleS, Math.min(1, doneness)) : c0
    const hx = cx + Math.cos(spin) * rx * 0.12
    const hy = cy + Math.sin(spin) * ry * 0.12
    g.ellipse(hx, hy + 1, rx * 0.8, ry * 0.72, d)
    g.ellipse(hx, hy, rx * 0.76, ry * 0.66, c)
    g.ellipse(hx - rx * 0.25, hy - ry * 0.25, rx * 0.35, ry * 0.25, main === 'pork' ? l : mixc(c, '#ffffff', 0.4))
  }
  let n = seed * 7919
  const count = Math.round(rx * ry * 0.09)
  for (let i = 0; i < count; i++) {
    n = (n * 1103515245 + 12345) & 0x7fffffff
    const b = loose[i % loose.length]
    const [c0, l, d] = BIT_COLORS[b]
    const c = doneness > 0 && (b === 'rice' || b === 'noodle') ? mixc(c0, b === 'rice' ? '#f6cf88' : FOOD.noodleS, Math.min(1, doneness)) : c0
    const a = ((n % 6283) / 1000 + spin * (0.6 + ((n >> 8) % 5) * 0.1)) % (Math.PI * 2)
    const r = Math.sqrt(((n >> 12) % 1000) / 1000)
    const x = Math.round(cx + Math.cos(a) * rx * r)
    const y = Math.round(cy + Math.sin(a) * ry * r)
    switch (b) {
      case 'rice':
      case 'sticky':
        g.px(x, y, c)
        g.px(x + 1, y, i % 4 ? c : l)
        if (i % 3 === 0) g.px(x, y + 1, d)
        break
      case 'pork':
        g.rect(x, y, 2, 2, c)
        g.px(x, y, l)
        if (i % 2) g.px(x + 2, y + 1, d)
        break
      case 'chili':
        g.rect(x, y, 2, 1, c)
        g.px(x, y - 1, l)
        break
      case 'basil':
      case 'onion':
      case 'cabbage':
        g.rect(x, y, 2, 1, c)
        g.px(x + 1, y + 1, d)
        if (i % 3 === 0) g.px(x, y - 1, l)
        break
      case 'egg':
        g.rect(x, y, 3, 2, c)
        g.px(x, y, l)
        g.px(x + 2, y + 1, d)
        break
      case 'noodle':
        g.line(x - 3, y, x + 3, y + ((i % 3) - 1), c)
        g.px(x, y + 1, d)
        break
      case 'tofu':
      case 'chicken':
        g.rect(x, y, 3, 3, c)
        g.hline(x, x + 2, y, l)
        g.px(x + 2, y + 2, d)
        break
      case 'dough': {
        const dc = DOUGH[i % 4]
        g.circle(x, y, 1.6, dc)
        g.px(x - 1, y - 1, '#ffffff')
        break
      }
      default:
        g.px(x, y, c)
    }
  }
}

function mixc(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) + ((((pb >> s) & 255) - ((pa >> s) & 255)) * t))
  return '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')
}

/** Dough ball / meatball / sticky-rice ball for the shape step. */
export function drawBall(g: Surface, x: number, y: number, r: number, c: Color, d: Color, squash = 0) {
  g.ellipse(x, y + 1, r + 1, r * (1 - squash * 0.4) + 1, INK)
  g.ellipse(x, y + 1, r, r * (1 - squash * 0.4), d)
  g.ellipse(x - 0.5, y, r - 0.6, r * (1 - squash * 0.4) - 0.8, c)
  g.px(Math.round(x - r * 0.4), Math.round(y - r * 0.4), '#ffffff')
}

/** Tray with round moulds for the shape step. */
export function drawTray(g: Surface, cx: number, cy: number, w: number, h: number) {
  const x = Math.round(cx - w / 2)
  const y = Math.round(cy - h / 2)
  g.rect(x - 1, y - 1, w + 2, h + 4, INK)
  g.rect(x, y + h, w, 3, '#9a6a45')
  g.rect(x, y, w, h, '#f3dcb2')
  g.rect(x + 2, y + 2, w - 4, h - 4, '#e0bb8a')
  g.hline(x, x + w - 1, y, '#fff1d6')
}

export type Liquidish = 'water' | 'oil' | 'coconut' | 'batter' | 'broth'

export const LIQUID_COLORS: Record<Liquidish, [Color, Color]> = {
  water: ['#b3e4f4', '#e0f6fc'],
  oil: ['#ffd84a', '#fff2a0'],
  coconut: ['#fffbf2', '#ffffff'],
  batter: ['#fff1d6', '#fffaf0'],
  broth: ['#f3dd9a', '#fff0c2'],
}

/** Container poured from in `pour` steps (18×26, spout at the top-left). */
export function pourerSprite(liquid: Liquidish): Sprite {
  return outlined(`pourer:${liquid}`, 18, 26, (g) => {
    const [c, l] = LIQUID_COLORS[liquid]
    switch (liquid) {
      case 'oil':
        g.rect(4, 8, 10, 18, '#fff6c8')
        g.rect(5, 10, 8, 16, c)
        g.rect(6, 3, 6, 5, '#fff6c8')
        g.rect(6, 1, 6, 2, '#3fa06e')
        g.rect(4, 14, 10, 6, '#3fa06e')
        g.rect(7, 15, 4, 4, '#ffd84a')
        g.vline(5, 10, 24, l)
        break
      case 'coconut':
        // Gable-top carton of coconut milk.
        g.poly([[3, 7], [9, 2], [15, 7]], '#5a8de0')
        g.rect(3, 7, 12, 19, '#fffaf0')
        g.rect(12, 7, 3, 19, '#ece2d0')
        g.circle(8, 16, 3.5, '#8a5a32')
        g.circle(8, 15.5, 2.4, '#fffbf2')
        g.rect(3, 22, 12, 2, '#5a8de0')
        g.rect(4, 3, 3, 3, '#9fc4ee')
        break
      case 'batter':
        // Measuring cup of batter.
        g.rect(2, 8, 12, 17, '#fffaf0')
        g.rect(3, 11, 10, 13, c)
        g.hline(3, 12, 11, l)
        for (let y = 13; y < 23; y += 3) g.hline(10, 12, y, '#bdb2ae')
        g.rect(14, 11, 3, 2, '#fffaf0')
        g.rect(15, 13, 2, 7, '#fffaf0')
        g.rect(14, 19, 3, 2, '#fffaf0')
        g.px(2, 8, '#ece2d0')
        break
      default:
        // Clear pitcher.
        g.poly([[1, 4], [13, 4], [14, 25], [2, 25]], '#e8f6fb')
        g.poly([[2, 11], [13, 11], [14, 25], [2, 25]], c)
        g.hline(2, 13, 11, l)
        g.rect(0, 3, 4, 3, '#e8f6fb')
        g.rect(14, 8, 3, 2, '#e8514a')
        g.rect(15, 10, 2, 9, '#e8514a')
        g.rect(14, 18, 3, 2, '#e8514a')
        g.vline(3, 6, 23, '#ffffff')
    }
  })
}

/** Draw the pourer at its base (x, y) tilted by `tilt` 0..1; returns the spout point. */
export function drawPourer(g: Surface, x: number, y: number, liquid: Liquidish, tilt: number): [number, number] {
  const s = pourerSprite(liquid)
  const a = -tilt * (liquid === 'water' || liquid === 'broth' ? 1.3 : 1.9)
  g.ctx.save()
  g.ctx.translate(Math.round(x - g.ox), Math.round(y - g.oy))
  g.ctx.rotate(a)
  g.ctx.drawImage(s.canvas, -Math.round(s.w / 2), -s.h)
  g.ctx.restore()
  const lx = -s.w / 2 + 2
  const ly = -s.h + 3
  return [x + lx * Math.cos(a) - ly * Math.sin(a), y + lx * Math.sin(a) + ly * Math.cos(a)]
}
