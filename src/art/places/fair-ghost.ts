// บ้านผีสิง – the haunted house interior (map fair_temple:ghost): baked
// rooms (a creaky hall with a wardrobe and a doll shelf, a pretend graveyard,
// Mae Nak's wooden house) and the cute ghosts that jump out – a shy sheet
// ghost, a smiling doll, a skeleton doing ramwong, a krahang flapping its
// rice-winnowing baskets, Mae Nak's l-o-n-g arm after a lime, a hopping
// jiangshi. Funny, not gory.

import type { Color, Surface } from '../../engine/pixel'
import { ditherOn } from '../../engine/pixel'
import { hprop, hsh, INK, mix, type HubProp } from './hub-kit'

export const GH_W = 200
export const GH_H = 440

/** Walls, floors, doorways and painted scenery of the three rooms. */
export function bakeGhostHouse(g: Surface) {
  const W = GH_W
  const H = GH_H
  g.rect(0, 0, W, H, '#140c1c')
  // Floors: creaky planks (hall), dirt with grass tufts (graveyard), teak (Nak's house).
  const planks = (y0: number, y1: number, a: Color, b: Color) => {
    for (let y = y0; y < y1; y++) for (let x = 10; x < W - 10; x++) g.px(x, y, (Math.floor(y / 6) + (Math.floor((x + (Math.floor(y / 6) % 2) * 17) / 34) % 2)) % 2 ? a : b)
    for (let y = y0; y < y1; y += 6) g.hline(10, W - 11, y, mix(a, INK, 0.3))
  }
  planks(316, 430, '#3a2a38', '#34263a')
  for (let y = 176; y < 300; y++)
    for (let x = 10; x < W - 10; x++) {
      const v = hsh(x, y, 3)
      g.px(x, y, v < 40 ? '#2a3a2a' : v > 960 ? '#4a4038' : ditherOn(x, y, 0.3) ? '#2e2630' : '#2a2228')
    }
  planks(46, 160, '#4a3222', '#42301f')
  // Walls between the rooms, with doorways.
  const wall = (y: number, gap0: number, gap1: number) => {
    for (const [x0, x1] of [
      [0, gap0],
      [gap1, W],
    ]) {
      g.rect(x0, y, x1 - x0, 16, '#2a1e34')
      g.rect(x0, y, x1 - x0, 3, '#3e2e4a')
      for (let x = x0 + 4; x < x1; x += 9) g.vline(x, y + 4, y + 15, '#231a2c')
    }
    g.rect(gap0 - 2, y - 2, 3, 18, '#5a4a3a')
    g.rect(gap1 - 1, y - 2, 3, 18, '#5a4a3a')
  }
  wall(300, 144, 188)
  wall(160, 12, 56)
  // Outer walls: striped wallpaper with cobwebs.
  for (let y = 0; y < H; y++) {
    g.rect(0, y, 10, 1, y % 8 < 4 ? '#2a1e34' : '#241a2e')
    g.rect(W - 10, y, 10, 1, y % 8 < 4 ? '#2a1e34' : '#241a2e')
  }
  g.rect(0, 0, W, 46, '#1e1428')
  for (let x = 0; x < W; x += 8) g.rect(x, 30, 4, 16, '#2a1e34')
  g.rect(0, 430, W, 10, '#1e1428')
  for (const [x, y, s] of [
    [10, 318, 1],
    [W - 10, 318, -1],
    [10, 178, 1],
    [W - 10, 48, -1],
  ]) {
    for (let k = 0; k < 4; k++) g.line(x, y + k * 3, x + s * (10 - k * 2), y, '#8a8090')
    g.line(x, y, x + s * 8, y + 10, '#8a8090')
  }
  // Exit door with a green sign.
  g.rect(W / 2 - 12, 20, 24, 26, '#0a0610')
  g.rect(W / 2 - 14, 18, 28, 3, '#5a4a3a')
  g.rect(W / 2 - 16, 8, 32, 8, '#2e8a4a')
  g.rect(W / 2 - 14, 10, 4, 4, '#c8ff8a')
  for (let i = 0; i < 4; i++) g.rect(W / 2 - 8 + i * 5, 11, 3, 2, '#c8ff8a')
  // Entrance at the bottom.
  g.rect(W / 2 - 14, 428, 28, 12, '#0a0610')
  // The painted graveyard backdrop on room B's back wall: a moon and bare trees.
  g.circle(160, 188, 8, '#e8f0c8')
  g.circle(163, 186, 7, '#2a2228')
  for (const [x, h] of [
    [30, 26],
    [70, 18],
  ]) {
    g.vline(x, 176 + (30 - h), 204, '#1a1418')
    g.line(x, 190, x - 6, 182, '#1a1418')
    g.line(x, 186, x + 7, 180, '#1a1418')
  }
  // Nak's house: a wooden wall with a window and a lantern hook.
  g.rect(12, 46, W - 24, 24, '#5a3a24')
  for (let x = 14; x < W - 12; x += 8) g.vline(x, 46, 69, '#4a2e1c')
  g.rect(120, 50, 26, 16, '#0e0a14')
  g.frame(120, 50, 26, 16, '#8a6a4a')
  g.vline(133, 50, 65, '#8a6a4a')
}

