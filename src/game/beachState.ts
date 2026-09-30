// Saved state for the beaches (GameState.beach). Pure (no imports) so
// state.ts can use it for defaults and old-save normalisation without an
// import cycle. Daily full-reward plays live in `plays` (reset per day).

export interface BeachState {
  /** Beach map ids ever visited (the beach passport). */
  visited: string[]
  /** Best score per beach game id. */
  best: Record<string, number>
  /** Rounds played today per game id (for the daily full-reward cap). */
  plays: { day: string; n: Record<string, number> }
  /** Lifetime sand chedis built (ก่อเจดีย์ทราย). */
  chedis: number
  /** Lifetime baby sea turtles guided to the sea. */
  turtles: number
  /** Lifetime pieces of rubbish picked up on beach cleanups. */
  trash: number
  /** Reef species spotted while snorkelling (fish log). */
  fish: string[]
  /** Photo spot shots taken: `<beachId>:<day|sunset|night>`. */
  photos: string[]
  /** Banana-boat rides (and dunkings). */
  rides: number
  /** Prepaid rounds left from ride packs, per game id. */
  credits: Record<string, number>
}

export function defaultBeach(): BeachState {
  return { visited: [], best: {}, plays: { day: '', n: {} }, chedis: 0, turtles: 0, trash: 0, fish: [], photos: [], rides: 0, credits: {} }
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const count = (v: unknown) => Math.max(0, Math.floor(num(v)))
const strList = (v: unknown) => [...new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])]
function numMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'number' && Number.isFinite(x)) out[k] = x
  return out
}

/** Repair whatever an older (or newer) save holds under `beach`. */
export function normalizeBeach(raw: unknown): BeachState {
  const d = defaultBeach()
  if (!raw || typeof raw !== 'object') return d
  const r = raw as Partial<Record<keyof BeachState, unknown>>
  const plays = (r.plays && typeof r.plays === 'object' ? r.plays : {}) as { day?: unknown; n?: unknown }
  return {
    visited: strList(r.visited),
    best: numMap(r.best),
    plays: { day: typeof plays.day === 'string' ? plays.day : '', n: numMap(plays.n) },
    chedis: count(r.chedis),
    turtles: count(r.turtles),
    trash: count(r.trash),
    fish: strList(r.fish),
    photos: strList(r.photos),
    rides: count(r.rides),
    credits: Object.fromEntries(Object.entries(numMap(r.credits)).map(([k, v]) => [k, Math.max(0, Math.floor(v))])),
  }
}
