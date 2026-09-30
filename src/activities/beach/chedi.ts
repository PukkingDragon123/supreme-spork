// ก่อเจดีย์ทราย: build a sand chedi, the Songkran merit tradition of
// giving back the sand carried out of the temple on your feet. Three
// steps: flip buckets of sand into tiers (tap when the bucket is right over
// the pile, overhangs crumble away), rub the lumps smooth, then plant
// flags and flowers; the player kneels and makes a wish at the end.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { sfx, haptic } from '../../engine/audio'
import { Worker } from '../jobs/worker'
import { BP } from '../../art/poses/beach'
import { BeachScene, backdrop, drawSurf, shadow, twinkle, bwrist, INK } from './base'
import { CHEDI_TIERS, chediScore, stackTier, type Tier } from './rules'
import type { BeachRoundStats } from '../../game/beach'
import { mix } from '../../art/places/beach-kit'
import { drawFist } from '../../art/workActor'

type Step = 'stack' | 'smooth' | 'decor' | 'wish' | 'built'

const TIER_H = 9
const SAND = { l: '#f4dcaa', b: '#e2c48e', d: '#c4a470', D: '#a88a5a', wet: '#cfb080' }
const DECOR = ['flag_r', 'flower_p', 'flag_y', 'flower_w', 'flag_b', 'flower_o', 'flag_g', 'lotus'] as const
type DecorKind = (typeof DECOR)[number]

interface Lump {
  x: number
  y: number
  left: number
}

export class ChediScene extends BeachScene {
  duration = 55
  thresholds: [number, number, number] = [0.35, 0.62, 0.86]
  private step: Step = 'stack'
  private tiers: Tier[] = []
  private ratios: number[] = []
  private baseY = 300
  private horizon = 60
  private shore = 110
  private bucketX = 95
  private drop: { x: number; y: number; vy: number; w: number } | null = null
  private lumps: Lump[] = []
  private smooth = 0
  private decor: { kind: DecorKind; x: number; y: number; t: number }[] = []
  private rub = { x: 0, y: 0, down: false }
  private wishT = 0
  private swing = 0

  goalText() {
    if (this.step === 'stack') return `คว่ำถังทราย ${this.tiers.length}/${CHEDI_TIERS.length} ชั้น`
    if (this.step === 'smooth') return `ถูทรายให้เรียบ ${Math.round(this.smooth * 100)}%`
    if (this.step === 'decor') return `ปักธงและดอกไม้ ${this.decor.length}/6`
    return 'อธิษฐาน... สาธุ'
  }
  progress() {
    return chediScore(this.ratios, this.smooth, this.decor.length)
  }
  complete() {
    return this.step === 'built'
  }
  cheerText() {
    return 'เจดีย์ทรายงามมาก!'
  }
  stats(): BeachRoundStats {
    return { score: Math.round(this.progress() * 100), chedi: this.step === 'built' || this.tiers.length === CHEDI_TIERS.length }
  }
  summary() {
    const perfect = this.ratios.filter((r) => r > 0.92).length
    return {
      title: this.step === 'built' ? 'ก่อพระเจดีย์ทรายสำเร็จ สาธุ!' : 'เจดีย์ทรายเกือบเสร็จแล้ว',
      lines: [`คว่ำถังเป๊ะ ${perfect}/${CHEDI_TIERS.length} ชั้น`, `ทรายเรียบ ${Math.round(this.smooth * 100)}% · ปักธงดอกไม้ ${this.decor.length} อัน`, 'ขอให้บุญนี้ส่งผลให้ร่มเย็นเป็นสุข'],
    }
  }

  protected anchor() {
    this.horizon = this.top + 26
    this.shore = this.top + 70
    this.baseY = this.bottom - 64
  }
  protected populate() {
    this.tiers = []
    this.ratios = []
    this.step = 'stack'
    this.smooth = 0
    this.decor = []
    this.lumps = []
    this.worker = this.worker ?? new Worker(this.cx, this.baseY - 8)
    this.worker.place(this.cx, this.baseY - 8)
    this.worker.pose = BP.bucketUp
    this.worker.view = 'front'
  }