/** Old wardrobe (anchor: bottom centre). Hooks: `door` (where the ghost peeks). */
export function wardrobe(): HubProp {
  return hprop('ghost:wardrobe', 26, 40, 13, 39, (g, hooks) => {
    g.rect(1, 2, 24, 37, '#5a3a2a')
    g.rect(1, 0, 24, 3, '#6e4a35')
    g.rect(3, 5, 9, 30, '#4a2e22')
    g.rect(14, 5, 9, 30, '#4a2e22')
    g.px(11, 20, '#c8a878')
    g.px(14, 20, '#c8a878')
    g.line(12, 5, 12, 34, '#2a1a14')
    hooks.door = [{ x: 13, y: 22 }]
  })
}

/** A shelf of creepy-cute dolls. */
export function dollShelf(): HubProp {
  return hprop('ghost:dollshelf', 34, 26, 17, 25, (g) => {
    g.rect(0, 8, 34, 2, '#6e4a35')
    g.rect(0, 20, 34, 2, '#6e4a35')
    g.rect(1, 10, 2, 16, '#5a3a2a')
    g.rect(31, 10, 2, 16, '#5a3a2a')
    for (const [x, y, c] of [
      [6, 8, '#ff9fc0'],
      [16, 8, '#9fd0ff'],
      [26, 8, '#ffd23f'],
      [10, 20, '#c8a0ff'],
      [23, 20, '#fffaf0'],
    ] as const) {
      g.rect(x - 2, y - 5, 5, 5, c)
      g.circle(x, y - 7, 2.5, '#f0d8c0')
      g.px(x - 1, y - 7, INK)
      g.px(x + 1, y - 7, INK)
    }
  })
}

/** A gravestone (rounded top, a few scratches). */
export function gravestone(v: number): HubProp {
  return hprop(`ghost:grave:${v}`, 16, 20, 8, 19, (g) => {
    g.rect(2, 6, 12, 14, '#6a6a78')
    g.circle(8, 6, 6, '#6a6a78')
    g.rect(2, 6, 3, 14, '#7a7a88')
    g.hline(5, 11, 8, '#4a4a58')
    g.hline(5, 10, 11, '#4a4a58')
    g.hline(6, 9, 14, '#4a4a58')
    if (v % 2) g.px(12, 3, '#3a6a3a')
    g.rect(0, 18, 16, 2, '#3a3a2a')
  })
}

/** A coffin standing on end, lid ajar. */
export function coffin(): HubProp {
  return hprop('ghost:coffin', 18, 34, 9, 33, (g) => {
    g.poly([[4, 0], [14, 0], [17, 8], [13, 33], [5, 33], [1, 8]], '#5a3a2a')
    g.poly([[5, 2], [13, 2], [15, 8], [12, 31], [6, 31], [3, 8]], '#6e4a35')
    g.vline(9, 8, 22, '#e8e0d4')
    g.hline(6, 12, 12, '#e8e0d4')
  })
}

