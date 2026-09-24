// Real-world time helpers: day keys, week keys and time-of-day phases.

export type Phase = 'dawn' | 'day' | 'golden' | 'dusk' | 'night'

export function dayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday-based ISO-ish week key, e.g. "2026-W39". */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Fraction of the current week that has elapsed (Mon 00:00 → 0). */
export function weekProgress(d = new Date()): number {
  const day = (d.getDay() + 6) % 7
  return (day * 24 + d.getHours() + d.getMinutes() / 60) / (7 * 24)
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

export function hourOf(d = new Date()): number {
  return d.getHours() + d.getMinutes() / 60
}

export function phaseAt(hour: number): Phase {
  if (hour >= 5 && hour < 7) return 'dawn'
  if (hour >= 7 && hour < 16) return 'day'
  if (hour >= 16 && hour < 18.25) return 'golden'
  if (hour >= 18.25 && hour < 19.5) return 'dusk'
  return 'night'
}

/** Morning alms round window – merit bonus for giving alms in the morning. */
export function isAlmsMorning(hour: number): boolean {
  return hour >= 5 && hour < 9
}

export const WEEKDAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export function thaiDate(d = new Date()): string {
  return `วัน${WEEKDAY_TH[d.getDay()]}ที่ ${d.getDate()} ${MONTH_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

export function greeting(hour: number): string {
  if (hour >= 4 && hour < 11) return 'อรุณสวัสดิ์'
  if (hour >= 11 && hour < 16) return 'สวัสดียามบ่าย'
  if (hour >= 16 && hour < 19) return 'สวัสดียามเย็น'
  return 'ราตรีสวัสดิ์'
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} ชม. ${m} นาที`
  if (m > 0) return `${m} นาที`
  return `${s} วินาที`
}
