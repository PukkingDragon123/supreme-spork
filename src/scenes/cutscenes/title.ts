// Title / login backdrop: a calm golden-hour temple that loops forever. The
// logo sits near the top; the lower ~45% (courtyard and lotus pond) stays
// quiet so DOM panels can sit on top of it.

import type { Scene } from '../../engine/stage'
import { bake, type Surface } from '../../engine/pixel'
import { Particles } from '../../engine/particles'
import { birdSprite } from '../../art/characters'
import { drawChedi } from '../../art/buildings'
import {
  bakeCloud,
  bakeGrandFacade,
  bakeSky,
  drawLogo,
  drawLotus,
  drawPad,
  glint,
  h01,
  logoArt,
  ramp,
  seeded,
  softGlow,
  wordmarkSprite,
  type FacadeInfo,
} from '../../art/cinematic'

export class TitleScene implements Scene {
  /** Where the canvas logo is drawn (virtual px), so the UI can avoid it. */
  logoRect?: { x: number; y: number; w: number; h: number }
  private w = 0
  private h = 0
  private t = 0
  private gy = 0
  private sky!: HTMLCanvasElement
  private clouds: HTMLCanvasElement[] = []
  private back!: HTMLCanvasElement
  private f!: FacadeInfo
  private fx0 = 0
  private fy0 = 0
  private pond!: HTMLCanvasElement
  private reflect!: HTMLCanvasElement
  private logoY = 0
  private logoCx = 0
  private fx = new Particles()

  resize(w: number, h: number) {
    if (w === this.w && h === this.h) return
    this.w = w
    this.h = h
    const L = logoArt()
    const wm = wordmarkSprite('#fff6e4', '#8a3f4e')
    // Wide screens (tablets in landscape) put the logo beside the temple.
    const wide = h < w * 0.9
    this.logoCx = wide ? Math.round(w * 0.27) : Math.round(w / 2)
    this.logoY = wide ? Math.max(6, Math.round(h * 0.16)) : Math.max(4, Math.round(h * 0.085))
    const logoBottom = this.logoY + L.h + 4 + wm.h
    this.logoRect = { x: Math.round(this.logoCx - L.w / 2), y: this.logoY, w: L.w, h: logoBottom - this.logoY }
    // Temple ground line leaves the lower ~45% for the courtyard and pond.
    const gy = Math.round(h * (wide ? 0.6 : 0.56))
    this.gy = gy
    const avail = wide ? gy + 8 : gy - (logoBottom - 26)
    const s = Math.max(0.24, Math.min(0.62, (w * (wide ? 0.62 : 1.08)) / 380, avail / 342))
    this.f = bakeGrandFacade(s)
    this.fx0 = Math.round(wide ? w * 0.72 : w / 2) - this.f.cx
    this.fy0 = gy - this.f.gy + 2

    this.sky = bakeSky(w, gy + 10, ['#6f8fd6', '#a99ad6', '#e8a8b8', '#ffc49a', '#ffdca4', '#ffeab8'], 6)
    this.clouds = [0, 1, 2, 3].map((i) => bakeCloud(40 + i * 12, 20 + i, '#fff2d8', '#ffd8c0', '#e8a8b8'))
    // Background: golden chedis and trees framing the hall.
    const r = seeded(3)
    this.back = bake(w, gy + 4, (g) => {
      const cs = Math.max(0.6, s * 2.1)
      drawChedi(g, Math.round(w * 0.1), gy - Math.round(16 * s), { gold: true, scale: cs })
      drawChedi(g, Math.round(w * 0.9), gy - Math.round(16 * s), { gold: true, scale: cs })
      // Soft tree line.
      for (let x = -6; x < w + 6; x += 7) {
        const rr = 6 + r() * 7
        g.circle(x, gy - 4 - rr * 0.4, rr, '#6f8a6a')
        g.circle(x - 1, gy - 5 - rr * 0.5, rr * 0.7, '#86a07a')
      }
    })
    // Courtyard and lotus pond.
    const ph = h - gy
    this.pond = bake(w, ph, (g) => {
      g.rect(0, 0, w, 10, '#ecdcc2')
      for (let x = 0; x < w; x += 10) g.vline(x, 0, 9, '#dccab0')
      g.hline(0, w - 1, 4, '#dccab0')
      g.rect(0, 10, w, 2, '#c9b392')
      g.gradientV(0, 12, w, ph - 12, ramp(['#e7b89a', '#b9a0b8', '#7d8cb0', '#56709a'], 10), 4)
    })
    // Reflection of the temple in the pond (baked, drawn rippled).
    const fc = this.f.canvas
    this.reflect = bake(fc.width, fc.height, (g) => {
      g.ctx.translate(0, fc.height)
      g.ctx.scale(1, -1)
      g.ctx.drawImage(fc, 0, 0)
    })
    this.fx = new Particles()
    for (const f of ['a', 'fly'] as const) birdSprite(f, '#6a5a70')
  }

  /** Dev helper: advance the loop (deterministic screenshots). */
  seek(t: number) {
    while (this.t < t) this.update(1 / 30)
  }

  update(dt: number) {
    this.t += dt
    this.fx.update(dt)
    // Gentle floating lights and petals (few, slow).
    if (Math.random() < dt * 1.2)
      this.fx.add({ kind: 'firefly', x: Math.random() * this.w, y: this.gy - 20 + Math.random() * 40, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 2, max: 5, color: '#fff3a6' })
    if (Math.random() < dt * 0.5)
      this.fx.add({ kind: 'petal', x: Math.random() * this.w, y: -3, vy: 9, vx: -3, max: this.gy / 9, color: '#ffb3cf', color2: '#ffe1ea' })
  }

