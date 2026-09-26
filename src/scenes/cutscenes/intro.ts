// Opening cinematic: Bangkok before dawn → the morning alms round → the
// temple → a lotus opening → the บุญดี logo.

import type { Scene } from '../../engine/stage'
import { Surface } from '../../engine/pixel'
import {
  bakeGuideway,
  bakeSkyline,
  bakeSky,
  bakeStratus,
  DAWN_SKIES,
  drawKoi,
  drawLogo,
  drawLotus,
  drawPad,
  drawSunburst,
  logoArt,
  ramp,
  wordmarkSprite,
  drawCrescent,
  drawPrang,
  drawSkytrain,
  h01,
  longtailSprite,
  seeded,
  softGlow,
} from '../../art/cinematic'
import { bake } from '../../engine/pixel'
import { drawRing, Particles } from '../../engine/particles'
import { sfx } from '../../engine/audio'
import { DEFAULT_LOOK, type AvatarLook } from '../../art/avatar'
import { birdSprite, DOG_COATS, dogSprite, monkSprite, type MonkPose } from '../../art/characters'
import { bakeCloud, bakeGrandFacade, glint, type FacadeInfo, bakePowerLines, bakeSoi, drawRays, drawSpiritHouse, villagerSprite } from '../../art/cinematic'
import { cam, Director, E, play, seg, tw, type CutsceneEvents, type Shot, type Transition } from './timeline'

// ---------------------------------------------------------------------------
// Shot 1 — Bangkok before dawn

