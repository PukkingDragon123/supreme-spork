// เช็ดองค์พระ – gently wipe the dust off three small Buddha images on the
// wall shrine. Slow circular rubs clean best; rushing does nothing but earn a
// gentle reminder (and costs stars).

import type { PointerInfo } from '../../engine/stage'
import { createCanvas, type Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { buddhaSculpt, softGlow, type BuddhaStyle } from '../../art/hall'
import { bakeShrineShelf, makeDust } from '../../art/jobs'
import { toStars, type JobStars } from '../../game/jobs'
import { Drag, JobScene, type JobSummary } from './base'
import { Worker } from './worker'
import { wsfx } from './workSfx'
import { reachPose, WP } from '../../art/poses/work'
import { drawClothPole } from '../../art/workTools'
import { glow, motes, vignette } from '../../art/workFx'

const SCALE = 0.62
const DONE_AT = 0.85
const GENTLE = 120
const RUSH = 200

interface Statue {
  style: BuddhaStyle
  x: number
  img: HTMLCanvasElement
  dust: HTMLCanvasElement
  ox: number
  oy: number
  base: number
  frac: number
  done: boolean
  halo: number
}

export class StatueScene extends JobScene {
  duration = 45
  thresholds: [number, number, number] = [0.5, 0.8, 1]
  statues: Statue[] = []
  rushes = 0
  circles = 0
  private bg: HTMLCanvasElement | null = null
  private shelfY = 250
  private drag = new Drag()
  private wiping = false
  private rushCool = 0
  private turn = 0
  private lastAng: number | null = null
  private measureT = 0
  private swishT = 0
  private hinted = false
  private floorY = 330

  progress() {
    if (!this.statues.length) return 0
    const f = this.statues.reduce((s, st) => s + (st.done ? 1 : Math.min(1, st.frac / DONE_AT)), 0)
    return Math.min(1, f / this.statues.length)
  }
  complete() {
    return this.statues.length > 0 && this.statues.every((s) => s.done)
  }
  stars(): JobStars {
    const p = this.progress()
    const base = p >= 1 ? 3 : p >= 0.8 ? 2 : p >= 0.5 ? 1 : 0
    const pen = this.rushes >= 6 ? 2 : this.rushes >= 3 ? 1 : 0
    return toStars(base === 0 ? 0 : Math.max(1, base - pen))
  }
  goalText() {
    return `สะอาด ${Math.round(this.progress() * 100)}% · รีบ ${this.rushes}`
  }
  cheerText() {
    return this.rushes < 3 ? 'ผ่องใส สาธุ!' : 'สะอาดแล้ว!'
  }
  summary(): JobSummary {
    return {
      title: this.complete() && this.rushes < 3 ? 'องค์พระสะอาดผ่องใส สาธุ!' : undefined,
      lines: [`เช็ดสะอาด ${this.statues.filter((s) => s.done).length}/${this.statues.length} องค์`, this.rushes ? `รีบเกินไป ${this.rushes} ครั้ง` : 'เช็ดอย่างนุ่มนวลตลอด'],
    }
  }

  protected anchor() {
    this.shelfY = Math.round(this.top + this.playH * 0.62)
    this.bg = bakeShrineShelf(this.w, this.h, this.shelfY)
    this.statues.forEach((s, i) => (s.x = this.slotX(i)))
    // The player below the shelf with a long feather duster.
    this.floorY = Math.min(this.bottom - 2, this.shelfY + 60)
    if (!this.worker) this.worker = new Worker(this.cx, this.floorY)
    else if (this.phase === 'ready') this.worker.place(this.cx, this.floorY)
    this.worker.view = 'back'
  }

  private aimWorker() {
    const wk = this.worker
    if (!wk) return
    const d = this.drag
    if (!this.wiping) {
      wk.pose = WP.scoopBack
      wk.follow = 5
      return
    }
    wk.follow = 8
    wk.goTo(Math.max(14, Math.min(this.w - 14, d.x - 10)), this.floorY)
    const sx = wk.x + 7.5
    const sy = wk.feetY - 26
    wk.pose = reachPose('back', 'R', Math.atan2(d.y - sy, d.x - sx), 10, 'smile', 'rest')
  }

  private slotX(i: number) {
    return Math.round(this.w / 2 + (i - 1) * this.w * 0.29)
  }

  protected populate() {
    const styles: BuddhaStyle[] = ['lanna', 'sukhothai', 'antique']
    this.statues = styles.map((style, i) => {
      const b = buddhaSculpt(style, i === 1 ? SCALE * 1.12 : SCALE)
      // Copy: the dust mask is per statue and we must not touch the cached sculpt.
      const img = createCanvas(b.canvas.width, b.canvas.height)
      img.getContext('2d')!.drawImage(b.canvas, 0, 0)
      return { style, x: this.slotX(i), img, dust: makeDust(img, i * 13 + 5), ox: b.ox, oy: b.oy, base: 0, frac: 0, done: false, halo: 0 }
    })
    for (const s of this.statues) s.base = this.alpha(s.dust)
    this.rushes = 0
  }

  private alpha(c: HTMLCanvasElement) {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let s = 0
    for (let i = 3; i < d.length; i += 4) s += d[i]
    return s
  }

  private origin(s: Statue): [number, number] {
    return [s.x - s.ox, this.shelfY - 3 - s.oy]
  }

  protected input(e: PointerInfo) {
    const d = this.drag
    if (e.type === 'down') {
      if (d.down) return
      d.begin(e)
      this.wiping = true
      this.lastAng = null
      this.turn = 0
      return
    }
    if (e.type === 'move') {
      if (!d.move(e)) return
      this.wipe(d.px, d.py, d.x, d.y)
      return
    }
    if (d.end(e)) this.wiping = false
  }

  private wipe(x0: number, y0: number, x1: number, y1: number) {
    const len = Math.hypot(x1 - x0, y1 - y0)
    if (len < 0.5) return
    const sp = this.drag.speed
    // Track turning to reward circular rubs.
    const ang = Math.atan2(y1 - y0, x1 - x0)
    if (this.lastAng !== null) {
      let da = ang - this.lastAng
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      this.turn = this.turn * 0.96 + Math.abs(da)
    }
    this.lastAng = ang
    const circling = this.turn > 2.2
    if (sp > RUSH) {
      if (this.rushCool <= 0) {
        this.rushes++
        this.rushCool = 1.3
        this.say(x1, y1 - 18, pick(['เบา ๆ นะ ใจเย็น ๆ', 'ค่อย ๆ เช็ดนะ', 'ช้า ๆ ได้บุญกว่า']), 'warn', 1.3)
        sfx.error()
        haptic(20)
        this.worker?.reactWith('oops', 0.7)
      }
      return
    }
    const rate = (sp < GENTLE ? 0.07 : 0.03) * (circling ? 1.6 : 1)
    let hit = false
    for (const s of this.statues) {
      if (s.done) continue
      const [ox, oy] = this.origin(s)
      const m = s.dust.getContext('2d')!
      m.save()
      m.globalCompositeOperation = 'destination-out'
      m.globalAlpha = rate
      m.fillStyle = '#000'
      const steps = Math.max(1, Math.ceil(len / 2))
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const cx = x0 + (x1 - x0) * t - ox
        const cy = y0 + (y1 - y0) * t - oy
        if (cx < -8 || cy < -8 || cx > s.dust.width + 8 || cy > s.dust.height + 8) continue
        m.beginPath()
        m.arc(cx, cy, 7.5, 0, Math.PI * 2)
        m.fill()
        hit = true
      }
      m.restore()
    }
    if (hit) {
      this.swishT -= 1
      if (this.swishT <= 0) {
        wsfx.swish(0.4)
        this.swishT = 6
      }
      if (Math.random() < 0.3) this.particles.add({ kind: 'dot', x: x1 + rand(-4, 4), y: y1 + rand(-2, 4), vx: rand(-8, 8), vy: rand(4, 14), g: 40, max: 0.8, color: '#d8ccb8' })
      if (circling && Math.random() < 0.35) this.particles.add({ kind: 'sparkle', x: x1 + rand(-7, 7), y: y1 + rand(-7, 7), max: 0.4, color: '#fff3a6' })
    }
  }

  protected tick(dt: number) {
    const d = this.drag
    if (!d.down) d.settle(dt)
    this.aimWorker()
    this.rushCool -= dt
    this.turn *= Math.exp(-dt * 2)
    if (this.playing && !this.hinted && this.elapsed > 0.3) {
      this.hinted = true
      this.say(this.cx, this.shelfY - 70, 'วนผ้าช้า ๆ เป็นวงกลม', 'info', 2)
    }
    this.measureT -= dt
    if (this.measureT <= 0) {
      this.measureT = 0.2
      for (const s of this.statues) {
        if (s.done) continue
        s.frac = 1 - this.alpha(s.dust) / Math.max(1, s.base)
        if (s.frac >= DONE_AT) {
          s.done = true
          s.dust.getContext('2d')!.clearRect(0, 0, s.dust.width, s.dust.height)
          const [ox, oy] = this.origin(s)
          this.particles.sparkles(s.x, oy + s.img.height * 0.3, 14, '#fff3a6', 20)
          sfx.bell(s.x > this.cx ? 3 : 1)
          sfx.sparkle()
          haptic(20)
          this.say(s.x, oy - 4, pick(['สาธุ~', 'ผ่องใสแล้ว', 'สะอาดแล้ว']), 'good', 1.2)
          if (!this.statues.every((q) => q.done)) this.praise(pick(['ผ่องใส!', 'สะอาดเอี่ยม!', 'สาธุ~']), 'gold', 1.1)
          void ox
        }
      }
    }
    for (const s of this.statues) s.halo += ((s.done ? 1 : 0) - s.halo) * Math.min(1, dt * 2)
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    for (const s of this.statues) {
      const [ox, oy] = this.origin(s)
      if (s.halo > 0.02) softGlow(g, s.x, oy + s.img.height * 0.35, 30, s.halo * (0.6 + Math.sin(this.t * 2) * 0.1), '#ffe7a0')
      g.draw(s.img, ox, oy)
      if (!s.done) g.draw(s.dust, ox, oy)
    }
    glow(g, this.cx, this.shelfY - 30, 80, 0.12 + this.progress() * 0.2, '#ffe7a0')
    motes(g, this.w, this.top + 10, this.shelfY, this.t, 12)
    vignette(g, this.w, this.h, 0.28)
    const wk = this.worker
    if (wk) {
      // Duster pole behind the player's head, then the player.
      if (this.wiping && this.phase !== 'done') {
        const [hx, hy] = wk.wrist('R')
        drawClothPole(g, hx, hy, this.drag.x, this.drag.y, this.t, Math.min(1, this.drag.speed / 300), this.drag.speed > RUSH ? '#e8514a' : '#ffd54f')
        wk.fists(g, ['R'])
      }
      wk.draw(g)
    }
  }
}
