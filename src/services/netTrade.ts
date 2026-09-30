// Live 1-to-1 trade between two online players, as a pure state machine.
// Each side runs its own copy and they talk over the `trade` topic:
//
//   req → accept → offer ⇄ offer (counter) → ready ⇄ ready → confirm ⇄ confirm → done
//
// Offers carry a revision number; `ready` and `confirm` name both sides'
// revisions, so a change on either side invalidates everything agreed
// before it. Safety against a misbehaving peer:
//  - you only ever remove YOUR OWN items, and only when YOU confirm (they go
//    into escrow; any cancel / change / timeout before completion refunds them);
//  - you only add what the other side committed at the revision both
//    confirmations name, after re-validating it (known, tradeable ids, capped
//    quantities) and checking your daily cap;
//  - messages from anyone but the trade partner, or for another trade, are ignored.
// The worst a cheater can do is dupe items into their OWN save.

import { cleanLines, cleanPeerId, cleanToken, type TradeLine } from './netValidate'

export type { TradeLine } from './netValidate'

export type TradePhase = 'idle' | 'asking' | 'asked' | 'open' | 'confirmed' | 'done' | 'closed'

export type TradeCloseReason = 'declined' | 'busy' | 'cancelled' | 'they_cancelled' | 'timeout' | 'gone' | 'not_owned' | 'cap'

export interface TradeState {
  phase: TradePhase
  tid: string | null
  peer: string | null
  mine: TradeLine[]
  myRev: number
  theirs: TradeLine[]
  theirRev: number
  myReady: boolean
  theirReady: boolean
  /** My committed items, removed from my save because I confirmed. */
  escrow: TradeLine[] | null
  theirConfirm: boolean
  reason: TradeCloseReason | null
  /** Last activity (ms) for timeouts. */
  at: number
}

export type TradeMsg =
  | { t: 'req'; tid: string; to: string }
  | { t: 'accept'; tid: string; to: string }
  | { t: 'decline'; tid: string; to: string; why?: 'busy' | 'no' }
  | { t: 'offer'; tid: string; to: string; rev: number; lines: TradeLine[] }
  | { t: 'ready'; tid: string; to: string; rev: number; seen: number; on: boolean }
  | { t: 'confirm'; tid: string; to: string; rev: number; seen: number }
  | { t: 'cancel'; tid: string; to: string }
  | { t: 'done'; tid: string; to: string }

export type TradeInput =
  | { kind: 'request'; peer: string; tid: string }
  | { kind: 'accept' }
  | { kind: 'decline' }
  | { kind: 'offer'; lines: TradeLine[] }
  | { kind: 'ready'; on: boolean }
  | { kind: 'confirm' }
  | { kind: 'cancel' }
  | { kind: 'gone'; peer: string }
  | { kind: 'tick' }
  | { kind: 'reset' }
  | { kind: 'recv'; from: string; msg: TradeMsg }

export type TradeEffect =
  | { kind: 'escrow'; lines: TradeLine[] }
  | { kind: 'refund'; lines: TradeLine[] }
  | { kind: 'receive'; lines: TradeLine[]; from: string }
  | { kind: 'incoming'; peer: string }
  | { kind: 'changed' }

export interface TradeCtx {
  now: number
  /** Do I still own all of these? */
  owns(lines: TradeLine[]): boolean
  /** May I take these (daily trade cap etc.)? */
  canReceive(lines: TradeLine[]): boolean
}

export interface TradeStep {
  s: TradeState
  send: TradeMsg[]
  fx: TradeEffect[]
}

export const TRADE_TIMEOUTS = {
  /** Waiting for them to answer a request. */
  asking: 30_000,
  /** An unanswered incoming request. */
  asked: 45_000,
  /** Nobody touched the open trade. */
  open: 180_000,
  /** I confirmed; waiting for their confirmation. */
  confirmed: 30_000,
}

export function idleTrade(now = 0): TradeState {
  return { phase: 'idle', tid: null, peer: null, mine: [], myRev: 0, theirs: [], theirRev: 0, myReady: false, theirReady: false, escrow: null, theirConfirm: false, reason: null, at: now }
}

export const tradeActive = (s: TradeState) => s.phase === 'asking' || s.phase === 'asked' || s.phase === 'open' || s.phase === 'confirmed'

