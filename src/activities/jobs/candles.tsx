// จุดเทียนบูชา – hold the taper's flame to each wick to light the candle row.
// Little wind spirits drift in to blow the flames out: tap them away!

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { bakeShrine, drawCandleFlame, drawCandleRail, drawWindPuff } from '../../art/jobs'
import { softGlow } from '../../art/hall'
import { Drag, JobScene, type JobSummary } from './base'
import { Worker } from './worker'
import { wsfx } from './workSfx'
import { reachPose, WP } from '../../art/poses/work'
import { drawLongLighter } from '../../art/workTools'
import { glow, vignette } from '../../art/workFx'

const COUNT = 9
const LIGHT_TIME = 0.35

interface Candle {
  x: number
  h: number
  lit: boolean
  heat: number
  lean: number
  glow: number
}

interface Puff {
  x: number
  y: number
  dir: number
  v: number
  ph: number
  life: number
  gone: number
  target: number
}

export class CandleScene extends JobScene {
  duration = 40
  thresholds: [number, number, number] = [4 / COUNT, 7 / COUNT, 1]
  candles: Candle[] = []
  puffs: Puff[] = []
  dispelled = 0
  blownOut = 0
  private bg: HTMLCanvasElement | null = null
  private drag = new Drag()
  private holding = false
  private tableY = 200
  private railY = 190
  private spawnT = 3
  private hinted = false
  private floorY = 300

  get lit() {
    return this.candles.filter((c) => c.lit).length
  }
  progress() {
    return this.candles.length ? this.lit / this.candles.length : 0
  }
  goalText() {
    return `เทียนติด ${this.lit}/${COUNT} เล่ม`
  }
  cheerText() {
    return 'สว่างไสวทั้งวิหาร!'
  }
  summary(): JobSummary {
    return {
      title: this.lit >= COUNT ? 'แสงเทียนสว่างไสวทั้งวิหาร!' : undefined,
      lines: [`เทียนติด ${this.lit}/${COUNT} เล่ม`, `ปัดลมไป ${this.dispelled} ก้อน`],
    }
  }

  protected anchor() {
    this.tableY = Math.round(this.top + this.playH * 0.6)
    this.railY = this.tableY - 4
    this.bg = bakeShrine(this.w, this.h, this.tableY)
    const x0 = 18
    const x1 = this.w - 18
    this.candles.forEach((c, i) => (c.x = Math.round(x0 + ((x1 - x0) * i) / (COUNT - 1))))
    // The player stands on the floor in front of the altar table.
    this.floorY = Math.min(this.bottom - 2, this.tableY + 56)
    if (!this.worker) this.worker = new Worker(this.cx - 14, this.floorY)
    else if (this.phase === 'ready') this.worker.place(this.cx - 14, this.floorY)
    this.worker.view = 'back'
  }

  protected populate() {
    const x0 = 18
    const x1 = this.w - 18
    this.candles = Array.from({ length: COUNT }, (_, i) => ({
      x: Math.round(x0 + ((x1 - x0) * i) / (COUNT - 1)),
      h: 20 + ((i * 7) % 4) * 3 + (i === 4 ? 5 : 0),
      lit: i === 4,
      heat: 0,
      lean: 0,
      glow: 0,
    }))
    this.puffs = []
  }

