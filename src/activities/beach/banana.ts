// บานาน่าโบ๊ต: the banana-boat ride, seen from the back seat. Waves roll
// in from the horizon; hold the screen to grip the handle when a big one
// (marked "!") hits, let go to throw your arms up and cheer through the
// calm bits for bonus points. And at the very end the driver pulls his
// famous hairpin turn and everyone goes into the sea. Every time.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import { game } from '../../game/state'
import { dollSprite, DOLL_H, DOLL_W } from '../../art/doll'
import { avatarSprite, type AvatarLook } from '../../art/avatar'
import { randomVisitorLook } from '../../scenes/world'
import { BP } from '../../art/poses/beach'
import { BeachScene, INK } from './base'
import { BANANA_TARGET, calmBonus, wavePoints } from './rules'
import type { BeachRoundStats } from '../../game/beach'
import { mix, SEA } from '../../art/places/beach-kit'

interface Wave {
  y: number
  big: boolean
  hitFront: boolean
  hitMe: boolean
}

export class BananaScene extends BeachScene {
  duration = 35
  thresholds: [number, number, number] = [5 / BANANA_TARGET, 10 / BANANA_TARGET, 1]
  private waves: Wave[] = []
  private horizon = 60
  private holding = false
  private calm = 0
  private bounce = 0
  private wobble = 0
  private nextWave = 1.2
  private riders: AvatarLook[] = Array.from({ length: 3 }, () => randomVisitorLook())
  private riderHop = [0, 0, 0]
  private splash = 0
  private held = 0
  private wobbles = 0
  private cheers = 0

  goalText() {
    return this.splash > 0 ? 'ตูมมม! ตกน้ำทุกคน 555' : `ความมันส์ ${Math.max(0, this.score)}/${BANANA_TARGET}`
  }
  progress() {
    return Math.max(0, Math.min(1, this.score / BANANA_TARGET))
  }
  complete() {
    return false
  }
  stats(): BeachRoundStats {
    return { score: Math.max(0, this.score), ride: true }
  }
  summary() {
    return {
      title: 'ตกน้ำตามธรรมเนียม 555',
      lines: [`เกาะแน่นผ่านคลื่นใหญ่ ${this.held} ลูก · ยกมือเฮ ${this.cheers} ครั้ง`, this.wobbles ? `เกือบตก ${this.wobbles} ครั้ง` : 'ไม่เกือบตกเลยสักครั้ง', 'พี่โจ้บอกว่าเลี้ยวหักศอกคือบริการพิเศษ'],
    }
  }

  protected anchor() {
    this.horizon = this.top + 40
  }
  protected populate() {
    this.waves = []
    this.score = 0
    this.splash = 0
  }

  private meY() {
    return this.bottom - 16
  }
  private frontY() {
    return this.meY() - 70
  }