/** Validate an untrusted `trade` payload. */
export function parseTradeMsg(d: unknown): TradeMsg | null {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null
  const r = d as Record<string, unknown>
  const tid = cleanToken(r.tid)
  const to = cleanPeerId(r.to)
  if (!tid || !to) return null
  const rev = typeof r.rev === 'number' && Number.isInteger(r.rev) && r.rev >= 0 && r.rev < 1e6 ? r.rev : null
  const seen = typeof r.seen === 'number' && Number.isInteger(r.seen) && r.seen >= 0 && r.seen < 1e6 ? r.seen : null
  switch (r.t) {
    case 'req':
    case 'accept':
    case 'cancel':
    case 'done':
      return { t: r.t, tid, to }
    case 'decline':
      return { t: 'decline', tid, to, why: r.why === 'busy' ? 'busy' : 'no' }
    case 'offer': {
      const lines = cleanLines(r.lines)
      return lines && rev !== null ? { t: 'offer', tid, to, rev, lines } : null
    }
    case 'ready':
      return rev !== null && seen !== null ? { t: 'ready', tid, to, rev, seen, on: r.on === true } : null
    case 'confirm':
      return rev !== null && seen !== null ? { t: 'confirm', tid, to, rev, seen } : null
  }
  return null
}

function close(s: TradeState, reason: TradeCloseReason, now: number, fx: TradeEffect[]): TradeState {
  if (s.escrow?.length) fx.push({ kind: 'refund', lines: s.escrow })
  return { ...s, phase: 'closed', reason, escrow: null, myReady: false, theirReady: false, theirConfirm: false, at: now }
}

/** Advance the trade. Pure: returns the next state, messages to send and effects to apply. */
export function tradeStep(s: TradeState, input: TradeInput, ctx: TradeCtx): TradeStep {
  const send: TradeMsg[] = []
  const fx: TradeEffect[] = []
  const now = ctx.now
  const out = (next: TradeState): TradeStep => {
    if (next !== s) fx.push({ kind: 'changed' })
    return { s: next, send, fx }
  }
  const peer = s.peer ?? ''
  const tid = s.tid ?? ''

  const complete = (st: TradeState): TradeState => {
    fx.push({ kind: 'receive', lines: st.theirs, from: peer })
    send.push({ t: 'done', tid, to: peer })
    return { ...st, phase: 'done', escrow: null, reason: null, at: now }
  }

  switch (input.kind) {
    case 'request': {
      if (tradeActive(s)) return out(s)
      send.push({ t: 'req', tid: input.tid, to: input.peer })
      return out({ ...idleTrade(now), phase: 'asking', tid: input.tid, peer: input.peer })
    }
    case 'accept': {
      if (s.phase !== 'asked') return out(s)
      send.push({ t: 'accept', tid, to: peer })
      return out({ ...s, phase: 'open', at: now })
    }
    case 'decline': {
      if (s.phase !== 'asked') return out(s)
      send.push({ t: 'decline', tid, to: peer, why: 'no' })
      return out({ ...s, phase: 'closed', reason: 'declined', at: now })
    }
    case 'offer': {
      if (s.phase !== 'open') return out(s)
      const lines = cleanLines(input.lines) ?? s.mine
      const rev = s.myRev + 1
      send.push({ t: 'offer', tid, to: peer, rev, lines })
      return out({ ...s, mine: lines, myRev: rev, myReady: false, theirReady: false, theirConfirm: false, at: now })
    }
    case 'ready': {
      if (s.phase !== 'open' || s.myReady === input.on) return out(s)
      send.push({ t: 'ready', tid, to: peer, rev: s.myRev, seen: s.theirRev, on: input.on })
      return out({ ...s, myReady: input.on, at: now })
    }
    case 'confirm': {
      if (s.phase !== 'open' || !s.myReady || !s.theirReady || (!s.mine.length && !s.theirs.length)) return out(s)
      if (!ctx.owns(s.mine)) {
        send.push({ t: 'cancel', tid, to: peer })
        return out(close(s, 'not_owned', now, fx))
      }
      if (!ctx.canReceive(s.theirs)) {
        send.push({ t: 'cancel', tid, to: peer })
        return out(close(s, 'cap', now, fx))
      }
      fx.push({ kind: 'escrow', lines: s.mine })
      send.push({ t: 'confirm', tid, to: peer, rev: s.myRev, seen: s.theirRev })
      const next: TradeState = { ...s, phase: 'confirmed', escrow: s.mine, at: now }
      return out(next.theirConfirm ? complete(next) : next)
    }
    case 'cancel': {
      if (!tradeActive(s)) return out(s)
      send.push(s.phase === 'asked' ? { t: 'decline', tid, to: peer, why: 'no' } : { t: 'cancel', tid, to: peer })
      return out(close(s, s.phase === 'asked' ? 'declined' : 'cancelled', now, fx))
    }
    case 'gone': {
      if (!tradeActive(s) || input.peer !== s.peer) return out(s)
      return out(close(s, 'gone', now, fx))
    }
    case 'reset': {
      if (tradeActive(s)) return out(s)
      return out(idleTrade(now))
    }
    case 'tick': {
      const age = now - s.at
      if (s.phase === 'asking' && age > TRADE_TIMEOUTS.asking) {
        send.push({ t: 'cancel', tid, to: peer })
        return out(close(s, 'timeout', now, fx))
      }
      if (s.phase === 'asked' && age > TRADE_TIMEOUTS.asked) {
        send.push({ t: 'decline', tid, to: peer, why: 'no' })
        return out(close(s, 'timeout', now, fx))
      }
      if ((s.phase === 'open' && age > TRADE_TIMEOUTS.open) || (s.phase === 'confirmed' && age > TRADE_TIMEOUTS.confirmed)) {
        send.push({ t: 'cancel', tid, to: peer })
        return out(close(s, 'timeout', now, fx))
      }
      return out(s)
    }
    case 'recv':
      return recv(s, input.from, input.msg, ctx, send, fx, complete, out)
  }
}

