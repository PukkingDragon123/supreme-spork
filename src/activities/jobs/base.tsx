// Shared scene base for the temple volunteer jobs: round timer, progress and
// star scoring, safe-area layout (below the top bar, above the HUD), speech
// bubbles, screen shake and a short "well done" beat before the result.

import type { PointerInfo, Scene } from '../../engine/stage'
import type { Surface } from '../../engine/pixel'
import { Particles } from '../../engine/particles'
import { rand } from '../../engine/rng'
import type { GameEvent } from '../../game/data/quests'
import { starsFor, type JobStars } from '../../game/jobs'
import type { Worker } from './worker'
import { wsfx } from './workSfx'

export interface JobSummary {
  /** Result card title. */
  title?: string
  /** Extra result lines (stats of the round). */
  lines: string[]
  /** Quest events to track once the round is over. */
  events?: Partial<Record<GameEvent, number>>
}

export type BubbleTone = 'info' | 'good' | 'warn'

export interface Bubble {
  id: number
  x: number
  y: number
  text: string
  t: number
  tone: BubbleTone
}

export type JobPhase = 'ready' | 'play' | 'done'

export type PraiseTone = 'gold' | 'pink' | 'blue' | 'green'

/** Big praise pop-up ("สะอาดเอี่ยม!") shown by the DOM layer. */
export interface Praise {
  id: number
  text: string
  tone: PraiseTone
  t: number
}

const STREAK_WORDS: Record<number, string> = { 3: 'ดีมาก!', 5: 'เยี่ยมไปเลย!', 8: 'สุดยอด!', 12: 'เทพมาก!', 16: 'ตำนานจิตอาสา!' }

export abstract class JobScene implements Scene {
  w = 190
  h = 400
  t = 0
  particles = new Particles()
  phase: JobPhase = 'ready'
  paused = false
  elapsed = 0
  /** Round length in seconds. */
  duration = 40
  /** Where the three stars sit on the progress bar (0..1). */
  thresholds: [number, number, number] = [1 / 3, 2 / 3, 1]
  /** First free row below the top bar and last free row above the HUD. */
  top = 28
  bottom = 340
  bubbles: Bubble[] = []
  praises: Praise[] = []
  /** Current quick-success streak and the best of the round. */
  combo = 0
  bestCombo = 0
  /** The player's avatar doing the job (set by scenes that show it). */
  worker: Worker | null = null
  onDone?: (stars: JobStars, summary: JobSummary) => void
  protected shakeT = 0
  protected shakeMag = 1
  protected flashT = 0
  private doneT = -1
  private bubbleSeq = 0
  private praiseSeq = 0
  private comboT = 0
  private safeSet = false

  /** 0..1 completion shown on the progress bar. */
  abstract progress(): number
  /** Short live goal text for the HUD, e.g. "ใบไม้ลงเข่ง 12/30". */
  abstract goalText(): string
  /** Compute geometry (and bake backgrounds) for the current size. */
  protected abstract anchor(): void
  /** Place the round's objects (called again while the round has not started). */
  protected abstract populate(): void
  protected abstract tick(dt: number): void
  protected abstract draw(g: Surface): void
  protected input(_e: PointerInfo): void {}
  /** Called once when the round ends (time up or complete). */
  protected ended(): void {}

  complete(): boolean {
    return this.progress() >= 1
  }
  stars(): JobStars {
    return starsFor(this.progress(), this.thresholds)
  }
  summary(): JobSummary {
    return { lines: [] }
  }
  /** Praise shown when the job is fully done (e.g. "สะอาดเอี่ยม!"). */
  cheerText(): string {
    return 'เยี่ยมมาก!'
  }

  get playing() {
    return this.phase === 'play' && !this.paused
  }
  get timeLeft() {
    return Math.max(0, this.duration - this.elapsed)
  }
  get playH() {
    return this.bottom - this.top
  }
  get cx() {
    return Math.round(this.w / 2)
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    if (!this.safeSet) {
      this.top = Math.round(h * 0.07)
      this.bottom = Math.round(h * 0.84)
    }
    this.bottom = Math.min(this.bottom, h)
    this.relayout()
  }

  /** Free play area in virtual pixels (from the DOM chrome). */
  setSafe(top: number, bottom: number) {
    top = Math.max(0, Math.round(top))
    bottom = Math.min(this.h, Math.round(bottom))
    if (bottom - top < 120) return
    if (this.safeSet && top === this.top && bottom === this.bottom) return
    this.safeSet = true
    this.top = top
    this.bottom = bottom
    this.relayout()
  }

  private relayout() {
    this.anchor()
    if (this.phase === 'ready') {
      this.bubbles = []
      this.populate()
    }
  }

  start() {
    if (this.phase === 'ready') this.phase = 'play'
  }

  /** End the round now (used by the dev page and by scenes). */
  finish() {
    if (this.phase === 'done') return
    this.phase = 'done'
    this.ended()
    const st = this.stars()
    this.worker?.reactWith(st >= 2 ? 'thumbs' : st >= 1 ? 'cheer' : 'phew', 5)
    if (this.complete()) this.praise(this.cheerText(), 'gold')
    this.doneT = this.complete() ? 1.3 : 0.8
  }

