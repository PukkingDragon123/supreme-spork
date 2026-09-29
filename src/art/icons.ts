// Pixel icons for items and UI. Drawn procedurally on a 14×14 grid and
// outlined, giving 16×16 sprites. `iconUrl()` returns a data URL for <img>.

import { bake, type Surface } from '../engine/pixel'
import { cached, outlineCanvas, spriteDataUrl, type Sprite } from '../engine/sprite'
import { P } from './palette'
import { foodIcon, hasFoodIcon } from './cooking'

type Draw = (g: Surface) => void

const k = P.ink

function coin(g: Surface, cx = 7, cy = 7, r = 6) {
  g.circle(cx, cy, r, P.goldD)
  g.circle(cx - 0.4, cy - 0.4, r - 1, P.gold)
  g.circle(cx - 0.4, cy - 0.4, r - 2.4, P.goldD)
  g.circle(cx - 0.4, cy - 0.4, r - 3.2, P.gold)
  // lotus emblem
  g.px(cx - 1, cy - 1, P.pinkD)
  g.px(cx, cy - 2, P.pinkD)
  g.px(cx - 2, cy, P.pinkD)
  g.px(cx, cy, P.pinkD)
  g.px(cx - 1, cy, P.pink)
  g.px(cx - 4, cy - 3, P.goldL)
  g.px(cx - 3, cy - 4, P.goldL)
}

function lotus(g: Surface, cx = 7, base = 11) {
  g.poly([[cx - 6, base], [cx - 5, base - 5], [cx - 1, base]], P.pinkD)
  g.poly([[cx + 6, base], [cx + 5, base - 5], [cx + 1, base]], P.pinkD)
  g.poly([[cx - 4, base], [cx - 2, base - 8], [cx + 1, base]], P.pink)
  g.poly([[cx + 4, base], [cx + 2, base - 8], [cx - 1, base]], P.pink)
  g.poly([[cx - 2, base], [cx, base - 10], [cx + 2, base]], P.pinkL)
  g.rect(cx - 5, base, 11, 2, P.leaf)
  g.rect(cx - 5, base, 11, 1, P.grass)
}

function bowl(g: Surface, fill = P.white) {
  g.ellipse(7, 7, 6, 2, P.ink2)
  g.ellipse(7, 7, 5, 1.5, fill)
  g.poly([[1, 7], [13, 7], [11, 12], [3, 12]], '#3d3445')
  g.rect(3, 8, 2, 2, '#6d6478')
}

function heart(g: Surface, color = '#ff6f91', light = '#ffd1dc') {
  g.circle(4.5, 5, 3.2, color)
  g.circle(9.5, 5, 3.2, color)
  g.poly([[1.4, 6], [12.6, 6], [7, 12.5]], color)
  g.rect(3, 3, 2, 2, light)
}

function drop(g: Surface, c = P.water, d = P.waterD) {
  g.poly([[7, 1], [3, 8], [11, 8]], c)
  g.circle(7, 9, 4, c)
  g.rect(9, 8, 2, 3, d)
  g.px(5, 7, P.waterL)
  g.px(5, 8, P.waterL)
}

function incenseSticks(g: Surface) {
  g.rect(3, 9, 8, 4, '#c9a04c')
  g.rect(3, 9, 8, 1, '#e3bf62')
  g.rect(2, 12, 10, 1, '#9c7a3c')
  for (const x of [5, 7, 9]) {
    g.vline(x, 3, 8, '#c0392b')
    g.px(x, 2, '#ff8a3d')
  }
  g.px(6, 0, P.stoneL)
  g.px(8, 1, P.stoneL)
}

