// กวาดลานวัด – swipe the broom to herd bodhi leaves into the pile, then
// scoop the pile into the bamboo basket. Gusts of wind blow leaves (and the
// pile!) back across the courtyard.

import type { PointerInfo } from '../../engine/stage'
import { ditherOn, type Surface } from '../../engine/pixel'
import { drawRing } from '../../engine/particles'
import { rand, randInt } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { noviceSweepSprite } from '../../art/characters'
import { bakeCourtyard, drawAt, drawBasket, drawBroom, drawDustpan, leafSprite, LEAF_COLORS, shadow } from '../../art/jobs'
import { Drag, JobScene, type JobSummary } from './base'
import { Worker } from './worker'
import { Life } from './life'
import { wsfx } from './workSfx'
import { gripPose, WP } from '../../art/poses/work'
import { DOLL_H, DOLL_W } from '../../art/doll'
import { dapple, motes, sunRays } from '../../art/workFx'

/** Broom tip distance below the hold point along the handle. */
const TIP = 27

type LeafState = 'air' | 'ground' | 'pile' | 'carry'

interface Leaf {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  kind: number
  rot: number
  spin: number
  state: LeafState
  ox: number
  oy: number
  ph: number
}

interface Streak {
  x: number
  y: number
  len: number
  v: number
  life: number
}

const TARGET = 30

export class SweepScene extends JobScene {
  duration = 45
  thresholds: [number, number, number] = [10 / TARGET, 20 / TARGET, 1]
  leaves: Leaf[] = []
  binned = 0
  gusts = 0
  spills = 0
  pileX = 80
  pileY = 200
  pileR = 15
  binX = 160
  binY = 320
  private bg: HTMLCanvasElement | null = null
  private drag = new Drag()
  private mode: 'none' | 'broom' | 'carry' = 'none'
  private lean = 0.4
  private swish = 0
  private carryN = 0
  private scrapeT = 0
  private spawnT = 1.5
  private windNext = 8
  private windWarn = 0
  private windGust = 0
  private windDir = 1
  private streaks: Streak[] = []
  private wob = 0
  private hinted = { pile: false, carry: false }
  private novice = { x: 30, dir: 1, f: 0 as 0 | 1, ft: 0 }
  private grip = gripPose(0.1)
  private swishT = 0
  private strokeDir = 0

  progress() {
    return Math.min(1, this.binned / TARGET)
  }
  goalText() {
    return `ใบไม้ลงเข่ง ${this.binned}/${TARGET}`
  }
  summary(): JobSummary {
    return {
      title: this.binned >= TARGET ? 'ลานวัดสะอาดเอี่ยม!' : undefined,
      lines: [`เก็บใบไม้ลงเข่ง ${this.binned} ใบ`, `ฝ่าลมแรงไป ${this.gusts} รอบ`, ...(this.bestCombo >= 3 ? [`กวาดรวดเดียว x${this.bestCombo}`] : [])],
    }
  }
  cheerText() {
    return 'สะอาดเอี่ยม!'
  }

  get pileCount() {
    let n = 0
    for (const l of this.leaves) if (l.state === 'pile') n++
    return n
  }

  protected anchor() {
    const { w, top, bottom } = this
    this.bg = bakeCourtyard(w, this.h, top)
    this.pileX = Math.round(w * 0.4)
    this.pileY = Math.round(top + this.playH * 0.56)
    this.binX = w - 24
    this.binY = bottom - 6
    for (const l of this.leaves) this.clampLeaf(l)
    if (!this.life) this.life = new Life().cat(Math.round(w * 0.72), top + 48, [24, top + 40, w - 30, top + 110], { state: 'sleep', color: '#f5a55a' }).pigeons(4, [30, top + 70, w - 40, top + 130]).kid(Math.round(w * 0.58), top + 32)
    if (!this.worker) this.worker = new Worker(Math.round(w * 0.22), bottom - 14)
    else if (this.phase === 'ready') this.worker.place(Math.round(w * 0.22), bottom - 14)
  }

