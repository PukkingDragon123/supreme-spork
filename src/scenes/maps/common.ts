// Shared ground painting helpers for area maps.

import { ditherOn, type Surface } from '../../engine/pixel'
import { P } from '../../art/palette'

export function grass(g: Surface, x: number, y: number, w: number, h: number, seed = 0) {
  g.rect(x, y, w, h, P.grass)
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const X = x + i
      const Y = y + j
      const n = (X * 73856093) ^ (Y * 19349663) ^ seed
      const v = ((n >>> 0) % 97) / 97
      if (v < 0.06) g.px(X, Y, P.grassD)
      else if (v > 0.965) g.px(X, Y, P.grassL)
    }
  // Grass tufts and tiny flowers.
  for (let i = 0; i < (w * h) / 160; i++) {
    const n = ((i + 1) * 2654435761 + seed * 97) >>> 0
    const X = x + (n % w)
    const Y = y + ((n >>> 8) % h)
    g.px(X, Y, P.grassD)
    g.px(X + 1, Y - 1, P.grassD)
    g.px(X + 2, Y, P.grassD)
    if (i % 7 === 0) {
      const c = [P.white, P.pink, P.yellow][i % 3]
      g.px(X + 5, Y - 2, c)
    }
  }
}

export function stoneTiles(g: Surface, x: number, y: number, w: number, h: number, size = 8) {
  g.rect(x, y, w, h, P.stoneL)
  for (let j = 0; j < h; j += size) {
    const off = (j / size) % 2 ? size / 2 : 0
    g.hline(x, x + w - 1, y + j, '#d2c9c3')
    for (let i = -off; i < w; i += size) if (i >= 0) g.vline(x + i, y + j, Math.min(y + h - 1, y + j + size - 1), '#d2c9c3')
  }
  g.frame(x, y, w, h, P.stone)
}

export function slabPath(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, P.stoneL)
  for (let j = 0; j < h; j += 10) {
    g.hline(x, x + w - 1, y + j, '#d2c9c3')
    const mid = x + ((j / 10) % 2 ? Math.floor(w / 3) : Math.floor((2 * w) / 3))
    g.vline(mid, y + j, Math.min(y + h - 1, y + j + 9), '#d2c9c3')
  }
  g.vline(x, y, y + h - 1, P.stone)
  g.vline(x + w - 1, y, y + h - 1, P.stone)
}

export function steppingStones(g: Surface, pts: [number, number][]) {
  for (const [x, y] of pts) {
    g.ellipse(x, y + 1, 4, 2.2, P.stoneD)
    g.ellipse(x, y, 4, 2.2, P.stoneL)
    g.px(x - 2, y - 1, '#ffffff')
  }
}

/** Organic pond from a union of ellipses. Returns the ellipses for collision. */
export function pond(g: Surface, blobs: [number, number, number, number][], deep = P.waterD, mid = P.water, shallow = P.waterL) {
  // Rim stones.
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy, rx + 3, ry + 3, P.stone)
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy + 1, rx + 2, ry + 2, P.stoneD)
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy, rx + 1, ry + 1, '#5a9ab8')
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy, rx, ry, shallow)
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy, rx - 3, ry - 2, mid)
  for (const [cx, cy, rx, ry] of blobs) g.ellipse(cx, cy + 1, rx - 8, ry - 6, deep)
  // Rim highlight stones.
  for (const [cx, cy, rx, ry] of blobs) {
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const x = cx + Math.cos(a) * (rx + 2.5)
      const y = cy + Math.sin(a) * (ry + 2.5)
      g.px(x, y, P.stoneL)
    }
  }
}

export function road(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#6d6478')
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) if (ditherOn(x + i, y + j, 0.06) && ((x + i) * 7 + (y + j) * 3) % 5 === 0) g.px(x + i, y + j, '#7d7488')
  const mid = y + Math.floor(h / 2)
  for (let i = x + 2; i < x + w; i += 16) g.rect(i, mid, 8, 2, '#f0e6d6')
}

export function sidewalk(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#d9d2cc')
  for (let j = 0; j < h; j += 6) g.hline(x, x + w - 1, y + j, '#c6bdb8')
  for (let j = 0; j < h; j += 6) for (let i = (j / 6) % 2 ? 0 : 6; i < w; i += 12) g.vline(x + i, y + j, Math.min(y + h - 1, y + j + 5), '#c6bdb8')
}

export function treeLine(g: Surface, y: number, w: number, color = P.leafD, light = P.leaf) {
  for (let x = -6; x < w + 8; x += 11) {
    const r = 9 + ((x * 7) % 5)
    g.circle(x, y + ((x * 13) % 6), r, color)
  }
  for (let x = 0; x < w + 8; x += 13) {
    const r = 6 + ((x * 3) % 4)
    g.circle(x - 3, y - 2 + ((x * 11) % 5), r, light)
  }
  g.rect(0, y + 4, w, 12, color)
}

export function mat(g: Surface, x: number, y: number, w: number, h: number) {
  g.rect(x, y, w, h, '#e0bb8a')
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) if ((i + j * 2) % 4 === 0) g.px(x + i, y + j, '#c9a06a')
  g.frame(x, y, w, h, '#b8844a')
  g.hline(x + 2, x + w - 3, y + 2, '#e8514a')
  g.hline(x + 2, x + w - 3, y + h - 3, '#e8514a')
}

/** Thin pole used to anchor bunting strings. */
export function pole(g: Surface, x: number, y: number, h: number) {
  g.rect(x, y - h, 2, h, '#9a6a45')
  g.px(x, y - h - 1, P.gold)
  g.px(x + 1, y - h - 1, P.gold)
}
