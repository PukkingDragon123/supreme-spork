// ลิเก – a short show by the ดาวเลื่อม troupe, watched from the front mat.
// The heroine sings, the (very kind) giant barges in, the hero saves the day,
// then strikes THE sequinned pose: cheer (เชียร์!) right on it and the hero
// flings you a money garland. Tap anywhere else to cheer the whole show.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { game } from '../../game/state'
import { dollSprite, type DollPose } from '../../art/doll'
import type { AvatarLook } from '../../art/avatar'
import { randomVisitorLook } from '../../scenes/world'
import { BULBS, letters } from '../../art/places/fair'
import { hsh } from '../../art/places/hub-kit'
import '../../art/poses/fair'
import type { JobSummary } from '../jobs/base'
import { FairShow, type ShowAction } from './show'
import { fairSfx } from './sound'
import { cheerGrade, type CheerGrade } from './rules'

const HERO: AvatarLook = { ...randomVisitorLook(), gender: 'm', hair: 'hair_short', hairColor: 0, top: 'top_likay', bottom: 'bot_likay', head: 'head_likay', hand: null, neck: null, back: null }
const HEROINE: AvatarLook = { ...randomVisitorLook(), gender: 'f', hair: 'hair_bun', hairColor: 0, top: 'top_sabai', bottom: 'bot_sin_mudmee', head: 'head_flowercrown', hand: null, neck: null, back: null }
const GIANT: AvatarLook = { ...randomVisitorLook(), gender: 'm', hair: 'hair_buzz', hairColor: 0, top: 'top_khon', bottom: 'bot_khon', head: 'head_yakhat', hand: null, neck: null, back: null }

/** When the hero lands the pose (seconds into the show). */
export const POSE_T = 26

interface Line {
  t: number
  who: 'hero' | 'heroine' | 'giant' | 'mc'
  text: string
}

const SCRIPT: Line[] = [
  { t: 0.4, who: 'mc', text: 'คณะดาวเลื่อมขอต้อนรับค่ะ!' },
  { t: 2.6, who: 'heroine', text: 'โอ้ละหนอ พี่จ๋า~' },
  { t: 5.2, who: 'heroine', text: 'น้องรอพี่มาทั้งคืน~' },
  { t: 8.4, who: 'giant', text: 'ฮ่า ฮ่า ฮ่า! ข้าคือยักษ์!' },
  { t: 10.8, who: 'heroine', text: 'ช่วยด้วยยย!' },
  { t: 13.4, who: 'hero', text: 'หยุดนะ เจ้ายักษ์!' },
  { t: 15.8, who: 'giant', text: 'เจ้าเป็นใคร (ถามจริง)' },
  { t: 17.6, who: 'hero', text: 'ข้าคือเจ้าชายนกยูงทอง!' },
  { t: 23.2, who: 'giant', text: 'โอ๊ยยย (ล้มแบบสวย ๆ)' },
  { t: 28.6, who: 'heroine', text: 'พี่จ๋า~ ฮีโร่ของน้อง' },
  { t: 31, who: 'mc', text: 'ปรบมือให้คณะดาวเลื่อมด้วยค่ะ!' },
]

export class LikayShow extends FairShow {
  duration = 36
  private me = game.value.player.look
  private crowd: AvatarLook[] = [randomVisitorLook(), randomVisitorLook(), randomVisitorLook(), randomVisitorLook()]
  private next = 0
  private hype = 0
  private cheers = 0
  private cheerT = 0
  private grade: CheerGrade | null = null
  private garland: { t: number } | null = null
  private clash = 0

  tip() {
    if (this.poseWindow()) return 'ท่าเก๊กมาแล้ว! กด “เชียร์!” ตอนนี้เลย'
    if (this.grade === 'perfect') return 'พระเอกคล้องมาลัยคืนให้คุณ!'
    return `แตะเพื่อเชียร์ · ความมันของคนดู ${Math.round(this.hype * 100)}%`
  }