/** Candle stand (the flame is lit by the map's lights). */
export function ghostCandle(): HubProp {
  return hprop('ghost:candle', 8, 18, 4, 17, (g) => {
    g.rect(3, 6, 2, 10, '#fff6d0')
    g.px(3, 5, '#ffd23f')
    g.px(4, 4, '#ff9a3a')
    g.rect(1, 16, 6, 2, '#8a8480')
  })
}

/** Mae Nak's kitchen table with a mortar and a basket of limes. */
export function nakTable(): HubProp {
  return hprop('ghost:naktable', 30, 18, 15, 17, (g) => {
    g.rect(1, 6, 28, 3, '#8a5a3a')
    g.rect(3, 9, 2, 9, '#6e4a35')
    g.rect(25, 9, 2, 9, '#6e4a35')
    g.rect(6, 1, 7, 5, '#8a8480')
    g.rect(7, 0, 5, 2, '#5a5a64')
    g.ellipse(21, 4, 5, 2.5, '#c9a06a')
    for (const x of [18, 21, 24]) g.circle(x, 3, 1.5, '#8ad060')
  })
}

// ---------------------------------------------------------------------------
// The ghosts (drawn every frame by the map). `k` = pop-out progress 0..1.

/** A shy sheet ghost floating up. */
export function drawSheetGhost(g: Surface, x: number, y: number, k: number, t: number) {
  const Y = Math.round(y - k * 14)
  const X = Math.round(x + Math.sin(t * 5) * 2)
  g.alpha(0.94)
  g.circle(X, Y - 10, 8, '#fffaf0')
  g.rect(X - 8, Y - 10, 17, 14, '#fffaf0')
  for (let i = 0; i < 5; i++) g.circle(X - 6 + i * 3, Y + 4 + ((i + Math.floor(t * 8)) % 2), 2, '#fffaf0')
  g.alpha(1)
  g.px(X - 3, Y - 11, INK)
  g.px(X + 3, Y - 11, INK)
  g.rect(X - 1, Y - 7, 3, 3, INK)
  g.px(X - 5, Y - 8, '#ff9fc0')
  g.px(X + 5, Y - 8, '#ff9fc0')
}

/** The smiling doll: its head turns right round. */
export function drawDollGhost(g: Surface, x: number, y: number, k: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y - k * 4)
  g.rect(X - 4, Y - 8, 9, 9, '#ff9fc0')
  g.rect(X - 4, Y - 8, 9, 2, '#ffb0d0')
  const turn = Math.sin(t * 9) * k
  g.circle(X + Math.round(turn * 2), Y - 13, 5, '#f0d8c0')
  g.rect(X - 5 + Math.round(turn * 2), Y - 19, 11, 3, '#3a2030')
  const glow = Math.floor(t * 8) % 2 ? '#ff3a5a' : '#ff8a9a'
  g.px(X - 2 + Math.round(turn * 3), Y - 13, k > 0.5 ? glow : INK)
  g.px(X + 2 + Math.round(turn * 3), Y - 13, k > 0.5 ? glow : INK)
  g.hline(X - 2 + Math.round(turn * 3), X + 2 + Math.round(turn * 3), Y - 10, '#c84a5a')
}

/** A skeleton doing ramwong (arms flick between the two steps). */
export function drawSkeleton(g: Surface, x: number, y: number, k: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y + (1 - k) * 12)
  const b = '#f0ece0'
  const step = Math.floor(t * 3) % 2
  g.circle(X, Y - 26, 5, b)
  g.px(X - 2, Y - 27, INK)
  g.px(X + 2, Y - 27, INK)
  g.hline(X - 2, X + 2, Y - 23, INK)
  g.vline(X, Y - 21, Y - 10, b)
  for (let i = 0; i < 3; i++) g.hline(X - 3, X + 3, Y - 19 + i * 3, b)
  // Arms in a ramwong gesture.
  g.line(X, Y - 19, X + (step ? -6 : 6), Y - 26, b)
  g.line(X + (step ? -6 : 6), Y - 26, X + (step ? -4 : 4), Y - 30, b)
  g.line(X, Y - 18, X + (step ? 6 : -6), Y - 14, b)
  g.line(X, Y - 10, X - 4, Y, b)
  g.line(X, Y - 10, X + 4 + step, Y, b)
  g.rect(X - 3, Y - 11, 7, 2, b)
}