  protected tick(dt: number) {
    this.bounce = Math.max(0, this.bounce - dt * 4)
    this.wobble = Math.max(0, this.wobble - dt)
    for (let i = 0; i < 3; i++) this.riderHop[i] = Math.max(0, this.riderHop[i] - dt * 4)
    if (this.phase !== 'play') return
    // The finale: hairpin turn.
    if (this.timeLeft < 3 && this.splash === 0) {
      this.splash = 0.01
      this.flash(0.5)
      this.shake(0.5, 3)
      sfx.splash()
      setTimeout(() => sfx.splash(), 180)
      this.praise('ตูมมม!!', 'blue', 1.6)
      for (let i = 0; i < 40; i++) this.particles.add({ kind: 'drop', x: this.cx + rand(-60, 60), y: this.meY() - 20, vx: rand(-60, 60), vy: rand(-120, -40), g: 200, max: 1.2, color: '#e8fbff' })
      haptic(40)
    }
    if (this.splash > 0) {
      this.splash += dt
      return
    }
    this.nextWave -= dt
    if (this.nextWave <= 0) {
      const big = Math.random() < 0.55
      this.nextWave = rand(1.1, 2)
      this.waves.push({ y: this.horizon + 4, big, hitFront: false, hitMe: false })
      if (big) this.say(this.cx, this.horizon + 16, '! คลื่นใหญ่มา', 'warn', 1.1)
    }
    const speed = 70 + this.elapsed * 1.5
    for (const w of this.waves) {
      w.y += speed * dt * (0.4 + ((w.y - this.horizon) / (this.meY() - this.horizon)) * 1.2)
      if (!w.hitFront && w.y >= this.frontY()) {
        w.hitFront = true
        this.riderHop = [1, 0.8, 0.6]
      }
      if (!w.hitMe && w.y >= this.meY() - 6) {
        w.hitMe = true
        const r = wavePoints(w.big, this.holding)
        this.score += r.pts
        this.bounce = w.big ? 1 : 0.5
        if (r.wobble) {
          this.wobble = 0.8
          this.wobbles++
          this.say(this.cx, this.meY() - 60, pick(['เกือบตกแล้ว!!', 'เกาะไว้สิ!', 'ว้ายยย!']), 'warn', 1)
          this.breakStreak()
          this.shake(0.25, 2)
          sfx.error()
        } else if (w.big) {
          this.held++
          this.streak(this.cx, this.meY() - 60)
          this.say(this.cx + rand(-30, 30), this.meY() - 64, pick(['ฟิ้ววว!', 'มันส์มาก!', 'ยี้ฮ้า!']), 'good', 0.9)
          sfx.whoosh()
          haptic(20)
        } else sfx.plop()
      }
    }
    this.waves = this.waves.filter((w) => w.y < this.h + 20)
    // Cheering through the calm.
    const waveNear = this.waves.some((w) => !w.hitMe && w.big && w.y > this.meY() - 90)
    if (!this.holding && !waveNear) {
      this.calm += dt
      if (calmBonus(this.calm) > 0) {
        this.calm = 0
        this.score += 1
        this.cheers++
        this.particles.popText(this.cx, this.meY() - 56, '+1 เฮ!', '#ffe27a')
        sfx.sparkle()
      }
    } else this.calm = 0
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') this.holding = true
    if (e.type === 'up' || e.type === 'cancel') this.holding = false
  }

