// โยนห่วง – ring toss. Drag up from the bottom and let go: the length of the
// swipe sets how far the ring flies, the sideways drift sets the direction.
// Ring a bottle neck to score: front row 1, middle 2, back 3, the gold
// bottle 5. Eight rings.

import type { PointerInfo } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic } from '../../engine/audio'
import { JobScene, type JobSummary } from '../jobs/base'
import { boothBackdrop, drawBottle, drawBulbs, drawCorkPrize, drawRing, type CorkPrizeKind } from './art'
import { BoothDress } from './booth-dress'
import { VENDORS } from './vendors'
import { FAIR_GAMES } from '../../game/hubs'
import { fairSfx } from './sound'
import { RING_TARGET, ROW_DEPTH, ROW_POINTS, ROW_SCALE, ringCatches, ringLanding } from './rules'
import { drawPlayer, placePlayer } from './player'

const RINGS = 8
const FLIGHT = 0.6

interface Bottle {
  x: number
  row: number
  color: string
  gold: boolean
  ringed: boolean
}

interface Throw {
  sx: number
  sy: number
  lx: number
  depth: number
  t: number
  state: 'fly' | 'miss'
  mx: number
  my: number
  vx: number
  vy: number
  life: number
}

export class RingsScene extends JobScene {
  private dress = new BoothDress(this, { vendor: VENDORS.rings, color: '#3d63b5', sign: FAIR_GAMES.rings.booth })
  duration = 40
  thresholds: [number, number, number] = [4 / RING_TARGET, 8 / RING_TARGET, 1]
  score = 0
  rings = RINGS
  ringed = 0
  bottles: Bottle[] = []
  throws: Throw[] = []
  private drag: { sx: number; sy: number; x: number; y: number } | null = null
  private bg: HTMLCanvasElement | null = null
  private tableTop = 150
  private tableFront = 250
  /** Seconds left of the toss follow-through. */
  private tossT = 0

  progress() {
    return Math.min(1, this.score / RING_TARGET)
  }
  goalText() {
    return `แต้ม ${this.score} · ห่วง ${this.rings}`
  }
  complete() {
    return this.rings <= 0 && this.throws.length === 0
  }
  summary(): JobSummary {
    return {
      title: this.score >= RING_TARGET ? 'เซียนโยนห่วงประจำงานวัด!' : undefined,
      lines: [`คล้องได้ ${this.ringed}/${RINGS} ห่วง`, `คะแนน ${this.score}`],
    }
  }

  /** Screen y of a depth (0 front … 2 back). */
  rowY(depth: number) {
    return this.tableFront - (depth / 2) * (this.tableFront - this.tableTop)
  }
  private scaleAt(depth: number) {
    return 1 - depth * 0.19
  }

  protected anchor() {
    this.tableTop = Math.round(this.top + (this.bottom - this.top) * 0.4)
    this.tableFront = Math.round(this.top + (this.bottom - this.top) * 0.66)
    this.bg = boothBackdrop(this.w, this.h, this.top + 20, '#3d63b5', '#2a3a6a')
    this.dress.anchor(this.top + 20)
  }

  protected populate() {
    this.bottles = []
    const counts = [4, 5, 6]
    const goldRow = 2
    const goldIdx = Math.floor(rand(1, counts[goldRow] - 1))
    ROW_DEPTH.forEach((d, row) => {
      const n = counts[row]
      const span = (this.w - 40) * this.scaleAt(d)
      for (let i = 0; i < n; i++) {
        const x = this.cx - span / 2 + (span * (i + 0.5)) / n
        this.bottles.push({ x, row, color: pick(['#43905a', '#9fd8c0', '#8a5a3a', '#5a8de0', '#e8514a']), gold: row === goldRow && i === goldIdx, ringed: false })
      }
    })
    this.throws = []
  }

