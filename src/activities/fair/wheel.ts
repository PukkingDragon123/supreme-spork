// ชิงช้าสวรรค์ – ride the ferris wheel. You sit in a gondola (your own doll,
// waving), it climbs round the giant lit wheel while the view pans over the
// fair far below; at the top the fireworks go off all around you. Tap the
// sky to light more, tap your gondola to wave, and snap a photo (📸) at the
// top for a souvenir.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { game } from '../../game/state'
import { dollSprite, type DollPose } from '../../art/doll'
import type { AvatarLook } from '../../art/avatar'
import { randomVisitorLook } from '../../scenes/world'
import { BULBS } from '../../art/places/fair'
import { FireworkSky } from '../../art/places/fair-fireworks'
import { drawPanoramaLive, panoramaBase, PANO_H, PANO_W } from '../../art/places/fair-views'
import { INK, mix } from '../../art/places/hub-kit'
import '../../art/poses/fair'
import type { JobSummary } from '../jobs/base'
import { FairShow, type ShowAction } from './show'
import { fairSfx } from './sound'

const R = 150
const N = 12
const CAB_W = 48
const CAB_H = 58
const RIDE = 30
const BOARD = 1.2
const CAB_COLS = ['#e8514a', '#ffd23f', '#5a8de0', '#6cc36a', '#ff9fc0', '#f58f35']

/** Progress round the wheel with a slow hang at the top (0..1 → 0..1). */
export function wheelTurn(k: number): number {
  const c = Math.max(0, Math.min(1, k))
  return c + 0.12 * Math.sin(2 * Math.PI * c)
}

export class WheelRide extends FairShow {
  duration = RIDE + BOARD * 2
  private cam = { x: 0, y: 0 }
  private sky = new FireworkSky(1.5)
  private starry: { x: number; y: number; p: number }[] = []
  private riders: (AvatarLook | null)[] = []
  private wave = 0
  private fired = 0
  private autoFw = 0
  private photos = 0
  private topSaid = false
  private flashT2 = 0
  private me: AvatarLook = game.value.player.look

  constructor() {
    super()
    this.riders = Array.from({ length: N }, (_, i) => (i === 0 ? null : i % 3 === 1 ? null : randomVisitorLook()))
    this.sky.onBurst = (_x, _y, kind) => {
      fairSfx.boom(kind === 'heart' ? 1.3 : 0.9)
      if (kind === 'crackle') fairSfx.crackle()
    }
  }

  tip() {
    if (this.phase === 'ready') return 'ขึ้นกระเช้ากันเลย!'
    if (this.atTop()) return 'ถึงยอดแล้ว! กดถ่ายรูปเลย'
    return this.angle() > -Math.PI / 2 ? 'กำลังขึ้น… แตะฟ้าเพื่อจุดพลุ' : 'กำลังลง… โบกมือบ๊ายบายได้'
  }

  action(): ShowAction | null {
    return { label: this.atTop() ? 'ถ่ายรูปบนยอด!' : 'ถ่ายรูป', icon: 'camera', hot: this.atTop() }
  }

  onAction() {
    if (!this.playing) return
    // Snap the frame on screen now (before the camera flash lights it up).
    const url = this.snap?.() ?? null
    if (url && (this.atTop() || !this.photo)) this.photo = url
    this.flashT2 = 0.35
    sfx.click()
    haptic(20)
    this.photos++
    if (this.atTop()) {
      this.prize = { id: 'fair_wheel_photo', once: true }
      this.say(this.cx, this.top + 40, pick(['แชะ! รูปนี้สวยสุดในงาน', 'ได้รูปบนยอดแล้ว!', 'ยิ้มแฉ่งกับพลุ!']), 'good', 1.6)
    } else this.say(this.cx, this.top + 40, 'ขึ้นไปถ่ายบนยอดสิ วิวสวยกว่า!', 'info', 1.4)
  }

  summary(): JobSummary {
    return {
      title: this.prize ? 'ได้รูปบนยอดชิงช้าสวรรค์!' : 'วิวงานวัดสวยสุด ๆ',
      lines: [`จุดพลุไป ${this.fired} ลูก · ถ่ายรูป ${this.photos} ใบ`, this.prize ? 'รูปถูกเก็บในสมุดของสะสมแล้ว' : 'ครั้งหน้ากดถ่ายรูปตอนอยู่บนยอดนะ'],
    }
  }

