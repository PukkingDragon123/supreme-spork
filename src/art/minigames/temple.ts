// Shared canvas helpers for the temple mini-games: drawing the player's HD
// doll in an action pose (and finding its hands), screen shake / hit-stop /
// flash, light rays and vignettes, and the props people hold (incense,
// candles, strikers, ladles, gold leaf, coins).

import { dollSprite, type BaseDollPose, type DollView } from '../doll'
import type { AvatarLook } from '../avatar'
import { bake, mix, type Surface } from '../../engine/pixel'
import { P } from '../palette'
import { drawGlow } from '../../scenes/sky'
import { T_POSE_NAMES, tWrist, tp, type TPose } from '../poses/temple'
import type { Particles } from '../../engine/particles'
import { rand } from '../../engine/rng'

export { tp, type TPose }

/** Where a doll was drawn: top-left, integer scale and orientation. */
export interface Placed {
  x: number
  y: number
  s: number
  flip: boolean
  view: DollView
  gender: 'm' | 'f'
  pose: TPose | BaseDollPose
}

export interface PlayerOpts {
  scale?: number
  flip?: boolean
  /** Ground shadow under the feet (default on). */
  shadow?: boolean
  /** Extra vertical offset (bobbing, hops). */
  bob?: number
  /** Scene time, for the occasional blink on front views. */
  t?: number
  barefoot?: boolean
  alpha?: number
}

const T_POSES = new Set<string>(T_POSE_NAMES)

/**
 * Draw the player's doll with its feet centred on (cx, footY). Returns the
 * placement so props can be drawn at the hands with `handAt`.
 */
export function drawPlayer(g: Surface, look: AvatarLook, pose: TPose | BaseDollPose, view: DollView, cx: number, footY: number, o: PlayerOpts = {}): Placed {
  const s = o.scale ?? 1
  const name = T_POSES.has(pose) ? tp(pose as TPose) : (pose as BaseDollPose)
  const blink = view === 'front' && o.t !== undefined && o.t % 3.3 < 0.12
  const spr = dollSprite(look, name, { view, flip: o.flip, blink, barefoot: o.barefoot })
  const x = Math.round(cx - (spr.w * s) / 2)
  const y = Math.round(footY - spr.h * s + (o.bob ?? 0))
  if (o.shadow !== false) g.ellipse(cx, footY - 1, 11 * s, 2.4 * s, 'rgba(30,14,30,0.28)')
  if (o.alpha !== undefined) g.alpha(o.alpha)
  if (s === 1) g.draw(spr.canvas, x, y)
  else g.drawScaled(spr.canvas, x, y, s)
  if (o.alpha !== undefined) g.alpha(1)
  return { x, y, s, flip: !!o.flip, view, gender: look.gender === 'f' ? 'f' : 'm', pose }
}

/** Screen position of a hand of a placed doll (side 1 = screen-left arm before flipping). */
export function handAt(p: Placed, side: 1 | -1): [number, number] {
  let w: [number, number] | null = null
  if (T_POSES.has(p.pose)) w = tWrist(p.pose as TPose, p.view, side, p.gender)
  if (!w) {
    // Built-in poses: chest wai / kneeling wai / resting.
    const kneel = p.pose === 'kneel' || p.pose === 'kneelWai'
    const wai = p.pose === 'wai' || p.pose === 'kneelWai'
    const y = (wai ? (p.view === 'back' ? 21 : 27) : 33) + (kneel ? 9 : 0)
    w = wai ? [17, y] : [side === 1 ? 9 : 25, y]
  }
  const x = p.flip ? 34 - w[0] : w[0]
  return [p.x + x * p.s, p.y + w[1] * p.s]
}

// ---------------------------------------------------------------------------
// Juice: shake, hit-stop, flash

export class Juice {
  private trauma = 0
  private stopT = 0
  private flashT = 0
  private flashMax = 0
  private flashC = '#ffffff'
  ox = 0
  oy = 0
  /** Add screen shake (0..1, stacks). */
  shake(a: number) {
    this.trauma = Math.min(1, this.trauma + a)
  }
  /** Freeze the world for a few frames on impact. */
  hitstop(sec: number) {
    this.stopT = Math.max(this.stopT, sec)
  }
  flash(color = '#ffffff', sec = 0.14) {
    this.flashC = color
    this.flashT = this.flashMax = sec
  }
  get stopped() {
    return this.stopT > 0
  }
  /** Advance the effects; returns the dt the world should use (0 while frozen). */
  step(dt: number): number {
    this.trauma = Math.max(0, this.trauma - dt * 1.6)
    this.flashT = Math.max(0, this.flashT - dt)
    const k = this.trauma * this.trauma * 6
    this.ox = Math.round((Math.random() * 2 - 1) * k)
    this.oy = Math.round((Math.random() * 2 - 1) * k * 0.7)
    if (this.stopT > 0) {
      this.stopT -= dt
      return 0
    }
    return dt
  }
  /** Call before drawing the world. */
  begin(g: Surface) {
    g.setCamera(-this.ox, -this.oy)
  }
  /** Call after drawing the world (resets the camera, draws the flash). */
  end(g: Surface) {
    g.setCamera(0, 0)
    if (this.flashT > 0) {
      g.alpha((this.flashT / this.flashMax) * 0.55)
      g.rect(0, 0, g.w, g.h, this.flashC)
      g.alpha(1)
    }
  }
}