  render(g: Surface) {
    const { w, h, t, gy, f } = this
    g.draw(this.sky, 0, 0)
    const sunX = Math.round(w * 0.78)
    const sunY = gy - Math.round(h * 0.12)
    softGlow(g, sunX, sunY, Math.round(w * 0.9), 0.9, '#ffcf8a')
    g.circle(sunX, sunY, 8, '#fff0c0')
    g.circle(sunX, sunY, 6, '#fffbe6')
    this.clouds.forEach((c, i) => {
      const span = w + c.width + 20
      const x = Math.round(((i * 97 + t * (1.2 + i * 0.5)) % span) - c.width)
      g.draw(c, x, Math.round(h * (0.05 + i * 0.07)))
    })
    // A small flock crosses now and then.
    const cycle = 26
    const ct = (t % cycle) / cycle
    if (ct < 0.5) {
      const bx = -20 + ct * 2 * (w + 40)
      const by = h * 0.3 - ct * 30
      for (let i = 0; i < 5; i++) {
        const b = birdSprite(Math.floor(t * 6 + i) % 2 ? 'fly' : 'a', '#6a5a70')
        g.draw(b.canvas, Math.round(bx - Math.abs(i - 2) * 6), Math.round(by + Math.abs(i - 2) * 4 + (i % 2)))
      }
    }
    g.draw(this.back, 0, 0)
    g.draw(f.canvas, this.fx0, this.fy0)
    // Chofa glints ripple slowly.
    f.glints.forEach(([x, y], i) => {
      const ph = ((t * 0.45 + i * 0.29) % 1.8) / 0.4
      glint(g, x + this.fx0, y + this.fy0, Math.max(0, 1 - Math.abs(ph - 1)))
    })
    // Lantern string across the courtyard.
    this.lanterns(g, t)
    // Courtyard, pond and reflection.
    g.draw(this.pond, 0, gy)
    const rh = Math.min(this.reflect.height, h - gy - 12)
    g.alpha(0.2)
    for (let y = 0; y < rh; y += 1) {
      if (y % 3 === 2) continue
      const off = Math.round(Math.sin(y * 0.35 + t * 1.6) * (0.5 + y * 0.015))
      g.ctx.drawImage(this.reflect, 0, y, this.reflect.width, 1, this.fx0 + off, gy + 12 + y, this.reflect.width, 1)
    }
    g.reset()
    softGlow(g, sunX, gy + 30, Math.round(w * 0.5), 0.5, '#ffcf8a', 0.3)
    // A few pads and a lotus at the pond edges (kept away from the centre).
    const pz = gy + 12
    drawPad(g, 14, pz + Math.round((h - pz) * 0.3), 12, 0.5)
    drawPad(g, w - 16, pz + Math.round((h - pz) * 0.55), 14, 2.4)
    drawPad(g, 26, pz + Math.round((h - pz) * 0.82), 10, 4)
    drawLotus(g, 16, pz + Math.round((h - pz) * 0.3) - 2, 9, 0.85 + Math.sin(t * 0.8) * 0.05)
    for (let i = 0; i < 16; i++) {
      const y = gy + 14 + Math.round(h01(i * 3 + 1) * (h - gy - 16))
      const x = Math.round((h01(i * 3 + 2) * (w + 20) + t * 3) % (w + 20)) - 10
      if (Math.sin(t * 1.4 + i) > 0.4) {
        g.alpha(0.35)
        g.rect(x, y, 3 + (i % 3), 1, '#ffe6c8')
      }
    }
    g.reset()
    this.fx.render(g)
    // Logo.
    const L = logoArt()
    const lcx = this.logoCx
    const lx = Math.round(lcx - L.w / 2)
    const bob = Math.round(Math.sin(t * 1.2) * 1)
    softGlow(g, lcx, this.logoY + L.h / 2, Math.round(L.w * 0.8), 0.7, '#fff3c4')
    drawLotus(g, lcx, this.logoY - 2 + bob, 14, 1)
    const cyc = t % 7
    drawLogo(g, lx, this.logoY + bob, cyc < 1 ? cyc : -1)
    const wm = wordmarkSprite('#fff6e4', '#8a3f4e')
    g.draw(wm.canvas, Math.round(lcx - wm.w / 2), this.logoY + L.h + 3 + bob)
  }

  private lanterns(g: Surface, t: number) {
    const { w, gy } = this
    const y0 = gy - Math.round(this.h * 0.05)
    const n = 7
    let lx = -4
    let ly = y0 - 6
    for (let i = 0; i <= 24; i++) {
      const f2 = i / 24
      const x = -4 + (w + 8) * f2
      const y = y0 - 6 + Math.sin(f2 * Math.PI) * 12
      g.line(lx, ly, x, y, '#5a3d4f')
      lx = x
      ly = y
    }
    for (let i = 0; i < n; i++) {
      const f2 = (i + 0.5) / n
      const x = Math.round(-4 + (w + 8) * f2 + Math.sin(t * 1.3 + i) * 0.8)
      const y = Math.round(y0 - 6 + Math.sin(f2 * Math.PI) * 12)
      const c = i % 3 === 0 ? '#e8514a' : i % 3 === 1 ? '#f58f35' : '#ffd23f'
      softGlow(g, x, y + 5, 12, 0.5 + Math.sin(t * 2 + i) * 0.1, '#ffcf7a')
      g.vline(x, y, y + 1, '#5a3d4f')
      g.ellipse(x, y + 5, 3.5, 3, '#5a2a3a')
      g.ellipse(x, y + 5, 2.6, 2.3, c)
      g.px(x - 1, y + 4, '#fff3c4')
      g.hline(x - 1, x + 1, y + 2, '#b8742a')
      g.hline(x - 1, x + 1, y + 8, '#b8742a')
      g.vline(x, y + 9, y + 10, c)
    }
  }
}