  /** Angle of your gondola (π/2 = bottom, −π/2 = top). */
  private angle() {
    const k = (this.elapsed - BOARD) / RIDE
    return Math.PI / 2 - 2 * Math.PI * wheelTurn(k)
  }

  private atTop() {
    return this.phase === 'play' && Math.abs(this.angle() + Math.PI / 2) < 0.55
  }

  protected anchor() {
    this.starry = Array.from({ length: 70 }, () => ({ x: rand(0, this.w), y: rand(0, this.h), p: rand(0, 6) }))
  }

  protected populate() {
    this.photos = 0
    this.fired = 0
  }

  private cab(i: number, a0: number) {
    const a = a0 + (i / N) * Math.PI * 2
    return { x: Math.cos(a) * R, y: Math.sin(a) * R }
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down') return
    const a = this.angle()
    const c = this.cab(0, a)
    const sx = c.x - this.cam.x
    const sy = c.y + 8 - this.cam.y
    if (Math.abs(e.x - sx) < CAB_W / 2 + 4 && e.y > sy - 4 && e.y < sy + CAB_H + 4) {
      this.wave = 1.2
      this.particles.hearts(sx, sy + 10, 3)
      sfx.sparkle()
      return
    }
    // Sky: light a firework where you tapped.
    this.sky.burst(e.x, e.y, pick(['peony', 'ring', 'heart', 'willow', 'crackle'] as const), pick(BULBS), 1)
    this.fired++
  }

  protected tick(dt: number) {
    this.wave = Math.max(0, this.wave - dt)
    this.flashT2 = Math.max(0, this.flashT2 - dt)
    const a = this.phase === 'ready' ? Math.PI / 2 : this.angle()
    const c = this.cab(0, a)
    // Camera: follow the gondola, leaning towards the hub.
    this.cam.x = c.x * 0.72 - this.w / 2
    this.cam.y = c.y - (this.top + (this.bottom - this.top) * 0.42)
    if (this.playing) {
      if (this.atTop()) {
        this.autoFw -= dt
        if (this.autoFw <= 0) {
          this.autoFw = rand(0.2, 0.5)
          const x = rand(20, this.w - 20)
          const y = rand(this.top + 10, this.top + (this.bottom - this.top) * 0.45)
          this.sky.launch(x + rand(-10, 10), this.bottom, x, y, pick(['peony', 'ring', 'heart', 'willow', 'crackle'] as const), pick(BULBS), rand(0.9, 1.3))
        }
        if (!this.topSaid) {
          this.topSaid = true
          this.say(this.cx, this.top + 26, 'ว้าววว! พลุขึ้นพอดีเลย!', 'good', 2)
          haptic(15)
        }
      }
      if (this.elapsed > BOARD && this.elapsed - dt <= BOARD) this.say(this.cx, this.top + 26, 'ออกเดินทาง!', 'info', 1.4)
    }
    this.sky.update(dt)
  }

  protected ended() {
    this.say(this.cx, this.top + 26, 'ถึงพื้นแล้ว บ๊ายบาย~', 'info', 1.2)
  }

  protected draw(g: Surface) {
    const { w, h } = this
    const t = this.t
    const a = this.phase === 'ready' ? Math.PI / 2 : this.angle()
    const camX = this.cam.x
    const camY = this.cam.y
    // Sky.
    g.gradientV(0, 0, w, h, ['#0e1030', '#1a1f50', '#2a3470', '#3a4488'])
    for (const s of this.starry) {
      const y = (s.y - camY * 0.04 + h * 4) % h
      const tw = Math.sin(t * 2 + s.p) > 0.6
      g.px(Math.round((s.x - camX * 0.02 + w * 4) % w), Math.round(y), tw ? '#ffffff' : '#8a94c8')
    }
    const moonY = 50 - camY * 0.08
    g.circle(w - 34, moonY, 9, '#fff6c8')
    g.circle(w - 30, moonY - 2, 8, '#1a1f50')
    // The fair far below (parallax).
    const px = Math.round(w / 2 - PANO_W / 2 - camX * 0.3)
    // 0 at the top of the wheel … 1 at the bottom: the far fair drifts only a little.
    const low = (Math.sin(a) + 1) / 2
    const py = Math.round(this.bottom - 150 + low * 40 - 62)
    g.draw(panoramaBase(), px, py)
    drawPanoramaLive(g, px, py, t)
    if (py + PANO_H < h) g.rect(0, py + PANO_H, w, h - py - PANO_H, '#3a3446')
    // Fireworks (screen space, far away).
    this.sky.draw(g, t)
    // The wheel.
    g.setCamera(camX, camY)
    this.drawWheel(g, a, t)
    g.setCamera(0, 0)
    if (this.flashT2 > 0) {
      g.alpha(Math.min(0.9, this.flashT2 * 3))
      g.rect(0, 0, w, h, '#ffffff')
      g.alpha(1)
    }
  }