// ---------------------------------------------------------------------------
// Atmosphere

const vigCache = new Map<string, HTMLCanvasElement>()
/** Soft dark edges that pull the eye to the middle. */
export function vignette(g: Surface, color = '#1b1026', strength = 0.55) {
  const { w, h } = g
  const k = `${w}:${h}:${color}:${strength}`
  let c = vigCache.get(k)
  if (!c) {
    c = bake(w, h, (s) => {
      const [r, gg, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
      const R = Math.hypot(w, h) / 2
      const grad = s.ctx.createRadialGradient(w / 2, h / 2, R * 0.45, w / 2, h / 2, R)
      grad.addColorStop(0, `rgba(${r},${gg},${b},0)`)
      grad.addColorStop(1, `rgba(${r},${gg},${b},${Math.min(0.85, strength)})`)
      s.ctx.fillStyle = grad
      s.ctx.fillRect(0, 0, w, h)
    })
    if (vigCache.size > 12) vigCache.clear()
    vigCache.set(k, c)
  }
  g.ctx.drawImage(c, 0, 0)
}

/** Slowly turning soft light rays from a point (behind a Buddha, a deity...). */
export function godRays(g: Surface, cx: number, cy: number, r: number, t: number, color = '#fff3c4', alpha = 0.18, n = 10) {
  const ctx = g.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  const x0 = cx - g.ox
  const y0 = cy - g.oy
  for (let i = 0; i < n; i++) {
    const a = t * 0.12 + (i / n) * Math.PI * 2
    const wA = 0.09 + 0.04 * Math.sin(t * 0.7 + i)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + Math.cos(a - wA) * r, y0 + Math.sin(a - wA) * r)
    ctx.lineTo(x0 + Math.cos(a + wA) * r, y0 + Math.sin(a + wA) * r)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Smooth radial glow (no dither), for light sources overlapping faces. */
export function softGlow(g: Surface, x: number, y: number, r: number, strength = 1, color = '#ffcf7a') {
  if (strength <= 0 || r <= 0) return
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
  const cx = x - g.ox
  const cy = y - g.oy
  const grad = g.ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  grad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5 * Math.min(1, strength)})`)
  grad.addColorStop(0.45, `rgba(${cr},${cg},${cb},${0.18 * Math.min(1, strength)})`)
  grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'lighter'
  g.ctx.fillStyle = grad
  g.ctx.fillRect(Math.round(cx - r), Math.round(cy - r), r * 2, r * 2)
  g.ctx.restore()
}

/** Warm light pool on the floor. */
export function lightPool(g: Surface, cx: number, cy: number, rx: number, color = '#ffe7a0', strength = 0.5) {
  g.ctx.save()
  g.ctx.globalCompositeOperation = 'lighter'
  g.ctx.globalAlpha = 0.18 * strength
  g.ellipse(cx, cy, rx, rx * 0.28, color)
  g.ctx.globalAlpha = 0.14 * strength
  g.ellipse(cx, cy, rx * 0.6, rx * 0.17, color)
  g.ctx.restore()
}

/** A ring of sparkles and a shock ring at an impact. */
export function impactBurst(ps: Particles, x: number, y: number, color = '#fff3a6', n = 10) {
  ps.add({ kind: 'ripple', x, y, max: 0.45, size: 14, color })
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2)
    const sp = rand(40, 80)
    ps.add({ kind: 'sparkle', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 5, max: rand(0.3, 0.6), color })
  }
}

/** Floating golden motes drifting upward (ambient). */
export function motes(ps: Particles, dt: number, w: number, h: number, rate = 2, color = '#fff3a6') {
  if (Math.random() < dt * rate) ps.add({ kind: 'firefly', x: rand(0, w), y: rand(h * 0.2, h * 0.8), vx: rand(-2, 2), vy: rand(-6, -2), max: rand(2.5, 4.5), color })
}

// ---------------------------------------------------------------------------
// Props (drawn at the hands)

/** A bundle of incense sticks rising from (x, y). */
export function drawIncense(g: Surface, x: number, y: number, t: number, lit: boolean, n = 3, len = 12, lean = 0) {
  for (let i = 0; i < n; i++) {
    const ox = (i - (n - 1) / 2) * 1.6
    const tx = x + ox * 1.5 + lean
    const ty = y - len
    g.line(x + ox * 0.5, y, tx, ty, i % 2 ? '#c0392b' : '#a8313f')
    g.px(x + ox * 0.5, y, '#e0bb8a')
    if (lit) {
      g.px(tx, ty - 1, Math.sin(t * 11 + i) > 0 ? '#ffd54f' : '#ff8a3d')
      g.px(tx, ty, '#ff6a3d')
      drawGlow(g, tx, ty - 1, 3, 0.8, '#ff9a5a')
    }
  }
}

/** Emit incense smoke from stick tips (call from update). */
export function incenseSmoke(ps: Particles, dt: number, x: number, y: number, rate = 4) {
  if (Math.random() < dt * rate) ps.add({ kind: 'smoke', x: x + rand(-1.5, 1.5), y, vx: rand(-1, 1), vy: rand(-11, -6), max: rand(1.6, 2.6), color: '#f3eefa', size: Math.random() < 0.4 ? 2 : 1 })
}

/** A small held candle with a flickering flame. */
export function drawHeldCandle(g: Surface, x: number, y: number, t: number, lit = true, s = 1) {
  g.rect(x - s, y - 6 * s, 2 * s, 6 * s, '#fff3d6')
  g.rect(x - s, y - 6 * s, s, 6 * s, '#ffffff')
  g.rect(x - s, y - s, 2 * s, s, '#e3cfa8')
  if (!lit) return
  const f = Math.sin(t * 13) > 0 ? 1 : 0
  g.rect(x - (s > 1 ? 1 : 0), y - 8 * s - f, Math.max(1, s), 2 * s, '#ffd54f')
  g.px(x - (s > 1 ? 1 : 0), y - 8 * s - f - 1, '#fff3a6')
  softGlow(g, x, y - 8 * s, 8 * s, 0.9, '#ffcf7a')
}

/** A closed pink lotus bud. */
export function drawLotusBud(g: Surface, x: number, y: number) {
  g.px(x, y - 3, P.pinkD)
  g.rect(x - 1, y - 2, 3, 2, P.pink)
  g.px(x - 1, y - 2, '#ffd6e0')
  g.px(x, y, P.leaf)
  g.px(x, y + 1, P.leafD)
}

/** Long bell striker from the hand (hx, hy) to its padded head at (tx, ty). */
export function drawStriker(g: Surface, hx: number, hy: number, tx: number, ty: number, s = 1) {
  g.thickLine(hx, hy, tx, ty, Math.max(1, s * 1.4), '#6e4a35')
  g.line(hx, hy - 1, tx, ty - 1, '#b8844a')
  g.circle(tx, ty, 2.2 * s, '#8e2a3c')
  g.circle(tx - 0.5, ty - 0.5, 1.4 * s, '#e8514a')
}

/** Coconut-shell ladle (กระบวย): handle from the hand, bowl at the end. */
export function drawLadle(g: Surface, hx: number, hy: number, bx: number, by: number, fill: number, t: number, s = 1) {
  g.thickLine(hx, hy, bx, by - 2 * s, 1.5 * s, '#8a5a32')
  g.line(hx, hy - 1, bx, by - 2 * s - 1, '#c28e5c')
  g.ellipse(bx, by, 5 * s, 3.4 * s, '#5a3a26')
  g.ellipse(bx, by - 0.5 * s, 4.4 * s, 2.4 * s, '#8a5a32')
  const f = Math.min(1, fill)
  if (f > 0.05) {
    g.ellipse(bx, by - 0.6 * s, 3.8 * s * Math.sqrt(f), 1.8 * s * Math.sqrt(f), fill > 1.02 ? '#bfefff' : '#6fcfe0')
    g.px(bx - 1 + Math.round(Math.sin(t * 3)), by - 1, '#e6fbff')
  }
}

/** A square of gold leaf on its paper backing. */
export function drawLeafSheet(g: Surface, x: number, y: number, t: number, s = 1) {
  g.rect(x - 3 * s, y - 3 * s, 6 * s, 6 * s, '#fff1d6')
  g.rect(x - 2 * s, y - 2 * s, 5 * s, 5 * s, P.gold)
  g.rect(x - 2 * s, y - 2 * s, 2 * s, 2 * s, P.goldL)
  if (Math.sin(t * 5) > 0.6) g.px(x + s, y - s, '#ffffff')
}

/** A Boon Coin seen edge-on as it spins. */
export function drawSpinCoin(g: Surface, x: number, y: number, spin: number, r = 3) {
  const wv = Math.abs(Math.cos(spin))
  g.rect(x - r * wv, y - r, Math.max(1, 2 * r * wv), 2 * r, '#b8741f')
  g.rect(x - (r - 1) * wv, y - r + 1, Math.max(1, 2 * (r - 1) * wv), 2 * r - 2, P.gold)
  if (wv > 0.5) g.px(x - 1, y - 1, P.goldL)
}

/** Paper bag of fish food held in the hand. */
export function drawFoodBag(g: Surface, x: number, y: number, color = '#e8c07a') {
  g.rect(x - 2, y - 4, 5, 6, '#fffaf0')
  g.rect(x - 2, y - 4, 5, 1, '#e3d8c6')
  g.rect(x - 1, y - 2, 3, 2, color)
  g.px(x + 2, y + 1, '#d9cbb3')
}

/** Siamsi cup (red bamboo tube with gold bands) tilted by `angle`, with sticks. */
export function drawSiamsiCup(g: Surface, cx: number, bottom: number, angle: number, t: number, shake: number, s = 1) {
  const cupH = 22 * s
  const cupW = 12 * s
  const top = bottom - cupH
  const shear = Math.tan(angle)
  for (let i = 0; i < 9; i++) {
    const baseX = cx - 4 * s + i * s
    const len = (7 + ((i * 7) % 5)) * s + (shake > 0 ? Math.round(Math.sin(t * 34 + i) * 1.5 * s) : 0)
    for (let y = top - len; y < top + 3; y++) {
      const off = Math.round((y - bottom) * shear)
      g.rect(baseX + off, y, 1, 1, y < top - len + 2 * s ? '#e8514a' : i % 2 ? '#e8c38a' : '#f3d9a8')
    }
  }
  for (let y = top; y < bottom; y++) {
    const off = Math.round((y - bottom) * shear)
    const rel = (y - top) / s
    const band = rel < 2 || (rel > 9 && rel < 11) || rel > 19
    g.rect(cx - cupW / 2 + off, y, cupW, 1, band ? P.gold : '#c0392b')
    g.rect(cx - cupW / 2 + off + s, y, s, 1, band ? P.goldL : '#e8514a')
    g.rect(cx + cupW / 2 + off - 2 * s, y, s, 1, band ? P.goldD : '#8e2a3c')
    g.px(cx - cupW / 2 + off - 1, y, P.ink)
    g.px(cx + cupW / 2 + off, y, P.ink)
  }
  g.rect(cx - cupW / 2 - 1, bottom, cupW + 2, 1, P.ink)
}

/** One siamsi stick at an angle (for the falling one). */
export function drawStick(g: Surface, x: number, y: number, rot: number, len = 20) {
  const dx = Math.cos(rot)
  const dy = Math.sin(rot)
  for (let i = 0; i < len; i++) g.rect(Math.round(x + dx * (i - len / 2)), Math.round(y + dy * (i - len / 2)), 2, 2, i > len - 4 ? '#e8514a' : '#e8c38a')
}

/** Banana-leaf krathong with flowers, candle and incense. */
export function drawKrathong(g: Surface, x: number, y: number, s: number, flower: { c: string; d?: string }, lit: boolean, t: number) {
  const r = 10 * s
  g.ellipse(x, y + 2 * s, r + 2, 3 * s, 'rgba(10,20,50,0.4)')
  g.ellipse(x, y, r, 3.4 * s, P.leafD)
  g.ellipse(x, y - 1, r - 1, 2.6 * s, P.leaf)
  // folded banana-leaf petals around the rim
  if (s >= 1) for (let i = -3; i <= 3; i++) g.px(x + i * r * 0.28, y - 2.4 * s + Math.abs(i) * 0.4 * s, i % 2 ? P.leafD : '#9ad86a')
  for (let i = -2; i <= 2; i++) g.circle(x + i * r * 0.4, y - 3 * s, Math.max(1, 2 * s), i % 2 ? flower.c : (flower.d ?? flower.c))
  if (s > 0.6) {
    g.vline(x, y - 12 * s, y - 4 * s, '#fff1d6')
    g.vline(x - Math.max(2, 3 * s), y - 10 * s, y - 4 * s, '#c0392b')
    g.vline(x + Math.max(2, 3 * s), y - 10 * s, y - 4 * s, '#c0392b')
  }
  if (lit) {
    g.px(x, y - 12 * s - 1, Math.sin(t * 10 + x) > 0 ? '#ffd54f' : '#fff3a6')
    drawGlow(g, x, y - 12 * s, Math.max(4, 12 * s), 0.9)
  }
}

/** Darker/lighter helper for quick palette tweaks. */
export const shade = (c: string, k: number) => (k < 0 ? mix(c, '#1b1026', -k) : mix(c, '#ffffff', k))
