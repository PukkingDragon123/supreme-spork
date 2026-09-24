import type { Surface, Color } from './pixel'
import { drawText, textWidth } from './font'
import { rand } from './rng'

export type ParticleKind =
  | 'sparkle'
  | 'heart'
  | 'smoke'
  | 'petal'
  | 'ripple'
  | 'drop'
  | 'confetti'
  | 'firefly'
  | 'text'
  | 'dot'
  | 'leaf'
  | 'coin'

export interface Particle {
  kind: ParticleKind
  x: number
  y: number
  vx: number
  vy: number
  /** Gravity (px/s²). */
  g: number
  life: number
  max: number
  color: Color
  color2?: Color
  size: number
  text?: string
  phase: number
  /** Drag factor per second (0 = none). */
  drag: number
}

const HEART = ['.#.#.', '#####', '#####', '.###.', '..#..']
const HEART_SMALL = ['#.#', '###', '.#.']
const COIN = ['.##.', '#yy#', '#yy#', '.##.']

export class Particles {
  list: Particle[] = []

  add(p: Partial<Particle> & { kind: ParticleKind; x: number; y: number }) {
    const max = p.max ?? 1
    this.list.push({
      vx: 0,
      vy: 0,
      g: 0,
      life: max,
      max,
      color: '#ffffff',
      size: 1,
      phase: Math.random() * Math.PI * 2,
      drag: 0,
      ...p,
    } as Particle)
    if (this.list.length > 600) this.list.splice(0, this.list.length - 600)
  }

  sparkles(x: number, y: number, n = 8, color = '#fff6a8', spread = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = rand(8, 30)
      this.add({
        kind: 'sparkle',
        x: x + rand(-spread, spread) * 0.3,
        y: y + rand(-spread, spread) * 0.3,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 10,
        max: rand(0.5, 1.1),
        color,
        drag: 2,
      })
    }
  }

  hearts(x: number, y: number, n = 3, color = '#ff6f91') {
    for (let i = 0; i < n; i++) {
      this.add({
        kind: 'heart',
        x: x + rand(-6, 6),
        y: y + rand(-2, 2),
        vx: rand(-6, 6),
        vy: rand(-26, -14),
        max: rand(0.9, 1.4),
        color,
        size: Math.random() < 0.4 ? 0 : 1,
      })
    }
  }

  popText(x: number, y: number, text: string, color = '#fff2a0', outline = '#3a2838') {
    this.add({ kind: 'text', x, y, vy: -18, max: 1.3, color, color2: outline, text, drag: 1.5 })
  }

  confetti(x: number, y: number, n = 40, colors = ['#ffd34e', '#ff9fbf', '#7cc55e', '#6fcfe0', '#b394f0', '#ff7b6b']) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0)
      const s = rand(40, 120)
      this.add({
        kind: 'confetti',
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        g: 90,
        max: rand(1.4, 2.4),
        color: colors[i % colors.length],
        drag: 1.2,
      })
    }
  }

  update(dt: number) {
    const L = this.list
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i]
      p.life -= dt
      if (p.life <= 0) {
        L.splice(i, 1)
        continue
      }
      p.vy += p.g * dt
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt)
        p.vx *= k
        p.vy *= k
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.phase += dt
      if (p.kind === 'smoke') p.x += Math.sin(p.phase * 2.2) * 4 * dt
      if (p.kind === 'petal' || p.kind === 'leaf') p.x += Math.sin(p.phase * 1.7) * 10 * dt
    }
  }

  render(g: Surface) {
    for (const p of this.list) {
      const t = p.life / p.max // 1 → 0
      const x = Math.round(p.x)
      const y = Math.round(p.y)
      switch (p.kind) {
        case 'sparkle': {
          const s = t > 0.66 ? 1 : t > 0.33 ? 2 : 1
          g.px(x, y, p.color)
          if (s >= 1 && t > 0.2) {
            g.px(x - 1, y, p.color)
            g.px(x + 1, y, p.color)
            g.px(x, y - 1, p.color)
            g.px(x, y + 1, p.color)
          }
          if (s >= 2) {
            g.px(x - 2, y, p.color)
            g.px(x + 2, y, p.color)
            g.px(x, y - 2, p.color)
            g.px(x, y + 2, p.color)
            g.px(x, y, '#ffffff')
          }
          break
        }
        case 'heart': {
          const rows = p.size === 0 ? HEART_SMALL : HEART
          if (t < 0.25 && Math.floor(p.life * 20) % 2 === 0) break
          const ox = x - Math.floor(rows[0].length / 2)
          for (let r = 0; r < rows.length; r++)
            for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') g.px(ox + c, y + r, p.color)
          if (p.size === 1) g.px(ox + 1, y + 1, '#ffd1dc')
          break
        }
        case 'coin': {
          for (let r = 0; r < COIN.length; r++)
            for (let c = 0; c < 4; c++) {
              const k = COIN[r][c]
              if (k === '#') g.px(x + c - 2, y + r - 2, '#d99a2b')
              else if (k === 'y') g.px(x + c - 2, y + r - 2, '#ffe27a')
            }
          break
        }
        case 'smoke': {
          const a = Math.min(1, t * 1.5)
          g.alpha(a * 0.8)
          g.px(x, y, p.color)
          if (p.size > 1) g.px(x + 1, y, p.color)
          g.alpha(1)
          break
        }
        case 'petal':
        case 'leaf': {
          g.px(x, y, p.color)
          if (Math.sin(p.phase * 5) > 0) g.px(x + 1, y, p.color2 ?? p.color)
          else g.px(x, y + 1, p.color2 ?? p.color)
          break
        }
        case 'ripple': {
          const r = (1 - t) * p.size
          g.alpha(Math.min(1, t * 2))
          drawRing(g, p.x, p.y, r, r * 0.55, p.color)
          g.alpha(1)
          break
        }
        case 'drop':
        case 'dot': {
          g.px(x, y, p.color)
          if (p.size > 1) g.px(x, y - 1, p.color2 ?? p.color)
          break
        }
        case 'confetti': {
          const flip = Math.sin(p.phase * 12) > 0
          g.px(x, y, p.color)
          if (flip) g.px(x + 1, y, p.color)
          break
        }
        case 'firefly': {
          const on = Math.sin(p.phase * 3) > -0.2
          if (on) {
            g.px(x, y, p.color)
            g.alpha(0.35)
            g.px(x - 1, y, p.color)
            g.px(x + 1, y, p.color)
            g.px(x, y - 1, p.color)
            g.px(x, y + 1, p.color)
            g.alpha(1)
          }
          break
        }
        case 'text': {
          if (!p.text) break
          if (t < 0.2 && Math.floor(p.life * 20) % 2 === 0) break
          drawText(g, p.text, Math.round(p.x - textWidth(p.text) / 2), y, p.color, p.color2)
          break
        }
      }
    }
  }
}

/** 1px ellipse ring. */
export function drawRing(g: Surface, cx: number, cy: number, rx: number, ry: number, c: Color) {
  if (rx < 0.5) return
  const n = Math.max(8, Math.round(rx * 5))
  let lx = NaN
  let ly = NaN
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = Math.round(cx + Math.cos(a) * rx)
    const y = Math.round(cy + Math.sin(a) * ry)
    if (x !== lx || y !== ly) g.px(x, y, c)
    lx = x
    ly = y
  }
}
