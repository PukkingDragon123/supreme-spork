// A tiny shot/timeline director for the cinematic cutscenes.
//
// A cutscene is a list of shots played back to back. Each shot renders into
// its own buffer at a chosen pixel zoom (1 = full detail, 2 = chunky close-up)
// so pixels stay square and consistent within a shot. Shots can overlap with
// a transition (fade, Bayer dissolve, iris, wipe, flash). The director also
// drives captions, one-shot cues (sound, particle bursts), cinematic letterbox
// bars and a quick fade-out when the player skips.

import { bayer, createCanvas, Surface } from '../../engine/pixel'
import { clamp } from '../../engine/ease'

export type Ease = (t: number) => number

export const E = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t: number) => Math.sin((t * Math.PI) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  outElastic: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
} satisfies Record<string, Ease>

/** Progress of `t` through the window [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)))

/** Eased value between `from` and `to` while `t` moves through [a, b]. */
export function tw(t: number, a: number, b: number, from: number, to: number, e: Ease = E.inOutCubic): number {
  return from + (to - from) * e(seg(t, a, b))
}

/** Integer camera helper: eased, rounded. */
export function cam(t: number, a: number, b: number, from: number, to: number, e: Ease = E.inOutSine): number {
  return Math.round(tw(t, a, b, from, to, e))
}

/** 0→1→0 envelope: rises over [a, a+fade], holds, falls over [b-fade, b]. */
export function pulse(t: number, a: number, b: number, fade: number): number {
  return Math.min(seg(t, a, a + fade), 1 - seg(t, b - fade, b))
}

// ---------------------------------------------------------------------------
// Sound gating: seeking (dev tools, deterministic screenshots) runs updates
// silently so a burst of bells doesn't fire.

let muted = false
export function setCutsceneMuted(m: boolean) {
  muted = m
}
export function isCutsceneMuted() {
  return muted
}
/** Play a sound effect unless the director is seeking. */
export function play(fn: () => void) {
  if (muted) return
  try {
    fn()
  } catch {
    /* audio is optional */
  }
}

// ---------------------------------------------------------------------------

export interface CutsceneEvents {
  onCaption?(text: string | null): void
  onDone?(): void
}

export type TransitionKind = 'cut' | 'fade' | 'cross' | 'dissolve' | 'iris' | 'wipe' | 'flash'

export interface Transition {
  kind: TransitionKind
  dur: number
  /** Colour for 'fade' / 'flash'. */
  color?: string
}

export interface Shot {
  /** Seconds until the next shot starts (its transition overlaps this one). */
  dur: number
  /** Pixel zoom of this shot's buffer. */
  zoom?: number
  /** Transition from the previous shot into this one. */
  in?: Transition
  /** (Re)build static layers for a buffer of this size. */
  bake?(w: number, h: number): void
  /** Called once when the shot starts (not on the initial seek). */
  enter?(): void
  update?(dt: number, local: number): void
  /** Draw the shot; `local` is seconds since the shot started (may exceed dur). */
  render(g: Surface, local: number): void
}

export interface Caption {
  at: number
  until: number
  text: string
}

export interface Cue {
  at: number
  fn: () => void
}

export interface DirectorOptions {
  captions?: Caption[]
  cues?: Cue[]
  /** When onDone fires (defaults to the end of the last shot). */
  doneAt?: number
  /** Letterbox amount 0..1 as a function of time. */
  letterbox?: (t: number) => number
  /** Colour used for the skip fade and letterbox bars. */
  outro?: string
  bars?: string
}

const LEVELS = 17

/** 4×4 Bayer masks, one per dissolve level (level k shows k/16 of pixels). */
function bayerMasks(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = []
  for (let k = 0; k < LEVELS; k++) {
    const c = createCanvas(4, 4)
    const x = c.getContext('2d')!
    x.fillStyle = '#000'
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (bayer(i, j) < k) x.fillRect(i, j, 1, 1)
    out.push(c)
  }
  return out
}

export class Director {
  t = 0
  readonly starts: number[] = []
  private bufs: Surface[] = []
  private entered: boolean[] = []
  private tmp: Surface | null = null
  private patterns: (CanvasPattern | null)[] = []
  private W = 0
  private H = 0
  private caption: string | null = null
  private fired: boolean[] = []
  private finished = false
  private skipAt = -1
  readonly total: number
  readonly doneAt: number

