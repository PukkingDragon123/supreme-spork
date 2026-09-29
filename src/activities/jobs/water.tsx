// รดน้ำต้นไม้ – hold the watering can over each pot and let go when the gauge
// reaches the green band. Just right: the plant perks up, blooms and a
// butterfly comes to visit. Too much: it spills over the rim.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { bakeKutiGarden, drawButterfly, drawGauge, drawPlant, drawPot, drawWateringCan, type PlantKind } from '../../art/jobs'
import { toStars, type JobStars } from '../../game/jobs'
import { Drag, JobScene, type JobSummary } from './base'

const RATE = 0.36
const SETTLE = 0.45

interface Pot {
  x: number
  size: number
  kind: PlantKind
  level: number
  lo: number
  hi: number
  done: boolean
  over: boolean
  bloom: number
  life: number
  still: number
  spill: number
  seed: number
}

interface Fly {
  x: number
  y: number
  pot: number
  t: number
  color: number
}

export class WaterScene extends JobScene {
  duration = 40
  thresholds: [number, number, number] = [0.4, 0.8, 1]
  pots: Pot[] = []
  flies: Fly[] = []
  private bg: HTMLCanvasElement | null = null
  private ledgeY = 200
  private drag = new Drag()
  private holding = false
  private tilt = 0
  private canX = 150
  private canY = 300
  private pourSfx = 0
  private hinted = false

  get good() {
    return this.pots.filter((p) => p.done && !p.over).length
  }
  get over() {
    return this.pots.filter((p) => p.over).length
  }
  progress() {
    return this.pots.length ? this.pots.filter((p) => p.done).length / this.pots.length : 0
  }
  stars(): JobStars {
    const p = this.progress()
    const base = p >= 1 ? 3 : p >= 0.8 ? 2 : p >= 0.4 ? 1 : 0
    const pen = this.over >= 3 ? 2 : this.over >= 1 ? 1 : 0
    return toStars(base === 0 ? 0 : Math.max(1, base - pen))
  }
  goalText() {
    return `รดพอดี ${this.good}/${this.pots.length}${this.over ? ` · ล้น ${this.over}` : ''}`
  }
  summary(): JobSummary {
    return {
      title: this.good === this.pots.length ? 'ดอกไม้บานสะพรั่งทั้งสวน!' : undefined,
      lines: [`รดน้ำพอดี ${this.good} กระถาง`, `น้ำล้น ${this.over} กระถาง`, `ผีเสื้อมาเยี่ยม ${this.flies.length} ตัว`],
    }
  }

  /** Spout tip: up and left of the finger so the pot stays visible. */
  private get spout(): [number, number] {
    return [this.canX - 16, this.canY - 22]
  }

  protected anchor() {
    this.ledgeY = Math.round(this.top + this.playH * 0.58)
    this.bg = bakeKutiGarden(this.w, this.h, this.ledgeY)
    const n = this.pots.length || 5
    this.pots.forEach((p, i) => (p.x = Math.round(18 + ((this.w - 42) * i) / (n - 1))))
    if (!this.holding) {
      this.canX = this.w - 34
      this.canY = this.bottom - 14
    }
  }

  protected populate() {
    const kinds: PlantKind[] = ['marigold', 'jasmine', 'sunflower', 'orchid', 'rose']
    const n = kinds.length
    this.pots = kinds.map((kind, i) => {
      const lo = rand(0.48, 0.7)
      return {
        x: Math.round(18 + ((this.w - 42) * i) / (n - 1)),
        size: kind === 'sunflower' ? 22 : 18 + (i % 2) * 2,
        kind,
        level: rand(0.04, 0.18),
        lo,
        hi: lo + 0.18,
        done: false,
        over: false,
        bloom: 0,
        life: 0,
        still: 0,
        spill: 0,
        seed: i * 1.9,
      }
    })
    this.flies = []
    this.canX = this.w - 34
    this.canY = this.bottom - 14
  }

  private potTop(p: Pot) {
    return this.ledgeY - Math.round(p.size * 0.85)
  }

  protected input(e: PointerInfo) {
    const d = this.drag
    if (e.type === 'down') {
      if (d.down) return
      d.begin(e)
      this.holding = true
      this.canX = e.x
      this.canY = e.y
      return
    }
    if (e.type === 'move') {
      if (!d.move(e)) return
      this.canX = e.x
      this.canY = e.y
      return
    }
    if (d.end(e)) this.holding = false
  }

  /** The pot the stream currently falls into, if any. */
  private streamPot(): Pot | null {
    const [sx, sy] = this.spout
    for (const p of this.pots) if (Math.abs(sx - p.x) <= p.size / 2 && sy < this.potTop(p)) return p
    return null
  }

