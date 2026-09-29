// Saved shape of the collectible collection (GameState.collection). Kept in
// its own dependency-free module so state.ts can import it without cycles.

export interface CollectionState {
  /** Owned count per collectible id. */
  owned: Record<string, number>
  /** Day key (YYYY-MM-DD) each collectible was first found. */
  found: Record<string, string>
  /** Obtained but not yet looked at in the book (the "ใหม่!" badge). */
  fresh: string[]
  /** Series whose set-completion reward has been claimed. */
  sets: string[]
  /** Personal rotation seed: every player gets their own daily stall stock. */
  seed: string
  /** Today's stall purchases; reset when the day changes. */
  stock: {
    day: string
    /** `${shopId}|${collectibleId}` → bought today. */
    sold: Record<string, number>
    /** Shops where you already tried to bargain today. */
    haggled: string[]
  }
}

export function makeRotationSeed(): string {
  return Math.floor(Math.random() * 0xffffffff).toString(36)
}

export function emptyCollection(seed: string = makeRotationSeed()): CollectionState {
  return { owned: {}, found: {}, fresh: [], sets: [], seed, stock: { day: '', sold: {}, haggled: [] } }
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function counts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!isObj(v)) return out
  for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && Number.isFinite(n) && n > 0) out[k] = Math.floor(n)
  return out
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string'))] : []
}

/** Repair a saved collection (old saves have none; bad data is dropped). */
export function normalizeCollection(raw: unknown): CollectionState {
  if (!isObj(raw)) return emptyCollection()
  const found: Record<string, string> = {}
  if (isObj(raw.found)) for (const [k, d] of Object.entries(raw.found)) if (typeof d === 'string') found[k] = d
  const st = isObj(raw.stock) ? raw.stock : {}
  return {
    owned: counts(raw.owned),
    found,
    fresh: strings(raw.fresh).slice(-200),
    sets: strings(raw.sets),
    seed: typeof raw.seed === 'string' && raw.seed ? raw.seed : makeRotationSeed(),
    stock: {
      day: typeof st.day === 'string' ? st.day : '',
      sold: counts(st.sold),
      haggled: strings(st.haggled),
    },
  }
}
