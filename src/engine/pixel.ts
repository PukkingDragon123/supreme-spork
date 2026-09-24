// Low-level pixel drawing surface. Everything is drawn at "virtual" pixel
// resolution and scaled up by an integer factor with nearest-neighbour
// sampling, so every art pixel stays a crisp square on screen.

export type Color = string

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/** Bayer threshold (0..15) for a pixel; used for ordered dithering. */
export function bayer(x: number, y: number): number {
  return BAYER4[y & 3][x & 3]
}

/** True when a pixel should take the "second" colour at blend level t (0..1). */
export function ditherOn(x: number, y: number, t: number): boolean {
  return bayer(x, y) < t * 16
}

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w | 0)
  c.height = Math.max(1, h | 0)
  return c
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return '#' + c(r) + c(g) + c(b)
}

/** Linear mix of two hex colours. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export class Surface {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  /** Camera offset subtracted from world-space draw calls. */
  ox = 0
  oy = 0

  constructor(w: number, h: number, canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? createCanvas(w, h)
    this.canvas.width = w
    this.canvas.height = h
    this.w = w
    this.h = h
    const ctx = this.canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('2D canvas not supported')
    this.ctx = ctx
    this.ctx.imageSmoothingEnabled = false
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return
    this.canvas.width = w
    this.canvas.height = h
    this.w = w
    this.h = h
    this.ctx.imageSmoothingEnabled = false
  }

  clear(c?: Color) {
    if (c) {
      this.ctx.fillStyle = c
      this.ctx.fillRect(0, 0, this.w, this.h)
    } else this.ctx.clearRect(0, 0, this.w, this.h)
  }

  setCamera(x: number, y: number) {
    this.ox = Math.round(x)
    this.oy = Math.round(y)
  }

  px(x: number, y: number, c: Color) {
    this.ctx.fillStyle = c
    this.ctx.fillRect((x - this.ox) | 0, (y - this.oy) | 0, 1, 1)
  }

  rect(x: number, y: number, w: number, h: number, c: Color) {
    if (w <= 0 || h <= 0) return
    this.ctx.fillStyle = c
    this.ctx.fillRect(Math.round(x - this.ox), Math.round(y - this.oy), Math.round(w), Math.round(h))
  }

  /** Rectangle outline (1px). */
  frame(x: number, y: number, w: number, h: number, c: Color) {
    this.rect(x, y, w, 1, c)
    this.rect(x, y + h - 1, w, 1, c)
    this.rect(x, y, 1, h, c)
    this.rect(x + w - 1, y, 1, h, c)
  }

  hline(x1: number, x2: number, y: number, c: Color) {
    const a = Math.min(x1, x2)
    const b = Math.max(x1, x2)
    this.rect(a, y, b - a + 1, 1, c)
  }

  vline(x: number, y1: number, y2: number, c: Color) {
    const a = Math.min(y1, y2)
    const b = Math.max(y1, y2)
    this.rect(x, a, 1, b - a + 1, c)
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color) {
    x0 = Math.round(x0)
    y0 = Math.round(y0)
    x1 = Math.round(x1)
    y1 = Math.round(y1)
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (let i = 0; i < 2000; i++) {
      this.px(x0, y0, c)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  /** Line with thickness `w` (drawn as a chain of discs). */
  thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: Color) {
    if (w <= 1.2) return this.line(x0, y0, x1, y1, c)
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)))
    for (let i = 0; i <= n; i++) {
      const t = i / n
      this.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c)
    }
  }

  /** Filled pixel ellipse centred on (cx, cy). Works with half-pixel centres. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color) {
    if (rx <= 0 || ry <= 0) return
    const y0 = Math.floor(cy - ry)
    const y1 = Math.ceil(cy + ry)
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry
      if (Math.abs(dy) > 1) continue
      const half = rx * Math.sqrt(1 - dy * dy)
      const xa = Math.round(cx - half)
      const xb = Math.round(cx + half)
      if (xb > xa) this.rect(xa, y, xb - xa, 1, c)
    }
  }

  circle(cx: number, cy: number, r: number, c: Color) {
    this.ellipse(cx, cy, r, r, c)
  }

  /** Scanline polygon fill (even-odd). */
  poly(pts: [number, number][], c: Color) {
    if (pts.length < 3) return
    let minY = Infinity
    let maxY = -Infinity
    for (const [, y] of pts) {
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5
      const xs: number[] = []
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]
        const [bx, by] = pts[(i + 1) % pts.length]
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
          xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax))
        }
      }
      xs.sort((a, b) => a - b)
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i])
        const xb = Math.round(xs[i + 1])
        if (xb > xa) this.rect(xa, y, xb - xa, 1, c)
      }
    }
  }

  /** Ordered-dither fill of a rectangle: t=0 → all a, t=1 → all b. */
  dither(x: number, y: number, w: number, h: number, a: Color | null, b: Color, t: number) {
    x = Math.round(x)
    y = Math.round(y)
    if (a) this.rect(x, y, w, h, a)
    if (t <= 0) return
    this.ctx.fillStyle = b
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (ditherOn(x + i, y + j, t)) this.ctx.fillRect(x + i - this.ox, y + j - this.oy, 1, 1)
      }
    }
  }

  /**
   * Vertical gradient built from colour bands with dithered transitions –
   * the classic pixel-art sky.
   */
  gradientV(x: number, y: number, w: number, h: number, stops: Color[], ditherRows = 6) {
    if (stops.length === 1) return this.rect(x, y, w, h, stops[0])
    const band = h / (stops.length - 1)
    for (let j = 0; j < h; j++) {
      const f = j / band
      const i = Math.min(stops.length - 2, Math.floor(f))
      const local = (f - i) * band
      const edge = band - local
      const a = stops[i]
      const b = stops[i + 1]
      if (edge > ditherRows) {
        this.rect(x, y + j, w, 1, a)
      } else {
        const t = 1 - edge / ditherRows
        this.rect(x, y + j, w, 1, a)
        this.ctx.fillStyle = b
        for (let i2 = 0; i2 < w; i2++) {
          if (ditherOn(x + i2, y + j, t)) this.ctx.fillRect(x + i2 - this.ox, y + j - this.oy, 1, 1)
        }
      }
    }
  }

  /** Dithered disc – used for soft glows and shadows without blurring. */
  ditherCircle(cx: number, cy: number, r: number, c: Color, strength = 1, squash = 1) {
    const x0 = Math.floor(cx - r)
    const x1 = Math.ceil(cx + r)
    const y0 = Math.floor(cy - r * squash)
    const y1 = Math.ceil(cy + r * squash)
    this.ctx.fillStyle = c
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / r
        const dy = (y + 0.5 - cy) / (r * squash)
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > 1) continue
        const t = (1 - d) * strength * 1.4
        if (ditherOn(x, y, t)) this.ctx.fillRect(x - this.ox, y - this.oy, 1, 1)
      }
    }
  }

  draw(img: CanvasImageSource & { width: number; height: number }, x: number, y: number, flip = false) {
    const dx = Math.round(x - this.ox)
    const dy = Math.round(y - this.oy)
    if (!flip) {
      this.ctx.drawImage(img, dx, dy)
    } else {
      this.ctx.save()
      this.ctx.translate(dx + img.width, dy)
      this.ctx.scale(-1, 1)
      this.ctx.drawImage(img, 0, 0)
      this.ctx.restore()
    }
  }

  /** Draw an image region, optionally scaled by an integer factor. */
  drawPart(
    img: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    x: number,
    y: number,
    scale = 1,
  ) {
    this.ctx.drawImage(img, sx, sy, sw, sh, Math.round(x - this.ox), Math.round(y - this.oy), sw * scale, sh * scale)
  }

  drawScaled(img: HTMLCanvasElement, x: number, y: number, scale: number, flip = false) {
    const dx = Math.round(x - this.ox)
    const dy = Math.round(y - this.oy)
    const w = img.width * scale
    const h = img.height * scale
    if (!flip) this.ctx.drawImage(img, dx, dy, w, h)
    else {
      this.ctx.save()
      this.ctx.translate(dx + w, dy)
      this.ctx.scale(-1, 1)
      this.ctx.drawImage(img, 0, 0, w, h)
      this.ctx.restore()
    }
  }

  alpha(a: number) {
    this.ctx.globalAlpha = a
  }

  blend(op: GlobalCompositeOperation) {
    this.ctx.globalCompositeOperation = op
  }

  reset() {
    this.ctx.globalAlpha = 1
    this.ctx.globalCompositeOperation = 'source-over'
  }
}

/** Build a static layer once and reuse it every frame. */
export function bake(w: number, h: number, fn: (s: Surface) => void): HTMLCanvasElement {
  const s = new Surface(w, h)
  fn(s)
  return s.canvas
}
