// Saved state for the hub markets and the temple fair (GameState.hubs).
// Pure (no imports) so state.ts can use it for defaults and old-save
// normalisation without an import cycle.

export interface HubsState {
  /** Hub / fair map ids ever visited (the market passport stamps). */
  visited: string[]
  /** Last day key each hub was visited (for "first visit today"). */
  days: Record<string, string>
  /** Total arrivals at hub maps. */
  visits: number
  /** Fair prize tickets (ตั๋วแลกของรางวัล) in hand. */
  tickets: number
  /** Lifetime tickets won. */
  ticketsTotal: number
  /** Best score per fair game id. */
  best: Record<string, number>
  /** Fair rounds played today per game id. */
  plays: { day: string; n: Record<string, number> }
  /** Prize-booth rewards redeemed (prize id → count). */
  prizes: Record<string, number>
  /** Market passport reward claimed (all six hubs stamped). */
  passport: boolean
}

export function defaultHubs(): HubsState {
  return { visited: [], days: {}, visits: 0, tickets: 0, ticketsTotal: 0, best: {}, plays: { day: '', n: {} }, prizes: {}, passport: false }
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
function numMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x
  return out
}
function strMap(v: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = x
  return out
}

/** Repair whatever an older (or newer) save holds under `hubs`. */
export function normalizeHubs(raw: unknown): HubsState {
  const d = defaultHubs()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<Record<keyof HubsState, unknown>>
  const plays = (r.plays && typeof r.plays === 'object' ? r.plays : {}) as { day?: unknown; n?: unknown }
  return {
    visited: [...new Set(strList(r.visited))],
    days: strMap(r.days),
    visits: Math.max(0, num(r.visits)),
    tickets: Math.max(0, Math.floor(num(r.tickets))),
    ticketsTotal: Math.max(0, Math.floor(num(r.ticketsTotal))),
    best: numMap(r.best),
    plays: { day: typeof plays.day === 'string' ? plays.day : '', n: numMap(plays.n) },
    prizes: numMap(r.prizes),
    passport: r.passport === true,
  }
}