class SkylineShot implements Shot {
  dur = 4.8
  zoom = 1
  private w = 0
  private h = 0
  private hy = 0
  private tilt = 0
  private skies: HTMLCanvasElement[] = []
  private far!: ReturnType<typeof bakeSkyline>
  private mid!: ReturnType<typeof bakeSkyline>
  private guide!: HTMLCanvasElement
  private bank!: HTMLCanvasElement
  private bankLights!: HTMLCanvasElement
  private prang!: HTMLCanvasElement
  private prangX = 0
  private river!: HTMLCanvasElement
  private beamY = 0
  private clouds: HTMLCanvasElement[] = []

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    const U = Math.min(h, w * 1.6)
    const hy = Math.round(h * 0.6)
    this.hy = hy
    this.tilt = Math.round(Math.min(90, h * 0.2))
    const LW = w + 80
    this.skies = DAWN_SKIES.map((s) => bakeSky(w, hy + this.tilt + 4, s, 8))
    const ch = Math.round(hy * 0.62)
    this.clouds = [
      bakeStratus(LW + 40, ch, 7, 6, '#1f1b4c', '#2c2862', '#26225a'),
      bakeStratus(LW + 40, ch, 7, 6, '#4a3f80', '#ffa38e', '#5d4f92'),
    ]
    this.far = bakeSkyline(LW, hy + 2, hy, { seed: 11, minH: Math.round(U * 0.1), maxH: Math.round(U * 0.3), body: '#3b3470', rim: '#4f4488', windows: 0.05, gap: 6 })
    this.mid = bakeSkyline(LW, hy + 2, hy, { seed: 23, minH: Math.round(U * 0.05), maxH: Math.round(U * 0.22), body: '#272150', rim: '#3a3169', side: '#1f1a44', windows: 0.2, landmarks: true })
    this.beamY = hy - Math.round(U * 0.11)
    this.guide = bakeGuideway(LW, hy + 2, this.beamY, hy, '#3a3266', '#5b4f8c', '#211c45')
    // Far bank: low houses, trees and palms in silhouette.
    const r = seeded(5)
    const bankLights = bake(LW, hy + 4, () => undefined)
    const lctx = bankLights.getContext('2d')!
    this.bank = bake(LW, hy + 4, (g) => {
      const c = '#18132f'
      let x = 0
      while (x < LW) {
        const k = r()
        if (k < 0.45) {
          const rr = 3 + r() * 5
          g.circle(x + rr, hy - rr * 0.6, rr, c)
          x += rr * 1.4
        } else if (k < 0.8) {
          const bw = 6 + Math.floor(r() * 9)
          const bh = 3 + Math.floor(r() * 8)
          g.rect(x, hy - bh, bw, bh + 2, c)
          g.poly(
            [
              [x - 1, hy - bh],
              [x + bw / 2, hy - bh - 3],
              [x + bw + 1, hy - bh],
            ],
            c,
          )
          if (r() < 0.6) {
            lctx.fillStyle = r() < 0.5 ? '#ffcf7a' : '#ffe9b0'
            lctx.fillRect(Math.round(x + 2 + r() * (bw - 4)), Math.round(hy - bh + 2), 1, 1)
          }
          x += bw + 1
        } else {
          // Palm.
          const ph = 8 + Math.floor(r() * 7)
          g.vline(x + 2, hy - ph, hy, c)
          g.line(x + 2, hy - ph, x - 3, hy - ph + 3, c)
          g.line(x + 2, hy - ph, x + 7, hy - ph + 3, c)
          g.line(x + 2, hy - ph, x - 1, hy - ph - 3, c)
          g.line(x + 2, hy - ph, x + 5, hy - ph - 3, c)
          x += 7
        }
      }
      g.rect(0, hy, LW, 4, c)
    })
    this.bankLights = bankLights
    // Floodlit prang on the far bank.
    const ph = Math.round(Math.min(U * 0.3, hy * 0.55))
    const pw = Math.round(ph * 0.9)
    this.prangX = Math.round(w * 0.36) + 60
    this.prang = bake(pw, ph + 2, (g) => {
      const cx = Math.round(pw / 2)
      const pal = { body: '#e9bf8a', light: '#fbe0b0', shade: '#bf8a62', dark: '#80505a', accent: '#8fd0e8', accent2: '#ff9fbf' }
      drawPrang(g, cx - Math.round(pw * 0.3), ph + 1, ph * 0.55, pal)
      drawPrang(g, cx + Math.round(pw * 0.3), ph + 1, ph * 0.55, pal)
      drawPrang(g, cx, ph + 1, ph, pal)
    })
    // River body.
    this.river = bake(LW, h - hy + this.tilt, (g) => {
      g.gradientV(0, 0, LW, h - hy + this.tilt, ['#4a3e7c', '#2f2862', '#1e1a49', '#151236'], 8)
      // Mirror of the far bank.
      g.ctx.save()
      g.ctx.globalAlpha = 0.55
      g.ctx.translate(0, 0)
      g.ctx.scale(1, -0.6)
      g.ctx.drawImage(this.bank, 0, -hy - 3)
      g.ctx.restore()
      // Softer mirror of the skyline further out.
      g.ctx.save()
      g.ctx.globalAlpha = 0.22
      g.ctx.scale(1, -0.45)
      g.ctx.drawImage(this.mid.body, 0, -hy - 2)
      g.ctx.restore()
    })
  }

  render(g: Surface, t: number) {
    const { w, h, hy } = this
    const LW = w + 80
    // Camera: tilt down from the stars to the river while panning right.
    const tiltNow = cam(t, 0, 4.6, this.tilt, 0, E.inOutSine)
    const pan = tw(t, 0, 5.8, 0, 60, E.inOutSine)
    const moonX = Math.round(w * 0.78) - Math.round(pan * 0.1)
    const moonY = Math.round(hy * 0.2) + Math.round(tiltNow * 0.3)
    const px = (f: number) => -Math.round(pan * f) - 10
    // Sky crossfades through three keyframes.
    const k = seg(t, 0.2, 5.4) * 2
    const skyY = tiltNow - this.tilt
    g.rect(0, 0, w, h, DAWN_SKIES[0][4])
    const ki = Math.min(1, Math.floor(k))
    g.draw(this.skies[ki], 0, skyY)
    g.alpha(k - ki)
    g.draw(this.skies[ki + 1], 0, skyY)
    g.reset()

    // Stars fade as the sky warms.
    const starA = 1 - seg(t, 0.8, 5) * 0.92
    const sy = Math.round(tiltNow * 0.3)
    for (let i = 0; i < 80; i++) {
      const x = Math.round(h01(i * 3 + 1) * (w + 20)) - Math.round(pan * 0.1) - 4
      const y = Math.round(h01(i * 3 + 2) * (hy * 0.75)) + sy - 10
      const tw2 = Math.sin(t * (1.5 + h01(i) * 2) + i * 2.1) * 0.5 + 0.5
      const a = starA * (0.35 + tw2 * 0.65) * (1 - y / (hy + 1)) * 1.3
      if (a <= 0.05) continue
      g.alpha(Math.min(1, a))
      const c = i % 7 === 0 ? '#fff3a6' : '#e6ebff'
      g.px(x, y, c)
      if (i % 11 === 0 && tw2 > 0.6) {
        g.px(x - 1, y, c)
        g.px(x + 1, y, c)
        g.px(x, y - 1, c)
        g.px(x, y + 1, c)
      }
    }
    g.reset()

    // A thin crescent moon, fading as the sky brightens.
    g.alpha(1 - seg(t, 2, 6) * 0.6)
    softGlow(g, moonX, moonY, 16, 0.6, '#c9c6ff')
    drawCrescent(g, moonX, moonY, 5, '#fff6d8')
    g.reset()

    // Thin clouds catch the first light on their undersides.
    const cy0 = Math.round(hy * 0.22) + Math.round(tiltNow * 0.5)
    const cx0 = -Math.round(pan * 0.2) - 20 + Math.round(t * 2)
    g.draw(this.clouds[0], cx0, cy0)
    g.alpha(seg(t, 0.5, 5.2))
    g.draw(this.clouds[1], cx0, cy0)
    g.reset()

    // Dawn glow rising behind the city.
    const glow = 0.4 + seg(t, 0.5, 5.2) * 1.2
    softGlow(g, Math.round(w * 0.62) + px(0.2), hy + tiltNow - 6, Math.round(w * 1.1), glow, '#ff8a70', 0.55)
    softGlow(g, Math.round(w * 0.62) + px(0.2), hy + tiltNow - 2, Math.round(w * 0.55), glow * 0.8, '#ffd08a', 0.5)

    // Skyline layers.
    const layerY = (f: number) => Math.round(tiltNow * f)
    g.draw(this.far.body, px(0.3), layerY(1))
    g.alpha(0.5 + 0.5 * (1 - seg(t, 2, 5)))
    g.draw(this.far.lights, px(0.3), layerY(1))
    g.reset()
    g.draw(this.mid.body, px(0.55), layerY(1))
    g.alpha(1 - seg(t, 2.5, 5.5) * 0.35)
    g.draw(this.mid.lights, px(0.55), layerY(1))
    g.reset()
    // Skytrain glides across on its guideway.
    g.draw(this.guide, px(0.55), layerY(1))
    const tx = tw(t, 0.6, 5.6, -120, LW - 20, E.linear) + px(0.55)
    drawSkytrain(g, tx, this.beamY + layerY(1), 3, 1, { body: '#3a3468', stripe: '#46c07a', roof: '#6a5fa0', win: '#ffe7a8', dark: '#1a1638' })
    softGlow(g, Math.round(tx + 110), this.beamY + layerY(1) - 3, 10, 1, '#fff3c4')

    // Far bank with the floodlit prang.
    g.draw(this.bank, px(1), layerY(1))
    g.draw(this.bankLights, px(1), layerY(1))
    const pX = this.prangX + px(1) - Math.round(this.prang.width / 2) + 20
    const pY = hy + layerY(1) - this.prang.height + 1
    softGlow(g, pX + this.prang.width / 2, pY + this.prang.height * 0.6, Math.round(this.prang.height * 0.7), 1.1, '#ffcf7a')
    g.draw(this.prang, pX, pY)

    // River.
    const ry = hy + layerY(1) + 3
    g.draw(this.river, px(1), ry)
    // Reflected dawn.
    softGlow(g, Math.round(w * 0.62) + px(0.2), ry + 4, Math.round(w * 0.6), glow * 0.5, '#ff9a7a', 0.35)
    // Prang reflection: flipped, rippled rows.
    const prh = this.prang.height
    g.alpha(0.45)
    for (let yy = 0; yy < prh; yy += 1) {
      const src = prh - 1 - yy
      const off = Math.round(Math.sin(yy * 0.7 + t * 4) * (1 + yy * 0.02))
      if (yy % 3 === 2) continue
      g.ctx.drawImage(this.prang, 0, src, this.prang.width, 1, pX + off, ry + Math.round(yy * 0.8), this.prang.width, 1)
    }
    g.reset()
    // Shimmer on the water.
    for (let i = 0; i < 46; i++) {
      const y = ry + 3 + Math.round(h01(i * 5 + 9) * (h - ry))
      const len = 2 + Math.round(h01(i * 5 + 7) * 5)
      const x = Math.round(((h01(i * 5 + 3) * (w + 40) + t * (4 + h01(i) * 5)) % (w + 40)) - 20)
      const on = Math.sin(t * 2.4 + i * 1.3) > -0.2
      if (!on) continue
      const near = 1 - (y - ry) / (h - ry + 1)
      g.alpha(0.35 + near * 0.5)
      g.rect(x, y, len, 1, i % 3 === 0 ? '#ffc6a0' : '#9d8ad0')
    }
    g.reset()
    // Window-light streaks.
    for (let i = 0; i < 18; i++) {
      const x = Math.round(h01(i * 13 + 1) * w)
      const len = 6 + Math.round(h01(i * 13 + 2) * 18)
      for (let d = 0; d < len; d += 3) {
        if (Math.sin(t * 5 + i + d) < 0) continue
        g.alpha(0.5 * (1 - d / len))
        g.rect(x + Math.round(Math.sin(d + t * 3)), ry + 2 + d, 2, 1, '#ffd98a')
      }
    }
    g.reset()
    // A long-tail boat with a lantern putters across.
    const boat = longtailSprite()
    const bx = Math.round(tw(t, 0, 6, w * 0.95, w * 0.35, E.linear))
    const by = ry + Math.round((h - ry) * 0.32)
    g.draw(boat.canvas, bx, by, true)
    softGlow(g, bx + 10, by + 4, 6, 1, '#ffcf7a')
    g.px(bx + 10, by + 3, '#fff3c4')

    // Fade in from black.
    const fin = 1 - seg(t, 0, 1.4)
    if (fin > 0) {
      g.alpha(Math.round(fin * 8) / 8)
      g.rect(0, 0, w, h, '#120c1c')
      g.reset()
    }
  }
}