  private topY() {
    return this.baseY - this.tiers.length * TIER_H
  }

  protected tick(dt: number) {
    const w = this.worker!
    if (this.step === 'stack') {
      if (!this.drop) {
        const n = this.tiers.length
        this.swing += dt * (1.4 + n * 0.35)
        this.bucketX = this.cx + Math.sin(this.swing) * (34 + n * 3)
        w.goTo(this.bucketX, this.baseY - 8)
        w.pose = BP.bucketUp
      } else {
        const d = this.drop
        d.vy += 520 * dt
        d.y += d.vy * dt
        if (Math.random() < 0.6) this.particles.add({ kind: 'dot', x: d.x + rand(-d.w / 2, d.w / 2), y: d.y, vx: rand(-4, 4), vy: 20, g: 200, max: 0.3, color: SAND.b })
        if (d.y >= this.topY() - TIER_H / 2) this.land()
      }
    } else if (this.step === 'smooth') {
      w.goTo(this.cx + 38, this.baseY + 10)
      w.pose = this.rub.down && Math.floor(this.t * 8) % 2 ? BP.pat1 : BP.pat0
      if (this.rub.down) {
        for (const l of this.lumps) {
          if (l.left <= 0) continue
          if (Math.hypot(this.rub.x - l.x, this.rub.y - l.y) < 9) {
            l.left -= dt
            if (Math.random() < dt * 20) this.particles.add({ kind: 'dot', x: l.x + rand(-2, 2), y: l.y, vx: rand(-10, 10), vy: rand(-12, -4), g: 60, max: 0.4, color: SAND.l })
            if (l.left <= 0) {
              this.particles.sparkles(l.x, l.y, 5, '#fffaf0', 6)
              sfx.sparkle()
              this.streak(l.x, l.y - 6)
            }
          }
        }
        this.smooth = 1 - this.lumps.reduce((a, l) => a + Math.max(0, l.left), 0) / (this.lumps.length * 0.45)
        if (this.lumps.every((l) => l.left <= 0)) {
          this.smooth = 1
          this.praise('เรียบเนียนกริบ!', 'gold')
          this.step = 'decor'
          this.say(this.cx, this.topY() - 30, 'แตะที่เจดีย์เพื่อปักธงกับดอกไม้', 'info', 2.2)
        }
      }
    } else if (this.step === 'decor') {
      w.goTo(this.cx + 38, this.baseY + 10)
      if (w.pose !== BP.plant || Math.floor(this.t * 2) % 3 === 0) w.pose = BP.pat0
    } else if (this.step === 'wish') {
      this.wishT += dt
      w.goTo(this.cx + 38, this.baseY + 10)
      w.pose = BP.kneelWai
      if (Math.random() < dt * 12) this.particles.add({ kind: 'sparkle', x: this.cx + rand(-20, 20), y: this.topY() + rand(-20, 30), vy: rand(-18, -8), max: rand(0.8, 1.4), color: '#fff3a6' })
      if (this.wishT > 1.6) this.step = 'built'
    }
    for (const d of this.decor) d.t += dt
  }

