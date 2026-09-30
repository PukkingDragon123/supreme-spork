// รำวง – dance round the flower table to the band's drum. Flowers float
// down the circle to the gold rings at your hands: tap the left or right
// side of the screen as each one lands. Your doll dances the steps; misses
// get a sheepish shrug. Real players on the dance floor (net 'dance' topic)
// dance beside you, in step with their own taps.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { pick } from '../../engine/rng'
import { haptic } from '../../engine/audio'
import { game } from '../../game/state'
import { grantCollectible, ownedCount } from '../../game/collectibles'
import { dollSprite, type DollPose } from '../../art/doll'
import { avatarSprite, type AvatarLook, type Pose } from '../../art/avatar'
import { randomVisitorLook } from '../../scenes/world'
import { drawShadow } from '../../art/props'
import { BULBS } from '../../art/places/fair'
import { mix } from '../../art/places/hub-kit'
import '../../art/poses/fair'
import { JobScene, type JobSummary } from '../jobs/base'
import { fairSfx } from './sound'
import { GOOD_WIN, judgeTap, notePoints, RAMWONG_BPM, RAMWONG_LEAD, ramwongChart, ramwongTarget, type Grade, type Note, type Side } from './rules'
import { fairPlayers, onDanceStep, safeName, sendDanceStep, type DanceStep } from './live'

const SONG = 34
const MELODY = [523, 587, 659, 784, 659, 587, 523, 440, 523, 659, 784, 880, 784, 659, 587, 523]

interface Judged extends Note {
  i: number
  grade: Grade | null
}

interface Remote {
  id: string
  name: string
  look: AvatarLook
  side: Side
  at: number
  seen: number
}

export class RamwongScene extends JobScene {
  duration = 36
  chart: Judged[] = ramwongChart(SONG).map((n, i) => ({ ...n, i, grade: null }))
  target = ramwongTarget(this.chart)
  thresholds: [number, number, number] = [0.35, 0.65, 1]
  score = 0
  combo = 0
  best = 0
  perfect = 0
  good = 0
  missed = 0
  private songT = -1
  private beat = -1
  private pose: DollPose = 'act_f_ramwong_a'
  private poseT = 0
  private flashL = 0
  private flashR = 0
  private dancers: { lk: AvatarLook; a: number }[] = Array.from({ length: 10 }, (_, i) => ({ lk: randomVisitorLook(), a: (i / 10) * Math.PI * 2 }))
  private remotes = new Map<string, Remote>()
  private off: (() => void) | null = null
  private me = game.value.player.look

  progress() {
    return Math.min(1, this.score / this.target)
  }
  goalText() {
    return `แต้ม ${this.score} · คอมโบ ${this.combo}`
  }
  complete() {
    return false
  }
  summary(): JobSummary {
    const lines = [`เป๊ะ ${this.perfect} · ดี ${this.good} · พลาด ${this.missed} · คอมโบสูงสุด ${this.best}`, `คะแนน ${this.score}`]
    if (this.remotes.size) lines.push(`รำด้วยกันกับผู้เล่นจริง ${this.remotes.size} คน`)
    return { title: this.progress() >= 1 ? 'นางรำ (นายรำ) ประจำงานวัด!' : undefined, lines }
  }

  private ring(side: Side) {
    return { x: this.cx + (side === 'L' ? -46 : 46), y: this.bottom - 64 }
  }

  protected anchor() {}
  protected populate() {
    this.chart.forEach((n) => (n.grade = null))
    this.score = 0
    this.combo = 0
    if (!this.off) {
      this.off = onDanceStep((from, st) => this.remoteStep(from, st))
    }
  }