  private visible(x: number, y: number, m = 8) {
    return x > this.cam.x - m && x < this.cam.x + this.w + m && y > this.cam.y - m && y < this.cam.y + this.h + m
  }

  private drawWheel(g: Surface, a: number, t: number) {
    const frame = '#9a96d0'
    const frameD = '#5a5690'
    const gy = R + 70
    // Legs.
    for (const [dx, c] of [
      [-6, frameD],
      [6, frame],
    ] as const) {
      g.thickLine(dx, 0, dx - R * 0.62, gy, 5, c)
      g.thickLine(dx, 0, dx + R * 0.62, gy, 5, c)
    }
    for (const k of [0.4, 0.7]) g.thickLine(-R * 0.62 * k, gy * k, R * 0.62 * k, gy * k, 3, frameD)
    // Base, kiosk and a little queue.
    if (this.visible(0, gy, 60)) {
      g.rect(-R * 0.8, gy - 4, R * 1.6, 10, '#6a6374')
      g.hline(-R * 0.8, R * 0.8, gy - 4, '#8c8187')
      g.rect(-16, gy - 30, 32, 26, '#e8514a')
      g.rect(-12, gy - 26, 24, 10, '#3a2e48')
      g.rect(-18, gy - 34, 36, 4, '#ffd23f')
    }
    // Rim: two rings and a lattice (only the visible arc).
    const steps = 720
    for (let i = 0; i < steps; i++) {
      const q = (i / steps) * Math.PI * 2
      const cx = Math.cos(q)
      const cy = Math.sin(q)
      const x = cx * R
      const y = cy * R
      if (!this.visible(x, y)) continue
      g.rect(Math.round(x) - 1, Math.round(y) - 1, 2, 2, frame)
      g.px(Math.round(cx * (R - 9)), Math.round(cy * (R - 9)), frameD)
      if (i % 30 === 0) g.line(cx * R, cy * R, Math.cos(q + 0.13) * (R - 9), Math.sin(q + 0.13) * (R - 9), frameD)
    }
    // Spokes with bulbs.
    for (let i = 0; i < 16; i++) {
      const q = a + (i / 16) * Math.PI * 2
      for (let k = 10; k < R - 9; k += 3) {
        const x = Math.cos(q) * k
        const y = Math.sin(q) * k
        if (!this.visible(x, y)) continue
        g.px(Math.round(x), Math.round(y), k % 6 ? frame : frameD)
        if (k % 18 === 1) {
          const on = (Math.floor(t * 6) + i + k) % 4 !== 0
          if (on) {
            g.rect(Math.round(x) - 1, Math.round(y) - 1, 2, 2, BULBS[(i + k) % BULBS.length])
            g.px(Math.round(x) - 1, Math.round(y) - 1, '#ffffff')
          }
        }
      }
      const bx = Math.cos(q + Math.PI / 16) * R
      const by = Math.sin(q + Math.PI / 16) * R
      if (this.visible(bx, by) && (Math.floor(t * 4) + i) % 3 !== 0) {
        g.rect(Math.round(bx) - 1, Math.round(by) - 1, 3, 3, BULBS[i % BULBS.length])
        g.px(Math.round(bx), Math.round(by), '#ffffff')
      }
    }
    if (this.visible(0, 0, 20)) {
      g.circle(0, 0, 12, frameD)
      g.circle(0, 0, 9, '#ffd54f')
      g.circle(0, 0, 4, '#fff3a6')
    }
    // Gondolas: yours last (in front).
    for (let i = N - 1; i >= 0; i--) {
      const c = this.cab(i, a)
      if (!this.visible(c.x, c.y + CAB_H / 2, CAB_H)) continue
      this.drawCabin(g, c.x, c.y, i, t)
    }
  }

