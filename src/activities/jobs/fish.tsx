// ให้อาหารปลา – toss pellets to the koi and tilapia until every fish is full,
// but don't overfeed: pellets nobody eats sink and cloud the water.

import type { PointerInfo } from '../../engine/stage'
import { bake, ditherOn, type Surface } from '../../engine/pixel'
import { drawRing } from '../../engine/particles'
import { rand, randInt } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { bakePond, drawLilyPad, drawPondFish, drawTurtle, POND_FISH, type PondFishLook } from '../../art/jobs'
import { P } from '../../art/palette'
import { JobScene, type JobSummary } from './base'
import { toStars, type JobStars } from '../../game/jobs'

interface Pellet {
  x: number
  y: number
  /** Flight from the deck: 0..1 (1 = on the water). */
  fly: number
  sx: number
  sy: number
  life: number
  taken: boolean
}

interface Fish {
  x: number
  y: number
  a: number
  speed: number
  len: number
  look: PondFishLook
  name: string
  seed: number
  need: number
  eaten: number
  target: Pellet | null
  wiggle: number
  gulp: number
  happy: number
}

const SINK = 5

export class FishScene extends JobScene {
  duration = 40
  thresholds: [number, number, number] = [0.4, 0.75, 1]
  fish: Fish[] = []
  pellets: Pellet[] = []
  wasted = 0
  eaten = 0
  private bg: HTMLCanvasElement | null = null
  private pads: { x: number; y: number; r: number; flower: boolean }[] = []
  private turtle: { x: number; y: number; t: number } | null = null
  private cool = 0
  private murk = 0
  private murkLvl = 0
  private murkC: HTMLCanvasElement | null = null

  get needTotal() {
    return this.fish.reduce((s, f) => s + f.need, 0)
  }
  get fullCount() {
    return this.fish.filter((f) => f.eaten >= f.need).length
  }
  progress() {
    const need = this.needTotal
    return need ? Math.min(1, this.fish.reduce((s, f) => s + Math.min(f.need, f.eaten), 0) / need) : 0
  }
  complete() {
    return this.fish.length > 0 && this.fullCount === this.fish.length
  }
  stars(): JobStars {
    const p = this.progress()
    const base = p >= 1 ? 3 : p >= 0.75 ? 2 : p >= 0.4 ? 1 : 0
    const pen = this.wasted >= 7 ? 2 : this.wasted >= 3 ? 1 : 0
    return toStars(base === 0 ? 0 : Math.max(1, base - pen))
  }
  goalText() {
    return `ปลาอิ่ม ${this.fullCount}/${this.fish.length} · จม ${this.wasted}`
  }
  summary(): JobSummary {
    return {
      title: this.complete() && this.wasted <= 2 ? 'ปลาอิ่มทุกตัว น้ำยังใสแจ๋ว!' : undefined,
      lines: [`ปลาอิ่ม ${this.fullCount}/${this.fish.length} ตัว`, `อาหารที่เหลือจม ${this.wasted} เม็ด`],
      events: { koi_fed: this.eaten },
    }
  }

  protected anchor() {
    this.bg = bakePond(this.w, this.h, this.h + 10)
    for (const f of this.fish) this.keepIn(f)
  }

  protected populate() {
    const looks: [string, number][] = [
      ['kohaku', 3],
      ['sanke', 3],
      ['kigoi', 3],
      ['showa', 3],
      ['tilapia', 2],
      ['ruby', 2],
    ]
    this.fish = looks.map(([name, need], i) => ({
      x: rand(30, this.w - 30),
      y: rand(this.top + 30, this.bottom - 40),
      a: rand(0, Math.PI * 2),
      speed: rand(11, 16),
      len: name === 'tilapia' || name === 'ruby' ? randInt(13, 15) : randInt(15, 18),
      look: POND_FISH[name],
      name,
      seed: i * 1.7 + rand(0, 3),
      need,
      eaten: 0,
      target: null,
      wiggle: rand(0, 6),
      gulp: 0,
      happy: 0,
    }))
    this.pads = []
    for (let i = 0; i < 6; i++) this.pads.push({ x: rand(16, this.w - 16), y: rand(this.top + 10, this.bottom - 20), r: rand(6, 9), flower: i % 2 === 0 })
    this.pellets = []
    this.wasted = 0
    this.eaten = 0
  }

