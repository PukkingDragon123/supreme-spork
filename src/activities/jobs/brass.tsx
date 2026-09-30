// ขัดทองเหลือง – rub the rag back and forth over the tarnished brass until it
// gleams. The faster you rub, the quicker it shines. Three pieces: a bowl,
// a bell and a pedestal tray.

import type { PointerInfo } from '../../engine/stage'
import { createCanvas, type Surface } from '../../engine/pixel'
import { rand, pick } from '../../engine/rng'
import { haptic, sfx } from '../../engine/audio'
import { bakeBrassTable, brassSculpts, BRASS_KINDS, BRASS_NAMES, drawRag, shadow, type BrassKind } from '../../art/jobs'
import { Drag, JobScene, type JobSummary } from './base'
import { Worker } from './worker'
import { wsfx } from './workSfx'
import { reachPose, WP } from '../../art/poses/work'
import { drawFist } from '../../art/workActor'
import { glow, vignette } from '../../art/workFx'

const SCALE = 1.45
const DONE_AT = 0.82

interface Piece {
  kind: BrassKind
  dull: HTMLCanvasElement
  bright: HTMLCanvasElement
  ox: number
  oy: number
  mask: HTMLCanvasElement
  solid: Uint8Array
  total: number
  frac: number
  done: boolean
}

export class BrassScene extends JobScene {
  duration = 40
  thresholds: [number, number, number] = [1 / 3, 2 / 3, 1]
  pieces: Piece[] = []
  index = 0
  private bg: HTMLCanvasElement | null = null
  private drag = new Drag()
  private rubbing = false
  private tmp: HTMLCanvasElement | null = null
  private baseY = 250
  private slide = 0
  private shine = -1
  private measureT = 0
  private scrapeT = 0
  private tableY = 200
  private hinted = false
  private slowT = 0
  private hardT = 0
  private shineT = 0

  get current(): Piece | undefined {
    return this.pieces[this.index]
  }
  get doneCount() {
    return this.pieces.filter((p) => p.done).length
  }
  progress() {
    if (!this.pieces.length) return 0
    const cur = this.current
    const part = cur && !cur.done ? Math.min(1, cur.frac / DONE_AT) : 0
    return Math.min(1, (this.doneCount + part) / this.pieces.length)
  }
  complete() {
    return this.pieces.length > 0 && this.doneCount === this.pieces.length && this.shine < 0
  }
  goalText() {
    return `ขัดจนเงา ${this.doneCount}/${this.pieces.length} ชิ้น`
  }
  cheerText() {
    return 'เงาวิ้งทุกชิ้น!'
  }
  summary(): JobSummary {
    return {
      title: this.doneCount === this.pieces.length ? 'ทองเหลืองเงาวิ้งทุกชิ้น!' : undefined,
      lines: [`ขัดจนเงา ${this.doneCount}/${this.pieces.length} ชิ้น`, ...this.pieces.filter((p) => p.done).map((p) => `${BRASS_NAMES[p.kind]} เงาวับ`)],
    }
  }

  protected anchor() {
    this.tableY = Math.round(this.top + this.playH * 0.52)
    this.baseY = Math.round(this.top + this.playH * 0.7)
    this.bg = bakeBrassTable(this.w, this.h, this.tableY)
    // The player stands behind the table, waist at its back edge.
    const feet = this.tableY + 13
    if (!this.worker) this.worker = new Worker(this.cx + 30, feet)
    else if (this.phase === 'ready') this.worker.place(this.cx + 30, feet)
    this.worker.goTo(this.worker.tx, feet)
    this.worker.clipY = this.tableY
  }

  private aimWorker(dt: number) {
    const wk = this.worker
    if (!wk) return
    const d = this.drag
    if (this.rubbing && this.slide === 0) {
      const fast = d.speed > 200
      this.hardT = fast ? this.hardT + dt : Math.max(0, this.hardT - dt * 2)
      // Lean toward the rag, sway with the strokes.
      wk.follow = 9
      wk.goTo(Math.max(18, Math.min(this.w - 18, d.x + 10)), this.tableY + 13 + (fast && Math.sin(this.t * 24) > 0 ? 1 : 0))
      const sx = wk.x + 7.5
      const sy = wk.feetY - 26
      wk.pose = reachPose('front', 'R', Math.atan2(d.y - sy, d.x - sx), 9, fast ? 'open' : 'smile', { w: [10, 37] })
      wk.face = this.hardT > 1.2 ? 'sweat' : 'none'
    } else {
      this.hardT = 0
      wk.pose = WP.ready
      wk.face = 'none'
      wk.follow = 5
    }
  }