  private land() {
    const d = this.drop!
    this.drop = null
    const i = this.tiers.length
    const want = CHEDI_TIERS[i]
    const prev = i === 0 ? { x: this.cx, w: want + 20 } : this.tiers[i - 1]
    const res = i === 0 ? { tier: { x: Math.max(this.cx - 20, Math.min(this.cx + 20, d.x)), w: want }, lost: 0, ratio: 1 - Math.min(1, Math.abs(d.x - this.cx) / 40) } : stackTier(prev, d.x, want)
    this.tiers.push(res.tier)
    this.ratios.push(res.ratio)
    this.shake(0.12, 1)
    sfx.plop()
    haptic(12)
    const y = this.topY()
    for (let k = 0; k < 10; k++) this.particles.add({ kind: 'dot', x: res.tier.x + rand(-res.tier.w / 2, res.tier.w / 2), y, vx: rand(-20, 20), vy: rand(-30, -10), g: 120, max: 0.5, color: SAND.b })
    if (res.lost > 1) {
      // The overhang crumbles off the side.
      const side = d.x > prev.x ? 1 : -1
      for (let k = 0; k < Math.min(24, res.lost * 2); k++) this.particles.add({ kind: 'dot', x: res.tier.x + side * (res.tier.w / 2 + rand(0, res.lost)), y: y + rand(0, 6), vx: side * rand(5, 25), vy: rand(-10, 10), g: 160, max: 0.9, color: pick([SAND.b, SAND.d, SAND.l]) })
    }
    if (res.ratio > 0.92) {
      this.praise(pick(['เป๊ะ!', 'ตรงเป๊ะ!', 'สวยมาก!']), 'gold', 0.9)
      this.streak(res.tier.x, y - 8)
    } else if (res.ratio < 0.6) {
      this.say(res.tier.x, y - 16, 'เบี้ยวไปนิด ทรายร่วงหมด', 'warn', 1.3)
      this.breakStreak()
      this.worker?.reactWith('oops', 0.7)
    }
    if (this.tiers.length >= CHEDI_TIERS.length) {
      this.step = 'smooth'
      // Lumps to rub smooth on the tiers.
      this.lumps = []
      for (let k = 0; k < 7; k++) {
        const ti = k % this.tiers.length
        const t = this.tiers[ti]
        this.lumps.push({ x: t.x + rand(-t.w / 2 + 3, t.w / 2 - 3), y: this.baseY - ti * TIER_H - rand(2, 7), left: 0.45 })
      }
      this.praise('ขึ้นรูปครบแล้ว!', 'green', 1)
      this.say(this.cx, this.topY() - 30, 'ถูตรงก้อนทรายขรุขระให้เรียบ', 'info', 2.2)
    }
  }

  protected input(e: PointerInfo) {
    if (this.step === 'stack' && e.type === 'down' && !this.drop) {
      this.drop = { x: this.bucketX, y: this.baseY - 8 - 40, vy: 40, w: CHEDI_TIERS[this.tiers.length] }
      this.worker!.pose = BP.bucketFlip
      sfx.whoosh()
      return
    }
    if (this.step === 'smooth') {
      if (e.type === 'down') this.rub.down = true
      if (e.type === 'up' || e.type === 'cancel') this.rub.down = false
      this.rub.x = e.x
      this.rub.y = e.y
      return
    }
    if (this.step === 'decor' && e.type === 'down') {
      // Snap the tap onto the chedi surface.
      const ti = Math.max(0, Math.min(this.tiers.length - 1, Math.round((this.baseY - e.y) / TIER_H)))
      const t = this.tiers[ti]
      const x = Math.max(t.x - t.w / 2 + 2, Math.min(t.x + t.w / 2 - 2, e.x))
      const y = this.baseY - ti * TIER_H - 4
      if (Math.abs(e.x - this.cx) > 40 || e.y < this.topY() - 40 || e.y > this.baseY + 10) {
        this.say(e.x, e.y - 6, 'แตะที่ตัวเจดีย์นะ', 'info', 1)
        return
      }
      const kind = DECOR[this.decor.length % DECOR.length]
      this.decor.push({ kind, x, y, t: 0 })
      this.worker!.pose = BP.plant
      this.particles.sparkles(x, y - 6, 5, kind.startsWith('flag') ? '#fff3a6' : '#ffd6e0', 6)
      sfx.chime()
      this.streak(x, y - 10, 2.5)
      if (this.decor.length >= 6) {
        this.step = 'wish'
        this.wishT = 0
        this.praise('ตั้งจิตอธิษฐาน...', 'pink', 1.4)
        sfx.hum(2)
      }
    }
  }