  private drawCabin(g: Surface, hx: number, hy: number, i: number, t: number) {
    const mine = i === 0
    const swayA = mine ? Math.sin(t * 1.6) * 0.6 : Math.sin(t * 1.3 + i) * 0.8
    const x = Math.round(hx + swayA)
    const top = Math.round(hy + 8)
    const col = mine ? '#ff6fa8' : CAB_COLS[i % CAB_COLS.length]
    const D = mix(col, INK, 0.3)
    const L = mix(col, '#ffffff', 0.35)
    g.thickLine(hx, hy, x, top, 2, '#bdb2ae')
    g.circle(hx, hy, 2, '#8a8480')
    // Roof.
    g.poly([[x - CAB_W / 2 - 2, top + 8], [x - CAB_W / 2 + 6, top], [x + CAB_W / 2 - 6, top], [x + CAB_W / 2 + 2, top + 8]], D)
    g.hline(x - CAB_W / 2 + 6, x + CAB_W / 2 - 6, top, L)
    // Back wall and window.
    const WIN = 38
    g.rect(x - CAB_W / 2, top + 8, CAB_W, CAB_H - 8, col)
    g.rect(x - CAB_W / 2 + 3, top + 10, CAB_W - 6, WIN - 10, '#2a2240')
    g.rect(x - CAB_W / 2 + 3, top + 10, CAB_W - 6, 3, '#3a3260')
    // The rider (a doll, big) behind the front panel: head and shoulders show.
    const rider = mine ? this.me : this.riders[i]
    if (rider) {
      const pose: DollPose = mine ? (this.atTop() ? 'act_f_ride_cheer' : this.wave > 0 ? 'act_f_ride_wave' : 'act_f_ride') : Math.floor(t * 0.7 + i) % 3 === 0 ? 'act_f_ride_wave' : 'act_f_ride'
      const sp = dollSprite(rider, pose, { view: 'front', blink: Math.floor(t * 2 + i) % 9 === 0 })
      g.drawPart(sp.canvas, 0, 0, sp.w, WIN, x - Math.round(sp.w / 2), top)
    }
    // Front panel with a heart / stripes and bulbs.
    g.rect(x - CAB_W / 2, top + WIN, CAB_W, CAB_H - WIN, col)
    g.hline(x - CAB_W / 2, x + CAB_W / 2 - 1, top + WIN, L)
    g.rect(x - CAB_W / 2, top + CAB_H - 3, CAB_W, 3, D)
    const hy2 = top + WIN + 7
    if (mine) {
      g.circle(x - 3, hy2, 3, '#fffaf0')
      g.circle(x + 3, hy2, 3, '#fffaf0')
      g.poly([[x - 6, hy2 + 1], [x + 6, hy2 + 1], [x, hy2 + 7]], '#fffaf0')
      g.circle(x - 3, hy2, 2, '#e8514a')
      g.circle(x + 3, hy2, 2, '#e8514a')
      g.poly([[x - 5, hy2 + 1], [x + 5, hy2 + 1], [x, hy2 + 6]], '#e8514a')
    } else for (let k = x - CAB_W / 2 + 4; k < x + CAB_W / 2 - 3; k += 6) g.rect(k, top + WIN + 4, 3, 10, D)
    for (let k = 0; k < 7; k++) {
      const on = (Math.floor(t * 5) + k + i) % 3 !== 0
      g.px(x - CAB_W / 2 + 3 + k * 7, top + WIN + 1, on ? BULBS[(k + i) % BULBS.length] : D)
    }
    // Window frame posts and a glint on the glass.
    g.vline(x - CAB_W / 2 + 2, top + 9, top + WIN, D)
    g.vline(x + CAB_W / 2 - 3, top + 9, top + WIN, D)
    g.alpha(0.25)
    g.line(x - CAB_W / 2 + 5, top + WIN - 3, x - CAB_W / 2 + 14, top + 12, '#ffffff')
    g.alpha(1)
  }
}
