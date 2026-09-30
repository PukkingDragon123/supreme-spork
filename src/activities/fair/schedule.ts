// Shows at the temple fair that run on the wall clock, so every player (and
// every device) sees the same fireworks at the same moment without any
// network: a show every three minutes, on the minute. Pure functions.

export const FIREWORKS_EVERY = 180_000
export const FIREWORKS_LEN = 26_000
/** The MC announces the show this long before it starts. */
export const FIREWORKS_CALL = 12_000

export interface FireworksState {
  /** A show is in the sky right now. */
  live: boolean
  /** Index of the current (or next) show since the epoch. */
  show: number
  /** Seconds into the current show (live) … */
  t: number
  /** … or seconds until the next one starts. */
  next: number
}

export function fireworksAt(now: number): FireworksState {
  const show = Math.floor(now / FIREWORKS_EVERY)
  const k = now - show * FIREWORKS_EVERY
  if (k < FIREWORKS_LEN) return { live: true, show, t: k / 1000, next: 0 }
  return { live: false, show: show + 1, t: 0, next: (FIREWORKS_EVERY - k) / 1000 }
}

export type BurstKind = 'peony' | 'willow' | 'ring' | 'heart' | 'crackle'

export interface Burst {
  /** Seconds into the show. */
  t: number
  /** Horizontal position 0..1 and height 0..1 (0 = top of the sky). */
  x: number
  y: number
  kind: BurstKind
  color: string
  /** Size factor. */
  size: number
}

const COLORS = ['#ff6f91', '#ffd23f', '#6cf0c0', '#9fd0ff', '#c8a0ff', '#ffb35a', '#fffaf0']

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The bursts of one show (deterministic per show index): a slow start, a
 * busier middle with shaped shells, then a finale barrage in the last few
 * seconds. Sorted by time, all inside the show.
 */
export function showPlan(show: number, len = FIREWORKS_LEN / 1000): Burst[] {
  const r = rng(show * 7919 + 13)
  const out: Burst[] = []
  const finale = len - 5
  let t = 0.6
  while (t < finale) {
    const k = t / finale
    const kinds: BurstKind[] = k < 0.3 ? ['peony', 'willow'] : ['peony', 'willow', 'ring', 'heart', 'crackle']
    out.push({ t: +t.toFixed(2), x: 0.12 + r() * 0.76, y: 0.15 + r() * 0.5, kind: kinds[Math.floor(r() * kinds.length)], color: COLORS[Math.floor(r() * COLORS.length)], size: 0.8 + r() * 0.5 })
    t += 1.6 - k * 0.9 + r() * 0.5
  }
  for (let i = 0; i < 14; i++) {
    const ft = finale + (i / 14) * 4.2 + r() * 0.2
    out.push({ t: +ft.toFixed(2), x: 0.1 + r() * 0.8, y: 0.1 + r() * 0.45, kind: i === 13 ? 'heart' : i % 3 === 0 ? 'ring' : 'peony', color: COLORS[i % COLORS.length], size: i === 13 ? 1.5 : 1 + r() * 0.4 })
  }
  return out.sort((a, b) => a.t - b.t)
}

/** "อีก 1:24" style countdown text (Thai). */
export function fireworksLabel(st: FireworksState): string {
  if (st.live) return 'พลุกำลังขึ้นอยู่ตอนนี้!'
  const s = Math.max(0, Math.ceil(st.next))
  return `พลุรอบหน้าอีก ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
