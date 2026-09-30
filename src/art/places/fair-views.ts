// Distant views of the night fair for the ride scenes (seen from a ferris
// wheel gondola, whirling past the carousel): a baked panorama (temple with
// its lit roof, rows of booths, carts, the tree line and the town's lights)
// plus live layers (chasing bulb strings, a milling crowd).

import { bake, type Color, type Surface } from '../../engine/pixel'
import { cached } from '../../engine/sprite'
import { BULBS } from './fair'
import { hsh, INK, mix } from './hub-kit'

export const PANO_W = 440
export const PANO_H = 210

/** A small multi-tier ubosot with a lit door (anchor: bottom centre). */
export function drawMiniTemple(g: Surface, cx: number, gy: number, s = 1) {
  const w = 60 * s
  const roofC = '#e8763a'
  const roofD = '#b8542a'
  g.rect(cx - w / 2, gy - 22 * s, w, 22 * s, '#f0e8dc')
  for (let i = 0; i < 5; i++) g.rect(cx - w / 2 + 6 * s + i * 11 * s, gy - 18 * s, 4 * s, 10 * s, '#ffcf6a')
  g.rect(cx - 5 * s, gy - 16 * s, 10 * s, 16 * s, '#ffd98a')
  for (let k = 0; k < 3; k++) {
    const top = gy - (44 + k * 10) * s
    const half = (w / 2 + 6 * s) * (1 - k * 0.22)
    g.poly([[cx - half, top + 22 * s], [cx, top], [cx + half, top + 22 * s]], k % 2 ? roofD : roofC)
    g.line(cx - half, top + 22 * s, cx, top, '#ffd54f')
    g.line(cx + half, top + 22 * s, cx, top, '#ffd54f')
  }
  g.poly([[cx - 10 * s, gy - 60 * s], [cx, gy - 78 * s], [cx + 10 * s, gy - 60 * s]], '#3d63b5')
  g.vline(cx, gy - 84 * s, gy - 76 * s, '#ffd54f')
  g.rect(cx - w / 2 - 4 * s, gy - 2 * s, w + 8 * s, 2 * s, '#bdb2ae')
}

/** The baked far view of the fair (PANO_W × PANO_H). */
export function panoramaBase(): HTMLCanvasElement {
  return cached('fair:pano', () => {
    const c = bake(PANO_W, PANO_H, (g) => {
      // Distant hills and the town.
      g.rect(0, 0, PANO_W, PANO_H, '#1c1c3a')
      for (let x = 0; x < PANO_W; x++) {
        const h = 16 + Math.sin(x * 0.03) * 6 + Math.sin(x * 0.11) * 3
        g.vline(x, 34 - h, 60, '#20284a')
      }
      for (let i = 0; i < 90; i++) {
        const v = hsh(i, 2, 7)
        g.px(v % PANO_W, 26 + ((v >> 3) % 20), i % 5 ? '#ffd98a' : '#ff9a7a')
      }
      // Tree line behind the temple grounds.
      for (let x = 0; x < PANO_W; x += 3) g.circle(x, 58 + Math.sin(x * 0.2) * 2, 6 + (x % 5), x % 2 ? '#1e3a34' : '#244238')
      // The grounds.
      g.rect(0, 62, PANO_W, PANO_H - 62, '#3a3446')
      for (let i = 0; i < 400; i++) {
        const v = hsh(i, 9, 1)
        g.px(v % PANO_W, 62 + ((v >> 4) % (PANO_H - 62)), '#443e52')
      }
      // Paths.
      g.rect(0, 118, PANO_W, 8, '#4a4458')
      g.rect(0, 166, PANO_W, 8, '#4a4458')
      g.rect(200, 62, 30, PANO_H - 62, '#4a4458')
      // The temple on its lawn.
      g.rect(150, 62, 130, 52, '#2c4a36')
      drawMiniTemple(g, 215, 110, 1)
      // Rows of booths (striped roofs, lit fronts).
      const booth = (x: number, y: number, col: Color, w = 22) => {
        g.rect(x, y - 10, w, 10, '#2a2238')
        g.rect(x + 2, y - 8, w - 4, 6, mix(col, '#fff6c8', 0.55))
        for (let i = 0; i < w; i += 4) g.rect(x + i, y - 14, 4, 4, (i / 4) % 2 ? col : '#fffaf0')
        g.rect(x, y - 2, w, 2, mix(col, INK, 0.3))
      }
      const cols = ['#e8514a', '#3d63b5', '#43905a', '#6a4fb0', '#2a9ac8', '#f58f35']
      for (let i = 0; i < 16; i++) {
        const x = 8 + i * 27
        if (x > 136 && x < 290) continue
        booth(x, 144, cols[i % cols.length])
      }
      for (let i = 0; i < 16; i++) booth(4 + i * 27, 196, cols[(i + 2) % cols.length], 20)
      // Food carts with parasols.
      for (let i = 0; i < 9; i++) {
        const x = 150 + i * 16
        g.rect(x, 158, 10, 6, cols[(i + 3) % cols.length])
        g.rect(x - 2, 150, 14, 3, i % 2 ? '#fffaf0' : '#ff9fc0')
        g.px(x + 4, 156, '#fff3a6')
      }
      // The ramwong floor and the likay stage.
      g.ellipse(360, 102, 26, 9, '#7a4a2e')
      g.ellipse(360, 102, 22, 7, '#a86a3e')
      g.rect(40, 80, 50, 24, '#2a3a6a')
      g.rect(40, 76, 50, 4, '#c8343f')
      g.rect(36, 104, 58, 6, '#6a4a3a')
      g.circle(78, 88, 3, '#fff6c8')
    })
    return { canvas: c, w: PANO_W, h: PANO_H }
  }).canvas as HTMLCanvasElement
}

/** Bulb strings, lit stages and a crowd milling about over the panorama at (x, y). */
export function drawPanoramaLive(g: Surface, x: number, y: number, t: number) {
  const strings: [number, number, number, number][] = [
    [0, 112, PANO_W, 112],
    [0, 160, PANO_W, 160],
    [0, 190, PANO_W, 190],
  ]
  strings.forEach(([x0, y0, x1], k) => {
    for (let i = 0; i < 44; i++) {
      const f = i / 43
      const bx = x + x0 + (x1 - x0) * f
      const by = y + y0 + Math.sin(f * Math.PI * 6) * 2
      const on = (Math.floor(t * 5) + i + k) % 3 !== 0
      if (on) g.px(Math.round(bx), Math.round(by), BULBS[(i + k) % BULBS.length])
    }
  })
  // The crowd: little heads drifting along the paths.
  for (let i = 0; i < 70; i++) {
    const v = hsh(i, 4, 11)
    const lane = [121, 169, 140, 186][i % 4]
    const sp = 2 + (v % 7)
    const px = (((v % PANO_W) + (i % 2 ? t * sp : -t * sp)) % PANO_W + PANO_W) % PANO_W
    const X = Math.round(x + px)
    const Y = Math.round(y + lane + ((v >> 5) % 3))
    g.px(X, Y - 1, ['#3a2a2a', '#5a3a2a', '#2a2a3a'][v % 3])
    g.px(X, Y, ['#e8514a', '#5a8de0', '#fffaf0', '#6cc36a', '#ffd23f'][v % 5])
  }
  // Stage lights.
  if (Math.floor(t * 2) % 2) g.px(Math.round(x + 78), Math.round(y + 88), '#ffffff')
}
