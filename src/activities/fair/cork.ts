// ยิงปืนจุก – cork gun. Touch and drag to aim (the sight floats a little
// above your finger and sways like a real toy gun), let go to fire a cork.
// Small prizes fall with one hit, dolls need two, the big teddy three (hits
// on its head count double). Ducks paddle along the rail for a bonus.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic } from '../../engine/audio'
import { JobScene, type JobSummary } from '../jobs/base'
import { boothBackdrop, drawBulbs, drawCorkPrize, drawCrosshair, type CorkPrizeKind } from './art'
import { fairSfx } from './sound'
import { CORK_PRIZES, CORK_TARGET, corkDamage } from './rules'
import { drawHeldGun, drawPlayer, placePlayer } from './player'

const CORKS = 10
const FLIGHT = 0.12

interface Prize {
  kind: CorkPrizeKind
  x: number
  y: number
  hp: number
  color: string
  lean: number
  falling: number
  fvx: number
  fvy: number
  /** Fall offset (px below the shelf). */
  dy: number
  gone: boolean
}

interface Shot {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
}

export class CorkScene extends JobScene {
  duration = 40
  thresholds: [number, number, number] = [4 / CORK_TARGET, 9 / CORK_TARGET, 1]
  score = 0
  corks = CORKS
  hits = 0
  prizes: Prize[] = []
  ducks: Prize[] = []
  shots: Shot[] = []
  aim = { x: 95, y: 150 }
  private aiming = false
  private recoil = 0
  private bg: HTMLCanvasElement | null = null
  private shelves: number[] = []
  private rail = 260

  progress() {
    return Math.min(1, this.score / CORK_TARGET)
  }
  goalText() {
    return `แต้ม ${this.score} · จุก ${this.corks}`
  }
  complete() {
    return this.corks <= 0 && this.shots.length === 0
  }
  summary(): JobSummary {
    return {
      title: this.score >= CORK_TARGET ? 'มือปืนจุกคอร์กแห่งงานวัด!' : undefined,
      lines: [`ยิงโดน ${this.hits}/${CORKS} นัด`, `คะแนน ${this.score}`],
    }
  }

  /** The sight: where the cork will land right now (aim + sway). */
  sight() {
    const k = this.aiming ? 1 : 0.6
    return {
      x: this.aim.x + Math.sin(this.t * 2.3) * 4 * k + Math.sin(this.t * 5.1) * 1.2,
      y: this.aim.y + Math.cos(this.t * 1.7) * 3 * k,
    }
  }

  protected anchor() {
    const h = this.bottom - this.top
    this.shelves = [0.26, 0.44, 0.62].map((f) => Math.round(this.top + h * f))
    this.rail = Math.round(this.top + h * 0.74)
    this.bg = boothBackdrop(this.w, this.h, this.top + 20, '#43905a', '#2a4a3a')
    if (!this.aiming) this.aim = { x: this.cx, y: this.shelves[1] - 8 }
  }

  protected populate() {
    const layout: CorkPrizeKind[][] = [
      ['can', 'candy', 'can', 'candy', 'can', 'candy', 'can'],
      ['doll', 'can', 'hippo', 'doll', 'candy', 'doll'],
      ['teddy', 'candy', 'hippo', 'teddy'],
    ]
    this.prizes = []
    layout.forEach((row, s) => {
      const span = this.w - 36
      row.forEach((kind, i) => {
        this.prizes.push({
          kind,
          x: 18 + (span * (i + 0.5)) / row.length,
          y: 0,
          hp: CORK_PRIZES[kind].hp,
          color: pick(['#e8514a', '#ffd23f', '#5a8de0', '#ff9fc0', '#6cc36a', '#c9a06a']),
          lean: 0,
          falling: 0,
          fvx: 0,
          fvy: 0,
          dy: 0,
          gone: false,
        })
        this.prizes[this.prizes.length - 1].y = s
      })
    })
    this.ducks = Array.from({ length: 4 }, (_, i) => this.newDuck(20 + i * 44))
    this.shots = []
  }

  private newDuck(x: number): Prize {
    return { kind: 'duck', x, y: -1, hp: 1, color: '#ffd23f', lean: 0, falling: 0, fvx: 0, fvy: 0, dy: 0, gone: false }
  }

  /** Where the gun is held (between your hands) and where its muzzle points. */
  private grip() {
    // Shouldered on the right, beside your cheek.
    const p = placePlayer('act_f_aim', this.cx, this.bottom)
    return { x: p.x + 27, y: p.y + 24 }
  }
  private muzzle(s: { x: number; y: number }) {
    const b = this.grip()
    const a = Math.atan2(s.y - b.y, s.x - b.x)
    return { x: b.x + Math.cos(a) * 24, y: b.y + Math.sin(a) * 24 }
  }

