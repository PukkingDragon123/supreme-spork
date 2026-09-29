// Live events: season rollover, tickets, daily missions (fed by onTrack),
// run results → points, and the battle pass claims and premium purchase.
// Everything is stored under GameState.liveEvents (see ./events/save.ts).
// Event agnostic: the event definitions live in ./events/*.

import { game, mutate, type GameState } from './state'
import { addCoins, addMerit, onTrack, spendCoins, unlockedAreas } from './actions'
import { levelFromMerit } from './economy'
import { dayKey } from './time'
import { toast } from './events'
import type { GameEvent } from './data/quests'
import { LIVE_EVENTS, LIVE_EVENT_BY_ID } from './events/registry'
import { seasonAt, type SeasonWindow } from './events/season'
import { emptyProgress, type EventProgress } from './events/save'
import { applyTrack, missionReady, rollMissions } from './events/missions'
import { claimable, tierDef, tierForPoints, tierState, type PassRow } from './battlepass'
import { grantReward, rewardLabel, type GrantResult } from './events/rewards'
import type { EventReward, LiveEventDef } from './events/types'
import { payments } from '../services/payments'

/** Tickets given when a player's first progress of a season is created. */
export const WELCOME_TICKETS = 2

export function eventDef(id: string): LiveEventDef | undefined {
  return LIVE_EVENT_BY_ID[id]
}

export function eventSeason(id: string, now: Date = new Date()): SeasonWindow {
  const def = LIVE_EVENT_BY_ID[id]
  return seasonAt(id, def?.season ?? { lengthDays: 7, epoch: '2026-01-05' }, now)
}

export function playerLevel(s: GameState = game.value): number {
  return levelFromMerit(s.merit).level
}

export function isEventUnlocked(id: string, s: GameState = game.value): boolean {
  const def = LIVE_EVENT_BY_ID[id]
  return !!def && playerLevel(s) >= def.level
}

/**
 * Bring saved progress up to date for `now` (pure: returns a new object).
 * A new season starts from zero (with welcome tickets); a new day rolls
 * fresh missions.
 */
export function refreshProgress(saved: EventProgress | undefined, def: LiveEventDef, now: Date, seed: string, level: number, areas: string[]): EventProgress {
  const season = seasonAt(def.id, def.season, now)
  let p: EventProgress
  if (!saved || saved.season !== season.key) {
    p = emptyProgress(season.key)
    p.tickets = WELCOME_TICKETS
  } else p = structuredClone(saved)
  const day = dayKey(now)
  if (p.day !== day) {
    p.day = day
    p.missions = rollMissions(def.missions, def.missionsPerDay, day, `${seed}:${season.key}`, level, areas)
  }
  if (p.boughtDay !== day) {
    p.boughtDay = day
    p.bought = 0
  }
  return p
}

/** Current progress for display (never persists; see ensureEvent). */
export function eventProgress(id: string, s: GameState = game.value, now: Date = new Date()): EventProgress {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def) return emptyProgress(`${id}#0`)
  return refreshProgress(s.liveEvents.events[id], def, now, s.player.friendCode, playerLevel(s), unlockedAreas(s))
}

function needsRefresh(id: string, s: GameState, now: Date): boolean {
  const def = LIVE_EVENT_BY_ID[id]
  const p = s.liveEvents.events[id]
  if (!def) return false
  return !p || p.season !== seasonAt(id, def.season, now).key || p.day !== dayKey(now) || p.boughtDay !== dayKey(now)
}

/** Persist the season/day rollover for an unlocked event. */
export function ensureEvent(id: string, now: Date = new Date()): boolean {
  const s = game.value
  if (!isEventUnlocked(id, s)) return false
  if (!needsRefresh(id, s, now)) return true
  const def = LIVE_EVENT_BY_ID[id]!
  mutate((d) => {
    const prev = d.liveEvents.events[id]
    const next = refreshProgress(prev, def, now, d.player.friendCode, playerLevel(d), unlockedAreas(d))
    if (!prev || prev.season !== next.season) {
      const life = (d.liveEvents.lifetime[id] ??= { runs: 0, rescued: 0, seasons: 0, best: 0 })
      life.seasons += 1
    }
    d.liveEvents.events[id] = next
  })
  return true
}