  constructor(
    readonly shots: Shot[],
    private ev: CutsceneEvents,
    private opts: DirectorOptions = {},
  ) {
    let s = 0
    for (const shot of shots) {
      this.starts.push(s)
      s += shot.dur
      this.bufs.push(new Surface(16, 16))
      this.entered.push(false)
    }
    this.total = s
    this.doneAt = opts.doneAt ?? s
    this.fired = (opts.cues ?? []).map(() => false)
  }

  get done() {
    return this.finished
  }
  get width() {
    return this.W
  }
  get height() {
    return this.H
  }

  resize(w: number, h: number) {
    if (w === this.W && h === this.H) return
    this.W = w
    this.H = h
    this.shots.forEach((shot, i) => {
      const z = shot.zoom ?? 1
      const bw = Math.ceil(w / z)
      const bh = Math.ceil(h / z)
      this.bufs[i].resize(bw, bh)
      shot.bake?.(bw, bh)
    })
    if (!this.tmp) {
      this.tmp = new Surface(w, h)
      const masks = bayerMasks()
      this.patterns = masks.map((m) => this.tmp!.ctx.createPattern(m, 'repeat'))
    } else this.tmp.resize(w, h)
  }

  /** Index of the shot playing at time t. */
  indexAt(t: number): number {
    let i = 0
    while (i + 1 < this.shots.length && t >= this.starts[i + 1]) i++
    return i
  }

  update(dt: number) {
    if (this.finished) {
      // Keep the final shot alive (idle animation) after we're done.
      const i = this.shots.length - 1
      this.t += dt
      this.shots[i].update?.(dt, this.t - this.starts[i])
      return
    }
    this.t += dt
    const t = this.t
    const cues = this.opts.cues ?? []
    for (let k = 0; k < cues.length; k++) {
      if (!this.fired[k] && t >= cues[k].at) {
        this.fired[k] = true
        cues[k].fn()
      }
    }
    const i = this.indexAt(t)
    for (let k = 0; k <= i; k++) {
      if (!this.entered[k]) {
        this.entered[k] = true
        if (!muted) this.shots[k].enter?.()
      }
    }
    // Update the current shot and, while its transition runs, the previous one.
    this.shots[i].update?.(dt, t - this.starts[i])
    const tr = this.shots[i].in
    if (i > 0 && tr && t - this.starts[i] < tr.dur) this.shots[i - 1].update?.(dt, t - this.starts[i - 1])

    // Captions.
    let text: string | null = null
    if (this.skipAt < 0) for (const c of this.opts.captions ?? []) if (t >= c.at && t < c.until) text = c.text
    if (text !== this.caption) {
      this.caption = text
      this.ev.onCaption?.(text)
    }

    if (this.skipAt >= 0) {
      if (t - this.skipAt >= 0.4) this.finish()
    } else if (t >= this.doneAt) this.finish()
  }

  private finish() {
    if (this.finished) return
    this.finished = true
    if (this.caption !== null) {
      this.caption = null
      this.ev.onCaption?.(null)
    }
    this.ev.onDone?.()
  }

  skip() {
    if (this.finished || this.skipAt >= 0) return
    this.skipAt = this.t
    if (this.caption !== null) {
      this.caption = null
      this.ev.onCaption?.(null)
    }
  }

  /** Jump to time `t` by simulating silently (deterministic enough for screenshots). */
  seek(t: number, step = 1 / 60) {
    setCutsceneMuted(true)
    try {
      while (this.t + 1e-6 < t) this.update(Math.min(step, t - this.t))
    } finally {
      setCutsceneMuted(false)
    }
  }

  private drawShot(i: number, g: Surface) {
    const buf = this.bufs[i]
    const z = this.shots[i].zoom ?? 1
    buf.reset()
    buf.setCamera(0, 0)
    buf.clear()
    this.shots[i].render(buf, this.t - this.starts[i])
    buf.reset()
    buf.setCamera(0, 0)
    if (z === 1) g.ctx.drawImage(buf.canvas, 0, 0)
    else g.ctx.drawImage(buf.canvas, 0, 0, buf.w * z, buf.h * z)
  }