  protected draw(g: Surface) {
    const night = this.night
    g.draw(backdrop(this.w, this.h, { horizon: this.horizon, shore: this.shore, night, sea: this.sea }), 0, 0)
    drawSurf(g, this.w, this.shore, this.t, this.sea)
    // Temple flags string across the top (it's Songkran!).
    const flags = ['#e8514a', '#ffd23f', '#43905a', '#5aa9e8', '#ff9fc0', '#fffaf0']
    for (let i = 0; i < 16; i++) {
      const x = 4 + i * 12
      const y = this.horizon + 20 + Math.round(Math.sin(i * 0.6) * 3)
      g.poly([[x, y], [x + 8, y], [x + 4, y + 7 + Math.round(Math.sin(this.t * 3 + i))]], flags[i % flags.length])
    }
    g.line(0, this.horizon + 20, this.w, this.horizon + 20, '#8a8480')
    // Neighbouring kids' little chedis in the distance.
    for (const [x, s] of [[20, 0.6], [this.w - 22, 0.7]] as [number, number][]) this.miniChedi(g, x, this.shore + 40, s)
    const w = this.worker!
    // Player behind the pile while stacking, beside it afterwards.
    const behind = this.step === 'stack'
    if (behind) this.drawWorker(g)
    this.drawChedi(g)
    if (!behind) this.drawWorker(g)
    // The falling sand cake.
    if (this.drop) {
      const d = this.drop
      this.tierShape(g, d.x, d.y + TIER_H / 2, d.w, TIER_H, true)
    }
    // Rub cursor.
    if (this.step === 'smooth' && this.rub.down) {
      g.alpha(0.5)
      g.circle(this.rub.x, this.rub.y, 5, '#fffaf0')
      g.alpha(1)
    }
    if (this.step === 'wish') {
      g.alpha(0.18 + Math.sin(this.t * 6) * 0.06)
      g.ellipse(this.cx, this.topY(), 40, 50, '#fff3a6')
      g.alpha(1)
    }
    void w
  }

  private drawWorker(g: Surface) {
    const w = this.worker!
    w.draw(g)
    if (this.step === 'stack') {
      const up = w.pose === BP.bucketUp
      const [lx, ly] = bwrist(w.pose, 'L', w.x, w.feetY)
      const [rx, ry] = bwrist(w.pose, 'R', w.x, w.feetY)
      const bx = (lx + rx) / 2
      const by = Math.min(ly, ry) - (up ? 9 : 2)
      // Red bucket (flipped when dropping).
      if (up && !this.drop) {
        g.rect(bx - 8, by, 16, 10, '#e8514a')
        g.rect(bx - 9, by - 1, 18, 2, '#ff8a7a')
        g.rect(bx - 7, by + 2, 3, 6, '#ff9f90')
        g.hline(bx - 8, bx + 7, by + 9, '#b8343f')
        g.ellipse(bx, by - 1, 7, 1.5, SAND.l)
      } else {
        g.rect(bx - 7, by + 2, 14, 9, '#e8514a')
        g.rect(bx - 8, by + 10, 16, 2, '#ff8a7a')
      }
      drawFist(g, w.look, lx, ly)
      drawFist(g, w.look, rx, ry)
    }
  }

  private tierShape(g: Surface, x: number, bottom: number, w: number, h: number, fresh = false) {
    const X = Math.round(x - w / 2)
    const Y = Math.round(bottom - h)
    g.rect(X, Y + 1, Math.round(w), h - 1, SAND.b)
    g.rect(X + 1, Y, Math.round(w) - 2, 1, SAND.l)
    g.rect(X, Y + 1, 2, h - 2, SAND.l)
    g.rect(X + Math.round(w) - 2, Y + 1, 2, h - 1, SAND.d)
    g.hline(X, X + Math.round(w) - 1, Y + h - 1, SAND.D)
    // Grain and bucket ridges.
    for (let i = 3; i < w - 3; i += 3) g.px(X + i, Y + 2 + ((i * 7) % (h - 3)), i % 2 ? SAND.d : SAND.l)
    if (!fresh) g.hline(X + 2, X + Math.round(w) - 3, Y + 4, mix(SAND.b, SAND.d, 0.5))
  }