// ---------------------------------------------------------------------------
// Shot 2 — the morning alms round (ตักบาตร) in a quiet soi

const AUNTIE: AvatarLook = {
  ...DEFAULT_LOOK,
  gender: 'f',
  skin: 1,
  hair: 'hair_bun',
  hairColor: 0,
  top: 'top_white',
  bottom: 'bot_sarong',
}

class AlmsShot implements Shot {
  in?: Transition = { kind: 'dissolve', dur: 0.9 }
  dur = 5.2
  zoom = 2
  private w = 0
  private h = 0
  private gy = 0
  private sky!: HTMLCanvasElement
  private far!: HTMLCanvasElement
  private soi!: HTMLCanvasElement
  private lines!: HTMLCanvasElement
  private ground!: HTMLCanvasElement
  private fx = new Particles()
  private popped = false
  private poleX = 0

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    const gy = Math.round(Math.min(h * 0.76, h - 28))
    this.gy = gy
    const WW = w + 60
    this.sky = bakeSky(w, gy + 2, ['#7fb1ea', '#aebfea', '#e9c3bd', '#ffd3a2', '#ffe4b4'], 6)
    this.far = bakeSkyline(WW, gy, gy - 40, { seed: 41, minH: 18, maxH: 60, body: '#cdb9d6', rim: '#e2d2e6', side: '#bfa9cc', windows: 0 }).body
    this.soi = bakeSoi(WW, gy + 2, gy, 3)
    this.poleX = 92
    this.lines = bakePowerLines(WW + 20, gy + 16, this.poleX, gy + 14, 100)
    this.ground = bake(WW, h - gy + 2, (g) => {
      const H = h - gy + 2
      // Pavement tiles.
      g.rect(0, 0, WW, 14, '#ddd3c6')
      for (let x = 0; x < WW; x += 7) g.vline(x, 0, 13, '#c6baac')
      g.hline(0, WW - 1, 6, '#c6baac')
      g.hline(0, WW - 1, 0, '#bfb2a4')
      // Curb.
      g.rect(0, 14, WW, 1, '#f3ede4')
      g.rect(0, 15, WW, 2, '#a89c90')
      for (let x = 0; x < WW; x += 12) g.rect(x, 15, 6, 2, '#e8514a')
      for (let x = 6; x < WW; x += 12) g.rect(x, 15, 6, 2, '#fffaf0')
      // Road.
      g.gradientV(0, 17, WW, H - 17, ['#7a7390', '#6c6583', '#625b78'], 3)
      for (let x = 4; x < WW; x += 20) g.rect(x, 17 + Math.round((H - 17) * 0.55), 9, 1, '#e8e2d8')
      // Drain grate.
      g.rect(30, 17, 8, 2, '#4f4960')
      for (let x = 31; x < 38; x += 2) g.px(x, 17, '#8c8699')
    })
    this.fx = new Particles()
    this.popped = false
    // Warm sprite caches so nothing is built mid-shot.
    for (const pose of ['walk1', 'walk2', 'stand', 'receive'] as MonkPose[]) {
      monkSprite('side', pose, { flip: true })
      monkSprite('side', pose, { flip: true, novice: true })
    }
    villagerSprite(AUNTIE, 'offer')
    villagerSprite(AUNTIE, 'stand')
    dogSprite(DOG_COATS[0], 'sit')
    dogSprite(DOG_COATS[0], 'wag')
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    if (!this.popped && t >= 3.8) {
      this.popped = true
      const camX = this.camX(t)
      const x = 44 - camX
      const y = this.gy - 4
      this.fx.hearts(x, y, 2)
      this.fx.sparkles(x, y - 2, 8, '#fff3a6', 8)
      play(() => sfx.merit())
    }
  }

  private camX(t: number) {
    return cam(t, 0, 6.2, 30, 0, E.inOutSine)
  }

  render(g: Surface, t: number) {
    const { w, h, gy } = this
    const camX = this.camX(t)
    g.rect(0, 0, w, h, '#ffe4b4')
    g.draw(this.sky, 0, 0)
    // Low sun peeking over the rooftops.
    const sunX = Math.round(w * 0.86) - Math.round(camX * 0.1)
    const sunY = gy - 78
    softGlow(g, sunX, sunY, 90, 1, '#ffcf8a')
    g.circle(sunX, sunY, 9, '#fff2c4')
    g.circle(sunX, sunY, 7, '#fffbe6')
    g.draw(this.far, -Math.round(camX * 0.4), 0)
    g.draw(this.soi, -camX, 0)
    g.draw(this.ground, -camX, gy)

    // Spirit house on the corner, the temple dog and the kneeling villager.
    drawSpiritHouse(g, 12 - camX, gy + 3)
    // Mat and food.
    const vx = 26 - camX
    g.rect(vx - 2, gy + 6, 26, 3, '#e8c27a')
    for (let x = vx - 2; x < vx + 24; x += 2) g.px(x, gy + 7, '#c9983a')
    g.hline(vx - 2, vx + 23, gy + 8, '#b8823a')
    const dogFrame = Math.floor(t / 0.22) % 2 ? 'wag' : 'sit'
    const dog = dogSprite(DOG_COATS[0], dogFrame)
    shadow(g, vx - 14, gy + 9, 7)
    g.draw(dog.canvas, vx - 22, gy + 9 - dog.h)
    const offering = t > 3.3 && t < 4.5
    const vs = villagerSprite(AUNTIE, offering ? 'offer' : 'stand')
    shadow(g, vx + 8, gy + 9, 9)
    g.draw(vs.canvas, vx, gy + 9 - vs.h)
    // Silver bowl of rice and a bag of curry.
    g.ellipse(vx + 19, gy + 6, 3, 1.5, '#c9c6d2')
    g.rect(vx + 16, gy + 5, 7, 2, '#b8b4c4')
    g.ellipse(vx + 19, gy + 4.5, 2.5, 1.5, '#fffaf0')
    g.rect(vx + 13, gy + 4, 2, 3, '#f58f35')
    g.px(vx + 13, gy + 3, '#fffaf0')

    // Monks walk in from the right and stop at the villager.
    const stopX = 46
    for (let i = 0; i < 3; i++) {
      const start = stopX + 40 + i * 20
      const end = stopX + i * 20
      const walkEnd = 3.0 + i * 0.12
      const x = Math.round(tw(t, 0, walkEnd, start, end, E.linear)) - camX
      const walking = t < walkEnd
      let pose: MonkPose = 'stand'
      if (walking) pose = (['walk1', 'stand', 'walk2', 'stand'] as MonkPose[])[(Math.floor(t / 0.2) + i) % 4]
      else if (i === 0 && t > 3.15 && t < 4.7) pose = 'receive'
      const m = monkSprite('side', pose, { flip: true, novice: i === 2 })
      shadow(g, x + 7, gy + 12, 8)
      g.draw(m.canvas, x, gy + 12 - m.h)
    }
    // A scoop of rice travels from the villager's hand to the bowl.
    const sp = seg(t, 3.45, 3.85)
    if (sp > 0 && sp < 1) {
      const rx = Math.round(vx + 16 + sp * 10)
      const ry = Math.round(gy - 6 - Math.sin(sp * Math.PI) * 4)
      g.rect(rx, ry, 2, 2, '#fffaf0')
    }

    // The power pole stands at the curb in front of everyone.
    g.draw(this.lines, -Math.round(camX * 1.25), 0)
    this.fx.render(g)

    // Warm morning grade and god rays from the sun.
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'multiply'
    g.ctx.globalAlpha = 0.18
    g.ctx.fillStyle = '#ffc890'
    g.ctx.fillRect(0, 0, w, h)
    g.ctx.restore()
    drawRays(g, sunX, sunY, h * 1.4, 2.1, 0.8, 7, t, 0.13)
    softGlow(g, Math.round(w * 0.55), gy + 8, Math.round(w * 0.7), 0.5, '#ffd08a', 0.25)
    for (let i = 0; i < 14; i++) {
      const x = Math.round((h01(i * 7) * w + t * (2 + h01(i) * 3)) % w)
      const y = Math.round(gy * 0.35 + ((h01(i * 7 + 1) * gy * 0.8 + t * 1.5) % (gy * 0.8)))
      if (Math.sin(t * 2 + i) > 0.1) g.px(x, y, '#fff6d0')
    }
  }
}

