// TEMP stand-in (replaced by the detailed prayer hall implementation).
import type { Scene } from '../engine/stage'
import { bake, type Surface } from '../engine/pixel'
import type { Sprite } from '../engine/sprite'
import { avatarSprite, type AvatarLook } from '../art/avatar'
import { drawAltar, drawArch, drawBuddha, drawHallInterior } from '../art/interior'
import { Particles } from '../engine/particles'
import { drawGlow } from './sky'

export type HallTemple = 'wat' | 'river' | 'mountain' | 'home' | 'shrine'
export type KneelPose = 'kneel' | 'wai' | 'bow' | 'sit'
export type PrayerPhase = 'enter' | 'ready' | 'chant' | 'bow' | 'finale'

export class PrayerHallScene implements Scene {
  w = 200
  h = 400
  t = 0
  phase: PrayerPhase = 'enter'
  onReady?: () => void
  private bg: HTMLCanvasElement | null = null
  private voice = 0
  private focus = 0
  private pose: KneelPose = 'kneel'
  private bowT = -1
  private bowDone?: () => void
  particles = new Particles()
  constructor(private opts: { temple: HallTemple; deity?: 'ganesha' | 'guanyin' | 'lakshmi'; look: AvatarLook; playerSprite?: (pose: KneelPose, blink: boolean) => Sprite }) {}
  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.bg = null
  }
  setPhase(p: PrayerPhase) {
    this.phase = p
  }
  setVoice(v: number) {
    this.voice = v
  }
  setFocus(v: number) {
    this.focus = v
  }
  setPose(p: KneelPose) {
    this.pose = p
  }
  hit(q: 'perfect' | 'good' | 'ok' | 'miss') {
    const n = q === 'perfect' ? 8 : q === 'miss' ? 0 : 4
    for (let i = 0; i < n; i++) this.particles.add({ kind: 'sparkle', x: this.w / 2 + (Math.random() - 0.5) * 20, y: this.h * 0.7, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 20, max: 1, color: '#fff3a6' })
  }
  bow(done?: () => void) {
    this.bowT = 0
    this.bowDone = done
  }
  finale() {
    for (let i = 0; i < 30; i++) this.particles.add({ kind: 'sparkle', x: Math.random() * this.w, y: this.h * 0.3, vx: 0, vy: 20, max: 2, color: '#ffd54f' })
  }
  update(dt: number) {
    this.t += dt
    if (this.phase === 'enter' && this.t > 1.2) {
      this.phase = 'ready'
      this.onReady?.()
    }
    if (this.bowT >= 0) {
      this.bowT += dt
      if (this.bowT > 1.3) {
        this.bowT = -1
        this.bowDone?.()
      }
    }
    this.particles.update(dt)
  }
  render(g: Surface) {
    const { w, h } = this
    if (!this.bg)
      this.bg = bake(w, h, (b) => {
        const { floorY } = drawHallInterior(b, w, h, 0)
        const cx = Math.round(w / 2)
        drawArch(b, cx, floorY - 30, 44, 92)
        drawBuddha(b, cx, floorY - 40, 1)
        drawAltar(b, cx, floorY - 40, 110)
      })
    g.draw(this.bg, 0, 0)
    drawGlow(g, w / 2, h * 0.35, 40, 0.3 + this.focus * 0.5 + this.voice * 0.2, '#fff3a6')
    const pose = this.bowT >= 0 ? (this.bowT > 0.35 && this.bowT < 0.95 ? 'bow' : 'wai') : this.pose
    const s = this.opts.playerSprite ? this.opts.playerSprite(pose, false) : avatarSprite(this.opts.look, 'back', pose, { barefoot: true })
    const sc = s.h > 40 ? 1 : 2
    g.drawScaled(s.canvas, Math.round(w / 2 - (s.w * sc) / 2), Math.round(h * 0.78 - s.h * sc), sc)
    this.particles.render(g)
  }
}
