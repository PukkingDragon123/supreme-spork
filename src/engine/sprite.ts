import { createCanvas, type Color } from './pixel'

// Sprites are authored as arrays of strings. Each character is a palette key;
// '.' and ' ' are transparent. This keeps every piece of art in code, easy to
// tweak and recolour without an image pipeline.

export type Palette = Record<string, Color>

export interface Sprite {
  canvas: HTMLCanvasElement
  w: number
  h: number
}

export interface SpriteOptions {
  /** Colour of an auto-generated 1px outline around opaque pixels. */
  outline?: Color
  /** Also outline diagonally (thicker, rounder look). */
  outlineCorners?: boolean
}

export function gridSize(rows: string[]): [number, number] {
  return [rows.reduce((m, r) => Math.max(m, r.length), 0), rows.length]
}

/** Create a sprite from rows + palette. Outline adds a 1px margin on all sides. */
export function makeSprite(rows: string[], pal: Palette, opts: SpriteOptions = {}): Sprite {
  const [gw, gh] = gridSize(rows)
  const pad = opts.outline ? 1 : 0
  const w = gw + pad * 2
  const h = gh + pad * 2
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  const solid = new Uint8Array(w * h)
  for (let y = 0; y < gh; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const k = row[x]
      if (k === '.' || k === ' ') continue
      const c = pal[k]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(x + pad, y + pad, 1, 1)
      solid[(y + pad) * w + x + pad] = 1
    }
  }
  if (opts.outline) addOutline(ctx, solid, w, h, opts.outline, opts.outlineCorners ?? false)
  return { canvas, w, h }
}

function addOutline(
  ctx: CanvasRenderingContext2D,
  solid: Uint8Array,
  w: number,
  h: number,
  color: Color,
  corners: boolean,
) {
  ctx.fillStyle = color
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x] === 1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (solid[y * w + x]) continue
      let edge = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)
      if (!edge && corners) edge = at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1)
      if (edge) ctx.fillRect(x, y, 1, 1)
    }
  }
}

/** Outline an existing canvas (e.g. a composited avatar) into a new sprite. */
export function outlineCanvas(src: HTMLCanvasElement, color: Color, corners = false): Sprite {
  const w = src.width + 2
  const h = src.height + 2
  const canvas = createCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 1, 1)
  const data = ctx.getImageData(0, 0, w, h).data
  const solid = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3] > 20 ? 1 : 0
  addOutline(ctx, solid, w, h, color, corners)
  return { canvas, w, h }
}

const cache = new Map<string, Sprite>()

/** Memoised sprite creation keyed by a caller supplied id. */
export function cached(key: string, build: () => Sprite): Sprite {
  let s = cache.get(key)
  if (!s) {
    s = build()
    cache.set(key, s)
  }
  return s
}

export function clearSpriteCache(prefix?: string) {
  if (!prefix) return cache.clear()
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k)
}

/** Paint rows onto an existing 2D context at an offset (used for layering). */
export function paintRows(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  pal: Palette,
  ox = 0,
  oy = 0,
  flip = false,
  width?: number,
) {
  const [gw] = gridSize(rows)
  const fw = width ?? gw
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]
    for (let x = 0; x < row.length; x++) {
      const k = row[x]
      if (k === '.' || k === ' ') continue
      const c = pal[k]
      if (!c) continue
      ctx.fillStyle = c
      ctx.fillRect(ox + (flip ? fw - 1 - x : x), oy + y, 1, 1)
    }
  }
}

/** Mirror a sprite horizontally (cached by the caller). */
export function flipSprite(s: Sprite): Sprite {
  const canvas = createCanvas(s.w, s.h)
  const ctx = canvas.getContext('2d')!
  ctx.translate(s.w, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(s.canvas, 0, 0)
  return { canvas, w: s.w, h: s.h }
}

/** Scale a sprite by an integer factor into a data URL for use in the DOM. */
export function spriteDataUrl(s: Sprite, scale = 1): string {
  if (scale === 1) return s.canvas.toDataURL()
  const c = createCanvas(s.w * scale, s.h * scale)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(s.canvas, 0, 0, s.w * scale, s.h * scale)
  return c.toDataURL()
}
