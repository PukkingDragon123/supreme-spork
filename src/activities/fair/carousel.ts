// ม้าหมุน – ride the carousel. Your doll sits on a painted horse that rises
// and falls on its brass pole while the fair whirls past behind. Every few
// seconds the ring arm swings in: tap while the ring is in reach to grab it.
// Golden rings are rare (and a souvenir).

import type { PointerInfo } from '../../engine/stage'
import { bake, type Surface } from '../../engine/pixel'
import { cached } from '../../engine/sprite'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { game } from '../../game/state'
import { DOLL_W, dollSprite, type DollPose } from '../../art/doll'
import { BULBS } from '../../art/places/fair'
import { drawPanoramaLive, panoramaBase, PANO_W } from '../../art/places/fair-views'
import { INK, mix } from '../../art/places/hub-kit'
import { outlineCanvas } from '../../engine/sprite'
import { fairHand } from '../../art/poses/fair'
import type { JobSummary } from '../jobs/base'
import { FairShow, type ShowAction } from './show'
import { fairSfx } from './sound'

const HORSES = ['#fffaf0', '#ff9fc0', '#ffd23f', '#9fd0ff']

/** Is the arm's ring within the rider's reach? (offsets from the hand, px). */
export function ringInReach(dx: number, dy: number): boolean {
  return Math.abs(dx) < 12 && Math.abs(dy) < 14
}

/** A painted carousel horse facing right (48×34, outlined). Anchor: saddle (22, 12). */
function horseSprite(c: string) {
  return cached(`fair:horse:${c}`, () => {
    const D = mix(c, INK, 0.28)
    const L = mix(c, '#ffffff', 0.45)
    const cv = bake(46, 32, (g) => {
      // Tail.
      for (let i = 0; i < 6; i++) g.line(6, 10 + i, 1 - (i % 3), 16 + i * 2, i % 2 ? '#ffd23f' : '#e8514a')
      // Body.
      g.ellipse(21, 15, 14, 7, D)
      g.ellipse(21, 14, 13, 6, c)
      g.ellipse(18, 12, 8, 2.5, L)
      // Legs mid-gallop.
      g.thickLine(11, 18, 7, 25, 2.4, D)
      g.thickLine(7, 25, 9, 29, 2, D)
      g.thickLine(15, 19, 14, 29, 2.4, c)
      g.thickLine(27, 19, 33, 25, 2.4, D)
      g.thickLine(33, 25, 36, 23, 2, D)
      g.thickLine(30, 18, 30, 29, 2.4, c)
      for (const [x, y] of [
        [9, 29],
        [14, 29],
        [36, 23],
        [30, 29],
      ])
        g.rect(x - 1, y, 3, 2, '#b8742a')
      // Neck and head.
      g.poly([[29, 12], [34, 3], [39, 4], [37, 14]], c)
      g.ellipse(40, 6, 5, 3.5, c)
      g.ellipse(43, 8, 3, 2.4, L)
      g.px(40, 4, INK)
      g.px(44, 8, D)
      g.poly([[36, 2], [37, -1], [39, 2]], D)
      // Mane.
      for (let i = 0; i < 6; i++) g.circle(32 + i * 1.2, 4 + i * 1.6, 1.6, i % 2 ? '#e8514a' : '#ff9fc0')
      // Saddle with gold trim and a jewel.
      g.rect(15, 7, 12, 4, '#e8514a')
      g.hline(15, 26, 7, '#ffd54f')
      g.hline(15, 26, 11, '#ffd54f')
      g.circle(21, 9, 1.2, '#6cf0c0')
      g.rect(18, 11, 2, 6, '#ffd54f')
    })
    return outlineCanvas(cv, INK)
  })
}

interface Arm {
  x: number
  gold: boolean
  taken: boolean
  missed: boolean
}

export class CarouselRide extends FairShow {
  duration = 30
  private spin = 0
  private arm: Arm | null = null
  private nextArm = 3
  private rings = 0
  private golds = 0
  private grabT = 0
  private missT = 0
  private arms = 0
  private me = game.value.player.look
  private bob = 0
  private speed = 0

  tip() {
    if (this.arm && !this.arm.taken && !this.arm.missed) return this.arm.gold ? 'ห่วงทองมาแล้ว!! แตะตอนอยู่ในวง' : 'แขนแจกห่วงมาแล้ว แตะให้ทัน!'
    return `ห่วงที่คว้าได้ ${this.rings} · ห่วงทอง ${this.golds}`
  }

  action(): ShowAction | null {
    const hot = !!this.arm && !this.arm.taken && !this.arm.missed && this.reach()
    return { label: hot ? 'คว้าเลย!' : 'คว้าห่วง', icon: 'star', hot }
  }

  onAction() {
    this.grab()
  }