/** Soft contact shadow, stretched away from the morning sun. */
function shadow(g: Surface, cx: number, y: number, rx: number) {
  g.alpha(0.22)
  g.ellipse(cx - 3, y - 0.5, rx + 2, 1.6, '#5a3d4f')
  g.reset()
}

// ---------------------------------------------------------------------------
// Shot 3 — tilt up the ubosot facade; the bell rings, pigeons take off

class TempleShot implements Shot {
  in?: Transition = { kind: 'dissolve', dur: 0.8 }
  dur = 5.0
  zoom = 1
  private w = 0
  private h = 0
  private f!: FacadeInfo
  private sky!: HTMLCanvasElement
  private clouds: HTMLCanvasElement[] = []
  private court!: HTMLCanvasElement
  private y0 = 0
  private y1 = 0
  private fx = new Particles()
  private rang = false
  static BELL = 3.3

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    const s = Math.max(0.8, Math.min(1.2, h / 360))
    this.f = bakeGrandFacade(s)
    this.clouds = [bakeCloud(64, 3, '#ffffff', '#f4f0ff', '#d8d4f0'), bakeCloud(44, 8, '#ffffff', '#f4f0ff', '#d8d4f0'), bakeCloud(80, 12, '#ffffff', '#f4f0ff', '#d8d4f0')]
    const f = this.f
    // Start: stairs and doors fill the frame; end: chofas against the sky.
    this.y0 = h - Math.round(h * 0.1) - f.gy
    this.y1 = Math.round(h * 0.2) - f.top
    if (this.y1 < this.y0 + 40) this.y1 = this.y0 + 40
    this.sky = bakeSky(w, h + Math.ceil((this.y1 - this.y0) * 0.25) + 2, ['#4f9bea', '#7fbdf5', '#b5dcff', '#e6f2ff', '#fff0d4'], 6)
    this.court = bake(w + 40, 80, (g) => {
      g.rect(0, 0, w + 40, 80, '#e9dcc6')
      for (let y = 0; y < 80; y += 6) g.hline(0, w + 39, y, '#d6c6ad')
      for (let y = 0; y < 80; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < w + 40; x += 12) g.vline(x, y, y + 5, '#d6c6ad')
      g.rect(0, 0, w + 40, 2, '#c9b89e')
    })
    this.fx = new Particles()
    this.rang = false
    for (const f of ['a', 'b', 'fly'] as const) birdSprite(f, '#b9b3c8')
  }

  private fy(t: number) {
    return cam(t, 0.2, TempleShot.BELL, this.y0, this.y1, E.inOutCubic)
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    if (!this.rang && t >= TempleShot.BELL) {
      this.rang = true
      play(() => sfx.bigBell())
      const f = this.f
      const ox = Math.round(this.w / 2) - f.cx
      const oy = this.fy(t)
      for (const [x, y] of f.glints.slice(0, 3)) this.fx.sparkles(x + ox, y + oy, 6, '#fff6c2', 10)
    }
  }

  render(g: Surface, t: number) {
    const { w, h, f } = this
    const fy = this.fy(t)
    const ox = Math.round(w / 2) - f.cx
    g.rect(0, 0, w, h, '#fff0d4')
    g.draw(this.sky, 0, Math.round((fy - this.y1) * 0.25))
    g.rect(0, h - 1, w, 1, '#fff0d4')
    this.clouds.forEach((c, i) => {
      const x = Math.round(((i * 83 + t * (3 + i)) % (w + 90)) - 60)
      g.draw(c, x, Math.round(h * (0.08 + i * 0.13)) + Math.round((fy - this.y1) * 0.3))
    })
    softGlow(g, w - 10, 10, 120, 0.8, '#fff3c4')
    g.draw(f.canvas, ox, fy)
    g.draw(this.court, -20, fy + f.gy - 1)

    // Chofa glints ripple after the bell.
    const tb = t - TempleShot.BELL
    f.glints.forEach(([gx, gyy], i) => {
      const ph = ((t * 0.9 + i * 0.37) % 2.2) / 0.5
      const k = tb > -0.6 ? Math.max(0, 1 - Math.abs(ph - 1)) : 0
      glint(g, gx + ox, gyy + fy, k)
    })
    // Bell shimmer: a warm pulse of light around the roof.
    if (tb > 0) softGlow(g, Math.round(w / 2), f.peak + fy, Math.round(w * 0.8), Math.max(0, 1 - tb / 1.6) * 0.8, '#ffe7a0')

    // Pigeons sit on the roof edges, then take off with the bell.
    f.perches.forEach(([px, py], i) => {
      for (let j = 0; j < 2; j++) {
        const n = i * 2 + j
        const x0 = px + ox + j * 5 - 2
        const y0 = py + fy - 3
        const d = tb - h01(n + 3) * 0.35
        if (d <= 0) {
          const b = birdSprite(Math.floor(t * 1.3 + n) % 3 === 0 ? 'b' : 'a', '#b9b3c8')
          g.draw(b.canvas, x0 - 3, y0 - 3, n % 2 === 0)
        } else {
          const dir = h01(n) < 0.5 ? -1 : 1
          const x = x0 + dir * (18 * d + 16 * d * d)
          const y = y0 - (26 * d + 14 * d * d) + Math.sin(d * 9 + n) * 2
          const b = birdSprite(Math.floor(d * 10 + n) % 2 ? 'fly' : 'a', '#b9b3c8')
          g.draw(b.canvas, Math.round(x) - 3, Math.round(y) - 3, dir < 0)
        }
      }
    })
    this.fx.render(g)
    drawRays(g, w + 20, -30, h * 1.3, 2.1, 0.6, 5, t, 0.08)
  }
}