  protected populate() {
    this.leaves = []
    this.binned = 0
    for (let i = 0; i < 24; i++) {
      let x = 0
      let y = 0
      for (let k = 0; k < 20; k++) {
        x = rand(12, this.w - 12)
        y = rand(this.top + 36, this.bottom - 8)
        if (Math.hypot(x - this.pileX, y - this.pileY) > this.pileR + 10 && Math.hypot(x - this.binX, y - this.binY + 8) > 24) break
      }
      this.leaves.push(this.newLeaf(x, y, 0, 'ground'))
    }
  }

  private newLeaf(x: number, y: number, z: number, state: LeafState): Leaf {
    return { x, y, z, vx: 0, vy: 0, vz: 0, kind: randInt(0, 3), rot: randInt(0, 7), spin: rand(-6, 6), state, ox: 0, oy: 0, ph: rand(0, 6) }
  }

  private clampLeaf(l: Leaf) {
    const minY = this.top + 30
    if (l.x < 9) (l.x = 9), (l.vx = Math.abs(l.vx) * 0.4)
    if (l.x > this.w - 9) (l.x = this.w - 9), (l.vx = -Math.abs(l.vx) * 0.4)
    if (l.state !== 'air' && l.y < minY) (l.y = minY), (l.vy = Math.abs(l.vy) * 0.4)
    if (l.y > this.bottom - 3) (l.y = this.bottom - 3), (l.vy = -Math.abs(l.vy) * 0.4)
  }

  private toPile(l: Leaf) {
    const n = this.pileCount
    l.state = 'pile'
    l.vx = l.vy = l.vz = 0
    l.z = 0
    const a = rand(0, Math.PI * 2)
    const r = Math.sqrt(Math.random()) * (5 + Math.min(6, n * 0.4))
    l.ox = Math.cos(a) * r
    l.oy = Math.sin(a) * r * 0.6 - Math.min(7, n * 0.3)
    l.rot = randInt(0, 7)
    this.particles.add({ kind: 'dot', x: this.pileX + l.ox, y: this.pileY + l.oy, vy: -10, max: 0.3, color: '#fff3a6' })
    if (this.playing) this.streak(this.pileX, this.pileY - 10, 0.9)
    if (!this.hinted.carry && n + 1 >= 6) {
      this.hinted.carry = true
      this.say(this.pileX, this.pileY - 18, 'กดที่กอง แล้วลากไปเทใส่เข่ง', 'info', 2.6)
    }
  }

  protected input(e: PointerInfo) {
    const d = this.drag
    if (e.type === 'down') {
      if (d.down) return
      d.begin(e)
      if (this.pileCount > 0 && Math.hypot(e.x - this.pileX, e.y - this.pileY) < this.pileR + 6) {
        this.mode = 'carry'
        this.carryN = 0
        for (const l of this.leaves)
          if (l.state === 'pile') {
            l.state = 'carry'
            this.carryN++
          }
        sfx.rattle()
        haptic(10)
      } else {
        this.mode = 'broom'
        sfx.tap()
      }
      return
    }
    if (e.type === 'move') {
      if (!d.move(e)) return
      if (this.mode === 'broom') this.sweep(d.px, d.py, d.x, d.y)
      return
    }
    if (!d.end(e)) return
    if (this.mode === 'carry') this.drop(e.x, e.y)
    this.mode = 'none'
  }

