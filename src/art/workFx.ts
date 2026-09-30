// Lighting and atmosphere layers for the job and kitchen scenes: slanted sun
// rays, drifting canopy dapple, a soft vignette, warm glows and a floor
// gloss streak. Baked once per size and composited with light blend modes.

import { bake, createCanvas, ditherOn, type Surface } from '../engine/pixel'

const bakes = new Map<string, HTMLCanvasElement>()
function once(key: string, make: () => HTMLCanvasElement) {
  let c = bakes.get(key)
  if (!c) {
    c = make()
    bakes.set(key, c)
    if (bakes.size > 40) bakes.delete(bakes.keys().next().value!)
  }
  return c
}

/** Slanted god-rays from the top-left (drawn with 'screen'). */
export function sunRays(g: Surface, w: number, h: number, t: number, color = '#fff2c4', strength = 0.22, top = 0) {
  const c = once(`rays:${w}:${h}:${color}`, () =>
    bake(w, h, (s) => {
      const ctx = s.ctx
      const beams = [
        [0.05, 18, 0.8],
        [0.28, 10, 0.55],
        [0.45, 24, 0.9],
        [0.72, 12, 0.6],
        [0.9, 16, 0.7],
      ]
      for (const [fx, bw, a] of beams) {
        const x0 = fx * w
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, color)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.globalAlpha = a
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(x0, 0)
        ctx.lineTo(x0 + bw, 0)
        ctx.lineTo(x0 + bw + h * 0.45, h)
        ctx.lineTo(x0 + h * 0.45, h)
        ctx.closePath()
        ctx.fill()
      }
    }),
  )
  const ctx = g.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = strength * (0.8 + Math.sin(t * 0.7) * 0.2)
  ctx.drawImage(c, Math.round(Math.sin(t * 0.25) * 4 - g.ox), Math.round(top - g.oy))
  ctx.restore()
}

/** Leaf shadows and light flecks drifting across the ground under a canopy. */
export function dapple(g: Surface, w: number, y0: number, y1: number, t: number, strength = 1) {
  const H = Math.max(1, Math.round(y1 - y0))
  const c = once(`dapple:${w}:${H}`, () =>
    bake(w + 40, H, (s) => {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < w + 40; x++) {
          const n = Math.sin(x * 0.13 + Math.sin(y * 0.09) * 2.2) + Math.cos(y * 0.11 - x * 0.04) + Math.sin((x + y) * 0.05) * 0.6
          if (n > 1.3 && ditherOn(x, y, 0.6)) s.px(x, y, 'rgba(255,250,215,0.6)')
          else if (n < -1.45 && ditherOn(x, y, 0.35)) s.px(x, y, 'rgba(60,90,70,0.1)')
        }
    }),
  )
  const ctx = g.ctx
  ctx.save()
  ctx.globalAlpha = strength
  ctx.drawImage(c, Math.round(-20 + Math.sin(t * 0.4) * 6 - g.ox), Math.round(y0 - g.oy))
  ctx.restore()
}

/** Soft dark vignette round the edges. */
export function vignette(g: Surface, w: number, h: number, strength = 0.35, color = '20,10,24') {
  const c = once(`vig:${w}:${h}:${color}`, () => {
    const cv = createCanvas(w, h)
    const ctx = cv.getContext('2d')!
    const grad = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.35, w / 2, h * 0.48, Math.max(w, h) * 0.72)
    grad.addColorStop(0, `rgba(${color},0)`)
    grad.addColorStop(1, `rgba(${color},1)`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    return cv
  })
  const ctx = g.ctx
  ctx.save()
  ctx.globalAlpha = strength
  ctx.drawImage(c, -g.ox, -g.oy)
  ctx.restore()
}

/** Additive radial glow. */
export function glow(g: Surface, x: number, y: number, r: number, strength: number, color = '#ffcf7a') {
  if (strength <= 0.01 || r < 1) return
  const R = Math.round(r)
  const c = once(`glow:${color}`, () => {
    const cv = createCanvas(64, 64)
    const ctx = cv.getContext('2d')!
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, color)
    grad.addColorStop(0.4, color + '88')
    grad.addColorStop(1, color + '00')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 64, 64)
    return cv
  })
  const ctx = g.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(1, strength)
  ctx.drawImage(c, Math.round(x - R - g.ox), Math.round(y - R - g.oy), R * 2, R * 2)
  ctx.restore()
}

/** A diagonal glossy glint sweeping across a region (polished floors, brass). */
export function glint(g: Surface, x: number, y: number, w: number, h: number, t: number, period = 3, strength = 0.35) {
  const ph = (t % period) / period
  const bx = x - h + ph * (w + h * 2)
  const ctx = g.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = strength
  ctx.fillStyle = '#ffffff'
  for (let yy = 0; yy < h; yy += 1) {
    const xx = Math.round(bx + yy * 0.7 - g.ox)
    ctx.fillRect(xx, Math.round(y + yy - g.oy), 3, 1)
    if (yy % 2 === 0) ctx.fillRect(xx + 6, Math.round(y + yy - g.oy), 1, 1)
  }
  ctx.restore()
}

/** Floating dust motes lit by the sun (deterministic, time-driven). */
export function motes(g: Surface, w: number, y0: number, y1: number, t: number, n = 14, color = '#fff6d0') {
  for (let i = 0; i < n; i++) {
    const s = i * 97.13
    const x = ((s * 13.7 + t * (4 + (i % 3) * 2)) % (w + 20)) - 10
    const y = y0 + ((s * 7.3) % (y1 - y0)) + Math.sin(t * 0.9 + i) * 4
    const tw = Math.sin(t * 2.3 + i * 1.7)
    if (tw < -0.2) continue
    g.alpha(0.4 + tw * 0.4)
    g.px(Math.round(x), Math.round(y), color)
    g.alpha(1)
  }
}
