// ให้อาหารปลาดุก – a crowd of whiskered catfish at the temple pier pop their
// heads up with mouths wide open. Tap an open mouth to toss food in: the
// lucky fish leaps out of the water with a splash.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { bakeRiver, drawCatfishBack, drawCatfishHead, drawCatfishLeap, drawFoodBowl, drawLongtail } from '../../art/jobs'
import { P } from '../../art/palette'
import { JobScene, type JobSummary } from './base'
import { Worker } from './worker'
import { Life } from './life'
import { wsfx } from './workSfx'
import { WP } from '../../art/poses/work'
import { glow, sunRays } from '../../art/workFx'

const GULP = 0.28

const TARGET = 20

type HeadState = 'rise' | 'open' | 'gulp' | 'sink' | 'leap'

interface Head {
  x: number
  y: number
  s: number
  state: HeadState
  t: number
  dur: number
  albino: boolean
  /** Leap: time in the air and jump speed. */
  lt: number
  lv: number
  dir: number
}

interface Toss {
  sx: number
  sy: number
  tx: number
  ty: number
  t: number
}

interface Back {
  x: number
  y: number
  s: number
  dir: number
  ph: number
  v: number
}

export class CatfishScene extends JobScene {
  duration = 30
  thresholds: [number, number, number] = [8 / TARGET, 14 / TARGET, 1]
  fed = 0
  combo = 0
  best = 0
  misses = 0
  heads: Head[] = []
  private tosses: Toss[] = []
  private backs: Back[] = []
  private bg: HTMLCanvasElement | null = null
  private horizon = 100
  private pierY = 320
  private spawnT = 0.3
  private cool = 0
  private albinoDone = false
  private tossT = 0

  progress() {
    return Math.min(1, this.fed / TARGET)
  }
  goalText() {
    return `ป้อนปลาดุก ${Math.min(this.fed, TARGET)}/${TARGET} คำ`
  }
  cheerText() {
    return 'ปลาดุกอิ่มแปล้!'
  }
  summary(): JobSummary {
    return {
      title: this.fed >= TARGET ? 'ปลาดุกอิ่มแปล้ทั้งท่าน้ำ!' : undefined,
      lines: [`ป้อนลงปากได้ ${this.fed} คำ`, `คอมโบสูงสุด x${this.best}`],
      events: { catfish_fed: this.fed },
    }
  }

  protected anchor() {
    this.horizon = Math.round(this.top + this.playH * 0.2)
    this.pierY = this.bottom - 26
    this.bg = bakeRiver(this.w, this.h, this.horizon, this.pierY)
    const hx = this.cx + 22
    if (!this.worker) this.worker = new Worker(hx, this.bottom - 3)
    else if (this.phase === 'ready') this.worker.place(hx, this.bottom - 3)
    this.worker.view = 'back'
    this.worker.pose = WP.scoopBack
    this.worker.follow = 6
    this.life = new Life().kid(16, this.bottom - 3).kid(this.w - 16, this.bottom - 4, undefined, true).dragonflies(2, [10, this.horizon + 10, this.w - 10, this.pierY - 40])
  }

  protected populate() {
    this.heads = []
    this.backs = []
    for (let i = 0; i < 14; i++) {
      const depth = rand(0.35, 1)
      this.backs.push({ x: rand(0, this.w), y: this.horizon + 20 + depth * (this.pierY - this.horizon - 30), s: 0.6 + depth * 0.5, dir: Math.random() < 0.5 ? 1 : -1, ph: rand(0, 6), v: rand(3, 8) })
    }
    this.fed = 0
  }

  private spawnHead() {
    const open = this.heads.filter((h) => h.state !== 'leap').length
    if (open >= 4) return
    const albino = !this.albinoDone && this.elapsed > 8 && Math.random() < 0.18
    for (let k = 0; k < 12; k++) {
      const depth = rand(0, 1)
      const y = Math.round(this.horizon + 34 + depth * (this.pierY - this.horizon - 56))
      const x = rand(22, this.w - 22)
      if (this.heads.some((h) => Math.abs(h.x - x) < 26 && Math.abs(h.y - y) < 20)) continue
      const s = (1.15 + depth * 0.5) * (albino ? 1.3 : 1)
      const quick = Math.max(0, Math.min(1, this.elapsed / this.duration))
      this.heads.push({ x, y, s, state: 'rise', t: 0, dur: (albino ? 2.4 : rand(1.5, 2.1)) - quick * 0.4, albino, lt: 0, lv: 0, dir: Math.random() < 0.5 ? 1 : -1 })
      if (albino) {
        this.albinoDone = true
        this.say(x, y - 22, 'ปลาดุกเผือกตัวอ้วน! ได้ 3 คำ', 'good', 1.8)
      }
      sfx.plop()
      return
    }
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down' || this.cool > 0) return
    if (e.y < this.horizon - 10 || e.y > this.pierY) return
    this.cool = 0.12
    const wk = this.worker!
    wk.goTo(Math.max(this.cx - 50, Math.min(this.cx + 50, this.cx + 22 + (e.x - this.cx) * 0.45)), this.bottom - 3)
    wk.pose = WP.tossBack1
    this.tossT = 0.2
    const [hx, hy] = wk.wrist('R')
    this.tosses.push({ sx: hx, sy: hy - 2, tx: e.x, ty: e.y + 4, t: 0 })
    wsfx.toss()
    haptic(5)
  }