/** Edit an event's persisted progress (after making sure it is current). */
function edit(id: string, fn: (p: EventProgress, d: GameState) => void) {
  ensureEvent(id)
  mutate((d) => {
    const p = d.liveEvents.events[id]
    if (p) fn(p, d)
  })
}

// ---------------------------------------------------------------------------
// Tickets

export function dailyTicketReady(id: string, s: GameState = game.value): boolean {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def || !isEventUnlocked(id, s)) return false
  const p = eventProgress(id, s)
  return p.freeDay !== dayKey() && p.tickets < def.ticket.max
}

export function claimDailyTicket(id: string): boolean {
  if (!dailyTicketReady(id)) return false
  const def = LIVE_EVENT_BY_ID[id]!
  edit(id, (p) => {
    p.freeDay = dayKey()
    p.tickets = Math.min(def.ticket.max, p.tickets + def.ticket.dailyFree)
  })
  return true
}

export function ticketBuyLeft(id: string, s: GameState = game.value): number {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def?.ticket.coinPrice) return 0
  const p = eventProgress(id, s)
  return Math.max(0, (def.ticket.coinBuyDaily ?? 0) - p.bought)
}

export function buyTicket(id: string): boolean {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def?.ticket.coinPrice || !isEventUnlocked(id)) return false
  if (ticketBuyLeft(id) <= 0) {
    toast('วันนี้ซื้อตั๋วครบแล้ว พรุ่งนี้มาใหม่นะ', 'lock', 'warn')
    return false
  }
  if (eventProgress(id).tickets >= def.ticket.max) {
    toast(`ถือตั๋วได้สูงสุด ${def.ticket.max} ใบ ใช้ก่อนนะ`, 'lock', 'warn')
    return false
  }
  if (!spendCoins(def.ticket.coinPrice)) return false
  edit(id, (p) => {
    p.tickets += 1
    p.bought += 1
  })
  return true
}

/** Spend one ticket to start a run. */
export function startRun(id: string): boolean {
  if (!isEventUnlocked(id)) return false
  if (eventProgress(id).tickets <= 0) return false
  edit(id, (p) => {
    p.tickets -= 1
  })
  return true
}

// ---------------------------------------------------------------------------
// Runs

export interface RunReport {
  score: number
  rescued: number
  animals: number
  stars: number
}

export interface RunReward {
  points: number
  before: number
  after: number
  tierBefore: number
  tierAfter: number
  merit: number
  coins: number
  best: boolean
}

/** Base merit and coins for a run (pre-multiplier): saving lives is merit too. */
export function runPay(rep: RunReport): { merit: number; coins: number } {
  return { merit: Math.round(rep.rescued * 3 + rep.stars * 6), coins: Math.round(rep.rescued + rep.stars * 8) }
}

export function finishRun(id: string, rep: RunReport): RunReward | null {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def) return null
  ensureEvent(id)
  const before = eventProgress(id).points
  const points = Math.max(0, Math.round(rep.score))
  const prevBest = eventProgress(id).best
  edit(id, (p, d) => {
    p.points += points
    p.runs += 1
    p.best = Math.max(p.best, points)
    p.bestRescued = Math.max(p.bestRescued, rep.rescued)
    const life = (d.liveEvents.lifetime[id] ??= { runs: 0, rescued: 0, seasons: 1, best: 0 })
    life.runs += 1
    life.rescued += rep.rescued
    life.best = Math.max(life.best, points)
  })
  const pay = runPay(rep)
  const merit = pay.merit > 0 ? addMerit(pay.merit, { key: `event:${id}`, free: 5, animal: rep.animals > 0 }) : 0
  const coins = addCoins(pay.coins, { boost: true })
  const after = before + points
  return {
    points,
    before,
    after,
    tierBefore: tierForPoints(before, def.pass),
    tierAfter: tierForPoints(after, def.pass),
    merit,
    coins,
    best: points > prevBest && prevBest > 0,
  }
}

// ---------------------------------------------------------------------------
// Missions (driven by every tracked game event)

