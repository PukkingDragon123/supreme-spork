// UI state for online play: which online window is open, the live trade,
// chat bubbles / emotes over heads (read every frame by the overlay), and a
// coarse summary of the connection for the HUD pill.

import { signal } from '@preact/signals'
import type { Pose } from '../../art/avatar'
import type { Emote } from '../../services/netValidate'
import { idleTrade, type TradeState } from '../../services/netTrade'

export const onlinePanelOpen = signal(false)
/** Player card for a real player (peer id). */
export const cardPeer = signal<string | null>(null)
export const chatOpen = signal(false)
/** Gift picker for a real player (peer id). */
export const giftFor = signal<string | null>(null)
export const trade = signal<TradeState>(idleTrade())
/** The trade window is showing (an incoming request pops it open). */
export const tradeOpen = signal(false)

export interface NetSummary {
  kind: 'room' | 'realtime' | 'offline'
  status: 'offline' | 'connecting' | 'online' | 'error'
  /** Real players online anywhere (not you). */
  count: number
  /** Real players on your map. */
  here: number
  /** Topics the host refused for this viewer. */
  denied: string[]
  /** Bumped on every presence change (cheap re-render key for open lists). */
  rev: number
}

export const netSummary = signal<NetSummary>({ kind: 'offline', status: 'offline', count: 0, here: 0, denied: [], rev: 0 })

export interface ChatLine {
  id: number
  /** Peer id, or 'me'. */
  from: string
  name: string
  text: string
  at: number
  /** Emote lines are drawn as icons. */
  emote?: Emote
}

export const chatLog = signal<ChatLine[]>([])
/** Peers whose chat you hid this session. */
export const muted = signal<ReadonlySet<string>>(new Set())

/** Over-head speech (key: peer id or 'me'). Read every frame, so not a signal. */
export const bubbles = new Map<string, { text: string; at: number; until: number }>()
/** Over-head emotes (key: peer id or 'me'). */
export const emotes = new Map<string, { e: Emote; at: number; until: number }>()

export const EMOTE_MS = 2600
export const BUBBLE_MS = 5000

/** Avatar pose for an emote at time `now` (null = walk/stand as usual). */
export function emotePose(key: string, now: number): Pose | null {
  const em = emotes.get(key)
  if (!em || now > em.until) return null
  const t = now - em.at
  switch (em.e) {
    case 'wai':
    case 'sathu':
      return 'wai'
    case 'heart':
      return 'happy'
    case 'laugh':
      return Math.floor(t / 220) % 2 ? 'happy' : 'stand'
    case 'dance':
      return (['happy', 'walk1', 'happy', 'walk2'] as Pose[])[Math.floor(t / 180) % 4]
  }
}

export const EMOTE_INFO: Record<Emote, { label: string; icon: string; say: string }> = {
  wai: { label: 'ไหว้', icon: 'wai', say: 'สวัสดี 🙏' },
  heart: { label: 'หัวใจ', icon: 'heart', say: '💕' },
  sathu: { label: 'สาธุ', icon: 'lotus', say: 'สาธุ~ 🙏' },
  laugh: { label: 'ขำ', icon: 'laugh', say: '555+' },
  dance: { label: 'เต้น', icon: 'dance', say: '♪ ♫' },
}

let lineSeq = 1
export function pushChat(line: Omit<ChatLine, 'id'>) {
  chatLog.value = [...chatLog.value.slice(-39), { ...line, id: lineSeq++ }]
}