  private land(tz: Toss) {
    let best: Head | null = null
    let bd = 1e9
    for (const h of this.heads) {
      if (h.state === 'leap' || h.state === 'sink' || h.state === 'gulp') continue
      if (h.state === 'rise' && h.t < 0.12) continue
      const mx = h.x
      const my = h.y - 12 * h.s
      const d = Math.hypot((tz.tx - mx) / 1.2, tz.ty - 4 - my)
      if (d < 11 * h.s && d < bd) (bd = d), (best = h)
    }
    if (best) {
      const h = best
      h.state = 'gulp'
      h.t = 0
      const n = h.albino ? 3 : 1
      this.fed += n
      this.combo++
      this.best = Math.max(this.best, this.combo)
      wsfx.bigGulp()
      sfx.munch()
      haptic(h.albino ? 30 : 14)
      this.particles.popText(h.x, h.y - 26 * h.s, this.combo >= 3 ? `x${this.combo}` : `+${n}`, this.combo >= 3 ? '#ffd54f' : '#fff2a0')
      this.particles.sparkles(h.x, h.y - 14 * h.s, h.albino ? 10 : 4, '#fff3a6')
      if (this.combo >= 2) wsfx.combo(this.combo)
      if (this.combo === 5) this.praise('งับเก่งมาก!', 'gold', 1.1)
      else if (this.combo === 10) this.praise('แม่นสุด ๆ!', 'pink', 1.1)
      else if (this.combo === 15) this.praise('เซียนปลาดุก!', 'pink', 1.2)
      if (h.albino) this.praise('ปลาดุกเผือก +3!', 'blue', 1.1)
      if (this.fed >= TARGET) {
        this.particles.confetti(this.cx, this.horizon + 20, 40)
        sfx.chime()
      }
    } else {
      // Missed: it plops in and the crowd thrashes for it.
      this.combo = 0
      this.misses++
      if (this.misses % 5 === 0) this.worker?.reactWith('oops', 0.7)
      this.splash(tz.tx, tz.ty, 0.6)
      sfx.plop()
      if (this.misses % 4 === 1) this.say(tz.tx, tz.ty - 12, 'แตะที่ปากที่อ้าอยู่นะ', 'info', 1.2)
      for (const b of this.backs) if (Math.hypot(b.x - tz.tx, b.y - tz.ty) < 30) b.v = 30 * Math.sign(tz.tx - b.x || 1)
    }
  }

  private splash(x: number, y: number, k: number) {
    this.particles.add({ kind: 'ripple', x, y, max: 0.9, size: 12 * k + 6, color: '#e6f2d8' })
    for (let i = 0; i < Math.round(12 * k); i++)
      this.particles.add({ kind: 'drop', x: x + rand(-4, 4), y, vx: rand(-40, 40) * k, vy: rand(-90, -40) * k, g: 260, max: rand(0.4, 0.7), color: i % 2 ? '#ffffff' : '#c8e0a8', size: 2, color2: '#e6f2d8' })
  }

