// ปาลูกโป่ง – balloon darts. Rows of balloons slide across the board; tap to
// throw a dart at that spot (it takes a moment to fly, so lead the moving
// balloons). Gold balloons are worth 3, the hippo balloon floating across
// the top is worth 5, steel balloons just go "ป๊อง!". Combos add a bonus.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic } from '../../engine/audio'
import { JobScene, type JobSummary } from '../jobs/base'
import { BALLOON_COLORS, boothBackdrop, drawBalloon, drawBulbs, drawDart, type BalloonKind } from './art'
import { fairSfx } from './sound'
import { balloonPoints, DART_TARGET } from './rules'

const DARTS = 12
const FLIGHT = 0.22

interface Balloon {
  u: number
  kind: BalloonKind
  color: string
  alive: boolean
  respawn: number
  wob: number
}

interface Row {
  y: number
  dir: 1 | -1
  speed: number
  spacing: number
  offset: number
  balloons: Balloon[]
}

interface Flying {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
}

export class DartsScene extends JobScene {
  duration = 35
  thresholds: [number, number, number] = [6 / DART_TARGET, 12 / DART_TARGET, 1]
  score = 0
  darts = DARTS
  hits = 0
  combo = 0
  best = 0
  rows: Row[] = []
  flying: Flying[] = []
  stuck: { x: number; y: number; ang: number }[] = []
  hippo: { x: number; y: number; dir: 1 | -1; alive: boolean } | null = null
  private hippoT = 5
  private bg: HTMLCanvasElement | null = null
  private boardTop = 60
  private boardBot = 260
  private boardX0 = 10
  private boardX1 = 180

  progress() {
    return Math.min(1, this.score / DART_TARGET)
  }
  goalText() {
    return `แต้ม ${this.score} · ดอก ${this.darts}`
  }
  complete() {
    return this.darts <= 0 && this.flying.length === 0
  }
  summary(): JobSummary {
    return {
      title: this.score >= DART_TARGET ? 'นักปาลูกโป่งมือทอง!' : undefined,
      lines: [`ปาโดน ${this.hits}/${DARTS} ลูก · คอมโบสูงสุด ${this.best}`, `คะแนน ${this.score}`],
    }
  }

  protected anchor() {
    this.boardTop = this.top + 22
    this.boardBot = this.bottom - 62
    this.boardX0 = 12
    this.boardX1 = this.w - 12
    this.bg = boothBackdrop(this.w, this.h, this.boardTop - 4, '#e8514a', '#e8d0a8')
    const n = this.rows.length || 5
    const gap = (this.boardBot - this.boardTop - 30) / n
    this.rows.forEach((r, i) => (r.y = Math.round(this.boardTop + 30 + gap * i + gap / 2)))
  }

  protected populate() {
    const n = 5
    const gap = (this.boardBot - this.boardTop - 30) / n
    const width = this.boardX1 - this.boardX0
    this.rows = Array.from({ length: n }, (_, i) => {
      const spacing = 26 + (i % 2) * 5
      const count = Math.ceil((width + spacing * 2) / spacing)
      return {
        y: Math.round(this.boardTop + 30 + gap * i + gap / 2),
        dir: i % 2 ? -1 : 1,
        speed: [16, 28, 20, 34, 24][i],
        spacing,
        offset: rand(0, spacing),
        balloons: Array.from({ length: count }, () => this.newBalloon()),
      } as Row
    })
    this.flying = []
    this.stuck = []
    this.hippo = null
  }

  private newBalloon(): Balloon {
    const r = Math.random()
    const kind: BalloonKind = r < 0.12 ? 'gold' : r < 0.22 ? 'steel' : 'normal'
    return { u: 0, kind, color: pick(BALLOON_COLORS), alive: true, respawn: 0, wob: rand(0, 6) }
  }

  /** World x of balloon i in row r. */
  private bx(r: Row, i: number) {
    const width = this.boardX1 - this.boardX0 + r.spacing * 2
    let x = (i * r.spacing + r.offset) % width
    if (x < 0) x += width
    return this.boardX0 - r.spacing + x
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down' || this.darts <= 0) return
    if (e.y > this.boardBot + 10 || e.y < this.boardTop - 6) return
    this.darts--
    this.flying.push({ x0: this.cx, y0: this.bottom - 22, x1: e.x, y1: e.y, t: 0 })
    fairSfx.tick()
  }

  protected tick(dt: number) {
    const width = this.boardX1 - this.boardX0
    for (const r of this.rows) {
      r.offset += r.dir * r.speed * dt * (this.playing ? 1 : 0.4)
      const span = width + r.spacing * 2
      r.offset = ((r.offset % span) + span) % span
      for (const b of r.balloons) {
        b.wob += dt
        if (!b.alive) {
          b.respawn -= dt
          if (b.respawn <= 0) Object.assign(b, this.newBalloon())
        }
      }
    }
    // The hippo balloon floats across the top now and then.
    if (this.playing) {
      this.hippoT -= dt
      if (!this.hippo && this.hippoT <= 0) {
        const dir = Math.random() < 0.5 ? 1 : -1
        this.hippo = { x: dir > 0 ? -10 : this.w + 10, y: this.boardTop + 12, dir, alive: true }
        this.hippoT = rand(7, 11)
        this.say(this.cx, this.boardTop + 4, 'หมูดึ๋งลอยมาแล้ว! +5', 'good', 1.4)
      }
    }
    if (this.hippo) {
      this.hippo.x += this.hippo.dir * 38 * dt
      this.hippo.y = this.boardTop + 12 + Math.sin(this.t * 3) * 3
      if (this.hippo.x < -20 || this.hippo.x > this.w + 20) this.hippo = null
    }
    for (const f of this.flying) f.t += dt / FLIGHT
    const landed = this.flying.filter((f) => f.t >= 1)
    this.flying = this.flying.filter((f) => f.t < 1)
    for (const f of landed) this.land(f)
  }