  action(): ShowAction | null {
    const hot = this.poseWindow()
    return { label: 'เชียร์!', icon: 'heart', hot, disabled: this.grade !== null && this.elapsed > POSE_T - 1 && this.elapsed < POSE_T + 2 }
  }

  onAction() {
    this.cheer(true)
  }

  summary(): JobSummary {
    const g = this.grade
    return {
      title: g === 'perfect' ? 'แม่ยกตัวจริง!' : g === 'good' ? 'เชียร์เก่งมาก!' : 'ลิเกสนุกไหม?',
      lines: [
        g === 'perfect' ? 'เชียร์ตรงท่าเก๊กเป๊ะ! พระเอกคล้องมาลัยคืนให้' : g === 'good' ? 'เชียร์ทันท่าเก๊ก พระเอกส่งจูบให้' : g ? 'เชียร์ไม่ตรงท่าเก๊ก รอบหน้าลองดูอีกนะ' : 'รอบหน้ากด “เชียร์!” ตอนพระเอกเก๊กท่านะ',
        `เชียร์ไปทั้งหมด ${this.cheers} ครั้ง · คนดูคึก ${Math.round(this.hype * 100)}%`,
      ],
    }
  }

  private poseWindow() {
    return this.phase === 'play' && this.grade === null && this.elapsed > POSE_T - 0.8 && this.elapsed < POSE_T + 0.9
  }

  protected anchor() {}
  protected populate() {
    this.next = 0
    this.hype = 0.2
    this.grade = null
  }

  private cheer(button: boolean) {
    if (!this.playing) return
    this.cheers++
    this.cheerT = 0.5
    this.hype = Math.min(1, this.hype + 0.06)
    const px = this.cx
    const py = this.bottom - 44
    this.particles.hearts(px + rand(-10, 10), py, 2)
    if (button && this.grade === null && this.elapsed > POSE_T - 1.4 && this.elapsed < POSE_T + 1.2) {
      this.grade = cheerGrade(this.elapsed, POSE_T)
      const hx = this.heroX()
      const fy = this.floor() - 56
      if (this.grade === 'perfect') {
        this.garland = { t: 0 }
        this.prize = { id: 'fair_money_garland', once: true }
        this.say(hx, fy, 'ขอบคุณแม่ยกคนงาม~ (ขยิบตา)', 'good', 2)
        this.particles.confetti(hx, fy + 10, 30)
        fairSfx.tada()
        haptic(30)
      } else if (this.grade === 'good') {
        this.say(hx, fy, 'ขอบคุณจ้า~ จุ๊บ!', 'good', 1.6)
        this.particles.hearts(hx, fy + 16, 5)
        fairSfx.ding()
      } else {
        this.say(hx, fy, this.grade === 'early' ? 'ยังไม่ได้เก๊กเลย 555' : 'เก๊กจบไปแล้วจ้า~', 'warn', 1.4)
      }
      return
    }
    if (Math.random() < 0.3) this.say(px + rand(-40, 40), py - 30, pick(['กรี๊ดดด!', 'พระเอกหล่อมาก!', 'เอาอีก!', 'แม่ยกมาแล้วจ้า!']), 'info', 0.9)
    sfx.sparkle()
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') this.cheer(false)
  }