// ---------------------------------------------------------------------------
// Shot 4 — close-up of the lotus pond: a flower opens, koi circle below

class LotusShot implements Shot {
  in?: Transition = { kind: 'dissolve', dur: 0.8 }
  dur = 3.4
  zoom = 1
  private w = 0
  private h = 0
  private water!: HTMLCanvasElement
  private pads!: HTMLCanvasElement
  private fx = new Particles()
  private chimed = false

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    this.water = bake(w, h + 40, (g) => {
      g.gradientV(0, 0, w, h + 40, ramp(['#1f5a66', '#2b7478', '#3a8c86', '#2f7a7c', '#1d5260'], 14), 4)
    })
    const r = seeded(77)
    this.pads = bake(w + 20, h + 40, (g) => {
      const cy = (h + 40) * 0.5
      const spots: [number, number, number][] = []
      for (let i = 0; i < 40; i++) {
        const x = r() * (w + 20)
        const y = r() * (h + 40)
        // Keep the middle clear for the flower, and leave open water for the koi.
        if (Math.abs(x - (w + 20) / 2) < 44 && Math.abs(y - cy) < 44) continue
        if (spots.some(([sx, sy, sr]) => Math.hypot(sx - x, (sy - y) * 1.8) < sr + 12)) continue
        spots.push([x, y, 11 + r() * 14])
      }
      spots.push([(w + 20) / 2 + 4, cy + 26, 30])
      spots.sort((a, b) => a[1] - b[1])
      for (const [x, y, rr] of spots) drawPad(g, x, y, rr, r() * Math.PI * 2)
    })
    this.fx = new Particles()
    this.chimed = false
  }

  private open(t: number) {
    return E.outCubic(seg(t, 0.3, 2.6))
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    const o = this.open(t)
    if (o > 0.5) {
      if (!this.chimed) {
        this.chimed = true
        play(() => sfx.chime())
      }
      if (Math.random() < dt * 14) {
        const cx = this.w / 2
        const cy = this.flowerY(t) - 8
        this.fx.add({ kind: 'sparkle', x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 10, vy: -14 - Math.random() * 10, vx: (Math.random() - 0.5) * 6, max: 1.4, color: Math.random() < 0.5 ? '#fff3a6' : '#ffd6e6' })
      }
    }
  }

  private flowerY(t: number) {
    return Math.round(this.h * 0.52) + cam(t, 0, 4.4, 10, -6, E.inOutSine)
  }

  render(g: Surface, t: number) {
    const { w, h } = this
    const drift = cam(t, 0, 4.4, 10, -6, E.inOutSine)
    g.draw(this.water, 0, -20 + drift)
    // Koi circling beneath the surface.
    for (let i = 0; i < 5; i++) {
      const a = t * (0.5 + i * 0.08) + i * 1.3
      const R = 40 + i * 14
      const kx = w / 2 + Math.cos(a) * R * (i % 2 ? 1 : -1)
      const ky = h * 0.52 + Math.sin(a) * R * 0.55 + drift
      const heading = a + (i % 2 ? Math.PI / 2 : -Math.PI / 2) * 1
      const hx = i % 2 ? -Math.sin(a) : Math.sin(a)
      const hy = Math.cos(a) * 0.55
      g.alpha(0.3)
      drawKoi(g, kx + 3, ky + 4, Math.atan2(hy, hx), t + i, 0, 15)
      g.alpha(0.85)
      drawKoi(g, kx, ky, Math.atan2(hy, hx), t + i, i, 15)
      void heading
    }
    g.reset()
    // Ripple rings.
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.5 + i * 0.25) % 1)
      const x = w * (0.2 + h01(i) * 0.6)
      const y = h * (0.25 + h01(i + 9) * 0.5) + drift
      g.alpha((1 - p) * 0.5)
      drawRing(g, x, y, 4 + p * 14, (4 + p * 14) * 0.45, '#b9ece0')
    }
    g.reset()
    g.draw(this.pads, -10, -20 + drift)
    // The flower rises from its pad and opens.
    const fy = this.flowerY(t)
    const o = this.open(t)
    softGlow(g, w / 2, fy - 12, 60, 0.3 + o * 0.9, '#ffd6e6')
    drawLotus(g, Math.round(w / 2), fy, 38, o)
    softGlow(g, w / 2, fy - 14, 22, o * 0.5, '#fff3c4')
    // Surface shimmer.
    for (let i = 0; i < 30; i++) {
      const y = Math.round(h01(i * 3 + 1) * h)
      const x = Math.round((h01(i * 3 + 2) * (w + 20) + t * 6) % (w + 20)) - 10
      if (Math.sin(t * 3 + i) > 0.3) {
        g.alpha(0.5)
        g.rect(x, y, 3 + (i % 3), 1, '#c8f5ea')
      }
    }
    g.reset()
    this.fx.render(g)
    drawRays(g, w * 0.8, -40, h * 1.3, 2.0, 0.5, 4, t, 0.07)
  }
}

