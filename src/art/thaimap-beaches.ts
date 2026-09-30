// Thailand-map pin icons for the beaches. Same 22×22 icon box as the
// landmark and hub pins (may poke 3 px above), styled as beaches: a strip
// of turquoise sea with a foam line, golden sand, a striped beach umbrella
// on every pin and the beach's own landmark. The map scene adds a little
// sun badge (drawBeachBadge) on the selected / current beach.

import type { Surface } from '../engine/pixel'

function sea(g: Surface, andaman = false) {
  g.ellipse(11, 19.5, 10.5, 2.8, '#e8c888')
  g.ellipse(11, 19, 10, 2.2, '#f4e6c4')
  g.rect(0, 12, 22, 5, andaman ? '#2fb3c8' : '#4ea8d8')
  g.hline(0, 21, 12, andaman ? '#7ae0e0' : '#8fd6f4')
  for (let x = 0; x < 22; x++) g.px(x, 16 + (x % 4 === 0 ? 1 : 0), '#f4fffc')
}

/** Striped beach umbrella: canopy centred at x, top at y. */
function brolly(g: Surface, x: number, y: number, a: string, b: string) {
  for (let i = 0; i < 3; i++) {
    const half = 2 + i
    for (let k = -half; k <= half; k++) g.px(x + k, y + i, Math.floor((k + 10) / 2) % 2 ? a : b)
  }
  g.vline(x, y + 3, y + 8, '#8a8480')
}

function palm(g: Surface, x: number, y: number) {
  g.line(x, y, x + 1, y - 7, '#9a7456')
  for (const [dx, dy] of [[-4, 1], [-3, -2], [3, -2], [4, 1], [0, -3]] as [number, number][]) g.line(x + 1, y - 7, x + 1 + dx, y - 7 + dy, '#43905a')
}