const ICONS: Record<string, Draw> = {
  // ---- currencies & UI ----
  coin: (g) => coin(g),
  coins: (g) => {
    coin(g, 5, 8, 4.5)
    coin(g, 9, 5, 4.5)
  },
  merit: (g) => lotus(g),
  lotus: (g) => lotus(g),
  exp: (g) => {
    lotus(g)
    g.px(12, 1, P.goldL)
    g.px(12, 3, P.goldL)
    g.px(11, 2, P.goldL)
    g.px(13, 2, P.goldL)
  },
  heart: (g) => heart(g),
  drop: (g) => drop(g),
  star: (g) => {
    g.poly([[7, 0], [9, 5], [14, 5], [10, 8], [12, 13], [7, 10], [2, 13], [4, 8], [0, 5], [5, 5]], P.gold)
    g.px(6, 4, P.goldL)
    g.px(6, 5, P.goldL)
  },
  lock: (g) => {
    g.rect(4, 2, 6, 2, P.stoneD)
    g.rect(3, 3, 2, 4, P.stoneD)
    g.rect(9, 3, 2, 4, P.stoneD)
    g.rect(2, 6, 10, 7, P.gold)
    g.rect(2, 6, 10, 1, P.goldL)
    g.rect(6, 8, 2, 3, P.goldDD)
  },
  map: (g) => {
    g.poly([[1, 2], [5, 1], [9, 2], [13, 1], [13, 12], [9, 13], [5, 12], [1, 13]], '#f3dcb2')
    g.vline(5, 1, 12, '#e0bb8a')
    g.vline(9, 2, 13, '#e0bb8a')
    g.line(2, 10, 6, 6, P.red)
    g.line(6, 6, 10, 9, P.red)
    g.circle(11, 5, 1.6, P.red)
    g.rect(2, 3, 2, 2, P.grass)
  },
  scroll: (g) => {
    g.rect(3, 2, 8, 10, '#fff1d6')
    g.rect(2, 1, 10, 2, '#e0bb8a')
    g.rect(2, 11, 10, 2, '#e0bb8a')
    for (const y of [4, 6, 8]) g.hline(4, 9, y, '#c28e5c')
    g.px(10, 9, P.red)
  },
  shop: (g) => {
    for (let x = 1; x < 13; x++) g.vline(x, 1, 4, Math.floor((x - 1) / 2) % 2 ? P.white : P.red)
    g.rect(2, 5, 10, 8, '#e0bb8a')
    g.rect(5, 8, 4, 5, '#9a6a45')
    g.rect(2, 5, 10, 1, '#f3dcb2')
  },
  shirt: (g) => {
    g.poly([[4, 1], [10, 1], [13, 4], [11, 6], [10, 5], [10, 13], [4, 13], [4, 5], [3, 6], [1, 4]], P.pink)
    g.rect(6, 1, 2, 2, P.pinkL)
    g.rect(4, 11, 6, 2, P.pinkD)
  },
  friends: (g) => {
    g.circle(4.5, 4.5, 2.5, '#fcd0b1')
    g.rect(2, 2, 5, 2, '#3b2f40')
    g.rect(1, 8, 7, 5, P.blue)
    g.circle(10, 5, 2.5, '#eeb98c')
    g.rect(8, 2, 5, 2, '#744a33')
    g.rect(7, 9, 7, 4, P.pink)
  },
  group: (g) => {
    for (const [x, c] of [[2.5, P.orange], [7, P.blue], [11.5, P.pink]] as [number, string][]) {
      g.circle(x, 5, 2, '#fcd0b1')
      g.rect(x - 2, 8, 4, 5, c)
    }
    g.rect(0, 12, 14, 2, P.goldD)
  },
  charity: (g) => {
    heart(g, '#ff6f91')
    g.rect(0, 10, 5, 4, '#fcd0b1')
    g.rect(9, 10, 5, 4, '#fcd0b1')
  },
  gear: (g) => {
    g.circle(7, 7, 5.5, P.stoneD)
    for (const [x, y] of [[6, 0], [6, 12], [0, 6], [12, 6], [2, 2], [10, 2], [2, 10], [10, 10]]) g.rect(x, y, 2, 2, P.stoneD)
    g.circle(7, 7, 4, P.stone)
    g.circle(7, 7, 1.8, P.stoneDD)
  },
  tv: (g) => {
    g.rect(1, 3, 12, 9, '#5a3d4f')
    g.rect(2, 4, 10, 7, P.skyD)
    g.poly([[5, 5], [9, 7.5], [5, 10]], P.white)
    g.line(4, 1, 6, 3, '#5a3d4f')
    g.line(10, 1, 8, 3, '#5a3d4f')
  },
  gift: (g) => {
    g.rect(1, 5, 12, 8, P.red)
    g.rect(1, 4, 12, 3, P.redL)
    g.rect(6, 4, 2, 9, P.gold)
    g.rect(1, 7, 12, 1, P.redD)
    g.circle(5, 3, 1.8, P.gold)
    g.circle(9, 3, 1.8, P.gold)
  },
  calendar: (g) => {
    g.rect(1, 2, 12, 11, P.white)
    g.rect(1, 2, 12, 3, P.red)
    g.rect(3, 0, 2, 3, P.stoneD)
    g.rect(9, 0, 2, 3, P.stoneD)
    for (let y = 6; y < 12; y += 3) for (let x = 3; x < 12; x += 3) g.rect(x, y, 2, 2, x === 6 && y === 9 ? P.gold : P.stone)
  },
  bell: (g) => {
    g.rect(6, 0, 2, 2, '#6e4a35')
    g.poly([[4, 2], [10, 2], [11, 10], [3, 10]], P.gold)
    g.rect(1, 10, 12, 2, P.goldD)
    g.rect(6, 12, 2, 2, P.goldDD)
    g.rect(5, 3, 1, 5, P.goldL)
  },
  book: (g) => {
    g.rect(1, 2, 12, 10, '#b8343f')
    g.rect(2, 3, 5, 8, P.cream)
    g.rect(7, 3, 5, 8, P.white)
    for (const y of [5, 7, 9]) {
      g.hline(3, 5, y, '#c28e5c')
      g.hline(8, 10, y, '#c28e5c')
    }
    g.rect(1, 12, 12, 1, '#7e2436')
  },
  bowl: (g) => bowl(g),
  dog: (g) => {
    g.rect(2, 4, 10, 8, '#e0a868')
    g.rect(1, 2, 3, 5, '#b87c43')
    g.rect(10, 2, 3, 5, '#b87c43')
    g.rect(4, 7, 2, 2, P.ink)
    g.rect(8, 7, 2, 2, P.ink)
    g.rect(5, 9, 4, 3, '#fbe3bf')
    g.rect(6, 9, 2, 1, P.ink)
    g.px(4, 7, P.white)
    g.px(8, 7, P.white)
  },
  paw: (g) => {
    g.circle(7, 9, 3.5, '#9a6a45')
    for (const [x, y] of [[3, 4.5], [6, 3], [9, 3], [12, 4.5]]) g.circle(x - 0.5, y, 1.5, '#9a6a45')
  },
  koi: (g) => {
    g.ellipse(6, 7, 5, 3, P.white)
    g.ellipse(5, 6, 3, 2, P.orange)
    g.poly([[10, 7], [14, 4], [14, 10]], P.orange)
    g.px(3, 6, P.ink)
    g.rect(7, 8, 2, 1, P.orange)
  },
  sun: (g) => {
    g.circle(7, 7, 4, P.gold)
    for (const [x, y] of [[7, 0], [7, 13], [0, 7], [13, 7], [2, 2], [12, 2], [2, 12], [12, 12]]) g.rect(x - 0.5, y - 0.5, 1, 1, P.orange)
    g.px(5, 5, P.goldL)
  },
  moon: (g) => {
    g.circle(7, 7, 5.5, '#fff3a6')
    g.ctx.globalCompositeOperation = 'destination-out'
    g.circle(10, 5, 4.5, '#000')
    g.ctx.globalCompositeOperation = 'source-over'
    g.px(3, 8, '#ffe066')
    g.px(5, 10, '#ffe066')
  },
  wai: (g) => {
    g.poly([[5, 13], [6, 2], [7, 1], [8, 2], [9, 13]], '#fcd0b1')
    g.vline(7, 2, 12, '#eaa98d')
    g.rect(3, 11, 8, 3, P.white)
  },
  boost: (g) => {
    lotus(g)
    g.rect(9, 0, 5, 5, P.red)
    g.px(10, 1, P.white)
    g.px(12, 1, P.white)
    g.px(11, 2, P.white)
    g.px(10, 3, P.white)
    g.px(12, 3, P.white)
  },
  boost2: (g) => {
    lotus(g)
    g.poly([[11, 0], [14, 3], [11, 6], [8, 3]], P.gold)
  },
  coinbag: (g) => {
    g.poly([[4, 4], [10, 4], [13, 11], [11, 13], [3, 13], [1, 11]], '#c28e5c')
    g.rect(5, 2, 4, 2, '#9a6a45')
    g.rect(4, 4, 6, 1, '#6e4a35')
    coin(g, 7, 9, 3)
  },
  tree: (g) => {
    g.rect(6, 9, 2, 5, '#9a6a45')
    g.circle(7, 6, 5, P.leaf)
    g.circle(6, 5, 3.5, P.grass)
    g.px(4, 3, P.grassL)
  },
  check: (g) => {
    g.line(2, 7, 5, 10, P.grassD)
    g.line(2, 8, 5, 11, P.grassD)
    g.line(5, 10, 12, 3, P.grassD)
    g.line(5, 11, 12, 4, P.grassD)
  },
  sparkle: (g) => {
    g.poly([[7, 0], [8.5, 5.5], [14, 7], [8.5, 8.5], [7, 14], [5.5, 8.5], [0, 7], [5.5, 5.5]], P.gold)
    g.rect(6, 6, 2, 2, P.goldL)
  },
  deity: (g) => {
    g.circle(7, 6, 5.5, '#fff3a6')
    g.circle(7, 6, 3, '#f28fa6')
    g.rect(5, 1, 4, 2, P.gold)
    g.rect(6, 0, 2, 1, P.gold)
    g.rect(4, 9, 6, 5, P.gold)
  },
  temple: (g) => {
    g.poly([[1, 7], [7, 1], [13, 7]], P.orange)
    g.poly([[4, 7], [7, 4], [10, 7]], P.redD)
    g.rect(2, 7, 10, 6, P.white)
    g.rect(6, 9, 2, 4, P.red)
    g.px(7, 0, P.gold)
    g.rect(1, 13, 12, 1, P.stone)
  },
  hall: (g) => ICONS.temple(g),
  sign: (g) => {
    g.rect(6, 5, 2, 9, '#9a6a45')
    g.poly([[1, 1], [11, 1], [13, 3.5], [11, 6], [1, 6]], '#e0bb8a')
    g.hline(3, 9, 3, '#9a6a45')
  },
  fortune: (g) => {
    g.rect(3, 5, 8, 9, P.red)
    g.rect(3, 5, 8, 1, P.redL)
    for (const [x, h] of [[4, 4], [6, 6], [8, 3], [5, 2], [9, 5]]) g.vline(x, 5 - h, 5, '#e0bb8a')
    g.px(6, 0, P.red)
    g.rect(4, 8, 6, 3, P.gold)
  },
  powder: (g) => {
    g.circle(7, 9, 5, '#fffaf0')
    g.circle(7, 9, 3, '#ffd6e0')
    g.rect(5, 1, 4, 3, P.pinkD)
    g.px(3, 5, P.white)
    g.px(11, 4, P.white)
  },
  number: (g) => {
    g.rect(1, 2, 12, 10, '#8b6a55')
    g.rect(2, 3, 10, 8, '#a9876f')
    g.rect(3, 4, 2, 6, P.white)
    g.rect(7, 4, 4, 1, P.white)
    g.rect(10, 4, 1, 3, P.white)
    g.rect(7, 7, 4, 1, P.white)
    g.rect(7, 7, 1, 3, P.white)
    g.rect(7, 9, 4, 1, P.white)
  },
  meditate: (g) => {
    g.circle(7, 3, 2.5, '#fcd0b1')
    g.rect(4, 6, 6, 4, P.white)
    g.rect(1, 10, 12, 3, P.white)
    g.rect(1, 12, 12, 1, P.stoneL)
    g.circle(7, 3, 5.5, 'rgba(255,211,78,0.35)')
  },
  close: (g) => {
    g.line(2, 2, 11, 11, P.ink2)
    g.line(3, 2, 12, 11, P.ink2)
    g.line(11, 2, 2, 11, P.ink2)
    g.line(12, 2, 3, 11, P.ink2)
  },
  plus: (g) => {
    g.rect(5, 1, 4, 12, P.grassD)
    g.rect(1, 5, 12, 4, P.grassD)
  },
  vessel: (g) => {
    g.ellipse(6, 9, 4.5, 4, P.goldD)
    g.ellipse(5.5, 8.5, 3.5, 3, P.gold)
    g.rect(4, 3, 4, 3, P.goldD)
    g.line(9, 5, 13, 3, P.goldD)
    g.rect(3, 2, 6, 1, P.gold)
    g.px(13, 4, P.water)
    g.px(13, 6, P.water)
  },

  // ---- items: alms food ----
  rice: (g) => {
    bowl(g, P.white)
    g.ellipse(7, 6, 5, 2.5, P.white)
    g.px(5, 5, P.cream)
    g.px(8, 4, P.cream)
    g.rect(3, 8, 8, 1, '#8a64d6')
  },
  sticky: (g) => {
    g.poly([[2, 5], [7, 1], [12, 5], [12, 12], [2, 12]], P.grassD)
    g.rect(3, 6, 8, 5, P.grass)
    g.rect(4, 7, 6, 3, P.cream)
    g.line(2, 8, 12, 8, '#9a6a45')
  },
  curry: (g) => {
    g.poly([[3, 3], [11, 3], [12, 13], [2, 13]], 'rgba(255,255,255,0.55)')
    g.rect(3, 7, 9, 6, '#7fbf4f')
    g.rect(4, 8, 2, 2, P.white)
    g.px(9, 9, P.red)
    g.px(7, 11, '#3f7a2f')
    g.rect(5, 2, 4, 2, P.red)
  },
  egg: (g) => {
    g.ellipse(7, 11, 6, 2.5, P.ink2)
    g.ellipse(7, 10.5, 5.5, 2, '#b5835a')
    g.ellipse(5, 7, 3, 3.5, '#8a5a32')
    g.ellipse(9.5, 7.5, 3, 3.5, '#9a6a45')
    g.px(4, 5, '#c28e5c')
    g.px(9, 6, '#c28e5c')
  },
  dessert: (g) => {
    g.ellipse(7, 11, 6.5, 2, P.stoneL)
    for (const [x, y] of [[4, 8], [8, 8], [6, 5], [10, 6]]) {
      g.circle(x, y, 2.2, P.gold)
      g.px(x - 1, y - 1, P.goldL)
    }
  },
  banana: (g) => {
    g.poly([[2, 3], [5, 10], [11, 12], [12, 11], [7, 8], [4, 2]], P.yellow)
    g.poly([[4, 2], [7, 8], [12, 11], [13, 9], [8, 6], [6, 1]], '#f5d03a')
    g.rect(2, 1, 3, 2, P.leaf)
    g.px(12, 11, '#6e4a35')
  },
  water: (g) => {
    g.rect(4, 3, 6, 10, 'rgba(180,238,244,0.9)')
    g.rect(5, 1, 4, 2, P.blue)
    g.rect(4, 6, 6, 3, P.blueL)
    g.rect(5, 4, 1, 8, P.white)
  },
  sangkhathan: (g) => {
    g.rect(1, 5, 12, 8, '#f5c542')
    g.rect(1, 5, 12, 1, P.goldL)
    g.poly([[3, 5], [5, 1], [7, 5]], P.orange)
    g.poly([[7, 5], [9, 2], [11, 5]], P.white)
    g.rect(6, 5, 2, 8, P.red)
    g.rect(1, 9, 12, 1, P.red)
  },

  // ---- items: offerings ----
  incense: (g) => incenseSticks(g),
  garland: (g) => {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.circle(7 + Math.cos(a) * 4.5, 6 + Math.sin(a) * 4.5, 1.5, i % 2 ? P.orange : P.yellow)
    }
    g.rect(6, 11, 2, 3, P.red)
    g.px(5, 13, P.red)
    g.px(8, 13, P.red)
  },
  rose: (g) => {
    g.vline(7, 7, 13, P.leaf)
    g.rect(8, 9, 3, 2, P.grass)
    g.circle(7, 5, 4, P.red)
    g.circle(7, 5, 2.4, P.redD)
    g.px(6, 4, P.redL)
  },
  fruit: (g) => {
    g.ellipse(7, 12, 6.5, 2, P.gold)
    g.circle(4.5, 8.5, 2.8, P.orange)
    g.circle(9.5, 8.5, 2.8, P.red)
    g.circle(7, 5.5, 2.6, '#9270dc')
    g.px(3, 7, P.orangeL)
    g.px(9, 7, P.redL)
    g.rect(7, 2, 1, 2, P.leaf)
  },
  laddu: (g) => {
    g.ellipse(7, 12, 6.5, 2, P.stoneL)
    for (const [x, y] of [[4.5, 9], [9.5, 9], [7, 5.5]]) {
      g.circle(x, y, 2.9, P.orange)
      g.px(x - 1, y - 1, P.orangeL)
      g.px(x + 1, y + 1, P.orangeD)
    }
  },
  milk: (g) => {
    g.rect(3, 4, 8, 9, P.white)
    g.poly([[3, 4], [7, 1], [11, 4]], P.blueL)
    g.rect(3, 7, 8, 3, P.blueL)
    g.rect(9, 4, 2, 9, '#e6dccb')
  },
  redsoda: (g) => {
    g.rect(4, 4, 6, 9, P.red)
    g.rect(5, 1, 4, 3, 'rgba(255,255,255,0.8)')
    g.rect(4, 7, 6, 2, P.white)
    g.rect(5, 4, 1, 9, P.redL)
    g.vline(9, 0, 5, P.stone)
  },
  boiledegg: (g) => {
    g.ellipse(7, 12, 6, 1.5, P.stoneL)
    g.ellipse(4.5, 8, 3, 3.8, P.white)
    g.ellipse(9.5, 8, 3, 3.8, P.white)
    g.circle(9.5, 8.5, 1.5, P.gold)
    g.px(3, 6, P.cream)
  },
  elephant: (g) => {
    g.rect(2, 5, 9, 6, '#b5835a')
    g.rect(9, 3, 4, 5, '#b5835a')
    g.rect(12, 7, 1, 5, '#b5835a')
    g.rect(3, 11, 2, 3, '#9a6a45')
    g.rect(8, 11, 2, 3, '#9a6a45')
    g.px(10, 4, P.ink)
    g.rect(2, 5, 9, 1, '#c9975f')
    g.rect(4, 6, 4, 2, P.red)
  },
  tea: (g) => {
    g.ellipse(6, 9, 5, 4, '#fffaf0')
    g.rect(4, 4, 4, 2, '#fffaf0')
    g.line(10, 8, 13, 6, '#fffaf0')
    g.rect(3, 8, 6, 1, P.blue)
    g.rect(5, 3, 2, 1, P.blue)
    g.px(3, 1, P.stoneL)
    g.px(5, 0, P.stoneL)
  },
  goldleaf: (g) => {
    g.rect(2, 2, 10, 10, '#fff1d6')
    g.rect(3, 3, 8, 8, P.gold)
    g.poly([[3, 3], [11, 3], [3, 11]], P.goldL)
    g.px(9, 9, P.goldD)
  },

  // ---- items: animals ----
  fishfood: (g) => {
    g.poly([[3, 2], [11, 2], [12, 13], [2, 13]], P.blue)
    g.rect(3, 2, 8, 2, P.blueD)
    g.rect(4, 6, 6, 4, P.white)
    g.px(5, 7, P.orange)
    g.px(7, 8, '#9a6a45')
    g.px(8, 7, '#9a6a45')
  },
  dogfood: (g) => {
    g.ellipse(7, 10, 6.5, 3, P.red)
    g.ellipse(7, 8.5, 5.5, 2, '#9a6a45')
    for (const [x, y] of [[5, 8], [7, 7], [9, 8], [6, 9], [8, 9]]) g.px(x, y, '#c28e5c')
    g.rect(1, 10, 12, 1, P.redD)
  },
  chicken: (g) => {
    g.ellipse(7, 11, 6.5, 2, P.stoneL)
    g.ellipse(6, 8, 4.5, 3.2, '#f0d2a0')
    g.ellipse(6, 7.5, 3.2, 2, '#fbe3bf')
    g.line(10, 6, 12, 3, '#fffaf0')
    g.circle(12.5, 2.5, 1.2, '#fffaf0')
  },
  bread: (g) => {
    g.ellipse(7, 8, 6, 4, '#d9a45a')
    g.ellipse(7, 7, 5, 3, '#f0c27a')
    g.line(4, 6, 6, 8, '#b8844a')
    g.line(7, 5, 9, 7, '#b8844a')
  },
  krathong: (g) => {
    g.ellipse(7, 11, 6.5, 2.5, P.leaf)
    g.ellipse(7, 10, 5.5, 2, P.grass)
    for (const [x, c] of [[4, P.pink], [7, P.yellow], [10, P.white]] as [number, string][]) g.circle(x, 8, 1.8, c)
    g.vline(7, 2, 7, P.cream)
    g.px(7, 1, P.orange)
    g.vline(5, 4, 7, '#c0392b')
    g.vline(9, 4, 7, '#c0392b')
  },
  star_empty: (g) => {
    g.poly([[7, 0], [9, 5], [14, 5], [10, 8], [12, 13], [7, 10], [2, 13], [4, 8], [0, 5], [5, 5]], '#8a6a4a')
    g.poly([[7, 3], [8, 6], [11, 6], [9, 8], [10, 11], [7, 9], [4, 11], [5, 8], [3, 6], [6, 6]], '#6b4d34')
  },
  home: (g) => {
    g.poly([[7, 0], [14, 6], [12, 6], [12, 13], [2, 13], [2, 6], [0, 6]], '#e05a3a')
    g.rect(3, 6, 8, 7, '#fff1d6')
    g.rect(3, 6, 8, 1, '#e0bb8a')
    g.rect(6, 9, 3, 4, '#9a6a45')
    g.rect(9, 8, 2, 2, '#8fd0f0')
    g.px(7, 1, '#ff9a6a')
    g.line(2, 5, 7, 1, '#ff9a6a')
  },
  bag: (g) => {
    g.rect(5, 1, 4, 2, '#9a6a45')
    g.rect(4, 2, 1, 2, '#9a6a45')
    g.rect(9, 2, 1, 2, '#9a6a45')
    g.rect(2, 4, 10, 9, '#d9914a')
    g.rect(2, 4, 10, 1, '#f0b870')
    g.rect(3, 7, 8, 4, '#b8743a')
    g.rect(6, 8, 2, 2, P.gold)
    g.rect(2, 12, 10, 1, '#9a5a2a')
  },
  menu: (g) => {
    for (const y of [2, 6, 10]) {
      g.rect(1, y, 12, 3, '#fff1d6')
      g.rect(1, y + 2, 12, 1, '#e0bb8a')
    }
  },
  mic: (g) => {
    g.rect(5, 0, 4, 8, '#9aa7b8')
    g.rect(4, 1, 6, 6, '#9aa7b8')
    g.rect(5, 1, 1, 5, '#e6eef6')
    g.hline(5, 8, 3, '#6b7788')
    g.hline(5, 8, 5, '#6b7788')
    g.rect(2, 5, 1, 3, '#5a3d4f')
    g.rect(11, 5, 1, 3, '#5a3d4f')
    g.rect(3, 8, 8, 1, '#5a3d4f')
    g.rect(6, 9, 2, 3, '#5a3d4f')
    g.rect(4, 12, 6, 1, '#5a3d4f')
  },
  mic_off: (g) => {
    g.rect(5, 0, 4, 8, '#9aa7b8')
    g.rect(4, 1, 6, 6, '#9aa7b8')
    g.rect(3, 8, 8, 1, '#5a3d4f')
    g.rect(6, 9, 2, 3, '#5a3d4f')
    g.rect(4, 12, 6, 1, '#5a3d4f')
    g.thickLine(1, 1, 12, 12, 2, P.red)
  },
  hammer: (g) => {
    g.thickLine(3, 12, 9, 5, 2, '#b8844a')
    g.rect(6, 1, 7, 4, '#9aa7b8')
    g.rect(6, 1, 7, 1, '#e6eef6')
    g.rect(11, 1, 2, 4, '#6b7788')
    g.px(2, 12, '#8a5a30')
  },
  mala: (g) => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      g.circle(7 + Math.cos(a) * 5, 6 + Math.sin(a) * 5, 1.3, i % 2 ? '#a0582a' : '#c47a3e')
    }
    g.rect(6, 11, 2, 3, P.red)
    g.px(7, 13, P.gold)
  },
  pray: (g) => {
    g.poly([[7, 1], [9, 3], [10, 9], [8, 12], [6, 12], [4, 9], [5, 3]], '#fcd0b1')
    g.vline(7, 2, 11, '#e0a07a')
    g.rect(4, 11, 6, 3, P.white)
    g.px(3, 2, P.goldL)
    g.px(11, 3, P.goldL)
    g.px(2, 6, P.gold)
  },
  play: (g) => {
    g.poly([[3, 1], [12, 7], [3, 13]], P.grass)
    g.line(4, 3, 4, 10, P.grassL)
  },
  pause: (g) => {
    g.rect(3, 2, 3, 10, '#fff1d6')
    g.rect(8, 2, 3, 10, '#fff1d6')
  },
  retry: (g) => {
    for (let i = 0; i < 20; i++) {
      const a = -0.6 + (i / 20) * Math.PI * 1.6
      g.circle(7 + Math.cos(a) * 4.5, 7 + Math.sin(a) * 4.5, 1, P.grassD)
    }
    g.poly([[9, 0], [13, 3], [9, 5]], P.grassD)
  },
  user: (g) => {
    g.circle(7, 4, 3, '#fcd0b1')
    g.rect(4, 1, 6, 2, '#3a2a2a')
    g.poly([[1, 13], [3, 8], [11, 8], [13, 13]], '#6fa8dc')
  },
  mail: (g) => {
    g.rect(1, 3, 12, 9, '#fff1d6')
    g.line(1, 3, 7, 8, '#c28e5c')
    g.line(13, 3, 7, 8, '#c28e5c')
    g.rect(1, 11, 12, 1, '#e0bb8a')
  },
  key: (g) => {
    g.circle(4, 5, 3, P.gold)
    g.circle(4, 5, 1, '#9a6418')
    g.rect(6, 4, 7, 2, P.gold)
    g.rect(10, 6, 1, 2, P.gold)
    g.rect(12, 6, 1, 3, P.gold)
  },
  door: (g) => {
    g.rect(3, 1, 8, 12, '#9a6a45')
    g.rect(4, 2, 6, 10, '#b8844a')
    g.rect(4, 2, 6, 1, '#d9a45a')
    g.px(9, 7, P.gold)
    g.rect(2, 13, 10, 1, '#6b4428')
  },
  music: (g) => {
    g.rect(4, 2, 1, 8, '#5a3d4f')
    g.rect(10, 1, 1, 8, '#5a3d4f')
    g.rect(4, 1, 7, 2, '#5a3d4f')
    g.ellipse(3, 10, 2, 1.5, '#5a3d4f')
    g.ellipse(9, 9, 2, 1.5, '#5a3d4f')
  },
  info: (g) => {
    g.circle(7, 7, 6, '#4f8fd8')
    g.rect(6, 6, 2, 5, '#fff')
    g.rect(6, 3, 2, 2, '#fff')
  },
  camera: (g) => {
    g.rect(1, 4, 12, 8, '#5a3d4f')
    g.rect(4, 2, 5, 2, '#5a3d4f')
    g.circle(7, 8, 3, '#9aa7b8')
    g.circle(7, 8, 1.5, '#2c2f63')
    g.px(11, 5, P.gold)
  },
  edit: (g) => {
    g.thickLine(3, 11, 11, 3, 2, P.gold)
    g.poly([[2, 12], [2, 10], [4, 12]], '#5a3d4f')
    g.rect(10, 2, 2, 2, P.pink)
  },
  flip: (g) => {
    g.poly([[1, 7], [5, 3], [5, 11]], '#4f8fd8')
    g.poly([[13, 7], [9, 3], [9, 11]], '#4f8fd8')
    g.vline(7, 1, 13, '#8a6a4a')
  },
  rotate: (g) => {
    for (let i = 0; i < 20; i++) {
      const a = 0.4 + (i / 20) * Math.PI * 1.6
      g.circle(7 + Math.cos(a) * 4.5, 7 + Math.sin(a) * 4.5, 1, '#4f8fd8')
    }
    g.poly([[10, 0], [13, 4], [8, 4]], '#4f8fd8')
  },
  trash: (g) => {
    g.rect(3, 4, 8, 9, '#9aa7b8')
    g.rect(2, 2, 10, 2, '#6b7788')
    g.rect(5, 1, 4, 1, '#6b7788')
    for (const x of [5, 7, 9]) g.vline(x, 6, 11, '#6b7788')
  },
  logout: (g) => {
    g.rect(1, 1, 7, 12, '#9a6a45')
    g.rect(2, 2, 5, 10, '#b8844a')
    g.poly([[13, 7], [9, 3], [9, 11]], P.red)
    g.rect(5, 6, 5, 2, P.red)
  },
  bolt: (g) => {
    g.poly([[8, 0], [2, 8], [6, 8], [5, 14], [12, 5], [8, 5]], P.gold)
    g.px(7, 2, P.goldL)
  },
  chest: (g) => {
    g.rect(1, 5, 12, 8, '#b8743a')
    g.rect(1, 3, 12, 3, '#d9914a')
    g.rect(1, 3, 12, 1, '#f0b870')
    g.rect(1, 6, 12, 1, P.goldD)
    g.rect(6, 5, 2, 3, P.gold)
    g.vline(3, 3, 12, P.goldD)
    g.vline(10, 3, 12, P.goldD)
  },
  bed: (g) => {
    g.rect(1, 7, 12, 4, '#fff1d6')
    g.rect(1, 5, 4, 3, '#ffffff')
    g.rect(5, 6, 8, 3, '#8fb8e8')
    g.rect(0, 4, 1, 9, '#9a6a45')
    g.rect(13, 7, 1, 6, '#9a6a45')
    g.rect(1, 11, 12, 1, '#9a6a45')
  },
  broom: (g) => {
    g.thickLine(10, 1, 5, 9, 2, '#b8844a')
    g.poly([[2, 8], [7, 8], [9, 13], [0, 13]], '#e8c46a')
    g.line(2, 10, 1, 13, '#b8943a')
    g.line(5, 10, 5, 13, '#b8943a')
    g.line(7, 10, 8, 13, '#b8943a')
    g.rect(2, 8, 5, 1, P.red)
  },
  market: (g) => {
    g.rect(1, 5, 12, 8, '#e0bb8a')
    for (let x = 1; x < 13; x++) g.vline(x, 2, 5, Math.floor((x - 1) / 3) % 2 ? P.white : '#4f9e4c')
    g.rect(3, 8, 3, 3, P.gold)
    g.rect(8, 8, 3, 3, P.pink)
    g.rect(1, 12, 12, 1, '#9a6a45')
  },
  pan: (g) => {
    g.ellipse(6, 8, 5.5, 3, '#5a5a66')
    g.ellipse(6, 7.5, 4.5, 2.2, '#3a3a44')
    g.thickLine(11, 7, 13, 3, 2, '#9a6a45')
    g.circle(5, 7, 1.5, '#ffe58a')
    g.px(5, 7, '#f2a23f')
  },
}

export const ICON_NAMES = Object.keys(ICONS)

export function iconSprite(name: string): Sprite {
  return cached(`icon:${name}`, () => {
    if (!ICONS[name] && hasFoodIcon(name)) return foodIcon(name)
    const draw = ICONS[name] ?? ICONS.sparkle
    const c = bake(14, 14, draw)
    return outlineCanvas(c, k)
  })
}

const urlCache = new Map<string, string>()

/** Data URL of an icon scaled by an integer factor (for crisp <img>). */
export function iconUrl(name: string, scale = 3): string {
  const key = `${name}@${scale}`
  let u = urlCache.get(key)
  if (!u) {
    u = spriteDataUrl(iconSprite(name), scale)
    urlCache.set(key, u)
  }
  return u
}

/** Mini 7×7 markers that float above world hotspots. */
export function markerSprite(name: string): Sprite {
  return cached(`marker:${name}`, () => {
    const big = iconSprite(name)
    // Downscale 16 → 9 by nearest sampling for a chunky mini icon.
    const c = document.createElement('canvas')
    c.width = 9
    c.height = 9
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(big.canvas, 0, 0, 16, 16, 0, 0, 9, 9)
    return { canvas: c, w: 9, h: 9 }
  })
}