// ---------------------------------------------------------------------------
// Shot 5 — the logo

class LogoShot implements Shot {
  in?: Transition = { kind: 'flash', dur: 0.8 }
  dur = 3.8
  zoom = 1
  private w = 0
  private h = 0
  private bg!: HTMLCanvasElement
  private fx = new Particles()
  private landed = false
  private shone = false

  bake(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = bake(w, h, (g) => {
      g.gradientV(0, 0, w, h, ramp(['#ffb58f', '#ffd29a', '#ffe7b0', '#ffd6a4', '#f7a79a'], 16), 5)
    })
    this.fx = new Particles()
    this.landed = false
    this.shone = false
    logoArt()
    wordmarkSprite('#fff6e4', '#8a3f4e')
    drawLogo(new Surface(4, 4), 0, 0, 0.5)
  }

  logoPos(t: number) {
    const L = logoArt()
    const x = Math.round(this.w / 2 - L.w / 2)
    const yEnd = Math.round(this.h * 0.44 - L.h / 2)
    const y = Math.round(tw(t, 0.25, 1.05, yEnd - 40, yEnd, E.outBack))
    return { x, y, L }
  }

  update(dt: number, t: number) {
    this.fx.update(dt)
    const { x, y, L } = this.logoPos(t)
    if (!this.landed && t >= 1.05) {
      this.landed = true
      play(() => sfx.chime())
      for (let i = 0; i < 5; i++) this.fx.sparkles(x + L.w * (0.1 + i * 0.2), y + L.h * 0.5, 5, i % 2 ? '#fff3a6' : '#ffffff', 16)
    }
    if (!this.shone && t >= 1.7) {
      this.shone = true
      play(() => sfx.sparkle())
    }
    if (t > 1 && Math.random() < dt * 6) {
      this.fx.add({ kind: 'petal', x: Math.random() * this.w, y: -4, vy: 14 + Math.random() * 8, vx: -4 + Math.random() * 2, max: this.h / 14, color: '#ff9fc0', color2: '#ffd6e0' })
    }
    if (t > 1 && Math.random() < dt * 5) {
      this.fx.add({ kind: 'sparkle', x: x + Math.random() * L.w, y: y + Math.random() * L.h, max: 0.8, color: '#ffffff' })
    }
  }