  private flameY(c: Candle) {
    return this.railY - 2 - c.h - 6
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') {
      // Tap a wind puff away.
      for (const p of this.puffs) {
        if (p.gone > 0) continue
        if (Math.hypot(e.x - p.x, e.y - p.y) < 14) {
          this.dispel(p)
          return
        }
      }
      if (this.drag.down) return
      this.drag.begin(e)
      this.holding = true
      wsfx.flick()
      return
    }
    if (e.type === 'move') {
      this.drag.move(e)
      return
    }
    if (this.drag.end(e)) this.holding = false
  }

  private dispel(p: Puff) {
    p.gone = 0.3
    this.dispelled++
    this.particles.sparkles(p.x, p.y, 10, '#e6f4ff', 14)
    if (this.dispelled % 3 === 1) this.say(p.x, p.y - 12, pick(['ปุ๊! ลมหายแล้ว', 'ฟิ้ว~', 'ไปเล่นที่อื่นนะ']), 'good', 0.9)
    sfx.sparkle()
    haptic(12)
  }

  /** Flame tip of the lighter (just above the finger). */
  private get tip(): [number, number] {
    return [this.drag.x, this.drag.y - 12]
  }

  private aimWorker() {
    const wk = this.worker
    if (!wk) return
    wk.follow = this.holding ? 12 : 6
    if (!this.holding) {
      wk.pose = WP.scoopBack
      return
    }
    const [tx, ty] = this.tip
    wk.goTo(Math.max(14, Math.min(this.w - 14, tx - 12)), this.floorY)
    // Right arm raised toward the flame.
    const sx = wk.x + 7.5
    const sy = wk.feetY - 26
    wk.pose = reachPose('back', 'R', Math.atan2(ty - sy, tx - sx), 9, 'smile', 'rest')
  }

  protected tick(dt: number) {
    this.aimWorker()
    const [tx, ty] = this.tip
    for (const c of this.candles) {
      c.glow += ((c.lit ? 1 : 0) - c.glow) * Math.min(1, dt * 4)
      // Lean away from nearby puffs.
      let lean = 0
      for (const p of this.puffs) {
        if (p.gone > 0) continue
        const d = Math.hypot(p.x - c.x, p.y - this.flameY(c))
        if (d < 40) lean += p.dir * (1 - d / 40) * 2.5
      }
      c.lean += (Math.max(-2.5, Math.min(2.5, lean)) - c.lean) * Math.min(1, dt * 8)
      if (!c.lit && this.holding && this.playing && Math.hypot(tx - c.x, ty - (this.flameY(c) + 2)) < 7) {
        c.heat += dt
        if (Math.random() < dt * 20) this.particles.add({ kind: 'sparkle', x: c.x + rand(-2, 2), y: this.flameY(c) + 3, vy: -10, max: 0.3, color: '#ffd54f' })
        if (c.heat >= LIGHT_TIME) {
          c.lit = true
          c.heat = 0
          wsfx.whoomp()
          sfx.merit()
          haptic(10)
          this.particles.sparkles(c.x, this.flameY(c), 10, '#fff3a6', 14)
          for (let i = 0; i < 6; i++) this.particles.add({ kind: 'dot', x: c.x + rand(-2, 2), y: this.flameY(c), vx: rand(-25, 25), vy: rand(-45, -15), g: 60, max: rand(0.4, 0.8), color: i % 2 ? '#ffd54f' : '#ff9a3a' })
          c.glow = 1.6
          this.streak(c.x, this.flameY(c) - 10, 2.2)
          if (this.lit >= COUNT) {
            this.flash(0.4)
            this.particles.confetti(this.cx, this.railY - 40, 40, ['#ffd54f', '#fff3a6', '#ffb347', '#ff9fc0'])
            sfx.chime()
          }
        }
      } else c.heat = Math.max(0, c.heat - dt * 2)
    }
    if (this.playing) {
      if (!this.hinted && this.elapsed > 0.3) {
        this.hinted = true
        this.say(this.candles[1].x, this.flameY(this.candles[1]) - 10, 'แตะไส้เทียนค้างไว้', 'info', 2)
      }
      this.spawnT -= dt
      if (this.spawnT <= 0) {
        const k = Math.min(1, this.elapsed / this.duration)
        this.spawnT = rand(3, 3.8) - k * 1.2
        this.spawnPuff(k)
      }
    }
    for (const p of this.puffs) {
      if (p.gone > 0) {
        p.gone -= dt
        continue
      }
      p.life += dt
      const c = this.candles[p.target]
      const ty2 = this.flameY(c) - 2
      p.x += p.dir * p.v * dt
      p.y += (ty2 + Math.sin(p.life * 3 + p.ph) * 8 - p.y) * Math.min(1, dt * 1.2)
      // Blow out flames it touches.
      for (const cc of this.candles) {
        if (!cc.lit) continue
        if (Math.abs(p.x - cc.x) < 7 && Math.abs(p.y - this.flameY(cc)) < 12) {
          cc.lit = false
          p.gone = 0.3
          this.blownOut++
          for (let i = 0; i < 6; i++) this.particles.add({ kind: 'smoke', x: cc.x, y: this.flameY(cc) + 2, vx: p.dir * rand(4, 12), vy: rand(-18, -8), max: 1.4, color: '#b8a8b8', size: 2 })
          sfx.whoosh()
          sfx.candle()
          this.shake(0.15, 1)
          this.say(cc.x, this.flameY(cc) - 12, 'เทียนดับ!', 'warn', 1)
          this.breakStreak()
          this.worker?.reactWith('oops', 0.8)
        }
      }
    }
    this.puffs = this.puffs.filter((p) => (p.gone <= 0 ? p.x > -24 && p.x < this.w + 24 : p.gone > 0))
    if (this.holding && Math.random() < dt * 8) this.particles.add({ kind: 'smoke', x: tx + rand(-1, 1), y: ty - 5, vy: -10, max: 0.8, color: '#6a5060' })
  }

  private spawnPuff(k: number) {
    const dir = Math.random() < 0.5 ? 1 : -1
    // Aim at a lit candle when possible.
    const litIdx = this.candles.map((c, i) => (c.lit ? i : -1)).filter((i) => i >= 0)
    const target = litIdx.length ? pick(litIdx) : Math.floor(rand(0, COUNT))
    const y = this.flameY(this.candles[target]) - rand(10, 30)
    this.puffs.push({ x: dir > 0 ? -14 : this.w + 14, y, dir, v: rand(18, 24) + k * 7, ph: rand(0, 6), life: 0, gone: 0, target })
    sfx.whoosh()
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    // The room brightens as candles are lit.
    const k = this.progress()
    g.alpha((1 - k) * 0.3)
    g.rect(0, 0, this.w, this.h, '#1a0b13')
    g.alpha(1)
    softGlow(g, this.cx, this.railY - 70, 90, 0.18 + k * 0.5, '#ffcf7a')
    const x0 = this.candles[0]?.x ?? 18
    const x1 = this.candles[COUNT - 1]?.x ?? this.w - 18
    drawCandleRail(g, x0 - 8, x1 + 9, this.railY, this.candles.map((c) => c.x))
    for (const c of this.candles) {
      drawCandleFlame(g, c.x, this.railY - 2, c.h, c.lit, this.t, c.lean, c.glow)
      if (c.heat > 0) {
        const n = Math.round((c.heat / LIGHT_TIME) * 8)
        for (let i = 0; i < n; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2
          g.px(Math.round(c.x + Math.cos(a) * 5), Math.round(this.flameY(c) + 3 + Math.sin(a) * 5), '#ffd54f')
        }
      }
    }
    // Warm light pooling on the table from every lit candle.
    for (const c of this.candles) if (c.lit) glow(g, c.x, this.railY + 4, 20, 0.12 + c.glow * 0.08, '#ffb050')
    vignette(g, this.w, this.h, 0.5 - k * 0.25, '10,4,10')
    // The player with the long lighter.
    const wk = this.worker
    if (wk) {
      wk.draw(g)
      if (this.holding && this.phase !== 'done') {
        const [hx, hy] = wk.wrist('R')
        const [tx, ty] = this.tip
        drawLongLighter(g, hx, hy, tx, ty, this.t, true)
        wk.fists(g, ['R'])
      }
    }
    for (const p of this.puffs) drawWindPuff(g, p.x, p.y, p.dir, this.t + p.ph, p.gone > 0 ? p.gone / 0.3 : 1)
  }
}