  protected tick(dt: number) {
    this.tilt += ((this.holding ? 1 : 0) - this.tilt) * Math.min(1, dt * 12)
    const pouring = this.holding && this.tilt > 0.6 && this.playing
    const target = pouring ? this.streamPot() : null
    const [sx, sy] = this.spout
    if (pouring) {
      this.pourSfx -= dt
      if (this.pourSfx <= 0) {
        sfx.pour(0.35)
        this.pourSfx = 0.3
      }
      for (let i = 0; i < 2; i++)
        this.particles.add({ kind: 'drop', x: sx + rand(-1.5, 1.5), y: sy + 1, vx: rand(-6, 6), vy: rand(10, 30), g: 420, max: target ? Math.sqrt((2 * Math.max(4, this.potTop(target) - sy)) / 420) : 0.5, color: i ? '#b3eef4' : '#78d2e2' })
      if (!target && Math.random() < dt * 10) {
        const gy = sy < this.ledgeY ? this.ledgeY : Math.min(this.bottom - 2, sy + 40)
        this.particles.add({ kind: 'drop', x: sx + rand(-3, 3), y: gy, vx: rand(-20, 20), vy: rand(-30, -10), g: 200, max: 0.3, color: '#b3eef4' })
      }
      if (!this.hinted && !target && this.elapsed > 1) {
        this.hinted = true
        this.say(this.pots[0].x + 10, this.potTop(this.pots[0]) - 34, 'รดตรงกระถางนะ', 'info', 1.4)
      }
    }
    for (const p of this.pots) {
      const into = target === p
      if (into) {
        p.level += RATE * dt
        p.still = 0
        if (Math.random() < dt * 12) this.particles.add({ kind: 'drop', x: p.x + rand(-4, 4), y: this.potTop(p) + 1, vy: rand(-18, -8), g: 120, max: 0.25, color: '#e6fbff' })
        if (p.level > p.hi && !p.over) {
          p.over = true
          p.done = true
          sfx.error()
          haptic(25)
          this.shake(0.15, 1)
          this.say(p.x, this.potTop(p) - 30, 'น้ำล้นแล้ว!', 'warn', 1.3)
        }
      } else p.still += dt
      if (p.level > p.hi) p.spill = Math.min(1, p.spill + dt * 3)
      else p.spill = Math.max(0, p.spill - dt)
      p.level = Math.min(1.1, p.level)
      if (!p.done && p.level >= p.lo && p.level <= p.hi && p.still >= SETTLE) {
        p.done = true
        sfx.sparkle()
        sfx.chime()
        haptic(14)
        this.particles.sparkles(p.x, this.potTop(p) - 16, 10, '#fff3a6')
        this.particles.hearts(p.x, this.potTop(p) - 22, 2, '#ff9fc0')
        this.say(p.x, this.potTop(p) - 32, pick(['พอดีเลย!', 'ชุ่มชื่นจัง', 'ดอกบานแล้ว!']), 'good', 1.2)
        this.flies.push({ x: Math.random() < 0.5 ? -8 : this.w + 8, y: rand(this.top + 10, this.ledgeY - 60), pot: this.pots.indexOf(p), t: rand(0, 6), color: this.flies.length })
        if (this.pots.every((q) => q.done)) {
          this.particles.confetti(this.cx, this.ledgeY - 50, 40, ['#ffd23f', '#ff9fc0', '#86c95f', '#9fd0ff', '#ffffff'])
        }
      }
      const want = p.over ? 0.7 : Math.min(1, 0.15 + (p.level / p.lo) * 0.85)
      p.life += (want - p.life) * Math.min(1, dt * 3)
      p.bloom += ((p.done ? (p.over ? 0.6 : 1) : 0) - p.bloom) * Math.min(1, dt * 4)
    }
    for (const f of this.flies) {
      f.t += dt
      const p = this.pots[f.pot]
      const tx = p.x + Math.cos(f.t * 1.7) * 9
      const ty = this.potTop(p) - 26 + Math.sin(f.t * 2.3) * 6
      f.x += (tx - f.x) * Math.min(1, dt * 1.6)
      f.y += (ty - f.y) * Math.min(1, dt * 1.6)
    }
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    for (const p of this.pots) {
      const top = this.potTop(p)
      drawPlant(g, p.kind, p.x, top + 1, p.life, p.bloom, this.t, p.seed)
      drawPot(g, p.x, this.ledgeY, p.size, Math.min(1, p.level / p.lo), p.spill)
      const state = p.over ? 'over' : p.done ? 'good' : 'dry'
      drawGauge(g, p.x + p.size / 2 + 3, top - 4, 22, p.level, p.lo, p.hi, state, this.t)
      if (p.done && !p.over && Math.sin(this.t * 3 + p.seed) > 0.8) this.particles.add({ kind: 'sparkle', x: p.x + rand(-8, 8), y: top - rand(14, 28), max: 0.4, color: '#fff3a6' })
    }
    for (const f of this.flies) drawButterfly(g, f.x, f.y, f.t, f.color)
    const [sx, sy] = this.spout
    drawWateringCan(g, sx, sy, this.tilt)
    // Aim marker under the spout while holding.
    if (this.holding) {
      const t = this.streamPot()
      const y = t ? this.potTop(t) : this.ledgeY
      if (Math.floor(this.t * 6) % 2) g.px(sx, y - 1, '#ffffff')
    }
  }
}