  render(g: Surface, t: number) {
    const { w, h } = this
    const { x, y, L } = this.logoPos(t)
    g.draw(this.bg, 0, 0)
    const cy = y + L.h / 2
    drawSunburst(g, w / 2, cy, Math.max(w, h), 16, t * 0.12, '#fff6d8', 0.22)
    softGlow(g, w / 2, cy, Math.round(w * 0.75), 1, '#fff3c4')
    // Lotus emblem blooming behind the top of the logo.
    const lo = E.outCubic(seg(t, 0.6, 1.6))
    drawLotus(g, Math.round(w / 2), y - 6, 18, lo)
    const alpha = seg(t, 0.2, 0.45)
    g.alpha(alpha)
    drawLogo(g, x, y, seg(t, 1.6, 2.4))
    g.reset()
    // Wordmark.
    const wm = wordmarkSprite('#fff6e4', '#8a3f4e')
    g.alpha(seg(t, 1.3, 1.9))
    g.draw(wm.canvas, Math.round(w / 2 - wm.w / 2), y + L.h + 5 + Math.round((1 - seg(t, 1.3, 1.9)) * 4))
    g.reset()
    this.fx.render(g)
  }
}

// ---------------------------------------------------------------------------

export class IntroCutscene implements Scene {
  private dir: Director

