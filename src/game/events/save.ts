// Saved progress of every live event, kept under GameState.liveEvents.
// Pure: no imports from the game state, so state.ts can use it for defaults
// and for normalising old or damaged saves.

export interface MissionState {
  id: string
  progress: number
  claimed: boolean
}

export interface EventProgress {
  /** Season key this progress belongs to (e.g. "flood#12"); a new season resets it. */
  season: string
  points: number
  premium: boolean
  claimedFree: number[]
  claimedPremium: number[]
  tickets: number
  /** Day the daily free ticket was last claimed. */
  freeDay: string
  /** Coin-bought tickets today. */
  boughtDay: string
  bought: number
  /** Day the missions were rolled for. */
  day: string
  missions: MissionState[]
  /** Best run score and rescues this season. */
  best: number
  bestRescued: number
  runs: number
}

export interface EventLifetime {
  runs: number
  rescued: number
  seasons: number
  /** Best single-run score ever. */
  best: number
}

export interface LiveEventsState {
  v: 1
  events: Record<string, EventProgress>
  lifetime: Record<string, EventLifetime>
}

export function defaultLiveEvents(): LiveEventsState {
  return { v: 1, events: {}, lifetime: {} }
}

export function emptyProgress(season: string): EventProgress {
  return {
    season,
    points: 0,
    premium: false,
    claimedFree: [],
    claimedPremium: [],
    tickets: 0,
    freeDay: '',
    boughtDay: '',
    bought: 0,
    day: '',
    missions: [],
    best: 0,
    bestRescued: 0,
    runs: 0,
  }
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : d)
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d)
const ints = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x > 0))].sort((a, b) => a - b) : [])

function normProgress(raw: unknown): EventProgress | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const p = emptyProgress(str(r.season))
  if (!p.season) return null
  p.points = Math.floor(num(r.points))
  p.premium = r.premium === true
  p.claimedFree = ints(r.claimedFree)
  p.claimedPremium = ints(r.claimedPremium)
  p.tickets = Math.floor(num(r.tickets))
  p.freeDay = str(r.freeDay)
  p.boughtDay = str(r.boughtDay)
  p.bought = Math.floor(num(r.bought))
  p.day = str(r.day)
  p.missions = Array.isArray(r.missions)
    ? r.missions
        .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string')
        .map((m) => ({ id: m.id as string, progress: num(m.progress), claimed: m.claimed === true }))
    : []
  p.best = num(r.best)
  p.bestRescued = num(r.bestRescued)
  p.runs = Math.floor(num(r.runs))
  return p
}

/** Accept anything (old saves have no field at all) and return a valid state. */
export function normalizeLiveEvents(raw: unknown): LiveEventsState {
  const out = defaultLiveEvents()
  if (!raw || typeof raw !== 'object') return out
  const r = raw as { events?: unknown; lifetime?: unknown }
  if (r.events && typeof r.events === 'object') {
    for (const [id, v] of Object.entries(r.events as Record<string, unknown>)) {
      const p = normProgress(v)
      if (p) out.events[id] = p
    }
  }
  if (r.lifetime && typeof r.lifetime === 'object') {
    for (const [id, v] of Object.entries(r.lifetime as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue
      const l = v as Record<string, unknown>
      out.lifetime[id] = { runs: Math.floor(num(l.runs)), rescued: Math.floor(num(l.rescued)), seasons: Math.floor(num(l.seasons)), best: num(l.best) }
    }
  }
  return out
}
