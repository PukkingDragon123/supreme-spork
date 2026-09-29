// ถูพื้นศาลา – drag the mop over the muddy footprints until the marble shines.
// The mop dries out as you work: dip it in the bucket to wet it again. The
// temple dog likes to trot across the clean floor...

import type { PointerInfo } from '../../engine/stage'
import { Surface } from '../../engine/pixel'
import { rand, randInt, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { DOG_COATS, dogSprite } from '../../art/characters'
import { bakeHallFloor, drawAt, drawBucket, drawMop, shadow, stampPrint, stampSplat, wetSignSprite, type PrintKind } from '../../art/jobs'
import { Drag, JobScene, type JobSummary } from './base'

const CELL = 8
const DONE_AT = 0.95

interface Sheen {
  x: number
  y: number
  t: number
}

interface Dog {
  x: number
  y: number
  dir: number
  coat: number
  step: number
  f: number
  bark: number
}

export class MopScene extends JobScene {
  duration = 45
  thresholds: [number, number, number] = [0.5, 0.8, 1]
  wet = 1
  dips = 0
  bucketX = 30
  bucketY = 330
  private bg: HTMLCanvasElement | null = null
  private dirt: Surface | null = null
  private total = 1
  private remaining = 1
  private cells: Float32Array = new Float32Array(0)
  private cols = 0
  private measureT = 0
  private drag = new Drag()
  private mopping = false
  private lean = 0.5
  private sheen: Sheen[] = []
  private dryWarned = false
  private dogs: Dog[] = []
  private dogTimes = [12, 29]
  private slosh = 0
  private sparkT = 0
  private wallY = 40

  progress() {
    const cleaned = this.total > 0 ? 1 - this.remaining / this.total : 1
    return Math.min(1, Math.max(0, cleaned / DONE_AT))
  }
  goalText() {
    return `พื้นสะอาด ${Math.round(this.progress() * 100)}%`
  }
  summary(): JobSummary {
    return {
      title: this.progress() >= 1 ? 'พื้นศาลาเงาวับ!' : undefined,
      lines: [`พื้นสะอาด ${Math.round(this.progress() * 100)}%`, `จุ่มม็อบในถัง ${this.dips} ครั้ง`],
    }
  }

  protected anchor() {
    this.wallY = this.top + 14
    this.bg = bakeHallFloor(this.w, this.h, this.wallY)
    this.bucketX = 26
    this.bucketY = this.bottom - 6
  }

  protected populate() {
    const { w, h } = this
    this.dirt = new Surface(w, h)
    const g = this.dirt
    const kinds: PrintKind[] = ['shoe', 'kid', 'bare', 'paw', 'shoe']
    kinds.forEach((kind, ti) => {
      // Walk from the door (or a side) toward a spot on the floor.
      const fromDoor = ti < 3
      let x = fromDoor ? w / 2 + rand(-10, 10) : ti % 2 ? 8 : w - 8
      let y = fromDoor ? this.wallY + 6 : rand(this.wallY + 40, this.bottom - 60)
      const tx = rand(24, w - 24)
      const ty = fromDoor ? rand(this.bottom - 70, this.bottom - 16) : rand(this.wallY + 30, this.bottom - 20)
      const step = kind === 'paw' ? 8 : kind === 'kid' ? 9 : 12
      let a = Math.atan2(ty - y, tx - x)
      for (let i = 0; i < 18; i++) {
        const want = Math.atan2(ty - y, tx - x)
        a += (want - a) * 0.35 + rand(-0.25, 0.25)
        x += Math.cos(a) * step
        y += Math.sin(a) * step
        if (Math.hypot(tx - x, ty - y) < step || y > this.bottom - 10 || x < 8 || x > w - 8) break
        const sd = i % 2 ? 1 : -1
        const off = kind === 'paw' ? 2.5 : 3.5
        stampPrint(g, x - Math.sin(a) * sd * off, y + Math.cos(a) * sd * off, a, kind, sd < 0, ti * 31 + i)
      }
    })
    for (let i = 0; i < 4; i++) stampSplat(g, rand(24, w - 24), rand(this.wallY + 30, this.bottom - 30), rand(3, 5), i * 17)
    this.cols = Math.ceil(w / CELL)
    this.cells = new Float32Array(this.cols * Math.ceil(h / CELL))
    this.total = this.measure(true)
    this.remaining = this.total
    this.wet = 1
    this.dips = 0
    this.dogs = []
  }

  /** Sum of dirt alpha; also refreshes the per-cell grid (sparkles when a cell comes clean). */
  private measure(first = false): number {
    const g = this.dirt
    if (!g) return 0
    const { w, h } = this
    const d = g.ctx.getImageData(0, 0, w, h).data
    const next = new Float32Array(this.cells.length)
    let sum = 0
    for (let y = 0; y < h; y++) {
      const row = ((y / CELL) | 0) * this.cols
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3]
        if (!a) continue
        sum += a
        next[row + ((x / CELL) | 0)] += a
      }
    }
    if (!first) {
      for (let i = 0; i < next.length; i++) {
        if (this.cells[i] > 900 && next[i] < 120) {
          const cx = (i % this.cols) * CELL + CELL / 2
          const cy = Math.floor(i / this.cols) * CELL + CELL / 2
          this.particles.sparkles(cx, cy, 3, '#ffffff', 6)
          if (this.sparkT <= 0) {
            sfx.sparkle()
            this.sparkT = 0.25
          }
        }
      }
    }
    this.cells = next
    return sum / 255
  }

  protected input(e: PointerInfo) {
    const d = this.drag
    if (e.type === 'down') {
      if (d.down) return
      d.begin(e)
      this.mopping = true
      sfx.tap()
      this.scrub(e.x, e.y, e.x, e.y)
      return
    }
    if (e.type === 'move') {
      if (!d.move(e)) return
      this.scrub(d.px, d.py, d.x, d.y)
      return
    }
    if (!d.end(e)) return
    this.mopping = false
  }

  private scrub(x0: number, y0: number, x1: number, y1: number) {
    const g = this.dirt
    if (!g) return
    const len = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(len / 2))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t + 3
      if (Math.hypot(x - this.bucketX, y - (this.bucketY - 12)) < 13) {
        this.dip()
        continue
      }
      if (this.wet < 0.12) {
        if (!this.dryWarned) {
          this.dryWarned = true
          this.say(x, y - 22, 'ม็อบแห้งแล้ว! ไปจุ่มน้ำในถัง', 'warn', 2)
          sfx.error()
          haptic(20)
        }
        continue
      }
      g.ctx.save()
      g.ctx.globalCompositeOperation = 'destination-out'
      g.ctx.globalAlpha = 0.14 + this.wet * 0.2
      g.ellipse(x, y, 11, 7, '#000')
      g.ctx.restore()
      if (i % 2 === 0) this.sheen.push({ x: x + rand(-6, 6), y: y + rand(-2, 3), t: 1.2 })
    }
    if (this.wet >= 0.12 && len > 0) this.wet = Math.max(0, this.wet - len * 0.0011)
    if (this.sheen.length > 260) this.sheen.splice(0, this.sheen.length - 260)
    if (len > 3 && Math.random() < 0.3) sfx.scratch()
  }

  private dip() {
    if (this.wet < 0.95) {
      this.dips++
      sfx.splash()
      haptic(15)
      this.slosh = 0.8
      for (let i = 0; i < 10; i++)
        this.particles.add({ kind: 'drop', x: this.bucketX + rand(-6, 6), y: this.bucketY - 14, vx: rand(-30, 30), vy: rand(-70, -30), g: 220, max: 0.6, color: '#b3eef4' })
      if (this.dips === 1) this.say(this.bucketX + 14, this.bucketY - 26, 'เปียกแล้ว ถูต่อเลย!', 'good')
    }
    this.wet = 1
    this.dryWarned = false
  }

  protected tick(dt: number) {
    const d = this.drag
    if (!d.down) d.settle(dt)
    const target = Math.max(-0.2, Math.min(1, 0.5 - d.vx / 400))
    this.lean += (target - this.lean) * Math.min(1, dt * 8)
    this.slosh = Math.max(0, this.slosh - dt)
    this.sparkT -= dt
    for (const s of this.sheen) s.t -= dt
    this.sheen = this.sheen.filter((s) => s.t > 0)
    this.measureT -= dt
    if (this.measureT <= 0 && this.dirt) {
      this.measureT = 0.2
      this.remaining = this.measure()
    }
    if (this.playing && this.dogTimes.length && this.elapsed >= this.dogTimes[0]) {
      this.dogTimes.shift()
      const dir = Math.random() < 0.5 ? 1 : -1
      const dog: Dog = { x: dir > 0 ? -12 : this.w + 12, y: rand(this.wallY + 40, this.bottom - 40), dir, coat: randInt(0, DOG_COATS.length - 1), step: 0, f: 0, bark: 0.6 }
      this.dogs.push(dog)
      this.say(dir > 0 ? 40 : this.w - 40, dog.y - 20, pick(['โฮ่ง! ขอผ่านหน่อย', 'อ้าว น้องหมาเดินผ่าน!']), 'warn', 1.8)
      sfx.bark()
    }
    for (const dog of this.dogs) {
      dog.x += dog.dir * 42 * dt
      dog.step += 42 * dt
      dog.f += dt
      if (dog.step >= 7 && this.dirt && dog.x > 4 && dog.x < this.w - 4) {
        dog.step = 0
        const up = Math.floor(dog.x / 7) % 2 ? -2 : 2
        const px = dog.x - dog.dir * 4
        const py = dog.y + up
        const before = this.regionAlpha(px, py)
        stampPrint(this.dirt, px, py, dog.dir > 0 ? 0 : Math.PI, 'paw', up < 0, Math.round(dog.x))
        this.total += Math.max(0, this.regionAlpha(px, py) - before)
      }
    }
    this.dogs = this.dogs.filter((dg) => dg.x > -20 && dg.x < this.w + 20)
  }

  private regionAlpha(x: number, y: number): number {
    if (!this.dirt) return 0
    const x0 = Math.max(0, Math.round(x) - 6)
    const y0 = Math.max(0, Math.round(y) - 6)
    const data = this.dirt.ctx.getImageData(x0, y0, 13, 13).data
    let s = 0
    for (let i = 3; i < data.length; i += 4) s += data[i]
    return s / 255
  }

  protected ended() {
    if (this.progress() >= 1 && this.dirt) {
      this.dirt.clear()
      this.remaining = 0
      this.flash(0.5)
      for (let i = 0; i < 24; i++) this.particles.sparkles(rand(10, this.w - 10), rand(this.wallY + 10, this.bottom - 10), 1, '#ffffff', 4)
      sfx.chime()
    }
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    if (this.dirt) g.draw(this.dirt.canvas, 0, 0)
    // Wet sheen behind the mop.
    for (const s of this.sheen) {
      g.alpha(Math.min(0.7, s.t * 0.6))
      g.px(s.x, s.y, s.t > 0.8 ? '#ffffff' : '#d4f5fa')
      if (s.t > 0.9) g.px(s.x + 1, s.y, '#e6fbff')
    }
    g.alpha(1)
    drawAt(g, wetSignSprite(), this.w - 20, this.bottom - 4)
    drawBucket(g, this.bucketX, this.bucketY, this.t, this.slosh)
    if (this.wet < 0.12 && Math.sin(this.t * 8) > 0) {
      g.px(this.bucketX, this.bucketY - 24, '#ffffff')
      g.rect(this.bucketX - 1, this.bucketY - 27, 3, 2, '#ffffff')
    }
    for (const dog of this.dogs) {
      const s = dogSprite(DOG_COATS[dog.coat], Math.floor(dog.f * 8) % 2 ? 'walk1' : 'stand', dog.dir < 0)
      shadow(g, dog.x, dog.y + 3, 8, 2)
      drawAt(g, s, dog.x, dog.y + 3)
    }
    if (this.mopping) drawMop(g, this.drag.x, this.drag.y, this.wet, this.lean, Math.sin(this.t * 20) * Math.min(1, this.drag.speed / 150), this.t)
    this.drawWetMeter(g)
  }

  /** Little water gauge that rides next to the mop (or rests by the bucket). */
  private drawWetMeter(g: Surface) {
    const x = this.mopping ? Math.round(this.drag.x - 20) : this.bucketX + 15
    const y = this.mopping ? Math.round(this.drag.y - 22) : this.bucketY - 24
    const H = 14
    g.rect(x - 1, y - 1, 5, H + 2, '#3a2838')
    g.rect(x, y, 3, H, '#fff1d6')
    const f = Math.round(H * this.wet)
    g.rect(x, y + H - f, 3, f, this.wet < 0.12 ? '#e8514a' : '#47a6cb')
    if (f > 1) g.px(x, y + H - f, '#b3eef4')
  }
}
