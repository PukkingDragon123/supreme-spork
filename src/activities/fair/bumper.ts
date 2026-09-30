// รถบั๊มพ์ – a quick drive in the bumper-car arena. Hold a finger down and
// your car (with you at the wheel) zooms towards it; let go to coast. Ram
// the other cars: rear-enders and side hits score double, the golden car is
// worth more. Get rammed hard and you spin round. A cockpit cam in the corner
// shows your face at every BONK.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic } from '../../engine/audio'
import { game } from '../../game/state'
import { grantCollectible, ownedCount } from '../../game/collectibles'
import { dollSprite, type DollPose } from '../../art/doll'
import type { AvatarLook } from '../../art/avatar'
import { randomVisitorLook } from '../../scenes/world'
import { BUMPER_COLS, bumperFloor, drawBumperCarBig } from '../../art/places/fair-rides'
import { BULBS } from '../../art/places/fair'
import { INK } from '../../art/places/hub-kit'
import '../../art/poses/fair'
import { JobScene, type JobSummary } from '../jobs/base'
import { fairSfx } from './sound'
import { BUMPER_TARGET, bumpPoints } from './rules'

interface Car {
  x: number
  y: number
  vx: number
  vy: number
  ang: number
  color: string
  driver: AvatarLook
  golden: boolean
  me: boolean
  spin: number
  cool: number
  tx: number
  ty: number
  chase: number
}

const RAD = 14
const SQ = 1.5

export class BumperScene extends JobScene {
  duration = 30
  thresholds: [number, number, number] = [5 / BUMPER_TARGET, 10 / BUMPER_TARGET, 1]
  score = 0
  bumps = 0
  rears = 0
  hits = 0
  cars: Car[] = []
  private hold: { x: number; y: number } | null = null
  private arena = { x: 8, y: 60, w: 174, h: 260 }
  private bonk = 0
  private sayCool = 0

  progress() {
    return Math.min(1, this.score / BUMPER_TARGET)
  }
  goalText() {
    return `แต้ม ${this.score} · ชน ${this.bumps} ครั้ง`
  }
  complete() {
    return false
  }
  summary(): JobSummary {
    return {
      title: this.score >= BUMPER_TARGET ? 'ราชารถบั๊มพ์แห่งงานวัด!' : undefined,
      lines: [`ชนสำเร็จ ${this.bumps} ครั้ง (ชนท้าย/ชนข้าง ${this.rears}) · โดนชน ${this.hits} ครั้ง`, `คะแนน ${this.score}`],
    }
  }

  get me(): Car | undefined {
    return this.cars.find((c) => c.me)
  }

  protected anchor() {
    this.arena = { x: 8, y: this.top + 54, w: this.w - 16, h: this.bottom - this.top - 60 }
  }