export const BEACH_ICON_DRAW: Record<string, (g: Surface) => void> = {
  beach_bangsaen(g) {
    sea(g)
    // Khao Sam Muk headland with the red shrine.
    g.poly([[0, 13], [2, 3], [7, 1], [11, 7], [10, 13]], '#4a8a58')
    g.poly([[1, 13], [3, 4], [6, 3], [5, 13]], '#6aae64')
    g.rect(3, 8, 5, 4, '#c8343f')
    g.poly([[2, 8], [5, 5], [9, 8]], '#e8b040')
    g.px(4, 10, '#ffd88a')
    // A monkey with stolen sunglasses.
    g.rect(9, 10, 2, 2, '#a8876a')
    g.px(9, 9, '#2e2840')
    g.px(10, 9, '#2e2840')
    brolly(g, 16, 7, '#e8514a', '#fffaf0')
    // Rubber ring.
    g.circle(19, 17, 2, '#fffaf0')
    g.px(19, 17, '#e8c888')
  },
  beach_huahin(g) {
    sea(g)
    // Khao Takiap with the standing Buddha.
    g.poly([[12, 13], [15, 5], [19, 4], [22, 13]], '#3f7a4f')
    g.rect(17, 0, 2, 6, '#f4c542')
    g.px(17, -1, '#fff0a0')
    // The red-and-cream pavilion.
    g.rect(1, 9, 9, 5, '#fff1d6')
    g.poly([[0, 10], [5, 5], [10, 10]], '#c8343f')
    g.poly([[2, 7], [5, 3], [8, 7]], '#c8343f')
    g.rect(4, 11, 2, 3, '#8e2530')
    // A horse on the sand.
    g.rect(10, 16, 5, 2, '#8a5a3a')
    g.px(15, 15, '#8a5a3a')
    g.px(10, 18, '#5a3a2a')
    g.px(14, 18, '#5a3a2a')
    g.px(12, 15, '#e8514a')
    brolly(g, 19, 9, '#3d63b5', '#fffaf0')
  },
  beach_samila(g) {
    sea(g)
    // Cat and rat islands.
    g.ellipse(5, 12, 4, 2, '#3f7a4f')
    g.ellipse(11, 12, 2, 1.4, '#3f7a4f')
    // The golden mermaid on her rock.
    g.ellipse(15, 17, 5, 2, '#8a8494')
    g.line(13, 16, 17, 15, '#f4c542')
    g.line(17, 15, 19, 13, '#f4c542')
    g.line(13, 16, 13, 9, '#f4c542')
    g.circle(13, 8, 1.6, '#f4c542')
    g.line(12, 8, 11, 13, '#d49a2a')
    g.px(15, 7, '#fff0a0')
    // A casuarina.
    g.poly([[2, 16], [4, 6], [6, 16]], '#4a7a5a')
    g.vline(4, 16, 18, '#8a6a52')
    brolly(g, 20, 5, '#ffd23f', '#43905a')
  },
  beach_samui(g) {
    sea(g)
    // Koh Fan with the golden Big Buddha.
    g.ellipse(14, 12, 7, 2, '#f0e0bc')
    g.poly([[10, 12], [11, 6], [14, 2], [17, 6], [18, 12]], '#f4c542')
    g.poly([[10, 12], [11, 6], [14, 2], [13, 12]], '#fff0a0')
    g.px(14, 0, '#fff0a0')
    g.px(14, 1, '#f4c542')
    g.rect(13, 13, 2, 4, '#c8966a')
    palm(g, 3, 16)
    brolly(g, 6, 9, '#43b8a8', '#fffaf0')
  },
  beach_patong(g) {
    sea(g, true)
    // A parasail over the bay and a row of umbrellas.
    const cols = ['#e8514a', '#ffd23f', '#6cc36a', '#5aa9e8']
    for (let i = 0; i < 4; i++) g.rect(9 + i * 2, 0, 2, 2, cols[i])
    g.rect(10, 2, 6, 1, '#b37cf0')
    g.line(13, 3, 13, 6, '#fffaf0')
    g.px(13, 7, '#ff7a1a')
    g.line(13, 7, 5, 13, '#fffaf0')
    brolly(g, 5, 9, '#e8514a', '#fffaf0')
    brolly(g, 11, 10, '#3d63b5', '#fffaf0')
    brolly(g, 17, 9, '#ff6f91', '#fffaf0')
    palm(g, 21, 17)
  },
  beach_railay(g) {
    sea(g, true)
    // Limestone karst with jungle on top, a long-tail at the shore.
    g.poly([[0, 16], [1, 4], [4, 0], [8, 1], [9, 8], [8, 16]], '#d09a6a')
    g.poly([[1, 16], [2, 5], [4, 1], [5, 16]], '#e8b888')
    g.ellipse(5, 1, 4, 1.6, '#43905a')
    g.poly([[16, 13], [17, 7], [19, 5], [21, 8], [21, 13]], '#c08a5a')
    g.poly([[9, 15], [19, 15], [21, 12], [18, 17], [11, 17]], '#8a5a3a')
    g.px(21, 11, '#e8514a')
    g.px(20, 11, '#ffd23f')
    brolly(g, 13, 8, '#43b8a8', '#fffaf0')
  },
}

/** Little sun badge above a selected / current beach pin. */
export function drawBeachBadge(g: Surface, x: number, y0: number, t: number) {
  const X = Math.round(x)
  const Y = Math.round(y0 - 6 + (Math.sin(t * 2 + x) > 0.6 ? -1 : 0))
  g.circle(X, Y, 4.2, '#3a2838')
  g.circle(X, Y, 3.2, '#ffd23f')
  g.px(X - 1, Y - 1, '#fff6c2')
  const k = Math.floor(t * 3) % 2
  for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0]] as [number, number][]) g.px(X + dx * (k ? 1 : 0.8), Y + dy * (k ? 1 : 0.8), '#ffd23f')
  g.px(X, Y + 5, '#3a2838')
}