  protected populate() {
    this.hinted = false
    this.pieces = BRASS_KINDS.map((kind) => {
      const b = brassSculpts(kind, SCALE)
      const w = b.dull.width
      const h = b.dull.height
      const data = b.dull.getContext('2d')!.getImageData(0, 0, w, h).data
      const solid = new Uint8Array(w * h)
      let total = 0
      for (let i = 0; i < w * h; i++)
        if (data[i * 4 + 3] > 0) {
          solid[i] = 1
          total++
        }
      return { kind, dull: b.dull, bright: b.bright, ox: b.ox, oy: b.oy, mask: createCanvas(w, h), solid, total, frac: 0, done: false }
    })
    this.index = 0
    this.slide = 0
  }

  /** Top-left of the current piece's canvas. */
  private origin(p: Piece, off = 0): [number, number] {
    return [Math.round(this.cx - p.ox + off), Math.round(this.baseY - p.oy)]
  }

  protected input(e: PointerInfo) {
    const d = this.drag
    if (e.type === 'down') {
      if (d.down) return
      d.begin(e)
      this.rubbing = true
      return
    }
    if (e.type === 'move') {
      if (!d.move(e)) return
      this.rub(d.px, d.py, d.x, d.y)
      return
    }
    if (d.end(e)) this.rubbing = false
  }