  protected populate() {
    const a = this.arena
    const my = game.value.player.look
    this.cars = [
      { x: a.x + a.w / 2, y: a.y + a.h - 30, vx: 0, vy: 0, ang: -Math.PI / 2, color: '#ff6fa8', driver: my, golden: false, me: true, spin: 0, cool: 0, tx: 0, ty: 0, chase: 0 },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: a.x + 24 + ((i * 47) % (a.w - 48)),
        y: a.y + 30 + ((i * 61) % (a.h * 0.5)),
        vx: rand(-20, 20),
        vy: rand(-20, 20),
        ang: rand(0, 6),
        color: BUMPER_COLS[i % BUMPER_COLS.length],
        driver: randomVisitorLook(),
        golden: i === 5,
        me: false,
        spin: 0,
        cool: 0,
        tx: a.x + a.w / 2,
        ty: a.y + a.h / 2,
        chase: 0,
      })),
    ]
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down' || e.type === 'move') {
      if (e.type === 'move' && !this.hold) return
      this.hold = { x: e.x, y: e.y }
    } else this.hold = null
  }

  protected tick(dt: number) {
    const a = this.arena
    this.bonk = Math.max(0, this.bonk - dt)
    this.sayCool = Math.max(0, this.sayCool - dt)
    for (const c of this.cars) {
      c.cool = Math.max(0, c.cool - dt)
      if (c.spin > 0) {
        c.spin -= dt
        c.ang += dt * 14
      } else if (c.me) {
        if (this.hold && this.playing) {
          const dx = this.hold.x - c.x
          const dy = (this.hold.y - c.y) * SQ
          const d = Math.hypot(dx, dy)
          if (d > 4) {
            c.vx += (dx / d) * 150 * dt
            c.vy += ((dy / d) * 150 * dt) / SQ
          }
        }
      } else if (this.playing || this.phase === 'ready') {
        c.chase -= dt
        const me = this.me
        if (c.chase <= 0) {
          c.chase = rand(1.5, 3.5)
          if (me && Math.random() < 0.35) {
            c.tx = me.x
            c.ty = me.y
          } else {
            c.tx = rand(a.x + 20, a.x + a.w - 20)
            c.ty = rand(a.y + 20, a.y + a.h - 20)
          }
        }
        const dx = c.tx - c.x
        const dy = c.ty - c.y
        const d = Math.hypot(dx, dy) || 1
        const acc = c.golden ? 90 : 70
        c.vx += (dx / d) * acc * dt
        c.vy += (dy / d) * acc * dt
      }
      // Friction and top speed.
      const k = Math.exp(-dt * (c.me && !this.hold ? 1.8 : 1.1))
      c.vx *= k
      c.vy *= k
      const max = c.me ? 92 : c.golden ? 70 : 58
      const sp = Math.hypot(c.vx, c.vy)
      if (sp > max) {
        c.vx *= max / sp
        c.vy *= max / sp
      }
      if (sp > 6 && c.spin <= 0) {
        const want = Math.atan2(c.vy, c.vx)
        let d = want - c.ang
        while (d > Math.PI) d -= Math.PI * 2
        while (d < -Math.PI) d += Math.PI * 2
        c.ang += d * Math.min(1, dt * 8)
      }
      c.x += c.vx * dt
      c.y += c.vy * dt
      // Padded walls.
      if (c.x < a.x + RAD || c.x > a.x + a.w - RAD) {
        c.vx = -c.vx * 0.7
        c.x = Math.max(a.x + RAD, Math.min(a.x + a.w - RAD, c.x))
        if (c.me && Math.abs(c.vx) > 20) fairSfx.thunk()
      }
      if (c.y < a.y + RAD + 4 || c.y > a.y + a.h - 4) {
        c.vy = -c.vy * 0.7
        c.y = Math.max(a.y + RAD + 4, Math.min(a.y + a.h - 4, c.y))
        if (c.me && Math.abs(c.vy) > 20) fairSfx.thunk()
      }
    }
    // Collisions (ellipses: y squashed).
    for (let i = 0; i < this.cars.length; i++)
      for (let j = i + 1; j < this.cars.length; j++) this.collide(this.cars[i], this.cars[j])
  }

  private collide(A: Car, B: Car) {
    const dx = B.x - A.x
    const dy = (B.y - A.y) * SQ
    const d = Math.hypot(dx, dy)
    const min = RAD * 2
    if (d >= min || d === 0) return
    const nx = dx / d
    const ny = dy / d
    const push = (min - d) / 2
    A.x -= nx * push
    A.y -= (ny * push) / SQ
    B.x += nx * push
    B.y += (ny * push) / SQ
    const va = A.vx * nx + A.vy * SQ * ny
    const vb = B.vx * nx + B.vy * SQ * ny
    const rel = va - vb
    if (rel <= 0) return
    const J = rel * 1.05
    A.vx -= J * nx
    A.vy -= (J * ny) / SQ
    B.vx += J * nx
    B.vy += (J * ny) / SQ
    const mx = (A.x + B.x) / 2
    const my = (A.y + B.y) / 2
    if (rel > 18) {
      this.particles.sparkles(mx, my - 8, 6, '#fff3a6', 6)
      fairSfx.bump()
    }
    if (!(A.me || B.me) || A.cool > 0 || B.cool > 0) return
    A.cool = B.cool = 0.45
    const me = A.me ? A : B
    const other = A.me ? B : A
    // Who hit whom: the car moving into the contact harder.
    const toOther = A.me ? { x: nx, y: ny } : { x: -nx, y: -ny }
    const myPush = me.vx * toOther.x + me.vy * SQ * toOther.y
    const theirPush = -(other.vx * toOther.x + other.vy * SQ * toOther.y)
    if (!this.playing) return
    if (myPush >= theirPush) {
      const heading = { x: Math.cos(other.ang), y: Math.sin(other.ang) }
      const dot = heading.x * toOther.x + heading.y * toOther.y
      const pts = bumpPoints(rel, dot, other.golden)
      if (pts <= 0) return
      this.score += pts
      this.bumps++
      if (dot > -0.5) this.rears++
      other.spin = dot > 0.5 ? 0.6 : 0.3
      this.bonk = 0.45
      this.shake(0.15, 2)
      haptic(20)
      const txt = other.golden ? `รถทอง! +${pts}` : dot > 0.5 ? `ชนท้าย! +${pts}` : dot > -0.5 ? `ชนข้าง! +${pts}` : `ปึ้ก! +${pts}`
      this.say(mx, my - 22, txt, 'good', 0.9)
      if (other.golden) this.flash(0.15)
    } else if (theirPush > 30) {
      this.hits++
      me.spin = 0.7
      this.bonk = 0.6
      this.shake(0.2, 2)
      haptic(30)
      if (this.sayCool <= 0) {
        this.sayCool = 1.5
        this.say(me.x, me.y - 26, pick(['โดนชน! หมุนติ้ว~', 'เฮ้ย!', 'แค้นนี้ต้องชำระ!']), 'warn', 1)
      }
    }
  }

  protected ended() {
    if (this.progress() >= 1 && ownedCount('fair_bumper_badge') === 0) grantCollectible('fair_bumper_badge')
  }

  protected draw(g: Surface) {
    const { w, h, t } = this
    const a = this.arena
    g.rect(0, 0, w, h, '#1c1a30')
    // Roof canopy with the sign and bulbs.
    g.rect(0, this.top, w, 22, '#2a3a6a')
    for (let x = 0; x < w; x += 10) g.poly([[x, this.top + 22], [x + 10, this.top + 22], [x + 5, this.top + 27]], Math.floor(x / 10) % 2 ? '#e8514a' : '#ffd23f')
    for (let x = 4, i = 0; x < w; x += 6, i++) {
      const on = (Math.floor(t * 8) + i) % 4 !== 0
      g.rect(x, this.top + 2, 2, 2, on ? BULBS[i % BULBS.length] : '#3a3048')
      g.rect(x, this.top + 17, 2, 2, on ? BULBS[(i + 3) % BULBS.length] : '#3a3048')
    }
    g.poly([[this.cx - 4, this.top + 6], [this.cx + 6, this.top + 6], [this.cx, this.top + 11], [this.cx + 5, this.top + 11], [this.cx - 5, this.top + 17], [this.cx - 1, this.top + 11]], '#ffd23f')
    // Spectators leaning on the back rail, cheering.
    for (let i = 0; i < 9; i++) {
      const x = 14 + i * ((w - 28) / 8)
      const up = Math.floor(t * 3 + i) % 4 === 0 ? 2 : 0
      g.circle(Math.round(x), a.y - 12 - up, 5, ['#2a1a1a', '#5a3a2a', '#1a1a2a', '#8a6a4a'][i % 4])
      g.rect(Math.round(x) - 5, a.y - 8 - up, 11, 8, ['#e8514a', '#5a8de0', '#fffaf0', '#6cc36a', '#ffd23f', '#c8a0ff'][i % 6])
      if (up) g.rect(Math.round(x) + 5, a.y - 20, 2, 6, '#f0bd90')
    }
    // Floor and rails.
    bumperFloor(g, a.x, a.y, a.w, a.h)
    g.rect(a.x - 4, a.y - 2, a.w + 8, 4, '#e8514a')
    g.rect(a.x - 4, a.y + a.h - 2, a.w + 8, 4, '#e8514a')
    g.rect(a.x - 4, a.y, 4, a.h, '#e8514a')
    g.rect(a.x + a.w, a.y, 4, a.h, '#e8514a')
    for (let x = a.x; x < a.x + a.w; x += 20) g.rect(x, a.y - 3, 3, 6, '#8a8480')
    // Target marker while holding.
    if (this.hold && this.playing) {
      const r = 4 + Math.round(Math.sin(t * 12))
      for (let i = 0; i < 16; i++) {
        const q = (i / 16) * Math.PI * 2
        g.px(Math.round(this.hold.x + Math.cos(q) * r), Math.round(this.hold.y + Math.sin(q) * r * 0.7), '#fff3a6')
      }
    }
    // Cars, back to front.
    const sorted = [...this.cars].sort((p, q) => p.y - q.y)
    sorted.forEach((c, i) => {
      drawBumperCarBig(g, c.x, c.y + 6, c.ang, c.color, c.driver, t, { golden: c.golden, spin: c.spin > 0 })
      if (c.me) {
        const bob = Math.round(Math.sin(t * 6) * 1)
        g.poly([[c.x - 4, c.y - 38 + bob], [c.x + 4, c.y - 38 + bob], [c.x, c.y - 33 + bob]], '#fff3a6')
        g.px(Math.round(c.x), Math.round(c.y - 39 + bob), '#ffffff')
      }
      // Spark on top of the pole.
      if ((Math.floor(t * 14) + i * 3) % 5 === 0) {
        const px = Math.round(c.x - 9)
        const py = Math.round(c.y - 31)
        g.px(px, py, '#ffffff')
        g.px(px - 1, py, '#9fd0ff')
        g.px(px + 1, py - 1, '#9fd0ff')
        g.px(px, py - 1, '#e8f8ff')
      }
    })
    // The ceiling net.
    g.alpha(0.18)
    for (let x = a.x; x < a.x + a.w; x += 14) g.vline(x, a.y, a.y + a.h, '#c8c0d8')
    for (let y = a.y; y < a.y + a.h; y += 14) g.hline(a.x, a.x + a.w, y, '#c8c0d8')
    g.alpha(1)
    // Cockpit cam: you, reacting.
    const cw = 40
    const chh = 40
    const cx = w - cw - 6
    const cy = a.y + 6
    g.rect(cx - 2, cy - 2, cw + 4, chh + 4, INK)
    g.rect(cx, cy, cw, chh, '#3a4a7a')
    const pose: DollPose = this.bonk > 0 ? 'act_f_bonk' : 'act_f_drive'
    const sp = dollSprite(game.value.player.look, pose, { view: 'front', blink: Math.floor(t * 2) % 9 === 0 })
    const shake = this.bonk > 0 ? Math.round(Math.sin(t * 50) * 1) : 0
    g.drawPart(sp.canvas, 0, 6, sp.w, chh - 6, cx + Math.round((cw - sp.w) / 2) + shake, cy + 4)
    g.rect(cx, cy + chh - 8, cw, 8, '#ff6fa8')
    g.rect(cx, cy + chh - 8, cw, 1, '#ffb0d0')
    if (this.bonk > 0) {
      g.px(cx + 4, cy + 6, '#ffe27a')
      g.px(cx + cw - 5, cy + 8, '#ffe27a')
    }
    void h
  }
}