  summary(): JobSummary {
    return {
      title: this.golds ? 'คว้าห่วงทองได้!' : this.rings >= 3 ? 'มือไวสุดในม้าหมุน!' : 'ม้าหมุนสนุกจัง',
      lines: [`คว้าห่วงได้ ${this.rings} วง จาก ${this.arms} รอบ`, this.golds ? `ห่วงทอง ${this.golds} วง!` : 'ห่วงทองยังรออยู่ ลองอีกรอบนะ'],
    }
  }

  protected anchor() {}
  protected populate() {
    this.rings = 0
    this.golds = 0
    this.arms = 0
    this.arm = null
    this.nextArm = 3
  }

  private floorY() {
    return this.bottom - 16
  }
  /** Saddle height at rest (the horse bobs around it). */
  private seatY() {
    return this.floorY() - 58
  }
  /** The waving hand (screen px), bobbing with the horse. */
  private hand() {
    const fh = fairHand('act_f_ride_wave', 'front', this.me)
    return { x: this.cx - Math.round(DOLL_W / 2) + fh.x, y: this.seatY() + this.bob - 44 + fh.y }
  }
  private armY() {
    const fh = fairHand('act_f_ride_wave', 'front', this.me)
    return this.seatY() - 44 + fh.y
  }
  private reach() {
    if (!this.arm) return false
    const h = this.hand()
    return ringInReach(this.arm.x - h.x, this.armY() - h.y)
  }

  private grab() {
    if (!this.playing) return
    const a = this.arm
    this.grabT = 0.5
    if (!a || a.taken || a.missed) return
    const h = this.hand()
    if (this.reach()) {
      a.taken = true
      this.rings++
      if (a.gold) {
        this.golds++
        this.prize = { id: 'fair_carousel_ring', once: true }
        this.particles.confetti(h.x, h.y, 30)
        this.flash(0.2)
        this.say(h.x, h.y - 20, 'ห่วงทอง!!!', 'good', 1.6)
        fairSfx.tada()
      } else {
        this.particles.sparkles(h.x, h.y, 10, '#fff3a6', 8)
        this.say(h.x, h.y - 20, pick(['ได้แล้ว!', 'คว้าทัน!', 'มือไวมาก!']), 'good', 1)
        fairSfx.clink()
      }
      haptic(20)
    } else {
      a.missed = true
      this.missT = 0.6
      const dy = this.armY() - h.y
      this.say(h.x, h.y - 20, Math.abs(dy) >= 14 ? (dy < 0 ? 'ม้ายังต่ำไป!' : 'ม้าสูงไป!') : a.x > h.x ? 'เร็วไป!' : 'ช้าไปนิด!', 'warn', 0.9)
      fairSfx.miss()
    }
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') this.grab()
  }

  protected tick(dt: number) {
    const e = this.elapsed
    this.speed = this.phase === 'play' ? Math.min(1, e / 2) * (e > this.duration - 3 ? Math.max(0.15, (this.duration - e) / 3) : 1) : 0.12
    this.spin += dt * this.speed
    this.bob = Math.round(Math.sin(this.t * 2.2) * 11 * this.speed)
    this.grabT = Math.max(0, this.grabT - dt)
    this.missT = Math.max(0, this.missT - dt)
    if (!this.playing) return
    // The ring arm swings in from the right and leaves on the left.
    this.nextArm -= dt
    if (!this.arm && this.nextArm <= 0 && e < this.duration - 4) {
      this.arms++
      this.arm = { x: this.w + 20, gold: this.arms === 4 || (this.arms > 2 && Math.random() < 0.28), taken: false, missed: false }
      this.nextArm = rand(3.2, 4.6)
      if (this.arm.gold) this.say(this.cx, this.top + 34, 'ห่วงทองกำลังมา!', 'good', 1.2)
      sfx.whoosh()
    }
    if (this.arm) {
      this.arm.x -= dt * 58 * this.speed
      if (this.arm.x < this.hand().x - 14 && !this.arm.taken && !this.arm.missed) {
        this.arm.missed = true
        this.say(this.hand().x, this.hand().y - 20, 'อ๊ะ! หลุดไปแล้ว', 'warn', 0.9)
      }
      if (this.arm.x < -30) this.arm = null
    }
  }