  constructor(ev: CutsceneEvents) {
    const shots: Shot[] = [
      new SkylineShot(),
      new AlmsShot(),
      new TempleShot(),
      new LotusShot(),
      new LogoShot(),
    ]
    this.dir = new Director(shots, ev, {
      captions: [
        { at: 1.0, until: 4.6, text: 'ทุกเช้าที่กรุงเทพฯ…' },
        { at: 5.6, until: 9.8, text: '…มีเรื่องเล็ก ๆ ที่ทำให้ใจอิ่มบุญ' },
        { at: 11.2, until: 14.8, text: 'สวดมนต์ ไหว้พระ ทำบุญ' },
        { at: 20.0, until: 99, text: 'ทำบุญทุกวัน ใจฟูทุกวัน' },
      ],
      doneAt: 21.8,
      letterbox: (t) => Math.min(seg(t, 0, 1), 1 - seg(t, 18.2, 19.0)),
    })
  }

  resize(w: number, h: number) {
    this.dir.resize(w, h)
  }
  update(dt: number) {
    this.dir.update(dt)
  }
  render(g: Surface) {
    this.dir.render(g)
  }
  skip() {
    this.dir.skip()
  }
  /** Dev helper: jump to a time silently. */
  seek(t: number) {
    this.dir.seek(t)
  }
}