  protected tick(dt: number) {
    this.cheerT = Math.max(0, this.cheerT - dt)
    this.clash = Math.max(0, this.clash - dt)
    this.hype = Math.max(0, this.hype - dt * 0.015)
    if (this.garland) this.garland.t += dt
    if (!this.playing) return
    while (this.next < SCRIPT.length && SCRIPT[this.next].t <= this.elapsed) {
      const l = SCRIPT[this.next++]
      const x = l.who === 'hero' ? this.heroX() : l.who === 'giant' ? this.giantX() : l.who === 'heroine' ? this.w * 0.3 : this.cx
      const y = l.who === 'mc' ? this.top + 34 : this.floor() - (l.who === 'hero' ? 74 : l.who === 'giant' ? 66 : 58)
      this.bubbles = this.bubbles.filter((b) => b.tone === 'good')
      this.say(x, y, l.text, l.who === 'mc' ? 'good' : 'info', 2)
      if (l.who !== 'mc') fairSfx.tick()
    }
    // Sword fight: clashes with sparks.
    if (this.elapsed > 18.5 && this.elapsed < 23 && Math.random() < dt * 3) {
      this.clash = 0.2
      const mx = (this.heroX() + this.giantX()) / 2
      this.particles.sparkles(mx, this.floor() - 34, 6, '#ffffff', 6)
      fairSfx.clink()
      this.shake(0.08, 1)
    }
    if (this.elapsed > POSE_T - 0.9 && this.elapsed - dt <= POSE_T - 0.9) {
      this.say(this.cx, this.top + 24, 'ท่าเก๊ก!!! เชียร์เลย!', 'good', 1.6)
      haptic(12)
    }
    if (this.elapsed > POSE_T && this.elapsed - dt <= POSE_T) {
      this.particles.sparkles(this.heroX(), this.floor() - 40, 18, '#fff3a6', 16)
      this.flash(0.15)
    }
    if (this.elapsed > 28 && this.elapsed - dt <= 28) {
      this.particles.confetti(this.cx, this.floor() - 60, 40)
      fairSfx.cheer()
    }
  }

  private floor() {
    return Math.round(this.top + (this.bottom - this.top) * 0.64)
  }
  private curtain() {
    const e = this.phase === 'ready' ? 0 : this.elapsed
    const open = Math.min(1, e / 2) * (e > this.duration - 3 ? Math.max(0, (this.duration - e) / 2.5) : 1)
    return open
  }
  private heroX() {
    const e = this.elapsed
    const W = this.w
    if (e < 12.4) return -30
    if (e < 14.4) return -30 + ((e - 12.4) / 2) * (W * 0.28 + 30)
    if (e < 18.5) return W * 0.28
    if (e < 23) return W * 0.42 + Math.sin(e * 5) * 5
    if (e < 28) return W * 0.46
    return W * 0.5
  }
  private giantX() {
    const e = this.elapsed
    const W = this.w
    if (e < 7.6) return W + 30
    if (e < 9.6) return W + 30 - ((e - 7.6) / 2) * (W * 0.3 + 30)
    if (e < 18.5) return W * 0.7
    if (e < 23) return W * 0.62 + Math.sin(e * 5 + 1) * 5
    return W * 0.74
  }