  protected draw(g: Surface) {
    const { w, h, t } = this
    const floorY = this.floorY()
    // The fair whirling past (the carousel turns, the world slides by).
    g.gradientV(0, 0, w, h, ['#10123a', '#1c2258', '#2a3472'])
    const pw = PANO_W
    const off = ((this.spin * 70) % pw + pw) % pw
    const py = Math.round(floorY - 250)
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(k * pw - off)
      if (x > w || x + pw < 0) continue
      g.draw(panoramaBase(), x, py)
      drawPanoramaLive(g, x, py, t)
    }
    g.rect(0, py + 210, w, h, '#3a3446')
    // The mirror column in the middle of the carousel (turning: panels slide).
    const colX = 26
    g.rect(colX - 20, this.top + 20, 40, floorY - this.top - 20, '#c8343f')
    const so = (this.spin * 60) % 14
    for (let y = this.top + 26; y < floorY - 8; y += 14) {
      for (let x = colX - 18 - so; x < colX + 18; x += 14) {
        const xx = Math.max(colX - 17, Math.round(x))
        const ww = Math.min(colX + 17, Math.round(x) + 10) - xx
        if (ww <= 0) continue
        g.rect(xx, y, ww, 8, '#fff6c8')
        g.px(xx + 1, y + 1, '#ffffff')
      }
    }
    // Floor boards turning.
    g.rect(0, floorY, w, h - floorY, '#c8704c')
    g.rect(0, floorY, w, 3, '#e8b070')
    for (let x = -((this.spin * 140) % 16); x < w; x += 16) g.vline(Math.round(x), floorY + 3, h, '#a85a3a')
    // Other horses on their poles, gliding past behind you.
    for (let k = 0; k < 3; k++) {
      const x = ((k * 120 - this.spin * 130) % 360 + 360) % 360 - 50
      const bob = Math.round(Math.sin(t * 2.2 + k * 2.1) * 9 * this.speed)
      const sp = horseSprite(HORSES[(k + 1) % 4])
      g.vline(Math.round(x) + 22, this.top + 20, floorY, '#b8742a')
      g.alpha(0.7)
      g.draw(sp.canvas, Math.round(x), this.seatY() - 30 + bob)
      g.alpha(1)
    }
    // Canopy with scallops and bulbs.
    const cy = this.top
    for (let x = 0; x < w; x += 8) {
      const c = Math.floor((x + this.spin * 90) / 8) % 2 ? '#e8514a' : '#fffaf0'
      g.rect(x, cy - 30, 8, 42, c)
      g.poly([[x, cy + 12], [x + 8, cy + 12], [x + 4, cy + 17]], c)
    }
    g.rect(0, cy + 10, w, 2, '#ffd54f')
    for (let x = 3, i = 0; x < w; x += 7, i++) {
      const on = (Math.floor(t * 6) + i) % 3 !== 0
      g.rect(x - 1, cy + 18, 3, 3, on ? BULBS[i % BULBS.length] : '#5a4a5e')
      if (on) g.px(x, cy + 18, '#ffffff')
    }
    // Ring arm.
    const a = this.arm
    if (a) {
      const ay = Math.round(this.armY())
      g.rect(Math.round(a.x), ay - 20, w, 4, '#b8742a')
      g.rect(Math.round(a.x), ay - 20, w, 1, '#ffd54f')
      g.vline(Math.round(a.x), ay - 20, ay - 6, '#8a8480')
      if (!a.taken) {
        const c = a.gold ? '#ffd54f' : '#c8c8d0'
        for (let i = 0; i < 24; i++) {
          const q = (i / 24) * Math.PI * 2
          g.rect(Math.round(a.x + Math.cos(q) * 5), Math.round(ay + Math.sin(q) * 6), 1, 1, i % 5 === 0 ? '#ffffff' : c)
          g.px(Math.round(a.x + Math.cos(q) * 4), Math.round(ay + Math.sin(q) * 5), mix(c, INK, 0.25))
        }
        if (a.gold && Math.floor(t * 8) % 2) g.px(Math.round(a.x) + 3, ay - 5, '#ffffff')
        if (this.reach()) {
          g.alpha(0.55 + Math.sin(t * 20) * 0.3)
          for (let i = 0; i < 28; i++) {
            const q = (i / 28) * Math.PI * 2
            g.px(Math.round(a.x + Math.cos(q) * 9), Math.round(ay + Math.sin(q) * 10), '#fff3a6')
          }
          g.alpha(1)
        }
      }
    }
    // You on your horse, the brass pole through its saddle.
    const seat = this.seatY() + this.bob
    const hs = horseSprite(HORSES[0])
    const hx = this.cx - 23
    g.vline(this.cx - 2, this.top + 20, floorY, '#ffd54f')
    g.vline(this.cx - 1, this.top + 20, floorY, '#b8742a')
    g.draw(hs.canvas, hx, seat - 10)
    const pose: DollPose = this.grabT > 0 ? 'act_f_ride_wave' : this.missT > 0 ? 'act_f_ride' : Math.floor(t * 0.5) % 5 === 0 ? 'act_f_ride_cheer' : 'act_f_ride'
    const sp = dollSprite(this.me, pose, { view: 'front', blink: Math.floor(t * 2) % 11 === 0 })
    // Sitting astride: show the doll down to the lap, the saddle covers the rest.
    g.drawPart(sp.canvas, 0, 0, sp.w, 44, this.cx - Math.round(sp.w / 2), seat - 44)
    g.rect(this.cx - 9, seat - 2, 18, 4, '#e8514a')
    g.hline(this.cx - 9, this.cx + 8, seat - 2, '#ffd54f')
    if (a?.taken && this.grabT > 0) {
      const hd = this.hand()
      g.circle(hd.x, hd.y, 4, a.gold ? '#ffd54f' : '#c8c8d0')
      g.circle(hd.x, hd.y, 2, '#2a3472')
    }
  }
}