  protected tick(dt: number) {
    this.cool -= dt
    if (this.tossT > 0) {
      this.tossT -= dt
      if (this.tossT <= 0 && this.worker) this.worker.pose = WP.scoopBack
    }
    if (this.playing) {
      this.spawnT -= dt
      if (this.spawnT <= 0) {
        this.spawnHead()
        this.spawnT = rand(0.35, 0.75)
      }
    }
    for (const h of this.heads) {
      h.t += dt
      if (h.state === 'rise' && h.t > 0.22) (h.state = 'open'), (h.t = 0)
      else if (h.state === 'gulp' && h.t > GULP) {
        h.state = 'leap'
        h.lt = 0
        h.lv = 130 + h.s * 20
        this.splash(h.x, h.y, 0.5)
      }
      else if (h.state === 'open' && h.t > h.dur) {
        h.state = 'sink'
        h.t = 0
      } else if (h.state === 'leap') {
        h.lt += dt
        const yy = h.lv * h.lt - 0.5 * 320 * h.lt * h.lt
        if (h.lt > 0.1 && yy <= 0) {
          h.state = 'sink'
          h.t = 1
          this.splash(h.x + h.dir * 8, h.y, h.albino ? 1.4 : 1)
          sfx.splash()
          this.shake(0.12, 1)
        }
      }
    }
    this.heads = this.heads.filter((h) => !(h.state === 'sink' && h.t > 0.25))
    for (const tz of this.tosses) {
      tz.t += dt / 0.3
      if (tz.t >= 1) this.land(tz)
    }
    this.tosses = this.tosses.filter((tz) => tz.t < 1)
    for (const b of this.backs) {
      b.x += b.dir * b.v * dt
      b.v += (5 - b.v) * dt * 1.5
      if (b.x < -14) (b.x = this.w + 12), (b.dir = -1)
      if (b.x > this.w + 14) (b.x = -12), (b.dir = 1)
      if (Math.random() < dt * 0.25) this.particles.add({ kind: 'drop', x: b.x, y: b.y - 1, vx: rand(-15, 15), vy: rand(-40, -20), g: 200, max: 0.4, color: '#ffffff' })
    }
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    drawLongtail(g, ((this.t * 9) % (this.w + 60)) - 30, this.horizon + 5, this.t)
    const backs = [...this.backs].sort((a, b) => a.y - b.y)
    const heads = [...this.heads].sort((a, b) => a.y - b.y)
    let hi = 0
    for (const b of backs) {
      while (hi < heads.length && heads[hi].y < b.y) this.drawHead(g, heads[hi++])
      drawCatfishBack(g, b.x, b.y, b.s, b.dir, this.t, b.ph)
    }
    while (hi < heads.length) this.drawHead(g, heads[hi++])
    drawFoodBowl(g, this.cx, this.bottom - 6)
    this.life?.drawGround(g)
    this.worker?.draw(g)
    // Food in flight.
    for (const tz of this.tosses) {
      const t = tz.t
      const x = tz.sx + (tz.tx - tz.sx) * t
      const y = tz.sy + (tz.ty - tz.sy) * t - Math.sin(t * Math.PI) * 30
      g.rect(x - 2, y - 2, 4, 4, P.ink)
      g.rect(x - 1, y - 1, 2, 2, '#e8c07a')
      g.px(x - 1, y - 1, '#fff3c8')
    }
    this.life?.drawAir(g)
    glow(g, this.w * 0.5, this.horizon, 90, 0.18, '#ffe0a0')
    sunRays(g, this.w, this.h, this.t, '#fff2c4', 0.12, this.top - 20)
  }

  private drawHead(g: Surface, h: Head) {
    if (h.state === 'leap') {
      const yy = h.lv * h.lt - 0.5 * 320 * h.lt * h.lt
      const vy = h.lv - 320 * h.lt
      const ang = Math.atan2(-vy, h.dir * 40)
      drawCatfishLeap(g, h.x + h.dir * h.lt * 40, h.y - yy - 6, ang, h.s, this.t, h.albino, h.dir)
      return
    }
    if (h.state === 'gulp') {
      // Big chomp: the head pops up, swells and snaps shut with puffed cheeks.
      const k = Math.sin(Math.PI * Math.min(1, h.t / GULP))
      const s = h.s * (1 + 0.5 * k)
      const y = h.y - k * 6 * h.s
      drawCatfishHead(g, h.x, y, s, 1, h.t < 0.06 ? 1 : 0, this.t, h.albino)
      const my = y - 14 * s + 3.2 * s
      for (const side of [-1, 1]) {
        g.ellipse(h.x + side * 5.5 * s, my + 3 * s, 2.6 * s * (0.6 + k * 0.4) + 1, 2 * s + 1, P.ink)
        g.ellipse(h.x + side * 5.5 * s, my + 3 * s, 2.6 * s * (0.6 + k * 0.4), 2 * s, h.albino ? '#f7d4c6' : '#7a746a')
      }
      if (k > 0.5) for (let i = 0; i < 2; i++) this.particles.add({ kind: 'drop', x: h.x + rand(-6, 6) * s, y: y - 4, vx: rand(-30, 30), vy: rand(-50, -20), g: 220, max: 0.35, color: '#e6f2d8', size: 1 })
      return
    }
    const rise = h.state === 'rise' ? h.t / 0.22 : h.state === 'sink' ? Math.max(0, 1 - h.t / 0.25) : 1
    const open = h.state === 'open' ? 0.65 + Math.sin(h.t * 16) * 0.35 : 0.2
    drawCatfishHead(g, h.x, h.y, h.s, rise, open, this.t, h.albino)
    // Closing soon: a little blink of the water ring.
    if (h.state === 'open' && h.dur - h.t < 0.4 && Math.floor(h.t * 12) % 2 === 0) g.px(h.x, h.y - 16 * h.s, '#ffffff')
  }
}