  protected input(e: PointerInfo) {
    if (e.type === 'down') {
      if (this.rings <= 0) return
      this.drag = { sx: e.x, sy: e.y, x: e.x, y: e.y }
      return
    }
    if (!this.drag) return
    if (e.type === 'move') {
      this.drag.x = e.x
      this.drag.y = e.y
      return
    }
    if (e.type === 'up') {
      const dx = e.x - this.drag.sx
      const dy = this.drag.sy - e.y
      this.drag = null
      if (dy < 14) {
        this.say(this.cx, this.bottom - 40, 'ลากขึ้นแล้วปล่อยนะ', 'info', 1)
        return
      }
      const { lx, depth } = ringLanding(dx, dy)
      const wob = rand(-2, 2) * (0.6 + depth * 0.4)
      this.rings--
      const h = placePlayer('act_f_toss_b', this.cx + 10, this.bottom).hand
      this.tossT = 0.35
      this.throws.push({ sx: h.x, sy: h.y, lx: this.cx + lx + wob, depth: depth + rand(-0.06, 0.06), t: 0, state: 'fly', mx: 0, my: 0, vx: 0, vy: 0, life: 0 })
      fairSfx.tick()
    } else if (e.type === 'cancel') this.drag = null
  }

  protected tick(dt: number) {
    this.dress.update(dt)
    this.tossT = Math.max(0, this.tossT - dt)
    for (const th of this.throws) {
      if (th.state === 'fly') {
        th.t += dt / FLIGHT
        if (th.t >= 1) this.land(th)
      } else {
        th.life -= dt
        th.mx += th.vx * dt
        th.my += th.vy * dt
        th.vy += 90 * dt
      }
    }
    this.throws = this.throws.filter((th) => (th.state === 'fly' ? th.t < 1 : th.life > 0))
  }