  protected draw(g: Surface) {
    const { w, h, t } = this
    const floor = this.floor()
    const top = this.top
    // House lights down, the stage glowing.
    g.rect(0, 0, w, h, '#140f22')
    // Backdrop: palace under a moon, glitter.
    g.rect(8, top + 14, w - 16, floor - top - 14, '#2a3a6a')
    for (let i = 0; i < 50; i++) {
      const v = hsh(i, 3, 5)
      if ((Math.floor(t * 3) + i) % 5 === 0) continue
      g.px(10 + (v % (w - 20)), top + 16 + ((v >> 4) % (floor - top - 40)), i % 3 ? '#9fb0e0' : '#fff6c8')
    }
    g.circle(w - 40, top + 40, 12, '#fff6c8')
    const pcx = Math.round(w * 0.36)
    const pb = floor - 16
    g.rect(pcx - 38, pb - 44, 76, 44, '#e8e0d4')
    g.poly([[pcx - 46, pb - 44], [pcx, pb - 80], [pcx + 46, pb - 44]], '#c8543a')
    g.poly([[pcx - 18, pb - 66], [pcx, pb - 96], [pcx + 18, pb - 66]], '#ffd54f')
    g.rect(pcx - 10, pb - 30, 20, 30, '#8a2335')
    for (const dx of [-28, 18]) g.rect(pcx + dx, pb - 36, 10, 12, '#6a86c0')
    for (let x = Math.round(w * 0.62); x < w - 12; x += 16) g.circle(x, floor - 30, 10, '#2e6a4a')
    // Stage floor with footlights.
    g.rect(0, floor, w, 22, '#6a4a3a')
    g.rect(0, floor, w, 3, '#8a6a4a')
    for (let x = 4; x < w; x += 12) g.vline(x, floor + 3, floor + 21, '#4a3128')
    for (let x = 6, i = 0; x < w; x += 10, i++) {
      g.rect(x, floor + 1, 4, 2, '#fff6c8')
      if ((Math.floor(t * 3) + i) % 4 === 0) g.px(x + 1, floor, '#ffffff')
    }
    // Performers.
    const e = this.phase === 'ready' ? 0 : this.elapsed
    const blink = Math.floor(t * 2) % 9 === 0
    const heroine: DollPose = e > 9 && e < 13.5 ? 'act_f_scared' : e > 27.5 ? 'wai' : Math.floor(t * 1.2) % 2 ? 'act_f_likay_sing' : 'act_f_ramwong_a'
    this.drawDoll(g, HEROINE, heroine, w * 0.3, floor + 4, blink)
    const fighting = e > 18.5 && e < 23
    const giantDown = e > 23 && e < 28
    const giant: DollPose = giantDown ? 'kneel' : e > 28 ? 'wai' : fighting ? (Math.floor(t * 6) % 2 ? 'act_f_likay_fight' : 'stand') : 'act_f_likay_sing'
    this.drawDoll(g, GIANT, giant, this.giantX(), floor + 4, false)
    if (fighting && giant === 'act_f_likay_fight') this.sword(g, this.giantX() - 14, floor - 32, -1)
    if (giantDown && Math.floor(t * 3) % 2) {
      g.px(Math.round(this.giantX()) - 3, floor - 50, '#ffe27a')
      g.px(Math.round(this.giantX()) + 4, floor - 52, '#ffe27a')
    }
    const posing = e > POSE_T - 0.2 && e < POSE_T + 2.4
    const hero: DollPose = posing ? 'act_f_likay_pose' : fighting ? (Math.floor(t * 6 + 1) % 2 ? 'act_f_likay_fight' : 'stand') : e > 28 ? 'wai' : 'act_f_likay_sing'
    this.drawDoll(g, HERO, hero, this.heroX(), floor + 4, false)
    if (fighting && hero === 'act_f_likay_fight') this.sword(g, this.heroX() + 14, floor - 32, 1)
    if (posing) {
      // Sequins blazing.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * 2
        const r = 22 + Math.sin(t * 8 + i) * 3
        g.px(Math.round(this.heroX() + Math.cos(a) * r), Math.round(floor - 26 + Math.sin(a) * r * 0.9), i % 2 ? '#fff3a6' : '#ffffff')
      }
    }
    // The money garland flying to you.
    if (this.garland) {
      const k = Math.min(1, this.garland.t / 0.9)
      const gx = this.heroX() + (this.cx - this.heroX()) * k
      const gy = floor - 40 + (this.bottom - 40 - (floor - 40)) * k - Math.sin(k * Math.PI) * 40
      for (let i = 0; i < 10; i++) {
        const q = (i / 10) * Math.PI * 2 + t * 4
        g.rect(Math.round(gx + Math.cos(q) * 6), Math.round(gy + Math.sin(q) * 4), 3, 2, i % 2 ? '#6cc36a' : '#ffd54f')
      }
    }
    // Curtains.
    const open = this.curtain()
    const cw = Math.round((w / 2) * (1 - open) + 14)
    for (const side of [0, 1]) {
      for (let x = 0; x < cw; x++) {
        const X = side ? w - 1 - x : x
        g.vline(X, top, floor + 2 - (x % 5 === 0 ? 0 : 1), x % 6 === 0 ? '#8a2335' : '#c8343f')
      }
      g.vline(side ? w - cw : cw - 1, top, floor, '#ffd54f')
    }
    g.rect(0, top, w, 12, '#c8343f')
    for (let x = 0; x < w; x += 8) g.poly([[x, top + 12], [x + 8, top + 12], [x + 4, top + 16]], '#ffd54f')
    g.rect(this.cx - 34, top + 2, 68, 8, '#ffd54f')
    letters(g, this.cx - 30, top + 4, 60, '#8a2335', 77)
    for (let x = 4, i = 0; x < w; x += 9, i++) if ((Math.floor(t * 4) + i) % 3) g.px(x, top + 11, BULBS[i % BULBS.length])
    // The audience on their mats (backs of heads) and you in the front row.
    const ay = this.bottom + 16
    const matY = floor + 22
    g.rect(0, matY, w, h - matY, '#1e1830')
    for (let i = 0; i < 3; i++) {
      const y = matY + 6 + i * 12
      g.rect(0, y, w, 9, i % 2 ? '#2e3a6a' : '#5a2438')
      for (let x = 0; x < w; x += 6) g.vline(x, y, y + 8, i % 2 ? '#3a4a80' : '#6a3048')
    }
    for (let i = 0; i < 9; i++) {
      const x = 10 + i * ((w - 20) / 8)
      const y = matY + 20 + (i % 2) * 6
      const bounce = this.cheerT > 0 || this.hype > 0.5 ? Math.round(Math.abs(Math.sin(t * 6 + i))) : 0
      g.circle(Math.round(x), y - bounce, 5, ['#2a1a1a', '#4a2a1a', '#1a1a2a'][i % 3])
      g.rect(Math.round(x) - 5, y + 3 - bounce, 11, 6, ['#e8514a', '#5a8de0', '#fffaf0', '#6cc36a', '#ffd23f'][i % 5])
      if (bounce && i % 3 === 0) g.rect(Math.round(x) + 5, y - 10, 2, 5, '#f0bd90')
    }
    this.crowd.forEach((lk, i) => {
      const x = [0.12, 0.3, 0.72, 0.9][i] * w
      const bounce = this.cheerT > 0 || this.hype > 0.6 ? Math.round(Math.abs(Math.sin(t * 7 + i))) * 2 : 0
      const sp = dollSprite(lk, bounce ? 'act_f_watch_cheer' : 'act_f_watch', { view: 'back' })
      g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(ay - sp.h + 8 - bounce))
    })
    const mine = dollSprite(this.me, this.cheerT > 0 || this.poseWindow() ? 'act_f_watch_cheer' : 'act_f_watch', { view: 'back' })
    g.draw(mine.canvas, Math.round(this.cx - mine.w / 2), Math.round(ay - mine.h + 2 - (this.cheerT > 0 ? 2 : 0)))
    // Stage wash.
    g.ctx.save()
    g.ctx.globalCompositeOperation = 'lighter'
    g.alpha(0.08 + this.hype * 0.08)
    g.rect(0, top, w, floor - top + 22, '#ff9fc0')
    g.ctx.restore()
    g.alpha(1)
  }

  private drawDoll(g: Surface, lk: AvatarLook, pose: DollPose, x: number, feet: number, blink: boolean) {
    const sp = dollSprite(lk, pose, { view: 'front', blink })
    g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(feet - sp.h))
  }

  private sword(g: Surface, x: number, y: number, dir: 1 | -1) {
    const len = this.clash > 0 ? 16 : 13
    g.line(x, y, x + dir * len, y - 10, '#e8e8f0')
    g.line(x, y + 1, x + dir * (len - 1), y - 9, '#9a9aa8')
    g.rect(x - 2, y, 4, 2, '#ffd54f')
  }
}