  update(dt: number) {
    if (this.paused) return
    this.t += dt
    if (this.phase === 'play') {
      this.elapsed += dt
      this.tick(dt)
      if (this.phase === 'play' && (this.complete() || this.elapsed >= this.duration)) this.finish()
    } else this.tick(dt)
    if (this.doneT > 0) {
      this.doneT -= dt
      if (this.doneT <= 0) this.onDone?.(this.stars(), this.summary())
    }
    this.worker?.update(dt, this.particles)
    this.shakeT = Math.max(0, this.shakeT - dt)
    this.flashT = Math.max(0, this.flashT - dt)
    for (const b of this.bubbles) b.t -= dt
    this.bubbles = this.bubbles.filter((b) => b.t > 0)
    for (const p of this.praises) p.t -= dt
    this.praises = this.praises.filter((p) => p.t > 0)
    if (this.comboT > 0) {
      this.comboT -= dt
      if (this.comboT <= 0) this.combo = 0
    }
    this.particles.update(dt)
  }

  render(g: Surface) {
    if (this.shakeT > 0) g.setCamera(Math.round(rand(-1, 1) * this.shakeMag), Math.round(rand(-1, 1) * this.shakeMag))
    this.draw(g)
    this.particles.render(g)
    g.setCamera(0, 0)
    if (this.flashT > 0) {
      g.alpha(Math.min(0.6, this.flashT * 1.5))
      g.rect(0, 0, this.w, this.h, '#fff8e0')
      g.alpha(1)
    }
  }

  pointer(e: PointerInfo) {
    if ((e.type === 'down' || e.type === 'move') && !this.playing) return
    this.input(e)
  }

  /** Speech/status bubble shown by the DOM layer at a scene position. */
  say(x: number, y: number, text: string, tone: BubbleTone = 'info', life = 1.4) {
    // Only one bubble per text at a time.
    this.bubbles = this.bubbles.filter((b) => b.text !== text)
    this.bubbles.push({ id: ++this.bubbleSeq, x: Math.max(24, Math.min(this.w - 24, x)), y: Math.max(this.top + 12, y), text, t: life, tone })
  }

  /** Big praise pop-up in the middle of the screen. */
  praise(text: string, tone: PraiseTone = 'gold', life = 1.3) {
    this.praises = [...this.praises.filter((p) => p.text !== text).slice(-1), { id: ++this.praiseSeq, text, tone, t: life }]
    wsfx.praise()
  }

  /**
   * Count a quick success toward a streak: "x2", "x3"… above (x, y), a rising
   * ping, and a praise word at 3, 5, 8, 12 and 16. Returns the streak.
   */
  streak(x: number, y: number, window = 1.8): number {
    this.combo = this.comboT > 0 ? this.combo + 1 : 1
    this.comboT = window
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    if (this.combo >= 2) {
      this.particles.popText(x, y - 8, `x${this.combo}`, this.combo >= 5 ? '#ff9fc0' : '#ffd54f')
      wsfx.combo(this.combo)
    }
    const word = STREAK_WORDS[this.combo]
    if (word) this.praise(word, this.combo >= 8 ? 'pink' : 'gold', 1.1)
    return this.combo
  }

  breakStreak() {
    this.combo = 0
    this.comboT = 0
  }

  shake(t = 0.2, mag = 1) {
    this.shakeT = Math.max(this.shakeT, t)
    this.shakeMag = mag
  }

  flash(t = 0.35) {
    this.flashT = t
  }
}

/** Minimal drag tracker: the active pointer id, position and velocity. */
export class Drag {
  id = -1
  x = 0
  y = 0
  px = 0
  py = 0
  vx = 0
  vy = 0
  private lastT = 0
  get down() {
    return this.id !== -1
  }
  begin(e: PointerInfo) {
    this.id = e.id
    this.x = this.px = e.x
    this.y = this.py = e.y
    this.vx = this.vy = 0
    this.lastT = performance.now()
  }
  move(e: PointerInfo) {
    if (e.id !== this.id) return false
    const now = performance.now()
    const dt = Math.max(0.004, Math.min(0.1, (now - this.lastT) / 1000))
    this.lastT = now
    this.px = this.x
    this.py = this.y
    this.x = e.x
    this.y = e.y
    const k = Math.min(1, dt * 18)
    this.vx += ((e.x - this.px) / dt - this.vx) * k
    this.vy += ((e.y - this.py) / dt - this.vy) * k
    return true
  }
  end(e?: PointerInfo) {
    if (e && e.id !== this.id) return false
    this.id = -1
    return true
  }
  /** Let the velocity decay while the finger rests. */
  settle(dt: number) {
    const k = Math.exp(-dt * 10)
    this.vx *= k
    this.vy *= k
  }
  get speed() {
    return Math.hypot(this.vx, this.vy)
  }
}

export const fmtTime = (s: number) => {
  const n = Math.ceil(s)
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}