  private rub(x0: number, y0: number, x1: number, y1: number) {
    const p = this.current
    if (!p || p.done || this.slide !== 0) return
    const len = Math.hypot(x1 - x0, y1 - y0)
    if (len < 0.5) return
    const speed = this.drag.speed
    const power = Math.min(1, speed / 260)
    const [ox, oy] = this.origin(p)
    const m = p.mask.getContext('2d')!
    m.fillStyle = '#fff'
    m.globalAlpha = 0.012 + power * 0.05
    const steps = Math.max(1, Math.ceil(len / 2))
    let hit = false
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const cx = x0 + (x1 - x0) * t - ox
      const cy = y0 + (y1 - y0) * t - oy
      const r = 8
      for (let yy = Math.floor(cy - r); yy <= cy + r; yy++)
        for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) {
          if (xx < 0 || yy < 0 || xx >= p.mask.width || yy >= p.mask.height) continue
          if ((xx - cx) ** 2 + (yy - cy) ** 2 > r * r) continue
          if (!p.solid[yy * p.mask.width + xx]) continue
          m.fillRect(xx, yy, 1, 1)
          hit = true
        }
    }
    m.globalAlpha = 1
    if (hit) {
      if (this.scrapeT <= 0) {
        sfx.scratch()
        this.scrapeT = 0.07 + (1 - power) * 0.1
      }
      if (Math.random() < 0.25 + power * 0.4) this.particles.add({ kind: 'dot', x: x1 + rand(-5, 5), y: y1 + rand(-3, 3), vx: rand(-20, 20), vy: rand(-10, 20), g: 120, max: 0.5, color: pick(['#5a482c', '#566a48', '#3e4e36']) })
      if (power > 0.6 && Math.random() < 0.3) this.particles.add({ kind: 'sparkle', x: x1 + rand(-6, 6), y: y1 + rand(-6, 6), max: 0.35, color: '#fff3a6' })
      if (power > 0.7 && Math.random() < 0.05) haptic(4)
      if (power > 0.55 && this.shineT <= 0) {
        wsfx.shine()
        this.shineT = 0.35
      }
    }
  }

  private measure(p: Piece) {
    const w = p.mask.width
    const h = p.mask.height
    const d = p.mask.getContext('2d')!.getImageData(0, 0, w, h).data
    let s = 0
    for (let i = 0; i < w * h; i++) if (p.solid[i]) s += d[i * 4 + 3]
    p.frac = s / (255 * p.total)
  }

  protected tick(dt: number) {
    const d = this.drag
    if (!d.down) d.settle(dt)
    this.shineT -= dt
    this.aimWorker(dt)
    if (this.playing && !this.hinted && this.elapsed > 0.3 && this.current) {
      this.hinted = true
      this.say(this.cx, this.baseY - this.current.oy - 6, `ถู${BRASS_NAMES[this.current.kind]}แรง ๆ`, 'info', 1.8)
    }
    // Nudge slow rubbers to go faster.
    if (this.rubbing && d.speed > 5 && d.speed < 90) this.slowT += dt
    else this.slowT = Math.max(0, this.slowT - dt)
    if (this.slowT > 1.2) {
      this.slowT = -3
      this.say(d.x, d.y - 16, 'ถูเร็ว ๆ จะเงาไวขึ้น!', 'info', 1.2)
    }
    this.scrapeT -= dt
    const p = this.current
    this.measureT -= dt
    if (p && !p.done && this.measureT <= 0) {
      this.measureT = 0.2
      this.measure(p)
      if (p.frac >= DONE_AT) this.polished(p)
    }
    if (this.shine >= 0) {
      this.shine += dt
      if (this.shine > 1.3) {
        this.shine = -1
        if (this.index < this.pieces.length - 1) this.slide = 0.001
      }
    }
    if (this.slide > 0) {
      this.slide += dt * 1.6
      if (this.slide >= 1) {
        this.slide = 0
        this.index++
        const n = this.current
        if (n) this.say(this.cx, this.baseY - n.oy - 6, `ต่อไป ${BRASS_NAMES[n.kind]}`, 'info', 1.2)
        sfx.whoosh()
      }
    }
  }

  private polished(p: Piece) {
    p.done = true
    p.frac = 1
    const m = p.mask.getContext('2d')!
    m.fillStyle = '#fff'
    m.fillRect(0, 0, p.mask.width, p.mask.height)
    this.shine = 0
    this.flash(0.3)
    const [ox, oy] = this.origin(p)
    for (let i = 0; i < 18; i++) this.particles.sparkles(ox + rand(0, p.mask.width), oy + rand(0, p.mask.height), 1, i % 2 ? '#ffffff' : '#fff3a6', 4)
    if (p.kind === 'bell') {
      sfx.bell(2)
      setTimeout(() => sfx.bell(4), 180)
    } else sfx.chime()
    sfx.sparkle()
    haptic(24)
    if (this.doneCount < this.pieces.length) this.praise(pick(['เงาวิ้ง!', 'สะท้อนแสงเลย!', 'ใหม่เอี่ยม!']), 'gold', 1.2)
    this.worker?.reactWith('cheer', 0.9)
  }

  protected draw(g: Surface) {
    if (this.bg) g.draw(this.bg, 0, 0)
    this.worker?.draw(g)
    const p = this.current
    if (!p) return
    // Spotlight on the piece being polished.
    glow(g, this.cx, this.baseY - p.oy * 0.5, 60, 0.16 + p.frac * 0.25, '#ffe7a0')
    // Slide the finished piece out to the right and the next one in from the left.
    const s = this.slide
    this.drawPiece(g, p, s > 0 ? s * s * (this.w * 0.9) : 0)
    const next = this.pieces[this.index + 1]
    if (s > 0 && next) this.drawPiece(g, next, -(1 - s) * (1 - s) * this.w * 0.9)
    // Queue of pieces still waiting.
    this.pieces.forEach((q, i) => {
      const x = this.w - 12 - (this.pieces.length - 1 - i) * 9
      const y = this.top + 8
      g.rect(x - 3, y - 3, 7, 7, '#3a2838')
      g.rect(x - 2, y - 2, 5, 5, q.done ? '#ffd54f' : i === this.index ? '#fff1d6' : '#7e683e')
    })
    if (this.rubbing && this.slide === 0) {
      drawRag(g, this.drag.x, this.drag.y, this.t, Math.min(1, this.drag.speed / 200))
      if (this.worker) drawFist(g, this.worker.look, this.drag.x + 2 + Math.sin(this.t * 30) * Math.min(1, this.drag.speed / 200), this.drag.y - 3)
    }
    vignette(g, this.w, this.h, 0.3)
    if (this.rubbing && this.drag.speed > 200 && Math.random() < 0.5) this.particles.add({ kind: 'dot', x: this.drag.x + rand(-8, 8), y: this.drag.y + rand(-2, 6), vy: rand(-6, 6), max: 0.25, color: '#fff3c8' })
  }

  private drawPiece(g: Surface, p: Piece, off: number) {
    const [ox, oy] = this.origin(p, off)
    shadow(g, this.cx + off, this.baseY + 1, p.mask.width / 2 - 2, 4, 0.6)
    g.draw(p.dull, ox, oy)
    const w = p.mask.width
    const h = p.mask.height
    if (!this.tmp || this.tmp.width !== w || this.tmp.height !== h) this.tmp = createCanvas(w, h)
    const tc = this.tmp.getContext('2d')!
    tc.globalCompositeOperation = 'source-over'
    tc.clearRect(0, 0, w, h)
    tc.drawImage(p.bright, 0, 0)
    tc.globalCompositeOperation = 'destination-in'
    tc.drawImage(p.mask, 0, 0)
    // A sweeping glint on the polished brass.
    const sweep = p.done ? (this.shine >= 0 ? this.shine / 1.1 : ((this.t * 0.35) % 1.6) - 0.3) : ((this.t * 0.5) % 2) - 0.5
    tc.globalCompositeOperation = 'source-atop'
    tc.fillStyle = 'rgba(255,255,240,0.75)'
    const bx = sweep * (w + h) - h
    for (let y = 0; y < h; y++) tc.fillRect(Math.round(bx + y * 0.6), y, 5, 1)
    tc.globalCompositeOperation = 'source-over'
    g.draw(this.tmp, ox, oy)
    if (p.done && Math.random() < 0.08) this.particles.add({ kind: 'sparkle', x: ox + rand(4, w - 4), y: oy + rand(4, h - 4), max: 0.5, color: '#ffffff' })
  }
}
