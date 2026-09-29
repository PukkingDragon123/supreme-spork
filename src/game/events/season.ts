// Rolling season windows. A season is `lengthDays` long and they follow each
// other back to back from a fixed epoch, so an event is always live (handy
// for the demo) while still having a real end date and countdown.

const DAY = 86_400_000

export interface SeasonWindow {
  /** 0-based season number since the epoch. */
  index: number
  /** Stable save key, e.g. "flood#12". */
  key: string
  start: Date
  end: Date
  msLeft: number
  /** 0..1 elapsed share of the season. */
  progress: number
}

/** Local midnight of a YYYY-MM-DD string. */
export function localMidnight(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function seasonAt(eventId: string, season: { lengthDays: number; epoch: string }, now: Date = new Date()): SeasonWindow {
  const len = Math.max(1, Math.round(season.lengthDays))
  const epoch = localMidnight(season.epoch)
  // Count whole local days (rounded, so a DST hour never shifts the day).
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - epoch.getTime()) / DAY)
  const index = Math.floor(days / len)
  const start = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate() + index * len)
  const end = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate() + (index + 1) * len)
  const msLeft = Math.max(0, end.getTime() - now.getTime())
  const total = end.getTime() - start.getTime()
  return { index, key: `${eventId}#${index}`, start, end, msLeft, progress: total > 0 ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total)) : 0 }
}

/** Short Thai countdown: "12 วัน 4 ชม.", "4 ชม. 12 นาที" or "12:04". */
export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d >= 1) return h ? `${d} วัน ${h} ชม.` : `${d} วัน`
  if (h >= 1) return `${h} ชม. ${m} นาที`
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** Tiny HUD timer: "5ว", "7ชม", "12น". */
export function fmtCountdownTiny(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s >= 86400) return `${Math.floor(s / 86400)}วัน`
  if (s >= 3600) return `${Math.floor(s / 3600)}ชม.`
  return `${Math.max(1, Math.floor(s / 60))}นาที`
}

/** Milliseconds until the next local midnight (daily missions reset). */
export function msToMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

/** Clock-style "05:12:33". */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