  private baseY(p: Prize) {
    return p.kind === 'duck' ? this.rail : this.shelves[p.y]
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') {
      this.aiming = true
      this.aim = { x: e.x, y: e.y - 28 }
      return
    }
    if (e.type === 'move' && this.aiming) {
      this.aim = { x: Math.max(6, Math.min(this.w - 6, e.x)), y: Math.max(this.top + 10, Math.min(this.rail + 6, e.y - 28)) }
      return
    }
    if (e.type === 'up' && this.aiming) {
      this.aiming = false
      if (this.corks <= 0) return
      const s = this.sight()
      this.corks--
      this.recoil = 1
      const m = this.muzzle(s)
      this.shots.push({ x0: m.x, y0: m.y, x1: s.x, y1: s.y, t: 0 })
      fairSfx.cork()
      this.shake(0.08, 1)
    } else if (e.type === 'cancel') this.aiming = false
  }

  protected tick(dt: number) {
    this.recoil = Math.max(0, this.recoil - dt * 5)
    for (const p of [...this.prizes, ...this.ducks]) {
      p.lean *= Math.exp(-dt * 6)
      if (p.falling > 0) {
        p.falling += dt
        p.x += p.fvx * dt
        p.dy += p.fvy * dt
        p.fvy += 220 * dt
        if (p.falling > 1.2) p.gone = true
      }
    }
    // Ducks paddle along the rail and come round again.
    for (const d of this.ducks) {
      if (d.falling > 0) continue
      d.x += 22 * dt
      if (d.x > this.w + 10) d.x = -10
    }
    this.ducks = this.ducks.map((d) => (d.gone ? this.newDuck(-12) : d))
    for (const s of this.shots) s.t += dt / FLIGHT
    const hit = this.shots.filter((s) => s.t >= 1)
    this.shots = this.shots.filter((s) => s.t < 1)
    for (const s of hit) this.impact(s.x1, s.y1)
  }

  private impact(x: number, y: number) {
    for (const p of [...this.ducks, ...this.prizes]) {
      if (p.gone || p.falling > 0) continue
      const d = CORK_PRIZES[p.kind]
      const by = this.baseY(p)
      if (Math.abs(x - p.x) > d.w / 2 + 1 || y < by - d.h - 1 || y > by + 1) continue
      const rel = (y - (by - d.h)) / d.h
      p.hp -= corkDamage(p.kind, rel)
      p.lean = x < p.x ? 1 : -1
      this.hits++
      this.particles.sparkles(x, y, 5, '#fff3a6', 8)
      if (p.hp <= 0) {
        p.falling = 0.01
        p.fvx = (p.x - x) * 4 + rand(-10, 10)
        p.fvy = -50
        this.score += d.pts
        this.say(p.x, by - d.h - 8, p.kind === 'teddy' ? `หมียักษ์ตก! +${d.pts}` : p.kind === 'duck' ? `เป็ด! +${d.pts}` : `ตก! +${d.pts}`, 'good', 1)
        fairSfx.knock()
        haptic(16)
        if (p.kind === 'teddy') this.flash(0.15)
      } else {
        this.say(p.x, by - d.h - 8, p.kind === 'teddy' ? pick(['หมีโยก!', 'อีกนิด!', 'เล็งหัว!']) : 'โยก!', 'info', 0.8)
        fairSfx.thunk()
      }
      return
    }
    // Missed: the cork bounces off the back wall.
    for (let i = 0; i < 4; i++) this.particles.add({ kind: 'dot', x, y, vx: rand(-20, 20), vy: rand(-30, -10), g: 90, max: 0.5, color: '#c8a878' })
    if (Math.random() < 0.4) this.say(x, y - 10, pick(['วืด!', 'พลาด!', 'จุกเบี้ยว!']), 'warn', 0.8)
    fairSfx.miss()
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    drawBulbs(g, this.w, this.top + 6, this.t)
    for (const y of this.shelves) {
      g.rect(12, y, this.w - 24, 3, '#c8a878')
      g.hline(12, this.w - 13, y, '#e0c8a0')
      g.rect(12, y + 3, this.w - 24, 1, '#6a4a3a')
    }
    // Duck rail.
    g.rect(0, this.rail, this.w, 2, '#8a8480')
    g.rect(0, this.rail + 2, this.w, 4, '#3d63b5')
    for (let x = (this.t * 22) % 8; x < this.w; x += 8) g.px(Math.round(x), this.rail + 3, '#9fd0ff')
    for (const p of [...this.prizes, ...this.ducks]) {
      if (p.gone) continue
      const by = this.baseY(p) + p.dy
      drawCorkPrize(g, p.x, by, p.kind, p.lean + (p.falling > 0 ? p.falling * 4 * Math.sign(p.fvx || 1) : 0), p.color, this.t)
    }
    // Corks in flight.
    for (const s of this.shots) {
      const x = s.x0 + (s.x1 - s.x0) * s.t
      const y = s.y0 + (s.y1 - s.y0) * s.t
      g.circle(Math.round(x), Math.round(y), 1.6 + (1 - s.t) * 1.2, '#c8a878')
      g.px(Math.round(x), Math.round(y), '#e8d8b8')
    }
    const sight = this.sight()
    if (this.playing) drawCrosshair(g, sight.x, sight.y, this.t, this.aiming)
    // You, from behind, the cork gun shouldered and kicking back on each shot.
    const done = this.corks <= 0 && this.shots.length === 0
    drawPlayer(g, done ? (this.hits >= 5 ? 'act_f_cheer' : 'act_f_oops') : 'act_f_aim', this.cx, this.bottom, { dy: Math.round(this.recoil * 2) })
    if (!done) {
      const b = this.grip()
      drawHeldGun(g, b.x, b.y + Math.round(this.recoil * 2), sight.x, sight.y, this.recoil)
    }
    for (let i = 0; i < this.corks; i++) {
      g.circle(10 + i * 5, this.bottom - 8, 1.8, '#c8a878')
      g.px(10 + i * 5, this.bottom - 9, '#e8d8b8')
    }
  }
}