export function onEventTrack(event: GameEvent, amount: number) {
  for (const def of LIVE_EVENTS) {
    if (!def.missions.some((m) => m.event === event)) continue
    if (!isEventUnlocked(def.id)) continue
    const cur = eventProgress(def.id)
    const live = cur.missions.some((m) => !m.claimed && def.missions.find((x) => x.id === m.id)?.event === event)
    if (!live) continue
    let done: string[] = []
    edit(def.id, (p) => {
      done = applyTrack(p.missions, def.missions, event, amount)
    })
    for (const mid of done) {
      const md = def.missions.find((x) => x.id === mid)
      if (md) toast(`ภารกิจอีเวนต์สำเร็จ: ${md.text} ไปรับตั๋วได้เลย!`, 'gift')
    }
  }
}

onTrack(onEventTrack)

export function claimMission(id: string, missionId: string): { tickets: number; points: number } | null {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def || !isEventUnlocked(id)) return null
  const md = def.missions.find((x) => x.id === missionId)
  const cur = eventProgress(id).missions.find((m) => m.id === missionId)
  if (!md || !cur || !missionReady(cur, md)) return null
  edit(id, (p) => {
    const m = p.missions.find((x) => x.id === missionId)
    if (!m) return
    m.claimed = true
    p.tickets += md.tickets
    p.points += md.points
  })
  return { tickets: md.tickets, points: md.points }
}

// ---------------------------------------------------------------------------
// Battle pass

/** Grant a list of event rewards; tickets go to the event, the rest through grantReward. */
function grantAll(id: string, rewards: EventReward[]): GrantResult[] {
  const res: GrantResult[] = []
  let tickets = 0
  for (const r of rewards) {
    if (r.kind === 'ticket') {
      tickets += r.n
      res.push({ ok: true, label: rewardLabel(r) })
    } else res.push(grantReward(r))
  }
  if (tickets) edit(id, (p) => void (p.tickets += tickets))
  return res
}

export function claimTier(id: string, tier: number, row: PassRow): GrantResult[] | null {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def || !isEventUnlocked(id)) return null
  const p = eventProgress(id)
  if (tierState(p, def.pass, tier, row) !== 'claimable') return null
  const t = tierDef(def.pass, tier)
  if (!t) return null
  edit(id, (e) => {
    const list = row === 'free' ? e.claimedFree : e.claimedPremium
    if (!list.includes(tier)) list.push(tier)
    list.sort((a, b) => a - b)
  })
  return grantAll(id, row === 'free' ? t.free : t.premium)
}

/** Claim everything available. Returns the rewards given (in order). */
export function claimAll(id: string): { tier: number; row: PassRow; rewards: EventReward[]; results: GrantResult[] }[] {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def || !isEventUnlocked(id)) return []
  const out: { tier: number; row: PassRow; rewards: EventReward[]; results: GrantResult[] }[] = []
  for (const c of claimable(eventProgress(id), def.pass)) {
    const results = claimTier(id, c.tier, c.row)
    const t = tierDef(def.pass, c.tier)
    if (results && t) out.push({ ...c, rewards: c.row === 'free' ? t.free : t.premium, results })
  }
  return out
}

export function claimableCount(id: string, s: GameState = game.value): number {
  const def = LIVE_EVENT_BY_ID[id]
  if (!def || !isEventUnlocked(id, s)) return 0
  const p = eventProgress(id, s)
  const missions = p.missions.filter((m) => missionReady(m, def.missions.find((x) => x.id === m.id))).length
  return claimable(p, def.pass).length + missions + (dailyTicketReady(id, s) ? 1 : 0)
}

/** Buy the premium row with the (sandbox) payment provider. */
export async function buyPremium(id: string, productId: string): Promise<boolean> {
  const def = LIVE_EVENT_BY_ID[id]
  const prod = def?.pass.products.find((x) => x.id === productId)
  if (!def || !prod || !isEventUnlocked(id)) return false
  if (eventProgress(id).premium) return false
  const r = await payments().purchase(prod.id, prod.priceTHB, prod.title)
  if (!r.ok || !r.transactionId) return false
  const tx = r.transactionId
  edit(id, (p, d) => {
    p.premium = true
    p.points += prod.bonusPoints ?? 0
    d.purchases.unshift({ id: prod.id, at: Date.now(), priceTHB: prod.priceTHB, tx })
  })
  return true
}

/** Dev helper: jump points / tickets (used by the dev hooks and tests). */
export function devSetEvent(id: string, patch: Partial<Pick<EventProgress, 'points' | 'tickets' | 'premium'>>) {
  edit(id, (p) => Object.assign(p, patch))
}
