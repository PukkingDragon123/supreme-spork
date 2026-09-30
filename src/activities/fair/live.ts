// Real online play at the temple fair, on top of the shared `net` contract
// (src/services/net.ts – an offline no-op until the online transport is
// installed, so everything here must work with nobody around):
//  - topic 'fair': finished booth rounds → a live scoreboard of other real
//    players' scores (board, result card, booth hawkers shout them out);
//  - topic 'dance': ramwong steps → real players on the dance floor dance
//    in sync with you.
// Everything received is untrusted: sanitised, clamped, shown as text only.

import { signal } from '@preact/signals'
import { net, type NetApi, type NetMessage } from '../../services/net'

export const FAIR_MAP = 'fair_temple'
const GAMES = ['darts', 'rings', 'cork', 'scoop', 'bumper', 'ramwong'] as const
export type LiveGame = (typeof GAMES)[number]

export interface FairScore {
  game: LiveGame
  score: number
  stars: number
}

export interface LiveScore extends FairScore {
  from: string
  name: string
  at: number
}

export interface DanceStep {
  /** Beat index in the song (keeps remote dancers in phase). */
  beat: number
  side: 'L' | 'R'
  grade: 'perfect' | 'good' | 'miss'
}

const clampInt = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null)

/** Validate a received 'fair' payload (null if it is junk). */
export function sanitizeScore(raw: unknown): FairScore | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.game !== 'string' || !(GAMES as readonly string[]).includes(r.game)) return null
  const score = clampInt(r.score, 0, 999)
  const stars = clampInt(r.stars, 0, 3)
  if (score === null || stars === null) return null
  return { game: r.game as LiveGame, score, stars }
}

/** Validate a received 'dance' payload. */
export function sanitizeStep(raw: unknown): DanceStep | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const beat = clampInt(r.beat, 0, 9999)
  if (beat === null || (r.side !== 'L' && r.side !== 'R')) return null
  const grade = r.grade === 'perfect' || r.grade === 'good' || r.grade === 'miss' ? r.grade : 'good'
  return { beat, side: r.side, grade }
}

/** Display name for a peer: plain text, trimmed and clamped. */
export function safeName(name: unknown): string {
  const s = typeof name === 'string' ? name.replace(/[\u0000-\u001f<>]/g, '').trim() : ''
  return (s || 'ผู้เล่น').slice(0, 16)
}

/** Keep the best recent score per player and game, newest first, capped. */
export function mergeScore(list: LiveScore[], s: LiveScore, cap = 12, maxAge = 15 * 60_000): LiveScore[] {
  const fresh = list.filter((x) => s.at - x.at < maxAge)
  const prev = fresh.find((x) => x.from === s.from && x.game === s.game)
  const rest = fresh.filter((x) => x !== prev)
  const best = prev && prev.score > s.score ? prev : s
  return [best, ...rest].sort((a, b) => b.at - a.at).slice(0, cap)
}

/** Live scoreboard of other real players (newest first). */
export const liveScores = signal<LiveScore[]>([])

type DanceFn = (from: string, step: DanceStep) => void
type ScoreFn = (s: LiveScore) => void
const danceFns = new Set<DanceFn>()
const scoreFns = new Set<ScoreFn>()
let wired: NetApi | null = null
let unsub: (() => void)[] = []

/** (Re)subscribe to the fair topics on the current transport (idempotent). */
export function ensureFairNet() {
  if (wired === net) return
  for (const u of unsub) u()
  wired = net
  unsub = [
    net.on('fair', (m: NetMessage<unknown>) => {
      if (m.me) return
      const s = sanitizeScore(m.data)
      if (!s) return
      const who = net.everyone().find((p) => p.id === m.from)
      const entry: LiveScore = { ...s, from: String(m.from).slice(0, 64), name: safeName(who?.name), at: Date.now() }
      liveScores.value = mergeScore(liveScores.value, entry)
      for (const f of scoreFns) f(entry)
    }),
    net.on('dance', (m: NetMessage<unknown>) => {
      if (m.me) return
      const st = sanitizeStep(m.data)
      if (!st) return
      for (const f of danceFns) f(String(m.from).slice(0, 64), st)
    }),
  ]
}

/** Tell the other players about a finished booth round. */
export function sendFairScore(s: FairScore) {
  ensureFairNet()
  net.send('fair', { game: s.game, score: Math.round(s.score), stars: s.stars })
}

export function sendDanceStep(step: DanceStep) {
  ensureFairNet()
  net.send('dance', step)
}

export function onDanceStep(fn: DanceFn): () => void {
  ensureFairNet()
  danceFns.add(fn)
  return () => danceFns.delete(fn)
}

export function onFairScore(fn: ScoreFn): () => void {
  ensureFairNet()
  scoreFns.add(fn)
  return () => scoreFns.delete(fn)
}

/** What you're doing, shown under your name to other real players. */
export function setDoing(doing: string | null) {
  net.setMe({ doing })
}

/** Real players on the fair map right now (excluding you). */
export function fairPlayers() {
  return net.players(FAIR_MAP)
}

export function isOnline() {
  return net.online()
}