function recv(
  s: TradeState,
  from: string,
  m: TradeMsg,
  ctx: TradeCtx,
  send: TradeMsg[],
  fx: TradeEffect[],
  complete: (st: TradeState) => TradeState,
  out: (next: TradeState) => TradeStep,
): TradeStep {
  const now = ctx.now
  // A new request: take it when free, otherwise say we're busy.
  if (m.t === 'req') {
    if (tradeActive(s)) {
      if (!(s.peer === from && s.tid === m.tid)) send.push({ t: 'decline', tid: m.tid, to: from, why: 'busy' })
      return out(s)
    }
    fx.push({ kind: 'incoming', peer: from })
    return out({ ...idleTrade(now), phase: 'asked', tid: m.tid, peer: from })
  }
  // Everything else must come from our partner about this trade.
  if (!tradeActive(s) || from !== s.peer || m.tid !== s.tid) return out(s)
  switch (m.t) {
    case 'accept':
      return out(s.phase === 'asking' ? { ...s, phase: 'open', at: now } : s)
    case 'decline':
      return out(s.phase === 'asking' ? { ...s, phase: 'closed', reason: m.why === 'busy' ? 'busy' : 'declined', at: now } : s)
    case 'cancel':
      return out(close(s, 'they_cancelled', now, fx))
    case 'offer': {
      if ((s.phase !== 'open' && s.phase !== 'confirmed') || m.rev <= s.theirRev) return out(s)
      // Their side changed: everything agreed so far is void, my escrow comes back.
      if (s.escrow?.length) fx.push({ kind: 'refund', lines: s.escrow })
      return out({ ...s, phase: 'open', theirs: m.lines, theirRev: m.rev, myReady: false, theirReady: false, theirConfirm: false, escrow: null, at: now })
    }
    case 'ready': {
      if ((s.phase !== 'open' && s.phase !== 'confirmed') || m.rev !== s.theirRev || m.seen !== s.myRev) return out(s)
      if (!m.on && s.escrow) {
        fx.push({ kind: 'refund', lines: s.escrow })
        return out({ ...s, phase: 'open', theirReady: false, myReady: false, theirConfirm: false, escrow: null, at: now })
      }
      return out({ ...s, theirReady: m.on, at: now })
    }
    case 'confirm': {
      if ((s.phase !== 'open' && s.phase !== 'confirmed') || m.rev !== s.theirRev || m.seen !== s.myRev) return out(s)
      const next: TradeState = { ...s, theirConfirm: true, theirReady: true, at: now }
      return out(next.escrow ? complete(next) : next)
    }
    case 'done':
      return out(s)
  }
  return out(s)
}

/** Total units in a list of lines. */
export function lineUnits(lines: TradeLine[]): number {
  return lines.reduce((a, l) => a + l.n, 0)
}
