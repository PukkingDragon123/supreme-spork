// Sky gradients and time-of-day lighting shared by every scene.

import { bake, ditherOn, type Surface } from '../engine/pixel'
import type { Phase } from '../game/time'
import { hourOf, phaseAt } from '../game/time'
import { game } from '../game/state'

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export interface SkyStyle {
  stops: string[]
  tint: string | null
  tintAlpha: number
  /** 0..1 how strongly artificial lights glow. */
  lights: number
  stars: boolean
  sun: string | null
  moon: boolean
  cloud: string
}

export const SKY: Record<Phase, SkyStyle> = {
  dawn: { stops: ['#6e6bb8', '#c98fc0', '#ffb7a8', '#ffe0b0'], tint: '#ffd4c4', tintAlpha: 0.28, lights: 0.35, stars: false, sun: '#fff0b8', moon: false, cloud: '#ffd6dc' },
  day: { stops: ['#78c4ff', '#a0d8ff', '#c8ecff', '#e6f7ff'], tint: null, tintAlpha: 0, lights: 0, stars: false, sun: '#fffbe0', moon: false, cloud: '#ffffff' },
  golden: { stops: ['#7aa0e0', '#c9a4d8', '#ffc08a', '#ffe2a0'], tint: '#ffcf99', tintAlpha: 0.32, lights: 0.25, stars: false, sun: '#fff0a0', moon: false, cloud: '#ffe6c4' },
  dusk: { stops: ['#3c3a78', '#7a5a9e', '#d97a98', '#ffa47e'], tint: '#a58ad0', tintAlpha: 0.55, lights: 0.75, stars: true, sun: null, moon: true, cloud: '#c9a0c8' },
  night: { stops: ['#12143a', '#1f2358', '#2e3a78', '#3e4c8c'], tint: '#3a3f96', tintAlpha: 0.72, lights: 1, stars: true, sun: null, moon: true, cloud: '#46508a' },
}

/** Current phase, honouring the time override in settings. */
let devPhase: Phase | null | undefined
/** Dev only: ?phase=dawn|day|golden|dusk|night forces the time of day. */
function forcedPhase(): Phase | null {
  if (devPhase !== undefined) return devPhase
  devPhase = null
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search).get('phase')
    if (q && q in SKY) devPhase = q as Phase
  }
  return devPhase
}

export function currentPhase(): Phase {
  const f = forcedPhase()
  if (f) return f
  const t = game.value.settings.time
  if (t !== 'real') return t
  return phaseAt(hourOf())
}

const gradCache = new Map<string, HTMLCanvasElement>()

export function drawSky(g: Surface, x: number, y: number, w: number, h: number, phase: Phase, time: number) {
  const s = SKY[phase]
  const key = `${phase}:${w}:${h}`
  let grad = gradCache.get(key)
  if (!grad) {
    grad = bake(w, h, (b) => b.gradientV(0, 0, w, h, s.stops, 5))
    gradCache.set(key, grad)
  }
  g.draw(grad, x, y)
  if (s.stars) {
    for (let i = 0; i < 40; i++) {
      const sx = x + ((i * 97) % w)
      const sy = y + ((i * 53) % Math.max(1, h - 6))
      const tw = Math.sin(time * 2 + i) > 0.3
      if (tw) g.px(sx, sy, i % 5 === 0 ? '#fff3a6' : '#e2e8ff')
    }
  }
  if (s.moon) {
    const mx = x + w - 34
    const my = y + 8
    g.circle(mx, my, 6, '#fff6c8')
    g.circle(mx + 2.5, my - 1.5, 5, s.stops[0])
    g.px(mx - 3, my + 1, '#ffe89a')
  }
  if (s.sun) {
    const sx = phase === 'dawn' ? x + 26 : phase === 'golden' ? x + w - 30 : x + w - 40
    const sy = phase === 'day' ? y + 10 : y + h - 10
    g.ditherCircle(sx, sy, 12, s.sun, 0.6)
    g.circle(sx, sy, 5, s.sun)
  }
  // Drifting clouds.
  for (let i = 0; i < 3; i++) {
    const speed = 2 + i
    const cx = x + ((((i * 71 + time * speed) % (w + 60)) + w + 60) % (w + 60)) - 30
    const cy = y + 6 + i * 7
    cloud(g, cx, cy, s.cloud, 6 + i * 2)
  }
}

function cloud(g: Surface, x: number, y: number, c: string, r: number) {
  g.ellipse(x, y, r * 1.6, r * 0.7, c)
  g.ellipse(x - r * 0.7, y + 1, r, r * 0.55, c)
  g.ellipse(x + r * 0.9, y + 1, r * 0.9, r * 0.5, c)
}

/** Multiply the whole frame toward the phase tint colour. */
export function applyTint(g: Surface, phase: Phase) {
  const s = SKY[phase]
  if (!s.tint) return
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'multiply'
  g.ctx.globalAlpha = s.tintAlpha
  g.ctx.fillStyle = s.tint
  g.ctx.fillRect(0, 0, g.w, g.h)
  g.ctx.restore()
}

const glowCache = new Map<string, HTMLCanvasElement>()

/** Dithered warm glow, drawn additively over the tinted frame. */
export function glowSprite(r: number, color = '#ffcf7a'): HTMLCanvasElement {
  const key = `${r}:${color}`
  let c = glowCache.get(key)
  if (!c) {
    const size = r * 2 + 1
    c = bake(size, size, (g) => {
      g.ctx.fillStyle = color
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const d = Math.hypot(x - r, y - r) / r
          if (d > 1) continue
          if (ditherOn(x, y, (1 - d) * 1.1)) g.ctx.fillRect(x, y, 1, 1)
        }
    })
    glowCache.set(key, c)
  }
  return c
}

export function drawGlow(g: Surface, x: number, y: number, r: number, strength: number, color?: string) {
  if (strength <= 0) return
  if (r > 20) {
    // Large glows use a soft gradient (posterised by the pixel scaling).
    const [cr, cg, cb] = hexRgb(color ?? '#ffcf7a')
    const cx = x - g.ox
    const cy = y - g.oy
    const grad = g.ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.32 * Math.min(1, strength)})`)
    grad.addColorStop(0.5, `rgba(${cr},${cg},${cb},${0.14 * Math.min(1, strength)})`)
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    g.ctx.fillStyle = grad
    g.ctx.fillRect(Math.round(cx - r), Math.round(cy - r), r * 2, r * 2)
    g.ctx.restore()
    return
  }
  const c = glowSprite(r, color)
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'lighter'
  g.ctx.globalAlpha = 0.35 * strength
  g.ctx.drawImage(c, Math.round(x - r - g.ox), Math.round(y - r - g.oy))
  g.ctx.restore()
}