/** The krahang flapping its winnowing-basket wings. */
export function drawKrahang(g: Surface, x: number, y: number, k: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y - Math.sin(t * 4) * 3)
  const flap = Math.sin(t * 14)
  for (const s of [-1, 1] as const) {
    const wx = X + s * 11
    const wy = Y - 16 - Math.round(flap * 4)
    g.ellipse(wx, wy, 8, 5 + flap, '#c9a06a')
    g.ellipse(wx, wy, 6, 3.6 + flap, '#e0c080')
    for (let i = -5; i <= 5; i += 3) g.px(wx + i, wy, '#a8804e')
  }
  g.circle(X, Y - 22, 4, '#f0bd90')
  g.rect(X - 4, Y - 26, 9, 2, '#3a2a2a')
  g.px(X - 2, Y - 22, INK)
  g.px(X + 2, Y - 22, INK)
  g.rect(X - 4, Y - 18, 9, 9, '#8a2335')
  g.rect(X - 3, Y - 9, 3, 4, '#f0bd90')
  g.rect(X + 1, Y - 9, 3, 4, '#f0bd90')
  void k
}

/** Mae Nak's arm reaching down from the window for a dropped lime. */
export function drawNakArm(g: Surface, x: number, y0: number, len: number, t: number) {
  const X = Math.round(x + Math.sin(t * 2) * 1.5)
  const Y1 = Math.round(y0 + len)
  g.rect(X - 2, y0, 4, Y1 - y0, '#e8c8a8')
  g.vline(X - 2, y0, Y1, '#d0a888')
  g.rect(X - 3, y0, 6, 6, '#3a2a48')
  // The hand, fingers spread.
  g.rect(X - 3, Y1, 7, 4, '#e8c8a8')
  for (let i = 0; i < 4; i++) g.vline(X - 3 + i * 2, Y1 + 4, Y1 + 7, '#e8c8a8')
}

/** A hopping jiangshi with a paper talisman. `hop` 0..1 of the current hop. */
export function drawJiangshi(g: Surface, x: number, y: number, hop: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y - Math.sin(hop * Math.PI) * 8)
  g.rect(X - 5, Y - 18, 11, 16, '#3d63b5')
  g.rect(X - 5, Y - 18, 11, 2, '#ffd23f')
  g.rect(X - 4, Y - 2, 4, 2, INK)
  g.rect(X + 1, Y - 2, 4, 2, INK)
  // Arms straight out.
  g.rect(X - 5, Y - 16, 14, 3, '#3d63b5')
  g.rect(X + 9, Y - 16, 3, 3, '#c8e8c0')
  g.circle(X, Y - 23, 5, '#c8e8c0')
  g.rect(X - 5, Y - 30, 11, 4, '#2a2a3a')
  g.rect(X - 1, Y - 26, 3, 6, '#ffd23f')
  g.px(X, Y - 25, '#e8514a')
  g.px(X, Y - 23, '#e8514a')
  g.px(X - 3, Y - 22, INK)
  g.px(X + 3, Y - 22, INK)
  void t
}

/** Drifting ground fog (alpha blobs). */
export function drawFog(g: Surface, x0: number, y0: number, w: number, h: number, t: number) {
  g.alpha(0.12)
  for (let i = 0; i < 10; i++) {
    const x = x0 + ((i * 53 + t * (6 + (i % 3) * 3)) % (w + 40)) - 20
    const y = y0 + ((i * 37) % h)
    g.ellipse(x, y, 18 + (i % 4) * 4, 4, '#c8c0e0')
  }
  g.alpha(1)
}