  private keepIn(f: Fish) {
    f.x = Math.max(14, Math.min(this.w - 14, f.x))
    f.y = Math.max(this.top + 12, Math.min(this.bottom - 16, f.y))
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down') return
    if (this.cool > 0) return
    if (e.y < this.top + 4 || e.y > this.bottom - 4) return
    this.cool = 0.14
    this.pellets.push({ x: e.x, y: e.y, fly: 0, sx: this.cx + rand(-6, 6), sy: this.bottom + 8, life: SINK, taken: false })
    sfx.tap()
    haptic(5)
  }

  protected tick(dt: number) {
    this.cool -= dt
    const { w } = this
    for (const p of this.pellets) {
      if (p.fly < 1) {
        p.fly = Math.min(1, p.fly + dt * 4)
        if (p.fly >= 1) {
          this.particles.add({ kind: 'ripple', x: p.x, y: p.y, max: 0.8, size: 9, color: '#d4f5fa' })
          sfx.plop()
          // Hungry fish nearby notice.
          for (const f of this.fish) if (!f.target && f.eaten < f.need && Math.hypot(f.x - p.x, f.y - p.y) < 90) f.target = p
        }
        continue
      }
      p.life -= dt
      if (p.life <= 0 && !p.taken) {
        p.taken = true
        this.wasted++
        for (let i = 0; i < 5; i++) this.particles.add({ kind: 'smoke', x: p.x + rand(-3, 3), y: p.y + rand(-2, 2), vy: rand(-2, 2), max: 1.4, color: '#7a8a5a', size: 2 })
        this.say(p.x, p.y - 10, this.wasted >= 3 ? 'น้ำเริ่มขุ่นแล้ว!' : 'จมไปแล้ว...', 'warn', 1.2)
        sfx.error()
      }
    }
    this.pellets = this.pellets.filter((p) => !p.taken)
    this.murk += (Math.min(0.35, this.wasted * 0.045) - this.murk) * Math.min(1, dt * 2)

    for (const f of this.fish) {
      const full = f.eaten >= f.need
      f.wiggle += dt * (f.target ? 13 : 7)
      f.gulp = Math.max(0, f.gulp - dt)
      f.happy = Math.max(0, f.happy - dt)
      if (f.target && (f.target.taken || f.target.fly < 1)) f.target = null
      if (!f.target && !full) {
        let best: Pellet | null = null
        let bd = 80
        for (const p of this.pellets) {
          if (p.fly < 1) continue
          const d = Math.hypot(p.x - f.x, p.y - f.y)
          if (d < bd) (bd = d), (best = p)
        }
        f.target = best
      }
      let desired = f.target ? Math.atan2(f.target.y - f.y, f.target.x - f.x) : f.a + Math.sin(this.t * 0.7 + f.seed) * 0.9
      const m = 22
      if (f.x < m) desired = 0
      else if (f.x > w - m) desired = Math.PI
      if (f.y < this.top + m) desired = Math.PI / 2
      else if (f.y > this.bottom - m) desired = -Math.PI / 2
      let da = desired - f.a
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      f.a += Math.max(-2.8 * dt, Math.min(2.8 * dt, da))
      const sp = f.target ? f.speed * 2.4 : full ? f.speed * 0.6 : f.speed
      f.x += Math.cos(f.a) * sp * dt
      f.y += Math.sin(f.a) * sp * dt
      this.keepIn(f)
      if (f.target && Math.hypot(f.target.x - f.x, f.target.y - f.y) < 4.5) {
        f.target.taken = true
        f.target = null
        f.eaten++
        this.eaten++
        f.gulp = 0.35
        sfx.gulp()
        haptic(8)
        this.particles.add({ kind: 'ripple', x: f.x, y: f.y, max: 0.6, size: 6, color: '#ffffff' })
        for (let i = 0; i < 3; i++) this.particles.add({ kind: 'dot', x: f.x + rand(-2, 2), y: f.y, vy: rand(-12, -6), max: 0.6, color: '#e6fbff' })
        if (f.eaten >= f.need) {
          f.happy = 1.5
          this.particles.hearts(f.x, f.y - 6, 3, '#ff6f91')
          this.particles.sparkles(f.x, f.y, 6, '#fff3a6')
          sfx.sparkle()
          this.say(f.x, f.y - 12, 'อิ่มแล้ว!', 'good', 1)
          if (this.complete()) {
            this.particles.confetti(this.cx, this.top + this.playH * 0.45, 36)
            sfx.chime()
          }
        } else this.particles.popText(f.x, f.y - 10, `${f.eaten}/${f.need}`)
      }
      // Wasted overfeeding: a full fish ignores food near it.
      if (full && Math.random() < dt * 0.4) this.particles.add({ kind: 'dot', x: f.x, y: f.y, vy: -8, max: 0.8, color: '#e6fbff' })
    }
    if (!this.turtle && Math.random() < dt * 0.04) this.turtle = { x: -12, y: rand(this.top + 40, this.bottom - 40), t: 0 }
    if (this.turtle) {
      this.turtle.t += dt
      this.turtle.x += 8 * dt
      if (this.turtle.x > w + 14) this.turtle = null
    }
    if (Math.random() < dt * 2) this.particles.add({ kind: 'sparkle', x: rand(0, w), y: rand(this.top, this.bottom), max: 0.4, color: '#e6fbff' })
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    // Floating pellets (under the fish so they get gobbled).
    for (const p of this.pellets) {
      if (p.fly < 1) continue
      const sink = 1 - p.life / SINK
      if (sink > 0.6 && Math.floor(this.t * 8) % 2 === 0) continue
      g.rect(p.x - 1, p.y - 1, 3, 3, P.ink)
      g.px(p.x, p.y, sink > 0.5 ? '#7a5238' : '#c28e5c')
      g.px(p.x - 1, p.y - 1, sink > 0.5 ? '#6e4a35' : '#9a6a45')
      if (sink < 0.2) drawRing(g, p.x, p.y, 2 + sink * 12, 1 + sink * 6, '#d4f5fa')
    }
    if (this.turtle) drawTurtle(g, this.turtle.x, this.turtle.y, this.turtle.t)
    for (const f of this.fish) drawPondFish(g, f.x, f.y, f.a, f.len, f.wiggle, f.look, f.seed, f.gulp)
    for (const p of this.pads) drawLilyPad(g, p.x, p.y, p.r, p.flower, this.t)
    // Hunger pips / hearts over each fish.
    for (const f of this.fish) {
      const left = f.need - f.eaten
      const y = Math.round(f.y - 10)
      if (left <= 0) {
        if (f.happy > 0 || Math.sin(this.t * 3 + f.seed) > 0.4) {
          g.rect(f.x - 2, y - 1, 2, 1, '#ff6f91')
          g.rect(f.x + 1, y - 1, 2, 1, '#ff6f91')
          g.rect(f.x - 2, y, 5, 1, '#ff6f91')
          g.rect(f.x - 1, y + 1, 3, 1, '#ff6f91')
          g.px(f.x, y + 2, '#ff6f91')
        }
        continue
      }
      for (let i = 0; i < left; i++) {
        const px = Math.round(f.x - (left - 1) * 2 + i * 4)
        g.rect(px - 1, y - 1, 3, 3, P.ink)
        g.px(px, y, '#e8c07a')
      }
    }
    // Pellets in flight.
    for (const p of this.pellets) {
      if (p.fly >= 1) continue
      const t = p.fly
      const x = p.sx + (p.x - p.sx) * t
      const y = p.sy + (p.y - p.sy) * t - Math.sin(t * Math.PI) * 26
      g.px(p.sx + (p.x - p.sx) * t, p.sy + (p.y - p.sy) * t, 'rgba(20,40,70,0.35)')
      g.rect(x - 1, y - 1, 3, 3, P.ink)
      g.px(x, y, '#c28e5c')
    }
    // Cloudy water from wasted food.
    const lvl = Math.round(this.murk * 24)
    if (lvl > 0) {
      if (lvl !== this.murkLvl || !this.murkC) {
        this.murkLvl = lvl
        const t = lvl / 24
        this.murkC = bake(this.w, this.h, (m) => {
          for (let y = 0; y < this.h; y++) for (let x = y & 1; x < this.w; x += 2) if (ditherOn(x, y, t)) m.px(x, y, '#7a8a4a')
        })
      }
      g.draw(this.murkC, 0, 0)
    }
  }
}