  render(g: Surface) {
    const W = this.W
    const H = this.H
    const t = this.finished ? Math.max(this.t, this.doneAt) : this.t
    const i = this.finished && this.skipAt < 0 ? this.shots.length - 1 : this.indexAt(t)
    const shot = this.shots[i]
    const tr = shot.in
    const local = t - this.starts[i]
    g.reset()
    g.setCamera(0, 0)
    if (i > 0 && tr && tr.kind !== 'cut' && local < tr.dur) {
      const p = clamp(local / tr.dur)
      this.composite(g, i - 1, i, tr, p)
    } else {
      this.drawShot(i, g)
    }

    // Letterbox bars.
    const lb = this.opts.letterbox ? clamp(this.opts.letterbox(t)) : 0
    if (lb > 0) {
      const max = Math.round(clamp(H * 0.06, 8, 26))
      const bh = Math.round(max * E.inOutSine(lb))
      if (bh > 0) {
        g.rect(0, 0, W, bh, this.opts.bars ?? '#120c1c')
        g.rect(0, H - bh, W, bh, this.opts.bars ?? '#120c1c')
      }
    }

    if (this.skipAt >= 0) {
      const p = clamp((this.t - this.skipAt) / 0.4)
      g.alpha(E.outQuad(p))
      g.rect(0, 0, W, H, this.opts.outro ?? '#2b2340')
      g.reset()
    }
  }

  private composite(g: Surface, a: number, b: number, tr: Transition, p: number) {
    const W = this.W
    const H = this.H
    switch (tr.kind) {
      case 'fade':
      case 'flash': {
        const color = tr.color ?? (tr.kind === 'flash' ? '#fffaf0' : '#120c1c')
        // Flash rises quickly and fades slowly; fade is symmetric.
        const mid = tr.kind === 'flash' ? 0.25 : 0.5
        if (p < mid) {
          this.drawShot(a, g)
          g.alpha(stepAlpha(p / mid))
        } else {
          this.drawShot(b, g)
          g.alpha(stepAlpha(1 - (p - mid) / (1 - mid)))
        }
        g.rect(0, 0, W, H, color)
        g.reset()
        return
      }
      case 'cross': {
        this.drawShot(a, g)
        const tmp = this.tmp!
        tmp.clear()
        this.drawShot(b, tmp)
        g.alpha(p)
        g.ctx.drawImage(tmp.canvas, 0, 0)
        g.reset()
        return
      }
      case 'dissolve': {
        this.drawShot(a, g)
        const tmp = this.tmp!
        tmp.reset()
        tmp.clear()
        this.drawShot(b, tmp)
        const level = Math.round(E.inOutSine(p) * (LEVELS - 1))
        if (level <= 0) return
        if (level < LEVELS - 1) {
          tmp.ctx.globalCompositeOperation = 'destination-in'
          tmp.ctx.fillStyle = this.patterns[level] ?? '#000'
          tmp.ctx.fillRect(0, 0, W, H)
          tmp.ctx.globalCompositeOperation = 'source-over'
        }
        g.ctx.drawImage(tmp.canvas, 0, 0)
        return
      }
      case 'iris': {
        this.drawShot(a, g)
        const tmp = this.tmp!
        tmp.reset()
        tmp.clear()
        this.drawShot(b, tmp)
        const cx = W / 2
        const cy = H / 2
        const r = E.inOutCubic(p) * Math.hypot(W, H) * 0.52
        g.ctx.save()
        g.ctx.beginPath()
        for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(H, Math.ceil(cy + r)); y++) {
          const dy = (y + 0.5 - cy) / r
          if (Math.abs(dy) >= 1) continue
          const half = Math.round(r * Math.sqrt(1 - dy * dy))
          g.ctx.rect(Math.round(cx - half), y, half * 2, 1)
        }
        g.ctx.clip()
        g.ctx.drawImage(tmp.canvas, 0, 0)
        g.ctx.restore()
        // Gold rim on the iris edge.
        drawIrisRim(g, cx, cy, r)
        return
      }
      case 'wipe': {
        // Diagonal staircase wipe rising from the bottom-left.
        this.drawShot(a, g)
        const tmp = this.tmp!
        tmp.reset()
        tmp.clear()
        this.drawShot(b, tmp)
        const span = H + W * 0.6
        const edge = H + W * 0.6 - E.inOutCubic(p) * (span + 8)
        g.ctx.save()
        g.ctx.beginPath()
        for (let y = 0; y < H; y += 2) {
          const x0 = Math.round(((edge - y) / 0.6) / 2) * 2
          if (x0 < W) g.ctx.rect(Math.max(0, x0), y, W - Math.max(0, x0), 2)
        }
        g.ctx.clip()
        g.ctx.drawImage(tmp.canvas, 0, 0)
        g.ctx.restore()
        return
      }
      default:
        this.drawShot(b, g)
    }
  }
}

/** Quantise fades into 8 steps for a retro feel. */
function stepAlpha(a: number): number {
  return Math.round(clamp(a) * 8) / 8
}

function drawIrisRim(g: Surface, cx: number, cy: number, r: number) {
  if (r < 2) return
  const n = Math.max(12, Math.round(r * 6))
  g.ctx.fillStyle = '#ffe27a'
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    g.ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1)
  }
}