  private sweep(x0: number, y0: number, x1: number, y1: number) {
    const d = this.drag
    const sp = d.speed
    const len = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(len / 3))
    let hit = 0
    for (const l of this.leaves) {
      if (l.state !== 'ground' && !(l.state === 'air' && l.z < 6)) continue
      let best = 1e9
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const bx = x0 + (x1 - x0) * t
        const by = y0 + (y1 - y0) * t + 1
        const dd = (l.x - bx) ** 2 / 81 + (l.y - by) ** 2 / 25
        if (dd < best) best = dd
      }
      if (best > 1) continue
      const vmax = 220
      const vx = Math.max(-vmax, Math.min(vmax, d.vx))
      const vy = Math.max(-vmax, Math.min(vmax, d.vy))
      l.vx += (vx - l.vx) * 0.8
      l.vy += (vy - l.vy) * 0.8
      if (sp > 120 && l.z === 0) l.vz = rand(18, 34)
      l.state = 'ground'
      hit++
    }
    if (hit > 0 && this.scrapeT <= 0) {
      sfx.scratch()
      this.scrapeT = 0.09
    }
    if (hit > 0 && sp > 140 && Math.random() < 0.6) {
      // Leaves kicked up by a fast stroke.
      const c = LEAF_COLORS[randInt(0, 3)]
      this.particles.add({ kind: 'leaf', x: x1 + rand(-6, 6), y: y1, vx: d.vx * 0.35 + rand(-15, 15), vy: rand(-55, -25), g: 150, max: rand(0.45, 0.7), color: c.b, color2: c.d })
    }
    if (sp > 90 && Math.random() < 0.6)
      this.particles.add({ kind: 'smoke', x: x1 + rand(-8, 8), y: y1 + rand(0, 3), vx: -d.vx * 0.06, vy: rand(-10, -3), max: rand(0.4, 0.7), color: '#efe4d0', size: 2, drag: 1 })
    // A swish per stroke direction change.
    const dir = Math.sign(d.vx)
    if (sp > 110 && dir !== 0 && dir !== this.strokeDir && this.swishT <= 0) {
      wsfx.swish(Math.min(1, sp / 300))
      this.swishT = 0.12
    }
    if (dir !== 0) this.strokeDir = dir
  }

  private drop(x: number, y: number) {
    const carried = this.leaves.filter((l) => l.state === 'carry')
    if (!carried.length) return
    if (Math.hypot(x - this.binX, y - (this.binY - 10)) < 22) {
      const n = carried.length
      this.leaves = this.leaves.filter((l) => l.state !== 'carry')
      this.binned += n
      this.wob = 0.35
      for (let i = 0; i < Math.min(14, n + 4); i++) {
        const c = LEAF_COLORS[i % 4]
        this.particles.add({ kind: 'leaf', x: x + rand(-5, 5), y: y - 2, vx: (this.binX - x) * 1.5 + rand(-20, 20), vy: rand(-60, -30), g: 160, max: 0.55, color: c.b, color2: c.d })
      }
      this.particles.sparkles(this.binX, this.binY - 18, 8, '#fff3a6')
      this.particles.popText(this.binX, this.binY - 26, `+${n}`)
      sfx.rattle()
      sfx.coin()
      haptic(18)
      wsfx.rustle()
      if (n >= 14) this.praise('เทหมดเข่ง!', 'pink')
      else if (n >= 8) this.praise('เยอะมาก!', 'gold')
      else if (n >= 4) this.say(this.binX - 10, this.binY - 30, 'ลงเข่งแล้ว!', 'good')
      if (this.binned >= TARGET) {
        this.flash()
        this.particles.confetti(this.w / 2, this.top + this.playH * 0.4, 36)
        sfx.chime()
      }
    } else {
      // Missed the basket: the leaves slide off the dustpan.
      for (const l of carried) {
        l.state = 'ground'
        l.x = x + rand(-6, 6)
        l.y = y + rand(-3, 4)
        l.vx = rand(-50, 50)
        l.vy = rand(-30, 40)
        l.vz = rand(10, 30)
        this.clampLeaf(l)
      }
      this.spills++
      sfx.whoosh()
      this.say(x, y - 14, 'หกหมดเลย! เทลงเข่งนะ', 'warn')
    }
    this.carryN = 0
  }

  private gust() {
    this.gusts++
    this.windGust = 1.1
    sfx.whoosh()
    haptic(25)
    this.shake(0.25, 1)
    const dir = this.windDir
    for (const l of this.leaves) {
      if (l.state === 'ground' || l.state === 'air') {
        l.vx += dir * rand(60, 130)
        l.vy += rand(-25, 25)
        l.vz = Math.max(l.vz, rand(20, 45))
        l.state = 'ground'
      }
    }
    const pile = this.leaves.filter((l) => l.state === 'pile')
    const lose = Math.min(pile.length, 2 + Math.floor(pile.length / 4))
    for (let i = 0; i < lose; i++) {
      const l = pile[pile.length - 1 - i]
      l.state = 'ground'
      l.x = this.pileX + l.ox
      l.y = this.pileY + l.oy + 4
      l.vx = dir * rand(70, 140)
      l.vy = rand(-30, 30)
      l.vz = rand(25, 50)
    }
    if (this.mode === 'carry') {
      const c = this.leaves.find((l) => l.state === 'carry')
      if (c) {
        c.state = 'ground'
        c.x = this.drag.x
        c.y = this.drag.y
        c.vx = dir * 120
        c.vz = 40
      }
    }
    if (lose > 0) this.say(this.pileX, this.pileY - 16, 'กองใบไม้ปลิว!', 'warn')
    for (let i = 0; i < 3; i++) this.spawnFalling()
  }

  private spawnFalling() {
    if (this.leaves.length >= 40) return
    const x = rand(14, this.w - 14)
    const z = rand(22, 34)
    const l = this.newLeaf(x, this.top + rand(6, 18) + z, z, 'air')
    l.vz = 0
    this.leaves.push(l)
  }

  protected tick(dt: number) {
    const d = this.drag
    this.scrapeT -= dt
    this.wob = Math.max(0, this.wob - dt)
    if (!d.down) d.settle(dt)
    // Broom posture.
    const targetLean = Math.max(-0.7, Math.min(0.7, 0.35 - d.vx / 380))
    this.lean += (targetLean - this.lean) * Math.min(1, dt * 10)
    this.swish = Math.sin(this.t * 22) * Math.min(1, d.speed / 180)
    this.swishT -= dt
    this.aimWorker()

    if (this.playing) {
      this.spawnT -= dt
      if (this.spawnT <= 0) {
        this.spawnFalling()
        this.spawnT = rand(1.2, 2.1)
      }
      if (!this.hinted.pile && this.elapsed > 0.4) {
        this.hinted.pile = true
        this.say(this.pileX, this.pileY - 16, 'กวาดมารวมตรงนี้', 'info', 2.4)
      }
      this.windNext -= dt
      if (this.windNext <= 0 && this.windWarn <= 0 && this.windGust <= 0) {
        this.windDir = Math.random() < 0.5 ? 1 : -1
        this.windWarn = 1.5
        this.windNext = rand(9, 11.5)
        this.say(this.windDir > 0 ? 34 : this.w - 34, this.top + 40, 'ลมมาแล้ว!', 'warn', 1.6)
      }
      if (this.windWarn > 0) {
        this.windWarn -= dt
        if (Math.random() < dt * 14) this.addStreak(0.6)
        if (this.windWarn <= 0) this.gust()
      }
    }
    if (this.windGust > 0) {
      this.windGust -= dt
      if (Math.random() < dt * 40) this.addStreak(1)
    }
    for (const s of this.streaks) {
      s.x += s.v * dt
      s.life -= dt
    }
    this.streaks = this.streaks.filter((s) => s.life > 0)

    // Leaves.
    for (const l of this.leaves) {
      if (l.state === 'pile' || l.state === 'carry') continue
      if (l.state === 'air') {
        l.z -= dt * 13
        l.x += Math.sin(this.t * 3 + l.ph) * 14 * dt + (this.windGust > 0 ? this.windDir * 60 * dt : 0)
        l.rot += dt * l.spin
        if (l.z <= 0) {
          l.z = 0
          l.state = 'ground'
        }
        this.clampLeaf(l)
        continue
      }
      l.x += l.vx * dt
      l.y += l.vy * dt
      if (l.vz !== 0 || l.z > 0) {
        l.z += l.vz * dt
        l.vz -= 160 * dt
        if (l.z <= 0) (l.z = 0), (l.vz = 0)
      }
      const inPile = Math.hypot(l.x - this.pileX, (l.y - this.pileY) * 1.25) < this.pileR + 4
      const k = Math.exp(-(l.z > 0 ? 1.6 : inPile ? 14 : 6.5) * dt)
      l.vx *= k
      l.vy *= k
      const sp = Math.hypot(l.vx, l.vy)
      l.rot += (dt * l.spin * sp) / 40
      // Leaves bump off the basket.
      const bx = l.x - this.binX
      const by = (l.y - (this.binY - 6)) * 1.6
      const bd = Math.hypot(bx, by)
      if (bd < 15) {
        l.x = this.binX + (bx / (bd || 1)) * 15
        l.vx = (bx / (bd || 1)) * 30
      }
      this.clampLeaf(l)
      if (l.z < 3 && sp < 200 && Math.hypot(l.x - this.pileX, (l.y - this.pileY) * 1.25) < this.pileR) this.toPile(l)
    }

    // A novice sweeping in the distance.
    const nv = this.novice
    nv.x += nv.dir * dt * 7
    if (nv.x > this.w * 0.45) nv.dir = -1
    if (nv.x < 18) nv.dir = 1
    nv.ft += dt
    if (nv.ft > 0.35) {
      nv.ft = 0
      nv.f = nv.f ? 0 : 1
    }
  }

  private addStreak(k: number) {
    const dir = this.windDir
    this.streaks.push({ x: dir > 0 ? rand(-40, this.w * 0.3) : rand(this.w * 0.7, this.w + 40), y: rand(this.top + 20, this.bottom - 10), len: rand(8, 20) * k, v: dir * rand(160, 240), life: rand(0.4, 0.8) })
  }

  /** Put the player where their broom (or dustpan) reaches the finger. */
  private aimWorker() {
    const wk = this.worker
    if (!wk) return
    const d = this.drag
    if (this.mode === 'broom') {
      const fr = d.speed > 60 && Math.sin(this.t * 22) > 0 ? 1 : 0
      // Keep the bristles out to the side of the feet.
      const lean = Math.sign(this.lean || 1) * Math.max(0.42, Math.abs(this.lean))
      this.grip = gripPose(lean, fr, d.speed > 160 ? 'open' : 'smile')
      const a = this.grip.lean
      const cx = d.x + Math.sin(a) * TIP
      const cy = d.y + 2 - Math.cos(a) * TIP
      wk.follow = 26
      wk.pose = this.grip.name
      wk.goTo(this.clampX(cx - this.grip.c[0] + DOLL_W / 2), this.clampY(cy - this.grip.c[1] + DOLL_H - 1))
    } else if (this.mode === 'carry') {
      wk.follow = 20
      wk.pose = WP.carry
      wk.goTo(this.clampX(d.x), this.clampY(d.y + 13))
    } else {
      this.grip = gripPose(Math.sin(this.t * 1.3) * 0.06 + 0.45, 0)
      wk.pose = this.grip.name
      wk.follow = 10
    }
  }

  private clampX(x: number) {
    return Math.max(14, Math.min(this.w - 14, x))
  }
  private clampY(y: number) {
    return Math.max(this.top + 44, Math.min(this.bottom - 2, y))
  }

  /** Where the broom tip is for the worker's current (lagging) position. */
  private broomTip(): [number, number] {
    const wk = this.worker!
    const [lx, ly] = wk.wrist('L')
    const [rx, ry] = wk.wrist('R')
    const a = this.grip.lean
    // Hold point = between the fists; the tip hangs TIP below along the handle.
    const cx = (lx + rx) / 2 + Math.sin(a) * 0.2
    const cy = (ly + ry) / 2
    return [cx - Math.sin(a) * TIP, cy + Math.cos(a) * TIP]
  }

  private drawWorker(g: Surface) {
    const wk = this.worker
    if (!wk) return
    if (wk.reacting) {
      // Broom leaning on the player's side while they celebrate.
      drawBroom(g, wk.x - 13, wk.y, -0.22, 0)
      wk.draw(g)
      return
    }
    wk.draw(g)
    if (this.mode === 'carry') {
      const [lx, ly] = wk.wrist('L')
      const [rx, ry] = wk.wrist('R')
      const n = this.leaves.filter((l) => l.state === 'carry').length
      drawDustpan(g, (lx + rx) / 2, (ly + ry) / 2 + 4, Math.min(1, n / 14))
      wk.fists(g)
      return
    }
    const [tx, ty] = this.broomTip()
    drawBroom(g, tx, ty, this.grip.lean, this.mode === 'broom' ? this.swish : 0)
    wk.fists(g)
  }

  protected draw(g: Surface) {
    const { w } = this
    if (this.bg) g.draw(this.bg, 0, 0)
    dapple(g, w, this.top + 20, this.bottom, this.t, 0.85)
    const nv = this.novice
    const ns = noviceSweepSprite(nv.f, nv.dir < 0)
    shadow(g, nv.x, this.top + 33, 7, 2)
    drawAt(g, ns, nv.x, this.top + 33)

    // Pile spot.
    const R = this.pileR + 1
    g.ctx.save()
    g.ctx.fillStyle = 'rgba(168,140,100,0.16)'
    for (let yy = -R; yy <= R; yy++)
      for (let xx = -R; xx <= R; xx++) {
        const px = this.pileX + xx
        const py = Math.round(this.pileY + yy * 0.8)
        if (xx * xx + yy * yy <= R * R && ditherOn(px, py, 0.5)) g.ctx.fillRect(px, py, 1, 1)
      }
    g.ctx.restore()
    const pulse = this.pileCount === 0 && Math.sin(this.t * 5) > 0 ? '#8a6a44' : '#a88c64'
    for (let i = 0; i < 36; i++) {
      if (i % 3 === 2) continue
      const a = (i / 36) * Math.PI * 2 + this.t * 0.5
      const px = Math.round(this.pileX + Math.cos(a) * R)
      const py = Math.round(this.pileY + Math.sin(a) * R * 0.8)
      g.rect(px, py, 2, 1, pulse)
    }
    drawRing(g, this.pileX, this.pileY, R - 3, (R - 3) * 0.8, 'rgba(255,250,240,0.5)')

    // Ground leaves (y-sorted), shadows for airborne ones.
    const loose = this.leaves.filter((l) => l.state === 'ground' || l.state === 'air').sort((a, b) => a.y - b.y)
    for (const l of loose) if (l.z > 1) shadow(g, l.x, l.y + 1, 3, 1.2, 0.3)
    for (const l of loose) {
      const s = leafSprite(l.kind, Math.round(l.rot))
      g.draw(s.canvas, Math.round(l.x - s.w / 2), Math.round(l.y - s.h / 2 - l.z))
    }
    // Pile mound.
    const pile = this.leaves.filter((l) => l.state === 'pile').sort((a, b) => a.oy - b.oy)
    if (pile.length > 3) shadow(g, this.pileX, this.pileY + 3, 8 + Math.min(8, pile.length * 0.4), 3, 0.4)
    for (const l of pile) {
      const s = leafSprite(l.kind, l.rot)
      g.draw(s.canvas, Math.round(this.pileX + l.ox - s.w / 2), Math.round(this.pileY + l.oy - s.h / 2))
    }
    this.life?.drawGround(g)
    // The player (y-sorted against the basket).
    const behind = this.worker && this.worker.y < this.binY
    if (behind) this.drawWorker(g)
    drawBasket(g, this.binX, this.binY, Math.min(1, this.binned / TARGET), this.wob, this.t)
    if (!behind) this.drawWorker(g)
    // Glow the basket while carrying.
    if (this.mode === 'carry' && Math.sin(this.t * 10) > 0) drawRing(g, this.binX, this.binY - 9, 17, 12, '#fff3a6')
    // Wind streaks.
    for (const s of this.streaks) {
      g.alpha(Math.min(1, s.life * 2.5) * 0.85)
      g.hline(s.x, s.x + s.len * Math.sign(s.v), s.y, '#ffffff')
      g.px(s.x + s.len * Math.sign(s.v) * 1.1, s.y - 1, '#ffffff')
      g.alpha(1)
    }
    this.life?.drawAir(g)
    motes(g, w, this.top + 20, this.bottom - 20, this.t, 12)
    sunRays(g, w, this.h, this.t, '#fff2c4', 0.16, this.top - 10)
  }
}
