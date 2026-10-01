// Selective ("coloured") outline for character sprites: instead of one ink
// colour all round, each outline pixel is a deep shade of the fill it hugs,
// a touch lighter on the lit top-left edges and darker bottom-right. Reads
// cleaner and softer than a uniform black line, like modern pixel RPGs.

import { createCanvas } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'

const INK = [42, 26, 44] as const

/** Outline colour for a fill: mixed toward ink, more on the shaded side. */
export function outlineFor(r: number, g: number, b: number, shade: number): [number, number, number] {
  // keep some of the hue, drop the value; very light fills still get a firm line
  const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255
  const k = Math.min(0.92, shade + lum * 0.18)
  return [Math.round(r + (INK[0] - r) * k), Math.round(g + (INK[1] - g) * k), Math.round(b + (INK[2] - b) * k)]
}

/**
 * Outline a sprite canvas (1px border added). `lit`/`dark` set how far the
 * outline is pushed toward ink on the light (top/left) and shadow sides.
 */
export function softOutline(src: HTMLCanvasElement, lit = 0.62, dark = 0.78): Sprite {
  const w = src.width + 2
  const h = src.height + 2
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 1, 1)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 20
  const out = new Uint8ClampedArray(d)
  // neighbours: below/right first means the line takes the colour of what it wraps
  const N: [number, number, number][] = [
    [0, 1, lit], // pixel below → we're on its top edge (lit)
    [1, 0, lit], // pixel right → left edge (lit)
    [0, -1, dark], // pixel above → bottom edge
    [-1, 0, dark], // pixel left → right edge
  ]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue
      let rs = 0
      let gs = 0
      let bs = 0
      let ks = 0
      let n = 0
      for (const [dx, dy, k] of N) {
        if (!solid(x + dx, y + dy)) continue
        const i = ((y + dy) * w + x + dx) * 4
        rs += d[i]
        gs += d[i + 1]
        bs += d[i + 2]
        ks += k
        n++
      }
      if (!n) continue
      const [r, g, b] = outlineFor(rs / n, gs / n, bs / n, ks / n)
      const o = (y * w + x) * 4
      out[o] = r
      out[o + 1] = g
      out[o + 2] = b
      out[o + 3] = 255
    }
  }
  img.data.set(out)
  ctx.putImageData(img, 0, 0)
  return { canvas, w, h }
}