  private land(f: Flying) {
    const ang = Math.atan2(f.y1 - f.y0, f.x1 - f.x0)
    // The hippo first (it floats in front).
    if (this.hippo?.alive && Math.hypot(f.x1 - this.hippo.x, f.y1 - this.hippo.y) < 9) {
      this.pop(this.hippo.x, this.hippo.y, 'hippo', '#b4a8c8')
      this.hippo = null
      return
    }
    for (const r of this.rows) {
      for (let i = 0; i < r.balloons.length; i++) {
        const b = r.balloons[i]
        if (!b.alive) continue
        const x = this.bx(r, i)
        const y = r.y + Math.sin(b.wob * 2) * 1.2
        if (Math.hypot(f.x1 - x, f.y1 - y) > 9.5) continue
        if (b.kind === 'steel') {
          this.combo = 0
          this.say(x, y - 10, pick(['ป๊อง!', 'ลูกโป่งเหล็ก!', 'แตกยากกว่าใจแฟนเก่า']), 'warn', 1)
          fairSfx.knock()
          this.shake(0.12, 1)
          return
        }
        b.alive = false
        b.respawn = rand(2.5, 4)
        this.pop(x, y, b.kind, b.color)
        return
      }
    }
    // Missed: the dart sticks in the board.
    this.combo = 0
    if (f.y1 > this.boardTop && f.y1 < this.boardBot) this.stuck.push({ x: f.x1, y: f.y1, ang })
    if (this.stuck.length > 14) this.stuck.shift()
    fairSfx.thunk()
    if (Math.random() < 0.4) this.say(f.x1, f.y1 - 10, pick(['พลาด!', 'เกือบแล้ว!', 'อีกนิด!']), 'info', 0.8)
  }

  private pop(x: number, y: number, kind: BalloonKind, color: string) {
    const pts = balloonPoints(kind, this.combo)
    this.combo++
    this.best = Math.max(this.best, this.combo)
    this.hits++
    this.score += pts
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      this.particles.add({ kind: 'dot', x, y, vx: Math.cos(a) * rand(30, 60), vy: Math.sin(a) * rand(30, 60), g: 60, max: 0.5, color: i % 3 ? color : '#fffaf0' })
    }
    this.particles.sparkles(x, y, kind === 'normal' ? 4 : 10, kind === 'gold' ? '#fff3a6' : '#ffffff', 10)
    const txt = kind === 'hippo' ? `หมูดึ๋ง! +${pts}` : kind === 'gold' ? `ทอง! +${pts}` : this.combo >= 3 ? `คอมโบ ${this.combo}! +${pts}` : `+${pts}`
    this.say(x, y - 12, txt, 'good', 0.9)
    fairSfx.pop()
    haptic(12)
    if (kind !== 'normal') this.flash(0.12)
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    drawBulbs(g, this.w, this.boardTop - 16, this.t)
    // Board frame rails.
    for (const r of this.rows) g.hline(this.boardX0, this.boardX1, r.y + 12, '#c8a878')
    for (const s of this.stuck) drawDart(g, s.x, s.y, s.ang, 7)
    for (const r of this.rows) {
      for (let i = 0; i < r.balloons.length; i++) {
        const b = r.balloons[i]
        if (!b.alive) continue
        const x = this.bx(r, i)
        if (x < this.boardX0 - 4 || x > this.boardX1 + 4) continue
        drawBalloon(g, x, r.y + Math.sin(b.wob * 2) * 1.2, 8, b.color, b.kind, this.t)
      }
    }
    if (this.hippo) {
      g.line(Math.round(this.hippo.x), Math.round(this.hippo.y) + 8, Math.round(this.hippo.x - this.hippo.dir * 3), Math.round(this.hippo.y) + 16, '#fffaf0')
      drawBalloon(g, this.hippo.x, this.hippo.y, 7, '#b4a8c8', 'hippo', this.t)
    }
    // Side curtains mask the wrap-around.
    g.rect(0, this.boardTop, this.boardX0, this.boardBot - this.boardTop, '#8a2335')
    g.rect(this.boardX1, this.boardTop, this.w - this.boardX1, this.boardBot - this.boardTop, '#8a2335')
    // Darts in flight (a little arc).
    for (const f of this.flying) {
      const k = f.t
      const x = f.x0 + (f.x1 - f.x0) * k
      const y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 10
      const nx = f.x0 + (f.x1 - f.x0) * Math.min(1, k + 0.05)
      const ny = f.y0 + (f.y1 - f.y0) * Math.min(1, k + 0.05) - Math.sin(Math.min(1, k + 0.05) * Math.PI) * 10
      drawDart(g, x, y, Math.atan2(ny - y, nx - x), 10)
    }
    // The thrower's hand with the next dart, and the darts left.
    const hx = this.cx
    const hy = this.bottom - 14
    if (this.darts > 0) drawDart(g, hx + 2, hy - 14, -Math.PI / 2 - 0.15, 12)
    g.circle(hx, hy, 5, '#f0bd90')
    g.circle(hx + 2, hy - 3, 2.5, '#f0bd90')
    for (let i = 0; i < this.darts; i++) {
      const x = 10 + i * 6
      drawDart(g, x, this.bottom - 30, -Math.PI / 2, 8)
    }
  }
}