  private land(th: Throw) {
    // Nearest bottle that can catch it.
    let best: Bottle | null = null
    let bd = Infinity
    for (const b of this.bottles) {
      if (b.ringed) continue
      if (!ringCatches(th.lx, th.depth, b.x, b.row)) continue
      const d = Math.abs(th.lx - b.x)
      if (d < bd) {
        bd = d
        best = b
      }
    }
    if (best) {
      best.ringed = true
      th.t = 1
      const pts = best.gold ? 5 : ROW_POINTS[best.row]
      this.score += pts
      this.ringed++
      const y = this.rowY(ROW_DEPTH[best.row])
      this.particles.sparkles(best.x, y - 16, best.gold ? 14 : 7, best.gold ? '#fff3a6' : '#ffffff', 10)
      this.say(best.x, y - 24, best.gold ? `ขวดทอง! +${pts}` : pick([`คล้องได้! +${pts}`, `เป๊ะ! +${pts}`, `สวย! +${pts}`]), 'good', 1)
      fairSfx.clink()
      haptic(14)
      this.dress.cheer(best.gold || best.row === 2)
      if (best.gold) this.flash(0.15)
      return
    }
    // Bounce off and roll away.
    th.state = 'miss'
    th.life = 0.8
    th.mx = th.lx
    th.my = this.rowY(Math.min(2.4, th.depth))
    th.vx = rand(-40, 40)
    th.vy = -40
    const txt = th.depth > 2.35 ? 'ไกลไป!' : th.depth < -0.2 ? 'ใกล้ไป!' : pick(['กระเด้งออก!', 'เฉียดไปนิดเดียว!', 'อ๊ะ!'])
    this.say(th.lx, th.my - 18, txt, 'warn', 0.9)
    this.dress.oops()
    fairSfx.miss()
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    this.dress.drawBack(g, this.t)
    drawBulbs(g, this.w, this.top + 6, this.t)
    // Prize shelf on the back wall: what you could win.
    const shelfY = this.tableTop - 34
    g.rect(16, shelfY, this.w - 32, 3, '#c8a878')
    g.hline(16, this.w - 17, shelfY, '#e0c8a0')
    const deco: [CorkPrizeKind, string][] = [
      ['teddy', '#ff9fc0'],
      ['hippo', '#8a8098'],
      ['doll', '#5a8de0'],
      ['teddy', '#c9a06a'],
      ['candy', '#ffd23f'],
      ['hippo', '#8a8098'],
      ['teddy', '#9fd0ff'],
    ]
    deco.forEach(([k, c], i) => drawCorkPrize(g, 26 + (i * (this.w - 52)) / (deco.length - 1), shelfY, k, 0, c, this.t))
    // The table in perspective with three step rows.
    const tl = 18
    const tr = this.w - 18
    const back = this.tableTop - 14
    g.poly([[tl + 22, back], [tr - 22, back], [tr, this.tableFront + 12], [tl, this.tableFront + 12]], '#c8a878')
    g.poly([[tl + 22, back], [tr - 22, back], [tr - 20, back + 3], [tl + 20, back + 3]], '#e0c8a0')
    for (const d of ROW_DEPTH) {
      const y = this.rowY(d)
      const half = ((this.w - 40) * this.scaleAt(d)) / 2 + 6
      g.hline(Math.round(this.cx - half), Math.round(this.cx + half), y + 1, '#a8885a')
    }
    g.rect(tl, this.tableFront + 12, tr - tl, 10, '#8a6a42')
    // Bottles back to front, rings on the ringed ones.
    for (const row of [2, 1, 0]) {
      const y = this.rowY(ROW_DEPTH[row])
      const s = ROW_SCALE[row]
      for (const b of this.bottles.filter((q) => q.row === row)) {
        drawBottle(g, b.x, y, s, b.color, b.gold)
        if (b.ringed) drawRing(g, b.x, y - 17 * s, s * 0.7, '#ffd23f', 0.4)
      }
    }
    // Flying and bouncing rings.
    for (const th of this.throws) {
      if (th.state === 'fly') {
        const k = th.t
        const x = th.sx + (th.lx - th.sx) * k
        const yEnd = this.rowY(Math.max(-0.3, Math.min(2.6, th.depth))) - 14 * this.scaleAt(th.depth)
        const y = th.sy + (yEnd - th.sy) * k - Math.sin(k * Math.PI) * (26 + th.depth * 12)
        const s = 1.4 - k * (1.4 - this.scaleAt(th.depth) * 0.85)
        drawRing(g, x, y, s, '#ffd23f', 0.35 + Math.abs(Math.sin(k * 9)) * 0.3)
      } else drawRing(g, th.mx, th.my, 0.7, '#ffd23f', 0.3)
    }
    // Aim guide while dragging.
    const d = this.drag
    if (d) {
      const dx = d.x - d.sx
      const dy = d.sy - d.y
      const { lx, depth } = ringLanding(dx, dy)
      const ex = this.cx + lx
      const ey = this.rowY(Math.min(2.6, depth))
      const from = placePlayer('act_f_toss_a', this.cx + 10, this.bottom).hand
      const sx = from.x
      const sy = from.y
      for (let i = 1; i < 10; i++) {
        const k = i / 10
        const x = sx + (ex - sx) * k
        const y = sy + (ey - sy) * k - Math.sin(k * Math.PI) * 18
        if (i % 2) g.px(Math.round(x), Math.round(y), dy > 14 ? '#fff3a6' : '#bdb2ae')
      }
      g.alpha(0.5)
      drawRing(g, ex, ey - 2, this.scaleAt(depth) * 0.8, '#ffffff', 0.35)
      g.alpha(1)
    }
    // Rings left (stacked on a peg by the counter).
    for (let i = 0; i < this.rings; i++) drawRing(g, 40, this.bottom - 10 - i * 3, 0.9, i % 2 ? '#ffd23f' : '#ff9fc0', 0.3)
    this.dress.drawPeople(g, this.t)
    // You, from behind: swing back while you drag, toss on release.
    const pose = this.tossT > 0 ? 'act_f_toss_b' : d ? 'act_f_toss_a' : this.rings > 0 ? 'stand' : this.ringed >= 4 ? 'act_f_cheer' : 'act_f_oops'
    const me = drawPlayer(g, pose, this.cx + 10, this.bottom)
    if (this.rings > 0 && this.tossT <= 0) drawRing(g, me.hand.x, me.hand.y + 1, 0.8, '#ffd23f', 0.9)
    if (this.rings > 0 && !d) {
      if (this.playing && this.throws.length === 0) {
        // Swipe-up hint.
        const k = (this.t * 1.5) % 1
        const y = this.bottom - 34 - k * 22
        g.alpha(1 - k)
        g.vline(this.cx, y, y + 8, '#fff3a6')
        g.px(this.cx - 1, y + 1, '#fff3a6')
        g.px(this.cx + 1, y + 1, '#fff3a6')
        g.px(this.cx - 2, y + 2, '#fff3a6')
        g.px(this.cx + 2, y + 2, '#fff3a6')
        g.alpha(1)
      }
    }
  }
}