  protected draw(g: Surface) {
    const pal = this.night ? SEA.night : this.sea
    // Sky and sea from the back of the boat.
    g.gradientV(0, 0, this.w, this.horizon, this.night ? ['#12143a', '#2e3a78'] : ['#78c4ff', '#c8ecff'], 4)
    g.gradientV(0, this.horizon, this.w, this.h - this.horizon, [pal.deep, pal.mid, pal.shallow], 6)
    for (let i = 0; i < 40; i++) {
      const y = this.horizon + 4 + ((i * 37 + this.t * 60 * (1 + (i % 3))) % (this.h - this.horizon))
      const x = (i * 53) % this.w
      g.hline(x, x + 2 + ((y - this.horizon) / 40), Math.round(y), pal.glint)
    }
    // Islands on the horizon and the speedboat towing us.
    g.ellipse(30, this.horizon, 26, 6, '#4a8a5e')
    g.ellipse(this.w - 26, this.horizon, 18, 5, '#3f7a4f')
    const turn = this.splash > 0 ? Math.min(1, this.splash * 1.5) : 0
    const bx = this.cx + Math.sin(this.t * 0.8) * 10 + turn * 70
    const by = this.horizon + 24
    g.rect(bx - 10, by - 4, 20, 6, '#fffaf0')
    g.rect(bx - 10, by + 1, 20, 1, '#e8514a')
    g.rect(bx - 2, by - 8, 6, 4, '#9fd0ff')
    for (let i = 0; i < 4; i++) g.px(bx - 12 + (i % 2), by + 3 + i, '#ffffff')
    // Waves rolling toward us.
    for (const w of this.waves) {
      const k = (w.y - this.horizon) / (this.meY() - this.horizon)
      const th = Math.max(1, Math.round((w.big ? 5 : 2) * (0.3 + k)))
      for (let x = 0; x < this.w; x++) {
        const y = Math.round(w.y + Math.sin(x * 0.08 + this.t * 2) * 2 * k)
        g.vline(x, y - th, y, w.big ? pal.foam : mix(pal.foam, pal.mid, 0.4))
        if (x % 3 === 0) g.px(x, y + 1, mix(pal.mid, INK, 0.2))
      }
    }
    if (this.splash > 0) return this.drawSplash(g, bx)
    // Rope to the boat.
    g.line(bx, by + 2, this.cx, this.frontY() - 6, '#fffaf0')
    // The banana tube in perspective.
    const y0 = this.frontY()
    const y1 = this.meY() + 8
    const sway = Math.round(Math.sin(this.t * 1.7) * 4)
    for (let y = y0; y <= y1; y++) {
      const k = (y - y0) / (y1 - y0)
      const half = 4 + k * 26
      const cx = this.cx + sway * (1 - k)
      g.hline(Math.round(cx - half), Math.round(cx + half), y, y % 6 === 0 ? '#e0b020' : '#ffd23f')
      g.px(Math.round(cx - half), y, '#c89a18')
      g.px(Math.round(cx + half), y, '#c89a18')
      if (y % 3 === 0) g.px(Math.round(cx - half * 0.4), y, '#fff08a')
    }
    g.ellipse(this.cx + sway, y0, 5, 3, '#ffd23f')
    g.px(this.cx + sway, y0 - 3, '#6a5a2a')
    // Riders ahead (small, far) then me (big, near).
    this.riders.forEach((lk, i) => {
      const k = [0.1, 0.35, 0.62][i]
      const y = y0 + k * (y1 - y0) - Math.round(this.riderHop[i] * 6)
      const sp = avatarSprite(lk, 'back', this.riderHop[i] > 0.5 ? 'happy' : 'stand')
      const cx = this.cx + sway * (1 - k)
      g.drawPart(sp.canvas, 0, 0, sp.w, 18, Math.round(cx - sp.w / 2), Math.round(y - 18))
      g.rect(Math.round(cx - 4), Math.round(y - 4), 8, 4, '#ff7a1a')
    })
    const pose = this.wobble > 0 ? BP.wobble : this.holding ? BP.hold : BP.yay
    const me = dollSprite(game.value.player.look, pose, { view: 'back' })
    const hop = Math.round(this.bounce * 10)
    const tilt = this.wobble > 0 ? Math.round(Math.sin(this.t * 30) * 3) : 0
    g.draw(me.canvas, Math.round(this.cx - DOLL_W / 2 + tilt), Math.round(this.meY() - DOLL_H + 8 - hop))
    // Life vest.
    g.rect(this.cx - 7 + tilt, this.meY() - 17 - hop, 14, 8, '#ff7a1a')
    g.hline(this.cx - 7 + tilt, this.cx + 6 + tilt, this.meY() - 13 - hop, '#fff3a6')
    // Hold handle.
    g.rect(this.cx - 4, this.meY() - 12, 8, 2, '#3a3040')
    if (!this.holding && this.calm > 0.4) {
      const k = Math.min(1, this.calm / 1.2)
      g.rect(this.cx - 10, this.meY() - DOLL_H - 4, 20, 2, INK)
      g.rect(this.cx - 10, this.meY() - DOLL_H - 4, Math.round(20 * k), 2, '#ffe27a')
    }
  }

  private drawSplash(g: Surface, bx: number) {
    // Everyone bobbing in the sea around the capsized banana.
    const y = this.meY() - 20
    g.ellipse(this.cx + 30, y - 16, 34, 6, '#ffd23f')
    g.ellipse(this.cx + 30, y - 17, 30, 3, '#fff08a')
    this.riders.forEach((lk, i) => {
      const x = this.cx - 50 + i * 30 + Math.sin(this.t * 3 + i) * 3
      const sp = avatarSprite(lk, 'front', 'happy')
      g.drawPart(sp.canvas, 0, 0, sp.w, 14, Math.round(x - sp.w / 2), Math.round(y - 24 + Math.sin(this.t * 4 + i) * 2))
      g.ellipse(x, y - 10, 8, 2.5, '#ff7a1a')
    })
    const me = dollSprite(game.value.player.look, BP.jump, { view: 'front' })
    g.drawPart(me.canvas, 0, 0, me.w, 30, Math.round(this.cx - me.w / 2), Math.round(y - 20 + Math.sin(this.t * 3) * 2))
    g.ellipse(this.cx, y + 10, 16, 4, '#ff7a1a')
    g.ellipse(this.cx, y + 9, 13, 2.5, '#ff9a4a')
    for (let x = 0; x < this.w; x += 4) g.px(x, y + 12 + Math.round(Math.sin(x * 0.3 + this.t * 4)), '#e8fbff')
    void bx
  }
}
