// Smooth movement for real players. Presence updates arrive ~8-10 times a
// second with network jitter; each player gets a small buffer of timestamped
// positions (local receive clock) and is drawn a little in the past
// (`delay`), interpolating between the two samples around that time. A big
// jump (map door, respawn) snaps instead of sliding across the map, and a
// player whose updates stop keeps walking only briefly (extrapolation), then
// holds still.

import type { NetPlayer } from './net'

type Face = NetPlayer['face']

export interface InterpSample {
  /** Local receive time (ms). */
  t: number
  x: number
  y: number
  face: Face
  moving: boolean
}

export interface InterpPoint {
  x: number
  y: number
  face: Face
  moving: boolean
}

export interface InterpOptions {
  /** How far in the past to render (ms). */
  delay?: number
  /** Jumps longer than this (px) snap. */
  teleport?: number
  /** Keep moving past the newest sample for at most this long (ms). */
  extrapolate?: number
  /** Samples kept. */
  max?: number
}

export class InterpBuffer {
  private s: InterpSample[] = []
  readonly delay: number
  readonly teleport: number
  readonly extrapolate: number
  readonly max: number

  constructor(o: InterpOptions = {}) {
    this.delay = o.delay ?? 150
    this.teleport = o.teleport ?? 96
    this.extrapolate = o.extrapolate ?? 120
    this.max = o.max ?? 24
  }

  get size() {
    return this.s.length
  }

  latest(): InterpSample | null {
    return this.s[this.s.length - 1] ?? null
  }

  /** Add a sample. Out-of-order samples are dropped; unchanged ones only refresh the clock. */
  push(p: InterpSample) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.t)) return
    const last = this.latest()
    if (last) {
      if (p.t < last.t) return
      if (Math.hypot(p.x - last.x, p.y - last.y) > this.teleport) {
        // Door or respawn: start over at the new spot.
        this.s = [p]
        return
      }
      if (p.x === last.x && p.y === last.y && p.face === last.face && p.moving === last.moving) {
        // Keepalive: nothing moved. Holding still needs a fresh anchor so the
        // walk doesn't restart from an old timestamp.
        if (!last.moving && this.s.length > 1 && p.t - last.t > this.delay * 2) this.s = [last]
        return
      }
      // A player who stood still for a while starts walking now, not in the past.
      if (!last.moving && p.t - last.t > this.delay) this.s = [{ ...last, t: p.t - Math.min(this.delay, 100) }]
    }
    this.s.push(p)
    if (this.s.length > this.max) this.s.splice(0, this.s.length - this.max)
  }

  /** Where to draw the player at local time `now`. */
  sample(now: number): InterpPoint | null {
    const s = this.s
    if (!s.length) return null
    const rt = now - this.delay
    const first = s[0]
    if (s.length === 1 || rt <= first.t) return { x: first.x, y: first.y, face: first.face, moving: s.length > 1 && first.moving }
    const last = s[s.length - 1]
    if (rt >= last.t) {
      // Past the newest sample (a late update): glide on for a moment if they
      // were walking, then wait where the glide ended (no snapping back).
      const prev = s[s.length - 2]
      const dt = last.t - prev.t
      if (last.moving && dt > 0) {
        const late = rt - last.t
        const over = Math.min(late, this.extrapolate)
        const vx = (last.x - prev.x) / dt
        const vy = (last.y - prev.y) / dt
        return { x: last.x + vx * over, y: last.y + vy * over, face: last.face, moving: late < this.extrapolate }
      }
      return { x: last.x, y: last.y, face: last.face, moving: false }
    }
    // Drop samples we will never need again (keep the one just before rt).
    let i = 0
    while (i + 1 < s.length && s[i + 1].t <= rt) i++
    if (i > 0) {
      s.splice(0, i)
      i = 0
    }
    const a = s[0]
    const b = s[1]
    const k = b.t > a.t ? (rt - a.t) / (b.t - a.t) : 1
    const x = a.x + (b.x - a.x) * k
    const y = a.y + (b.y - a.y) * k
    const moved = Math.hypot(b.x - a.x, b.y - a.y) > 0.3
    return { x, y, face: moved ? faceOf(b.x - a.x, b.y - a.y, b.face) : b.face, moving: moved && (a.moving || b.moving) }
  }
}

/** Facing from a movement vector (the sender's facing breaks ties). */
export function faceOf(dx: number, dy: number, fallback: Face): Face {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

/** One buffer per player id, created on demand and dropped when they leave. */
export class InterpTable {
  private m = new Map<string, InterpBuffer>()
  constructor(private readonly opts: InterpOptions = {}) {}

  push(id: string, p: InterpSample) {
    let b = this.m.get(id)
    if (!b) this.m.set(id, (b = new InterpBuffer(this.opts)))
    b.push(p)
  }

  sample(id: string, now: number): InterpPoint | null {
    return this.m.get(id)?.sample(now) ?? null
  }

  has(id: string) {
    return this.m.has(id)
  }

  /** Forget everyone not in `ids`. */
  retain(ids: Iterable<string>) {
    const keep = new Set(ids)
    for (const id of [...this.m.keys()]) if (!keep.has(id)) this.m.delete(id)
  }

  clear() {
    this.m.clear()
  }
}
