// Thailand-map pin icons for the hub markets and the temple fair. They share
// the landmark-icon box (22×22 art, may poke 3px above) but are styled as
// markets: a striped market umbrella / awning on every one, bright stall
// colours, and the ThaiMapScene adds a crowd badge on top (see drawHubBadge).

import type { Surface } from '../engine/pixel'


/** Striped market umbrella (ร่มแม่ค้า) centred at x with its top at y. */
function umbrella(g: Surface, x: number, y: number, r: number, a: string, b: string) {
  for (let i = 0; i < 4; i++) {
    const half = Math.round(r * (0.35 + i * 0.22))
    for (let k = -half; k <= half; k++) g.px(x + k, y + i, Math.floor((k + 20) / 2) % 2 ? a : b)
  }
  for (let k = -r; k <= r; k += 2) g.px(x + k, y + 4, a)
  g.vline(x, y + 4, y + 9, '#8a8480')
  g.px(x, y - 1, '#ffd54f')
}

/** A little stall counter with goods (bottom of the icon). */
function counter(g: Surface, x0: number, x1: number, y: number, cloth: string) {
  g.rect(x0, y, x1 - x0, 2, '#fff1d6')
  g.rect(x0, y + 2, x1 - x0, 3, cloth)
  for (let x = x0 + 1; x < x1; x += 2) g.px(x, y - 1, ['#e8514a', '#ffd23f', '#6cc36a', '#ff9fc0'][(x >> 1) % 4])
}

function paving(g: Surface) {
  g.ellipse(11, 19.5, 10.5, 2.6, '#8c8187')
  g.ellipse(11, 19, 10, 2, '#e4ddd6')
  g.ellipse(9, 18.5, 5, 1, '#fffaf0')
}

function water(g: Surface) {
  g.ellipse(11, 19.5, 10.5, 2.8, '#47a6cb')
  g.ellipse(11, 19, 10, 2.2, '#78d2e2')
  g.hline(4, 7, 19, '#b3eef4')
  g.hline(14, 17, 20, '#b3eef4')
}

