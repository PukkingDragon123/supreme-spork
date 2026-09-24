// A tiny notification bus between game logic and the UI layer.

import { signal } from '@preact/signals'

export type Notice =
  | { kind: 'toast'; text: string; icon?: string; tone?: 'good' | 'info' | 'warn' }
  | { kind: 'levelup'; level: number; coins: number; unlocks: string[] }
  | { kind: 'achievement'; id: string; name: string; coins: number }
  | { kind: 'reward'; title: string; merit: number; coins: number; items?: Record<string, number>; note?: string }

export interface QueuedNotice {
  id: number
  notice: Notice
}

let seq = 1
export const notices = signal<QueuedNotice[]>([])

export function notify(n: Notice) {
  notices.value = [...notices.value, { id: seq++, notice: n }]
}

export function dismiss(id: number) {
  notices.value = notices.value.filter((q) => q.id !== id)
}

export function toast(text: string, icon?: string, tone: 'good' | 'info' | 'warn' = 'good') {
  notify({ kind: 'toast', text, icon, tone })
}