  private remoteStep(from: string, st: DanceStep) {
    const p = fairPlayers().find((x) => x.id === from)
    let r = this.remotes.get(from)
    if (!r) {
      if (this.remotes.size >= 3) return
      r = { id: from, name: safeName(p?.name), look: p?.look ?? randomVisitorLook(), side: st.side, at: this.t, seen: this.t }
      this.remotes.set(from, r)
      this.say(this.cx, this.top + 30, `${r.name} มารำด้วย!`, 'good', 1.6)
    }
    r.side = st.side
    r.at = this.t
    r.seen = this.t
  }

  protected input(e: PointerInfo) {
    if (e.type !== 'down') return
    const side: Side = e.x < this.cx ? 'L' : 'R'
    this.tap(side)
  }

  private tap(side: Side) {
    const t = this.songT
    let best: Judged | null = null
    let bd = Infinity
    for (const n of this.chart) {
      if (n.grade || n.side !== side) continue
      const d = Math.abs(n.t - t)
      if (d < bd) {
        bd = d
        best = n
      }
      if (n.t > t + 0.5) break
    }
    if (side === 'L') this.flashL = 0.15
    else this.flashR = 0.15
    if (!best || bd > GOOD_WIN + 0.14) return
    this.judge(best, judgeTap(t - best.t))
  }

  private judge(n: Judged, g: Grade) {
    n.grade = g
    const r = this.ring(n.side)
    if (g === 'miss') {
      this.combo = 0
      this.missed++
      this.pose = 'act_f_oops'
      this.poseT = 0.35
      this.say(r.x, r.y - 16, pick(['พลาด!', 'อุ๊ย!', 'ผิดจังหวะ']), 'warn', 0.6)
    } else {
      this.score += notePoints(g, this.combo)
      this.combo++
      this.best = Math.max(this.best, this.combo)
      if (g === 'perfect') {
        this.perfect++
        fairSfx.ding()
      } else this.good++
      this.pose = n.side === 'L' ? 'act_f_ramwong_a' : 'act_f_ramwong_b'
      this.poseT = 0.4
      this.particles.sparkles(r.x, r.y, g === 'perfect' ? 10 : 5, g === 'perfect' ? '#fff3a6' : '#ffffff', 8)
      const txt = g === 'perfect' ? (this.combo >= 10 ? `เป๊ะ! คอมโบ ${this.combo}` : 'เป๊ะ!') : 'ดี!'
      this.say(r.x, r.y - 16, txt, 'good', 0.6)
      haptic(g === 'perfect' ? 14 : 8)
    }
    sendDanceStep({ beat: n.i, side: n.side, grade: g })
  }

  protected tick(dt: number) {
    this.poseT = Math.max(0, this.poseT - dt)
    this.flashL = Math.max(0, this.flashL - dt)
    this.flashR = Math.max(0, this.flashR - dt)
    for (const d of this.dancers) d.a += dt * 0.3
    for (const [id, r] of this.remotes) if (this.t - r.seen > 8) this.remotes.delete(id)
    if (!this.playing) return
    this.songT = this.elapsed
    // The band: drum on every beat (accent on 1 and 3), the ching, a tune.
    const beatLen = 60 / RAMWONG_BPM
    const b = Math.floor(this.songT / beatLen)
    if (b !== this.beat && this.songT < SONG) {
      this.beat = b
      const inBar = b % 4
      fairSfx.drum(inBar === 0 || inBar === 2)
      fairSfx.ching(inBar === 1 || inBar === 3)
      if (b >= 4) fairSfx.note(MELODY[b % MELODY.length])
    }
    // Notes that sailed past are misses.
    for (const n of this.chart) {
      if (n.grade) continue
      if (n.t < this.songT - GOOD_WIN - 0.05) this.judge(n, 'miss')
      else break
    }
  }

  protected ended() {
    if (this.progress() >= 1 && ownedCount('fair_ramwong_fan') === 0) grantCollectible('fair_ramwong_fan')
    this.off?.()
    this.off = null
  }

  dispose() {
    this.off?.()
    this.off = null
  }