export const HUB_ICON_DRAW: Record<string, (g: Surface) => void> = {
  hub_chatuchak(g) {
    paving(g)
    // Stall awnings either side.
    counter(g, 1, 7, 15, '#5a8de0')
    counter(g, 15, 21, 15, '#43905a')
    umbrella(g, 4, 9, 4, '#e8514a', '#fffaf0')
    umbrella(g, 18, 9, 4, '#ffd23f', '#e8514a')
    // The clock tower.
    g.rect(9, 6, 5, 13, '#fffaf0')
    g.vline(13, 6, 18, '#d8cfc4')
    g.hline(9, 13, 12, '#e8514a')
    g.rect(8, 2, 7, 5, '#fffaf0')
    g.circle(11, 4, 2, '#3d63b5')
    g.px(11, 4, '#fffaf0')
    g.poly([[7, 2], [11, -3], [15, 2]], '#3d8a6a')
    g.px(11, -3, '#ffd54f')
  },
  hub_damnoen(g) {
    water(g)
    umbrella(g, 17, 4, 5, '#43905a', '#fffaf0')
    // Paddle boat with a vendor in a straw hat and fruit.
    g.poly([[2, 15], [20, 15], [22, 12], [19, 18], [4, 18], [0, 13]], '#7a4a32')
    g.hline(2, 20, 15, '#a87050')
    g.rect(8, 9, 4, 6, '#3d63b5')
    g.rect(8, 7, 4, 2, '#e0a878')
    g.rect(6, 6, 8, 1, '#e0c080')
    g.rect(8, 5, 4, 1, '#e8cc90')
    for (const [x, c] of [
      [14, '#ffd23f'],
      [16, '#f58f35'],
      [18, '#6a3a5a'],
      [3, '#e8514a'],
      [5, '#6cc36a'],
    ] as const)
      g.circle(x, 13, 1.3, c)
    g.line(12, 11, 18, 19, '#9a6a45')
  },
  hub_maeklong(g) {
    paving(g)
    // Rails in perspective.
    g.line(8, 21, 10, 6, '#5e5a64')
    g.line(14, 21, 12, 6, '#5e5a64')
    for (let y = 8; y < 21; y += 3) g.hline(9, 13, y, '#9a7456')
    // The train coming at you.
    g.rect(7, 5, 8, 9, '#f0c040')
    g.rect(8, 6, 6, 3, '#6a8ab0')
    g.hline(7, 14, 10, '#e8514a')
    g.px(8, 12, '#fff6c8')
    g.px(13, 12, '#fff6c8')
    g.rect(8, 3, 6, 2, '#d8dce4')
    // Awnings folding back on both sides.
    for (let i = 0; i < 3; i++) {
      g.rect(0, 9 + i * 3, 5 - i, 2, i % 2 ? '#fffaf0' : '#e8514a')
      g.rect(17 + i, 9 + i * 3, 5 - i, 2, i % 2 ? '#fffaf0' : '#3d63b5')
    }
    umbrella(g, 19, 0, 3, '#e8514a', '#fffaf0')
  },
  hub_thaphae(g) {
    paving(g)
    // Red-brick wall with merlons and the gate.
    g.rect(0, 9, 22, 9, '#b8543a')
    for (let x = 0; x < 22; x += 4) g.rect(x, 7, 2, 2, '#b8543a')
    for (let y = 10; y < 18; y += 2) g.hline(0, 21, y, '#984232')
    g.rect(8, 11, 6, 7, '#3a2830')
    g.rect(7, 11, 1, 7, '#8a5a3a')
    g.rect(14, 11, 1, 7, '#8a5a3a')
    // A string of Lanna lanterns.
    g.line(0, 3, 21, 3, '#6e4a35')
    for (const [x, c] of [
      [3, '#ffcf5a'],
      [8, '#e8514a'],
      [13, '#ffcf5a'],
      [18, '#e8514a'],
    ] as const) {
      g.rect(x - 1, 4, 3, 3, c)
      g.px(x, 7, '#ffd23f')
    }
    umbrella(g, 17, -3, 3, '#ff9fc0', '#6cc36a')
  },
  hub_kimyong(g) {
    paving(g)
    // The market building with its red sign band.
    g.rect(3, 3, 16, 14, '#f0e4c4')
    for (let x = 4; x < 19; x += 3) g.vline(x, 4, 10, '#d8c8a0')
    g.rect(3, 10, 16, 3, '#b8343f')
    g.hline(5, 16, 11, '#ffd54f')
    g.rect(4, 13, 14, 4, '#3a2a30')
    for (let x = 5; x < 18; x += 3) g.px(x, 14, ['#ffd23f', '#e8514a', '#f58f35'][x % 3])
    // Fried chicken!
    g.ellipse(18, 17, 3, 2, '#c86a2a')
    g.px(17, 16, '#f0a050')
    // Red lanterns.
    g.circle(1, 6, 1.5, '#e8514a')
    g.circle(21, 6, 1.5, '#e8514a')
    umbrella(g, 5, -2, 3, '#3d63b5', '#fffaf0')
  },
  hub_indochina(g) {
    water(g)
    // The Mekong's far bank.
    g.hline(0, 21, 14, '#5e8a5a')
    // Mukdahan Tower with its glass ball.
    g.rect(14, 5, 3, 13, '#fbf6ee')
    g.vline(16, 5, 17, '#d8cfc4')
    g.rect(13, 16, 5, 2, '#fbf6ee')
    g.circle(15, 3, 2.5, '#c8e8f8')
    g.px(14, 2, '#ffffff')
    g.vline(15, -3, 0, '#ffd54f')
    // Market stall with a naga-green roof.
    g.rect(1, 10, 11, 2, '#3d8a8a')
    g.rect(2, 12, 9, 4, '#f0e8dc')
    counter(g, 2, 11, 15, '#b8343f')
    umbrella(g, 6, 3, 4, '#ffd23f', '#e8514a')
  },
  fair_temple(g) {
    g.ellipse(11, 19.5, 10.5, 2.6, '#4a3a5a')
    g.ellipse(11, 19, 10, 2, '#6a5a8a')
    // Ferris wheel with coloured lights.
    const cx = 8
    const cy = 8
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      g.px(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7), '#8a86c0')
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      g.line(cx, cy, Math.round(cx + Math.cos(a) * 6), Math.round(cy + Math.sin(a) * 6), '#6a5a9a')
      g.px(Math.round(cx + Math.cos(a) * 7), Math.round(cy + Math.sin(a) * 7) + 1, ['#ff6f91', '#ffd23f', '#6cf0c0'][i % 3])
    }
    g.line(cx, cy, cx - 4, 18, '#8a86c0')
    g.line(cx, cy, cx + 4, 18, '#8a86c0')
    g.px(cx, cy, '#ffd54f')
    // Striped fair tent.
    g.poly([[12, 12], [17, 5], [22, 12]], '#e8514a')
    g.line(17, 5, 15, 12, '#fffaf0')
    g.line(17, 5, 19, 12, '#fffaf0')
    g.rect(13, 12, 9, 6, '#ffd23f')
    g.rect(16, 14, 3, 4, '#3a2838')
    g.px(17, 4, '#ffd54f')
    // Bulbs.
    for (let x = 13; x < 22; x += 2) g.px(x, 12, x % 4 === 1 ? '#fff3a6' : '#ff9fc0')
    g.px(1, 1, '#fff3a6')
    g.px(20, 1, '#ffd23f')
  },
}