  private drawChedi(g: Surface) {
    shadow(g, this.cx + 4, this.baseY + 2, 26, 4)
    this.tiers.forEach((t, i) => this.tierShape(g, t.x, this.baseY - i * TIER_H, t.w, TIER_H))
    // Lumps still to smooth.
    for (const l of this.lumps) {
      if (l.left <= 0) continue
      const k = l.left / 0.45
      g.circle(l.x, l.y, 1.2 + k * 1.6, SAND.d)
      g.px(l.x - 1, l.y - 1, SAND.l)
    }
    // The spire once all tiers are up.
    if (this.tiers.length >= CHEDI_TIERS.length) {
      const t = this.tiers[this.tiers.length - 1]
      const top = this.topY()
      g.poly([[t.x - 4, top], [t.x, top - 18], [t.x + 4, top]], SAND.b)
      g.line(t.x - 4, top, t.x, top - 18, SAND.l)
      g.line(t.x + 4, top, t.x, top - 18, SAND.d)
      for (let y = top - 4; y > top - 16; y -= 3) g.hline(t.x - 2, t.x + 1, y, SAND.d)
      if (this.step === 'wish' || this.step === 'built') {
        g.px(t.x, top - 19, '#ffd54f')
        g.px(t.x, top - 20, '#fff3a6')
        twinkle(g, t.x, top - 22, 0.5 + Math.sin(this.t * 6) * 0.5)
      }
    }
    for (const d of this.decor) this.drawDecor(g, d)
  }

  private drawDecor(g: Surface, d: { kind: DecorKind; x: number; y: number; t: number }) {
    const pop = d.t < 0.2 ? Math.round((0.2 - d.t) * 20) : 0
    const x = Math.round(d.x)
    const y = Math.round(d.y) - pop
    if (d.kind.startsWith('flag')) {
      const c = { flag_r: '#e8514a', flag_y: '#ffd23f', flag_b: '#5aa9e8', flag_g: '#43905a' }[d.kind as 'flag_r'] ?? '#e8514a'
      g.vline(x, y - 14, y, '#8a6a4a')
      const flap = Math.round(Math.sin(this.t * 5 + x) * 1)
      g.poly([[x + 1, y - 14], [x + 9, y - 11 + flap], [x + 1, y - 8]], c)
      g.px(x + 2, y - 12, mix(c, '#ffffff', 0.4))
      return
    }
    if (d.kind === 'lotus') {
      g.poly([[x - 3, y], [x, y - 6], [x + 3, y]], '#ff9fc0')
      g.px(x, y - 4, '#ffd6e0')
      return
    }
    const c = { flower_p: '#ff6f91', flower_w: '#fffaf0', flower_o: '#f58f35' }[d.kind as 'flower_p'] ?? '#ff6f91'
    g.vline(x, y - 5, y, '#43905a')
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.px(x + dx, y - 6 + dy, c)
    g.px(x, y - 6, '#ffd23f')
  }

  private miniChedi(g: Surface, x: number, y: number, s: number) {
    for (let i = 0; i < 3; i++) {
      const w = Math.round((16 - i * 5) * s)
      g.rect(Math.round(x - w / 2), Math.round(y - (i + 1) * 5 * s), w, Math.max(2, Math.round(5 * s)), i % 2 ? SAND.b : SAND.l)
    }
    g.vline(Math.round(x), Math.round(y - 20 * s), Math.round(y - 15 * s), '#8a6a4a')
    g.rect(Math.round(x + 1), Math.round(y - 20 * s), 3, 2, '#e8514a')
    void INK
  }
}