  protected draw(g: Surface) {
    const { w, h, t } = this
    const H = this.bottom - this.top
    g.gradientV(0, 0, w, h, ['#10123a', '#20245a', '#2a2446'])
    // String lights over the floor.
    for (let i = 0; i < 28; i++) {
      const f = i / 27
      const x = f * w
      const y = this.top + 12 + Math.sin(f * Math.PI) * 14
      const on = (Math.floor(t * 4) + i) % 3 !== 0
      g.rect(Math.round(x) - 1, Math.round(y), 2, 2, on ? BULBS[i % BULBS.length] : '#3a3048')
    }
    // The dance floor in perspective with its flower table.
    const fx = this.cx
    const fy = Math.round(this.top + H * 0.44)
    const rx = w * 0.46
    const ry = H * 0.16
    g.ellipse(fx, fy + 3, rx + 5, ry + 4, '#3a2620')
    g.ellipse(fx, fy, rx, ry, '#a86a3e')
    for (let r = 0.25; r < 1; r += 0.25) {
      for (let i = 0; i < 80; i++) {
        const a = (i / 80) * Math.PI * 2
        g.px(Math.round(fx + Math.cos(a) * rx * r), Math.round(fy + Math.sin(a) * ry * r), '#8a522e')
      }
    }
    // Dancers circling (behind and in front of the table).
    const put = (lk: AvatarLook, a: number, i: number) => {
      const x = fx + Math.cos(a) * rx * 0.72
      const y = fy + Math.sin(a) * ry * 0.72
      const onBeat = this.beat >= 0 ? (this.beat + i) % 2 === 0 : Math.floor(t * 2 + i) % 2 === 0
      const pose: Pose = onBeat ? 'offer' : 'happy'
      const sp = avatarSprite(lk, 'side', pose, { flip: -Math.sin(a) < 0 })
      drawShadow(g, x, y, 6, 2)
      g.draw(sp.canvas, Math.round(x - sp.w / 2), Math.round(y - sp.h + 1 - (onBeat ? 1 : 0)))
    }
    const back = this.dancers.filter((d) => Math.sin(d.a) < 0)
    const front = this.dancers.filter((d) => Math.sin(d.a) >= 0)
    back.forEach((d, i) => put(d.lk, d.a, i))
    g.rect(fx - 12, fy - 10, 24, 4, '#fffaf0')
    g.rect(fx - 11, fy - 6, 1, 8, '#8a8480')
    g.rect(fx + 10, fy - 6, 1, 8, '#8a8480')
    g.rect(fx - 3, fy - 16, 6, 6, '#e8e0d4')
    for (const [dx, dy, c] of [
      [-2, -19, '#ff9fc0'],
      [1, -20, '#ffd23f'],
      [-4, -17, '#e8514a'],
      [3, -17, '#fffaf0'],
    ] as const)
      g.circle(fx + dx, fy + dy, 2, c)
    front.forEach((d, i) => put(d.lk, d.a, i + 5))
    // Real players dancing with you (big, either side).
    const rem = [...this.remotes.values()]
    rem.slice(0, 2).forEach((r, i) => {
      const x = i === 0 ? 26 : w - 26
      const fresh = t - r.at < 0.45
      const pose: DollPose = fresh ? (r.side === 'L' ? 'act_f_ramwong_a' : 'act_f_ramwong_b') : this.beat % 2 ? 'act_f_ramwong_a' : 'act_f_ramwong_b'
      const sp = dollSprite(r.look, pose, { view: 'front' })
      g.draw(sp.canvas, Math.round(x - sp.w / 2), this.bottom - sp.h + 4)
      g.px(Math.round(x), this.bottom - sp.h - 2, '#ff6f91')
      g.px(Math.round(x) - 1, this.bottom - sp.h - 3, '#ff6f91')
      g.px(Math.round(x) + 1, this.bottom - sp.h - 3, '#ff6f91')
    })
    // Target rings at your hands.
    for (const side of ['L', 'R'] as const) {
      const r = this.ring(side)
      const hot = side === 'L' ? this.flashL > 0 : this.flashR > 0
      g.alpha(hot ? 0.45 : 0.16)
      g.ellipse(r.x, r.y, 12, 10, '#fff3a6')
      g.alpha(1)
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2
        const rr = 13 + (hot ? 1 : 0)
        g.px(Math.round(r.x + Math.cos(a) * rr), Math.round(r.y + Math.sin(a) * rr * 0.8), i % 3 ? '#ffd54f' : '#fff3a6')
        if (i % 2) g.px(Math.round(r.x + Math.cos(a) * (rr - 1)), Math.round(r.y + Math.sin(a) * (rr - 1) * 0.8), '#b8742a')
      }
      // A little จีบ hand in the ring: which side to tap.
      const hx = r.x + (side === 'L' ? -1 : 1)
      g.rect(hx - 2, r.y - 1, 4, 4, '#f0bd90')
      g.px(hx + (side === 'L' ? -3 : 2), r.y - 3, '#f0bd90')
      g.px(hx + (side === 'L' ? -2 : 1), r.y - 2, '#f0bd90')
    }
    // Falling flowers.
    for (const n of this.chart) {
      if (n.grade && n.grade !== 'miss') continue
      const dt = n.t - this.songT
      if (dt > RAMWONG_LEAD || dt < -0.3) continue
      const k = 1 - dt / RAMWONG_LEAD
      const r = this.ring(n.side)
      const sx = this.cx + (n.side === 'L' ? -12 : 12)
      const sy = this.top + 34
      const x = sx + (r.x - sx) * k
      const y = sy + (r.y - sy) * Math.pow(Math.max(0, k), 1.15)
      const s = 0.6 + Math.min(1, k) * 0.6
      if (!n.grade && Math.floor(this.t * 20 + n.i) % 3 === 0) g.px(Math.round(x + (n.side === 'L' ? 3 : -3)), Math.round(y - 6), '#fff3a6')
      this.drawFlower(g, x, y, s, n.side, n.grade === 'miss')
    }
    // You, dancing.
    const pose: DollPose = this.poseT > 0 ? this.pose : this.beat >= 0 ? (this.beat % 2 ? 'act_f_ramwong_a' : 'act_f_ramwong_b') : 'act_f_ramwong_a'
    const sp = dollSprite(this.me, pose, { view: 'front', blink: Math.floor(t * 2) % 9 === 0 })
    const hop = this.poseT > 0 && pose !== 'act_f_oops' ? 1 : 0
    drawShadow(g, this.cx, this.bottom + 2, 12, 3)
    g.draw(sp.canvas, this.cx - Math.round(sp.w / 2), this.bottom - sp.h + 4 - hop)
    // Combo glow.
    if (this.combo >= 5) {
      g.alpha(Math.min(0.5, this.combo / 30))
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 2
        g.px(Math.round(this.cx + Math.cos(a) * 24), Math.round(this.bottom - 26 + Math.sin(a) * 12), '#fff3a6')
      }
      g.alpha(1)
    }
  }

  private drawFlower(g: Surface, x: number, y: number, s: number, side: Side, dim: boolean) {
    const c = side === 'L' ? '#ff9fc0' : '#ffc83a'
    const X = Math.round(x)
    const Y = Math.round(y)
    const r = Math.max(2, Math.round(4.6 * s))
    if (dim) g.alpha(0.4)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      g.circle(X + Math.cos(a) * r * 0.8, Y + Math.sin(a) * r * 0.8, r * 0.7, mix(c, '#ffffff', 0.2))
    }
    g.circle(X, Y, r * 0.55, side === 'L' ? '#ffd23f' : '#e8514a')
    g.px(X - 1, Y - 1, '#ffffff')
    g.alpha(1)
  }
}
